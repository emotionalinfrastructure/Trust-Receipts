PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS api_keys (
  key_hash TEXT PRIMARY KEY,
  key_prefix TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  label TEXT NOT NULL,
  scopes_json TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'suspended', 'revoked')),
  created_at TEXT NOT NULL,
  last_used_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_api_keys_org_status
  ON api_keys (organization_id, status);

CREATE TABLE IF NOT EXISTS issuer_keys (
  key_id TEXT PRIMARY KEY,
  algorithm TEXT NOT NULL,
  public_jwk_json TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'retired', 'revoked')),
  created_at TEXT NOT NULL,
  retired_at TEXT
);

CREATE TABLE IF NOT EXISTS decisions (
  decision_id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  request_json TEXT NOT NULL,
  grant_json TEXT NOT NULL,
  evidence_json TEXT NOT NULL,
  context_json TEXT NOT NULL,
  gate_json TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('allowed_pending_execution', 'finalizing', 'denied', 'finalized', 'expired', 'cancelled')),
  finalize_token_hash TEXT,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  finalized_at TEXT,
  finalized_receipt_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_decisions_org_state
  ON decisions (organization_id, state, created_at);

CREATE TABLE IF NOT EXISTS receipts (
  receipt_id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  action_status TEXT NOT NULL,
  consequence_class TEXT NOT NULL,
  digest TEXT NOT NULL UNIQUE,
  key_id TEXT NOT NULL,
  receipt_json TEXT NOT NULL,
  assertion_json TEXT NOT NULL,
  access_token_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  revoked_at TEXT,
  revocation_reason TEXT,
  FOREIGN KEY (key_id) REFERENCES issuer_keys(key_id)
);

CREATE INDEX IF NOT EXISTS idx_receipts_org_created
  ON receipts (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_receipts_action
  ON receipts (action_type, action_status, consequence_class);

CREATE TABLE IF NOT EXISTS remedy_cases (
  case_id TEXT PRIMARY KEY,
  receipt_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  requester_reference_hash TEXT NOT NULL,
  requested_action TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('submitted', 'under_review', 'resolved', 'denied', 'withdrawn')),
  access_token_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  resolution_summary TEXT,
  FOREIGN KEY (receipt_id) REFERENCES receipts(receipt_id)
);

CREATE INDEX IF NOT EXISTS idx_remedy_receipt
  ON remedy_cases (receipt_id, status, created_at);

CREATE TABLE IF NOT EXISTS audit_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  actor TEXT NOT NULL,
  subject TEXT NOT NULL,
  details_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_subject_created
  ON audit_events (subject, created_at DESC);
