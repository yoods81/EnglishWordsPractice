// Koala Study Mate — My Koala House (3D): screens and interaction.
//   KoalaHouse.mount(el, opts)          the floor plan + room editor, inside the page
//   KoalaHouse.mountWardrobe(el, opts)  the 3D koala wardrobe (the Character tab's 3D view)
// opts: { L(en, ko), coins(), unlimited, spend(n, why) -> bool, subs? }
//   subs: { list(kind) -> [{id, name:[ko,en], cost, owned, group}], limit(kind, group), buy(id) -> bool }
(function () {
  "use strict";
  const H = window.KoalaHouse;
  if (!H) return;
  const NS = "http://www.w3.org/2000/svg";

  // The 3D-style koala is a stack of pictures sharing one 680x1024 canvas.
  const KBOX = Object.assign({ base: [64, 222, 617, 968], hoodie: [122, 528, 562, 819], backpack: [131, 545, 560, 832], scarf: [185, 531, 497, 780], glasses: [162, 362, 520, 500], bushhat: [108, 188, 574, 441], partyhat: [259, 100, 422, 290], crown: [249, 190, 433, 295] }, {"bluecap": [190, 103, 490, 335], "gradhat": [180, 86, 500, 342], "flowercrown": [145, 106, 535, 340], "wizardhat": [189, 22, 492, 345], "santahat": [170, 59, 510, 320], "beanie": [222, 22, 459, 335], "cowboyhat": [150, 77, 530, 330], "chefhat": [210, 78, 470, 312], "bunnyears": [214, 22, 467, 355]});
  const KORDER = ["backpack", "hoodie", "scarf", "glasses", "bushhat", "partyhat", "crown", "bluecap", "gradhat", "flowercrown", "wizardhat", "santahat", "beanie", "cowboyhat", "chefhat", "bunnyears"];
  const KSLOT = { hat: ["bushhat", "partyhat", "crown", "bluecap", "gradhat", "flowercrown", "wizardhat", "santahat", "beanie", "cowboyhat", "chefhat", "bunnyears"], face: ["glasses"], neck: ["scarf"], body: ["hoodie"], back: ["backpack"] };
  const KNAME = { bushhat: ["부시햇", "Bush Hat"], partyhat: ["파티 모자", "Party Hat"], crown: ["왕관", "Crown"], bluecap: ["파란 모자", "Blue Cap"], gradhat: ["졸업 모자", "Graduation Hat"], flowercrown: ["꽃 왕관", "Flower Crown"], wizardhat: ["마법사 모자", "Wizard Hat"], santahat: ["산타 모자", "Santa Hat"], beanie: ["털모자", "Winter Beanie"], cowboyhat: ["카우보이 모자", "Cowboy Hat"], chefhat: ["요리사 모자", "Chef Hat"], bunnyears: ["토끼 귀", "Bunny Ears"], glasses: ["안경", "Glasses"], scarf: ["목도리", "Scarf"], hoodie: ["후드티", "Hoodie"], backpack: ["배낭", "Backpack"] };
  const kimg = (n) => `/img/koala/${n}.webp`;

  let ses = null;           // the house session
  let curOpts = null;       // opts of whatever is mounted (for T)
  let memo = { screen: "plan", roomId: null };   // where the player was, to come back to after the page redraws
  let extraImg = {};        // optional koala pictures from the manifest: { back, sit }

  /* ------------------------------ small helpers ------------------------------ */
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const reduced = () => !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const T = (ko, en) => curOpts.L(en, ko);
  const nm = (d) => T(d.name[0], d.name[1]);
  const COIN = '<span class="kh-coin" aria-hidden="true"></span>';
  // line icons (24 x 24, drawn with the text colour) used by every button
  const ICONS = {
    rotl: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    rot: '<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    minus: '<path d="M5 12h14"/>',
    maximize: '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>',
    minimize: '<path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    pencil: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
    left: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    right: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    chev: '<path d="m9 18 6-6-6-6"/>',
    up: '<path d="M14 9 9 4 4 9"/><path d="M20 20h-7a4 4 0 0 1-4-4V4"/>',
    sit: '<path d="M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3"/><path d="M3 16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v1.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5V11a2 2 0 0 0-4 0z"/><path d="M5 18v2"/><path d="M19 18v2"/>',
    stand: '<circle cx="12" cy="5" r="2"/><path d="M12 7v7"/><path d="M8 11h8"/><path d="m9 22 3-8 3 8"/>',
    inside: '<rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/>',
  };
  const ic = (n) => `<svg class="kh-i" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[n] || ""}</svg>`;

  const roomDef = (id) => H.roomOf(ses.S, id);
  const roomState = (id) => H.stateOf(ses.S, id);
  const curRoom = () => roomDef(ses.roomId);
  const curState = () => roomState(ses.roomId);
  const roomLabel = (r) => T(r.label[0], r.label[1]);
  const save = () => H.persist(ses.S);
  const ownedItem = (d) => d.price === 0 || !!ses.S.owned[d.id];

  const coinsText = () => (curOpts.unlimited ? "∞" : Number(curOpts.coins()).toLocaleString());
  function refreshCoins() { if (ses) ses.root.querySelectorAll("[data-kh-coins]").forEach((e) => { e.textContent = coinsText(); }); }
  function toast(msg, bad) {
    const t = ses.root.querySelector(".kh-toast");
    if (!t) return;
    t.textContent = msg; t.className = "kh-toast on" + (bad ? " bad" : "");
    clearTimeout(ses.toastT);
    ses.toastT = setTimeout(() => { t.className = "kh-toast"; }, 2200);
  }

  /* ------------------------------ mount / close ------------------------------ */
  function mount(root, opts) {
    if (ses) destroy();
    curOpts = opts;
    const S = H.load();
    ses = { opts, S, root, screen: "plan", roomId: null, edit: true, sel: null, tab: "furniture", drag: null, zoom: 1, full: false,
      koala: { c: 2, r: 3, dir: 1, pose: "stand", z: 0, seat: null, exit: null, path: [], wait: 1.2, bob: 0, sitT: 0, after: null } };
    root.className = "kh-app kh-embed";
    fit(root);
    root.setAttribute("aria-label", T("내 집", "My House"));
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    ses.last = performance.now();
    ses.raf = requestAnimationFrame(loop);
    const back = memo.roomId && memo.screen === "room" ? roomDef(memo.roomId) : null;
    if (back) openRoom(memo.roomId); else renderPlan();
    fetch("/img/house/manifest.json").then((r) => (r.ok ? r.json() : {})).then((m) => {
      if (!ses || !m || !Object.keys(m).length) return;
      H.setManifest(m);
      extraImg = { back: m["koala:back"] && m["koala:back"].src, sit: m["koala:sit"] && m["koala:sit"].src, sitback: m["koala:sitback"] && m["koala:sitback"].src, read: m["koala:read"] && m["koala:read"].src };
      if (ses.screen === "room") drawScene(); else renderPlan();
    }).catch(() => {});
  }
  function destroy() {
    if (!ses) return;
    cancelAnimationFrame(ses.raf);
    document.removeEventListener("keydown", onKey);
    window.removeEventListener("resize", onResize);
    if (ses.drag) { window.removeEventListener("pointermove", ses.drag.mv); window.removeEventListener("pointerup", ses.drag.up); window.removeEventListener("pointercancel", ses.drag.cn); if (ses.drag.ghostEl) ses.drag.ghostEl.remove(); }
    document.body.classList.remove("kh-open");
    ses.root.classList.remove("kh-full", "kh-planmode");
    memo = { screen: ses.screen, roomId: ses.screen === "room" ? ses.roomId : null };
    ses = null;
  }
  function toggleFull() {
    ses.full = !ses.full;
    ses.root.classList.toggle("kh-full", ses.full);
    document.body.classList.toggle("kh-open", ses.full);
    const b = ses.root.querySelector("[data-full]"); if (b) { b.innerHTML = ic(ses.full ? "minimize" : "maximize"); b.setAttribute("aria-label", ses.full ? T("작게 보기", "Exit full screen") : T("크게 보기", "Full screen")); }
    if (ses.screen === "plan") placeMarker(false); else showMenu();
  }
  function onKey(e) {
    if (!ses) return;
    if (!ses.root.isConnected) { destroy(); return; }
    if (e.key === "Escape") { if (ses.modal) closeModal(); else if (ses.full) toggleFull(); else if (ses.screen === "room") backToPlan(); return; }
    if ((e.key === "r" || e.key === "R") && ses.screen === "room" && ses.sel && !ses.modal && !/INPUT|TEXTAREA/.test((e.target || {}).tagName || "")) menuAct(e.shiftKey ? "rotl" : "rot");
  }
  // a narrow box (a phone, or a small window) stacks the picture above the shop panel
  const fit = (r) => r.classList.toggle("kh-narrow", r.clientWidth > 0 && r.clientWidth < 820);
  function onResize() { if (!ses) return; fit(ses.root); if (ses.screen === "plan") placeMarker(false); }

  /* ------------------------------ modal ------------------------------ */
  function closeModal() { if (ses && ses.modal) { ses.modal.remove(); ses.modal = null; } }
  function modal(html, wire) {
    closeModal();
    const m = el("div", "kh-modal", `<div class="kh-sheet" role="alertdialog" aria-modal="true">${html}</div>`);
    m.addEventListener("click", (e) => { if (e.target === m) closeModal(); });
    ses.root.appendChild(m);
    ses.modal = m;
    if (wire) wire(m);
    const b = m.querySelector("[data-primary]"); if (b) b.focus();
  }
  // buy something: cb() runs after the coins were taken. spendFn(price, why) overrides the default spending.
  function buy(title, picHtml, price, why, cb, spendFn) {
    const afford = curOpts.unlimited || curOpts.coins() >= price;
    modal(`<h2>${esc(title)}</h2><div class="kh-buy-pic">${picHtml}</div><p class="kh-buy-price">${COIN} <b>${price}</b></p>
      <p class="kh-buy-note">${afford ? T("코인으로 살까요?", "Buy it with your coins?") : T(`코인이 ${price - curOpts.coins()}개 모자라요. 공부하고 코인을 모아 봐요!`, `You need ${price - curOpts.coins()} more coins. Keep studying to earn them!`)}</p>
      <div class="kh-btns"><button type="button" class="kh-btn" data-primary data-yes ${afford ? "" : "disabled"}>${T("살래요", "Buy")}</button><button type="button" class="kh-btn alt" data-no>${T("닫기", "Close")}</button></div>`, (m) => {
      m.querySelector("[data-no]").onclick = closeModal;
      m.querySelector("[data-yes]").onclick = () => {
        const ok = spendFn ? spendFn(price, why) : curOpts.spend(price, why);
        if (!ok) { toast(T("코인이 모자라요", "Not enough coins"), true); closeModal(); return; }
        closeModal(); refreshCoins(); cb(true);
      };
    });
  }

  // The shop panel is built like the 2D one: a row of category chips on top, the items of the chosen category below.
  function chipsHtml(tabs, cur) { // tabs: [id, icon, label]
    return `<div class="kh-cats" role="tablist">${tabs.map((t) => `<button type="button" role="tab" class="kh-cat${t[0] === cur ? " on" : ""}" data-tab="${t[0]}" aria-selected="${t[0] === cur}">${esc(t[2])}</button>`).join("")}</div>`;
  }
  const shelfHead = (title, count) => `<div class="kh-shelf-head"><span class="kh-shelf-title">${esc(title)}${count ? ` <small>${count}</small>` : ""}</span></div>`;
  const press = (node, fn) => { node.onclick = fn; node.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } }; };

  /* ------------------------------ floor plan ------------------------------ */
  function topBar(title) {
    return `<div class="kh-top"><h2 class="kh-title">${title}</h2><span class="kh-sp"></span><span class="kh-coins">${COIN}<b data-kh-coins>${coinsText()}</b></span><button type="button" class="kh-ibtn" data-full aria-label="${T("크게 보기", "Full screen")}">${ic("maximize")}</button></div>`;
  }
  function renderPlan() {
    ses.screen = "plan"; ses.sel = null; ses.koala.pose = "stand"; ses.koala.z = 0;
    ses.root.classList.add("kh-planmode"); fit(ses.root);
    const S = ses.S, built = Object.keys(S.slots).length;
    const house = H.planSvg(S, { name: (r) => (r.ic ? r.ic + " " : "") + roomLabel(r), empty: T("방 짓기", "Build a room"), fresh: ses.justBuilt, title: T("우리 집 평면도", "Our house floor plan") });
    ses.root.innerHTML = `<div class="kh-plan-screen">
      <div class="kh-planmain">${topBar("🏠 " + T("내 집", "My House"))}
        <p class="kh-hint">${T("방을 누르면 코알라가 들어가요. 빈 칸에는 상점에서 방을 사서 지어요.", "Tap a room to walk in. Buy rooms in the shop and build them on the empty plots.")}</p>
        <div class="kh-plan" id="kh-plan">${house}
          <button type="button" class="kh-entrance" data-room="yard" aria-label="${T("입구: 마당", "Entrance: the yard")}"><span class="kh-door" aria-hidden="true">🚪</span><span class="kh-card-name">${T("입구 · 마당과 집 외관 꾸미기", "Entrance · yard & house front")}</span></button>
          <img class="kh-marker" id="kh-marker" src="${kimg("base")}" alt="${T("코알라", "Koala")}" draggable="false"></div></div>
      <aside class="kh-panel" id="kh-panel" aria-label="${T("방 상점", "Room shop")}">
        ${chipsHtml([["rooms", "🏠", T("방", "Rooms")]], "rooms")}
        <div class="kh-grid">${shelfHead(T("방 상점", "Room shop"), `${built}/${H.SLOTS.length}`)}<div class="kh-items-grid kh-rooms">${H.ROOM_ORDER.map((t) => roomShopCard(t)).join("")}</div></div></aside></div><div class="kh-toast" role="status"></div>`;
    ses.justBuilt = null;
    ses.root.querySelector("[data-full]").onclick = toggleFull;
    ses.root.querySelectorAll("[data-room]").forEach((b) => { press(b, () => pickRoom(b.dataset.room)); });
    ses.root.querySelectorAll("[data-empty]").forEach((b) => { press(b, () => chooseRoomType(b.dataset.empty)); });
    ses.root.querySelectorAll("[data-buyroom]").forEach((b) => { b.onclick = () => buildRoom(b.dataset.buyroom); });
    requestAnimationFrame(() => placeMarker(false));
    ses.root.querySelector("#kh-marker").addEventListener("load", () => placeMarker(false));
  }
  function roomShopCard(t) {
    const r = H.ROOMS[t], have = Object.values(ses.S.slots).filter((x) => x.type === t).length;
    return `<button type="button" class="kh-item kh-roomitem" data-buyroom="${t}" aria-label="${esc(T(r.ko, r.en))}, ${r.price}"><span class="kh-roomic" aria-hidden="true">${r.ic}</span><span class="kh-nm">${esc(T(r.ko, r.en))}</span><span class="kh-subtxt">${r.C}×${r.R}${have ? " · " + T(`${have}개`, `${have} built`) : ""}</span>${r.price ? `<span class="kh-pr">${COIN}${r.price}</span>` : `<span class="kh-pr">${T("무료", "Free")}</span>`}</button>`;
  }
  function placeMarker(animate, toId) {
    if (!ses) return;
    const m = ses.root.querySelector("#kh-marker"), plan = ses.root.querySelector("#kh-plan");
    if (!m || !plan) return;
    const id = toId || ses.roomId || ses.S.cur;
    const c = plan.querySelector(`[data-room="${id}"] .kh-hit`) || plan.querySelector(`[data-room="${id}"]`) || plan.querySelector('[data-room="yard"]');
    if (!c) return;
    const pr = plan.getBoundingClientRect(), cr = c.getBoundingClientRect(), onFloor = c.classList.contains("kh-hit");
    m.style.transition = animate && !reduced() ? "left .7s ease-in-out, top .7s ease-in-out" : "none";
    m.style.left = (cr.left - pr.left + cr.width * 0.5) + "px";
    m.style.top = (cr.top - pr.top + cr.height * (onFloor ? 0.5 : 0.8)) + "px";
    m.classList.toggle("walk", !!animate && !reduced());
  }
  function pickRoom(id) {
    placeMarker(true, id);
    setTimeout(() => { if (ses && ses.screen === "plan") openRoom(id); }, reduced() ? 0 : 760);
  }
  function backToPlan() { renderPlan(); }

  /* ---- buying rooms: the shop sells kinds of rooms, and you choose the plot ---- */
  function roomPic(t) { const r = H.ROOMS[t]; return `<span class="kh-card-pic">${H.roomSvg(Object.assign({}, r, { uid: "shop" + t }), { wall: r.wall, floor: r.floor, items: [] }, {})}</span>`; }
  function chooseRoomType(slot) {
    modal(`<h2>${T("어떤 방을 지을까요?", "Which room?")}</h2><div class="kh-items-grid kh-rooms">${H.ROOM_ORDER.map((t) => roomShopCard(t)).join("")}</div><div class="kh-btns"><button type="button" class="kh-btn alt" data-no>${T("닫기", "Close")}</button></div>`, (m) => {
      m.querySelector("[data-no]").onclick = closeModal;
      m.querySelectorAll("[data-buyroom]").forEach((b) => { b.onclick = () => buildRoom(b.dataset.buyroom, slot); });
    });
  }
  function buildRoom(type, slot) {
    const S = ses.S, t = H.ROOMS[type], empties = H.SLOTS.filter((sl) => !S.slots[sl]);
    if (!empties.length) { closeModal(); toast(T("빈 칸이 없어요", "No empty plots left"), true); return; }
    const go = (sl) => buy(T(t.ko, t.en) + T(" 짓기", " — build"), roomPic(type), t.price, "room:" + type, () => {
      S.slots[sl] = { type, wall: t.wall, floor: t.floor, items: [] }; ses.justBuilt = sl; save(); renderPlan(); toast(T("새 방이 생겼어요!", "A new room!"));
    });
    if (slot || empties.length === 1) { go(slot || empties[0]); return; }
    modal(`<h2>${T("어느 칸에 지을까요?", "Which plot?")}</h2><div class="kh-slotpick">${H.SLOTS.map((sl) => { const o = S.slots[sl]; return o ? `<span class="kh-slotcell taken" aria-hidden="true">${H.ROOMS[o.type].ic}</span>` : `<button type="button" class="kh-slotcell" data-slot="${sl}" aria-label="${T("빈 칸", "Empty plot")}">＋</button>`; }).join("")}<span class="kh-slotdoor">🚪 ${T("입구", "Entrance")}</span></div><div class="kh-btns"><button type="button" class="kh-btn alt" data-no>${T("닫기", "Close")}</button></div>`, (m) => {
      m.querySelector("[data-no]").onclick = closeModal;
      m.querySelectorAll("[data-slot]").forEach((b) => { b.onclick = () => go(b.dataset.slot); });
    });
  }

  /* ------------------------------ room screen ------------------------------ */
  function tabsFor(yard) {
    return yard
      ? [["outdoor", "🌳", T("정원 물건", "Garden")], ["plant", "🪴", T("식물", "Plants")], ["house", "🏠", T("집 외관", "House")], ["garden", "🌷", T("정원 형태", "Layout")]]
      : [["furniture", "🛋️", T("가구", "Furniture")], ["rug", "🟦", T("러그", "Rugs")], ["plant", "🪴", T("식물", "Plants")], ["small", "🧸", T("소품", "Props")], ["wall", "🖼️", T("벽장식", "Wall")], ["style", "🎨", T("벽·바닥", "Style")]];
  }
  function openRoom(id) {
    if (!roomDef(id)) { renderPlan(); return; }
    ses.screen = "room"; ses.roomId = id; ses.S.cur = id; ses.sel = null; ses.edit = true; ses.zoom = 1;
    ses.root.classList.remove("kh-planmode"); fit(ses.root); ses.subOf = null;
    const yard = id === "yard";
    ses.tab = yard ? "outdoor" : "furniture";
    save();
    ses.root.innerHTML = `<div class="kh-room-screen">
      <div class="kh-stage" id="kh-stage">
        <div class="kh-scene" id="kh-scene"></div>
        <div class="kh-top over"><button type="button" class="kh-pillbtn" data-back aria-label="${T("집 전체 보기", "Back to the floor plan")}">${ic("left")}${ic("home")}<span>${T("평면도", "Floor plan")}</span></button>
          <h2 class="kh-title pill">${esc(roomLabel(curRoom()))}</h2><span class="kh-sp"></span>
          <span class="kh-coins">${COIN}<b data-kh-coins>${coinsText()}</b></span>
          <button type="button" class="kh-ibtn" data-zoom="out" aria-label="${T("작게", "Zoom out")}">${ic("minus")}</button><button type="button" class="kh-ibtn" data-zoom="in" aria-label="${T("크게", "Zoom in")}">${ic("plus")}</button>
          <button type="button" class="kh-ibtn" data-full aria-label="${T("크게 보기", "Full screen")}">${ic("maximize")}</button>
          <button type="button" class="kh-pillbtn done" data-edit aria-pressed="true" aria-label="${T("꾸미기 끝내기", "Finish decorating")}">${ic("check")}<span>${T("완료", "Done")}</span></button></div>
        <div class="kh-menu" id="kh-menu" hidden></div><p class="kh-toast" role="status"></p></div>
      <aside class="kh-panel" id="kh-panel" aria-label="${T("아이템", "Items")}"></aside></div>`;
    const q = (s) => ses.root.querySelector(s);
    q("[data-back]").onclick = backToPlan;
    q("[data-edit]").onclick = toggleEdit;
    q("[data-full]").onclick = toggleFull;
    q('[data-zoom="in"]').onclick = () => setZoom(ses.zoom + 0.5);
    q('[data-zoom="out"]').onclick = () => setZoom(ses.zoom - 0.5);
    if (yard && ses.root.clientWidth < 720) ses.zoom = 1.5;
    attachStage();
    placeKoalaFree();
    drawScene();
    drawPanel();
  }
  function setZoom(z) {
    ses.zoom = Math.max(1, Math.min(3, z));
    const svg = ses.root.querySelector(".kh-room-svg");
    if (svg) { svg.style.width = `calc((100% - 16px) * ${ses.zoom})`; svg.style.height = `calc((100% - 64px) * ${ses.zoom})`; }
    const sc = ses.root.querySelector("#kh-scene");
    if (sc) { sc.classList.toggle("zoomed", ses.zoom > 1); sc.scrollLeft = (sc.scrollWidth - sc.clientWidth) / 2; sc.scrollTop = (sc.scrollHeight - sc.clientHeight) / 2; }
    showMenu();
  }
  function toggleEdit() {
    ses.edit = !ses.edit; ses.sel = null;
    const b = ses.root.querySelector("[data-edit]");
    b.innerHTML = ses.edit ? ic("check") + `<span>${T("완료", "Done")}</span>` : ic("pencil") + `<span>${T("꾸미기", "Decorate")}</span>`; b.setAttribute("aria-pressed", String(ses.edit));
    b.setAttribute("aria-label", ses.edit ? T("꾸미기 끝내기", "Finish decorating") : T("꾸미기", "Decorate"));
    ses.root.querySelector(".kh-room-screen").classList.toggle("viewing", !ses.edit);
    hideMenu();
    if (ses.edit) { standUp(true); ses.koala.path = []; placeKoalaFree(); } else ses.koala.wait = 0.6;
    drawScene();
  }

  /* ---- koala ---- */
  const wornNames = () => ["base"].concat(KORDER.filter((n) => Object.values(ses.S.worn || {}).includes(n)));
  function koalaMarkup() {
    const imgs = wornNames().map((n) => { const b = KBOX[n]; return `<image href="${kimg(n)}" x="${b[0]}" y="${b[1]}" width="${b[2] - b[0]}" height="${b[3] - b[1]}"/>`; }).join("");
    const one = (src) => { const b = KBOX.base; return `<image href="${src}" x="${b[0]}" y="${b[1]}" width="${b[2] - b[0]}" height="${b[3] - b[1]}"/>`; };
    const stand = `<svg class="kh-kstand" x="-27" y="-89.8" width="54" height="92.8" viewBox="64 20 553 948" overflow="hidden">${imgs}</svg>`;
    const back = extraImg.back ? `<svg class="kh-kback" x="-27" y="-89.8" width="54" height="92.8" viewBox="64 20 553 948" overflow="hidden" display="none">${one(extraImg.back)}</svg>` : "";
    // sitting / reading koalas are pictures of their own (img/koala/*.webp; "koala:sit", "koala:sitback", "koala:read" in the manifest override them)
    const own = (cls, src, w, h, bottom) => `<image class="${cls}" href="${src}" x="${-w / 2}" y="${(bottom - h).toFixed(1)}" width="${w}" height="${h}" preserveAspectRatio="xMidYMax meet" display="none"/>`;
    const sit = own("kh-ksit", extraImg.sit || kimg("sit"), 40, 49, 0) + own("kh-ksitback", extraImg.sitback || kimg("sitback"), 38, 45.5, 0);
    const readImg = own("kh-kreadimg", extraImg.read || kimg("read"), 44, 68, 3);
    const pose = (cls, src) => (src ? `<svg class="${cls}" x="-27" y="-89.8" width="54" height="92.8" viewBox="64 20 553 948" overflow="hidden" display="none">${one(src)}</svg>` : "");
    const book = `<g class="kh-kread" display="none"><path d="M-13 -35 0 -31.5 13 -35 13 -21 0 -17.5 -13 -21Z" fill="#e0674f" stroke="#b44a37" stroke-width="1.2" stroke-linejoin="round"/><path d="M-11 -33.6 0 -30.4V-19.4L-11 -22.6Z" fill="#fffaf0"/><path d="M11 -33.6 0 -30.4V-19.4L11 -22.6Z" fill="#f6efe0"/><path d="M-8.5 -29.5 -3 -27.9M-8.5 -26 -3 -24.4M8.5 -29.5 3 -27.9M8.5 -26 3 -24.4" stroke="#cdbb9a" stroke-width="1" stroke-linecap="round"/><path d="M0 -30.4V-19.4" stroke="#b44a37" stroke-width="1.2"/>
      <path d="M4 -31 9 -33.2 9 -22 4 -19.8Z" fill="#fffaf0" opacity="0"><animate attributeName="opacity" values="0;0.95;0" dur="3.2s" repeatCount="indefinite"/></path></g>`;
    const can = `<g class="kh-kwater" display="none"><g><animateTransform attributeName="transform" type="rotate" values="0 17 -30;-20 17 -30;-20 17 -30;0 17 -30" keyTimes="0;.3;.8;1" dur="2.6s" repeatCount="indefinite"/>
      <path d="M10 -37q-8 1-7 9" fill="none" stroke="#3b86b8" stroke-width="2.2" stroke-linecap="round"/><rect x="9" y="-38" width="16" height="12" rx="3" fill="#7cc4ee" stroke="#3b86b8" stroke-width="1.3"/><path d="M24 -32 33 -40" stroke="#3b86b8" stroke-width="2.6" stroke-linecap="round"/><path d="M31 -44 37 -40.5 32 -37Z" fill="#3b86b8"/><rect x="11" y="-36" width="4" height="8" rx="1.5" fill="#fff" opacity=".45"/></g>
      <g fill="#8fd3f5"><circle cx="38" cy="-32" r="1.6"><animate attributeName="cy" values="-36;-14" dur=".9s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;1;0" dur=".9s" repeatCount="indefinite"/></circle><circle cx="34" cy="-33" r="1.4"><animate attributeName="cy" values="-36;-14" dur=".9s" begin=".3s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;1;0" dur=".9s" begin=".3s" repeatCount="indefinite"/></circle><circle cx="41" cy="-33" r="1.4"><animate attributeName="cy" values="-36;-14" dur=".9s" begin=".6s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;1;0" dur=".9s" begin=".6s" repeatCount="indefinite"/></circle></g></g>`;
    return `<g class="kh-koala" data-k="0"><ellipse class="kh-kshadow" cx="0" cy="2" rx="24" ry="8" fill="#000" opacity=".16"/><g class="kh-kbody"><g class="kh-kflip">${stand}${back}${sit}${readImg}${pose("kh-kwaterimg", extraImg.water)}${book}${can}</g></g></g>`;
  }
  const FLIP = [-1, 1, 1, -1]; // facing 0 (+r, left-down) 1 (+c, right-down) 2 (-r, right-up) 3 (-c, left-up)
  function koalaCellFree(c, r) {
    const room = curRoom(), st = curState();
    if (c < 0 || r < 0 || c >= room.C || r >= room.R) return false;
    return !H.occ(room, st)[c + "," + r];
  }
  function placeKoalaFree() {
    const k = ses.koala, room = curRoom();
    if (k.pose === "sit" && k.seat && H.seatAt(curState(), Math.round(k.c), Math.round(k.r))) return;
    if ((k.pose === "read" || k.pose === "water") && curState().items.some((i) => i.uid === k.act)) return;
    standUp(true);
    if (koalaCellFree(Math.round(k.c), Math.round(k.r))) { k.c = Math.round(k.c); k.r = Math.round(k.r); return; }
    const cells = H.freeCells(room, curState());
    if (!cells.length) return;
    cells.sort((a, b) => Math.hypot(a[0] - k.c, a[1] - k.r) - Math.hypot(b[0] - k.c, b[1] - k.r));
    k.c = cells[0][0]; k.r = cells[0][1]; k.path = [];
  }
  function updateKoala() {
    const g = ses.root.querySelector(".kh-koala");
    if (!g) return;
    const k = ses.koala, [x, y] = H.proj(k.c + 0.5, k.r + 0.5, k.z || 0);
    g.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    const sit = k.pose === "sit", rd = k.pose === "read", wt = k.pose === "water", away = k.dir === 2 || k.dir === 3, hasBack = !!g.querySelector(".kh-kback");
    const hasRd = true, hasWt = !!g.querySelector(".kh-kwaterimg");
    const show = (sel, on) => { const e = g.querySelector(sel); if (e) e.setAttribute("display", on ? "inline" : "none"); };
    show(".kh-kstand", !sit && !(rd && hasRd) && !(wt && hasWt) && !(k.pose === "stand" && away && hasBack)); show(".kh-kback", k.pose === "stand" && away && hasBack); show(".kh-ksit", sit && !away); show(".kh-ksitback", sit && away);
    show(".kh-kreadimg", rd); show(".kh-kwaterimg", wt); show(".kh-kread", false); show(".kh-kwater", wt && !hasWt);
    g.querySelector(".kh-kbody").setAttribute("transform", `translate(0 ${(-Math.abs(Math.sin(k.bob)) * (k.pose === "stand" ? 4 : 1.2)).toFixed(1)})`);
    g.querySelector(".kh-kflip").setAttribute("transform", `scale(${FLIP[k.dir]} 1)`);
    g.querySelector(".kh-kshadow").setAttribute("opacity", (k.z ? 0 : 0.16));
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
  // sit down: on a seat piece (chair / sofa / bench), or on the floor
  // a chair with a desk or table right beside it: the koala sits facing it (so you see its back)
  function deskDir(cell) {
    const st = curState();
    for (const [dc, dr, dir] of [[0, -1, 2], [-1, 0, 3], [1, 0, 1], [0, 1, 0]]) {
      const hit = (st.items || []).find((i) => /desk|table/i.test(i.id) && H.cellsOf(i).includes((cell[0] + dc) + "," + (cell[1] + dr)));
      if (hit) return dir;
    }
    return null;
  }
  function sitOn(seatItem, cell, exitCell) {
    const k = ses.koala;
    k.pose = "sit"; k.path = []; k.after = null; k.sitT = 4 + Math.random() * 5;
    if (seatItem) { const d = H.D[seatItem.id]; k.c = cell[0]; k.r = cell[1]; k.z = d.seat; k.seat = seatItem.uid; k.dir = H.seatFacing(seatItem); if (!(seatItem.m | 0)) { const dk = deskDir(cell); if (dk != null) k.dir = dk; } k.exit = exitCell || null; }
    else { k.z = 0; k.seat = null; k.exit = null; }
  }
  function standUp(quiet) {
    const k = ses.koala;
    if (k.pose === "stand") return;
    if (k.seat && k.exit && koalaCellFree(k.exit[0], k.exit[1])) { k.c = k.exit[0]; k.r = k.exit[1]; }
    k.pose = "stand"; k.z = 0; k.seat = null; k.exit = null; k.act = null;
    if (!quiet) k.wait = 0.8;
  }
  // doing something at a piece: reading at a shelf, tending a plant. The koala stands next to it, facing it.
  const actAt = (st, c, r) => (st.items || []).find((i) => { const d = H.D[i.id]; return d && d.act && H.cellsOf(i).includes(c + "," + r); }) || null;
  function doAct(item, cell) {
    const k = ses.koala, d = H.D[item.id], dc = cell[0] - k.c, dr = cell[1] - k.r;
    k.pose = d.act; k.act = item.uid; k.z = 0; k.seat = null; k.exit = null; k.path = []; k.after = null; k.sitT = 6 + Math.random() * 4; k.bob = 0;
    if (Math.abs(dc) >= Math.abs(dr)) k.dir = dc > 0 ? 1 : 3; else k.dir = dr > 0 ? 0 : 2;
  }
  function startAct(item) { // drag the koala onto the piece: it steps to a free tile beside it
    const k = ses.koala, cells = H.cellsOf(item).map((x) => x.split(",").map(Number)), from = [Math.round(k.c), Math.round(k.r)];
    let best = null;
    cells.forEach((cell) => neighbourFree(cell[0], cell[1]).forEach((n) => { const dist = Math.hypot(n[0] - from[0], n[1] - from[1]); if (!best || dist < best.dist) best = { n, cell, dist }; }));
    if (!best) { toast(T("옆에 설 자리가 없어요", "No free spot beside it"), true); return false; }
    standUp(true); k.c = best.n[0]; k.r = best.n[1]; doAct(item, best.cell);
    return true;
  }
  const neighbourFree = (c, r) => [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => [c + a, r + b]).filter((p) => koalaCellFree(p[0], p[1]));
  function koalaThink(dt) {
    const k = ses.koala, st = curState();
    if (k.pose === "sit") {
      if (k.seat && !st.items.some((i) => i.uid === k.seat)) { standUp(); return; }
      k.sitT -= dt; k.bob = 0;
      if (k.sitT <= 0) standUp();
      updateKoala(); return;
    }
    if (k.pose === "read" || k.pose === "water") {
      if (!st.items.some((i) => i.uid === k.act)) { standUp(); return; }
      k.sitT -= dt; k.bob += dt * 2.4;
      if (k.sitT <= 0) standUp();
      updateKoala(); return;
    }
    if (k.path.length) {
      const [tc, tr] = k.path[0], dc = tc - k.c, dr = tr - k.r, d = Math.hypot(dc, dr), step = 1.7 * dt;
      k.bob += dt * 11;
      if (d <= step) {
        k.c = tc; k.r = tr; k.path.shift();
        if (!k.path.length) {
          if (k.after) { const a = k.after; k.after = null; const piece = st.items.find((i) => i.uid === a.uid); if (piece) { if (a.kind === "act") doAct(piece, a.cell); else sitOn(piece, a.cell, [tc, tr]); } }
          else k.wait = 1.5 + Math.random() * 3;
        }
      } else { k.c += (dc / d) * step; k.r += (dr / d) * step; }
      if (Math.abs(dc) >= Math.abs(dr)) { if (dc) k.dir = dc > 0 ? 1 : 3; } else if (dr) k.dir = dr > 0 ? 0 : 2;
      updateKoala(); return;
    }
    k.wait -= dt; k.bob = 0;
    if (k.wait <= 0) {
      const room = curRoom(), cells = H.freeCells(room, st), from = [Math.round(k.c), Math.round(k.r)], roll = Math.random();
      const seats = st.items.filter((i) => H.D[i.id] && H.D[i.id].seat), acts = st.items.filter((i) => H.D[i.id] && H.D[i.id].act);
      const goTo = (piece, kind) => { // walk to a free tile beside the piece, then sit / read / water there
        for (const cell of H.cellsOf(piece).map((x) => x.split(",").map(Number))) {
          const adj = neighbourFree(cell[0], cell[1]).sort((a, b) => Math.hypot(a[0] - from[0], a[1] - from[1]) - Math.hypot(b[0] - from[0], b[1] - from[1]))[0];
          if (!adj) continue;
          const p = adj[0] === from[0] && adj[1] === from[1] ? [] : bfs(from, adj);
          if (p) { if (p.length) { k.path = p; k.after = { uid: piece.uid, cell, kind }; } else if (kind === "act") doAct(piece, cell); else sitOn(piece, cell, adj); return; }
        }
      };
      if (roll < 0.25 && seats.length) goTo(seats[Math.floor(Math.random() * seats.length)], "seat");
      else if (roll < 0.5 && acts.length) goTo(acts[Math.floor(Math.random() * acts.length)], "act");
      else if (roll < 0.6) sitOn(null);
      else for (let i = 0; i < 6 && !k.path.length && cells.length; i++) { const t = cells[Math.floor(Math.random() * cells.length)]; if (t[0] !== from[0] || t[1] !== from[1]) { const p = bfs(from, t); if (p && p.length) k.path = p; } }
      k.wait = 1;
    }
    updateKoala();
  }
  function loop(ts) {
    if (!ses) return;
    if (!ses.root.isConnected) { destroy(); return; }
    const dt = Math.min(0.05, (ts - ses.last) / 1000); ses.last = ts;
    if (ses.screen === "room" && !ses.edit && !ses.drag && !reduced()) koalaThink(dt);
    ses.raf = requestAnimationFrame(loop);
  }

  /* ---- scene drawing ---- */
  function drawScene() {
    const room = curRoom(), st = curState();
    ses.root.querySelector("#kh-scene").innerHTML = H.roomSvg(room, st, { label: roomLabel(room), extra: '<g class="kh-ghost"></g>' });
    const svg = ses.root.querySelector(".kh-room-svg");
    const layer = svg.querySelector(".kh-items");
    const tmp = document.createElementNS(NS, "svg"); tmp.innerHTML = koalaMarkup();
    layer.appendChild(tmp.firstChild);
    updateKoala();
    applySel();
    if (ses.zoom > 1) setZoom(ses.zoom);
  }
  function selEl() {
    if (!ses.sel) return null;
    if (ses.sel === "koala") return ses.root.querySelector(".kh-koala");
    if (ses.sel === "house") return ses.root.querySelector(".kh-house");
    return ses.root.querySelector(`.kh-it[data-uid="${ses.sel}"]`);
  }
  function applySel() {
    ses.root.querySelectorAll(".kh-sel").forEach((e) => e.classList.remove("kh-sel"));
    const e = selEl(); if (e) e.classList.add("kh-sel");
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
    const room = curRoom();
    st.items.forEach((i) => {
      const d = H.D[i.id]; if (!d || !d.stack) return;
      const occ = H.occ(room, st, i.uid)[H.cellsOf(i)[0]] || [];
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
    const mid = room.kind === "yard" ? [room.C / 2, room.R * 0.7] : [room.C / 2, room.R / 2];
    cells.sort((a, b) => Math.hypot(a[0] - mid[0], a[1] - mid[1]) - Math.hypot(b[0] - mid[0], b[1] - mid[1]));
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
    st.items.push(piece); recalcZ(st); leaveSubs();
    ses.sel = piece.uid; save(); drawScene(); showMenu();
    return piece;
  }

  /* ---- selection menu ---- */
  function hideMenu() { const m = ses.root.querySelector("#kh-menu"); if (m) m.hidden = true; }
  function showMenu() {
    const m = ses.root.querySelector("#kh-menu");
    if (!m) return;
    const target = selEl();
    if (!ses.sel || !ses.edit || !target) { m.hidden = true; return; }
    let name, btns;
    const b = (act, icon, label, cls) => `<button type="button" class="kh-mbtn${cls ? " " + cls : ""}" data-act="${act}" aria-label="${esc(label)}">${ic(icon)}<span>${esc(label)}</span></button>`;
    const turn = b("rotl", "rotl", T("왼쪽", "Left")) + b("rot", "rot", T("오른쪽", "Right"));
    if (ses.sel === "koala") {
      const up = ses.koala.pose !== "stand";
      name = T("코알라", "Koala");
      btns = turn + b("sit", up ? "stand" : "sit", up ? T("일어서기", "Stand") : T("앉기", "Sit"));
    } else if (ses.sel === "house") {
      name = T("집", "House");
      btns = b("hl", "left", T("왼쪽 이동", "Move left")) + b("hr", "right", T("오른쪽 이동", "Move right")) + turn;
    } else {
      const it = curState().items.find((x) => x.uid === ses.sel);
      if (!it) { m.hidden = true; return; }
      const d = H.D[it.id];
      name = nm(d);
      btns = (d.wall ? "" : turn) + (d.subKind && curOpts.subs ? b("subs", "inside", T("안쪽 꾸미기", "Inside"), "accent") : "") + b("del", "trash", T("치우기", "Remove"), "danger");
    }
    m.innerHTML = `<div class="kh-mhead"><b>${esc(name)}</b><button type="button" class="kh-mclose" data-act="x" aria-label="${T("닫기", "Close")}">${ic("x")}</button></div><div class="kh-mrow">${btns}</div>`;
    m.hidden = false;
    const sr = ses.root.querySelector("#kh-stage").getBoundingClientRect(), tr = target.getBoundingClientRect();
    const w = m.offsetWidth, h = m.offsetHeight;
    let x = tr.left + tr.width / 2 - sr.left - w / 2, y = tr.top - sr.top - h - 8;
    if (y < 56) y = tr.bottom - sr.top + 8;
    x = Math.max(6, Math.min(sr.width - w - 6, x)); y = Math.max(56, Math.min(sr.height - h - 6, y));
    m.style.left = x + "px"; m.style.top = y + "px";
    m.querySelectorAll("[data-act]").forEach((bt) => { bt.onclick = (e) => { e.stopPropagation(); menuAct(bt.dataset.act); }; });
  }
  function yardValid(y) { // does everything standing in the yard still fit after a change?
    const dm = H.yardDims(y), rc = H.houseRect(y), virt = H.occ(Object.assign({ kind: "yard" }, dm), Object.assign({}, y, { items: [] }));
    return y.items.every((i) => {
      const d = H.D[i.id]; if (!d || d.wall) return true;
      const f = H.footprint(i);
      if (i.c < 0 || i.r < 0 || i.c + f.w > dm.C || i.r + f.d > dm.R) return false;
      return H.cellsOf(i).every((k) => { const [c, r] = k.split(",").map(Number); return !(c >= rc.c0 && c < rc.c1 && r >= rc.r0 && r < rc.r1) && (d.flat || !virt[k]); });
    });
  }
  function menuAct(act) {
    const st = curState();
    if (act === "x") { ses.sel = null; applySel(); hideMenu(); return; }
    if (ses.sel === "koala") {
      const k = ses.koala;
      if (act === "rot" || act === "rotl") { k.dir = (k.dir + (act === "rot" ? 1 : 3)) % 4; updateKoala(); }
      else if (act === "sit") { if (k.pose === "sit") standUp(true); else { const s = H.seatAt(st, Math.round(k.c), Math.round(k.r)); sitOn(s || null, [Math.round(k.c), Math.round(k.r)]); } updateKoala(); showMenu(); }
      return;
    }
    if (ses.sel === "house") {
      const y = JSON.parse(JSON.stringify(ses.S.yard)); y.house = y.house || {};
      if (act === "rot" || act === "rotl") { y.house.rot = y.house.rot ? 0 : 1; y.house.shift = 0; }
      else if (act === "hl" || act === "hr") y.house.shift = (y.house.shift || 0) + (act === "hr" ? 1 : -1);
      const before = H.houseRect(ses.S.yard), after = H.houseRect(y);
      if (before.c0 === after.c0 && before.r0 === after.r0 && before.rot === after.rot) { toast(T("더 못 움직여요", "It can't go further"), true); return; }
      if (!yardValid(y)) { toast(T("집 자리에 있는 물건을 먼저 치워요", "Move the things in the way first"), true); return; }
      ses.S.yard = y; save(); drawScene(); placeKoalaFree(); updateKoala(); showMenu(); return;
    }
    const it = st.items.find((x) => x.uid === ses.sel);
    if (!it) return;
    if (act === "del") { leaveSubs(); st.items = st.items.filter((x) => x.uid !== it.uid); ses.sel = null; recalcZ(st); save(); drawScene(); hideMenu(); placeKoalaFree(); updateKoala(); return; }
    if (act === "subs") { ses.subOf = it.uid; hideMenu(); drawPanel(); return; }
    if (act === "rot" || act === "rotl") {
      const room = curRoom(), want = Object.assign({}, it, { m: ((it.m | 0) + (act === "rot" ? 1 : 3)) % 4 });
      let ok = null;
      for (const [dc, dr] of [[0, 0], [-1, 0], [0, -1], [-1, -1], [1, 0], [0, 1], [1, 1], [-2, 0], [0, -2]]) {
        const p = Object.assign({}, want, { c: want.c + dc, r: want.r + dr }), res = H.canPlace(room, st, p, it.uid);
        if (res.ok) { p.z = res.z; ok = p; break; }
      }
      if (!ok) { toast(T("여기선 돌릴 수 없어요", "No space to turn it here"), true); return; }
      const riders = (H.D[it.id].topH && !H.D[it.id].stack) ? st.items.filter((o) => o.uid !== it.uid && H.D[o.id].stack && H.cellsOf(it).includes(H.cellsOf(o)[0])) : [];
      riders.forEach((o) => { o.c = ok.c; o.r = ok.r; });
      Object.assign(it, ok); recalcZ(st); save(); drawScene(); showMenu();
    }
  }

  /* ---- what is inside furniture (sub-items): shown in the right-hand / lower panel, like opening a folder ---- */
  function leaveSubs() { if (ses.subOf) { ses.subOf = null; drawPanel(); } }
  function subsPanel(panel, it) {
    const d = H.D[it.id], kind = d.subKind, api = curOpts.subs, list = api.list(kind), grp = {}; list.forEach((e) => { grp[e.id] = e.group; });
    const cur = it.sub || [], tabs = tabsFor(ses.roomId === "yard"), cat = (tabs.find((t) => t[0] === d.cat) || [0, 0, T("가구", "Furniture")])[2];
    const icon = (e) => { const v = H.subVis(e.id); return v ? `<span class="kh-subic" style="background:${v[1]}" aria-hidden="true">${v[0]}</span>` : `<span class="kh-subic" style="background:${H.bookColor(e.id)}" aria-hidden="true">📖</span>`; };
    const groups = Array.from(new Set(list.map((e) => e.group))), gname = { main: "", top: T("책상 위", "On top"), drawer: T("서랍 속", "In the drawer") };
    const title = { books: T("책장 속 책", "Books on the shelf"), desk: T("책상 위·서랍", "On the desk"), frame: T("액자 그림", "Picture"), toys: T("장난감 상자", "Toys") }[kind] || nm(d);
    const note = kind === "books" && !it.sub ? T("지금은 기본 책이 꽂혀 있어요. 골라 넣으면 바뀌어요.", "Default books for now — pick some to replace them.") : T("눌러서 넣고 빼요. 코인으로 새 물건도 살 수 있어요.", "Tap to put in or take out. New things cost coins.");
    panel.innerHTML = `<nav class="kh-crumbs" aria-label="${T("현재 위치", "You are here")}"><button type="button" class="kh-up" data-up aria-label="${T("상위로", "Up one level")}">${ic("up")}</button>
      <button type="button" class="kh-crumb" data-up>${esc(cat)}</button><span class="kh-sep">${ic("chev")}</span><span class="kh-crumb cur">${esc(nm(d))}</span></nav>
      <div class="kh-grid" id="kh-grid">${shelfHead(title)}<p class="kh-subnote">${note}</p>${groups.map((g) => `${gname[g] ? `<h3>${gname[g]}</h3>` : ""}<div class="kh-subgrid">${list.filter((e) => e.group === g).map((e) => { const on = cur.includes(e.id); return `<button type="button" class="kh-subitem${on ? " on" : ""}${e.owned ? "" : " locked"}" data-sub="${e.id}" aria-pressed="${on}">${icon(e)}<span class="kh-nm">${esc(T(e.name[0], e.name[1]))}</span>${e.owned ? (on ? `<span class="kh-pr kh-ok">${ic("check")}</span>` : "") : `<span class="kh-pr">${COIN}${e.cost}</span>`}</button>`; }).join("")}</div>`).join("")}
      ${it.sub && kind === "books" ? `<button type="button" class="kh-btn alt kh-clear" data-reset>${T("기본 책으로", "Default books")}</button>` : ""}</div>`;
    panel.querySelectorAll("[data-up]").forEach((x) => { x.onclick = () => { ses.subOf = null; drawPanel(); }; });
    const rs = panel.querySelector("[data-reset]"); if (rs) rs.onclick = () => { delete it.sub; save(); drawScene(); drawPanel(); };
    panel.querySelectorAll("[data-sub]").forEach((bt) => {
      bt.onclick = () => {
        const e = list.find((x) => x.id === bt.dataset.sub);
        const toggle = () => {
          let sub = (it.sub || []).slice();
          const at = sub.indexOf(e.id);
          if (at >= 0) sub.splice(at, 1);
          else {
            if (kind === "frame") sub = [];
            const same = sub.filter((x) => grp[x] === e.group), lim = api.limit(kind, e.group) || 99;
            if (same.length >= lim) sub.splice(sub.indexOf(same[0]), 1);
            sub.push(e.id);
          }
          it.sub = sub; save(); drawScene(); drawPanel();
        };
        if (e.owned) toggle();
        else buy(T(e.name[0], e.name[1]), icon(e), e.cost, "sub:" + e.id, () => { e.owned = true; toggle(); }, () => api.buy(e.id));
      };
    });
  }

  /* ---- dragging ---- */
  function ghostFor(drag) {
    const p = drag.piece, d = H.D[p.id];
    if (d && d.wall) return H.wallItemSvg(p);
    const f = H.footprint(p), c0 = Math.round(p.c), r0 = Math.round(p.r);
    const quad = [H.proj(c0, r0, 0), H.proj(c0 + f.w, r0, 0), H.proj(c0 + f.w, r0 + f.d, 0), H.proj(c0, r0 + f.d, 0)].map((q) => q.map((v) => v.toFixed(1)).join(",")).join(" ");
    const poly = `<polygon class="kh-foot ${drag.valid ? "ok" : "bad"}" points="${quad}"/>`;
    if (drag.koala) return poly;
    const q = Object.assign({}, p, { c: c0, r: r0 });
    return poly + H.floorItemSvg(q) + (drag.riders || []).map((rd) => H.floorItemSvg(Object.assign({}, rd.it, { c: c0 + rd.dc, r: r0 + rd.dr }))).join("");
  }
  function itemUnder(ev, st) { // a placed piece the koala can act on, seen under the pointer (its drawn body, not just its floor tile)
    const els = document.elementsFromPoint(ev.clientX, ev.clientY);
    for (const el of els) { const g = el.closest && el.closest(".kh-it[data-uid]"); if (g) { const it = st.items.find((x) => x.uid === g.dataset.uid); if (it && H.D[it.id] && H.D[it.id].act) return it; } }
    return null;
  }
  function updateDrag(ev) {
    const drag = ses.drag, room = curRoom(), st = curState(), p = toScene(ev);
    drag.under = drag.koala ? itemUnder(ev, st) : null;
    if (drag.house) { drag.overStage = true; return; }
    const d = H.D[drag.piece.id];
    if (d && d.wall) {
      Object.assign(drag.piece, wallTarget(p.x, p.y, d, room));
      drag.valid = !wallOverlap(st, drag.piece, drag.uid);
    } else {
      const g = cellOf(p.x, p.y + (drag.fromPanel ? 20 : 0)), f = H.footprint(drag.piece);
      drag.piece.c = Math.round(drag.fromPanel ? g.c - f.w / 2 : g.c - drag.grab.c);
      drag.piece.r = Math.round(drag.fromPanel ? g.r - f.d / 2 : g.r - drag.grab.r);
      if (drag.koala) { const c = drag.piece.c, r = drag.piece.r; drag.valid = koalaCellFree(c, r) || !!H.seatAt(st, c, r) || !!actAt(st, c, r) || !!drag.under; }
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
      if (drag.uid || drag.koala || drag.house) {
        ses.sel = drag.uid || (drag.koala ? "koala" : "house"); applySel(); showMenu();
        if (drag.koala) { const g = ses.root.querySelector(".kh-kbody"); if (g) { g.classList.remove("hop"); void g.getBoundingClientRect(); g.classList.add("hop"); } }
      }
      return;
    }
    if (drag.house) return;
    if (drag.koala) {
      const c = Math.round(drag.piece.c), r = Math.round(drag.piece.r), k = ses.koala;
      if (drag.overStage) {
        const seat = H.seatAt(st, c, r), act = seat ? null : (drag.under || actAt(st, c, r));
        if (seat) sitOn(seat, [c, r], neighbourFree(c, r)[0] || null);
        else if (act) startAct(act);
        else if (koalaCellFree(c, r)) { standUp(true); k.c = c; k.r = r; k.path = []; }
      }
      ses.sel = "koala"; drawScene(); showMenu(); return;
    }
    if (drag.uid) { // moving a placed piece
      if (!drag.overStage) { st.items = st.items.filter((x) => x.uid !== drag.uid); (drag.riders || []).forEach((rd) => { const it = st.items.find((x) => x.uid === rd.it.uid); if (it) it.z = 0; }); ses.sel = null; recalcZ(st); save(); drawScene(); hideMenu(); placeKoalaFree(); toast(T("치웠어요", "Put away")); return; }
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
      const g = ev.target.closest && ev.target.closest(".kh-it:not(.kh-fixed),.kh-koala,.kh-house");
      if (!g) {
        if (ses.sel) { ses.sel = null; applySel(); hideMenu(); }
        leaveSubs();
        if (ses.zoom > 1) { // drag the background to look around
          const sc = ses.root.querySelector("#kh-scene"), x0 = ev.clientX, y0 = ev.clientY, l0 = sc.scrollLeft, t0 = sc.scrollTop;
          const mv = (e) => { sc.scrollLeft = l0 - (e.clientX - x0); sc.scrollTop = t0 - (e.clientY - y0); };
          const up = () => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); };
          window.addEventListener("pointermove", mv); window.addEventListener("pointerup", up);
        }
        return;
      }
      ev.preventDefault();
      const st = curState(), p = toScene(ev);
      if (g.classList.contains("kh-koala")) {
        const k = ses.koala, gc = cellOf(p.x, p.y);
        beginDrag(ev, { koala: true, piece: { id: "stoolBlue", c: Math.round(k.c), r: Math.round(k.r), m: 0, z: 0 }, grab: { c: gc.c - k.c, r: gc.r - k.r } });
        return;
      }
      if (g.classList.contains("kh-house")) { beginDrag(ev, { house: true, piece: { id: "stoolBlue", c: 0, r: 0, m: 0 } }); return; }
      const it = st.items.find((x) => x.uid === g.dataset.uid);
      if (!it) return;
      const d = H.D[it.id];
      if (ses.sel !== it.uid) { ses.sel = it.uid; applySel(); hideMenu(); if (ses.subOf !== it.uid) leaveSubs(); }
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
    const subIt = ses.subOf && curState().items.find((i) => i.uid === ses.subOf);
    if (ses.subOf && !(subIt && H.D[subIt.id] && H.D[subIt.id].subKind && curOpts.subs)) ses.subOf = null;
    if (ses.subOf) { subsPanel(panel, subIt); return; }
    panel.innerHTML = `${chipsHtml(tabs, ses.tab)}<div class="kh-grid" id="kh-grid">${gridHtml(yard)}</div>`;
    panel.querySelectorAll("[data-tab]").forEach((b) => { b.onclick = () => { ses.tab = b.dataset.tab; drawPanel(); }; });
    wireGrid(panel.querySelector("#kh-grid"), yard);
  }
  function swatch(kind, key, def, own, on) {
    return `<button type="button" class="kh-sw${on ? " on" : ""}${own ? "" : " locked"}" data-sw="${kind}:${key}" aria-label="${esc(T(def.n[0], def.n[1]))}" aria-pressed="${on}"><span class="kh-sw-c" style="background:${def.c};box-shadow:inset 0 0 0 5px ${def.a}"></span><span class="kh-sw-n">${esc(T(def.n[0], def.n[1]))}</span>${own ? "" : `<span class="kh-pr">${COIN}${def.p}</span>`}</button>`;
  }
  const HOUSE_IC = { cottage: "🏡", villa: "🏘️", twoStory: "🏠", modern: "🏢", cabin: "🛖", castle: "🏰" };
  const optBtn = (attr, key, on, ic, label, price, own) => `<button type="button" class="kh-sw kh-opt${on ? " on" : ""}${own === false ? " locked" : ""}" ${attr}="${key}" aria-pressed="${on}"><span class="kh-optic" aria-hidden="true">${ic}</span><span class="kh-sw-n">${esc(label)}</span>${own === false ? `<span class="kh-pr">${COIN}${price}</span>` : ""}</button>`;
  function gridHtml(yard) {
    const st = curState(), S = ses.S;
    if (ses.tab === "style") {
      return `<h3>${T("벽지", "Wallpaper")}</h3><div class="kh-sws">${Object.keys(H.WALLS).map((k) => swatch("wall", k, H.WALLS[k], H.WALLS[k].p === 0 || !!S.walls[k], st.wall === k)).join("")}</div><h3>${T("바닥", "Floor")}</h3><div class="kh-sws">${Object.keys(H.FLOORS).filter((k) => !H.FLOORS[k].yard).map((k) => swatch("floor", k, H.FLOORS[k], H.FLOORS[k].p === 0 || !!S.floors[k], st.floor === k)).join("")}</div>`;
    }
    if (ses.tab === "house") {
      const h = st.house || {};
      const grp = (title, kind, set) => `<h3>${title}</h3><div class="kh-sws">${Object.keys(set).map((k) => `<button type="button" class="kh-sw${h[kind] === k ? " on" : ""}" data-house="${kind}:${k}" aria-pressed="${h[kind] === k}" aria-label="${esc(T(set[k][0], set[k][1]))}"><span class="kh-sw-c" style="background:${set[k][2]}"></span><span class="kh-sw-n">${esc(T(set[k][0], set[k][1]))}</span></button>`).join("")}</div>`;
      return `<h3>${T("집 모양", "House style")}</h3><div class="kh-sws">${Object.keys(H.HOUSE_STYLES).map((k) => { const d = H.HOUSE_STYLES[k]; return optBtn("data-hstyle", k, h.style === k, HOUSE_IC[k], T(d.n[0], d.n[1]), d.p, d.p === 0 || !!S.houseStyles[k]); }).join("")}</div>
        <h3>${T("집 돌리기·옮기기", "Turn & move the house")}</h3><div class="kh-sws">${optBtn("data-hctl", "rot", false, "🔄", T("돌리기", "Turn"))}${optBtn("data-hctl", "hl", false, "◀", T("왼쪽", "Left"))}${optBtn("data-hctl", "hr", false, "▶", T("오른쪽", "Right"))}</div>
        ${grp(T("외벽", "Walls"), "wall", H.HOUSE_WALLS)}${grp(T("지붕", "Roof"), "roof", H.HOUSE_ROOFS)}${grp(T("현관문", "Door"), "door", H.HOUSE_DOORS)}`;
    }
    if (ses.tab === "garden") {
      const own = (kind, key, p) => !p || !!(S[kind] && S[kind][key]);
      return `<h3>${T("정원 모양 (한 번에 바꾸기)", "Garden looks")}</h3><div class="kh-sws">${Object.keys(H.GARDEN_PRESETS).map((k) => { const g = H.GARDEN_PRESETS[k], fl = H.FLOORS[g.floor]; return `<button type="button" class="kh-sw kh-opt${st.floor === g.floor && st.border === g.border && st.path === g.path && st.size === g.size ? " on" : ""}" data-gpreset="${k}"><span class="kh-sw-c" style="background:${fl.c};box-shadow:inset 0 0 0 5px ${fl.a}"></span><span class="kh-sw-n">${esc(T(g.n[0], g.n[1]))}</span></button>`; }).join("")}</div>
        <h3>${T("땅", "Ground")}</h3><div class="kh-sws">${Object.keys(H.FLOORS).filter((k) => H.FLOORS[k].yard).map((k) => swatch("floor", k, H.FLOORS[k], H.FLOORS[k].p === 0 || !!S.floors[k], st.floor === k)).join("")}</div>
        <h3>${T("울타리", "Border")}</h3><div class="kh-sws">${Object.keys(H.BORDERS).map((k) => optBtn("data-gborder", k, (st.border || "none") === k, { none: "∅", fence: "🚧", hedge: "🌿", stone: "🧱" }[k], T(H.BORDERS[k][0], H.BORDERS[k][1]))).join("")}</div>
        <h3>${T("길", "Path")}</h3><div class="kh-sws">${Object.keys(H.PATHS).map((k) => optBtn("data-gpath", k, (st.path || "none") === k, { none: "∅", stones: "🪨", brick: "🟫", plank: "🪵" }[k], T(H.PATHS[k][0], H.PATHS[k][1]))).join("")}</div>
        <h3>${T("마당 크기", "Yard size")}</h3><div class="kh-sws">${Object.keys(H.YARD_SIZES).map((k) => { const z = H.YARD_SIZES[k]; return optBtn("data-gsize", k, (st.size || "normal") === k, `${z.C}×${z.R}`, T(z.n[0], z.n[1]), z.p, own("yardSizes", k, z.p)); }).join("")}</div>`;
    }
    const list = Object.values(H.D).filter((d) => !d.virtual && d.cat === ses.tab && (d.where === "both" || d.where === (yard ? "out" : "in"))).sort((a, b) => a.price - b.price);
    const haveN = list.filter(ownedItem).length, tabName = (tabsFor(yard).find((t) => t[0] === ses.tab) || [0, 0, ""])[2];
    return `${shelfHead(tabName, `${haveN}/${list.length}`)}<div class="kh-items-grid">${list.map((d) => { const own = ownedItem(d); return `<button type="button" class="kh-item${own ? "" : " locked"}" data-item="${d.id}" aria-label="${esc(nm(d))}${own ? "" : ", " + d.price}">${H.thumbSvg(d.id)}<span class="kh-nm">${esc(nm(d))}</span>${own ? "" : `<span class="kh-pr">${COIN}${d.price}</span>`}</button>`; }).join("")}</div>`;
  }
  // change the yard; may cost coins (a new size / ground / house style)
  function planYard(patch, price, why, label) {
    const y = JSON.parse(JSON.stringify(ses.S.yard));
    const house = patch.house; const rest = Object.assign({}, patch); delete rest.house;
    if (house) y.house = Object.assign(y.house || {}, house);
    Object.assign(y, rest);
    if (!yardValid(y)) { toast(T("마당 밖·집 자리에 있는 물건을 먼저 치워 주세요", "Move the things that would be in the way first"), true); return null; }
    return { y, price, why, label };
  }
  function runYard(plan, mark) {
    if (!plan) return;
    const apply = () => { if (mark) mark(); ses.S.yard = plan.y; save(); drawScene(); drawPanel(); placeKoalaFree(); updateKoala(); };
    if (plan.price > 0) buy(plan.label, `<span class="kh-buy-thumb">🏡</span>`, plan.price, plan.why, apply); else apply();
  }
  function wireGrid(grid, yard) {
    const S = ses.S;
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
        if (!ownedItem(d)) { buy(nm(d), `<span class="kh-buy-thumb">${H.thumbSvg(id)}</span>`, d.price, "house:" + id, () => { S.owned[id] = 1; save(); drawPanel(); placeNew(id); }); return; }
        placeNew(id); placeKoalaFree(); updateKoala();
      });
    });
    grid.querySelectorAll("[data-sw]").forEach((b) => {
      b.onclick = () => {
        const [kind, key] = b.dataset.sw.split(":"), def = (kind === "wall" ? H.WALLS : H.FLOORS)[key], store = kind === "wall" ? S.walls : S.floors, own = def.p === 0 || !!store[key];
        if (yard && kind === "floor") { runYard(planYard({ floor: key }, own ? 0 : def.p, "floor:" + key, T(def.n[0], def.n[1])), () => { store[key] = 1; }); return; }
        const apply = () => { curState()[kind] = key; save(); drawScene(); drawPanel(); };
        if (own) apply(); else buy(T(def.n[0], def.n[1]), `<span class="kh-sw-c big" style="background:${def.c};box-shadow:inset 0 0 0 8px ${def.a}"></span>`, def.p, kind + ":" + key, () => { store[key] = 1; apply(); });
      };
    });
    grid.querySelectorAll("[data-house]").forEach((b) => { b.onclick = () => { const [kind, key] = b.dataset.house.split(":"); const st = curState(); st.house = st.house || {}; st.house[kind] = key; save(); drawScene(); drawPanel(); }; });
    grid.querySelectorAll("[data-hstyle]").forEach((b) => {
      b.onclick = () => { const k = b.dataset.hstyle, d = H.HOUSE_STYLES[k], own = d.p === 0 || !!S.houseStyles[k]; runYard(planYard({ house: { style: k, shift: 0 } }, own ? 0 : d.p, "house:" + k, T(d.n[0], d.n[1])), () => { S.houseStyles[k] = 1; }); };
    });
    grid.querySelectorAll("[data-hctl]").forEach((b) => { b.onclick = () => { ses.sel = "house"; menuAct(b.dataset.hctl); ses.sel = null; applySel(); hideMenu(); }; });
    grid.querySelectorAll("[data-gborder]").forEach((b) => { b.onclick = () => runYard(planYard({ border: b.dataset.gborder }, 0, "", ""), null); });
    grid.querySelectorAll("[data-gpath]").forEach((b) => { b.onclick = () => runYard(planYard({ path: b.dataset.gpath }, 0, "", ""), null); });
    grid.querySelectorAll("[data-gsize]").forEach((b) => {
      b.onclick = () => { const k = b.dataset.gsize, z = H.YARD_SIZES[k], own = z.p === 0 || !!S.yardSizes[k]; runYard(planYard({ size: k }, own ? 0 : z.p, "yard:" + k, T(z.n[0], z.n[1])), () => { S.yardSizes[k] = 1; }); };
    });
    grid.querySelectorAll("[data-gpreset]").forEach((b) => {
      b.onclick = () => {
        const g = H.GARDEN_PRESETS[b.dataset.gpreset], fl = H.FLOORS[g.floor], z = H.YARD_SIZES[g.size];
        const cost = (fl.p && !S.floors[g.floor] ? fl.p : 0) + (z.p && !S.yardSizes[g.size] ? z.p : 0);
        runYard(planYard({ floor: g.floor, border: g.border, path: g.path, size: g.size }, cost, "garden:" + b.dataset.gpreset, T(g.n[0], g.n[1])), () => { S.floors[g.floor] = 1; S.yardSizes[g.size] = 1; });
      };
    });
  }

  /* ------------------------------ 3D wardrobe (Character tab) ------------------------------ */
  // The 3D koala as a small picture (the Character tab's status card uses it). worn: { slot: name } (default: what is saved).
  function koala3d(worn, cls) {
    const w = worn || (H.load().worn || {});
    const names = ["base"].concat(KORDER.filter((n) => Object.values(w).includes(n)));
    const imgs = names.map((n) => { const b = KBOX[n]; return `<image href="${kimg(n)}" x="${b[0]}" y="${b[1]}" width="${b[2] - b[0]}" height="${b[3] - b[1]}"/>`; }).join("");
    return `<svg class="${cls || "kh-k3d"}" viewBox="64 130 553 840" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="3D Koala" focusable="false">${imgs}</svg>`;
  }
  // wall + floor behind the 3D koala: the same room backdrop the 2D koala stands in
  function wardBackdrop() {
    if (!window.KoalaArt || !KoalaArt.room) return "";
    return KoalaArt.room({}, {}, { bare: true }).replace('class="koala-room-svg"', 'class="kh-ward-bg" preserveAspectRatio="xMidYMax slice"');
  }
  let wardSlot = "hat";
  function mountWardrobe(root, opts) {
    if (ses) destroy();
    curOpts = opts;
    const S = H.load();
    S.worn = S.worn || {};
    const slotName = { hat: T("머리", "Head"), face: T("얼굴", "Face"), neck: T("목", "Neck"), body: T("몸", "Body"), back: T("등", "Back") };
    const slots = Object.keys(KSLOT);
    if (!KSLOT[wardSlot]) wardSlot = slots[0];
    const draw = () => {
      const names = ["base"].concat(KORDER.filter((n) => Object.values(S.worn).includes(n)));
      const imgs = names.map((n) => { const b = KBOX[n]; return `<image href="${kimg(n)}" x="${b[0]}" y="${b[1]}" width="${b[2] - b[0]}" height="${b[3] - b[1]}"/>`; }).join("");
      const wornN = slots.filter((sl) => S.worn[sl]).length;
      root.className = "kh-app kh-embed kh-ward";
      fit(root);
      root.innerHTML = `<div class="kh-ward-stage" id="kh-wstage">${wardBackdrop()}<svg class="kh-ward-koala" viewBox="64 20 553 970" role="img" aria-label="${T("3D 코알라", "3D Koala")}"><ellipse cx="340" cy="962" rx="205" ry="22" fill="#000" opacity=".16"/><g class="kh-wbody">${imgs}</g></svg><p class="kh-ward-tip">${T("코알라를 눌러 보세요!", "Tap the koala!")}</p></div>
        <aside class="kh-panel">${chipsHtml(slots.map((sl) => [sl, "", slotName[sl]]), wardSlot)}
        <div class="kh-grid">${shelfHead(slotName[wardSlot], `${S.worn[wardSlot] ? 1 : 0}/${KSLOT[wardSlot].length}`)}<div class="kh-items-grid">${KSLOT[wardSlot].map((n) => `<button type="button" class="kh-item kh-kitem${S.worn[wardSlot] === n ? " on" : ""}" data-wear="${wardSlot}:${n}" aria-pressed="${S.worn[wardSlot] === n}"><img src="${kimg(n)}" alt="" draggable="false"><span class="kh-nm">${esc(T(KNAME[n][0], KNAME[n][1]))}</span><span class="kh-pr kh-state">${S.worn[wardSlot] === n ? T("입는 중", "Wearing") : T("입기", "Wear")}</span></button>`).join("")}</div>
        ${wornN ? `<button type="button" class="kh-btn alt kh-clear" data-clear>${T("모두 벗기기", "Take everything off")}</button>` : ""}</div></aside>`;
      root.querySelectorAll("[data-tab]").forEach((b) => { b.onclick = () => { wardSlot = b.dataset.tab; draw(); }; });
      root.querySelectorAll("[data-wear]").forEach((b) => { b.onclick = () => { const [slot, n] = b.dataset.wear.split(":"); if (S.worn[slot] === n) delete S.worn[slot]; else S.worn[slot] = n; H.persist(S); window.dispatchEvent(new CustomEvent("kh-worn")); draw(); }; });
      const clr = root.querySelector("[data-clear]"); if (clr) clr.onclick = () => { S.worn = {}; H.persist(S); window.dispatchEvent(new CustomEvent("kh-worn")); draw(); };
      const kb = root.querySelector(".kh-wbody"); root.querySelector("#kh-wstage").onclick = () => { kb.classList.remove("hop"); void kb.getBoundingClientRect(); kb.classList.add("hop"); };
    };
    draw();
  }

  window.KoalaHouse.mount = mount;
  window.KoalaHouse.unmount = destroy;
  window.KoalaHouse.mountWardrobe = mountWardrobe;
  window.KoalaHouse.koala3d = koala3d;
})();
