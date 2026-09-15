// Disposable observer geometry only. A phase spine is a rollout generator,
// not a physical 1D filament or a measurement of spatial density.
// Rendering frames below are axis-orthogonal drawing bases, NOT the Frenet
// normal fiber of a helix and NOT the paper's transverse relational K_perp.
export const MAPPING_VERSION = "rollout-observer-v0.3";
export const MODES = ["intrinsic-untwisted", "radial-observer"];
export const DEFAULTS = Object.freeze({ mode: "intrinsic-untwisted", spineRadius: .025, displayThickness: 1.05 });
const TAU = 2 * Math.PI;
const clamp = (value, low, high, fallback) => Number.isFinite(value) ? Math.min(high, Math.max(low, value)) : fallback;
export function settings(input = {}) {
  return {
    mode: MODES.includes(input.mode) ? input.mode : DEFAULTS.mode,
    spineRadius: clamp(input.spineRadius, 0, .08, DEFAULTS.spineRadius),
    displayThickness: clamp(input.displayThickness, .5, 3, DEFAULTS.displayThickness),
  };
}
function cross(a, b) { return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]; }
function unit(v) { const length = Math.hypot(...v); return v.map(x => x / length); }

export class ObserverMapping {
  constructor(intrinsic, options = {}) {
    // Copy only relational metadata. All Euclidean placement begins here.
    this.count = intrinsic.trajectoryCount;
    this.period = intrinsic.phaseSteps;
    this.depthScale = Math.max(1, intrinsic.maxDepth);
    this.options = settings(options);
  }
  mapRolloutPoint(state) {
    return this.point(state.trajectoryLabel, state.depth, state.phase);
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
export class IntrinsicUntwistedMapping extends ObserverMapping {
  constructor(intrinsic, options) {
    super(intrinsic, options);
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
  radius() { return Math.min(this.options.spineRadius, .42 * this.spacing); }
  source() { return [-.8, 0, 0]; }
}
export class RadialObserverMapping extends ObserverMapping {
  constructor(intrinsic, options) {
    super(intrinsic, options);
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
  // Constant observer spine radius: no depth-dependent geometric dilation.
  // This is not the paper's intrinsic R; that quantity is not implemented here.
  radius() { return this.options.spineRadius; }
  source() { return [0, 0, 0]; }
}
export function createMapping(intrinsic, options) {
  const normalized = settings(options);
  const Mapping = normalized.mode === "intrinsic-untwisted" ? IntrinsicUntwistedMapping : RadialObserverMapping;
  return new Mapping(intrinsic, normalized);
}
export function spineChannels(count, selectedChannel = null) {
  const shown = Math.min(count, 24);
  const channels = Array.from({ length: shown }, (_, i) => Math.floor(i * count / shown));
  if (Number.isInteger(selectedChannel) && selectedChannel >= 0 && selectedChannel < count && !channels.includes(selectedChannel)) channels[shown - 1] = selectedChannel;
  return channels;
}
export function restoreObserver(record) {
  const current = record?.mapping === MAPPING_VERSION;
  const previous = record?.mapping === "rollout-observer-v0.2";
  const pointRays = record?.mapping === "fibonacci-depth-v0.1";
  const known = current || previous || pointRays;
  const migrated = previous ? {
    mode: record.mode === "radial-expanding" ? "radial-observer" : "intrinsic-untwisted",
    spineRadius: record.baseRadius,
    // The old expansion parameter is intentionally not reinterpreted as thickness.
  } : pointRays ? { mode: "radial-observer" } : {};
  return {
    ...settings(current ? record : migrated),
    yaw: clamp(known ? record.yaw : null, -1000, 1000, -.45),
    pitch: clamp(known ? record.pitch : null, -1.5, 1.5, .25),
    zoom: clamp(known ? record.zoom : null, .35, 3, 1),
    migrationNotice: previous ? "Legacy observer updated: depth-dependent radius expansion removed; rendering thickness uses its default."
      : pointRays ? "Legacy point-ray record shown with constant-radius observer phase spines."
      : record && !current ? "Unknown observer mapping: current display defaults applied." : "",
  };
}
