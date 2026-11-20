import json
import unittest
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker


ROOT = Path(__file__).resolve().parents[1]
SCHEMAS = ROOT / "schemas"
FIXTURES = ROOT / "fixtures"


def load_json(path):
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def valid_dpr():
    return {
        "record_type": "delegation_provenance_record",
        "schema_version": "0.1",
        "record_id": "dpr:example:001",
        "issued_at": "2026-11-20T09:00:00Z",
        "principal": {
            "principal_id": "principal:example",
            "principal_type": "human",
            "authentication_reference": "auth-event:001"
        },
        "authority_source": {
            "source_type": "direct_instruction",
            "source_reference": "instruction:001",
            "validation_status": "validated"
        },
        "delegate": {
            "delegate_id": "agent:example",
            "delegate_type": "ai_agent",
            "system_name": "Example Agent",
            "system_version": "1.0"
        },
        "parent_delegation": None,
        "purpose": {
            "purpose_code": "document.prepare",
            "description": "Prepare the specified document for principal review.",
            "prohibited_uses": ["Send or publish the document."]
        },
        "scope": {
            "allowed_actions": ["document.read", "document.draft"],
            "denied_actions": ["document.send", "document.publish"],
            "allowed_resources": ["document:001"],
            "denied_resources": [],
            "allowed_recipients": [],
            "denied_recipients": [],
            "max_consequence_class": "C1"
        },
        "constraints": {
            "human_confirmation_required": True,
            "data_reuse_allowed": False,
            "onward_disclosure_allowed": False,
            "confirmation_policy_reference": "policy:confirmation:1"
        },
        "temporal": {
            "effective_at": "2026-11-20T09:00:00Z",
            "expires_at": "2026-11-20T17:00:00Z"
        },
        "subdelegation": {
            "allowed": False,
            "max_depth": 0,
            "permitted_delegate_types": []
        }
    }


def valid_decision():
    return {
        "record_type": "authorization_decision",
        "schema_version": "0.1",
        "decision_id": "decision:example:001",
        "evaluated_at": "2026-11-20T09:01:00Z",
        "decision": "ALLOW",
        "principal_id": "principal:example",
        "delegate_id": "agent:example",
        "delegation_record_id": "dpr:example:001",
        "action_binding": {
            "action_id": "action:example:001",
            "action_type": "document.draft",
            "target": "document:001",
            "recipient": None,
            "purpose_code": "document.prepare",
            "request_digest": "sha256:" + ("a" * 64)
        },
        "policy": {
            "policy_id": "EII-TG-AUTH-001",
            "policy_version": "0.1"
        },
        "reason_codes": ["WITHIN_DELEGATED_SCOPE"],
        "confirmation_reference": "confirmation:001",
        "revalidation": {
            "required": True,
            "performed": True,
            "revocation_state": "clear"
        },
        "permit": {
            "permit_id": "permit:001",
            "issued_at": "2026-11-20T09:01:00Z",
            "expires_at": "2026-11-20T09:01:30Z",
            "single_use": True
        },
        "single_use": True
    }


class TrajectoryGovernanceContractTests(unittest.TestCase):
    def setUp(self):
        self.dpr_schema = load_json(SCHEMAS / "delegation-provenance-record.v0.1.schema.json")
        self.auth_schema = load_json(SCHEMAS / "trajectory-authorization-decision.v0.1.schema.json")
        self.dpr_validator = Draft202012Validator(self.dpr_schema, format_checker=FormatChecker())
        self.auth_validator = Draft202012Validator(self.auth_schema, format_checker=FormatChecker())

    def test_dpr_schema_is_valid_draft_2020_12(self):
        Draft202012Validator.check_schema(self.dpr_schema)

    def test_authorization_schema_is_valid_draft_2020_12(self):
        Draft202012Validator.check_schema(self.auth_schema)

    def test_valid_dpr_passes_schema(self):
        self.assertEqual(list(self.dpr_validator.iter_errors(valid_dpr())), [])

    def test_dpr_without_authority_source_is_rejected(self):
        record = valid_dpr()
        del record["authority_source"]
        self.assertTrue(list(self.dpr_validator.iter_errors(record)))

    def test_dpr_with_undeclared_mutable_revocation_status_is_rejected(self):
        record = valid_dpr()
        record["status"] = "revoked"
        self.assertTrue(list(self.dpr_validator.iter_errors(record)))

    def test_valid_action_bound_authorization_decision_passes_schema(self):
        self.assertEqual(list(self.auth_validator.iter_errors(valid_decision())), [])

    def test_unknown_authorization_decision_is_rejected(self):
        record = valid_decision()
        record["decision"] = "MAYBE"
        self.assertTrue(list(self.auth_validator.iter_errors(record)))

    def test_authorization_decision_without_action_binding_is_rejected(self):
        record = valid_decision()
        del record["action_binding"]
        self.assertTrue(list(self.auth_validator.iter_errors(record)))

    def test_catalog_contains_fifty_unique_cases(self):
        catalog = load_json(FIXTURES / "trajectory-governance-cases.v0.1.json")
        cases = catalog["cases"]
        ids = [case["case_id"] for case in cases]
        self.assertEqual(len(cases), 50)
        self.assertEqual(len(set(ids)), 50)

    def test_catalog_is_explicitly_unexecuted(self):
        catalog = load_json(FIXTURES / "trajectory-governance-cases.v0.1.json")
        self.assertEqual(catalog["status"], "test_inventory_not_executed")
        self.assertTrue(all(case["status"] == "NOT_EXECUTED" for case in catalog["cases"]))

    def test_catalog_decisions_and_execution_flags_are_consistent(self):
        catalog = load_json(FIXTURES / "trajectory-governance-cases.v0.1.json")
        allowed = {"ALLOW", "DENY", "REQUIRE_CONFIRMATION", "INDETERMINATE"}
        for case in catalog["cases"]:
            self.assertIn(case["expected_decision"], allowed, case["case_id"])
            self.assertEqual(
                case["execution_permitted"],
                case["expected_decision"] == "ALLOW",
                case["case_id"]
            )

    def test_critical_scenarios_are_never_execution_permitted_when_denied(self):
        catalog = load_json(FIXTURES / "trajectory-governance-cases.v0.1.json")
        for case in catalog["cases"]:
            if case["critical"] and case["expected_decision"] != "ALLOW":
                self.assertFalse(case["execution_permitted"], case["case_id"])


if __name__ == "__main__":
    unittest.main()


class LifecycleAndOutcomeContractTests(unittest.TestCase):
    def setUp(self):
        self.lifecycle_schema = load_json(SCHEMAS / "delegation-lifecycle-event.v0.1.schema.json")
        self.outcome_schema = load_json(SCHEMAS / "execution-outcome.v0.1.schema.json")
        self.lifecycle_validator = Draft202012Validator(self.lifecycle_schema, format_checker=FormatChecker())
        self.outcome_validator = Draft202012Validator(self.outcome_schema, format_checker=FormatChecker())

    def test_lifecycle_schema_is_valid_draft_2020_12(self):
        Draft202012Validator.check_schema(self.lifecycle_schema)

    def test_execution_outcome_schema_is_valid_draft_2020_12(self):
        Draft202012Validator.check_schema(self.outcome_schema)

    def test_revocation_is_a_separate_lifecycle_event(self):
        record = json.loads(r'''{"record_type":"delegation_lifecycle_event","schema_version":"0.1","event_id":"life:001","event_type":"REVOKED","delegation_record_id":"dpr:example:001","occurred_at":"2026-11-20T09:10:00Z","effective_at":"2026-11-20T09:10:00Z","actor":{"actor_id":"principal:example","actor_type":"principal"},"authority_reference":"principal-session:revoke:001","reason_code":"PRINCIPAL_REVOKED","evidence_references":["event-log:001"]}''')
        self.assertEqual(list(self.lifecycle_validator.iter_errors(record)), [])

    def test_correction_event_requires_superseded_event_and_note(self):
        record = json.loads(r'''{"record_type":"delegation_lifecycle_event","schema_version":"0.1","event_id":"life:001","event_type":"CORRECTION_RECORDED","delegation_record_id":"dpr:example:001","occurred_at":"2026-11-20T09:10:00Z","effective_at":"2026-11-20T09:10:00Z","actor":{"actor_id":"principal:example","actor_type":"principal"},"authority_reference":"principal-session:revoke:001","reason_code":"PRINCIPAL_REVOKED","evidence_references":["event-log:001"]}''')
        self.assertTrue(list(self.lifecycle_validator.iter_errors(record)))

    def test_valid_executed_outcome_requires_verification_evidence(self):
        record = json.loads(r'''{"record_type":"execution_outcome","schema_version":"0.1","outcome_id":"outcome:001","action_id":"action:001","authorization_decision_id":"decision:001","delegation_record_id":"dpr:example:001","status":"EXECUTED","attempted":true,"observed_at":"2026-11-20T09:02:00Z","provider":{"provider_id":"service:document-store","provider_operation_id":"op:001","provider_status":"committed"},"verification_status":"verified","evidence_references":["provider-event:001"]}''')
        self.assertEqual(list(self.outcome_validator.iter_errors(record)), [])

    def test_executed_outcome_without_evidence_is_rejected(self):
        record = json.loads(r'''{"record_type":"execution_outcome","schema_version":"0.1","outcome_id":"outcome:001","action_id":"action:001","authorization_decision_id":"decision:001","delegation_record_id":"dpr:example:001","status":"EXECUTED","attempted":true,"observed_at":"2026-11-20T09:02:00Z","provider":{"provider_id":"service:document-store","provider_operation_id":"op:001","provider_status":"committed"},"verification_status":"verified","evidence_references":[]}''')
        self.assertTrue(list(self.outcome_validator.iter_errors(record)))

    def test_unknown_outcome_cannot_be_claimed_verified(self):
        record = json.loads(r'''{"record_type":"execution_outcome","schema_version":"0.1","outcome_id":"outcome:001","action_id":"action:001","authorization_decision_id":"decision:001","delegation_record_id":"dpr:example:001","status":"OUTCOME_UNKNOWN","attempted":true,"observed_at":"2026-11-20T09:02:00Z","provider":{"provider_id":"service:document-store","provider_operation_id":"op:001","provider_status":"committed"},"verification_status":"verified","evidence_references":["provider-event:001"]}''')
        self.assertTrue(list(self.outcome_validator.iter_errors(record)))
