# Aussie English Word Practice

A browser app for practising English vocabulary and spelling, levelled for Australian primary students (Year 4, Year 5, and Year 6 / GATE-style vocabulary). No build step or install required — plain HTML/CSS/JavaScript.

## Features

- **Two language tracks, switchable anytime** — a "한국어 / English" button in the top-right corner of the header swaps the entire UI (and the level choices, word banks, and quiz categories) between:
  - **English track**: Year 4, Year 5, and Year 6 (more advanced, GATE-style) Australian-curriculum vocabulary.
  - **Korean track** (필수 영어 단어 연습): 초등학교 6학년 / 중학교 1학년 / 중학교 2학년 / 중학교 3학년 essential English vocabulary, 120+ words per level, with meanings shown in Korean and example sentences in English. Since this track has no separate synonym/homophone word lists, those quiz categories are hidden and Spelling practice draws on the vocabulary list itself (using the Korean meaning as a hint).
  - Each language remembers its own selected level independently, so switching back and forth returns you to where you left off.
- **Flashcards** — flip cards to reveal a word's definition and example sentence, with **Back**/**Next** buttons on either side of the card (shown as large arrow icons only on narrow/mobile screens). Tap the word, the meaning, or the example to hear it read aloud.
- **Quiz** — multiple-choice questions across vocabulary (and, on the English track, synonyms/antonyms and homophones), with a progress bar and running score. Tap the question line to hear it read aloud.
- **Spelling practice** — starts on a "▶ Start the first word" screen so nothing plays until you're ready; tap it to hear the first word. Type your answer and tap **Next** — a correct spelling advances to the next word and adds 1 to the score; an incorrect one stays on the same word and shows the correct spelling (in red) with a prompt to try again, plus the word's meaning/tip below. **Skip** moves on without affecting the score; **Back** returns to the previous word to retry it.
- **Word list** — a searchable list of all words for the current level with a per-word mastery percentage. Tap a word or its example sentence to hear it.
- **Add Word** — add your own words:
  - **Manually**: type the word, its meaning, an optional example sentence, and pick a level.
  - **From a photo**: take a photo (or choose one from your gallery — the picker offers both) of a book page or a screenshot of an online passage/word list. The app reads the text with on-device OCR (Tesseract.js), suggests candidate words you haven't added yet (with a Select All / Deselect All shortcut), and — once you pick a level and confirm — looks up a definition and example for each word automatically and saves them. On the English track this uses the free dictionaryapi.dev service; on the Korean track it also translates each word to Korean via the free MyMemory API (dictionaryapi.dev's example sentence is kept where available). Lookups run a few at a time with an automatic retry, so a word occasionally failing doesn't sink the whole batch. Any word that still has no meaning after that shows up under "My added words" with a "⚠️ N words still need a meaning" banner: retry that one word from its own **🔄 Retry** button, retry all of them at once with **Retry All**, or bulk-remove whichever still fail with **Delete All Failed**. You can also edit or delete any word you've added individually.
  - Requires an internet connection the first time (to load the OCR engine and to look up definitions/translations); reading the photo itself happens in your browser.
- **My Progress** — overall stats (words practised, flashcards known, quiz/spelling accuracy, words you've added), saved locally in the browser (`localStorage`) so progress persists between visits. A "Reset all progress" button is available.
- **Text-to-speech voice** — tuned to read as a natural, younger-sounding adult female voice: an Australian English voice on the English track, an American English voice on the Korean track. The Web Speech API doesn't let a website pick an exact age, so this is a best-effort voice selection (by name/language) plus a slightly brighter pitch — the actual voice depends on what your browser/OS provides.

## Running locally

No dependencies or build tools are needed. Just serve the folder and open it in a browser, for example:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

You can also open `index.html` directly in a browser, though some browsers restrict local file access for scripts — serving it is more reliable.

## Project structure

```
index.html        Page structure and all views (language toggle, level select, flashcards, quiz, spelling, word list, add word, stats)
css/style.css      Styling
js/words.js        English-track word data, grouped by category and level ("year4" / "year5" / "year6")
js/words_ko.js     Korean-track vocabulary data ("kr_elem6" / "kr_mid1" / "kr_mid2" / "kr_mid3"), Korean definitions + English examples
js/app.js          App logic (i18n/translations, language + level switching, tabs, quiz/flashcard/spelling engines, manual add, OCR extraction, text-to-speech voice selection, progress storage)
```

## Customising the built-in word lists

- English track: `js/words.js`, grouped by category (`vocabulary`, `spelling`, `synonyms`, `homophones`); each entry has a `level` field (`year4`, `year5`, `year6`).
- Korean track: `js/words_ko.js`, a single `vocabulary` list; each entry has a `level` field (`kr_elem6`, `kr_mid1`, `kr_mid2`, `kr_mid3`), a Korean `definition`, and an English `example` sentence.
- UI text for both languages lives in the `TRANSLATIONS` object near the top of `js/app.js`.

Add, edit, or remove entries in these files to tailor the word lists. Words added by a user through the app (manually or from a photo) are stored separately in the browser's `localStorage` and are not written back to these files.

## Notes on the word lists

The Year 5/Year 6 (English) and all four Korean-track word lists are general-purpose, curriculum-appropriate word sets written to reflect realistic difficulty progression — they are not sourced from any specific GATE/selective-school test paper or official Korean textbook list. Use the "Add Word" photo-extraction or manual-add features to build out a list that matches words from the actual practice materials you're using.
