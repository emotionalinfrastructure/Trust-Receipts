import assert from "node:assert/strict";
import test from "node:test";

import { canonicalJson, verifyReceiptDigest } from "../src/canonical.mjs";
import { evaluateGate } from "../src/gate.mjs";
import { issueReceipt, verifyIssuedReceipt } from "../src/receipt.mjs";
import { renderHumanDisclosure } from "../src/render.mjs";
import { validateDecisionEnvelope } from "../src/validation.mjs";

function base64(bytes) {
  return Buffer.from(bytes).toString("base64");
}

function fixture() {
  return {
    action_request: {
      request_id: "request:profile-update:001",
      requested_at: "2026-07-20T12:00:00Z",
      agent: {
        agent_id: "agent:profile-maintainer",
        operator_id: "operator:example-service",
        deployment_id: "deployment:prod-us-01",
        version: "2026.07.1",
        accountable_organization: "Example Service Organization",
      },
      action: {
        type: "account.profile.update",
        verb: "update",
        target: "account:subject-001",
        before_state: { weekly_summary: false },
        proposed_after_state: { weekly_summary: true },
        persistent_change: true,
        reversible: true,
      },
      consequence: {
        class: "C2",
        affected_party: true,
        notice_required: true,
        rationale: "Updates a persistent account preference.",
        protected_third_party_information: false,
      },
      confirmation: {
        status: "confirmed",
        confirmed_at: "2026-07-20T11:58:00Z",
        confirmation_id: "confirmation:001",
      },
      human_review: {
        status: "approved",
        reviewer_role: "account-change-reviewer",
        review_id: "review:001",
        reviewed_at: "2026-07-20T11:59:00Z",
        evidence_viewed: ["evidence:confirmation:001", "evidence:review:001"],
      },
      delegation: [],
    },
    authority_grant: {
      schema_version: "0.1",
      grant_id: "grant:profile-maintenance:001",
      granting_party: {
        party_id: "party:subject-001",
        display_name: "Account subject",
      },
      grantee: {
        agent_id: "agent:profile-maintainer",
        operator_id: "operator:example-service",
        deployment_id: "deployment:prod-us-01",
      },
      objective: {
        description: "Maintain the account holder's notification preference when explicitly requested.",
        version: "objective-1",
        hard_constraints: [
          "Do not change identity, payment, eligibility, or access-control fields.",
          "Create a receipt for every attempted persistent change.",
        ],
      },
      scope: {
        allowed_actions: ["account.profile.update"],
        allowed_targets: ["account:subject-001"],
        excluded_actions: ["account.access.disable", "account.payment.update"],
        max_consequence_class: "C2",
      },
      granted_at: "2026-07-01T00:00:00Z",
      expires_at: "2027-07-01T00:00:00Z",
      confirmation: {
        threshold: "independent_human_review",
        required_for: ["C2", "C3"],
      },
      delegation: {
        allowed: false,
        max_depth: 0,
        permitted_recipients: [],
      },
      status: "active",
    },
    material_evidence: {
      evidence_set_id: "evidence-set:001",
      items: [
        {
          evidence_id: "evidence:confirmation:001",
          category: "user-confirmation",
          provenance: "Account confirmation service event confirmation:001",
          materiality: "required",
          status: "available",
          freshness: "current",
        },
        {
          evidence_id: "evidence:review:001",
          category: "human-review",
          provenance: "Independent account-change review event review:001",
          materiality: "required",
          status: "available",
          freshness: "current",
        },
      ],
      receipt_service_available: true,
      remedy_service_available: true,
    },
    receipt_context: {
      human_review_record: {
        authority_to_intervene: true,
        disposition: "approved",
      },
      remedy: {
        available: true,
        reversible: true,
        contestable: true,
        restoration_steps: "Restore the recorded before_state after accountable review.",
        review_owner: "Example Service Organization",
        status_uri: "https://api.example.test/remedies",
        time_limit: "Submit within 30 calendar days of notice.",
      },
      privacy: {
        retention_basis: "Retain the minimum event evidence required for verification, review, and remedy.",
        routine_access_expires: "2027-07-01T00:00:00Z",
        access_roles: ["accountable-reviewer", "affected-party-support"],
        prohibited_secondary_uses: ["model-training", "unrelated-profiling"],
        chain_of_thought_excluded: true,
        deletion_uri: "https://api.example.test/privacy",
      },
      relationships: [],
    },
  };
}

async function signingConfig() {
  const pair = await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
  const [privateKey, publicKey] = await Promise.all([
    crypto.subtle.exportKey("pkcs8", pair.privateKey),
    crypto.subtle.exportKey("spki", pair.publicKey),
  ]);
  return {
    privateKeyBase64: base64(privateKey),
    publicKeyBase64: base64(publicKey),
    keyId: "test-key-1",
  };
}

test("valid deployment envelope passes structural validation and gate evaluation", () => {
  const input = fixture();
  assert.deepEqual(validateDecisionEnvelope(input), []);
  const gate = evaluateGate(input.action_request, input.authority_grant, input.material_evidence);
  assert.equal(gate.decision, "allow");
  assert.deepEqual(gate.failures, []);
});

test("expired authority fails closed", () => {
  const input = fixture();
  input.authority_grant.expires_at = "2026-07-20T12:00:00Z";
  const gate = evaluateGate(input.action_request, input.authority_grant, input.material_evidence);
  assert.equal(gate.decision, "deny");
  assert.ok(gate.failures.some((item) => item.code === "GRANT_EXPIRED"));
});

test("stale required evidence fails closed", () => {
  const input = fixture();
  input.material_evidence.items[0].freshness = "stale";
  const gate = evaluateGate(input.action_request, input.authority_grant, input.material_evidence);
  assert.equal(gate.decision, "deny");
  assert.ok(gate.failures.some((item) => item.code === "REQUIRED_EVIDENCE_NOT_CURRENT"));
});

test("service issues a digest-valid and Ed25519-authenticated receipt", async () => {
  const input = fixture();
  const gate = evaluateGate(input.action_request, input.authority_grant, input.material_evidence);
  const signing = await signingConfig();
  const issued = await issueReceipt({
    envelope: {
      ...input,
      execution_result: {
        status: "executed",
        event_time: "2026-07-20T12:00:01Z",
        after_state: { weekly_summary: true },
      },
    },
    gate,
    issuer: {
      publicBaseUrl: "https://api.example.test",
      organizationId: "org:example",
      displayName: "Example Organization",
    },
    signing,
    createdAt: "2026-07-20T12:00:02Z",
  });

  assert.equal(await verifyReceiptDigest(issued.receipt), true);
  const result = await verifyIssuedReceipt({
    receipt: issued.receipt,
    issuerAssertion: issued.issuer_assertion,
    publicKeyBase64: signing.publicKeyBase64,
  });
  assert.deepEqual(result, {
    digest_valid: true,
    issuer_signature_valid: true,
    valid: true,
  });
});

test("content tampering invalidates the overall verification result", async () => {
  const input = fixture();
  const gate = evaluateGate(input.action_request, input.authority_grant, input.material_evidence);
  const signing = await signingConfig();
  const issued = await issueReceipt({
    envelope: {
      ...input,
      execution_result: {
        status: "executed",
        event_time: "2026-07-20T12:00:01Z",
        after_state: { weekly_summary: true },
      },
    },
    gate,
    issuer: {
      publicBaseUrl: "https://api.example.test",
      organizationId: "org:example",
      displayName: "Example Organization",
    },
    signing,
    createdAt: "2026-07-20T12:00:02Z",
  });
  issued.receipt.action.status = "denied";

  const result = await verifyIssuedReceipt({
    receipt: issued.receipt,
    issuerAssertion: issued.issuer_assertion,
    publicKeyBase64: signing.publicKeyBase64,
  });
  assert.equal(result.digest_valid, false);
  assert.equal(result.valid, false);
});

test("canonicalization rejects floating-point values", () => {
  assert.throws(() => canonicalJson({ unsafe: 1.5 }), /safe integers/u);
});


test("human disclosure is derived from the issued machine receipt", async () => {
  const input = fixture();
  const gate = evaluateGate(input.action_request, input.authority_grant, input.material_evidence);
  const signing = await signingConfig();
  const issued = await issueReceipt({
    envelope: {
      ...input,
      execution_result: {
        status: "executed",
        event_time: "2026-07-20T12:00:01Z",
        after_state: { weekly_summary: true },
      },
    },
    gate,
    issuer: {
      publicBaseUrl: "https://api.example.test",
      organizationId: "org:example",
      displayName: "Example Organization",
    },
    signing,
    createdAt: "2026-07-20T12:00:02Z",
  });
  const disclosure = renderHumanDisclosure(issued.receipt);
  assert.match(disclosure, /Status: executed/u);
  assert.ok(disclosure.includes(issued.receipt.receipt_id));
});

test("an unexpected executed state requires an explicit exception", async () => {
  const input = fixture();
  const gate = evaluateGate(input.action_request, input.authority_grant, input.material_evidence);
  const signing = await signingConfig();
  await assert.rejects(
    issueReceipt({
      envelope: {
        ...input,
        execution_result: {
          status: "executed",
          event_time: "2026-07-20T12:00:01Z",
          after_state: { weekly_summary: false },
        },
      },
      gate,
      issuer: {
        publicBaseUrl: "https://api.example.test",
        organizationId: "org:example",
        displayName: "Example Organization",
      },
      signing,
      createdAt: "2026-07-20T12:00:02Z",
    }),
    /differs from proposed_after_state/u,
  );
});

test("operational remedy links must use HTTPS", () => {
  const input = fixture();
  input.receipt_context.remedy.status_uri = "http://insecure.example.test/remedy";
  const errors = validateDecisionEnvelope(input);
  assert.ok(errors.some((item) => item.field === "receipt_context.remedy.status_uri"));
});
