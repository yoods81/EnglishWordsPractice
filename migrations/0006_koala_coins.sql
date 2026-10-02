-- Koala Coins admin tools.
--
-- koala_grants: coins an admin gave (positive) or took (negative) from an
-- account. The child's device picks pending rows up the next time they open
-- the app and applies them to their own balance, then marks them applied.
-- user_koala: a small summary each signed-in device reports, so the admin can
-- see balances (free accounts keep their coins on their own device).
--
-- Safe to run twice (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS koala_grants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  note TEXT,
  created_by TEXT,
  created_at INTEGER NOT NULL,
  applied_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_koala_grants_user ON koala_grants (user_id, applied_at);

CREATE TABLE IF NOT EXISTS user_koala (
  user_id TEXT PRIMARY KEY,
  coins INTEGER NOT NULL DEFAULT 0,
  earned INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);
