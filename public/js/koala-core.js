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
    // Coins for a learning round: every `correctPerReward` correct answers in a
    // mode earn that mode's coins, up to `dailyRewardsPerMode` rounds per mode
    // per day (so the day's total is bounded and wrong answers never cost coins).
    learning: { correctPerReward: 10, dailyRewardsPerMode: 3 },
    coins: {
      quiz: 5,
      spelling: 5,
      flashcards: 5,
      timesTable: 5,
      typing: 5,
      review: 10,
      dailyMission: 15,
    },
    // Bonus coins when a badge is earned (badge id -> coins).
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
    // Phase 6: more items. { badge: id } opens by itself when that badge is earned;
    // season = a yearly window [month, day] (wraps over New Year) during which the
    // item is on sale. Once owned, a seasonal item is the child's for good.
    { id: "partyHat",   slot: "headwear",  name: { en: "Party Hat",       ko: "파티 모자" },     unlock: { coins: 90 } },
    { id: "flowerCrown", slot: "headwear", name: { en: "Flower Crown",    ko: "꽃 왕관" },       unlock: { coins: 100 } },
    { id: "wizardHat",  slot: "headwear",  name: { en: "Wizard Hat",      ko: "마법사 모자" },   unlock: { badge: "words200" } },
    { id: "starGlasses", slot: "face",     name: { en: "Star Glasses",    ko: "별 안경" },       unlock: { coins: 110 } },
    { id: "bowTie",     slot: "clothing",  name: { en: "Bow Tie",         ko: "나비넥타이" },    unlock: { coins: 70 } },
    { id: "goldMedal",  slot: "accessory", name: { en: "Gold Medal",      ko: "금메달" },        unlock: { badge: "ttAll" } },
    { id: "santaHat",   slot: "headwear",  name: { en: "Santa Hat",       ko: "산타 모자" },     unlock: { coins: 100 }, season: { from: [12, 1], to: [1, 6] } },
    { id: "surfboard",  slot: "accessory", name: { en: "Surfboard",       ko: "서핑 보드" },     unlock: { coins: 120 }, season: { from: [12, 1], to: [2, 28] } },
    // Study Room (Phase 4): same unlock rules, kind "room". One item per slot.
    { id: "creamWall",  kind: "room", slot: "wallpaper", name: { en: "Cream Wall",     ko: "크림색 벽지" },   unlock: { free: true } },
    { id: "mintWall",   kind: "room", slot: "wallpaper", name: { en: "Mint Wall",      ko: "민트색 벽지" },   unlock: { coins: 60 } },
    { id: "nightWall",  kind: "room", slot: "wallpaper", name: { en: "Starry Night",   ko: "별이 빛나는 밤" }, unlock: { coins: 130 } },
    { id: "blueRug",    kind: "room", slot: "rug",       name: { en: "Blue Rug",       ko: "파란 러그" },     unlock: { coins: 40 } },
    { id: "starRug",    kind: "room", slot: "rug",       name: { en: "Star Rug",       ko: "별 러그" },       unlock: { coins: 90 } },
    { id: "mapPoster",  kind: "room", slot: "poster",    name: { en: "World Map",      ko: "세계 지도" },     unlock: { coins: 70 } },
    { id: "rocketPoster", kind: "room", slot: "poster",  name: { en: "Rocket Poster",  ko: "로켓 포스터" },   unlock: { coins: 110 } },
    { id: "studyDesk",  kind: "room", slot: "desk",      name: { en: "Study Desk",     ko: "공부 책상" },     unlock: { coins: 80 } },
    { id: "deskLamp",   kind: "room", slot: "lamp",      name: { en: "Hanging Lamp",   ko: "천장 램프" },     unlock: { coins: 60 } },
    { id: "bookshelf",  kind: "room", slot: "shelf",     name: { en: "Bookshelf",      ko: "책장" },          unlock: { coins: 100 } },
    { id: "pottedPlant", kind: "room", slot: "plant",    name: { en: "Potted Plant",   ko: "화분" },          unlock: { coins: 50 } },
    { id: "skyWall",    kind: "room", slot: "wallpaper", name: { en: "Sunny Sky",      ko: "맑은 하늘" },     unlock: { coins: 90 } },
    { id: "greenRug",   kind: "room", slot: "rug",       name: { en: "Grass Rug",      ko: "잔디 러그" },     unlock: { coins: 50 } },
    { id: "rainbowPoster", kind: "room", slot: "poster", name: { en: "Rainbow Poster", ko: "무지개 포스터" }, unlock: { coins: 80 } },
    { id: "scienceDesk", kind: "room", slot: "desk",     name: { en: "Science Desk",   ko: "과학 책상" },     unlock: { coins: 140 } },
    { id: "starLamp",   kind: "room", slot: "lamp",      name: { en: "Star Lights",    ko: "별 조명" },       unlock: { coins: 90 } },
    { id: "trophyCabinet", kind: "room", slot: "shelf",  name: { en: "Trophy Cabinet", ko: "트로피 진열장" }, unlock: { badge: "quiz100" } },
    { id: "xmasTree",   kind: "room", slot: "plant",     name: { en: "Christmas Tree", ko: "크리스마스 트리" }, unlock: { coins: 90 }, season: { from: [12, 1], to: [1, 6] } },
    { id: "beachTowel", kind: "room", slot: "rug",       name: { en: "Beach Towel",    ko: "비치 타월" },     unlock: { coins: 70 }, season: { from: [12, 1], to: [2, 28] } },
  ];
  const ROOM_SLOTS = ["wallpaper", "rug", "poster", "desk", "lamp", "shelf", "plant"];
  // Seasonal items are on sale only inside their yearly window (it may wrap
  // over New Year). Anything without a season is always available.
  function isSeasonActive(item, date) {
    if (!item.season) return true;
    const d = date || new Date();
    const key = (d.getMonth() + 1) * 100 + d.getDate();
    const from = item.season.from[0] * 100 + item.season.from[1];
    const to = item.season.to[0] * 100 + item.season.to[1];
    return from <= to ? key >= from && key <= to : key >= from || key <= to;
  }
  // What the child sees for a slot: everything, except out-of-season items they
  // don't own. opts.showAll (admin preview) shows those too.
  function visibleItems(progress, slot, opts) {
    const o = opts || {};
    const k = ensureKoala(progress);
    return ITEMS.filter((it) => it.slot === slot && (!it.season || k.items.owned[it.id] || o.showAll || isSeasonActive(it, o.date)));
  }
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
  // Items that open by themselves: streak length or an earned badge.
  // Returns the ids unlocked just now.
  function syncStreakUnlocks(progress) {
    const k = ensureKoala(progress);
    const best = ensureStreak(progress.streak).best;
    const badges = progress.badges || {};
    const fresh = [];
    ITEMS.forEach((it) => {
      if (k.items.owned[it.id]) return;
      if ((it.unlock.streak && best >= it.unlock.streak) || (it.unlock.badge && badges[it.unlock.badge])) {
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
    if (item.unlock.coins && !unlimited && !isSeasonActive(item, opts && opts.date)) return { state: "locked", need: "season" };
    if (item.unlock.badge) return { state: "locked", need: "badge", badge: item.unlock.badge };
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
    if (!(opts && opts.unlimited) && !isSeasonActive(it, opts && opts.date)) return { ok: false, reason: "outOfSeason" };
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
    const kind = (opts && opts.kind) || "character";
    const open = ITEMS.filter((it) => (it.kind || "character") === kind && it.unlock.coins && !k.items.owned[it.id] && (unlimited || isSeasonActive(it, opts && opts.date))).sort((a, b) => a.unlock.coins - b.unlock.coins);
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

  /* ---------- Reward loop: learning -> coins (Phase 3) ---------- */
  // Maps the app's answer-mode names to the coin names above.
  const MODE_COINS = { quiz: "quiz", spelling: "spelling", flash: "flashcards", tt: "timesTable", typing: "typing" };

  // Called after an answer. `correctToday` = correct answers in this mode today.
  // Awards every round reached and not yet paid (idempotent per day+round).
  // Returns [{why, n}] for the rounds paid just now.
  function awardLearning(progress, mode, correctToday, day, opts) {
    const why = MODE_COINS[mode];
    const cfg = REWARD_CONFIG.learning;
    if (!why) return [];
    const rounds = Math.min(Math.floor((correctToday || 0) / cfg.correctPerReward), cfg.dailyRewardsPerMode);
    const paid = [];
    for (let i = 1; i <= rounds; i++) {
      const n = awardCoins(progress, REWARD_CONFIG.coins[why], why, Object.assign({}, opts, { key: `learn:${mode}:${day}:${i}` }));
      if (n) paid.push({ why, n });
    }
    return paid;
  }

  // Where the child stands towards the next round in a mode (for "Earn more Coins").
  function learningProgress(mode, correctToday) {
    const cfg = REWARD_CONFIG.learning;
    const done = Math.floor((correctToday || 0) / cfg.correctPerReward);
    const capped = done >= cfg.dailyRewardsPerMode;
    return {
      coins: REWARD_CONFIG.coins[MODE_COINS[mode]] || 0,
      have: capped ? cfg.correctPerReward : (correctToday || 0) % cfg.correctPerReward,
      goal: cfg.correctPerReward,
      roundsDone: Math.min(done, cfg.dailyRewardsPerMode),
      roundsMax: cfg.dailyRewardsPerMode,
      capped,
    };
  }

  function awardMission(progress, day, opts) {
    return awardCoins(progress, REWARD_CONFIG.coins.dailyMission, "dailyMission", Object.assign({}, opts, { key: "mission:" + day }));
  }
  function awardBadge(progress, badgeId, opts) {
    const n = REWARD_CONFIG.badgeBonus[badgeId] != null ? REWARD_CONFIG.badgeBonus[badgeId] : REWARD_CONFIG.badgeDefault;
    return awardCoins(progress, n, "badge", Object.assign({}, opts, { key: "badge:" + badgeId }));
  }
  // One review session. `sessionKey` makes a double click on "Done" harmless.
  function awardReview(progress, sessionKey, opts) {
    return awardCoins(progress, REWARD_CONFIG.coins.review, "review", Object.assign({}, opts, { key: "review:" + sessionKey }));
  }

  /* ---------- Account sync (every signed-in account) ---------- */
  // The slice of progress that makes up the child's Koala world.
  function rewardSlice(progress) {
    ensureKoala(progress);
    progress.streak = ensureStreak(progress.streak);
    if (!progress.badges || typeof progress.badges !== "object") progress.badges = {};
    return { koala: progress.koala, streak: progress.streak, badges: progress.badges };
  }

  // Merges a copy from the server into this device's progress WITHOUT losing
  // what either side earned (the same child may use two devices):
  //  - coins/ledger: the side that has earned more over its lifetime wins
  //  - items: everything owned on either side; worn items follow the winning side
  //  - streak: longest best; current count from whichever side played most recently
  //  - badges: everything earned on either side
  // Returns true if this device's progress changed.
  function canon(v) {
    if (Array.isArray(v)) return v.map(canon);
    if (v && typeof v === "object") return Object.keys(v).sort().reduce((o, k) => { o[k] = canon(v[k]); return o; }, {});
    return v;
  }
  function mergeRewards(progress, remote) {
    const before = JSON.stringify(canon(rewardSlice(progress)));
    if (!remote || typeof remote !== "object") return false;
    const r = { koala: remote.koala, streak: remote.streak, badges: remote.badges };
    ensureKoala(r);
    r.streak = ensureStreak(r.streak);
    if (!r.badges || typeof r.badges !== "object") r.badges = {};

    const l = progress.koala;
    const remoteWins = r.koala.earned > l.earned;
    const base = remoteWins ? r.koala : l;
    const other = remoteWins ? l : r.koala;
    const owned = {};
    [other.items.owned, base.items.owned].forEach((o) => Object.keys(o).forEach((id) => {
      owned[id] = owned[id] ? Math.min(owned[id], o[id]) : o[id];
    }));
    const equipped = Object.assign({}, other.items.equipped, base.items.equipped);
    progress.koala = {
      v: 1, coins: base.coins, earned: Math.max(base.earned, other.earned),
      ledger: base.ledger.slice(), items: { owned, equipped },
    };
    // keep ledger keys from the other side so an applied gift is never applied twice
    other.ledger.forEach((e) => { if (e.key && !progress.koala.ledger.some((x) => x.key === e.key)) progress.koala.ledger.push(e); });
    ensureKoala(progress);

    const a = progress.streak, b = r.streak;
    const later = (b.lastDay || "") > (a.lastDay || "") || ((b.lastDay || "") === (a.lastDay || "") && b.count > a.count) ? b : a;
    progress.streak = { count: later.count, lastDay: later.lastDay, best: Math.max(a.best, b.best), restWeek: later.restWeek };
    Object.keys(r.badges).forEach((id) => {
      if (!progress.badges[id] || r.badges[id] < progress.badges[id]) progress.badges[id] = r.badges[id];
    });
    return JSON.stringify(canon(rewardSlice(progress))) !== before;
  }

  return {
    REWARD_CONFIG,
    dateKey, daysBetween, shiftDay, weekKey,
    ensureKoala, awardCoins, spendCoins, adjustCoins, awardLearning, learningProgress, awardMission, awardBadge, awardReview, rewardSlice, mergeRewards,
    ITEM_SLOTS, ROOM_SLOTS, ITEMS, isSeasonActive, visibleItems, itemById, itemStatus, buyItem, equipItem, unequipSlot, syncStreakUnlocks, nextReward,
    levelInfo,
    ensureStreak, advanceStreak, streakStatus,
  };
});
