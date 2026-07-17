"""Normative decision logic for pre-execution and conformance gates."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any


CONSEQUENCE_ORDER = {"C0": 0, "C1": 1, "C2": 2, "C3": 3}


@dataclass(frozen=True)
class GateFailure:
    code: str
    message: str
    field: str

    def as_dict(self) -> dict[str, str]:
        return {"code": self.code, "message": self.message, "field": self.field}


@dataclass(frozen=True)
class GateDecision:
    decision: str
    failures: tuple[GateFailure, ...]

    @property
    def allowed(self) -> bool:
        return self.decision == "allow"

    def as_dict(self) -> dict[str, Any]:
        return {"decision": self.decision, "failures": [item.as_dict() for item in self.failures]}


def parse_datetime(value: str) -> datetime:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("date-time must include a UTC offset")
    return parsed


def evaluate_gate(
    request: dict[str, Any], grant: dict[str, Any], evidence: dict[str, Any]
) -> GateDecision:
    failures: list[GateFailure] = []

    def fail(code: str, message: str, field: str) -> None:
        failures.append(GateFailure(code, message, field))

    requested_at = parse_datetime(request["requested_at"])
    granted_at = parse_datetime(grant["granted_at"])
    expires_at = parse_datetime(grant["expires_at"])

    if grant["status"] != "active":
        fail("GRANT_NOT_ACTIVE", "Authority grant is not active.", "grant.status")
    if requested_at < granted_at:
        fail("GRANT_NOT_YET_VALID", "Action precedes the grant's valid interval.", "request.requested_at")
    if requested_at >= expires_at:
        fail("GRANT_EXPIRED", "Action occurs at or after grant expiration.", "grant.expires_at")

    for field in ("agent_id", "operator_id"):
        if request["agent"][field] != grant["grantee"][field]:
            fail("GRANTEE_MISMATCH", f"Request {field} does not match the authority grant.", f"request.agent.{field}")

    action_type = request["action"]["type"]
    scope = grant["scope"]
    if action_type not in scope["allowed_actions"] or action_type in scope["excluded_actions"]:
        fail("ACTION_OUT_OF_SCOPE", "Requested action is not within the granted action scope.", "request.action.type")
    target = request["action"]["target"]
    if "*" not in scope["allowed_targets"] and target not in scope["allowed_targets"]:
        fail("TARGET_OUT_OF_SCOPE", "Requested target is not within the granted target scope.", "request.action.target")

    consequence = request["consequence"]["class"]
    if CONSEQUENCE_ORDER[consequence] > CONSEQUENCE_ORDER[scope["max_consequence_class"]]:
        fail("CONSEQUENCE_EXCEEDS_GRANT", "Consequence class exceeds the grant ceiling.", "request.consequence.class")

    confirmation = grant["confirmation"]
    if consequence in confirmation["required_for"]:
        threshold = confirmation["threshold"]
        if threshold == "user_confirmation" and request["confirmation"]["status"] != "confirmed":
            fail("CONFIRMATION_REQUIRED", "Confirmed user authorization is required.", "request.confirmation.status")
        if threshold == "independent_human_review" and request["human_review"]["status"] != "approved":
            fail("HUMAN_REVIEW_REQUIRED", "Independent human approval is required.", "request.human_review.status")

    delegations = request.get("delegation", [])
    policy = grant["delegation"]
    if delegations and not policy["allowed"]:
        fail("DELEGATION_PROHIBITED", "The grant does not permit delegation.", "request.delegation")
    for index, item in enumerate(delegations):
        if item["depth"] > policy["max_depth"]:
            fail("DELEGATION_DEPTH_EXCEEDED", "Delegation depth exceeds the grant.", f"request.delegation[{index}].depth")
        if item["recipient_id"] not in policy["permitted_recipients"]:
            fail("DELEGATE_NOT_PERMITTED", "Delegation recipient is not permitted.", f"request.delegation[{index}].recipient_id")

    for index, item in enumerate(evidence["items"]):
        if item["materiality"] == "required":
            if item["status"] != "available":
                fail("REQUIRED_EVIDENCE_UNAVAILABLE", "Required material evidence is not available.", f"evidence.items[{index}].status")
            if item["freshness"] != "current":
                fail("REQUIRED_EVIDENCE_NOT_CURRENT", "Required material evidence is not current.", f"evidence.items[{index}].freshness")
    if not evidence["receipt_service_available"]:
        fail("RECEIPT_SERVICE_UNAVAILABLE", "A durable receipt cannot be produced.", "evidence.receipt_service_available")
    if consequence in ("C2", "C3") and not evidence["remedy_service_available"]:
        fail("REMEDY_SERVICE_UNAVAILABLE", "Required remedy capability is unavailable.", "evidence.remedy_service_available")

    return GateDecision("allow" if not failures else "deny", tuple(failures))


def assess_conformance(
    results: list[dict[str, Any]], consequence_class: str, profile: dict[str, Any]
) -> dict[str, Any]:
    expected = [item["id"] for item in profile["requirements"]]
    supplied = [item["requirement_id"] for item in results]
    if len(results) != len(expected) or set(supplied) != set(expected) or len(supplied) != len(set(supplied)):
        raise ValueError("Conformance input must contain each profile requirement exactly once")

    normalized: list[dict[str, Any]] = []
    for requirement_id in expected:
        original = next(item for item in results if item["requirement_id"] == requirement_id)
        item = dict(original)
        item.setdefault("evidence_references", [])
        item.setdefault("gaps", [])
        if not item.get("evidence_available", False):
            item["result"] = "fail"
            gap = "Material verification evidence was unavailable; claimed status was overridden to fail."
            if gap not in item["gaps"]:
                item["gaps"] = [*item["gaps"], gap]
        if item["result"] not in profile["result_values"]:
            raise ValueError(f"Invalid result for {requirement_id}: {item['result']}")
        normalized.append(item)

    failed = [item["requirement_id"] for item in normalized if item["result"] == "fail"]
    partial = [item["requirement_id"] for item in normalized if item["result"] == "partial"]
    if failed:
        overall = "does_not_conform"
        mode = "disabled_or_manual_control"
    elif partial:
        overall = "conditionally_conforms"
        critical = set(profile["critical_requirements_c2_c3"])
        if consequence_class == "C3" or (
            consequence_class == "C2" and bool(set(partial) & critical)
        ):
            mode = "manual_control"
        else:
            mode = "restricted_agentic_with_time_bounded_remediation"
    else:
        overall = "conforms"
        mode = "approved_boundary"
    return {
        "consequence_class": consequence_class,
        "requirement_results": normalized,
        "overall_decision": overall,
        "execution_mode": mode,
        "failed_requirements": failed,
        "partial_requirements": partial,
    }
