# AI Trust Receipt — Candidate v0.1.1

**Release date:** July 19, 2026

This patch release hardens the AI Trust Receipt candidate governance specification and reference implementation. It supersedes the repository's v0.1.0 candidate archive. The corrected receipt and action-request schemas advance to v0.1.1; unchanged authority, evidence, assessment, and conformance-profile contracts retain their v0.1 identifiers.

## Included in this release

- Practitioner workbook and conformance protocol
- Normative candidate technical specification in PDF and Markdown
- Python reference implementation and installable wheel
- Browser-compatible digest implementation and fixed cross-runtime parity vectors
- Five JSON Schema Draft 2020-12 contracts
- Machine-readable conformance and decision profiles
- Positive and negative conformance vectors
- Human-readable and machine-readable example receipts
- Verification evidence, release manifest, and SHA-256 digest ledger
- Governance, security, threat-model, licensing, and public-claim guidance

## Patch corrections

- Receipt identifiers now bind the complete request, grant, evidence, and issuer objects plus creation time and terminal status using a full SHA-256 suffix instead of combining only request ID and status.
- Generated remedy and privacy routes accept a configurable HTTPS base URI and reject unsafe schemes, credentials, queries, and fragments.
- Reversibility and protected-third-party-information values can be supplied explicitly rather than being inferred from persistence or hard-coded.
- Approved reviews record only evidence identifiers explicitly declared as viewed; missing required or unknown evidence fails closed.
- The restricted canonicalizer rejects floats, unsafe integers, and unpaired Unicode surrogates, with key ordering defined by Unicode code point.
- The receipt schema exposes only the implemented digest-demo method; production signature suites remain future versioned profile work.
- Public descriptions distinguish fixture parity from a byte-identical port, digest integrity from issuer authentication, six interactive demo presets from nine conformance vectors, and event receipts from longitudinal monitoring.

## Verification status

- **23/23 automated Python tests passed**
- **2/2 browser/Python parity vectors passed**
- **9/9 conformance vectors matched expected decisions**
- **Example receipt integrity verified**
- **Source archive extraction verified**
- **Wheel installation and command-line interface verified**

These are bundled release checks, not independent third-party verification.

## Complete-release integrity

The canonical ZIP digest is published in `release/SHA256SUMS_REPOSITORY.txt`, outside the archive it covers. The archive contains its own payload manifest and checksum ledger.

## Candidate-status and security boundary

This package proposes an implementation model. It is not an adopted standard, certification program, legal-compliance determination, external audit, or regulatory approval. Receipt conformance does not establish that a recorded action was truthful, fair, lawful, safe, or correct.

The included SHA-256 method demonstrates content integrity only when a verifier starts from a trusted expected digest or trusted receipt channel. It does not authenticate the issuer, establish key custody, provide revocation or non-repudiation, or define a production signature suite. A production deployment requiring issuer authentication must select and document those controls.

## Licensing

Executable and machine-readable implementation materials are licensed under Apache License 2.0. Human-readable specification, workbook, documentation, diagrams, narrative reports, and release guidance are licensed under Creative Commons Attribution 4.0 International. See `LICENSE`, `LICENSE-APACHE-2.0.txt`, `LICENSE-CC-BY-4.0.txt`, and `NOTICE` for controlling terms.

## Citation

Wright, B. (2026). *AI Trust Receipt: Candidate governance specification and reference implementation* (Version 0.1.1). Emotional Infrastructure™.
