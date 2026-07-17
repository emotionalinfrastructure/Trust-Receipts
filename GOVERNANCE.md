# Project Governance

## 1. Project status

AI Trust Receipt is a maintainer-led public-interest candidate specification and reference implementation. The project invites technical, governance, security, usability, and research review. It is not an adopted standard, certification authority, accreditation body, regulator, or legal-compliance program.

The governance process exists to preserve technical coherence, testability, claim discipline, affected-party visibility, and accountable change control while the project is evaluated and developed.

## 2. Maintainer

The founding and current lead maintainer is **Brittany Wright**, founder of Emotional Infrastructure™.

The lead maintainer is responsible for repository administration, release approval, scope control, final editorial decisions, and maintaining the distinction between project conformance and external legal or regulatory claims.

Additional maintainers may be appointed through a documented repository decision when sustained contribution, technical competence, independence, and alignment with the project's governance boundaries have been demonstrated.

## 3. Decision categories

### Editorial decisions

Editorial decisions correct clarity, structure, terminology, citations, accessibility, or presentation without changing normative behavior. They may be accepted through ordinary pull-request review.

### Implementation decisions

Implementation decisions affect executable behavior, packaging, developer tooling, tests, or reference code. They require reproducible validation and must not silently redefine the normative specification.

### Normative decisions

Normative decisions change a requirement, schema contract, consequence rule, conformance condition, lifecycle rule, or interoperability boundary. They require:

- a public issue or change proposal;
- an explicit problem statement;
- affected requirements and artifacts;
- compatibility and migration analysis;
- security, privacy, human-review, and remedy analysis where applicable;
- updated tests or conformance vectors;
- a changelog entry;
- maintainer approval.

### Release decisions

A release decision establishes a versioned public snapshot. A release must identify its status, included artifacts, integrity information, known limitations, license scope, compatibility implications, and claim boundary.

## 4. Proposal process

Substantial changes begin with an issue labeled or clearly titled as a proposal. The proposal should distinguish:

1. the observed problem;
2. the governance or technical mechanism involved;
3. the proposed change;
4. alternatives considered;
5. backward-compatibility effects;
6. evidence and test strategy;
7. unresolved questions.

Discussion should remain open long enough for meaningful review relative to the scope and risk of the change. Urgent security corrections may follow a private process under `SECURITY.md` and be documented publicly after containment.

## 5. Decision criteria

Changes are evaluated against the following criteria:

- **Traceability:** Can an implementer or reviewer determine why the change exists and which requirement it affects?
- **Testability:** Can conformance or failure be evaluated without relying on undocumented judgment?
- **Noncompensation:** Does the change preserve hard boundaries rather than allowing unrelated strengths to average away a failure?
- **Affected-party legibility:** Does the design preserve a usable account of what occurred, under what authority, with what remedy?
- **Security and privacy:** Does the change avoid creating new integrity, authorization, disclosure, retention, or abuse risks?
- **Interoperability:** Does the change improve or at least preserve implementability across systems?
- **Claim discipline:** Does the change avoid implying certification, adoption, legal sufficiency, or regulatory approval?
- **Proportionality:** Is the control burden justified by consequence and risk?

## 6. Consensus and final authority

The project seeks reasoned consensus but does not require unanimity. When consensus is not reached, the lead maintainer may decide based on the published criteria, provided the decision and material tradeoffs are documented.

A maintainer must not represent unresolved disagreement as external validation. Minority technical positions may be preserved in the issue record or release notes when they identify a material limitation or alternative architecture.

## 7. Conflicts of interest

Reviewers and maintainers should disclose material interests that could affect a decision, including commercial implementation interests, assessment engagements, certification proposals, or organizational adoption claims. Disclosure does not automatically disqualify participation; it makes the decision context inspectable.

No contributor may use repository participation to imply project endorsement of a product, deployment, audit, certification, or organization.

## 8. Conformance and use of project language

Passing the bundled conformance profile means only that the evaluated artifact satisfied the candidate requirements and test conditions identified by that profile and version. It does not establish legal compliance, safety, fairness, factual truth, institutional approval, or external certification.

The project does not currently authorize third parties to issue official certifications, seals, or regulator-like approvals in its name. Implementers may accurately describe the version tested, the tests run, the results obtained, and any deviations or limitations.

## 9. Versioning

The project follows semantic versioning as an implementation signal, with additional governance interpretation:

- **Patch:** compatible corrections, security fixes, test repairs, and editorial clarifications that do not intentionally change the normative contract;
- **Minor:** backward-compatible additions, new optional capabilities, expanded examples, or revised candidate requirements with a documented migration path;
- **Major:** incompatible schema, requirement, lifecycle, or conformance changes.

Candidate status is stated separately from version number. A higher version does not imply adoption or validation.

## 10. Records and transparency

Material project decisions should remain traceable through issues, pull requests, release notes, changelog entries, test evidence, and versioned artifacts. Private security handling is the principal exception and should be documented publicly after disclosure is safe.
