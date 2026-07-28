import test from "node:test";
import assert from "node:assert/strict";
import { handleRequest } from "../src/index.mjs";

test("health exposes dependency posture without claiming production validation", async () => {
  const res = await handleRequest(new Request("https://example.test/health"), { APP_ENV: "test" });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.claim_posture, "evidence-bound");
  assert.equal(body.production_validation, "not_established");
  assert.equal(body.dependencies.d1, "not_configured");
});

test("protected report generation fails closed without administrator token", async () => {
  const res = await handleRequest(new Request("https://example.test/api/v1/reviews/generate", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }), { ADMIN_TOKEN: "secret" });
  assert.equal(res.status, 401);
});

test("model endpoint preserves deterministic baseline", async () => {
  const res = await handleRequest(new Request("https://example.test/api/v1/model"), {});
  const body = await res.json();
  assert.equal(body.scoring.score100, 56.1);
  assert.match(body.designation, /advanced candidate governance architecture/i);
});
