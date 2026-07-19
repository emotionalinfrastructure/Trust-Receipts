import { readFile } from "node:fs/promises";

import {
  canonicalJson,
  computeDigest,
  digestCanonicalValue,
  verifyDigest,
} from "../browser/integrity.mjs";

const root = new URL("../", import.meta.url);
const vectors = JSON.parse(
  await readFile(new URL("fixtures/browser-digest-vectors.json", root), "utf8"),
);

let passed = 0;
for (const vector of vectors.canonicalization_vectors) {
  const canonical = canonicalJson(vector.value);
  if (canonical !== vector.expected_canonical_json) {
    throw new Error(`${vector.id}: canonical JSON mismatch`);
  }
  const digest = await digestCanonicalValue(vector.value);
  if (digest !== vector.expected_sha256) {
    throw new Error(`${vector.id}: canonical digest mismatch`);
  }
  passed += 1;
}

for (const vector of vectors.receipt_vectors) {
  const receipt = JSON.parse(await readFile(new URL(vector.receipt_path, root), "utf8"));
  const digest = await computeDigest(receipt);
  if (digest !== vector.expected_digest || !(await verifyDigest(receipt))) {
    throw new Error(`${vector.id}: receipt digest mismatch`);
  }
  const tampered = structuredClone(receipt);
  tampered.action.after_state = { parity_test_tampered: true };
  if (await verifyDigest(tampered)) {
    throw new Error(`${vector.id}: tampered receipt unexpectedly verified`);
  }
  passed += 1;
}

console.log(
  JSON.stringify(
    {
      profile: vectors.canonicalization_profile,
      passed,
      total:
        vectors.canonicalization_vectors.length + vectors.receipt_vectors.length,
    },
    null,
    2,
  ),
);
