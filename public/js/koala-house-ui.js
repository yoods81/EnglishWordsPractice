// Koala Study Mate — My Koala House: screens and interaction.
// KoalaHouse.open({ L, coins, unlimited, spend, onClose })
//   L(en, ko)        -> the text in the current language
//   coins()          -> current Koala Coins
//   spend(n, why)    -> true if the coins were taken (and saved)
(function () {
  "use strict";
  const H = window.KoalaHouse;
  if (!H) return;
  const NS = "http://www.w3.org/2000/svg";

  // The 3D-style koala is a stack of pictures sharing one 680x1024 canvas.
  const KBOX = { base: [64, 222, 617, 968], hoodie: [122, 528, 562, 819], backpack: [131, 545, 560, 832], scarf: [185, 531, 497, 780], glasses: [162, 362, 520, 500], bushhat: [108, 188, 574, 441], partyhat: [259, 100, 422, 290], crown: [249, 190, 433, 295] };
  const KORDER = ["backpack", "hoodie", "scarf", "glasses", "bushhat", "partyhat", "crown"];
  const KSLOT = { hat: ["bushhat", "partyhat", "crown"], face: ["glasses"], neck: ["scarf"], body: ["hoodie"], back: ["backpack"] };
  const KNAME = { bushhat: ["부시햇", "Bush Hat"], partyhat: ["파티 모자", "Party Hat"], crown: ["왕관", "Crown"], glasses: ["안경", "Glasses"], scarf: ["목도리", "Scarf"], hoodie: ["후드티", "Hoodie"], backpack: ["배낭", "Backpack"] };
  const kimg = (n) => `/img/koala/${n}.webp`;

  let ses = null;

  /* ------------------------------ small helpers ------------------------------ */
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const reduced = () => !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const T = (ko, en) => ses.opts.L(en, ko);
  const nm = (d) => T(d.name[0], d.name[1]);
  const COIN = '<span class="kh-coin" aria-hidden="true"></span>';

  const roomDef = (id) => (id === "yard" ? H.YARD : H.ROOMS[id]);
  const roomState = (id) => (id === "yard" ? ses.S.yard : ses.S.rooms[id]);
  const curRoom = () => roomDef(ses.roomId);
  const curState = () => roomState(ses.roomId);
  const save = () => H.persist(ses.S);
  const ownedItem = (d) => d.price === 0 || !!ses.S.owned[d.id];

  function coinsText() { return ses.opts.unlimited ? "∞" : Number(ses.opts.coins()).toLocaleString(); }
  function refreshCoins() { ses.root.querySelectorAll("[data-kh-coins]").forEach((e) => { e.textContent = coinsText(); }); }
  function toast(msg, bad) {
    const t = ses.root.querySelector(".kh-toast");
    if (!t) return;
    t.textContent = msg; t.className = "kh-toast on" + (bad ? " bad" : "");
    clearTimeout(ses.toastT);
    ses.toastT = setTimeout(() => { t.className = "kh-toast"; }, 2200);
  }

  /* ------------------------------ open / close ------------------------------ */
  function open(opts) {
    if (ses) close();
    const S = H.load();
    ses = { opts, S, screen: "plan", roomId: S.cur || "study", edit: true, sel: null, tab: "furniture", drag: null, koala: { c: 2, r: 3, face: 1, path: [], wait: 1.2, bob: 0 }, root: null };
    const root = el("div", "kh-app");
    root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true"); root.setAttribute("aria-label", T("내 집", "My House"));
    document.body.appendChild(root);
    document.body.classList.add("kh-open");
    ses.root = root;
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    renderPlan(true);
    ses.last = performance.now();
    ses.raf = requestAnimationFrame(loop);
    fetch("/img/house/manifest.json").then((r) => (r.ok ? r.json() : {})).then((m) => { if (ses && m && Object.keys(m).length) { H.setManifest(m); if (ses.screen === "room") drawScene(); else renderPlan(); } }).catch(() => {});
  }
  function close() {
    if (!ses) return;
    cancelAnimationFrame(ses.raf);
    document.removeEventListener("keydown", onKey);
    window.removeEventListener("resize", onResize);
    ses.root.remove();
    document.body.classList.remove("kh-open");
    const cb = ses.opts.onClose;
    ses = null;
    if (cb) cb();
  }
  function onKey(e) {
    if (e.key !== "Escape" || !ses) return;
    if (ses.modal) { closeModal(); return; }
    if (ses.screen === "room") backToPlan(); else close();
  }
  function onResize() { if (ses && ses.screen === "plan") placeMarker(false); }

  /* ------------------------------ modal ------------------------------ */
  function closeModal() { if (ses.modal) { ses.modal.remove(); ses.modal = null; } }
  function modal(html, wire) {
    closeModal();
    const m = el("div", "kh-modal", `<div class="kh-sheet" role="alertdialog" aria-modal="true">${html}</div>`);
    m.addEventListener("click", (e) => { if (e.target === m) closeModal(); });
    ses.root.appendChild(m);
    ses.modal = m;
    if (wire) wire(m);
    const b = m.querySelector("[data-primary]"); if (b) b.focus();
  }
  // buy something: returns via cb(true) after the coins were spent
  function buy(title, picHtml, price, why, cb) {
    const afford = ses.opts.unlimited || ses.opts.coins() >= price;
    modal(`<h2>${esc(title)}</h2><div class="kh-buy-pic">${picHtml}</div><p class="kh-buy-price">${COIN} <b>${price}</b></p>
      <p class="kh-buy-note">${afford ? T("코인으로 살까요?", "Buy it with your coins?") : T(`코인이 ${price - ses.opts.coins()}개 모자라요. 공부하고 코인을 모아 봐요!`, `You need ${price - ses.opts.coins()} more coins. Keep studying to earn them!`)}</p>
      <div class="kh-btns"><button type="button" class="kh-btn" data-primary data-yes ${afford ? "" : "disabled"}>${T("살래요", "Buy")}</button><button type="button" class="kh-btn alt" data-no>${T("닫기", "Close")}</button></div>`, (m) => {
      m.querySelector("[data-no]").onclick = closeModal;
      const y = m.querySelector("[data-yes]");
      y.onclick = () => { if (!ses.opts.spend(price, why)) { toast(T("코인이 모자라요", "Not enough coins"), true); closeModal(); return; } closeModal(); refreshCoins(); cb(true); };
    });
  }

  /* ------------------------------ floor plan ------------------------------ */
  function renderPlan(first) {
    ses.screen = "plan"; ses.sel = null;
    const S = ses.S;
    const card = (id) => {
      const r = roomDef(id), own = id === "yard" || !!S.owned_rooms[id];
      const st = id === "yard" ? S.yard : S.rooms[id] || { wall: r.wall, floor: r.floor, items: [] };
      const name = T(r.ko, r.en);
      return `<button type="button" class="kh-card${own ? "" : " locked"}${ses.justBuilt === id ? " pop" : ""}" data-room="${id}" aria-label="${esc(name)}${own ? "" : ", " + T("잠김", "locked") + " " + r.price}">
        <span class="kh-card-pic">${H.roomSvg(r, st, {})}</span><span class="kh-card-name">${id === "yard" ? "🚪 " : ""}${esc(name)}</span>
        ${own ? "" : `<span class="kh-lock"><span class="kh-lock-ic" aria-hidden="true">🔒</span>${COIN}<b>${r.price}</b></span>`}</button>`;
    };
    ses.root.innerHTML = `<div class="kh-plan-screen">
      <div class="kh-top"><button type="button" class="kh-round red" data-close aria-label="${T("닫기", "Close")}">✕</button><h2 class="kh-title">${T("내 집", "My House")}</h2><span class="kh-sp"></span><span class="kh-coins">${COIN}<b data-kh-coins>${coinsText()}</b></span></div>
      <p class="kh-hint">${T("방을 누르면 코알라가 들어가요. 잠긴 방은 코인으로 지을 수 있어요. 🚪 입구에서는 마당과 집 외관을 꾸며요.", "Tap a room to walk in. Locked rooms can be built with coins. The 🚪 entrance leads to the yard and the front of the house.")}</p>
      <div class="kh-plan" id="kh-plan"><div class="kh-plan-grid">${H.ROOM_ORDER.map(card).join("")}${card("yard")}</div>
        <img class="kh-marker" id="kh-marker" src="${kimg("base")}" alt="${T("코알라", "Koala")}" draggable="false"></div></div>`;
    ses.justBuilt = null;
    ses.root.querySelector("[data-close]").onclick = close;
    ses.root.querySelectorAll("[data-room]").forEach((b) => { b.onclick = () => pickRoom(b.dataset.room); });
    requestAnimationFrame(() => { placeMarker(false); });
    const imgm = ses.root.querySelector("#kh-marker"); imgm.addEventListener("load", () => placeMarker(false));
  }
  function placeMarker(animate, toId) {
    const m = ses.root.querySelector("#kh-marker"), plan = ses.root.querySelector("#kh-plan");
    if (!m || !plan) return;
    const id = toId || ses.roomId, c = plan.querySelector(`[data-room="${id}"]`);
    if (!c) return;
    const pr = plan.getBoundingClientRect(), cr = c.getBoundingClientRect();
    m.style.transition = animate && !reduced() ? "left .7s ease-in-out, top .7s ease-in-out" : "none";
    m.style.left = (cr.left - pr.left + plan.scrollLeft + cr.width * 0.5) + "px";
    m.style.top = (cr.top - pr.top + plan.scrollTop + cr.height * 0.78) + "px";
    m.classList.toggle("walk", !!animate && !reduced());
  }
  function pickRoom(id) {
    const r = roomDef(id), own = id === "yard" || !!ses.S.owned_rooms[id];
    if (!own) {
      buy(T(r.ko, r.en) + T(" 짓기", " — build"), `<span class="kh-card-pic">${H.roomSvg(r, { wall: r.wall, floor: r.floor, items: [] }, {})}</span>`, r.price, "room:" + id, () => {
        ses.S.owned_rooms[id] = 1; ses.S.rooms[id] = { wall: r.wall, floor: r.floor, items: [] }; ses.justBuilt = id; save(); renderPlan(); toast(T("새 방이 생겼어요!", "A new room!"));
      });
      return;
    }
    placeMarker(true, id);
    setTimeout(() => { if (ses && ses.screen === "plan") openRoom(id); }, reduced() ? 0 : 760);
  }
  function backToPlan() { renderPlan(); }

  /* ------------------------------ room screen ------------------------------ */
  function tabsFor(yard) {
    return yard
      ? [["outdoor", "🌳", T("정원", "Garden")], ["plant", "🪴", T("식물", "Plants")], ["house", "🏠", T("집 외관", "House")], ["style", "🎨", T("잔디", "Lawn")], ["koala", "🐨", T("코알라", "Koala")]]
      : [["furniture", "🛋️", T("가구", "Furniture")], ["rug", "🟦", T("러그", "Rugs")], ["plant", "🪴", T("식물", "Plants")], ["small", "🧸", T("소품", "Props")], ["wall", "🖼️", T("벽장식", "Wall")], ["style", "🎨", T("벽·바닥", "Style")], ["koala", "🐨", T("코알라", "Koala")]];
  }
  function openRoom(id) {
    ses.screen = "room"; ses.roomId = id; ses.S.cur = id; ses.sel = null; ses.edit = true;
    const yard = id === "yard";
    ses.tab = yard ? "outdoor" : "furniture";
    if (!yard) { const st = ses.S.rooms[id]; if (!st) ses.S.rooms[id] = { wall: H.ROOMS[id].wall, floor: H.ROOMS[id].floor, items: [] }; }
    save();
    ses.root.innerHTML = `<div class="kh-room-screen">
      <div class="kh-stage" id="kh-stage">
        <div class="kh-scene" id="kh-scene"></div>
        <div class="kh-top over"><button type="button" class="kh-round red" data-back aria-label="${T("집 전체 보기", "Back to the floor plan")}">🚪</button>
          <h2 class="kh-title pill">${esc(T(curRoom().ko, curRoom().en))}</h2><span class="kh-sp"></span>
          <span class="kh-coins">${COIN}<b data-kh-coins>${coinsText()}</b></span>
          <button type="button" class="kh-round orange" data-edit aria-pressed="true" aria-label="${T("꾸미기 끝내기", "Finish decorating")}">✔</button></div>
        <div class="kh-menu" id="kh-menu" hidden></div><p class="kh-toast" role="status"></p></div>
      <aside class="kh-panel" id="kh-panel" aria-label="${T("아이템", "Items")}"></aside></div>`;
    ses.root.querySelector("[data-back]").onclick = backToPlan;
    ses.root.querySelector("[data-edit]").onclick = toggleEdit;
    attachStage();
    placeKoalaFree();
    drawScene();
    drawPanel();
  }
  function toggleEdit() {
    ses.edit = !ses.edit; ses.sel = null;
    const b = ses.root.querySelector("[data-edit]");
    b.textContent = ses.edit ? "✔" : "✏️"; b.setAttribute("aria-pressed", String(ses.edit));
    b.setAttribute("aria-label", ses.edit ? T("꾸미기 끝내기", "Finish decorating") : T("꾸미기", "Decorate"));
    ses.root.querySelector(".kh-room-screen").classList.toggle("viewing", !ses.edit);
    hideMenu();
    if (ses.edit) { ses.koala.path = []; placeKoalaFree(); } else ses.koala.wait = 0.6;
    drawScene();
  }

  /* ---- koala ---- */
  function koalaMarkup() {
    const worn = ses.S.worn || {};
    const names = ["base"].concat(KORDER.filter((n) => Object.values(worn).includes(n)));
    const imgs = names.map((n) => { const b = KBOX[n]; return `<image href="${kimg(n)}" x="${b[0]}" y="${b[1]}" width="${b[2] - b[0]}" height="${b[3] - b[1]}"/>`; }).join("");
    return `<g class="kh-koala" data-k="0"><ellipse class="kh-kshadow" cx="0" cy="2" rx="24" ry="8" fill="#000" opacity=".16"/><g class="kh-kbody"><g class="kh-kflip"><svg x="-27" y="-82" width="54" height="85" viewBox="64 100 553 868" overflow="visible">${imgs}</svg></g></g></g>`;
  }
  function koalaCellFree(c, r) {
    const room = curRoom(), st = curState();
    if (c < 0 || r < 0 || c >= room.C || r >= room.R) return false;
    if (room.kind === "yard" && r < 4) return false;
    return !H.occupancy(st.items)[c + "," + r];
  }
  function placeKoalaFree() {
    const k = ses.koala, room = curRoom();
    if (koalaCellFree(Math.round(k.c), Math.round(k.r))) { k.c = Math.round(k.c); k.r = Math.round(k.r); return; }
    const cells = H.freeCells(room, curState());
    if (!cells.length) return;
    cells.sort((a, b) => Math.hypot(a[0] - k.c, a[1] - k.r) - Math.hypot(b[0] - k.c, b[1] - k.r));
    k.c = cells[0][0]; k.r = cells[0][1]; k.path = [];
  }
  function updateKoala() {
    const g = ses.root.querySelector(".kh-koala");
    if (!g) return;
    const k = ses.koala, [x, y] = H.proj(k.c + 0.5, k.r + 0.5, 0);
    g.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    const body = g.querySelector(".kh-kbody"), fl = g.querySelector(".kh-kflip");
    body.setAttribute("transform", `translate(0 ${(-Math.abs(Math.sin(k.bob)) * 4).toFixed(1)})`);
    fl.setAttribute("transform", `scale(${k.face} 1)`);
    const key = k.c + k.r + 2.02;
    g.dataset.k = key;
    const layer = ses.root.querySelector(".kh-items");
    let before = null;
    for (const ch of layer.children) { if (ch === g) continue; if (parseFloat(ch.dataset.k) > key) { before = ch; break; } }
    if (g.nextSibling !== before || g.parentNode !== layer) layer.insertBefore(g, before);
  }
  function bfs(from, to) {
    const room = curRoom(), key = (c, r) => c + "," + r, seen = { [key(from[0], from[1])]: null }, q = [from];
    while (q.length) {
      const [c, r] = q.shift();
      if (c === to[0] && r === to[1]) { const p = []; let k = key(c, r); while (seen[k] !== null) { const [a, b] = k.split(",").map(Number); p.unshift([a, b]); k = seen[k]; } return p; }
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dc, dr]) => {
        const nc = c + dc, nr = r + dr, nk = key(nc, nr);
        if (nc < 0 || nr < 0 || nc >= room.C || nr >= room.R || nk in seen || !koalaCellFree(nc, nr)) return;
        seen[nk] = key(c, r); q.push([nc, nr]);
      });
    }
    return null;
  }
  function loop(ts) {
    if (!ses) return;
    const dt = Math.min(0.05, (ts - ses.last) / 1000); ses.last = ts;
    if (ses.screen === "room" && !ses.edit && !ses.drag && !reduced()) {
      const k = ses.koala;
      if (k.path.length) {
        const [tc, tr] = k.path[0], dc = tc - k.c, dr = tr - k.r, d = Math.hypot(dc, dr), step = 1.7 * dt;
        k.bob += dt * 11;
        if (d <= step) { k.c = tc; k.r = tr; k.path.shift(); if (!k.path.length) k.wait = 1.5 + Math.random() * 3; }
        else { k.c += (dc / d) * step; k.r += (dr / d) * step; }
        if (dc - dr !== 0) k.face = dc - dr > 0 ? 1 : -1;
        updateKoala();
      } else {
        k.wait -= dt; k.bob = 0;
        if (k.wait <= 0) {
          const cells = H.freeCells(curRoom(), curState());
          const from = [Math.round(k.c), Math.round(k.r)];
          for (let i = 0; i < 6 && !k.path.length && cells.length; i++) { const t = cells[Math.floor(Math.random() * cells.length)]; if (t[0] !== from[0] || t[1] !== from[1]) { const p = bfs(from, t); if (p && p.length) k.path = p; } }
          k.wait = 1;
        }
        updateKoala();
      }
    }
    ses.raf = requestAnimationFrame(loop);
  }

  /* ---- scene drawing ---- */
  function drawScene() {
    const room = curRoom(), st = curState();
    ses.root.querySelector("#kh-scene").innerHTML = H.roomSvg(room, st, { label: T(room.ko, room.en), extra: '<g class="kh-ghost"></g>' });
    const svg = ses.root.querySelector(".kh-room-svg");
    const layer = svg.querySelector(".kh-items");
    const tmp = document.createElementNS(NS, "svg"); tmp.innerHTML = koalaMarkup();
    layer.appendChild(tmp.firstChild);
    updateKoala();
    applySel();
  }
  function applySel() {
    ses.root.querySelectorAll(".kh-it.sel").forEach((e) => e.classList.remove("sel"));
    if (ses.sel) { const e = ses.root.querySelector(`.kh-it[data-uid="${ses.sel}"]`); if (e) e.classList.add("sel"); }
  }

  /* ---- coordinates ---- */
  function toScene(ev) {
    const svg = ses.root.querySelector(".kh-room-svg"), pt = svg.createSVGPoint();
    pt.x = ev.clientX; pt.y = ev.clientY;
    const m = svg.getScreenCTM();
    return m ? pt.matrixTransform(m.inverse()) : { x: 0, y: 0 };
  }
  const cellOf = (sx, sy) => ({ c: (sx / H.TW * 2 + sy / H.TH * 2) / 2, r: (sy / H.TH * 2 - sx / H.TW * 2) / 2 });

  /* ---- wall pieces ---- */
  const wallLen = (room, side) => (side === "L" ? room.R : room.C);
  function wallOverlap(st, piece, skipUid) {
    const d = H.D[piece.id];
    return st.items.some((o) => {
      const od = H.D[o.id];
      if (!od || !od.wall || o.uid === skipUid || o.side !== piece.side) return false;
      return piece.u < o.u + od.uw - 0.01 && o.u < piece.u + d.uw - 0.01 && piece.h < (o.h || od.defH) + od.vh - 1 && (o.h || od.defH) < piece.h + d.vh - 1;
    });
  }
  function wallTarget(sx, sy, d, room) {
    const side = sx < 0 ? "L" : "R", u = Math.abs(sx) / 32, floorY = 16 * u, hh = floorY - sy;
    let uu = Math.round((u - d.uw / 2) * 4) / 4, h = Math.round((hh - d.vh / 2) / 4) * 4;
    const len = wallLen(room, side);
    uu = Math.max(0, Math.min(len - d.uw, uu)); h = Math.max(4, Math.min(H.WALL_H - d.vh - 6, h));
    return { side, u: uu, h };
  }

  /* ---- placing / moving ---- */
  function recalcZ(st) {
    st.items.forEach((i) => {
      const d = H.D[i.id]; if (!d || !d.stack) return;
      const occ = H.occupancy(st.items, i.uid)[H.cellsOf(i)[0]] || [];
      const top = occ.find((o) => H.D[o.id].topH && !H.D[o.id].stack);
      i.z = top ? H.D[top.id].topH : 0;
    });
  }
  function autoPlace(id) {
    const room = curRoom(), st = curState(), d = H.D[id];
    if (d.wall) {
      const cands = [];
      ["R", "L"].forEach((side) => { for (let u = 0.5; u <= wallLen(room, side) - d.uw + 1e-6; u += 0.5) cands.push({ side, u, h: d.defH }); });
      cands.sort((a, b) => Math.abs(a.u + d.uw / 2 - wallLen(room, a.side) / 2) - Math.abs(b.u + d.uw / 2 - wallLen(room, b.side) / 2));
      const p = cands.find((c) => !wallOverlap(st, Object.assign({ id }, c)));
      return p ? Object.assign({ uid: H.newUid(), id }, p) : null;
    }
    const cells = [];
    for (let c = 0; c < room.C; c++) for (let r = 0; r < room.R; r++) cells.push([c, r]);
    cells.sort((a, b) => Math.hypot(a[0] - room.C / 2, a[1] - room.R / 2) - Math.hypot(b[0] - room.C / 2, b[1] - room.R / 2));
    let best = null;
    for (const m of [0, 1]) {
      for (const [c, r] of cells) {
        const piece = { uid: H.newUid(), id, c, r, m, z: 0 }, res = H.canPlace(room, st, piece);
        if (res.ok) { piece.z = res.z; if (d.stack && res.z > 0) return piece; if (!best) best = piece; }
      }
      if (best && !d.stack) break;
    }
    return best;
  }
  function placeNew(id, piece) {
    const st = curState();
    if (!piece) piece = autoPlace(id);
    if (!piece) { toast(T("자리가 없어요. 아이템을 치워 보세요.", "No room left. Remove something first."), true); return null; }
    st.items.push(piece); recalcZ(st);
    ses.sel = piece.uid; save(); drawScene(); showMenu();
    return piece;
  }

  /* ---- selection menu ---- */
  function hideMenu() { const m = ses.root.querySelector("#kh-menu"); if (m) m.hidden = true; }
  function showMenu() {
    const m = ses.root.querySelector("#kh-menu");
    if (!m) return;
    if (!ses.sel || !ses.edit) { m.hidden = true; return; }
    const target = ses.root.querySelector(`.kh-it[data-uid="${ses.sel}"]`);
    const it = curState().items.find((x) => x.uid === ses.sel);
    if (!target || !it) { m.hidden = true; return; }
    const d = H.D[it.id];
    m.innerHTML = `<b class="kh-menu-name">${esc(nm(d))}</b>${d.wall ? "" : `<button type="button" data-act="rot" aria-label="${T("돌리기", "Rotate")}">🔄</button>`}<button type="button" data-act="del" aria-label="${T("치우기", "Remove")}">🗑️</button><button type="button" data-act="x" aria-label="${T("닫기", "Close")}">✕</button>`;
    m.hidden = false;
    const sr = ses.root.querySelector("#kh-stage").getBoundingClientRect(), tr = target.getBoundingClientRect();
    const w = m.offsetWidth, h = m.offsetHeight;
    let x = tr.left + tr.width / 2 - sr.left - w / 2, y = tr.top - sr.top - h - 8;
    if (y < 56) y = tr.bottom - sr.top + 8;
    x = Math.max(6, Math.min(sr.width - w - 6, x)); y = Math.max(56, Math.min(sr.height - h - 6, y));
    m.style.left = x + "px"; m.style.top = y + "px";
    m.querySelectorAll("[data-act]").forEach((b) => { b.onclick = (e) => { e.stopPropagation(); menuAct(b.dataset.act); }; });
  }
  function menuAct(act) {
    const st = curState(), it = st.items.find((x) => x.uid === ses.sel);
    if (act === "x") { ses.sel = null; applySel(); hideMenu(); return; }
    if (!it) return;
    if (act === "del") { st.items = st.items.filter((x) => x.uid !== it.uid); ses.sel = null; recalcZ(st); save(); drawScene(); hideMenu(); placeKoalaFree(); updateKoala(); return; }
    if (act === "rot") {
      const room = curRoom(), want = Object.assign({}, it, { m: it.m ? 0 : 1 });
      let ok = null;
      for (const [dc, dr] of [[0, 0], [-1, 0], [0, -1], [-1, -1], [1, 0], [0, 1]]) {
        const p = Object.assign({}, want, { c: want.c + dc, r: want.r + dr }), res = H.canPlace(room, st, p, it.uid);
        if (res.ok) { p.z = res.z; ok = p; break; }
      }
      if (!ok) { toast(T("여기선 돌릴 수 없어요", "No space to turn it here"), true); return; }
      Object.assign(it, ok); recalcZ(st); save(); drawScene(); showMenu();
    }
  }

  /* ---- dragging ---- */
  function ghostFor(drag) {
    const room = curRoom(), p = drag.piece, d = H.D[p.id];
    if (d.wall) return H.wallItemSvg(p);
    const f = H.footprint(p), c0 = Math.round(p.c), r0 = Math.round(p.r);
    const quad = [H.proj(c0, r0, 0), H.proj(c0 + f.w, r0, 0), H.proj(c0 + f.w, r0 + f.d, 0), H.proj(c0, r0 + f.d, 0)].map((q) => q.map((v) => v.toFixed(1)).join(",")).join(" ");
    const q = Object.assign({}, p, { c: c0, r: r0 });
    if (drag.koala) return `<polygon class="kh-foot ${drag.valid ? "ok" : "bad"}" points="${quad}"/>`;
    return `<polygon class="kh-foot ${drag.valid ? "ok" : "bad"}" points="${quad}"/>` + H.floorItemSvg(q) + (drag.riders || []).map((rd) => H.floorItemSvg(Object.assign({}, rd.it, { c: c0 + rd.dc, r: r0 + rd.dr }))).join("");
  }
  function updateDrag(ev) {
    const drag = ses.drag, room = curRoom(), st = curState(), d = H.D[drag.piece.id], p = toScene(ev);
    if (d.wall) {
      const t = wallTarget(p.x, p.y, d, room);
      Object.assign(drag.piece, t);
      drag.valid = !wallOverlap(st, drag.piece, drag.uid);
    } else {
      const g = cellOf(p.x, p.y + (drag.fromPanel ? 20 : 0)), f = H.footprint(drag.piece);
      drag.piece.c = Math.round(drag.fromPanel ? g.c - f.w / 2 : g.c - drag.grab.c);
      drag.piece.r = Math.round(drag.fromPanel ? g.r - f.d / 2 : g.r - drag.grab.r);
      if (drag.koala) drag.valid = koalaCellFree(Math.round(drag.piece.c), Math.round(drag.piece.r));
      else { const res = H.canPlace(room, st, drag.piece, drag.uid); drag.valid = res.ok; if (res.ok) drag.piece.z = res.z; }
    }
    const gh = ses.root.querySelector(".kh-ghost");
    if (gh) gh.innerHTML = ghostFor(drag);
    const sr = ses.root.querySelector("#kh-stage").getBoundingClientRect();
    drag.overStage = ev.clientX >= sr.left && ev.clientX <= sr.right && ev.clientY >= sr.top && ev.clientY <= sr.bottom;
    ses.root.classList.toggle("kh-trash", !!drag.uid && !drag.overStage);
  }
  function endDrag(ev, cancel) {
    const drag = ses.drag; if (!drag) return;
    window.removeEventListener("pointermove", drag.mv); window.removeEventListener("pointerup", drag.up); window.removeEventListener("pointercancel", drag.cn);
    ses.drag = null; ses.root.classList.remove("kh-trash");
    const gh = ses.root.querySelector(".kh-ghost"); if (gh) gh.innerHTML = "";
    if (drag.ghostEl) drag.ghostEl.remove();
    ses.root.querySelectorAll(".kh-dim").forEach((e) => e.classList.remove("kh-dim"));
    const st = curState();
    if (cancel) { drawScene(); return; }
    if (!drag.moved) { // a tap
      if (drag.uid) { ses.sel = drag.uid; applySel(); showMenu(); }
      else if (drag.koala) { const g = ses.root.querySelector(".kh-kbody"); if (g) { g.classList.remove("hop"); void g.getBoundingClientRect(); g.classList.add("hop"); } }
      return;
    }
    if (drag.koala) {
      const c = Math.round(drag.piece.c), r = Math.round(drag.piece.r);
      if (drag.overStage && koalaCellFree(c, r)) { ses.koala.c = c; ses.koala.r = r; ses.koala.path = []; }
      updateKoala(); return;
    }
    if (drag.uid) { // moving a placed piece
      if (!drag.overStage) { st.items = st.items.filter((x) => x.uid !== drag.uid); (drag.riders || []).forEach((rd) => { const it = st.items.find((x) => x.uid === rd.it.uid); if (it) it.z = 0; }); ses.sel = null; recalcZ(st); save(); drawScene(); hideMenu(); toast(T("치웠어요", "Put away")); return; }
      if (!drag.valid) { toast(T("여기엔 놓을 수 없어요", "Can't go there"), true); drawScene(); showMenu(); return; }
      const it = st.items.find((x) => x.uid === drag.uid);
      const pc = Math.round(drag.piece.c), pr = Math.round(drag.piece.r);
      if (H.D[it.id].wall) Object.assign(it, { side: drag.piece.side, u: drag.piece.u, h: drag.piece.h });
      else { it.c = pc; it.r = pr; it.z = drag.piece.z || 0; (drag.riders || []).forEach((rd) => { const r2 = st.items.find((x) => x.uid === rd.it.uid); if (r2) { r2.c = pc + rd.dc; r2.r = pr + rd.dr; } }); }
      recalcZ(st); save(); drawScene(); showMenu(); placeKoalaFree(); updateKoala();
      return;
    }
    // new piece dropped from the panel
    if (!drag.overStage) return;
    if (!drag.valid) { toast(T("여기엔 놓을 수 없어요", "Can't go there"), true); return; }
    const piece = Object.assign({ uid: H.newUid() }, drag.piece);
    if (!H.D[piece.id].wall) { piece.c = Math.round(piece.c); piece.r = Math.round(piece.r); }
    placeNew(piece.id, piece); placeKoalaFree(); updateKoala();
  }
  function beginDrag(ev, init) {
    if (ses.drag) return;
    const drag = Object.assign({ moved: false, valid: true, pid: ev.pointerId, sx: ev.clientX, sy: ev.clientY }, init);
    ses.drag = drag;
    drag.mv = (e) => {
      if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 6) return;
      if (!drag.moved) { drag.moved = true; if (drag.uid) ses.root.querySelectorAll(`.kh-it[data-uid="${drag.uid}"]`).forEach((x) => x.classList.add("kh-dim")); (drag.riders || []).forEach((rd) => ses.root.querySelectorAll(`.kh-it[data-uid="${rd.it.uid}"]`).forEach((x) => x.classList.add("kh-dim"))); if (drag.koala) { const k = ses.root.querySelector(".kh-koala"); if (k) k.classList.add("kh-dim"); } hideMenu(); }
      if (drag.fromPanel && !drag.ghostEl) { drag.ghostEl = el("div", "kh-ghost-card", H.thumbSvg(drag.piece.id)); document.body.appendChild(drag.ghostEl); }
      if (drag.ghostEl) { drag.ghostEl.style.left = e.clientX + "px"; drag.ghostEl.style.top = e.clientY + "px"; drag.ghostEl.style.opacity = drag.overStage ? "0" : "0.9"; }
      updateDrag(e);
    };
    drag.up = (e) => endDrag(e, false);
    drag.cn = (e) => endDrag(e, true);
    window.addEventListener("pointermove", drag.mv); window.addEventListener("pointerup", drag.up); window.addEventListener("pointercancel", drag.cn);
  }
  function attachStage() {
    const stage = ses.root.querySelector("#kh-stage");
    stage.addEventListener("pointerdown", (ev) => {
      if (!ses.edit || ev.button > 0 || ev.target.closest(".kh-menu,.kh-top")) return;
      const g = ev.target.closest && ev.target.closest(".kh-it,.kh-koala");
      if (!g) { if (ses.sel) { ses.sel = null; applySel(); hideMenu(); } return; }
      ev.preventDefault();
      const st = curState(), p = toScene(ev);
      if (g.classList.contains("kh-koala")) {
        const k = ses.koala, gc = cellOf(p.x, p.y);
        beginDrag(ev, { koala: true, piece: { id: "stoolBlue", c: k.c, r: k.r, m: 0 }, grab: { c: gc.c - k.c, r: gc.r - k.r } });
        // the koala moves like a 1x1 piece: reuse the footprint of a stool for the ghost
        ses.drag.piece = { id: "stoolBlue", c: k.c, r: k.r, m: 0, z: 0 };
        ses.drag.koalaPiece = true;
        return;
      }
      const it = st.items.find((x) => x.uid === g.dataset.uid);
      if (!it) return;
      const d = H.D[it.id];
      if (ses.sel !== it.uid) { ses.sel = it.uid; applySel(); hideMenu(); }
      const init = { uid: it.uid, piece: Object.assign({}, it) };
      if (!d.wall) {
        const gc = cellOf(p.x, p.y); init.grab = { c: gc.c - it.c, r: gc.r - it.r };
        if (d.topH && !d.stack) { // things sitting on a table travel with it
          const cells = H.cellsOf(it);
          init.riders = st.items.filter((o) => o.uid !== it.uid && H.D[o.id].stack && cells.includes(H.cellsOf(o)[0])).map((o) => ({ it: o, dc: o.c - it.c, dr: o.r - it.r }));
        }
      }
      beginDrag(ev, init);
    });
  }

  /* ------------------------------ right-hand panel ------------------------------ */
  function drawPanel() {
    const yard = ses.roomId === "yard", tabs = tabsFor(yard), panel = ses.root.querySelector("#kh-panel");
    if (!tabs.some((t) => t[0] === ses.tab)) ses.tab = tabs[0][0];
    panel.innerHTML = `<div class="kh-tabs" role="tablist">${tabs.map((t) => `<button type="button" role="tab" class="kh-tab" data-tab="${t[0]}" aria-selected="${t[0] === ses.tab}" title="${esc(t[2])}"><span aria-hidden="true">${t[1]}</span><small>${esc(t[2])}</small></button>`).join("")}</div><div class="kh-grid" id="kh-grid">${gridHtml(yard)}</div>`;
    panel.querySelectorAll("[data-tab]").forEach((b) => { b.onclick = () => { ses.tab = b.dataset.tab; drawPanel(); }; });
    wireGrid(panel.querySelector("#kh-grid"), yard);
  }
  function swatch(kind, key, def, own, on) {
    return `<button type="button" class="kh-sw${on ? " on" : ""}${own ? "" : " locked"}" data-sw="${kind}:${key}" aria-label="${esc(T(def.n[0], def.n[1]))}" aria-pressed="${on}"><span class="kh-sw-c" style="background:${def.c};box-shadow:inset 0 0 0 5px ${def.a}"></span><span class="kh-sw-n">${esc(T(def.n[0], def.n[1]))}</span>${own ? "" : `<span class="kh-pr">${COIN}${def.p}</span>`}</button>`;
  }
  function gridHtml(yard) {
    const st = curState(), S = ses.S;
    if (ses.tab === "style") {
      if (yard) return `<h3>${T("잔디 색", "Lawn")}</h3><div class="kh-sws">${["grass", "lime", "autumn"].map((k) => swatch("floor", k, H.FLOORS[k], k === "grass" || !!S.floors[k], st.floor === k)).join("")}</div>`;
      return `<h3>${T("벽지", "Wallpaper")}</h3><div class="kh-sws">${Object.keys(H.WALLS).map((k) => swatch("wall", k, H.WALLS[k], H.WALLS[k].p === 0 || !!S.walls[k], st.wall === k)).join("")}</div><h3>${T("바닥", "Floor")}</h3><div class="kh-sws">${Object.keys(H.FLOORS).filter((k) => !["grass", "lime", "autumn"].includes(k)).map((k) => swatch("floor", k, H.FLOORS[k], H.FLOORS[k].p === 0 || !!S.floors[k], st.floor === k)).join("")}</div>`;
    }
    if (ses.tab === "house") {
      const h = st.house || {};
      const grp = (title, kind, set, key) => `<h3>${title}</h3><div class="kh-sws">${Object.keys(set).map((k) => `<button type="button" class="kh-sw${h[kind] === k ? " on" : ""}" data-house="${kind}:${k}" aria-pressed="${h[kind] === k}" aria-label="${esc(T(set[k][0], set[k][1]))}"><span class="kh-sw-c" style="background:${set[k][2]}"></span><span class="kh-sw-n">${esc(T(set[k][0], set[k][1]))}</span></button>`).join("")}</div>`;
      return grp(T("외벽", "Walls"), "wall", H.HOUSE_WALLS) + grp(T("지붕", "Roof"), "roof", H.HOUSE_ROOFS) + grp(T("현관문", "Door"), "door", H.HOUSE_DOORS);
    }
    if (ses.tab === "koala") {
      const w = S.worn || {};
      return Object.keys(KSLOT).map((slot) => `<h3>${{ hat: T("머리", "Head"), face: T("얼굴", "Face"), neck: T("목", "Neck"), body: T("몸", "Body"), back: T("등", "Back") }[slot]}</h3><div class="kh-sws">${KSLOT[slot].map((n) => `<button type="button" class="kh-sw kh-kitem${w[slot] === n ? " on" : ""}" data-wear="${slot}:${n}" aria-pressed="${w[slot] === n}"><img src="${kimg(n)}" alt="" draggable="false"><span class="kh-sw-n">${esc(T(KNAME[n][0], KNAME[n][1]))}</span></button>`).join("")}</div>`).join("");
    }
    const list = Object.values(H.D).filter((d) => d.cat === ses.tab && (d.where === "both" || d.where === (yard ? "out" : "in"))).sort((a, b) => a.price - b.price);
    return `<div class="kh-items-grid">${list.map((d) => { const own = ownedItem(d); return `<button type="button" class="kh-item${own ? "" : " locked"}" data-item="${d.id}" aria-label="${esc(nm(d))}${own ? "" : ", " + d.price}">${H.thumbSvg(d.id)}<span class="kh-nm">${esc(nm(d))}</span>${own ? "" : `<span class="kh-pr">${COIN}${d.price}</span>`}</button>`; }).join("")}</div>`;
  }
  function wireGrid(grid, yard) {
    grid.querySelectorAll("[data-item]").forEach((b) => {
      b.addEventListener("pointerdown", (ev) => {
        if (ev.button > 0) return;
        const id = b.dataset.item, d = H.D[id];
        if (!ownedItem(d) || ev.pointerType === "touch") return; // locked: tap buys; touch: tap places, then drag it in the room
        ev.preventDefault();
        b._dragged = false;
        beginDrag(ev, { fromPanel: true, piece: { id, c: 0, r: 0, m: 0, z: 0, side: "R", u: 0, h: d.defH }, valid: false });
        const o = ses.drag.up; ses.drag.up = (e) => { b._dragged = ses.drag ? ses.drag.moved : false; o(e); };
      });
      b.addEventListener("click", () => {
        if (b._dragged) { b._dragged = false; return; }
        const id = b.dataset.item, d = H.D[id];
        if (!ownedItem(d)) { buy(nm(d), `<span class="kh-buy-thumb">${H.thumbSvg(id)}</span>`, d.price, "house:" + id, () => { ses.S.owned[id] = 1; save(); drawPanel(); placeNew(id); }); return; }
        placeNew(id); placeKoalaFree(); updateKoala();
      });
    });
    grid.querySelectorAll("[data-sw]").forEach((b) => {
      b.onclick = () => {
        const [kind, key] = b.dataset.sw.split(":"), def = (kind === "wall" ? H.WALLS : H.FLOORS)[key], store = kind === "wall" ? ses.S.walls : ses.S.floors, own = def.p === 0 || !!store[key];
        const apply = () => { curState()[kind] = key; save(); drawScene(); drawPanel(); };
        if (own) apply(); else buy(T(def.n[0], def.n[1]), `<span class="kh-sw-c big" style="background:${def.c};box-shadow:inset 0 0 0 8px ${def.a}"></span>`, def.p, kind + ":" + key, () => { store[key] = 1; apply(); });
      };
    });
    grid.querySelectorAll("[data-house]").forEach((b) => { b.onclick = () => { const [kind, key] = b.dataset.house.split(":"); const st = curState(); st.house = st.house || {}; st.house[kind] = key; save(); drawScene(); drawPanel(); }; });
    grid.querySelectorAll("[data-wear]").forEach((b) => { b.onclick = () => { const [slot, n] = b.dataset.wear.split(":"); const w = ses.S.worn = ses.S.worn || {}; if (w[slot] === n) delete w[slot]; else w[slot] = n; save(); drawScene(); drawPanel(); }; });
  }

  window.KoalaHouse.open = open;
  window.KoalaHouse.close = close;
})();
