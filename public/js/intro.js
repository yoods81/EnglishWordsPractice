/* First-visit landing (#intro, 2026-11-22 — docs/landing-plan.md, L2 + A).
   Shown (html.intro-on, set by the <head> script) only to a signed-out visitor who has never used the app on this
   device. Any way into the app — Start free, the try-one-question "Keep playing", Log in / Sign up, or a signed-in
   session — ends it for good (ywp_intro_done). Uses app.js globals: currentUser, speak, applyLevel, goToTab,
   switchLanguage, openAuthOverlay, currentLang. */
(function () {
  const root = document.documentElement;
  const DONE = "ywp_intro_done";
  const $ = (id) => document.getElementById(id);
  const ko = () => root.lang === "ko";

  function markDone() { try { localStorage.setItem(DONE, "1"); localStorage.removeItem("ywp_intro_pending"); } catch (e) { /* private mode: shows again next time */ } }
  // Leave the landing and land in the app (optionally on a level / screen).
  function enterApp(opts) {
    opts = opts || {};
    markDone();
    root.classList.remove("intro-on");
    window.scrollTo(0, 0);
    if (opts.level && typeof applyLevel === "function") applyLevel(opts.level);
    if (opts.view && typeof goToTab === "function") goToTab(opts.view);
  }
  window.introHide = function () { if (root.classList.contains("intro-on")) enterApp(); else markDone(); };

  if (!$("intro")) return;

  // ---- Start free / Log in / Sign up ----
  document.querySelectorAll("[data-intro-start]").forEach((b) => b.addEventListener("click", () => enterApp()));
  // START FREE (free-month offer): into the app with sign-up open on Premium = the free month (no card).
  document.querySelectorAll("[data-intro-trial]").forEach((b) => b.addEventListener("click", () => {
    enterApp();
    if (typeof openAuthOverlay === "function") openAuthOverlay("signup");
    if (typeof setSignupPlan === "function") setSignupPlan("premium");
  }));
  // Is the free-month offer on? (worker/trial.js) — swaps the hero to the offer.
  fetch("/api/billing/trial", { credentials: "same-origin" }).then((r) => r.json()).then((d) => {
    if (!d || !d.promo || !d.promo.active) return;
    $("intro").classList.add("is-promo");
    const end = Date.parse(d.promo.end + "T12:00:00+11:00");
    document.querySelectorAll(".intro-promo-end").forEach((el) => {
      el.textContent = new Date(end).toLocaleDateString(el.closest(".t-ko") ? "ko-KR" : "en-AU", { day: "numeric", month: "long", timeZone: "Australia/Sydney" });
    });
  }).catch(() => {});
  $("intro-login").addEventListener("click", () => { if (typeof openAuthOverlay === "function") openAuthOverlay("login"); });
  $("intro-signup").addEventListener("click", () => { enterApp({ level: year }); if (typeof openAuthOverlay === "function") openAuthOverlay("signup"); });
  $("intro-lang").addEventListener("click", () => {
    const next = ko() ? "en" : "ko";
    if (typeof switchLanguage === "function") switchLanguage(next);
    root.lang = next;
    renderWord();
  });

  // ---- Weekly report sample ----
  $("intro-sample-btn").addEventListener("click", () => {
    const box = $("intro-sample"), open = box.hidden;
    box.hidden = !open;
    $("intro-sample-btn").setAttribute("aria-expanded", String(open));
  });

  // ---- Prices (live from Stripe; the HTML numbers are the fallback) ----
  fetch("/api/billing/prices", { credentials: "same-origin" }).then((r) => r.json()).then((d) => {
    if (!d || !d.prices) return;
    const fmt = (p) => (String(p.currency).toLowerCase() === "aud" ? "AU$" : String(p.currency).toUpperCase() + " ") + (p.amount / 100).toFixed(2);
    $("intro-price-m").textContent = fmt(d.prices.month);
    document.querySelectorAll(".intro-price-m2").forEach((el) => { el.textContent = fmt(d.prices.month); });
    document.querySelectorAll(".intro-price-y").forEach((el) => { el.textContent = fmt(d.prices.year); });
  }).catch(() => {});

  // ---- Try one question: a fixed, easy word per year, built from letter tiles ----
  const WORDS = {
    elem_low: { word: "friend", en: "A person you like and trust.", ko: "친구 — 좋아하고 믿는 사람" },
    elem_high: { word: "grateful", en: "Feeling thankful for something.", ko: "고마워하는 — 무언가에 감사하는 마음" },
  };
  let year = "elem_low", built = [], solved = false;
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.join("") === WORDS[year].word ? shuffle(a) : a; };

  function say(text) {
    if (typeof speak === "function") { try { speak(text); return; } catch (e) { /* fall through */ } }
    try { const u = new SpeechSynthesisUtterance(text); u.lang = "en-AU"; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) { /* no voice */ }
  }
  function renderWord() {
    const w = WORDS[year];
    built = []; solved = false;
    $("intro-hint").textContent = ko() ? w.ko : w.en;
    $("intro-msg").textContent = ""; $("intro-msg").className = "intro-msg";
    $("intro-after").hidden = true;
    const tiles = $("intro-tiles"); tiles.innerHTML = "";
    shuffle(w.word.split("")).forEach((ch) => {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = ch; b.setAttribute("aria-label", ch);
      b.addEventListener("click", () => pick(b));
      tiles.appendChild(b);
    });
    renderSlots();
  }
  function renderSlots() {
    const w = WORDS[year].word, box = $("intro-slots");
    box.className = "intro-slots" + (solved ? " is-right" : "");
    box.innerHTML = "";
    for (let i = 0; i < w.length; i++) { const s = document.createElement("span"); s.textContent = built[i] ? built[i].textContent : ""; box.appendChild(s); }
    $("intro-undo").disabled = solved || !built.length;
  }
  function pick(btn) {
    if (solved || btn.disabled) return;
    btn.disabled = true; built.push(btn); renderSlots();
    const w = WORDS[year].word;
    if (built.length < w.length) return;
    if (built.map((b) => b.textContent).join("") === w) {
      solved = true; renderSlots();
      const m = $("intro-msg"); m.className = "intro-msg"; m.textContent = ko() ? "잘했어요! ✓" : "Nice one! ✓";
      $("intro-after").hidden = false;
      say(w);
    } else {
      const m = $("intro-msg"); m.className = "intro-msg is-wrong"; m.textContent = ko() ? "아쉬워요 — 다시 해 봐요" : "Not quite — try again";
      $("intro-slots").classList.add("is-wrong");
      setTimeout(() => { built.forEach((b) => { b.disabled = false; }); built = []; renderSlots(); }, 700);
    }
  }
  $("intro-undo").addEventListener("click", () => { const b = built.pop(); if (b) b.disabled = false; $("intro-msg").textContent = ""; renderSlots(); });
  $("intro-hear").addEventListener("click", () => say(WORDS[year].word));
  document.querySelectorAll("[data-intro-year]").forEach((tab) => tab.addEventListener("click", () => {
    year = tab.dataset.introYear;
    document.querySelectorAll("[data-intro-year]").forEach((t) => t.setAttribute("aria-selected", String(t === tab)));
    renderWord();
  }));
  // Keep playing: straight into Spelling at the chosen year.
  $("intro-keep").addEventListener("click", () => enterApp({ level: year, view: "spelling" }));

  renderWord();
})();
