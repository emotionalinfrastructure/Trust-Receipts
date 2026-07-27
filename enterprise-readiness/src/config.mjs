export const APP_NAME = "Emotional Infrastructure Enterprise Readiness Review";
export const APP_VERSION = "0.1.0-candidate.1";
export const CURRENT_DESIGNATION = "An advanced candidate governance architecture with executable reference implementations, substantial standards-oriented documentation, and public demonstration systems, now entering integration, validation, and enterprise-hardening.";
export const EVIDENCE_STATUSES = Object.freeze(["Verified", "Corroborated", "Asserted", "Unresolved", "Not established"]);
export const DOMAINS = Object.freeze([
  { id: "research", name: "Research maturity", weight: 15, score: 3.0, test: "Conceptually rigorous, methodologically defensible, and evidence-bound" },
  { id: "software", name: "Software architecture", weight: 15, score: 3.1, test: "Coherent, maintainable, testable full-stack system" },
  { id: "infrastructure", name: "Infrastructure and DevOps", weight: 10, score: 2.1, test: "Traceable, reproducible, observable, recoverable releases" },
  { id: "security", name: "Security and governance", weight: 15, score: 3.4, test: "Authority, consent, privacy, auditability, and remedy operationalized" },
  { id: "commercial", name: "Commercial readiness", weight: 10, score: 2.8, test: "Credible buyer, offer, delivery model, and implementation pathway" },
  { id: "academic", name: "Academic readiness", weight: 10, score: 2.7, test: "Prepared for formal research review and publication" },
  { id: "standards", name: "Standards readiness", weight: 10, score: 3.0, test: "Can enter standards discussion without overstating adoption or conformance" },
  { id: "investment", name: "Investment readiness", weight: 10, score: 2.2, test: "Defensible product strategy, market thesis, team model, and capital plan" },
  { id: "release", name: "Release integrity", weight: 5, score: 2.0, test: "Public claims, repositories, packages, versions, and deployments agree" }
]);
