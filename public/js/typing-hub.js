// Typing page (2026-11-25): hub with six tiles (Today's challenge · Letters · Words · Sentences · Paragraphs · Records).
// Words = the falling-words game in app.js (unchanged, started straight from its tile). Everything else lives here.
// Rules shared with the worker (WPM, nicknames, lessons) are in js/typing-core.js; texts in /typing-texts/<topic>.json.
// Uses app.js globals: currentLang, currentLevel, progress, t, escapeHtml, speak, levelLabel, currentUser, ...
(function () {
  "use strict";
  const TC = window.TypingCore;
  if (!TC) return;
  const $ = (id) => document.getElementById(id);
  const ko = () => currentLang === "ko";
  const L = (en, k) => (ko() ? k : en);
  const esc = (s) => escapeHtml(String(s == null ? "" : s));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
  };
  const K_TOPIC = "ywp_tp_topic_v1", K_SHOW = "ywp_tp_show_v1", K_SEEN = "ywp_tp_seen_v1", K_BEST = "ywp_tp_best_v1", K_LESSON = "ywp_tp_lessons_v1", K_DAILY = "ywp_tp_daily_v1";
  const REPEAT_DAYS = 30;
  const dayNum = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);
  const hub = $("tp-hub");
  const panels = { letters: $("tp-panel-letters"), run: $("tp-panel-run"), records: $("tp-panel-records"), words: $("tp-panel-words") };
  let view = "hub";

  const isTouch = () => {
    try { return matchMedia("(pointer: coarse)").matches && !matchMedia("(any-pointer: fine)").matches; } catch (e) { return false; }
  };
  const inputKind = () => (isTouch() ? "touch" : "kb");
  const slot = () => { try { return typeof activeProfileNum === "function" ? activeProfileNum() : 0; } catch (e) { return 0; } };
  const signedIn = () => { try { return !!currentUser; } catch (e) { return false; } };
  const topicOf = (id) => TC.TOPICS.find((x) => x.id === id);
  const topicName = (id) => { const x = topicOf(id); return x ? `${x.ico} ${L(x.en, x.ko)}` : L("🎲 All topics", "🎲 모든 주제"); };
  const fmtTime = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
  const fmtWpm = (n) => (Math.round(n * 10) / 10).toFixed(n >= 100 ? 0 : 1).replace(/\.0$/, "");

  /* ---------- Settings: topic grid + Sentences show/listen ---------- */
  let topic = store.get(K_TOPIC, "all");
  if (topic !== "all" && !topicOf(topic)) topic = "all";
  let showMode = store.get(K_SHOW, "read") === "listen" ? "listen" : "read";
  let topicOpen = false;
  function renderTopicGrid() {
    const box = $("tp-topic-box");
    if (!box) return;
    const list = [{ id: "all", ico: "🎲", en: "All topics", ko: "모든 주제" }].concat(TC.TOPICS);
    const wide = window.innerWidth >= 700;
    const SHOWN = 8;
    const idx = list.findIndex((x) => x.id === topic);
    const shown = topicOpen || wide ? list : list.slice(0, SHOWN).concat(idx >= SHOWN ? [list[idx]] : []);
    const cur = list[Math.max(0, idx)];
    box.innerHTML = `<div class="town-grid tp-topic-grid" role="radiogroup" aria-label="${esc(L("Topic", "주제"))}">${shown.map((x) =>
      `<button type="button" class="qz-seg-btn town-cell${x.id === topic ? " on" : ""}" role="radio" aria-checked="${x.id === topic}" data-topic="${x.id}" data-now="${esc(x.id === topic ? L(x.en, x.ko) : "")}"><span class="town-ico" aria-hidden="true">${x.ico}</span><span class="town-name">${esc(L(x.en, x.ko))}</span></button>`).join("")}</div>`
      + `<p class="town-foot">${wide ? "<span></span>" : `<button type="button" class="town-more" data-topic-more>${esc(topicOpen ? L("Show fewer ▴", "접기 ▴") : L(`+ ${list.length - SHOWN} more topics ▾`, `+ ${list.length - SHOWN}개 더 보기 ▾`))}</button>`}<span class="town-count">${esc(L("For Sentences, Paragraphs", "문장·문단에 적용"))} · ${cur.ico} ${esc(L(cur.en, cur.ko))}</span></p>`;
  }
  function renderShowSeg() {
    const seg = $("tp-show-seg");
    if (!seg) return;
    const lab = { read: L("👀 Read and type", "👀 보고 치기"), listen: L("🎧 Listen and type", "🎧 듣고 치기") };
    seg.querySelectorAll("[data-show]").forEach((b) => {
      const on = b.dataset.show === showMode;
      b.textContent = lab[b.dataset.show];
      b.classList.toggle("on", on);
      b.setAttribute("aria-checked", on ? "true" : "false");
      b.dataset.now = on && showMode === "listen" ? L("Listen", "듣고 치기") : "";
    });
  }
  document.addEventListener("click", (e) => {
    const tb = e.target.closest && e.target.closest("#tp-topic-box [data-topic]");
    if (tb) { topic = tb.dataset.topic; store.set(K_TOPIC, topic); renderTopicGrid(); renderHubDescs(); return; }
    if (e.target.closest && e.target.closest("#tp-topic-box [data-topic-more]")) { topicOpen = !topicOpen; renderTopicGrid(); return; }
    const sb = e.target.closest && e.target.closest("#tp-show-seg [data-show]");
    if (sb) { showMode = sb.dataset.show; store.set(K_SHOW, showMode); renderShowSeg(); }
  });
  window.addEventListener("resize", () => { if (view === "hub") renderTopicGrid(); });

  /* ---------- Hub ---------- */
  function bests() { return store.get(K_BEST, {}); }
  function saveBest(kind, level, v) {
    const b = bests();
    const k = `${kind}|${level}`;
    if (!(b[k] >= v)) { b[k] = v; store.set(K_BEST, b); return true; }
    return false;
  }
  function lessonsDone() { const p = (typeof progress === "object" && progress && progress.typingLessons) || {}; return Object.assign({}, store.get(K_LESSON, {}), p); }
  function renderHubDescs() {
    const b = bests(), lv = currentLevel;
    const set = (id, text) => { const el = $(id); if (el && text) el.textContent = text; };
    const done = Object.keys(lessonsDone()).length;
    set("tp-desc-letters", done ? L(`Lesson ${Math.min(20, done + 1)} of 20`, `레슨 ${Math.min(20, done + 1)} / 20`) : L("Learn where your fingers go", "손가락 자리 익히기"));
    set("tp-desc-sentence", b[`sentence|${lv}`] ? L(`Best ${fmtWpm(b[`sentence|${lv}`])} WPM`, `최고 ${fmtWpm(b[`sentence|${lv}`])} WPM`) : L("Type a sentence · WPM", "한 문장 · WPM"));
    set("tp-desc-paragraph", b[`paragraph|${lv}`] ? L(`Best ${fmtWpm(b[`paragraph|${lv}`])} WPM`, `최고 ${fmtWpm(b[`paragraph|${lv}`])} WPM`) : L("Type a paragraph · WPM", "한 문단 · WPM"));
    let wb = 0;
    try { wb = Math.max(0, ...Object.keys(typeGameHighScores || {}).filter((k) => k.includes(lv)).map((k) => typeGameHighScores[k] || 0)); } catch (e) { wb = 0; }
    set("tp-desc-words", wb ? L(`Best ${wb.toLocaleString()}`, `최고 ${wb.toLocaleString()}점`) : L("Pop the falling words", "떨어지는 단어 맞히기"));
    const d = store.get(K_DAILY, {});
    set("tp-desc-daily", d.day === TC.sydneyDay() && d.best ? L(`Done ✓ · ${fmtWpm(d.best)} WPM`, `완료 ✓ · ${fmtWpm(d.best)} WPM`) : L("One sentence for everyone", "모두 같은 문장 하나"));
    const lvEl = $("tp-hub-level");
    if (lvEl) lvEl.textContent = levelLabel(lv);
  }
  function hubMsg(text) {
    const el = $("tp-hub-msg");
    if (!el) return;
    el.textContent = text || "";
    el.hidden = !text;
  }
  function show(next) {
    view = next;
    hub.hidden = next !== "hub";
    Object.keys(panels).forEach((k) => { if (panels[k]) panels[k].hidden = k !== next; });
    const wb = $("tp-words-back");
    if (wb) wb.hidden = next !== "words";
    if (next !== "letters") lesson.stop();
    if (next !== "run") run.stop();
    if (next === "hub") { renderTopicGrid(); renderShowSeg(); renderHubDescs(); }
    try { window.scrollTo({ top: 0, behavior: "instant" }); } catch (e) { window.scrollTo(0, 0); }
  }
  function backToHub() {
    try { if (typeof typeGameRunning !== "undefined" && typeGameRunning) endTypeGame(); } catch (e) { /* not running */ }
    try { typeGameOverOverlay.hidden = true; } catch (e) { /* ignore */ }
    hubMsg("");
    show("hub");
  }
  document.addEventListener("click", (e) => {
    if (e.target.closest && e.target.closest("[data-tp-back]")) backToHub();
  });

  // First time with no level chosen: the same "Choose your level" step as Quiz / Spelling, then the tile again.
  function needsLevel(btn) {
    try {
      if (savedLevels[currentLang] || levelAskSkipped) return false;
      levelPendingStart = btn;
      renderLevelChoices();
      levelOverlay.hidden = false;
      return true;
    } catch (e) { return false; }
  }
  $("tp-tiles")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-tp]");
    if (!btn) return;
    const kind = btn.dataset.tp;
    hubMsg("");
    if (["words", "sentence", "paragraph", "daily"].includes(kind) && needsLevel(btn)) return;
    if (kind === "words") return openWords();
    if (kind === "letters") return lesson.openList();
    if (kind === "records") return records.open();
    run.open(kind);
  });

  function openWords() {
    try {
      resetTypeGame();
      if (typeGameStartBtn.disabled) { hubMsg(typeGameStartMessage.textContent); return; }
      if (dailyRoundsBlocked("type")) { promptDailyRound(); return; }
      show("words");
      startTypeGame();
    } catch (e) { console.warn("words game", e); }
  }
  // Game over card: a way back to the tiles next to Play Again.
  (function addOverBack() {
    const actions = document.querySelector("#typegame-over-overlay .tg-over-actions");
    if (!actions || actions.querySelector("[data-tp-back]")) return;
    const b = document.createElement("button");
    b.type = "button";
    b.className = "pill neutral tp-over-back";
    b.setAttribute("data-tp-back", "");
    b.innerHTML = `<span aria-hidden="true">←</span> <span data-i18n="tpBack">${esc(t("tpBack"))}</span>`;
    actions.appendChild(b);
  })();

  /* ---------- Server: scores and board ---------- */
  async function postScore(body) {
    if (!signedIn()) return null;
    try {
      const r = await fetch("/api/typing/score", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.assign({ input: inputKind(), slot: slot() }, body)) });
      return r.ok ? await r.json() : null;
    } catch (e) { return null; }
  }
  function submitWordsScore(score) {
    postScore({ kind: "words", level: currentLevel, score: Math.floor(score) });
  }

  /* ---------- Texts ---------- */
  const textCache = {};
  function loadTopic(id) {
    if (!textCache[id]) {
      textCache[id] = fetch(`/typing-texts/${id}.json`, { credentials: "same-origin" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)
        .then((d) => { if (!d) delete textCache[id]; return d; });
    }
    return textCache[id];
  }
  function seenMap() {
    const m = store.get(K_SEEN, {});
    const cut = dayNum() - REPEAT_DAYS;
    let changed = false;
    Object.keys(m).forEach((k) => { if (m[k] < cut) { delete m[k]; changed = true; } });
    if (changed) store.set(K_SEEN, m);
    return m;
  }
  function markSeen(key) { const m = seenMap(); m[key] = dayNum(); store.set(K_SEEN, m); }
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  // Picks a text not typed in the last 30 days (never the same day); if the whole topic has been used it takes
  // the one seen longest ago, but still not one from today.
  async function pickText(kind, level) {
    const k = kind === "paragraph" ? "p" : "s";
    const topics = topic === "all" ? shuffle(TC.TOPIC_IDS.slice()) : [topic];
    const seen = seenMap();
    let oldest = null;
    for (const id of topics.slice(0, topic === "all" ? 4 : 1)) {
      const data = await loadTopic(id);
      const list = data && data[level] && data[level][k];
      if (!list || !list.length) continue;
      const order = shuffle(list.map((_, i) => i));
      for (const i of order) {
        const key = `${id}|${level}|${k}|${i}`;
        if (!(key in seen)) return { topic: id, key, text: list[i] };
        if (seen[key] < dayNum() && (!oldest || seen[key] < oldest.day)) oldest = { topic: id, key, text: list[i], day: seen[key] };
      }
    }
    return oldest;
  }
  async function dailyText(level) {
    const day = TC.sydneyDay();
    const p = TC.dailyPick(day, level);
    const data = await loadTopic(p.topic);
    const list = data && data[level] && data[level].s;
    if (!list || !list.length) return null;
    return { topic: p.topic, key: `daily|${day}|${level}`, text: list[p.index % list.length], day };
  }
  const normalise = (s) => s.replace(/[‘’ʼ]/g, "'").replace(/[“”]/g, '"').replace(/ /g, " ");

  /* ---------- Sentences / Paragraphs / Today's challenge ---------- */
  const STOP = new Set("about after again also because before being below between could does doing during every first other their there these those through under until where which while would should people little really".split(" "));
  const run = (() => {
    let st = null; // { kind, text, topic, key, typed, keys, miss, start, end, timer, listen, level }
    const panel = panels.run;

    function stop() {
      if (st && st.timer) clearInterval(st.timer);
      if (st && st.listen) { try { window.speechSynthesis && speechSynthesis.cancel(); } catch (e) { /* ignore */ } }
      st = null;
    }
    function kindLabel(kind) {
      return { sentence: L("💬 Sentences", "💬 문장"), paragraph: L("📖 Paragraphs", "📖 문단"), daily: L("🏅 Today's challenge", "🏅 오늘의 도전") }[kind];
    }
    async function open(kind) {
      if (dailyRoundsBlocked("type")) { promptDailyRound(); return; }
      const level = currentLevel;
      show("run");
      panel.innerHTML = `<div class="tp-back-row"><button type="button" class="tp-back" data-tp-back><span aria-hidden="true">←</span> ${esc(t("tpBack"))}</button></div><div class="card tp-run-card"><p class="tp-loading">${esc(L("Getting your text…", "글을 준비하고 있어요…"))}</p></div>`;
      const item = kind === "daily" ? await dailyText(level) : await pickText(kind, level);
      if (view !== "run") return;
      if (!item) {
        panel.querySelector(".tp-run-card").innerHTML = `<p class="tp-loading">${esc(L("Couldn't load the texts. Check your internet and try again.", "글을 불러오지 못했어요. 인터넷 연결을 확인하고 다시 해 보세요."))}</p>`;
        return;
      }
      const text = normalise(item.text);
      st = { kind, level, text, topic: item.topic, key: item.key, typed: "", keys: 0, miss: 0, start: 0, end: 0, timer: null, quota: false,
        listen: kind === "sentence" && showMode === "listen" };
      draw();
      if (st.listen) setTimeout(() => say(), 350);
    }
    function say() { if (st) speak(st.text); }
    function draw() {
      const meta = [kindLabel(st.kind), topicName(st.topic), levelLabel(st.level)].map(esc).join(" · ");
      const touch = isTouch();
      panel.innerHTML = `<div class="tp-back-row"><button type="button" class="tp-back" data-tp-back><span aria-hidden="true">←</span> ${esc(t("tpBack"))}</button><span class="tp-run-meta">${meta}</span></div>
        <div class="card tp-run-card">
          <div class="tp-stats" aria-live="off"><div><b id="tp-wpm">0</b><span>WPM</span></div><div><b id="tp-acc">100%</b><span>${esc(L("Accuracy", "정확도"))}</span></div><div><b id="tp-time">0:00</b><span>${esc(L("Time", "시간"))}</span></div><div class="tp-prog-box"><b id="tp-prog">0%</b><span>${esc(L("Done", "진행"))}</span></div></div>
          ${st.listen ? `<div class="tp-listen-row"><button type="button" class="pill accent small" id="tp-say">🔊 ${esc(L("Listen again", "다시 듣기"))}</button><span>${esc(L("Type what you hear. Capitals and full stops count!", "들리는 대로 쳐요. 대문자와 마침표도 쳐야 해요!"))}</span></div>` : ""}
          <div class="tp-text-wrap" id="tp-text-wrap">
            <div class="tp-text${st.kind === "paragraph" ? " is-para" : ""}${st.listen ? " is-listen" : ""}" id="tp-text" aria-hidden="true"></div>
            <textarea id="tp-input" class="tp-input" rows="1" spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="${touch ? "sentences" : "off"}" aria-label="${esc(L("Type the text here", "여기에 글을 입력하세요"))}"></textarea>
          </div>
          <p class="tp-sr" id="tp-sr-text">${esc(st.listen ? "" : st.text)}</p>
          <p class="hint tp-hint">${esc(touch ? L("Tap the text to bring up the keyboard. The clock starts with your first letter.", "글을 누르면 키보드가 나와요. 첫 글자를 치면 시계가 시작돼요.") : L("Just start typing. The clock starts with your first key. Backspace fixes mistakes.", "바로 치기 시작하세요. 첫 키를 누르면 시계가 시작돼요. 틀리면 백스페이스로 고쳐요."))}</p>
        </div>`;
      paintText();
      const inp = $("tp-input");
      inp.addEventListener("input", onInput);
      inp.addEventListener("paste", (e) => e.preventDefault());
      inp.addEventListener("drop", (e) => e.preventDefault());
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") e.preventDefault(); });
      $("tp-text-wrap").addEventListener("click", () => inp.focus());
      $("tp-say")?.addEventListener("click", () => { say(); inp.focus(); });
      if (!touch) setTimeout(() => inp.focus(), 30);
    }
    function paintText() {
      const box = $("tp-text");
      if (!box || !st) return;
      const typed = st.typed, txt = st.text;
      let html = "";
      // Words are wrapped so a line never breaks in the middle of a word.
      let i = 0;
      const parts = txt.split(/( )/);
      parts.forEach((part) => {
        let w = "";
        for (const ch of part) {
          let cls = "todo";
          if (i < typed.length) cls = typed[i] === ch ? "ok" : "bad";
          if (i === typed.length) cls += " cur";
          let shown = ch === " " ? "&nbsp;" : esc(ch);
          if (st.listen && i >= typed.length && ch !== " ") shown = "•";
          if (st.listen && i < typed.length && typed[i] !== ch && ch !== " ") shown = esc(ch);
          w += `<span class="tp-ch ${cls}">${shown}</span>`;
          i++;
        }
        html += part === " " ? w : `<span class="tp-word">${w}</span>`;
      });
      box.innerHTML = html;
      const cur = box.querySelector(".cur");
      if (cur && st.kind === "paragraph") {
        const wrap = $("tp-text-wrap");
        const top = cur.offsetTop - wrap.clientHeight / 2;
        if (Math.abs(wrap.scrollTop - top) > 30) wrap.scrollTop = Math.max(0, top);
      }
    }
    function onInput(e) {
      if (!st || st.end) return;
      const inp = e.target;
      let v = normalise(inp.value).replace(/\n/g, "");
      if (v.length > st.text.length) v = v.slice(0, st.text.length);
      if (v !== inp.value) inp.value = v;
      if (!st.start && v.length) {
        st.start = Date.now();
        st.timer = setInterval(tick, 250);
        if (!st.quota) { st.quota = true; dailyQuotaAdd("type", 1); }
      }
      // New characters: each one is a keystroke; a wrong one is a mistake (fixing it later doesn't undo the mistake).
      if (v.length > st.typed.length) {
        for (let i = st.typed.length; i < v.length; i++) { st.keys++; if (v[i] !== st.text[i]) st.miss++; }
      }
      st.typed = v;
      paintText();
      tick();
      if (v.length === st.text.length) finish();
    }
    function correctChars() { let c = 0; for (let i = 0; i < st.typed.length; i++) if (st.typed[i] === st.text[i]) c++; return c; }
    function tick() {
      if (!st) return;
      const ms = (st.end || Date.now()) - (st.start || Date.now());
      const w = st.start ? TC.wpm(correctChars(), Math.max(ms, 1000)) : 0;
      const a = st.keys ? TC.accuracy(st.keys, st.miss) : 100;
      const set = (id, v) => { const el = $(id); if (el) el.textContent = v; };
      set("tp-wpm", fmtWpm(w)); set("tp-acc", a + "%"); set("tp-time", fmtTime(ms));
      set("tp-prog", Math.round((st.typed.length / st.text.length) * 100) + "%");
    }
    async function finish() {
      st.end = Date.now();
      clearInterval(st.timer);
      const s = st;
      const ms = s.end - s.start;
      const chars = correctChars();
      const wpm = TC.wpm(chars, ms);
      const acc = TC.accuracy(s.keys, s.miss);
      markSeen(s.key);
      const coinOk = acc >= TC.MIN_COIN_ACC;
      let units = TC.COIN_UNITS[s.kind] || 0;
      const today = TC.sydneyDay();
      const dailyRec = store.get(K_DAILY, {});
      if (s.kind === "daily" && dailyRec.day === today) units = 0; // the challenge pays once a day
      try { recordTypingText(units || 0, coinOk && units > 0, { t: Date.now(), k: s.kind === "paragraph" ? "p" : s.kind === "daily" ? "d" : "s", w: wpm, a: acc }); } catch (e) { /* not signed in */ }
      const newBest = acc >= TC.MIN_RANK_ACC && saveBest(s.kind, s.level, wpm);
      if (s.kind === "daily") store.set(K_DAILY, { day: today, best: Math.max(dailyRec.day === today ? dailyRec.best || 0 : 0, acc >= TC.MIN_RANK_ACC ? wpm : 0) });
      const ranked = signedIn() && acc >= TC.MIN_RANK_ACC;
      result(s, { wpm, acc, ms, newBest, server: ranked ? "pending" : null });
      if (!ranked) return;
      const srv = await postScore({ kind: s.kind, level: s.level, chars, ms, keystrokes: s.keys, mistakes: s.miss });
      if (st === s) result(s, { wpm, acc, ms, newBest, server: srv || "failed" });
    }
    function hardWords(s) {
      const pool = new Set();
      try { getVocabPool(s.level).forEach((w) => pool.add(String(w.word).toLowerCase())); } catch (e) { /* no pool */ }
      const out = [];
      (s.text.match(/[A-Za-z']+/g) || []).forEach((raw) => {
        const w = raw.toLowerCase().replace(/'s$/, "").replace(/'/g, "");
        if (w.length < 6 || STOP.has(w) || out.includes(w) || /^[A-Z]/.test(raw)) return;
        out.push(w);
      });
      out.sort((a, b) => (pool.has(b) ? 1 : 0) - (pool.has(a) ? 1 : 0) || b.length - a.length);
      return out.slice(0, 3);
    }
    function stars(acc) { return acc >= 98 ? 3 : acc >= 93 ? 2 : acc >= TC.MIN_COIN_ACC ? 1 : 0; }
    function result(s, r) {
      const card = panel.querySelector(".tp-run-card");
      if (!card) return;
      const n = stars(r.acc);
      const srv = r.server;
      let rankLine = "";
      if (!signedIn()) rankLine = L("Sign in to put your speed on the leaderboard.", "로그인하면 순위표에 기록이 올라가요.");
      else if (r.acc < TC.MIN_RANK_ACC) rankLine = L(`Accuracy under ${TC.MIN_RANK_ACC}% doesn't go on the leaderboard. Slow down a little and aim for every letter!`, `정확도가 ${TC.MIN_RANK_ACC}% 미만이면 순위에 오르지 않아요. 조금 천천히, 한 글자씩 정확하게!`);
      else if (srv && srv.ranked) rankLine = L(`You're #${srv.rank} as ${srv.name} (best ${fmtWpm(srv.best / 10)} WPM).`, `${srv.name} 이름으로 ${srv.rank}위예요 (최고 ${fmtWpm(srv.best / 10)} WPM).`);
      else if (srv === "pending") rankLine = L("Saving your result…", "기록을 저장하고 있어요…");
      else if (srv) rankLine = L("This result couldn't go on the leaderboard this time.", "이번 기록은 순위표에 올리지 못했어요.");
      const words = hardWords(s);
      const wordsHtml = words.length ? `<div class="tp-newwords"><h4>${esc(L("Words from this text", "이 글의 단어"))}</h4><div class="tp-newwords-list">${words.map((w) => {
        let def = "";
        try { const info = findWordInfo(w); def = info && info.definition ? info.definition : ""; } catch (e) { def = ""; }
        return `<label class="tp-nw"><input type="checkbox" value="${esc(w)}" checked><span><b>${esc(w)}</b>${def ? `<small>${esc(def)}</small>` : ""}</span><button type="button" class="tp-nw-say" data-say="${esc(w)}" aria-label="${esc(L("Hear", "듣기"))} ${esc(w)}">🔊</button></label>`;
      }).join("")}</div><button type="button" class="pill small tp-nw-add" id="tp-nw-add">${canUsePaidFeatures() ? "" : "🔒 "}${esc(L("Add to My words", "내 단어에 추가"))}</button><p class="tp-nw-msg" id="tp-nw-msg" hidden></p></div>` : "";
      card.innerHTML = `<div class="tp-result">
          <div class="tp-stars" role="img" aria-label="${n}/3">${[1, 2, 3].map((k) => `<span class="${k <= n ? "on" : ""}">★</span>`).join("")}</div>
          <h3>${r.newBest ? esc(L("🎉 New best!", "🎉 최고 기록!")) : esc(L("Well done!", "잘했어요!"))}</h3>
          <div class="tp-stats tp-stats-big"><div><b>${fmtWpm(r.wpm)}</b><span>WPM</span></div><div><b>${r.acc}%</b><span>${esc(L("Accuracy", "정확도"))}</span></div><div><b>${fmtTime(r.ms)}</b><span>${esc(L("Time", "시간"))}</span></div></div>
          ${rankLine ? `<p class="tp-rank-line">${esc(rankLine)}</p>` : ""}
          <p class="tp-done-text">${esc(s.text)}</p>
          ${wordsHtml}
          <div class="tp-result-btns">
            ${s.kind === "daily" ? `<button type="button" class="pill accent" data-tp-again>${esc(L("Try again", "다시 도전"))}</button>` : `<button type="button" class="pill accent" data-tp-again>${esc(L("Next", "다음"))} →</button>`}
            <button type="button" class="pill neutral" data-tp-records="${s.kind}">🏆 ${esc(L("Records", "기록"))}</button>
          </div>
        </div>`;
      card.querySelector("[data-tp-again]").addEventListener("click", () => open(s.kind));
      card.querySelector("[data-tp-records]").addEventListener("click", () => records.open(s.kind));
      card.querySelectorAll("[data-say]").forEach((b) => b.addEventListener("click", (e) => { e.preventDefault(); speak(b.dataset.say); }));
      const add = $("tp-nw-add");
      if (add) add.addEventListener("click", async () => {
        const picked = [...card.querySelectorAll(".tp-nw input:checked")].map((x) => x.value);
        const msg = $("tp-nw-msg");
        if (!canUsePaidFeatures()) { promptUpgradeForFeature(); return; }
        if (!picked.length) return;
        add.disabled = true;
        const n2 = await addTypingWordsToMine(picked);
        msg.hidden = false;
        msg.textContent = n2 ? L(`Added ${n2} word${n2 > 1 ? "s" : ""} to My words.`, `내 단어에 ${n2}개 추가했어요.`) : L("These words are already in your list.", "이미 내 단어에 있어요.");
      });
    }
    return { open, stop };
  })();

  /* ---------- Letters: 20 lessons ---------- */
  const FINGER_ORDER = ["lp", "lr", "lm", "li", "th", "ri", "rm", "rr", "rp"];
  const KB_ROWS = [["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"], ["a", "s", "d", "f", "g", "h", "j", "k", "l", ";"], ["z", "x", "c", "v", "b", "n", "m", ",", ".", "/"]];
  const lesson = (() => {
    const panel = panels.letters;
    let st = null; // { n, steps, si, pos, keys, miss }
    let keyHandler = null;
    function stop() {
      if (keyHandler) document.removeEventListener("keydown", keyHandler, true);
      keyHandler = null;
      st = null;
    }
    function openList() {
      show("letters");
      const done = lessonsDone();
      const next = Math.min(20, Object.keys(done).length + 1);
      const touchNote = isTouch() ? `<p class="tp-note">⌨️ ${esc(L("Letters is made for a real keyboard. On a phone or tablet you can still try it with the screen keyboard, but finger places won't match.", "알파벳 연습은 실제 키보드용이에요. 휴대폰·태블릿에서도 화면 키보드로 해 볼 수 있지만 손가락 자리는 맞지 않아요."))}</p>` : "";
      const groups = [[1, 6, L("Home row", "가운데 줄")], [7, 12, L("Top row", "윗줄")], [13, 18, L("Bottom row", "아랫줄")], [19, 20, L("Capitals & review", "대문자·복습")]];
      panel.innerHTML = `<div class="tp-back-row"><button type="button" class="tp-back" data-tp-back><span aria-hidden="true">←</span> ${esc(t("tpBack"))}</button></div>
        <div class="card tp-lessons-card">
          <h3 class="tp-panel-title">🔤 ${esc(L("Letters: 20 lessons", "알파벳: 레슨 20개"))}</h3>
          <p class="tp-lead">${esc(L("Rest your pointer fingers on F and J (feel the little bumps). Each lesson adds new keys.", "검지를 F와 J 위에 올려요(작은 돌기가 있어요). 레슨마다 새 키를 배워요."))}</p>
          ${touchNote}
          ${groups.map(([a, b, name]) => `<h4 class="tp-lesson-group">${esc(name)}</h4><div class="tp-lesson-grid">${TC.LESSONS.filter((l) => l.n >= a && l.n <= b).map((l) => {
            const d = done[l.n];
            const label = l.keys ? l.keys.split("").map((k) => k.toUpperCase()).join(" ") : l.shift ? "Shift" : L("Review", "복습");
            return `<button type="button" class="tp-lesson${d ? " done" : ""}${l.n === next ? " next" : ""}" data-lesson="${l.n}"><span class="tp-lesson-n">${l.n}</span><span class="tp-lesson-k">${esc(label)}</span><span class="tp-lesson-s" aria-label="${d ? d.s : 0}/3">${[1, 2, 3].map((k) => `<i class="${d && k <= d.s ? "on" : ""}">★</i>`).join("")}</span></button>`;
          }).join("")}</div>`).join("")}
        </div>`;
      panel.querySelectorAll("[data-lesson]").forEach((b) => b.addEventListener("click", () => start(Number(b.dataset.lesson))));
    }
    function wordPool() {
      const out = [];
      try { ["elem_low", "elem_high"].forEach((lv) => getVocabPool(lv).forEach((w) => out.push(w.word))); } catch (e) { /* none */ }
      return out;
    }
    function start(n) {
      stop();
      const steps = TC.buildLesson(n, wordPool(), Date.now());
      st = { n, steps, si: 0, pos: 0, keys: 0, miss: 0 };
      panel.innerHTML = `<div class="tp-back-row"><button type="button" class="tp-back" data-tp-letters-list><span aria-hidden="true">←</span> ${esc(L("Lessons", "레슨"))}</button><span class="tp-run-meta">🔤 ${esc(L(`Lesson ${n}`, `레슨 ${n}`))}</span></div>
        <div class="card tp-lesson-card">
          <div class="tp-lesson-bar"><i id="tp-lbar"></i></div>
          <div class="tp-lesson-stage" id="tp-lstage"></div>
          <div class="tp-kb" id="tp-kb" aria-hidden="true"></div>
          <div class="tp-hands" id="tp-hands" aria-hidden="true"></div>
          <input class="tp-key-input" id="tp-key-input" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="${esc(L("Type here", "여기에 입력"))}">
        </div>`;
      panel.querySelector("[data-tp-letters-list]").addEventListener("click", openList);
      drawKb();
      drawHands();
      const ki = $("tp-key-input");
      panel.querySelector(".tp-lesson-card").addEventListener("click", () => { if (isTouch()) ki.focus(); });
      ki.addEventListener("input", () => { const v = ki.value; ki.value = ""; for (const ch of v) press(ch); });
      keyHandler = (e) => {
        if (view !== "letters" || !st) return;
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.target && e.target.id === "tp-key-input" && isTouch()) return; // handled by input
        if (e.key === "Enter" && stepNow() && stepNow().type === "intro") { e.preventDefault(); return; }
        if (e.key.length === 1) { e.preventDefault(); press(e.key); }
      };
      document.addEventListener("keydown", keyHandler, true);
      drawStep();
    }
    const stepNow = () => st && st.steps[st.si];
    function target() {
      const s = stepNow();
      if (!s) return null;
      if (s.type === "intro") return s.key === "Shift" ? "F" : s.key;
      return s.text[st.pos];
    }
    function fingerName(f) { const n = TC.FINGER_NAMES[f]; return n ? L(n[0], n[1]) : ""; }
    function drawStep() {
      const s = stepNow();
      const box = $("tp-lstage");
      if (!box || !s) return;
      $("tp-lbar").style.width = Math.round((st.si / st.steps.length) * 100) + "%";
      if (s.type === "intro") {
        if (s.key === "Shift") {
          box.innerHTML = `<p class="tp-intro-tag">${esc(L("NEW KEY", "새 키"))}</p><p class="tp-intro">${L(`Hold <span class="tp-cap">Shift</span> with your <b>right little finger</b> and type <span class="tp-cap">F</span> for a capital letter.`, `<b>오른손 새끼손가락</b>으로 <span class="tp-cap">Shift</span>를 누른 채 <span class="tp-cap">F</span>를 치면 대문자가 돼요.`)}</p>`;
        } else {
          const f = TC.fingerOf(s.key);
          box.innerHTML = `<p class="tp-intro-tag">${esc(L("NEW KEY", "새 키"))}</p><p class="tp-intro">${L(`Type the <span class="tp-cap">${esc(s.key)}</span> key using your <b>${esc(fingerName(f))}</b>.`, `<b>${esc(fingerName(f))}</b>으로 <span class="tp-cap">${esc(s.key)}</span> 키를 쳐요.`)}</p>`;
        }
      } else {
        box.innerHTML = `<div class="tp-boxes">${[...s.text].map((ch, i) => `<span class="tp-box${ch === " " ? " sp" : ""}${i < st.pos ? " done" : ""}${i === st.pos ? " now" : ""}">${ch === " " ? "␣" : esc(ch)}</span>`).join("")}</div>`;
      }
      highlight();
    }
    function drawKb() {
      const kb = $("tp-kb");
      kb.innerHTML = KB_ROWS.map((row, r) => `<div class="tp-kb-row r${r}">${r === 2 ? `<span class="tp-k wide" data-k="shift">Shift</span>` : ""}${row.map((k) => `<span class="tp-k f-${TC.fingerOf(k)}" data-k="${esc(k)}">${esc(k)}</span>`).join("")}${r === 2 ? `<span class="tp-k wide" data-k="shift">Shift</span>` : ""}</div>`).join("")
        + `<div class="tp-kb-row r3"><span class="tp-k space f-th" data-k=" ">space</span></div>`;
    }
    function drawHands() {
      // Two koala paws: four fingers + thumb each; the finger to use lights up.
      const hand = (side, fs) => `<div class="tp-paw ${side}">${fs.map((f) => `<span class="tp-finger f-${f}" data-f="${f}"></span>`).join("")}<span class="tp-palm"></span></div>`;
      $("tp-hands").innerHTML = hand("left", ["lp", "lr", "lm", "li", "th"]) + hand("right", ["th", "ri", "rm", "rr", "rp"]);
    }
    function highlight() {
      const ch = target();
      document.querySelectorAll("#tp-kb .tp-k").forEach((el) => el.classList.remove("hot", "hot-shift"));
      document.querySelectorAll("#tp-hands .tp-finger").forEach((el) => el.classList.remove("hot"));
      if (ch == null) return;
      const low = ch.toLowerCase();
      const k = document.querySelector(`#tp-kb .tp-k[data-k="${CSS.escape(ch === " " ? " " : low)}"]`);
      if (k) k.classList.add("hot");
      const f = TC.fingerOf(ch);
      const isCap = ch !== low;
      if (isCap) {
        // Shift on the other hand from the letter.
        const left = f && f[0] === "l";
        const shifts = document.querySelectorAll('#tp-kb .tp-k[data-k="shift"]');
        if (shifts.length === 2) shifts[left ? 1 : 0].classList.add("hot-shift");
        document.querySelector(`#tp-hands .tp-paw.${left ? "right" : "left"} .f-${left ? "rp" : "lp"}`)?.classList.add("hot");
      }
      if (f === "th") document.querySelectorAll("#tp-hands .f-th").forEach((el) => el.classList.add("hot"));
      else if (f) document.querySelector(`#tp-hands .f-${f}`)?.classList.add("hot");
    }
    function press(ch) {
      if (!st) return;
      const want = target();
      if (want == null) return;
      st.keys++;
      if (ch !== want) {
        st.miss++;
        const now = document.querySelector("#tp-lstage .tp-box.now, #tp-lstage .tp-cap");
        if (now) { now.classList.remove("shake"); void now.offsetWidth; now.classList.add("shake"); }
        return;
      }
      const s = stepNow();
      if (s.type === "intro") { st.si++; st.pos = 0; }
      else { st.pos++; if (st.pos >= s.text.length) { st.si++; st.pos = 0; } }
      if (st.si >= st.steps.length) return done();
      drawStep();
    }
    function done() {
      const acc = TC.accuracy(st.keys, st.miss);
      const s = acc >= 97 ? 3 : acc >= 90 ? 2 : 1;
      const n = st.n;
      const all = store.get(K_LESSON, {});
      const prev = all[n] || (progress && progress.typingLessons && progress.typingLessons[n]);
      const rec = { s: Math.max(s, prev ? prev.s : 0), a: Math.max(acc, prev ? prev.a : 0) };
      all[n] = rec; store.set(K_LESSON, all);
      try { progress.typingLessons = Object.assign({}, progress.typingLessons || {}, { [n]: rec }); saveProgress(); } catch (e) { /* ignore */ }
      if (keyHandler) document.removeEventListener("keydown", keyHandler, true);
      keyHandler = null;
      $("tp-lbar").style.width = "100%";
      $("tp-lstage").innerHTML = `<div class="tp-result"><div class="tp-stars" role="img" aria-label="${s}/3">${[1, 2, 3].map((k) => `<span class="${k <= s ? "on" : ""}">★</span>`).join("")}</div>
        <h3>${esc(L(`Lesson ${n} done!`, `레슨 ${n} 완료!`))}</h3><p class="tp-rank-line">${esc(L(`Accuracy ${acc}%`, `정확도 ${acc}%`))}</p>
        <div class="tp-result-btns">${n < 20 ? `<button type="button" class="pill accent" data-next>${esc(L(`Lesson ${n + 1}`, `레슨 ${n + 1}`))} →</button>` : ""}<button type="button" class="pill neutral" data-again>${esc(L("Again", "다시"))}</button></div></div>`;
      $("tp-kb").innerHTML = ""; $("tp-hands").innerHTML = "";
      panel.querySelector("[data-next]")?.addEventListener("click", () => start(n + 1));
      panel.querySelector("[data-again]").addEventListener("click", () => start(n));
      st = null;
    }
    return { openList, stop };
  })();

  /* ---------- Records ---------- */
  const records = (() => {
    const panel = panels.records;
    let kind = "sentence", level = null, period = "week", input = null, req = 0;
    const KINDS = [["words", "🎈", () => L("Words", "단어")], ["sentence", "💬", () => L("Sentences", "문장")], ["paragraph", "📖", () => L("Paragraphs", "문단")], ["daily", "🏅", () => L("Today", "오늘")]];
    function open(k) {
      if (k && TC.KINDS.includes(k)) kind = k;
      level = currentLevel; input = input || inputKind();
      show("records");
      draw();
    }
    function seg(name, items, cur) {
      return `<div class="qz-seg tp-rec-seg" role="radiogroup" data-seg="${name}">${items.map(([v, lab]) => `<button type="button" class="qz-seg-btn${v === cur ? " on" : ""}" role="radio" aria-checked="${v === cur}" data-v="${esc(v)}">${esc(lab)}</button>`).join("")}</div>`;
    }
    function draw() {
      const levels = (currentSystem().levels || []).map((lv) => [lv.id, lv.label]);
      panel.innerHTML = `<div class="tp-back-row"><button type="button" class="tp-back" data-tp-back><span aria-hidden="true">←</span> ${esc(t("tpBack"))}</button></div>
        <div class="card tp-rec-card">
          <h3 class="tp-panel-title">🏆 ${esc(L("Records", "기록"))}</h3>
          <div class="tp-tabs" role="tablist">${KINDS.map(([k, ico, lab]) => `<button type="button" role="tab" class="tp-tab${k === kind ? " on" : ""}" aria-selected="${k === kind}" data-kind="${k}"><span class="tp-tab-ico" aria-hidden="true">${ico}</span><span>${esc(lab())}</span></button>`).join("")}</div>
          <div class="tp-rec-filters">
            ${seg("level", levels, level)}
            ${kind === "daily" ? "" : seg("period", [["week", L("This week", "이번 주")], ["all", L("All time", "전체")]], period)}
            ${seg("input", [["kb", L("⌨️ Keyboard", "⌨️ 키보드")], ["touch", L("📱 Touch", "📱 터치")]], input)}
          </div>
          <div class="tp-rec-body" id="tp-rec-body"><p class="tp-loading">${esc(L("Loading…", "불러오는 중…"))}</p></div>
          <p class="tp-note">${esc(L("Names on the board are made-up nicknames, so nobody's real name is shown. WPM results need 90% accuracy to count. Keyboard and touch typing are ranked separately.", "순위표의 이름은 자동으로 만든 별명이라 실제 이름은 보이지 않아요. WPM 기록은 정확도 90% 이상만 올라가요. 키보드와 터치는 따로 순위를 매겨요."))}</p>
        </div>`;
      panel.querySelectorAll("[data-kind]").forEach((b) => b.addEventListener("click", () => { kind = b.dataset.kind; draw(); }));
      panel.querySelectorAll("[data-seg]").forEach((sg) => sg.addEventListener("click", (e) => {
        const b = e.target.closest("[data-v]");
        if (!b) return;
        if (sg.dataset.seg === "level") level = b.dataset.v;
        if (sg.dataset.seg === "period") period = b.dataset.v;
        if (sg.dataset.seg === "input") input = b.dataset.v;
        draw();
      }));
      load();
    }
    async function load() {
      const my = ++req;
      const body = $("tp-rec-body");
      let d = null;
      try {
        const r = await fetch(`/api/typing/board?kind=${kind}&level=${encodeURIComponent(level)}&input=${input}&period=${period}&slot=${slot()}`, { credentials: "same-origin", cache: "no-store" });
        d = r.ok ? await r.json() : null;
      } catch (e) { d = null; }
      if (my !== req || !body) return;
      if (!d) { body.innerHTML = `<p class="tp-loading">${esc(L("Couldn't load the leaderboard. Try again in a moment.", "순위표를 불러오지 못했어요. 잠시 뒤 다시 해 보세요."))}</p>`; return; }
      const isWords = kind === "words";
      const val = (r) => (isWords ? r.score.toLocaleString() : `${fmtWpm(r.score / 10)} WPM`);
      const when = (ms) => new Date(ms).toLocaleString(ko() ? "ko-KR" : "en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
      const medal = (n) => (n === 1 ? "🥇" : n === 2 ? "🥈" : n === 3 ? "🥉" : "");
      const row = (r) => `<tr class="${r.me ? "me" : ""}"><td class="tp-rank">${medal(r.rank)} ${r.rank}</td><td class="tp-name">${esc(r.name)}${r.me ? ` <small>(${esc(L("you", "나"))})</small>` : ""}</td><td class="tp-val">${esc(val(r))}</td><td>${isWords ? "–" : r.accuracy + "%"}</td><td class="tp-when">${esc(when(r.at))}</td></tr>`;
      const rows = d.rows || [];
      const meRow = d.me && !rows.some((r) => r.me) ? `<tr class="tp-gap"><td colspan="5">⋯</td></tr>${row(d.me)}` : "";
      const head = `<thead><tr><th>${esc(L("Rank", "순위"))}</th><th>${esc(L("Player", "사용자"))}</th><th>${esc(isWords ? L("Score", "점수") : L("Speed", "기록"))}</th><th>${esc(L("Acc.", "정확도"))}</th><th>${esc(L("When", "기록된 시간"))}</th></tr></thead>`;
      const empty = `<p class="tp-loading">${esc(kind === "daily" ? L("Nobody has done today's challenge at this level yet. Be the first!", "이 레벨에서 아직 오늘의 도전을 한 사람이 없어요. 첫 번째가 되어 보세요!") : L("No records here yet. Be the first!", "아직 기록이 없어요. 첫 번째가 되어 보세요!"))}</p>`;
      const who = signedIn() ? (d.myName ? `<p class="tp-me-name">${esc(L(`Your nickname: ${d.myName}`, `내 별명: ${d.myName}`))}</p>` : "") : `<p class="tp-me-name">${esc(L("Sign in to get on the board.", "로그인하면 순위에 올라요."))}</p>`;
      body.innerHTML = (rows.length ? `<div class="tp-table-wrap"><table class="tp-table">${head}<tbody>${rows.map(row).join("")}${meRow}</tbody></table></div>` : empty) + who;
    }
    return { open };
  })();

  /* ---------- Public ---------- */
  function enter() {
    if (view === "words") {
      // Coming back to the tab after a finished round: start from the tiles again.
      try { if (typeGameRunning || typeGamePaused) return; } catch (e) { /* ignore */ }
    }
    if (view === "run" || view === "letters" || view === "records") return; // keep a panel the child was using
    show("hub");
  }
  window.TypingHub = { enter, submitWordsScore, showHub: () => show("hub") };
  // Language / level changes redraw the hub text.
  try {
    new MutationObserver(() => { if (view === "hub") { renderTopicGrid(); renderShowSeg(); renderHubDescs(); } }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  } catch (e) { /* ignore */ }
  renderTopicGrid(); renderShowSeg(); renderHubDescs();
})();
