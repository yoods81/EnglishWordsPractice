// Daily question limits, counted on the server (site evaluation 2026-11-21, item 5).
// The app still counts in the browser too (works offline / when this fails), but the server number wins, so a
// private window, cleared browser data or a second device no longer resets the day.
//
//   GET  /api/usage?tz=<minutes>                 -> { day, tier, caps, used }
//   POST /api/usage { tz, mode, n }              -> { day, tier, mode, cap, used, left, added }
//
// caps / cap: a number, or null = unlimited. Modes: quiz, spelling, tt (questions) · flash, type (rounds).
//   guest : quiz/spelling/tt = limits.dailyMax.guest, flash/type = limits.guestRounds
//   free  : quiz/spelling/tt = limits.dailyMax.free,  flash/type = unlimited
//   paid / admin: everything unlimited, nothing stored.
// The numbers come from the live settings (admin screen "이용 제한"), see liveLimits() in house.js.
// Who: an account is 'u:<id>'. A signed-out device gets a signed cookie (ywp_gid, random id + HMAC, 1 year) — no IP.
// Not counted here (the app never reports them): Town building word tests, review sessions, building name-tag practice.
import { liveLimits } from "./house.js";

export const USAGE_MODES = ["quiz", "spelling", "tt", "flash", "type"];
const GUEST_COOKIE = "ywp_gid";
const KEEP_DAYS = 14;
const MAX_ADD = 200; // one report never adds more than this

async function sig(env, text) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(String(env.SESSION_SECRET || "")), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return [...new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode("gid." + text)))].map((x) => x.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

// The signed-out device id from the cookie, or a fresh one (setCookie is then filled in for the response).
async function guestId(request, env) {
  const m = (request.headers.get("cookie") || "").match(new RegExp(`(?:^|;\\s*)${GUEST_COOKIE}=([^;]+)`));
  if (m) {
    const [id, s] = decodeURIComponent(m[1]).split(".");
    if (/^[a-f0-9]{24}$/.test(id || "") && s && s === (await sig(env, id))) return { id, setCookie: null };
  }
  const id = [...crypto.getRandomValues(new Uint8Array(12))].map((x) => x.toString(16).padStart(2, "0")).join("");
  const value = encodeURIComponent(`${id}.${await sig(env, id)}`);
  return { id, setCookie: `${GUEST_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${365 * 86400}` };
}

export function usageCaps(tier, limits) {
  const L = limits || {};
  const dm = L.dailyMax || {};
  if (tier === "guest") {
    const q = Number.isFinite(dm.guest) ? dm.guest : 30;
    const r = Number.isFinite(L.guestRounds) ? L.guestRounds : 1;
    return { quiz: q, spelling: q, tt: q, flash: r, type: r };
  }
  if (tier === "free") {
    const q = Number.isFinite(dm.free) ? dm.free : 100;
    return { quiz: q, spelling: q, tt: q, flash: null, type: null };
  }
  return { quiz: null, spelling: null, tt: null, flash: null, type: null };
}

// Days since 1970 in the learner's time zone (tz = minutes, the same sign as Date#getTimezoneOffset, clamped to ±14h).
export function usageDay(tz, now = Date.now()) {
  const t = Math.max(-840, Math.min(840, Math.round(Number(tz) || 0)));
  return Math.floor((now - t * 60000) / 86400000);
}

export async function handleUsage(request, env, url, h) {
  const session = await h.getSessionUser(request, env);
  const tier = !session ? "guest" : session.role === "admin" || session.role === "paid" ? "unlimited" : "free";
  let body = null;
  if (request.method === "POST") { try { body = await request.json(); } catch (e) { body = null; } }
  else if (request.method !== "GET") return h.json({ error: "method_not_allowed" }, 405);
  const day = usageDay(request.method === "POST" ? body && body.tz : url.searchParams.get("tz"));
  const caps = usageCaps(tier, tier === "unlimited" ? null : await liveLimits(env));
  let who = null, setCookie = null;
  if (tier === "free") who = "u:" + session.id;
  else if (tier === "guest") { const g = await guestId(request, env); who = "g:" + g.id; setCookie = g.setCookie; }
  const out = (data, status = 200) => h.json(data, status, setCookie ? { "set-cookie": setCookie } : {});

  const readUsed = async () => {
    const used = {};
    USAGE_MODES.forEach((m) => { used[m] = 0; });
    if (!who) return used;
    const rows = await env.DB.prepare("SELECT mode, n FROM daily_usage WHERE day = ? AND who = ?").bind(day, who).all();
    (rows.results || []).forEach((r) => { if (r.mode in used) used[r.mode] = Number(r.n) || 0; });
    return used;
  };

  if (request.method === "GET") return out({ day, tier, caps, used: await readUsed() });

  const mode = body && body.mode;
  if (!USAGE_MODES.includes(mode)) return out({ error: "bad_mode" }, 400);
  const n = Math.max(0, Math.min(MAX_ADD, Math.floor(Number(body.n) || 0)));
  const cap = caps[mode];
  if (cap === null || !who) return out({ day, tier, mode, cap: null, used: 0, left: null, added: n });
  const before = (await readUsed())[mode];
  // One statement: never goes past the cap, even with two tabs reporting at once.
  await env.DB.prepare(
    "INSERT INTO daily_usage (day, who, mode, n) VALUES (?, ?, ?, MIN(?, ?)) ON CONFLICT(day, who, mode) DO UPDATE SET n = MIN(daily_usage.n + ?, ?)"
  ).bind(day, who, mode, n, cap, n, cap).run();
  const used = (await readUsed())[mode];
  if (Math.random() < 0.02) { try { await env.DB.prepare("DELETE FROM daily_usage WHERE day < ?").bind(day - KEEP_DAYS).run(); } catch (e) { /* tidy-up only */ } }
  return out({ day, tier, mode, cap, used, left: Math.max(0, cap - used), added: Math.max(0, used - before) });
}
