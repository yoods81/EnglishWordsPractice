-- Typing page leaderboard (2026-11-25, sw v298). One row per finished, ranked result.
-- kind: words (falling-words score) · sentence · paragraph · daily (Today's challenge, WPM).
-- slot = child profile (0-3). Names are never stored: the board shows an auto nickname from user id + slot.
-- input: kb (physical keyboard) or touch (phone/tablet screen keyboard) — ranked separately.
-- score = the falling-words score, or WPM x 10 for the WPM kinds. day = Sydney date (YYYY-MM-DD).
CREATE TABLE IF NOT EXISTS typing_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  slot INTEGER NOT NULL DEFAULT 0,
  kind TEXT NOT NULL,
  level TEXT NOT NULL,
  input TEXT NOT NULL DEFAULT 'kb',
  score INTEGER NOT NULL,
  accuracy INTEGER NOT NULL DEFAULT 100,
  day TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_typing_scores_board ON typing_scores (kind, level, input, score DESC);
CREATE INDEX IF NOT EXISTS idx_typing_scores_user ON typing_scores (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_typing_scores_day ON typing_scores (kind, day, level);
