-- 1-month free Premium trial without a card + the photo counter table (promotion 2026-11-27 ~ 2027-01-31, worker/trial.js).
-- One row per account, ever: an account that has a row with started_at never gets a second trial.
CREATE TABLE IF NOT EXISTS trials (
  user_id TEXT PRIMARY KEY,
  wanted_at INTEGER,          -- asked for the trial at sign-up; starts when the email is confirmed
  started_at INTEGER,
  ends_at INTEGER,
  stripe_subscription_id TEXT,
  report_sent_at INTEGER,     -- the "first week" parent report
  remind3_at INTEGER,         -- 3 days before the end
  remind_last_at INTEGER      -- the last day
);

-- Photo -> words counter (worker/photo.js). Was used by the code but never defined in a migration;
-- IF NOT EXISTS keeps this harmless where it was created by hand.
-- day = "YYYY-MM-DD" (Sydney) for daily limits, "total" for the free lifetime count; user_id "__site__" = whole-site daily count.
CREATE TABLE IF NOT EXISTS extract_usage (
  user_id TEXT NOT NULL,
  day TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);
