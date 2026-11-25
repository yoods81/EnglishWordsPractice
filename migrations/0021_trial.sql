-- 1-month free Premium trial without a card (promotion 2026-11-27 ~ 2027-01-31, worker/trial.js).
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
