-- Per-account learning progress (word stats, spaced-repetition schedule),
-- so an admin or paid account's Quiz/Spelling/Typing Game history follows
-- them across devices and across logging out and back in. A free/anonymous
-- visitor's progress stays local-only (localStorage), never reaches this
-- table. account_key is that account's own user id (users.id) — each row
-- belongs to exactly one account, and the API only ever lets an account
-- read or write its own row (see /api/progress in worker/index.js).
CREATE TABLE IF NOT EXISTS user_progress (
  account_key TEXT PRIMARY KEY,
  progress_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
