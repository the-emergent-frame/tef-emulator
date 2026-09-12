"""Batched subprocess bridge; a future native binding can preserve this API."""

from dataclasses import asdict, dataclass
from datetime import datetime, timezone
import hashlib
import json
import math
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
BINARY = ROOT / "target" / "release" / ("tef-run.exe" if sys.platform == "win32" else "tef-run")


@dataclass(frozen=True)
class RunConfig:
    channels: int = 256
    events: int = 32768
    phase_steps: int = 32
    seed: int = 42
    scheduler: str = "balanced"

    def validate(self):
        for name, low, high in (
            ("channels", 4, 2048), ("events", 0, 200000),
            ("phase_steps", 2, 4096), ("seed", 0, 2**32 - 1),
        ):
            value = getattr(self, name)
            if type(value) is not int or not low <= value <= high:
                raise ValueError(f"{name} must be an integer between {low} and {high}")
        if self.scheduler not in ("balanced", "seeded"):
            raise ValueError("scheduler must be balanced or seeded")


def build_engine():
    subprocess.run(
        ["cargo", "build", "--release", "--offline", "--manifest-path", str(ROOT / "Cargo.toml"),
         "--target-dir", str(ROOT / "target")], cwd=ROOT, check=True,
    )


def provenance():
    digest = hashlib.sha256()
    paths = [ROOT / "Cargo.toml", ROOT / "Cargo.lock"] + sorted((ROOT / "crates").rglob("*.rs")) + sorted((ROOT / "crates").rglob("Cargo.toml"))
    for path in paths:
        digest.update(str(path.relative_to(ROOT)).encode())
        digest.update(b"\0")
        digest.update(path.read_bytes())
    try:
        revision = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, stderr=subprocess.DEVNULL, text=True).strip()
    except (OSError, subprocess.CalledProcessError):
        revision = None
    return {
        "git_revision": revision,
        "engine_source_sha256": digest.hexdigest(),
        "engine_binary_sha256": hashlib.sha256(BINARY.read_bytes()).hexdigest(),
        "recorded_at_utc": datetime.now(timezone.utc).isoformat(),
        "note": "Wall-clock metadata only; not model time. Source digest identifies working-tree engine inputs.",
    }


def run_experiment(config=RunConfig()):
    config.validate()
    if not BINARY.exists():
        raise RuntimeError("Engine is not built. Run python3 python/serve.py or call build_engine().")
    args = [str(BINARY)]
    for key, value in asdict(config).items():
        args.extend(["--" + key.replace("_", "-"), str(value)])
    result = subprocess.run(args, cwd=ROOT, capture_output=True, text=True, check=True, timeout=30)
    data = json.loads(result.stdout)
    data["provenance"] = provenance()
    return data


def verify_run(data):
    """Independently check exported causal transitions and final weight accounting."""
    if data.get("schema_version") != 1 or data.get("rule") != "source-channels-v0.1":
        raise ValueError("Unsupported run schema or rule")
    config = RunConfig(**data["config"])
    config.validate()
    if data.get("birth") != {"id": 0, "kind": "source_birth", "weight": 1.0}:
        raise ValueError("Invalid source birth")
    if len(data["events"]) != config.events:
        raise ValueError("Event count mismatch")
    parents = [0] * config.channels
    depths = [0] * config.channels
    for expected_id, event in enumerate(data["events"], 1):
        channel = event["channel"]
        if type(channel) is not int or not 0 <= channel < config.channels:
            raise ValueError(f"Invalid channel at event {expected_id}")
        if event["id"] != expected_id or event["parent"] != parents[channel] or event["depth"] != depths[channel] + 1:
            raise ValueError(f"Invalid causal transition at event {expected_id}")
        phase = event["depth"] % config.phase_steps * math.tau / config.phase_steps
        if not math.isclose(event["phase"], phase, rel_tol=1e-12, abs_tol=1e-12):
            raise ValueError(f"Invalid phase at event {expected_id}")
        if not math.isclose(event["weight"], 1 / config.channels, rel_tol=1e-12, abs_tol=1e-12):
            raise ValueError(f"Invalid transfer weight at event {expected_id}")
        parents[channel], depths[channel] = expected_id, event["depth"]
    summary = data["summary"]
    if (summary["source_count"], summary["rollout_events"], summary["frontier_states"], summary["max_depth"]) != (1, config.events, config.channels, max(depths)):
        raise ValueError("Summary does not match replay")
    weight = math.fsum([1 / config.channels] * config.channels)
    if not math.isclose(summary["frontier_weight"], weight, abs_tol=1e-12):
        raise ValueError("Frontier weight mismatch")
    return {"verified": True, "events": config.events, "frontier_weight": weight, "max_depth": max(depths)}
