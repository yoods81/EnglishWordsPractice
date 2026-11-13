// Koala House stage 5 C4 / S6: moving into the new house — refunds for the old rooms (public/js/koala-legacy-rooms.js).
// Run: node --test tests/house-move.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import KoalaCore from "../public/js/koala-core.js";
import Legacy from "../public/js/koala-legacy-rooms.js";

const read = (p) => fs.readFileSync(new URL("../" + p, import.meta.url), "utf8");
// a fresh copy of the site scripts (to remove catalogue items for the "after S8" case without touching the shared one)
function freshSite() {
  const store = new Map();
  const win = { localStorage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) }, addEventListener() {}, location: { search: "" }, navigator: {}, matchMedia: () => ({ matches: false, addEventListener() {} }) };
  win.window = win; win.self = win; win.document = { addEventListener() {}, querySelector: () => null, createElement: () => ({ style: {}, getContext: () => null }), documentElement: { lang: "en" } };
  const ctx = vm.createContext(win);
  for (const f of ["public/js/koala-core.js", "public/js/koala-house.js"]) vm.runInContext(read(f), ctx, { filename: f });
  return { C: win.KoalaCore, H: win.KoalaHouse };
}
const { C: CS, H } = freshSite();
const memKV = (init = {}) => { const m = new Map(Object.entries(init)); return { m, get: (k) => (m.has(k) ? m.get(k) : null), set: (k, v) => m.set(k, String(v)), remove: (k) => m.delete(k) }; };
const clone = (x) => JSON.parse(JSON.stringify(x));
const pick = (ids) => Object.fromEntries(ids.map((id) => [id, 1]));
const priced = KoalaCore.ITEMS.filter((i) => i.kind === "room" && i.unlock && i.unlock.coins);
const progressOf = (owned = {}, subOwned = {}, extra = {}) => { const p = { koala: { coins: 0, earned: 0, items: { owned: clone(owned), subOwned: clone(subOwned), equipped: {}, sub: {}, sold: {} }, ledger: [] }, streak: {}, badges: {} }; KoalaCore.ensureKoala(p); Object.assign(p.koala, extra); return p; };
const many = pick([...priced.slice(0, 12).map((i) => i.id), "creamWall", "trophyCabinet"]);
const subs2d = pick(["koalaBook", "photoPicnic", "photoGrad", "toyTeddy", "pwScarf"]);
const subsMix = pick(["koalaBook", "toyRobot", "chocolate", "toolDrill", "shoeBoots", "mochiSquish", "clickPen"]);
const st = H.starter();
const popRich = JSON.stringify({ ...clone(st), owned: { ...st.owned, bedPink: 1, sofaGreen: 1, asmrBox: 3, ...pick(Object.values(H.D).filter((d) => d.price >= 80 && !st.owned[d.id] && d.id !== "asmrBox").slice(0, 4).map((d) => d.id)) },
  walls: { ...st.walls, sky: 1 }, houseStyles: { ...st.houseStyles, villa: 1 }, yardSizes: { ...st.yardSizes, wide: 1 },
  slots: { ...st.slots, s1: { type: "bedroom", items: [] }, s2: { type: "kitchen", items: [] } }, worn: { hat: "partyhat" } });
const run = (p, kv, over = {}) => Legacy.move(Object.assign({ moveOn: true, core: KoalaCore, progress: p, kv, n: 0, account: "u1", unlimited: false, now: 1800000000000, liveItem: KoalaCore.itemById }, over));

test("C4-1 MOVE off: nothing at all happens — wallet, device storage, no device id, no moving (6 sample wallets)", () => {
  const cases = [
    ["2D room items", progressOf(many, subs2d, { coins: 500, earned: 900 }), {}],
    ["Pop-out save on this device", progressOf({}, {}, { coins: 50, earned: 50 }), { "koalaHouse:v2": popRich }],
    ["ASMR toys + boxes", progressOf({}, pick(["mochiSquish", "clickPen", "waterBeads"]), { coins: 10, earned: 10 }), { "koalaHouse:v2": JSON.stringify({ ...clone(st), owned: { ...st.owned, asmrBox: 2 } }) }],
    ["broken Pop-out save", progressOf({}, {}), { "koalaHouse:v2": "{ not json" }],
    ["child 1", progressOf(pick(priced.slice(20, 24).map((i) => i.id))), {}],
    ["after a server merge", progressOf(many, {}, { coins: 1500, earned: 1500 }), {}],
  ];
  for (const [name, p, init] of cases) {
    const kv = memKV(init), before = JSON.stringify(p), kvBefore = JSON.stringify([...kv.m]);
    for (const over of [{ moveOn: false }, { moveOn: undefined }, { moveOn: true, account: null }]) {
      const r = run(p, kv, over);
      assert.equal(r.moving, undefined, name); assert.equal(r.changed, false, name);
      assert.equal(JSON.stringify(p), before, `${name}: wallet unchanged`);
      assert.equal(JSON.stringify([...kv.m]), kvBefore, `${name}: device storage unchanged (no device id, no marks)`);
    }
    assert.ok(!Object.keys(p.koala.keys || {}).some((k) => /^(refund:|move:)/.test(k)));
  }
});

test("C4-0 the old 3D wardrobe's 'worn' stays: moving never changes or removes koalaHouse:v2 (decision 5)", () => {
  const kv = memKV({ "koalaHouse:v2": popRich }), p = progressOf(many);
  run(p, kv);
  assert.equal(kv.get("koalaHouse:v2"), popRich);
  assert.deepEqual(JSON.parse(kv.get("koalaHouse:v2")).worn, { hat: "partyhat" });
});

test("C4-2 frozen prices = the live catalogue, and the amounts match the H9 refund rehearsal table", () => {
  // frozen table equals the catalogue it was made from
  for (const it of KoalaCore.ITEMS.filter((i) => i.kind === "room")) assert.equal(Legacy.DATA.room[it.id], (it.unlock && it.unlock.coins) || 0, it.id);
  const r2 = Legacy.room2d(progressOf({ redScarf: 1 }, subsMix).koala);
  assert.equal(r2.total, 137, "fake wallet 2: book 20 + robot 55 + chocolate 12 + drill 25 + boots 25; ASMR toys not refunded");
  const rehearsal = "I:/koala-house-3d/docs/review-2026-11-06/h9/refund-rehearsal.json";
  if (!fs.existsSync(rehearsal)) return;
  const rows = JSON.parse(fs.readFileSync(rehearsal, "utf8")).rows;
  const row = (w) => rows.find((r) => r.who.startsWith(w));
  assert.equal(Legacy.room2d(progressOf(many, subs2d).koala).total, row("가짜1").room2d, "fake 1: 2D room");
  // the rehearsal total includes the extra ASMR boxes ((3 - 1) x 60); the site leaves those to the house app (refund:asmrBox-extra:<device>)
  assert.equal(Legacy.houseV2(popRich).total + (3 - 1) * 60, row("가짜1").houseV2, "fake 1: Pop-out house + extra ASMR boxes (house app)");
  assert.equal(Legacy.houseV2("{ not json").total, 0);
  assert.equal(row("팝아웃 저장 깨짐").houseV2, 0);
  for (const n of [0]) assert.equal(Legacy.room2d(progressOf(pick(priced.slice(20, 24).map((i) => i.id))).koala).total, row("가짜4 무료 계정 자녀 0").now);
});

test("E MOVE on (REFUND_RATE 0): 0 coins, original amounts kept in moved, keys once per wallet / device, tidies the old room, passes bridge.moving", () => {
  assert.equal(Legacy.REFUND_RATE, 0, "2026-11 E decision: no refunds (all members are one family)");
  const kv = memKV({ "koalaHouse:v2": popRich }), p = progressOf(many, { ...subs2d, mochiSquish: 1 }, { coins: 100, earned: 1000, spent: 900 });
  const want2d = Legacy.room2d(p.koala).total, wantHouse = Legacy.houseV2(popRich).total;
  const lvBefore = KoalaCore.levelInfo(1000).level;
  const r = run(p, kv);
  assert.ok(want2d > 0 && wantHouse > 0);
  assert.equal(p.koala.coins, 100, "coins stay the same");
  assert.equal(p.koala.refunded || 0, 0);
  assert.equal(p.koala.moved.room2dItems.orig, want2d, "the worked-out amount is kept for support");
  assert.equal(p.koala.moved.houseV2Orig[r.moving.deviceId], wantHouse);
  assert.deepEqual(p.koala.keys["refund:room2d"].slice(0, 1), [0], "the key is written (0 coins)");
  assert.equal(r.moving.refundRate, 0, "the house app gets the rate too (extra ASMR boxes)");
  KoalaCore.ensureKoala(p);
  assert.equal(p.koala.earned, 1000, "③ earned and the level stay");
  assert.equal(KoalaCore.levelInfo(p.koala.earned).level, lvBefore);
  assert.ok(p.koala.moved.room2d && p.koala.moved.houseV2[r.moving.deviceId]);
  // priced old room items left the wallet (free room items come back by themselves until S8 removes them from the catalogue)
  assert.ok(!Object.keys(p.koala.items.owned).some((id) => Legacy.DATA.room[id] > 0), "old room items left the wallet");
  assert.ok(p.koala.items.subOwned.mochiSquish, "ASMR toys stay");
  assert.deepEqual(p.koala.moved.room2dItems.ids.length, Object.keys(many).length + Object.keys(subs2d).length);
  assert.deepEqual(r.moving.asmrToys, ["mochiSquish"]);
  assert.deepEqual(r.moving.refunded.sort((a, b) => a.key.localeCompare(b.key)), [{ key: `house-v2:${r.moving.deviceId}`, amount: 0 }, { key: "room2d", amount: 0 }], "no coin line on the move card");
  assert.equal(r.moving.house.owned.asmrBox, 3, "the device's old house goes to the house app (it moves one ASMR box)");
  // again: nothing more
  const coins = p.koala.coins, r2 = run(p, kv);
  assert.equal(p.koala.coins, coins); assert.equal(r2.changed, false); assert.ok(r2.moving.house, "same child still gets the house contents (the house app moves it once)");
  // another child on the same device: no device refund, no house contents; their own 2D room once
  const p2 = progressOf(pick(priced.slice(30, 33).map((i) => i.id)));
  const r3 = run(p2, kv, { n: 1 });
  assert.equal(p2.koala.coins, 0); assert.ok(p2.koala.moved.room2d, "child 1: the same rule (moved once, 0 coins)");
  assert.equal(r3.moving.house, undefined);
  assert.ok(!r3.moving.refunded.some((x) => x.key.startsWith("house-v2:")));
  // admin: 0 coins, marks and keys the same
  const pa = progressOf(many, {}, { coins: 0, earned: 0 }), ka = memKV({ "koalaHouse:v2": popRich });
  const ra = run(pa, ka, { unlimited: true, account: "adm" });
  assert.equal(pa.koala.coins, 0); assert.ok(pa.koala.moved.room2d); assert.deepEqual(ra.moving.refunded.map((x) => x.amount), [0, 0]);
});

test("C4-2 ① broken Pop-out save: 0 coins, raw text kept on the device", () => {
  const kv = memKV({ "koalaHouse:v2": "{ not json" }), p = progressOf({}, {});
  const r = run(p, kv);
  assert.equal(p.koala.coins, 0);
  const b = JSON.parse(kv.get("koalaHouse:v2.broken"));
  assert.equal(b.raw, "{ not json"); assert.equal(b.deviceId, r.moving.deviceId);
});

test("E ② two devices merged: moved once — no coins, no second move, the key travels with the merge", () => {
  const A = progressOf(many, {}, { coins: 1500, earned: 1500, spent: 0 });       // device A, not moved yet
  const B = progressOf(many, {}, { coins: 1500, earned: 1500 });                 // device B opens the house first
  B.koala.keys = {}; run(B, memKV());
  KoalaCore.houseWallet(B, "spend", 200, { key: "house3d:buy:p-1", why: "house3d:buy:sofa" }, {});
  assert.equal(B.koala.coins, 1300);
  KoalaCore.mergeRewards(A, B);
  assert.equal(A.koala.coins, 1300, "merged: B's purchase on top of A, no refund");
  assert.ok(A.koala.moved.room2d);
  const r = run(A, memKV());
  assert.equal(A.koala.coins, 1300, "opening again on A: nothing more");
  assert.equal(r.changed, false);
});

test("E 'after S8': the catalogue no longer has the old room items — an un-moved wallet keeps them until it moves (0 coins), once", () => {
  const { C } = freshSite();
  const roomIds = C.ITEMS.filter((i) => i.kind === "room").map((i) => i.id);
  for (let i = C.ITEMS.length - 1; i >= 0; i--) if (C.ITEMS[i].kind === "room") C.ITEMS.splice(i, 1);   // S8 removed them
  const owned = pick(priced.slice(0, 5).map((i) => i.id));
  const p = { koala: { coins: 10, earned: 10, items: { owned: clone(owned), subOwned: { koalaBook: 1 }, equipped: {}, sub: {}, sold: {} }, ledger: [] }, streak: {}, badges: {} };
  C.ensureKoala(p);
  for (const id of Object.keys(owned)) assert.ok(p.koala.items.owned[id], `kept ${id} (not refunded yet)`);
  const want = Legacy.room2d(p.koala).total;
  assert.ok(want > 0);
  Legacy.move({ moveOn: true, core: C, progress: p, kv: memKV(), n: 0, account: "u1", now: 1 });
  assert.equal(p.koala.coins, 10, "0 coins (REFUND_RATE 0)"); assert.equal(p.koala.moved.room2dItems.orig, want);
  C.ensureKoala(p);
  assert.ok(!Object.keys(p.koala.items.owned).some((id) => roomIds.includes(id)), "refunded: the old ids may go now");
  const coins = p.koala.coins; Legacy.move({ moveOn: true, core: C, progress: p, kv: memKV(), n: 0, account: "u1", now: 2 });
  assert.equal(p.koala.coins, coins, "exactly once");
});
