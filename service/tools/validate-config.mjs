import { readFile } from "node:fs/promises";
import process from "node:process";

const PLACEHOLDER_DATABASE_ID = "00000000-0000-0000-0000-000000000000";
const mode = process.argv.includes("--production") ? "production" : "candidate";
const configPath = process.env.WRANGLER_CONFIG_PATH ?? new URL("../wrangler.toml", import.meta.url);

function fail(message) {
  console.error(JSON.stringify({ result: "fail", mode, message }, null, 2));
  process.exit(1);
}

function readTomlValue(text, key) {
  const pattern = new RegExp(`^\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*=\\s*"([^"]*)"\\s*$`, "mu");
  return pattern.exec(text)?.[1];
}

function requireHttpsUrl(name, value) {
  if (!value) fail(`${name} is missing.`);
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    fail(`${name} must be an absolute URL.`);
  }
  if (parsed.protocol !== "https:") fail(`${name} must use HTTPS.`);
  if (parsed.username || parsed.password) fail(`${name} must not contain credentials.`);
  return parsed;
}

const text = await readFile(configPath, "utf8");
const required = [
  "PUBLIC_BASE_URL",
  "ISSUER_ORGANIZATION_ID",
  "ISSUER_DISPLAY_NAME",
  "ISSUER_KEY_ID",
  "ALLOWED_ORIGINS",
  "DECISION_TTL_SECONDS",
  "database_name",
  "database_id",
];
const values = Object.fromEntries(required.map((key) => [key, readTomlValue(text, key)]));
const missing = required.filter((key) => !values[key]);
if (missing.length) fail(`Missing wrangler configuration: ${missing.join(", ")}`);

const publicBase = requireHttpsUrl("PUBLIC_BASE_URL", values.PUBLIC_BASE_URL);
if (publicBase.search || publicBase.hash) fail("PUBLIC_BASE_URL must not contain a query string or fragment.");
if (publicBase.pathname !== "/" && publicBase.pathname !== "") {
  fail("PUBLIC_BASE_URL must identify the service origin without a path.");
}

const origins = values.ALLOWED_ORIGINS.split(",").map((value) => value.trim()).filter(Boolean);
if (!origins.length) fail("ALLOWED_ORIGINS must contain at least one origin.");
for (const origin of origins) {
  if (origin === "*") {
    if (mode === "production") fail("Wildcard CORS is prohibited in production.");
    continue;
  }
  const parsed = requireHttpsUrl("ALLOWED_ORIGINS entry", origin);
  if (parsed.pathname !== "/" || parsed.search || parsed.hash) {
    fail(`CORS entry must be an origin only: ${origin}`);
  }
}

const ttl = Number(values.DECISION_TTL_SECONDS);
if (!Number.isInteger(ttl) || ttl < 60 || ttl > 3600) {
  fail("DECISION_TTL_SECONDS must be an integer between 60 and 3600.");
}

if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{2,159}$/u.test(values.ISSUER_ORGANIZATION_ID)) {
  fail("ISSUER_ORGANIZATION_ID has an invalid format.");
}
if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{2,159}$/u.test(values.ISSUER_KEY_ID)) {
  fail("ISSUER_KEY_ID has an invalid format.");
}
if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(values.database_id)
    && values.database_id !== PLACEHOLDER_DATABASE_ID) {
  fail("database_id must be a UUID.");
}

const warnings = [];
if (values.database_id === PLACEHOLDER_DATABASE_ID) {
  if (mode === "production") fail("The D1 database_id is still the repository placeholder.");
  warnings.push("D1 database_id is a placeholder; production deployment is intentionally blocked.");
}

if (mode === "production") {
  const expectedBase = process.env.TRUST_RECEIPT_BASE_URL;
  if (!expectedBase) fail("TRUST_RECEIPT_BASE_URL is required for production validation.");
  const expected = requireHttpsUrl("TRUST_RECEIPT_BASE_URL", expectedBase);
  if (expected.origin !== publicBase.origin) {
    fail("TRUST_RECEIPT_BASE_URL must match PUBLIC_BASE_URL.");
  }
  for (const name of ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN"]) {
    if (!process.env[name]) fail(`${name} is required for production deployment.`);
  }
}

console.log(JSON.stringify({
  result: "pass",
  mode,
  public_base_url: publicBase.origin,
  database_name: values.database_name,
  database_id_configured: values.database_id !== PLACEHOLDER_DATABASE_ID,
  allowed_origins: origins,
  decision_ttl_seconds: ttl,
  warnings,
}, null, 2));
