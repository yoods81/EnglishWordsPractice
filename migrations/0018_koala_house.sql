-- Koala House stage 5, B bundle.
-- house_saves (S3): one Koala House save per account and site child slot (account_key = "<id>:house" | "<id>:p<n>:house"),
--   rev bumps on every save; a save is written only at the rev it started from (otherwise 409 and the app merges).
-- config_log (S12): every settings change, one row per changed field, kept forever (never deleted).
--   The settings themselves live in site_settings key 'config' as { live, draft }.
CREATE TABLE IF NOT EXISTS house_saves (
  account_key TEXT PRIMARY KEY,
  save_json TEXT NOT NULL,
  rev INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  size INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS config_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at INTEGER NOT NULL,
  by_name TEXT NOT NULL,
  batch TEXT NOT NULL,
  version INTEGER,
  channel TEXT NOT NULL,
  source TEXT NOT NULL,
  path TEXT NOT NULL,
  before_val TEXT,
  after_val TEXT
);
CREATE INDEX IF NOT EXISTS idx_config_log_batch ON config_log (batch);
