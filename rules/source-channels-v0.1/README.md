# source-channels-v0.1

Status: implemented candidate scaffold for experiment 0001. These transitions are proposed computational assumptions, not evolution laws derived from the TEF papers.

## Motivation and inherited context

The experiment follows the TEF research direction of persistent matter-associated structure and open spacetime rollout. Background references are [Paper IV v4.6](https://doi.org/10.5281/zenodo.22256714) for the matter/space-interface context, [Paper VI v3.2](https://doi.org/10.5281/zenodo.22649267) for the interface and source-local cycle context, and [Paper VII v2.5](https://doi.org/10.5281/zenodo.22723329) for the rollout framework and energy bookkeeping scale. These are conceptual references; no paper equation is translated into the independent-channel transition below. No numerical paper parameter is used by this kernel. The broader bibliography is pinned in [CITATION.cff](../../CITATION.cff).

The user-selected boundary is one hydrogen-associated source with an isotropic 3D observer representation. Source formation, atomic constituents, and physical energy release are deferred.

## State and birth

A supplied `source_birth` event has id 0. It creates one persistent source and N distinguishable abstract channel ports. Port i has frontier state `(i, depth=0)`, parent event 0, phase 0, and dimensionless transport weight `w_i = 1/N`.

There are no coordinates, distances, volumes, seconds, velocities, or physical energy units in the engine. Channel labels do not carry directions until an observer assigns them.

## Local transition

A rollout event may select any channel i whose current frontier is `(i, d)`. It consumes that frontier version and produces `(i, d+1)`:

```text
source remains present
frontier(i, d, parent=p) -> frontier(i, d+1, parent=new_event_id)
new_event = {id, channel=i, parent=p, depth=d+1, phase, weight=1/N}
phase = 2π × ((d+1) mod K) / K
```

Each channel has exactly one available frontier, including an unadvanced port still at the source. The previous version remains in structural history but is unavailable for a second consumption. Its exported weight records a completed transfer, not another live deposit. The source is a persistent condition, not a separately consumed shared resource at every update.

The total active frontier transport weight remains 1. The birth record's weight is the initial total allocation, not a second reservoir to add to that total. There is no recurring energy injection. What physical quantity, if any, this bookkeeping represents is unresolved.

`K = phase_steps` is an assumed number of channel-local updates per phase turn. It is not a paper-derived source frequency, clock, complex quantum amplitude, or interference law. All channels start with the same phase convention.

## Dependencies and scheduling

The parent is the channel's previous producing event (birth for its first update). Thus the history is a rooted tree with N independent chains and no lateral interactions. Event ids label one stored topological ordering. They introduce no causal edges between independent channels.

- `balanced`: choose channel `execution_index mod N`, starting at index 0. Complete rounds have equal local depths by construction; this schedule is not a physical simultaneous shell.
- `seeded`: sample a channel uniformly with a versioned SplitMix64 generator and rejection sampling. Initialize its 64-bit state to `seed + 0x9e3779b97f4a7c15` modulo 2^64, then use the increment/mixing constants in `crates/tef-core/src/lib.rs`. Seed 0 is valid. A finite run need not visit all channels.

Applying independent updates in another order commutes up to event-id relabeling when the same number of updates is made on each channel. A fixed total event budget under different schedulers need not select the same channel counts or frontier. Its depth and phase statistics can therefore differ without indicating a conflict in the local rule.

Stop after the configured number of rollout events. Birth is stored separately and adds one event to the observer timeline. Bounds: `4 ≤ N ≤ 2048`, `0 ≤ events ≤ 200000`, `2 ≤ K ≤ 4096`, and an unsigned 32-bit seed. Counts and dependencies are integers; diagnostic phases and weights use 64-bit floats. No coarse-graining occurs in the engine.

## Observer mapping: fibonacci-depth-v0.1

For channel i, use `y_i = 1 - 2(i+1/2)/N`, azimuth `iπ(3-√5)`, and the corresponding unit-sphere vector. This approximates isotropic angular sampling; it does not discover dimensionality. Equal-area latitude bands do not make the finite point set perfectly rotationally invariant.

Display radius is local depth divided by the completed run's maximum depth (or 1 for a birth-only run), followed by camera projection. The final-depth reference keeps a fixed scale during replay. Faint globe curves are observer guides. Changing the budget changes this display normalization; compare numerical depths rather than pixel radii between runs.

Spatial rendering samples historical points to roughly 9,000, plus channel frontiers and guide lines. Causal view shows a subset of channels and recent states with dashed omissions. Export always retains the full history. Neither sampling nor camera state feeds back into evolution.

## Observables and rejection checks

At a selected replay frontier, report maximum depth, `std(depth)/mean(depth)` (displayed as 0 for the all-zero convention), frontier weight, and `|Σ exp(i phase_i)|/N`. The last quantity is a descriptive circular phase statistic, not an amplitude norm or a measured quantum coherence.

Reject implementation output if a transition consumes a stale frontier, loses its parent, violates local phase/weight rules, or disagrees with a replayed summary. Check independent-event reordering and repeated seeds. Scheduling controls expose which apparent structure is imposed by the selected frontier.

There is no current rule for branching, absorption, reconnection, source depletion, nodules forming, matter stability, wavefunctions, or a physical metric. Those require separately versioned proposals; increasing this model's event count alone does not supply them.
