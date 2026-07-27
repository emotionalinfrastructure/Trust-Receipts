import { SEED_EVIDENCE } from "./seed.mjs";

export async function listEvidence(env) {
  if (!env.DB) return SEED_EVIDENCE;
  const result = await env.DB.prepare("SELECT claim_id, claim, domain, status, document, repository, module, commit_sha, release, deployment_url, test_evidence, public_page, external_validation, notes, created_at, updated_at FROM evidence_items ORDER BY claim_id").all();
  return result.results?.length ? result.results : SEED_EVIDENCE;
}

export async function insertEvidence(env, item) {
  if (!env.DB) throw Object.assign(new Error("D1 database is not configured."), { status: 503, code: "DATABASE_NOT_CONFIGURED" });
  await env.DB.prepare(`INSERT INTO evidence_items (claim_id, claim, domain, status, document, repository, module, commit_sha, release, deployment_url, test_evidence, public_page, external_validation, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(item.claim_id, item.claim, item.domain, item.status, item.document ?? null, item.repository ?? null, item.module ?? null, item.commit_sha ?? null, item.release ?? null, item.deployment_url ?? null, item.test_evidence ?? null, item.public_page ?? null, item.external_validation ?? null, item.notes ?? null).run();
  return item;
}

export async function saveReview(env, review) {
  if (!env.DB) return;
  await env.DB.prepare("INSERT INTO review_runs (review_id, score_100, classification, focus, evidence_snapshot, report_markdown, model, request_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(review.review_id, review.score_100, review.classification, review.focus, JSON.stringify(review.evidence_snapshot), review.report_markdown, review.model, review.request_id).run();
}

export async function getReview(env, id) {
  if (!env.DB) return null;
  return env.DB.prepare("SELECT * FROM review_runs WHERE review_id = ?").bind(id).first();
}
