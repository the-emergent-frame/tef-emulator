import copy
import json
import unittest
from tef_emulator import RunConfig, build_engine, run_experiment, verify_run


class ExperimentTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        build_engine()

    def test_export_roundtrip_and_independent_verification(self):
        for scheduler in ("balanced", "seeded"):
            with self.subTest(scheduler=scheduler):
                data = run_experiment(RunConfig(channels=17, events=111, scheduler=scheduler))
                self.assertTrue(verify_run(json.loads(json.dumps(data)))["verified"])
                self.assertIn("engine_source_sha256", data["provenance"])

    def test_birth_without_rollout(self):
        self.assertEqual(verify_run(run_experiment(RunConfig(events=0)))["max_depth"], 0)

    def test_corrupt_or_double_consumed_state_rejected(self):
        data = run_experiment(RunConfig(channels=4, events=12))
        for key, value in (("parent", 0), ("weight", 0.5), ("phase", 0.123)):
            with self.subTest(key=key):
                changed = copy.deepcopy(data)
                changed["events"][8][key] = value
                with self.assertRaises(ValueError):
                    verify_run(changed)

    def test_invalid_web_config_never_reaches_engine(self):
        for config in (RunConfig(events=-1), RunConfig(channels=True), RunConfig(seed=2**32), RunConfig(scheduler="other")):
            with self.assertRaises(ValueError):
                run_experiment(config)

    def test_seeded_reproducibility(self):
        config = RunConfig(channels=19, events=100, scheduler="seeded", seed=0)
        self.assertEqual(run_experiment(config)["events"], run_experiment(config)["events"])


if __name__ == "__main__":
    unittest.main()
