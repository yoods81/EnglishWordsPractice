// Koala House B bundle on the server: S12 settings API (+ System tab switches, log, item delete, badges, image upload,
// public config) and S3 house saves. Run: node --experimental-sqlite --test tests/worker-house.test.mjs  (Node 22+)
import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import worker from "../worker/index.js";
import { validateConfig } from "../worker/house-config.mjs";

const db = new DatabaseSync(":memory:");
db.exec(fs.readFileSync(new URL("../schema.sql", import.meta.url), "utf8"));
const tick = () => new Promise((r) => setImmediate(r));
const wrap = (sql) => { let a = []; const st = { bind: (...x) => { a = x; return st; }, first: async () => { await tick(); return db.prepare(sql).get(...a) ?? null; }, all: async () => { await tick(); return { results: db.prepare(sql).all(...a) }; },
  run: async () => { await tick(); const r = db.prepare(sql).run(...a); return { meta: { changes: Number(r.changes) } }; }, _exec: () => db.prepare(sql).run(...a) }; return st; };
const r2 = new Map();
const env = { SESSION_SECRET: "secret", DB: { prepare: wrap, batch: async (s) => { s.forEach((x) => x._exec()); return []; } },
  ITEM_IMAGES: { put: async (k, v, o) => { r2.set(k, { v, o }); }, get: async (k) => (r2.has(k) ? { body: r2.get(k).v, httpMetadata: r2.get(k).o.httpMetadata, writeHttpMetadata() {} } : null) } };
async function cookie(id, role) { const exp = Date.now() + 1e6, p = `${id}.${role}.${exp}`; const k = await crypto.subtle.importKey("raw", new TextEncoder().encode("secret"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return `${p}.${Buffer.from(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(p))).toString("hex")}`; }
const cookieName = fs.readFileSync(new URL("../worker/index.js", import.meta.url), "utf8").match(/SESSION_COOKIE = "([^"]+)"/)[1];
async function call(who, method, path, body) {
  const h = { "content-type": "application/json" };
  if (who) h.cookie = `${cookieName}=${encodeURIComponent(await cookie(who.id, who.role))}`;
  const res = await worker.fetch(new Request("https://x.test/api" + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined }), env);
  return { status: res.status, data: await res.json().catch(() => null) };
}
const admin = { id: "a1", role: "admin" }, free = { id: "f1", role: "free" }, paid = { id: "p1", role: "paid" }, trial = { id: "t1", role: "paid" };
for (const [id, name, role] of [["a1", "boss@x.au", "admin"], ["f1", "kid@x.au", "free"], ["p1", "prem@x.au", "paid"], ["t1", "trial@x.au", "paid"]])
  db.prepare("INSERT INTO users (id,username,password_hash,password_salt,role,created_at,email,email_verified_at) VALUES (?,?,?,?,?,?,?,1)").run(id, name, "h", "s", role, 1, name);
const strip = (c) => { const { version: _v, channel: _c, ...rest } = c; return rest; };
const live = async () => (await call(admin, "GET", "/admin/config")).data;
const topOf = (s) => Math.max(s.live.version, s.draft ? s.draft.version : 0);

test("B1 admin routes need an admin (401 otherwise); the public config needs no account", async () => {
  for (const who of [null, free, paid]) {
    assert.equal((await call(who, "GET", "/admin/config")).status, 401);
    assert.equal((await call(who, "PUT", "/admin/config", { channel: "draft", base: 0, config: {} })).status, 401);
    assert.equal((await call(who, "POST", "/admin/config/publish", { base: 0, config: {} })).status, 401);
    assert.equal((await call(who, "POST", "/admin/config/switches", { base: 0, switches: { HOUSE3D: "all" } })).status, 401);
    assert.equal((await call(who, "GET", "/admin/config/log")).status, 401);
    assert.equal((await call(who, "GET", "/admin/badges")).status, 401);
    assert.equal((await call(who, "DELETE", "/admin/house/items/x?base=0")).status, 401);
    assert.equal((await call(who, "POST", "/admin/house/upload-image", { id: "x", image: "", mediaType: "image/webp" })).status, 401);
  }
  const pub = await call(null, "GET", "/house/config");
  assert.equal(pub.status, 200); assert.equal(pub.data.switches.HOUSE3D, "off"); assert.equal(pub.data.switches.MOVE, "off");
});

test("B2 draft -> publish: versions go up, the draft is cleared, a stale base gets 409, every changed field is logged", async () => {
  let s = await live();
  assert.equal(s.live.version, 0); assert.equal(s.draft, null);
  const cfg = strip(s.live); cfg.prices.garage = 260;
  let r = await call(admin, "PUT", "/admin/config", { channel: "draft", base: 0, config: cfg });
  assert.equal(r.status, 200); assert.equal(r.data.draft.version, 1); assert.equal(r.data.draft.prices.garage, 260); assert.equal(r.data.live.prices.garage, 200);
  r = await call(admin, "PUT", "/admin/config", { channel: "draft", base: 0, config: cfg });
  assert.equal(r.status, 409, "someone saved since this screen loaded");
  r = await call(admin, "POST", "/admin/config/publish", { base: 1, config: cfg });
  assert.equal(r.status, 200); assert.equal(r.data.live.version, 2); assert.equal(r.data.draft, null); assert.equal(r.data.live.prices.garage, 260);
  const log = (await call(admin, "GET", "/admin/config/log")).data;
  assert.ok(log.entries.some((e) => e.path === "prices.garage" && e.before === 200 && e.after === 260 && e.channel === "live" && e.version === 2 && e.source === "house" && e.by === "boss@x.au"));
});

test("B3 the server refuses what the house app refuses: out of range, MOVE from the house screen, guest limits, unknown badge, a priced mission reward", async () => {
  const s = await live(), base = topOf(s);
  const bad = async (mut, field) => { const c = strip(JSON.parse(JSON.stringify(s.live))); mut(c); const r = await call(admin, "PUT", "/admin/config", { channel: "draft", base, config: c }); assert.equal(r.status, 400, field); assert.ok(r.data.fields.some((f) => f.startsWith(field)), `${field}: ${r.data.fields}`); };
  await bad((c) => { c.prices.garage = -5; }, "prices.garage");
  await bad((c) => { c.switches.MOVE = "on"; }, "switches.MOVE");
  await bad((c) => { c.missions.rules.roomWords = 31; }, "missions.rules.roomWords");
  await bad((c) => { c.items = [{ id: "desklamp-navy", badge: "nope" }]; }, "items.0.badge");
  const { bundledItems } = await import("../worker/house-config.mjs");
  const ex = bundledItems().items.find((i) => i.tags.includes("exclusive"));
  assert.ok(ex, "there is a mission reward item");
  await bad((c) => { c.items = [{ id: ex.id, price: 10 }]; }, "items.0.price");
  assert.equal(topOf(await live()), base, "nothing was written");
});

test("B4 System tab switches: HOUSE3D/trial accounts saved to live (+1 version, logged as site); MOVE on needs the typed word; an older house screen then gets 409", async () => {
  let s = await live(); const before = topOf(s);
  let r = await call(admin, "POST", "/admin/config/switches", { base: before, switches: { HOUSE3D: "trial", trialAccounts: ["TRIAL@x.au", "nobody@x.au"] } });
  assert.equal(r.status, 200); assert.equal(r.data.live.switches.HOUSE3D, "trial"); assert.equal(r.data.live.version, before + 1);
  assert.deepEqual(r.data.trialUnknown, ["nobody@x.au"], "a not-signed-up email is saved but reported (case-insensitive match for the real one)");
  r = await call(admin, "POST", "/admin/config/switches", { base: before + 1, switches: { MOVE: "on" } });
  assert.equal(r.status, 400); assert.equal(r.data.error, "confirm_move");
  r = await call(admin, "POST", "/admin/config/switches", { base: before + 1, switches: { MOVE: "on" }, confirm: "MOVE" });
  assert.equal(r.status, 200); assert.equal(r.data.live.switches.MOVE, "on");
  r = await call(admin, "POST", "/admin/config/switches", { base: before + 2, switches: { MOVE: "off" } });
  assert.equal(r.status, 200, "on -> off needs no typed word (the screen asks once)");
  // a house admin screen opened before the switch change tries to save with its old base
  const old = strip(s.live);
  r = await call(admin, "POST", "/admin/config/publish", { base: before, config: old });
  assert.equal(r.status, 409, "an emergency switch is never written over by an older screen");
  const log = (await call(admin, "GET", "/admin/config/log")).data.entries;
  assert.ok(log.some((e) => e.path === "switches.HOUSE3D" && e.source === "site" && e.after === "trial"));
  assert.ok(log.some((e) => e.path === "switches.MOVE" && e.source === "site" && e.after === "on"));
});

test("B5 the public config: a trial account gets the draft, others the live copy; trial accounts are never shown", async () => {
  const s = await live(); const c = strip(s.live); c.prices.garage = 270;
  const r = await call(admin, "PUT", "/admin/config", { channel: "draft", base: topOf(s), config: c });
  assert.equal(r.status, 200);
  const t = (await call(trial, "GET", "/house/config")).data, p = (await call(paid, "GET", "/house/config")).data, g = (await call(null, "GET", "/house/config")).data;
  assert.equal(t.channel, "draft"); assert.equal(t.prices.garage, 270);
  assert.equal(p.channel, "live"); assert.equal(p.prices.garage, 260); assert.equal(g.prices.garage, 260);
  for (const x of [t, p, g]) assert.deepEqual(x.switches.trialAccounts, []);
  assert.equal(validateConfig(t).issues.length, 0, "the house app accepts it as is");
});

test("B6 log paging: newest batch first, batches + before + more, version on every row", async () => {
  const a = (await call(admin, "GET", "/admin/config/log?batches=2")).data;
  const batches = [...new Set(a.entries.map((e) => e.batch))];
  assert.equal(batches.length, 2); assert.equal(a.more, true);
  assert.ok(a.entries.every((e) => typeof e.version === "number"));
  const b = (await call(admin, "GET", `/admin/config/log?batches=2&before=${encodeURIComponent(batches[1])}`)).data;
  assert.ok(!b.entries.some((e) => batches.includes(e.batch)));
  assert.ok(Math.max(...b.entries.map((e) => e.version)) < Math.min(...a.entries.map((e) => e.version)));
});

test("B7 deleting an item: built-in -> 400 (hide only); an added item someone bought -> 409 owned + count; nobody bought -> removed and logged", async () => {
  let s = await live();
  const base = (await import("../worker/house-config.mjs")).bundledItems().items.find((i) => i.id === "desklamp-navy");
  const add = (id) => ({ id, add: true, item: { ...base, id, name: { en: "Test lamp " + id, ko: "시험 조명 " + id } } });
  const c = strip(s.draft || s.live); c.items = [...c.items, add("testlamp-a"), add("testlamp-b")];
  let r = await call(admin, "POST", "/admin/config/publish", { base: topOf(s), config: c });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  s = r.data;
  assert.equal((await call(admin, "DELETE", `/admin/house/items/desklamp-navy?base=${topOf(s)}`)).status, 400);
  db.prepare("INSERT INTO house_saves (account_key, save_json, rev, updated_at, size) VALUES ('p1:house', ?, 1, 1, 10)").run(JSON.stringify({ owned: { u9: { item: "testlamp-a", paid: 90 } } }));
  r = await call(admin, "DELETE", `/admin/house/items/testlamp-a?base=${topOf(s)}`);
  assert.equal(r.status, 409); assert.equal(r.data.reason, "owned"); assert.equal(r.data.count, 1);
  r = await call(admin, "DELETE", `/admin/house/items/testlamp-b?base=${topOf(s)}`);
  assert.equal(r.status, 200); assert.ok(!r.data.live.items.some((p) => p.id === "testlamp-b")); assert.ok(r.data.live.items.some((p) => p.id === "testlamp-a"));
  db.prepare("DELETE FROM house_saves").run();
});

test("B8 badges list and image upload (webp only, 300KB, new key each time, served by the existing image route)", async () => {
  const b = (await call(admin, "GET", "/admin/badges")).data;
  assert.ok(b.some((x) => x.id === "quiz100" && x.name.ko && x.emoji) && b.length >= 20);
  const webp = (n) => { const u = new Uint8Array(n); u.set([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]); return Buffer.from(u).toString("base64"); };
  assert.equal((await call(admin, "POST", "/admin/house/upload-image", { id: "poster-x", image: webp(100), mediaType: "image/png" })).status, 400);
  assert.equal((await call(admin, "POST", "/admin/house/upload-image", { id: "poster-x", image: Buffer.from("not a webp at all").toString("base64"), mediaType: "image/webp" })).status, 400);
  assert.equal((await call(admin, "POST", "/admin/house/upload-image", { id: "poster-x", image: webp(300 * 1024 + 1), mediaType: "image/webp" })).status, 413);
  const r = await call(admin, "POST", "/admin/house/upload-image", { id: "poster-x", image: webp(2000), mediaType: "image/webp" });
  assert.equal(r.status, 200); assert.match(r.data.img, /^r2:house3d\/poster-x-[a-z0-9]+\.webp$/);
  assert.ok(r2.has(r.data.img.slice(3)));
});

test("B9 (S3) house saves: per child slot, rev-checked, 200,000 chars, children 1-3 premium only", async () => {
  const save = (x) => JSON.stringify({ v: 1, rooms: { living: [] }, n: x });
  let r = await call(paid, "GET", "/house");
  assert.deepEqual(r.data, { json: null, rev: 0, updatedAt: null });
  r = await call(paid, "PUT", "/house", { json: save(1), rev: 0 }); assert.equal(r.status, 200); assert.equal(r.data.rev, 1);
  r = await call(paid, "PUT", "/house", { json: save(2), rev: 0 }); assert.equal(r.status, 409, "another device saved since"); assert.equal(r.data.rev, 1); assert.equal(JSON.parse(r.data.json).n, 1);
  r = await call(paid, "PUT", "/house", { json: save(2), rev: 1 }); assert.equal(r.status, 200); assert.equal(r.data.rev, 2);
  // two saves at the same moment
  const [x, y] = await Promise.all([call(paid, "PUT", "/house", { json: save(3), rev: 2 }), call(paid, "PUT", "/house", { json: save(4), rev: 2 })]);
  assert.deepEqual([x.status, y.status].sort(), [200, 409]);
  assert.equal((await call(paid, "PUT", "/house", { json: "x".repeat(200001), rev: 3 })).status, 413);
  assert.equal((await call(paid, "PUT", "/house", { json: "{bad", rev: 3 })).status, 400);
  r = await call(paid, "PUT", "/house?p=2", { json: save(20), rev: 0 }); assert.equal(r.status, 200);
  assert.equal(JSON.parse((await call(paid, "GET", "/house?p=2")).data.json).n, 20);
  assert.equal(JSON.parse((await call(paid, "GET", "/house")).data.json).n === 20, false, "child 0 and child 2 are separate rows");
  assert.equal((await call(free, "GET", "/house?p=2")).status, 403, "children 1-3 are premium only (the row stays)");
  r = await call(free, "PUT", "/house", { json: save(5), rev: 0 }); assert.equal(r.status, 200, "free accounts save child 0");
  assert.equal((await call(null, "GET", "/house")).status, 401, "guests keep their house on the device only");
  assert.ok(db.prepare("SELECT 1 FROM house_saves WHERE account_key = 'p1:p2:house'").get());
});

test("B10 removing a child or deleting the account removes their Koala House rows", async () => {
  db.prepare("INSERT INTO user_progress (account_key, progress_json, updated_at) VALUES ('p1:p2', '{}', 1)").run();
  assert.equal((await call(paid, "DELETE", "/profiles/progress?p=2")).status, 200);
  assert.ok(!db.prepare("SELECT 1 FROM house_saves WHERE account_key = 'p1:p2:house'").get());
  assert.ok(db.prepare("SELECT 1 FROM house_saves WHERE account_key = 'p1:house'").get(), "child 0 stays");
  assert.equal((await call(admin, "POST", "/admin/users/delete", { userId: "p1" })).status, 200);
  assert.ok(!db.prepare("SELECT 1 FROM house_saves WHERE account_key LIKE 'p1:%'").get());
});
