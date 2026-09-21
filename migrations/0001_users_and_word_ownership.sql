-- One-time migration for a database created before user accounts existed
-- (i.e. any production database deployed before this file was added). Run it
-- once against the live database:
--   npx wrangler d1 execute englishwordspractice --remote --file=./migrations/0001_users_and_word_ownership.sql
--
-- A brand-new database created from the current schema.sql already has all
-- of this — schema.sql's CREATE TABLE statements are idempotent (IF NOT
-- EXISTS) and already include owner_id, so there's nothing to run there.
--
-- Running this file a second time against an already-migrated database will
-- fail on the ALTER TABLE ("duplicate column name") — that failure means the
-- migration already applied and there's nothing left to do.

ALTER TABLE shared_words ADD COLUMN owner_id TEXT;
CREATE INDEX IF NOT EXISTS idx_shared_words_owner ON shared_words (owner_id);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'free',
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);

CREATE TABLE IF NOT EXISTS special_codes (
  code TEXT PRIMARY KEY,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  redeemed_by TEXT,
  redeemed_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_special_codes_redeemed_by ON special_codes (redeemed_by);
