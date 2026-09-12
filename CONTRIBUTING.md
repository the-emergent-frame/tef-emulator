# Contributing

TEF Emulator welcomes discussion of executable rules, reproducible experiments, numerical methods, and implementation improvements.

The repository is currently at the architecture stage. No runtime API or physical rule set is stable yet.

## Proposing a model or experiment

Describe the question, local state, admissible transitions, and observables. Identify which assumptions come from a specific TEF paper version and which are new proposals. Specify scheduling choices, boundary conditions, and any intended conservation or normalization properties.

Explain what would count as a negative result and which control would distinguish the proposed mechanism from a generic artifact of the implementation.

## Reproducibility

An executable experiment should record the engine commit, rule version, configuration, initial state or generator, random seed, scheduler, numerical precision, and stopping condition. Record approximation settings and relevant hardware or backend details when they affect the result.

Keep small reference results in the repository. Store large datasets and recordings in an external archive or release attachment with a manifest and checksum.

## Pull requests

Explain the problem, the resulting behavior, and relevant validation. Keep changes focused. Tests should check meaningful invariants or observables rather than reproduce the implementation.

New third-party code must include its license and provenance. Original contributions are made under the repository's MIT License.
