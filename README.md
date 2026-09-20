# Aussie English Word Practice

A browser app for practising English vocabulary and spelling, levelled for Australian primary students (Year 4, Year 5, and Year 6 / GATE-style vocabulary). No build step or install required — plain HTML/CSS/JavaScript.

## Features

- **Admin login** — a 🔒 Admin button in the top-left corner of the header opens a login form. The password is checked by the Worker against a Cloudflare secret, so it never reaches the browser, and a signed `HttpOnly` session cookie is what authorises changes to the shared word list. The **Add Word** tab is hidden for everyone else. If the API can't be reached at all, the app falls back to an in-page check against a password hash — that only unlocks editing words in that one browser, since the server rejects any write without a valid session.
- **Two language tracks, switchable anytime** — a "한국어 / English" button in the top-right corner of the header swaps the entire UI (and the level choices, word banks, and quiz categories) between:
  - **English track**: Year 4, Year 5, and Year 6 (more advanced, GATE-style) Australian-curriculum vocabulary.
  - **Korean track** (필수 영어 단어 연습): 초등학교 6학년 / 중학교 1학년 / 중학교 2학년 / 중학교 3학년 essential English vocabulary, 120+ words per level, with meanings shown in Korean and example sentences in English. Since this track has no separate synonym/homophone word lists, those quiz categories are hidden and Spelling practice draws on the vocabulary list itself (using the Korean meaning as a hint).
  - Each language remembers its own selected level independently, so switching back and forth returns you to where you left off.
- **Flashcards** — flip cards to reveal a word's definition and example sentence, with **Back**/**Next** buttons on either side of the card (shown as large arrow icons only on narrow/mobile screens). Tap the word, the meaning, or the example to hear it read aloud. A front-side selector next to the category dropdown lets you choose whether the word or its meaning shows first — handy for practising recall in either direction. A source selector picks where the cards come from: **🎲 Level words** builds a deck from the current level automatically, while **⭐ My cards** uses a deck of your own. Choosing your own cards opens a **⭐ My flashcards** panel below with three ways to fill it: **✏️ Add manually** types in word/meaning/example by hand, **📋 Multiple words** takes a list (one per line or comma-separated) and looks up each meaning and example automatically — the same lookup the Add Word tab uses — and **🔍 Search & add** searches every level of the current word lists so a word already in the app can be added with one tap, without retyping its meaning. Words already in the deck are marked rather than offered again. Those cards live in your browser, so they're yours alone. You can also fill the deck from the Word List tab (below).
- **Quiz** — multiple-choice questions across vocabulary (and, on the English track, synonyms/antonyms and homophones), with a progress bar and running score. Tap the question line to hear it read aloud.
- **Target score** — Quiz and Spelling each have a target (off, or 5/10/15/20 correct) that's remembered between visits. Reaching it brings up a congratulation with a **🚀 Try the next level** button that moves you up a level and starts a fresh round there; **Keep going** dismisses it and carries on at the level you're on. On the highest level the message says so and there's nothing further to jump to.
- **Word Drop** — a falling-words typing game built from the same word list as Spelling practice: words spawn at the top of the play area and drift downward, and typing locks onto whichever falling word your keystrokes match (the one closest to the bottom wins if two share a prefix, so there's never an ambiguous match). Finishing a word scores points and clears it; letting one reach the bottom costs one of 5 lives, and the game speeds up — faster falling, more frequent spawns — every 50 points. Losing all 5 lives ends the round with a final score and, if it beats your best for this level and language, a new high score (kept separately per level, since Year 4 and Year 6 aren't really comparable). Switching to another tab mid-round pauses it in place rather than ending it; coming back resumes exactly where you left off. A level without enough words to play disables **▶ Start Game** with a note to add more first.
- **Spelling practice** — starts on a "▶ Start the first word" screen so nothing plays until you're ready; tap it to hear the first word (via the green **Hear the word** button). Type your answer and tap **Next** — a correct spelling advances to the next word; an incorrect one keeps the total ticking up but not the correct count, stays on the same word, and shows the correct spelling (in red) with a prompt to try again, plus the word's meaning/tip below. If a word was ever misspelled during a round, it's counted as wrong for that round's score even if you go on to spell it correctly and move past it. **Skip** moves on without affecting the score; the black **Back** button returns to the previous word to retry it. A word you ever get wrong is flagged "Incorrect" (shown as its Word List badge too) and stays flagged until you spell it right on a clean first try — flagged words are served first the next time you start a round, ahead of new/untried words. A **🏁 Finish** button ends the round and shows a report of every word you got wrong that round, each with its meaning, plus your score for the round.
- **Word list** — the words for the current level with a per-word mastery percentage and a running count. Tap a word or its example sentence to hear it. A dropdown next to the search box switches which level you're looking at, or shows **📚 All levels** at once. Typing in the search box looks through *every* level regardless of that choice — an automatically added word is filed under whichever level was guessed for it, which often isn't the one you're browsing. Whenever more than one level is on screen, each word is tagged with the level it belongs to. Tick the checkbox beside any words and **⭐ Add to my flashcards** drops them into the personal deck used by the Flashcards tab.
- **Add Word** (Admin only — see above) — add your own words, in one of two modes:
  - **Single word**: type the word, its meaning, an optional example sentence, and pick a level — same as before.
  - **Multiple words**: paste or type a list of words (one per line, or comma-separated) and save — no meaning, example, or level needed. Each word's definition and example are looked up automatically (same lookup as the photo import below), and a level is guessed for it automatically too: an exact match against the app's own built-in word lists reuses that word's real level, otherwise it's estimated from word length. This is a rough estimate, not a real difficulty assessment — fix any word's level afterwards via its Edit button if it's off.
  - **From a photo**: take a photo (or choose one from your gallery — the picker offers both) of a book page or a screenshot of an online passage/word list. The app reads the text with on-device OCR (Tesseract.js), suggests candidate words you haven't added yet (with a Select All / Deselect All shortcut), and — once you pick a level and confirm — looks up a definition and example for each word automatically and saves them.
  - **Meanings and levels are tracked separately for each language track.** Whichever track you're on when a word is looked up automatically (bulk-add, photo import) or manually typed (single word), the app also looks up (or, for a manually typed meaning, fetches in the background) the *other* language's meaning and estimates the *other* language's level for it — using dictionaryapi.dev (falling back to Wiktionary) for English and the free MyMemory API for Korean. So a word added on the English track still shows an English meaning and an English-track level (Year 4/5/6) if you switch to the Korean track, and vice versa. If MyMemory can't translate a word directly, the English definition is translated into Korean instead; the reverse is deliberately *not* done, because translating a short Korean gloss back into English just returns the word itself ("describe" → "describe") or a lone synonym rather than an explanation — a word no dictionary has is shown as missing so it can be retried or filled in by hand. Lookups run a few at a time with an automatic retry and a 5-second timeout, so one slow or failing word doesn't sink the whole batch; if a dictionary starts returning server errors it's skipped for two minutes rather than re-timing-out on every remaining word.
  - Any word still missing a meaning *for the language track you're currently viewing* shows up under "My added words" with a "⚠️ N words still need a meaning" banner: retry that one word from its own **🔄 Retry** button, retry all of them at once with **Retry All**, or bulk-remove whichever still fail with **Delete All Failed**. The list has its own search box (matching the word or its meaning) and a sort dropdown — newest or oldest first, A→Z, Z→A, or **⚠️ Missing meaning first** to bring the gaps to the top. Tick the checkbox next to any word(s) and use **🗑️ Delete Selected** (also in the title bar) to remove several at once, or the **📚 Change level** dropdown beside it to move all of them to one level — useful for correcting a batch of automatically guessed levels in one go. The level applies to the language track you're currently on; the other track keeps its own. You can also edit or delete any word you've added individually.
  - Requires an internet connection the first time (to load the OCR engine and to look up definitions/translations); reading the photo itself happens in your browser.
- **My Progress** — overall stats (words practised, flashcards known, quiz/spelling accuracy, words you've added), saved locally in the browser (`localStorage`) so progress persists between visits. A "Reset all progress" button is available.
- **Text-to-speech voice** — tuned to read as a natural, younger-sounding adult female voice: an Australian English voice on the English track, an American English voice on the Korean track. The Web Speech API doesn't let a website pick an exact age, so this is a best-effort voice selection (by name/language) plus a slightly brighter pitch — the actual voice depends on what your browser/OS provides.

## Where words are stored

Words the admin adds are saved **on the server** (a Cloudflare D1 database behind a Worker), so they show up on every device and for every visitor — including a fresh incognito window. Each learner's own progress (scores, flashcards known, wrong-word flags) stays in their own browser's `localStorage`, since that's personal to them.

If the API can't be reached — it isn't deployed yet, or the browser is offline — the app keeps working from a cached copy of the shared list, and anything added then is saved to that browser only until it's uploaded (see the **Upload** button under "My added words").

## Running locally

The app itself is plain HTML/CSS/JS, so for front-end work you can just serve `public/`:

```bash
python3 -m http.server 8000 --directory public
```

The shared word list needs the Worker. To run the whole thing, including a local D1 database:

```bash
npm install
npx wrangler d1 execute englishwordspractice --local --file=./schema.sql   # once
printf 'ADMIN_PASSWORD=choose-one\nSESSION_SECRET=any-long-random-string\n' > .dev.vars
npm run dev
```

Then visit the URL wrangler prints (usually `http://localhost:8787`).

## Deploying (Cloudflare Workers)

The Worker serves `public/` as static assets and handles `/api/*`. One-time setup:

1. **Create the database** and copy the printed `database_id` into `wrangler.jsonc`:
   ```bash
   npx wrangler d1 create englishwordspractice
   ```
2. **Create the table** in the deployed database:
   ```bash
   npm run db:init
   ```
3. **Set the secrets** — these live in Cloudflare, never in the repo:
   ```bash
   npx wrangler secret put ADMIN_PASSWORD     # the admin password
   npx wrangler secret put SESSION_SECRET     # any long random string
   ```
4. **Deploy** with `npm run deploy`, or by pushing if the Worker is connected to this repo on GitHub.
5. Sign in as admin and use **☁️ Upload** under "My added words" to move words already saved in that browser up to the server.

Check that `name` in `wrangler.jsonc` matches the existing Worker, otherwise step 4 creates a second Worker at a different URL.

## Project structure

```
public/index.html   Page structure and all views (language toggle, level select, flashcards, quiz, spelling, word list, add word, stats)
public/css/style.css  Styling
public/js/words.js    English-track word data, grouped by category and level ("year4" / "year5" / "year6")
public/js/words_ko.js Korean-track vocabulary data ("kr_elem6" / "kr_mid1" / "kr_mid2" / "kr_mid3"), Korean definitions + English examples
public/js/app.js      App logic (i18n/translations, language + level switching, tabs, quiz/flashcard/spelling engines, manual add, OCR extraction, text-to-speech voice selection, progress storage, shared-word-list API client)
worker/index.js     Cloudflare Worker: serves the app and the /api routes for the shared word list and admin sign-in
schema.sql          D1 table definitions
wrangler.jsonc      Worker config (static assets + D1 binding)
```

Only `public/` is published — the Worker source, schema and README aren't part of the assets directory, so they aren't reachable from the web.

## Customising the built-in word lists

- English track: `js/words.js`, grouped by category (`vocabulary`, `spelling`, `synonyms`, `homophones`); each entry has a `level` field (`year4`, `year5`, `year6`).
- Korean track: `js/words_ko.js`, a single `vocabulary` list; each entry has a `level` field (`kr_elem6`, `kr_mid1`, `kr_mid2`, `kr_mid3`), a Korean `definition`, and an English `example` sentence.
- UI text for both languages lives in the `TRANSLATIONS` object near the top of `js/app.js`.

Add, edit, or remove entries in these files to tailor the word lists. Words added by a user through the app (manually or from a photo) are stored separately in the browser's `localStorage` and are not written back to these files.

## Notes on the word lists

The Year 5/Year 6 (English) and all four Korean-track word lists are general-purpose, curriculum-appropriate word sets written to reflect realistic difficulty progression — they are not sourced from any specific GATE/selective-school test paper or official Korean textbook list. Use the "Add Word" photo-extraction or manual-add features to build out a list that matches words from the actual practice materials you're using.
