# Trajectory Governance Extension: Implementation Crosswalk

**Artifact ID:** EII-TG-XWALK-001  
**Version:** 0.1.0-candidate  
**Baseline:** AI Trust Receipt v0.1.1; operational service 0.2.0-alpha.1  
**Purpose:** Prevent duplicate architecture and distinguish existing controls from extension requirements.

## 1. Existing assets to preserve

| Existing component | Existing responsibility | Extension treatment |
|---|---|---|
| Authority Grant schema | Identifies granting party, grantee, objective, scope, time, confirmation, delegation | Preserve as legacy/base grant contract; DPR adds provenance and lifecycle lineage |
| Action Request schema | Describes requested action, target, consequence, confirmation, review, delegation | Preserve; add action-binding profile only through versioned extension |
| Material Evidence schema | Identifies evidence inputs and their status/freshness | Reuse references; do not duplicate protected source content |
| Pre-execution gate | Evaluates grant, scope, consequence, confirmation, review, evidence, remedy and receipt capability | Extend with DPR-chain and lifecycle validation |
| Two-phase permit | Separates gate evaluation from external execution and finalization | Reuse; strengthen binding, single-use semantics, revocation recheck and TOCTOU disclosure |
| Canonical Trust Receipt | Produces machine record and human disclosure from one canonical source | Preserve v0.1.1 schema; link extension records externally |
| Detached Ed25519 assertion | Authenticates a receipt digest under a configured issuer key | Preserve as operational draft; do not conflate signature validity with authority validity |
| D1 ledger | Persists decisions, receipts, keys, API keys, remedies, revocation and audit events | Extend with DPR and lifecycle event storage only after migration and retention review |
| Remedy workflow | Allows affected-party case submission and controlled status transitions | Reuse; clarify review independence, deadlines and correction linkage |

## 2. Gap classification

| Capability | Existing evidence | Extension gap | Status |
|---|---|---|---|
| Grant identity and basic scope | Authority Grant contract and gate | No distinct immutable DPR envelope | Partially covered |
| Principal authority basis | Granting party identity | Authority-to-delegate evidence and validation semantics | Gap |
| Parent-child authority inheritance | Delegation metadata and limits | Multidimensional parent constraint intersection | Gap |
| Explicit negative scope | Excluded actions | Deny-overrides semantics across all scope dimensions | Partial |
| Purpose binding | Objective description and hard constraints | Machine-readable purpose code and evaluation | Partial |
| Recipient binding | Not established as a general grant constraint | Recipient allow/deny scope | Gap |
| Revocation | Receipt/assertion revocation and service state | Parent-child propagation and action-bound revalidation | Partial |
| Execution-time authorization | Two-phase permit | Formal DPR state check immediately before execution | Partial |
| TOCTOU mitigation | Short-lived permit and finalization workflow | Atomicity boundary and residual race documentation | Partial |
| Replay protection | Idempotent finalization | Explicit single-use action permit and cross-action binding | Partial |
| Outcome uncertainty | Execution status model | Normative OUTCOME_UNKNOWN handling and safe retry semantics | Partial |
| Receipt linkage | Canonical receipt and detached assertion | DPR/decision/outcome references without v0.1.1 schema break | Gap |
| Evidence correction | Remedy workflow | Append-only correction event semantics | Partial |

## 3. Integration rules

1. Do not replace the v0.1.1 core Trust Receipt schema in this extension branch.
2. Do not create a second receipt renderer or duplicate canonicalization implementation.
3. Reuse the existing pre-execution gate and two-phase permit architecture.
4. Add DPR validation as a distinct provenance layer, not as a mutable field on the historical grant.
5. Represent revocation as a separate event; do not rewrite the DPR.
6. Bind each authorization decision to one action descriptor and its material parameters.
7. Recheck lifecycle state at the execution boundary.
8. Preserve existing service and Python verification baselines.
9. Add new tests without changing historical test counts or rewriting old evidence.
10. Report extension tests separately from the v0.1.1 baseline until a unified release is cut.

## 4. Implementation sequence

| Step | Deliverable | Acceptance evidence |
|---|---|---|
| 1 | DPR and authorization-decision schemas | Draft 2020-12 meta-schema validation and positive/negative fixtures |
| 2 | DPR registry and lifecycle events | Persistence migration, immutable grant events, revocation tests |
| 3 | Provenance-chain validator | Parent/child scope-intersection tests |
| 4 | Authorization evaluator | ALLOW, DENY, REQUIRE_CONFIRMATION, INDETERMINATE tests |
| 5 | Execution-permit binding | Single-action, short-lived, replay and material-change tests |
| 6 | Final execution revalidation | Revocation race and documented provider atomicity tests |
| 7 | Receipt linkage | Backward-compatible linked evidence or versioned extension envelope |
| 8 | Independent reproduction | Clean environment, test report, reviewer reconstruction protocol |

## 5. Release and claim boundary

The documents and schemas in this branch are candidate artifacts. They do not establish that the operational service enforces the extension. No implementation or conformance claim may be made until the code path is integrated, automated tests pass, and evidence is retained.

The existing v0.1.1 verification baseline remains historically valid only for the exact release and environment in which it was recorded. New extension tests must not be used to imply that the old release implemented the extension.
