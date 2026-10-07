/* Admin side of customer care: the tab bar, Overview ("needs your attention"),
   the customer inbox, the customer file (opened with "Manage" on an account),
   and the announcement banner editor. Loaded after app.js and support.js, so it
   shares their globals (api, rwL, escapeHtml, adminUsers, adminStats, ...). The
   account / coin / code / email lists themselves are still rendered by app.js. */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const L = (en, ko) => rwL(en, ko);
  const CS = window.koalaCS;
  const esc = (s) => escapeHtml(s == null ? "" : s);

  const TABS = ["overview", "customers", "inbox", "coins", "system"];
  let tab = "overview";
  let overview = null;
  let inboxFilter = "open";
  let inboxQuery = "";
  let inboxCounts = { open: 0, pending: 0, resolved: 0 };
  let openTicketId = null;
  let composeMode = "reply";

  const api2 = (path, body) => api(path, body === undefined ? {} : { method: "POST", body: JSON.stringify(body) });
  const warn = (msg) => alert(msg);
  const failMsg = () => L("Could not save that. Please try again.", "저장하지 못했어요. 다시 시도해 주세요.");

  /* ---------- tabs ---------- */

  function setTab(name) {
    if (!TABS.includes(name)) name = "overview";
    tab = name;
    document.querySelectorAll("[data-admin-tab]").forEach((b) => {
      const on = b.dataset.adminTab === name;
      b.classList.toggle("active", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
    document.querySelectorAll("[data-admin-pane]").forEach((p) => (p.hidden = p.dataset.adminPane !== name));
    if (name === "inbox") loadInbox();
    if (name === "system") fillNoticeCard();
  }

  function jump(name, opts = {}) {
    if (opts.inboxFilter) inboxFilter = opts.inboxFilter;
    if (opts.usersFilter) {
      api_usersFilter = opts.usersFilter;
      renderUserChips();
      if (typeof renderAdminUsers === "function") renderAdminUsers();
    }
    setTab(name);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  document.querySelectorAll("[data-admin-tab]").forEach((b) => b.addEventListener("click", () => setTab(b.dataset.adminTab)));

  /* ---------- localisation of the static bits ---------- */

  function localize() {
    const tabs = { overview: L("Overview", "개요"), customers: L("Customers", "고객"), inbox: L("Inbox", "문의함"), coins: L("Coins", "코인"), system: L("System", "설정") };
    document.querySelectorAll("[data-admin-label]").forEach((el) => (el.textContent = tabs[el.dataset.adminLabel] || ""));
    $("admin-stat-new-users-lbl").textContent = L("🆕 New (7 days)", "🆕 신규 (7일)");
    $("admin-stat-open-tickets-lbl").textContent = L("💬 Open inquiries", "💬 답변 대기 문의");
    $("admin-attention-title").textContent = L("Needs your attention", "확인이 필요해요");
    $("admin-users-desc").textContent = L(
      "Find an account and tap Manage for its role, password, notes and messages. Upgrade requests are pinned to the top.",
      "계정을 찾아 '관리'를 누르면 등급·비밀번호·메모·메시지를 다룰 수 있어요. 업그레이드 요청은 맨 위에 고정돼요."
    );
    $("admin-inbox-title").textContent = L("💬 Customer inbox", "💬 고객 문의함");
    $("admin-inbox-desc").textContent = L(
      "Messages from the Contact us form. Answer here — signed-in customers read it in My Account, and it can be emailed too.",
      "'문의하기'로 들어온 메시지예요. 여기서 답장하면 로그인한 고객은 내 계정에서 보고, 이메일로도 보낼 수 있어요."
    );
    $("admin-inbox-search").placeholder = L("Search subject, name or email", "제목, 이름, 이메일 검색");
    $("admin-notice-title").textContent = L("📢 Announcement banner", "📢 공지 배너");
    $("admin-notice-desc").textContent = L(
      "Show a short notice at the top of the app for everyone (maintenance, new feature, holiday hours). Visitors can close it.",
      "모든 사용자의 앱 맨 위에 짧은 공지를 보여줘요 (점검, 새 기능, 휴무 안내 등). 사용자는 닫을 수 있어요."
    );
    $("admin-notice-text").placeholder = L("e.g. Short maintenance tonight at 9pm.", "예: 오늘 밤 9시에 짧은 점검이 있어요.");
    $("admin-notice-active-lbl").textContent = L("Show the banner", "배너 보이기");
    $("admin-notice-save-btn").textContent = L("Save", "저장");
    renderUserChips();
    renderInboxChips();
    renderAttention();
  }

  /* ---------- overview ---------- */

  async function loadOverview() {
    try {
      overview = await api("/admin/overview");
    } catch (e) {
      overview = null;
      return;
    }
    $("admin-stat-new-users").textContent = overview.newUsers7d;
    $("admin-stat-open-tickets").textContent = overview.openTickets;
    const badge = $("admin-inbox-badge");
    badge.hidden = !overview.openTickets;
    badge.textContent = overview.openTickets > 99 ? "99+" : String(overview.openTickets);
    renderAttention();
    if (tab === "system") fillNoticeCard();
  }

  function renderAttention() {
    const list = $("admin-attention-list");
    if (!list) return;
    if (!overview) {
      list.innerHTML = "";
      return;
    }
    const o = overview;
    const items = [];
    const n = (x, one, many) => (x === 1 ? one : many);
    if (o.openTickets) items.push(["💬", L(`${o.openTickets} ${n(o.openTickets, "inquiry needs", "inquiries need")} a reply`, `답변이 필요한 문의 ${o.openTickets}건`), () => jump("inbox", { inboxFilter: "open" })]);
    if (o.pendingUpgrades) items.push(["⭐", L(`${o.pendingUpgrades} upgrade ${n(o.pendingUpgrades, "request", "requests")} waiting`, `업그레이드 요청 ${o.pendingUpgrades}건 대기 중`), () => jump("customers", { usersFilter: "all" })]);
    if (!o.emailConfigured) items.push(["✉️", L("Email sending is not set up", "이메일 발송이 설정되지 않았어요"), () => jump("system")]);
    if (o.failedEmails7d) items.push(["⚠️", L(`${o.failedEmails7d} ${n(o.failedEmails7d, "email", "emails")} failed to send this week`, `이번 주 이메일 ${o.failedEmails7d}건 발송 실패`), () => jump("system")]);
    if (o.unverified) items.push(["📭", L(`${o.unverified} ${n(o.unverified, "account hasn't", "accounts haven't")} confirmed their email`, `이메일 인증을 안 한 계정 ${o.unverified}개`), () => jump("customers", { usersFilter: "unconfirmed" })]);
    list.innerHTML = "";
    if (!items.length) {
      list.innerHTML = `<p class="admin-all-clear">${esc(L("🎉 All clear — nothing needs your attention.", "🎉 모두 확인했어요 — 처리할 일이 없어요."))}</p>`;
      return;
    }
    items.forEach(([ico, text, go]) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "admin-attention-item";
      b.innerHTML = `<span class="admin-attention-ico" aria-hidden="true">${ico}</span><span class="admin-attention-text">${esc(text)}</span><span class="admin-attention-go" aria-hidden="true">›</span>`;
      b.addEventListener("click", go);
      list.appendChild(b);
    });
  }

  /* ---------- customers: filter chips (the list itself is app.js's renderAdminUsers) ---------- */

  let api_usersFilter = "all";
  const USER_FILTERS = [
    ["all", "All", "전체"],
    ["paid", "Premium", "프리미엄"],
    ["free", "Free", "일반"],
    ["unconfirmed", "Email not confirmed", "이메일 미인증"],
  ];

  function userMatchesFilter(u, f) {
    if (f === "paid") return u.role === "paid";
    if (f === "free") return u.role === "free";
    if (f === "unconfirmed") return !!u.email && !u.emailVerified && u.role !== "admin";
    return true;
  }

  function renderUserChips() {
    const el = $("admin-users-filter");
    if (!el) return;
    const users = typeof adminUsers !== "undefined" ? adminUsers : [];
    el.innerHTML = USER_FILTERS.map(([k, en, ko]) => {
      const c = users.filter((u) => userMatchesFilter(u, k)).length;
      return `<button type="button" class="admin-chip${api_usersFilter === k ? " active" : ""}" data-users-filter="${k}">${esc(L(en, ko))}${k === "all" ? "" : ` <small>${c}</small>`}</button>`;
    }).join("");
  }
  $("admin-users-filter").addEventListener("click", (e) => {
    const b = e.target.closest("[data-users-filter]");
    if (!b) return;
    api_usersFilter = b.dataset.usersFilter;
    renderUserChips();
    renderAdminUsers();
  });

  /* ---------- inbox ---------- */

  const INBOX_FILTERS = [
    ["open", "Needs reply", "답변 필요"],
    ["pending", "Waiting", "고객 대기"],
    ["resolved", "Resolved", "해결"],
    ["all", "All", "전체"],
  ];

  function renderInboxChips() {
    const el = $("admin-inbox-filter");
    if (!el) return;
    el.innerHTML = INBOX_FILTERS.map(([k, en, ko]) => {
      const c = k === "all" ? inboxCounts.open + inboxCounts.pending + inboxCounts.resolved : inboxCounts[k];
      return `<button type="button" class="admin-chip${inboxFilter === k ? " active" : ""}" data-inbox-filter="${k}">${esc(L(en, ko))} <small>${c}</small></button>`;
    }).join("");
  }
  $("admin-inbox-filter").addEventListener("click", (e) => {
    const b = e.target.closest("[data-inbox-filter]");
    if (!b) return;
    inboxFilter = b.dataset.inboxFilter;
    loadInbox();
  });

  let inboxTimer = null;
  $("admin-inbox-search").addEventListener("input", (e) => {
    clearTimeout(inboxTimer);
    inboxTimer = setTimeout(() => {
      inboxQuery = e.target.value.trim();
      loadInbox();
    }, 250);
  });

  async function loadInbox() {
    showInboxList();
    try {
      const data = await api(`/admin/support/tickets?status=${encodeURIComponent(inboxFilter)}&q=${encodeURIComponent(inboxQuery)}`);
      inboxCounts = data.counts;
      renderInboxChips();
      const list = $("admin-inbox-list");
      const empty = $("admin-inbox-empty");
      empty.hidden = data.tickets.length > 0;
      empty.textContent = inboxQuery
        ? L("No messages match your search.", "검색 결과가 없어요.")
        : inboxFilter === "open"
        ? L("🎉 Nothing waiting for a reply.", "🎉 답변을 기다리는 문의가 없어요.")
        : L("Nothing here yet.", "아직 없어요.");
      list.innerHTML = data.tickets
        .map((t) => {
          const who = t.username || t.name || t.email || L("Visitor", "방문자");
          return `<button type="button" class="admin-ticket-row${t.unread ? " is-unread" : ""}" data-ticket="${esc(t.id)}">
            <span class="admin-ticket-main">
              <b>${t.unread ? "● " : ""}${esc(t.subject)}</b>
              <small>${esc(who)} · ${esc(CS.categoryLabel(t.category))} · ${esc(CS.ago(t.updatedAt))}</small>
              <span class="admin-ticket-preview">${t.lastFrom === "admin" ? esc(L("You: ", "나: ")) : ""}${esc(t.preview)}</span>
            </span>
            <span class="support-badge ${esc(t.status)}">${esc(CS.adminStatus(t.status))}</span>
          </button>`;
        })
        .join("");
      if (inboxCounts.open !== (overview && overview.openTickets)) {
        if (overview) overview.openTickets = inboxCounts.open;
        const badge = $("admin-inbox-badge");
        badge.hidden = !inboxCounts.open;
        badge.textContent = String(inboxCounts.open);
        $("admin-stat-open-tickets").textContent = inboxCounts.open;
        renderAttention();
      }
    } catch (e) {
      $("admin-inbox-list").innerHTML = "";
      $("admin-inbox-empty").hidden = false;
      $("admin-inbox-empty").textContent = L("Could not load the inbox.", "문의함을 불러오지 못했어요.");
    }
  }
  $("admin-inbox-list").addEventListener("click", (e) => {
    const row = e.target.closest("[data-ticket]");
    if (row) openTicket(row.dataset.ticket);
  });

  function showInboxList() {
    openTicketId = null;
    $("admin-inbox-list-view").hidden = false;
    $("admin-ticket-view").hidden = true;
  }

  /* ---------- ticket detail ---------- */

  const CANNED = [
    {
      key: "thanks",
      en: ["Thanks for writing", "Hi {name}, thanks for getting in touch! We've received your message and will look into it.\n\n— Koala Study Mate team"],
      ko: ["접수 확인", "{name}님, 문의해 주셔서 고마워요! 내용을 확인하고 곧 답변 드릴게요.\n\n— 코알라 스터디 메이트 팀"],
    },
    {
      key: "moreinfo",
      en: ["Need more details", "Hi {name}, could you tell us a little more? Which device and browser are you using, and what happened just before the problem? A screenshot helps a lot.\n\n— Koala Study Mate team"],
      ko: ["추가 정보 요청", "{name}님, 조금만 더 알려 주실 수 있을까요? 어떤 기기와 브라우저를 쓰고 계신지, 문제가 생기기 직전에 무엇을 하셨는지 알려 주세요. 화면 캡처가 있으면 큰 도움이 돼요.\n\n— 코알라 스터디 메이트 팀"],
    },
    {
      key: "password",
      en: ["Login / password help", "Hi {name}, you can choose a new password from the login screen with “Forgot password”. A link is sent to the email address on your account (check spam too). If nothing arrives, tell us the email you signed up with.\n\n— Koala Study Mate team"],
      ko: ["로그인·비밀번호 안내", "{name}님, 로그인 화면의 '비밀번호 찾기'로 새 비밀번호를 정할 수 있어요. 계정에 등록된 이메일로 링크가 가요 (스팸함도 확인해 주세요). 메일이 오지 않으면 가입할 때 쓴 이메일 주소를 알려 주세요.\n\n— 코알라 스터디 메이트 팀"],
    },
    {
      key: "fixed",
      en: ["Fixed — please refresh", "Hi {name}, this is fixed now. Please close and reopen the app (or refresh the page) and tell us if it still happens.\n\n— Koala Study Mate team"],
      ko: ["수정 완료 안내", "{name}님, 문제를 수정했어요. 앱을 닫았다가 다시 열거나 페이지를 새로고침해 보시고, 계속되면 알려 주세요.\n\n— 코알라 스터디 메이트 팀"],
    },
    {
      key: "premium",
      en: ["About Premium", "Hi {name}, Premium unlocks adding your own words (including from photos), your own flashcard deck and the wrong-answer notebook. Online payment is coming later — for now we can send you a special code. Would you like one?\n\n— Koala Study Mate team"],
      ko: ["프리미엄 안내", "{name}님, 프리미엄은 사진으로 단어 추가하기, 나만의 플래시카드, 오답 노트를 쓸 수 있어요. 온라인 결제는 곧 준비할 예정이고, 지금은 특별 코드로 안내해 드리고 있어요. 코드를 보내 드릴까요?\n\n— 코알라 스터디 메이트 팀"],
    },
    {
      key: "solved",
      en: ["Closing — solved", "Hi {name}, we're marking this as solved. If anything else comes up, just write to us again any time!\n\n— Koala Study Mate team"],
      ko: ["해결 완료 안내", "{name}님, 이 문의는 해결된 것으로 처리할게요. 또 궁금한 점이 있으면 언제든 다시 문의해 주세요!\n\n— 코알라 스터디 메이트 팀"],
    },
  ];

  async function openTicket(id) {
    openTicketId = id;
    $("admin-inbox-list-view").hidden = true;
    const view = $("admin-ticket-view");
    view.hidden = false;
    view.innerHTML = `<p class="muted">…</p>`;
    let data;
    try {
      data = await api(`/admin/support/ticket?id=${encodeURIComponent(id)}`);
    } catch (e) {
      loadInbox();
      return;
    }
    const { ticket: t, messages } = data;
    const who = t.username || t.name || t.email || L("Visitor", "방문자");
    const first = String(who).split(" ")[0];
    const resolved = t.status === "resolved";
    const mailHint = t.canEmail
      ? L(`Also email this reply to ${t.email}`, `이 답장을 ${t.email} 로도 이메일로 보내기`)
      : t.userId
      ? L("No confirmed email — they will see it in My messages.", "인증된 이메일이 없어요 — 고객은 내 메시지에서 확인해요.")
      : L("No email address on file.", "이메일 주소가 없어요.");

    view.innerHTML = `
      <button type="button" class="support-back" id="admin-ticket-back">← ${esc(L("Inbox", "문의함"))}</button>
      <h3 class="support-thread-title">${esc(t.subject)}</h3>
      <div class="admin-ticket-meta">
        <span class="support-badge ${esc(t.status)}">${esc(CS.adminStatus(t.status))}</span>
        <span>${esc(CS.categoryLabel(t.category))}</span>
        <span>${esc(L("from", "보낸 사람"))} <b>${esc(who)}</b>${t.role ? ` <span class="admin-role-select" data-role="${esc(t.role)}">${esc(roleLabel(t.role))}</span>` : ""}</span>
        ${t.email ? `<span>${esc(t.email)}</span>` : ""}
        <span>${esc(CS.fmtTime(t.createdAt))}</span>
        ${t.userId ? `<button type="button" class="admin-link-btn" id="admin-ticket-file">${esc(L("Customer file", "고객 정보"))}</button>` : ""}
      </div>
      <div class="support-thread">${messages
        .map(
          (m) => `<div class="support-msg ${m.from === "admin" ? "from-team" : m.from === "note" ? "is-note" : "from-me"}">
            <div class="support-msg-who">${esc(m.from === "admin" ? L("You", "나") : m.from === "note" ? L("🔒 Private note", "🔒 비공개 메모") : who)} · ${esc(CS.fmtTime(m.createdAt))}${m.emailed ? " · ✉️" : ""}</div>
            <div class="support-msg-body">${esc(m.body)}</div>
          </div>`
        )
        .join("")}</div>
      <div class="admin-compose">
        <div class="admin-compose-modes">
          <button type="button" class="admin-chip active" data-compose-mode="reply">${esc(L("Reply to customer", "고객에게 답장"))}</button>
          <button type="button" class="admin-chip" data-compose-mode="note">${esc(L("Private note", "비공개 메모"))}</button>
        </div>
        <select id="admin-canned" class="admin-canned">
          <option value="">${esc(L("Quick reply…", "빠른 답장…"))}</option>
          ${CANNED.map((c) => `<option value="${c.key}">${esc(L(c.en[0], c.ko[0]))}</option>`).join("")}
        </select>
        <textarea id="admin-compose-text" class="admin-textarea" rows="4" maxlength="2000"></textarea>
        <label class="admin-check" id="admin-compose-mail-wrap"><input type="checkbox" id="admin-compose-mail" ${t.canEmail ? "checked" : "disabled"} /> <span>${esc(mailHint)}</span></label>
        <p id="admin-compose-error" class="auth-error" hidden></p>
        <div class="auth-actions auth-actions-start" id="admin-compose-actions"></div>
      </div>
      <div class="admin-ticket-foot">
        <button type="button" class="pill neutral small" id="admin-ticket-status-btn">${esc(resolved ? L("↩ Reopen", "↩ 다시 열기") : L("✓ Mark resolved", "✓ 해결로 표시"))}</button>
        <button type="button" class="pill neutral small admin-danger-btn" id="admin-ticket-delete">${esc(L("Delete", "삭제"))}</button>
      </div>`;

    composeMode = "reply";
    renderComposeActions(t, first);

    $("admin-ticket-back").addEventListener("click", () => { loadInbox(); loadOverview(); });
    const fileBtn = $("admin-ticket-file");
    if (fileBtn) fileBtn.addEventListener("click", () => openCustomerById(t.userId));
    view.querySelectorAll("[data-compose-mode]").forEach((b) =>
      b.addEventListener("click", () => {
        composeMode = b.dataset.composeMode;
        view.querySelectorAll("[data-compose-mode]").forEach((x) => x.classList.toggle("active", x === b));
        renderComposeActions(t, first);
      })
    );
    $("admin-canned").addEventListener("change", (e) => {
      const c = CANNED.find((x) => x.key === e.target.value);
      e.target.value = "";
      if (!c) return;
      const text = L(c.en[1], c.ko[1]).replace(/\{name\}/g, first);
      const ta = $("admin-compose-text");
      ta.value = ta.value.trim() ? `${ta.value.trim()}\n\n${text}` : text;
      ta.focus();
    });
    $("admin-ticket-status-btn").addEventListener("click", async () => {
      try {
        await api2("/admin/support/status", { ticketId: t.id, status: resolved ? "open" : "resolved" });
        openTicket(t.id);
        loadOverview();
      } catch (e) { warn(failMsg()); }
    });
    $("admin-ticket-delete").addEventListener("click", async () => {
      const ok = await kidConfirm(L("Delete this conversation for good?", "이 대화를 완전히 삭제할까요?"), L("Delete", "삭제"), L("Cancel", "취소"), { danger: true });
      if (!ok) return;
      try {
        await api2("/admin/support/delete", { ticketId: t.id });
        loadInbox();
        loadOverview();
      } catch (e) { warn(failMsg()); }
    });
    loadOverview(); // opening it marked it read
  }

  function renderComposeActions(t) {
    const note = composeMode === "note";
    const actions = $("admin-compose-actions");
    $("admin-canned").hidden = note;
    $("admin-compose-mail-wrap").hidden = note;
    $("admin-compose-text").placeholder = note ? L("Only you can see this note.", "나만 볼 수 있는 메모예요.") : L("Write your reply…", "답장을 적어 주세요…");
    actions.innerHTML = note
      ? `<button type="button" class="pill accent" id="admin-compose-send">${esc(L("Save note", "메모 저장"))}</button>`
      : `<button type="button" class="pill accent" id="admin-compose-send">${esc(L("Send", "보내기"))}</button>
         <button type="button" class="pill neutral" id="admin-compose-send-resolve">${esc(L("Send & resolve", "보내고 해결 처리"))}</button>`;
    const submit = async (status) => {
      const text = $("admin-compose-text").value.trim();
      const err = $("admin-compose-error");
      err.hidden = true;
      if (!text) return;
      actions.querySelectorAll("button").forEach((b) => (b.disabled = true));
      try {
        if (note) {
          await api2("/admin/support/note", { ticketId: t.id, note: text });
        } else {
          const r = await api2("/admin/support/reply", {
            ticketId: t.id, message: text, status, sendEmail: $("admin-compose-mail").checked,
          });
          if ($("admin-compose-mail").checked && !r.emailed) warn(L("Saved, but the email could not be sent. The customer can still read it in the app.", "저장했지만 이메일은 보내지 못했어요. 고객은 앱에서 볼 수 있어요."));
        }
        openTicket(t.id);
        loadOverview();
      } catch (e) {
        err.textContent = failMsg();
        err.hidden = false;
        actions.querySelectorAll("button").forEach((b) => (b.disabled = false));
      }
    };
    $("admin-compose-send").addEventListener("click", () => submit("pending"));
    const sr = $("admin-compose-send-resolve");
    if (sr) sr.addEventListener("click", () => submit("resolved"));
  }

  /* ---------- customer file ---------- */

  const sheetOverlay = $("admin-sheet-overlay");
  const sheet = $("admin-sheet");
  const roleLabelSafe = (r) => (typeof roleLabel === "function" ? roleLabel(r) : r);

  function closeSheet() {
    sheetOverlay.hidden = true;
    sheet.innerHTML = "";
  }
  sheetOverlay.addEventListener("click", (e) => {
    if (e.target === sheetOverlay) closeSheet();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !sheetOverlay.hidden) closeSheet();
  });

  function openCustomerById(id) {
    const u = (typeof adminUsers !== "undefined" ? adminUsers : []).find((x) => x.id === id);
    if (u) return openCustomer(u);
    openCustomer({ id, username: "…", role: "free" });
  }

  async function openCustomer(u) {
    sheetOverlay.hidden = false;
    sheet.innerHTML = `<p class="muted">…</p>`;
    let data;
    try {
      data = await api(`/admin/customer?userId=${encodeURIComponent(u.id)}`);
    } catch (e) {
      closeSheet();
      warn(failMsg());
      return;
    }
    renderSheet(data);
  }

  function renderSheet(data) {
    const u = data.user;
    const isSelf = currentUser && u.id === currentUser.id;
    const emailLine = u.email
      ? `${esc(u.email)} <span class="email-badge ${u.emailVerified ? "ok" : "wait"}">${esc(u.emailVerified ? L("confirmed", "인증됨") : L("not confirmed", "미인증"))}</span>`
      : `<span class="muted">${esc(L("No email on file", "등록된 이메일 없음"))}</span>`;
    const k = data.koala;
    sheet.innerHTML = `
      <button type="button" class="admin-sheet-close" id="admin-sheet-close" aria-label="${esc(L("Close", "닫기"))}">✕</button>
      <h3 class="admin-sheet-name">${esc(u.username)} <span class="admin-role-select" data-role="${esc(u.role)}">${esc(roleLabelSafe(u.role))}</span></h3>
      <dl class="admin-sheet-facts">
        <dt>${esc(L("Joined", "가입일"))}</dt><dd>${esc(formatDate(u.createdAt))}${u.upgradedAt ? ` · ${esc(L("Premium since", "프리미엄 시작"))} ${esc(formatDate(u.upgradedAt))}` : ""}</dd>
        <dt>${esc(L("Email", "이메일"))}</dt><dd>${emailLine}</dd>
        ${k ? `<dt>${esc(L("Koala", "코알라"))}</dt><dd>${COIN_SVG} ${esc(k.coins)} · 🔥 ${esc(k.streak)} ${esc(L("day streak (best", "일 연속 (최고"))} ${esc(k.best)})</dd>` : ""}
        ${data.failedEmails ? `<dt>${esc(L("Mail", "메일"))}</dt><dd class="admin-warn">${esc(L(`${data.failedEmails} email(s) to this address failed`, `이 주소로 보낸 메일 ${data.failedEmails}건 실패`))}</dd>` : ""}
      </dl>

      ${isSelf ? "" : `
      <h4 class="admin-sheet-h">${esc(L("Role", "등급"))}</h4>
      <div class="admin-sheet-row">
        <select id="admin-sheet-role" class="admin-role-select" data-role="${esc(u.role)}">
          ${["free", "paid", "admin"].map((r) => `<option value="${r}"${r === u.role ? " selected" : ""}>${esc(roleLabelSafe(r))}</option>`).join("")}
        </select>
        <button type="button" class="pill accent small" id="admin-sheet-role-apply" disabled>${esc(L("Apply", "적용"))}</button>
      </div>`}

      <h4 class="admin-sheet-h">${esc(L("Message", "메시지"))}</h4>
      <div id="admin-sheet-msg-closed"><button type="button" class="pill neutral small" id="admin-sheet-msg-open">${esc(L("✉️ Write to this customer", "✉️ 이 고객에게 메시지 보내기"))}</button></div>
      <div id="admin-sheet-msg-form" hidden>
        <input id="admin-sheet-msg-subject" class="admin-input" maxlength="100" placeholder="${esc(L("Subject", "제목"))}" />
        <textarea id="admin-sheet-msg-body" class="admin-textarea" rows="3" maxlength="2000" placeholder="${esc(L("Message", "내용"))}"></textarea>
        <label class="admin-check"><input type="checkbox" id="admin-sheet-msg-mail" ${u.email && u.emailVerified ? "checked" : "disabled"} /> <span>${esc(u.email && u.emailVerified ? L("Also send by email", "이메일로도 보내기") : L("No confirmed email — they will see it in My messages.", "인증된 이메일이 없어요 — 고객은 내 메시지에서 확인해요."))}</span></label>
        <div class="auth-actions auth-actions-start"><button type="button" class="pill accent small" id="admin-sheet-msg-send">${esc(L("Send", "보내기"))}</button></div>
      </div>

      <h4 class="admin-sheet-h">${esc(L("Private notes", "비공개 메모"))}</h4>
      <textarea id="admin-sheet-note" class="admin-textarea" rows="3" maxlength="2000" placeholder="${esc(L("Only you can see this (e.g. “parent prefers email”).", "나만 볼 수 있어요 (예: “학부모님은 이메일 선호”)."))}">${esc(data.note)}</textarea>
      <div class="auth-actions auth-actions-start">
        <button type="button" class="pill neutral small" id="admin-sheet-note-save">${esc(L("Save note", "메모 저장"))}</button>
        <span id="admin-sheet-note-result" class="auth-hint" hidden></span>
      </div>

      <h4 class="admin-sheet-h">${esc(L("Inquiries", "문의 내역"))}</h4>
      ${data.tickets.length
        ? `<div class="admin-sheet-tickets">${data.tickets
            .map((t) => `<button type="button" class="admin-ticket-row" data-sheet-ticket="${esc(t.id)}"><span class="admin-ticket-main"><b>${esc(t.subject)}</b><small>${esc(CS.ago(t.updatedAt))}</small></span><span class="support-badge ${esc(t.status)}">${esc(CS.adminStatus(t.status))}</span></button>`)
            .join("")}</div>`
        : `<p class="muted">${esc(L("No inquiries yet.", "문의 내역이 없어요."))}</p>`}

      ${isSelf ? "" : `
      <h4 class="admin-sheet-h admin-danger-h">${esc(L("Careful", "주의"))}</h4>
      <div class="admin-sheet-row">
        <button type="button" class="pill neutral small" id="admin-sheet-reset">${esc(L("Reset password", "비밀번호 재설정"))}</button>
        <button type="button" class="pill neutral small admin-danger-btn" id="admin-sheet-delete">${esc(L("Delete account", "계정 삭제"))}</button>
      </div>`}`;

    $("admin-sheet-close").addEventListener("click", closeSheet);

    const roleSel = $("admin-sheet-role");
    if (roleSel) {
      const apply = $("admin-sheet-role-apply");
      roleSel.addEventListener("change", () => {
        roleSel.dataset.role = roleSel.value;
        apply.disabled = roleSel.value === u.role;
      });
      apply.addEventListener("click", async () => {
        const newRole = roleSel.value;
        if (newRole === u.role) return;
        const ok = await kidConfirm(t("adminUserConfirmRoleChange", u.username, roleLabelSafe(newRole)), t("deleteConfirmYesBtn"), t("deleteConfirmNoBtn"));
        if (!ok) return;
        apply.disabled = true;
        try {
          await api("/admin/users/set-role", { method: "POST", body: JSON.stringify({ userId: u.id, role: newRole }) });
          const row = adminUsers.find((x) => x.id === u.id);
          const wasPaid = u.role === "paid";
          if (row) { row.role = newRole; if (newRole === "paid") row.upgradedAt = Date.now(); }
          if (wasPaid !== (newRole === "paid")) {
            adminStats.premiumUsers += newRole === "paid" ? 1 : -1;
            renderAdminStats();
          }
          renderAdminUsers();
          renderUserChips();
          openCustomer(u);
        } catch (e) {
          warn(failMsg());
          apply.disabled = false;
        }
      });
    }

    $("admin-sheet-msg-open").addEventListener("click", () => {
      $("admin-sheet-msg-closed").hidden = true;
      $("admin-sheet-msg-form").hidden = false;
      $("admin-sheet-msg-subject").focus();
    });
    $("admin-sheet-msg-send").addEventListener("click", async () => {
      const subject = $("admin-sheet-msg-subject").value.trim();
      const message = $("admin-sheet-msg-body").value.trim();
      if (!subject || !message) return;
      const btn = $("admin-sheet-msg-send");
      btn.disabled = true;
      try {
        const r = await api2("/admin/support/new", { userId: u.id, subject, message, sendEmail: $("admin-sheet-msg-mail").checked });
        if ($("admin-sheet-msg-mail").checked && !r.emailed) warn(L("Sent in the app, but the email could not be sent.", "앱으로는 보냈지만 이메일은 보내지 못했어요."));
        loadOverview();
        openCustomer(u);
      } catch (e) {
        warn(failMsg());
        btn.disabled = false;
      }
    });

    $("admin-sheet-note-save").addEventListener("click", async () => {
      const res = $("admin-sheet-note-result");
      try {
        await api2("/admin/customer/note", { userId: u.id, note: $("admin-sheet-note").value });
        res.textContent = L("Saved ✓", "저장했어요 ✓");
      } catch (e) {
        res.textContent = failMsg();
      }
      res.hidden = false;
    });

    sheet.querySelectorAll("[data-sheet-ticket]").forEach((b) =>
      b.addEventListener("click", () => {
        closeSheet();
        jump("inbox");
        openTicket(b.dataset.sheetTicket);
      })
    );

    const reset = $("admin-sheet-reset");
    if (reset) {
      reset.addEventListener("click", async () => {
        const newPassword = prompt(t("adminUserResetPasswordPrompt", u.username));
        if (!newPassword) return;
        if (!passwordMeetsPolicy(newPassword)) return alert(t("authSignupErrorPassword"));
        try {
          await api2("/admin/users/set-password", { userId: u.id, newPassword });
          alert(t("adminUserResetPasswordDone", u.username));
        } catch (e) { warn(failMsg()); }
      });
      $("admin-sheet-delete").addEventListener("click", async () => {
        const ok = await kidConfirm(t("adminUserConfirmDelete", u.username), t("deleteConfirmYesBtn"), t("deleteConfirmNoBtn"), { danger: true });
        if (!ok) return;
        try {
          await api2("/admin/users/delete", { userId: u.id });
          adminUsers = adminUsers.filter((x) => x.id !== u.id);
          adminStats.totalUsers = Math.max(0, adminStats.totalUsers - 1);
          if (u.role === "paid") adminStats.premiumUsers = Math.max(0, adminStats.premiumUsers - 1);
          renderAdminStats();
          renderAdminUsers();
          renderUserChips();
          closeSheet();
          loadOverview();
        } catch (e) { warn(failMsg()); }
      });
    }
  }

  /* ---------- announcement editor ---------- */

  function fillNoticeCard() {
    if (!overview) return;
    const text = $("admin-notice-text");
    if (document.activeElement !== text) text.value = overview.announcement.text;
    $("admin-notice-active").checked = !!overview.announcement.active;
  }
  $("admin-notice-save-btn").addEventListener("click", async () => {
    const res = $("admin-notice-result");
    const text = $("admin-notice-text").value.trim();
    const active = $("admin-notice-active").checked;
    try {
      await api2("/admin/announcement", { text, active });
      if (overview) overview.announcement = { text, active };
      res.textContent = active ? L("Saved — the banner is live ✓", "저장했어요 — 배너가 표시돼요 ✓") : L("Saved — the banner is hidden ✓", "저장했어요 — 배너는 숨겨져 있어요 ✓");
      if (window.koalaSupportUI) { try { sessionStorage.removeItem("ksm_notice_dismissed"); } catch (e) { /* private mode */ } }
    } catch (e) {
      res.textContent = (e && e.data && e.data.error === "text_required") ? L("Write the notice text first.", "공지 내용을 먼저 적어 주세요.") : failMsg();
    }
    res.hidden = false;
  });

  /* ---------- hooks ---------- */

  function enter() {
    localize();
    renderUserChips();
    loadOverview();
    setTab(tab);
  }

  window.adminCS = {
    enter,
    localize,
    openCustomer,
    renderUserChips,
    get usersFilter() { return api_usersFilter; },
    userMatchesFilter,
    reload() { loadOverview(); if (tab === "inbox") loadInbox(); },
  };
  localize();
})();
