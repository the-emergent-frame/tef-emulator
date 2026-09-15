# Observer

The English JavaScript/Canvas observer is served by `python3 python/serve.py`.
Experiment 0001 uses four separate levels:

```text
Rust causal record
  → intrinsic relational representation (sourceId, trajectoryLabel, depth)
  → IntrinsicUntwistedMapping or RadialObserverMapping
  → camera projection and Canvas rendering
```

`intrinsic-representation.mjs` provides a lightweight, read-only adapter. It
copies an existing event's source identity, trajectory label, depth, phase,
parent id, event id, and transport weight. It supplies no XYZ positions and
leaves `transverseRelations` unspecified (`null`). It does not construct K⊥,
transported cells, intrinsic distances, or an untwisting map. The current finite
channel-local depth is a schematic rollout index, not an implementation of the
paper's full infinite spatial-depth complex or physical time.

`observer-mapping.mjs` receives this representation and generates disposable
coordinates. `app.js` projects them and draws phase spines. Changing mapping,
radius, thickness, or camera does not modify a causal event or its diagnostics,
and does not trigger another engine request. Fractional curve samples are
rendering interpolation, never new intrinsic states or events.

## Theory and interpretation

The canonical reference for this representation is Wu, X. (2026),
*Spacetime as Source-Local Rollout and the Conditional Emergence of
Three-Dimensional Effective Geometry in The Emergent Frame*, version 3.12,
[doi:10.5281/zenodo.22776137](https://doi.org/10.5281/zenodo.22776137).

The paper's **Exact product theorem** (`eq:product`) gives
`K ≅ Z_cell × K_perp` after intrinsic relabeling of a homogeneous transported
complex. Its **Cubic volume growth** result (`eq:df3`) requires uniform quadratic
transverse growth, measure/incidence-preserving transport, and controlled
longitudinal scales. The parallel-looking observer is a schematic motivation
from that construction, not an implementation or numerical verification of it.
Untwisting does not mean deleting chirality or phase.

A spacetime helix in the emulator should not be read as an isolated
one-dimensional filament embedded in pre-existing three-dimensional space.
The rendered helix is an observer representation of source-local rollout
structure: a trajectory representative / rollout generator / phase spine,
not necessarily the complete associated spatial volume.

Keep these three transverse concepts distinct:

1. The local helix normal plane is perpendicular to the trajectory's local
   tangent; the paper treats its geometric frame transport explicitly.
2. K⊥ describes transverse relationships among trajectory labels, with additional
   incidence and measure assumptions. It is not defined by one helix's normal
   plane, and Experiment 0001 does not implement it.
3. Our observer offsets and drawing bases are Euclidean layout choices. The
   drawing bases below are perpendicular to the display axis, not generally
   to the local helix tangent. They neither reconstruct the paper's normal
   fibers nor identify K⊥ with an observer XY plane.

The radial mapping spreads a finite number of axes over observer shells of
area `4πr²`; apparent dilution is an embedding artifact, not a TEF prediction
that intrinsic space density falls as `1/r²`. Radius expansion is no longer
used to compensate for it. Both modes depict the same causal history and are
not competing physical models.

## Controls

The **Observer / Rendering** group contains:

- **Observer mapping:** `intrinsic-untwisted` (default) or `radial-observer`.
- **Spine radius (visual):** 0–0.08, default 0.025, normalized display units.
  This preserves the earlier radius control's visual role. It is not the
  intrinsic radius R in the paper; no physical R or q is implemented here.
- **Display thickness:** 0.5–3 CSS pixels, default 1.05. Changes Canvas stroke
  width only, not the helix radius, phase, axial pitch, or any intrinsic quantity.

**Updates / turn** retains the existing candidate phase rule, 2–4096 (default
32). It remains a run parameter: use **Generate run** to change it. The observer
shows the recorded value, not an unapplied form edit. The existing fixed
right-handed display convention is preserved; there was no separate handedness
or physical q control to retain or reinterpret.

Channel count, event budget, scheduler, seed, pause/play/step, scrubbing, causal
inspection, and camera controls retain their roles. Event order is not physical
time. The existing camera `pitch` field means camera tilt, not helical pitch.

## Exact formulas: rollout-observer-v0.3

Let `N` be trajectory count, `m` the represented local depth,
`D = max(1, final_max_depth)`, `r=m/D`, and `K=phase_steps`. The common drawing law is

```text
X_alpha(m) = a_alpha(m) + R_display [cos(phi(m)) u_alpha + sin(phi(m)) v_alpha]
phi(m) = 2π (m mod K) / K
```

Frontier markers use the recorded event phase. Between integer depths, the
spine follows the existing linear phase convention continuously for rendering.
The bases obey `u_alpha × v_alpha = forward_display_axis`. This preserves the
same display handedness and phase convention in both modes.

### Intrinsic Untwisted

Reuse the previous compact grid with `C=ceil(sqrt(N))`, `B=ceil(N/C)`,
and `s=1/max(1,C-1)`:

```text
a_alpha(m) = (-0.8 + 1.6r,
              (alpha mod C - (C-1)/2)s,
              (floor(alpha/C) - (B-1)/2)s)
u_alpha = (0,1,0), v_alpha = (0,0,1)
R_display = min(spineRadius, 0.42s)
```

Axes are parallel to +x; transverse offsets and the crowding-capped radius are
constant with depth. Axial display pitch is `1.6K/D`. Source ports occupy a
compact observer region representing one source. The grid assigns no adjacency,
edge lengths, or cell weights to K⊥. Perspective can change pixel spacing without
introducing depth-dependent divergence into the axes.

### Radial Observer

Keep the Fibonacci directions, with `y_alpha=1-2(alpha+1/2)/N` and
`theta_alpha=alpha π(3-√5)`:

```text
n_alpha = (sqrt(1-y_alpha²) cos(theta_alpha), y_alpha,
           sqrt(1-y_alpha²) sin(theta_alpha))
a_alpha(m) = r n_alpha
h = (0,1,0) if |n_alpha,y| < 0.9, otherwise (1,0,0)
u_alpha = normalize(h × n_alpha), v_alpha = n_alpha × u_alpha
R_display = spineRadius  (constant at every depth)
```

Axial display pitch is `K/D`. The point-source marker is at the origin;
constant-radius phase spines start within a compact region of radius
`spineRadius`. They need not all intersect the marker. There is no taper or
`R0 + kr` law. Near-source overlap is controlled by representative sampling,
low-opacity frontier markers, bounded radius controls, and line width.
This is a Euclidean point-source embedding, not intrinsic metric reconstruction.

### Rendering compensation and limits

```text
stroke_width = displayThickness × (1.7 if selected else 1) CSS pixels
```

Stroke width is independent of depth and changes no vertices. Existing color
and opacity distinguish phase and selection, never space density. Neither an
intrinsic R nor a physical q is inferred from the rendered radius and pitch.
The final-depth normalization is held fixed during a replay; changing run
budgets can change pixel scale across runs.

At most 24 representative spines are detailed, including a selected trajectory.
All advanced frontiers remain selectable. Each detailed spine shows up to eight
recent turns, with 16 segments per turn (at most 128 segments); earlier turns
are omitted with a faint dashed axis. The UI reports these display limits.
High-depth turns can become visually compressed; they are not resampled into
new dynamics. Diagnostics include every channel, and exports retain every event.

## Export and migration

Only the separate `observer` object stores `rollout-observer-v0.3`, mode,
`spineRadius`, `displayThickness`, replay cursor, and camera. The causal schema
and rule version stay unchanged. Current records restore these bounded values.

For `rollout-observer-v0.2`, import maps `parallel-rollout` to
`intrinsic-untwisted` and `radial-expanding` to `radial-observer`, retaining
`baseRadius` as the visual `spineRadius`, camera, and cursor. The old `expansion`
value is dropped, not converted to intrinsic geometry or thickness. A visible
migration notice explains that change; thickness starts at its default. Old
radius caps/tapers are not reproduced, so exact legacy appearance changes.

Older `fibonacci-depth-v0.1` point-ray records retain radial intent and camera
with current spine defaults and a notice. Records without observer metadata
use the intrinsic-untwisted default; unknown mapping versions use current
settings and report that fallback. All preserve the causal history.

Run checks with `node --test viewer/tests/*.test.mjs`. No runtime dependency or
frontend build step is added. See the experiment documentation for the deferred
intrinsic-adjacency and diffusion investigations.
