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
    // Coins for a learning round: every `correctPerReward` correct answers in a mode earn that mode's
    // coins. Free accounts get `dailyRewardsPerMode` rounds a day, then `bonusRounds` smaller rounds of
    // `bonusCoins`; paid (premium) accounts have no daily cap and no bonus tier. Wrong answers never cost coins.
    learning: { correctPerReward: 10, dailyRewardsPerMode: 3, bonusRounds: 3, bonusCoins: 5 },
    // Flashcards pay for correct answers in the quiz that follows every flashcard round.
    // Typing / times-table are easy to farm, so a round needs 50 correct answers.
    learningByMode: {
      tt: { correctPerReward: 50, dailyRewardsPerMode: 2, bonusRounds: 2, bonusCoins: 5 },
      typing: { correctPerReward: 50, dailyRewardsPerMode: 2, bonusRounds: 2, bonusCoins: 5 },
    },
    // Typing / times-table: coins per round are scaled by a multiplier (locked speed = half; everyone else 1x).
    game: { lockedMult: 0.5 },
    // Today's Mission: every task needs `goal` questions answered (right or wrong); finishing pays dailyMission (retry: missionRetry).
    mission: { goal: 15, retryMaxFree: 3 },
    // A review session pays only when it has at least `minQuestions` questions and `minRightPct` of them are right,
    // and only the first `maxPaidPerDay` sessions of a day pay.
    reviewRule: { minQuestions: 10, minRightPct: 0.5, maxPaidPerDay: 2 },
    // Pace target: a child who only finishes Today's Mission every day earns ~90 coins a day
    // (3 tasks x 15 questions answered — mostly right, so ~1 round each — plus the mission), so a room's core set
    // (wallpaper, rug, desk, lamp, shelf, poster, plant ~ 620 coins) takes about a week.
    coins: {
      quiz: 15,
      spelling: 15,
      flashcards: 15,
      timesTable: 15,
      typing: 15,
      review: 25,
      dailyMission: 50,
      missionRetry: 10,
    },
    // Bonus coins when a badge is earned (badge id -> coins).
    // Unlisted badges use badgeDefault.
    badgeBonus: {},
    badgeDefault: 50,
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
  const ITEM_SLOTS = ["headwear", "face", "clothing", "bottoms", "jewelry", "shoes", "accessory"];
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
    // Phase 6b: every category now has 10+ items; jewelry and shoes are new categories.
    { id: "beanie", slot: "headwear", name: { en: "Winter Beanie", ko: "털모자" }, unlock: { coins: 70 } },
    { id: "cowboyHat", slot: "headwear", name: { en: "Cowboy Hat", ko: "카우보이 모자" }, unlock: { coins: 110 } },
    { id: "chefHat", slot: "headwear", name: { en: "Chef Hat", ko: "요리사 모자" }, unlock: { coins: 90 } },
    { id: "bunnyEars", slot: "headwear", name: { en: "Bunny Ears", ko: "토끼 귀" }, unlock: { coins: 100 } },
    { id: "heartGlasses", slot: "face", name: { en: "Heart Glasses", ko: "하트 안경" }, unlock: { coins: 90 } },
    { id: "catEyeGlasses", slot: "face", name: { en: "Cat-eye Glasses", ko: "캣아이 안경" }, unlock: { coins: 100 } },
    { id: "goggles", slot: "face", name: { en: "Swim Goggles", ko: "수영 고글" }, unlock: { coins: 120 } },
    { id: "eyePatch", slot: "face", name: { en: "Eye Patch", ko: "안대" }, unlock: { coins: 60 } },
    { id: "moustache", slot: "face", name: { en: "Moustache", ko: "콧수염" }, unlock: { coins: 80 } },
    { id: "freckles", slot: "face", name: { en: "Freckles", ko: "주근깨" }, unlock: { coins: 40 } },
    { id: "monocle", slot: "face", name: { en: "Monocle", ko: "외알 안경" }, unlock: { coins: 130 } },
    { id: "tshirt", slot: "clothing", name: { en: "Blue T-shirt", ko: "파란 티셔츠" }, unlock: { coins: 60 } },
    { id: "hoodie", slot: "clothing", name: { en: "Green Hoodie", ko: "초록 후드티" }, unlock: { coins: 110 } },
    { id: "stripeShirt", slot: "clothing", name: { en: "Striped Shirt", ko: "줄무늬 셔츠" }, unlock: { coins: 80 } },
    { id: "pinkDress", slot: "clothing", name: { en: "Pink Dress", ko: "분홍 원피스" }, unlock: { coins: 120 } },
    { id: "labCoat", slot: "clothing", name: { en: "Lab Coat", ko: "과학자 가운" }, unlock: { coins: 130 } },
    { id: "overalls", slot: "clothing", name: { en: "Overalls", ko: "멜빵바지" }, unlock: { coins: 100 } },
    { id: "jersey", slot: "clothing", name: { en: "Soccer Jersey", ko: "축구 유니폼" }, unlock: { coins: 110 } },
    { id: "balloon", slot: "accessory", name: { en: "Balloon", ko: "풍선" }, unlock: { coins: 60 } },
    { id: "magicWand", slot: "accessory", name: { en: "Magic Wand", ko: "마법 지팡이" }, unlock: { coins: 100 } },
    { id: "umbrella", slot: "accessory", name: { en: "Umbrella", ko: "우산" }, unlock: { coins: 110 } },
    { id: "guitar", slot: "accessory", name: { en: "Guitar", ko: "기타" }, unlock: { coins: 150 } },
    { id: "storyBook", slot: "accessory", name: { en: "Story Book", ko: "동화책" }, unlock: { coins: 70 } },
    { id: "camera", slot: "accessory", name: { en: "Camera", ko: "카메라" }, unlock: { coins: 120 } },
    { id: "soccerBall", slot: "accessory", name: { en: "Soccer Ball", ko: "축구공" }, unlock: { coins: 80 } },
    { id: "pearlNecklace", slot: "jewelry", name: { en: "Pearl Necklace", ko: "진주 목걸이" }, unlock: { coins: 80 } },
    { id: "goldChain", slot: "jewelry", name: { en: "Gold Chain", ko: "금 목걸이" }, unlock: { coins: 100 } },
    { id: "heartPendant", slot: "jewelry", name: { en: "Heart Pendant", ko: "하트 펜던트" }, unlock: { coins: 90 } },
    { id: "starPendant", slot: "jewelry", name: { en: "Star Pendant", ko: "별 펜던트" }, unlock: { coins: 90 } },
    { id: "diamondPendant", slot: "jewelry", name: { en: "Diamond Pendant", ko: "다이아몬드 펜던트" }, unlock: { coins: 200 } },
    { id: "goldEarrings", slot: "jewelry", name: { en: "Gold Earrings", ko: "금 귀걸이" }, unlock: { coins: 70 } },
    { id: "hoopEarrings", slot: "jewelry", name: { en: "Hoop Earrings", ko: "링 귀걸이" }, unlock: { coins: 80 } },
    { id: "friendshipBracelet", slot: "jewelry", name: { en: "Friendship Bracelet", ko: "우정 팔찌" }, unlock: { coins: 50 } },
    { id: "rubyBrooch", slot: "jewelry", name: { en: "Ruby Brooch", ko: "루비 브로치" }, unlock: { coins: 150 } },
    { id: "hairClip", slot: "jewelry", name: { en: "Ribbon Hair Clip", ko: "리본 머리핀" }, unlock: { coins: 60 } },
    { id: "sneakers", slot: "shoes", name: { en: "Red Sneakers", ko: "빨간 운동화" }, unlock: { coins: 70 } },
    { id: "boots", slot: "shoes", name: { en: "Brown Boots", ko: "갈색 부츠" }, unlock: { coins: 90 } },
    { id: "rainBoots", slot: "shoes", name: { en: "Rain Boots", ko: "레인부츠" }, unlock: { coins: 90 } },
    { id: "flipFlops", slot: "shoes", name: { en: "Thongs", ko: "쪼리" }, unlock: { coins: 50 } },
    { id: "slippers", slot: "shoes", name: { en: "Fluffy Slippers", ko: "솜 슬리퍼" }, unlock: { coins: 60 } },
    { id: "balletShoes", slot: "shoes", name: { en: "Ballet Shoes", ko: "발레 슈즈" }, unlock: { coins: 100 } },
    { id: "soccerBoots", slot: "shoes", name: { en: "Soccer Boots", ko: "축구화" }, unlock: { coins: 110 } },
    { id: "rollerSkates", slot: "shoes", name: { en: "Roller Skates", ko: "롤러스케이트" }, unlock: { coins: 130 } },
    { id: "sparkleShoes", slot: "shoes", name: { en: "Sparkle Shoes", ko: "반짝 신발" }, unlock: { coins: 120 } },
    { id: "snowBoots", slot: "shoes", name: { en: "Snow Boots", ko: "눈 부츠" }, unlock: { coins: 110 } },
    // Parity with the Pop-out wardrobe: every Pop-out item has a flat Sticker twin.
    { id: "bushHat", slot: "headwear", name: { en: "Bush Hat", ko: "부시햇" }, unlock: { coins: 80 } },
    { id: "jeans", slot: "bottoms", name: { en: "Jeans", ko: "청바지" }, unlock: { coins: 90 } },
    { id: "khakiShorts", slot: "bottoms", name: { en: "Khaki Shorts", ko: "카키 반바지" }, unlock: { coins: 70 } },
    { id: "cargoPants", slot: "bottoms", name: { en: "Cargo Pants", ko: "카고 바지" }, unlock: { coins: 100 } },
    { id: "sweatpants", slot: "bottoms", name: { en: "Jogger Pants", ko: "남색 조거팬츠" }, unlock: { coins: 80 } },
    { id: "plaidSkirt", slot: "bottoms", name: { en: "Plaid Skirt", ko: "체크 치마" }, unlock: { coins: 90 } },
    { id: "denimSkirt", slot: "bottoms", name: { en: "Denim Skirt", ko: "청치마" }, unlock: { coins: 90 } },
    { id: "flowerSkirt", slot: "bottoms", name: { en: "Flower Skirt", ko: "꽃무늬 치마" }, unlock: { coins: 100 } },
    { id: "tutu", slot: "bottoms", name: { en: "Tutu", ko: "튀튀 치마" }, unlock: { coins: 110 } },
    { id: "angelWings", slot: "accessory", name: { en: "Angel Wings", ko: "천사 날개" }, unlock: { coins: 180 } },
    { id: "butterflyWings", slot: "accessory", name: { en: "Butterfly Wings", ko: "나비 날개" }, unlock: { coins: 170 } },
    { id: "cowboyBoots", slot: "shoes", name: { en: "Cowboy Boots", ko: "카우보이 부츠" }, unlock: { coins: 120 } },
    { id: "sandals", slot: "shoes", name: { en: "Sandals", ko: "샌들" }, unlock: { coins: 60 } },
    // (stage 5 S8, 2026-11-17: the old Study Room items, kind "room", are gone — old ids stay in un-moved wallets via LEGACY_ROOM_IDS)
    // Picture frames (pick the picture) and toy boxes (pick the toys): both hold sub-items, see SUB_PARENTS.
  ];
  const ROOM_SLOTS = [];   // the old Study Room slots are gone (stage 5 S8); admin-added room categories may still be pushed in by loadItems
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
    return ITEMS.filter((it) => it.slot === slot && !it.no2d && (!it.season || k.items.owned[it.id] || o.showAll || isSeasonActive(it, o.date)));
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

/* ---------- Sub-items: things that sit on / in a room item ----------
   Tap a bookshelf in the room and its books are listed; a desk has things on top and in
   the drawer; a frame holds one picture; a toy box holds toys. Sub-items are free once the
   parent item is in the room. What is picked is saved in koala.items.sub[parentId]. */
  const SUB_RULES = {
    asmr: { mode: "multi", groups: { squishy: 3, clicky: 3, popit: 3, crunch: 3 } },
  };
  const SUB_PARENTS = {   // the old room parents (bookshelf, frames, toy boxes, pets) are gone (stage 5 S8)
  };
  const sb = (id, kind, group, en, ko, denEn, denKo) => ({ id, kind, group, name: { en, ko }, desc: { en: denEn, ko: denKo } });
  const SUB_ITEMS = [
    sb("mochiSquish", "asmr", "squishy", "Mochi Squishy", "모찌 말랑이", "Squeeze it — soft and chewy!", "꾹 누르면 말랑말랑 쫀득!"),
    sb("slimeSquish", "asmr", "squishy", "Glitter Slime", "반짝 슬라임", "Stretchy, sticky, bloop!", "쭈우욱 늘어나고 뽀글뽀글!"),
    sb("tofuSquish", "asmr", "squishy", "Tofu Squishy", "두부 말랑이", "Pat pat — a wobbly little block.", "토닥토닥, 흔들흔들 말랑한 두부예요."),
    sb("jellySquish", "asmr", "squishy", "Jelly Cube", "젤리 큐브", "Jiggle jiggle!", "탱글탱글 흔들흔들!"),
    sb("clickPen", "asmr", "clicky", "Click Pen", "딸깍 펜", "Click, click — over and over.", "딸깍딸깍, 자꾸 누르고 싶어요."),
    sb("keySwitch", "asmr", "clicky", "Keyboard Switch", "키보드 스위치", "A deep, cosy typing sound.", "또각또각 포근한 타자 소리!"),
    sb("fidgetCube", "asmr", "clicky", "Fidget Cube", "피젯 큐브", "Gears, buttons and a roller.", "기어, 버튼, 롤러가 한가득!"),
    sb("clickerBtn", "asmr", "clicky", "Click Button", "딸깍 버튼", "One crisp click each time.", "누를 때마다 깔끔한 딸깍!"),
    sb("bubbleWrap", "asmr", "popit", "Bubble Wrap", "뽁뽁이", "Pop every bubble!", "뽁뽁 터뜨려요!"),
    sb("pushPop", "asmr", "popit", "Push Pop", "푸시팝", "Push in, flip, push again.", "꾹 누르고 뒤집고 또 꾹!"),
    sb("popBoba", "asmr", "popit", "Popping Boba", "팝핑 보바", "Little juicy bursts.", "톡톡 터지는 과즙 구슬!"),
    sb("waterBeads", "asmr", "popit", "Squishy Jelly Ball", "말랑 젤리볼", "Squish, plop, bounce!", "꾹 누르면 퐁!"),
    sb("kineticSand", "asmr", "crunch", "Kinetic Sand", "움직이는 모래", "Slice it and it crumbles.", "슥 자르면 사르르 부서져요."),
    sb("soapCut", "asmr", "crunch", "Soap Carving", "비누 깎기", "Crunchy little slices.", "사각사각 비누를 깎아요."),
    sb("iceCrunch", "asmr", "crunch", "Crunchy Ice", "얼음 아삭", "Crack and crunch!", "아삭! 와작! 얼음 깨기!"),
    sb("scratchPad", "asmr", "crunch", "Scratch Art", "스크래치 아트", "Scritch-scratch rainbows.", "사각사각 무지개를 긁어요."),
  ];
  // Every sub-item is bought with Koala Coins, and always costs LESS than the cheapest item it goes with.
  // Cost 0 = comes with the parent (a frame's first picture).
  const SUB_COST = {   // ASMR toys only (the old room sub-items are gone — stage 5 S8)
    mochiSquish: 15, slimeSquish: 20, tofuSquish: 15, jellySquish: 20, clickPen: 10, keySwitch: 20, fidgetCube: 25, clickerBtn: 15, bubbleWrap: 10, pushPop: 15, popBoba: 20, waterBeads: 20, kineticSand: 25, soapCut: 20, iceCrunch: 20, scratchPad: 15,
  };
  SUB_ITEMS.forEach((x) => { x.cost = SUB_COST[x.id] || 0; });
  // The toys that used to stand on the floor by themselves now live in toy boxes.
  const LEGACY_TOYS = { teddyToy: "toyTeddy", ballToy: "toyBall", blocksToy: "toyBlocks", carToy: "toyCar", robotToy: "toyRobot", drumToy: "toyDrum", dinoToy: "toyDino", horseToy: "toyRocket", trainToy: "toyDuck", giftToy: "toyBunny" };
  const SELL_RATE = 0.8; // selling gives back 80% — a 20% fee
  const sellValue = (cost) => Math.floor(Math.max(0, Number(cost) || 0) * SELL_RATE);
  const subKind = (parentId) => SUB_PARENTS[parentId] || null;
  const subById = (id) => SUB_ITEMS.find((s) => s.id === id) || null;
  const subItemsFor = (parentId) => { const kind = SUB_PARENTS[parentId]; return kind ? SUB_ITEMS.filter((s) => s.kind === kind) : []; };
  const subLimit = (kind, group) => (SUB_RULES[kind] && SUB_RULES[kind].groups[group]) || 0;
  // Keep only valid sub-items of the right kind, no repeats, within each group's limit.
  function cleanSub(parentId, ids) {
    const kind = SUB_PARENTS[parentId];
    if (!kind || !Array.isArray(ids)) return [];
    const count = {};
    const out = [];
    ids.forEach((id) => {
      const it = subById(id);
      if (!it || it.kind !== kind || out.includes(id)) return;
      count[it.group] = (count[it.group] || 0) + 1;
      if (count[it.group] <= subLimit(kind, it.group)) out.push(id);
    });
    return out;
  }
  // What is on / in a room item right now (a frame always shows a picture).
  function subSelection(progress, parentId) {
    const k = ensureKoala(progress);
    const kind = SUB_PARENTS[parentId];
    if (!kind) return [];
    const sel = (k.items.sub || {})[parentId] || [];
    return sel.length || !SUB_RULES[kind].fallback ? sel.slice() : [SUB_RULES[kind].fallback];
  }
  // Is this sub-item in the child's collection? (Free ones always are.)
  function isSubOwned(progress, subId) {
    const it = subById(subId);
    if (!it) return false;
    if (!it.cost) return true;
    return !!ensureKoala(progress).items.subOwned[subId];
  }
  // Put an OWNED sub-item on / take it off (a frame swaps its picture, a pet's outfit swaps within its group).
  // Returns { ok, on } or { ok:false, reason: notParent | unknown | notOwned | full }.
  // (The admin has to "buy" it too — it just costs nothing.)
  function toggleSub(progress, parentId, subId, opts) {
    const k = ensureKoala(progress);
    const kind = SUB_PARENTS[parentId];
    const it = subById(subId);
    if (!kind) return { ok: false, reason: "notParent" };
    if (!it || it.kind !== kind) return { ok: false, reason: "unknown" };
    if (!isSubOwned(progress, subId)) return { ok: false, reason: "notOwned" };
    const cur = subSelection(progress, parentId);
    if (SUB_RULES[kind].mode === "single") {
      k.items.sub[parentId] = [subId];
      return { ok: true, on: true };
    }
    if (cur.includes(subId)) {
      k.items.sub[parentId] = cur.filter((x) => x !== subId);
      return { ok: true, on: false };
    }
    const inGroup = cur.filter((x) => subById(x).group === it.group);
    if (inGroup.length >= subLimit(kind, it.group)) {
      if (!SUB_RULES[kind].swap) return { ok: false, reason: "full", group: it.group };
      k.items.sub[parentId] = cur.filter((x) => !inGroup.includes(x)).concat(subId);
      return { ok: true, on: true };
    }
    k.items.sub[parentId] = cur.concat(subId);
    return { ok: true, on: true };
  }
  // Buy a sub-item with Koala Coins and put it straight into its parent when there is room.
  function buySub(progress, parentId, subId, opts) {
    const k = ensureKoala(progress);
    const it = subById(subId);
    if (!SUB_PARENTS[parentId]) return { ok: false, reason: "notParent" };
    if (!it || it.kind !== SUB_PARENTS[parentId]) return { ok: false, reason: "unknown" };
    if (isSubOwned(progress, subId)) return { ok: false, reason: "owned" };
    if (!(opts && opts.unlimited) && !spendCoins(progress, it.cost, "sub:" + subId, opts)) return { ok: false, reason: "notEnoughCoins" };
    k.items.subOwned[subId] = (opts && opts.now) || Date.now();
    delete k.items.sold[subId];
    const put = toggleSub(progress, parentId, subId, opts);
    return { ok: true, sub: it, placed: !!(put.ok && put.on) };
  }

  /* ---------- Selling back ---------- */
  function recordSale(k, n, why, opts) {
    if (n > 0) {
      k.coins += n;
      k.refunded += n;
      const entry = { t: (opts && opts.now) != null ? opts.now : Date.now(), n, why };
      if (opts && opts.key) entry.key = String(opts.key);
      pushLedger(k, entry);
      noteKey(k, entry.key, n, entry.t);
    }
  }
  // A sale made outside the 2D shop (the 3D house sells its own furniture): put the money in the wallet and the ledger.
  function creditSale(progress, n, why, opts) {
    const k = ensureKoala(progress);
    if (opts && opts.key && hasKey(k, String(opts.key))) return 0; // a keyed sale/refund is paid only once
    const refund = (opts && opts.unlimited) ? 0 : Math.max(0, Math.floor(Number(n) || 0));
    recordSale(k, refund, why, opts);
    if (opts && opts.key && !refund) noteKey(k, String(opts.key), 0, opts.now != null ? opts.now : Date.now()); // admin: 0 coins, the key still counts
    return refund;
  }
  // Sell a bought room / character item back: 80% of its price returns to the coin wallet.
  // Free and streak/badge items can't be sold. The admin has unlimited coins, so gets nothing back.
  function sellItem(progress, id, opts) {
    const k = ensureKoala(progress);
    const it = itemById(id);
    if (!it || (!it.unlock.coins && !(opts && opts.unlimited))) return { ok: false, reason: "notForSale" };
    if (!k.items.owned[id]) return { ok: false, reason: "notOwned" };
    const unlimited = !!(opts && opts.unlimited);
    const refund = unlimited ? 0 : sellValue(it.unlock.coins);
    if (k.items.equipped[it.slot] === id) delete k.items.equipped[it.slot];
    delete k.items.owned[id];
    k.items.sold[id] = (opts && opts.now) || Date.now();
    recordSale(k, refund, "sell:" + id, opts);
    return { ok: true, item: it, refund, fee: unlimited ? 0 : it.unlock.coins - refund };
  }
  function sellSub(progress, subId, opts) {
    const k = ensureKoala(progress);
    const it = subById(subId);
    if (!it || !it.cost) return { ok: false, reason: "notForSale" };
    if (!k.items.subOwned[subId]) return { ok: false, reason: "notOwned" };
    const unlimited = !!(opts && opts.unlimited);
    const refund = unlimited ? 0 : sellValue(it.cost);
    delete k.items.subOwned[subId];
    k.items.sold[subId] = (opts && opts.now) || Date.now();
    Object.keys(k.items.sub).forEach((pid) => {
      k.items.sub[pid] = k.items.sub[pid].filter((x) => x !== subId);
      if (!k.items.sub[pid].length) delete k.items.sub[pid];
    });
    recordSale(k, refund, "sellsub:" + subId, opts);
    return { ok: true, sub: it, refund, fee: unlimited ? 0 : it.cost - refund };
  }

  /* ---------- Koala state ---------- */
  /* LEGACY-IDS:begin (generated by scripts/gen-legacy-rooms.mjs — old room ids kept in a wallet until it is refunded) */
  const LEGACY_ROOM_IDS = new Set(["abcPoster","aluminumFrame","aquariumShelf","artDesk","bambooPlant","beachTowel","bigFrame","blueDotWall","blueRug","bonsai","bookDesk","bookshelf","bulbLamp","bunnyPet","buntingDecor","cactus","candyFrame","catPet","chainDecor","chandelier","cityWindow","cloudLamp","cloudRug","computerDesk","craftDesk","craftShelf","craneDecor","creamWall","cubbyShelf","curtainWindow","deskLamp","dinoPoster","dogPet","ducklingPet","familyFrame","fern","fishBowlPet","fishPoster","floatShelf","flowerLamp","flowerRug","forestWall","frogPet","gameShelf","ginghamWall","globeDesk","globeShelf","goldFrame","greenRug","heartDecor","heartRug","hedgehogPet","jellyLamp","joeyPet","kangarooPoster","lanternLamp","lavender","leafDecor","lightDecor","mapPoster","mathPoster","mintWall","monstera","moonLamp","mountainPoster","musicPoster","nightWall","nightWindow","oceanWall","palmTree","parrotPet","pawRug","pianoDesk","pinkDesk","pinkWall","plantShelf","pomDecor","portholeWindow","pottedPlant","purpleRug","rainWindow","rainbowLamp","rainbowPoster","rainbowRug","rainbowShelf","rainbowToyBox","redRug","rocketPoster","roundFrame","scienceDesk","seaWindow","skyWall","skyWindow","smallFrame","snackDesk","snowDecor","snowWindow","solarPoster","spaceWall","starDecor","starLamp","starRug","starToyBox","streamerDecor","stripeRug","studyDesk","succulents","sunLamp","sunflower","sunsetWall","sunsetWindow","toyShelf","treeWindow","trophyCabinet","tulips","turtlePet","woodFrame","woodToyBox","xmasTree"]);
  const LEGACY_SUB_IDS = new Set(["abcBook","alarmClock","animalBook","artBook","atlasBook","bread","cake","cheese","chocolate","cocoaMug","cola","conditioner","crayonBox","cupBrush","dinoBook","eggs","fairyBook","fruit","handwash","iceCream","jokeBook","juice","kimchi","koalaBook","marbleBag","mathBook","meat","milk","miniCactus","miniGlobe","mirror","notebooks","oceanBook","pasta","pencilCup","photoBeach","photoBirthday","photoCamp","photoGrad","photoPark","photoPicnic","photoSnow","photoZoo","picBalloons","picBeach","picButterfly","picCake","picCastle","picDinoPic","picFish","picFlowers","picForest","picKitten","picKoala","picMeadow","picMountain","picNight","picPuppy","picRainbow","picRocketPic","picSea","picSnow","picSpace","pizza","pwBell","pwBoots","pwBow","pwBowTie","pwCape","pwCollar","pwFlowers","pwPartyHat","pwRaincoat","pwScarf","pwSneakers","pwSweater","pwTopHat","secretDiary","shampoo","shoeBoots","shoeRain","shoeSandals","shoeSchool","shoeSlippers","shoeSneakers","soap","songBook","spaceBook","stickerBook","toolDrill","toolHammer","toolPaint","toolPliers","toolSaw","toolScrewdriver","toolTape","toolWrench","toothbrush","toothpaste","toyBall","toyBlocks","toyBunny","toyCar","toyDino","toyDrum","toyDuck","toyRobot","toyRocket","toyTeddy","veggies","water"]);
  /* LEGACY-IDS:end */
  function ensureKoala(progress) {
    let k = progress.koala;
    if (!k || typeof k !== "object") k = progress.koala = {};
    k.v = 2;
    k.coins = Number.isFinite(k.coins) && k.coins > 0 ? Math.floor(k.coins) : 0;
    k.earned = Number.isFinite(k.earned) && k.earned > 0 ? Math.floor(k.earned) : 0;
    k.refunded = Number.isFinite(k.refunded) && k.refunded >= 0 ? Math.floor(k.refunded) : 0;
    // Lifetime earnings never count coins given back (selling, old-room refunds): coins = earned - spent + refunded,
    // so earned is at least coins - refunded. (It used to be raised to coins, so a big refund raised the level.)
    // earned is never lowered — a wallet that was already raised keeps its level.
    if (k.earned < k.coins - k.refunded) k.earned = k.coins - k.refunded;
    if (!Array.isArray(k.ledger)) k.ledger = [];
    // keys: every keyed coin move (award, spend, sale, refund, gift) -> [n, t], kept apart from the 100-entry ledger
    // so "only once" still holds after the ledger is cut and two devices merge (H9 / S1, S2).
    // A wallet from before keys existed builds them from its ledger; anything older than its newest entry may be
    // missing (the ledger was cut), so keysSince marks that point and a merge never re-applies older keys.
    if (!k.keys || typeof k.keys !== "object" || Array.isArray(k.keys)) {
      k.keys = {};
      let last = 0;
      k.ledger.forEach((e) => {
        if (!e || typeof e !== "object") return;
        const t = Number(e.t) || 0;
        if (t > last) last = t;
        if (e.key && !k.keys[e.key]) k.keys[e.key] = [Math.trunc(Number(e.n) || 0), t];
      });
      k.keysSince = last;
    }
    k.keysSince = Number.isFinite(k.keysSince) && k.keysSince > 0 ? k.keysSince : 0;
    // moved: one-time move marks (old rooms refunded, ...) — merged from both sides, never dropped
    if (!k.moved || typeof k.moved !== "object" || Array.isArray(k.moved)) k.moved = {};
    if (!k.items || typeof k.items !== "object") k.items = {};
    if (!k.items.owned || typeof k.items.owned !== "object") k.items.owned = {};
    if (!k.items.equipped || typeof k.items.equipped !== "object") k.items.equipped = {};
    if (!k.items.sub || typeof k.items.sub !== "object" || Array.isArray(k.items.sub)) k.items.sub = {};
    ["subOwned", "sold"].forEach((key) => { if (!k.items[key] || typeof k.items[key] !== "object" || Array.isArray(k.items[key])) k.items[key] = {}; });
    // coin wallet totals (spent in the shop / given back by selling)
    k.spent = Number.isFinite(k.spent) && k.spent >= 0 ? Math.floor(k.spent) : Math.max(0, k.earned - k.coins);
    // Toys used to be single room items; they are toy-box sub-items now. Keep what the child owned.
    Object.keys(LEGACY_TOYS).forEach((old) => {
      const ts = k.items.owned[old];
      if (!ts) return;
      const to = LEGACY_TOYS[old];
      if (!(k.items.sold[to] >= ts)) k.items.subOwned[to] = Math.min(k.items.subOwned[to] || ts, ts);
      delete k.items.owned[old];
    });
    // Old room ids (stage 5 S6/S8): a wallet that has not been refunded yet (no moved.room2d) keeps them even after the
    // catalogue drops them, so the refund can still count them when that child first opens the new house.
    const keepLegacy = !k.moved.room2d;
    Object.keys(k.items.subOwned).forEach((id) => { const it = subById(id); if (!it && keepLegacy && LEGACY_SUB_IDS.has(id)) return; if (!it || !it.cost) delete k.items.subOwned[id]; });
    Object.keys(k.items.sub).forEach((pid) => {
      const clean = cleanSub(pid, k.items.sub[pid]).filter((id) => !subById(id).cost || k.items.subOwned[id]);
      if (clean.length) k.items.sub[pid] = clean; else delete k.items.sub[pid];
    });
    // Free items are owned from the start; drop anything the catalogue no
    // longer knows about so a removed item can never stay equipped.
    ITEMS.forEach((it) => { if (it.unlock.free && !k.items.owned[it.id]) k.items.owned[it.id] = 1; });
    Object.keys(k.items.owned).forEach((id) => { if (!itemById(id) && !(keepLegacy && LEGACY_ROOM_IDS.has(id))) delete k.items.owned[id]; });
    Object.keys(k.items.equipped).forEach((slot) => {
      const it = itemById(k.items.equipped[slot]);
      if (!it || it.slot !== slot || !k.items.owned[it.id]) delete k.items.equipped[slot];
    });
    return k;
  }

  /* ---------- Keys: "only once" for every coin move (H9 / S1, S2) ---------- */
  // Kept forever: one-time refunds/moves. Everything else: the last KEY_DAYS days, at most KEY_MAX keys.
  const KEY_FOREVER = /^(refund:|move:)/;
  const KEY_DAYS = 90, KEY_MAX = 600, DAY_MS = 86400000;
  function hasKey(k, key) { return !!(k.keys && k.keys[key]) || k.ledger.some((e) => e && e.key === key); }
  function noteKey(k, key, n, t) { if (key) k.keys[String(key)] = [n, t]; }
  function pushLedger(k, entry) {
    k.ledger.push(entry);
    if (k.ledger.length > REWARD_CONFIG.ledgerMax) k.ledger.splice(0, k.ledger.length - REWARD_CONFIG.ledgerMax);
  }
  // Drops old keys (never the forever ones). max = how many may stay. Returns how many were dropped.
  // keysSince moves up to the newest dropped key, so a merge never re-applies a key this wallet may have forgotten.
  function trimKeys(progressOrKoala, now, max) {
    const k = progressOrKoala && progressOrKoala.koala ? ensureKoala(progressOrKoala) : progressOrKoala;
    const limit = max != null ? max : KEY_MAX, cutoff = (now != null ? now : Date.now()) - KEY_DAYS * DAY_MS;
    const list = Object.keys(k.keys).filter((key) => !KEY_FOREVER.test(key)).map((key) => [key, Number(k.keys[key][1]) || 0]).sort((a, b) => a[1] - b[1]);
    let drop = list.filter(([, t]) => t < cutoff);
    const keep = list.length - drop.length;
    if (keep > limit) drop = drop.concat(list.filter(([, t]) => t >= cutoff).slice(0, keep - limit));
    drop.forEach(([key, t]) => { delete k.keys[key]; if (t > k.keysSince) k.keysSince = t; });
    return drop.length;
  }
  // Makes the wallet JSON fit in maxChars by trimming keys harder (the server keeps a wallet under 100,000; aim for 80%).
  // Returns how many keys were dropped.
  function fitWallet(progress, maxChars, now) {
    const k = ensureKoala(progress);
    let dropped = trimKeys(k, now);
    let max = Object.keys(k.keys).length;
    while (JSON.stringify(k).length > maxChars && max > 0) { max = Math.floor(max * 0.7); dropped += trimKeys(k, now, max); }
    return dropped;
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
    if (o.key && hasKey(k, String(o.key))) return 0;
    k.coins += n;
    k.earned += n;
    const entry = { t: o.now != null ? o.now : Date.now(), n, why: String(why || "") };
    if (o.key) entry.key = String(o.key);
    pushLedger(k, entry);
    noteKey(k, entry.key, n, entry.t);
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
    // With a key a purchase is taken only once: the same key again is a no-op success (o.result "dup");
    // a key that was undone (key + ":undo") can't be spent again (o.result "used").
    if (o.key) {
      if (hasKey(k, String(o.key) + ":undo")) { o.result = "used"; return false; }
      if (hasKey(k, String(o.key))) { o.result = "dup"; return true; }
    }
    if (k.coins < n) return false;
    k.coins -= n;
    k.spent += n;
    const entry = { t: o.now != null ? o.now : Date.now(), n: -n, why: String(why || "") };
    if (o.key) entry.key = String(o.key);
    pushLedger(k, entry);
    noteKey(k, entry.key, -n, entry.t);
    return true;
  }

  // The new Koala House's coin moves (stage 5 S4, bridge.wallet). kind: "spend" | "refund" | "award".
  // Same rules as the house app's wallet (koala-house-3d src/game/wallet.ts): a key is required and each key happens once
  // (again = { dup }); after key + ":undo" the key can't be used again; the admin (opts.unlimited) moves 0 coins but the
  // key is still written down so the history shows it. award counts toward the level (earned); refund/sell does not.
  // The ledger line keeps the item name { ko, en } (40 chars each) so the history reads well after an item changes.
  function houseWallet(progress, kind, amount, op, opts) {
    const o = opts || {};
    const key = op && typeof op.key === "string" ? op.key : "";
    const n = Math.floor(Number(amount));
    if (!key || !Number.isFinite(n) || n < 0 || !["spend", "refund", "award"].includes(kind)) return { ok: false, reason: "error" };
    const k = ensureKoala(progress);
    if (!/:undo$/.test(key) && hasKey(k, key + ":undo")) return { ok: false, reason: "used" };
    if (hasKey(k, key)) return kind === "spend" ? { ok: true, charged: 0, dup: true } : { ok: true, credited: 0, dup: true };
    const amt = o.unlimited ? 0 : n;
    if (kind === "spend") { if (amt > k.coins) return { ok: false, reason: "noCoins" }; k.coins -= amt; k.spent += amt; }
    else { k.coins += amt; if (kind === "award") k.earned += amt; else k.refunded += amt; }
    const t = o.now != null ? o.now : Date.now();
    const entry = { t, n: kind === "spend" ? (amt ? -amt : 0) : amt, why: String(op.why || "house"), key };
    if (op.name && typeof op.name === "object") entry.name = { ko: String(op.name.ko || "").slice(0, 40), en: String(op.name.en || "").slice(0, 40) };
    pushLedger(k, entry);
    noteKey(k, key, entry.n, t);
    return kind === "spend" ? { ok: true, charged: amt } : { ok: true, credited: amt };
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
    if (o.key && hasKey(k, String(o.key))) return 0;
    const take = Math.min(k.coins, -n);
    k.coins -= take;
    const entry = { t: o.now != null ? o.now : Date.now(), n: -take, why: String(why || "") };
    if (o.key) entry.key = String(o.key);
    pushLedger(k, entry);
    noteKey(k, entry.key, -take, entry.t);
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
    if (unlimited) return { state: "buyable", cost: item.unlock.coins || 0 }; // admin: no badge / streak / season locks, nothing is ever spent
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
    if (!it || (!it.unlock.coins && !(opts && opts.unlimited))) return { ok: false, reason: "notForSale" }; // admin can take badge / streak items too
    if (k.items.owned[id]) return { ok: false, reason: "owned" };
    if (!(opts && opts.unlimited) && !isSeasonActive(it, opts && opts.date)) return { ok: false, reason: "outOfSeason" };
    if (!(opts && opts.unlimited) && (it.unlock.coins ? !spendCoins(progress, it.unlock.coins, "item:" + id, opts) : false)) return { ok: false, reason: "notEnoughCoins" };
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
  // Multiplier for one round of a falling-words game: locked speed pays half, otherwise normal.
  function gameCoinMultiplier(st) {
    return st && st.locked ? REWARD_CONFIG.game.lockedMult : 1;
  }

  function learnCfg(mode) {
    return Object.assign({}, REWARD_CONFIG.learning, (REWARD_CONFIG.learningByMode || {})[mode]);
  }
  const scaleCoins = (base, opts) => (opts && opts.mult != null ? Math.max(1, Math.floor(base * opts.mult + 1e-9)) : base);

  // opts.unlimited (paid accounts): every reached round pays, no daily cap, no bonus tier.
  // opts.mult scales a round (typing / times table), never below 1 coin.
  function awardLearning(progress, mode, correctToday, day, opts) {
    const why = MODE_COINS[mode];
    if (!why) return [];
    const cfg = learnCfg(mode);
    const reached = Math.floor((correctToday || 0) / cfg.correctPerReward);
    const unlimited = !!(opts && opts.unlimited);
    const rounds = unlimited ? reached : Math.min(reached, cfg.dailyRewardsPerMode);
    const paid = [];
    const o = Object.assign({}, opts); delete o.unlimited;
    for (let i = 1; i <= rounds; i++) {
      const n = awardCoins(progress, scaleCoins(REWARD_CONFIG.coins[why], opts), why, Object.assign({}, o, { key: `learn:${mode}:${day}:${i}` }));
      if (n) paid.push({ why, n });
    }
    if (!unlimited) {
      const bonus = Math.min(Math.max(0, reached - cfg.dailyRewardsPerMode), cfg.bonusRounds);
      for (let i = 1; i <= bonus; i++) {
        const n = awardCoins(progress, scaleCoins(cfg.bonusCoins, opts), why, Object.assign({}, o, { key: `learnbonus:${mode}:${day}:${i}` }));
        if (n) paid.push({ why, n, bonus: true });
      }
    }
    return paid;
  }

  // Where the child stands in a mode today (for "Earn more Coins"). opts.unlimited = paid account.
  function learningProgress(mode, correctToday, opts) {
    const cfg = learnCfg(mode);
    const correct = correctToday || 0;
    const reached = Math.floor(correct / cfg.correctPerReward);
    const unlimited = !!(opts && opts.unlimited);
    const capped = !unlimited && reached >= cfg.dailyRewardsPerMode;
    const bonusDone = Math.min(Math.max(0, reached - cfg.dailyRewardsPerMode), cfg.bonusRounds);
    const bonusAll = !unlimited && bonusDone >= cfg.bonusRounds;
    const extra = Math.max(0, correct - cfg.correctPerReward * cfg.dailyRewardsPerMode);
    return {
      coins: REWARD_CONFIG.coins[MODE_COINS[mode]] || 0,
      goal: cfg.correctPerReward,
      unlimited,
      have: capped ? (bonusAll ? cfg.correctPerReward : extra % cfg.correctPerReward) : correct % cfg.correctPerReward,
      roundsDone: unlimited ? reached : Math.min(reached, cfg.dailyRewardsPerMode),
      roundsMax: unlimited ? Infinity : cfg.dailyRewardsPerMode,
      capped,
      bonusCoins: cfg.bonusCoins, bonusDone, bonusMax: cfg.bonusRounds, bonusAll,
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

  /* ---------- Learning record (read by Koala House missions) ----------
     missionLog: the days Today's Mission was finished (round 0), oldest first, the last
     MISSION_LOG_DAYS days — the same window progress.daily keeps. Older saves only have
     progress.missionDone (the latest day), so ensureMissionLog() folds that in.
     wordStats[word].firstAt / lastAt: when the word was first / last answered right (ms).
     Words answered before this existed have no times; they get them on their next right answer. */
  const MISSION_LOG_DAYS = 60;
  function ensureMissionLog(progress) {
    const seen = new Set((Array.isArray(progress.missionLog) ? progress.missionLog : []).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)));
    if (typeof progress.missionDone === "string" && /^\d{4}-\d{2}-\d{2}$/.test(progress.missionDone)) seen.add(progress.missionDone);
    progress.missionLog = [...seen].sort().slice(-MISSION_LOG_DAYS);
    return progress.missionLog;
  }
  function recordMissionDay(progress, day) {
    const log = ensureMissionLog(progress);
    if (!log.includes(day)) { log.push(day); log.sort(); }
    progress.missionLog = log.slice(-MISSION_LOG_DAYS);
    return progress.missionLog;
  }
  // Both devices' days survive a sync (the rest of progress is last-write-wins).
  function unionMissionLog(a, b) {
    return ensureMissionLog({ missionLog: [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])] });
  }
  function stampWordResult(stats, isCorrect, now) {
    if (isCorrect) {
      const t = Number(now) || Date.now();
      if (!stats.firstAt) stats.firstAt = t;
      stats.lastAt = t;
    }
    return stats;
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
  // A keyed coin move's kind: a gift taken back only changes coins; a purchase is spent; a sale/refund/undo is refunded;
  // everything else positive was earned.
  function moveKind(key, n) {
    if (n < 0) return /^grant:/.test(key) ? "coins" : "spent";
    if (/^(refund:|move:|sell:|house3d:sell:|house3d:unroom:)/.test(key) || /:undo$/.test(key)) return "refunded";
    return "earned";
  }
  // What `other` did that `base` never saw (by key). Used by mergeRewards and by the server's check.
  function otherKeyMoves(base, other) {
    const r = { coins: 0, earned: 0, spent: 0, refunded: 0, entries: [], keys: [] };
    const why = {};
    other.ledger.forEach((e) => { if (e && e.key) why[e.key] = e.why; });
    Object.keys(other.keys).forEach((key) => {
      if (hasKey(base, key)) return;
      const n = Math.trunc(Number(other.keys[key][0]) || 0), t = Number(other.keys[key][1]) || 0;
      if (t <= base.keysSince) return;
      const kind = moveKind(key, n);
      r.coins += n;
      if (kind === "earned") r.earned += n; else if (kind === "spent") r.spent += -n; else if (kind === "refunded") r.refunded += n;
      r.entries.push({ t, n, why: why[key] || "sync", key });
      r.keys.push(key);
    });
    return r;
  }
  // The coins a merge must give at least: the winner's balance plus the other side's unseen keyed moves (purchases count,
  // so a normal purchase on either device lowers it too). The server counts a merge whose result is lower (H9).
  function mergeExpectedCoins(a, b) {
    const pa = { koala: JSON.parse(JSON.stringify(a)) }, pb = { koala: JSON.parse(JSON.stringify(b)) };
    const ka = ensureKoala(pa), kb = ensureKoala(pb);
    const base = kb.earned > ka.earned ? kb : ka, other = base === ka ? kb : ka;
    return Math.max(0, base.coins + otherKeyMoves(base, other).coins);
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
    const sub = Object.assign({}, other.items.sub, base.items.sub);
    // owned sub-items and "sold" marks: a sale newer than the purchase wins, so a sold item can't come back from the other device
    const sold = {};
    [other.items.sold, base.items.sold].forEach((o) => Object.keys(o).forEach((id) => { sold[id] = Math.max(sold[id] || 0, o[id]); }));
    const subOwned = {};
    [other.items.subOwned, base.items.subOwned].forEach((o) => Object.keys(o).forEach((id) => {
      subOwned[id] = subOwned[id] ? Math.min(subOwned[id], o[id]) : o[id];
    }));
    [owned, subOwned].forEach((o) => Object.keys(o).forEach((id) => { if (sold[id] && sold[id] >= o[id]) delete o[id]; }));
    // Coins (H9 / S2): the winner's balance, plus every keyed coin move the other side made that the winner never saw —
    // purchases, sales, refunds, rewards, gifts — each key once. Unkeyed moves of the other side are not carried over
    // (as before). Keys older than the winner's keysSince are skipped: the winner may have forgotten them.
    const add = otherKeyMoves(base, other);
    progress.koala = {
      v: 2, coins: Math.max(0, base.coins + add.coins), earned: Math.max(base.earned + add.earned, other.earned),
      spent: base.spent + add.spent, refunded: base.refunded + add.refunded,
      ledger: base.ledger.concat(add.entries).sort((a, b) => (Number(a.t) || 0) - (Number(b.t) || 0)).slice(-REWARD_CONFIG.ledgerMax),
      items: { owned, equipped, sub, subOwned, sold },
      keys: Object.assign({}, other.keys, base.keys), keysSince: Math.max(base.keysSince, other.keysSince),
      moved: Object.assign({}, other.moved, base.moved),
    };
    ensureKoala(progress);

    const a = progress.streak, b = r.streak;
    const later = (b.lastDay || "") > (a.lastDay || "") || ((b.lastDay || "") === (a.lastDay || "") && b.count > a.count) ? b : a;
    progress.streak = { count: later.count, lastDay: later.lastDay, best: Math.max(a.best, b.best), restWeek: later.restWeek };
    Object.keys(r.badges).forEach((id) => {
      if (!progress.badges[id] || r.badges[id] < progress.badges[id]) progress.badges[id] = r.badges[id];
    });
    return JSON.stringify(canon(rewardSlice(progress))) !== before;
  }

  /* ---------- Admin-added items (My Koala item management) ----------
     Fetched once per page load and merged additively into ITEMS/ITEM_SLOTS/
     ROOM_SLOTS — the ~250 built-in items above are never touched or
     replaced. See migrations/0014_koala_items.sql for why only new,
     admin-created items live in the database. Safe to call from a browser
     only (uses fetch); Node tests never call it. */
  const CUSTOM_IMG = {};
  const CUSTOM_CAT_LABEL = {};
  let itemsLoaded = false;
  function buildUnlock(u) {
    if (!u) return { free: true };
    if (u.type === "coins") return { coins: Number(u.value) || 0 };
    if (u.type === "streak") return { streak: Number(u.value) || 0 };
    if (u.type === "badge") return { badge: String(u.value || "") };
    return { free: true };
  }
  async function loadItems(force) {
    if (itemsLoaded && !force) return [];
    const added = [];
    try {
      const getJson = (url, fallback) => fetch(url).then((r) => (r.ok ? r.json() : fallback)).catch(() => fallback);
      const [charRes, roomRes, charCats, roomCats] = await Promise.all([
        getJson("/api/items?kind=character", { items: [] }),
        getJson("/api/items?kind=studyroom", { items: [] }),
        getJson("/api/item-categories?kind=character", { categories: [] }),
        getJson("/api/item-categories?kind=studyroom", { categories: [] }),
      ]);
      (charCats.categories || []).concat(roomCats.categories || []).forEach((c) => { CUSTOM_CAT_LABEL[c.id] = c.label; });
      (charCats.categories || []).forEach((c) => { if (!ITEM_SLOTS.includes(c.id)) ITEM_SLOTS.push(c.id); });
      (roomCats.categories || []).forEach((c) => { if (!ROOM_SLOTS.includes(c.id)) ROOM_SLOTS.push(c.id); });
      const rows = (charRes.items || []).concat((roomRes.items || []).map((it) => Object.assign({}, it, { kind: "room" })));
      rows.forEach((row) => {
        if (ITEMS.some((it) => it.id === row.id)) return; // never override a built-in id
        const it = { id: row.id, slot: row.cat, name: row.name, unlock: buildUnlock(row.unlock), custom: true };
        if (!row.imageUrl2d) it.no2d = true;   // made in the 3D wardrobe only: not shown in the 2D Sticker lists
        if (row.kind === "room") it.kind = "room";
        if (row.season) it.season = row.season;
        ITEMS.push(it);
        CUSTOM_IMG[row.id] = { img2d: row.imageUrl2d || null, img3d: row.imageUrl || null, fit: row.fit || null, fit2d: row.fit2d || null };
        added.push({ id: row.id, kind: it.kind || "character", slot: row.cat, img2d: row.imageUrl2d || null, img3d: row.imageUrl || null, fit2d: row.fit2d || null });
      });
      itemsLoaded = true;
    } catch (e) { /* offline or API error: built-in items still work fine */ }
    return added;
  }
  const customImg2d = (id) => (CUSTOM_IMG[id] && CUSTOM_IMG[id].img2d) || null;
  const customImg3d = (id) => (CUSTOM_IMG[id] && CUSTOM_IMG[id].img3d) || null;
  const customFit2d = (id) => (CUSTOM_IMG[id] && CUSTOM_IMG[id].fit2d) || null;
  const customFit = (id) => (CUSTOM_IMG[id] && CUSTOM_IMG[id].fit) || null;
  const customCatLabel = (id) => CUSTOM_CAT_LABEL[id] || null;
  // An admin deleted this category: drop it from this page's tab lists (built-in slots are never in CUSTOM_CAT_LABEL).
  function forgetCustomCat(id) {
    if (!CUSTOM_CAT_LABEL[id]) return;
    delete CUSTOM_CAT_LABEL[id];
    [ITEM_SLOTS, ROOM_SLOTS].forEach((list) => { const i = list.indexOf(id); if (i >= 0) list.splice(i, 1); });
  }

  return {
    REWARD_CONFIG,
    dateKey, daysBetween, shiftDay, weekKey,
    ensureKoala, awardCoins, spendCoins, adjustCoins, houseWallet, trimKeys, fitWallet, mergeExpectedCoins, awardLearning, gameCoinMultiplier, learningProgress, awardMission, awardBadge, awardReview, rewardSlice, mergeRewards,
    ITEM_SLOTS, ROOM_SLOTS, ITEMS, isSeasonActive, visibleItems, itemById, itemStatus, buyItem, equipItem, unequipSlot, syncStreakUnlocks, nextReward,
    SUB_RULES, SUB_PARENTS, SUB_ITEMS, subKind, subById, subItemsFor, subLimit, subSelection, toggleSub, isSubOwned, buySub, sellItem, sellSub, creditSale, sellValue, SELL_RATE, SUB_COST,
    levelInfo,
    MISSION_LOG_DAYS, ensureMissionLog, recordMissionDay, unionMissionLog, stampWordResult,
    ensureStreak, advanceStreak, streakStatus,
    loadItems, customImg2d, customImg3d, customFit, customFit2d, customCatLabel, forgetCustomCat,
  };
});
