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
//     ledger: [ { t, n, why, key? } ]   // newest last, capped; n < 0 = a purchase
//     items: { owned: { itemId: ts }, equipped: { slot: itemId } }   // Phase 2
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

  /* ---------- Character items (Phase 2) ----------
     slot: headwear | face | clothing | accessory (one item per slot is worn).
     unlock is one of:
       { free: true }      owned from the start
       { coins: N }        bought once with Koala Coins
       { streak: N }       unlocked automatically once the best streak >= N days
     Every requirement is shown to the child — nothing is hidden. */
  const ITEM_SLOTS = ["headwear", "face", "clothing", "accessory"];
  const ITEMS = [
    { id: "blueCap",    slot: "headwear",  name: { en: "Blue Cap",        ko: "파란 모자" },     unlock: { coins: 50 } },
    { id: "gradHat",    slot: "headwear",  name: { en: "Graduation Hat",  ko: "졸업 모자" },     unlock: { coins: 120 } },
    { id: "crown",      slot: "headwear",  name: { en: "Golden Crown",    ko: "황금 왕관" },     unlock: { streak: 7 } },
    { id: "roundGlasses", slot: "face",    name: { en: "Round Glasses",   ko: "동그란 안경" },   unlock: { coins: 80 } },
    { id: "sunglasses", slot: "face",      name: { en: "Cool Sunglasses", ko: "멋진 선글라스" }, unlock: { coins: 150 } },
    { id: "redScarf",   slot: "clothing",  name: { en: "Red Scarf",       ko: "빨간 목도리" },   unlock: { free: true } },
    { id: "heroCape",   slot: "clothing",  name: { en: "Hero Cape",       ko: "히어로 망토" },   unlock: { coins: 200 } },
    { id: "headphones", slot: "accessory", name: { en: "Headphones",      ko: "헤드폰" },        unlock: { coins: 100 } },
    { id: "backpack",   slot: "accessory", name: { en: "School Backpack", ko: "책가방" },        unlock: { coins: 150 } },
  ];
  const itemById = (id) => ITEMS.find((i) => i.id === id) || null;

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
    if (!k.items || typeof k.items !== "object") k.items = {};
    if (!k.items.owned || typeof k.items.owned !== "object") k.items.owned = {};
    if (!k.items.equipped || typeof k.items.equipped !== "object") k.items.equipped = {};
    // Free items are owned from the start; drop anything the catalogue no
    // longer knows about so a removed item can never stay equipped.
    ITEMS.forEach((it) => { if (it.unlock.free && !k.items.owned[it.id]) k.items.owned[it.id] = 1; });
    Object.keys(k.items.owned).forEach((id) => { if (!itemById(id)) delete k.items.owned[id]; });
    Object.keys(k.items.equipped).forEach((slot) => {
      const it = itemById(k.items.equipped[slot]);
      if (!it || it.slot !== slot || !k.items.owned[it.id]) delete k.items.equipped[slot];
    });
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

  // Spending is explicit and only ever happens on a purchase the child
  // confirmed — it is never a penalty. Level uses lifetime `earned`, so
  // spending can't lower it. Returns true if the coins were taken.
  function spendCoins(progress, amount, why, opts) {
    const o = opts || {};
    const n = Math.floor(Number(amount));
    if (!Number.isFinite(n) || n <= 0) return false;
    const k = ensureKoala(progress);
    if (k.coins < n) return false;
    k.coins -= n;
    k.ledger.push({ t: o.now != null ? o.now : Date.now(), n: -n, why: String(why || "") });
    if (k.ledger.length > REWARD_CONFIG.ledgerMax) k.ledger.splice(0, k.ledger.length - REWARD_CONFIG.ledgerMax);
    return true;
  }

  // Admin gift / correction. Positive amounts are added like any reward (and
  // count towards level); negative amounts take coins away but never below 0.
  // `key` makes it idempotent, so the same grant can't be applied twice.
  function adjustCoins(progress, amount, why, opts) {
    const o = opts || {};
    const n = Math.trunc(Number(amount));
    if (!Number.isFinite(n) || n === 0) return 0;
    if (n > 0) return awardCoins(progress, n, why, o);
    const k = ensureKoala(progress);
    if (o.key && k.ledger.some((e) => e.key === o.key)) return 0;
    const take = Math.min(k.coins, -n);
    k.coins -= take;
    const entry = { t: o.now != null ? o.now : Date.now(), n: -take, why: String(why || "") };
    if (o.key) entry.key = String(o.key);
    k.ledger.push(entry);
    if (k.ledger.length > REWARD_CONFIG.ledgerMax) k.ledger.splice(0, k.ledger.length - REWARD_CONFIG.ledgerMax);
    return -take;
  }

  /* ---------- Character items ---------- */
  // Streak items unlock by themselves once the best streak is long enough.
  // Returns the ids unlocked just now.
  function syncStreakUnlocks(progress) {
    const k = ensureKoala(progress);
    const best = ensureStreak(progress.streak).best;
    const fresh = [];
    ITEMS.forEach((it) => {
      if (it.unlock.streak && !k.items.owned[it.id] && best >= it.unlock.streak) {
        k.items.owned[it.id] = Date.now();
        fresh.push(it.id);
      }
    });
    return fresh;
  }

  // What the child sees for one item right now:
  //   equipped | owned (tap to wear) | buyable (enough coins) | locked
  // plus the exact thing still missing, for the "why is it locked" text.
  // opts.unlimited (admin): coins are never short and never spent.
  function itemStatus(progress, item, opts) {
    const k = ensureKoala(progress);
    const unlimited = !!(opts && opts.unlimited);
    if (k.items.equipped[item.slot] === item.id) return { state: "equipped" };
    if (k.items.owned[item.id]) return { state: "owned" };
    if (item.unlock.coins) {
      const cost = item.unlock.coins;
      if (unlimited || k.coins >= cost) return { state: "buyable", cost };
      return { state: "locked", need: "coins", cost, short: cost - k.coins };
    }
    const need = item.unlock.streak || 0;
    const best = ensureStreak(progress.streak).best;
    return { state: "locked", need: "streak", days: need, have: best };
  }

  function buyItem(progress, id, opts) {
    const it = itemById(id);
    const k = ensureKoala(progress);
    if (!it || !it.unlock.coins) return { ok: false, reason: "notForSale" };
    if (k.items.owned[id]) return { ok: false, reason: "owned" };
    if (!(opts && opts.unlimited) && !spendCoins(progress, it.unlock.coins, "item:" + id, opts)) return { ok: false, reason: "notEnoughCoins" };
    k.items.owned[id] = (opts && opts.now) || Date.now();
    k.items.equipped[it.slot] = id; // wear it straight away
    return { ok: true, item: it };
  }

  function equipItem(progress, id) {
    const it = itemById(id);
    const k = ensureKoala(progress);
    if (!it || !k.items.owned[id]) return false;
    k.items.equipped[it.slot] = id;
    return true;
  }
  function unequipSlot(progress, slot) {
    const k = ensureKoala(progress);
    if (!k.items.equipped[slot]) return false;
    delete k.items.equipped[slot];
    return true;
  }

  // The cheapest coin item the child doesn't own yet — the short-term goal
  // shown as "Next reward". null once every coin item is owned.
  function nextReward(progress, opts) {
    const k = ensureKoala(progress);
    const unlimited = !!(opts && opts.unlimited);
    const open = ITEMS.filter((it) => it.unlock.coins && !k.items.owned[it.id]).sort((a, b) => a.unlock.coins - b.unlock.coins);
    if (!open.length) return null;
    const item = open[0];
    const cost = item.unlock.coins;
    return { item, cost, coins: k.coins, toGo: unlimited ? 0 : Math.max(0, cost - k.coins), affordable: unlimited || k.coins >= cost, pct: unlimited ? 100 : Math.min(100, Math.round((k.coins / cost) * 100)) };
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
    ensureKoala, awardCoins, spendCoins, adjustCoins,
    ITEM_SLOTS, ITEMS, itemById, itemStatus, buyItem, equipItem, unequipSlot, syncStreakUnlocks, nextReward,
    levelInfo,
    ensureStreak, advanceStreak, streakStatus,
  };
});
