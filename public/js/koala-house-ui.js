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
  const KBOX = Object.assign({ base: [64, 222, 617, 968], hoodie: [122, 528, 562, 819], backpack: [131, 545, 560, 832], scarf: [185, 531, 497, 780], glasses: [162, 362, 520, 500], bushhat: [108, 188, 574, 441], partyhat: [259, 100, 422, 290], crown: [249, 190, 433, 295] }, {"bluecap": [151, 180, 530, 403], "gradhat": [135, 133, 546, 400], "flowercrown": [139, 198, 540, 415], "wizardhat": [189, 22, 492, 345], "santahat": [70, 111, 589, 376], "beanie": [150, 89, 534, 419], "cowboyhat": [76, 123, 607, 327], "chefhat": [171, 42, 514, 297], "bunnyears": [166, 66, 508, 362]}, {"sunglasses": [151, 369, 531, 495], "starglasses": [151, 344, 541, 507], "heartglasses": [187, 364, 494, 509], "cateye": [142, 352, 540, 499], "goggles": [142, 352, 540, 493], "eyepatch": [228, 269, 536, 485], "moustache": [250, 462, 436, 528], "freckles": [176, 456, 506, 517], "monocle": [356, 362, 499, 503]}, {"pearlnecklace": [233, 546, 451, 633], "goldchain": [233, 551, 448, 653], "heartpendant": [276, 555, 409, 664], "starpendant": [271, 560, 409, 662], "diamondpendant": [270, 556, 412, 662], "bowtie": [240, 528, 443, 631], "rubybrooch": [352, 572, 439, 694], "goldmedal": [246, 552, 430, 765]}, {"tshirt": [148, 539, 537, 821], "stripeshirt": [104, 543, 579, 815], "pinkdress": [117, 544, 566, 848], "labcoat": [119, 538, 564, 866], "overalls": [149, 549, 536, 935], "jersey": [131, 548, 560, 826]}, {"herocape": [146, 705, 539, 875], "angelwings": [68, 281, 616, 642], "butterflywings": [73, 432, 607, 790], "surfboard": [243, 32, 564, 584]}, {"sneakers": [214, 867, 470, 965], "rainboots": [198, 832, 488, 978], "cowboyboots": [189, 815, 493, 978], "balletshoes": [199, 850, 485, 987], "bunnyslippers": [185, 837, 497, 978], "soccercleats": [192, 882, 490, 975], "sandals": [199, 875, 485, 970], "rollerskates": [183, 845, 500, 1030]}, {"jeans": [181, 703, 502, 895], "khakishorts": [180, 680, 505, 894], "plaidskirt": [151, 609, 530, 861], "tutu": [97, 659, 588, 862], "cargopants": [178, 698, 505, 895], "sweatpants": [180, 648, 504, 895], "denimskirt": [153, 652, 524, 863], "flowerskirt": [137, 649, 549, 872]});
  const K3 = {"base":[52,20,1051,1361],"backpack":[52,320,1013,1201],"herocape":[104,643,983,1276],"angelwings":[29,333,1103,1361],"butterflywings":[162,331,1008,1361],"surfboard":[80,7,1058,1359],"bushhat":[97,17,1046,493],"partyhat":[190,1,763,512],"crown":[189,34,769,466],"bluecap":[190,32,896,507],"gradhat":[189,27,1054,472],"flowercrown":[189,122,956,480],"wizardhat":[59,1,1059,780],"santahat":[114,9,893,617],"beanie":[188,2,1052,545],"cowboyhat":[187,17,1042,478],"chefhat":[81,0,1024,734],"bunnyears":[80,0,982,691]}; // 3/4-back sitting pictures: [x0,y0,x1,y1] in source pixels
  const KBEHIND = ["herocape", "angelwings", "butterflywings", "surfboard"];
  const kordered = (worn) => { const w = Object.values(worn || {}); return KBEHIND.filter((n) => w.includes(n)).concat(["base"], KORDER.filter((n) => w.includes(n))); };
  const KORDER = ["backpack", "hoodie", "tshirt", "stripeshirt", "pinkdress", "labcoat", "overalls", "jersey", "jeans", "khakishorts", "cargopants", "sweatpants", "plaidskirt", "denimskirt", "flowerskirt", "tutu", "sneakers", "rainboots", "cowboyboots", "balletshoes", "bunnyslippers", "soccercleats", "sandals", "rollerskates", "scarf", "pearlnecklace", "goldchain", "heartpendant", "starpendant", "diamondpendant", "bowtie", "rubybrooch", "goldmedal", "glasses", "bushhat", "partyhat", "crown", "bluecap", "gradhat", "flowercrown", "wizardhat", "santahat", "beanie", "cowboyhat", "chefhat", "bunnyears", "sunglasses", "starglasses", "heartglasses", "cateye", "goggles", "eyepatch", "moustache", "freckles", "monocle"];
  const KSLOT = { hat: ["bushhat", "partyhat", "crown", "bluecap", "gradhat", "flowercrown", "wizardhat", "santahat", "beanie", "cowboyhat", "chefhat", "bunnyears"], face: ["glasses", "sunglasses", "starglasses", "heartglasses", "cateye", "goggles", "eyepatch", "moustache", "freckles", "monocle"], neck: ["scarf", "pearlnecklace", "goldchain", "heartpendant", "starpendant", "diamondpendant", "bowtie", "rubybrooch", "goldmedal"], body: ["hoodie", "tshirt", "stripeshirt", "pinkdress", "labcoat", "overalls", "jersey"], legs: ["jeans", "khakishorts", "cargopants", "sweatpants", "plaidskirt", "denimskirt", "flowerskirt", "tutu"], back: ["backpack", "herocape", "angelwings", "butterflywings", "surfboard"], feet: ["sneakers", "rainboots", "cowboyboots", "balletshoes", "bunnyslippers", "soccercleats", "sandals", "rollerskates"] };
  const KNAME = { bushhat: ["부시햇", "Bush Hat"], partyhat: ["파티 모자", "Party Hat"], crown: ["왕관", "Crown"], bluecap: ["파란 모자", "Blue Cap"], gradhat: ["졸업 모자", "Graduation Hat"], flowercrown: ["꽃 왕관", "Flower Crown"], wizardhat: ["마법사 모자", "Wizard Hat"], santahat: ["산타 모자", "Santa Hat"], beanie: ["털모자", "Winter Beanie"], cowboyhat: ["카우보이 모자", "Cowboy Hat"], chefhat: ["요리사 모자", "Chef Hat"], bunnyears: ["토끼 귀", "Bunny Ears"], glasses: ["안경", "Glasses"], sunglasses: ["선글라스", "Sunglasses"], starglasses: ["별 안경", "Star Glasses"], heartglasses: ["하트 안경", "Heart Glasses"], cateye: ["캣아이 안경", "Cat-eye Glasses"], goggles: ["수영 고글", "Swim Goggles"], eyepatch: ["안대", "Eye Patch"], moustache: ["콧수염", "Moustache"], freckles: ["주근깨", "Freckles"], monocle: ["외알 안경", "Monocle"], scarf: ["목도리", "Scarf"], pearlnecklace: ["진주 목걸이", "Pearl Necklace"], goldchain: ["금 목걸이", "Gold Chain"], heartpendant: ["하트 펜던트", "Heart Pendant"], starpendant: ["별 펜던트", "Star Pendant"], diamondpendant: ["다이아 펜던트", "Diamond Pendant"], bowtie: ["나비넥타이", "Bow Tie"], rubybrooch: ["루비 브로치", "Ruby Brooch"], goldmedal: ["금메달", "Gold Medal"], hoodie: ["후드티", "Hoodie"], tshirt: ["빨간 티셔츠", "Red T-shirt"], stripeshirt: ["줄무늬 셔츠", "Striped Shirt"], pinkdress: ["분홍 원피스", "Pink Dress"], labcoat: ["과학자 가운", "Lab Coat"], overalls: ["멜빵바지", "Overalls"], jersey: ["축구 유니폼", "Soccer Jersey"], backpack: ["배낭", "Backpack"], herocape: ["영웅 망토", "Hero Cape"], angelwings: ["천사 날개", "Angel Wings"], butterflywings: ["나비 날개", "Butterfly Wings"], surfboard: ["서핑보드", "Surfboard"], sneakers: ["운동화", "Sneakers"], rainboots: ["노란 장화", "Rain Boots"], cowboyboots: ["카우보이 부츠", "Cowboy Boots"], balletshoes: ["발레 슈즈", "Ballet Shoes"], bunnyslippers: ["토끼 슬리퍼", "Bunny Slippers"], soccercleats: ["축구화", "Soccer Cleats"], sandals: ["샌들", "Sandals"], rollerskates: ["롤러스케이트", "Roller Skates"], jeans: ["청바지", "Jeans"], khakishorts: ["카키 반바지", "Khaki Shorts"], cargopants: ["카고 바지", "Cargo Pants"], sweatpants: ["남색 조거팬츠", "Jogger Pants"], plaidskirt: ["체크 치마", "Plaid Skirt"], denimskirt: ["청치마", "Denim Skirt"], flowerskirt: ["꽃무늬 치마", "Flower Skirt"], tutu: ["튀튀 치마", "Tutu"] };
  const kimg = (n) => `/img/koala/${n}.webp`;
  const kthumb = (n) => `/img/koala/th/${n}.webp`;   // clean product-style picture for the shop grids

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
    chevL: '<path d="m14.5 5.5-6.5 6.5 6.5 6.5" stroke-width="3"/>',
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
  let wardHost = null, modalEl = null;   // the 3D wardrobe has no room session: its popups hang off its own root
  function toast(msg, bad) {
    if (!ses) { if (wardHost) { wardMsg = bad ? msg : ""; } return; }
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
    fit(ses.root); // the full-screen box is as wide as the window: side-by-side again on a big screen
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
  function closeModal() { if (modalEl) { if (modalEl._asmrOff) { modalEl._asmrOff(); if (window.ASMR) ASMR.stop(); } modalEl.remove(); modalEl = null; } if (ses) ses.modal = null; document.removeEventListener("keydown", modalKey, true); }
  // Esc closes any popup; Left / Right arrows step to the neighbouring card when the popup has arrow buttons
  function modalKey(e) {
    if (!modalEl) return;
    if (e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); closeModal(); return; }
    if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && modalEl._nav) { e.preventDefault(); e.stopImmediatePropagation(); modalEl._nav(e.key === "ArrowLeft" ? -1 : 1); }
  }
  // the shop card that was just tapped (so its popup can step to the cards next to it)
  let lastCard = null, lastCardAt = 0;
  document.addEventListener("click", (e) => {
    const b = e.target && e.target.closest ? e.target.closest(".kh-items-grid > button.kh-item, .kh-subgrid > button.kh-subitem") : null;
    if (b) { lastCard = b; lastCardAt = performance.now(); }
  }, true);
  function cardNeighbours() {
    const c = lastCard;
    if (!c || !c.isConnected || performance.now() - lastCardAt > 600) return null;
    const list = Array.from(c.parentElement.children).filter((x) => x.tagName === "BUTTON" && !x.disabled);
    return list.length > 1 ? { list, i: list.indexOf(c) } : null;
  }
  function modal(html, wire) {
    closeModal();
    const m = el("div", "kh-modal", `<div class="kh-sheet" role="alertdialog" aria-modal="true">${html}</div>`);
    m.addEventListener("click", (e) => { if (e.target === m) closeModal(); });
    const host = (ses && ses.root) || wardHost;
    if (!host) return;
    host.appendChild(m);
    modalEl = m; if (ses) ses.modal = m;
    document.addEventListener("keydown", modalKey, true);
    if (wire) wire(m);
    const b = m.querySelector("[data-primary]"); if (b) b.focus();
  }
  // Detail popup for a shop card: a big picture, then Place / Wear + Cancel for what you own, or Buy + Close for what you don't.
  // Buying only unlocks the thing (the card stops being faded); it is placed / worn the next time you tap it.
  //   o: { title, pic, price, own, go: "Place" label, onGo(), spendWhy, onBuy(): runs after the coins were taken, spendFn, note }
  function detail(o) {
    const coinsNow = () => (curOpts && curOpts.coins ? curOpts.coins() : Infinity), afford = o.afford != null ? o.afford : o.price === 0 || (curOpts && curOpts.unlimited) || coinsNow() >= o.price;
    const priceHtml = o.own ? "" : `<p class="kh-buy-price">${COIN} <b>${o.price}</b></p><p class="kh-buy-note">${afford ? T("코인으로 살까요? 사도 바로 놓이지 않아요.", "Buy it with your coins? It won't be placed yet.") : T(`코인이 ${o.price - coinsNow()}개 모자라요. 공부하고 코인을 모아 봐요!`, `You need ${o.price - coinsNow()} more coins. Keep studying to earn them!`)}</p>`;
    const note = o.own && o.note ? `<p class="kh-buy-note">${esc(o.note)}</p>` : "";
    const sellBtn = o.own && o.sell ? `<button type="button" class="kh-btn sell" data-sell>${T("되팔기", "Sell back")}${o.sell.back ? ` <small>+${o.sell.back}</small>` : ""}</button>` : "";
    const btns = o.own
      ? `<button type="button" class="kh-btn" data-primary data-go>${esc(o.go)}</button><button type="button" class="kh-btn alt" data-no>${T("취소", "Cancel")}</button>${sellBtn}`
      : `<button type="button" class="kh-btn" data-primary data-yes ${afford ? "" : "disabled"}>${T("살래요", "Buy")}</button><button type="button" class="kh-btn alt" data-no>${T("닫기", "Close")}</button>`;
    const nb = cardNeighbours();
    const playBtn = o.sound && window.ASMR && ASMR.has(o.sound) ? `<button type="button" class="kh-btn kh-play" data-play aria-pressed="false"><span class="kh-play-ic" aria-hidden="true">▶</span> <span class="kh-play-tx">${T("소리 듣기", "Listen")}</span></button>` : "";
    modal(`<h2>${esc(o.title)}</h2><div class="kh-buy-pic kh-detail-pic${o.own ? "" : " is-locked"}">${o.pic}</div>${playBtn}${priceHtml}${note}<div class="kh-btns">${btns}</div>`, (m) => {
      const pb = m.querySelector("[data-play]");
      if (pb) {   // a ▶ button: plays the toy's ASMR sound, tap again to stop. The picture wiggles while it plays.
        const pic = m.querySelector(".kh-detail-pic");
        const sync = (id) => { const on = id === o.sound; pb.setAttribute("aria-pressed", on); pb.classList.toggle("is-on", on); pic.classList.toggle("is-playing", on); pb.querySelector(".kh-play-ic").textContent = on ? "■" : "▶"; pb.querySelector(".kh-play-tx").textContent = on ? T("멈추기", "Stop") : T("소리 듣기", "Listen"); };
        const off = ASMR.onChange(sync);
        m._asmrOff = off;
        pb.onclick = () => { if (!ASMR.toggle(o.sound)) sync(null); };
      }
      if (nb) { // arrow buttons: open the previous / next card of the same list (cards that only show a message are skipped)
        const step = (dir) => {
          for (let k = 1; k < nb.list.length; k++) {
            const cand = nb.list[(nb.i + dir * k + nb.list.length * k) % nb.list.length], before = modalEl;
            cand.click();
            if (modalEl && modalEl !== before) return;
          }
        };
        m._nav = step;
        const sheet = m.querySelector(".kh-sheet");
        [[-1, "prev", T("이전 아이템", "Previous item"), "m14.5 5.5-6.5 6.5 6.5 6.5"], [1, "next", T("다음 아이템", "Next item"), "m9.5 5.5 6.5 6.5-6.5 6.5"]].forEach(([dir, cls, label, d]) => {
          const bt = el("button", "kh-navbtn " + cls, `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`);
          bt.type = "button"; bt.setAttribute("aria-label", label); bt.onclick = () => step(dir); sheet.appendChild(bt);
        });
      }
      m.querySelector("[data-no]").onclick = closeModal;
      const sl = m.querySelector("[data-sell]"); if (sl) sl.onclick = () => sellConfirm(o);
      const go = m.querySelector("[data-go]"); if (go) go.onclick = () => { if (!o.keep) closeModal(); o.onGo(); };
      const yes = m.querySelector("[data-yes]");
      if (yes) yes.onclick = () => {
        const ok = o.spendFn ? o.spendFn(o.price, o.spendWhy) : curOpts.spend(o.price, o.spendWhy);
        if (!ok) { toast(T("코인이 모자라요", "Not enough coins"), true); closeModal(); return; }
        refreshCoins(); o.onBuy();   // the popup stays open: it now offers the thing to place / wear
        if (o.go && o.onGo) detail(Object.assign({}, o, { own: true, price: 0, sell: null })); else closeModal();
      };
    });
  }
  // Sell back: 80% of the price returns to the wallet (a 20% fee). o.sell = { paid, back, onSell() -> bool }
  function sellConfirm(o) {
    const sl = o.sell, free = !!(curOpts && curOpts.unlimited), back = free ? 0 : sl.back, fee = free ? 0 : sl.paid - sl.back;
    modal(`<h2>${T("되팔까요?", "Sell back?")}</h2><div class="kh-buy-pic kh-detail-pic">${o.pic}</div><p class="kh-buy-name"><b>${esc(o.title)}</b></p>
      <div class="kh-sellmath"><div><span>${T("산 가격", "Price you paid")}</span><b>${COIN} ${sl.paid}</b></div><div><span>${T("수수료 (20%)", "Fee (20%)")}</span><b>− ${fee}</b></div><div class="total"><span>${T("지갑으로 돌아와요", "Back to your wallet")}</span><b>${COIN} +${back}</b></div></div>
      ${free ? `<p class="kh-buy-note">${T("관리자는 코인이 무제한이라 환불은 없어요.", "Admin has unlimited coins, so nothing comes back.")}</p>` : ""}
      <div class="kh-btns"><button type="button" class="kh-btn alt" data-primary data-no>${T("그대로 두기", "Keep it")}</button><button type="button" class="kh-btn sell" data-yes>${T("되팔기", "Sell")}</button></div>`, (m) => {
      m.querySelector("[data-no]").onclick = closeModal;
      m.querySelector("[data-yes]").onclick = () => {
        const ok = sl.onSell();
        closeModal();
        if (ok !== false) { refreshCoins(); toast(free ? T("정리했어요", "Removed") : T(`되팔았어요! +${back}코인`, `Sold back! +${back} coins`)); }
      };
    });
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
    return `<div class="kh-cats-wrap"><button type="button" class="kh-cats-nav prev" data-cnav="-1" aria-label="${T("왼쪽으로", "Scroll left")}" hidden>‹</button><div class="kh-cats" role="tablist">${tabs.map((t) => `<button type="button" role="tab" class="kh-cat${t[0] === cur ? " on" : ""}" data-tab="${t[0]}" aria-selected="${t[0] === cur}">${t[1] && /\.webp$/.test(t[1]) ? `<img class="kh-cat-ic" src="${t[1]}" alt="" draggable="false">` : ""}<span>${esc(t[2])}</span></button>`).join("")}</div><button type="button" class="kh-cats-nav next" data-cnav="1" aria-label="${T("오른쪽으로", "Scroll right")}" hidden>›</button></div>`;
  }
  // arrows + edge fade on the category row; centres the chosen chip
  function initCats(root) {
    const wrap = root.querySelector(".kh-cats-wrap"); if (!wrap) return;
    const strip = wrap.querySelector(".kh-cats"), pv = wrap.querySelector(".kh-cats-nav.prev"), nx = wrap.querySelector(".kh-cats-nav.next");
    const upd = () => { const mx = strip.scrollWidth - strip.clientWidth, l = strip.scrollLeft > 2, r = strip.scrollLeft < mx - 2; pv.hidden = !l; nx.hidden = !r; wrap.classList.toggle("can-left", l); wrap.classList.toggle("can-right", r); };
    strip.addEventListener("scroll", upd, { passive: true });
    wrap.querySelectorAll("[data-cnav]").forEach((b) => { b.onclick = () => strip.scrollBy({ left: Number(b.dataset.cnav) * Math.max(120, strip.clientWidth * 0.7), behavior: "smooth" }); });
    const cur = strip.querySelector(".kh-cat.on"); if (cur) strip.scrollLeft = cur.offsetLeft - (strip.clientWidth - cur.offsetWidth) / 2;
    upd(); requestAnimationFrame(upd);
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
    const house = H.planSvg(S, { name: (r) => roomLabel(r), empty: T("방 짓기", "Build a room"), fresh: ses.justBuilt, title: T("우리 집 평면도", "Our house floor plan") });
    ses.root.innerHTML = `<div class="kh-plan-screen">
      <div class="kh-planmain">${topBar("🏠 " + T("내 집", "My House"))}
        <p class="kh-hint">${T("방을 누르면 코알라가 들어가요. 빈 칸에는 상점에서 방을 사서 지어요.", "Tap a room to walk in. Buy rooms in the shop and build them on the empty plots.")}</p>
        <div class="kh-plan" id="kh-plan">${house}
          <button type="button" class="kh-entrance" data-room="yard" aria-label="${T("집 외관 및 정원 꾸미기", "House & Garden Decor")}"><img class="kh-door-ic" src="/img/cat/house.webp" alt="" draggable="false"><span class="kh-card-name">${T("집 외관 및 정원 꾸미기", "House & Garden Decor")}</span><svg class="kh-door-go" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="m9 18 6-6-6-6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
          <img class="kh-marker" id="kh-marker" src="${kimg("base")}" alt="${T("코알라", "Koala")}" draggable="false"></div></div>
      <aside class="kh-panel" id="kh-panel" aria-label="${T("방 상점", "Room shop")}">
        ${chipsHtml([["rooms", "/img/cat/home.webp", T("방", "Rooms")]], "rooms")}
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
    return `<button type="button" class="kh-item kh-roomitem" data-buyroom="${t}" aria-label="${esc(T(r.ko, r.en))}, ${r.price}"><span class="kh-roomic" aria-hidden="true">${roomImg(r)}</span><span class="kh-nm">${esc(T(r.ko, r.en))}</span><span class="kh-subtxt">${r.C}×${r.R}${have ? " · " + T(`${have}개`, `${have} built`) : ""}</span>${r.price ? `<span class="kh-pr">${COIN}${r.price}</span>` : `<span class="kh-pr">${T("무료", "Free")}</span>`}</button>`;
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
    // on a room the koala stands in the middle; at the yard button he stands on its top edge so the label stays readable
    m.style.left = (cr.left - pr.left + (onFloor ? cr.width * 0.5 : Math.min(36, cr.width * 0.2))) + "px";
    m.style.top = (cr.top - pr.top + (onFloor ? cr.height * 0.5 : 4)) + "px";
    m.classList.toggle("walk", !!animate && !reduced());
  }
  function pickRoom(id) {
    placeMarker(true, id);
    // a room opens straight into the full-screen editor (one step less than before)
    setTimeout(() => { if (ses && ses.screen === "plan") { openRoom(id); if (ses.screen === "room" && !ses.full) toggleFull(); } }, reduced() ? 0 : 760);
  }
  // the floor-plan button goes straight back to the inline plan card (leaves full screen on the way)
  function backToPlan() {
    if (ses.full) { ses.full = false; ses.root.classList.remove("kh-full"); document.body.classList.remove("kh-open"); }
    renderPlan();
  }

  /* ---- buying rooms: the shop sells kinds of rooms, and you choose the plot ---- */
  const roomImg = (r) => (r.id ? `<img class="kh-roomimg" src="img/rooms/${r.id}.webp" alt="" draggable="false">` : esc(r.ic || ""));
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
    modal(`<h2>${T("어느 칸에 지을까요?", "Which plot?")}</h2><div class="kh-slotpick">${H.SLOTS.map((sl) => { const o = S.slots[sl]; return o ? `<span class="kh-slotcell taken" aria-hidden="true">${roomImg(H.ROOMS[o.type])}</span>` : `<button type="button" class="kh-slotcell" data-slot="${sl}" aria-label="${T("빈 칸", "Empty plot")}">＋</button>`; }).join("")}<span class="kh-slotdoor">🚪 ${T("입구", "Entrance")}</span></div><div class="kh-btns"><button type="button" class="kh-btn alt" data-no>${T("닫기", "Close")}</button></div>`, (m) => {
      m.querySelector("[data-no]").onclick = closeModal;
      m.querySelectorAll("[data-slot]").forEach((b) => { b.onclick = () => go(b.dataset.slot); });
    });
  }

  /* ------------------------------ room screen ------------------------------ */
  const roomType = () => (ses.roomId === "yard" ? "yard" : (ses.S.slots[ses.roomId] || {}).type);
  const fitsHere = (d, yard) => (d.where === "both" || d.where === (yard ? "out" : "in")) && (!d.only || d.only === roomType());
  function tabsFor(yard) {
    if (!yard && roomType() === "garage") return [["garage", "/img/house/carCompactRed.webp", T("차고", "Garage")], ["furniture", "/img/cat/furniture.webp", T("가구", "Furniture")], ["plant", "/img/cat/plant.webp", T("식물", "Plants")], ["small", "/img/cat/small.webp", T("소품", "Props")], ["wall", "/img/cat/poster.webp", T("벽장식", "Wall")], ["style", "/img/cat/wallpaper.webp", T("벽·바닥", "Style")]];
    return yard
      ? [["outdoor", "/img/cat/outdoor.webp", T("정원 물건", "Garden")], ["plant", "/img/cat/plant.webp", T("식물", "Plants")], ["house", "/img/cat/home.webp", T("집 외관", "House")], ["garden", "/img/cat/garden.webp", T("정원 형태", "Layout")]]
      : [["furniture", "/img/cat/furniture.webp", T("가구", "Furniture")], ["rug", "/img/cat/rug.webp", T("러그", "Rugs")], ["plant", "/img/cat/plant.webp", T("식물", "Plants")], ["small", "/img/cat/small.webp", T("소품", "Props")], ["wall", "/img/cat/poster.webp", T("벽장식", "Wall")], ["style", "/img/cat/wallpaper.webp", T("벽·바닥", "Style")]];
  }
  function openRoom(id) {
    if (!roomDef(id)) { renderPlan(); return; }
    ses.screen = "room"; ses.roomId = id; ses.S.cur = id; ses.sel = null; ses.edit = true; ses.zoom = 1;
    ses.root.classList.remove("kh-planmode"); fit(ses.root); ses.subOf = null;
    const yard = id === "yard";
    ses.tab = yard ? "outdoor" : roomType() === "garage" ? "garage" : "furniture";
    save();
    ses.root.innerHTML = `<div class="kh-room-screen">
      <div class="kh-stage" id="kh-stage">
        <div class="kh-scene" id="kh-scene"></div>
        <div class="kh-top over"><button type="button" class="kh-ibtn kh-planbtn" data-back aria-label="${T("평면도", "Floor plan")}" title="${T("평면도", "Floor plan")}">${ic("chevL")}<span class="kh-planic"><img src="/img/cat/floorplan.webp" alt="" draggable="false"></span></button>
          <span class="kh-sp"></span><h2 class="kh-title kh-roomtitle"><img class="kh-roomtitle-ic" src="${ses.roomId !== "yard" && ses.S.slots[ses.roomId] ? "/img/rooms/" + ses.S.slots[ses.roomId].type + ".webp" : "/img/cat/outdoor.webp"}" alt="" draggable="false"><span>${esc(roomLabel(curRoom()))}</span></h2><span class="kh-sp"></span>
          <span class="kh-coins">${COIN}<b data-kh-coins>${coinsText()}</b></span><i class="kh-vr" aria-hidden="true"></i>
          <button type="button" class="kh-ibtn" data-zoom="out" aria-label="${T("작게", "Zoom out")}">${ic("minus")}</button><button type="button" class="kh-ibtn" data-zoom="in" aria-label="${T("크게", "Zoom in")}">${ic("plus")}</button>
          <button type="button" class="kh-ibtn" data-full aria-label="${T("크게 보기", "Full screen")}">${ic("maximize")}</button>
          <i class="kh-vr" aria-hidden="true"></i><button type="button" class="kh-pillbtn done" data-edit aria-pressed="true" aria-label="${T("꾸미기 끝내기", "Finish decorating")}">${ic("check")}<span>${T("완료", "Done")}</span></button></div>
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
  const wornNames = () => kordered(ses.S.worn);
  function koalaMarkup() {
    const imgs = wornNames().map((n) => { const b = KBOX[n]; return `<image href="${kimg(n)}" x="${b[0]}" y="${b[1]}" width="${b[2] - b[0]}" height="${b[3] - b[1]}"/>`; }).join("");
    const one = (src) => { const b = KBOX.base; return `<image href="${src}" x="${b[0]}" y="${b[1]}" width="${b[2] - b[0]}" height="${b[3] - b[1]}"/>`; };
    const stand = `<svg class="kh-kstand" x="-27" y="-89.8" width="54" height="99.85" viewBox="64 20 553 1020" overflow="hidden">${imgs}</svg>`;
    const back = extraImg.back ? `<svg class="kh-kback" x="-27" y="-89.8" width="54" height="92.8" viewBox="64 20 553 948" overflow="hidden" display="none">${one(extraImg.back)}</svg>` : "";
    // sitting / reading koalas are pictures of their own (img/koala/*.webp; "koala:sit", "koala:sitback", "koala:read" in the manifest override them)
    const own = (cls, src, w, h, bottom) => `<image class="${cls}" href="${src}" x="${-w / 2}" y="${(bottom - h).toFixed(1)}" width="${w}" height="${h}" preserveAspectRatio="xMidYMax meet" display="none"/>`;
    // worn items on the sitting pictures: the sitting koala is the standing one at 1.281x (front) / 1.29x (from behind), so the same layers can be placed by a transform
    const worn = ses.S.worn, tr = (t) => `<g transform="${t}">`, cv = (n) => { const b = KBOX[n]; return `<image href="${kimg(n)}" x="${b[0]}" y="${b[1]}" width="${b[2] - b[0]}" height="${b[3] - b[1]}"/>`; };
    const isHat = (n) => KSLOT.hat.includes(n);
    // seen from behind and turned towards the desk (3/4 view): its own picture and its own item renders (img/koala/*_3q.webp), placed by pixel boxes of the 1136x1408 source
    const sitBack3q = (w, hat) => {
      if (extraImg.sitback) return own("kh-ksitback", extraImg.sitback, 38, 45.5, 0);
      const u = 0.03376, names = kordered(w).filter((n) => n !== "base" && K3[n] && (hat(n) || KSLOT.back.includes(n)));
      const im = (n) => { const b = K3[n]; return `<image href="${kimg(n === "base" ? "sit3q" : n + "_3q")}" x="${b[0]}" y="${b[1]}" width="${b[2] - b[0]}" height="${b[3] - b[1]}"/>`; };
      return `<g class="kh-ksitback" display="none" transform="scale(${u}) translate(-551 -1358)">${im("base")}${names.map(im).join("")}</g>`;
    };
    const sitSvg = (cls, src, w, h, iw, ih, T, pick, allFront) => {
      const names = kordered(worn).filter((n) => n === "base" ? false : pick(n)), behind = allFront ? [] : names.filter((n) => KBEHIND.includes(n)), front = allFront ? names : names.filter((n) => !KBEHIND.includes(n));
      return `<svg class="${cls}" x="${-w / 2}" y="${-h}" width="${w}" height="${h}" viewBox="0 0 ${iw} ${ih}" overflow="visible" display="none">${tr(T)}${behind.map(cv).join("")}</g><image href="${src}" x="0" y="0" width="${iw}" height="${ih}"/>${tr(T)}${front.map(cv).join("")}</g></svg>`;
    };
    const sit = sitSvg("kh-ksit", extraImg.sit || kimg("sit"), 40, 49.1, 720, 883, "translate(5.5 9.2) scale(1.281) translate(-64 -222)", (n) => !KSLOT.feet.includes(n) && !KSLOT.legs.includes(n)) + sitBack3q(worn, isHat);
    const readImg = own("kh-kreadimg", extraImg.read || kimg("read"), 50, 78.1, 3);
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
    const k = ses.koala, stoolSit = k.pose === "sit" && k.seat && /^stool/.test((curState().items.find((i) => i.uid === k.seat) || {}).id || ""), seatIt = k.pose === "sit" && k.seat && curState().items.find((i) => i.uid === k.seat), tk = seatIt ? H.tuckOf(seatIt.id, seatIt.m).map((v, i) => v + (/^stool/.test(seatIt.id) ? { 2: [0.5, 0.2], 3: [0.2, 0.5] }[((seatIt.m | 0) % 4 + 4) % 4] || [0, 0] : [0, 0])[i]) : [0, 0], [x, y] = H.proj(k.c + 0.5 + tk[0], k.r + 0.5 + tk[1], (k.z || 0) - (stoolSit ? 3 : 0));
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
    // seen from behind, a chair's backrest is between us and the koala: draw the backrest again over it (cloned, clipped to the backrest) so it sits IN the chair
    layer.querySelectorAll(".kh-kfront").forEach((e) => e.remove());
    const chairIt = stoolSit && away && curState().items.find((i) => i.uid === k.seat), src = chairIt && layer.querySelector(`.kh-it[data-uid="${chairIt.uid}"]`);
    if (src) {
      const bx = k.dir === 3 ? [0.8, 0.9, 0.1, 0.9] : [0.1, 0.9, 0.8, 0.9], pts = [];
      for (const x of [bx[0], bx[1]]) for (const y of [bx[2], bx[3]]) for (const z of [23, 52]) pts.push(H.proj(k.c + x + tk[0], k.r + y + tk[1], z));
      pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = [];
      for (const q of pts) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
      for (const q of pts.slice().reverse()) { while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
      const hull = lo.slice(0, -1).concat(up.slice(0, -1)).map((q) => q.map((v) => v.toFixed(1)).join(",")).join(" ");
      const cl = src.cloneNode(true); cl.classList.remove("kh-sel"); cl.classList.add("kh-kfront"); cl.removeAttribute("data-uid"); cl.dataset.k = String(key + 0.001); cl.style.pointerEvents = "none";
      const wrap = document.createElementNS("http://www.w3.org/2000/svg", "g"), cp = document.createElementNS("http://www.w3.org/2000/svg", "clipPath");
      cp.id = "khfrontclip"; cp.innerHTML = `<polygon points="${hull}"/>`;
      wrap.setAttribute("class", "kh-kfront"); wrap.dataset.k = String(key + 0.001); wrap.setAttribute("clip-path", "url(#khfrontclip)"); wrap.style.pointerEvents = "none";
      cl.classList.remove("kh-kfront"); wrap.appendChild(cp); wrap.appendChild(cl); g.after(wrap);
    }
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
    if (seatItem) { const d = H.D[seatItem.id]; k.c = cell[0]; k.r = cell[1]; k.z = d.seat; k.seat = seatItem.uid; k.dir = H.seatFacing(seatItem); if (!(seatItem.m | 0)) { const dk = deskDir(cell); if (dk != null) { k.dir = dk; if (/^stool/.test(seatItem.id)) { seatItem.m = dk; H.persist(ses.S); drawScene(); } } } k.exit = exitCell || null; }
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
    H.setOpen(ses.subOf);
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
    if (ses.subOf && ses.sel !== ses.subOf) { ses.subOf = null; drawScene(); drawPanel(); }   // looking at something else: close it again
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
      else if (act === "hl" || act === "hr") y.house.shift = (y.house.shift || 0) + (act === "hr" ? 1 : -1) * (y.house.rot ? -1 : 1);   // turned, the house slides along the other axis: keep "right" on the right of the screen
      const before = H.houseRect(ses.S.yard), after = H.houseRect(y);
      if (before.c0 === after.c0 && before.r0 === after.r0 && before.rot === after.rot) { toast(T("더 못 움직여요", "It can't go further"), true); return; }
      if (!yardValid(y)) { toast(T("집 자리에 있는 물건을 먼저 치워요", "Move the things in the way first"), true); return; }
      ses.S.yard = y; save(); drawScene(); placeKoalaFree(); updateKoala(); showMenu(); return;
    }
    const it = st.items.find((x) => x.uid === ses.sel);
    if (!it) return;
    if (act === "del") { leaveSubs(); st.items = st.items.filter((x) => x.uid !== it.uid); ses.sel = null; recalcZ(st); save(); drawScene(); hideMenu(); placeKoalaFree(); updateKoala(); return; }
    if (act === "subs") { ses.subOf = it.uid; hideMenu(); drawScene(); applySel(); drawPanel(); return; }
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
  function leaveSubs() { if (ses.subOf) { ses.subOf = null; drawScene(); drawPanel(); } }
  // the wardrobe: every piece of Koala clothing in the shop; what you own can be put in (it shows inside the open wardrobe), the rest stays faded until bought
  const CLOTH_SLOTS = ["body", "legs", "feet", "hat", "neck", "face", "back"];
  function clothesPanel(panel, it) {
    const d = H.D[it.id], cat = (tabsFor(ses.roomId === "yard").find((t) => t[0] === d.cat) || [0, 0, T("가구", "Furniture")])[2];
    const slotName = { hat: T("머리", "Head"), face: T("얼굴", "Face"), neck: T("목", "Neck"), body: T("상의", "Tops"), legs: T("하의", "Bottoms"), back: T("등", "Back"), feet: T("신발", "Shoes") };
    const stOf = (n) => { const st = wardApi ? wardApi.status(id2d(n)) : { state: "owned" }; return st || { state: "owned" }; };
    const cur = it.sub || [];
    const grp = CLOTH_SLOTS.filter((sl) => KSLOT[sl]).map((sl) => `<h3>${slotName[sl]}</h3><div class="kh-subgrid">${KSLOT[sl].map((n) => {
      const st = stOf(n), own = st.state === "owned", on = cur.includes(n);
      return `<button type="button" class="kh-subitem${on ? " on" : ""}${own ? "" : " locked"}" data-cl="${n}" aria-pressed="${on}"><img class="kh-clth" src="${kthumb(n)}" alt="" draggable="false"><span class="kh-nm">${esc(T(KNAME[n][0], KNAME[n][1]))}</span>${own ? (on ? `<span class="kh-pr kh-ok">${ic("check")}</span>` : "") : `<span class="kh-pr">${st.state === "buyable" ? COIN + (st.cost || 0) : "🔒"}</span>`}</button>`;
    }).join("")}</div>`).join("");
    panel.innerHTML = `<nav class="kh-crumbs" aria-label="${T("현재 위치", "You are here")}"><button type="button" class="kh-up" data-up aria-label="${T("상위로", "Up one level")}">${ic("up")}</button>
      <button type="button" class="kh-crumb" data-up>${esc(cat)}</button><span class="kh-sep">${ic("chev")}</span><span class="kh-crumb cur">${esc(nm(d))}</span></nav>
      <div class="kh-grid" id="kh-grid">${shelfHead(T("옷장 속 옷", "Clothes inside"), `${cur.length}/12`)}<p class="kh-subnote">${T("산 옷을 눌러 옷장에 넣고 빼요. 못 산 옷은 흐리게 보여요.", "Tap clothes you own to put them in or take them out. Clothes you haven't bought are faded.")}</p>${grp}</div>`;
    panel.querySelectorAll("[data-up]").forEach((x) => { x.onclick = () => { ses.subOf = null; drawScene(); applySel(); drawPanel(); }; });
    panel.querySelectorAll("[data-cl]").forEach((bt) => {
      bt.onclick = () => {
        const n = bt.dataset.cl, st = stOf(n), nmN = T(KNAME[n][0], KNAME[n][1]), pic = `<img src="${kthumb(n)}" alt="" draggable="false">`;
        const toggle = () => {
          const sub = (it.sub || []).slice(), at = sub.indexOf(n);
          if (at >= 0) sub.splice(at, 1); else { if (sub.length >= 12) { toast(T("옷장이 가득 찼어요", "The wardrobe is full"), true); return; } sub.push(n); }
          it.sub = sub; save(); drawScene(); applySel(); drawPanel();
        };
        if (st.state === "owned") { detail({ title: nmN, pic, price: 0, own: true, go: (it.sub || []).includes(n) ? T("옷장에서 빼기", "Take out") : T("옷장에 넣기", "Put in"), onGo: toggle,
          sell: clothSell(n, () => {
            const S2 = ses.S;
            Object.keys(S2.slots).forEach((k) => (S2.slots[k].items || []).forEach((i) => { if (i.sub && i.sub.includes(n)) { i.sub = i.sub.filter((x) => x !== n); if (!i.sub.length) delete i.sub; } }));
            (S2.yard.items || []).forEach((i) => { if (i.sub && i.sub.includes(n)) { i.sub = i.sub.filter((x) => x !== n); if (!i.sub.length) delete i.sub; } });
            Object.keys(S2.worn || {}).forEach((k) => { if (S2.worn[k] === n) delete S2.worn[k]; });
            save(); drawScene(); applySel(); drawPanel(); window.dispatchEvent(new CustomEvent("kh-worn"));
          }) }); return; }
        if (st.state === "buyable") { detail({ title: nmN, pic, price: st.cost || 0, own: false, afford: true, spendFn: () => true, spendWhy: "", onBuy: () => { if (!wardApi.buy(id2d(n))) { toast(T("코인이 모자라요", "Not enough coins"), true); return; } refreshCoins(); drawPanel(); toast(T("샀어요! 다시 눌러서 넣어 봐요.", "Bought! Tap it again to put it in.")); } }); return; }
        toast(st.cost ? T("코인이 모자라요: ", "Not enough coins: ") + st.cost : st.hint ? T("잠겨 있어요: ", "Locked: ") + st.hint : T("아직 열 수 없어요.", "Not available yet."), true);
      };
    });
  }
  function subsPanel(panel, it) {
    if (H.D[it.id].subKind === "clothes") { clothesPanel(panel, it); return; }
    const d = H.D[it.id], kind = d.subKind, api = curOpts.subs, list = api.list(kind), grp = {}; list.forEach((e) => { grp[e.id] = e.group; });
    const cur = it.sub || [], tabs = tabsFor(ses.roomId === "yard"), cat = (tabs.find((t) => t[0] === d.cat) || [0, 0, T("가구", "Furniture")])[2];
    const BOOKIC = { koalaBook: "🐨", abcBook: "🔤", spaceBook: "🪐", dinoBook: "🦖", fairyBook: "🧚", mathBook: "➕", oceanBook: "🐳", jokeBook: "😄", atlasBook: "🗺️", artBook: "🎨", animalBook: "🦘", songBook: "🎵" };
    const icon = (e) => { const v = H.subVis(e.id), im = H.subImg(e.id); if (kind === "asmr" && window.KoalaArt) return `<span class="kh-subic kh-subimg kh-asmric" aria-hidden="true">${window.KoalaArt.subIcon(e.id)}</span>`; if (!im && !v && BOOKIC[e.id]) return `<span class="kh-subic kh-bookic" style="background:${H.bookColor(e.id)}" aria-hidden="true">${BOOKIC[e.id]}</span>`; if (im) return `<span class="kh-subic kh-subimg" aria-hidden="true"><img src="${im}" alt=""></span>`; return v ? `<span class="kh-subic" style="background:${v[1]}" aria-hidden="true">${v[0]}</span>` : `<span class="kh-subic" style="background:${H.bookColor(e.id)}" aria-hidden="true">📖</span>`; };
    const groups = Array.from(new Set(list.map((e) => e.group))), gname = { main: "", top: T("책상 위", "On top"), drawer: T("서랍 속", "In the drawer"), food: T("음식", "Food"), drink: T("음료", "Drinks"), squishy: T("🫧 말랑이", "🫧 Squishies"), clicky: T("🖱️ 딸깍이", "🖱️ Clickers"), popit: T("💥 뽁뽁이", "💥 Poppers"), crunch: T("🧂 사각사각", "🧂 Crunchy") };
    const title = { tools: T("공구함 속 공구", "Tools in the box"), shoes: T("신발장 위 신발", "Shoes on the cabinet"), books: T("책장 속 책", "Books on the shelf"), desk: T("책상 위·서랍", "On the desk"), frame: T("액자 그림", "Picture"), toys: T("장난감 상자", "Toys"), sink: T("세면대 위 물건", "On the sink"), fridge: T("냉장고 속 음식", "In the fridge"), asmr: T("ASMR 장난감", "ASMR toys") }[kind] || nm(d);
    const note = kind === "books" && !it.sub ? T("지금은 기본 책이 꽂혀 있어요. 골라 넣으면 바뀌어요.", "Default books for now — pick some to replace them.") : kind === "asmr" ? T("카드를 누르면 ▶ 버튼이 나와요. 눌러서 소리를 들어 봐요! (이어폰으로 들으면 더 좋아요)", "Tap a card to get a ▶ button and listen! (Earphones sound best.)") : T("눌러서 넣고 빼요. 코인으로 새 물건도 살 수 있어요.", "Tap to put in or take out. New things cost coins.");
    panel.innerHTML = `<nav class="kh-crumbs" aria-label="${T("현재 위치", "You are here")}"><button type="button" class="kh-up" data-up aria-label="${T("상위로", "Up one level")}">${ic("up")}</button>
      <button type="button" class="kh-crumb" data-up>${esc(cat)}</button><span class="kh-sep">${ic("chev")}</span><span class="kh-crumb cur">${esc(nm(d))}</span></nav>
      <div class="kh-grid" id="kh-grid">${shelfHead(title)}<p class="kh-subnote">${note}</p>${groups.map((g) => `${gname[g] ? `<h3>${gname[g]}</h3>` : ""}<div class="kh-subgrid">${list.filter((e) => e.group === g).map((e) => { const on = cur.includes(e.id); return `<button type="button" class="kh-subitem${on ? " on" : ""}${e.owned ? "" : " locked"}" data-sub="${e.id}" aria-pressed="${on}">${icon(e)}<span class="kh-nm">${esc(T(e.name[0], e.name[1]))}</span>${e.owned ? (on ? `<span class="kh-pr kh-ok">${ic("check")}</span>` : "") : `<span class="kh-pr">${COIN}${e.cost}</span>`}</button>`; }).join("")}</div>`).join("")}
      ${it.sub && kind === "books" ? `<button type="button" class="kh-btn alt kh-clear" data-reset>${T("기본 책으로", "Default books")}</button>` : ""}</div>`;
    panel.querySelectorAll("[data-up]").forEach((x) => { x.onclick = () => { ses.subOf = null; drawScene(); applySel(); drawPanel(); }; });
    const rs = panel.querySelector("[data-reset]"); if (rs) rs.onclick = () => { delete it.sub; save(); drawScene(); drawPanel(); };
    panel.querySelectorAll("[data-sub]").forEach((bt) => {
      bt.onclick = () => {
        const e = list.find((x) => x.id === bt.dataset.sub), on = (it.sub || []).includes(e.id);
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
        detail({ sound: kind === "asmr" ? e.id : null, title: T(e.name[0], e.name[1]), pic: icon(e), price: e.cost, own: e.owned, sell: e.owned && e.cost > 0 && api.sell ? { paid: e.cost, back: Math.floor(e.cost * 0.8), onSell: () => { const ok = api.sell(e.id); if (ok) { e.owned = false; Object.keys(ses.S.slots).forEach((k) => (ses.S.slots[k].items || []).forEach((i) => { if (i.sub) { i.sub = i.sub.filter((x) => x !== e.id); if (!i.sub.length) delete i.sub; } })); (ses.S.yard.items || []).forEach((i) => { if (i.sub) i.sub = i.sub.filter((x) => x !== e.id); }); save(); drawScene(); drawPanel(); } return ok; } } : null, go: on ? T("빼기", "Take out") : kind === "frame" ? T("걸기", "Hang it") : T("넣기", "Put in"), spendWhy: "sub:" + e.id, spendFn: () => api.buy(e.id), onGo: toggle,
          onBuy: () => { e.owned = true; drawPanel(); toast(T("샀어요! 다시 눌러서 넣어 봐요.", "Bought! Tap it again to put it in.")); } });
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
      const f = H.footprint(drag.piece);
      const aim = (lift) => {   // the cell under the pointer when the pointer is on a surface `lift` high
        const g = cellOf(p.x, p.y + lift + (drag.fromPanel ? 20 : 0));
        drag.piece.c = Math.round(drag.fromPanel ? g.c - f.w / 2 : g.c - drag.grab.c);
        drag.piece.r = Math.round(drag.fromPanel ? g.r - f.d / 2 : g.r - drag.grab.r);
      };
      aim(0);
      if (drag.koala) { const c = drag.piece.c, r = drag.piece.r; drag.valid = koalaCellFree(c, r) || !!H.seatAt(st, c, r) || !!actAt(st, c, r) || !!drag.under; }
      else {
        let res = null;
        if (d && d.stack) {   // small things: first look for a table / desk / shelf board under the pointer (its top is above the floor)
          const lifts = [];
          st.items.forEach((o) => { const od = H.D[o.id]; if (o.uid !== drag.uid && od && od.topH && !od.stack) (od.tiers || [od.topH]).forEach((z) => { if (!lifts.includes(z)) lifts.push(z); }); });
          lifts.sort((a, b) => b - a);
          for (const z of lifts) { aim(z - 6); drag.piece.zHint = z; const r2 = H.canPlace(room, st, drag.piece, drag.uid); if (r2.ok && r2.z > 0) { res = r2; break; } }
        }
        if (!res) { aim(0); drag.piece.zHint = 0; res = H.canPlace(room, st, drag.piece, drag.uid); }
        drag.valid = res.ok; if (res.ok) drag.piece.z = res.z;
      }
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
        const tp = drag.uid && curState().items.find((x) => x.uid === drag.uid);
        if (tp && H.D[tp.id].subKind && curOpts.subs && ses.subOf !== tp.uid) { ses.subOf = tp.uid; drawScene(); applySel(); drawPanel(); } // tapping a wardrobe / toy box / desk opens it
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
    panel.innerHTML = `${chipsHtml(tabs, roomOwned ? "" : ses.tab)}<div class="kh-grid" id="kh-grid">${gridHtml(yard)}</div>`;
    panel.querySelectorAll("[data-tab]").forEach((b) => { b.onclick = () => { ses.tab = b.dataset.tab; if (roomOwned) { roomOwned = false; window.dispatchEvent(new CustomEvent("kh-owned-off")); } drawPanel(); }; });
    initCats(panel);
    wireGrid(panel.querySelector("#kh-grid"), yard);
  }
  function swatch(kind, key, def, own, on) {
    return `<button type="button" class="kh-sw${on ? " on" : ""}${own ? "" : " locked"}" data-sw="${kind}:${key}" aria-label="${esc(T(def.n[0], def.n[1]))}" aria-pressed="${on}"><span class="kh-sw-c" style="${kind === "floor" && H.floorImg(key) ? `background:url(${H.floorImg(key)}) center/cover;box-shadow:inset 0 0 0 2px rgba(255,255,255,.7)` : `background:${def.c};box-shadow:inset 0 0 0 5px ${def.a}`}"></span><span class="kh-sw-n">${esc(T(def.n[0], def.n[1]))}</span>${own ? "" : `<span class="kh-pr">${COIN}${def.p}</span>`}</button>`;
  }
  const HOUSE_IC = { cottage: "🏡", villa: "🏘️", twoStory: "🏠", modern: "🏢", cabin: "🛖", castle: "🏰" };
  const uiIc = (k, fb) => { const u = H.uiImg(k); return u ? `<img src="${u}" alt="">` : fb; };
  const optBtn = (attr, key, on, ic, label, price, own) => `<button type="button" class="kh-sw kh-opt${on ? " on" : ""}${own === false ? " locked" : ""}" ${attr}="${key}" aria-pressed="${on}"><span class="kh-optic" aria-hidden="true">${ic}</span><span class="kh-sw-n">${esc(label)}</span>${own === false ? `<span class="kh-pr">${COIN}${price}</span>` : ""}</button>`;
  let roomOwned = false;
  window.KoalaHouse.setRoomOwned = (v) => { roomOwned = !!v; try { if (ses && ses.root && ses.root.querySelector("#kh-panel")) drawPanel(); } catch (e) { /* not mounted yet */ } };
  function gridHtml(yard) {
    const st = curState(), S = ses.S;
    if (roomOwned) { // "My items": only what you own that fits here
      const mine = Object.values(H.D).filter((d) => !d.virtual && fitsHere(d, yard) && ownedItem(d) && d.price > 0).sort((a, b) => a.price - b.price);
      return `${shelfHead(T("내 아이템", "My items"), `${mine.length}`)}${mine.length ? `<div class="kh-items-grid">${mine.map((d) => `<button type="button" class="kh-item" data-item="${d.id}" aria-label="${esc(nm(d))}">${H.thumbSvg(d.id)}<span class="kh-nm">${esc(nm(d))}</span></button>`).join("")}</div>` : `<p class="kh-empty">${T("아직 산 아이템이 없어요.", "You have not bought any items yet.")}</p>`}`;
    }
    if (ses.tab === "style") {
      return `<h3>${T("벽지", "Wallpaper")}</h3><div class="kh-sws">${Object.keys(H.WALLS).map((k) => swatch("wall", k, H.WALLS[k], H.WALLS[k].p === 0 || !!S.walls[k], st.wall === k)).join("")}</div><h3>${T("바닥", "Floor")}</h3><div class="kh-sws">${Object.keys(H.FLOORS).filter((k) => !H.FLOORS[k].yard).map((k) => swatch("floor", k, H.FLOORS[k], H.FLOORS[k].p === 0 || !!S.floors[k], st.floor === k)).join("")}</div>`;
    }
    if (ses.tab === "house") {
      const h = st.house || {};
      const grp = (title, kind, set) => `<h3>${title}</h3><div class="kh-sws">${Object.keys(set).map((k) => `<button type="button" class="kh-sw${h[kind] === k ? " on" : ""}" data-house="${kind}:${k}" aria-pressed="${h[kind] === k}" aria-label="${esc(T(set[k][0], set[k][1]))}"><span class="kh-sw-c" style="background:${set[k][2]}"></span><span class="kh-sw-n">${esc(T(set[k][0], set[k][1]))}</span></button>`).join("")}</div>`;
      return `<h3>${T("집 모양", "House style")}</h3><div class="kh-sws">${Object.keys(H.HOUSE_STYLES).map((k) => { const d = H.HOUSE_STYLES[k]; return optBtn("data-hstyle", k, h.style === k, H.houseThumb(k, st), T(d.n[0], d.n[1]), d.p, d.p === 0 || !!S.houseStyles[k]); }).join("")}</div>
        <p class="kh-subnote">${T("집을 옮기거나 돌리려면 왼쪽 그림에서 집을 눌러요.", "To move or turn the house, tap it in the picture.")}</p>
        ${H.housePic(h.style) ? "" : grp(T("외벽", "Walls"), "wall", H.HOUSE_WALLS) + grp(T("지붕", "Roof"), "roof", H.HOUSE_ROOFS) + grp(T("현관문", "Door"), "door", H.HOUSE_DOORS)}`;
    }
    if (ses.tab === "garden") {
      const own = (kind, key, p) => !p || !!(S[kind] && S[kind][key]);
      return `<h3>${T("정원 모양 (한 번에 바꾸기)", "Garden looks")}</h3><div class="kh-sws">${Object.keys(H.GARDEN_PRESETS).map((k) => { const g = H.GARDEN_PRESETS[k], fl = H.FLOORS[g.floor]; return `<button type="button" class="kh-sw kh-opt${st.floor === g.floor && st.border === g.border && st.path === g.path && st.size === g.size ? " on" : ""}" data-gpreset="${k}">${H.uiImg("g_" + k) ? `<span class="kh-optic" aria-hidden="true"><img src="${H.uiImg("g_" + k)}" alt=""></span>` : `<span class="kh-sw-c" style="background:${fl.c};box-shadow:inset 0 0 0 5px ${fl.a}"></span>`}<span class="kh-sw-n">${esc(T(g.n[0], g.n[1]))}</span></button>`; }).join("")}</div>
        <h3>${T("땅", "Ground")}</h3><div class="kh-sws">${Object.keys(H.FLOORS).filter((k) => H.FLOORS[k].yard).map((k) => swatch("floor", k, H.FLOORS[k], H.FLOORS[k].p === 0 || !!S.floors[k], st.floor === k)).join("")}</div>
        <h3>${T("울타리", "Border")}</h3><div class="kh-sws">${Object.keys(H.BORDERS).map((k) => optBtn("data-gborder", k, (st.border || "none") === k, uiIc("b_" + k, { none: "∅", fence: "🚧", hedge: "🌿", stone: "🧱" }[k]), T(H.BORDERS[k][0], H.BORDERS[k][1]))).join("")}</div>
        <h3>${T("길", "Path")}</h3><div class="kh-sws">${Object.keys(H.PATHS).map((k) => optBtn("data-gpath", k, (st.path || "none") === k, uiIc("p_" + k, { none: "∅", stones: "🪨", brick: "🟫", plank: "🪵" }[k]), T(H.PATHS[k][0], H.PATHS[k][1]))).join("")}</div>
        <h3>${T("마당 크기", "Yard size")}</h3><div class="kh-sws">${Object.keys(H.YARD_SIZES).map((k) => { const z = H.YARD_SIZES[k]; return optBtn("data-gsize", k, (st.size || "normal") === k, `${z.C}×${z.R}`, T(z.n[0], z.n[1]), z.p, own("yardSizes", k, z.p)); }).join("")}</div>`;
    }
    const list = Object.values(H.D).filter((d) => !d.virtual && d.cat === ses.tab && fitsHere(d, yard)).sort((a, b) => a.price - b.price);
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
  // sell a piece of furniture: every copy placed in any room / the yard goes with it
  function sellHouseItem(id) {
    const S = ses.S, d = H.D[id];
    if (!d || !S.owned[id]) return false;
    delete S.owned[id];
    Object.keys(S.slots).forEach((k) => { S.slots[k].items = (S.slots[k].items || []).filter((i) => i.id !== id); });
    if (S.yard) S.yard.items = (S.yard.items || []).filter((i) => i.id !== id);
    if (curOpts.refund) curOpts.refund(Math.floor(d.price * 0.8), "housesell:" + id);
    ses.sel = null; save(); recalcZ(curState()); drawScene(); drawPanel(); hideMenu();
    return true;
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
        const sellable = ownedItem(d) && d.price > 0 && !H.STARTER_OWNED.includes(id);
        detail({ title: nm(d), pic: H.thumbSvg(id), price: d.price, own: ownedItem(d), go: T("배치하기", "Place"), keep: true, spendWhy: "house:" + id,
          sell: sellable ? { paid: d.price, back: Math.floor(d.price * 0.8), onSell: () => sellHouseItem(id) } : null,
          onGo: () => { placeNew(id); placeKoalaFree(); updateKoala(); },
          onBuy: () => { S.owned[id] = 1; save(); drawPanel(); toast(T("샀어요! 다시 눌러서 놓아 봐요.", "Bought! Tap it again to place it.")); } });
      });
    });
    grid.querySelectorAll("[data-sw]").forEach((b) => {
      b.onclick = () => {
        const [kind, key] = b.dataset.sw.split(":"), def = (kind === "wall" ? H.WALLS : H.FLOORS)[key], store = kind === "wall" ? S.walls : S.floors, own = def.p === 0 || !!store[key];
        if (yard && kind === "floor") { runYard(planYard({ floor: key }, own ? 0 : def.p, "floor:" + key, T(def.n[0], def.n[1])), () => { store[key] = 1; }); return; }
        const apply = () => { curState()[kind] = key; save(); drawScene(); drawPanel(); };
        detail({ title: T(def.n[0], def.n[1]), pic: `<span class="kh-sw-c big" style="background:${def.c};box-shadow:inset 0 0 0 8px ${def.a}"></span>`, price: def.p, own, go: T("바꾸기", "Apply"), spendWhy: kind + ":" + key,
          onGo: apply, onBuy: () => { store[key] = 1; save(); drawPanel(); toast(T("샀어요! 다시 눌러서 써 봐요.", "Bought! Tap it again to use it.")); } });
      };
    });
    grid.querySelectorAll("[data-house]").forEach((b) => { b.onclick = () => { const [kind, key] = b.dataset.house.split(":"); const st = curState(); st.house = st.house || {}; st.house[kind] = key; save(); drawScene(); drawPanel(); }; });
    grid.querySelectorAll(".kh-hthumb").forEach((sv) => { try { const bb = sv.firstChild.getBBox(), pad = 4; sv.setAttribute("viewBox", `${bb.x - pad} ${bb.y - pad} ${bb.width + pad * 2} ${bb.height + pad * 2}`); } catch (e) { /* not laid out yet */ } });
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
  function koala3d(worn, cls, view) {
    const w = worn || (H.load().worn || {});
    const names = kordered(w);
    const imgs = names.map((n) => { const b = KBOX[n]; return `<image href="${kimg(n)}" x="${b[0]}" y="${b[1]}" width="${b[2] - b[0]}" height="${b[3] - b[1]}"/>`; }).join("");
    return `<svg class="${cls || "kh-k3d"}" viewBox="${view || "64 130 553 910"}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="3D Koala" focusable="false">${imgs}</svg>`;
  }
  // wall + floor behind the 3D koala: the same room backdrop the 2D koala stands in
  function wardBackdrop() {
    if (!window.KoalaArt || !KoalaArt.room) return "";
    return KoalaArt.room({}, {}, { bare: true }).replace('class="koala-room-svg"', 'class="kh-ward-bg" preserveAspectRatio="xMidYMax slice"');
  }
  let wardSlot = "hat";
  let wardOwned = false, wardApi = null, wardMsg = "";
  const ID2D_OVR = { glasses: "roundGlasses", scarf: "redScarf", bunnyslippers: "slippers", soccercleats: "soccerBoots", cateye: "catEyeGlasses" };
  const id2d = (n) => ID2D_OVR[n] || (window.KoalaCore ? (KoalaCore.ITEMS.find((i) => i.id.toLowerCase() === n) || {}).id : n) || n;
  // sell a 3D outfit piece back (it is the same purchase as the Sticker one). Returns the "sell" part of a detail popup, or null.
  function clothSell(n, after) {
    if (!wardApi || !wardApi.sell || !curOpts) return null;
    const st = wardApi.status(id2d(n));
    if (!st || st.state !== "owned" || !(st.paid > 0 || curOpts.unlimited)) return null;
    const paid = st.paid || 0;
    return { paid, back: Math.floor(paid * 0.8), onSell: () => { const ok = wardApi.sell(id2d(n)); if (ok && after) after(); return ok; } };
  }
  window.KoalaHouse.setWardApi = (a) => { wardApi = a || null; };
  window.KoalaHouse.setWardOwned = (v) => { wardOwned = !!v; };
  function mountWardrobe(root, opts) {
    if (ses) destroy();
    curOpts = opts;
    wardHost = root;
    const S = H.load();
    S.worn = S.worn || {};
    const slotName = { hat: T("머리", "Head"), face: T("얼굴", "Face"), neck: T("목", "Neck"), body: T("상의", "Tops"), legs: T("하의", "Bottoms"), back: T("등", "Back"), feet: T("신발", "Shoes") };
    const slotIcon = { hat: "🎩", face: "👓", neck: "🧣", body: "👕", legs: "👖", back: "🎒", feet: "👟" };
    const chipName = (sl) => `${slotIcon[sl] || ""} ${slotName[sl]}`;
    const slots = Object.keys(KSLOT);
    if (!KSLOT[wardSlot]) wardSlot = slots[0];
    const stOf = (n) => { const st = wardApi ? wardApi.status(id2d(n)) : { state: "owned" }; return st || { state: "owned" }; };
    const hasIt = (n) => stOf(n).state === "owned";
    const itemBtn = (sl, n) => {
      const st = stOf(n), on = S.worn[sl] === n, own = st.state === "owned";
      const tag = own ? (on ? T("입는 중", "Wearing") : T("입기", "Wear")) : st.state === "buyable" ? (st.cost ? `💰 ${st.cost}` : T("받기", "Get")) : (st.cost ? `💰 ${st.cost}` : `🔒 ${st.hint || ""}`);
      return `<button type="button" class="kh-item kh-kitem${on ? " on" : ""}${own ? "" : st.state === "buyable" || st.cost ? " kh-buy" : " kh-locked"}" data-wear="${sl}:${n}" aria-pressed="${on}"><img src="${kthumb(n)}" alt="" draggable="false"><span class="kh-nm">${esc(T(KNAME[n][0], KNAME[n][1]))}</span><span class="kh-pr kh-state">${tag}</span></button>`;
    };
    const clearBtn = `<button type="button" class="kh-btn alt kh-clear" data-clear>${T("모두 벗기기", "Take Off All")}</button>`;
    const ownedHtml = () => {
      const all = []; slots.forEach((sl) => KSLOT[sl].forEach((n) => { if (hasIt(n)) all.push([sl, n]); }));
      return `<div class="kh-grid">${shelfHead(T("내 아이템", "My items"), `${all.length}`)}${all.length ? `<div class="kh-items-grid">${all.map(([sl, n]) => itemBtn(sl, n)).join("")}</div>${slots.some((sl) => S.worn[sl]) ? clearBtn : ""}` : `<p class="kh-empty">${T("아직 구매한 아이템이 없어요.", "You haven't bought any items yet.")}</p>`}</div>`;
    };
    const draw = () => {
      const names = kordered(S.worn);
      const imgs = names.map((n) => { const b = KBOX[n]; return `<image href="${kimg(n)}" x="${b[0]}" y="${b[1]}" width="${b[2] - b[0]}" height="${b[3] - b[1]}"/>`; }).join("");
      const wornN = slots.filter((sl) => S.worn[sl]).length;
      root.className = "kh-app kh-embed kh-ward";
      fit(root);
      root.innerHTML = `<div class="kh-ward-stage" id="kh-wstage">${wardBackdrop()}<svg class="kh-ward-koala" viewBox="64 20 553 1020" role="img" aria-label="${T("3D 코알라", "3D Koala")}"><ellipse cx="340" cy="962" rx="205" ry="22" fill="#000" opacity=".16"/><g class="kh-wbody">${imgs}</g></svg><p class="kh-ward-tip">${T("코알라를 눌러 보세요!", "Tap the koala!")}</p></div>
        <aside class="kh-panel">${chipsHtml(slots.map((sl) => [sl, `/img/cat/${sl}.webp`, slotName[sl]]), wardOwned ? "" : wardSlot)}
        ${wardOwned ? ownedHtml() : `<div class="kh-grid">${shelfHead(slotName[wardSlot], `${S.worn[wardSlot] ? 1 : 0}/${KSLOT[wardSlot].length}`)}<div class="kh-items-grid">${KSLOT[wardSlot].map((n) => itemBtn(wardSlot, n)).join("")}</div>
        ${wornN ? clearBtn : ""}${wardMsg ? `<p class="kh-empty">${esc(wardMsg)}</p>` : ""}</div>`}</aside>`;
      root.querySelectorAll("[data-tab]").forEach((b) => { b.onclick = () => { wardSlot = b.dataset.tab; if (wardOwned) { wardOwned = false; window.dispatchEvent(new CustomEvent("kh-owned-off")); } draw(); }; });
      initCats(root);
      root.querySelectorAll("[data-wear]").forEach((b) => { b.onclick = () => {
        const [slot, n] = b.dataset.wear.split(":"); const st = stOf(n), nmN = T(KNAME[n][0], KNAME[n][1]), pic = `<img src="${kthumb(n)}" alt="" draggable="false">`;
        const wearIt = () => { if (S.worn[slot] === n) delete S.worn[slot]; else S.worn[slot] = n; H.persist(S); window.dispatchEvent(new CustomEvent("kh-worn")); draw(); };
        if (st.state === "owned") { detail({ title: nmN, pic, price: 0, own: true, go: S.worn[slot] === n ? T("벗기", "Take off") : T("입기", "Wear"), onGo: wearIt,
          sell: clothSell(n, () => { Object.keys(S.worn).forEach((k) => { if (S.worn[k] === n) delete S.worn[k]; }); H.persist(S); window.dispatchEvent(new CustomEvent("kh-worn")); draw(); }) }); return; }
        if (st.state === "buyable") { detail({ title: nmN, pic, price: st.cost || 0, own: false, afford: true, spendFn: () => true, spendWhy: "", onBuy: () => { if (!wardApi.buy(id2d(n))) { toast(T("코인이 모자라요", "Not enough coins"), true); draw(); return; } wardMsg = ""; draw(); toast(T("샀어요! 다시 눌러서 입어 봐요.", "Bought! Tap it again to wear it.")); } }); return; }
        wardMsg = st.cost ? T("코인이 모자라요: ", "Not enough coins: ") + st.cost : st.hint ? T("잠겨 있어요: ", "Locked: ") + st.hint : T("아직 열 수 없어요.", "Not available yet."); draw();
      }; });
      const clr = root.querySelector("[data-clear]"); if (clr) clr.onclick = () => { S.worn = {}; H.persist(S); window.dispatchEvent(new CustomEvent("kh-worn")); draw(); };
      const kb = root.querySelector(".kh-wbody"); root.querySelector("#kh-wstage").onclick = () => { kb.classList.remove("hop"); void kb.getBoundingClientRect(); kb.classList.add("hop"); };
    };
    if (wardApi) { let ch = false; slots.forEach((sl) => { if (S.worn[sl] && !hasIt(S.worn[sl])) { delete S.worn[sl]; ch = true; } }); if (ch) H.persist(S); }
    draw();
  }

  window.KoalaHouse.mount = mount;
  window.KoalaHouse.unmount = destroy;
  window.KoalaHouse.mountWardrobe = mountWardrobe;
  window.KoalaHouse.koala3d = koala3d;
})();
