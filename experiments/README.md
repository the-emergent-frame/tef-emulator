# Reproducible experiments

Experiment 0001 is runnable with the first candidate channel rule. Reference scheduling controls are documented with the experiment.

## Experiments

- [0001: Single-source spacetime rollout](0001-single-source-rollout/README.md): begin at a supplied source-birth boundary and study rollout with intrinsic-untwisted and radial observer representations motivated by Paper VIII v3.12. Source formation and internal matter topology are deferred.

## Reproduction records

An experiment should pin its rule version, engine revision, configuration, initial conditions, scheduler, seed, precision, and stopping condition. State its observables and controls before interpreting its results.

Keep small reference fixtures here. Write generated runs to the repository-root `runs/` directory, which is ignored by Git. Publish large results separately with a manifest and checksums.


## Proposed next experiment (not implemented)

**0002 — Intrinsic Rollout Adjacency:** study an explicit transverse relational
complex K_perp, transported depth sections, intrinsic distances, and ball-volume
growth, separately from observer placement. See the [architecture roadmap](../docs/architecture.md#deferred-research-directions)
for this and the later, also unimplemented diffusion direction.
