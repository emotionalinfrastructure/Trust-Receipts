import test from "node:test";
import assert from "node:assert/strict";
import { handleRequest } from "../src/index.mjs";

test("verification page is public and evidence-bound", async () => {
  const response = await handleRequest(new Request("https://example.test/verification"));
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /text\/html/);
  const body = await response.text();
  assert.match(body, /Enterprise Verification Runtime/);
  assert.match(body, /not an independent certification/i);
});

test("verification status exposes implemented and missing controls", async () => {
  const response = await handleRequest(new Request("https://example.test/api/verification/status"));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.posture, "evidence-bound");
  assert.equal(body.claims.hosted_demo, "VERIFIED_BY_SOURCE");
  assert.equal(body.claims.durable_persistence, "NOT_IMPLEMENTED");
  assert.equal(body.claims.independent_security_review, "NOT_VERIFIED");
});

test("verification API rejects mutation methods", async () => {
  const response = await handleRequest(new Request("https://example.test/api/verification/status", { method: "POST" }));
  assert.equal(response.status, 405);
});
