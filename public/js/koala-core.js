// Koala Study Mate — reward foundation (Phase 1).
//
// Pure logic only: no DOM, no localStorage, no network. app.js owns the
// `progress` object and calls into here, and the same file loads in Node so
// tests/koala-core.test.js can exercise it directly.
//
// Everything a child earns lives in `progress.koala` (so it saves, and for
// paid/admin accounts syncs, together with the rest of their progress):
//   progress.koala = {
//     v: 1,
//     coins: 0,          // spendable balance (Koala Coins — the only currency)
//     earned: 0,         // lifetime coins earned; drives the Koala level
//     ledger: [ { t, n, why, key? } ]   // newest last, capped to LEDGER_MAX
//   }
// The daily streak stays in `progress.streak` (the app already had it, and the
// streak badges read it): { count, lastDay, best, restWeek }.
//
// Phase boundaries: this file only provides the foundation. Awarding coins
// for learning activity (and badge/mission bonuses) is wired up in Phase 3 —
// the values below are already here so nothing is hard-coded in components.
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.KoalaCore = api;
})(typeof self !== "undefined" ? self : this, function () {
  /* ---------- Configuration: every reward number lives here ---------- */
  const REWARD_CONFIG = {
    // Coins for finishing a learning activity. Used from Phase 3 on.
    coins: {
      quiz: 5,
      spelling: 5,
      flashcards: 5,
      timesTable: 5,
      typing: 5,
      review: 10,
      dailyMission: 15,
    },
    // Bonus coins when a badge is earned (badge id -> coins). Phase 3.
    // Unlisted badges use badgeDefault.
    badgeBonus: {},
    badgeDefault: 25,
    // Lifetime coins earned needed to reach each Koala level (index 0 = Lv.1).
    // Past the last entry every further level costs levelStepAfter more.
    levelThresholds: [0, 50, 120, 220, 350, 520, 730, 980, 1270, 1600],
    levelStepAfter: 400,
    streak: {
      // A day counts toward the streak once the child has answered this many
      // questions in total (any mode). Merely opening the site never counts.
      minAnswersPerDay: 5,
      // Missing exactly one day does not break the streak if that week's
      // rest day is still unused. One rest day per (Monday-start) week.
      restDaysPerWeek: 1,
      milestones: [3, 7, 14, 30],
    },
    ledgerMax: 100,
  };

  /* ---------- Dates (local calendar days as "YYYY-MM-DD") ---------- */
  function dateKey(date) {
    const d = date || new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  function dayNumber(key) {
    const [y, m, d] = String(key).split("-").map(Number);
    return Math.round(Date.UTC(y, m - 1, d) / 86400000);
  }
  function daysBetween(fromKey, toKey) {
    return dayNumber(toKey) - dayNumber(fromKey);
  }
  function shiftDay(key, delta) {
    const [y, m, d] = String(key).split("-").map(Number);
    return dateKey(new Date(y, m - 1, d + delta));
  }
  // The Monday of the week a day falls in — identifies "this week".
  function weekKey(key) {
    const [y, m, d] = String(key).split("-").map(Number);
    const dow = (new Date(y, m - 1, d).getDay() + 6) % 7; // Mon = 0
    return shiftDay(key, -dow);
  }

  /* ---------- Koala state ---------- */
  function ensureKoala(progress) {
    let k = progress.koala;
    if (!k || typeof k !== "object") k = progress.koala = {};
    k.v = 1;
    k.coins = Number.isFinite(k.coins) && k.coins > 0 ? Math.floor(k.coins) : 0;
    k.earned = Number.isFinite(k.earned) && k.earned > 0 ? Math.floor(k.earned) : 0;
    if (k.earned < k.coins) k.earned = k.coins;
    if (!Array.isArray(k.ledger)) k.ledger = [];
    return k;
  }

  // Adds coins and records why. Coins only ever go up here — a wrong answer,
  // failed quiz or broken streak never takes coins away. `key` makes an award
  // idempotent (e.g. "mission:2026-10-02"): a second call with a key already in
  // the ledger does nothing. Returns the amount actually added (0 if skipped).
  function awardCoins(progress, amount, why, opts) {
    const o = opts || {};
    const n = Math.floor(Number(amount));
    if (!Number.isFinite(n) || n <= 0) return 0;
    const k = ensureKoala(progress);
    if (o.key && k.ledger.some((e) => e.key === o.key)) return 0;
    k.coins += n;
    k.earned += n;
    const entry = { t: o.now != null ? o.now : Date.now(), n, why: String(why || "") };
    if (o.key) entry.key = String(o.key);
    k.ledger.push(entry);
    if (k.ledger.length > REWARD_CONFIG.ledgerMax) k.ledger.splice(0, k.ledger.length - REWARD_CONFIG.ledgerMax);
    return n;
  }

  /* ---------- Level ---------- */
  function levelThreshold(level) {
    const t = REWARD_CONFIG.levelThresholds;
    if (level <= t.length) return t[level - 1];
    return t[t.length - 1] + (level - t.length) * REWARD_CONFIG.levelStepAfter;
  }
  // Level is derived from lifetime coins earned, so spending coins later
  // (Phase 2+) can never lower it.
  function levelInfo(earned) {
    const e = Math.max(0, Math.floor(Number(earned) || 0));
    let level = 1;
    while (e >= levelThreshold(level + 1)) level++;
    const floor = levelThreshold(level);
    const next = levelThreshold(level + 1);
    return {
      level,
      earned: e,
      levelStart: floor,
      nextAt: next,
      intoLevel: e - floor,
      span: next - floor,
      toNext: next - e,
      pct: Math.min(100, Math.round(((e - floor) / (next - floor)) * 100)),
    };
  }

  /* ---------- Learning streak ---------- */
  function ensureStreak(streak) {
    const s = streak && typeof streak === "object" ? streak : {};
    if (!Number.isFinite(s.count) || s.count < 0) s.count = 0;
    if (typeof s.lastDay !== "string") s.lastDay = null;
    if (!Number.isFinite(s.best) || s.best < s.count) s.best = s.count;
    if (typeof s.restWeek !== "string") s.restWeek = null;
    return s;
  }

  // Called when `todayKey` has just qualified (enough answers). Mutates and
  // returns { streak, changed, usedRest }. Rules:
  //  - practised yesterday            -> streak + 1
  //  - missed exactly one day, and that week's rest day is unused
  //                                   -> streak + 1 (rest day used up)
  //  - anything longer / rest used    -> new streak of 1 (best is kept)
  function advanceStreak(streak, todayKey) {
    const s = ensureStreak(streak);
    if (s.lastDay === todayKey) return { streak: s, changed: false, usedRest: false };
    let usedRest = false;
    if (!s.lastDay) {
      s.count = 1;
    } else {
      const gap = daysBetween(s.lastDay, todayKey);
      if (gap <= 0) return { streak: s, changed: false, usedRest: false }; // clock went backwards
      if (gap === 1) {
        s.count += 1;
      } else if (gap === 2 && REWARD_CONFIG.streak.restDaysPerWeek > 0 && s.restWeek !== weekKey(shiftDay(todayKey, -1))) {
        s.count += 1;
        s.restWeek = weekKey(shiftDay(todayKey, -1));
        usedRest = true;
      } else {
        s.count = 1;
      }
    }
    s.lastDay = todayKey;
    if (s.count > s.best) s.best = s.count;
    return { streak: s, changed: true, usedRest };
  }

  // What to show the child right now, without changing anything. A streak that
  // can no longer be saved reads as 0 ("start a new one") rather than showing a
  // stale number; best always stays visible.
  function streakStatus(streak, todayKey, answersToday) {
    const s = ensureStreak(streak);
    const min = REWARD_CONFIG.streak.minAnswersPerDay;
    const countedToday = s.lastDay === todayKey;
    let alive = false;
    if (s.lastDay) {
      const gap = daysBetween(s.lastDay, todayKey);
      alive = gap <= 1 || (gap === 2 && s.restWeek !== weekKey(shiftDay(todayKey, -1)));
    }
    const nextMilestone = REWARD_CONFIG.streak.milestones.find((m) => m > (alive ? s.count : 0)) || null;
    return {
      count: alive ? s.count : 0,
      best: s.best,
      countedToday,
      answersToGo: countedToday ? 0 : Math.max(0, min - (answersToday || 0)),
      restAvailable: s.restWeek !== weekKey(todayKey),
      nextMilestone,
    };
  }

  return {
    REWARD_CONFIG,
    dateKey, daysBetween, shiftDay, weekKey,
    ensureKoala, awardCoins,
    levelInfo,
    ensureStreak, advanceStreak, streakStatus,
  };
});
