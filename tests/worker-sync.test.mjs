// Wallet sync safety on the server (Koala House stage 5 — A bundle): rev-checked saves, old apps merged not overwritten,
// two saves at the same moment, children 1-3 (progress rows), size limit, sync_stats counts.
// Run: node --experimental-sqlite --test tests/worker-sync.test.mjs  (Node 22+)
import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import worker from "../worker/index.js";
import K from "../public/js/koala-core.js";

const db = new DatabaseSync(":memory:");
db.exec(fs.readFileSync(new URL("../schema.sql", import.meta.url), "utf8"));
// D1 stand-in. run() reports meta.changes like D1 (the rev check needs it). Each step yields, so two requests interleave.
const tick = () => new Promise((r) => setImmediate(r));
const wrap = (sql) => {
  let args = [];
  const st = {
    bind: (...a) => { args = a; return st; },
    first: async () => { await tick(); return db.prepare(sql).get(...args) ?? null; },
    all: async () => { await tick(); return { results: db.prepare(sql).all(...args) }; },
    run: async () => { await tick(); const r = db.prepare(sql).run(...args); return { meta: { changes: Number(r.changes) } }; },
    _exec: () => db.prepare(sql).run(...args),
  };
  return st;
};
const env = { SESSION_SECRET: "secret", DB: { prepare: wrap, batch: async (sts) => { sts.forEach((s) => s._exec()); return []; } } };
async function cookieFor(id, role) {
  const exp = Date.now() + 1e6, payload = `${id}.${role}.${exp}`;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode("secret"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return `${payload}.${Buffer.from(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload))).toString("hex")}`;
}
const cookieName = fs.readFileSync(new URL("../worker/index.js", import.meta.url), "utf8").match(/SESSION_COOKIE = "([^"]+)"/)[1];
async function call(who, method, path, body, headers = {}) {
  const h = { "content-type": "application/json", ...headers };
  if (who) h.cookie = `${cookieName}=${encodeURIComponent(await cookieFor(who.id, who.role))}`;
  const res = await worker.fetch(new Request("https://x.test/api" + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined }), env);
  return { status: res.status, data: await res.json() };
}
const NEW = { "x-app-version": "263" };
const kid = { id: "u1", role: "free" }, paid = { id: "u3", role: "paid" };
for (const [id, name, role] of [["u1", "kid1", "free"], ["u3", "kid3", "paid"]]) db.prepare("INSERT INTO users (id,username,password_hash,password_salt,role,created_at) VALUES (?,?,?,?,?,?)").run(id, name, "h", "s", role, 1);
const stats = () => Object.fromEntries(db.prepare("SELECT kind, SUM(n) AS n FROM sync_stats GROUP BY kind").all().map((r) => [r.kind, r.n]));
const wallet = (k) => { const p = { koala: JSON.parse(JSON.stringify(k)), streak: {}, badges: {} }; K.ensureKoala(p); return p; };
const saved = (id = "u1") => JSON.parse(db.prepare("SELECT reward_json FROM user_rewards WHERE user_id = ?").get(id).reward_json);

test("W1 (T3) an old app (no version) never overwrites: moved, refund and keys survive, coins don't drop", async () => {
  const B = wallet({ coins: 1400, earned: 1400 });
  K.creditSale(B, 930, "move:room2d", { key: "refund:room2d", now: 1000 }); B.koala.moved.room2d = 1000;
  K.spendCoins(B, 200, "buy", { key: "house3d:buy:p-1", now: 1001 });
  let r = await call(kid, "PUT", "/koala/data", { data: B, rev: 0 }, NEW);
  assert.equal(r.status, 200); assert.equal(r.data.rev, 1);
  // a v262 tab (no header, v1 wallet with no moved/keys, earned more) saves
  const old = { koala: { v: 1, coins: 1500, earned: 1500, spent: 0, refunded: 0, ledger: [], items: { owned: {}, equipped: {}, sub: {}, subOwned: {}, sold: {} } }, streak: {}, badges: {} };
  r = await call(kid, "PUT", "/koala/data", { data: old });
  assert.equal(r.status, 200, "never refused (a refusal makes old code resend on every save)");
  const k = saved().koala;
  assert.equal(k.coins, 2230); assert.ok(k.moved.room2d); assert.ok(k.keys["refund:room2d"]);
  const s = stats();
  assert.ok(s.wallet_old_app >= 1 && s.wallet_server_merge >= 1);
  assert.ok(!s.wallet_merge_coins_down);
});

test("W2 (T11) a stale rev gets 409 with the server copy; merge and send again succeeds", async () => {
  const cur = await call(kid, "GET", "/koala/data");
  const mine = wallet({ coins: 50, earned: 50 });
  K.awardCoins(mine, 15, "quiz", { key: "learn:quiz:2026-11-07:0", now: 2000 });
  let r = await call(kid, "PUT", "/koala/data", { data: mine, rev: cur.data.rev - 1 }, NEW);
  assert.equal(r.status, 409); assert.equal(r.data.error, "stale"); assert.equal(r.data.rev, cur.data.rev); assert.ok(r.data.data.koala);
  K.mergeRewards(mine, r.data.data);
  r = await call(kid, "PUT", "/koala/data", { data: mine, rev: r.data.rev }, { ...NEW, "x-sync-retry": "1" });
  assert.equal(r.status, 200); assert.equal(r.data.rev, cur.data.rev + 1);
  assert.equal(saved().koala.coins, 2230 + 15);
});

test("W3 two saves at the same moment: one wins, the other gets 409, and after merging nothing is lost", async () => {
  const cur = (await call(kid, "GET", "/koala/data")).data;
  const a = JSON.parse(JSON.stringify(cur.data)), b = JSON.parse(JSON.stringify(cur.data));
  K.awardCoins(a, 20, "x", { key: "learn:tt:2026-11-07:0", now: 3000 });
  K.awardCoins(b, 30, "y", { key: "learn:typing:2026-11-07:0", now: 3001 });
  const [ra, rb] = await Promise.all([call(kid, "PUT", "/koala/data", { data: a, rev: cur.rev }, NEW), call(kid, "PUT", "/koala/data", { data: b, rev: cur.rev }, NEW)]);
  const codes = [ra.status, rb.status].sort();
  assert.deepEqual(codes, [200, 409], "UPDATE ... WHERE rev = ? lets only one through");
  const [lose, loseRes] = ra.status === 409 ? [a, ra] : [b, rb];
  K.mergeRewards(lose, loseRes.data.data);
  const r = await call(kid, "PUT", "/koala/data", { data: lose, rev: loseRes.data.rev }, NEW);
  assert.equal(r.status, 200);
  assert.equal(saved().koala.coins, 2245 + 20 + 30);
});

test("W4 (T2) an app with a version below the refresh line gets 409 upgrade and nothing is written", async () => {
  const before = JSON.stringify(saved());
  const r = await call(kid, "PUT", "/koala/data", { data: wallet({ coins: 1, earned: 1 }), rev: 0 }, { "x-app-version": "262" });
  assert.equal(r.status, 409); assert.equal(r.data.error, "upgrade");
  assert.equal(JSON.stringify(saved()), before);
});

test("W5 (T12) child 2's progress row: old app merges the wallet, new app is rev-checked", async () => {
  const P = (k) => ({ quiz: { a: 1 }, koala: wallet(k).koala, streak: {}, badges: {} });
  const p0 = P({ coins: 300, earned: 300 });
  K.creditSale(p0, 100, "move:room2d", { key: "refund:room2d", now: 10 }); p0.koala.moved.room2d = 10;
  let r = await call(paid, "PUT", "/progress?p=2", { progress: p0, rev: 0 }, NEW);
  assert.equal(r.status, 200);
  r = await call(paid, "PUT", "/progress?p=2", { progress: { quiz: { b: 2 }, koala: { v: 1, coins: 500, earned: 500, ledger: [], items: { owned: {}, equipped: {}, sub: {}, subOwned: {}, sold: {} } } } });
  assert.equal(r.status, 200);
  const row = JSON.parse(db.prepare("SELECT progress_json FROM user_progress WHERE account_key = ?").get("u3:p2").progress_json);
  assert.deepEqual(row.quiz, { b: 2 }, "the rest of progress stays last-write-wins");
  assert.equal(row.koala.coins, 600); assert.ok(row.koala.moved.room2d);
  r = await call(paid, "PUT", "/progress?p=2", { progress: row, rev: 0 }, NEW);
  assert.equal(r.status, 409); assert.equal(r.data.error, "stale");
  assert.ok(!db.prepare("SELECT 1 FROM user_progress WHERE account_key = ?").get("u3:p1"), "other children's rows untouched");
});

test("W6 (T16) a huge wallet is trimmed under the limit when saved; refund keys stay", async () => {
  const big = wallet({ coins: 5, earned: 5 });
  K.creditSale(big, 5, "move:room2d", { key: "refund:room2d", now: 1 });
  for (let i = 0; i < 4000; i++) K.awardCoins(big, 1, "x", { key: "learn:quiz:2026-11-07:" + i + ":" + "pad".repeat(4), now: 5000 + i });
  assert.ok(JSON.stringify(big).length > 100000);
  const r = await call({ id: "u3", role: "paid" }, "PUT", "/koala/data", { data: big, rev: 0 }, NEW);
  assert.equal(r.status, 200);
  const k = saved("u3").koala;
  assert.ok(JSON.stringify(saved("u3")).length <= 100000 && k.keys["refund:room2d"]);
  assert.ok(stats().wallet_keys_trimmed >= 1);
});

test("W7 (T8) the server merge gives the same wallet as the app's merge", async () => {
  const A = wallet({ coins: 900, earned: 900 }); K.awardCoins(A, 50, "dailyMission", { key: "mission:2026-11-07", now: 7 });
  const B = wallet({ coins: 400, earned: 400 }); K.spendCoins(B, 60, "buy", { key: "house3d:buy:z", now: 8 });
  const client = JSON.parse(JSON.stringify(A)); K.mergeRewards(client, JSON.parse(JSON.stringify(B)));
  db.prepare("DELETE FROM user_rewards WHERE user_id = 'u1'").run();
  await call(kid, "PUT", "/koala/data", { data: A, rev: 0 }, NEW);
  await call(kid, "PUT", "/koala/data", { data: B }); // old app path merges on the server
  assert.equal(saved().koala.coins, client.koala.coins);
  assert.deepEqual(Object.keys(saved().koala.keys).sort(), Object.keys(client.koala.keys).sort());
});

test("W8 (T19) sync_stats keeps only day, kind, count", async () => {
  const cols = db.prepare("PRAGMA table_info(sync_stats)").all().map((c) => c.name);
  assert.deepEqual(cols, ["day", "kind", "n"]);
  const s = stats();
  for (const k of ["wallet_put", "wallet_old_app", "wallet_server_merge", "wallet_409_stale", "progress_put", "progress_old_app"]) assert.ok(s[k] > 0, k);
  assert.ok(!s.wallet_merge_coins_down, "no merge lost coins");
});

test("W10 rows saved before revs (rev 0 after the migration) are updated, not refused — old and new apps", async () => {
  db.prepare("INSERT OR REPLACE INTO user_rewards (user_id, reward_json, updated_at) VALUES ('u1', ?, 1)").run(JSON.stringify({ koala: { coins: 70, earned: 70 }, streak: {}, badges: {} }));
  assert.equal(db.prepare("SELECT rev FROM user_rewards WHERE user_id = 'u1'").get().rev, 0);
  let r = await call(kid, "PUT", "/koala/data", { data: wallet({ coins: 80, earned: 80 }) }); // old app
  assert.equal(r.status, 200); assert.equal(r.data.rev, 1);
  r = await call(kid, "PUT", "/koala/data", { data: saved(), rev: 1 }, NEW); // new app with the rev it got
  assert.equal(r.status, 200); assert.equal(r.data.rev, 2);
  db.prepare("INSERT OR REPLACE INTO user_progress (account_key, progress_json, updated_at) VALUES ('u3:p1', ?, 1)").run(JSON.stringify({ koala: { coins: 5, earned: 5 } }));
  r = await call(paid, "PUT", "/progress?p=1", { progress: { koala: wallet({ coins: 6, earned: 6 }).koala }, rev: 0 }, NEW);
  assert.equal(r.status, 200); assert.equal(r.data.rev, 1);
});

test("W9 (T19) admin Overview: 7-day numbers while watched, stop/warn lines by the agreed rules, admins only", async () => {
  db.prepare("INSERT INTO users (id,username,password_hash,password_salt,role,created_at) VALUES (?,?,?,?,?,?)").run("a1", "boss", "h", "s", "admin", 1);
  const admin = { id: "a1", role: "admin" };
  const day = (i) => new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
  const put = (d, kind, n) => db.prepare("INSERT INTO sync_stats (day, kind, n) VALUES (?, ?, ?) ON CONFLICT(day, kind) DO UPDATE SET n = excluded.n").run(d, kind, n);
  put(day(4), "wallet_put", 10); // first counted day: 4 days ago
  put(day(1), "wallet_put", 100); put(day(1), "wallet_409_stale", 6); put(day(1), "wallet_server_merge", 5);
  put(day(0), "wallet_put", 100); put(day(0), "wallet_409_stale", 7); put(day(0), "wallet_old_app", 9); put(day(0), "wallet_server_merge", 20);
  let o = (await call(admin, "GET", "/admin/overview")).data;
  assert.equal(o.sync.watching, true);
  const kinds = o.sync.flags.map((f) => f.kind).sort();
  assert.deepEqual(kinds, ["wallet_409_stale", "wallet_old_app", "wallet_server_merge"]);
  assert.ok(!o.sync.flags.some((f) => f.level === "stop"));
  put(day(2), "progress_merge_coins_down", 1);
  o = (await call(admin, "GET", "/admin/overview")).data;
  assert.ok(o.sync.flags.some((f) => f.kind === "progress_merge_coins_down" && f.level === "stop"));
  assert.equal((await call(kid, "GET", "/admin/overview")).status, 401);
});
