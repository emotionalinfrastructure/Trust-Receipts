# Cloudflare Deployment Evidence

Worker: `ei-enterprise-readiness`; source: `enterprise-readiness/`; domain: `readiness.emotionalinfrastructure.org`; D1 binding: `DB`; secrets: `OPENAI_API_KEY` and `ADMIN_TOKEN`.

Before calling the runtime deployed, retain evidence of a successful protected GitHub Actions run, D1 migration, Wrangler deployment, HTTP 200 from `/health` and `/version`, reviewed commit SHA and release ID in `/version`, configured D1 and OpenAI posture in `/health`, and correct custom-domain resolution. Until then: **implemented source; production deployment not established**.
