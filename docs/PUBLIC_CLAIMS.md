# Public Claim Guide

This guide keeps public descriptions aligned with what candidate release v0.1.1 and its bundled evidence actually demonstrate.

## Supported descriptions

| Topic | Supported wording |
| --- | --- |
| Status | “Candidate governance specification and reference implementation.” |
| Digest | “A recomputed SHA-256 digest can reveal that protected receipt content no longer matches the recorded digest.” |
| Browser parity | “The browser module implements the same restricted canonicalization and digest semantics. The bundled parity check produces the same expected digest as Python for identical test fixtures.” |
| Interactive demo | “The demo offers six interactive gate presets. The release separately contains nine conformance vectors.” |
| Denials | “A denied attempt produces a receipt in the reference flow.” |
| Verification | “The bundled tests and vectors pass in the documented environments.” |
| Signatures | “A production deployment that needs issuer authentication must select and document a recognized signature, key-management, trust-anchor, rotation, and revocation profile.” |
| Longitudinal risk | “A Trust Receipt is an event-level accountability instrument that could supply evidence to a separately designed longitudinal monitoring system.” |

## Claims to avoid

- “Byte-identical port.” The browser and Python sources are different implementations.
- “All components produce the same hashes.” Digests match only for identical canonical receipt content.
- “Tamper-proof.” The digest demonstration is tamper-evident only relative to a trusted expected digest or trusted receipt channel.
- “Cryptographically authentic” or “issuer verified.” The v0.1.1 digest does not authenticate an issuer.
- “The specification defines the production digital-signature method.” Signature-suite selection remains future profile work.
- “Certified,” “adopted standard,” “externally audited,” or “regulator approved.” None of those statuses currently applies.
- “The Trust Receipt detects benevolent capture.” The receipt records individual governed events; trajectory-level assessment requires additional longitudinal methods and evidence.

## Paste-ready demo copy

> The browser demo implements the same restricted canonicalization and SHA-256 digest semantics as the Python reference implementation. A bundled cross-runtime test confirms the same expected digest for identical fixed fixtures. This demonstrates content-integrity parity within the documented input domain; it does not authenticate the issuer.

> Choose one of six interactive gate presets. The clean preset produces an allowed receipt; expired authority, out-of-scope action, missing review, stale evidence, and unavailable remedy presets produce denial receipts. These presets are distinct from the nine conformance vectors bundled with the release.

## Paste-ready interaction instructions

> Leave the demo on the clean execution scenario; the receipt is generated automatically. Select **Verify receipt** to recompute the digest. Then select **Tamper with a field** and verify again. The mismatch shows that the changed content no longer matches the digest recorded in that receipt. It does not, by itself, prove who issued the original receipt.

## Evidence references

- Python integrity logic: `src/trust_receipt/integrity.py`
- Browser integrity logic: `browser/integrity.mjs`
- Fixed parity vectors: `fixtures/browser-digest-vectors.json`
- Cross-runtime runner: `tools/verify_browser_parity.mjs`
- Release verification evidence: `evidence/release-verification.json`
- Security boundary: `SECURITY.md` and `docs/THREAT_MODEL_v0.1.md`
