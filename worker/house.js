// Koala House (stage 5, B bundle): S12 settings API + System tab switches, S3 house saves.
// Settings shape, ranges and checks are the house app's own (worker/house-config.mjs is built from koala-house-3d — do not edit).
//
// S12  GET  /api/admin/config                 -> { live, draft }                       (admin)
//      PUT  /api/admin/config                 { channel: 'draft', base, config }       (admin, house admin screen)
//      POST /api/admin/config/publish         { base, config }                         (admin)
//      POST /api/admin/config/switches        { base, switches: { HOUSE3D?, MOVE?, trialAccounts? } }  (admin, site System tab)
//      GET  /api/admin/config/log?batches=&before=  -> { entries (newest first), more }
//      DELETE /api/admin/house/items/<id>?base=     (only an added item nobody bought)
//      GET  /api/admin/badges                 -> [{ id, emoji, name }]
//      POST /api/admin/house/upload-image     { id, image (base64 webp) } -> { img: 'r2:house3d/<id>-<t>.webp' }
//      GET  /api/house/config                 (anyone) -> the public settings: draft for a trial account, live otherwise
// S3   GET  /api/house?p=n                    -> { json, rev, updatedAt }   (signed in; n = site child slot, 1-3 premium only)
//      PUT  /api/house?p=n                    { json, rev } -> { ok, rev } | 409 { rev, json } | 413
// C2   POST /api/house/report             { type, level?, reason?, size?, tries?, count? } -> counted in sync_stats as house_*
//      (anyone; numbers only — no house content, name, e-mail or account id is kept)
// "base" is the version the screen loaded (max of live/draft). Any save makes a new version, so a screen opened before
// someone else's save (or before an emergency HOUSE3D=off) gets 409 instead of writing over it.
import { validateConfig, guestLimitIssues, diffConfig, bundledItems } from "./house-config.mjs";

const SETTINGS_KEY = "config";
const HOUSE_LIMIT = 200000;
const IMAGE_LIMIT = 300 * 1024;
export const BADGES = [
  ...[2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ id: `tt${n}`, emoji: ["2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣"][n - 2], name: { en: `Table ${n} Master Koala`, ko: `구구단 ${n}단 마스터 코알라` } })),
  { id: "ttAll", emoji: "👑", name: { en: "Times Table Champion", ko: "구구단 챔피언 코알라" } },
  { id: "spell100", emoji: "📝", name: { en: "Spelling 100 Sticker", ko: "스펠링 100점 스티커" } },
  { id: "spell100x5", emoji: "💎", name: { en: "Spelling Superstar", ko: "스펠링 슈퍼스타" } },
  { id: "quiz100", emoji: "💯", name: { en: "Quiz Perfect Sticker", ko: "퀴즈 만점 스티커" } },
  { id: "type50", emoji: "⌨️", name: { en: "Speedy Typist Koala", ko: "타이핑 코알라" } },
  { id: "words50", emoji: "🧭", name: { en: "Word Explorer", ko: "단어 탐험가" } },
  { id: "words200", emoji: "🧙", name: { en: "Word Wizard", ko: "단어 마법사" } },
  { id: "streak3", emoji: "🌿", name: { en: "3-Day Streak", ko: "3일 연속 학습" } },
  { id: "streak7", emoji: "🌈", name: { en: "Week-long Koala", ko: "일주일 연속 코알라" } },
  { id: "streak14", emoji: "⚡", name: { en: "Fortnight Koala", ko: "2주 연속 코알라" } },
  { id: "streak30", emoji: "🏆", name: { en: "Monthly Marathon", ko: "한 달 연속 학습" } },
  { id: "mission7", emoji: "🎯", name: { en: "Mission Master", ko: "미션 마스터" } },
  { id: "coins500", emoji: "💰", name: { en: "Coin Collector", ko: "코인 수집가" } },
  { id: "level5", emoji: "⭐", name: { en: "Level 5 Koala", ko: "레벨 5 코알라" } },
  { id: "items5", emoji: "🎩", name: { en: "Dress-up Fan", ko: "패션 코알라" } },
  { id: "roomDecor", emoji: "🏠", name: { en: "Room Designer", ko: "방 꾸미기 달인" } },
  { id: "fix5", emoji: "🔧", name: { en: "Mistake Fixer", ko: "오답 해결사" } },
  { id: "fix20", emoji: "🏅", name: { en: "Mistake Master", ko: "오답 마스터" } },
];
const BADGE_IDS = new Set(BADGES.map((b) => b.id));
let ITEMS = null; // id -> item (built-in house items), read once
const baseItems = () => ITEMS || (ITEMS = new Map(bundledItems().items.map((i) => [i.id, i])));

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const readBody = async (request) => { try { return await request.json(); } catch (e) { return null; } };

// ---------- settings state ----------
function freshLive() { const c = validateConfig({}).config; c.version = 0; c.channel = "live"; return c; }
async function readState(env) {
  const row = await env.DB.prepare("SELECT value FROM site_settings WHERE key = ?").bind(SETTINGS_KEY).first();
  if (!row) return { raw: null, state: { live: freshLive(), draft: null } };
  let v = null;
  try { v = JSON.parse(row.value); } catch (e) { /* broken: start again from defaults, keep the raw text for the conditional write */ }
  const norm = (c, ch) => { const x = validateConfig(c).config; x.version = Number(c && c.version) || 0; x.channel = ch; return x; };
  return { raw: row.value, state: { live: v && v.live ? norm(v.live, "live") : freshLive(), draft: v && v.draft ? norm(v.draft, "draft") : null } };
}
// A signed-in account named in the trial list (login email, username or id — case ignored).
async function isTrialUser(env, s, state) {
  const trial = state.live.switches.trialAccounts || [];
  if (!s || !trial.length) return false;
  const u = await env.DB.prepare("SELECT username, email FROM users WHERE id = ?").bind(s.id).first();
  const names = [s.id, u && u.username, u && u.email].filter(Boolean).map((x) => String(x).toLowerCase());
  return trial.some((t) => names.includes(String(t).toLowerCase()));
}
// Who the new house opens for (live HOUSE3D switch + who is signed in):
//   off = nobody (emergency stop) · admin = admin accounts · trial = admins + trial accounts · all = everyone (guests too)
export async function houseOpenFor(request, env, getSessionUser) {
  const { state } = await readState(env);
  const mode = state.live.switches.HOUSE3D;
  if (mode === "off") return false;
  if (mode === "all") return true;
  const s = await getSessionUser(request, env);
  if (!s) return false;
  if (s.role === "admin") return true;
  return mode === "trial" && await isTrialUser(env, s, state);
}

// Static /house/* (stage 5 S10; runs before the asset server — wrangler.jsonc run_worker_first):
//  - /house/admin/*  admins only (others get 404), never cached, never indexed
//  - /house/ page    only for who houseOpenFor lets in; everyone else is sent to the site home. Never cached, so an
//                    emergency stop (HOUSE3D=off) works on the next open.
//  - other files     (hashed scripts/styles, version.json) as they are — useless without the page
export async function houseGate(request, env, url, getSessionUser) {
  const p = url.pathname;
  const withHeaders = (res, extra) => { const r = new Response(res.body, res); Object.entries(extra).forEach(([k, v]) => r.headers.set(k, v)); return r; };
  const noStore = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" };
  if (p === "/house/admin" || p.startsWith("/house/admin/")) {
    const s = await getSessionUser(request, env);
    if (!s || s.role !== "admin") return new Response("Not found", { status: 404, headers: noStore });
    return withHeaders(await env.ASSETS.fetch(request), noStore);
  }
  if (p === "/house" || p === "/house/" || p === "/house/index.html") {
    if (!(await houseOpenFor(request, env, getSessionUser))) return new Response(null, { status: 302, headers: Object.assign({ Location: "/" }, noStore) });
    return withHeaders(await env.ASSETS.fetch(request), noStore);
  }
  return env.ASSETS.fetch(request);
}

// House problem reports (C2, house app makeReporter): the kind of problem only. Limits: 5 a day per kind for each browser
// (a signed counter cookie — the server keeps no id), and REPORT_SITE_MAX a day per kind for the whole site.
const REPORT_PER_DAY = 5, REPORT_SITE_MAX = 2000, REPORT_COOKIE = "khr";
function reportKind(b) {
  if (!b || typeof b !== "object") return null;
  if (b.type === "saveSize" && (b.level === "warn" || b.level === "over")) return `house_save_size_${b.level}`;
  if (b.type === "saveFail" && (b.reason === "network" || b.reason === "rejected")) return `house_save_fail_${b.reason}`;
  if (b.type === "saveFull") return "house_save_full";
  if (b.type === "configError") return "house_config_error";
  return null;
}
async function sign(env, text) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(String(env.SESSION_SECRET || "")), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return [...new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode("khr." + text)))].map((x) => x.toString(16).padStart(2, "0")).join("").slice(0, 32);
}
async function reportCounts(request, env, day) {
  const m = (request.headers.get("cookie") || "").match(new RegExp(`(?:^|;\\s*)${REPORT_COOKIE}=([^;]+)`));
  if (!m) return {};
  const [d, body, sig] = decodeURIComponent(m[1]).split("|");
  if (d !== day || !body || sig !== (await sign(env, d + "|" + body))) return {};
  try { const c = JSON.parse(body); return c && typeof c === "object" ? c : {}; } catch (e) { return {}; }
}
async function handleReport(request, env) {
  const b = await request.json().catch(() => null), kind = reportKind(b);
  if (!kind) return json({ error: "bad_report" }, 400);
  const day = new Date().toISOString().slice(0, 10);
  const counts = await reportCounts(request, env, day);
  if ((counts[b.type] || 0) >= REPORT_PER_DAY) return json({ ok: true, counted: false });
  const row = await env.DB.prepare("SELECT n FROM sync_stats WHERE day = ? AND kind = ?").bind(day, kind).first().catch(() => null);
  if (row && row.n >= REPORT_SITE_MAX) return json({ ok: true, counted: false });
  await env.DB.prepare("INSERT INTO sync_stats (day, kind, n) VALUES (?, ?, 1) ON CONFLICT(day, kind) DO UPDATE SET n = n + 1").bind(day, kind).run();
  counts[b.type] = (counts[b.type] || 0) + 1;
  const body = JSON.stringify(counts), val = encodeURIComponent(`${day}|${body}|${await sign(env, day + "|" + body)}`);
  const res = json({ ok: true, counted: true });
  res.headers.set("set-cookie", `${REPORT_COOKIE}=${val}; Path=/api/house/report; HttpOnly; Secure; SameSite=Lax; Max-Age=172800`);
  return res;
}

const top = (s) => Math.max(s.live.version, s.draft ? s.draft.version : 0);
// Writes only if nobody changed the row since we read it (raw). Returns false on a race.
async function writeState(env, raw, state) {
  const text = JSON.stringify(state), now = Date.now();
  const r = raw == null
    ? await env.DB.prepare("INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO NOTHING").bind(SETTINGS_KEY, text, now).run()
    : await env.DB.prepare("UPDATE site_settings SET value = ?, updated_at = ? WHERE key = ? AND value = ?").bind(text, now, SETTINGS_KEY, raw).run();
  return !!(r && r.meta && r.meta.changes);
}
async function adminName(env, id) { const r = await env.DB.prepare("SELECT username FROM users WHERE id = ?").bind(id).first(); return (r && r.username) || id; }
async function writeLog(env, rows) {
  if (!rows.length) return;
  await env.DB.batch(rows.map((x) => env.DB.prepare("INSERT INTO config_log (at, by_name, batch, version, channel, source, path, before_val, after_val) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(x.at, x.by, x.batch, x.version, x.channel, x.source, x.path, JSON.stringify(x.before ?? null), JSON.stringify(x.after ?? null))));
}
const logRows = (from, to, channel, source, version, by) => {
  const at = Date.now(), batch = `${channel}-v${version}-${at.toString(36)}`;
  return diffConfig(from, to).map((d) => ({ ...d, at, by, batch, version, channel, source }));
};
// The same checks as the house app (validateConfig ranges, guest daily limits) + server-only rules.
function checkConfig(cfg, s, opts) {
  const v = validateConfig(cfg);
  if (v.issues.length) return { fields: v.issues };
  const c = v.config;
  if (!opts.site && c.switches.MOVE !== s.live.switches.MOVE) return { fields: ["switches.MOVE"] }; // MOVE only from the site System tab
  const g = guestLimitIssues(c);
  if (g.length) return { fields: g.map((x) => x.path) };
  const bad = [];
  c.items.forEach((p, i) => {
    if (p.badge && !BADGE_IDS.has(p.badge)) bad.push(`items.${i}.badge`);
    const it = baseItems().get(p.id) || (p.add && p.item);
    if (it && (it.tags || []).includes("exclusive") && p.price !== undefined && p.price !== 0) bad.push(`items.${i}.price`); // mission rewards stay at 0
  });
  return bad.length ? { fields: bad } : { config: c };
}

// ---------- house saves (S3) ----------
// The house row key per site child slot (the house app's houseRowKey): 0 -> "<id>:house", n -> "<id>:p<n>:house".
export const houseRowKey = (userId, n) => (n === 0 ? `${userId}:house` : `${userId}:p${n}:house`);
export const houseRowKeys = (userId) => [0, 1, 2, 3].map((n) => houseRowKey(userId, n));

export async function handleHouse(route, request, env, url, getSessionUser) {
  const method = request.method;
  const admin = async () => { const s = await getSessionUser(request, env); return s && s.role === "admin" ? s : null; };

  if (route === "/admin/config" && method === "GET") {
    if (!(await admin())) return json({ error: "unauthorized" }, 401);
    return json((await readState(env)).state);
  }
  if ((route === "/admin/config" && method === "PUT") || (route === "/admin/config/publish" && method === "POST")) {
    const who = await admin();
    if (!who) return json({ error: "unauthorized" }, 401);
    const body = await readBody(request);
    if (!body || typeof body.config !== "object" || body.config === null) return json({ error: "bad_request" }, 400);
    const publish = route.endsWith("/publish");
    if (!publish && body.channel !== "draft") return json({ error: "bad_request" }, 400);
    const { raw, state } = await readState(env);
    if (Number(body.base) !== top(state)) return json({ error: "conflict", version: top(state) }, 409);
    const ok = checkConfig(body.config, state, {});
    if (ok.fields) return json({ error: "invalid", fields: ok.fields }, 400);
    const version = top(state) + 1;
    const next = publish
      ? { live: Object.assign(ok.config, { version, channel: "live" }), draft: null }
      : { live: state.live, draft: Object.assign(ok.config, { version, channel: "draft" }) };
    if (!(await writeState(env, raw, next))) return json({ error: "conflict", version: top((await readState(env)).state) }, 409);
    await writeLog(env, logRows(publish ? state.live : state.draft || state.live, publish ? next.live : next.draft, publish ? "live" : "draft", "house", version, await adminName(env, who.id)));
    return json(next);
  }
  if (route === "/admin/config/switches" && method === "POST") {
    const who = await admin();
    if (!who) return json({ error: "unauthorized" }, 401);
    const body = await readBody(request);
    if (!body || typeof body.switches !== "object" || body.switches === null) return json({ error: "bad_request" }, 400);
    const { raw, state } = await readState(env);
    if (Number(body.base) !== top(state)) return json({ error: "conflict", version: top(state) }, 409);
    const sw = {};
    ["HOUSE3D", "MOVE", "trialAccounts"].forEach((k) => { if (body.switches[k] !== undefined) sw[k] = body.switches[k]; });
    // MOVE off -> on: the screen asks twice (the second time the admin types MOVE); the server wants that word too
    if (sw.MOVE === "on" && state.live.switches.MOVE !== "on" && body.confirm !== "MOVE") return json({ error: "confirm_move" }, 400);
    const cand = Object.assign({}, state.live, { switches: Object.assign({}, state.live.switches, sw) });
    const ok = checkConfig(cand, state, { site: true });
    if (ok.fields) return json({ error: "invalid", fields: ok.fields }, 400);
    const version = top(state) + 1;
    const live = Object.assign(ok.config, { version, channel: "live" });
    const draft = state.draft ? Object.assign({}, state.draft, { switches: live.switches }) : null; // a trial account's draft follows the switches
    const next = { live, draft };
    if (!(await writeState(env, raw, next))) return json({ error: "conflict" }, 409);
    await writeLog(env, logRows(state.live, live, "live", "site", version, await adminName(env, who.id)));
    // trial accounts that aren't signed-up accounts: saved anyway, the screen only warns
    const trial = (live.switches.trialAccounts || []).map((x) => String(x).toLowerCase());
    let trialUnknown = [];
    if (trial.length) {
      const q = trial.map(() => "?").join(",");
      const { results } = await env.DB.prepare(`SELECT lower(username) AS u, lower(email) AS e FROM users WHERE lower(username) IN (${q}) OR lower(email) IN (${q})`).bind(...trial, ...trial).all();
      const known = new Set((results || []).flatMap((r) => [r.u, r.e]).filter(Boolean));
      trialUnknown = (live.switches.trialAccounts || []).filter((x) => !known.has(String(x).toLowerCase()));
    }
    return json(Object.assign({}, next, { trialUnknown }));
  }
  if (route === "/admin/config/log" && method === "GET") {
    if (!(await admin())) return json({ error: "unauthorized" }, 401);
    const batches = Math.max(1, Math.min(200, Number(url.searchParams.get("batches")) || 50)), before = url.searchParams.get("before");
    const { results: order } = await env.DB.prepare("SELECT batch, MAX(id) AS m FROM config_log GROUP BY batch ORDER BY m DESC").all();
    const ids = (order || []).map((r) => r.batch), from = before ? ids.indexOf(before) + 1 : 0, pick = ids.slice(from, from + batches);
    let entries = [];
    if (pick.length) {
      const { results } = await env.DB.prepare(`SELECT * FROM config_log WHERE batch IN (${pick.map(() => "?").join(",")}) ORDER BY id DESC`).bind(...pick).all();
      entries = (results || []).map((r) => ({ id: String(r.id), at: new Date(r.at).toISOString(), by: r.by_name, batch: r.batch, version: r.version, channel: r.channel, source: r.source, path: r.path, before: JSON.parse(r.before_val), after: JSON.parse(r.after_val) }));
    }
    return json({ entries, more: ids.length > from + batches });
  }
  if (route.startsWith("/admin/house/items/") && method === "DELETE") {
    const who = await admin();
    if (!who) return json({ error: "unauthorized" }, 401);
    const id = decodeURIComponent(route.slice("/admin/house/items/".length));
    const { raw, state } = await readState(env);
    if (Number(url.searchParams.get("base")) !== top(state)) return json({ error: "conflict", reason: "conflict" }, 409);
    const added = (c) => !!c && c.items.some((p) => p.id === id && p.add);
    if (!added(state.live) && !added(state.draft)) return json({ error: "base_item" }, 400); // built-in items can only be hidden
    // Bought by anyone? House saves (owned[].item) and wallets (ledger why 'house3d:buy:<id>').
    const like = `%"${id.replace(/["%_\\]/g, "")}"%`;
    const { results: houses } = await env.DB.prepare("SELECT account_key, save_json FROM house_saves WHERE save_json LIKE ?").bind(like).all();
    const owners = new Set();
    (houses || []).forEach((h) => { try { const s = JSON.parse(h.save_json); if (Object.values(s.owned || {}).some((o) => o && o.item === id)) owners.add(h.account_key.split(":")[0]); } catch (e) { /* */ } });
    for (const t of ["user_rewards", "user_progress"]) {
      const col = t === "user_rewards" ? "reward_json" : "progress_json", key = t === "user_rewards" ? "user_id" : "account_key";
      const { results } = await env.DB.prepare(`SELECT ${key} AS k FROM ${t} WHERE ${col} LIKE ?`).bind(`%house3d:buy:${id.replace(/["%_\\]/g, "")}%`).all();
      (results || []).forEach((r) => owners.add(String(r.k).split(":")[0]));
    }
    if (owners.size) return json({ error: "owned", reason: "owned", count: owners.size }, 409);
    const version = top(state) + 1, drop = (c) => Object.assign({}, c, { items: c.items.filter((p) => p.id !== id), version });
    const next = { live: added(state.live) ? drop(state.live) : Object.assign({}, state.live), draft: state.draft ? drop(state.draft) : null };
    if (!(await writeState(env, raw, next))) return json({ error: "conflict", reason: "conflict" }, 409);
    await writeLog(env, logRows(state.draft || state.live, next.draft || next.live, state.draft ? "draft" : "live", "house", version, await adminName(env, who.id)));
    return json(next);
  }
  if (route === "/admin/badges" && method === "GET") {
    if (!(await admin())) return json({ error: "unauthorized" }, 401);
    return json(BADGES);
  }
  if (route === "/admin/house/upload-image" && method === "POST") {
    if (!(await admin())) return json({ error: "unauthorized" }, 401);
    if (!env.ITEM_IMAGES) return json({ error: "server_not_configured" }, 500);
    const body = await readBody(request);
    const id = body && typeof body.id === "string" && /^[a-z0-9-]{1,60}$/.test(body.id) ? body.id : "";
    const image = body && typeof body.image === "string" ? body.image : "";
    if (!id || !image || body.mediaType !== "image/webp") return json({ error: "bad_image" }, 400);
    let bytes;
    try { const bin = atob(image); bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i); } catch (e) { return json({ error: "bad_image" }, 400); }
    if (bytes.length > IMAGE_LIMIT) return json({ error: "too_large", limit: IMAGE_LIMIT }, 413);
    // RIFF....WEBP
    if (!(bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50)) return json({ error: "bad_image" }, 400);
    const key = `house3d/${id}-${Date.now().toString(36)}.webp`; // a new picture = a new key (served immutable)
    await env.ITEM_IMAGES.put(key, bytes, { httpMetadata: { contentType: "image/webp" } });
    return json({ img: `r2:${key}` });
  }
  if (route === "/house/report" && method === "POST") return handleReport(request, env);
  if (route === "/house/config" && method === "GET") {
    const { state } = await readState(env);
    let c = state.live;
    const s = await getSessionUser(request, env);
    if (s && state.draft && await isTrialUser(env, s, state)) c = state.draft;
    // public copy: who is a trial account is not for children's browsers
    // open: whether the new house opens for this visitor — the same rule as the /house/ page gate (houseOpenFor)
    return json(Object.assign({}, c, { switches: Object.assign({}, c.switches, { trialAccounts: [] }), open: await houseOpenFor(request, env, getSessionUser) }));
  }

  // ---------- S3 house saves ----------
  if (route === "/house" && (method === "GET" || method === "PUT")) {
    const s = await getSessionUser(request, env);
    if (!s) return json({ error: "unauthorized" }, 401);
    const n = Number(url.searchParams.get("p") || 0);
    if (!Number.isInteger(n) || n < 0 || n > 3) return json({ error: "bad_request" }, 400);
    if (n > 0 && s.role !== "paid" && s.role !== "admin") return json({ error: "locked" }, 403); // children 1-3: premium only (kept, never deleted)
    const key = houseRowKey(s.id, n);
    const row = await env.DB.prepare("SELECT save_json, rev, updated_at FROM house_saves WHERE account_key = ?").bind(key).first();
    if (method === "GET") return json(row ? { json: row.save_json, rev: row.rev, updatedAt: row.updated_at } : { json: null, rev: 0, updatedAt: null });
    const body = await readBody(request);
    if (!body || typeof body.json !== "string") return json({ error: "bad_request" }, 400);
    if (body.json.length > HOUSE_LIMIT) return json({ error: "too_large", limit: HOUSE_LIMIT }, 413);
    try { JSON.parse(body.json); } catch (e) { return json({ error: "bad_request" }, 400); }
    const rev = Number(body.rev) || 0, now = Date.now();
    const r = row
      ? await env.DB.prepare("UPDATE house_saves SET save_json = ?, rev = rev + 1, updated_at = ?, size = ? WHERE account_key = ? AND rev = ?").bind(body.json, now, body.json.length, key, rev).run()
      : (rev === 0 ? await env.DB.prepare("INSERT INTO house_saves (account_key, save_json, rev, updated_at, size) VALUES (?, ?, 1, ?, ?) ON CONFLICT(account_key) DO NOTHING").bind(key, body.json, now, body.json.length).run() : null);
    if (r && r.meta && r.meta.changes) return json({ ok: true, rev: row ? rev + 1 : 1, updatedAt: now });
    // someone else saved first (another device): send theirs back to merge
    const fresh = await env.DB.prepare("SELECT save_json, rev FROM house_saves WHERE account_key = ?").bind(key).first();
    return json({ error: "stale", rev: fresh ? fresh.rev : 0, json: fresh ? fresh.save_json : null }, 409);
  }
  return null;
}
