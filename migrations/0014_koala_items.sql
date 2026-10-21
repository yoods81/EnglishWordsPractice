-- My Koala admin item management.
--
-- Important design choice (see scripts/migrate-koala-items-seed notes, or
-- the plan this was built from): the ~250 existing items in
-- public/js/koala-core.js (ITEMS) and public/js/koala-house.js (D) are NOT
-- migrated into these tables. Several legacy House items embed things that
-- cannot round-trip through plain columns (wall/poster items carry an `art`
-- SVG-generator *function*, some furniture carries `subKind`/`subBase` for
-- the book/frame/toybox sub-item picker, etc.) — copying all of that
-- faithfully is high-risk for a cosmetic admin feature. Legacy items stay
-- exactly as they are today (code + deploy to change).
--
-- These tables hold ONLY items an admin creates from the My Koala page from
-- now on. The client merges them additively on top of the hardcoded
-- catalogs (never replacing), so nothing about the existing ~250 items
-- changes. New items are always image-based (an admin can upload a picture,
-- not hand-code SVG), which is why there is no parts/subKind/wall-art
-- column here — only what a simple admin-created item needs.
--
-- Safe to run twice (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS item_categories (
  kind TEXT NOT NULL,              -- 'character' | 'studyroom' | 'house'
  id TEXT NOT NULL,                -- slot (character/studyroom) or cat (house)
  label_ko TEXT NOT NULL,
  label_en TEXT NOT NULL,
  icon_path TEXT,                  -- static path, or 'r2:<key>' for an uploaded icon
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (kind, id)
);

CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,              -- 'character' | 'studyroom' | 'house'
  cat TEXT NOT NULL,               -- a built-in slot/cat, or an admin-added category id
  name_ko TEXT NOT NULL,
  name_en TEXT NOT NULL,
  unlock_type TEXT NOT NULL,       -- 'free' | 'coins' | 'streak' | 'badge'
  unlock_value TEXT,               -- coins amount / streak days / badge id, as text
  price INTEGER NOT NULL DEFAULT 0,
  season_from TEXT,                -- JSON "[month,day]" or NULL
  season_to TEXT,
  w INTEGER,                       -- house only: footprint tiles
  d INTEGER,
  where_placement TEXT,            -- house only: 'in' | 'out' | 'both'
  parts_json TEXT,                 -- house only: auto-generated placeholder hit box (single flat box, w x d)
  image_key TEXT,                  -- house: manifest-style photo; character/studyroom: 3D Pop-out photo
  image_key_2d TEXT,                -- character/studyroom only: flat 2D Sticker photo
  active INTEGER NOT NULL DEFAULT 1,  -- soft delete: hidden from the shop, owners keep it
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_items_kind_cat ON items (kind, cat, active);
