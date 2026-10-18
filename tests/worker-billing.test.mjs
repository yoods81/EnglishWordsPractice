// Worker route test for premium billing (Stripe checkout + webhooks), the
// premium -> free downgrade and self-service account closing, using node:sqlite
// as a tiny D1 stand-in and an in-memory fake of the Stripe API.
// Run: node --experimental-sqlite --test tests/worker-billing.test.mjs  (Node 22+)
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
  if (method === "POST" && path === "/checkout/sessions") return reply(200, { id: "cs_1", url: `https://checkout.stripe.test/${params.customer}` });
  if (method === "POST" && path === "/billing_portal/sessions") return reply(200, { url: "https://portal.stripe.test/x" });
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
const admin = addUser("a1", "boss", "admin");
const kid = addUser("u1", "kid", "free");
const kid2 = addUser("u2", "kid2", "free");
const kid3 = addUser("u3", "kid3", "free");
const codePaid = addUser("u4", "codepaid", "paid"); // premium via special code, no Stripe

test("prices are public, read from Stripe, and say when billing isn't set up yet", async () => {
  const p = await call(null, "GET", "/billing/prices");
  assert.deepEqual(p.data, { configured: true, prices: { month: { amount: 599, currency: "aud" }, year: { amount: 5900, currency: "aud" } } });
  const saved = env.STRIPE_SECRET_KEY;
  delete env.STRIPE_SECRET_KEY;
  assert.deepEqual((await call(null, "GET", "/billing/prices")).data, { configured: false });
  env.STRIPE_SECRET_KEY = saved;
});

test("checkout needs a signed-in free account and a valid interval", async () => {
  assert.equal((await call(null, "POST", "/billing/checkout", { interval: "month" })).status, 401);
  assert.equal((await call(kid, "POST", "/billing/checkout", { interval: "weekly" })).status, 400);
  assert.equal((await call(admin, "POST", "/billing/checkout", { interval: "month" })).data.error, "not_eligible");
  assert.equal((await call(codePaid, "POST", "/billing/checkout", { interval: "month" })).data.error, "not_eligible");
  const saved = env.STRIPE_PRICE_YEARLY;
  delete env.STRIPE_PRICE_YEARLY;
  assert.equal((await call(kid, "POST", "/billing/checkout", { interval: "month" })).data.error, "billing_not_configured");
  env.STRIPE_PRICE_YEARLY = saved;
});

test("checkout creates one Stripe customer per account and a subscription session with the right price", async () => {
  const a = await call(kid, "POST", "/billing/checkout", { interval: "year" });
  assert.equal(a.status, 200);
  assert.match(a.data.url, /^https:\/\/checkout\.stripe\.test\//);
  const b = await call(kid, "POST", "/billing/checkout", { interval: "month" });
  assert.equal(b.status, 200);
  assert.equal(Object.keys(fake.customers).length, 1, "second checkout reuses the customer");
  const sessions = stripeCalls.filter((c) => c.path === "/checkout/sessions");
  assert.equal(sessions[0].params["line_items[0][price]"], "price_year");
  assert.equal(sessions[1].params["line_items[0][price]"], "price_month");
  assert.equal(sessions[0].params.mode, "subscription");
  assert.equal(sessions[0].params.client_reference_id, "u1");
  assert.equal(sessions[0].params.success_url, "https://koala.test/?checkout=success");
  // paying alone does not make anyone premium — only the webhook does
  assert.equal(roleOf("u1"), "free");
});

test("webhook rejects a bad signature, a stale timestamp and a wrong secret", async () => {
  const ev = { id: "evt_bad", type: "customer.subscription.updated", data: { object: { id: "sub_1" } } };
  assert.equal((await webhook(ev, { badSig: true })).status, 400);
  assert.equal((await webhook(ev, { ts: Math.floor(Date.now() / 1000) - 3600 })).status, 400);
  assert.equal((await webhook(ev, { secret: "whsec_other" })).status, 400);
  assert.equal((await call(null, "POST", "/billing/webhook", "{}")).status, 400); // no signature header at all
  assert.equal(db.prepare("SELECT COUNT(*) c FROM stripe_events").get().c, 0);
});

test("a completed checkout promotes the account to premium, once, and replays are harmless", async () => {
  const cust = db.prepare("SELECT stripe_customer_id c FROM subscriptions WHERE user_id = 'u1'").get().c;
  makeSub("sub_1", cust, "u1");
  const ev = { id: "evt_1", type: "checkout.session.completed", data: { object: { mode: "subscription", subscription: "sub_1", client_reference_id: "u1", customer: cust } } };
  assert.equal((await webhook(ev)).status, 200);
  assert.equal(roleOf("u1"), "paid");
  const row = db.prepare("SELECT * FROM subscriptions WHERE user_id = 'u1'").get();
  assert.equal(row.status, "active");
  assert.equal(row.plan, "month");
  assert.equal(row.current_period_end, PERIOD_END * 1000);
  assert.ok(db.prepare("SELECT upgraded_at FROM users WHERE id='u1'").get().upgraded_at);
  const fetchesBefore = stripeCalls.length;
  const again = await webhook(ev);
  assert.equal(again.data.duplicate, true);
  assert.equal(stripeCalls.length, fetchesBefore, "a replayed event is not processed again");
  // the very next request already sees premium, even with the old 'free' cookie
  const st = await call({ ...kid, cookieRole: "free" }, "GET", "/billing/status");
  assert.equal(st.data.role, "paid");
  assert.equal(st.data.managedByStripe, true);
});

test("a premium member can cancel: premium stays until the period ends, then drops to free", async () => {
  const c = await call({ ...kid, role: "paid" }, "POST", "/billing/cancel");
  assert.equal(c.status, 200);
  assert.equal(c.data.endsAt, PERIOD_END * 1000);
  assert.equal(c.data.subscription.cancelAtPeriodEnd, true);
  assert.equal(roleOf("u1"), "paid", "still premium until the paid period is over");
  assert.equal(fake.subs.sub_1.cancel_at_period_end, true);

  // changed their mind
  const r = await call({ ...kid, role: "paid" }, "POST", "/billing/resume");
  assert.equal(r.data.subscription.cancelAtPeriodEnd, false);
  assert.equal(fake.subs.sub_1.cancel_at_period_end, false);
  assert.equal((await call({ ...kid, role: "paid" }, "POST", "/billing/resume")).status, 400, "nothing left to resume");

  // cancel again, then Stripe ends the subscription at period end
  await call({ ...kid, role: "paid" }, "POST", "/billing/cancel");
  fake.subs.sub_1.status = "canceled";
  assert.equal((await webhook({ id: "evt_2", type: "customer.subscription.deleted", data: { object: { id: "sub_1" } } })).status, 200);
  assert.equal(roleOf("u1"), "free");
  assert.equal(db.prepare("SELECT status FROM subscriptions WHERE user_id='u1'").get().status, "canceled");
});

test("downgrade keeps the member's premium data but locks it", async () => {
  const now = Date.now();
  db.prepare("INSERT INTO shared_words (id,word,example,owner_id,created_at,updated_at) VALUES ('w1','gleam','', 'u1', ?, ?)").run(now, now);
  db.prepare("INSERT INTO shared_words (id,word,example,owner_id,created_at,updated_at) VALUES ('w0','shared','', NULL, ?, ?)").run(now, now);
  assert.equal(roleOf("u1"), "free");
  assert.equal(db.prepare("SELECT COUNT(*) c FROM shared_words WHERE owner_id='u1'").get().c, 1, "private word is kept");
  const words = (await call({ ...kid, cookieRole: "paid" }, "GET", "/words")).data.words.map((w) => w.word);
  assert.deepEqual(words, ["shared"], "even with a stale 'paid' cookie, a downgraded account no longer sees its premium words");
  assert.equal((await call({ ...kid, cookieRole: "paid" }, "GET", "/profiles")).status, 401, "child profiles are premium-only");
});

test("re-subscribing restores premium and the kept data comes back", async () => {
  const cust = db.prepare("SELECT stripe_customer_id c FROM subscriptions WHERE user_id = 'u1'").get().c;
  makeSub("sub_2", cust, "u1");
  await webhook({ id: "evt_3", type: "customer.subscription.created", data: { object: { id: "sub_2" } } });
  assert.equal(roleOf("u1"), "paid");
  const words = (await call(kid, "GET", "/words")).data.words.map((w) => w.word).sort();
  assert.deepEqual(words, ["gleam", "shared"]);
});

test("out-of-order and non-entitled events: past_due keeps premium, unpaid drops it, admins are never demoted", async () => {
  const cust = db.prepare("SELECT stripe_customer_id c FROM subscriptions WHERE user_id = 'u1'").get().c;
  fake.subs.sub_2.status = "past_due";
  await webhook({ id: "evt_4", type: "customer.subscription.updated", data: { object: { id: "sub_2", status: "canceled" } } }); // stale payload lies
  assert.equal(roleOf("u1"), "paid", "the subscription is re-read from Stripe, not trusted from the event");
  fake.subs.sub_2.status = "unpaid";
  await webhook({ id: "evt_5", type: "customer.subscription.updated", data: { object: { id: "sub_2" } } });
  assert.equal(roleOf("u1"), "free");

  makeSub("sub_admin", "cus_admin", "a1", { status: "canceled" });
  await webhook({ id: "evt_6", type: "customer.subscription.deleted", data: { object: { id: "sub_admin" } } });
  assert.equal(roleOf("a1"), "admin");

  // an event for an account that no longer exists is acknowledged, not retried forever
  makeSub("sub_ghost", "cus_ghost", "nobody");
  assert.equal((await webhook({ id: "evt_7", type: "customer.subscription.created", data: { object: { id: "sub_ghost" } } })).status, 200);
});

test("a webhook for an unknown event type is acknowledged and recorded", async () => {
  assert.equal((await webhook({ id: "evt_8", type: "invoice.paid", data: { object: {} } })).status, 200);
  assert.ok(db.prepare("SELECT 1 FROM stripe_events WHERE event_id='evt_8'").get());
});

test("premium granted by a special code (no Stripe subscription) drops to free immediately and gets a fresh cookie", async () => {
  const r = await call(codePaid, "POST", "/billing/cancel");
  assert.equal(r.status, 200);
  assert.equal(r.data.downgraded, true);
  assert.equal(roleOf("u4"), "free");
  assert.match(r.res.headers.get("set-cookie") || "", new RegExp(cookieName));
  assert.equal((await call({ ...kid2 }, "POST", "/billing/cancel")).data.error, "not_eligible", "free accounts have nothing to cancel");
});

test("billing portal is only for accounts that have a Stripe customer", async () => {
  assert.equal((await call(kid2, "POST", "/billing/portal")).data.error, "no_subscription");
  const p = await call(kid, "POST", "/billing/portal");
  assert.equal(p.data.url, "https://portal.stripe.test/x");
});

/* ---------- closing an account ---------- */
test("closing an account needs the right password and is refused for the admin", async () => {
  assert.equal((await call(null, "POST", "/auth/delete-account", { password: pw })).status, 401);
  assert.equal((await call(kid3, "POST", "/auth/delete-account", {})).status, 400);
  assert.equal((await call(kid3, "POST", "/auth/delete-account", { password: "Wrong1234!" })).data.error, "wrong_current_password");
  assert.equal((await call(admin, "POST", "/auth/delete-account", { password: pw })).data.error, "cannot_delete_admin");
  assert.ok(db.prepare("SELECT 1 FROM users WHERE id='u3'").get());
});

test("closing a free account erases everything it owned and kills its cookie", async () => {
  const now = Date.now();
  db.prepare("INSERT INTO shared_words (id,word,example,owner_id,created_at,updated_at) VALUES ('w3','mine','', 'u3', ?, ?)").run(now, now);
  db.prepare("INSERT INTO user_koala (user_id,coins,updated_at) VALUES ('u3',5,?)").run(now);
  db.prepare("INSERT INTO user_progress (account_key,progress_json,updated_at) VALUES ('u3:profiles','{}',?)").run(now);
  db.prepare("INSERT INTO weekly_report_prefs (user_id,enabled,updated_at) VALUES ('u3',1,?)").run(now);
  const r = await call(kid3, "POST", "/auth/delete-account", { password: pw });
  assert.equal(r.status, 200);
  assert.match(r.res.headers.get("set-cookie") || "", /Max-Age=0/);
  for (const [t, col] of [["users", "id"], ["shared_words", "owner_id"], ["user_koala", "user_id"], ["weekly_report_prefs", "user_id"]]) {
    assert.equal(db.prepare(`SELECT COUNT(*) c FROM ${t} WHERE ${col}='u3'`).get().c, 0, t);
  }
  assert.equal(db.prepare("SELECT COUNT(*) c FROM user_progress WHERE account_key LIKE 'u3%'").get().c, 0);
  assert.equal((await call(kid3, "GET", "/auth/me")).data.user, null, "the old cookie no longer works");
  assert.equal(db.prepare("SELECT COUNT(*) c FROM shared_words WHERE owner_id IS NULL").get().c, 1, "admin-shared words are untouched");
  assert.equal(db.prepare("SELECT COUNT(*) c FROM shared_words WHERE owner_id = 'u1'").get().c, 1, "other members' words are untouched");
});

test("closing a subscribed account cancels billing first; if Stripe fails, nothing is deleted", async () => {
  const subscriber = addUser("u6", "payer", "free");
  await call(subscriber, "POST", "/billing/checkout", { interval: "month" });
  const cust = db.prepare("SELECT stripe_customer_id c FROM subscriptions WHERE user_id = 'u6'").get().c;
  makeSub("sub_6", cust, "u6");
  await webhook({ id: "evt_9", type: "customer.subscription.created", data: { object: { id: "sub_6" } } });
  assert.equal(roleOf("u6"), "paid");

  fake.failDeleteCustomer = true;
  const failed = await call({ ...subscriber, role: "paid" }, "POST", "/auth/delete-account", { password: pw });
  assert.equal(failed.status, 502);
  assert.equal(failed.data.error, "billing_cancel_failed");
  assert.ok(db.prepare("SELECT 1 FROM users WHERE id='u6'").get(), "account is kept so the user can retry");

  fake.failDeleteCustomer = false;
  const ok = await call({ ...subscriber, role: "paid" }, "POST", "/auth/delete-account", { password: pw });
  assert.equal(ok.status, 200);
  assert.equal(fake.subs.sub_6.status, "canceled", "the live subscription was cancelled");
  assert.equal(fake.customers[cust], undefined, "the Stripe customer (and saved card) was removed");
  assert.equal(db.prepare("SELECT COUNT(*) c FROM subscriptions WHERE user_id='u6'").get().c, 0);
  assert.equal(db.prepare("SELECT COUNT(*) c FROM users WHERE id='u6'").get().c, 0);
});

test("the admin delete tool also cancels billing before removing a subscriber", async () => {
  const subscriber = addUser("u7", "payer2", "free");
  await call(subscriber, "POST", "/billing/checkout", { interval: "year" });
  const cust = db.prepare("SELECT stripe_customer_id c FROM subscriptions WHERE user_id = 'u7'").get().c;
  fake.failDeleteCustomer = true;
  assert.equal((await call(admin, "POST", "/admin/users/delete", { userId: "u7" })).status, 502);
  assert.ok(db.prepare("SELECT 1 FROM users WHERE id='u7'").get());
  fake.failDeleteCustomer = false;
  assert.equal((await call(admin, "POST", "/admin/users/delete", { userId: "u7" })).status, 200);
  assert.equal(fake.customers[cust], undefined);
});

test("a new Premium sign-up can pay before confirming the email, and paying confirms it", async () => {
  const fresh = addUser("u9", "fresh", "free");
  db.prepare("UPDATE users SET email_verified_at = NULL WHERE id = 'u9'").run();
  // everything else on the site is still locked for an unconfirmed account…
  assert.equal((await call(fresh, "GET", "/words")).data?.error, "email_not_verified");
  // …but the billing routes are open so checkout can start
  const co = await call(fresh, "POST", "/billing/checkout", { interval: "month" });
  assert.equal(co.status, 200);
  assert.equal(db.prepare("SELECT email_verified_at v FROM users WHERE id='u9'").get().v, null, "starting checkout alone doesn't confirm the email");
  const cust = db.prepare("SELECT stripe_customer_id c FROM subscriptions WHERE user_id = 'u9'").get().c;
  makeSub("sub_9", cust, "u9");
  const ev = { id: "evt_signup_pay", type: "checkout.session.completed", data: { object: { mode: "subscription", subscription: "sub_9", client_reference_id: "u9", customer: cust } } };
  assert.equal((await webhook(ev)).status, 200);
  assert.equal(roleOf("u9"), "paid");
  assert.ok(db.prepare("SELECT email_verified_at v FROM users WHERE id='u9'").get().v, "a completed payment confirms the email");
});

test("a completed payment emails the member a thank-you with the Stripe invoice links", async () => {
  const sent = [];
  env.EMAIL = { send: async (m) => { sent.push(m); } };
  try {
    const u = addUser("u10", "payer", "free");
    await call(u, "POST", "/billing/checkout", { interval: "year" });
    const cust = db.prepare("SELECT stripe_customer_id c FROM subscriptions WHERE user_id = 'u10'").get().c;
    makeSub("sub_10", cust, "u10", { items: { data: [{ price: { recurring: { interval: "year" } }, current_period_end: PERIOD_END }] } });
    const ev = { id: "evt_welcome_mail", type: "checkout.session.completed", data: { object: { mode: "subscription", subscription: "sub_10", invoice: "in_10", client_reference_id: "u10", customer: cust } } };
    assert.equal((await webhook(ev)).status, 200);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].to, "u10@example.com");
    assert.match(sent[0].subject, /프리미엄 결제가 완료/);
    assert.match(sent[0].html, /https:\/\/invoice\.stripe\.test\/i\/in_10/);
    assert.match(sent[0].text, /KSM-0001/);
    assert.match(sent[0].text, /AUD 5\.99/);
    assert.equal(db.prepare("SELECT status FROM email_log WHERE kind='premium_welcome' AND to_addr='u10@example.com'").get().status, "sent");
    // a replayed event must not send a second email
    await webhook(ev);
    assert.equal(sent.length, 1);
  } finally {
    delete env.EMAIL;
  }
});
