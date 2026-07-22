import assert from "node:assert/strict";
import test from "node:test";

import { buildReceipt, evaluateGate, verifyReceipt } from "../src/core.mjs";
import { handleRequest } from "../src/index.mjs";

const base = {
  consequence_class: "C2",
  persistent_change: true,
  affected_party: true,
  user_confirmation: "confirmed",
  human_review: "approved",
  grant_status: "active",
  action_in_scope: true,
  target_in_scope: true,
  evidence_status: "available",
  evidence_freshness: "current",
  receipt_service_available: true,
  remedy_service_available: true,
};

test("explicit denial is terminal despite approved review", () => {
  const gate = evaluateGate({ ...base, user_confirmation: "denied" });
  assert.equal(gate.decision, "deny");
  assert.equal(gate.failures[0].code, "USER_AUTHORIZATION_DENIED");
  assert.ok(!gate.failures.some((item) => item.code === "HUMAN_REVIEW_REQUIRED"));
});

test("persistent affected-party C2 requires positive confirmation and review", () => {
  const gate = evaluateGate({ ...base, user_confirmation: "pending" });
  assert.equal(gate.decision, "deny");
  assert.ok(gate.failures.some((item) => item.code === "CONFIRMATION_REQUIRED"));
});

test("every evaluation receives a unique sortable attempt identifier", async () => {
  const first = await buildReceipt(base, "https://demo.example", 1753190000000);
  const second = await buildReceipt(base, "https://demo.example", 1753190000001);
  assert.notEqual(first.attempt_id, second.attempt_id);
  assert.notEqual(first.receipt_id, second.receipt_id);
  assert.equal(first.attempt_id[14], "7");
});

test("receipt includes complete ordered failures and preserves denied before-state", async () => {
  const receipt = await buildReceipt({
    ...base,
    user_confirmation: "denied",
    human_review: "pending",
    evidence_status: "unavailable",
    remedy_service_available: false,
  }, "https://demo.example", 1753190000000);
  assert.equal(receipt.gate_decision.failures.length, 4);
  assert.deepEqual(receipt.gate_decision.failures.map((item) => item.sequence), [1, 2, 3, 4]);
  assert.deepEqual(receipt.action.after_state, receipt.action.before_state);
  assert.equal(receipt.authority.confirmation_evidence.sufficient, false);
  assert.equal(receipt.human_review.evidence.sufficient, false);
  assert.equal(receipt.remedy.reversible, false);
});

test("receipt references working demo capabilities without example.invalid", async () => {
  const receipt = await buildReceipt(base, "https://demo.example", 1753190000000);
  const serialized = JSON.stringify(receipt);
  assert.ok(receipt.schema_id.endsWith("/schema/trust-receipt-demo-v0.2.json"));
  assert.equal(receipt.verification.url, "https://demo.example/api/verify");
  assert.equal(receipt.persistence.status, "not_persisted");
  assert.equal(receipt.issuer.authentication_status, "unsigned_demo");
  assert.ok(!serialized.includes("example.invalid"));
});

test("digest verification detects mutation", async () => {
  const receipt = await buildReceipt(base, "https://demo.example", 1753190000000);
  assert.equal((await verifyReceipt(receipt)).valid, true);
  receipt.action.status = "denied";
  assert.equal((await verifyReceipt(receipt)).valid, false);
});

test("worker serves security headers, schema, method boundaries, and HTTPS redirect", async () => {
  const root = await handleRequest(new Request("https://demo.example/"));
  assert.equal(root.status, 200);
  assert.match(root.headers.get("content-security-policy"), /frame-ancestors 'none'/);
  assert.equal(root.headers.get("strict-transport-security"), "max-age=31536000; includeSubDomains");
  assert.equal(root.headers.get("x-content-type-options"), "nosniff");
  assert.ok(!(await root.text()).includes("produces a durable"));

  const schema = await handleRequest(new Request("https://demo.example/schema/trust-receipt-demo-v0.2.json"));
  assert.equal(schema.status, 200);

  const wrongMethod = await handleRequest(new Request("https://demo.example/api/verify", { method: "GET" }));
  assert.equal(wrongMethod.status, 405);
  assert.match(wrongMethod.headers.get("allow"), /POST/);

  const missing = await handleRequest(new Request("https://demo.example/nope"));
  assert.equal(missing.status, 404);

  const redirect = await handleRequest(new Request("http://demo.example/path"));
  assert.equal(redirect.status, 308);
  assert.equal(redirect.headers.get("location"), "https://demo.example/path");
});

test("evaluate and verify API routes work", async () => {
  const evaluateResponse = await handleRequest(new Request("https://demo.example/api/evaluate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(base),
  }));
  assert.equal(evaluateResponse.status, 201);
  const { receipt } = await evaluateResponse.json();

  const verifyResponse = await handleRequest(new Request("https://demo.example/api/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ receipt }),
  }));
  assert.equal(verifyResponse.status, 200);
  assert.equal((await verifyResponse.json()).valid, true);
});
