// Worker route test for the 1-month free trial without a card (worker/trial.js): who can start it,
// that it needs a confirmed email, makes a card-less Stripe trial, ends back on free, and the daily emails.
// Same harness as worker-billing.test.mjs (node:sqlite as D1, a fake Stripe API).
// Run: node --experimental-sqlite --test tests/worker-trial.test.mjs  (Node 22+)
import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import crypto from "node:crypto";
import fs from "node:fs";
import worker from "../worker/index.js";

const db = new DatabaseSync(":memory:");
db.exec(fs.readFileSync(new URL("../schema.sql", import.meta.url), "utf8"));
const wrap = (sql) => {
  let args = [];
  const st = {
    bind: (...a) => { args = a; return st; },
    first: async () => db.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...args) }),
    run: async () => { const r = db.prepare(sql).run(...args); return { meta: { changes: r.changes } }; },
    _exec: () => db.prepare(sql).run(...args),
  };
  return st;
};
const WHSEC = "whsec_test";
const env = {
  SESSION_SECRET: "secret",
  STRIPE_SECRET_KEY: "sk_test_x",
  STRIPE_WEBHOOK_SECRET: WHSEC,
  STRIPE_PRICE_MONTHLY: "price_month",
  STRIPE_PRICE_YEARLY: "price_year",
  APP_URL: "https://koala.test",
  DB: { prepare: wrap, batch: async (sts) => { sts.forEach((s) => s._exec()); return []; } },
};

/* ---------- fake Stripe ---------- */
const stripeCalls = [];
const fake = { customers: {}, subs: {}, failDeleteCustomer: false, seq: 0 };
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  const u = new URL(url);
  if (u.hostname !== "api.stripe.com") return realFetch(url, init);
  const path = u.pathname.replace("/v1", "");
  const method = init.method || "GET";
  const params = Object.fromEntries(new URLSearchParams(init.body || u.search));
  stripeCalls.push({ method, path, params, headers: init.headers });
  const reply = (status, body) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  const price = path.match(/^\/prices\/(.+)$/);
  if (price && method === "GET") return reply(200, { id: price[1], unit_amount: price[1] === "price_year" ? 5900 : 599, currency: "aud" });
  if (method === "POST" && path === "/customers") {
    const id = `cus_${++fake.seq}`;
    fake.customers[id] = { id, email: params.email };
    return reply(200, fake.customers[id]);
  }
  if (method === "POST" && path === "/checkout/sessions" && params.ui_mode === "embedded_page" && globalThis.__rejectEmbedded) return reply(400, { error: { message: "embedded not allowed" } });
  if (method === "POST" && path === "/checkout/sessions") return reply(200, params.ui_mode === "embedded_page" ? { id: "cs_e", client_secret: "cs_e_secret" } : { id: "cs_1", url: `https://checkout.stripe.test/${params.customer}` });
  if (method === "POST" && path === "/billing_portal/sessions") return reply(200, { url: "https://portal.stripe.test/x" });
  if (method === "POST" && path === "/subscriptions") {
    const id = `sub_t${++fake.seq}`;
    fake.subs[id] = { id, customer: params.customer, status: "trialing", trial_end: Math.floor(Date.now() / 1000) + Number(params.trial_period_days) * 86400,
      metadata: { user_id: params["metadata[user_id]"] }, default_payment_method: null, _params: params,
      items: { data: [{ price: { recurring: { interval: "month" } }, current_period_end: Math.floor(Date.now() / 1000) + Number(params.trial_period_days) * 86400 }] } };
    return reply(200, fake.subs[id]);
  }
  const cusGet = path.match(/^\/customers\/(.+)$/);
  if (cusGet && method === "GET") return reply(200, { id: cusGet[1], invoice_settings: { default_payment_method: fake.cards?.[cusGet[1]] || null } });
  const sub = path.match(/^\/subscriptions\/(.+)$/);
  if (sub) {
    const s = fake.subs[sub[1]];
    if (!s) return reply(404, { error: { message: "no such subscription" } });
    if (method === "POST" && "cancel_at_period_end" in params) s.cancel_at_period_end = params.cancel_at_period_end === "true";
    return reply(200, s);
  }
  const inv = path.match(/^\/invoices\/(.+)$/);
  if (inv && method === "GET") return reply(200, { id: inv[1], number: "KSM-0001", amount_paid: 599, currency: "aud", hosted_invoice_url: "https://invoice.stripe.test/i/" + inv[1], invoice_pdf: "https://invoice.stripe.test/pdf/" + inv[1] });
  const cus = path.match(/^\/customers\/(.+)$/);
  if (cus && method === "DELETE") {
    if (fake.failDeleteCustomer) return reply(500, { error: { message: "boom" } });
    delete fake.customers[cus[1]];
    for (const s of Object.values(fake.subs)) if (s.customer === cus[1]) s.status = "canceled";
    return reply(200, { id: cus[1], deleted: true });
  }
  return reply(404, { error: { message: "unhandled " + method + " " + path } });
};
const PERIOD_END = Math.floor(Date.now() / 1000) + 30 * 86400;
const makeSub = (id, customer, userId, over = {}) =>
  (fake.subs[id] = {
    id, customer, status: "active", cancel_at_period_end: false, metadata: { user_id: userId },
    items: { data: [{ price: { recurring: { interval: "month" } }, current_period_end: PERIOD_END }] }, ...over,
  });

/* ---------- helpers ---------- */
async function cookieFor(id, role) {
  const exp = Date.now() + 1e6;
  const payload = `${id}.${role}.${exp}`;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode("secret"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = Buffer.from(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload))).toString("hex");
  return `${payload}.${sig}`;
}
const src = fs.readFileSync(new URL("../worker/index.js", import.meta.url), "utf8");
const cookieName = src.match(/SESSION_COOKIE = "([^"]+)"/)[1];
let ip = 0;
async function call(who, method, path, body, extraHeaders = {}) {
  const headers = { "content-type": "application/json", "cf-connecting-ip": `10.1.0.${++ip}`, ...extraHeaders };
  // NOTE: the cookie deliberately carries a *stale* role in some tests — the server must read the real one from the DB.
  if (who) headers.cookie = `${cookieName}=${encodeURIComponent(await cookieFor(who.id, who.cookieRole || who.role))}`;
  const res = await worker.fetch(new Request("https://x.test/api" + path, { method, headers, body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body) }), env);
  let data = null;
  try { data = await res.clone().json(); } catch (e) { /* none */ }
  return { status: res.status, data, res };
}
async function webhook(event, { secret = WHSEC, ts = Math.floor(Date.now() / 1000), badSig = false } = {}) {
  const raw = JSON.stringify(event);
  const sig = crypto.createHmac("sha256", secret).update(`${ts}.${raw}`).digest("hex");
  return call(null, "POST", "/billing/webhook", raw, { "stripe-signature": `t=${ts},v1=${badSig ? "0".repeat(64) : sig}` });
}
const pw = "Passw0rd!";
function addUser(id, name, role, { email = `${id}@example.com`, password = pw } = {}) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256").toString("hex");
  db.prepare("INSERT INTO users (id,username,password_hash,password_salt,role,created_at,email,email_verified_at) VALUES (?,?,?,?,?,?,?,?)")
    .run(id, email, hash, salt.toString("hex"), role, 1, email, 5);
  return { id, role };
}
const roleOf = (id) => db.prepare("SELECT role FROM users WHERE id = ?").get(id)?.role;

const DAY = 86400000;
const admin = addUser("a1", "boss", "admin");
const fresh = addUser("t1", "fresh", "free");
const other = addUser("t2", "other", "free");
const hadPremium = addUser("t3", "had", "free");
db.prepare("UPDATE users SET upgraded_at = 123 WHERE id = 't3'").run();
const unverified = addUser("t4", "unverified", "free");
db.prepare("UPDATE users SET email_verified_at = NULL WHERE id = 't4'").run();
const paid = addUser("t5", "paid", "paid");
const trialRow = (id) => db.prepare("SELECT * FROM trials WHERE user_id = ?").get(id);
const setPromo = (p) => db.prepare("INSERT INTO site_settings (key,value,updated_at) VALUES ('promo_trial',?,1) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(JSON.stringify(p));
// The real promotion starts 2026-11-27; tests run with a window around "now".
const today = new Date(Date.now() + 11 * 3600e3).toISOString().slice(0, 10);
setPromo({ on: true, start: "2020-01-01", end: "2099-12-31", days: 30 });

test("public status says the offer is on; eligibility per account", async () => {
  const g = await call(null, "GET", "/billing/trial");
  assert.equal(g.data.promo.active, true);
  assert.equal(g.data.promo.days, 30);
  assert.equal(g.data.me, undefined);
  assert.equal((await call(fresh, "GET", "/billing/trial")).data.me.eligible, true);
  assert.equal((await call(hadPremium, "GET", "/billing/trial")).data.me.reason, "had_premium");
  assert.equal((await call(paid, "GET", "/billing/trial")).data.me.eligible, false);
  assert.equal((await call(admin, "GET", "/billing/trial")).data.me.eligible, false);
});

test("start: needs a confirmed email; makes a card-less 30-day Stripe trial and turns Premium on", async () => {
  assert.equal((await call(unverified, "POST", "/billing/trial/start")).data.error, "email_not_verified");
  assert.equal((await call(hadPremium, "POST", "/billing/trial/start")).data.error, "had_premium");
  const r = await call(fresh, "POST", "/billing/trial/start");
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.equal(roleOf("t1"), "paid");
  const call0 = stripeCalls.filter((c) => c.path === "/subscriptions").pop();
  assert.equal(call0.params.trial_period_days, "30");
  assert.equal(call0.params["trial_settings[end_behavior][missing_payment_method]"], "cancel");
  assert.equal(call0.params["items[0][price]"], "price_month");
  assert.ok(!Object.keys(call0.params).some((k) => /payment_method$|default_source/.test(k) && !/save_default/.test(k)), "no card is sent");
  const t = trialRow("t1");
  assert.ok(t.started_at && t.ends_at - t.started_at > 29 * DAY);
  // weekly report switched on for the trial
  assert.equal(db.prepare("SELECT enabled FROM weekly_report_prefs WHERE user_id='t1'").get().enabled, 1);
  // one trial per account
  db.prepare("UPDATE users SET role='free' WHERE id='t1'").run();
  assert.equal((await call(fresh, "POST", "/billing/trial/start")).data.error, "used");
  db.prepare("UPDATE users SET role='paid' WHERE id='t1'").run();
});

test("asked at sign-up -> starts when the email link is confirmed", async () => {
  const w = await call(unverified, "POST", "/billing/trial/want");
  assert.equal(w.status, 200);
  assert.equal(w.data.started, false);
  assert.equal((await call(unverified, "GET", "/billing/trial")).data.me.wanted, true);
  const token = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHmac("sha256", "secret").update(token).digest("hex");
  db.prepare("INSERT INTO email_tokens (token_hash,user_id,kind,created_at,expires_at) VALUES (?,?,?,?,?)").run(hash, "t4", "verify", Date.now(), Date.now() + DAY);
  const v = await call(null, "POST", "/auth/verify-email", { token });
  assert.equal(v.status, 200, JSON.stringify(v.data));
  assert.equal(v.data.trialStarted, true);
  assert.equal(roleOf("t4"), "paid");
});

test("trial ends without a card: Stripe cancels -> webhook moves the account back to free", async () => {
  const subId = trialRow("t1").stripe_subscription_id;
  fake.subs[subId].status = "canceled";
  const w = await webhook({ id: "evt_trial_end", type: "customer.subscription.deleted", data: { object: { id: subId } } });
  assert.equal(w.status, 200);
  assert.equal(roleOf("t1"), "free");
});

test("add a card: Stripe portal opens on the payment-method page", async () => {
  const r = await call(other, "POST", "/billing/trial/start");
  assert.equal(r.status, 200);
  const c = await call(other, "POST", "/billing/trial/card", { lang: "ko" });
  assert.equal(c.status, 200);
  const p = stripeCalls.filter((x) => x.path === "/billing_portal/sessions").pop();
  assert.equal(p.params["flow_data[type]"], "payment_method_update");
  assert.equal(p.params.locale, "ko");
});

test("daily job: week-1 report once, then 3-days-left and last-day emails (card-aware)", async () => {
  const { runTrialJobs } = await import("../worker/trial.js");
  const { templates } = await import("../worker/email.js");
  const mails = [];
  const deps = { templates, sendEmail: async (e, m) => { if (m.to === "t2@example.com") mails.push(m); return { ok: true }; }, reportFor: async () => ({ range: "x", days: 7, activeDays: 3, answers: 40, pct: 80, streak: 2, known: 5, modes: [], tricky: ["because"], lang: "en" }) };
  const t = trialRow("t2");
  await runTrialJobs(env, deps, t.started_at + 8 * DAY);
  assert.deepEqual(mails.map((m) => m.kind), ["trial_report"]);
  await runTrialJobs(env, deps, t.started_at + 8 * DAY + 3600e3);
  assert.equal(mails.length, 1, "report only once");
  await runTrialJobs(env, deps, t.ends_at - 2.5 * DAY);
  assert.equal(mails[1].kind, "trial_3days");
  assert.match(mails[1].text, /add a card/);
  // card added before the last day -> the last mail says Premium continues
  fake.cards = { [fake.subs[t.stripe_subscription_id].customer]: "pm_1" };
  await runTrialJobs(env, deps, t.ends_at - 0.5 * DAY);
  assert.equal(mails[2].kind, "trial_last");
  assert.match(mails[2].text, /continues/);
  await runTrialJobs(env, deps, t.ends_at - 0.2 * DAY);
  assert.equal(mails.length, 3, "each reminder once");
});

test("promotion window and admin settings (with a change log)", async () => {
  setPromo({ on: true, start: "2099-01-01", end: "2099-01-31", days: 30 });
  assert.equal((await call(null, "GET", "/billing/trial")).data.promo.active, false);
  addUser("t6", "late", "free");
  assert.equal((await call({ id: "t6", role: "free" }, "POST", "/billing/trial/start")).data.error, "promo_over");
  assert.equal((await call(fresh, "PUT", "/admin/promo", { on: false })).status, 401);
  const bad = await call(admin, "PUT", "/admin/promo", { on: true, start: "2026-11-27", end: "2026-11-01", days: 30 });
  assert.equal(bad.data.error, "invalid");
  const ok = await call(admin, "PUT", "/admin/promo", { on: true, start: "2026-11-27", end: "2027-01-31", days: 30 });
  assert.equal(ok.status, 200);
  assert.equal(ok.data.promo.log.length, 1);
  assert.equal(ok.data.promo.log[0].before.start, "2099-01-01");
  assert.equal((await call(admin, "GET", "/admin/promo")).data.promo.end, "2027-01-31");
});
