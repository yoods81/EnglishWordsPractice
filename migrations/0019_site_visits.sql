-- Site visitor counts for the admin Overview (daily / weekly / monthly visitors).
-- One row per device per day: vid is a random id the app keeps in localStorage (no account, no IP, no name).
-- day = days since 1970 in the visitor's own time zone; member = 1 if they were signed in at any visit that day.
-- Admin sessions are not counted. Rows older than about 400 days are cleared by the worker.
CREATE TABLE IF NOT EXISTS site_visits (
  day INTEGER NOT NULL,
  vid TEXT NOT NULL,
  member INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, vid)
);
