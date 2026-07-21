import process from "node:process";

const baseUrl = process.env.TRUST_RECEIPT_BASE_URL;
const origin = process.env.TRUST_RECEIPT_SMOKE_ORIGIN;
const timeoutMs = Number(process.env.TRUST_RECEIPT_SMOKE_TIMEOUT_MS ?? 15000);

function fail(message, details) {
  console.error(JSON.stringify({ result: "fail", message, details }, null, 2));
  process.exit(1);
}

if (!baseUrl) fail("TRUST_RECEIPT_BASE_URL is required.");
let base;
try {
  base = new URL(baseUrl);
} catch {
  fail("TRUST_RECEIPT_BASE_URL must be an absolute URL.");
}
const allowInsecureLocalhost = process.env.TRUST_RECEIPT_SMOKE_ALLOW_INSECURE_LOCALHOST === "1";
const localHost = base.hostname === "127.0.0.1" || base.hostname === "localhost" || base.hostname === "::1";
if (base.protocol !== "https:" && !(allowInsecureLocalhost && localHost)) {
  fail("TRUST_RECEIPT_BASE_URL must use HTTPS.");
}
if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 60000) {
  fail("TRUST_RECEIPT_SMOKE_TIMEOUT_MS must be an integer between 1000 and 60000.");
}

async function request(path, init = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(new URL(path, base), {
      redirect: "error",
      ...init,
      signal: controller.signal,
      headers: {
        accept: "application/json",
        ...(origin ? { origin } : {}),
        ...(init.headers ?? {}),
      },
    });
  } catch (error) {
    fail(`Request failed for ${path}.`, error instanceof Error ? error.message : String(error));
  } finally {
    clearTimeout(timer);
  }
}

async function json(response, path) {
  const type = response.headers.get("content-type") ?? "";
  if (!type.toLowerCase().includes("application/json")) {
    fail(`${path} did not return JSON.`, { status: response.status, content_type: type });
  }
  try {
    return await response.json();
  } catch (error) {
    fail(`${path} returned invalid JSON.`, error instanceof Error ? error.message : String(error));
  }
}

const healthResponse = await request("/health");
if (healthResponse.status !== 200) {
  fail("/health did not return 200.", { status: healthResponse.status, body: await healthResponse.text() });
}
const health = await json(healthResponse, "/health");
if (health.status !== "ok" || health.service !== "ai-trust-receipt") {
  fail("/health returned an unexpected payload.", health);
}
if (!healthResponse.headers.get("x-request-id")) {
  fail("/health omitted x-request-id.");
}
if (!(healthResponse.headers.get("cache-control") ?? "").includes("no-store")) {
  fail("/health must be non-cacheable.");
}

const keyResponse = await request("/.well-known/ai-trust-receipt-keys.json");
if (keyResponse.status !== 200) {
  fail("Issuer-key discovery did not return 200.", { status: keyResponse.status, body: await keyResponse.text() });
}
const keySet = await json(keyResponse, "/.well-known/ai-trust-receipt-keys.json");
if (!Array.isArray(keySet.keys) || keySet.keys.length < 1) {
  fail("Issuer-key discovery returned no keys.", keySet);
}
for (const key of keySet.keys) {
  if (key.kty !== "OKP" || key.crv !== "Ed25519" || typeof key.kid !== "string" || !key.kid) {
    fail("Issuer-key discovery returned an unsupported key.", key);
  }
}

if (origin) {
  const optionsResponse = await request("/v1/decisions", {
    method: "OPTIONS",
    headers: {
      "access-control-request-method": "POST",
      "access-control-request-headers": "authorization,content-type",
    },
  });
  if (optionsResponse.status !== 204) {
    fail("CORS preflight did not return 204.", { status: optionsResponse.status });
  }
  if (optionsResponse.headers.get("access-control-allow-origin") !== origin) {
    fail("CORS preflight did not authorize the configured smoke origin.", {
      expected: origin,
      actual: optionsResponse.headers.get("access-control-allow-origin"),
    });
  }
}

console.log(JSON.stringify({
  result: "pass",
  base_url: base.origin,
  health: "ok",
  issuer_keys: keySet.keys.map((key) => key.kid),
  cors_origin_checked: origin ?? null,
}, null, 2));
