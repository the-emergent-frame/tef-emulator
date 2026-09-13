import { MAPPING_VERSION, DEFAULTS, createMapping, spineChannels, restoreObserver } from "./observer-mapping.mjs";
"use strict";
const $ = (id) => document.getElementById(id);
const canvas = $("universe"), ctx = canvas.getContext("2d");
const chart = $("phase-chart"), chartCtx = chart.getContext("2d");
const TAU = Math.PI * 2, fmt = (n) => n.toLocaleString("en-US");
const model = { run: null, cursor: 0, depths: [], parents: [], phase: [], mapping: null, observer: { ...DEFAULTS }, lanes: [], playing: false, busy: false, view: "space", selected: null, yaw: -.45, pitch: .25, zoom: 1, width: 0, height: 0, hits: [], maxDepth: 0, credit: 0 };
let dragging = null, needsDraw = true, lastFrame = performance.now(), lastDraw = 0;

function phaseColor(phase, alpha = 1, light = 70) {
  const hue = (155 + phase / TAU * 360) % 360;
  return `hsla(${hue},48%,${light}%,${alpha})`;
}
function resize() {
  const rect = $("stage").getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
  model.width = rect.width; model.height = rect.height;
  canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const cr = chart.getBoundingClientRect();
  chart.width = Math.round(cr.width * dpr); chart.height = Math.round(cr.height * dpr);
  chartCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  needsDraw = true;
  updateStats();
}
new ResizeObserver(resize).observe($("stage"));
new ResizeObserver(() => { resize(); }).observe(chart.parentElement);

function resetFrontier() {
  const n = model.run.config.channels;
  model.depths = new Uint32Array(n); model.parents = new Uint32Array(n); model.phase = new Float64Array(n);
  model.cursor = 0;
}
function setCursor(target) {
  if (!model.run) return;
  target = Math.max(0, Math.min(Math.floor(target), model.run.events.length + 1));
  if (target < model.cursor) resetFrontier();
  // Cursor 0 is before supplied birth, cursor 1 is birth, then local updates.
  for (let i = Math.max(1, model.cursor); i < target; i++) {
    const event = model.run.events[i - 1];
    model.depths[event.channel] = event.depth;
    model.parents[event.channel] = event.id;
    model.phase[event.channel] = event.phase;
  }
  model.cursor = target;
  if (model.selected !== null && model.selected >= target) model.selected = null;
  $("timeline").value = target;
  $("cursor").textContent = fmt(target);
  $("empty").hidden = target > 0;
  $("stage-state").textContent = target === 0 ? "Before source birth" : target === 1 ? "Source formed · rollout boundary ready" : target === model.run.events.length + 1 ? "Record complete · scrub to explore" : "Rollout in progress";
  if (target === model.run.events.length + 1) setPlaying(false);
  updateStats(); needsDraw = true;
}
function setPlaying(value) {
  model.playing = Boolean(value && model.run && !model.busy);
  model.credit = 0;
  $("play").textContent = model.playing ? "Pause" : "Play";
}
function updateStats() {
  if (!model.run || !model.width) return;
  const born = model.cursor > 0, n = model.run.config.channels;
  let sum = 0, squares = 0, re = 0, im = 0, max = 0;
  const bins = new Array(16).fill(0);
  for (let i = 0; i < n; i++) {
    const depth = model.depths[i]; sum += depth; squares += depth * depth; max = Math.max(max, depth);
    re += Math.cos(model.phase[i]); im += Math.sin(model.phase[i]);
    bins[Math.min(15, Math.floor(model.phase[i] / TAU * 16))]++;
  }
  const mean = sum / n, spread = mean ? Math.sqrt(Math.max(0, squares / n - mean * mean)) / mean : 0;
  model.maxDepth = max;
  $("source-count").textContent = born ? "1" : "0";
  $("max-depth").textContent = fmt(max);
  $("weight").textContent = born ? (n * (1 / n)).toFixed(6) : "—";
  $("spread").textContent = born ? spread.toFixed(3) : "—";
  $("spread-meter").style.width = Math.min(spread, 1) * 100 + "%";
  $("coherence").textContent = born ? (Math.hypot(re, im) / n).toFixed(3) : "—";
  const rect = chart.getBoundingClientRect();
  chartCtx.clearRect(0, 0, rect.width, rect.height);
  const peak = Math.max(1, ...bins), bar = rect.width / bins.length;
  bins.forEach((count, i) => {
    const height = born ? count / peak * (rect.height - 3) : 0;
    chartCtx.fillStyle = phaseColor(i / 16 * TAU, .75);
    chartCtx.fillRect(i * bar + 1, rect.height - height, Math.max(1, bar - 3), height);
    if (!height) { chartCtx.fillStyle = "#2b3b44"; chartCtx.fillRect(i * bar + 1, rect.height - 1, Math.max(1, bar - 3), 1); }
  });
  showEvent(model.selected === null ? model.cursor - 1 : model.selected);
}
function showEvent(id) {
  const box = $("event-detail");
  box.replaceChildren();
  if (id < 0) { box.textContent = "Advance playback to inspect an event."; return; }
  const title = document.createElement("strong"); title.textContent = `#${fmt(id)} · ${id === 0 ? "SOURCE BIRTH" : "ROLLOUT"}`; box.append(title);
  if (id === 0) {
    const p = document.createElement("div"); p.textContent = "Supplied source boundary; each channel receives transport weight 1/N."; box.append(p); return;
  }
  const event = model.run.events[id - 1];
  if (!event) return;
  for (const [label, value] of [["Parent event", `#${event.parent}`], ["Channel / local depth", `${event.channel} / ${event.depth}`], ["Local phase", `${(event.phase / Math.PI).toFixed(3)} π`], ["Transport weight", event.weight.toPrecision(5)]]) {
    const row = document.createElement("div"); row.className = "event-row";
    const a = document.createElement("span"), b = document.createElement("span");
    a.textContent = label; b.textContent = value; row.append(a, b); box.append(row);
  }
}
function project(v, radius = 1) {
  let x = v[0] * radius, y = v[1] * radius, z = v[2] * radius;
  const c = Math.cos(model.yaw), s = Math.sin(model.yaw), cp = Math.cos(model.pitch), sp = Math.sin(model.pitch);
  const xx = c * x + s * z, zz = -s * x + c * z;
  const yy = cp * y - sp * zz, zzz = sp * y + cp * zz;
  const perspective = 3.6 / (3.6 - zzz);
  const scale = Math.min(model.width * .45, model.height * .38) * model.zoom;
  return { x: model.width / 2 + xx * scale * perspective, y: model.height * .52 + yy * scale * perspective, z: zzz, p: perspective };
}
function glow(x, y, size, rgb, alpha) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
  gradient.addColorStop(0, `rgba(${rgb},${alpha})`); gradient.addColorStop(.2, `rgba(${rgb},${alpha * .3})`); gradient.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = gradient; ctx.fillRect(x - size, y - size, size * 2, size * 2);
}
function drawSpace() {
  model.hits = [];
  if (model.cursor === 0) return;
  const mapping = model.mapping, n = model.run.config.channels;
  const chosen = model.selected > 0 ? model.run.events[model.selected - 1].channel : null;
  const detailed = new Set(spineChannels(n, chosen)), heads = [];
  // Only representative phase spines are detailed. All active frontiers remain
  // visible/selectable; neither point spacing nor line opacity measures density.
  for (let channel = 0; channel < n; channel++) {
    const depth = model.depths[channel];
    if (!depth) continue;
    const head = project(mapping.point(channel, depth, model.phase[channel]));
    heads.push({ ...head, phase: model.phase[channel], id: model.parents[channel], detailed: detailed.has(channel) });
    if (!detailed.has(channel)) continue;
    const curve = mapping.curve(channel, depth);
    if (curve[0].depth > 0) {
      // A dashed axis marks omitted earlier turns; it is not a physical filament.
      const start = project(mapping.axis(channel, 0)), end = project(mapping.axis(channel, curve[0].depth));
      ctx.strokeStyle = "#60808d25"; ctx.setLineDash([2, 5]);
      ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); ctx.stroke(); ctx.setLineDash([]);
    }
    for (let i = 1; i < curve.length; i++) {
      const a = project(curve[i - 1].position), b = project(curve[i].position);
      ctx.strokeStyle = phaseColor(curve[i].phase, channel === chosen ? .95 : .48, 70);
      ctx.lineWidth = channel === chosen ? 1.8 : 1.05;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
  }
  if (model.observer.mode === "parallel-rollout") {
    // Compact source boundary in observer coordinates, not multiple sources.
    const starts = spineChannels(n).map(c => project(mapping.axis(c, 0)));
    for (const p of starts) { ctx.fillStyle = "#e9ad7255"; ctx.beginPath(); ctx.arc(p.x, p.y, 1.5, 0, TAU); ctx.fill(); }
  }
  heads.sort((a, b) => a.z - b.z);
  for (const point of heads) {
    const selected = model.selected === point.id;
    ctx.fillStyle = phaseColor(point.phase, point.detailed ? .95 : .2, 75);
    ctx.beginPath(); ctx.arc(point.x, point.y, (selected ? 3 : point.detailed ? 2 : 1) * point.p, 0, TAU); ctx.fill();
    if (selected) { ctx.strokeStyle = "#f2c49c"; ctx.beginPath(); ctx.arc(point.x, point.y, 7, 0, TAU); ctx.stroke(); }
    model.hits.push({ x: point.x, y: point.y, id: point.id });
  }
  const center = project(mapping.source());
  glow(center.x, center.y, 35, "236,166,101", .32);
  glow(center.x, center.y, 13, "247,198,142", .9);
  ctx.fillStyle = "#ffe4bd"; ctx.beginPath(); ctx.arc(center.x, center.y, 3.5, 0, TAU); ctx.fill();
  ctx.fillStyle = "#dcb58c"; ctx.font = "10px -apple-system, sans-serif"; ctx.textAlign = "center";
  ctx.fillText(model.observer.mode === "parallel-rollout" ? "H · SOURCE REGION" : "H · SOURCE", center.x, center.y + 27);
  model.hits.push({ x: center.x, y: center.y, id: 0 });
}
function drawCausal() {
  if (model.cursor === 0) return;
  const w = model.width, h = model.height, root = { x: 44, y: h * .53 }, top = 120, bottom = h - 65;
  const count = Math.min(7, model.run.config.channels), span = Math.max(3, Math.min(9, Math.floor((w - 145) / 52)));
  let channels = Array.from({ length: count }, (_, i) => i);
  const chosen = model.selected && model.run.events[model.selected - 1];
  if (chosen && chosen.channel >= count) channels[count - 1] = chosen.channel;
  model.hits = [{ ...root, id: 0 }];
  for (let row = 0; row < channels.length; row++) {
    const channel = channels[row], y = top + row * (bottom - top) / Math.max(1, count - 1);
    ctx.textAlign = "left"; ctx.font = "9px ui-monospace,monospace"; ctx.fillStyle = "#687f8d"; ctx.fillText(`CH ${channel}`, 15, y - 14);
    const startDepth = Math.max(1, model.depths[channel] - span + 1);
    const lane = model.lanes[channel]; let previous = null;
    for (let depth = startDepth; depth <= Math.min(model.depths[channel], startDepth + span - 1); depth++) {
      const event = lane[depth - 1], x = 112 + (depth - startDepth) * (w - 151) / Math.max(1, span - 1);
      ctx.strokeStyle = "#547c8580"; ctx.lineWidth = 1;
      if (previous) { ctx.beginPath(); ctx.moveTo(previous.x + 5, y); ctx.lineTo(x - 5, y); ctx.stroke(); }
      else if (event.parent === 0) { ctx.beginPath(); ctx.moveTo(root.x, root.y); ctx.lineTo(x - 5, y); ctx.stroke(); }
      else { ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.moveTo(x - 28, y); ctx.lineTo(x - 5, y); ctx.stroke(); ctx.setLineDash([]); }
      ctx.fillStyle = phaseColor(event.phase, .9); ctx.beginPath(); ctx.arc(x, y, model.selected === event.id ? 5 : 3.5, 0, TAU); ctx.fill();
      ctx.fillStyle = model.selected === event.id ? "#f2c49c" : "#819eab"; ctx.textAlign = "center"; ctx.font = "8px ui-monospace,monospace"; ctx.fillText(`#${event.id}`, x, y + 19);
      ctx.fillStyle = "#536d7b"; ctx.fillText(`d${depth}`, x, y - 22);
      previous = { x, y }; model.hits.push({ x, y, id: event.id });
    }
  }
  glow(root.x, root.y, 23, "236,166,101", .6); ctx.fillStyle = "#f2c49c"; ctx.beginPath(); ctx.arc(root.x, root.y, 5, 0, TAU); ctx.fill();
  ctx.textAlign = "center"; ctx.font = "9px ui-monospace,monospace"; ctx.fillStyle = "#d3a579"; ctx.fillText("#0", root.x, root.y + 20);
}
function draw() {
  ctx.clearRect(0, 0, model.width, model.height);
  model.hits = [];
  if (model.run) model.view === "space" ? drawSpace() : drawCausal();
  needsDraw = false;
}
function setView(view) {
  model.view = view;
  for (const key of ["space", "causal"]) { $("view-" + key).classList.toggle("active", key === view); $("view-" + key).setAttribute("aria-pressed", String(key === view)); }
  $("view-label").textContent = view === "space" ? model.observer.mode === "parallel-rollout" ? "PARALLEL ROLLOUT · OBSERVER" : "RADIAL EXPANDING · OBSERVER" : "CAUSAL DEPENDENCIES";
  $("coordinate-note").textContent = view === "space" ? "Phase spines · spacing is not physical density" : "Selected channels · dashed lines omit earlier history";
  $("interaction-hint").textContent = view === "space" ? "Drag to orbit · scroll to zoom · click a frontier" : "Click to inspect · recent depths per channel";
  $("observer-controls").hidden = view !== "space";
  needsDraw = true;
}
function updateMapping() {
  if (model.run) model.mapping = createMapping(model.run.config, model.run.summary.max_depth, model.observer);
  $("mapping-mode").value = model.observer.mode;
  $("base-radius").value = model.observer.baseRadius;
  $("radial-expansion").value = model.observer.expansion;
  $("radius-value").textContent = model.observer.baseRadius.toFixed(3);
  $("expansion-value").textContent = model.observer.expansion.toFixed(2);
  $("expansion-control").hidden = model.observer.mode !== "radial-expanding";
  const n = model.run?.config.channels || 0;
  $("geometry-note").textContent = `${Math.min(n, 24)} / ${n} phase spines · up to 8 recent turns · visual units only`;
  $("phase-period").textContent = model.run ? `Recorded phase: ${model.run.config.phase_steps} updates / turn` : "Phase comes from the run";
  setView(model.view);
}
function installRun(data) {
  $("saved-record").hidden = true;
  model.run = data; updateMapping();
  model.lanes = Array.from({ length: data.config.channels }, () => []);
  for (const event of data.events) model.lanes[event.channel].push(event);
  model.selected = null; resetFrontier();
  $("timeline").max = data.events.length + 1;
  $("total").textContent = fmt(data.events.length + 1);
  $("timeline").disabled = false; $("play").disabled = false; $("step").disabled = false; $("export").disabled = false;
  $("engine-status").textContent = `RUST · ${fmt(data.events.length)} rollout events`;
  setCursor(0);
}
function fail(message) { $("error").textContent = message; $("error").hidden = false; }
async function generate(event) {
  if (event) event.preventDefault();
  if (model.busy || !$("config-form").reportValidity()) return;
  const config = { channels: Number($("channels").value), events: Number($("events").value), phase_steps: Number($("phase-steps").value), seed: Number($("seed").value), scheduler: $("scheduler").value };
  setPlaying(false); model.busy = true; $("loading").hidden = false; $("error").hidden = true;
  $("generate").disabled = true; $("import").disabled = true; $("play").disabled = true; $("step").disabled = true; $("timeline").disabled = true;
  try {
    const response = await fetch("/api/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(config) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Run generation failed");
    validateRun(data); installRun(data); model.busy = false; setPlaying(true);
  } catch (error) { fail(`Generation failed: ${error.message}`); }
  finally {
    model.busy = false; $("loading").hidden = true; $("generate").disabled = false; $("import").disabled = false;
    $("play").disabled = !model.run; $("step").disabled = !model.run; $("timeline").disabled = !model.run;
  }
}
function validateRun(data) {
  const c = data.config;
  if (data.schema_version !== 1 || data.rule !== "source-channels-v0.1" || !c) throw new Error("Unsupported record version or rule");
  for (const [key, low, high] of [["channels", 4, 2048], ["events", 0, 200000], ["phase_steps", 2, 4096], ["seed", 0, 4294967295]]) {
    if (!Number.isInteger(c[key]) || c[key] < low || c[key] > high) throw new Error(`Invalid parameter: ${key}`);
  }
  if (!["balanced", "seeded"].includes(c.scheduler)) throw new Error("Invalid scheduler");
  if (!data.birth || data.birth.id !== 0 || data.birth.kind !== "source_birth" || data.birth.weight !== 1) throw new Error("Invalid source birth");
  if (!Array.isArray(data.events) || data.events.length !== c.events) throw new Error("Event count mismatch");
  const parents = new Uint32Array(c.channels), depths = new Uint32Array(c.channels);
  for (let i = 0; i < data.events.length; i++) {
    const e = data.events[i];
    if (!Number.isInteger(e.channel) || e.channel < 0 || e.channel >= c.channels || e.id !== i + 1 || e.parent !== parents[e.channel] || e.depth !== depths[e.channel] + 1) throw new Error(`Invalid causal record at event #${i + 1}`);
    const phase = e.depth % c.phase_steps * TAU / c.phase_steps;
    if (!Number.isFinite(e.phase) || Math.abs(e.phase - phase) > 1e-12 || !Number.isFinite(e.weight) || Math.abs(e.weight - 1 / c.channels) > 1e-12) throw new Error(`Invalid phase or transport weight at event #${e.id}`);
    parents[e.channel] = e.id; depths[e.channel] = e.depth;
  }
  if (!data.summary || data.summary.max_depth !== Math.max(...depths) || data.summary.frontier_states !== c.channels || data.summary.source_count !== 1 || data.summary.rollout_events !== c.events || !Number.isFinite(data.summary.frontier_weight) || Math.abs(data.summary.frontier_weight - 1) > 1e-12) throw new Error("Record summary failed replay verification");
}
for (const [id, key] of [["mapping-mode", "mode"], ["base-radius", "baseRadius"], ["radial-expansion", "expansion"]]) {
  $(id).addEventListener("input", () => {
    model.observer[key] = key === "mode" ? $(id).value : Number($(id).value);
    updateMapping();
  });
}
$("config-form").addEventListener("submit", generate);
$("play").addEventListener("click", () => { if (model.cursor >= model.run.events.length + 1) setCursor(0); setPlaying(!model.playing); });
$("reset").addEventListener("click", () => { setPlaying(false); model.selected = null; setCursor(0); });
$("step").addEventListener("click", () => { setPlaying(false); model.selected = null; setCursor(model.cursor + 1); });
$("timeline").addEventListener("input", () => { setPlaying(false); model.selected = null; setCursor(Number($("timeline").value)); });
$("view-space").addEventListener("click", () => setView("space"));
$("view-causal").addEventListener("click", () => setView("causal"));
$("home-camera").addEventListener("click", () => { model.yaw = -.45; model.pitch = .25; model.zoom = 1; model.selected = null; needsDraw = true; updateStats(); });
$("export").addEventListener("click", async () => {
  const data = { ...model.run, observer: { mapping: MAPPING_VERSION, ...model.observer, cursor: model.cursor, yaw: model.yaw, pitch: model.pitch, zoom: model.zoom } };
  $("export").disabled = true; $("error").hidden = true; $("saved-record").hidden = true;
  try {
    const response = await fetch("/api/export", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Export failed");
    $("saved-record").textContent = `Saved to ${result.saved} in the project folder.`;
    $("saved-record").hidden = false;
  } catch (error) { fail(`Export failed: ${error.message}`); }
  finally { $("export").disabled = !model.run; }
});
$("import").addEventListener("click", () => $("import-file").click());
$("import-file").addEventListener("change", async () => {
  const file = $("import-file").files[0]; if (!file) return;
  setPlaying(false); $("error").hidden = true;
  try {
    if (file.size > 50_000_000) throw new Error("File exceeds 50 MB");
    const data = JSON.parse(await file.text()); validateRun(data); installRun(data);
    for (const [id, key] of [["channels", "channels"], ["events", "events"], ["scheduler", "scheduler"], ["phase-steps", "phase_steps"], ["seed", "seed"]]) {
      const element = $(id), value = String(data.config[key]);
      if (element.tagName === "SELECT" && !Array.from(element.options).some(o => o.value === value)) element.add(new Option(value, value));
      element.value = value;
    }
    const restored = restoreObserver(data.observer);
    model.observer = { mode: restored.mode, baseRadius: restored.baseRadius, expansion: restored.expansion };
    for (const key of ["yaw", "pitch", "zoom"]) model[key] = restored[key];
    updateMapping();
    const cursor = data.observer?.cursor;
    setCursor(Number.isInteger(cursor) ? cursor : data.events.length + 1);
    $("engine-status").textContent = "IMPORTED · causal and weight checks passed";
  } catch (error) { fail(`Import failed: ${error.message}`); }
  finally { $("import-file").value = ""; }
});
canvas.addEventListener("pointerdown", (event) => { dragging = { x: event.clientX, y: event.clientY, distance: 0 }; canvas.setPointerCapture(event.pointerId); });
canvas.addEventListener("pointermove", (event) => {
  if (!dragging) return;
  const dx = event.clientX - dragging.x, dy = event.clientY - dragging.y;
  dragging.x = event.clientX; dragging.y = event.clientY; dragging.distance += Math.abs(dx) + Math.abs(dy);
  if (model.view === "space") { model.yaw += dx * .006; model.pitch = Math.max(-1.5, Math.min(1.5, model.pitch + dy * .006)); needsDraw = true; }
});
canvas.addEventListener("pointerup", (event) => {
  if (dragging && dragging.distance < 5) {
    const rect = canvas.getBoundingClientRect(), x = event.clientX - rect.left, y = event.clientY - rect.top;
    const candidates = model.hits.map(hit => ({ ...hit, distance: Math.hypot(hit.x - x, hit.y - y) })).filter(hit => hit.distance < 12).sort((a, b) => a.distance - b.distance);
    model.selected = candidates.length ? candidates[0].id : null; updateStats(); needsDraw = true;
  }
  dragging = null;
});
canvas.addEventListener("pointercancel", () => { dragging = null; });
canvas.addEventListener("wheel", (event) => { event.preventDefault(); model.zoom = Math.min(3, Math.max(.35, model.zoom * Math.exp(-event.deltaY * .001))); needsDraw = true; }, { passive: false });
function frame(now) {
  const delta = Math.min(100, now - lastFrame); lastFrame = now;
  if (model.playing) {
    model.credit += delta / 1000 * Number($("speed").value);
    const steps = Math.floor(model.credit);
    if (steps > 0) { model.credit -= steps; setCursor(model.cursor + steps); }
  }
  if (needsDraw && now - lastDraw > 25) { draw(); lastDraw = now; }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
resize(); generate();
