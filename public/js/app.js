// Koala Study Mate — app logic
// Word extraction from a photo uses Tesseract.js, from a PDF uses pdf.js, and
// from a Word document uses mammoth.js — all loaded from a CDN, client-side
// only. Best-effort definition lookup uses the free dictionaryapi.dev service
// when you add words extracted this way.

const STORAGE_KEY = "ywp_progress_v1";
const CUSTOM_WORDS_KEY = "ywp_custom_words_v1";
const SHARED_WORDS_CACHE_KEY = "ywp_shared_words_cache_v1";
const MY_DECK_KEY = "ywp_my_deck_v1";
const GOAL_MIN = 5;
// Three tiers of question-count ceiling: signed-out visitors are capped at
// 50 (going further nudges them to sign up), a free account at 100 (going
// further nudges an upgrade to paid), and a paid or admin account at 200.
const GOAL_MAX_ANONYMOUS = 50;
const GOAL_MAX_FREE = 100;
const GOAL_MAX_PAID = 200;
const GOAL_STEP = 5;
const LEVELS_KEY = "ywp_levels_v1"; // { en: "year4", ko: "kr_elem6" }
const LANG_KEY = "ywp_lang_v1";
const ADMIN_KEY = "ywp_admin_v1";
let flashWrongOverride = null; // set by the Wrong-notes "Study these words" button
const TYPEGAME_HIGH_SCORE_KEY = "ywp_typegame_highscores_v1";
const ADMIN_USERNAME = "admin";
// SHA-256 of the admin password, so the password itself isn't sitting in
// plain text in the page source. This is still a static site with no
// backend, so it's not real security (the hash and check both run in the
// browser, and this short a password could be brute-forced offline against
// the hash) — it just stops a casual glance at "view source" from handing
// the password over directly.
const ADMIN_PASSWORD_HASH = "ac9689e2272427085e35b9d3e3e8bed88cb3434828b43b86fc0596cad4c6e270";

async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/* ================= TRANSLATIONS ================= */
const TRANSLATIONS = {
  en: {
    appTitle: "Koala Study Mate",
    appSubtitle: "Vocabulary, spelling & times tables for Australian primary students",
    homePitch: "Short, fun daily practice that builds vocabulary, spelling and times tables — a few minutes a day.",
    homeAus: "🇦🇺 Made for Australian primary students · Year 4–6",
    homeChooseYear: "Choose your year level",
    homeStartBtn: "▶ Start today's practice",
    missionTitle: "🎯 Today's Mission",
    missionFlash: (n) => `Learn ${n} words with Flashcards`,
    missionSpelling: (n) => `Spell ${n} words`,
    missionQuiz: (n) => `Answer ${n} quiz questions`,
    missionTT: (n) => `Practise ${n} times-table facts`,
    missionGo: "Go",
    missionDoneMsg: "🎉 Mission complete! Come back tomorrow for a new one.",
    missionToast: "Mission complete!",
    promoTitle: "📸 From your child's book to a quiz",
    promoSteps: "Snap a page → pick the tricky words → practise them as flashcards, spelling and quizzes.",
    promoBtn: "Try it →",
    homeLearn: "Learn",
    homePlay: "Play",
    homeMine: "My learning",
    langToggle: "한국어",
    levelBadgePrefix: "Level",
    levelOverlayTitle: "📚 Choose your level",
    levelOverlayDesc: "Pick the level you want to practise. You can change this anytime.",
    navFlashcards: "🃏 Flashcards",
    navQuiz: "💡 Quiz",
    navSpelling: "✏️ Spelling",
    navTypeGame: "⌨️ Typing Game",
    navTimesTable: "🧮 Times Table",
    navWordlist: "📖 Word List",
    navAddword: "➕ Add Word",
    navStats: "📊 My Progress",
    navHome: "🏠 Home",
    navAdminCodes: "🛠️ Admin",
    // Section titles shown at the top of the Quiz/Spelling/Flashcards cards
    // themselves (not the nav) — separate from navQuiz/navSpelling/
    // navFlashcards above since those carry the nav's own emoji/short-form.
    quizSectionTitle: "💡 Quiz",
    spellingSectionTitle: "✏️ Spelling",
    flashcardsSectionTitle: "🃏 Flashcards",
    // The persistent nav row groups Quiz/Spelling/Flashcards under one
    // "Study" trigger, and Times Table/Typing Game under one "Game" trigger
    // (each opens a small dropdown on hover/tap) — see .tab-group in
    // style.css and the tabGroups wiring in app.js.
    navStudy: "📚 Study",
    navGame: "👾 Game",
    // Short, icon-free labels for the mobile bottom tab bar, whose icon is
    // its own separate element (see .bottom-tab-icon) — these just need a
    // one-word caption underneath it.
    navQuizShort: "Quiz",
    navTimesTableShort: "Times",
    navStatsShort: "Progress",
    spIntroTip1: "Hear the word 👂",
    spIntroTip2: "Type what you hear ⌨️",
    spIntroTip3: "Check it and win a star! ⭐",
    spWhyTitle: "Why practise spelling?",
    spWhy1: "Words you can spell are words you read faster.",
    spWhy2: "Your writing looks clear and confident.",
    spWhy3: "Spelling is part of school tests like NAPLAN.",
    spLiveIdle: "Listen & type!",
    spLiveHear: "Listening 👂",
    spLiveOk: "Yum! 🍃",
    spLiveFull: "So full & happy! 🥰",
    kbIdle: "Let's go! 🍃",
    kbYum: "Yum! 🍃",
    kbOops: "Oops! 😮",
    kbOver: "Good try! 🐨",
    spLiveNo: "Try again 💪",
    spLiveNext: "Next! 🍃",
    spLivePrev: "Look back 👀",
    spProgressLabel: (i, n) => `Word ${i} of ${n}`,
    fkIdle: "Tap the card to flip!",
    fkFlip: "Ta-da! ✨",
    fkNext: "Next word! 🍃",
    fkPrev: "Let's look again 👀",
    fkKnow: "Great job! 🌟",
    fkDunno: "We'll practise! 💪",
    installAppBtn: "📲 Install app",
    installSheetTitle: "Add Koala Study Mate to your home screen",
    installSheetSub: "Free • Safe • No ads",
    installPerk1: "⚡ Opens in one tap, full screen",
    installPerk2: "📴 Flashcards & games work offline",
    installPerk3: "🏅 Keeps your koala badges close",
    installSheetOk: "Install",
    installSheetLater: "Not now",
    offlineBanner: "📴 You're offline — flashcards, word list and games still work.",
    statsTabOverview: "📊 Overview",
    statsTabBadges: "🏅 Badges",
    statsTabWrong: "📕 Wrong notes",
    navAddwordShort: "Add Word",
    navHomeShort: "Home",
    navStudyShort: "Study",
    navGameShort: "Game",
    // Landing-page tile subtitles (see #view-landing) — one short line under
    // each tile's title, in the same top-to-bottom importance order as the
    // tiles themselves.
    landingDescStats: "See how far you've come",
    landingDescAddword: "Build your own word list",
    landingDescQuiz: "Test yourself, word by word",
    landingDescTimesTable: "Practise your times tables",
    landingDescSpelling: "Type each word from memory",
    landingDescTypeGame: "Catch the falling words",
    landingDescFlashcards: "Flip through and review",
    landingDescWordlist: "Browse every word you have",
    statsInsightsTitle: "✨ Premium Insights",
    statsInsightsBullet1: "📧 Weekly progress email reports",
    statsInsightsBullet2: "🎯 Category-by-category accuracy breakdown",
    statsInsightsBullet3: "👨‍👩‍👧‍👦 Track multiple children in one account",
    adminCodesTitle: "🎟️ Premium Signup Codes",
    adminCodesDesc: "Generate a one-time code and send it to someone so they can sign up as a premium account instead of general.",
    adminCodesGenerateBtn: "🎲 Generate New Code",
    adminCodesEmpty: "No codes generated yet.",
    adminCodesCount: (n) => `${n} code${n === 1 ? "" : "s"}`,
    adminCodeUsedBy: (username) => `Used by ${username}`,
    adminCodeUnused: "Not used yet",
    adminCodeCopyBtn: "Copy",
    adminCodeCopiedBtn: "Copied!",
    adminCodeGenerateFailed: "Could not generate a code — please try again.",
    adminCodeDeleteBtn: "Delete",
    adminCodeConfirmDelete: (code) => `Delete code ${code}? This can't be undone.`,
    adminCodesSortLabel: "Sort by",
    adminCodesSortNewest: "Newest",
    adminCodesSortUnused: "Not used first",
    adminCodesSortUsed: "Used first",
    adminRequestApproveBtn: "✅ Approve",
    adminRequestDismissBtn: "Dismiss",
    adminRequestActionFailed: "That didn't work — please try again.",
    adminUsersTitle: "🧑‍🤝‍🧑 User Accounts",
    adminUsersDesc: "Search for an account, change its role or password, or approve a pending upgrade request — a user waiting on one is pinned to the top.",
    adminUsersSearchPlaceholder: "Search by username",
    adminUsersSortLabel: "Sort by",
    adminUsersSortJoined: "Join date",
    adminUsersSortAz: "Username (A→Z)",
    adminUsersSortRole: "Role",
    adminUsersCount: (n) => `${n} account${n === 1 ? "" : "s"}`,
    adminUsersEmpty: "No accounts found.",
    adminUserCreatedAt: (when) => `Joined ${when}`,
    adminUserUpgradedAt: (when) => `Upgraded ${when}`,
    adminUserPendingRequest: "⏳ Upgrade requested",
    adminUserYou: "(you)",
    adminUserApplyRoleBtn: "Apply",
    adminUserConfirmRoleChange: (username, role) => `Change ${username}'s role to ${role}?`,
    adminUserResetPasswordBtn: "Reset password",
    adminUserResetPasswordPrompt: (username) => `New password for ${username} (min. 8 characters):`,
    adminUserResetPasswordDone: (username) => `${username}'s password has been reset.`,
    adminUserDeleteBtn: "Delete account",
    adminUserConfirmDelete: (username) => `Permanently delete ${username}'s account? This also deletes their own private words. This can't be undone.`,
    adminRole_free: "General",
    adminRole_paid: "Premium",
    adminRole_admin: "Admin",
    upgradeNoCodeHint: "Don't have a code yet?",
    upgradeRequestBtn: "📨 Request an upgrade from admin",
    upgradeRequestFailed: "Could not send the request — please try again.",
    upgradeRequestPendingMsg: "Your request is in — waiting for admin to approve it. Check back later.",
    upgradeRequestFulfilledMsg: "Admin sent you a code — enter it below to finish activating.",
    upgradeReadyBanner: "⭐ Your upgrade code has arrived — tap to enter it!",
    typeGameTitle: "⌨️ Typing Game",
    typeGameDesc: "Type each word before it reaches the bottom!",
    typeGameStartBtn: "▶ Start Game",
    typeGameNotEnough: (lvl) => `${lvl} needs a few more words before you can play — add some in Add Word or Word List first!`,
    typeGameHint: "Just start typing — the matching falling word locks on automatically. Press Enter to check a guess.",
    typeGameTypoMsg: "❌ No matching word — try again!",
    typeGameMute: "Mute music",
    typeGameUnmute: "Unmute music",
    typeGameInputPlaceholder: "Type here...",
    typeGameScoreLabel: (score) => `Score: ${score}`,
    typeGameOverTitle: "💥 Game Over",
    typeGameFinalScore: (score) => `Final score: ${score}`,
    typeGameHighScore: (score) => `Best score: ${score}`,
    typeGameNewHighScore: "🎉 New best score!",
    typeGameRestartBtn: "Play Again",
    typeGamePauseLabel: "Pause",
    typeGameEndLabel: "End game",
    typeGameExpand: "Expand game area",
    typeGameCollapse: "Collapse game area",
    typeGameStageLabel: (n) => `Stage ${n}`,
    typeGameLevelChallengePrompt: (level) => `Ready to try ${level}?`,
    timesTableTitle: "🧮 Times Table",
    timesTableDesc: 'Type the whole fact — like "8 2 16" for 8 × 2 — before it reaches the bottom!',
    timesTableDemoCaption: "Type the two numbers, then the answer.",
    timesTableDemoCaption2: "Spaces are optional!",
    timesTableInstrLine1: "When the problem is {{EX}}, here's how to answer:",
    timesTableInstrLine2: "Enter one of {{FMT}}",
    timesTableMaxTableLabel: "Choose tables to practise",
    timesTableHowTitle: "💡 How to answer",
    timesTableOne: (n) => `Table ${n}`,
    timesTableMany: (n) => `${n} tables`,
    timesTableQuickDefault: "Reset 2–9",
    timesTableQuickAll: "All 2–20",
    timesTableStartBtn: "▶ Start Game",
    timesTableHint: "How to answer when the problem is 8 × 2: enter one of 8216 / 82 16 / 8 2 16",
    timesTableTypoMsg: "❌ No matching fact — try again!",
    timesTableMute: "Mute music",
    timesTableUnmute: "Unmute music",
    timesTableInputPlaceholder: "Type here...",
    timesTableScoreLabel: (score) => `Score: ${score}`,
    timesTableOverTitle: "💥 Game Over",
    timesTableFinalScore: (score) => `Final score: ${score}`,
    timesTableHighScore: (score) => `Best score: ${score}`,
    timesTableNewHighScore: "🎉 New best score!",
    timesTableRestartBtn: "Play Again",
    timesTableLimitReachedAnonymous: "You've reached the 50-problem limit for visitors — sign up (it's free!) to keep going.",
    timesTableLimitReachedFree: "You've reached the 100-problem limit for General accounts — upgrade to Premium for unlimited play.",
    timesTablePauseLabel: "Pause",
    timesTableEndLabel: "End game",
    timesTableExpand: "Expand game area",
    timesTableCollapse: "Collapse game area",
    timesTableStageLabel: (n) => `Stage ${n}`,
    timesTableChallengePrompt: (table) => `Ready to try the ${table} times table?`,
    categoryLabel: "Category",
    optVocabulary: "Vocabulary",
    optSynonyms: "Synonyms",
    optAntonyms: "Antonyms",
    optHomophones: "Homophones",
    flashFrontModeLabel: "Flashcard front side",
    flashSourceLabel: "Flashcard source",
    flashSourceAuto: "🎲 Level words",
    flashSourceMine: "⭐ My cards",
    myDeckTitle: "⭐ My flashcards",
    myDeckAddBtn: "Add to my cards",
    myDeckModeManual: "✏️ Add manually",
    myDeckModeBulk: "📋 Multiple words",
    myDeckModeSearch: "🔍 Search & add",
    myDeckBulkHint: "We'll look up each word's meaning and example for you.",
    myDeckSearchPlaceholder: "🔍 Search the word lists...",
    myDeckSearchHint: "Type to search every level of the current word lists.",
    myDeckSearchNone: "No words match that.",
    myDeckSearchCount: (n) => `${n} match${n === 1 ? "" : "es"} — tap ⭐ to add`,
    myDeckInDeck: "In your cards",
    myDeckAddOne: "⭐ Add",
    myDeckClearBtn: "🗑️ Clear all",
    myDeckClearConfirm: (n) => `Remove all ${n} of your own cards?`,
    myDeckEmpty: "No cards of your own yet — add one above, or pick words in the Word List tab.",
    myDeckEmptyCard: "No cards yet",
    myDeckEmptyHint: "Add your own words below, or pick some in the Word List tab.",
    myDeckAdded: (n) => `Added ${n} card${n === 1 ? "" : "s"}.`,
    myDeckDuplicate: "That word is already in your cards.",
    flashFrontWord: "🔤 Word",
    flashFrontMeaning: "💡 Meaning",
    hearItLabel: "Hear it",
    backLabel: "Back",
    nextLabel: "Next",
    flashHint: "Tap the card to flip it • Tap the meaning or example to hear it read aloud",
    flashStillLearning: "😕 Still learning",
    flashKnowIt: "😀 I know this!",
    flashEmptyWord: "No words yet",
    flashEmptyDef: (lvl) => `Add some ${lvl} words first!`,
    goalLabel: "Number of Questions",
    goalDecreaseLabel: "Fewer questions",
    goalIncreaseLabel: "More questions",
    anonymousQuestionCapPrompt: "Sign up for free to unlock more questions and the whole app!",
    goalReached: (score, level) => `🎉 ${score} correct — you've hit your target for ${level}!`,
    goalReachedTop: (score, level) => `🎉 ${score} correct on ${level} — that's the highest level. Brilliant!`,
    goalNextLevelBtn: "🚀 Try the next level",
    goalKeepGoingBtn: "Keep going",
    newQuizBtn: "New Quiz",
    nextQuestionBtn: "Next Question ➡",
    scoreLabel: (c, t) => `Score: ${c} / ${t}`,
    quizNotEnough: (lvl) => `Not enough ${lvl} words for this quiz yet. Try another category or add more words!`,
    quizComplete: (score, total) => `Quiz complete! You scored ${score} / ${total} 🎉`,
    quizSynonymPrompt: (word) => `Which word means the same as "${word}"?`,
    quizHomophonePrompt: (word) => `What does "${word}" mean?`,
    spellingHearBtn: "🔊 Hear the word",
    spellingPlaceholder: "Type what you hear...",
    spellingStartBtn: "▶ Start the first word",
    spellingBackBtn: "🍃 Back",
    spellingNextBtn: "Next 🌿",
    spellingCheckBtn: "Check Answer",
    spellingCorrectPrompt: "✅ Correct! Press Next to continue.",
    spellingCorrectNoCreditPrompt: "✅ Correct! (This one already counted as wrong earlier this round, so it won't add to your score.) Press Next to continue.",
    spellingWrongPrompt: "Please enter the correct spelling to go to the next word",
    spellingEmpty: (lvl) => `No ${lvl} spelling words yet. Add some in "Add Word"!`,
    spellingFinishBtn: "🏁 Finish",
    spellingReportTitle: "📋 Spelling Report",
    spellingReportEmpty: "No mistakes today — great job! 🎉",
    spellingReportRestart: "Practice Again",
    spellingTodayScore: (c, t) => `Today's score: ${c} / ${t}`,
    spellingWrongBadge: "Incorrect",
    wordlistSearchPlaceholder: "🔍 Search words...",
    wordlistEmpty: "No words found for this level yet.",
    wordlistAllLevels: "📚 All levels",
    addToMyDeckBtn: "⭐ Add to my flashcards",
    clearSelectionBtn: "Clear selection",
    selectAllBtn: "☑️ Select All",
    allLabel: "All",
    // Just the "My added words" checkbox on the Add Word page — the Word
    // List page's own select-all checkbox keeps the shorter allLabel above.
    selectAllLabel: "Select All",
    addedToMyDeck: (added, picked) =>
      added === picked
        ? `Added ${added} word${added === 1 ? "" : "s"} to your flashcards.`
        : `Added ${added} of ${picked} — the rest were already in your flashcards.`,
    wordlistCount: (n) => `${n} word${n === 1 ? "" : "s"}`,
    customWordsCount: (n) => `Total ${n} word${n === 1 ? "" : "s"}`,
    wordlistSelectedCount: (n, total) => `${n} word${n === 1 ? "" : "s"} selected / ${t("customWordsCount", total)}`,
    masteryNew: "New",
    masteryPct: (pct) => `${pct}% mastered`,
    addWordManualTitle: "➕ Add a word manually",
    addModeSingle: "Single word",
    addModeBulk: "Multiple words",
    bulkWordsLabel: "Words (one per line, or separated by commas)",
    bulkWordsPlaceholder: "resilient\nmagnificent\ncurious",
    bulkWordsHint: "We'll automatically look up each word's meaning and example, and guess a matching level for it.",
    bulkAddSaveBtn: "Save words",
    bulkNoWords: "Please enter at least one word.",
    bulkAddedStatus: (n) => `Added ${n} word${n === 1 ? "" : "s"}!`,
    bulkAddedWithSkipped: (added, skipped) =>
      `Added ${added} word${added === 1 ? "" : "s"}. Skipped ${skipped} — already in your list.`,
    bulkAddedWithFailures: (saved, failed) =>
      `Saved ${saved} word${saved === 1 ? "" : "s"}, but ${failed} couldn't reach the server — check your connection and try adding them again.`,
    duplicateWordFound: (word) => `"${word}" is already in your word list — use Edit to update it instead.`,
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
    ocrTitle: "📷 Extract words from a photo or files",
    ocrDesc: "Take a photo of a book page, upload a screenshot, or upload a text, Word, PDF or Excel file. We'll read the text and pull out candidate words you can add to your word list — or, for an Excel file, add each row's word straight in with its meaning, example and level already filled in.",
    ocrChooseBtn: "📁 Choose Photo or File",
    ocrExtractBtn: "🔍 Extract",
    ocrNoFileChosen: "No file chosen",
    ocrProgressDefault: "Reading image...",
    ocrProgressReadingFile: "Reading file...",
    ocrProgressStatus: (status, pct) => `${status} (${pct}%)`,
    ocrReviewHintDefault: "Tap the words you'd like to add:",
    ocrSelectAll: "Select All",
    ocrDeselectAll: "Deselect All",
    ocrLevelLabel: "Save selected words as",
    ocrAddBtn: "Add selected words",
    ocrNoTesseract: "The photo-reading tool couldn't load (check your internet connection) and can't be used right now.",
    ocrFailRead: "Sorry, we couldn't read text from that image. Try a clearer, well-lit photo.",
    ocrNoDocReader: "The file-reading tool couldn't load (check your internet connection) and can't be used right now.",
    ocrFailReadFile: "Sorry, we couldn't read text from that file — it may be corrupted, empty, or password-protected.",
    ocrUnsupportedFile: "That file type isn't supported. Please choose a photo, or a .txt, .pdf, .docx or .xlsx file.",
    ocrNoCandidates: "We couldn't find any new candidate words in that image (they may already be in your word list).",
    ocrFoundCandidates: (n) => `Found ${n} candidate words — tap the ones you want to add:`,
    ocrSelectAtLeastOne: "Please select at least one word first.",
    ocrAddingStatus: (n) => `Adding ${n} word(s) — looking up meanings...`,
    ocrAddingProgress: (done, total) => `Looking up meanings... ${done} / ${total}`,
    ocrAddedStatus: (n, lvl) => `Added ${n} word(s) to ${lvl}!`,
    ocrNoDefFound: "(No definition found — tap Edit to add one.)",
    excelReadingStatus: "Reading Excel file...",
    excelNoWordColumn: "Couldn't find a \"Word\" column in that file — please check the column headers and try again.",
    excelNoRows: "That Excel file didn't have any words in it.",
    excelToolUnavailable: "The Excel tool couldn't load (check your internet connection) and can't be used right now.",
    excelOverwriteConfirm: "If this Excel file includes words you already have, overwrite their existing data with what's in the file? (Choose Cancel to only add new words and leave existing ones untouched.)",
    excelImportedStatus: (added, updated, skipped) => {
      const parts = [];
      if (added > 0) parts.push(`added ${added} word${added === 1 ? "" : "s"}`);
      if (updated > 0) parts.push(`updated ${updated} word${updated === 1 ? "" : "s"}`);
      const summary = parts.length > 0 ? `Excel import: ${parts.join(", ")}.` : "Excel import: nothing new.";
      return skipped > 0 ? `${summary} Skipped ${skipped} — already in your list or missing a word.` : summary;
    },
    excelLookingUpMissing: (n) => `Looking up ${n} missing meaning(s)...`,
    exportExcelBtn: "📥 Export",
    exportExcelNoWords: "You don't have any words to export yet.",
    exportExcelDone: (n) => `Exported ${n} word${n === 1 ? "" : "s"} to Excel.`,
    myAddedWordsTitle: "📝 My added words",
    myAddedWordsEmpty: "You haven't added any words yet.",
    customSearchPlaceholder: "🔍 Search added words...",
    sortRecent: "🕒 Newest first",
    sortOldest: "🕒 Oldest first",
    sortAz: "🔤 A → Z",
    sortZa: "🔤 Z → A",
    sortMissing: "⚠️ Incomplete words first",
    deleteSelectedBtn: "🗑️ Delete",
    deleteSelectedConfirm: (n) => `Delete ${n} selected word(s)?`,
    selectIncompleteNoneFound: "Every word here already has a meaning and an example.",
    selectIncompleteDone: (n) => `Selected ${n} word${n === 1 ? "" : "s"} missing a meaning or example.`,
    wordManagementLabel: "🛠️ Word Management",
    sortFilterLabel: "Sort & Filter",
    mergeDuplicatesBtn: "🧹 Merge Duplicates",
    noDuplicatesFound: "No duplicate words found — your list is clean!",
    mergeDuplicatesConfirm: (groups, extra) =>
      `Found ${groups} duplicate word${groups === 1 ? "" : "s"} (${extra} extra ${extra === 1 ? "entry" : "entries"}). Merge them into one entry each?`,
    mergeDuplicatesDone: (groups, removed) =>
      `Merged ${groups} duplicate word${groups === 1 ? "" : "s"} — removed ${removed} extra ${removed === 1 ? "entry" : "entries"}.`,
    cleanTextBtn: "🧼 Clean Corrupted Text",
    cleanTextNoneFound: "No corrupted text found.",
    cleanTextDone: (n) => `Cleaned up ${n} word${n === 1 ? "" : "s"}.`,
    checkKoreanBtn: "🔎 Check Korean Meanings",
    checkKoreanNoneFound: "No bad Korean meanings found.",
    checkKoreanDone: (n) =>
      `Flagged ${n} word${n === 1 ? "" : "s"} with no real Korean meaning — sort by "Missing meaning first" or tap Retry All below.`,
    translationQuotaExceeded: "⚠️ The free translation service has hit its daily limit — please try again tomorrow.",
    changeLevelPlaceholder: "📚 Change level",
    changeLevelConfirm: (n, level) => `Move ${n} selected word(s) to ${level}?`,
    changeLevelDone: (n, level) => `Moved ${n} word(s) to ${level}.`,
    uploadLocalBtn: (n) => `☁️ Upload ${n} to server`,
    uploadLocalConfirm: (n) =>
      `Upload ${n} word(s) saved in this browser to the server, so they show up on every device?`,
    uploadLocalDone: (n) => `Uploaded ${n} word(s) to the server.`,
    uploadLocalFailed: "Could not reach the server. The words are still saved in this browser.",
    storageNoteShared: "Words you add here are saved on the server and show up on every device.",
    storageNotePrivate: "Words you add here are saved to your account and only visible to you.",
    storageNoteVolatile: "Words you add here are kept only in this browser tab — they'll disappear when you close it or leave the site.",
    storageNoteLocal: "Not signed in to the server — words you add are saved in this browser only.",
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
    bulkRetryingMissing: (n) => `Looking up meanings again for ${n} word${n === 1 ? "" : "s"} that didn't get one...`,
    retryResult: (found, total) => (found === total ? `Found meanings for all ${total} word(s)! 🎉` : `Found meanings for ${found} / ${total} word(s).`),
    hintPrefix: (def) => `Hint: ${def}`,
    statWordsPracticed: "Words practised",
    statFlashKnown: "Flashcards known",
    statQuizAccuracy: (c, t) => `Quiz accuracy (${c}/${t})`,
    statSpellAccuracy: (c, t) => `Spelling accuracy (${c}/${t})`,
    statWordsAdded: "Words you've added",
    resetBtn: "Reset all progress",
    resetConfirm: "This will erase all your saved progress. Are you sure?",
    footerText: "Made for Australian primary students. 🇦🇺",
    authHeaderLoginBtn: "🔑 Log In",
    authToggleLoggedOutHint: "Sign in to save your progress",
    authLogoutBtn: "Logout",
    myAccountMenuItem: "🧑 My Account",
    myAccountTitle: "🧑 My Account",
    myAccountChangePasswordTitle: "🔒 Change Password",
    myAccountCurrentPasswordLabel: "Current password",
    myAccountNewPasswordLabel: "New password",
    myAccountPasswordChanged: "Password updated.",
    myAccountChangePasswordBtn: "Update password",
    myAccountWrongCurrentPassword: "That current password isn't right.",
    myAccountUsername: "Username",
    myAccountRole: "Role",
    myAccountJoined: "Joined",
    myAccountUpgraded: "Upgraded to premium",
    authModeLogin: "Log In",
    authModeSignup: "Sign Up",
    authUsernameLabel: "Username",
    authUsernameHint: "3-20 characters: letters, numbers, underscore.",
    authPasswordLabel: "Password",
    authPasswordHint: "At least 8 characters.",
    authCodeLabel: "Special code (optional, for a premium account)",
    authCodeLabelPlain: "Special code",
    authCancelBtn: "Cancel",
    authLoginBtn: "Login",
    authSignupBtn: "Sign Up",
    authLoginErrorText: "Incorrect username or password.",
    authSignupErrorTaken: "That username is already taken.",
    authSignupErrorCode: "That special code isn't valid, or has already been used.",
    authSignupErrorUsername: "Username must be 3-20 characters: letters, numbers, underscore.",
    authSignupErrorPassword: "Password must be at least 8 characters.",
    authSignupErrorGeneric: "Sign up failed — please try again.",
    upgradeTitle: "⭐ Upgrade to Premium",
    upgradeDesc: "General accounts are capped at 100 questions per round. Enter a special code from the admin to unlock more questions and your own private word list.",
    upgradeSubmitBtn: "Upgrade",
    upgradeErrorNotEligible: "This account can't be upgraded from here.",
    anonymousPremiumFeaturePrompt: "Sign up and upgrade to premium to unlock this feature!",
    premiumGateTitle: "🔒 Premium feature",
    premiumGateDesc: "You'll need to sign up and upgrade to premium to use this feature!",
    kidConfirmOkBtn: "🎉 Sign me up!",
    kidConfirmCancelBtn: "Not now",
    challengeYesBtn: "🚀 Let's go!",
    challengeNoBtn: "Not yet",
    gamePausedTitle: "Paused",
    gameResumeBtn: "▶ Resume",
    gameSpeedLabel: "Game speed",
    gameSpeedDecreaseLabel: "Slower",
    gameSpeedIncreaseLabel: "Faster",
    customDeleteOthersBlocked: "You can only delete words you added yourself.",
    roleAdmin: "Admin",
    rolePaid: "Premium",
    roleFree: "General",
  },
  ko: {
    appTitle: "Koala Study Mate",
    appSubtitle: "영어 어휘력, 스펠링, 구구단 실력을 함께 키워보세요!",
    homePitch: "하루 몇 분, 짧고 재미있게 어휘력, 스펠링, 구구단을 키워요.",
    homeAus: "🇰🇷 영어 필수 단어를 공부하는 학생들을 위해 만들었어요",
    homeChooseYear: "학년을 골라요",
    homeStartBtn: "▶ 오늘의 연습 시작",
    missionTitle: "🎯 오늘의 미션",
    missionFlash: (n) => `플래시카드로 ${n}단어 익히기`,
    missionSpelling: (n) => `스펠링 ${n}단어 쓰기`,
    missionQuiz: (n) => `퀴즈 ${n}문제 풀기`,
    missionTT: (n) => `구구단 ${n}문제 연습하기`,
    missionGo: "가기",
    missionDoneMsg: "🎉 미션 완료! 내일 새로운 미션이 기다려요.",
    missionToast: "미션 완료!",
    promoTitle: "📸 아이의 책에서 바로 퀴즈로",
    promoSteps: "책 한 페이지를 찍고 → 어려운 단어를 고르면 → 플래시카드, 스펠링, 퀴즈로 연습해요.",
    promoBtn: "해보기 →",
    homeLearn: "배우기",
    homePlay: "게임",
    homeMine: "내 공부",
    langToggle: "English",
    levelBadgePrefix: "레벨",
    levelOverlayTitle: "📚 레벨을 선택하세요",
    levelOverlayDesc: "학습할 레벨을 선택하세요. 언제든지 바꿀 수 있어요.",
    navFlashcards: "🃏 플래시카드",
    navQuiz: "💡 퀴즈",
    navSpelling: "✏️ 스펠링",
    navTypeGame: "⌨️ 타이핑 게임",
    navTimesTable: "🧮 구구단",
    navWordlist: "📖 단어장",
    navAddword: "➕ 단어 추가",
    navStats: "📊 내 진행상황",
    navHome: "🏠 홈",
    navAdminCodes: "🛠️ 관리자",
    quizSectionTitle: "💡 퀴즈",
    spellingSectionTitle: "✏️ 스펠링",
    flashcardsSectionTitle: "🃏 플래시카드",
    navStudy: "📚 학습",
    navGame: "👾 게임",
    navQuizShort: "퀴즈",
    navTimesTableShort: "구구단",
    navStatsShort: "진행상황",
    spIntroTip1: "단어를 들어봐요 👂",
    spIntroTip2: "들리는 대로 써봐요 ⌨️",
    spIntroTip3: "정답을 확인하고 별을 받아요! ⭐",
    spWhyTitle: "스펠링 연습, 왜 중요할까요?",
    spWhy1: "철자를 알면 글을 더 빨리 읽을 수 있어요.",
    spWhy2: "글씨가 또렷하고 자신감 있게 보여요.",
    spWhy3: "호주 학교 시험(NAPLAN)에도 스펠링이 나와요.",
    spLiveIdle: "듣고 써요!",
    spLiveHear: "쫑긋 👂",
    spLiveOk: "냠냠! 🍃",
    spLiveFull: "배불러서 행복해요! 🥰",
    kbIdle: "가자! 🍃",
    kbYum: "냠냠! 🍃",
    kbOops: "앗! 😮",
    kbOver: "잘했어요! 🐨",
    spLiveNo: "다시 해봐요 💪",
    spLiveNext: "다음! 🍃",
    spLivePrev: "다시 보기 👀",
    spProgressLabel: (i, n) => `${n}단어 중 ${i}번째`,
    fkIdle: "카드를 눌러 뒤집어요!",
    fkFlip: "짜잔! ✨",
    fkNext: "다음 단어! 🍃",
    fkPrev: "다시 볼까요? 👀",
    fkKnow: "잘했어요! 🌟",
    fkDunno: "같이 연습해요! 💪",
    installAppBtn: "📲 앱 설치하기",
    installSheetTitle: "코알라 스터디 메이트를 홈 화면에 추가하세요",
    installSheetSub: "무료 • 안전 • 광고 없음",
    installPerk1: "⚡ 한 번 터치로 전체 화면 실행",
    installPerk2: "📴 오프라인에서도 플래시카드·게임 가능",
    installPerk3: "🏅 코알라 배지를 항상 가까이",
    installSheetOk: "설치하기",
    installSheetLater: "나중에",
    offlineBanner: "📴 오프라인이에요 — 플래시카드, 단어 목록, 게임은 계속 쓸 수 있어요.",
    statsTabOverview: "📊 요약",
    statsTabBadges: "🏅 배지",
    statsTabWrong: "📕 오답 노트",
    navAddwordShort: "단어 추가",
    navHomeShort: "홈",
    navStudyShort: "학습",
    navGameShort: "게임",
    landingDescStats: "지금까지의 학습 진행상황 보기",
    landingDescAddword: "나만의 단어 목록 만들기",
    landingDescQuiz: "단어 하나하나 테스트해보기",
    landingDescTimesTable: "구구단 연습하기",
    landingDescSpelling: "기억으로 단어 철자 쓰기",
    landingDescTypeGame: "떨어지는 단어 받아치기",
    landingDescFlashcards: "카드 넘기며 복습하기",
    landingDescWordlist: "가지고 있는 모든 단어 보기",
    statsInsightsTitle: "✨ 프리미엄 인사이트",
    statsInsightsBullet1: "📧 주간 학습 리포트 이메일",
    statsInsightsBullet2: "🎯 카테고리별 정확도 분석",
    statsInsightsBullet3: "👨‍👩‍👧‍👦 여러 자녀 계정 함께 관리",
    adminCodesTitle: "🎟️ 프리미엄 가입 코드",
    adminCodesDesc: "1회용 코드를 생성해서 전달하면, 받은 사람이 일반 대신 프리미엄 계정으로 가입할 수 있어요.",
    adminCodesGenerateBtn: "🎲 새 코드 생성",
    adminCodesEmpty: "아직 생성된 코드가 없어요.",
    adminCodesCount: (n) => `코드 ${n}개`,
    adminCodeUsedBy: (username) => `${username}님이 사용함`,
    adminCodeUnused: "아직 사용 안 됨",
    adminCodeCopyBtn: "복사",
    adminCodeCopiedBtn: "복사됨!",
    adminCodeGenerateFailed: "코드를 생성하지 못했어요 — 다시 시도해주세요.",
    adminCodeDeleteBtn: "삭제",
    adminCodeConfirmDelete: (code) => `코드 ${code}를 삭제할까요? 되돌릴 수 없어요.`,
    adminCodesSortLabel: "정렬",
    adminCodesSortNewest: "최신순",
    adminCodesSortUnused: "미사용 우선",
    adminCodesSortUsed: "사용됨 우선",
    adminRequestApproveBtn: "✅ 승인",
    adminRequestDismissBtn: "거절",
    adminRequestActionFailed: "처리하지 못했어요 — 다시 시도해주세요.",
    adminUsersTitle: "🧑‍🤝‍🧑 사용자 계정",
    adminUsersDesc: "계정을 검색하고 역할이나 비밀번호를 변경하거나, 업그레이드 요청을 승인할 수 있어요 — 요청 대기 중인 사용자는 맨 위에 고정돼요.",
    adminUsersSearchPlaceholder: "사용자명으로 검색",
    adminUsersSortLabel: "정렬",
    adminUsersSortJoined: "가입일",
    adminUsersSortAz: "사용자명 (A→Z)",
    adminUsersSortRole: "역할",
    adminUsersCount: (n) => `계정 ${n}개`,
    adminUsersEmpty: "계정을 찾을 수 없어요.",
    adminUserCreatedAt: (when) => `가입일: ${when}`,
    adminUserUpgradedAt: (when) => `업그레이드: ${when}`,
    adminUserPendingRequest: "⏳ 업그레이드 요청됨",
    adminUserYou: "(나)",
    adminUserApplyRoleBtn: "적용",
    adminUserConfirmRoleChange: (username, role) => `${username}님의 역할을 ${role}(으)로 변경할까요?`,
    adminUserResetPasswordBtn: "비밀번호 재설정",
    adminUserResetPasswordPrompt: (username) => `${username}님의 새 비밀번호 (최소 8자):`,
    adminUserResetPasswordDone: (username) => `${username}님의 비밀번호를 재설정했어요.`,
    adminUserDeleteBtn: "계정 삭제",
    adminUserConfirmDelete: (username) => `${username}님의 계정을 영구적으로 삭제할까요? 그 계정의 개인 단어도 함께 삭제되고, 되돌릴 수 없어요.`,
    adminRole_free: "일반",
    adminRole_paid: "프리미엄",
    adminRole_admin: "관리자",
    upgradeNoCodeHint: "아직 코드가 없으신가요?",
    upgradeRequestBtn: "📨 관리자에게 업그레이드 요청하기",
    upgradeRequestFailed: "요청을 보내지 못했어요 — 다시 시도해주세요.",
    upgradeRequestPendingMsg: "요청을 보냈어요. 관리자 승인을 기다리는 중이에요. 나중에 다시 확인해주세요.",
    upgradeRequestFulfilledMsg: "관리자가 코드를 보냈어요 — 아래에 입력해서 활성화를 완료하세요.",
    upgradeReadyBanner: "⭐ 업그레이드 코드가 도착했어요 — 눌러서 입력하세요!",
    typeGameTitle: "⌨️ 타이핑 게임",
    typeGameDesc: "단어가 바닥에 닿기 전에 타이핑하세요!",
    typeGameStartBtn: "▶ 게임 시작",
    typeGameNotEnough: (lvl) => `${lvl} 레벨에 단어가 조금 더 필요해요 — 단어 추가나 단어장에서 먼저 추가해주세요!`,
    typeGameHint: "그냥 타이핑을 시작하세요 — 일치하는 단어가 자동으로 선택돼요. Enter를 누르면 입력을 확인해요.",
    typeGameTypoMsg: "❌ 일치하는 단어가 없어요 — 다시 시도해보세요!",
    typeGameMute: "음악 끄기",
    typeGameUnmute: "음악 켜기",
    typeGameInputPlaceholder: "여기에 입력하세요...",
    typeGameScoreLabel: (score) => `점수: ${score}`,
    typeGameOverTitle: "💥 게임 종료",
    typeGameFinalScore: (score) => `최종 점수: ${score}`,
    typeGameHighScore: (score) => `최고 점수: ${score}`,
    typeGameNewHighScore: "🎉 최고 기록 달성!",
    typeGameRestartBtn: "다시 하기",
    typeGamePauseLabel: "일시정지",
    typeGameEndLabel: "게임 종료",
    typeGameExpand: "화면 확장",
    typeGameCollapse: "화면 축소",
    typeGameStageLabel: (n) => `스테이지 ${n}`,
    typeGameLevelChallengePrompt: (level) => `${level}에 도전하시겠습니까?`,
    timesTableTitle: "🧮 구구단",
    timesTableDesc: "식 전체를 타이핑하세요 — 8 × 2라면 \"8 2 16\"처럼 — 바닥에 닿기 전에!",
    timesTableDemoCaption: "두 수와 정답을 차례로 입력하세요.",
    timesTableDemoCaption2: "띄어쓰기는 자유예요!",
    timesTableInstrLine1: "문제가 {{EX}} 일 때 정답 입력 방법",
    timesTableInstrLine2: "{{FMT}} 셋 중 하나를 입력",
    timesTableMaxTableLabel: "연습할 단 고르기",
    timesTableHowTitle: "💡 이렇게 답해요",
    timesTableOne: (n) => `${n}단`,
    timesTableMany: (n) => `${n}개 단`,
    timesTableQuickDefault: "기본 2~9단",
    timesTableQuickAll: "전체 2~20단",
    timesTableStartBtn: "▶ 게임 시작",
    timesTableHint: "문제가 8 × 2 일 때 정답 입력 방법: 8216 / 82 16 / 8 2 16 셋 중 하나를 입력 — 계속 입력하면 돼요, Enter는 필요 없어요.",
    timesTableTypoMsg: "❌ 일치하는 식이 없어요 — 다시 시도해보세요!",
    timesTableMute: "음악 끄기",
    timesTableUnmute: "음악 켜기",
    timesTableInputPlaceholder: "여기에 입력하세요...",
    timesTableScoreLabel: (score) => `점수: ${score}`,
    timesTableOverTitle: "💥 게임 종료",
    timesTableFinalScore: (score) => `최종 점수: ${score}`,
    timesTableHighScore: (score) => `최고 점수: ${score}`,
    timesTableNewHighScore: "🎉 최고 기록 달성!",
    timesTableRestartBtn: "다시 하기",
    timesTableLimitReachedAnonymous: "비회원은 50문제까지 풀 수 있어요 — 가입하면(무료예요!) 계속 할 수 있어요.",
    timesTableLimitReachedFree: "일반 계정은 100문제까지 풀 수 있어요 — 프리미엄으로 업그레이드하면 무제한으로 할 수 있어요.",
    timesTablePauseLabel: "일시정지",
    timesTableEndLabel: "게임 종료",
    timesTableExpand: "화면 확장",
    timesTableCollapse: "화면 축소",
    timesTableStageLabel: (n) => `스테이지 ${n}`,
    timesTableChallengePrompt: (table) => `${table}단에 도전하시겠습니까?`,
    categoryLabel: "카테고리",
    optVocabulary: "어휘",
    optSynonyms: "동의어",
    optAntonyms: "반의어",
    optHomophones: "동음이의어",
    flashFrontModeLabel: "플래시카드 앞면",
    flashSourceLabel: "플래시카드 출처",
    flashSourceAuto: "🎲 레벨 단어",
    flashSourceMine: "⭐ 나만의 카드",
    myDeckTitle: "⭐ 나만의 플래시카드",
    myDeckAddBtn: "내 카드에 추가",
    myDeckModeManual: "✏️ 직접 추가",
    myDeckModeBulk: "📋 여러 단어",
    myDeckModeSearch: "🔍 검색해서 추가",
    myDeckBulkHint: "각 단어의 뜻과 예문을 자동으로 찾아드려요.",
    myDeckSearchPlaceholder: "🔍 단어장에서 검색...",
    myDeckSearchHint: "입력하면 현재 단어장의 모든 레벨에서 찾아드려요.",
    myDeckSearchNone: "일치하는 단어가 없어요.",
    myDeckSearchCount: (n) => `${n}개 검색됨 — ⭐를 눌러 추가하세요`,
    myDeckInDeck: "내 카드에 있음",
    myDeckAddOne: "⭐ 추가",
    myDeckClearBtn: "🗑️ 전체 삭제",
    myDeckClearConfirm: (n) => `내 카드 ${n}개를 모두 지울까요?`,
    myDeckEmpty: "아직 나만의 카드가 없어요 — 위에서 추가하거나 단어장 탭에서 골라보세요.",
    myDeckEmptyCard: "카드가 없어요",
    myDeckEmptyHint: "아래에서 단어를 추가하거나 단어장 탭에서 골라보세요.",
    myDeckAdded: (n) => `카드 ${n}개를 추가했어요.`,
    myDeckDuplicate: "이미 내 카드에 있는 단어예요.",
    flashFrontWord: "🔤 단어",
    flashFrontMeaning: "💡 뜻",
    hearItLabel: "들어보기",
    backLabel: "이전",
    nextLabel: "다음",
    flashHint: "카드를 탭하면 뒤집혀요 • 뜻이나 예문을 탭하면 소리로 들을 수 있어요",
    flashStillLearning: "😕 아직 어려워요",
    flashKnowIt: "😀 알고 있어요!",
    flashEmptyWord: "단어가 없어요",
    flashEmptyDef: (lvl) => `먼저 ${lvl} 단어를 추가해주세요!`,
    goalLabel: "문제수",
    goalDecreaseLabel: "문제 수 줄이기",
    goalIncreaseLabel: "문제 수 늘리기",
    anonymousQuestionCapPrompt: "더 많은 문제와 모든 기능을 사용하려면 무료로 가입해보세요!",
    goalReached: (score, level) => `🎉 ${score}개 정답 — ${level} 목표를 달성했어요!`,
    goalReachedTop: (score, level) => `🎉 ${level}에서 ${score}개 정답 — 가장 높은 레벨이에요. 정말 잘했어요!`,
    goalNextLevelBtn: "🚀 다음 레벨 도전",
    goalKeepGoingBtn: "계속하기",
    newQuizBtn: "새 퀴즈",
    nextQuestionBtn: "다음 문제 ➡",
    scoreLabel: (c, t) => `점수: ${c} / ${t}`,
    quizNotEnough: (lvl) => `${lvl} 레벨에는 아직 퀴즈를 만들 단어가 부족해요. 다른 카테고리를 선택하거나 단어를 더 추가해보세요!`,
    quizComplete: (score, total) => `퀴즈 완료! ${score} / ${total}점 🎉`,
    quizSynonymPrompt: (word) => `"${word}"와 뜻이 같은 단어는 무엇일까요?`,
    quizHomophonePrompt: (word) => `"${word}"의 뜻은 무엇일까요?`,
    spellingHearBtn: "🔊 단어 듣기",
    spellingPlaceholder: "들리는 대로 입력하세요...",
    spellingStartBtn: "▶ 첫 단어 시작하기",
    spellingBackBtn: "🍃 이전",
    spellingNextBtn: "다음 🌿",
    spellingCheckBtn: "정답 확인",
    spellingCorrectPrompt: "✅ 정답이에요! Next를 눌러 다음 단어로 넘어가세요.",
    spellingCorrectNoCreditPrompt: "✅ 정답이에요! (이 단어는 이번 라운드에서 이미 한 번 틀려서 점수에는 반영되지 않아요.) Next를 눌러 다음 단어로 넘어가세요.",
    spellingWrongPrompt: "정확한 철자를 입력해야 다음 단어로 넘어갈 수 있어요.",
    spellingEmpty: (lvl) => `${lvl} 레벨에는 아직 스펠링 연습 단어가 없어요. "단어 추가"에서 추가해보세요!`,
    spellingFinishBtn: "🏁 종료",
    spellingReportTitle: "📋 스펠링 리포트",
    spellingReportEmpty: "오늘은 틀린 단어가 없어요 — 정말 잘했어요! 🎉",
    spellingReportRestart: "다시 연습하기",
    spellingTodayScore: (c, t) => `오늘의 점수: ${c} / ${t}`,
    spellingWrongBadge: "틀린문제",
    wordlistSearchPlaceholder: "🔍 단어 검색...",
    wordlistEmpty: "이 레벨에는 아직 단어가 없어요.",
    wordlistAllLevels: "📚 전체 레벨",
    addToMyDeckBtn: "⭐ 내 플래시카드에 추가",
    clearSelectionBtn: "선택 해제",
    selectAllBtn: "☑️ 전체 선택",
    allLabel: "전체",
    selectAllLabel: "전체 선택",
    addedToMyDeck: (added, picked) =>
      added === picked
        ? `${added}개를 내 플래시카드에 추가했어요.`
        : `${picked}개 중 ${added}개를 추가했어요 — 나머지는 이미 들어있어요.`,
    wordlistCount: (n) => `단어 ${n}개`,
    customWordsCount: (n) => `총 ${n}개 단어`,
    wordlistSelectedCount: (n, total) => `${n}개 선택됨 / ${t("customWordsCount", total)}`,
    masteryNew: "신규",
    masteryPct: (pct) => `${pct}% 숙달`,
    addWordManualTitle: "➕ 단어 직접 추가하기",
    addModeSingle: "개별 단어 추가",
    addModeBulk: "여러 단어 추가",
    bulkWordsLabel: "단어들 (한 줄에 하나씩, 또는 쉼표로 구분)",
    bulkWordsPlaceholder: "resilient\nmagnificent\ncurious",
    bulkWordsHint: "각 단어의 뜻과 예문을 자동으로 찾아드리고, 알맞은 레벨도 자동으로 추정해드려요.",
    bulkAddSaveBtn: "단어 저장하기",
    bulkNoWords: "단어를 최소 1개 이상 입력해주세요.",
    bulkAddedStatus: (n) => `${n}개의 단어를 추가했어요!`,
    bulkAddedWithSkipped: (added, skipped) => `${added}개의 단어를 추가했어요. ${skipped}개는 이미 있어서 건너뛰었어요.`,
    bulkAddedWithFailures: (saved, failed) =>
      `${saved}개는 저장했지만 ${failed}개는 서버에 저장하지 못했어요 — 인터넷 연결을 확인하고 다시 추가해주세요.`,
    duplicateWordFound: (word) => `"${word}"은(는) 이미 내 단어 목록에 있어요 — 수정하려면 Edit을 눌러주세요.`,
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
    ocrTitle: "📷 사진 또는 파일에서 단어 추출하기",
    ocrDesc: "책 페이지를 촬영하거나 온라인 지문을 캡처한 이미지, 또는 텍스트·Word·PDF·엑셀 파일을 올려보세요. 텍스트를 읽어서 단어장에 추가할 후보 단어를 찾아드려요 — 엑셀 파일의 경우, 각 행의 단어를 뜻·예문·레벨까지 그대로 채워서 바로 추가해드려요.",
    ocrChooseBtn: "📁 사진 또는 파일 선택하기",
    ocrExtractBtn: "🔍 추출하기",
    ocrNoFileChosen: "선택된 파일 없음",
    ocrProgressDefault: "이미지를 읽는 중...",
    ocrProgressReadingFile: "파일을 읽는 중...",
    ocrProgressStatus: (status, pct) => `${status} (${pct}%)`,
    ocrReviewHintDefault: "추가하고 싶은 단어를 탭하세요:",
    ocrSelectAll: "전체 선택",
    ocrDeselectAll: "전체 해제",
    ocrLevelLabel: "선택한 단어를 저장할 레벨",
    ocrAddBtn: "선택한 단어 추가하기",
    ocrNoTesseract: "사진 읽기 기능을 불러오지 못했어요 (인터넷 연결을 확인해주세요). 지금은 사용할 수 없어요.",
    ocrFailRead: "이미지에서 글자를 읽지 못했어요. 더 선명하고 밝은 사진으로 다시 시도해보세요.",
    ocrNoDocReader: "파일 읽기 기능을 불러오지 못했어요 (인터넷 연결을 확인해주세요). 지금은 사용할 수 없어요.",
    ocrFailReadFile: "그 파일에서 텍스트를 읽지 못했어요 — 파일이 손상되었거나, 비어 있거나, 암호로 보호되어 있을 수 있어요.",
    ocrUnsupportedFile: "지원하지 않는 파일 형식이에요. 사진 또는 .txt, .pdf, .docx, .xlsx 파일을 선택해주세요.",
    ocrNoCandidates: "이 이미지에서 새로운 후보 단어를 찾지 못했어요 (이미 단어장에 있는 단어일 수 있어요).",
    ocrFoundCandidates: (n) => `${n}개의 후보 단어를 찾았어요 — 추가하고 싶은 단어를 탭하세요:`,
    ocrSelectAtLeastOne: "먼저 단어를 하나 이상 선택해주세요.",
    ocrAddingStatus: (n) => `${n}개의 단어를 추가하는 중 — 의미를 찾고 있어요...`,
    ocrAddingProgress: (done, total) => `의미를 찾는 중... ${done} / ${total}`,
    ocrAddedStatus: (n, lvl) => `${lvl}에 ${n}개의 단어를 추가했어요!`,
    ocrNoDefFound: "(뜻을 찾지 못했어요 — Edit 버튼으로 직접 입력해주세요.)",
    excelReadingStatus: "엑셀 파일을 읽는 중...",
    excelNoWordColumn: "파일에서 \"Word\" 열을 찾을 수 없어요 — 열 제목을 확인하고 다시 시도해주세요.",
    excelNoRows: "그 엑셀 파일에 단어가 없어요.",
    excelToolUnavailable: "엑셀 처리 기능을 불러오지 못했어요 (인터넷 연결을 확인해주세요). 지금은 사용할 수 없어요.",
    excelOverwriteConfirm: "이 엑셀 파일에 이미 있는 단어가 포함되어 있다면, 파일 내용으로 기존 정보를 덮어쓸까요? (취소를 누르면 새 단어만 추가되고 기존 단어는 그대로 유지돼요.)",
    excelImportedStatus: (added, updated, skipped) => {
      const parts = [];
      if (added > 0) parts.push(`${added}개 추가`);
      if (updated > 0) parts.push(`${updated}개 수정`);
      const summary = parts.length > 0 ? `엑셀 가져오기: ${parts.join(", ")}.` : "엑셀 가져오기: 새로운 내용이 없어요.";
      return skipped > 0 ? `${summary} ${skipped}개는 건너뛰었어요 — 이미 있거나 단어 칸이 비어 있어요.` : summary;
    },
    excelLookingUpMissing: (n) => `${n}개의 빠진 의미를 찾는 중...`,
    exportExcelBtn: "📥 내보내기",
    exportExcelNoWords: "아직 내보낼 단어가 없어요.",
    exportExcelDone: (n) => `단어 ${n}개를 엑셀로 내보냈어요.`,
    myAddedWordsTitle: "📝 내가 추가한 단어",
    myAddedWordsEmpty: "아직 추가한 단어가 없어요.",
    customSearchPlaceholder: "🔍 추가한 단어 검색...",
    sortRecent: "🕒 최근 추가순",
    sortOldest: "🕒 오래된 순",
    sortAz: "🔤 ㄱ/A → Z",
    sortZa: "🔤 Z → A/ㄱ",
    sortMissing: "⚠️ 미완성 단어 먼저",
    deleteSelectedBtn: "🗑️ 삭제",
    deleteSelectedConfirm: (n) => `선택한 단어 ${n}개를 삭제할까요?`,
    selectIncompleteNoneFound: "모든 단어에 뜻과 예문이 있어요.",
    selectIncompleteDone: (n) => `뜻이나 예문이 빠진 단어 ${n}개를 선택했어요.`,
    wordManagementLabel: "🛠️ 단어 관리",
    sortFilterLabel: "정렬 및 필터",
    mergeDuplicatesBtn: "🧹 중복 단어 정리",
    noDuplicatesFound: "중복된 단어가 없어요 — 목록이 깨끗해요!",
    mergeDuplicatesConfirm: (groups, extra) => `중복된 단어 ${groups}개(여분 ${extra}개)를 찾았어요. 각각 하나로 합칠까요?`,
    mergeDuplicatesDone: (groups, removed) => `중복 단어 ${groups}개를 하나로 합치고, 여분 항목 ${removed}개를 삭제했어요.`,
    cleanTextBtn: "🧼 손상된 텍스트 정리",
    cleanTextNoneFound: "손상된 텍스트를 찾지 못했어요.",
    cleanTextDone: (n) => `${n}개 단어를 정리했어요.`,
    checkKoreanBtn: "🔎 한국어 뜻 검사",
    checkKoreanNoneFound: "잘못된 한국어 뜻을 찾지 못했어요.",
    checkKoreanDone: (n) => `제대로 된 한국어 뜻이 없는 단어 ${n}개를 찾았어요 — '뜻 없는 단어 먼저'로 정렬하거나 아래 전체 재검색을 눌러보세요.`,
    translationQuotaExceeded: "⚠️ 무료 번역 서비스의 하루 사용 한도를 초과했어요 — 내일 다시 시도해주세요.",
    changeLevelPlaceholder: "📚 레벨 변경",
    changeLevelConfirm: (n, level) => `선택한 단어 ${n}개를 ${level} 레벨로 옮길까요?`,
    changeLevelDone: (n, level) => `${n}개를 ${level} 레벨로 옮겼어요.`,
    uploadLocalBtn: (n) => `☁️ ${n}개 서버로 올리기`,
    uploadLocalConfirm: (n) => `이 브라우저에 저장된 단어 ${n}개를 서버로 올릴까요? 모든 기기에서 보이게 됩니다.`,
    uploadLocalDone: (n) => `${n}개를 서버로 올렸어요.`,
    uploadLocalFailed: "서버에 연결하지 못했어요. 단어는 이 브라우저에 그대로 있어요.",
    storageNoteShared: "여기서 추가한 단어는 서버에 저장되어 모든 기기에서 보여요.",
    storageNotePrivate: "여기서 추가한 단어는 내 계정에 저장되고 나에게만 보여요.",
    storageNoteVolatile: "여기서 추가한 단어는 이 브라우저 탭에만 보관돼요 — 탭을 닫거나 사이트를 나가면 사라져요.",
    storageNoteLocal: "서버에 로그인되지 않아, 추가한 단어가 이 브라우저에만 저장돼요.",
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
    bulkRetryingMissing: (n) => `뜻을 찾지 못한 ${n}개 단어를 다시 검색하는 중...`,
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
    authHeaderLoginBtn: "🔑 로그인",
    authToggleLoggedOutHint: "로그인하면 학습 진행 상황이 저장돼요",
    authLogoutBtn: "로그아웃",
    myAccountMenuItem: "🧑 내 계정",
    myAccountTitle: "🧑 내 계정",
    myAccountChangePasswordTitle: "🔒 비밀번호 변경",
    myAccountCurrentPasswordLabel: "현재 비밀번호",
    myAccountNewPasswordLabel: "새 비밀번호",
    myAccountPasswordChanged: "비밀번호가 변경됐어요.",
    myAccountChangePasswordBtn: "비밀번호 변경",
    myAccountWrongCurrentPassword: "현재 비밀번호가 올바르지 않아요.",
    myAccountUsername: "아이디",
    myAccountRole: "역할",
    myAccountJoined: "가입일",
    myAccountUpgraded: "프리미엄 업그레이드일",
    authModeLogin: "로그인",
    authModeSignup: "회원가입",
    authUsernameLabel: "아이디",
    authUsernameHint: "3~20자: 영문, 숫자, 밑줄(_)만 가능해요.",
    authPasswordLabel: "비밀번호",
    authPasswordHint: "8자 이상 입력해주세요.",
    authCodeLabel: "특별 코드 (선택, 프리미엄 계정 가입 시 입력)",
    authCodeLabelPlain: "특별 코드",
    authCancelBtn: "취소",
    authLoginBtn: "로그인",
    authSignupBtn: "회원가입",
    authLoginErrorText: "아이디 또는 비밀번호가 올바르지 않아요.",
    authSignupErrorTaken: "이미 사용 중인 아이디예요.",
    authSignupErrorCode: "특별 코드가 올바르지 않거나 이미 사용됐어요.",
    authSignupErrorUsername: "아이디는 3~20자의 영문/숫자/밑줄(_)만 가능해요.",
    authSignupErrorPassword: "비밀번호는 8자 이상이어야 해요.",
    authSignupErrorGeneric: "회원가입에 실패했어요 — 다시 시도해주세요.",
    upgradeTitle: "⭐ 프리미엄으로 업그레이드",
    upgradeDesc: "일반 계정은 한 라운드에 최대 100문제까지만 가능해요. admin에게 받은 특별 코드를 입력하면 더 많은 문제와 나만의 단어장을 사용할 수 있어요.",
    upgradeSubmitBtn: "업그레이드",
    upgradeErrorNotEligible: "이 계정은 여기서 업그레이드할 수 없어요.",
    anonymousPremiumFeaturePrompt: "이 기능을 사용하려면 가입 후 프리미엄으로 업그레이드해야 해요!",
    premiumGateTitle: "🔒 프리미엄 전용 기능",
    premiumGateDesc: "이 기능을 사용하시려면 가입 후 프리미엄 회원으로 업그레이드 하셔야 해요!",
    kidConfirmOkBtn: "🎉 가입할래요!",
    kidConfirmCancelBtn: "다음에요",
    challengeYesBtn: "🚀 도전할래요!",
    challengeNoBtn: "다음에요",
    gamePausedTitle: "일시정지",
    gameResumeBtn: "▶ 계속하기",
    gameSpeedLabel: "게임 속도",
    gameSpeedDecreaseLabel: "느리게",
    gameSpeedIncreaseLabel: "빠르게",
    customDeleteOthersBlocked: "본인이 추가한 단어만 삭제 가능합니다.",
    roleAdmin: "관리자",
    rolePaid: "프리미엄",
    roleFree: "일반",
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
  en: { levels: LEVELS, bank: WORD_BANK, hasSynonyms: true, hasHomophones: true, speechLang: "en-AU" },
  ko: { levels: _KO_LEVELS, bank: _WORD_BANK_KO, hasSynonyms: false, hasHomophones: false, speechLang: "en-US" },
};

function currentSystem() {
  return SYSTEMS[currentLang];
}

/* ================= STORAGE ================= */
function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Older saves predate the daily-streak feature — backfill so the rest
      // of the app can always assume progress.streak exists.
      if (!parsed.streak) parsed.streak = { count: 0, lastDay: null };
      return parsed;
    }
  } catch (e) {
    console.warn("Could not read saved progress", e);
  }
  return {
    wordStats: {}, // word -> { correct, incorrect }
    flashKnown: {}, // word -> true
    quiz: { correct: 0, total: 0 },
    spelling: { correct: 0, total: 0 },
    spellingStatus: {}, // word -> "wrong" | "correct" — persists so wrong words are re-served first next time
    srs: {}, // word (lowercase) -> { box: 0-4, dueAt: timestamp } — spaced-repetition schedule, see recordSrsResult()
    typeGameLevelChallengeShown: {}, // levelId -> true, see maybeOfferTypeGameLevelChallenge()
    timesTableChallengeShown: {}, // "{lang}_{maxTable}" -> true, see maybeOfferTimesTableChallenge()
    streak: { count: 0, lastDay: null }, // daily practice streak, see bumpDailyStreak()
    updatedAt: 0,
  };
}

// ---- Daily practice streak ----
// A simple "did you practice at all today" counter, independent of score or
// mode: any correct/incorrect answer through recordResult() counts. Counts up
// once per calendar day (local time); a missed day resets it to 1 on the next
// practice instead of continuing to climb.
function localDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function bumpDailyStreak() {
  if (!progress.streak) progress.streak = { count: 0, lastDay: null };
  const today = localDateKey(new Date());
  if (progress.streak.lastDay === today) return false; // already counted today
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const wasYesterday = progress.streak.lastDay === localDateKey(yesterday);
  progress.streak.count = wasYesterday ? progress.streak.count + 1 : 1;
  progress.streak.lastDay = today;
  return true; // streak count changed just now
}

function renderStreakChip() {
  if (!streakCountEl) return;
  streakCountEl.textContent = String((progress.streak && progress.streak.count) || 0);
}

function saveProgress() {
  progress.updatedAt = Date.now();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    console.warn("Could not save progress", e);
  }
  // Admin/paid accounts also keep a server copy so this survives logging out
  // and back in (or switching devices) — free/anonymous stays local-only.
  if (canWriteServerWords()) scheduleProgressSync();
}

function recordResult(word, isCorrect, mode) {
  const stats = progress.wordStats[word] || { correct: 0, incorrect: 0 };
  if (isCorrect) stats.correct++;
  else stats.incorrect++;
  progress.wordStats[word] = stats;
  const streakChanged = bumpDailyStreak();
  trackActivity(word, isCorrect, mode);
  saveProgress();
  renderStreakChip();
  if (typeof checkMissionComplete === "function") checkMissionComplete();
  if (streakChanged && streakChipEl) pulseScoreTag(streakChipEl, "stat-chip-pulse");
}

// A Leitner-box-style spaced-repetition schedule, shared across Quiz,
// Spelling and Typing Game (keyed by the word alone, lowercase — level and
// language aren't part of the key, matching how a word's identity works
// everywhere else in the app). Correct answers push a word further out
// (longer until it's due again); any wrong answer drops it straight back to
// the shortest interval. This is deliberately separate from
// progress.spellingStatus/progress.wordStats — those are untouched and keep
// driving whatever they already drove (mastery badges, etc.) — this is a new
// signal purely for deciding what to show next (see pickWordsForSession).
const SRS_INTERVALS_MS = [0, 1, 3, 7, 14].map((days) => days * 24 * 60 * 60 * 1000);
const SRS_MAX_BOX = SRS_INTERVALS_MS.length - 1;

function recordSrsResult(word, isCorrect) {
  const key = word.toLowerCase();
  const entry = progress.srs[key] || { box: 0, dueAt: 0 };
  entry.box = isCorrect ? Math.min(entry.box + 1, SRS_MAX_BOX) : 0;
  entry.dueAt = Date.now() + SRS_INTERVALS_MS[entry.box];
  progress.srs[key] = entry;
  saveProgress();
}

// Orders a pool for one practice round: words overdue for review first
// (most-overdue first), then words never seen before, then words not due
// yet — capped to `count`. `keyFn` extracts the word string from a pool item
// (Spelling/Typing Game items already have a `.word` field; Quiz's question
// objects use `.target` instead, so they pass their own keyFn).
function pickWordsForSession(pool, count, keyFn = (item) => (typeof item === "string" ? item : item.word)) {
  const now = Date.now();
  const overdue = [];
  const brandNew = [];
  const notDue = [];
  pool.forEach((item) => {
    const entry = progress.srs[keyFn(item).toLowerCase()];
    if (!entry) brandNew.push(item);
    else if (entry.dueAt <= now) overdue.push(item);
    else notDue.push(item);
  });
  overdue.sort((a, b) => progress.srs[keyFn(a).toLowerCase()].dueAt - progress.srs[keyFn(b).toLowerCase()].dueAt);
  return [...overdue, ...shuffle(brandNew), ...shuffle(notDue)].slice(0, count);
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

// Words the admin adds live on the server so every device sees them; they're
// marked `remote` and kept in a local cache purely so the app still works
// offline or while the API is unreachable. Words without that mark belong to
// this browser alone, as before.
function loadSharedWordsCache() {
  try {
    const raw = localStorage.getItem(SHARED_WORDS_CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Could not read cached shared words", e);
  }
  return [];
}

function saveCustomWords() {
  try {
    // A free account's words are deliberately volatile — they must never
    // reach localStorage, so they vanish the moment the tab or site closes.
    localStorage.setItem(CUSTOM_WORDS_KEY, JSON.stringify(customWords.filter((w) => !w.remote && !w.volatile)));
    localStorage.setItem(SHARED_WORDS_CACHE_KEY, JSON.stringify(customWords.filter((w) => w.remote)));
  } catch (e) {
    console.warn("Could not save custom words", e);
  }
}

// A custom (user-added) word stores its meaning and level separately per
// language track (definitionEn/definitionKo, levelEn/levelKo, noDefinitionEn/
// noDefinitionKo) so a word added while viewing one track still shows the
// right meaning and level when viewed from the other track. `example` is a
// single English sentence shared by both tracks (matching how the built-in
// word banks work). These helpers look up the field for a given language;
// the cw*-prefixed ones default to whichever language is currently active.
function defKey(lang) {
  return lang === "ko" ? "definitionKo" : "definitionEn";
}
function levelKey(lang) {
  return lang === "ko" ? "levelKo" : "levelEn";
}
function noDefKey(lang) {
  return lang === "ko" ? "noDefinitionKo" : "noDefinitionEn";
}
function otherLang(lang) {
  return lang === "ko" ? "en" : "ko";
}
function cwDefinition(w, lang) {
  return w[defKey(lang || currentLang)];
}
function cwLevel(w, lang) {
  return w[levelKey(lang || currentLang)];
}
function cwNoDefinition(w, lang) {
  return !!w[noDefKey(lang || currentLang)];
}

// A meaning that just echoes the word back ("describe" -> "describe") explains
// nothing, and neither does a lone word where a definition belongs
// ("position" -> "Occupation"). Both are what filling a missing English
// definition by translating the Korean meaning back produced while
// dictionaryapi.dev was down. A single word is fine as a Korean gloss though,
// so only the English side is held to being a phrase.
function isUselessMeaning(word, meaning, requirePhrase) {
  if (!meaning) return false;
  const text = meaning.trim();
  if (!text) return false;
  if (text.toLowerCase() === word.toLowerCase()) return true;
  return requirePhrase && !/\s/.test(text);
}

function hasHangul(text) {
  return /[가-힣]/.test(text || "");
}

// A "Korean meaning" with no Korean characters in it at all (the free
// translation API sometimes echoes English text back, or returns an
// unrelated Latin-script fragment) explains nothing to a Korean-speaking
// learner, even though it isn't empty.
function isBadKoreanMeaning(word, meaning) {
  if (!meaning) return false;
  const text = meaning.trim();
  if (!text) return false;
  if (text.toLowerCase() === word.toLowerCase()) return true;
  return !hasHangul(text);
}

// Clears those out so they show as missing and get picked up by Retry /
// "Missing meaning first" instead of sitting there looking answered. Meanings
// the user typed in by hand are never touched.
function clearUselessMeanings(list) {
  let changed = false;
  list.forEach((w) => {
    if (w.source === "manual") return;
    if (isUselessMeaning(w.word, w.definitionEn, true)) {
      w.definitionEn = null;
      w.noDefinitionEn = true;
      changed = true;
    }
    if (isBadKoreanMeaning(w.word, w.definitionKo)) {
      w.definitionKo = null;
      w.noDefinitionKo = true;
      changed = true;
    }
  });
  return changed;
}

// One-time migration for words saved before the dual-language schema above
// existed: they only had flat `definition`/`level`/`noDefinition` fields for
// whichever language track was active when the word was added. We infer that
// original language from the level id's prefix (built-in Korean levels are
// "kr_..."), keep that side as-is, and guess a level for the other side —
// its meaning is left blank (flagged as not-yet-found) until looked up via
// the existing Retry feature.
function migrateCustomWords(list) {
  let changed = false;
  const migrated = list.map((w) => {
    if (w.definitionEn !== undefined || w.definitionKo !== undefined) return w;
    changed = true;
    const origLang = typeof w.level === "string" && w.level.indexOf("kr_") === 0 ? "ko" : "en";
    const other = otherLang(origLang);
    const migratedWord = {
      id: w.id,
      word: w.word,
      example: w.example || "",
      source: w.source,
      createdAt: w.createdAt,
    };
    migratedWord[defKey(origLang)] = w.definition;
    migratedWord[levelKey(origLang)] = w.level;
    migratedWord[noDefKey(origLang)] = !!w.noDefinition;
    migratedWord[defKey(other)] = null;
    migratedWord[levelKey(other)] = guessLevelForWord(w.word, other);
    migratedWord[noDefKey(other)] = true;
    return migratedWord;
  });
  if (clearUselessMeanings(migrated)) changed = true;
  if (changed) {
    try {
      localStorage.setItem(CUSTOM_WORDS_KEY, JSON.stringify(migrated));
    } catch (e) {
      console.warn("Could not save migrated custom words", e);
    }
  }
  return migrated;
}

// The learner's own flashcard deck — words they typed in or picked from the
// word list. Personal to this browser, like their progress.
function loadMyDeck() {
  try {
    const raw = localStorage.getItem(MY_DECK_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Could not read my flashcards", e);
  }
  return [];
}

function saveMyDeck() {
  try {
    localStorage.setItem(MY_DECK_KEY, JSON.stringify(myDeck));
  } catch (e) {
    console.warn("Could not save my flashcards", e);
  }
}

// Returns how many were actually added, skipping words already in the deck.
function addToMyDeck(entries) {
  const have = new Set(myDeck.map((c) => c.word.toLowerCase()));
  let added = 0;
  entries.forEach((entry) => {
    const word = (entry.word || "").trim();
    if (!word || have.has(word.toLowerCase())) return;
    have.add(word.toLowerCase());
    myDeck.push({
      word,
      definition: (entry.definition || "").trim(),
      example: (entry.example || "").trim(),
      createdAt: Date.now(),
    });
    added++;
  });
  if (added) saveMyDeck();
  return added;
}

// Deliberately not persisted anywhere (no localStorage, no sessionStorage):
// Number of Questions always starts at 10 on a fresh page load, full stop —
// no "session" semantics to get confused about. It can still be adjusted
// freely while the page stays open (switching tabs within the app doesn't
// reload it), but a refresh or reopening the site resets it every time.
function loadGoals() {
  return { quiz: 10, spelling: 10 };
}

function saveGoals() {
  // No-op — see loadGoals().
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
if (!progress.spellingStatus) progress.spellingStatus = {}; // back-compat for progress saved before this existed
if (!progress.srs) progress.srs = {}; // back-compat for progress saved before the SRS schedule existed
if (!progress.updatedAt) progress.updatedAt = 0;
let customWords = migrateCustomWords(loadCustomWords()).concat(
  loadSharedWordsCache().map((w) => ({ ...w, remote: true }))
);
let myDeck = loadMyDeck();
let goals = loadGoals();
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

// The level after the current one, or null when already at the top.
function nextLevelId() {
  const ids = currentSystem().levels.map((lv) => lv.id);
  const next = ids[ids.indexOf(currentLevel) + 1];
  return next || null;
}

function goalMaxFor() {
  if (!currentUser) return GOAL_MAX_ANONYMOUS;
  if (currentUser.role === "free") return GOAL_MAX_FREE;
  return GOAL_MAX_PAID;
}

// How many questions the current quiz category/level, or the current
// spelling level, can actually produce — the stepper (and the round it
// builds) can never exceed this, regardless of how high a role's own
// ceiling goes.
function quizPoolSizeForCurrentCategory() {
  const cat = quizCategorySel.value;
  if (cat === "synonyms") return buildSynonymQuestions(currentLevel).length;
  if (cat === "homophones") return buildHomophoneQuestions(currentLevel).length;
  return buildVocabQuestions(currentLevel).length;
}

function spellingPoolSize() {
  return getSpellingPool(currentLevel).length;
}

function goalPoolSize(mode) {
  return mode === "quiz" ? quizPoolSizeForCurrentCategory() : spellingPoolSize();
}

// A goal saved under a higher tier (or before these caps existed) could sit
// above the current session's ceiling — pull it back down whenever the
// role changes, so a round never silently hands out more questions than
// this account is entitled to.
function clampGoalsForRole() {
  const max = goalMaxFor();
  if (goals.quiz > max) {
    goals.quiz = max;
    saveGoals();
  }
  if (goals.spelling > max) {
    goals.spelling = max;
    saveGoals();
  }
}

// Tracks each stepper's last-rendered value purely so a real change (as
// opposed to every other, unrelated reason renderGoalStepper() gets called —
// a language switch, a level change, ...) can play a little bounce, rather
// than the number just flatly updating.
const goalStepperLastValue = { quiz: null, spelling: null };

function renderGoalStepper(mode) {
  const valueEl = mode === "quiz" ? quizGoalValueEl : spellingGoalValueEl;
  const minusBtn = mode === "quiz" ? quizGoalMinusBtn : spellingGoalMinusBtn;
  const plusBtn = mode === "quiz" ? quizGoalPlusBtn : spellingGoalPlusBtn;
  const changed = goalStepperLastValue[mode] !== null && goalStepperLastValue[mode] !== goals[mode];
  valueEl.textContent = String(goals[mode]);
  if (changed) pulseScoreTag(valueEl, "option-btn-bounce");
  goalStepperLastValue[mode] = goals[mode];
  minusBtn.disabled = goals[mode] <= GOAL_MIN;

  const poolMax = goalPoolSize(mode);
  const roleMax = goalMaxFor();
  // A paid/admin account has no upsell above its own ceiling, so both the
  // pool and the role ceiling act as hard stops for it. A signed-out
  // visitor or a free account keeps + enabled right at their role ceiling
  // (as long as the pool genuinely has more) — tapping it there triggers
  // the sign-up/upgrade nudge instead of just going inert.
  const hasUpsellAbove = !currentUser || currentUser.role === "free";
  const hardCeiling = hasUpsellAbove ? poolMax : Math.min(roleMax, poolMax);
  plusBtn.disabled = goals[mode] >= hardCeiling;
}

/* ---------- Kid-friendly confirm modal ----------
   A branded, animated stand-in for window.confirm() on the signup/upgrade
   nudges — a real confirm() shows the raw URL, can't be styled, and reads
   as a scary "this site says" browser chrome dialog to a young kid. Resolves
   true/false the same way confirm() would, just asynchronously. */
const kidConfirmOverlay = document.getElementById("kid-confirm-overlay");
const kidConfirmMessage = document.getElementById("kid-confirm-message");
const kidConfirmOkBtn = document.getElementById("kid-confirm-ok-btn");
const kidConfirmCancelBtn = document.getElementById("kid-confirm-cancel-btn");
let kidConfirmResolve = null;

// Button labels default to the signup-nudge wording (this modal's original
// use); pass okLabel/cancelLabel to fit a different prompt — "Sign me up!"
// makes no sense on the level-up challenge, for instance.
function kidConfirm(message, okLabel, cancelLabel) {
  return new Promise((resolve) => {
    kidConfirmMessage.textContent = message;
    kidConfirmOkBtn.textContent = okLabel || t("kidConfirmOkBtn");
    kidConfirmCancelBtn.textContent = cancelLabel || t("kidConfirmCancelBtn");
    kidConfirmResolve = resolve;
    kidConfirmOverlay.hidden = false;
    // Restart the pop-in animation even if a previous prompt is still fading.
    const card = kidConfirmOverlay.querySelector(".kid-modal-card");
    card.style.animation = "none";
    void card.offsetWidth;
    card.style.animation = "";
  });
}

function closeKidConfirm(result) {
  kidConfirmOverlay.hidden = true;
  const resolve = kidConfirmResolve;
  kidConfirmResolve = null;
  if (resolve) resolve(result);
}

kidConfirmOkBtn.addEventListener("click", () => closeKidConfirm(true));
kidConfirmCancelBtn.addEventListener("click", () => closeKidConfirm(false));
kidConfirmOverlay.addEventListener("click", (e) => {
  if (e.target === kidConfirmOverlay) closeKidConfirm(false);
});
// Enter confirms, Escape cancels — captured ahead of whatever's focused
// underneath (e.g. a falling-game input, which has its own Enter handling)
// so the modal always gets first say while it's open.
document.addEventListener(
  "keydown",
  (e) => {
    if (kidConfirmOverlay.hidden) return;
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      closeKidConfirm(true);
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      closeKidConfirm(false);
    }
  },
  true
);

function promptSignupForMoreQuestions() {
  kidConfirm(t("anonymousQuestionCapPrompt")).then((ok) => {
    if (ok) openAuthOverlay("signup");
  });
}

// Shows the congratulations panel once a round's correct count reaches the
// target, offering the next level up as the next challenge.
function showGoalReached(banner, message, nextLevelBtn, score) {
  const next = nextLevelId();
  message.textContent = next
    ? t("goalReached", score, levelLabel(currentLevel))
    : t("goalReachedTop", score, levelLabel(currentLevel));
  nextLevelBtn.hidden = !next;
  banner.hidden = false;
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

// Mobile Chrome/Safari's speechSynthesis implementation doesn't actually
// support pause()/resume() the way desktop does — calling pause() shortly
// after speak() starts tends to cut the utterance off right there instead
// of resuming it, so most words come out as just their first syllable. The
// desktop-only watchdog below (built for a different Chrome bug — an
// utterance silently stopping after ~15s) must not run on these platforms.
const IS_MOBILE_TTS = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");

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

// `opts.onstart`/`opts.onend` let a caller show pronunciation-in-progress UI
// (e.g. the flashcard "Hear it" button below) without every caller having to
// duplicate the Web Speech API's own event wiring.
function speak(text, opts = {}) {
  if (!text) return;
  if (!("speechSynthesis" in window)) {
    if (opts.onend) opts.onend();
    return;
  }
  const synth = window.speechSynthesis;
  // Chrome/Edge can leave the synthesizer stuck reporting speaking === true
  // forever — after a tab is backgrounded, or a previous utterance errored
  // out silently — which then blocks every later speak() call from doing
  // anything at all. cancel() clears that stuck state before every attempt,
  // not only to interrupt a genuinely in-progress one.
  synth.cancel();

  const lang = currentSystem().speechLang;

  const speakNow = () => {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    const voice = pickVoice(lang);
    if (voice) utter.voice = voice;
    // Slightly brighter pitch/pace to read as a younger adult voice.
    utter.rate = 0.95;
    utter.pitch = 1.08;
    let watchdog = null;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      if (watchdog) clearInterval(watchdog);
      if (opts.onend) opts.onend();
    };
    utter.onstart = opts.onstart || null;
    utter.onend = finish;
    utter.onerror = (e) => {
      // "interrupted"/"canceled" just mean a newer speak() call's cancel()
      // cut this one off — routine, not a real failure worth logging.
      if (e.error !== "interrupted" && e.error !== "canceled") {
        console.warn("Speech synthesis failed:", e.error);
      }
      finish();
    };
    synth.speak(utter);

    // Long-standing Chrome bug: an utterance can silently stop after ~15s
    // unless something nudges the engine in the meantime. A harmless
    // pause/resume every quarter-second keeps that from cutting off longer
    // text (example sentences) partway through; capped so a genuinely stuck
    // synth doesn't spin this forever. Desktop only — see IS_MOBILE_TTS above.
    if (!IS_MOBILE_TTS) {
      let ticks = 0;
      watchdog = setInterval(() => {
        if (!synth.speaking) {
          clearInterval(watchdog);
          return;
        }
        if (++ticks > 40) {
          clearInterval(watchdog);
          return;
        }
        synth.pause();
        synth.resume();
      }, 250);
    }
  };

  // On a page's first pronunciation attempt, some browsers still have an
  // empty getVoices() list — the real list only arrives later via the async
  // voiceschanged event — so speaking immediately would silently fall back
  // to whatever default system voice happens to already be loaded, ignoring
  // the target language. Give the voice list one more chance to arrive
  // first; this adds a barely-noticeable delay only on that first call.
  if (!cachedVoices.length) {
    refreshVoices();
    if (!cachedVoices.length) {
      setTimeout(speakNow, 80);
      return;
    }
  }
  speakNow();
}

/* ================= LEVEL POOLS ================= */

function getVocabPool(level) {
  const custom = customWords
    .filter((w) => cwLevel(w) === level)
    .map((w) => ({ word: w.word, definition: cwDefinition(w) || t("ocrNoDefFound"), example: w.example || "", custom: true }));
  // Once admin has shared at least one managed word at this level, the DB is
  // the single source of truth for it — the old hardcoded bank stops
  // contributing entirely, so a deliberate admin deletion stays deleted
  // instead of the hardcoded word quietly reappearing behind it. Until then
  // (a level admin hasn't touched yet, or the one-time seed migration hasn't
  // run) the hardcoded bank still provides bootstrap content.
  const adminManagesLevel = customWords.some((w) => cwLevel(w) === level && w.remote && !w.ownerId);
  if (adminManagesLevel) return custom;

  const builtIn = currentSystem().bank.vocabulary.filter((w) => w.level === level);
  const customLower = new Set(custom.map((w) => w.word.toLowerCase()));
  const dedupedBuiltIn = builtIn.filter((w) => !customLower.has(w.word.toLowerCase()));
  return dedupedBuiltIn.concat(custom);
}

// Spelling now draws from the exact same pool as the Vocabulary quiz
// category — a spelling round's hint is just that word's definition. This
// used to be a separate hardcoded list of mnemonic tips for the English
// track, but keeping two parallel word lists in sync (and making sure every
// word in both had a real definition) wasn't sustainable, so both
// categories were merged into one managed pool.
function getSpellingPool(level) {
  return getVocabPool(level).map((w) => ({ word: w.word, tip: t("hintPrefix", w.definition), custom: !!w.custom }));
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

// Finds an existing custom word by text (case-insensitive, trimmed), ignoring
// the app's own built-in word lists — used to stop the same word being saved
// as a second, separate entry under a new id.
function findCustomWordByText(word) {
  const target = word.trim().toLowerCase();
  return customWords.find((w) => w.word.trim().toLowerCase() === target) || null;
}

// Groups customWords by text (case-insensitive, trimmed) and returns only the
// groups with more than one entry — leftover duplicates from before the
// duplicate check existed on Single/Multiple word add.
function findDuplicateCustomWordGroups() {
  const groups = new Map();
  // Only merge within words this account actually manages — never an admin's
  // shared word with a paid account's private one, or vice versa.
  myCustomWords().forEach((w) => {
    const key = w.word.trim().toLowerCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(w);
  });
  return Array.from(groups.values()).filter((group) => group.length > 1);
}

/* ================= TRANSLATION APPLICATION ================= */
function applyStaticTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((el) => {
    const label = t(el.dataset.i18nAriaLabel);
    el.setAttribute("aria-label", label);
    // These are all icon-only controls (pause/end/mute, +/- steppers) with
    // no visible text of their own — the same label doubles as a native
    // hover tooltip so a mouse user can tell what the icon does too.
    el.setAttribute("title", label);
  });
  document.getElementById("app-title").textContent = t("appTitle");
  document.getElementById("app-subtitle").textContent = t("appSubtitle");
  document.getElementById("app-footer").textContent = t("footerText");
  document.getElementById("lang-toggle").textContent = t("langToggle");
  document.getElementById("level-overlay-title").textContent = t("levelOverlayTitle");
  document.getElementById("level-overlay-desc").textContent = t("levelOverlayDesc");
  updateAdminUI();
  document.documentElement.lang = currentLang === "ko" ? "ko" : "en";
  renderGoalStepper("quiz");
  renderGoalStepper("spelling");
  if (typeof renderHome === "function") renderHome();
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
const levelOverlayCloseBtn = document.getElementById("level-overlay-close");
const levelBadge = document.getElementById("level-badge");
const streakChipEl = document.getElementById("streak-chip");
const streakCountEl = document.getElementById("streak-count");
const levelChoicesEl = document.getElementById("level-choices");
const LEVEL_DESCRIPTIONS = {
  en: {
    year4: "Foundation vocabulary",
    year5: "Intermediate vocabulary",
    year6: "Advanced / GATE-style vocabulary",
    year7: "Secondary school vocabulary",
  },
  ko: {
    kr_elem6: "초등 기초 필수 어휘",
    kr_mid1: "중1 필수 어휘",
    kr_mid2: "중2 필수 어휘",
    kr_mid3: "중3 필수 어휘 (심화)",
    kr_high: "고등학교 필수 어휘",
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
  // Reopened from the badge means a level is already set, so this visit is
  // optional — show the close button (see the CSS comment on
  // .level-overlay-close for why the mandatory first-run pick never does).
  levelOverlayCloseBtn.hidden = false;
  levelOverlay.hidden = false;
});

levelOverlayCloseBtn.addEventListener("click", () => {
  levelOverlay.hidden = true;
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
  renderTimesTableInstructions();

  if (savedLevels[lang]) {
    populateLevelSelects();
    refreshCurrentView();
    renderCustomWords();
  } else {
    levelOverlayCloseBtn.hidden = false;
    levelOverlay.hidden = false;
  }
}

langToggleBtn.addEventListener("click", () => {
  switchLanguage(currentLang === "en" ? "ko" : "en");
});

/* ---------- Tab navigation ---------- */
// ".tab-btn" picks up every button that switches views: the persistent
// nav.tabs / .bottom-tabs rows *and* the landing-page tile grid (see
// #view-landing in index.html) — a tile is just a bigger, richer-looking
// tab-btn with the same data-view attribute, so it needs no separate click
// wiring below; goToTab()'s active-state sync also covers it for free.
const tabButtons = document.querySelectorAll(".tab-btn");
const views = document.querySelectorAll(".view");

// "Study" (Quiz/Spelling/Flashcards) and "Game" (Times Table/Typing Game)
// nav groups — see .tab-group in style.css. Each group's trigger has no
// data-view of its own (it shouldn't navigate anywhere by itself), so it's
// deliberately excluded from `tabButtons` above; its open/close state and
// its has-active highlighting (does the currently-open view belong to this
// group?) are handled separately here.
const tabGroups = document.querySelectorAll(".tab-group");

// Each group's dropdown panel is moved out to <body> once, up front, and
// from then on positioned with `position: fixed` computed from its own
// trigger's bounding box (see positionDropdown()) rather than anchored to it
// with ordinary CSS. nav.tabs needs overflow-x: auto for its horizontal-
// scroll fallback, which forces overflow-y to auto as an unavoidable side
// effect — a dropdown left positioned inside that box would simply get
// clipped by it the moment it tried to pop out below the pill row.
const groupDropdowns = new Map();
tabGroups.forEach((group) => {
  const dropdown = group.querySelector(".tab-dropdown");
  if (dropdown) {
    document.body.appendChild(dropdown);
    groupDropdowns.set(group, dropdown);
  }
});

function positionDropdown(group) {
  const trigger = group.querySelector(".tab-group-trigger");
  const dropdown = groupDropdowns.get(group);
  if (!trigger || !dropdown) return;
  const rect = trigger.getBoundingClientRect();
  const isUp = dropdown.classList.contains("tab-dropdown-up");
  dropdown.style.position = "fixed";
  const dw = dropdown.offsetWidth;
  let left = rect.left + rect.width / 2 - dw / 2;
  left = Math.max(8, Math.min(left, window.innerWidth - dw - 8));
  dropdown.style.left = `${left}px`;
  if (isUp) {
    dropdown.style.bottom = `${window.innerHeight - rect.top + 8}px`;
    dropdown.style.top = "auto";
  } else {
    dropdown.style.top = `${rect.bottom + 6}px`;
    dropdown.style.bottom = "auto";
  }
}

function closeAllTabGroups() {
  tabGroups.forEach((group) => {
    group.classList.remove("open");
    const trigger = group.querySelector(".tab-group-trigger");
    if (trigger) trigger.setAttribute("aria-expanded", "false");
  });
  groupDropdowns.forEach((dropdown) => dropdown.classList.remove("open"));
}

function openTabGroup(group) {
  const dropdown = groupDropdowns.get(group);
  if (!dropdown) return;
  closeAllTabGroups();
  group.classList.add("open");
  dropdown.classList.add("open");
  positionDropdown(group);
  const trigger = group.querySelector(".tab-group-trigger");
  if (trigger) trigger.setAttribute("aria-expanded", "true");
}

function syncTabGroupActiveStates(view) {
  tabGroups.forEach((group) => {
    const groupViews = (group.dataset.groupViews || "").split(",");
    const trigger = group.querySelector(".tab-group-trigger");
    if (trigger) trigger.classList.toggle("has-active", groupViews.includes(view));
  });
}

const hoverCapable = window.matchMedia && window.matchMedia("(hover: hover)").matches;

// The dropdown is a separate element out in <body> now (see groupDropdowns
// above), not a DOM descendant of .tab-group any more — so the moment the
// mouse travels from the trigger down into the dropdown itself, it's
// genuinely leaving the group's own box, and a plain mouseleave->close would
// slam the dropdown shut before a click on any item inside it could land.
// A short delay on close, cancelled by re-entering *either* the group or the
// dropdown, bridges that gap without needing hover to work across two
// disconnected elements.
let tabGroupCloseTimer = null;
function cancelTabGroupClose() {
  clearTimeout(tabGroupCloseTimer);
}
function scheduleTabGroupClose() {
  clearTimeout(tabGroupCloseTimer);
  tabGroupCloseTimer = setTimeout(closeAllTabGroups, 200);
}

tabGroups.forEach((group) => {
  const trigger = group.querySelector(".tab-group-trigger");
  if (!trigger) return;
  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    cancelTabGroupClose();
    if (group.classList.contains("open")) closeAllTabGroups();
    else openTabGroup(group);
  });
  // Hover support for desktop mouse users. This can no longer be plain CSS
  // :hover once the dropdown lives outside the group in the DOM (see
  // groupDropdowns above), so it's driven from JS instead — gated on a real
  // hover-capable pointer so a touch tap's synthetic hover doesn't also
  // trigger it.
  if (hoverCapable) {
    const dropdown = groupDropdowns.get(group);
    group.addEventListener("mouseenter", () => {
      cancelTabGroupClose();
      openTabGroup(group);
    });
    group.addEventListener("mouseleave", scheduleTabGroupClose);
    if (dropdown) {
      dropdown.addEventListener("mouseenter", cancelTabGroupClose);
      dropdown.addEventListener("mouseleave", scheduleTabGroupClose);
    }
  }
});

// Closes any open dropdown after picking an item inside it (its click also
// bubbles here after goToTab() has already run) or after any other click
// anywhere outside a trigger (whose own listener above stops the bubble).
document.addEventListener("click", closeAllTabGroups);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeAllTabGroups();
});
window.addEventListener("resize", closeAllTabGroups);

function refreshCurrentView() {
  const active = document.querySelector(".tab-btn.active");
  if (active) refreshView(active.dataset.view);
}

function refreshView(view) {
  if (view === "landing") renderHome();
  if (view === "flashcards") buildFlashDeck();
  if (view === "quiz") buildQuizQuestions();
  if (view === "spelling") buildSpellingDeck();
  if (view === "typegame") enterTypeGameTab();
  if (view === "timestable") enterTimesTableTab();
  if (view === "wordlist") renderWordList();
  if (view === "addword") renderCustomWords();
  if (view === "stats") renderStats();
  if (view === "admincodes") {
    loadAdminCodes();
    loadAdminUsers();
  }
  if (view === "myaccount") renderMyAccount();
}

function goToTab(view) {
  const previousBtn = document.querySelector(".tab-btn.active");
  const previousView = previousBtn ? previousBtn.dataset.view : null;
  // Leaving mid-round freezes the game in place rather than ending it, so
  // switching tabs to check something doesn't cost the player their score.
  if (previousView === "typegame" && view !== "typegame") pauseTypeGame();
  if (previousView === "timestable" && view !== "timestable") pauseTimesTable();

  tabButtons.forEach((b) => b.classList.toggle("active", b.dataset.view === view));
  syncTabGroupActiveStates(view);
  views.forEach((v) => v.classList.toggle("active", v.id === `view-${view}`));
  // The persistent nav row (top nav.tabs / bottom .bottom-tabs) is only
  // useful once you're already inside a section — on the landing tile grid
  // itself it would just repeat every menu a second time. See the
  // body.on-landing rules in style.css.
  document.body.classList.toggle("on-landing", view === "landing");
  refreshView(view);
}

const adminCodesTabButton = document.querySelector('.tab-btn[data-view="admincodes"]');

// Add Word / Flashcards / Word List / My Progress are all open to anyone to
// browse — Quiz/Spelling/Typing Game already were. Only the account-specific
// *actions* inside them (saving a word, building a custom flashcard deck,
// etc.) are gated, each at its own point of use — see canUsePaidFeatures()/
// promptUpgradeForFeature()'s call sites. admincodes keeps its own,
// stricter admin-only gate here.
tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.dataset.view === "admincodes" && !serverAdmin) return;
    goToTab(btn.dataset.view);
  });
});

// A step above canUseAccountFeatures(): word-adding (photo/manual/OCR),
// managing My Added Words, and building the "My cards" flashcard deck are
// premium features — a free (signed-in) account doesn't clear this any more
// than an anonymous visitor does, only paid and admin do.
function canUsePaidFeatures() {
  return isAdmin || (currentUser && currentUser.role === "paid");
}

// A signed-in free account is sent straight to the upgrade overlay it
// already knows from the goal-cap prompts (openUpgradeOverlay, see Quiz/
// Spelling); an anonymous visitor has no account yet to upgrade, so gets a
// plain confirm pointing at signup instead.
function promptUpgradeForFeature() {
  if (currentUser && currentUser.role === "free") {
    openUpgradeOverlay();
    return;
  }
  kidConfirm(t("anonymousPremiumFeaturePrompt")).then((ok) => {
    if (ok) openAuthOverlay("signup");
  });
}

// Set once the Add Word section further down this file has its own DOM
// elements ready (see updatePaidFeatureGates()). Called as a hook, rather
// than directly, so the updateAdminUI() call at module init below — which
// runs before that section's consts exist — doesn't throw.
let refreshPaidFeatureGates = null;

/* ---------- Shared word list API ---------- */
// serverAdmin means the Worker confirmed an admin session, so this browser
// may change the *shared* pool. isAdmin covers that plus the offline,
// in-page password fallback below (server unreachable), which only unlocks
// editing this browser's own words. canAddWords(), not isAdmin, is what
// actually gates the Add Word tab — any signed-in role may open it.
let serverAdmin = false;
let sharedWordsAvailable = false;

// Signing in (any role) unlocks everything beyond Quiz/Spelling/Typing Game —
// Flashcards, Word List, Add Word, My Progress. What happens to a word added
// from Add Word still depends on the specific role (newWordStorageFlags()).
function canUseAccountFeatures() {
  return !!currentUser || isAdmin;
}
function canAddWords() {
  return canUseAccountFeatures();
}

// Admin and paid accounts are the only roles whose words are ever written to
// the server — admin into the shared pool, paid into their own private slice.
function canWriteServerWords() {
  return serverAdmin || (currentUser && currentUser.role === "paid");
}

// Admin/paid learning progress (word stats, SRS schedule) syncs to the
// server under the same accounts that can write words — a free/anonymous
// visitor never triggers any of these calls, staying 100% localStorage like
// before. This only ever reads/writes that account's own row (see
// /api/progress in worker/index.js) — it has nothing to do with, and grants
// no access to, admin's shared word pool.
let progressSyncTimer = null;
const PROGRESS_SYNC_DEBOUNCE_MS = 4000;

// Called from saveProgress() on every change — coalesces rapid-fire saves
// (e.g. answering several quiz questions in a row) into one request instead
// of a PUT per answer.
function scheduleProgressSync() {
  clearTimeout(progressSyncTimer);
  progressSyncTimer = setTimeout(() => {
    progressSyncTimer = null;
    pushProgressToServer();
  }, PROGRESS_SYNC_DEBOUNCE_MS);
}

async function pushProgressToServer() {
  try {
    await api("/progress", { method: "PUT", body: JSON.stringify({ progress }) });
  } catch (e) {
    console.warn("Could not sync progress to server", e);
  }
}

// Called once right after a login/page-load confirms an admin/paid session.
// Whichever side (this device's localStorage, or the server) was updated
// more recently wins — so a word correctly answered on one device/session
// isn't asked again from scratch after signing back in somewhere else.
async function syncProgressOnLogin() {
  try {
    const { progress: serverProgress, updatedAt } = await api("/progress");
    if (serverProgress && typeof updatedAt === "number" && updatedAt > (progress.updatedAt || 0)) {
      progress = serverProgress;
      if (!progress.srs) progress.srs = {};
      if (!progress.spellingStatus) progress.spellingStatus = {};
      if (!progress.updatedAt) progress.updatedAt = updatedAt;
      saveProgress();
      renderStats();
      renderWordList();
    } else {
      pushProgressToServer();
    }
  } catch (e) {
    console.warn("Could not check server progress", e);
  }
}

// Where a newly added word should live, based on the signed-in account:
// - admin: pushed to the server, shared with everyone (owner_id NULL)
// - paid: pushed to the server, visible only to this account (owner_id = self)
// - free (signed in): kept only in this tab's memory — never written to
//   localStorage or the server, gone the moment the tab or site is closed
// - offline admin fallback (server unreachable): the old local-storage
//   behaviour, uploadable later once the server is back
function newWordStorageFlags() {
  // ownerId is set here purely so the word renders under "My added words"
  // right away, before any server round-trip — the server derives the real
  // owner_id from the session itself and ignores whatever the client sends.
  if (serverAdmin) return { remote: true, volatile: false, ownerId: null };
  if (currentUser && currentUser.role === "paid") return { remote: true, volatile: false, ownerId: currentUser.id };
  if (currentUser && currentUser.role === "free") return { remote: false, volatile: true };
  return { remote: false, volatile: false };
}

// "My added words" should only list words this account can actually manage:
// an admin manages the shared pool, a paid account its own private words,
// and anything not yet synced (local-pending or this tab's volatile words)
// always belongs to whoever is looking at it.
function isMyCustomWord(w) {
  if (!w.remote) return true;
  if (currentUser && currentUser.role === "admin") return !w.ownerId;
  if (currentUser && currentUser.role === "paid") return w.ownerId === currentUser.id;
  return false;
}

function storageNoteKey() {
  if (serverAdmin) return "storageNoteShared";
  if (currentUser && currentUser.role === "paid") return "storageNotePrivate";
  if (currentUser && currentUser.role === "free") return "storageNoteVolatile";
  return "storageNoteLocal";
}

async function api(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    credentials: "same-origin",
    headers: options.body ? { "content-type": "application/json" } : undefined,
    ...options,
  });
  if (!res.ok) {
    const error = new Error(`api ${path} failed: ${res.status}`);
    error.status = res.status;
    try {
      error.data = await res.json();
    } catch (e) {
      error.data = null;
    }
    throw error;
  }
  return res.json();
}

async function refreshSharedWords() {
  try {
    const { words } = await api("/words");
    sharedWordsAvailable = true;
    const local = customWords.filter((w) => !w.remote);
    customWords = local.concat(words.map((w) => ({ ...w, remote: true })));
    saveCustomWords();
    renderCustomWords();
    renderWordList();
    refreshCurrentView();
  } catch (e) {
    // No API yet, or offline — the cached copy stays in place.
    sharedWordsAvailable = false;
  }
}

// Must stay <= the worker's own MAX_WORDS_PER_REQUEST (worker/index.js) — a
// request over that limit is rejected outright (413) with nothing saved, so
// a big bulk-add has to be split into chunks this size or smaller.
const WORDS_PER_REQUEST_CHUNK = 200;

// Best-effort writes: the local list is already updated by the caller, so a
// failure here means the change didn't reach other devices, not that it was
// lost. Returns the words that failed to save (empty if everything made it),
// so a caller doing a big bulk add can tell the user when some didn't stick
// instead of the failure silently vanishing on the next server refresh.
async function pushSharedWords(words) {
  if (!canWriteServerWords() || words.length === 0) return { failed: [] };
  const failed = [];
  for (let i = 0; i < words.length; i += WORDS_PER_REQUEST_CHUNK) {
    const chunk = words.slice(i, i + WORDS_PER_REQUEST_CHUNK);
    try {
      await api("/words", { method: "PUT", body: JSON.stringify({ words: chunk }) });
    } catch (e) {
      console.warn("Could not save words to the server", e);
      failed.push(...chunk);
    }
  }
  return { failed };
}

async function removeSharedWords(ids) {
  if (!canWriteServerWords() || ids.length === 0) return;
  try {
    await api("/words", { method: "DELETE", body: JSON.stringify({ ids }) });
  } catch (e) {
    console.warn("Could not delete words on the server", e);
  }
}

/* ---------- Auth: sign up / log in ---------- */
// currentUser mirrors the server's account (id/username/role) once the
// server confirms a session; isAdmin is the derived gate the rest of the app
// checks, true either because currentUser.role === "admin" or via the
// offline-only fallback below (unlocks *this browser's own* word edits when
// the API can't be reached at all — it never creates a real account).
let currentUser = null;
let isAdmin = sessionStorage.getItem(ADMIN_KEY) === "1";
const authToggleBtn = document.getElementById("auth-toggle");
const authOverlay = document.getElementById("auth-overlay");
const authTitle = document.getElementById("auth-title");
const authModeLoginBtn = document.getElementById("auth-mode-login-btn");
const authModeSignupBtn = document.getElementById("auth-mode-signup-btn");
const loginForm = document.getElementById("login-form");
const loginUsernameInput = document.getElementById("login-username-input");
const loginPasswordInput = document.getElementById("login-password-input");
const loginError = document.getElementById("login-error");
const loginCancelBtn = document.getElementById("login-cancel-btn");
const signupForm = document.getElementById("signup-form");
const signupUsernameInput = document.getElementById("signup-username-input");
const signupPasswordInput = document.getElementById("signup-password-input");
const signupCodeInput = document.getElementById("signup-code-input");
const signupError = document.getElementById("signup-error");
const signupCancelBtn = document.getElementById("signup-cancel-btn");

function updateAdminUI() {
  clampGoalsForRole();
  // Flashcards/Word List/Add Word/My Progress stay visible even signed out —
  // tapping one prompts to sign up instead of the tab just disappearing (see
  // the click handler above). admincodes is the one tab that's genuinely
  // hidden, since it's admin-only rather than sign-in-gated.
  if (adminCodesTabButton) adminCodesTabButton.hidden = !serverAdmin;
  // Keep the label short (just the username) so it never fights the centered
  // title for space on narrow screens — the full "tap to log out" meaning
  // lives in the tooltip and the green "signed in" coloring instead.
  authToggleBtn.textContent = currentUser ? `👤 ${currentUser.username}` : t("authHeaderLoginBtn");
  // Signed out, the tooltip carries the actual reason to bother — "why
  // would I sign in?" — rather than repeating the button's own label back.
  authToggleBtn.title = currentUser ? t("myAccountMenuItem") : t("authToggleLoggedOutHint");
  authToggleBtn.classList.toggle("auth-toggle-active", !!currentUser);
  if (!currentUser) closeAuthMenu();

  // Bounce back to the landing tile grid if we're sitting on admincodes and
  // just lost admin, or on My Account (no nav button of its own) after
  // signing out — every other tab stays browsable regardless of sign-in
  // state.
  const activeOffLimitsTab = !serverAdmin && adminCodesTabButton && adminCodesTabButton.classList.contains("active");
  const onMyAccountSignedOut = !currentUser && document.getElementById("view-myaccount").classList.contains("active");
  if (activeOffLimitsTab || onMyAccountSignedOut) goToTab("landing");

  if (refreshPaidFeatureGates) refreshPaidFeatureGates();
}

function setAuthMode(mode) {
  const login = mode !== "signup";
  authTitle.textContent = t(login ? "authModeLogin" : "authModeSignup");
  loginForm.hidden = !login;
  signupForm.hidden = login;
  authModeLoginBtn.classList.toggle("primary", login);
  authModeLoginBtn.classList.toggle("neutral", !login);
  authModeSignupBtn.classList.toggle("primary", !login);
  authModeSignupBtn.classList.toggle("neutral", login);
  loginError.hidden = true;
  signupError.hidden = true;
}

function openAuthOverlay(mode) {
  loginUsernameInput.value = "";
  loginPasswordInput.value = "";
  signupUsernameInput.value = "";
  signupPasswordInput.value = "";
  signupCodeInput.value = "";
  setAuthMode(mode);
  authOverlay.hidden = false;
  (mode === "signup" ? signupUsernameInput : loginUsernameInput).focus();
}

function closeAuthOverlay() {
  authOverlay.hidden = true;
}

const authMenu = document.getElementById("auth-menu");
const authMenuAccountBtn = document.getElementById("auth-menu-account-btn");
const authMenuLogoutBtn = document.getElementById("auth-menu-logout-btn");

function closeAuthMenu() {
  authMenu.hidden = true;
}

async function logOut() {
  const wasSyncable = canWriteServerWords();
  if (wasSyncable) {
    // Flush one last time before the session that authenticates this write
    // goes away — otherwise anything since the last debounced sync is lost.
    clearTimeout(progressSyncTimer);
    progressSyncTimer = null;
    await pushProgressToServer();

    // This browser's in-memory/local progress belonged to the account that
    // just signed out — clear it (localStorage too) so it can't leak into
    // whichever account, if any, signs into this same browser next. It's
    // safe on the server and comes straight back the moment *this* account
    // signs in again (syncProgressOnLogin() pulls it down). A free account
    // never reaches this branch, so its local-only stats are untouched by
    // logging out, same as before this feature existed.
    progress = {
      wordStats: {},
      flashKnown: {},
      quiz: { correct: 0, total: 0 },
      spelling: { correct: 0, total: 0 },
      spellingStatus: {},
      srs: {},
      updatedAt: 0,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (e) {
      console.warn("Could not clear local progress on logout", e);
    }
  }

  currentUser = null;
  isAdmin = false;
  serverAdmin = false;
  pendingUpgradeRequest = null;
  sessionStorage.removeItem(ADMIN_KEY);
  // A free account's words only ever existed in memory for that session —
  // they don't carry over once you sign out.
  customWords = customWords.filter((w) => !w.volatile);
  updateAdminUI();
  renderUpgradeReadyBanner();
  try {
    await api("/auth/logout", { method: "POST" });
  } catch (e) {
    /* nothing to end server-side */
  }
  refreshSharedWords();
}

authToggleBtn.addEventListener("click", () => {
  if (currentUser) {
    authMenu.hidden = !authMenu.hidden;
  } else {
    openAuthOverlay("login");
  }
});

document.addEventListener("click", (e) => {
  if (!authMenu.hidden && !authMenu.contains(e.target) && e.target !== authToggleBtn) closeAuthMenu();
});

authMenuLogoutBtn.addEventListener("click", () => {
  closeAuthMenu();
  logOut();
});

authMenuAccountBtn.addEventListener("click", () => {
  closeAuthMenu();
  goToTab("myaccount");
});

/* ---------- My Account: self-service status + change password ---------- */
const myAccountStatusEl = document.getElementById("my-account-status");
const myAccountPasswordForm = document.getElementById("my-account-password-form");
const myAccountCurrentPasswordInput = document.getElementById("my-account-current-password");
const myAccountNewPasswordInput = document.getElementById("my-account-new-password");
const myAccountPasswordError = document.getElementById("my-account-password-error");
const myAccountPasswordSuccess = document.getElementById("my-account-password-success");
const myAccountPasswordSubmitBtn = document.getElementById("my-account-password-submit-btn");

function formatDate(ms) {
  return ms ? new Date(ms).toLocaleDateString() : "—";
}

async function renderMyAccount() {
  if (!currentUser) return;
  let account = currentUser;
  try {
    const { user } = await api("/auth/me");
    if (user) account = user;
  } catch (e) {
    // Fall back to the cached currentUser fields if the server can't be reached.
  }

  // Same stat-tile look as My Progress, so the account's own status reads
  // as one more "at a glance" summary instead of a plain label/value list.
  const tiles = [
    { num: account.username, lbl: t("myAccountUsername") },
    { num: roleLabel(account.role), lbl: t("myAccountRole") },
    { num: formatDate(account.createdAt), lbl: t("myAccountJoined") },
    { num: formatDate(account.upgradedAt), lbl: t("myAccountUpgraded") },
  ];
  myAccountStatusEl.innerHTML = tiles
    .map((s) => `<div class="stat-box"><div class="num">${s.num}</div><div class="lbl">${s.lbl}</div></div>`)
    .join("");
}

myAccountPasswordForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  myAccountPasswordError.hidden = true;
  myAccountPasswordSuccess.hidden = true;
  const currentPassword = myAccountCurrentPasswordInput.value;
  const newPassword = myAccountNewPasswordInput.value;
  if (!currentPassword || newPassword.length < 8) {
    myAccountPasswordError.textContent = t("authSignupErrorPassword");
    myAccountPasswordError.hidden = false;
    return;
  }
  myAccountPasswordSubmitBtn.disabled = true;
  try {
    await api("/auth/change-password", { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) });
    myAccountPasswordSuccess.hidden = false;
    myAccountPasswordForm.reset();
  } catch (err) {
    const code = err && err.data && err.data.error;
    myAccountPasswordError.textContent = code === "wrong_current_password" ? t("myAccountWrongCurrentPassword") : t("authSignupErrorGeneric");
    myAccountPasswordError.hidden = false;
  }
  myAccountPasswordSubmitBtn.disabled = false;
});

authModeLoginBtn.addEventListener("click", () => setAuthMode("login"));
authModeSignupBtn.addEventListener("click", () => setAuthMode("signup"));
loginCancelBtn.addEventListener("click", closeAuthOverlay);
signupCancelBtn.addEventListener("click", closeAuthOverlay);

authOverlay.addEventListener("click", (e) => {
  if (e.target === authOverlay) closeAuthOverlay();
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = loginUsernameInput.value.trim();
  const password = loginPasswordInput.value;
  loginError.hidden = true;

  // The server is the real check: passwords are hashed there and never
  // travel back to the browser.
  let serverRejected = false;
  try {
    const { user, pendingUpgradeRequest: pending } = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    currentUser = user;
    serverAdmin = user.role === "admin";
    if (serverAdmin) isAdmin = true;
    pendingUpgradeRequest = pending || null;
  } catch (err) {
    // 401 means the server answered and the credentials were wrong. Anything
    // else (no API deployed yet, offline, misconfigured) means we couldn't ask.
    serverRejected = err && err.status === 401;
  }

  // Only when the server couldn't answer at all does the offline fallback
  // apply, and only for the one reserved admin username — it unlocks editing
  // this browser's own words, not a real account.
  if (!currentUser && !isAdmin && !serverRejected) {
    const enteredHash = await sha256Hex(password);
    if (username === ADMIN_USERNAME && enteredHash === ADMIN_PASSWORD_HASH) isAdmin = true;
  }

  if (!currentUser && !isAdmin) {
    loginError.textContent = t("authLoginErrorText");
    loginError.hidden = false;
    return;
  }

  if (isAdmin) sessionStorage.setItem(ADMIN_KEY, "1");
  closeAuthOverlay();
  updateAdminUI();
  renderUpgradeReadyBanner();
  if (currentUser) refreshSharedWords();
  if (canWriteServerWords()) syncProgressOnLogin();
});

const SIGNUP_ERROR_KEYS = {
  username_taken: "authSignupErrorTaken",
  invalid_code: "authSignupErrorCode",
  invalid_username: "authSignupErrorUsername",
  invalid_password: "authSignupErrorPassword",
  reserved_username: "authSignupErrorUsername",
};

signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = signupUsernameInput.value.trim();
  const password = signupPasswordInput.value;
  const specialCode = signupCodeInput.value.trim();
  signupError.hidden = true;

  try {
    const { user } = await api("/auth/signup", {
      method: "POST",
      body: JSON.stringify(specialCode ? { username, password, specialCode } : { username, password }),
    });
    currentUser = user;
    closeAuthOverlay();
    updateAdminUI();
    refreshSharedWords();
    if (canWriteServerWords()) syncProgressOnLogin();
  } catch (err) {
    const code = err && err.data && err.data.error;
    signupError.textContent = t(SIGNUP_ERROR_KEYS[code] || "authSignupErrorGeneric");
    signupError.hidden = false;
  }
});

/* ---------- Upgrade to paid (an existing free account redeems a code, or requests one from admin) ---------- */
const upgradeOverlay = document.getElementById("upgrade-overlay");
const upgradeForm = document.getElementById("upgrade-form");
const upgradeCodeInput = document.getElementById("upgrade-code-input");
const upgradeError = document.getElementById("upgrade-error");
const upgradeCancelBtn = document.getElementById("upgrade-cancel-btn");
const upgradeNoCodeHint = document.getElementById("upgrade-no-code-hint");
const upgradeRequestBtn = document.getElementById("upgrade-request-btn");
const upgradeRequestPending = document.getElementById("upgrade-request-pending");
const upgradeRequestPendingCloseBtn = document.getElementById("upgrade-request-pending-close-btn");
const upgradeRequestFulfilled = document.getElementById("upgrade-request-fulfilled");
const upgradeRequestFulfilledCode = document.getElementById("upgrade-request-fulfilled-code");
const upgradeReadyBanner = document.getElementById("upgrade-ready-banner");

// Set from /auth/me, /auth/login and /auth/upgrade-request's responses —
// null for anyone but a free account, or once dismissed/redeemed.
let pendingUpgradeRequest = null;

function renderUpgradeReadyBanner() {
  upgradeReadyBanner.hidden = !(pendingUpgradeRequest && pendingUpgradeRequest.status === "fulfilled");
}

// The overlay's code-entry form is always available except while a request
// is pending (nothing to type yet). Once admin fulfils that request, the
// code is shown as text above the same form — the user still has to type
// or paste it in and submit themselves, the same as any other code, rather
// than the account being upgraded silently on their behalf.
function renderUpgradeOverlayState() {
  const status = pendingUpgradeRequest && pendingUpgradeRequest.status;
  upgradeForm.hidden = status === "pending";
  upgradeNoCodeHint.hidden = status === "pending" || status === "fulfilled";
  upgradeRequestBtn.hidden = upgradeNoCodeHint.hidden;
  upgradeRequestPending.hidden = status !== "pending";
  upgradeRequestFulfilled.hidden = status !== "fulfilled";
  if (status === "fulfilled") upgradeRequestFulfilledCode.textContent = pendingUpgradeRequest.code || "";
}

function openUpgradeOverlay() {
  upgradeCodeInput.value = "";
  upgradeError.hidden = true;
  renderUpgradeOverlayState();
  upgradeOverlay.hidden = false;
  if (!upgradeForm.hidden) upgradeCodeInput.focus();
}

function closeUpgradeOverlay() {
  upgradeOverlay.hidden = true;
}

upgradeCancelBtn.addEventListener("click", closeUpgradeOverlay);
upgradeRequestPendingCloseBtn.addEventListener("click", closeUpgradeOverlay);
upgradeReadyBanner.addEventListener("click", openUpgradeOverlay);
upgradeOverlay.addEventListener("click", (e) => {
  if (e.target === upgradeOverlay) closeUpgradeOverlay();
});

const UPGRADE_ERROR_KEYS = {
  invalid_code: "authSignupErrorCode",
  not_eligible: "upgradeErrorNotEligible",
};

async function redeemUpgradeCode(specialCode) {
  const { user } = await api("/auth/upgrade", { method: "POST", body: JSON.stringify({ specialCode }) });
  currentUser = user;
  pendingUpgradeRequest = null;
  closeUpgradeOverlay();
  renderUpgradeReadyBanner();
  updateAdminUI();
  renderGoalStepper("quiz");
  renderGoalStepper("spelling");
  refreshSharedWords();
  if (canWriteServerWords()) syncProgressOnLogin();
}

upgradeForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const specialCode = upgradeCodeInput.value.trim();
  upgradeError.hidden = true;
  if (!specialCode) {
    upgradeError.textContent = t("authSignupErrorCode");
    upgradeError.hidden = false;
    return;
  }
  try {
    await redeemUpgradeCode(specialCode);
  } catch (err) {
    const code = err && err.data && err.data.error;
    upgradeError.textContent = t(UPGRADE_ERROR_KEYS[code] || "authSignupErrorGeneric");
    upgradeError.hidden = false;
  }
});

upgradeRequestBtn.addEventListener("click", async () => {
  upgradeRequestBtn.disabled = true;
  try {
    const { request } = await api("/auth/upgrade-request", { method: "POST" });
    pendingUpgradeRequest = request;
    renderUpgradeOverlayState();
    renderUpgradeReadyBanner();
  } catch (e) {
    alert(t("upgradeRequestFailed"));
  }
  upgradeRequestBtn.disabled = false;
});

// A session cookie outlives a page reload, so ask the server who (if anyone)
// this browser is still signed in as before deciding what it may see or change.
async function restoreSession() {
  try {
    const { user, pendingUpgradeRequest: pending } = await api("/auth/me");
    currentUser = user;
    serverAdmin = !!user && user.role === "admin";
    if (serverAdmin) isAdmin = true;
    pendingUpgradeRequest = pending || null;
  } catch (e) {
    currentUser = null;
    serverAdmin = false;
    pendingUpgradeRequest = null;
  }
  updateAdminUI();
  renderUpgradeReadyBanner();
  if (canWriteServerWords()) syncProgressOnLogin();
}

updateAdminUI();
restoreSession();
refreshSharedWords();

/* ================= FLASHCARDS ================= */
const flashCategorySel = document.getElementById("flash-category");
const flashFrontModeSel = document.getElementById("flash-front-mode");
const flashcardEl = document.getElementById("flashcard");
const flashWordEl = document.getElementById("flash-word");
const flashDefEl = document.getElementById("flash-definition");
const flashExampleEl = document.getElementById("flash-example");
const flashSpeakBtn = document.getElementById("flash-speak");
const flashKnowBtn = document.getElementById("flash-know");
const flashDontKnowBtn = document.getElementById("flash-dont-know");
const flashPrevBtn = document.getElementById("flash-prev");
const flashNextBtn = document.getElementById("flash-next");

const flashSourceLevelBtn = document.getElementById("flash-source-level");
const flashSourceMineBtn = document.getElementById("flash-source-mine");
// Two independent switches: level-generated words and/or the kid's own cards.
// At least one always stays on so the deck is never sourceless.
let flashUseLevel = true;
let flashUseMine = false;
const myDeckCard = document.getElementById("my-deck-card");
const myDeckForm = document.getElementById("my-deck-form");
const myDeckWordInput = document.getElementById("my-deck-word");
const myDeckDefInput = document.getElementById("my-deck-definition");
const myDeckExampleInput = document.getElementById("my-deck-example");
const myDeckList = document.getElementById("my-deck-list");
const myDeckEmpty = document.getElementById("my-deck-empty");
const myDeckCountEl = document.getElementById("my-deck-count");
const myDeckClearBtn = document.getElementById("my-deck-clear-btn");
const myDeckModeManualBtn = document.getElementById("my-deck-mode-manual");
const myDeckModeBulkBtn = document.getElementById("my-deck-mode-bulk");
const myDeckModeSearchBtn = document.getElementById("my-deck-mode-search");
const myDeckBulkPanel = document.getElementById("my-deck-bulk");
const myDeckBulkInput = document.getElementById("my-deck-bulk-input");
const myDeckBulkSaveBtn = document.getElementById("my-deck-bulk-save-btn");
const myDeckBulkStatus = document.getElementById("my-deck-bulk-status");
const myDeckSearchPanel = document.getElementById("my-deck-search");
const myDeckSearchInput = document.getElementById("my-deck-search-input");
const myDeckSearchStatus = document.getElementById("my-deck-search-status");
const myDeckSearchResults = document.getElementById("my-deck-search-results");

let flashDeck = [];
let flashIndex = 0;

function getFlashItems(category, level) {
  if (category === "synonyms") {
    return getSynonymPool(level)
      .filter((s) => s.synonym)
      .map((s) => ({
        word: s.word,
        definition: `Synonym: ${s.synonym}`,
        example: `"${s.word}" means the same as "${s.synonym}".`,
      }));
  }
  if (category === "antonyms") {
    return getSynonymPool(level)
      .filter((s) => s.antonym)
      .map((s) => ({
        word: s.word,
        definition: `Antonym: ${s.antonym}`,
        example: `"${s.word}" is the opposite of "${s.antonym}".`,
      }));
  }
  return getVocabPool(level);
}

function usingMyDeck() {
  return flashUseMine;
}

function syncFlashSourceSwitches() {
  [
    [flashSourceLevelBtn, flashUseLevel],
    [flashSourceMineBtn, flashUseMine],
  ].forEach(([btn, on]) => {
    btn.classList.toggle("on", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  });
}

function buildFlashDeck() {
  const items = [];
  const seen = new Set();
  const addAll = (list) =>
    list.forEach((it) => {
      const key = String(it.word).trim().toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      items.push(it);
    });
  // Own cards go in first so a word the kid added themselves wins over the
  // generated copy of the same word when both switches are on.
  if (flashWrongOverride) {
    addAll(flashWrongOverride);
  } else {
    if (flashUseMine) addAll(myDeck.slice());
    if (flashUseLevel) addAll(getFlashItems(flashCategorySel.value, currentLevel));
  }
  flashDeck = shuffle(items);
  flashIndex = 0;
  // The category only applies to the generated deck, and the deck editor
  // (with its list of your cards) shows whenever "My cards" is on.
  flashCategorySel.disabled = !flashUseLevel || !!flashWrongOverride;
  myDeckCard.hidden = !flashUseMine;
  syncFlashSourceSwitches();
  if (flashUseMine) renderMyDeck();
  renderFlashcard();
}

function renderFlashcard() {
  flashcardEl.classList.remove("flipped");
  if (flashDeck.length === 0) {
    flashcardEl.classList.remove("front-meaning");
    flashWordEl.textContent = usingMyDeck() ? t("myDeckEmptyCard") : t("flashEmptyWord");
    flashDefEl.textContent = usingMyDeck() ? t("myDeckEmptyHint") : t("flashEmptyDef", levelLabel(currentLevel));
    flashExampleEl.textContent = "";
    return;
  }
  const item = flashDeck[flashIndex];
  const meaningFirst = flashFrontModeSel.value === "meaning";
  flashcardEl.classList.toggle("front-meaning", meaningFirst);
  // The front/back DOM slots (and their speak-on-tap handlers) always read
  // whatever text is currently shown in them, so swapping which field goes
  // where here is all that's needed to support both front-side modes.
  flashWordEl.textContent = meaningFirst ? item.definition : item.word;
  flashDefEl.textContent = meaningFirst ? item.word : item.definition;
  flashExampleEl.textContent = item.example;
}

// ---- Koala helper above the card: reacts to flip / next / back / know ----
const flashScene = document.getElementById("flash-scene");
const flashBubble = document.getElementById("flash-bubble");
const flashStageEl = document.getElementById("flashcard-stage");
let flashSceneTimer = null;
const FK_CLASSES = ["fk-flip", "fk-next", "fk-prev", "fk-know", "fk-dunno"];
FK_CLASSES.push("fk-hear");
function koalaReact(kind, msgKey, scene = flashScene, bubble = flashBubble, idleKey = "fkIdle") {
  if (!scene) return;
  scene.classList.remove(...FK_CLASSES);
  void scene.offsetWidth; // restart the animation
  scene.classList.add("fk-" + kind);
  const bubbleText = bubble.querySelector(".bubble-text") || bubble;
  bubbleText.textContent = t(msgKey);
  clearTimeout(scene._fkTimer);
  scene._fkTimer = setTimeout(() => {
    scene.classList.remove(...FK_CLASSES);
    bubbleText.textContent = t(idleKey);
  }, 1700);
}
function slideFlashStage(dir) {
  flashStageEl.classList.remove("slide-next", "slide-prev");
  void flashStageEl.offsetWidth;
  flashStageEl.classList.add(dir === "prev" ? "slide-prev" : "slide-next");
}
function flipFlashcard() {
  flashcardEl.classList.toggle("flipped");
  koalaReact("flip", "fkFlip");
}

flashcardEl.addEventListener("click", (e) => {
  if (e.target === flashSpeakBtn) return;
  flipFlashcard();
});

flashSpeakBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  if (!flashDeck.length) return;
  speak(flashWordEl.textContent, {
    onstart: () => flashSpeakBtn.classList.add("speak-btn-active"),
    onend: () => flashSpeakBtn.classList.remove("speak-btn-active"),
  });
});

flashDefEl.addEventListener("click", (e) => {
  e.stopPropagation();
  if (flashDeck.length) speak(flashDefEl.textContent);
});

flashExampleEl.addEventListener("click", (e) => {
  e.stopPropagation();
  if (flashDeck[flashIndex]) speak(flashDeck[flashIndex].example);
});

function nextFlashcard() {
  if (flashDeck.length === 0) return;
  flashIndex = (flashIndex + 1) % flashDeck.length;
  renderFlashcard();
  slideFlashStage("next");
  koalaReact("next", "fkNext");
}

flashNextBtn.addEventListener("click", nextFlashcard);
flashPrevBtn.addEventListener("click", () => {
  if (flashDeck.length === 0) return;
  flashIndex = (flashIndex - 1 + flashDeck.length) % flashDeck.length;
  renderFlashcard();
  slideFlashStage("prev");
  koalaReact("prev", "fkPrev");
});

// ---- Keyboard play: Space hears the word, Left arrow/Backspace goes back,
// Right arrow moves on, Enter flips the card. Skipped while focus is in a
// form control (the category selects, or the My Cards add-word fields), so
// typing and choosing a dropdown option are never hijacked.
document.addEventListener("keydown", (e) => {
  if (!document.getElementById("view-flashcards").classList.contains("active")) return;
  const tag = document.activeElement ? document.activeElement.tagName : "";
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

  if (e.key === " ") {
    e.preventDefault();
    if (tag === "BUTTON") return;
    // Flipped to the back, Space reads out the meaning shown there instead
    // of re-reading the front word — whichever side is actually showing.
    if (flashcardEl.classList.contains("flipped")) {
      if (flashDeck.length) speak(flashDefEl.textContent);
    } else {
      flashSpeakBtn.click();
    }
    return;
  }
  if (e.key === "ArrowLeft" || e.key === "Backspace") {
    e.preventDefault();
    flashPrevBtn.click();
    return;
  }
  if (e.key === "ArrowRight") {
    e.preventDefault();
    flashNextBtn.click();
    return;
  }
  if (e.key === "Enter") {
    e.preventDefault();
    flipFlashcard();
  }
});

flashKnowBtn.addEventListener("click", () => {
  if (flashDeck.length === 0) return;
  const word = flashDeck[flashIndex].word;
  progress.flashKnown[word] = true;
  recordResult(word, true, "flash");
  pulseScoreTag(flashKnowBtn, "option-btn-bounce");
  nextFlashcard();
  koalaReact("know", "fkKnow");
});

flashDontKnowBtn.addEventListener("click", () => {
  if (flashDeck.length === 0) return;
  const word = flashDeck[flashIndex].word;
  delete progress.flashKnown[word];
  recordResult(word, false, "flash");
  nextFlashcard();
  koalaReact("dunno", "fkDunno");
});

flashCategorySel.addEventListener("change", buildFlashDeck);
flashFrontModeSel.addEventListener("change", renderFlashcard);
flashSourceLevelBtn.addEventListener("click", () => {
  // Can't switch the last remaining source off.
  if (flashUseLevel && !flashUseMine) return;
  flashUseLevel = !flashUseLevel;
  buildFlashDeck();
});
flashSourceMineBtn.addEventListener("click", () => {
  if (!flashUseMine && !canUsePaidFeatures()) {
    promptUpgradeForFeature();
    return;
  }
  if (flashUseMine && !flashUseLevel) return;
  flashUseMine = !flashUseMine;
  buildFlashDeck();
});

function renderMyDeck() {
  // Keeps the "in your cards" tags honest when the deck changes underneath.
  if (!myDeckSearchPanel.hidden) renderMyDeckSearch();
  myDeckList.innerHTML = "";
  myDeckCountEl.textContent = myDeck.length ? t("wordlistCount", myDeck.length) : "";
  myDeckEmpty.hidden = myDeck.length > 0;
  myDeckClearBtn.disabled = myDeck.length === 0;

  myDeck
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .forEach((card) => {
      const row = document.createElement("div");
      row.className = "wordlist-item";

      const left = document.createElement("div");
      left.className = "wordlist-item-main";
      const wordEl = document.createElement("div");
      wordEl.className = "w speakable-line";
      wordEl.title = "Tap to hear";
      wordEl.textContent = card.word;
      wordEl.addEventListener("click", () => speak(card.word));
      left.appendChild(wordEl);

      const defEl = document.createElement("div");
      defEl.className = "d";
      defEl.textContent = card.definition;
      left.appendChild(defEl);
      row.appendChild(left);

      const removeBtn = document.createElement("button");
      removeBtn.className = "delete-btn";
      removeBtn.textContent = t("deleteBtn");
      removeBtn.addEventListener("click", () => {
        myDeck = myDeck.filter((c) => c !== card);
        saveMyDeck();
        buildFlashDeck();
      });
      row.appendChild(removeBtn);
      myDeckList.appendChild(row);
    });
}

function setMyDeckMode(mode) {
  myDeckForm.hidden = mode !== "manual";
  myDeckBulkPanel.hidden = mode !== "bulk";
  myDeckSearchPanel.hidden = mode !== "search";
  [
    [myDeckModeManualBtn, "manual"],
    [myDeckModeBulkBtn, "bulk"],
    [myDeckModeSearchBtn, "search"],
  ].forEach(([btn, id]) => {
    btn.classList.toggle("accent", mode === id);
    btn.classList.toggle("neutral", mode !== id);
  });
  if (mode === "search") renderMyDeckSearch();
}

setMyDeckMode("manual");
myDeckModeManualBtn.addEventListener("click", () => setMyDeckMode("manual"));
myDeckModeBulkBtn.addEventListener("click", () => setMyDeckMode("bulk"));
myDeckModeSearchBtn.addEventListener("click", () => setMyDeckMode("search"));

// Looks through every level of the current language track, the same words the
// Word List tab shows, so a card can be built without retyping a meaning.
function searchWordsAcrossLevels(query) {
  const found = [];
  currentSystem().levels.forEach((lv) => {
    getAllWordsForLevel(lv.id).forEach((w) => {
      if (!w.word.toLowerCase().includes(query)) return;
      if (found.some((f) => f.word === w.word)) return;
      found.push(w);
    });
  });
  return found;
}

function renderMyDeckSearch() {
  const query = myDeckSearchInput.value.trim().toLowerCase();
  myDeckSearchResults.innerHTML = "";
  if (!query) {
    myDeckSearchStatus.textContent = t("myDeckSearchHint");
    return;
  }

  const matches = searchWordsAcrossLevels(query).slice(0, 50);
  myDeckSearchStatus.textContent = matches.length ? t("myDeckSearchCount", matches.length) : t("myDeckSearchNone");

  const inDeck = new Set(myDeck.map((c) => c.word.toLowerCase()));
  matches.forEach((w) => {
    const row = document.createElement("div");
    row.className = "wordlist-item";

    const left = document.createElement("div");
    left.className = "wordlist-item-main";
    const wordEl = document.createElement("div");
    wordEl.className = "w";
    wordEl.textContent = w.word;
    left.appendChild(wordEl);
    const defEl = document.createElement("div");
    defEl.className = "d";
    defEl.textContent = w.definition;
    left.appendChild(defEl);
    row.appendChild(left);

    if (inDeck.has(w.word.toLowerCase())) {
      const tag = document.createElement("span");
      tag.className = "mastery high";
      tag.textContent = t("myDeckInDeck");
      row.appendChild(tag);
    } else {
      const addBtn = document.createElement("button");
      addBtn.className = "edit-btn";
      addBtn.textContent = t("myDeckAddOne");
      addBtn.addEventListener("click", () => {
        addToMyDeck([w]);
        buildFlashDeck();
        renderMyDeckSearch();
      });
      row.appendChild(addBtn);
    }
    myDeckSearchResults.appendChild(row);
  });
}

myDeckSearchInput.addEventListener("input", renderMyDeckSearch);

myDeckBulkSaveBtn.addEventListener("click", async () => {
  const words = Array.from(
    new Set(
      myDeckBulkInput.value
        .split(/[\n,]+/)
        .map((w) => w.trim().toLowerCase())
        .filter((w) => /^[a-z']{2,}$/.test(w))
    )
  );
  if (words.length === 0) {
    myDeckBulkStatus.textContent = t("bulkNoWords");
    return;
  }

  myDeckBulkSaveBtn.disabled = true;
  myDeckBulkStatus.textContent = t("ocrAddingStatus", words.length);
  const infos = await mapWithConcurrency(words, 4, (w) => fetchWordInfo(w), (done, total) => {
    myDeckBulkStatus.textContent = t("ocrAddingProgress", done, total);
  });

  const added = addToMyDeck(
    words.map((word, i) => {
      const info = infos[i];
      const meaning = info && (currentLang === "ko" ? info.definitionKo : info.definitionEn);
      return { word, definition: meaning || t("ocrNoDefFound"), example: (info && info.example) || "" };
    })
  );

  myDeckBulkStatus.textContent = t("myDeckAdded", added);
  myDeckBulkInput.value = "";
  myDeckBulkSaveBtn.disabled = false;
  buildFlashDeck();
});

myDeckForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const added = addToMyDeck([
    { word: myDeckWordInput.value, definition: myDeckDefInput.value, example: myDeckExampleInput.value },
  ]);
  myDeckCountEl.textContent = added ? t("wordlistCount", myDeck.length) : t("myDeckDuplicate");
  if (!added) return;
  myDeckForm.reset();
  buildFlashDeck();
});

myDeckClearBtn.addEventListener("click", () => {
  if (myDeck.length === 0) return;
  if (!confirm(t("myDeckClearConfirm", myDeck.length))) return;
  myDeck = [];
  saveMyDeck();
  buildFlashDeck();
});

/* ================= QUIZ ================= */
const quizCategorySel = document.getElementById("quiz-category");
const quizRestartBtn = document.getElementById("quiz-restart");
const quizGoalValueEl = document.getElementById("quiz-goal-value");
const quizGoalMinusBtn = document.getElementById("quiz-goal-minus");
const quizGoalPlusBtn = document.getElementById("quiz-goal-plus");
const quizGoalBanner = document.getElementById("quiz-goal-banner");
const quizGoalMessage = document.getElementById("quiz-goal-message");
const quizGoalNextLevelBtn = document.getElementById("quiz-goal-next-level");
const quizGoalDismissBtn = document.getElementById("quiz-goal-dismiss");
let quizGoalCelebrated = false;
const quizQuestionEl = document.getElementById("quiz-question");
const quizOptionsEl = document.getElementById("quiz-options");
// Shared by every ".score-tag" (Quiz, Spelling, Typing Game, Times Table):
// a quick scale+color pulse each time the label's text changes, so scoring
// a point actually feels like something instead of a number silently
// ticking over. Restarting the animation on an element that's mid-pulse
// needs the class removed and re-added on the next frame — toggling it
// straight back on with the same class already present is a no-op in CSS.
function pulseScoreTag(el, className = "score-tag-pulse") {
  if (!el) return;
  el.classList.remove(className);
  // eslint-disable-next-line no-unused-expressions
  void el.offsetWidth; // force reflow so the removed class actually "sticks" before re-adding it
  el.classList.add(className);
}

const quizScoreEl = document.getElementById("quiz-score");
const quizNextBtn = document.getElementById("quiz-next");
const quizProgressFill = document.getElementById("quiz-progress-fill");
const quizTrail = document.getElementById("quiz-trail");
let quizTrailLastPct = 0;
let quizTrailMoveTimer = null;

// Moves the quiz progress bar AND the crawling koala on it. The koala walks
// (legs swing) while the position is changing, munches the leaves it passes
// (they fade as it reaches them), and is happy once it reaches the tree.
function setTrailProgress(trail, fill, pct) {
  const p = Math.max(0, Math.min(100, pct)) / 100;
  fill.style.width = `calc(var(--kw) - 8px + ${p} * (100% - var(--kw) + 8px))`;
  if (p === 0) fill.style.width = "0";
  trail.style.setProperty("--p", String(p));
  const last = trail._lastPct || 0;
  const backwards = pct < last;
  trail.classList.toggle("no-anim", backwards);
  if (!backwards && pct !== last) {
    trail.classList.add("moving");
    clearTimeout(trail._moveTimer);
    trail._moveTimer = setTimeout(() => trail.classList.remove("moving"), 750);
  } else if (backwards) {
    trail.classList.remove("moving");
  }
  trail.classList.toggle("done", p >= 1);
  trail.querySelectorAll(".trail-leaf").forEach((leaf) => {
    leaf.classList.toggle("eaten", p >= parseFloat(leaf.style.getPropertyValue("--x")) - 0.001 && p > 0);
  });
  trail._lastPct = pct;
}
function setQuizProgress(pct) {
  setTrailProgress(quizTrail, quizProgressFill, pct);
}

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
  quizGoalBanner.hidden = true;
  quizGoalCelebrated = false;
  const cat = quizCategorySel.value;
  let pool;
  if (cat === "synonyms") pool = buildSynonymQuestions(currentLevel);
  else if (cat === "homophones") pool = buildHomophoneQuestions(currentLevel);
  else pool = buildVocabQuestions(currentLevel);

  // The stepper can't be dragged past what's actually available, but the
  // pool itself can shrink out from under a stored preference (switching
  // category/level, or words disappearing) — clamp down here too so
  // "Number of Questions" and the Score denominator never disagree.
  if (pool.length >= GOAL_MIN && goals.quiz > pool.length) {
    goals.quiz = pool.length;
    saveGoals();
  }

  quizQuestions = pickWordsForSession(pool, goals.quiz, (q) => q.target);
  quizIndex = 0;
  quizScore = 0;
  quizAnswered = false;
  renderGoalStepper("quiz");
  renderQuizQuestion();
}

function renderQuizQuestion() {
  quizNextBtn.style.display = "none";
  quizAnswered = false;
  const total = quizQuestions.length;
  // Only the "round complete" state below styles quiz-question as a
  // celebration card — every other branch clears it back to a plain
  // question line first.
  quizQuestionEl.classList.remove("celebration-card", "quiz-complete-card");

  if (quizSpeakWrap) quizSpeakWrap.hidden = total === 0 || quizIndex >= total;
  if (total === 0) {
    setQuizProgress(0);
    quizQuestionEl.textContent = t("quizNotEnough", levelLabel(currentLevel));
    quizOptionsEl.innerHTML = "";
    updateQuizScoreLabel();
    return;
  }

  setQuizProgress((quizIndex / total) * 100);

  if (quizIndex >= total) {
    quizQuestionEl.classList.add("celebration-card", "quiz-complete-card");
    quizQuestionEl.innerHTML = "";
    const icon = document.createElement("span");
    icon.className = "celebration-card-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "🏆";
    const text = document.createElement("span");
    text.className = "celebration-card-text";
    text.textContent = t("quizComplete", quizScore, total);
    if (canUsePaidFeatures() && total >= 5 && quizScore === total && !quizQuestions._awarded) {
      quizQuestions._awarded = true;
      ensureRewardData();
      progress.counters.quizPerfect++;
      saveProgress();
      checkBadges();
    }
    quizQuestionEl.appendChild(icon);
    quizQuestionEl.appendChild(text);
    quizOptionsEl.innerHTML = "";
    setQuizProgress(100);
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
  // Arrow-key navigation always starts back on the first option for a fresh
  // question, so Enter alone (with no arrow press at all) still answers it.
  quizFocusIndex = 0;
  highlightQuizOption(quizFocusIndex);
  updateQuizScoreLabel();
}

// ---- Keyboard play: arrow keys move a highlight between the option
// buttons, Enter answers with whichever one is highlighted, and — once the
// question is answered — a second Enter presses "Next Question" for you,
// so a question can be played start to finish without touching the mouse.
let quizFocusIndex = 0;
// The highlight ring is only meaningful once someone is actually steering
// with arrow keys — showing it on every freshly-rendered question (before
// any key has been touched) just reads as a stray blue border around the
// first option for anyone playing with the mouse. So it stays off until the
// first arrow-key press, then persists question-to-question after that.
let quizKeyboardNavUsed = false;

function highlightQuizOption(index) {
  Array.from(quizOptionsEl.children).forEach((b, i) => {
    b.classList.toggle("option-btn-kbd-focus", quizKeyboardNavUsed && i === index);
  });
}

function quizOptionColumns() {
  const cols = getComputedStyle(quizOptionsEl).gridTemplateColumns.split(" ").filter(Boolean).length;
  return cols || 1;
}

document.addEventListener("keydown", (e) => {
  if (!document.getElementById("view-quiz").classList.contains("active")) return;
  const tag = document.activeElement ? document.activeElement.tagName : "";
  if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;

  const opts = Array.from(quizOptionsEl.children);
  if (!opts.length) return;

  if (!quizAnswered) {
    const cols = quizOptionColumns();
    let handled = true;
    if (e.key === "ArrowRight") { quizFocusIndex = Math.min(quizFocusIndex + 1, opts.length - 1); quizKeyboardNavUsed = true; }
    else if (e.key === "ArrowLeft") { quizFocusIndex = Math.max(quizFocusIndex - 1, 0); quizKeyboardNavUsed = true; }
    else if (e.key === "ArrowDown") { quizFocusIndex = Math.min(quizFocusIndex + cols, opts.length - 1); quizKeyboardNavUsed = true; }
    else if (e.key === "ArrowUp") { quizFocusIndex = Math.max(quizFocusIndex - cols, 0); quizKeyboardNavUsed = true; }
    else if (e.key === "Enter") opts[quizFocusIndex].click();
    else handled = false;
    if (handled) {
      e.preventDefault();
      highlightQuizOption(quizFocusIndex);
    }
  } else if (e.key === "Enter" && quizNextBtn.style.display !== "none") {
    e.preventDefault();
    quizNextBtn.click();
  }
});

function handleQuizAnswer(btn, chosen, q) {
  if (quizAnswered) return;
  quizAnswered = true;
  const correct = chosen === q.answer;
  if (correct) quizScore++;

  progress.quiz.total++;
  if (correct) progress.quiz.correct++;
  recordResult(q.target, correct, "quiz");
  recordSrsResult(q.target, correct);
  saveProgress();

  Array.from(quizOptionsEl.children).forEach((b) => {
    b.disabled = true;
    if (b.textContent === q.answer) {
      b.classList.add("correct");
      if (correct) pulseScoreTag(b, "option-btn-bounce");
    } else if (b === btn) b.classList.add("incorrect");
  });

  quizNextBtn.style.display = "inline-block";
  updateQuizScoreLabel();

  const goal = goals.quiz;
  if (goal && !quizGoalCelebrated && quizScore >= goal) {
    quizGoalCelebrated = true;
    showGoalReached(quizGoalBanner, quizGoalMessage, quizGoalNextLevelBtn, quizScore);
  }
}

function updateQuizScoreLabel() {
  quizScoreEl.textContent = t("scoreLabel", quizScore, quizQuestions.length);
  pulseScoreTag(quizScoreEl);
}

quizNextBtn.addEventListener("click", () => {
  quizIndex++;
  renderQuizQuestion();
});

quizQuestionEl.addEventListener("click", () => speak(quizQuestionEl.textContent));
const quizSpeakBtn = document.getElementById("quiz-speak");
const quizSpeakWrap = document.getElementById("quiz-speak-wrap");
quizSpeakBtn.addEventListener("click", () => {
  speak(quizQuestionEl.textContent, {
    onstart: () => quizSpeakBtn.classList.add("speak-btn-active"),
    onend: () => quizSpeakBtn.classList.remove("speak-btn-active"),
  });
});

quizRestartBtn.addEventListener("click", () => {
  pulseScoreTag(quizRestartBtn, "score-tag-pulse");
  buildQuizQuestions();
});
quizCategorySel.addEventListener("change", buildQuizQuestions);

quizGoalMinusBtn.addEventListener("click", () => {
  goals.quiz = Math.max(GOAL_MIN, goals.quiz - GOAL_STEP);
  saveGoals();
  renderGoalStepper("quiz");
  buildQuizQuestions();
});

quizGoalPlusBtn.addEventListener("click", () => {
  const poolMax = quizPoolSizeForCurrentCategory();
  if (goals.quiz >= poolMax) return; // no more questions available at all, regardless of tier
  if (!currentUser && goals.quiz >= GOAL_MAX_ANONYMOUS) {
    promptSignupForMoreQuestions();
    return;
  }
  if (currentUser && currentUser.role === "free" && goals.quiz >= GOAL_MAX_FREE) {
    openUpgradeOverlay();
    return;
  }
  goals.quiz = Math.min(goalMaxFor(), poolMax, goals.quiz + GOAL_STEP);
  saveGoals();
  renderGoalStepper("quiz");
  buildQuizQuestions();
});

quizGoalDismissBtn.addEventListener("click", () => {
  quizGoalBanner.hidden = true;
});

quizGoalNextLevelBtn.addEventListener("click", () => {
  const next = nextLevelId();
  if (!next) return;
  applyLevel(next);
  goToTab("quiz");
  buildQuizQuestions();
});

/* ================= SPELLING ================= */
const spellingStartScreen = document.getElementById("spelling-start-screen");
const spellingStartBtn = document.getElementById("spelling-start-btn");
const spellingPractice = document.getElementById("spelling-practice");
const spellingSpeakBtn = document.getElementById("spelling-speak");
const spellingInput = document.getElementById("spelling-input");
const spellingFeedback = document.getElementById("spelling-feedback");
const spellingBackBtn = document.getElementById("spelling-back");
const spellingCheckBtn = document.getElementById("spelling-check");
const spellingNextBtn = document.getElementById("spelling-next");
const spellingScoreEl = document.getElementById("spelling-score");
const spellingGoalValueEl = document.getElementById("spelling-goal-value");
const spellingGoalMinusBtn = document.getElementById("spelling-goal-minus");
const spellingGoalPlusBtn = document.getElementById("spelling-goal-plus");
const spellingGoalBanner = document.getElementById("spelling-goal-banner");
const spellingGoalMessage = document.getElementById("spelling-goal-message");
const spellingGoalNextLevelBtn = document.getElementById("spelling-goal-next-level");
const spellingGoalDismissBtn = document.getElementById("spelling-goal-dismiss");
let spellingGoalCelebrated = false;
const spellingFinishBtn = document.getElementById("spelling-finish-btn");
const spellingReport = document.getElementById("spelling-report");
const spellingReportList = document.getElementById("spelling-report-list");
const spellingReportEmpty = document.getElementById("spelling-report-empty");
const spellingReportScoreEl = document.getElementById("spelling-report-score");
const spellingReportRestartBtn = document.getElementById("spelling-report-restart");

let spellingDeck = [];
let spellingIndex = 0;
let spellingScore = { correct: 0, total: 0 };
let spellingTotalCountedWords = new Set(); // this round only — stops a retried word double-counting "total"
let spellingWrongThisRound = new Set(); // this round only — word had >=1 wrong attempt, so it can't earn "correct" credit this round
let spellingCreditedWords = new Set(); // this round only — word already earned "correct" credit, so a duplicate/re-submitted check can't award it twice
let spellingSessionWrongWords = new Map(); // word -> {word, meaning} — for the end-of-round report
let spellingCurrentChecked = false; // has the current word passed a "Check Answer" yet — gates the Next button

// resetScreen: false is used when the round is being resized in place (the
// Number of Questions stepper) rather than freshly entered — it keeps
// whichever screen (start / practice) was already showing instead of
// bouncing back to "Start the first word".
function buildSpellingDeck({ resetScreen = true } = {}) {
  spellingGoalBanner.hidden = true;
  spellingGoalCelebrated = false;
  const pool = getSpellingPool(currentLevel);

  // The stepper can't be dragged past what's actually available, but the
  // pool itself can shrink out from under a stored preference (switching
  // level, or words disappearing) — clamp down here too so "Number of
  // Questions" and the Score denominator never disagree.
  if (pool.length >= GOAL_MIN && goals.spelling > pool.length) {
    goals.spelling = pool.length;
    saveGoals();
  }

  // Overdue-for-review words first (most overdue first), then never-seen
  // words, then words not due yet — see pickWordsForSession(). This
  // replaces the old wrong/untried/done split with a real spaced-repetition
  // schedule; progress.spellingStatus itself is untouched and keeps driving
  // whatever else already reads it (e.g. the mastery badge).
  spellingDeck = pickWordsForSession(pool, goals.spelling);
  spellingIndex = 0;
  spellingScore = { correct: 0, total: 0 };
  spellingTotalCountedWords = new Set();
  spellingWrongThisRound = new Set();
  spellingCreditedWords = new Set();
  spellingSessionWrongWords = new Map();
  renderGoalStepper("spelling");
  updateSpellingScoreLabel();
  spellingInput.value = "";
  spellingInput.className = "";
  spellingFeedback.innerHTML = "";
  if (resetScreen) {
    spellingStartScreen.hidden = false;
    spellingPractice.hidden = true;
    spellingReport.hidden = true;
  } else if (!spellingPractice.hidden) {
    // Adjusting the question-count stepper mid-session rebuilds the deck,
    // but the player didn't ask to hear word 1 again for every click —
    // only reset the UI, don't re-trigger its audio.
    loadSpellingWord(false);
  }
}

// ---- Live practice screen: koala coach, star progress, confetti ----
const spellingScene = document.getElementById("spelling-scene");
const spellingBubble = document.getElementById("spelling-bubble");
const spellingProgressEl = document.getElementById("spelling-progress");
// Same koala artwork as the Flashcards helper, dropped in before the bubble.
// Full-body koala (sitting on a branch) — shares the fk-* class names so the
// same reaction animations drive it.
const SPELL_KOALA_SVG = `<svg class="sk-svg" viewBox="0 0 200 205" width="170" height="174">
  <rect x="14" y="181" width="172" height="12" rx="6" fill="#b98b5a"/>
  <path d="M150 182 q14 -18 30 -10 q-6 16 -30 10z" fill="#3fb984"/><path d="M28 182 q-10 -16 -24 -8 q6 14 24 8z" fill="#3fb984"/>
  <g class="fk-koala">
    <ellipse cx="72" cy="182" rx="20" ry="9" fill="#8d9c97"/><ellipse cx="128" cy="182" rx="20" ry="9" fill="#8d9c97"/>
    <ellipse class="sk-body" cx="100" cy="146" rx="46" ry="40" fill="#a9b7b2"/>
    <ellipse class="sk-body sk-belly" cx="100" cy="152" rx="28" ry="28" fill="#e3ebe8"/>
    <ellipse cx="66" cy="168" rx="20" ry="15" fill="#a9b7b2"/><ellipse cx="134" cy="168" rx="20" ry="15" fill="#a9b7b2"/>
    <g class="fk-paw fk-paw-l" style="transform-origin:64px 124px"><line x1="64" y1="124" x2="46" y2="152" stroke="#a9b7b2" stroke-width="14" stroke-linecap="round"/><circle cx="45" cy="154" r="8" fill="#8d9c97"/></g>
    <g class="fk-paw fk-paw-r" style="transform-origin:136px 124px"><line x1="136" y1="124" x2="154" y2="152" stroke="#a9b7b2" stroke-width="14" stroke-linecap="round"/><circle cx="155" cy="154" r="8" fill="#8d9c97"/></g>
    <g class="fk-head" style="transform-origin:100px 112px">
      <circle cx="50" cy="66" r="24" fill="#a9b7b2"/><circle cx="50" cy="66" r="15" fill="#eef2f0"/>
      <path d="M42 62 q6 -6 12 0 M40 70 q8 -5 14 1" stroke="#c9d3cf" stroke-width="2" fill="none" stroke-linecap="round"/>
      <circle cx="150" cy="66" r="24" fill="#a9b7b2"/><circle cx="150" cy="66" r="15" fill="#eef2f0"/>
      <path d="M146 62 q6 -6 12 0 M146 71 q8 -5 14 1" stroke="#c9d3cf" stroke-width="2" fill="none" stroke-linecap="round"/>
      <ellipse cx="100" cy="82" rx="46" ry="40" fill="#a9b7b2"/>
      <ellipse cx="100" cy="96" rx="30" ry="22" fill="#c4cfcb"/>
      <circle class="sk-cheek" cx="72" cy="94" r="7" fill="#ff7a90" opacity="0.45"/><circle class="sk-cheek" cx="128" cy="94" r="7" fill="#ff7a90" opacity="0.45"/>
      <g class="fk-eyes"><circle cx="82" cy="76" r="5.2" fill="#1f2a27"/><circle cx="118" cy="76" r="5.2" fill="#1f2a27"/><circle cx="84" cy="74" r="1.7" fill="#fff"/><circle cx="120" cy="74" r="1.7" fill="#fff"/></g>
      <g class="fk-eyes-happy"><path d="M75 79 Q82 68 89 79" fill="none" stroke="#1f2a27" stroke-width="3" stroke-linecap="round"/><path d="M111 79 Q118 68 125 79" fill="none" stroke="#1f2a27" stroke-width="3" stroke-linecap="round"/></g>
      <ellipse cx="100" cy="92" rx="15" ry="18" fill="#1f2a27"/><ellipse cx="95" cy="85" rx="4.5" ry="2.6" fill="#fff" opacity="0.35"/>
      <path class="sk-mouth" d="M90 116 Q100 123 110 116" stroke="#1f2a27" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <g class="sk-mouth-open"><ellipse cx="100" cy="119" rx="10" ry="8" fill="#7a2233"/><ellipse cx="100" cy="123" rx="6" ry="3.4" fill="#ff7a90"/></g>
      <polygon points="100,26 150,41 100,58 50,41" fill="#26332f"/>
      <rect x="80" y="50" width="40" height="10" rx="3" fill="#26332f"/>
      <line x1="146" y1="42" x2="146" y2="62" stroke="#ffd166" stroke-width="2.6"/><circle cx="146" cy="65" r="3.4" fill="#ffd166"/>
    </g>
  </g>
  <g class="sk-eatpaw" style="transform-origin:136px 124px"><line x1="136" y1="124" x2="154" y2="152" stroke="#a9b7b2" stroke-width="14" stroke-linecap="round"/><circle cx="155" cy="154" r="8" fill="#8d9c97"/><g class="sk-eatleaf"><path d="M147 150 C152 138 170 138 178 152 C170 164 152 164 147 150Z" fill="#3fb984" stroke="#0e9c7d" stroke-width="2"/><path d="M149 151 H174" stroke="#0e9c7d" stroke-width="1.6" stroke-linecap="round"/></g></g>
  <circle class="sk-crumb sk-crumb-1" cx="100" cy="122" r="3" fill="#3fb984"/><circle class="sk-crumb sk-crumb-2" cx="100" cy="122" r="2.4" fill="#0e9c7d"/><circle class="sk-crumb sk-crumb-3" cx="100" cy="122" r="2.8" fill="#3fb984"/>
  <text class="fk-spark fk-spark-1" x="10" y="50" font-size="20">✨</text>
  <text class="fk-spark fk-spark-2" x="172" y="44" font-size="20">⭐</text>
  <text class="sk-heart sk-heart-1" x="30" y="70" font-size="22">💚</text><text class="sk-heart sk-heart-2" x="150" y="64" font-size="22">💚</text><text class="sk-heart sk-heart-3" x="92" y="20" font-size="22">💚</text>
</svg>`;
spellingScene.insertAdjacentHTML("afterbegin", SPELL_KOALA_SVG);
function spellingReact(kind, msgKey) {
  koalaReact(kind, msgKey, spellingScene, spellingBubble, "spLiveIdle");
}
// Leaf branch: one leaf per word. Each correct answer, the koala eats a leaf
// and its belly gets rounder; after the last leaf it is completely happy.
const spellingBranch = document.createElement("div");
spellingBranch.className = "sp-branch";
spellingBranch.id = "spelling-branch";
document.getElementById("spelling-trail-slot").appendChild(spellingBranch);
const LEAF_SVG = '<svg viewBox="0 0 40 28" width="30" height="21" aria-hidden="true"><path d="M2 14 C10 0 28 0 38 14 C28 28 10 28 2 14Z" fill="#3fb984" stroke="#0e9c7d" stroke-width="2"/><path d="M4 14 H34" stroke="#0e9c7d" stroke-width="1.8" stroke-linecap="round"/></svg>';
let spellingLeafTotal = 0, spellingLeafEaten = 0;
function buildSpellingBranch(n) {
  spellingLeafTotal = Math.min(Math.max(n, 0), 15);
  spellingLeafEaten = 0;
  spellingBranch.innerHTML = '<div class="sp-twig"></div>' + Array.from({ length: spellingLeafTotal }, (_, i) =>
    `<span class="sp-leaf" data-i="${i}" style="--r:${(i % 2 ? 1 : -1) * (8 + (i * 7) % 10)}deg">${LEAF_SVG}</span>`).join("");
  spellingScene.style.setProperty("--fed", "0");
  spellingScene.classList.remove("sk-full");
}
function flyLeafToKoalaEl(leaf, sceneEl, ms) {
  const koala = sceneEl.querySelector(".sk-svg");
  if (!leaf || !koala) return;
  const lr = leaf.getBoundingClientRect(), kr = koala.getBoundingClientRect();
  const fly = leaf.cloneNode(true);
  fly.className = "sp-leaf-fly";
  fly.style.left = lr.left + "px"; fly.style.top = lr.top + "px";
  document.body.appendChild(fly);
  const tx = kr.left + kr.width * (160 / 200) - lr.left - lr.width / 2;
  const ty = kr.top + kr.height * (150 / 205) - lr.top - lr.height / 2;
  const frames = [
    { transform: "translate(0,0) rotate(0deg)", offset: 0 },
    { transform: `translate(${tx * 0.2 - 16}px,${ty * 0.35}px) rotate(-50deg)`, offset: 0.35 },
    { transform: `translate(${tx * 0.7 + 12}px,${ty * 0.7}px) rotate(35deg)`, offset: 0.7 },
    { transform: `translate(${tx}px,${ty}px) rotate(10deg)`, offset: 1 },
  ];
  fly.animate(frames, { duration: ms, easing: "ease-in", fill: "forwards" }).onfinish = () => fly.remove();
}
function flyLeafToKoala(leaf) {
  const koala = spellingScene.querySelector(".sk-svg");
  if (!leaf || !koala) return;
  const lr = leaf.getBoundingClientRect(), kr = koala.getBoundingClientRect();
  const fly = leaf.cloneNode(true);
  fly.className = "sp-leaf-fly";
  fly.style.left = lr.left + "px"; fly.style.top = lr.top + "px";
  document.body.appendChild(fly);
  // land in the koala's right paw (svg point 155,154)
  const tx = kr.left + kr.width * (160 / 200) - lr.left - lr.width / 2;
  const ty = kr.top + kr.height * (150 / 205) - lr.top - lr.height / 2;
  const frames = [
    { transform: "translate(0,0) rotate(0deg)", offset: 0 },
    { transform: `translate(${tx * 0.15 - 22}px,${ty * 0.28}px) rotate(-55deg)`, offset: 0.3 },
    { transform: `translate(${tx * 0.55 + 20}px,${ty * 0.62}px) rotate(40deg)`, offset: 0.62 },
    { transform: `translate(${tx * 0.9 - 8}px,${ty * 0.9}px) rotate(-15deg)`, offset: 0.85 },
    { transform: `translate(${tx}px,${ty}px) rotate(10deg)`, offset: 1 },
  ];
  const anim = fly.animate(frames, { duration: 900, easing: "ease-in", fill: "forwards" });
  anim.onfinish = () => fly.remove();
}
let spellingEatTimers = [];
function koalaEatSequence(full, fed) {
  spellingEatTimers.forEach(clearTimeout); spellingEatTimers = [];
  const sc = spellingScene;
  sc.classList.remove("sk-eat", "sk-gulp");
  const at = (ms, fn) => spellingEatTimers.push(setTimeout(fn, ms));
  at(880, () => { sc.classList.add("sk-eat"); spellingBubble.querySelector(".bubble-text").textContent = t("spLiveOk"); });
  at(2350, () => {
    sc.classList.remove("sk-eat");
    sc.style.setProperty("--fed", fed.toFixed(3));
    void sc.offsetWidth; sc.classList.add("sk-gulp");
    if (full) { sc.classList.add("sk-full"); spellingBubble.querySelector(".bubble-text").textContent = t("spLiveFull"); }
  });
  at(3200, () => sc.classList.remove("sk-gulp"));
}
function renderSpellingProgress(advanced = false) {
  const n = spellingDeck.length;
  if (!n) { spellingProgressEl.textContent = ""; buildSpellingBranch(0); return; }
  if (spellingBranch.dataset.n !== String(n)) { spellingBranch.dataset.n = String(n); buildSpellingBranch(n); }
  const cur = Math.min(spellingIndex, n - 1);
  spellingProgressEl.textContent = t("spProgressLabel", cur + 1, n);
  const done = cur + (advanced ? 1 : 0);
  const target = Math.round((done / n) * spellingLeafTotal);
  const leaves = spellingBranch.querySelectorAll(".sp-leaf");
  leaves.forEach((l, i) => {
    const eaten = i < target;
    if (eaten && !l.classList.contains("eaten") && advanced && i === spellingLeafEaten) flyLeafToKoala(l);
    l.classList.toggle("eaten", eaten);
  });
  spellingLeafEaten = target;
  const fed = done / n;
  const full = done >= n;
  if (advanced) {
    koalaEatSequence(full, fed);
  } else {
    spellingEatTimers.forEach(clearTimeout); spellingEatTimers = [];
    spellingScene.classList.remove("sk-eat", "sk-gulp");
    spellingScene.style.setProperty("--fed", fed.toFixed(3));
    spellingScene.classList.toggle("sk-full", full);
  }
}
function koalaTalk(on, safetyMs = 4000) {
  clearTimeout(spellingScene._talkT);
  spellingScene.classList.toggle("sk-talk", on);
  spellingSpeakBtn.classList.toggle("sk-wave", on);
  if (on) spellingScene._talkT = setTimeout(() => { spellingScene.classList.remove("sk-talk"); spellingSpeakBtn.classList.remove("sk-wave"); }, safetyMs);
}

// ---- Koala buddy: compact koala strip reused by Quiz / Typing / Times Table ----
const KB_GAME_FULL = 25; // cleared words/facts for a completely full belly
const CLOUD_SVG = '<svg viewBox="0 0 120 68" class="sp-cloud-bg"><path d="M28 50 C12 50 6 36 16 28 C10 14 28 6 40 14 C46 2 70 2 78 14 C92 6 112 16 104 30 C116 38 108 52 92 50 C80 58 40 58 28 50 Z" fill="#fff" stroke="#0e9c7d" stroke-width="2.6" stroke-linejoin="round"/><circle cx="62" cy="60" r="3.6" fill="#fff" stroke="#0e9c7d" stroke-width="2"/></svg>';
const KB_ANCHORS = {
  type: () => document.querySelector("#typegame-start-overlay h3"),
  tt: () => document.getElementById("timestable-start-btn"),
};
const KB_REG = {};
function kb(key) {
  if (KB_REG[key]) return KB_REG[key];
  let anchor;
  try { anchor = KB_ANCHORS[key](); void SPELL_KOALA_SVG; } catch (e) { return null; }
  if (!anchor) return null;
  const strip = document.createElement("div");
  strip.className = "kb-strip kb-" + key;
  strip.innerHTML = `<div class="sp-live-scene kb-scene" aria-hidden="true">${SPELL_KOALA_SVG}</div><div class="sp-cloud kb-cloud" aria-hidden="true">${CLOUD_SVG}<span class="bubble-text"></span></div>`;
  anchor.before(strip);
  const scene = strip.querySelector(".kb-scene");
  const bubble = strip.querySelector(".kb-cloud");
  const text = bubble.querySelector(".bubble-text");
  const b = { scene, timers: [], eating: false, target: null };
  const at = (ms, fn) => b.timers.push(setTimeout(fn, ms));
  const say = (k, keep) => { text.textContent = t(k); clearTimeout(b.sayT); if (!keep) b.sayT = setTimeout(() => { text.textContent = t("kbIdle"); }, 2200); };
  b.say = say;
  b.reset = () => {
    b.timers.forEach(clearTimeout); b.timers = []; b.eating = false; b.target = null;
    scene.classList.remove("sk-eat", "sk-quick", "sk-gulp", "sk-full", "fk-dunno");
    scene.style.setProperty("--fed", "0");
    say("kbIdle", true);
  };
  b.eat = (fed, full, quick) => {
    b.target = { fed, full };
    if (b.eating) return;
    b.eating = true;
    // a leaf drops from above into the paw
    const kr = scene.querySelector(".sk-svg").getBoundingClientRect();
    const fake = document.createElement("span");
    fake.innerHTML = LEAF_SVG;
    const src = { getBoundingClientRect: () => ({ left: kr.left + kr.width * 0.55, top: kr.top - 60, width: 30, height: 21 }), cloneNode: () => fake.cloneNode(true) };
    flyLeafToKoalaEl(src, scene, quick ? 480 : 900);
    at(quick ? 480 : 880, () => { scene.classList.add("sk-eat"); scene.classList.toggle("sk-quick", !!quick); say("kbYum"); });
    at(quick ? 1450 : 2350, () => {
      scene.classList.remove("sk-eat", "sk-quick");
      scene.style.setProperty("--fed", b.target.fed.toFixed(3));
      void scene.offsetWidth; scene.classList.add("sk-gulp");
      if (b.target.full) { scene.classList.add("sk-full"); say("spLiveFull", true); }
      b.eating = false;
    });
    at((quick ? 1450 : 2350) + 800, () => scene.classList.remove("sk-gulp"));
  };
  b.oops = () => { koalaReact("dunno", "kbOops", scene, bubble, "kbIdle"); };
  b.over = () => { b.timers.forEach(clearTimeout); b.timers = []; b.eating = false; scene.classList.remove("sk-eat", "sk-quick"); koalaReact("dunno", "kbOver", scene, bubble, "kbIdle"); };
  KB_REG[key] = b;
  say("kbIdle", true);
  return b;
}
function spellingConfetti() {
  const box = spellingPractice;
  const bits = ["⭐", "✨", "🌿", "🎉", "🍃", "💚"];
  for (let i = 0; i < 12; i++) {
    const s = document.createElement("span");
    s.className = "sp-confetti";
    s.textContent = bits[i % bits.length];
    const ang = (Math.PI * 2 * i) / 12 + Math.random() * 0.4;
    const dist = 70 + Math.random() * 60;
    s.style.setProperty("--dx", `${Math.cos(ang) * dist}px`);
    s.style.setProperty("--dy", `${Math.sin(ang) * dist - 30}px`);
    box.appendChild(s);
    setTimeout(() => s.remove(), 1000);
  }
}

spellingStartBtn.addEventListener("click", () => {
  spellingStartScreen.hidden = true;
  spellingPractice.hidden = false;
  loadSpellingWord();
});

function loadSpellingWord(speakAloud = true) {
  spellingInput.value = "";
  spellingInput.className = "";
  spellingFeedback.innerHTML = "";
  spellingCurrentChecked = false;
  spellingNextBtn.disabled = true;
  if (spellingDeck.length === 0) {
    spellingFeedback.textContent = t("spellingEmpty", levelLabel(currentLevel));
    spellingBackBtn.disabled = true;
    renderSpellingLetterHints(null);
    return;
  }
  if (spellingIndex >= spellingDeck.length) {
    spellingDeck = shuffle(spellingDeck);
    spellingIndex = 0;
  }
  spellingBackBtn.disabled = spellingIndex === 0;
  renderSpellingProgress();
  if (speakAloud) {
    spellingReact("hear", "spLiveHear");
    spellingSpeakBtn.click();
  }
  renderSpellingLetterHints(spellingDeck[spellingIndex].word);
  spellingInput.focus();
}

// A scrambled tray of the current word's own letters, plus one or two decoy
// letters that don't belong in it — a lighter-touch hint than spelling the
// whole thing out, and enough of a nudge for a stuck speller without
// removing the typing itself. Tapping a tile appends that letter to the
// input rather than replacing it, so it works alongside typing, not instead
// of it.
const spellingHintTray = document.getElementById("spelling-hint-tray");
const SPELLING_DECOY_POOL = "abcdefghijklmnopqrstuvwxyz";

function renderSpellingLetterHints(word) {
  if (!spellingHintTray) return;
  spellingHintTray.innerHTML = "";
  if (!word) return;
  const letters = word.toLowerCase().split("").filter((ch) => /[a-z]/.test(ch));
  if (!letters.length) return;
  const decoyCount = Math.random() < 0.5 ? 1 : 2;
  const decoys = [];
  let guard = 0;
  while (decoys.length < decoyCount && guard < 100) {
    guard++;
    const candidate = SPELLING_DECOY_POOL[Math.floor(Math.random() * SPELLING_DECOY_POOL.length)];
    // A decoy that's just another copy of a letter already in the word
    // wouldn't actually mislead anyone — it'd just look like a spare correct
    // tile, so it's skipped in favor of a letter genuinely not needed.
    if (!letters.includes(candidate)) decoys.push(candidate);
  }
  // Tracks, for every tile currently "used", exactly which character
  // position in the input it inserted — so tapping the same tile again can
  // remove that one character instead of just clearing the whole answer,
  // even when several tiles share the same letter.
  const activeInsertions = [];
  shuffle([...letters, ...decoys]).forEach((letter) => {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "spelling-hint-tile";
    tile.textContent = letter;
    tile.setAttribute("aria-label", `${letter}`);
    tile.addEventListener("click", () => {
      const record = activeInsertions.find((r) => r.tile === tile);
      if (record) {
        // Toggle off: remove the exact character this tile added.
        const idx = record.index;
        if (spellingInput.value[idx] === letter) {
          spellingInput.value = spellingInput.value.slice(0, idx) + spellingInput.value.slice(idx + 1);
        } else {
          // The input shifted in some unexpected way (manual edit) — fall
          // back to removing the last occurrence of the letter instead of
          // doing nothing.
          const lastIdx = spellingInput.value.lastIndexOf(letter);
          if (lastIdx !== -1) {
            spellingInput.value = spellingInput.value.slice(0, lastIdx) + spellingInput.value.slice(lastIdx + 1);
          }
        }
        // Every insertion recorded after this one just shifted left by one.
        activeInsertions.forEach((r) => {
          if (r !== record && r.index > idx) r.index -= 1;
        });
        activeInsertions.splice(activeInsertions.indexOf(record), 1);
        tile.classList.remove("spelling-hint-tile-used");
        spellingInput.focus();
        return;
      }
      const insertIndex = spellingInput.value.length;
      spellingInput.value += letter;
      activeInsertions.push({ tile, index: insertIndex });
      spellingInput.focus();
      tile.classList.add("spelling-hint-tile-used");
    });
    spellingHintTray.appendChild(tile);
  });
}

spellingSpeakBtn.addEventListener("click", () => {
  spellingReact("hear", "spLiveHear");
  if (spellingDeck[spellingIndex]) speak(spellingDeck[spellingIndex].word, {
    onstart: () => { spellingSpeakBtn.classList.add("speak-btn-active"); koalaTalk(true); },
    onend: () => { spellingSpeakBtn.classList.remove("speak-btn-active"); koalaTalk(false); },
  });
  koalaTalk(true, 1800);
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

function showSpellingCorrectFeedback(earnedCredit) {
  spellingFeedback.innerHTML = "";
  const line = document.createElement("div");
  line.className = "spelling-correct-line";
  line.textContent = earnedCredit ? t("spellingCorrectPrompt") : t("spellingCorrectNoCreditPrompt");
  spellingFeedback.appendChild(line);
}

// Checks the current guess against the word, but stays on the same word —
// advancing only happens via goToNextSpellingWord(), and only once a check
// here has confirmed the guess is correct.
function checkSpellingAnswer() {
  if (spellingDeck.length === 0) return;
  const current = spellingDeck[spellingIndex];
  const guess = spellingInput.value.trim().toLowerCase();
  const correct = guess === current.word.toLowerCase();
  recordResult(current.word, correct, "spelling");
  recordSrsResult(current.word, correct);

  if (!spellingTotalCountedWords.has(current.word)) {
    spellingTotalCountedWords.add(current.word);
    spellingScore.total++;
    progress.spelling.total++;
  }

  if (correct) {
    // Only credit "correct" if this word was spelled right on the first try this
    // round — a word that was ever wrong this round stays counted as wrong, even
    // though it now passes the check and can be advanced past. The
    // spellingCreditedWords check on top of that stops a duplicate/re-submitted
    // check on an already-credited word (e.g. a fast double-click, or a held
    // Enter key firing Check twice before the UI updates) from double-counting
    // the score.
    const earnsCredit = !spellingWrongThisRound.has(current.word) && !spellingCreditedWords.has(current.word);
    if (earnsCredit) {
      spellingCreditedWords.add(current.word);
      spellingScore.correct++;
      progress.spelling.correct++;
      progress.spellingStatus[current.word] = "correct";
    }
    saveProgress();
    updateSpellingScoreLabel();
    spellingInput.className = "correct";
    pulseScoreTag(spellingInput, "option-btn-bounce");
    spellingScene.classList.remove("sk-talk");
    spellingConfetti();
    renderSpellingProgress(true);
    showSpellingCorrectFeedback(earnsCredit);
    spellingCurrentChecked = true;
    spellingNextBtn.disabled = false;

    const goal = goals.spelling;
    if (goal && !spellingGoalCelebrated && spellingScore.correct >= goal) {
      spellingGoalCelebrated = true;
      showGoalReached(spellingGoalBanner, spellingGoalMessage, spellingGoalNextLevelBtn, spellingScore.correct);
    }
  } else {
    spellingWrongThisRound.add(current.word);
    progress.spellingStatus[current.word] = "wrong";
    spellingSessionWrongWords.set(current.word, { word: current.word, meaning: current.tip || "" });
    saveProgress();
    updateSpellingScoreLabel();
    spellingInput.className = "incorrect";
    spellingInput.classList.remove("sp-shake");
    void spellingInput.offsetWidth;
    spellingInput.classList.add("sp-shake");
    spellingReact("dunno", "spLiveNo");
    showSpellingWrongFeedback(current);
    spellingCurrentChecked = false;
    spellingNextBtn.disabled = true;
  }
}

function goToNextSpellingWord() {
  if (!spellingCurrentChecked) return;
  spellingIndex++;
  loadSpellingWord();
  spellingReact("next", "spLiveNext");
}

function updateSpellingScoreLabel() {
  // The denominator is the round's planned word count (the deck built for
  // it, capped to the chosen number of questions), not how many words have
  // been attempted so far — so it reads correctly from the very first word.
  spellingScoreEl.textContent = t("scoreLabel", spellingScore.correct, spellingDeck.length);
  pulseScoreTag(spellingScoreEl);
}

spellingCheckBtn.addEventListener("click", checkSpellingAnswer);
spellingNextBtn.addEventListener("click", goToNextSpellingWord);
spellingInput.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  if (spellingCurrentChecked) goToNextSpellingWord();
  else checkSpellingAnswer();
});
spellingInput.addEventListener("input", () => {
  // Editing the guess after a correct check invalidates it — require another
  // check before Next works again, so a stale "correct" state can't be used
  // to skip past a word that was quietly changed.
  if (spellingCurrentChecked) {
    spellingCurrentChecked = false;
    spellingNextBtn.disabled = true;
  }
});

spellingBackBtn.addEventListener("click", () => {
  if (spellingIndex > 0) {
    spellingIndex--;
    loadSpellingWord();
    spellingReact("prev", "spLivePrev");
  }
});

function renderSpellingReport() {
  spellingPractice.hidden = true;
  spellingReport.hidden = false;
  if (canUsePaidFeatures() && spellingScore.total >= 5 && spellingScore.correct === spellingScore.total) {
    ensureRewardData();
    progress.counters.spellPerfect++;
    saveProgress();
    checkBadges();
  }

  const words = Array.from(spellingSessionWrongWords.values());
  spellingReportList.innerHTML = "";
  spellingReportEmpty.hidden = words.length > 0;

  words.forEach((w) => {
    const row = document.createElement("div");
    row.className = "wordlist-item";

    const left = document.createElement("div");
    left.className = "wordlist-item-main";
    const wordEl = document.createElement("div");
    wordEl.className = "w speakable-line";
    wordEl.title = "Tap to hear";
    wordEl.textContent = w.word;
    wordEl.addEventListener("click", () => speak(w.word));
    left.appendChild(wordEl);
    if (w.meaning) {
      const meaningEl = document.createElement("div");
      meaningEl.className = "d";
      meaningEl.textContent = w.meaning;
      left.appendChild(meaningEl);
    }
    row.appendChild(left);

    const badge = document.createElement("span");
    badge.className = "mastery low";
    badge.textContent = t("spellingWrongBadge");
    row.appendChild(badge);

    spellingReportList.appendChild(row);
  });

  spellingReportScoreEl.textContent = t("spellingTodayScore", spellingScore.correct, spellingScore.total);
}

spellingFinishBtn.addEventListener("click", renderSpellingReport);

spellingReportRestartBtn.addEventListener("click", () => {
  buildSpellingDeck();
});

spellingGoalMinusBtn.addEventListener("click", () => {
  goals.spelling = Math.max(GOAL_MIN, goals.spelling - GOAL_STEP);
  saveGoals();
  buildSpellingDeck({ resetScreen: false });
});

spellingGoalPlusBtn.addEventListener("click", () => {
  const poolMax = spellingPoolSize();
  if (goals.spelling >= poolMax) return; // no more words available at all, regardless of tier
  if (!currentUser && goals.spelling >= GOAL_MAX_ANONYMOUS) {
    promptSignupForMoreQuestions();
    return;
  }
  if (currentUser && currentUser.role === "free" && goals.spelling >= GOAL_MAX_FREE) {
    openUpgradeOverlay();
    return;
  }
  goals.spelling = Math.min(goalMaxFor(), poolMax, goals.spelling + GOAL_STEP);
  saveGoals();
  buildSpellingDeck({ resetScreen: false });
});

spellingGoalDismissBtn.addEventListener("click", () => {
  spellingGoalBanner.hidden = true;
});

spellingGoalNextLevelBtn.addEventListener("click", () => {
  const next = nextLevelId();
  if (!next) return;
  applyLevel(next);
  goToTab("spelling");
  buildSpellingDeck();
});

// ---- Keyboard play for the whole Spelling screen. The Number of Questions
// stepper sits above both the start and practice screens, so Up/Down work
// throughout; everything else only makes sense once a round is actually
// showing one screen or the other.
document.addEventListener("keydown", (e) => {
  if (!document.getElementById("view-spelling").classList.contains("active")) return;
  if (!spellingReport.hidden) {
    if (e.key === "Enter") {
      e.preventDefault();
      spellingReportRestartBtn.click();
    }
    return;
  }

  if (e.key === "ArrowUp") {
    e.preventDefault();
    spellingGoalPlusBtn.click();
    return;
  }
  if (e.key === "ArrowDown") {
    e.preventDefault();
    spellingGoalMinusBtn.click();
    return;
  }

  if (!spellingStartScreen.hidden) {
    if (e.key === "Enter") {
      e.preventDefault();
      spellingStartBtn.click();
    }
    return;
  }

  if (spellingPractice.hidden) return;

  const inInput = document.activeElement === spellingInput;

  if (e.key === "Escape") {
    e.preventDefault();
    spellingFinishBtn.click();
    return;
  }

  if (e.key === " ") {
    // A button under focus already activates itself on Space; anywhere
    // else (including the answer field, where a literal space could never
    // be part of a real word anyway) it re-plays the word's audio instead.
    const tag = document.activeElement ? document.activeElement.tagName : "";
    e.preventDefault();
    if (tag !== "BUTTON") spellingSpeakBtn.click();
    return;
  }

  if (e.key === "ArrowRight" && spellingCurrentChecked) {
    e.preventDefault();
    goToNextSpellingWord();
    return;
  }

  // Backspace/Left-arrow only jump to the previous word once they can't do
  // their normal job any more — the field is empty, or the cursor is
  // already sitting at its very start — so ordinary editing of the typed
  // answer is never interrupted.
  // Backspace never triggers Back here any more (holding it to erase a typo
  // used to jump to the previous word once the field emptied). Only the
  // Left arrow does, and only when it isn't needed for moving the cursor:
  // outside the input, or with the input still empty.
  if (e.key === "ArrowLeft" && (!inInput || spellingInput.value.length === 0) && !spellingBackBtn.disabled) {
    e.preventDefault();
    spellingBackBtn.click();
  }
});

/* ================= TYPING GAME (falling words) =================
   A falling-words typing game: words spawn at the top of the stage and fall
   toward the bottom on a requestAnimationFrame loop; the player's keystrokes
   are matched against whichever falling word they start with. Clearing a
   word scores points; every TYPEGAME_WORDS_PER_SPEEDUP correct words nudges
   the fall speed and spawn rate up a notch (from a deliberately gentle
   starting pace, since this is meant to work for a beginner still learning
   the keyboard). A word that reaches the bottom costs a life, and running
   out of lives ends the round. */
const TYPEGAME_LIVES = 5;
const TYPEGAME_BASE_SPEED = 10; // px/sec — gentle enough for a first-time typist
const TYPEGAME_MAX_SPEED = 70; // px/sec
const TYPEGAME_SPEED_STEP = 4; // px/sec added per speed-up
const TYPEGAME_SPAWN_START = 3600; // ms between spawns at the start
const TYPEGAME_SPAWN_MIN = 1400; // ms — fastest spawn rate
const TYPEGAME_SPAWN_STEP = 180; // ms shaved off per speed-up
const TYPEGAME_WORDS_PER_SPEEDUP = 10; // correct words needed per speed-up
const TYPEGAME_MIN_POOL_SIZE = 4;
const TYPEGAME_MUTE_KEY = "ywp_typegame_muted_v1";

const typeGameScoreEl = document.getElementById("typegame-score");
const typeGameLivesEl = document.getElementById("typegame-lives");
const typeGameStage = document.getElementById("typegame-stage");
const typeGameWordsEl = document.getElementById("typegame-words");
const typeGameStartOverlay = document.getElementById("typegame-start-overlay");
const typeGameStartMessage = document.getElementById("typegame-start-message");
const typeGameStartBtn = document.getElementById("typegame-start-btn");
const typeGameOverOverlay = document.getElementById("typegame-over-overlay");
const typeGameFinalScoreEl = document.getElementById("typegame-final-score");
const typeGameHighScoreEl = document.getElementById("typegame-high-score");
const typeGameRestartBtn = document.getElementById("typegame-restart-btn");
const typeGameInput = document.getElementById("typegame-input");
const typeGameTypoMsg = document.getElementById("typegame-typo-msg");
const typeGameMuteBtn = document.getElementById("typegame-mute-btn");
const typeGamePauseBtn = document.getElementById("typegame-pause-btn");
const typeGameEndBtn = document.getElementById("typegame-end-btn");
const typeGameExpandBtn = document.getElementById("typegame-expand-btn");
const typeGameStageTagEl = document.getElementById("typegame-stage-tag");
const typeGameStageBanner = document.getElementById("typegame-stage-banner");
const typeGameStageBannerText = document.getElementById("typegame-stage-banner-text");
const typeGameEncourageMsg = document.getElementById("typegame-encourage-msg");
const typeGameSpeedMinusBtn = document.getElementById("typegame-speed-minus");
const typeGameSpeedPlusBtn = document.getElementById("typegame-speed-plus");
const typeGameSpeedValueEl = document.getElementById("typegame-speed-value");
const typeGamePauseOverlay = document.getElementById("typegame-pause-overlay");
const typeGameResumeBtn = document.getElementById("typegame-resume-btn");

let typeGameRunning = false;
let typeGamePaused = false;
let typeGameActive = []; // { text, el, top }
let typeGameWordPool = [];
let typeGameScore = 0;
let typeGameWordsCleared = 0;
let typeGameLives = TYPEGAME_LIVES;
let typeGameSpawnInterval = TYPEGAME_SPAWN_START;
let typeGameStageIndex = 0; // advances every TYPEGAME_WORDS_PER_SPEEDUP correct words
let typeGameSpawnTimer = null;
let typeGameRafId = null;
let typeGameLastTs = null;
let typeGameTypoTimer = null;
let typeGameStageBannerTimer = null;
// This round's SRS-priority words to spawn before falling back to the
// existing random pool — see startTypeGame()/spawnTypeGameWord().
let typeGameSrsQueue = [];
const TYPEGAME_SRS_QUEUE_SIZE = 30;

// Words correctly typed in THIS round, for maybeOfferTypeGameLevelChallenge()
// — deliberately separate from progress.wordStats (which is lifetime and
// drives SRS scheduling/mastery elsewhere): gating the level-up prompt on
// lifetime history meant a well-practiced account had already "cleared"
// most of a newly-unlocked level from earlier sessions, so the prompt kept
// re-firing after almost every answer instead of after a real round of play.
let typeGameRoundSolved = new Set();

function loadTypeGameHighScores() {
  try {
    const raw = localStorage.getItem(TYPEGAME_HIGH_SCORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Could not read Typing Game high scores", e);
  }
  return {};
}

function saveTypeGameHighScores() {
  try {
    localStorage.setItem(TYPEGAME_HIGH_SCORE_KEY, JSON.stringify(typeGameHighScores));
  } catch (e) {
    console.warn("Could not save Typing Game high scores", e);
  }
}

let typeGameHighScores = loadTypeGameHighScores();

// High scores are kept per language + level, since a Year 6 round and a
// Year 4 round aren't really comparable.
function typeGameHighScoreKey() {
  return `${currentLang}_${currentLevel}`;
}

// Reuses the same word source as Spelling practice (the built-in spelling
// list where the track has one, otherwise the vocabulary list), so the two
// modes always agree on what "this level's words" means. Multi-word phrases
// don't fall — filtered out rather than dropped silently mid-game.
function buildTypeGameWordPool() {
  const words = getSpellingPool(currentLevel)
    .map((w) => w.word)
    .filter((w) => /^[A-Za-z']+$/.test(w));
  return Array.from(new Set(words));
}

function updateTypeGameHud() {
  typeGameScoreEl.textContent = t("typeGameScoreLabel", typeGameScore);
  typeGameStageTagEl.textContent = t("typeGameStageLabel", typeGameStageIndex + 1);
  const full = "❤️".repeat(Math.max(typeGameLives, 0));
  const empty = "🖤".repeat(Math.max(TYPEGAME_LIVES - typeGameLives, 0));
  typeGameLivesEl.textContent = full + empty;
}

/* ---------- Live fall-speed control ----------
   The stepper's number IS the current game speed — it starts at 1 every
   round, climbs by 1 on its own each time the stage-based ramp-up advances
   (see clearTypeGameWord()), and the player can also nudge it up/down
   mid-round with the −/+ buttons at any time; either way, whatever it reads
   right now is what typeGameEffectiveSpeed() actually falls at. Not
   persisted across rounds — it always starts back at 1. */
const TYPEGAME_SPEED_LEVEL_MIN = 1;
const TYPEGAME_SPEED_LEVEL_MAX = 20;

let typeGameSpeedLevel = TYPEGAME_SPEED_LEVEL_MIN;

function typeGameEffectiveSpeed() {
  return Math.min(TYPEGAME_BASE_SPEED + (typeGameSpeedLevel - 1) * TYPEGAME_SPEED_STEP, TYPEGAME_MAX_SPEED);
}

function updateTypeGameSpeedUI() {
  typeGameSpeedValueEl.textContent = String(typeGameSpeedLevel);
  typeGameSpeedMinusBtn.disabled = typeGameSpeedLevel <= TYPEGAME_SPEED_LEVEL_MIN;
  typeGameSpeedPlusBtn.disabled = typeGameSpeedLevel >= TYPEGAME_SPEED_LEVEL_MAX;
}

typeGameSpeedMinusBtn.addEventListener("click", () => {
  if (typeGameSpeedLevel <= TYPEGAME_SPEED_LEVEL_MIN) return;
  typeGameSpeedLevel--;
  updateTypeGameSpeedUI();
});

typeGameSpeedPlusBtn.addEventListener("click", () => {
  if (typeGameSpeedLevel >= TYPEGAME_SPEED_LEVEL_MAX) return;
  typeGameSpeedLevel++;
  updateTypeGameSpeedUI();
});

updateTypeGameSpeedUI();

// A short, non-blocking celebration shown on every stage-up — pointer-events
// are disabled on the banner (see CSS) so it never steals focus from the
// input, and it auto-hides itself; no pause, no disabled input.
const TYPEGAME_STAGE_MESSAGES = {
  en: ["Great job!", "You're on fire!", "Keep it up!", "Awesome work!", "Fantastic pace!"],
  ko: ["잘하고 있어요!", "최고예요!", "계속 가요!", "정말 멋져요!", "속도가 대단해요!"],
};

function showTypeGameStageBanner(stageNumber) {
  const messages = TYPEGAME_STAGE_MESSAGES[currentLang] || TYPEGAME_STAGE_MESSAGES.en;
  const msg = messages[Math.floor(Math.random() * messages.length)];
  typeGameStageBannerText.textContent = `${t("typeGameStageLabel", stageNumber)} — ${msg}`;
  typeGameStageBanner.hidden = false;
  // Force the pop-in/out keyframe to restart even if a previous banner is
  // still fading out.
  typeGameStageBanner.style.animation = "none";
  void typeGameStageBanner.offsetWidth;
  typeGameStageBanner.style.animation = "";
  clearTimeout(typeGameStageBannerTimer);
  typeGameStageBannerTimer = setTimeout(() => {
    typeGameStageBanner.hidden = true;
  }, 1800);
}

function hideTypeGameStageBanner() {
  clearTimeout(typeGameStageBannerTimer);
  typeGameStageBanner.hidden = true;
}

// True once the player has hit the on-screen Pause button — separate from
// typeGamePaused, which pauseTypeGame()/resumeTypeGame() also use for the
// tab-switch freeze, so a manual pause isn't auto-resumed by a tab switch
// (see enterTypeGameTab() below) and a tab switch doesn't dismiss the pause
// overlay behind the player's back.
let typeGameManuallyPaused = false;

// Called whenever this tab becomes active: resumes a round that was frozen
// by switching tabs, or — if there's no round in progress — shows a fresh
// start screen for the current level. A manual pause is left exactly as the
// player left it either way.
function enterTypeGameTab() {
  if (typeGameManuallyPaused) return;
  if (typeGamePaused) {
    resumeTypeGame();
  } else if (!typeGameRunning) {
    resetTypeGame();
  }
}

function resetTypeGame() {
  kb("type")?.reset();
  typeGameActive.forEach((w) => w.el.remove());
  typeGameActive = [];
  typeGameScore = 0;
  typeGameWordsCleared = 0;
  typeGameRoundSolved = new Set();
  typeGameLives = TYPEGAME_LIVES;
  typeGameSpeedLevel = TYPEGAME_SPEED_LEVEL_MIN;
  updateTypeGameSpeedUI();
  typeGameSpawnInterval = TYPEGAME_SPAWN_START;
  typeGameStageIndex = 0;
  typeGameInput.value = "";
  typeGameInput.disabled = true;
  hideTypeGameTypo();
  hideTypeGameStageBanner();
  typeGamePauseBtn.hidden = true;
  typeGameEndBtn.hidden = true;
  typeGameManuallyPaused = false;
  typeGamePauseOverlay.hidden = true;
  updateTypeGameStageScene();
  updateTypeGameHud();

  typeGameWordPool = buildTypeGameWordPool();
  const notEnough = typeGameWordPool.length < TYPEGAME_MIN_POOL_SIZE;
  typeGameStartBtn.disabled = notEnough;
  typeGameStartMessage.textContent = notEnough ? t("typeGameNotEnough", levelLabel(currentLevel)) : t("typeGameDesc");
  typeGameOverOverlay.hidden = true;
  typeGameStartOverlay.hidden = false;
}

function startTypeGame() {
  if (typeGameWordPool.length < TYPEGAME_MIN_POOL_SIZE) return;
  kb("type")?.reset();
  typeGameRunning = true;
  typeGamePaused = false;
  typeGameScore = 0;
  typeGameWordsCleared = 0;
  typeGameRoundSolved = new Set();
  typeGameLives = TYPEGAME_LIVES;
  typeGameSpeedLevel = TYPEGAME_SPEED_LEVEL_MIN;
  updateTypeGameSpeedUI();
  typeGameSpawnInterval = TYPEGAME_SPAWN_START;
  typeGameStageIndex = 0;
  typeGameActive.forEach((w) => w.el.remove());
  typeGameActive = [];
  typeGameStartOverlay.hidden = true;
  typeGameOverOverlay.hidden = true;
  typeGameInput.disabled = false;
  typeGameInput.value = "";
  hideTypeGameTypo();
  hideTypeGameStageBanner();
  typeGamePauseBtn.hidden = false;
  typeGameEndBtn.hidden = false;
  typeGameManuallyPaused = false;
  typeGamePauseOverlay.hidden = true;
  typeGameMelodyIndex = 0;
  updateTypeGameStageScene();
  typeGameInput.focus();
  updateTypeGameHud();

  // This round's falling words prefer overdue-for-review/new words first —
  // same spaced-repetition schedule Quiz and Spelling use — falling back to
  // the plain random pool once this queue runs out.
  typeGameSrsQueue = pickWordsForSession(typeGameWordPool, TYPEGAME_SRS_QUEUE_SIZE);

  spawnTypeGameWord();
  scheduleTypeGameSpawn();
  typeGameLastTs = null;
  typeGameRafId = requestAnimationFrame(typeGameLoop);
  startTypeGameMusic();
}

function pauseTypeGame() {
  if (!typeGameRunning) return;
  typeGameRunning = false;
  typeGamePaused = true;
  cancelAnimationFrame(typeGameRafId);
  clearTimeout(typeGameSpawnTimer);
  typeGameInput.disabled = true;
  typeGameInput.value = "";
  hideTypeGameTypo();
  clearTypeGameHighlights();
  stopTypeGameMusic();
}

function resumeTypeGame() {
  typeGamePaused = false;
  typeGameRunning = true;
  typeGameInput.disabled = false;
  typeGameLastTs = null;
  typeGameRafId = requestAnimationFrame(typeGameLoop);
  scheduleTypeGameSpawn();
  typeGameInput.focus();
  startTypeGameMusic();
}

// The on-screen Pause button: a true freeze, reusing pauseTypeGame()'s
// tab-switch-freeze machinery (falling words keep their exact positions,
// score/lives/speed are untouched) rather than resetting the round — a
// visible pause overlay with its own Resume button stands in for the
// start/game-over overlays while it's up.
function pauseTypeGameManual() {
  if (!typeGameRunning) return;
  typeGameManuallyPaused = true;
  pauseTypeGame();
  typeGamePauseOverlay.hidden = false;
}

function resumeTypeGameManual() {
  typeGameManuallyPaused = false;
  typeGamePauseOverlay.hidden = true;
  resumeTypeGame();
}

function scheduleTypeGameSpawn() {
  clearTimeout(typeGameSpawnTimer);
  typeGameSpawnTimer = setTimeout(() => {
    if (!typeGameRunning) return;
    spawnTypeGameWord();
    scheduleTypeGameSpawn();
  }, typeGameSpawnInterval);
}

// Places a freshly created falling item (typing game word / times-table
// equation) so it never overlaps one that is already falling. It tries a few
// random horizontal spots at the normal start height, then starts a little
// higher up (a queue just above the play area) if every spot in that row is
// taken. Returns the item's starting `top` in px.
function placeFallingItem(el, container, activeList) {
  const W = container.clientWidth || 300;
  const w = el.offsetWidth || 80;
  const h = el.offsetHeight || 34;
  const edge = 8;
  const minX = w / 2 + edge;
  const maxX = Math.max(minX, W - w / 2 - edge);
  const rowStep = h + 10;
  const others = activeList.map((a) => ({
    top: a.top,
    x: a.el.offsetLeft,
    w: a.el.offsetWidth || 80,
  }));
  const fits = (x, top) =>
    !others.some(
      (o) => Math.abs(o.top - top) < h + 6 && Math.abs(o.x - x) < (o.w + w) / 2 + 10
    );
  for (let row = 0; row < 4; row++) {
    const top = -30 - row * rowStep;
    for (let i = 0; i < 16; i++) {
      const x = minX + Math.random() * (maxX - minX);
      if (fits(x, top)) {
        el.style.left = `${x}px`;
        el.style.top = `${top}px`;
        return top;
      }
    }
  }
  const top = -30 - 4 * rowStep;
  const x = minX + Math.random() * (maxX - minX);
  el.style.left = `${x}px`;
  el.style.top = `${top}px`;
  return top;
}

function spawnTypeGameWord() {
  // Prefer a word that doesn't share a prefix with one already falling, so
  // typing never has to guess which of two words is meant; if every word in
  // the pool conflicts right now, just fall back to any random one.
  const noPrefixCollision = (w) =>
    !typeGameActive.some(
      (a) => a.text.toLowerCase().startsWith(w.toLowerCase()) || w.toLowerCase().startsWith(a.text.toLowerCase())
    );

  // This round's SRS priority queue (built once in startTypeGame()) goes
  // first — same collision check applies, a queued word that collides right
  // now is just skipped rather than re-queued, since the random fallback
  // below has plenty of other words to try.
  let word = null;
  while (typeGameSrsQueue.length > 0) {
    const candidate = typeGameSrsQueue.shift();
    if (noPrefixCollision(candidate)) {
      word = candidate;
      break;
    }
  }

  if (!word) {
    const candidates = shuffle(typeGameWordPool).filter(noPrefixCollision);
    word = candidates[0] || shuffle(typeGameWordPool)[0];
  }
  if (!word) return;

  const el = document.createElement("div");
  el.className = "typegame-word";
  const typedSpan = document.createElement("span");
  typedSpan.className = "tw-typed";
  const restSpan = document.createElement("span");
  restSpan.className = "tw-rest";
  restSpan.textContent = word;
  el.appendChild(typedSpan);
  el.appendChild(restSpan);
  typeGameWordsEl.appendChild(el);
  const startTop = placeFallingItem(el, typeGameWordsEl, typeGameActive);

  typeGameActive.push({ text: word, el, top: startTop });
}

function typeGameLoop(ts) {
  if (!typeGameRunning) return;
  if (typeGameLastTs == null) typeGameLastTs = ts;
  const dt = (ts - typeGameLastTs) / 1000;
  typeGameLastTs = ts;

  const stageHeight = typeGameStage.clientHeight;
  for (let i = typeGameActive.length - 1; i >= 0; i--) {
    const w = typeGameActive[i];
    w.top += typeGameEffectiveSpeed() * dt;
    w.el.style.top = `${w.top}px`;
    if (w.top > stageHeight - 30) {
      w.el.remove();
      typeGameActive.splice(i, 1);
      loseTypeGameLife(w.text);
    }
  }

  if (typeGameRunning) typeGameRafId = requestAnimationFrame(typeGameLoop);
}

function loseTypeGameLife(missedWord) {
  if (missedWord) {
    recordSrsResult(missedWord, false);
    recordResult(missedWord, false, "typing");
  }
  typeGameLives--;
  kb("type")?.oops();
  updateTypeGameHud();
  playTypeGameLifeLostSfx();
  typeGameStage.classList.remove("typegame-shake");
  // Force a reflow so the shake animation restarts if it's still playing.
  void typeGameStage.offsetWidth;
  typeGameStage.classList.add("typegame-shake");
  if (typeGameLives <= 0) endTypeGame();
}

function clearTypeGameHighlights() {
  typeGameActive.forEach((w) => {
    w.el.querySelector(".tw-typed").textContent = "";
    w.el.querySelector(".tw-rest").textContent = w.text;
    w.el.classList.remove("tw-lock");
  });
}

// A small expanding/fading ring spawned at a cleared item's position, on top
// of that item's own scale-and-vanish (see .tw-cleared in CSS) — together
// they read as the falling bubble "popping" rather than just disappearing.
function spawnTypeGamePopFx(el) {
  const rect = el.getBoundingClientRect();
  const containerRect = typeGameWordsEl.getBoundingClientRect();
  const fx = document.createElement("div");
  fx.className = "typegame-pop-fx";
  fx.style.left = `${rect.left - containerRect.left + rect.width / 2}px`;
  fx.style.top = `${rect.top - containerRect.top + rect.height / 2}px`;
  typeGameWordsEl.appendChild(fx);
  setTimeout(() => fx.remove(), 500);
}

function clearTypeGameWord(word) {
  recordSrsResult(word.text, true);
  recordResult(word.text, true, "typing");
  typeGameRoundSolved.add(word.text);
  spawnTypeGamePopFx(word.el);
  word.el.classList.add("tw-cleared");
  setTimeout(() => word.el.remove(), 300);
  typeGameActive = typeGameActive.filter((w) => w !== word);

  typeGameScore += word.text.length * 10;
  typeGameWordsCleared++;
  kb("type")?.eat(Math.min(typeGameWordsCleared / KB_GAME_FULL, 1), typeGameWordsCleared >= KB_GAME_FULL, true);
  playTypeGameCorrectSfx();

  // Speed ramps up by how many words have been typed correctly, not by
  // score, so a beginner spelling out long words isn't punished with a
  // faster game — the pace only picks up once they've clearly got the hang
  // of it.
  const speedUps = Math.floor(typeGameWordsCleared / TYPEGAME_WORDS_PER_SPEEDUP);
  typeGameSpawnInterval = Math.max(TYPEGAME_SPAWN_MIN, TYPEGAME_SPAWN_START - speedUps * TYPEGAME_SPAWN_STEP);
  if (speedUps !== typeGameStageIndex) {
    typeGameStageIndex = speedUps;
    // A relative +1 (not recomputed from the stage index) so a manual
    // adjustment the player already made isn't overwritten by the
    // automatic ramp-up — the stepper stays the single source of truth.
    typeGameSpeedLevel = Math.min(typeGameSpeedLevel + 1, TYPEGAME_SPEED_LEVEL_MAX);
    updateTypeGameSpeedUI();
    typeGameMelodyIndex = typeGameStageIndex % TYPEGAME_MELODIES.length;
    typeGameMusicIndex = 0;
    updateTypeGameStageScene();
    showTypeGameStageBanner(typeGameStageIndex + 1);
  }
  updateTypeGameHud();
  maybeOfferTypeGameLevelChallenge();
}

// Once every word in the current level's pool has been typed correctly at
// least once (progress.wordStats is shared across every mode, so a word
// solved via Quiz/Spelling counts too — this is "have you ever gotten this
// right", not "only in Typing Game"), offer to jump up to the next level.
// Shown at most once per level (persisted, so declining sticks) — a plain
// mid-round freeze (pauseTypeGame(), not the manual-pause overlay) holds the
// round in place while the player decides.
function maybeOfferTypeGameLevelChallenge() {
  const next = nextLevelId();
  if (!next) return;
  progress.typeGameLevelChallengeShown = progress.typeGameLevelChallengeShown || {};
  if (progress.typeGameLevelChallengeShown[currentLevel]) return;
  if (typeGameWordPool.length === 0) return;
  // Checked against THIS round's own solved-words, not lifetime wordStats —
  // an account with a lot of history had already "cleared" most words in
  // whatever level it next unlocked, which fired this prompt again almost
  // every other answer instead of once per real round of play.
  const allCleared = typeGameWordPool.every((w) => typeGameRoundSolved.has(w));
  if (!allCleared) return;

  progress.typeGameLevelChallengeShown[currentLevel] = true;
  saveProgress();
  pauseTypeGame();
  kidConfirm(t("typeGameLevelChallengePrompt", levelLabel(next)), t("challengeYesBtn"), t("challengeNoBtn")).then((ok) => {
    if (ok) {
      currentLevel = next;
      savedLevels[currentLang] = next;
      saveLevels();
      updateLevelBadge();
      populateLevelSelects();
      typeGameWordPool = buildTypeGameWordPool();
      startTypeGame();
    } else {
      resumeTypeGame();
    }
  });
}

const TYPEGAME_ENCOURAGE_MESSAGES = {
  en: [
    "Aw, so close! Every try makes you faster — go again!",
    "Don't worry — mistakes help you learn. Ready for another round?",
    "Almost had it! You're getting better every time.",
  ],
  ko: [
    "아깝다! 다시 도전하면 더 잘할 수 있어요!",
    "괜찮아요, 실수하면서 배우는 거예요. 한 번 더 해볼까요?",
    "거의 다 왔어요! 할수록 더 잘하고 있어요.",
  ],
};

function endTypeGame() {
  kb("type")?.over();
  typeGameRunning = false;
  typeGamePaused = false;
  typeGameManuallyPaused = false;
  typeGamePauseOverlay.hidden = true;
  cancelAnimationFrame(typeGameRafId);
  clearTimeout(typeGameSpawnTimer);
  typeGameInput.disabled = true;
  typeGameInput.value = "";
  hideTypeGameTypo();
  hideTypeGameStageBanner();
  typeGamePauseBtn.hidden = true;
  typeGameEndBtn.hidden = true;
  typeGameActive.forEach((w) => w.el.remove());
  typeGameActive = [];
  stopTypeGameMusic();

  const key = typeGameHighScoreKey();
  const prevBest = typeGameHighScores[key] || 0;
  const isNewBest = typeGameScore > prevBest;
  if (isNewBest) {
    typeGameHighScores[key] = typeGameScore;
    saveTypeGameHighScores();
  }
  typeGameFinalScoreEl.textContent = t("typeGameFinalScore", typeGameScore);
  typeGameHighScoreEl.textContent = isNewBest ? t("typeGameNewHighScore") : t("typeGameHighScore", Math.max(prevBest, typeGameScore));
  const encourageMessages = TYPEGAME_ENCOURAGE_MESSAGES[currentLang] || TYPEGAME_ENCOURAGE_MESSAGES.en;
  typeGameEncourageMsg.textContent = encourageMessages[Math.floor(Math.random() * encourageMessages.length)];
  typeGameEncourageMsg.hidden = false;
  typeGameOverOverlay.hidden = false;
}

function showTypeGameTypo() {
  typeGameInput.classList.add("typegame-input-error");
  typeGameTypoMsg.hidden = false;
  playTypeGameWrongSfx();
  clearTimeout(typeGameTypoTimer);
  typeGameTypoTimer = setTimeout(hideTypeGameTypo, 1800);
}

function hideTypeGameTypo() {
  clearTimeout(typeGameTypoTimer);
  typeGameInput.classList.remove("typegame-input-error");
  typeGameTypoMsg.hidden = true;
}

typeGameInput.addEventListener("input", () => {
  if (!typeGameRunning) return;
  hideTypeGameTypo();
  const val = typeGameInput.value.toLowerCase();

  let match = null;
  if (val) {
    typeGameActive.forEach((w) => {
      if (w.text.toLowerCase().startsWith(val) && (!match || w.top > match.top)) match = w;
    });
  }

  typeGameActive.forEach((w) => {
    if (w === match) {
      w.el.querySelector(".tw-typed").textContent = w.text.slice(0, val.length);
      w.el.querySelector(".tw-rest").textContent = w.text.slice(val.length);
      w.el.classList.add("tw-lock");
    } else {
      w.el.querySelector(".tw-typed").textContent = "";
      w.el.querySelector(".tw-rest").textContent = w.text;
      w.el.classList.remove("tw-lock");
    }
  });

  if (match && val.length === match.text.length) {
    clearTypeGameWord(match);
    typeGameInput.value = "";
  }
});

// Enter submits the current guess: if it isn't the start of any falling
// word, that's a wrong entry — flag it and clear the box so they can try
// again, rather than leaving a dead-end guess sitting in the input. A guess
// that IS still a valid (partial) prefix is left alone, since the player
// might just not be finished typing it yet.
typeGameInput.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" || !typeGameRunning) return;
  e.preventDefault();
  const val = typeGameInput.value.trim().toLowerCase();
  if (!val) return;
  const isValidPrefix = typeGameActive.some((w) => w.text.toLowerCase().startsWith(val));
  if (!isValidPrefix) {
    showTypeGameTypo();
    typeGameInput.value = "";
    clearTypeGameHighlights();
  }
});

typeGameStartBtn.addEventListener("click", startTypeGame);
typeGameRestartBtn.addEventListener("click", startTypeGame);
typeGamePauseBtn.addEventListener("click", pauseTypeGameManual);
typeGameResumeBtn.addEventListener("click", resumeTypeGameManual);
typeGameEndBtn.addEventListener("click", () => {
  if (!typeGameRunning && !typeGameManuallyPaused) return;
  endTypeGame();
});

// Toggles the play area between its normal and a taller height — purely a
// display preference, so it doesn't touch typeGameRunning/pause state.
// The falling-word boundary check already reads the stage's live
// clientHeight every frame, so the drop distance adapts on its own.
typeGameExpandBtn.addEventListener("click", () => {
  const expanded = typeGameStage.classList.toggle("typegame-stage-expanded");
  const label = t(expanded ? "typeGameCollapse" : "typeGameExpand");
  typeGameExpandBtn.setAttribute("aria-label", label);
  typeGameExpandBtn.setAttribute("title", label);
});

// Cycles the stage's visual theme (day/sunset/dusk/space/underwater — see
// the .stage-scene-N rules in style.css) alongside the music, so a stage-up
// reads as "somewhere new" rather than just a faster falling rate.
function updateTypeGameStageScene() {
  const scene = typeGameStageIndex % 5;
  for (let i = 0; i < 5; i++) typeGameStage.classList.toggle(`stage-scene-${i}`, i === scene);
}

/* ---------- Typing Game background music ----------
   Short, cheerful loops generated entirely with the Web Audio API rather
   than shipped audio files, so there's nothing to download and no
   licensing to worry about. It only ever starts from a click (Start/Play
   Again, or returning to a paused round), which satisfies browsers'
   autoplay restrictions. Five genuinely different tunes (not the same
   shape transposed) cycle with the stage, matching Times Table's. */
const TYPEGAME_MELODIES = [
  // 1. Bright bounce — wide up/down leaps.
  [523.25, 659.25, 783.99, 1046.5, 783.99, 659.25, 523.25, 392.0],
  // 2. Skip-along — a plain rising scale run.
  [523.25, 587.33, 659.25, 698.46, 783.99, 880.0, 987.77, 1046.5],
  // 3. Bouncy repeats — paired repeated notes, a syncopated feel.
  [659.25, 659.25, 783.99, 587.33, 587.33, 698.46, 523.25, 523.25, 659.25],
  // 4. Playful descent — a falling broken-chord figure, repeated.
  [1046.5, 880.0, 698.46, 587.33, 1046.5, 880.0, 698.46, 587.33],
  // 5. Fanfare — a bugle-call style register jump.
  [392.0, 523.25, 659.25, 783.99, 1046.5, 783.99, 659.25, 523.25],
];
const TYPEGAME_NOTE_DURATION = 0.22; // seconds per note

let typeGameAudioCtx = null;
let typeGameMelodyIndex = 0;
let typeGameMusicIndex = 0;
let typeGameNextNoteTime = 0;
let typeGameMusicSchedulerId = null;

function loadTypeGameMuted() {
  try {
    return localStorage.getItem(TYPEGAME_MUTE_KEY) === "1";
  } catch (e) {
    return false;
  }
}

function saveTypeGameMuted() {
  try {
    localStorage.setItem(TYPEGAME_MUTE_KEY, typeGameMuted ? "1" : "0");
  } catch (e) {
    console.warn("Could not save Typing Game mute setting", e);
  }
}

let typeGameMuted = loadTypeGameMuted();

function updateTypeGameMuteBtn() {
  typeGameMuteBtn.textContent = typeGameMuted ? "🔇" : "🔊";
  const label = t(typeGameMuted ? "typeGameUnmute" : "typeGameMute");
  typeGameMuteBtn.setAttribute("aria-label", label);
  typeGameMuteBtn.title = label;
}

// Phones play Web Audio quietly (tiny speakers) and iPhones mute it entirely
// while the ringer/silent switch is on. Tagging the page's audio as
// "playback" (iOS 16.4+) makes it behave like a media player instead, so the
// game music is heard even with the switch on. Harmless where unsupported.
const GAME_MUSIC_PEAK_GAIN = 0.16; // was 0.05 — too faint on phone speakers
const GAME_SFX_BOOST = 2;
function enableMediaPlaybackAudio() {
  try {
    if (navigator.audioSession) navigator.audioSession.type = "playback";
  } catch (e) {
    /* not supported — nothing to do */
  }
}

function ensureTypeGameAudioCtx() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  enableMediaPlaybackAudio();
  if (!typeGameAudioCtx) typeGameAudioCtx = new Ctx();
  // "interrupted" is iOS's version of suspended (phone call, app switch).
  if (typeGameAudioCtx.state !== "running") typeGameAudioCtx.resume().catch(() => {});
  return typeGameAudioCtx;
}

function playTypeGameNote(freq, when) {
  const ctx = typeGameAudioCtx;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, when);
  gain.gain.linearRampToValueAtTime(GAME_MUSIC_PEAK_GAIN, when + 0.02);
  gain.gain.linearRampToValueAtTime(0, when + TYPEGAME_NOTE_DURATION);
  osc.connect(gain).connect(ctx.destination);
  osc.start(when);
  osc.stop(when + TYPEGAME_NOTE_DURATION + 0.02);
}

// Schedules notes a little ahead of playback time (the standard Web Audio
// lookahead pattern) rather than one at a time, so the tempo stays steady
// even if this timer occasionally fires a bit late.
function scheduleTypeGameMusic() {
  if (typeGameMuted || !typeGameRunning || !typeGameAudioCtx) return;
  const melody = TYPEGAME_MELODIES[typeGameMelodyIndex % TYPEGAME_MELODIES.length];
  while (typeGameNextNoteTime < typeGameAudioCtx.currentTime + 0.5) {
    playTypeGameNote(melody[typeGameMusicIndex % melody.length], typeGameNextNoteTime);
    typeGameMusicIndex++;
    typeGameNextNoteTime += TYPEGAME_NOTE_DURATION;
  }
  typeGameMusicSchedulerId = setTimeout(scheduleTypeGameMusic, 150);
}

function startTypeGameMusic() {
  stopTypeGameMusic();
  if (typeGameMuted) return;
  const ctx = ensureTypeGameAudioCtx();
  if (!ctx) return;
  typeGameMusicIndex = 0;
  typeGameNextNoteTime = ctx.currentTime + 0.05;
  scheduleTypeGameMusic();
}

function stopTypeGameMusic() {
  clearTimeout(typeGameMusicSchedulerId);
  typeGameMusicSchedulerId = null;
}

/* ---------- Typing Game sound effects ----------
   Short one-off tones — separate from the background-music scheduler above,
   played immediately against the audio context's current time rather than
   queued into the melody's lookahead schedule. */
function playTypeGameTone(freq, startOffset, duration, type, peakGain) {
  const ctx = typeGameAudioCtx;
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const when = ctx.currentTime + startOffset;
  gain.gain.setValueAtTime(0, when);
  gain.gain.linearRampToValueAtTime(Math.min(peakGain * GAME_SFX_BOOST, 0.4), when + 0.015);
  gain.gain.linearRampToValueAtTime(0, when + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(when);
  osc.stop(when + duration + 0.02);
}

function playTypeGameCorrectSfx() {
  if (typeGameMuted) return;
  if (!ensureTypeGameAudioCtx()) return;
  playTypeGameTone(880, 0, 0.1, "triangle", 0.08);
  playTypeGameTone(1318.51, 0.08, 0.14, "triangle", 0.08);
}

function playTypeGameWrongSfx() {
  if (typeGameMuted) return;
  if (!ensureTypeGameAudioCtx()) return;
  playTypeGameTone(180, 0, 0.18, "sawtooth", 0.07);
}

function playTypeGameLifeLostSfx() {
  if (typeGameMuted) return;
  if (!ensureTypeGameAudioCtx()) return;
  playTypeGameTone(220, 0, 0.16, "square", 0.08);
  playTypeGameTone(140, 0.13, 0.24, "square", 0.08);
}

typeGameMuteBtn.addEventListener("click", () => {
  typeGameMuted = !typeGameMuted;
  saveTypeGameMuted();
  updateTypeGameMuteBtn();
  if (typeGameMuted) stopTypeGameMusic();
  else if (typeGameRunning) startTypeGameMusic();
});

updateTypeGameMuteBtn();

/* ================= TIMES TABLE (falling equations) =================
   Same falling-and-type format as the Typing Game above, but each falling
   item is a multiplication fact ("8 × 2 = ?") instead of a word. Typing is
   matched against the EXPECTED ANSWER STRING — the two operands and the
   product concatenated with no spaces ("8" + "2" + "16" = "8216") — not the
   displayed text, so "8216", "82 16" and "8 2 16" all check out identical
   once whitespace is stripped. Every TIMESTABLE_PROBLEMS_PER_STAGE correct
   answers advances a "stage": fall speed/spawn rate step up a notch and the
   background tune cycles to the next of five. Anonymous/General accounts
   are capped at a total number of problems per round (reusing the same
   GOAL_MAX_ANONYMOUS/GOAL_MAX_FREE ceilings Quiz/Spelling use); Premium and
   admin play until they run out of lives, same as Typing Game. */
const TIMESTABLE_LIVES = 5;
const TIMESTABLE_BASE_SPEED = 6; // px/sec — slower than Typing Game's 10: reading + solving a fact takes longer than reading a known word
const TIMESTABLE_MAX_SPEED = 40; // px/sec — lower ceiling than Typing Game's 70, typing 3-4 digits accurately under pressure is harder for young kids
const TIMESTABLE_SPEED_STEP = 3; // px/sec added per stage
const TIMESTABLE_SPAWN_START = 4200; // ms between spawns at the start
const TIMESTABLE_SPAWN_MIN = 1800; // ms — fastest spawn rate
const TIMESTABLE_SPAWN_STEP = 200; // ms shaved off per stage
const TIMESTABLE_PROBLEMS_PER_STAGE = 10; // correct answers needed per stage (also the music-track cadence)
const TIMESTABLE_POINTS_PER_CORRECT = 10; // flat score per correct answer
const TIMESTABLE_MIN_TABLE = 2;
const TIMESTABLE_MAX_TABLE_CAP = 20;
const TIMESTABLE_DEFAULT_MAX_TABLE = 9;
const TIMESTABLE_MULTIPLIER_MAX = 9; // each table's ×1 .. ×9, the standard 구구단 shape
const TIMESTABLE_SRS_QUEUE_SIZE = 30;
const TIMESTABLE_HIGH_SCORE_KEY = "ywp_timestable_highscores_v1";
const TIMESTABLE_MUTE_KEY = "ywp_timestable_muted_v1";
const TIMESTABLE_MAXTABLE_KEY = "ywp_timestable_maxtable_v1";

const timesTableScoreEl = document.getElementById("timestable-score");
const timesTableLivesEl = document.getElementById("timestable-lives");
const timesTableStage = document.getElementById("timestable-stage");
const timesTableWordsEl = document.getElementById("timestable-words");
const timesTableStartOverlay = document.getElementById("timestable-start-overlay");
const timesTableStartMessage = document.getElementById("timestable-start-message");
const timesTableStartBtn = document.getElementById("timestable-start-btn");
const timesTableOverOverlay = document.getElementById("timestable-over-overlay");
const timesTableFinalScoreEl = document.getElementById("timestable-final-score");
const timesTableHighScoreEl = document.getElementById("timestable-high-score");
const timesTableLimitMsgEl = document.getElementById("timestable-limit-msg");
const timesTableRestartBtn = document.getElementById("timestable-restart-btn");
const timesTableInput = document.getElementById("timestable-input");
const timesTableTypoMsg = document.getElementById("timestable-typo-msg");
const timesTableMuteBtn = document.getElementById("timestable-mute-btn");
const timesTablePauseBtn = document.getElementById("timestable-pause-btn");
const timesTableEndBtn = document.getElementById("timestable-end-btn");
const timesTableExpandBtn = document.getElementById("timestable-expand-btn");
const timesTableStageTagEl = document.getElementById("timestable-stage-tag");
const timesTableStageBanner = document.getElementById("timestable-stage-banner");
const timesTableStageBannerText = document.getElementById("timestable-stage-banner-text");
const timesTableEncourageMsg = document.getElementById("timestable-encourage-msg");
const timesTableRangeWrap = document.getElementById("timestable-range-wrap");
const timesTableRangeBtn = document.getElementById("timestable-range-btn");
const timesTableRangePanel = document.getElementById("timestable-range-panel");
const timesTableRangeGrid = document.getElementById("timestable-range-grid");
// The old +/- stepper is now a row of table chips above the stage; these two
// shims keep the Up/Down arrow keys on the start screen working.
const timesTableMaxTableMinusBtn = { click: () => changeTimesTableMaxTable(-1) };
const timesTableMaxTablePlusBtn = { click: () => changeTimesTableMaxTable(1) };
const timesTableSpeedMinusBtn = document.getElementById("timestable-speed-minus");
const timesTableSpeedPlusBtn = document.getElementById("timestable-speed-plus");
const timesTableSpeedValueEl = document.getElementById("timestable-speed-value");
const timesTablePauseOverlay = document.getElementById("timestable-pause-overlay");
const timesTableResumeBtn = document.getElementById("timestable-resume-btn");

// Built rather than left to the generic data-i18n text swap, so the example
// numbers can be bold/colored — {{EX}} and {{FMT}} are plain substring
// markers in the translated sentence, not template syntax. Called once at
// startup and again on every language switch (see switchLanguage()).
function renderTimesTableInstructions() {
  const exHtml = `<span class="ti-highlight">8 × 2</span>`;
  const fmtHtml =
    `<span class="ti-highlight">8216</span> / ` +
    `<span class="ti-highlight">82 16</span> / ` +
    `<span class="ti-highlight">8 2 16</span>`;
  const line1 = t("timesTableInstrLine1").replace("{{EX}}", exHtml);
  const line2 = t("timesTableInstrLine2").replace("{{FMT}}", fmtHtml);
  // Animated mini demo: problem "8 × 2" appears, the digits 8 / 2 / 16 get
  // typed one by one, then a ✔ pops. The three accepted formats are shown
  // as chips underneath. Purely decorative (aria-hidden); the caption and
  // chips carry the meaning for screen readers / reduced-motion users.
  timesTableStartMessage.innerHTML =
    `<span class="tt-demo" aria-hidden="true">` +
      `<span class="tt-demo-problem">8 × 2</span>` +
      `<span class="tt-demo-input"><span class="tt-d tt-d1">8</span><span class="tt-d tt-d2">2</span><span class="tt-d tt-d3">16</span><span class="tt-ok">✔</span></span>` +
    `</span>` +
    `<span class="ti-line ti-caption">${t("timesTableDemoCaption")}</span>` +
    `<span class="ti-line ti-caption">${t("timesTableDemoCaption2")}</span>` +
    `<span class="ti-line ti-chips">` +
      `<span class="ti-chip">8216</span><span class="ti-chip">82 16</span><span class="ti-chip">8 2 16</span></span>`;
}
renderTimesTableInstructions();

let timesTableRunning = false;
let timesTablePaused = false;
let timesTableActive = []; // { display, expected, key, el, top }
let timesTableProblemPool = []; // { a, b, product }
let timesTableScore = 0;
let timesTableCorrectCount = 0; // drives stage progression, separate from score
let timesTableProblemsShown = 0; // this round's total, checked against the role cap
let timesTableStageIndex = 0;
let timesTableLives = TIMESTABLE_LIVES;
let timesTableSpawnInterval = TIMESTABLE_SPAWN_START;
let timesTableSpawnTimer = null;
let timesTableRafId = null;
let timesTableLastTs = null;
let timesTableTypoTimer = null;
let timesTableStageBannerTimer = null;
// This round's SRS-priority facts to spawn before falling back to the
// random pool — same spaced-repetition schedule Quiz/Spelling/Typing Game
// share, keyed by "{a}x{b}" (see recordSrsResult()/pickWordsForSession()).
let timesTableSrsQueue = [];

// Facts correctly answered in THIS round, for maybeOfferTimesTableChallenge()
// — see typeGameRoundSolved's comment for why this can't just check
// progress.wordStats (lifetime history) instead.
let timesTableRoundSolved = new Set();

function loadTimesTableHighScores() {
  try {
    const raw = localStorage.getItem(TIMESTABLE_HIGH_SCORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Could not read Times Table high scores", e);
  }
  return {};
}

function saveTimesTableHighScores() {
  try {
    localStorage.setItem(TIMESTABLE_HIGH_SCORE_KEY, JSON.stringify(timesTableHighScores));
  } catch (e) {
    console.warn("Could not save Times Table high scores", e);
  }
}

let timesTableHighScores = loadTimesTableHighScores();

// Kept per language + "practice up to" table, since a 2-9 round and a
// 2-20 round aren't really comparable.
function timesTableHighScoreKey() {
  return `${currentLang}_${timesTableSelectionKey()}`;
}

const TIMESTABLE_TABLES_KEY = "ywp_timestable_tables_v1";
function defaultTimesTableSelection() {
  const s = new Set();
  for (let n = TIMESTABLE_MIN_TABLE; n <= TIMESTABLE_DEFAULT_MAX_TABLE; n++) s.add(n);
  return s;
}
function loadTimesTableSelection() {
  try {
    const raw = localStorage.getItem(TIMESTABLE_TABLES_KEY);
    if (raw) {
      const arr = JSON.parse(raw).filter((n) => Number.isInteger(n) && n >= TIMESTABLE_MIN_TABLE && n <= TIMESTABLE_MAX_TABLE_CAP);
      if (arr.length) return new Set(arr);
    }
    // Migrate the old "practice up to N" setting.
    const old = parseInt(localStorage.getItem(TIMESTABLE_MAXTABLE_KEY), 10);
    if (Number.isFinite(old) && old >= TIMESTABLE_MIN_TABLE && old <= TIMESTABLE_MAX_TABLE_CAP) {
      const s = new Set();
      for (let n = TIMESTABLE_MIN_TABLE; n <= old; n++) s.add(n);
      return s;
    }
  } catch (e) {
    /* fall through to default */
  }
  return defaultTimesTableSelection();
}

let timesTableSelected = loadTimesTableSelection();
let timesTableMaxTable = Math.max(...timesTableSelected);

function saveTimesTableMaxTable() {
  timesTableMaxTable = Math.max(...timesTableSelected);
  try {
    localStorage.setItem(TIMESTABLE_TABLES_KEY, JSON.stringify([...timesTableSelected].sort((x, y) => x - y)));
  } catch (e) {
    console.warn("Could not save Times Table selection", e);
  }
}

function timesTableSelectionKey() {
  const arr = [...timesTableSelected].sort((x, y) => x - y);
  const contiguous = arr[0] === TIMESTABLE_MIN_TABLE && arr.every((n, i) => n === TIMESTABLE_MIN_TABLE + i);
  return contiguous ? String(arr[arr.length - 1]) : "s" + arr.join(".");
}

function timesTableRangeLabel() {
  const arr = [...timesTableSelected].sort((x, y) => x - y);
  if (arr.length === 1) return t("timesTableOne", arr[0]);
  return t("timesTableMany", arr.length);
}

function applyTimesTableSelection() {
  saveTimesTableMaxTable();
  timesTableProblemPool = buildTimesTableProblemPool();
  updateTimesTableMaxTableUI();
}

function updateTimesTableMaxTableUI() {
  timesTableRangeBtn.textContent = timesTableRangeLabel();
  timesTableRangeBtn.setAttribute("aria-label", t("timesTableMaxTableLabel"));
  timesTableRangeGrid.innerHTML = "";
  for (let n = TIMESTABLE_MIN_TABLE; n <= TIMESTABLE_MAX_TABLE_CAP; n++) {
    const c = document.createElement("button");
    c.type = "button";
    c.className = "tt-chip" + (timesTableSelected.has(n) ? " on" : "");
    c.textContent = String(n);
    c.setAttribute("aria-pressed", timesTableSelected.has(n) ? "true" : "false");
    c.addEventListener("click", () => {
      if (timesTableRunning) return;
      if (timesTableSelected.has(n)) {
        if (timesTableSelected.size > 1) timesTableSelected.delete(n);
      } else {
        timesTableSelected.add(n);
      }
      applyTimesTableSelection();
    });
    timesTableRangeGrid.appendChild(c);
  }
  document.getElementById("timestable-range-default").textContent = t("timesTableQuickDefault");
  document.getElementById("timestable-range-all").textContent = t("timesTableQuickAll");
  timesTableRangeWrap.classList.toggle("locked", !!timesTableRunning);
  if (timesTableRunning) closeTimesTableRangePanel();
}
function closeTimesTableRangePanel() {
  timesTableRangePanel.hidden = true;
  timesTableRangeBtn.setAttribute("aria-expanded", "false");
}
timesTableRangeBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  if (timesTableRunning) return;
  const open = timesTableRangePanel.hidden;
  timesTableRangePanel.hidden = !open;
  timesTableRangeBtn.setAttribute("aria-expanded", open ? "true" : "false");
});
timesTableRangePanel.addEventListener("click", (e) => e.stopPropagation());
document.addEventListener("click", closeTimesTableRangePanel);
document.getElementById("timestable-range-default").addEventListener("click", () => {
  timesTableSelected = defaultTimesTableSelection();
  applyTimesTableSelection();
});
document.getElementById("timestable-range-all").addEventListener("click", () => {
  timesTableSelected = new Set();
  for (let n = TIMESTABLE_MIN_TABLE; n <= TIMESTABLE_MAX_TABLE_CAP; n++) timesTableSelected.add(n);
  applyTimesTableSelection();
});

function changeTimesTableMaxTable() {
  /* keyboard shortcut no longer used */
}

// Every {a}×{b} fact for tables TIMESTABLE_MIN_TABLE..maxTable, each ×1
// through ×9 (the standard 구구단 shape) — "몇 단" only changes the first
// operand's range, matching how the times tables are actually taught.
function buildTimesTableProblemPool() {
  const pool = [];
  for (const a of [...timesTableSelected].sort((x, y) => x - y)) {
    for (let b = 1; b <= TIMESTABLE_MULTIPLIER_MAX; b++) {
      pool.push({ a, b, product: a * b });
    }
  }
  return pool;
}

function timesTableDisplay(p) {
  return `${p.a} × ${p.b} = ?`;
}
function timesTableExpected(p) {
  return `${p.a}${p.b}${p.product}`;
}
function timesTableKey(p) {
  return `${p.a}x${p.b}`;
}

// Anonymous/General accounts get a per-round problem ceiling (reusing the
// same numbers Quiz/Spelling already nudge signup/upgrade at); Premium and
// admin have no ceiling here — their round only ends by running out of
// lives, the same as Typing Game.
function timesTableMaxProblems() {
  if (!currentUser) return GOAL_MAX_ANONYMOUS;
  if (currentUser.role === "free") return GOAL_MAX_FREE;
  return Infinity;
}

function updateTimesTableHud() {
  timesTableScoreEl.textContent = t("timesTableScoreLabel", timesTableScore);
  timesTableStageTagEl.textContent = t("timesTableStageLabel", timesTableStageIndex + 1);
  const full = "❤️".repeat(Math.max(timesTableLives, 0));
  const empty = "🖤".repeat(Math.max(TIMESTABLE_LIVES - timesTableLives, 0));
  timesTableLivesEl.textContent = full + empty;
}

/* ---------- Live fall-speed control ----------
   Same design as Typing Game's — see there for why: the stepper's number IS
   the current speed, starts at 1 every round, climbs by 1 on its own each
   stage-up, and the player can nudge it directly at any time. Not persisted
   across rounds. */
const TIMESTABLE_SPEED_LEVEL_MIN = 1;
const TIMESTABLE_SPEED_LEVEL_MAX = 20;

let timesTableSpeedLevel = TIMESTABLE_SPEED_LEVEL_MIN;

function timesTableEffectiveSpeed() {
  return Math.min(TIMESTABLE_BASE_SPEED + (timesTableSpeedLevel - 1) * TIMESTABLE_SPEED_STEP, TIMESTABLE_MAX_SPEED);
}

function updateTimesTableSpeedUI() {
  timesTableSpeedValueEl.textContent = String(timesTableSpeedLevel);
  timesTableSpeedMinusBtn.disabled = timesTableSpeedLevel <= TIMESTABLE_SPEED_LEVEL_MIN;
  timesTableSpeedPlusBtn.disabled = timesTableSpeedLevel >= TIMESTABLE_SPEED_LEVEL_MAX;
}

timesTableSpeedMinusBtn.addEventListener("click", () => {
  if (timesTableSpeedLevel <= TIMESTABLE_SPEED_LEVEL_MIN) return;
  timesTableSpeedLevel--;
  updateTimesTableSpeedUI();
});

timesTableSpeedPlusBtn.addEventListener("click", () => {
  if (timesTableSpeedLevel >= TIMESTABLE_SPEED_LEVEL_MAX) return;
  timesTableSpeedLevel++;
  updateTimesTableSpeedUI();
});

updateTimesTableSpeedUI();

// Same non-blocking stage-up celebration as Typing Game (see there for why
// it's pointer-events:none and self-dismisses) — kept as its own copy rather
// than a shared helper, matching how this module's music/SFX code is
// independent of Typing Game's throughout.
const TIMESTABLE_STAGE_MESSAGES = {
  en: ["Great job!", "You're on fire!", "Keep it up!", "Awesome work!", "Fantastic pace!"],
  ko: ["잘하고 있어요!", "최고예요!", "계속 가요!", "정말 멋져요!", "속도가 대단해요!"],
};

function showTimesTableStageBanner(stageNumber) {
  const messages = TIMESTABLE_STAGE_MESSAGES[currentLang] || TIMESTABLE_STAGE_MESSAGES.en;
  const msg = messages[Math.floor(Math.random() * messages.length)];
  timesTableStageBannerText.textContent = `${t("timesTableStageLabel", stageNumber)} — ${msg}`;
  timesTableStageBanner.hidden = false;
  timesTableStageBanner.style.animation = "none";
  void timesTableStageBanner.offsetWidth;
  timesTableStageBanner.style.animation = "";
  clearTimeout(timesTableStageBannerTimer);
  timesTableStageBannerTimer = setTimeout(() => {
    timesTableStageBanner.hidden = true;
  }, 1800);
}

function hideTimesTableStageBanner() {
  clearTimeout(timesTableStageBannerTimer);
  timesTableStageBanner.hidden = true;
}

// True once the player has hit the on-screen Pause button — see
// typeGameManuallyPaused for why this is kept separate from timesTablePaused.
let timesTableManuallyPaused = false;

// Called whenever this tab becomes active: resumes a round that was frozen
// by switching tabs, or — if there's no round in progress — shows a fresh
// start screen. A manual pause is left exactly as the player left it either way.
function enterTimesTableTab() {
  if (timesTableManuallyPaused) return;
  if (timesTablePaused) {
    resumeTimesTable();
  } else if (!timesTableRunning) {
    resetTimesTable();
  }
}

function resetTimesTable() {
  kb("tt")?.reset();
  timesTableActive.forEach((w) => w.el.remove());
  timesTableActive = [];
  timesTableScore = 0;
  timesTableCorrectCount = 0;
  timesTableProblemsShown = 0;
  timesTableStageIndex = 0;
  timesTableRoundSolved = new Set();
  timesTableLives = TIMESTABLE_LIVES;
  timesTableSpeedLevel = TIMESTABLE_SPEED_LEVEL_MIN;
  updateTimesTableSpeedUI();
  timesTableSpawnInterval = TIMESTABLE_SPAWN_START;
  timesTableInput.value = "";
  timesTableInput.disabled = true;
  hideTimesTableTypo();
  hideTimesTableStageBanner();
  timesTablePauseBtn.hidden = true;
  timesTableEndBtn.hidden = true;
  timesTableManuallyPaused = false;
  timesTablePauseOverlay.hidden = true;
  updateTimesTableStageScene();
  updateTimesTableHud();

  timesTableProblemPool = buildTimesTableProblemPool();
  updateTimesTableMaxTableUI();
  timesTableOverOverlay.hidden = true;
  timesTableStartOverlay.hidden = false;
}

function startTimesTable() {
  timesTableProblemPool = buildTimesTableProblemPool();
  if (timesTableProblemPool.length === 0) return;
  kb("tt")?.reset();
  timesTableRunning = true;
  updateTimesTableMaxTableUI();
  timesTablePaused = false;
  timesTableScore = 0;
  timesTableCorrectCount = 0;
  timesTableProblemsShown = 0;
  timesTableStageIndex = 0;
  timesTableRoundSolved = new Set();
  timesTableLives = TIMESTABLE_LIVES;
  timesTableSpeedLevel = TIMESTABLE_SPEED_LEVEL_MIN;
  updateTimesTableSpeedUI();
  timesTableSpawnInterval = TIMESTABLE_SPAWN_START;
  timesTableActive.forEach((w) => w.el.remove());
  timesTableActive = [];
  timesTableStartOverlay.hidden = true;
  timesTableOverOverlay.hidden = true;
  timesTableInput.disabled = false;
  timesTableInput.value = "";
  hideTimesTableTypo();
  hideTimesTableStageBanner();
  timesTablePauseBtn.hidden = false;
  timesTableEndBtn.hidden = false;
  timesTableManuallyPaused = false;
  timesTablePauseOverlay.hidden = true;
  timesTableMelodyIndex = 0;
  updateTimesTableStageScene();
  timesTableInput.focus();
  updateTimesTableHud();

  timesTableSrsQueue = pickWordsForSession(timesTableProblemPool, TIMESTABLE_SRS_QUEUE_SIZE, (p) => timesTableKey(p));

  spawnTimesTableProblem();
  scheduleTimesTableSpawn();
  timesTableLastTs = null;
  timesTableRafId = requestAnimationFrame(timesTableLoop);
  startTimesTableMusic();
}

function pauseTimesTable() {
  if (!timesTableRunning) return;
  timesTableRunning = false;
  timesTablePaused = true;
  cancelAnimationFrame(timesTableRafId);
  clearTimeout(timesTableSpawnTimer);
  timesTableInput.disabled = true;
  timesTableInput.value = "";
  hideTimesTableTypo();
  clearTimesTableHighlights();
  stopTimesTableMusic();
}

function resumeTimesTable() {
  timesTablePaused = false;
  timesTableRunning = true;
  timesTableInput.disabled = false;
  timesTableLastTs = null;
  timesTableRafId = requestAnimationFrame(timesTableLoop);
  scheduleTimesTableSpawn();
  timesTableInput.focus();
  startTimesTableMusic();
}

// The on-screen Pause button: a true freeze — see pauseTypeGameManual() for
// why this reuses pauseTimesTable()'s tab-switch-freeze machinery instead of
// resetting the round.
function pauseTimesTableManual() {
  if (!timesTableRunning) return;
  timesTableManuallyPaused = true;
  pauseTimesTable();
  timesTablePauseOverlay.hidden = false;
}

function resumeTimesTableManual() {
  timesTableManuallyPaused = false;
  timesTablePauseOverlay.hidden = true;
  resumeTimesTable();
}

function scheduleTimesTableSpawn() {
  clearTimeout(timesTableSpawnTimer);
  if (timesTableProblemsShown >= timesTableMaxProblems()) return;
  timesTableSpawnTimer = setTimeout(() => {
    if (!timesTableRunning) return;
    spawnTimesTableProblem();
    scheduleTimesTableSpawn();
  }, timesTableSpawnInterval);
}

function spawnTimesTableProblem() {
  if (timesTableProblemsShown >= timesTableMaxProblems()) return;

  const noExpectedCollision = (expected) =>
    !timesTableActive.some((item) => item.expected.startsWith(expected) || expected.startsWith(item.expected));

  let problem = null;
  while (timesTableSrsQueue.length > 0) {
    const candidate = timesTableSrsQueue.shift();
    if (noExpectedCollision(timesTableExpected(candidate))) {
      problem = candidate;
      break;
    }
  }
  if (!problem) {
    const candidates = shuffle(timesTableProblemPool).filter((p) => noExpectedCollision(timesTableExpected(p)));
    problem = candidates[0] || shuffle(timesTableProblemPool)[0];
  }
  if (!problem) return;
  timesTableProblemsShown++;

  const el = document.createElement("div");
  el.className = "typegame-word timestable-eq";
  el.textContent = timesTableDisplay(problem);
  timesTableWordsEl.appendChild(el);
  const startTop = placeFallingItem(el, timesTableWordsEl, timesTableActive);

  timesTableActive.push({
    display: timesTableDisplay(problem),
    expected: timesTableExpected(problem),
    key: timesTableKey(problem),
    el,
    top: startTop,
  });
}

function timesTableLoop(ts) {
  if (!timesTableRunning) return;
  if (timesTableLastTs == null) timesTableLastTs = ts;
  const dt = (ts - timesTableLastTs) / 1000;
  timesTableLastTs = ts;

  const stageHeight = timesTableStage.clientHeight;
  for (let i = timesTableActive.length - 1; i >= 0; i--) {
    const w = timesTableActive[i];
    w.top += timesTableEffectiveSpeed() * dt;
    w.el.style.top = `${w.top}px`;
    if (w.top > stageHeight - 30) {
      w.el.remove();
      timesTableActive.splice(i, 1);
      loseTimesTableLife(w.key);
    }
  }

  if (timesTableRunning) timesTableRafId = requestAnimationFrame(timesTableLoop);
}

function loseTimesTableLife(missedKey) {
  if (missedKey) {
    recordSrsResult(missedKey, false);
    recordResult(missedKey, false, "tt");
  }
  timesTableLives--;
  kb("tt")?.oops();
  updateTimesTableHud();
  playTimesTableLifeLostSfx();
  timesTableStage.classList.remove("typegame-shake");
  void timesTableStage.offsetWidth; // force reflow so the shake restarts if still playing
  timesTableStage.classList.add("typegame-shake");
  if (timesTableLives <= 0) {
    endTimesTableRound("lives");
  } else if (timesTableProblemsShown >= timesTableMaxProblems() && timesTableActive.length === 0) {
    endTimesTableRound("limit");
  }
}

function clearTimesTableHighlights() {
  timesTableActive.forEach((w) => w.el.classList.remove("tw-lock"));
}

// A small expanding/fading ring spawned at a cleared item's position — see
// spawnTypeGamePopFx() in the Typing Game module for the same trick.
function spawnTimesTablePopFx(el) {
  const rect = el.getBoundingClientRect();
  const containerRect = timesTableWordsEl.getBoundingClientRect();
  const fx = document.createElement("div");
  fx.className = "typegame-pop-fx";
  fx.style.left = `${rect.left - containerRect.left + rect.width / 2}px`;
  fx.style.top = `${rect.top - containerRect.top + rect.height / 2}px`;
  timesTableWordsEl.appendChild(fx);
  setTimeout(() => fx.remove(), 500);
}

function clearTimesTableProblem(item) {
  recordSrsResult(item.key, true);
  recordResult(item.key, true, "tt");
  timesTableRoundSolved.add(item.key);
  spawnTimesTablePopFx(item.el);
  item.el.classList.add("tw-cleared");
  setTimeout(() => item.el.remove(), 300);
  timesTableActive = timesTableActive.filter((w) => w !== item);

  timesTableScore += TIMESTABLE_POINTS_PER_CORRECT;
  timesTableCorrectCount++;
  kb("tt")?.eat(Math.min(timesTableCorrectCount / KB_GAME_FULL, 1), timesTableCorrectCount >= KB_GAME_FULL, true);
  playTimesTableCorrectSfx();

  const stage = Math.floor(timesTableCorrectCount / TIMESTABLE_PROBLEMS_PER_STAGE);
  timesTableSpawnInterval = Math.max(TIMESTABLE_SPAWN_MIN, TIMESTABLE_SPAWN_START - stage * TIMESTABLE_SPAWN_STEP);
  if (stage !== timesTableStageIndex) {
    timesTableStageIndex = stage;
    // A relative +1 (not recomputed from the stage index) so a manual
    // adjustment the player already made isn't overwritten by the
    // automatic ramp-up — the stepper stays the single source of truth.
    timesTableSpeedLevel = Math.min(timesTableSpeedLevel + 1, TIMESTABLE_SPEED_LEVEL_MAX);
    updateTimesTableSpeedUI();
    timesTableMelodyIndex = stage % TIMESTABLE_MELODIES.length;
    timesTableMusicNoteIndex = 0;
    updateTimesTableStageScene();
    showTimesTableStageBanner(timesTableStageIndex + 1);
  }
  updateTimesTableHud();

  if (timesTableProblemsShown >= timesTableMaxProblems() && timesTableActive.length === 0) {
    endTimesTableRound("limit");
  } else {
    maybeOfferTimesTableChallenge();
  }
}

// Once every fact up to the current max table has been answered correctly
// in THIS round, offer to extend one table higher. Shown at most once per
// max-table setting (persisted, so declining sticks).
//
// Checked against timesTableRoundSolved, not lifetime progress.wordStats:
// an account with a lot of play history had usually already answered most
// facts in whatever table this next unlocked at some point in the past, so
// gating on lifetime history made this prompt refire after almost every
// single answer instead of once per real round of grinding through the
// current table range.
function maybeOfferTimesTableChallenge() {
  if (timesTableMaxTable >= TIMESTABLE_MAX_TABLE_CAP) return;
  progress.timesTableChallengeShown = progress.timesTableChallengeShown || {};
  const shownKey = `${currentLang}_${timesTableSelectionKey()}`;
  if (progress.timesTableChallengeShown[shownKey]) return;
  if (timesTableProblemPool.length === 0) return;
  const allCleared = timesTableProblemPool.every((p) => timesTableRoundSolved.has(timesTableKey(p)));
  if (!allCleared) return;

  progress.timesTableChallengeShown[shownKey] = true;
  saveProgress();
  pauseTimesTable();
  const nextTable = Math.min(timesTableMaxTable + 1, TIMESTABLE_MAX_TABLE_CAP);
  kidConfirm(t("timesTableChallengePrompt", nextTable), t("challengeYesBtn"), t("challengeNoBtn")).then((ok) => {
    if (ok) {
      timesTableSelected.add(nextTable);
      saveTimesTableMaxTable();
      startTimesTable();
    } else {
      resumeTimesTable();
    }
  });
}

const TIMESTABLE_ENCOURAGE_MESSAGES = {
  en: [
    "Aw, so close! Every try makes you faster — go again!",
    "Don't worry — mistakes help you learn. Ready for another round?",
    "Almost had it! You're getting better every time.",
  ],
  ko: [
    "아깝다! 다시 도전하면 더 잘할 수 있어요!",
    "괜찮아요, 실수하면서 배우는 거예요. 한 번 더 해볼까요?",
    "거의 다 왔어요! 할수록 더 잘하고 있어요.",
  ],
};

function endTimesTableRound(reason) {
  kb("tt")?.over();
  timesTableRunning = false;
  updateTimesTableMaxTableUI();
  timesTablePaused = false;
  timesTableManuallyPaused = false;
  timesTablePauseOverlay.hidden = true;
  cancelAnimationFrame(timesTableRafId);
  clearTimeout(timesTableSpawnTimer);
  timesTableInput.disabled = true;
  timesTableInput.value = "";
  hideTimesTableTypo();
  hideTimesTableStageBanner();
  timesTablePauseBtn.hidden = true;
  timesTableEndBtn.hidden = true;
  timesTableActive.forEach((w) => w.el.remove());
  timesTableActive = [];
  stopTimesTableMusic();

  const key = timesTableHighScoreKey();
  const prevBest = timesTableHighScores[key] || 0;
  const isNewBest = timesTableScore > prevBest;
  if (isNewBest) {
    timesTableHighScores[key] = timesTableScore;
    saveTimesTableHighScores();
  }
  timesTableFinalScoreEl.textContent = t("timesTableFinalScore", timesTableScore);
  timesTableHighScoreEl.textContent = isNewBest
    ? t("timesTableNewHighScore")
    : t("timesTableHighScore", Math.max(prevBest, timesTableScore));

  if (reason === "limit") {
    timesTableLimitMsgEl.textContent = t(
      currentUser ? "timesTableLimitReachedFree" : "timesTableLimitReachedAnonymous"
    );
    timesTableLimitMsgEl.hidden = false;
  } else {
    timesTableLimitMsgEl.hidden = true;
  }

  if (reason === "lives") {
    const encourageMessages = TIMESTABLE_ENCOURAGE_MESSAGES[currentLang] || TIMESTABLE_ENCOURAGE_MESSAGES.en;
    timesTableEncourageMsg.textContent = encourageMessages[Math.floor(Math.random() * encourageMessages.length)];
    timesTableEncourageMsg.hidden = false;
  } else {
    timesTableEncourageMsg.hidden = true;
  }
  timesTableOverOverlay.hidden = false;
}

function showTimesTableTypo() {
  timesTableInput.classList.add("typegame-input-error");
  timesTableTypoMsg.hidden = false;
  playTimesTableWrongSfx();
  clearTimeout(timesTableTypoTimer);
  timesTableTypoTimer = setTimeout(hideTimesTableTypo, 1800);
}

function hideTimesTableTypo() {
  clearTimeout(timesTableTypoTimer);
  timesTableInput.classList.remove("typegame-input-error");
  timesTableTypoMsg.hidden = true;
}

// Matches whatever's been typed (spaces stripped) against every falling
// fact's expected answer string, the same "type to auto-lock onto the right
// falling item" feel Typing Game has — just matching a computed answer
// string instead of the displayed word itself. Correct/wrong feedback is a
// sound effect only (clearTimesTableProblem()/showTimesTableTypo()) — an
// earlier version also read each digit aloud via speechSynthesis, but the
// TTS latency made it lag noticeably behind the actual keystrokes, so it
// was dropped in favor of the same instant SFX approach Typing Game uses.
timesTableInput.addEventListener("input", () => {
  if (!timesTableRunning) return;
  hideTimesTableTypo();
  const val = timesTableInput.value.replace(/\s+/g, "");

  let match = null;
  if (val) {
    timesTableActive.forEach((item) => {
      if (item.expected.startsWith(val) && (!match || item.top > match.top)) match = item;
    });
  }
  timesTableActive.forEach((item) => item.el.classList.toggle("tw-lock", item === match));

  if (match && val.length === match.expected.length) {
    clearTimesTableProblem(match);
    timesTableInput.value = "";
  }
});

timesTableInput.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" || !timesTableRunning) return;
  e.preventDefault();
  const val = timesTableInput.value.replace(/\s+/g, "");
  if (!val) return;
  const isValidPrefix = timesTableActive.some((item) => item.expected.startsWith(val));
  if (!isValidPrefix) {
    showTimesTableTypo();
    timesTableInput.value = "";
    clearTimesTableHighlights();
  }
});

timesTableStartBtn.addEventListener("click", startTimesTable);
timesTableRestartBtn.addEventListener("click", startTimesTable);
timesTablePauseBtn.addEventListener("click", pauseTimesTableManual);
timesTableResumeBtn.addEventListener("click", resumeTimesTableManual);
timesTableEndBtn.addEventListener("click", () => {
  if (!timesTableRunning && !timesTableManuallyPaused) return;
  endTimesTableRound("manual");
});

// Same display-only toggle as Typing Game's — see there for why it doesn't
// touch timesTableRunning/pause state.
timesTableExpandBtn.addEventListener("click", () => {
  const expanded = timesTableStage.classList.toggle("typegame-stage-expanded");
  const label = t(expanded ? "timesTableCollapse" : "timesTableExpand");
  timesTableExpandBtn.setAttribute("aria-label", label);
  timesTableExpandBtn.setAttribute("title", label);
});

// ---- Keyboard play, shared between Typing Game and Times Table since both
// are built from the same falling-word/falling-problem arcade shell (start
// overlay -> running -> pause overlay / game-over overlay).
//
// Up/Down always work: on the start screen they drive whichever stepper
// that screen shows (only Times Table has one there — "Practice tables up
// to"), and once playing they drive the shared game-speed stepper instead.
// Arrows never produce a character, so they're safe to intercept even
// while the answer field has focus. Space is skipped whenever the input is
// focused in EITHER game, since Times Table's own multi-digit answers can
// legitimately contain a space ("8 2 16"). M is only skipped for Typing
// Game, whose input is real English words that can contain the letter —
// Times Table's input is numeric-only, so "m" can never be part of a real
// answer there and is safe to treat as the mute shortcut even mid-type.
function setupArcadeGameKeyboard(cfg) {
  document.addEventListener("keydown", (e) => {
    if (!document.getElementById(cfg.viewId).classList.contains("active")) return;
    // A modal (log in / sign up, upgrade prompt, kid confirm, level picker) or
    // any other text field owns the keyboard while it's up — otherwise typing
    // "admin" into the login box would hit M and toggle the game's mute button
    // (and Space/Enter/Esc/arrows would drive the game behind it).
    if (document.querySelector(".auth-overlay:not([hidden]), .kid-modal-overlay:not([hidden]), .level-overlay:not([hidden])")) return;
    const activeEl = document.activeElement;
    if (
      activeEl &&
      activeEl !== cfg.inputEl &&
      (activeEl.tagName === "INPUT" ||
        activeEl.tagName === "TEXTAREA" ||
        activeEl.tagName === "SELECT" ||
        activeEl.isContentEditable)
    ) {
      return;
    }
    const inInput = activeEl === cfg.inputEl;

    if (!cfg.startOverlay.hidden) {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (cfg.stepperPlusBtn) cfg.stepperPlusBtn.click();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (cfg.stepperMinusBtn) cfg.stepperMinusBtn.click();
      } else if (e.key === "Enter") {
        e.preventDefault();
        cfg.startBtn.click();
      }
      return;
    }

    if (!cfg.overOverlay.hidden) return; // no shortcuts on the game-over screen

    if (e.key === "ArrowUp") {
      e.preventDefault();
      cfg.speedPlusBtn.click();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      cfg.speedMinusBtn.click();
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      cfg.endBtn.click();
      return;
    }
    if (e.ctrlKey && e.key === "Enter") {
      e.preventDefault();
      cfg.expandBtn.click();
      return;
    }
    if (e.key === " ") {
      if (inInput) return;
      e.preventDefault();
      if (cfg.manuallyPaused()) cfg.resumeBtn.click();
      else cfg.pauseBtn.click();
    } else if (e.key.toLowerCase() === "m") {
      if (inInput && cfg.muteConflictsWithInput) return;
      e.preventDefault();
      cfg.muteBtn.click();
    }
  });
}

// ---- Phone play mode (see ".card.game-immersive" in style.css): while a round
// is live on a narrow screen, the game card fills the *visible* viewport —
// i.e. the area above the on-screen keyboard — so the play area and the
// answer box are both always on screen.
const mobileGameMQ = window.matchMedia("(max-width: 700px)");

function syncVisualViewportVars() {
  const vv = window.visualViewport;
  const root = document.documentElement;
  root.style.setProperty("--vv-height", `${vv ? vv.height : window.innerHeight}px`);
  root.style.setProperty("--vv-top", `${vv ? vv.offsetTop : 0}px`);
}

function setupMobileGameImmersive(sectionId, startOverlay, overOverlay) {
  const card = document.querySelector(`#${sectionId} > .card`);
  const section = document.getElementById(sectionId);
  function sync() {
    const live = mobileGameMQ.matches && startOverlay.hidden && overOverlay.hidden;
    card.classList.toggle("game-immersive", live);
    document.body.classList.toggle("game-immersive-open", !!document.querySelector(".view.active > .card.game-immersive"));
  }
  const overlayObserver = new MutationObserver(sync);
  overlayObserver.observe(startOverlay, { attributes: true, attributeFilter: ["hidden"] });
  overlayObserver.observe(overOverlay, { attributes: true, attributeFilter: ["hidden"] });
  // Leaving/returning to the tab flips the section's "active" class.
  new MutationObserver(sync).observe(section, { attributes: true, attributeFilter: ["class"] });
  mobileGameMQ.addEventListener("change", sync);
  sync();
}

syncVisualViewportVars();
window.addEventListener("resize", syncVisualViewportVars);
window.addEventListener("orientationchange", syncVisualViewportVars);
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", syncVisualViewportVars);
  window.visualViewport.addEventListener("scroll", syncVisualViewportVars);
}
setupMobileGameImmersive("view-typegame", typeGameStartOverlay, typeGameOverOverlay);

setupArcadeGameKeyboard({
  viewId: "view-typegame",
  inputEl: typeGameInput,
  startOverlay: typeGameStartOverlay,
  overOverlay: typeGameOverOverlay,
  startBtn: typeGameStartBtn,
  stepperMinusBtn: null,
  stepperPlusBtn: null,
  speedMinusBtn: typeGameSpeedMinusBtn,
  speedPlusBtn: typeGameSpeedPlusBtn,
  manuallyPaused: () => typeGameManuallyPaused,
  pauseBtn: typeGamePauseBtn,
  resumeBtn: typeGameResumeBtn,
  muteBtn: typeGameMuteBtn,
  muteConflictsWithInput: true,
  expandBtn: typeGameExpandBtn,
  endBtn: typeGameEndBtn,
});

setupMobileGameImmersive("view-timestable", timesTableStartOverlay, timesTableOverOverlay);

setupArcadeGameKeyboard({
  viewId: "view-timestable",
  inputEl: timesTableInput,
  startOverlay: timesTableStartOverlay,
  overOverlay: timesTableOverOverlay,
  startBtn: timesTableStartBtn,
  stepperMinusBtn: timesTableMaxTableMinusBtn,
  stepperPlusBtn: timesTableMaxTablePlusBtn,
  speedMinusBtn: timesTableSpeedMinusBtn,
  speedPlusBtn: timesTableSpeedPlusBtn,
  manuallyPaused: () => timesTableManuallyPaused,
  pauseBtn: timesTablePauseBtn,
  resumeBtn: timesTableResumeBtn,
  muteBtn: timesTableMuteBtn,
  muteConflictsWithInput: false,
  expandBtn: timesTableExpandBtn,
  endBtn: timesTableEndBtn,
});

// Cycles the stage's visual theme (day/sunset/dusk/space/underwater — see
// the .stage-scene-N rules in style.css) alongside the music, so a stage-up
// reads as "somewhere new" rather than just a faster falling rate.
function updateTimesTableStageScene() {
  const scene = timesTableStageIndex % 5;
  for (let i = 0; i < 5; i++) timesTableStage.classList.toggle(`stage-scene-${i}`, i === scene);
}

/* ---------- Times Table background music ----------
   Same Web-Audio-synthesised approach as Typing Game's music, but five
   genuinely different short tunes — not the same shape transposed — so a
   stage transition (every TIMESTABLE_PROBLEMS_PER_STAGE correct answers)
   actually sounds like new music, not just a pitch shift. Cycles back to
   the first after the fifth. */
const TIMESTABLE_MELODIES = [
  // 1. Bright bounce — wide up/down leaps.
  [523.25, 659.25, 783.99, 1046.5, 783.99, 659.25, 523.25, 392.0],
  // 2. Skip-along — a plain rising scale run.
  [523.25, 587.33, 659.25, 698.46, 783.99, 880.0, 987.77, 1046.5],
  // 3. Bouncy repeats — paired repeated notes, a syncopated feel.
  [659.25, 659.25, 783.99, 587.33, 587.33, 698.46, 523.25, 523.25, 659.25],
  // 4. Playful descent — a falling broken-chord figure, repeated.
  [1046.5, 880.0, 698.46, 587.33, 1046.5, 880.0, 698.46, 587.33],
  // 5. Fanfare — a bugle-call style register jump.
  [392.0, 523.25, 659.25, 783.99, 1046.5, 783.99, 659.25, 523.25],
];
const TIMESTABLE_NOTE_DURATION = 0.22; // seconds per note

let timesTableAudioCtx = null;
let timesTableMelodyIndex = 0;
let timesTableMusicNoteIndex = 0;
let timesTableNextNoteTime = 0;
let timesTableMusicSchedulerId = null;

function loadTimesTableMuted() {
  try {
    return localStorage.getItem(TIMESTABLE_MUTE_KEY) === "1";
  } catch (e) {
    return false;
  }
}

function saveTimesTableMuted() {
  try {
    localStorage.setItem(TIMESTABLE_MUTE_KEY, timesTableMuted ? "1" : "0");
  } catch (e) {
    console.warn("Could not save Times Table mute setting", e);
  }
}

let timesTableMuted = loadTimesTableMuted();

function updateTimesTableMuteBtn() {
  timesTableMuteBtn.textContent = timesTableMuted ? "🔇" : "🔊";
  const label = t(timesTableMuted ? "timesTableUnmute" : "timesTableMute");
  timesTableMuteBtn.setAttribute("aria-label", label);
  timesTableMuteBtn.title = label;
}

function ensureTimesTableAudioCtx() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  enableMediaPlaybackAudio();
  if (!timesTableAudioCtx) timesTableAudioCtx = new Ctx();
  if (timesTableAudioCtx.state !== "running") timesTableAudioCtx.resume().catch(() => {});
  return timesTableAudioCtx;
}

function playTimesTableNote(freq, when) {
  const ctx = timesTableAudioCtx;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, when);
  gain.gain.linearRampToValueAtTime(GAME_MUSIC_PEAK_GAIN, when + 0.02);
  gain.gain.linearRampToValueAtTime(0, when + TIMESTABLE_NOTE_DURATION);
  osc.connect(gain).connect(ctx.destination);
  osc.start(when);
  osc.stop(when + TIMESTABLE_NOTE_DURATION + 0.02);
}

function scheduleTimesTableMusic() {
  if (timesTableMuted || !timesTableRunning || !timesTableAudioCtx) return;
  const melody = TIMESTABLE_MELODIES[timesTableMelodyIndex % TIMESTABLE_MELODIES.length];
  while (timesTableNextNoteTime < timesTableAudioCtx.currentTime + 0.5) {
    playTimesTableNote(melody[timesTableMusicNoteIndex % melody.length], timesTableNextNoteTime);
    timesTableMusicNoteIndex++;
    timesTableNextNoteTime += TIMESTABLE_NOTE_DURATION;
  }
  timesTableMusicSchedulerId = setTimeout(scheduleTimesTableMusic, 150);
}

function startTimesTableMusic() {
  stopTimesTableMusic();
  if (timesTableMuted) return;
  const ctx = ensureTimesTableAudioCtx();
  if (!ctx) return;
  timesTableMusicNoteIndex = 0;
  timesTableNextNoteTime = ctx.currentTime + 0.05;
  scheduleTimesTableMusic();
}

function stopTimesTableMusic() {
  clearTimeout(timesTableMusicSchedulerId);
  timesTableMusicSchedulerId = null;
}

/* ---------- Times Table sound effects ----------
   Short one-off tones — see playTypeGameTone() for the same approach. */
function playTimesTableTone(freq, startOffset, duration, type, peakGain) {
  const ctx = timesTableAudioCtx;
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const when = ctx.currentTime + startOffset;
  gain.gain.setValueAtTime(0, when);
  gain.gain.linearRampToValueAtTime(Math.min(peakGain * GAME_SFX_BOOST, 0.4), when + 0.015);
  gain.gain.linearRampToValueAtTime(0, when + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(when);
  osc.stop(when + duration + 0.02);
}

function playTimesTableCorrectSfx() {
  if (timesTableMuted) return;
  if (!ensureTimesTableAudioCtx()) return;
  playTimesTableTone(880, 0, 0.1, "triangle", 0.08);
  playTimesTableTone(1318.51, 0.08, 0.14, "triangle", 0.08);
}

function playTimesTableWrongSfx() {
  if (timesTableMuted) return;
  if (!ensureTimesTableAudioCtx()) return;
  playTimesTableTone(180, 0, 0.18, "sawtooth", 0.07);
}

function playTimesTableLifeLostSfx() {
  if (timesTableMuted) return;
  if (!ensureTimesTableAudioCtx()) return;
  playTimesTableTone(220, 0, 0.16, "square", 0.08);
  playTimesTableTone(140, 0.13, 0.24, "square", 0.08);
}

timesTableMuteBtn.addEventListener("click", () => {
  timesTableMuted = !timesTableMuted;
  saveTimesTableMuted();
  updateTimesTableMuteBtn();
  if (timesTableMuted) stopTimesTableMusic();
  else if (timesTableRunning) startTimesTableMusic();
});

updateTimesTableMuteBtn();
updateTimesTableMaxTableUI();

/* ================= WORD LIST ================= */
const wordlistSearch = document.getElementById("wordlist-search");
const wordlistGrid = document.getElementById("wordlist-grid");
const wordlistLevelSelect = document.getElementById("wordlist-level");
const wordlistCountEl = document.getElementById("wordlist-count");
const wordlistAddDeckBtn = document.getElementById("wordlist-add-deck-btn");
const wordlistSelectAllCheckbox = document.getElementById("wordlist-select-all-checkbox");
// Keyed by word, since the same word can be reached under several levels.
const selectedWordlistWords = new Map();

// Shared "All" checkbox behavior for both word-list-style grids: checking it
// selects every checkbox currently rendered (the filtered/visible rows, not
// the whole underlying set — same scoping the old Select All button had);
// unchecking it clears the ENTIRE selection, including anything selected
// under a different search/filter that isn't currently visible (same as the
// old, now-removed, Clear Selection button did).
//
// Each row's own "change" listener is what actually adds it to the
// selection Set (see buildWordRow / the custom-words row builder) — this
// just flips every checkbox and dispatches that same event so those
// listeners still run. What used to make this laggy on a big list: those
// per-row listeners also called an O(n) "is everything checked?" grid scan
// (updateSelectAllCheckboxState) and the button-enable/count refresh after
// EVERY single row, turning one click into an O(n²) pass over the whole
// grid. suppressSelectionUpdates skips that per-row work while the loop
// runs, and afterUpdate() below does it once at the end instead.
let suppressSelectionUpdates = false;

function selectAllInGrid(grid, afterUpdate) {
  suppressSelectionUpdates = true;
  const checkboxes = Array.from(grid.querySelectorAll(".cw-select"));
  checkboxes.forEach((cb) => {
    if (!cb.checked) {
      cb.checked = true;
      cb.dispatchEvent(new Event("change"));
    }
  });
  suppressSelectionUpdates = false;
  if (afterUpdate) afterUpdate();
}

function updateSelectAllCheckboxState(checkbox, grid) {
  const checkboxes = Array.from(grid.querySelectorAll(".cw-select"));
  checkbox.checked = checkboxes.length > 0 && checkboxes.every((cb) => cb.checked);
}

// The total from the most recent renderWordList() pass, so the count label
// can be refreshed from a single checkbox toggle without redoing the whole
// filter/search pass just to know the total again.
let wordlistLastTotal = 0;

function updateWordlistCountLabel() {
  wordlistCountEl.textContent =
    selectedWordlistWords.size > 0
      ? t("wordlistSelectedCount", selectedWordlistWords.size, wordlistLastTotal)
      : t("customWordsCount", wordlistLastTotal);
}

function updateWordlistSelectionButtons() {
  const none = selectedWordlistWords.size === 0;
  wordlistAddDeckBtn.disabled = none;
  updateSelectAllCheckboxState(wordlistSelectAllCheckbox, wordlistGrid);
  updateWordlistCountLabel();
}

function masteryLabel(word) {
  if (progress.spellingStatus[word] === "wrong") return { text: t("spellingWrongBadge"), cls: "low" };
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

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "cw-select";
  checkbox.checked = selectedWordlistWords.has(w.word);
  checkbox.addEventListener("change", () => {
    if (checkbox.checked) selectedWordlistWords.set(w.word, w);
    else selectedWordlistWords.delete(w.word);
    if (!suppressSelectionUpdates) updateWordlistSelectionButtons();
  });
  row.appendChild(checkbox);

  const left = document.createElement("div");
  left.className = "wordlist-item-main";

  const wordEl = document.createElement("div");
  wordEl.className = "w speakable-line";
  wordEl.textContent = w.word;
  wordEl.title = "Tap to hear";
  wordEl.addEventListener("click", () => speak(w.word));
  left.appendChild(wordEl);

  const defEl = document.createElement("div");
  defEl.className = "d";
  defEl.textContent = w.definition;
  defEl.title = w.definition;
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

  const badges = document.createElement("div");
  badges.style.display = "flex";
  badges.style.gap = "6px";
  badges.style.alignItems = "center";

  // Set only on search hits from a level other than the one being browsed.
  if (w.level) {
    const levelBadge = document.createElement("span");
    levelBadge.className = "mastery";
    levelBadge.textContent = levelLabel(w.level);
    badges.appendChild(levelBadge);
  }

  const m = masteryLabel(w.word);
  const badge = document.createElement("span");
  badge.className = `mastery ${m.cls}`;
  badge.textContent = m.text;
  badges.appendChild(badge);
  row.appendChild(badges);

  return row;
}

function renderWordList() {
  const query = wordlistSearch.value.trim().toLowerCase();
  wordlistGrid.innerHTML = "";

  // The dropdown picks which level to browse ("" = all of them). Searching
  // always spans every level regardless: a word added automatically lands in
  // whichever level was guessed for it, which usually isn't the one you're on.
  const spanAllLevels = wordlistLevelSelect.value === "" || !!query;
  const levels = spanAllLevels ? currentSystem().levels.map((lv) => lv.id) : [wordlistLevelSelect.value];

  const words = [];
  levels.forEach((level) => {
    getAllWordsForLevel(level).forEach((w) => {
      if (!w.word.toLowerCase().includes(query)) return;
      if (words.some((seen) => seen.word === w.word)) return;
      // The level badge only earns its place when more than one is on screen.
      words.push(spanAllLevels ? { ...w, level } : w);
    });
  });

  wordlistLastTotal = words.length;
  updateWordlistCountLabel();
  wordlistAddDeckBtn.disabled = selectedWordlistWords.size === 0;
  if (words.length === 0) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = t("wordlistEmpty");
    wordlistGrid.appendChild(p);
    updateSelectAllCheckboxState(wordlistSelectAllCheckbox, wordlistGrid);
    return;
  }
  words.forEach((w) => wordlistGrid.appendChild(buildWordRow(w)));
  updateSelectAllCheckboxState(wordlistSelectAllCheckbox, wordlistGrid);
}

wordlistSearch.addEventListener("input", renderWordList);
wordlistLevelSelect.addEventListener("change", renderWordList);

wordlistAddDeckBtn.addEventListener("click", () => {
  if (!canUsePaidFeatures()) {
    promptUpgradeForFeature();
    return;
  }
  const picked = Array.from(selectedWordlistWords.values());
  if (picked.length === 0) return;
  const added = addToMyDeck(picked);
  selectedWordlistWords.clear();
  renderWordList();
  buildFlashDeck();
  // After the re-render, so it isn't overwritten by the count.
  wordlistCountEl.textContent = t("addedToMyDeck", added, picked.length);
});

wordlistSelectAllCheckbox.addEventListener("change", () => {
  if (wordlistSelectAllCheckbox.checked) {
    selectAllInGrid(wordlistGrid, updateWordlistSelectionButtons);
  } else {
    selectedWordlistWords.clear();
    renderWordList();
  }
});

/* ================= ADD WORD (manual + OCR) ================= */
const manualForm = document.getElementById("manual-add-form");
const manualEditId = document.getElementById("manual-edit-id");
const manualWordInput = document.getElementById("manual-word");
const manualDefinitionInput = document.getElementById("manual-definition");
const manualExampleInput = document.getElementById("manual-example");
const manualLevelSelect = document.getElementById("manual-level");
const manualSaveBtn = document.getElementById("manual-save-btn");
const manualCancelBtn = document.getElementById("manual-cancel-btn");
const manualAddStatus = document.getElementById("manual-add-status");
const customWordsGrid = document.getElementById("custom-words-grid");
const customWordsEmpty = document.getElementById("custom-words-empty");
const customWordsFailedBanner = document.getElementById("custom-words-failed-banner");
const customWordsFailedText = document.getElementById("custom-words-failed-text");
const customWordsStatus = document.getElementById("custom-words-status");
const customRetryAllBtn = document.getElementById("custom-retry-all-btn");
const customDeleteFailedBtn = document.getElementById("custom-delete-failed-btn");
const customSearchInput = document.getElementById("custom-search");
const customWordsCountEl = document.getElementById("custom-words-count");
const customDeleteSelectedBtn = document.getElementById("custom-delete-selected-btn");
const customSelectAllCheckbox = document.getElementById("custom-select-all-checkbox");
const customWordMgmtSelect = document.getElementById("custom-word-mgmt-select");
const customExportBtn = document.getElementById("custom-export-btn");
const customUploadBtn = document.getElementById("custom-upload-btn");
const customLevelSelect = document.getElementById("custom-level-select");
const customStorageNote = document.getElementById("custom-words-storage-note");
const customFilterDropdown = document.getElementById("custom-filter-dropdown");
const customFilterToggleBtn = document.getElementById("custom-filter-toggle-btn");
const customFilterPanel = document.getElementById("custom-filter-panel");
const customFilterLevelGroup = document.getElementById("custom-filter-level-group");
let selectedCustomWordIds = new Set();
// Empty set means no level filter (show every level) — "All levels" is
// represented implicitly rather than as a sentinel member of the set.
let customLevelFilterSet = new Set();
// Which of "recent"/"oldest"/"az"/"za"/"missing" are checked in the combined
// sort/filter dropdown — recent/oldest are mutually exclusive with each
// other, az/za likewise, but any of those can combine with "missing" (and
// with each other across pairs) as successive tiebreakers; see the
// comparator in renderCustomWords().
let customSortFlags = new Set(["recent"]);

const ocrLevelSelectEl = document.getElementById("ocr-level");
const addModeSingleBtn = document.getElementById("add-mode-single-btn");
const addModeBulkBtn = document.getElementById("add-mode-bulk-btn");
const bulkAddForm = document.getElementById("bulk-add-form");
const bulkWordsInput = document.getElementById("bulk-words-input");
const bulkAddSaveBtn = document.getElementById("bulk-add-save-btn");
const bulkAddStatus = document.getElementById("bulk-add-status");

function genId() {
  return `cw_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// Rough syllable count via contiguous vowel-group counting (treats y as a
// vowel, drops a trailing silent e first). Not linguistically exact, but
// good enough as one difficulty signal.
function countSyllables(word) {
  const w = word.replace(/e$/, "");
  const groups = w.match(/[aeiouy]+/g);
  return groups ? groups.length : 1;
}

// Endings/beginnings common in academic/Latinate vocabulary (-tion, un-,
// etc). A prefix only counts if what's left after it is at least 3 letters
// — otherwise short, unrelated words that merely start with the same two or
// three letters (e.g. "resilient" starting with "re") would false-positive.
const ACADEMIC_SUFFIX = /(tion|sion|ity|ology|ance|ence|ism|ive|ous|ize|ify)$/;
const ACADEMIC_PREFIX = /^(inter|trans|sub|anti|pre|un|re|dis)/;

// A word's difficulty, 0 (easiest) to 1 (hardest), from its shape alone —
// syllable count (weighted most), letter length (a weaker, secondary
// signal), and whether it carries an academic-vocabulary affix. Pure
// function, no network calls, so it works the same for a word that's never
// been looked up anywhere. It only ever sees words missing from our curated
// banks (see guessLevelForWord below) — a word's real-world familiarity
// ("aluminium" is long but common; "yield" is short but abstract) isn't
// something word SHAPE can tell you; those stay best fixed by adding the
// word to WORD_BANK/WORD_BANK_KO with an explicit level.
function wordDifficultyScore(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;

  const syllables = countSyllables(w);
  const len = w.length;
  const prefixMatch = w.match(ACADEMIC_PREFIX);
  const hasPrefix = !!prefixMatch && w.length - prefixMatch[0].length >= 3;
  const hasAffix = hasPrefix || ACADEMIC_SUFFIX.test(w);

  const syllableScore = Math.min(syllables / 4, 1);
  const lengthScore = Math.min(len / 12, 1);
  const affixScore = hasAffix ? 1 : 0;

  const score = 0.5 * syllableScore + 0.2 * lengthScore + 0.3 * affixScore;
  return Math.max(0, Math.min(1, score));
}

// Maps a 0-1 score onto one of N level ids by splitting the range into N
// equal buckets — works the same whether a track has 3 levels or 5.
function scoreToLevel(score, levelIds) {
  const idx = Math.min(levelIds.length - 1, Math.floor(score * levelIds.length));
  return levelIds[idx];
}

// Best-effort automatic level for a word, for a given language track (defaults
// to the currently active one): reuse the level already assigned to it in our
// own curated word banks when it's a known word; otherwise fall back to a
// shape-based difficulty score. This is an estimate, not a real difficulty
// assessment — users can always fix it via Edit.
function guessLevelForWord(word, lang) {
  lang = lang || currentLang;
  const w = word.toLowerCase();
  const sys = SYSTEMS[lang];
  const hit =
    sys.bank.vocabulary.find((v) => v.word.toLowerCase() === w) ||
    (sys.bank.spelling || []).find((v) => v.word.toLowerCase() === w) ||
    (sys.bank.synonyms || []).find((v) => v.word.toLowerCase() === w);
  if (hit) return hit.level;

  const levelIds = sys.levels.map((lv) => lv.id);
  return scoreToLevel(wordDifficultyScore(w), levelIds);
}

function setAddMode(mode) {
  const single = mode === "single";
  manualForm.hidden = !single;
  bulkAddForm.hidden = single;
  addModeSingleBtn.classList.toggle("accent", single);
  addModeSingleBtn.classList.toggle("neutral", !single);
  addModeBulkBtn.classList.toggle("accent", !single);
  addModeBulkBtn.classList.toggle("neutral", single);
}

addModeSingleBtn.addEventListener("click", () => setAddMode("single"));
addModeBulkBtn.addEventListener("click", () => setAddMode("bulk"));

bulkAddSaveBtn.addEventListener("click", async () => {
  if (!canUsePaidFeatures()) {
    promptUpgradeForFeature();
    return;
  }
  const allWords = Array.from(
    new Set(
      bulkWordsInput.value
        .split(/[\n,]+/)
        .map((w) => w.trim().toLowerCase())
        .filter((w) => /^[a-z']{2,}$/.test(w))
    )
  );
  if (allWords.length === 0) {
    bulkAddStatus.textContent = t("bulkNoWords");
    return;
  }

  // Words already saved in customWords are dropped before the lookup step,
  // so they never cost an unnecessary dictionary API call.
  const words = allWords.filter((w) => !findCustomWordByText(w));
  const skipped = allWords.length - words.length;

  bulkAddSaveBtn.disabled = true;

  let added = [];
  let failedCount = 0;
  if (words.length > 0) {
    bulkAddStatus.textContent = t("ocrAddingStatus", words.length);

    const infos = await mapWithConcurrency(words, 4, (w) => fetchWordInfo(w), (done, total) => {
      bulkAddStatus.textContent = t("ocrAddingProgress", done, total);
    });

    added = words.map((word, i) => {
      const info = infos[i];
      const newWord = {
        id: genId(),
        word,
        example: (info && info.example) || "",
        definitionEn: (info && info.definitionEn) || null,
        definitionKo: (info && info.definitionKo) || null,
        levelEn: guessLevelForWord(word, "en"),
        levelKo: guessLevelForWord(word, "ko"),
        noDefinitionEn: !(info && info.definitionEn),
        noDefinitionKo: !(info && info.definitionKo),
        source: "bulk",
        createdAt: Date.now(),
        ...newWordStorageFlags(),
      };
      customWords.push(newWord);
      return newWord;
    });
    saveCustomWords();
    const pushResult = await pushSharedWords(added);
    failedCount = pushResult.failed.length;

    // A word that came back without a definition on the first pass — often
    // dictionaryapi.dev rate-limiting under a big batch, not the word
    // actually being unknown — gets one automatic retry right away, instead
    // of requiring a separate manual "Retry All" click afterwards.
    const stillMissing = added.filter((w) => w.noDefinitionEn || w.noDefinitionKo);
    if (stillMissing.length > 0) {
      bulkAddStatus.textContent = t("bulkRetryingMissing", stillMissing.length);
      const retryInfos = await mapWithConcurrency(
        stillMissing,
        4,
        (w) => fetchWordInfo(w.word),
        (done, total) => {
          bulkAddStatus.textContent = t("retryProgress", done, total);
        }
      );
      stillMissing.forEach((w, i) => applyFetchedInfo(w, retryInfos[i]));
      saveCustomWords();
      await pushSharedWords(stillMissing.filter((w) => w.remote));
    }
  }

  const savedCount = added.length - failedCount;
  if (failedCount > 0) {
    bulkAddStatus.textContent = withQuotaNote(t("bulkAddedWithFailures", savedCount, failedCount));
  } else if (skipped > 0) {
    bulkAddStatus.textContent = withQuotaNote(t("bulkAddedWithSkipped", added.length, skipped));
  } else {
    bulkAddStatus.textContent = withQuotaNote(t("bulkAddedStatus", added.length));
  }
  bulkWordsInput.value = "";
  bulkAddSaveBtn.disabled = false;
  renderCustomWords();
  renderWordList();
});

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
  populateBulkLevelSelect();
  populateWordlistLevelSelect();
  renderCustomLevelFilter();
}

// One checkbox per level (plus "All levels") in the combined sort/filter
// dropdown's level group. Rebuilt whenever the level list can change
// (language switch, a new level added) — any filter level that no longer
// exists in this track (e.g. it was set on the other language's levels)
// is dropped instead of silently showing zero results with no obvious way
// out. "All levels" and any specific level are mutually exclusive; multiple
// specific levels can be checked together (shows the union).
function renderCustomLevelFilter() {
  if (!customFilterLevelGroup) return;
  const levelIds = currentSystem().levels.map((lv) => lv.id);
  customLevelFilterSet.forEach((id) => {
    if (!levelIds.includes(id)) customLevelFilterSet.delete(id);
  });

  customFilterLevelGroup.innerHTML = "";
  const makeCheckbox = (id, label, isAllLevels) => {
    const wrapLabel = document.createElement("label");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = isAllLevels ? customLevelFilterSet.size === 0 : customLevelFilterSet.has(id);
    cb.addEventListener("change", () => {
      if (isAllLevels) {
        customLevelFilterSet.clear();
      } else if (cb.checked) {
        customLevelFilterSet.add(id);
      } else {
        customLevelFilterSet.delete(id);
      }
      renderCustomLevelFilter();
      renderCustomWords();
    });
    const span = document.createElement("span");
    span.textContent = label;
    wrapLabel.appendChild(cb);
    wrapLabel.appendChild(span);
    customFilterLevelGroup.appendChild(wrapLabel);
  };

  makeCheckbox("", t("wordlistAllLevels"), true);
  currentSystem().levels.forEach((lv) => makeCheckbox(lv.id, lv.label, false));
}

// Follows the level you're practising, unless you've deliberately switched
// the word list over to showing every level.
function populateWordlistLevelSelect() {
  // An empty select reads as "" too, so only treat it as the all-levels
  // choice once the options are actually there to have chosen from.
  const wasShowingAllLevels = wordlistLevelSelect.options.length > 0 && wordlistLevelSelect.value === "";
  wordlistLevelSelect.innerHTML = "";
  const all = document.createElement("option");
  all.value = "";
  all.textContent = t("wordlistAllLevels");
  wordlistLevelSelect.appendChild(all);
  currentSystem().levels.forEach((lv) => {
    const opt = document.createElement("option");
    opt.value = lv.id;
    opt.textContent = lv.label;
    wordlistLevelSelect.appendChild(opt);
  });
  wordlistLevelSelect.value = wasShowingAllLevels ? "" : currentLevel;
}

// Unlike the selects above this one isn't reporting a level, it's an action —
// so it sits on a placeholder and snaps back to it after each use.
function populateBulkLevelSelect() {
  customLevelSelect.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = t("changeLevelPlaceholder");
  customLevelSelect.appendChild(placeholder);
  currentSystem().levels.forEach((lv) => {
    const opt = document.createElement("option");
    opt.value = lv.id;
    opt.textContent = lv.label;
    customLevelSelect.appendChild(opt);
  });
  customLevelSelect.value = "";
}

manualForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!canUsePaidFeatures()) {
    promptUpgradeForFeature();
    return;
  }
  const word = manualWordInput.value.trim();
  const definition = manualDefinitionInput.value.trim();
  const example = manualExampleInput.value.trim();
  const level = manualLevelSelect.value;
  if (!word || !definition) return;

  const editId = manualEditId.value;

  if (!editId && findCustomWordByText(word)) {
    manualAddStatus.textContent = t("duplicateWordFound", word);
    return;
  }
  manualAddStatus.textContent = "";

  let newWord = null;
  let editedWord = null;
  if (editId) {
    const existing = customWords.find((w) => w.id === editId);
    if (existing) {
      existing.word = word;
      existing.example = example;
      existing[defKey(currentLang)] = definition;
      existing[levelKey(currentLang)] = level;
      existing[noDefKey(currentLang)] = false;
      editedWord = existing;
    }
  } else {
    const other = otherLang(currentLang);
    newWord = { id: genId(), word, example, source: "manual", createdAt: Date.now(), ...newWordStorageFlags() };
    newWord[defKey(currentLang)] = definition;
    newWord[levelKey(currentLang)] = level;
    newWord[noDefKey(currentLang)] = false;
    // The other language's meaning isn't typed in by hand — leave it flagged
    // as not-yet-found and try to fill it in automatically in the background.
    newWord[defKey(other)] = null;
    newWord[levelKey(other)] = guessLevelForWord(word, other);
    newWord[noDefKey(other)] = true;
    customWords.push(newWord);
  }
  saveCustomWords();
  resetManualForm();
  renderCustomWords();
  renderWordList();
  pushSharedWords([newWord || editedWord].filter((w) => w && w.remote));

  if (newWord) {
    const other = otherLang(currentLang);
    fetchWordInfo(word).then((info) => {
      if (!info) return;
      const val = other === "ko" ? info.definitionKo : info.definitionEn;
      if (val) {
        newWord[defKey(other)] = val;
        newWord[noDefKey(other)] = false;
        if (!newWord.example && info.example) newWord.example = info.example;
        saveCustomWords();
        renderCustomWords();
        pushSharedWords(newWord.remote ? [newWord] : []);
      }
    });
  }
});

manualCancelBtn.addEventListener("click", resetManualForm);

function resetManualForm() {
  manualForm.reset();
  manualEditId.value = "";
  if (manualLevelSelect.options.length) manualLevelSelect.value = currentLevel;
  manualCancelBtn.style.display = "none";
  manualSaveBtn.textContent = t("saveWordBtn");
  manualAddStatus.textContent = "";
}

function startEditCustomWord(id) {
  const w = customWords.find((cw) => cw.id === id);
  if (!w) return;
  manualEditId.value = w.id;
  manualWordInput.value = w.word;
  manualDefinitionInput.value = cwNoDefinition(w) ? "" : cwDefinition(w);
  manualExampleInput.value = w.example || "";
  manualLevelSelect.value = cwLevel(w);
  manualCancelBtn.style.display = "inline-block";
  manualSaveBtn.textContent = t("updateWordBtn");
  manualAddStatus.textContent = "";
  manualWordInput.focus();
}

function deleteCustomWord(id) {
  if (!confirm(t("deleteConfirm"))) return;
  const removed = customWords.find((w) => w.id === id);
  customWords = customWords.filter((w) => w.id !== id);
  saveCustomWords();
  renderCustomWords();
  renderWordList();
  if (removed && removed.remote) removeSharedWords([id]);
}

// Applies a freshly fetched {definitionEn, definitionKo, example} result to a
// custom word, filling in whichever language sides were still missing.
function applyFetchedInfo(w, info) {
  if (!info) return;
  if (info.definitionEn) {
    w.definitionEn = info.definitionEn;
    w.noDefinitionEn = false;
  }
  if (info.definitionKo) {
    w.definitionKo = info.definitionKo;
    w.noDefinitionKo = false;
  }
  if (info.example && !w.example) w.example = info.example;
}

// Appends a plain-language note to a status message when the free
// translation API's daily quota is why a Korean meaning didn't come back,
// so it doesn't just look like every retry silently failed.
function withQuotaNote(message) {
  return translationQuotaExceeded ? `${message} ${t("translationQuotaExceeded")}` : message;
}

async function retrySingleWord(id) {
  const w = customWords.find((cw) => cw.id === id);
  if (!w) return;
  customWordsStatus.textContent = t("retryingOne");
  const info = await fetchWordInfo(w.word);
  applyFetchedInfo(w, info);
  saveCustomWords();
  customWordsStatus.textContent = withQuotaNote(t("retryResult", cwNoDefinition(w) ? 0 : 1, 1));
  renderCustomWords();
  renderWordList();
  if (w.remote) pushSharedWords([w]);
}

async function retryAllFailedWords() {
  const failed = myCustomWords().filter((w) => cwNoDefinition(w));
  if (failed.length === 0) return;
  customRetryAllBtn.disabled = true;
  customDeleteFailedBtn.disabled = true;
  customWordsStatus.textContent = t("retryProgress", 0, failed.length);

  const infos = await mapWithConcurrency(failed, 4, (w) => fetchWordInfo(w.word), (done, total) => {
    customWordsStatus.textContent = t("retryProgress", done, total);
  });

  let foundCount = 0;
  failed.forEach((w, i) => {
    applyFetchedInfo(w, infos[i]);
    if (!cwNoDefinition(w)) foundCount++;
  });
  saveCustomWords();

  customWordsStatus.textContent = withQuotaNote(t("retryResult", foundCount, failed.length));
  customRetryAllBtn.disabled = false;
  customDeleteFailedBtn.disabled = false;
  renderCustomWords();
  renderWordList();
  await pushSharedWords(failed.filter((w) => w.remote));
}

function deleteAllFailedWords() {
  const failed = myCustomWords().filter((w) => cwNoDefinition(w));
  if (failed.length === 0) return;
  if (!confirm(t("deleteAllFailedConfirm", failed.length))) return;
  const failedIds = new Set(failed.map((w) => w.id));
  customWords = customWords.filter((w) => !failedIds.has(w.id));
  saveCustomWords();
  customWordsStatus.textContent = "";
  renderCustomWords();
  renderWordList();
  removeSharedWords(failed.filter((w) => w.remote).map((w) => w.id));
}

function updateDeleteSelectedBtn() {
  const hasSelection = selectedCustomWordIds.size > 0;
  customDeleteSelectedBtn.disabled = !hasSelection;
  // Red background once words are actually selected, instead of staying a
  // plain neutral pill the whole time — makes a destructive action visibly
  // "armed" rather than looking the same whether it will do anything or not.
  customDeleteSelectedBtn.classList.toggle("error", hasSelection);
  customDeleteSelectedBtn.classList.toggle("neutral", !hasSelection);
  customLevelSelect.disabled = !hasSelection;
}

// The words this section manages — an admin's own shared additions, a paid
// account's own private words, or anything not yet synced/volatile — never
// someone else's shared or private words that merely got merged into
// customWords for practice purposes (Quiz/Spelling/Word List still use the
// full customWords, unfiltered).
function myCustomWords() {
  return customWords.filter(isMyCustomWord);
}

// The current search + level-filter view of a word set — shared by the grid
// render below and any action (like "Select Incomplete") that should only
// touch what's actually visible right now, same as "Select All" already does.
function visibleCustomWords(mine) {
  const query = customSearchInput.value.trim().toLowerCase();
  return mine.filter((w) => {
    if (customLevelFilterSet.size > 0 && !customLevelFilterSet.has(cwLevel(w))) return false;
    if (!query) return true;
    const meaning = cwDefinition(w) || "";
    return w.word.toLowerCase().includes(query) || meaning.toLowerCase().includes(query);
  });
}

function isIncompleteCustomWord(w) {
  return cwNoDefinition(w) || !w.example;
}

function renderCustomWords() {
  // Any highlight from a previous "Incomplete words first" selection is
  // cleared on every re-render; the checkbox handler that sets it re-applies
  // it after calling this function, so it isn't wiped by its own render.
  customWordsStatus.classList.remove("status-highlight");
  const mine = myCustomWords();

  // Drop selection for any word that no longer exists (e.g. deleted elsewhere).
  const liveIds = new Set(mine.map((w) => w.id));
  selectedCustomWordIds.forEach((id) => {
    if (!liveIds.has(id)) selectedCustomWordIds.delete(id);
  });

  const failedWords = mine.filter((w) => cwNoDefinition(w));
  if (failedWords.length > 0) {
    customWordsFailedBanner.hidden = false;
    customWordsFailedText.textContent = t("failedWordsBanner", failedWords.length);
  } else {
    customWordsFailedBanner.hidden = true;
  }

  updateDeleteSelectedBtn();

  // Words still held only in this browser can be pushed up to the server.
  const localOnly = mine.filter((w) => !w.remote && !w.volatile);
  customUploadBtn.hidden = !(canWriteServerWords() && localOnly.length > 0);
  customUploadBtn.textContent = t("uploadLocalBtn", localOnly.length);
  // Kept computed (for later use) but not shown — the "saved on the
  // server"/"private to your account" note was more clutter than help.
  customStorageNote.hidden = true;
  customStorageNote.textContent = t(storageNoteKey());

  customWordsGrid.innerHTML = "";
  if (mine.length === 0) {
    customWordsEmpty.hidden = false;
    customWordsCountEl.textContent = "";
    updateSelectAllCheckboxState(customSelectAllCheckbox, customWordsGrid);
    return;
  }
  customWordsEmpty.hidden = true;

  const shown = visibleCustomWords(mine);

  // Each checked flag is applied in this fixed priority order as a
  // successive tiebreaker (incomplete-first, then alphabetical, then
  // recency), so combinations like "Incomplete words first" + "A → Z" sort
  // incomplete words first and alphabetically within each group.
  shown.sort((a, b) => {
    if (customSortFlags.has("missing")) {
      const aMissing = isIncompleteCustomWord(a) ? 0 : 1;
      const bMissing = isIncompleteCustomWord(b) ? 0 : 1;
      if (aMissing !== bMissing) return aMissing - bMissing;
    }
    if (customSortFlags.has("az")) {
      const c = a.word.localeCompare(b.word);
      if (c !== 0) return c;
    }
    if (customSortFlags.has("za")) {
      const c = b.word.localeCompare(a.word);
      if (c !== 0) return c;
    }
    if (customSortFlags.has("oldest")) return a.createdAt - b.createdAt;
    return b.createdAt - a.createdAt;
  });

  customWordsCountEl.textContent = t("customWordsCount", shown.length);
  shown.forEach((w) => {
      const row = document.createElement("div");
      row.className = "wordlist-item";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "cw-select";
      checkbox.checked = selectedCustomWordIds.has(w.id);
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) selectedCustomWordIds.add(w.id);
        else selectedCustomWordIds.delete(w.id);
        if (!suppressSelectionUpdates) {
          updateDeleteSelectedBtn();
          updateSelectAllCheckboxState(customSelectAllCheckbox, customWordsGrid);
        }
      });
      row.appendChild(checkbox);

      const left = document.createElement("div");
      left.className = "wordlist-item-main";
      const wordEl = document.createElement("div");
      wordEl.className = "w speakable-line";
      wordEl.title = "Tap to hear";
      wordEl.textContent = w.word;
      wordEl.addEventListener("click", () => speak(w.word));
      left.appendChild(wordEl);

      const defEl = document.createElement("div");
      defEl.className = "d";
      const definitionText = cwDefinition(w) || t("ocrNoDefFound");
      defEl.textContent = definitionText;
      defEl.title = definitionText;
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
      badge.textContent = levelLabel(cwLevel(w));
      right.appendChild(badge);

      const btnRow = document.createElement("div");
      btnRow.style.display = "flex";
      btnRow.style.gap = "6px";

      if (cwNoDefinition(w)) {
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
  updateSelectAllCheckboxState(customSelectAllCheckbox, customWordsGrid);
}

customRetryAllBtn.addEventListener("click", retryAllFailedWords);
customDeleteFailedBtn.addEventListener("click", deleteAllFailedWords);

customSearchInput.addEventListener("input", renderCustomWords);

// Bulk levels are set for the language track you're looking at; the other
// track keeps the level that was guessed for it, the same as editing one word.
customLevelSelect.addEventListener("change", () => {
  const level = customLevelSelect.value;
  if (!level) return;
  const selected = customWords.filter((w) => selectedCustomWordIds.has(w.id));
  const label = levelLabel(level);
  customLevelSelect.value = "";
  if (selected.length === 0) return;
  if (!confirm(t("changeLevelConfirm", selected.length, label))) return;

  selected.forEach((w) => {
    w[levelKey(currentLang)] = level;
  });
  selectedCustomWordIds.clear();
  saveCustomWords();
  customWordsStatus.textContent = t("changeLevelDone", selected.length, label);
  renderCustomWords();
  renderWordList();
  pushSharedWords(selected.filter((w) => w.remote));
});

customUploadBtn.addEventListener("click", async () => {
  const localOnly = customWords.filter((w) => !w.remote && !w.volatile);
  if (localOnly.length === 0) return;
  if (!confirm(t("uploadLocalConfirm", localOnly.length))) return;
  customUploadBtn.disabled = true;
  try {
    // The API caps how many words one request may carry.
    for (let i = 0; i < localOnly.length; i += 100) {
      const batch = localOnly.slice(i, i + 100);
      await api("/words", { method: "PUT", body: JSON.stringify({ words: batch }) });
      batch.forEach((w) => {
        w.remote = true;
      });
    }
    saveCustomWords();
    customWordsStatus.textContent = t("uploadLocalDone", localOnly.length);
  } catch (e) {
    customWordsStatus.textContent = t("uploadLocalFailed");
  }
  customUploadBtn.disabled = false;
  renderCustomWords();
});

customDeleteSelectedBtn.addEventListener("click", () => {
  if (selectedCustomWordIds.size === 0) return;
  const selected = customWords.filter((w) => selectedCustomWordIds.has(w.id));
  // myCustomWords() (what this grid actually lists) already keeps a paid
  // account down to its own words, so this only ever trips on a stale
  // selection — but a paid account should never be able to delete a shared,
  // admin-owned word regardless.
  const blocked = new Set(
    currentUser && currentUser.role === "paid"
      ? selected.filter((w) => w.remote && w.ownerId !== currentUser.id).map((w) => w.id)
      : []
  );
  const deletable = selected.filter((w) => !blocked.has(w.id));
  if (blocked.size > 0) {
    alert(t("customDeleteOthersBlocked"));
    if (deletable.length === 0) return;
  }
  if (!confirm(t("deleteSelectedConfirm", deletable.length))) return;
  const deletableIds = new Set(deletable.map((w) => w.id));
  const removedRemoteIds = deletable.filter((w) => w.remote).map((w) => w.id);
  customWords = customWords.filter((w) => !deletableIds.has(w.id));
  selectedCustomWordIds.clear();
  saveCustomWords();
  renderCustomWords();
  renderWordList();
  removeSharedWords(removedRemoteIds);
});

customSelectAllCheckbox.addEventListener("change", () => {
  if (customSelectAllCheckbox.checked) {
    selectAllInGrid(customWordsGrid, () => {
      updateDeleteSelectedBtn();
      updateSelectAllCheckboxState(customSelectAllCheckbox, customWordsGrid);
    });
  } else {
    selectedCustomWordIds.clear();
    renderCustomWords();
  }
});

/* ---------- Combined sort/filter dropdown ---------- */
function setCustomFilterPanelOpen(open) {
  customFilterPanel.hidden = !open;
  customFilterToggleBtn.classList.toggle("open", open);
}

customFilterToggleBtn.addEventListener("click", () => {
  setCustomFilterPanelOpen(customFilterPanel.hidden);
});

document.addEventListener("click", (e) => {
  if (!customFilterPanel.hidden && !customFilterDropdown.contains(e.target)) {
    setCustomFilterPanelOpen(false);
  }
});

const CUSTOM_SORT_OPPOSITE = { recent: "oldest", oldest: "recent", az: "za", za: "az" };

document.querySelectorAll('#custom-filter-panel [data-sort-flag]').forEach((cb) => {
  cb.addEventListener("change", () => {
    const flag = cb.dataset.sortFlag;
    let incompleteSelection = null;
    if (cb.checked) {
      customSortFlags.add(flag);
      const opposite = CUSTOM_SORT_OPPOSITE[flag];
      if (opposite) {
        customSortFlags.delete(opposite);
        const oppositeCb = document.getElementById(`custom-sort-${opposite}`);
        if (oppositeCb) oppositeCb.checked = false;
      }
      // Selecting "Incomplete words first" also selects every currently
      // visible incomplete word right away — replaces the old dedicated
      // Select Incomplete button.
      if (flag === "missing") {
        const incomplete = visibleCustomWords(myCustomWords()).filter(isIncompleteCustomWord);
        if (incomplete.length > 0) selectedCustomWordIds = new Set(incomplete.map((w) => w.id));
        incompleteSelection = incomplete.length;
      }
    } else {
      customSortFlags.delete(flag);
    }
    renderCustomWords();
    // Applied after renderCustomWords() (which always clears any previous
    // highlight) so this one actually sticks instead of being wiped by its
    // own render pass.
    if (incompleteSelection != null) {
      customWordsStatus.textContent =
        incompleteSelection > 0 ? t("selectIncompleteDone", incompleteSelection) : t("selectIncompleteNoneFound");
      customWordsStatus.classList.toggle("status-highlight", incompleteSelection > 0);
    }
  });
});

// Merges every group of duplicate words (same text, case-insensitive) into a
// single entry: the oldest entry in each group is kept and filled in with
// whatever fields (definitions, example, level) the newer duplicates have
// that it's missing, and the rest are removed.
function mergeDuplicateCustomWords() {
  const groups = findDuplicateCustomWordGroups();
  if (groups.length === 0) {
    customWordsStatus.textContent = t("noDuplicatesFound");
    return;
  }
  const extraCount = groups.reduce((sum, g) => sum + g.length - 1, 0);
  if (!confirm(t("mergeDuplicatesConfirm", groups.length, extraCount))) return;

  const removedIds = new Set();
  const removedRemoteIds = [];
  const mergedKeepers = [];

  groups.forEach((group) => {
    const sorted = group.slice().sort((a, b) => a.createdAt - b.createdAt);
    const keeper = sorted[0];
    sorted.slice(1).forEach((dup) => {
      if (!keeper.definitionEn && dup.definitionEn) keeper.definitionEn = dup.definitionEn;
      if (!keeper.definitionKo && dup.definitionKo) keeper.definitionKo = dup.definitionKo;
      if (!keeper.example && dup.example) keeper.example = dup.example;
      if (!keeper.levelEn && dup.levelEn) keeper.levelEn = dup.levelEn;
      if (!keeper.levelKo && dup.levelKo) keeper.levelKo = dup.levelKo;
      removedIds.add(dup.id);
      if (dup.remote) removedRemoteIds.push(dup.id);
    });
    keeper.noDefinitionEn = !keeper.definitionEn;
    keeper.noDefinitionKo = !keeper.definitionKo;
    mergedKeepers.push(keeper);
  });

  customWords = customWords.filter((w) => !removedIds.has(w.id));
  selectedCustomWordIds.clear();
  saveCustomWords();
  customWordsStatus.textContent = t("mergeDuplicatesDone", groups.length, removedIds.size);
  renderCustomWords();
  renderWordList();
  pushSharedWords(mergedKeepers.filter((w) => w.remote));
  removeSharedWords(removedRemoteIds);
}

/* ---------- Excel export/import for My Added Words ----------
   Fixed English column headers (not localized) so a file exported in one
   language round-trips through import regardless of which language the
   session happens to be in at the time. */
const EXCEL_COL_WORD = "Word";
const EXCEL_COL_DEF_EN = "Definition (English)";
const EXCEL_COL_DEF_KO = "Definition (Korean)";
const EXCEL_COL_EXAMPLE = "Example";
const EXCEL_COL_LEVEL_EN = "Level (English)";
const EXCEL_COL_LEVEL_KO = "Level (Korean)";
const EXCEL_COLUMNS = [EXCEL_COL_WORD, EXCEL_COL_DEF_EN, EXCEL_COL_DEF_KO, EXCEL_COL_EXAMPLE, EXCEL_COL_LEVEL_EN, EXCEL_COL_LEVEL_KO];

function levelLabelIn(levelId, levels) {
  const lv = levels.find((l) => l.id === levelId);
  return lv ? lv.label : levelId || "";
}

// Matches a cell's text against a level system's ids or labels — accepts
// either "year4" or "Year 4", case-insensitively — so a hand-edited sheet
// doesn't have to use the exact internal id.
function parseLevelValue(raw, levels) {
  const s = String(raw == null ? "" : raw).trim();
  if (!s) return null;
  const lower = s.toLowerCase();
  const match = levels.find((lv) => lv.id.toLowerCase() === lower || lv.label.toLowerCase() === lower);
  return match ? match.id : null;
}

customExportBtn.addEventListener("click", () => {
  if (typeof XLSX === "undefined") {
    customWordsStatus.textContent = t("excelToolUnavailable");
    return;
  }
  const mine = myCustomWords();
  const rows = selectedCustomWordIds.size > 0 ? mine.filter((w) => selectedCustomWordIds.has(w.id)) : mine;
  if (rows.length === 0) {
    customWordsStatus.textContent = t("exportExcelNoWords");
    return;
  }

  const sheetRows = rows.map((w) => ({
    [EXCEL_COL_WORD]: w.word,
    [EXCEL_COL_DEF_EN]: w.definitionEn || "",
    [EXCEL_COL_DEF_KO]: w.definitionKo || "",
    [EXCEL_COL_EXAMPLE]: w.example || "",
    [EXCEL_COL_LEVEL_EN]: levelLabelIn(w.levelEn, LEVELS),
    [EXCEL_COL_LEVEL_KO]: levelLabelIn(w.levelKo, KO_LEVELS),
  }));
  const ws = XLSX.utils.json_to_sheet(sheetRows, { header: EXCEL_COLUMNS });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Words");
  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `my-added-words-${dateStr}.xlsx`);
  customWordsStatus.textContent = t("exportExcelDone", rows.length);
});

// Cleans up a definition/example that already has leaked Wiktionary CSS
// baked into it from before stripHtml() learned to strip <style> blocks —
// that fix only stops it happening to new lookups, so anything imported
// earlier still has the raw rule sitting in the text (e.g. "...not
// defective or faulty. .mw-parser-output .defdate{font-size:smaller}").
function sanitizeLeakedMarkup(text) {
  if (!text) return text;
  return text
    .replace(/\s*\.mw-parser-output\b[^{}]*\{[^{}]*\}\s*/g, " ")
    // Wiktionary editorial notes meant for its own contributors, not for
    // someone reading the definition — never useful content on its own.
    .replace(/\(Discuss this sense\)\s*/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

async function cleanCorruptedCustomWordsText() {
  const cleaned = [];
  myCustomWords().forEach((w) => {
    const definitionEn = sanitizeLeakedMarkup(w.definitionEn);
    const definitionKo = sanitizeLeakedMarkup(w.definitionKo);
    const example = sanitizeLeakedMarkup(w.example);
    if (definitionEn !== w.definitionEn || definitionKo !== w.definitionKo || example !== w.example) {
      w.definitionEn = definitionEn;
      w.definitionKo = definitionKo;
      w.example = example;
      cleaned.push(w);
    }
  });
  if (cleaned.length === 0) {
    customWordsStatus.textContent = t("cleanTextNoneFound");
    return;
  }
  saveCustomWords();
  renderCustomWords();
  renderWordList();
  const pushResult = await pushSharedWords(cleaned.filter((w) => w.remote));
  customWordsStatus.textContent =
    pushResult.failed.length > 0
      ? t("bulkAddedWithFailures", cleaned.length - pushResult.failed.length, pushResult.failed.length)
      : t("cleanTextDone", cleaned.length);
}

// Finds words whose stored Korean meaning isn't actually Korean (the free
// translation lookup sometimes returns English text, or just echoes the
// word back) and re-flags them as missing so "Missing meaning first" surfaces
// them and Retry (single or All) can fetch a real one. Meanings typed in by
// hand are left alone.
async function checkKoreanMeaningsForCustomWords() {
  const flagged = [];
  myCustomWords().forEach((w) => {
    if (w.source === "manual") return;
    if (isBadKoreanMeaning(w.word, w.definitionKo)) {
      w.definitionKo = null;
      w.noDefinitionKo = true;
      flagged.push(w);
    }
  });
  if (flagged.length === 0) {
    customWordsStatus.textContent = t("checkKoreanNoneFound");
    return;
  }
  saveCustomWords();
  renderCustomWords();
  renderWordList();
  await pushSharedWords(flagged.filter((w) => w.remote));
  customWordsStatus.textContent = t("checkKoreanDone", flagged.length);
}

// The "Word Management" dropdown sits on a placeholder and snaps back to it
// after each use — same pattern as the "Change level" action-select above.
customWordMgmtSelect.addEventListener("change", async () => {
  const action = customWordMgmtSelect.value;
  customWordMgmtSelect.value = "";
  if (action === "merge") mergeDuplicateCustomWords();
  else if (action === "clean") await cleanCorruptedCustomWordsText();
  else if (action === "checkKorean") await checkKoreanMeaningsForCustomWords();
});

/* ---------- Admin: paid-signup special codes ---------- */
const adminCodesGenerateBtn = document.getElementById("admin-codes-generate-btn");
const adminCodesSort = document.getElementById("admin-codes-sort");
const adminCodesGrid = document.getElementById("admin-codes-grid");
const adminCodesCountEl = document.getElementById("admin-codes-count");
const adminCodesEmpty = document.getElementById("admin-codes-empty");
let adminCodes = [];

async function loadAdminCodes() {
  if (!serverAdmin) return;
  try {
    const { codes } = await api("/admin/codes");
    adminCodes = codes;
  } catch (e) {
    console.warn("Could not load special codes", e);
  }
  renderAdminCodes();
}

function sortedAdminCodes() {
  const sort = adminCodesSort.value || "newest";
  return [...adminCodes].sort((a, b) => {
    if (sort === "unused") return (a.redeemedByUsername ? 1 : 0) - (b.redeemedByUsername ? 1 : 0);
    if (sort === "used") return (b.redeemedByUsername ? 1 : 0) - (a.redeemedByUsername ? 1 : 0);
    return b.createdAt - a.createdAt;
  });
}

function renderAdminCodes() {
  adminCodesGrid.innerHTML = "";
  if (adminCodes.length === 0) {
    adminCodesEmpty.hidden = false;
    adminCodesCountEl.textContent = "";
    return;
  }
  adminCodesEmpty.hidden = true;
  adminCodesCountEl.textContent = t("adminCodesCount", adminCodes.length);

  sortedAdminCodes().forEach((c) => {
    const row = document.createElement("div");
    row.className = "wordlist-item";

    const left = document.createElement("div");
    left.className = "wordlist-item-main";
    const codeEl = document.createElement("div");
    codeEl.className = "w admin-code-text";
    codeEl.textContent = c.code;
    left.appendChild(codeEl);

    const statusEl = document.createElement("div");
    statusEl.className = "d";
    statusEl.textContent = c.redeemedByUsername
      ? t("adminCodeUsedBy", c.redeemedByUsername)
      : t("adminCodeUnused");
    left.appendChild(statusEl);
    row.appendChild(left);

    const right = document.createElement("div");
    const btnRow = document.createElement("div");
    btnRow.style.display = "flex";
    btnRow.style.gap = "6px";

    const copyBtn = document.createElement("button");
    copyBtn.className = "edit-btn";
    copyBtn.textContent = t("adminCodeCopyBtn");
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(c.code);
        copyBtn.textContent = t("adminCodeCopiedBtn");
        setTimeout(() => {
          copyBtn.textContent = t("adminCodeCopyBtn");
        }, 1500);
      } catch (e) {
        // Clipboard API unavailable (e.g. insecure context) — the code is
        // right there on screen to select and copy by hand instead.
      }
    });
    btnRow.appendChild(copyBtn);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = t("adminCodeDeleteBtn");
    deleteBtn.addEventListener("click", async () => {
      if (!confirm(t("adminCodeConfirmDelete", c.code))) return;
      deleteBtn.disabled = true;
      try {
        await api("/admin/codes/delete", { method: "POST", body: JSON.stringify({ code: c.code }) });
        adminCodes = adminCodes.filter((x) => x.code !== c.code);
        renderAdminCodes();
      } catch (e) {
        alert(t("adminRequestActionFailed"));
        deleteBtn.disabled = false;
      }
    });
    btnRow.appendChild(deleteBtn);

    right.appendChild(btnRow);
    row.appendChild(right);

    adminCodesGrid.appendChild(row);
  });
}

adminCodesGenerateBtn.addEventListener("click", async () => {
  adminCodesGenerateBtn.disabled = true;
  try {
    const { code } = await api("/admin/codes", { method: "POST" });
    adminCodes.unshift(code);
    renderAdminCodes();
  } catch (e) {
    alert(t("adminCodeGenerateFailed"));
  }
  adminCodesGenerateBtn.disabled = false;
});
adminCodesSort.addEventListener("change", renderAdminCodes);

/* ---------- Admin: user accounts (incl. upgrade requests) ---------- */
const adminUsersSearch = document.getElementById("admin-users-search");
const adminUsersSort = document.getElementById("admin-users-sort");
const adminUsersGrid = document.getElementById("admin-users-grid");
const adminUsersCountEl = document.getElementById("admin-users-count");
const adminUsersEmpty = document.getElementById("admin-users-empty");
let adminUsers = [];
const ADMIN_ROLE_OPTIONS = ["free", "paid", "admin"];

async function loadAdminUsers(query) {
  if (!serverAdmin) return;
  try {
    const q = query ? `?q=${encodeURIComponent(query)}` : "";
    const { users } = await api(`/admin/users${q}`);
    adminUsers = users;
  } catch (e) {
    console.warn("Could not load users", e);
  }
  renderAdminUsers();
}

function roleLabel(role) {
  return t(`adminRole_${role}`) || role;
}

function sortedAdminUsers() {
  const sort = adminUsersSort.value || "joined";
  const sorted = [...adminUsers].sort((a, b) => {
    if (sort === "az") return a.username.localeCompare(b.username);
    if (sort === "role") return a.role.localeCompare(b.role) || a.username.localeCompare(b.username);
    return b.createdAt - a.createdAt;
  });
  // A user waiting on a pending upgrade request always bubbles to the top,
  // regardless of the chosen sort, so admin never has to go hunting for them.
  sorted.sort((a, b) => (b.pendingRequestId ? 1 : 0) - (a.pendingRequestId ? 1 : 0));
  return sorted;
}

function renderAdminUsers() {
  adminUsersGrid.innerHTML = "";
  if (adminUsers.length === 0) {
    adminUsersEmpty.hidden = false;
    adminUsersCountEl.textContent = "";
    return;
  }
  adminUsersEmpty.hidden = true;
  adminUsersCountEl.textContent = t("adminUsersCount", adminUsers.length);

  sortedAdminUsers().forEach((u) => {
    const row = document.createElement("div");
    row.className = "wordlist-item";

    const left = document.createElement("div");
    left.className = "wordlist-item-main";
    const nameEl = document.createElement("div");
    nameEl.className = "w";
    nameEl.textContent = u.username;
    left.appendChild(nameEl);
    const whenEl = document.createElement("div");
    whenEl.className = "d";
    whenEl.textContent =
      t("adminUserCreatedAt", formatDate(u.createdAt)) +
      (u.upgradedAt ? " · " + t("adminUserUpgradedAt", formatDate(u.upgradedAt)) : "");
    left.appendChild(whenEl);
    if (u.pendingRequestId) {
      const pendingBadge = document.createElement("div");
      pendingBadge.className = "d admin-pending-badge";
      pendingBadge.textContent = t("adminUserPendingRequest");
      left.appendChild(pendingBadge);
    }
    row.appendChild(left);

    const right = document.createElement("div");
    const btnRow = document.createElement("div");
    btnRow.style.display = "flex";
    btnRow.style.flexWrap = "wrap";
    btnRow.style.gap = "6px";
    btnRow.style.alignItems = "center";
    btnRow.style.justifyContent = "flex-end";

    if (u.pendingRequestId) {
      const approveBtn = document.createElement("button");
      approveBtn.className = "edit-btn";
      approveBtn.textContent = t("adminRequestApproveBtn");
      approveBtn.addEventListener("click", async () => {
        approveBtn.disabled = true;
        try {
          await api("/admin/upgrade-requests/approve", {
            method: "POST",
            body: JSON.stringify({ requestId: u.pendingRequestId }),
          });
          u.pendingRequestId = null;
          renderAdminUsers();
        } catch (e) {
          alert(t("adminRequestActionFailed"));
          approveBtn.disabled = false;
        }
      });
      btnRow.appendChild(approveBtn);

      const dismissBtn = document.createElement("button");
      dismissBtn.className = "delete-btn";
      dismissBtn.textContent = t("adminRequestDismissBtn");
      dismissBtn.addEventListener("click", async () => {
        dismissBtn.disabled = true;
        try {
          await api("/admin/upgrade-requests/dismiss", {
            method: "POST",
            body: JSON.stringify({ requestId: u.pendingRequestId }),
          });
          u.pendingRequestId = null;
          renderAdminUsers();
        } catch (e) {
          alert(t("adminRequestActionFailed"));
          dismissBtn.disabled = false;
        }
      });
      btnRow.appendChild(dismissBtn);
    }

    // admin's own account can't be re-roled or password-reset from here —
    // no lockout risk, and password changes go through My Account instead.
    const isSelf = currentUser && u.id === currentUser.id;
    if (isSelf) {
      const meLabel = document.createElement("span");
      meLabel.className = "mastery";
      meLabel.textContent = roleLabel(u.role) + " · " + t("adminUserYou");
      btnRow.appendChild(meLabel);
    } else {
      const roleSelect = document.createElement("select");
      ADMIN_ROLE_OPTIONS.forEach((role) => {
        const opt = document.createElement("option");
        opt.value = role;
        opt.textContent = roleLabel(role);
        if (role === u.role) opt.selected = true;
        roleSelect.appendChild(opt);
      });
      btnRow.appendChild(roleSelect);

      const applyBtn = document.createElement("button");
      applyBtn.className = "edit-btn";
      applyBtn.textContent = t("adminUserApplyRoleBtn");
      applyBtn.addEventListener("click", async () => {
        const newRole = roleSelect.value;
        if (newRole === u.role) return;
        if (!confirm(t("adminUserConfirmRoleChange", u.username, roleLabel(newRole)))) return;
        applyBtn.disabled = true;
        try {
          const { user } = await api("/admin/users/set-role", {
            method: "POST",
            body: JSON.stringify({ userId: u.id, role: newRole }),
          });
          u.role = user.role;
          u.upgradedAt = user.upgradedAt;
          renderAdminUsers();
        } catch (e) {
          alert(t("adminRequestActionFailed"));
          applyBtn.disabled = false;
        }
      });
      btnRow.appendChild(applyBtn);

      const resetPasswordBtn = document.createElement("button");
      resetPasswordBtn.className = "edit-btn";
      resetPasswordBtn.textContent = t("adminUserResetPasswordBtn");
      resetPasswordBtn.addEventListener("click", async () => {
        const newPassword = prompt(t("adminUserResetPasswordPrompt", u.username));
        if (!newPassword) return;
        if (newPassword.length < 8) {
          alert(t("authSignupErrorPassword"));
          return;
        }
        resetPasswordBtn.disabled = true;
        try {
          await api("/admin/users/set-password", {
            method: "POST",
            body: JSON.stringify({ userId: u.id, newPassword }),
          });
          alert(t("adminUserResetPasswordDone", u.username));
        } catch (e) {
          alert(t("adminRequestActionFailed"));
        }
        resetPasswordBtn.disabled = false;
      });
      btnRow.appendChild(resetPasswordBtn);

      const deleteUserBtn = document.createElement("button");
      deleteUserBtn.className = "delete-btn";
      deleteUserBtn.textContent = t("adminUserDeleteBtn");
      deleteUserBtn.addEventListener("click", async () => {
        if (!confirm(t("adminUserConfirmDelete", u.username))) return;
        deleteUserBtn.disabled = true;
        try {
          await api("/admin/users/delete", { method: "POST", body: JSON.stringify({ userId: u.id }) });
          adminUsers = adminUsers.filter((x) => x.id !== u.id);
          renderAdminUsers();
        } catch (e) {
          alert(t("adminRequestActionFailed"));
          deleteUserBtn.disabled = false;
        }
      });
      btnRow.appendChild(deleteUserBtn);
    }

    right.appendChild(btnRow);
    row.appendChild(right);
    adminUsersGrid.appendChild(row);
  });
}

let adminUsersSearchTimer = null;
adminUsersSearch.addEventListener("input", () => {
  clearTimeout(adminUsersSearchTimer);
  adminUsersSearchTimer = setTimeout(() => loadAdminUsers(adminUsersSearch.value.trim()), 300);
});
adminUsersSort.addEventListener("change", renderAdminUsers);

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
const ocrExcelStatus = document.getElementById("ocr-excel-status");
const ocrExtractBtn = document.getElementById("ocr-extract-btn");
// The file the user picked, held here between selection and the Extract
// button click that actually processes it (see the ocrFileInput "change"
// and ocrExtractBtn "click" handlers below).
let ocrPendingFile = null;
let ocrPendingKind = null;
let ocrPendingOverwrite = false;

/* ---------- Paid-feature gating: Extract words, Add manually, My added words ---------- */
const addwordExtractCard = document.getElementById("addword-extract-card");
const addwordManualCard = document.getElementById("addword-manual-card");
const myAddedWordsCard = document.getElementById("my-added-words-card");
const ocrPremiumOverlay = document.getElementById("ocr-premium-overlay");
const manualPremiumOverlay = document.getElementById("manual-premium-overlay");
const customPremiumOverlay = document.getElementById("custom-premium-overlay");
const addwordLockBanner = document.getElementById("addword-lock-banner");
// My Progress's "Premium Insights" teaser (weekly reports, category
// breakdown, multi-child profiles) uses the exact same lock pattern as the
// Add Word cards above — see updatePaidFeatureGates() below.
const statsInsightsCard = document.getElementById("stats-insights-card");
const statsPremiumOverlay = document.getElementById("stats-premium-overlay");

function setPremiumGate(card, overlay, locked) {
  card.classList.toggle("premium-gate", locked);
  overlay.hidden = !locked;
}

[ocrPremiumOverlay, manualPremiumOverlay, customPremiumOverlay, addwordLockBanner, statsPremiumOverlay].forEach((overlay) => {
  overlay.addEventListener("click", promptUpgradeForFeature);
});

// Extract-words, Add-manually and My-added-words are all paid features: the
// whole card is dimmed and an overlay catches every click (including a
// programmatic one, like Enter submitting a form) and shows the upgrade/
// signup prompt instead. The one visible "Premium feature" message lives in
// addwordLockBanner — fixed to the viewport rather than any one card, so it
// stays centered on the page regardless of which card it's "about" or how
// far the page is scrolled — the three overlays above stay invisible click
// catchers only. My Added Words additionally hides the admin-style
// bulk-maintenance tools unless this is genuinely an admin account — a paid
// account manages only its own words and never needs them.
function updatePaidFeatureGates() {
  const locked = !canUsePaidFeatures();
  setPremiumGate(addwordExtractCard, ocrPremiumOverlay, locked);
  setPremiumGate(addwordManualCard, manualPremiumOverlay, locked);
  setPremiumGate(myAddedWordsCard, customPremiumOverlay, locked);
  addwordLockBanner.hidden = !locked;
  setPremiumGate(statsInsightsCard, statsPremiumOverlay, locked);

  // The premium-gate overlay blocks a mouse/touch click on everything under
  // it, but pointer-events:none doesn't stop a keyboard-focused control from
  // being activated — disabling these directly closes that gap. (Delete/
  // change-level already end up disabled whenever locked, since the grid is
  // always empty with nothing addable to it — see updateDeleteSelectedBtn().)
  [manualWordInput, manualDefinitionInput, manualExampleInput, manualLevelSelect, bulkWordsInput].forEach((el) => {
    el.disabled = locked;
  });
  [customSearchInput, customFilterToggleBtn, customSelectAllCheckbox, customWordMgmtSelect, customExportBtn].forEach((el) => {
    el.disabled = locked;
  });

  customWordMgmtSelect.hidden = !isAdmin;
  customExportBtn.hidden = !isAdmin;
}

refreshPaidFeatureGates = updatePaidFeatureGates;
updatePaidFeatureGates();

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

// pdf.js needs a worker script URL before its first use; the library itself
// is loaded (or not, on a flaky connection) as a plain CDN <script> tag same
// as Tesseract, so this only does anything once that has actually landed.
if (typeof pdfjsLib !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
}

// Sniffs a chosen file's kind from its MIME type, falling back to the file
// extension since some browsers report an empty or generic type for .docx.
function ocrFileKind(file) {
  const name = (file.name || "").toLowerCase();
  const type = file.type || "";
  if (type.startsWith("image/")) return "image";
  if (type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || name.endsWith(".docx")) {
    return "docx";
  }
  if (type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || name.endsWith(".xlsx")) {
    return "xlsx";
  }
  if (type === "text/plain" || name.endsWith(".txt")) return "text";
  return "unsupported";
}

// Extracts plain text from a non-image file so it can go through the same
// processOcrText() candidate pipeline photos already use.
async function extractTextFromFile(file, kind) {
  if (kind === "text") return file.text();

  if (kind === "pdf") {
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item) => item.str).join(" ") + "\n";
    }
    return text;
  }

  if (kind === "docx") {
    const buffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    return result.value || "";
  }

  return "";
}

// Unlike photo/text/PDF/Word files (plain text → candidate words that still
// need a dictionary lookup), an Excel file is structured: each row's Word
// goes straight into My Added Words with whatever meaning/example/level that
// row already supplies (see EXCEL_COL_* in the My Added Words section below
// for the exact columns this reads), bypassing the candidate-review UI
// entirely. Only a side a row didn't supply gets looked up afterward.
async function processExcelFile(file, overwrite) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  if (rows.length === 0) {
    ocrExcelStatus.hidden = false;
    ocrExcelStatus.textContent = t("excelNoRows");
    return;
  }

  // Header matching is trimmed/case-insensitive, so "word" or " Word " still
  // lines up with the expected "Word" column.
  const firstRowKeys = Object.keys(rows[0]);
  const findKey = (target) => firstRowKeys.find((k) => k.trim().toLowerCase() === target.toLowerCase());
  const wordKey = findKey(EXCEL_COL_WORD);
  if (!wordKey) {
    ocrExcelStatus.hidden = false;
    ocrExcelStatus.textContent = t("excelNoWordColumn");
    return;
  }
  const defEnKey = findKey(EXCEL_COL_DEF_EN);
  const defKoKey = findKey(EXCEL_COL_DEF_KO);
  const exampleKey = findKey(EXCEL_COL_EXAMPLE);
  const levelEnKey = findKey(EXCEL_COL_LEVEL_EN);
  const levelKoKey = findKey(EXCEL_COL_LEVEL_KO);

  const added = [];
  const updated = [];
  let skipped = 0;
  rows.forEach((row) => {
    const word = String(row[wordKey] || "").trim();
    if (!word) return;
    // A word repeated within this same file is always skipped (not treated
    // as an overwrite target) — overwrite only applies to a word that
    // already existed before this import.
    if (added.some((w) => w.word.toLowerCase() === word.toLowerCase())) {
      skipped++;
      return;
    }

    const definitionEn = defEnKey ? String(row[defEnKey] || "").trim() || null : null;
    const definitionKo = defKoKey ? String(row[defKoKey] || "").trim() || null : null;
    const example = exampleKey ? String(row[exampleKey] || "").trim() : "";
    const levelEnRaw = levelEnKey ? parseLevelValue(row[levelEnKey], LEVELS) : null;
    const levelKoRaw = levelKoKey ? parseLevelValue(row[levelKoKey], KO_LEVELS) : null;

    const existing = findCustomWordByText(word);
    if (existing) {
      if (!overwrite) {
        skipped++;
        return;
      }
      // Only overwrite fields this row actually supplied — a blank cell
      // never blanks out data the word already has.
      if (definitionEn) {
        existing.definitionEn = definitionEn;
        existing.noDefinitionEn = false;
      }
      if (definitionKo) {
        existing.definitionKo = definitionKo;
        existing.noDefinitionKo = false;
      }
      if (example) existing.example = example;
      if (levelEnRaw) existing.levelEn = levelEnRaw;
      if (levelKoRaw) existing.levelKo = levelKoRaw;
      updated.push(existing);
      return;
    }

    const levelEn = levelEnRaw || guessLevelForWord(word, "en");
    const levelKo = levelKoRaw || guessLevelForWord(word, "ko");
    const newWord = {
      id: genId(),
      word,
      example,
      definitionEn,
      definitionKo,
      levelEn,
      levelKo,
      noDefinitionEn: !definitionEn,
      noDefinitionKo: !definitionKo,
      source: "excel",
      createdAt: Date.now(),
      ...newWordStorageFlags(),
    };
    customWords.push(newWord);
    added.push(newWord);
  });

  ocrExcelStatus.hidden = false;
  const touched = added.concat(updated);
  if (touched.length === 0) {
    ocrExcelStatus.textContent = t("excelImportedStatus", 0, 0, skipped);
    return;
  }

  saveCustomWords();
  renderCustomWords();
  renderWordList();
  ocrExcelStatus.textContent = t("excelImportedStatus", added.length, updated.length, skipped);
  await pushSharedWords(touched.filter((w) => w.remote));

  // Fill in whichever side (EN or KO) a row's spreadsheet data didn't
  // already supply — same background auto-fill manual/bulk add already do.
  const stillMissing = touched.filter((w) => w.noDefinitionEn || w.noDefinitionKo);
  if (stillMissing.length > 0) {
    ocrExcelStatus.textContent = `${t("excelImportedStatus", added.length, updated.length, skipped)} ${t("excelLookingUpMissing", stillMissing.length)}`;
    const infos = await mapWithConcurrency(stillMissing, 4, (w) => fetchWordInfo(w.word));
    stillMissing.forEach((w, i) => applyFetchedInfo(w, infos[i]));
    saveCustomWords();
    renderCustomWords();
    await pushSharedWords(stillMissing.filter((w) => w.remote));
    ocrExcelStatus.textContent = withQuotaNote(t("excelImportedStatus", added.length, updated.length, skipped));
  }
}

ocrChooseBtn.addEventListener("click", () => {
  // The premium-gate overlay on top of this card catches a mouse/touch
  // click before it ever reaches this button, but pointer-events:none
  // doesn't stop a keyboard-focused button from being activated — this is
  // the backstop for that path.
  if (!canUsePaidFeatures()) {
    promptUpgradeForFeature();
    return;
  }
  ocrFileInput.click();
});

// Picking a file only stages it — nothing is read or processed until the
// Extract button (revealed here) is actually clicked. A tool that's
// missing (CDN didn't load) or a fundamentally unsupported file type is
// still reported immediately, since there's nothing Extract could do about
// either. An Excel file's overwrite-or-skip choice is asked right here too,
// before any of its rows have been read — see excelOverwriteConfirm's
// wording, which doesn't presuppose the file actually contains a duplicate.
ocrFileInput.addEventListener("change", (e) => {
  const file = e.target.files && e.target.files[0];
  ocrExtractBtn.hidden = true;
  ocrPendingFile = null;
  ocrPendingKind = null;
  ocrPendingOverwrite = false;

  if (!file) {
    ocrLastFileName = null;
    ocrFileNameEl.textContent = t("ocrNoFileChosen");
    return;
  }

  ocrLastFileName = file.name;
  ocrFileNameEl.textContent = file.name;
  ocrReview.hidden = true;
  ocrStatus.textContent = "";
  ocrExcelStatus.hidden = true;
  ocrExcelStatus.textContent = "";
  ocrSelectedWords = new Set();
  ocrCandidateWords = [];
  ocrCandidateChips = new Map();
  ocrCandidatesEl.innerHTML = "";
  ocrSelectAllBtn.hidden = true;
  ocrLevelSelect.value = currentLevel;

  const kind = ocrFileKind(file);

  if (kind === "unsupported") {
    ocrStatus.textContent = t("ocrUnsupportedFile");
    ocrReview.hidden = false;
    ocrFileInput.value = "";
    return;
  }
  if (kind === "image" && typeof Tesseract === "undefined") {
    ocrStatus.textContent = t("ocrNoTesseract");
    ocrReview.hidden = false;
    return;
  }
  if ((kind === "pdf" && typeof pdfjsLib === "undefined") || (kind === "docx" && typeof mammoth === "undefined")) {
    ocrStatus.textContent = t("ocrNoDocReader");
    ocrReview.hidden = false;
    ocrFileInput.value = "";
    return;
  }
  if (kind === "xlsx" && typeof XLSX === "undefined") {
    ocrExcelStatus.hidden = false;
    ocrExcelStatus.textContent = t("excelToolUnavailable");
    ocrFileInput.value = "";
    return;
  }

  if (kind === "xlsx") {
    ocrPendingOverwrite = confirm(t("excelOverwriteConfirm"));
  }

  ocrPendingFile = file;
  ocrPendingKind = kind;
  ocrExtractBtn.hidden = false;
});

ocrExtractBtn.addEventListener("click", async () => {
  const file = ocrPendingFile;
  const kind = ocrPendingKind;
  const overwrite = ocrPendingOverwrite;
  if (!file || !kind) return;
  // An Excel file's data goes straight into My Added Words with no separate
  // "Add selected words" step to gate afterward (unlike the photo/PDF/text
  // candidate-review flow below), so this is where that write needs its own
  // paid-account check.
  if (kind === "xlsx" && !canUsePaidFeatures()) {
    promptUpgradeForFeature();
    return;
  }
  ocrExtractBtn.hidden = true;

  if (kind === "xlsx") {
    ocrProgress.hidden = false;
    ocrProgressFill.style.width = "50%";
    ocrProgressLabel.textContent = t("excelReadingStatus");
    try {
      await processExcelFile(file, overwrite);
    } catch (err) {
      console.error(err);
      ocrExcelStatus.hidden = false;
      ocrExcelStatus.textContent = t("ocrFailReadFile");
    } finally {
      ocrProgress.hidden = true;
      ocrFileInput.value = "";
    }
    return;
  }

  if (kind === "image") {
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
    return;
  }

  ocrProgress.hidden = false;
  ocrProgressFill.style.width = "50%";
  ocrProgressLabel.textContent = t("ocrProgressReadingFile");

  try {
    const text = await extractTextFromFile(file, kind);
    ocrProgress.hidden = true;
    processOcrText(text);
  } catch (err) {
    console.error(err);
    ocrProgress.hidden = true;
    ocrStatus.textContent = t("ocrFailReadFile");
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

const FETCH_TIMEOUT_MS = 5000;

// fetch with a hard timeout — without this a hung API freezes the whole flow.
async function fetchWithTimeout(url, ms = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// When dictionaryapi.dev is down, every word in a bulk add would otherwise pay
// the full timeout. Once we see it fail, skip it for a couple of minutes
// (its own 522 response asks for Retry-After: 120).
let dictionaryDownUntil = 0;
const DICTIONARY_COOLDOWN_MS = 120000;

async function fetchDefinition(word) {
  if (Date.now() < dictionaryDownUntil) return { error: "cooldown" };
  try {
    const res = await fetchWithTimeout(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    if (res.status >= 500) {
      dictionaryDownUntil = Date.now() + DICTIONARY_COOLDOWN_MS;
      return { error: res.status };
    }
    // 429 means we're being rate-limited, not that the word has no entry —
    // treated as retryable, same as a timeout, instead of being written off
    // as "not found" like a real 404 (a big bulk add is exactly what can
    // trigger this, so getting it wrong here silently loses definitions for
    // everything after the limit kicks in).
    if (res.status === 429) return { error: "timeout" };
    if (!res.ok) return { error: res.status }; // usually 404 — no entry for this word
    const data = await res.json();
    const entry = data[0];
    const meaning = entry && entry.meanings && entry.meanings[0];
    const def = meaning && meaning.definitions && meaning.definitions[0];
    if (!def) return null;
    return { definition: def.definition, example: def.example || "" };
  } catch (e) {
    return { error: "timeout" };
  }
}

async function fetchDefinitionWithRetry(word) {
  const first = await fetchDefinition(word);
  if (first && first.definition) return first;
  // Retrying is pointless when the word simply isn't in the dictionary (404)
  // or the service itself is down — only a timeout (or a 429 rate limit,
  // folded into the same "timeout" error above) is worth one more go.
  if (!first || (first.error && first.error !== "timeout")) return null;

  await wait(400);
  const second = await fetchDefinition(word);
  if (second && second.definition) return second;
  if (second && second.error === "timeout") {
    dictionaryDownUntil = Date.now() + DICTIONARY_COOLDOWN_MS;
  }
  return null;
}

function stripHtml(html) {
  return html
    // Some Wiktionary entries embed a <style>...</style> block (for citation
    // formatting) inline in the definition text — stripping only the tags
    // and not their contents left the raw CSS rules as visible text.
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

// Wiktionary is a second source of real English definitions, used when
// dictionaryapi.dev has no entry or is down. Without it the English side had
// nothing to fall back on but translating the Korean meaning back into
// English, which returns the word itself ("describe" -> "describe") or a lone
// synonym ("position" -> "Occupation") rather than an explanation.
let wiktionaryDownUntil = 0;

async function fetchWiktionaryDefinition(word) {
  if (Date.now() < wiktionaryDownUntil) return null;
  try {
    const res = await fetchWithTimeout(`https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word)}`);
    if (res.status >= 500) {
      wiktionaryDownUntil = Date.now() + DICTIONARY_COOLDOWN_MS;
      return null;
    }
    if (!res.ok) return null; // 404 — no Wiktionary page for this word
    const data = await res.json();
    const sections = (data && data.en) || []; // English-language senses only
    for (const section of sections) {
      for (const entry of section.definitions || []) {
        const definition = sanitizeLeakedMarkup(stripHtml(entry.definition || ""));
        if (definition.length < 8) continue; // skip stubs and bare cross-references
        const rawExample = entry.examples && entry.examples[0];
        return { definition, example: rawExample ? stripHtml(rawExample) : "" };
      }
    }
    return null;
  } catch (e) {
    wiktionaryDownUntil = Date.now() + DICTIONARY_COOLDOWN_MS;
    return null;
  }
}

// The free MyMemory API enforces its own daily translation quota (shared by
// every visitor's browser, not per word registered in this app) and, once
// hit, returns the same "MYMEMORY WARNING..." text instead of a translation
// for the rest of the day. There's no point paying the network round trip
// for every remaining word once we've seen that once, and the retry UI
// should say plainly why nothing is coming back instead of just "not
// found". This resets on page reload, which is fine — worst case it costs
// one wasted request to notice the quota is still exceeded.
let translationQuotaExceeded = false;

// Best-effort translation of arbitrary text via the free MyMemory API. Used
// both to get a Korean meaning for an English word (langpair "en|ko") and,
// as a fallback, to translate an English definition we already have into
// Korean when the direct word lookup came up empty.
async function fetchTranslation(text, langpair) {
  if (translationQuotaExceeded) return null;
  try {
    const res = await fetchWithTimeout(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langpair}`);
    // A blocked/over-quota request can come back as an HTTP 429 instead of a
    // 200 with a warning string in the body — same cause, different shape.
    if (res.status === 429) {
      translationQuotaExceeded = true;
      return null;
    }
    if (!res.ok) return null;
    const data = await res.json();
    const translated = data && data.responseData && data.responseData.translatedText;
    if (!translated) return null;
    if (/mymemory warning/i.test(translated) || data.responseStatus === 403) {
      translationQuotaExceeded = true;
      return null;
    }
    return translated.trim();
  } catch (e) {
    return null;
  }
}

async function fetchTranslationWithRetry(text, langpair) {
  let result = await fetchTranslation(text, langpair);
  if (!result) {
    await wait(400);
    result = await fetchTranslation(text, langpair);
  }
  return result;
}

function fetchKoreanTranslationWithRetry(word) {
  return fetchTranslationWithRetry(word, "en|ko");
}

// Looks up a definition for one word in BOTH languages at once, so a word
// added from either language track ends up with a usable meaning on both:
// English from dictionaryapi.dev, falling back to Wiktionary, and Korean
// from translating the word. A missing English definition is never filled in
// by translating the Korean meaning back to English — that round trip returns
// the word itself or a lone synonym, not an explanation of it.
async function fetchWordInfo(word) {
  const [enEntry, koMeaning] = await Promise.all([fetchDefinitionWithRetry(word), fetchKoreanTranslationWithRetry(word)]);
  let definitionEn = (enEntry && enEntry.definition) || null;
  // The free translation API occasionally echoes English text back instead
  // of actually translating — that's not a Korean meaning, so it doesn't
  // count as "found" here.
  let definitionKo = hasHangul(koMeaning) ? koMeaning : null;
  let example = (enEntry && enEntry.example) || "";

  if (!definitionEn) {
    const fromWiktionary = await fetchWiktionaryDefinition(word);
    if (fromWiktionary) {
      definitionEn = fromWiktionary.definition;
      if (!example) example = fromWiktionary.example;
    }
  }
  // Translating a full English definition into Korean does read as a meaning,
  // so this direction stays — but only keep it if it actually came back in
  // Korean.
  if (!definitionKo && definitionEn) {
    const translated = await fetchTranslationWithRetry(definitionEn, "en|ko");
    if (hasHangul(translated)) definitionKo = translated;
  }

  if (!definitionEn && !definitionKo) return null;
  return { definitionEn, definitionKo, example };
}

ocrAddBtn.addEventListener("click", async () => {
  if (!canUsePaidFeatures()) {
    promptUpgradeForFeature();
    return;
  }
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

  const other = otherLang(currentLang);
  const added = selected.map((word, i) => {
    const info = infos[i];
    const newWord = {
      id: genId(),
      word,
      example: (info && info.example) || "",
      definitionEn: (info && info.definitionEn) || null,
      definitionKo: (info && info.definitionKo) || null,
      noDefinitionEn: !(info && info.definitionEn),
      noDefinitionKo: !(info && info.definitionKo),
      source: "ocr",
      createdAt: Date.now(),
      ...newWordStorageFlags(),
    };
    newWord[levelKey(currentLang)] = level;
    newWord[levelKey(other)] = guessLevelForWord(word, other);
    customWords.push(newWord);
    return newWord;
  });
  saveCustomWords();
  const pushResult = await pushSharedWords(added);

  ocrStatus.textContent = withQuotaNote(
    pushResult.failed.length > 0
      ? t("bulkAddedWithFailures", selected.length - pushResult.failed.length, pushResult.failed.length)
      : t("ocrAddedStatus", selected.length, levelLabel(level))
  );
  ocrSelectedWords = new Set();
  ocrCandidateWords = [];
  ocrCandidateChips = new Map();
  ocrReview.hidden = true;
  ocrCandidatesEl.innerHTML = "";
  ocrAddBtn.disabled = false;
  renderCustomWords();
  renderWordList();
});

/* ================= REWARDS: badges, wrong-answer notebook, charts ================= */
// New per-account data lives inside `progress` (so it saves/syncs with the rest):
//   progress.daily   { "YYYY-MM-DD": { quiz:[correct,total], spelling:[..], typing:[..], tt:[..], flash:[..] } }
//   progress.modes   { quiz:[c,t], ... } lifetime per-mode totals (tracked from now on)
//   progress.wrong   { key: { n: misses, last: ts, ok: correct-in-a-row, mode } } — cleared after 2 right in a row
//   progress.ttSolved{ "8x2": 1 } every times-table fact ever cleared
//   progress.badges  { id: earnedAt }
//   progress.counters{ spellPerfect, quizPerfect, wrongCleared }
const RW_MODES = ["quiz", "spelling", "typing", "tt", "flash"];
const rwL = (en, ko) => (currentLang === "ko" ? ko : en);

function ensureRewardData() {
  if (!progress.daily) progress.daily = {};
  if (!progress.modes) progress.modes = {};
  if (!progress.wrong) progress.wrong = {};
  if (!progress.ttSolved) progress.ttSolved = {};
  if (!progress.badges) progress.badges = {};
  if (!progress.counters) progress.counters = { spellPerfect: 0, quizPerfect: 0, wrongCleared: 0 };
}

function trackActivity(word, isCorrect, mode) {
  ensureRewardData();
  mode = mode || "flash";
  const day = localDateKey(new Date());
  const d = progress.daily[day] || (progress.daily[day] = {});
  const m = d[mode] || (d[mode] = [0, 0]);
  m[1]++;
  if (isCorrect) m[0]++;
  const life = progress.modes[mode] || (progress.modes[mode] = [0, 0]);
  life[1]++;
  if (isCorrect) life[0]++;
  // keep only the last 60 days of daily history
  const keys = Object.keys(progress.daily).sort();
  while (keys.length > 60) delete progress.daily[keys.shift()];

  // Badges and the Wrong-answer notebook are Premium/admin perks — nothing
  // is collected for free or signed-out visitors (charts above still are).
  if (!canUsePaidFeatures()) return;
  const key = String(word);
  if (isCorrect) {
    if (mode === "tt") progress.ttSolved[key] = 1;
    const w = progress.wrong[key];
    if (w) {
      w.ok = (w.ok || 0) + 1;
      if (w.ok >= 2) {
        delete progress.wrong[key];
        progress.counters.wrongCleared++;
      }
    }
  } else {
    const w = progress.wrong[key] || (progress.wrong[key] = { n: 0, last: 0, ok: 0, mode });
    w.n++;
    w.ok = 0;
    w.last = Date.now();
    w.mode = mode;
  }
  checkBadges();
}

/* ---- Badge catalogue ---- */
function ttMastered(n) {
  for (let b = 1; b <= TIMESTABLE_MULTIPLIER_MAX; b++) {
    if (!progress.ttSolved[`${n}x${b}`] && !progress.ttSolved[`${b}x${n}`]) return false;
  }
  return true;
}
function modeCorrect(mode) {
  return (progress.modes[mode] && progress.modes[mode][0]) || 0;
}
function buildBadgeCatalog() {
  const list = [];
  for (let n = TIMESTABLE_MIN_TABLE; n <= 9; n++) {
    list.push({
      id: `tt${n}`, emoji: "🧮", group: "math",
      name: rwL(`Table ${n} Master Koala`, `구구단 ${n}단 마스터 코알라`),
      desc: rwL(`Clear every ${n}× fact in Times Table`, `구구단 게임에서 ${n}단을 모두 맞혀요`),
      test: () => ttMastered(n),
    });
  }
  list.push({
    id: "ttAll", emoji: "👑", group: "math",
    name: rwL("Times Table Champion", "구구단 챔피언 코알라"),
    desc: rwL("Master every table from 2 to 9", "2단부터 9단까지 모두 마스터"),
    test: () => { for (let n = TIMESTABLE_MIN_TABLE; n <= 9; n++) if (!ttMastered(n)) return false; return true; },
  });
  list.push(
    { id: "spell100", emoji: "✏️", group: "english", name: rwL("Spelling 100 Sticker", "스펠링 100점 스티커"),
      desc: rwL("Finish a spelling round (5+ words) with every word right first time", "스펠링 5단어 이상을 한 번에 모두 맞혀요"),
      test: () => progress.counters.spellPerfect >= 1 },
    { id: "spell100x5", emoji: "🌟", group: "english", name: rwL("Spelling Superstar", "스펠링 슈퍼스타"),
      desc: rwL("Get 5 perfect spelling rounds", "스펠링 100점을 5번 달성"),
      test: () => progress.counters.spellPerfect >= 5 },
    { id: "quiz100", emoji: "💡", group: "english", name: rwL("Quiz Perfect Sticker", "퀴즈 만점 스티커"),
      desc: rwL("Finish a quiz (5+ questions) with no mistakes", "퀴즈(5문제 이상)를 모두 맞혀요"),
      test: () => progress.counters.quizPerfect >= 1 },
    { id: "type50", emoji: "⌨️", group: "english", name: rwL("Speedy Typist Koala", "타이핑 코알라"),
      desc: rwL("Type 50 words correctly in the Typing Game", "타이핑 게임에서 단어 50개 성공"),
      test: () => modeCorrect("typing") >= 50 },
    { id: "words50", emoji: "📚", group: "english", name: rwL("Word Explorer", "단어 탐험가"),
      desc: rwL("Practise 50 different words", "서로 다른 단어 50개 연습"),
      test: () => Object.keys(progress.wordStats).length >= 50 },
    { id: "words200", emoji: "🎓", group: "english", name: rwL("Word Wizard", "단어 마법사"),
      desc: rwL("Practise 200 different words", "서로 다른 단어 200개 연습"),
      test: () => Object.keys(progress.wordStats).length >= 200 },
    { id: "streak3", emoji: "🔥", group: "habit", name: rwL("3-Day Streak", "3일 연속 학습"),
      desc: rwL("Practise 3 days in a row", "3일 연속 학습"), test: () => (progress.streak.count || 0) >= 3 },
    { id: "streak7", emoji: "🌳", group: "habit", name: rwL("Week-long Koala", "일주일 연속 코알라"),
      desc: rwL("Practise 7 days in a row", "7일 연속 학습"), test: () => (progress.streak.count || 0) >= 7 },
    { id: "streak30", emoji: "🏆", group: "habit", name: rwL("Monthly Marathon", "한 달 연속 학습"),
      desc: rwL("Practise 30 days in a row", "30일 연속 학습"), test: () => (progress.streak.count || 0) >= 30 },
    { id: "fix5", emoji: "📕", group: "habit", name: rwL("Mistake Fixer", "오답 해결사"),
      desc: rwL("Clear 5 words from your Wrong-answer notebook", "오답 노트에서 5개 졸업"),
      test: () => progress.counters.wrongCleared >= 5 },
    { id: "fix20", emoji: "🛠️", group: "habit", name: rwL("Mistake Master", "오답 마스터"),
      desc: rwL("Clear 20 words from your Wrong-answer notebook", "오답 노트에서 20개 졸업"),
      test: () => progress.counters.wrongCleared >= 20 }
  );
  return list;
}

let rwToastQueue = [];
let rwToastShowing = false;
function checkBadges() {
  if (!canUsePaidFeatures()) return;
  ensureRewardData();
  const fresh = [];
  buildBadgeCatalog().forEach((b) => {
    if (!progress.badges[b.id] && b.test()) {
      progress.badges[b.id] = Date.now();
      fresh.push(b);
    }
  });
  if (fresh.length) {
    fresh.forEach((b) => rwToastQueue.push(b));
    showNextBadgeToast();
  }
}
function showNextBadgeToast() {
  if (rwToastShowing || !rwToastQueue.length) return;
  rwToastShowing = true;
  const b = rwToastQueue.shift();
  const el = document.createElement("div");
  el.className = "badge-toast";
  el.setAttribute("role", "status");
  el.innerHTML = `<span class="badge-toast-emoji">${b.emoji}</span><span><strong>${rwL("New badge!", "새 배지!")}</strong><br>${b.name}</span>`;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add("out"), 3200);
  setTimeout(() => { el.remove(); rwToastShowing = false; showNextBadgeToast(); }, 3700);
}

/* ---- Stats sub-tabs ---- */
const statsTabBtns = document.querySelectorAll(".stats-tab");
const statsPanels = {
  overview: document.getElementById("stats-panel-overview"),
  badges: document.getElementById("stats-panel-badges"),
  wrong: document.getElementById("stats-panel-wrong"),
};
let statsTab = "overview";
function setStatsTab(name) {
  statsTab = name;
  statsTabBtns.forEach((b) => {
    const on = b.dataset.statsTab === name;
    b.classList.toggle("on", on);
    b.setAttribute("aria-selected", on ? "true" : "false");
  });
  Object.entries(statsPanels).forEach(([k, el]) => (el.hidden = k !== name));
  renderRewardPanels();
}
statsTabBtns.forEach((b) => b.addEventListener("click", () => setStatsTab(b.dataset.statsTab)));

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function renderRewardPanels() {
  ensureRewardData();
  const wrongCount = canUsePaidFeatures() ? Object.keys(progress.wrong).length : 0;
  const wrongTab = document.querySelector('.stats-tab[data-stats-tab="wrong"]');
  if (wrongTab) wrongTab.querySelector(".stats-tab-count").textContent = wrongCount ? String(wrongCount) : "";
  if (statsTab === "overview") renderStatsCharts();
  else if (statsTab === "badges") renderBadgePanel();
  else renderWrongPanel();
}

function premiumLockHtml() {
  return `<div class="rw-lock"><div class="rw-lock-icon">🔒🐨</div>
    <div class="rw-lock-title">${t("premiumGateTitle")}</div>
    <p>${rwL("Koala badges and the Wrong-answer notebook are for Premium members.", "코알라 배지와 오답 노트는 프리미엄 회원 전용이에요.")}</p>
    <button type="button" class="pill accent small" data-rw-upgrade>${rwL("Sign up / Upgrade", "가입 / 업그레이드")}</button></div>`;
}
document.addEventListener("click", (e) => {
  if (e.target.closest("[data-rw-upgrade]")) promptUpgradeForFeature();
});

function renderBadgePanel() {
  const paid = canUsePaidFeatures();
  const cat = buildBadgeCatalog();
  const got = paid ? cat.filter((b) => progress.badges[b.id]).length : 0;
  const groups = [
    ["math", rwL("🧮 Times Table", "🧮 구구단")],
    ["english", rwL("📖 English", "📖 영어")],
    ["habit", rwL("🔥 Habits", "🔥 학습 습관")],
  ];
  let html = paid ? "" : premiumLockHtml();
  html += `<p class="badge-summary">${rwL(`Collected ${got} of ${cat.length} koala badges`, `코알라 배지 ${cat.length}개 중 ${got}개 모았어요`)}</p>`;
  groups.forEach(([g, title]) => {
    html += `<h4 class="badge-group-title">${title}</h4><div class="badge-grid">`;
    cat.filter((b) => b.group === g).forEach((b) => {
      const on = paid && !!progress.badges[b.id];
      html += `<div class="badge-card ${on ? "earned" : "locked"}" title="${escapeHtml(b.desc)}">
        <div class="badge-medal"><span class="badge-koala">🐨</span><span class="badge-sticker">${on ? b.emoji : "🔒"}</span></div>
        <div class="badge-name">${escapeHtml(b.name)}</div>
        <div class="badge-desc">${escapeHtml(b.desc)}</div></div>`;
    });
    html += `</div>`;
  });
  statsPanels.badges.innerHTML = html;
}

/* ---- Wrong-answer notebook ---- */
function findWordInfo(word) {
  const lw = String(word).toLowerCase();
  const pools = [customWords, myDeck, getAllWordsForLevel(currentLevel)];
  for (const p of pools) {
    const hit = (p || []).find((x) => x && x.word && String(x.word).toLowerCase() === lw);
    if (hit) return hit;
  }
  return null;
}

function wrongEntries() {
  return Object.entries(progress.wrong)
    .map(([key, v]) => ({ key, ...v }))
    .sort((a, b) => b.last - a.last);
}

function renderWrongPanel() {
  const el = statsPanels.wrong;
  if (!canUsePaidFeatures()) {
    el.innerHTML = premiumLockHtml();
    return;
  }
  const items = wrongEntries();
  if (!items.length) {
    el.innerHTML = `<div class="wrong-empty"><div class="wrong-empty-koala">🐨✨</div><p>${rwL(
      "No mistakes to review. Great job!", "복습할 오답이 없어요. 잘했어요!")}</p></div>`;
    return;
  }
  const modeName = { quiz: rwL("Quiz", "퀴즈"), spelling: rwL("Spelling", "스펠링"), typing: rwL("Typing", "타이핑"), tt: rwL("Times Table", "구구단"), flash: rwL("Flashcards", "플래시카드") };
  let html = `<p class="wrong-hint">${rwL(
    "Get a word right 2 times in a row and it graduates from this notebook.",
    "같은 단어를 연속 2번 맞히면 오답 노트에서 졸업해요.")}</p>
    <div class="wrong-actions"><button type="button" class="pill accent small" id="wrong-study-btn">🃏 ${rwL("Study these words", "오답 단어 공부하기")}</button></div>
    <ul class="wrong-list">`;
  items.forEach((it) => {
    const isMath = /^\d+x\d+$/.test(it.key);
    let title, sub = "";
    if (isMath) {
      const [a, b] = it.key.split("x").map(Number);
      title = `${a} × ${b} = ${a * b}`;
    } else {
      title = escapeHtml(it.key);
      const info = findWordInfo(it.key);
      if (info && info.definition) sub = escapeHtml(info.definition);
    }
    html += `<li class="wrong-item"><div class="wrong-main"><div class="wrong-word">${title}</div>${sub ? `<div class="wrong-def">${sub}</div>` : ""}
      <div class="wrong-meta">${modeName[it.mode] || ""} · ${rwL(`missed ${it.n}×`, `${it.n}번 틀림`)}</div></div>
      ${isMath ? "" : `<button type="button" class="wrong-speak" data-say="${escapeHtml(it.key)}" aria-label="${rwL("Hear it", "들어보기")}">🔊</button>`}
      <button type="button" class="wrong-remove" data-remove="${escapeHtml(it.key)}" aria-label="${rwL("Remove", "삭제")}">✕</button></li>`;
  });
  html += `</ul>`;
  el.innerHTML = html;
}

statsPanels.wrong.addEventListener("click", (e) => {
  const say = e.target.closest("[data-say]");
  if (say) { speak(say.dataset.say); return; }
  const rm = e.target.closest("[data-remove]");
  if (rm) {
    delete progress.wrong[rm.dataset.remove];
    saveProgress();
    renderRewardPanels();
    return;
  }
  if (e.target.closest("#wrong-study-btn")) {
    const cards = wrongEntries()
      .filter((it) => !/^\d+x\d+$/.test(it.key))
      .map((it) => {
        const info = findWordInfo(it.key);
        return { word: it.key, definition: (info && info.definition) || "", example: (info && info.example) || "" };
      });
    if (!cards.length) return;
    flashWrongOverride = cards;
    const navBtn = document.querySelector('.tab-btn[data-view="flashcards"]');
    if (navBtn) navBtn.click();
    buildFlashDeck();
  }
});

[flashSourceLevelBtn, flashSourceMineBtn, flashCategorySel].forEach((el) => {
  ["click", "change"].forEach((ev) => el.addEventListener(ev, () => { flashWrongOverride = null; }, true));
});

/* ---- Charts (inline SVG, one accent hue, direct labels) ---- */
function renderStatsCharts() {
  ensureRewardData();
  const box = statsPanels.overview.querySelector("#stats-charts");
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const rec = progress.daily[localDateKey(d)] || {};
    let c = 0, tot = 0;
    RW_MODES.forEach((m) => { if (rec[m]) { c += rec[m][0]; tot += rec[m][1]; } });
    days.push({ label: d.toLocaleDateString(currentLang === "ko" ? "ko-KR" : "en-AU", { weekday: "short" }), c, w: tot - c, tot });
  }
  const maxTot = Math.max(5, ...days.map((d) => d.tot));
  const W = 320, H = 150, top = 20, bottom = 24, bw = 28, gap = (W - 7 * bw) / 8;
  const plotH = H - top - bottom;
  let bars = "";
  days.forEach((d, i) => {
    const x = gap + i * (bw + gap);
    const hc = (d.c / maxTot) * plotH, hw = (d.w / maxTot) * plotH;
    const yBase = H - bottom;
    const tip = `${d.label}: ${d.c}/${d.tot} ${rwL("correct", "정답")}`;
    bars += `<g><title>${tip}</title>`;
    if (d.c) bars += `<rect x="${x}" y="${yBase - hc}" width="${bw}" height="${hc}" rx="4" fill="var(--accent)"/>`;
    if (d.w) bars += `<rect x="${x}" y="${yBase - hc - hw - (d.c ? 2 : 0)}" width="${bw}" height="${hw}" rx="4" fill="var(--chart-miss)"/>`;
    if (d.tot) bars += `<text x="${x + bw / 2}" y="${yBase - hc - hw - (d.c && d.w ? 2 : 0) - 4}" text-anchor="middle" class="chart-val">${d.tot}</text>`;
    bars += `<text x="${x + bw / 2}" y="${H - 8}" text-anchor="middle" class="chart-lbl">${d.label}</text></g>`;
  });
  const weekTot = days.reduce((s, d) => s + d.tot, 0);
  const svgDays = `<svg viewBox="0 0 ${W} ${H}" class="chart-svg" role="img" aria-label="${rwL("Answers in the last 7 days", "최근 7일 학습량")}"><line x1="0" x2="${W}" y1="${H - bottom}" y2="${H - bottom}" class="chart-axis"/>${bars}</svg>`;

  const modeRows = [
    ["quiz", rwL("Quiz", "퀴즈"), [progress.quiz.correct, progress.quiz.total]],
    ["spelling", rwL("Spelling", "스펠링"), [progress.spelling.correct, progress.spelling.total]],
    ["typing", rwL("Typing Game", "타이핑 게임"), progress.modes.typing || [0, 0]],
    ["tt", rwL("Times Table", "구구단"), progress.modes.tt || [0, 0]],
    ["flash", rwL("Flashcards", "플래시카드"), progress.modes.flash || [0, 0]],
  ];
  let rows = "";
  modeRows.forEach(([, name, [c, tot]]) => {
    const pct = tot ? Math.round((c / tot) * 100) : 0;
    rows += `<div class="hbar-row" title="${name}: ${c}/${tot}">
      <span class="hbar-name">${name}</span>
      <span class="hbar-track"><span class="hbar-fill" style="width:${pct}%"></span></span>
      <span class="hbar-pct">${tot ? pct + "%" : "–"}</span></div>`;
  });
  box.innerHTML = `
    <h4 class="chart-title">${rwL("Last 7 days", "최근 7일 학습량")}</h4>
    <div class="chart-legend"><span><i class="lg lg-ok"></i>${rwL("Correct", "정답")}</span><span><i class="lg lg-miss"></i>${rwL("Missed", "오답")}</span></div>
    ${weekTot ? svgDays : `<p class="chart-empty">${rwL("Practise today to see your chart!", "오늘 학습하면 차트가 채워져요!")}</p>`}
    <h4 class="chart-title">${rwL("Accuracy by activity", "활동별 정답률")}</h4>${rows}`;
}

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
  renderRewardPanels();
}

resetProgressBtn.addEventListener("click", () => {
  if (!confirm(t("resetConfirm"))) return;
  progress = {
    wordStats: {},
    flashKnown: {},
    quiz: { correct: 0, total: 0 },
    spelling: { correct: 0, total: 0 },
    spellingStatus: {},
    srs: {},
    streak: { count: 0, lastDay: null },
    updatedAt: 0,
  };
  ensureRewardData();
  saveProgress();
  renderStats();
  renderWordList();
});

/* ================= INIT ================= */
applyStaticTranslations();
renderLevelChoices();
updateLevelBadge();
renderStreakChip();
populateLevelSelects();

// Show the level-select overlay only if we don't yet have a saved level for this language.
levelOverlay.hidden = !!savedLevels[currentLang];
// The close (✕) button is always available now: closing the first-run picker
// just keeps the default level until the kid picks one from the level badge.
levelOverlayCloseBtn.hidden = false;

buildFlashDeck();
buildQuizQuestions();
buildSpellingDeck();
resetTypeGame();
renderWordList();
renderCustomWords();

/* ================= PWA: install button, service worker, offline notice ================= */
(function setupPwa() {
  const installBtn = document.getElementById("install-app-btn");
  let deferredInstall = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstall = e;
    if (installBtn) installBtn.hidden = false;
  });
  if (installBtn) {
    // A friendly sheet first (what you get, why it's safe), then the
    // browser's own install prompt on "Install".
    installBtn.addEventListener("click", () => {
      if (!deferredInstall) return;
      const sheet = document.createElement("div");
      sheet.className = "install-sheet-backdrop";
      sheet.innerHTML =
        `<div class="install-sheet" role="dialog" aria-modal="true" aria-labelledby="install-sheet-title">` +
        `<img class="install-sheet-icon" src="icon-192.png?v=4" alt="" />` +
        `<h3 id="install-sheet-title">${t("installSheetTitle")}</h3>` +
        `<div class="install-sheet-sub">🛡️ ${t("installSheetSub")}</div>` +
        `<ul><li>${t("installPerk1")}</li><li>${t("installPerk2")}</li><li>${t("installPerk3")}</li></ul>` +
        `<div class="install-sheet-actions"><button type="button" class="pill accent" id="install-sheet-ok">${t("installSheetOk")}</button>` +
        `<button type="button" class="install-sheet-later" id="install-sheet-later">${t("installSheetLater")}</button></div></div>`;
      document.body.appendChild(sheet);
      const close = () => sheet.remove();
      sheet.addEventListener("click", (e) => { if (e.target === sheet) close(); });
      sheet.querySelector("#install-sheet-later").addEventListener("click", close);
      sheet.querySelector("#install-sheet-ok").addEventListener("click", async () => {
        close();
        if (!deferredInstall) return;
        deferredInstall.prompt();
        try { await deferredInstall.userChoice; } catch (e) { /* ignore */ }
        deferredInstall = null;
        installBtn.hidden = true;
      });
    });
  }
  window.addEventListener("appinstalled", () => { if (installBtn) installBtn.hidden = true; });

  let banner = null;
  const updateOnline = () => {
    if (!navigator.onLine) {
      if (!banner) {
        banner = document.createElement("div");
        banner.className = "offline-banner";
        banner.setAttribute("role", "status");
        document.body.appendChild(banner);
      }
      banner.textContent = t("offlineBanner");
    } else if (banner) {
      banner.remove();
      banner = null;
    }
  };
  window.addEventListener("online", updateOnline);
  window.addEventListener("offline", updateOnline);
  updateOnline();

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch((e) => console.warn("Service worker failed", e));
    });
  }
})();

/* ---- Home: year chips, Today's Mission ---- */
function missionGoal() { return 5; }
function missionTodayCounts() {
  ensureRewardData();
  return progress.daily[localDateKey(new Date())] || {};
}
function missionTasks() {
  const d = missionTodayCounts();
  const n = (m) => (d[m] && d[m][1]) || 0;
  const day = Math.floor(Date.now() / 86400000);
  const third = day % 2 ? { id: "quiz", mode: "quiz", view: "quiz", key: "missionQuiz", emoji: "💡" } : { id: "tt", mode: "tt", view: "timestable", key: "missionTT", emoji: "🧮" };
  return [
    { id: "flash", mode: "flash", view: "flashcards", key: "missionFlash", emoji: "🃏" },
    { id: "spelling", mode: "spelling", view: "spelling", key: "missionSpelling", emoji: "✏️" },
    third,
  ].map((x) => ({ ...x, done: Math.min(n(x.mode), missionGoal()), goal: missionGoal() }));
}
function renderHomeYears() {
  const box = document.getElementById("home-years");
  if (!box) return;
  box.innerHTML = "";
  currentSystem().levels.forEach((lv) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "home-year" + (lv.id === currentLevel ? " active" : "");
    b.textContent = lv.label;
    b.setAttribute("aria-pressed", lv.id === currentLevel ? "true" : "false");
    b.addEventListener("click", () => { if (lv.id !== currentLevel) applyLevel(lv.id); renderHomeYears(); });
    box.appendChild(b);
  });
}
function renderMission() {
  const list = document.getElementById("mission-list");
  if (!list) return;
  const tasks = missionTasks();
  list.innerHTML = "";
  tasks.forEach((tk) => {
    const li = document.createElement("li");
    const done = tk.done >= tk.goal;
    li.className = "mission-item" + (done ? " done" : "");
    li.innerHTML = `<span class="mission-check" aria-hidden="true">${done ? "✓" : ""}</span><span class="mission-emoji" aria-hidden="true">${tk.emoji}</span><span class="mission-text">${t(tk.key, tk.goal)}<small>${tk.done} / ${tk.goal}</small></span>`;
    if (!done) {
      const go = document.createElement("button");
      go.type = "button";
      go.className = "pill accent small mission-go";
      go.textContent = t("missionGo");
      go.addEventListener("click", () => goToTab(tk.view));
      li.appendChild(go);
    }
    list.appendChild(li);
  });
  const doneCount = tasks.filter((x) => x.done >= x.goal).length;
  document.getElementById("mission-count").textContent = `${doneCount} / ${tasks.length}`;
  document.getElementById("mission-bar-fill").style.width = `${(tasks.reduce((s, x) => s + x.done / x.goal, 0) / tasks.length) * 100}%`;
  const all = doneCount === tasks.length;
  document.getElementById("mission-card").classList.toggle("complete", all);
  document.getElementById("mission-done-msg").hidden = !all;
  return all;
}
function checkMissionComplete() {
  const all = missionTasks().every((x) => x.done >= x.goal);
  const today = localDateKey(new Date());
  if (all && progress.missionDone !== today) {
    progress.missionDone = today;
    saveProgress();
    const el = document.createElement("div");
    el.className = "badge-toast";
    el.setAttribute("role", "status");
    el.innerHTML = `<span class="badge-toast-emoji">🎯</span><span><strong>${t("missionToast")}</strong><br>${t("missionDoneMsg").replace(/^🎉 /, "")}</span>`;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add("out"), 3200);
    setTimeout(() => el.remove(), 3700);
  }
}
function renderHome() {
  // The tile icon already carries the emoji, so drop it from the title text.
  document.querySelectorAll(".landing-tile-title").forEach((el) => {
    el.textContent = el.textContent.replace(/^[^\p{L}\p{N}]+/u, "").trim();
  });
  renderHomeYears();
  renderMission();
}
document.getElementById("home-start-btn").addEventListener("click", () => {
  const next = missionTasks().find((x) => x.done < x.goal);
  goToTab(next ? next.view : "quiz");
});
document.getElementById("promo-btn").addEventListener("click", () => goToTab("addword"));
renderHome();
