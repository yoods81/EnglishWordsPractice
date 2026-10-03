// Koala Study Mate — Quiz logic.
//
// Pure functions only: no DOM, no localStorage, no network. app.js owns the
// screens and the `progress` object and calls into here; the same file loads
// in Node so tests/quiz-core.test.js can exercise it directly.
//
// What lives here:
//   - the question types that are merged into the Quiz "Category" menu
//   - building questions (always with distinct answer options, and never the
//     same word twice in one round)
//   - hints (50:50, first letter), typed-answer checking, time-attack limits
//   - the small bits of maths behind the result screen and the daily goal
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.QuizCore = api;
})(typeof self !== "undefined" ? self : this, function () {
  /* ---------- Question types (the Category menu) ---------- */
  // kind "choice" = pick one of four buttons, "typing" = type the word.
  const CATEGORIES = {
    vocabulary: { kind: "choice", source: "vocab", speak: "prompt" }, // meaning -> pick the word
    meaning: { kind: "choice", source: "vocab", speak: "word" }, // word -> pick the meaning
    fillblank: { kind: "choice", source: "vocab", speak: "sentence" }, // sentence with a gap -> pick the word
    listening: { kind: "choice", source: "vocab", speak: "word" }, // hear it -> pick the spelling
    typing: { kind: "typing", source: "vocab", speak: "prompt" }, // meaning -> type the word
    synonyms: { kind: "choice", source: "synonyms", speak: "prompt" },
    homophones: { kind: "choice", source: "homophones", speak: "prompt" },
  };
  // "Mixed" shuffles the multiple-choice types that draw on the word list.
  const MIXED_TYPES = ["vocabulary", "meaning", "fillblank", "listening"];
  const MIN_CHOICES = 4;

  /* ---------- Small helpers ---------- */
  function escapeRegExp(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  const norm = (s) => String(s == null ? "" : s).trim().toLowerCase();

  function defaultShuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // The word itself plus the endings a definition or sentence might use
  // (vanish -> vanishes/vanished, migrate -> migrating, carry -> carries).
  function wordForms(word) {
    const w = escapeRegExp(norm(word));
    if (!w) return null;
    const forms = [`${w}(?:s|es|ed|d|ing|ly|er|ers)?`];
    if (/e$/.test(w) && w.length > 3) forms.push(`${w.slice(0, -1)}(?:ing|ed|er|ers)`);
    if (/y$/.test(w) && w.length > 3) forms.push(`${w.slice(0, -1)}(?:ies|ied)`);
    return forms.join("|");
  }

  // Replaces the word (and its common endings) in `text` with a blank, so a
  // meaning like "To disappear suddenly" never gives the answer away.
  function maskWord(text, word, blank) {
    const gap = blank == null ? "_____" : blank;
    const src = String(text == null ? "" : text);
    const forms = wordForms(word);
    if (!forms) return { text: src, found: false };
    const re = new RegExp(`(^|[^A-Za-z])(?:${forms})(?![A-Za-z])`, "gi");
    let found = false;
    const out = src.replace(re, (_m, pre) => { found = true; return pre + gap; });
    return { text: out, found };
  }

  // Wraps the word (and its endings) in `open`/`close` markers — used to
  // highlight it in an example sentence once the answer has been revealed.
  function wrapWord(text, word, open, close) {
    const src = String(text == null ? "" : text);
    const forms = wordForms(word);
    if (!forms) return { text: src, found: false };
    const re = new RegExp(`(^|[^A-Za-z])(${forms})(?![A-Za-z])`, "gi");
    let found = false;
    const out = src.replace(re, (_m, pre, hit) => { found = true; return pre + open + hit + close; });
    return { text: out, found };
  }

  // Exact whole-word match only (used to decide if a sentence suits fill-in-the-blank).
  function maskExactWord(text, word, blank) {
    const gap = blank == null ? "_____" : blank;
    const src = String(text == null ? "" : text);
    const w = escapeRegExp(norm(word));
    if (!w) return { text: src, found: false };
    const re = new RegExp(`(^|[^A-Za-z])${w}(?![A-Za-z])`, "gi");
    let found = false;
    const out = src.replace(re, (_m, pre) => { found = true; return pre + gap; });
    return { text: out, found };
  }

  // Up to `count` options: the right answer plus distinct wrong ones. "Distinct"
  // matters: if two entries share the same text, two buttons would read the
  // same and one of them would be "wrong" for no visible reason.
  function uniqueOptions(correct, candidates, count, shuffleFn) {
    const shuffle = shuffleFn || defaultShuffle;
    const want = count || MIN_CHOICES;
    const seen = new Set([norm(correct)]);
    const picked = [];
    for (const c of shuffle(candidates)) {
      const key = norm(c);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      picked.push(c);
      if (picked.length >= want - 1) break;
    }
    if (picked.length < want - 1) return null; // not enough different answers to ask this
    return shuffle([correct, ...picked]);
  }

  /* ---------- Building questions ---------- */
  // ctx: { shuffle?, prompts: { synonym(word), homophone(word) } }
  function vocabQuestion(type, item, pool, ctx) {
    const shuffle = ctx.shuffle || defaultShuffle;
    const word = item.word;
    const definition = item.definition || "";
    const example = item.example || "";
    const others = pool.filter((p) => norm(p.word) !== norm(word));
    const base = { type, target: word, definition, example };

    if (type === "meaning") {
      if (!definition) return null;
      const options = uniqueOptions(definition, others.map((p) => p.definition), MIN_CHOICES, shuffle);
      if (!options) return null;
      return Object.assign(base, { kind: "choice", prompt: word, promptIsWord: true, answer: definition, options, speak: word, canFirstLetter: false });
    }

    if (type === "fillblank") {
      const masked = maskExactWord(example, word);
      if (!masked.found) return null;
      const options = uniqueOptions(word, others.map((p) => p.word), MIN_CHOICES, shuffle);
      if (!options) return null;
      return Object.assign(base, {
        kind: "choice", prompt: masked.text, answer: word, options,
        speak: maskExactWord(example, word, "blank").text, canFirstLetter: true,
      });
    }

    if (type === "listening") {
      const options = uniqueOptions(word, others.map((p) => p.word), MIN_CHOICES, shuffle);
      if (!options) return null;
      return Object.assign(base, { kind: "choice", prompt: "", hearOnly: true, answer: word, options, speak: word, canFirstLetter: true });
    }

    // vocabulary (meaning -> word) and typing (meaning -> typed word)
    if (!definition) return null;
    const masked = maskWord(definition, word).text;
    if (type === "typing") {
      return Object.assign(base, { kind: "typing", prompt: masked, answer: word, options: [], speak: masked, canFirstLetter: true });
    }
    const options = uniqueOptions(word, others.map((p) => p.word), MIN_CHOICES, shuffle);
    if (!options) return null;
    return Object.assign(base, { kind: "choice", prompt: masked, answer: word, options, speak: masked, canFirstLetter: true });
  }

  function synonymQuestion(item, pool, ctx) {
    const shuffle = ctx.shuffle || defaultShuffle;
    const options = uniqueOptions(item.synonym, pool.filter((p) => norm(p.word) !== norm(item.word)).map((p) => p.synonym), MIN_CHOICES, shuffle);
    if (!options) return null;
    const prompt = ctx.prompts.synonym(item.word);
    return { type: "synonyms", kind: "choice", prompt, answer: item.synonym, options, target: item.word, definition: "", example: "", speak: prompt, canFirstLetter: true };
  }

  // A homophone pair becomes two questions (one per spelling).
  function homophoneQuestions(pairItem, pool, ctx) {
    const shuffle = ctx.shuffle || defaultShuffle;
    const out = [];
    pairItem.pair.forEach((word, wi) => {
      const correctDef = pairItem.defs[wi];
      const otherDefs = pool.filter((p) => p !== pairItem).flatMap((p) => p.defs);
      const options = uniqueOptions(correctDef, otherDefs, MIN_CHOICES, shuffle);
      if (!options) return;
      const prompt = ctx.prompts.homophone(word);
      out.push({ type: "homophones", kind: "choice", prompt, answer: correctDef, options, target: word, definition: correctDef, example: "", speak: prompt, canFirstLetter: false });
    });
    return out;
  }

  // Removes repeats of the same word so a word can't be asked twice in a round
  // (the homophone list, for one, has "there" in two different pairs).
  function dedupeByTarget(questions) {
    const seen = new Set();
    return questions.filter((q) => {
      const key = norm(q.target);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // `data` = { vocab: [{word, definition, example}], synonyms: [...], homophones: [...] }
  // Returns every question the category can produce (one per word).
  function buildQuestions(category, data, ctx) {
    const context = Object.assign({ shuffle: defaultShuffle }, ctx);
    const vocab = dedupeByTarget((data.vocab || []).map((v) => ({ target: v.word, v }))).map((x) => x.v);
    const synonyms = data.synonyms || [];
    const homophones = data.homophones || [];
    let list = [];

    if (category === "synonyms") {
      if (synonyms.length < MIN_CHOICES) return [];
      list = synonyms.map((item) => synonymQuestion(item, synonyms, context));
    } else if (category === "homophones") {
      if (homophones.length < 2) return [];
      list = homophones.flatMap((item) => homophoneQuestions(item, homophones, context));
    } else if (category === "mixed") {
      if (vocab.length < MIN_CHOICES) return [];
      list = vocab.map((item) => {
        // Each word gets one random type; if that type doesn't suit the word
        // (e.g. no example sentence), the next one is tried.
        const order = context.shuffle(MIXED_TYPES);
        for (const type of order) {
          const q = vocabQuestion(type, item, vocab, context);
          if (q) return q;
        }
        return null;
      });
    } else if (CATEGORIES[category] && CATEGORIES[category].source === "vocab") {
      if (vocab.length < MIN_CHOICES) return [];
      list = vocab.map((item) => vocabQuestion(category, item, vocab, context));
    }
    return dedupeByTarget(list.filter(Boolean));
  }

  // Missed questions become a fresh round: same questions, buttons re-mixed.
  function retryQuestions(missed, shuffleFn) {
    const shuffle = shuffleFn || defaultShuffle;
    return missed.map((q) => Object.assign({}, q, { options: q.kind === "choice" ? shuffle(q.options) : [] }));
  }

  /* ---------- Hints ---------- */
  const LEAVES_START = 2;
  const LEAVES_MAX = 3;
  const COMBO_LEAF_EVERY = 5;

  function leavesAfterCombo(leaves, combo) {
    if (combo > 0 && combo % COMBO_LEAF_EVERY === 0) return Math.min(leaves + 1, LEAVES_MAX);
    return leaves;
  }

  // Indexes (into q.options) of two wrong answers to grey out; [] if it can't help.
  function fiftyFiftyRemovals(q, alreadyRemoved, shuffleFn) {
    const shuffle = shuffleFn || defaultShuffle;
    if (!q || q.kind !== "choice") return [];
    const gone = new Set(alreadyRemoved || []);
    const wrong = q.options.map((o, i) => i).filter((i) => q.options[i] !== q.answer && !gone.has(i));
    if (wrong.length < 3) return []; // would leave fewer than two options standing
    return shuffle(wrong).slice(0, 2);
  }

  // "s _ _ _ _ _" — first letter shown, one underscore per other letter.
  function letterPattern(word) {
    const chars = Array.from(String(word));
    let first = true;
    return chars.map((c) => {
      if (/\s/.test(c)) return "  ";
      if (!/[A-Za-z]/.test(c)) return c;
      if (first) { first = false; return c.toLowerCase(); }
      return "_";
    }).join(" ").replace(/ {3,}/g, "   ");
  }

  /* ---------- Typed answers ---------- */
  function cleanTyped(s) {
    return norm(s).replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "").replace(/\s+/g, " ");
  }
  function editDistance(a, b) {
    const m = a.length, n = b.length;
    if (!m) return n;
    if (!n) return m;
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = cur;
    }
    return prev[n];
  }
  // close = one slip away: still wrong, but worth an "Almost!"
  function checkTyped(input, answer) {
    const a = cleanTyped(input);
    const b = cleanTyped(answer);
    if (!a) return { correct: false, close: false, empty: true };
    if (a === b) return { correct: true, close: false, empty: false };
    return { correct: false, close: b.length >= 4 && editDistance(a, b) === 1, empty: false };
  }

  /* ---------- Time attack ---------- */
  const TIME_LIMITS_SEC = { choice: 15, typing: 25 };
  function timeLimitMs(q) {
    return (q && q.kind === "typing" ? TIME_LIMITS_SEC.typing : TIME_LIMITS_SEC.choice) * 1000;
  }
  function timeLeftFraction(elapsedMs, limitMs) {
    if (!(limitMs > 0)) return 0;
    return Math.max(0, Math.min(1, 1 - elapsedMs / limitMs));
  }

  /* ---------- Daily goal & result screen ---------- */
  const DAILY_GOAL = 20;
  function dailyGoalState(answeredToday, goal) {
    const g = goal || DAILY_GOAL;
    const have = Math.max(0, answeredToday | 0);
    return { have: Math.min(have, g), goal: g, pct: Math.min(100, Math.round((Math.min(have, g) / g) * 100)), done: have >= g };
  }

  // stars: 3 for 90%+, 2 for 70%+, otherwise 1 (as long as something was answered).
  function summarize(score, total) {
    const pct = total > 0 ? Math.round((score / total) * 100) : 0;
    const stars = total <= 0 ? 0 : pct >= 90 ? 3 : pct >= 70 ? 2 : 1;
    const mood = stars === 3 ? "great" : stars === 2 ? "good" : "keep";
    return { pct, stars, mood };
  }

  function formatSeconds(ms) {
    const s = Math.max(0, Math.round(ms / 1000));
    const m = Math.floor(s / 60);
    return m ? `${m}:${String(s % 60).padStart(2, "0")}` : `${s}s`;
  }

  return {
    CATEGORIES, MIXED_TYPES, MIN_CHOICES,
    norm, maskWord, maskExactWord, wrapWord, uniqueOptions, dedupeByTarget,
    buildQuestions, retryQuestions,
    LEAVES_START, LEAVES_MAX, COMBO_LEAF_EVERY, leavesAfterCombo, fiftyFiftyRemovals, letterPattern,
    cleanTyped, editDistance, checkTyped,
    TIME_LIMITS_SEC, timeLimitMs, timeLeftFraction,
    DAILY_GOAL, dailyGoalState, summarize, formatSeconds,
  };
});
