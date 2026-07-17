# Contributing to AI Trust Receipt

Thank you for helping evaluate and improve the AI Trust Receipt candidate specification and reference implementation.

This repository is an implementation-oriented governance project. Contributions should make the work more precise, testable, interoperable, secure, accessible, or independently evaluable. Participation does not imply that the project is an adopted standard, certification program, regulatory requirement, or legal-compliance determination.

## Ways to contribute

Useful contributions include:

- identifying ambiguous, contradictory, or untestable normative language;
- proposing schema, conformance, or interoperability improvements;
- adding positive and negative test vectors;
- reporting implementation defects or security weaknesses;
- contributing deployment examples that preserve the claim boundary;
- improving documentation, accessibility, or developer experience;
- proposing evaluation methods for usability, reliability, and inter-rater agreement.

## Before opening a pull request

Open an issue before making a substantial normative, schema, security, or architecture change. The issue should define the problem, affected artifacts, compatibility implications, evidence supporting the change, and the tests needed to evaluate it.

Editorial corrections and narrowly scoped implementation fixes may proceed directly to a pull request.

Security vulnerabilities must be reported through the process in `SECURITY.md`, not through a public issue.

## Development setup

The reference implementation requires Python 3.10 or later and has no runtime dependencies.

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -e .
```

Run the unit tests:

```bash
python -m unittest discover -s tests -v
```

Run the conformance vectors:

```bash
python -m trust_receipt conformance run \
  --cases fixtures/conformance-cases.json \
  --profile profiles/conformance-profile.v0.1.json \
  --output evidence/conformance-report.json
```

Verify the example receipt:

```bash
python -m trust_receipt receipt verify \
  --receipt evidence/example-receipt.json
```

Verify the release artifacts when your change affects packaged outputs:

```bash
python tools/verify_release.py
```

## Normative change discipline

A pull request that changes a requirement expressed with **MUST**, **MUST NOT**, **REQUIRED**, **SHOULD**, **SHOULD NOT**, or **MAY** must:

1. identify the affected requirement or section;
2. explain the governance or implementation problem being corrected;
3. state whether the change is backward compatible;
4. update the relevant schema, profile, test, fixture, example, or documentation;
5. include at least one test that would fail under the previous implementation when appropriate;
6. update `CHANGELOG.md`.

Normative strength must not be changed merely to make an implementation pass. Conformance failures should reveal a real boundary rather than be averaged away or editorially weakened.

## Pull request checklist

A pull request should:

- have a focused title and explain the problem before the solution;
- avoid unrelated formatting or generated-file changes;
- preserve the candidate-status and claim boundary;
- avoid implying certification, regulatory approval, or adoption;
- include tests for executable behavior changes;
- regenerate derived evidence only when its source inputs changed;
- identify any privacy, security, human-review, remedy, or affected-party implications;
- pass the repository validation workflow.

## Licensing of contributions

By submitting a contribution, you agree that it may be distributed under the repository's scope-based licensing model:

- Apache License 2.0 for executable and machine-readable implementation materials;
- Creative Commons Attribution 4.0 International for human-readable specification, documentation, instructional, and explanatory materials.

See `LICENSE` for the controlling scope. Mark material as **Not a Contribution** when you are sharing it only for discussion and do not intend it to be incorporated.

## Decision process

Maintainer decisions follow `GOVERNANCE.md`. Technical disagreement should be resolved through evidence, reproducible tests, explicit tradeoffs, and the project's stated governance objectives rather than authority claims or adoption language.
