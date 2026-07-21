import { canonicalJson, digestCanonicalValue, sealReceipt, verifyReceiptDigest } from "./canonical.mjs";
import { signReceiptAssertion, verifyReceiptAssertion } from "./crypto.mjs";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function statesEqual(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

function grantValidationStatus(gate) {
  const codes = new Set(gate.failures.map((item) => item.code));
  if (codes.has("GRANT_EXPIRED")) return "expired";
  if (codes.has("GRANT_NOT_ACTIVE")) return "revoked";
  if (codes.has("ACTION_OUT_OF_SCOPE") || codes.has("TARGET_OUT_OF_SCOPE") || codes.has("CONSEQUENCE_EXCEEDS_GRANT")) return "out_of_scope";
  return gate.decision === "allow" ? "valid" : "invalid";
}

function safeRequestComponent(value) {
  return String(value)
    .replace(/[^A-Za-z0-9._:-]/gu, "-")
    .replace(/-+/gu, "-")
    .slice(0, 80);
}

function buildDelegation(actionRequest, executionResult) {
  const requested = actionRequest.delegation ?? [];
  if (requested.length === 0) return [];

  const results = new Map(
    (executionResult.delegation_results ?? []).map((item) => [item.recipient_id, item]),
  );
  return requested.map((item) => {
    const result = results.get(item.recipient_id);
    if (!result) {
      throw new TypeError(`Missing delegation result for ${item.recipient_id}`);
    }
    return {
      recipient_id: item.recipient_id,
      task: item.task,
      authority_passed: item.authority_passed,
      depth: item.depth,
      evidence_returned: result.evidence_returned,
    };
  });
}

function buildHumanReview(actionRequest, receiptContext) {
  const review = actionRequest.human_review;
  const operational = receiptContext.human_review_record;
  if (["approved", "rejected"].includes(review.status) && !operational) {
    throw new TypeError("Approved or rejected human review requires an explicit operational human_review_record");
  }

  const result = {
    status: review.status,
    authority_to_intervene: operational?.authority_to_intervene ?? false,
  };
  if (review.reviewer_role !== undefined) result.reviewer_role = review.reviewer_role;
  if (review.evidence_viewed !== undefined) result.evidence_viewed = clone(review.evidence_viewed);
  if (review.reviewed_at !== undefined) result.reviewed_at = review.reviewed_at;
  if (operational?.disposition !== undefined) result.disposition = operational.disposition;
  return result;
}

export function assertExecutionConsistency(envelope, gate) {
  const { action_request: request, execution_result: result, receipt_context: context } = envelope;
  if (gate.decision === "deny" && !["denied", "escalated"].includes(result.status)) {
    throw new TypeError("A denied gate decision may only produce a denied or escalated terminal event");
  }
  if (gate.decision === "allow" && result.status === "denied" && !result.exception_code) {
    throw new TypeError("A post-gate denied execution must include an exception_code");
  }
  if (
    gate.decision === "allow" &&
    result.status === "executed" &&
    !statesEqual(request.action.proposed_after_state, result.after_state) &&
    !result.exception_code
  ) {
    throw new TypeError("An executed outcome that differs from proposed_after_state must include an exception_code");
  }
  if (
    result.status === "denied" &&
    !statesEqual(request.action.before_state, result.after_state) &&
    !result.exception_code
  ) {
    throw new TypeError("A denied action must preserve before_state unless a partial-execution exception is recorded");
  }
  if (["C2", "C3"].includes(request.consequence.class) && context.remedy.available !== true) {
    throw new TypeError("C2 and C3 receipts require an operational remedy");
  }
}

export async function buildReceipt({ envelope, gate, issuer, createdAt = new Date().toISOString() }) {
  assertExecutionConsistency(envelope, gate);
  const request = envelope.action_request;
  const grant = envelope.authority_grant;
  const evidence = envelope.material_evidence;
  const execution = envelope.execution_result;
  const context = envelope.receipt_context;

  const identityDigest = await digestCanonicalValue({
    request_id: request.request_id,
    action_request: request,
    authority_grant: grant,
    material_evidence: evidence,
    execution_result: execution,
    gate,
    created_at: createdAt,
  });
  const receiptId = `urn:trust-receipt:${safeRequestComponent(request.request_id)}:${identityDigest.slice(7)}`;

  const action = {
    type: request.action.type,
    verb: request.action.verb,
    target: request.action.target,
    status: execution.status,
    persistent_change: request.action.persistent_change,
    before_state: clone(request.action.before_state),
    after_state: clone(execution.after_state),
  };
  if (execution.exception_code !== undefined) action.exception_code = execution.exception_code;

  const consequence = {
    class: request.consequence.class,
    affected_party: request.consequence.affected_party,
    notice_required: request.consequence.notice_required,
    persistent_change: request.action.persistent_change,
  };
  if (request.consequence.protected_third_party_information !== undefined) {
    consequence.protected_third_party_information =
      request.consequence.protected_third_party_information;
  }

  const receipt = {
    receipt_version: "0.1.1",
    receipt_id: receiptId,
    event_time: execution.event_time,
    created_at: createdAt,
    schema_id: "https://emotionalinfrastructure.org/schemas/trust-receipt/trust-receipt.v0.1.1.schema.json",
    issuer: {
      organization_id: issuer.organizationId,
      display_name: issuer.displayName,
      verification_uri: `${issuer.publicBaseUrl.replace(/\/$/u, "")}/v1/verify`,
    },
    agent: clone(request.agent),
    action,
    authority: {
      grant_id: grant.grant_id,
      granting_party_id: grant.granting_party.party_id,
      scope: canonicalJson(grant.scope),
      granted_at: grant.granted_at,
      expires_at: grant.expires_at,
      confirmation_status: request.confirmation.status,
      validation_status: grantValidationStatus(gate),
    },
    objective: {
      description: grant.objective.description,
      version: grant.objective.version,
      hard_constraints: clone(grant.objective.hard_constraints),
    },
    material_inputs: evidence.items.map((item) => ({
      evidence_id: item.evidence_id,
      category: item.category,
      provenance: item.provenance,
      materiality: item.materiality,
      status: item.status,
      freshness: item.freshness,
    })),
    delegation: buildDelegation(request, execution),
    human_review: buildHumanReview(request, context),
    consequence,
    remedy: clone(context.remedy),
    privacy: clone(context.privacy),
    relationships: clone(context.relationships ?? []),
  };

  return sealReceipt(receipt, "verified");
}

export async function issueReceipt({ envelope, gate, issuer, signing, createdAt }) {
  const receipt = await buildReceipt({ envelope, gate, issuer, createdAt });
  const assertion = await signReceiptAssertion({
    receipt,
    keyId: signing.keyId,
    privateKeyBase64: signing.privateKeyBase64,
    signedAt: createdAt ?? receipt.created_at,
  });
  return { receipt, issuer_assertion: assertion, gate };
}

export async function verifyIssuedReceipt({ receipt, issuerAssertion, publicKeyBase64, publicKeyJwk }) {
  const [digest_valid, issuer_signature_valid] = await Promise.all([
    verifyReceiptDigest(receipt),
    verifyReceiptAssertion({
      receipt,
      assertion: issuerAssertion,
      publicKeyBase64,
      publicKeyJwk,
    }),
  ]);
  return {
    digest_valid,
    issuer_signature_valid,
    valid: digest_valid && issuer_signature_valid,
  };
}
