/* Customer side of support: the "Contact us" form, the "My messages" card in
   My Account (a thread per inquiry), the unread dot, and the announcement
   banner. Loaded after app.js, so it can use app.js's globals (api, rwL,
   escapeHtml, currentUser, currentLang, goToTab ...). The admin side lives in
   admin-cs.js; the server side in worker/support.js. */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const L = (en, ko) => rwL(en, ko);

  /* ---------- shared helpers (also used by admin-cs.js) ---------- */

  function fmtTime(ms) {
    if (!ms) return "";
    return new Date(ms).toLocaleString(currentLang === "ko" ? "ko-KR" : "en-AU", {
      day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
    });
  }

  // "5 min ago" / "3 h ago" / "2 d ago", then a date for anything older.
  function ago(ms) {
    const s = Math.max(0, (Date.now() - ms) / 1000);
    if (s < 60) return L("just now", "방금");
    if (s < 3600) return L(`${Math.floor(s / 60)} min ago`, `${Math.floor(s / 60)}분 전`);
    if (s < 86400) return L(`${Math.floor(s / 3600)} h ago`, `${Math.floor(s / 3600)}시간 전`);
    if (s < 7 * 86400) return L(`${Math.floor(s / 86400)} d ago`, `${Math.floor(s / 86400)}일 전`);
    return new Date(ms).toLocaleDateString(currentLang === "ko" ? "ko-KR" : "en-AU", { day: "numeric", month: "short" });
  }

  const CATEGORIES = [
    ["question", "❓ A question", "❓ 궁금한 점"],
    ["bug", "🐞 Something isn't working", "🐞 작동이 이상해요"],
    ["account", "👤 Login or account", "👤 로그인 / 계정"],
    ["payment", "⭐ Premium or payment", "⭐ 프리미엄 / 결제"],
    ["other", "💬 Something else", "💬 기타"],
  ];
  const categoryLabel = (key) => {
    const c = CATEGORIES.find((x) => x[0] === key) || CATEGORIES[4];
    return L(c[1], c[2]);
  };

  // What the customer sees vs. what the admin sees for the same status.
  const customerStatus = (s) =>
    s === "resolved" ? L("Solved", "해결됨") : s === "pending" ? L("We replied", "답변 도착") : L("Waiting for us", "답변 대기 중");
  const adminStatus = (s) =>
    s === "resolved" ? L("Resolved", "해결") : s === "pending" ? L("Waiting on customer", "고객 답변 대기") : L("Needs reply", "답변 필요");

  window.koalaCS = { fmtTime, ago, categoryLabel, customerStatus, adminStatus, CATEGORIES };

  const errText = (e) => {
    const code = e && e.data && e.data.error;
    if (code === "invalid_email") return L("Please enter a valid email address so we can reply.", "답변을 받을 이메일 주소를 정확히 입력해 주세요.");
    if (code === "message_required") return L("Please write your message first.", "내용을 먼저 적어 주세요.");
    if (code === "too_many") return L("You've sent quite a few messages — please try again a little later.", "메시지를 많이 보내셨어요. 잠시 후 다시 시도해 주세요.");
    return L("Could not send that. Please try again.", "보내지 못했어요. 다시 시도해 주세요.");
  };

  /* ---------- Contact us overlay ---------- */

  const overlay = $("contact-overlay");
  const form = $("contact-form");
  const catSel = $("contact-category");
  const emailInput = $("contact-email");
  const msgInput = $("contact-message");
  const errEl = $("contact-error");
  const okEl = $("contact-success");
  const sendBtn = $("contact-send-btn");

  function needsEmail() {
    return !currentUser || !currentUser.email;
  }

  function localizeContact() {
    $("contact-title").textContent = L("💬 Contact us", "💬 문의하기");
    $("contact-lead").textContent = currentUser
      ? L("Write to us and we'll answer here, in My Account → My messages.", "문의를 남기면 내 계정 → 내 메시지에서 답변을 확인할 수 있어요.")
      : L("Write to us and we'll answer by email.", "문의를 남기면 이메일로 답변해 드려요.");
    $("contact-category-lbl").textContent = L("What is it about?", "어떤 내용인가요?");
    const keep = catSel.value;
    catSel.innerHTML = CATEGORIES.map(([k, en, ko]) => `<option value="${k}">${escapeHtml(L(en, ko))}</option>`).join("");
    if (keep) catSel.value = keep;
    $("contact-email-lbl").textContent = currentUser ? L("Email (optional)", "이메일 (선택)") : L("Your email", "이메일");
    emailInput.placeholder = L("name@example.com", "name@example.com");
    $("contact-message-lbl").textContent = L("Your message", "내용");
    $("contact-cancel-btn").textContent = L("Cancel", "취소");
    sendBtn.textContent = L("Send", "보내기");
    emailInput.hidden = !needsEmail();
    $("contact-email-lbl").hidden = !needsEmail();
  }

  function openContact(category) {
    localizeContact();
    errEl.hidden = true;
    okEl.hidden = true;
    sendBtn.disabled = false;
    if (category && CATEGORIES.some((c) => c[0] === category)) catSel.value = category;
    overlay.hidden = false;
    msgInput.focus();
  }
  function closeContact() {
    overlay.hidden = true;
  }

  $("contact-open-btn").addEventListener("click", () => openContact());
  $("contact-cancel-btn").addEventListener("click", closeContact);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeContact();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.hidden) closeContact();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errEl.hidden = true;
    const message = msgInput.value.trim();
    const email = emailInput.value.trim();
    if (!message) {
      errEl.textContent = errText({ data: { error: "message_required" } });
      errEl.hidden = false;
      return;
    }
    if (!currentUser && !validEmailClient(email)) {
      errEl.textContent = errText({ data: { error: "invalid_email" } });
      errEl.hidden = false;
      return;
    }
    sendBtn.disabled = true;
    try {
      await api("/support/tickets", {
        method: "POST",
        body: JSON.stringify({ category: catSel.value, message, email, website: $("contact-website").value }),
      });
      msgInput.value = "";
      okEl.textContent = currentUser
        ? L("Thank you! We got your message. Look for our answer in My Account → My messages.", "고마워요! 문의가 접수됐어요. 답변은 내 계정 → 내 메시지에서 볼 수 있어요.")
        : L("Thank you! We got your message and will answer by email.", "고마워요! 문의가 접수됐어요. 이메일로 답변해 드릴게요.");
      okEl.hidden = false;
      renderAccountCard();
      setTimeout(closeContact, 2200);
    } catch (err) {
      errEl.textContent = errText(err);
      errEl.hidden = false;
      sendBtn.disabled = false;
    }
  });

  /* ---------- My Account → My messages ---------- */

  const listView = $("my-account-support-list-view");
  const threadView = $("my-account-support-thread-view");
  const listEl = $("my-account-support-list");
  const emptyEl = $("my-account-support-empty");
  let openTicketId = null;

  function localizeAccountCard() {
    $("my-account-support-title").textContent = L("💬 My messages", "💬 내 메시지");
    $("my-account-support-desc").textContent = L("Questions or problems? Write to us here and read our answers.", "궁금한 점이나 문제가 있으면 여기에 남겨 주세요. 답변도 여기서 볼 수 있어요.");
    $("my-account-support-new-btn").textContent = L("Write a message", "문의 남기기");
    emptyEl.textContent = L("No messages yet.", "아직 메시지가 없어요.");
  }

  async function renderAccountCard() {
    const card = $("my-account-support-card");
    if (!card) return;
    card.hidden = !currentUser;
    if (!currentUser) return;
    localizeAccountCard();
    if (openTicketId) return; // keep the open thread as it is
    showList();
    try {
      const { tickets, unread } = await api("/support/mine");
      setUnread(unread);
      emptyEl.hidden = tickets.length > 0;
      listEl.innerHTML = tickets
        .map(
          (t) => `<button type="button" class="support-row${t.unread ? " is-unread" : ""}" data-ticket="${escapeHtml(t.id)}">
            <span class="support-row-main"><b>${escapeHtml(t.subject)}</b><small>${escapeHtml(categoryLabel(t.category))} · ${escapeHtml(ago(t.updatedAt))}</small></span>
            <span class="support-badge ${escapeHtml(t.status)}">${t.unread ? "● " : ""}${escapeHtml(customerStatus(t.status))}</span>
          </button>`
        )
        .join("");
    } catch (e) {
      listEl.innerHTML = "";
    }
  }

  function showList() {
    openTicketId = null;
    listView.hidden = false;
    threadView.hidden = true;
  }

  async function openThread(id) {
    openTicketId = id;
    listView.hidden = true;
    threadView.hidden = false;
    threadView.innerHTML = `<p class="muted">…</p>`;
    try {
      const { ticket, messages } = await api(`/support/ticket?id=${encodeURIComponent(id)}`);
      const solved = ticket.status === "resolved";
      threadView.innerHTML = `
        <button type="button" class="support-back" id="support-back-btn">← ${escapeHtml(L("Back", "목록"))}</button>
        <h3 class="support-thread-title">${escapeHtml(ticket.subject)}</h3>
        <p class="auth-hint">${escapeHtml(categoryLabel(ticket.category))} · <span class="support-badge ${escapeHtml(ticket.status)}">${escapeHtml(customerStatus(ticket.status))}</span></p>
        <div class="support-thread">${messages
          .map(
            (m) => `<div class="support-msg ${m.from === "admin" ? "from-team" : "from-me"}">
              <div class="support-msg-who">${escapeHtml(m.from === "admin" ? L("Koala Study Mate team", "코알라 스터디 메이트 팀") : L("You", "나"))} · ${escapeHtml(fmtTime(m.createdAt))}</div>
              <div class="support-msg-body">${escapeHtml(m.body)}</div>
            </div>`
          )
          .join("")}</div>
        <p id="support-reply-error" class="auth-error" hidden></p>
        <textarea id="support-reply-text" class="admin-textarea" rows="3" maxlength="2000" placeholder="${escapeHtml(solved ? L("Write here to reopen this message", "다시 문의하려면 여기에 적어 주세요") : L("Write a reply…", "답장을 적어 주세요…"))}"></textarea>
        <div class="auth-actions auth-actions-start">
          <button type="button" class="pill accent" id="support-reply-btn">${escapeHtml(L("Send", "보내기"))}</button>
          ${solved ? "" : `<button type="button" class="pill neutral" id="support-close-btn">${escapeHtml(L("✓ It's solved", "✓ 해결됐어요"))}</button>`}
        </div>`;
      $("support-back-btn").addEventListener("click", () => { showList(); renderAccountCard(); });
      $("support-reply-btn").addEventListener("click", async () => {
        const text = $("support-reply-text").value.trim();
        const err = $("support-reply-error");
        err.hidden = true;
        if (!text) return;
        $("support-reply-btn").disabled = true;
        try {
          await api("/support/reply", { method: "POST", body: JSON.stringify({ ticketId: id, message: text }) });
          openThread(id);
        } catch (e) {
          err.textContent = errText(e);
          err.hidden = false;
          $("support-reply-btn").disabled = false;
        }
      });
      const closeBtn = $("support-close-btn");
      if (closeBtn) {
        closeBtn.addEventListener("click", async () => {
          try { await api("/support/close", { method: "POST", body: JSON.stringify({ ticketId: id }) }); } catch (e) { /* shown as unchanged */ }
          openThread(id);
        });
      }
      refreshUnread();
    } catch (e) {
      showList();
      renderAccountCard();
    }
  }

  listEl.addEventListener("click", (e) => {
    const row = e.target.closest("[data-ticket]");
    if (row) openThread(row.dataset.ticket);
  });
  $("my-account-support-new-btn").addEventListener("click", () => openContact());

  /* ---------- unread dot ---------- */

  function setUnread(n) {
    document.body.classList.toggle("has-support-unread", n > 0);
  }

  async function refreshUnread() {
    if (!currentUser) return setUnread(0);
    try {
      const { unread } = await api("/support/mine");
      setUnread(unread);
    } catch (e) {
      /* offline or signed out — leave the dot alone */
    }
  }

  let lastUserId = null;
  function onAuthChange() {
    const id = currentUser ? currentUser.id : null;
    if (id === lastUserId) return;
    lastUserId = id;
    openTicketId = null;
    refreshUnread();
    localizeContact();
  }

  /* ---------- announcement banner ---------- */

  const notice = $("site-notice");
  async function loadNotice() {
    try {
      const a = await api("/announcement");
      let dismissed = null;
      try { dismissed = sessionStorage.getItem("ksm_notice_dismissed"); } catch (e) { /* private mode */ }
      const key = a.text ? `${a.updatedAt}` : "";
      if (a.text && dismissed !== key) {
        $("site-notice-text").textContent = a.text;
        notice.dataset.key = key;
        notice.hidden = false;
      } else {
        notice.hidden = true;
      }
    } catch (e) {
      /* no banner if the API can't be reached */
    }
  }
  $("site-notice-close").addEventListener("click", () => {
    notice.hidden = true;
    try { sessionStorage.setItem("ksm_notice_dismissed", notice.dataset.key || ""); } catch (e) { /* private mode */ }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") { loadNotice(); refreshUnread(); }
  });

  /* ---------- public hooks used by app.js ---------- */

  function localize() {
    $("contact-open-btn").textContent = L("💬 Contact us", "💬 문의하기");
    localizeContact();
    localizeAccountCard();
    if (currentUser && !openTicketId) renderAccountCard();
  }

  window.koalaSupportUI = { localize, onAuthChange, renderAccountCard, refreshUnread, openContact };
  localize();
  loadNotice();
  onAuthChange();
})();
