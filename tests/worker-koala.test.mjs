// Worker route test for the Koala Coin admin tools, using node:sqlite as a tiny D1 stand-in.
// Run: node --experimental-sqlite --test tests/worker-koala.test.mjs  (Node 22+)
import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
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
    run: async () => { db.prepare(sql).run(...args); return {}; },
    _exec: () => db.prepare(sql).run(...args),
  };
  return st;
};
const env = {
  SESSION_SECRET: "secret",
  DB: { prepare: wrap, batch: async (sts) => { sts.forEach((s) => s._exec()); return []; } },
};

async function cookieFor(id, role) {
  const exp = Date.now() + 1e6;
  const payload = `${id}.${role}.${exp}`;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode("secret"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = Buffer.from(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload))).toString("hex");
  return `${payload}.${sig}`;
}
const src = fs.readFileSync(new URL("../worker/index.js", import.meta.url), "utf8");
const cookieName = src.match(/SESSION_COOKIE = "([^"]+)"/)[1];

async function call(who, method, path, body) {
  const headers = { "content-type": "application/json" };
  if (who) headers.cookie = `${cookieName}=${encodeURIComponent(await cookieFor(who.id, who.role))}`;
  const res = await worker.fetch(new Request("https://x.test/api" + path, { method, headers, body: body ? JSON.stringify(body) : undefined }), env);
  return { status: res.status, data: await res.json() };
}
const admin = { id: "a1", role: "admin" }, kid = { id: "u1", role: "free" }, other = { id: "u2", role: "free" };
db.prepare("INSERT INTO users (id,username,password_hash,password_salt,role,created_at) VALUES (?,?,?,?,?,?)").run("a1", "boss", "h", "s", "admin", 1);
db.prepare("INSERT INTO users (id,username,password_hash,password_salt,role,created_at) VALUES (?,?,?,?,?,?)").run("u1", "kid1", "h", "s", "free", 2);
db.prepare("INSERT INTO users (id,username,password_hash,password_salt,role,created_at) VALUES (?,?,?,?,?,?)").run("u2", "kid2", "h", "s", "free", 3);

test("only admins can use the admin coin routes", async () => {
  assert.equal((await call(null, "GET", "/admin/koala")).status, 401);
  assert.equal((await call(kid, "GET", "/admin/koala")).status, 401);
  assert.equal((await call(kid, "POST", "/admin/koala/grant", { userId: "u1", amount: 50 })).status, 401);
});

test("grant validation", async () => {
  for (const amount of [0, 1.5, "x", 100001, null]) assert.equal((await call(admin, "POST", "/admin/koala/grant", { userId: "u1", amount })).status, 400);
  assert.equal((await call(admin, "POST", "/admin/koala/grant", { userId: "nobody", amount: 5 })).status, 404);
});

test("give -> kid sees it once -> ack -> gone; other kids never see it", async () => {
  assert.equal((await call(admin, "POST", "/admin/koala/grant", { userId: "u1", amount: 50, note: "great work" })).status, 200);
  assert.equal((await call(admin, "POST", "/admin/koala/grant", { userId: "u1", amount: -10 })).status, 200);
  let list = await call(admin, "GET", "/admin/koala");
  assert.equal(list.data.users.find((u) => u.id === "u1").pending, 40);
  assert.equal(list.data.recent.length, 2);
  assert.equal((await call(other, "GET", "/koala/grants")).data.grants.length, 0);
  assert.equal((await call(null, "GET", "/koala/grants")).status, 401);
  const mine = await call(kid, "GET", "/koala/grants");
  assert.equal(mine.data.grants.length, 2);
  assert.equal(mine.data.grants[0].note, "great work");
  // another user can't ack someone else's grant
  await call(other, "POST", "/koala/grants/ack", { ids: mine.data.grants.map((g) => g.id) });
  assert.equal((await call(kid, "GET", "/koala/grants")).data.grants.length, 2);
  await call(kid, "POST", "/koala/grants/ack", { ids: mine.data.grants.map((g) => g.id) });
  assert.equal((await call(kid, "GET", "/koala/grants")).data.grants.length, 0);
  list = await call(admin, "GET", "/admin/koala");
  assert.equal(list.data.users.find((u) => u.id === "u1").pending, 0);
});

test("balance summary is reported, clamped, and shown to admin; search works", async () => {
  assert.equal((await call(kid, "POST", "/koala/summary", { coins: 123, earned: 300, streak: 4, best: 9 })).status, 200);
  await call(kid, "POST", "/koala/summary", { coins: 130.9, earned: 310, streak: 5, best: 9 });
  await call(other, "POST", "/koala/summary", { coins: -5, earned: "abc", streak: 1e12, best: 0 });
  const all = (await call(admin, "GET", "/admin/koala")).data.users;
  const k = all.find((u) => u.id === "u1");
  assert.deepEqual([k.coins, k.earned, k.streak, k.best], [130, 310, 5, 9]);
  const o = all.find((u) => u.id === "u2");
  assert.deepEqual([o.coins, o.earned, o.streak], [0, 0, 100000]);
  assert.equal(all.find((u) => u.id === "a1").coins, null);
  assert.equal((await call(admin, "GET", "/admin/koala?q=kid2")).data.users.length, 1);
});

test("deleting a user removes their coin rows", async () => {
  await call(admin, "POST", "/admin/koala/grant", { userId: "u2", amount: 5 });
  assert.equal((await call(admin, "POST", "/admin/users/delete", { userId: "u2" })).status, 200);
  assert.equal(db.prepare("SELECT COUNT(*) c FROM koala_grants WHERE user_id='u2'").get().c, 0);
  assert.equal(db.prepare("SELECT COUNT(*) c FROM user_koala WHERE user_id='u2'").get().c, 0);
});

test("account Koala data: any signed-in account can save and load its own, nobody else's", async () => {
  assert.equal((await call(null, "GET", "/koala/data")).status, 401);
  assert.equal((await call(kid, "GET", "/koala/data")).data.data, null);
  assert.equal((await call(kid, "PUT", "/koala/data", { data: "x" })).status, 400);
  assert.equal((await call(kid, "PUT", "/koala/data", { data: { streak: {} } })).status, 400);
  const data = { koala: { coins: 9, earned: 20, items: { owned: { redScarf: 1 }, equipped: {} } }, streak: { count: 3 }, badges: { a: 1 }, evil: "dropped" };
  assert.equal((await call(kid, "PUT", "/koala/data", { data })).status, 200);
  const got = (await call(kid, "GET", "/koala/data")).data;
  assert.equal(got.data.koala.coins, 9);
  assert.equal(got.data.evil, undefined);
  assert.equal((await call(other, "GET", "/koala/data")).data.data, null);
  const big = { koala: { x: "y".repeat(100001) } };
  assert.equal((await call(kid, "PUT", "/koala/data", { data: big })).status, 413);
});

/* ---------- email system ---------- */
const sentMail = [];
env.EMAIL = { send: async (m) => { sentMail.push(m); } };
const tokenFrom = (m, key) => (m.text.match(new RegExp(`[?]${key}=([0-9a-f]{64})`)) || [])[1];

test("password policy: 8+ chars with uppercase, digit and special character", async () => {
  const base = { username: "policykid", email: "p@example.com" };
  for (const password of ["Ab1!", "alllowercase1!", "NoDigits!!", "NoSpecial123", "abc12345!"]) {
    const res = await call(null, "POST", "/auth/signup", { ...base, password });
    assert.equal(res.status, 400, password);
    assert.equal(res.data.error, "invalid_password");
  }
  assert.equal((await call(null, "POST", "/auth/signup", { ...base, password: "Good1pass!" })).status, 200);
});

test("signup requires a valid email and sends a verification mail", async () => {
  for (const email of [undefined, "", "nope", "a@b", "a b@c.com"]) {
    const res = await call(null, "POST", "/auth/signup", { username: "mailkid", password: "Good1pass!", email });
    assert.equal(res.data.error, "invalid_email", String(email));
  }
  sentMail.length = 0;
  const res = await call(null, "POST", "/auth/signup", { username: "mailkid", password: "Good1pass!", email: "  Parent@Example.COM " });
  assert.equal(res.status, 200);
  assert.equal(res.data.user.email, "parent@example.com");
  assert.equal(res.data.user.emailVerified, false);
  assert.equal(res.data.verificationSent, true);
  assert.equal(sentMail.length, 1);
  assert.equal(sentMail[0].to, "parent@example.com");
  assert.equal(sentMail[0].replyTo, "admin@koalastudymate.com");
  assert.equal(sentMail[0].from.email, "noreply@koalastudymate.com");
  assert.ok(tokenFrom(sentMail[0], "verify"));
  // The log keeps who/what/when — never the link.
  const log = db.prepare("SELECT * FROM email_log WHERE kind = 'verify' ORDER BY id DESC").get();
  assert.equal(log.to_addr, "parent@example.com");
  assert.equal(log.status, "sent");
  assert.ok(!JSON.stringify(log).includes(tokenFrom(sentMail[0], "verify")));
});

test("verify link works once; forgot-password only emails verified addresses", async () => {
  const user = db.prepare("SELECT id FROM users WHERE username = 'mailkid'").get();
  sentMail.length = 0;
  // Unverified: always the same answer, nothing sent.
  assert.equal((await call(null, "POST", "/auth/forgot-password", { username: "mailkid" })).data.ok, true);
  assert.equal((await call(null, "POST", "/auth/forgot-password", { username: "ghost" })).data.ok, true);
  assert.equal(sentMail.length, 0);

  const me = { id: user.id, role: "free" };
  // Signup just sent one, so an immediate resend is held back; after a minute it goes out.
  assert.equal((await call(me, "POST", "/auth/resend-verification")).status, 429);
  db.prepare("UPDATE email_tokens SET created_at = created_at - 120000 WHERE user_id = ?").run(user.id);
  assert.equal((await call(me, "POST", "/auth/resend-verification")).status, 200);
  const token = tokenFrom(sentMail.at(-1), "verify");
  assert.equal((await call(me, "POST", "/auth/resend-verification")).status, 429); // 1-minute cooldown
  assert.equal((await call(null, "POST", "/auth/verify-email", { token: "0".repeat(64) })).status, 400);
  assert.equal((await call(null, "POST", "/auth/verify-email", { token })).status, 200);
  assert.equal((await call(null, "POST", "/auth/verify-email", { token })).status, 400); // single use
  assert.equal((await call(me, "GET", "/auth/me")).data.user.emailVerified, true);

  sentMail.length = 0;
  await call(null, "POST", "/auth/forgot-password", { username: "mailkid" });
  assert.equal(sentMail.length, 1);
  assert.equal(sentMail[0].to, "parent@example.com");
  const resetToken = tokenFrom(sentMail[0], "reset");
  assert.ok(resetToken);

  // Reset: policy enforced, token single use, old password stops working.
  assert.equal((await call(null, "POST", "/auth/reset-password", { token: resetToken, newPassword: "weak" })).status, 400);
  const reset = await call(null, "POST", "/auth/reset-password", { token: resetToken, newPassword: "Newer2pass#" });
  assert.equal(reset.status, 200);
  assert.equal(reset.data.username, "mailkid");
  assert.equal((await call(null, "POST", "/auth/reset-password", { token: resetToken, newPassword: "Another3pass#" })).status, 400);
  assert.equal((await call(null, "POST", "/auth/login", { username: "mailkid", password: "Good1pass!" })).status, 401);
  assert.equal((await call(null, "POST", "/auth/login", { username: "mailkid", password: "Newer2pass#" })).status, 200);
});

test("forgot-username emails every verified account on that address, with a cooldown", async () => {
  // A second child sharing the parent's address.
  const second = await call(null, "POST", "/auth/signup", { username: "sibling2", password: "Good1pass!", email: "parent@example.com" });
  db.prepare("UPDATE users SET email_verified_at = ? WHERE id = ?").run(Date.now(), second.data.user.id);
  sentMail.length = 0;
  assert.equal((await call(null, "POST", "/auth/forgot-username", { email: "PARENT@example.com" })).data.ok, true);
  assert.equal(sentMail.length, 1);
  assert.match(sentMail[0].text, /mailkid/);
  assert.match(sentMail[0].text, /sibling2/);
  await call(null, "POST", "/auth/forgot-username", { email: "parent@example.com" });
  assert.equal(sentMail.length, 1); // cooldown
  await call(null, "POST", "/auth/forgot-username", { email: "stranger@example.com" });
  assert.equal(sentMail.length, 1); // unknown address: same answer, no mail
  assert.equal((await call(null, "POST", "/auth/forgot-username", { email: "bad" })).status, 400);
});

test("existing accounts can add or change their email (password required)", async () => {
  const me = { id: "u1", role: "free" }; // kid1: seeded without an email
  sentMail.length = 0;
  assert.equal((await call(me, "POST", "/auth/set-email", { email: "kid1@example.com", password: "x" })).status, 400);
  assert.equal((await call(me, "POST", "/auth/set-email", { email: "bad", password: "x" })).data.error, "invalid_email");
  const { hash, salt } = { hash: null, salt: null };
  // Give kid1 a real password so the check can pass.
  const signup = await call(null, "POST", "/auth/signup", { username: "addmail", password: "Good1pass!", email: "old@example.com" });
  const u = { id: signup.data.user.id, role: "free" };
  const res = await call(u, "POST", "/auth/set-email", { email: "New@Example.com", password: "Good1pass!" });
  assert.equal(res.status, 200);
  assert.equal(res.data.email, "new@example.com");
  assert.equal((await call(u, "GET", "/auth/me")).data.user.emailVerified, false);
  assert.equal(sentMail.at(-1).to, "new@example.com");
});

test("admin email panel: status, test send, log; others are refused", async () => {
  assert.equal((await call(kid, "GET", "/admin/email/status")).status, 401);
  assert.equal((await call(kid, "POST", "/admin/email/test", { to: "a@b.co" })).status, 401);
  assert.equal((await call(kid, "GET", "/admin/email/log")).status, 401);
  const status = await call(admin, "GET", "/admin/email/status");
  assert.equal(status.data.configured, true);
  assert.equal(status.data.replyTo, "admin@koalastudymate.com");
  sentMail.length = 0;
  assert.equal((await call(admin, "POST", "/admin/email/test", { to: "bad" })).status, 400);
  assert.equal((await call(admin, "POST", "/admin/email/test", { to: "me@example.com" })).status, 200);
  assert.equal(sentMail.length, 1);
  const log = await call(admin, "GET", "/admin/email/log");
  assert.equal(log.data.log[0].kind, "test");
  assert.equal(log.data.log[0].status, "sent");

  // Failures are reported and logged, not swallowed.
  env.EMAIL = { send: async () => { const e = new Error("sender not verified"); e.code = "E_SENDER_NOT_VERIFIED"; throw e; } };
  const failed = await call(admin, "POST", "/admin/email/test", { to: "me@example.com" });
  assert.equal(failed.status, 502);
  assert.equal(failed.data.error, "E_SENDER_NOT_VERIFIED");
  // Not configured at all (binding missing): signup still works.
  delete env.EMAIL;
  assert.equal((await call(admin, "GET", "/admin/email/status")).data.configured, false);
  const noMail = await call(null, "POST", "/auth/signup", { username: "nomailsrv", password: "Good1pass!", email: "z@example.com" });
  assert.equal(noMail.status, 200);
  assert.equal(noMail.data.verificationSent, false);
  env.EMAIL = { send: async (m) => { sentMail.push(m); } };
});
