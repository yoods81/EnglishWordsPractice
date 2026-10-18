// Premium subscriptions through Stripe (Checkout + webhooks), plus the
// self-serve "go back to free" and "close my account" billing hooks.
//
// Design rules:
//  - users.role stays the single source of truth for access. This file only
//    flips it between 'free' and 'paid' (never touches 'admin') in response to
//    Stripe, and records the why in the `subscriptions` table.
//  - Webhook events are never trusted for their contents: each one only tells
//    us *which* subscription changed, and we re-read that subscription from
//    Stripe. That makes handling idempotent and immune to out-of-order delivery.
//  - Cancelling keeps premium until the paid period ends (cancel_at_period_end);
//    Stripe then sends customer.subscription.deleted and the account drops to
//    free. Nothing the account created is deleted — it is only locked.
//
// Secrets / vars (see README): STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
// STRIPE_PRICE_MONTHLY, STRIPE_PRICE_YEARLY. APP_URL is the public site URL.

import { sendEmail, templates, emailSettings } from "./email.js";

const STRIPE_API = "https://api.stripe.com/v1";
const WEBHOOK_TOLERANCE_SECONDS = 5 * 60;
// Stripe statuses during which the learner keeps premium. past_due stays
// premium on purpose: Stripe is still retrying the card, and a failed payment
// shouldn't lock a child out mid-homework. Once Stripe gives up the status
// becomes unpaid/canceled and the account drops to free.
const ENTITLED_STATUSES = ["active", "trialing", "past_due"];

/* ---------- Stripe plumbing ---------- */

function billingConfigured(env) {
  return !!(env.STRIPE_SECRET_KEY && env.STRIPE_PRICE_MONTHLY && env.STRIPE_PRICE_YEARLY);
}

// Stripe wants application/x-www-form-urlencoded with bracketed nesting
// (line_items[0][price]=...), not JSON.
function formEncode(value, prefix, out = []) {
  if (value === null || value === undefined) return out;
  if (Array.isArray(value)) {
    value.forEach((v, i) => formEncode(v, `${prefix}[${i}]`, out));
  } else if (typeof value === "object") {
    for (const [k, v] of Object.entries(value)) formEncode(v, prefix ? `${prefix}[${k}]` : k, out);
  } else {
    out.push(`${encodeURIComponent(prefix)}=${encodeURIComponent(String(value))}`);
  }
  return out;
}

async function stripe(env, method, path, params, idempotencyKey) {
  const headers = { authorization: `Bearer ${env.STRIPE_SECRET_KEY}` };
  let body;
  let url = `${STRIPE_API}${path}`;
  const encoded = params ? formEncode(params, "").join("&") : "";
  if (method === "GET") {
    if (encoded) url += `?${encoded}`;
  } else {
    headers["content-type"] = "application/x-www-form-urlencoded";
    body = encoded;
  }
  if (idempotencyKey) headers["idempotency-key"] = idempotencyKey;
  let res;
  try {
    res = await fetch(url, { method, headers, body });
  } catch (e) {
    return { ok: false, status: 0, data: { error: { message: "network_error" } } };
  }
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  return { ok: res.ok, status: res.status, data };
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

// Stripe-Signature: t=<unix>,v1=<hex>[,v1=<hex>...]; signed payload is `${t}.${rawBody}`.
async function verifyWebhookSignature(rawBody, header, secret, nowSeconds) {
  if (!header || !secret) return false;
  const parts = header.split(",").map((p) => p.trim().split("="));
  const t = parts.find(([k]) => k === "t")?.[1];
  const candidates = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!t || !candidates.length) return false;
  if (Math.abs(nowSeconds - Number(t)) > WEBHOOK_TOLERANCE_SECONDS) return false;
  const expected = await hmacHex(secret, `${t}.${rawBody}`);
  return candidates.some((c) => timingSafeEqual(c, expected));
}

/* ---------- subscription state ---------- */

function subscriptionFacts(sub) {
  const item = sub?.items?.data?.[0];
  // Newer Stripe API versions moved the billing period onto the item.
  const periodEnd = sub?.current_period_end ?? item?.current_period_end ?? null;
  return {
    status: sub?.status || "incomplete",
    plan: item?.price?.recurring?.interval === "year" ? "year" : "month",
    periodEndMs: periodEnd ? Number(periodEnd) * 1000 : null,
    cancelAtPeriodEnd: !!(sub?.cancel_at_period_end || sub?.cancel_at),
  };
}

// Writes the subscription row and moves users.role to match. Returns the
// resulting role, or null when the user no longer exists.
async function applySubscription(env, userId, sub) {
  const user = await env.DB.prepare("SELECT id, role FROM users WHERE id = ?").bind(userId).first();
  if (!user) return null; // account was closed while Stripe was still talking
  const f = subscriptionFacts(sub);
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO subscriptions (user_id, stripe_customer_id, stripe_subscription_id, status, plan, current_period_end, cancel_at_period_end, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET stripe_customer_id = excluded.stripe_customer_id,
       stripe_subscription_id = excluded.stripe_subscription_id, status = excluded.status, plan = excluded.plan,
       current_period_end = excluded.current_period_end, cancel_at_period_end = excluded.cancel_at_period_end,
       updated_at = excluded.updated_at`
  )
    .bind(userId, typeof sub.customer === "string" ? sub.customer : sub.customer?.id || "", sub.id, f.status, f.plan, f.periodEndMs, f.cancelAtPeriodEnd ? 1 : 0, now)
    .run();

  if (user.role === "admin") return "admin";
  if (ENTITLED_STATUSES.includes(f.status)) {
    if (user.role !== "paid") {
      await env.DB.prepare("UPDATE users SET role = 'paid', upgraded_at = ? WHERE id = ?").bind(now, userId).run();
    }
    // Someone who signed up for Premium goes straight to checkout without the
    // email-confirmation step; a completed payment counts as that confirmation.
    await env.DB.prepare("UPDATE users SET email_verified_at = ? WHERE id = ? AND email IS NOT NULL AND email_verified_at IS NULL").bind(now, userId).run();
    return "paid";
  }
  // Subscription over (canceled / unpaid / expired): back to free. Data is kept, just locked.
  if (["canceled", "unpaid", "incomplete_expired", "paused"].includes(f.status) && user.role === "paid") {
    await env.DB.prepare("UPDATE users SET role = 'free' WHERE id = ?").bind(userId).run();
    return "free";
  }
  return user.role;
}

// One email when a Premium payment completes: what was bought, the next
// payment date, and links to Stripe's hosted invoice page and PDF.
async function sendPremiumWelcomeEmail(env, session) {
  const userId = session.client_reference_id;
  if (!userId) return;
  const user = await env.DB.prepare("SELECT id, username, email FROM users WHERE id = ?").bind(userId).first();
  if (!user || !user.email) return;
  let invoice = null;
  const invoiceId = typeof session.invoice === "string" ? session.invoice : session.invoice?.id;
  if (invoiceId) {
    const r = await stripe(env, "GET", `/invoices/${encodeURIComponent(invoiceId)}`);
    if (r.ok) invoice = r.data;
  }
  const row = await env.DB.prepare("SELECT plan, current_period_end FROM subscriptions WHERE user_id = ?").bind(user.id).first();
  const cents = Number.isFinite(invoice?.amount_paid) ? invoice.amount_paid : Number.isFinite(session.amount_total) ? session.amount_total : null;
  const currency = String(invoice?.currency || session.currency || "aud").toUpperCase();
  const amountText = cents === null ? "" : `${currency} ${(cents / 100).toFixed(2)}`;
  const nextDateText = row?.current_period_end ? new Date(row.current_period_end).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "";
  await sendEmail(env, {
    to: user.email,
    kind: "premium_welcome",
    ...templates.premiumWelcome({
      username: user.username,
      interval: row?.plan === "year" ? "year" : "month",
      amountText,
      nextDateText,
      invoiceUrl: invoice?.hosted_invoice_url || "",
      pdfUrl: invoice?.invoice_pdf || "",
      number: invoice?.number || "",
      appUrl: emailSettings(env).appUrl,
    }),
  });
}

async function syncSubscriptionById(env, subscriptionId, fallbackUserId) {
  const res = await stripe(env, "GET", `/subscriptions/${encodeURIComponent(subscriptionId)}`);
  if (!res.ok || !res.data?.id) throw new Error(`stripe_subscription_fetch_failed_${res.status}`);
  const sub = res.data;
  let userId = sub.metadata?.user_id || fallbackUserId || null;
  if (!userId) {
    const row = await env.DB.prepare("SELECT user_id FROM subscriptions WHERE stripe_subscription_id = ? OR stripe_customer_id = ?")
      .bind(sub.id, typeof sub.customer === "string" ? sub.customer : sub.customer?.id || "")
      .first();
    userId = row?.user_id || null;
  }
  if (!userId) return null;
  return applySubscription(env, userId, sub);
}

/* ---------- webhook ---------- */

async function handleWebhook(request, env) {
  if (!env.STRIPE_WEBHOOK_SECRET || !env.STRIPE_SECRET_KEY) return { status: 503, body: { error: "billing_not_configured" } };
  const raw = await request.text();
  const ok = await verifyWebhookSignature(raw, request.headers.get("stripe-signature"), env.STRIPE_WEBHOOK_SECRET, Math.floor(Date.now() / 1000));
  if (!ok) return { status: 400, body: { error: "bad_signature" } };

  let event;
  try {
    event = JSON.parse(raw);
  } catch (e) {
    return { status: 400, body: { error: "bad_request" } };
  }
  if (!event?.id || !event?.type) return { status: 400, body: { error: "bad_request" } };

  const seen = await env.DB.prepare("SELECT event_id FROM stripe_events WHERE event_id = ?").bind(event.id).first();
  if (seen) return { status: 200, body: { received: true, duplicate: true } };

  const obj = event.data?.object || {};
  try {
    if (event.type === "checkout.session.completed") {
      if (obj.mode === "subscription" && obj.subscription) {
        const role = await syncSubscriptionById(env, typeof obj.subscription === "string" ? obj.subscription : obj.subscription.id, obj.client_reference_id || null);
        // Thank-you email with the invoice. A mail problem must never make
        // Stripe retry the webhook, so it is fire-and-forget.
        if (role === "paid") await sendPremiumWelcomeEmail(env, obj).catch(() => {});
      }
    } else if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      await syncSubscriptionById(env, obj.id, null);
    }
    // Everything else (invoice.*, etc.) is acknowledged and ignored: the
    // subscription events above already carry every access change.
  } catch (e) {
    // Non-2xx makes Stripe retry later, which is what we want for a transient failure.
    return { status: 500, body: { error: "webhook_failed" } };
  }
  await env.DB.prepare("INSERT OR IGNORE INTO stripe_events (event_id, type, processed_at) VALUES (?, ?, ?)").bind(event.id, event.type, Date.now()).run();
  return { status: 200, body: { received: true } };
}

/* ---------- routes ---------- */

function publicSubscription(row) {
  if (!row) return null;
  return {
    status: row.status,
    plan: row.plan,
    currentPeriodEnd: row.current_period_end || null,
    cancelAtPeriodEnd: !!row.cancel_at_period_end,
  };
}

export async function handleBilling({ route, request, env, url, h }) {
  if (!route.startsWith("/billing/")) return null;
  const { json, getSessionUser, makeSessionToken, sessionCookie, SESSION_TTL_MS } = h;

  if (route === "/billing/webhook" && request.method === "POST") {
    const { status, body } = await handleWebhook(request, env);
    return json(body, status);
  }

  // Public: what the two plans cost, read live from Stripe so the price
  // lives in exactly one place (the Stripe dashboard) and the site never
  // shows a stale number. `configured: false` keeps the old "coming soon" UI.
  if (route === "/billing/prices" && request.method === "GET") {
    if (!billingConfigured(env)) return json({ configured: false });
    const [m, y] = await Promise.all([
      stripe(env, "GET", `/prices/${encodeURIComponent(env.STRIPE_PRICE_MONTHLY)}`),
      stripe(env, "GET", `/prices/${encodeURIComponent(env.STRIPE_PRICE_YEARLY)}`),
    ]);
    if (!m.ok || !y.ok) return json({ configured: true, prices: null });
    return json({
      configured: true,
      prices: {
        month: { amount: m.data.unit_amount, currency: m.data.currency },
        year: { amount: y.data.unit_amount, currency: y.data.currency },
      },
    });
  }

  const session = await getSessionUser(request, env);
  if (!session) return json({ error: "unauthorized" }, 401);
  const baseUrl = (env.APP_URL || url.origin).replace(/\/$/, "");

  if (route === "/billing/status" && request.method === "GET") {
    const row = await env.DB.prepare("SELECT * FROM subscriptions WHERE user_id = ?").bind(session.id).first();
    return json({
      configured: billingConfigured(env),
      role: session.role,
      subscription: publicSubscription(row),
      // premium without a Stripe subscription = granted by a voucher code / the admin
      managedByStripe: !!(row && row.stripe_subscription_id && ENTITLED_STATUSES.includes(row.status)),
    });
  }

  if (route === "/billing/checkout" && request.method === "POST") {
    if (!billingConfigured(env)) return json({ error: "billing_not_configured" }, 503);
    if (session.role !== "free") return json({ error: "not_eligible" }, 400);
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: "bad_request" }, 400);
    }
    const interval = body?.interval === "year" ? "year" : body?.interval === "month" ? "month" : null;
    if (!interval) return json({ error: "bad_request" }, 400);

    const user = await env.DB.prepare("SELECT id, email FROM users WHERE id = ?").bind(session.id).first();
    if (!user) return json({ error: "unauthorized" }, 401);

    let row = await env.DB.prepare("SELECT * FROM subscriptions WHERE user_id = ?").bind(session.id).first();
    let customerId = row?.stripe_customer_id || null;
    if (!customerId) {
      const created = await stripe(
        env,
        "POST",
        "/customers",
        { email: user.email || undefined, metadata: { user_id: user.id } },
        `customer-${user.id}`
      );
      if (!created.ok || !created.data?.id) return json({ error: "billing_unavailable" }, 502);
      customerId = created.data.id;
      await env.DB.prepare(
        "INSERT OR IGNORE INTO subscriptions (user_id, stripe_customer_id, status, updated_at) VALUES (?, ?, 'incomplete', ?)"
      )
        .bind(user.id, customerId, Date.now())
        .run();
    }

    const checkout = await stripe(env, "POST", "/checkout/sessions", {
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: interval === "year" ? env.STRIPE_PRICE_YEARLY : env.STRIPE_PRICE_MONTHLY, quantity: 1 }],
      subscription_data: { metadata: { user_id: user.id } },
      allow_promotion_codes: true,
      success_url: `${baseUrl}/?checkout=success`,
      cancel_url: `${baseUrl}/?checkout=cancel`,
    });
    if (!checkout.ok || !checkout.data?.url) return json({ error: "billing_unavailable" }, 502);
    return json({ url: checkout.data.url });
  }

  // Card changes, invoices and receipts live in Stripe's hosted portal.
  if (route === "/billing/portal" && request.method === "POST") {
    if (!billingConfigured(env)) return json({ error: "billing_not_configured" }, 503);
    const row = await env.DB.prepare("SELECT stripe_customer_id FROM subscriptions WHERE user_id = ?").bind(session.id).first();
    if (!row?.stripe_customer_id) return json({ error: "no_subscription" }, 400);
    const portal = await stripe(env, "POST", "/billing_portal/sessions", { customer: row.stripe_customer_id, return_url: `${baseUrl}/` });
    if (!portal.ok || !portal.data?.url) return json({ error: "billing_unavailable" }, 502);
    return json({ url: portal.data.url });
  }

  // Premium -> free. A Stripe subscription ends at the close of the paid
  // period (premium stays until then, no more charges). Premium that never
  // went through Stripe (voucher code / set by the admin) has no period to
  // wait for, so it drops to free right away.
  if (route === "/billing/cancel" && request.method === "POST") {
    if (session.role !== "paid") return json({ error: "not_eligible" }, 400);
    const row = await env.DB.prepare("SELECT * FROM subscriptions WHERE user_id = ?").bind(session.id).first();
    const stripeManaged = !!(row && row.stripe_subscription_id && ENTITLED_STATUSES.includes(row.status));

    if (stripeManaged) {
      if (!billingConfigured(env)) return json({ error: "billing_not_configured" }, 503);
      const res = await stripe(env, "POST", `/subscriptions/${encodeURIComponent(row.stripe_subscription_id)}`, { cancel_at_period_end: true });
      if (!res.ok || !res.data?.id) return json({ error: "billing_unavailable" }, 502);
      await applySubscription(env, session.id, res.data);
      const fresh = await env.DB.prepare("SELECT * FROM subscriptions WHERE user_id = ?").bind(session.id).first();
      return json({ ok: true, endsAt: fresh?.current_period_end || null, subscription: publicSubscription(fresh) });
    }

    await env.DB.prepare("UPDATE users SET role = 'free' WHERE id = ?").bind(session.id).run();
    const token = await makeSessionToken(env, session.id, "free");
    return json({ ok: true, downgraded: true }, 200, { "set-cookie": sessionCookie(token, SESSION_TTL_MS / 1000) });
  }

  // Changed their mind before the period ended: keep renewing.
  if (route === "/billing/resume" && request.method === "POST") {
    if (!billingConfigured(env)) return json({ error: "billing_not_configured" }, 503);
    const row = await env.DB.prepare("SELECT * FROM subscriptions WHERE user_id = ?").bind(session.id).first();
    if (!row?.stripe_subscription_id || !row.cancel_at_period_end || !ENTITLED_STATUSES.includes(row.status)) {
      return json({ error: "not_eligible" }, 400);
    }
    const res = await stripe(env, "POST", `/subscriptions/${encodeURIComponent(row.stripe_subscription_id)}`, { cancel_at_period_end: false });
    if (!res.ok || !res.data?.id) return json({ error: "billing_unavailable" }, 502);
    await applySubscription(env, session.id, res.data);
    const fresh = await env.DB.prepare("SELECT * FROM subscriptions WHERE user_id = ?").bind(session.id).first();
    return json({ ok: true, subscription: publicSubscription(fresh) });
  }

  return json({ error: "not_found" }, 404);
}

// Called while closing an account. Deleting the Stripe customer cancels any
// live subscription at once and removes the saved card, so a closed account
// can never be charged again. Returns false (and the account must NOT be
// deleted) when Stripe couldn't be reached — better to ask the user to try
// again than to leave an orphaned subscription billing a deleted account.
export async function closeBillingForUser(env, userId) {
  const row = await env.DB.prepare("SELECT stripe_customer_id FROM subscriptions WHERE user_id = ?").bind(userId).first();
  if (!row?.stripe_customer_id) return true;
  if (!env.STRIPE_SECRET_KEY) return false;
  const res = await stripe(env, "DELETE", `/customers/${encodeURIComponent(row.stripe_customer_id)}`);
  // 404 = already gone (e.g. deleted in the Stripe dashboard): nothing left to bill.
  return res.ok || res.status === 404;
}

export const _test = { verifyWebhookSignature, formEncode, hmacHex };
