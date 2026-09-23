// Aussie English Word Practice — app logic
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
    appTitle: "Aussie English Word Practice",
    appSubtitle: "Build your vocabulary, spelling and word skills!",
    langToggle: "한국어",
    levelBadgePrefix: "Level",
    levelOverlayTitle: "📚 Choose your level",
    levelOverlayDesc: "Pick the level you want to practise. You can change this anytime.",
    navFlashcards: "🃏 Flashcards",
    navQuiz: "❓ Quiz",
    navSpelling: "✏️ Spelling",
    navTypeGame: "⌨️ Typing Game",
    navWordlist: "📖 Word List",
    navAddword: "➕ Add Word",
    navStats: "📊 My Progress",
    navAdminCodes: "🛠️ Admin",
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
    adminUsersTitle: "👥 User Accounts",
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
    typeGameRestartBtn: "🔄 Play Again",
    categoryLabel: "Category",
    optVocabulary: "Vocabulary",
    optSynonyms: "Synonyms & Antonyms",
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
    anonymousQuestionCapPrompt: "Signed-out practice is capped at 50 questions. Sign up (it's free!) to unlock more questions and the rest of the app?",
    goalReached: (score, level) => `🎉 ${score} correct — you've hit your target for ${level}!`,
    goalReachedTop: (score, level) => `🎉 ${score} correct on ${level} — that's the highest level. Brilliant!`,
    goalNextLevelBtn: "🚀 Try the next level",
    goalKeepGoingBtn: "Keep going",
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
    spellingCheckBtn: "✅ Check Answer",
    spellingCorrectPrompt: "✅ Correct! Press Next to continue.",
    spellingWrongPrompt: "Please enter the correct spelling to go to the next word",
    spellingEmpty: (lvl) => `No ${lvl} spelling words yet. Add some in "Add Word"!`,
    spellingFinishBtn: "🏁 Finish",
    spellingReportTitle: "📋 Spelling Report",
    spellingReportEmpty: "No mistakes today — great job! 🎉",
    spellingReportRestart: "🔄 Practice Again",
    spellingTodayScore: (c, t) => `Today's score: ${c} / ${t}`,
    spellingWrongBadge: "Incorrect",
    wordlistSearchPlaceholder: "🔍 Search words...",
    wordlistEmpty: "No words found for this level yet.",
    wordlistAllLevels: "📚 All levels",
    addToMyDeckBtn: "⭐ Add to my flashcards",
    clearSelectionBtn: "Clear selection",
    selectAllBtn: "☑️ Select All",
    addedToMyDeck: (added, picked) =>
      added === picked
        ? `Added ${added} word${added === 1 ? "" : "s"} to your flashcards.`
        : `Added ${added} of ${picked} — the rest were already in your flashcards.`,
    wordlistCount: (n) => `${n} word${n === 1 ? "" : "s"}`,
    customWordsCount: (n) => `Total ${n} word${n === 1 ? "" : "s"}`,
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
    ocrDesc: "Take a photo of a book page, upload a screenshot, or upload a text, Word or PDF file. We'll read the text and pull out candidate words you can add to your word list.",
    ocrChooseBtn: "📁 Choose Photo or File",
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
    ocrUnsupportedFile: "That file type isn't supported. Please choose a photo, or a .txt, .pdf or .docx file.",
    ocrNoCandidates: "We couldn't find any new candidate words in that image (they may already be in your word list).",
    ocrFoundCandidates: (n) => `Found ${n} candidate words — tap the ones you want to add:`,
    ocrSelectAtLeastOne: "Please select at least one word first.",
    ocrAddingStatus: (n) => `Adding ${n} word(s) — looking up meanings...`,
    ocrAddingProgress: (done, total) => `Looking up meanings... ${done} / ${total}`,
    ocrAddedStatus: (n, lvl) => `Added ${n} word(s) to ${lvl}!`,
    ocrNoDefFound: "(No definition found — tap Edit to add one.)",
    myAddedWordsTitle: "📝 My added words",
    myAddedWordsEmpty: "You haven't added any words yet.",
    customSearchPlaceholder: "🔍 Search added words...",
    sortRecent: "🕒 Newest first",
    sortOldest: "🕒 Oldest first",
    sortAz: "🔤 A → Z",
    sortZa: "🔤 Z → A",
    sortMissing: "⚠️ Missing meaning first",
    deleteSelectedBtn: "🗑️ Delete Selected",
    deleteSelectedConfirm: (n) => `Delete ${n} selected word(s)?`,
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
    footerText: "Made for Australian primary students learning English vocabulary. 🇦🇺",
    authHeaderLoginBtn: "🔑 Log In",
    authLogoutBtn: "Logout",
    myAccountMenuItem: "👤 My Account",
    myAccountTitle: "👤 My Account",
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
    anonymousFeatureSignupPrompt: "This feature is for signed-in accounts. Sign up (it's free!) to unlock it?",
    roleAdmin: "Admin",
    rolePaid: "Premium",
    roleFree: "General",
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
    navTypeGame: "⌨️ 타이핑 게임",
    navWordlist: "📖 단어장",
    navAddword: "➕ 단어 추가",
    navStats: "📊 내 진행상황",
    navAdminCodes: "🛠️ 관리자",
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
    adminUsersTitle: "👥 사용자 계정",
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
    typeGameRestartBtn: "🔄 다시 하기",
    categoryLabel: "카테고리",
    optVocabulary: "어휘",
    optSynonyms: "동의어 & 반의어",
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
    backLabel: "이전",
    nextLabel: "다음",
    flashHint: "카드를 탭하면 뒤집혀요 • 뜻이나 예문을 탭하면 소리로 들을 수 있어요",
    flashStillLearning: "😕 아직 어려워요",
    flashKnowIt: "😀 알고 있어요!",
    flashEmptyWord: "단어가 없어요",
    flashEmptyDef: (lvl) => `먼저 ${lvl} 단어를 추가해주세요!`,
    goalLabel: "문제들의 수",
    goalDecreaseLabel: "문제 수 줄이기",
    goalIncreaseLabel: "문제 수 늘리기",
    anonymousQuestionCapPrompt: "가입 전에는 문제 수가 최대 50개로 제한돼요. 가입하고(무료예요!) 더 많은 문제와 나머지 기능도 사용해보시겠어요?",
    goalReached: (score, level) => `🎉 ${score}개 정답 — ${level} 목표를 달성했어요!`,
    goalReachedTop: (score, level) => `🎉 ${level}에서 ${score}개 정답 — 가장 높은 레벨이에요. 정말 잘했어요!`,
    goalNextLevelBtn: "🚀 다음 레벨 도전",
    goalKeepGoingBtn: "계속하기",
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
    spellingCheckBtn: "✅ 정답 확인",
    spellingCorrectPrompt: "✅ 정답이에요! Next를 눌러 다음 단어로 넘어가세요.",
    spellingWrongPrompt: "정확한 철자를 입력해야 다음 단어로 넘어갈 수 있어요.",
    spellingEmpty: (lvl) => `${lvl} 레벨에는 아직 스펠링 연습 단어가 없어요. "단어 추가"에서 추가해보세요!`,
    spellingFinishBtn: "🏁 종료",
    spellingReportTitle: "📋 스펠링 리포트",
    spellingReportEmpty: "오늘은 틀린 단어가 없어요 — 정말 잘했어요! 🎉",
    spellingReportRestart: "🔄 다시 연습하기",
    spellingTodayScore: (c, t) => `오늘의 점수: ${c} / ${t}`,
    spellingWrongBadge: "틀린문제",
    wordlistSearchPlaceholder: "🔍 단어 검색...",
    wordlistEmpty: "이 레벨에는 아직 단어가 없어요.",
    wordlistAllLevels: "📚 전체 레벨",
    addToMyDeckBtn: "⭐ 내 플래시카드에 추가",
    clearSelectionBtn: "선택 해제",
    selectAllBtn: "☑️ 전체 선택",
    addedToMyDeck: (added, picked) =>
      added === picked
        ? `${added}개를 내 플래시카드에 추가했어요.`
        : `${picked}개 중 ${added}개를 추가했어요 — 나머지는 이미 들어있어요.`,
    wordlistCount: (n) => `단어 ${n}개`,
    customWordsCount: (n) => `총 ${n}개 단어`,
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
    ocrDesc: "책 페이지를 촬영하거나 온라인 지문을 캡처한 이미지, 또는 텍스트·Word·PDF 파일을 올려보세요. 텍스트를 읽어서 단어장에 추가할 후보 단어를 찾아드려요.",
    ocrChooseBtn: "📁 사진 또는 파일 선택하기",
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
    ocrUnsupportedFile: "지원하지 않는 파일 형식이에요. 사진 또는 .txt, .pdf, .docx 파일을 선택해주세요.",
    ocrNoCandidates: "이 이미지에서 새로운 후보 단어를 찾지 못했어요 (이미 단어장에 있는 단어일 수 있어요).",
    ocrFoundCandidates: (n) => `${n}개의 후보 단어를 찾았어요 — 추가하고 싶은 단어를 탭하세요:`,
    ocrSelectAtLeastOne: "먼저 단어를 하나 이상 선택해주세요.",
    ocrAddingStatus: (n) => `${n}개의 단어를 추가하는 중 — 의미를 찾고 있어요...`,
    ocrAddingProgress: (done, total) => `의미를 찾는 중... ${done} / ${total}`,
    ocrAddedStatus: (n, lvl) => `${lvl}에 ${n}개의 단어를 추가했어요!`,
    ocrNoDefFound: "(뜻을 찾지 못했어요 — Edit 버튼으로 직접 입력해주세요.)",
    myAddedWordsTitle: "📝 내가 추가한 단어",
    myAddedWordsEmpty: "아직 추가한 단어가 없어요.",
    customSearchPlaceholder: "🔍 추가한 단어 검색...",
    sortRecent: "🕒 최근 추가순",
    sortOldest: "🕒 오래된 순",
    sortAz: "🔤 ㄱ/A → Z",
    sortZa: "🔤 Z → A/ㄱ",
    sortMissing: "⚠️ 뜻 없는 단어 먼저",
    deleteSelectedBtn: "🗑️ 선택 삭제",
    deleteSelectedConfirm: (n) => `선택한 단어 ${n}개를 삭제할까요?`,
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
    authLogoutBtn: "로그아웃",
    myAccountMenuItem: "👤 내 계정",
    myAccountTitle: "👤 내 계정",
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
    anonymousFeatureSignupPrompt: "이 기능은 로그인한 계정만 사용할 수 있어요. 가입하고(무료예요!) 사용해보시겠어요?",
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
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Could not read saved progress", e);
  }
  return {
    wordStats: {}, // word -> { correct, incorrect }
    flashKnown: {}, // word -> true
    quiz: { correct: 0, total: 0 },
    spelling: { correct: 0, total: 0 },
    spellingStatus: {}, // word -> "wrong" | "correct" — persists so wrong words are re-served first next time
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

function renderGoalStepper(mode) {
  const valueEl = mode === "quiz" ? quizGoalValueEl : spellingGoalValueEl;
  const minusBtn = mode === "quiz" ? quizGoalMinusBtn : spellingGoalMinusBtn;
  const plusBtn = mode === "quiz" ? quizGoalPlusBtn : spellingGoalPlusBtn;
  valueEl.textContent = String(goals[mode]);
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

function promptSignupForMoreQuestions() {
  if (confirm(t("anonymousQuestionCapPrompt"))) {
    openAuthOverlay("signup");
  }
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
    el.setAttribute("aria-label", t(el.dataset.i18nAriaLabel));
  });
  document.getElementById("app-title").textContent = t("appTitle");
  document.getElementById("app-subtitle").textContent = t("appSubtitle");
  document.getElementById("app-footer").textContent = t("footerText");
  document.getElementById("lang-toggle").textContent = t("langToggle");
  document.getElementById("level-overlay-title").textContent = t("levelOverlayTitle");
  document.getElementById("level-overlay-desc").textContent = t("levelOverlayDesc");
  updateAdminUI();
  document.documentElement.lang = currentLang === "ko" ? "ko" : "en";
  populateCustomSortSelect();
  renderGoalStepper("quiz");
  renderGoalStepper("spelling");
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
  if (view === "typegame") enterTypeGameTab();
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
  const previousBtn = document.querySelector("nav.tabs button.active");
  const previousView = previousBtn ? previousBtn.dataset.view : null;
  // Leaving mid-round freezes the game in place rather than ending it, so
  // switching tabs to check something doesn't cost the player their score.
  if (previousView === "typegame" && view !== "typegame") pauseTypeGame();

  tabButtons.forEach((b) => b.classList.toggle("active", b.dataset.view === view));
  views.forEach((v) => v.classList.toggle("active", v.id === `view-${view}`));
  refreshView(view);
}

const addwordTabButton = document.querySelector('nav.tabs button[data-view="addword"]');
const adminCodesTabButton = document.querySelector('nav.tabs button[data-view="admincodes"]');
const flashcardsTabButton = document.querySelector('nav.tabs button[data-view="flashcards"]');
const wordlistTabButton = document.querySelector('nav.tabs button[data-view="wordlist"]');
const statsTabButton = document.querySelector('nav.tabs button[data-view="stats"]');
// Tabs gated behind being signed in (any role) — Quiz/Spelling/Typing Game
// stay open to everyone, admincodes has its own, stricter admin-only gate.
const accountGatedTabButtons = [addwordTabButton, flashcardsTabButton, wordlistTabButton, statsTabButton];

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    if (accountGatedTabButtons.includes(btn) && !canUseAccountFeatures()) {
      promptSignupForFeature();
      return;
    }
    if (btn.dataset.view === "admincodes" && !serverAdmin) return;
    goToTab(btn.dataset.view);
  });
});

function promptSignupForFeature() {
  if (confirm(t("anonymousFeatureSignupPrompt"))) {
    openAuthOverlay("signup");
  }
}

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
  authToggleBtn.title = currentUser ? t("myAccountMenuItem") : t("authHeaderLoginBtn");
  authToggleBtn.classList.toggle("auth-toggle-active", !!currentUser);
  if (!currentUser) closeAuthMenu();

  // Bounce back to Quiz if we're sitting on a tab that just became off-limits
  // (signed out while on an account-gated tab, or lost admin on admincodes),
  // or on My Account (no nav button of its own) after signing out.
  const activeOffLimitsTab = [
    ...(canUseAccountFeatures() ? [] : accountGatedTabButtons),
    ...(serverAdmin ? [] : [adminCodesTabButton]),
  ].find((btn) => btn && btn.classList.contains("active"));
  const onMyAccountSignedOut = !currentUser && document.getElementById("view-myaccount").classList.contains("active");
  if (activeOffLimitsTab || onMyAccountSignedOut) goToTab("quiz");
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

const flashSourceSel = document.getElementById("flash-source");
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
    return getSynonymPool(level).map((s) => ({
      word: s.word,
      definition: `Synonym: ${s.synonym}  •  Antonym: ${s.antonym}`,
      example: `"${s.word}" means the same as "${s.synonym}", and is the opposite of "${s.antonym}".`,
    }));
  }
  return getVocabPool(level);
}

function usingMyDeck() {
  return flashSourceSel.value === "mine";
}

function buildFlashDeck() {
  const items = usingMyDeck() ? myDeck.slice() : getFlashItems(flashCategorySel.value, currentLevel);
  flashDeck = shuffle(items);
  flashIndex = 0;
  // The category only applies to the generated deck, and the deck editor only
  // to your own cards.
  flashCategorySel.disabled = usingMyDeck();
  myDeckCard.hidden = !usingMyDeck();
  if (usingMyDeck()) renderMyDeck();
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

flashcardEl.addEventListener("click", (e) => {
  if (e.target === flashSpeakBtn) return;
  flashcardEl.classList.toggle("flipped");
});

flashSpeakBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  if (flashDeck.length) speak(flashWordEl.textContent);
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
flashFrontModeSel.addEventListener("change", renderFlashcard);
flashSourceSel.addEventListener("change", buildFlashDeck);

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
    btn.classList.toggle("primary", mode === id);
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
const quizScoreEl = document.getElementById("quiz-score");
const quizNextBtn = document.getElementById("quiz-next");
const quizProgressFill = document.getElementById("quiz-progress-fill");

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

  quizQuestions = shuffle(pool).slice(0, goals.quiz);
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

  const goal = goals.quiz;
  if (goal && !quizGoalCelebrated && quizScore >= goal) {
    quizGoalCelebrated = true;
    showGoalReached(quizGoalBanner, quizGoalMessage, quizGoalNextLevelBtn, quizScore);
  }
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
  const status = progress.spellingStatus;
  const wrongWords = pool.filter((w) => status[w.word] === "wrong");
  const untriedWords = pool.filter((w) => !(w.word in status));
  const doneWords = pool.filter((w) => status[w.word] === "correct");

  // The stepper can't be dragged past what's actually available, but the
  // pool itself can shrink out from under a stored preference (switching
  // level, or words disappearing) — clamp down here too so "Number of
  // Questions" and the Score denominator never disagree.
  if (pool.length >= GOAL_MIN && goals.spelling > pool.length) {
    goals.spelling = pool.length;
    saveGoals();
  }

  spellingDeck = [...shuffle(wrongWords), ...shuffle(untriedWords), ...shuffle(doneWords)].slice(0, goals.spelling);
  spellingIndex = 0;
  spellingScore = { correct: 0, total: 0 };
  spellingTotalCountedWords = new Set();
  spellingWrongThisRound = new Set();
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
    loadSpellingWord();
  }
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
  spellingCurrentChecked = false;
  spellingNextBtn.disabled = true;
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

function showSpellingCorrectFeedback() {
  spellingFeedback.innerHTML = "";
  const line = document.createElement("div");
  line.className = "spelling-correct-line";
  line.textContent = t("spellingCorrectPrompt");
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
  recordResult(current.word, correct);

  if (!spellingTotalCountedWords.has(current.word)) {
    spellingTotalCountedWords.add(current.word);
    spellingScore.total++;
    progress.spelling.total++;
  }

  if (correct) {
    // Only credit "correct" if this word was spelled right on the first try this
    // round — a word that was ever wrong this round stays counted as wrong, even
    // though it now passes the check and can be advanced past.
    if (!spellingWrongThisRound.has(current.word)) {
      spellingScore.correct++;
      progress.spelling.correct++;
      progress.spellingStatus[current.word] = "correct";
    }
    saveProgress();
    updateSpellingScoreLabel();
    spellingInput.className = "correct";
    showSpellingCorrectFeedback();
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
    showSpellingWrongFeedback(current);
    spellingCurrentChecked = false;
    spellingNextBtn.disabled = true;
  }
}

function goToNextSpellingWord() {
  if (!spellingCurrentChecked) return;
  spellingIndex++;
  loadSpellingWord();
}

function updateSpellingScoreLabel() {
  // The denominator is the round's planned word count (the deck built for
  // it, capped to the chosen number of questions), not how many words have
  // been attempted so far — so it reads correctly from the very first word.
  spellingScoreEl.textContent = t("scoreLabel", spellingScore.correct, spellingDeck.length);
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
  }
});

function renderSpellingReport() {
  spellingPractice.hidden = true;
  spellingReport.hidden = false;

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

let typeGameRunning = false;
let typeGamePaused = false;
let typeGameActive = []; // { text, el, top }
let typeGameWordPool = [];
let typeGameScore = 0;
let typeGameWordsCleared = 0;
let typeGameLives = TYPEGAME_LIVES;
let typeGameSpeed = TYPEGAME_BASE_SPEED;
let typeGameSpawnInterval = TYPEGAME_SPAWN_START;
let typeGameSpawnTimer = null;
let typeGameRafId = null;
let typeGameLastTs = null;
let typeGameTypoTimer = null;

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
  const full = "❤️".repeat(Math.max(typeGameLives, 0));
  const empty = "🖤".repeat(Math.max(TYPEGAME_LIVES - typeGameLives, 0));
  typeGameLivesEl.textContent = full + empty;
}

// Called whenever this tab becomes active: resumes a round that was frozen
// by switching tabs, or — if there's no round in progress — shows a fresh
// start screen for the current level.
function enterTypeGameTab() {
  if (typeGamePaused) {
    resumeTypeGame();
  } else if (!typeGameRunning) {
    resetTypeGame();
  }
}

function resetTypeGame() {
  typeGameActive.forEach((w) => w.el.remove());
  typeGameActive = [];
  typeGameScore = 0;
  typeGameWordsCleared = 0;
  typeGameLives = TYPEGAME_LIVES;
  typeGameSpeed = TYPEGAME_BASE_SPEED;
  typeGameSpawnInterval = TYPEGAME_SPAWN_START;
  typeGameInput.value = "";
  typeGameInput.disabled = true;
  hideTypeGameTypo();
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
  typeGameRunning = true;
  typeGamePaused = false;
  typeGameScore = 0;
  typeGameWordsCleared = 0;
  typeGameLives = TYPEGAME_LIVES;
  typeGameSpeed = TYPEGAME_BASE_SPEED;
  typeGameSpawnInterval = TYPEGAME_SPAWN_START;
  typeGameActive.forEach((w) => w.el.remove());
  typeGameActive = [];
  typeGameStartOverlay.hidden = true;
  typeGameOverOverlay.hidden = true;
  typeGameInput.disabled = false;
  typeGameInput.value = "";
  hideTypeGameTypo();
  typeGameInput.focus();
  updateTypeGameHud();

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

function scheduleTypeGameSpawn() {
  clearTimeout(typeGameSpawnTimer);
  typeGameSpawnTimer = setTimeout(() => {
    if (!typeGameRunning) return;
    spawnTypeGameWord();
    scheduleTypeGameSpawn();
  }, typeGameSpawnInterval);
}

function spawnTypeGameWord() {
  // Prefer a word that doesn't share a prefix with one already falling, so
  // typing never has to guess which of two words is meant; if every word in
  // the pool conflicts right now, just fall back to any random one.
  const candidates = shuffle(typeGameWordPool).filter(
    (w) =>
      !typeGameActive.some(
        (a) => a.text.toLowerCase().startsWith(w.toLowerCase()) || w.toLowerCase().startsWith(a.text.toLowerCase())
      )
  );
  const word = candidates[0] || shuffle(typeGameWordPool)[0];
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
  el.style.left = `${6 + Math.random() * 82}%`;
  el.style.top = "-30px";
  typeGameWordsEl.appendChild(el);

  typeGameActive.push({ text: word, el, top: -30 });
}

function typeGameLoop(ts) {
  if (!typeGameRunning) return;
  if (typeGameLastTs == null) typeGameLastTs = ts;
  const dt = (ts - typeGameLastTs) / 1000;
  typeGameLastTs = ts;

  const stageHeight = typeGameStage.clientHeight;
  for (let i = typeGameActive.length - 1; i >= 0; i--) {
    const w = typeGameActive[i];
    w.top += typeGameSpeed * dt;
    w.el.style.top = `${w.top}px`;
    if (w.top > stageHeight - 30) {
      w.el.remove();
      typeGameActive.splice(i, 1);
      loseTypeGameLife();
    }
  }

  if (typeGameRunning) typeGameRafId = requestAnimationFrame(typeGameLoop);
}

function loseTypeGameLife() {
  typeGameLives--;
  updateTypeGameHud();
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

function clearTypeGameWord(word) {
  word.el.classList.add("tw-cleared");
  setTimeout(() => word.el.remove(), 150);
  typeGameActive = typeGameActive.filter((w) => w !== word);

  typeGameScore += word.text.length * 10;
  typeGameWordsCleared++;
  updateTypeGameHud();

  // Speed ramps up by how many words have been typed correctly, not by
  // score, so a beginner spelling out long words isn't punished with a
  // faster game — the pace only picks up once they've clearly got the hang
  // of it.
  const speedUps = Math.floor(typeGameWordsCleared / TYPEGAME_WORDS_PER_SPEEDUP);
  typeGameSpeed = Math.min(TYPEGAME_BASE_SPEED + speedUps * TYPEGAME_SPEED_STEP, TYPEGAME_MAX_SPEED);
  typeGameSpawnInterval = Math.max(TYPEGAME_SPAWN_MIN, TYPEGAME_SPAWN_START - speedUps * TYPEGAME_SPAWN_STEP);
}

function endTypeGame() {
  typeGameRunning = false;
  typeGamePaused = false;
  cancelAnimationFrame(typeGameRafId);
  clearTimeout(typeGameSpawnTimer);
  typeGameInput.disabled = true;
  typeGameInput.value = "";
  hideTypeGameTypo();
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
  typeGameOverOverlay.hidden = false;
}

function showTypeGameTypo() {
  typeGameInput.classList.add("typegame-input-error");
  typeGameTypoMsg.hidden = false;
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

/* ---------- Typing Game background music ----------
   A short, cheerful loop generated entirely with the Web Audio API (a
   handful of oscillator notes on a pentatonic scale) rather than a shipped
   audio file, so there's nothing to download and no licensing to worry
   about. It only ever starts from a click (Start/Play Again, or returning
   to a paused round), which satisfies browsers' autoplay restrictions. */
const TYPEGAME_MELODY_HZ = [523.25, 587.33, 659.25, 783.99, 659.25, 587.33, 523.25, 659.25, 783.99, 880.0, 783.99, 659.25];
const TYPEGAME_NOTE_DURATION = 0.22; // seconds per note

let typeGameAudioCtx = null;
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

function ensureTypeGameAudioCtx() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!typeGameAudioCtx) typeGameAudioCtx = new Ctx();
  if (typeGameAudioCtx.state === "suspended") typeGameAudioCtx.resume();
  return typeGameAudioCtx;
}

function playTypeGameNote(freq, when) {
  const ctx = typeGameAudioCtx;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, when);
  gain.gain.linearRampToValueAtTime(0.05, when + 0.02);
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
  while (typeGameNextNoteTime < typeGameAudioCtx.currentTime + 0.5) {
    playTypeGameNote(TYPEGAME_MELODY_HZ[typeGameMusicIndex % TYPEGAME_MELODY_HZ.length], typeGameNextNoteTime);
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

typeGameMuteBtn.addEventListener("click", () => {
  typeGameMuted = !typeGameMuted;
  saveTypeGameMuted();
  updateTypeGameMuteBtn();
  if (typeGameMuted) stopTypeGameMusic();
  else if (typeGameRunning) startTypeGameMusic();
});

updateTypeGameMuteBtn();

/* ================= WORD LIST ================= */
const wordlistSearch = document.getElementById("wordlist-search");
const wordlistGrid = document.getElementById("wordlist-grid");
const wordlistLevelSelect = document.getElementById("wordlist-level");
const wordlistCountEl = document.getElementById("wordlist-count");
const wordlistAddDeckBtn = document.getElementById("wordlist-add-deck-btn");
const wordlistClearSelectionBtn = document.getElementById("wordlist-clear-selection-btn");
const wordlistSelectAllBtn = document.getElementById("wordlist-select-all-btn");
// Keyed by word, since the same word can be reached under several levels.
const selectedWordlistWords = new Map();

// Shared by both word-list views: toggles every checkbox currently rendered
// in the grid (i.e. the currently filtered/visible rows, not the whole
// underlying set) — select-all when anything is unchecked, clear when
// everything already is, driven through each checkbox's own change handler
// so the selection state it maintains stays correct either way.
function toggleSelectAllInGrid(grid) {
  const checkboxes = Array.from(grid.querySelectorAll(".cw-select"));
  if (checkboxes.length === 0) return;
  const shouldSelect = !checkboxes.every((cb) => cb.checked);
  checkboxes.forEach((cb) => {
    if (cb.checked !== shouldSelect) {
      cb.checked = shouldSelect;
      cb.dispatchEvent(new Event("change"));
    }
  });
}

function updateWordlistSelectionButtons() {
  const none = selectedWordlistWords.size === 0;
  wordlistAddDeckBtn.disabled = none;
  wordlistClearSelectionBtn.disabled = none;
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
    updateWordlistSelectionButtons();
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

  wordlistCountEl.textContent = t("customWordsCount", words.length);
  updateWordlistSelectionButtons();
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
wordlistLevelSelect.addEventListener("change", renderWordList);

wordlistAddDeckBtn.addEventListener("click", () => {
  const picked = Array.from(selectedWordlistWords.values());
  if (picked.length === 0) return;
  const added = addToMyDeck(picked);
  selectedWordlistWords.clear();
  renderWordList();
  buildFlashDeck();
  // After the re-render, so it isn't overwritten by the count.
  wordlistCountEl.textContent = t("addedToMyDeck", added, picked.length);
});

wordlistSelectAllBtn.addEventListener("click", () => toggleSelectAllInGrid(wordlistGrid));

wordlistClearSelectionBtn.addEventListener("click", () => {
  selectedWordlistWords.clear();
  renderWordList();
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
const customSortSelect = document.getElementById("custom-sort");
const customWordsCountEl = document.getElementById("custom-words-count");
const CUSTOM_SORTS = ["recent", "oldest", "az", "za", "missing"];
const customDeleteSelectedBtn = document.getElementById("custom-delete-selected-btn");
const customSelectAllBtn = document.getElementById("custom-select-all-btn");
const customMergeDuplicatesBtn = document.getElementById("custom-merge-duplicates-btn");
const customCleanTextBtn = document.getElementById("custom-clean-text-btn");
const customCheckKoreanBtn = document.getElementById("custom-check-korean-btn");
const customUploadBtn = document.getElementById("custom-upload-btn");
const customLevelSelect = document.getElementById("custom-level-select");
const customStorageNote = document.getElementById("custom-words-storage-note");
let selectedCustomWordIds = new Set();

function populateCustomSortSelect() {
  const previous = customSortSelect.value || "recent";
  customSortSelect.innerHTML = "";
  CUSTOM_SORTS.forEach((id) => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = t(`sort${id.charAt(0).toUpperCase()}${id.slice(1)}`);
    customSortSelect.appendChild(opt);
  });
  customSortSelect.value = previous;
}
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

// Best-effort automatic level for a word, for a given language track (defaults
// to the currently active one): reuse the level already assigned to it in our
// own curated word banks when it's a known word; otherwise fall back to a
// rough word-length heuristic. This is an estimate, not a real difficulty
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
  const len = w.replace(/[^a-z]/g, "").length;
  if (lang === "ko") {
    if (len <= 4) return levelIds[0];
    if (len <= 6) return levelIds[1];
    if (len <= 8) return levelIds[2];
    if (len <= 10) return levelIds[3];
    return levelIds[4];
  }
  if (len <= 6) return levelIds[0];
  if (len <= 9) return levelIds[1];
  if (len <= 12) return levelIds[2];
  return levelIds[3];
}

function setAddMode(mode) {
  const single = mode === "single";
  manualForm.hidden = !single;
  bulkAddForm.hidden = single;
  addModeSingleBtn.classList.toggle("primary", single);
  addModeSingleBtn.classList.toggle("neutral", !single);
  addModeBulkBtn.classList.toggle("primary", !single);
  addModeBulkBtn.classList.toggle("neutral", single);
}

addModeSingleBtn.addEventListener("click", () => setAddMode("single"));
addModeBulkBtn.addEventListener("click", () => setAddMode("bulk"));

bulkAddSaveBtn.addEventListener("click", async () => {
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
  customDeleteSelectedBtn.disabled = selectedCustomWordIds.size === 0;
  customLevelSelect.disabled = selectedCustomWordIds.size === 0;
}

// The words this section manages — an admin's own shared additions, a paid
// account's own private words, or anything not yet synced/volatile — never
// someone else's shared or private words that merely got merged into
// customWords for practice purposes (Quiz/Spelling/Word List still use the
// full customWords, unfiltered).
function myCustomWords() {
  return customWords.filter(isMyCustomWord);
}

function renderCustomWords() {
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
  customStorageNote.hidden = false;
  customStorageNote.textContent = t(storageNoteKey());

  customWordsGrid.innerHTML = "";
  if (mine.length === 0) {
    customWordsEmpty.hidden = false;
    customWordsCountEl.textContent = "";
    return;
  }
  customWordsEmpty.hidden = true;

  const query = customSearchInput.value.trim().toLowerCase();
  const sort = customSortSelect.value || "recent";
  const shown = mine.filter((w) => {
    if (!query) return true;
    const meaning = cwDefinition(w) || "";
    return w.word.toLowerCase().includes(query) || meaning.toLowerCase().includes(query);
  });

  shown.sort((a, b) => {
    if (sort === "az") return a.word.localeCompare(b.word);
    if (sort === "za") return b.word.localeCompare(a.word);
    if (sort === "oldest") return a.createdAt - b.createdAt;
    if (sort === "missing") {
      const aMissing = cwNoDefinition(a) ? 0 : 1;
      const bMissing = cwNoDefinition(b) ? 0 : 1;
      if (aMissing !== bMissing) return aMissing - bMissing;
    }
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
        updateDeleteSelectedBtn();
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
}

customRetryAllBtn.addEventListener("click", retryAllFailedWords);
customDeleteFailedBtn.addEventListener("click", deleteAllFailedWords);

customSearchInput.addEventListener("input", renderCustomWords);
customSortSelect.addEventListener("change", renderCustomWords);

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
  if (!confirm(t("deleteSelectedConfirm", selectedCustomWordIds.size))) return;
  const removedRemoteIds = customWords
    .filter((w) => selectedCustomWordIds.has(w.id) && w.remote)
    .map((w) => w.id);
  customWords = customWords.filter((w) => !selectedCustomWordIds.has(w.id));
  selectedCustomWordIds.clear();
  saveCustomWords();
  renderCustomWords();
  renderWordList();
  removeSharedWords(removedRemoteIds);
});

customSelectAllBtn.addEventListener("click", () => toggleSelectAllInGrid(customWordsGrid));

// Merges every group of duplicate words (same text, case-insensitive) into a
// single entry: the oldest entry in each group is kept and filled in with
// whatever fields (definitions, example, level) the newer duplicates have
// that it's missing, and the rest are removed.
customMergeDuplicatesBtn.addEventListener("click", () => {
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

customCleanTextBtn.addEventListener("click", async () => {
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
});

// Finds words whose stored Korean meaning isn't actually Korean (the free
// translation lookup sometimes returns English text, or just echoes the
// word back) and re-flags them as missing so "Missing meaning first" surfaces
// them and Retry (single or All) can fetch a real one. Meanings typed in by
// hand are left alone.
customCheckKoreanBtn.addEventListener("click", async () => {
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

  const kind = ocrFileKind(file);

  if (kind === "unsupported") {
    ocrStatus.textContent = t("ocrUnsupportedFile");
    ocrReview.hidden = false;
    ocrFileInput.value = "";
    return;
  }

  if (kind === "image") {
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
    return;
  }

  if ((kind === "pdf" && typeof pdfjsLib === "undefined") || (kind === "docx" && typeof mammoth === "undefined")) {
    ocrStatus.textContent = t("ocrNoDocReader");
    ocrReview.hidden = false;
    ocrFileInput.value = "";
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
  progress = {
    wordStats: {},
    flashKnown: {},
    quiz: { correct: 0, total: 0 },
    spelling: { correct: 0, total: 0 },
    spellingStatus: {},
  };
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
resetTypeGame();
renderWordList();
renderCustomWords();
