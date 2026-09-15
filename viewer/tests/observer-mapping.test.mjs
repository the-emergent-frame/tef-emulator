import { createIntrinsicRepresentation } from "../public/intrinsic-representation.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import { createMapping as observerMapping, MAPPING_VERSION, spineChannels, restoreObserver } from '../public/observer-mapping.mjs';
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-10, `${a} != ${b}`);
const minus = (a, b) => a.map((x, i) => x - b[i]);
const dot = (a, b) => a.reduce((sum, x, i) => sum + x * b[i], 0);
const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const createMapping = (config, maxDepth, options) => observerMapping(createIntrinsicRepresentation({ birth: { id: 0 }, config, summary: { max_depth: maxDepth } }), options);
const config = Object.freeze({ channels: 256, phase_steps: 32 });

test('parallel axes and same-phase spine spacing remain constant at every depth', () => {
  const m = createMapping(config, 128, { mode: 'intrinsic-untwisted' });
  const offset = minus(m.axis(79, 0), m.axis(3, 0));
  for (const d of [0, 1, 32, 67, 128]) {
    minus(m.axis(79, d), m.axis(3, d)).forEach((x, i) => close(x, offset[i]));
    minus(m.point(79, d), m.point(3, d)).forEach((x, i) => close(x, offset[i]));
  }
  close(m.radius(0), m.radius(128));
  close(m.axis(0, 32)[0] - m.axis(0, 0)[0], 1.6 * 32 / 128);
});

test('both mappings preserve phase, handedness, and transverse offsets', () => {
  for (const mode of ['intrinsic-untwisted', 'radial-observer']) {
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

test('radial axes retain Fibonacci directions with constant spine radius at all depths', () => {
  for (const count of [4, 256, 2048]) {
    const m = createMapping({ channels: count, phase_steps: 32 }, 200000, { mode: 'radial-observer', spineRadius: .08, displayThickness: 3 });
    for (const d of [0, 1, 10, 1000, 50000, 200000]) {
      close(m.radius(d), .08);
      close(Math.hypot(...m.axis(0, d)), d / 200000);
      close(m.axis(0, d)[1], (1 - 1 / count) * d / 200000);
      close(Math.hypot(...minus(m.point(0, d), m.axis(0, d))), .08);
    }
  }
});

test('display thickness changes neither geometry nor phase or pitch', () => {
  for (const mode of ['intrinsic-untwisted', 'radial-observer']) {
    const thin = createMapping(config, 128, { mode, displayThickness: .5 });
    const thick = createMapping(config, 128, { mode, displayThickness: 3 });
    for (const channel of [0, 127, 255]) assert.deepEqual(thin.curve(channel, 128), thick.curve(channel, 128));
  }
});

test('long histories have bounded curve work without phase aliasing', () => {
  for (const period of [2, 32, 4096]) {
    for (const mode of ['intrinsic-untwisted', 'radial-observer']) {
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
  for (const mode of ['intrinsic-untwisted', 'radial-observer']) {
    const m = createMapping(run.config, run.summary.max_depth, { mode, spineRadius: .07, displayThickness: .2 });
    m.curve(0, 1);
    const exported = JSON.parse(JSON.stringify({ ...run, observer: { mapping: MAPPING_VERSION, ...m.options } }));
    assert.equal(restoreObserver(exported.observer).mode, mode);
    delete exported.observer;
    assert.equal(JSON.stringify(exported), before);
  }
  assert.equal(JSON.stringify(run), before);
});

test('birth-only geometry is finite and representative selection stays bounded', () => {
  for (const mode of ['intrinsic-untwisted', 'radial-observer']) {
    const m = createMapping(config, 0, { mode });
    assert.ok(m.point(0, 0).every(Number.isFinite));
  }
  const channels = spineChannels(2048, 2047);
  assert.equal(channels.length, 24); assert.equal(new Set(channels).size, 24);
  assert.ok(channels.includes(2047));
  assert.deepEqual(spineChannels(4), [0, 1, 2, 3]);
});

test('observer imports explicitly migrate previous mappings without repurposing expansion', () => {
  const record = { mapping: MAPPING_VERSION, mode: 'radial-observer', spineRadius: .04, displayThickness: 2, yaw: .8, pitch: -.5, zoom: 2 };
  assert.deepEqual(restoreObserver(record), { mode: record.mode, spineRadius: .04, displayThickness: 2, yaw: .8, pitch: -.5, zoom: 2, migrationNotice: '' });
  for (const mode of ['parallel-rollout', 'radial-expanding']) {
    const legacy = restoreObserver({ mapping: 'rollout-observer-v0.2', mode, baseRadius: .04, expansion: .3, yaw: .9, pitch: -.4, zoom: 1.5 });
    assert.equal(legacy.mode, mode === 'parallel-rollout' ? 'intrinsic-untwisted' : 'radial-observer');
    assert.equal(legacy.spineRadius, .04); assert.equal(legacy.displayThickness, 1.05);
    assert.equal(legacy.yaw, .9); assert.equal(legacy.zoom, 1.5);
    assert.match(legacy.migrationNotice, /expansion removed/);
    assert.ok(!('expansion' in legacy));
  }
  assert.equal(restoreObserver({ mapping: 'fibonacci-depth-v0.1' }).mode, 'radial-observer');
  assert.equal(restoreObserver({ mapping: 'unknown', mode: 'radial-observer' }).mode, 'intrinsic-untwisted');
  const bad = restoreObserver({ mapping: MAPPING_VERSION, spineRadius: -2, displayThickness: Infinity, zoom: 100, pitch: NaN });
  assert.equal(bad.spineRadius, 0); assert.equal(bad.displayThickness, 1.05); assert.equal(bad.zoom, 3); assert.equal(bad.pitch, .25);
});

test('intrinsic representation copies only existing relational state and leaves adjacency unspecified', () => {
  const event = Object.freeze({ id: 257, channel: 0, depth: 2, parent: 1, phase: Math.PI / 8, weight: 1 / 256 });
  const run = Object.freeze({ birth: Object.freeze({id: 0}), config, summary: Object.freeze({max_depth: 128}) });
  const intrinsic = createIntrinsicRepresentation(run), state = intrinsic.representEvent(event);
  assert.deepEqual(state, { sourceId: 0, trajectoryLabel: 0, depth: 2, eventId: 257, parentEventId: 1, phase: Math.PI / 8, weight: 1 / 256 });
  assert.equal(intrinsic.transverseRelations, null);
  assert.ok(Object.isFrozen(intrinsic) && Object.isFrozen(state));
  for (const mode of ['intrinsic-untwisted', 'radial-observer']) {
    const mapping = observerMapping(intrinsic, {mode});
    assert.deepEqual(mapping.mapRolloutPoint(state), mapping.point(0, 2, Math.PI / 8));
  }
  assert.ok(!('coordinates' in state) && !('radius' in state) && !('distance' in state));
});
