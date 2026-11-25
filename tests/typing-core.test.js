// Typing page rules (public/js/typing-core.js) and the typing texts. Run: node --test tests/typing-core.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const T = require("../public/js/typing-core.js");

test("WPM and accuracy", () => {
  assert.equal(T.wpm(100, 60000), 20);
  assert.equal(T.wpm(50, 30000), 20);
  assert.equal(T.accuracy(100, 5), 95);
  assert.equal(T.accuracy(0, 0), 0);
  assert.ok(T.wpm(100000, 1000) <= T.MAX_WPM);
});

test("nicknames are stable, differ by child, and carry no account data", () => {
  assert.equal(T.nickname("abc", 0), T.nickname("abc", 0));
  assert.notEqual(T.nickname("abc", 0), T.nickname("abc", 1));
  assert.match(T.nickname("user@example.com", 0), /^[A-Z][a-z]+ [A-Z][a-z]+ \d{2}$/);
});

test("every lesson builds, drills only use keys taught so far (plus space / capitals in lesson 19+)", () => {
  const pool = ["sad", "lad", "fall", "jar", "kite", "tree", "zoo", "box", "quiz", "map", "cave", "bun", "net"];
  assert.equal(T.LESSONS.length, 20);
  T.LESSONS.forEach((L) => {
    const steps = T.buildLesson(L.n, pool, 7);
    assert.ok(steps.length >= 5, `lesson ${L.n} has steps`);
    const known = T.lessonKnownKeys(L.n);
    steps.filter((s) => s.type === "drill").forEach((s) => {
      for (const c of s.text) {
        if (c === " ") continue;
        if (L.n >= 19) continue;
        assert.ok(known.includes(c), `lesson ${L.n}: "${c}" in "${s.text}" not taught yet`);
      }
    });
  });
  assert.equal(T.fingerOf("f"), "li"); assert.equal(T.fingerOf("J"), "ri"); assert.equal(T.fingerOf(" "), "th");
});

test("weekly typing summary", () => {
  const now = Date.UTC(2026, 10, 25);
  const day = 86400000;
  const log = [{ t: now - day, k: "s", w: 20, a: 95 }, { t: now - 2 * day, k: "p", w: 30, a: 97 }, { t: now - 9 * day, k: "s", w: 10, a: 90 }];
  const r = T.weekTyping(log, now, 7);
  assert.deepEqual(r, { n: 2, best: 30, avg: 25, acc: 96, prevAvg: 10 });
  assert.equal(T.weekTyping([], now, 7), null);
});

test("daily challenge pick is the same for everyone on the same day", () => {
  assert.deepEqual(T.dailyPick("2026-11-25", "elem_low"), T.dailyPick("2026-11-25", "elem_low"));
  assert.ok(T.TOPIC_IDS.includes(T.dailyPick("2026-11-25", "high").topic));
});

// Texts: one file per topic, every level has sentences and paragraphs, nothing repeated, no unsafe characters.
const dir = path.join(__dirname, "..", "public", "typing-texts");
test("typing texts: 15 topics x 4 levels", () => {
  assert.equal(T.TOPICS.length, 15);
  const seen = new Set();
  T.TOPIC_IDS.forEach((id) => {
    const file = path.join(dir, id + ".json");
    assert.ok(fs.existsSync(file), `missing ${id}.json`);
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    T.LEVELS.forEach((lv) => {
      const L = data[lv];
      assert.ok(L && Array.isArray(L.s) && Array.isArray(L.p), `${id} ${lv}`);
      assert.ok(L.s.length >= 20, `${id} ${lv}: at least 20 sentences (has ${L.s.length})`);
      assert.ok(L.p.length >= 6, `${id} ${lv}: at least 6 paragraphs (has ${L.p.length})`);
      [...L.s, ...L.p].forEach((x) => {
        assert.equal(typeof x, "string");
        assert.ok(!seen.has(x), `duplicate text in ${id} ${lv}: ${x.slice(0, 40)}`);
        seen.add(x);
        assert.ok(/^[A-Za-z0-9 .,'!?;:()\-]+$/.test(x), `${id} ${lv}: only plain keyboard characters: ${x}`);
        assert.ok(!/ {2}/.test(x) && x === x.trim(), `${id} ${lv}: spacing: ${x}`);
      });
    });
  });
});
