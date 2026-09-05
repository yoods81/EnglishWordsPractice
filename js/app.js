// Year 4 English Word Practice — app logic
// Everything is stored locally in the browser (localStorage). No backend needed.

const STORAGE_KEY = "ywp_progress_v1";

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Could not read saved progress", e);
  }
  return {
    wordStats: {}, // word -> { correct, incorrect }
    flashKnown: {}, // word -> true
    quiz: { correct: 0, total: 0 },
    spelling: { correct: 0, total: 0 },
  };
}

function saveProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    console.warn("Could not save progress", e);
  }
}

function recordResult(word, isCorrect) {
  const stats = progress.wordStats[word] || { correct: 0, incorrect: 0 };
  if (isCorrect) stats.correct++;
  else stats.incorrect++;
  progress.wordStats[word] = stats;
  saveProgress();
}

let progress = loadProgress();

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom(arr, n, excludeIndex) {
  const pool = arr.filter((_, i) => i !== excludeIndex);
  return shuffle(pool).slice(0, n);
}

function speak(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "en-AU";
  utter.rate = 0.9;
  window.speechSynthesis.speak(utter);
}

/* ---------- Tab navigation ---------- */
const tabButtons = document.querySelectorAll("nav.tabs button");
const views = document.querySelectorAll(".view");

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabButtons.forEach((b) => b.classList.remove("active"));
    views.forEach((v) => v.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`view-${btn.dataset.view}`).classList.add("active");
    if (btn.dataset.view === "wordlist") renderWordList();
    if (btn.dataset.view === "stats") renderStats();
  });
});

/* ================= FLASHCARDS ================= */
const flashCategorySel = document.getElementById("flash-category");
const flashcardEl = document.getElementById("flashcard");
const flashWordEl = document.getElementById("flash-word");
const flashDefEl = document.getElementById("flash-definition");
const flashExampleEl = document.getElementById("flash-example");
const flashSpeakBtn = document.getElementById("flash-speak");
const flashKnowBtn = document.getElementById("flash-know");
const flashDontKnowBtn = document.getElementById("flash-dont-know");
const flashPrevBtn = document.getElementById("flash-prev");
const flashNextBtn = document.getElementById("flash-next");

let flashDeck = [];
let flashIndex = 0;

function getFlashItems(category) {
  if (category === "synonyms") {
    return WORD_BANK.synonyms.map((s) => ({
      word: s.word,
      definition: `Synonym: ${s.synonym}  •  Antonym: ${s.antonym}`,
      example: `"${s.word}" means the same as "${s.synonym}", and is the opposite of "${s.antonym}".`,
    }));
  }
  return WORD_BANK.vocabulary;
}

function buildFlashDeck() {
  flashDeck = shuffle(getFlashItems(flashCategorySel.value));
  flashIndex = 0;
  renderFlashcard();
}

function renderFlashcard() {
  if (flashDeck.length === 0) return;
  const item = flashDeck[flashIndex];
  flashcardEl.classList.remove("flipped");
  flashWordEl.textContent = item.word;
  flashDefEl.textContent = item.definition;
  flashExampleEl.textContent = item.example;
}

flashcardEl.addEventListener("click", (e) => {
  if (e.target === flashSpeakBtn) return;
  flashcardEl.classList.toggle("flipped");
});

flashSpeakBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  speak(flashDeck[flashIndex].word);
});

function nextFlashcard() {
  flashIndex = (flashIndex + 1) % flashDeck.length;
  renderFlashcard();
}

flashNextBtn.addEventListener("click", nextFlashcard);
flashPrevBtn.addEventListener("click", () => {
  flashIndex = (flashIndex - 1 + flashDeck.length) % flashDeck.length;
  renderFlashcard();
});

flashKnowBtn.addEventListener("click", () => {
  const word = flashDeck[flashIndex].word;
  progress.flashKnown[word] = true;
  recordResult(word, true);
  nextFlashcard();
});

flashDontKnowBtn.addEventListener("click", () => {
  const word = flashDeck[flashIndex].word;
  delete progress.flashKnown[word];
  recordResult(word, false);
  nextFlashcard();
});

flashCategorySel.addEventListener("change", buildFlashDeck);

/* ================= QUIZ ================= */
const quizCategorySel = document.getElementById("quiz-category");
const quizRestartBtn = document.getElementById("quiz-restart");
const quizQuestionEl = document.getElementById("quiz-question");
const quizOptionsEl = document.getElementById("quiz-options");
const quizScoreEl = document.getElementById("quiz-score");
const quizNextBtn = document.getElementById("quiz-next");
const quizProgressFill = document.getElementById("quiz-progress-fill");

const QUIZ_LENGTH = 10;
let quizQuestions = [];
let quizIndex = 0;
let quizScore = 0;
let quizAnswered = false;

function buildVocabQuestions() {
  return WORD_BANK.vocabulary.map((item, i) => {
    const distractors = pickRandom(WORD_BANK.vocabulary, 3, i).map((d) => d.word);
    const options = shuffle([item.word, ...distractors]);
    return {
      prompt: item.definition,
      answer: item.word,
      options,
      target: item.word,
    };
  });
}

function buildSynonymQuestions() {
  return WORD_BANK.synonyms.map((item, i) => {
    const distractors = pickRandom(WORD_BANK.synonyms, 3, i).map((d) => d.synonym);
    const options = shuffle([item.synonym, ...distractors]);
    return {
      prompt: `Which word means the same as "${item.word}"?`,
      answer: item.synonym,
      options,
      target: item.word,
    };
  });
}

function buildHomophoneQuestions() {
  const questions = [];
  WORD_BANK.homophones.forEach((pairItem, i) => {
    pairItem.pair.forEach((word, wi) => {
      const correctDef = pairItem.defs[wi];
      const otherDefs = WORD_BANK.homophones
        .filter((_, pi) => pi !== i)
        .flatMap((p) => p.defs);
      const distractors = shuffle(otherDefs).slice(0, 3);
      const options = shuffle([correctDef, ...distractors]);
      questions.push({
        prompt: `What does "${word}" mean?`,
        answer: correctDef,
        options,
        target: word,
      });
    });
  });
  return questions;
}

function buildQuizQuestions() {
  const cat = quizCategorySel.value;
  let pool;
  if (cat === "synonyms") pool = buildSynonymQuestions();
  else if (cat === "homophones") pool = buildHomophoneQuestions();
  else pool = buildVocabQuestions();
  quizQuestions = shuffle(pool).slice(0, QUIZ_LENGTH);
  quizIndex = 0;
  quizScore = 0;
  quizAnswered = false;
  renderQuizQuestion();
}

function renderQuizQuestion() {
  quizNextBtn.style.display = "none";
  quizAnswered = false;
  const total = quizQuestions.length;
  quizProgressFill.style.width = `${(quizIndex / total) * 100}%`;

  if (quizIndex >= total) {
    quizQuestionEl.textContent = `Quiz complete! You scored ${quizScore} / ${total} 🎉`;
    quizOptionsEl.innerHTML = "";
    quizProgressFill.style.width = "100%";
    updateQuizScoreLabel();
    return;
  }

  const q = quizQuestions[quizIndex];
  quizQuestionEl.textContent = q.prompt;
  quizOptionsEl.innerHTML = "";
  q.options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.textContent = opt;
    btn.addEventListener("click", () => handleQuizAnswer(btn, opt, q));
    quizOptionsEl.appendChild(btn);
  });
  updateQuizScoreLabel();
}

function handleQuizAnswer(btn, chosen, q) {
  if (quizAnswered) return;
  quizAnswered = true;
  const correct = chosen === q.answer;
  if (correct) quizScore++;

  progress.quiz.total++;
  if (correct) progress.quiz.correct++;
  recordResult(q.target, correct);
  saveProgress();

  Array.from(quizOptionsEl.children).forEach((b) => {
    b.disabled = true;
    if (b.textContent === q.answer) b.classList.add("correct");
    else if (b === btn) b.classList.add("incorrect");
  });

  quizNextBtn.style.display = "inline-block";
  updateQuizScoreLabel();
}

function updateQuizScoreLabel() {
  quizScoreEl.textContent = `Score: ${quizScore} / ${quizQuestions.length}`;
}

quizNextBtn.addEventListener("click", () => {
  quizIndex++;
  renderQuizQuestion();
});

quizRestartBtn.addEventListener("click", buildQuizQuestions);
quizCategorySel.addEventListener("change", buildQuizQuestions);

/* ================= SPELLING ================= */
const spellingSpeakBtn = document.getElementById("spelling-speak");
const spellingInput = document.getElementById("spelling-input");
const spellingFeedback = document.getElementById("spelling-feedback");
const spellingCheckBtn = document.getElementById("spelling-check");
const spellingSkipBtn = document.getElementById("spelling-skip");
const spellingScoreEl = document.getElementById("spelling-score");

let spellingDeck = [];
let spellingIndex = 0;
let spellingScore = { correct: 0, total: 0 };
let spellingChecked = false;

function buildSpellingDeck() {
  spellingDeck = shuffle(WORD_BANK.spelling);
  spellingIndex = 0;
  spellingScore = { correct: 0, total: 0 };
  updateSpellingScoreLabel();
  loadSpellingWord();
}

function loadSpellingWord() {
  spellingChecked = false;
  spellingInput.value = "";
  spellingInput.className = "";
  spellingFeedback.textContent = "";
  if (spellingDeck.length === 0) return;
  if (spellingIndex >= spellingDeck.length) {
    spellingDeck = shuffle(spellingDeck);
    spellingIndex = 0;
  }
  speak(spellingDeck[spellingIndex].word);
  spellingInput.focus();
}

spellingSpeakBtn.addEventListener("click", () => {
  if (spellingDeck[spellingIndex]) speak(spellingDeck[spellingIndex].word);
});

function checkSpelling() {
  if (spellingChecked || spellingDeck.length === 0) return;
  const current = spellingDeck[spellingIndex];
  const guess = spellingInput.value.trim().toLowerCase();
  const correct = guess === current.word.toLowerCase();

  spellingChecked = true;
  spellingScore.total++;
  if (correct) spellingScore.correct++;
  recordResult(current.word, correct);

  progress.spelling.total++;
  if (correct) progress.spelling.correct++;
  saveProgress();

  spellingInput.className = correct ? "correct" : "incorrect";
  spellingFeedback.textContent = correct
    ? "Correct! Well done. 🎉"
    : `Not quite — the correct spelling is "${current.word}". Tip: ${current.tip}`;

  updateSpellingScoreLabel();
}

function updateSpellingScoreLabel() {
  spellingScoreEl.textContent = `Score: ${spellingScore.correct} / ${spellingScore.total}`;
}

spellingCheckBtn.addEventListener("click", checkSpelling);
spellingInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    if (!spellingChecked) checkSpelling();
    else {
      spellingIndex++;
      loadSpellingWord();
    }
  }
});

spellingSkipBtn.addEventListener("click", () => {
  spellingIndex++;
  loadSpellingWord();
});

/* ================= WORD LIST ================= */
const wordlistSearch = document.getElementById("wordlist-search");
const wordlistGrid = document.getElementById("wordlist-grid");

function getAllWords() {
  const list = [];
  WORD_BANK.vocabulary.forEach((v) => list.push({ word: v.word, definition: v.definition }));
  WORD_BANK.spelling.forEach((s) => {
    if (!list.some((l) => l.word === s.word)) {
      list.push({ word: s.word, definition: s.tip });
    }
  });
  WORD_BANK.synonyms.forEach((s) => {
    if (!list.some((l) => l.word === s.word)) {
      list.push({ word: s.word, definition: `Synonym: ${s.synonym} • Antonym: ${s.antonym}` });
    }
  });
  return list.sort((a, b) => a.word.localeCompare(b.word));
}

const ALL_WORDS = getAllWords();

function masteryLabel(word) {
  const s = progress.wordStats[word];
  if (!s || s.correct + s.incorrect === 0) return { text: "New", cls: "" };
  const total = s.correct + s.incorrect;
  const pct = Math.round((s.correct / total) * 100);
  if (pct >= 75) return { text: `${pct}% mastered`, cls: "high" };
  if (pct <= 35) return { text: `${pct}% mastered`, cls: "low" };
  return { text: `${pct}% mastered`, cls: "" };
}

function renderWordList() {
  const query = wordlistSearch.value.trim().toLowerCase();
  wordlistGrid.innerHTML = "";
  ALL_WORDS.filter((w) => w.word.toLowerCase().includes(query)).forEach((w) => {
    const row = document.createElement("div");
    row.className = "wordlist-item";
    const m = masteryLabel(w.word);
    row.innerHTML = `
      <div>
        <div class="w">${w.word}</div>
        <div class="d">${w.definition}</div>
      </div>
      <span class="mastery ${m.cls}">${m.text}</span>
    `;
    row.addEventListener("click", () => speak(w.word));
    wordlistGrid.appendChild(row);
  });
}

wordlistSearch.addEventListener("input", renderWordList);

/* ================= STATS ================= */
const statsGrid = document.getElementById("stats-grid");
const resetProgressBtn = document.getElementById("reset-progress");

function renderStats() {
  const wordsPracticed = Object.keys(progress.wordStats).length;
  const flashKnownCount = Object.keys(progress.flashKnown).length;
  const quizPct = progress.quiz.total
    ? Math.round((progress.quiz.correct / progress.quiz.total) * 100)
    : 0;
  const spellPct = progress.spelling.total
    ? Math.round((progress.spelling.correct / progress.spelling.total) * 100)
    : 0;

  const stats = [
    { num: wordsPracticed, lbl: "Words practised" },
    { num: flashKnownCount, lbl: "Flashcards known" },
    { num: `${quizPct}%`, lbl: `Quiz accuracy (${progress.quiz.correct}/${progress.quiz.total})` },
    { num: `${spellPct}%`, lbl: `Spelling accuracy (${progress.spelling.correct}/${progress.spelling.total})` },
  ];

  statsGrid.innerHTML = stats
    .map((s) => `<div class="stat-box"><div class="num">${s.num}</div><div class="lbl">${s.lbl}</div></div>`)
    .join("");
}

resetProgressBtn.addEventListener("click", () => {
  if (!confirm("This will erase all your saved progress. Are you sure?")) return;
  progress = { wordStats: {}, flashKnown: {}, quiz: { correct: 0, total: 0 }, spelling: { correct: 0, total: 0 } };
  saveProgress();
  renderStats();
  renderWordList();
});

/* ================= INIT ================= */
buildFlashDeck();
buildQuizQuestions();
buildSpellingDeck();
renderWordList();
