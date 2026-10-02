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
