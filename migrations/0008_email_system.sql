-- Email system: accounts get an email address (used for recovery), plus
-- one-time email tokens (verify / reset) and a send log for the admin panel.
-- Run once against the live database BEFORE deploying the matching code:
--   npm run db:migrate:email
--
-- A brand-new database created from the current schema.sql already has all of
-- this. Running the file again fails on the first ALTER TABLE ("duplicate
-- column name") — that failure means it already applied.

ALTER TABLE users ADD COLUMN email TEXT;
ALTER TABLE users ADD COLUMN email_verified_at INTEGER;

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

CREATE TABLE IF NOT EXISTS email_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL,            -- 'verify' | 'reset'
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_email_tokens_user ON email_tokens (user_id, kind);

CREATE TABLE IF NOT EXISTS email_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  to_addr TEXT NOT NULL,
  kind TEXT NOT NULL,            -- 'verify' | 'reset' | 'forgot_username' | 'test'
  subject TEXT,
  status TEXT NOT NULL,          -- 'sent' | 'failed'
  error TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_email_log_created ON email_log (created_at);
