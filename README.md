# Aussie English Word Practice

A browser app for practising English vocabulary and spelling, levelled for Australian primary students (Year 4, Year 5, and Year 6 / GATE-style vocabulary). No build step or install required — plain HTML/CSS/JavaScript.

## Features

- **Three levels** — Year 4, Year 5, and Year 6 (more advanced, GATE-style) vocabulary. Choose your level on the first screen; change it anytime from the "Level" button in the header. Every mode (flashcards, quiz, spelling, word list) filters to the selected level.
- **Flashcards** — flip cards to reveal a word's definition and example sentence. Tap the word, the meaning, or the example to hear it read aloud in an Australian voice.
- **Quiz** — multiple-choice questions across vocabulary, synonyms/antonyms, and homophones, with a progress bar and running score. Tap the question line to hear it read aloud.
- **Spelling practice** — listen to a word (via speech synthesis) and type what you hear, with spelling tips for tricky words.
- **Word list** — a searchable list of all words for the current level with a per-word mastery percentage. Tap a word or its example sentence to hear it.
- **Add Word** — add your own words:
  - **Manually**: type the word, its meaning, an optional example sentence, and pick a level.
  - **From a photo**: take a photo of a book page (or upload a screenshot of an online passage). The app reads the text with on-device OCR (Tesseract.js), suggests candidate words you haven't added yet, and — once you pick a level and confirm — looks up a definition/example automatically (via the free dictionaryapi.dev service) and saves them. You can edit or delete any word you've added.
  - Requires an internet connection the first time (to load the OCR engine and to look up definitions); reading the photo itself happens in your browser.
- **My Progress** — overall stats (words practised, flashcards known, quiz/spelling accuracy, words you've added), saved locally in the browser (`localStorage`) so progress persists between visits. A "Reset all progress" button is available.

## Running locally

No dependencies or build tools are needed. Just serve the folder and open it in a browser, for example:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

You can also open `index.html` directly in a browser, though some browsers restrict local file access for scripts — serving it is more reliable.

## Project structure

```
index.html      Page structure and all views (level select, flashcards, quiz, spelling, word list, add word, stats)
css/style.css   Styling
js/words.js     Built-in word data, grouped by category and level ("year4" / "year5" / "year6")
js/app.js       App logic (level switching, tabs, quiz/flashcard/spelling engines, manual add, OCR extraction, progress storage)
```

## Customising the built-in word list

Built-in words live in `js/words.js`, grouped by category (`vocabulary`, `spelling`, `synonyms`, `homophones`); each entry has a `level` field (`year4`, `year5`, `year6`). Add, edit, or remove entries there to tailor the word list. Words added by a user through the app (manually or from a photo) are stored separately in the browser's `localStorage` and are not written back to this file.

## Notes on the Year 5 / Year 6 word lists

The Year 5 and Year 6 vocabulary, spelling, synonym and homophone lists are general-purpose, curriculum-appropriate word sets written to be harder than the Year 4 list — they are not sourced from any specific GATE/selective-school test paper. Use the "Add Word" photo-extraction or manual-add features to build out a list that matches words from the actual practice materials you're using.
