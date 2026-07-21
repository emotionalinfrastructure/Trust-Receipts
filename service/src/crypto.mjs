import { canonicalJson, sha256Hex } from "./canonical.mjs";

export const ASSERTION_PROFILE = "ei-ed25519-detached-v0.1-draft";
export const ASSERTION_ALGORITHM = "Ed25519";

function binaryToBytes(binary) {
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function bytesToBinary(bytes) {
  let binary = "";
  const chunk = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunk) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunk));
  }
  return binary;
}

export function decodeBase64(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  if (typeof atob === "function") return binaryToBytes(atob(padded));
  return Uint8Array.from(Buffer.from(padded, "base64"));
}

export function encodeBase64Url(bytes) {
  const base64 =
    typeof btoa === "function"
      ? btoa(bytesToBinary(bytes))
      : Buffer.from(bytes).toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}

export async function importEd25519PrivateKey(pkcs8Base64) {
  if (!pkcs8Base64) throw new Error("Issuer private key is not configured");
  return crypto.subtle.importKey(
    "pkcs8",
    decodeBase64(pkcs8Base64),
    { name: "Ed25519" },
    false,
    ["sign"],
  );
}

export async function importEd25519PublicKey(spkiBase64) {
  if (!spkiBase64) throw new Error("Issuer public key is not configured");
  return crypto.subtle.importKey(
    "spki",
    decodeBase64(spkiBase64),
    { name: "Ed25519" },
    true,
    ["verify"],
  );
}

export async function publicJwkFromSpki(spkiBase64, keyId) {
  const key = await importEd25519PublicKey(spkiBase64);
  const jwk = await crypto.subtle.exportKey("jwk", key);
  return {
    ...jwk,
    kid: keyId,
    use: "sig",
    alg: "EdDSA",
  };
}

export function assertionPayload(assertion) {
  return {
    profile: assertion.profile,
    algorithm: assertion.algorithm,
    key_id: assertion.key_id,
    receipt_id: assertion.receipt_id,
    receipt_digest: assertion.receipt_digest,
    signed_at: assertion.signed_at,
  };
}

export async function signReceiptAssertion({ receipt, keyId, privateKeyBase64, signedAt }) {
  if (!receipt?.receipt_id || !receipt?.integrity?.digest) {
    throw new TypeError("A sealed receipt is required before issuer signing");
  }

  const payload = {
    profile: ASSERTION_PROFILE,
    algorithm: ASSERTION_ALGORITHM,
    key_id: keyId,
    receipt_id: receipt.receipt_id,
    receipt_digest: receipt.integrity.digest,
    signed_at: signedAt,
  };
  const key = await importEd25519PrivateKey(privateKeyBase64);
  const signature = await crypto.subtle.sign(
    { name: "Ed25519" },
    key,
    new TextEncoder().encode(canonicalJson(payload)),
  );

  return {
    ...payload,
    signature: encodeBase64Url(new Uint8Array(signature)),
  };
}

export async function verifyReceiptAssertion({ receipt, assertion, publicKeyBase64, publicKeyJwk }) {
  try {
    if (assertion?.profile !== ASSERTION_PROFILE) return false;
    if (assertion?.algorithm !== ASSERTION_ALGORITHM) return false;
    if (assertion?.receipt_id !== receipt?.receipt_id) return false;
    if (assertion?.receipt_digest !== receipt?.integrity?.digest) return false;
    if (typeof assertion?.signature !== "string") return false;

    const key = publicKeyJwk
      ? await crypto.subtle.importKey("jwk", publicKeyJwk, { name: "Ed25519" }, true, ["verify"])
      : await importEd25519PublicKey(publicKeyBase64);
    return crypto.subtle.verify(
      { name: "Ed25519" },
      key,
      decodeBase64(assertion.signature),
      new TextEncoder().encode(canonicalJson(assertionPayload(assertion))),
    );
  } catch {
    return false;
  }
}

export async function sha256Text(value) {
  return sha256Hex(new TextEncoder().encode(value));
}

export function randomToken(prefix = "tr_live") {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `${prefix}_${encodeBase64Url(bytes)}`;
}

export function randomId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export async function constantTimeTextEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string") return false;
  const [leftHash, rightHash] = await Promise.all([sha256Text(left), sha256Text(right)]);
  let difference = leftHash.length ^ rightHash.length;
  const length = Math.max(leftHash.length, rightHash.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (leftHash.charCodeAt(index) || 0) ^ (rightHash.charCodeAt(index) || 0);
  }
  return difference === 0;
}
