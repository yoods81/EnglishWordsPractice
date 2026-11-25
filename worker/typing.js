// Typing page leaderboard (2026-11-25). Table typing_scores (migrations/0022_typing_scores.sql).
//
//   POST /api/typing/score  { kind, level, input, slot, score }                     (kind "words")
//                           { kind, level, input, slot, chars, ms, keystrokes, mistakes } (sentence / paragraph / daily)
//        -> { ranked, score, wpm?, accuracy?, best, rank }
//   GET  /api/typing/board?kind=&level=&input=&period=week|all|today&slot=
//        -> { kind, level, input, period, rows: [{ rank, name, score, accuracy, at, me }], me: row|null }
//
// Only signed-in accounts are ranked. The board never shows names or emails: TypingCore.nickname(user, slot).
// WPM and accuracy are worked out here from the raw counts, not taken from the browser. A WPM result under
// MIN_RANK_ACC accuracy is not stored. Scores are best-per-child: each (account, child) appears once.
import TypingCore from "../public/js/typing-core.js";

const LEVELS = new Set(TypingCore.LEVELS);
const KINDS = new Set(TypingCore.KINDS);
const INPUTS = new Set(["kb", "touch"]);
const MAX_WORDS_SCORE = 1000000;
const MAX_PER_DAY = 200;      // stored results per account per day
const MIN_GAP_MS = 2000;      // two results closer than this are the same click twice
const BOARD_SIZE = 20;
const WEEK_MS = 7 * 86400000;

function clampSlot(v, role) {
  const n = Math.floor(Number(v) || 0);
  if (role !== "paid" && role !== "admin") return 0; // child profiles are Premium
  return Math.max(0, Math.min(3, n));
}

function boardWhere(kind, level, input, period, now) {
  const where = ["kind = ?", "level = ?", "input = ?"];
  const args = [kind, level, input];
  if (period === "today") { where.push("day = ?"); args.push(TypingCore.sydneyDay(now)); }
  else if (period === "week") { where.push("created_at >= ?"); args.push(now - WEEK_MS); }
  return { sql: where.join(" AND "), args };
}

const BEST_SQL = (w) => `SELECT user_id, slot, score, accuracy, created_at FROM (
    SELECT user_id, slot, score, accuracy, created_at,
           ROW_NUMBER() OVER (PARTITION BY user_id, slot ORDER BY score DESC, created_at ASC) AS rn
    FROM typing_scores WHERE ${w}) WHERE rn = 1`;

async function myStanding(env, w, userId, slot) {
  const mine = await env.DB.prepare(`SELECT * FROM (${BEST_SQL(w.sql)}) WHERE user_id = ? AND slot = ?`).bind(...w.args, userId, slot).first();
  if (!mine) return null;
  const ahead = await env.DB.prepare(`SELECT COUNT(*) AS n FROM (${BEST_SQL(w.sql)}) WHERE score > ? OR (score = ? AND created_at < ?)`)
    .bind(...w.args, mine.score, mine.score, mine.created_at).first();
  return { rank: (Number(ahead && ahead.n) || 0) + 1, score: Number(mine.score), accuracy: Number(mine.accuracy), at: Number(mine.created_at) };
}

export async function handleTyping(route, request, env, url, h) {
  const now = Date.now();
  const session = await h.getSessionUser(request, env);

  if (route === "/typing/board" && request.method === "GET") {
    const kind = url.searchParams.get("kind");
    const level = url.searchParams.get("level");
    const input = url.searchParams.get("input") || "kb";
    let period = url.searchParams.get("period") || "week";
    if (!KINDS.has(kind) || !LEVELS.has(level) || !INPUTS.has(input)) return h.json({ error: "bad_request" }, 400);
    if (kind === "daily") period = "today";
    if (!["week", "all", "today"].includes(period)) period = "week";
    const w = boardWhere(kind, level, input, period, now);
    const rows = await env.DB.prepare(`${BEST_SQL(w.sql)} ORDER BY score DESC, created_at ASC LIMIT ${BOARD_SIZE}`).bind(...w.args).all();
    const slot = session ? clampSlot(url.searchParams.get("slot"), session.role) : 0;
    const out = (rows.results || []).map((r, i) => ({
      rank: i + 1,
      name: TypingCore.nickname(r.user_id, r.slot),
      score: Number(r.score),
      accuracy: Number(r.accuracy),
      at: Number(r.created_at),
      me: !!session && r.user_id === session.id && Number(r.slot) === slot,
    }));
    let me = null;
    if (session) {
      const st = await myStanding(env, w, session.id, slot);
      if (st) me = Object.assign(st, { name: TypingCore.nickname(session.id, slot), me: true });
    }
    return h.json({ kind, level, input, period, rows: out, me, myName: session ? TypingCore.nickname(session.id, slot) : null });
  }

  if (route === "/typing/score" && request.method === "POST") {
    if (!session) return h.json({ error: "sign_in" }, 401);
    let b = null;
    try { b = await request.json(); } catch (e) { b = null; }
    if (!b || !KINDS.has(b.kind) || !LEVELS.has(b.level)) return h.json({ error: "bad_request" }, 400);
    const input = INPUTS.has(b.input) ? b.input : "kb";
    const slot = clampSlot(b.slot, session.role);
    let score, acc = 100, wpm = null;
    if (b.kind === "words") {
      score = Math.floor(Number(b.score));
      if (!Number.isFinite(score) || score <= 0 || score > MAX_WORDS_SCORE) return h.json({ error: "bad_score" }, 400);
    } else {
      const chars = Math.floor(Number(b.chars) || 0), ms = Math.floor(Number(b.ms) || 0);
      const keys = Math.floor(Number(b.keystrokes) || 0), miss = Math.floor(Number(b.mistakes) || 0);
      if (chars < 5 || ms < 1500 || keys < chars || miss < 0 || miss > keys || chars > 5000) return h.json({ error: "bad_score" }, 400);
      wpm = TypingCore.wpm(chars, ms);
      if (wpm >= TypingCore.MAX_WPM) return h.json({ error: "bad_score" }, 400);
      acc = TypingCore.accuracy(keys, miss);
      score = Math.round(wpm * 10);
      if (acc < TypingCore.MIN_RANK_ACC || score <= 0) return h.json({ ranked: false, reason: "accuracy", wpm, accuracy: acc });
    }
    const day = TypingCore.sydneyDay(now);
    const last = await env.DB.prepare("SELECT created_at, (SELECT COUNT(*) FROM typing_scores WHERE user_id = ? AND day = ?) AS n FROM typing_scores WHERE user_id = ? ORDER BY created_at DESC LIMIT 1")
      .bind(session.id, day, session.id).first();
    if (last && now - Number(last.created_at) < MIN_GAP_MS) return h.json({ error: "too_fast" }, 429);
    if (last && Number(last.n) >= MAX_PER_DAY) return h.json({ ranked: false, reason: "daily_limit", wpm, accuracy: acc });
    await env.DB.prepare("INSERT INTO typing_scores (user_id, slot, kind, level, input, score, accuracy, day, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(session.id, slot, b.kind, b.level, input, score, acc, day, now).run();
    const w = boardWhere(b.kind, b.level, input, b.kind === "daily" ? "today" : "all", now);
    const st = await myStanding(env, w, session.id, slot);
    return h.json({ ranked: true, score, wpm, accuracy: acc, best: st ? st.score : score, rank: st ? st.rank : null, name: TypingCore.nickname(session.id, slot) });
  }

  return h.json({ error: "not_found" }, 404);
}
