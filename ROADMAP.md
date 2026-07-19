# AI Trust Receipt Roadmap

## Current baseline

Candidate release **v0.1.1** establishes the current public implementation boundary:

- a normative candidate technical specification;
- a pre-execution authority and evidence gate;
- a canonical receipt model;
- five JSON Schema Draft 2020-12 contracts;
- an executable Python reference implementation and CLI;
- R1–R12 noncompensatory conformance logic;
- positive and negative conformance vectors;
- human-readable and machine-readable example receipts;
- fixed Python/browser digest-parity vectors within a documented restricted domain;
- release integrity and verification materials.

The next stage is not to declare adoption. It is to improve reproducibility, implementation clarity, independent evaluation, and evidence quality.

## Milestone 1: v0.1.x release hardening

**Objective:** Make the existing candidate release easier to inspect, reproduce, challenge, and maintain without changing its core normative contract.

Planned work:

- maintain continuous integration for unit tests, browser parity, conformance vectors, receipt verification, and release verification;
- maintain repository governance, contribution, security, conduct, changelog, and issue-management files;
- maintain reproducible package-build instructions and artifact verification;
- preserve clear navigation between specification, schemas, profiles, evidence, tools, and release materials;
- explicit compatibility and deprecation rules;
- defect correction and security hardening;
- independent reproduction instructions that do not rely on the author’s environment.

**Completion evidence:** all bundled tests and vectors pass in a clean supported environment; release artifacts can be rebuilt with documented commands or reproduced by an identified third party; repository decisions and contribution boundaries are documented.

## Milestone 2: v0.2 candidate specification

**Objective:** Extend the model where implementation evidence shows a real interoperability or accountability need.

Candidate workstreams:

### Integrity and issuer-authentication profiles

Define a pluggable integrity architecture that distinguishes content digest verification from issuer authentication. Evaluate signature algorithms, key identifiers, trust anchors, rotation, revocation, verification status, and failure semantics without embedding one universal trust model into the core receipt.

### Version negotiation and extension governance

Define how producers and consumers identify compatible receipt versions, reject unsupported normative changes, and use versioned extensions without silently weakening core requirements.

### Diagnostic validator output

Improve validator results so an implementer can identify the failed requirement, affected JSON path, evidence used, severity, corrective action, and whether the failure blocks execution or only limits conformance.

### Sector deployment profiles

Develop clearly bounded examples for education, healthcare, financial services, customer support, enterprise agents, and public services. Sector profiles must identify applicable legal and institutional assumptions without claiming that core receipt conformance establishes sector compliance.

### API and transport profile

Evaluate an OpenAPI-described service boundary for receipt creation, verification, retrieval, status, and remedy references. Keep transport behavior separable from the canonical receipt semantics.

### Privacy and retention profile

Expand rules for data minimization, excluded content, role-based access, routine-access expiry, deletion or archival conditions, and the relationship between retained receipts and affected-party access.

**Entry condition:** proposed changes must be grounded in implementation findings, security analysis, evaluation evidence, or documented interoperability requirements.

## Milestone 3: Independent evaluation package

**Objective:** Determine whether independent reviewers can understand, apply, and reproduce the model without direct author guidance.

Evaluation priorities:

- schema and validator usability;
- agreement between reviewers applying R1–R12;
- consistency of consequence classification;
- ability to identify missing authority, evidence, notice, or remedy;
- divergence between machine and human receipt interpretation;
- time and effort required to implement the profile;
- false-positive and false-negative conformance findings;
- accessibility and affected-party comprehension;
- privacy and information-minimization tradeoffs.

Expected outputs:

- pilot protocol;
- reviewer instructions;
- synthetic evaluation cases;
- scoring and disagreement-resolution procedures;
- limitation report;
- revision recommendations linked to observed evidence.

## Milestone 4: Documentation and reference tooling

**Objective:** Reduce the distance between reading the specification and testing an implementation.

Potential deliverables:

- a documentation site organized around concepts, implementation, conformance, security, examples, and research;
- a browser-based receipt inspector using synthetic or user-supplied local data;
- clearer CLI diagnostics and machine-readable error output;
- implementation walkthroughs for multiple languages or orchestration patterns;
- a conformance matrix that maps each normative requirement to schema rules, runtime logic, tests, evidence, and human disclosure.

A hosted tool must not collect confidential receipts by default. Local processing, explicit disclosure, retention limits, and data-handling documentation are design requirements.

## Milestone 5: External review and archival publication

**Objective:** Make the project citable and open to disciplined external scrutiny.

Potential actions:

- archive versioned releases in a persistent research repository;
- obtain a DOI for stable citation where appropriate;
- invite technical, governance, privacy, accessibility, security, and sector review;
- publish documented responses to substantive review;
- map the candidate requirements to relevant governance frameworks without claiming equivalence or compliance;
- evaluate whether particular components are suitable for discussion in standards communities.

## Decision gates

Work advances only when the relevant gate is satisfied:

| Gate | Required showing |
| --- | --- |
| Technical | The behavior is specified, reproducible, and tested. |
| Governance | Authority, affected-party visibility, human review, and remedy implications are explicit. |
| Security | Abuse cases, integrity assumptions, and failure containment are documented. |
| Privacy | Data necessity, access, retention, exclusion, and disclosure are bounded. |
| Compatibility | Version and migration consequences are stated. |
| Claim boundary | The change does not imply adoption, certification, legal sufficiency, or regulatory approval. |
| Evidence | The change responds to a documented problem rather than speculative feature accumulation. |

## Out of scope for roadmap claims

This roadmap does not promise adoption, regulatory recognition, certification authority, institutional deployment, funding, or a fixed delivery date. It identifies an evidence-driven development sequence for a candidate governance specification and reference implementation.
