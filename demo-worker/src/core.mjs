const CONSEQUENCE_RANK = Object.freeze({ C0: 0, C1: 1, C2: 2, C3: 3 });

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function ordered(value) {
  if (Array.isArray(value)) return value.map(ordered);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, ordered(value[key])]),
    );
  }
  if (typeof value === "number" && !Number.isInteger(value)) {
    throw new TypeError("Demo canonicalization rejects non-integer numbers.");
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(ordered(value));
}

export async function sha256Hex(text) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function randomBytes(length) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

export function uuidV7(now = Date.now()) {
  const bytes = randomBytes(16);
  let timestamp = BigInt(now);
  for (let index = 5; index >= 0; index -= 1) {
    bytes[index] = Number(timestamp & 0xffn);
    timestamp >>= 8n;
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function addFailure(failures, code, field, message, terminal = true) {
  failures.push({
    sequence: failures.length + 1,
    code,
    field,
    message,
    terminal,
  });
}

export function normalizeInput(input = {}) {
  const consequenceClass = CONSEQUENCE_RANK[input.consequence_class] === undefined
    ? "C2"
    : input.consequence_class;
  return {
    scenario_id: String(input.scenario_id ?? "custom"),
    consequence_class: consequenceClass,
    persistent_change: input.persistent_change !== false,
    affected_party: input.affected_party !== false,
    user_confirmation: ["confirmed", "denied", "pending", "not_required"].includes(input.user_confirmation)
      ? input.user_confirmation
      : "confirmed",
    human_review: ["approved", "rejected", "pending", "none"].includes(input.human_review)
      ? input.human_review
      : "approved",
    grant_status: ["active", "revoked", "expired", "suspended"].includes(input.grant_status)
      ? input.grant_status
      : "active",
    request_before_grant: input.request_before_grant === true,
    grant_expired: input.grant_expired === true,
    action_in_scope: input.action_in_scope !== false,
    target_in_scope: input.target_in_scope !== false,
    max_consequence_class: CONSEQUENCE_RANK[input.max_consequence_class] === undefined
      ? "C2"
      : input.max_consequence_class,
    delegation_depth: Number.isInteger(input.delegation_depth) ? input.delegation_depth : 1,
    max_delegation_depth: Number.isInteger(input.max_delegation_depth) ? input.max_delegation_depth : 1,
    evidence_status: ["available", "unavailable"].includes(input.evidence_status)
      ? input.evidence_status
      : "available",
    evidence_freshness: ["current", "stale"].includes(input.evidence_freshness)
      ? input.evidence_freshness
      : "current",
    receipt_service_available: input.receipt_service_available !== false,
    remedy_service_available: input.remedy_service_available !== false,
    reversible: input.reversible !== false,
    before_state: clone(input.before_state ?? { weekly_summary: false }),
    proposed_after_state: clone(input.proposed_after_state ?? { weekly_summary: true }),
  };
}

export function evaluateGate(rawInput) {
  const input = normalizeInput(rawInput);
  const failures = [];

  if (input.grant_status !== "active") {
    addFailure(failures, "GRANT_NOT_ACTIVE", "authority_grant.status", "The authority grant is not active.");
  }
  if (input.request_before_grant) {
    addFailure(failures, "GRANT_NOT_YET_VALID", "action_request.requested_at", "The request precedes the grant validity interval.");
  }
  if (input.grant_expired) {
    addFailure(failures, "GRANT_EXPIRED", "authority_grant.expires_at", "The authority grant has expired.");
  }
  if (!input.action_in_scope) {
    addFailure(failures, "ACTION_OUT_OF_SCOPE", "action_request.action.type", "The requested action is outside the grant scope.");
  }
  if (!input.target_in_scope) {
    addFailure(failures, "TARGET_OUT_OF_SCOPE", "action_request.action.target", "The requested target is outside the grant scope.");
  }
  if (CONSEQUENCE_RANK[input.consequence_class] > CONSEQUENCE_RANK[input.max_consequence_class]) {
    addFailure(failures, "CONSEQUENCE_EXCEEDS_GRANT", "action_request.consequence.class", "The declared consequence class exceeds the grant ceiling.");
  }

  const requiresConfirmation =
    input.persistent_change &&
    input.affected_party &&
    ["C2", "C3"].includes(input.consequence_class);
  if (input.user_confirmation === "denied") {
    addFailure(
      failures,
      "USER_AUTHORIZATION_DENIED",
      "action_request.confirmation.status",
      "The affected person explicitly denied authorization. Human review cannot override that denial.",
    );
  } else if (requiresConfirmation && input.user_confirmation !== "confirmed") {
    addFailure(
      failures,
      "CONFIRMATION_REQUIRED",
      "action_request.confirmation.status",
      "Confirmed affected-person authorization is required for this persistent consequential change.",
    );
  }

  const requiresReview = ["C2", "C3"].includes(input.consequence_class);
  if (requiresReview && input.human_review !== "approved") {
    addFailure(
      failures,
      "HUMAN_REVIEW_REQUIRED",
      "action_request.human_review.status",
      "Independent human approval is required for this consequence class.",
    );
  }

  if (input.delegation_depth > input.max_delegation_depth) {
    addFailure(failures, "DELEGATION_DEPTH_EXCEEDED", "action_request.delegation.depth", "The delegation depth exceeds the grant maximum.");
  }
  if (input.evidence_status !== "available") {
    addFailure(failures, "REQUIRED_EVIDENCE_UNAVAILABLE", "material_evidence.status", "Required evidence is unavailable.");
  }
  if (input.evidence_freshness !== "current") {
    addFailure(failures, "REQUIRED_EVIDENCE_NOT_CURRENT", "material_evidence.freshness", "Required evidence is stale.");
  }
  if (!input.receipt_service_available) {
    addFailure(failures, "RECEIPT_SERVICE_UNAVAILABLE", "material_evidence.receipt_service_available", "The receipt capability is unavailable.");
  }
  if (["C2", "C3"].includes(input.consequence_class) && !input.remedy_service_available) {
    addFailure(failures, "REMEDY_SERVICE_UNAVAILABLE", "material_evidence.remedy_service_available", "An operational remedy pathway is required for C2 and C3 actions.");
  }

  return {
    input,
    decision: failures.length === 0 ? "allow" : "deny",
    failures,
  };
}

function confirmationEvidence(input, requiresConfirmation) {
  return {
    status: input.user_confirmation,
    current: input.user_confirmation !== "pending",
    sufficient: requiresConfirmation ? input.user_confirmation === "confirmed" : input.user_confirmation !== "denied",
  };
}

function reviewEvidence(input, requiresReview) {
  return {
    status: input.human_review,
    available: input.human_review !== "none",
    current: ["approved", "rejected"].includes(input.human_review),
    sufficient: requiresReview ? input.human_review === "approved" : true,
  };
}

export async function buildReceipt(rawInput, baseUrl, now = Date.now()) {
  const gate = evaluateGate(rawInput);
  const input = gate.input;
  const attemptId = uuidV7(now);
  const evaluatedAt = new Date(now).toISOString();
  const createdAt = new Date(now + 1).toISOString();
  const requiresConfirmation = input.persistent_change && input.affected_party && ["C2", "C3"].includes(input.consequence_class);
  const requiresReview = ["C2", "C3"].includes(input.consequence_class);
  const allowed = gate.decision === "allow";
  const receipt = {
    receipt_version: "demo-0.2",
    receipt_environment: "demonstration",
    synthetic: true,
    attempt_id: attemptId,
    receipt_id: `urn:ei:trust-receipt:demo:${attemptId}`,
    event_time: evaluatedAt,
    created_at: createdAt,
    schema_id: `${baseUrl}/schema/trust-receipt-demo-v0.2.json`,
    issuer: {
      organization_id: "org:emotional-infrastructure-demo",
      display_name: "Emotional Infrastructure™ Demonstration",
      authentication_status: "unsigned_demo",
    },
    gate_decision: {
      result: gate.decision,
      evaluated_at: evaluatedAt,
      failures: gate.failures,
    },
    action: {
      type: "account.profile.update",
      target: "account:demo-subject",
      persistent_change: input.persistent_change,
      status: allowed ? "executed" : "denied",
      before_state: clone(input.before_state),
      after_state: allowed ? clone(input.proposed_after_state) : clone(input.before_state),
      primary_exception_code: gate.failures[0]?.code ?? null,
    },
    authority: {
      validation_status: input.grant_status === "active" && !input.grant_expired && !input.request_before_grant
        ? "valid"
        : "invalid",
      confirmation_required: requiresConfirmation,
      confirmation_evidence: confirmationEvidence(input, requiresConfirmation),
    },
    human_review: {
      required: requiresReview,
      evidence: reviewEvidence(input, requiresReview),
    },
    material_evidence: {
      status: input.evidence_status,
      freshness: input.evidence_freshness,
      current_and_available: input.evidence_status === "available" && input.evidence_freshness === "current",
    },
    consequence: {
      class: input.consequence_class,
      affected_party: input.affected_party,
    },
    remedy: {
      status: input.remedy_service_available ? "available_in_scenario" : "not_implemented_in_scenario",
      available: input.remedy_service_available,
      reversible: input.remedy_service_available && input.reversible,
      url: null,
    },
    verification: {
      status: "demo_digest_only",
      url: `${baseUrl}/api/verify`,
      issuer_authenticated: false,
    },
    deletion: {
      status: "not_implemented_in_demo",
      url: null,
    },
    persistence: {
      status: "not_persisted",
      storage: "none",
    },
    integrity: {
      canonicalization: "ei-canonical-json-no-floats-v0.2-demo",
      digest_algorithm: "SHA-256",
      digest: "",
    },
  };

  receipt.integrity.digest = `sha256:${await sha256Hex(canonicalJson(receipt))}`;
  return receipt;
}

export async function verifyReceipt(receipt) {
  if (!receipt || typeof receipt !== "object" || !receipt.integrity || typeof receipt.integrity.digest !== "string") {
    return { valid: false, error: "INVALID_RECEIPT" };
  }
  const copy = clone(receipt);
  const recorded = copy.integrity.digest;
  copy.integrity.digest = "";
  const recomputed = `sha256:${await sha256Hex(canonicalJson(copy))}`;
  return {
    valid: recorded === recomputed,
    recorded,
    recomputed,
    issuer_authenticated: false,
    verification_scope: "content_integrity_only",
  };
}

export const RECEIPT_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://ei-trust-receipt.brittanywright.workers.dev/schema/trust-receipt-demo-v0.2.json",
  title: "AI Trust Receipt Demonstration Receipt v0.2",
  type: "object",
  additionalProperties: true,
  required: [
    "receipt_version",
    "receipt_environment",
    "attempt_id",
    "receipt_id",
    "event_time",
    "created_at",
    "gate_decision",
    "action",
    "verification",
    "persistence",
    "integrity",
  ],
  properties: {
    receipt_version: { const: "demo-0.2" },
    receipt_environment: { const: "demonstration" },
    synthetic: { const: true },
    attempt_id: { type: "string", format: "uuid" },
    receipt_id: { type: "string", minLength: 1 },
    event_time: { type: "string", format: "date-time" },
    created_at: { type: "string", format: "date-time" },
    gate_decision: {
      type: "object",
      required: ["result", "failures"],
      properties: {
        result: { enum: ["allow", "deny"] },
        failures: { type: "array" },
      },
    },
    action: { type: "object" },
    verification: { type: "object" },
    persistence: { type: "object" },
    integrity: {
      type: "object",
      required: ["digest_algorithm", "digest"],
      properties: {
        digest_algorithm: { const: "SHA-256" },
        digest: { type: "string", pattern: "^sha256:[a-f0-9]{64}$" },
      },
    },
  },
};
