import { readFile } from "node:fs/promises";
import process from "node:process";

const path = new URL("../openapi.json", import.meta.url);
const document = JSON.parse(await readFile(path, "utf8"));

function fail(message) {
  console.error(JSON.stringify({ result: "fail", message }, null, 2));
  process.exit(1);
}

if (document.openapi !== "3.1.0") fail("openapi.json must declare OpenAPI 3.1.0.");
if (document.info?.version !== "0.2.0-alpha.1") fail("OpenAPI version must match the operational service version.");

const expected = new Map([
  ["/health", ["get"]],
  ["/.well-known/ai-trust-receipt-keys.json", ["get"]],
  ["/v1/admin/bootstrap", ["post"]],
  ["/v1/decisions", ["post"]],
  ["/v1/decisions/{decision_id}/finalize", ["post"]],
  ["/v1/receipts/{receipt_id}", ["get"]],
  ["/v1/verify", ["post"]],
  ["/v1/receipts/{receipt_id}/revoke", ["post"]],
  ["/v1/receipts/{receipt_id}/remedies", ["post"]],
  ["/v1/remedies/{case_id}", ["get"]],
  ["/v1/remedies/{case_id}/status", ["post"]],
]);

for (const [route, methods] of expected) {
  const item = document.paths?.[route];
  if (!item) fail(`Missing OpenAPI path: ${route}`);
  for (const method of methods) {
    const operation = item[method];
    if (!operation) fail(`Missing OpenAPI operation: ${method.toUpperCase()} ${route}`);
    if (!operation.operationId) fail(`Missing operationId: ${method.toUpperCase()} ${route}`);
    if (!operation.responses || !Object.keys(operation.responses).some((status) => /^2\d\d$/u.test(status))) {
      fail(`Operation has no success response: ${method.toUpperCase()} ${route}`);
    }
  }
}

for (const route of Object.keys(document.paths ?? {})) {
  if (!expected.has(route)) fail(`OpenAPI contains an undocumented implementation route: ${route}`);
}

const ids = [];
for (const item of Object.values(document.paths ?? {})) {
  for (const method of ["get", "post", "put", "patch", "delete", "options", "head"]) {
    if (item[method]?.operationId) ids.push(item[method].operationId);
  }
}
if (new Set(ids).size !== ids.length) fail("operationId values must be unique.");

function resolveRef(ref) {
  if (!ref.startsWith("#/")) fail(`External or malformed $ref is not permitted: ${ref}`);
  return ref.slice(2).split("/").reduce((value, token) => value?.[token.replace(/~1/gu, "/").replace(/~0/gu, "~")], document);
}

function visit(value) {
  if (Array.isArray(value)) {
    for (const item of value) visit(item);
    return;
  }
  if (!value || typeof value !== "object") return;
  if (typeof value.$ref === "string" && resolveRef(value.$ref) === undefined) {
    fail(`Unresolved $ref: ${value.$ref}`);
  }
  for (const child of Object.values(value)) visit(child);
}
visit(document);

const schemes = document.components?.securitySchemes ?? {};
for (const name of ["apiKeyBearer", "bootstrapBearer", "receiptOrApiBearer", "remedyBearer", "decisionToken"]) {
  if (!schemes[name]) fail(`Missing security scheme: ${name}`);
}

console.log(JSON.stringify({
  result: "pass",
  openapi: document.openapi,
  api_version: document.info.version,
  paths: expected.size,
  operations: ids.length,
  schemas: Object.keys(document.components?.schemas ?? {}).length,
}, null, 2));
