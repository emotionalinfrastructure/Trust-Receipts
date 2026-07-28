CREATE TABLE IF NOT EXISTS evidence_items (
  claim_id TEXT PRIMARY KEY,
  claim TEXT NOT NULL,
  domain TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('Verified','Corroborated','Asserted','Unresolved','Not established')),
  document TEXT,
  repository TEXT,
  module TEXT,
  commit_sha TEXT,
  release TEXT,
  deployment_url TEXT,
  test_evidence TEXT,
  public_page TEXT,
  external_validation TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS review_runs (
  review_id TEXT PRIMARY KEY,
  score_100 REAL NOT NULL,
  classification TEXT NOT NULL,
  focus TEXT NOT NULL,
  evidence_snapshot TEXT NOT NULL,
  report_markdown TEXT NOT NULL,
  model TEXT NOT NULL,
  request_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS audit_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  actor TEXT,
  target_id TEXT,
  request_id TEXT,
  payload_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS idempotency_keys (
  key TEXT PRIMARY KEY,
  operation TEXT NOT NULL,
  response_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_evidence_domain ON evidence_items(domain);
CREATE INDEX IF NOT EXISTS idx_evidence_status ON evidence_items(status);
CREATE INDEX IF NOT EXISTS idx_review_created ON review_runs(created_at);
