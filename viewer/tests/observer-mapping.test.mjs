import test from 'node:test';
import assert from 'node:assert/strict';
import { createMapping, MAPPING_VERSION, spineChannels, restoreObserver } from '../public/observer-mapping.mjs';
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-10, `${a} != ${b}`);
const minus = (a, b) => a.map((x, i) => x - b[i]);
const dot = (a, b) => a.reduce((sum, x, i) => sum + x * b[i], 0);
const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const config = Object.freeze({ channels: 256, phase_steps: 32 });

test('parallel axes and same-phase spine spacing remain constant at every depth', () => {
  const m = createMapping(config, 128, { mode: 'parallel-rollout' });
  const offset = minus(m.axis(79, 0), m.axis(3, 0));
  for (const d of [0, 1, 32, 67, 128]) {
    minus(m.axis(79, d), m.axis(3, d)).forEach((x, i) => close(x, offset[i]));
    minus(m.point(79, d), m.point(3, d)).forEach((x, i) => close(x, offset[i]));
  }
  close(m.radius(0), m.radius(128));
  close(m.axis(0, 32)[0] - m.axis(0, 0)[0], 1.6 * 32 / 128);
});

test('both mappings preserve phase, handedness, and transverse offsets', () => {
  for (const mode of ['parallel-rollout', 'radial-expanding']) {
    const m = createMapping(config, 128, { mode });
    for (const channel of [0, 127, 255]) {
      const { u, v } = m.basis(channel), direction = minus(m.axis(channel, 128), m.axis(channel, 0));
      close(dot(u, v), 0); close(Math.hypot(...u), 1); close(Math.hypot(...v), 1);
      assert.ok(dot(cross(u, v), direction) > 0);
      for (const d of [8, 16, 24, 32, 128]) {
        const transverse = minus(m.point(channel, d), m.axis(channel, d));
        close(dot(transverse, u), m.radius(d) * Math.cos(d * Math.PI / 16));
        close(dot(transverse, v), m.radius(d) * Math.sin(d * Math.PI / 16));
        close(dot(transverse, direction), 0);
      }
    }
  }
});

test('radial axes retain Fibonacci directions and expansion is progressive and bounded', () => {
  for (const count of [4, 256, 2048]) {
    const m = createMapping({ channels: count, phase_steps: 32 }, 200000, { mode: 'radial-expanding', baseRadius: .08, expansion: .3 });
    close(m.radius(0), 0);
    let previous = 0;
    for (const d of [1, 10, 1000, 50000, 200000]) {
      assert.ok(m.radius(d) >= previous); previous = m.radius(d);
      assert.ok(m.radius(d) <= .25);
      close(Math.hypot(...m.axis(0, d)), d / 200000);
      const y = 1 - 1 / count;
      close(m.axis(0, d)[1], y * d / 200000);
      close(Math.hypot(...minus(m.point(0, d), m.axis(0, d))), m.radius(d));
    }
  }
  const m = createMapping({ channels: 4, phase_steps: 32 }, 100, { mode: 'radial-expanding', baseRadius: .02, expansion: .1 });
  close(m.radius(50), .02 + .1 * .5); // linear envelope away from the birth cap
});

test('long histories have bounded curve work without phase aliasing', () => {
  for (const period of [2, 32, 4096]) {
    for (const mode of ['parallel-rollout', 'radial-expanding']) {
      const m = createMapping({ channels: 4, phase_steps: period }, 200000, { mode });
      const curve = m.curve(0, 200000);
      assert.ok(curve.length <= 129);
      assert.equal(curve.at(-1).depth, 200000);
      assert.deepEqual(curve.at(-1).position, m.point(0, 200000));
      for (let i = 1; i < curve.length; i++) assert.ok(curve[i].depth - curve[i-1].depth <= period / 16 + 1e-10);
      assert.ok(curve.every(p => p.position.every(Number.isFinite)));
    }
  }
});

test('switching mappings and exporting settings leaves the entire causal artifact unchanged', () => {
  const run = Object.freeze({ config, birth: Object.freeze({ id: 0 }), events: Object.freeze([Object.freeze({ id: 1, channel: 0, depth: 1, parent: 0, phase: Math.PI/16, weight: 1/256 })]), summary: Object.freeze({ max_depth: 1 }) });
  const before = JSON.stringify(run);
  for (const mode of ['parallel-rollout', 'radial-expanding']) {
    const m = createMapping(run.config, run.summary.max_depth, { mode, baseRadius: .07, expansion: .2 });
    m.curve(0, 1);
    const exported = JSON.parse(JSON.stringify({ ...run, observer: { mapping: MAPPING_VERSION, ...m.options } }));
    assert.equal(restoreObserver(exported.observer).mode, mode);
    delete exported.observer;
    assert.equal(JSON.stringify(exported), before);
  }
  assert.equal(JSON.stringify(run), before);
});

test('birth-only geometry is finite and representative selection stays bounded', () => {
  for (const mode of ['parallel-rollout', 'radial-expanding']) {
    const m = createMapping(config, 0, { mode });
    assert.ok(m.point(0, 0).every(Number.isFinite));
  }
  const channels = spineChannels(2048, 2047);
  assert.equal(channels.length, 24); assert.equal(new Set(channels).size, 24);
  assert.ok(channels.includes(2047));
  assert.deepEqual(spineChannels(4), [0, 1, 2, 3]);
});

test('observer imports restore settings, migrate legacy intent, and bound bad visual inputs', () => {
  const record = { mapping: MAPPING_VERSION, mode: 'radial-expanding', baseRadius: .04, expansion: .12, yaw: .8, pitch: -.5, zoom: 2 };
  assert.deepEqual(restoreObserver(record), { mode: record.mode, baseRadius: .04, expansion: .12, yaw: .8, pitch: -.5, zoom: 2 });
  assert.equal(restoreObserver({ mapping: 'fibonacci-depth-v0.1' }).mode, 'radial-expanding');
  assert.equal(restoreObserver({ mapping: 'unknown', mode: 'radial-expanding' }).mode, 'parallel-rollout');
  const bad = restoreObserver({ mapping: MAPPING_VERSION, baseRadius: -2, expansion: Infinity, zoom: 100, pitch: NaN });
  assert.equal(bad.baseRadius, 0); assert.equal(bad.expansion, .08); assert.equal(bad.zoom, 3); assert.equal(bad.pitch, .25);
});
