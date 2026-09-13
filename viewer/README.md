# Observer

The English JavaScript/Canvas observer is served by `python3 python/serve.py`.
Rust generates the causal history; the browser reconstructs its frontier and
passes scalar configuration and depth/phase values into a disposable mapping:

```text
causal record → ObserverMapping → 3D projection → Canvas strokes and markers
```

`observer-mapping.mjs` implements `ParallelRolloutMapping` and
`RadialExpandingMapping`. It receives no mutable engine state. Switching mappings
or adjusting visual radii requires no engine request and changes no event,
parent, weight, phase, or diagnostic. No physical metric, branching rule,
lateral interaction, or inverse-square dilution is introduced.

## Controls

- **Observer mapping:** `parallel-rollout` (default) or `radial-expanding`.
- **Base radius:** 0–0.08; default 0.025, in normalized display units.
- **Radial expansion:** 0–0.30; default 0.08, shown only in radial mode.
- **Updates / turn:** the existing candidate phase rule, 2–4096; default 32.
  This remains a run parameter: use **Generate run** to change it. The observer
  shows the recorded value so edited form fields cannot mislabel an old run.
- Orbit by dragging, zoom by scrolling, and click frontiers to inspect events.
  Causal view, reversible replay, and the existing diagnostics remain available.

Radius controls specify a visual envelope; crowding caps below can reduce the
actual radius. They do not control physical widths, energy, or density. All
channels share the same handedness and phase convention in both mappings.

## Exact mappings: rollout-observer-v0.2

Let `N` be the number of channels, `d` local depth, `D = max(1, final_max_depth)`,
`r = d/D`, and `K = phase_steps`. The phase spine is

```text
p_i(d) = a_i(d) + R(d) [cos(φ(d)) u_i + sin(φ(d)) v_i]
φ(d) = 2π (d mod K) / K
```

At event frontiers the renderer uses the recorded event phase. Between integer
depths it interpolates the existing linear phase convention solely to draw a
smooth curve. Interpolated points are not new events. Frames satisfy
`u_i × v_i = forward_axis_i`, preserving the same handedness in both modes.
There was no geometric helix/pitch in the previous point-ray renderer; this
revision gives its existing phase rule an explicit visual spine.

### Parallel rollout

Set `C = ceil(sqrt(N))`, `B = ceil(N/C)`, `s = 1/max(1,C-1)`:

```text
a_i(d) = (-0.8 + 1.6r, (i mod C - (C-1)/2)s, (floor(i/C) - (B-1)/2)s)
u_i = (0,1,0), v_i = (0,0,1)
R_parallel = min(R0, 0.42s)
```

The ports occupy a compact source region; their longitudinal axes all point
along +x. Channel separation is constant in mapping coordinates for every
depth, with normalized axial pitch `1.6K/D`. The shared source-region marker is
an observer representation of one source. The grid neither defines intrinsic
adjacency nor proves dimensionality. Camera perspective can still change pixel
spacing; it does not introduce radial divergence into these parallel axes.

### Radial expanding

Retain the Fibonacci sphere: `y_i = 1 - 2(i+1/2)/N`,
`α_i = iπ(3-√5)`, and
`n_i = (sqrt(1-y_i²)cos α_i, y_i, sqrt(1-y_i²)sin α_i)`.
Let `h=(0,1,0)` if `|n_iy|<0.9`, otherwise `(1,0,0)`;
`u_i=normalize(h × n_i)`, `v_i=n_i × u_i`.

```text
a_i(d) = r n_i
R_radial(r) = min(R0 + kr, 0.45 sqrt(4π/N) r, 0.25),  0 ≤ r ≤ 1
```

The linear visual envelope `R0 + kr` expands transversely with depth. The second
term tapers it to zero at birth, avoiding large loops crossing the source,
and limits crowding according to nominal angular spacing. It is a rendering
heuristic, not a physical packing or interaction law; it does not guarantee
that projected curves never overlap. The final cap prevents extreme geometry.
Normalized axial pitch is `K/D`. The fixed final-depth normalization is the same
as the earlier radial observer, so budgets affect pixel scale across runs.

## Interpretation and display sampling

A spacetime helix in the emulator should not be read as an isolated
one-dimensional filament embedded in pre-existing three-dimensional space.
The rendered helix is an observer representation of rollout structure;
spatial dimensionality and local adjacency remain separate questions for
later experiments.

A fixed set of radial axes appears sparser over Euclidean spherical shells
because their display area grows as `4πr²`. This is an embedding artifact, not
a TEF prediction that space density falls as `1/r²`. The expanding envelope
illustrates a generator with transverse visual extent; it neither fills nor
measures a physical volume. The parallel view also makes no claim to establish
intrinsic dimension. Both views depict the same causal model.

For readability, at most 24 representative channels have detailed spines; all
advanced channel frontiers remain visible and selectable. Selecting another
channel includes it in the detailed subset. For each spine, up to eight recent
turns are shown with 16 segments per turn (at most 128 segments). Earlier turns
are omitted with a faint dashed axis, not connected by phase-aliased samples.
At very large depths, recent turns may be visually compressed; use zoom and
numerical inspection rather than interpreting their pixel width. The UI reports
the sampling limit. Display dots, line opacity, gaps, and sampled channel counts
are never density observables. Exports retain all events.

The phase histogram uses 16 bins over `[0,2π)` and scales its tallest bin to chart
height. Diagnostics include all channel frontiers, not just rendered spines.

## Export and compatibility

Export saves the full record to the local `runs/` directory. Only the separate
`observer` object stores mapping version, mode, base radius, expansion, replay
cursor, and camera. Import restores these bounded visual settings. A record
without observer metadata uses the parallel default. Legacy `fibonacci-depth-v0.1`
records preserve their radial intent and camera but are redrawn with the new
expanding-spine defaults; their original point-ray appearance is not reproduced.
Unknown mapping versions use current defaults. Causal records are unchanged.

No dependencies or frontend build step are added. Run observer checks with
`node --test viewer/tests/*.test.mjs`.
