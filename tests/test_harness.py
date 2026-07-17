from __future__ import annotations

from copy import deepcopy
import json
from pathlib import Path
import tempfile
import unittest

from trust_receipt.cli import main
from trust_receipt.engine import assess_conformance, evaluate_gate
from trust_receipt.integrity import verify_digest
from trust_receipt.pipeline import create_receipt
from trust_receipt.renderer import render_receipt
from trust_receipt.validation import load_json, validate


ROOT = Path(__file__).resolve().parents[1]


class TrustReceiptHarnessTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.request = load_json(ROOT / "fixtures/action-request.valid.json")
        cls.grant = load_json(ROOT / "fixtures/authority-grant.valid.json")
        cls.evidence = load_json(ROOT / "fixtures/material-evidence.valid.json")
        cls.profile = load_json(ROOT / "profiles/conformance-profile.v0.1.json")

    def test_reference_inputs_match_schemas(self) -> None:
        pairs = [
            (self.request, "action-request.schema.json"),
            (self.grant, "authority-grant.schema.json"),
            (self.evidence, "material-evidence.schema.json"),
        ]
        for instance, schema_name in pairs:
            with self.subTest(schema=schema_name):
                schema = load_json(ROOT / "schemas" / schema_name)
                self.assertEqual([], validate(instance, schema))

    def test_valid_pre_execution_gate_allows(self) -> None:
        decision = evaluate_gate(self.request, self.grant, self.evidence)
        self.assertTrue(decision.allowed)
        self.assertEqual((), decision.failures)

    def test_out_of_scope_target_fails_closed(self) -> None:
        request = deepcopy(self.request)
        request["action"]["target"] = "account:someone-else"
        decision = evaluate_gate(request, self.grant, self.evidence)
        self.assertFalse(decision.allowed)
        self.assertIn("TARGET_OUT_OF_SCOPE", {item.code for item in decision.failures})

    def test_stale_required_evidence_fails_closed(self) -> None:
        evidence = deepcopy(self.evidence)
        evidence["items"][0]["freshness"] = "stale"
        decision = evaluate_gate(self.request, self.grant, evidence)
        self.assertFalse(decision.allowed)
        self.assertIn("REQUIRED_EVIDENCE_NOT_CURRENT", {item.code for item in decision.failures})

    def test_unavailable_remedy_blocks_c2(self) -> None:
        evidence = deepcopy(self.evidence)
        evidence["remedy_service_available"] = False
        decision = evaluate_gate(self.request, self.grant, evidence)
        self.assertFalse(decision.allowed)
        self.assertIn("REMEDY_SERVICE_UNAVAILABLE", {item.code for item in decision.failures})

    def test_receipt_is_schema_valid_and_human_projection_matches(self) -> None:
        receipt, decision = create_receipt(
            self.request,
            self.grant,
            self.evidence,
            created_at="2026-07-15T14:30:01Z",
        )
        schema = load_json(ROOT / "schemas/trust-receipt.schema.json")
        self.assertTrue(decision.allowed)
        self.assertEqual([], validate(receipt, schema))
        self.assertTrue(verify_digest(receipt))
        rendered = render_receipt(receipt)
        self.assertIn(receipt["receipt_id"], rendered)
        self.assertIn(receipt["action"]["status"], rendered)
        self.assertIn(receipt["integrity"]["digest"], rendered)

    def test_denied_receipt_records_no_state_change(self) -> None:
        request = deepcopy(self.request)
        request["action"]["type"] = "account.access.disable"
        receipt, decision = create_receipt(
            request,
            self.grant,
            self.evidence,
            created_at="2026-07-15T14:30:01Z",
        )
        self.assertFalse(decision.allowed)
        self.assertEqual("denied", receipt["action"]["status"])
        self.assertEqual(receipt["action"]["before_state"], receipt["action"]["after_state"])
        self.assertEqual("ACTION_OUT_OF_SCOPE", receipt["action"]["exception_code"])
        self.assertTrue(verify_digest(receipt))

    def test_tampering_invalidates_digest(self) -> None:
        receipt, _ = create_receipt(
            self.request,
            self.grant,
            self.evidence,
            created_at="2026-07-15T14:30:01Z",
        )
        receipt["action"]["status"] = "reversed"
        self.assertFalse(verify_digest(receipt))

    def test_verification_status_is_integrity_protected(self) -> None:
        receipt, _ = create_receipt(
            self.request,
            self.grant,
            self.evidence,
            created_at="2026-07-15T14:30:01Z",
        )
        receipt["integrity"]["verification_status"] = "verified"
        self.assertFalse(verify_digest(receipt))

    def test_all_conformance_vectors_match(self) -> None:
        fixture = load_json(ROOT / "fixtures/conformance-cases.json")
        for case in fixture["cases"]:
            results = []
            for requirement in self.profile["requirements"]:
                requirement_id = requirement["id"]
                results.append(
                    {
                        "requirement_id": requirement_id,
                        "result": case["results"].get(requirement_id, case.get("default_result", "pass")),
                        "evidence_available": case.get("evidence_available", {}).get(requirement_id, True),
                        "evidence_references": [],
                        "gaps": [],
                    }
                )
            decision = assess_conformance(results, case["consequence_class"], self.profile)
            with self.subTest(case=case["case_id"]):
                self.assertEqual(case["expected"]["overall_decision"], decision["overall_decision"])
                self.assertEqual(case["expected"]["execution_mode"], decision["execution_mode"])

    def test_cli_generates_and_verifies_receipt(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary) / "receipt.json"
            human = Path(temporary) / "receipt.txt"
            status = main(
                [
                    "receipt",
                    "create",
                    "--request", str(ROOT / "fixtures/action-request.valid.json"),
                    "--grant", str(ROOT / "fixtures/authority-grant.valid.json"),
                    "--evidence", str(ROOT / "fixtures/material-evidence.valid.json"),
                    "--created-at", "2026-07-15T14:30:01Z",
                    "--output", str(output),
                    "--human-output", str(human),
                ]
            )
            self.assertEqual(0, status)
            self.assertTrue(output.exists())
            self.assertTrue(human.exists())
            self.assertEqual(0, main(["receipt", "verify", "--receipt", str(output)]))


if __name__ == "__main__":
    unittest.main()
