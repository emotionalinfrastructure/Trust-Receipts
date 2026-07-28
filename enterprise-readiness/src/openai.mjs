export async function generateReport(env, prompt, requestId) {
  if (!env.OPENAI_API_KEY) throw Object.assign(new Error("OPENAI_API_KEY is not configured."), { status: 503, code: "OPENAI_NOT_CONFIGURED" });
  const model = env.OPENAI_MODEL || "gpt-5.6";
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "authorization": `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json", "x-client-request-id": requestId },
    body: JSON.stringify({ model, store: false, input: prompt })
  });
  const payload = await res.json();
  if (!res.ok) throw Object.assign(new Error(payload?.error?.message || "OpenAI report generation failed."), { status: 502, code: "OPENAI_UPSTREAM_ERROR" });
  const text = payload.output_text || payload.output?.flatMap((o) => o.content || []).find((c) => c.type === "output_text")?.text;
  if (!text) throw Object.assign(new Error("OpenAI returned no report text."), { status: 502, code: "OPENAI_EMPTY_RESPONSE" });
  return { text, model, response_id: payload.id };
}
