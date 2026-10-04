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
  const ITEM_SLOTS = ["headwear", "face", "clothing", "jewelry", "shoes", "accessory"];
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
    { id: "pinkWall", kind: "room", slot: "wallpaper", name: { en: "Pink Stripes", ko: "분홍 줄무늬 벽지" }, unlock: { coins: 60 } },
    { id: "blueDotWall", kind: "room", slot: "wallpaper", name: { en: "Blue Polka Dots", ko: "파란 물방울 벽지" }, unlock: { coins: 70 } },
    { id: "ginghamWall", kind: "room", slot: "wallpaper", name: { en: "Picnic Check", ko: "피크닉 체크 벽지" }, unlock: { coins: 80 } },
    { id: "forestWall", kind: "room", slot: "wallpaper", name: { en: "Forest Wall", ko: "숲속 벽지" }, unlock: { coins: 110 } },
    { id: "oceanWall", kind: "room", slot: "wallpaper", name: { en: "Under the Sea", ko: "바닷속 벽지" }, unlock: { coins: 120 } },
    { id: "spaceWall", kind: "room", slot: "wallpaper", name: { en: "Outer Space", ko: "우주 벽지" }, unlock: { coins: 150 } },
    { id: "sunsetWall", kind: "room", slot: "wallpaper", name: { en: "Sunset Glow", ko: "저녁노을 벽지" }, unlock: { coins: 140 } },
    { id: "redRug", kind: "room", slot: "rug", name: { en: "Red Rug", ko: "빨간 러그" }, unlock: { coins: 45 } },
    { id: "heartRug", kind: "room", slot: "rug", name: { en: "Heart Rug", ko: "하트 러그" }, unlock: { coins: 70 } },
    { id: "rainbowRug", kind: "room", slot: "rug", name: { en: "Rainbow Rug", ko: "무지개 러그" }, unlock: { coins: 100 } },
    { id: "stripeRug", kind: "room", slot: "rug", name: { en: "Striped Mat", ko: "줄무늬 매트" }, unlock: { coins: 60 } },
    { id: "flowerRug", kind: "room", slot: "rug", name: { en: "Flower Rug", ko: "꽃 러그" }, unlock: { coins: 80 } },
    { id: "pawRug", kind: "room", slot: "rug", name: { en: "Paw Print Rug", ko: "발바닥 러그" }, unlock: { coins: 75 } },
    { id: "cloudRug", kind: "room", slot: "rug", name: { en: "Cloud Rug", ko: "구름 러그" }, unlock: { coins: 90 } },
    { id: "purpleRug", kind: "room", slot: "rug", name: { en: "Purple Rug", ko: "보라 러그" }, unlock: { coins: 55 } },
    { id: "kangarooPoster", kind: "room", slot: "poster", name: { en: "Kangaroo Poster", ko: "캥거루 포스터" }, unlock: { coins: 90 } },
    { id: "dinoPoster", kind: "room", slot: "poster", name: { en: "Dino Poster", ko: "공룡 포스터" }, unlock: { coins: 85 } },
    { id: "abcPoster", kind: "room", slot: "poster", name: { en: "ABC Poster", ko: "ABC 포스터" }, unlock: { coins: 60 } },
    { id: "solarPoster", kind: "room", slot: "poster", name: { en: "Solar System", ko: "태양계 포스터" }, unlock: { coins: 110 } },
    { id: "fishPoster", kind: "room", slot: "poster", name: { en: "Fish Poster", ko: "물고기 포스터" }, unlock: { coins: 75 } },
    { id: "mountainPoster", kind: "room", slot: "poster", name: { en: "Mountain Poster", ko: "산 포스터" }, unlock: { coins: 80 } },
    { id: "mathPoster", kind: "room", slot: "poster", name: { en: "Math Poster", ko: "수학 포스터" }, unlock: { coins: 65 } },
    { id: "musicPoster", kind: "room", slot: "poster", name: { en: "Music Poster", ko: "음악 포스터" }, unlock: { coins: 70 } },
    { id: "computerDesk", kind: "room", slot: "desk", name: { en: "Computer Desk", ko: "컴퓨터 책상" }, unlock: { coins: 150 } },
    { id: "artDesk", kind: "room", slot: "desk", name: { en: "Art Desk", ko: "미술 책상" }, unlock: { coins: 110 } },
    { id: "globeDesk", kind: "room", slot: "desk", name: { en: "Globe Desk", ko: "지구본 책상" }, unlock: { coins: 120 } },
    { id: "pinkDesk", kind: "room", slot: "desk", name: { en: "Pink Desk", ko: "분홍 책상" }, unlock: { coins: 90 } },
    { id: "pianoDesk", kind: "room", slot: "desk", name: { en: "Keyboard Desk", ko: "건반 책상" }, unlock: { coins: 130 } },
    { id: "bookDesk", kind: "room", slot: "desk", name: { en: "Book Stack Desk", ko: "책 쌓인 책상" }, unlock: { coins: 100 } },
    { id: "craftDesk", kind: "room", slot: "desk", name: { en: "Craft Desk", ko: "공작 책상" }, unlock: { coins: 95 } },
    { id: "snackDesk", kind: "room", slot: "desk", name: { en: "Snack Desk", ko: "간식 책상" }, unlock: { coins: 85 } },
    { id: "lanternLamp", kind: "room", slot: "lamp", name: { en: "Red Lantern", ko: "빨간 등불" }, unlock: { coins: 70 } },
    { id: "moonLamp", kind: "room", slot: "lamp", name: { en: "Moon Lamp", ko: "달 조명" }, unlock: { coins: 100 } },
    { id: "cloudLamp", kind: "room", slot: "lamp", name: { en: "Cloud Lamp", ko: "구름 조명" }, unlock: { coins: 95 } },
    { id: "sunLamp", kind: "room", slot: "lamp", name: { en: "Sunny Lamp", ko: "해님 조명" }, unlock: { coins: 85 } },
    { id: "chandelier", kind: "room", slot: "lamp", name: { en: "Chandelier", ko: "샹들리에" }, unlock: { coins: 160 } },
    { id: "flowerLamp", kind: "room", slot: "lamp", name: { en: "Flower Lamp", ko: "꽃 조명" }, unlock: { coins: 80 } },
    { id: "bulbLamp", kind: "room", slot: "lamp", name: { en: "Bulb Trio", ko: "전구 세 개" }, unlock: { coins: 75 } },
    { id: "rainbowLamp", kind: "room", slot: "lamp", name: { en: "Rainbow Orbs", ko: "무지개 구슬" }, unlock: { coins: 110 } },
    { id: "jellyLamp", kind: "room", slot: "lamp", name: { en: "Jellyfish Lamp", ko: "해파리 조명" }, unlock: { coins: 120 } },
    { id: "toyShelf", kind: "room", slot: "shelf", name: { en: "Toy Shelf", ko: "장난감 선반" }, unlock: { coins: 90 } },
    { id: "plantShelf", kind: "room", slot: "shelf", name: { en: "Plant Shelf", ko: "화분 선반" }, unlock: { coins: 100 } },
    { id: "cubbyShelf", kind: "room", slot: "shelf", name: { en: "Cubby Shelf", ko: "칸칸 수납장" }, unlock: { coins: 85 } },
    { id: "rainbowShelf", kind: "room", slot: "shelf", name: { en: "Rainbow Books", ko: "무지개 책장" }, unlock: { coins: 120 } },
    { id: "globeShelf", kind: "room", slot: "shelf", name: { en: "Explorer Shelf", ko: "탐험가 책장" }, unlock: { coins: 110 } },
    { id: "aquariumShelf", kind: "room", slot: "shelf", name: { en: "Aquarium", ko: "어항 선반" }, unlock: { coins: 150 } },
    { id: "craftShelf", kind: "room", slot: "shelf", name: { en: "Craft Shelf", ko: "공작 선반" }, unlock: { coins: 95 } },
    { id: "floatShelf", kind: "room", slot: "shelf", name: { en: "Floating Shelves", ko: "벽걸이 선반" }, unlock: { coins: 105 } },
    { id: "gameShelf", kind: "room", slot: "shelf", name: { en: "Games Shelf", ko: "보드게임 선반" }, unlock: { coins: 100 } },
    { id: "cactus", kind: "room", slot: "plant", name: { en: "Cactus", ko: "선인장" }, unlock: { coins: 45 } },
    { id: "sunflower", kind: "room", slot: "plant", name: { en: "Sunflower", ko: "해바라기" }, unlock: { coins: 60 } },
    { id: "bonsai", kind: "room", slot: "plant", name: { en: "Bonsai", ko: "분재" }, unlock: { coins: 90 } },
    { id: "fern", kind: "room", slot: "plant", name: { en: "Fern", ko: "고사리" }, unlock: { coins: 50 } },
    { id: "palmTree", kind: "room", slot: "plant", name: { en: "Palm Tree", ko: "야자수" }, unlock: { coins: 80 } },
    { id: "tulips", kind: "room", slot: "plant", name: { en: "Tulips", ko: "튤립" }, unlock: { coins: 55 } },
    { id: "bambooPlant", kind: "room", slot: "plant", name: { en: "Bamboo", ko: "대나무" }, unlock: { coins: 65 } },
    { id: "monstera", kind: "room", slot: "plant", name: { en: "Monstera", ko: "몬스테라" }, unlock: { coins: 75 } },
    { id: "succulents", kind: "room", slot: "plant", name: { en: "Succulents", ko: "다육이" }, unlock: { coins: 50 } },
    { id: "lavender", kind: "room", slot: "plant", name: { en: "Lavender", ko: "라벤더" }, unlock: { coins: 60 } },
    { id: "skyWindow", kind: "room", slot: "window", name: { en: "Sunny Window", ko: "맑은 창문" }, unlock: { coins: 70 } },
    { id: "nightWindow", kind: "room", slot: "window", name: { en: "Night Window", ko: "밤 창문" }, unlock: { coins: 100 } },
    { id: "rainWindow", kind: "room", slot: "window", name: { en: "Rainy Window", ko: "비 오는 창문" }, unlock: { coins: 80 } },
    { id: "snowWindow", kind: "room", slot: "window", name: { en: "Snowy Window", ko: "눈 오는 창문" }, unlock: { coins: 90 } },
    { id: "sunsetWindow", kind: "room", slot: "window", name: { en: "Sunset Window", ko: "노을 창문" }, unlock: { coins: 110 } },
    { id: "curtainWindow", kind: "room", slot: "window", name: { en: "Curtain Window", ko: "커튼 창문" }, unlock: { coins: 95 } },
    { id: "portholeWindow", kind: "room", slot: "window", name: { en: "Round Window", ko: "동그란 창문" }, unlock: { coins: 120 } },
    { id: "treeWindow", kind: "room", slot: "window", name: { en: "Tree Window", ko: "나무 창문" }, unlock: { coins: 85 } },
    { id: "cityWindow", kind: "room", slot: "window", name: { en: "City Window", ko: "도시 창문" }, unlock: { coins: 130 } },
    { id: "seaWindow", kind: "room", slot: "window", name: { en: "Sea Window", ko: "바다 창문" }, unlock: { coins: 100 } },
    { id: "buntingDecor", kind: "room", slot: "garland", name: { en: "Party Bunting", ko: "파티 깃발" }, unlock: { coins: 60 } },
    { id: "heartDecor", kind: "room", slot: "garland", name: { en: "Heart Garland", ko: "하트 가랜드" }, unlock: { coins: 70 } },
    { id: "starDecor", kind: "room", slot: "garland", name: { en: "Star Garland", ko: "별 가랜드" }, unlock: { coins: 80 } },
    { id: "lightDecor", kind: "room", slot: "garland", name: { en: "Fairy Lights", ko: "반짝 전구" }, unlock: { coins: 100 } },
    { id: "chainDecor", kind: "room", slot: "garland", name: { en: "Paper Chain", ko: "종이 고리" }, unlock: { coins: 50 } },
    { id: "leafDecor", kind: "room", slot: "garland", name: { en: "Leaf Garland", ko: "잎사귀 가랜드" }, unlock: { coins: 75 } },
    { id: "pomDecor", kind: "room", slot: "garland", name: { en: "Pom-pom Garland", ko: "방울 가랜드" }, unlock: { coins: 65 } },
    { id: "craneDecor", kind: "room", slot: "garland", name: { en: "Paper Cranes", ko: "종이학" }, unlock: { coins: 110 } },
    { id: "snowDecor", kind: "room", slot: "garland", name: { en: "Snowflakes", ko: "눈송이" }, unlock: { coins: 90 } },
    { id: "streamerDecor", kind: "room", slot: "garland", name: { en: "Streamers", ko: "리본 장식" }, unlock: { coins: 55 } },
    { id: "catPet", kind: "room", slot: "pet", name: { en: "Cat", ko: "고양이" }, unlock: { coins: 120 } },
    { id: "dogPet", kind: "room", slot: "pet", name: { en: "Puppy", ko: "강아지" }, unlock: { coins: 120 } },
    { id: "bunnyPet", kind: "room", slot: "pet", name: { en: "Bunny", ko: "토끼" }, unlock: { coins: 110 } },
    { id: "fishBowlPet", kind: "room", slot: "pet", name: { en: "Goldfish", ko: "금붕어" }, unlock: { coins: 90 } },
    { id: "turtlePet", kind: "room", slot: "pet", name: { en: "Turtle", ko: "거북이" }, unlock: { coins: 100 } },
    { id: "parrotPet", kind: "room", slot: "pet", name: { en: "Parrot", ko: "앵무새" }, unlock: { coins: 130 } },
    { id: "hedgehogPet", kind: "room", slot: "pet", name: { en: "Hedgehog", ko: "고슴도치" }, unlock: { coins: 115 } },
    { id: "ducklingPet", kind: "room", slot: "pet", name: { en: "Duckling", ko: "병아리 오리" }, unlock: { coins: 85 } },
    { id: "frogPet", kind: "room", slot: "pet", name: { en: "Frog", ko: "개구리" }, unlock: { coins: 95 } },
    { id: "joeyPet", kind: "room", slot: "pet", name: { en: "Baby Kangaroo", ko: "아기 캥거루" }, unlock: { coins: 150 } },
    // Picture frames (pick the picture) and toy boxes (pick the toys): both hold sub-items, see SUB_PARENTS.
    { id: "woodFrame", kind: "room", slot: "poster", name: { en: "Wooden Frame", ko: "나무 액자" }, unlock: { coins: 70 } },
    { id: "goldFrame", kind: "room", slot: "poster", name: { en: "Golden Frame", ko: "금빛 액자" }, unlock: { coins: 120 } },
    { id: "candyFrame", kind: "room", slot: "poster", name: { en: "Candy Frame", ko: "캔디 액자" }, unlock: { coins: 100 } },
    { id: "woodToyBox", kind: "room", slot: "toy", name: { en: "Wooden Toy Box", ko: "나무 장난감 상자" }, unlock: { coins: 90 } },
    { id: "rainbowToyBox", kind: "room", slot: "toy", name: { en: "Rainbow Toy Box", ko: "무지개 장난감 상자" }, unlock: { coins: 120 } },
    { id: "starToyBox", kind: "room", slot: "toy", name: { en: "Star Toy Box", ko: "별 장난감 상자" }, unlock: { coins: 140 } },
  ];
  const ROOM_SLOTS = ["wallpaper", "window", "garland", "poster", "lamp", "shelf", "desk", "rug", "toy", "pet", "plant"];
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

/* ---------- Sub-items: things that sit on / in a room item ----------
   Tap a bookshelf in the room and its books are listed; a desk has things on top and in
   the drawer; a frame holds one picture; a toy box holds toys. Sub-items are free once the
   parent item is in the room. What is picked is saved in koala.items.sub[parentId]. */
  const SUB_RULES = {
    books: { mode: "multi", groups: { main: 18 } },
    desk: { mode: "multi", groups: { top: 5, drawer: 2 } },
    frame: { mode: "single", groups: { main: 1 }, fallback: "picMeadow" },
    toys: { mode: "multi", groups: { main: 4 } },
    petwear: { mode: "multi", swap: true, groups: { head: 1, neck: 1, body: 1, feet: 1 } },
  };
  const SUB_PARENTS = {
    bookshelf: "books", rainbowShelf: "books",
    studyDesk: "desk", pinkDesk: "desk",
    woodFrame: "frame", goldFrame: "frame", candyFrame: "frame",
    woodToyBox: "toys", rainbowToyBox: "toys", starToyBox: "toys",
    catPet: "petwear", dogPet: "petwear", bunnyPet: "petwear", turtlePet: "petwear", parrotPet: "petwear",
    hedgehogPet: "petwear", ducklingPet: "petwear", frogPet: "petwear", joeyPet: "petwear",
  };
  const sb = (id, kind, group, en, ko, denEn, denKo) => ({ id, kind, group, name: { en, ko }, desc: { en: denEn, ko: denKo } });
  const SUB_ITEMS = [
    sb("koalaBook", "books", "main", "Koala's Big Day", "코알라의 하루", "A koala naps, munches and naps again!", "낮잠 자고, 잎 먹고, 또 낮잠 자는 코알라 이야기예요!"),
    sb("abcBook", "books", "main", "ABC Stories", "ABC 이야기", "Every page starts with a new letter.", "한 장 한 장 새로운 알파벳이 나와요."),
    sb("spaceBook", "books", "main", "Space Atlas", "우주 도감", "Planets, stars and rockets!", "행성과 별, 로켓이 가득해요!"),
    sb("dinoBook", "books", "main", "Dino Facts", "공룡 이야기", "Which dino was the biggest? Find out!", "가장 큰 공룡은 누구일까요?"),
    sb("fairyBook", "books", "main", "Fairy Tales", "요정 동화", "Tiny wings and big magic.", "작은 날개, 커다란 마법!"),
    sb("mathBook", "books", "main", "Math Fun", "신나는 수학", "Puzzles that make numbers fun.", "숫자가 재밌어지는 퍼즐 책이에요."),
    sb("oceanBook", "books", "main", "Ocean Life", "바다 친구들", "Meet fish, whales and turtles.", "물고기, 고래, 거북이를 만나요."),
    sb("jokeBook", "books", "main", "Funny Jokes", "웃긴 이야기", "Giggles guaranteed!", "깔깔 웃음 보장!"),
    sb("atlasBook", "books", "main", "World Atlas", "세계 지도책", "Find Australia — and every other country!", "호주도, 다른 나라도 찾아봐요!"),
    sb("artBook", "books", "main", "Drawing Fun", "그림 그리기", "Step-by-step drawing lessons.", "차근차근 따라 그리는 그림책이에요."),
    sb("animalBook", "books", "main", "Animal Friends", "동물 친구들", "Kangaroos, emus and wombats!", "캥거루, 에뮤, 웜뱃이 나와요!"),
    sb("songBook", "books", "main", "Sing-along Songs", "노래 책", "Sing every song out loud.", "큰 소리로 함께 불러요!"),
    sb("pencilCup", "desk", "top", "Pencil Cup", "연필꽂이", "Sharp pencils, ready to write!", "뾰족한 연필이 준비됐어요!"),
    sb("miniGlobe", "desk", "top", "Mini Globe", "작은 지구본", "Spin it and pick a country.", "빙글 돌려서 나라를 골라요."),
    sb("alarmClock", "desk", "top", "Alarm Clock", "알람 시계", "Time to study — ring ring!", "공부 시간이에요, 따르릉!"),
    sb("miniCactus", "desk", "top", "Mini Cactus", "작은 선인장", "Prickly, but so cute.", "뾰족하지만 정말 귀여워요."),
    sb("notebooks", "desk", "top", "Notebook Stack", "공책 탑", "A different colour for every subject.", "과목마다 색깔이 달라요."),
    sb("cocoaMug", "desk", "top", "Cocoa Mug", "코코아 머그", "Warm cocoa for cosy study time.", "따끈한 코코아로 공부 시간을 포근하게!"),
    sb("crayonBox", "desk", "drawer", "Crayon Box", "크레용 상자", "Lots of colours to draw with.", "알록달록 그림 도구예요."),
    sb("stickerBook", "desk", "drawer", "Sticker Book", "스티커 북", "Shiny stars for good work!", "잘했을 때 붙이는 반짝 별!"),
    sb("secretDiary", "desk", "drawer", "Secret Diary", "비밀 일기장", "Shh… only the koala knows.", "쉿! 코알라만 아는 비밀이에요."),
    sb("marbleBag", "desk", "drawer", "Marble Bag", "구슬 주머니", "Click-clack, rolling marbles.", "데구르르 굴러가는 구슬!"),
    sb("picMeadow", "frame", "main", "Sunny Meadow", "햇살 들판", "Flowers dancing in the sun.", "햇살 아래 춤추는 꽃들이에요."),
    sb("picSea", "frame", "main", "Sailing Boat", "바다 위 배", "Sail away on the blue water.", "파란 바다를 가르는 돛단배예요."),
    sb("picRainbow", "frame", "main", "Rainbow", "무지개", "After the rain comes a rainbow.", "비가 그치면 무지개가 떠요."),
    sb("picSpace", "frame", "main", "Space Trip", "우주 여행", "Zoom past the planets!", "행성 곁을 쌩! 지나가요."),
    sb("picFlowers", "frame", "main", "Flower Garden", "꽃밭", "Pink, yellow and red blooms.", "분홍, 노랑, 빨강 꽃이 활짝!"),
    sb("picKoala", "frame", "main", "Koala Hug", "코알라 안기", "A koala hugging a gum tree.", "나무를 꼭 안은 코알라예요."),
    sb("picNight", "frame", "main", "Starry Night", "별이 빛나는 밤", "Moon and stars say goodnight.", "달님과 별님이 잘 자라고 인사해요."),
    sb("picBeach", "frame", "main", "Palm Beach", "야자수 해변", "Sand, sea and a palm tree.", "모래, 바다, 야자수가 있는 해변!"),
    sb("toyTeddy", "toys", "main", "Teddy Bear", "곰 인형", "Soft and huggable.", "폭신폭신 안기 좋아요."),
    sb("toyBall", "toys", "main", "Beach Ball", "비치볼", "Bounce, bounce, bounce!", "통통통 튀어 올라요!"),
    sb("toyCar", "toys", "main", "Toy Car", "장난감 자동차", "Vroom vroom!", "부릉부릉 달려요!"),
    sb("toyRobot", "toys", "main", "Robot", "로봇", "Beep boop, hello!", "삐빅! 안녕하세요!"),
    sb("toyDino", "toys", "main", "Dino", "공룡", "Roar! A friendly roar.", "어흥! 착한 공룡이에요."),
    sb("toyBlocks", "toys", "main", "Blocks", "쌓기 블록", "Build a tall tower!", "높이높이 쌓아 봐요!"),
    sb("toyDuck", "toys", "main", "Rubber Duck", "오리 인형", "Quack quack!", "꽥꽥!"),
    sb("toyRocket", "toys", "main", "Toy Rocket", "장난감 로켓", "3, 2, 1… blast off!", "3, 2, 1… 발사!"),
    sb("toyBunny", "toys", "main", "Bunny", "토끼 인형", "Long ears, soft fur.", "긴 귀에 보들보들 털!"),
    sb("toyDrum", "toys", "main", "Drum", "북", "Boom ba-da-boom!", "둥둥 두둥둥!"),
    sb("pwPartyHat", "petwear", "head", "Party Hat", "파티 모자", "Every day is a party!", "매일매일이 파티예요!"),
    sb("pwBow", "petwear", "head", "Ribbon Bow", "리본", "A big pink bow on top.", "머리 위에 커다란 분홍 리본!"),
    sb("pwTopHat", "petwear", "head", "Top Hat", "신사 모자", "Very fancy indeed.", "아주 멋진 신사 모자예요."),
    sb("pwFlowers", "petwear", "head", "Flower Crown", "꽃관", "Fresh flowers for a sunny day.", "화창한 날 어울리는 꽃관이에요."),
    sb("pwCollar", "petwear", "neck", "Red Collar", "빨간 목줄", "A collar with a shiny tag.", "반짝이는 이름표가 달린 목줄!"),
    sb("pwBell", "petwear", "neck", "Bell Collar", "방울 목줄", "Jingle jingle when it moves.", "움직이면 딸랑딸랑!"),
    sb("pwScarf", "petwear", "neck", "Warm Scarf", "따뜻한 목도리", "Cosy for chilly days.", "쌀쌀한 날도 포근해요."),
    sb("pwBowTie", "petwear", "neck", "Bow Tie", "나비넥타이", "Looking sharp!", "멋쟁이 나비넥타이예요!"),
    sb("pwSweater", "petwear", "body", "Knit Sweater", "털 스웨터", "Soft stripes, warm and snug.", "줄무늬가 예쁜 포근한 스웨터!"),
    sb("pwRaincoat", "petwear", "body", "Raincoat", "노란 우비", "Splash in the puddles!", "물웅덩이에서 첨벙첨벙!"),
    sb("pwCape", "petwear", "body", "Hero Cape", "영웅 망토", "Up, up and away!", "슈웅~ 날아라 영웅!"),
    sb("pwBoots", "petwear", "feet", "Rain Boots", "장화", "Stomp stomp stomp!", "쿵쿵쿵 걸어요!"),
    sb("pwSneakers", "petwear", "feet", "Sneakers", "운동화", "Ready to run fast.", "씽씽 달릴 준비 완료!"),
  ];
  // Every sub-item is bought with Koala Coins, and always costs LESS than the cheapest item it goes with.
  // Cost 0 = comes with the parent (a frame's first picture).
  const SUB_COST = {
    koalaBook: 20, abcBook: 20, spaceBook: 35, dinoBook: 30, fairyBook: 25, mathBook: 25, oceanBook: 30, jokeBook: 20, atlasBook: 40, artBook: 25, animalBook: 30, songBook: 20,
    pencilCup: 10, miniGlobe: 35, alarmClock: 25, miniCactus: 20, notebooks: 15, cocoaMug: 20, crayonBox: 15, stickerBook: 25, secretDiary: 40, marbleBag: 20,
    picMeadow: 0, picSea: 25, picRainbow: 30, picSpace: 35, picFlowers: 25, picKoala: 40, picNight: 35, picBeach: 30,
    toyTeddy: 40, toyBall: 20, toyCar: 30, toyRobot: 55, toyDino: 40, toyBlocks: 30, toyDuck: 20, toyRocket: 45, toyBunny: 35, toyDrum: 30,
    pwPartyHat: 15, pwBow: 15, pwTopHat: 30, pwFlowers: 25, pwCollar: 15, pwBell: 20, pwScarf: 25, pwBowTie: 20, pwSweater: 40, pwRaincoat: 40, pwCape: 45, pwBoots: 30, pwSneakers: 30,
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
  // opts.unlimited (admin) puts it in the collection for free first.
  function toggleSub(progress, parentId, subId, opts) {
    const k = ensureKoala(progress);
    const kind = SUB_PARENTS[parentId];
    const it = subById(subId);
    if (!kind) return { ok: false, reason: "notParent" };
    if (!it || it.kind !== kind) return { ok: false, reason: "unknown" };
    if (!isSubOwned(progress, subId)) {
      if (opts && opts.unlimited) k.items.subOwned[subId] = (opts && opts.now) || Date.now();
      else return { ok: false, reason: "notOwned" };
    }
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
      k.ledger.push({ t: (opts && opts.now) != null ? opts.now : Date.now(), n, why });
      if (k.ledger.length > REWARD_CONFIG.ledgerMax) k.ledger.splice(0, k.ledger.length - REWARD_CONFIG.ledgerMax);
    }
  }
  // Sell a bought room / character item back: 80% of its price returns to the coin wallet.
  // Free and streak/badge items can't be sold. The admin has unlimited coins, so gets nothing back.
  function sellItem(progress, id, opts) {
    const k = ensureKoala(progress);
    const it = itemById(id);
    if (!it || !it.unlock.coins) return { ok: false, reason: "notForSale" };
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
    if (!k.items.sub || typeof k.items.sub !== "object" || Array.isArray(k.items.sub)) k.items.sub = {};
    ["subOwned", "sold"].forEach((key) => { if (!k.items[key] || typeof k.items[key] !== "object" || Array.isArray(k.items[key])) k.items[key] = {}; });
    // coin wallet totals (spent in the shop / given back by selling)
    k.spent = Number.isFinite(k.spent) && k.spent >= 0 ? Math.floor(k.spent) : Math.max(0, k.earned - k.coins);
    k.refunded = Number.isFinite(k.refunded) && k.refunded >= 0 ? Math.floor(k.refunded) : 0;
    // Toys used to be single room items; they are toy-box sub-items now. Keep what the child owned.
    Object.keys(LEGACY_TOYS).forEach((old) => {
      const ts = k.items.owned[old];
      if (!ts) return;
      const to = LEGACY_TOYS[old];
      if (!(k.items.sold[to] >= ts)) k.items.subOwned[to] = Math.min(k.items.subOwned[to] || ts, ts);
      delete k.items.owned[old];
    });
    Object.keys(k.items.subOwned).forEach((id) => { const it = subById(id); if (!it || !it.cost) delete k.items.subOwned[id]; });
    Object.keys(k.items.sub).forEach((pid) => {
      const clean = cleanSub(pid, k.items.sub[pid]).filter((id) => !subById(id).cost || k.items.subOwned[id]);
      if (clean.length) k.items.sub[pid] = clean; else delete k.items.sub[pid];
    });
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
    k.spent += n;
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
    const sub = Object.assign({}, other.items.sub, base.items.sub);
    // owned sub-items and "sold" marks: a sale newer than the purchase wins, so a sold item can't come back from the other device
    const sold = {};
    [other.items.sold, base.items.sold].forEach((o) => Object.keys(o).forEach((id) => { sold[id] = Math.max(sold[id] || 0, o[id]); }));
    const subOwned = {};
    [other.items.subOwned, base.items.subOwned].forEach((o) => Object.keys(o).forEach((id) => {
      subOwned[id] = subOwned[id] ? Math.min(subOwned[id], o[id]) : o[id];
    }));
    [owned, subOwned].forEach((o) => Object.keys(o).forEach((id) => { if (sold[id] && sold[id] >= o[id]) delete o[id]; }));
    progress.koala = {
      v: 1, coins: base.coins, earned: Math.max(base.earned, other.earned), spent: base.spent, refunded: base.refunded,
      ledger: base.ledger.slice(), items: { owned, equipped, sub, subOwned, sold },
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
    SUB_RULES, SUB_PARENTS, SUB_ITEMS, subKind, subById, subItemsFor, subLimit, subSelection, toggleSub, isSubOwned, buySub, sellItem, sellSub, sellValue, SELL_RATE, SUB_COST,
    levelInfo,
    ensureStreak, advanceStreak, streakStatus,
  };
});
