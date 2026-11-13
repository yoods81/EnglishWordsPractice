// Koala Study Mate — the 3D koala wardrobe (Character tab, 3D view) and the small 3D koala picture.
// Split out of koala-house-ui.js (stage 5 S7, C5 — code moved only, nothing changed): the new Koala House replaces the
// old rooms in E (S8), but the 3D wardrobe stays. Loaded after koala-house-ui.js, whose shared helpers it uses
// (KoalaHouse._ui) until E moves them here. What is worn stays where it was (koalaHouse:v2.worn on the device — decision 5).
//   KoalaHouse.mountWardrobe(el, opts)  ·  KoalaHouse.koala3d(worn, cls, view)  ·  setWardApi  ·  setWardOwned
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
