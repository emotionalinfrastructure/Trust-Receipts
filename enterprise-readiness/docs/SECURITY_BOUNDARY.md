# Security and Governance Boundary

OpenAI and administrator credentials remain Cloudflare Worker secrets. Evidence writes and report generation require an administrator bearer token. Public endpoints are same-origin without wildcard CORS. Request bodies are capped at 128 KiB. Security headers and HTTPS redirection apply. OpenAI requests use `store: false`. Generated narrative is checked for restricted overclaim terminology.

The token control is bounded candidate-stage administration. Version 1.0 still requires standards-based identity, tenant scoping, role/resource authorization, credential rotation evidence, and protected audit access.
