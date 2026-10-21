// Builds the public "learn" pages (word lists + times-table chart) and sitemap.xml.
// The word lists come straight from the app's built-in WORD_BANK (public/js/words.js), so the pages
// never drift from what the app teaches. Only built-in words are used - never a user's own words.
// Run with `npm run gen:learn` (npm run deploy does it too).
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://koalastudymate.com";
const ctx = {};
vm.createContext(ctx);
vm.runInContext(readFileSync(join(root, "public", "js", "words.js"), "utf8") + ";this.WB = WORD_BANK;", ctx);
const WB = ctx.WB;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const YEARS = [["year4", "Year 4"], ["year5", "Year 5"], ["year6", "Year 6"]];
const byYear = (bank, id) => bank.filter((w) => w.level === id);

const PAGES = [];   // { slug, title, desc, h1, intro, body, name }

// ---- vocabulary ----
PAGES.push({
  slug: "vocabulary-words", name: "Vocabulary words",
  title: "Year 4, 5 & 6 Vocabulary Words with Meanings and Examples",
  desc: "Free vocabulary word lists for Australian students in Years 4 to 6, with simple meanings and example sentences. Practise them with quizzes in Koala Study Mate.",
  h1: "Vocabulary words for Years 4, 5 and 6",
  intro: "Learning new words is easier when each one comes with a simple meaning and a sentence you can picture. These lists cover the vocabulary in Koala Study Mate for Australian primary students. Read them together, then test yourself with the quiz in the app.",
  body: YEARS.map(([id, label]) => {
    const list = byYear(WB.vocabulary, id);
    return `<section class="wl-sec"><h2>${label} vocabulary (${list.length} words)</h2><ul class="wl">${list.map((w) =>
      `<li><b>${esc(w.word)}</b> <span>${esc(w.definition)}</span><em>“${esc(w.example)}”</em></li>`).join("")}</ul></section>`;
  }).join("\n"),
});

// ---- spelling ----
PAGES.push({
  slug: "spelling-words", name: "Spelling words",
  title: "Year 4, 5 & 6 Spelling Words with Memory Tips",
  desc: "Spelling word lists for Australian students in Years 4 to 6, each with a memory tip. Free to read, then practise by typing in Koala Study Mate.",
  h1: "Spelling words for Years 4, 5 and 6",
  intro: "Tricky words are easier to spell when you have a memory hook. Every word below comes with a tip. Look at the word, say it out loud, cover it up and try to write it, then practise by typing in the app.",
  body: YEARS.map(([id, label]) => {
    const list = byYear(WB.spelling, id);
    return `<section class="wl-sec"><h2>${label} spelling words (${list.length} words)</h2><ul class="wl">${list.map((w) =>
      `<li><b>${esc(w.word)}</b> <span>${esc(w.tip || "")}</span></li>`).join("")}</ul></section>`;
  }).join("\n"),
});

// ---- homophones ----
PAGES.push({
  slug: "homophones", name: "Homophones",
  title: "Homophones for Kids: their, there, they're and More",
  desc: "Homophone pairs for Australian primary students with simple meanings, such as their, there and they're. Practise telling them apart in Koala Study Mate.",
  h1: "Homophones for kids",
  intro: "Homophones sound the same but have different spellings and meanings. Learning them in pairs, with what each one means, helps you pick the right word when you write.",
  body: YEARS.map(([id, label]) => {
    const list = byYear(WB.homophones, id);
    return `<section class="wl-sec"><h2>${label} homophones (${list.length} pairs)</h2><ul class="wl">${list.map((w) =>
      `<li><b>${esc(w.pair[0])} / ${esc(w.pair[1])}</b> <span>${esc(w.pair[0])} = ${esc(w.defs[0])}; ${esc(w.pair[1])} = ${esc(w.defs[1])}</span></li>`).join("")}</ul></section>`;
  }).join("\n"),
});

// ---- synonyms & antonyms ----
PAGES.push({
  slug: "synonyms-and-antonyms", name: "Synonyms and antonyms",
  title: "Synonyms and Antonyms for Kids: Word Lists for Years 4–6",
  desc: "Synonym and antonym word lists for Australian primary students in Years 4 to 6. Learn words that mean the same or the opposite, then practise in Koala Study Mate.",
  h1: "Synonyms and antonyms for kids",
  intro: "A synonym means almost the same thing as another word; an antonym means the opposite. Knowing both makes your writing more interesting and helps you work out new words.",
  body: YEARS.map(([id, label]) => {
    const list = byYear(WB.synonyms, id);
    return `<section class="wl-sec"><h2>${label} synonyms and antonyms (${list.length} words)</h2><ul class="wl">${list.map((w) =>
      `<li><b>${esc(w.word)}</b> <span>Synonym: ${esc(w.synonym)} · Antonym: ${esc(w.antonym)}</span></li>`).join("")}</ul></section>`;
  }).join("\n"),
});

// ---- times tables ----
const rows = Array.from({ length: 12 }, (_, i) => i + 1);
const chart = `<div class="tt-wrap"><table class="tt"><thead><tr><th>×</th>${rows.map((c) => `<th>${c}</th>`).join("")}</tr></thead><tbody>${
  rows.map((r) => `<tr><th>${r}</th>${rows.map((c) => `<td>${r * c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
const TIPS = [
  ["×2", "Double the number. 2 × 7 is 7 + 7 = 14."],
  ["×3", "Double it, then add one more group. 3 × 6 is 12 + 6 = 18."],
  ["×4", "Double and double again. 4 × 7 is 14 doubled = 28."],
  ["×5", "The answer ends in 0 or 5. Count by fives, or halve the 10s answer: 5 × 8 is half of 80 = 40."],
  ["×6", "Use the 5s and add one more group. 6 × 7 is 35 + 7 = 42."],
  ["×9", "Do ×10 and take away one group. 9 × 6 is 60 − 6 = 54. The digits of the answer add up to 9 (5 + 4)."],
  ["×10", "Put a zero on the end of the number."],
  ["×11", "For 1 to 9, say the digit twice: 11 × 4 = 44. For others use ×10 and add one group."],
  ["×12", "Do ×10 and add ×2. 12 × 7 is 70 + 14 = 84."],
];
PAGES.push({
  slug: "times-tables", name: "Times tables chart",
  title: "Times Tables Chart 1–12 with Tips to Learn Them Fast",
  desc: "A printable-style times tables chart from 1 to 12 with easy tricks for the 2, 3, 4, 5, 6, 9, 10, 11 and 12 times tables. Practise with games in Koala Study Mate.",
  h1: "Times tables chart (1 to 12)",
  intro: "Knowing your times tables by heart makes maths faster and easier. Use the chart to check an answer, try the tricks below, then play the Times Table game in the app to make the facts stick.",
  body: `<section class="wl-sec"><h2>Multiplication chart</h2>${chart}</section>
<section class="wl-sec"><h2>Tricks for each table</h2><ul class="wl">${TIPS.map(([t, d]) => `<li><b>${t}</b> <span>${esc(d)}</span></li>`).join("")}</ul></section>`,
});

// ---- hub ----
const hubItems = PAGES.map((p) => `<a class="hub-card" href="/${p.slug}"><b>${esc(p.name)}</b><span>${esc(p.h1)}</span></a>`).join("");

const footer = `<footer class="site"><a href="/">Home</a><a href="/learn">Free lists</a><a href="/about">About</a><a href="/faq">FAQ</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a></footer>`;
const head = (slug, title, desc) => `<!DOCTYPE html>
<html lang="en-AU">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)} | Koala Study Mate</title>
  <meta name="description" content="${esc(desc)}" />
  <link rel="canonical" href="${SITE}/${slug}" />
  <meta name="theme-color" content="#22c9a3" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Koala Study Mate" />
  <meta property="og:url" content="${SITE}/${slug}" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(desc)}" />
  <meta property="og:image" content="${SITE}/og-image.jpg" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="icon" href="/favicon.svg?v=4" type="image/svg+xml" />
  <link rel="icon" href="/favicon.ico?v=4" sizes="48x48" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=4" />
  <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;700&family=Jua&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/css/pages.css" />
  <link rel="stylesheet" href="/css/about.css" />
  <link rel="stylesheet" href="/css/learn.css" />`;
const headerHtml = `<header class="site"><a class="brand" href="/"><img src="/favicon.svg?v=4" alt="" width="34" height="34" /> Koala Study Mate</a><a class="open-app" href="/">Open the app</a></header>`;
const cta = (text) => `<p class="learn-cta"><a class="cta" href="/">${text}</a></p>`;
const generated = `  <!-- AUTO-GENERATED by scripts/gen-learn-pages.mjs. Do not edit by hand. -->`;

for (const p of PAGES) {
  const ld = JSON.stringify({ "@context": "https://schema.org", "@type": "LearningResource", name: p.h1, description: p.desc,
    url: `${SITE}/${p.slug}`, inLanguage: "en-AU", isAccessibleForFree: true, educationalLevel: "Years 4-6",
    provider: { "@type": "Organization", name: "Koala Study Mate", url: SITE } });
  writeFileSync(join(root, "public", `${p.slug}.html`), `${head(p.slug, p.title, p.desc)}
  <script type="application/ld+json">${ld}</script>
</head>
<body>
${generated}
  ${headerHtml}
  <main class="wrap learn">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="/learn">Free lists</a> › ${esc(p.name)}</nav>
    <h1>${esc(p.h1)}</h1>
    <p class="lead">${esc(p.intro)}</p>
    ${cta("Practise in the app")}
${p.body}
    ${cta("Practise these in the app")}
    <p class="more-lists">More free lists: ${PAGES.filter((q) => q.slug !== p.slug).map((q) => `<a href="/${q.slug}">${esc(q.name)}</a>`).join(" · ")}</p>
  </main>
  ${footer}
</body>
</html>
`);
}

writeFileSync(join(root, "public", "learn.html"), `${head("learn", "Free Word Lists and Times Tables Chart for Years 4–6", "Free spelling, vocabulary, homophone and synonym lists plus a times tables chart for Australian primary students in Years 4 to 6.")}
</head>
<body>
${generated}
  ${headerHtml}
  <main class="wrap learn">
    <h1>Free word lists and times tables</h1>
    <p class="lead">Read and practise the same words that are in Koala Study Mate. They are written for Australian primary students in Years 4 to 6.</p>
    <div class="hub">${hubItems}</div>
    ${cta("Start practising in the app")}
  </main>
  ${footer}
</body>
</html>
`);

const urls = [["", "weekly", "1.0"], ["learn", "monthly", "0.8"], ...PAGES.map((p) => [p.slug, "monthly", "0.7"]),
  ["about", "monthly", "0.8"], ["faq", "monthly", "0.8"], ["privacy", "yearly", "0.3"], ["terms", "yearly", "0.3"]];
writeFileSync(join(root, "public", "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([s, f, pr]) =>
    `  <url><loc>${SITE}/${s}</loc><changefreq>${f}</changefreq><priority>${pr}</priority></url>`).join("\n")}\n</urlset>\n`);
console.log(`Learn pages: ${PAGES.length + 1}, sitemap URLs: ${urls.length}`);
