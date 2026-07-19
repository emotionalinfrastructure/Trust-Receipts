# AI Trust Receipt Reference Threat Model

## Scope

This document covers the candidate reference implementation shipped with release v0.1.1. It focuses on receipt generation, schema validation, digest verification, browser parity, and conformance-harness behavior.

## Assets

- Authority grants
- Action requests
- Material-evidence records
- Generated trust receipts
- Conformance profiles and reports
- Release artifacts and checksum records

## Security goals

1. Reject requests that exceed a grant, lack required confirmation or review, omit material evidence, or cannot produce a durable receipt or operational remedy.
2. Preserve the distinction between event recording and claims of legal, safety, fairness, or factual correctness.
3. Detect post-generation mutation of receipt fields protected by the digest when verification begins from a trusted expected digest or trusted receipt channel.
4. Avoid manufacturing review, reversibility, privacy, or remedy facts that were not supplied by the accountable system.
5. Make candidate-release and cross-runtime parity boundaries explicit.

## Non-goals

The reference implementation does not provide issuer authentication, production key management, revocation, non-repudiation, protected storage, external audit evidence, legal advice, fairness certification, or regulator approval.

## Primary risks and mitigations

| Risk | Mitigation in v0.1.1 |
| --- | --- |
| Receipt-ID collision from status-only identifiers | The full SHA-256 suffix binds the complete request, grant, evidence, and issuer objects plus creation time and terminal status. Deployments still need unique request identifiers and replay policy. |
| Digest confused with issuer authentication | The specification, README, security policy, release notes, and browser guide state the digest-only boundary. |
| Browser parity overstated | Fixed Python/JavaScript vectors cover only identical JSON inside a documented restricted domain; public claim guidance prohibits “byte-identical” and universal parity claims. |
| Unsafe generated remedy or privacy links | Generated links require an absolute HTTPS base without credentials, query, or fragment. Production deployments must bind the route to an operational service. |
| Human-review trace manufactured from available evidence | Approved review records must explicitly name evidence viewed; unknown or incomplete declarations fail closed. |
| Reversibility inferred from persistence | The action request may declare reversibility explicitly; the reference projection no longer equates persistence with reversibility. |
| Protected third-party information hard-coded absent | The request can carry an explicit protected-third-party-information flag; deployments must not assert absence when contrary evidence exists. |
| Cross-runtime numeric or Unicode divergence | Both implementations reject floats, unsafe integers, and unpaired surrogates and sort keys by Unicode code point. |

## Production controls still required

A production profile should define issuer-authenticated signatures, key custody, verifier trust anchors, rotation and revocation, replay protection, atomic gate/execution behavior, append-oriented storage, retention and deletion controls, access authorization, monitoring, incident response, and a tested remedy workflow. Passing the bundled tests does not show that a deployment has those controls.
