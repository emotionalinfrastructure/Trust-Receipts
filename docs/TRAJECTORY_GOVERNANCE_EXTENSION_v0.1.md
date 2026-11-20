# Trajectory Governance Extension: Delegation Provenance and Execution-Time Authorization

**Artifact ID:** EII-TG-EXT-001  
**Version:** 0.1.0-candidate  
**Status:** Working technical extension for review  
**Parent implementation:** AI Trust Receipt candidate v0.1.1 and operational service 0.2.0-alpha.1  
**Compatibility:** Additive; does not alter the v0.1.1 Trust Receipt core schema  
**Owner:** Emotional Infrastructure Institute / Emotional Infrastructure™

## 1. Purpose

This extension defines a traceable relationship between delegated authority, an action-specific authorization decision, execution, and the resulting Trust Receipt. It addresses the risk that an AI agent may act on permissions that are broader than the principal intended, inherited from an invalid delegation, expired, revoked, or no longer applicable to the action at the execution boundary.

The extension is designed to complement the existing Trust Receipt architecture. The existing authority-grant, action-request, material-evidence, pre-execution gate, canonical receipt, and detached issuer-assertion components remain the baseline. This extension introduces a formal Delegation Provenance Record (DPR) and a distinct authorization-decision event.

## 2. Conformance language

The terms MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT, and MAY are normative when written in uppercase.

A system claiming conformance to this extension MUST identify the exact extension version and profile implemented. Conformance to this extension does not establish legal compliance, certification, independent audit, or production readiness.

## 3. Design invariants

1. Authority MUST be traceable to an identifiable principal and a recorded authority source.
2. A delegate MUST NOT exercise authority broader than the authority validly held by its delegator.
3. A permission to prepare an action MUST NOT imply permission to execute it.
4. Explicitly denied actions MUST override otherwise applicable permissions.
5. Authorization MUST be evaluated against the actual action, target, purpose, and recipient.
6. Human confirmation MUST be action-bound when required by the applicable policy.
7. Revocation MUST prevent new execution after the revocation becomes effective.
8. An authorization decision MUST NOT be treated as proof of execution.
9. A receipt MUST distinguish authorization outcome from observed execution outcome.
10. Missing or contradictory authority evidence MUST NOT result in an ALLOW decision.
11. A generated receipt MUST NOT be treated as proof that the source evidence was truthful.
12. The historical grant record MUST NOT be silently rewritten to represent later revocation or correction.

## 4. Core records and event separation

The extension defines four distinct record classes:

| Record | Meaning | Mutation rule |
|---|---|---|
| Delegation Provenance Record (DPR) | Immutable record of a grant of bounded authority | Append-only; corrections supersede by reference |
| Delegation lifecycle event | Activation, suspension, revocation, expiry observation, or correction | Append-only event |
| Authorization decision | Action-specific ALLOW, DENY, REQUIRE_CONFIRMATION, or INDETERMINATE result | Immutable decision event |
| Execution outcome | Observed execution status and supporting evidence | Append-only outcome event |

A DPR is a grant record, not a mutable status object. Revocation MUST be represented by a separate lifecycle event referencing the DPR. This prevents the historical grant from being silently rewritten and allows a reviewer to reconstruct the state of authority at a particular time.

The existing AI Trust Receipt remains the canonical event receipt for its v0.1.1 profile. An implementation MAY reference DPR and authorization-decision identifiers through a versioned extension envelope or linked evidence record. It MUST NOT insert undeclared properties into the v0.1.1 receipt schema and claim v0.1.1 schema conformance.

## 5. Delegation Provenance Record

### 5.1 Required fields

A DPR MUST identify:

- A unique record identifier and schema version.
- The principal from whom authority originates.
- The delegate receiving authority.
- The source and evidence basis for the principal's authority to delegate.
- The intended purpose.
- Permitted and prohibited action identifiers.
- Resource and recipient boundaries where applicable.
- Consequence ceiling or applicable consequence policy.
- Effective and expiration times.
- Confirmation requirements.
- Subdelegation permission and maximum depth.
- Relevant parent delegation reference, if the grant is itself delegated.
- Constraints on data reuse and onward disclosure.

### 5.2 Principal and authority source

Authentication and authorization are separate. A successful login or possession of a credential establishes neither legal capacity nor organizational authority to delegate.

The authority-source reference MUST identify the evidence or policy used to establish the principal's delegation authority. The implementation SHOULD store only the minimum reference needed to retrieve protected evidence; it SHOULD NOT duplicate sensitive source material into the DPR.

Where the principal's authority cannot be established, the record MUST be rejected or marked non-authoritative. It MUST NOT be interpreted as an active grant.

### 5.3 Scope semantics

Scope MUST be evaluated across the following dimensions:

- **Action:** the machine-readable operation permitted or prohibited.
- **Resource:** the object or resource selector on which the action may operate.
- **Purpose:** the specific purpose for which authority was granted.
- **Recipient:** the permitted recipient or destination, where information is transmitted.
- **Consequence:** the maximum consequence class allowed by the grant.
- **Time:** the effective interval of the grant.
- **Context:** any material conditions that constrain execution.

An implementation MUST distinguish preparation from execution. Examples include `document.draft` versus `document.send`, and `payment.prepare` versus `payment.execute`.

### 5.4 Deny-overrides

If an action appears in both permitted and prohibited action sets, the action MUST be denied. An explicit prohibition MUST take precedence over a general permission.

An absent permission MUST NOT be interpreted as permission.

### 5.5 Parent-child authority

A child delegation MUST NOT exceed the parent's authority. The child MUST preserve all applicable parent restrictions, including action, resource, purpose, recipient, time, consequence, confirmation, and data-handling constraints.

Formally:

`Authority(child) ⊆ Authority(parent)`

This relation is multidimensional. A child is not within parent scope merely because its action name appears in the parent's allowed-action list; all relevant constraints must also be preserved.

Subdelegation MUST be explicitly permitted. A delegate MUST NOT infer permission to subdelegate from the ability to call another service or agent.

### 5.6 Revocation and lifecycle

A revocation event MUST identify the DPR, revoking authority, effective time, event identifier, and evidence reference. Parent revocation MUST invalidate dependent child grants for new execution, subject to documented propagation and offline-system limitations.

A system MUST recheck current lifecycle state at the execution boundary. If revocation state cannot be established for a consequential action, the system MUST fail closed or return INDETERMINATE.

Revocation is not retroactive erasure. It terminates future authority; it does not erase prior execution events or required historical evidence.

## 6. Execution-time authorization

### 6.1 Decision vocabulary

| Decision | Meaning | Execution |
|---|---|---|
| ALLOW | All required conditions are established | Permitted within the bound action |
| DENY | A disqualifying condition is established | Prohibited |
| REQUIRE_CONFIRMATION | Specific human confirmation remains outstanding | Prohibited until valid confirmation |
| INDETERMINATE | Evidence is missing, contradictory, or unverifiable | Prohibited |

DENY and INDETERMINATE MUST remain distinct. DENY represents a known disqualifying condition. INDETERMINATE represents an inability to establish authorization.

### 6.2 Required evaluation

The authorization service MUST evaluate:

1. Principal identity and authority source.
2. Delegate identity and system/deployment identity where applicable.
3. DPR integrity and provenance chain.
4. Current grant lifecycle and revocation state.
5. Requested action and target resource.
6. Purpose and recipient.
7. Consequence ceiling.
8. Applicable policy version.
9. Required evidence and confirmation.
10. Any parent-delegation constraints.

### 6.3 Action binding

An authorization decision MUST be bound to an action descriptor that identifies at least the action identifier, action type, target, purpose, recipient where applicable, DPR identifier, and a digest or equivalent immutable representation of material action parameters.

A decision for one action MUST NOT be reused for a materially different action.

### 6.4 Final execution check and TOCTOU

A decision made earlier in a workflow can become stale before execution. A system MUST revalidate relevant authority and revocation state immediately before the action crosses the execution boundary.

Where the execution provider supports an atomic authorization-and-execution transaction, the implementation SHOULD use it. Where atomicity is unavailable, the implementation MUST document the residual time-of-check/time-of-use (TOCTOU) race and MUST NOT claim that a final read alone eliminates the race.

The service's existing two-phase permit and terminal-finalization flow is a useful implementation boundary. The permit MUST be short-lived, single-use or idempotently bound to one action, and invalidated by relevant revocation or material action changes.

### 6.5 Replay and retries

Implementations MUST distinguish a retry of the same operation from a new operation. They SHOULD use unique action identifiers, decision identifiers, nonces or equivalent freshness controls, idempotency keys, and short permit lifetimes.

An uncertain external outcome MUST be recorded as OUTCOME_UNKNOWN until authoritative evidence resolves it. The system MUST NOT automatically retry a potentially non-idempotent action solely because the response was lost.

## 7. Execution outcomes and receipt linkage

The authorization decision and execution outcome are separate records.

The outcome vocabulary SHOULD include:

- NOT_ATTEMPTED
- EXECUTED
- EXECUTION_FAILED
- PARTIALLY_EXECUTED
- OUTCOME_UNKNOWN
- CANCELLED

A DENY or INDETERMINATE decision MUST NOT be represented as an executed action. An ALLOW decision MUST NOT be represented as proof that execution succeeded.

The Trust Receipt SHOULD reference the DPR, authorization decision, execution event, and outcome evidence through an extension envelope or linked evidence record. The v0.1.1 core schema MUST remain unchanged unless a future receipt version explicitly standardizes these fields.

## 8. Evidence integrity and privacy

A content digest detects changes only relative to a trusted expected digest. It does not authenticate the issuer or establish that source evidence is true.

A digital signature establishes that a key signed a particular representation; it does not establish that the signer was entitled to make the underlying claim. Key custody, trust anchors, rotation, revocation, and compromise response require a separate profile.

DPRs and receipts MUST minimize personal data. Protected source evidence SHOULD be referenced rather than copied. Inferred emotional or behavioral states MUST be labeled as inferences and MUST NOT be treated as authorization, consent, incapacity, or verified fact.

The system MUST document retention, access, correction, and deletion rules. A request to correct a record MUST create a linked correction event rather than silently overwrite the original.

## 9. Failure behavior

The system MUST fail closed for consequential execution when:
- Principal or delegate identity cannot be established.
- Authority source is missing or invalid.
- DPR is malformed or its integrity cannot be established.
- Parent authority is invalid or exceeds the child grant.
- Grant is expired, suspended, or revoked.
- Action, resource, purpose, recipient, or consequence exceeds scope.
- Required confirmation is absent or materially stale.
- Current revocation state cannot be established.
- A decision permit is expired, replayed, or bound to a different action.

The system MUST preserve a decision event for denied or indeterminate attempts, subject to privacy and retention requirements.

## 10. Conformance profile

An implementation claiming this extension MUST publish:
- Extension version and profile identifier.
- DPR schema version.
- Authorization-decision schema version.
- Supported action and consequence taxonomies.
- Revocation propagation semantics.
- Confirmation-binding semantics.
- Permit lifetime and replay controls.
- Execution-provider atomicity limitations.
- Receipt linkage method.
- Test inventory and observed test results.
- Known security, privacy, and operational limitations.

A test catalog is not a test result. A local test result is not an independent evaluation. A passing conformance profile is not certification or proof of legal compliance.

## 11. Compatibility and migration

This extension is additive to AI Trust Receipt v0.1.1. Existing v0.1.1 receipts remain valid under their original schema. Implementations MUST NOT retroactively reinterpret historical receipts as if DPR fields had been present.

An implementation MAY operate a transitional profile in which the existing authority grant is referenced as the initial provenance source. Such a profile MUST explicitly disclose which provenance dimensions are not yet enforced.

A future normative receipt version may incorporate standardized references after schema review, implementation testing, and migration analysis.

## 12. Known limitations

This extension does not by itself:
- Establish the legal capacity of a principal.
- Authenticate a human identity.
- Guarantee atomic execution across independent providers.
- Prevent a compromised host or signing key from falsifying events.
- Prove the truthfulness of source evidence.
- Establish sector-specific legal compliance.
- Establish independent certification or organizational adoption.

These limitations MUST remain visible in implementation and public claims.
