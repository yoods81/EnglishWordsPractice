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
  const cheapest = K.ITEMS.filter((i) => i.unlock.coins && !i.season).sort((a, b) => a.unlock.coins - b.unlock.coins)[0];
  assert.equal(n.item.unlock.coins, cheapest.unlock.coins);
  assert.equal(n.toGo, cheapest.unlock.coins - 20);
  assert.equal(n.affordable, false);
  K.awardCoins(p, 500, "x");
  assert.equal(K.nextReward(p).affordable, true);
  K.buyItem(p, n.item.id);
  assert.notEqual(K.nextReward(p).item.id, n.item.id);
});

test("nextReward is null once every coin item is owned", () => {
  const p = {};
  K.awardCoins(p, 50000, "x");
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
    assert.ok(K.ITEM_SLOTS.includes(it.slot) || K.ROOM_SLOTS.includes(it.slot), "slot " + it.slot);
    assert.ok(it.name.en && it.name.ko);
    assert.ok(it.unlock.free || it.unlock.coins > 0 || it.unlock.streak > 0 || it.unlock.badge);
    assert.ok(A.hasArt(it.id), "art for " + it.id);
  });
  assert.ok(K.ITEMS.length >= 5 && K.ITEMS.length <= 400, "catalogue");
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
  assert.ok(A.itemPicture("blueCap").includes("26 2 148 134"), "head crop for headwear");
  assert.ok(A.itemIcon("blueCap").includes("koala-icon-svg") && !A.itemIcon("blueCap").includes('rx="46" ry="40"'), "item-only icon has no koala");
  assert.ok(A.previewFor("beanie", { clothing: "tshirt" }, {}, "headwear").includes('data-item="tshirt"'), "preview keeps what is worn");
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

test("reward loop: rounds of correct answers pay coins once, capped per day", () => {
  const p = {};
  assert.deepEqual(K.awardLearning(p, "quiz", 9, "2026-10-02"), []);
  assert.deepEqual(K.awardLearning(p, "quiz", 10, "2026-10-02"), [{ why: "quiz", n: 5 }]);
  assert.deepEqual(K.awardLearning(p, "quiz", 10, "2026-10-02"), [], "same round is never paid twice");
  assert.equal(K.awardLearning(p, "quiz", 25, "2026-10-02").length, 1, "second round only");
  assert.equal(K.awardLearning(p, "quiz", 500, "2026-10-02").length, 1, "third round, then capped");
  assert.equal(K.awardLearning(p, "quiz", 900, "2026-10-02").length, 0);
  assert.equal(p.koala.coins, 15);
  assert.equal(K.awardLearning(p, "quiz", 10, "2026-10-03").length, 1, "new day, new rounds");
  assert.deepEqual(K.awardLearning(p, "flash", 14, "d"), [], "flashcards pay every 15 credited answers");
  assert.equal(K.awardLearning(p, "flash", 15, "d")[0].why, "flashcards");
  assert.equal(K.awardLearning(p, "flash", 900, "d").length, 1, "flashcards: only 2 rounds a day");
  assert.equal(K.awardLearning(p, "tt", 10, "d")[0].why, "timesTable");
  assert.deepEqual(K.awardLearning(p, "bogus", 99, "d"), []);
});

test("reward loop: mission, badge and review coins are one-time and wrong answers never cost", () => {
  const p = {};
  assert.equal(K.awardMission(p, "2026-10-02"), 15);
  assert.equal(K.awardMission(p, "2026-10-02"), 0);
  assert.equal(K.awardBadge(p, "tt3"), 25);
  assert.equal(K.awardBadge(p, "tt3"), 0);
  assert.equal(K.awardReview(p, "2026-10-02:1"), 10);
  assert.equal(K.awardReview(p, "2026-10-02:1"), 0);
  assert.equal(p.koala.coins, 50);
  const lp = K.learningProgress("quiz", 13);
  assert.deepEqual([lp.have, lp.goal, lp.roundsDone, lp.capped], [3, 10, 1, false]);
  assert.equal(K.learningProgress("quiz", 30).capped, true);
});

test("Study Room: room items follow the same rules and never mix with character items", () => {
  const roomItems = K.ITEMS.filter((i) => i.kind === "room");
  assert.ok(roomItems.length >= 8);
  assert.ok(roomItems.every((i) => K.ROOM_SLOTS.includes(i.slot)), "every room item has a room slot");
  assert.ok(K.ITEMS.filter((i) => i.kind !== "room").every((i) => K.ITEM_SLOTS.includes(i.slot)));
  assert.equal(new Set(K.ITEMS.map((i) => i.id)).size, K.ITEMS.length, "unique ids");
  const p = {};
  assert.ok(p.koala === undefined);
  assert.equal(K.nextReward(p).item.slot === "wallpaper", false, "character next reward is a character item");
  assert.equal(K.nextReward(p, { kind: "room" }).item.id, "blueRug");
  K.awardCoins(p, 100, "quiz");
  assert.equal(K.buyItem(p, "blueRug").ok, true);
  assert.equal(p.koala.items.equipped.rug, "blueRug");
  assert.equal(p.koala.items.equipped.headwear, undefined);
  assert.equal(K.buyItem(p, "studyDesk").reason, "notEnoughCoins");
  assert.equal(K.unequipSlot(p, "rug"), true);
  assert.equal(K.equipItem(p, "blueRug"), true);
  assert.equal(K.equipItem(p, "mintWall"), false, "not owned");
  assert.equal(K.equipItem(p, "creamWall"), true, "free wallpaper");
});

test("Study Room art: every room item has a picture and renders in the scene", () => {
  const A = require("../public/js/koala-art.js");
  K.ITEMS.forEach((it) => assert.ok(A.hasArt(it.id) && A.itemPicture(it.id).includes("<svg"), it.id));
  const eq = { wallpaper: "nightWall", rug: "starRug", desk: "studyDesk", lamp: "deskLamp", shelf: "bookshelf", plant: "pottedPlant", poster: "mapPoster", headwear: "crown" };
  const room = A.room(eq, eq);
  Object.values(eq).forEach((id) => assert.ok(room.includes(`data-item="${id}"`) || room.includes(id), id));
  assert.ok(room.includes('data-item="crown"'), "koala still wears its hat in the room");
  assert.ok(A.room({}, {}).includes("#fbf1dc"), "default cream wall");
  assert.ok(!A.room({ rug: "mapPoster" }, {}).includes('data-item="mapPoster"'), "wrong slot ignored");
});

test("Phase 6: badge-gated items open by themselves when the badge is earned", () => {
  const p = { badges: {} };
  assert.deepEqual(K.syncStreakUnlocks(p), []);
  const it = K.itemById("wizardHat");
  assert.deepEqual(K.itemStatus(p, it), { state: "locked", need: "badge", badge: "words200" });
  assert.equal(K.buyItem(p, "wizardHat").reason, "notForSale");
  p.badges.words200 = 1; p.badges.ttAll = 2; p.badges.quiz100 = 3;
  assert.deepEqual(K.syncStreakUnlocks(p).sort(), ["goldMedal", "trophyCabinet", "wizardHat"]);
  assert.equal(K.itemStatus(p, it).state, "owned");
  assert.deepEqual(K.syncStreakUnlocks(p), [], "only announced once");
  assert.equal(K.equipItem(p, "wizardHat"), true);
});

test("Phase 6: seasonal items are on sale only in their window, kept forever once owned", () => {
  const summer = new Date(2026, 11, 20), spring = new Date(2026, 9, 2), jan = new Date(2027, 0, 3), feb = new Date(2027, 1, 10);
  const santa = K.itemById("santaHat"), surf = K.itemById("surfboard");
  assert.ok(K.isSeasonActive(santa, summer) && K.isSeasonActive(santa, jan));
  assert.ok(!K.isSeasonActive(santa, spring) && !K.isSeasonActive(santa, feb));
  assert.ok(K.isSeasonActive(surf, feb) && !K.isSeasonActive(surf, spring));
  assert.ok(K.isSeasonActive(K.itemById("blueCap"), spring), "no season = always");
  const p = {};
  K.awardCoins(p, 500, "quiz");
  const ids = (d, o) => K.visibleItems(p, "headwear", Object.assign({ date: d }, o)).map((i) => i.id);
  assert.ok(!ids(spring).includes("santaHat"), "hidden out of season");
  assert.ok(ids(summer).includes("santaHat"));
  assert.ok(ids(spring, { showAll: true }).includes("santaHat"), "admin preview");
  assert.equal(K.itemStatus(p, santa, { date: spring }).need, "season");
  assert.equal(K.buyItem(p, "santaHat", { date: spring }).reason, "outOfSeason");
  assert.equal(K.buyItem(p, "santaHat", { date: summer }).ok, true);
  assert.ok(ids(spring).includes("santaHat"), "owned items stay visible all year");
  assert.equal(K.buyItem({ koala: undefined }, "santaHat", { date: spring, unlimited: true }).ok, true, "admin can buy any time");
  const nr = K.nextReward({}, { kind: "room", date: spring });
  assert.ok(!["xmasTree", "beachTowel"].includes(nr.item.id), "next reward never a seasonal item that is not on sale");
});

test("shop expansion: Jewelry and Shoes exist and every character category has 10+ items", () => {
  assert.ok(K.ITEM_SLOTS.includes("jewelry") && K.ITEM_SLOTS.includes("shoes"));
  K.ITEM_SLOTS.forEach((slot) => {
    const n = K.ITEMS.filter((i) => i.slot === slot && !i.season).length;
    assert.ok(n >= 10, slot + " has " + n);
  });
  K.ITEMS.forEach((i) => assert.ok(A.itemIcon(i.id).includes("<svg"), "icon " + i.id));
});

test("shop expansion: every Study Room category has 10+ items with art", () => {
  K.ROOM_SLOTS.forEach((slot) => {
    const n = K.ITEMS.filter((i) => i.slot === slot && !i.season).length;
    // toys live in toy boxes now (as sub-items), so that slot only lists the boxes
    assert.ok(n >= (slot === "toy" ? 3 : 10), slot + " has " + n);
  });
  assert.ok(K.ROOM_SLOTS.length >= 11);
  K.ITEMS.filter((i) => i.kind === "room").forEach((i) => assert.ok(A.hasArt(i.id), i.id));
});

const bag = (coins) => ({ koala: { coins, earned: coins, ledger: [], items: { owned: {}, equipped: {} } } });

test("sub-items: every one costs coins, and less than the cheapest parent it goes with", () => {
  K.SUB_ITEMS.forEach((sub) => {
    const parents = Object.keys(K.SUB_PARENTS).filter((p) => K.SUB_PARENTS[p] === sub.kind);
    const cheapest = Math.min(...parents.map((p) => K.itemById(p).unlock.coins));
    assert.ok(sub.cost < cheapest, sub.id + " " + sub.cost + " vs " + cheapest);
    if (!sub.cost) assert.equal(sub.id, "picMeadow");
  });
  // all toys are sub-items of the toy boxes; pets get outfits
  assert.equal(K.ITEMS.filter((i) => i.slot === "toy").every((i) => K.subKind(i.id) === "toys"), true);
  assert.equal(K.subKind("catPet"), "petwear");
  assert.equal(K.subKind("fishBowlPet"), null);
});

test("sub-items: owning the parent gives nothing; buying costs coins; limits and swaps", () => {
  const p = bag(3000);
  K.buyItem(p, "woodToyBox");
  assert.deepEqual(K.subSelection(p, "woodToyBox"), []);
  assert.equal(K.toggleSub(p, "woodToyBox", "toyBall").reason, "notOwned");
  assert.equal(K.toggleSub(p, "cozyRug", "toyBall").reason, "notParent");
  assert.equal(K.buySub(p, "woodToyBox", "toyBall").ok, true);
  assert.equal(p.koala.coins, 3000 - 90 - 20);
  assert.equal(K.buySub(p, "woodToyBox", "toyBall").reason, "owned");
  assert.deepEqual(K.subSelection(p, "woodToyBox"), ["toyBall"]);
  assert.equal(K.toggleSub(p, "woodToyBox", "toyBall").on, false); // take out, still owned
  assert.equal(K.isSubOwned(p, "toyBall"), true);
  assert.equal(K.buySub(bag(5), "woodToyBox", "toyBall").reason, "notEnoughCoins");
  assert.equal(K.buySub(p, "bookshelf", "toyBall").reason, "unknown");
  // toys: at most 4
  ["toyTeddy", "toyCar", "toyRobot", "toyDino"].forEach((s) => assert.ok(K.buySub(p, "woodToyBox", s).placed));
  K.buySub(p, "woodToyBox", "toyBall"); // owned already -> reason owned
  K.toggleSub(p, "woodToyBox", "toyBall");
  assert.equal(K.subSelection(p, "woodToyBox").length, 4);
  // a frame holds one picture, starts with the free one
  assert.deepEqual(K.subSelection(p, "goldFrame"), ["picMeadow"]);
  K.buySub(p, "goldFrame", "picSea");
  assert.deepEqual(K.subSelection(p, "goldFrame"), ["picSea"]);
  // pet outfit swaps within its group
  K.buySub(p, "catPet", "pwBow"); K.buySub(p, "catPet", "pwTopHat");
  assert.deepEqual(K.subSelection(p, "catPet"), ["pwTopHat"]);
  K.buySub(p, "catPet", "pwCollar");
  assert.deepEqual(K.subSelection(p, "catPet").sort(), ["pwCollar", "pwTopHat"]);
  // admin: free, but still has to "buy" it before it goes in
  const adm = bag(0);
  assert.equal(K.toggleSub(adm, "catPet", "pwCape", { unlimited: true }).reason, "notOwned");
  assert.equal(K.buySub(adm, "catPet", "pwCape", { unlimited: true }).ok, true);
  assert.equal(adm.koala.coins, 0);
  // family frame holds up to 3 photos
  K.buyItem(p, "familyFrame");
  ["photoPicnic", "photoBeach", "photoPark", "photoZoo"].forEach((x) => K.buySub(p, "familyFrame", x));
  assert.equal(K.subSelection(p, "familyFrame").length, 3);
  assert.equal(K.subKind("smallFrame"), "frame");
  assert.ok(K.subItemsFor("bigFrame").length >= 20);
});

test("selling back: 80% returns to the wallet, the item is gone, history records it", () => {
  const p = bag(300);
  K.buyItem(p, "bookshelf"); // 100
  K.buySub(p, "bookshelf", "spaceBook"); // 35
  assert.equal(p.koala.coins, 165);
  const r = K.sellSub(p, "spaceBook");
  assert.equal(r.refund, 28);
  assert.equal(r.fee, 7);
  assert.equal(p.koala.coins, 193);
  assert.equal(K.isSubOwned(p, "spaceBook"), false);
  assert.deepEqual(K.subSelection(p, "bookshelf"), []);
  const s = K.sellItem(p, "bookshelf");
  assert.equal(s.refund, 80);
  assert.equal(p.koala.coins, 273);
  assert.equal(p.koala.items.owned.bookshelf, undefined);
  assert.equal(p.koala.items.equipped.shelf, undefined);
  assert.equal(p.koala.refunded, 108);
  assert.equal(p.koala.spent, 135);
  assert.deepEqual(p.koala.ledger.map((e) => e.why), ["item:bookshelf", "sub:spaceBook", "sellsub:spaceBook", "sell:bookshelf"]);
  assert.ok(p.koala.coins <= p.koala.earned);
  assert.equal(K.sellItem(p, "bookshelf").reason, "notOwned");
  assert.equal(K.sellItem(p, "creamWall").reason, "notForSale");
  assert.equal(K.sellSub(p, "picMeadow").reason, "notForSale");
  // buy it again: works, and nothing is free
  assert.equal(K.buyItem(p, "bookshelf").ok, true);
  // admin gets nothing back
  const adm = bag(0);
  K.buyItem(adm, "bookshelf", { unlimited: true });
  assert.equal(K.sellItem(adm, "bookshelf", { unlimited: true }).refund, 0);
  assert.equal(adm.koala.coins, 0);
});

test("sub-items: old floor toys become owned toy-box toys; bad data is cleaned; sold items stay sold after sync", () => {
  const p = { koala: { coins: 0, earned: 0, ledger: [], items: { owned: { teddyToy: 5, ballToy: 6 }, equipped: { toy: "teddyToy" }, sub: { bookshelf: ["koalaBook", "koalaBook", "nope"], cozyRug: ["x"] } } } };
  const k = K.ensureKoala(p);
  assert.deepEqual(Object.keys(k.items.subOwned).sort(), ["toyBall", "toyTeddy"]);
  assert.equal(k.items.owned.teddyToy, undefined);
  assert.equal(k.items.equipped.toy, undefined);
  assert.deepEqual(k.items.sub, {}); // koalaBook is not owned
  K.SUB_ITEMS.forEach((s) => assert.ok(A.subIcon(s.id).includes("<svg"), s.id));
  // sold on one device, still owned on the other
  const a = bag(500);
  K.buySub(a, "woodToyBox", "toyCar", { unlimited: true });
  const b = JSON.parse(JSON.stringify(a));
  K.sellSub(a, "toyCar", { unlimited: true, now: Date.now() + 10 });
  K.mergeRewards(b, a);
  assert.equal(K.isSubOwned(b, "toyCar"), false);
  K.mergeRewards(a, b);
  assert.equal(K.isSubOwned(a, "toyCar"), false);
});
