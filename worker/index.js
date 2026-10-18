// Cloudflare Worker: serves the static app and a small API for user accounts
// and the shared word list. Passwords are never stored or compared in
// plaintext — only their PBKDF2 hash ever touches the database — and the
// legacy single ADMIN_PASSWORD Worker secret is used exactly once, to
// bootstrap the first "admin" account into the users table.

import { sendEmail, templates, emailSettings } from "./email.js";
import { handleSupport } from "./support.js";
import { handleBilling, closeBillingForUser } from "./billing.js";

const SESSION_COOKIE = "ywp_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_WORDS_PER_REQUEST = 200;
const MAX_FIELD_LENGTH = 2000;
const MAX_PROGRESS_JSON_LENGTH = 500000;
const PBKDF2_ITERATIONS = 100000;
const ADMIN_BOOTSTRAP_USERNAME = "admin";

// Builds the same report the browser sends, from the progress copy saved on the
// server (accounts that sync progress), for the last 7 days in the user's own time zone.
function reportFromProgress(progress, tzOffset, lang) {
  const ko = lang === "ko";
  const day = 86400000;
  const keyOf = (ms) => new Date(ms + tzOffset * 60000).toISOString().slice(0, 10);
  const today = Date.now();
  const modeDefs = [["quiz", ko ? "퀴즈" : "Quiz"], ["spelling", ko ? "스펠링" : "Spelling"], ["typing", ko ? "타이핑 게임" : "Typing Game"], ["tt", ko ? "구구단" : "Times Table"], ["flash", ko ? "플래시카드" : "Flashcards"]];
  const daily = (progress && progress.daily) || {};
  const perMode = {};
  modeDefs.forEach(([m]) => (perMode[m] = [0, 0]));
  const series = [];
  let activeDays = 0, correct = 0, total = 0;
  for (let i = 6; i >= 0; i--) {
    const ms = today - i * day;
    const rec = daily[keyOf(ms)] || {};
    let c = 0, t = 0;
    modeDefs.forEach(([m]) => { if (rec[m]) { c += rec[m][0]; t += rec[m][1]; perMode[m][0] += rec[m][0]; perMode[m][1] += rec[m][1]; } });
    correct += c; total += t; if (t) activeDays++;
    series.push({ l: new Date(ms + tzOffset * 60000).toLocaleDateString(ko ? "ko-KR" : "en-AU", { weekday: "narrow", timeZone: "UTC" }), c, t });
  }
  const fmt = (ms) => new Date(ms + tzOffset * 60000).toLocaleDateString(ko ? "ko-KR" : "en-AU", { day: "numeric", month: "short", timeZone: "UTC" });
  const stages = [0, 0, 0, 0, 0];
  Object.values((progress && progress.srs) || {}).forEach((e) => { const b = Math.min(5, Math.max(1, (e && e.box) || 1)); stages[b - 1]++; });
  const tricky = Object.entries((progress && progress.wordStats) || {})
    .filter(([k, v]) => !/^\d+x\d+$/.test(k) && v && v.incorrect > 0 && v.incorrect >= v.correct)
    .sort((a, b) => b[1].incorrect - a[1].incorrect).slice(0, 6).map(([k]) => k);
  const tips = [];
  if (!activeDays) tips.push(ko ? "이 기간에는 학습 기록이 없어요. 저녁 식사 후 5분부터 시작해 보세요." : "No practice this week. Five minutes after dinner is a great place to start.");
  else if (activeDays < 4) tips.push(ko ? `7일 중 ${activeDays}일 학습했어요. 매일 조금씩이 효과적이에요.` : `Practised ${activeDays} of 7 days. Short daily sessions work best.`);
  else tips.push(ko ? `7일 중 ${activeDays}일 학습했어요. 좋은 습관이에요!` : `Practised ${activeDays} of 7 days — a great routine!`);
  return {
    lang: ko ? "ko" : "en", range: `${fmt(today - 6 * day)} – ${fmt(today)}`,
    days: 7, activeDays, answers: total, pct: total ? Math.round((correct / total) * 100) : null,
    streak: (progress && progress.streak && progress.streak.count) || 0, known: stages[2] + stages[3] + stages[4],
    modes: modeDefs.map(([m, name]) => ({ name, c: perMode[m][0], t: perMode[m][1] })).filter((x) => x.t > 0),
    series, stages, tricky, tips,
  };
}

// Every child's report for an account with 2+ children. `override` lets the
// browser-supplied report stand in for one slot (the child currently open on
// the device, whose latest progress may not have reached the server yet).
async function childrenReports(env, userId, tzOffset, lang, override) {
  let profiles = [];
  try {
    const row = await env.DB.prepare("SELECT progress_json FROM user_progress WHERE account_key = ?").bind(`${userId}:profiles`).first();
    if (row) profiles = cleanProfiles((JSON.parse(row.progress_json) || {}).profiles);
  } catch (e) { return []; }
  if (profiles.length < 2) return [];
  const out = [];
  for (const p of profiles) {
    if (override && override.slot === p.slot) { out.push({ name: p.name, avatar: p.avatar, report: override.report }); continue; }
    let progress = null;
    try {
      const row = await env.DB.prepare("SELECT progress_json FROM user_progress WHERE account_key = ?").bind(p.slot === 0 ? userId : `${userId}:p${p.slot}`).first();
      if (row) progress = JSON.parse(row.progress_json);
    } catch (e) { /* treated as no activity */ }
    out.push({ name: p.name, avatar: p.avatar, report: reportFromProgress(progress, tzOffset, lang) });
  }
  return out;
}

async function sendWeeklyReports(env) {
  let rows;
  try {
    rows = (await env.DB.prepare(
      `SELECT p.user_id, p.tz_offset, p.lang, p.last_sent_at, u.username, u.email, u.email_verified_at, u.role
       FROM weekly_report_prefs p JOIN users u ON u.id = p.user_id WHERE p.enabled = 1`
    ).all()).results || [];
  } catch (e) {
    return;
  }
  for (const r of rows) {
    if (!r.email || (!r.email_verified_at && r.role !== "admin")) continue;
    if (r.last_sent_at && Date.now() - r.last_sent_at < 5 * 86400000) continue;
    let progress = null;
    try {
      const row = await env.DB.prepare("SELECT progress_json FROM user_progress WHERE account_key = ?").bind(r.user_id).first();
      if (row) progress = JSON.parse(row.progress_json);
    } catch (e) { /* send an empty-week report rather than nothing */ }
    const report = reportFromProgress(progress, Number(r.tz_offset) || 0, r.lang);
    const kids = await childrenReports(env, r.user_id, Number(r.tz_offset) || 0, r.lang, null);
    if (kids.length > 1) report.children = kids;
    const sent = await sendEmail(env, { to: r.email, kind: "weekly_report_auto", ...templates.weeklyReport(report, r.username) });
    if (sent.ok) {
      try { await env.DB.prepare("UPDATE weekly_report_prefs SET last_sent_at = ? WHERE user_id = ?").bind(Date.now(), r.user_id).run(); } catch (e) { /* ignore */ }
    }
  }
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(sendWeeklyReports(env));
  },
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) return handleApi(request, env, url);
    return env.ASSETS.fetch(request);
  },
};

/* ---------- helpers ---------- */

// Which user_progress row a request means: profile 0 (the default) is the
// account's own row exactly as before; ?p=1..3 picks one of the extra children.
function progressKey(session, url) {
  const p = Number(url.searchParams.get("p"));
  return Number.isInteger(p) && p >= 1 && p <= 3 ? `${session.id}:p${p}` : session.id;
}

const PROFILE_AVATARS = ["koala", "kangaroo", "parrot", "turtle", "dolphin", "owl"];
// 1-4 learners, each { slot, name, avatar }. The slot (0-3) is the learner's
// fixed storage row, so removing one child never shifts another child's data.
// Slot 0 always exists. Anything invalid is dropped or defaulted.
function cleanProfiles(list) {
  const seen = new Set();
  const out = [];
  (Array.isArray(list) ? list : []).forEach((p) => {
    const slot = Number(p && p.slot);
    if (!Number.isInteger(slot) || slot < 0 || slot > 3 || seen.has(slot) || out.length >= 4) return;
    seen.add(slot);
    const name = String((p && p.name) || "").replace(/[<>]/g, "").trim().slice(0, 20) || `Child ${slot + 1}`;
    const avatar = PROFILE_AVATARS.includes(p && p.avatar) ? p.avatar : PROFILE_AVATARS[slot % PROFILE_AVATARS.length];
    out.push({ slot, name, avatar });
  });
  if (!seen.has(0)) out.push({ slot: 0, name: "Child 1", avatar: "koala" });
  return out.sort((a, b) => a.slot - b.slot).slice(0, 4);
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });
}

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Constant-time-ish comparison so a wrong password can't be narrowed down by
// timing the response.
function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmac(value, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return toHex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
}

function fromHex(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return bytes;
}

// PBKDF2-SHA256 with a random 16-byte salt. Returns hex strings so both can
// sit in ordinary TEXT columns. Pass an existing saltHex back in to verify a
// password against a stored hash (same salt in, same hash out iff it matches).
async function hashPassword(password, saltHex) {
  const salt = saltHex ? fromHex(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return { hash: toHex(bits), salt: toHex(salt) };
}

async function verifyPassword(password, saltHex, expectedHashHex) {
  const { hash } = await hashPassword(password, saltHex);
  return safeEqual(hash, expectedHashHex);
}

// The session cookie carries the user id and role directly (HMAC-signed, so
// it can't be forged or edited client-side) rather than a server-side
// session store — same stateless approach the old admin-only cookie used.
async function makeSessionToken(env, userId, role) {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = `${userId}.${role}.${expiresAt}`;
  return `${payload}.${await hmac(payload, env.SESSION_SECRET)}`;
}

// Returns { id, role } for a valid session cookie whose account still exists,
// or null — the caller re-reads the user row from the DB when it needs
// anything beyond id/role (e.g. username), since those can't change mid-session.
async function getSessionUser(request, env) {
  const cookies = request.headers.get("cookie") || "";
  const match = cookies.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  if (!match) return null;
  const parts = decodeURIComponent(match[1]).split(".");
  if (parts.length !== 4) return null;
  const [userId, role, expiresAt, signature] = parts;
  if (!userId || !role || !expiresAt || !signature) return null;
  if (Number(expiresAt) < Date.now()) return null;
  const payload = `${userId}.${role}.${expiresAt}`;
  if (!safeEqual(signature, await hmac(payload, env.SESSION_SECRET))) return null;
  // The signed cookie proves *who* this is, but the role is re-read from the
  // database on every request: a subscription that just ended (or an admin
  // change) takes effect immediately instead of when the cookie expires, and
  // a closed account's cookie stops working the moment the row is gone.
  const row = await env.DB.prepare("SELECT role FROM users WHERE id = ?").bind(userId).first();
  if (!row) return null;
  return { id: userId, role: row.role };
}

function sessionCookie(token, maxAgeSeconds) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}

// Password policy: 8+ characters with at least one uppercase letter, one digit
// and one special character. (The frontend shows the same rules; the server
// is the real check.)
function validPassword(password) {
  return (
    typeof password === "string" &&
    password.length >= 8 &&
    password.length <= 200 &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function validEmail(email) {
  return email.length <= 254 && /^[^\s@<>"'`\\]+@[^\s@<>"'`\\]+\.[^\s@<>"'`\\]{2,}$/.test(email);
}

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 30 * 60 * 1000;
const EMAIL_COOLDOWN_MS = 60 * 1000;

// One-time email tokens. The raw token only ever lives in the emailed link;
// the database keeps an HMAC of it, so a leaked table can't be replayed.
async function makeEmailToken(env, userId, kind, ttlMs) {
  const raw = toHex(crypto.getRandomValues(new Uint8Array(32)));
  const now = Date.now();
  await env.DB.prepare("UPDATE email_tokens SET used_at = ? WHERE user_id = ? AND kind = ? AND used_at IS NULL")
    .bind(now, userId, kind)
    .run();
  await env.DB.prepare(
    "INSERT INTO email_tokens (token_hash, user_id, kind, created_at, expires_at) VALUES (?, ?, ?, ?, ?)"
  )
    .bind(await hmac(raw, env.SESSION_SECRET), userId, kind, now, now + ttlMs)
    .run();
  return raw;
}

// Looks up a still-valid, unused token and marks it used. Returns its row or null.
async function consumeEmailToken(env, raw, kind) {
  if (typeof raw !== "string" || !/^[0-9a-f]{64}$/.test(raw)) return null;
  const tokenHash = await hmac(raw, env.SESSION_SECRET);
  const now = Date.now();
  const row = await env.DB.prepare(
    "SELECT * FROM email_tokens WHERE token_hash = ? AND kind = ? AND used_at IS NULL AND expires_at > ?"
  )
    .bind(tokenHash, kind, now)
    .first();
  if (!row) return null;
  await env.DB.prepare("UPDATE email_tokens SET used_at = ? WHERE token_hash = ?").bind(now, tokenHash).run();
  return row;
}

// True if a token of this kind was made for this account in the last minute
// (stops someone using the forms to flood an inbox).
async function recentlyEmailed(env, userId, kind) {
  const row = await env.DB.prepare("SELECT created_at FROM email_tokens WHERE user_id = ? AND kind = ? ORDER BY created_at DESC LIMIT 1")
    .bind(userId, kind)
    .first();
  return !!row && Date.now() - row.created_at < EMAIL_COOLDOWN_MS;
}

async function sendVerificationEmail(env, user, email) {
  const link = `${emailSettings(env).appUrl}/?verify=${await makeEmailToken(env, user.id, "verify", VERIFY_TTL_MS)}`;
  return sendEmail(env, { to: email, kind: "verify", ...templates.verifyEmail(link, user.username) });
}

function publicUser(row) {
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    email: row.email || null,
    emailVerified: !!row.email_verified_at,
  };
}

function genId() {
  return crypto.randomUUID();
}

// A voucher code an admin generates and hands to someone directly (no email
// step) so they can sign up as a paid account. Readable groups, no visually
// ambiguous characters (0/O, 1/I/L) since it may be typed by hand.
function genSpecialCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const group = () =>
    Array.from(crypto.getRandomValues(new Uint8Array(4)))
      .map((b) => chars[b % chars.length])
      .join("");
  return `${group()}-${group()}-${group()}-${group()}`;
}

/* ---------- word shape ---------- */

function rowToWord(row) {
  return {
    id: row.id,
    word: row.word,
    definitionEn: row.definition_en,
    definitionKo: row.definition_ko,
    levelEn: row.level_en,
    levelKo: row.level_ko,
    pos: row.pos || null,
    example: row.example || "",
    noDefinitionEn: !!row.no_definition_en,
    noDefinitionKo: !!row.no_definition_ko,
    source: row.source,
    ownerId: row.owner_id || null,
    createdAt: row.created_at,
  };
}

function text(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_FIELD_LENGTH);
}

// Returns a sanitised word, or null if it isn't usable.
function cleanWord(raw) {
  if (!raw || typeof raw !== "object") return null;
  const word = text(raw.word);
  const id = text(raw.id);
  if (!word || !id) return null;
  return {
    id,
    word,
    definition_en: text(raw.definitionEn),
    definition_ko: text(raw.definitionKo),
    level_en: text(raw.levelEn),
    level_ko: text(raw.levelKo),
    pos: text(raw.pos),
    example: text(raw.example) || "",
    no_definition_en: raw.noDefinitionEn ? 1 : 0,
    no_definition_ko: raw.noDefinitionKo ? 1 : 0,
    source: text(raw.source),
    created_at: Number.isFinite(raw.createdAt) ? raw.createdAt : Date.now(),
  };
}

// A free account may have an upgrade request in flight — null for anyone
// else, or once it's been dismissed.
async function fetchPendingUpgradeRequest(env, userId, role) {
  if (role !== "free") return null;
  const reqRow = await env.DB.prepare(
    "SELECT id, status, code FROM upgrade_requests WHERE user_id = ? AND status != 'dismissed' ORDER BY requested_at DESC LIMIT 1"
  )
    .bind(userId)
    .first();
  return reqRow ? { id: reqRow.id, status: reqRow.status, code: reqRow.code || null } : null;
}

/* ---------- API ---------- */

// Removes an account and everything that belongs to it. A deleted account's
// own private words (owner_id = them) go with it — admin-shared words
// (owner_id NULL) are never touched, since they don't belong to any one
// account. Pending requests go too; a redeemed code's redeemed_by is left
// as-is, a harmless dangling reference kept for the audit trail rather than
// erased. Used by both the admin "delete user" tool and self-service closing.
async function purgeUser(env, userId) {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM shared_words WHERE owner_id = ?").bind(userId),
    env.DB.prepare("DELETE FROM upgrade_requests WHERE user_id = ?").bind(userId),
    env.DB.prepare("DELETE FROM koala_grants WHERE user_id = ?").bind(userId),
    env.DB.prepare("DELETE FROM user_koala WHERE user_id = ?").bind(userId),
    env.DB.prepare("DELETE FROM user_rewards WHERE user_id = ?").bind(userId),
    env.DB.prepare("DELETE FROM user_progress WHERE account_key IN (?, ?, ?, ?, ?)").bind(userId, `${userId}:p1`, `${userId}:p2`, `${userId}:p3`, `${userId}:profiles`),
    env.DB.prepare("DELETE FROM email_tokens WHERE user_id = ?").bind(userId),
    env.DB.prepare("DELETE FROM weekly_report_prefs WHERE user_id = ?").bind(userId),
    env.DB.prepare("DELETE FROM subscriptions WHERE user_id = ?").bind(userId),
    env.DB.prepare("DELETE FROM support_messages WHERE ticket_id IN (SELECT id FROM support_tickets WHERE user_id = ?)").bind(userId),
    env.DB.prepare("DELETE FROM support_tickets WHERE user_id = ?").bind(userId),
    env.DB.prepare("DELETE FROM customer_notes WHERE user_id = ?").bind(userId),
    env.DB.prepare("DELETE FROM users WHERE id = ?").bind(userId),
  ]);
}

async function handleApi(request, env, url) {
  const route = url.pathname.slice("/api".length);

  // A signed-in account whose email is on file but not yet confirmed can only
  // use the /auth/* routes (to confirm, resend, change email, or log out) —
  // nothing else on the site works until the link in the email is opened.
  // Admins and older accounts with no email on file are not affected.
  // /support/* and /announcement stay open too: someone stuck on the
  // confirmation step is exactly who needs to be able to write to us.
  // /billing/* stays open too: a new Premium sign-up pays before confirming the email.
  if (!route.startsWith("/auth/") && !route.startsWith("/support/") && !route.startsWith("/billing/") && route !== "/announcement") {
    const gateSession = await getSessionUser(request, env);
    if (gateSession && gateSession.role !== "admin") {
      const gateRow = await env.DB.prepare("SELECT email, email_verified_at FROM users WHERE id = ?").bind(gateSession.id).first();
      if (gateRow && gateRow.email && !gateRow.email_verified_at) return json({ error: "email_not_verified" }, 403);
    }
  }

  // Customer support: inquiries, admin inbox, customer notes, announcement.
  if (route.startsWith("/support/") || route.startsWith("/admin/support/") || route.startsWith("/admin/customer") || route === "/admin/overview" || route === "/admin/announcement" || route === "/announcement") {
    const res = await handleSupport({
      route, request, env, url,
      h: { json, getSessionUser, genId, normalizeEmail, validEmail, hmac, rowToAdminUser: (r) => ({
        id: r.id, username: r.username, role: r.role, createdAt: r.created_at, upgradedAt: r.upgraded_at || null,
        email: r.email || null, emailVerified: !!r.email_verified_at,
      }) },
    });
    if (res) return res;
  }

  // Premium subscriptions (Stripe checkout, webhook, cancel/resume).
  if (route.startsWith("/billing/")) {
    const res = await handleBilling({
      route, request, env, url,
      h: { json, getSessionUser, makeSessionToken, sessionCookie, SESSION_TTL_MS },
    });
    if (res) return res;
  }

  if (route === "/words" && request.method === "GET") {
    // Admin-shared words (owner_id NULL) are visible to everyone, signed in
    // or not. A paid account additionally sees its own private words — no
    // one else's, and a free/anonymous visitor never sees any private words.
    const session = await getSessionUser(request, env);
    const query =
      session && session.role === "paid"
        ? env.DB.prepare("SELECT * FROM shared_words WHERE owner_id IS NULL OR owner_id = ? ORDER BY created_at DESC").bind(
            session.id
          )
        : env.DB.prepare("SELECT * FROM shared_words WHERE owner_id IS NULL ORDER BY created_at DESC");
    const { results } = await query.all();
    return json({ words: (results || []).map(rowToWord) });
  }

  if (route === "/auth/me" && request.method === "GET") {
    const session = await getSessionUser(request, env);
    if (!session) return json({ user: null });
    const row = await env.DB.prepare("SELECT id, username, role, created_at, upgraded_at, email, email_verified_at FROM users WHERE id = ?")
      .bind(session.id)
      .first();
    if (!row) return json({ user: null });
    const pendingUpgradeRequest = await fetchPendingUpgradeRequest(env, row.id, row.role);
    const user = {
      ...publicUser(row),
      createdAt: row.created_at,
      upgradedAt: row.upgraded_at || null,
    };
    return json({ user, pendingUpgradeRequest });
  }

  if (route === "/auth/signup" && request.method === "POST") {
    if (!env.SESSION_SECRET) return json({ error: "server_not_configured" }, 500);
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: "bad_request" }, 400);
    }
    const password = typeof body?.password === "string" ? body.password : "";
    const specialCode = typeof body?.specialCode === "string" ? body.specialCode.trim() : "";
    // The login ID is the email address itself (lower-cased), so the email
    // doubles as the unique username.
    const email = normalizeEmail(body?.email);
    const username = email;

    if (!validEmail(email)) return json({ error: "invalid_email" }, 400);
    if (!validPassword(password)) return json({ error: "invalid_password" }, 400);
    // Account owner must be an adult guardian who accepted the terms.
    if (body?.agreedTerms !== true || body?.isGuardian !== true) return json({ error: "consent_required" }, 400);

    // Taken if it's already someone's login ID or the email on any account
    // (older accounts may still carry the email in a separate column).
    const existing = await env.DB.prepare("SELECT id FROM users WHERE username = ? OR email = ?").bind(username, email).first();
    if (existing) return json({ error: "email_taken" }, 409);

    let role = "free";
    let redeemedCode = null;
    if (specialCode) {
      // A code targeted at a specific user's upgrade request presumes an
      // account that already exists — signup only accepts a general,
      // untargeted code.
      const codeRow = await env.DB.prepare(
        "SELECT code FROM special_codes WHERE code = ? AND redeemed_by IS NULL AND target_user_id IS NULL"
      )
        .bind(specialCode)
        .first();
      if (!codeRow) return json({ error: "invalid_code" }, 400);
      role = "paid";
      redeemedCode = specialCode;
    }

    const { hash, salt } = await hashPassword(password);
    const id = genId();
    const now = Date.now();
    const upgradedAt = role === "paid" ? now : null;
    await env.DB.prepare(
      "INSERT INTO users (id, username, password_hash, password_salt, role, created_at, upgraded_at, email) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
      .bind(id, username, hash, salt, role, now, upgradedAt, email)
      .run();

    if (redeemedCode) {
      await env.DB.prepare("UPDATE special_codes SET redeemed_by = ?, redeemed_at = ? WHERE code = ?")
        .bind(id, now, redeemedCode)
        .run();
    }

    // Ask them to confirm the address. A failed send never blocks signup —
    // they can resend it from My Account.
    let verificationSent = false;
    try {
      verificationSent = (await sendVerificationEmail(env, { id, username }, email)).ok;
    } catch (e) {
      verificationSent = false;
    }

    const token = await makeSessionToken(env, id, role);
    return json(
      { user: { id, username, role, email, emailVerified: false }, verificationSent },
      200,
      { "set-cookie": sessionCookie(token, SESSION_TTL_MS / 1000) }
    );
  }

  if (route === "/auth/login" && request.method === "POST") {
    if (!env.SESSION_SECRET) return json({ error: "server_not_configured" }, 500);
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: "bad_request" }, 400);
    }
    // The login ID is the email address. "admin" stays accepted as the one
    // non-email ID (the bootstrap admin account); anything else that isn't an
    // email gets a specific answer so the login window can explain the change.
    const rawId = typeof body?.email === "string" ? body.email : typeof body?.username === "string" ? body.username : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const isBootstrapAdmin = rawId.trim() === ADMIN_BOOTSTRAP_USERNAME;
    const username = isBootstrapAdmin ? ADMIN_BOOTSTRAP_USERNAME : normalizeEmail(rawId);
    if (!username || !password) return json({ error: "invalid_credentials" }, 401);
    if (!isBootstrapAdmin && !validEmail(username)) return json({ error: "login_use_email" }, 401);

    let user = await env.DB.prepare("SELECT * FROM users WHERE username = ?").bind(username).first();

    // One-time bootstrap: the first time anyone logs in as "admin" with the
    // legacy ADMIN_PASSWORD secret, create the real admin account for it and
    // sign them straight in — every login after this one goes through the
    // normal password-hash check below like any other account.
    if (!user && username === ADMIN_BOOTSTRAP_USERNAME && env.ADMIN_PASSWORD && safeEqual(password, env.ADMIN_PASSWORD)) {
      const { hash, salt } = await hashPassword(password);
      const id = genId();
      await env.DB.prepare(
        "INSERT INTO users (id, username, password_hash, password_salt, role, created_at) VALUES (?, ?, ?, ?, 'admin', ?)"
      )
        .bind(id, username, hash, salt, Date.now())
        .run();
      const token = await makeSessionToken(env, id, "admin");
      return json(
        { user: { id, username, role: "admin" } },
        200,
        { "set-cookie": sessionCookie(token, SESSION_TTL_MS / 1000) }
      );
    }

    if (!user) return json({ error: "invalid_credentials" }, 401);
    if (!(await verifyPassword(password, user.password_salt, user.password_hash))) {
      return json({ error: "invalid_credentials" }, 401);
    }

    const token = await makeSessionToken(env, user.id, user.role);
    const pendingUpgradeRequest = await fetchPendingUpgradeRequest(env, user.id, user.role);
    return json(
      { user: publicUser(user), pendingUpgradeRequest },
      200,
      { "set-cookie": sessionCookie(token, SESSION_TTL_MS / 1000) }
    );
  }

  if (route === "/auth/logout" && request.method === "POST") {
    return json({ ok: true }, 200, { "set-cookie": sessionCookie("", 0) });
  }

  if (route === "/auth/change-password" && request.method === "POST") {
    const session = await getSessionUser(request, env);
    if (!session) return json({ error: "unauthorized" }, 401);
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: "bad_request" }, 400);
    }
    const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";
    if (!currentPassword || !validPassword(newPassword)) return json({ error: "bad_request" }, 400);

    const user = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(session.id).first();
    if (!user) return json({ error: "unauthorized" }, 401);
    if (!(await verifyPassword(currentPassword, user.password_salt, user.password_hash))) {
      return json({ error: "wrong_current_password" }, 400);
    }

    const { hash, salt } = await hashPassword(newPassword);
    await env.DB.prepare("UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?")
      .bind(hash, salt, session.id)
      .run();
    return json({ ok: true });
  }

  // Self-service account closing. Password re-entered to confirm; the admin
  // account can't be closed this way. A live Stripe subscription is cancelled
  // first (customer deleted) — if that fails nothing is deleted, so a closed
  // account can never keep being charged.
  if (route === "/auth/delete-account" && request.method === "POST") {
    const session = await getSessionUser(request, env);
    if (!session) return json({ error: "unauthorized" }, 401);
    if (session.role === "admin") return json({ error: "cannot_delete_admin" }, 400);
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: "bad_request" }, 400);
    }
    const password = typeof body?.password === "string" ? body.password : "";
    const user = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(session.id).first();
    if (!user) return json({ error: "unauthorized" }, 401);
    if (!password || !(await verifyPassword(password, user.password_salt, user.password_hash))) {
      return json({ error: "wrong_current_password" }, 400);
    }
    if (!(await closeBillingForUser(env, user.id))) return json({ error: "billing_cancel_failed" }, 502);
    await purgeUser(env, user.id);
    return json({ ok: true }, 200, { "set-cookie": sessionCookie("", 0) });
  }

  // Add or change the account's email address (existing accounts that signed
  // up before email was required use this too). Password re-entered to confirm.
  if (route === "/auth/set-email" && request.method === "POST") {
    if (!env.SESSION_SECRET) return json({ error: "server_not_configured" }, 500);
    const session = await getSessionUser(request, env);
    if (!session) return json({ error: "unauthorized" }, 401);
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: "bad_request" }, 400);
    }
    const email = normalizeEmail(body?.email);
    const password = typeof body?.password === "string" ? body.password : "";
    if (!validEmail(email)) return json({ error: "invalid_email" }, 400);
    const user = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(session.id).first();
    if (!user) return json({ error: "unauthorized" }, 401);
    if (!password || !(await verifyPassword(password, user.password_salt, user.password_hash))) {
      return json({ error: "wrong_current_password" }, 400);
    }
    // The email is the login ID, so it must not belong to anyone else —
    // either as their ID or as the address on their account.
    const clash = await env.DB.prepare("SELECT id FROM users WHERE id != ? AND (username = ? OR email = ?)")
      .bind(user.id, email, email)
      .first();
    if (clash) return json({ error: "email_taken" }, 409);
    // The admin account keeps its "admin" login ID; everyone else's ID follows the email.
    if (user.role === "admin") {
      await env.DB.prepare("UPDATE users SET email = ?, email_verified_at = NULL WHERE id = ?").bind(email, user.id).run();
    } else {
      await env.DB.prepare("UPDATE users SET email = ?, username = ?, email_verified_at = NULL WHERE id = ?")
        .bind(email, email, user.id)
        .run();
    }
    const sent = await sendVerificationEmail(env, { ...user, username: email }, email);
    return json({ ok: true, email, emailVerified: false, verificationSent: sent.ok });
  }

  // Sends the signed-in user's own report to their own (verified) address.
  // The report numbers come from the browser (progress lives on the device),
  // so the template clamps and escapes them; the recipient is always the
  // address on the account, never something the request supplies.
  if (route === "/report/send" && request.method === "POST") {
    if (!env.SESSION_SECRET) return json({ error: "server_not_configured" }, 500);
    const session = await getSessionUser(request, env);
    if (!session) return json({ error: "unauthorized" }, 401);
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: "bad_request" }, 400);
    }
    if (!body || typeof body !== "object") return json({ error: "bad_request" }, 400);
    const user = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(session.id).first();
    if (!user || !user.email) return json({ error: "no_email" }, 400);
    if (!user.email_verified_at && user.role !== "admin") return json({ error: "email_not_verified" }, 403);
    const recent = await env.DB.prepare("SELECT created_at FROM email_log WHERE to_addr = ? AND kind = 'weekly_report' ORDER BY created_at DESC LIMIT 1")
      .bind(user.email)
      .first();
    if (recent && Date.now() - recent.created_at < EMAIL_COOLDOWN_MS) return json({ error: "too_soon" }, 429);
    // 2+ children: add the others' reports (from the server) next to the one
    // the browser sent for the child that is open on the device.
    delete body.children;
    const prefs = await env.DB.prepare("SELECT tz_offset FROM weekly_report_prefs WHERE user_id = ?").bind(user.id).first().catch(() => null);
    const tz = Number.isFinite(Number(body.tzOffset)) ? Math.max(-840, Math.min(840, Number(body.tzOffset))) : Number(prefs && prefs.tz_offset) || 0;
    const slot = Number.isInteger(Number(body.activeSlot)) ? Number(body.activeSlot) : 0;
    const kids = await childrenReports(env, user.id, tz, body.lang === "ko" ? "ko" : "en", { slot, report: body });
    if (kids.length > 1) body.children = kids;
    const sent = await sendEmail(env, { to: user.email, kind: "weekly_report", ...templates.weeklyReport(body, user.username) });
    return json({ ok: sent.ok, error: sent.ok ? undefined : sent.error }, sent.ok ? 200 : 502);
  }

  // "Send me this report every week": a per-account switch read by the weekly cron.
  if (route === "/report/auto" && (request.method === "GET" || request.method === "PUT")) {
    if (!env.SESSION_SECRET) return json({ error: "server_not_configured" }, 500);
    const session = await getSessionUser(request, env);
    if (!session) return json({ error: "unauthorized" }, 401);
    try {
      if (request.method === "GET") {
        const row = await env.DB.prepare("SELECT enabled FROM weekly_report_prefs WHERE user_id = ?").bind(session.id).first();
        return json({ enabled: !!(row && row.enabled) });
      }
      let body;
      try { body = await request.json(); } catch (e) { return json({ error: "bad_request" }, 400); }
      const user = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(session.id).first();
      if (!user || !user.email) return json({ error: "no_email" }, 400);
      if (!user.email_verified_at && user.role !== "admin") return json({ error: "email_not_verified" }, 403);
      const enabled = body && body.enabled ? 1 : 0;
      const tz = Math.max(-720, Math.min(840, Math.round(Number(body && body.tzOffset) || 0)));
      const lang = body && body.lang === "ko" ? "ko" : "en";
      await env.DB.prepare(
        `INSERT INTO weekly_report_prefs (user_id, enabled, tz_offset, lang, updated_at) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET enabled = excluded.enabled, tz_offset = excluded.tz_offset, lang = excluded.lang, updated_at = excluded.updated_at`
      ).bind(session.id, enabled, tz, lang, Date.now()).run();
      return json({ ok: true, enabled: !!enabled });
    } catch (e) {
      return json({ error: "not_ready" }, 503);
    }
  }

  if (route === "/auth/resend-verification" && request.method === "POST") {
    if (!env.SESSION_SECRET) return json({ error: "server_not_configured" }, 500);
    const session = await getSessionUser(request, env);
    if (!session) return json({ error: "unauthorized" }, 401);
    const user = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(session.id).first();
    if (!user || !user.email) return json({ error: "no_email" }, 400);
    if (user.email_verified_at) return json({ ok: true, alreadyVerified: true });
    if (await recentlyEmailed(env, user.id, "verify")) return json({ error: "too_soon" }, 429);
    const sent = await sendVerificationEmail(env, user, user.email);
    return json({ ok: sent.ok, verificationSent: sent.ok }, sent.ok ? 200 : 502);
  }

  // The link in the verification email lands on /?verify=TOKEN; the page posts it here.
  if (route === "/auth/verify-email" && request.method === "POST") {
    if (!env.SESSION_SECRET) return json({ error: "server_not_configured" }, 500);
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: "bad_request" }, 400);
    }
    const row = await consumeEmailToken(env, body?.token, "verify");
    if (!row) return json({ error: "invalid_token" }, 400);
    await env.DB.prepare("UPDATE users SET email_verified_at = ? WHERE id = ? AND email IS NOT NULL")
      .bind(Date.now(), row.user_id)
      .run();
    return json({ ok: true });
  }

  // "I forgot my password": emails a one-time reset link to the address on
  // file — but only if that address was verified. The answer is always the
  // same, so the form can't be used to find out which usernames exist.
  if (route === "/auth/forgot-password" && request.method === "POST") {
    if (!env.SESSION_SECRET) return json({ error: "server_not_configured" }, 500);
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: "bad_request" }, 400);
    }
    const idRaw = typeof body?.email === "string" ? body.email : typeof body?.username === "string" ? body.username : "";
    const username = normalizeEmail(idRaw);
    if (!username) return json({ error: "bad_request" }, 400);
    // Login ID is the email; fall back to the address column for any older
    // account whose ID wasn't converted.
    const user = await env.DB.prepare("SELECT * FROM users WHERE username = ? OR email = ? ORDER BY (username = ?) DESC LIMIT 1")
      .bind(username, username, username)
      .first();
    if (user && user.role !== "admin" && user.email && user.email_verified_at && !(await recentlyEmailed(env, user.id, "reset"))) {
      const link = `${emailSettings(env).appUrl}/?reset=${await makeEmailToken(env, user.id, "reset", RESET_TTL_MS)}`;
      await sendEmail(env, { to: user.email, kind: "reset", ...templates.resetPassword(link, user.username) });
    }
    return json({ ok: true });
  }

  // "I forgot my username": emails the usernames registered with a verified
  // address. Same always-the-same answer as above.
  if (route === "/auth/forgot-username" && request.method === "POST") {
    if (!env.SESSION_SECRET) return json({ error: "server_not_configured" }, 500);
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: "bad_request" }, 400);
    }
    const email = normalizeEmail(body?.email);
    if (!validEmail(email)) return json({ error: "invalid_email" }, 400);
    const { results } = await env.DB.prepare(
      "SELECT username FROM users WHERE email = ? AND email_verified_at IS NOT NULL AND role != 'admin' ORDER BY created_at"
    )
      .bind(email)
      .all();
    const names = (results || []).map((r) => r.username);
    if (names.length) {
      const recent = await env.DB.prepare(
        "SELECT created_at FROM email_log WHERE to_addr = ? AND kind = 'forgot_username' ORDER BY created_at DESC LIMIT 1"
      )
        .bind(email)
        .first();
      if (!recent || Date.now() - recent.created_at >= EMAIL_COOLDOWN_MS) {
        await sendEmail(env, { to: email, kind: "forgot_username", ...templates.usernames(names, emailSettings(env).appUrl) });
      }
    }
    return json({ ok: true });
  }

  // The reset link lands on /?reset=TOKEN; the page posts the token and a new password here.
  if (route === "/auth/reset-password" && request.method === "POST") {
    if (!env.SESSION_SECRET) return json({ error: "server_not_configured" }, 500);
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: "bad_request" }, 400);
    }
    const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";
    if (!validPassword(newPassword)) return json({ error: "invalid_password" }, 400);
    const row = await consumeEmailToken(env, body?.token, "reset");
    if (!row) return json({ error: "invalid_token" }, 400);
    const user = await env.DB.prepare("SELECT username FROM users WHERE id = ?").bind(row.user_id).first();
    if (!user) return json({ error: "invalid_token" }, 400);
    const { hash, salt } = await hashPassword(newPassword);
    await env.DB.prepare("UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?").bind(hash, salt, row.user_id).run();
    return json({ ok: true, username: user.username });
  }

  // Redeems a voucher code against an already-existing free account, moving
  // it to paid — the same one-time code mechanism signup already uses,
  // just for someone who signed up before deciding to upgrade.
  if (route === "/auth/upgrade" && request.method === "POST") {
    const session = await getSessionUser(request, env);
    if (!session) return json({ error: "unauthorized" }, 401);
    if (session.role !== "free") return json({ error: "not_eligible" }, 400);

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: "bad_request" }, 400);
    }
    const specialCode = typeof body?.specialCode === "string" ? body.specialCode.trim() : "";
    if (!specialCode) return json({ error: "invalid_code" }, 400);

    // A general code (no target) redeems for anyone; a code targeted at a
    // specific user's upgrade request only redeems for that one account.
    const codeRow = await env.DB.prepare(
      "SELECT code FROM special_codes WHERE code = ? AND redeemed_by IS NULL AND (target_user_id IS NULL OR target_user_id = ?)"
    )
      .bind(specialCode, session.id)
      .first();
    if (!codeRow) return json({ error: "invalid_code" }, 400);

    const now = Date.now();
    await env.DB.prepare("UPDATE users SET role = 'paid', upgraded_at = ? WHERE id = ?").bind(now, session.id).run();
    await env.DB.prepare("UPDATE special_codes SET redeemed_by = ?, redeemed_at = ? WHERE code = ?")
      .bind(session.id, now, specialCode)
      .run();

    const user = await env.DB.prepare("SELECT id, username, role FROM users WHERE id = ?").bind(session.id).first();
    const token = await makeSessionToken(env, user.id, user.role);
    return json({ user }, 200, { "set-cookie": sessionCookie(token, SESSION_TTL_MS / 1000) });
  }

  // A free account asks to be upgraded — admin will see this in the pending
  // requests list and, on approval, generate a code bound to this account.
  // Idempotent: re-requesting while one is already pending just returns it.
  if (route === "/auth/upgrade-request" && request.method === "POST") {
    const session = await getSessionUser(request, env);
    if (!session) return json({ error: "unauthorized" }, 401);
    if (session.role !== "free") return json({ error: "not_eligible" }, 400);

    const existing = await env.DB.prepare("SELECT id, status, code FROM upgrade_requests WHERE user_id = ? AND status = 'pending'")
      .bind(session.id)
      .first();
    if (existing) return json({ request: existing });

    const id = genId();
    const now = Date.now();
    await env.DB.prepare("INSERT INTO upgrade_requests (id, user_id, status, requested_at) VALUES (?, ?, 'pending', ?)")
      .bind(id, session.id, now)
      .run();
    return json({ request: { id, status: "pending", code: null } });
  }

  if (route === "/admin/codes" && request.method === "GET") {
    const session = await getSessionUser(request, env);
    if (!session || session.role !== "admin") return json({ error: "unauthorized" }, 401);
    const { results } = await env.DB.prepare(
      `SELECT sc.code, sc.created_at, sc.redeemed_at, u.username AS redeemed_by_username
       FROM special_codes sc
       LEFT JOIN users u ON sc.redeemed_by = u.id
       ORDER BY sc.created_at DESC`
    ).all();
    return json({
      codes: (results || []).map((r) => ({
        code: r.code,
        createdAt: r.created_at,
        redeemedAt: r.redeemed_at || null,
        redeemedByUsername: r.redeemed_by_username || null,
      })),
    });
  }

  if (route === "/admin/codes" && request.method === "POST") {
    const session = await getSessionUser(request, env);
    if (!session || session.role !== "admin") return json({ error: "unauthorized" }, 401);
    const code = genSpecialCode();
    const now = Date.now();
    await env.DB.prepare("INSERT INTO special_codes (code, created_by, created_at) VALUES (?, ?, ?)")
      .bind(code, session.id, now)
      .run();
    return json({ code: { code, createdAt: now, redeemedAt: null, redeemedByUsername: null } });
  }

  if (route === "/admin/codes/delete" && request.method === "POST") {
    const session = await getSessionUser(request, env);
    if (!session || session.role !== "admin") return json({ error: "unauthorized" }, 401);
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: "bad_request" }, 400);
    }
    const code = typeof body?.code === "string" ? body.code : "";
    if (!code) return json({ error: "bad_request" }, 400);
    await env.DB.prepare("DELETE FROM special_codes WHERE code = ?").bind(code).run();
    return json({ ok: true });
  }

  const VALID_ROLES = ["free", "paid", "admin"];

  function rowToAdminUser(r) {
    return {
      id: r.id,
      username: r.username,
      role: r.role,
      createdAt: r.created_at,
      upgradedAt: r.upgraded_at || null,
      pendingRequestId: r.pending_request_id || null,
      email: r.email || null,
      emailVerified: !!r.email_verified_at,
    };
  }

  // ---- Admin: review / fix / remove the private words paid accounts added ----
  // These live in shared_words with owner_id set. The normal /words routes
  // deliberately never let an admin touch them; this is the one audited door.
  if (route === "/admin/user-words" && request.method === "GET") {
    const session = await getSessionUser(request, env);
    if (!session || session.role !== "admin") return json({ error: "unauthorized" }, 401);
    const { results } = await env.DB.prepare(
      `SELECT w.*, u.username AS owner_username
       FROM shared_words w
       JOIN users u ON u.id = w.owner_id
       WHERE w.owner_id IS NOT NULL
       ORDER BY w.created_at DESC`
    ).all();
    return json({
      words: (results || []).map((r) => ({ ...rowToWord(r), ownerUsername: r.owner_username, updatedAt: r.updated_at || null })),
    });
  }

  if (route === "/admin/user-words/update" && request.method === "POST") {
    const session = await getSessionUser(request, env);
    if (!session || session.role !== "admin") return json({ error: "unauthorized" }, 401);
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: "bad_request" }, 400);
    }
    const w = cleanWord(body);
    if (!w) return json({ error: "bad_request" }, 400);
    const result = await env.DB.prepare(
      `UPDATE shared_words SET word = ?, definition_en = ?, definition_ko = ?, level_en = ?, level_ko = ?, pos = ?,
              example = ?, no_definition_en = ?, no_definition_ko = ?, updated_at = ?
       WHERE id = ? AND owner_id IS NOT NULL`
    )
      .bind(
        w.word, w.definition_en, w.definition_ko, w.level_en, w.level_ko, w.pos, w.example,
        w.definition_en ? 0 : 1, w.definition_ko ? 0 : 1, Date.now(), w.id
      )
      .run();
    const changes = result && result.meta ? result.meta.changes : 0;
    if (!changes) return json({ error: "not_found" }, 404);
    return json({ ok: true });
  }

  if (route === "/admin/user-words/delete" && request.method === "POST") {
    const session = await getSessionUser(request, env);
    if (!session || session.role !== "admin") return json({ error: "unauthorized" }, 401);
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: "bad_request" }, 400);
    }
    const ids = Array.isArray(body && body.ids) ? body.ids.filter((id) => typeof id === "string") : [];
    if (ids.length === 0) return json({ error: "bad_request" }, 400);
    if (ids.length > MAX_WORDS_PER_REQUEST) return json({ error: "too_many" }, 413);
    await env.DB.batch(ids.map((id) => env.DB.prepare("DELETE FROM shared_words WHERE id = ? AND owner_id IS NOT NULL").bind(id)));
    return json({ deleted: ids.length });
  }

  // Copy chosen premium-member words into the admin's shared pool (owner_id
  // NULL => everyone sees them). The member's original stays untouched. Words
  // already in the shared pool (same spelling, case-insensitive) are skipped.
  if (route === "/admin/user-words/promote" && request.method === "POST") {
    const session = await getSessionUser(request, env);
    if (!session || session.role !== "admin") return json({ error: "unauthorized" }, 401);
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: "bad_request" }, 400);
    }
    const ids = Array.isArray(body && body.ids) ? [...new Set(body.ids.filter((id) => typeof id === "string"))] : [];
    if (ids.length === 0) return json({ error: "bad_request" }, 400);
    if (ids.length > MAX_WORDS_PER_REQUEST) return json({ error: "too_many" }, 413);

    const { results: sources } = await env.DB.prepare(
      `SELECT * FROM shared_words WHERE owner_id IS NOT NULL AND id IN (${ids.map(() => "?").join(",")})`
    )
      .bind(...ids)
      .all();
    const { results: existing } = await env.DB.prepare("SELECT word FROM shared_words WHERE owner_id IS NULL").all();
    const taken = new Set((existing || []).map((r) => String(r.word).trim().toLowerCase()));

    const now = Date.now();
    const stmts = [];
    let skipped = 0;
    for (const r of sources || []) {
      const key = String(r.word).trim().toLowerCase();
      if (taken.has(key)) {
        skipped++;
        continue;
      }
      taken.add(key);
      stmts.push(
        env.DB.prepare(
          `INSERT INTO shared_words
             (id, word, definition_en, definition_ko, level_en, level_ko, pos, example,
              no_definition_en, no_definition_ko, source, owner_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`
        ).bind(
          genId(), r.word, r.definition_en, r.definition_ko, r.level_en, r.level_ko, r.pos ?? null, r.example,
          r.no_definition_en, r.no_definition_ko, r.source ?? null, now, now
        )
      );
    }
    if (stmts.length) await env.DB.batch(stmts);
    return json({ added: stmts.length, skipped, missing: ids.length - (sources || []).length });
  }

  if (route === "/admin/users" && request.method === "GET") {
    const session = await getSessionUser(request, env);
    if (!session || session.role !== "admin") return json({ error: "unauthorized" }, 401);
    const q = (url.searchParams.get("q") || "").trim();
    // A pending upgrade request (if any) rides along on the same row, so the
    // frontend can show one merged Users list instead of two separate ones.
    const base = `SELECT u.id, u.username, u.role, u.created_at, u.upgraded_at, u.email, u.email_verified_at,
                    (SELECT ur.id FROM upgrade_requests ur WHERE ur.user_id = u.id AND ur.status = 'pending'
                     ORDER BY ur.requested_at DESC LIMIT 1) AS pending_request_id
                   FROM users u`;
    const query = q
      ? env.DB.prepare(`${base} WHERE u.username LIKE ? OR u.email LIKE ? ORDER BY u.created_at DESC`).bind(`%${q}%`, `%${q}%`)
      : env.DB.prepare(`${base} ORDER BY u.created_at DESC`);
    const { results } = await query.all();
    return json({ users: (results || []).map(rowToAdminUser) });
  }

  // ---- Admin: email system status, test send, send log ----
  if (route === "/admin/email/status" && request.method === "GET") {
    const session = await getSessionUser(request, env);
    if (!session || session.role !== "admin") return json({ error: "unauthorized" }, 401);
    const s = emailSettings(env);
    const counts = await env.DB.prepare(
      "SELECT COUNT(*) AS total, COALESCE(SUM(status = 'failed'), 0) AS failed FROM email_log WHERE created_at > ?"
    )
      .bind(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .first()
      .catch(() => null);
    const noEmail = await env.DB.prepare("SELECT COUNT(*) AS n FROM users WHERE role != 'admin' AND (email IS NULL OR email = '')")
      .first()
      .catch(() => null);
    const unverified = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM users WHERE role != 'admin' AND email IS NOT NULL AND email != '' AND email_verified_at IS NULL"
    )
      .first()
      .catch(() => null);
    return json({
      configured: s.configured,
      from: s.from,
      replyTo: s.replyTo,
      appUrl: s.appUrl,
      last7Days: { total: counts ? counts.total : 0, failed: counts ? counts.failed : 0 },
      usersWithoutEmail: noEmail ? noEmail.n : 0,
      usersUnverified: unverified ? unverified.n : 0,
    });
  }

  if (route === "/admin/email/test" && request.method === "POST") {
    const session = await getSessionUser(request, env);
    if (!session || session.role !== "admin") return json({ error: "unauthorized" }, 401);
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: "bad_request" }, 400);
    }
    const to = normalizeEmail(body?.to);
    if (!validEmail(to)) return json({ error: "invalid_email" }, 400);
    const result = await sendEmail(env, { to, kind: "test", ...templates.test() });
    return json({ ok: result.ok, error: result.error }, result.ok ? 200 : 502);
  }

  if (route === "/admin/email/log" && request.method === "GET") {
    const session = await getSessionUser(request, env);
    if (!session || session.role !== "admin") return json({ error: "unauthorized" }, 401);
    const { results } = await env.DB.prepare(
      "SELECT id, to_addr, kind, subject, status, error, created_at FROM email_log ORDER BY created_at DESC, id DESC LIMIT 50"
    ).all();
    return json({
      log: (results || []).map((r) => ({
        id: r.id, to: r.to_addr, kind: r.kind, subject: r.subject, status: r.status, error: r.error || null, createdAt: r.created_at,
      })),
    });
  }

  if (route === "/admin/users/set-role" && request.method === "POST") {
    const session = await getSessionUser(request, env);
    if (!session || session.role !== "admin") return json({ error: "unauthorized" }, 401);
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: "bad_request" }, 400);
    }
    const userId = typeof body?.userId === "string" ? body.userId : "";
    const role = typeof body?.role === "string" ? body.role : "";
    if (!userId || !VALID_ROLES.includes(role)) return json({ error: "bad_request" }, 400);
    if (userId === session.id) return json({ error: "cannot_change_own_role" }, 400);

    const target = await env.DB.prepare("SELECT id FROM users WHERE id = ?").bind(userId).first();
    if (!target) return json({ error: "not_found" }, 404);

    if (role === "paid") {
      await env.DB.prepare("UPDATE users SET role = ?, upgraded_at = ? WHERE id = ?").bind(role, Date.now(), userId).run();
    } else {
      await env.DB.prepare("UPDATE users SET role = ? WHERE id = ?").bind(role, userId).run();
    }
    const updated = await env.DB.prepare(
      "SELECT id, username, role, created_at, upgraded_at FROM users WHERE id = ?"
    )
      .bind(userId)
      .first();
    return json({ user: rowToAdminUser(updated) });
  }

  if (route === "/admin/users/set-password" && request.method === "POST") {
    const session = await getSessionUser(request, env);
    if (!session || session.role !== "admin") return json({ error: "unauthorized" }, 401);
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: "bad_request" }, 400);
    }
    const userId = typeof body?.userId === "string" ? body.userId : "";
    const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";
    if (!userId || !validPassword(newPassword)) return json({ error: "bad_request" }, 400);

    const target = await env.DB.prepare("SELECT id FROM users WHERE id = ?").bind(userId).first();
    if (!target) return json({ error: "not_found" }, 404);

    const { hash, salt } = await hashPassword(newPassword);
    await env.DB.prepare("UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?")
      .bind(hash, salt, userId)
      .run();
    return json({ ok: true });
  }

  if (route === "/admin/users/delete" && request.method === "POST") {
    const session = await getSessionUser(request, env);
    if (!session || session.role !== "admin") return json({ error: "unauthorized" }, 401);
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: "bad_request" }, 400);
    }
    const userId = typeof body?.userId === "string" ? body.userId : "";
    if (!userId) return json({ error: "bad_request" }, 400);
    if (userId === session.id) return json({ error: "cannot_delete_self" }, 400);

    const target = await env.DB.prepare("SELECT id FROM users WHERE id = ?").bind(userId).first();
    if (!target) return json({ error: "not_found" }, 404);

    // Don't leave a live Stripe subscription behind a deleted account.
    if (!(await closeBillingForUser(env, userId))) return json({ error: "billing_cancel_failed" }, 502);
    await purgeUser(env, userId);
    return json({ ok: true });
  }

  /* ---------- Koala Coins: admin gifts + balance summary ---------- */
  const clampInt = (v, max) => {
    const n = Math.floor(Number(v));
    return Number.isFinite(n) ? Math.max(0, Math.min(max, n)) : 0;
  };

  // The child's Koala world (coins, items, streak, badges), saved per account.
  if (route === "/koala/data" && request.method === "GET") {
    const session = await getSessionUser(request, env);
    if (!session) return json({ error: "unauthorized" }, 401);
    const row = await env.DB.prepare("SELECT reward_json, updated_at FROM user_rewards WHERE user_id = ?").bind(session.id).first();
    if (!row) return json({ data: null, updatedAt: null });
    let data = null;
    try { data = JSON.parse(row.reward_json); } catch (e) { /* treat as empty */ }
    return json({ data, updatedAt: row.updated_at });
  }

  if (route === "/koala/data" && request.method === "PUT") {
    const session = await getSessionUser(request, env);
    if (!session) return json({ error: "unauthorized" }, 401);
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: "bad_request" }, 400);
    }
    const d = body && body.data;
    if (!d || typeof d !== "object" || Array.isArray(d) || typeof d.koala !== "object" || d.koala === null) return json({ error: "bad_request" }, 400);
    // The account's chosen study level per language (e.g. { en: "elem_high" }).
    const levels = {};
    ["en", "ko"].forEach((l) => {
      const v = d.levels && d.levels[l];
      if (typeof v === "string" && /^[a-z_]{2,20}$/.test(v)) levels[l] = v;
    });
    const text = JSON.stringify({ koala: d.koala, streak: d.streak || {}, badges: d.badges || {}, levels });
    if (text.length > 100000) return json({ error: "too_large" }, 413);
    const now = Date.now();
    await env.DB.prepare(
      `INSERT INTO user_rewards (user_id, reward_json, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET reward_json = excluded.reward_json, updated_at = excluded.updated_at`
    ).bind(session.id, text, now).run();
    return json({ ok: true, updatedAt: now });
  }

  // The signed-in child's device asks for gifts it hasn't applied yet.
  if (route === "/koala/grants" && request.method === "GET") {
    const session = await getSessionUser(request, env);
    if (!session) return json({ error: "unauthorized" }, 401);
    const { results } = await env.DB.prepare(
      "SELECT id, amount, note, created_at FROM koala_grants WHERE user_id = ? AND applied_at IS NULL ORDER BY id ASC LIMIT 50"
    ).bind(session.id).all();
    return json({ grants: results || [] });
  }

  // ...and confirms the ones it applied, so they aren't handed out twice.
  if (route === "/koala/grants/ack" && request.method === "POST") {
    const session = await getSessionUser(request, env);
    if (!session) return json({ error: "unauthorized" }, 401);
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: "bad_request" }, 400);
    }
    const ids = Array.isArray(body?.ids) ? body.ids.map(Number).filter((n) => Number.isInteger(n)).slice(0, 50) : [];
    if (ids.length) {
      const now = Date.now();
      await env.DB.batch(
        ids.map((id) =>
          env.DB.prepare("UPDATE koala_grants SET applied_at = ? WHERE id = ? AND user_id = ? AND applied_at IS NULL").bind(now, id, session.id)
        )
      );
    }
    return json({ ok: true });
  }

  // The device reports its balance so the admin can see it. Informational
  // only — the real balance stays with the child's own progress.
  if (route === "/koala/summary" && request.method === "POST") {
    const session = await getSessionUser(request, env);
    if (!session) return json({ error: "unauthorized" }, 401);
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: "bad_request" }, 400);
    }
    const max = 100000000;
    await env.DB.prepare(
      `INSERT INTO user_koala (user_id, coins, earned, streak, best_streak, updated_at) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET coins = excluded.coins, earned = excluded.earned,
         streak = excluded.streak, best_streak = excluded.best_streak, updated_at = excluded.updated_at`
    ).bind(session.id, clampInt(body?.coins, max), clampInt(body?.earned, max), clampInt(body?.streak, 100000), clampInt(body?.best, 100000), Date.now()).run();
    return json({ ok: true });
  }

  if (route === "/admin/koala" && request.method === "GET") {
    const session = await getSessionUser(request, env);
    if (!session || session.role !== "admin") return json({ error: "unauthorized" }, 401);
    const q = (url.searchParams.get("q") || "").trim();
    const base = `SELECT u.id, u.username, u.role, k.coins, k.earned, k.streak, k.best_streak, k.updated_at AS reported_at,
                    (SELECT COALESCE(SUM(g.amount), 0) FROM koala_grants g WHERE g.user_id = u.id AND g.applied_at IS NULL) AS pending
                  FROM users u LEFT JOIN user_koala k ON k.user_id = u.id`;
    const query = q
      ? env.DB.prepare(`${base} WHERE u.username LIKE ? ORDER BY u.username COLLATE NOCASE ASC LIMIT 200`).bind(`%${q}%`)
      : env.DB.prepare(`${base} ORDER BY u.username COLLATE NOCASE ASC LIMIT 200`);
    const { results } = await query.all();
    const recent = await env.DB.prepare(
      `SELECT g.id, g.amount, g.note, g.created_at, g.applied_at, u.username
         FROM koala_grants g LEFT JOIN users u ON u.id = g.user_id ORDER BY g.id DESC LIMIT 15`
    ).all();
    return json({
      users: (results || []).map((r) => ({
        id: r.id, username: r.username, role: r.role,
        coins: r.coins == null ? null : r.coins, earned: r.earned || 0,
        streak: r.streak || 0, best: r.best_streak || 0,
        reportedAt: r.reported_at || null, pending: r.pending || 0,
      })),
      recent: (recent.results || []).map((g) => ({
        id: g.id, amount: g.amount, note: g.note || "", createdAt: g.created_at, appliedAt: g.applied_at || null, username: g.username || "(deleted)",
      })),
    });
  }

  if (route === "/admin/koala/grant" && request.method === "POST") {
    const session = await getSessionUser(request, env);
    if (!session || session.role !== "admin") return json({ error: "unauthorized" }, 401);
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: "bad_request" }, 400);
    }
    const userId = typeof body?.userId === "string" ? body.userId : "";
    const amount = Number(body?.amount);
    const note = typeof body?.note === "string" ? body.note.trim().slice(0, 80) : "";
    if (!userId || !Number.isInteger(amount) || amount === 0 || Math.abs(amount) > 100000) return json({ error: "bad_request" }, 400);
    const target = await env.DB.prepare("SELECT id FROM users WHERE id = ?").bind(userId).first();
    if (!target) return json({ error: "not_found" }, 404);
    await env.DB.prepare("INSERT INTO koala_grants (user_id, amount, note, created_by, created_at) VALUES (?, ?, ?, ?, ?)")
      .bind(userId, amount, note, session.id, Date.now()).run();
    return json({ ok: true });
  }

  if (route === "/admin/upgrade-requests" && request.method === "GET") {
    const session = await getSessionUser(request, env);
    if (!session || session.role !== "admin") return json({ error: "unauthorized" }, 401);
    const status = url.searchParams.get("status");
    const query = status
      ? env.DB.prepare(
          `SELECT ur.id, ur.user_id, ur.status, ur.requested_at, ur.fulfilled_at, ur.code, u.username
           FROM upgrade_requests ur JOIN users u ON ur.user_id = u.id
           WHERE ur.status = ? ORDER BY ur.requested_at DESC`
        ).bind(status)
      : env.DB.prepare(
          `SELECT ur.id, ur.user_id, ur.status, ur.requested_at, ur.fulfilled_at, ur.code, u.username
           FROM upgrade_requests ur JOIN users u ON ur.user_id = u.id
           ORDER BY ur.requested_at DESC`
        );
    const { results } = await query.all();
    return json({
      requests: (results || []).map((r) => ({
        id: r.id,
        userId: r.user_id,
        username: r.username,
        status: r.status,
        requestedAt: r.requested_at,
        fulfilledAt: r.fulfilled_at || null,
        code: r.code || null,
      })),
    });
  }

  // Approves a pending upgrade request: generates a fresh voucher code bound
  // to that one requester (target_user_id) and stores it on the request row
  // so the requester's own /auth/me response can surface it as "ready to
  // redeem" — no separate delivery channel needed.
  if (route === "/admin/upgrade-requests/approve" && request.method === "POST") {
    const session = await getSessionUser(request, env);
    if (!session || session.role !== "admin") return json({ error: "unauthorized" }, 401);
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: "bad_request" }, 400);
    }
    const requestId = typeof body?.requestId === "string" ? body.requestId : "";
    if (!requestId) return json({ error: "bad_request" }, 400);

    const reqRow = await env.DB.prepare("SELECT id, user_id, status FROM upgrade_requests WHERE id = ?").bind(requestId).first();
    if (!reqRow) return json({ error: "not_found" }, 404);
    if (reqRow.status !== "pending") return json({ error: "not_pending" }, 400);

    const code = genSpecialCode();
    const now = Date.now();
    await env.DB.prepare("INSERT INTO special_codes (code, created_by, created_at, target_user_id) VALUES (?, ?, ?, ?)")
      .bind(code, session.id, now, reqRow.user_id)
      .run();
    await env.DB.prepare("UPDATE upgrade_requests SET status = 'fulfilled', fulfilled_at = ?, code = ? WHERE id = ?")
      .bind(now, code, requestId)
      .run();
    return json({ request: { id: requestId, status: "fulfilled", code, fulfilledAt: now } });
  }

  if (route === "/admin/upgrade-requests/dismiss" && request.method === "POST") {
    const session = await getSessionUser(request, env);
    if (!session || session.role !== "admin") return json({ error: "unauthorized" }, 401);
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: "bad_request" }, 400);
    }
    const requestId = typeof body?.requestId === "string" ? body.requestId : "";
    if (!requestId) return json({ error: "bad_request" }, 400);

    const reqRow = await env.DB.prepare("SELECT id, status FROM upgrade_requests WHERE id = ?").bind(requestId).first();
    if (!reqRow) return json({ error: "not_found" }, 404);
    if (reqRow.status !== "pending") return json({ error: "not_pending" }, 400);

    await env.DB.prepare("UPDATE upgrade_requests SET status = 'dismissed' WHERE id = ?").bind(requestId).run();
    return json({ ok: true });
  }

  // Per-account learning progress (word stats, spaced-repetition schedule) —
  // admin and paid accounts only, same role gate as writing shared words
  // below. account_key is just the session's own user id, so an account can
  // only ever read or write its own row; this has nothing to do with, and
  // grants no access to, the shared_words table admin manages.
  if (route === "/progress" && request.method === "GET") {
    const session = await getSessionUser(request, env);
    if (!session || (session.role !== "admin" && session.role !== "paid")) {
      return json({ error: "unauthorized" }, 401);
    }
    const row = await env.DB.prepare("SELECT progress_json, updated_at FROM user_progress WHERE account_key = ?")
      .bind(progressKey(session, url))
      .first();
    if (!row) return json({ progress: null, updatedAt: null });
    let progress;
    try {
      progress = JSON.parse(row.progress_json);
    } catch (e) {
      return json({ progress: null, updatedAt: null });
    }
    return json({ progress, updatedAt: row.updated_at });
  }

  if (route === "/progress" && request.method === "PUT") {
    const session = await getSessionUser(request, env);
    if (!session || (session.role !== "admin" && session.role !== "paid")) {
      return json({ error: "unauthorized" }, 401);
    }
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: "bad_request" }, 400);
    }
    if (!body || typeof body.progress !== "object" || body.progress === null) {
      return json({ error: "bad_request" }, 400);
    }
    const progressJson = JSON.stringify(body.progress);
    if (progressJson.length > MAX_PROGRESS_JSON_LENGTH) return json({ error: "too_large" }, 413);

    const now = Date.now();
    await env.DB.prepare(
      `INSERT INTO user_progress (account_key, progress_json, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(account_key) DO UPDATE SET progress_json = excluded.progress_json, updated_at = excluded.updated_at`
    )
      .bind(progressKey(session, url), progressJson, now)
      .run();
    return json({ ok: true, updatedAt: now });
  }
  // Photo -> vocabulary words using a vision model. Paid/admin only (same gate
  // as the other premium routes), with a per-user daily cap to bound API cost.
  if (route === "/extract-words" && request.method === "POST") {
    const session = await getSessionUser(request, env);
    if (!session || (session.role !== "admin" && session.role !== "paid")) {
      return json({ error: "unauthorized" }, 401);
    }
    if (!env.ANTHROPIC_API_KEY) return json({ error: "server_not_configured" }, 500);

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: "bad_request" }, 400);
    }
    const image = typeof body?.image === "string" ? body.image : "";
    const mediaType = ["image/jpeg", "image/png", "image/webp"].includes(body?.mediaType) ? body.mediaType : "";
    if (!image || !mediaType || image.length > 5000000) return json({ error: "bad_image" }, 400);

    const DAILY_LIMIT = 30;
    const day = new Date().toISOString().slice(0, 10);
    const refund = () =>
      env.DB.prepare("UPDATE extract_usage SET count = MAX(count - 1, 0) WHERE user_id = ? AND day = ?")
        .bind(session.id, day)
        .run()
        .catch(() => {});

    if (session.role !== "admin") {
      const row = await env.DB.prepare(
        "INSERT INTO extract_usage (user_id, day, count) VALUES (?, ?, 1) ON CONFLICT(user_id, day) DO UPDATE SET count = count + 1 RETURNING count"
      )
        .bind(session.id, day)
        .first();
      if ((row?.count || 1) > DAILY_LIMIT) return json({ error: "daily_limit" }, 429);
    }

    try {
      console.log("extract-words calling anthropic, imageChars", image.length, "keyLen", env.ANTHROPIC_API_KEY.length);
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-5-5",
          max_tokens: 4000,
          thinking: { type: "disabled" },
          system:
            "You extract vocabulary words from a photo of a school worksheet for a primary-school English learner. " +
            "Words the student underlined, circled, highlighted or wrote a note next to are the learning targets: always include them first. " +
            "Then add other useful, moderately difficult words from the main text. " +
            "Convert every word to its base form (buried -> bury, devastated -> devastate). " +
            "Ignore people's names, background objects, toys, page furniture (headers, footers, page numbers, logos), " +
            "show-through from the other side of the paper, and partly cut-off text. " +
            "Return at most 20 lowercase English words that are real dictionary words. " +
            'Reply with JSON only, exactly like {"words":["bury","firebreak"]}.',
          messages: [
            {
              role: "user",
              content: [
                { type: "image", source: { type: "base64", media_type: mediaType, data: image } },
                { type: "text", text: "Extract the vocabulary words from this page." },
              ],
            },
          ],
        }),
      });
      if (!resp.ok) {
        await refund();
        // 크레딧 부족, 키 오류, 모델 이름 오류는 관리자가 직접 고쳐야 하니 메일로 알린다 (24시간에 1번).
        const errText = await resp.text().catch(() => "");
        console.error("extract-words upstream error", resp.status, errText.slice(0, 500));
        let reason = "";
        if (/credit balance/i.test(errText)) reason = "크레딧 부족 / Credit balance too low";
        else if (resp.status === 401 || resp.status === 403) reason = "API 키 오류 / API key rejected";
        else if (resp.status === 404) reason = "모델 이름 오류 / Model not found";
        if (reason) {
          try {
            const recent = await env.DB.prepare(
              "SELECT created_at FROM email_log WHERE kind = 'api_credit_alert' ORDER BY created_at DESC LIMIT 1"
            ).first();
            if (!recent || Date.now() - recent.created_at > 24 * 60 * 60 * 1000) {
              const subject = `[Koala Study Mate] 사진 단어 추출 API 문제: ${reason}`;
              const text =
                `사진 단어 추출(Anthropic API) 호출이 실패했습니다.\n\n원인: ${reason}\nHTTP 상태: ${resp.status}\n\n` +
                `console.anthropic.com 의 Billing 에서 크레딧과 키를 확인하세요.\n` +
                `그동안 앱은 자동으로 기존 방식(Tesseract)으로 동작합니다.`;
              await sendEmail(env, {
                to: env.MAIL_REPLY_TO,
                kind: "api_credit_alert",
                subject,
                text,
                html: `<div style="font-family:system-ui,sans-serif;font-size:15px;white-space:pre-wrap">${text
                  .replace(/&/g, "&amp;")
                  .replace(/</g, "&lt;")}</div>`,
              });
            }
          } catch (mailErr) {
            console.warn("credit alert mail failed", mailErr);
          }
        }
        return json({ error: "extract_failed" }, 502);
      }
      const data = await resp.json();
      console.log("extract-words response", JSON.stringify((data.content || []).map((x) => x.type)), data.stop_reason, JSON.stringify(data.usage));
      const text = (data?.content || []).map((c) => c.text || "").join("");
      const match = text.match(/\{[\s\S]*\}/);
      const parsed = match ? JSON.parse(match[0]) : { words: [] };
      const words = Array.from(
        new Set(
          (Array.isArray(parsed.words) ? parsed.words : [])
            .map((w) => String(w).toLowerCase().trim())
            .filter((w) => /^[a-z][a-z'-]{2,24}$/.test(w))
        )
      ).slice(0, 25);
      console.log("extract-words raw", text.slice(0, 300), "final", JSON.stringify(words));
      return json({ words });
    } catch (e) {
      console.error("extract-words exception", String(e), String(e && e.stack).slice(0, 400));
      await refund();
      return json({ error: "extract_failed" }, 502);
    }
  }
  // Child profiles (premium: up to 4 learners per account). Profile 0 is the
  // account's own progress row; profiles 1-3 are extra rows keyed "<id>:p<n>"
  // in the same user_progress table, and the list of names/avatars is one more
  // row keyed "<id>:profiles". Every key starts with the session's own id, so
  // an account can only ever reach its own children.
  if (route === "/profiles" && request.method === "GET") {
    const session = await getSessionUser(request, env);
    if (!session || (session.role !== "admin" && session.role !== "paid")) return json({ error: "unauthorized" }, 401);
    const row = await env.DB.prepare("SELECT progress_json FROM user_progress WHERE account_key = ?").bind(`${session.id}:profiles`).first();
    let profiles = null;
    try { profiles = row ? JSON.parse(row.progress_json).profiles : null; } catch (e) { profiles = null; }
    return json({ profiles: cleanProfiles(profiles) });
  }

  if (route === "/profiles" && request.method === "PUT") {
    const session = await getSessionUser(request, env);
    if (!session || (session.role !== "admin" && session.role !== "paid")) return json({ error: "unauthorized" }, 401);
    let body;
    try { body = await request.json(); } catch (e) { return json({ error: "bad_request" }, 400); }
    if (!body || !Array.isArray(body.profiles)) return json({ error: "bad_request" }, 400);
    const profiles = cleanProfiles(body.profiles);
    await env.DB.prepare(
      `INSERT INTO user_progress (account_key, progress_json, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(account_key) DO UPDATE SET progress_json = excluded.progress_json, updated_at = excluded.updated_at`
    ).bind(`${session.id}:profiles`, JSON.stringify({ profiles }), Date.now()).run();
    return json({ ok: true, profiles });
  }

  // Removes one extra child's saved progress (the learner slot itself is
  // dropped from the list by the client's PUT /profiles).
  if (route === "/profiles/progress" && request.method === "DELETE") {
    const session = await getSessionUser(request, env);
    if (!session || (session.role !== "admin" && session.role !== "paid")) return json({ error: "unauthorized" }, 401);
    const n = Number(url.searchParams.get("p"));
    if (!Number.isInteger(n) || n < 1 || n > 3) return json({ error: "bad_request" }, 400);
    await env.DB.prepare("DELETE FROM user_progress WHERE account_key = ?").bind(`${session.id}:p${n}`).run();
    return json({ ok: true });
  }

  if (route === "/words" && (request.method === "PUT" || request.method === "DELETE")) {
    const session = await getSessionUser(request, env);
    if (!session || (session.role !== "admin" && session.role !== "paid")) {
      return json({ error: "unauthorized" }, 401);
    }
    // Admin writes land in the shared pool (owner_id NULL, visible to
    // everyone); a paid account's writes are scoped to its own owner_id and
    // never touch anyone else's words, admin's shared pool included.
    const ownerId = session.role === "admin" ? null : session.id;

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: "bad_request" }, 400);
    }

    if (request.method === "DELETE") {
      const ids = Array.isArray(body && body.ids) ? body.ids.filter((id) => typeof id === "string") : [];
      if (ids.length === 0) return json({ error: "bad_request" }, 400);
      if (ids.length > MAX_WORDS_PER_REQUEST) return json({ error: "too_many" }, 413);
      await env.DB.batch(
        ids.map((id) =>
          ownerId === null
            ? env.DB.prepare("DELETE FROM shared_words WHERE id = ? AND owner_id IS NULL").bind(id)
            : env.DB.prepare("DELETE FROM shared_words WHERE id = ? AND owner_id = ?").bind(id, ownerId)
        )
      );
      return json({ deleted: ids.length });
    }

    const words = Array.isArray(body && body.words) ? body.words.map(cleanWord).filter(Boolean) : [];
    if (words.length === 0) return json({ error: "bad_request" }, 400);
    if (words.length > MAX_WORDS_PER_REQUEST) return json({ error: "too_many" }, 413);

    const now = Date.now();
    // withPos=false is the pre-migration shape (no pos column yet), used only if
    // the live database hasn't had migrations/0010 applied when this is deployed.
    const buildStatements = (withPos) =>
      words.map((w) =>
        env.DB.prepare(
          `INSERT INTO shared_words
             (id, word, definition_en, definition_ko, level_en, level_ko, ${withPos ? "pos, " : ""}example,
              no_definition_en, no_definition_ko, source, owner_id, created_at, updated_at)
           VALUES (${withPos ? "?, " : ""}?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             word = excluded.word,
             definition_en = excluded.definition_en,
             definition_ko = excluded.definition_ko,
             level_en = excluded.level_en,
             level_ko = excluded.level_ko,
             ${withPos ? "pos = excluded.pos," : ""}
             example = excluded.example,
             no_definition_en = excluded.no_definition_en,
             no_definition_ko = excluded.no_definition_ko,
             source = excluded.source,
             updated_at = excluded.updated_at
           WHERE shared_words.owner_id IS excluded.owner_id`
        ).bind(
          ...[w.id, w.word, w.definition_en, w.definition_ko, w.level_en, w.level_ko],
          ...(withPos ? [w.pos] : []),
          ...[w.example, w.no_definition_en, w.no_definition_ko, w.source, ownerId, w.created_at, now]
        )
      );
    let posSaved = true;
    try {
      await env.DB.batch(buildStatements(true));
    } catch (e) {
      if (!/\bpos\b/i.test(String(e && e.message))) throw e;
      // The live table has no pos column yet (migration 0010 not applied).
      // Previously this silently saved every word WITHOUT its part of speech,
      // so it vanished on the next login. Add the column on the spot and
      // retry; only if that is impossible fall back to the old shape — and
      // then say so in the response instead of hiding it.
      try {
        await env.DB.prepare("ALTER TABLE shared_words ADD COLUMN pos TEXT").run();
        await env.DB.batch(buildStatements(true));
      } catch (e2) {
        await env.DB.batch(buildStatements(false));
        posSaved = false;
      }
    }
    return json({ saved: words.length, posSaved });
  }

  return json({ error: "not_found" }, 404);
}
