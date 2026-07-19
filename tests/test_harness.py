from __future__ import annotations

from copy import deepcopy
import json
from pathlib import Path
import tempfile
import unittest

from trust_receipt.cli import main
from trust_receipt.engine import assess_conformance, evaluate_gate
from trust_receipt.integrity import canonical_bytes, verify_digest
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

    def test_negative_schema_cases_are_rejected(self) -> None:
        action_schema = load_json(ROOT / "schemas/action-request.schema.json")
        request = deepcopy(self.request)
        request["unexpected"] = True
        self.assertIssue(request, action_schema, "additionalProperties")

        request = deepcopy(self.request)
        request["human_review"]["evidence_viewed"].append(
            request["human_review"]["evidence_viewed"][0]
        )
        self.assertIssue(request, action_schema, "uniqueItems")

        grant_schema = load_json(ROOT / "schemas/authority-grant.schema.json")
        grant = deepcopy(self.grant)
        grant["schema_version"] = "9.9"
        self.assertIssue(grant, grant_schema, "const")

        grant = deepcopy(self.grant)
        grant["scope"]["allowed_actions"].append(grant["scope"]["allowed_actions"][0])
        self.assertIssue(grant, grant_schema, "uniqueItems")

        evidence_schema = load_json(ROOT / "schemas/material-evidence.schema.json")
        evidence = deepcopy(self.evidence)
        evidence["items"][0]["observed_at"] = "2026-07-15 14:28:00"
        self.assertIssue(evidence, evidence_schema, "format")

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

    def test_expiration_boundary_fails_closed(self) -> None:
        request = deepcopy(self.request)
        request["requested_at"] = self.grant["expires_at"]
        decision = evaluate_gate(request, self.grant, self.evidence)
        self.assertFalse(decision.allowed)
        self.assertIn("GRANT_EXPIRED", {item.code for item in decision.failures})

    def test_required_confirmation_fails_closed(self) -> None:
        grant = deepcopy(self.grant)
        grant["confirmation"]["threshold"] = "user_confirmation"
        request = deepcopy(self.request)
        request["confirmation"] = {"status": "pending"}
        decision = evaluate_gate(request, grant, self.evidence)
        self.assertFalse(decision.allowed)
        self.assertIn("CONFIRMATION_REQUIRED", {item.code for item in decision.failures})

    def test_required_human_review_fails_closed(self) -> None:
        request = deepcopy(self.request)
        request["human_review"] = {"status": "pending"}
        decision = evaluate_gate(request, self.grant, self.evidence)
        self.assertFalse(decision.allowed)
        self.assertIn("HUMAN_REVIEW_REQUIRED", {item.code for item in decision.failures})

    def test_approved_review_requires_declared_evidence(self) -> None:
        request = deepcopy(self.request)
        request["human_review"].pop("evidence_viewed")
        decision = evaluate_gate(request, self.grant, self.evidence)
        self.assertFalse(decision.allowed)
        self.assertIn(
            "HUMAN_REVIEW_EVIDENCE_MISSING",
            {item.code for item in decision.failures},
        )

        request = deepcopy(self.request)
        request["human_review"]["evidence_viewed"] = ["evidence:not-in-set"]
        decision = evaluate_gate(request, self.grant, self.evidence)
        self.assertFalse(decision.allowed)
        codes = {item.code for item in decision.failures}
        self.assertIn("HUMAN_REVIEW_EVIDENCE_UNKNOWN", codes)
        self.assertIn("HUMAN_REVIEW_EVIDENCE_INCOMPLETE", codes)

    def test_unpermitted_delegation_fails_closed(self) -> None:
        request = deepcopy(self.request)
        request["delegation"][0]["recipient_id"] = "agent:unknown"
        decision = evaluate_gate(request, self.grant, self.evidence)
        self.assertFalse(decision.allowed)
        self.assertIn("DELEGATE_NOT_PERMITTED", {item.code for item in decision.failures})

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

    def test_unavailable_receipt_service_fails_closed(self) -> None:
        evidence = deepcopy(self.evidence)
        evidence["receipt_service_available"] = False
        decision = evaluate_gate(self.request, self.grant, evidence)
        self.assertFalse(decision.allowed)
        self.assertIn("RECEIPT_SERVICE_UNAVAILABLE", {item.code for item in decision.failures})

    def test_receipt_is_schema_valid_and_human_projection_matches(self) -> None:
        receipt, decision = create_receipt(
            self.request,
            self.grant,
            self.evidence,
            created_at="2026-07-15T14:30:01Z",
            base_uri="https://issuer.example",
        )
        schema = load_json(ROOT / "schemas/trust-receipt.schema.json")
        self.assertTrue(decision.allowed)
        self.assertEqual([], validate(receipt, schema))
        self.assertTrue(verify_digest(receipt))
        self.assertTrue(receipt["receipt_id"].startswith("urn:trust-receipt:request:preference-update:001:"))
        self.assertEqual(
            ["evidence:confirmation:001", "evidence:review:001"],
            receipt["human_review"]["evidence_viewed"],
        )
        self.assertFalse(receipt["consequence"]["protected_third_party_information"])
        self.assertTrue(receipt["remedy"]["reversible"])
        self.assertEqual(
            "https://issuer.example/trust-receipts/request:preference-update:001/remedy",
            receipt["remedy"]["status_uri"],
        )
        rendered = render_receipt(receipt)
        self.assertIn(receipt["receipt_id"], rendered)
        self.assertIn(receipt["action"]["status"], rendered)
        self.assertIn(receipt["integrity"]["digest"], rendered)
        self.assertIn("Reversible: true", rendered)
        self.assertIn("evidence:review:001", rendered)

    def test_receipt_id_is_stable_and_binds_complete_inputs(self) -> None:
        first, _ = create_receipt(
            self.request,
            self.grant,
            self.evidence,
            created_at="2026-07-15T14:30:01Z",
        )
        second, _ = create_receipt(
            self.request,
            self.grant,
            self.evidence,
            created_at="2026-07-15T14:30:01Z",
        )
        later, _ = create_receipt(
            self.request,
            self.grant,
            self.evidence,
            created_at="2026-07-15T14:30:02Z",
        )
        changed_request = deepcopy(self.request)
        changed_request["consequence"]["protected_third_party_information"] = True
        changed, _ = create_receipt(
            changed_request,
            self.grant,
            self.evidence,
            created_at="2026-07-15T14:30:01Z",
        )
        different_issuer, _ = create_receipt(
            self.request,
            self.grant,
            self.evidence,
            created_at="2026-07-15T14:30:01Z",
            issuer={
                "organization_id": "org:other",
                "display_name": "Other Issuer",
                "verification_uri": "https://other-issuer.example/verify",
            },
        )
        self.assertEqual(first["receipt_id"], second["receipt_id"])
        self.assertNotEqual(first["receipt_id"], later["receipt_id"])
        self.assertNotEqual(first["receipt_id"], changed["receipt_id"])
        self.assertNotEqual(first["receipt_id"], different_issuer["receipt_id"])
        self.assertNotEqual(
            "urn:trust-receipt:request:preference-update:001:executed",
            first["receipt_id"],
        )

    def test_request_projects_third_party_and_reversibility_semantics(self) -> None:
        request = deepcopy(self.request)
        request["consequence"]["protected_third_party_information"] = True
        request["action"]["reversible"] = False
        receipt, _ = create_receipt(
            request,
            self.grant,
            self.evidence,
            created_at="2026-07-15T14:30:01Z",
        )
        self.assertTrue(receipt["consequence"]["protected_third_party_information"])
        self.assertFalse(receipt["remedy"]["reversible"])
        self.assertIn("not represented", receipt["remedy"]["restoration_steps"])

    def test_public_base_uri_must_be_safe_https(self) -> None:
        for base_uri in (
            "http://issuer.example",
            "https://user:secret@issuer.example",
            "https://issuer.example?redirect=elsewhere",
        ):
            with self.subTest(base_uri=base_uri):
                with self.assertRaises(ValueError):
                    create_receipt(
                        self.request,
                        self.grant,
                        self.evidence,
                        created_at="2026-07-15T14:30:01Z",
                        base_uri=base_uri,
                    )

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

    def test_canonicalization_rejects_cross_runtime_unsafe_values(self) -> None:
        for value in (1.5, 2**53, "\ud800", ("tuple",)):
            with self.subTest(value=repr(value)):
                with self.assertRaises(ValueError):
                    canonical_bytes({"value": value})

    def test_verification_status_is_integrity_protected(self) -> None:
        receipt, _ = create_receipt(
            self.request,
            self.grant,
            self.evidence,
            created_at="2026-07-15T14:30:01Z",
        )
        receipt["integrity"]["verification_status"] = "verified"
        self.assertFalse(verify_digest(receipt))

    def test_undefined_signature_placeholder_is_rejected(self) -> None:
        receipt, _ = create_receipt(
            self.request,
            self.grant,
            self.evidence,
            created_at="2026-07-15T14:30:01Z",
        )
        receipt["integrity"]["method"] = "digital-signature"
        schema = load_json(ROOT / "schemas/trust-receipt.schema.json")
        self.assertIssue(receipt, schema, "const")
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
                    "--base-uri", "https://issuer.example",
                    "--output", str(output),
                    "--human-output", str(human),
                ]
            )
            self.assertEqual(0, status)
            self.assertTrue(output.exists())
            self.assertTrue(human.exists())
            receipt = load_json(output)
            self.assertEqual(
                "https://issuer.example/trust-receipts/request:preference-update:001/remedy",
                receipt["remedy"]["status_uri"],
            )
            self.assertEqual(0, main(["receipt", "verify", "--receipt", str(output)]))

    def assertIssue(self, instance: dict[str, object], schema: dict[str, object], code: str) -> None:
        issues = validate(instance, schema)
        self.assertIn(code, {item.code for item in issues})


if __name__ == "__main__":
    unittest.main()
