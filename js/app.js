// Aussie English Word Practice — app logic
// Everything is stored locally in the browser (localStorage). No backend needed,
// except for two optional network calls: OCR word extraction uses Tesseract.js
// (loaded from a CDN) and best-effort definition lookup uses the free
// dictionaryapi.dev service when you add words extracted from a photo.

const STORAGE_KEY = "ywp_progress_v1";
const CUSTOM_WORDS_KEY = "ywp_custom_words_v1";
const LEVELS_KEY = "ywp_levels_v1"; // { en: "year4", ko: "kr_elem6" }
const LANG_KEY = "ywp_lang_v1";

/* ================= TRANSLATIONS ================= */
const TRANSLATIONS = {
  en: {
    appTitle: "Aussie English Word Practice",
    appSubtitle: "Build your vocabulary, spelling and word skills!",
    langToggle: "한국어",
    levelBadgePrefix: "Level",
    levelOverlayTitle: "📚 Choose your level",
    levelOverlayDesc: "Pick the level you want to practise. You can change this anytime.",
    navFlashcards: "🃏 Flashcards",
    navQuiz: "❓ Quiz",
    navSpelling: "✏️ Spelling",
    navWordlist: "📖 Word List",
    navAddword: "➕ Add Word",
    navStats: "📊 My Progress",
    statsShortcutLabel: "My Progress",
    categoryLabel: "Category",
    optVocabulary: "Vocabulary",
    optSynonyms: "Synonyms & Antonyms",
    optHomophones: "Homophones",
    backLabel: "Back",
    nextLabel: "Next",
    flashHint: "Tap the card to flip it • Tap the meaning or example to hear it read aloud",
    flashStillLearning: "😕 Still learning",
    flashKnowIt: "😀 I know this!",
    flashEmptyWord: "No words yet",
    flashEmptyDef: (lvl) => `Add some ${lvl} words first!`,
    newQuizBtn: "🔄 New Quiz",
    nextQuestionBtn: "Next Question ➡",
    scoreLabel: (c, t) => `Score: ${c} / ${t}`,
    quizNotEnough: (lvl) => `Not enough ${lvl} words for this quiz yet. Try another category or add more words!`,
    quizComplete: (score, total) => `Quiz complete! You scored ${score} / ${total} 🎉`,
    quizSynonymPrompt: (word) => `Which word means the same as "${word}"?`,
    quizHomophonePrompt: (word) => `What does "${word}" mean?`,
    spellingHearBtn: "🔊 Hear the word",
    spellingPlaceholder: "Type what you hear...",
    spellingStartBtn: "▶ Start the first word",
    spellingBackBtn: "⬅ Back",
    spellingNextBtn: "Next ➡",
    spellingSkipBtn: "Skip ➡",
    spellingWrongPrompt: "Please enter the correct spelling to go to the next word",
    spellingEmpty: (lvl) => `No ${lvl} spelling words yet. Add some in "Add Word"!`,
    wordlistSearchPlaceholder: "🔍 Search words...",
    wordlistEmpty: "No words found for this level yet.",
    masteryNew: "New",
    masteryPct: (pct) => `${pct}% mastered`,
    addWordManualTitle: "➕ Add a word manually",
    labelWord: "Word *",
    labelMeaning: "Meaning *",
    labelExample: "Example sentence",
    labelLevel: "Level",
    phWord: "e.g. resilient",
    phMeaning: "e.g. able to recover quickly from difficulties",
    phExample: "e.g. The resilient plant grew back after the fire.",
    saveWordBtn: "Save word",
    updateWordBtn: "Update word",
    cancelEditBtn: "Cancel edit",
    ocrTitle: "📷 Extract words from a photo",
    ocrDesc: "Take a photo of a book page, or upload a screenshot of an online passage. We'll read the text and pull out candidate words you can add to your word list.",
    ocrChooseBtn: "📁 Choose Photo",
    ocrNoFileChosen: "No file chosen",
    ocrProgressDefault: "Reading image...",
    ocrProgressStatus: (status, pct) => `${status} (${pct}%)`,
    ocrReviewHintDefault: "Tap the words you'd like to add:",
    ocrSelectAll: "Select All",
    ocrDeselectAll: "Deselect All",
    ocrLevelLabel: "Save selected words as",
    ocrAddBtn: "Add selected words",
    ocrNoTesseract: "The photo-reading tool couldn't load (check your internet connection) and can't be used right now.",
    ocrFailRead: "Sorry, we couldn't read text from that image. Try a clearer, well-lit photo.",
    ocrNoCandidates: "We couldn't find any new candidate words in that image (they may already be in your word list).",
    ocrFoundCandidates: (n) => `Found ${n} candidate words — tap the ones you want to add:`,
    ocrSelectAtLeastOne: "Please select at least one word first.",
    ocrAddingStatus: (n) => `Adding ${n} word(s) — looking up meanings...`,
    ocrAddingProgress: (done, total) => `Looking up meanings... ${done} / ${total}`,
    ocrAddedStatus: (n, lvl) => `Added ${n} word(s) to ${lvl}!`,
    ocrNoDefFound: "(No definition found — tap Edit to add one.)",
    myAddedWordsTitle: "📝 My added words",
    myAddedWordsEmpty: "You haven't added any words yet.",
    editBtn: "Edit",
    deleteBtn: "Delete",
    retryBtn: "🔄 Retry",
    deleteConfirm: "Delete this word?",
    failedWordsBanner: (n) => (n === 1 ? "⚠️ 1 word still needs a meaning." : `⚠️ ${n} words still need a meaning.`),
    retryAllBtn: "🔄 Retry All",
    deleteAllFailedBtn: "🗑️ Delete All Failed",
    deleteAllFailedConfirm: (n) => (n === 1 ? "Delete 1 word that still has no meaning?" : `Delete ${n} words that still have no meaning?`),
    retryingOne: "Retrying...",
    retryProgress: (done, total) => `Retrying... ${done} / ${total}`,
    retryResult: (found, total) => (found === total ? `Found meanings for all ${total} word(s)! 🎉` : `Found meanings for ${found} / ${total} word(s).`),
    hintPrefix: (def) => `Hint: ${def}`,
    statWordsPracticed: "Words practised",
    statFlashKnown: "Flashcards known",
    statQuizAccuracy: (c, t) => `Quiz accuracy (${c}/${t})`,
    statSpellAccuracy: (c, t) => `Spelling accuracy (${c}/${t})`,
    statWordsAdded: "Words you've added",
    resetBtn: "Reset all progress",
    resetConfirm: "This will erase all your saved progress. Are you sure?",
    footerText: "Made for Australian primary students learning English vocabulary. 🇦🇺",
  },
  ko: {
    appTitle: "필수 영어 단어 연습",
    appSubtitle: "영어 어휘력과 스펠링 실력을 키워보세요!",
    langToggle: "English",
    levelBadgePrefix: "레벨",
    levelOverlayTitle: "📚 레벨을 선택하세요",
    levelOverlayDesc: "학습할 레벨을 선택하세요. 언제든지 바꿀 수 있어요.",
    navFlashcards: "🃏 플래시카드",
    navQuiz: "❓ 퀴즈",
    navSpelling: "✏️ 스펠링",
    navWordlist: "📖 단어장",
    navAddword: "➕ 단어 추가",
    navStats: "📊 내 진행상황",
    statsShortcutLabel: "내 진행상황",
    categoryLabel: "카테고리",
    optVocabulary: "어휘",
    optSynonyms: "동의어 & 반의어",
    optHomophones: "동음이의어",
    backLabel: "이전",
    nextLabel: "다음",
    flashHint: "카드를 탭하면 뒤집혀요 • 뜻이나 예문을 탭하면 소리로 들을 수 있어요",
    flashStillLearning: "😕 아직 어려워요",
    flashKnowIt: "😀 알고 있어요!",
    flashEmptyWord: "단어가 없어요",
    flashEmptyDef: (lvl) => `먼저 ${lvl} 단어를 추가해주세요!`,
    newQuizBtn: "🔄 새 퀴즈",
    nextQuestionBtn: "다음 문제 ➡",
    scoreLabel: (c, t) => `점수: ${c} / ${t}`,
    quizNotEnough: (lvl) => `${lvl} 레벨에는 아직 퀴즈를 만들 단어가 부족해요. 다른 카테고리를 선택하거나 단어를 더 추가해보세요!`,
    quizComplete: (score, total) => `퀴즈 완료! ${score} / ${total}점 🎉`,
    quizSynonymPrompt: (word) => `"${word}"와 뜻이 같은 단어는 무엇일까요?`,
    quizHomophonePrompt: (word) => `"${word}"의 뜻은 무엇일까요?`,
    spellingHearBtn: "🔊 단어 듣기",
    spellingPlaceholder: "들리는 대로 입력하세요...",
    spellingStartBtn: "▶ 첫 단어 시작하기",
    spellingBackBtn: "⬅ 이전",
    spellingNextBtn: "다음 ➡",
    spellingSkipBtn: "건너뛰기 ➡",
    spellingWrongPrompt: "정확한 철자를 입력해야 다음 단어로 넘어갈 수 있어요.",
    spellingEmpty: (lvl) => `${lvl} 레벨에는 아직 스펠링 연습 단어가 없어요. "단어 추가"에서 추가해보세요!`,
    wordlistSearchPlaceholder: "🔍 단어 검색...",
    wordlistEmpty: "이 레벨에는 아직 단어가 없어요.",
    masteryNew: "신규",
    masteryPct: (pct) => `${pct}% 숙달`,
    addWordManualTitle: "➕ 단어 직접 추가하기",
    labelWord: "단어 *",
    labelMeaning: "뜻 *",
    labelExample: "예문",
    labelLevel: "레벨",
    phWord: "예: resilient",
    phMeaning: "예: 어려움에서 빨리 회복하는",
    phExample: "예: The resilient plant grew back after the fire.",
    saveWordBtn: "단어 저장",
    updateWordBtn: "단어 수정",
    cancelEditBtn: "수정 취소",
    ocrTitle: "📷 사진에서 단어 추출하기",
    ocrDesc: "책 페이지를 촬영하거나 온라인 지문을 캡처한 이미지를 올려보세요. 텍스트를 읽어서 단어장에 추가할 후보 단어를 찾아드려요.",
    ocrChooseBtn: "📁 사진 선택하기",
    ocrNoFileChosen: "선택된 파일 없음",
    ocrProgressDefault: "이미지를 읽는 중...",
    ocrProgressStatus: (status, pct) => `${status} (${pct}%)`,
    ocrReviewHintDefault: "추가하고 싶은 단어를 탭하세요:",
    ocrSelectAll: "전체 선택",
    ocrDeselectAll: "전체 해제",
    ocrLevelLabel: "선택한 단어를 저장할 레벨",
    ocrAddBtn: "선택한 단어 추가하기",
    ocrNoTesseract: "사진 읽기 기능을 불러오지 못했어요 (인터넷 연결을 확인해주세요). 지금은 사용할 수 없어요.",
    ocrFailRead: "이미지에서 글자를 읽지 못했어요. 더 선명하고 밝은 사진으로 다시 시도해보세요.",
    ocrNoCandidates: "이 이미지에서 새로운 후보 단어를 찾지 못했어요 (이미 단어장에 있는 단어일 수 있어요).",
    ocrFoundCandidates: (n) => `${n}개의 후보 단어를 찾았어요 — 추가하고 싶은 단어를 탭하세요:`,
    ocrSelectAtLeastOne: "먼저 단어를 하나 이상 선택해주세요.",
    ocrAddingStatus: (n) => `${n}개의 단어를 추가하는 중 — 의미를 찾고 있어요...`,
    ocrAddingProgress: (done, total) => `의미를 찾는 중... ${done} / ${total}`,
    ocrAddedStatus: (n, lvl) => `${lvl}에 ${n}개의 단어를 추가했어요!`,
    ocrNoDefFound: "(뜻을 찾지 못했어요 — Edit 버튼으로 직접 입력해주세요.)",
    myAddedWordsTitle: "📝 내가 추가한 단어",
    myAddedWordsEmpty: "아직 추가한 단어가 없어요.",
    editBtn: "수정",
    deleteBtn: "삭제",
    retryBtn: "🔄 다시 찾기",
    deleteConfirm: "이 단어를 삭제할까요?",
    failedWordsBanner: (n) => `⚠️ 아직 뜻을 찾지 못한 단어 ${n}개가 있어요.`,
    retryAllBtn: "🔄 전체 다시 찾기",
    deleteAllFailedBtn: "🗑️ 실패한 단어 전체 삭제",
    deleteAllFailedConfirm: (n) => `뜻을 찾지 못한 단어 ${n}개를 삭제할까요?`,
    retryingOne: "다시 찾는 중...",
    retryProgress: (done, total) => `다시 찾는 중... ${done} / ${total}`,
    retryResult: (found, total) => (found === total ? `${total}개 단어 모두 뜻을 찾았어요! 🎉` : `${total}개 중 ${found}개 단어의 뜻을 찾았어요.`),
    hintPrefix: (def) => `힌트: ${def}`,
    statWordsPracticed: "연습한 단어 수",
    statFlashKnown: "외운 플래시카드 수",
    statQuizAccuracy: (c, t) => `퀴즈 정답률 (${c}/${t})`,
    statSpellAccuracy: (c, t) => `스펠링 정답률 (${c}/${t})`,
    statWordsAdded: "내가 추가한 단어 수",
    resetBtn: "전체 진행상황 초기화",
    resetConfirm: "저장된 모든 진행상황이 사라져요. 계속할까요?",
    footerText: "영어 필수 단어를 공부하는 학생들을 위해 만들었어요. 🇰🇷",
  },
};

function t(key, ...args) {
  const entry = TRANSLATIONS[currentLang][key];
  if (typeof entry === "function") return entry(...args);
  return entry != null ? entry : key;
}

/* ================= LANGUAGE SYSTEMS ================= */
const _KO_LEVELS = typeof KO_LEVELS !== "undefined" ? KO_LEVELS : [];
const _WORD_BANK_KO = typeof WORD_BANK_KO !== "undefined" ? WORD_BANK_KO : { vocabulary: [] };

const SYSTEMS = {
  en: { levels: LEVELS, bank: WORD_BANK, hasSynonyms: true, hasHomophones: true, hasSpelling: true, speechLang: "en-AU" },
  ko: { levels: _KO_LEVELS, bank: _WORD_BANK_KO, hasSynonyms: false, hasHomophones: false, hasSpelling: false, speechLang: "en-US" },
};

function currentSystem() {
  return SYSTEMS[currentLang];
}

/* ================= STORAGE ================= */
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

function loadLevels() {
  try {
    const raw = localStorage.getItem(LEVELS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Could not read saved levels", e);
  }
  return {};
}

function saveLevels() {
  try {
    localStorage.setItem(LEVELS_KEY, JSON.stringify(savedLevels));
  } catch (e) {
    console.warn("Could not save levels", e);
  }
}

function loadLang() {
  try {
    return localStorage.getItem(LANG_KEY);
  } catch (e) {
    return null;
  }
}

function saveLang(lang) {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch (e) {
    console.warn("Could not save language", e);
  }
}

let progress = loadProgress();
let customWords = loadCustomWords();
let savedLevels = loadLevels();
let currentLang = loadLang() || "en";
let currentLevel = savedLevels[currentLang] || currentSystem_levels_default();

function currentSystem_levels_default() {
  const lv = (SYSTEMS[currentLang] || SYSTEMS.en).levels;
  return lv && lv[0] ? lv[0].id : "year4";
}

function levelLabel(levelId) {
  const lv = currentSystem().levels.find((l) => l.id === levelId);
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

/* ================= TEXT-TO-SPEECH ================= */
// Try to pick a natural-sounding young adult female voice for the given language.
// The Web Speech API doesn't expose age, so this is a best-effort heuristic based
// on known voice names shipped by common browsers/OSes, with a graceful fallback.
const FEMALE_VOICE_HINTS = {
  "en-AU": ["karen", "catherine", "zoe", "olivia", "female"],
  "en-US": ["samantha", "zira", "jenny", "aria", "female", "susan", "allison"],
};
const MALE_VOICE_HINTS = ["male", "russell", "lee", "guy", "daniel", "fred", "james"];

let cachedVoices = [];
function refreshVoices() {
  if ("speechSynthesis" in window) cachedVoices = window.speechSynthesis.getVoices() || [];
}
if ("speechSynthesis" in window) {
  refreshVoices();
  window.speechSynthesis.onvoiceschanged = refreshVoices;
}

function pickVoice(lang) {
  if (!cachedVoices.length) return null;
  const hints = FEMALE_VOICE_HINTS[lang] || [];
  const sameLang = cachedVoices.filter((v) => v.lang && v.lang.toLowerCase().replace("_", "-") === lang.toLowerCase());
  const pool = sameLang.length ? sameLang : cachedVoices.filter((v) => v.lang && v.lang.toLowerCase().startsWith(lang.split("-")[0]));
  if (pool.length === 0) return null;

  const isLikelyMale = (name) => MALE_VOICE_HINTS.some((h) => name.toLowerCase().includes(h));
  const named = pool.find((v) => hints.some((h) => v.name.toLowerCase().includes(h)));
  if (named) return named;

  const notMale = pool.filter((v) => !isLikelyMale(v.name));
  return notMale[0] || pool[0];
}

function speak(text) {
  if (!text || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const lang = currentSystem().speechLang;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang;
  const voice = pickVoice(lang);
  if (voice) utter.voice = voice;
  // Slightly brighter pitch/pace to read as a younger adult voice.
  utter.rate = 0.95;
  utter.pitch = 1.08;
  window.speechSynthesis.speak(utter);
}

/* ================= LEVEL POOLS ================= */

function getVocabPool(level) {
  const builtIn = currentSystem().bank.vocabulary.filter((w) => w.level === level);
  const custom = customWords
    .filter((w) => w.level === level)
    .map((w) => ({ word: w.word, definition: w.definition, example: w.example || "", custom: true }));
  return builtIn.concat(custom);
}

function getSpellingPool(level) {
  if (!currentSystem().hasSpelling) {
    // No dedicated spelling list for this system — practise spelling the vocabulary
    // words themselves, using their meaning as a hint.
    return getVocabPool(level).map((w) => ({ word: w.word, tip: t("hintPrefix", w.definition), custom: !!w.custom }));
  }
  const builtIn = currentSystem().bank.spelling.filter((w) => w.level === level);
  const custom = customWords
    .filter((w) => w.level === level)
    .map((w) => ({ word: w.word, tip: t("hintPrefix", w.definition || "a word you added yourself"), custom: true }));
  return builtIn.concat(custom);
}

function getSynonymPool(level) {
  if (!currentSystem().hasSynonyms) return [];
  return currentSystem().bank.synonyms.filter((w) => w.level === level);
}

function getHomophonePool(level) {
  if (!currentSystem().hasHomophones) return [];
  return currentSystem().bank.homophones.filter((w) => w.level === level);
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
  const bank = currentSystem().bank;
  (bank.vocabulary || []).forEach((w) => set.add(w.word.toLowerCase()));
  (bank.spelling || []).forEach((w) => set.add(w.word.toLowerCase()));
  (bank.synonyms || []).forEach((w) => {
    set.add(w.word.toLowerCase());
    set.add(w.synonym.toLowerCase());
  });
  (bank.homophones || []).forEach((p) => p.pair.forEach((w) => set.add(w.toLowerCase())));
  customWords.forEach((w) => set.add(w.word.toLowerCase()));
  return set;
}

/* ================= TRANSLATION APPLICATION ================= */
function applyStaticTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.getElementById("app-title").textContent = t("appTitle");
  document.getElementById("app-subtitle").textContent = t("appSubtitle");
  document.getElementById("app-footer").textContent = t("footerText");
  document.getElementById("lang-toggle").textContent = t("langToggle");
  document.getElementById("level-overlay-title").textContent = t("levelOverlayTitle");
  document.getElementById("level-overlay-desc").textContent = t("levelOverlayDesc");
  document.documentElement.lang = currentLang === "ko" ? "ko" : "en";
  updateCategoryOptionVisibility();
  // These two show state (not static copy), so re-derive them after the
  // generic data-i18n sweep above may have reset them to their default text.
  if (typeof ocrFileNameEl !== "undefined" && ocrLastFileName) ocrFileNameEl.textContent = ocrLastFileName;
  if (typeof ocrSelectAllBtn !== "undefined" && ocrCandidateWords && ocrCandidateWords.length) updateSelectAllLabel();
}

function updateCategoryOptionVisibility() {
  const sys = currentSystem();
  [flashCategorySel, quizCategorySel].forEach((sel) => {
    if (!sel) return;
    Array.from(sel.options).forEach((opt) => {
      if (opt.value === "synonyms") opt.hidden = !sys.hasSynonyms;
      if (opt.value === "homophones") opt.hidden = !sys.hasHomophones;
    });
    if (sel.selectedOptions[0] && sel.selectedOptions[0].hidden) sel.value = "vocabulary";
  });
}

/* ================= LEVEL SELECT OVERLAY ================= */
const levelOverlay = document.getElementById("level-overlay");
const levelBadge = document.getElementById("level-badge");
const levelChoicesEl = document.getElementById("level-choices");
const LEVEL_DESCRIPTIONS = {
  en: { year4: "Foundation vocabulary", year5: "Intermediate vocabulary", year6: "Advanced / GATE-style vocabulary" },
  ko: {
    kr_elem6: "초등 기초 필수 어휘",
    kr_mid1: "중1 필수 어휘",
    kr_mid2: "중2 필수 어휘",
    kr_mid3: "중3 필수 어휘 (심화)",
  },
};

function renderLevelChoices() {
  levelChoicesEl.innerHTML = "";
  const descMap = LEVEL_DESCRIPTIONS[currentLang] || {};
  currentSystem().levels.forEach((lv) => {
    const btn = document.createElement("button");
    btn.className = "level-choice";
    btn.dataset.level = lv.id;
    const title = document.createElement("span");
    title.className = "lv-title";
    title.textContent = lv.label;
    const desc = document.createElement("span");
    desc.className = "lv-desc";
    desc.textContent = descMap[lv.id] || "";
    btn.appendChild(title);
    btn.appendChild(desc);
    btn.addEventListener("click", () => applyLevel(lv.id));
    levelChoicesEl.appendChild(btn);
  });
}

function updateLevelBadge() {
  levelBadge.textContent = `${t("levelBadgePrefix")}: ${levelLabel(currentLevel)} ▾`;
}

function applyLevel(level) {
  currentLevel = level;
  savedLevels[currentLang] = level;
  saveLevels();
  updateLevelBadge();
  levelOverlay.hidden = true;
  populateLevelSelects();
  refreshCurrentView();
  renderCustomWords();
}

levelBadge.addEventListener("click", () => {
  renderLevelChoices();
  levelOverlay.hidden = false;
});

/* ================= LANGUAGE TOGGLE ================= */
const langToggleBtn = document.getElementById("lang-toggle");

function switchLanguage(lang) {
  currentLang = lang;
  saveLang(lang);
  currentLevel = savedLevels[lang] || currentSystem_levels_default();
  applyStaticTranslations();
  updateLevelBadge();
  resetManualForm();
  renderLevelChoices();

  if (savedLevels[lang]) {
    populateLevelSelects();
    refreshCurrentView();
    renderCustomWords();
  } else {
    levelOverlay.hidden = false;
  }
}

langToggleBtn.addEventListener("click", () => {
  switchLanguage(currentLang === "en" ? "ko" : "en");
});

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

function goToTab(view) {
  tabButtons.forEach((b) => b.classList.toggle("active", b.dataset.view === view));
  views.forEach((v) => v.classList.toggle("active", v.id === `view-${view}`));
  refreshView(view);
}

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => goToTab(btn.dataset.view));
});

document.getElementById("flash-stats-shortcut").addEventListener("click", () => goToTab("stats"));

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
    flashWordEl.textContent = t("flashEmptyWord");
    flashDefEl.textContent = t("flashEmptyDef", levelLabel(currentLevel));
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
    return { prompt: t("quizSynonymPrompt", item.word), answer: item.synonym, options, target: item.word };
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
      questions.push({ prompt: t("quizHomophonePrompt", word), answer: correctDef, options, target: word });
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
    quizQuestionEl.textContent = t("quizNotEnough", levelLabel(currentLevel));
    quizOptionsEl.innerHTML = "";
    updateQuizScoreLabel();
    return;
  }

  quizProgressFill.style.width = `${(quizIndex / total) * 100}%`;

  if (quizIndex >= total) {
    quizQuestionEl.textContent = t("quizComplete", quizScore, total);
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
  quizScoreEl.textContent = t("scoreLabel", quizScore, quizQuestions.length);
}

quizNextBtn.addEventListener("click", () => {
  quizIndex++;
  renderQuizQuestion();
});

quizQuestionEl.addEventListener("click", () => speak(quizQuestionEl.textContent));

quizRestartBtn.addEventListener("click", buildQuizQuestions);
quizCategorySel.addEventListener("change", buildQuizQuestions);

/* ================= SPELLING ================= */
const spellingStartScreen = document.getElementById("spelling-start-screen");
const spellingStartBtn = document.getElementById("spelling-start-btn");
const spellingPractice = document.getElementById("spelling-practice");
const spellingSpeakBtn = document.getElementById("spelling-speak");
const spellingInput = document.getElementById("spelling-input");
const spellingFeedback = document.getElementById("spelling-feedback");
const spellingBackBtn = document.getElementById("spelling-back");
const spellingSkipBtn = document.getElementById("spelling-skip");
const spellingNextBtn = document.getElementById("spelling-next");
const spellingScoreEl = document.getElementById("spelling-score");

let spellingDeck = [];
let spellingIndex = 0;
let spellingScore = { correct: 0, total: 0 };

function buildSpellingDeck() {
  spellingDeck = shuffle(getSpellingPool(currentLevel));
  spellingIndex = 0;
  spellingScore = { correct: 0, total: 0 };
  updateSpellingScoreLabel();
  spellingInput.value = "";
  spellingInput.className = "";
  spellingFeedback.innerHTML = "";
  spellingStartScreen.hidden = false;
  spellingPractice.hidden = true;
}

spellingStartBtn.addEventListener("click", () => {
  spellingStartScreen.hidden = true;
  spellingPractice.hidden = false;
  loadSpellingWord();
});

function loadSpellingWord() {
  spellingInput.value = "";
  spellingInput.className = "";
  spellingFeedback.innerHTML = "";
  if (spellingDeck.length === 0) {
    spellingFeedback.textContent = t("spellingEmpty", levelLabel(currentLevel));
    spellingBackBtn.disabled = true;
    return;
  }
  if (spellingIndex >= spellingDeck.length) {
    spellingDeck = shuffle(spellingDeck);
    spellingIndex = 0;
  }
  spellingBackBtn.disabled = spellingIndex === 0;
  speak(spellingDeck[spellingIndex].word);
  spellingInput.focus();
}

spellingSpeakBtn.addEventListener("click", () => {
  if (spellingDeck[spellingIndex]) speak(spellingDeck[spellingIndex].word);
});

function showSpellingWrongFeedback(current) {
  spellingFeedback.innerHTML = "";
  const wordLine = document.createElement("div");
  wordLine.className = "spelling-wrong-word";
  wordLine.textContent = current.word;
  const promptLine = document.createElement("div");
  promptLine.className = "spelling-wrong-prompt";
  promptLine.textContent = t("spellingWrongPrompt");
  spellingFeedback.appendChild(wordLine);
  spellingFeedback.appendChild(promptLine);
  if (current.tip) {
    const meaningLine = document.createElement("div");
    meaningLine.className = "spelling-meaning-line";
    meaningLine.textContent = current.tip;
    spellingFeedback.appendChild(meaningLine);
  }
}

function attemptSpellingNext() {
  if (spellingDeck.length === 0) return;
  const current = spellingDeck[spellingIndex];
  const guess = spellingInput.value.trim().toLowerCase();
  const correct = guess === current.word.toLowerCase();
  recordResult(current.word, correct);

  if (correct) {
    spellingScore.total++;
    spellingScore.correct++;
    progress.spelling.total++;
    progress.spelling.correct++;
    saveProgress();
    updateSpellingScoreLabel();
    spellingIndex++;
    loadSpellingWord();
  } else {
    spellingInput.className = "incorrect";
    showSpellingWrongFeedback(current);
  }
}

function updateSpellingScoreLabel() {
  spellingScoreEl.textContent = t("scoreLabel", spellingScore.correct, spellingScore.total);
}

spellingNextBtn.addEventListener("click", attemptSpellingNext);
spellingInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") attemptSpellingNext();
});

spellingSkipBtn.addEventListener("click", () => {
  spellingIndex++;
  loadSpellingWord();
});

spellingBackBtn.addEventListener("click", () => {
  if (spellingIndex > 0) {
    spellingIndex--;
    loadSpellingWord();
  }
});

/* ================= WORD LIST ================= */
const wordlistSearch = document.getElementById("wordlist-search");
const wordlistGrid = document.getElementById("wordlist-grid");

function masteryLabel(word) {
  const s = progress.wordStats[word];
  if (!s || s.correct + s.incorrect === 0) return { text: t("masteryNew"), cls: "" };
  const total = s.correct + s.incorrect;
  const pct = Math.round((s.correct / total) * 100);
  if (pct >= 75) return { text: t("masteryPct", pct), cls: "high" };
  if (pct <= 35) return { text: t("masteryPct", pct), cls: "low" };
  return { text: t("masteryPct", pct), cls: "" };
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
    p.textContent = t("wordlistEmpty");
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
const customWordsFailedBanner = document.getElementById("custom-words-failed-banner");
const customWordsFailedText = document.getElementById("custom-words-failed-text");
const customWordsStatus = document.getElementById("custom-words-status");
const customRetryAllBtn = document.getElementById("custom-retry-all-btn");
const customDeleteFailedBtn = document.getElementById("custom-delete-failed-btn");
const ocrLevelSelectEl = document.getElementById("ocr-level");

function genId() {
  return `cw_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function populateLevelSelects() {
  [manualLevelSelect, ocrLevelSelectEl].forEach((sel) => {
    if (!sel) return;
    sel.innerHTML = "";
    currentSystem().levels.forEach((lv) => {
      const opt = document.createElement("option");
      opt.value = lv.id;
      opt.textContent = lv.label;
      sel.appendChild(opt);
    });
    sel.value = currentLevel;
  });
}

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
      existing.noDefinition = false;
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
  if (manualLevelSelect.options.length) manualLevelSelect.value = currentLevel;
  manualCancelBtn.style.display = "none";
  manualSaveBtn.textContent = t("saveWordBtn");
}

function startEditCustomWord(id) {
  const w = customWords.find((cw) => cw.id === id);
  if (!w) return;
  manualEditId.value = w.id;
  manualWordInput.value = w.word;
  manualDefinitionInput.value = w.noDefinition ? "" : w.definition;
  manualExampleInput.value = w.example || "";
  manualLevelSelect.value = w.level;
  manualCancelBtn.style.display = "inline-block";
  manualSaveBtn.textContent = t("updateWordBtn");
  manualWordInput.focus();
}

function deleteCustomWord(id) {
  if (!confirm(t("deleteConfirm"))) return;
  customWords = customWords.filter((w) => w.id !== id);
  saveCustomWords();
  renderCustomWords();
  renderWordList();
}

async function retrySingleWord(id) {
  const w = customWords.find((cw) => cw.id === id);
  if (!w) return;
  customWordsStatus.textContent = t("retryingOne");
  const info = await fetchWordInfo(w.word);
  if (info && info.definition) {
    w.definition = info.definition;
    if (info.example) w.example = info.example;
    w.noDefinition = false;
    saveCustomWords();
    customWordsStatus.textContent = t("retryResult", 1, 1);
  } else {
    customWordsStatus.textContent = t("retryResult", 0, 1);
  }
  renderCustomWords();
  renderWordList();
}

async function retryAllFailedWords() {
  const failed = customWords.filter((w) => w.noDefinition);
  if (failed.length === 0) return;
  customRetryAllBtn.disabled = true;
  customDeleteFailedBtn.disabled = true;
  customWordsStatus.textContent = t("retryProgress", 0, failed.length);

  const infos = await mapWithConcurrency(failed, 4, (w) => fetchWordInfo(w.word), (done, total) => {
    customWordsStatus.textContent = t("retryProgress", done, total);
  });

  let foundCount = 0;
  failed.forEach((w, i) => {
    const info = infos[i];
    if (info && info.definition) {
      w.definition = info.definition;
      if (info.example) w.example = info.example;
      w.noDefinition = false;
      foundCount++;
    }
  });
  saveCustomWords();

  customWordsStatus.textContent = t("retryResult", foundCount, failed.length);
  customRetryAllBtn.disabled = false;
  customDeleteFailedBtn.disabled = false;
  renderCustomWords();
  renderWordList();
}

function deleteAllFailedWords() {
  const failed = customWords.filter((w) => w.noDefinition);
  if (failed.length === 0) return;
  if (!confirm(t("deleteAllFailedConfirm", failed.length))) return;
  customWords = customWords.filter((w) => !w.noDefinition);
  saveCustomWords();
  customWordsStatus.textContent = "";
  renderCustomWords();
  renderWordList();
}

function renderCustomWords() {
  const failedWords = customWords.filter((w) => w.noDefinition);
  if (failedWords.length > 0) {
    customWordsFailedBanner.hidden = false;
    customWordsFailedText.textContent = t("failedWordsBanner", failedWords.length);
  } else {
    customWordsFailedBanner.hidden = true;
  }

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

      if (w.noDefinition) {
        const retryBtn = document.createElement("button");
        retryBtn.className = "retry-btn";
        retryBtn.textContent = t("retryBtn");
        retryBtn.addEventListener("click", () => {
          retryBtn.disabled = true;
          retrySingleWord(w.id);
        });
        btnRow.appendChild(retryBtn);
      }

      const editBtn = document.createElement("button");
      editBtn.className = "edit-btn";
      editBtn.textContent = t("editBtn");
      editBtn.addEventListener("click", () => startEditCustomWord(w.id));

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "delete-btn";
      deleteBtn.textContent = t("deleteBtn");
      deleteBtn.addEventListener("click", () => deleteCustomWord(w.id));

      btnRow.appendChild(editBtn);
      btnRow.appendChild(deleteBtn);
      right.appendChild(btnRow);

      row.appendChild(right);
      customWordsGrid.appendChild(row);
    });
}

customRetryAllBtn.addEventListener("click", retryAllFailedWords);
customDeleteFailedBtn.addEventListener("click", deleteAllFailedWords);

/* ---------- OCR: extract words from a photo ---------- */
const ocrChooseBtn = document.getElementById("ocr-choose-btn");
const ocrFileNameEl = document.getElementById("ocr-file-name");
const ocrFileInput = document.getElementById("ocr-file-input");
const ocrProgress = document.getElementById("ocr-progress");
const ocrProgressFill = document.getElementById("ocr-progress-fill");
const ocrProgressLabel = document.getElementById("ocr-progress-label");
const ocrReview = document.getElementById("ocr-review");
const ocrCandidatesEl = document.getElementById("ocr-candidates");
const ocrSelectAllBtn = document.getElementById("ocr-select-all-btn");
const ocrLevelSelect = document.getElementById("ocr-level");
const ocrAddBtn = document.getElementById("ocr-add-btn");
const ocrStatus = document.getElementById("ocr-status");
const ocrReviewHintEl = document.getElementById("ocr-review-hint");

const STOPWORDS = new Set(
  ("the and for that with have this from they were been their said each which she does how out many then them these" +
    " some her would make like into time look more write number could people water than first been call word about" +
    " other after also very just should because through where before between under while again above below during" +
    " over there here what your yours mine ours theirs going going has had was are all not but you not can will one" +
    " two three when who whom whose").split(/\s+/)
);

let ocrSelectedWords = new Set();
let ocrCandidateWords = [];
let ocrCandidateChips = new Map();
let ocrLastFileName = null;

ocrChooseBtn.addEventListener("click", () => ocrFileInput.click());

ocrFileInput.addEventListener("change", async (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) {
    ocrLastFileName = null;
    ocrFileNameEl.textContent = t("ocrNoFileChosen");
    return;
  }

  ocrLastFileName = file.name;
  ocrFileNameEl.textContent = file.name;
  ocrReview.hidden = true;
  ocrStatus.textContent = "";
  ocrSelectedWords = new Set();
  ocrCandidateWords = [];
  ocrCandidateChips = new Map();
  ocrCandidatesEl.innerHTML = "";
  ocrSelectAllBtn.hidden = true;
  ocrLevelSelect.value = currentLevel;

  if (typeof Tesseract === "undefined") {
    ocrStatus.textContent = t("ocrNoTesseract");
    ocrReview.hidden = false;
    return;
  }

  ocrProgress.hidden = false;
  ocrProgressFill.style.width = "0%";
  ocrProgressLabel.textContent = t("ocrProgressDefault");

  try {
    const result = await Tesseract.recognize(file, "eng", {
      logger: (m) => {
        if (m.progress != null) {
          const pct = Math.round(m.progress * 100);
          ocrProgressFill.style.width = `${pct}%`;
          ocrProgressLabel.textContent = t("ocrProgressStatus", m.status, pct);
        }
      },
    });
    ocrProgress.hidden = true;
    processOcrText(result.data.text || "");
  } catch (err) {
    console.error(err);
    ocrProgress.hidden = true;
    ocrStatus.textContent = t("ocrFailRead");
    ocrReview.hidden = false;
  } finally {
    // Reset the underlying input (not the visible filename label) so choosing
    // the same file again still fires a "change" event.
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
  ocrCandidateWords = list;
  ocrCandidateChips = new Map();
  ocrReview.hidden = false;
  updateSelectAllLabel();

  if (list.length === 0) {
    ocrReviewHintEl.textContent = t("ocrNoCandidates");
    ocrCandidatesEl.innerHTML = "";
    ocrSelectAllBtn.hidden = true;
    return;
  }

  ocrSelectAllBtn.hidden = false;
  ocrReviewHintEl.textContent = t("ocrFoundCandidates", list.length);
  ocrCandidatesEl.innerHTML = "";
  list.forEach((word) => {
    const chip = document.createElement("div");
    chip.className = "wordlist-item candidate-chip";
    chip.textContent = word;
    chip.addEventListener("click", () => toggleCandidateSelection(word));
    ocrCandidatesEl.appendChild(chip);
    ocrCandidateChips.set(word, chip);
  });
}

function toggleCandidateSelection(word) {
  const chip = ocrCandidateChips.get(word);
  if (ocrSelectedWords.has(word)) {
    ocrSelectedWords.delete(word);
    if (chip) chip.classList.remove("selected");
  } else {
    ocrSelectedWords.add(word);
    if (chip) chip.classList.add("selected");
  }
  updateSelectAllLabel();
}

function updateSelectAllLabel() {
  const allSelected = ocrCandidateWords.length > 0 && ocrCandidateWords.every((w) => ocrSelectedWords.has(w));
  ocrSelectAllBtn.textContent = t(allSelected ? "ocrDeselectAll" : "ocrSelectAll");
}

ocrSelectAllBtn.addEventListener("click", () => {
  const allSelected = ocrCandidateWords.length > 0 && ocrCandidateWords.every((w) => ocrSelectedWords.has(w));
  ocrCandidateWords.forEach((word) => {
    const chip = ocrCandidateChips.get(word);
    if (allSelected) {
      ocrSelectedWords.delete(word);
      if (chip) chip.classList.remove("selected");
    } else {
      ocrSelectedWords.add(word);
      if (chip) chip.classList.add("selected");
    }
  });
  updateSelectAllLabel();
});

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Runs `worker` over `items` with at most `limit` calls in flight at once,
// calling `onProgress(completedCount, total)` after each one finishes.
// Keeps lookups (below) from firing 50-100 requests at the same instant,
// which is what was causing many of them to silently fail before.
async function mapWithConcurrency(items, limit, worker, onProgress) {
  const results = new Array(items.length);
  let nextIndex = 0;
  let completed = 0;

  async function runNext() {
    const i = nextIndex++;
    if (i >= items.length) return;
    results[i] = await worker(items[i], i);
    completed++;
    if (onProgress) onProgress(completed, items.length);
    await runNext();
  }

  const workers = [];
  for (let i = 0; i < Math.min(limit, items.length); i++) workers.push(runNext());
  await Promise.all(workers);
  return results;
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

async function fetchDefinitionWithRetry(word) {
  let result = await fetchDefinition(word);
  if (!result) {
    await wait(400);
    result = await fetchDefinition(word);
  }
  return result;
}

// Best-effort English -> Korean translation of a single word, used so words
// added from a photo on the Korean track get a Korean meaning automatically
// (dictionaryapi.dev only returns English definitions).
async function fetchKoreanTranslation(word) {
  try {
    const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|ko`);
    if (!res.ok) return null;
    const data = await res.json();
    const text = data && data.responseData && data.responseData.translatedText;
    if (!text || /mymemory warning/i.test(text)) return null;
    return text.trim();
  } catch (e) {
    return null;
  }
}

async function fetchKoreanTranslationWithRetry(word) {
  let result = await fetchKoreanTranslation(word);
  if (!result) {
    await wait(400);
    result = await fetchKoreanTranslation(word);
  }
  return result;
}

// Looks up a definition (and example, where available) for one word,
// matching whichever language track is currently active.
async function fetchWordInfo(word) {
  if (currentLang === "ko") {
    const [enEntry, koMeaning] = await Promise.all([fetchDefinitionWithRetry(word), fetchKoreanTranslationWithRetry(word)]);
    if (!koMeaning && !enEntry) return null;
    return { definition: koMeaning || null, example: (enEntry && enEntry.example) || "" };
  }
  const enEntry = await fetchDefinitionWithRetry(word);
  return enEntry ? { definition: enEntry.definition, example: enEntry.example } : null;
}

ocrAddBtn.addEventListener("click", async () => {
  const selected = Array.from(ocrSelectedWords);
  if (selected.length === 0) {
    ocrStatus.textContent = t("ocrSelectAtLeastOne");
    return;
  }
  const level = ocrLevelSelect.value;
  ocrAddBtn.disabled = true;
  ocrStatus.textContent = t("ocrAddingStatus", selected.length);

  const infos = await mapWithConcurrency(selected, 4, (w) => fetchWordInfo(w), (done, total) => {
    ocrStatus.textContent = t("ocrAddingProgress", done, total);
  });

  selected.forEach((word, i) => {
    const info = infos[i];
    const found = !!(info && info.definition);
    customWords.push({
      id: genId(),
      word,
      definition: found ? info.definition : t("ocrNoDefFound"),
      example: (info && info.example) || "",
      level,
      source: "ocr",
      noDefinition: !found,
      createdAt: Date.now(),
    });
  });
  saveCustomWords();

  ocrStatus.textContent = t("ocrAddedStatus", selected.length, levelLabel(level));
  ocrSelectedWords = new Set();
  ocrCandidateWords = [];
  ocrCandidateChips = new Map();
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
    { num: wordsPracticed, lbl: t("statWordsPracticed") },
    { num: flashKnownCount, lbl: t("statFlashKnown") },
    { num: `${quizPct}%`, lbl: t("statQuizAccuracy", progress.quiz.correct, progress.quiz.total) },
    { num: `${spellPct}%`, lbl: t("statSpellAccuracy", progress.spelling.correct, progress.spelling.total) },
    { num: customWords.length, lbl: t("statWordsAdded") },
  ];

  statsGrid.innerHTML = stats
    .map((s) => `<div class="stat-box"><div class="num">${s.num}</div><div class="lbl">${s.lbl}</div></div>`)
    .join("");
}

resetProgressBtn.addEventListener("click", () => {
  if (!confirm(t("resetConfirm"))) return;
  progress = { wordStats: {}, flashKnown: {}, quiz: { correct: 0, total: 0 }, spelling: { correct: 0, total: 0 } };
  saveProgress();
  renderStats();
  renderWordList();
});

/* ================= INIT ================= */
applyStaticTranslations();
renderLevelChoices();
updateLevelBadge();
populateLevelSelects();

// Show the level-select overlay only if we don't yet have a saved level for this language.
levelOverlay.hidden = !!savedLevels[currentLang];

buildFlashDeck();
buildQuizQuestions();
buildSpellingDeck();
renderWordList();
renderCustomWords();
