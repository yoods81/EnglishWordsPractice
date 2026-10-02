// Run with: npm test   (node --test)
const test = require("node:test");
const assert = require("node:assert/strict");
const K = require("../public/js/koala-core.js");

test("awardCoins adds coins, records a ledger entry and never goes negative", () => {
  const p = {};
  assert.equal(K.awardCoins(p, 5, "quiz"), 5);
  assert.equal(K.awardCoins(p, 15, "mission"), 15);
  assert.equal(K.awardCoins(p, -3, "wrong answer"), 0);
  assert.equal(K.awardCoins(p, 0, "nothing"), 0);
  assert.equal(K.awardCoins(p, "abc", "junk"), 0);
  assert.equal(p.koala.coins, 20);
  assert.equal(p.koala.earned, 20);
  assert.equal(p.koala.ledger.length, 2);
  assert.equal(p.koala.ledger[1].why, "mission");
});

test("awardCoins with a key is idempotent", () => {
  const p = {};
  assert.equal(K.awardCoins(p, 15, "mission", { key: "mission:2026-10-02" }), 15);
  assert.equal(K.awardCoins(p, 15, "mission", { key: "mission:2026-10-02" }), 0);
  assert.equal(K.awardCoins(p, 15, "mission", { key: "mission:2026-10-03" }), 15);
  assert.equal(p.koala.coins, 30);
});

test("ledger is capped to ledgerMax, newest kept", () => {
  const p = {};
  const max = K.REWARD_CONFIG.ledgerMax;
  for (let i = 0; i < max + 10; i++) K.awardCoins(p, 1, "r" + i);
  assert.equal(p.koala.ledger.length, max);
  assert.equal(p.koala.ledger[max - 1].why, "r" + (max + 9));
  assert.equal(p.koala.coins, max + 10);
});

test("ensureKoala repairs bad saved data", () => {
  const p = { koala: { coins: -4, earned: "x", ledger: "nope" } };
  const k = K.ensureKoala(p);
  assert.equal(k.coins, 0);
  assert.equal(k.earned, 0);
  assert.deepEqual(k.ledger, []);
});

test("levelInfo follows the configured thresholds", () => {
  assert.equal(K.levelInfo(0).level, 1);
  assert.equal(K.levelInfo(49).level, 1);
  assert.equal(K.levelInfo(50).level, 2);
  assert.equal(K.levelInfo(220).level, 4);
  const l = K.levelInfo(125);
  assert.equal(l.level, 3);
  assert.equal(l.toNext, 95);
  assert.equal(l.pct, 5); // 5 coins into a 100-coin level
  // beyond the table every level costs levelStepAfter more
  const t = K.REWARD_CONFIG.levelThresholds;
  const last = t[t.length - 1];
  assert.equal(K.levelInfo(last).level, t.length);
  assert.equal(K.levelInfo(last + K.REWARD_CONFIG.levelStepAfter).level, t.length + 1);
});

test("weekKey is the Monday of the week", () => {
  assert.equal(K.weekKey("2026-10-02"), "2026-09-28"); // Fri -> Mon
  assert.equal(K.weekKey("2026-09-28"), "2026-09-28"); // Mon
  assert.equal(K.weekKey("2026-10-04"), "2026-09-28"); // Sun
  assert.equal(K.weekKey("2026-10-05"), "2026-10-05"); // next Mon
});

test("streak: first day, consecutive days, same day is a no-op", () => {
  const s = { count: 0, lastDay: null };
  assert.equal(K.advanceStreak(s, "2026-10-01").changed, true);
  assert.equal(s.count, 1);
  assert.equal(K.advanceStreak(s, "2026-10-01").changed, false);
  K.advanceStreak(s, "2026-10-02");
  assert.equal(s.count, 2);
  assert.equal(s.best, 2);
});

test("streak: one missed day is forgiven once per week", () => {
  const s = { count: 5, lastDay: "2026-09-29" }; // Tue
  const r = K.advanceStreak(s, "2026-10-01"); // Thu, missed Wed
  assert.equal(r.usedRest, true);
  assert.equal(s.count, 6);
  // another gap in the same week (missed Fri, practise Sat) is not forgiven
  const r2 = K.advanceStreak(s, "2026-10-03");
  assert.equal(r2.usedRest, false);
  assert.equal(s.count, 1);
  assert.equal(s.best, 6, "best is never lost");
});

test("streak: rest day is available again the next week", () => {
  const s = { count: 3, lastDay: "2026-09-29" };
  K.advanceStreak(s, "2026-10-01"); // uses week of 28 Sep
  assert.equal(s.count, 4);
  K.advanceStreak(s, "2026-10-02");
  K.advanceStreak(s, "2026-10-03");
  K.advanceStreak(s, "2026-10-04"); // Sun, count 7
  K.advanceStreak(s, "2026-10-05"); // Mon
  const r = K.advanceStreak(s, "2026-10-07"); // missed Tue... Wed practised? gap 2 -> missed Tue (new week)
  assert.equal(r.usedRest, true);
  assert.equal(s.count, 9);
});

test("streak: two or more missed days start a new streak", () => {
  const s = { count: 9, lastDay: "2026-09-29" };
  K.advanceStreak(s, "2026-10-02");
  assert.equal(s.count, 1);
  assert.equal(s.best, 9);
});

test("streak: month/year boundaries", () => {
  const s = { count: 2, lastDay: "2026-12-31" };
  K.advanceStreak(s, "2027-01-01");
  assert.equal(s.count, 3);
  assert.equal(K.daysBetween("2026-02-28", "2026-03-01"), 1);
});

test("streak: old saves without best/restWeek keep working", () => {
  const s = { count: 4, lastDay: "2026-10-01" };
  K.advanceStreak(s, "2026-10-02");
  assert.equal(s.count, 5);
  assert.equal(s.best, 5);
});

test("streakStatus shows 0 once a streak can no longer be saved, keeps best", () => {
  const live = K.streakStatus({ count: 7, lastDay: "2026-10-01", best: 9 }, "2026-10-02", 2);
  assert.equal(live.count, 7);
  assert.equal(live.countedToday, false);
  assert.equal(live.answersToGo, 3);
  assert.equal(live.nextMilestone, 14);
  const saved = K.streakStatus({ count: 7, lastDay: "2026-09-30", best: 9 }, "2026-10-02", 0);
  assert.equal(saved.count, 7, "one missed day with rest available is still alive");
  const dead = K.streakStatus({ count: 7, lastDay: "2026-09-28", best: 9 }, "2026-10-02", 0);
  assert.equal(dead.count, 0);
  assert.equal(dead.best, 9);
  const done = K.streakStatus({ count: 7, lastDay: "2026-10-02", best: 9 }, "2026-10-02", 8);
  assert.equal(done.countedToday, true);
  assert.equal(done.answersToGo, 0);
});

/* ---------------- Phase 2: character items ---------------- */
const A = require("../public/js/koala-art.js");

test("free items are owned from the start; others are not", () => {
  const p = {};
  const k = K.ensureKoala(p);
  assert.ok(k.items.owned.redScarf, "free scarf owned");
  assert.equal(k.items.owned.blueCap, undefined);
  assert.equal(K.itemStatus(p, K.itemById("redScarf")).state, "owned");
});

test("locked coin item reports exactly how many coins are missing", () => {
  const p = {};
  K.awardCoins(p, 20, "quiz");
  const s = K.itemStatus(p, K.itemById("blueCap"));
  assert.deepEqual(s, { state: "locked", need: "coins", cost: 50, short: 30 });
});

test("buying an item spends coins, owns and wears it; level is unaffected", () => {
  const p = {};
  K.awardCoins(p, 60, "quiz");
  assert.equal(K.itemStatus(p, K.itemById("blueCap")).state, "buyable");
  const r = K.buyItem(p, "blueCap");
  assert.equal(r.ok, true);
  assert.equal(p.koala.coins, 10);
  assert.equal(p.koala.earned, 60, "lifetime earned is not reduced by spending");
  assert.equal(p.koala.items.equipped.headwear, "blueCap");
  assert.equal(p.koala.ledger[p.koala.ledger.length - 1].n, -50);
  assert.equal(K.itemStatus(p, K.itemById("blueCap")).state, "equipped");
  assert.equal(K.levelInfo(p.koala.earned).level, 2);
});

test("cannot buy without enough coins, twice, or a non-shop item", () => {
  const p = {};
  K.awardCoins(p, 10, "quiz");
  assert.deepEqual(K.buyItem(p, "blueCap"), { ok: false, reason: "notEnoughCoins" });
  assert.equal(p.koala.coins, 10, "nothing taken on a failed purchase");
  K.awardCoins(p, 100, "quiz");
  assert.equal(K.buyItem(p, "blueCap").ok, true);
  assert.deepEqual(K.buyItem(p, "blueCap"), { ok: false, reason: "owned" });
  assert.deepEqual(K.buyItem(p, "crown"), { ok: false, reason: "notForSale" });
  assert.deepEqual(K.buyItem(p, "nope"), { ok: false, reason: "notForSale" });
});

test("spendCoins never overdraws and ignores bad amounts", () => {
  const p = {};
  K.awardCoins(p, 5, "x");
  assert.equal(K.spendCoins(p, 6, "y"), false);
  assert.equal(K.spendCoins(p, -1, "y"), false);
  assert.equal(K.spendCoins(p, 0, "y"), false);
  assert.equal(p.koala.coins, 5);
});

test("equip / unequip: one item per slot, only owned items", () => {
  const p = {};
  K.awardCoins(p, 500, "x");
  K.buyItem(p, "blueCap");
  K.buyItem(p, "gradHat"); // replaces the cap in the headwear slot
  assert.equal(p.koala.items.equipped.headwear, "gradHat");
  assert.equal(K.equipItem(p, "blueCap"), true);
  assert.equal(p.koala.items.equipped.headwear, "blueCap");
  assert.equal(K.equipItem(p, "sunglasses"), false, "not owned");
  assert.equal(K.unequipSlot(p, "headwear"), true);
  assert.equal(K.unequipSlot(p, "headwear"), false);
  assert.equal(K.itemStatus(p, K.itemById("blueCap")).state, "owned");
});

test("streak item unlocks from the best streak, with the missing days shown", () => {
  const p = { streak: { count: 0, lastDay: null, best: 4 } };
  const s = K.itemStatus(p, K.itemById("crown"));
  assert.deepEqual(s, { state: "locked", need: "streak", days: 7, have: 4 });
  assert.deepEqual(K.syncStreakUnlocks(p), []);
  p.streak.best = 7;
  assert.deepEqual(K.syncStreakUnlocks(p), ["crown"]);
  assert.deepEqual(K.syncStreakUnlocks(p), [], "only announced once");
  assert.equal(K.itemStatus(p, K.itemById("crown")).state, "owned");
});

test("nextReward is the cheapest coin item not yet owned", () => {
  const p = {};
  K.awardCoins(p, 20, "x");
  let n = K.nextReward(p);
  assert.equal(n.item.id, "blueCap");
  assert.equal(n.toGo, 30);
  assert.equal(n.pct, 40);
  assert.equal(n.affordable, false);
  K.awardCoins(p, 30, "x");
  assert.equal(K.nextReward(p).affordable, true);
  K.buyItem(p, "blueCap");
  assert.equal(K.nextReward(p).item.id, "roundGlasses");
});

test("nextReward is null once every coin item is owned", () => {
  const p = {};
  K.awardCoins(p, 5000, "x");
  K.ITEMS.filter((i) => i.unlock.coins).forEach((i) => K.buyItem(p, i.id));
  assert.equal(K.nextReward(p), null);
});

test("saved data with removed or mismatched items is repaired", () => {
  const p = { koala: { items: { owned: { ghost: 1, blueCap: 1 }, equipped: { headwear: "ghost", face: "blueCap", clothing: "heroCape" } } } };
  const k = K.ensureKoala(p);
  assert.equal(k.items.owned.ghost, undefined);
  assert.deepEqual(k.items.equipped, {}, "ghost, wrong-slot and unowned items are dropped");
});

test("catalogue is consistent: every item has art, a valid slot and a requirement", () => {
  const ids = new Set();
  K.ITEMS.forEach((it) => {
    assert.ok(!ids.has(it.id), "unique id " + it.id); ids.add(it.id);
    assert.ok(K.ITEM_SLOTS.includes(it.slot), "slot " + it.slot);
    assert.ok(it.name.en && it.name.ko);
    assert.ok(it.unlock.free || it.unlock.coins > 0 || it.unlock.streak > 0);
    assert.ok(A.hasArt(it.id), "art for " + it.id);
  });
  assert.ok(K.ITEMS.length >= 5 && K.ITEMS.length <= 10, "small first catalogue");
});

test("avatar draws only what is equipped, in the right layers", () => {
  const bare = A.avatar({});
  assert.ok(!bare.includes("data-item"));
  const dressed = A.avatar({ headwear: "gradHat", clothing: "heroCape", accessory: "backpack" });
  assert.ok(dressed.includes('data-item="gradHat"'));
  assert.ok(dressed.includes('data-item="heroCape" data-layer="back"'));
  assert.ok(dressed.includes('data-item="backpack" data-layer="back"'));
  assert.ok(dressed.includes('data-item="backpack" data-layer="front"'));
  // back layers come before the koala's body, front layers after it
  assert.ok(dressed.indexOf('data-layer="back"') < dressed.indexOf('rx="46" ry="40"'));
  assert.ok(dressed.lastIndexOf('data-item="gradHat"') > dressed.indexOf('rx="46" ry="40"'));
  // an item in the wrong slot is ignored
  assert.ok(!A.avatar({ face: "gradHat" }).includes("data-item"));
  assert.ok(A.avatar({}, { label: 'My "Koala"' }).includes('aria-label="My &quot;Koala&quot;"'));
  assert.ok(A.itemPicture("blueCap").includes("26 12 148 124"), "head crop for headwear");
});

test("adjustCoins: gifts add, corrections take (never below 0), keys make it idempotent", () => {
  const p = {};
  assert.equal(K.adjustCoins(p, 50, "admin gift", { key: "grant:1" }), 50);
  assert.equal(K.adjustCoins(p, 50, "admin gift", { key: "grant:1" }), 0, "same grant twice does nothing");
  assert.equal(p.koala.coins, 50);
  assert.equal(p.koala.earned, 50);
  assert.equal(K.adjustCoins(p, -20, "admin", { key: "grant:2" }), -20);
  assert.equal(p.koala.coins, 30);
  assert.equal(p.koala.earned, 50, "taking coins never lowers lifetime earned/level");
  assert.equal(K.adjustCoins(p, -999, "admin", { key: "grant:3" }), -30, "clamped at 0");
  assert.equal(p.koala.coins, 0);
  assert.equal(K.adjustCoins(p, 0, "x"), 0);
  assert.equal(K.adjustCoins(p, "abc", "x"), 0);
});

test("unlimited (admin): items are buyable and buying spends nothing", () => {
  const p = {};
  const it = K.ITEMS.filter((i) => i.unlock.coins).sort((a, b) => b.unlock.coins - a.unlock.coins)[0];
  assert.equal(K.itemStatus(p, it).state, "locked");
  assert.equal(K.itemStatus(p, it, { unlimited: true }).state, "buyable");
  const r = K.buyItem(p, it.id, { unlimited: true });
  assert.equal(r.ok, true);
  assert.equal(p.koala.coins, 0);
  assert.equal(p.koala.items.equipped[it.slot], it.id);
  assert.equal(K.buyItem(p, it.id, { unlimited: true }).reason, "owned");
  assert.equal(K.buyItem({}, it.id).reason, "notEnoughCoins");
  const nr = K.nextReward({}, { unlimited: true });
  assert.equal(nr.affordable, true);
  assert.equal(nr.toGo, 0);
});

test("mergeRewards: nothing earned on either device is lost", () => {
  const a = {}; // this device
  K.awardCoins(a, 100, "quiz"); K.buyItem(a, "blueCap");                 // earned 100, spent 50 -> 50 coins
  a.streak = { count: 2, lastDay: "2026-10-01", best: 2, restWeek: null };
  a.badges = { b1: 500 };
  const b = {}; // another device of the same child
  K.awardCoins(b, 300, "quiz"); K.buyItem(b, "roundGlasses");             // earned 300 -> 220 coins
  b.streak = { count: 5, lastDay: "2026-10-02", best: 7, restWeek: "2026-09-28" };
  b.badges = { b1: 900, b2: 800 };
  const remote = K.rewardSlice(b);
  assert.equal(K.mergeRewards(a, remote), true);
  assert.equal(a.koala.coins, 220, "side with more lifetime earnings wins the balance");
  assert.equal(a.koala.earned, 300);
  assert.ok(a.koala.items.owned.blueCap && a.koala.items.owned.roundGlasses, "items from both sides");
  assert.equal(a.streak.best, 7);
  assert.equal(a.streak.count, 5);
  assert.equal(a.badges.b1, 500, "earliest badge date kept");
  assert.ok(a.badges.b2);
  assert.equal(K.mergeRewards(a, remote), false, "merging again changes nothing");
  assert.equal(K.mergeRewards(a, null), false);
  assert.equal(K.mergeRewards({}, a.koala ? K.rewardSlice(a) : null), true, "new device gets everything");
});
