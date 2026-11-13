// Koala House link (stage 5 C2 / S4): public/js/koala-house-bridge.js + KoalaCore.houseWallet.
// Run: node --test tests/house-bridge.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import KoalaCore from "../public/js/koala-core.js";
import Link from "../public/js/koala-house-bridge.js";

const tick = () => new Promise((r) => setTimeout(r, 0));
function memKV() { const m = new Map(); return { m, get: (k) => (m.has(k) ? m.get(k) : null), set: (k, v) => m.set(k, String(v)), remove: (k) => m.delete(k), keys: () => [...m.keys()] }; }
// a fake /api/house: rows by p, rev-checked like worker/house.js
function fakeServer(opts = {}) {
  const rows = new Map(), calls = [];
  let down = !!opts.down;
  const fetch = async (url, init = {}) => {
    calls.push([init.method || "GET", url]);
    if (down) throw new TypeError("Failed to fetch");
    const u = new URL(url, "https://x.test"), p = Number(u.searchParams.get("p")) || 0;
    if (u.pathname === "/api/house/report") return new Response("{}", { status: 200 });
    if (opts.status) return new Response(JSON.stringify({ error: "x" }), { status: opts.status });
    if ((init.method || "GET") === "GET") { const r = rows.get(p); return new Response(JSON.stringify(r ? { json: r.json, rev: r.rev } : { json: null, rev: 0 }), { status: 200 }); }
    const b = JSON.parse(init.body), cur = rows.get(p) || { json: null, rev: 0 };
    if (b.json.length > 200000) return new Response("{}", { status: 413 });
    if (b.rev !== cur.rev) return new Response(JSON.stringify({ error: "conflict", rev: cur.rev, json: cur.json }), { status: 409 });
    rows.set(p, { json: b.json, rev: cur.rev + 1 });
    return new Response(JSON.stringify({ ok: true, rev: cur.rev + 1 }), { status: 200 });
  };
  return { rows, calls, fetch, setDown: (v) => { down = v; } };
}
function ctxOf(over = {}) {
  const progress = over.progressObj || { koala: { coins: 500, earned: 500 } };
  let saved = 0;
  const ctx = Object.assign({ tier: "paid", lang: "ko", n: 0, account: "u1", core: KoalaCore, progress: () => progress, saveProgress: () => { saved++; }, kv: memKV(), config: { version: 3 }, badges: ["quiz100"], close: () => { ctx.closed = (ctx.closed || 0) + 1; } }, over);
  ctx.savedCount = () => saved;
  return ctx;
}
const op = (key, why = "house:buy") => ({ key, why, name: { ko: "책상", en: "Desk" } });

test("C2-1a wallet: a keyed spend/refund/award happens once, undo rules, admin pays 0 but the key is kept", async () => {
  const s = fakeServer(), c = ctxOf({ fetch: s.fetch });
  const b = await Link.prepare(c);
  assert.equal(b.wallet.profile, 0); assert.equal(b.wallet.coins(), 500);
  assert.deepEqual(b.wallet.spend(90, op("house3d:buy:a1")), { ok: true, charged: 90 });
  assert.deepEqual(b.wallet.spend(90, op("house3d:buy:a1")), { ok: true, charged: 0, dup: true });
  assert.equal(b.wallet.coins(), 410);
  assert.deepEqual(b.wallet.spend(1000, op("house3d:buy:a2")), { ok: false, reason: "noCoins" });
  assert.deepEqual(b.wallet.refund(72, op("house3d:sell:a1")), { ok: true, credited: 72 });
  assert.deepEqual(b.wallet.award(30, op("house3d:quest:q1")), { ok: true, credited: 30 });
  const k = KoalaCore.ensureKoala(c.progress());
  assert.equal(k.coins, 512); assert.equal(k.spent, 90); assert.equal(k.refunded, 72); assert.equal(k.earned, 530, "award counts to level, a sale does not");
  // undo of a buy (save failed): refund with key + ':undo'; the buy key can't be spent again after that
  assert.equal(b.wallet.spend(50, op("house3d:buy:a3")).ok, true);
  assert.deepEqual(b.wallet.refund(50, op("house3d:buy:a3:undo")), { ok: true, credited: 50 });
  assert.deepEqual(b.wallet.spend(50, op("house3d:buy:a3")), { ok: false, reason: "used" }, "an undone key can't be used again (house FakeWallet rule)");
  assert.deepEqual(KoalaCore.houseWallet(c.progress(), "spend", 50, op("house3d:buy:a4"), {}).ok, true);
  KoalaCore.houseWallet(c.progress(), "refund", 50, op("house3d:buy:a4:undo"), {});
  assert.ok(k.ledger.some((e) => e.key === "house3d:buy:a1" && e.n === -90 && e.name && e.name.ko === "책상"));
  assert.ok(c.savedCount() >= 5, "every real move saves the site progress");
  // admin: unlimited, 0 coins move, key recorded with 0
  const ca = ctxOf({ tier: "admin", fetch: s.fetch }), ba = await Link.prepare(ca);
  assert.deepEqual(ba.wallet.spend(90, op("house3d:buy:z")), { ok: true, charged: 0 });
  assert.deepEqual(ba.wallet.refund(72, op("house3d:sell:z")), { ok: true, credited: 0 });
  assert.equal(KoalaCore.ensureKoala(ca.progress()).coins, 500);
  assert.ok(KoalaCore.ensureKoala(ca.progress()).ledger.some((e) => e.key === "house3d:buy:z" && e.n === 0));
  // a missing key is an error, never a free purchase
  assert.deepEqual(b.wallet.spend(10, { why: "x" }), { ok: false, reason: "error" });
});

test("C2-1b child numbers: free and guest always open child 0; paid keeps n; save/wallet/profile agree", async () => {
  const s = fakeServer();
  for (const [tier, n, want] of [["paid", 2, 2], ["admin", 3, 3], ["free", 2, 0], ["none", 1, 0]]) {
    const b = await Link.prepare(ctxOf({ tier, n, account: tier === "none" ? null : "u1", fetch: s.fetch }));
    assert.equal(b.profile.n, want, tier); assert.equal(b.save.profile, want); assert.equal(b.wallet.profile, want);
  }
});

test("C2-1c saves: server row per child, device copy, rev check, 409 keeps the other device's house, offline copy uploads later", async () => {
  const s = fakeServer(), kv = memKV();
  let b = await Link.prepare(ctxOf({ n: 1, fetch: s.fetch, kv }));
  assert.equal(b.save.load(), null, "new account: no house yet");
  assert.equal(b.save.store('{"v":1}'), true); await tick(); await tick();
  assert.deepEqual(s.rows.get(1), { json: '{"v":1}', rev: 1 }); assert.equal(s.rows.get(0), undefined, "child 1 only");
  assert.equal(b.save.pending(), false);
  assert.deepEqual(JSON.parse(kv.get("kh3:house:u:u1:p1")), { json: '{"v":1}', rev: 1, dirty: false });
  // another device saves rev 2
  s.rows.set(1, { json: '{"v":"other"}', rev: 2 });
  assert.equal(b.save.store('{"v":2}'), true); await tick(); await tick();
  assert.equal(s.rows.get(1).json, '{"v":"other"}', "409: never written over");
  assert.ok(kv.get("kh3:house:u:u1:p1:conflict"), "this device's version is kept aside");
  b = await Link.prepare(ctxOf({ n: 1, fetch: s.fetch, kv }));
  assert.equal(b.save.load(), '{"v":"other"}', "reopen: the newer server house");
  // offline: copy kept dirty, uploaded when back
  s.setDown(true);
  b = await Link.prepare(ctxOf({ n: 1, fetch: s.fetch, kv }));
  assert.equal(b.save.load(), '{"v":"other"}', "offline open: the device copy");
  assert.equal(b.save.store('{"v":3}'), true); await tick(); await tick();
  assert.equal(b.save.pending(), true);
  s.setDown(false);
  b = await Link.prepare(ctxOf({ n: 1, fetch: s.fetch, kv }));
  assert.equal(b.save.load(), '{"v":3}', "the device copy is newer (dirty, same rev) -> it wins");
  assert.equal(b.save.pending(), true);
  b.save.store(b.save.load()); await tick(); await tick();
  assert.deepEqual(s.rows.get(1), { json: '{"v":3}', rev: 3 }); assert.equal(b.save.pending(), false);
  // storeLocal (before close) marks it dirty without uploading
  b.save.storeLocal('{"v":4}'); assert.equal(b.save.pending(), true); assert.equal(s.rows.get(1).rev, 3);
  // guest: device only, the server is never asked
  const g = fakeServer(), gkv = memKV();
  const bg = await Link.prepare(ctxOf({ tier: "none", account: null, fetch: g.fetch, kv: gkv }));
  bg.save.store('{"g":1}'); await tick();
  assert.equal(g.calls.length, 0); assert.equal(JSON.parse(gkv.get("kh3:house:guest:p0")).json, '{"g":1}'); assert.equal(bg.save.pending(), false);
});

test("C2-1d too big (over 200,000 chars) stays on the device and is reported; 413 stops retrying", async () => {
  const s = fakeServer(), kv = memKV();
  const b = await Link.prepare(ctxOf({ fetch: s.fetch, kv }));
  const big = JSON.stringify({ x: "a".repeat(200001) });
  assert.equal(b.save.store(big), true); await tick();
  assert.equal(s.rows.get(0), undefined);
  assert.ok(s.calls.some(([m, u]) => m === "POST" && u === "/api/house/report"));
  assert.equal(JSON.parse(kv.get("kh3:house:u:u1:p0")).json.length, big.length);
});

test("C2-1e close: stops the sound, tells the site, then the bridge is dead (no more coins or saves)", async () => {
  const s = fakeServer(); let stops = 0;
  const c = ctxOf({ fetch: s.fetch, asmr: { play: () => true, stop: () => { stops++; }, toggle: () => true, has: () => true } });
  const b = await Link.prepare(c);
  let asked = 0; b.onCloseRequest(() => { asked++; b.close(); });
  b.requestClose(); assert.equal(asked, 1); assert.equal(c.closed, 1); assert.equal(stops, 1);
  assert.deepEqual(b.wallet.spend(10, op("house3d:buy:late")), { ok: false, reason: "error" });
  assert.equal(b.save.store("{}"), false);
  b.close(); assert.equal(c.closed, 1, "close only once");
  assert.equal(typeof b.asmr.unlock, "function");
});

test("C3 D6 a guest house on this device becomes a new account's house; an account that has a house keeps its own", async () => {
  const s = fakeServer(), kv = memKV();
  kv.set("kh3:house:guest:p0", JSON.stringify({ json: '{"guest":1}' }));
  let b = await Link.prepare(ctxOf({ account: "new1", fetch: s.fetch, kv }));
  assert.equal(b.save.load(), '{"guest":1}', "new account: the guest house");
  assert.equal(b.save.pending(), true, "to be uploaded");
  b.save.store(b.save.load()); await tick(); await tick();
  const rowsNew = s.rows.get(0); assert.equal(rowsNew.json, '{"guest":1}');
  assert.ok(kv.get("kh3:house:guest:p0"), "the guest copy stays on the device");
  // an account with a house already: its own house, the guest house untouched
  const s2 = fakeServer(); s2.rows.set(0, { json: '{"mine":1}', rev: 4 });
  b = await Link.prepare(ctxOf({ account: "old1", fetch: s2.fetch, kv }));
  assert.equal(b.save.load(), '{"mine":1}');
  assert.equal(JSON.parse(kv.get("kh3:house:guest:p0")).json, '{"guest":1}');
});

test("E Room Designer: placedCount counts placed furniture with an item name (starter pieces don't), save reports it", async () => {
  const save = (rooms, owned) => JSON.stringify({ v: 1, owned, rooms, storage: [] });
  assert.equal(Link.placedCount(save({ living: [{ uid: "p1" }, { uid: "p2" }] }, { p1: { paid: 0 }, p2: { paid: 0 } })), 0, "starter furniture");
  assert.equal(Link.placedCount(save({ living: [{ uid: "b1" }, { uid: "p2" }], bedroom: [{ uid: "s-floorlamp" }, { uid: "b2", parent: { uid: "b1" } }] },
    { b1: { item: "desk-oak", paid: 60 }, p2: { paid: 0 }, "s-floorlamp": { item: "floorlamp-butter", paid: 0 }, b2: { item: "lamp", paid: 20 } })), 3, "bought, stacked and taken out of storage");
  assert.equal(Link.placedCount("{ not json"), null);
  const s = fakeServer(), seen = [], c = ctxOf({ fetch: s.fetch, onHouseSaved: (i) => seen.push(i.placed) });
  const b = await Link.prepare(c);
  b.save.store(save({ living: [{ uid: "b1" }] }, { b1: { item: "sofa", paid: 70 } }));
  assert.deepEqual(seen, [1]);
});
