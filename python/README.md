# Python experiments and analysis

Python 3.10+ and its standard library are sufficient. From the repository root:

```sh
python3 python/serve.py
python3 python/run.py --scheduler seeded --output runs/seeded.json
python3 python/run.py --verify runs/seeded.json
python3 python/compare.py
```

For scripts, set `PYTHONPATH=python` and import `RunConfig`, `build_engine`, `run_experiment`, and `verify_run` from `tef_emulator`. Build once before a parameter sweep. Runs cross a subprocess boundary in batches; there are no Python callbacks per event. PyO3 can replace this bridge later.

The server binds to 127.0.0.1, serves a fixed asset list, and accepts bounded JSON configurations at `POST /api/run`. The endpoint returns the complete artifact. One generation request runs at a time; overlapping requests receive 409. A child engine run has a 30-second timeout.

Verification checks transition validity, counts, local phase, weight, and the final summary. It does not authenticate provenance or regenerate the scheduler from its seed. An imported history can be valid under the local transition law while carrying incorrect provenance; compare a fresh engine run when verifying reproducibility claims.

`POST /api/export` independently verifies a run before saving it under a unique filename in `runs/`. This local export path works in embedded browsers without download support. The request is limited to 50 MB; no caller-supplied destination path is accepted.
