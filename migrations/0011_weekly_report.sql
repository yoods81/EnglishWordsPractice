-- Weekly report e-mail switch (see /api/report/auto and the weekly cron in worker/index.js).
CREATE TABLE IF NOT EXISTS weekly_report_prefs (
  user_id TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 0,
  tz_offset INTEGER NOT NULL DEFAULT 0,   -- minutes east of UTC, sent by the browser
  lang TEXT NOT NULL DEFAULT 'en',
  last_sent_at INTEGER,
  updated_at INTEGER NOT NULL
);
