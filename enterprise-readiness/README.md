# Emotional Infrastructure™ Enterprise Readiness Runtime

This directory converts the Enterprise Readiness Export Pack into an evidence-bound Cloudflare Worker application. It provides a public accountability dashboard, deterministic weighted scoring, a D1-backed evidence inventory, OpenAI-assisted narrative generation, version provenance, and a GitHub-controlled release path.

## Claim boundary

This is a candidate review implementation. It does not certify Emotional Infrastructure™, determine legal compliance, establish standards conformity, or substitute internal tests for independent validation.

## Architecture

- **Public dashboard:** readiness score, domains, evidence statuses, release gates, and provenance links.
- **Worker API:** `/health`, `/version`, `/openapi.json`, and versioned `/api/v1/*` routes.
- **Deterministic scoring:** the Worker calculates the weighted score. OpenAI cannot alter it.
- **OpenAI report engine:** the Responses API drafts report narrative from the score and evidence snapshot with `store: false`.
- **D1 evidence store:** evidence records and generated review snapshots can be persisted for auditability.
- **GitHub release control:** pull-request validation and protected production deployment are defined in `.github/workflows/enterprise-readiness.yml`.

## Local verification

```bash
cd enterprise-readiness
npm test
node scripts/validate-config.mjs
```

## Required production configuration

GitHub environment `enterprise-readiness-production` requires:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `EI_READINESS_D1_DATABASE_ID`
- `OPENAI_API_KEY`
- `EI_READINESS_ADMIN_TOKEN`

The deployment workflow renders a deployment-only Wrangler file, applies D1 migrations, installs Worker secrets, deploys `ei-enterprise-readiness`, and smoke-tests `/health` and `/version` at `https://readiness.emotionalinfrastructure.org`.

## API boundary

Public:

- `GET /health`
- `GET /version`
- `GET /openapi.json`
- `GET /api/v1/model`
- `GET /api/v1/evidence`
- `POST /api/v1/score`

Administrator bearer token required:

- `POST /api/v1/evidence`
- `POST /api/v1/reviews/generate`

## Current designation

An advanced candidate governance architecture with executable reference implementations, substantial standards-oriented documentation, and public demonstration systems, now entering integration, validation, and enterprise-hardening.
