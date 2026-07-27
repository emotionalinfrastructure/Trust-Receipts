export const VERIFICATION_STATUS = Object.freeze({
  system: "AI Trust Receipt",
  verification_layer: "Enterprise Verification Runtime v0.3.0",
  generated_at: "2026-07-27T00:00:00Z",
  posture: "evidence-bound",
  release_gate: "NOT_YET_PASSED",
  claims: {
    hosted_demo: "VERIFIED_BY_SOURCE",
    unsigned_receipts: "VERIFIED_BY_SOURCE",
    nonpersistent_demo: "VERIFIED_BY_SOURCE",
    issuer_authentication: "NOT_IMPLEMENTED",
    durable_persistence: "NOT_IMPLEMENTED",
    independent_security_review: "NOT_VERIFIED"
  },
  evidence: [
    { id: "EV-001", control: "request_body_limit", status: "PASS", source: "demo-worker/src/index.mjs" },
    { id: "EV-002", control: "security_headers", status: "PASS", source: "demo-worker/src/index.mjs" },
    { id: "EV-003", control: "receipt_digest_verification", status: "PASS", source: "demo-worker/src/core.mjs" },
    { id: "EV-004", control: "durable_storage", status: "NOT_IMPLEMENTED", source: "documented hosted-demo boundary" },
    { id: "EV-005", control: "issuer_signing", status: "NOT_IMPLEMENTED", source: "documented hosted-demo boundary" }
  ],
  public_claim_boundary: "This endpoint reports source-observable controls and documented limitations. It is not an independent certification, security attestation, or production-readiness determination."
});

export const VERIFICATION_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Enterprise Verification | AI Trust Receipt</title>
<style>
:root{color-scheme:dark;--navy:#101C2C;--teal:#176B73;--copper:#C46A3A;--ivory:#F5F1E8;--slate:#9aa5b1}*{box-sizing:border-box}body{margin:0;background:var(--navy);color:var(--ivory);font:16px/1.55 system-ui,sans-serif}.wrap{max-width:1040px;margin:auto;padding:48px 22px}h1{font-size:clamp(2rem,5vw,4rem);line-height:1.05;margin:.2em 0}.eyebrow{color:#71d0d4;text-transform:uppercase;letter-spacing:.13em;font-weight:700}.card{background:#16263a;border:1px solid #28415e;border-radius:16px;padding:22px;margin:18px 0}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}.metric{background:#0d1724;border:1px solid #28415e;border-radius:12px;padding:18px}.label{color:var(--slate);font-size:.82rem;text-transform:uppercase;letter-spacing:.08em}.value{font-size:1.2rem;font-weight:750;margin-top:7px}.warn{color:#f1b488}.pass{color:#80d8bd}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:12px;border-bottom:1px solid #28415e}a{color:#80d8d8}.note{border-left:4px solid var(--copper);padding-left:16px;color:#d6dde6}</style></head>
<body><main class="wrap"><div class="eyebrow">Emotional Infrastructure™</div><h1>Enterprise Verification Runtime</h1><p>This surface exposes the current evidence boundary for the hosted AI Trust Receipt demonstration. It separates source-observable controls from capabilities that remain unimplemented or unverified.</p>
<div class="grid"><div class="metric"><div class="label">Verification layer</div><div class="value">v0.3.0</div></div><div class="metric"><div class="label">Release gate</div><div class="value warn">Not yet passed</div></div><div class="metric"><div class="label">Posture</div><div class="value">Evidence-bound</div></div></div>
<section class="card"><h2>Current control evidence</h2><table><thead><tr><th>Control</th><th>Status</th></tr></thead><tbody><tr><td>Request body limit</td><td class="pass">Pass</td></tr><tr><td>Baseline security headers</td><td class="pass">Pass</td></tr><tr><td>Digest verification</td><td class="pass">Pass</td></tr><tr><td>Durable persistence</td><td class="warn">Not implemented</td></tr><tr><td>Issuer signing</td><td class="warn">Not implemented</td></tr></tbody></table></section>
<section class="card"><h2>Machine-readable evidence</h2><p><a href="/api/verification/status">Open verification status JSON</a></p><p class="note">This is not an independent certification, security attestation, or production-readiness determination. It is a public evidence boundary generated from the repository’s documented and source-observable controls.</p></section>
<p><a href="/">Return to the Trust Receipt demonstration</a></p></main></body></html>`;
