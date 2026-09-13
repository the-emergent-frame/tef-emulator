// Disposable observer geometry only. A phase spine is a rollout generator,
// not a physical 1D filament or a measurement of spatial density.
export const MAPPING_VERSION = "rollout-observer-v0.2";
export const MODES = ["parallel-rollout", "radial-expanding"];
export const DEFAULTS = Object.freeze({ mode: "parallel-rollout", baseRadius: .025, expansion: .08 });
const TAU = 2 * Math.PI;
const clamp = (value, low, high, fallback) => Number.isFinite(value) ? Math.min(high, Math.max(low, value)) : fallback;
export function settings(input = {}) {
  return {
    mode: MODES.includes(input.mode) ? input.mode : DEFAULTS.mode,
    baseRadius: clamp(input.baseRadius, 0, .08, DEFAULTS.baseRadius),
    expansion: clamp(input.expansion, 0, .3, DEFAULTS.expansion),
  };
}
function cross(a, b) { return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]; }
function unit(v) { const length = Math.hypot(...v); return v.map(x => x / length); }

export class ObserverMapping {
  constructor(config, maxDepth, options = {}) {
    // Copy scalar inputs; never retain or mutate the causal record.
    this.count = config.channels;
    this.period = config.phase_steps;
    this.depthScale = Math.max(1, maxDepth);
    this.options = settings(options);
  }
  phase(depth) { return (depth % this.period) * TAU / this.period; }
  point(channel, depth, phase = this.phase(depth)) {
    const axis = this.axis(channel, depth), radius = this.radius(depth), { u, v } = this.basis(channel);
    return axis.map((x, j) => x + radius * (Math.cos(phase) * u[j] + Math.sin(phase) * v[j]));
  }
  // Bounded rendering work with >= 16 samples per turn, including K=2.
  // Earlier history is omitted, not connected through aliased helix samples.
  curve(channel, depth) {
    const start = Math.max(0, depth - 8 * this.period);
    const segments = Math.ceil((depth - start) / this.period * 16);
    return Array.from({ length: segments + 1 }, (_, i) => {
      const d = segments ? start + (depth - start) * i / segments : depth;
      return { depth: d, phase: this.phase(d), position: this.point(channel, d) };
    });
  }
}
export class ParallelRolloutMapping extends ObserverMapping {
  constructor(config, maxDepth, options) {
    super(config, maxDepth, options);
    this.columns = Math.ceil(Math.sqrt(this.count));
    this.rows = Math.ceil(this.count / this.columns);
    this.spacing = 1 / Math.max(1, this.columns - 1);
  }
  axis(channel, depth) {
    return [-.8 + 1.6 * depth / this.depthScale,
      (channel % this.columns - (this.columns - 1) / 2) * this.spacing,
      (Math.floor(channel / this.columns) - (this.rows - 1) / 2) * this.spacing];
  }
  basis() { return { u: [0, 1, 0], v: [0, 0, 1] }; } // u × v = +x
  radius() { return Math.min(this.options.baseRadius, .42 * this.spacing); }
  source() { return [-.8, 0, 0]; }
}
export class RadialExpandingMapping extends ObserverMapping {
  constructor(config, maxDepth, options) {
    super(config, maxDepth, options);
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    this.frames = Array.from({ length: this.count }, (_, i) => {
      const y = 1 - 2 * (i + .5) / this.count, radial = Math.sqrt(1 - y*y);
      const axis = [radial * Math.cos(i * goldenAngle), y, radial * Math.sin(i * goldenAngle)];
      const helper = Math.abs(axis[1]) < .9 ? [0, 1, 0] : [1, 0, 0];
      const u = unit(cross(helper, axis)), v = cross(axis, u); // u × v = outward axis
      return { axis, u, v };
    });
  }
  axis(channel, depth) { return this.frames[channel].axis.map(x => x * depth / this.depthScale); }
  basis(channel) { return this.frames[channel]; }
  radius(depth) {
    const r = Math.max(0, Math.min(1, depth / this.depthScale));
    // Linear visual envelope, tapered at birth and capped for rendering only.
    // The angular cap is a crowding heuristic, not a transverse interaction law.
    return Math.min(this.options.baseRadius + this.options.expansion * r,
      .45 * Math.sqrt(4 * Math.PI / this.count) * r, .25);
  }
  source() { return [0, 0, 0]; }
}
export function createMapping(config, maxDepth, options) {
  const normalized = settings(options);
  const Mapping = normalized.mode === "parallel-rollout" ? ParallelRolloutMapping : RadialExpandingMapping;
  return new Mapping(config, maxDepth, normalized);
}
export function spineChannels(count, selectedChannel = null) {
  const shown = Math.min(count, 24);
  const channels = Array.from({ length: shown }, (_, i) => Math.floor(i * count / shown));
  if (Number.isInteger(selectedChannel) && selectedChannel >= 0 && selectedChannel < count && !channels.includes(selectedChannel)) channels[shown - 1] = selectedChannel;
  return channels;
}
export function restoreObserver(record) {
  const current = record?.mapping === MAPPING_VERSION;
  // Old point-ray records retain radial intent but are re-rendered as phase spines.
  const legacy = record?.mapping === "fibonacci-depth-v0.1";
  return {
    ...settings(current ? record : legacy ? { mode: "radial-expanding" } : {}),
    yaw: clamp(current || legacy ? record.yaw : null, -1000, 1000, -.45),
    pitch: clamp(current || legacy ? record.pitch : null, -1.5, 1.5, .25),
    zoom: clamp(current || legacy ? record.zoom : null, .35, 3, 1),
  };
}
