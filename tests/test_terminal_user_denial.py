from __future__ import annotations

from copy import deepcopy
from pathlib import Path
import unittest

from trust_receipt.engine import evaluate_gate
from trust_receipt.validation import load_json


ROOT = Path(__file__).resolve().parents[1]


class TerminalUserDenialTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.request = load_json(ROOT / "fixtures/action-request.valid.json")
        cls.grant = load_json(ROOT / "fixtures/authority-grant.valid.json")
        cls.evidence = load_json(ROOT / "fixtures/material-evidence.valid.json")

    def test_explicit_denial_is_terminal_even_with_approved_review(self) -> None:
        request = deepcopy(self.request)
        request["confirmation"] = {"status": "denied"}
        request["human_review"]["status"] = "approved"

        decision = evaluate_gate(request, self.grant, self.evidence)

        self.assertFalse(decision.allowed)
        codes = [failure.code for failure in decision.failures]
        self.assertIn("USER_AUTHORIZATION_DENIED", codes)
        self.assertNotIn("HUMAN_REVIEW_REQUIRED", codes)

    def test_persistent_affected_c2_requires_positive_confirmation_and_review(self) -> None:
        request = deepcopy(self.request)
        request["confirmation"] = {"status": "pending"}
        request["human_review"]["status"] = "approved"

        decision = evaluate_gate(request, self.grant, self.evidence)

        self.assertFalse(decision.allowed)
        codes = [failure.code for failure in decision.failures]
        self.assertIn("CONFIRMATION_REQUIRED", codes)
        self.assertNotIn("HUMAN_REVIEW_REQUIRED", codes)


if __name__ == "__main__":
    unittest.main()
