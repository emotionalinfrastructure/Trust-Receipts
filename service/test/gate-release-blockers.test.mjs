import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { evaluateGate } from "../src/gate.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");

function fixture(name) {
  return JSON.parse(readFileSync(resolve(ROOT, "fixtures", name), "utf8"));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const actionRequest = fixture("action-request.valid.json");
const authorityGrant = fixture("authority-grant.valid.json");
const evidenceSet = fixture("material-evidence.valid.json");

test("explicit user denial is terminal even when independent human review is approved", () => {
  const request = clone(actionRequest);
  request.confirmation = { status: "denied" };
  request.human_review.status = "approved";

  const gate = evaluateGate(request, authorityGrant, evidenceSet);
  const codes = gate.failures.map((failure) => failure.code);

  assert.equal(gate.decision, "deny");
  assert.ok(codes.includes("USER_AUTHORIZATION_DENIED"));
  assert.ok(!codes.includes("HUMAN_REVIEW_REQUIRED"));
});

test("persistent affected-party C2 changes require positive confirmation in addition to review", () => {
  const request = clone(actionRequest);
  request.confirmation = { status: "pending" };
  request.human_review.status = "approved";

  const gate = evaluateGate(request, authorityGrant, evidenceSet);
  const codes = gate.failures.map((failure) => failure.code);

  assert.equal(gate.decision, "deny");
  assert.ok(codes.includes("CONFIRMATION_REQUIRED"));
  assert.ok(!codes.includes("HUMAN_REVIEW_REQUIRED"));
});
