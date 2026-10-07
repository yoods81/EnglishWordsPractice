-- Account recovery codes: one per account, so a child (or parent) who forgets
-- a username or password can get back in without email. Only an HMAC of the
-- code is stored (never the code itself). Safe to run twice (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS recovery_codes (
  user_id TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_recovery_codes_hash ON recovery_codes (code_hash);
