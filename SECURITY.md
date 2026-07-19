# Security Policy

## Supported versions

Security review currently applies to the latest revision of the `main` branch and the most recent published candidate release. Earlier candidate artifacts may be retained for reproducibility but are not independently maintained after a superseding patch release is published.

| Version | Security review status |
| --- | --- |
| 0.1.x | Supported while it is the current candidate line |
| Earlier development snapshots | Not supported |

## Reporting a vulnerability

Do not open a public issue for a vulnerability that could enable receipt forgery, integrity bypass, authorization bypass, privacy exposure, unsafe execution, evidence substitution, remedy suppression, or misleading conformance results.

Report the issue privately to:

**brittanywright@emotionalinfrastructure.org**

Use the subject line:

`[SECURITY] AI Trust Receipt vulnerability report`

Include, where available:

- the affected file, component, version, or commit;
- the vulnerability class and plausible impact;
- reproducible steps or a minimal proof of concept;
- whether the issue affects confidentiality, integrity, availability, authorization, conformance, or affected-party remedy;
- known preconditions and whether exploitation requires trusted access;
- suggested containment or remediation;
- whether public disclosure is already occurring elsewhere.

Do not include real personal data, credentials, private keys, confidential receipts, or third-party system records. Use synthetic data whenever possible.

## Response process

The maintainer will attempt to:

1. acknowledge a complete report;
2. determine whether the issue is reproducible and within scope;
3. classify the affected security or governance boundary;
4. prepare a correction, test, advisory, or documentation clarification;
5. coordinate a reasonable disclosure point with the reporter when the issue is valid and not already public.

This project does not currently operate a paid bug-bounty program and cannot guarantee a specific response or remediation deadline.

## Security-relevant scope

Reports are especially relevant when they concern:

- bypass of the pre-execution authority or evidence gate;
- execution when receipt or remedy capability is unavailable;
- acceptance of malformed, stale, substituted, or contradictory evidence;
- incorrect consequence classification or under-classification;
- integrity verification that accepts modified canonical receipt content;
- divergence between a machine receipt and its human-readable rendering;
- exposure of prohibited, excluded, or retention-expired data;
- unauthorized delegation or authority amplification;
- false positive conformance results;
- unsafe partial-execution or rollback behavior;
- dependency, packaging, or workflow compromise affecting release artifacts.

General policy disagreements, feature requests, and editorial concerns may be reported through public issues.

## Integrity limitation

The v0.1.1 reference package demonstrates deterministic canonicalization and SHA-256 digest verification. A digest can reveal modification only relative to a trusted expected digest or trusted receipt channel; it does not authenticate the issuer, establish key custody, provide revocation, prove truthful inputs, or establish that an action was lawful, fair, safe, or correct. Browser parity is limited to identical values inside the documented restricted domain. Reports that expose confusion or divergence at these boundaries are treated as documentation, interoperability, or design issues even when one implementation's digest computation is functioning as coded.

## Safe research expectations

Good-faith testing should minimize operational impact, avoid access to data that is not yours, stop when a vulnerability is demonstrated, and provide enough information for reproduction without publishing an immediately weaponizable exploit before a correction can be assessed.
