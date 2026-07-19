# Changelog

All notable changes to the AI Trust Receipt candidate specification and reference implementation are documented in this file.

The project uses semantic versioning as an implementation signal. Candidate status, external validation, adoption, and regulatory standing are separate questions and are not implied by a version number.

## [Unreleased]

No unreleased changes are recorded at publication time.

## [0.1.1] - 2026-07-19

### Added

- Scope-based dual licensing: Apache License 2.0 for executable and machine-readable implementation materials and Creative Commons Attribution 4.0 International for human-readable specification and documentation materials.
- Repository contribution guidance and normative change discipline.
- Security vulnerability reporting process and explicit integrity limitations.
- Maintainer-led project governance, decision criteria, conflict-of-interest expectations, and conformance-language boundaries.
- Community conduct expectations.
- Evidence-driven roadmap for release hardening, v0.2 evaluation, reference tooling, independent review, and archival publication.
- Continuous integration and repository issue templates.
- Reference threat model and public claim-discipline guide.
- Dependency-free browser digest module, fixed cross-runtime parity vectors, and a Node.js verification runner.
- Negative tests for schema failures, expiration boundaries, confirmation, human review, delegation, receipt availability, safe generated links, canonicalization restrictions, and receipt identity stability.

### Changed

- Release documentation now identifies the applicable licensing model.
- Candidate package, receipt schema, and action-request schema advanced to v0.1.1; unchanged authority, evidence, assessment, and conformance-profile contracts remain at v0.1.
- The receipt integrity schema now accepts only the implemented digest-demo method; an unusable digital-signature placeholder was removed until a complete signature profile is defined.
- Receipt identifiers now bind the complete request, grant, evidence, and issuer objects plus creation time and terminal status using a full SHA-256 suffix.
- Generated remedy and privacy routes accept a configurable, validated HTTPS base URI.
- Reversibility and protected-third-party-information values can be supplied explicitly by the action request.
- Approved human review now records only explicitly declared evidence viewed and fails closed for unknown or omitted required evidence.
- The restricted canonicalization domain now rejects unsafe integers and unpaired Unicode surrogates, enabling documented Python/browser fixture parity.

### Fixed

- Release verification now resolves the technical specification PDF from its actual `docs/` location.
- Release notes no longer duplicate licensing text or describe internal checks as independent verification.
- Public wording no longer describes the browser implementation as byte-identical, implies universal hash equality, or presents the digest as issuer authentication.

### Verification baseline

- 23 of 23 Python tests passed.
- 2 of 2 browser/Python parity vectors passed.
- 9 of 9 conformance vectors passed.
- Example receipt integrity verified.
- Source archive extraction verified.
- Wheel installation and CLI verified.

### Status boundary

Version 0.1.1 remains a candidate governance and implementation package. Passing the bundled checks is not certification, external audit, adoption as a standard, a legal-compliance determination, or regulatory approval.

## [0.1.0] - 2026-07-15

### Added

- Initial public candidate release of the AI Trust Receipt specification and reference implementation.
- Normative technical specification for consequential AI action receipts.
- Pre-execution gate for authority, scope, consequence, confirmation, delegation, material evidence, receipt availability, and remedy availability.
- Canonical event receipt with machine-readable and human-readable projections.
- Five JSON Schema Draft 2020-12 contracts covering authority grants, action requests, material evidence, trust receipts, and conformance assessments.
- Python reference implementation and command-line interface.
- R1–R12 noncompensatory conformance profile.
- Positive and negative conformance vectors.
- Unit test suite.
- Example receipt and integrity verification evidence.
- Practitioner-facing implementation and assessment workbook.
- Release archive, manifest, SHA-256 verification records, source distribution, and wheel package.
- Citation metadata.

### Verification baseline

- 11 of 11 automated tests passed.
- 9 of 9 conformance vectors passed.
- Example receipt integrity verified.
- Source archive extraction verified.
- Wheel installation and CLI verified.

### Status boundary

Version 0.1.0 is a candidate governance and implementation package. It is not an adopted standard, certification program, legal-compliance determination, external audit, or regulatory approval.
