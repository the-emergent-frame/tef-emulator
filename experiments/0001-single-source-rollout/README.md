# Experiment 0001: Single-source spacetime rollout

Status: runnable reference, 2026-09-13. The [source-channels-v0.1 rule](../../rules/source-channels-v0.1/README.md) implements one candidate scaffold beneath this research specification.

## Research question

Starting from the formation of one persistent source, how can a sequence of local structural updates support an observable description of continuing, isotropic three-dimensional spacetime rollout?

The motivating picture is a persistent knot or nodule forming in a pre-geometric "energy soup" and becoming a source of spacetime rollout. The precursor has no assumed volume, direction, density per spatial volume, or background coordinate time. The soup is a provisional metaphor for an unspecified precursor state.

## Initial boundary and hydrogen interpretation

For the first implementation, source formation is a supplied initial condition: a `source_birth` record introduces one persistent source boundary. It does not simulate or explain the formation process. A future precursor model may produce this same boundary through an explicit stabilization rule.

The source is provisionally associated with a hydrogen atom for interpretation. No proton, electron, orbital, atomic radius, charge dynamics, or hydrogen mass is implemented by assigning that label. The detailed identification of a composite atom with rollout-source structure remains a later model question.

The source persists while its boundary state can change. It is not consumed simply because a new rollout event occurs. Whether transfer depletes any source quantity, and how repeated rollout is sustained, are explicitly unresolved.

## Theory reference

Wu, X. (2026). *Spacetime as Source-Local Rollout and the Conditional Emergence
of Three-Dimensional Effective Geometry in The Emergent Frame* (Version 3.12).
Zenodo. https://doi.org/10.5281/zenodo.22776137

This is the canonical conceptual reference for this observer revision. The
paper supplies a conditional mathematical framework; Experiment 0001 visualizes
source-local rollout and its alternative observer representations. It does
not numerically implement or validate the full construction.

In **Exact product theorem** (`eq:product`), incidence- and measure-preserving
transported copies of a transverse relational complex can be intrinsically
untwisted into `K ≅ Z_cell × K_perp`. **Cubic volume growth** (`eq:df3`) obtains
`d_f=3` under the stated uniform quadratic transverse-growth assumption and
controlled longitudinal scales. The two-dimensional transverse growth class is
an explicit structural hypothesis, not deduced from a helix's normal plane.
The full Z factor idealizes homogeneous bulk; this finite, one-sided emulator
history is not that infinite complex. The paper distinguishes spatial depth m
from physical evolution time t; our execution index must not be identified
with either a measured physical time or a derived physical distance.

## Observer convention and relational layer

Four levels remain separate:

```text
source / causal record
    → intrinsic relational representation (sourceId, depth, trajectoryLabel)
    → observer mapping
    → camera projection and rendering
```

The lightweight relational adapter identifies existing states and their causal
parents, with no Euclidean coordinates. Transverse relations are explicitly
unspecified. There is no K_perp adjacency, transport map, cell measure, or
intrinsic distance implementation in Experiment 0001.

**Intrinsic Untwisted** (`intrinsic-untwisted`, default) schematically represents
rollout depth × transverse organization with fixed transverse observer offsets
and parallel axes. This is a depiction motivated by intrinsic relabeling, not a
claim of physical parallel helices in Cartesian space. Retained helical phase
and handedness are compatible with untwisting not erasing connection data.

**Radial Observer** (`radial-observer`) retains the intuitive source-centered
Euclidean embedding with Fibonacci directions. It is not intrinsic metric
reconstruction. The display spine radius is constant with depth; the previous
expanding envelope is removed. A screen-space **Display thickness** control
changes only stroke width. Both views preserve the same causal state and are
alternative observer mappings, not competing TEF models.

### Helices, transverse relations, and apparent sparsity

A spacetime helix in the emulator should not be read as an isolated
one-dimensional filament embedded in pre-existing three-dimensional space.
The rendered helix is an observer representation of source-local rollout
structure. Centerlines are provisional rollout generators, trajectory
representatives, or phase spines; they need not represent the complete local
spatial volume.

A finite set of radial axes spreads over Euclidean shells with observer area
`4πr²`. Apparent dilution is an embedding artifact, not a TEF prediction that
intrinsic space density falls as `1/r²`. Visual gaps between spines do not
measure physical density. Constant parallel spacing also does not prove an
intrinsic spatial dimension.

Keep three transverse notions separate: the normal plane perpendicular to one
helix's local tangent; K_perp organizing relations among trajectory labels;
and the observer's Euclidean grid / drawing plane. In particular, K_perp is not
an observer XY plane. Our axis-orthogonal drawing basis is not generally the
Frenet normal basis of a helix and does not implement its intrinsic transport.

The [observer specification](../../viewer/README.md) records exact placement,
phase interpolation, fixed display radii, screen-space thickness, and sampling.
Physical helix R and q from the paper are not currently state fields. The
existing visual radius control and camera pitch must not be reinterpreted as
them. No metric, radial expansion law, branching, or lateral interaction has
been introduced by this revision.

## Event-level scaffold

The intended event interface, before selecting an actual physical rule, is:

```text
source_birth:
    supplied initial boundary -> persistent source state C_0

rollout_event:
    valid local input states -> updated source/interface states + new structural states

structural_update:
    valid connected structural states -> new versions and/or new connections
```

Each event must record its input versions, output versions, dependencies, rule identifier, and any model-specific transfer change. The source birth is the root of this experimental history, not a universal cosmological time origin.

Source-local cycle counts may become clock candidates. Execution order, causal depth, local phase, and physical elapsed time remain different quantities. Any relation among them must be supplied by a candidate model and checked.

A globally simultaneous shell update is not implied by the spherical viewer. Independent updates and competing updates require separate scheduling semantics. If a prototype batches events into shells, that is an additional algorithmic or modeling choice to record.

## Physical transfer and phase questions

1. What state quantity is transferred from the source boundary to open structure?
2. What rule changes that quantity and the source state at each admissible event?
3. What source-local condition permits another rollout event?
4. How do newly formed structural states connect, propagate, or interact?
5. What carries local phase, and how is phase compared between states?
6. Which quantity, if any, is conserved, and what is its relation to observable energy?

The Paper-VII rollout bookkeeping scale is not assigned as a hydrogen atom's releasable energy inventory. A proposed bridge to that scale must be a separately documented rule. Event multiplicity, transfer weight, excitation energy, probability, and amplitude norm remain distinct.

## First observables and controls

- Source persistence and consistency of source-state updates.
- Event counts, dependency depth, active boundary size, and connection statistics.
- Balance of any explicitly introduced transfer quantity, using that model's balance law.
- Phase correlations or coherence measures if a phase rule is introduced.
- Angular sampling error in the observer representation, reported as a numerical check of imposed isotropy.
- Dependence on event scheduling, angular display resolution, initial conditions, and any aggregation rule.

Use alternative fair schedules for non-conflicting events, where the model permits them. Rotate or replace the display mapping without changing the engine history. Compare small exact structural histories with any compressed approximation before interpreting scale-up results.

No density profile, propagation speed, wave equation, or cosmological expansion relation is a claimed result at this stage. A later experiment may define and test those observables once their physical measurement procedures exist.

## Implemented reference and next step

The first kernel supplies N independent channels, each with a normalized transport weight of 1/N, and a depth-based phase increment. A local update transfers a channel frontier to its next state while retaining historical structure and the persistent source. The fixed weight is diagnostic bookkeeping; it does not answer the physical transfer questions above.

Run `python3 python/serve.py` from the repository root to inspect the history, or `python3 python/compare.py` for the scheduling control. The browser supports stepping through source birth, reversible replay, spatial and causal views, and JSON export/import. No physical global clock is passed to the Rust core.

The next research step is to propose a physical source-to-structure transfer law, including its quantity, units, conservation statement, and source feedback. Formation of the precursor nodule remains a future module, preserving the same source-boundary interface.


## Reference scheduling control

Run `python3 python/compare.py` with 256 channels, 32,768 updates, 32 updates per phase turn, and seed 42:

| Scheduler | Depth range | Mean depth | Depth dispersion | Phase coherence | Frontier weight |
| --- | --- | --- | --- | --- | --- |
| Balanced | 128–128 | 128 | 0.000000 | 1.000000 | 1.000000 |
| Seeded | 93–158 | 128 | 0.086267 | 0.121441 | 1.000000 |

These measured reference values expose an algorithmic effect: balanced scheduling selects equal-depth frontiers, whereas random interleaving selects unequal depths and therefore different phases under the assumed phase rule. The phase coherence difference is not evidence of physical decoherence. At equal per-channel depths the local states agree, independent of interleaving; the Rust commutation test checks this property.

This reference does not yet measure angular quadrature error, define a physical density, or numerically test the paper's conditional relational dimension construction. It provides a reproducible baseline against which future interaction and transfer rules can be compared.


## Deferred experiment: intrinsic rollout adjacency

**Experiment 0002 — Intrinsic Rollout Adjacency** is a proposed next investigation:
explicit transverse adjacency on K_perp → transported sections along spatial
rollout depth → intrinsic graph/cell-complex distance → ball-volume growth
`|B(r)| ~ r³` (or the paper's weighted-measure counterpart).

It would test a specified relational construction and its assumptions, keeping
intrinsic distances separate from observer embeddings. No Experiment 0002 code,
transverse transport, or new adjacency is implemented in this revision.
