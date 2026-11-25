// Photo -> words (Claude vision, a paid API): how many photos each kind of account may read (decided 2026-11-25).
//   guest: none · free: 10 in total (a taste, never resets) · free-month trial: 10 a day · Premium: 30 a day · admin: unlimited
//   + a whole-site daily ceiling, so many new accounts can't run the bill up.
// Counts live in extract_usage (user_id, day, count): day = "YYYY-MM-DD" (Sydney day for daily limits),
// "total" for the free lifetime count, and user_id "__site__" for the site ceiling.
// The numbers are admin settings (site_settings "photo_limits", System tab) with these defaults.
export const DEFAULT_PHOTO_LIMITS = { freeTotal: 10, trialDaily: 10, paidDaily: 30, siteDaily: 1000 };
const KEY = "photo_limits";
const RANGE = { freeTotal: [0, 100], trialDaily: [0, 200], paidDaily: [0, 200], siteDaily: [0, 100000] };

export function checkPhotoLimits(raw) {
  const out = { ...DEFAULT_PHOTO_LIMITS }, errors = [];
  for (const k of Object.keys(RANGE)) {
    if (!raw || raw[k] === undefined) continue;
    const n = Number(raw[k]);
    if (!Number.isInteger(n) || n < RANGE[k][0] || n > RANGE[k][1]) errors.push(k);
    else out[k] = n;
  }
  return { limits: out, errors };
}

export async function readPhotoLimits(env) {
  try {
    const row = await env.DB.prepare("SELECT value FROM site_settings WHERE key = ?").bind(KEY).first();
    if (!row) return { ...DEFAULT_PHOTO_LIMITS, log: [] };
    const v = JSON.parse(row.value);
    return { ...checkPhotoLimits(v).limits, log: Array.isArray(v.log) ? v.log : [] };
  } catch (e) {
    return { ...DEFAULT_PHOTO_LIMITS, log: [] };
  }
}

// Sydney calendar day (UTC+11 in summer, +10 otherwise — a fixed +10 keeps "today" stable enough for a counter).
const sydneyDay = (now = Date.now()) => new Date(now + 10 * 3600e3).toISOString().slice(0, 10);

// Which rule applies to this session: { kind, scope: "none"|"total"|"day"|"unlimited", limit, day }
export async function photoPlan(env, session, now = Date.now()) {
  const L = await readPhotoLimits(env);
  const day = sydneyDay(now);
  if (!session) return { kind: "guest", scope: "none", limit: 0, day, site: L.siteDaily };
  if (session.role === "admin") return { kind: "admin", scope: "unlimited", limit: null, day, site: L.siteDaily };
  if (session.role === "paid") {
    let trial = null;
    try { trial = await env.DB.prepare("SELECT started_at, ends_at FROM trials WHERE user_id = ? AND started_at IS NOT NULL AND ends_at > ?").bind(session.id, now).first(); } catch (e) { /* no trials table yet */ }
    return trial ? { kind: "trial", scope: "day", limit: L.trialDaily, day, site: L.siteDaily } : { kind: "paid", scope: "day", limit: L.paidDaily, day, site: L.siteDaily };
  }
  if (session.role === "free") return { kind: "free", scope: "total", limit: L.freeTotal, day, site: L.siteDaily };
  return { kind: "guest", scope: "none", limit: 0, day, site: L.siteDaily };
}

const slot = (plan) => (plan.scope === "total" ? "total" : plan.day);

export async function photoUsed(env, userId, plan) {
  if (plan.scope === "none" || plan.scope === "unlimited") return 0;
  const r = await env.DB.prepare("SELECT count FROM extract_usage WHERE user_id = ? AND day = ?").bind(userId, slot(plan)).first();
  return (r && r.count) || 0;
}

// Takes one photo from the allowance. Returns { ok, error?, used, left, refund() }.
export async function takePhoto(env, session, plan) {
  if (plan.scope === "none") return { ok: false, error: "unauthorized" };
  const bump = (uid, d) => env.DB.prepare(
    "INSERT INTO extract_usage (user_id, day, count) VALUES (?, ?, 1) ON CONFLICT(user_id, day) DO UPDATE SET count = count + 1 RETURNING count"
  ).bind(uid, d).first();
  const drop = (uid, d) => env.DB.prepare("UPDATE extract_usage SET count = MAX(count - 1, 0) WHERE user_id = ? AND day = ?").bind(uid, d).run().catch(() => {});
  let used = 0;
  if (plan.scope !== "unlimited") {
    used = (await bump(session.id, slot(plan)))?.count || 1;
    if (used > plan.limit) {
      await drop(session.id, slot(plan));
      return { ok: false, error: "photo_limit", used: plan.limit, left: 0 };
    }
  }
  if (session.role !== "admin") {
    const site = (await bump("__site__", plan.day))?.count || 1;
    if (site > plan.site) {
      await drop("__site__", plan.day);
      if (plan.scope !== "unlimited") await drop(session.id, slot(plan));
      return { ok: false, error: "site_limit", used: used - 1, left: plan.limit === null ? null : Math.max(0, plan.limit - used + 1) };
    }
  }
  const refund = async () => {
    if (plan.scope !== "unlimited") await drop(session.id, slot(plan));
    if (session.role !== "admin") await drop("__site__", plan.day);
  };
  return { ok: true, used, left: plan.limit === null ? null : Math.max(0, plan.limit - used), refund };
}

// GET /extract-words/usage · GET/PUT /admin/photo-limits
export async function handlePhoto(route, request, env, { json, getSessionUser }) {
  const session = await getSessionUser(request, env);
  if (route === "/extract-words/usage" && request.method === "GET") {
    const plan = await photoPlan(env, session);
    const used = session ? await photoUsed(env, session.id, plan) : 0;
    return json({ kind: plan.kind, scope: plan.scope, limit: plan.limit, used, left: plan.limit === null ? null : Math.max(0, plan.limit - used) });
  }
  if (route === "/admin/photo-limits") {
    if (!session || session.role !== "admin") return json({ error: "unauthorized" }, 401);
    if (request.method === "GET") {
      const L = await readPhotoLimits(env);
      const today = await env.DB.prepare("SELECT count FROM extract_usage WHERE user_id = '__site__' AND day = ?").bind(sydneyDay()).first();
      return json({ limits: L, defaults: DEFAULT_PHOTO_LIMITS, siteToday: (today && today.count) || 0 });
    }
    if (request.method === "PUT") {
      let body;
      try { body = await request.json(); } catch (e) { return json({ error: "bad_request" }, 400); }
      const { limits, errors } = checkPhotoLimits(body);
      if (errors.length) return json({ error: "invalid", fields: errors }, 400);
      const { log, ...prev } = await readPhotoLimits(env);
      const nextLog = [{ at: Date.now(), by: session.id, before: prev, after: limits }].concat(log).slice(0, 20);
      await env.DB.prepare("INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at")
        .bind(KEY, JSON.stringify({ ...limits, log: nextLog }), Date.now()).run();
      return json({ limits: { ...limits, log: nextLog } });
    }
  }
  return null;
}
