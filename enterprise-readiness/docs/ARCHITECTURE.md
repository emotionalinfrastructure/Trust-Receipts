# Architecture Decision: Enterprise Readiness Runtime

The review is a separate Cloudflare Worker under `enterprise-readiness/` in `emotionalinfrastructure/Trust-Receipts`, with Worker identity `ei-enterprise-readiness` and intended domain `readiness.emotionalinfrastructure.org`.

The browser is an accountability surface. The Worker is authoritative for scoring, validation, evidence status controls, authentication, and persistence. OpenAI receives a fixed score and evidence snapshot only to compose narrative. A generated report cannot elevate evidence, alter a score, establish external validation, or transform standards mapping into standards conformity.
