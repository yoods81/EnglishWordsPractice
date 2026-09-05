# Year 4 English Word Practice

A simple browser app for practising English vocabulary and spelling, aligned to the Australian Year 4 English curriculum. No build step or install required — plain HTML/CSS/JavaScript.

## Features

- **Flashcards** — flip cards to reveal a word's definition and example sentence, with text-to-speech pronunciation. Covers general vocabulary and synonym/antonym pairs.
- **Quiz** — multiple-choice questions across vocabulary, synonyms/antonyms, and homophones, with a progress bar and running score.
- **Spelling practice** — listen to a word (via speech synthesis) and type what you hear, with spelling tips for tricky words.
- **Word list** — a searchable list of all words with a per-word mastery percentage.
- **My Progress** — overall stats (words practised, flashcards known, quiz/spelling accuracy), saved locally in the browser (`localStorage`) so progress persists between visits. A "Reset all progress" button is available.

## Running locally

No dependencies or build tools are needed. Just serve the folder and open it in a browser, for example:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

You can also open `index.html` directly in a browser, though some browsers restrict local file access for scripts — serving it is more reliable.

## Project structure

```
index.html      Page structure and all views (flashcards, quiz, spelling, word list, stats)
css/style.css   Styling
js/words.js     Word data (vocabulary, spelling words, synonyms/antonyms, homophones)
js/app.js       App logic (tabs, quiz/flashcard/spelling engines, progress storage)
```

## Customising the word list

All words live in `js/words.js`, grouped by category (`vocabulary`, `spelling`, `synonyms`, `homophones`). Add, edit, or remove entries there to tailor the word list.
