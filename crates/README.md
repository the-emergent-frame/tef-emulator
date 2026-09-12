# Rust components

`tef-core` is a dependency-free Rust 1.75+ library and CLI implementing the versioned independent-channel reference rule.

```sh
cargo run --release --offline --bin tef-run -- --channels 256 --events 32768 --scheduler seeded --seed 42
```

The CLI writes a complete JSON record to stdout. The library exposes local updates, scheduled runs, and replay checks. Integer event ids are history labels; phase and weight diagnostics are f64. Core storage has no display coordinates or physical timestamps.

Vectors suffice for the current independent chains. General graph storage and native Python bindings should be introduced when an experiment needs them.
