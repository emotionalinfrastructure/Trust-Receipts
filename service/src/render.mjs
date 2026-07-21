function asRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function display(value) {
  if (["string", "number", "boolean"].includes(typeof value)) return String(value);
  if (value === null) return "null";
  if (value === undefined) return "not recorded";
  return JSON.stringify(value);
}

export function renderHumanDisclosure(receipt) {
  const action = asRecord(receipt.action);
  const authority = asRecord(receipt.authority);
  const agent = asRecord(receipt.agent);
  const consequence = asRecord(receipt.consequence);
  const review = asRecord(receipt.human_review);
  const remedy = asRecord(receipt.remedy);
  const integrity = asRecord(receipt.integrity);
  const evidence = asArray(receipt.material_inputs);
  const delegation = asArray(receipt.delegation);
  const relationships = asArray(receipt.relationships);
  const evidenceViewed = asArray(review.evidence_viewed);

  const lines = [
    "AI TRUST RECEIPT",
    "================",
    `Receipt: ${display(receipt.receipt_id)}`,
    `Event time: ${display(receipt.event_time)}`,
    `Created: ${display(receipt.created_at)}`,
    "",
    "ACTION",
    `Status: ${display(action.status)}`,
    `Type: ${display(action.type)}`,
    `Verb: ${display(action.verb)}`,
    `Target: ${display(action.target)}`,
    `Persistent change: ${display(action.persistent_change)}`,
    "",
    "ACCOUNTABILITY AND AUTHORITY",
    `Agent: ${display(agent.agent_id)}`,
    `Operator: ${display(agent.operator_id)}`,
    `Accountable organization: ${display(agent.accountable_organization)}`,
    `Grant: ${display(authority.grant_id)} (${display(authority.validation_status)})`,
    `Confirmation: ${display(authority.confirmation_status)}`,
    "",
    "CONSEQUENCE AND REVIEW",
    `Class: ${display(consequence.class)}`,
    `Affected party: ${display(consequence.affected_party)}`,
    `Notice required: ${display(consequence.notice_required)}`,
    `Protected third-party information: ${display(consequence.protected_third_party_information)}`,
    `Human review: ${display(review.status)}`,
    "Evidence viewed:",
  ];

  if (evidenceViewed.length === 0) lines.push("  - None");
  else evidenceViewed.forEach((item) => lines.push(`  - ${display(item)}`));

  lines.push("", "MATERIAL EVIDENCE");
  if (evidence.length === 0) lines.push("  - None");
  else {
    evidence.forEach((item) => {
      const record = asRecord(item);
      lines.push(
        `  - ${display(record.evidence_id)}: ${display(record.status)} / ${display(record.freshness)} (${display(record.materiality)})`,
      );
    });
  }

  lines.push("", "DELEGATION");
  if (delegation.length === 0) lines.push("  - None");
  else {
    delegation.forEach((item) => {
      const record = asRecord(item);
      lines.push(`  - ${display(record.recipient_id)} at depth ${display(record.depth)}: ${display(record.task)}`);
    });
  }

  lines.push("", "RELATED RECEIPTS");
  if (relationships.length === 0) lines.push("  - None");
  else {
    relationships.forEach((item) => {
      const record = asRecord(item);
      lines.push(`  - ${display(record.type)}: ${display(record.receipt_id)}`);
    });
  }

  lines.push(
    "",
    "REMEDY",
    `Available: ${display(remedy.available)}`,
    `Reversible: ${display(remedy.reversible)}`,
    `Contestable: ${display(remedy.contestable)}`,
    `Review owner: ${display(remedy.review_owner)}`,
    `Status: ${display(remedy.status_uri)}`,
    "",
    "INTEGRITY",
    `Method: ${display(integrity.method)}`,
    `Profile: ${display(integrity.canonicalization_profile)}`,
    `Digest: ${display(integrity.digest)}`,
    `Recorded verification status: ${display(integrity.verification_status)}`,
    "",
    "This receipt is an event record, not a claim that the action was fair, lawful, or correct.",
  );

  return `${lines.join("\n")}\n`;
}
