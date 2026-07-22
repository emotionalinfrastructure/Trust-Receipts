import { evaluateGate } from "./gate.mjs";
import {
  constantTimeTextEqual,
  publicJwkFromSpki,
  randomId,
  randomToken,
  sha256Text,
} from "./crypto.mjs";
import { issueReceipt, verifyIssuedReceipt } from "./receipt.mjs";
import { verifyReceiptDigest } from "./canonical.mjs";
import { renderHumanDisclosure } from "./render.mjs";
import {
  validateDecisionEnvelope,
  validateExecutionResultInput,
} from "./validation.mjs";
import openapiDocument from "../openapi.json" with { type: "json" };

const SERVICE_VERSION = openapiDocument.info?.version ?? "unknown";
const SERVICE_REPOSITORY = "https://github.com/emotionalinfrastructure/Trust-Receipts";

const MAX_BODY_BYTES = 256 * 1024;
const DEFAULT_SCOPES = [
  "decisions:evaluate",
  "receipts:finalize",
  "receipts:revoke",
  "receipts:read",
  "remedies:manage",
];

class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function nowIso() {
  return new Date().toISOString();
}

function allowedOrigins(env) {
  return new Set(
    String(env.ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

function corsHeaders(request, env) {
  const origin = request.headers.get("origin");
  const allowed = allowedOrigins(env);
  const headers = {
    "access-control-allow-headers": "authorization, content-type, x-decision-token",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
  if (origin && (allowed.has(origin) || allowed.has("*"))) {
    headers["access-control-allow-origin"] = allowed.has("*") ? "*" : origin;
  }
  return headers;
}

function jsonResponse(request, env, body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
      ...corsHeaders(request, env),
      ...extraHeaders,
    },
  });
}

async function readJson(request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    throw new HttpError(413, "BODY_TOO_LARGE", "Request body exceeds 256 KiB.");
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
    throw new HttpError(413, "BODY_TOO_LARGE", "Request body exceeds 256 KiB.");
  }
  try {
    return JSON.parse(text || "{}");
  } catch {
    throw new HttpError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }
}

function bearerToken(request) {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/iu.exec(header);
  return match?.[1] ?? null;
}

function parseScopes(value) {
  try {
    const scopes = JSON.parse(value);
    return Array.isArray(scopes) ? scopes : [];
  } catch {
    return [];
  }
}

async function requireApiKey(request, env, requiredScope) {
  const token = bearerToken(request);
  if (!token) throw new HttpError(401, "AUTHENTICATION_REQUIRED", "A bearer API key is required.");
  const hash = await sha256Text(token);
  const row = await env.DB.prepare(
    "SELECT key_hash, organization_id, label, scopes_json, status FROM api_keys WHERE key_hash = ?",
  )
    .bind(hash)
    .first();
  if (!row || row.status !== "active") {
    throw new HttpError(401, "INVALID_API_KEY", "The API key is invalid or inactive.");
  }
  const scopes = parseScopes(row.scopes_json);
  if (!scopes.includes(requiredScope) && !scopes.includes("admin:*")) {
    throw new HttpError(403, "INSUFFICIENT_SCOPE", `The API key lacks ${requiredScope}.`);
  }
  await env.DB.prepare("UPDATE api_keys SET last_used_at = ? WHERE key_hash = ?")
    .bind(nowIso(), hash)
    .run();
  return { ...row, scopes };
}

function issuerConfig(env) {
  const required = [
    "PUBLIC_BASE_URL",
    "ISSUER_ORGANIZATION_ID",
    "ISSUER_DISPLAY_NAME",
    "ISSUER_KEY_ID",
    "ISSUER_PRIVATE_KEY_PKCS8_BASE64",
    "ISSUER_PUBLIC_KEY_SPKI_BASE64",
  ];
  const missing = required.filter((name) => !env[name]);
  if (missing.length > 0) {
    throw new HttpError(503, "ISSUER_NOT_CONFIGURED", `Missing issuer configuration: ${missing.join(", ")}`);
  }
  let publicBaseUrl;
  try {
    publicBaseUrl = new URL(env.PUBLIC_BASE_URL);
  } catch {
    throw new HttpError(503, "ISSUER_NOT_CONFIGURED", "PUBLIC_BASE_URL must be an absolute HTTPS URL.");
  }
  if (publicBaseUrl.protocol !== "https:") {
    throw new HttpError(503, "ISSUER_NOT_CONFIGURED", "PUBLIC_BASE_URL must use HTTPS.");
  }
  return {
    issuer: {
      publicBaseUrl: env.PUBLIC_BASE_URL,
      organizationId: env.ISSUER_ORGANIZATION_ID,
      displayName: env.ISSUER_DISPLAY_NAME,
    },
    signing: {
      keyId: env.ISSUER_KEY_ID,
      privateKeyBase64: env.ISSUER_PRIVATE_KEY_PKCS8_BASE64,
      publicKeyBase64: env.ISSUER_PUBLIC_KEY_SPKI_BASE64,
    },
  };
}

async function insertAudit(env, eventType, actor, subject, details) {
  await env.DB.prepare(
    "INSERT INTO audit_events (event_id, event_type, actor, subject, details_json, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  )
    .bind(randomId("audit"), eventType, actor, subject, JSON.stringify(details ?? {}), nowIso())
    .run();
}

async function getReceiptRecord(env, receiptId) {
  return env.DB.prepare(
    `SELECT receipt_id, organization_id, receipt_json, assertion_json, access_token_hash, revoked_at, revocation_reason
     FROM receipts WHERE receipt_id = ?`,
  )
    .bind(receiptId)
    .first();
}

async function authorizeReceiptAccess(request, env, record) {
  const token = bearerToken(request);
  if (!token) {
    throw new HttpError(401, "RECEIPT_ACCESS_REQUIRED", "Use a receipt access token or scoped API key as a bearer token.");
  }
  const hash = await sha256Text(token);
  if (record.access_token_hash && await constantTimeTextEqual(hash, record.access_token_hash)) {
    return { actor: "receipt-holder", organization_id: record.organization_id };
  }
  const apiKey = await env.DB.prepare(
    "SELECT key_hash, organization_id, scopes_json, status FROM api_keys WHERE key_hash = ?",
  ).bind(hash).first();
  if (apiKey && apiKey.status === "active" && apiKey.organization_id === record.organization_id) {
    const scopes = parseScopes(apiKey.scopes_json);
    if (scopes.includes("receipts:read") || scopes.includes("admin:*")) {
      await env.DB.prepare("UPDATE api_keys SET last_used_at = ? WHERE key_hash = ?")
        .bind(nowIso(), hash)
        .run();
      return { actor: apiKey.organization_id, organization_id: apiKey.organization_id };
    }
  }
  throw new HttpError(404, "RECEIPT_NOT_FOUND", "The receipt does not exist or the credential is not authorized.");
}

function decisionTtlSeconds(env) {
  const parsed = Number(env.DECISION_TTL_SECONDS ?? 600);
  if (!Number.isFinite(parsed)) return 600;
  return Math.max(60, Math.min(Math.trunc(parsed), 3600));
}

async function currentPublicJwk(env) {
  const config = issuerConfig(env);
  return publicJwkFromSpki(config.signing.publicKeyBase64, config.signing.keyId);
}

async function handleBootstrap(request, env) {
  const token = bearerToken(request);
  if (!token || !env.BOOTSTRAP_ADMIN_TOKEN || !(await constantTimeTextEqual(token, env.BOOTSTRAP_ADMIN_TOKEN))) {
    throw new HttpError(401, "BOOTSTRAP_AUTHENTICATION_FAILED", "The bootstrap credential is invalid.");
  }
  const body = await readJson(request);
  const organizationId = body.organization_id ?? env.ISSUER_ORGANIZATION_ID;
  const label = body.label ?? "initial operational key";
  const scopes = Array.isArray(body.scopes) && body.scopes.length > 0 ? body.scopes : DEFAULT_SCOPES;
  if (typeof organizationId !== "string" || organizationId.length < 1 || organizationId.length > 160) {
    throw new HttpError(422, "INVALID_ORGANIZATION", "organization_id must be a non-empty string of at most 160 characters.");
  }
  if (!scopes.every((scope) => DEFAULT_SCOPES.includes(scope) || scope === "admin:*")) {
    throw new HttpError(422, "INVALID_SCOPE", "One or more requested scopes are unsupported.");
  }

  const apiKey = randomToken("tr_live");
  const keyHash = await sha256Text(apiKey);
  const publicJwk = await currentPublicJwk(env);
  const createdAt = nowIso();
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO api_keys
       (key_hash, key_prefix, organization_id, label, scopes_json, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'active', ?)`,
    ).bind(keyHash, apiKey.slice(0, 16), organizationId, label, JSON.stringify(scopes), createdAt),
    env.DB.prepare(
      `INSERT INTO issuer_keys
       (key_id, algorithm, public_jwk_json, status, created_at)
       VALUES (?, 'Ed25519', ?, 'active', ?)
       ON CONFLICT(key_id) DO UPDATE SET public_jwk_json = excluded.public_jwk_json, status = 'active'`,
    ).bind(env.ISSUER_KEY_ID, JSON.stringify(publicJwk), createdAt),
  ]);
  await insertAudit(env, "bootstrap.api_key_created", "bootstrap", organizationId, {
    label,
    scopes,
    key_prefix: apiKey.slice(0, 16),
  });
  return jsonResponse(request, env, {
    api_key: apiKey,
    warning: "This plaintext API key is returned once. Store it in an approved secret manager.",
    organization_id: organizationId,
    scopes,
    issuer_key: publicJwk,
  }, 201);
}

async function handleCreateDecision(request, env) {
  const auth = await requireApiKey(request, env, "decisions:evaluate");
  const body = await readJson(request);
  const errors = validateDecisionEnvelope(body);
  if (errors.length > 0) {
    throw new HttpError(422, "SCHEMA_VALIDATION_FAILED", "The decision request is structurally invalid.", errors);
  }

  const config = issuerConfig(env);
  const gate = evaluateGate(body.action_request, body.authority_grant, body.material_evidence);
  const createdAt = nowIso();
  const decisionId = randomId("decision");
  const ttlSeconds = decisionTtlSeconds(env);
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  const decisionToken = randomToken("tr_decision");
  const decisionTokenHash = await sha256Text(decisionToken);

  if (gate.decision === "deny") {
    const executionResult = {
      status: "denied",
      event_time: createdAt,
      after_state: body.action_request.action.before_state,
    };
    const issued = await issueReceipt({
      envelope: { ...body, execution_result: executionResult },
      gate,
      ...config,
      createdAt,
    });
    const receiptAccessToken = randomToken("tr_receipt");
    const receiptAccessTokenHash = await sha256Text(receiptAccessToken);
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO decisions
         (decision_id, organization_id, request_json, grant_json, evidence_json, context_json, gate_json, state, created_at, expires_at, finalized_receipt_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'denied', ?, ?, ?)`,
      ).bind(
        decisionId,
        auth.organization_id,
        JSON.stringify(body.action_request),
        JSON.stringify(body.authority_grant),
        JSON.stringify(body.material_evidence),
        JSON.stringify(body.receipt_context),
        JSON.stringify(gate),
        createdAt,
        expiresAt,
        issued.receipt.receipt_id,
      ),
      env.DB.prepare(
        `INSERT INTO receipts
         (receipt_id, organization_id, action_type, action_status, consequence_class, digest, key_id, receipt_json, assertion_json, access_token_hash, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        issued.receipt.receipt_id,
        auth.organization_id,
        issued.receipt.action.type,
        issued.receipt.action.status,
        issued.receipt.consequence.class,
        issued.receipt.integrity.digest,
        issued.issuer_assertion.key_id,
        JSON.stringify(issued.receipt),
        JSON.stringify(issued.issuer_assertion),
        receiptAccessTokenHash,
        issued.receipt.created_at,
      ),
    ]);
    await insertAudit(env, "decision.denied", auth.organization_id, decisionId, {
      failures: gate.failures,
      receipt_id: issued.receipt.receipt_id,
    });
    return jsonResponse(request, env, {
      decision_id: decisionId,
      decision: "deny",
      failures: gate.failures,
      receipt: issued.receipt,
      human_disclosure: renderHumanDisclosure(issued.receipt),
      issuer_assertion: issued.issuer_assertion,
      receipt_access_token: receiptAccessToken,
      access_warning: "The receipt access token is returned once. Store it securely.",
    }, 200);
  }

  await env.DB.prepare(
    `INSERT INTO decisions
     (decision_id, organization_id, request_json, grant_json, evidence_json, context_json, gate_json, state, finalize_token_hash, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'allowed_pending_execution', ?, ?, ?)`,
  )
    .bind(
      decisionId,
      auth.organization_id,
      JSON.stringify(body.action_request),
      JSON.stringify(body.authority_grant),
      JSON.stringify(body.material_evidence),
      JSON.stringify(body.receipt_context),
      JSON.stringify(gate),
      decisionTokenHash,
      createdAt,
      expiresAt,
    )
    .run();
  await insertAudit(env, "decision.allowed", auth.organization_id, decisionId, {
    expires_at: expiresAt,
  });
  return jsonResponse(request, env, {
    decision_id: decisionId,
    decision: "allow",
    failures: [],
    execution_permit: decisionToken,
    expires_at: expiresAt,
    next: `${config.issuer.publicBaseUrl.replace(/\/$/u, "")}/v1/decisions/${decisionId}/finalize`,
  }, 201);
}

async function handleFinalizeDecision(request, env, decisionId) {
  const auth = await requireApiKey(request, env, "receipts:finalize");
  const decisionToken = request.headers.get("x-decision-token");
  if (!decisionToken) throw new HttpError(401, "DECISION_TOKEN_REQUIRED", "X-Decision-Token is required.");

  const record = await env.DB.prepare("SELECT * FROM decisions WHERE decision_id = ?")
    .bind(decisionId)
    .first();
  if (!record || record.organization_id !== auth.organization_id) {
    throw new HttpError(404, "DECISION_NOT_FOUND", "The decision does not exist.");
  }
  if (!record.finalize_token_hash || !(await constantTimeTextEqual(await sha256Text(decisionToken), record.finalize_token_hash))) {
    throw new HttpError(401, "INVALID_DECISION_TOKEN", "The execution permit is invalid.");
  }
  if (record.finalized_receipt_id) {
    const existing = await getReceiptRecord(env, record.finalized_receipt_id);
    return jsonResponse(request, env, {
      decision_id: decisionId,
      idempotent_replay: true,
      receipt: JSON.parse(existing.receipt_json),
      human_disclosure: renderHumanDisclosure(JSON.parse(existing.receipt_json)),
      issuer_assertion: JSON.parse(existing.assertion_json),
    });
  }
  if (record.state !== "allowed_pending_execution") {
    throw new HttpError(409, "DECISION_NOT_FINALIZABLE", "The decision is not awaiting execution finalization.");
  }
  if (Date.parse(record.expires_at) <= Date.now()) {
    await env.DB.prepare("UPDATE decisions SET state = 'expired' WHERE decision_id = ?").bind(decisionId).run();
    throw new HttpError(409, "DECISION_EXPIRED", "The execution permit has expired. Re-evaluate the action.");
  }

  const claim = await env.DB.prepare(
    "UPDATE decisions SET state = 'finalizing' WHERE decision_id = ? AND state = 'allowed_pending_execution'",
  ).bind(decisionId).run();
  if ((claim.meta?.changes ?? 0) !== 1) {
    const concurrent = await env.DB.prepare("SELECT state, finalized_receipt_id FROM decisions WHERE decision_id = ?")
      .bind(decisionId)
      .first();
    if (concurrent?.finalized_receipt_id) {
      const existing = await getReceiptRecord(env, concurrent.finalized_receipt_id);
      return jsonResponse(request, env, {
        decision_id: decisionId,
        idempotent_replay: true,
        receipt: JSON.parse(existing.receipt_json),
        human_disclosure: renderHumanDisclosure(JSON.parse(existing.receipt_json)),
        issuer_assertion: JSON.parse(existing.assertion_json),
      });
    }
    throw new HttpError(409, "DECISION_FINALIZATION_IN_PROGRESS", "Another finalization request is already processing this decision.");
  }

  const executionResult = await readJson(request);
  const errors = validateExecutionResultInput(executionResult);
  if (errors.length > 0) {
    await env.DB.prepare(
      "UPDATE decisions SET state = 'allowed_pending_execution' WHERE decision_id = ? AND state = 'finalizing'",
    ).bind(decisionId).run();
    throw new HttpError(422, "SCHEMA_VALIDATION_FAILED", "The execution result is structurally invalid.", errors);
  }

  const envelope = {
    action_request: JSON.parse(record.request_json),
    authority_grant: JSON.parse(record.grant_json),
    material_evidence: JSON.parse(record.evidence_json),
    receipt_context: JSON.parse(record.context_json),
    execution_result: executionResult,
  };
  const gate = JSON.parse(record.gate_json);
  const createdAt = nowIso();
  let issued;
  try {
    const config = issuerConfig(env);
    issued = await issueReceipt({ envelope, gate, ...config, createdAt });
  } catch (error) {
    await env.DB.prepare(
      "UPDATE decisions SET state = 'allowed_pending_execution' WHERE decision_id = ? AND state = 'finalizing'",
    ).bind(decisionId).run();
    throw error;
  }

  const receiptAccessToken = randomToken("tr_receipt");
  const receiptAccessTokenHash = await sha256Text(receiptAccessToken);
  try {
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO receipts
         (receipt_id, organization_id, action_type, action_status, consequence_class, digest, key_id, receipt_json, assertion_json, access_token_hash, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        issued.receipt.receipt_id,
        auth.organization_id,
        issued.receipt.action.type,
        issued.receipt.action.status,
        issued.receipt.consequence.class,
        issued.receipt.integrity.digest,
        issued.issuer_assertion.key_id,
        JSON.stringify(issued.receipt),
        JSON.stringify(issued.issuer_assertion),
        receiptAccessTokenHash,
        issued.receipt.created_at,
      ),
      env.DB.prepare(
        "UPDATE decisions SET state = 'finalized', finalized_receipt_id = ?, finalized_at = ? WHERE decision_id = ? AND state = 'finalizing'",
      ).bind(issued.receipt.receipt_id, createdAt, decisionId),
      env.DB.prepare(
        "INSERT INTO audit_events (event_id, event_type, actor, subject, details_json, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      ).bind(
        randomId("audit"),
        "decision.finalized",
        auth.organization_id,
        decisionId,
        JSON.stringify({ receipt_id: issued.receipt.receipt_id }),
        createdAt,
      ),
    ]);
  } catch (error) {
    await env.DB.prepare(
      "UPDATE decisions SET state = 'allowed_pending_execution' WHERE decision_id = ? AND state = 'finalizing'",
    ).bind(decisionId).run();
    throw error;
  }

  return jsonResponse(request, env, {
    decision_id: decisionId,
    receipt: issued.receipt,
    human_disclosure: renderHumanDisclosure(issued.receipt),
    issuer_assertion: issued.issuer_assertion,
    receipt_access_token: receiptAccessToken,
    access_warning: "The receipt access token is returned once. Store it securely.",
  }, 201);
}

async function handleGetReceipt(request, env, receiptId) {
  const record = await getReceiptRecord(env, receiptId);
  if (!record) throw new HttpError(404, "RECEIPT_NOT_FOUND", "The receipt does not exist.");
  await authorizeReceiptAccess(request, env, record);
  const receipt = JSON.parse(record.receipt_json);
  return jsonResponse(request, env, {
    receipt,
    human_disclosure: renderHumanDisclosure(receipt),
    issuer_assertion: JSON.parse(record.assertion_json),
    revocation: record.revoked_at
      ? { revoked: true, revoked_at: record.revoked_at, reason: record.revocation_reason }
      : { revoked: false },
  });
}

async function resolvePublicKey(env, keyId) {
  const row = await env.DB.prepare(
    "SELECT public_jwk_json, status FROM issuer_keys WHERE key_id = ?",
  ).bind(keyId).first();
  if (row) {
    if (row.status === "revoked") return null;
    return { publicKeyJwk: JSON.parse(row.public_jwk_json) };
  }
  if (keyId === env.ISSUER_KEY_ID && env.ISSUER_PUBLIC_KEY_SPKI_BASE64) {
    return { publicKeyBase64: env.ISSUER_PUBLIC_KEY_SPKI_BASE64 };
  }
  return null;
}

async function handleVerify(request, env) {
  const body = await readJson(request);
  if (!body.receipt || !body.issuer_assertion) {
    throw new HttpError(422, "VERIFICATION_INPUT_REQUIRED", "receipt and issuer_assertion are required.");
  }
  const key = await resolvePublicKey(env, body.issuer_assertion.key_id);
  const digestValid = await verifyReceiptDigest(body.receipt);
  const signatureResult = key
    ? await verifyIssuedReceipt({
        receipt: body.receipt,
        issuerAssertion: body.issuer_assertion,
        ...key,
      })
    : { issuer_signature_valid: false };
  const cryptographic = {
    digest_valid: digestValid,
    issuer_signature_valid: signatureResult.issuer_signature_valid,
    valid: digestValid && signatureResult.issuer_signature_valid,
  };
  const stored = await getReceiptRecord(env, body.receipt.receipt_id);
  const revoked = Boolean(stored?.revoked_at);
  return jsonResponse(request, env, {
    ...cryptographic,
    key_known: Boolean(key),
    revoked,
    valid: cryptographic.valid && !revoked,
    claim_boundary:
      "Verification establishes content integrity and issuer-key validity under this deployment profile. It does not establish that the recorded action was lawful, fair, safe, or correct.",
  });
}

async function handleKeys(request, env) {
  const current = await currentPublicJwk(env);
  const result = await env.DB.prepare(
    "SELECT key_id, public_jwk_json, status FROM issuer_keys WHERE status IN ('active', 'retired') ORDER BY created_at DESC",
  ).all();
  const keys = [];
  let currentRecorded = false;
  for (const row of result.results ?? []) {
    if (row.key_id === current.kid) currentRecorded = true;
    keys.push(JSON.parse(row.public_jwk_json));
  }
  if (!currentRecorded) {
    const status = await env.DB.prepare("SELECT status FROM issuer_keys WHERE key_id = ?").bind(current.kid).first();
    if (!status || status.status !== "revoked") keys.unshift(current);
  }
  return jsonResponse(request, env, { keys }, 200, { "cache-control": "public, max-age=300" });
}

async function handleRevoke(request, env, receiptId) {
  const auth = await requireApiKey(request, env, "receipts:revoke");
  const record = await getReceiptRecord(env, receiptId);
  if (!record || record.organization_id !== auth.organization_id) {
    throw new HttpError(404, "RECEIPT_NOT_FOUND", "The receipt does not exist.");
  }
  const body = await readJson(request);
  if (typeof body.reason !== "string" || body.reason.length < 1 || body.reason.length > 1000) {
    throw new HttpError(422, "INVALID_REVOCATION_REASON", "reason must be between 1 and 1000 characters.");
  }
  const revokedAt = nowIso();
  await env.DB.prepare(
    "UPDATE receipts SET revoked_at = COALESCE(revoked_at, ?), revocation_reason = COALESCE(revocation_reason, ?) WHERE receipt_id = ?",
  )
    .bind(revokedAt, body.reason, receiptId)
    .run();
  await insertAudit(env, "receipt.revoked", auth.organization_id, receiptId, { reason: body.reason });
  const updated = await getReceiptRecord(env, receiptId);
  return jsonResponse(request, env, {
    receipt_id: receiptId,
    revoked: true,
    revoked_at: updated.revoked_at,
    reason: updated.revocation_reason,
  });
}

async function handleCreateRemedy(request, env, receiptId) {
  const record = await getReceiptRecord(env, receiptId);
  if (!record) throw new HttpError(404, "RECEIPT_NOT_FOUND", "The receipt does not exist.");
  await authorizeReceiptAccess(request, env, record);
  const body = await readJson(request);
  const requesterReference = body.requester_reference;
  const reason = body.reason;
  const requestedAction = body.requested_action ?? "review";
  const allowedActions = new Set(["review", "correction", "reversal", "explanation", "deletion"]);
  if (!allowedActions.has(requestedAction)) {
    throw new HttpError(422, "INVALID_REQUESTED_ACTION", "requested_action must be review, correction, reversal, explanation, or deletion.");
  }
  if (typeof requesterReference !== "string" || requesterReference.length < 1 || requesterReference.length > 200) {
    throw new HttpError(422, "INVALID_REQUESTER_REFERENCE", "requester_reference must be an opaque value between 1 and 200 characters.");
  }
  if (typeof reason !== "string" || reason.length < 1 || reason.length > 4000) {
    throw new HttpError(422, "INVALID_REMEDY_REASON", "reason must be between 1 and 4000 characters.");
  }
  const caseId = randomId("remedy");
  const accessToken = randomToken("tr_remedy");
  const accessTokenHash = await sha256Text(accessToken);
  const createdAt = nowIso();
  await env.DB.prepare(
    `INSERT INTO remedy_cases
     (case_id, receipt_id, organization_id, requester_reference_hash, requested_action, reason, status, access_token_hash, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'submitted', ?, ?, ?)`,
  )
    .bind(
      caseId,
      receiptId,
      record.organization_id,
      await sha256Text(requesterReference),
      requestedAction,
      reason,
      accessTokenHash,
      createdAt,
      createdAt,
    )
    .run();
  await insertAudit(env, "remedy.submitted", "affected-party", caseId, { receipt_id: receiptId });
  return jsonResponse(request, env, {
    case_id: caseId,
    status: "submitted",
    access_token: accessToken,
    status_uri: `${env.PUBLIC_BASE_URL.replace(/\/$/u, "")}/v1/remedies/${caseId}`,
  }, 201);
}

async function handleUpdateRemedy(request, env, caseId) {
  const auth = await requireApiKey(request, env, "remedies:manage");
  const row = await env.DB.prepare(
    "SELECT case_id, organization_id, status FROM remedy_cases WHERE case_id = ?",
  ).bind(caseId).first();
  if (!row || row.organization_id !== auth.organization_id) {
    throw new HttpError(404, "REMEDY_CASE_NOT_FOUND", "The remedy case does not exist.");
  }
  const body = await readJson(request);
  const allowedTransitions = {
    submitted: new Set(["under_review", "withdrawn"]),
    under_review: new Set(["resolved", "denied", "withdrawn"]),
    resolved: new Set(),
    denied: new Set(),
    withdrawn: new Set(),
  };
  if (!allowedTransitions[row.status]?.has(body.status)) {
    throw new HttpError(409, "INVALID_REMEDY_TRANSITION", `A remedy case in ${row.status} cannot transition to ${String(body.status)}.`);
  }
  if (body.resolution_summary !== undefined && (typeof body.resolution_summary !== "string" || body.resolution_summary.length > 4000)) {
    throw new HttpError(422, "INVALID_RESOLUTION_SUMMARY", "resolution_summary must be at most 4000 characters.");
  }
  const updatedAt = nowIso();
  await env.DB.prepare(
    "UPDATE remedy_cases SET status = ?, resolution_summary = ?, updated_at = ? WHERE case_id = ?",
  ).bind(body.status, body.resolution_summary ?? null, updatedAt, caseId).run();
  await insertAudit(env, "remedy.status_updated", auth.organization_id, caseId, {
    from: row.status,
    to: body.status,
  });
  return jsonResponse(request, env, {
    case_id: caseId,
    status: body.status,
    resolution_summary: body.resolution_summary ?? null,
    updated_at: updatedAt,
  });
}

async function handleGetRemedy(request, env, caseId) {
  const token = bearerToken(request);
  if (!token) throw new HttpError(401, "REMEDY_ACCESS_TOKEN_REQUIRED", "Use the remedy access token as a bearer token.");
  const row = await env.DB.prepare(
    "SELECT case_id, receipt_id, status, requested_action, created_at, updated_at, resolution_summary, access_token_hash FROM remedy_cases WHERE case_id = ?",
  )
    .bind(caseId)
    .first();
  if (!row || !(await constantTimeTextEqual(await sha256Text(token), row.access_token_hash))) {
    throw new HttpError(404, "REMEDY_CASE_NOT_FOUND", "The remedy case does not exist.");
  }
  return jsonResponse(request, env, {
    case_id: row.case_id,
    receipt_id: row.receipt_id,
    status: row.status,
    requested_action: row.requested_action,
    created_at: row.created_at,
    updated_at: row.updated_at,
    resolution_summary: row.resolution_summary,
  });
}

async function route(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/u, "") || "/";
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request, env) });
  if (request.method === "GET" && path === "/health") {
    return jsonResponse(request, env, { status: "ok", service: "ai-trust-receipt", time: nowIso() });
  }
  if (request.method === "GET" && path === "/") {
    return jsonResponse(request, env, {
      service: "ai-trust-receipt",
      name: openapiDocument.info?.title ?? "AI Trust Receipt Operational Service",
      version: SERVICE_VERSION,
      status: "ok",
      documentation: SERVICE_REPOSITORY,
      endpoints: {
        health: "/health",
        version: "/version",
        openapi: "/openapi.json",
        issuer_keys: "/.well-known/ai-trust-receipt-keys.json",
      },
      time: nowIso(),
    });
  }
  if (request.method === "GET" && path === "/version") {
    return jsonResponse(request, env, { service: "ai-trust-receipt", version: SERVICE_VERSION, time: nowIso() });
  }
  if (request.method === "GET" && path === "/openapi.json") {
    return jsonResponse(request, env, openapiDocument);
  }
  if (request.method === "GET" && path === "/.well-known/ai-trust-receipt-keys.json") return handleKeys(request, env);
  if (request.method === "POST" && path === "/v1/admin/bootstrap") return handleBootstrap(request, env);
  if (request.method === "POST" && path === "/v1/decisions") return handleCreateDecision(request, env);
  if (request.method === "POST" && path === "/v1/verify") return handleVerify(request, env);

  let match = /^\/v1\/decisions\/([^/]+)\/finalize$/u.exec(path);
  if (request.method === "POST" && match) return handleFinalizeDecision(request, env, decodeURIComponent(match[1]));
  match = /^\/v1\/receipts\/([^/]+)\/revoke$/u.exec(path);
  if (request.method === "POST" && match) return handleRevoke(request, env, decodeURIComponent(match[1]));
  match = /^\/v1\/receipts\/([^/]+)\/remedies$/u.exec(path);
  if (request.method === "POST" && match) return handleCreateRemedy(request, env, decodeURIComponent(match[1]));
  match = /^\/v1\/receipts\/([^/]+)$/u.exec(path);
  if (request.method === "GET" && match) return handleGetReceipt(request, env, decodeURIComponent(match[1]));
  match = /^\/v1\/remedies\/([^/]+)\/status$/u.exec(path);
  if (request.method === "POST" && match) return handleUpdateRemedy(request, env, decodeURIComponent(match[1]));
  match = /^\/v1\/remedies\/([^/]+)$/u.exec(path);
  if (request.method === "GET" && match) return handleGetRemedy(request, env, decodeURIComponent(match[1]));

  throw new HttpError(404, "NOT_FOUND", "The requested resource does not exist.");
}

export default {
  async fetch(request, env) {
    const requestId = request.headers.get("cf-ray") ?? crypto.randomUUID();
    try {
      const response = await route(request, env);
      response.headers.set("x-request-id", requestId);
      response.headers.set("x-content-type-options", "nosniff");
      response.headers.set("referrer-policy", "no-referrer");
      return response;
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      const code = error instanceof HttpError ? error.code : "INTERNAL_ERROR";
      const message = error instanceof HttpError ? error.message : "The service could not complete the request.";
      if (!(error instanceof HttpError)) console.error(error);
      return jsonResponse(request, env, {
        error: { code, message, details: error.details },
        request_id: requestId,
      }, status, { "x-request-id": requestId });
    }
  },
};
