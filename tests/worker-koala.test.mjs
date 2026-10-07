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

test("recovery code: signup issues one, it finds the username and resets the password", async () => {
  const signup = await call(null, "POST", "/auth/signup", { username: "newkid", password: "firstpass1" });
  assert.equal(signup.status, 200);
  const code = signup.data.recoveryCode;
  assert.match(code, /^[A-Z2-9]{4}(-[A-Z2-9]{4}){3}$/);
  // Only a hash is stored, never the code itself.
  const stored = db.prepare("SELECT code_hash FROM recovery_codes WHERE user_id = ?").get(signup.data.user.id);
  assert.ok(stored && stored.code_hash && !stored.code_hash.includes(code.replace(/-/g, "")));

  // Forgot username: typing the code any way (lowercase, no dashes) works.
  const found = await call(null, "POST", "/auth/recover", { code: code.toLowerCase().replace(/-/g, " ") });
  assert.equal(found.status, 200);
  assert.equal(found.data.username, "newkid");
  assert.equal((await call(null, "POST", "/auth/recover", { code: "AAAA-BBBB-CCCC-DDDD" })).status, 400);
  assert.equal((await call(null, "POST", "/auth/recover", {})).status, 400);

  // Forgot password: bad code / short password rejected, good code resets and rotates the code.
  assert.equal((await call(null, "POST", "/auth/reset-password", { code: "AAAA-BBBB-CCCC-DDDD", newPassword: "secondpass2" })).status, 400);
  assert.equal((await call(null, "POST", "/auth/reset-password", { code, newPassword: "short" })).status, 400);
  const reset = await call(null, "POST", "/auth/reset-password", { code, newPassword: "secondpass2" });
  assert.equal(reset.status, 200);
  assert.equal(reset.data.username, "newkid");
  assert.notEqual(reset.data.code, code);

  assert.equal((await call(null, "POST", "/auth/login", { username: "newkid", password: "firstpass1" })).status, 401);
  assert.equal((await call(null, "POST", "/auth/login", { username: "newkid", password: "secondpass2" })).status, 200);
  // The used code no longer works; the replacement does.
  assert.equal((await call(null, "POST", "/auth/reset-password", { code, newPassword: "thirdpass33" })).status, 400);
  assert.equal((await call(null, "POST", "/auth/recover", { code: reset.data.code })).status, 200);
});

test("recovery code: make a new one from My Account (password required), admins excluded", async () => {
  const signup = await call(null, "POST", "/auth/signup", { username: "kidthree", password: "password33" });
  const me = { id: signup.data.user.id, role: "free" };
  const oldCode = signup.data.recoveryCode;

  assert.equal((await call(null, "GET", "/auth/recovery-status")).status, 401);
  assert.equal((await call(null, "POST", "/auth/recovery-code", { password: "password33" })).status, 401);
  const status = await call(me, "GET", "/auth/recovery-status");
  assert.equal(status.data.hasCode, true);
  assert.equal(status.data.code, undefined);

  assert.equal((await call(me, "POST", "/auth/recovery-code", { password: "wrongpass99" })).status, 400);
  const made = await call(me, "POST", "/auth/recovery-code", { password: "password33" });
  assert.equal(made.status, 200);
  assert.notEqual(made.data.code, oldCode);
  assert.equal((await call(null, "POST", "/auth/recover", { code: oldCode })).status, 400);
  assert.equal((await call(null, "POST", "/auth/recover", { code: made.data.code })).data.username, "kidthree");

  // Admin accounts never recover through a code, even if a row somehow exists.
  assert.equal((await call(admin, "POST", "/auth/recovery-code", { password: "x" })).status, 400);
  assert.equal((await call(admin, "GET", "/auth/recovery-status")).data.eligible, false);
});
