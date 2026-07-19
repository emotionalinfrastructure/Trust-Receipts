# AI Trust Receipt

[![Validate candidate implementation](https://github.com/emotionalinfrastructure/Trust-Receipts/actions/workflows/validate.yml/badge.svg)](https://github.com/emotionalinfrastructure/Trust-Receipts/actions/workflows/validate.yml)
[![Candidate version](https://img.shields.io/badge/candidate-v0.1.1-1c2b3a)](release/RELEASE_NOTES_v0.1.1.md)
[![Code and schemas: Apache-2.0](https://img.shields.io/badge/code%20%26%20schemas-Apache--2.0-5b6770)](LICENSE-APACHE-2.0.txt)
[![Documentation: CC BY 4.0](https://img.shields.io/badge/documentation-CC%20BY%204.0-5b6770)](LICENSE-CC-BY-4.0.txt)

**Candidate release v0.1.1 · July 19, 2026**
**Brittany Wright · Founder, Emotional Infrastructure™**

The **AI Trust Receipt** is a candidate governance specification and reference implementation for producing durable, user-legible, machine-verifiable records of consequential AI actions.

It addresses a specific accountability gap: an AI-mediated system may change access, modify data, communicate externally, delegate authority, or affect another party while leaving the affected person with no coherent record of what occurred, under whose authority, using which evidence, with what result, and through what remedy pathway.

**[Download the complete candidate v0.1.1 release](release/AI_Trust_Receipt_Complete_Release_v0.1.1.zip)**

Release v0.1.1 includes versioned receipt and action-request schema corrections. Unchanged authority, evidence, assessment, and conformance-profile contracts retain their v0.1 identifiers; see the [changelog](CHANGELOG.md) for the exact boundary.

## Project status

| This project is | This project is not |
| --- | --- |
| A public candidate specification | An adopted technical standard |
| A testable reference implementation | A production security guarantee |
| A machine-readable receipt and conformance model | A certification or accreditation program |
| A basis for implementation, review, and research | A legal-compliance determination |
| A proposed accountability mechanism | Regulatory approval or external audit |

A conforming receipt records what an accountable system represents as having occurred and the evidence by which that representation can be checked. Receipt conformance does not prove that the underlying action was truthful, lawful, fair, safe, or correct.

## What the package contains

- A practitioner-facing implementation and assessment workbook
- A normative candidate technical specification
- An executable Python reference implementation and command-line interface
- Five JSON Schema Draft 2020-12 contracts
- Machine-readable conformance profiles
- Positive and negative conformance vectors
- Human-readable and machine-readable example receipts
- Release manifests and SHA-256 integrity records
- A reproducible verification script
- A browser digest module with fixed Python/JavaScript parity vectors
- Repository governance, security, contribution, and change-control materials

## Core system model

| Function | Purpose |
| --- | --- |
| Pre-execution gate | Requires valid authority, material evidence, receipt capability, and an operational remedy pathway before a consequential action executes. |
| Canonical event record | Creates one structured record from which machine receipts, human disclosures, integrity values, and verification results are derived. |
| Human-readable disclosure | Renders the affected-party explanation from the canonical record so it cannot silently contradict the machine record. |
| R1–R12 conformance | Applies twelve noncompensatory requirements; one failed requirement cannot be averaged away by the other eleven. |
| Remedy reference | Requires contestation and accountable review capability to exist as an operational control rather than only as a static policy statement. |

The minimum governed flow is:

```text
request + authority + evidence
              |
              v
      pre-execution gate
          /          \
       deny          allow
        |              |
 denial receipt    bounded execution
        |              |
        +------> canonical receipt
                        |
             integrity + persistence
                        |
              human disclosure + remedy
```

## Repository map

| Path | Contents |
| --- | --- |
| [`docs/Trust_Receipt_Technical_Specification_v0.1.1.md`](docs/Trust_Receipt_Technical_Specification_v0.1.1.md) | Normative candidate technical specification |
| [`schemas/`](schemas/) | JSON Schema Draft 2020-12 contracts |
| [`profiles/`](profiles/) | Machine-readable conformance profile |
| [`fixtures/`](fixtures/) | Positive and negative conformance cases |
| [`src/trust_receipt/`](src/trust_receipt/) | Reference implementation and CLI |
| [`tests/`](tests/) | Automated unit tests |
| [`browser/`](browser/) | Browser digest implementation and parity boundary |
| [`evidence/`](evidence/) | Example receipt and verification evidence |
| [`tools/verify_release.py`](tools/verify_release.py) | Reproducible release-verification script |
| [`release/`](release/) | Complete release archive, release notes, and integrity materials |
| [`GOVERNANCE.md`](GOVERNANCE.md) | Decision process, versioning, and conformance-language boundaries |
| [`ROADMAP.md`](ROADMAP.md) | Evidence-driven development sequence |

## Quick start

### 1. Clone and install

```bash
git clone https://github.com/emotionalinfrastructure/Trust-Receipts.git
cd Trust-Receipts
python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -e .
```

On Windows PowerShell, activate the environment with:

```powershell
.venv\Scripts\Activate.ps1
```

### 2. Run the unit tests

```bash
python -m unittest discover -s tests -v
```

### 3. Run the conformance vectors

```bash
python -m trust_receipt conformance run \
  --cases fixtures/conformance-cases.json \
  --profile profiles/conformance-profile.v0.1.json \
  --output evidence/conformance-report.json
```

### 4. Verify the example receipt

```bash
python -m trust_receipt receipt verify \
  --receipt evidence/example-receipt.json
```

### 5. Verify browser/Python digest parity

```bash
node tools/verify_browser_parity.mjs
```

### 6. Reproduce the release verification

```bash
python tools/verify_release.py
```

The verification script parses the bundled JSON contracts, runs the unit tests, reads the conformance report, verifies the example receipt digest, and records artifact digests in `evidence/release-verification.json`.

## Published verification baseline

The candidate v0.1.1 release records the following baseline:

| Verification measure | Result |
| --- | ---: |
| Automated Python tests | 23/23 passed |
| Browser/Python parity vectors | 2/2 passed |
| Conformance vectors | 9/9 passed |
| Normative requirements | 12 |
| JSON Schema contracts | 5 |
| Example receipt integrity | Verified |
| Source archive extraction | Verified |
| Wheel installation and CLI | Verified |

The GitHub Actions workflow re-runs the tests, conformance vectors, receipt verification, JSON parsing, and release-verification process on supported Python versions. A passing workflow means those checks reproduced in the workflow environment; it does not constitute external certification or an audit of a deployment.

## Integrity

The canonical complete-release ZIP digest is published in [`release/SHA256SUMS_REPOSITORY.txt`](release/SHA256SUMS_REPOSITORY.txt), outside the archive it covers.

The complete ZIP contains its own `SHA256SUMS.txt` and `release-manifest.json` for artifact-level verification. Repository-level release verification is available under `release/` and `evidence/`.

The v0.1.1 package demonstrates deterministic canonicalization and SHA-256 digest verification in Python and reproduces the fixed expected digest in a browser-compatible JavaScript implementation for identical bundled fixtures inside the documented restricted domain. This is source-equivalent behavior, not a byte-identical port or a claim of universal cross-runtime parity.

A digest can reveal content modification only relative to a trusted expected digest or trusted receipt channel. It does not authenticate the issuer, prove key custody, provide revocation, establish truthful inputs, or prove that the recorded action was lawful, fair, safe, or correct. See the [public claim guide](docs/PUBLIC_CLAIMS.md) for supported descriptions.

## Contributing and review

Independent implementation, defect reports, negative testing, security review, governance critique, accessibility review, and evaluation evidence are welcome.

Before contributing, read:

- [`CONTRIBUTING.md`](CONTRIBUTING.md)
- [`GOVERNANCE.md`](GOVERNANCE.md)
- [`SECURITY.md`](SECURITY.md)
- [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md)
- [`CHANGELOG.md`](CHANGELOG.md)

Substantial normative, schema, conformance, security, or architecture changes should begin with a specification-change issue. Security-sensitive findings must be reported privately under `SECURITY.md`.

## Roadmap

The immediate priority is **v0.1.x release hardening**, followed by evidence-driven consideration of a v0.2 candidate. Planned work includes stronger issuer-authentication profiles, version negotiation, diagnostic validator output, sector deployment profiles, privacy and retention guidance, independent evaluation, reference tooling, and archival publication.

See [`ROADMAP.md`](ROADMAP.md) for decision gates and scope boundaries.

## Licensing

The AI Trust Receipt uses a scope-based dual-license model:

- Executable and machine-readable implementation materials, including source code, schemas, conformance profiles, fixtures, tests, and tools, are licensed under the [Apache License 2.0](LICENSE-APACHE-2.0.txt).
- Human-readable specification, workbook, documentation, diagrams, narrative reports, and release guidance are licensed under [Creative Commons Attribution 4.0 International](LICENSE-CC-BY-4.0.txt).

See the repository [licensing notice](LICENSE) for the controlling scope, attribution format, packaged-distribution treatment, and endorsement boundary. These licenses enable evaluation and implementation; they do not represent certification, regulatory approval, adoption as a standard, or endorsement of a particular deployment.

## Citation

Citation metadata is available in [`CITATION.cff`](CITATION.cff).

Suggested citation:

> Wright, Brittany. *AI Trust Receipt: Candidate Governance Specification and Reference Implementation*. Version 0.1.1. Emotional Infrastructure, 2026.

## About the author

Brittany Wright is the founder of Emotional Infrastructure™, a governance framework for AI-mediated trust environments. Her work focuses on disclosure, consent, auditability, human review, contestability, and longitudinal accountability in AI-assisted communication systems.

Contact: [brittanywright@emotionalinfrastructure.org](mailto:brittanywright@emotionalinfrastructure.org)  
Website: [emotionalinfrastructure.org](https://emotionalinfrastructure.org)
