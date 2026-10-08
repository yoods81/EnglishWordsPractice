// Worker route test for customer support (inquiries, inbox, customer notes, announcement),
// using node:sqlite as a tiny D1 stand-in.
// Run: node --experimental-sqlite --test tests/worker-support.test.mjs  (Node 22+)
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
    run: async () => { const r = db.prepare(sql).run(...args); return { meta: { changes: r.changes } }; },
    _exec: () => db.prepare(sql).run(...args),
  };
  return st;
};
const sent = [];
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

let ipCounter = 0;
async function call(who, method, path, body, ip) {
  const headers = { "content-type": "application/json", "cf-connecting-ip": ip || `10.0.0.${++ipCounter}` };
  if (who) headers.cookie = `${cookieName}=${encodeURIComponent(await cookieFor(who.id, who.role))}`;
  const res = await worker.fetch(new Request("https://x.test/api" + path, { method, headers, body: body ? JSON.stringify(body) : undefined }), env);
  return { status: res.status, data: await res.json() };
}
const admin = { id: "a1", role: "admin" }, p1 = { id: "p1", role: "paid" }, p2 = { id: "p2", role: "paid" }, free = { id: "f1", role: "free" };
const addUser = (id, name, role) =>
  db.prepare("INSERT INTO users (id,username,password_hash,password_salt,role,created_at) VALUES (?,?,?,?,?,?)").run(id, name, "h", "s", role, 1);
addUser("a1", "boss", "admin"); addUser("p1", "pay1", "paid"); addUser("p2", "pay2", "paid"); addUser("f1", "free1", "free");
const w = (id, word, extra = {}) => ({ id, word, definitionKo: "뜻", pos: "noun", levelEn: "high", ...extra });
const wordsOf = async (who) => (await call(who, "GET", "/words")).data.words.map((x) => x.word).sort();

test("paid words stay private: invisible to admin pool, anonymous, free and other paid accounts", async () => {
  assert.equal((await call(admin, "PUT", "/words", { words: [w("s1", "shared")] })).status, 200);
  assert.equal((await call(p1, "PUT", "/words", { words: [w("m1", "mine")] })).status, 200);
  assert.deepEqual(await wordsOf(p1), ["mine", "shared"]);
  assert.deepEqual(await wordsOf(admin), ["shared"]);
  assert.deepEqual(await wordsOf(null), ["shared"]);
  assert.deepEqual(await wordsOf(free), ["shared"]);
  assert.deepEqual(await wordsOf(p2), ["shared"]);
  assert.equal(db.prepare("SELECT owner_id FROM shared_words WHERE id='m1'").get().owner_id, "p1");
  assert.equal(db.prepare("SELECT owner_id FROM shared_words WHERE id='s1'").get().owner_id, null);
  assert.equal(db.prepare("SELECT pos FROM shared_words WHERE id='m1'").get().pos, "noun");
});

test("a client-supplied ownerId is ignored, and free/anonymous can't write", async () => {
  await call(p1, "PUT", "/words", { words: [w("m2", "sneaky", { ownerId: null })] });
  assert.equal(db.prepare("SELECT owner_id FROM shared_words WHERE id='m2'").get().owner_id, "p1");
  assert.equal((await call(free, "PUT", "/words", { words: [w("f9", "nope")] })).status, 401);
  assert.equal((await call(null, "PUT", "/words", { words: [w("f9", "nope")] })).status, 401);
});

test("a paid account can't overwrite or delete admin's or another paid account's words", async () => {
  await call(p2, "PUT", "/words", { words: [w("s1", "hijacked"), w("m1", "hijacked2")] });
  assert.equal(db.prepare("SELECT word FROM shared_words WHERE id='s1'").get().word, "shared");
  assert.equal(db.prepare("SELECT word FROM shared_words WHERE id='m1'").get().word, "mine");
  await call(p2, "DELETE", "/words", { ids: ["s1", "m1"] });
  assert.equal(db.prepare("SELECT COUNT(*) c FROM shared_words WHERE id IN ('s1','m1')").get().c, 2);
  await call(admin, "DELETE", "/words", { ids: ["m1"] });
  assert.equal(db.prepare("SELECT COUNT(*) c FROM shared_words WHERE id='m1'").get().c, 1);
  await call(p1, "DELETE", "/words", { ids: ["m1"] });
  assert.equal(db.prepare("SELECT COUNT(*) c FROM shared_words WHERE id='m1'").get().c, 0);
});

test("admin can list, edit and delete paid members' words (with owner + date); nobody else can", async () => {
  await call(p1, "PUT", "/words", { words: [w("m5", "evaporate"), w("m6", "erode")] });
  await call(p2, "PUT", "/words", { words: [w("n1", "tide")] });
  const list = await call(admin, "GET", "/admin/user-words");
  assert.equal(list.status, 200);
  const evap = list.data.words.find((x) => x.word === "evaporate");
  assert.equal(evap.ownerUsername, "pay1");
  assert.ok(evap.createdAt > 0);
  assert.ok(!list.data.words.some((x) => x.word === "shared"), "admin's own shared words are not in this list");
  for (const who of [p1, free, null]) assert.equal((await call(who, "GET", "/admin/user-words")).status, 401);

  const upd = await call(admin, "POST", "/admin/user-words/update", w("m5", "evaporate", { definitionKo: "증발하다", example: "Water evaporates." }));
  assert.equal(upd.status, 200);
  const row = db.prepare("SELECT * FROM shared_words WHERE id='m5'").get();
  assert.equal(row.definition_ko, "증발하다");
  assert.equal(row.owner_id, "p1", "ownership is preserved");
  // can't use the paid-word door to alter the admin's own shared pool
  assert.equal((await call(admin, "POST", "/admin/user-words/update", w("s1", "x"))).status, 404);
  assert.equal(db.prepare("SELECT word FROM shared_words WHERE id='s1'").get().word, "shared");
  assert.equal((await call(p1, "POST", "/admin/user-words/update", w("m5", "hack"))).status, 401);

  assert.equal((await call(p1, "POST", "/admin/user-words/delete", { ids: ["n1"] })).status, 401);
  await call(admin, "POST", "/admin/user-words/delete", { ids: ["m6", "s1"] });
  assert.equal(db.prepare("SELECT COUNT(*) c FROM shared_words WHERE id='m6'").get().c, 0);
  assert.equal(db.prepare("SELECT COUNT(*) c FROM shared_words WHERE id='s1'").get().c, 1, "shared words are untouched");
});
