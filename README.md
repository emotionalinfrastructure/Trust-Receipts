# AI Trust Receipt

**Candidate release v0.1.0 · July 15, 2026**  
**Brittany Wright · Founder, Emotional Infrastructure™**

The AI Trust Receipt is a candidate governance specification and reference implementation for producing durable, user-legible, machine-verifiable records of consequential AI actions.

**[Download the complete candidate v0.1.0 release](release/AI_Trust_Receipt_Complete_Release_v0.1.0.zip)**

AI agents increasingly perform or initiate actions that can change access, modify data, delegate authority, or affect third parties. Existing records are often operational, fragmented, inaccessible to affected people, or insufficient to reconstruct what occurred, whether valid authorization existed, what evidence informed the action, and how the outcome can be contested. The Trust Receipt addresses that infrastructure gap by binding an action to its authority, evidence, result, integrity state, and remedy pathway.

## Release contents

- A practitioner-facing implementation and assessment workbook
- A normative candidate technical specification
- An executable Python reference implementation and command-line interface
- Five JSON Schema Draft 2020-12 contracts
- Machine-readable conformance profiles
- Positive and negative conformance vectors
- Human-readable and machine-readable example receipts
- Release manifests and SHA-256 integrity records

## Five core functions

| Function | Purpose |
| --- | --- |
| Pre-execution gate | Requires authority, material evidence, and an operational remedy pathway before a consequential action executes. |
| Canonical event record | Creates one structured object from which machine receipts, human disclosures, and integrity verification are derived. |
| Human-readable disclosure | Renders the user-facing explanation from the canonical record so it cannot silently contradict the machine record. |
| R1–R12 conformance | Applies twelve noncompensatory requirements; one failed requirement cannot be averaged away by the other eleven. |
| Remedy reference | Requires contestation capability to exist before execution rather than appearing as a static policy page afterward. |

## Independently reproduced verification

| Verification measure | Result |
| --- | ---: |
| Automated tests | 11/11 passed |
| Conformance vectors | 9/9 passed |
| Normative requirements | 12 |
| JSON Schema contracts | 5 |
| Example receipt integrity | Verified |
| Source archive extraction | Verified |
| Wheel installation and CLI | Verified |

## Quick start

After extracting the reference implementation package:

```bash
PYTHONPATH=src python3 -m unittest discover -s tests -v
```

Run the conformance vectors:

```bash
PYTHONPATH=src python3 -m trust_receipt conformance run \
  --cases fixtures/conformance-cases.json \
  --profile profiles/conformance-profile.v0.1.json \
  --output evidence/conformance-report.json
```

Verify the example receipt:

```bash
PYTHONPATH=src python3 -m trust_receipt receipt verify \
  --receipt evidence/example-receipt.json
```

## Integrity

Canonical complete-release ZIP SHA-256:

```text
e29b0f453dc330f3030f706883939291a56d0b0f2d6005613052e86004c222b3
```

The complete ZIP contains its own `SHA256SUMS.txt` and `release-manifest.json` for artifact-level verification. Repository-level release verification is available under `release/`.

## Claim boundary

This is a candidate governance and implementation package. It is not an adopted standard, certification program, legal-compliance determination, external audit, or regulatory approval. A receipt records what an accountable system represents as having occurred and the evidence by which that representation can be checked. Trustworthiness depends on truthful inputs, sound governance, operational controls, and independent scrutiny where warranted.

## Licensing

The AI Trust Receipt uses a scope-based dual-license model:

- Executable and machine-readable implementation materials, including source code, schemas, conformance profiles, fixtures, tests, and tools, are licensed under the [Apache License 2.0](LICENSE-APACHE-2.0.txt).
- Human-readable specification, workbook, documentation, diagrams, narrative reports, and release guidance are licensed under [Creative Commons Attribution 4.0 International](LICENSE-CC-BY-4.0.txt).

See the repository [licensing notice](LICENSE) for the controlling scope, attribution format, packaged-distribution treatment, and endorsement boundary. These licenses enable evaluation and implementation; they do not represent certification, regulatory approval, adoption as a standard, or endorsement of a particular deployment.

## About the author

Brittany Wright is the founder of Emotional Infrastructure™, a governance framework for AI-mediated trust environments. Her work focuses on disclosure, consent, auditability, human review, contestability, and longitudinal accountability in AI-assisted communication systems.

Contact: [brittanywright@emotionalinfrastructure.org](mailto:brittanywright@emotionalinfrastructure.org)  
Website: [emotionalinfrastructure.org](https://emotionalinfrastructure.org)
