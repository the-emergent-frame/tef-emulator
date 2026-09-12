# TEF Emulator working instructions

## Working scope

- Work from this repository directory. Sibling TEF repositories contain research context and should be treated as read-only unless the task explicitly includes changes there.
- The current task is establishing an experimental emulator. Internal matter topology is deferred; a replaceable source-boundary model is the initial direction.
- Read `README.md` and `docs/architecture.md` before changing the engine architecture.

## Research discipline

- Distinguish inherited paper assumptions, newly proposed rules, numerical approximations, and measured outcomes.
- Do not present energy scales or length ratios as derived event counts. Keep transfer bookkeeping, energy, probability, and amplitude norm distinct.
- Computational event indices and visualization coordinates are not physical time or distance unless an explicit model defines that interpretation.
- State whether quantum amplitudes and composition laws are inputs or claimed outputs of an experiment.
- Record model changes and negative results. Do not silently retune a rule against its comparison target.

## Implementation direction

- Use Rust for the core and Python for experiments and analysis. Bindings, graph storage, and the viewer should remain separable from model rules.
- Begin with a reproducible CPU reference. Introduce parallelism and coarse-graining with appropriate comparisons to the reference.
- Keep large generated histories, local environments, credentials, and visualization recordings out of Git.
- Run checks appropriate to changed executable components once those exist. Documentation-only setup does not require fabricated engine tests.
