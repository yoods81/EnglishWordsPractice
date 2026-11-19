/* Times Table tile games — Koala Calculator, Gumnut Toss, Koala Café.
   The fourth tile (Balloon Pop) is the original falling-sums game in app.js.

   These games share everything with Balloon Pop: the Settings row on the start
   card (which tables + Slow/Normal/Fast), the daily question limit for guests /
   free accounts ("tt" quota), coin payouts (recordResult(..., "tt") → the same
   rewardLearning rules), the spaced-repetition order (pickWordsForSession) and
   the shared Game Over screen. Only the way a sum is answered differs.

   Depends on globals from app.js (loaded first): buildTimesTableProblemPool,
   timesTableKey, timesTableSpeedMode, timesTableSelectionKey, dailyQuotaLeft,
   dailyQuotaAdd, promptDailyCap, recordResult, recordSrsResult,
   pickWordsForSession, shuffle, showGameOverScreen, resetTimesTable, t,
   currentLang, gameSpeedLocked, timesTableMuted, play*Sfx, setTimesTableGuideOpen. */
(function () {
  "use strict";
  const layer = document.getElementById("ttg-layer");
  const tiles = document.getElementById("ttg-tiles");
  if (!layer || !tiles) return;
  const view = document.getElementById("view-timestable");
  const card = document.querySelector("#view-timestable > .card");
  const startOverlay = document.getElementById("timestable-start-overlay");
  const overOverlay = document.getElementById("timestable-over-overlay");
  const muteBtn = document.getElementById("timestable-mute-btn");
  const BEST_KEY = "ywp_ttg_best_v1";

  const L = (en, ko) => (currentLang === "ko" ? ko : en);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // Settings → each game. Slow / Normal / Fast changes time, never the sums themselves.
  const SPEED = {
    calc: { slow: 15, normal: 10, fast: 6 }, // seconds per question
    whack: { slow: 90, normal: 60, fast: 45 }, // seconds per round
    whackStay: { slow: 2.8, normal: 2.1, fast: 1.6 }, // seconds a wombat stays up
    whackGap: { slow: 1.1, normal: 0.85, fast: 0.65 }, // seconds between pops
    match: { slow: 100, normal: 75, fast: 55 }, // seconds per round (boards keep coming)
    claw: { slow: 25, normal: 18, fast: 12 }, // seconds per prize
    cafe: { slow: 60, normal: 45, fast: 35 }, // seconds per café level
    cafeQuick: { slow: 6, normal: 4, fast: 3 }, // answer within this many seconds = tip
  };
  // Questions per round come from Settings → "Questions" (timesTableRoundCount in app.js, default 20).
  const REVEAL_MS = 1500; // a wrong answer shows the right one big for this long
  const WHACK_PENALTY = 2; // seconds lost for bonking a wrong wombat
  const WHACK_HOLES = 6;
  const MATCH_PAIRS = 6; // 12 cards a board
  const CHOICES = { cafe: 5, claw: 4 };

  let last = "balloon";
  let G = null; // the running round

  // Lifetime coins earned (not the balance, so spending mid-round can't hide what this round paid).
  function koalaEarned() {
    try { return canUseAccountFeatures() ? (KoalaCore.ensureKoala(progress).earned || 0) : 0; } catch (e) { return 0; }
  }
  function loadBest() { try { return JSON.parse(localStorage.getItem(BEST_KEY)) || {}; } catch (e) { return {}; } }
  function saveBest(b) { try { localStorage.setItem(BEST_KEY, JSON.stringify(b)); } catch (e) { /* private mode */ } }

  /* ---------- shared round machinery ---------- */
  function nextProblem() {
    if (!G.queue.length) G.queue = pickWordsForSession(G.pool, G.pool.length, (p) => timesTableKey(p));
    let p = G.queue.shift();
    // never the very same sum twice in a row
    if (G.prevKey && timesTableKey(p) === G.prevKey) {
      if (!G.queue.length) G.queue = shuffle(G.pool);
      G.queue.push(p);
      p = G.queue.shift();
    }
    G.prevKey = timesTableKey(p);
    G.shown++;
    dailyQuotaAdd("tt", 1);
    G.askedAt = G.clock;
    return p;
  }
  // This round's sums are used up (Settings count, or today's quota if that is smaller).
  function roundOver() { return G.shown >= G.n; }
  // "done" = the Settings count was reached; "limit" = today's quota cut the round short.
  function outReason() { return G.shown >= timesTableRoundCount ? "done" : "limit"; }

  // Wrong answer: the right answer, big, for 1.5 s. Timed games hold their clock meanwhile (G.reveal).
  function revealAnswer(list) {
    const ps = (Array.isArray(list) ? list : [list]).filter(Boolean);
    if (!ps.length) return;
    layer.querySelectorAll(".ttg-reveal").forEach((el) => el.remove());
    const el = document.createElement("div");
    el.className = "ttg-reveal";
    el.setAttribute("aria-live", "polite");
    el.innerHTML = ps.map((p) => `<div class="ttg-reveal-row"><span>${p.a} × ${p.b} =</span><b>${p.product}</b></div>`).join("");
    layer.appendChild(el);
    G.reveal = true;
    later(REVEAL_MS, () => { G.reveal = false; el.remove(); });
  }

  function scoreAnswer(p, ok) {
    const key = timesTableKey(p);
    recordSrsResult(key, ok);
    recordResult(key, ok, "tt");
    if (ok) {
      G.correct++;
      playTimesTableCorrectSfx();
    } else {
      G.missed.add(key);
      playTimesTableWrongSfx();
    }
  }

  // n numbers: the answer + believable near-misses (neighbouring facts, ±1, ±10)
  function choices(p, n) {
    const ans = p.product;
    const near = shuffle([(p.a + 1) * p.b, (p.a - 1) * p.b, p.a * (p.b + 1), p.a * (p.b - 1), ans + 1, ans - 1, ans + 2, ans - 2, ans + 10, ans - 10, ans + p.a, ans - p.b]);
    const set = new Set();
    for (const v of near) {
      if (set.size >= n - 1) break;
      if (v > 0 && v !== ans) set.add(v);
    }
    let guard = 0;
    while (set.size < n - 1 && guard++ < 100) {
      const v = ans + Math.floor(Math.random() * 25) - 12;
      if (v > 0 && v !== ans) set.add(v);
    }
    return shuffle([ans, ...set]);
  }

  function later(ms, fn) {
    const g = G;
    const id = setTimeout(() => { if (G === g) fn(); }, ms);
    g.timers.push(id);
  }

  function modalOpen() {
    return !!document.querySelector(".auth-overlay:not([hidden]), .kid-modal-overlay:not([hidden]), .level-overlay:not([hidden]), .pay-overlay:not([hidden])");
  }
  function loop(ts) {
    if (!G) return;
    const dt = G.lastTs == null ? 0 : Math.min(0.1, (ts - G.lastTs) / 1000);
    G.lastTs = ts;
    // The clock only runs while the child can actually see and play the game.
    if (view.classList.contains("active") && !document.hidden && !modalOpen()) {
      G.clock += dt;
      GAMES[G.id].tick(dt);
    }
    if (G) G.raf = requestAnimationFrame(loop);
  }

  function hudHtml(title) {
    return `<div class="ttg-hud">
      <button type="button" class="ttg-hud-btn ttg-quit" aria-label="${esc(L("End game", "게임 끝내기"))}">✕</button>
      <b class="ttg-hud-title">${esc(title)}</b>
      <span class="ttg-hud-stat" data-ttg-stat></span>
      <button type="button" class="ttg-hud-btn ttg-mute" aria-label="${esc(L("Sound", "소리"))}">${timesTableMuted ? "🔇" : "🔊"}</button>
    </div>`;
  }
  function setStat(html) {
    const el = layer.querySelector("[data-ttg-stat]");
    if (el) el.innerHTML = html;
  }
  function fmtTime(s) {
    s = Math.max(0, Math.ceil(s));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }
  function floatText(x, y, text, cls) {
    const el = document.createElement("span");
    el.className = "ttg-float " + (cls || "");
    el.textContent = text;
    el.style.left = x + "px";
    el.style.top = y + "px";
    layer.appendChild(el);
    setTimeout(() => el.remove(), 1000);
  }
  function centerOf(el) {
    const a = el.getBoundingClientRect();
    const b = layer.getBoundingClientRect();
    return { x: a.left - b.left + a.width / 2, y: a.top - b.top + a.height / 2 };
  }

  function start(id) {
    if (id === "balloon") { last = "balloon"; startTimesTable(); return; }
    if (!GAMES[id]) return;
    clearScene();
    const pool = buildTimesTableProblemPool();
    if (!pool.length) {
      // nothing selected: open the tables picker in Settings
      const sd = document.getElementById("timestable-settings");
      if (sd) setTimeout(() => { sd.open = true; }, 0);
      return;
    }
    if (dailyQuotaLeft("tt") <= 0) { promptDailyCap(); return; }
    last = id;
    G = {
      id, pool, queue: [], prevKey: "", shown: 0, cap: dailyQuotaLeft("tt"), reveal: false,
      correct: 0, score: 0, missed: new Set(), timers: [], mode: timesTableSpeedMode || "slow",
      clock: 0, askedAt: 0, lastTs: null, raf: 0, lock: false,
    };
    G.n = Math.max(1, Math.min(timesTableRoundCount || 20, G.cap));
    G.coinsAtStart = koalaEarned();
    gameSpeedLocked.tt = false; // full coins: the tile games have no speed lock
    if (typeof setTimesTableGuideOpen === "function") setTimesTableGuideOpen(false);
    startOverlay.hidden = true;
    overOverlay.hidden = true;
    layer.className = "ttg-layer ttg-is-" + id;
    layer.innerHTML = "";
    layer.hidden = false;
    card.classList.add("ttg-on");
    GAMES[id].init();
    G.raf = requestAnimationFrame(loop);
  }

  // Tear down without showing anything (used before a restart).
  // Stop the clock and timers; the scene stays on screen (frozen) under the result card.
  function freezeRound() {
    if (!G) return;
    cancelAnimationFrame(G.raf);
    G.timers.forEach(clearTimeout);
    G = null;
  }
  // Remove the tile-game scene entirely (back to the picker, or before another game starts).
  function clearScene() {
    freezeRound();
    layer.hidden = true;
    layer.innerHTML = "";
    card.classList.remove("ttg-on");
  }
  function stopRound() { clearScene(); }

  function endRound(reason) {
    if (!G) return;
    const g = G;
    // Quitting (✕ / Esc) goes straight back to the game picker — no result card.
    if (reason === "manual") { clearScene(); resetTimesTable(); return; }
    freezeRound();
    layer.querySelectorAll("button").forEach((b) => { b.disabled = true; });
    const best = loadBest();
    // Café used to count dollars; its points start a fresh best.
    const key = `${g.id === "cafe" ? "cafe2" : g.id}_${currentLang}_${timesTableSelectionKey()}`;
    const prevBest = best[key] || 0;
    const isNewBest = g.score > prevBest;
    if (isNewBest) { best[key] = g.score; saveBest(best); }
    document.getElementById("timestable-final-score").textContent = t("timesTableFinalScore", g.score);
    document.getElementById("timestable-high-score").textContent = isNewBest
      ? t("timesTableNewHighScore")
      : t("timesTableHighScore", Math.max(prevBest, g.score));
    const lim = document.getElementById("timestable-limit-msg");
    if (reason === "limit") {
      lim.textContent = t(currentUser ? "timesTableLimitReachedFree" : "timesTableLimitReachedAnonymous");
      lim.hidden = false;
    } else {
      lim.hidden = true;
    }
    showGameOverScreen("timestable", {
      coins: g.coinsAtStart == null ? 0 : Math.max(0, koalaEarned() - g.coinsAtStart),
      correct: g.correct,
      isNewBest,
      best: Math.max(prevBest, g.score),
      score: g.score,
      // "lives" = the round ran out on the child (shows a kind encouragement line)
      reason: reason === "time" ? "lives" : reason,
      encourage: {
        en: ["Nice try! Every round makes you quicker.", "Mistakes help you learn — go again!", "So close! You're getting better every time."],
        ko: ["잘했어요! 할수록 더 빨라져요.", "틀려도 괜찮아요, 그러면서 배워요. 한 번 더!", "아깝다! 할 때마다 실력이 늘고 있어요."],
      },
      missed: [...g.missed].map((k) => {
        const [a, b] = k.split("x").map(Number);
        return { title: `${a} × ${b} = ${a * b}`, sub: "", say: "" };
      }),
    });
    overOverlay.hidden = false;
  }

  /* ================= Koala Calculator ================= */
  const KEYS = ["1", "2", "3", "ok", "4", "5", "6", "back", "7", "8", "9", "0"];
  const calc = {
    init() {
      G.total = G.n;
      G.limit = SPEED.calc[G.mode] || 12;
      layer.innerHTML = hudHtml(t("ttgCalc")) + `
        <div class="ttg-calc">
          <div class="ttg-calc-box">
            <div class="ttg-calc-screen">
              <div class="ttg-calc-q" data-q></div>
              <div class="ttg-calc-arow">
                <div class="ttg-calc-a" data-a>0</div>
                <button type="button" class="ttg-calc-next" data-next hidden>${esc(L("Next", "다음"))} ▶</button>
              </div>
              <div class="ttg-qbar"><i data-bar></i></div>
            </div>
            <div class="ttg-calc-keys">${KEYS.map((k) => `<button type="button" class="ttg-key${k === "ok" ? " ttg-key-ok" : k === "back" ? " ttg-key-back" : ""}" data-key="${k}" aria-label="${k === "ok" ? esc(L("Check", "확인")) : k === "back" ? esc(L("Delete", "지우기")) : k}">${k === "ok" ? "✔" : k === "back" ? "⌫" : k}</button>`).join("")}</div>
          </div>
          <div class="ttg-calc-koala" aria-hidden="true">${KOALA_SVG}</div>
        </div>`;
      layer.querySelector(".ttg-calc-keys").addEventListener("click", (e) => {
        const b = e.target.closest("[data-key]");
        if (b) calc.press(b.dataset.key);
      });
      layer.querySelector("[data-next]").addEventListener("click", () => calc.goNext());
      calc.next();
    },
    next() {
      if (roundOver()) { endRound(outReason()); return; }
      G.p = nextProblem();
      G.waitNext = false;
      layer.querySelector("[data-next]").hidden = true;
      layer.querySelectorAll(".ttg-reveal").forEach((el) => el.remove());
      G.typed = "";
      G.left = G.limit;
      G.lock = false;
      const box = layer.querySelector(".ttg-calc-box");
      box.classList.remove("is-ok", "is-bad");
      layer.querySelector("[data-q]").textContent = `${G.p.a} × ${G.p.b} =`;
      calc.render();
    },
    render() {
      layer.querySelector("[data-a]").textContent = G.typed || "0";
      layer.querySelector("[data-a]").classList.toggle("is-empty", !G.typed);
      setStat(`${L("Score", "점수")} <b>${G.score}</b> · ${Math.min(G.shown, G.total)}/${G.total}`);
    },
    // After a wrong answer the child moves on with the Next button (or Enter / ✔).
    goNext() {
      if (!G || !G.waitNext) return;
      G.waitNext = false;
      calc.next();
    },
    press(k) {
      if (G && G.waitNext) { if (k === "ok") calc.goNext(); return; }
      if (!G || G.lock) return;
      if (k === "back") G.typed = G.typed.slice(0, -1);
      else if (k === "ok") { if (G.typed) calc.check(false); return; }
      else if (G.typed.length < 3) G.typed = (G.typed === "0" ? "" : G.typed) + k;
      calc.render();
    },
    check(timeout) {
      G.lock = true;
      const ok = !timeout && Number(G.typed) === G.p.product;
      scoreAnswer(G.p, ok);
      const box = layer.querySelector(".ttg-calc-box");
      box.classList.add(ok ? "is-ok" : "is-bad");
      if (ok) G.score += 10;
      layer.querySelector("[data-q]").textContent = `${G.p.a} × ${G.p.b} = ${G.p.product}`;
      calc.render();
      const a = layer.querySelector("[data-a]");
      a.classList.remove("is-empty");
      if (ok) {
        a.textContent = L("Nice one!", "정답!");
        later(750, calc.next);
        return;
      }
      // wrong or out of time: "Answer - 56" on the screen, the answer big for 1.5 s, then wait for Next
      layer.querySelector("[data-q]").textContent = `${G.p.a} × ${G.p.b} =`;
      a.textContent = `${L("Answer", "정답")} - ${G.p.product}`;
      revealAnswer(G.p);
      G.waitNext = true;
      const nb = layer.querySelector("[data-next]");
      nb.hidden = false;
    },
    tick(dt) {
      if (G.lock) return;
      G.left -= dt;
      const bar = layer.querySelector("[data-bar]");
      if (bar) {
        const f = Math.max(0, G.left / G.limit);
        bar.style.transform = `scaleX(${f})`;
        bar.classList.toggle("is-low", f < 0.3);
      }
      if (G.left <= 0) calc.check(true);
    },
    key(e) {
      if (/^[0-9]$/.test(e.key)) calc.press(e.key);
      else if (e.key === "Backspace") calc.press("back");
      else if (e.key === "Enter") calc.press("ok");
      else return false;
      return true;
    },
  };

  /* ================= Wombat Whack ================= */
  // Six burrows; wombats pop up holding a number. Bonk the one holding the answer.
  const whack = {
    init() {
      G.total = SPEED.whack[G.mode] || 60;
      G.left = G.total;
      G.stay = SPEED.whackStay[G.mode] || 2.1;
      G.gap = SPEED.whackGap[G.mode] || 0.85;
      G.holes = [];
      layer.innerHTML = hudHtml(t("ttgWhack")) + `
        <div class="ttg-whack">
          <div class="ttg-timebar"><i data-bar></i><span data-time></span></div>
          <div class="ttg-plate" data-q></div>
          <div class="ttg-holes" data-holes>${Array.from({ length: WHACK_HOLES }, (_, i) => `
            <div class="ttg-hole" data-hole="${i}">
              <div class="ttg-hole-pit"></div>
              <div class="ttg-hole-win"><button type="button" class="ttg-wombat" tabindex="-1" aria-hidden="true">${animalSvg("wombat", "")}<b class="ttg-sign"></b></button></div>
              <div class="ttg-hole-front"></div>
            </div>`).join("")}
          </div>
        </div>`;
      layer.querySelectorAll("[data-hole]").forEach((el, i) => {
        G.holes.push({ el, btn: el.querySelector(".ttg-wombat"), up: false, v: 0, until: 0 });
        el.querySelector(".ttg-wombat").addEventListener("pointerdown", (e) => { e.preventDefault(); whack.bonk(i); });
      });
      whack.next();
    },
    next() {
      if (roundOver()) { endRound(outReason()); return; }
      G.p = nextProblem();
      G.lock = false;
      G.wrongs = choices(G.p, 7).filter((v) => v !== G.p.product);
      // The answer is not always the first wombat up: it comes 1st, 2nd or 3rd at random.
      G.sinceRight = Math.floor(Math.random() * 2);
      G.nextPop = G.clock + 0.3;
      layer.querySelector("[data-q]").textContent = `${G.p.a} × ${G.p.b} = ?`;
      // wombats still up keep their old numbers only if they happen to fit; simplest: send them down
      G.holes.forEach((h) => whack.hide(h));
      whack.stat();
    },
    stat() { setStat(`${L("Score", "점수")} <b>${G.score}</b> · ${Math.min(G.shown, G.n)}/${G.n}`); },
    pop() {
      const free = G.holes.filter((h) => !h.up && !h.busy);
      if (!free.length || G.holes.filter((h) => h.up).length >= 3) return;
      const h = free[Math.floor(Math.random() * free.length)];
      const rightUp = G.holes.some((x) => x.up && x.v === G.p.product);
      const giveRight = !rightUp && (G.sinceRight >= 2 || Math.random() < 0.45);
      h.v = giveRight ? G.p.product : G.wrongs[Math.floor(Math.random() * G.wrongs.length)];
      G.sinceRight = giveRight ? 0 : G.sinceRight + 1;
      h.btn.querySelector(".ttg-sign").textContent = h.v;
      h.btn.innerHTML = animalSvg("wombat", "") + `<b class="ttg-sign">${h.v}</b>`;
      h.up = true;
      h.until = G.clock + G.stay;
      h.el.classList.remove("is-bonked", "is-miss");
      h.el.classList.add("is-up");
    },
    hide(h) {
      h.up = false;
      h.el.classList.remove("is-up");
    },
    bonk(i) {
      if (!G || G.lock) return;
      const h = G.holes[i];
      if (!h.up) return;
      const ok = h.v === G.p.product;
      G.lock = true;
      scoreAnswer(G.p, ok);
      const at = centerOf(h.el);
      if (ok) {
        G.score += 10;
        h.btn.innerHTML = animalSvg("wombat", "happy") + `<b class="ttg-sign">${h.v}</b><i class="ttg-stars" aria-hidden="true">★ ★ ★</i>`;
        h.el.classList.add("is-bonked");
        floatText(at.x, at.y - 40, "+10", "is-good");
        whack.stat();
        later(650, () => { whack.hide(h); later(250, whack.next); });
      } else {
        h.btn.innerHTML = animalSvg("wombat", "sad") + `<b class="ttg-sign">${h.v}</b>`;
        h.el.classList.add("is-miss");
        G.left = Math.max(0, G.left - WHACK_PENALTY);
        floatText(at.x, at.y - 40, `−${WHACK_PENALTY}s`, "is-bad");
        layer.querySelector("[data-q]").textContent = `${G.p.a} × ${G.p.b} = ${G.p.product}`;
        G.holes.forEach((x) => { if (x !== h) whack.hide(x); });
        revealAnswer(G.p);
        later(REVEAL_MS, whack.next);
      }
    },
    tick(dt) {
      if (G.reveal) return; // the clock waits while the right answer is shown
      G.left -= dt;
      const f = Math.max(0, G.left / G.total);
      const bar = layer.querySelector("[data-bar]");
      if (bar) { bar.style.transform = `scaleX(${f})`; bar.classList.toggle("is-low", G.left < 10); }
      const tm = layer.querySelector("[data-time]");
      if (tm) tm.textContent = fmtTime(G.left);
      if (G.left <= 0) { endRound("time"); return; }
      if (G.lock) return;
      G.holes.forEach((h) => { if (h.up && G.clock >= h.until) whack.hide(h); });
      if (G.clock >= G.nextPop) { whack.pop(); G.nextPop = G.clock + G.gap * (0.7 + Math.random() * 0.6); }
    },
    key(e) {
      const n = Number(e.key);
      if (n >= 1 && n <= WHACK_HOLES) { whack.bonk(n - 1); return true; }
      return false;
    },
  };

  /* ================= Memory Match ================= */
  // 12 face-down cards: six sums and their six answers. Flip two; a sum and its answer stay open.
  const match = {
    init() {
      G.total = SPEED.match[G.mode] || 75;
      G.left = G.total;
      G.boards = 0;
      layer.innerHTML = hudHtml(t("ttgMatch")) + `
        <div class="ttg-match">
          <div class="ttg-timebar"><i data-bar></i><span data-time></span></div>
          <div class="ttg-cards" data-cards></div>
          <div class="ttg-banner" data-banner hidden></div>
        </div>`;
      layer.querySelector("[data-cards]").addEventListener("click", (e) => {
        const c = e.target.closest("[data-card]");
        if (c) match.flip(Number(c.dataset.card));
      });
      match.deal();
    },
    deal() {
      // six sums with six different answers
      const picked = [];
      const used = new Set();
      let guard = 0;
      while (picked.length < MATCH_PAIRS && guard++ < 60) {
        if (roundOver()) break;
        if (!G.queue.length) G.queue = pickWordsForSession(G.pool, G.pool.length, (q) => timesTableKey(q));
        const q = G.queue[0];
        if (used.has(q.product)) { G.queue.push(G.queue.shift()); continue; }
        const p = nextProblem();
        if (used.has(p.product)) continue; // (rare) a swap in nextProblem brought a repeat answer
        used.add(p.product);
        picked.push(p);
      }
      if (!picked.length) { endRound(outReason()); return; }
      G.cards = shuffle(picked.flatMap((p, i) => [{ pair: i, kind: "q", p }, { pair: i, kind: "a", p }]));
      G.open = [];
      G.found = 0;
      G.pairs = picked.length;
      G.missedPair = new Set();
      G.lock = false;
      const wrap = layer.querySelector("[data-cards]");
      wrap.innerHTML = G.cards.map((c, i) => `
        <button type="button" class="ttg-card" data-card="${i}" style="--d:${i * 40}ms" aria-label="${esc(L("Card", "카드"))} ${i + 1}">
          <span class="ttg-card-back" aria-hidden="true"></span>
          <span class="ttg-card-face ${c.kind === "q" ? "is-q" : "is-a"}">${c.kind === "q" ? `${c.p.a} × ${c.p.b}` : c.p.product}</span>
        </button>`).join("");
      match.stat();
    },
    stat() { setStat(`${L("Pairs", "짝")} <b>${G.found}</b>/${G.pairs} · ${L("Score", "점수")} <b>${G.score}</b>`); },
    flip(i) {
      if (!G || G.lock) return;
      const c = G.cards[i];
      const el = layer.querySelector(`[data-card="${i}"]`);
      if (!c || c.done || G.open.includes(i)) return;
      el.classList.add("is-open");
      G.open.push(i);
      if (G.open.length < 2) return;
      const [x, y] = G.open.map((k) => G.cards[k]);
      const els = G.open.map((k) => layer.querySelector(`[data-card="${k}"]`));
      G.open = [];
      if (x.pair === y.pair && x.kind !== y.kind) {
        x.done = y.done = true;
        G.found++;
        G.score += 10;
        // a sum counts as answered right when its pair is found (wrong flips are memory, not maths)
        scoreAnswer(x.p, true);
        els.forEach((e) => e.classList.add("is-done"));
        const at = centerOf(els[1]);
        floatText(at.x, at.y - 24, "+10", "is-good");
        match.stat();
        if (G.found >= G.pairs) {
          G.lock = true;
          G.score += 20;
          G.boards++;
          const ban = layer.querySelector("[data-banner]");
          ban.textContent = L("All pairs! +20", "모두 찾았어요! +20");
          ban.hidden = false;
          match.stat();
          later(1300, () => { ban.hidden = true; match.deal(); });
        }
      } else {
        G.lock = true;
        playTimesTableWrongSfx();
        els.forEach((e) => e.classList.add("is-wrong"));
        // a sum card that was flipped shows its right answer big
        const sums = [x, y].filter((c) => c.kind === "q").map((c) => c.p);
        if (sums.length) revealAnswer(sums);
        later(sums.length ? REVEAL_MS : 850, () => { els.forEach((e) => e.classList.remove("is-open", "is-wrong")); G.lock = false; });
      }
    },
    tick(dt) {
      if (G.reveal || (G.lock && !layer.querySelector("[data-banner]").hidden)) return; // clock rests during "All pairs!" / the answer
      G.left -= dt;
      const f = Math.max(0, G.left / G.total);
      const bar = layer.querySelector("[data-bar]");
      if (bar) { bar.style.transform = `scaleX(${f})`; bar.classList.toggle("is-low", G.left < 10); }
      const tm = layer.querySelector("[data-time]");
      if (tm) tm.textContent = fmtTime(G.left);
      if (G.left <= 0) endRound("time");
    },
    key() { return false; },
  };

  /* ================= Koala Claw (claw machine) ================= */
  // Five plushies sit in the machine, each with a number tag. Move the claw over the one
  // with the answer and press GRAB. A wrong plush slips out of the claw.
  const PLUSH = ["koala", "wombat", "kangaroo", "possum", "platypus", "echidna"];
  const CLAW_SVG = `<svg viewBox="-30 -10 60 60" aria-hidden="true">
    <rect x="-13" y="-10" width="26" height="14" rx="5" fill="#e8476a"/><rect x="-9" y="3" width="18" height="12" rx="3" fill="#c9d3da"/>
    <circle cy="17" r="5" fill="#9aa7b0"/>
    <g class="ttg-claw-l"><path d="M-3 17 Q-20 22 -20 38 Q-20 46 -12 50" stroke="#9aa7b0" stroke-width="5" fill="none" stroke-linecap="round"/></g>
    <g class="ttg-claw-r"><path d="M3 17 Q20 22 20 38 Q20 46 12 50" stroke="#9aa7b0" stroke-width="5" fill="none" stroke-linecap="round"/></g></svg>`;
  const claw = {
    init() {
      G.total = G.n;
      G.limit = SPEED.claw[G.mode] || 18;
      G.won = 0;
      G.col = 1;
      layer.innerHTML = hudHtml(t("ttgClaw")) + `
        <div class="ttg-claw">
          <div class="ttg-machine">
            <div class="ttg-marquee"><span data-q></span></div>
            <div class="ttg-qbar ttg-claw-bar"><i data-bar></i></div>
            <div class="ttg-glass" data-glass>
              <div class="ttg-rail"></div>
              <div class="ttg-clawhead" data-claw><i class="ttg-cable" data-cable></i><div class="ttg-clawgrip">${CLAW_SVG}<div class="ttg-carry" data-carry></div></div></div>
              <div class="ttg-chute"><span>${esc(L("PRIZE", "상품"))}</span></div>
              <div class="ttg-plushies" data-plush></div>
            </div>
            <div class="ttg-controls">
              <button type="button" class="ttg-ctl" data-move="-1" aria-label="${esc(L("Left", "왼쪽"))}">◀</button>
              <button type="button" class="ttg-ctl" data-move="1" aria-label="${esc(L("Right", "오른쪽"))}">▶</button>
              <button type="button" class="ttg-grab" data-grab>${esc(L("GRAB", "뽑기"))}</button>
            </div>
          </div>
        </div>`;
      layer.querySelector(".ttg-controls").addEventListener("click", (e) => {
        const m = e.target.closest("[data-move]");
        if (m) claw.move(Number(m.dataset.move));
        else if (e.target.closest("[data-grab]")) claw.grab();
      });
      // tapping a plush moves the claw over it (no grab — the child still presses GRAB)
      layer.querySelector("[data-plush]").addEventListener("click", (e) => {
        const p = e.target.closest("[data-col]");
        if (p && !G.lock) { G.col = Number(p.dataset.col); claw.place(); }
      });
      claw.next();
    },
    next() {
      if (roundOver()) { endRound(outReason()); return; }
      G.p = nextProblem();
      G.left = G.limit;
      G.lock = false;
      layer.querySelector("[data-q]").textContent = `${G.p.a} × ${G.p.b}`;
      const nums = choices(G.p, CHOICES.claw);
      const kinds = shuffle(PLUSH);
      layer.querySelector("[data-plush]").innerHTML = nums.map((v, i) => `
        <button type="button" class="ttg-plush" data-col="${i}" data-v="${v}" style="--i:${i}" aria-label="${v}">${animalSvg(kinds[i % kinds.length], "")}<b>${v}</b></button>`).join("");
      layer.querySelector("[data-carry]").innerHTML = "";
      claw.place();
      setStat(`🧸 <b>${G.won}</b> · ${Math.min(G.shown, G.total)}/${G.total}`);
    },
    colX(i) {
      const p = layer.querySelector(`[data-col="${i}"]`);
      const glass = layer.querySelector("[data-glass]");
      if (!p || !glass) return 0;
      const a = p.getBoundingClientRect(), g = glass.getBoundingClientRect();
      return a.left - g.left + a.width / 2;
    },
    place() {
      const h = layer.querySelector("[data-claw]");
      h.style.transform = `translateX(${claw.colX(G.col)}px)`;
    },
    move(d) {
      if (!G || G.lock) return;
      G.col = Math.max(0, Math.min(CHOICES.claw - 1, G.col + d));
      claw.place();
    },
    grab(timeout) {
      if (!G || G.lock) return;
      G.lock = true;
      const plush = layer.querySelector(`[data-col="${G.col}"]`);
      const v = Number(plush.dataset.v);
      const ok = !timeout && v === G.p.product;
      const head = layer.querySelector("[data-claw]");
      const glass = layer.querySelector("[data-glass]");
      const drop = Math.max(40, plush.getBoundingClientRect().top - glass.getBoundingClientRect().top - 46);
      const carry = layer.querySelector("[data-carry]");
      if (timeout) {
        scoreAnswer(G.p, false);
        layer.querySelector("[data-q]").textContent = `${G.p.a} × ${G.p.b} = ${G.p.product}`;
        const right = layer.querySelector(`[data-v="${G.p.product}"]`);
        if (right) right.classList.add("is-answer");
        revealAnswer(G.p);
        later(REVEAL_MS, claw.next);
        return;
      }
      head.style.setProperty("--drop", `${drop}px`);
      head.classList.add("is-down");
      later(650, () => {
        head.classList.add("is-shut");
        // the plush rides up with the claw
        carry.innerHTML = plush.innerHTML;
        plush.classList.add("is-taken");
        later(250, () => {
          head.classList.remove("is-down");
          later(650, () => {
            scoreAnswer(G.p, ok);
            const at = centerOf(head);
            if (ok) {
              G.won++;
              G.score += 10;
              // carry it over the chute and let go
              head.style.transform = `translateX(${layer.querySelector(".ttg-chute").offsetLeft + 24}px)`;
              later(650, () => {
                head.classList.remove("is-shut");
                carry.classList.add("is-drop");
                floatText(at.x, at.y + 30, "+10", "is-good");
                layer.querySelector("[data-q]").textContent = L("Nice one!", "뽑았다!");
                later(800, () => { carry.classList.remove("is-drop"); head.classList.remove("is-shut"); claw.next(); });
              });
            } else {
              // it slips and drops back down
              carry.classList.add("is-slip");
              later(500, () => {
                head.classList.remove("is-shut");
                carry.innerHTML = "";
                carry.classList.remove("is-slip");
                plush.classList.remove("is-taken");
                plush.classList.add("is-miss");
                layer.querySelector("[data-q]").textContent = `${G.p.a} × ${G.p.b} = ${G.p.product}`;
                const right = layer.querySelector(`[data-v="${G.p.product}"]`);
                if (right) right.classList.add("is-answer");
                revealAnswer(G.p);
                later(REVEAL_MS, claw.next);
              });
            }
            setStat(`🧸 <b>${G.won}</b> · ${Math.min(G.shown, G.total)}/${G.total}`);
          });
        });
      });
    },
    tick(dt) {
      if (G.lock) return;
      G.left -= dt;
      const bar = layer.querySelector("[data-bar]");
      if (bar) {
        const f = Math.max(0, G.left / G.limit);
        bar.style.transform = `scaleX(${f})`;
        bar.classList.toggle("is-low", f < 0.3);
      }
      if (G.left <= 0) claw.grab(true);
    },
    key(e) {
      if (e.key === "ArrowLeft") claw.move(-1);
      else if (e.key === "ArrowRight") claw.move(1);
      else if (e.key === "Enter" || e.key === " ") claw.grab();
      else return false;
      return true;
    },
  };

  /* ================= Koala Café ================= */
  // Café customers: round "mochi" plush style (chosen design A) — one soft body, big shiny eyes, blush, tiny feet.
  const ANIMALS = ["wombat", "kangaroo", "possum", "echidna", "platypus"];
  const PAL = {
    wombat: { fur: "#a98466", dark: "#6f5038", light: "#d6bea6" },
    kangaroo: { fur: "#d9a06a", dark: "#9c6a3c", light: "#f3d9bb" },
    possum: { fur: "#9aa2ae", dark: "#5e6672", light: "#eef0f3" },
    echidna: { fur: "#c8a07a", dark: "#4f3a2c", light: "#ead2b8" },
    platypus: { fur: "#8a5a3a", dark: "#3f3a37", light: "#c79a73" },
    koala: { fur: "#b4bec5", dark: "#33414a", light: "#e3e8eb" },
  };
  function animalEars(id, a, k) {
    if (id === "wombat") return `<circle cx="${-20 * k}" cy="${-24 * k}" r="${8 * k}" fill="${a.fur}"/><circle cx="${20 * k}" cy="${-24 * k}" r="${8 * k}" fill="${a.fur}"/><circle cx="${-20 * k}" cy="${-24 * k}" r="${4 * k}" fill="${a.dark}"/><circle cx="${20 * k}" cy="${-24 * k}" r="${4 * k}" fill="${a.dark}"/>`;
    if (id === "kangaroo") return `<ellipse cx="${-13 * k}" cy="${-34 * k}" rx="${7 * k}" ry="${17 * k}" fill="${a.fur}" transform="rotate(-14 ${-13 * k} ${-34 * k})"/><ellipse cx="${13 * k}" cy="${-34 * k}" rx="${7 * k}" ry="${17 * k}" fill="${a.fur}" transform="rotate(14 ${13 * k} ${-34 * k})"/><ellipse cx="${-13 * k}" cy="${-33 * k}" rx="${3.5 * k}" ry="${11 * k}" fill="#f2b5a8" transform="rotate(-14 ${-13 * k} ${-33 * k})"/><ellipse cx="${13 * k}" cy="${-33 * k}" rx="${3.5 * k}" ry="${11 * k}" fill="#f2b5a8" transform="rotate(14 ${13 * k} ${-33 * k})"/>`;
    if (id === "possum") return `<ellipse cx="${-23 * k}" cy="${-22 * k}" rx="${11 * k}" ry="${13 * k}" fill="${a.fur}"/><ellipse cx="${23 * k}" cy="${-22 * k}" rx="${11 * k}" ry="${13 * k}" fill="${a.fur}"/><ellipse cx="${-23 * k}" cy="${-21 * k}" rx="${6.5 * k}" ry="${8.5 * k}" fill="#f3b9c6"/><ellipse cx="${23 * k}" cy="${-21 * k}" rx="${6.5 * k}" ry="${8.5 * k}" fill="#f3b9c6"/>`;
    if (id === "koala") return `<circle cx="${-27 * k}" cy="${-22 * k}" r="${14 * k}" fill="${a.fur}"/><circle cx="${27 * k}" cy="${-22 * k}" r="${14 * k}" fill="${a.fur}"/><circle cx="${-27 * k}" cy="${-21 * k}" r="${8 * k}" fill="#f3c9d2"/><circle cx="${27 * k}" cy="${-21 * k}" r="${8 * k}" fill="#f3c9d2"/>`;
    if (id === "echidna") {
      let out = "";
      for (let i = 0; i < 11; i++) {
        const ang = ((-170 + i * 16) * Math.PI) / 180, w = 0.13;
        const p = (r, d) => `${(Math.cos(ang + d) * r * k).toFixed(1)} ${(Math.sin(ang + d) * r * k).toFixed(1)}`;
        out += `<path d="M${p(24, -w)} L${p(44, 0)} L${p(24, w)}Z" fill="${a.dark}"/><path d="M${p(36, -0.03)} L${p(44, 0)} L${p(36, 0.03)}Z" fill="#f4e6d2"/>`;
      }
      return out;
    }
    return "";
  }
  function animalSnout(id, a, k) {
    if (id === "wombat") return `<ellipse cx="0" cy="${9 * k}" rx="${11 * k}" ry="${8 * k}" fill="${a.dark}"/><ellipse cx="${-3 * k}" cy="${6 * k}" rx="${3 * k}" ry="${1.6 * k}" fill="#fff" opacity=".35"/>`;
    if (id === "kangaroo") return `<ellipse cx="0" cy="${11 * k}" rx="${13 * k}" ry="${10 * k}" fill="${a.light}"/><ellipse cx="0" cy="${6 * k}" rx="${4.5 * k}" ry="${3.2 * k}" fill="#4a2f20"/>`;
    if (id === "possum") return `<ellipse cx="0" cy="${10 * k}" rx="${12 * k}" ry="${10 * k}" fill="${a.light}"/><ellipse cx="0" cy="${6 * k}" rx="${4 * k}" ry="${3 * k}" fill="#e57b94"/>`;
    if (id === "koala") return `<ellipse cx="0" cy="${8 * k}" rx="${8 * k}" ry="${10 * k}" fill="${a.dark}"/><ellipse cx="${-2.5 * k}" cy="${4 * k}" rx="${2.4 * k}" ry="${1.5 * k}" fill="#fff" opacity=".35"/>`;
    if (id === "echidna") return `<path d="M${-5 * k} ${4 * k} Q0 ${26 * k} ${5 * k} ${4 * k}Z" fill="${a.dark}"/>`;
    return `<ellipse cx="0" cy="${15 * k}" rx="${21 * k}" ry="${9 * k}" fill="${a.dark}"/><ellipse cx="0" cy="${12 * k}" rx="${16 * k}" ry="${4 * k}" fill="#5a5450"/><circle cx="${-5 * k}" cy="${12 * k}" r="${1.4 * k}" fill="#222"/><circle cx="${5 * k}" cy="${12 * k}" r="${1.4 * k}" fill="#222"/>`;
  }
  function animalSvg(id, mood) {
    const a = PAL[id] || PAL.wombat;
    const eyes = mood === "happy"
      ? '<path d="M-17 -4 q6 -8 12 0 M5 -4 q6 -8 12 0" stroke="#222" stroke-width="3" fill="none" stroke-linecap="round"/>'
      : '<circle cx="-11" cy="-4" r="7" fill="#222"/><circle cx="11" cy="-4" r="7" fill="#222"/><circle cx="-8.5" cy="-7" r="2.8" fill="#fff"/><circle cx="13.5" cy="-7" r="2.8" fill="#fff"/><circle cx="-13" cy="-1" r="1.2" fill="#fff"/><circle cx="9" cy="-1" r="1.2" fill="#fff"/>'
        + (mood === "sad" ? '<path d="M-19 -13 l9 -3 M19 -13 l-9 -3" stroke="#3a2a20" stroke-width="2.2" stroke-linecap="round"/>' : "");
    const blush = '<ellipse cx="-21" cy="8" rx="5.5" ry="3.4" fill="#ff9fb4" opacity=".75"/><ellipse cx="21" cy="8" rx="5.5" ry="3.4" fill="#ff9fb4" opacity=".75"/>';
    const hasMouth = id !== "platypus" && id !== "echidna";
    const mouth = !hasMouth ? "" : mood === "happy" ? '<path d="M-6 17 q6 8 12 0z" fill="#c2405e"/>'
      : mood === "sad" ? '<path d="M-5 22 q5 -5 10 0" stroke="#3a2a20" stroke-width="1.8" fill="none" stroke-linecap="round"/>'
      : '<path d="M-4 19 q2 3 4 0 q2 3 4 0" stroke="#3a2a20" stroke-width="1.8" fill="none" stroke-linecap="round"/>';
    const k = 26 / 30;
    return `<svg viewBox="-50 -58 100 108" aria-hidden="true"><g transform="translate(0 6)">${animalEars(id, a, 32 / 30)}
      <ellipse cx="0" cy="8" rx="36" ry="34" fill="${a.fur}"/><ellipse cx="-10" cy="-14" rx="12" ry="7" fill="#fff" opacity=".18"/>
      <ellipse cx="0" cy="24" rx="20" ry="13" fill="${a.light}" opacity=".7"/>
      ${animalSnout(id, a, k)}${eyes}${blush}${mouth}
      <ellipse cx="-14" cy="41" rx="9" ry="5" fill="${a.dark}"/><ellipse cx="14" cy="41" rx="9" ry="5" fill="${a.dark}"/></g></svg>`;
  }
  const TREATS = [
    // lamington, fairy bread, pavlova, Anzac biscuit, cupcake
    `<svg viewBox="-20 -20 40 30" aria-hidden="true"><ellipse cy="6" rx="18" ry="4.5" fill="#fff"/><rect x="-12" y="-11" width="24" height="15" rx="3" fill="#7a4a30"/><g fill="#fff" opacity=".85"><circle cx="-7" cy="-7" r="1.2"/><circle cx="-1" cy="-4" r="1.2"/><circle cx="5" cy="-8" r="1.2"/><circle cx="8" cy="-2" r="1.2"/><circle cx="-5" cy="0" r="1.2"/></g></svg>`,
    `<svg viewBox="-20 -20 40 30" aria-hidden="true"><ellipse cy="6" rx="18" ry="4.5" fill="#fff"/><path d="M-13 3 L0 -14 L13 3Z" fill="#fff2c8" stroke="#e8c98a" stroke-width="1.5"/><g><circle cx="-4" cy="-3" r="1.3" fill="#ff5c8a"/><circle cx="2" cy="-7" r="1.3" fill="#4dabf7"/><circle cx="4" cy="-1" r="1.3" fill="#ffd43b"/><circle cx="-1" cy="0" r="1.3" fill="#38d9a9"/><circle cx="0" cy="-10" r="1.1" fill="#b197fc"/></g></svg>`,
    `<svg viewBox="-20 -20 40 30" aria-hidden="true"><ellipse cy="6" rx="18" ry="4.5" fill="#fff"/><path d="M-13 3 Q-13 -10 0 -12 Q13 -10 13 3Z" fill="#fffaf2" stroke="#ecdcc5" stroke-width="1.4"/><circle cx="-4" cy="-11" r="3" fill="#e8476a"/><circle cx="3" cy="-12" r="2.6" fill="#5b3fa8"/><path d="M6 -14 l4 -2 -1 4z" fill="#3fae5a"/></svg>`,
    `<svg viewBox="-20 -20 40 30" aria-hidden="true"><ellipse cy="6" rx="18" ry="4.5" fill="#fff"/><ellipse cx="-4" cy="-1" rx="10" ry="5.5" fill="#d9993f"/><ellipse cx="5" cy="-6" rx="10" ry="5.5" fill="#e8b25a"/><g fill="#a86a22"><circle cx="2" cy="-7" r="1"/><circle cx="8" cy="-5" r="1"/><circle cx="-6" cy="-1" r="1"/></g></svg>`,
    `<svg viewBox="-20 -20 40 30" aria-hidden="true"><ellipse cy="6" rx="18" ry="4.5" fill="#fff"/><path d="M-9 -2 L-6 5 H6 L9 -2Z" fill="#6ec3ff"/><path d="M-10 -2 Q-10 -12 0 -13 Q10 -12 10 -2Z" fill="#ffc1d6"/><circle cy="-15" r="2.8" fill="#e8476a"/></svg>`,
  ];
  const cafe = {
    init() {
      G.level = 1;
      G.levelTime = SPEED.cafe[G.mode] || 45;
      G.quick = SPEED.cafeQuick[G.mode] || 4;
      layer.innerHTML = hudHtml(t("ttgCafe")) + `
        <div class="ttg-cafe">
          <div class="ttg-cafe-bunting" aria-hidden="true"></div>
          <div class="ttg-cafe-goal">
            <span>${esc(L("Level", "레벨"))} <b data-level>1</b></span>
            <span class="ttg-cafe-money">${esc(L("Score", "점수"))} <b data-earned>0</b> / <span data-target>0</span></span>
          </div>
          <div class="ttg-timebar"><i data-bar></i><span data-time></span></div>
          <div class="ttg-cafe-room">
            <div class="ttg-bubble" data-q></div>
            <div class="ttg-customer" data-customer></div>
          </div>
          <div class="ttg-counter" data-treats></div>
          <div class="ttg-banner" data-banner hidden></div>
        </div>`;
      layer.querySelector("[data-treats]").addEventListener("click", (e) => {
        const b = e.target.closest("[data-v]");
        if (b) cafe.serve(b);
      });
      cafe.startLevel();
    },
    startLevel() {
      G.target = 50 + (G.level - 1) * 30; // points to clear this level (10 a treat, 20 when served quickly)
      G.levelEarned = 0;
      G.left = G.levelTime;
      layer.querySelector("[data-level]").textContent = G.level;
      cafe.money();
      cafe.next();
    },
    money() {
      layer.querySelector("[data-earned]").textContent = String(G.levelEarned);
      layer.querySelector("[data-target]").textContent = String(G.target);
      setStat(`${L("Score", "점수")} <b>${G.score}</b> · ${Math.min(G.shown, G.n)}/${G.n}`);
    },
    next() {
      if (roundOver()) { endRound(outReason()); return; }
      G.p = nextProblem();
      G.lock = false;
      let kind = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
      if (kind === G.kind) kind = ANIMALS[(ANIMALS.indexOf(kind) + 1) % ANIMALS.length];
      G.kind = kind;
      const cust = layer.querySelector("[data-customer]");
      cust.innerHTML = animalSvg(kind, "");
      cust.classList.remove("is-in");
      void cust.offsetWidth;
      cust.classList.add("is-in");
      const q = layer.querySelector("[data-q]");
      q.textContent = `${G.p.a} × ${G.p.b}`;
      q.classList.remove("is-ok", "is-bad");
      const treats = shuffle(TREATS);
      layer.querySelector("[data-treats]").innerHTML = choices(G.p, CHOICES.cafe).map((v, i) =>
        `<button type="button" class="ttg-treat" data-v="${v}" aria-label="${v}">${treats[i % treats.length]}<b>${v}</b></button>`).join("");
      cafe.money(); // the HUD's "n/N" counts this sum
    },
    serve(btn) {
      if (G.lock) return;
      G.lock = true;
      const ok = Number(btn.dataset.v) === G.p.product;
      scoreAnswer(G.p, ok);
      const cust = layer.querySelector("[data-customer]");
      const q = layer.querySelector("[data-q]");
      const at = centerOf(cust);
      if (ok) {
        const pay = 10 + (G.clock - G.askedAt <= G.quick ? 10 : 0);
        G.levelEarned += pay;
        G.score += pay;
        btn.classList.add("is-served");
        cust.innerHTML = animalSvg(G.kind, "happy");
        q.textContent = L("Yum, thanks!", "맛있어요, 고마워요!");
        q.classList.add("is-ok");
        floatText(at.x, at.y - 30, `+${pay}`, "is-good");
        cafe.money();
        if (G.levelEarned >= G.target) { later(700, cafe.levelUp); return; }
        later(750, cafe.next);
      } else {
        btn.classList.add("is-miss");
        cust.innerHTML = animalSvg(G.kind, "sad");
        q.textContent = `${G.p.a} × ${G.p.b} = ${G.p.product}`;
        q.classList.add("is-bad");
        const right = layer.querySelector(`[data-v="${G.p.product}"]`);
        if (right) right.classList.add("is-answer");
        revealAnswer(G.p);
        later(REVEAL_MS, cafe.next);
      }
    },
    levelUp() {
      const ban = layer.querySelector("[data-banner]");
      ban.textContent = L(`Level ${G.level} clear! 🎉`, `레벨 ${G.level} 성공! 🎉`);
      ban.hidden = false;
      G.lock = true;
      G.pauseClock = true;
      later(1400, () => {
        ban.hidden = true;
        G.pauseClock = false;
        G.level++;
        cafe.startLevel();
      });
    },
    tick(dt) {
      if (G.pauseClock || G.reveal) return;
      G.left -= dt;
      const f = Math.max(0, G.left / G.levelTime);
      const bar = layer.querySelector("[data-bar]");
      if (bar) { bar.style.transform = `scaleX(${f})`; bar.classList.toggle("is-low", G.left < 10); }
      const tm = layer.querySelector("[data-time]");
      if (tm) tm.textContent = fmtTime(G.left);
      if (G.left <= 0) endRound("time");
    },
    key(e) {
      const n = Number(e.key);
      if (n >= 1 && n <= CHOICES.cafe) {
        const b = layer.querySelectorAll("[data-v]")[n - 1];
        if (b) cafe.serve(b);
        return true;
      }
      return false;
    },
  };

  const GAMES = { calc, whack, cafe, match, claw };

  // A small koala (same look as the tile pictures) for the calculator scene.
  const KOALA_SVG = `<svg viewBox="-32 -32 64 58" aria-hidden="true"><circle cx="-17" cy="-10" r="11" fill="#9aa5ad"/><circle cx="-17" cy="-10" r="6" fill="#f3c9d2"/><circle cx="17" cy="-10" r="11" fill="#9aa5ad"/><circle cx="17" cy="-10" r="6" fill="#f3c9d2"/><ellipse cx="0" cy="2" rx="19" ry="17" fill="#b4bec5"/><circle cx="-7" cy="-1" r="2.6" fill="#22313a"/><circle cx="7" cy="-1" r="2.6" fill="#22313a"/><circle cx="-6.2" cy="-1.8" r=".9" fill="#fff"/><circle cx="7.8" cy="-1.8" r=".9" fill="#fff"/><ellipse cx="0" cy="7" rx="5.5" ry="6.5" fill="#33414a"/><circle cx="-12" cy="8" r="3" fill="#f6a7b6" opacity=".7"/><circle cx="12" cy="8" r="3" fill="#f6a7b6" opacity=".7"/><ellipse cx="0" cy="22" rx="14" ry="6" fill="#b4bec5"/></svg>`;

  /* ---------- wiring ---------- */
  tiles.addEventListener("click", (e) => {
    const b = e.target.closest("[data-ttg]");
    if (b) start(b.dataset.ttg);
  });
  layer.addEventListener("click", (e) => {
    if (!G) return;
    if (e.target.closest(".ttg-quit")) { endRound("manual"); return; }
    if (e.target.closest(".ttg-mute")) {
      muteBtn.click(); // the Balloon Pop sound switch is the one shared setting
      e.target.closest(".ttg-mute").textContent = timesTableMuted ? "🔇" : "🔊";
    }
  });
  // The ✕ in the corner of the result card: back to the game picker.
  const closeBtn = document.getElementById("timestable-over-close");
  if (closeBtn) closeBtn.addEventListener("click", () => {
    overOverlay.hidden = true;
    resetTimesTable();
  });
  // While a tile game runs it owns the keyboard (Balloon Pop's shortcuts would pause/end the hidden game).
  window.addEventListener("keydown", (e) => {
    if (!G || !view.classList.contains("active") || modalOpen()) return;
    const ae = document.activeElement;
    if (ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.isContentEditable)) return;
    if (e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); endRound("manual"); return; }
    if (GAMES[G.id].key(e)) e.preventDefault();
    e.stopImmediatePropagation();
  }, true);

  window.TTGames = {
    start,
    active: () => !!G,
    last: () => last,
    markBalloon: () => { last = "balloon"; clearScene(); },
    clear: clearScene, // called by resetTimesTable() when the picker comes back
  };
})();
