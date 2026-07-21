export const CANONICALIZATION_PROFILE = "ei-canonical-json-no-floats-v0.1";
export const INTEGRITY_METHOD = "sha-256-digest-demo";
const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;

function assertScalarString(value, path) {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) {
        throw new TypeError(`Unpaired Unicode surrogate is not permitted at ${path}`);
      }
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      throw new TypeError(`Unpaired Unicode surrogate is not permitted at ${path}`);
    }
  }
}

function compareUnicodeCodePoints(left, right) {
  const leftPoints = Array.from(left, (character) => character.codePointAt(0));
  const rightPoints = Array.from(right, (character) => character.codePointAt(0));
  const length = Math.min(leftPoints.length, rightPoints.length);
  for (let index = 0; index < length; index += 1) {
    if (leftPoints[index] !== rightPoints[index]) {
      return leftPoints[index] - rightPoints[index];
    }
  }
  return leftPoints.length - rightPoints.length;
}

export function normalizeJson(value, path = "$") {
  if (value === null || typeof value === "boolean") return value;

  if (typeof value === "string") {
    assertScalarString(value, path);
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || Math.abs(value) > MAX_SAFE_INTEGER) {
      throw new TypeError(`Only cross-runtime safe integers are permitted at ${path}`);
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item, index) => normalizeJson(item, `${path}[${index}]`));
  }

  if (typeof value === "object") {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError(`Only plain JSON objects are permitted at ${path}`);
    }

    const result = Object.create(null);
    for (const key of Object.keys(value).sort(compareUnicodeCodePoints)) {
      assertScalarString(key, `${path}.<key>`);
      result[key] = normalizeJson(value[key], `${path}.${key}`);
    }
    return result;
  }

  throw new TypeError(`Unsupported JSON value at ${path}`);
}

export function canonicalJson(value) {
  return JSON.stringify(normalizeJson(value));
}

function receiptIntegrityPayload(receipt) {
  const payload = normalizeJson(receipt);
  const integrity = payload.integrity ?? Object.create(null);
  integrity.method = integrity.method ?? INTEGRITY_METHOD;
  integrity.canonicalization_profile =
    integrity.canonicalization_profile ?? CANONICALIZATION_PROFILE;
  delete integrity.digest;
  payload.integrity = integrity;
  return payload;
}

export async function sha256Hex(bytes) {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Web Crypto SHA-256 is unavailable");
  }
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function digestCanonicalValue(value) {
  const bytes = new TextEncoder().encode(canonicalJson(value));
  return `sha256:${await sha256Hex(bytes)}`;
}

export async function computeReceiptDigest(receipt) {
  return digestCanonicalValue(receiptIntegrityPayload(receipt));
}

export async function sealReceipt(receipt, verificationStatus = "verified") {
  const result = normalizeJson(receipt);
  result.integrity = {
    method: INTEGRITY_METHOD,
    digest: `sha256:${"0".repeat(64)}`,
    canonicalization_profile: CANONICALIZATION_PROFILE,
    verification_status: verificationStatus,
  };
  result.integrity.digest = await computeReceiptDigest(result);
  return result;
}

export async function verifyReceiptDigest(receipt) {
  try {
    const integrity = receipt?.integrity ?? {};
    if (integrity.method !== INTEGRITY_METHOD) return false;
    if (integrity.canonicalization_profile !== CANONICALIZATION_PROFILE) return false;
    return (
      typeof integrity.digest === "string" &&
      integrity.digest === (await computeReceiptDigest(receipt))
    );
  } catch {
    return false;
  }
}
