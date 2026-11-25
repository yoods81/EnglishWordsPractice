// Typing leaderboard (worker/typing.js). Run: node --experimental-sqlite --test tests/worker-typing.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import worker from "../worker/index.js";
import TypingCore from "../public/js/typing-core.js";

const db = new DatabaseSync(":memory:");
db.exec(fs.readFileSync(new URL("../schema.sql", import.meta.url), "utf8"));
const tick = () => new Promise((r) => setImmediate(r));
const wrap = (sql) => { let a = []; const st = { bind: (...x) => { a = x; return st; }, first: async () => { await tick(); return db.prepare(sql).get(...a) ?? null; }, all: async () => { await tick(); return { results: db.prepare(sql).all(...a) }; },
  run: async () => { await tick(); const r = db.prepare(sql).run(...a); return { meta: { changes: Number(r.changes) } }; }, _exec: () => db.prepare(sql).run(...a) }; return st; };
const env = { SESSION_SECRET: "secret", DB: { prepare: wrap, batch: async (s) => { s.forEach((x) => x._exec()); return []; } } };
async function cookie(id, role) { const exp = Date.now() + 1e6, p = `${id}.${role}.${exp}`; const k = await crypto.subtle.importKey("raw", new TextEncoder().encode("secret"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return `${p}.${Buffer.from(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(p))).toString("hex")}`; }
async function call(who, method, path, body) {
  const h = { "content-type": "application/json" };
  if (who) h.cookie = `ywp_session=${encodeURIComponent(await cookie(who.id, who.role))}`;
  const res = await worker.fetch(new Request("https://x.test/api" + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined }), env);
  return { status: res.status, data: await res.json().catch(() => null) };
}
const free = { id: "f1", role: "free" }, free2 = { id: "f2", role: "free" }, paid = { id: "p1", role: "paid" };
for (const [id, name, role] of [["f1", "kid@x.au", "free"], ["f2", "kid2@x.au", "free"], ["p1", "prem@x.au", "paid"]])
  db.prepare("INSERT INTO users (id,username,password_hash,password_salt,role,created_at,email,email_verified_at) VALUES (?,?,?,?,?,?,?,1)").run(id, name, "h", "s", role, 1, name);
const spaceOut = () => db.prepare("UPDATE typing_scores SET created_at = created_at - 5000").run();

test("T1 a guest cannot post a score but can read the board", async () => {
  const r = await call(null, "POST", "/typing/score", { kind: "words", level: "elem_low", score: 100 });
  assert.equal(r.status, 401);
  const b = await call(null, "GET", "/typing/board?kind=words&level=elem_low&input=kb");
  assert.equal(b.status, 200); assert.deepEqual(b.data.rows, []); assert.equal(b.data.me, null);
});

test("T2 WPM is worked out on the server; low accuracy is not ranked", async () => {
  // 100 correct chars in 60s = 20 WPM
  let r = await call(free, "POST", "/typing/score", { kind: "sentence", level: "elem_low", input: "kb", chars: 100, ms: 60000, keystrokes: 104, mistakes: 4, wpm: 999 });
  assert.equal(r.data.ranked, true); assert.equal(r.data.wpm, 20); assert.equal(r.data.score, 200); assert.equal(r.data.accuracy, 96);
  spaceOut();
  r = await call(free, "POST", "/typing/score", { kind: "sentence", level: "elem_low", input: "kb", chars: 100, ms: 30000, keystrokes: 140, mistakes: 40 });
  assert.equal(r.data.ranked, false); assert.equal(r.data.reason, "accuracy");
  r = await call(free, "POST", "/typing/score", { kind: "sentence", level: "elem_low", input: "kb", chars: 100, ms: 100, keystrokes: 100, mistakes: 0 });
  assert.equal(r.status, 400, "impossible speed");
});

test("T3 the board shows nicknames, best per child once, and my rank", async () => {
  spaceOut();
  await call(free2, "POST", "/typing/score", { kind: "sentence", level: "elem_low", input: "kb", chars: 150, ms: 60000, keystrokes: 150, mistakes: 0 }); // 30 WPM
  spaceOut();
  await call(free2, "POST", "/typing/score", { kind: "sentence", level: "elem_low", input: "kb", chars: 125, ms: 60000, keystrokes: 125, mistakes: 0 }); // 25 WPM, not the best
  const b = await call(free, "GET", "/typing/board?kind=sentence&level=elem_low&input=kb&period=week");
  assert.equal(b.data.rows.length, 2);
  assert.equal(b.data.rows[0].name, TypingCore.nickname("f2", 0)); assert.equal(b.data.rows[0].score, 300);
  assert.equal(b.data.rows[1].me, true); assert.equal(b.data.me.rank, 2);
  assert.ok(!JSON.stringify(b.data).includes("@x.au"), "no emails on the board");
  const t = await call(free, "GET", "/typing/board?kind=sentence&level=elem_low&input=touch");
  assert.equal(t.data.rows.length, 0, "touch and keyboard are ranked apart");
});

test("T4 child slots only for Premium; double clicks are refused", async () => {
  spaceOut();
  let r = await call(free, "POST", "/typing/score", { kind: "words", level: "middle", slot: 2, score: 500 });
  assert.equal(r.data.ranked, true);
  assert.equal(db.prepare("SELECT slot FROM typing_scores WHERE user_id='f1' AND kind='words'").get().slot, 0);
  r = await call(free, "POST", "/typing/score", { kind: "words", level: "middle", score: 600 });
  assert.equal(r.status, 429);
  r = await call(paid, "POST", "/typing/score", { kind: "words", level: "middle", slot: 2, score: 700 });
  assert.equal(r.data.name, TypingCore.nickname("p1", 2));
  const b = await call(paid, "GET", "/typing/board?kind=words&level=middle&input=kb&period=all&slot=2");
  assert.equal(b.data.rows[0].me, true);
});

test("T5 Today's challenge board only counts today", async () => {
  spaceOut();
  await call(free, "POST", "/typing/score", { kind: "daily", level: "elem_high", chars: 60, ms: 20000, keystrokes: 60, mistakes: 0 });
  db.prepare("INSERT INTO typing_scores (user_id, slot, kind, level, input, score, accuracy, day, created_at) VALUES ('f2',0,'daily','elem_high','kb',900,100,'2020-01-01',1)").run();
  const b = await call(null, "GET", "/typing/board?kind=daily&level=elem_high&input=kb&period=all");
  assert.equal(b.data.period, "today"); assert.equal(b.data.rows.length, 1);
});
