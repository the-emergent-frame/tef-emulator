#!/usr/bin/env python3
"""Compare frontiers selected by two schedules of the same local rule."""

import cmath
import json
import math
import statistics
from tef_emulator import RunConfig, build_engine, run_experiment, verify_run


def measurements(data):
    count = data["config"]["channels"]
    depths, phases = [0] * count, [0.0] * count
    for event in data["events"]:
        depths[event["channel"]] = event["depth"]
        phases[event["channel"]] = event["phase"]
    mean = statistics.mean(depths)
    return {
        "scheduler": data["config"]["scheduler"],
        "min_depth": min(depths), "max_depth": max(depths),
        "mean_depth": mean,
        "depth_dispersion": statistics.pstdev(depths) / mean if mean else 0.0,
        "phase_coherence": abs(sum(cmath.exp(1j * p) for p in phases)) / count,
        "frontier_weight": math.fsum([1 / count] * count),
    }


def main():
    build_engine()
    results = []
    for scheduler in ("balanced", "seeded"):
        data = run_experiment(RunConfig(scheduler=scheduler))
        verify_run(data)
        results.append(measurements(data))
    print(json.dumps({
        "rule": "source-channels-v0.1",
        "config": {"channels": 256, "events": 32768, "phase_steps": 32, "seed": 42},
        "interpretation": "Different schedules select different finite frontiers. This is not a physical dephasing or quantum result.",
        "results": results,
    }, indent=2))


if __name__ == "__main__":
    main()
