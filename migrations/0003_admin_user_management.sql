-- One-time migration for a database created before admin user-management
-- (targeted upgrade codes + upgrade requests) existed. Run it once against
-- the live database:
--   npx wrangler d1 execute englishwordspractice --remote --file=./migrations/0003_admin_user_management.sql
--
-- A brand-new database created from the current schema.sql already has all
-- of this — nothing to run there.
--
-- Running this file a second time against an already-migrated database will
-- fail on the ALTER TABLE ("duplicate column name") — that failure means the
-- migration already applied and there's nothing left to do.

ALTER TABLE special_codes ADD COLUMN target_user_id TEXT;
CREATE INDEX IF NOT EXISTS idx_special_codes_target ON special_codes (target_user_id);

CREATE TABLE IF NOT EXISTS upgrade_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_at INTEGER NOT NULL,
  fulfilled_at INTEGER,
  code TEXT
);

CREATE INDEX IF NOT EXISTS idx_upgrade_requests_user ON upgrade_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_upgrade_requests_status ON upgrade_requests (status);
