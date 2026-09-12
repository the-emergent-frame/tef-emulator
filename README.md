# TEF Emulator

An experimental, event-driven emulator for exploring spacetime rollout and emergent phenomena in **The Emergent Frame**.

TEF Emulator is a computational research project: specify local rules, evolve their consequences, and measure what emerges. The aim is to make candidate TEF constructions executable, reproducible, and open to independent examination.

**Status:** repository and architecture setup. There is no runnable engine or implemented physical model yet.

## Initial scope

The first planned experiment uses a replaceable source boundary to study open-structure growth, transfer, propagation, and coarse-graining. The internal topology of matter is deferred.

The proposed computational model combines local state rewriting with an event dependency graph. Execution order is bookkeeping; physical time and spatial distance must be defined and tested separately. Candidate transfer laws, phase dynamics, and coarse-graining schemes will be recorded explicitly as modeling assumptions.

## Engineering direction

- **Rust:** simulation core, structural updates, causal dependencies, and replay.
- **Python:** experiment configuration, numerical analysis, and parameter studies.
- **PyO3 + maturin:** Python bindings when the Rust core is introduced.
- **petgraph:** initial graph storage and algorithms, behind a replaceable storage interface.
- **Rerun:** observation and visualization, independent of physical evolution.

The first implementation will establish a CPU reference before adding parallel or accelerator backends.

## Repository layout

```text
crates/         Rust engine and bindings
python/         Experiment interface and analysis
rules/          Candidate rules and assumption records
experiments/    Reproducible experiment definitions and small reference results
viewer/         Observation and visualization
docs/           Architecture and research methodology
```

See the [architecture baseline](docs/architecture.md) and [contribution guide](CONTRIBUTING.md). These directories currently contain scope notes, not software packages.

## Research context

[The Emergent Frame](https://theemergentframe.org) maintains the research context. The [research release repository](https://github.com/the-emergent-frame/research-releases) contains the archived paper sources and numerical checks.

A simulation result establishes a consequence of its specified rules. Connecting that result to physical phenomena requires additional evidence. In particular, neither a large energy scale nor a large number of events establishes quantum behavior by itself.

## License

Software and original documentation in this repository are licensed under the [MIT License](LICENSE). Referenced papers and third-party projects retain their own licenses.
