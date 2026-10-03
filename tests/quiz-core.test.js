// Run with: npm test   (node --test)
const test = require("node:test");
const assert = require("node:assert/strict");
const Q = require("../public/js/quiz-core.js");

const vocab = [
  { word: "vanish", definition: "To disappear suddenly. Things that vanish are gone.", example: "The magician made the coin vanish." },
  { word: "fragile", definition: "Easily broken or damaged.", example: "Please carry the fragile glass carefully." },
  { word: "enormous", definition: "Extremely large in size.", example: "A blue whale is an enormous animal." },
  { word: "habitat", definition: "The natural home of an animal or plant.", example: "The wetland is a habitat for many birds." },
  { word: "migrate", definition: "To move from one place to another. Birds migrate in autumn.", example: "Whales migrate along the coast each year." },
  { word: "drought", definition: "A long period of very little rain.", example: "" },
];
const ctx = { prompts: { synonym: (w) => `Same as ${w}?`, homophone: (w) => `Meaning of ${w}?` } };
const noShuffle = (a) => a.slice();

test("maskWord hides the word and its endings but not unrelated words", () => {
  assert.equal(Q.maskWord("Birds migrate in autumn.", "migrate").text, "Birds _____ in autumn.");
  assert.equal(Q.maskWord("They were migrating north.", "migrate").text, "They were _____ north.");
  assert.equal(Q.maskWord("She vanished and vanishes.", "vanish").text, "She _____ and _____.");
  assert.equal(Q.maskWord("Immigrate is different.", "migrate").found, false);
  assert.equal(Q.maskWord("nothing here", "vanish").found, false);
});

test("wrapWord marks the word as it appears in the sentence", () => {
  assert.equal(Q.wrapWord("Whales migrate and were migrating.", "migrate", "[", "]").text, "Whales [migrate] and were [migrating].");
  assert.equal(Q.wrapWord("Nothing here.", "migrate", "[", "]").found, false);
});

test("maskExactWord only matches the exact whole word", () => {
  assert.equal(Q.maskExactWord("The coin will vanish.", "vanish").text, "The coin will _____.");
  assert.equal(Q.maskExactWord("The coin vanished.", "vanish").found, false);
});

test("uniqueOptions never repeats the answer or itself", () => {
  const opts = Q.uniqueOptions("a", ["a", "A ", "b", "b", "c", "d", "e"], 4, noShuffle);
  assert.equal(opts.length, 4);
  assert.equal(new Set(opts.map(Q.norm)).size, 4);
  assert.ok(opts.includes("a"));
  assert.equal(Q.uniqueOptions("a", ["a", "b", "b"], 4, noShuffle), null);
});

test("vocabulary questions blank out the word inside the meaning", () => {
  const qs = Q.buildQuestions("vocabulary", { vocab }, ctx);
  const q = qs.find((x) => x.target === "migrate");
  assert.ok(!/migrate/i.test(q.prompt));
  assert.equal(q.answer, "migrate");
  assert.equal(q.options.length, 4);
  assert.equal(new Set(q.options).size, 4);
});

test("each category builds the right kind of question", () => {
  const byType = (c) => Q.buildQuestions(c, { vocab }, ctx);
  assert.equal(byType("meaning")[0].promptIsWord, true);
  assert.ok(byType("meaning").every((q) => q.options.includes(q.answer)));
  const fill = byType("fillblank");
  assert.ok(fill.length > 0 && fill.every((q) => q.prompt.includes("_____")));
  assert.ok(!fill.some((q) => q.target === "drought"), "no example sentence -> no fill-in-the-blank");
  assert.ok(byType("listening").every((q) => q.hearOnly && q.prompt === ""));
  const typing = byType("typing");
  assert.ok(typing.every((q) => q.kind === "typing" && q.options.length === 0));
});

test("a word is never asked twice in one round, in any category", () => {
  const dup = vocab.concat([{ word: "VANISH", definition: "dup", example: "dup vanish" }]);
  ["vocabulary", "meaning", "fillblank", "listening", "typing", "mixed"].forEach((c) => {
    const targets = Q.buildQuestions(c, { vocab: dup }, ctx).map((q) => q.target.toLowerCase());
    assert.equal(new Set(targets).size, targets.length, c);
  });
  const homophones = [
    { pair: ["their", "there"], defs: ["belonging to them", "in that place"] },
    { pair: ["there", "they're"], defs: ["in that place", "they are"] },
    { pair: ["to", "too"], defs: ["towards", "also"] },
  ];
  const hq = Q.buildQuestions("homophones", { homophones }, ctx).map((q) => q.target);
  assert.equal(new Set(hq).size, hq.length);
});

test("synonym and homophone options are distinct and contain the answer", () => {
  const synonyms = [
    { word: "happy", synonym: "joyful" }, { word: "big", synonym: "enormous" },
    { word: "huge", synonym: "enormous" }, { word: "fast", synonym: "quick" }, { word: "small", synonym: "tiny" },
  ];
  Q.buildQuestions("synonyms", { synonyms }, ctx).forEach((q) => {
    assert.equal(new Set(q.options).size, q.options.length);
    assert.ok(q.options.includes(q.answer));
  });
  assert.deepEqual(Q.buildQuestions("synonyms", { synonyms: synonyms.slice(0, 2) }, ctx), []);
});

test("too small a pool builds nothing instead of a broken question", () => {
  assert.deepEqual(Q.buildQuestions("vocabulary", { vocab: vocab.slice(0, 3) }, ctx), []);
  assert.deepEqual(Q.buildQuestions("mixed", { vocab: [] }, ctx), []);
});

test("mixed falls back when a word has no example sentence", () => {
  const qs = Q.buildQuestions("mixed", { vocab }, ctx);
  assert.equal(qs.length, vocab.length);
  assert.ok(qs.every((q) => q.type !== "fillblank" || q.prompt.includes("_____")));
});

test("retryQuestions keeps the same questions with re-mixed options", () => {
  const qs = Q.buildQuestions("vocabulary", { vocab }, ctx).slice(0, 2);
  const again = Q.retryQuestions(qs, (a) => a.slice().reverse());
  assert.equal(again.length, 2);
  assert.deepEqual(again[0].options, qs[0].options.slice().reverse());
  assert.equal(again[0].answer, qs[0].answer);
  const typing = Q.retryQuestions(Q.buildQuestions("typing", { vocab }, ctx).slice(0, 1));
  assert.deepEqual(typing[0].options, []);
});

test("50:50 removes exactly two wrong options and never the answer", () => {
  const q = { kind: "choice", answer: "b", options: ["a", "b", "c", "d"] };
  const out = Q.fiftyFiftyRemovals(q, [], noShuffle);
  assert.equal(out.length, 2);
  assert.ok(!out.includes(1));
  assert.deepEqual(Q.fiftyFiftyRemovals(q, out, noShuffle), []); // only one wrong left: nothing more to remove
  assert.deepEqual(Q.fiftyFiftyRemovals({ kind: "typing", answer: "x", options: [] }, []), []);
});

test("letterPattern shows only the first letter", () => {
  assert.equal(Q.letterPattern("Koala"), "k _ _ _ _");
  assert.equal(Q.letterPattern("ice cream"), "i _ _   _ _ _ _ _");
  assert.equal(Q.letterPattern("well-known"), "w _ _ _ - _ _ _ _ _");
});

test("leaves are earned back every fifth correct answer in a row, up to the cap", () => {
  assert.equal(Q.leavesAfterCombo(1, 4), 1);
  assert.equal(Q.leavesAfterCombo(1, 5), 2);
  assert.equal(Q.leavesAfterCombo(Q.LEAVES_MAX, 10), Q.LEAVES_MAX);
  assert.equal(Q.leavesAfterCombo(0, 0), 0);
});

test("typed answers ignore case, spaces and punctuation; near misses are flagged", () => {
  assert.deepEqual(Q.checkTyped("  Vanish. ", "vanish"), { correct: true, close: false, empty: false });
  assert.equal(Q.checkTyped("vanich", "vanish").close, true);
  assert.equal(Q.checkTyped("vanich", "vanish").correct, false);
  assert.equal(Q.checkTyped("cat", "cut").close, false); // too short to call "almost"
  assert.equal(Q.checkTyped("", "vanish").empty, true);
  assert.equal(Q.checkTyped("ice  cream", "ice cream").correct, true);
});

test("time attack gives typing more time and the bar never leaves 0..1", () => {
  assert.ok(Q.timeLimitMs({ kind: "typing" }) > Q.timeLimitMs({ kind: "choice" }));
  assert.equal(Q.timeLeftFraction(0, 15000), 1);
  assert.equal(Q.timeLeftFraction(7500, 15000), 0.5);
  assert.equal(Q.timeLeftFraction(99999, 15000), 0);
  assert.equal(Q.timeLeftFraction(5, 0), 0);
});

test("daily goal and result summary", () => {
  assert.deepEqual(Q.dailyGoalState(5), { have: 5, goal: 20, pct: 25, done: false });
  assert.equal(Q.dailyGoalState(35).done, true);
  assert.equal(Q.dailyGoalState(35).have, 20);
  assert.deepEqual(Q.summarize(10, 10), { pct: 100, stars: 3, mood: "great" });
  assert.equal(Q.summarize(7, 10).stars, 2);
  assert.equal(Q.summarize(2, 10).stars, 1);
  assert.equal(Q.summarize(0, 0).stars, 0);
  assert.equal(Q.formatSeconds(45000), "45s");
  assert.equal(Q.formatSeconds(125000), "2:05");
});
