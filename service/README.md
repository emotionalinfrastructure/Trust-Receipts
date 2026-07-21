# AI Trust Receipt Operational Service

**Status:** deployment candidate `0.2.0-alpha.1`

This directory converts the candidate AI Trust Receipt specification into an API-backed Cloudflare Worker with durable D1 storage. It is designed as an operational implementation layer, not as a claim of certification or regulatory compliance.

## What this service adds

The v0.1.1 reference package demonstrates deterministic receipt construction and SHA-256 content-integrity verification. This service adds an operational deployment profile with:

- pre-execution evaluation of authority, scope, consequence, confirmation, review, delegation, evidence, receipt availability, and remedy availability;
- a two-phase execution permit so the gate decision occurs before the external action;
- automatic denial receipts when the gate fails;
- terminal receipt finalization after an allowed action executes;
- canonical v0.1.1 machine receipts;
- detached Ed25519 issuer assertions without adding undeclared fields to the v0.1.1 receipt schema;
- D1 persistence for decisions, receipts, issuer keys, API keys, remedy cases, revocation state, and audit events;
- token-protected receipt retrieval and public verification;
- receipt revocation without rewriting the original receipt;
- affected-party remedy case submission and token-protected status retrieval;
- CORS controls, request-size limits, scoped API keys, short-lived decision permits, and idempotent finalization.

## Architectural boundary

The service preserves the candidate schema boundary. The core receipt remains a `0.1.1` receipt using the existing `sha-256-digest-demo` integrity profile. Issuer authentication is represented as a detached, versioned operational extension:

```json
{
  "profile": "ei-ed25519-detached-v0.1-draft",
  "algorithm": "Ed25519",
  "key_id": "ei-ed25519-2026-01",
  "receipt_id": "urn:trust-receipt:...",
  "receipt_digest": "sha256:...",
  "signed_at": "2026-07-21T12:00:02Z",
  "signature": "..."
}
```

This avoids silently altering the normative receipt contract. A future specification version can standardize a signature profile after review and conformance testing.

## API flow

### 1. Evaluate before execution

`POST /v1/decisions`

The caller submits:

- `action_request`
- `authority_grant`
- `material_evidence`
- `receipt_context`

A denied decision returns all gate failures and a signed denial receipt. An allowed decision returns a short-lived execution permit. The external executor should not mutate state until it receives `decision: "allow"`.

### 2. Execute within the authorized boundary

The external system performs only the action and target authorized by the decision snapshot.

### 3. Finalize the observed outcome

`POST /v1/decisions/{decision_id}/finalize`

The caller supplies the execution permit in `X-Decision-Token` and submits the observed terminal outcome. The service creates, seals, signs, stores, and returns the receipt. Finalization is idempotent and guarded against concurrent duplicate issuance.

## Endpoints

| Method | Path | Authentication | Purpose |
|---|---|---|---|
| `GET` | `/health` | Public | Service health response |
| `GET` | `/.well-known/ai-trust-receipt-keys.json` | Public | Current and retained issuer verification keys |
| `POST` | `/v1/admin/bootstrap` | Bootstrap bearer secret | Register the issuer key and create the first scoped API key |
| `POST` | `/v1/decisions` | API key with `decisions:evaluate` | Evaluate the pre-execution gate |
| `POST` | `/v1/decisions/{id}/finalize` | API key with `receipts:finalize` plus decision token | Record the observed terminal outcome |
| `GET` | `/v1/receipts/{receipt_id}` | Receipt access token or API key with `receipts:read` | Retrieve a receipt, human disclosure, issuer assertion, and revocation state |
| `POST` | `/v1/verify` | Public | Verify digest, issuer signature, known key, and revocation state |
| `POST` | `/v1/receipts/{receipt_id}/revoke` | API key with `receipts:revoke` | Revoke an issuer assertion without rewriting the receipt |
| `POST` | `/v1/receipts/{receipt_id}/remedies` | Receipt access token or API key with `receipts:read` | Open a remedy case |
| `GET` | `/v1/remedies/{case_id}` | Remedy bearer token | Retrieve remedy status |
| `POST` | `/v1/remedies/{case_id}/status` | API key with `remedies:manage` | Move a remedy case through an allowed review transition |

## Local validation

```bash
cd service
npm install
npm test
npm run check
```

`npm run check` runs the Node test suite and a Wrangler dry-run bundle.

## Provisioning

### 1. Create the D1 database

```bash
npx wrangler d1 create ai-trust-receipts
```

Replace the placeholder `database_id` in `wrangler.toml` with the returned identifier.

### 2. Apply the migration

```bash
npm run db:migrate:remote
```

### 3. Generate an Ed25519 issuer key pair

```bash
npm run keys:generate > issuer-keypair.json
```

The private key must be moved immediately into an approved secret manager. Do not commit `issuer-keypair.json`.

### 4. Configure Worker secrets

```bash
npx wrangler secret put ISSUER_PRIVATE_KEY_PKCS8_BASE64
npx wrangler secret put ISSUER_PUBLIC_KEY_SPKI_BASE64
npx wrangler secret put BOOTSTRAP_ADMIN_TOKEN
```

Use a cryptographically random bootstrap token and rotate or remove it after the first operational API key is created.

### 5. Review deployment variables

Update these values in `wrangler.toml`:

- `PUBLIC_BASE_URL`
- `ISSUER_ORGANIZATION_ID`
- `ISSUER_DISPLAY_NAME`
- `ISSUER_KEY_ID`
- `ALLOWED_ORIGINS`
- `DECISION_TTL_SECONDS`

### 6. Deploy

```bash
npm run deploy
```

### 7. Bootstrap the first API key

```bash
curl -sS -X POST "https://api.emotionalinfrastructure.org/v1/admin/bootstrap" \
  -H "Authorization: Bearer $BOOTSTRAP_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "organization_id": "org:emotional-infrastructure",
    "label": "production issuer",
    "scopes": [
      "decisions:evaluate",
      "receipts:finalize",
      "receipts:revoke",
      "receipts:read",
      "remedies:manage"
    ]
  }'
```

The plaintext API key is returned once. Store it in a secret manager. Receipt issuance likewise returns a one-time receipt access token; retain that token for affected-party retrieval and remedy initiation.

## Example decision and finalization

```bash
curl -sS -X POST "https://api.emotionalinfrastructure.org/v1/decisions" \
  -H "Authorization: Bearer $TRUST_RECEIPT_API_KEY" \
  -H "Content-Type: application/json" \
  --data @examples/create-decision.json
```

For an allowed decision, preserve `decision_id` and `execution_permit`, execute the authorized action, then finalize:

```bash
curl -sS -X POST "https://api.emotionalinfrastructure.org/v1/decisions/$DECISION_ID/finalize" \
  -H "Authorization: Bearer $TRUST_RECEIPT_API_KEY" \
  -H "X-Decision-Token: $EXECUTION_PERMIT" \
  -H "Content-Type: application/json" \
  --data @examples/finalize-decision.json
```

## Security and governance requirements before consequential production use

A successful deployment does not itself establish operational readiness for high-impact use. Before handling real C2 or C3 actions, the accountable organization should complete at least the following controls:

1. Independent application-security review and threat modeling.
2. Cloudflare account hardening, least-privilege API tokens, protected production environments, and mandatory multifactor authentication.
3. Managed key custody, rotation, retirement, compromise response, and documented trust anchors.
4. D1 backup, restoration, retention, deletion, and subject-access procedures.
5. Rate limiting and abuse controls for public verification and remedy endpoints.
6. Monitoring for denial spikes, repeated invalid permits, signature failures, unusual remedy volume, and failed finalization attempts.
7. A real staffed remedy workflow with service-level objectives and escalation ownership.
8. Sector-specific consequence classification, notice, retention, and human-review requirements.
9. Privacy review for the content permitted in `before_state`, `after_state`, evidence provenance, and remedy reasons.
10. External conformance testing against the published specification and deployment profile.

## Claim boundary

This service can demonstrate that a stored receipt retained its canonical content, that a configured Ed25519 issuer key signed the detached assertion, that the key is known under the deployment profile, and that the receipt has not been marked revoked. It does not prove that source evidence was truthful or that the underlying action was lawful, fair, safe, correct, or compliant with every applicable obligation.
