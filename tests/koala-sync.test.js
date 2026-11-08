// Koala wallet sync safety (Koala House stage 5 — A bundle): keys ("only once"), two-device merges, earned/level,
// key trimming. Numbers match the koala-house-3d H9 refund rehearsal (docs/review-2026-11-06/h9/refund-rehearsal.json).
// Run: node --test tests/koala-sync.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const K = require("../public/js/koala-core.js");

const clone = (x) => JSON.parse(JSON.stringify(x));
const wallet = (k) => { const p = { koala: clone(k), streak: {}, badges: {} }; K.ensureKoala(p); return p; };
const merge = (local, remote) => { const p = clone(local); K.mergeRewards(p, clone(remote)); return p; };
// The S6 refund will pay old rooms once per wallet (moved.room2d). Stand-in for the test: pay R if not moved yet.
const openRefund = (p, R, now) => { const k = K.ensureKoala(p); if (k.moved.room2d) return 0; const n = K.creditSale(p, R, "move:room2d", { key: "refund:room2d", now }); k.moved.room2d = now; return n; };

test("T1 an old (v1) wallet loads without losing anything and gets keys", () => {
  const old = { v: 1, coins: 340, earned: 900, spent: 560, refunded: 0, items: { owned: { redScarf: 1, mintWall: 2 }, equipped: {}, sub: {}, subOwned: { koalaBook: 3 }, sold: {} },
    ledger: [{ t: 10, n: 15, why: "quiz", key: "learn:quiz:2026-10-01:0" }, { t: 20, n: -60, why: "buy" }, { t: 30, n: 50, why: "dailyMission", key: "mission:2026-10-01" }] };
  const p = wallet(old), k = p.koala;
  assert.equal(k.v, 2);
  assert.deepEqual([k.coins, k.earned, k.spent, k.refunded], [340, 900, 560, 0]);
  assert.ok(k.items.owned.redScarf && k.items.owned.mintWall && k.items.subOwned.koalaBook);
  assert.deepEqual(k.keys["mission:2026-10-01"], [50, 30]);
  assert.equal(k.keysSince, 30); // older history may be cut: never re-applied by a merge
  assert.deepEqual(k.moved, {});
});

test("T5 a key pays once: award, refund (creditSale), spend (dup) and an undone spend (used)", () => {
  const p = wallet({ coins: 500, earned: 500 });
  assert.equal(K.awardCoins(p, 20, "x", { key: "a:1", now: 1 }), 20);
  assert.equal(K.awardCoins(p, 20, "x", { key: "a:1", now: 2 }), 0);
  assert.equal(K.creditSale(p, 30, "sell", { key: "house3d:sell:p1", now: 3 }), 30);
  assert.equal(K.creditSale(p, 30, "sell", { key: "house3d:sell:p1", now: 4 }), 0);
  const o1 = { key: "house3d:buy:p2", now: 5 };
  assert.equal(K.spendCoins(p, 100, "buy", o1), true); assert.equal(o1.result, undefined);
  const o2 = { key: "house3d:buy:p2", now: 6 };
  assert.equal(K.spendCoins(p, 100, "buy", o2), true); assert.equal(o2.result, "dup");
  K.creditSale(p, 100, "undo", { key: "house3d:buy:p3:undo", now: 7 });
  const o3 = { key: "house3d:buy:p3", now: 8 };
  assert.equal(K.spendCoins(p, 100, "buy", o3), false); assert.equal(o3.result, "used");
  assert.equal(p.koala.coins, 500 + 20 + 30 - 100 + 100);
});

test("T6 two devices, H9 rehearsal numbers: coins 2,230 and opening again refunds 0", () => {
  const R = 930;
  const A = wallet({ coins: 1500, earned: 1500 }); // this device: earned more, not refunded yet
  const B = wallet({ coins: 1400, earned: 1400 }); // server: refunded, then bought for the house
  assert.equal(openRefund(B, R, 1000), R);
  assert.equal(K.spendCoins(B, 200, "house3d:buy:sofa", { key: "house3d:buy:p-1", now: 1001 }), true);
  assert.equal(B.koala.coins, 2130);
  assert.equal(B.koala.earned, 1400, "the refund does not count as earned");
  const m = merge(A, B);
  assert.equal(m.koala.coins, 2230, "1500 + 930 - 200");
  assert.ok(m.koala.moved.room2d, "moved survives the merge");
  assert.equal(openRefund(m, R, 2000), 0, "opening again refunds nothing");
  assert.equal(m.koala.coins, 2230);
  // the old rule kept B's coins and dropped moved: 2,130 + 930 again — must not happen
  assert.notEqual(m.koala.coins, 2130);
});

test("T7 both devices earn and spend: both sides count, a shared key once, keys survive a cut ledger", () => {
  const A = wallet({ coins: 100, earned: 100 }), B = wallet({ coins: 100, earned: 100 });
  K.awardCoins(A, 50, "dailyMission", { key: "mission:2026-11-01", now: 10 });
  K.awardCoins(B, 50, "dailyMission", { key: "mission:2026-11-01", now: 11 }); // same mission on both: once
  K.awardCoins(A, 15, "quiz", { key: "learn:quiz:2026-11-01:0", now: 12 });
  K.awardCoins(B, 15, "spelling", { key: "learn:spelling:2026-11-01:0", now: 13 });
  K.spendCoins(B, 40, "buy", { key: "house3d:buy:b1", now: 14 });
  for (let i = 0; i < 150; i++) K.awardCoins(B, 1, "tiny", { key: "learn:tt:2026-11-02:" + i, now: 100 + i }); // ledger cut at 100
  assert.equal(B.koala.ledger.length, 100);
  const m = merge(A, B), m2 = merge(B, A);
  const expect = 100 + 50 + 15 + 15 - 40 + 150; // each device's own work once, the mission once
  assert.equal(m.koala.coins, expect);
  assert.equal(m2.koala.coins, expect, "same result whichever side merges");
  assert.ok(m.koala.keys["learn:tt:2026-11-02:0"], "keys pushed out of the ledger are still known");
  assert.equal(merge(m, B).koala.coins, expect, "merging again adds nothing");
});

test("T9 a device that was off for months does not re-apply keys the other side has forgotten", () => {
  const now = 200 * 86400000;
  const A = wallet({ coins: 1000, earned: 1000 });
  K.awardCoins(A, 30, "quiz", { key: "learn:quiz:old", now: 10 * 86400000 });
  K.trimKeys(A, now); // 190 days later: the old key is dropped, keysSince moves past it
  assert.ok(!A.koala.keys["learn:quiz:old"]);
  const B = wallet({ coins: 500, earned: 500 });
  K.awardCoins(B, 30, "quiz", { key: "learn:quiz:old", now: 10 * 86400000 }); // the same old key, never synced
  const m = merge(A, B);
  assert.equal(m.koala.coins, 1030, "the old key is not paid twice");
});

test("T10 a refund never raises earned or the level, even after save and reload", () => {
  const p = wallet({ coins: 100, earned: 1000, spent: 900, refunded: 0 });
  const lv0 = JSON.stringify(K.levelInfo(p.koala.earned));
  K.creditSale(p, 930, "move:room2d", { key: "refund:room2d", now: 1 });
  const reloaded = wallet(JSON.parse(JSON.stringify(p.koala)));
  assert.equal(reloaded.koala.coins, 1030);
  assert.equal(reloaded.koala.earned, 1000, "was 1030 with the old rule");
  assert.equal(JSON.stringify(K.levelInfo(reloaded.koala.earned)), lv0);
  // a wallet whose earned was already raised keeps it (never lowered)
  assert.equal(wallet({ coins: 1030, earned: 1030, refunded: 930 }).koala.earned, 1030);
});

test("T13 a locked child's wallet keeps its old room items and coins", () => {
  const p = wallet({ coins: 77, earned: 400, items: { owned: { mintWall: 5, nightWall: 6 }, equipped: { wallpaper: "nightWall" }, sub: {}, subOwned: { photoZoo: 7 }, sold: {} } });
  assert.equal(p.koala.coins, 77);
  assert.ok(p.koala.items.owned.mintWall && p.koala.items.owned.nightWall && p.koala.items.subOwned.photoZoo);
});

test("T14 admin (unlimited): 0 coins move but the key is kept", () => {
  const p = wallet({ coins: 0, earned: 0 });
  assert.equal(K.creditSale(p, 120, "sell", { key: "house3d:sell:p9", unlimited: true, now: 5 }), 0);
  assert.equal(p.koala.coins, 0);
  assert.deepEqual(p.koala.keys["house3d:sell:p9"], [0, 5]);
  assert.equal(K.creditSale(p, 120, "sell", { key: "house3d:sell:p9", unlimited: true, now: 6 }), 0);
});

test("T15 an admin gift applied on one device is applied once after merging", () => {
  const A = wallet({ coins: 200, earned: 300 }), B = wallet({ coins: 100, earned: 100 });
  K.adjustCoins(B, 50, "adminGift", { key: "grant:7", now: 20 });
  K.adjustCoins(A, -30, "adminAdjust", { key: "grant:8", now: 21 }); // a correction on the other device
  const m = merge(A, B);
  assert.equal(m.koala.coins, 200 - 30 + 50);
  K.adjustCoins(m, 50, "adminGift", { key: "grant:7", now: 30 }); // the grant list shows it again: still once
  assert.equal(m.koala.coins, 220);
});

test("T16 a huge wallet is trimmed under the limit; refund keys stay", () => {
  const p = wallet({ coins: 10, earned: 10 });
  K.creditSale(p, 5, "move:room2d", { key: "refund:room2d", now: 1 });
  for (let i = 0; i < 3000; i++) K.awardCoins(p, 1, "x", { key: "learn:quiz:2026-11-05:" + i + ":" + "pad".repeat(5), now: 1000 + i });
  const before = Object.keys(p.koala.keys).length;
  const dropped = K.fitWallet(p, 80000, 2000);
  assert.ok(JSON.stringify(p.koala).length <= 80000);
  assert.ok(dropped > 0 && Object.keys(p.koala.keys).length < before);
  assert.ok(p.koala.keys["refund:room2d"], "refund keys are kept forever");
  assert.ok(p.koala.keysSince > 1000);
});

test("rewards are not paid twice after merging two devices: badge, daily rounds, mission, review (2 a day)", () => {
  const day = "2026-11-06";
  const A = wallet({ coins: 0, earned: 0 }), B = wallet({ coins: 0, earned: 0 });
  for (const p of [A, B]) {
    K.awardBadge(p, "quiz100", { now: 1 });
    K.awardLearning(p, "quiz", 60, day, { now: 2 }); // 3 paid rounds + bonus rounds
    K.awardMission(p, day, { now: 3 });
    K.awardReview(p, day + ":1", { now: 4 }); K.awardReview(p, day + ":2", { now: 5 });
  }
  const one = A.koala.coins;
  const m = merge(A, B);
  assert.equal(m.koala.coins, one, "the same keys are paid once");
  // after the merge the app asks again (the ledger was synced): nothing more
  K.awardBadge(m, "quiz100", { now: 9 }); K.awardLearning(m, "quiz", 60, day, { now: 9 }); K.awardMission(m, day, { now: 9 });
  K.awardReview(m, day + ":1", { now: 9 }); K.awardReview(m, day + ":2", { now: 9 });
  assert.equal(m.koala.coins, one);
});

test("coins-down check: only a result below 'winner + the other side's unseen keyed moves' counts; normal purchases do not", () => {
  const A = wallet({ coins: 500, earned: 500 }), B = wallet({ coins: 300, earned: 300 });
  K.spendCoins(B, 120, "buy", { key: "house3d:buy:x", now: 5 }); // a normal purchase on the other device
  const expected = K.mergeExpectedCoins(A.koala, B.koala);
  assert.equal(expected, 380);
  const m = merge(A, B);
  assert.equal(m.koala.coins, 380);
  assert.ok(!(m.koala.coins < expected), "a purchase is not a loss");
  // a lost refund is a loss
  const C = wallet({ coins: 100, earned: 100 });
  K.creditSale(C, 900, "move:room2d", { key: "refund:room2d", now: 6 });
  const exp2 = K.mergeExpectedCoins(wallet({ coins: 1000, earned: 1000 }).koala, C.koala);
  assert.equal(exp2, 1900);
  assert.ok(1000 < exp2, "the old rule's 1000 is a loss");
});

test("T18 the site's sample wallets (docs/koala-house) load unchanged: coins, earned, owned; a save and reload keeps them", () => {
  const fs = require("node:fs"), path = require("node:path");
  for (const f of ["sample-progress-free.json", "sample-progress-premium.json"]) {
    const raw = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "docs", "koala-house", f), "utf8"));
    const before = { coins: raw.koala.coins, earned: raw.koala.earned, owned: Object.keys(raw.koala.items.owned).sort() };
    const p = clone(raw); K.ensureKoala(p);
    const again = JSON.parse(JSON.stringify(p)); K.ensureKoala(again);
    for (const w of [p, again]) {
      assert.equal(w.koala.coins, before.coins, f);
      assert.equal(w.koala.earned, before.earned, f);
      assert.deepEqual(Object.keys(w.koala.items.owned).sort(), before.owned, f);
    }
    assert.equal(Object.keys(p.koala.keys).length, raw.koala.ledger.filter((e) => e.key).length, f + ": keys built from the ledger");
  }
});
