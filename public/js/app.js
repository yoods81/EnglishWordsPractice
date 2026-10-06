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
// Only used to recognise a login attempt against the reserved admin
// username, for the "server's unreachable" message below — admin login
// itself is checked exclusively by the server now (see loginForm's submit
// handler).
const ADMIN_USERNAME = "admin";

/* ================= TRANSLATIONS ================= */
const TRANSLATIONS = {
  en: {
    appTitle: "Koala Study Mate",
    appSubtitle: "Vocabulary, spelling & times tables for Australian primary students",
    heroWord1: "Learn.",
    heroWord2: "Practise.",
    heroWord3: "Remember.",
    heroSub: "A fun study buddy for Australian primary students, helping you build vocabulary, spelling and times-table skills.",
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
    promoBtn: "TRY !!",
    promoSnap: "Snap",
    promoPick: "Pick",
    promoPractise: "Practise",
    homeLearn: "Learn",
    homePlay: "Play",
    homeMine: "My learning",
    langToggle: "한국어",
    levelBadgePrefix: "Level",
    levelOverlayTitle: "📚 Choose your level",
    levelOverlayDesc: "Pick the level you want to practise. You can change this anytime.",
    navFlashcards: "Flashcards",
    navQuiz: "💡 Quiz",
    navSpelling: "✏️ Spelling",
    navTypeGame: "⌨️ Typing Game",
    navTimesTable: "🧮 Times Table",
    navWordlist: "📖 Word List",
    navAddword: "➕ Add Word",
    navStats: "📊 My Progress",
    navKoala: "My Koala",
    navKoalaShort: "My Koala",
    landingDescKoala: "Your badges, streak and Koala",
    koalaSub: "Everything you earn while you learn lives here.",
    navHome: "🏠 Home",
    navAdminCodes: "🛠️ Admin",
    homeAdmin: "Admin",
    landingDescAdmin: "Codes, users and Koala Coins",
    // Section titles shown at the top of the Quiz/Spelling/Flashcards cards
    // themselves (not the nav) — separate from navQuiz/navSpelling/
    // navFlashcards above since those carry the nav's own emoji/short-form.
    quizSectionTitle: "💡 Quiz",
    spellingSectionTitle: "✏️ Spelling",
    flashcardsSectionTitle: "Flashcards",
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
    spStartTitle: "✏️ Spelling",
    spStep1: "Listen",
    spStep2: "Type",
    spStep3: "Win a star",
    spIntroTip1: "Hear the word 👂",
    spIntroTip2: "Type what you hear ⌨️",
    spIntroTip3: "Check it and win a star! ⭐",
    spWhyTitle: "Why practise spelling?",
    spWhy1: "Words you can spell are words you read faster.",
    spWhy2: "Your writing looks clear and confident.",
    spWhy3: "Spelling is part of school tests like NAPLAN.",
    spLiveIdle: "Can you spell it? ✏️",
    spLiveHear: "Listening 👂",
    spLiveOk: "Yum! 🍃",
    spLiveFull: "So full & happy! 🥰",
    kbIdle: "Let's go! 🍃",
    kbYum: "Yum! 🍃",
    kbOops: "Oops! 😮",
    kbOver: "Good try!",
    spLiveNo: "Try again 💪",
    spLiveSad: "Oh no… 💧",
    spLiveNext: "Next! 🍃",
    spLivePrev: "Look back 👀",
    spProgressLabel: (i, n) => `Word ${i} of ${n}`,
    fkIdle: "Tap the card\nto Flip!",
    fkFlip: "Ta-da! ✨",
    fkIdleBack: "Did you know it?",
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
    progressTitle: "My Progress",
    progressSub: "See how you're doing and what to practise next.",
    moreStats: "More stats",
    statsTabBadges: "🏅 Badges",
    statsTabWrong: "📕 Wrong notes",
    statsTabParent: "👪 Parent",
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
    adminCodesTitle: "🎁 Premium Signup Codes",
    adminCodesDesc: "Generate a one-time code and send it to someone so they can sign up as a premium account instead of general.",
    adminCodesGenerateBtn: "🎟️ Generate New Code",
    adminCodesEmpty: "No codes generated yet.",
    adminCodesCount: (n) => `${n} code${n === 1 ? "" : "s"}`,
    adminCodeUsedBy: (username) => `🟣 Used: ${username}`,
    adminCodeUnused: "🟢 Available",
    adminCodeCopyBtn: "📋 Copy",
    adminCodeCopiedBtn: "✅ Copied!",
    adminCodeGenerateFailed: "Could not generate a code — please try again.",
    adminCodeDeleteBtn: "🗑️ Delete",
    adminCodeConfirmDelete: (code) => `Delete code ${code}? This can't be undone.`,
    adminCodesSortLabel: "Sort by",
    adminCodesSortNewest: "Newest",
    adminCodesSortUnused: "Not used first",
    adminCodesSortUsed: "Used first",
    adminRequestApproveBtn: "✅ Approve",
    adminRequestDismissBtn: "Dismiss",
    adminRequestActionFailed: "That didn't work — please try again.",
    adminStatTotalUsers: "👥 Total Users",
    adminStatPremiumUsers: "⭐ Premium",
    adminStatTotalCoins: "Coins Issued",
    adminStatUnusedCodes: "🎟️ Unused Codes",
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
    adminUserDeleteBtn: "🗑️ Delete account",
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
    typeGameHint: "Just type! The matching word locks on all by itself. Press Enter to check ✨",
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
    timesTableLabelDefault: "2–9",
    timesTableLabelAll: "All",
    timesTableNone: "Pick tables",
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
    gameOverNewRecord: "🎉 NEW RECORD!",
    gameOverGood: "Good Job! 👏",
    gameOverKeepGoing: "Keep Going! 🔥",
    gameOverStarsLabel: (n) => `${n} of 3 stars`,
    gameOverReview: "Review",
    gameOverReviewTitle: "Missed this round",
    gameOverReviewBack: "Back",
    timesTableTipLine: "💡 Type both numbers and the answer together! (e.g. 8 × 4 → 8432)",
    timesTableHelpLabel: "How to answer",
    timesTableGuideClose: "Close",
    timesTableKeypadToggle: "Number pad",
    timesTableKeyBackspace: "Backspace",
    timesTableKeyEnter: "Enter",
    ttPerfect: "Perfect!",
    ttSuperFast: "Super Fast!",
    ttCombo: (n) => `${n} Combo!`,
    kbCheer: "Yay! 🎉",
    kbCombo: "Combo! 🔥",
    kbFast: "Zoom! ⚡",
    timesTableChallengePrompt: (table) => `Ready to try the ${table} times table?`,
    categoryLabel: "Category",
    optVocabulary: "Vocabulary",
    optSynonyms: "Synonyms",
    optAntonyms: "Antonyms",
    optHomophones: "Homophones",
    optMeaning: "Word → Meaning",
    optFillBlank: "Fill in the Blank",
    optListening: "Listen & Choose",
    optTyping: "Type the Word",
    optMixed: "🔀 Mixed",
    qzStartTitle: "💡 Quiz",
    qzLevelTitle: "📚 Difficulty",
    qzModeTitle: "🎮 Mode",
    qzModeRelaxed: "🌿 Relaxed",
    qzModeTime: "⏱ Time Attack",
    qzModeNoteRelaxed: "Take your time. No clock!",
    qzModeNoteTime: (c, ty) => `${c} seconds a question (${ty} when typing). If time runs out, it counts as a miss.`,
    quizStartBtn: "▶ Start Quiz",
    flashStartBtn: "▶ Start Flashcards",
    flashStartTitle: "Flashcards",
    fsDemo1: "a sleepy",
    fsDemo2: "gum-tree animal",
    fsCount: (n) => `${n} cards ready`,
    fsEmpty: "No cards yet. Pick words in the Word List and add them to your flashcards.",
    flashSettingsLabel: "Settings",
    fsStep1: "Look",
    fsStep2: "Flip",
    fsStep3: "Know it?",
    ttsHelpMsg: "🔇 Can't hear the word? On your phone, search Settings for “text-to-speech” and set the preferred engine to “Speech Services by Google”. Then close and reopen your browser. Also check the volume and that silent mode is off.",
    ttsHelpMsgIos: "🔇 Can't hear the word? Turn silent mode off (the switch on the side), turn the volume up, then try again.",
    ttsHelpOk: "Got it",
    qzChipQuestions: (n) => `🎯 ${n} questions`,
    qzGoalMore: "🔒 More questions…",
    qzChipTime: "⏱ Time Attack",
    qzDailyLine: (have, goal) => `🎯 Today: ${have} / ${goal} questions`,
    qzDailyDone: "🎉 Daily goal reached!",
    qzCount: (i, n) => `Question ${i} / ${n}`,
    qzScoreTag: (n) => `Correct: ${n}`,
    qzComboChip: (n) => `🔥 ${n} in a row`,
    qzInstrVocabulary: "Which word matches this meaning?",
    qzInstrMeaning: "What does this word mean?",
    qzInstrFillblank: "Which word fits the gap?",
    qzInstrListening: "Listen, then choose the word you hear.",
    qzInstrTyping: "Read the meaning, then type the word.",
    qzInstrSynonyms: "Choose the best match.",
    qzInstrHomophones: "Choose the right meaning.",
    qzListenPrompt: "👂 ?",
    qzTypingPlaceholder: "Type the word…",
    qzCheckBtn: "Check 🔍",
    qzHintsTitle: "💡 Hints",
    qzHint5050: "❌ Remove 2 wrong",
    qzHint5050Tip: "Hint: removes 2 wrong answers",
    qzHintLetter: "🅰️ First letter",
    qzHintLetterTip: "Hint: shows the first letter of the answer",
    qzHintNote: "Each hint uses 1 🌿. Get 5 right in a row to win a 🌿 back!",
    qzEndBtn: "🚩 Quit",
    qzHintStarts: (c) => `Starts with “${c}”`,
    qzNoLeaves: "No leaves left! Get 5 in a row to win one back 🌿",
    qzLeavesAria: (n) => `${n} hint leaves left`,
    qzFbCorrect: "✅ Correct!",
    qzFbWrong: (a) => `❌ The answer is “${a}”`,
    qzFbTimeUp: (a) => `⏰ Time's up! The answer is “${a}”`,
    qzFbAlmost: "So close! Check the spelling.",
    qzMoodGreat: "Amazing! You're a star! 🌟",
    qzMoodGood: "Great job! Keep it up! 💪",
    qzMoodKeep: "Good try! Practice makes perfect 🌱",
    qzNoMissed: "You didn't miss a single one! 🎉",
    qzRetryBtn: (n) => `🔁 Retry missed words (${n})`,
    qzAgainBtn: "▶ Play again",
    qzSettingsBtn: "⚙️ Change settings",
    qzGiftBtn: "🎁 Open gift",
    qzGiftBtnLabel: "Open gift",
    qzSeeResults: "See results 🏁",
    flashFrontModeLabel: "Flashcard front side",
    flashSourceLabel: "Flashcard source",
    flashSourceAuto: "🎯 Level words",
    flashSourceMine: "⭐ My cards",
    flashSourceTitle: "Cards from",
    flashFrontTitle: "Card front",
    flashIntroNote: "Look at the word, tap the card to flip it, then say if you know it!",
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
    flashFrontWord: "📝 Word",
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
    spellingPlaceholder: "Type what you hear",
    spLiveTapHear: "🔊 Tap my tummy to listen!",
    spKbToggleAria: "Use the phone keyboard",
    spellingStartBtn: "▶ Start",
    spellingContinueBtn: "▶ Keep going",
    spellingBackBtn: "🍃 Back",
    spellingNextBtn: "Next 🌿",
    spellingCheckBtn: "Check 🔍",
    spellingCheckedBtn: "Checked ✅",
    spellingCheckAria: "Check answer",
    spLiveTyping: "Type the letters! ✏️",
    spLiveAlmost: "Almost there! 🔥",
    spListenBtn: "Listen",
    spListenAria: "Hear the word",
    spellingBackAria: "Previous word",
    spellingNextAria: "Next word",
    spellingBackspaceAria: "Delete last letter",
    spellingCorrectPrompt: "✅ Correct! Press Next to continue.",
    spellingCorrectNoCreditPrompt: "✅ Correct! (This one already counted as wrong earlier this round, so it won't add to your score.) Press Next to continue.",
    spellingWrongPrompt: "Please enter the correct spelling to go to the next word",
    spellingEmpty: (lvl) => `No ${lvl} spelling words yet. Add some in "Add Word"!`,
    spellingFinishBtn: "🚩 Quit",
    spellingReportTitle: "⭐ Spelling Report",
    spReportNone: "No questions answered yet. Ready to try?",
    spReportSome: (n) => `${n} to review — you can do it! 💪`,
    flashReportTitle: "⭐ Flashcard Report",
    flReportNone: "You haven't rated any cards yet. Ready to try?",
    flReportSome: (n) => `${n} to study again — you can do it! 💪`,
    flReportPerfect: "Wow! You knew every card! 🎉",
    flReportReview: "Words to study again · tap to hear 🔊",
    flReportKnown: (k, r) => `Knew ${k} / ${r}`,
    flReportSeen: (n) => `📖 ${n} card${n === 1 ? "" : "s"} seen`,
    flReportRestart: "Study again",
    spReportLevel: "📚 Change level",
    spReportGame: "⌨️ Typing Game",
    spReportReview: "Words to review · tap to hear 🔊",
    spReportPerfect: "Perfect! Every word right! 🎉",
    spReportGoodStart: "Great start! Shall we do more? 🌟",
    spReportScore: (c, n, p) => (c > 0 ? `${c} / ${n} · ${p}%` : `${c} / ${n}`),
    spReportStreak: (d) => `🔥 ${d}-day streak`,
    spReportStars: (n) => `⭐ +${n}`,
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
    wordlistSelectedChip: (n) => `${n} selected`,
    wlFilterGroup: "Filter by mastery",
    wlFilterAll: "All",
    wlFilterReview: "Needs review",
    wlFilterMastered: "Mastered",
    wlFilterWrong: "Incorrect",
    wlFilterEmpty: "No words match this filter yet.",
    hearExampleLabel: "Hear the example sentence",
    masteryNew: "New",
    masteryPct: (pct) => `${pct}% mastered`,
    addWordManualTitle: "➕ Add a word manually",
    addModeSingle: "Single word",
    addModeBulk: "Multiple words",
    bulkWordsLabel: "Words (one per line, or separated by commas)",
    bulkWordsPlaceholder: "resilient\nmagnificent\ncurious",
    bulkWordsHint: "We'll automatically look up each word's meaning and example, and guess a matching level for it.",
    bulkAddSaveBtn: "Save words",
    bulkAnalyzing: "Analyzing words...",
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
    ocrDropzoneCaptionMain: "Or drag a file here",
    ocrDropzoneCaptionSub: "Photos, TXT, PDF, Word, Excel supported · Max 10MB",
    ocrFileTooLarge: "That file is too big — please choose one under 10MB.",
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
    myAddedWordsEmpty: "You haven't added any words yet — add your first one above!",
    loadMoreWords: (n) => `Load More (${n} more)`,
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
    adminModeBadge: "🔑 ADMIN MODE",
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
    deleteConfirmYesBtn: "🗑️ Delete",
    deleteConfirmNoBtn: "Cancel",
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
    myAccountMenuItem: "My Account",
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
    authAdminOfflineErrorText: "Can't reach the server right now, so admin login isn't available. Please try again later.",
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
    heroWord1: "배우고.",
    heroWord2: "익히고.",
    heroWord3: "기억해요.",
    heroSub: "영어 필수 단어를 공부하는 친구들을 위한 재미있는 공부 친구예요. 어휘, 스펠링, 구구단 실력을 함께 키워요.",
    homePitch: "하루 몇 분, 짧고 재미있게 어휘력, 스펠링, 구구단을 키워요.",
    homeAus: "🇰🇷 영어 필수 단어를 공부하는 학생들을 위해 만들었어요",
    homeChooseYear: "학년을 골라요",
    homeStartBtn: "▶ 오늘의 연습 시작",
    missionTitle: "🎯 오늘의 미션",
    missionFlash: (n) => `플래시카드로 ${n}단어 익히기`,
    missionSpelling: (n) => `스펠링 ${n}단어 쓰기`,
    missionQuiz: (n) => `퀴즈 ${n}문제 풀기`,
    missionTT: (n) => `구구단 ${n}문제 연습하기`,
    missionGo: "GO",
    missionDoneMsg: "🎉 미션 완료! 내일 새로운 미션이 기다려요.",
    missionToast: "미션 완료!",
    promoTitle: "📸 아이의 책에서 바로 퀴즈로",
    promoSteps: "책 한 페이지를 찍고 → 어려운 단어를 고르면 → 플래시카드, 스펠링, 퀴즈로 연습해요.",
    promoBtn: "TRY !!",
    promoSnap: "찍기",
    promoPick: "고르기",
    promoPractise: "연습",
    homeLearn: "배우기",
    homePlay: "게임",
    homeMine: "내 공부",
    langToggle: "English",
    levelBadgePrefix: "레벨",
    levelOverlayTitle: "📚 레벨을 선택하세요",
    levelOverlayDesc: "학습할 레벨을 선택하세요. 언제든지 바꿀 수 있어요.",
    navFlashcards: "플래시카드",
    navQuiz: "💡 퀴즈",
    navSpelling: "✏️ 스펠링",
    navTypeGame: "⌨️ 타이핑 게임",
    navTimesTable: "🧮 구구단",
    navWordlist: "📖 단어장",
    navAddword: "➕ 단어 추가",
    navStats: "📊 내 진행상황",
    navKoala: "나의 코알라",
    navKoalaShort: "나의 코알라",
    landingDescKoala: "나의 배지, 연속 학습, 코알라",
    koalaSub: "공부하면서 얻은 모든 것이 여기에 모여요.",
    navHome: "🏠 홈",
    navAdminCodes: "🛠️ 관리자",
    homeAdmin: "관리자",
    landingDescAdmin: "코드, 사용자, 코알라 코인 관리",
    quizSectionTitle: "💡 퀴즈",
    spellingSectionTitle: "✏️ 스펠링",
    flashcardsSectionTitle: "플래시카드",
    navStudy: "📚 학습",
    navGame: "👾 게임",
    navQuizShort: "퀴즈",
    navTimesTableShort: "구구단",
    navStatsShort: "진행상황",
    spStartTitle: "✏️ 스펠링",
    spStep1: "듣기",
    spStep2: "쓰기",
    spStep3: "별 받기",
    spIntroTip1: "단어를 들어봐요 👂",
    spIntroTip2: "들리는 대로 써봐요 ⌨️",
    spIntroTip3: "정답을 확인하고 별을 받아요! ⭐",
    spWhyTitle: "스펠링 연습, 왜 중요할까요?",
    spWhy1: "철자를 알면 글을 더 빨리 읽을 수 있어요.",
    spWhy2: "글씨가 또렷하고 자신감 있게 보여요.",
    spWhy3: "호주 학교 시험(NAPLAN)에도 스펠링이 나와요.",
    spLiveIdle: "철자를 맞춰 볼까요? ✏️",
    spLiveHear: "쫑긋 👂",
    spLiveOk: "냠냠! 🍃",
    spLiveFull: "배불러서 행복해요! 🥰",
    kbIdle: "가자! 🍃",
    kbYum: "냠냠! 🍃",
    kbOops: "앗! 😮",
    kbOver: "잘했어요!",
    spLiveNo: "다시 해봐요 💪",
    spLiveSad: "앗… 💧",
    spLiveNext: "다음! 🍃",
    spLivePrev: "다시 보기 👀",
    spProgressLabel: (i, n) => `${n}단어 중 ${i}번째`,
    fkIdle: "카드를 눌러 뒤집어요!",
    fkFlip: "짜잔! ✨",
    fkIdleBack: "알고 있었나요?",
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
    progressTitle: "나의 학습 현황",
    progressSub: "지금 어떻게 하고 있는지, 다음에 뭘 할지 확인해요.",
    moreStats: "더 많은 통계",
    statsTabBadges: "🏅 배지",
    statsTabWrong: "📕 오답 노트",
    statsTabParent: "👪 학부모",
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
    adminCodesTitle: "🎁 프리미엄 가입 코드",
    adminCodesDesc: "1회용 코드를 생성해서 전달하면, 받은 사람이 일반 대신 프리미엄 계정으로 가입할 수 있어요.",
    adminCodesGenerateBtn: "🎟️ 새 코드 생성",
    adminCodesEmpty: "아직 생성된 코드가 없어요.",
    adminCodesCount: (n) => `코드 ${n}개`,
    adminCodeUsedBy: (username) => `🟣 사용 완료 : ${username}`,
    adminCodeUnused: "🟢 사용 가능",
    adminCodeCopyBtn: "📋 복사",
    adminCodeCopiedBtn: "✅ 복사됨!",
    adminCodeGenerateFailed: "코드를 생성하지 못했어요 — 다시 시도해주세요.",
    adminCodeDeleteBtn: "🗑️ 삭제",
    adminCodeConfirmDelete: (code) => `코드 ${code}를 삭제할까요? 되돌릴 수 없어요.`,
    adminCodesSortLabel: "정렬",
    adminCodesSortNewest: "최신순",
    adminCodesSortUnused: "미사용 우선",
    adminCodesSortUsed: "사용됨 우선",
    adminRequestApproveBtn: "✅ 승인",
    adminRequestDismissBtn: "거절",
    adminRequestActionFailed: "처리하지 못했어요 — 다시 시도해주세요.",
    adminStatTotalUsers: "👥 총 회원",
    adminStatPremiumUsers: "⭐ 프리미엄",
    adminStatTotalCoins: "발급된 코인",
    adminStatUnusedCodes: "🎟️ 미사용 코드",
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
    adminUserDeleteBtn: "🗑️ 계정 삭제",
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
    typeGameHint: "그냥 입력해 보세요! 맞는 단어가 알아서 조준돼요. Enter를 누르면 확인해요 ✨",
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
    timesTableLabelDefault: "2~9단",
    timesTableLabelAll: "전체",
    timesTableNone: "단 고르기",
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
    gameOverNewRecord: "🎉 신기록 달성!",
    gameOverGood: "잘했어요! 👏",
    gameOverKeepGoing: "계속 도전! 🔥",
    gameOverStarsLabel: (n) => `별 3개 중 ${n}개`,
    gameOverReview: "오답 확인",
    gameOverReviewTitle: "이번에 틀린 문제",
    gameOverReviewBack: "돌아가기",
    timesTableTipLine: "💡 문제의 두 수와 정답을 붙여서 입력하세요! (예: 8 × 4 문제 → 8432)",
    timesTableHelpLabel: "입력 방법 보기",
    timesTableGuideClose: "닫기",
    timesTableKeypadToggle: "숫자 키패드",
    timesTableKeyBackspace: "지우기",
    timesTableKeyEnter: "입력",
    ttPerfect: "완벽해요!",
    ttSuperFast: "슈퍼 패스트!",
    ttCombo: (n) => `${n} 콤보!`,
    kbCheer: "야호! 🎉",
    kbCombo: "콤보! 🔥",
    kbFast: "번개! ⚡",
    timesTableChallengePrompt: (table) => `${table}단에 도전하시겠습니까?`,
    categoryLabel: "카테고리",
    optVocabulary: "어휘",
    optSynonyms: "동의어",
    optAntonyms: "반의어",
    optHomophones: "동음이의어",
    optMeaning: "단어 → 뜻",
    optFillBlank: "빈칸 채우기",
    optListening: "듣고 고르기",
    optTyping: "철자 쓰기",
    optMixed: "🔀 섞어서",
    qzStartTitle: "💡 퀴즈",
    qzLevelTitle: "📚 난이도",
    qzModeTitle: "🎮 모드",
    qzModeRelaxed: "🌿 여유롭게",
    qzModeTime: "⏱ 타임어택",
    qzModeNoteRelaxed: "천천히 풀어요. 시간 제한이 없어요!",
    qzModeNoteTime: (c, ty) => `문제당 ${c}초 (쓰기는 ${ty}초). 시간이 지나면 오답으로 처리돼요.`,
    quizStartBtn: "▶ 퀴즈 시작",
    flashStartBtn: "▶ 플래시카드 시작",
    flashStartTitle: "플래시카드",
    fsDemo1: "나무에서 사는",
    fsDemo2: "졸린 동물",
    fsCount: (n) => `카드 ${n}장 준비됐어요`,
    fsEmpty: "아직 카드가 없어요. 단어장에서 단어를 골라 내 플래시카드에 추가해 보세요.",
    flashSettingsLabel: "설정",
    fsStep1: "보기",
    fsStep2: "뒤집기",
    fsStep3: "알아요?",
    ttsHelpMsg: "🔇 단어 소리가 안 나나요? 폰 설정에서 “텍스트 음성 변환”(TTS)을 검색해 기본 엔진을 “Google 음성 서비스”로 바꾼 뒤, 브라우저를 완전히 껐다가 다시 열어 주세요. 볼륨과 무음 모드도 확인해 주세요.",
    ttsHelpMsgIos: "🔇 단어 소리가 안 나나요? 무음 모드(옆면 스위치)를 끄고 볼륨을 올린 뒤 다시 시도해 주세요.",
    ttsHelpOk: "확인",
    qzChipQuestions: (n) => `🎯 ${n}문제`,
    qzGoalMore: "🔒 더 많은 문제…",
    qzChipTime: "⏱ 타임어택",
    qzDailyLine: (have, goal) => `🎯 오늘: ${have} / ${goal}문제`,
    qzDailyDone: "🎉 오늘의 목표 달성!",
    qzCount: (i, n) => `${i} / ${n}번 문제`,
    qzScoreTag: (n) => `정답: ${n}개`,
    qzComboChip: (n) => `🔥 ${n}연속`,
    qzInstrVocabulary: "이 뜻에 맞는 단어는 무엇일까요?",
    qzInstrMeaning: "이 단어의 뜻은 무엇일까요?",
    qzInstrFillblank: "빈칸에 알맞은 단어를 골라요.",
    qzInstrListening: "잘 듣고, 들린 단어를 골라요.",
    qzInstrTyping: "뜻을 읽고 단어를 써 보세요.",
    qzInstrSynonyms: "가장 알맞은 것을 골라요.",
    qzInstrHomophones: "알맞은 뜻을 골라요.",
    qzListenPrompt: "👂 ?",
    qzTypingPlaceholder: "단어를 써 보세요…",
    qzCheckBtn: "확인 🔍",
    qzHintsTitle: "💡 힌트",
    qzHint5050: "❌ 오답 2개 지우기",
    qzHint5050Tip: "힌트: 틀린 보기 2개를 지워요",
    qzHintLetter: "🅰️ 첫 글자 보기",
    qzHintLetterTip: "힌트: 정답의 첫 글자를 알려줘요",
    qzHintNote: "힌트를 쓸 때마다 🌿가 1개 줄어요. 5연속 정답이면 🌿 1개를 돌려받아요!",
    qzEndBtn: "🚩 나가기",
    qzHintStarts: (c) => `“${c}”(으)로 시작해요`,
    qzNoLeaves: "잎사귀가 없어요! 5연속 정답이면 하나를 돌려받아요 🌿",
    qzLeavesAria: (n) => `힌트 잎사귀 ${n}개 남음`,
    qzFbCorrect: "✅ 정답!",
    qzFbWrong: (a) => `❌ 정답은 “${a}”`,
    qzFbTimeUp: (a) => `⏰ 시간 초과! 정답은 “${a}”`,
    qzFbAlmost: "아깝다! 철자를 다시 확인해요.",
    qzMoodGreat: "대단해요! 최고예요! 🌟",
    qzMoodGood: "잘했어요! 계속 가요! 💪",
    qzMoodKeep: "좋은 시도예요! 연습하면 늘어요 🌱",
    qzNoMissed: "하나도 안 틀렸어요! 🎉",
    qzRetryBtn: (n) => `🔁 틀린 단어 다시 풀기 (${n})`,
    qzAgainBtn: "▶ 다시 하기",
    qzSettingsBtn: "⚙️ 설정 바꾸기",
    qzGiftBtn: "🎁 선물 열기",
    qzGiftBtnLabel: "선물 열기",
    qzSeeResults: "결과 보기 🏁",
    qzKoMeaningLabel: "🇰🇷 한국어 뜻",
    qzKoMeaningHide: "뜻 숨기기",
    qzKoMeaningShow: "뜻 보기",
    flashFrontModeLabel: "플래시카드 앞면",
    flashSourceLabel: "플래시카드 출처",
    flashSourceAuto: "🎯 레벨 단어",
    flashSourceMine: "⭐ 나만의 카드",
    flashSourceTitle: "카드 선택",
    flashFrontTitle: "카드 앞면",
    flashIntroNote: "단어를 보고, 카드를 눌러 뒤집은 다음 알고 있는지 알려 주세요!",
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
    flashFrontWord: "📝 단어",
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
    spellingPlaceholder: "들리는 대로 써요",
    spLiveTapHear: "🔊 배를 눌러 들어봐요!",
    spKbToggleAria: "휴대폰 키보드 쓰기",
    spellingStartBtn: "▶ 시작하기",
    spellingContinueBtn: "▶ 이어서 하기",
    spellingBackBtn: "🍃 이전",
    spellingNextBtn: "다음 🌿",
    spellingCheckBtn: "제출 🚀",
    spellingCheckedBtn: "완료 ✅",
    spellingCheckAria: "정답 확인",
    spLiveTyping: "글자를 눌러 봐요! ✏️",
    spLiveAlmost: "거의 다 왔어요! 🔥",
    spListenBtn: "듣기",
    spListenAria: "단어 듣기",
    spellingBackAria: "이전 단어",
    spellingNextAria: "다음 단어",
    spellingBackspaceAria: "마지막 글자 지우기",
    spellingCorrectPrompt: "✅ 정답이에요! Next를 눌러 다음 단어로 넘어가세요.",
    spellingCorrectNoCreditPrompt: "✅ 정답이에요! (이 단어는 이번 라운드에서 이미 한 번 틀려서 점수에는 반영되지 않아요.) Next를 눌러 다음 단어로 넘어가세요.",
    spellingWrongPrompt: "정확한 철자를 입력해야 다음 단어로 넘어갈 수 있어요.",
    spellingEmpty: (lvl) => `${lvl} 레벨에는 아직 스펠링 연습 단어가 없어요. "단어 추가"에서 추가해보세요!`,
    spellingFinishBtn: "🚩 나가기",
    spellingReportTitle: "⭐ 스펠링 리포트",
    spReportNone: "아직 푼 문제가 없어요. 한번 해볼까요?",
    spReportSome: (n) => `${n}개만 다시 보면 돼요 — 할 수 있어요! 💪`,
    flashReportTitle: "⭐ 플래시카드 리포트",
    flReportNone: "아직 평가한 카드가 없어요. 한번 해볼까요?",
    flReportSome: (n) => `${n}개만 다시 보면 돼요 — 할 수 있어요! 💪`,
    flReportPerfect: "우와! 모든 카드를 알고 있었어요! 🎉",
    flReportReview: "다시 공부할 단어 · 탭하면 소리가 나요 🔊",
    flReportKnown: (k, r) => `알고 있어요 ${k} / ${r}`,
    flReportSeen: (n) => `📖 본 카드 ${n}장`,
    flReportRestart: "다시 공부하기",
    spReportLevel: "📚 레벨 바꾸기",
    spReportGame: "⌨️ 타이핑 게임",
    spReportReview: "다시 볼 단어 · 탭하면 소리가 나요 🔊",
    spReportPerfect: "완벽해요! 전부 맞혔어요! 🎉",
    spReportGoodStart: "좋은 시작이에요! 더 해볼까요? 🌟",
    spReportScore: (c, n, p) => (c > 0 ? `${c} / ${n} · ${p}%` : `${c} / ${n}`),
    spReportStreak: (d) => `🔥 ${d}일 연속`,
    spReportStars: (n) => `⭐ +${n}`,
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
    wordlistSelectedChip: (n) => `${n}개 선택됨`,
    wlFilterGroup: "숙달도로 걸러보기",
    wlFilterAll: "전체",
    wlFilterReview: "복습 필요",
    wlFilterMastered: "숙달",
    wlFilterWrong: "틀린 문제",
    wlFilterEmpty: "조건에 맞는 단어가 아직 없어요.",
    hearExampleLabel: "예문 듣기",
    masteryNew: "신규",
    masteryPct: (pct) => `${pct}% 숙달`,
    addWordManualTitle: "➕ 단어 직접 추가하기",
    addModeSingle: "개별 단어 추가",
    addModeBulk: "여러 단어 추가",
    bulkWordsLabel: "단어들 (한 줄에 하나씩, 또는 쉼표로 구분)",
    bulkWordsPlaceholder: "resilient\nmagnificent\ncurious",
    bulkWordsHint: "각 단어의 뜻과 예문을 자동으로 찾아드리고, 알맞은 레벨도 자동으로 추정해드려요.",
    bulkAddSaveBtn: "단어 저장하기",
    bulkAnalyzing: "단어 분석 중...",
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
    ocrDropzoneCaptionMain: "또는 파일을 여기로 끌어다 놓으세요",
    ocrDropzoneCaptionSub: "사진, TXT, PDF, Word, Excel 지원 · 최대 10MB",
    ocrFileTooLarge: "파일이 너무 커요 — 10MB 이하의 파일을 선택해주세요.",
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
    myAddedWordsEmpty: "아직 추가된 단어가 없어요! 위에서 첫 번째 단어를 추가해 보세요",
    loadMoreWords: (n) => `더보기 (${n}개 더)`,
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
    adminModeBadge: "🔑 관리자 모드",
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
    deleteConfirmYesBtn: "🗑️ 삭제하기",
    deleteConfirmNoBtn: "취소",
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
    myAccountMenuItem: "내 계정",
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
    authAdminOfflineErrorText: "지금은 서버에 연결할 수 없어서 관리자 로그인을 할 수 없어요. 잠시 후 다시 시도해 주세요.",
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

// ---- Daily learning streak ----
// Rules and numbers live in koala-core.js (REWARD_CONFIG.streak): a day counts
// once the child has answered enough questions that day, in any mode (merely
// opening the site never counts); one missed day per week is forgiven; a
// longer gap starts a new streak but the best streak is always kept.
function localDateKey(date) {
  return KoalaCore.dateKey(date);
}

// Total answers given today across every mode (from progress.daily, which
// trackActivity() fills in).
function answersToday() {
  const rec = (progress.daily && progress.daily[localDateKey(new Date())]) || {};
  return Object.keys(rec).reduce((sum, mode) => sum + ((rec[mode] && rec[mode][1]) || 0), 0);
}

// Call after the answer has been tracked. Returns true when the streak count
// changed just now.
function bumpDailyStreak() {
  progress.streak = KoalaCore.ensureStreak(progress.streak);
  if (answersToday() < KoalaCore.REWARD_CONFIG.streak.minAnswersPerDay) return false;
  return KoalaCore.advanceStreak(progress.streak, localDateKey(new Date())).changed;
}

// What the streak looks like right now (a streak that can no longer be saved
// reads 0 instead of a stale number).
function currentStreakStatus() {
  return KoalaCore.streakStatus(progress.streak, localDateKey(new Date()), answersToday());
}

function renderStreakChip() {
  if (!streakCountEl) return;
  streakCountEl.textContent = String(currentStreakStatus().count);
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
  scheduleKoalaSummary();
  if (window.__koalaUiReady && !authMenu.hidden) renderAuthMenuKoala();
}

// Learning -> Koala Coins. Every 10 correct answers in a mode earn that mode's
// coins (a few rounds per mode per day). Only a signed-in child earns; a wrong
// answer, or just opening a page, never changes the balance.
function rewardLearning(mode) {
  if (!canUseAccountFeatures()) return;
  const day = localDateKey(new Date());
  const rec = progress.daily && progress.daily[day] && progress.daily[day][mode];
  const paid = KoalaCore.awardLearning(progress, mode, rec ? rec[0] : 0, day);
  paid.forEach((r) => {
    rwToastQueue.push({
      emojiHtml: COIN_SVG, title: rwL(`+${r.n} Koala Coins!`, `+${r.n} 코알라 코인!`),
      name: KOALA_REASON_LABELS()[r.why] || r.why, go: true,
    });
  });
  if (paid.length) { showNextBadgeToast(); checkLevelUp(); }
}

function recordResult(word, isCorrect, mode) {
  const stats = progress.wordStats[word] || { correct: 0, incorrect: 0 };
  if (isCorrect) stats.correct++;
  else stats.incorrect++;
  progress.wordStats[word] = stats;
  trackActivity(word, isCorrect, mode);
  const streakChanged = bumpDailyStreak();
  if (streakChanged) { checkBadges(); announceKoalaUnlocks(); } // streak badges / streak items
  rewardLearning(mode);
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
  return buildQuizPool().length;
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

function updateSpellingStartChips() {
  const lv = document.getElementById("spelling-start-level");
  if (!lv) return;
  lv.textContent = `📚 ${levelLabel(currentLevel)}`;
  lv.setAttribute("aria-label", rwL("Change level", "레벨 바꾸기"));
  // A little scoreboard so there is something to come back for: today's correct
  // spelling answers and the daily streak.
  const stats = document.getElementById("spelling-start-stats");
  if (!stats) return;
  const rec = (progress.daily && progress.daily[localDateKey(new Date())]) || {};
  const today = (rec.spelling && rec.spelling[0]) || 0;
  const streak = currentStreakStatus().count || 0;
  const sb = document.getElementById("spelling-start-btn");
  if (sb) sb.textContent = t(today > 0 ? "spellingContinueBtn" : "spellingStartBtn");
  stats.innerHTML = `<span>⭐ ${rwL(`${today} correct today`, `오늘 ${today}개 정답`)}</span><span>🔥 ${rwL(`${streak}-day streak`, `${streak}일 연속`)}</span>`;
}
document.getElementById("spelling-start-level")?.addEventListener("click", () => document.getElementById("level-badge")?.click());

// The quiz's "Number of Questions" is a dropdown inside the start card (the
// spelling one is still a − / + stepper). It offers 5, 10, 15 ... up to what
// this account's tier and the current category/level can actually supply.
// Signed-out and free accounts also get a final "More questions…" entry when
// the pool holds more than their ceiling; picking it opens the same
// sign-up / upgrade nudge the old "+" button did.
const QUIZ_GOAL_MAX = 100; // the dropdown never offers more than this
function renderQuizGoalSelect(mode = "quiz") {
  const sel = mode === "quiz" ? quizGoalSelect : spellingGoalSelect;
  const roleMax = goalMaxFor();
  // Only a signed-out visitor (ceiling below QUIZ_GOAL_MAX) has anything to
  // unlock; everyone else already reaches the top of the list.
  const hasUpsellAbove = (!currentUser || currentUser.role === "free") && roleMax < QUIZ_GOAL_MAX;
  if (goals[mode] > QUIZ_GOAL_MAX) { goals[mode] = QUIZ_GOAL_MAX; saveGoals(); }
  // Always a clean 5, 10, 15 ... ladder up to the account's ceiling (max 100);
  // a round never runs longer than the pool, startQuizRound clamps it.
  const limit = Math.min(roleMax, QUIZ_GOAL_MAX);
  const values = new Set();
  for (let n = GOAL_MIN; n <= limit; n += GOAL_STEP) values.add(n);
  if (goals[mode] > 0 && goals[mode] % GOAL_STEP === 0 && goals[mode] <= limit) values.add(goals[mode]);
  const sorted = [...values].sort((a, b) => a - b);
  sel.innerHTML = "";
  sorted.forEach((n) => {
    const o = document.createElement("option");
    o.value = String(n);
    o.textContent = t("qzChipQuestions", n);
    sel.appendChild(o);
  });
  if (hasUpsellAbove) {
    const o = document.createElement("option");
    o.value = "more";
    o.textContent = t("qzGoalMore");
    sel.appendChild(o);
  }
  sel.value = String(goals[mode]);
}

function renderGoalStepper(mode) {
  renderQuizGoalSelect(mode);
  if (mode === "spelling") updateSpellingStartChips();
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
// If a phone's speech engine can't produce any sound (common when its default
// engine has no English voice installed), say what to do about it instead of
// leaving the speaker button silently dead. Shown at most once per page load.
let ttsHelpEl = null;
let ttsHelpShown = false;
function showTtsHelp() {
  if (ttsHelpShown || !IS_MOBILE_TTS) return;
  ttsHelpShown = true;
  const el = document.createElement("div");
  el.className = "tts-help";
  el.setAttribute("role", "alert");
  const msg = document.createElement("span");
  msg.textContent = t(/iPhone|iPad|iPod/i.test(navigator.userAgent || "") ? "ttsHelpMsgIos" : "ttsHelpMsg");
  const ok = document.createElement("button");
  ok.type = "button";
  ok.textContent = t("ttsHelpOk");
  ok.addEventListener("click", hideTtsHelp);
  el.append(msg, ok);
  document.body.appendChild(el);
  ttsHelpEl = el;
  setTimeout(hideTtsHelp, 20000);
}
function hideTtsHelp() {
  if (ttsHelpEl) { ttsHelpEl.remove(); ttsHelpEl = null; }
}

let speakCallId = 0; // newest speak() call wins; stale fallback timers from older calls bail out
function speak(text, opts = {}) {
  if (!text) return;
  if (!("speechSynthesis" in window)) {
    if (opts.onend) opts.onend();
    return;
  }
  const synth = window.speechSynthesis;
  const myCallId = ++speakCallId;
  // Chrome/Edge can leave the synthesizer stuck reporting speaking === true
  // forever — after a tab is backgrounded, or a previous utterance errored
  // out silently — which then blocks every later speak() call from doing
  // anything at all. cancel() clears that stuck state before every attempt,
  // not only to interrupt a genuinely in-progress one.
  const wasBusy = synth.speaking || synth.pending;
  synth.cancel();
  // A synthesizer left paused (Android Chrome can do this) swallows every
  // later utterance until it is resumed.
  if (synth.paused) synth.resume();

  const lang = currentSystem().speechLang;

  // Fallback chain for phones, where the "obvious" request is often the one
  // that silently does nothing: (1) a picked voice, with the utterance's
  // language set to that voice's own language (a mismatch such as voice en-US
  // + lang en-AU makes Android TTS stay silent); (2) just the language, no
  // voice; (3) the bare language ("en"). Each step is tried only if the
  // previous one errored or never started.
  const attempts = [
    { voice: true, lang },
    { voice: false, lang },
    { voice: false, lang: lang.split("-")[0] },
  ];
  let attemptIdx = 0;

  const speakNow = () => {
    if (myCallId !== speakCallId) return; // a newer speak() has taken over
    const att = attempts[attemptIdx];
    const utter = new SpeechSynthesisUtterance(text);
    const voice = att.voice ? pickVoice(lang) : null;
    if (voice) utter.voice = voice;
    utter.lang = voice && voice.lang ? voice.lang : att.lang;
    // Slightly brighter pitch/pace to read as a younger adult voice.
    utter.rate = 0.95;
    utter.pitch = 1.08;
    let watchdog = null;
    let startTimer = null;
    let settled = false;
    let started = false;
    const clearTimers = () => {
      if (watchdog) clearInterval(watchdog);
      if (startTimer) clearTimeout(startTimer);
    };
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimers();
      if (opts.onend) opts.onend();
    };
    // Moves on to the next fallback; false when there is none left.
    const retry = () => {
      if (settled || attemptIdx >= attempts.length - 1) return false;
      settled = true;
      clearTimers();
      attemptIdx++;
      try { synth.cancel(); } catch (e) { /* ignore */ }
      setTimeout(speakNow, 60);
      return true;
    };
    utter.onstart = () => {
      started = true;
      hideTtsHelp();
      if (startTimer) clearTimeout(startTimer);
      if (opts.onstart) opts.onstart();
    };
    utter.onend = finish;
    utter.onerror = (e) => {
      // "interrupted"/"canceled" just mean a newer speak() call's cancel()
      // cut this one off — routine, not a real failure worth logging.
      if (e.error === "interrupted" || e.error === "canceled") {
        finish();
        return;
      }
      console.warn("Speech synthesis failed:", e.error);
      if (!retry()) {
        if (myCallId === speakCallId) showTtsHelp();
        finish();
      }
    };
    synth.speak(utter);

    // Phones can accept an utterance and then never start it, with no error
    // event at all. If nothing has started shortly after speak(), try the
    // next fallback (mobile only: desktop network voices can legitimately be
    // slow to start, and a retry there would read the word twice).
    if (IS_MOBILE_TTS) {
      startTimer = setTimeout(() => {
        if (started || settled || myCallId !== speakCallId) return;
        if (!retry()) {
          showTtsHelp();
          finish();
        }
      }, 1800);
    }

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
  // Phones can drop an utterance queued in the same tick as cancel(); when
  // something was actually playing, give the engine a moment to settle first.
  if (IS_MOBILE_TTS && wasBusy) {
    setTimeout(speakNow, 60);
    return;
  }
  speakNow();
}

// Open the site with ?tts (e.g. koalastudymate.com/?tts) to get a sound-check
// screen that shows what the phone's speech engine does. Only loaded on request.
if (/[?&]tts(=|&|$)/.test(location.search)) {
  const ttsDebugScript = document.createElement("script");
  ttsDebugScript.src = "js/tts-debug.js";
  document.body.appendChild(ttsDebugScript);
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
  if (typeof updateFlashCount === "function" && typeof flashDeck !== "undefined") updateFlashCount();
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
  if (typeof renderQuizStart === "function" && quizPhase === "start") renderQuizStart();
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
  if (typeof syncFlashCategorySeg === "function") syncFlashCategorySeg();
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

/* ================= COLOUR THEME (Light / Ivory / Dark) ================= */
// themes.css is generated from style.css (scripts/gen-themes.mjs); the choice
// is stored per device and applied before first paint by a tiny script in <head>.
const THEME_KEY = "ywp_theme_v1";
const THEME_ORDER = ["light", "ivory", "dark"];
const THEME_ICON = { light: "☀️", ivory: "📖", dark: "🌙" };
const THEME_COLOR = { light: "#22c9a3", ivory: "#f4ecd6", dark: "#13211c" };
function currentTheme() {
  const t = document.documentElement.getAttribute("data-theme");
  return THEME_ORDER.includes(t) ? t : "light";
}
function applyTheme(theme) {
  if (theme === "light") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", theme);
  try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* private mode */ }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", THEME_COLOR[theme]);
  const btn = document.getElementById("theme-toggle");
  if (btn) {
    const names = { light: rwL("Light", "밝은 모드"), ivory: rwL("Ivory (soft)", "아이보리 (부드러움)"), dark: rwL("Dark", "다크 모드") };
    btn.textContent = THEME_ICON[theme];
    const label = `${rwL("Colour theme", "화면 테마")}: ${names[theme]}`;
    btn.setAttribute("aria-label", label);
    btn.title = label;
  }
}
document.getElementById("theme-toggle").addEventListener("click", () => {
  applyTheme(THEME_ORDER[(THEME_ORDER.indexOf(currentTheme()) + 1) % THEME_ORDER.length]);
});

/* ================= LANGUAGE TOGGLE ================= */
const langToggleBtn = document.getElementById("lang-toggle");

function switchLanguage(lang) {
  currentLang = lang;
  saveLang(lang);
  currentLevel = savedLevels[lang] || currentSystem_levels_default();
  applyStaticTranslations();
  if (window.__koalaUiReady) { applyTheme(currentTheme()); renderSfxToggles(); }
  updateLevelBadge();
  resetManualForm();
  renderLevelChoices();
  renderTimesTableInstructions();

  if (savedLevels[lang]) {
    populateLevelSelects();
    refreshCurrentView();
    renderCustomWords();
  } else if (!currentUser) {
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
  if (view === "quiz") showQuizStart();
  if (view === "spelling") buildSpellingDeck();
  if (view === "typegame") enterTypeGameTab();
  if (view === "timestable") enterTimesTableTab();
  if (view === "wordlist") renderWordList();
  if (view === "addword") renderCustomWords();
  if (view === "stats") renderStats();
  if (view === "koala") renderKoala();
  if (view === "admincodes") {
    loadAdminCodes();
    loadAdminUsers();
    loadAdminKoala();
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
  if (previousView === "quiz" && view !== "quiz") stopQuizTimer();

  tabButtons.forEach((b) => b.classList.toggle("active", b.dataset.view === view));
  syncTabGroupActiveStates(view);
  views.forEach((v) => v.classList.toggle("active", v.id === `view-${view}`));
  // The persistent nav row (top nav.tabs / bottom .bottom-tabs) is only
  // useful once you're already inside a section — on the landing tile grid
  // itself it would just repeat every menu a second time. See the
  // body.on-landing rules in style.css.
  document.body.classList.toggle("on-landing", view === "landing");
  if (view === "flashcards" && previousView !== "flashcards") showFlashStart();
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

// After a sign-in / page load: pull the server copy of progress (paid/admin),
// then the saved Koala world (every account), then apply any coins an admin
// gave, then report this device's balance.
async function koalaAfterLogin() {
  if (canWriteServerWords()) await syncProgressOnLogin();
  await pullKoalaData();
  await applyKoalaGrants();
  pushKoalaData();
  pushKoalaSummary();
}

// The Koala world follows the account, not the device. Merge, never overwrite,
// so coins earned on two devices are not lost (KoalaCore.mergeRewards).
async function pullKoalaData() {
  if (!currentUser) return;
  try {
    const { data } = await api("/koala/data");
    if (data && KoalaCore.mergeRewards(progress, data)) {
      saveProgress();
      announceKoalaUnlocks();
      const kv = document.getElementById("view-koala");
      if (kv && kv.classList.contains("active")) renderKoala();
      renderStreakChip();
    }
  } catch (e) {
    console.warn("Could not load saved Koala data", e);
  }
}

var koalaDataSent = "";
function pushKoalaData() {
  if (!currentUser || !progress) return Promise.resolve();
  const body = JSON.stringify({ data: KoalaCore.rewardSlice(progress) });
  if (body === koalaDataSent) return Promise.resolve();
  koalaDataSent = body;
  return api("/koala/data", { method: "PUT", body }).catch(() => { koalaDataSent = ""; });
}

// Coins the admin gave or took are waiting on the server. Apply each exactly
// once (the key makes it idempotent), then tell the server they're done.
async function applyKoalaGrants() {
  if (!currentUser) return;
  try {
    const { grants } = await api("/koala/grants");
    if (!grants || !grants.length) return;
    const done = [];
    let gained = 0;
    grants.forEach((g) => {
      const n = KoalaCore.adjustCoins(progress, g.amount, g.amount > 0 ? "adminGift" : "adminAdjust", { key: "grant:" + g.id });
      done.push(g.id); // already-applied keys are fine to confirm as well
      if (n > 0) gained += n;
    });
    saveProgress();
    await api("/koala/grants/ack", { method: "POST", body: JSON.stringify({ ids: done }) });
    if (gained > 0) {
      checkLevelUp();
      rwToastQueue.push({ emoji: "🎁", title: rwL("A gift for you!", "선물이 도착했어요!"), name: rwL(`+${gained} Koala Coins`, `+${gained} 코알라 코인`) });
      showNextBadgeToast();
    }
    const kv = document.getElementById("view-koala");
    if (kv && kv.classList.contains("active")) renderKoala();
  } catch (e) {
    console.warn("Could not apply Koala Coin gifts", e);
  }
}

// Lets the admin see balances. Informational only; debounced and skipped when
// nothing changed.
var koalaSummarySent = "";
var koalaSummaryTimer = null;
function scheduleKoalaSummary() {
  if (!currentUser) return;
  clearTimeout(koalaSummaryTimer);
  koalaSummaryTimer = setTimeout(() => { pushKoalaData(); pushKoalaSummary(); }, 4000);
}
function pushKoalaSummary() {
  if (!currentUser || !progress || !progress.koala) return Promise.resolve();
  const k = KoalaCore.ensureKoala(progress);
  const st = KoalaCore.ensureStreak(progress.streak);
  const body = JSON.stringify({ coins: k.coins, earned: k.earned, streak: st.count, best: st.best });
  if (body === koalaSummarySent) return Promise.resolve();
  koalaSummarySent = body;
  return api("/koala/summary", { method: "POST", body }).catch(() => { koalaSummarySent = ""; });
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
  // The home-screen Admin card follows the same gate: only a server-confirmed
  // admin session ever sees it.
  const homeAdminGroup = document.getElementById("home-admin-group");
  if (homeAdminGroup) homeAdminGroup.hidden = !serverAdmin;
  const koalaView = document.getElementById("view-koala");
  if (koalaView && koalaView.classList.contains("active")) renderKoala();
  // A server-confirmed admin session swaps the usual "👤 username" label for
  // the same ADMIN MODE wording/coloring that used to sit in a separate
  // badge beside this button — one persistent, hard-to-miss marker across
  // the whole app (not just Add Word) instead of two things saying it.
  authToggleBtn.textContent = !currentUser ? t("authHeaderLoginBtn") : serverAdmin ? t("adminModeBadge") : `👤 ${currentUser.username}`;
  // Signed out, the tooltip carries the actual reason to bother — "why
  // would I sign in?" rather than repeating the button's own label back; as
  // admin, it still names the account since the button's own label no
  // longer does.
  authToggleBtn.title = !currentUser ? t("authToggleLoggedOutHint") : serverAdmin ? `${currentUser.username} · ${t("myAccountMenuItem")}` : t("myAccountMenuItem");
  authToggleBtn.classList.toggle("auth-toggle-active", !!currentUser && !serverAdmin);
  authToggleBtn.classList.toggle("auth-toggle-admin", !!serverAdmin);
  // Signed in: level picker + streak live in the account popover instead.
  document.body.classList.toggle("signed-in", !!currentUser);
  if (currentUser) levelOverlay.hidden = true;
  if (typeof renderStreakChip === "function") renderStreakChip();
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
  // Save the Koala world one last time while the session can still write it.
  if (currentUser) {
    clearTimeout(koalaSummaryTimer);
    await pushKoalaData();
    await pushKoalaSummary();
  }
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
  // A free account keeps its word stats on this device, but its Koala world
  // (coins, items, streak, badges) is safe on the server — drop it here so it
  // can't carry over to whoever signs in next. It returns on the next sign-in.
  if (!wasSyncable) {
    delete progress.koala; delete progress.streak; delete progress.badges;
    koalaDataSent = ""; koalaSummarySent = "";
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); } catch (e) { /* ignore */ }
  }
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

// The signed-in popover: the child's Koala, level, coins, badges, streak and
// the year-level picker, above My Account / Log Out. Opens on hover (mouse),
// tap or keyboard focus; clicking the Koala opens My Koala.
const authMenuKoalaEl = document.getElementById("auth-menu-koala");
function renderAuthMenuKoala() {
  if (!authMenuKoalaEl) return;
  if (!currentUser) { authMenuKoalaEl.innerHTML = ""; return; }
  ensureRewardData();
  const k = KoalaCore.ensureKoala(progress);
  const lv = KoalaCore.levelInfo(k.earned);
  const st = currentStreakStatus();
  const cat = buildBadgeCatalog();
  const badges = cat.filter((b) => progress.badges[b.id]).length;
  authMenuKoalaEl.innerHTML = `<button type="button" class="auth-koala-avatar" data-koala-go="koala" aria-label="${rwL("Open My Koala", "나의 코알라 열기")}">
      <span class="auth-koala-pic" aria-hidden="true">${KoalaArt.avatar(k.items.equipped, { view: "head" })}</span>
      <span class="auth-koala-lv">${rwL(`Lv. ${lv.level}`, `Lv. ${lv.level}`)}</span>
      <span class="koala-level-bar" aria-hidden="true"><span style="width:${lv.pct}%"></span></span></button>
    <div class="auth-koala-chips">
      <span class="home-chip" title="${rwL("Koala Coins", "코알라 코인")}">${COIN_SVG} ${serverAdmin ? "∞" : k.coins}</span>
      <span class="home-chip" title="${rwL("Badges", "배지")}">🏆 ${badges}/${cat.length}</span>
      <span class="home-chip" title="${rwL("Day streak", "연속 학습")}">🔥 ${rwL(`${st.count} day${st.count === 1 ? "" : "s"}`, `${st.count}일 연속`)}</span>
    </div>
    <label class="auth-koala-level"><span>${t("levelBadgePrefix")}</span>
      <select id="auth-menu-level-select" aria-label="${t("levelBadgePrefix")}">${currentSystem().levels.map((lv) => `<option value="${escapeHtml(lv.id)}"${lv.id === currentLevel ? " selected" : ""}>${escapeHtml(lv.label)}</option>`).join("")}</select></label>`;
}

let authMenuPinned = false;
let authMenuCloseTimer = null;
function openAuthMenu(byHover) {
  clearTimeout(authMenuCloseTimer);
  authMenuPinned = !byHover;
  renderAuthMenuKoala();
  authMenu.hidden = false;
}
function scheduleAuthMenuClose() {
  clearTimeout(authMenuCloseTimer);
  authMenuCloseTimer = setTimeout(() => { if (!authMenuPinned) closeAuthMenu(); }, 220);
}
const authWrap = authToggleBtn.closest(".auth-toggle-wrap");
authWrap.addEventListener("pointerenter", (e) => {
  if (e.pointerType === "mouse" && currentUser && authMenu.hidden) openAuthMenu(true);
  else clearTimeout(authMenuCloseTimer);
});
authWrap.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") scheduleAuthMenuClose(); });

authToggleBtn.addEventListener("click", () => {
  if (!currentUser) { openAuthOverlay("login"); return; }
  if (authMenu.hidden) openAuthMenu(false);
  else if (!authMenuPinned) authMenuPinned = true; // opened by hover: a click keeps it open
  else closeAuthMenu();
});
authMenu.addEventListener("click", (e) => {
  if (e.target.closest("[data-koala-go]")) closeAuthMenu();
});
// While the year dropdown is in use the popup must not close under it.
authMenu.addEventListener("pointerdown", (e) => { if (e.target.closest("select")) authMenuPinned = true; });
authMenu.addEventListener("focusin", (e) => { if (e.target.closest("select")) authMenuPinned = true; });
// The native list can't be styled or detected from CSS, so track open/closed
// ourselves to flip the chevron (down when closed, up while the list is open).
authMenu.addEventListener("mousedown", (e) => { if (e.target.id === "auth-menu-level-select") e.target.classList.toggle("is-open"); });
authMenu.addEventListener("keydown", (e) => {
  if (e.target.id !== "auth-menu-level-select") return;
  if (e.key === "Escape") e.target.classList.remove("is-open");
  else if (e.key === "Enter" || e.key === " " || (e.altKey && e.key === "ArrowDown")) e.target.classList.add("is-open");
});
authMenu.addEventListener("focusout", (e) => { if (e.target.id === "auth-menu-level-select") e.target.classList.remove("is-open"); });
authMenu.addEventListener("change", (e) => {
  if (e.target.id === "auth-menu-level-select") e.target.classList.remove("is-open");
  if (e.target.id === "auth-menu-level-select") { applyLevel(e.target.value); closeAuthMenu(); }
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !authMenu.hidden) closeAuthMenu(); });

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

  // Admin login is checked by the server only now — there is no local
  // fallback. If the server couldn't be reached at all (not a plain wrong
  // password) and this was an attempt at the admin username, say so
  // explicitly instead of the generic "wrong password" message, since the
  // real reason is connectivity, not the credentials.
  if (!currentUser && !isAdmin) {
    loginError.textContent =
      username === ADMIN_USERNAME && !serverRejected ? t("authAdminOfflineErrorText") : t("authLoginErrorText");
    loginError.hidden = false;
    return;
  }

  if (isAdmin) sessionStorage.setItem(ADMIN_KEY, "1");
  closeAuthOverlay();
  updateAdminUI();
  renderUpgradeReadyBanner();
  if (currentUser) refreshSharedWords();
  koalaAfterLogin();
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
    koalaAfterLogin();
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
  koalaAfterLogin();
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
  // The "Choose your level" picker is for signed-out visitors only; a signed-in
  // child changes year level from the account popup instead.
  if (!currentUser && !savedLevels[currentLang]) {
    levelOverlayCloseBtn.hidden = false;
    levelOverlay.hidden = false;
  }
  koalaAfterLogin();
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

// Start screen / practice screen (same pattern as Quiz and Spelling).
const flashStartScreen = document.getElementById("flash-start-screen");
const flashPractice = document.getElementById("flash-practice");
const flashReport = document.getElementById("flash-report");
// What happened this round: cards seen, cards rated "know", cards rated "still learning".
const flashSession = { seen: new Set(), known: new Set(), still: new Map() };
function resetFlashSession() { flashSession.seen.clear(); flashSession.known.clear(); flashSession.still.clear(); }
function showFlashStart() {
  flashReport.hidden = true;
  flashStartScreen.hidden = false;
  flashPractice.hidden = true;
}
function startFlashPlay() {
  resetFlashSession();
  flashReport.hidden = true;
  flashStartScreen.hidden = true;
  flashPractice.hidden = false;
  renderFlashcard();
}
function renderFlashReport() {
  flashPractice.hidden = true;
  flashStartScreen.hidden = true;
  flashReport.hidden = false;
  const known = flashSession.known.size, still = Array.from(flashSession.still.values());
  const rated = known + still.length;
  const state = rated === 0 ? "none" : still.length ? "some" : "perfect";
  flashReport.dataset.state = state;
  flashReport.classList.toggle("sr-big", state === "perfect" && rated >= 5);
  document.getElementById("flash-report-msg").textContent = state === "none" ? t("flReportNone") : state === "some" ? t("flReportSome", still.length) : t("flReportPerfect");
  const star = document.getElementById("flash-report-star");
  star.hidden = known <= 0;
  star.textContent = t("spReportStars", known);
  document.getElementById("flash-report-score").textContent = t("flReportKnown", known, rated);
  const seenEl = document.getElementById("flash-report-pct");
  seenEl.hidden = flashSession.seen.size === 0;
  seenEl.textContent = t("flReportSeen", flashSession.seen.size);
  document.getElementById("flash-report-fl").innerHTML = state === "perfect" ? ["⭐", "✨", "💚", "⭐", "✨", "💛"].map((c, i) => `<span class="sr-fl" style="--i:${i}">${c}</span>`).join("") : "";
  const rv = document.getElementById("flash-report-review");
  rv.hidden = !still.length;
  rv.textContent = t("flReportReview");
  const koalaEl = document.getElementById("flash-report-koala");
  if (!koalaEl.firstChild) koalaEl.innerHTML = SPELL_KOALA_SVG;
  koalaEl.classList.toggle("sp-cheer", state === "perfect" || (state === "some" && known > 0));
  const list = document.getElementById("flash-report-list");
  list.innerHTML = "";
  still.forEach((w) => {
    const row = document.createElement("div");
    row.className = "wordlist-item sp-report-row";
    const left = document.createElement("div");
    left.className = "wordlist-item-main";
    const we = document.createElement("div");
    we.className = "w speakable-line";
    we.textContent = w.word;
    left.appendChild(we);
    if (w.definition) { const d = document.createElement("div"); d.className = "d"; d.textContent = w.definition; left.appendChild(d); }
    row.appendChild(left);
    row.addEventListener("click", () => speak(w.word));
    list.appendChild(row);
  });
}
document.getElementById("flash-start-btn").addEventListener("click", startFlashPlay);
document.getElementById("flash-end").addEventListener("click", renderFlashReport);
document.getElementById("flash-report-restart").addEventListener("click", showFlashStart);
document.getElementById("flash-report-level")?.addEventListener("click", () => document.getElementById("level-badge")?.click());
document.getElementById("flash-report-game")?.addEventListener("click", () => goToTab("typegame"));

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
  // "My cards" is a paid feature: show a lock up front instead of surprising
  // free users with the upgrade prompt after they tap it.
  flashSourceMineBtn.classList.toggle("is-locked", !canUsePaidFeatures());
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
  if (typeof syncFlashCategorySeg === "function") syncFlashCategorySeg();
  myDeckCard.hidden = !flashUseMine;
  syncFlashSourceSwitches();
  if (flashUseMine) renderMyDeck();
  updateFlashCount();
  renderFlashcard();
}
function updateFlashCount() {
  const el = document.getElementById("flash-count");
  const startBtn = document.getElementById("flash-start-btn");
  const n = flashDeck.length;
  if (el) {
    // Say which level the cards come from ("Year 4 · 1009 cards ready"); with
    // nothing to study, explain why Start is off instead of hiding the line.
    const lvl = n && flashUseLevel && !flashWrongOverride ? levelLabel(currentLevel) : "";
    el.textContent = n ? (lvl ? `${lvl} · ` : "") + t("fsCount", n) : t("fsEmpty");
    el.classList.toggle("is-empty", n === 0);
    el.hidden = false;
  }
  if (startBtn) startBtn.disabled = n === 0;
  syncFlashPreviewFront();
}
// The demo card on the start screen shows what the chosen "Card front" looks
// like: the word first (default) or the meaning first.
function syncFlashPreviewFront() {
  const scene = document.querySelector("#flash-start-screen .fs-scene");
  if (scene) scene.dataset.front = flashFrontModeSel.value === "meaning" ? "meaning" : "word";
}

// Keeps the word on one line and never overlapping the speaker button. It
// starts at the stylesheet's size (36px+); a longer word first shrinks (down to
// 28px) to stay beside the speaker, and only if it still doesn't fit does the
// speaker drop under it (class "stacked") with the word fitted to the full card
// width. So a word is never cut mid-letter or hidden behind the button. The
// ResizeObserver below re-runs this once a hidden view is shown or resized.
function fitFlashWord() {
  const el = flashWordEl;
  const row = el.parentElement;
  el.style.fontSize = "";
  row.classList.remove("stacked");
  if (flashcardEl.classList.contains("front-meaning")) return;
  const face = el.closest(".flashcard-face");
  if (!face || !face.clientWidth) return;
  const face_cs = getComputedStyle(face);
  const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
  const inner = face.clientWidth - parseFloat(face_cs.paddingLeft) - parseFloat(face_cs.paddingRight);
  const shrinkTo = (limit, floor) => {
    let size = parseFloat(getComputedStyle(el).fontSize);
    while (el.scrollWidth > limit && size > floor) {
      size -= 1;
      el.style.fontSize = size + "px";
    }
    return el.scrollWidth <= limit;
  };
  if (shrinkTo(inner - flashSpeakBtn.offsetWidth - gap, 28)) return;
  row.classList.add("stacked");
  el.style.fontSize = "";
  shrinkTo(inner, 22);
}
if (typeof ResizeObserver !== "undefined") {
  new ResizeObserver(() => fitFlashWord()).observe(flashcardEl);
}

function renderFlashcard() {
  flashcardEl.classList.remove("flipped");
  { const bt = document.querySelector("#flash-bubble .bubble-text"); if (bt) bt.textContent = t("fkIdle"); }
  if (flashDeck.length === 0) {
    flashPrevBtn.disabled = true;
    flashcardEl.classList.remove("front-meaning");
    flashWordEl.textContent = usingMyDeck() ? t("myDeckEmptyCard") : t("flashEmptyWord");
    flashDefEl.textContent = usingMyDeck() ? t("myDeckEmptyHint") : t("flashEmptyDef", levelLabel(currentLevel));
    flashExampleEl.textContent = "";
    const fpl0 = document.getElementById("flash-progress-label");
    if (fpl0) fpl0.textContent = "";
    fitFlashWord();
    return;
  }
  const item = flashDeck[flashIndex];
  flashPrevBtn.disabled = flashIndex === 0;
  flashSession.seen.add(item.word);
  const fpl = document.getElementById("flash-progress-label"), fpf = document.getElementById("flash-progress-fill");
  if (fpl && fpf) { fpl.textContent = `${flashIndex + 1} / ${flashDeck.length}`; fpf.style.width = `${((flashIndex + 1) / flashDeck.length) * 100}%`; }
  const meaningFirst = flashFrontModeSel.value === "meaning";
  flashcardEl.classList.toggle("front-meaning", meaningFirst);
  // The front/back DOM slots (and their speak-on-tap handlers) always read
  // whatever text is currently shown in them, so swapping which field goes
  // where here is all that's needed to support both front-side modes.
  flashWordEl.textContent = meaningFirst ? item.definition : item.word;
  flashDefEl.textContent = meaningFirst ? item.word : item.definition;
  flashExampleEl.textContent = item.example;
  fitFlashWord();
}

// ---- Koala helper above the card: reacts to flip / next / back / know ----
const flashScene = document.getElementById("flash-scene");
const flashBubble = document.getElementById("flash-bubble");
const flashStageEl = document.getElementById("flashcard-stage");
let flashSceneTimer = null;
const FK_CLASSES = ["fk-flip", "fk-next", "fk-prev", "fk-know", "fk-dunno"];
FK_CLASSES.push("fk-hear", "fk-sad");
// ---- Flashcards speech bubble: a clean outlined rounded-rectangle bubble ----
// One continuous rounded outline (gradient stroke) with a short tail at the bottom-left
// that points down-left toward the koala's head. Redrawn whenever the text (and so the
// bubble's size) changes, and once a hidden view is shown.
function drawBubbleOutline(bubble) {
  const svg = bubble && bubble.querySelector(".fk-bubble-bg");
  if (!svg) return;
  const w = bubble.offsetWidth;
  const h = bubble.offsetHeight;
  if (!w || !h) return; // view hidden — the ResizeObserver redraws once it shows
  const f = (n) => Math.round(n * 10) / 10;
  const r = Math.max(10, Math.min(16, h * 0.32));
  let d, tip = 0, pad = 0;
  if (bubble.dataset.tail === "left") {
    // Tail sticks out of the left edge and ends exactly on the koala's mouth
    // (58% across the koala wrap the bubble sits in).
    const wrap = bubble.offsetParent;
    const len = Math.max(14, wrap ? bubble.offsetLeft - wrap.offsetWidth * 0.58 + 3 : 24);
    const rr = Math.min(r, 9);
    const cy = h / 2, hw = Math.min(8, (h - 2 * rr) / 2 - 1);
    pad = len;
    d = `M ${rr} 0 H ${f(w - rr)} A ${rr} ${rr} 0 0 1 ${w} ${rr} V ${f(h - rr)} A ${rr} ${rr} 0 0 1 ${f(w - rr)} ${h} ` +
        `H ${rr} A ${rr} ${rr} 0 0 1 0 ${f(h - rr)} V ${f(cy + hw)} L ${f(-len)} ${f(cy)} L 0 ${f(cy - hw)} V ${rr} A ${rr} ${rr} 0 0 1 ${rr} 0 Z`;
  } else {
    const tx = 20; // where the tail meets the bottom edge
    tip = 12; // how far the tail drops below the bubble
    d = `M ${r} 0 H ${f(w - r)} A ${r} ${r} 0 0 1 ${w} ${r} V ${f(h - r)} A ${r} ${r} 0 0 1 ${f(w - r)} ${h} ` +
        `H ${tx + r} L -2 ${h + tip} L 0 ${f(h - 9)} V ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`;
  }
  svg.setAttribute("width", w + pad);
  svg.setAttribute("height", h + tip);
  svg.setAttribute("viewBox", `${-pad} 0 ${w + pad} ${h + tip}`);
  svg.style.left = pad ? `${-pad}px` : "";
  svg.innerHTML =
    `<defs><linearGradient id="fk-stroke-${bubble.id}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="${h + tip}">` +
    `<stop class="bb-stop-top" offset="0"/><stop class="bb-stop-bottom" offset="1"/></linearGradient></defs>` +
    `<path class="bb-body" stroke="url(#fk-stroke-${bubble.id})" d="${d}"/>`;
}
function drawFlashBubble() { drawBubbleOutline(flashBubble); }
if (flashBubble && typeof ResizeObserver !== "undefined") {
  new ResizeObserver(() => drawFlashBubble()).observe(flashBubble);
}
if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawFlashBubble);
drawFlashBubble();

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
  }, kind === "sad" ? 2800 : 1700);
}
function slideFlashStage(dir) {
  return; // no card slide motion — the edge arrows just swap the card
  flashStageEl.classList.remove("slide-next", "slide-prev");
  void flashStageEl.offsetWidth;
  flashStageEl.classList.add(dir === "prev" ? "slide-prev" : "slide-next");
}
function flipFlashcard() {
  flashcardEl.classList.toggle("flipped");
  koalaReact("flip", "fkFlip", flashScene, flashBubble, flashcardEl.classList.contains("flipped") ? "fkIdleBack" : "fkIdle");
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
  flashSession.known.add(word); flashSession.still.delete(word);
  recordResult(word, true, "flash");
  pulseScoreTag(flashKnowBtn, "flash-know-bounce");
  nextFlashcard();
  koalaReact("know", "fkKnow");
});

flashDontKnowBtn.addEventListener("click", () => {
  if (flashDeck.length === 0) return;
  const word = flashDeck[flashIndex].word;
  delete progress.flashKnown[word];
  flashSession.known.delete(word); flashSession.still.set(word, flashDeck[flashIndex]);
  recordResult(word, false, "flash");
  nextFlashcard();
  koalaReact("dunno", "fkDunno");
});

flashCategorySel.addEventListener("change", buildFlashDeck);
// Category picker as buttons (the hidden <select> stays the source of truth)
const FLASH_CAT_ICONS = { vocabulary: "📚", synonyms: "🤝", antonyms: "↔️" };
const flashCategorySeg = document.getElementById("flash-category-seg");
function syncFlashCategorySeg() {
  if (!flashCategorySeg) return;
  flashCategorySeg.textContent = "";
  Array.from(flashCategorySel.options).forEach((opt) => {
    if (opt.hidden) return;
    const b = document.createElement("button");
    const on = opt.value === flashCategorySel.value;
    b.type = "button";
    b.className = "qz-seg-btn" + (on ? " on" : "");
    b.setAttribute("role", "radio");
    b.setAttribute("aria-checked", on ? "true" : "false");
    b.disabled = flashCategorySel.disabled;
    // Icon and label are separate so phones can drop the icon (3 chips on one row).
    const ico = document.createElement("span");
    ico.className = "fs-seg-ico";
    ico.setAttribute("aria-hidden", "true");
    ico.textContent = FLASH_CAT_ICONS[opt.value] || "";
    const txt = document.createElement("span");
    txt.className = "fs-seg-txt";
    txt.textContent = opt.textContent.trim();
    b.append(ico, txt);
    b.addEventListener("click", () => {
      flashCategorySel.value = opt.value;
      flashCategorySel.dispatchEvent(new Event("change"));
    });
    flashCategorySeg.appendChild(b);
  });
}
flashCategorySel.addEventListener("change", syncFlashCategorySeg);
syncFlashCategorySeg();
flashFrontModeSel.addEventListener("change", renderFlashcard);
flashFrontModeSel.addEventListener("change", syncFlashPreviewFront);
// While the settings are open the demo card and "Look › Flip" steps step aside
// (see .is-settings-open in style.css) so Start stays on screen.
const flashSettingsDetails = document.getElementById("flash-settings");
if (flashSettingsDetails) {
  flashSettingsDetails.addEventListener("toggle", () => {
    document.getElementById("flash-start-screen").classList.toggle("is-settings-open", flashSettingsDetails.open);
  });
}
// The collapsed "⚙️" row always shows the current choices, e.g. "📚 Vocabulary · 📝 Word · 🎯 Level words".
const flashSettingsBody = document.getElementById("flash-settings-body");
function updateFlashSettingsNow() {
  const now = document.getElementById("flash-settings-now");
  if (!flashSettingsBody || !now) return;
  now.textContent = Array.from(flashSettingsBody.querySelectorAll(".qz-seg-btn.on")).map((b) => b.textContent.replace(/^[^\p{L}\p{N}]+/u, "").trim()).join(" · ");
}
if (flashSettingsBody) {
  new MutationObserver(updateFlashSettingsNow).observe(flashSettingsBody, { subtree: true, childList: true, attributes: true, attributeFilter: ["class"] });
  updateFlashSettingsNow();
}
function setFlashFrontSeg(mode) {
  document.querySelectorAll("#flash-front-seg [data-front]").forEach((b) => {
    const on = b.dataset.front === mode;
    b.classList.toggle("on", on);
    b.setAttribute("aria-checked", on ? "true" : "false");
  });
}
document.querySelectorAll("#flash-front-seg [data-front]").forEach((btn) => {
  btn.addEventListener("click", () => {
    flashFrontModeSel.value = btn.dataset.front;
    setFlashFrontSeg(btn.dataset.front);
    flashFrontModeSel.dispatchEvent(new Event("change"));
  });
});

// Remember the last Category and Card front on this device, so kids who always
// study meaning-first do not have to switch it every visit. ("Cards from" is not
// stored: My cards is paid, and the login state is not known yet at load.)
const FLASH_PREFS_KEY = "ksm_flash_prefs_v1";
function saveFlashPrefs() {
  try { localStorage.setItem(FLASH_PREFS_KEY, JSON.stringify({ category: flashCategorySel.value, front: flashFrontModeSel.value })); } catch (e) { /* storage unavailable */ }
}
flashCategorySel.addEventListener("change", saveFlashPrefs);
flashFrontModeSel.addEventListener("change", saveFlashPrefs);
(function restoreFlashPrefs() {
  let prefs = null;
  try { prefs = JSON.parse(localStorage.getItem(FLASH_PREFS_KEY) || "null"); } catch (e) { /* ignore */ }
  if (!prefs) return;
  if (Array.from(flashCategorySel.options).some((o) => o.value === prefs.category && !o.hidden)) flashCategorySel.value = prefs.category;
  if (prefs.front === "word" || prefs.front === "meaning") {
    flashFrontModeSel.value = prefs.front;
    setFlashFrontSeg(prefs.front);
  }
  syncFlashCategorySeg();
  syncFlashPreviewFront();
})();
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
const quizEndBtn = document.getElementById("quiz-end");
const quizGoalSelect = document.getElementById("quiz-goal-select");

// A styled stand-in for a <select>: a centred pill that opens a left-aligned
// list showing `maxRows` rows and scrolling beyond that (a native popup can't
// be sized or aligned from CSS). The real <select> stays in the DOM, hidden,
// as the single source of truth: choosing an entry sets its value and fires
// "change", and the pill's text follows whatever the <select> currently holds.
let openDropdown = null;
function enhanceSelect(sel, maxRows) {
  const wrap = document.createElement("div");
  wrap.className = "qz-dd";
  wrap.style.setProperty("--rows", String(maxRows));
  sel.before(wrap);
  wrap.appendChild(sel);
  sel.classList.add("qz-dd-native");
  sel.tabIndex = -1;
  sel.setAttribute("aria-hidden", "true");

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "qz-dd-btn";
  btn.setAttribute("aria-haspopup", "listbox");
  btn.setAttribute("aria-expanded", "false");
  const list = document.createElement("div");
  list.className = "qz-dd-list";
  list.setAttribute("role", "listbox");
  list.hidden = true;
  wrap.append(btn, list);

  let active = -1;
  const opts = () => Array.from(sel.options);
  const sync = () => {
    const o = sel.selectedOptions[0];
    btn.textContent = o ? o.textContent : "";
    const label = sel.getAttribute("aria-label");
    if (label) btn.setAttribute("aria-label", label);
  };
  const highlight = (i, noScroll) => {
    const items = list.children;
    if (!items.length) return;
    active = Math.max(0, Math.min(items.length - 1, i));
    Array.from(items).forEach((el, k) => el.classList.toggle("is-active", k === active));
    if (!noScroll) items[active].scrollIntoView({ block: "nearest" });
  };
  const close = () => {
    if (list.hidden) return;
    list.hidden = true;
    btn.setAttribute("aria-expanded", "false");
    if (openDropdown === close) openDropdown = null;
  };
  const choose = (i) => {
    const o = opts()[i];
    close();
    if (!o) return;
    const changed = sel.value !== o.value;
    sel.value = o.value;
    sync();
    if (changed || o.value === "more") sel.dispatchEvent(new Event("change", { bubbles: true }));
    btn.focus({ preventScroll: true });
  };
  const open = () => {
    if (!list.hidden) return;
    if (openDropdown) openDropdown();
    list.innerHTML = "";
    opts().forEach((o, i) => {
      const item = document.createElement("div");
      item.className = "qz-dd-opt" + (o.selected ? " is-selected" : "");
      item.setAttribute("role", "option");
      item.setAttribute("aria-selected", o.selected ? "true" : "false");
      item.textContent = o.textContent;
      item.addEventListener("pointerdown", (e) => e.preventDefault()); // keep focus on the pill
      item.addEventListener("click", () => choose(i));
      list.appendChild(item);
    });
    list.hidden = false;
    btn.setAttribute("aria-expanded", "true");
    openDropdown = close;
    list.scrollTop = 0; // always open showing the first rows
    highlight(opts().findIndex((o) => o.selected), true);
  };

  btn.addEventListener("click", () => (list.hidden ? open() : close()));
  btn.addEventListener("keydown", (e) => {
    if (list.hidden) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); open(); }
      return;
    }
    if (e.key === "ArrowDown") { e.preventDefault(); highlight(active + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); highlight(active - 1); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(active); }
    else if (e.key === "Escape" || e.key === "Tab") { if (e.key === "Escape") e.preventDefault(); close(); }
  });
  btn.addEventListener("blur", () => setTimeout(close, 120));
  new MutationObserver(sync).observe(sel, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["aria-label"] });
  sel.addEventListener("change", sync);
  sync();
  return sync;
}
document.addEventListener("pointerdown", (e) => {
  if (openDropdown && !e.target.closest(".qz-dd")) openDropdown();
});
const syncQuizCategoryDd = enhanceSelect(quizCategorySel, 6);
const syncQuizGoalDd = enhanceSelect(quizGoalSelect, 6); // 6 rows = 5 ... 30, then scroll
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

const MIN_POOL_FOR_QUIZ = QuizCore.MIN_CHOICES;

/* The Quiz has three screens: a start screen (pick difficulty and mode), the
   round itself, and a result screen. The question types are merged into the
   Category menu; building them, the hints and the typed-answer check all live
   in quiz-core.js. */
const QUIZ_PREFS_KEY = "ywp_quiz_prefs_v1";
const QUIZ_KO_MEANING_KEY = "ywp_quiz_ko_meaning_v1";
const QUIZ_RESULT_MISSED_SHOWN = 5;

const quizStartScreen = document.getElementById("quiz-start-screen");
const quizPractice = document.getElementById("quiz-practice");
const quizResultEl = document.getElementById("quiz-result");
const quizStartBtn = document.getElementById("quiz-start-btn");
const quizLevelSeg = document.getElementById("quiz-level-seg");
const quizModeSeg = document.getElementById("quiz-mode-seg");
const quizModeNote = document.getElementById("quiz-mode-note");
const quizStartDaily = { textContent: "", classList: { toggle() {} } }; // daily line removed from the start screen
const quizStartWarn = document.getElementById("quiz-start-warn");
const quizCountEl = document.getElementById("quiz-count");
const quizComboChip = document.getElementById("quiz-combo");
const quizTimerEl = document.getElementById("quiz-timer");
const quizTimerFill = document.getElementById("quiz-timer-fill");
const quizTimerText = document.getElementById("quiz-timer-text");
const quizInstructionEl = document.getElementById("quiz-instruction");
const quizSpeakBtn = document.getElementById("quiz-speak");
const quizSpeakWrap = document.getElementById("quiz-speak-wrap");
const quizTypingBox = document.getElementById("quiz-typing");
const quizTypingInput = document.getElementById("quiz-typing-input");
const quizTypingCheck = document.getElementById("quiz-typing-check");
const quizTypingPattern = document.getElementById("quiz-typing-pattern");
const quizLeavesEl = document.getElementById("quiz-leaves");
const quizHint5050Btn = document.getElementById("quiz-hint-5050");
const quizHintLetterBtn = document.getElementById("quiz-hint-letter");
const quizHintTextEl = document.getElementById("quiz-hint-text");
const quizFeedbackEl = document.getElementById("quiz-feedback");

let quizPhase = "start"; // "start" | "play" | "result"
let quizMode = loadQuizMode(); // "relaxed" | "time"
let quizQuestions = [];
let quizIndex = 0;
let quizScore = 0;
let quizCombo = 0; // consecutive right answers (see comboAfterAnswer)
let quizBestCombo = 0;
let spellingCombo = 0;
let quizAnswered = false;
let quizIsRetry = false;
let quizEndedEarly = false; // ended with the End button before the last question
let quizMissed = [];
let quizLeaves = QuizCore.LEAVES_START;
let quizHints = { fifty: false, letter: false, letterText: "" };
let quizTimer = null;
let quizQuestionShownAt = 0;
let quizActiveMs = 0;
let quizCoinsBefore = 0;
let quizKoMeaningShown = loadQuizKoMeaning();
let quizHideMainSpeak = false; // true when the current prompt is Korean text with nothing to read aloud

function loadQuizMode() {
  try {
    return JSON.parse(localStorage.getItem(QUIZ_PREFS_KEY) || "{}").mode === "time" ? "time" : "relaxed";
  } catch (e) { return "relaxed"; }
}
function saveQuizMode() {
  try { localStorage.setItem(QUIZ_PREFS_KEY, JSON.stringify({ mode: quizMode })); } catch (e) { /* private mode */ }
}
function loadQuizKoMeaning() {
  try { return localStorage.getItem(QUIZ_KO_MEANING_KEY) !== "0"; } catch (e) { return true; }
}
function saveQuizKoMeaning() {
  try { localStorage.setItem(QUIZ_KO_MEANING_KEY, quizKoMeaningShown ? "1" : "0"); } catch (e) { /* private mode */ }
}

// Every question the current category and level can make (one per word, so a
// word can never be asked twice in a round).
function buildQuizPool() {
  return QuizCore.buildQuestions(
    quizCategorySel.value,
    { vocab: getVocabPool(currentLevel), synonyms: getSynonymPool(currentLevel), homophones: getHomophonePool(currentLevel) },
    { shuffle, prompts: { synonym: (w) => t("quizSynonymPrompt", w), homophone: (w) => t("quizHomophonePrompt", w) } }
  );
}

const quizEarnedCoins = () => (progress.koala && progress.koala.earned) || 0;

/* ---------- Start screen ---------- */
function showQuizStart() {
  stopQuizTimer();
  quizPhase = "start";
  quizGoalBanner.hidden = true;
  quizGoalCelebrated = false;
  quizStartScreen.hidden = false;
  quizPractice.hidden = true;
  quizResultEl.hidden = true;
  renderQuizStart();
}

function renderQuizStart() {
  // Difficulty = the level (Year 4 ... / the Korean school grades). It is the
  // same level the header badge shows, so the two always agree.
  quizLevelSeg.innerHTML = "";
  currentSystem().levels.forEach((lv) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "qz-seg-btn" + (lv.id === currentLevel ? " active" : "");
    btn.setAttribute("role", "radio");
    btn.setAttribute("aria-checked", String(lv.id === currentLevel));
    btn.textContent = lv.label;
    btn.addEventListener("click", () => { if (lv.id !== currentLevel) applyLevel(lv.id); });
    quizLevelSeg.appendChild(btn);
  });

  quizModeSeg.querySelectorAll(".qz-seg-btn").forEach((b) => {
    const on = b.dataset.mode === quizMode;
    b.classList.toggle("active", on);
    b.setAttribute("aria-checked", String(on));
  });
  quizModeNote.textContent = quizMode === "time"
    ? t("qzModeNoteTime", QuizCore.TIME_LIMITS_SEC.choice, QuizCore.TIME_LIMITS_SEC.typing)
    : t("qzModeNoteRelaxed");

  renderQuizGoalSelect();
  syncQuizCategoryDd();
  syncQuizGoalDd();

  const daily = QuizCore.dailyGoalState(answersToday());
  quizStartDaily.textContent = daily.done ? t("qzDailyDone") : t("qzDailyLine", daily.have, daily.goal);
  quizStartDaily.classList.toggle("is-done", daily.done);

  const poolSize = buildQuizPool().length;
  quizStartWarn.hidden = poolSize > 0;
  quizStartWarn.textContent = poolSize > 0 ? "" : t("quizNotEnough", levelLabel(currentLevel));
  quizStartBtn.disabled = poolSize === 0;
}

/* ---------- Starting a round ---------- */
// Settings changed (category, number of questions, level): mid-round that
// restarts the round (as it always has); on the start screen it just refreshes
// the summary; after a result it goes back to the start screen.
function buildQuizQuestions() {
  quizGoalBanner.hidden = true;
  quizGoalCelebrated = false;
  renderGoalStepper("quiz");
  if (quizPhase === "play") startQuizRound();
  else showQuizStart();
}

function startQuizRound(retryList) {
  stopQuizTimer();
  quizGoalBanner.hidden = true;
  quizGoalCelebrated = false;

  let list;
  if (retryList) {
    list = QuizCore.retryQuestions(retryList, shuffle);
    quizIsRetry = true;
  } else {
    const pool = buildQuizPool();
    if (!pool.length) { showQuizStart(); return; }
    // The stepper can't be dragged past what's actually available, but the
    // pool itself can shrink out from under a stored preference (switching
    // category/level, or words disappearing) — clamp down here too so
    // "Number of Questions" and the question count never disagree.
    // The saved preference is kept as picked (5, 10 ... 100); only this round
    // is shortened to what the pool can supply.
    list = pickWordsForSession(pool, Math.min(goals.quiz, pool.length), (q) => q.target);
    quizIsRetry = false;
  }

  quizQuestions = list;
  quizEndedEarly = false;
  quizIndex = 0;
  quizScore = 0;
  quizCombo = 0;
  quizBestCombo = 0;
  quizAnswered = false;
  quizMissed = [];
  quizLeaves = QuizCore.LEAVES_START;
  quizActiveMs = 0;
  quizCoinsBefore = quizEarnedCoins();
  renderGoalStepper("quiz");

  quizPhase = "play";
  quizStartScreen.hidden = true;
  quizResultEl.hidden = true;
  quizPractice.hidden = false;
  renderQuizQuestion();
}

/* ---------- One question ---------- */
const quizInstrKey = (type) => "qzInstr" + type.charAt(0).toUpperCase() + type.slice(1);
const quizCurrent = () => quizQuestions[quizIndex];
// Each option is a ".qz-opt-wrap" (so its optional speaker button isn't
// nested inside the answer <button> itself) — this unwraps back to the
// option buttons themselves for the callers that scored/highlight/navigate
// them before that wrapper existed.
const quizOptionButtons = () => Array.from(quizOptionsEl.children, (w) => w.querySelector(".option-btn") || w);

function renderQuizQuestion() {
  stopQuizTimer();
  quizAnswered = false;
  quizNextBtn.style.display = "none";
  quizFeedbackEl.hidden = true;
  quizFeedbackEl.innerHTML = "";
  quizFeedbackEl.className = "qz-feedback";

  const total = quizQuestions.length;
  if (quizIndex >= total) { showQuizResult(); return; }

  const q = quizCurrent();
  quizHints = { fifty: false, letter: false, letterText: "" };
  quizTypingPattern.textContent = "";
  setQuizProgress((quizIndex / total) * 100);
  quizCountEl.textContent = t("qzCount", quizIndex + 1, total);
  quizInstructionEl.textContent = t(quizInstrKey(q.type));

  quizQuestionEl.textContent = q.hearOnly ? t("qzListenPrompt") : q.prompt;
  quizQuestionEl.classList.toggle("qz-q-word", !!q.promptIsWord);
  quizQuestionEl.classList.toggle("qz-q-hear", !!q.hearOnly);

  // The 어휘 (meaning -> word) prompt is the Korean definition in the Korean
  // UI — nothing in it is in English, so reading it aloud is just noise.
  // Hide the question's own speaker there and let each English answer
  // option speak for itself instead.
  quizHideMainSpeak = currentLang === "ko" && q.type === "vocabulary" && q.kind === "choice";
  quizSpeakWrap.hidden = quizHideMainSpeak;
  quizQuestionEl.classList.toggle("qz-q-no-speak", quizHideMainSpeak);

  quizOptionsEl.innerHTML = "";
  quizOptionsEl.hidden = q.kind !== "choice";
  quizTypingBox.hidden = q.kind !== "typing";
  if (q.kind === "choice") {
    q.options.forEach((opt, i) => {
      const wrap = document.createElement("div");
      wrap.className = "qz-opt-wrap";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "option-btn qz-opt";
      btn.dataset.idx = String(i);
      const key = document.createElement("span");
      key.className = "qz-opt-key";
      key.setAttribute("aria-hidden", "true");
      key.textContent = "ABCD".charAt(i);
      const text = document.createElement("span");
      text.className = "qz-opt-text";
      text.textContent = opt;
      btn.append(key, text);
      btn.addEventListener("click", () => answerQuizChoice(i));
      wrap.appendChild(btn);
      // The question's own speaker is hidden for a Korean prompt (nothing in
      // it to read aloud) — each English option gets its own instead, so a
      // stray tap on it never counts as picking that answer.
      if (quizHideMainSpeak) {
        btn.classList.add("qz-opt-has-speak");
        const speakBtn = document.createElement("button");
        speakBtn.type = "button";
        speakBtn.className = "qz-opt-speak";
        speakBtn.textContent = "🔊";
        speakBtn.setAttribute("aria-label", t("hearItLabel"));
        speakBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          speak(opt, {
            onstart: () => speakBtn.classList.add("speak-btn-active"),
            onend: () => speakBtn.classList.remove("speak-btn-active"),
          });
        });
        wrap.appendChild(speakBtn);
      }
      quizOptionsEl.appendChild(wrap);
    });
    // Arrow-key navigation always starts back on the first option for a fresh
    // question, so Enter alone (with no arrow press at all) still answers it.
    quizFocusIndex = 0;
    highlightQuizOption(quizFocusIndex);
  } else {
    quizTypingInput.value = "";
    quizTypingInput.disabled = false;
    quizTypingCheck.disabled = false;
    quizTypingInput.classList.remove("shake");
  }

  quizTimerEl.hidden = quizMode !== "time";
  updateQuizHud();
  // After "Next" on a phone the new question can be above the fold: scroll back up only if needed.
  if (quizIndex > 0) quizCountEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
  quizQuestionShownAt = Date.now();
  if (quizMode === "time") startQuizTimer(q);
  if (q.type === "listening") speakQuizQuestion();
  if (q.kind === "typing") quizTypingInput.focus({ preventScroll: true });
}

function speakQuizQuestion() {
  const q = quizCurrent();
  if (!q || quizHideMainSpeak) return;
  speak(q.speak, {
    onstart: () => quizSpeakBtn.classList.add("speak-btn-active"),
    onend: () => quizSpeakBtn.classList.remove("speak-btn-active"),
  });
}

// Everything that changes after an answer or a hint: score, combo, leaves, hint buttons.
function updateQuizHud() {
  const q = quizCurrent();
  quizScoreEl.textContent = t("qzScoreTag", quizScore);
  quizComboChip.hidden = quizCombo < 2;
  quizComboChip.textContent = t("qzComboChip", quizCombo);
  quizLeavesEl.textContent = quizLeaves > 0 ? "🌿".repeat(quizLeaves) : "🌿 0";
  quizLeavesEl.setAttribute("aria-label", t("qzLeavesAria", quizLeaves));

  const live = !!q && !quizAnswered;
  const canSpend = live && quizLeaves > 0;
  const choice = !!q && q.kind === "choice";
  quizHint5050Btn.hidden = !choice;
  quizHint5050Btn.disabled = !(canSpend && choice && !quizHints.fifty && QuizCore.fiftyFiftyRemovals(q, [], (a) => a).length > 0);
  quizHintLetterBtn.hidden = !q || !q.canFirstLetter;
  quizHintLetterBtn.disabled = !(canSpend && !quizHints.letter);
  quizHintTextEl.textContent = quizHints.letterText || (live && quizLeaves === 0 ? t("qzNoLeaves") : "");
}

/* ---------- Answering ---------- */
function answerQuizChoice(idx) {
  if (quizAnswered) return;
  const q = quizCurrent();
  finishQuizQuestion({ correct: q.options[idx] === q.answer, chosenIdx: idx });
}

function submitQuizTyped() {
  if (quizAnswered) return;
  const q = quizCurrent();
  const res = QuizCore.checkTyped(quizTypingInput.value, q.answer);
  if (res.empty) {
    quizTypingInput.classList.remove("shake");
    void quizTypingInput.offsetWidth; // restart the animation
    quizTypingInput.classList.add("shake");
    quizTypingInput.focus();
    return;
  }
  finishQuizQuestion({ correct: res.correct, close: res.close, typed: quizTypingInput.value.trim() });
}

function finishQuizQuestion(outcome) {
  if (quizAnswered) return;
  quizAnswered = true;
  stopQuizTimer();
  const q = quizCurrent();
  const correct = !!outcome.correct;
  quizActiveMs += Math.min(Date.now() - quizQuestionShownAt, 120000);

  if (correct) quizScore++;
  quizCombo = comboAfterAnswer(quizCombo, correct);
  if (correct) {
    quizBestCombo = Math.max(quizBestCombo, quizCombo);
    quizLeaves = QuizCore.leavesAfterCombo(quizLeaves, quizCombo); // 5 in a row wins a leaf back
  } else {
    quizMissed.push(q);
  }

  progress.quiz.total++;
  if (correct) progress.quiz.correct++;
  recordResult(q.target, correct, "quiz");
  recordSrsResult(q.target, correct);
  saveProgress();

  // Lock the answer area and show what the right answer was.
  if (q.kind === "choice") {
    quizOptionButtons().forEach((b, i) => {
      b.disabled = true;
      if (q.options[i] === q.answer) {
        b.classList.add("correct");
        if (correct) pulseScoreTag(b, "option-btn-bounce");
      } else if (i === outcome.chosenIdx) b.classList.add("incorrect");
    });
  } else {
    quizTypingInput.disabled = true;
    quizTypingCheck.disabled = true;
    quizTypingPattern.textContent = "";
  }

  renderQuizFeedback(q, outcome, correct);
  quizNextBtn.textContent = quizIndex + 1 >= quizQuestions.length ? t("qzSeeResults") : t("nextQuestionBtn");
  // On a phone the button is just an arrow (see "#quiz-qcard > #quiz-next" in
  // style.css), so keep its meaning available to screen readers.
  quizNextBtn.setAttribute("aria-label", quizNextBtn.textContent);
  quizNextBtn.style.display = "inline-block";
  quizNextBtn.focus({ preventScroll: true });
  // On a phone the feedback and "Next" can sit below the fold: bring them into view (no scroll if already visible).
  quizNextBtn.scrollIntoView({ block: "nearest", behavior: "smooth" });
  updateQuizHud();
  pulseScoreTag(quizScoreEl);

  const goal = Math.min(goals.quiz, quizQuestions.length);
  if (!quizIsRetry && goal && !quizGoalCelebrated && quizScore >= goal) {
    quizGoalCelebrated = true;
    showGoalReached(quizGoalBanner, quizGoalMessage, quizGoalNextLevelBtn, quizScore);
  }
}

// What the answer was, what it means and how it's used. On the Korean track
// the meaning is the Korean one, so it gets its own show/hide switch.
function renderQuizFeedback(q, outcome, correct) {
  const ko = currentLang === "ko";
  const answerIsMeaning = q.type === "meaning" || q.type === "homophones";
  let head;
  if (correct) head = t("qzFbCorrect");
  else if (outcome.timedOut) head = t("qzFbTimeUp", q.answer);
  else head = t("qzFbWrong", q.answer);

  const parts = [`<div class="qz-fb-head">${escapeHtml(head)}</div>`];
  if (!correct && outcome.close) parts.push(`<div class="qz-fb-note">${escapeHtml(t("qzFbAlmost"))}</div>`);
  if (!correct && outcome.typed) parts.push(`<div class="qz-fb-note">✍️ ${escapeHtml(outcome.typed)}</div>`);

  if (q.definition && !answerIsMeaning) {
    const label = ko ? t("qzKoMeaningLabel") : "📖";
    const toggle = ko
      ? `<button type="button" class="qz-fb-toggle" data-qz-ko-toggle>${escapeHtml(t(quizKoMeaningShown ? "qzKoMeaningHide" : "qzKoMeaningShow"))}</button>`
      : "";
    const hidden = ko && !quizKoMeaningShown;
    parts.push(`<div class="qz-fb-row qz-fb-def${hidden ? " is-hidden" : ""}"><span class="qz-fb-label">${escapeHtml(label)}</span><span class="qz-fb-text">${escapeHtml(q.definition)}</span></div>${toggle}`);
  }
  if (q.example) {
    const OPEN = "", CLOSE = "";
    const wrapped = QuizCore.wrapWord(q.example, q.target, OPEN, CLOSE).text;
    const html = escapeHtml(wrapped).split(OPEN).join("<mark>").split(CLOSE).join("</mark>");
    parts.push(`<div class="qz-fb-row qz-fb-ex"><span class="qz-fb-label">💬</span><span class="qz-fb-text">${html}</span></div>`);
  }
  quizFeedbackEl.className = "qz-feedback " + (correct ? "is-correct" : outcome.timedOut ? "is-timeup" : "is-wrong");
  quizFeedbackEl.innerHTML = parts.join("");
  quizFeedbackEl.hidden = false;
}

quizFeedbackEl.addEventListener("click", (e) => {
  if (!e.target.closest("[data-qz-ko-toggle]")) return;
  quizKoMeaningShown = !quizKoMeaningShown;
  saveQuizKoMeaning();
  const row = quizFeedbackEl.querySelector(".qz-fb-def");
  if (row) row.classList.toggle("is-hidden", !quizKoMeaningShown);
  e.target.closest("[data-qz-ko-toggle]").textContent = t(quizKoMeaningShown ? "qzKoMeaningHide" : "qzKoMeaningShow");
});

/* ---------- Hints: 🌿 leaves ----------
   Every round starts with a couple of leaves. A hint costs one, and five
   correct answers in a row win one back (see QuizCore.leavesAfterCombo). */
quizHint5050Btn.addEventListener("click", () => {
  const q = quizCurrent();
  if (!q || quizAnswered || quizHints.fifty || quizLeaves < 1) return;
  const removals = QuizCore.fiftyFiftyRemovals(q, [], shuffle);
  if (!removals.length) return;
  quizLeaves--;
  quizHints.fifty = true;
  const optBtns = quizOptionButtons();
  removals.forEach((i) => {
    const b = optBtns[i];
    if (!b) return;
    b.disabled = true;
    b.classList.add("qz-opt-out");
  });
  updateQuizHud();
});

quizHintLetterBtn.addEventListener("click", () => {
  const q = quizCurrent();
  if (!q || quizAnswered || quizHints.letter || quizLeaves < 1 || !q.canFirstLetter) return;
  quizLeaves--;
  quizHints.letter = true;
  if (q.kind === "typing") {
    quizTypingPattern.textContent = QuizCore.letterPattern(q.answer);
    quizTypingInput.focus();
  } else {
    quizHints.letterText = t("qzHintStarts", q.answer.charAt(0).toLowerCase());
  }
  updateQuizHud();
});

/* ---------- Time attack ---------- */
function startQuizTimer(q) {
  stopQuizTimer();
  quizTimer = { limit: QuizCore.timeLimitMs(q), elapsed: 0, last: performance.now(), id: 0 };
  renderQuizTimer();
  quizTimer.id = setInterval(quizTimerTick, 100);
}
function stopQuizTimer() {
  if (!quizTimer) return;
  clearInterval(quizTimer.id);
  quizTimer = null;
}
function quizTimerTick() {
  if (!quizTimer) return;
  const now = performance.now();
  // The clock only runs while the page is actually on screen.
  if (!document.hidden) quizTimer.elapsed += now - quizTimer.last;
  quizTimer.last = now;
  renderQuizTimer();
  if (quizTimer.elapsed >= quizTimer.limit) finishQuizQuestion({ correct: false, timedOut: true });
}
function renderQuizTimer() {
  if (!quizTimer) return;
  const frac = QuizCore.timeLeftFraction(quizTimer.elapsed, quizTimer.limit);
  quizTimerFill.style.width = `${(frac * 100).toFixed(1)}%`;
  quizTimerText.textContent = String(Math.ceil((quizTimer.limit - quizTimer.elapsed) / 1000));
  quizTimerEl.classList.toggle("is-urgent", quizTimer.limit * frac <= 5000);
}

/* ---------- Result screen ---------- */
function showQuizResult() {
  stopQuizTimer();
  quizPhase = "result";
  quizGoalBanner.hidden = true; // the result screen says it all (and "Keep going" would suggest the round isn't over)
  const total = quizQuestions.length;
  setQuizProgress(100);
  quizPractice.hidden = true;
  quizStartScreen.hidden = true;

  if (!quizIsRetry && !quizEndedEarly && canUsePaidFeatures() && total >= 5 && quizScore === total && !quizQuestions._awarded) {
    quizQuestions._awarded = true;
    ensureRewardData();
    progress.counters.quizPerfect++;
    saveProgress();
    checkBadges();
  }

  const sum = QuizCore.summarize(quizScore, total);
  const coins = Math.max(0, quizEarnedCoins() - quizCoinsBefore);
  const showCoins = canUseAccountFeatures() && !(serverAdmin || isAdmin);
  const moodKey = { great: "qzMoodGreat", good: "qzMoodGood", keep: "qzMoodKeep" }[sum.mood];
  // One praise line, not two: a perfect round says so directly instead of
  // also repeating the mood line right above it.
  const praiseText = quizMissed.length === 0 ? t("qzNoMissed") : t(moodKey);

  const stars = [1, 2, 3].map((n) => `<span class="qz-star${n <= sum.stars ? " on" : ""}" aria-hidden="true">${n <= sum.stars ? "★" : "☆"}</span>`).join("");
  const coinChipHtml = showCoins && coins > 0 ? `<div class="qz-coin-chip">${COIN_SVG} +${coins}</div>` : "";

  // The gift button only shows up when there's something to open right now —
  // no progress bar or "coming soon" card sitting here the rest of the time.
  // It's a small pill next to the coin chip, not a second big CTA competing
  // with the primary button below — but it still carries a text label
  // (icon alone read as "what is this?"), and nudges gently so it isn't
  // missed in among the rest of the row.
  const nextReward = showCoins ? KoalaCore.nextReward(progress, Object.assign({ kind: "character" }, koalaOpts())) : null;
  const giftHtml = nextReward && nextReward.affordable
    ? `<button type="button" class="qz-gift-icon-btn" data-qz-act="opengift" aria-label="${escapeHtml(t("qzGiftBtn"))}" title="${escapeHtml(t("qzGiftBtn"))}"><span aria-hidden="true">🎁</span><span class="qz-gift-icon-label">${escapeHtml(t("qzGiftBtnLabel"))}</span></button>`
    : "";
  const rewardRowHtml = coinChipHtml || giftHtml ? `<div class="qz-reward-row">${coinChipHtml}${giftHtml}</div>` : "";

  // Up to 5 missed words as small tap-to-hear chips, right above the primary
  // button — the retry button's own "(N)" count already says how many there
  // are, so no separate collapsed list repeating that.
  const missedChips = quizMissed.slice(0, QUIZ_RESULT_MISSED_SHOWN);
  const missedOverflow = quizMissed.length - missedChips.length;
  const missedHtml = quizMissed.length
    ? `<div class="qz-missed-chips">${
        missedChips.map((q) => `<button type="button" class="qz-missed-chip" data-say="${escapeHtml(q.target)}">${escapeHtml(q.target)}</button>`).join("")
      }${missedOverflow > 0 ? `<span class="qz-missed-chip qz-missed-chip-more">+${missedOverflow}</span>` : ""}</div>`
    : "";

  // One big primary action: retry just the missed words when there are any,
  // otherwise a plain replay — never both at once.
  const primaryAct = quizMissed.length ? "retry" : "again";
  const primaryLabel = quizMissed.length ? t("qzRetryBtn", quizMissed.length) : t("qzAgainBtn");
  const nextLevelHtml = !quizIsRetry && !quizEndedEarly && quizScore === total && total >= GOAL_MIN && nextLevelId()
    ? `<button type="button" class="qz-result-link" data-qz-act="nextlevel">${escapeHtml(t("goalNextLevelBtn"))}</button>`
    : "";

  quizResultEl.innerHTML = `
    <div class="qz-result-card">
      <div class="qz-result-koala is-${sum.mood}" aria-hidden="true"><span class="kface" aria-hidden="true"></span></div>
      <div class="qz-stars" role="img" aria-label="${sum.stars} / 3">${stars}</div>
      <div class="qz-result-score">${quizScore} / ${total}</div>
      <p class="qz-result-mood">${escapeHtml(praiseText)}</p>
      ${rewardRowHtml}
      ${missedHtml}
      <div class="qz-result-actions">
        <button type="button" class="qz-result-primary" data-qz-act="${primaryAct}">${escapeHtml(primaryLabel)}</button>
        <div class="qz-result-links">
          <button type="button" class="qz-result-link" data-qz-act="settings">${escapeHtml(t("qzSettingsBtn"))}</button>
          ${nextLevelHtml}
        </div>
      </div>
    </div>`;
  quizResultEl.hidden = false;
  if (sum.stars === 3) koalaSparkle();
}

// "🎁 Open gift" on the result screen — straight purchase-and-wear of
// whatever the next affordable reward is, with the same toast/sparkle
// feedback as buying one from the Koala tab, then a fresh render so the
// button reflects the new (or now-unaffordable) next reward.
function quizOpenGift() {
  const nr = KoalaCore.nextReward(progress, Object.assign({ kind: "character" }, koalaOpts()));
  if (!nr || !nr.affordable) { showQuizResult(); return; }
  const name = koalaItemName(nr.item);
  const res = KoalaCore.buyItem(progress, nr.item.id, koalaOpts());
  if (!res.ok) { showQuizResult(); return; }
  rwToastQueue.push({ emoji: KOALA_SLOT_EMOJI[nr.item.slot], title: rwL("New item unlocked!", "새 아이템 해금!"), name: rwL(`${name} — now wearing it!`, `${name} — 바로 입었어요!`) });
  showNextBadgeToast();
  checkBadges();
  saveProgress();
  koalaSparkle();
  showQuizResult();
}

/* ---------- Keyboard play ----------
   Start screen: Enter starts. In a round: 1-4 or A-D pick an option, the arrow
   keys move a highlight between options and Enter answers with the highlighted
   one; once answered, Enter goes to the next question. Typing questions use
   their own box (Enter checks). */
let quizFocusIndex = 0;
// The highlight ring is only meaningful once someone is actually steering
// with arrow keys — showing it on every freshly-rendered question (before
// any key has been touched) just reads as a stray blue border around the
// first option for anyone playing with the mouse. So it stays off until the
// first arrow-key press, then persists question-to-question after that.
let quizKeyboardNavUsed = false;

function highlightQuizOption(index) {
  quizOptionButtons().forEach((b, i) => {
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
  if (e.ctrlKey || e.metaKey || e.altKey) return;

  if (quizPhase === "start") {
    if (e.key === "Enter" && !e.repeat && tag !== "BUTTON" && !quizStartBtn.disabled) { e.preventDefault(); quizStartBtn.click(); }
    return;
  }
  // The result screen never reacts to the keyboard: a stray or held-down Enter
  // used to start a brand-new round right after the last question, which looked
  // like the quiz never ended. Starting again takes a deliberate click.
  if (quizPhase === "result") return;
  if (e.repeat && e.key === "Enter") return;
  const q = quizCurrent();
  if (!q) return;

  if (quizAnswered) {
    if (e.key === "Enter" && quizNextBtn.style.display !== "none") {
      e.preventDefault();
      quizNextBtn.click();
    }
    return;
  }
  if (q.kind !== "choice") return;

  const opts = quizOptionButtons();
  if (!opts.length) return;
  const cols = quizOptionColumns();
  let handled = true;
  const direct = "1234".indexOf(e.key) >= 0 ? "1234".indexOf(e.key) : "abcd".indexOf(e.key.toLowerCase());
  if (e.key.length === 1 && direct >= 0 && direct < opts.length) {
    if (!opts[direct].disabled) opts[direct].click();
  } else if (e.key === "ArrowRight") { quizFocusIndex = Math.min(quizFocusIndex + 1, opts.length - 1); quizKeyboardNavUsed = true; }
  else if (e.key === "ArrowLeft") { quizFocusIndex = Math.max(quizFocusIndex - 1, 0); quizKeyboardNavUsed = true; }
  else if (e.key === "ArrowDown") { quizFocusIndex = Math.min(quizFocusIndex + cols, opts.length - 1); quizKeyboardNavUsed = true; }
  else if (e.key === "ArrowUp") { quizFocusIndex = Math.max(quizFocusIndex - cols, 0); quizKeyboardNavUsed = true; }
  else if (e.key === "Enter") { if (!opts[quizFocusIndex].disabled) opts[quizFocusIndex].click(); }
  else handled = false;
  if (handled) {
    e.preventDefault();
    highlightQuizOption(quizFocusIndex);
  }
});

/* ---------- Quiz & Spelling sound effects + combo ----------
   Short Web Audio tones (nothing to download). Every right answer plays a
   ding; consecutive right answers climb a little scale, and every 5th in a
   row plays a fanfare with a bigger popup. A wrong answer resets the combo.
   One mute switch (🔊/🔇 next to the score) covers Quiz and Spelling and is
   remembered on this device. */
const SFX_MUTE_KEY = "ywp_sfx_muted_v1";
let sfxMuted = (() => { try { return localStorage.getItem(SFX_MUTE_KEY) === "1"; } catch (e) { return false; } })();
let sfxCtx = null;
const SFX_SCALE = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51];

function sfxEnsure() {
  if (sfxMuted) return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  enableMediaPlaybackAudio();
  if (!sfxCtx) sfxCtx = new Ctx();
  if (sfxCtx.state !== "running") sfxCtx.resume().catch(() => {});
  return sfxCtx;
}
function sfxTone(freq, startOffset, duration, type, peak) {
  const ctx = sfxCtx;
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const when = ctx.currentTime + startOffset;
  gain.gain.setValueAtTime(0, when);
  gain.gain.linearRampToValueAtTime(Math.min(peak * GAME_SFX_BOOST, 0.4), when + 0.015);
  gain.gain.linearRampToValueAtTime(0, when + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(when);
  osc.stop(when + duration + 0.02);
}
function playCorrectSfx(combo) {
  if (!sfxEnsure()) return;
  if (combo >= 5 && combo % 5 === 0) {
    // fanfare: rising arpeggio ending on a bright chord
    [0, 2, 4, 5].forEach((n, i) => sfxTone(SFX_SCALE[n], i * 0.08, 0.16, "triangle", 0.08));
    [5, 7].forEach((n) => sfxTone(SFX_SCALE[n], 0.36, 0.34, "square", 0.04));
  } else if (combo >= 2) {
    const steps = Math.min(combo, 5);
    for (let i = 0; i < steps; i++) sfxTone(SFX_SCALE[Math.min(i + (combo > 5 ? 2 : 0), 7)], i * 0.065, 0.12, "triangle", 0.075);
  } else {
    sfxTone(880, 0, 0.1, "triangle", 0.08);
    sfxTone(1318.51, 0.08, 0.14, "triangle", 0.08);
  }
}
function playWrongSfx() {
  if (!sfxEnsure()) return;
  sfxTone(200, 0, 0.16, "sawtooth", 0.06);
  sfxTone(150, 0.12, 0.2, "sawtooth", 0.06);
}
// Soft "pop" for Next / continue buttons (Wrong-notes review). Shares the
// Quiz/Spelling mute switch.
function playNextSfx() {
  if (!sfxEnsure()) return;
  sfxTone(660, 0, 0.07, "sine", 0.07);
  sfxTone(990, 0.05, 0.09, "sine", 0.06);
}
function showComboPopup(n) {
  if (n < 3) return;
  document.querySelectorAll(".combo-pop").forEach((e) => e.remove());
  const big = n % 5 === 0;
  const el = document.createElement("div");
  el.className = "combo-pop" + (big ? " combo-pop-big" : "");
  el.setAttribute("role", "status");
  const icon = n >= 15 ? "🌟" : n >= 10 ? "⚡" : "🔥";
  el.innerHTML = `<span class="combo-pop-n">${icon} ${n}${currentLang === "ko" ? "콤보!" : " Combo!"}</span>${big ? `<span class="combo-pop-sub">${currentLang === "ko" ? "대단해요!" : "Amazing!"}</span>` : ""}`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), big ? 1500 : 1000);
}
// Called after every graded answer in Quiz / Spelling; returns the new combo.
function comboAfterAnswer(prev, correct, fresh = true) {
  if (!correct) { playWrongSfx(); return 0; }
  if (!fresh) { playCorrectSfx(0); return prev; } // re-check of an already-credited word
  const n = prev + 1;
  playCorrectSfx(n);
  showComboPopup(n);
  return n;
}
function renderSfxToggles() {
  document.querySelectorAll(".sfx-toggle").forEach((b) => {
    // In Spelling and Quiz the toggle reads "🔊 ON / 🔇 OFF" so it can't be mistaken for the
    // big Listen button; elsewhere it stays icon-only.
    const inSpelling = !!b.closest("#spelling-practice, #quiz-practice");
    b.textContent = (sfxMuted ? "🔇" : "🔊") + (inSpelling ? " " + rwL(sfxMuted ? "OFF" : "ON", sfxMuted ? "꺼짐" : "켜짐") : "");
    b.classList.toggle("is-off", sfxMuted);
    const label = sfxMuted ? rwL("Sounds off — tap to turn on", "효과음 꺼짐 — 눌러서 켜기") : rwL("Sounds on — tap to turn off", "효과음 켜짐 — 눌러서 끄기");
    b.setAttribute("aria-label", label);
    b.title = label;
  });
}
function initSfxToggles() {
  [document.getElementById("quiz-score"), document.getElementById("spelling-score")].forEach((tag) => {
    if (!tag || tag.parentNode.querySelector(".sfx-toggle")) return;
    const b = document.createElement("button");
    b.type = "button";
    b.className = "sfx-toggle";
    b.addEventListener("click", () => {
      sfxMuted = !sfxMuted;
      try { localStorage.setItem(SFX_MUTE_KEY, sfxMuted ? "1" : "0"); } catch (e) { /* private mode */ }
      renderSfxToggles();
      if (!sfxMuted) playCorrectSfx(0);
    });
    tag.after(b);
  });
  renderSfxToggles();
}
/* ---------- Quiz wiring ---------- */
quizStartBtn.addEventListener("click", () => startQuizRound());

quizModeSeg.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-mode]");
  if (!btn) return;
  quizMode = btn.dataset.mode === "time" ? "time" : "relaxed";
  saveQuizMode();
  renderQuizStart();
});

quizNextBtn.addEventListener("click", () => {
  quizIndex++;
  renderQuizQuestion();
});

// Phone layout: "Next" is a translucent arrow on the right edge of the
// question box instead of a button in the footer. It lives in the footer on
// wider screens, so move it between the two as the screen size changes.
const quizQcardEl = document.getElementById("quiz-qcard");
const quizPhoneMQ = window.matchMedia("(max-width: 700px)");
function placeQuizNextBtn() {
  if (quizPhoneMQ.matches) quizQcardEl.appendChild(quizNextBtn);
  else if (quizNextBtn.parentNode !== quizEndBtn.parentNode) quizEndBtn.before(quizNextBtn);
}
quizPhoneMQ.addEventListener("change", placeQuizNextBtn);
placeQuizNextBtn();

quizQuestionEl.addEventListener("click", speakQuizQuestion);
quizSpeakBtn.addEventListener("click", speakQuizQuestion);

quizTypingCheck.addEventListener("click", submitQuizTyped);
quizTypingInput.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  e.preventDefault();
  // Stop here: once the answer is graded the focus jumps to "Next", and the
  // page-wide Enter handler must not treat this same keypress as "Next".
  e.stopPropagation();
  submitQuizTyped();
});

quizResultEl.addEventListener("click", (e) => {
  const say = e.target.closest("[data-say]");
  if (say) { speak(say.dataset.say); return; }
  const btn = e.target.closest("[data-qz-act]");
  if (!btn) return;
  if (btn.dataset.qzAct === "retry") startQuizRound(quizMissed.slice());
  else if (btn.dataset.qzAct === "again") startQuizRound();
  else if (btn.dataset.qzAct === "settings") showQuizStart();
  else if (btn.dataset.qzAct === "nextlevel") { const next = nextLevelId(); if (next) applyLevel(next); }
  else if (btn.dataset.qzAct === "opengift") quizOpenGift();
});

// 🏁 End: stop here and see the result for the questions answered so far
// (nothing answered yet -> straight back to the start screen).
quizEndBtn.addEventListener("click", () => {
  if (quizPhase !== "play") return;
  const answered = quizIndex + (quizAnswered ? 1 : 0);
  stopQuizTimer();
  if (answered === 0) { showQuizStart(); return; }
  quizEndedEarly = answered < quizQuestions.length;
  quizQuestions = quizQuestions.slice(0, answered);
  quizIndex = answered;
  showQuizResult();
});
quizCategorySel.addEventListener("change", buildQuizQuestions);

quizGoalSelect.addEventListener("change", () => {
  if (quizGoalSelect.value === "more") {
    quizGoalSelect.value = String(goals.quiz); // nothing changes; just the nudge
    syncQuizGoalDd();
    if (!currentUser) promptSignupForMoreQuestions();
    else if (currentUser.role === "free") openUpgradeOverlay();
    return;
  }
  const n = parseInt(quizGoalSelect.value, 10);
  if (!(n > 0)) return;
  goals.quiz = n;
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
// ⌫ is the last chip of the alphabet pad: same size and shape as the letter
// chips, pinned to the bottom-right cell. renderSpellingLetterHints() appends
// it after the letter chips every time the pad is rebuilt.
const spellingBackspaceBtn = document.createElement("button");
spellingBackspaceBtn.type = "button";
spellingBackspaceBtn.id = "spelling-backspace";
spellingBackspaceBtn.className = "sp-backspace-chip";
// Inline SVG rather than the ⌫ glyph: some fonts draw that character as an
// envelope-like box, which kids read as "mail" instead of "delete". This is the
// standard keyboard backspace shape (pointed left end + ✕), sized by CSS.
spellingBackspaceBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M21 5H9l-6 7 6 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z"/><path d="M16.5 9.5l-5 5M11.5 9.5l5 5"/></svg>';
const spellingScoreEl = document.getElementById("spelling-score");
const spellingGoalSelect = document.getElementById("spelling-goal-select");
const spellingGoalBanner = document.getElementById("spelling-goal-banner");
const spellingGoalMessage = document.getElementById("spelling-goal-message");
const spellingGoalNextLevelBtn = document.getElementById("spelling-goal-next-level");
const spellingGoalDismissBtn = document.getElementById("spelling-goal-dismiss");
let spellingGoalCelebrated = false;
const spellingFinishBtn = document.getElementById("spelling-finish-btn");
const spellingReport = document.getElementById("spelling-report");
const spellingReportList = document.getElementById("spelling-report-list");
const spellingReportEmpty = document.getElementById("spelling-report-empty");
const spellingReportMsg = document.getElementById("spelling-report-msg");
const spellingReportPct = document.getElementById("spelling-report-pct");
const spellingReportKoala = document.getElementById("spelling-report-koala");
const spellingReportScoreEl = document.getElementById("spelling-report-score");
const spellingReportRestartBtn = document.getElementById("spelling-report-restart");

let spellingDeck = [];
let spellingIndex = 0;
const spellingMissedIdx = new Set(); // word positions answered wrong at least once (leaf colour)
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
  spellingMissedIdx.clear();
  spellingScore = { correct: 0, total: 0 };
  spellingCombo = 0;
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
// Spelling bubble uses the same outlined style as the flashcards bubble
function drawSpellingBubble() { drawBubbleOutline(spellingBubble); }
if (spellingBubble) {
  spellingBubble.classList.add("fk-bubble-skin");
  spellingBubble.dataset.tail = "left";
  spellingBubble.insertAdjacentHTML("afterbegin", '<svg class="fk-bubble-bg" aria-hidden="true"></svg>');
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(() => drawSpellingBubble()).observe(spellingBubble);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawSpellingBubble);
  drawSpellingBubble();
}
const spellingProgressEl = document.getElementById("spelling-progress");
// Same koala artwork as the Flashcards helper, dropped in before the bubble.
// Full-body koala (sitting on a branch) — shares the fk-* class names so the
// same reaction animations drive it.
const SPELL_KOALA_SVG = `<svg class="sk-svg" viewBox="0 0 200 205" width="170" height="174" aria-hidden="true">
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
      <path class="sk-mouth-sad" d="M89 122 Q100 111 111 122" stroke="#1f2a27" stroke-width="2.8" fill="none" stroke-linecap="round"/>
      <g class="fk-eyes-sad"><circle cx="82" cy="77" r="6.4" fill="#1f2a27"/><circle cx="118" cy="77" r="6.4" fill="#1f2a27"/><circle cx="84.5" cy="74.5" r="2.4" fill="#fff"/><circle cx="120.5" cy="74.5" r="2.4" fill="#fff"/><circle cx="80" cy="79.5" r="1.3" fill="#fff"/><circle cx="116" cy="79.5" r="1.3" fill="#fff"/><path d="M71 71 L90 63 M129 71 L110 63" stroke="#1f2a27" stroke-width="3" stroke-linecap="round"/></g>
      <path class="sk-tear sk-tear-l" d="M80 84 q-5 8 0 11 q5 -3 0 -11z" fill="#6ec6ff" stroke="#3aa0e6" stroke-width="1"/><path class="sk-tear sk-tear-r" d="M120 84 q-5 8 0 11 q5 -3 0 -11z" fill="#6ec6ff" stroke="#3aa0e6" stroke-width="1"/>
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
// The koala lives inside .sp-koala-wrap so the belly 🔊 button and the speech
// bubble move (and bounce) together with it.
document.getElementById("spelling-koala-wrap").insertAdjacentHTML("afterbegin", SPELL_KOALA_SVG);
// Until the child has tapped the tummy speaker themselves, the idle bubble tells
// them to (the word may not have played at all on a phone that blocks audio).
let spellingTappedSpeaker = false;
const spellingIdleKey = () => (spellingTappedSpeaker ? "spLiveIdle" : "spLiveTapHear");
function spellingReact(kind, msgKey) {
  koalaReact(kind, msgKey, spellingScene, spellingBubble, spellingIdleKey());
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
    const justDone = eaten && !l.classList.contains("eaten") && advanced && i === spellingLeafEaten;
    if (justDone) flyLeafToKoala(l);
    l.classList.toggle("eaten", eaten);
    l.classList.toggle("miss", eaten && spellingMissedIdx.has(i));
    // The leaf for the word being spelled glows gently; when it is earned it
    // pops (bigger + sparkle) and settles into the "done" look.
    l.classList.toggle("cur", i === target && target < spellingLeafTotal);
    if (justDone) {
      l.classList.remove("sp-leaf-pop");
      void l.offsetWidth;
      l.classList.add("sp-leaf-pop");
      setTimeout(() => l.classList.remove("sp-leaf-pop"), 1000);
    }
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
  tt: () => document.querySelector("#timestable-start-overlay h3"),
  // The in-stage koala that stays visible while a Times Table round is running
  // (the "tt" strip above lives inside the start overlay, so it can't be seen mid-game).
  ttlive: () => document.getElementById("timestable-koala-anchor"),
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
  const say = (k, keep) => { if (b.silent) return; text.textContent = t(k); clearTimeout(b.sayT); if (!keep) b.sayT = setTimeout(() => { text.textContent = t("kbIdle"); }, 2200); };
  b.say = say;
  b.bubble = bubble;
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
  syncSpellingState();
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
  spellingSpeakBtn.classList.toggle("sp-belly-hint", !spellingTappedSpeaker);
  if (!spellingTappedSpeaker) {
    const bt = spellingBubble.querySelector(".bubble-text");
    if (bt) bt.textContent = t("spLiveTapHear");
  }
  if (spellingKbOn) spellingInput.focus({ preventScroll: true });
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
  // The tray mirrors the input in real time: a tile lights up for every
  // letter typed (on a keyboard) or tapped, and goes dark again on
  // Backspace. Tapping a lit tile removes the last copy of that letter.
  shuffle([...letters, ...decoys]).forEach((letter) => {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "spelling-hint-tile";
    tile.textContent = letter;
    tile.dataset.letter = letter;
    tile.setAttribute("aria-label", `${letter}`);
    tile.addEventListener("click", () => {
      const v = spellingInput.value;
      if (tile.classList.contains("spelling-hint-tile-used")) {
        const idx = v.toLowerCase().lastIndexOf(letter);
        if (idx !== -1) spellingInput.value = v.slice(0, idx) + v.slice(idx + 1);
      } else {
        spellingInput.value = v + letter;
      }
      spellingInput.dispatchEvent(new Event("input"));
      spellingInput.focus();
    });
    spellingHintTray.appendChild(tile);
  });
  const eraseLabel = t("spellingBackspaceAria");
  spellingBackspaceBtn.setAttribute("aria-label", eraseLabel);
  spellingBackspaceBtn.title = eraseLabel;
  // ⌫ joins the pad as its last chip. Two balanced rows: the grid gets
  // ceil(chips/2) columns — counting ⌫ itself, so it never bumps a letter chip
  // into a third row — and ⌫ is pinned to the last column of row 2
  // (see .spelling-hint-tray in style.css).
  spellingHintTray.appendChild(spellingBackspaceBtn);
  spellingHintTray.style.setProperty("--cols", String(Math.ceil(spellingHintTray.children.length / 2)));
  syncSpellingHintTiles(false);
}

// Lights one tile per typed letter (first matching tiles in tray order).
function syncSpellingHintTiles(flash = true) {
  if (!spellingHintTray) return;
  const counts = {};
  for (const ch of spellingInput.value.toLowerCase()) counts[ch] = (counts[ch] || 0) + 1;
  spellingHintTray.querySelectorAll(".spelling-hint-tile").forEach((tile) => {
    const l = tile.dataset.letter;
    const on = counts[l] > 0;
    if (on) counts[l]--;
    const was = tile.classList.contains("spelling-hint-tile-used");
    tile.classList.toggle("spelling-hint-tile-used", on);
    if (on && !was && flash) {
      tile.classList.add("spelling-hint-tile-hit");
      setTimeout(() => tile.classList.remove("spelling-hint-tile-hit"), 260);
    }
  });
}

// ---- On-screen keyboard policy ----
// The letter chips are the main way to answer. On touch screens the phone's own
// keyboard would pop up on every word and cover Check / Score, so it stays shut
// (inputmode="none") until the child taps the little ⌨️ button. Desktops keep
// normal typing.
const spellingKbToggle = document.getElementById("spelling-kb-toggle");
const spellingCoarsePointer = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
let spellingKbOn = !spellingCoarsePointer;
function applySpellingKbMode() {
  spellingInput.setAttribute("inputmode", spellingKbOn ? "text" : "none");
  if (spellingKbToggle) {
    spellingKbToggle.setAttribute("aria-pressed", spellingKbOn ? "true" : "false");
    spellingKbToggle.classList.toggle("is-on", spellingKbOn);
  }
}
applySpellingKbMode();
if (spellingKbToggle) {
  spellingKbToggle.addEventListener("click", () => {
    spellingKbOn = !spellingKbOn;
    applySpellingKbMode();
    if (spellingKbOn) {
      spellingInput.blur();
      spellingInput.focus();
      // keep Check in view above the keyboard
      setTimeout(() => spellingCheckBtn.scrollIntoView({ block: "nearest", behavior: "smooth" }), 350);
    } else {
      spellingInput.blur();
    }
  });
}

// ⌫ at the right end of the chip row: drops the last typed letter and keeps
// the chips in sync (the input handler un-lights the matching chip).
spellingBackspaceBtn.addEventListener("click", () => {
  const v = spellingInput.value;
  if (!v) {
    spellingInput.focus({ preventScroll: true });
    return;
  }
  spellingInput.value = v.slice(0, -1);
  spellingInput.dispatchEvent(new Event("input"));
  spellingInput.focus();
});

spellingSpeakBtn.addEventListener("click", (e) => {
  if (e.isTrusted) { // a real tap, not the automatic play at the start of a word
    spellingTappedSpeaker = true;
    spellingSpeakBtn.classList.remove("sp-belly-hint");
  }
  // Pulse ring on every press (also fires for the automatic play at the
  // start of each word) — restart the animation if it is still running.
  spellingSpeakBtn.classList.remove("sp-pulse");
  void spellingSpeakBtn.offsetWidth;
  spellingSpeakBtn.classList.add("sp-pulse");
  setTimeout(() => spellingSpeakBtn.classList.remove("sp-pulse"), 700);
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
// One switch for the whole screen's "solving" vs "correct" look. While the
// child is still working (no correct check yet) the practice box has no
// .is-correct class: Next is quiet and static, Check is the live button. After
// a correct check, .is-correct turns on the Next pulse and the Check button
// shows its finished ("Checked ✅") state. CSS does the rest.
function syncSpellingState() {
  if (typeof spellingNextBtn !== "undefined" && spellingNextBtn) spellingNextBtn.dataset.hint = rwL("Next", "다음");
  spellingPractice.classList.toggle("is-correct", spellingCurrentChecked);
  spellingCheckBtn.classList.toggle("sp-checked", spellingCurrentChecked);
}

// ---- Mascot cheer while typing: the speech cloud follows what the child has
// typed so far (pure text swap; the bubble's pop animation is CSS).
function spellingCheer() {
  if (spellingPractice.hidden || spellingCurrentChecked || !spellingDeck[spellingIndex]) return;
  clearTimeout(spellingCheer._t);
  // A reaction (Listening…, Yum!, Try again…) owns the bubble while it plays.
  const busy = FK_CLASSES.some((c) => spellingScene.classList.contains(c)) || spellingScene.classList.contains("sk-eat");
  if (busy) { spellingCheer._t = setTimeout(spellingCheer, 1800); return; }
  const word = spellingDeck[spellingIndex].word.toLowerCase();
  const v = spellingInput.value.trim().toLowerCase();
  let key = spellingIdleKey();
  if (v) {
    if (v === word) key = spellingIdleKey();
    else if (word.startsWith(v) && v.length >= 3 && v.length >= word.length - 2) key = "spLiveAlmost";
    else key = "spLiveTyping";
  }
  const textEl = spellingBubble.querySelector(".bubble-text");
  const msg = t(key);
  if (!textEl || textEl.textContent === msg) return;
  textEl.textContent = msg;
  spellingBubble.classList.remove("sp-pop");
  void spellingBubble.offsetWidth;
  spellingBubble.classList.add("sp-pop");
}

// Sparkle burst around GO! (the sparks are static <i> elements; CSS animates them).
function spellingGoBurst() {
  spellingCheckBtn.classList.remove("sp-go-burst");
  void spellingCheckBtn.offsetWidth;
  spellingCheckBtn.classList.add("sp-go-burst");
  setTimeout(() => spellingCheckBtn.classList.remove("sp-go-burst"), 800);
}

function checkSpellingAnswer() {
  if (spellingDeck.length === 0) return;
  spellingTappedSpeaker = true; // they are clearly hearing the words fine; stop nagging
  spellingSpeakBtn.classList.remove("sp-belly-hint");
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
    spellingScene.classList.remove("sp-cheer");
    void spellingScene.offsetWidth;
    spellingScene.classList.add("sp-cheer"); // koala jumps for joy
    setTimeout(() => spellingScene.classList.remove("sp-cheer"), 900);
    spellingCombo = comboAfterAnswer(spellingCombo, true, earnsCredit);
    spellingConfetti();
    spellingGoBurst();
    renderSpellingProgress(true);
    showSpellingCorrectFeedback(earnsCredit);
    spellingCurrentChecked = true;
    syncSpellingState();
    spellingNextBtn.disabled = false;

    const goal = goals.spelling;
    if (goal && !spellingGoalCelebrated && spellingScore.correct >= goal) {
      spellingGoalCelebrated = true;
      showGoalReached(spellingGoalBanner, spellingGoalMessage, spellingGoalNextLevelBtn, spellingScore.correct);
    }
  } else {
    spellingCombo = comboAfterAnswer(spellingCombo, false);
    spellingWrongThisRound.add(current.word);
    progress.spellingStatus[current.word] = "wrong";
    spellingSessionWrongWords.set(current.word, { word: current.word, meaning: current.tip || "" });
    saveProgress();
    updateSpellingScoreLabel();
    spellingInput.className = "incorrect";
    spellingInput.classList.remove("sp-shake");
    void spellingInput.offsetWidth;
    spellingInput.classList.add("sp-shake");
    spellingMissedIdx.add(spellingIndex);
    spellingReact("sad", "spLiveSad");
    showSpellingWrongFeedback(current);
    spellingCurrentChecked = false;
    syncSpellingState();
    spellingNextBtn.disabled = true;
    // Clicking Check moved focus onto the button; hand it back so the child can
    // fix the spelling straight away.
    spellingInput.focus({ preventScroll: true });
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
  syncSpellingHintTiles();
  // Editing the guess after a correct check invalidates it — require another
  // check before Next works again, so a stale "correct" state can't be used
  // to skip past a word that was quietly changed.
  if (spellingCurrentChecked) {
    spellingCurrentChecked = false;
    spellingNextBtn.disabled = true;
  }
  syncSpellingState();
  spellingCheer();
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
  const tot = spellingScore.total;
  const state = tot === 0 ? "none" : words.length ? "some" : "perfect";
  spellingReport.dataset.state = state;
  const big = tot >= 5;
  spellingReportMsg.textContent = state === "none" ? t("spReportNone") : state === "some" ? t("spReportSome", words.length) : t(big ? "spReportPerfect" : "spReportGoodStart");
  const pct = tot ? Math.round((spellingScore.correct / tot) * 100) : 0;
  spellingReportPct.hidden = !(currentStreakStatus().count > 0);
  spellingReportPct.textContent = t("spReportStreak", currentStreakStatus().count || 0);
  const starEl = document.getElementById("spelling-report-star");
  starEl.hidden = spellingScore.correct <= 0;
  starEl.textContent = t("spReportStars", spellingScore.correct);
  const flLayer = document.getElementById("spelling-report-fl");
  flLayer.innerHTML = state === "perfect" ? ["⭐", "✨", "💚", "⭐", "✨", "💛"].map((c, i) => `<span class="sr-fl" style="--i:${i}">${c}</span>`).join("") : "";
  const rv = document.getElementById("spelling-report-review");
  rv.hidden = !words.length;
  rv.textContent = t("spReportReview");
  spellingReport.classList.toggle("sr-big", state === "perfect" && big);
  if (!spellingReportKoala.firstChild) spellingReportKoala.innerHTML = SPELL_KOALA_SVG;
  spellingReportKoala.classList.toggle("sp-cheer", state === "perfect" || (state === "some" && spellingScore.correct > 0));

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

    row.classList.add("sp-report-row");
    row.addEventListener("click", () => speak(w.word));
    spellingReportList.appendChild(row);
  });

  spellingReportScoreEl.textContent = tot ? t("spReportScore", spellingScore.correct, tot, pct) : t("spellingTodayScore", 0, 0);
}

spellingFinishBtn.addEventListener("click", renderSpellingReport);
document.getElementById("spelling-report-level")?.addEventListener("click", () => document.getElementById("level-badge")?.click());
document.getElementById("spelling-report-game")?.addEventListener("click", () => goToTab("typegame"));

spellingReportRestartBtn.addEventListener("click", () => {
  buildSpellingDeck();
});

const syncSpellingGoalDd = enhanceSelect(spellingGoalSelect, 6);
spellingGoalSelect.addEventListener("change", () => {
  if (spellingGoalSelect.value === "more") {
    spellingGoalSelect.value = String(goals.spelling); // nothing changes; just the nudge
    syncSpellingGoalDd();
    if (!currentUser) promptSignupForMoreQuestions();
    else if (currentUser.role === "free") openUpgradeOverlay();
    return;
  }
  const n = parseInt(spellingGoalSelect.value, 10);
  if (!(n > 0)) return;
  goals.spelling = n;
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
let typeGameMissed = new Set(); // words missed this round, for the Review recap

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
  renderTypeGameHearts();
}

/* ---------- HUD hearts ----------
   Glossy 3D heart icons (SVG, gradients live in the hidden #tg-heart-* defs in
   index.html) instead of emoji. The DOM is only rebuilt when the life count
   actually changes, so the "heart just broke" animation plays exactly once. */
const TG_HEART_PATH = "M12 21.2C5.2 15.6 2.2 12.1 2.2 8.3 2.2 5.3 4.5 3 7.4 3c1.9 0 3.6 1 4.6 2.6C13 4 14.7 3 16.6 3c2.9 0 5.2 2.3 5.2 5.3 0 3.8-3 7.3-9.8 12.9z";
let typeGameHeartsRendered = -1;

function typeGameHeartSvg(full) {
  return (
    `<svg class="tg-heart-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">` +
    `<path class="tg-heart-shape" d="${TG_HEART_PATH}" fill="url(#${full ? "tg-heart-fill" : "tg-heart-empty"})"/>` +
    (full
      ? `<path class="tg-heart-shine" d="M6.2 6.1c.7-1.1 2-1.6 3.2-1.2" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" opacity=".85"/>`
      : `<path class="tg-heart-crack" d="M12 6.8l-1.6 3.1 2.2 1.5-1.7 3.3" fill="none" stroke="#8d97b3" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" opacity=".8"/>`) +
    `</svg>`
  );
}

function renderTypeGameHearts() {
  const lives = Math.max(typeGameLives, 0);
  if (typeGameHeartsRendered === lives) return;
  const prev = typeGameHeartsRendered;
  typeGameHeartsRendered = lives;
  let html = "";
  for (let i = 0; i < TYPEGAME_LIVES; i++) {
    const full = i < lives;
    let cls = "tg-heart" + (full ? " tg-heart-full" : " tg-heart-empty");
    if (prev >= 0 && lives < prev && i >= lives && i < prev) cls += " tg-heart-break"; // just lost
    else if (prev >= 0 && lives > prev && i >= prev && i < lives) cls += " tg-heart-in"; // just refilled
    html += `<span class="${cls}">${typeGameHeartSvg(full)}</span>`;
  }
  typeGameLivesEl.innerHTML = html;
  typeGameLivesEl.setAttribute("role", "img");
  typeGameLivesEl.setAttribute("aria-label", currentLang === "ko" ? `목숨 ${lives}/${TYPEGAME_LIVES}` : `Lives ${lives} of ${TYPEGAME_LIVES}`);
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

// The start screen's two little chips: which level's words will fall, and this
// level's best score so far (hidden until there is one).
function updateTypeGameStartChips() {
  const levelEl = document.getElementById("typegame-start-level");
  const bestEl = document.getElementById("typegame-start-best");
  if (!levelEl || !bestEl) return;
  levelEl.textContent = `📚 ${levelLabel(currentLevel)}`;
  const best = typeGameHighScores[typeGameHighScoreKey()] || 0;
  bestEl.hidden = best <= 0;
  bestEl.textContent = `🏆 ${currentLang === "ko" ? "최고 점수" : "Best"} ${best}`;
}

function resetTypeGame() {
  kb("type")?.reset();
  typeGameActive.forEach((w) => w.el.remove());
  typeGameActive = [];
  typeGameScore = 0;
  typeGameWordsCleared = 0;
  typeGameRoundSolved = new Set();
  typeGameMissed = new Set();
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
  updateTypeGameStartChips();
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
  typeGameMissed = new Set();
  typeGameLives = TYPEGAME_LIVES;
  typeGameSpeedLevel = TYPEGAME_SPEED_LEVEL_MIN;
  updateTypeGameSpeedUI();
  typeGameSpawnInterval = TYPEGAME_SPAWN_START;
  typeGameStageIndex = 0;
  typeGameActive.forEach((w) => w.el.remove());
  typeGameActive = [];
  typeGameWordsEl.querySelectorAll(".tg-hit, .tt-fx, .typegame-pop-fx").forEach((n) => n.remove());
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

  const el = buildTypeGameObject(word);
  typeGameWordsEl.appendChild(el);
  const startTop = placeFallingItem(el, typeGameWordsEl, typeGameActive);

  typeGameActive.push({
    text: word,
    el,
    top: startTop,
    h: el.offsetHeight || 48, // balloons/leaves/clouds are taller than the old capsule, so "reached the bottom" uses the item's own height
    c1: el.style.getPropertyValue("--tg-c1"),
  });
}

/* ---------- Falling objects: balloons, eucalyptus leaves and clouds ----------
   Each falling word is drawn as a soft 3D object instead of a plain capsule. The
   kind and colours are purely cosmetic (CSS variables --tg-c1/--tg-c2 drive the
   gradients in style.css). The text keeps the same .tw-typed / .tw-rest spans the
   matching code already updates, so typing/scoring logic is untouched. */
const TYPEGAME_OBJECT_KINDS = {
  balloon: [["#ff8da1", "#e8476a"], ["#6ec3ff", "#3a86e0"], ["#ffb36b", "#ee7a2a"], ["#b9a2ff", "#7b5be2"], ["#58dcb8", "#1fa688"]],
  leaf: [["#7fd9a8", "#2e9a6b"], ["#8fdc8a", "#3d9c48"], ["#6cc9b4", "#2a8f84"]],
  cloud: [["#9fd3ff", "#5b9be0"], ["#d0b8ff", "#8a6be0"], ["#ffc4d6", "#e8708f"]],
};
let typeGameLastObjectKind = "";

function buildTypeGameObject(word) {
  // never the same kind twice in a row, so the sky always looks mixed
  const kinds = Object.keys(TYPEGAME_OBJECT_KINDS).filter((k) => k !== typeGameLastObjectKind);
  const kind = kinds[Math.floor(Math.random() * kinds.length)];
  typeGameLastObjectKind = kind;
  const palette = TYPEGAME_OBJECT_KINDS[kind];
  const [c1, c2] = palette[Math.floor(Math.random() * palette.length)];

  const el = document.createElement("div");
  el.className = `typegame-word tg-obj tg-${kind}`;
  el.style.setProperty("--tg-c1", c1);
  el.style.setProperty("--tg-c2", c2);
  el.style.setProperty("--tg-tilt", `${(Math.random() * 6 - 3).toFixed(1)}deg`);
  el.style.setProperty("--tg-float-delay", `${(-Math.random() * 3).toFixed(2)}s`);
  el.setAttribute("aria-label", word);
  el.innerHTML =
    `<span class="tg-shadow" aria-hidden="true"></span>` +
    `<span class="tg-body"><span class="tg-text"><span class="tw-typed"></span><span class="tw-rest"></span></span>` +
    `<span class="tg-reticle" aria-hidden="true"><i></i><i></i><i></i><i></i></span></span>` +
    `<span class="tg-obj-tail" aria-hidden="true"></span>` +
    `<i class="tg-sp tg-sp1" aria-hidden="true">✦</i><i class="tg-sp tg-sp2" aria-hidden="true">★</i><i class="tg-sp tg-sp3" aria-hidden="true">✦</i>`;
  el.querySelector(".tw-rest").textContent = word;
  return el;
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
    // Lost when the object's bottom edge reaches the floor (for the old 34px capsule this was the same spot as before).
    if (w.top > stageHeight - (w.h || 34) + 4) {
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
  if (missedWord) typeGameMissed.add(missedWord);
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

/* ---------- Hit confetti ----------
   On a correct answer the object scales up and fades out (.tw-cleared) while a
   burst of coloured paper pieces, leaf-shaped bits and sparkles flies out of it
   and drops with a little gravity, plus a "+score" pop-up. Pure CSS animation —
   JS only places the pieces and sets their --dx/--dy/--rot variables. */
const TYPEGAME_CONFETTI_COLORS = ["#ff6b8b", "#ffd43b", "#4dc9f6", "#5fe0b0", "#b197fc", "#ff9f43", "#ffffff"];
const TYPEGAME_CONFETTI_SHAPES = ["rect", "rect", "dot", "strip", "leaf", "star"];
const TYPEGAME_CONFETTI_PIECES = 22;

function spawnTypeGameConfetti(el, scoreGain) {
  const box = typeGameWordsEl.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  const cx = Math.min(Math.max(r.left - box.left + r.width / 2, 12), Math.max(box.width - 12, 12));
  const cy = Math.max(r.top - box.top + r.height / 2, 14);

  // "+50" pop-up, kept fully inside the play area (same look as the Times Table's score pop)
  const pop = document.createElement("div");
  pop.className = "tt-fx tt-score-pop";
  pop.textContent = `+${scoreGain}`;
  pop.style.left = `${Math.min(Math.max(cx, 40), Math.max(box.width - 40, 40))}px`;
  pop.style.top = `${Math.max(cy - 20, 24)}px`;
  typeGameWordsEl.appendChild(pop);
  setTimeout(() => pop.remove(), 1100);

  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const own = el.style.getPropertyValue("--tg-c1");
  const frag = document.createDocumentFragment();
  for (let i = 0; i < TYPEGAME_CONFETTI_PIECES; i++) {
    const shape = TYPEGAME_CONFETTI_SHAPES[i % TYPEGAME_CONFETTI_SHAPES.length];
    const s = document.createElement("i");
    s.className = `tg-hit tg-cf-${shape}`;
    // every 4th piece wears the popped object's own colour, the rest are party colours
    const color = i % 4 === 0 && own ? own : TYPEGAME_CONFETTI_COLORS[Math.floor(Math.random() * TYPEGAME_CONFETTI_COLORS.length)];
    s.style.setProperty("--c", color);
    const ang = (Math.PI * 2 * i) / TYPEGAME_CONFETTI_PIECES + Math.random() * 0.45;
    const dist = 36 + Math.random() * 62;
    s.style.left = `${cx}px`;
    s.style.top = `${cy}px`;
    s.style.setProperty("--dx", `${(Math.cos(ang) * dist).toFixed(1)}px`);
    s.style.setProperty("--dy", `${(Math.sin(ang) * dist - 22).toFixed(1)}px`);
    s.style.setProperty("--fall", `${(34 + Math.random() * 40).toFixed(0)}px`);
    s.style.setProperty("--rot", `${Math.round((Math.random() - 0.5) * 720)}deg`);
    s.style.setProperty("--dur", `${(0.75 + Math.random() * 0.35).toFixed(2)}s`);
    frag.appendChild(s);
    setTimeout(() => s.remove(), 1200);
  }
  typeGameWordsEl.appendChild(frag);
}

function clearTypeGameWord(word) {
  recordSrsResult(word.text, true);
  recordResult(word.text, true, "typing");
  typeGameRoundSolved.add(word.text);
  const gain = word.text.length * 10;
  spawnTypeGamePopFx(word.el);
  spawnTypeGameConfetti(word.el, gain);
  word.el.classList.add("tw-cleared");
  setTimeout(() => word.el.remove(), 450);
  typeGameActive = typeGameActive.filter((w) => w !== word);

  typeGameScore += gain;
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
  typeGameLives = 0; // game is over: the HUD hearts show empty even after a manual end
  renderTypeGameHearts();

  const key = typeGameHighScoreKey();
  const prevBest = typeGameHighScores[key] || 0;
  const isNewBest = typeGameScore > prevBest;
  if (isNewBest) {
    typeGameHighScores[key] = typeGameScore;
    saveTypeGameHighScores();
  }
  typeGameFinalScoreEl.textContent = t("typeGameFinalScore", typeGameScore);
  typeGameHighScoreEl.textContent = isNewBest ? t("typeGameNewHighScore") : t("typeGameHighScore", Math.max(prevBest, typeGameScore));
  showGameOverScreen("typegame", {
    correct: typeGameWordsCleared,
    isNewBest,
    reason: "lives",
    encourage: TYPEGAME_ENCOURAGE_MESSAGES,
    missed: [...typeGameMissed].map((word) => {
      const info = findWordInfo(word);
      return { title: word, sub: info && info.definition ? info.definition : "", say: word };
    }),
  });
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

// --- Refactor additions: compact guide, number pad, combo + mascot. Declared up
// here (not next to the code that uses them) so they exist before any code path
// like resetTimesTable() can run at startup.
const timesTableCard = document.querySelector("#view-timestable > .card");
const timesTableGuide = document.getElementById("timestable-guide");
const timesTableGuideClose = document.getElementById("timestable-guide-close");
const timesTableHelpBtn = document.getElementById("timestable-help-btn");
const timesTableKeypad = document.getElementById("timestable-keypad");
const timesTableKeypadToggle = document.getElementById("timestable-keypad-toggle");
const timesTableComboBadge = document.getElementById("timestable-combo");
const timesTableKoalaSlot = document.getElementById("timestable-koala-slot");
const TIMESTABLE_GUIDE_SEEN_KEY = "ywp_timestable_guide_seen_v1";
const TIMESTABLE_GUIDE_AUTO_ROUNDS = 2; // the guide pops up by itself for this many rounds, then only via the "?" button
const TIMESTABLE_KEYPAD_KEY = "ywp_timestable_keypad_v1";
const TIMESTABLE_COMBO_MIN = 3; // streak length where the "N Combo!" badge starts
const TIMESTABLE_FAST_FRACTION = 0.4; // cleared while still in the top 40% of the stage = "Super Fast!"
let timesTableCombo = 0;
let timesTableComboTimer = null;
let timesTableKoalaTalkTimer = null;

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
  const ttDemoHtml =
    `<span class="tt-demo" aria-hidden="true">` +
      `<span class="tt-demo-problem">8 × 2</span>` +
      `<span class="tt-demo-input"><span class="tt-d tt-d1">8</span><span class="tt-d tt-d2">2</span><span class="tt-d tt-d3">16</span><span class="tt-ok">✔</span></span>` +
    `</span>` +
    `<span class="ti-line ti-caption">${t("timesTableDemoCaption")}</span>` +
    `<span class="ti-line ti-caption">${t("timesTableDemoCaption2")}</span>` +
    `<span class="ti-line ti-chips">` +
      `<span class="ti-chip">8216</span><span class="ti-chip">82 16</span><span class="ti-chip">8 2 16</span></span>`;
  timesTableStartMessage.innerHTML = ttDemoHtml;
  const startDemo = document.getElementById("timestable-start-demo");
  if (startDemo) startDemo.innerHTML = ttDemoHtml;
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
let timesTableMissed = new Set(); // facts ("{a}x{b}") missed this round, for the Review recap

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
      if (raw === "[]") return new Set();
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
  timesTableMaxTable = timesTableSelected.size ? Math.max(...timesTableSelected) : TIMESTABLE_DEFAULT_MAX_TABLE;
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

function timesTableIsRange(lo, hi) {
  if (timesTableSelected.size !== hi - lo + 1) return false;
  for (let n = lo; n <= hi; n++) if (!timesTableSelected.has(n)) return false;
  return true;
}
function timesTableRangeLabel() {
  const arr = [...timesTableSelected].sort((x, y) => x - y);
  if (arr.length === 0) return t("timesTableNone");
  if (timesTableIsRange(TIMESTABLE_MIN_TABLE, TIMESTABLE_DEFAULT_MAX_TABLE)) return t("timesTableLabelDefault");
  if (timesTableIsRange(TIMESTABLE_MIN_TABLE, TIMESTABLE_MAX_TABLE_CAP)) return t("timesTableLabelAll");
  if (arr.length === 1) return t("timesTableOne", arr[0]);
  return t("timesTableMany", arr.length);
}

function applyTimesTableSelection() {
  saveTimesTableMaxTable();
  timesTableProblemPool = buildTimesTableProblemPool();
  updateTimesTableMaxTableUI();
}

// Start screen chips (same idea as Typing Game): which tables are on, and the best score so far.
function updateTimesTableStartChips() {
  const rangeEl = document.getElementById("timestable-start-range");
  const bestEl = document.getElementById("timestable-start-best");
  if (!rangeEl || !bestEl) return;
  rangeEl.textContent = `📚 ${timesTableRangeLabel()}`;
  let best = 0;
  try {
    best = timesTableHighScores[timesTableHighScoreKey()] || 0;
  } catch (e) {
    /* high scores not loaded yet */
  }
  bestEl.hidden = best <= 0;
  bestEl.textContent = `🏆 ${currentLang === "ko" ? "최고 점수" : "Best"} ${best}`;
}

function updateTimesTableMaxTableUI() {
  updateTimesTableStartChips();
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
        timesTableSelected.delete(n);
      } else {
        timesTableSelected.add(n);
      }
      applyTimesTableSelection();
    });
    timesTableRangeGrid.appendChild(c);
  }
  const defBtn = document.getElementById("timestable-range-default");
  const allBtn = document.getElementById("timestable-range-all");
  defBtn.textContent = t("timesTableLabelDefault");
  allBtn.textContent = t("timesTableLabelAll");
  defBtn.classList.toggle("on", timesTableIsRange(TIMESTABLE_MIN_TABLE, TIMESTABLE_DEFAULT_MAX_TABLE));
  allBtn.classList.toggle("on", timesTableIsRange(TIMESTABLE_MIN_TABLE, TIMESTABLE_MAX_TABLE_CAP));
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
  timesTableSelected = timesTableIsRange(TIMESTABLE_MIN_TABLE, TIMESTABLE_DEFAULT_MAX_TABLE) ? new Set() : defaultTimesTableSelection();
  applyTimesTableSelection();
});
document.getElementById("timestable-range-all").addEventListener("click", () => {
  const wasAll = timesTableIsRange(TIMESTABLE_MIN_TABLE, TIMESTABLE_MAX_TABLE_CAP);
  timesTableSelected = new Set();
  if (!wasAll) for (let n = TIMESTABLE_MIN_TABLE; n <= TIMESTABLE_MAX_TABLE_CAP; n++) timesTableSelected.add(n);
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

let timesTableHeartsRendered = -1;
function renderTimesTableHearts() {
  const lives = Math.max(timesTableLives, 0);
  if (timesTableHeartsRendered === lives) return;
  const prev = timesTableHeartsRendered;
  timesTableHeartsRendered = lives;
  let html = "";
  for (let i = 0; i < TIMESTABLE_LIVES; i++) {
    const full = i < lives;
    let cls = "tg-heart" + (full ? " tg-heart-full" : " tg-heart-empty");
    if (prev >= 0 && lives < prev && i >= lives && i < prev) cls += " tg-heart-break";
    else if (prev >= 0 && lives > prev && i >= prev && i < lives) cls += " tg-heart-in";
    html += `<span class="${cls}">${typeGameHeartSvg(full)}</span>`;
  }
  timesTableLivesEl.innerHTML = html;
  timesTableLivesEl.setAttribute("role", "img");
  timesTableLivesEl.setAttribute("aria-label", currentLang === "ko" ? `목숨 ${lives}/${TIMESTABLE_LIVES}` : `Lives ${lives} of ${TIMESTABLE_LIVES}`);
}

function updateTimesTableHud() {
  timesTableScoreEl.textContent = t("timesTableScoreLabel", timesTableScore);
  timesTableStageTagEl.textContent = t("timesTableStageLabel", timesTableStageIndex + 1);
  renderTimesTableHearts();
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
  ttKb((b) => b.reset());
  resetTimesTableCombo();
  timesTableActive.forEach((w) => w.el.remove());
  timesTableActive = [];
  timesTableScore = 0;
  timesTableCorrectCount = 0;
  timesTableProblemsShown = 0;
  timesTableStageIndex = 0;
  timesTableRoundSolved = new Set();
  timesTableMissed = new Set();
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
  updateTimesTableStartChips();
  timesTableStartOverlay.hidden = false;
  // Waiting screen: show the "How to answer" pop-up on its own for the first couple of rounds.
  setTimesTableGuideOpen(timesTableGuideSeenCount() < TIMESTABLE_GUIDE_AUTO_ROUNDS, true);
}

function startTimesTable() {
  timesTableProblemPool = buildTimesTableProblemPool();
  if (timesTableProblemPool.length === 0) {
    // nothing selected: open the picker (after the click finishes bubbling)
    setTimeout(() => {
      timesTableRangePanel.hidden = false;
      timesTableRangeBtn.setAttribute("aria-expanded", "true");
    }, 0);
    return;
  }
  ttKb((b) => b.reset());
  resetTimesTableCombo();
  setTimesTableGuideOpen(false);
  bumpTimesTableGuideSeen();
  timesTableRunning = true;
  updateTimesTableMaxTableUI();
  timesTablePaused = false;
  timesTableScore = 0;
  timesTableCorrectCount = 0;
  timesTableProblemsShown = 0;
  timesTableStageIndex = 0;
  timesTableRoundSolved = new Set();
  timesTableMissed = new Set();
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

// The arcade objects are much bigger than the old capsules, so only as many as
// physically fit in the play area (minus one for breathing room) are alive at once.
// A skipped spawn simply happens on the next tick and doesn't count as a problem shown.
function timesTableObjectCap() {
  const cols = Math.max(1, Math.floor(timesTableWordsEl.clientWidth / 108));
  const rows = Math.max(1, Math.floor(timesTableStage.clientHeight / 100));
  return Math.max(3, cols * rows - 1);
}

function spawnTimesTableProblem() {
  if (timesTableProblemsShown >= timesTableMaxProblems()) return;
  if (timesTableActive.length >= timesTableObjectCap()) return;

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

  const el = buildTimesTableObject(problem);
  timesTableWordsEl.appendChild(el);
  const startTop = placeFallingItem(el, timesTableWordsEl, timesTableActive);

  timesTableActive.push({
    display: timesTableDisplay(problem),
    expected: timesTableExpected(problem),
    key: timesTableKey(problem),
    el,
    top: startTop,
    h: el.offsetHeight || 34, // objects are taller than the old capsule, so "reached the bottom" uses the item's own height
  });
}

/* ---------- Falling objects: quiz balloons, eucalyptus leaves and stars ----------
   Each equation is drawn as a chunky arcade object instead of a plain capsule.
   The kind and colours are purely cosmetic (CSS variables --tt-c1/--tt-c2 drive the
   gradients in style.css); matching and scoring still read item.expected only. */
const TIMESTABLE_OBJECT_KINDS = {
  balloon: [["#ff6b6b", "#c9293a"], ["#4dabf7", "#1d62b8"], ["#ff922b", "#d4561a"], ["#b197fc", "#6a45c9"], ["#38d9a9", "#12805f"]],
  leaf: [["#5cc79a", "#2a8a63"], ["#6fd0a8", "#2f8f78"], ["#86d36f", "#3a9440"]],
  star: [["#ffd43b", "#f08c00"], ["#ffe066", "#f59f00"]],
};
let timesTableLastObjectKind = "";

function buildTimesTableObject(problem) {
  const kinds = Object.keys(TIMESTABLE_OBJECT_KINDS).filter((k) => k !== timesTableLastObjectKind); // never the same kind twice in a row
  const kind = kinds[Math.floor(Math.random() * kinds.length)];
  timesTableLastObjectKind = kind;
  const palette = TIMESTABLE_OBJECT_KINDS[kind];
  const [c1, c2] = palette[Math.floor(Math.random() * palette.length)];

  const el = document.createElement("div");
  el.className = `typegame-word timestable-eq tt-obj tt-${kind}`;
  el.style.setProperty("--tt-c1", c1);
  el.style.setProperty("--tt-c2", c2);
  el.style.setProperty("--tt-tilt", `${(Math.random() * 8 - 4).toFixed(1)}deg`);
  el.style.setProperty("--tt-sway-delay", `${(-Math.random() * 3).toFixed(2)}s`);
  el.setAttribute("aria-label", timesTableDisplay(problem));
  el.innerHTML =
    `<span class="tt-obj-body"><span class="tt-eq-main">${problem.a} × ${problem.b}</span><span class="tt-eq-q">= ?</span></span>` +
    `<span class="tt-obj-tail" aria-hidden="true"></span>` +
    `<i class="tt-sp tt-sp1" aria-hidden="true">✦</i><i class="tt-sp tt-sp2" aria-hidden="true">★</i><i class="tt-sp tt-sp3" aria-hidden="true">✦</i>`;
  return el;
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
    // Lost when the object's bottom edge reaches the floor (for the old 34px capsule this was the same spot as before).
    if (w.top > stageHeight - w.h + 4) {
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
  if (missedKey) timesTableMissed.add(missedKey);
  timesTableLives--;
  resetTimesTableCombo();
  ttKb((b) => b.oops());
  ttKoalaTalk();
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
  // "Super Fast!" = answered while the object was still high up in the play area.
  const fast = item.top < timesTableStage.clientHeight * TIMESTABLE_FAST_FRACTION;
  spawnTimesTablePopFx(item.el);
  celebrateTimesTableAnswer(item, fast);
  item.el.classList.remove("tw-lock");
  item.el.classList.add("tw-cleared");
  setTimeout(() => item.el.remove(), 300);
  timesTableActive = timesTableActive.filter((w) => w !== item);

  timesTableScore += TIMESTABLE_POINTS_PER_CORRECT;
  timesTableCorrectCount++;
  ttKb((b) => b.eat(Math.min(timesTableCorrectCount / KB_GAME_FULL, 1), timesTableCorrectCount >= KB_GAME_FULL, true));
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
  ttKb((b) => b.over());
  resetTimesTableCombo();
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
  timesTableLives = 0; // game is over: the HUD hearts show empty even after a manual end
  renderTimesTableHearts();

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

  showGameOverScreen("timestable", {
    correct: timesTableCorrectCount,
    isNewBest,
    reason,
    encourage: TIMESTABLE_ENCOURAGE_MESSAGES,
    missed: [...timesTableMissed].map((key) => {
      const [a, b] = key.split("x").map(Number);
      return { title: `${a} × ${b} = ${a * b}`, sub: "", say: "" };
    }),
  });
  timesTableOverOverlay.hidden = false;
}

function showTimesTableTypo() {
  resetTimesTableCombo(); // a wrong guess breaks the streak
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

// Enter (keyboard or the on-screen ↵ key): a guess that isn't the start of any
// falling answer is a typo; anything that still could match is left alone.
function submitTimesTableGuess() {
  if (!timesTableRunning) return;
  const val = timesTableInput.value.replace(/\s+/g, "");
  if (!val) return;
  const isValidPrefix = timesTableActive.some((item) => item.expected.startsWith(val));
  if (!isValidPrefix) {
    showTimesTableTypo();
    timesTableInput.value = "";
    clearTimesTableHighlights();
  }
}

timesTableInput.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" || !timesTableRunning) return;
  e.preventDefault();
  submitTimesTableGuess();
});

// Keep the answer box focused for the whole round. Starting a round and resuming
// already focus it; this also puts focus back when it drifts off (a tap on the
// play area or empty space) — unless it moved to a real control such as Pause or
// the keypad, which must keep working.
function keepTimesTableFocus() {
  if (!timesTableRunning || timesTableInput.disabled) return;
  const a = document.activeElement;
  if (a === timesTableInput) return;
  if (a && a !== document.body && a.matches("button, a, input, select, textarea, summary, [tabindex]")) return;
  timesTableInput.focus({ preventScroll: true });
}
timesTableInput.addEventListener("blur", () => setTimeout(keepTimesTableFocus, 0));

/* ---------- Compact "How to answer" guide ----------
   The big always-visible guide box is gone. The full demo now lives in a small
   pop-up card that opens by itself on the waiting screen for the first
   TIMESTABLE_GUIDE_AUTO_ROUNDS rounds; after that it only opens from the "?"
   button. While a round is running it is never shown — a single tip line under
   the answer box is all that stays. */
function timesTableGuideSeenCount() {
  try {
    return parseInt(localStorage.getItem(TIMESTABLE_GUIDE_SEEN_KEY), 10) || 0;
  } catch (e) {
    return 0;
  }
}

function bumpTimesTableGuideSeen() {
  try {
    localStorage.setItem(TIMESTABLE_GUIDE_SEEN_KEY, String(timesTableGuideSeenCount() + 1));
  } catch (e) {
    /* private mode: the guide just keeps auto-showing, which is harmless */
  }
}

// auto = opened by the game itself on the waiting screen (not by the "?" button).
// An automatic guide ignores outside clicks — otherwise the very click that opened
// this tab would bubble up and close it again straight away.
function setTimesTableGuideOpen(open, auto = false) {
  timesTableGuide.hidden = !open;
  timesTableGuide.dataset.auto = open && auto ? "1" : "";
  timesTableHelpBtn.setAttribute("aria-expanded", open ? "true" : "false");
}

timesTableHelpBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  if (timesTableCard.classList.contains("tt-live")) return;
  setTimesTableGuideOpen(timesTableGuide.hidden);
});
timesTableGuideClose.addEventListener("click", () => setTimesTableGuideOpen(false));
timesTableGuide.addEventListener("click", (e) => e.stopPropagation());
document.addEventListener("click", () => {
  if (!timesTableGuide.hidden && !timesTableGuide.dataset.auto) setTimesTableGuideOpen(false);
});

/* ---------- Round state -> card class ----------
   .tt-live is on while a round is on screen (start and game-over overlays both
   hidden). CSS uses it to show the koala mascot and hide the "?" button; here
   it also keeps the guide closed and the number pad in step with the answer box. */
function syncTimesTableChrome() {
  const live = timesTableStartOverlay.hidden && timesTableOverOverlay.hidden;
  timesTableCard.classList.toggle("tt-live", live);
  if (live) setTimesTableGuideOpen(false);
  syncTimesTableKeypadEnabled();
}
new MutationObserver(syncTimesTableChrome).observe(timesTableStartOverlay, { attributes: true, attributeFilter: ["hidden"] });
new MutationObserver(syncTimesTableChrome).observe(timesTableOverOverlay, { attributes: true, attributeFilter: ["hidden"] });

/* ---------- On-screen number pad ----------
   Optional, for tablets and phones. The 🔢 button in the play area turns it on or
   off; the choice is remembered. On touch screens it starts out ON (and then the
   answer box asks the OS keyboard to stay away, inputmode="none"). The keys just
   edit the answer box and fire the same "input" event typing does, so matching,
   locking on and scoring are all shared with the keyboard path. */
function timesTableKeypadWanted() {
  try {
    const saved = localStorage.getItem(TIMESTABLE_KEYPAD_KEY);
    if (saved === "1") return true;
    if (saved === "0") return false;
  } catch (e) {
    /* fall through to the device default */
  }
  return window.matchMedia("(pointer: coarse)").matches;
}

function applyTimesTableKeypad(on, persist) {
  timesTableKeypad.hidden = !on;
  timesTableCard.classList.toggle("tt-keypad-on", on);
  timesTableKeypadToggle.setAttribute("aria-pressed", on ? "true" : "false");
  timesTableInput.setAttribute("inputmode", on ? "none" : "numeric");
  if (persist) {
    try {
      localStorage.setItem(TIMESTABLE_KEYPAD_KEY, on ? "1" : "0");
    } catch (e) {
      /* not saved, still works for this visit */
    }
  }
  // Re-focusing is what makes the OS keyboard follow the new inputmode.
  if (timesTableRunning) {
    timesTableInput.blur();
    timesTableInput.focus({ preventScroll: true });
  }
}

function syncTimesTableKeypadEnabled() {
  const idle = timesTableInput.disabled;
  timesTableKeypad.classList.toggle("tt-idle", idle);
  timesTableKeypad.querySelectorAll(".tt-key").forEach((k) => {
    k.disabled = idle;
  });
}

function pressTimesTableKey(key) {
  if (!timesTableRunning) return;
  if (key === "enter") {
    submitTimesTableGuess();
  } else {
    timesTableInput.value = key === "back" ? timesTableInput.value.slice(0, -1) : timesTableInput.value + key;
    timesTableInput.dispatchEvent(new Event("input", { bubbles: true }));
  }
  timesTableInput.focus({ preventScroll: true });
}

timesTableKeypad.addEventListener("mousedown", (e) => e.preventDefault()); // keep the answer box focused on desktop
timesTableKeypad.addEventListener("click", (e) => {
  const btn = e.target.closest(".tt-key");
  if (btn && !btn.disabled) pressTimesTableKey(btn.dataset.key);
});
timesTableKeypadToggle.addEventListener("click", () => applyTimesTableKeypad(timesTableKeypad.hidden, true));
new MutationObserver(syncTimesTableKeypadEnabled).observe(timesTableInput, { attributes: true, attributeFilter: ["disabled"] });
applyTimesTableKeypad(timesTableKeypadWanted(), false);
syncTimesTableChrome();

/* ---------- Combos, answer feedback and the koala mascot ---------- */
// Runs a callback on both koalas: the one in the start overlay and the live one in the stage.
function ttKb(fn) {
  const start = kb("tt");
  if (start) fn(start);
  const live = kb("ttlive");
  if (live) {
    live.silent = true; // its speech cloud is driven by ttKoalaTalk()/the cheer below, not the eating sequence
    fn(live);
  }
}

// The live koala's speech cloud is only visible for a moment after something happens.
function ttKoalaTalk(ms = 1700) {
  timesTableKoalaSlot.classList.add("tt-say");
  clearTimeout(timesTableKoalaTalkTimer);
  timesTableKoalaTalkTimer = setTimeout(() => timesTableKoalaSlot.classList.remove("tt-say"), ms);
}

// kind: "normal" | "combo" | "fast" -> decides the cheer and which line the cloud says.
function ttKoalaCheer(kind) {
  const live = kb("ttlive");
  if (!live) return;
  const msgKey = kind === "combo" ? "kbCombo" : kind === "fast" ? "kbFast" : "kbCheer";
  koalaReact("know", msgKey, live.scene, live.bubble, "kbIdle"); // happy eyes, arms up, sparkles
  live.scene.classList.remove("sp-cheer", "tt-hype");
  void live.scene.offsetWidth; // restart the jump
  live.scene.classList.add("sp-cheer");
  if (kind !== "normal") live.scene.classList.add("tt-hype");
  clearTimeout(live.scene._ttCheerT);
  live.scene._ttCheerT = setTimeout(() => live.scene.classList.remove("sp-cheer", "tt-hype"), 1100);
  ttKoalaTalk();
}

function resetTimesTableCombo() {
  timesTableCombo = 0;
  clearTimeout(timesTableComboTimer);
  timesTableComboBadge.hidden = true;
}

function showTimesTableComboBadge(n) {
  const tier = n >= 10 ? "mega" : n >= 5 ? "big" : "base";
  timesTableComboBadge.className = `tt-combo-badge tt-combo-${tier}`;
  timesTableComboBadge.textContent = `${n >= 10 ? "🌟" : "🔥"} ${t("ttCombo", n)}`;
  timesTableComboBadge.hidden = false;
  timesTableComboBadge.style.animation = "none";
  void timesTableComboBadge.offsetWidth; // restart the pop
  timesTableComboBadge.style.animation = "";
  clearTimeout(timesTableComboTimer);
  timesTableComboTimer = setTimeout(() => {
    timesTableComboBadge.hidden = true;
  }, 1500);
}

const TIMESTABLE_CONFETTI_COLORS = ["#ff6b6b", "#ffd43b", "#4dabf7", "#38d9a9", "#b197fc", "#ff922b"];
const TIMESTABLE_CONFETTI_GLYPHS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "×", "★"];

// Number confetti + a "+10! Perfect!" pop-up at the cleared object, then combo / koala reactions.
function celebrateTimesTableAnswer(item, fast) {
  timesTableCombo++;
  const combo = timesTableCombo;
  const box = timesTableWordsEl.getBoundingClientRect();
  const r = item.el.getBoundingClientRect();
  const cx = r.left - box.left + r.width / 2;
  const cy = r.top - box.top + r.height / 2;

  const label = fast ? t("ttSuperFast") : t("ttPerfect");
  const pop = document.createElement("div");
  pop.className = "tt-fx tt-score-pop" + (fast ? " tt-score-fast" : "");
  pop.textContent = `+${TIMESTABLE_POINTS_PER_CORRECT}! ${label}`;
  // keep it fully inside the play area even if the object is at an edge or still above the top
  pop.style.left = `${Math.min(Math.max(cx, 70), Math.max(box.width - 70, 70))}px`;
  pop.style.top = `${Math.max(cy - 18, 30)}px`;
  timesTableWordsEl.appendChild(pop);
  setTimeout(() => pop.remove(), 1100);

  const pieces = combo >= TIMESTABLE_COMBO_MIN ? 20 : 12;
  for (let i = 0; i < pieces; i++) {
    const s = document.createElement("span");
    s.className = "tt-fx tt-confetti";
    s.textContent = TIMESTABLE_CONFETTI_GLYPHS[Math.floor(Math.random() * TIMESTABLE_CONFETTI_GLYPHS.length)];
    s.style.color = TIMESTABLE_CONFETTI_COLORS[i % TIMESTABLE_CONFETTI_COLORS.length];
    const ang = (Math.PI * 2 * i) / pieces + Math.random() * 0.5;
    const dist = 46 + Math.random() * 56;
    s.style.left = `${Math.min(Math.max(cx, 10), box.width - 10)}px`;
    s.style.top = `${Math.max(cy, 10)}px`;
    s.style.setProperty("--dx", `${(Math.cos(ang) * dist).toFixed(1)}px`);
    s.style.setProperty("--dy", `${(Math.sin(ang) * dist - 24).toFixed(1)}px`);
    s.style.setProperty("--rot", `${Math.round((Math.random() - 0.5) * 540)}deg`);
    s.style.fontSize = `${(0.85 + Math.random() * 0.6).toFixed(2)}rem`;
    timesTableWordsEl.appendChild(s);
    setTimeout(() => s.remove(), 1000);
  }

  if (combo >= TIMESTABLE_COMBO_MIN) showTimesTableComboBadge(combo);
  ttKoalaCheer(combo >= TIMESTABLE_COMBO_MIN ? "combo" : fast ? "fast" : "normal");
}

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

/* ---------- Game Over screen (shared by Typing Game + Times Table) ----------
   Koala mascot + title (NEW RECORD / Good Job / Keep Going), 1-3 stars that pop
   in one after another, a big Play Again button and an optional "Review" panel
   listing what was missed this round. */
const GAMEOVER_STAR_STEPS = [5, 10, 20]; // correct answers needed for 1 / 2 / 3 stars
function gameOverStars(correct) {
  return GAMEOVER_STAR_STEPS.filter((n) => correct >= n).length;
}

function launchGameOverConfetti(host) {
  host.textContent = "";
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const colors = ["#ffd54a", "#ff6b9d", "#4dd6a8", "#6cb7ff", "#ff9f43", "#b388ff"];
  for (let i = 0; i < 34; i++) {
    const p = document.createElement("i");
    p.className = "tg-conf";
    p.style.setProperty("--x", `${Math.round(Math.random() * 100)}%`);
    p.style.setProperty("--dx", `${Math.round(Math.random() * 80 - 40)}px`);
    p.style.setProperty("--d", `${(Math.random() * 0.7).toFixed(2)}s`);
    p.style.setProperty("--t", `${(1.8 + Math.random() * 1.4).toFixed(2)}s`);
    p.style.setProperty("--r", `${Math.round(Math.random() * 720 - 360)}deg`);
    p.style.background = colors[i % colors.length];
    host.appendChild(p);
  }
  setTimeout(() => host.querySelectorAll(".tg-conf").forEach((e) => e.remove()), 3800);
}

const GAMEOVER_SCENERY_SVG = `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
  <defs>
    <linearGradient id="tgSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4fb8ee"/><stop offset="0.65" stop-color="#a8e3f7"/><stop offset="1" stop-color="#fff1c9"/></linearGradient>
    <radialGradient id="tgSun"><stop offset="0" stop-color="#fff7c2"/><stop offset="0.45" stop-color="#ffe27a"/><stop offset="1" stop-color="#ffe27a" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="400" height="300" fill="url(#tgSky)"/>
  <g class="tg-sun"><circle cx="330" cy="52" r="46" fill="url(#tgSun)"/><circle cx="330" cy="52" r="19" fill="#ffd84d"/></g>
  <g class="tg-cloud tg-cloud-a" fill="#fff" opacity="0.9"><ellipse cx="70" cy="58" rx="30" ry="11"/><ellipse cx="92" cy="52" rx="20" ry="11"/><ellipse cx="52" cy="53" rx="16" ry="9"/></g>
  <g class="tg-cloud tg-cloud-b" fill="#fff" opacity="0.8"><ellipse cx="210" cy="30" rx="26" ry="9"/><ellipse cx="228" cy="25" rx="16" ry="9"/></g>
  <path d="M0 205 Q60 160 130 188 T270 176 T400 196 V300 H0Z" fill="#9fdcb4"/>
  <path d="M0 240 Q90 200 180 228 T400 222 V300 H0Z" fill="#6cc590"/>
  <g class="tg-gum tg-gum-l"><path d="M44 262 q4 -50 -2 -96 h12 q-4 46 0 96z" fill="#f3e9d6"/><path d="M48 200 q-14 -8 -22 -22" stroke="#e8dcc4" stroke-width="5" fill="none" stroke-linecap="round"/><ellipse cx="46" cy="150" rx="40" ry="26" fill="#4fa37a"/><ellipse cx="22" cy="168" rx="24" ry="16" fill="#5db58a"/><ellipse cx="74" cy="162" rx="24" ry="15" fill="#5db58a"/><ellipse cx="46" cy="136" rx="26" ry="14" fill="#74c79c"/></g>
  <g class="tg-gum tg-gum-r"><path d="M352 266 q-5 -56 2 -108 h12 q-6 52 -2 108z" fill="#f3e9d6"/><ellipse cx="358" cy="146" rx="42" ry="28" fill="#4fa37a"/><ellipse cx="334" cy="166" rx="22" ry="15" fill="#5db58a"/><ellipse cx="384" cy="162" rx="22" ry="16" fill="#5db58a"/><ellipse cx="360" cy="130" rx="28" ry="15" fill="#74c79c"/></g>
  <g class="tg-gum tg-gum-s" opacity="0.8"><path d="M130 230 q2 -26 0 -50 h6 q-2 24 0 50z" fill="#efe3cc"/><ellipse cx="133" cy="170" rx="22" ry="14" fill="#6cbf93"/></g>
  <g class="tg-gum tg-gum-s2" opacity="0.8"><path d="M286 228 q2 -24 0 -46 h6 q-2 22 0 46z" fill="#efe3cc"/><ellipse cx="289" cy="174" rx="20" ry="13" fill="#6cbf93"/></g>
  <g fill="#4a7d62" opacity="0.8"><path class="tg-bird tg-bird-a" d="M150 70 q6 -7 12 0 q6 -7 12 0" stroke="#4a7d62" stroke-width="2" fill="none" stroke-linecap="round"/><path class="tg-bird tg-bird-b" d="M250 96 q5 -6 10 0 q5 -6 10 0" stroke="#4a7d62" stroke-width="2" fill="none" stroke-linecap="round"/></g>
</svg>`;

let gameOverFxTimer = null;
function stopGameOverFireworks() {
  clearInterval(gameOverFxTimer);
  gameOverFxTimer = null;
}
function launchGameOverFireworks(host) {
  stopGameOverFireworks();
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const colors = ["#ffd54a", "#ff6b9d", "#4dd6a8", "#6cb7ff", "#ff9f43", "#b388ff", "#ffffff"];
  let waves = 0;
  [["tg-cannon-l", "🎉"], ["tg-cannon-r", "🎉"]].forEach(([c, e]) => {
    const el = document.createElement("span");
    el.className = `tg-cannon ${c}`;
    el.textContent = e;
    host.appendChild(el);
  });
  const burst = () => {
    if (!host.isConnected || host.closest("[hidden]")) return stopGameOverFireworks();
    const core = document.createElement("div");
    core.className = "tg-fw-core";
    core.style.setProperty("--fx", `${12 + Math.random() * 76}%`);
    core.style.setProperty("--fy", `${10 + Math.random() * 38}%`);
    const color = colors[Math.floor(Math.random() * colors.length)];
    core.style.setProperty("--fc", color);
    const n = 16;
    const dist = 34 + Math.random() * 30;
    for (let i = 0; i < n; i++) {
      const sp = document.createElement("i");
      sp.style.setProperty("--fa", `${Math.round((360 / n) * i + Math.random() * 12)}deg`);
      sp.style.setProperty("--fd", `${Math.round(dist * (0.8 + Math.random() * 0.4))}px`);
      core.appendChild(sp);
    }
    host.appendChild(core);
    setTimeout(() => core.remove(), 1300);
    if (++waves >= 10) stopGameOverFireworks();
  };
  burst();
  gameOverFxTimer = setInterval(burst, 450);
}

function showGameOverScreen(prefix, opts) {
  const $ = (s) => document.getElementById(`${prefix}-${s}`);
  const overlay = $("over-overlay");
  const stars = gameOverStars(opts.correct);
  const record = !!opts.isNewBest && stars >= 1;
  const card = overlay.querySelector(".tg-over-card");
  if (!overlay.querySelector(".tg-over-scenery")) {
    const scenery = document.createElement("div");
    scenery.className = "tg-over-scenery";
    scenery.innerHTML = GAMEOVER_SCENERY_SVG;
    overlay.insertBefore(scenery, overlay.firstChild);
  }

  // Title + optional encouragement line
  $("over-title").textContent = t(record ? "gameOverNewRecord" : stars >= 2 ? "gameOverGoodJob" : "gameOverKeepGoing");
  const enc = $("encourage-msg");
  if (!record && opts.reason === "lives" && opts.encourage) {
    const list = opts.encourage[currentLang] || opts.encourage.en;
    enc.textContent = list[Math.floor(Math.random() * list.length)];
    enc.hidden = false;
  } else {
    enc.hidden = true;
  }

  // Koala (always the brand mascot; celebrates on a record or a good run)
  const koala = card.querySelector(".tg-over-koala");
  koala.innerHTML = `<div class="kb-scene tg-koala${record ? " tg-koala-record fk-know" : stars >= 2 ? " tg-koala-good fk-know" : ""}">${record ? '<span class="tg-trophy">🏆</span><span class="tg-kiss" style="--kd:0s;--kx:34px;--ky:-30px;--kr:14deg">💋</span><span class="tg-kiss" style="--kd:0.12s;--kx:46px;--ky:-8px;--kr:-10deg">❤️</span><span class="tg-kiss" style="--kd:0.24s;--kx:26px;--ky:-50px;--kr:22deg">💖</span>' : ""}${SPELL_KOALA_SVG}</div>`;

  // Stars light up one by one
  const starsEl = $("stars");
  starsEl.setAttribute("aria-label", t("gameOverStarsLabel", stars));
  starsEl.classList.remove("tg-stars-go");
  starsEl.querySelectorAll(".tg-star").forEach((el, i) => {
    el.classList.toggle("on", i < stars);
    el.style.setProperty("--d", `${0.35 + i * 0.45}s`);
  });
  void starsEl.offsetWidth; // restart the animation
  starsEl.classList.add("tg-stars-go");

  // Confetti only for a new record
  const conf = overlay.querySelector(".tg-confetti");
  stopGameOverFireworks();
  if (record) {
    launchGameOverConfetti(conf);
    launchGameOverFireworks(conf);
  } else {
    conf.textContent = "";
  }

  // Review panel
  const panel = $("review-panel");
  const list = $("review-list");
  const reviewBtn = $("review-btn");
  panel.hidden = true;
  card.hidden = false;
  list.textContent = "";
  const missed = opts.missed || [];
  reviewBtn.hidden = missed.length === 0;
  missed.forEach((m) => {
    const li = document.createElement("li");
    li.className = "tg-review-item";
    const txt = document.createElement("span");
    txt.className = "tg-review-text";
    const strong = document.createElement("strong");
    strong.textContent = m.title;
    txt.appendChild(strong);
    if (m.sub) {
      const sub = document.createElement("small");
      sub.textContent = m.sub;
      txt.appendChild(sub);
    }
    li.appendChild(txt);
    if (m.say) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "tg-review-say";
      b.textContent = "🔊";
      b.setAttribute("aria-label", m.say);
      b.addEventListener("click", () => speak(m.say));
      li.appendChild(b);
    }
    list.appendChild(li);
  });
  reviewBtn.onclick = () => {
    card.hidden = true;
    panel.hidden = false;
  };
  $("review-back").onclick = () => {
    panel.hidden = true;
    card.hidden = false;
  };
}

// While a Game Over popup is up, the card drops the answer box + tip line so the
// result is the only thing to look at.
function syncGameOverCardState(card, overlay) {
  card.classList.toggle("tg-over", !overlay.hidden);
}
(function () {
  const tgCard = document.querySelector("#view-typegame > .card");
  new MutationObserver(() => syncGameOverCardState(tgCard, typeGameOverOverlay)).observe(typeGameOverOverlay, { attributes: true, attributeFilter: ["hidden"] });
  new MutationObserver(() => syncGameOverCardState(timesTableCard, timesTableOverOverlay)).observe(timesTableOverOverlay, { attributes: true, attributeFilter: ["hidden"] });
})();

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
    const live = mobileGameMQ.matches && startOverlay.hidden && (!overOverlay || overOverlay.hidden);
    card.classList.toggle("game-immersive", live);
    document.body.classList.toggle("game-immersive-open", !!document.querySelector(".view.active > .card.game-immersive"));
  }
  const overlayObserver = new MutationObserver(sync);
  overlayObserver.observe(startOverlay, { attributes: true, attributeFilter: ["hidden"] });
  if (overOverlay) overlayObserver.observe(overOverlay, { attributes: true, attributeFilter: ["hidden"] });
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

// Quiz uses the same phone play mode: once "Start Quiz" is pressed (start
// screen and result screen both hidden) the quiz card fills the screen.
setupMobileGameImmersive("view-quiz", quizStartScreen, quizResultEl);
// Spelling: live while neither the start screen nor the report is showing.
setupMobileGameImmersive("view-spelling", spellingStartScreen, spellingReport);
// Flashcards: live from "Start Flashcards" until "End".
setupMobileGameImmersive("view-flashcards", flashStartScreen, flashReport);
// On a phone the keyboard shrinks the panel; keep the answer box in view.
spellingInput.addEventListener("focus", () => {
  if (!document.body.classList.contains("game-immersive-open")) return;
  setTimeout(() => spellingInput.scrollIntoView({ block: "nearest" }), 300);
});
// With the keyboard up the panel is short; keep the typing box in view.
quizTypingInput.addEventListener("focus", () => {
  if (!document.body.classList.contains("game-immersive-open")) return;
  setTimeout(() => quizTypingBox.scrollIntoView({ block: "nearest" }), 300);
});

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
const wordlistSelectedChip = document.getElementById("wordlist-selected-chip");
const wordlistActionBar = document.getElementById("wordlist-action-bar");
const wordlistActionText = document.getElementById("wordlist-action-text");
const wordlistBarAddBtn = document.getElementById("wordlist-bar-add-btn");
const wordlistFilterChips = document.getElementById("wordlist-filter-chips");
// "all" | "review" (amber tag or marked wrong) | "mastered" (100%)
let wordlistMasteryFilter = "all";
let wordlistBarMsgTimer = 0;
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

// The total sits on the select-all line; how many are ticked lives in the chip
// beside it (hidden at zero) and, on phones, in the bottom action bar.
function updateWordlistCountLabel() {
  wordlistCountEl.textContent = t("customWordsCount", wordlistLastTotal);
  const picked = selectedWordlistWords.size;
  wordlistSelectedChip.hidden = picked === 0;
  wordlistSelectedChip.textContent = picked > 0 ? t("wordlistSelectedChip", picked) : "";
  updateWordlistActionBar();
}

// Bottom bar (phones only — CSS hides it elsewhere): visible while something is
// ticked, then briefly shows the "added" result before disappearing.
function updateWordlistActionBar() {
  const picked = selectedWordlistWords.size;
  if (picked > 0) {
    clearTimeout(wordlistBarMsgTimer);
    wordlistBarMsgTimer = 0;
    wordlistActionBar.classList.remove("is-done");
    wordlistBarAddBtn.hidden = false;
    wordlistActionText.textContent = t("wordlistSelectedChip", picked);
    wordlistActionBar.hidden = false;
  } else if (!wordlistBarMsgTimer) {
    wordlistActionBar.hidden = true;
  }
  // Sit directly above the fixed bottom tab bar, whatever its real height is.
  const tabs = document.querySelector(".bottom-tabs");
  const tabsH = tabs && getComputedStyle(tabs).display !== "none" ? tabs.offsetHeight : 0;
  wordlistActionBar.style.bottom = `${tabsH}px`;
  wordlistActionBar.closest(".view").classList.toggle("has-action-bar", !wordlistActionBar.hidden);
}

function showWordlistBarResult(msg) {
  clearTimeout(wordlistBarMsgTimer);
  wordlistActionBar.classList.add("is-done");
  wordlistBarAddBtn.hidden = true;
  wordlistActionText.textContent = msg;
  wordlistActionBar.hidden = false;
  wordlistBarMsgTimer = setTimeout(() => {
    wordlistBarMsgTimer = 0;
    wordlistActionBar.classList.remove("is-done");
    updateWordlistActionBar();
  }, 2600);
}

function syncWordlistFilterChips() {
  wordlistFilterChips.querySelectorAll(".wl-chip").forEach((chip) => {
    const on = chip.dataset.filter === wordlistMasteryFilter;
    chip.classList.toggle("is-active", on);
    chip.setAttribute("aria-pressed", on ? "true" : "false");
  });
}

function updateWordlistSelectionButtons() {
  const none = selectedWordlistWords.size === 0;
  wordlistAddDeckBtn.disabled = none;
  updateSelectAllCheckboxState(wordlistSelectAllCheckbox, wordlistGrid);
  updateWordlistCountLabel();
}

// tone drives the tag colour on the word list (see .wl-tag--* in style.css):
//   done     100% right      -> solid emerald with a ✓
//   good     51–99%          -> soft emerald
//   progress 50% or below    -> amber, "needs review"
//   wrong    marked wrong in Spelling
//   new      never practised
function masteryLabel(word) {
  if (progress.spellingStatus[word] === "wrong") return { text: t("spellingWrongBadge"), tone: "wrong" };
  const s = progress.wordStats[word];
  if (!s || s.correct + s.incorrect === 0) return { text: t("masteryNew"), tone: "new" };
  const total = s.correct + s.incorrect;
  if (s.correct === total) return { text: t("masteryPct", 100), tone: "done" };
  // Never show "100%" for a word that has had a miss (e.g. 249/250 rounds to 100).
  const pct = Math.min(99, Math.round((s.correct / total) * 100));
  return { text: t("masteryPct", pct), tone: pct <= 50 ? "progress" : "good" };
}

// Static trusted markup (no user text), so innerHTML is safe here.
const WL_SPEAKER_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
  '<path fill="currentColor" d="M3 10v4a1 1 0 0 0 1 1h3.2l4.3 3.6a1 1 0 0 0 1.6-.8V6.2a1 1 0 0 0-1.6-.8L7.2 9H4a1 1 0 0 0-1 1z"/>' +
  '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M16 9.2a4 4 0 0 1 0 5.6M18.7 6.5a8 8 0 0 1 0 11"/>' +
  "</svg>";

// kind: "word" (large, filled) or "example" (small round, sits beside the sentence).
function makeWordlistSpeakBtn(text, kind, label) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `wl-speak wl-speak--${kind}`;
  btn.title = label;
  btn.setAttribute("aria-label", label);
  btn.innerHTML = WL_SPEAKER_SVG;
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    speak(text, {
      onstart: () => btn.classList.add("is-speaking"),
      onend: () => btn.classList.remove("is-speaking"),
    });
  });
  return btn;
}

// Flashcard back: the same round speaker buttons the Word List uses.
[["flash-def-speak", () => flashDefEl.textContent], ["flash-ex-speak", () => (flashDeck[flashIndex] || {}).example]].forEach(([id, getText]) => {
  const b = document.getElementById(id);
  if (!b) return;
  b.innerHTML = WL_SPEAKER_SVG;
  b.addEventListener("click", (e) => {
    e.stopPropagation();
    const txt = getText();
    if (!flashDeck.length || !txt) return;
    speak(txt, { onstart: () => b.classList.add("is-speaking"), onend: () => b.classList.remove("is-speaking") });
  });
});

function makeWordlistTag(tone, text) {
  const tag = document.createElement("span");
  tag.className = `wl-tag wl-tag--${tone}`;
  if (tone === "done") {
    const check = document.createElement("span");
    check.className = "wl-tag-check";
    check.setAttribute("aria-hidden", "true");
    check.textContent = "✓";
    tag.appendChild(check);
  }
  tag.appendChild(document.createTextNode(text));
  return tag;
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

  // Word + its (large) speaker button on one line.
  const wordRow = document.createElement("div");
  wordRow.className = "wl-word-row";
  const wordEl = document.createElement("span");
  wordEl.className = "w";
  wordEl.textContent = w.word;
  wordRow.appendChild(wordEl);
  wordRow.appendChild(makeWordlistSpeakBtn(w.word, "word", `${t("hearItLabel")}: ${w.word}`));
  left.appendChild(wordRow);

  const defEl = document.createElement("div");
  defEl.className = "d";
  defEl.textContent = w.definition;
  defEl.title = w.definition;
  left.appendChild(defEl);

  // Example sentence with a small round speaker hugging the end of the text.
  if (w.example) {
    const exRow = document.createElement("div");
    exRow.className = "wl-example";
    // The last word and the speaker are wrapped together (no-break), so the
    // speaker can never fall onto a line of its own, away from the sentence.
    const sentence = w.example.trim();
    const cut = sentence.lastIndexOf(" ") + 1;
    const exText = document.createElement("span");
    exText.className = "wl-example-text";
    exText.textContent = sentence.slice(0, cut);
    const exTail = document.createElement("span");
    exTail.className = "wl-example-tail";
    exTail.appendChild(document.createTextNode(sentence.slice(cut)));
    exTail.appendChild(makeWordlistSpeakBtn(w.example, "example", t("hearExampleLabel")));
    exRow.title = w.example;
    exRow.appendChild(exText);
    exRow.appendChild(exTail);
    left.appendChild(exRow);
  }

  row.appendChild(left);

  const tags = document.createElement("div");
  tags.className = "wl-tags";

  // Set only on search hits from a level other than the one being browsed.
  if (w.level) tags.appendChild(makeWordlistTag("level", levelLabel(w.level)));

  // Words not practised yet carry no tag: with ~1000 of them, "New" on every
  // card was pure noise and made the real mastery tags harder to spot.
  const m = masteryLabel(w.word);
  if (m.tone !== "new") tags.appendChild(makeWordlistTag(m.tone, m.text));
  if (tags.childElementCount > 0) row.appendChild(tags);

  return row;
}

// The word grid scrolls (max-height) and its scrollbar eats into the row width,
// so rows end a little before the toolbar does. Expose that width so the toolbar
// can pull its right edge in to line up with the row cards.
function syncWordlistScrollbarGap() {
  const sb = Math.max(0, wordlistGrid.offsetWidth - wordlistGrid.clientWidth);
  wordlistGrid.parentElement.style.setProperty("--wl-sb", `${sb}px`);
}
window.addEventListener("resize", syncWordlistScrollbarGap);

function renderWordList() {
  const query = wordlistSearch.value.trim().toLowerCase();
  wordlistGrid.innerHTML = "";

  // The dropdown picks which level to browse ("" = all of them). Searching
  // always spans every level regardless: a word added automatically lands in
  // whichever level was guessed for it, which usually isn't the one you're on.
  const spanAllLevels = wordlistLevelSelect.value === "" || !!query;
  const levels = spanAllLevels ? currentSystem().levels.map((lv) => lv.id) : [wordlistLevelSelect.value];

  let words = [];
  levels.forEach((level) => {
    getAllWordsForLevel(level).forEach((w) => {
      if (!w.word.toLowerCase().includes(query)) return;
      if (words.some((seen) => seen.word === w.word)) return;
      // The level badge only earns its place when more than one is on screen.
      words.push(spanAllLevels ? { ...w, level } : w);
    });
  });

  // One chip per tag colour: review = amber (50% or below), mastered = 100%,
  // wrong = the "Incorrect" tag (marked wrong in Spelling).
  if (wordlistMasteryFilter !== "all") {
    const toneFor = { review: "progress", mastered: "done", wrong: "wrong" }[wordlistMasteryFilter];
    words = words.filter((w) => masteryLabel(w.word).tone === toneFor);
  }

  wordlistLastTotal = words.length;
  updateWordlistCountLabel();
  wordlistAddDeckBtn.disabled = selectedWordlistWords.size === 0;
  if (words.length === 0) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = t(wordlistMasteryFilter === "all" ? "wordlistEmpty" : "wlFilterEmpty");
    wordlistGrid.appendChild(p);
    updateSelectAllCheckboxState(wordlistSelectAllCheckbox, wordlistGrid);
    requestAnimationFrame(syncWordlistScrollbarGap);
    return;
  }
  words.forEach((w) => wordlistGrid.appendChild(buildWordRow(w)));
  updateSelectAllCheckboxState(wordlistSelectAllCheckbox, wordlistGrid);
  requestAnimationFrame(syncWordlistScrollbarGap);
}

wordlistSearch.addEventListener("input", renderWordList);
wordlistLevelSelect.addEventListener("change", renderWordList);

wordlistFilterChips.addEventListener("click", (e) => {
  const chip = e.target.closest(".wl-chip");
  if (!chip || chip.dataset.filter === wordlistMasteryFilter) return;
  wordlistMasteryFilter = chip.dataset.filter;
  syncWordlistFilterChips();
  renderWordList();
});

// Shared by the toolbar button and the phone action bar.
function addWordlistSelectionToDeck() {
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
  const msg = t("addedToMyDeck", added, picked.length);
  wordlistCountEl.textContent = msg;
  showWordlistBarResult(msg);
}
wordlistAddDeckBtn.addEventListener("click", addWordlistSelectionToDeck);
wordlistBarAddBtn.addEventListener("click", addWordlistSelectionToDeck);
window.addEventListener("resize", updateWordlistActionBar);

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
const customWordsLoadMoreBtn = document.getElementById("custom-words-load-more-btn");
const customWordsLoadMoreLabel = document.getElementById("custom-words-load-more-label");
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
// How many of the current (filtered/sorted) list's rows renderCustomWords()
// actually puts in the DOM — Load More just raises this and re-renders,
// instead of the whole list sitting in one tall, separately-scrolling box.
const CUSTOM_WORDS_PAGE_SIZE = 30;
let customWordsVisibleCount = CUSTOM_WORDS_PAGE_SIZE;
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
const addmodeBulkLock = document.getElementById("addmode-bulk-lock");
const bulkAddForm = document.getElementById("bulk-add-form");
const bulkWordsInput = document.getElementById("bulk-words-input");
const bulkAddSaveBtn = document.getElementById("bulk-add-save-btn");
const bulkAddSpinner = document.getElementById("bulk-add-spinner");
const bulkAddSaveLabel = document.getElementById("bulk-add-save-label");
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
addModeBulkBtn.addEventListener("click", () => {
  // The whole card is already overlay-gated for a locked account, but that
  // overlay only catches mouse/touch — same keyboard-focus backstop as
  // ocrChooseBtn's handler. Showing the prompt here (rather than silently
  // switching to a bulk form they can't submit anyway) is also what makes
  // the 🔒 on this tab mean something instead of just decoration.
  if (!canUsePaidFeatures()) {
    promptUpgradeForFeature();
    return;
  }
  setAddMode("bulk");
});

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
    bulkAddSpinner.hidden = false;
    bulkAddSaveLabel.textContent = t("bulkAnalyzing");
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
  bulkAddSpinner.hidden = true;
  bulkAddSaveLabel.textContent = t("bulkAddSaveBtn");
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
  kidConfirm(t("deleteConfirm"), t("deleteConfirmYesBtn"), t("deleteConfirmNoBtn")).then((ok) => {
    if (!ok) return;
    const removed = customWords.find((w) => w.id === id);
    customWords = customWords.filter((w) => w.id !== id);
    saveCustomWords();
    renderCustomWords();
    renderWordList();
    if (removed && removed.remote) removeSharedWords([id]);
  });
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

// Unlike updateSelectAllCheckboxState() (generic, DOM-scoped — fine for a
// list that's entirely on the page at once), Select All here needs to
// reflect the full filtered list, not just whichever page Load More has
// revealed so far, or ticking it would silently miss every row that hasn't
// been scrolled to yet.
function updateCustomSelectAllState() {
  const shown = visibleCustomWords(myCustomWords());
  customSelectAllCheckbox.checked = shown.length > 0 && shown.every((w) => selectedCustomWordIds.has(w.id));
}

// resetPaging stays true for every normal re-render (a word added/edited/
// deleted, a filter or search changed) — Load More's own click handler is
// the one case that passes false, so clicking it doesn't immediately wipe
// out the extra rows it just revealed.
function renderCustomWords({ resetPaging = true } = {}) {
  if (resetPaging) customWordsVisibleCount = CUSTOM_WORDS_PAGE_SIZE;
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
    customWordsLoadMoreBtn.hidden = true;
    updateCustomSelectAllState();
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
  const pageItems = shown.slice(0, customWordsVisibleCount);
  const remaining = shown.length - pageItems.length;
  customWordsLoadMoreBtn.hidden = remaining <= 0;
  if (remaining > 0) customWordsLoadMoreLabel.textContent = t("loadMoreWords", Math.min(CUSTOM_WORDS_PAGE_SIZE, remaining));
  pageItems.forEach((w) => {
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
          updateCustomSelectAllState();
        }
      });
      row.appendChild(checkbox);

      const left = document.createElement("div");
      left.className = "wordlist-item-main";

      // Same round speaker buttons as Word List's own cards (wl-word-row +
      // makeWordlistSpeakBtn) instead of the old plain " 🔊" text appended
      // via .speakable-line — this used to put two mismatched bare emoji on
      // the card, one after the word and one after the example.
      const wordRow = document.createElement("div");
      wordRow.className = "wl-word-row";
      const wordEl = document.createElement("span");
      wordEl.className = "w";
      wordEl.textContent = w.word;
      wordRow.appendChild(wordEl);
      wordRow.appendChild(makeWordlistSpeakBtn(w.word, "word", `${t("hearItLabel")}: ${w.word}`));
      left.appendChild(wordRow);

      const defEl = document.createElement("div");
      defEl.className = "d";
      const definitionText = cwDefinition(w) || t("ocrNoDefFound");
      defEl.textContent = definitionText;
      defEl.title = definitionText;
      left.appendChild(defEl);

      if (w.example) {
        const exRow = document.createElement("div");
        exRow.className = "wl-example";
        const exText = document.createElement("span");
        exText.className = "wl-example-text";
        exText.textContent = w.example;
        exText.title = w.example;
        exRow.appendChild(exText);
        exRow.appendChild(makeWordlistSpeakBtn(w.example, "example", t("hearExampleLabel")));
        left.appendChild(exRow);
      }
      row.appendChild(left);

      const right = document.createElement("div");
      right.style.display = "flex";
      right.style.flexDirection = "column";
      right.style.gap = "10px";
      right.style.alignItems = "flex-end";

      const badge = document.createElement("span");
      badge.className = "mastery cw-level-badge";
      badge.textContent = levelLabel(cwLevel(w));
      right.appendChild(badge);

      const btnRow = document.createElement("div");
      btnRow.style.display = "flex";
      btnRow.style.gap = "10px";

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
  updateCustomSelectAllState();
}

customRetryAllBtn.addEventListener("click", retryAllFailedWords);
customDeleteFailedBtn.addEventListener("click", deleteAllFailedWords);

customSearchInput.addEventListener("input", renderCustomWords);

customWordsLoadMoreBtn.addEventListener("click", () => {
  customWordsVisibleCount += CUSTOM_WORDS_PAGE_SIZE;
  renderCustomWords({ resetPaging: false });
});

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
    // Selects every word in the full filtered list, not just whatever page
    // Load More has rendered so far — see updateCustomSelectAllState().
    visibleCustomWords(myCustomWords()).forEach((w) => selectedCustomWordIds.add(w.id));
    updateDeleteSelectedBtn();
    renderCustomWords({ resetPaging: false });
  } else {
    selectedCustomWordIds.clear();
    renderCustomWords({ resetPaging: false });
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

/* ---------- Admin: dashboard summary stat cards ---------- */
// Totals come from each panel's own unfiltered load (loadAdminUsers()/
// loadAdminKoala() with no search query) and are then nudged in place by
// mutations (delete/role-change/grant/generate/delete-code) rather than
// refetched — so a stat stays correct even while the admin is mid-search in
// the panel it belongs to, instead of silently shrinking to match a filter.
const adminStats = { totalUsers: 0, premiumUsers: 0, totalCoins: 0, unusedCodes: 0 };

function renderAdminStats() {
  const totalUsersEl = document.getElementById("admin-stat-total-users");
  const premiumUsersEl = document.getElementById("admin-stat-premium-users");
  const totalCoinsEl = document.getElementById("admin-stat-total-coins");
  const unusedCodesEl = document.getElementById("admin-stat-unused-codes");
  if (!totalUsersEl) return;
  totalUsersEl.textContent = adminStats.totalUsers;
  premiumUsersEl.textContent = adminStats.premiumUsers;
  totalCoinsEl.textContent = adminStats.totalCoins.toLocaleString();
  unusedCodesEl.textContent = adminStats.unusedCodes;
}

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
  adminStats.unusedCodes = adminCodes.filter((c) => !c.redeemedByUsername).length;
  renderAdminStats();
  adminCodesGrid.innerHTML = "";
  if (adminCodes.length === 0) {
    adminCodesEmpty.hidden = false;
    adminCodesCountEl.textContent = "";
    return;
  }
  adminCodesEmpty.hidden = true;
  adminCodesCountEl.textContent = t("adminCodesCount", adminCodes.length);

  sortedAdminCodes().forEach((c) => {
    const used = !!c.redeemedByUsername;
    const row = document.createElement("div");
    row.className = "wordlist-item";

    const left = document.createElement("div");
    left.className = "wordlist-item-main";
    const codeEl = document.createElement("div");
    codeEl.className = "w admin-code-text";
    codeEl.textContent = c.code;
    left.appendChild(codeEl);

    // A colored status badge rather than a plain muted line — green/"used
    // by nobody yet" vs. purple/"already claimed" reads at a glance across
    // a long list, instead of needing to read each status sentence in turn.
    const statusEl = document.createElement("span");
    statusEl.className = `admin-code-status ${used ? "used" : "unused"}`;
    statusEl.textContent = used ? t("adminCodeUsedBy", c.redeemedByUsername) : t("adminCodeUnused");
    left.appendChild(statusEl);
    row.appendChild(left);

    const right = document.createElement("div");
    const btnRow = document.createElement("div");
    btnRow.style.display = "flex";
    btnRow.style.gap = "6px";

    // The useful action differs by state — copying a code that's already
    // claimed does nothing for anyone, and deleting one that's still live
    // is the riskier move — so each row leads with whichever one actually
    // applies, instead of showing both at equal weight always.
    const copyBtn = document.createElement("button");
    copyBtn.className = used ? "retry-btn" : "edit-btn";
    copyBtn.textContent = t("adminCodeCopyBtn");
    copyBtn.disabled = used;
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
    deleteBtn.className = used ? "delete-btn" : "retry-btn";
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
    // Only an unfiltered load reflects the true total — a search's result
    // count would otherwise make the dashboard tiles shrink to match it.
    if (!query) {
      adminStats.totalUsers = users.length;
      adminStats.premiumUsers = users.filter((u) => u.role === "paid").length;
      renderAdminStats();
    }
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
    row.className = "wordlist-item admin-user-row";

    // Left: who they are and when they joined.
    const info = document.createElement("div");
    info.className = "admin-user-info";
    const nameEl = document.createElement("div");
    nameEl.className = "w";
    nameEl.textContent = u.username;
    info.appendChild(nameEl);
    const whenEl = document.createElement("div");
    whenEl.className = "d";
    whenEl.textContent =
      t("adminUserCreatedAt", formatDate(u.createdAt)) +
      (u.upgradedAt ? " · " + t("adminUserUpgradedAt", formatDate(u.upgradedAt)) : "");
    info.appendChild(whenEl);
    if (u.pendingRequestId) {
      const pendingBadge = document.createElement("div");
      pendingBadge.className = "d admin-pending-badge";
      pendingBadge.textContent = t("adminUserPendingRequest");
      info.appendChild(pendingBadge);
    }
    row.appendChild(info);

    // Center: current role, as a colored badge — a live <select> rather
    // than plain text, but styled and positioned as the status indicator
    // the role actually is, separate from the reset/delete actions on the
    // right.
    const roleCol = document.createElement("div");
    roleCol.className = "admin-user-role";

    // admin's own account can't be re-roled or password-reset from here —
    // no lockout risk, and password changes go through My Account instead.
    const isSelf = currentUser && u.id === currentUser.id;
    if (isSelf) {
      const meLabel = document.createElement("span");
      meLabel.className = "admin-role-select";
      meLabel.dataset.role = u.role;
      meLabel.textContent = roleLabel(u.role) + " · " + t("adminUserYou");
      roleCol.appendChild(meLabel);
    } else {
      const roleSelect = document.createElement("select");
      roleSelect.className = "admin-role-select";
      roleSelect.dataset.role = u.role;
      ADMIN_ROLE_OPTIONS.forEach((role) => {
        const opt = document.createElement("option");
        opt.value = role;
        opt.textContent = roleLabel(role);
        if (role === u.role) opt.selected = true;
        roleSelect.appendChild(opt);
      });
      roleCol.appendChild(roleSelect);

      // Muted and inert until the dropdown actually differs from the saved
      // role, then lights up accent-green — the button itself shows there's
      // a pending change to apply, instead of looking identically clickable
      // whether anything changed or not.
      const applyBtn = document.createElement("button");
      applyBtn.className = "edit-btn admin-apply-btn";
      applyBtn.textContent = t("adminUserApplyRoleBtn");
      applyBtn.disabled = true;
      roleSelect.addEventListener("change", () => {
        const changed = roleSelect.value !== u.role;
        roleSelect.dataset.role = roleSelect.value;
        applyBtn.classList.toggle("is-dirty", changed);
        applyBtn.disabled = !changed;
      });
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
          const wasPaid = u.role === "paid";
          u.role = user.role;
          u.upgradedAt = user.upgradedAt;
          // Nudge the dashboard's premium count rather than a full reload —
          // only matters when the change crosses in or out of "paid".
          if (wasPaid !== (u.role === "paid")) {
            adminStats.premiumUsers += u.role === "paid" ? 1 : -1;
            renderAdminStats();
          }
          renderAdminUsers();
        } catch (e) {
          alert(t("adminRequestActionFailed"));
          applyBtn.disabled = false;
        }
      });
      roleCol.appendChild(applyBtn);
    }
    row.appendChild(roleCol);

    // Right: the actions themselves — upgrade-request approve/dismiss (when
    // pending), then an outline password-reset button and a small,
    // icon-only delete button kept visually apart from it so a reset-
    // password tap can't land on delete by mistake.
    const actions = document.createElement("div");
    actions.className = "admin-user-actions";

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
      actions.appendChild(approveBtn);

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
      actions.appendChild(dismissBtn);
    }

    if (!isSelf) {
      const resetPasswordBtn = document.createElement("button");
      resetPasswordBtn.className = "retry-btn";
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
      actions.appendChild(resetPasswordBtn);

      const deleteUserBtn = document.createElement("button");
      deleteUserBtn.className = "delete-btn";
      deleteUserBtn.textContent = t("adminUserDeleteBtn");
      deleteUserBtn.addEventListener("click", async () => {
        const ok = await kidConfirm(t("adminUserConfirmDelete", u.username), t("deleteConfirmYesBtn"), t("deleteConfirmNoBtn"));
        if (!ok) return;
        deleteUserBtn.disabled = true;
        try {
          await api("/admin/users/delete", { method: "POST", body: JSON.stringify({ userId: u.id }) });
          adminUsers = adminUsers.filter((x) => x.id !== u.id);
          adminStats.totalUsers = Math.max(0, adminStats.totalUsers - 1);
          if (u.role === "paid") adminStats.premiumUsers = Math.max(0, adminStats.premiumUsers - 1);
          renderAdminStats();
          renderAdminUsers();
        } catch (e) {
          alert(t("adminRequestActionFailed"));
          deleteUserBtn.disabled = false;
        }
      });
      actions.appendChild(deleteUserBtn);
    }

    row.appendChild(actions);
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

  addmodeBulkLock.hidden = !locked;
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

const OCR_MAX_FILE_BYTES = 10 * 1024 * 1024;

// Picking a file only stages it — nothing is read or processed until the
// Extract button (revealed here) is actually clicked. A tool that's
// missing (CDN didn't load) or a fundamentally unsupported file type is
// still reported immediately, since there's nothing Extract could do about
// either. An Excel file's overwrite-or-skip choice is asked right here too,
// before any of its rows have been read — see excelOverwriteConfirm's
// wording, which doesn't presuppose the file actually contains a duplicate.
// Shared by both the file-input's change event and dropping a file onto
// the dropzone — the two are just different ways of handing over the same
// File object.
function handleOcrFileChosen(file) {
  ocrExtractBtn.hidden = true;
  ocrPendingFile = null;
  ocrPendingKind = null;
  ocrPendingOverwrite = false;

  if (!file) {
    ocrLastFileName = null;
    ocrFileNameEl.textContent = t("ocrNoFileChosen");
    return;
  }

  if (file.size > OCR_MAX_FILE_BYTES) {
    ocrStatus.textContent = t("ocrFileTooLarge");
    ocrReview.hidden = false;
    ocrFileInput.value = "";
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
}

ocrFileInput.addEventListener("change", (e) => {
  handleOcrFileChosen(e.target.files && e.target.files[0]);
});

// Drag-and-drop onto the dropzone — the premium-gate overlay already sits on
// top of this whole card for a locked account, so a dropped file there never
// reaches these listeners; canUsePaidFeatures() backstops it the same way
// ocrChooseBtn's click handler does, in case a drop event somehow slips
// past the overlay (e.g. a browser that fires it on a disabled ancestor).
const ocrDropzone = document.getElementById("ocr-dropzone");
["dragenter", "dragover"].forEach((evt) => {
  ocrDropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    if (!canUsePaidFeatures()) return;
    ocrDropzone.classList.add("ocr-dropzone-active");
  });
});
["dragleave", "dragend"].forEach((evt) => {
  ocrDropzone.addEventListener(evt, () => ocrDropzone.classList.remove("ocr-dropzone-active"));
});
ocrDropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  ocrDropzone.classList.remove("ocr-dropzone-active");
  if (!canUsePaidFeatures()) {
    promptUpgradeForFeature();
    return;
  }
  const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
  if (!file) return;
  handleOcrFileChosen(file);
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
const REC_MAX_LOG = 300;
const RW_MODES = ["quiz", "spelling", "typing", "tt", "flash"];
const rwL = (en, ko) => (currentLang === "ko" ? ko : en);

function ensureRewardData() {
  if (!progress.daily) progress.daily = {};
  if (!progress.modes) progress.modes = {};
  if (!progress.wrong) progress.wrong = {};
  if (!progress.ttSolved) progress.ttSolved = {};
  if (!progress.badges) progress.badges = {};
  if (!progress.counters) progress.counters = { spellPerfect: 0, quizPerfect: 0, wrongCleared: 0 };
  if (!Array.isArray(progress.recent)) progress.recent = []; // [{ t, m, w, ok }] last answers, newest last
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
  // Rolling log of recent answers — drives "recent accuracy", trends,
  // recommendations and the recent-activity list on the Progress page.
  progress.recent.push({ t: Date.now(), m: mode, w: String(word), ok: isCorrect ? 1 : 0 });
  if (progress.recent.length > REC_MAX_LOG) progress.recent.splice(0, progress.recent.length - REC_MAX_LOG);
  // keep only the last 60 days of daily history
  const keys = Object.keys(progress.daily).sort();
  while (keys.length > 60) delete progress.daily[keys.shift()];

  // The Wrong-answer notebook is a Premium/admin perk — nothing is collected
  // for free or signed-out visitors (charts above still are).
  const paid = canUsePaidFeatures();
  const key = String(word);
  if (isCorrect) {
    // Times-table facts feed the table-mastery badges, which every signed-in
    // account can earn.
    if (mode === "tt" && canUseAccountFeatures()) progress.ttSolved[key] = 1;
    const w = paid ? progress.wrong[key] : null;
    if (w) {
      w.ok = (w.ok || 0) + 1;
      if (w.ok >= 2) {
        delete progress.wrong[key];
        progress.counters.wrongCleared++;
      }
    }
  } else if (paid) {
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
      id: `tt${n}`, emoji: n <= 3 ? "🥉" : n <= 5 ? "🥈" : n <= 7 ? "🥇" : "🏅", group: "math",
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
    { id: "spell100", emoji: "🏅", group: "english", name: rwL("Spelling 100 Sticker", "스펠링 100점 스티커"),
      desc: rwL("Finish a spelling round (5+ words) with every word right first time", "스펠링 5단어 이상을 한 번에 모두 맞혀요"),
      test: () => progress.counters.spellPerfect >= 1 },
    { id: "spell100x5", emoji: "💎", group: "english", name: rwL("Spelling Superstar", "스펠링 슈퍼스타"),
      desc: rwL("Get 5 perfect spelling rounds", "스펠링 100점을 5번 달성"),
      test: () => progress.counters.spellPerfect >= 5 },
    { id: "quiz100", emoji: "🎖️", group: "english", name: rwL("Quiz Perfect Sticker", "퀴즈 만점 스티커"),
      desc: rwL("Finish a quiz (5+ questions) with no mistakes", "퀴즈(5문제 이상)를 모두 맞혀요"),
      test: () => progress.counters.quizPerfect >= 1 },
    { id: "type50", emoji: "🥈", group: "english", name: rwL("Speedy Typist Koala", "타이핑 코알라"),
      desc: rwL("Type 50 words correctly in the Typing Game", "타이핑 게임에서 단어 50개 성공"),
      test: () => modeCorrect("typing") >= 50 },
    { id: "words50", emoji: "🥉", group: "english", name: rwL("Word Explorer", "단어 탐험가"),
      desc: rwL("Practise 50 different words", "서로 다른 단어 50개 연습"),
      test: () => Object.keys(progress.wordStats).length >= 50 },
    { id: "words200", emoji: "🥇", group: "english", name: rwL("Word Wizard", "단어 마법사"),
      desc: rwL("Practise 200 different words", "서로 다른 단어 200개 연습"),
      test: () => Object.keys(progress.wordStats).length >= 200 },
    { id: "streak3", emoji: "🥉", group: "habit", name: rwL("3-Day Streak", "3일 연속 학습"),
      desc: rwL("Practise 3 days in a row", "3일 연속 학습"), test: () => (progress.streak.count || 0) >= 3 },
    { id: "streak7", emoji: "🥈", group: "habit", name: rwL("Week-long Koala", "일주일 연속 코알라"),
      desc: rwL("Practise 7 days in a row", "7일 연속 학습"), test: () => (progress.streak.count || 0) >= 7 },
    { id: "streak30", emoji: "🏆", group: "habit", name: rwL("Monthly Marathon", "한 달 연속 학습"),
      desc: rwL("Practise 30 days in a row", "30일 연속 학습"), test: () => (progress.streak.count || 0) >= 30 },
    { id: "streak14", emoji: "🥇", group: "habit", name: rwL("Fortnight Koala", "2주 연속 코알라"),
      desc: rwL("Practise 14 days in a row", "14일 연속 학습"), test: () => (progress.streak.count || 0) >= 14 },
    { id: "mission7", emoji: "🎯", group: "habit", name: rwL("Mission Master", "미션 마스터"),
      desc: rwL("Complete Today's Mission 7 times", "오늘의 미션을 7번 완료"), test: () => (progress.counters.missions || 0) >= 7 },
    { id: "coins500", emoji: "💰", group: "koala", name: rwL("Coin Collector", "코인 수집가"),
      desc: rwL("Earn 500 Koala Coins in total", "코알라 코인을 모두 500개 모아요"), test: () => KoalaCore.ensureKoala(progress).earned >= 500 },
    { id: "level5", emoji: "⭐", group: "koala", name: rwL("Level 5 Koala", "레벨 5 코알라"),
      desc: rwL("Reach Koala Level 5", "코알라 레벨 5 달성"), test: () => KoalaCore.levelInfo(KoalaCore.ensureKoala(progress).earned).level >= 5 },
    { id: "items5", emoji: "🎩", group: "koala", name: rwL("Dress-up Fan", "패션 코알라"),
      desc: rwL("Unlock 5 items for your Koala or room", "코알라나 방 아이템 5개 해금"),
      test: () => { const k = KoalaCore.ensureKoala(progress); return Object.keys(k.items.owned).filter((id) => { const it = KoalaCore.itemById(id); return it && !it.unlock.free; }).length >= 5; } },
    { id: "roomDecor", emoji: "🏠", group: "koala", name: rwL("Room Designer", "방 꾸미기 달인"),
      desc: rwL("Put 5 items in your Study Room", "공부방에 아이템 5개를 놓아요"),
      test: () => { const k = KoalaCore.ensureKoala(progress); return KoalaCore.ROOM_SLOTS.filter((sl) => k.items.equipped[sl]).length >= 5; } },
    { id: "fix5", emoji: "🏅", group: "habit", paidOnly: true, name: rwL("Mistake Fixer", "오답 해결사"),
      desc: rwL("Clear 5 words from your Wrong-answer notebook", "오답 노트에서 5개 졸업"),
      test: () => progress.counters.wrongCleared >= 5 },
    { id: "fix20", emoji: "💎", group: "habit", paidOnly: true, name: rwL("Mistake Master", "오답 마스터"),
      desc: rwL("Clear 20 words from your Wrong-answer notebook", "오답 노트에서 20개 졸업"),
      test: () => progress.counters.wrongCleared >= 20 }
  );
  return list;
}

let rwToastQueue = [];
let rwToastShowing = false;
// Badges are open to every signed-in account (free, paid, admin) — signed-out
// visitors see a sign-up prompt instead. Only the two Wrong-answer-notebook
// badges (paidOnly) need Premium, because the notebook itself is Premium.
function checkBadges() {
  if (!canUseAccountFeatures()) return;
  ensureRewardData();
  const paid = canUsePaidFeatures();
  const fresh = [];
  buildBadgeCatalog().forEach((b) => {
    if (b.paidOnly && !paid) return;
    if (!progress.badges[b.id] && b.test()) {
      progress.badges[b.id] = Date.now();
      fresh.push(b);
    }
  });
  if (fresh.length) {
    fresh.forEach((b) => {
      const coins = KoalaCore.awardBadge(progress, b.id);
      rwToastQueue.push(coins ? { ...b, title: rwL(`New badge! +${coins} Coins`, `새 배지! +${coins}코인`), go: true } : b);
    });
    saveProgress();
    showNextBadgeToast();
    announceKoalaUnlocks(); // a badge can open an item (Wizard Hat, Gold Medal, Trophy Cabinet)
    checkLevelUp();
  }
}
function showNextBadgeToast() {
  if (rwToastShowing || !rwToastQueue.length) return;
  rwToastShowing = true;
  const b = rwToastQueue.shift();
  const el = document.createElement("div");
  el.className = "badge-toast" + (b.go ? " badge-toast-link" : "");
  el.setAttribute("role", "status");
  el.innerHTML = `<span class="badge-toast-emoji">${b.emojiHtml || b.emoji}</span><span><strong>${b.title || rwL("New badge!", "새 배지!")}</strong><br>${b.name}${b.go ? `<br><small class="badge-toast-go">${rwL("See My Koala →", "나의 코알라 보기 →")}</small>` : ""}</span>`;
  if (b.go) el.addEventListener("click", () => { el.remove(); goToTab("koala"); });
  document.body.appendChild(el);
  const life = b.go ? 4800 : 3200;
  setTimeout(() => el.classList.add("out"), life);
  setTimeout(() => { el.remove(); rwToastShowing = false; showNextBadgeToast(); }, life + 500);
}

/* ---- Stats sub-tabs ---- */
const statsTabBtns = document.querySelectorAll(".stats-tab");
const statsPanels = {
  overview: document.getElementById("stats-panel-overview"),
  badges: document.getElementById("stats-panel-badges"),
  wrong: document.getElementById("stats-panel-wrong"),
  parent: document.getElementById("stats-panel-parent"),
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
  else if (statsTab === "parent") renderParentPanel();
  else renderWrongPanel();
}

function premiumLockHtml() {
  return `<div class="rw-lock"><div class="rw-lock-icon">🔒<span class="kface" aria-hidden="true"></span></div>
    <div class="rw-lock-title">${t("premiumGateTitle")}</div>
    <p>${rwL("Koala badges and the Wrong-answer notebook are for Premium members.", "코알라 배지와 오답 노트는 프리미엄 회원 전용이에요.")}</p>
    <button type="button" class="pill accent small" data-rw-upgrade>${rwL("Sign up / Upgrade", "가입 / 업그레이드")}</button></div>`;
}
document.addEventListener("click", (e) => {
  if (e.target.closest("[data-rw-upgrade]")) promptUpgradeForFeature();
});

// Signed-out visitors can look at the badges but can't collect them.
function badgeSignupLockHtml() {
  return `<div class="rw-lock"><div class="rw-lock-icon">🔒<span class="kface" aria-hidden="true"></span></div>
    <div class="rw-lock-title">${rwL("Sign in to collect koala badges", "로그인하고 코알라 배지를 모아요")}</div>
    <p>${rwL("Create a free account to earn badges as you learn.", "무료 계정을 만들면 공부하면서 배지를 모을 수 있어요.")}</p>
    <button type="button" class="pill accent small" data-rw-signup>${rwL("Sign up / Log in", "가입 / 로그인")}</button></div>`;
}
document.addEventListener("click", (e) => {
  if (e.target.closest("[data-rw-signup]")) openAuthOverlay("signup");
});

// The badge collection, shared by My Progress → Badges and My Koala.
function badgeGridHtml() {
  const signedIn = canUseAccountFeatures();
  const paid = canUsePaidFeatures();
  const cat = buildBadgeCatalog();
  const got = signedIn ? cat.filter((b) => progress.badges[b.id]).length : 0;
  const groups = [
    ["math", rwL("🧮 Times Table", "🧮 구구단")],
    ["english", rwL("📖 English", "📖 영어")],
    ["habit", rwL("🔥 Habits", "🔥 학습 습관")],
    ["koala", rwL('<span class="kface" aria-hidden="true"></span> My Koala', '<span class="kface" aria-hidden="true"></span> 나의 코알라')],
  ];
  let html = signedIn ? "" : badgeSignupLockHtml();
  html += `<p class="badge-summary">${rwL(`Collected ${got} of ${cat.length} koala badges`, `코알라 배지 ${cat.length}개 중 ${got}개 모았어요`)}</p>`;
  groups.forEach(([g, title]) => {
    html += `<h4 class="badge-group-title">${title}</h4><div class="badge-grid">`;
    cat.filter((b) => b.group === g).forEach((b, i) => {
      const on = signedIn && !!progress.badges[b.id];
      const premiumNote = b.paidOnly && !paid ? `<div class="badge-desc badge-premium">${rwL("Premium", "프리미엄")}</div>` : "";
      if (on) {
        // Earned: full colour + a soft glow / shine (staggered so they don't all pulse together).
        html += `<div class="badge-card earned" style="--badge-delay:${(i % 5) * 0.45}s" title="${escapeHtml(b.desc)}">
          <div class="badge-medal-wrap"><div class="badge-medal"><span class="badge-koala">${b.emoji}</span></div><span class="badge-sticker" aria-hidden="true"><span class="kface" aria-hidden="true"></span></span></div>
          <div class="badge-name">${escapeHtml(b.name)}</div>
          <div class="badge-desc">${escapeHtml(b.desc)}</div></div>`;
      } else {
        // Locked: the medal itself turns into a faded grey silhouette with a tiny
        // padlock patch on top; tapping the card opens the unlock-condition tooltip.
        html += `<div class="badge-card locked" role="button" tabindex="0" data-badge-id="${escapeHtml(b.id)}" aria-label="${escapeHtml(b.name)} — ${rwL("locked, tap to see how to unlock", "잠김, 눌러서 해금 조건 보기")}">
          <div class="badge-medal-wrap"><div class="badge-medal"><span class="badge-koala">${b.emoji}</span></div><span class="badge-lock-patch" aria-hidden="true">🔒</span></div>
          <div class="badge-name">${escapeHtml(b.name)}</div>
          <div class="badge-desc">${escapeHtml(b.desc)}</div>${premiumNote}</div>`;
      }
    });
    html += `</div>`;
  });
  return html;
}

function renderBadgePanel() {
  hideBadgeTip();
  statsPanels.badges.innerHTML = badgeGridHtml();
}

/* ---- Locked-badge tooltip: tap a locked badge to see its name + how to unlock it ---- */
let badgeTipEl = null;
let badgeTipOwner = null; // the .badge-card the tooltip currently points at

function hideBadgeTip() {
  if (badgeTipEl) { badgeTipEl.remove(); badgeTipEl = null; }
  if (badgeTipOwner) { badgeTipOwner.classList.remove("tip-open"); badgeTipOwner.removeAttribute("aria-describedby"); badgeTipOwner = null; }
}

function showBadgeTip(card) {
  const b = buildBadgeCatalog().find((x) => x.id === card.dataset.badgeId);
  if (!b) return;
  hideBadgeTip();
  const premiumOnly = b.paidOnly && !canUsePaidFeatures();
  const tip = document.createElement("div");
  tip.className = "badge-tip";
  tip.id = "badge-tip";
  tip.setAttribute("role", "tooltip");
  tip.innerHTML = `<div class="badge-tip-name"><span aria-hidden="true">${b.emoji}</span> ${escapeHtml(b.name)}</div>
    <div class="badge-tip-label">${rwL("🎯 How to unlock", "🎯 해금 조건")}</div>
    <div class="badge-tip-desc">${escapeHtml(b.desc)}</div>
    ${premiumOnly ? `<div class="badge-tip-premium">${rwL("Premium members only", "프리미엄 회원 전용 배지예요")}</div>` : ""}
    <span class="badge-tip-arrow" aria-hidden="true"></span>`;
  document.body.appendChild(tip);

  // Position above the card (or below if there's no room), clamped to the viewport.
  const r = card.getBoundingClientRect();
  const tw = tip.offsetWidth, th = tip.offsetHeight, margin = 8;
  let left = r.left + r.width / 2 - tw / 2;
  left = Math.max(margin, Math.min(left, window.innerWidth - tw - margin));
  const above = r.top - th - 12 >= margin;
  const top = above ? r.top - th - 12 : Math.min(r.bottom + 12, window.innerHeight - th - margin);
  tip.classList.toggle("below", !above);
  tip.style.left = `${Math.round(left)}px`;
  tip.style.top = `${Math.round(top)}px`;
  tip.style.setProperty("--arrow-x", `${Math.round(Math.max(18, Math.min(r.left + r.width / 2 - left, tw - 18)))}px`);

  card.classList.add("tip-open");
  card.setAttribute("aria-describedby", "badge-tip");
  badgeTipEl = tip;
  badgeTipOwner = card;
}

document.addEventListener("click", (e) => {
  const card = e.target.closest(".badge-card.locked");
  if (card) {
    if (card === badgeTipOwner) hideBadgeTip(); else showBadgeTip(card);
    return;
  }
  if (badgeTipEl && !e.target.closest("#badge-tip")) hideBadgeTip();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { hideBadgeTip(); return; }
  if ((e.key === "Enter" || e.key === " ") && e.target.classList && e.target.classList.contains("badge-card") && e.target.classList.contains("locked")) {
    e.preventDefault();
    if (e.target === badgeTipOwner) hideBadgeTip(); else showBadgeTip(e.target);
  }
});
// The tooltip is positioned in viewport coordinates, so close it when the page moves under it.
window.addEventListener("scroll", hideBadgeTip, { passive: true, capture: true });
window.addEventListener("resize", hideBadgeTip);

/* ================= MY KOALA (reward hub — Phase 1 foundation + Phase 2 character) ================= */
// Everything the child has earned lives here: Koala level, Koala Coins,
// learning streak, badges, and the dress-up Koala (Character tab). The Room is
// a later phase — nothing is stubbed in the UI for it.
// The coin is drawn, not an emoji: the coin emoji glyph is missing from many
// Windows and older Android fonts and shows up as an empty box. Sizes with the text.
const FLASH_ICON_SVG = '<svg class="fl-svg" viewBox="0 0 44 36" width="1.15em" height="1em" fill="none" aria-hidden="true" focusable="false"><rect x="4" y="9" width="26" height="20" rx="5" fill="#d9f3ea" stroke="#0b6b57" stroke-width="2.5" transform="rotate(-9 17 19)"/><rect x="12" y="5" width="27" height="21" rx="5" fill="#fff" stroke="#0b6b57" stroke-width="2.5"/><path d="M19 15.5h13M19 20h8" stroke="#02c39a" stroke-width="2.6" stroke-linecap="round"/><path d="M33 29c3-1 5-4 4.5-7.5" stroke="#f5a623" stroke-width="2.8" stroke-linecap="round"/></svg>';
const COIN_SVG = '<svg class="koala-coin" viewBox="0 0 24 24" width="1.1em" height="1.1em" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="10.5" fill="#f6c343" stroke="#c98a12" stroke-width="1.5"/><circle cx="12" cy="12" r="7" fill="none" stroke="#e0a21a" stroke-width="1.2"/><path d="M12 7.2v9.6M9.3 9.6c0-1.2 1.2-1.9 2.7-1.9s2.7.7 2.7 1.9c0 2.7-5.4 1.5-5.4 4.2 0 1.2 1.2 2 2.7 2s2.7-.8 2.7-2" fill="none" stroke="#a86f0c" stroke-width="1.3" stroke-linecap="round"/></svg>';

const KOALA_REASON_LABELS = () => ({
  quiz: rwL("Quiz", "퀴즈"),
  spelling: rwL("Spelling", "스펠링"),
  flashcards: rwL("Flashcards", "플래시카드"),
  timesTable: rwL("Times Table", "구구단"),
  typing: rwL("Typing Game", "타이핑 게임"),
  review: rwL("Review session", "복습"),
  dailyMission: rwL("Today's Mission", "오늘의 미션"),
  badge: rwL("New badge", "새 배지"),
  adminGift: rwL("Gift from Koala Study Mate", "코알라 스터디 메이트의 선물"),
  adminAdjust: rwL("Coins adjusted", "코인 조정"),
});
const KOALA_SLOT_TITLES = () => ({
  headwear: rwL("🎩 Headwear", "🎩 머리"),
  face: rwL("👓 Face", "👓 얼굴"),
  clothing: rwL("👕 Clothing", "👕 옷"),
  jewelry: rwL("💍 Jewelry", "💍 쥬얼리"),
  shoes: rwL("👟 Shoes", "👟 신발"),
  accessory: rwL("🎒 Accessories", "🎒 소품"),
  wallpaper: rwL("🎨 Wall", "🎨 벽지"),
  rug: rwL("🟡 Rug", "🟡 러그"),
  poster: rwL("🖼️ Posters & Frames", "🖼️ 포스터·액자"),
  desk: rwL("📚 Desk", "📚 책상"),
  lamp: rwL("💡 Lamp", "💡 램프"),
  shelf: rwL("📖 Bookshelf", "📖 책장"),
  plant: rwL("🪴 Plant", "🪴 화분"),
  window: rwL("🪟 Window", "🪟 창문"),
  garland: rwL("🎏 Hanging Decor", "🎏 천장 장식"),
  pet: rwL("🐾 Pets", "🐾 반려동물"),
  toy: rwL("🧸 Toy Boxes", "🧸 장난감 상자"),
});
const KOALA_SLOT_EMOJI = { headwear: "🎩", face: "👓", clothing: "👕", jewelry: "💍", shoes: "👟", accessory: "🎒", wallpaper: "🎨", rug: "🟡", poster: "🖼️", desk: "📚", lamp: "💡", shelf: "📖", plant: "🪴", window: "🪟", garland: "🎏", pet: "🐾", toy: "🧸" };
let koalaTab = "character"; // "character" | "room" | "coins" | "badges"
// The shop is a 2-split studio: the live preview stays on top, the item grid sits below.
let koalaSlotPick = { character: "headwear", room: "wallpaper" }; // category chip per tab
let koalaTry = null; // item id being tried on in the preview (not owned / not worn yet)
let koalaSellMode = false; // shop cards turn into "sell back" buttons
let koalaPick = null; // room item (bookshelf, desk, frame, toy box…) whose sub-items are listed under the preview

// The admin account has unlimited coins: nothing is ever short, nothing is spent.
const koalaOpts = () => ({ unlimited: !!serverAdmin });

const koalaItemName = (it) => it.name[currentLang === "ko" ? "ko" : "en"];

// The sentence under an item that says exactly where it stands — a locked item
// always says what is still missing.
function koalaItemStatusText(st) {
  if (st.state === "equipped") return rwL("✓ Wearing — tap to take off", "✓ 입는 중 — 눌러서 벗기");
  if (st.state === "owned") return rwL("Tap to wear", "눌러서 입기");
  if (st.state === "buyable") return `${COIN_SVG} ${rwL(`${st.cost} Coins — tap to unlock`, `${st.cost}코인 — 눌러서 열기`)}`;
  if (st.need === "season") return rwL("🎄 Back next season", "🎄 다음 시즌에 만나요");
  if (st.need === "badge") {
    const b = buildBadgeCatalog().find((x) => x.id === st.badge);
    return rwL(`🔒 Earn the "${b ? b.name : st.badge}" badge`, `🔒 "${b ? b.name : st.badge}" 배지를 받으면 열려요`);
  }
  if (st.need === "coins") return rwL(`🔒 ${st.short} more Coins to unlock`, `🔒 ${st.short}코인 더 모으면 열려요`);
  return rwL(`🔒 Reach a ${st.days}-day streak (best so far: ${st.have})`, `🔒 ${st.days}일 연속 학습하면 열려요 (최고 ${st.have}일)`);
}

// What a shop card says under the name: the price, "wearing", or what is missing.
function koalaItemShortStatus(st) {
  if (st.state === "equipped") return `<span class="koala-item-status on">${rwL("✓ Wearing", "✓ 착용중")}</span>`;
  if (st.state === "owned") return `<span class="koala-item-status own">${rwL("Mine", "보유")}</span>`;
  if (st.state === "buyable") return `<span class="koala-item-status cost">${COIN_SVG} ${st.cost}</span>`;
  if (st.need === "season") return `<span class="koala-item-status">${rwL("⏳ Seasonal", "⏳ 시즌")}</span>`;
  if (st.need === "badge") return `<span class="koala-item-status">${rwL("🔒 Badge", "🔒 배지")}</span>`;
  if (st.need === "coins") return `<span class="koala-item-status">${COIN_SVG} ${st.cost}</span>`;
  return `<span class="koala-item-status">${rwL(`🔒 ${st.days} days`, `🔒 ${st.days}일`)}</span>`;
}

// Shop card: tap it and the preview above changes straight away.
function koalaItemCardHtml(it) {
  const st = KoalaCore.itemStatus(progress, it, koalaOpts());
  const name = koalaItemName(it);
  const plain = koalaItemStatusText(st).replace(/<[^>]*>/g, "");
  const trying = koalaTry === it.id;
  if (koalaSellMode) {
    const sellable = !!it.unlock.coins && (st.state === "owned" || st.state === "equipped");
    if (sellable) {
      return `<button type="button" class="koala-item is-sell" data-koala-sell="${it.id}" aria-label="${escapeHtml(name)} — ${escapeHtml(rwL("Sell back", "되팔기"))}" title="${escapeHtml(name)}">
        <span class="koala-item-pic" aria-hidden="true">${KoalaArt.itemIcon(it.id)}</span>
        <span class="koala-item-name">${escapeHtml(name)}</span><span class="koala-item-status sell">💰 +${KoalaCore.sellValue(it.unlock.coins)}</span></button>`;
    }
    return `<button type="button" class="koala-item is-dim" disabled aria-label="${escapeHtml(name)}">
        <span class="koala-item-pic" aria-hidden="true">${KoalaArt.itemIcon(it.id)}</span>
        <span class="koala-item-name">${escapeHtml(name)}</span><span class="koala-item-status">${st.state === "owned" || st.state === "equipped" ? rwL("Can't sell", "못 팔아요") : "—"}</span></button>`;
  }
  const badge = st.state === "equipped" ? `<span class="koala-item-badge on" aria-hidden="true">✓</span>`
    : "";
  return `<button type="button" class="koala-item is-${st.state}${trying ? " is-trying" : ""}" data-koala-item="${it.id}"${st.state === "equipped" || trying ? ' aria-pressed="true"' : ""}
      aria-label="${escapeHtml(name)} — ${escapeHtml(plain)}" title="${escapeHtml(name)}">
      <span class="koala-item-pic" aria-hidden="true">${KoalaArt.itemIcon(it.id)}${badge}${it.season ? `<span class="koala-item-badge season" aria-hidden="true">⏳</span>` : ""}</span>
      <span class="koala-item-name">${escapeHtml(name)}</span>${koalaItemShortStatus(st)}</button>`;
}

// What the koala / room look like right now: what is worn, plus the item being tried on.
function koalaPreviewEq(k) {
  const eq = Object.assign({}, k.items.equipped);
  const it = koalaTry ? KoalaCore.itemById(koalaTry) : null;
  if (it) eq[it.slot] = it.id;
  return eq;
}

// The strip under the preview. Idle it is a hint; while trying on an item you don't have yet
// it says what that costs (or what is still missing) and offers "Unlock". It sits BELOW the
// stage so it never covers the koala's shoes. Always rendered, so the layout never jumps.
function koalaTryBarHtml() {
  const it = koalaTry ? KoalaCore.itemById(koalaTry) : null;
  if (!it) {
    return `<div class="koala-try-bar is-idle">${rwL("Tap an item to try it on · tap again to take it off", "아이템을 누르면 바로 입어 봐요 · 다시 누르면 벗어요")}</div>`;
  }
  const st = KoalaCore.itemStatus(progress, it, koalaOpts());
  const name = escapeHtml(koalaItemName(it));
  const cancel = `<button type="button" class="pill small koala-try-cancel" data-koala-try-clear>${rwL("Cancel", "취소")}</button>`;
  if (st.state === "buyable") {
    return `<div class="koala-try-bar" role="status"><span class="koala-try-name">${name}</span>
      <span class="koala-try-price">${COIN_SVG} ${st.cost}${serverAdmin ? " · " + rwL("free for Admin", "관리자는 무료") : ""}</span>
      <button type="button" class="pill accent small" data-koala-buy="${it.id}">${rwL("Unlock", "열기")}</button>${cancel}</div>`;
  }
  return `<div class="koala-try-bar is-locked" role="status"><span class="koala-try-name">${name}</span>
    <span class="koala-try-price">${koalaItemStatusText(st)}</span>${cancel}</div>`;
}

// ---- Sub-items: what is on the shelf / desk / frame / toy box ----
// Titles of the groups inside each kind of room item.
function koalaSubGroupTitle(kind, group) {
  if (kind === "books") return rwL("📚 Books on the shelf", "📚 책장에 꽂힌 책");
  if (kind === "desk") return group === "drawer" ? rwL("🗄️ In the drawer", "🗄️ 서랍 속") : rwL("✏️ On the desk", "✏️ 책상 위");
  if (kind === "frame") return rwL("🖼️ Pick a picture to hang", "🖼️ 걸 그림 고르기");
  if (kind === "collage") return rwL("👨‍👩‍👧 Family photos", "👨‍👩‍👧 가족 사진");
  if (kind === "petwear") return { head: rwL("🎩 Head", "🎩 머리"), neck: rwL("🧣 Neck", "🧣 목"), body: rwL("👕 Clothes", "👕 옷"), feet: rwL("👟 Shoes", "👟 신발") }[group];
  return rwL("🧸 Toys in the box", "🧸 상자 속 장난감");
}

function koalaSubCardHtml(parentId, s, on) {
  const name = escapeHtml(s.name[currentLang === "ko" ? "ko" : "en"]);
  const owned = KoalaCore.isSubOwned(progress, s.id);
  const status = on ? `<span class="koala-sub-st on">${rwL("✓ In use", "✓ 사용 중")}</span>`
    : owned ? `<span class="koala-sub-st own">${rwL("Mine", "보유")}</span>`
    : `<span class="koala-sub-st cost">${COIN_SVG} ${serverAdmin ? rwL("Free", "무료") : s.cost}</span>`;
  return `<button type="button" class="koala-sub${on ? " is-on" : ""}${owned ? "" : " is-locked"}" data-koala-sub="${parentId}|${s.id}" aria-pressed="${on}" aria-label="${name}">
    <span class="koala-sub-pic" aria-hidden="true">${KoalaArt.subIcon(s.id)}</span>
    <span class="koala-sub-name">${name}</span>${status}</button>`;
}

// The box right under the preview (same size as the stage). Idle: chips for every room item that has
// sub-items. Picked: that item's sub-items as cards.
function koalaSubBoxHtml(k, cls) {
  const eqIds = Object.values(k.items.equipped);
  if (koalaPick && !eqIds.includes(koalaPick)) koalaPick = null;
  const kind = koalaPick ? KoalaCore.subKind(koalaPick) : null;
  if (!kind) {
    const have = eqIds.filter((id) => KoalaCore.subKind(id));
    const chips = have.map((id) => {
      const it = KoalaCore.itemById(id);
      return `<button type="button" class="koala-subchip" data-koala-pick="${id}"><span class="koala-subchip-pic" aria-hidden="true">${KoalaArt.itemIcon(id)}</span>${escapeHtml(koalaItemName(it))}</button>`;
    }).join("");
    return `<div class="koala-subbox is-idle ${cls}" aria-label="${rwL("Inside your room items", "방 아이템 속 물건")}">
      <div class="koala-subbox-hint">${rwL("👆 Tap a bookshelf, desk, picture frame, toy box or pet in the room to see what goes with it!", "👆 방에 있는 책장·책상·액자·장난감 상자·반려동물을 눌러 보세요. 어울리는 물건이 나와요!")}</div>
      ${chips ? `<div class="koala-subchips">${chips}</div>` : `<div class="koala-subbox-hint is-sub">${rwL("Put a bookshelf, desk, frame, toy box or pet in your room first.", "먼저 책장, 책상, 액자, 장난감 상자, 반려동물을 방에 놓아 보세요.")}</div>`}</div>`;
  }
  const it = KoalaCore.itemById(koalaPick);
  const sel = KoalaCore.subSelection(progress, koalaPick);
  const subs = KoalaCore.subItemsFor(koalaPick);
  const groups = [];
  subs.forEach((s) => { let g = groups.find((x) => x.id === s.group); if (!g) groups.push(g = { id: s.group, list: [] }); g.list.push(s); });
  const body = groups.map((g) => {
    const lim = KoalaCore.subLimit(kind, g.id);
    const cnt = g.list.filter((s) => sel.includes(s.id)).length;
    const count = kind === "frame" || kind === "petwear" ? "" : ` <small>${cnt}/${lim}</small>`;
    return `<div class="koala-subgroup"><div class="koala-subgroup-title">${koalaSubGroupTitle(kind, g.id)}${count}</div>
      <div class="koala-subgrid">${g.list.map((s) => koalaSubCardHtml(koalaPick, s, sel.includes(s.id))).join("")}</div></div>`;
  }).join("");
  return `<div class="koala-subbox ${cls}" aria-label="${rwL("Inside your room items", "방 아이템 속 물건")}">
    <div class="koala-subbox-head"><span class="koala-subbox-icon" aria-hidden="true">${KoalaArt.itemIcon(koalaPick)}</span>
      <span class="koala-subbox-title">${escapeHtml(koalaItemName(it))}</span>
      <button type="button" class="koala-subbox-x" data-koala-pick-clear aria-label="${rwL("Close this list", "목록 닫기")}">✕</button></div>${body}</div>`;
}

// Pick a room item in the preview (or from a chip) to list what is inside it.
function koalaSetPick(id) {
  const k = KoalaCore.ensureKoala(progress);
  if (!id || !KoalaCore.subKind(id) || !Object.values(k.items.equipped).includes(id)) { koalaPick = null; renderKoala(); return; }
  koalaPick = koalaPick === id ? null : id;
  renderKoala();
  if (!koalaPick) return;
  // On phones the preview is pinned on top: make sure the list below it is on screen.
  requestAnimationFrame(() => {
    const box = [...document.querySelectorAll(".koala-subbox")].find((b) => b.offsetParent !== null);
    if (!box) return;
    const r = box.getBoundingClientRect();
    if (r.top < 0 || r.bottom > window.innerHeight) box.scrollIntoView({ block: "nearest", behavior: "smooth" });
  });
}

// A tapped scene item that has nothing inside gets a friendly note instead of silence.
function koalaNoSubNote(id) {
  const it = KoalaCore.itemById(id);
  const stage = document.getElementById("koala-stage");
  if (!it || !stage) return;
  stage.querySelectorAll(".koala-nosub").forEach((n) => n.remove());
  const n = document.createElement("div");
  n.className = "koala-nosub";
  n.setAttribute("role", "status");
  n.textContent = rwL(`${koalaItemName(it)} has nothing to add — try the bookshelf, desk, frame, toy box or a pet!`, `${koalaItemName(it)}에는 더할 물건이 없어요. 책장·책상·액자·장난감 상자·반려동물을 눌러 봐요!`);
  stage.appendChild(n);
  setTimeout(() => n.remove(), 2200);
}

function closeKoalaSubDetail() {
  const z = document.getElementById("koala-subdetail");
  if (z) z.remove();
  document.removeEventListener("keydown", koalaSubDetailKey);
}
function koalaSubDetailKey(e) { if (e.key === "Escape") closeKoalaSubDetail(); }

function koalaSubDetailBodyHtml(parentId, subId, msg, confirmSell) {
  const s = KoalaCore.subById(subId);
  const parent = KoalaCore.itemById(parentId);
  const kind = KoalaCore.subKind(parentId);
  const owned = KoalaCore.isSubOwned(progress, subId);
  const on = KoalaCore.subSelection(progress, parentId).includes(subId);
  const L = currentLang === "ko" ? "ko" : "en";
  const pname = escapeHtml(koalaItemName(parent));
  const k = KoalaCore.ensureKoala(progress);
  let act;
  if (!owned) {
    const short = serverAdmin ? 0 : s.cost - k.coins;
    act = short > 0
      ? `<span class="koala-subd-state">${COIN_SVG} ${s.cost} · ${rwL(`${short} more Coins to unlock`, `${short}코인 더 모으면 살 수 있어요`)}</span>`
      : `<button type="button" class="pill accent" data-koala-sub-buy>${COIN_SVG} ${serverAdmin ? rwL("Free for Admin", "관리자는 무료") : s.cost} · ${rwL("Buy", "구매하기")}</button>`;
  } else if (kind === "frame") {
    act = on ? `<span class="koala-subd-state">${rwL("✓ Hanging in the frame", "✓ 액자에 걸려 있어요")}</span>` : `<button type="button" class="pill accent" data-koala-sub-act>${rwL("🖼️ Hang this picture", "🖼️ 이 그림으로 걸기")}</button>`;
  } else {
    act = `<button type="button" class="pill ${on ? "" : "accent"}" data-koala-sub-act>${on ? rwL("Take it off", "빼기") : kind === "petwear" ? rwL(`Put it on the ${pname}`, `${pname}에게 입히기`) : rwL(`Put it in the ${pname}`, `${pname}에 놓기`)}</button>`;
  }
  let sell = "";
  if (owned && s.cost) {
    const back = serverAdmin ? 0 : KoalaCore.sellValue(s.cost);
    sell = confirmSell
      ? `<div class="koala-sell-box" role="alertdialog"><div>${serverAdmin ? rwL("Put it back in the shop? (Admin: nothing comes back.)", "상점으로 돌려보낼까요? (관리자는 환불이 없어요.)") : rwL(`Sell it back? You get <b>${back}</b> Coins (80% of ${s.cost}).`, `되팔까요? 가격 ${s.cost}코인의 80%인 <b>${back}코인</b>을 돌려받아요.`)}</div>
          <div class="koala-sell-btns"><button type="button" class="pill small" data-koala-sell-no>${rwL("Keep it", "그대로 두기")}</button><button type="button" class="pill small warn" data-koala-sell-yes>${rwL("Sell", "되팔기")}</button></div></div>`
      : `<button type="button" class="koala-sell-link" data-koala-sell-ask>💰 ${serverAdmin ? rwL("Sell back", "되팔기") : rwL(`Sell back (+${back})`, `되팔기 (+${back}코인)`)}</button>`;
  }
  return `<div class="koala-zoom-head"><span class="koala-subd-from">${pname}</span>
      <button type="button" class="koala-zoom-close" data-koala-zoom-close>${rwL("✕ Close", "✕ 닫기")}</button></div>
    <div class="koala-subd-stage ${kind === "frame" || kind === "collage" ? "is-wide" : ""}">${KoalaArt.subIcon(subId)}</div>
    <div class="koala-subd-name">${escapeHtml(s.name[L])}</div>
    <p class="koala-subd-desc">${escapeHtml(s.desc[L])}</p>
    <div class="koala-subd-act">${act}</div>${sell}
    <div class="koala-subd-msg" role="status">${msg ? escapeHtml(msg) : ""}</div>`;
}

// Detail popup for one sub-item: big picture, a few words about it, buy / put in / take out / sell back.
function openKoalaSubDetail(parentId, subId) {
  const s = KoalaCore.subById(subId);
  if (!s || !KoalaCore.subKind(parentId)) return;
  closeKoalaSubDetail();
  const el = document.createElement("div");
  el.id = "koala-subdetail";
  el.className = "koala-zoom-overlay";
  const card = document.createElement("div");
  card.className = "koala-zoom-card koala-subd-card";
  card.setAttribute("role", "dialog");
  card.setAttribute("aria-modal", "true");
  card.setAttribute("aria-label", s.name[currentLang === "ko" ? "ko" : "en"]);
  const show = (msg, confirmSell) => {
    card.innerHTML = koalaSubDetailBodyHtml(parentId, subId, msg, confirmSell);
    const b = card.querySelector("[data-koala-sub-buy],[data-koala-sub-act],[data-koala-sell-no]") || card.querySelector("[data-koala-zoom-close]");
    if (b) b.focus();
  };
  show("");
  el.appendChild(card);
  el.addEventListener("click", (e) => {
    if (e.target === el || e.target.closest("[data-koala-zoom-close]")) { closeKoalaSubDetail(); return; }
    const pname = koalaItemName(KoalaCore.itemById(parentId));
    if (e.target.closest("[data-koala-sub-buy]")) {
      const res = KoalaCore.buySub(progress, parentId, subId, koalaOpts());
      if (res.ok) { saveProgress(); renderKoala(); koalaSparkle(); show(rwL("Bought! 🎉", "구매했어요! 🎉")); }
      else show(res.reason === "notEnoughCoins" ? rwL("Not enough Coins yet.", "코인이 아직 모자라요.") : "");
      return;
    }
    if (e.target.closest("[data-koala-sub-act]")) {
      const res = KoalaCore.toggleSub(progress, parentId, subId, koalaOpts());
      let msg = "";
      if (res.ok) { saveProgress(); renderKoala(); koalaSparkle(); }
      else if (res.reason === "full") msg = rwL(`The ${pname} is full — take one off first!`, `${pname}이(가) 가득 찼어요. 하나를 먼저 빼 주세요!`);
      show(msg);
      return;
    }
    if (e.target.closest("[data-koala-sell-ask]")) { show("", true); return; }
    if (e.target.closest("[data-koala-sell-no]")) { show(""); return; }
    if (e.target.closest("[data-koala-sell-yes]")) {
      const res = KoalaCore.sellSub(progress, subId, koalaOpts());
      if (res.ok) {
        saveProgress(); renderKoala(); closeKoalaSubDetail();
        koalaSaleToast(KoalaCore.subById(subId).name[currentLang === "ko" ? "ko" : "en"], res);
      } else show("");
    }
  });
  document.body.appendChild(el);
  document.addEventListener("keydown", koalaSubDetailKey);
}

// "Sell back" for a bought item: shows what you paid, the 20% fee and what comes back.
function closeKoalaSell() {
  const z = document.getElementById("koala-sellconf");
  if (z) z.remove();
  document.removeEventListener("keydown", koalaSellKey);
}
function koalaSellKey(e) { if (e.key === "Escape") closeKoalaSell(); }
function openKoalaSellConfirm(id) {
  const it = KoalaCore.itemById(id);
  if (!it || !it.unlock.coins || !KoalaCore.ensureKoala(progress).items.owned[id]) return;
  closeKoalaSell();
  const paid = it.unlock.coins;
  const back = serverAdmin ? 0 : KoalaCore.sellValue(paid);
  const el = document.createElement("div");
  el.id = "koala-sellconf";
  el.className = "koala-zoom-overlay";
  const keepsSubs = KoalaCore.subKind(id) ? `<p class="koala-sell-note">${rwL("Things you bought for it stay yours.", "이 아이템에 쓰던 물건은 그대로 내 거예요.")}</p>` : "";
  el.innerHTML = `<div class="koala-zoom-card koala-subd-card" role="alertdialog" aria-modal="true" aria-label="${rwL("Sell back", "되팔기")}">
    <div class="koala-zoom-head"><span class="koala-subd-from">${rwL("Sell back?", "되팔까요?")}</span>
      <button type="button" class="koala-zoom-close" data-koala-zoom-close>${rwL("✕ Close", "✕ 닫기")}</button></div>
    <div class="koala-subd-stage">${KoalaArt.itemIcon(id)}</div>
    <div class="koala-subd-name">${escapeHtml(koalaItemName(it))}</div>
    <div class="koala-sell-math">
      <div><span>${rwL("Price you paid", "산 가격")}</span><b>${COIN_SVG} ${paid}</b></div>
      <div><span>${rwL("Fee (20%)", "수수료 (20%)")}</span><b>− ${serverAdmin ? 0 : paid - back}</b></div>
      <div class="total"><span>${rwL("Back to your wallet", "지갑으로 돌아와요")}</span><b>${COIN_SVG} +${back}</b></div></div>
    ${serverAdmin ? `<p class="koala-sell-note">${rwL("Admin has unlimited Coins, so nothing comes back.", "관리자는 코인이 무제한이라 환불은 없어요.")}</p>` : ""}${keepsSubs}
    <div class="koala-sell-btns"><button type="button" class="pill" data-koala-zoom-close>${rwL("Keep it", "그대로 두기")}</button><button type="button" class="pill warn" data-koala-sell-go>${rwL("Sell it", "되팔기")}</button></div></div>`;
  el.addEventListener("click", (e) => {
    if (e.target === el || e.target.closest("[data-koala-zoom-close]")) { closeKoalaSell(); return; }
    if (e.target.closest("[data-koala-sell-go]")) {
      const res = KoalaCore.sellItem(progress, id, koalaOpts());
      closeKoalaSell();
      if (res.ok) {
        if (koalaPick === id) koalaPick = null;
        checkBadges(); saveProgress(); renderKoala();
        koalaSaleToast(koalaItemName(it), res);
      }
    }
  });
  document.body.appendChild(el);
  document.addEventListener("keydown", koalaSellKey);
  const b = el.querySelector("[data-koala-zoom-close].pill");
  if (b) b.focus();
}

// A small note after selling: what came back and what the 20% fee was.
function koalaSaleToast(name, res) {
  rwToastQueue.push({ emoji: "💰", title: rwL("Sold back!", "되팔았어요!"), name: `${escapeHtml(name)} · ${res.refund ? rwL(`+${res.refund} Coins (fee ${res.fee})`, `+${res.refund}코인 (수수료 ${res.fee})`) : rwL("removed", "정리했어요")}` });
  showNextBadgeToast();
}

// Top half of the studio: coin bar, the live stage and the category tabs.
function koalaStudioTopHtml(k, mode) {
  const lv = KoalaCore.levelInfo(k.earned);
  const eq = koalaPreviewEq(k);
  // The character tab zooms in on the koala; the room tab shows the whole room.
  if (koalaPick && !Object.values(k.items.equipped).includes(koalaPick)) koalaPick = null;
  const scene = KoalaArt.room(eq, eq, {
    label: mode === "room" ? rwL("Your Koala's Study Room", "나의 코알라 공부방") : rwL("Your Koala", "나의 코알라"),
    shadow: true,
    view: mode === "room" ? undefined : "60 78 200 137.5",
    sub: k.items.sub || {},
    pick: mode === "room" ? koalaPick : null,
  });
  const slots = mode === "room" ? KoalaCore.ROOM_SLOTS : KoalaCore.ITEM_SLOTS;
  const titles = KOALA_SLOT_TITLES();
  const cats = slots.map((s) => `<button type="button" class="koala-cat${koalaSlotPick[mode] === s ? " on" : ""}" role="tab" aria-selected="${koalaSlotPick[mode] === s}" data-koala-cat="${s}">${titles[s]}</button>`).join("");
  return `<div class="koala-studio-top"><div class="koala-studio-preview">
    <div class="koala-studio-bar">
      <button type="button" class="koala-back" data-koala-go="landing">${rwL("‹ Back", "‹ 돌아가기")}</button>
      <span class="koala-studio-lv">${rwL(`Lv. ${lv.level}`, `Lv. ${lv.level}`)}</span>
      <span class="koala-studio-coins" aria-label="${rwL("Koala Coins", "코알라 코인")}">${COIN_SVG} <b>${serverAdmin ? "∞" : k.coins.toLocaleString()}</b></span>
    </div>
    ${mode === "room"
      ? `<div class="koala-stage is-room" id="koala-stage">${scene}<button type="button" class="koala-zoom-tag" data-koala-zoom="room" aria-label="${rwL("See the room bigger", "방 크게 보기")}">${rwL("🔍 Bigger", "🔍 크게 보기")}</button></div>`
      : `<div class="koala-stage is-${mode}" id="koala-stage" role="button" tabindex="0" data-koala-zoom="koala" aria-label="${rwL("Tap to see it bigger", "눌러서 크게 보기")}">${scene}<span class="koala-zoom-tag" aria-hidden="true">${rwL("🔍 Bigger", "🔍 크게 보기")}</span></div>`}
    ${koalaTryBarHtml()}${mode === "room" ? koalaSubBoxHtml(k, "is-in-preview") : ""}</div>
    <div class="koala-cats" role="tablist" aria-label="${rwL("Item categories", "아이템 종류")}">${cats}</div>
  </div>`;
}

// Bottom half: the items of the chosen category as a grid.
function koalaShopGridHtml(mode) {
  const slot = koalaSlotPick[mode];
  const items = KoalaCore.visibleItems(progress, slot, { showAll: serverAdmin });
  const have = items.filter((it) => { const s = KoalaCore.itemStatus(progress, it, koalaOpts()).state; return s === "equipped" || s === "owned"; }).length;
  const sellable = KoalaCore.ITEMS.some((it) => it.unlock.coins && KoalaCore.ensureKoala(progress).items.owned[it.id]);
  const sellBtn = sellable || koalaSellMode
    ? `<button type="button" class="pill small koala-sellmode${koalaSellMode ? " on" : ""}" data-koala-sellmode aria-pressed="${koalaSellMode}">${koalaSellMode ? rwL("✓ Done", "✓ 끝내기") : rwL("💰 Sell back", "💰 되팔기")}</button>` : "";
  return `<div class="koala-shelf-head"><span class="koala-shelf-title">${KOALA_SLOT_TITLES()[slot]} <small>${have}/${items.length}</small></span>${sellBtn}</div>
    ${koalaSellMode ? `<p class="koala-sell-hint">${rwL("Tap an item you bought to sell it back. You get 80% of its price in your coin wallet.", "산 아이템을 누르면 되팔 수 있어요. 가격의 80%가 코인 지갑으로 돌아와요.")}</p>` : ""}
    <div class="koala-grid">${items.map(koalaItemCardHtml).join("")}</div>`;
}

// One shop panel for both tabs: Character (what the koala wears) and Room (what is in the room).
function koalaStudioHtml(k, mode) {
  return `<div class="koala-studio">${koalaStudioTopHtml(k, mode)}${mode === "room" ? koalaSubBoxHtml(k, "is-flow") : ""}<div class="koala-shelf">${koalaShopGridHtml(mode)}</div>
    ${koalaNextRewardHtml(mode)}${mode === "room" ? koalaTrophyWallHtml() : ""}</div>`;
}

function koalaNextRewardHtml(kind) {
  const nr = KoalaCore.nextReward(progress, Object.assign({ kind: kind || "character" }, koalaOpts()));
  if (!nr) return `<div class="koala-next"><div class="koala-next-main"><div class="koala-next-title">${rwL("🎉 You unlocked every item!", "🎉 모든 아이템을 열었어요!")}</div></div></div>`;
  const name = escapeHtml(koalaItemName(nr.item));
  const sub = serverAdmin
    ? rwL("Admin: unlimited Coins ∞", "관리자: 코인 무제한 ∞")
    : nr.affordable
    ? rwL("You have enough Coins!", "코인이 충분해요!")
    : rwL(`${nr.coins} / ${nr.cost} Coins — ${nr.toGo} more Coins to unlock`, `${nr.coins} / ${nr.cost}코인 — ${nr.toGo}코인 더 모으면 열려요`);
  const action = nr.affordable ? `<button type="button" class="pill accent small koala-next-btn" data-koala-item="${nr.item.id}">${rwL("Unlock now", "지금 열기")}</button>` : "";
  return `<div class="koala-next"><div class="koala-next-pic" aria-hidden="true">${KoalaArt.itemIcon(nr.item.id)}</div>
    <div class="koala-next-main"><div class="koala-next-title">${rwL("🎁 Next reward:", "🎁 다음 보상:")} ${name}</div>
    <div class="koala-level-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${nr.cost}" aria-valuenow="${Math.min(nr.coins, nr.cost)}"
      aria-label="${rwL("Coins towards the next reward", "다음 보상까지 코인")}"><span style="width:${nr.pct}%"></span></div>
    <div class="koala-next-sub">${sub}</div>${action}</div></div>`;
}

// "Earn more Coins": where the child stands today in each activity, with a
// button straight into it. Mirrors KoalaCore.REWARD_CONFIG so numbers never drift.
const KOALA_EARN = [
  { mode: "quiz", why: "quiz", view: "quiz", emoji: "💡" },
  { mode: "spelling", why: "spelling", view: "spelling", emoji: "✏️" },
  { mode: "flash", why: "flashcards", view: "flashcards", emoji: FLASH_ICON_SVG },
  { mode: "tt", why: "timesTable", view: "timestable", emoji: "🧮" },
  { mode: "typing", why: "typing", view: "typegame", emoji: "⌨️" },
];
function koalaEarnHtml() {
  const cfg = KoalaCore.REWARD_CONFIG;
  const day = localDateKey(new Date());
  const today = (progress.daily && progress.daily[day]) || {};
  const labels = KOALA_REASON_LABELS();
  // A done-for-today row can't be acted on further, so it gets a quieter
  // pastel background and its GO button turns into a disabled "Done ✓"
  // pill — same pattern as the daily-mission row below — instead of the
  // button just vanishing, which read as a blank space rather than
  // "you already finished this."
  const doneBtnHtml = () => `<button type="button" class="pill small neutral koala-earn-done" disabled>${rwL("Done ✓", "완료됨 ✓")}</button>`;
  const rows = KOALA_EARN.map((e) => {
    const lp = KoalaCore.learningProgress(e.mode, (today[e.mode] && today[e.mode][0]) || 0);
    const text = lp.capped
      ? rwL("✓ All done for today", "✓ 오늘은 다 했어요")
      : rwL(`${lp.have} / ${lp.goal} correct`, `${lp.have} / ${lp.goal} 정답`);
    return `<li class="koala-earn-row${lp.capped ? " koala-earn-row--done" : ""}"><span class="koala-earn-emoji" aria-hidden="true">${e.emoji}</span>
      <span class="koala-earn-main"><span class="koala-earn-name">${labels[e.why]} <b>+${lp.coins}</b> ${COIN_SVG}</span>
      <span class="koala-level-bar" aria-hidden="true"><span style="width:${Math.round((lp.have / lp.goal) * 100)}%"></span></span>
      <small>${text}</small></span>
      ${lp.capped ? doneBtnHtml() : `<button type="button" class="pill small koala-earn-go" data-koala-go="${e.view}">${rwL("Go", "GO")}</button>`}</li>`;
  }).join("");
  const missionDone = progress.missionDone === day;
  return `<div class="koala-earn"><div class="koala-earn-title">${COIN_SVG} ${rwL("Earn more Coins", "코인 더 모으기")}</div>
    <p class="koala-note">${rwL(
      `Every ${cfg.learning.correctPerReward} correct answers earn Coins (up to ${cfg.learning.dailyRewardsPerMode} times per activity each day). Wrong answers never cost Coins.`,
      `정답 ${cfg.learning.correctPerReward}개마다 코인을 받아요 (활동마다 하루 ${cfg.learning.dailyRewardsPerMode}번까지). 틀려도 코인은 줄지 않아요.`)}</p>
    <ul class="koala-earn-list">${rows}
      <li class="koala-earn-row${missionDone ? " koala-earn-row--done" : ""}"><span class="koala-earn-emoji" aria-hidden="true">🎯</span><span class="koala-earn-main"><span class="koala-earn-name">${labels.dailyMission} <b>+${cfg.coins.dailyMission}</b> ${COIN_SVG}</span>
        <small>${missionDone ? rwL("✓ Done today", "✓ 오늘 완료") : rwL("Finish all 3 mission tasks", "미션 3개를 모두 끝내요")}</small></span>
        ${missionDone ? doneBtnHtml() : `<button type="button" class="pill small koala-earn-go" data-koala-go="landing">${rwL("Go", "GO")}</button>`}</li>
      <li class="koala-earn-row"><span class="koala-earn-emoji" aria-hidden="true">🏆</span><span class="koala-earn-main"><span class="koala-earn-name">${labels.badge} <b>+${cfg.badgeDefault}</b> ${COIN_SVG}</span>
        <small>${rwL("Every new badge pays a bonus", "새 배지를 받을 때마다 보너스")}</small></span>
        <button type="button" class="pill small koala-earn-go" data-koala-tab="badges">${rwL("Badges", "배지")}</button></li>
    </ul></div>`;
}

// Study Room: the koala at home. The scene shows what is equipped; the
// trophy wall shows every badge earned so far.
function koalaTrophyWallHtml() {
  const cat = buildBadgeCatalog();
  const got = cat.filter((b) => progress.badges[b.id]).sort((a, b) => progress.badges[a.id] - progress.badges[b.id]);
  const shelf = got.length
    ? got.map((b) => `<span class="koala-trophy" title="${escapeHtml(String(b.name).replace(/<[^>]*>/g, ""))}"><span class="koala-trophy-ico" aria-hidden="true">${b.emoji}</span><span class="koala-trophy-name">${b.name}</span></span>`).join("")
    : `<p class="koala-note">${rwL("Earn badges and they appear here on your wall!", "배지를 모으면 이곳 트로피 벽에 걸려요!")}</p>`;
  return `<h4 class="badge-group-title">${rwL("🏆 Trophy wall", "🏆 트로피 벽")} <small>${got.length}/${cat.length}</small></h4>
    <div class="koala-trophy-wall">${shelf}</div>`;
}

// The coin wallet: what you have now, what you earned, spent in the shop and got back by selling.
function koalaCoinsHtml(k) {
  const inf = serverAdmin;
  return `<div class="koala-wallet">
      <div class="koala-wallet-top"><span class="koala-wallet-ico" aria-hidden="true">${COIN_SVG}</span>
        <div><div class="koala-wallet-lbl">${rwL("👛 My Coin Wallet", "👛 나의 코인 지갑")}${inf ? " · " + rwL("Admin — unlimited", "관리자 — 무제한") : ""}</div>
          <div class="koala-wallet-val">${inf ? "∞" : k.coins.toLocaleString()}</div></div></div>
      <div class="koala-wallet-stats">
        <div class="koala-wallet-stat"><span>${rwL("⭐ Earned", "⭐ 번 코인")}</span><b>+${k.earned.toLocaleString()}</b></div>
        <div class="koala-wallet-stat"><span>${rwL("🛒 Spent", "🛒 쓴 코인")}</span><b>−${k.spent.toLocaleString()}</b></div>
        <div class="koala-wallet-stat"><span>${rwL("💰 Sold back", "💰 되판 환불")}</span><b>+${k.refunded.toLocaleString()}</b></div></div>
      <p class="koala-wallet-note">${rwL("Sell an item back and 80% of its price returns here (a 20% fee). Every buy and sale is listed below.", "산 아이템을 되팔면 가격의 80%가 이 지갑으로 돌아와요 (수수료 20%). 사고 판 내역은 아래에 모두 기록돼요.")}</p></div>
    ${koalaNextRewardHtml()}${koalaEarnHtml()}
    <h3 class="koala-h">${COIN_SVG} ${rwL("Coin history", "코인 내역")}</h3>${koalaHistoryHtml(k)}`;
}

function koalaHistoryHtml(k) {
  const labels = KOALA_REASON_LABELS();
  const recent = k.ledger.slice(-30).reverse();
  if (!recent.length) {
    return `<p class="koala-note">${rwL("No Coins yet — answer 10 questions correctly to earn your first Koala Coins!", "아직 코인이 없어요. 정답 10개를 맞히면 첫 코알라 코인을 받아요!")}</p>`;
  }
  const label = (why) => {
    const w = String(why);
    const subName = (id) => { const x = KoalaCore.subById(id); return x ? x.name[currentLang === "ko" ? "ko" : "en"] : id; };
    if (w.startsWith("item:")) { const it = KoalaCore.itemById(w.slice(5)); return "🛒 " + (it ? koalaItemName(it) : w) + rwL(" (bought)", " 구매"); }
    if (w.startsWith("sub:")) return "🛒 " + subName(w.slice(4)) + rwL(" (bought)", " 구매");
    if (w.startsWith("sell:")) { const it = KoalaCore.itemById(w.slice(5)); return "💰 " + (it ? koalaItemName(it) : w) + rwL(" (sold back, 80%)", " 되팔기 (80%)"); }
    if (w.startsWith("sellsub:")) return "💰 " + subName(w.slice(8)) + rwL(" (sold back, 80%)", " 되팔기 (80%)");
    return labels[why] || why;
  };
  return `<ul class="koala-history">${recent.map((e) => `<li><span class="koala-history-n${e.n < 0 ? " spent" : ""}">${e.n < 0 ? "−" : "+"}${Math.abs(e.n)} ${COIN_SVG}</span><span class="koala-history-why">${escapeHtml(label(e.why))}</span><span class="koala-history-day">${new Date(e.t).toLocaleDateString(currentLang === "ko" ? "ko-KR" : "en-AU", { day: "numeric", month: "short" })}</span></li>`).join("")}</ul>`;
}

// Streak items (Golden Crown) open by themselves; tell the child when one does.
function announceKoalaUnlocks() {
  if (!canUseAccountFeatures()) return;
  const fresh = KoalaCore.syncStreakUnlocks(progress);
  if (!fresh.length) return;
  fresh.forEach((id) => {
    const it = KoalaCore.itemById(id);
    rwToastQueue.push({ emoji: KOALA_SLOT_EMOJI[it.slot], title: rwL("New item unlocked!", "새 아이템 해금!"), name: koalaItemName(it) });
  });
  showNextBadgeToast();
  saveProgress();
}

function renderKoala() {
  const box = document.getElementById("koala-body");
  if (!box) return;

  if (!canUseAccountFeatures()) {
    box.innerHTML = `<div class="rw-lock"><div class="rw-lock-icon"><span class="kface" aria-hidden="true"></span>🔒</div>
      <div class="rw-lock-title">${rwL("Sign in to meet your Koala", "로그인하고 나의 코알라를 만나요")}</div>
      <p>${rwL("Your Koala keeps your level, streak and badges as you learn. Create a free account to get started.", "나의 코알라가 레벨, 연속 학습, 배지를 모아 줘요. 무료 계정을 만들어 시작해요.")}</p>
      <button type="button" class="pill accent small" data-rw-signup>${rwL("Sign up / Log in", "가입 / 로그인")}</button></div>`;
    return;
  }

  ensureRewardData();
  announceKoalaUnlocks();
  const k = KoalaCore.ensureKoala(progress);
  const lv = KoalaCore.levelInfo(k.earned);
  const st = currentStreakStatus();
  const cfg = KoalaCore.REWARD_CONFIG.streak;
  const cat = buildBadgeCatalog();
  const badgeCount = cat.filter((b) => progress.badges[b.id]).length;

  // Kid-friendly streak card: a flame that flickers once today's flame is lit, short cheerful lines, a goal bar.
  const goal = st.nextMilestone || 0;
  const goalPct = goal ? Math.min(100, Math.round((st.count / goal) * 100)) : 100;
  const streakTitle = st.count > 0
    ? rwL(`<b>${st.count}</b>-day fire streak!`, `<b>${st.count}</b>일 연속 불꽃 학습!`)
    : rwL("Let's light your first flame!", "첫 불꽃을 켜 볼까요?");
  const streakSub = st.countedToday
    ? rwL("✅ Today's flame is ON — great job!", "✅ 오늘의 불꽃 ON! 정말 멋져요!")
    : rwL(`Answer ${st.answersToGo} more to light today's flame!`, `${st.answersToGo}문제만 더 풀면 오늘의 불꽃이 켜져요!`);
  const streakGoal = goal ? `<div class="koala-streak-goal"><span class="koala-streak-goal-lbl">${rwL(`🎯 Next goal: ${st.count} / ${goal} days`, `🎯 다음 목표까지 ${st.count} / ${goal}일`)}</span>
      <div class="koala-level-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${goal}" aria-valuenow="${Math.min(st.count, goal)}"
        aria-label="${rwL("Progress to the next streak goal", "다음 연속 목표까지")}"><span style="width:${goalPct}%"></span></div></div>` : "";
  const streakChips = [
    rwL(`📝 ${cfg.minAnswersPerDay} questions a day`, `📝 하루 ${cfg.minAnswersPerDay}문제`),
    rwL(`🏅 Best: ${st.best} ${st.best === 1 ? "day" : "days"}`, `🏅 최고 ${st.best}일`),
    st.restAvailable ? rwL("🌙 1 rest day — your flame stays on!", "🌙 쉬는 날 1번! 쉬어도 불꽃은 그대로!") : "",
  ].filter(Boolean).map((c) => `<span class="koala-streak-chip">${c}</span>`).join("");

  const studio = koalaTab === "character" || koalaTab === "room";
  const heroAvatar = `<div class="koala-hero-avatar">${KoalaArt.avatar(k.items.equipped, { label: rwL("Your Koala", "나의 코알라") })}</div>`;
  const hero = `<div class="koala-hero">${studio ? "" : heroAvatar}
      <div class="koala-hero-main">
        <div class="koala-hero-level">${rwL(`Koala Lv. ${lv.level}`, `코알라 Lv. ${lv.level}`)}</div>
        <div class="koala-level-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${lv.span}" aria-valuenow="${lv.intoLevel}"
          aria-label="${rwL("Progress to next Koala level", "다음 코알라 레벨까지")}"><span style="width:${lv.pct}%"></span></div>
        <div class="koala-hero-next">${serverAdmin ? rwL("Admin: unlimited Coins ∞", "관리자: 코인 무제한 ∞") : rwL(`🎉 Just ${lv.toNext} more Coins to reach Lv. ${lv.level + 1}!`, `🎉 Lv. ${lv.level + 1}까지 코인 ${lv.toNext}개만 더!`)}</div>
        <div class="koala-hero-streak">
          <div class="koala-streak-row"><span class="koala-flame${st.countedToday ? " on" : ""}" aria-hidden="true">🔥</span>
            <div class="koala-streak-text"><div class="koala-streak-title">${streakTitle}</div><div class="koala-streak-sub">${streakSub}</div></div></div>
          ${streakGoal}<div class="koala-streak-chips">${streakChips}</div></div>
      </div>
    </div>`;

  const tabDefs = [
    ["character", rwL('<span class="kface" aria-hidden="true"></span> Character', '<span class="kface" aria-hidden="true"></span> 캐릭터')],
    ["room", rwL("🏠 Room", "🏠 방")],
    ["coins", rwL(COIN_SVG + " Coins", COIN_SVG + " 코인")],
    ["badges", rwL("🏆 Badges", "🏆 배지")],
  ];
  const tabs = `<div class="stats-tabs koala-tabs" role="tablist">${tabDefs.map(([id, label]) =>
    `<button type="button" class="stats-tab${koalaTab === id ? " on" : ""}" role="tab" aria-selected="${koalaTab === id}" data-koala-tab="${id}">${label}</button>`).join("")}</div>`;

  const badgePct = cat.length ? Math.round((badgeCount / cat.length) * 100) : 0;
  const badgesPanel = `<div class="koala-balance koala-badge-sum"><span class="koala-balance-ico" aria-hidden="true">🏆</span>
      <div><div class="koala-balance-val">${badgeCount}/${cat.length}</div><div class="koala-balance-lbl">${rwL("Badges collected", "모은 배지")}</div>
      <div class="koala-level-bar" aria-hidden="true"><span style="width:${badgePct}%"></span></div></div></div>${badgeGridHtml()}`;

  // Shop tabs (Character / Room): tabs, then the studio (live preview on top, items below), level + streak last.
  // Coins / Badges keep the plain page: level card, tabs, panel.
  const page = studio
    ? `${tabs}${koalaStudioHtml(k, koalaTab)}${hero}`
    : `${hero}${tabs}<div class="koala-panel">${koalaTab === "badges" ? badgesPanel : koalaCoinsHtml(k)}</div>`;

  // Re-rendering must not make the page or the category strip jump.
  const prevCats = box.querySelector(".koala-cats");
  const catsLeft = prevCats ? prevCats.scrollLeft : 0;
  const scrollY = window.scrollY;
  box.innerHTML = `<div class="koala-view${studio ? " is-studio" : ""}">${page}</div>`;
  const cats = box.querySelector(".koala-cats");
  if (cats) {
    cats.scrollLeft = catsLeft;
    const on = cats.querySelector(".koala-cat.on");
    if (on && (on.offsetLeft < cats.scrollLeft || on.offsetLeft + on.offsetWidth > cats.scrollLeft + cats.clientWidth)) {
      cats.scrollLeft = on.offsetLeft - (cats.clientWidth - on.offsetWidth) / 2;
    }
  }
  if (Math.abs(window.scrollY - scrollY) > 1) window.scrollTo(0, scrollY);
}

// A few sparkles over the Koala (or the room) after an item is put on.
function koalaSparkle() {
  const host = document.getElementById("koala-stage") || document.querySelector(".koala-hero-avatar");
  if (!host) return;
  host.classList.add("koala-sparkling");
  for (let i = 0; i < 6; i++) {
    const sp = document.createElement("span");
    sp.className = "koala-sparkle";
    sp.textContent = "✦";
    sp.style.setProperty("--sx", `${10 + Math.round(Math.random() * 80)}%`);
    sp.style.setProperty("--sy", `${10 + Math.round(Math.random() * 70)}%`);
    sp.style.animationDelay = `${i * 70}ms`;
    host.appendChild(sp);
  }
  setTimeout(() => { host.classList.remove("koala-sparkling"); host.querySelectorAll(".koala-sparkle").forEach((n) => n.remove()); }, 1100);
}

// Level-up celebration. The level a child last saw is kept in progress.koala;
// the first time we look (or after a sync) it is just recorded, never celebrated.
function checkLevelUp() {
  if (!canUseAccountFeatures()) return;
  const k = KoalaCore.ensureKoala(progress);
  const lv = KoalaCore.levelInfo(k.earned).level;
  if (k.lvSeen == null) { k.lvSeen = lv; return; }
  if (lv <= k.lvSeen) return;
  k.lvSeen = lv;
  saveProgress();
  const el = document.createElement("div");
  el.className = "levelup-pop";
  el.setAttribute("role", "status");
  el.innerHTML = `<div class="levelup-card"><div class="levelup-koala" aria-hidden="true">${KoalaArt.avatar(k.items.equipped, { view: "head" })}</div>
    <div class="levelup-title">${rwL("Level up!", "레벨 업!")}</div>
    <div class="levelup-lv">${rwL(`Koala Lv. ${lv}`, `코알라 Lv. ${lv}`)}</div>
    <div class="levelup-confetti" aria-hidden="true">${["🎉", "⭐", "✨", "🎊", "⭐", "✨"].map((c, i) => `<span style="--i:${i}">${c}</span>`).join("")}</div></div>`;
  el.addEventListener("click", () => el.remove());
  document.body.appendChild(el);
  setTimeout(() => el.classList.add("out"), 3000);
  setTimeout(() => el.remove(), 3500);
}

function handleKoalaItem(id) {
  if (!canUseAccountFeatures()) return;
  const it = KoalaCore.itemById(id);
  if (!it) return;
  koalaTry = null;
  const st = KoalaCore.itemStatus(progress, it, koalaOpts());
  if (st.state === "equipped") {
    KoalaCore.unequipSlot(progress, it.slot);
  } else if (st.state === "owned") {
    KoalaCore.equipItem(progress, id);
  } else if (st.state === "buyable") {
    const name = koalaItemName(it);
    const res = KoalaCore.buyItem(progress, id, koalaOpts());
    if (!res.ok) { renderKoala(); return; } // coins changed meanwhile
    rwToastQueue.push({ emoji: KOALA_SLOT_EMOJI[it.slot], title: rwL("New item unlocked!", "새 아이템 해금!"), name: rwL(`${name} — now wearing it!`, `${name} — 바로 입었어요!`) });
    showNextBadgeToast();
  } else {
    return;
  }
  checkBadges();
  saveProgress();
  renderKoala();
  koalaSparkle();
}

// Big preview popup: tap the preview to see the koala (or the whole room) larger, then close it.
function koalaZoomScene(view) {
  const k = KoalaCore.ensureKoala(progress);
  const eq = koalaPreviewEq(k);
  return KoalaArt.room(eq, eq, {
    label: view === "room" ? rwL("Your Koala's Study Room", "나의 코알라 공부방") : rwL("Your Koala", "나의 코알라"),
    shadow: true,
    view: view === "room" ? undefined : "60 78 200 137.5",
    sub: k.items.sub || {},
  });
}
function closeKoalaZoom() {
  const z = document.getElementById("koala-zoom");
  if (z) z.remove();
  document.removeEventListener("keydown", koalaZoomKey);
}
function koalaZoomKey(e) { if (e.key === "Escape") closeKoalaZoom(); }
function openKoalaZoom(view) {
  closeKoalaZoom();
  const tryIt = koalaTry ? KoalaCore.itemById(koalaTry) : null;
  const el = document.createElement("div");
  el.id = "koala-zoom";
  el.className = "koala-zoom-overlay";
  const viewBtn = (id, label) => `<button type="button" class="koala-cat${view === id ? " on" : ""}" data-koala-zoom-view="${id}" aria-pressed="${view === id}">${label}</button>`;
  el.innerHTML = `<div class="koala-zoom-card" role="dialog" aria-modal="true" aria-label="${rwL("Big preview", "크게 보기")}">
    <div class="koala-zoom-head"><div class="koala-zoom-views">${viewBtn("koala", rwL('<span class="kface" aria-hidden="true"></span> Koala', '<span class="kface" aria-hidden="true"></span> 코알라'))}${viewBtn("room", rwL("🏠 Whole room", "🏠 방 전체"))}</div>
      <button type="button" class="koala-zoom-close" data-koala-zoom-close>${rwL("✕ Close", "✕ 닫기")}</button></div>
    <div class="koala-zoom-stage">${koalaZoomScene(view)}</div>
    ${tryIt ? `<div class="koala-zoom-caption">${rwL(`👀 Trying on: ${escapeHtml(koalaItemName(tryIt))}`, `👀 입어 보는 중: ${escapeHtml(koalaItemName(tryIt))}`)}</div>` : ""}</div>`;
  el.addEventListener("click", (e) => {
    if (e.target === el || e.target.closest("[data-koala-zoom-close]")) { closeKoalaZoom(); return; }
    const v = e.target.closest("[data-koala-zoom-view]");
    if (v) { openKoalaZoom(v.dataset.koalaZoomView); }
  });
  document.body.appendChild(el);
  document.addEventListener("keydown", koalaZoomKey);
  const close = el.querySelector("[data-koala-zoom-close]");
  if (close) close.focus();
}

// Tapping a shop card changes the preview straight away:
//   worn item      -> taken off          owned item     -> put on
//   locked / buyable item -> tried on in the preview only (nothing is spent until "Unlock")
function koalaTap(id) {
  if (!canUseAccountFeatures()) return;
  const it = KoalaCore.itemById(id);
  if (!it) return;
  const st = KoalaCore.itemStatus(progress, it, koalaOpts());
  if (st.state === "equipped" || st.state === "owned") { handleKoalaItem(id); return; }
  const tab = KoalaCore.ROOM_SLOTS.includes(it.slot) ? "room" : "character";
  koalaTab = tab;
  koalaSlotPick[tab] = it.slot;
  koalaTry = koalaTry === id ? null : id; // tap again to stop trying it on
  renderKoala();
}

document.addEventListener("click", (e) => {
  const tab = e.target.closest("[data-koala-tab]");
  if (tab) { koalaTab = ["badges", "room", "coins"].includes(tab.dataset.koalaTab) ? tab.dataset.koalaTab : "character"; koalaTry = null; koalaPick = null; koalaSellMode = false; renderKoala(); return; }
  const cat = e.target.closest("[data-koala-cat]");
  if (cat) { koalaSlotPick[koalaTab === "room" ? "room" : "character"] = cat.dataset.koalaCat; koalaTry = null; renderKoala(); return; }
  if (e.target.closest("[data-koala-sellmode]")) { koalaSellMode = !koalaSellMode; koalaTry = null; renderKoala(); return; }
  const sellCard = e.target.closest("[data-koala-sell]");
  if (sellCard) { openKoalaSellConfirm(sellCard.dataset.koalaSell); return; }
  const pickBtn = e.target.closest("[data-koala-pick]");
  if (pickBtn) { koalaSetPick(pickBtn.dataset.koalaPick); return; }
  if (e.target.closest("[data-koala-pick-clear]")) { koalaPick = null; renderKoala(); return; }
  const subCard = e.target.closest("[data-koala-sub]");
  if (subCard) { const [p, s] = subCard.dataset.koalaSub.split("|"); openKoalaSubDetail(p, s); return; }
  const sceneItem = e.target.closest && e.target.closest("#koala-stage g[data-item]");
  if (sceneItem && !e.target.closest("[data-koala-zoom]")) {
    const id = sceneItem.dataset.item;
    if (KoalaCore.subKind(id)) koalaSetPick(id); else koalaNoSubNote(id);
    return;
  }
  const go = e.target.closest("[data-koala-go]");
  if (go) { goToTab(go.dataset.koalaGo); return; }
  const buy = e.target.closest("[data-koala-buy]");
  if (buy) { handleKoalaItem(buy.dataset.koalaBuy); return; }
  if (e.target.closest("[data-koala-try-clear]")) { koalaTry = null; renderKoala(); return; }
  const zoom = e.target.closest("[data-koala-zoom]");
  if (zoom) { openKoalaZoom(zoom.dataset.koalaZoom); return; }
  const card = e.target.closest("[data-koala-item]");
  if (card) koalaTap(card.dataset.koalaItem);
});
document.addEventListener("keydown", (e) => {
  if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches("[data-koala-zoom]")) { e.preventDefault(); openKoalaZoom(e.target.dataset.koalaZoom); }
});

/* ---- Admin: Koala Coins ---- */
let adminKoala = { users: [], recent: [] };
let adminKoalaQuery = "";

async function loadAdminKoala() {
  if (!serverAdmin) return;
  try {
    const q = adminKoalaQuery ? `?q=${encodeURIComponent(adminKoalaQuery)}` : "";
    adminKoala = await api(`/admin/koala${q}`);
    // Only an unfiltered load reflects every account's balance — see the
    // same reasoning on loadAdminUsers() above. Includes coins still
    // pending sync (a student hasn't opened the app since the last grant)
    // — issued is issued, whether or not the recipient has seen it yet.
    if (!adminKoalaQuery) {
      adminStats.totalCoins = (adminKoala.users || []).reduce((sum, u) => sum + (u.coins || 0) + (u.pending || 0), 0);
      renderAdminStats();
    }
  } catch (e) {
    console.warn("Could not load Koala Coins", e);
  }
  renderAdminKoala();
}

const ADMIN_KOALA_QUICK_AMOUNTS = [10, 50, 100];
const ADMIN_KOALA_RECENT_PAGE_SIZE = 10;
let adminKoalaRecentVisibleCount = ADMIN_KOALA_RECENT_PAGE_SIZE;

// Column headers for both tables, translated here (not via the app-wide
// data-i18n/applyStaticTranslations pass) so they re-render in step with
// the rest of this section, which already reads every other label through
// rwL() rather than the t()/TRANSLATIONS system.
function renderAdminKoalaTableHeaders() {
  const head = document.getElementById("admin-koala-table-head");
  if (!head) return;
  document.getElementById("admin-koala-title-text").textContent = rwL("Koala Coins", "코알라 코인");
  document.getElementById("admin-koala-desc-text").textContent = rwL(
    "Your own coins are unlimited. Give coins to a student, or take some back. A student receives them the next time they open the app.",
    "관리자의 코인은 무제한이에요. 학생에게 코인을 주거나 다시 가져올 수 있어요. 학생은 다음에 앱을 열 때 코인을 받아요."
  );
  document.getElementById("admin-koala-th-user").textContent = rwL("User", "사용자");
  document.getElementById("admin-koala-th-coins").textContent = rwL("Coins", "코인");
  document.getElementById("admin-koala-th-adjust").textContent = rwL("Quick adjustment", "빠른 조정");
  document.getElementById("admin-koala-th-actions").textContent = rwL("Actions", "작업");
  document.getElementById("admin-koala-lh-date").textContent = rwL("Date", "일시");
  document.getElementById("admin-koala-lh-user").textContent = rwL("User", "사용자");
  document.getElementById("admin-koala-lh-change").textContent = rwL("Change", "변동");
  document.getElementById("admin-koala-lh-reason").textContent = rwL("Reason", "사유");
  document.getElementById("admin-koala-lh-status").textContent = rwL("Status", "상태");
}

function renderAdminKoala({ resetRecentPaging = true } = {}) {
  const grid = document.getElementById("admin-koala-grid");
  const empty = document.getElementById("admin-koala-empty");
  const recent = document.getElementById("admin-koala-recent");
  const recentMoreBtn = document.getElementById("admin-koala-recent-more-btn");
  if (!grid) return;
  renderAdminKoalaTableHeaders();
  if (resetRecentPaging) adminKoalaRecentVisibleCount = ADMIN_KOALA_RECENT_PAGE_SIZE;
  const users = adminKoala.users || [];
  empty.hidden = users.length > 0;
  const chipsHtml = ADMIN_KOALA_QUICK_AMOUNTS.map((n) => `<button type="button" class="admin-koala-chip" data-set-amt="${n}">+${n}</button>`).join("");
  const giveLabel = rwL("+ Give", "+ 지급");
  const takeLabel = rwL("− Take", "− 차감");
  grid.innerHTML = users.map((u) => {
    const bal = u.coins == null ? rwL("not seen", "기록 없음") : `${u.coins}`;
    const pend = u.pending ? ` <small class="admin-koala-pending">(${u.pending > 0 ? "+" : ""}${u.pending} ${rwL("pending", "대기")})</small>` : "";
    const roleIcon = u.role === "admin" ? "👑" : u.role === "paid" ? "⭐" : "🙂";
    return `<div class="admin-koala-table-row" data-uid="${escapeHtml(u.id)}" data-coins="${u.coins == null ? "" : u.coins}">
      <span class="admin-koala-cell-user">${roleIcon} ${escapeHtml(u.username)}</span>
      <span class="admin-koala-cell-coins">${COIN_SVG} ${escapeHtml(bal)}${pend}</span>
      <div class="admin-koala-cell-adjust">
        <div class="admin-koala-chips">${chipsHtml}</div>
        <input type="number" class="admin-koala-amt" min="1" max="100000" step="1" placeholder="10" value="10" aria-label="${rwL("Coins", "코인")}" />
      </div>
      <div class="admin-koala-cell-actions">
        <button type="button" class="admin-koala-give-btn" data-admin-koala="give">${giveLabel}</button>
        <button type="button" class="admin-koala-take-btn" data-admin-koala="take">${takeLabel}</button>
      </div>
    </div>`;
  }).join("");

  const rec = adminKoala.recent || [];
  const recPage = rec.slice(0, adminKoalaRecentVisibleCount);
  const recRemaining = rec.length - recPage.length;
  recent.innerHTML = recPage.length
    ? recPage.map((g) => {
        const completed = !!g.appliedAt;
        const statusHtml = completed
          ? `<span class="admin-koala-log-status completed">🟢 ${rwL("Completed", "완료")}</span>`
          : `<span class="admin-koala-log-status pending">🟡 ${rwL("Pending", "대기 중")}</span>`;
        return `<li class="admin-koala-log-row">
        <span class="admin-koala-log-date">${new Date(g.createdAt).toLocaleDateString(currentLang === "ko" ? "ko-KR" : "en-AU", { day: "numeric", month: "short" })}</span>
        <span class="admin-koala-log-user">${escapeHtml(g.username)}</span>
        <span class="admin-koala-log-amount${g.amount < 0 ? " spent" : ""}">${g.amount < 0 ? "−" : "+"}${Math.abs(g.amount)} ${COIN_SVG}</span>
        <span class="admin-koala-log-reason">${g.note ? escapeHtml(g.note) : rwL("Admin Manual", "관리자 직접 조정")}</span>
        ${statusHtml}
      </li>`;
      }).join("")
    : `<li class="muted admin-koala-log-empty">${rwL("Nothing yet.", "아직 없어요.")}</li>`;
  recentMoreBtn.hidden = recRemaining <= 0;
  if (recRemaining > 0) recentMoreBtn.textContent = rwL(`Load more (${Math.min(ADMIN_KOALA_RECENT_PAGE_SIZE, recRemaining)} more)`, `더보기 (${Math.min(ADMIN_KOALA_RECENT_PAGE_SIZE, recRemaining)}개 더)`);
}

// Give/Take reason popup — picking a reason both confirms the action and
// supplies the note that shows up in Recent Adjustments, in one small
// step instead of a plain yes/no confirm followed by a separate memo box.
const ADMIN_KOALA_GIVE_REASONS = [
  { en: "Welcome Bonus", ko: "가입 환영" },
  { en: "Event Prize", ko: "이벤트 경품" },
  { en: "Christmas Event", ko: "크리스마스 이벤트" },
  { en: "Voucher", ko: "바우처" },
  { en: "Study Streak Bonus", ko: "학습 스트릭 보너스" },
];
const ADMIN_KOALA_TAKE_REASONS = [
  { en: "Mistake Correction", ko: "입력 오류 수정" },
  { en: "Refund", ko: "환불" },
  { en: "Policy Violation", ko: "약관 위반" },
];
const koalaReasonOverlay = document.getElementById("koala-reason-overlay");
const koalaReasonTitle = document.getElementById("koala-reason-title");
const koalaReasonMessage = document.getElementById("koala-reason-message");
const koalaReasonList = document.getElementById("koala-reason-list");
const koalaReasonCancelBtn = document.getElementById("koala-reason-cancel-btn");
let koalaReasonResolve = null;

function closeKoalaReason(result) {
  koalaReasonOverlay.hidden = true;
  const resolve = koalaReasonResolve;
  koalaReasonResolve = null;
  if (resolve) resolve(result);
}

// Resolves to the note string to send (possibly "" for "no particular
// reason"), or null if the admin cancelled.
function pickAdminKoalaReason(amt, name, give) {
  return new Promise((resolve) => {
    koalaReasonResolve = resolve;
    koalaReasonTitle.textContent = give
      ? rwL(`Give ${amt} Coins to ${name}`, `${name}에게 ${amt}코인 지급`)
      : rwL(`Take ${amt} Coins from ${name}`, `${name}의 코인 ${amt}개 차감`);
    koalaReasonMessage.textContent = rwL("Pick a reason:", "사유를 선택하세요:");
    const reasons = give ? ADMIN_KOALA_GIVE_REASONS : ADMIN_KOALA_TAKE_REASONS;
    koalaReasonList.innerHTML = reasons.map((r, i) => `<button type="button" class="koala-reason-btn" data-reason-idx="${i}">${rwL(r.en, r.ko)}</button>`).join("")
      + `<button type="button" class="koala-reason-btn" data-reason-idx="manual">${rwL("Other (no reason)", "기타 (사유 없음)")}</button>`;
    koalaReasonCancelBtn.textContent = rwL("Cancel", "취소");
    koalaReasonList.querySelectorAll("[data-reason-idx]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = btn.dataset.reasonIdx;
        closeKoalaReason(idx === "manual" ? "" : rwL(reasons[idx].en, reasons[idx].ko));
      });
    });
    koalaReasonOverlay.hidden = false;
    const card = koalaReasonOverlay.querySelector(".kid-modal-card");
    card.style.animation = "none";
    void card.offsetWidth;
    card.style.animation = "";
  });
}

koalaReasonCancelBtn.addEventListener("click", () => closeKoalaReason(null));
koalaReasonOverlay.addEventListener("click", (e) => {
  if (e.target === koalaReasonOverlay) closeKoalaReason(null);
});
document.addEventListener(
  "keydown",
  (e) => {
    if (koalaReasonOverlay.hidden) return;
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      closeKoalaReason(null);
    }
  },
  true
);

document.addEventListener("click", async (e) => {
  const chip = e.target.closest("[data-set-amt]");
  if (chip) {
    const row = chip.closest(".admin-koala-table-row");
    row.querySelector(".admin-koala-amt").value = chip.dataset.setAmt;
    return;
  }
  if (e.target.closest("#admin-koala-recent-more-btn")) {
    adminKoalaRecentVisibleCount += ADMIN_KOALA_RECENT_PAGE_SIZE;
    renderAdminKoala({ resetRecentPaging: false });
    return;
  }
  const btn = e.target.closest("[data-admin-koala]");
  if (!btn || !serverAdmin) return;
  const row = btn.closest(".admin-koala-table-row");
  const amt = Math.floor(Number(row.querySelector(".admin-koala-amt").value));
  if (!Number.isFinite(amt) || amt < 1 || amt > 100000) {
    alert(rwL("Enter a number of coins from 1 to 100000.", "1~100000 사이의 코인 수를 입력해 주세요."));
    return;
  }
  const give = btn.dataset.adminKoala === "give";
  const name = row.querySelector(".admin-koala-cell-user").textContent.replace(/^\S+\s*/, "");
  const note = await pickAdminKoalaReason(amt, name, give);
  if (note === null) return;
  btn.disabled = true;
  try {
    await api("/admin/koala/grant", {
      method: "POST",
      body: JSON.stringify({ userId: row.dataset.uid, amount: give ? amt : -amt, note }),
    });
    // Nudge first (loadAdminKoala() below overwrites with the authoritative
    // total whenever it does its own unfiltered recompute, so this only
    // matters — and stays correct — while a search is narrowing the list).
    adminStats.totalCoins += give ? amt : -amt;
    renderAdminStats();
    await loadAdminKoala();
  } catch (err) {
    alert(rwL("Could not save that. Please try again.", "저장하지 못했어요. 다시 시도해 주세요."));
    btn.disabled = false;
  }
});
document.addEventListener("input", (e) => {
  if (e.target.id !== "admin-koala-search") return;
  adminKoalaQuery = e.target.value.trim();
  clearTimeout(window.__akT);
  window.__akT = setTimeout(loadAdminKoala, 250);
});

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

let wrongSubTab = "en"; // "en" | "math" — which Wrong-notes list is showing

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
  const all = wrongEntries();
  if (!all.length) {
    el.innerHTML = `<div class="wrong-empty"><div class="wrong-empty-koala"><span class="kface" aria-hidden="true"></span>✨</div><p>${rwL(
      "No mistakes to review. Great job!", "복습할 오답이 없어요. 잘했어요!")}</p></div>`;
    return;
  }
  // English = vocabulary / spelling / typing words. Math = times-table facts
  // (and any future maths activity — extend reviewKindMatch / isMath for it).
  const enItems = all.filter((it) => reviewKindMatch(it.key, "en"));
  const mathItems = all.filter((it) => reviewKindMatch(it.key, "math"));
  const items = wrongSubTab === "math" ? mathItems : enItems;
  const subTabs = `<div class="wrong-subtabs" role="tablist">
    <button type="button" class="wrong-subtab${wrongSubTab === "en" ? " on" : ""}" role="tab" aria-selected="${wrongSubTab === "en"}" data-wrong-tab="en">🔤 ${rwL("English", "영어")}<span class="wrong-subtab-count">${enItems.length}</span></button>
    <button type="button" class="wrong-subtab${wrongSubTab === "math" ? " on" : ""}" role="tab" aria-selected="${wrongSubTab === "math"}" data-wrong-tab="math">🧮 ${rwL("Math", "수학")}<span class="wrong-subtab-count">${mathItems.length}</span></button>
  </div>`;
  if (!items.length) {
    el.innerHTML = `${subTabs}<div class="wrong-empty"><div class="wrong-empty-koala"><span class="kface" aria-hidden="true"></span>✨</div><p>${wrongSubTab === "math"
      ? rwL("No maths mistakes to review. Great job!", "복습할 수학 오답이 없어요. 잘했어요!")
      : rwL("No English mistakes to review. Great job!", "복습할 영어 오답이 없어요. 잘했어요!")}</p></div>`;
    return;
  }
  const modeName = { quiz: rwL("Quiz", "퀴즈"), spelling: rwL("Spelling", "스펠링"), typing: rwL("Typing", "타이핑"), tt: rwL("Times Table", "구구단"), flash: rwL("Flashcards", "플래시카드") };
  const studyBtn = wrongSubTab === "math"
    ? ""
    : ` <button type="button" class="pill small" id="wrong-study-btn">${FLASH_ICON_SVG} ${rwL("Study these words", "오답 단어 공부하기")}</button>`;
  let html = `${subTabs}<p class="wrong-hint">${wrongSubTab === "math"
    ? rwL("Get a fact right in a review and it graduates from this notebook.", "복습에서 맞히면 오답 노트에서 바로 졸업해요.")
    : rwL("Get a word right in a review and it graduates from this notebook.", "복습에서 맞히면 오답 노트에서 바로 졸업해요.")}</p>
    <div class="wrong-actions"><button type="button" class="pill accent small" id="wrong-review-btn"><span class="kface" aria-hidden="true"></span> ${rwL("Start review", "복습 시작")}</button>${studyBtn}</div>
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
  const sub = e.target.closest("[data-wrong-tab]");
  if (sub) {
    wrongSubTab = sub.dataset.wrongTab === "math" ? "math" : "en";
    renderWrongPanel();
    return;
  }
  const say = e.target.closest("[data-say]");
  if (say) { speak(say.dataset.say); return; }
  const rm = e.target.closest("[data-remove]");
  if (rm) {
    delete progress.wrong[rm.dataset.remove];
    saveProgress();
    renderRewardPanels();
    return;
  }
  if (e.target.closest("#wrong-review-btn")) {
    if (!reviewDueList(wrongSubTab).length) { kidConfirm(rwL("All caught up! Great job! 🎉", "복습할 단어를 모두 끝냈어요! 잘했어요! 🎉"), "OK"); return; }
    startReview(wrongSubTab);
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
    startFlashPlay();
  }
});

[flashSourceLevelBtn, flashSourceMineBtn, flashCategorySel].forEach((el) => {
  ["click", "change"].forEach((ev) => el.addEventListener(ev, () => { flashWrongOverride = null; }, true));
});

/* ---- Charts (inline SVG, one accent hue, direct labels) ---- */
/* ---- Progress dashboard: recent performance, recommendations, words to review ---- */
const REC_WINDOW = 20; // most recent answers per category
const REC_MIN = 5;     // below this a category has no meaningful signal
const REC_WEAK_PCT = 70;
const REC_JUST_DONE_MS = 15 * 60 * 1000;

const CAT_DEFS = [
  { id: "vocab", modes: ["quiz", "flash"], view: "quiz", name: () => rwL("Vocabulary", "어휘"), icon: "📖", cta: () => rwL("Practise", "연습") },
  { id: "spelling", modes: ["spelling"], view: "spelling", name: () => rwL("Spelling", "스펠링"), icon: "✏️", cta: () => rwL("Practise", "연습") },
  { id: "tt", modes: ["tt"], view: "timestable", name: () => rwL("Times Tables", "구구단"), icon: "🧮", cta: () => rwL("Practise", "연습") },
  { id: "typing", modes: ["typing"], view: "typegame", name: () => rwL("Typing", "타이핑"), icon: "⌨️", cta: () => rwL("Play", "게임") },
];
const MODE_LABEL = () => ({ quiz: rwL("Quiz", "퀴즈"), flash: rwL("Flashcards", "플래시카드"), spelling: rwL("Spelling", "스펠링"), tt: rwL("Times Tables", "구구단"), typing: rwL("Typing", "타이핑") });

function recLog() { ensureRewardData(); return progress.recent; }
const recPct = (arr) => (arr.length ? Math.round((arr.filter((e) => e.ok).length / arr.length) * 100) : 0);

function catStats(def) {
  const items = recLog().filter((e) => def.modes.includes(e.m));
  const last = items.slice(-REC_WINDOW);
  const n = last.length;
  const enough = n >= REC_MIN;
  const correct = last.filter((e) => e.ok).length;
  let trend = null;
  if (items.length >= 10) {
    const a = items.slice(-10), b = items.slice(-20, -10);
    if (b.length >= REC_MIN) {
      const diff = recPct(a) - recPct(b);
      trend = diff >= 10 ? "up" : diff <= -10 ? "down" : "flat";
    }
  }
  return { def, n, enough, correct, misses: n - correct, pct: enough ? Math.round((correct / n) * 100) : null, trend, lastTs: items.length ? items[items.length - 1].t : 0 };
}

// Words that genuinely need attention, from the answer log, the spaced-
// repetition schedule and (premium) the wrong-answer notebook.
function getWordsToReview() {
  const now = Date.now(), DAY = 86400000;
  const display = {};
  Object.keys(progress.wordStats || {}).forEach((k) => { if (!reviewIsMath(k)) display[k.toLowerCase()] = k; });
  const lastByWord = {};
  recLog().forEach((e) => { if (!reviewIsMath(e.w)) lastByWord[e.w.toLowerCase()] = e; });
  const out = new Map();
  Object.entries(lastByWord).forEach(([k, e]) => {
    if (!e.ok && now - e.t <= 7 * DAY) out.set(k, { word: display[k] || e.w, status: "missed", at: e.t });
  });
  if (canUsePaidFeatures()) {
    Object.entries(progress.wrong || {}).forEach(([k, w]) => {
      if (reviewIsMath(k) || (w.retestAt && w.retestAt > now)) return;
      const lk = k.toLowerCase();
      if (!out.has(lk)) out.set(lk, { word: k, status: "missed", at: w.last || 0 });
    });
  }
  Object.entries(progress.srs || {}).forEach(([k, v]) => {
    if (out.has(k) || !display[k]) return;
    const st = progress.wordStats[display[k]];
    if (!st || !(st.incorrect > 0)) return;
    if (v.box >= 1 && v.dueAt <= now) out.set(k, { word: display[k], status: "due", at: v.dueAt });
    else if (v.box === 0) out.set(k, { word: display[k], status: "learning", at: v.dueAt });
  });
  const rank = { missed: 0, due: 1, learning: 2 };
  return [...out.values()].sort((a, b) => rank[a.status] - rank[b.status] || b.at - a.at);
}

function justDoneCategory() {
  const log = recLog();
  const last = log[log.length - 1];
  if (!last || Date.now() - last.t > REC_JUST_DONE_MS) return null;
  const def = CAT_DEFS.find((d) => d.modes.includes(last.m));
  if (!def) return null;
  const recent = log.filter((e) => def.modes.includes(e.m)).slice(-5);
  return recent.length >= REC_MIN && recPct(recent) >= REC_WEAK_PCT ? def.id : null;
}

// Returns { type, title, reason, actionLabel, action } — action is
// "view:<id>" (an existing tab) or "review" (the review flow).
function getRecommendedNext() {
  const mk = (type, title, reason, actionLabel, action) => ({ type, title, reason, actionLabel, action });
  const cats = CAT_DEFS.map(catStats);
  const byId = Object.fromEntries(cats.map((c) => [c.def.id, c]));
  const review = getWordsToReview();
  const log = recLog();
  const justDone = justDoneCategory();
  const s = (n, one, many) => (n === 1 ? one : many);

  if (log.length < REC_MIN && review.length === 0) {
    const first = missionTasks()[0];
    return mk("new", rwL("Start your first practice", "첫 연습을 시작해요"), rwL("Complete a few questions to unlock personalised recommendations.", "몇 문제만 풀면 맞춤 추천이 열려요."), rwL("Start Practice", "연습 시작"), "view:" + first.view);
  }
  // A few tricky words → review them first. If a whole category is clearly
  // struggling (under 50% over 10+ recent answers), more practice there comes first.
  const clearlyWeak = ["spelling", "tt", "vocab", "typing"].find((id) => byId[id].n >= 10 && byId[id].pct !== null && byId[id].pct < 50 && id !== justDone);
  if (review.length && !clearlyWeak) {
    const missed = review.filter((r) => r.status === "missed").length;
    const reason = missed
      ? rwL(`You missed ${missed} ${s(missed, "word", "words")} recently.`, `최근에 틀린 단어가 ${missed}개 있어요.`)
      : rwL(`${review.length} ${s(review.length, "word is", "words are")} ready for review.`, `복습할 단어가 ${review.length}개 있어요.`);
    return mk("review", rwL("Review tricky words", "어려운 단어 복습"), reason, rwL(`Review ${review.length} ${s(review.length, "word", "words")}`, `${review.length}개 복습`), "review");
  }
  for (const id of ["spelling", "tt", "vocab", "typing"]) {
    const c = byId[id];
    if (!c.enough || c.pct >= REC_WEAK_PCT || id === justDone) continue;
    if (clearlyWeak && id !== clearlyWeak) continue;
    const nm = c.def.name();
    return mk(id, rwL(`Practise ${nm.toLowerCase()}`, `${nm} 연습`), rwL(`You missed ${c.misses} of your last ${c.n} ${nm.toLowerCase()} questions. More practice may help.`, `최근 ${c.n}문제 중 ${c.misses}개를 틀렸어요. 조금 더 연습하면 도움이 돼요.`), rwL(`Practise ${nm}`, `${nm} 연습하기`), "view:" + c.def.view);
  }
  const m = missionTasks().find((x) => x.done < x.goal && !(justDone && CAT_DEFS.find((d) => d.id === justDone).modes.includes(x.mode)));
  if (m) {
    const nm = MODE_LABEL()[m.mode];
    return mk("mission", rwL("Finish today's mission", "오늘의 미션 이어가기"), rwL(`${nm}: ${m.done} of ${m.goal} done today.`, `${nm}: 오늘 ${m.done}/${m.goal} 완료.`), rwL(`Continue ${nm}`, `${nm} 계속하기`), "view:" + m.view);
  }
  const pool = cats.filter((c) => c.def.id !== justDone).sort((a, b) => a.lastTs - b.lastTs);
  const c = pool[0] || cats[0];
  const nm = c.def.name();
  const strong = c.enough && c.pct >= 85;
  return mk("explore", rwL(`Try some ${nm.toLowerCase()}`, `${nm} 해 보기`), strong
    ? rwL(`Your recent ${nm.toLowerCase()} answers look strong — keep it going.`, `최근 ${nm} 실력이 좋아요. 이대로 이어가요.`)
    : rwL(`Nice work today. Mix it up with some ${nm.toLowerCase()}.`, `오늘도 잘했어요. ${nm}로 분위기를 바꿔 볼까요?`), rwL(`Practise ${nm}`, `${nm} 연습하기`), "view:" + c.def.view);
}

function runDashAction(action) {
  if (!action) return;
  if (action === "review") { startReviewAll(); return; }
  if (action.startsWith("view:")) goToTab(action.slice(5));
}

function startReviewAll() {
  const list = getWordsToReview();
  if (!list.length) { goToTab("flashcards"); return; }
  if (canUsePaidFeatures() && reviewDueList().length) { startReview(); return; }
  flashWrongOverride = list.map((r) => {
    const info = findWordInfo(r.word) || {};
    return { word: r.word, definition: info.definition || "", example: info.example || "" };
  });
  const navBtn = document.querySelector('.tab-btn[data-view="flashcards"]');
  if (navBtn) navBtn.click();
  buildFlashDeck();
  startFlashPlay();
}

function getTodayLearning() {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const log = recLog();
  const items = log.filter((e) => e.t >= start.getTime());
  const last = log[log.length - 1];
  return {
    questions: items.length,
    words: new Set(items.filter((e) => !reviewIsMath(e.w)).map((e) => e.w.toLowerCase())).size,
    pct: items.length ? recPct(items) : null,
    hasHistory: log.length > 0,
    justFinished: !!last && Date.now() - last.t <= REC_JUST_DONE_MS,
  };
}

function getRecentSessions(limit) {
  const log = recLog();
  const sessions = [];
  log.forEach((e) => {
    const s = sessions[sessions.length - 1];
    if (s && s.m === e.m && e.t - s.end <= 30 * 60 * 1000) { s.n++; s.c += e.ok; s.end = e.t; }
    else sessions.push({ m: e.m, n: 1, c: e.ok, start: e.t, end: e.t });
  });
  return sessions.reverse().slice(0, limit);
}

function dayLabel(ts) {
  const d = new Date(ts), today = new Date();
  const y = new Date(); y.setDate(y.getDate() - 1);
  const k = localDateKey(d);
  if (k === localDateKey(today)) return rwL("Today", "오늘");
  if (k === localDateKey(y)) return rwL("Yesterday", "어제");
  return d.toLocaleDateString(currentLang === "ko" ? "ko-KR" : "en-AU", { weekday: "short", day: "numeric", month: "short" });
}

let dashActivityExpanded = false;

function renderSkillsCard() {
  const box = document.getElementById("stats-skills");
  if (!box) return;
  const rec = getRecommendedNext();
  const today = getTodayLearning();
  const review = getWordsToReview();
  const sessions = getRecentSessions(dashActivityExpanded ? 10 : 3);
  const moreSessions = !dashActivityExpanded && getRecentSessions(10).length > 3;

  // Today's learning
  const ctaLabel = !today.hasHistory ? rwL("Start Practice", "연습 시작") : today.justFinished ? rwL("Keep Learning", "계속 배우기") : rwL("Continue Learning", "이어서 배우기");
  const todayBody = today.questions
    ? `<div class="dash-nums"><div><b>${today.questions}</b><span>${rwL("Questions completed", "푼 문제")}</span></div><div><b>${today.words}</b><span>${rwL("Words practised", "연습한 단어")}</span></div><div><b>${today.pct}%</b><span>${rwL("Accuracy today", "오늘 정답률")}</span></div></div>`
    : `<p class="dash-muted">${today.hasHistory ? rwL("Nothing practised yet today.", "오늘은 아직 연습하지 않았어요.") : rwL("Start practising to see your progress.", "연습을 시작하면 학습 현황이 보여요.")}</p>`;
  const todayHtml = `<section class="dash-card dash-today" aria-labelledby="dash-h-today"><h3 class="dash-h" id="dash-h-today">${rwL("Today's learning", "오늘의 학습")}</h3>${todayBody}
    <button type="button" class="pill small dash-btn" data-dash-act="${rec.type === "review" ? "view:" + missionTasks()[0].view : rec.action}">${ctaLabel}</button></section>`;

  // Recommended next (strongest card)
  const recHtml = `<section class="dash-card dash-rec" aria-labelledby="dash-h-rec"><div class="dash-eyebrow">${rwL("Recommended next", "다음 추천")}</div>
    <h3 class="dash-title" id="dash-h-rec">${escapeHtml(rec.title)}</h3><p class="dash-reason">${escapeHtml(rec.reason)}</p>
    <button type="button" class="pill dash-btn dash-rec-btn" data-dash-act="${rec.action}">${escapeHtml(rec.actionLabel)}</button></section>`;

  // Words to review
  const stLabel = { missed: rwL("Missed recently", "최근에 틀림"), due: rwL("Due for review", "복습할 때"), learning: rwL("Still learning", "배우는 중") };
  const reviewHtml = review.length
    ? `<section class="dash-card dash-review" aria-labelledby="dash-h-review"><div class="dash-h-row"><h3 class="dash-h" id="dash-h-review">${rwL("Words to review", "복습할 단어")}</h3><span class="dash-count" aria-label="${review.length}">${review.length}</span></div>
       <ul class="dash-words">${review.slice(0, 3).map((r) => `<li><button type="button" class="dash-say" data-say="${escapeHtml(r.word)}" aria-label="${rwL("Hear", "듣기")} ${escapeHtml(r.word)}">🔊</button><span class="pr-word">${escapeHtml(r.word)}</span><span class="dash-chip dash-${r.status}">${stLabel[r.status]}</span></li>`).join("")}</ul>
       <button type="button" class="pill accent small dash-btn" data-dash-act="review">${rwL("Review All", "모두 복습")}</button></section>`
    : `<section class="dash-card dash-review dash-caught-up" aria-labelledby="dash-h-review"><h3 class="dash-h" id="dash-h-review">${rwL("Words to review", "복습할 단어")}</h3>
       <p class="dash-good">🎉 ${rwL("You're all caught up!", "모두 끝냈어요!")}</p><p class="dash-muted">${rwL("No words need review right now.", "지금 복습할 단어가 없어요.")}</p>
       <button type="button" class="pill small dash-btn" data-dash-act="view:flashcards">${rwL("Learn New Words", "새 단어 배우기")}</button></section>`;

  // Category progress (2x2 on wide screens)
  const trendTxt = { up: rwL("↑ Improving", "↑ 좋아지고 있어요"), down: rwL("↓ More practice", "↓ 조금 더 연습해요"), flat: rwL("→ Steady", "→ 꾸준해요") };
  const catCards = CAT_DEFS.map((d) => {
    const c = catStats(d);
    const body = c.enough
      ? `<div class="dash-cat-pct">${c.pct}%</div><div class="dash-cat-sub">${rwL("Recent accuracy", "최근 정답률")}</div>${c.trend ? `<div class="dash-trend dash-trend-${c.trend}">${trendTxt[c.trend]}</div>` : ""}`
      : `<div class="dash-cat-sub dash-cat-empty">${rwL("Not enough recent practice yet", "최근 연습이 아직 부족해요")}</div>`;
    return `<div class="dash-cat"><div class="dash-cat-name"><span aria-hidden="true">${d.icon}</span> ${d.name()}</div>${body}
      <button type="button" class="pill small dash-btn ${c.enough ? "" : "accent"}" data-dash-act="view:${d.view}">${c.enough ? d.cta() : rwL("Start Practising", "연습 시작")}</button></div>`;
  }).join("");
  const catHtml = `<section class="dash-block" aria-labelledby="dash-h-cat"><h3 class="dash-h dash-h-plain" id="dash-h-cat">${rwL("Your progress", "나의 실력")}</h3><div class="dash-cat-grid">${catCards}</div></section>`;

  // Recent activity (compact, secondary)
  const actHtml = sessions.length
    ? `<section class="dash-block dash-secondary" aria-labelledby="dash-h-act"><h3 class="dash-h dash-h-plain" id="dash-h-act">${rwL("Recent activity", "최근 활동")}</h3><ul class="dash-acts">${sessions.map((s) => `<li><span class="dash-act-day">${dayLabel(s.end)}</span><span class="dash-act-name">${MODE_LABEL()[s.m] || s.m}</span><b>${s.c}/${s.n}</b></li>`).join("")}</ul>
       ${moreSessions ? `<button type="button" class="dash-link" data-dash-more="1">${rwL("View more", "더 보기")}</button>` : ""}</section>`
    : "";

  // Badges preview (full list stays in the Badges tab)
  const signedIn = canUseAccountFeatures();
  const cat = buildBadgeCatalog();
  const earned = signedIn ? cat.filter((b) => progress.badges[b.id]) : [];
  const shown = (earned.length ? earned : cat).slice(0, 6);
  const badgeHtml = `<section class="dash-block" aria-labelledby="dash-h-badges"><div class="dash-h-row"><h3 class="dash-h dash-h-plain" id="dash-h-badges">${rwL("Your badges", "나의 배지")}</h3>
      <span class="dash-muted dash-inline">${rwL(`${earned.length} of ${cat.length}`, `${cat.length}개 중 ${earned.length}개`)}</span></div>
    <div class="dash-badges">${shown.map((b) => { const on = earned.includes(b); return `<div class="dash-badge ${on ? "on" : "off"}" title="${escapeHtml(b.desc)}"><span class="dash-badge-ico" aria-hidden="true">${b.emoji}</span><span class="dash-badge-name">${escapeHtml(b.name)}</span></div>`; }).join("")}</div>
    <button type="button" class="pill small dash-btn" data-dash-tab="badges">${rwL("View all badges", "배지 모두 보기")}</button>
    <button type="button" class="pill small dash-btn" data-dash-act="view:koala">${rwL("View My Koala →", "My Koala 보기 →")}</button></section>`;

  box.innerHTML = `<div class="dash-top">${todayHtml}${recHtml}</div>${reviewHtml}${catHtml}${actHtml}${badgeHtml}`;
}
document.addEventListener("click", (e) => {
  const act = e.target.closest("[data-dash-act]");
  if (act) { runDashAction(act.dataset.dashAct); return; }
  const tab = e.target.closest("[data-dash-tab]");
  if (tab) { setStatsTab(tab.dataset.dashTab); return; }
  if (e.target.closest("[data-dash-more]")) { dashActivityExpanded = true; renderSkillsCard(); }
});
// "Hear it" buttons in the dashboard's word list
document.getElementById("stats-panel-overview").addEventListener("click", (e) => {
  const say = e.target.closest("[data-say]");
  if (say) speak(say.dataset.say);
});

function renderStatsCharts() {
  ensureRewardData();
  renderSkillsCard();
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
applyTheme(currentTheme());
initSfxToggles();
renderLevelChoices();
updateLevelBadge();
renderStreakChip();
populateLevelSelects();

// Show the level-select overlay only if we don't yet have a saved level for this language.
// (Decided once we know whether someone is signed in — see restoreSession().)
levelOverlay.hidden = true;
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
    { id: "flash", mode: "flash", view: "flashcards", key: "missionFlash", emoji: FLASH_ICON_SVG },
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
    ensureRewardData();
    progress.counters.missions = (progress.counters.missions || 0) + 1;
    const coins = canUseAccountFeatures() ? KoalaCore.awardMission(progress, today) : 0;
    saveProgress();
    // The "reward moment": a bigger toast that doubles as a link to My Koala.
    rwToastQueue.push({
      emoji: "🎯", title: t("missionToast"),
      name: coins ? rwL(`+${coins} Koala Coins!`, `+${coins} 코알라 코인!`) : t("missionDoneMsg").replace(/^🎉 /, ""),
      go: coins > 0,
    });
    showNextBadgeToast();
    checkBadges();
    checkLevelUp();
  }
}
function renderHome() {
  window.__koalaUiReady = true; // the reward UI above is defined from here on
  // The tile icon already carries the emoji, so drop it from the title text.
  document.querySelectorAll(".landing-tile-title").forEach((el) => {
    el.textContent = el.textContent.replace(/^[^\p{L}\p{N}]+/u, "").trim();
  });
  renderHomeYears();
  renderMission();
  renderReviewCard();
}
document.getElementById("promo-btn").addEventListener("click", () => goToTab("addword"));
renderHome();


/* ================= REVIEW LOOP: meaning → hear → spell ================= */
// Words in progress.wrong (premium/admin) are reviewed in short sessions.
// A word answered right in a review graduates (is removed from the notebook)
// immediately. A wrong answer keeps it due, and it is asked again this session.
// (w.retestAt is legacy: entries parked by the old next-day rule still honour it.)
const REVIEW_SESSION_MAX = 8;
let reviewState = null;

function reviewIsMath(key) { return /^\d+x\d+$/.test(key); }
function reviewNextMidnight() {
  const d = new Date();
  d.setHours(24, 0, 0, 0);
  return d.getTime();
}
// kind: "en" (words only), "math" (times-table facts and any future maths
// items) or anything else / omitted for everything.
function reviewKindMatch(key, kind) {
  if (kind === "en") return !reviewIsMath(key);
  if (kind === "math") return reviewIsMath(key);
  return true;
}
function reviewDueList(kind) {
  if (!canUsePaidFeatures()) return [];
  ensureRewardData();
  const now = Date.now();
  return wrongEntries()
    .filter((it) => reviewKindMatch(it.key, kind) && (!it.retestAt || it.retestAt <= now))
    .sort((a, b) => (b.n || 0) - (a.n || 0));
}
function reviewWaitingCount(kind) {
  if (!canUsePaidFeatures()) return 0;
  ensureRewardData();
  const now = Date.now();
  return wrongEntries().filter((it) => reviewKindMatch(it.key, kind) && it.retestAt && it.retestAt > now).length;
}

function renderReviewCard() {
  const card = document.getElementById("review-card");
  if (!card) return;
  const due = reviewDueList().length;
  const waiting = reviewWaitingCount();
  card.hidden = !(due || waiting);
  if (card.hidden) return;
  document.getElementById("review-card-title").textContent = due
    ? rwL(`Review ${due} tricky word${due === 1 ? "" : "s"}`, `틀렸던 단어 ${due}개 복습`)
    : rwL("Review done for today", "오늘 복습 완료");
  document.getElementById("review-card-sub").textContent = due
    ? rwL("Meaning, listen, then spell it.", "뜻 보고, 듣고, 직접 써 봐요.")
    : rwL(`${waiting} word${waiting === 1 ? "" : "s"} to retest tomorrow.`, `내일 다시 확인할 단어 ${waiting}개`);
  const btn = document.getElementById("review-card-btn");
  btn.textContent = rwL("Start", "START");
  btn.hidden = !due;
}
document.getElementById("review-card-btn").addEventListener("click", () => startReview());

// kind: "en" | "math" limits the session to that Wrong-notes tab; omit for all.
function startReview(kind) {
  kind = kind === "en" || kind === "math" ? kind : null;
  const due = reviewDueList(kind).slice(0, REVIEW_SESSION_MAX);
  if (!due.length) return;
  reviewState = { kind, queue: due.map((it) => ({ key: it.key, retried: false })), total: due.length, i: 0, right: 0, graduated: 0, missed: [] };
  document.getElementById("review-overlay").hidden = false;
  document.body.classList.add("review-open");
  reviewShow();
}
function closeReview() {
  document.getElementById("review-overlay").hidden = true;
  document.body.classList.remove("review-open");
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  reviewState = null;
  renderReviewCard();
  try { renderRewardPanels(); } catch (e) { /* stats not ready */ }
}
document.getElementById("review-close").addEventListener("click", closeReview);

// Keyboard: Space = hear it, Enter = next step (Now spell it / Check / Next / Done), Esc = close.
document.addEventListener("keydown", (e) => {
  if (document.getElementById("review-overlay").hidden) return;
  if (e.key === "Escape") { e.preventDefault(); closeReview(); return; }
  if (e.target && e.target.id === "review-input") return; // the input handles its own Enter
  if (e.key === " " || e.code === "Space") {
    e.preventDefault();
    const hear = document.getElementById("review-hear");
    if (hear) hear.click();
    return;
  }
  if (e.key === "Enter") {
    e.preventDefault();
    const btn = document.getElementById("review-finish") || document.getElementById("review-next") || document.getElementById("review-check");
    if (btn) btn.click();
  }
});
document.addEventListener("keyup", (e) => {
  // stop a focused button from also "clicking" itself when Space is released
  if (e.key === " " && !document.getElementById("review-overlay").hidden && e.target.tagName === "BUTTON") e.preventDefault();
});

function reviewInfoFor(key) {
  if (reviewIsMath(key)) {
    const [a, b] = key.split("x").map(Number);
    return { math: true, a, b, answer: String(a * b) };
  }
  const info = findWordInfo(key) || {};
  return { word: key, definition: info.definition || "", example: info.example || "" };
}

function reviewProgressUI() {
  const s = reviewState;
  const done = Math.min(s.i, s.queue.length);
  document.getElementById("review-progress-fill").style.width = `${(done / s.queue.length) * 100}%`;
  document.getElementById("review-count").textContent = `${Math.min(done + 1, s.queue.length)} / ${s.queue.length}`;
}

function reviewShow() {
  const s = reviewState;
  if (!s) return;
  if (s.i >= s.queue.length) return reviewSummary();
  reviewProgressUI();
  const item = s.queue[s.i];
  const info = reviewInfoFor(item.key);
  if (info.math) return reviewAsk(item, info);
  reviewLearn(item, info);
}

function reviewLearn(item, info) {
  const body = document.getElementById("review-body");
  body.innerHTML = `<div class="review-step">${rwL("Step 1 · Learn it", "1단계 · 익히기")}</div>
    <div class="review-koala" aria-hidden="true"><span class="kface" aria-hidden="true"></span></div>
    <div class="review-word">${escapeHtml(info.word)}</div>
    <button type="button" class="review-hear" id="review-hear">🔊 ${rwL("Hear it", "들어보기")}</button>
    ${info.definition ? `<div class="review-card-meaning"><div class="review-card-label">💡 ${rwL("Meaning", "뜻")}</div><div class="review-card-text-big">${escapeHtml(info.definition)}</div></div>` : ""}
    ${info.example ? `<div class="review-card-example"><div class="review-card-label">💬 ${rwL("Example", "예문")}</div><div class="review-card-text-ex">${reviewHighlight(info.example, info.word)}</div></div>` : ""}
    <button type="button" class="pill accent review-next" id="review-next">${rwL("Now spell it →", "이제 써 볼게요 →")}</button>`;
  document.getElementById("review-hear").addEventListener("click", () => speak(info.word));
  document.getElementById("review-next").addEventListener("click", () => { playNextSfx(); reviewAsk(item, info); });
  speak(info.word);
}

// Escapes the sentence, then wraps the target word in <mark> so kids can spot it.
function reviewHighlight(sentence, word) {
  const safe = escapeHtml(sentence);
  const w = escapeHtml(word).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!w) return safe;
  return safe.replace(new RegExp(`(${w})`, "ig"), "<mark>$1</mark>");
}

function reviewAsk(item, info) {
  const body = document.getElementById("review-body");
  const prompt = info.math
    ? `<div class="review-word review-math">${info.a} × ${info.b} = ?</div>`
    : `<div class="review-step">${rwL("Step 2 · Spell it", "2단계 · 스펠링 쓰기")}</div>
       <button type="button" class="review-hear" id="review-hear">🔊 ${rwL("Hear it", "들어보기")}</button>
       ${info.definition ? `<div class="review-card-meaning"><div class="review-card-label">💡 ${rwL("Meaning", "뜻")}</div><div class="review-card-text-big">${escapeHtml(info.definition)}</div></div>` : ""}`;
  body.innerHTML = `${prompt}
    <input type="text" class="review-input" id="review-input" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"
      ${info.math ? 'inputmode="numeric"' : ""} placeholder="${rwL("Type here…", "여기에 써요…")}" aria-label="answer">
    <div class="review-feedback" id="review-feedback" aria-live="polite"></div>
    <button type="button" class="pill accent review-next" id="review-check">${rwL("Check", "확인")}</button>`;
  const input = document.getElementById("review-input");
  const hear = document.getElementById("review-hear");
  if (hear) hear.addEventListener("click", () => speak(info.word));
  let answered = false;
  // English only: after a wrong answer the kid must type the right spelling
  // before Next unlocks (no extra credit / no extra miss — just practice).
  let fixing = false;
  const btn = document.getElementById("review-check");
  const fb = document.getElementById("review-feedback");
  const expected = (info.math ? info.answer : info.word).toLowerCase();
  const matches = () => input.value.trim().toLowerCase() === expected;
  const fixPromptHtml = () => `<div class="review-fix-title">😮 ${rwL("Oops, not quite!", "앗, 틀렸어요!")}</div>
    <div class="review-fix-label">${rwL("The right spelling is:", "정답 스펠링은 이거예요:")}</div>
    <div class="review-fix-answer">${escapeHtml(info.word)}</div>
    <div class="review-fix-tip">✏️ ${rwL("Look at it carefully, then type it again to go on!", "잘 보고 다시 한 번 써 보면 다음으로 갈 수 있어요!")}</div>`;
  const enterFixMode = () => {
    fixing = true;
    input.value = "";
    input.disabled = false;
    input.placeholder = rwL("Type it again…", "다시 써 봐요…");
    input.classList.remove("ok", "bad");
    fb.className = "review-feedback bad review-fix";
    fb.innerHTML = fixPromptHtml();
    btn.textContent = rwL("Next →", "다음 →");
    btn.disabled = true;
    speak(info.word);
    input.focus();
  };
  const finish = () => {
    if (answered) {
      if (fixing && !matches()) {
        // Enter pressed with the wrong spelling still in the box: a friendly nudge.
        playWrongSfx();
        input.classList.remove("shake");
        void input.offsetWidth;
        input.classList.add("shake");
        fb.className = "review-feedback bad review-fix";
        fb.innerHTML = `<div class="review-fix-title">💪 ${rwL("Almost! Look at the answer and try once more.", "아까워요! 정답을 보고 한 번 더 써 봐요.")}</div>
          <div class="review-fix-answer">${escapeHtml(info.word)}</div>`;
        input.focus();
        return;
      }
      playNextSfx(); reviewState.i++; reviewShow(); return;
    }
    const val = input.value.trim().toLowerCase();
    if (!val) return;
    answered = true;
    const ok = val === expected;
    reviewRecord(item, ok, info.math);
    // Right answer: the happy ding (climbs with a streak, fanfare every 5th);
    // wrong answer: the low buzz. Same sounds as Quiz / Spelling.
    reviewState.combo = ok ? (reviewState.combo || 0) + 1 : 0;
    if (ok) playCorrectSfx(reviewState.combo); else playWrongSfx();
    if (!ok && !info.math) { enterFixMode(); return; }
    input.disabled = true;
    input.classList.add(ok ? "ok" : "bad");
    fb.className = "review-feedback " + (ok ? "ok" : "bad");
    fb.innerHTML = ok
      ? `🎉 ${rwL("Correct!", "정답!")} ${reviewState.lastGraduated ? rwL("You graduated this word!", "이 단어 졸업!") : rwL("Great job!", "잘했어요!")}`
      : `${rwL("Answer", "정답")}: <b>${escapeHtml(info.math ? info.answer : info.word)}</b>`;
    btn.textContent = rwL("Next →", "다음 →");
    btn.focus();
  };
  btn.addEventListener("click", finish);
  input.addEventListener("input", () => {
    if (!fixing) return;
    const good = matches();
    if (good === btn.disabled) { // state flips: disabled=true & good → unlock; disabled=false & !good → lock
      btn.disabled = !good;
      input.classList.toggle("ok", good);
      if (good) {
        playCorrectSfx(1);
        fb.className = "review-feedback ok review-fix";
        fb.innerHTML = `<div class="review-fix-title">👏 ${rwL("Great job! You fixed it.", "잘 고쳤어요!")}</div>
          <div class="review-fix-tip">${rwL("Now press Next.", "이제 다음을 눌러요.")}</div>`;
      } else {
        fb.className = "review-feedback bad review-fix";
        fb.innerHTML = fixPromptHtml();
      }
    }
  });
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); finish(); } });
  if (!info.math) speak(info.word);
  setTimeout(() => input.focus(), 50);
}

function reviewRecord(item, ok, isMath) {
  const s = reviewState;
  const key = item.key;
  recordResult(key, ok, isMath ? "tt" : "spelling");
  if (!isMath) recordSrsResult(key, ok);
  const w = progress.wrong[key];
  s.lastGraduated = false;
  if (ok) {
    // Answered right in a review → graduate straight away: it leaves the
    // Wrong notes list (recordResult may already have removed it).
    if (w) { delete progress.wrong[key]; progress.counters.wrongCleared++; }
    s.graduated++;
    s.lastGraduated = true;
    s.right++;
  } else {
    if (w) w.retestAt = 0;
    s.missed.push(key);
    if (!item.retried) s.queue.push({ key, retried: true });
  }
  saveProgress();
  if (ok) { try { checkBadges(); } catch (e) { /* badges not ready */ } }
}

function reviewSummary() {
  const s = reviewState;
  if (!s.rewarded && s.right > 0 && canUseAccountFeatures()) {
    s.rewarded = true;
    const coins = KoalaCore.awardReview(progress, localDateKey(new Date()) + ":" + Date.now());
    if (coins) {
      saveProgress();
      rwToastQueue.push({ emojiHtml: COIN_SVG, title: rwL(`+${coins} Koala Coins!`, `+${coins} 코알라 코인!`), name: KOALA_REASON_LABELS().review, go: true });
      showNextBadgeToast();
      checkLevelUp();
    }
  }
  document.getElementById("review-progress-fill").style.width = "100%";
  document.getElementById("review-count").textContent = "";
  const waiting = reviewWaitingCount(s.kind);
  const left = reviewDueList(s.kind).length;
  document.getElementById("review-body").innerHTML = `<div class="review-done-koala"><span class="kface" aria-hidden="true"></span>🍃</div>
    <h3 class="review-done-title">${rwL("Review complete!", "복습 완료!")}</h3>
    <p class="review-def">${rwL(`${s.right} correct`, `${s.right}개 맞혔어요`)}${s.graduated ? ` · ${rwL(`${s.graduated} graduated 🎓`, `${s.graduated}개 졸업 🎓`)}` : ""}</p>
    ${waiting ? `<p class="review-ex">${rwL(`${waiting} word${waiting === 1 ? "" : "s"} will be retested tomorrow.`, `내일 다시 확인할 단어 ${waiting}개`)}</p>` : ""}
    ${left ? `<button type="button" class="pill accent review-next" id="review-more">${rwL(`Review ${left} more`, `${left}개 더 복습`)}</button>` : ""}
    <button type="button" class="pill review-next" id="review-finish">${rwL("Done", "끝내기")}</button>`;
  const more = document.getElementById("review-more");
  if (more) more.addEventListener("click", () => { playNextSfx(); startReview(s.kind); });
  document.getElementById("review-finish").addEventListener("click", () => { playNextSfx(); closeReview(); });
}


/* ================= PARENT REPORT ================= */
// A weekly summary built from data every account already has (progress.daily,
// wordStats, srs, streak) — no extra tracking, nothing leaves the device.
const PARENT_MODES = [
  ["quiz", () => rwL("Quiz", "퀴즈")],
  ["spelling", () => rwL("Spelling", "스펠링")],
  ["typing", () => rwL("Typing Game", "타이핑 게임")],
  ["tt", () => rwL("Times Table", "구구단")],
  ["flash", () => rwL("Flashcards", "플래시카드")],
];

function parentWeekData(offsetDays) {
  ensureRewardData();
  const perMode = {};
  PARENT_MODES.forEach(([m]) => (perMode[m] = [0, 0]));
  let activeDays = 0, correct = 0, total = 0;
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i - offsetDays);
    const rec = progress.daily[localDateKey(d)] || {};
    let dayTot = 0;
    PARENT_MODES.forEach(([m]) => {
      if (rec[m]) {
        perMode[m][0] += rec[m][0];
        perMode[m][1] += rec[m][1];
        correct += rec[m][0];
        total += rec[m][1];
        dayTot += rec[m][1];
      }
    });
    if (dayTot) activeDays++;
  }
  return { perMode, activeDays, correct, total, pct: total ? Math.round((correct / total) * 100) : 0 };
}

function parentTrickyWords(limit) {
  return Object.entries(progress.wordStats || {})
    .filter(([k, v]) => !reviewIsMath(k) && v.incorrect > 0 && v.incorrect >= v.correct)
    .sort((a, b) => b[1].incorrect - a[1].incorrect)
    .slice(0, limit)
    .map(([k, v]) => ({ word: k, miss: v.incorrect, info: findWordInfo(k) }));
}

function parentSummaryLines() {
  const w = parentWeekData(0), prev = parentWeekData(1 * 7);
  const lines = [];
  lines.push(`Koala Study Mate — ${rwL("weekly report", "주간 리포트")}`);
  lines.push(`${rwL("Days practised", "학습한 날")}: ${w.activeDays}/7`);
  lines.push(`${rwL("Answers", "푼 문제")}: ${w.total} (${rwL("accuracy", "정답률")} ${w.total ? w.pct + "%" : "–"})`);
  PARENT_MODES.forEach(([m, name]) => {
    const [c, tot] = w.perMode[m];
    if (tot) lines.push(`• ${name()}: ${c}/${tot}`);
  });
  const tricky = parentTrickyWords(5).map((x) => x.word);
  if (tricky.length) lines.push(`${rwL("Tricky words", "어려운 단어")}: ${tricky.join(", ")}`);
  lines.push(`${rwL("Streak", "연속 학습")}: ${(progress.streak && progress.streak.count) || 0}${rwL(" days", "일")}`);
  void prev;
  return lines;
}

function parentTips(w, prev) {
  const tips = [];
  if (w.activeDays === 0) {
    tips.push(rwL("No practice yet this week. Five minutes after dinner is a great place to start.", "이번 주는 아직 학습 기록이 없어요. 저녁 식사 후 5분부터 시작해 보세요."));
    return tips;
  }
  if (w.activeDays < 4) tips.push(rwL(`Practised ${w.activeDays} of 7 days. Short daily sessions work better than one long one — aim for 4+ days.`, `이번 주 ${w.activeDays}일 학습했어요. 몰아서 하는 것보다 매일 조금씩이 효과적이에요. 주 4일 이상을 목표로 해 보세요.`));
  else tips.push(rwL(`Practised ${w.activeDays} of 7 days — a great routine. Keep it going!`, `7일 중 ${w.activeDays}일 학습했어요. 좋은 습관이에요. 계속 이어가요!`));
  let low = null;
  PARENT_MODES.forEach(([m, name]) => {
    const [c, tot] = w.perMode[m];
    if (tot >= 5) {
      const p = c / tot;
      if (!low || p < low.p) low = { p, name: name() };
    }
  });
  if (low && low.p < 0.7) tips.push(rwL(`${low.name} is the toughest area (${Math.round(low.p * 100)}% correct). A few extra rounds there would help most.`, `${low.name}이(가) 가장 어려워 보여요(정답률 ${Math.round(low.p * 100)}%). 이 부분을 조금 더 연습하면 좋아요.`));
  if (prev.total >= 10 && w.total >= 10 && w.pct - prev.pct >= 5) tips.push(rwL(`Accuracy is up ${w.pct - prev.pct} points on last week. Worth a compliment!`, `지난주보다 정답률이 ${w.pct - prev.pct}%p 올랐어요. 칭찬해 주세요!`));
  return tips;
}

function parentShareUrl() { return /^https?:/.test(location.protocol) ? location.origin : "https://koalastudymate.com"; }
// Fallback for desktop browsers without the system share sheet.
function parentShareLinks() {
  const text = parentSummaryLines().join("\n");
  const url = parentShareUrl();
  const t = encodeURIComponent(text), u = encodeURIComponent(url), both = encodeURIComponent(text + "\n" + url);
  return [
    { name: "WhatsApp", href: `https://wa.me/?text=${both}` },
    { name: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}&quote=${t}` },
    { name: "X", href: `https://twitter.com/intent/tweet?text=${t}&url=${u}` },
    { name: "Telegram", href: `https://t.me/share/url?url=${u}&text=${t}` },
    { name: rwL("Email", "이메일"), href: `mailto:?subject=${encodeURIComponent("Koala Study Mate — " + rwL("weekly report", "주간 리포트"))}&body=${both}` },
    { name: rwL("Text message", "문자"), href: `sms:?&body=${both}` },
  ];
}

function renderParentPanel() {
  const el = statsPanels.parent;
  const w = parentWeekData(0), prev = parentWeekData(7);
  const delta = prev.total >= 10 && w.total >= 10 ? w.pct - prev.pct : null;
  const deltaHtml = delta === null ? "" : `<span class="pr-delta ${delta >= 0 ? "up" : "down"}">${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta)}%p</span>`;
  const streak = (progress.streak && progress.streak.count) || 0;
  const learned = Object.values(progress.srs || {}).filter((e) => e.box >= 3).length;
  const mastered = `<div class="pr-tile"><div class="pr-num">${learned}</div><div class="pr-lbl">${rwL("words well known", "잘 아는 단어")}</div></div>`;
  let modes = "";
  PARENT_MODES.forEach(([m, name]) => {
    const [c, tot] = w.perMode[m];
    const pct = tot ? Math.round((c / tot) * 100) : 0;
    modes += `<div class="hbar-row"><span class="hbar-name">${name()}</span>
      <span class="hbar-track"><span class="hbar-fill" style="width:${pct}%"></span></span>
      <span class="hbar-pct">${tot ? c + "/" + tot : "–"}</span></div>`;
  });
  const tricky = parentTrickyWords(6);
  const trickyHtml = tricky.length
    ? `<ul class="pr-tricky">${tricky.map((x) => `<li><button type="button" class="pr-say" data-say="${escapeHtml(x.word)}" aria-label="${rwL("Hear it", "들어보기")}">🔊</button><span class="pr-word">${escapeHtml(x.word)}</span><span class="pr-def">${x.info && x.info.definition ? escapeHtml(x.info.definition) : ""}</span><span class="pr-miss">${rwL(`missed ${x.miss}×`, `${x.miss}번 틀림`)}</span></li>`).join("")}</ul>`
    : `<p class="chart-empty">${rwL("No tricky words yet.", "아직 어려운 단어가 없어요.")}</p>`;
  const tips = parentTips(w, prev).map((x) => `<li>${escapeHtml(x)}</li>`).join("");
  const from = new Date(); from.setDate(from.getDate() - 6);
  const loc = currentLang === "ko" ? "ko-KR" : "en-AU";
  const range = `${from.toLocaleDateString(loc, { day: "numeric", month: "short" })} – ${new Date().toLocaleDateString(loc, { day: "numeric", month: "short" })}`;
  el.innerHTML = `<div class="pr-head"><h4 class="chart-title">${rwL("Weekly report", "주간 리포트")}</h4><span class="pr-range">${range}</span></div>
    <div class="pr-tiles">
      <div class="pr-tile"><div class="pr-num">${w.activeDays}<small>/7</small></div><div class="pr-lbl">${rwL("days practised", "학습한 날")}</div></div>
      <div class="pr-tile"><div class="pr-num">${w.total}</div><div class="pr-lbl">${rwL("answers", "푼 문제")}</div></div>
      <div class="pr-tile"><div class="pr-num">${w.total ? w.pct + "%" : "–"}${deltaHtml}</div><div class="pr-lbl">${rwL("accuracy", "정답률")}</div></div>
      <div class="pr-tile"><div class="pr-num">${streak}</div><div class="pr-lbl">${rwL("day streak", "연속 학습")}</div></div>
      ${mastered}
    </div>
    <h4 class="chart-title">${rwL("This week by activity", "이번 주 활동별")}</h4>${modes}
    <h4 class="chart-title">${rwL("Tricky words", "어려운 단어")}</h4>${trickyHtml}
    <h4 class="chart-title">${rwL("Tips for this week", "이번 주 조언")}</h4><ul class="pr-tips">${tips}</ul>
    <div class="pr-actions"><button type="button" class="pill accent small" id="pr-copy">📋 ${rwL("Copy summary", "요약 복사")}</button>
    <div class="pr-share-wrap"><button type="button" class="pill small" id="pr-share" aria-haspopup="true" aria-expanded="false"><svg class="ios-share" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 3v12M12 3L8 7M12 3l4 4M6 11H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> ${rwL("Share", "공유")}</button>
    <div class="pr-share-menu" id="pr-share-menu" hidden role="menu">${parentShareLinks().map((l) => `<a role="menuitem" class="pr-share-item" href="${l.href}" target="_blank" rel="noopener noreferrer">${l.name}</a>`).join("")}</div></div></div>
    <p class="pr-note">${rwL("Based on this device. Premium accounts also keep progress across devices.", "이 기기의 기록을 기준으로 해요. 프리미엄 계정은 기기가 달라도 기록이 이어져요.")}</p>`;
}

statsPanels.parent.addEventListener("click", async (e) => {
  const say = e.target.closest("[data-say]");
  if (say) { speak(say.dataset.say); return; }
  const text = parentSummaryLines().join("\n");
  if (e.target.closest("#pr-copy")) {
    const btn = e.target.closest("#pr-copy");
    try { await navigator.clipboard.writeText(text); btn.textContent = "✓ " + rwL("Copied!", "복사됨!"); }
    catch (err) { btn.textContent = rwL("Copy failed", "복사 실패"); }
    setTimeout(() => { btn.textContent = "📋 " + rwL("Copy summary", "요약 복사"); }, 1800);
  } else if (e.target.closest("#pr-share")) {
    // Phones/tablets: the system share sheet (iMessage, WhatsApp, KakaoTalk, …).
    if (navigator.share) { navigator.share({ title: "Koala Study Mate", text, url: parentShareUrl() }).catch(() => {}); return; }
    const menu = document.getElementById("pr-share-menu");
    menu.hidden = !menu.hidden;
    document.getElementById("pr-share").setAttribute("aria-expanded", menu.hidden ? "false" : "true");
  }
});
document.addEventListener("click", (e) => {
  const menu = document.getElementById("pr-share-menu");
  if (menu && !menu.hidden && !e.target.closest(".pr-share-wrap")) {
    menu.hidden = true;
    const b = document.getElementById("pr-share");
    if (b) b.setAttribute("aria-expanded", "false");
  }
});


// ---- Quiz / Spelling / Flashcards share the Typing Game's pastel scenery ----
// Clone the Typing Game's sky/hills/trees layer into the first card of each view.
(function addSceneryToPracticeCards() {
  const src = document.querySelector("#typegame-stage .tg-sky");
  if (!src) return;
  ["#view-quiz", "#view-spelling", "#view-flashcards"].forEach((sel) => {
    const card = document.querySelector(sel + " > .card");
    if (!card || card.querySelector(":scope > .tg-bg")) return;
    const layer = src.cloneNode(true);
    layer.classList.add("tg-bg");
    layer.setAttribute("aria-hidden", "true");
    card.classList.add("scene-card");
    card.insertBefore(layer, card.firstChild);
  });
})();
