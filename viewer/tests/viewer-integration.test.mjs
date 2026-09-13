// DOM/Canvas harness for the actual app module. This checks event wiring and
// rendering output without a browser dependency; it is not browser layout QA.
import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
const elements = new Map(), frames = [], calls = [], requests = [];
let currentPath = [];
const context = {
  setTransform() {}, clearRect() {}, setLineDash() {},
  beginPath() { currentPath = []; },
  moveTo(x,y) { assert.ok(Number.isFinite(x+y)); currentPath.push(`M${x},${y}`); },
  lineTo(x,y) { assert.ok(Number.isFinite(x+y)); currentPath.push(`L${x},${y}`); },
  stroke() { calls.push({ path: currentPath.join(' '), color: this.strokeStyle, width: this.lineWidth || 1 }); },
  arc(x,y,r) { assert.ok(Number.isFinite(x+y+r) && r >= 0); calls.push({ circle: [x,y,r], color: this.fillStyle }); },
  fill() {}, fillRect() {}, fillText() {},
  createRadialGradient() { return { addColorStop() {} }; },
};
class Element {
  constructor(id) {
    this.id=id; this.value=''; this.textContent=''; this.children=[]; this.listeners={};
    this.style={}; this.hidden=false; this.options=[]; this.tagName='DIV';
    this.classList={ toggle() {} };
  }
  addEventListener(name, callback) { this.listeners[name]=callback; }
  async fire(name) { await this.listeners[name]?.({ preventDefault() {} }); }
  getContext() { return context; }
  getBoundingClientRect() { return { width: this.id==='phase-chart' ? 200 : 900, height:this.id==='phase-chart' ? 46 : 640, left:0,top:0 }; }
  setAttribute() {}
  replaceChildren() { this.children=[]; }
  append(...nodes) { this.children.push(...nodes); }
  add(option) { this.options.push(option); }
  reportValidity() { return true; }
  setPointerCapture() {}
}
const el=id => { if(!elements.has(id)) elements.set(id,new Element(id)); return elements.get(id); };
const fixture=(channels=256,events=32768)=>{
  const parents=new Array(channels).fill(0),depths=new Array(channels).fill(0);
  return { schema_version:1,rule:'source-channels-v0.1',config:{channels,events,phase_steps:32,seed:42,scheduler:'balanced'},birth:{id:0,kind:'source_birth',weight:1},events:Array.from({length:events},(_,i)=>{
    const channel=i%channels,depth=++depths[channel],parent=parents[channel];parents[channel]=i+1;
    return {id:i+1,channel,parent,depth,phase:depth%32*2*Math.PI/32,weight:1/channels};
  }),summary:{max_depth:Math.ceil(events/channels),frontier_states:channels,source_count:1,rollout_events:events,frontier_weight:1}};
};
let run=fixture();
globalThis.document={getElementById:el,createElement:()=>new Element('created')};
globalThis.devicePixelRatio=1;
globalThis.ResizeObserver=class { observe() {} };
globalThis.requestAnimationFrame=callback=>{ frames[0]=callback; };
globalThis.Option=class { constructor(text,value){this.text=text;this.value=value;} };
globalThis.fetch=async(url,options)=>{
  requests.push({url,body:JSON.parse(options.body)});
  return {ok:true,json:async()=>url==='/api/run'?structuredClone(run):{saved:'runs/test.json'}};
};
for (const [id,value] of Object.entries({channels:'256',events:'32768','phase-steps':'32',seed:'42',scheduler:'balanced',speed:'2048'})) el(id).value=value;
for(const id of ['channels','events','scheduler'])el(id).tagName='SELECT';
el('phase-chart').parentElement=el('chart-parent');
await import('../public/app.js');
await new Promise(resolve=>setImmediate(resolve));
let renderTime=performance.now();
const draw=()=>{ calls.length=0; renderTime+=100; frames[0](renderTime); };
const exportRecord=async()=>{await el('export').fire('click');return requests.at(-1).body;};
function savePreview(name){
  if(!process.env.TEF_PREVIEW_DIR)return;
  const paths=calls.map(c=>c.path?`<path d="${c.path}" fill="none" stroke="${c.color}" stroke-width="${c.width}"/>`:c.circle?`<circle cx="${c.circle[0]}" cy="${c.circle[1]}" r="${c.circle[2]}" fill="${typeof c.color==='string'?c.color:'#e9ad72'}"/>`:'').join('\n');
  writeFileSync(`${process.env.TEF_PREVIEW_DIR}/${name}.svg`,`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="640"><rect width="900" height="640" fill="#0d151c"/>${paths}</svg>`);
}

test('real app wiring preserves replay and causal data through both mappings and export/import', async()=>{
  assert.equal(el('error').textContent,'');
  assert.equal(el('mapping-mode').value,'parallel-rollout');
  el('timeline').value=run.config.events+1;await el('timeline').fire('input');draw();
  assert.ok(calls.filter(c=>c.path).length>1000);savePreview('parallel-rollout');
  const before=await exportRecord();delete before.observer;
  const diagnostics=['cursor','max-depth','weight','spread','coherence'].map(id=>el(id).textContent);
  el('mapping-mode').value='radial-expanding';await el('mapping-mode').fire('input');
  el('base-radius').value='.04';await el('base-radius').fire('input');
  el('radial-expansion').value='.12';await el('radial-expansion').fire('input');draw();assert.ok(calls.filter(c=>c.path).length>1000);savePreview('radial-expanding');
  assert.equal(el('expansion-control').hidden,false);
  assert.deepEqual(['cursor','max-depth','weight','spread','coherence'].map(id=>el(id).textContent),diagnostics);
  assert.equal(requests.filter(x=>x.url==='/api/run').length,1);
  const saved=await exportRecord();assert.equal(saved.observer.mode,'radial-expanding');assert.equal(saved.observer.baseRadius,.04);
  const causal={...saved};delete causal.observer;assert.deepEqual(causal,before);
  el('mapping-mode').value='parallel-rollout';await el('mapping-mode').fire('input');
  el('import-file').files=[{size:JSON.stringify(saved).length,text:async()=>JSON.stringify(saved)}];await el('import-file').fire('change');
  assert.equal(el('mapping-mode').value,'radial-expanding');assert.equal(el('base-radius').value,.04);
  assert.equal(el('cursor').textContent,'32,769');
  await el('view-causal').fire('click');draw();assert.equal(el('observer-controls').hidden,true);
  await el('reset').fire('click');draw();assert.equal(el('source-count').textContent,'0');
  await el('step').fire('click');assert.equal(el('source-count').textContent,'1');assert.equal(el('max-depth').textContent,'0');
  await el('view-space').fire('click');assert.equal(el('observer-controls').hidden,false);
});

test('real app draws the maximum run without unbounded geometry and handles a birth-only import',async()=>{
  run=fixture(2048,200000);
  el('import-file').files=[{size:30000000,text:async()=>JSON.stringify(run)}];await el('import-file').fire('change');draw();
  assert.equal(el('error').textContent,'');
  assert.equal(el('cursor').textContent,'200,001');
  assert.ok(calls.filter(c=>c.path).length<=24*129);
  assert.ok(calls.length<6000);
  run=fixture(4,0);
  el('import-file').files=[{size:1000,text:async()=>JSON.stringify(run)}];await el('import-file').fire('change');draw();
  assert.equal(el('max-depth').textContent,'0');assert.equal(el('weight').textContent,'1.000000');
});
