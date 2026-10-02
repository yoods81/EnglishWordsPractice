-- Koala world (coins, items, streak, badges) saved per account, so it
-- follows a signed-in child to any device — free accounts included.
-- Safe to run twice (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS user_rewards (
  user_id TEXT PRIMARY KEY,
  reward_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
