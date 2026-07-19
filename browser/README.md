# Browser digest module

`integrity.mjs` implements the same restricted canonicalization and SHA-256 digest semantics as the Python reference implementation for identical supported JSON values. It is a browser implementation of the logic, not a byte-identical copy of the Python source.

Run the published cross-runtime vectors with:

```bash
node tools/verify_browser_parity.mjs
```

The parity check compares both implementations against fixed canonical JSON and digest values, verifies the bundled example receipt, and confirms that modifying a protected receipt field causes verification to fail.

The shared restricted domain excludes floating-point numbers, integers outside JavaScript's safe integer range, unpaired Unicode surrogates, non-string object keys, and non-JSON values. The receipt schemas already constrain normative numeric fields to this domain; deployments must apply the same restriction to open state objects.

A successful parity check proves only that the two implementations produce the same digest for the bundled identical values. SHA-256 digest agreement does not authenticate an issuer, establish a trusted publication channel, prove input truth, or replace a production signature and key-management profile.
