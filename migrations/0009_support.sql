-- Customer support: inquiries (tickets) with a message thread, private admin
-- notes about a customer, and a small key/value table for site settings (the
-- site-wide announcement lives here).
-- Run once against the live database BEFORE deploying the matching code:
--   npm run db:migrate:support
--
-- A brand-new database created from the current schema.sql already has all of
-- this; every statement is IF NOT EXISTS, so running the file twice is safe.

CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  user_id TEXT,                          -- NULL when a signed-out visitor wrote in
  email TEXT,                            -- where to reach them (signed-out visitors)
  name TEXT,
  category TEXT NOT NULL DEFAULT 'question', -- 'question' | 'bug' | 'account' | 'payment' | 'other'
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',   -- 'open' (needs a reply) | 'pending' (waiting on the customer) | 'resolved'
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_from TEXT NOT NULL DEFAULT 'user',-- who wrote last: 'user' | 'admin'
  admin_unread INTEGER NOT NULL DEFAULT 1,
  user_unread INTEGER NOT NULL DEFAULT 0,
  ip_hash TEXT                           -- keyed hash, only used to rate-limit
);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets (status, updated_at);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets (user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created ON support_tickets (created_at);

CREATE TABLE IF NOT EXISTS support_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id TEXT NOT NULL,
  sender TEXT NOT NULL,                  -- 'user' | 'admin' | 'note' (note = private, never shown to the customer)
  body TEXT NOT NULL,
  emailed INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON support_messages (ticket_id, id);

CREATE TABLE IF NOT EXISTS customer_notes (
  user_id TEXT PRIMARY KEY,
  note TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
