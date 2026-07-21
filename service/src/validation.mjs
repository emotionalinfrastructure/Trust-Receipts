const ACTION_STATUS = new Set(["attempted", "executed", "denied", "delegated", "escalated", "reversed", "expired"]);
const CONSEQUENCE = new Set(["C0", "C1", "C2", "C3"]);
const CONFIRMATION = new Set(["not_required", "pending", "confirmed", "denied"]);
const REVIEW = new Set(["none", "pending", "approved", "rejected"]);

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function push(errors, field, message) {
  errors.push({ field, message });
}

function requireObject(errors, value, field) {
  if (!isObject(value)) {
    push(errors, field, "must be an object");
    return false;
  }
  return true;
}

function requireArray(errors, value, field, { min = 0, max = 100 } = {}) {
  if (!Array.isArray(value)) {
    push(errors, field, "must be an array");
    return false;
  }
  if (value.length < min || value.length > max) {
    push(errors, field, `must contain between ${min} and ${max} items`);
  }
  return true;
}

function requireString(errors, value, field, { min = 1, max = 1000, pattern } = {}) {
  if (typeof value !== "string" || value.length < min || value.length > max) {
    push(errors, field, `must be a string between ${min} and ${max} characters`);
    return false;
  }
  if (pattern && !pattern.test(value)) push(errors, field, "has an invalid format");
  return true;
}

function requireBoolean(errors, value, field) {
  if (typeof value !== "boolean") push(errors, field, "must be a boolean");
}

function requireInteger(errors, value, field, min, max) {
  if (!Number.isInteger(value) || value < min || value > max) {
    push(errors, field, `must be an integer between ${min} and ${max}`);
  }
}

function requireEnum(errors, value, field, allowed) {
  if (!allowed.has(value)) push(errors, field, `must be one of: ${[...allowed].join(", ")}`);
}

function requireDateTime(errors, value, field) {
  if (!requireString(errors, value, field, { max: 80 })) return;
  if (!/[zZ]|[+-]\d\d:\d\d$/u.test(value) || !Number.isFinite(Date.parse(value))) {
    push(errors, field, "must be a valid date-time with an explicit UTC offset");
  }
}

function requireHttpsUrl(errors, value, field) {
  if (!requireString(errors, value, field, { max: 500 })) return;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") push(errors, field, "must be an absolute HTTPS URL");
  } catch {
    push(errors, field, "must be an absolute HTTPS URL");
  }
}

function rejectUnknown(errors, value, field, allowed) {
  if (!isObject(value)) return;
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) push(errors, `${field}.${key}`, "is not permitted");
  }
}

function validateActionRequest(errors, request) {
  if (!requireObject(errors, request, "action_request")) return;
  rejectUnknown(errors, request, "action_request", new Set(["request_id", "requested_at", "agent", "action", "consequence", "confirmation", "human_review", "delegation"]));
  requireString(errors, request.request_id, "action_request.request_id", { max: 160 });
  requireDateTime(errors, request.requested_at, "action_request.requested_at");

  if (requireObject(errors, request.agent, "action_request.agent")) {
    rejectUnknown(errors, request.agent, "action_request.agent", new Set(["agent_id", "operator_id", "deployment_id", "version", "accountable_organization"]));
    requireString(errors, request.agent.agent_id, "action_request.agent.agent_id", { max: 160 });
    requireString(errors, request.agent.operator_id, "action_request.agent.operator_id", { max: 160 });
    requireString(errors, request.agent.accountable_organization, "action_request.agent.accountable_organization", { max: 200 });
    if (request.agent.deployment_id !== undefined) requireString(errors, request.agent.deployment_id, "action_request.agent.deployment_id", { max: 160 });
    if (request.agent.version !== undefined) requireString(errors, request.agent.version, "action_request.agent.version", { max: 100 });
  }

  if (requireObject(errors, request.action, "action_request.action")) {
    rejectUnknown(errors, request.action, "action_request.action", new Set(["type", "verb", "target", "before_state", "proposed_after_state", "persistent_change", "reversible"]));
    requireString(errors, request.action.type, "action_request.action.type", { max: 128, pattern: /^[a-z][a-z0-9_.-]{2,127}$/u });
    requireString(errors, request.action.verb, "action_request.action.verb", { max: 80 });
    requireString(errors, request.action.target, "action_request.action.target", { max: 200 });
    if (request.action.before_state !== null) requireObject(errors, request.action.before_state, "action_request.action.before_state");
    if (request.action.proposed_after_state !== null) requireObject(errors, request.action.proposed_after_state, "action_request.action.proposed_after_state");
    requireBoolean(errors, request.action.persistent_change, "action_request.action.persistent_change");
    if (request.action.reversible !== undefined) requireBoolean(errors, request.action.reversible, "action_request.action.reversible");
  }

  if (requireObject(errors, request.consequence, "action_request.consequence")) {
    rejectUnknown(errors, request.consequence, "action_request.consequence", new Set(["class", "affected_party", "notice_required", "rationale", "protected_third_party_information"]));
    requireEnum(errors, request.consequence.class, "action_request.consequence.class", CONSEQUENCE);
    requireBoolean(errors, request.consequence.affected_party, "action_request.consequence.affected_party");
    requireBoolean(errors, request.consequence.notice_required, "action_request.consequence.notice_required");
    if (request.consequence.rationale !== undefined) requireString(errors, request.consequence.rationale, "action_request.consequence.rationale", { max: 1200 });
    if (request.consequence.protected_third_party_information !== undefined) requireBoolean(errors, request.consequence.protected_third_party_information, "action_request.consequence.protected_third_party_information");
  }

  if (requireObject(errors, request.confirmation, "action_request.confirmation")) {
    rejectUnknown(errors, request.confirmation, "action_request.confirmation", new Set(["status", "confirmed_at", "confirmation_id"]));
    requireEnum(errors, request.confirmation.status, "action_request.confirmation.status", CONFIRMATION);
    if (request.confirmation.confirmed_at !== undefined) requireDateTime(errors, request.confirmation.confirmed_at, "action_request.confirmation.confirmed_at");
    if (request.confirmation.confirmation_id !== undefined) requireString(errors, request.confirmation.confirmation_id, "action_request.confirmation.confirmation_id", { max: 160 });
  }

  if (requireObject(errors, request.human_review, "action_request.human_review")) {
    rejectUnknown(errors, request.human_review, "action_request.human_review", new Set(["status", "reviewer_role", "review_id", "reviewed_at", "evidence_viewed"]));
    requireEnum(errors, request.human_review.status, "action_request.human_review.status", REVIEW);
    if (request.human_review.reviewer_role !== undefined) requireString(errors, request.human_review.reviewer_role, "action_request.human_review.reviewer_role", { max: 160 });
    if (request.human_review.review_id !== undefined) requireString(errors, request.human_review.review_id, "action_request.human_review.review_id", { max: 160 });
    if (request.human_review.reviewed_at !== undefined) requireDateTime(errors, request.human_review.reviewed_at, "action_request.human_review.reviewed_at");
    if (request.human_review.evidence_viewed !== undefined && requireArray(errors, request.human_review.evidence_viewed, "action_request.human_review.evidence_viewed", { max: 100 })) {
      request.human_review.evidence_viewed.forEach((item, index) => requireString(errors, item, `action_request.human_review.evidence_viewed[${index}]`, { max: 160 }));
    }
  }

  if (request.delegation !== undefined && requireArray(errors, request.delegation, "action_request.delegation", { max: 20 })) {
    request.delegation.forEach((item, index) => {
      const field = `action_request.delegation[${index}]`;
      if (!requireObject(errors, item, field)) return;
      rejectUnknown(errors, item, field, new Set(["recipient_id", "task", "authority_passed", "depth"]));
      requireString(errors, item.recipient_id, `${field}.recipient_id`, { max: 160 });
      requireString(errors, item.task, `${field}.task`, { max: 500 });
      requireString(errors, item.authority_passed, `${field}.authority_passed`, { max: 500 });
      requireInteger(errors, item.depth, `${field}.depth`, 1, 10);
    });
  }
}

function validateAuthorityGrant(errors, grant) {
  if (!requireObject(errors, grant, "authority_grant")) return;
  rejectUnknown(errors, grant, "authority_grant", new Set(["schema_version", "grant_id", "granting_party", "grantee", "objective", "scope", "granted_at", "expires_at", "confirmation", "delegation", "status", "revocation"]));
  if (grant.schema_version !== "0.1") push(errors, "authority_grant.schema_version", "must equal 0.1");
  requireString(errors, grant.grant_id, "authority_grant.grant_id", { max: 128, pattern: /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/u });
  requireDateTime(errors, grant.granted_at, "authority_grant.granted_at");
  requireDateTime(errors, grant.expires_at, "authority_grant.expires_at");
  requireEnum(errors, grant.status, "authority_grant.status", new Set(["active", "revoked", "expired", "suspended"]));

  if (requireObject(errors, grant.granting_party, "authority_grant.granting_party")) {
    rejectUnknown(errors, grant.granting_party, "authority_grant.granting_party", new Set(["party_id", "display_name", "contact_uri"]));
    requireString(errors, grant.granting_party.party_id, "authority_grant.granting_party.party_id", { max: 160 });
    requireString(errors, grant.granting_party.display_name, "authority_grant.granting_party.display_name", { max: 200 });
  }
  if (requireObject(errors, grant.grantee, "authority_grant.grantee")) {
    rejectUnknown(errors, grant.grantee, "authority_grant.grantee", new Set(["agent_id", "operator_id", "deployment_id"]));
    requireString(errors, grant.grantee.agent_id, "authority_grant.grantee.agent_id", { max: 160 });
    requireString(errors, grant.grantee.operator_id, "authority_grant.grantee.operator_id", { max: 160 });
    if (grant.grantee.deployment_id !== undefined) requireString(errors, grant.grantee.deployment_id, "authority_grant.grantee.deployment_id", { max: 160 });
  }
  if (requireObject(errors, grant.objective, "authority_grant.objective")) {
    rejectUnknown(errors, grant.objective, "authority_grant.objective", new Set(["description", "version", "hard_constraints", "permitted_preferences", "ambiguity_behavior"]));
    requireString(errors, grant.objective.description, "authority_grant.objective.description", { max: 1000 });
    requireString(errors, grant.objective.version, "authority_grant.objective.version", { max: 64 });
    if (requireArray(errors, grant.objective.hard_constraints, "authority_grant.objective.hard_constraints", { max: 50 })) {
      grant.objective.hard_constraints.forEach((item, index) => requireString(errors, item, `authority_grant.objective.hard_constraints[${index}]`, { max: 500 }));
    }
  }
  if (requireObject(errors, grant.scope, "authority_grant.scope")) {
    rejectUnknown(errors, grant.scope, "authority_grant.scope", new Set(["allowed_actions", "allowed_targets", "excluded_actions", "max_consequence_class"]));
    for (const name of ["allowed_actions", "allowed_targets", "excluded_actions"]) {
      const min = name === "excluded_actions" ? 0 : 1;
      if (requireArray(errors, grant.scope[name], `authority_grant.scope.${name}`, { min, max: 100 })) {
        grant.scope[name].forEach((item, index) => requireString(errors, item, `authority_grant.scope.${name}[${index}]`, { max: 200 }));
      }
    }
    requireEnum(errors, grant.scope.max_consequence_class, "authority_grant.scope.max_consequence_class", CONSEQUENCE);
  }
  if (requireObject(errors, grant.confirmation, "authority_grant.confirmation")) {
    rejectUnknown(errors, grant.confirmation, "authority_grant.confirmation", new Set(["threshold", "required_for"]));
    requireEnum(errors, grant.confirmation.threshold, "authority_grant.confirmation.threshold", new Set(["none", "user_confirmation", "independent_human_review"]));
    if (requireArray(errors, grant.confirmation.required_for, "authority_grant.confirmation.required_for", { max: 4 })) {
      grant.confirmation.required_for.forEach((item, index) => requireEnum(errors, item, `authority_grant.confirmation.required_for[${index}]`, CONSEQUENCE));
    }
  }
  if (requireObject(errors, grant.delegation, "authority_grant.delegation")) {
    rejectUnknown(errors, grant.delegation, "authority_grant.delegation", new Set(["allowed", "max_depth", "permitted_recipients"]));
    requireBoolean(errors, grant.delegation.allowed, "authority_grant.delegation.allowed");
    requireInteger(errors, grant.delegation.max_depth, "authority_grant.delegation.max_depth", 0, 10);
    if (requireArray(errors, grant.delegation.permitted_recipients, "authority_grant.delegation.permitted_recipients", { max: 100 })) {
      grant.delegation.permitted_recipients.forEach((item, index) => requireString(errors, item, `authority_grant.delegation.permitted_recipients[${index}]`, { max: 160 }));
    }
  }
}

function validateEvidence(errors, evidence) {
  if (!requireObject(errors, evidence, "material_evidence")) return;
  rejectUnknown(errors, evidence, "material_evidence", new Set(["evidence_set_id", "items", "receipt_service_available", "remedy_service_available"]));
  requireString(errors, evidence.evidence_set_id, "material_evidence.evidence_set_id", { max: 160 });
  requireBoolean(errors, evidence.receipt_service_available, "material_evidence.receipt_service_available");
  requireBoolean(errors, evidence.remedy_service_available, "material_evidence.remedy_service_available");
  if (requireArray(errors, evidence.items, "material_evidence.items", { min: 1, max: 100 })) {
    evidence.items.forEach((item, index) => {
      const field = `material_evidence.items[${index}]`;
      if (!requireObject(errors, item, field)) return;
      rejectUnknown(errors, item, field, new Set(["evidence_id", "category", "provenance", "materiality", "status", "freshness", "observed_at", "value_reference"]));
      requireString(errors, item.evidence_id, `${field}.evidence_id`, { max: 160 });
      requireString(errors, item.category, `${field}.category`, { max: 160 });
      requireString(errors, item.provenance, `${field}.provenance`, { max: 500 });
      requireEnum(errors, item.materiality, `${field}.materiality`, new Set(["required", "supporting"]));
      requireEnum(errors, item.status, `${field}.status`, new Set(["available", "disputed", "incomplete", "unavailable"]));
      requireEnum(errors, item.freshness, `${field}.freshness`, new Set(["current", "stale", "unknown"]));
    });
  }
}

function validateExecutionResult(errors, result) {
  if (!requireObject(errors, result, "execution_result")) return;
  rejectUnknown(errors, result, "execution_result", new Set(["status", "event_time", "after_state", "exception_code", "delegation_results"]));
  requireEnum(errors, result.status, "execution_result.status", ACTION_STATUS);
  requireDateTime(errors, result.event_time, "execution_result.event_time");
  if (result.after_state !== null) requireObject(errors, result.after_state, "execution_result.after_state");
  if (result.exception_code !== undefined) requireString(errors, result.exception_code, "execution_result.exception_code", { max: 160 });
  if (result.delegation_results !== undefined && requireArray(errors, result.delegation_results, "execution_result.delegation_results", { max: 20 })) {
    result.delegation_results.forEach((item, index) => {
      const field = `execution_result.delegation_results[${index}]`;
      if (!requireObject(errors, item, field)) return;
      rejectUnknown(errors, item, field, new Set(["recipient_id", "evidence_returned"]));
      requireString(errors, item.recipient_id, `${field}.recipient_id`, { max: 160 });
      requireBoolean(errors, item.evidence_returned, `${field}.evidence_returned`);
    });
  }
}

function validateContext(errors, context) {
  if (!requireObject(errors, context, "receipt_context")) return;
  rejectUnknown(errors, context, "receipt_context", new Set(["remedy", "privacy", "relationships", "human_review_record"]));

  if (requireObject(errors, context.remedy, "receipt_context.remedy")) {
    rejectUnknown(errors, context.remedy, "receipt_context.remedy", new Set(["available", "reversible", "contestable", "restoration_steps", "review_owner", "status_uri", "time_limit"]));
    requireBoolean(errors, context.remedy.available, "receipt_context.remedy.available");
    requireBoolean(errors, context.remedy.reversible, "receipt_context.remedy.reversible");
    requireBoolean(errors, context.remedy.contestable, "receipt_context.remedy.contestable");
    requireString(errors, context.remedy.review_owner, "receipt_context.remedy.review_owner", { max: 200 });
    requireHttpsUrl(errors, context.remedy.status_uri, "receipt_context.remedy.status_uri");
    requireString(errors, context.remedy.time_limit, "receipt_context.remedy.time_limit", { max: 200 });
    if (context.remedy.restoration_steps !== undefined) requireString(errors, context.remedy.restoration_steps, "receipt_context.remedy.restoration_steps", { max: 2000 });
  }

  if (requireObject(errors, context.privacy, "receipt_context.privacy")) {
    rejectUnknown(errors, context.privacy, "receipt_context.privacy", new Set(["retention_basis", "routine_access_expires", "access_roles", "prohibited_secondary_uses", "chain_of_thought_excluded", "deletion_uri"]));
    requireString(errors, context.privacy.retention_basis, "receipt_context.privacy.retention_basis", { max: 1000 });
    requireDateTime(errors, context.privacy.routine_access_expires, "receipt_context.privacy.routine_access_expires");
    for (const name of ["access_roles", "prohibited_secondary_uses"]) {
      if (requireArray(errors, context.privacy[name], `receipt_context.privacy.${name}`, { min: 1, max: 50 })) {
        context.privacy[name].forEach((item, index) => requireString(errors, item, `receipt_context.privacy.${name}[${index}]`, { max: 200 }));
      }
    }
    if (context.privacy.chain_of_thought_excluded !== true) push(errors, "receipt_context.privacy.chain_of_thought_excluded", "must be true");
    if (context.privacy.deletion_uri !== undefined) requireHttpsUrl(errors, context.privacy.deletion_uri, "receipt_context.privacy.deletion_uri");
  }

  if (context.relationships !== undefined && requireArray(errors, context.relationships, "receipt_context.relationships", { max: 50 })) {
    context.relationships.forEach((item, index) => {
      const field = `receipt_context.relationships[${index}]`;
      if (!requireObject(errors, item, field)) return;
      rejectUnknown(errors, item, field, new Set(["type", "receipt_id"]));
      requireEnum(errors, item.type, `${field}.type`, new Set(["supersedes", "reverses", "follows", "delegated_from", "remedies"]));
      requireString(errors, item.receipt_id, `${field}.receipt_id`, { max: 220, pattern: /^urn:trust-receipt:/u });
    });
  }

  if (context.human_review_record !== undefined && requireObject(errors, context.human_review_record, "receipt_context.human_review_record")) {
    rejectUnknown(errors, context.human_review_record, "receipt_context.human_review_record", new Set(["authority_to_intervene", "disposition"]));
    requireBoolean(errors, context.human_review_record.authority_to_intervene, "receipt_context.human_review_record.authority_to_intervene");
    if (context.human_review_record.disposition !== undefined) requireString(errors, context.human_review_record.disposition, "receipt_context.human_review_record.disposition", { max: 500 });
  }
}

export function validateIssueEnvelope(value) {
  const errors = [];
  if (!requireObject(errors, value, "$")) return errors;
  rejectUnknown(errors, value, "$", new Set(["action_request", "authority_grant", "material_evidence", "execution_result", "receipt_context"]));
  validateActionRequest(errors, value.action_request);
  validateAuthorityGrant(errors, value.authority_grant);
  validateEvidence(errors, value.material_evidence);
  validateExecutionResult(errors, value.execution_result);
  validateContext(errors, value.receipt_context);
  return errors;
}

export function validateDecisionEnvelope(value) {
  const errors = [];
  if (!requireObject(errors, value, "$")) return errors;
  rejectUnknown(errors, value, "$", new Set(["action_request", "authority_grant", "material_evidence", "receipt_context"]));
  validateActionRequest(errors, value.action_request);
  validateAuthorityGrant(errors, value.authority_grant);
  validateEvidence(errors, value.material_evidence);
  validateContext(errors, value.receipt_context);
  return errors;
}

export function validateExecutionResultInput(value) {
  const errors = [];
  validateExecutionResult(errors, value);
  return errors;
}
