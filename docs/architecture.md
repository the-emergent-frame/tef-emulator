# Initial architecture baseline

Status: CPU reference implemented, 2026-09-13. Experiment 0001 executes the candidate `source-channels-v0.1` scaffold; physical transfer laws remain open.

## Purpose

Build a computational laboratory for candidate TEF rules. Start with a single replaceable source boundary and the open structure associated with it. Defer the internal construction of persistent matter closures.

The intended first investigations concern structural growth, candidate source-to-structure transfer, propagation, phase correlations, and the behavior of coarse-grained observables.

[Experiment 0001](../experiments/0001-single-source-rollout/README.md) specializes this direction to a supplied source-birth boundary with a hydrogen interpretation and parallel and radial expanding observer representations. The observer convention is an explicit input; pre-rollout volume and direction are not assumed. Internal source formation and physical transfer rules remain to be specified.

## Computational objects

| Object | Intended role | Interpretation boundary |
| --- | --- | --- |
| Local state | Typed structural data, connections, and model-specific quantities | A computational record is not automatically an atom of physical space |
| Event | A local rewrite with explicit inputs, outputs, and dependencies | Execution index is not physical time |
| Active state boundary | Valid state versions available for further events | A scheduling frontier is not a preferred physical simultaneity surface |
| Causal history | Dependencies between events that produce and use state versions | A causal partial order alone does not establish a spacetime metric |
| Source boundary | Replaceable output, input, and feedback rules | No internal matter topology or energy reservoir is derived by introducing this interface |
| Observer | Measurement and coarse-graining of model records | Display coordinates and animation speed do not feed back into evolution |

## Events and states

Maintain states and events together. Events consume or inspect specified state versions and produce new versions. The engine records the rule and local match that permitted each event.

Events whose inputs are unavailable cannot execute. Events that compete for the same consumed state require an explicit selection rule. Independent, non-conflicting events should be checked for the model's intended equivalence under reordered execution.

A single stored execution is one history. Probabilistic history sampling and coherent amplitude evolution are separate modeling choices; retaining multiple histories does not itself establish quantum superposition.

The reference makes balanced and seeded scheduling, local choices, and replay explicit. GPU work and parallel event application follow profiling and reference comparisons.

## Engine and experiment layers

Rust owns the core state representation, rule application, dependency tracking, and replay. Python configures experiments and analyzes results. The current interface uses one subprocess call per run and JSON records. PyO3 and maturin remain candidates for native integration.

The reference stores independent channels in vectors. Introduce general graph storage such as petgraph when topology-changing rules require it. If rules require hyperedges, preserve their incidence structure and port ordering explicitly. Do not identify a hypergraph with an ordinary pairwise graph without recording the encoding.

The implemented observer uses JavaScript/Canvas after a disposable `ObserverMapping` layer with parallel and radial expanding implementations. Observer parameters are exported separately and never written into causal state. Rerun remains an integration candidate; its sequence indices can represent execution records. Physical clocks, if later defined, are separately named model observables.

## Source model

The source is an explicitly assumed boundary condition. A candidate model must define its internal labels, permitted output and absorption events, feedback, and transfer bookkeeping. It must state whether repeated output changes the source or depends on an external supply.

There is no default rule that injects energy per unit of global simulation time. Transfer amounts, rates relative to a local clock, and any conservation law must be specified by a candidate model.

## Scale and energy bookkeeping

Paper VII's global rollout scale, approximately 2.13e19 GeV, is not established as a locally extractable energy reservoir. Paper VI's approximately 3.54e19 ratio between one femtometre and the one-turn rollout length is a length ratio, not a derived microscopic object count.

Keep source bookkeeping, excitation energy, event multiplicity, probability weights, and amplitude norms separately named and dimensioned. A proposed conversion between them belongs in the rule record.

Use explicit reference scales and track residual quantities separately where necessary. Nondimensionalization does not by itself eliminate cancellation or loss of precision across extreme hierarchies.

## Scale-up strategy

Start with small histories that can be inspected and replayed exactly at the discrete structural level. Introduce compression, aggregation, or coarse-graining only with a stated preservation target and error assessment.

A coarse-grained model must be checked against a smaller reference computation. Preserving total transfer weight need not preserve phase correlations, interference, or topology. Tensor networks are an option for suitable amplitude models, not a guarantee of tractability for arbitrary states.

Keep small reference fixtures in Git. Large event logs, checkpoints, and recordings belong outside the source repository and should carry configuration manifests and checksums when shared.

## Implementation milestones

1. Completed: minimal state schema and [candidate source-channel rule](../rules/source-channels-v0.1/README.md).
2. Completed: Rust reference rewrite engine and causal event records.
3. Completed: replay, bookkeeping checks, and independent-event ordering tests.
4. Completed: Python experiment API and interactive English observer.
5. Compare candidate transfer and phase rules with controls at increasing sizes.
6. Introduce a validated coarse-graining method for a specific observable.

Stable matter, physical spacetime geometry, and quantum behavior are research targets, not completed features of this baseline.

## Reference implementations

- [SetReplace](https://github.com/WolframInstitute/SetReplace): set and hypergraph rewriting, events, and causal histories.
- [AlgebraicRewriting.jl](https://github.com/AlgebraicJulia/AlgebraicRewriting.jl): formal structural rewriting methods.
- [petgraph](https://docs.rs/petgraph/latest/petgraph/): Rust graph structures and algorithms.
- [PyO3](https://pyo3.rs/): Rust/Python integration.
- [Rerun](https://rerun.io/docs): observation and visualization.
- [quimb](https://quimb.readthedocs.io/): quantum operators and tensor-network experiments.

These projects provide engineering or mathematical references. Their inclusion does not adopt their physical assumptions or imply that their code has been incorporated.
