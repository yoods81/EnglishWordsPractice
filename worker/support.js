// Customer support for Koala Study Mate: inquiries ("tickets") with a message
// thread, private admin notes about a customer, a small admin overview, and a
// site-wide announcement. index.js hands every matching /api route to
// handleSupport(), which returns a Response, or null if the route isn't one of
// its own.
//
// Statuses: 'open' = needs a reply from us, 'pending' = we answered and are
// waiting on the customer, 'resolved' = done. A customer's follow-up reopens it.

import { sendEmail, templates, emailSettings } from "./email.js";

const CATEGORIES = ["question", "bug", "account", "payment", "other"];
const STATUSES = ["open", "pending", "resolved"];
const MAX_MESSAGE = 2000;
const MAX_SUBJECT = 100;
const MAX_NOTE = 2000;
const MAX_ANNOUNCEMENT = 200;
const TICKETS_PER_HOUR = 5;
const REPLIES_PER_HOUR = 15;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

async function readJson(request) {
  try {
    const b = await request.json();
    return b && typeof b === "object" ? b : null;
  } catch (e) {
    return null;
  }
}

export async function handleSupport({ route, request, env, url, h }) {
  const { json, getSessionUser, genId, normalizeEmail, validEmail, hmac, rowToAdminUser } = h;
  const method = request.method;
  const now = Date.now();

  /* ---------- public: announcement banner ---------- */

  if (route === "/announcement" && method === "GET") {
    const row = await env.DB.prepare("SELECT value FROM site_settings WHERE key = 'announcement'").first().catch(() => null);
    const a = parseAnnouncement(row && row.value);
    return json(a.active && a.text ? { text: a.text, updatedAt: a.updatedAt } : { text: "" });
  }

  /* ---------- customer side ---------- */

  // Anyone can write in. A signed-in account is attached automatically; a
  // signed-out visitor has to leave an email address so we can answer.
  if (route === "/support/tickets" && method === "POST") {
    const body = await readJson(request);
    if (!body) return json({ error: "bad_request" }, 400);
    // Honeypot: a real person never sees or fills this field.
    if (str(body.website, 200)) return json({ ticket: { id: "-", status: "open" } });

    const message = str(body.message, MAX_MESSAGE);
    if (!message) return json({ error: "message_required" }, 400);
    const category = CATEGORIES.includes(body.category) ? body.category : "question";
    const subject = str(body.subject, MAX_SUBJECT) || message.replace(/\s+/g, " ").slice(0, 60);

    const session = await getSessionUser(request, env);
    let userId = null;
    let name = str(body.name, 60) || null;
    let email = normalizeEmail(body.email);
    if (session) {
      const u = await env.DB.prepare("SELECT id, username, email FROM users WHERE id = ?").bind(session.id).first();
      if (!u) return json({ error: "unauthorized" }, 401);
      userId = u.id;
      name = u.username;
      if (u.email) email = u.email;
      else if (email && !validEmail(email)) return json({ error: "invalid_email" }, 400);
    } else if (!validEmail(email)) {
      return json({ error: "invalid_email" }, 400);
    }
    email = email || null;

    const ip = request.headers.get("cf-connecting-ip") || "";
    const ipHash = ip ? await hmac(ip, env.SESSION_SECRET) : null;
    const recent = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM support_tickets WHERE created_at > ? AND (user_id = ? OR ip_hash = ? OR email = ?)"
    )
      .bind(now - HOUR_MS, userId, ipHash, email)
      .first();
    if (recent && recent.n >= TICKETS_PER_HOUR) return json({ error: "too_many" }, 429);

    const id = genId();
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO support_tickets (id, user_id, email, name, category, subject, status, created_at, updated_at, last_from, admin_unread, user_unread, ip_hash)
         VALUES (?, ?, ?, ?, ?, ?, 'open', ?, ?, 'user', 1, 0, ?)`
      ).bind(id, userId, email, name, category, subject, now, now, ipHash),
      env.DB.prepare("INSERT INTO support_messages (ticket_id, sender, body, created_at) VALUES (?, 'user', ?, ?)").bind(id, message, now),
    ]);
    await alertAdmin(env, { subject, from: name || email || "visitor", body: message });
    return json({ ticket: { id, status: "open" } });
  }

  if (route.startsWith("/support/")) {
    const session = await getSessionUser(request, env);
    if (!session) return json({ error: "unauthorized" }, 401);

    // The signed-in customer's own inquiries.
    if (route === "/support/mine" && method === "GET") {
      const { results } = await env.DB.prepare(
        `SELECT id, subject, category, status, created_at, updated_at, user_unread
           FROM support_tickets WHERE user_id = ? ORDER BY updated_at DESC LIMIT 50`
      )
        .bind(session.id)
        .all();
      const tickets = (results || []).map((r) => ({
        id: r.id, subject: r.subject, category: r.category, status: r.status,
        createdAt: r.created_at, updatedAt: r.updated_at, unread: !!r.user_unread,
      }));
      return json({ tickets, unread: tickets.filter((t) => t.unread).length });
    }

    if (route === "/support/ticket" && method === "GET") {
      const t = await env.DB.prepare(
        "SELECT id, subject, category, status, created_at, updated_at, user_unread FROM support_tickets WHERE id = ? AND user_id = ?"
      )
        .bind(url.searchParams.get("id") || "", session.id)
        .first();
      if (!t) return json({ error: "not_found" }, 404);
      const { results } = await env.DB.prepare(
        "SELECT sender, body, created_at FROM support_messages WHERE ticket_id = ? AND sender != 'note' ORDER BY id ASC"
      )
        .bind(t.id)
        .all();
      if (t.user_unread) await env.DB.prepare("UPDATE support_tickets SET user_unread = 0 WHERE id = ?").bind(t.id).run();
      return json({
        ticket: { id: t.id, subject: t.subject, category: t.category, status: t.status, createdAt: t.created_at, updatedAt: t.updated_at },
        messages: (results || []).map((m) => ({ from: m.sender, body: m.body, createdAt: m.created_at })),
      });
    }

    if (route === "/support/reply" && method === "POST") {
      const body = await readJson(request);
      if (!body) return json({ error: "bad_request" }, 400);
      const message = str(body.message, MAX_MESSAGE);
      if (!message) return json({ error: "message_required" }, 400);
      const t = await env.DB.prepare("SELECT id, subject, status, admin_unread, name FROM support_tickets WHERE id = ? AND user_id = ?")
        .bind(typeof body.ticketId === "string" ? body.ticketId : "", session.id)
        .first();
      if (!t) return json({ error: "not_found" }, 404);
      const recent = await env.DB.prepare(
        "SELECT COUNT(*) AS n FROM support_messages WHERE ticket_id = ? AND sender = 'user' AND created_at > ?"
      )
        .bind(t.id, now - HOUR_MS)
        .first();
      if (recent && recent.n >= REPLIES_PER_HOUR) return json({ error: "too_many" }, 429);
      await env.DB.batch([
        env.DB.prepare("INSERT INTO support_messages (ticket_id, sender, body, created_at) VALUES (?, 'user', ?, ?)").bind(t.id, message, now),
        env.DB.prepare("UPDATE support_tickets SET status = 'open', last_from = 'user', admin_unread = 1, updated_at = ? WHERE id = ?").bind(now, t.id),
      ]);
      // Only nudge the admin mailbox when this is news — not on every follow-up
      // sent while an earlier unread one is still waiting.
      if (!(t.status === "open" && t.admin_unread)) await alertAdmin(env, { subject: t.subject, from: t.name || "customer", body: message });
      return json({ ok: true });
    }

    // The customer says it's sorted out.
    if (route === "/support/close" && method === "POST") {
      const body = await readJson(request);
      const r = await env.DB.prepare("UPDATE support_tickets SET status = 'resolved', updated_at = ? WHERE id = ? AND user_id = ?")
        .bind(now, typeof body?.ticketId === "string" ? body.ticketId : "", session.id)
        .run();
      return json({ ok: true, changed: !!(r && (r.meta ? r.meta.changes : true)) });
    }

    return null;
  }

  /* ---------- admin side ---------- */

  const session = await getSessionUser(request, env);
  if (!session || session.role !== "admin") return json({ error: "unauthorized" }, 401);

  // One call for the Overview tab and the Inbox tab badge.
  if (route === "/admin/overview" && method === "GET") {
    const one = async (sql, ...args) => {
      const r = await env.DB.prepare(sql).bind(...args).first().catch(() => null);
      return r ? Number(r.n) || 0 : 0;
    };
    const ann = parseAnnouncement(
      (await env.DB.prepare("SELECT value FROM site_settings WHERE key = 'announcement'").first().catch(() => null))?.value
    );
    return json({
      openTickets: await one("SELECT COUNT(*) AS n FROM support_tickets WHERE status = 'open'"),
      unreadTickets: await one("SELECT COUNT(*) AS n FROM support_tickets WHERE admin_unread = 1 AND status != 'resolved'"),
      pendingUpgrades: await one("SELECT COUNT(*) AS n FROM upgrade_requests WHERE status = 'pending'"),
      newUsers7d: await one("SELECT COUNT(*) AS n FROM users WHERE role != 'admin' AND created_at > ?", now - 7 * DAY_MS),
      failedEmails7d: await one("SELECT COUNT(*) AS n FROM email_log WHERE status = 'failed' AND created_at > ?", now - 7 * DAY_MS),
      noEmail: await one("SELECT COUNT(*) AS n FROM users WHERE role != 'admin' AND (email IS NULL OR email = '')"),
      unverified: await one("SELECT COUNT(*) AS n FROM users WHERE role != 'admin' AND email IS NOT NULL AND email != '' AND email_verified_at IS NULL"),
      emailConfigured: emailSettings(env).configured,
      announcement: { text: ann.text, active: ann.active },
    });
  }

  if (route === "/admin/announcement" && method === "POST") {
    const body = await readJson(request);
    if (!body) return json({ error: "bad_request" }, 400);
    const a = { text: str(body.text, MAX_ANNOUNCEMENT), active: !!body.active, updatedAt: now };
    if (a.active && !a.text) return json({ error: "text_required" }, 400);
    await env.DB.prepare(
      `INSERT INTO site_settings (key, value, updated_at) VALUES ('announcement', ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    )
      .bind(JSON.stringify(a), now)
      .run();
    return json({ ok: true, announcement: { text: a.text, active: a.active } });
  }

  // ---- inbox ----

  if (route === "/admin/support/tickets" && method === "GET") {
    const status = url.searchParams.get("status") || "open";
    const q = (url.searchParams.get("q") || "").trim().slice(0, 60);
    const like = `%${q}%`;
    const { results } = await env.DB.prepare(
      `SELECT t.id, t.user_id, t.email, t.name, t.category, t.subject, t.status, t.created_at, t.updated_at, t.last_from, t.admin_unread,
              u.username, u.role,
              (SELECT m.body FROM support_messages m WHERE m.ticket_id = t.id AND m.sender != 'note' ORDER BY m.id DESC LIMIT 1) AS preview
         FROM support_tickets t LEFT JOIN users u ON u.id = t.user_id
        WHERE (? = 'all' OR t.status = ?)
          AND (? = '' OR t.subject LIKE ? OR t.email LIKE ? OR t.name LIKE ? OR u.username LIKE ?)
        ORDER BY t.updated_at DESC LIMIT 100`
    )
      .bind(status, status, q, like, like, like, like)
      .all();
    const counts = { open: 0, pending: 0, resolved: 0 };
    const { results: cr } = await env.DB.prepare("SELECT status, COUNT(*) AS n FROM support_tickets GROUP BY status").all();
    (cr || []).forEach((r) => { if (r.status in counts) counts[r.status] = r.n; });
    return json({
      tickets: (results || []).map((r) => ({
        id: r.id, userId: r.user_id || null, username: r.username || null, role: r.role || null,
        email: r.email || null, name: r.name || null, category: r.category, subject: r.subject, status: r.status,
        createdAt: r.created_at, updatedAt: r.updated_at, lastFrom: r.last_from, unread: !!r.admin_unread,
        preview: String(r.preview || "").slice(0, 140),
      })),
      counts,
    });
  }

  if (route === "/admin/support/ticket" && method === "GET") {
    const t = await env.DB.prepare(
      `SELECT t.*, u.username, u.role, u.email AS user_email, u.email_verified_at
         FROM support_tickets t LEFT JOIN users u ON u.id = t.user_id WHERE t.id = ?`
    )
      .bind(url.searchParams.get("id") || "")
      .first();
    if (!t) return json({ error: "not_found" }, 404);
    const { results } = await env.DB.prepare("SELECT id, sender, body, emailed, created_at FROM support_messages WHERE ticket_id = ? ORDER BY id ASC")
      .bind(t.id)
      .all();
    if (t.admin_unread) await env.DB.prepare("UPDATE support_tickets SET admin_unread = 0 WHERE id = ?").bind(t.id).run();
    const contact = replyAddress(t);
    return json({
      ticket: {
        id: t.id, userId: t.user_id || null, username: t.username || null, role: t.role || null,
        email: t.email || t.user_email || null, name: t.name || null, category: t.category, subject: t.subject, status: t.status,
        createdAt: t.created_at, updatedAt: t.updated_at, canEmail: !!contact,
      },
      messages: (results || []).map((m) => ({ id: m.id, from: m.sender, body: m.body, emailed: !!m.emailed, createdAt: m.created_at })),
    });
  }

  if (route === "/admin/support/reply" && method === "POST") {
    const body = await readJson(request);
    if (!body) return json({ error: "bad_request" }, 400);
    const message = str(body.message, MAX_MESSAGE);
    if (!message) return json({ error: "message_required" }, 400);
    const t = await loadTicketWithUser(env, body.ticketId);
    if (!t) return json({ error: "not_found" }, 404);
    const status = STATUSES.includes(body.status) ? body.status : "pending";
    const to = body.sendEmail === false ? null : replyAddress(t);
    let emailed = false;
    let emailError = null;
    if (to) {
      const result = await sendEmail(env, {
        to, kind: "support",
        ...templates.supportReply({ subject: t.subject, body: message, appUrl: emailSettings(env).appUrl, hasAccount: !!t.user_id }),
      });
      emailed = result.ok;
      emailError = result.error;
    }
    await env.DB.batch([
      env.DB.prepare("INSERT INTO support_messages (ticket_id, sender, body, emailed, created_at) VALUES (?, 'admin', ?, ?, ?)").bind(t.id, message, emailed ? 1 : 0, now),
      env.DB.prepare("UPDATE support_tickets SET status = ?, last_from = 'admin', admin_unread = 0, user_unread = ?, updated_at = ? WHERE id = ?")
        .bind(status, t.user_id ? 1 : 0, now, t.id),
    ]);
    return json({ ok: true, status, emailed, emailError });
  }

  if (route === "/admin/support/note" && method === "POST") {
    const body = await readJson(request);
    const note = str(body?.note, MAX_NOTE);
    const t = await env.DB.prepare("SELECT id FROM support_tickets WHERE id = ?").bind(typeof body?.ticketId === "string" ? body.ticketId : "").first();
    if (!note) return json({ error: "message_required" }, 400);
    if (!t) return json({ error: "not_found" }, 404);
    await env.DB.prepare("INSERT INTO support_messages (ticket_id, sender, body, created_at) VALUES (?, 'note', ?, ?)").bind(t.id, note, now).run();
    return json({ ok: true });
  }

  if (route === "/admin/support/status" && method === "POST") {
    const body = await readJson(request);
    if (!body || !STATUSES.includes(body.status)) return json({ error: "bad_request" }, 400);
    const t = await env.DB.prepare("SELECT id FROM support_tickets WHERE id = ?").bind(typeof body.ticketId === "string" ? body.ticketId : "").first();
    if (!t) return json({ error: "not_found" }, 404);
    await env.DB.prepare("UPDATE support_tickets SET status = ?, admin_unread = 0, updated_at = ? WHERE id = ?").bind(body.status, now, t.id).run();
    return json({ ok: true });
  }

  if (route === "/admin/support/delete" && method === "POST") {
    const body = await readJson(request);
    const id = typeof body?.ticketId === "string" ? body.ticketId : "";
    if (!id) return json({ error: "bad_request" }, 400);
    await env.DB.batch([
      env.DB.prepare("DELETE FROM support_messages WHERE ticket_id = ?").bind(id),
      env.DB.prepare("DELETE FROM support_tickets WHERE id = ?").bind(id),
    ]);
    return json({ ok: true });
  }

  // The admin starts the conversation (e.g. a welcome or a heads-up to one customer).
  if (route === "/admin/support/new" && method === "POST") {
    const body = await readJson(request);
    if (!body) return json({ error: "bad_request" }, 400);
    const message = str(body.message, MAX_MESSAGE);
    const subject = str(body.subject, MAX_SUBJECT);
    if (!message || !subject) return json({ error: "message_required" }, 400);
    const u = await env.DB.prepare("SELECT id, username, email, email_verified_at FROM users WHERE id = ?")
      .bind(typeof body.userId === "string" ? body.userId : "")
      .first();
    if (!u) return json({ error: "not_found" }, 404);
    const id = genId();
    const fake = { user_id: u.id, email: u.email, user_email: u.email, email_verified_at: u.email_verified_at };
    const to = body.sendEmail === false ? null : replyAddress(fake);
    let emailed = false;
    if (to) {
      const result = await sendEmail(env, {
        to, kind: "support",
        ...templates.supportReply({ subject, body: message, appUrl: emailSettings(env).appUrl, hasAccount: true }),
      });
      emailed = result.ok;
    }
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO support_tickets (id, user_id, email, name, category, subject, status, created_at, updated_at, last_from, admin_unread, user_unread)
         VALUES (?, ?, ?, ?, 'other', ?, 'pending', ?, ?, 'admin', 0, 1)`
      ).bind(id, u.id, u.email || null, u.username, subject, now, now),
      env.DB.prepare("INSERT INTO support_messages (ticket_id, sender, body, emailed, created_at) VALUES (?, 'admin', ?, ?, ?)").bind(id, message, emailed ? 1 : 0, now),
    ]);
    return json({ ok: true, ticket: { id }, emailed });
  }

  // ---- customer file ----

  if (route === "/admin/customer" && method === "GET") {
    const userId = url.searchParams.get("userId") || "";
    const u = await env.DB.prepare("SELECT id, username, role, created_at, upgraded_at, email, email_verified_at FROM users WHERE id = ?").bind(userId).first();
    if (!u) return json({ error: "not_found" }, 404);
    const note = await env.DB.prepare("SELECT note, updated_at FROM customer_notes WHERE user_id = ?").bind(userId).first();
    const { results } = await env.DB.prepare(
      "SELECT id, subject, status, updated_at FROM support_tickets WHERE user_id = ? ORDER BY updated_at DESC LIMIT 20"
    )
      .bind(userId)
      .all();
    const k = await env.DB.prepare("SELECT coins, earned, streak, best_streak FROM user_koala WHERE user_id = ?").bind(userId).first();
    const emails = await env.DB.prepare("SELECT COUNT(*) AS n FROM email_log WHERE to_addr = ? AND status = 'failed'").bind(u.email || "").first().catch(() => null);
    return json({
      user: rowToAdminUser(u),
      note: note ? note.note : "",
      noteUpdatedAt: note ? note.updated_at : null,
      tickets: (results || []).map((r) => ({ id: r.id, subject: r.subject, status: r.status, updatedAt: r.updated_at })),
      koala: k ? { coins: k.coins, earned: k.earned, streak: k.streak, best: k.best_streak } : null,
      failedEmails: emails ? emails.n : 0,
    });
  }

  if (route === "/admin/customer/note" && method === "POST") {
    const body = await readJson(request);
    const userId = typeof body?.userId === "string" ? body.userId : "";
    if (!userId) return json({ error: "bad_request" }, 400);
    const u = await env.DB.prepare("SELECT id FROM users WHERE id = ?").bind(userId).first();
    if (!u) return json({ error: "not_found" }, 404);
    const note = str(body.note, MAX_NOTE);
    if (!note) {
      await env.DB.prepare("DELETE FROM customer_notes WHERE user_id = ?").bind(userId).run();
    } else {
      await env.DB.prepare(
        `INSERT INTO customer_notes (user_id, note, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET note = excluded.note, updated_at = excluded.updated_at`
      )
        .bind(userId, note, now)
        .run();
    }
    return json({ ok: true });
  }

  return null;
}

/* ---------- helpers ---------- */

function parseAnnouncement(raw) {
  try {
    const a = JSON.parse(raw || "null");
    if (a && typeof a === "object") return { text: String(a.text || ""), active: !!a.active, updatedAt: a.updatedAt || 0 };
  } catch (e) {
    /* fall through */
  }
  return { text: "", active: false, updatedAt: 0 };
}

async function loadTicketWithUser(env, ticketId) {
  return env.DB.prepare(
    `SELECT t.id, t.user_id, t.email, t.subject, u.email AS user_email, u.email_verified_at
       FROM support_tickets t LEFT JOIN users u ON u.id = t.user_id WHERE t.id = ?`
  )
    .bind(typeof ticketId === "string" ? ticketId : "")
    .first();
}

// Where an emailed reply may go. A signed-in customer's address only counts
// once it's confirmed; a signed-out visitor's address is the only way to reach
// them, so it's used as given.
function replyAddress(t) {
  if (t.user_id) return t.user_email && t.email_verified_at ? t.user_email : null;
  return t.email || null;
}

// Tells the admin mailbox a customer wrote in. Never throws.
async function alertAdmin(env, { subject, from, body }) {
  try {
    const s = emailSettings(env);
    if (!s.configured) return;
    await sendEmail(env, { to: s.replyTo, kind: "support_admin", ...templates.supportAlert({ subject, from, body, appUrl: s.appUrl }) });
  } catch (e) {
    /* a missing alert must never fail the customer's request */
  }
}
