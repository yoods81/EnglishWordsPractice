// Daily question limits on the server (worker/usage.js). Run: node --experimental-sqlite --test tests/worker-usage.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import worker from "../worker/index.js";
import { usageDay } from "../worker/usage.js";

const db = new DatabaseSync(":memory:");
db.exec(fs.readFileSync(new URL("../schema.sql", import.meta.url), "utf8"));
const tick = () => new Promise((r) => setImmediate(r));
const wrap = (sql) => { let a = []; const st = { bind: (...x) => { a = x; return st; }, first: async () => { await tick(); return db.prepare(sql).get(...a) ?? null; }, all: async () => { await tick(); return { results: db.prepare(sql).all(...a) }; },
  run: async () => { await tick(); const r = db.prepare(sql).run(...a); return { meta: { changes: Number(r.changes) } }; }, _exec: () => db.prepare(sql).run(...a) }; return st; };
const env = { SESSION_SECRET: "secret", DB: { prepare: wrap, batch: async (s) => { s.forEach((x) => x._exec()); return []; } } };
async function cookie(id, role) { const exp = Date.now() + 1e6, p = `${id}.${role}.${exp}`; const k = await crypto.subtle.importKey("raw", new TextEncoder().encode("secret"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return `${p}.${Buffer.from(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(p))).toString("hex")}`; }
// who: { id, role } for an account, { gid: "<cookie value>" } for a signed-out device, null for a brand-new device.
async function call(who, method, path, body) {
  const h = { "content-type": "application/json" };
  if (who && who.id) h.cookie = `ywp_session=${encodeURIComponent(await cookie(who.id, who.role))}`;
  if (who && who.gid) h.cookie = `ywp_gid=${who.gid}`;
  const res = await worker.fetch(new Request("https://x.test/api" + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined }), env);
  const set = res.headers.get("set-cookie") || "";
  const gid = (set.match(/ywp_gid=([^;]+)/) || [])[1] || null;
  return { status: res.status, data: await res.json().catch(() => null), gid };
}
const admin = { id: "a1", role: "admin" }, free = { id: "f1", role: "free" }, free2 = { id: "f2", role: "free" }, paid = { id: "p1", role: "paid" };
for (const [id, name, role] of [["a1", "boss@x.au", "admin"], ["f1", "kid@x.au", "free"], ["f2", "kid2@x.au", "free"], ["p1", "prem@x.au", "paid"]])
  db.prepare("INSERT INTO users (id,username,password_hash,password_salt,role,created_at,email,email_verified_at) VALUES (?,?,?,?,?,?,?,1)").run(id, name, "h", "s", role, 1, name);

test("U1 caps by tier come from the settings defaults (guest 30 / 1 round, free 100, premium & admin unlimited)", async () => {
  const g = await call(null, "GET", "/usage?tz=0");
  assert.equal(g.status, 200);
  assert.deepEqual(g.data.caps, { quiz: 30, spelling: 30, tt: 30, flash: 1, type: 1 });
  assert.ok(g.gid, "a new device gets a signed id cookie");
  const f = await call(free, "GET", "/usage?tz=0");
  assert.deepEqual(f.data.caps, { quiz: 100, spelling: 100, tt: 100, flash: null, type: null });
  for (const who of [paid, admin]) {
    const r = await call(who, "GET", "/usage?tz=0");
    assert.equal(r.data.tier, "unlimited");
    assert.ok(Object.values(r.data.caps).every((c) => c === null));
    const add = await call(who, "POST", "/usage", { tz: 0, mode: "quiz", n: 500 });
    assert.equal(add.data.cap, null);
  }
  assert.equal(db.prepare("SELECT COUNT(*) c FROM daily_usage WHERE who IN ('u:p1','u:a1')").get().c, 0, "premium/admin are never stored");
});

test("U2 a free account's count is shared by every device and never goes past the cap", async () => {
  let r = await call(free, "POST", "/usage", { tz: -600, mode: "quiz", n: 60 });
  assert.equal(r.data.used, 60); assert.equal(r.data.left, 40); assert.equal(r.data.added, 60);
  r = await call(free, "POST", "/usage", { tz: -600, mode: "quiz", n: 60 });   // "another device"
  assert.equal(r.data.used, 100); assert.equal(r.data.left, 0); assert.equal(r.data.added, 40);
  r = await call(free, "GET", "/usage?tz=-600");
  assert.equal(r.data.used.quiz, 100); assert.equal(r.data.used.spelling, 0, "modes are counted separately");
  const other = await call(free2, "GET", "/usage?tz=-600");
  assert.equal(other.data.used.quiz, 0, "accounts do not share");
});

test("U3 two reports at the same moment still stop at the cap", async () => {
  await Promise.all(Array.from({ length: 8 }, () => call(free2, "POST", "/usage", { tz: 0, mode: "spelling", n: 20 })));
  assert.equal((await call(free2, "GET", "/usage?tz=0")).data.used.spelling, 100);
});

test("U4 a signed-out device keeps its count with its cookie; a forged or missing cookie is a new device", async () => {
  const first = await call(null, "POST", "/usage", { tz: 0, mode: "tt", n: 25 });
  const gid = first.gid; assert.ok(gid);
  let r = await call({ gid }, "POST", "/usage", { tz: 0, mode: "tt", n: 10 });
  assert.equal(r.data.used, 30); assert.equal(r.data.left, 0); assert.equal(r.gid, null, "a valid cookie is not replaced");
  r = await call({ gid }, "POST", "/usage", { tz: 0, mode: "flash", n: 1 });
  assert.equal(r.data.left, 0, "one free flashcard round a day");
  const [id] = decodeURIComponent(gid).split(".");
  const forged = await call({ gid: encodeURIComponent(`${id}.0000000000000000ffffffffffffffff`) }, "GET", "/usage?tz=0");
  assert.equal(forged.data.used.tt, 0); assert.ok(forged.gid, "forged cookie -> fresh id");
});

test("U5 the admin's 이용 제한 settings change the caps", async () => {
  const s = (await call(admin, "GET", "/admin/config")).data;
  const { version: _v, channel: _c, ...cfg } = s.live;
  cfg.limits.dailyMax.free = 60;
  const pub = await call(admin, "POST", "/admin/config/publish", { base: Math.max(s.live.version, s.draft ? s.draft.version : 0), config: cfg });
  assert.equal(pub.status, 200, JSON.stringify(pub.data));
  const f = await call(free, "GET", "/usage?tz=0");
  assert.equal(f.data.caps.quiz, 60);
});

test("U6 bad input is refused; the day follows the learner's time zone", async () => {
  assert.equal((await call(free, "POST", "/usage", { tz: 0, mode: "nope", n: 1 })).status, 400);
  assert.equal((await call(free, "PUT", "/usage", {})).status, 405);
  const r = await call(free, "POST", "/usage", { tz: 0, mode: "tt", n: -5 });
  assert.equal(r.data.added, 0);
  const noon = Date.UTC(2026, 10, 21, 20, 0); // 20:00 UTC = next day 07:00 in Sydney (tz -660)
  assert.equal(usageDay(-660, noon), usageDay(0, noon) + 1);
  assert.equal(usageDay(99999, noon), usageDay(840, noon), "tz is clamped");
});
