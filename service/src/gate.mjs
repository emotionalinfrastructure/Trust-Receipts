const CONSEQUENCE_RANK = Object.freeze({ C0: 0, C1: 1, C2: 2, C3: 3 });

function failure(code, field, message) {
  return { code, field, message };
}

function timestamp(value) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function requiredEvidence(evidenceSet) {
  return (evidenceSet.items ?? []).filter((item) => item.materiality === "required");
}

export function evaluateGate(actionRequest, authorityGrant, evidenceSet) {
  const failures = [];
  const requestedAt = timestamp(actionRequest.requested_at);
  const grantedAt = timestamp(authorityGrant.granted_at);
  const expiresAt = timestamp(authorityGrant.expires_at);

  if (authorityGrant.status !== "active") {
    failures.push(failure("GRANT_NOT_ACTIVE", "authority_grant.status", "The authority grant is not active."));
  }
  if (requestedAt !== null && grantedAt !== null && requestedAt < grantedAt) {
    failures.push(failure("GRANT_NOT_YET_VALID", "action_request.requested_at", "The request precedes the grant validity interval."));
  }
  if (requestedAt !== null && expiresAt !== null && requestedAt >= expiresAt) {
    failures.push(failure("GRANT_EXPIRED", "authority_grant.expires_at", "The authority grant has expired."));
  }

  const requestAgent = actionRequest.agent ?? {};
  const grantee = authorityGrant.grantee ?? {};
  if (
    requestAgent.agent_id !== grantee.agent_id ||
    requestAgent.operator_id !== grantee.operator_id ||
    (grantee.deployment_id && requestAgent.deployment_id !== grantee.deployment_id)
  ) {
    failures.push(failure("GRANTEE_MISMATCH", "action_request.agent", "The requesting agent, operator, or deployment does not match the grant."));
  }

  const action = actionRequest.action ?? {};
  const scope = authorityGrant.scope ?? {};
  const allowedActions = scope.allowed_actions ?? [];
  const excludedActions = scope.excluded_actions ?? [];
  if (!allowedActions.includes(action.type) || excludedActions.includes(action.type)) {
    failures.push(failure("ACTION_OUT_OF_SCOPE", "action_request.action.type", "The requested action is outside the grant scope."));
  }
  if (!(scope.allowed_targets ?? []).includes(action.target)) {
    failures.push(failure("TARGET_OUT_OF_SCOPE", "action_request.action.target", "The requested target is outside the grant scope."));
  }

  const requestedConsequence = CONSEQUENCE_RANK[actionRequest.consequence?.class];
  const maximumConsequence = CONSEQUENCE_RANK[scope.max_consequence_class];
  if (
    requestedConsequence === undefined ||
    maximumConsequence === undefined ||
    requestedConsequence > maximumConsequence
  ) {
    failures.push(failure("CONSEQUENCE_EXCEEDS_GRANT", "action_request.consequence.class", "The declared consequence class exceeds the grant ceiling."));
  }

  const confirmationRule = authorityGrant.confirmation ?? {};
  const confirmationApplies = (confirmationRule.required_for ?? []).includes(
    actionRequest.consequence?.class,
  );
  if (
    confirmationApplies &&
    confirmationRule.threshold === "user_confirmation" &&
    actionRequest.confirmation?.status !== "confirmed"
  ) {
    failures.push(failure("CONFIRMATION_REQUIRED", "action_request.confirmation.status", "Confirmed user authorization is required for this action."));
  }

  if (
    confirmationApplies &&
    confirmationRule.threshold === "independent_human_review" &&
    actionRequest.human_review?.status !== "approved"
  ) {
    failures.push(failure("HUMAN_REVIEW_REQUIRED", "action_request.human_review.status", "Independent human approval is required for this action."));
  }

  const delegation = actionRequest.delegation ?? [];
  const delegationRule = authorityGrant.delegation ?? {};
  if (delegation.length > 0 && delegationRule.allowed !== true) {
    failures.push(failure("DELEGATION_PROHIBITED", "action_request.delegation", "The authority grant prohibits delegation."));
  }
  for (const [index, item] of delegation.entries()) {
    if (item.depth > delegationRule.max_depth) {
      failures.push(failure("DELEGATION_DEPTH_EXCEEDED", `action_request.delegation[${index}].depth`, "The delegation depth exceeds the grant maximum."));
    }
    if (!(delegationRule.permitted_recipients ?? []).includes(item.recipient_id)) {
      failures.push(failure("DELEGATE_NOT_PERMITTED", `action_request.delegation[${index}].recipient_id`, "The delegation recipient is not permitted by the grant."));
    }
  }

  const required = requiredEvidence(evidenceSet);
  for (const item of required) {
    if (item.status !== "available") {
      failures.push(failure("REQUIRED_EVIDENCE_UNAVAILABLE", `material_evidence.items.${item.evidence_id}.status`, `Required evidence ${item.evidence_id} is not available.`));
    }
    if (item.freshness !== "current") {
      failures.push(failure("REQUIRED_EVIDENCE_NOT_CURRENT", `material_evidence.items.${item.evidence_id}.freshness`, `Required evidence ${item.evidence_id} is not current.`));
    }
  }

  if (actionRequest.human_review?.status === "approved") {
    const knownEvidence = new Set((evidenceSet.items ?? []).map((item) => item.evidence_id));
    const viewedEvidence = new Set(actionRequest.human_review.evidence_viewed ?? []);
    const missingViewed = required.filter((item) => !viewedEvidence.has(item.evidence_id));
    const unknownViewed = [...viewedEvidence].filter((id) => !knownEvidence.has(id));
    if (missingViewed.length > 0 || unknownViewed.length > 0) {
      failures.push(
        failure(
          "HUMAN_REVIEW_REQUIRED",
          "action_request.human_review.evidence_viewed",
          "Approved human review must explicitly identify every required evidence item viewed and may not identify unknown evidence.",
        ),
      );
    }
  }

  if (evidenceSet.receipt_service_available !== true) {
    failures.push(failure("RECEIPT_SERVICE_UNAVAILABLE", "material_evidence.receipt_service_available", "A durable receipt cannot be produced."));
  }
  if (
    ["C2", "C3"].includes(actionRequest.consequence?.class) &&
    evidenceSet.remedy_service_available !== true
  ) {
    failures.push(failure("REMEDY_SERVICE_UNAVAILABLE", "material_evidence.remedy_service_available", "An operational remedy pathway is required for C2 and C3 actions."));
  }

  return {
    decision: failures.length === 0 ? "allow" : "deny",
    failures,
    evaluated_at: new Date().toISOString(),
  };
}
