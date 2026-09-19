-- Shared word list: words the admin adds, visible to everyone on every device.
-- Each learner's own progress (scores, wrong-word flags) stays in their browser.
CREATE TABLE IF NOT EXISTS shared_words (
  id TEXT PRIMARY KEY,
  word TEXT NOT NULL,
  definition_en TEXT,
  definition_ko TEXT,
  level_en TEXT,
  level_ko TEXT,
  example TEXT NOT NULL DEFAULT '',
  no_definition_en INTEGER NOT NULL DEFAULT 0,
  no_definition_ko INTEGER NOT NULL DEFAULT 0,
  source TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_shared_words_word ON shared_words (word);
