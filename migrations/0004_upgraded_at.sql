-- One-time migration for a database created before users.upgraded_at
-- existed. Run it once against the live database:
--   npx wrangler d1 execute englishwordspractice --remote --file=./migrations/0004_upgraded_at.sql
--
-- A brand-new database created from the current schema.sql already has this
-- column — nothing to run there.
--
-- Running this file a second time against an already-migrated database will
-- fail on the ALTER TABLE ("duplicate column name") — that failure means the
-- migration already applied and there's nothing left to do.

ALTER TABLE users ADD COLUMN upgraded_at INTEGER;
