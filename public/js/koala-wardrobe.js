// Koala Study Mate — the 3D koala wardrobe (Character tab) and the small 3D koala picture. Self-contained since stage 5 S8
// (2026-11-17): the old Pop-out house (koala-house.js, koala-house-ui.js) and the 2D art (koala-art.js) are gone, so the few
// helpers the wardrobe borrowed from them live here now. What is worn stays where it always was: koalaHouse:v2.worn on the
// device (decision 5) — the rest of that old save is kept untouched (the move-in code may still read it).
//   KoalaHouse.mountWardrobe(el, opts)  ·  KoalaHouse.koala3d(worn, cls, view)  ·  setWardApi  ·  setWardOwned
(function () {
  "use strict";
  const H = window.KoalaHouse = window.KoalaHouse || {};
  /* ---- what is worn: koalaHouse:v2.worn (only that field is changed — the rest of the old save stays as it was) ---- */
  const STORE_KEY = "koalaHouse:v2";
  H.load = function () {
    try { const s = JSON.parse(localStorage.getItem(STORE_KEY)); if (s && typeof s === "object") { if (!s.worn || typeof s.worn !== "object") s.worn = {}; return s; } } catch (e) { /* broken: start clean, the raw text is left alone */ }
    return { worn: {} };
  };
  H.persist = function (S) {
    try {
      let cur = null; try { cur = JSON.parse(localStorage.getItem(STORE_KEY)); } catch (e) { cur = null; }
      if (localStorage.getItem(STORE_KEY) != null && (!cur || typeof cur !== "object")) return;   // never overwrite a broken old save (support keeps it)
      localStorage.setItem(STORE_KEY, JSON.stringify(Object.assign(cur || {}, { worn: S.worn || {} })));
    } catch (e) { /* storage may be blocked */ }
  };
  H.loadCatalog = async function () { /* the old house catalog is gone; kept so callers need no change */ };

  /* ---- the 3D koala's picture tables (moved from koala-house-ui.js) ---- */
  const KBOX = Object.assign({ base: [64, 222, 617, 968], hoodie: [122, 528, 562, 819], backpack: [131, 545, 560, 832], scarf: [185, 531, 497, 780], glasses: [162, 362, 520, 500], bushhat: [108, 188, 574, 441], partyhat: [259, 100, 422, 290], crown: [249, 190, 433, 295] }, {"bluecap": [151, 180, 530, 403], "gradhat": [135, 133, 546, 400], "flowercrown": [139, 198, 540, 415], "wizardhat": [189, 22, 492, 345], "santahat": [70, 111, 589, 376], "beanie": [150, 89, 534, 419], "cowboyhat": [76, 123, 607, 327], "chefhat": [171, 42, 514, 297], "bunnyears": [166, 66, 508, 362]}, {"sunglasses": [151, 369, 531, 495], "starglasses": [151, 344, 541, 507], "heartglasses": [187, 364, 494, 509], "cateye": [142, 352, 540, 499], "goggles": [142, 352, 540, 493], "eyepatch": [228, 269, 536, 485], "moustache": [250, 462, 436, 528], "freckles": [176, 456, 506, 517], "monocle": [356, 362, 499, 503]}, {"pearlnecklace": [233, 546, 451, 633], "goldchain": [233, 551, 448, 653], "heartpendant": [276, 555, 409, 664], "starpendant": [271, 560, 409, 662], "diamondpendant": [270, 556, 412, 662], "bowtie": [240, 528, 443, 631], "rubybrooch": [352, 572, 439, 694], "goldmedal": [246, 552, 430, 765]}, {"tshirt": [148, 539, 537, 821], "stripeshirt": [104, 543, 579, 815], "pinkdress": [117, 544, 566, 848], "labcoat": [119, 538, 564, 866], "overalls": [149, 549, 536, 935], "jersey": [131, 548, 560, 826]}, {"herocape": [146, 705, 539, 875], "angelwings": [68, 281, 616, 642], "butterflywings": [73, 432, 607, 790], "surfboard": [243, 32, 564, 584]}, {"sneakers": [214, 867, 470, 965], "rainboots": [198, 832, 488, 978], "cowboyboots": [189, 815, 493, 978], "balletshoes": [199, 850, 485, 987], "bunnyslippers": [185, 837, 497, 978], "soccercleats": [192, 882, 490, 975], "sandals": [199, 875, 485, 970], "rollerskates": [183, 845, 500, 1030]}, {"jeans": [181, 703, 502, 895], "khakishorts": [180, 680, 505, 894], "plaidskirt": [151, 609, 530, 861], "tutu": [97, 659, 588, 862], "cargopants": [178, 698, 505, 895], "sweatpants": [180, 648, 504, 895], "denimskirt": [153, 652, 524, 863], "flowerskirt": [137, 649, 549, 872]});
  const KBACK = {"scarf":[180.4,534.6,501.6,776.4],"hoodie":[106,518,574,768],"tshirt":[134.0,566.0,547.0,843.0],"stripeshirt":[106,535,577,765],"wizardhat":[175.0,13.4,505.0,350],"santahat":[205.0,59.3,475.0,406],"chefhat":[215.0,71.9,465.0,340],"bunnyears":[195.0,111.2,485.0,322],"gradhat":[124.3,139.6,556.7,393.4],"beanie":[172.7,66.8,511.3,441.2],"cowboyhat":[105.3,110.3,577.7,339.7],"herocape":[135.3,543.2,544.3,900.2],"angelwings":[60.0,480,620.0,736.8],"butterflywings":[80.0,470,600.0,816.0],"surfboard":[280.0,430,400.0,910],"pinkdress":[104,538,578,919],"labcoat":[118,524,565,788],"overalls":[134.0,566.0,547.0,929.0],"jersey":[120,561,561,804],"jeans":[182,728,498,933],"khakishorts":[174.0,722.0,506.0,893.0],"cargopants":[183,728,498,908],"sweatpants":[174.0,722.0,506.0,929.0],"plaidskirt":[151.0,609.0,530.0,861.0],"denimskirt":[178.0,630.0,502.0,834.0],"flowerskirt":[137.0,649.0,549.0,872.0],"tutu":[97.0,659.0,588.0,862.0],"sneakers":[212,823,467,963],"rainboots":[200,830,481,966],"cowboyboots":[196,812,485,966],"balletshoes":[207,822,473,966],"bunnyslippers":[201,825,480,966],"soccercleats":[206,826,475,966],"sandals":[212,821,469,966],"rollerskates":[195.0,863.0,485.0,975.0],"backpack":[122,491,563,795],"bushhat":[108.0,197.9,574.0,441.0],"partyhat":[240.0,45.1,440.0,352],"crown":[175.0,174.9,505.0,346],"bluecap":[151.0,160.3,530.0,403.0],"flowercrown":[139.0,93.9,540.0,415.0]};   // x
  const KBOOTCUT = { cowboyboots: 822, rollerskates: 872 };   // canvas row of the boot top: the koala's legs are drawn only above it
  const KBEHIND = ["herocape", "angelwings", "butterflywings", "surfboard", "backpack"];   // drawn under the body in the front views (from behind they are over it)
  const kordered = (worn) => { const w = Object.values(worn || {}); return KBEHIND.filter((n) => w.includes(n)).concat(["base"], KORDER.filter((n) => w.includes(n))); };
  const KORDER = ["backpack", "hoodie", "tshirt", "stripeshirt", "pinkdress", "labcoat", "overalls", "jersey", "jeans", "khakishorts", "cargopants", "sweatpants", "plaidskirt", "denimskirt", "flowerskirt", "tutu", "sneakers", "rainboots", "cowboyboots", "balletshoes", "bunnyslippers", "soccercleats", "sandals", "rollerskates", "scarf", "pearlnecklace", "goldchain", "heartpendant", "starpendant", "diamondpendant", "bowtie", "rubybrooch", "goldmedal", "glasses", "bushhat", "partyhat", "crown", "bluecap", "gradhat", "flowercrown", "wizardhat", "santahat", "beanie", "cowboyhat", "chefhat", "bunnyears", "sunglasses", "starglasses", "heartglasses", "cateye", "goggles", "eyepatch", "moustache", "freckles", "monocle"];
  const KSLOT = { hat: ["bushhat", "partyhat", "crown", "bluecap", "gradhat", "flowercrown", "wizardhat", "santahat", "beanie", "cowboyhat", "chefhat", "bunnyears"], face: ["glasses", "sunglasses", "starglasses", "heartglasses", "cateye", "goggles", "eyepatch", "moustache", "freckles", "monocle"], neck: ["scarf", "pearlnecklace", "goldchain", "heartpendant", "starpendant", "diamondpendant", "bowtie", "rubybrooch", "goldmedal"], body: ["hoodie", "tshirt", "stripeshirt", "pinkdress", "labcoat", "overalls", "jersey"], legs: ["jeans", "khakishorts", "cargopants", "sweatpants", "plaidskirt", "denimskirt", "flowerskirt", "tutu"], back: ["backpack", "herocape", "angelwings", "butterflywings", "surfboard"], feet: ["sneakers", "rainboots", "cowboyboots", "balletshoes", "bunnyslippers", "soccercleats", "sandals", "rollerskates"] };
  const KNAME = { bushhat: ["부시햇", "Bush Hat"], partyhat: ["파티 모자", "Party Hat"], crown: ["왕관", "Crown"], bluecap: ["파란 모자", "Blue Cap"], gradhat: ["졸업 모자", "Graduation Hat"], flowercrown: ["꽃 왕관", "Flower Crown"], wizardhat: ["마법사 모자", "Wizard Hat"], santahat: ["산타 모자", "Santa Hat"], beanie: ["털모자", "Winter Beanie"], cowboyhat: ["카우보이 모자", "Cowboy Hat"], chefhat: ["요리사 모자", "Chef Hat"], bunnyears: ["토끼 귀", "Bunny Ears"], glasses: ["안경", "Glasses"], sunglasses: ["선글라스", "Sunglasses"], starglasses: ["별 안경", "Star Glasses"], heartglasses: ["하트 안경", "Heart Glasses"], cateye: ["캣아이 안경", "Cat-eye Glasses"], goggles: ["수영 고글", "Swim Goggles"], eyepatch: ["안대", "Eye Patch"], moustache: ["콧수염", "Moustache"], freckles: ["주근깨", "Freckles"], monocle: ["외알 안경", "Monocle"], scarf: ["목도리", "Scarf"], pearlnecklace: ["진주 목걸이", "Pearl Necklace"], goldchain: ["금 목걸이", "Gold Chain"], heartpendant: ["하트 펜던트", "Heart Pendant"], starpendant: ["별 펜던트", "Star Pendant"], diamondpendant: ["다이아 펜던트", "Diamond Pendant"], bowtie: ["나비넥타이", "Bow Tie"], rubybrooch: ["루비 브로치", "Ruby Brooch"], goldmedal: ["금메달", "Gold Medal"], hoodie: ["후드티", "Hoodie"], tshirt: ["빨간 티셔츠", "Red T-shirt"], stripeshirt: ["줄무늬 셔츠", "Striped Shirt"], pinkdress: ["분홍 원피스", "Pink Dress"], labcoat: ["과학자 가운", "Lab Coat"], overalls: ["멜빵바지", "Overalls"], jersey: ["축구 유니폼", "Soccer Jersey"], backpack: ["배낭", "Backpack"], herocape: ["영웅 망토", "Hero Cape"], angelwings: ["천사 날개", "Angel Wings"], butterflywings: ["나비 날개", "Butterfly Wings"], surfboard: ["서핑보드", "Surfboard"], sneakers: ["운동화", "Sneakers"], rainboots: ["노란 장화", "Rain Boots"], cowboyboots: ["카우보이 부츠", "Cowboy Boots"], balletshoes: ["발레 슈즈", "Ballet Shoes"], bunnyslippers: ["토끼 슬리퍼", "Bunny Slippers"], soccercleats: ["축구화", "Soccer Cleats"], sandals: ["샌들", "Sandals"], rollerskates: ["롤러스케이트", "Roller Skates"], jeans: ["청바지", "Jeans"], khakishorts: ["카키 반바지", "Khaki Shorts"], cargopants: ["카고 바지", "Cargo Pants"], sweatpants: ["남색 조거팬츠", "Jogger Pants"], plaidskirt: ["체크 치마", "Plaid Skirt"], denimskirt: ["청치마", "Denim Skirt"], flowerskirt: ["꽃무늬 치마", "Flower Skirt"], tutu: ["튀튀 치마", "Tutu"] };
  // Admin-added clothing: id -> { src, box:[x0,y0,x1,y1] }. Their picture lives on the server and
  // their place on the koala is the admin's saved "fit" (see syncCustomWard / koala-admin-items.js).
  const CUSTOM_WARD = {};
  const kimg = (n) => (CUSTOM_WARD[n] ? CUSTOM_WARD[n].src : `/img/koala/${n}.webp`);
  const kthumb = (n) => (CUSTOM_WARD[n] ? CUSTOM_WARD[n].src : `/img/koala/th/${n}.webp`);   // clean product-style picture for the shop grids

  /* ---- small helpers ---- */
  let curOpts = null, wardHost = null, modalEl = null;
  const ses = null;   // there is no house session any more; the helpers below only ever see the wardrobe
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const T = (ko, en) => curOpts.L(en, ko);
  const COIN = '<span class="kh-coin" aria-hidden="true"></span>';
  const SP_ICONS = window.SP_ICONS = {
  coin: '<svg class="spp-ic" viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="spc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe27a"/><stop offset="1" stop-color="#f2a921"/></linearGradient></defs><circle cx="16" cy="16" r="14.5" fill="url(#spc)" stroke="#c98412" stroke-width="2"/><circle cx="16" cy="16" r="10.2" fill="none" stroke="#c98412" stroke-width="1.6" opacity=".7"/><path d="M20.4 12.4a5.6 5.6 0 1 0 0 7.2" fill="none" stroke="#a8630a" stroke-width="3" stroke-linecap="round"/></svg>',
  gear: '<svg class="spp-ic" viewBox="0 0 32 32" aria-hidden="true"><path d="M13.6 3h4.8l.8 3.4a10 10 0 0 1 2.3 1.3l3.3-1 2.4 4.1-2.5 2.4a10 10 0 0 1 0 2.6l2.5 2.4-2.4 4.1-3.3-1a10 10 0 0 1-2.3 1.3l-.8 3.4h-4.8l-.8-3.4a10 10 0 0 1-2.3-1.3l-3.3 1-2.4-4.1 2.5-2.4a10 10 0 0 1 0-2.6L4.5 11.8l2.4-4.1 3.3 1a10 10 0 0 1 2.3-1.3z" fill="#c68a4c" stroke="#8a5528" stroke-width="1.6" stroke-linejoin="round"/><circle cx="16" cy="16" r="4.4" fill="#fff3dc" stroke="#8a5528" stroke-width="1.6"/></svg>',
  wallet: '<svg class="spp-ic spp-ic-w" viewBox="0 0 40 36" aria-hidden="true"><circle cx="24" cy="9" r="6" fill="#f7c93c" stroke="#c98412" stroke-width="1.6"/><circle cx="17" cy="11" r="5.2" fill="#ffd95a" stroke="#c98412" stroke-width="1.6"/><path d="M5 14c0-2.2 1.8-4 4-4h20c2.2 0 4 1.8 4 4v2H5z" fill="#a8683a" stroke="#6e3f1e" stroke-width="1.6"/><rect x="3" y="14" width="34" height="19" rx="4.5" fill="#c98250" stroke="#6e3f1e" stroke-width="1.8"/><path d="M6.5 17.5h27M6.5 29.5h27" stroke="#f0c9a0" stroke-width="1.2" stroke-dasharray="2.4 2.4" opacity=".8"/><rect x="26" y="19.5" width="11" height="8" rx="3" fill="#a8683a" stroke="#6e3f1e" stroke-width="1.6"/><circle cx="30.5" cy="23.5" r="1.7" fill="#ffd95a"/></svg>',
  };
  function refreshCoins() {}
  function toast(msg, bad) { if (H._ward) H._ward.setMsg(bad ? msg : ""); }
  const fit = (r) => r.classList.toggle("kh-narrow", r.clientWidth > 0 && r.clientWidth < 820);
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
    modal(`<h2>${esc(o.title)}</h2><div class="kh-buy-pic kh-detail-pic${o.own ? "" : " is-locked"}">${o.pic}</div>${playBtn}${playBtn ? `<p class="kh-asmr-note" data-asmr-note role="status" hidden>${T("구매하신 후 ASMR상자에 넣고 재생시켜 주세요", "Buy it, put it in the ASMR Box, then play it from the box.")}</p>` : ""}${priceHtml}${note}<div class="kh-btns">${btns}</div>${o.adminEdit ? `<button type="button" class="kh-btn alt" data-admin-edit>${T("✏️ 관리자: 아이템 수정", "✏️ Admin: edit item")}</button>` : ""}${o.adminDel ? `<button type="button" class="kh-btn alt kh-admin-del" data-admin-del>${T("🗑 관리자: 아이템 삭제", "🗑 Admin: delete item")}</button>` : ""}`, (m) => {
      const ade = m.querySelector("[data-admin-edit]");
      if (ade) ade.onclick = o.adminEdit;
      const adb = m.querySelector("[data-admin-del]");
      if (adb) adb.onclick = o.adminDel;
      const pb = m.querySelector("[data-play]");
      if (pb) {   // a ▶ button: plays the toy's ASMR sound, tap again to stop. The picture wiggles while it plays.
        const pic = m.querySelector(".kh-detail-pic"), asmrNote = m.querySelector("[data-asmr-note]");
        const sync = (id) => { const on = id === o.sound; pb.setAttribute("aria-pressed", on); pb.classList.toggle("is-on", on); pic.classList.toggle("is-playing", on); pb.querySelector(".kh-play-ic").textContent = on ? "■" : "▶"; pb.querySelector(".kh-play-tx").textContent = on ? T("멈추기", "Stop") : T("소리 듣기", "Listen"); };
        const off = ASMR.onChange(sync);
        m._asmrOff = off;
        // Only a bought toy that is inside an ASMR box, opened from that box's list (o.canPlay), may play. Anything else shows the note inside the card.
        pb.onclick = () => {
          if (!o.canPlay) { ASMR.stop(); sync(null); if (asmrNote) asmrNote.hidden = false; return; }
          if (asmrNote) asmrNote.hidden = true;
          if (!ASMR.toggle(o.sound)) sync(null);
        };
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
    const goBtn = o.go && o.onGo ? `<button type="button" class="spp-btn teal" data-primary data-go>${esc(o.go)}</button>` : "";
    modal(`<div class="spp-card"><div class="spp-head"><button type="button" class="spp-close" data-no><svg class="spp-x" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg> ${T("닫기", "Close")}</button></div>
      <div class="spp-stage">${o.pic}</div><div class="spp-name">${esc(o.title)}</div>
      <div class="spp-rows"><div class="spp-row"><span>${SP_ICONS.coin} ${T("산 가격", "Price you paid")}</span><b>${SP_ICONS.coin} ${sl.paid}</b></div><div class="spp-row"><span>${SP_ICONS.gear} ${T("수수료 (20%)", "Fee (20%)")}</span><b>− ${fee}</b></div><div class="spp-row total"><span>${SP_ICONS.wallet} ${T("지갑으로 돌아와요", "Back to your wallet")}</span><b>+ ${back}</b></div></div>
      ${sl.note ? `<p class="spp-note">${esc(sl.note)}</p>` : ""}
      ${free ? `<p class="spp-note">${T("관리자는 코인이 무제한이라 환불은 없어요.", "Admin has unlimited coins, so nothing comes back.")}</p>` : ""}
      <div class="spp-btns">${goBtn}<button type="button" class="spp-btn orange" data-yes><span aria-hidden="true">💰</span> ${T("되팔기", "Sell")}</button></div></div>`, (m) => {
      const sheet = m.querySelector(".kh-sheet"); if (sheet) sheet.classList.add("spp-sheet");
      const go = m.querySelector("[data-go]"); if (go) go.onclick = () => { if (!o.keep) closeModal(); o.onGo(); };
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
    const adminAddCat = curOpts && curOpts.isAdmin ? `<button type="button" role="tab" class="kh-cat kh-admin-add-cat" data-kh-admin-add-cat aria-label="${T("카테고리 추가", "Add category")}">+</button>` : "";
    return `<div class="kh-cats-wrap"><button type="button" class="kh-cats-nav prev" data-cnav="-1" aria-label="${T("왼쪽으로", "Scroll left")}" hidden>‹</button><div class="kh-cats" role="tablist">${tabs.map((t) => `<button type="button" role="tab" class="kh-cat${t[0] === cur ? " on" : ""}" data-tab="${t[0]}" aria-selected="${t[0] === cur}">${t[1] && /\.webp$/.test(t[1]) ? `<img class="kh-cat-ic" src="${t[1]}" alt="" draggable="false">` : ""}<span>${esc(t[2])}</span></button>`).join("")}${adminAddCat}</div><button type="button" class="kh-cats-nav next" data-cnav="1" aria-label="${T("오른쪽으로", "Scroll right")}" hidden>›</button></div>`;
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
  H._ui = {
    KBOX, KSLOT, KNAME, KORDER, KBEHIND, KBACK, KBOOTCUT, CUSTOM_WARD, kordered, kimg, kthumb,
    T, fit, esc, chipsHtml, shelfHead, initCats, detail, toast, closeModal,
    opts: () => curOpts, setOpts: (o) => { curOpts = o; }, setWardHost: (r) => { wardHost = r; },
    endSession: () => {},
  };
})();

(function () {
  "use strict";
  const H = window.KoalaHouse;
  if (!H || !H._ui) return;
  const U = H._ui;
  const { KBOX, KSLOT, KNAME, KORDER, KBEHIND, KBACK, KBOOTCUT, CUSTOM_WARD, kordered, kimg, kthumb, T, fit, esc, chipsHtml, shelfHead, initCats, detail, toast, closeModal } = U;

  /* ------------------------------ 3D wardrobe (Character tab) ------------------------------ */
  // The 3D koala as a small picture (the Character tab's status card uses it). worn: { slot: name } (default: what is saved).
  function koala3d(worn, cls, view) {
    const w = worn || (H.load().worn || {});
    const names = kordered(w);
    const imgs = names.map((n) => { const b = KBOX[n]; return `<image href="${kimg(n)}" x="${b[0]}" y="${b[1]}" width="${b[2] - b[0]}" height="${b[3] - b[1]}"/>`; }).join("");
    return `<svg class="${cls || "kh-k3d"}" viewBox="${view || "64 130 553 910"}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="3D Koala" focusable="false">${imgs}</svg>`;
  }
  // wall + floor behind the 3D koala — E (2026-11, backdrop A): the fixed cream wall + wood floor, the same as the 2D
  // Character scene (the old Pop-out rooms it used to copy are gone). Dots kept off the edges.
  function wardBackdrop() {
    const split = 62;
    let wall = "", floor = "";
    for (let y = 6; y < split - 4; y += 10) for (let x = (y / 10) % 2 < 1 ? 8 : 14; x < 94; x += 12) wall += `<circle cx="${x}" cy="${y}" r="1.1" fill="#f3e2bd"/>`;
    for (let y = split + 8; y < 100; y += 8) floor += `<rect x="0" y="${y}" width="100" height=".5" fill="#cda973"/>`;
    return `<svg class="kh-ward-bg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><rect width="100" height="100" fill="#fbf1dc"/>${wall}<rect y="${split}" width="100" height="${100 - split}" fill="#dcbd8c"/>${floor}<rect y="${split}" width="100" height="1.4" fill="#000" opacity=".12"/></svg>`;
  }
  let wardSlot = "hat";
  let wardOwned = false, wardApi = null, wardMsg = "", wardBack = false, wardBackReady = null;   // wardBack: the dress-up koala shows its back
  const ID2D_OVR = { glasses: "roundGlasses", scarf: "redScarf", bunnyslippers: "slippers", soccercleats: "soccerBoots", cateye: "catEyeGlasses" };
  const id2d = (n) => ID2D_OVR[n] || (window.KoalaCore ? (KoalaCore.ITEMS.find((i) => i.id.toLowerCase() === n) || {}).id : n) || n;
  // sell a 3D outfit piece back (it is the same purchase as the Sticker one). Returns the "sell" part of a detail popup, or null.
  function clothSell(n, after) {
    if (!wardApi || !wardApi.sell || !U.opts()) return null;
    const st = wardApi.status(id2d(n));
    if (!st || st.state !== "owned" || !(st.paid > 0 || U.opts().unlimited)) return null;
    const paid = st.paid || 0;
    return { paid, back: Math.floor(paid * 0.8), onSell: () => { const ok = wardApi.sell(id2d(n)); if (ok && after) after(); return ok; } };
  }
  window.KoalaHouse.setWardApi = (a) => { wardApi = a || null; };
  window.KoalaHouse.setWardOwned = (v) => { wardOwned = !!v; };
  // 3D wardrobe slot <-> the 2D (Sticker) slot an admin-added item is filed under
  const WARD_TO_2D = { hat: "headwear", face: "face", neck: "jewelry", body: "clothing", legs: "bottoms", back: "accessory", feet: "shoes" };
  // Fold the admin-added clothing that has a 3D picture AND a saved fit into the wardrobe tables
  // (KSLOT = which slot, KNAME = label, KBOX = where it sits, KORDER/KBEHIND = layering).
  function syncCustomWard() {
    if (!window.KoalaCore || !KoalaCore.customFit) return;
    const to3d = {}; Object.keys(WARD_TO_2D).forEach((k) => { to3d[WARD_TO_2D[k]] = k; });
    KoalaCore.ITEMS.forEach((it) => {
      const n = it.id.toLowerCase(), sl = it.custom && to3d[it.slot], src = it.custom && KoalaCore.customImg3d(it.id), f = it.custom && KoalaCore.customFit(it.id);
      if (!sl || !src || !f) return;
      CUSTOM_WARD[n] = { src, box: [f.x, f.y, f.x + f.w, f.y + f.h] };
      KBOX[n] = CUSTOM_WARD[n].box;
      KNAME[n] = [it.name.ko, it.name.en];
      if (!KSLOT[sl].includes(n)) {
        KSLOT[sl].push(n);
        if (sl === "back") KBEHIND.push(n);
        else if (sl === "body" || sl === "legs" || sl === "feet") KORDER.splice(KORDER.indexOf("scarf"), 0, n);
        else KORDER.push(n);
      }
    });
  }
  function mountWardrobe(root, opts) {
    U.endSession();
    if (wardBackReady === null) { wardBackReady = false; const pr = new Image(); pr.onload = () => { wardBackReady = true; }; pr.src = "/img/koala/back_base.webp"; }
    syncCustomWard();
    U.setOpts(opts);
    U.setWardHost(root);
    const S = H.load();
    S.worn = S.worn || {};
    const slotName = { hat: T("머리", "Head"), face: T("얼굴", "Face"), neck: T("목", "Neck"), body: T("상의", "Tops"), legs: T("하의", "Bottoms"), back: T("등", "Back"), feet: T("신발", "Shoes") };
    const slotIcon = { hat: "🎩", face: "👓", neck: "🧣", body: "👕", legs: "👖", back: "🎒", feet: "👟" };
    const chipName = (sl) => `${slotIcon[sl] || ""} ${slotName[sl]}`;
    const slots = Object.keys(KSLOT);
    const wardCats = () => slots.map((sl) => ({ id: WARD_TO_2D[sl], label: slotName[sl] }));
    if (!KSLOT[wardSlot]) wardSlot = slots[0];
    const stOf = (n) => { const st = wardApi ? wardApi.status(id2d(n)) : { state: "owned" }; return st || { state: "owned" }; };
    const hasIt = (n) => stOf(n).state === "owned";
    const itemBtn = (sl, n) => {
      const st = stOf(n), on = S.worn[sl] === n, own = st.state === "owned";
      const tag = own ? (on ? T("입는 중", "Wearing") : T("입기", "Wear")) : st.state === "buyable" ? (st.cost ? `💰 ${st.cost}` : T("받기", "Get")) : (st.cost ? `💰 ${st.cost}` : `🔒 ${st.hint || ""}`);
      return `<button type="button" class="kh-item kh-kitem${on ? " on" : ""}${own ? "" : st.state === "buyable" || st.cost ? " kh-buy" : " kh-locked"}" data-wear="${sl}:${n}" aria-pressed="${on}"><img src="${kthumb(n)}" alt="" draggable="false"><span class="kh-nm">${esc(T(KNAME[n][0], KNAME[n][1]))}</span><span class="kh-pr kh-state">${tag}</span></button>`;
    };
    // admin-added clothing: edit / delete from its detail popup (same tools as the Sticker tab)
    const adminBtns = (n) => {
      const it = window.KoalaCore && CUSTOM_WARD[n] && KoalaCore.itemById(id2d(n));
      if (!opts.isAdmin || !it || !it.custom || !window.KoalaAdminItems) return {};
      const refresh = async (gone) => {
        const i = KoalaCore.ITEMS.findIndex((x) => x.id === it.id); if (i >= 0) KoalaCore.ITEMS.splice(i, 1);
        if (gone) {
          delete CUSTOM_WARD[n]; delete KBOX[n];
          Object.keys(KSLOT).forEach((k) => { const j = KSLOT[k].indexOf(n); if (j >= 0) KSLOT[k].splice(j, 1); });
          [KORDER, KBEHIND].forEach((a) => { const j = a.indexOf(n); if (j >= 0) a.splice(j, 1); });
          Object.keys(S.worn).forEach((k) => { if (S.worn[k] === n) delete S.worn[k]; });
          H.persist(S); window.dispatchEvent(new CustomEvent("kh-worn"));
        }
        if (window.loadKoalaItemCatalog) await window.loadKoalaItemCatalog(); else await KoalaCore.loadItems(true);
        syncCustomWard(); closeModal(); draw();
      };
      return {
        adminEdit: () => KoalaAdminItems.openItemForm({ kind: "character", dim: "3d", cats: wardCats(), lang: opts.L("en", "ko"), onSaved: () => refresh(false),
          item: { id: it.id, cat: it.slot, name: it.name, unlock: it.unlock.coins != null ? { type: "coins", value: it.unlock.coins } : { type: "free" }, active: true, img3dUrl: KoalaCore.customImg3d(it.id), fit: KoalaCore.customFit(it.id) } }),
        adminDel: () => KoalaAdminItems.deleteItem({ id: it.id, name: it.name, lang: opts.L("en", "ko"), onDeleted: () => refresh(true) }),
      };
    };
    const clearBtn = `<button type="button" class="kh-btn alt kh-clear" data-clear>${T("모두 벗기기", "Take Off All")}</button>`;
    const ownedHtml = () => {
      const all = []; slots.forEach((sl) => KSLOT[sl].forEach((n) => { if (hasIt(n)) all.push([sl, n]); }));
      return `<div class="kh-grid">${shelfHead(T("내 아이템", "My items"), `${all.length}`)}${all.length ? `<div class="kh-items-grid">${all.map(([sl, n]) => itemBtn(sl, n)).join("")}</div>${slots.some((sl) => S.worn[sl]) ? clearBtn : ""}` : `<p class="kh-empty">${T("아직 구매한 아이템이 없어요.", "You haven't bought any items yet.")}</p>`}</div>`;
    };
    const draw = () => {
      const names = kordered(S.worn);
      const bootCut = KBOOTCUT[S.worn.feet];   // tall boots / roller skates: the koala's own legs are cut away below the boot tops, or their outline shows beside and between the boots
      const imgs = names.map((n) => { const b = KBOX[n]; return `<image href="${kimg(n)}" x="${b[0]}" y="${b[1]}" width="${b[2] - b[0]}" height="${b[3] - b[1]}"${n === "base" && bootCut ? ` clip-path="url(#kbootcut)"` : ""}/>`; }).join("") + "";
      const bootDefs = bootCut ? `<defs><clipPath id="kbootcut"><rect x="0" y="0" width="1000" height="${bootCut}"/></clipPath></defs>` : "";
      const wornN = slots.filter((sl) => S.worn[sl]).length;
      root.className = "kh-app kh-embed kh-ward";
      fit(root);
      // from behind: the plain koala seen from behind plus a picture per worn item (img/koala/back/<item>.webp, placed by the boxes in KBACK). Items without a back picture (glasses, necklaces ...) are not seen from behind.
      const TALLBOOT = ["rainboots", "cowboyboots", "rollerskates"], PANTS = ["jeans", "khakishorts", "cargopants", "sweatpants"], tallBoot = TALLBOOT.includes(S.worn.feet);
      const backOrder = (a) => { const rest = a.filter((n) => !KSLOT.legs.includes(n) && !KSLOT.feet.includes(n) && !KBEHIND.includes(n)), legs = a.filter((n) => KSLOT.legs.includes(n)), feet = a.filter((n) => KSLOT.feet.includes(n)); return (tallBoot ? feet.concat(legs) : legs.concat(feet)).concat(rest, a.filter((n) => KBEHIND.includes(n))); };   // with tall boots / roller skates the trousers hang over the boot tops, down to the ankles
      const backImgs = backOrder(names.filter((n) => n !== "base" && !CUSTOM_WARD[n])).filter((n) => KBACK[n]).map((n) => { const b = KBACK[n].slice(); if (tallBoot && PANTS.includes(n)) b[3] = Math.max(b[3], 944); return `<image href="/img/koala/back/${n}.webp" x="${b[0]}" y="${b[1]}" width="${b[2] - b[0]}" height="${b[3] - b[1]}" preserveAspectRatio="none"/>`; }).join("");
      root.innerHTML = `<div class="kh-ward-stage" id="kh-wstage">${wardBackdrop()}<svg class="kh-ward-koala kh-ward-stand" viewBox="64 20 553 1020" role="img" aria-label="${T("3D 코알라", "3D Koala")}">${bootDefs}<ellipse cx="340" cy="962" rx="205" ry="22" fill="#000" opacity=".16"/><g class="kh-wfront kh-wbody" ${wardBack ? 'display="none"' : ""}>${imgs}</g><g class="kh-wbackview kh-wbody" ${wardBack ? "" : 'display="none"'}><image href="/img/koala/back_base.webp" x="64" y="222" width="553" height="746"/>${backImgs}</g></svg><p class="kh-ward-tip">${T("코알라를 눌러 보세요!", "Tap the koala!")}</p></div>
        <aside class="kh-panel">${chipsHtml(slots.map((sl) => [sl, `/img/cat/${sl}.webp`, slotName[sl]]), wardOwned ? "" : wardSlot)}
        ${wardOwned ? ownedHtml() : `<div class="kh-grid">${shelfHead(slotName[wardSlot], `${S.worn[wardSlot] ? 1 : 0}/${KSLOT[wardSlot].length}`)}${opts.isAdmin ? `<button type="button" class="kh-admin-add-item" data-kh-admin-add-item="${wardSlot}"><span class="add-ic" aria-hidden="true">+</span>${T("아이템 추가", "Add item")}</button>` : ""}<div class="kh-items-grid">${KSLOT[wardSlot].map((n) => itemBtn(wardSlot, n)).join("")}</div>
        ${wornN ? clearBtn : ""}${wardMsg ? `<p class="kh-empty">${esc(wardMsg)}</p>` : ""}</div>`}</aside>`;
      root.querySelectorAll("[data-tab]").forEach((b) => { b.onclick = () => { wardSlot = b.dataset.tab; if (wardOwned) { wardOwned = false; window.dispatchEvent(new CustomEvent("kh-owned-off")); } draw(); }; });
      initCats(root);
      const wardSaved = async () => { await H.loadCatalog(true); if (window.KoalaCore) await KoalaCore.loadItems(true); syncCustomWard(); draw(); };
      const wAddCat = root.querySelector("[data-kh-admin-add-cat]");
      if (wAddCat && window.KoalaAdminItems) wAddCat.onclick = () => KoalaAdminItems.openCategoryForm({ kind: "character", lang: U.opts().L("en", "ko"), onSaved: wardSaved });
      const wAddItem = root.querySelector("[data-kh-admin-add-item]");
      if (wAddItem && window.KoalaAdminItems) wAddItem.onclick = () => KoalaAdminItems.openItemForm({ kind: "character", dim: "3d", cat: WARD_TO_2D[wardSlot], cats: wardCats(), lang: U.opts().L("en", "ko"), onSaved: wardSaved });
      root.querySelectorAll("[data-wear]").forEach((b) => { b.onclick = () => {
        const [slot, n] = b.dataset.wear.split(":"); const st = stOf(n), nmN = T(KNAME[n][0], KNAME[n][1]), pic = `<img src="${kthumb(n)}" alt="" draggable="false">`;
        const adm = adminBtns(n);
        const wearIt = () => { if (S.worn[slot] === n) delete S.worn[slot]; else S.worn[slot] = n; H.persist(S); window.dispatchEvent(new CustomEvent("kh-worn")); draw(); };
        if (st.state === "owned") { detail({ title: nmN, pic, price: 0, own: true, go: S.worn[slot] === n ? T("벗기", "Take off") : T("입기", "Wear"), onGo: wearIt, ...adm,
          sell: clothSell(n, () => { Object.keys(S.worn).forEach((k) => { if (S.worn[k] === n) delete S.worn[k]; }); H.persist(S); window.dispatchEvent(new CustomEvent("kh-worn")); draw(); }) }); return; }
        if (st.state === "buyable") { detail({ title: nmN, pic, price: st.cost || 0, own: false, afford: true, ...adm, spendFn: () => true, spendWhy: "", onBuy: () => { if (!wardApi.buy(id2d(n))) { toast(T("코인이 모자라요", "Not enough coins"), true); draw(); return; } wardMsg = ""; draw(); toast(T("샀어요! 다시 눌러서 입어 봐요.", "Bought! Tap it again to wear it.")); } }); return; }
        wardMsg = st.cost ? T("코인이 모자라요: ", "Not enough coins: ") + st.cost : st.hint ? T("잠겨 있어요: ", "Locked: ") + st.hint : T("아직 열 수 없어요.", "Not available yet."); draw();
      }; });
      const clr = root.querySelector("[data-clear]"); if (clr) clr.onclick = () => { S.worn = {}; H.persist(S); window.dispatchEvent(new CustomEvent("kh-worn")); draw(); };
      const wst = root.querySelector("#kh-wstage");
      wst.querySelectorAll(".kh-wbackview image").forEach((im) => im.addEventListener("error", () => { if (/back_base/.test(im.getAttribute("href"))) wardBackReady = false; im.remove(); }));
      wst.onclick = () => {   // tap: turn round (front <-> back); until the back pictures exist, only a little hop
        if (wardBackReady) { wardBack = !wardBack; wst.querySelector(".kh-wfront").setAttribute("display", wardBack ? "none" : "inline"); wst.querySelector(".kh-wbackview").setAttribute("display", wardBack ? "inline" : "none"); }
        const kb = wst.querySelector(wardBack ? ".kh-wbackview" : ".kh-wfront"); if (kb) { kb.classList.remove("hop"); void kb.getBoundingClientRect(); kb.classList.add("hop"); }
      };
    };
    if (wardApi) { let ch = false; slots.forEach((sl) => { if (S.worn[sl] && !hasIt(S.worn[sl])) { delete S.worn[sl]; ch = true; } }); if (ch) H.persist(S); }
    draw();
  }

  // what the room screen's dress-up panel and messages use (koala-house-ui.js)
  window.KoalaHouse._ward = { api: () => wardApi, id2d, clothSell, setMsg: (m) => { wardMsg = m; } };
  window.KoalaHouse.mountWardrobe = mountWardrobe;
  window.KoalaHouse.koala3d = koala3d;
})();
