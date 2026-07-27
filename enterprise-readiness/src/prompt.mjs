import { CURRENT_DESIGNATION } from "./config.mjs";

const FORBIDDEN = ["certified", "compliant", "adopted", "approved", "enterprise-proven", "academically validated", "standards-conformant"];

export function buildReviewPrompt({ score, evidence, focus = "full enterprise readiness" }) {
  const evidenceText = evidence.map((e) => `- [${e.status}] ${e.claim}${e.notes ? ` — ${e.notes}` : ""}`).join("\n");
  return `You are an evidence-disciplined enterprise due-diligence reviewer.\n\nEvaluate Emotional Infrastructure™ as an integrated research, technology, governance, and commercial system. The deterministic score is ${score.score100}/100 (${score.classification}). Do not recalculate or alter it.\n\nCurrent designation:\n${CURRENT_DESIGNATION}\n\nReview focus: ${focus}\n\nEvidence inventory:\n${evidenceText}\n\nRequired output sections: Executive verdict; principal strengths; critical blockers; evidence boundaries; go/conditional-go/no-go by use case; Version 1.0 release gates. Clearly separate verified evidence from assertion and unresolved evidence. Use mapped to, supports, candidate alignment, implementation-oriented, reference implementation, proposed, provisional, or evidence-bound. Never claim ${FORBIDDEN.join(", ")} without an explicit external determination in the evidence. Return professional Markdown.`;
}

export function hasForbiddenOverclaim(text) {
  const lower = String(text).toLowerCase();
  return FORBIDDEN.filter((term) => lower.includes(term));
}
