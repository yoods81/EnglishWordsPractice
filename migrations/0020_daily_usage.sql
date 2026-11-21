-- Daily question limits checked on the server (site evaluation 2026-11-21, item 5).
-- One row per learner per day per mode: how many questions (quiz/spelling/tt) or rounds (flash/type) were used.
-- who = 'u:<user id>' for an account, 'g:<random id>' for a signed-out device (signed cookie ywp_gid, no IP, no name).
-- day = days since 1970 in the learner's own time zone. Premium/admin are unlimited and never get rows.
-- Rows older than about 14 days are cleared by the worker.
CREATE TABLE IF NOT EXISTS daily_usage (
  day INTEGER NOT NULL,
  who TEXT NOT NULL,
  mode TEXT NOT NULL,
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, who, mode)
);
