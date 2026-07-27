import { APP_NAME, APP_VERSION, CURRENT_DESIGNATION, EVIDENCE_STATUSES } from "./config.mjs";
import { calculateScore } from "./scoring.mjs";
import { ROADMAP } from "./seed.mjs";
import { listEvidence, insertEvidence, saveReview, getReview } from "./store.mjs";
import { buildReviewPrompt, hasForbiddenOverclaim } from "./prompt.mjs";
import { generateReport } from "./openai.mjs";
import { openApi } from "./openapi.mjs";
import { HTML, CSS, JS } from "./ui.mjs";

const MAX_BODY_BYTES = 128 * 1024;
const SECURITY_HEADERS = Object.freeze({
  "strict-transport-security": "max-age=31536000; includeSubDomains",
  "content-security-policy": "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; font-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'; upgrade-insecure-requests",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "no-referrer",
  "permissions-policy": "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  "cross-origin-opener-policy": "same-origin",
  "cross-origin-resource-policy": "same-origin"
});

function response(body, status = 200, headers = {}) { return new Response(body, { status, headers: { ...SECURITY_HEADERS, ...headers } }); }
function json(body, status = 200, headers = {}) { return response(JSON.stringify(body, null, 2), status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers }); }
function methodNotAllowed(allowed) { return json({ error: { code: "METHOD_NOT_ALLOWED", message: `Allowed methods: ${allowed.join(", ")}` } }, 405, { allow: allowed.join(", ") }); }
function requestId(request) { return request.headers.get("cf-ray") || request.headers.get("x-request-id") || crypto.randomUUID(); }
function baseUrl(request, env) { return env.PUBLIC_BASE_URL || new URL(request.url).origin; }
function isAdmin(request, env) { const token = request.headers.get("authorization"); return Boolean(env.ADMIN_TOKEN && token === `Bearer ${env.ADMIN_TOKEN}`); }

async function readJson(request) {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > MAX_BODY_BYTES) throw Object.assign(new Error("Request body exceeds 128 KiB."), { status: 413, code: "BODY_TOO_LARGE" });
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) throw Object.assign(new Error("Request body exceeds 128 KiB."), { status: 413, code: "BODY_TOO_LARGE" });
  try { return JSON.parse(text || "{}"); } catch { throw Object.assign(new Error("Request body must be valid JSON."), { status: 400, code: "INVALID_JSON" }); }
}

function validateEvidence(item) {
  const required = ["claim_id", "claim", "domain", "status"];
  for (const field of required) if (!String(item[field] || "").trim()) throw Object.assign(new Error(`${field} is required.`), { status: 400, code: "VALIDATION_ERROR" });
  if (!EVIDENCE_STATUSES.includes(item.status)) throw Object.assign(new Error(`status must be one of: ${EVIDENCE_STATUSES.join(", ")}`), { status: 400, code: "VALIDATION_ERROR" });
  return Object.fromEntries(Object.entries(item).map(([k, v]) => [k, typeof v === "string" ? v.trim() : v]));
}

export async function handleRequest(request, env = {}) {
  const url = new URL(request.url);
  const rid = requestId(request);
  try {
    if (url.protocol === "http:" && env.APP_ENV === "production") { url.protocol = "https:"; return response(null, 308, { location: url.toString() }); }
    if (url.pathname === "/") return ["GET", "HEAD"].includes(request.method) ? response(request.method === "HEAD" ? null : HTML, 200, { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300" }) : methodNotAllowed(["GET", "HEAD"]);
    if (url.pathname === "/styles.css") return ["GET", "HEAD"].includes(request.method) ? response(request.method === "HEAD" ? null : CSS, 200, { "content-type": "text/css; charset=utf-8", "cache-control": "public, max-age=3600" }) : methodNotAllowed(["GET", "HEAD"]);
    if (url.pathname === "/app.js") return ["GET", "HEAD"].includes(request.method) ? response(request.method === "HEAD" ? null : JS, 200, { "content-type": "text/javascript; charset=utf-8", "cache-control": "public, max-age=3600" }) : methodNotAllowed(["GET", "HEAD"]);
    if (url.pathname === "/health") {
      if (request.method !== "GET") return methodNotAllowed(["GET"]);
      return json({ status: "ok", service: "ei-enterprise-readiness", version: env.APP_VERSION || APP_VERSION, environment: env.APP_ENV || "unknown", dependencies: { d1: env.DB ? "configured" : "not_configured", openai: env.OPENAI_API_KEY ? "configured" : "not_configured" }, claim_posture: "evidence-bound", production_validation: "not_established", request_id: rid });
    }
    if (url.pathname === "/version") {
      if (request.method !== "GET") return methodNotAllowed(["GET"]);
      return json({ service: "ei-enterprise-readiness", version: env.APP_VERSION || APP_VERSION, release: env.RELEASE_ID || null, commit_sha: env.COMMIT_SHA || null, environment: env.APP_ENV || "unknown", operational_owner: "Brittany Wright", source_repository: "emotionalinfrastructure/Trust-Receipts", source_path: "enterprise-readiness/", request_id: rid });
    }
    if (url.pathname === "/openapi.json") return request.method === "GET" ? json(openApi(baseUrl(request, env))) : methodNotAllowed(["GET"]);
    if (url.pathname === "/api/v1/model") {
      if (request.method !== "GET") return methodNotAllowed(["GET"]);
      const evidence = await listEvidence(env); return json({ application: APP_NAME, designation: CURRENT_DESIGNATION, scoring: calculateScore(), evidence_statuses: EVIDENCE_STATUSES, evidence_count: evidence.length, roadmap: ROADMAP.map(([gate, name, exit_criterion]) => ({ gate, name, exit_criterion })), request_id: rid });
    }
    if (url.pathname === "/api/v1/evidence") {
      if (request.method === "GET") return json({ items: await listEvidence(env), request_id: rid });
      if (request.method === "POST") {
        if (!isAdmin(request, env)) return json({ error: { code: "UNAUTHORIZED", message: "Administrator bearer token required." }, request_id: rid }, 401);
        const item = validateEvidence(await readJson(request)); await insertEvidence(env, item); return json({ item, request_id: rid }, 201);
      }
      return methodNotAllowed(["GET", "POST"]);
    }
    if (url.pathname === "/api/v1/score") {
      if (request.method !== "POST") return methodNotAllowed(["POST"]);
      return json({ ...calculateScore(await readJson(request)), request_id: rid });
    }
    if (url.pathname === "/api/v1/reviews/generate") {
      if (request.method !== "POST") return methodNotAllowed(["POST"]);
      if (!isAdmin(request, env)) return json({ error: { code: "UNAUTHORIZED", message: "Administrator bearer token required." }, request_id: rid }, 401);
      const body = await readJson(request); const evidence = await listEvidence(env); const score = calculateScore(body);
      const focus = String(body.focus || "full enterprise readiness").slice(0, 500);
      const prompt = buildReviewPrompt({ score, evidence, focus }); const generated = await generateReport(env, prompt, rid);
      const overclaims = hasForbiddenOverclaim(generated.text); const review = { review_id: crypto.randomUUID(), created_at: new Date().toISOString(), score_100: score.score100, classification: score.classification, focus, evidence_snapshot: evidence, report_markdown: generated.text, overclaim_terms_detected: overclaims, model: generated.model, openai_response_id: generated.response_id, request_id: rid };
      await saveReview(env, review); return json(review, 201);
    }
    const match = url.pathname.match(/^\/api\/v1\/reviews\/([a-f0-9-]+)$/i);
    if (match) { if (request.method !== "GET") return methodNotAllowed(["GET"]); const review = await getReview(env, match[1]); return review ? json({ review, request_id: rid }) : json({ error: { code: "NOT_FOUND", message: "Review not found." }, request_id: rid }, 404); }
    return json({ error: { code: "NOT_FOUND", message: "The requested route does not exist." }, request_id: rid }, 404);
  } catch (error) {
    return json({ error: { code: error.code || "INTERNAL_ERROR", message: error.message || "Unexpected error." }, request_id: rid }, error.status || 500);
  }
}

export default { fetch: handleRequest };
