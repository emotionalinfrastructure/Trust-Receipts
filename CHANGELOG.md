# Changelog

All notable changes to the AI Trust Receipt candidate specification and reference implementation are documented in this file.

The project uses semantic versioning as an implementation signal. Candidate status, external validation, adoption, and regulatory standing are separate questions and are not implied by a version number.

## [Unreleased]

### Added

- Scope-based dual licensing: Apache License 2.0 for executable and machine-readable implementation materials and Creative Commons Attribution 4.0 International for human-readable specification and documentation materials.
- Repository contribution guidance and normative change discipline.
- Security vulnerability reporting process and explicit integrity limitations.
- Maintainer-led project governance, decision criteria, conflict-of-interest expectations, and conformance-language boundaries.
- Community conduct expectations.
- Evidence-driven roadmap for release hardening, v0.2 evaluation, reference tooling, independent review, and archival publication.
- Continuous integration and repository issue templates when merged from the repository-readiness change set.

### Changed

- Release documentation now identifies the applicable licensing model.
- Repository navigation and project-status language are being strengthened without changing the v0.1.0 normative contract.

### Fixed

- Release verification now resolves the technical specification PDF from its actual `docs/` location.

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
