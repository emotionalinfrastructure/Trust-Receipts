"""Human-readable projection generated only from the machine receipt."""

from __future__ import annotations

from typing import Any


def render_receipt(receipt: dict[str, Any]) -> str:
    action = receipt["action"]
    authority = receipt["authority"]
    consequence = receipt["consequence"]
    remedy = receipt["remedy"]
    integrity = receipt["integrity"]
    review = receipt["human_review"]
    evidence_lines = [
        f"  - {item['evidence_id']}: {item['status']} / {item['freshness']} ({item['materiality']})"
        for item in receipt["material_inputs"]
    ]
    evidence_viewed_lines = [
        f"  - {evidence_id}" for evidence_id in review.get("evidence_viewed", [])
    ] or ["  - None recorded"]
    delegation_lines = [
        f"  - {item['recipient_id']} at depth {item['depth']}: {item['task']}"
        for item in receipt["delegation"]
    ] or ["  - None"]
    relationship_lines = [
        f"  - {item['type']}: {item['receipt_id']}" for item in receipt["relationships"]
    ] or ["  - None"]
    return "\n".join(
        [
            "AI TRUST RECEIPT",
            "================",
            f"Receipt: {receipt['receipt_id']}",
            f"Event time: {receipt['event_time']}",
            f"Created: {receipt['created_at']}",
            "",
            "ACTION",
            f"Status: {action['status']}",
            f"Type: {action['type']}",
            f"Verb: {action['verb']}",
            f"Target: {action['target']}",
            f"Persistent change: {str(action['persistent_change']).lower()}",
            *([f"Exception: {action['exception_code']}"] if "exception_code" in action else []),
            "",
            "ACCOUNTABILITY AND AUTHORITY",
            f"Agent: {receipt['agent']['agent_id']}",
            f"Operator: {receipt['agent']['operator_id']}",
            f"Accountable organization: {receipt['agent']['accountable_organization']}",
            f"Grant: {authority['grant_id']} ({authority['validation_status']})",
            f"Confirmation: {authority['confirmation_status']}",
            "",
            "CONSEQUENCE AND REVIEW",
            f"Class: {consequence['class']}",
            f"Affected party: {str(consequence['affected_party']).lower()}",
            f"Notice required: {str(consequence['notice_required']).lower()}",
            f"Protected third-party information: {str(consequence.get('protected_third_party_information', False)).lower()}",
            f"Human review: {review['status']}",
            "Evidence viewed:",
            *evidence_viewed_lines,
            "",
            "MATERIAL EVIDENCE",
            *evidence_lines,
            "",
            "DELEGATION",
            *delegation_lines,
            "",
            "RELATED RECEIPTS",
            *relationship_lines,
            "",
            "REMEDY",
            f"Available: {str(remedy['available']).lower()}",
            f"Reversible: {str(remedy['reversible']).lower()}",
            f"Contestable: {str(remedy['contestable']).lower()}",
            f"Review owner: {remedy['review_owner']}",
            f"Status: {remedy['status_uri']}",
            "",
            "INTEGRITY",
            f"Method: {integrity['method']}",
            f"Profile: {integrity['canonicalization_profile']}",
            f"Digest: {integrity['digest']}",
            f"Recorded verification status: {integrity['verification_status']}",
            "",
            "This receipt is an event record, not a claim that the action was fair, lawful, or correct.",
            "",
        ]
    )
