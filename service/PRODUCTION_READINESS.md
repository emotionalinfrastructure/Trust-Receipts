# Production Readiness and Deployment Gate

**Service profile:** AI Trust Receipt operational service `0.2.0-alpha.1`

This document defines the minimum technical gate for moving the service from a validated repository implementation to a publicly reachable deployment. Passing this gate demonstrates that the configured service can be built, migrated, deployed, and reached through its declared origin. It does not establish certification, regulatory compliance, legal sufficiency, or readiness for consequential C2 or C3 use.

## Release states

| State | Meaning | Permitted use |
|---|---|---|
| Repository validated | Unit tests, API-contract checks, candidate configuration checks, and Worker dry-run pass. | Engineering review and local evaluation |
| Infrastructure provisioned | Database, deployment credentials, Worker secrets, protected environment, and custom origin are configured. | Controlled deployment preparation |
| Deployment verified | Migration, deployment, health, issuer-key discovery, and CORS smoke tests pass. | Non-consequential integration testing |
| Operationally reviewed | Security, privacy, key custody, monitoring, backup, incident response, and remedy operations are reviewed. | Limited governed pilots |
| C2/C3 approved | Sector controls, human review, consequence classification, evidence rules, and accountability are approved. | Explicitly approved consequential uses only |

## Automated repository gate

The pull-request workflow must pass:

1. Candidate configuration validation.
2. OpenAPI 3.1 contract validation.
3. Operational service unit tests.
4. Cloudflare Worker dry-run bundling.
5. Existing Python reference and conformance checks.

The manual production workflow repeats the validation, applies the selected database migrations, deploys the Worker, and runs public smoke tests against the declared service origin.

## Required deployment configuration

Before production deployment:

- Create the production D1 database and replace the placeholder identifier in `wrangler.toml`.
- Configure a protected GitHub environment named `production`.
- Configure least-privilege Cloudflare deployment credentials.
- Configure the intended public service origin and smoke-test browser origin.
- Generate the issuer key pair and place the private key in an approved secret manager.
- Configure the Worker issuer and bootstrap secrets using the process documented in `README.md`.
- Bind the intended API hostname to the deployed Worker.

Production validation fails closed when the D1 identifier is still the repository placeholder, the declared origin is not HTTPS, the deployment origin differs from `PUBLIC_BASE_URL`, wildcard CORS is enabled, or required deployment credentials are absent.

## Post-deployment smoke test

The smoke test checks:

- `GET /health`
- `GET /.well-known/ai-trust-receipt-keys.json`
- CORS preflight for `POST /v1/decisions`
- JSON response types
- request identifiers
- non-cacheable health responses
- at least one supported Ed25519 verification key

Issuer-key discovery is part of the smoke test because it exercises issuer configuration and the D1 binding rather than only confirming process liveness.

## Initial operational verification

After deployment and bootstrap, complete a controlled C0 or C1 workflow:

1. Evaluate an allowed action.
2. Finalize the observed outcome.
3. Verify the receipt and issuer assertion.
4. Retrieve the protected receipt.
5. Open and resolve a test remedy case.
6. Confirm expected audit events.
7. Revoke the test assertion and confirm revocation is reported.

Do not connect the public demo to the operational service until this controlled workflow passes.

## Stop conditions

Do not proceed when:

- Production configuration validation fails.
- Migration, contract validation, unit tests, Worker bundling, or smoke testing fails.
- The issuer private key is stored in the repository or workflow output.
- The production environment lacks approval protection.
- No accountable owner exists for remedy requests and incident response.
- Backup and restoration have not been tested.
- The proposed use involves C2 or C3 consequences without an approved deployment profile and independent review.

## Deployment evidence

Retain the Git commit, workflow run, migration result, Worker version, public origin, issuer key identifier and public fingerprint, smoke-test output, bootstrap record, security-review findings, backup test, and named remedy and incident-response owners.

These records form deployment evidence. They do not replace independent audit or the underlying governance obligations.
