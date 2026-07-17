# AI Trust Receipt Complete Release

**Candidate release v0.1 · 15 July 2026**  
**Prepared for Brittany Wright, founder of Emotional Infrastructure**

## Start here

This master package joins the reader-facing workbook, normative candidate technical specification, executable reference implementation, machine-readable schemas and profiles, and verification evidence into one controlled release.

The workbook is the implementation and assessment interface. The technical specification defines the candidate normative requirements. The reference package demonstrates deterministic pre-execution gating, receipt creation, integrity checking, human rendering, and R1–R12 conformance decisions. The evidence directory records the included test results and example receipt.

## Package map

1. `01_Workbook` contains the revised interactive workbook and the conformance protocol insert.
2. `02_Technical_Specification` contains the rendered PDF and versioned Markdown source.
3. `03_Reference_Implementation` contains the complete source release and installable Python wheel.
4. `04_Machine_Readable` contains the decision profiles and JSON Schema Draft 2020-12 contracts.
5. `05_Verification_Evidence` contains the conformance report, release verification manifest, and human and machine example receipts.

`release-manifest.json` records every included artifact with its size and SHA-256 digest. `SHA256SUMS.txt` provides the same digests in a conventional verification format.

## Verified release state

The reference implementation passed 11 of 11 automated tests. All 9 normative conformance vectors matched their expected decisions. The sample receipt passed its integrity check. The source archive passed extraction and independent execution checks, and the wheel passed an isolated installation check.

## Claim boundary

This is a candidate governance and implementation package. It is not an adopted standard, certification program, legal-compliance determination, external audit, regulator approval, or guarantee that a recorded action was fair, lawful, safe, or correct. The included SHA-256 digest is an integrity demonstration and does not authenticate the issuer.
