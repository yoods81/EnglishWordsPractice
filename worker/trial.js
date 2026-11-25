// 1-month free Premium trial — no card needed (promotion 2026-11-27 ~ 2027-01-31, decided 2026-11-25).
//
// How it works
//  - Who: any signed-in free account that has never had Premium (users.upgraded_at empty, no Stripe
//    subscription, no earlier trial). One trial per account, and only after the email is confirmed.
//  - Start: the server creates a Stripe subscription for the monthly price with trial_period_days and NO
//    payment method; Stripe reports it as "trialing", which billing.js already counts as Premium.
//  - End: trial_settings.end_behavior.missing_payment_method = "cancel": without a card Stripe ends the
//    subscription at the end of the trial and the webhook moves the account back to free (data kept, locked).
//    With a card added (Stripe portal, POST /billing/trial/card) it simply continues at the monthly price.
//    Nothing is ever charged without the parent adding a card.
//  - Promotion window, on/off and length live in site_settings "promo_trial" (admin System tab),
//    so they change without a code change. Dates are Australian (Sydney) calendar days.
//
// Routes (all under /api)
//  GET  /billing/trial         public: { promo: { active, days, end }, me: { eligible, reason, wanted, trial } }
//  POST /billing/trial/want    signed in: "start my free month when my email is confirmed"
//  POST /billing/trial/start   signed in + email confirmed: start now
//  POST /billing/trial/card    signed in, in a trial: Stripe portal page to add a card -> { url }
//  GET  /admin/promo           admin: settings + change log
//  PUT  /admin/promo           admin: { on, start, end, days }
import { stripe, billingConfigured, applySubscription } from "./billing.js";

const PROMO_KEY = "promo_trial";
export const DEFAULT_PROMO = { on: true, start: "2026-11-27", end: "2027-01-31", days: 30 };
const DAY = 86400000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Sydney is UTC+11 in summer (the whole promotion) — good enough for a start/end day.
const dayStart = (d) => Date.parse(`${d}T00:00:00+11:00`);
const dayEnd = (d) => Date.parse(`${d}T23:59:59+11:00`);

export function checkPromo(raw) {
  const p = raw && typeof raw === "object" ? raw : {};
  const out = {
    on: p.on === undefined ? DEFAULT_PROMO.on : !!p.on,
    start: DATE_RE.test(String(p.start)) ? String(p.start) : DEFAULT_PROMO.start,
    end: DATE_RE.test(String(p.end)) ? String(p.end) : DEFAULT_PROMO.end,
    days: Number.isInteger(Number(p.days)) ? Number(p.days) : DEFAULT_PROMO.days,
  };
  const errors = [];
  if (raw && raw.start !== undefined && !DATE_RE.test(String(raw.start))) errors.push("start");
  if (raw && raw.end !== undefined && !DATE_RE.test(String(raw.end))) errors.push("end");
  if (out.days < 7 || out.days > 60) errors.push("days"); // Stripe allows more; keep it sane
  if (dayStart(out.start) > dayEnd(out.end)) errors.push("end");
  return { promo: out, errors };
}

export async function readPromo(env) {
  try {
    const row = await env.DB.prepare("SELECT value FROM site_settings WHERE key = ?").bind(PROMO_KEY).first();
    if (!row) return { ...DEFAULT_PROMO, log: [] };
    const v = JSON.parse(row.value);
    return { ...checkPromo(v).promo, log: Array.isArray(v.log) ? v.log : [] };
  } catch (e) {
    return { ...DEFAULT_PROMO, log: [] };
  }
}

export function promoActive(p, now = Date.now()) {
  return !!p.on && now >= dayStart(p.start) && now <= dayEnd(p.end);
}

// Why an account can or can't start a trial ("" = it can).
async function trialFacts(env, userId) {
  const user = await env.DB.prepare("SELECT id, role, email, email_verified_at, upgraded_at FROM users WHERE id = ?").bind(userId).first();
  const trial = await env.DB.prepare("SELECT * FROM trials WHERE user_id = ?").bind(userId).first();
  const sub = await env.DB.prepare("SELECT stripe_subscription_id FROM subscriptions WHERE user_id = ?").bind(userId).first();
  let reason = "";
  if (!user) reason = "unauthorized";
  else if (trial && trial.started_at) reason = "used";
  else if (user.role !== "free" || user.upgraded_at || (sub && sub.stripe_subscription_id)) reason = "had_premium";
  else if (!user.email) reason = "no_email";
  return { user, trial, reason };
}

const publicTrial = (t) => (t && t.started_at ? { startedAt: t.started_at, endsAt: t.ends_at } : null);

// Starts the trial if everything allows it. Returns { ok, error?, role? }.
export async function startTrial(env, userId) {
  if (!billingConfigured(env)) return { ok: false, error: "billing_not_configured" };
  const promo = await readPromo(env);
  if (!promoActive(promo)) return { ok: false, error: "promo_over" };
  const { user, reason } = await trialFacts(env, userId);
  if (reason) return { ok: false, error: reason };
  if (!user.email_verified_at) return { ok: false, error: "email_not_verified" };

  let row = await env.DB.prepare("SELECT stripe_customer_id FROM subscriptions WHERE user_id = ?").bind(userId).first();
  let customerId = row && row.stripe_customer_id;
  if (!customerId) {
    const c = await stripe(env, "POST", "/customers", { email: user.email, metadata: { user_id: userId } }, `customer-${userId}`);
    if (!c.ok || !c.data?.id) return { ok: false, error: "billing_unavailable" };
    customerId = c.data.id;
    await env.DB.prepare("INSERT OR IGNORE INTO subscriptions (user_id, stripe_customer_id, status, updated_at) VALUES (?, ?, 'incomplete', ?)").bind(userId, customerId, Date.now()).run();
  }
  const s = await stripe(env, "POST", "/subscriptions", {
    customer: customerId,
    items: [{ price: env.STRIPE_PRICE_MONTHLY, quantity: 1 }],
    trial_period_days: promo.days,
    trial_settings: { end_behavior: { missing_payment_method: "cancel" } },
    payment_settings: { save_default_payment_method: "on_subscription" },
    metadata: { user_id: userId, promo: "trial" },
  }, `trial-${userId}`);
  if (!s.ok || !s.data?.id) {
    console.error("trial subscription failed:", s.status, s.data?.error?.message || "");
    return { ok: false, error: "billing_unavailable" };
  }
  const now = Date.now();
  const endsAt = s.data.trial_end ? Number(s.data.trial_end) * 1000 : now + promo.days * DAY;
  await env.DB.prepare(
    `INSERT INTO trials (user_id, wanted_at, started_at, ends_at, stripe_subscription_id) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET started_at = excluded.started_at, ends_at = excluded.ends_at, stripe_subscription_id = excluded.stripe_subscription_id`
  ).bind(userId, now, now, endsAt, s.data.id).run();
  // The weekly parent report is on by default during the trial (a parent who had switched it off keeps that choice).
  await env.DB.prepare("INSERT OR IGNORE INTO weekly_report_prefs (user_id, enabled, tz_offset, lang, updated_at) VALUES (?, 1, 660, 'en', ?)").bind(userId, now).run();
  const role = await applySubscription(env, userId, s.data);
  return { ok: true, role, endsAt };
}

// Called when an email is confirmed: starts the trial asked for at sign-up. Never throws.
export async function startWantedTrial(env, userId) {
  try {
    const t = await env.DB.prepare("SELECT wanted_at, started_at FROM trials WHERE user_id = ?").bind(userId).first();
    if (!t || !t.wanted_at || t.started_at) return { ok: false };
    return await startTrial(env, userId);
  } catch (e) {
    return { ok: false };
  }
}

export async function handleTrial(route, request, env, url, { json, getSessionUser }) {
  if (route === "/billing/trial" && request.method === "GET") {
    const promo = await readPromo(env);
    const active = promoActive(promo) && billingConfigured(env);
    const out = { promo: { active, days: promo.days, end: promo.end } };
    const s = await getSessionUser(request, env);
    if (s) {
      const { user, trial, reason } = await trialFacts(env, s.id);
      out.me = {
        eligible: active && !reason,
        reason: reason || (active ? "" : "promo_over"),
        emailVerified: !!(user && user.email_verified_at),
        wanted: !!(trial && trial.wanted_at && !trial.started_at),
        trial: publicTrial(trial),
      };
    }
    return json(out);
  }

  const session = await getSessionUser(request, env);
  if (!session) return json({ error: "unauthorized" }, 401);

  if (route === "/billing/trial/want" && request.method === "POST") {
    const promo = await readPromo(env);
    if (!promoActive(promo)) return json({ error: "promo_over" }, 400);
    const { reason } = await trialFacts(env, session.id);
    if (reason) return json({ error: reason }, 400);
    await env.DB.prepare("INSERT INTO trials (user_id, wanted_at) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET wanted_at = excluded.wanted_at WHERE trials.started_at IS NULL").bind(session.id, Date.now()).run();
    // Already confirmed (e.g. an older account): start straight away.
    const r = await startWantedTrial(env, session.id);
    return json({ ok: true, started: !!r.ok });
  }

  if (route === "/billing/trial/start" && request.method === "POST") {
    const r = await startTrial(env, session.id);
    if (!r.ok) return json({ error: r.error }, r.error === "billing_unavailable" ? 502 : 400);
    return json({ ok: true, role: r.role, endsAt: r.endsAt });
  }

  if (route === "/billing/trial/card" && request.method === "POST") {
    const row = await env.DB.prepare("SELECT stripe_customer_id FROM subscriptions WHERE user_id = ?").bind(session.id).first();
    if (!row || !row.stripe_customer_id) return json({ error: "no_subscription" }, 400);
    let body = null;
    try { body = await request.json(); } catch (e) { /* no body */ }
    const baseUrl = (env.APP_URL || url.origin).replace(/\/$/, "");
    const p = await stripe(env, "POST", "/billing_portal/sessions", {
      customer: row.stripe_customer_id,
      return_url: `${baseUrl}/?trial=card`,
      locale: body?.lang === "ko" ? "ko" : "en",
      flow_data: { type: "payment_method_update" },
    });
    if (!p.ok || !p.data?.url) {
      console.error("trial card portal failed:", p.status, p.data?.error?.message || "");
      return json({ error: "billing_unavailable" }, 502);
    }
    return json({ url: p.data.url });
  }

  if (route === "/admin/promo") {
    if (session.role !== "admin") return json({ error: "unauthorized" }, 401);
    if (request.method === "GET") return json({ promo: await readPromo(env), defaults: DEFAULT_PROMO });
    if (request.method === "PUT") {
      let body;
      try { body = await request.json(); } catch (e) { return json({ error: "bad_request" }, 400); }
      const { promo, errors } = checkPromo(body);
      if (errors.length) return json({ error: "invalid", fields: errors }, 400);
      const before = await readPromo(env);
      const { log, ...prev } = before;
      const nextLog = [{ at: Date.now(), by: session.id, before: prev, after: promo }].concat(log).slice(0, 20);
      await env.DB.prepare("INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at")
        .bind(PROMO_KEY, JSON.stringify({ ...promo, log: nextLog }), Date.now()).run();
      return json({ promo: { ...promo, log: nextLog } });
    }
  }
  return null;
}

// Daily job (cron): first-week report and the two "trial ends soon" emails.
// deps: { sendEmail, templates, reportFor(userId, lang) -> report }
export async function runTrialJobs(env, deps, now = Date.now()) {
  let rows = [];
  try {
    rows = (await env.DB.prepare(
      `SELECT t.*, u.email, u.username, u.role, p.lang AS lang
       FROM trials t JOIN users u ON u.id = t.user_id LEFT JOIN weekly_report_prefs p ON p.user_id = t.user_id
       WHERE t.started_at IS NOT NULL AND t.ends_at > ?`
    ).bind(now - DAY).all()).results || [];
  } catch (e) {
    return { sent: 0 };
  }
  let sent = 0;
  let priceText = "";
  try {
    const pr = await stripe(env, "GET", `/prices/${encodeURIComponent(env.STRIPE_PRICE_MONTHLY)}`);
    if (pr.ok && pr.data?.unit_amount) priceText = (String(pr.data.currency).toLowerCase() === "aud" ? "AU$" : String(pr.data.currency).toUpperCase() + " ") + (pr.data.unit_amount / 100).toFixed(2);
  } catch (e) { /* the template has a default */ }
  const appUrl = (env.APP_URL || "https://koalastudymate.com").replace(/\/$/, "");
  for (const t of rows) {
    if (!t.email || t.role !== "paid") continue; // trial already over (or account changed)
    const lang = t.lang === "ko" ? "ko" : "en";
    const left = t.ends_at - now;
    try {
      // 1) The first-week report (day 7+), once.
      if (!t.report_sent_at && now >= t.started_at + 7 * DAY && left > DAY) {
        const report = await deps.reportFor(t.user_id, lang);
        const r = await deps.sendEmail(env, { to: t.email, kind: "trial_report", ...deps.templates.weeklyReport(report, t.username) });
        if (r.ok) {
          await env.DB.prepare("UPDATE trials SET report_sent_at = ? WHERE user_id = ?").bind(now, t.user_id).run();
          await env.DB.prepare("UPDATE weekly_report_prefs SET last_sent_at = ? WHERE user_id = ?").bind(now, t.user_id).run();
          sent++;
        }
      }
      // 2) 3 days before and 3) the last day — only while the trial is still on.
      const which = !t.remind_last_at && left <= DAY && left > 0 ? "last" : !t.remind3_at && left <= 3 * DAY && left > DAY ? "3" : null;
      if (!which) continue;
      let hasCard = false, status = "trialing";
      if (t.stripe_subscription_id) {
        const s = await stripe(env, "GET", `/subscriptions/${encodeURIComponent(t.stripe_subscription_id)}`);
        if (s.ok) {
          status = s.data.status;
          hasCard = !!s.data.default_payment_method;
          if (!hasCard && s.data.customer) {
            const c = await stripe(env, "GET", `/customers/${encodeURIComponent(typeof s.data.customer === "string" ? s.data.customer : s.data.customer.id)}`);
            hasCard = !!(c.ok && c.data?.invoice_settings?.default_payment_method);
          }
        }
      }
      if (status !== "trialing") continue;
      const report = await deps.reportFor(t.user_id, lang);
      const mail = deps.templates.trialEnding({ username: t.username, lang, last: which === "last", hasCard, endsAt: t.ends_at, report, appUrl, priceText });
      const r = await deps.sendEmail(env, { to: t.email, kind: which === "last" ? "trial_last" : "trial_3days", ...mail });
      if (r.ok) {
        await env.DB.prepare(`UPDATE trials SET ${which === "last" ? "remind_last_at" : "remind3_at"} = ? WHERE user_id = ?`).bind(now, t.user_id).run();
        sent++;
      }
    } catch (e) {
      /* one account's problem must not stop the others */
    }
  }
  return { sent };
}
