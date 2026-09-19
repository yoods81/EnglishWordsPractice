// Cloudflare Worker: serves the static app and a small API for the shared
// word list. The admin password lives in a Worker secret and is only ever
// compared here, so it never reaches the browser.

const SESSION_COOKIE = "ywp_admin";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_WORDS_PER_REQUEST = 200;
const MAX_FIELD_LENGTH = 2000;

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

async function makeSessionToken(env) {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  return `${expiresAt}.${await hmac(String(expiresAt), env.SESSION_SECRET)}`;
}

async function isAdminRequest(request, env) {
  const cookies = request.headers.get("cookie") || "";
  const match = cookies.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  if (!match) return false;
  const [expiresAt, signature] = decodeURIComponent(match[1]).split(".");
  if (!expiresAt || !signature) return false;
  if (Number(expiresAt) < Date.now()) return false;
  return safeEqual(signature, await hmac(expiresAt, env.SESSION_SECRET));
}

function sessionCookie(token, maxAgeSeconds) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
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
    const { results } = await env.DB.prepare(
      "SELECT * FROM shared_words ORDER BY created_at DESC"
    ).all();
    return json({ words: (results || []).map(rowToWord) });
  }

  if (route === "/admin/session" && request.method === "GET") {
    return json({ admin: await isAdminRequest(request, env) });
  }

  if (route === "/admin/login" && request.method === "POST") {
    if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET) {
      return json({ error: "server_not_configured" }, 500);
    }
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: "bad_request" }, 400);
    }
    if (!safeEqual(String(body && body.password), env.ADMIN_PASSWORD)) {
      return json({ error: "invalid_credentials" }, 401);
    }
    const token = await makeSessionToken(env);
    return json({ admin: true }, 200, { "set-cookie": sessionCookie(token, SESSION_TTL_MS / 1000) });
  }

  if (route === "/admin/logout" && request.method === "POST") {
    return json({ admin: false }, 200, { "set-cookie": sessionCookie("", 0) });
  }

  if (route === "/words" && (request.method === "PUT" || request.method === "DELETE")) {
    if (!(await isAdminRequest(request, env))) return json({ error: "unauthorized" }, 401);

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
        ids.map((id) => env.DB.prepare("DELETE FROM shared_words WHERE id = ?").bind(id))
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
              no_definition_en, no_definition_ko, source, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
             updated_at = excluded.updated_at`
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
          w.created_at,
          now
        )
      )
    );
    return json({ saved: words.length });
  }

  return json({ error: "not_found" }, 404);
}
