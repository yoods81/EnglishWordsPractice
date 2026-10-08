// Worker route test for customer support (inquiries, inbox, customer notes, announcement),
// using node:sqlite as a tiny D1 stand-in.
// Run: node --experimental-sqlite --test tests/worker-support.test.mjs  (Node 22+)
import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import worker from "../worker/index.js";

const db = new DatabaseSync(":memory:");
db.exec(fs.readFileSync(new URL("../schema.sql", import.meta.url), "utf8"));
const wrap = (sql) => {
  let args = [];
  const st = {
    bind: (...a) => { args = a; return st; },
    first: async () => db.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...args) }),
    run: async () => { const r = db.prepare(sql).run(...args); return { meta: { changes: r.changes } }; },
    _exec: () => db.prepare(sql).run(...args),
  };
  return st;
};
const sent = [];
const env = {
  SESSION_SECRET: "secret",
  DB: { prepare: wrap, batch: async (sts) => { sts.forEach((s) => s._exec()); return []; } },
};

async function cookieFor(id, role) {
  const exp = Date.now() + 1e6;
  const payload = `${id}.${role}.${exp}`;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode("secret"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = Buffer.from(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload))).toString("hex");
  return `${payload}.${sig}`;
}
const src = fs.readFileSync(new URL("../worker/index.js", import.meta.url), "utf8");
const cookieName = src.match(/SESSION_COOKIE = "([^"]+)"/)[1];

let ipCounter = 0;
async function call(who, method, path, body, ip) {
  const headers = { "content-type": "application/json", "cf-connecting-ip": ip || `10.0.0.${++ipCounter}` };
  if (who) headers.cookie = `${cookieName}=${encodeURIComponent(await cookieFor(who.id, who.role))}`;
  const res = await worker.fetch(new Request("https://x.test/api" + path, { method, headers, body: body ? JSON.stringify(body) : undefined }), env);
  return { status: res.status, data: await res.json() };
}
const admin = { id: "a1", role: "admin" }, kid = { id: "u1", role: "free" }, other = { id: "u2", role: "free" }, stuck = { id: "u3", role: "free" };
const addUser = (id, name, role, email, verified) =>
  db.prepare("INSERT INTO users (id,username,password_hash,password_salt,role,created_at,email,email_verified_at) VALUES (?,?,?,?,?,?,?,?)").run(id, name, "h", "s", role, 1, email, verified);
addUser("a1", "boss", "admin", null, null);
addUser("u1", "kid1", "free", "kid1@example.com", 5);
addUser("u2", "kid2", "free", null, null);
addUser("u3", "kid3", "free", "kid3@example.com", null); // email not confirmed yet

test("a signed-out visitor needs a valid email; a honeypot hit is silently dropped", async () => {
  assert.equal((await call(null, "POST", "/support/tickets", { message: "hi" })).status, 400);
  assert.equal((await call(null, "POST", "/support/tickets", { message: "hi", email: "nope" })).status, 400);
  assert.equal((await call(null, "POST", "/support/tickets", { email: "a@b.co" })).data.error, "message_required");
  const bot = await call(null, "POST", "/support/tickets", { message: "buy now", email: "a@b.co", website: "http://spam" });
  assert.equal(bot.status, 200);
  assert.equal(db.prepare("SELECT COUNT(*) c FROM support_tickets").get().c, 0);
  const ok = await call(null, "POST", "/support/tickets", { message: "I forgot my username", email: "Mum@Example.com", category: "account", subject: "Username" });
  assert.equal(ok.status, 200);
  const row = db.prepare("SELECT * FROM support_tickets").get();
  assert.equal(row.email, "mum@example.com");
  assert.equal(row.user_id, null);
  assert.equal(row.status, "open");
});

test("a signed-in account is attached automatically, and sees only its own inquiries", async () => {
  const made = await call(kid, "POST", "/support/tickets", { message: "The game froze on level 2", category: "bug" });
  assert.equal(made.status, 200);
  const id = made.data.ticket.id;
  const row = db.prepare("SELECT * FROM support_tickets WHERE id = ?").get(id);
  assert.equal(row.user_id, "u1");
  assert.equal(row.name, "kid1");
  assert.equal(row.subject, "The game froze on level 2");
  assert.equal((await call(null, "GET", "/support/mine")).status, 401);
  assert.equal((await call(kid, "GET", "/support/mine")).data.tickets.length, 1);
  assert.equal((await call(other, "GET", "/support/mine")).data.tickets.length, 0);
  assert.equal((await call(other, "GET", `/support/ticket?id=${id}`)).status, 404);
  assert.equal((await call(other, "POST", "/support/reply", { ticketId: id, message: "hijack" })).status, 404);
  const thread = await call(kid, "GET", `/support/ticket?id=${id}`);
  assert.equal(thread.data.messages.length, 1);
});

test("someone stuck on email confirmation can still write in", async () => {
  assert.equal((await call(stuck, "GET", "/words")).status, 403);
  assert.equal((await call(stuck, "POST", "/support/tickets", { message: "I never got the confirmation email" })).status, 200);
  assert.equal((await call(stuck, "GET", "/support/mine")).status, 200);
  assert.equal((await call(null, "GET", "/announcement")).status, 200);
  db.prepare("DELETE FROM support_tickets WHERE user_id = 'u3'").run();
  db.prepare("DELETE FROM support_messages WHERE ticket_id NOT IN (SELECT id FROM support_tickets)").run();
});

test("only admins can use the inbox", async () => {
  for (const [m, p] of [["GET", "/admin/support/tickets"], ["GET", "/admin/support/ticket?id=x"], ["POST", "/admin/support/reply"], ["POST", "/admin/support/note"], ["POST", "/admin/support/status"], ["POST", "/admin/support/delete"], ["POST", "/admin/support/new"], ["GET", "/admin/customer?userId=u1"], ["POST", "/admin/customer/note"], ["GET", "/admin/overview"], ["POST", "/admin/announcement"]]) {
    const body = m === "GET" ? undefined : {};
    assert.equal((await call(null, m, p, body)).status, 401, `${m} ${p} anon`);
    assert.equal((await call(kid, m, p, body)).status, 401, `${m} ${p} kid`);
  }
});

test("inbox: list with counts and filter, open marks it read, reply moves it to pending and flags the customer", async () => {
  const list = await call(admin, "GET", "/admin/support/tickets?status=open");
  assert.equal(list.data.tickets.length, 2);
  assert.equal(list.data.counts.open, 2);
  assert.ok(list.data.tickets.every((t) => t.unread));
  const t = list.data.tickets.find((x) => x.userId === "u1");
  assert.equal(t.username, "kid1");
  assert.equal((await call(admin, "GET", "/admin/support/tickets?status=open&q=froze")).data.tickets.length, 1);
  assert.equal((await call(admin, "GET", "/admin/support/tickets?status=all&q=kid1")).data.tickets.length, 1);

  const open = await call(admin, "GET", `/admin/support/ticket?id=${t.id}`);
  assert.equal(open.data.ticket.canEmail, true);
  assert.equal(db.prepare("SELECT admin_unread FROM support_tickets WHERE id = ?").get(t.id).admin_unread, 0);

  env.EMAIL = { send: async (m) => { sent.push(m); } };
  const reply = await call(admin, "POST", "/admin/support/reply", { ticketId: t.id, message: "Sorry about that — fixed now." });
  assert.equal(reply.data.status, "pending");
  assert.equal(reply.data.emailed, true);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, "kid1@example.com");
  assert.ok(sent[0].html.includes("fixed now"));
  assert.equal((await call(admin, "POST", "/admin/support/reply", { ticketId: t.id, message: "  " })).status, 400);
  assert.equal((await call(admin, "POST", "/admin/support/reply", { ticketId: "nope", message: "x" })).status, 404);

  const mine = await call(kid, "GET", "/support/mine");
  assert.equal(mine.data.unread, 1);
  assert.equal(mine.data.tickets[0].status, "pending");
  const thread = await call(kid, "GET", `/support/ticket?id=${t.id}`);
  assert.deepEqual(thread.data.messages.map((m) => m.from), ["user", "admin"]);
  assert.equal((await call(kid, "GET", "/support/mine")).data.unread, 0);
});

test("a private note never reaches the customer; a customer follow-up reopens the ticket", async () => {
  const t = db.prepare("SELECT id FROM support_tickets WHERE user_id = 'u1'").get();
  assert.equal((await call(admin, "POST", "/admin/support/note", { ticketId: t.id, note: "Looks like an old tablet" })).status, 200);
  const adminView = await call(admin, "GET", `/admin/support/ticket?id=${t.id}`);
  assert.deepEqual(adminView.data.messages.map((m) => m.from), ["user", "admin", "note"]);
  const kidView = await call(kid, "GET", `/support/ticket?id=${t.id}`);
  assert.deepEqual(kidView.data.messages.map((m) => m.from), ["user", "admin"]);

  assert.equal((await call(kid, "POST", "/support/reply", { ticketId: t.id, message: "Still happening!" })).status, 200);
  const row = db.prepare("SELECT status, admin_unread, last_from FROM support_tickets WHERE id = ?").get(t.id);
  assert.deepEqual({ ...row }, { status: "open", admin_unread: 1, last_from: "user" });

  assert.equal((await call(admin, "POST", "/admin/support/status", { ticketId: t.id, status: "resolved" })).status, 200);
  assert.equal((await call(admin, "POST", "/admin/support/status", { ticketId: t.id, status: "weird" })).status, 400);
  assert.equal((await call(kid, "POST", "/support/close", { ticketId: t.id })).status, 200);
  assert.equal(db.prepare("SELECT status FROM support_tickets WHERE id = ?").get(t.id).status, "resolved");
});

test("a signed-out visitor's reply goes to the address they gave", async () => {
  const t = db.prepare("SELECT id FROM support_tickets WHERE user_id IS NULL").get();
  sent.length = 0;
  const reply = await call(admin, "POST", "/admin/support/reply", { ticketId: t.id, message: "Your username is mum1", status: "resolved" });
  assert.equal(reply.data.status, "resolved");
  assert.equal(sent[0].to, "mum@example.com");
  const noMail = await call(admin, "POST", "/admin/support/reply", { ticketId: t.id, message: "ps", sendEmail: false });
  assert.equal(noMail.data.emailed, false);
  assert.equal(sent.length, 1);
});

test("admin can start a conversation with a customer; an unconfirmed address gets no email", async () => {
  sent.length = 0;
  const a = await call(admin, "POST", "/admin/support/new", { userId: "u2", subject: "Welcome", message: "Hi kid2!" });
  assert.equal(a.status, 200);
  assert.equal(a.data.emailed, false); // kid2 has no email on file
  assert.equal(sent.length, 0);
  assert.equal((await call(kid, "GET", "/support/mine")).data.unread, 0);
  assert.equal((await call(other, "GET", "/support/mine")).data.unread, 1);
  assert.equal((await call(admin, "POST", "/admin/support/new", { userId: "ghost", subject: "x", message: "y" })).status, 404);
});

test("customer file: note round-trips and clears; shows tickets and coins", async () => {
  assert.equal((await call(admin, "POST", "/admin/customer/note", { userId: "u1", note: "Parent prefers email" })).status, 200);
  db.prepare("INSERT INTO user_koala (user_id, coins, earned, streak, best_streak, updated_at) VALUES ('u1', 120, 300, 4, 9, 1)").run();
  const c = await call(admin, "GET", "/admin/customer?userId=u1");
  assert.equal(c.data.note, "Parent prefers email");
  assert.equal(c.data.user.username, "kid1");
  assert.equal(c.data.tickets.length, 1);
  assert.equal(c.data.koala.coins, 120);
  await call(admin, "POST", "/admin/customer/note", { userId: "u1", note: "" });
  assert.equal((await call(admin, "GET", "/admin/customer?userId=u1")).data.note, "");
  assert.equal((await call(admin, "GET", "/admin/customer?userId=ghost")).status, 404);
});

test("announcement: hidden until switched on, public once on", async () => {
  assert.equal((await call(null, "GET", "/announcement")).data.text, "");
  assert.equal((await call(admin, "POST", "/admin/announcement", { text: "", active: true })).status, 400);
  assert.equal((await call(admin, "POST", "/admin/announcement", { text: "Short break tonight 9pm", active: true })).status, 200);
  assert.equal((await call(null, "GET", "/announcement")).data.text, "Short break tonight 9pm");
  await call(admin, "POST", "/admin/announcement", { text: "Short break tonight 9pm", active: false });
  assert.equal((await call(null, "GET", "/announcement")).data.text, "");
});

test("overview counts what needs attention", async () => {
  const o = (await call(admin, "GET", "/admin/overview")).data;
  assert.equal(typeof o.openTickets, "number");
  assert.equal(o.emailConfigured, true);
  assert.equal(o.noEmail, 1);
  assert.equal(o.unverified, 1);
  // trend data for the Overview charts
  assert.equal(typeof o.today, "number");
  assert.equal(typeof o.totals.users, "number");
  assert.equal(typeof o.totals.codesUnused, "number");
  assert.ok(o.totals.ticketsByCategory && typeof o.totals.ticketsByCategory === "object");
  assert.ok(o.series.users && o.series.tickets && o.series.coins && o.series.codesMade);
  const open = (await call(admin, "GET", "/admin/overview?tz=-480")).data;
  assert.equal(open.today, Math.floor((Date.now() + 8 * 3600000) / 86400000));
});

test("writing in too often is rate limited", async () => {
  let last;
  for (let i = 0; i < 6; i++) last = await call(null, "POST", "/support/tickets", { message: "spam " + i, email: "flood@example.com" });
  assert.equal(last.status, 429);
});

test("deleting a ticket and deleting a customer clean up their messages", async () => {
  const t = db.prepare("SELECT id FROM support_tickets WHERE email = 'flood@example.com'").get();
  assert.equal((await call(admin, "POST", "/admin/support/delete", { ticketId: t.id })).status, 200);
  assert.equal(db.prepare("SELECT COUNT(*) c FROM support_messages WHERE ticket_id = ?").get(t.id).c, 0);
  await call(admin, "POST", "/admin/customer/note", { userId: "u1", note: "x" });
  assert.equal((await call(admin, "POST", "/admin/users/delete", { userId: "u1" })).status, 200);
  assert.equal(db.prepare("SELECT COUNT(*) c FROM support_tickets WHERE user_id = 'u1'").get().c, 0);
  assert.equal(db.prepare("SELECT COUNT(*) c FROM customer_notes WHERE user_id = 'u1'").get().c, 0);
});
