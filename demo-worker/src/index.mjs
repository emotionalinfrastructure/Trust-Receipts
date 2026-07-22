import { APP_JS, CSS, HTML } from "./assets.mjs";
import { buildReceipt, RECEIPT_SCHEMA, verifyReceipt } from "./core.mjs";

const MAX_BODY_BYTES = 64 * 1024;

const SECURITY_HEADERS = Object.freeze({
  "strict-transport-security": "max-age=31536000; includeSubDomains",
  "content-security-policy": "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; upgrade-insecure-requests",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "no-referrer",
  "permissions-policy": "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  "cross-origin-opener-policy": "same-origin",
  "cross-origin-resource-policy": "same-origin",
});

function response(body, status = 200, headers = {}) {
  return new Response(body, { status, headers: { ...SECURITY_HEADERS, ...headers } });
}

function json(body, status = 200, headers = {}) {
  return response(JSON.stringify(body, null, 2), status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...headers,
  });
}

function methodNotAllowed(allowed) {
  return json({ error: { code: "METHOD_NOT_ALLOWED", message: `Allowed methods: ${allowed.join(", ")}` } }, 405, { allow: allowed.join(", ") });
}

async function readJson(request) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) throw Object.assign(new Error("Request body exceeds 64 KiB."), { status: 413, code: "BODY_TOO_LARGE" });
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) throw Object.assign(new Error("Request body exceeds 64 KiB."), { status: 413, code: "BODY_TOO_LARGE" });
  try {
    return JSON.parse(text || "{}");
  } catch {
    throw Object.assign(new Error("Request body must be valid JSON."), { status: 400, code: "INVALID_JSON" });
  }
}

function baseUrl(request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export async function handleRequest(request) {
  const url = new URL(request.url);
  if (url.protocol === "http:") {
    url.protocol = "https:";
    return response(null, 308, { location: url.toString() });
  }

  if (request.method === "OPTIONS" && url.pathname.startsWith("/api/")) {
    return response(null, 204, { allow: "POST, OPTIONS", "cache-control": "no-store" });
  }

  if (url.pathname === "/") {
    if (!["GET", "HEAD"].includes(request.method)) return methodNotAllowed(["GET", "HEAD"]);
    return response(request.method === "HEAD" ? null : HTML, 200, { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300" });
  }
  if (url.pathname === "/styles.css") {
    if (!["GET", "HEAD"].includes(request.method)) return methodNotAllowed(["GET", "HEAD"]);
    return response(request.method === "HEAD" ? null : CSS, 200, { "content-type": "text/css; charset=utf-8", "cache-control": "public, max-age=3600" });
  }
  if (url.pathname === "/app.js") {
    if (!["GET", "HEAD"].includes(request.method)) return methodNotAllowed(["GET", "HEAD"]);
    return response(request.method === "HEAD" ? null : APP_JS, 200, { "content-type": "text/javascript; charset=utf-8", "cache-control": "public, max-age=3600" });
  }
  if (url.pathname === "/schema/trust-receipt-demo-v0.2.json") {
    if (!["GET", "HEAD"].includes(request.method)) return methodNotAllowed(["GET", "HEAD"]);
    return json(request.method === "HEAD" ? null : RECEIPT_SCHEMA, 200, { "cache-control": "public, max-age=3600" });
  }
  if (url.pathname === "/health") {
    if (request.method !== "GET") return methodNotAllowed(["GET"]);
    return json({ status: "ok", service: "ei-trust-receipt-demo", version: "0.2.0-demo.1", persistence: "none", issuer_authentication: "unsigned_demo" });
  }
  if (url.pathname === "/api/evaluate") {
    if (request.method !== "POST") return methodNotAllowed(["POST", "OPTIONS"]);
    try {
      const body = await readJson(request);
      const receipt = await buildReceipt(body, baseUrl(request));
      return json({ receipt }, 201);
    } catch (error) {
      return json({ error: { code: error.code ?? "EVALUATION_FAILED", message: error.message ?? "Evaluation failed." } }, error.status ?? 500);
    }
  }
  if (url.pathname === "/api/verify") {
    if (request.method !== "POST") return methodNotAllowed(["POST", "OPTIONS"]);
    try {
      const body = await readJson(request);
      return json(await verifyReceipt(body.receipt));
    } catch (error) {
      return json({ error: { code: error.code ?? "VERIFICATION_FAILED", message: error.message ?? "Verification failed." } }, error.status ?? 500);
    }
  }

  return json({ error: { code: "NOT_FOUND", message: "The requested route does not exist." } }, 404);
}

export default { fetch: handleRequest };
