// Worker route test for the photo -> words allowance (worker/photo.js): guest none, free 10 in total,
// free-month trial 10 a day, Premium 30 a day, admin unlimited, a site-wide daily ceiling, refunds on failure.
// Same harness as worker-trial.test.mjs, plus a fake Claude API.
// Run: node --experimental-sqlite --test tests/worker-photo.test.mjs  (Node 22+)
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
  ANTHROPIC_API_KEY: "sk-ant-test",
  DB: { prepare: wrap, batch: async (sts) => { sts.forEach((s) => s._exec()); return []; } },
};

/* ---------- fake Stripe ---------- */
const stripeCalls = [];
const fake = { customers: {}, subs: {}, failDeleteCustomer: false, seq: 0 };
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  const u = new URL(url);
  if (u.hostname === "api.anthropic.com") {
    if (globalThis.__claudeFail) return new Response("boom", { status: 500 });
    return new Response(JSON.stringify({ content: [{ type: "text", text: '{"words":["because","friend"]}' }], stop_reason: "end_turn", usage: {} }), { status: 200, headers: { "content-type": "application/json" } });
  }
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


const admin = addUser("a1", "boss", "admin");
const free = addUser("f1", "free", "free");
const paid = addUser("p1", "paid", "paid");
const trialUser = addUser("tr1", "trial", "paid");
db.prepare("INSERT INTO trials (user_id, wanted_at, started_at, ends_at) VALUES ('tr1', 1, ?, ?)").run(Date.now() - 86400000, Date.now() + 20 * 86400000);
const photo = (who) => call(who, "POST", "/extract-words", { image: "aGVsbG8=", mediaType: "image/jpeg" });
const quiet = async (fn) => { const e = console.error, l = console.log; console.error = () => {}; console.log = () => {}; try { return await fn(); } finally { console.error = e; console.log = l; } };

test("guest can't use it; usage says so", async () => {
  assert.equal((await photo(null)).status, 401);
  const u = await call(null, "GET", "/extract-words/usage");
  assert.equal(u.data.scope, "none");
});

test("free: 10 photos in total, then photo_limit; a failed read is given back", async () => {
  const u0 = await call(free, "GET", "/extract-words/usage");
  assert.deepEqual([u0.data.kind, u0.data.scope, u0.data.limit, u0.data.left], ["free", "total", 10, 10]);
  globalThis.__claudeFail = true;
  assert.equal((await quiet(() => photo(free))).status, 502);
  globalThis.__claudeFail = false;
  assert.equal((await call(free, "GET", "/extract-words/usage")).data.left, 10, "refunded");
  for (let i = 0; i < 10; i++) {
    const r = await quiet(() => photo(free));
    assert.equal(r.status, 200);
    assert.deepEqual(r.data.words, ["because", "friend"]);
    assert.equal(r.data.photo.left, 9 - i);
  }
  const over = await quiet(() => photo(free));
  assert.equal(over.status, 429);
  assert.equal(over.data.error, "photo_limit");
  assert.equal(over.data.scope, "total");
  // a total, not a daily count: tomorrow is still 0 left
  assert.equal(db.prepare("SELECT count FROM extract_usage WHERE user_id='f1' AND day='total'").get().count, 10);
});

test("trial: 10 a day; Premium: 30 a day; admin unlimited", async () => {
  const t = await call(trialUser, "GET", "/extract-words/usage");
  assert.deepEqual([t.data.kind, t.data.scope, t.data.limit], ["trial", "day", 10]);
  for (let i = 0; i < 10; i++) assert.equal((await quiet(() => photo(trialUser))).status, 200);
  assert.equal((await quiet(() => photo(trialUser))).data.error, "photo_limit");
  const p = await call(paid, "GET", "/extract-words/usage");
  assert.deepEqual([p.data.kind, p.data.limit], ["paid", 30]);
  for (let i = 0; i < 30; i++) assert.equal((await quiet(() => photo(paid))).status, 200);
  assert.equal((await quiet(() => photo(paid))).status, 429);
  for (let i = 0; i < 40; i++) assert.equal((await quiet(() => photo(admin))).status, 200);
});

test("site-wide daily ceiling and admin settings (with change log)", async () => {
  assert.equal((await call(paid, "PUT", "/admin/photo-limits", { siteDaily: 5 })).status, 401);
  assert.equal((await call(admin, "PUT", "/admin/photo-limits", { freeTotal: -1 })).data.error, "invalid");
  const g = await call(admin, "GET", "/admin/photo-limits");
  const ok = await call(admin, "PUT", "/admin/photo-limits", { freeTotal: 10, trialDaily: 10, paidDaily: 30, siteDaily: g.data.siteToday });
  assert.equal(ok.status, 200);
  assert.equal(ok.data.limits.log.length, 1);
  addUser("p2", "paid2", "paid");
  const r = await quiet(() => photo({ id: "p2", role: "paid" }));
  assert.equal(r.status, 429);
  assert.equal(r.data.error, "site_limit");
  assert.equal(db.prepare("SELECT count FROM extract_usage WHERE user_id='p2'").get()?.count || 0, 0, "the account's own count is given back");
});
