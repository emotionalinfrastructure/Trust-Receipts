# EIS Trust Receipt Staging Deployment Package v0.3

**Artifact ID:** EIS-TR-STAGE-003  
**Status:** Candidate staging deployment package  
**Deployment target:** Controlled staging environment  
**Repository:** emotionalinfrastructure/Trust-Receipts  
**Branch:** `staging/eis-tr-v0.3`

## Purpose

This package defines the transition from a locally executed native Trust Receipt runtime to a remotely addressable staging service. It does not represent production deployment, independent certification, or regulatory compliance.

## Provenance boundary

The native integration work was previously tied to EIS Runtime Backend v0.2.0 source commit `2176a810d5c28cac7c67e20b40e48a2a3b849af5` and source tree `53fe34d305a16dbe79ac49213c903715ea6a59a0`.

The v0.3 staging branch MUST preserve that provenance or explicitly record any source divergence before deployment evidence is accepted.

## Staging objectives

The staging environment SHALL:

1. expose a health endpoint;
2. expose a Trust Receipt pre-execution evaluation endpoint;
3. generate a receipt for permitted, bounded, paused, escalated, refused, and blocked decisions where applicable;
4. prevent execution when mandatory authority or governance prerequisites fail;
5. preserve receipt and decision identifiers for traceability;
6. emit structured logs without embedding deployment secrets;
7. support automated conformance probes;
8. distinguish staging evidence from production claims.

## Required environment variables

See `.env.example`. Secrets MUST NOT be committed to this repository.

## Deployment gate

A staging deployment SHALL NOT be classified as verified until all of the following evidence exists:

- build succeeds from the branch source;
- service starts without a fail-open condition;
- `/health` returns the expected service identity and version;
- pre-execution endpoint accepts valid test fixtures;
- negative fixtures are blocked according to policy;
- returned receipts validate against the applicable canonical schema profile;
- receipt identifiers correlate with server-side evidence;
- the automated staging smoke suite passes;
- deployment URL and immutable source revision are recorded in `deployment-record.json`.

## Current status

Repository staging structure: CREATED.

Live deployment: NOT YET VERIFIED.

The files in this directory establish the deployment contract and evidence boundary. A hosting platform deployment and endpoint execution are still required before this package can claim a running staging service.
