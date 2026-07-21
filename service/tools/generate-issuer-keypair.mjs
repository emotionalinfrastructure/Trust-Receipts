const pair = await crypto.subtle.generateKey(
  { name: "Ed25519" },
  true,
  ["sign", "verify"],
);

const [privateKey, publicKey, publicJwk] = await Promise.all([
  crypto.subtle.exportKey("pkcs8", pair.privateKey),
  crypto.subtle.exportKey("spki", pair.publicKey),
  crypto.subtle.exportKey("jwk", pair.publicKey),
]);

console.log(JSON.stringify({
  algorithm: "Ed25519",
  private_key_pkcs8_base64: Buffer.from(privateKey).toString("base64"),
  public_key_spki_base64: Buffer.from(publicKey).toString("base64"),
  public_jwk: publicJwk,
  handling: {
    private_key: "Store only in an approved secret manager or Cloudflare Worker secret.",
    public_key: "Publish through the service well-known key endpoint.",
  },
}, null, 2));
