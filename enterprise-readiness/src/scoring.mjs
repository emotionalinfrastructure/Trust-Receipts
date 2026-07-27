import { DOMAINS } from "./config.mjs";

export function validateScores(input) {
  const source = input?.domains ?? DOMAINS;
  if (!Array.isArray(source) || source.length === 0) throw new TypeError("domains must be a non-empty array");
  const seen = new Set();
  let totalWeight = 0;
  return source.map((item) => {
    const id = String(item.id ?? "").trim();
    if (!id || seen.has(id)) throw new TypeError("domain ids must be unique and non-empty");
    seen.add(id);
    const weight = Number(item.weight);
    const score = Number(item.score);
    if (!Number.isFinite(weight) || weight <= 0) throw new RangeError(`invalid weight for ${id}`);
    if (!Number.isFinite(score) || score < 0 || score > 5) throw new RangeError(`score for ${id} must be between 0 and 5`);
    totalWeight += weight;
    return { ...item, id, weight, score };
  }).map((item, _, rows) => ({ ...item, _totalWeight: totalWeight, _rows: rows.length }));
}

export function calculateScore(input = { domains: DOMAINS }) {
  const rows = validateScores(input);
  const totalWeight = rows.reduce((sum, row) => sum + row.weight, 0);
  const weighted = rows.reduce((sum, row) => sum + (row.score / 5) * row.weight, 0);
  const score100 = Number(((weighted / totalWeight) * 100).toFixed(1));
  const score5 = Number((score100 / 20).toFixed(2));
  let classification = "Foundational";
  if (score100 >= 80) classification = "Enterprise-ready candidate";
  else if (score100 >= 60) classification = "Integration-stage platform";
  else if (score100 >= 40) classification = "Advanced candidate architecture";
  return { score100, score5, classification, totalWeight, domains: rows.map(({_totalWeight, _rows, ...row}) => ({ ...row, contribution: Number((((row.score / 5) * row.weight) / totalWeight * 100).toFixed(2)) })) };
}
