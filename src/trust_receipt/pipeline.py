"""Receipt generation from a single canonical event record."""

from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import json
from typing import Any
from urllib.parse import urlparse, urlunparse

from .engine import GateDecision, evaluate_gate
from .integrity import add_digest, canonical_bytes


DEFAULT_ISSUER = {
    "organization_id": "org:reference-implementation",
    "display_name": "AI Trust Receipt Reference Implementation",
    "verification_uri": "https://trust-receipt.example/verify",
}

def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def create_receipt(
    request: dict[str, Any],
    grant: dict[str, Any],
    evidence: dict[str, Any],
    *,
    created_at: str | None = None,
    issuer: dict[str, str] | None = None,
    base_uri: str | None = None,
) -> tuple[dict[str, Any], GateDecision]:
    decision = evaluate_gate(request, grant, evidence)
    generated_at = created_at or utc_now()
    action_status = "executed" if decision.allowed else "denied"
    validation_status = _authority_status(decision, grant)
    consequence_class = request["consequence"]["class"]
    required_evidence_ok = _required_evidence_available(evidence)
    event_id = _safe_identifier(request["request_id"])
    receipt_issuer = issuer or DEFAULT_ISSUER
    receipt_id = _receipt_id(
        request,
        grant,
        evidence,
        receipt_issuer,
        generated_at,
        action_status,
    )
    public_base_uri = _public_base_uri(base_uri, receipt_issuer)

    action = {
        "type": request["action"]["type"],
        "verb": request["action"]["verb"],
        "target": request["action"]["target"],
        "status": action_status,
        "persistent_change": request["action"]["persistent_change"],
        "before_state": request["action"]["before_state"],
        "after_state": (
            request["action"]["proposed_after_state"]
            if decision.allowed
            else request["action"]["before_state"]
        ),
    }
    if not decision.allowed:
        action["exception_code"] = decision.failures[0].code

    receipt: dict[str, Any] = {
        "receipt_version": "0.1.1",
        "receipt_id": receipt_id,
        "event_time": request["requested_at"],
        "created_at": generated_at,
        "schema_id": "https://emotionalinfrastructure.org/schemas/trust-receipt/trust-receipt.v0.1.1.schema.json",
        "issuer": dict(receipt_issuer),
        "agent": dict(request["agent"]),
        "action": action,
        "authority": {
            "grant_id": grant["grant_id"],
            "granting_party_id": grant["granting_party"]["party_id"],
            "scope": json.dumps(grant["scope"], sort_keys=True, separators=(",", ":")),
            "granted_at": grant["granted_at"],
            "expires_at": grant["expires_at"],
            "confirmation_status": request["confirmation"]["status"],
            "validation_status": validation_status,
        },
        "objective": {
            "description": grant["objective"]["description"],
            "version": grant["objective"]["version"],
            "hard_constraints": list(grant["objective"]["hard_constraints"]),
        },
        "material_inputs": [
            {
                key: item[key]
                for key in ("evidence_id", "category", "provenance", "materiality", "status", "freshness")
            }
            for item in evidence["items"]
        ],
        "delegation": [
            {**item, "evidence_returned": required_evidence_ok}
            for item in request.get("delegation", [])
        ],
        "human_review": _human_review(request, consequence_class),
        "consequence": {
            "class": consequence_class,
            "affected_party": request["consequence"]["affected_party"],
            "notice_required": request["consequence"]["notice_required"],
            "persistent_change": request["action"]["persistent_change"],
            "protected_third_party_information": request["consequence"].get(
                "protected_third_party_information", False
            ),
        },
        "remedy": {
            "available": evidence["remedy_service_available"],
            "reversible": request["action"].get("reversible", False),
            "contestable": consequence_class in ("C2", "C3"),
            "restoration_steps": _restoration_steps(request),
            "review_owner": request["agent"]["accountable_organization"],
            "status_uri": f"{public_base_uri}/trust-receipts/{event_id}/remedy",
            "time_limit": "Submit within 30 calendar days of notice.",
        },
        "privacy": {
            "retention_basis": "Retain the minimum event evidence required for verification, review, and remedy.",
            "routine_access_expires": grant["expires_at"],
            "access_roles": ["accountable-reviewer", "affected-party-support"],
            "prohibited_secondary_uses": ["model-training", "unrelated-profiling"],
            "chain_of_thought_excluded": True,
            "deletion_uri": f"{public_base_uri}/trust-receipts/{event_id}/privacy",
        },
        "relationships": [],
        "integrity": {},
    }
    return add_digest(receipt), decision


def _safe_identifier(value: str) -> str:
    result = "".join(character if character.isalnum() or character in "._:-" else "-" for character in value)
    return result[:100] or "event"


def _receipt_id(
    request: dict[str, Any],
    grant: dict[str, Any],
    evidence: dict[str, Any],
    issuer: dict[str, str],
    created_at: str,
    action_status: str,
) -> str:
    event_id = _safe_identifier(request["request_id"])
    preimage = {
        "request": request,
        "grant": grant,
        "evidence": evidence,
        "issuer": issuer,
        "created_at": created_at,
        "status": action_status,
    }
    suffix = hashlib.sha256(canonical_bytes(preimage)).hexdigest()
    return f"urn:trust-receipt:{event_id}:{suffix}"


def _authority_status(decision: GateDecision, grant: dict[str, Any]) -> str:
    codes = {item.code for item in decision.failures}
    if grant["status"] == "revoked":
        return "revoked"
    if grant["status"] == "expired" or "GRANT_EXPIRED" in codes:
        return "expired"
    if codes & {"ACTION_OUT_OF_SCOPE", "TARGET_OUT_OF_SCOPE", "CONSEQUENCE_EXCEEDS_GRANT"}:
        return "out_of_scope"
    if codes & {"GRANT_NOT_ACTIVE", "GRANT_NOT_YET_VALID", "GRANTEE_MISMATCH"}:
        return "invalid"
    return "valid"


def _human_review(request: dict[str, Any], consequence_class: str) -> dict[str, Any]:
    source = request["human_review"]
    result: dict[str, Any] = {
        "status": source["status"],
        "authority_to_intervene": consequence_class in ("C2", "C3"),
    }
    if "reviewer_role" in source:
        result["reviewer_role"] = source["reviewer_role"]
    if "reviewed_at" in source:
        result["reviewed_at"] = source["reviewed_at"]
    if source["status"] != "none":
        result["evidence_viewed"] = list(source.get("evidence_viewed", []))
        result["disposition"] = source["status"]
    return result


def _public_base_uri(base_uri: str | None, issuer: dict[str, str]) -> str:
    candidate = base_uri
    if candidate is None:
        parsed_issuer = urlparse(issuer["verification_uri"])
        candidate = urlunparse(
            (parsed_issuer.scheme, parsed_issuer.netloc, "", "", "", "")
        )

    parsed = urlparse(candidate)
    if (
        parsed.scheme != "https"
        or not parsed.netloc
        or parsed.username is not None
        or parsed.password is not None
        or parsed.params
        or parsed.query
        or parsed.fragment
    ):
        raise ValueError("base_uri must be an absolute HTTPS URI without credentials, query, or fragment")
    return candidate.rstrip("/")


def _required_evidence_available(evidence: dict[str, Any]) -> bool:
    return all(
        item["materiality"] != "required"
        or (item["status"] == "available" and item["freshness"] == "current")
        for item in evidence["items"]
    )


def _restoration_steps(request: dict[str, Any]) -> str:
    if request["action"].get("reversible", False):
        return "Restore the recorded before_state after accountable review."
    return "Escalate to the review owner; direct technical reversal is not represented in this receipt."
