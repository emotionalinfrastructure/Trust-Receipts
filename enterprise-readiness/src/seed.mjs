export const SEED_EVIDENCE = Object.freeze([
  { claim_id: "EI-001", claim: "AI Trust Receipt is executable beyond policy prose", domain: "Security and governance", status: "Corroborated", repository: "emotionalinfrastructure/Trust-Receipts", notes: "Candidate specification, schemas, implementation, tests, conformance vectors, and public demo source are present; independent clean-room reproduction remains required." },
  { claim_id: "EI-002", claim: "The public Trust Receipt demo is source-controlled", domain: "Infrastructure and DevOps", status: "Verified", repository: "emotionalinfrastructure/Trust-Receipts", module: "demo-worker/", deployment_url: "https://demo.emotionalinfrastructure.org", notes: "Repository ownership is documented. Current production commit parity must be checked separately." },
  { claim_id: "EI-003", claim: "The full ecosystem has one authoritative repository and deployment map", domain: "Release integrity", status: "Unresolved", notes: "Overlapping repositories and deployment ownership still require canonicalization." },
  { claim_id: "EI-004", claim: "Emotional Infrastructure is externally validated as an enterprise product", domain: "Investment readiness", status: "Not established", notes: "No independent enterprise validation should be inferred from internal documentation, tests, or demonstrations." }
]);

export const ROADMAP = Object.freeze([
  [1, "Canonicalization", "One taxonomy, repository map, specification index, version policy, and canonical URL register"],
  [2, "Reproducible software", "Clean-room build, locked dependencies, CI, migrations, OpenAPI, and local-development instructions"],
  [3, "Deployment provenance", "Commit and release exposed by deployments, separated environments, logs, rollback, and recovery evidence"],
  [4, "Security assurance", "Threat model, DPIA, identity controls, secrets handling, abuse tests, retention enforcement, SAST/DAST, independent review"],
  [5, "Research validation", "Constructs, verified literature, evaluation protocol, expert instrument, pilot and analysis plan, IRB determination where applicable"],
  [6, "Conformance program", "Normative registry, vectors, verifier, negative tests, interoperability profile, independent test run"],
  [7, "Commercial productization", "Bounded buyer, SOW, pricing, terms, support, liability boundaries, implementation guide, success metrics"],
  [8, "External validation", "At least two independent technical, institutional, academic, standards, enterprise, or security signals"]
]);
