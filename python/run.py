#!/usr/bin/env python3
"""Generate and independently verify a reproducible experiment artifact."""

import argparse
import json
from pathlib import Path
from tef_emulator import RunConfig, build_engine, run_experiment, verify_run


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--channels", type=int, default=256)
    parser.add_argument("--events", type=int, default=32768)
    parser.add_argument("--phase-steps", type=int, default=32)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--scheduler", choices=["balanced", "seeded"], default="balanced")
    parser.add_argument("--output", type=Path, default=Path("runs/single-source.json"))
    parser.add_argument("--verify", type=Path, help="Verify a saved artifact instead of generating one")
    args = parser.parse_args()
    if args.verify:
        print(json.dumps(verify_run(json.loads(args.verify.read_text())), indent=2))
        return
    config = RunConfig(args.channels, args.events, args.phase_steps, args.seed, args.scheduler)
    config.validate()
    build_engine()
    data = run_experiment(config)
    report = verify_run(data)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(data, separators=(",", ":")) + "\n")
    print(json.dumps({"output": str(args.output), **report}, indent=2))


if __name__ == "__main__":
    main()
