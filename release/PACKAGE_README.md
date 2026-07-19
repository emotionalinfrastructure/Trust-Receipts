# AI Trust Receipt Complete Release

**Candidate patch release v0.1.1 · July 19, 2026**
**Brittany Wright · Founder, Emotional Infrastructure™**

## Start here

This package joins the practitioner workbook, normative candidate technical specification, executable reference implementation, machine-readable schemas and profiles, browser digest module, governance materials, and verification evidence into one controlled release.

The corrected receipt and action-request schemas use v0.1.1 identifiers. Unchanged authority, evidence, assessment, and conformance-profile contracts retain their v0.1 identifiers.

The workbook is the implementation and assessment interface. The technical specification defines the candidate requirements. The reference package demonstrates deterministic pre-execution gating, receipt creation, restricted digest verification, human rendering, and R1–R12 conformance decisions. The evidence directory records the checks performed on the bundled artifacts.

## Package map

1. `01_Workbook` contains the revised workbook and conformance-protocol insert.
2. `02_Technical_Specification` contains the versioned Markdown source and rendered PDF.
3. `03_Reference_Implementation` contains the source archive and installable Python wheel.
4. `04_Machine_Readable` contains schemas, profiles, the browser digest module, and fixed parity vectors.
5. `05_Verification_Evidence` contains the conformance report, release-verification record, and human and machine example receipts.
6. `06_Release_Governance` contains the changelog, licenses, governance and security materials, threat model, release notes, and public claim guide.

`release-manifest.json` records every payload artifact with its size and SHA-256 digest. `SHA256SUMS.txt` covers the payload plus that manifest.

## v0.1.1 corrections

- Receipt identifiers bind the complete request, grant, evidence, and issuer objects plus creation time and terminal status using a full SHA-256 suffix.
- Generated remedy and privacy links accept only a safe, absolute HTTPS base URI.
- Reversibility and protected-third-party-information semantics can be supplied explicitly.
- Approved review records only explicitly declared evidence viewed and fails closed if required evidence is omitted or unknown evidence is cited.
- The browser and Python implementations reproduce fixed digest values inside the same documented restricted input domain.
- Release and public-language boundaries distinguish content integrity from issuer authentication and event receipts from longitudinal monitoring.

## Verified release state

- 23 of 23 automated Python tests passed.
- 2 of 2 browser/Python parity vectors passed.
- 9 of 9 conformance vectors matched expected decisions.
- The example receipt passed its digest check.
- The source archive passed extraction checks.
- The wheel passed isolated installation and command checks.
- The technical specification PDF passed text and visual inspection.

These are bundled release checks, not independent third-party verification.

## Claim boundary

This is a candidate governance and implementation package. It is not an adopted standard, certification program, legal-compliance determination, external audit, regulator approval, or guarantee that a recorded action was truthful, fair, lawful, safe, or correct.

The included SHA-256 method detects a content mismatch only relative to a trusted expected digest or trusted receipt channel. It does not authenticate the issuer. The browser module is a separate implementation with fixed fixture parity, not a byte-identical port or proof of parity for arbitrary JSON.
