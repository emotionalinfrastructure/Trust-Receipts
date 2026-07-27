export function openApi(baseUrl) {
  return { openapi: "3.1.0", info: { title: "Emotional Infrastructure Enterprise Readiness API", version: "0.1.0-candidate.1", description: "Evidence-bound scoring and report-generation API. Candidate implementation; not a certification service." }, servers: [{ url: baseUrl }], paths: {
    "/health": { get: { summary: "Health and dependency posture", responses: { "200": { description: "Health state" } } } },
    "/version": { get: { summary: "Release and source provenance", responses: { "200": { description: "Version metadata" } } } },
    "/api/v1/model": { get: { summary: "Readiness model and deterministic score", responses: { "200": { description: "Readiness model" } } } },
    "/api/v1/evidence": { get: { summary: "Evidence inventory", responses: { "200": { description: "Evidence records" } } }, post: { summary: "Create evidence item; bearer administrator token required", responses: { "201": { description: "Created" }, "401": { description: "Unauthorized" } } } },
    "/api/v1/score": { post: { summary: "Calculate weighted readiness score", responses: { "200": { description: "Deterministic score" } } } },
    "/api/v1/reviews/generate": { post: { summary: "Generate evidence-bound review narrative; bearer administrator token required", responses: { "201": { description: "Generated review" }, "401": { description: "Unauthorized" } } } },
    "/api/v1/reviews/{review_id}": { get: { summary: "Retrieve persisted review", parameters: [{ name: "review_id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Review" }, "404": { description: "Not found" } } } }
  }};
}
