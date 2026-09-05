// Aussie English Word Practice — app logic
// Everything is stored locally in the browser (localStorage). No backend needed,
// except for two optional network calls: OCR word extraction uses Tesseract.js
// (loaded from a CDN) and best-effort definition lookup uses the free
// dictionaryapi.dev service when you add words extracted from a photo.

const STORAGE_KEY = "ywp_progress_v1";
const CUSTOM_WORDS_KEY = "ywp_custom_words_v1";
const LEVEL_KEY = "ywp_level_v1";

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

function loadCustomWords() {
  try {
    const raw = localStorage.getItem(CUSTOM_WORDS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Could not read custom words", e);
  }
  return [];
}

function saveCustomWords() {
  try {
    localStorage.setItem(CUSTOM_WORDS_KEY, JSON.stringify(customWords));
  } catch (e) {
    console.warn("Could not save custom words", e);
  }
}

function loadLevel() {
  try {
    return localStorage.getItem(LEVEL_KEY);
  } catch (e) {
    return null;
  }
}

function saveLevel(level) {
  try {
    localStorage.setItem(LEVEL_KEY, level);
  } catch (e) {
    console.warn("Could not save level", e);
  }
}

let progress = loadProgress();
let customWords = loadCustomWords();
let currentLevel = loadLevel() || "year4";

function levelLabel(levelId) {
  const lv = LEVELS.find((l) => l.id === levelId);
  return lv ? lv.label : levelId;
}

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
  if (!text || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "en-AU";
  utter.rate = 0.9;
  window.speechSynthesis.speak(utter);
}

/* ================= LEVEL POOLS ================= */

function getVocabPool(level) {
  const builtIn = WORD_BANK.vocabulary.filter((w) => w.level === level);
  const custom = customWords
    .filter((w) => w.level === level)
    .map((w) => ({ word: w.word, definition: w.definition, example: w.example || "", custom: true }));
  return builtIn.concat(custom);
}

function getSpellingPool(level) {
  const builtIn = WORD_BANK.spelling.filter((w) => w.level === level);
  const custom = customWords
    .filter((w) => w.level === level)
    .map((w) => ({ word: w.word, tip: `Hint: ${w.definition || "a word you added yourself"}`, custom: true }));
  return builtIn.concat(custom);
}

function getSynonymPool(level) {
  return WORD_BANK.synonyms.filter((w) => w.level === level);
}

function getHomophonePool(level) {
  return WORD_BANK.homophones.filter((w) => w.level === level);
}

function getAllWordsForLevel(level) {
  const list = [];
  getVocabPool(level).forEach((v) => list.push({ word: v.word, definition: v.definition, example: v.example }));
  getSpellingPool(level).forEach((s) => {
    if (!list.some((l) => l.word === s.word)) list.push({ word: s.word, definition: s.tip, example: "" });
  });
  getSynonymPool(level).forEach((s) => {
    if (!list.some((l) => l.word === s.word)) {
      list.push({ word: s.word, definition: `Synonym: ${s.synonym} • Antonym: ${s.antonym}`, example: "" });
    }
  });
  getHomophonePool(level).forEach((p) => {
    p.pair.forEach((word, i) => {
      if (!list.some((l) => l.word === word)) list.push({ word, definition: p.defs[i], example: "" });
    });
  });
  return list.sort((a, b) => a.word.localeCompare(b.word));
}

function allKnownWordsLowercase() {
  const set = new Set();
  WORD_BANK.vocabulary.forEach((w) => set.add(w.word.toLowerCase()));
  WORD_BANK.spelling.forEach((w) => set.add(w.word.toLowerCase()));
  WORD_BANK.synonyms.forEach((w) => {
    set.add(w.word.toLowerCase());
    set.add(w.synonym.toLowerCase());
  });
  WORD_BANK.homophones.forEach((p) => p.pair.forEach((w) => set.add(w.toLowerCase())));
  customWords.forEach((w) => set.add(w.word.toLowerCase()));
  return set;
}

/* ================= LEVEL SELECT OVERLAY ================= */
const levelOverlay = document.getElementById("level-overlay");
const levelBadge = document.getElementById("level-badge");

function applyLevel(level, { closeOverlay } = { closeOverlay: true }) {
  currentLevel = level;
  saveLevel(level);
  levelBadge.textContent = `Level: ${levelLabel(level)} ▾`;
  if (closeOverlay) levelOverlay.hidden = true;
  refreshCurrentView();
  renderCustomWords();
  if (manualLevelSelect) manualLevelSelect.value = level;
  if (ocrLevelSelect) ocrLevelSelect.value = level;
}

document.querySelectorAll(".level-choice").forEach((btn) => {
  btn.addEventListener("click", () => applyLevel(btn.dataset.level));
});

levelBadge.addEventListener("click", () => {
  levelOverlay.hidden = false;
});

// Show the overlay on first-ever visit (no saved level); otherwise start hidden.
levelOverlay.hidden = !!loadLevel();
levelBadge.textContent = `Level: ${levelLabel(currentLevel)} ▾`;

/* ---------- Tab navigation ---------- */
const tabButtons = document.querySelectorAll("nav.tabs button");
const views = document.querySelectorAll(".view");

function refreshCurrentView() {
  const active = document.querySelector("nav.tabs button.active");
  if (active) refreshView(active.dataset.view);
}

function refreshView(view) {
  if (view === "flashcards") buildFlashDeck();
  if (view === "quiz") buildQuizQuestions();
  if (view === "spelling") buildSpellingDeck();
  if (view === "wordlist") renderWordList();
  if (view === "addword") renderCustomWords();
  if (view === "stats") renderStats();
}

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabButtons.forEach((b) => b.classList.remove("active"));
    views.forEach((v) => v.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`view-${btn.dataset.view}`).classList.add("active");
    refreshView(btn.dataset.view);
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

function getFlashItems(category, level) {
  if (category === "synonyms") {
    return getSynonymPool(level).map((s) => ({
      word: s.word,
      definition: `Synonym: ${s.synonym}  •  Antonym: ${s.antonym}`,
      example: `"${s.word}" means the same as "${s.synonym}", and is the opposite of "${s.antonym}".`,
    }));
  }
  return getVocabPool(level);
}

function buildFlashDeck() {
  flashDeck = shuffle(getFlashItems(flashCategorySel.value, currentLevel));
  flashIndex = 0;
  renderFlashcard();
}

function renderFlashcard() {
  flashcardEl.classList.remove("flipped");
  if (flashDeck.length === 0) {
    flashWordEl.textContent = "No words yet";
    flashDefEl.textContent = `Add some ${levelLabel(currentLevel)} words first!`;
    flashExampleEl.textContent = "";
    return;
  }
  const item = flashDeck[flashIndex];
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
  if (flashDeck[flashIndex]) speak(flashDeck[flashIndex].word);
});

flashDefEl.addEventListener("click", (e) => {
  e.stopPropagation();
  if (flashDeck[flashIndex]) speak(flashDeck[flashIndex].definition);
});

flashExampleEl.addEventListener("click", (e) => {
  e.stopPropagation();
  if (flashDeck[flashIndex]) speak(flashDeck[flashIndex].example);
});

function nextFlashcard() {
  if (flashDeck.length === 0) return;
  flashIndex = (flashIndex + 1) % flashDeck.length;
  renderFlashcard();
}

flashNextBtn.addEventListener("click", nextFlashcard);
flashPrevBtn.addEventListener("click", () => {
  if (flashDeck.length === 0) return;
  flashIndex = (flashIndex - 1 + flashDeck.length) % flashDeck.length;
  renderFlashcard();
});

flashKnowBtn.addEventListener("click", () => {
  if (flashDeck.length === 0) return;
  const word = flashDeck[flashIndex].word;
  progress.flashKnown[word] = true;
  recordResult(word, true);
  nextFlashcard();
});

flashDontKnowBtn.addEventListener("click", () => {
  if (flashDeck.length === 0) return;
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
const MIN_POOL_FOR_QUIZ = 4;
let quizQuestions = [];
let quizIndex = 0;
let quizScore = 0;
let quizAnswered = false;

function buildVocabQuestions(level) {
  const pool = getVocabPool(level);
  if (pool.length < MIN_POOL_FOR_QUIZ) return [];
  return pool.map((item, i) => {
    const distractors = pickRandom(pool, 3, i).map((d) => d.word);
    const options = shuffle([item.word, ...distractors]);
    return { prompt: item.definition, answer: item.word, options, target: item.word };
  });
}

function buildSynonymQuestions(level) {
  const pool = getSynonymPool(level);
  if (pool.length < MIN_POOL_FOR_QUIZ) return [];
  return pool.map((item, i) => {
    const distractors = pickRandom(pool, 3, i).map((d) => d.synonym);
    const options = shuffle([item.synonym, ...distractors]);
    return { prompt: `Which word means the same as "${item.word}"?`, answer: item.synonym, options, target: item.word };
  });
}

function buildHomophoneQuestions(level) {
  const pool = getHomophonePool(level);
  if (pool.length < 2) return [];
  const questions = [];
  pool.forEach((pairItem, i) => {
    pairItem.pair.forEach((word, wi) => {
      const correctDef = pairItem.defs[wi];
      const otherDefs = pool.filter((_, pi) => pi !== i).flatMap((p) => p.defs);
      const distractors = shuffle(otherDefs).slice(0, 3);
      const options = shuffle([correctDef, ...distractors]);
      questions.push({ prompt: `What does "${word}" mean?`, answer: correctDef, options, target: word });
    });
  });
  return questions;
}

function buildQuizQuestions() {
  const cat = quizCategorySel.value;
  let pool;
  if (cat === "synonyms") pool = buildSynonymQuestions(currentLevel);
  else if (cat === "homophones") pool = buildHomophoneQuestions(currentLevel);
  else pool = buildVocabQuestions(currentLevel);
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

  if (total === 0) {
    quizProgressFill.style.width = "0%";
    quizQuestionEl.textContent = `Not enough ${levelLabel(currentLevel)} words for this quiz yet. Try another category or add more words!`;
    quizOptionsEl.innerHTML = "";
    updateQuizScoreLabel();
    return;
  }

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

quizQuestionEl.addEventListener("click", () => speak(quizQuestionEl.textContent));

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
  spellingDeck = shuffle(getSpellingPool(currentLevel));
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
  if (spellingDeck.length === 0) {
    spellingFeedback.textContent = `No ${levelLabel(currentLevel)} spelling words yet. Add some in "Add Word"!`;
    return;
  }
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
    : `Not quite — the correct spelling is "${current.word}". ${current.tip}`;

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

function masteryLabel(word) {
  const s = progress.wordStats[word];
  if (!s || s.correct + s.incorrect === 0) return { text: "New", cls: "" };
  const total = s.correct + s.incorrect;
  const pct = Math.round((s.correct / total) * 100);
  if (pct >= 75) return { text: `${pct}% mastered`, cls: "high" };
  if (pct <= 35) return { text: `${pct}% mastered`, cls: "low" };
  return { text: `${pct}% mastered`, cls: "" };
}

function buildWordRow(w) {
  const row = document.createElement("div");
  row.className = "wordlist-item";

  const left = document.createElement("div");

  const wordEl = document.createElement("div");
  wordEl.className = "w speakable-line";
  wordEl.textContent = w.word;
  wordEl.title = "Tap to hear";
  wordEl.addEventListener("click", () => speak(w.word));
  left.appendChild(wordEl);

  const defEl = document.createElement("div");
  defEl.className = "d";
  defEl.textContent = w.definition;
  left.appendChild(defEl);

  if (w.example) {
    const exEl = document.createElement("div");
    exEl.className = "d speakable-line";
    exEl.style.fontStyle = "italic";
    exEl.textContent = w.example;
    exEl.title = "Tap to hear";
    exEl.addEventListener("click", (e) => {
      e.stopPropagation();
      speak(w.example);
    });
    left.appendChild(exEl);
  }

  row.appendChild(left);

  const m = masteryLabel(w.word);
  const badge = document.createElement("span");
  badge.className = `mastery ${m.cls}`;
  badge.textContent = m.text;
  row.appendChild(badge);

  return row;
}

function renderWordList() {
  const query = wordlistSearch.value.trim().toLowerCase();
  wordlistGrid.innerHTML = "";
  const words = getAllWordsForLevel(currentLevel).filter((w) => w.word.toLowerCase().includes(query));
  if (words.length === 0) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = "No words found for this level yet.";
    wordlistGrid.appendChild(p);
    return;
  }
  words.forEach((w) => wordlistGrid.appendChild(buildWordRow(w)));
}

wordlistSearch.addEventListener("input", renderWordList);

/* ================= ADD WORD (manual + OCR) ================= */
const manualForm = document.getElementById("manual-add-form");
const manualEditId = document.getElementById("manual-edit-id");
const manualWordInput = document.getElementById("manual-word");
const manualDefinitionInput = document.getElementById("manual-definition");
const manualExampleInput = document.getElementById("manual-example");
const manualLevelSelect = document.getElementById("manual-level");
const manualSaveBtn = document.getElementById("manual-save-btn");
const manualCancelBtn = document.getElementById("manual-cancel-btn");
const customWordsGrid = document.getElementById("custom-words-grid");
const customWordsEmpty = document.getElementById("custom-words-empty");

function genId() {
  return `cw_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

manualLevelSelect.value = currentLevel;

manualForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const word = manualWordInput.value.trim();
  const definition = manualDefinitionInput.value.trim();
  const example = manualExampleInput.value.trim();
  const level = manualLevelSelect.value;
  if (!word || !definition) return;

  const editId = manualEditId.value;
  if (editId) {
    const existing = customWords.find((w) => w.id === editId);
    if (existing) {
      existing.word = word;
      existing.definition = definition;
      existing.example = example;
      existing.level = level;
    }
  } else {
    customWords.push({ id: genId(), word, definition, example, level, source: "manual", createdAt: Date.now() });
  }
  saveCustomWords();
  resetManualForm();
  renderCustomWords();
  renderWordList();
});

manualCancelBtn.addEventListener("click", resetManualForm);

function resetManualForm() {
  manualForm.reset();
  manualEditId.value = "";
  manualLevelSelect.value = currentLevel;
  manualCancelBtn.style.display = "none";
  manualSaveBtn.textContent = "Save word";
}

function startEditCustomWord(id) {
  const w = customWords.find((cw) => cw.id === id);
  if (!w) return;
  manualEditId.value = w.id;
  manualWordInput.value = w.word;
  manualDefinitionInput.value = w.definition;
  manualExampleInput.value = w.example || "";
  manualLevelSelect.value = w.level;
  manualCancelBtn.style.display = "inline-block";
  manualSaveBtn.textContent = "Update word";
  manualWordInput.focus();
}

function deleteCustomWord(id) {
  if (!confirm("Delete this word?")) return;
  customWords = customWords.filter((w) => w.id !== id);
  saveCustomWords();
  renderCustomWords();
  renderWordList();
}

function renderCustomWords() {
  customWordsGrid.innerHTML = "";
  if (customWords.length === 0) {
    customWordsEmpty.hidden = false;
    return;
  }
  customWordsEmpty.hidden = true;

  customWords
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .forEach((w) => {
      const row = document.createElement("div");
      row.className = "wordlist-item";

      const left = document.createElement("div");
      const wordEl = document.createElement("div");
      wordEl.className = "w speakable-line";
      wordEl.title = "Tap to hear";
      wordEl.textContent = w.word;
      wordEl.addEventListener("click", () => speak(w.word));
      left.appendChild(wordEl);

      const defEl = document.createElement("div");
      defEl.className = "d";
      defEl.textContent = w.definition;
      left.appendChild(defEl);

      if (w.example) {
        const exEl = document.createElement("div");
        exEl.className = "d speakable-line";
        exEl.style.fontStyle = "italic";
        exEl.title = "Tap to hear";
        exEl.textContent = w.example;
        exEl.addEventListener("click", (e) => {
          e.stopPropagation();
          speak(w.example);
        });
        left.appendChild(exEl);
      }
      row.appendChild(left);

      const right = document.createElement("div");
      right.style.display = "flex";
      right.style.flexDirection = "column";
      right.style.gap = "6px";
      right.style.alignItems = "flex-end";

      const badge = document.createElement("span");
      badge.className = "mastery";
      badge.textContent = levelLabel(w.level);
      right.appendChild(badge);

      const btnRow = document.createElement("div");
      btnRow.style.display = "flex";
      btnRow.style.gap = "6px";

      const editBtn = document.createElement("button");
      editBtn.className = "edit-btn";
      editBtn.textContent = "Edit";
      editBtn.addEventListener("click", () => startEditCustomWord(w.id));

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "delete-btn";
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", () => deleteCustomWord(w.id));

      btnRow.appendChild(editBtn);
      btnRow.appendChild(deleteBtn);
      right.appendChild(btnRow);

      row.appendChild(right);
      customWordsGrid.appendChild(row);
    });
}

/* ---------- OCR: extract words from a photo ---------- */
const ocrFileInput = document.getElementById("ocr-file-input");
const ocrProgress = document.getElementById("ocr-progress");
const ocrProgressFill = document.getElementById("ocr-progress-fill");
const ocrProgressLabel = document.getElementById("ocr-progress-label");
const ocrReview = document.getElementById("ocr-review");
const ocrCandidatesEl = document.getElementById("ocr-candidates");
const ocrLevelSelect = document.getElementById("ocr-level");
const ocrAddBtn = document.getElementById("ocr-add-btn");
const ocrStatus = document.getElementById("ocr-status");

const STOPWORDS = new Set(
  ("the and for that with have this from they were been their said each which she does how out many then them these" +
    " some her would make like into time look more write number could people water than first been call word about" +
    " other after also very just should because through where before between under while again above below during" +
    " over there here what your yours mine ours theirs going going has had was are all not but you not can will one" +
    " two three when who whom whose").split(/\s+/)
);

let ocrSelectedWords = new Set();

ocrLevelSelect.value = currentLevel;

ocrFileInput.addEventListener("change", async (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  ocrReview.hidden = true;
  ocrStatus.textContent = "";
  ocrSelectedWords = new Set();
  ocrCandidatesEl.innerHTML = "";
  ocrLevelSelect.value = currentLevel;

  if (typeof Tesseract === "undefined") {
    ocrStatus.textContent = "The photo-reading tool couldn't load (check your internet connection) and can't be used right now.";
    ocrReview.hidden = false;
    return;
  }

  ocrProgress.hidden = false;
  ocrProgressFill.style.width = "0%";
  ocrProgressLabel.textContent = "Reading image...";

  try {
    const result = await Tesseract.recognize(file, "eng", {
      logger: (m) => {
        if (m.progress != null) {
          ocrProgressFill.style.width = `${Math.round(m.progress * 100)}%`;
          ocrProgressLabel.textContent = `${m.status} (${Math.round(m.progress * 100)}%)`;
        }
      },
    });
    ocrProgress.hidden = true;
    processOcrText(result.data.text || "");
  } catch (err) {
    console.error(err);
    ocrProgress.hidden = true;
    ocrStatus.textContent = "Sorry, we couldn't read text from that image. Try a clearer, well-lit photo.";
    ocrReview.hidden = false;
  } finally {
    ocrFileInput.value = "";
  }
});

function processOcrText(text) {
  const rawWords = text.match(/[A-Za-z']+/g) || [];
  const known = allKnownWordsLowercase();
  const candidates = new Set();
  rawWords.forEach((raw) => {
    const w = raw.toLowerCase().replace(/'s$/, "");
    if (w.length < 4) return;
    if (STOPWORDS.has(w)) return;
    if (known.has(w)) return;
    candidates.add(w);
  });

  const list = Array.from(candidates).sort().slice(0, 60);
  ocrReview.hidden = false;

  if (list.length === 0) {
    document.getElementById("ocr-review-hint").textContent =
      "We couldn't find any new candidate words in that image (they may already be in your word list).";
    ocrCandidatesEl.innerHTML = "";
    return;
  }

  document.getElementById("ocr-review-hint").textContent = `Found ${list.length} candidate words — tap the ones you want to add:`;
  ocrCandidatesEl.innerHTML = "";
  list.forEach((word) => {
    const chip = document.createElement("div");
    chip.className = "wordlist-item candidate-chip";
    chip.textContent = word;
    chip.addEventListener("click", () => {
      if (ocrSelectedWords.has(word)) {
        ocrSelectedWords.delete(word);
        chip.classList.remove("selected");
      } else {
        ocrSelectedWords.add(word);
        chip.classList.add("selected");
      }
    });
    ocrCandidatesEl.appendChild(chip);
  });
}

async function fetchDefinition(word) {
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    if (!res.ok) return null;
    const data = await res.json();
    const entry = data[0];
    const meaning = entry && entry.meanings && entry.meanings[0];
    const def = meaning && meaning.definitions && meaning.definitions[0];
    if (!def) return null;
    return { definition: def.definition, example: def.example || "" };
  } catch (e) {
    return null;
  }
}

ocrAddBtn.addEventListener("click", async () => {
  const selected = Array.from(ocrSelectedWords);
  if (selected.length === 0) {
    ocrStatus.textContent = "Please select at least one word first.";
    return;
  }
  const level = ocrLevelSelect.value;
  ocrAddBtn.disabled = true;
  ocrStatus.textContent = `Adding ${selected.length} word(s) — looking up meanings...`;

  const results = await Promise.allSettled(selected.map((w) => fetchDefinition(w)));
  selected.forEach((word, i) => {
    const info = results[i].status === "fulfilled" ? results[i].value : null;
    customWords.push({
      id: genId(),
      word,
      definition: info ? info.definition : "(No definition found — tap Edit to add one.)",
      example: info ? info.example : "",
      level,
      source: "ocr",
      createdAt: Date.now(),
    });
  });
  saveCustomWords();

  ocrStatus.textContent = `Added ${selected.length} word(s) to ${levelLabel(level)}!`;
  ocrSelectedWords = new Set();
  ocrReview.hidden = true;
  ocrCandidatesEl.innerHTML = "";
  ocrAddBtn.disabled = false;
  renderCustomWords();
  renderWordList();
});

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
    { num: customWords.length, lbl: "Words you've added" },
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
renderCustomWords();
