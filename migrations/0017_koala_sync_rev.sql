-- Koala House stage 5, A bundle: wallet sync safety.
-- rev: every save of a wallet/progress row bumps it; an app that knows revs saves only if the row is still at the
-- rev it started from (UPDATE ... WHERE rev = ?), otherwise it gets 409 and merges. Existing rows start at 0.
-- sync_stats: day/kind counts only (no account, no wallet) for the admin Overview while the change is watched.
ALTER TABLE user_rewards ADD COLUMN rev INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_progress ADD COLUMN rev INTEGER NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS sync_stats (
  day TEXT NOT NULL,
  kind TEXT NOT NULL,
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, kind)
);
