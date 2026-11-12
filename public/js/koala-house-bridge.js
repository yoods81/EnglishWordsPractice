/* Koala House link (stage 5 S4): window.KoalaHouseBridge for the new house in /house/?embed=1.
   The house app (koala-house-3d src/game/bridge.ts) uses only this object for saves, coins, learning and sound.
   Loaded only when the house is opened (S5) — with HOUSE3D=off this file is never fetched.

   KoalaHouseLink.prepare(ctx) -> Promise<bridge>   (reads the server save first, so bridge.save.load() can answer at once)
   ctx = {
     tier: "admin" | "paid" | "free" | "none",  lang: "ko" | "en",
     n: site child number 0-3 (free / guest always 0),  account: user id or null (guest),
     core: KoalaCore,  progress(): the site progress object (wallet = progress.koala),  saveProgress(),
     kv: { get, set, remove, keys } (localStorage),  fetch,
     config, badges: [badge ids], asmr: window.ASMR, siteEnv: { get, builtIn },
     close(), requestProfile(n), now()?
   }
   Saves (S3): signed in = server row (/api/house?p=n, rev-checked) + a device copy; guest = device copy only.
   Device copy key = the house app's deviceCopyKey: kh3:house:u:<account>:p<n> | kh3:house:guest:p0, value { json, rev, dirty }.
   Uploading happens here in the background; store() answers true once the device copy is written. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.KoalaHouseLink = api;
})(typeof self !== "undefined" ? self : this, function () {
  const SAVE_LIMIT = 200000;
  const RETRY = [5000, 15000, 60000, 120000, 300000];
  const REPORT_TYPES = ["saveSize", "saveFail", "saveFull", "configError"];

  const copyKey = (account, n) => (account ? `kh3:house:u:${encodeURIComponent(account)}:p${n}` : "kh3:house:guest:p0");
  const unlocked = (tier) => tier === "paid" || tier === "admin";

  async function prepare(ctx) {
    const n = unlocked(ctx.tier) ? ctx.n | 0 : 0;
    let server = null;   // { json, rev } — null when the account has no saved house yet (or a guest)
    if (ctx.account) {
      try {
        const r = await ctx.fetch(`/api/house?p=${n}`, { credentials: "same-origin", cache: "no-store" });
        if (r.ok) { const d = await r.json(); server = { json: d.json == null ? null : String(d.json), rev: Number(d.rev) || 0 }; }
        else if (r.status === 404) server = { json: null, rev: 0 };
        else server = undefined;   // could not ask: work from the device copy, upload later
      } catch (e) { server = undefined; }
    }
    return create(Object.assign({}, ctx, { n }), server);
  }

  // server: { json, rev } | null (no row) | undefined (could not read — offline)
  function create(ctx, server) {
    const n = ctx.n, account = ctx.account || null, kv = ctx.kv, key = copyKey(account, n);
    const now = ctx.now || (() => Date.now());
    let alive = true, closeHandler = null, retryT = 0, tries = 0, uploading = false, again = false, stopped = false;
    let serverRev = server ? server.rev : 0;

    const readCopy = () => { try { const v = JSON.parse(kv.get(key) || "null"); return v && typeof v === "object" ? v : null; } catch (e) { return null; } };
    const writeCopy = (v) => { try { kv.set(key, JSON.stringify(v)); return true; } catch (e) { return false; } };

    /* ---------- save ---------- */
    function load() {
      const d = readCopy();
      if (!account) return d && d.json != null ? d.json : null;
      if (d && d.dirty && (Number(d.rev) || 0) >= serverRev) return d.json;   // not uploaded yet and not older than the server
      if (server && server.json != null) { writeCopy({ json: server.json, rev: server.rev, dirty: false }); return server.json; }
      if (server === undefined && d) return d.json;   // offline: the last copy this device has
      // D6: a house made on this device as a guest becomes the new account's house (only when the account has none yet —
      // an account that already has a house opens that one, and the guest house stays on the device as it was)
      if (server && server.json == null && !d) {
        let g = null; try { g = JSON.parse(kv.get(copyKey(null, 0)) || "null"); } catch (e) { g = null; }
        if (g && typeof g.json === "string") { writeCopy({ json: g.json, rev: serverRev, dirty: true }); return g.json; }
      }
      return null;
    }
    const pending = () => { const d = readCopy(); return !!account && !!d && !!d.dirty; };
    function storeLocal(json) {
      if (!alive) return false;
      const d = readCopy();
      return writeCopy({ json, rev: d && d.rev != null ? d.rev : serverRev, dirty: !!account });
    }
    function store(json) {
      if (!alive) return false;
      if (typeof json !== "string") return false;
      if (!storeLocal(json)) return { ok: false, reason: "full", size: json.length };
      if (!account) return true;
      if (json.length > SAVE_LIMIT) { report({ type: "saveFull", size: json.length }); return true; }   // kept on the device; the server would say 413
      again = true; tries = 0; stopped = false; clearTimeout(retryT); upload();
      return true;
    }
    async function upload() {
      if (uploading || stopped || !account) return;
      const d = readCopy();
      if (!d || !d.dirty) return;
      uploading = true; again = false;
      let res = null;
      try {
        res = await ctx.fetch(`/api/house?p=${n}`, { method: "PUT", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ json: d.json, rev: Number(d.rev) || 0 }) });
      } catch (e) { res = null; }
      uploading = false;
      if (res && res.ok) {
        const r = await res.json().catch(() => ({}));
        serverRev = Number(r.rev) || serverRev + 1; server = { json: d.json, rev: serverRev };
        const cur = readCopy();
        // still the same text = uploaded; a newer store came in while we were sending = keep it dirty on the new rev
        writeCopy(cur && cur.json !== d.json ? Object.assign(cur, { rev: serverRev }) : { json: d.json, rev: serverRev, dirty: false });
        tries = 0;
        if (again || (cur && cur.json !== d.json)) upload();
        return;
      }
      if (res && res.status === 409) {
        // another device saved this child's house since this one loaded it: do not write over it. The device copy stays
        // (dirty, older rev) — the next open loads the newer server house; this copy is kept aside for a support look-up.
        const r = await res.json().catch(() => ({}));
        serverRev = Number(r.rev) || serverRev; if (r.json != null) server = { json: String(r.json), rev: serverRev };
        try { kv.set(key + ":conflict", JSON.stringify({ at: now(), json: d.json })); } catch (e) { /* no room */ }
        stopped = true; report({ type: "saveFail", reason: "rejected", size: d.json.length, tries: tries + 1 });
        return;
      }
      if (res && (res.status === 413 || res.status === 400)) { stopped = true; report({ type: res.status === 413 ? "saveFull" : "saveFail", reason: "rejected", size: d.json.length, tries: tries + 1 }); return; }
      if (res && (res.status === 401 || res.status === 403)) { stopped = true; return; }   // signed out / no longer premium for child 1-3: keep the copy
      // network or server error: try again later (5s, 15s, 1 min, 2 min, then every 5 min while the house is open)
      tries++;
      if (tries === 3) report({ type: "saveFail", reason: "network", size: d.json.length, tries });
      clearTimeout(retryT);
      retryT = setTimeout(upload, RETRY[Math.min(tries - 1, RETRY.length - 1)]);
    }
    const onOnline = () => { if (alive && pending()) { tries = 0; stopped = false; upload(); } };
    if (typeof addEventListener === "function") addEventListener("online", onOnline);

    /* ---------- wallet (the site Koala wallet of this child) ---------- */
    const unlimited = ctx.tier === "admin";
    const move = (kind) => (amount, op) => {
      if (!alive) return { ok: false, reason: "error" };
      const p = ctx.progress();
      const r = ctx.core.houseWallet(p, kind, amount, op, { unlimited, now: now() });
      if (r.ok && !r.dup) ctx.saveProgress();
      return r;
    };
    const wallet = {
      profile: n, unlimited,
      coins: () => (unlimited ? 0 : ctx.core.ensureKoala(ctx.progress()).coins),
      spend: move("spend"), refund: move("refund"), award: move("award"),
    };

    /* ---------- reports (counts only — no house content, name or e-mail) ---------- */
    function report(e) {
      if (!e || !REPORT_TYPES.includes(e.type)) return;
      const body = { type: e.type };
      ["level", "reason", "size", "tries", "count"].forEach((k) => { if (e[k] !== undefined) body[k] = e[k]; });
      try { ctx.fetch("/api/house/report", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(body), keepalive: true }).catch(() => {}); } catch (x) { /* never mind */ }
    }

    /* ---------- sound: the site's window.ASMR, plus unlock (first touch, and after coming back) ---------- */
    const a = ctx.asmr;
    const asmr = a ? {
      play: (id) => a.play(id), stop: () => a.stop(), toggle: (id) => a.toggle(id), has: (id) => a.has(id),
      isPlaying: (id) => (a.isPlaying ? a.isPlaying(id) : false), onChange: (f) => (a.onChange ? a.onChange(f) : () => {}),
      unlock: () => { if (a.unlock) a.unlock(); },
    } : undefined;

    const bridge = {
      tier: ctx.tier, lang: ctx.lang, profile: { n },
      save: { profile: n, load, store, storeLocal, pending },
      wallet,
      config: ctx.config, badges: (ctx.badges || []).slice(),
      siteEnv: ctx.siteEnv,
      report,
      onCloseRequest(fn) { closeHandler = typeof fn === "function" ? fn : null; },
      requestProfile(k) { if (alive && ctx.requestProfile) ctx.requestProfile(k | 0); },
      close() {
        if (!alive) return;
        // last chance to send what is not uploaded yet (the house app has already written it with storeLocal)
        if (account && pending() && !stopped) { const d = readCopy(); try { ctx.fetch(`/api/house?p=${n}`, { method: "PUT", credentials: "same-origin", keepalive: true, headers: { "content-type": "application/json" }, body: JSON.stringify({ json: d.json, rev: Number(d.rev) || 0 }) }).then((r) => r && r.ok && r.json()).then((r) => { if (r && r.rev) { const cur = readCopy(); if (cur && cur.json === d.json) writeCopy({ json: d.json, rev: r.rev, dirty: false }); } }).catch(() => {}); } catch (e) { /* offline */ } }
        alive = false; clearTimeout(retryT);
        if (typeof removeEventListener === "function") removeEventListener("online", onOnline);
        if (a) try { a.stop(); } catch (e) { /* */ }
        if (ctx.close) ctx.close();
      },
      // site side (S5): back button / child switch -> the house's own close (the same as its '‹ Close'), or close at once
      requestClose() { if (!alive) return; if (closeHandler) { try { closeHandler(); return; } catch (e) { /* fall through */ } } bridge.close(); },
      get alive() { return alive; },
    };
    if (asmr) bridge.asmr = asmr;
    if (ctx.moving) bridge.moving = ctx.moving;   // S6: only when MOVE is on (the site decides)
    return bridge;
  }

  return { prepare, create, copyKey, SAVE_LIMIT };
});
