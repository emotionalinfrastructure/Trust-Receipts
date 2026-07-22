# AI Trust Receipt Demo Worker

Source-controlled Cloudflare Worker for `https://ei-trust-receipt.brittanywright.workers.dev/`.

This deployment is an interactive governance demonstration. It generates unique server-side demonstration receipts, publishes its JSON Schema, exposes digest verification, preserves complete ordered gate failures, and serves baseline security and accessibility controls.

It deliberately does **not** claim durable persistence or issuer authentication. Those capabilities belong to the separate operational service under `../service/` and require D1 provisioning, key custody, smoke testing, and operational review.

## Commands

```bash
npm install
npm test
npm run dry-run
npm run deploy
```
