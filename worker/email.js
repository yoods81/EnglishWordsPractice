// Outgoing email for Koala Study Mate, sent through Cloudflare Email Service
// (the `send_email` binding named EMAIL in wrangler.jsonc). Replies go to the
// admin mailbox via Reply-To; incoming mail is handled by Cloudflare Email
// Routing, not by this Worker.

const DEFAULT_FROM = "noreply@koalastudymate.com";
const DEFAULT_REPLY_TO = "admin@koalastudymate.com";
const DEFAULT_APP_URL = "https://koalastudymate.com";
const BRAND = "Koala Study Mate";

export function emailSettings(env) {
  return {
    configured: !!env.EMAIL,
    from: env.MAIL_FROM || DEFAULT_FROM,
    replyTo: env.MAIL_REPLY_TO || DEFAULT_REPLY_TO,
    appUrl: (env.APP_URL || DEFAULT_APP_URL).replace(/\/+$/, ""),
  };
}

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Wraps a message in a small, plain HTML layout. Every email is written in
// Korean first and English second, since the server doesn't know which
// language a visitor was using.
function layout(paragraphsKo, paragraphsEn, button) {
  const p = (t) => `<p style="margin:0 0 12px;line-height:1.55">${t}</p>`;
  const btn = button
    ? `<p style="margin:18px 0"><a href="${escapeHtml(button.url)}" style="display:inline-block;padding:11px 20px;background:#1fb28a;color:#fff;border-radius:10px;text-decoration:none;font-weight:700">${escapeHtml(button.label)}</a></p>
       <p style="margin:0 0 12px;font-size:12px;color:#667">${escapeHtml(button.url)}</p>`
    : "";
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:15px;color:#223;max-width:520px;margin:0 auto;padding:20px">
    <h2 style="margin:0 0 16px;font-size:18px">🐨 ${BRAND}</h2>
    ${paragraphsKo.map(p).join("")}${btn}
    <hr style="border:0;border-top:1px solid #dde;margin:20px 0" />
    ${paragraphsEn.map((t) => p(`<span style="color:#556">${t}</span>`)).join("")}
  </div>`;
}

export const templates = {
  verifyEmail(link, username) {
    const u = escapeHtml(username);
    return {
      subject: `[${BRAND}] 이메일 주소를 확인해 주세요 / Please confirm your email`,
      text: `안녕하세요! ${username} 계정의 이메일 주소를 확인하려면 아래 링크를 열어 주세요 (24시간 동안 유효해요).\n${link}\n\n본인이 가입하지 않았다면 이 메일은 무시해도 돼요.\n\n---\nHi! To confirm the email address for the account "${username}", open this link (valid for 24 hours):\n${link}\n\nIf you didn't sign up, you can ignore this email.`,
      html: layout(
        [`안녕하세요! <b>${u}</b> 계정의 이메일 주소를 확인하려면 아래 버튼을 눌러 주세요. (24시간 동안 유효해요)`, "본인이 가입하지 않았다면 이 메일은 무시해도 돼요."],
        [`Hi! To confirm the email address for the account <b>${u}</b>, tap the button above. (Valid for 24 hours.)`, "If you didn't sign up, you can ignore this email."],
        { url: link, label: "이메일 확인하기 / Confirm email" }
      ),
    };
  },
  resetPassword(link, username) {
    const u = escapeHtml(username);
    return {
      subject: `[${BRAND}] 비밀번호 재설정 / Reset your password`,
      text: `${username} 계정의 비밀번호를 다시 정하려면 아래 링크를 열어 주세요 (30분 동안, 한 번만 쓸 수 있어요).\n${link}\n\n비밀번호 재설정을 요청하지 않았다면 이 메일은 무시해도 돼요. 비밀번호는 그대로예요.\n\n---\nTo choose a new password for "${username}", open this link (valid for 30 minutes, one use):\n${link}\n\nIf you didn't ask for this, ignore this email — your password stays the same.`,
      html: layout(
        [`<b>${u}</b> 계정의 비밀번호를 다시 정하려면 아래 버튼을 눌러 주세요. (30분 동안, 한 번만 쓸 수 있어요)`, "비밀번호 재설정을 요청하지 않았다면 이 메일은 무시해도 돼요. 비밀번호는 그대로예요."],
        [`To choose a new password for <b>${u}</b>, tap the button above. (Valid for 30 minutes, one use.)`, "If you didn't ask for this, ignore this email — your password stays the same."],
        { url: link, label: "비밀번호 재설정 / Reset password" }
      ),
    };
  },
  usernames(usernames, appUrl) {
    const list = usernames.map((n) => escapeHtml(n)).join(", ");
    return {
      subject: `[${BRAND}] 아이디 안내 / Your username`,
      text: `이 이메일 주소로 등록된 아이디예요: ${usernames.join(", ")}\n로그인: ${appUrl}\n\n아이디 찾기를 요청하지 않았다면 이 메일은 무시해도 돼요.\n\n---\nThe username(s) registered with this email address: ${usernames.join(", ")}\nLog in: ${appUrl}\n\nIf you didn't ask for this, ignore this email.`,
      html: layout(
        [`이 이메일 주소로 등록된 아이디예요: <b>${list}</b>`, "아이디 찾기를 요청하지 않았다면 이 메일은 무시해도 돼요."],
        [`The username(s) registered with this email address: <b>${list}</b>`, "If you didn't ask for this, ignore this email."],
        { url: appUrl, label: "로그인하러 가기 / Log in" }
      ),
    };
  },
  // The admin's reply to a customer's inquiry. The reply itself is written in
  // whatever language the admin chose, so it is quoted once, as-is, between a
  // Korean and an English intro line.
  supportReply({ subject, body, appUrl, hasAccount }) {
    const s = escapeHtml(subject);
    const quote = `<span style="display:block;white-space:pre-wrap;padding:12px 14px;background:#f1faf6;border-left:4px solid #1fb28a;border-radius:8px">${escapeHtml(body)}</span>`;
    const tail = hasAccount ? "" : "\n\n이 메일에 바로 답장하셔도 돼요. / You can simply reply to this email.";
    return {
      subject: `[${BRAND}] 문의 답변 / Re: ${subject}`,
      text: `"${subject}" 문의에 답변이 도착했어요.\n\n${body}\n\n---\nWe replied to your message "${subject}".${hasAccount ? `\nOpen the app to see it or answer: ${appUrl}` : ""}${tail}`,
      html: layout(
        [`<b>${s}</b> 문의에 답변이 도착했어요.`, quote, ...(hasAccount ? [] : ["이 메일에 바로 답장하셔도 돼요."])],
        [`We replied to your message <b>${s}</b>.`, ...(hasAccount ? ["Open the app to see it or answer."] : ["You can simply reply to this email."])],
        hasAccount ? { url: appUrl, label: "앱에서 보기 / Open the app" } : null
      ),
    };
  },
  // A heads-up to the admin mailbox that a customer wrote in.
  supportAlert({ subject, from, body, appUrl }) {
    const s = escapeHtml(subject);
    const quote = `<span style="display:block;white-space:pre-wrap;padding:12px 14px;background:#f6f6fb;border-radius:8px">${escapeHtml(body.slice(0, 600))}</span>`;
    return {
      subject: `[${BRAND}] 새 문의 / New inquiry: ${subject}`,
      text: `새 문의가 도착했어요 (${from}).\n"${subject}"\n\n${body.slice(0, 600)}\n\n관리자 > 문의함에서 답장하세요: ${appUrl}`,
      html: layout([`새 문의가 도착했어요 (<b>${escapeHtml(from)}</b>): <b>${s}</b>`, quote], ["Reply from Admin → Inbox."], { url: appUrl, label: "문의함 열기 / Open the app" }),
    };
  },
  // The parent's weekly report, sent on request from My Progress > Parent.
  // `r` comes from the browser, so every value is clamped and escaped here.
  weeklyReport(r, username) {
    const num = (v, max) => { const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.min(max, Math.round(n))) : 0; };
    const str = (v, n) => String(v == null ? "" : v).slice(0, n);
    const ko = r.lang === "ko";
    const range = escapeHtml(str(r.range, 40));
    const days = num(r.days, 90), active = num(r.activeDays, 90), answers = num(r.answers, 100000);
    const pct = r.pct === null || r.pct === undefined ? null : num(r.pct, 100);
    const streak = num(r.streak, 5000), known = num(r.known, 100000);
    const modes = (Array.isArray(r.modes) ? r.modes : []).slice(0, 8).map((m) => ({ name: str(m && m.name, 30), c: num(m && m.c, 100000), t: num(m && m.t, 100000) })).filter((m) => m.t > 0);
    const series = (Array.isArray(r.series) ? r.series : []).slice(0, 31).map((d) => ({ l: str(d && d.l, 4), c: num(d && d.c, 100000), t: num(d && d.t, 100000) }));
    const stages = (Array.isArray(r.stages) ? r.stages : []).slice(0, 5).map((n) => num(n, 100000));
    while (stages.length && stages.length < 5) stages.push(0);
    const tricky = (Array.isArray(r.tricky) ? r.tricky : []).slice(0, 8).map((w) => str(w, 30));
    const tips = (Array.isArray(r.tips) ? r.tips : []).slice(0, 4).map((t) => str(t, 220));
    const L = ko
      ? { title: "주간 학습 리포트", days: "학습 기간", ans: "학습 문제", acc: "정답률", streak: "연속 학습", known: "완료 단어", act: "활동별", tricky: "어려운 단어", tips: "조언", open: "앱 열기", right: "맞음", miss: "틀림", noteDays: "막대가 있는 날은 공부한 날이에요.", noteAns: "초록은 맞은 문제, 회색은 틀린 문제예요.", noteAcc: "하루에 맞힌 문제의 비율이에요.", noteStreak: "✓ 표시는 공부한 날이에요.", noteKnown: "3단계부터는 완료(잘 아는) 단어예요.", lv: "단계 " }
      : { title: "Weekly report", days: "Study days", ans: "Questions", acc: "Accuracy", streak: "Day streak", known: "Words mastered", act: "By activity", tricky: "Tricky words", tips: "Tips", open: "Open the app", right: "right", miss: "missed", noteDays: "A bar means a day with practice.", noteAns: "Green = right, grey = missed.", noteAcc: "Share of answers that were right each day.", noteStreak: "A ✓ marks a day with practice.", noteKnown: "Stage 3 and up counts as mastered.", lv: "Lv " };
    const appUrl = DEFAULT_APP_URL;
    const cell = (v, l) => `<td style="text-align:center;padding:8px 2px"><div style="font-size:19px;font-weight:800;color:#0b6b57">${v}</div><div style="font-size:11px;color:#667">${escapeHtml(l)}</div></td>`;
    const modeRows = modes.map((m) => `<tr><td style="padding:3px 0">${escapeHtml(m.name)}</td><td style="padding:3px 0;text-align:right;font-weight:700">${m.c}/${m.t}</td></tr>`).join("");
    // Email clients can't run scripts or draw SVG, so charts are plain table bars.
    const H = 70;
    const chart = (title, cols, note) => {
      const max = Math.max(1, ...cols.map((c) => c.a + (c.b || 0)));
      const tds = cols.map((c) => {
        const ha = Math.round((c.a / max) * H), hb = Math.round(((c.b || 0) / max) * H);
        const bar = (ha + hb) ? `<div style="height:${hb}px;background:#c9d3cf;border-radius:4px 4px 0 0"></div><div style="height:${ha}px;background:${c.color || "#22c9a4"};border-radius:${hb ? 0 : 4}px ${hb ? 0 : 4}px 0 0"></div>` : `<div style="height:3px;background:#e3ece8"></div>`;
        return `<td valign="bottom" style="padding:0 1px;text-align:center"><div style="font-size:10px;color:#556;height:13px;line-height:13px">${escapeHtml(c.top || "")}</div><table width="100%" cellpadding="0" cellspacing="0" height="${H}" style="height:${H}px"><tr><td valign="bottom">${bar}</td></tr></table><div style="font-size:10px;color:#667;padding-top:3px">${escapeHtml(c.l)}</div></td>`;
      }).join("");
      return `<div style="margin:14px 0 0;padding:12px;background:#f7fbf9;border-radius:12px"><div style="font-weight:800;font-size:14px;margin-bottom:6px;color:#0b6b57">${escapeHtml(title)}</div><table width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed"><tr>${tds}</tr></table><div style="font-size:11px;color:#667;margin-top:6px">${escapeHtml(note)}</div></div>`;
    };
    const charts = series.length ? [
      chart(L.days, series.map((d) => ({ l: d.l, a: d.t ? Math.max(d.t, 1) : 0 })), L.noteDays),
      chart(L.ans, series.map((d) => ({ l: d.l, a: d.c, b: Math.max(0, d.t - d.c), top: d.t ? String(d.t) : "" })), L.noteAns),
      chart(L.acc, series.map((d) => ({ l: d.l, a: d.t ? Math.round((d.c / d.t) * 100) : 0, top: d.t ? String(Math.round((d.c / d.t) * 100)) : "", color: "#4f8cff" })), L.noteAcc),
      chart(L.streak, series.map((d) => ({ l: d.l, a: d.t ? 1 : 0, top: d.t ? "✓" : "", color: "#7ac943" })), L.noteStreak),
    ].join("") : "";
    const knownChart = stages.length ? chart(L.known, stages.map((n, i) => ({ l: L.lv + (i + 1), a: n, top: String(n), color: "#f0a020" })), L.noteKnown) : "";
    const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:15px;color:#223;max-width:560px;margin:0 auto;padding:20px">
      <h2 style="margin:0 0 4px;font-size:18px">🐨 ${BRAND}</h2>
      <p style="margin:0 0 14px;color:#667">${escapeHtml(L.title)} · ${range} · ${escapeHtml(username)}</p>
      <table style="width:100%;background:#f1faf6;border-radius:12px;border-collapse:separate"><tr>${cell(`${active}/${days}`, L.days)}${cell(answers, L.ans)}${cell(pct === null ? "–" : pct + "%", L.acc)}${cell(streak, L.streak)}${cell(known, L.known)}</tr></table>
      ${charts}${knownChart}
      ${modeRows ? `<h3 style="margin:18px 0 6px;font-size:15px">${escapeHtml(L.act)}</h3><table style="width:100%;border-collapse:collapse">${modeRows}</table>` : ""}
      ${tricky.length ? `<h3 style="margin:18px 0 6px;font-size:15px">${escapeHtml(L.tricky)}</h3><p style="margin:0">${tricky.map(escapeHtml).join(", ")}</p>` : ""}
      ${tips.length ? `<h3 style="margin:18px 0 6px;font-size:15px">${escapeHtml(L.tips)}</h3>${tips.map((t) => `<p style="margin:0 0 8px;padding:10px 12px;background:#fff7dc;border-radius:10px">💡 ${escapeHtml(t)}</p>`).join("")}` : ""}
      <p style="margin:20px 0"><a href="${appUrl}" style="display:inline-block;padding:11px 20px;background:#1fb28a;color:#fff;border-radius:10px;text-decoration:none;font-weight:700">${escapeHtml(L.open)}</a></p>
    </div>`;
    const text = [
      `${BRAND} — ${L.title} (${str(r.range, 40)})`,
      `${L.days}: ${active}/${days}`, `${L.ans}: ${answers}`, `${L.acc}: ${pct === null ? "–" : pct + "%"}`, `${L.streak}: ${streak}`, `${L.known}: ${known}`,
      ...(series.length ? [`${L.ans}: ` + series.map((d) => `${d.l}=${d.c}/${d.t}`).join(" ")] : []),
      ...(stages.length ? [`${L.known}: ` + stages.map((n, i) => `${L.lv}${i + 1}=${n}`).join(" ")] : []),
      ...modes.map((m) => `• ${m.name}: ${m.c}/${m.t}`),
      ...(tricky.length ? [`${L.tricky}: ${tricky.join(", ")}`] : []),
      ...tips.map((t) => `- ${t}`),
      appUrl,
    ].join("\n");
    return { subject: `[${BRAND}] ${L.title} / ${ko ? "Weekly report" : "주간 리포트"} · ${str(r.range, 40)}`, text, html };
  },
  test() {
    return {
      subject: `[${BRAND}] 테스트 메일 / Test email`,
      text: "이 메일이 보인다면 Koala Study Mate의 이메일 발송이 잘 작동하고 있어요.\n\n---\nIf you can read this, email sending for Koala Study Mate is working.",
      html: layout(["이 메일이 보인다면 Koala Study Mate의 이메일 발송이 잘 작동하고 있어요. ✅"], ["If you can read this, email sending for Koala Study Mate is working."]),
    };
  },
};

// Sends one message and records the outcome in email_log (never the body or
// any link in it, since links carry one-time tokens). Returns { ok, error }.
export async function sendEmail(env, { to, kind, subject, text, html }) {
  const s = emailSettings(env);
  let ok = false;
  let error = null;
  if (!s.configured) {
    error = "email_not_configured";
  } else {
    try {
      await env.EMAIL.send({
        to,
        from: { email: s.from, name: BRAND },
        replyTo: s.replyTo,
        subject,
        text,
        html,
      });
      ok = true;
    } catch (e) {
      error = String((e && (e.code || e.message)) || e).slice(0, 200);
    }
  }
  try {
    await env.DB.prepare(
      "INSERT INTO email_log (to_addr, kind, subject, status, error, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    )
      .bind(to, kind, subject, ok ? "sent" : "failed", error, Date.now())
      .run();
  } catch (e) {
    /* logging must never break the request that triggered the email */
  }
  return { ok, error };
}
