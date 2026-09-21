// Cloudflare Worker: serves the static app and a small API for user accounts
// and the shared word list. Passwords are never stored or compared in
// plaintext — only their PBKDF2 hash ever touches the database — and the
// legacy single ADMIN_PASSWORD Worker secret is used exactly once, to
// bootstrap the first "admin" account into the users table.

const SESSION_COOKIE = "ywp_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_WORDS_PER_REQUEST = 200;
const MAX_FIELD_LENGTH = 2000;
const PBKDF2_ITERATIONS = 100000;
const ADMIN_BOOTSTRAP_USERNAME = "admin";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) return handleApi(request, env, url);
    return env.ASSETS.fetch(request);
  },
};

/* ---------- helpers ---------- */

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

// Returns { id, role } for a valid session cookie, or null if there isn't
// one — the caller re-reads the user row from the DB when it needs anything
// beyond id/role (e.g. username), since those can't change mid-session.
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
  return { id: userId, role };
}

function sessionCookie(token, maxAgeSeconds) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}

function validUsername(username) {
  return typeof username === "string" && /^[A-Za-z0-9_]{3,20}$/.test(username);
}

function validPassword(password) {
  return typeof password === "string" && password.length >= 8 && password.length <= 200;
}

function genId() {
  return crypto.randomUUID();
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
    example: text(raw.example) || "",
    no_definition_en: raw.noDefinitionEn ? 1 : 0,
    no_definition_ko: raw.noDefinitionKo ? 1 : 0,
    source: text(raw.source),
    created_at: Number.isFinite(raw.createdAt) ? raw.createdAt : Date.now(),
  };
}

/* ---------- API ---------- */

async function handleApi(request, env, url) {
  const route = url.pathname.slice("/api".length);

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
    const row = await env.DB.prepare("SELECT id, username, role FROM users WHERE id = ?").bind(session.id).first();
    return json({ user: row || null });
  }

  if (route === "/auth/signup" && request.method === "POST") {
    if (!env.SESSION_SECRET) return json({ error: "server_not_configured" }, 500);
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: "bad_request" }, 400);
    }
    const username = typeof body?.username === "string" ? body.username.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const specialCode = typeof body?.specialCode === "string" ? body.specialCode.trim() : "";

    if (username.toLowerCase() === ADMIN_BOOTSTRAP_USERNAME) return json({ error: "reserved_username" }, 400);
    if (!validUsername(username)) return json({ error: "invalid_username" }, 400);
    if (!validPassword(password)) return json({ error: "invalid_password" }, 400);

    const existing = await env.DB.prepare("SELECT id FROM users WHERE username = ?").bind(username).first();
    if (existing) return json({ error: "username_taken" }, 409);

    let role = "free";
    let redeemedCode = null;
    if (specialCode) {
      const codeRow = await env.DB.prepare("SELECT code FROM special_codes WHERE code = ? AND redeemed_by IS NULL")
        .bind(specialCode)
        .first();
      if (!codeRow) return json({ error: "invalid_code" }, 400);
      role = "paid";
      redeemedCode = specialCode;
    }

    const { hash, salt } = await hashPassword(password);
    const id = genId();
    const now = Date.now();
    await env.DB.prepare(
      "INSERT INTO users (id, username, password_hash, password_salt, role, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    )
      .bind(id, username, hash, salt, role, now)
      .run();

    if (redeemedCode) {
      await env.DB.prepare("UPDATE special_codes SET redeemed_by = ?, redeemed_at = ? WHERE code = ?")
        .bind(id, now, redeemedCode)
        .run();
    }

    const token = await makeSessionToken(env, id, role);
    return json(
      { user: { id, username, role } },
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
    const username = typeof body?.username === "string" ? body.username.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    if (!username || !password) return json({ error: "invalid_credentials" }, 401);

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
    return json(
      { user: { id: user.id, username: user.username, role: user.role } },
      200,
      { "set-cookie": sessionCookie(token, SESSION_TTL_MS / 1000) }
    );
  }

  if (route === "/auth/logout" && request.method === "POST") {
    return json({ ok: true }, 200, { "set-cookie": sessionCookie("", 0) });
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
    await env.DB.batch(
      words.map((w) =>
        env.DB.prepare(
          `INSERT INTO shared_words
             (id, word, definition_en, definition_ko, level_en, level_ko, example,
              no_definition_en, no_definition_ko, source, owner_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             word = excluded.word,
             definition_en = excluded.definition_en,
             definition_ko = excluded.definition_ko,
             level_en = excluded.level_en,
             level_ko = excluded.level_ko,
             example = excluded.example,
             no_definition_en = excluded.no_definition_en,
             no_definition_ko = excluded.no_definition_ko,
             source = excluded.source,
             updated_at = excluded.updated_at
           WHERE shared_words.owner_id IS excluded.owner_id`
        ).bind(
          w.id,
          w.word,
          w.definition_en,
          w.definition_ko,
          w.level_en,
          w.level_ko,
          w.example,
          w.no_definition_en,
          w.no_definition_ko,
          w.source,
          ownerId,
          w.created_at,
          now
        )
      )
    );
    return json({ saved: words.length });
  }

  return json({ error: "not_found" }, 404);
}
