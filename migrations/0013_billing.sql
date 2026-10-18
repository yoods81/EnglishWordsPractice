-- Paid subscriptions (Stripe). One row per account that has ever started a
-- checkout. users.role stays the single source of truth for access
-- ('paid' / 'free'); this table only records *why* a user is paid so the
-- Stripe webhook can promote and demote them, and so My Account can show the
-- renewal date and whether the subscription ends at the close of the period.
CREATE TABLE IF NOT EXISTS subscriptions (
  user_id TEXT PRIMARY KEY,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'incomplete', -- Stripe status: active | trialing | past_due | canceled | unpaid | incomplete ...
  plan TEXT,                                 -- 'month' | 'year'
  current_period_end INTEGER,                -- ms since epoch
  cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer ON subscriptions (stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_subscription ON subscriptions (stripe_subscription_id);

-- Stripe retries webhooks, so every event id is recorded and handled once.
CREATE TABLE IF NOT EXISTS stripe_events (
  event_id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  processed_at INTEGER NOT NULL
);
