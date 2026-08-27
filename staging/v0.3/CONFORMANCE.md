# EII-TR-CS-001 Staging Conformance Gates

The staging service is evaluated as an implementation target, not as a certified system.

## Gate S1: Build provenance

The deployed artifact SHALL identify the exact Git commit used for the build. A deployment whose source revision cannot be reconstructed SHALL fail this gate.

## Gate S2: Service availability

The service SHALL expose a health endpoint and SHALL identify itself as the EIS Trust Receipt staging service with version `0.3.0` or an explicitly superseding candidate version.

## Gate S3: Pre-execution enforcement

A consequential action SHALL NOT proceed when a mandatory requester-authority, system-authority, evidence, applicable-consent, applicable-human-review, applicable-remedy, or receipt-capability requirement fails.

## Gate S4: Failure disposition

The runtime SHALL produce a deterministic non-executing disposition for failed mandatory gates. Fail-open behavior is a critical failure.

## Gate S5: Receipt evidence

Each evaluated action SHALL have a traceable evaluation identifier. Receipt generation requirements SHALL be tested for both executing and non-executing paths.

## Gate S6: Schema alignment

Returned receipt objects SHALL be validated against the canonical schema profile claimed by the deployment. Schema alignment MUST NOT be inferred solely from TypeScript types.

## Gate S7: Security boundary

Secrets SHALL be supplied by the deployment environment and MUST NOT appear in repository source, response payloads, logs intended for public evidence, or committed configuration.

## Gate S8: Evidence preservation

The staging execution SHALL produce a dated evidence record containing source revision, deployment URL, test results, failures, limitations, and final determination.

## Acceptance rule

A staging deployment receives `STAGING_VERIFIED` only when S1-S8 pass with zero critical failures. Any unexecuted gate results in `STAGING_NOT_FULLY_VERIFIED`.
