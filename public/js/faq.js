/* Help centre: the FAQ list shown from the login/sign-up windows and from
   My Account → Help. Goal: let people find the answer themselves first; the
   small "Contact us" link at the bottom is the last resort. Loaded after
   support.js; uses its globals (rwL, escapeHtml) and window.koalaSupportUI. */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const L = (en, ko) => rwL(en, ko);

  // The questions live in scripts/faq-data.json (one source for this Help, the /faq page and the About page);
  // `npm run gen:faq` writes them to js/faq-data.js as window.KOALA_FAQ.
  const GROUPS = (window.KOALA_FAQ && window.KOALA_FAQ.groups) || [];
  const pick = (o) => (rwL(o.en, o.ko));

  function listHtml() {
    return GROUPS.map(
      (g) =>
        `<h4 class="faq-group-title">${escapeHtml(pick(g.title))}</h4>` +
        g.items.map((it) => `<details class="faq-item"><summary>${escapeHtml(pick(it.q))}</summary><p>${escapeHtml(pick(it.a))}</p></details>`).join("")
    ).join("");
  }

  function contactHtml() {
    return `<p class="faq-foot"><a class="faq-web-link" href="/faq" target="_blank" rel="noopener">${escapeHtml(L("See all questions on the web", "웹에서 모든 질문 보기"))} ↗</a><br>${escapeHtml(L("Can't find your answer?", "답을 찾지 못하셨나요?"))} <button type="button" class="faq-contact-link" data-faq-contact>${escapeHtml(L("Contact us", "문의하기"))}</button></p>`;
  }

  /* ---------- overlay (from login / sign-up) ---------- */
  const overlay = $("faq-overlay");
  function renderOverlay() {
    $("faq-title").textContent = L("Help", "도움말");
    $("faq-lead").textContent = L("Most questions are answered here.", "궁금한 점은 대부분 여기서 해결돼요.");
    $("faq-body").innerHTML = listHtml() + contactHtml();
    $("faq-close-btn").textContent = L("Close", "닫기");
  }
  function open() {
    renderOverlay();
    overlay.hidden = false;
    $("faq-body").scrollTop = 0;
  }
  function close() {
    overlay.hidden = true;
  }
  $("faq-close-btn").addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.hidden) close();
  });
  overlay.addEventListener("click", (e) => {
    if (e.target.closest("[data-faq-contact]")) {
      close();
      window.koalaSupportUI && koalaSupportUI.openContact();
    }
  });

  /* ---------- My Account: Messages | Help tabs ---------- */
  const tabs = document.querySelectorAll("[data-acct-tab]");
  const msgPane = $("my-account-msg-pane");
  const faqPane = $("my-account-faq-pane");
  function setAcctTab(name) {
    tabs.forEach((b) => {
      const on = b.dataset.acctTab === name;
      b.classList.toggle("active", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
    msgPane.hidden = name !== "messages";
    faqPane.hidden = name !== "faq";
    if (name === "faq") faqPane.innerHTML = listHtml() + contactHtml();
  }
  tabs.forEach((b) => b.addEventListener("click", () => setAcctTab(b.dataset.acctTab)));
  faqPane.addEventListener("click", (e) => {
    if (e.target.closest("[data-faq-contact]")) window.koalaSupportUI && koalaSupportUI.openContact();
  });

  function localize() {
    const lbl = { messages: L("Messages", "내 메시지"), faq: L("FAQ", "자주 묻는 질문") };
    tabs.forEach((b) => (b.textContent = lbl[b.dataset.acctTab]));
    if (!faqPane.hidden) faqPane.innerHTML = listHtml() + contactHtml();
    if (!overlay.hidden) renderOverlay();
  }

  window.koalaFAQ = { open, close, localize };
  localize();
})();
