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
