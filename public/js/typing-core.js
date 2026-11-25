// Typing page shared rules (browser + worker): topics, WPM / accuracy, auto nicknames, Letters lessons,
// and the weekly-report typing summary. No DOM here — public/js/typing-hub.js draws the screens,
// worker/typing.js keeps the leaderboard. Texts live in /typing-texts/<topic>.json (loaded on demand).
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.TypingCore = api;
})(typeof self !== "undefined" ? self : this, function () {
  const LEVELS = ["elem_low", "elem_high", "middle", "high"];

  // 15 topics (2026-11-25 decision: all of them). Order = the order in Settings.
  const TOPICS = [
    { id: "animals", ico: "🐨", en: "Australian animals", ko: "호주 동물·자연" },
    { id: "school", ico: "🏫", en: "School & friends", ko: "학교·친구" },
    { id: "family", ico: "🏡", en: "Family & home", ko: "가족·집" },
    { id: "sport", ico: "🏏", en: "Sport & play", ko: "스포츠·놀이" },
    { id: "weather", ico: "🌦️", en: "Weather & seasons", ko: "날씨·계절" },
    { id: "science", ico: "🔭", en: "Science & space", ko: "과학·우주" },
    { id: "planet", ico: "🌏", en: "Our planet", ko: "지구·환경" },
    { id: "stories", ico: "🐉", en: "Stories", ko: "이야기·상상" },
    { id: "food", ico: "🍎", en: "Food & health", ko: "음식·건강" },
    { id: "town", ico: "🏘️", en: "Our town & jobs", ko: "마을·직업" },
    { id: "history", ico: "🗺️", en: "Australia's places & history", ko: "호주 역사·장소" },
    { id: "world", ico: "✈️", en: "Asia & the world", ko: "아시아·세계" },
    { id: "festivals", ico: "🎆", en: "Festivals & holidays", ko: "축제·명절" },
    { id: "tech", ico: "🤖", en: "Technology & safety", ko: "기술·인터넷 안전" },
    { id: "feelings", ico: "💛", en: "Feelings & kindness", ko: "감정·친절" },
  ];
  const TOPIC_IDS = TOPICS.map((x) => x.id);

  // Ranked kinds. words = falling-words score; sentence / paragraph / daily = WPM.
  const KINDS = ["words", "sentence", "paragraph", "daily"];
  const MIN_RANK_ACC = 90;        // below this a WPM result is kept but not ranked
  const MIN_COIN_ACC = 85;        // below this a finished text earns no coin units
  const COIN_UNITS = { sentence: 5, paragraph: 15, daily: 5 }; // counted as correct Typing answers (50 = one coin round)
  const MAX_WPM = 200;

  // Standard WPM: (correct characters / 5) per minute. Accuracy: correct keystrokes / all keystrokes.
  function wpm(correctChars, ms) {
    const m = Math.max(1, Number(ms) || 0) / 60000;
    const v = (Math.max(0, Number(correctChars) || 0) / 5) / m;
    return Math.max(0, Math.min(MAX_WPM, Math.round(v * 10) / 10));
  }
  function accuracy(keystrokes, mistakes) {
    const k = Math.max(0, Number(keystrokes) || 0);
    if (!k) return 0;
    return Math.max(0, Math.min(100, Math.round(((k - Math.max(0, Number(mistakes) || 0)) / k) * 100)));
  }

  // Auto nicknames: the leaderboard never shows a real name or email (children).
  const ADJ = ["Speedy", "Brave", "Happy", "Clever", "Sunny", "Lucky", "Jolly", "Swift", "Mighty", "Gentle", "Bright", "Bouncy", "Cheeky", "Calm", "Zippy", "Kind", "Plucky", "Smiley", "Daring", "Nifty", "Cosy", "Bold", "Merry", "Quick"];
  const ANIMALS = ["Koala", "Wombat", "Platypus", "Kookaburra", "Kangaroo", "Echidna", "Quokka", "Wallaby", "Possum", "Cockatoo", "Galah", "Dingo", "Bilby", "Emu", "Lorikeet", "Numbat", "Turtle", "Dolphin", "Penguin", "Gecko"];
  function hash32(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function nickname(userId, slot) {
    const h = hash32(`ksm:${userId}:${slot || 0}`);
    return `${ADJ[h % ADJ.length]} ${ANIMALS[(h >>> 8) % ANIMALS.length]} ${10 + ((h >>> 16) % 90)}`;
  }

  // Today's challenge: everyone at the same level gets the same sentence on the same Sydney day.
  function sydneyDay(now) {
    try {
      return new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(now || Date.now()));
    } catch (e) { return new Date(now || Date.now()).toISOString().slice(0, 10); }
  }
  function dailyPick(day, level) {
    const h = hash32(`daily:${day}:${level}`);
    return { topic: TOPIC_IDS[h % TOPIC_IDS.length], index: h >>> 4 };
  }

  /* ---------- Letters: finger map and 20 lessons ---------- */
  // Fingers: lp lr lm li (left pinky..index), ri rm rr rp (right index..pinky), th (thumbs).
  const FINGER_OF = {};
  [["lp", "qaz1`"], ["lr", "wsx2"], ["lm", "edc3"], ["li", "rfvtgb45"], ["ri", "yhnujm67"], ["rm", "ik,8"], ["rr", "ol.9"], ["rp", "p;/'0-=[]"]].forEach(([f, ks]) => { for (const k of ks) FINGER_OF[k] = f; });
  FINGER_OF[" "] = "th";
  function fingerOf(ch) {
    const c = String(ch || "");
    if (c === " ") return "th";
    const low = c.toLowerCase();
    if (FINGER_OF[low]) return FINGER_OF[low];
    const sh = { "!": "1", "?": "/", ":": ";", '"': "'" }[c];
    return sh ? FINGER_OF[sh] : null;
  }
  const FINGER_NAMES = {
    lp: ["left little finger", "왼손 새끼손가락"], lr: ["left ring finger", "왼손 약지"], lm: ["left middle finger", "왼손 중지"], li: ["left pointer finger", "왼손 검지"],
    ri: ["right pointer finger", "오른손 검지"], rm: ["right middle finger", "오른손 중지"], rr: ["right ring finger", "오른손 약지"], rp: ["right little finger", "오른손 새끼손가락"], th: ["thumb", "엄지"],
  };

  // new: keys introduced in this lesson. Review lessons introduce nothing and drill real words.
  const LESSONS = [
    { n: 1, keys: "fj" }, { n: 2, keys: "dk" }, { n: 3, keys: "sl" }, { n: 4, keys: "a;" }, { n: 5, keys: "gh" },
    { n: 6, keys: "", review: "home" },
    { n: 7, keys: "ei" }, { n: 8, keys: "ru" }, { n: 9, keys: "ty" }, { n: 10, keys: "wo" }, { n: 11, keys: "qp" },
    { n: 12, keys: "", review: "top" },
    { n: 13, keys: "vm" }, { n: 14, keys: "c," }, { n: 15, keys: "x." }, { n: 16, keys: "z/" }, { n: 17, keys: "bn" },
    { n: 18, keys: "", review: "bottom" },
    { n: 19, keys: "", shift: true },
    { n: 20, keys: "", review: "all" },
  ];
  function lessonKnownKeys(n) {
    let s = "";
    LESSONS.forEach((l) => { if (l.n <= n) s += l.keys; });
    return s;
  }
  // Small seeded random so a lesson's drills are the same for a given seed (tests) but vary per play.
  function rng(seed) {
    let x = hash32(String(seed)) || 1;
    return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
  }
  // Builds a lesson: a list of steps. {type:"intro", key} shows one key with its finger;
  // {type:"drill", text} is a row of boxes to type (spaces shown as ␣ boxes).
  function buildLesson(n, wordPool, seed) {
    const L = LESSONS.find((l) => l.n === n);
    if (!L) return [];
    const r = rng(seed || n);
    const pick = (arr) => arr[Math.floor(r() * arr.length)];
    const known = lessonKnownKeys(n);
    const letters = known.replace(/[^a-z]/g, "");
    const okWord = (w) => /^[a-z]{2,6}$/.test(w) && [...w].every((c) => letters.includes(c));
    const words = [...new Set((wordPool || []).map((w) => String(w).toLowerCase()).filter(okWord))];
    const steps = [];
    const groups = (chars, count, len) => {
      const out = [];
      for (let i = 0; i < count; i++) { let g = ""; for (let k = 0; k < len; k++) g += pick(chars); out.push(g); }
      return out.join(" ");
    };
    if (L.keys) {
      for (const k of L.keys) {
        steps.push({ type: "intro", key: k });
        steps.push({ type: "drill", text: k.repeat(4) });
      }
      const [a, b] = L.keys;
      steps.push({ type: "drill", text: `${a}${b}${a}${b} ${b}${a}${b}${a} ${a}${a}${b}${b}` });
      steps.push({ type: "drill", text: groups(L.keys, 3, 3) });
      steps.push({ type: "drill", text: groups(known.replace(/[^a-z;,./]/g, ""), 3, 3) });
      if (words.length >= 4) {
        for (let i = 0; i < 3; i++) steps.push({ type: "drill", text: [pick(words), pick(words), pick(words)].join(" ") });
      } else {
        steps.push({ type: "drill", text: groups(known.replace(/[^a-z;,./]/g, ""), 3, 4) });
      }
    } else if (L.shift) {
      steps.push({ type: "intro", key: "Shift" });
      const caps = words.length ? words : ["sydney", "perth", "darwin", "hobart"];
      const name = (w) => w[0].toUpperCase() + w.slice(1);
      steps.push({ type: "drill", text: "Aa Ss Dd Ff Jj Kk Ll" });
      for (let i = 0; i < 4; i++) steps.push({ type: "drill", text: [name(pick(caps)), name(pick(caps))].join(" ") });
      steps.push({ type: "drill", text: "I like Sydney." });
      steps.push({ type: "drill", text: "Koalas live in Australia." });
    } else {
      const pool = words.length >= 6 ? words : ["sad", "lad", "ask", "all", "fall", "glad", "hall", "flask", "dash", "salad"];
      for (let i = 0; i < 6; i++) steps.push({ type: "drill", text: [pick(pool), pick(pool), pick(pool)].join(" ") });
    }
    return steps;
  }

  /* ---------- Weekly report: typing line ---------- */
  // progress.typingLog: [{ t: ms, k: "s"|"p"|"d", w: wpm, a: accuracy }], last 60 days.
  function weekTyping(log, now, days) {
    const end = now || Date.now();
    const span = (days || 7) * 86400000;
    const pick = (from, to) => (Array.isArray(log) ? log : []).filter((e) => e && e.t > from && e.t <= to && e.k !== "l");
    const sum = (arr) => {
      if (!arr.length) return null;
      const best = Math.max(...arr.map((e) => Number(e.w) || 0));
      const avg = Math.round((arr.reduce((s, e) => s + (Number(e.w) || 0), 0) / arr.length) * 10) / 10;
      const acc = Math.round(arr.reduce((s, e) => s + (Number(e.a) || 0), 0) / arr.length);
      return { n: arr.length, best, avg, acc };
    };
    const cur = sum(pick(end - span, end));
    const prev = sum(pick(end - 2 * span, end - span));
    return cur ? Object.assign(cur, { prevAvg: prev ? prev.avg : null }) : null;
  }

  return { LEVELS, TOPICS, TOPIC_IDS, KINDS, MIN_RANK_ACC, MIN_COIN_ACC, COIN_UNITS, MAX_WPM, wpm, accuracy, nickname, hash32, sydneyDay, dailyPick, fingerOf, FINGER_NAMES, LESSONS, lessonKnownKeys, buildLesson, weekTyping };
});
