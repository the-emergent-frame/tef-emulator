# Experiment 0001: Single-source spacetime rollout

Status: runnable reference, 2026-09-13. The [source-channels-v0.1 rule](../../rules/source-channels-v0.1/README.md) implements one candidate scaffold beneath this research specification.

## Research question

Starting from the formation of one persistent source, how can a sequence of local structural updates support an observable description of continuing, isotropic three-dimensional spacetime rollout?

The motivating picture is a persistent knot or nodule forming in a pre-geometric "energy soup" and becoming a source of spacetime rollout. The precursor has no assumed volume, direction, density per spatial volume, or background coordinate time. The soup is a provisional metaphor for an unspecified precursor state.

## Initial boundary and hydrogen interpretation

For the first implementation, source formation is a supplied initial condition: a `source_birth` record introduces one persistent source boundary. It does not simulate or explain the formation process. A future precursor model may produce this same boundary through an explicit stabilization rule.

The source is provisionally associated with a hydrogen atom for interpretation. No proton, electron, orbital, atomic radius, charge dynamics, or hydrogen mass is implemented by assigning that label. The detailed identification of a composite atom with rollout-source structure remains a later model question.

The source persists while its boundary state can change. It is not consumed simply because a new rollout event occurs. Whether transfer depletes any source quantity, and how repeated rollout is sustained, are explicitly unresolved.

## Observer convention

The experiment adopts a source-centered, isotropic three-dimensional observer representation as an input convention. The lack of a pre-existing direction or volume motivates this choice but does not mathematically imply a unique dimension or metric.

In the viewer, the source may be placed at the origin and rollout drawn as expansion or emission around it. These coordinates exist in the observer representation; they are not an empty container supplied to the pre-rollout model.

Here "uniform" means no preferred angular direction in the adopted representation. Equal-solid-angle sampling can approximate that convention. It does not impose uniform density per spatial volume, an inverse-square transfer law, an expansion speed, or a radial growth law.

Isotropy and three-dimensional display therefore cannot be counted as discoveries of this experiment. Their numerical implementation can be checked. Other properties of the event structure and its observables may still be research outputs.

## Two complementary records

The causal record contains source-state versions, newly available structural states, connections, local rule applications, and their dependencies. It has no primitive global position or timestamp measured in seconds.

The observer record maps a selected part of that history into a three-dimensional display. Any mapping from causal depth or source cycles to display radius must be named and versioned. Changing display layout must not change the causal record or transfer bookkeeping.

An outward-looking animation alone establishes no physical growth law. A graph that branches outward also does not automatically have three-dimensional spatial geometry. Establishing a physical distance or dimension requires an operational construction and tests beyond the display convention.

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

This reference does not yet measure angular quadrature error, define a physical density, or infer a dimension from graph structure. It provides a reproducible baseline against which future interaction and transfer rules can be compared.
