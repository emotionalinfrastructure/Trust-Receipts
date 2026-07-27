# Architecture and Deployment Map

Research constructs → Normative requirements → Machine-readable schemas → Policy and consent engine → Pre-execution decision gate → Action or denial → Provenance event → Trust Receipt → Verification and remedy → Longitudinal accountability.

## Deployment rule
No deployment should be scored above 3 until it exposes or otherwise documents version, environment, release, commit SHA, operational owner, repository, and deployment identity.

## Enterprise Readiness Runtime mapping

| Component | Function | Repository | Source path | Worker/API | Database | Domain | Operational owner | Evidence status |
|---|---|---|---|---|---|---|---|---|
| Enterprise Readiness Dashboard | Public accountability surface | emotionalinfrastructure/Trust-Receipts | enterprise-readiness/src/ui.mjs | Worker-rendered UI | D1 read layer | readiness.emotionalinfrastructure.org | Brittany Wright | Implemented source; deployment unresolved |
| Readiness API | Scoring, evidence and report boundary | emotionalinfrastructure/Trust-Receipts | enterprise-readiness/src/index.mjs | /api/v1 | D1 | readiness.emotionalinfrastructure.org | Brittany Wright | Implemented source; deployment unresolved |
| OpenAI report adapter | Evidence-bound narrative drafting | emotionalinfrastructure/Trust-Receipts | enterprise-readiness/src/openai.mjs | OpenAI Responses API | Review snapshot in D1 | Server-side only | Brittany Wright | Implemented; API execution requires configured secret |
| Deployment provenance | Release-to-runtime trace | emotionalinfrastructure/Trust-Receipts | .github/workflows/enterprise-readiness.yml | /health and /version | N/A | readiness.emotionalinfrastructure.org | Brittany Wright | Workflow implemented; production evidence unresolved |
