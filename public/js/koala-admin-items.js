// Koala Study Mate — My Koala admin item management (inline on the My Koala page).
//
// Lets an admin add a new category or a new item — in whichever shop screen
// they're already looking at (character wardrobe, study room, or the House) —
// without a deploy. See migrations/0014_koala_items.sql for the design: this
// only ever creates NEW rows; the ~250 built-in items stay exactly as they
// are in koala-core.js / koala-house.js.
(function () {
  "use strict";
  const api = (path, options) => fetch(`/api${path}`, {
    credentials: "same-origin",
    headers: options && options.body ? { "content-type": "application/json" } : undefined,
    ...options,
  }).then(async (r) => {
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(data.error || "request_failed"), { status: r.status });
    return data;
  });

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function uploadImage(file) {
    if (!file) return null;
    const image = await fileToBase64(file);
    const mediaType = file.type || "image/webp";
    const { imageKey } = await api("/admin/items/upload-image", { method: "POST", body: JSON.stringify({ image, mediaType }) });
    return imageKey;
  }

  function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
  function slugify(s) {
    return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 30) || ("item" + Date.now());
  }

  // ---- 3D wardrobe: put a clothing picture on the 3D koala --------------------------------
  // Same coordinate space as KBOX in koala-house-ui.js: the standing 3D koala picture.
  const KV = [64, 20, 553, 1020];
  const KBASE = [64, 222, 617, 968];
  // 2D slot -> where a typical piece of that kind sits on the koala (tuned against the ~50 built-in pieces
  // in KBOX: the median built-in piece lands within ~15px of this; hats/backs vary a lot, so expect to nudge those) (cx = centre x, width, and which edge `y` is)
  const FIT_DEFAULT = {
    headwear: { cx: 340, w: 380, maxH: 300, edge: "bottom", y: 351 },
    face: { cx: 340, w: 350, maxH: 170, edge: "center", y: 430 },
    jewelry: { cx: 342, w: 215, maxH: 130, edge: "center", y: 609 },
    clothing: { cx: 342, w: 420, maxH: 320, edge: "top", y: 551 },
    bottoms: { cx: 342, w: 330, maxH: 230, edge: "top", y: 671 },
    accessory: { cx: 340, w: 400, maxH: 420, edge: "top", y: 477 },
    shoes: { cx: 342, w: 290, maxH: 140, edge: "bottom", y: 972 },
  };
  function autoFit(slot, aspect) {
    const d = FIT_DEFAULT[slot];
    if (!d) return null;
    const w = Math.min(d.w, d.maxH / aspect), h = w * aspect;   // wide enough for the slot, but never taller than the slot allows
    const cy = d.edge === "bottom" ? d.y - h / 2 : d.edge === "top" ? d.y + h / 2 : d.y;
    return { cx: d.cx, cy, w };
  }
  // 2D (Sticker) koala: same idea in the flat koala's own space (koala-art.js FULL_VIEW = 200 x 205).
  // Tuned against the built-in 2D items (median bounding box per slot).
  const FIT2D_DEFAULT = {
    headwear: { cx: 100, w: 92, maxH: 54, edge: "bottom", y: 72 },
    face: { cx: 100, w: 92, maxH: 50, edge: "center", y: 78 },
    jewelry: { cx: 100, w: 68, maxH: 44, edge: "center", y: 137 },
    clothing: { cx: 100, w: 98, maxH: 75, edge: "top", y: 124 },
    bottoms: { cx: 100, w: 84, maxH: 37, edge: "top", y: 152 },
    accessory: { cx: 130, w: 60, maxH: 90, edge: "center", y: 129 },
    shoes: { cx: 100, w: 97, maxH: 34, edge: "bottom", y: 193 },
  };
  function autoFit2d(slot, aspect) {
    const d = FIT2D_DEFAULT[slot];
    if (!d) return null;
    const w = Math.min(d.w, d.maxH / aspect), h = w * aspect;
    const cy = d.edge === "bottom" ? d.y - h / 2 : d.edge === "top" ? d.y + h / 2 : d.y;
    return { cx: d.cx, cy, w };
  }
  // Picture clean-up for item uploads. Resolves { blob, url, aspect, hadAlpha, removed }:
  //  - hadAlpha: the file really has transparent pixels. A "transparent" picture saved from a preview often has the
  //    grey/white checkerboard baked in as opaque pixels instead — hadAlpha is false then.
  //  - removeBg: wipe the background (checkerboard or one flat colour) by flood-filling inward from the edges through
  //    pixels that look like the corner colours. Parts of the item that the outline fully encloses stay.
  //  - crop: cut the transparent margin and shrink to <= 900px (so the size sliders mean the garment itself).
  //    aspect = height / width.
  function processImage(file, { removeBg = false, crop = true } = {}) {
    return new Promise((resolve, reject) => {
      const src = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        try {
          const W = img.naturalWidth, H = img.naturalHeight;
          const c = document.createElement("canvas"); c.width = W; c.height = H;
          const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(img, 0, 0);
          URL.revokeObjectURL(src);
          const id = g.getImageData(0, 0, W, H), d = id.data;
          let clear = 0;
          for (let i = 3; i < d.length; i += 4) if (d[i] < 250) clear++;
          const hadAlpha = clear / (W * H) > 0.002;
          let removed = false;
          if (removeBg) {
            // background colours = the common colours along the picture's outer edge (a checkerboard has two)
            const R = Math.max(1, Math.min(3, Math.floor(Math.min(W, H) / 20))), buckets = {}; let total = 0;
            const sample = (x, y) => {
              const i = (y * W + x) * 4; if (d[i + 3] < 128) return;
              total++;
              const k = (d[i] >> 5) + "," + (d[i + 1] >> 5) + "," + (d[i + 2] >> 5), o = buckets[k] || (buckets[k] = { n: 0, r: 0, g: 0, b: 0 });
              o.n++; o.r += d[i]; o.g += d[i + 1]; o.b += d[i + 2];
            };
            for (let t = 0; t < R; t++) {
              for (let x = 0; x < W; x++) { sample(x, t); sample(x, H - 1 - t); }
              for (let y = R; y < H - R; y++) { sample(t, y); sample(W - 1 - t, y); }
            }
            const need = Math.max(6, total * 0.08);
            const bg = Object.values(buckets).filter((o) => o.n >= need).map((o) => [o.r / o.n, o.g / o.n, o.b / o.n]);
            const dist = (i) => { let m = 1e9; for (const [r, gg, b] of bg) { const dr = d[i] - r, dg = d[i + 1] - gg, db = d[i + 2] - b, v = dr * dr + dg * dg + db * db; if (v < m) m = v; } return Math.sqrt(m); };
            if (bg.length && bg.length <= 4) {
              const TOL = 40, seen = new Uint8Array(W * H), stack = [];
              const push = (x, y) => { const p = y * W + x; if (!seen[p] && d[p * 4 + 3] > 0 && dist(p * 4) <= TOL) { seen[p] = 1; stack.push(p); } };
              for (let x = 0; x < W; x++) { push(x, 0); push(x, H - 1); }
              for (let y = 0; y < H; y++) { push(0, y); push(W - 1, y); }
              while (stack.length) {
                const p = stack.pop(), x = p % W, y = (p / W) | 0;
                if (x > 0) push(x - 1, y); if (x < W - 1) push(x + 1, y); if (y > 0) push(x, y - 1); if (y < H - 1) push(x, y + 1);
              }
              let cnt = 0; for (let p = 0; p < seen.length; p++) if (seen[p]) cnt++;
              if (cnt > W * H * 0.02 && cnt < W * H * 0.97) {   // something sensible was found: not nothing, not the whole picture
                // soften the rim: pixels touching the removed area that are still close to the background fade out
                const fringe = [];
                for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
                  const p = y * W + x; if (seen[p]) continue;
                  if (seen[p - 1] || seen[p + 1] || seen[p - W] || seen[p + W]) fringe.push(p);
                }
                fringe.forEach((p) => { const dd = dist(p * 4); if (dd < 90) d[p * 4 + 3] = Math.round(255 * Math.max(0, Math.min(1, (dd - 40) / 50))); });
                for (let p = 0; p < seen.length; p++) if (seen[p]) d[p * 4 + 3] = 0;
                g.putImageData(id, 0, 0); removed = true;
              }
            }
          }
          let x0 = 0, y0 = 0, x1 = W - 1, y1 = H - 1;
          if (crop) {
            x0 = W; y0 = H; x1 = -1; y1 = -1;
            for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
              if (d[(y * W + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
            }
            if (x1 < 0) { reject(new Error("empty")); return; }
          }
          const cw = x1 - x0 + 1, ch = y1 - y0 + 1, k = crop ? Math.min(1, 900 / Math.max(cw, ch)) : 1;
          const out = document.createElement("canvas"); out.width = Math.max(1, Math.round(cw * k)); out.height = Math.max(1, Math.round(ch * k));
          out.getContext("2d").drawImage(c, x0, y0, cw, ch, 0, 0, out.width, out.height);
          out.toBlob((blob) => {
            if (!blob) { reject(new Error("encode")); return; }
            resolve({ blob, url: URL.createObjectURL(blob), aspect: out.height / out.width, hadAlpha, removed });
          }, "image/png");
        } catch (e) { reject(e); }
      };
      img.onerror = () => { URL.revokeObjectURL(src); reject(new Error("load")); };
      img.src = src;
    });
  }
  function loadAspect(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img.naturalWidth ? img.naturalHeight / img.naturalWidth : 1);
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }

  let overlay = null;
  function close() { if (overlay) { overlay.remove(); overlay = null; } document.removeEventListener("keydown", onKey); }
  function onKey(e) { if (e.key === "Escape") close(); }

  let LANG = "ko";
  function L(ko, en) { return LANG === "en" ? en : ko; }

  function openOverlay(title, bodyHtml, onMount) {
    close();
    overlay = el("div", "koala-zoom-overlay");
    const card = el("div", "koala-zoom-card koala-subd-card koala-admin-card");
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-modal", "true");
    card.innerHTML = `<div class="koala-zoom-head"><span class="koala-subd-from">${esc(title)}</span>
      <button type="button" class="koala-zoom-close" data-koala-zoom-close>${L("✕ 닫기", "✕ Close")}</button></div>
      <div class="koala-admin-body">${bodyHtml}</div>`;
    overlay.appendChild(card);
    overlay.addEventListener("click", (e) => { if (e.target === overlay || e.target.closest("[data-koala-zoom-close]")) close(); });
    document.body.appendChild(overlay);
    document.addEventListener("keydown", onKey);
    if (onMount) onMount(card);
  }

  // kind: 'character' | 'studyroom' | 'house'
  // cats: [{id, label:{ko,en}}] — the categories currently shown in this screen (built-in + admin-added)
  function openCategoryForm({ kind, cats, onSaved, lang }) {
    LANG = lang || "ko";
    const body = `
      <label class="koala-admin-field">${L("카테고리 id (영문)", "Category id (English)")}<input type="text" data-f="id" maxlength="40" placeholder="snackBox"></label>
      <label class="koala-admin-field">${L("이름 (한국어)", "Name (Korean)")}<input type="text" data-f="ko" maxlength="40"></label>
      <label class="koala-admin-field">${L("이름 (영어)", "Name (English)")}<input type="text" data-f="en" maxlength="40"></label>
      <p class="koala-admin-note">${L("저장하면 이 화면의 카테고리 줄 맨 끝에 바로 추가돼요.", "Saves straight to the end of this screen's category row.")}</p>
      <div class="koala-admin-actions"><button type="button" class="pill accent" data-go>${L("추가", "Add")}</button><button type="button" class="pill" data-koala-zoom-close>${L("취소", "Cancel")}</button></div>
      <p class="koala-admin-err" data-err hidden></p>`;
    openOverlay(L("카테고리 추가", "Add category"), body, (card) => {
      const idEl = card.querySelector('[data-f="id"]');
      idEl.addEventListener("input", () => { idEl.value = idEl.value.replace(/[^a-zA-Z0-9_-]/g, ""); });
      card.querySelector("[data-go]").addEventListener("click", async () => {
        const f = (n) => card.querySelector(`[data-f="${n}"]`).value.trim();
        const errEl = card.querySelector("[data-err]");
        errEl.hidden = true;
        const id = f("id") || slugify(f("ko") || f("en"));
        if (!id || !f("ko") || !f("en")) { errEl.hidden = false; errEl.textContent = L("id와 이름을 모두 입력해 주세요.", "Please fill in the id and both names."); return; }
        try {
          await api("/admin/item-categories", { method: "POST", body: JSON.stringify({ kind, id, label: { ko: f("ko"), en: f("en") } }) });
          close();
          if (onSaved) onSaved();
        } catch (e) {
          errEl.hidden = false;
          errEl.textContent = e.status === 409 ? L("이미 있는 카테고리 id예요.", "That category id already exists.") : L("저장하지 못했어요. 다시 시도해 주세요.", "Couldn't save — please try again.");
        }
      });
    });
  }

  // cats: [{id, label}] for the category <select>; item: existing row to edit (admin-created only), or null to create
  // dim: "2d" (Sticker tab: only the 2D picture) or "3d" (Pop-out wardrobe: only the 3D picture + where it sits on the koala).
  function openItemForm({ kind, cats, cat, item, onSaved, lang, dim }) {
    LANG = lang || "ko";
    const isHouse = kind === "house";
    const is3d = !isHouse && dim === "3d";
    const isEdit = !!item;
    const catOptions = (cats || []).map((c) => `<option value="${esc(c.id)}"${c.id === (item ? item.cat : cat) ? " selected" : ""}>${esc(c.label)}</option>`).join("");
    const bgRow = `<label class="koala-admin-field koala-admin-check"><input type="checkbox" data-f="rmbg"> ${L("그림 배경 자동 지우기", "Remove picture background automatically")}</label><p class="koala-admin-note" data-bg-note hidden></p>`;
    const body = `
      <label class="koala-admin-field">${L("카테고리", "Category")}<select data-f="cat">${catOptions}</select></label>
      <label class="koala-admin-field">${L("이름 (한국어)", "Name (Korean)")}<input type="text" data-f="ko" maxlength="60" value="${esc(item ? item.name.ko : "")}"></label>
      <label class="koala-admin-field">${L("이름 (영어)", "Name (English)")}<input type="text" data-f="en" maxlength="60" value="${esc(item ? item.name.en : "")}"></label>
      <label class="koala-admin-field">${L("잠금 방식", "Unlock")}
        <select data-f="unlockType">
          <option value="free"${item && item.unlock.type === "free" ? " selected" : ""}>${L("무료", "Free")}</option>
          <option value="coins"${!item || item.unlock.type === "coins" ? " selected" : ""}>${L("코인", "Coins")}</option>
        </select></label>
      <label class="koala-admin-field" data-coins-row>${L("코인 가격", "Coin price")}<input type="number" data-f="coins" min="0" max="100000" value="${esc(item && item.unlock.type === "coins" ? item.unlock.value : 100)}"></label>
      ${isHouse ? `
      <div class="koala-admin-row">
        <label class="koala-admin-field">${L("가로 칸수", "Width (tiles)")}<input type="number" data-f="w" min="1" max="8" value="${esc(item ? item.w : 1)}"></label>
        <label class="koala-admin-field">${L("세로 칸수", "Depth (tiles)")}<input type="number" data-f="d" min="1" max="8" value="${esc(item ? item.d : 1)}"></label>
      </div>
      <label class="koala-admin-field">${L("배치 장소", "Placement")}
        <select data-f="where">
          <option value="in"${!item || item.where === "in" ? " selected" : ""}>${L("실내", "Indoors")}</option>
          <option value="out"${item && item.where === "out" ? " selected" : ""}>${L("실외", "Outdoors")}</option>
          <option value="both"${item && item.where === "both" ? " selected" : ""}>${L("실내외 모두", "Both")}</option>
        </select></label>
      <label class="koala-admin-field">${L("그림 (1장)", "Picture (1)")}<input type="file" accept="image/png,image/webp,image/jpeg" data-f="img"></label>
      ${bgRow}
      ` : `
      ${is3d ? `
      <label class="koala-admin-field">${L("3D 팝아웃용 그림", "3D Pop-out picture")}<input type="file" accept="image/png,image/webp,image/jpeg" data-f="img3d"></label>
      ${bgRow}
      <div class="koala-admin-fit" data-fit hidden>
        <p class="koala-admin-note">${L("3D 그림을 코알라에 입혀 본 모습이에요. 어색하면 슬라이더로 맞춰 주세요.", "This is the 3D picture on the koala. Use the sliders if it looks off.")}</p>
        <svg class="koala-admin-fit-svg" viewBox="${KV.join(" ")}" data-fit-svg></svg>
        <label><span>${L("좌우", "Left/Right")}</span><input type="range" data-fit-s="cx" min="64" max="617" step="1"></label>
        <label><span>${L("위아래", "Up/Down")}</span><input type="range" data-fit-s="cy" min="20" max="1040" step="1"></label>
        <label><span>${L("크기", "Size")}</span><input type="range" data-fit-s="w" min="40" max="700" step="1"></label>
        <button type="button" class="pill small" data-fit-reset>${L("자동 위치로 되돌리기", "Reset to auto")}</button>
      </div>` : `
      <label class="koala-admin-field">${L("2D 스티커용 그림", "2D Sticker picture")}<input type="file" accept="image/png,image/webp,image/jpeg" data-f="img2d"></label>
      ${bgRow}
      <div class="koala-admin-fit" data-pic2d hidden>
        <p class="koala-admin-note">${kind === "character" ? L("2D 그림을 코알라에 입혀 본 모습이에요. 어색하면 슬라이더로 맞춰 주세요.", "This is the 2D picture on the koala. Use the sliders if it looks off.") : L("2D 그림 미리보기예요.", "Preview of the 2D picture.")}</p>
        <div class="koala-admin-pic2d" data-pic2d-img></div>
        ${kind === "character" ? `<label><span>${L("좌우", "Left/Right")}</span><input type="range" data-fit2d-s="cx" min="0" max="200" step="0.5"></label>
        <label><span>${L("위아래", "Up/Down")}</span><input type="range" data-fit2d-s="cy" min="0" max="205" step="0.5"></label>
        <label><span>${L("크기", "Size")}</span><input type="range" data-fit2d-s="w" min="10" max="200" step="0.5"></label>
        <button type="button" class="pill small" data-fit2d-reset>${L("자동 위치로 되돌리기", "Reset to auto")}</button>` : ""}
      </div>`}
      `}
      ${isEdit ? `<label class="koala-admin-field koala-admin-check"><input type="checkbox" data-f="active" ${item.active === false ? "" : "checked"}> ${L("상점에 보이기", "Visible in the shop")}</label>` : ""}
      <div class="koala-admin-actions"><button type="button" class="pill accent" data-go>${isEdit ? L("저장", "Save") : L("추가", "Add")}</button><button type="button" class="pill" data-koala-zoom-close>${L("취소", "Cancel")}</button>${isEdit ? `<button type="button" class="pill koala-admin-del" data-del>${L("🗑 삭제", "🗑 Delete")}</button>` : ""}</div>
      <p class="koala-admin-err" data-err hidden></p>`;
    openOverlay(isEdit ? L("아이템 수정", "Edit item") : L("아이템 추가", "Add item"), body, (card) => {
      const syncCoinsRow = () => { card.querySelector("[data-coins-row]").style.display = card.querySelector('[data-f="unlockType"]').value === "coins" ? "" : "none"; };
      card.querySelector('[data-f="unlockType"]').addEventListener("change", syncCoinsRow);
      syncCoinsRow();

      // Background clean-up: a picture without real transparency (e.g. a checkerboard saved as pixels) is spotted
      // when it is chosen, and the automatic background removal is switched on for it (the admin can switch it off).
      const rmChk = card.querySelector('[data-f="rmbg"]'), bgNote = card.querySelector("[data-bg-note]");
      const sourceFiles = () => ["img", "img2d", "img3d"].map((n) => card.querySelector(`[data-f="${n}"]`)).filter(Boolean).map((e) => e.files && e.files[0]).filter(Boolean);
      const checkAlpha = async (file) => {
        try {
          const r = await processImage(file, { removeBg: false, crop: false });
          if (r.hadAlpha) return;
          rmChk.checked = true;
          bgNote.hidden = false;
          bgNote.textContent = L("투명 배경이 없는 그림이에요(체크무늬가 그림으로 들어 있을 수 있어요). 배경을 자동으로 지우도록 켰어요. 결과를 확인해 보고, 이상하면 체크를 꺼 주세요.",
            "This picture has no real transparent background (a checkerboard may be part of the picture). Automatic background removal is on — check the result and switch it off if it looks wrong.");
        } catch (e) { /* unreadable: the 3D handler reports it */ }
      };
      // The plain pictures (House, or the 2D one): spot the background. The 2D one of a character item is cropped and
      // placed on the 2D koala (auto position + sliders, saved as fit2d); a room item just gets a preview.
      const pic2dBox = card.querySelector("[data-pic2d]"), pic2dImg = card.querySelector("[data-pic2d-img]");
      const sl2 = pic2dBox ? Array.from(pic2dBox.querySelectorAll("[data-fit2d-s]")) : [], reset2 = pic2dBox ? pic2dBox.querySelector("[data-fit2d-reset]") : null;
      const catSel = card.querySelector('[data-f="cat"]');
      const has2dFit = kind === "character";
      let url2d = (item && item.img2dUrl) || null, aspect2 = null, fit2 = null, touched2 = false, trimmed2 = null;
      if (has2dFit && item && item.fit2d && item.fit2d.w) { aspect2 = item.fit2d.h / item.fit2d.w; fit2 = { cx: item.fit2d.x + item.fit2d.w / 2, cy: item.fit2d.y + item.fit2d.h / 2, w: item.fit2d.w }; touched2 = true; }
      const draw2d = () => {
        if (!pic2dBox || !url2d) return;
        pic2dBox.hidden = false;
        const fb = has2dFit && fit2 && aspect2 != null ? { x: fit2.cx - fit2.w / 2, y: fit2.cy - fit2.w * aspect2 / 2, w: fit2.w, h: fit2.w * aspect2 } : null;
        // on the koala / in the room, the way the saved item will look
        pic2dImg.innerHTML = window.KoalaArt && KoalaArt.previewCustom ? KoalaArt.previewCustom(catSel.value, url2d, kind, fb) : `<img src="${esc(url2d)}" alt="">`;
        sl2.forEach((sd) => { sd.closest("label").hidden = !fb; if (fb) sd.value = fit2[sd.dataset.fit2dS]; });
        if (reset2) reset2.hidden = !fb;
      };
      const autoPlace2d = () => { fit2 = has2dFit && aspect2 != null ? autoFit2d(catSel.value, aspect2) : null; touched2 = false; draw2d(); };
      draw2d();
      if (catSel) catSel.addEventListener("change", () => { if (has2dFit && fit2 && !touched2) autoPlace2d(); else draw2d(); });
      sl2.forEach((sd) => sd.addEventListener("input", () => { if (!fit2) return; fit2[sd.dataset.fit2dS] = Number(sd.value); touched2 = true; draw2d(); }));
      if (reset2) reset2.addEventListener("click", autoPlace2d);
      const reprocess2d = async () => {
        const e2 = card.querySelector('[data-f="img2d"]'), f2 = e2 && e2.files && e2.files[0]; if (!f2) return;
        const r = await processImage(f2, { removeBg: rmChk.checked, crop: has2dFit });
        trimmed2 = has2dFit ? r : null;
        url2d = r.url;
        if (has2dFit) { aspect2 = r.aspect; if (touched2 && fit2) draw2d(); else autoPlace2d(); } else draw2d();
        if (rmChk.checked && !r.removed) { bgNote.hidden = false; bgNote.textContent = L("배경을 찾지 못했어요. 그림 가장자리가 단색이나 체크무늬인지 확인해 주세요.", "Couldn't find a background to remove. Check that the picture edge is a flat colour or a checkerboard."); }
      };
      ["img", "img2d"].forEach((n) => { const e = card.querySelector(`[data-f="${n}"]`); if (e) e.addEventListener("change", async () => { const f = e.files && e.files[0]; if (!f) return; if (n === "img2d") touched2 = false; await checkAlpha(f); if (n === "img2d") reprocess2d().catch(() => {}); }); });
      rmChk.addEventListener("change", () => { reprocess2d().catch(() => {}); });

      // 3D picture + where it sits on the koala (character items only)
      const fitBox = card.querySelector("[data-fit]");
      let trimmed = null, picUrl = (item && item.img3dUrl) || null, aspect = null, fit = null, touched = false;
      const catEl = card.querySelector('[data-f="cat"]');
      const sliders = fitBox ? Array.from(fitBox.querySelectorAll("[data-fit-s]")) : [];
      const fitSvg = fitBox ? fitBox.querySelector("[data-fit-svg]") : null;
      const drawFit = () => {
        if (!fitBox) return;
        if (!FIT_DEFAULT[catEl.value] || !picUrl || aspect == null || !fit) { fitBox.hidden = true; return; }
        fitBox.hidden = false;
        const h = fit.w * aspect, x = fit.cx - fit.w / 2, y = fit.cy - h / 2;
        const base = `<image href="/img/koala/base.webp" x="${KBASE[0]}" y="${KBASE[1]}" width="${KBASE[2] - KBASE[0]}" height="${KBASE[3] - KBASE[1]}"/>`;
        const pic = `<image href="${esc(picUrl)}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${fit.w.toFixed(1)}" height="${h.toFixed(1)}"/>`;
        fitSvg.innerHTML = catEl.value === "accessory" ? pic + base : base + pic;
        sliders.forEach((s) => { s.value = fit[s.dataset.fitS]; });
      };
      const autoPlace = () => { fit = aspect != null ? autoFit(catEl.value, aspect) : null; touched = false; drawFit(); };
      if (fitBox) {
        if (picUrl) {
          const f = item && item.fit;
          (f && f.w && f.h ? Promise.resolve(f.h / f.w) : loadAspect(picUrl)).then((a) => {
            aspect = a;
            if (f && f.w && f.h) { fit = { cx: f.x + f.w / 2, cy: f.y + f.h / 2, w: f.w }; touched = true; drawFit(); } else autoPlace();
          });
        }
        catEl.addEventListener("change", () => { if (!touched) autoPlace(); else drawFit(); });
        sliders.forEach((s) => s.addEventListener("input", () => { if (!fit) return; fit[s.dataset.fitS] = Number(s.value); touched = true; drawFit(); }));
        fitBox.querySelector("[data-fit-reset]").addEventListener("click", autoPlace);
        const reprocess3d = async () => {
          const f3 = card.querySelector('[data-f="img3d"]').files[0]; if (!f3) return;
          const keep = touched ? fit : null;
          trimmed = await processImage(f3, { removeBg: rmChk.checked, crop: true });
          picUrl = trimmed.url; aspect = trimmed.aspect;
          if (keep) { fit = keep; drawFit(); } else autoPlace();
          if (rmChk.checked && !trimmed.removed) { bgNote.hidden = false; bgNote.textContent = L("배경을 찾지 못했어요. 그림 가장자리가 단색이나 체크무늬인지 확인해 주세요.", "Couldn't find a background to remove. Check that the picture edge is a flat colour or a checkerboard."); }
        };
        rmChk.addEventListener("change", () => { reprocess3d().catch(() => {}); });
        const fileEl = card.querySelector('[data-f="img3d"]');
        fileEl.addEventListener("change", async () => {
          const errEl = card.querySelector("[data-err]");
          errEl.hidden = true;
          const file = fileEl.files && fileEl.files[0];
          if (!file) return;
          try {
            touched = false;
            await checkAlpha(file);
            await reprocess3d();
          } catch (e) {
            trimmed = null;
            errEl.hidden = false; errEl.textContent = L("그림을 읽지 못했어요. 투명 배경 PNG/WebP를 올려 주세요.", "Couldn't read that picture. Please use a PNG/WebP with a transparent background.");
          }
        });
      }

      const delBtn = card.querySelector("[data-del]");
      if (delBtn) delBtn.addEventListener("click", () => {
        deleteItem({ id: item.id, name: item.name, kind, lang, onDeleted: () => { close(); if (onSaved) onSaved(); }, errEl: card.querySelector("[data-err]") });
      });
      card.querySelector("[data-go]").addEventListener("click", async () => {
        const f = (n) => { const e = card.querySelector(`[data-f="${n}"]`); return e ? e.value : ""; };
        const file = (n) => { const e = card.querySelector(`[data-f="${n}"]`); return e && e.files && e.files[0]; };
        const errEl = card.querySelector("[data-err]");
        errEl.hidden = true;
        const nameKo = f("ko").trim(), nameEn = f("en").trim();
        if (!nameKo || !nameEn) { errEl.hidden = false; errEl.textContent = L("이름을 모두 입력해 주세요.", "Please fill in both names."); return; }
        const goBtn = card.querySelector("[data-go]");
        goBtn.disabled = true;
        try {
          const unlockType = f("unlockType");
          const payload = {
            kind, cat: f("cat"),
            name: { ko: nameKo, en: nameEn },
            unlock: { type: unlockType, value: unlockType === "coins" ? Number(f("coins")) || 0 : null },
          };
          if (isHouse) { payload.w = Number(f("w")) || 1; payload.d = Number(f("d")) || 1; payload.where = f("where"); }
          const clean = async (n) => { const fl = file(n); if (!fl) return null; return rmChk.checked ? (await processImage(fl, { removeBg: true, crop: false })).blob : fl; };
          const img = isHouse ? await uploadImage(await clean("img")) : null;
          const img2d = !isHouse ? await uploadImage(trimmed2 ? trimmed2.blob : await clean("img2d")) : null;
          if (has2dFit && fit2 && url2d && aspect2 != null && FIT2D_DEFAULT[f("cat")]) {
            const h2 = fit2.w * aspect2;
            payload.fit2d = { x: fit2.cx - fit2.w / 2, y: fit2.cy - h2 / 2, w: fit2.w, h: h2 };
          }
          const img3d = !isHouse ? await uploadImage(trimmed ? trimmed.blob : file("img3d")) : null;
          if (fit && picUrl && aspect != null && FIT_DEFAULT[f("cat")]) {
            const fh = fit.w * aspect;
            payload.fit = { x: fit.cx - fit.w / 2, y: fit.cy - fh / 2, w: fit.w, h: fh };
          }
          if (img) payload.imageKey = img;
          if (img2d) payload.imageKey2d = img2d;
          if (img3d) payload.imageKey = img3d;
          if (isEdit) {
            await api(`/admin/items/${encodeURIComponent(item.id)}`, { method: "PUT", body: JSON.stringify(payload) });
            const active = card.querySelector('[data-f="active"]');
            if (active && active.checked === (item.active === false)) {
              await api(`/admin/items/${encodeURIComponent(item.id)}`, { method: "PATCH", body: JSON.stringify({ active: active.checked }) });
            }
          } else {
            if (!isHouse && !is3d && !img2d) { errEl.hidden = false; errEl.textContent = L("2D 그림은 꼭 올려 주세요.", "Please add the 2D picture."); goBtn.disabled = false; return; }
            if (is3d && !img3d) { errEl.hidden = false; errEl.textContent = L("3D 그림은 꼭 올려 주세요.", "Please add the 3D picture."); goBtn.disabled = false; return; }
            if (isHouse && !img) { errEl.hidden = false; errEl.textContent = L("그림을 올려 주세요.", "Please add a picture."); goBtn.disabled = false; return; }
            payload.id = slugify(nameEn) + Math.random().toString(36).slice(2, 6);
            await api("/admin/items", { method: "POST", body: JSON.stringify(payload) });
          }
          close();
          if (onSaved) onSaved();
        } catch (e) {
          errEl.hidden = false;
          errEl.textContent = e.status === 409 ? L("이미 있는 아이템이에요.", "That item already exists.") : L("저장하지 못했어요. 다시 시도해 주세요.", "Couldn't save — please try again.");
        } finally {
          goBtn.disabled = false;
        }
      });
    });
  }

  // Delete one admin-added item. Owners of it lose it too (it is gone from the catalog for everyone).
  async function deleteItem({ id, name, lang, onDeleted, errEl }) {
    LANG = lang || LANG;
    const label = name ? (LANG === "en" ? name.en : name.ko) : id;
    if (!window.confirm(L(`"${label}" 아이템을 삭제할까요?\n이미 산 사람의 목록에서도 사라지고, 되돌릴 수 없어요.`, `Delete "${label}"?\nIt disappears for everyone who owns it too, and can't be undone.`))) return;
    try {
      await api(`/admin/items/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (onDeleted) onDeleted();
    } catch (e) {
      const msg = L("삭제하지 못했어요. 다시 시도해 주세요.", "Couldn't delete — please try again.");
      if (errEl) { errEl.hidden = false; errEl.textContent = msg; } else window.alert(msg);
    }
  }

  // Delete one admin-added category — only when it is empty (delete or move its items first).
  async function deleteCategory({ kind, id, label, lang, onDeleted }) {
    LANG = lang || LANG;
    if (!window.confirm(L(`"${label}" 카테고리를 삭제할까요?`, `Delete the "${label}" category?`))) return;
    try {
      await api(`/admin/item-categories/${encodeURIComponent(kind)}/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (onDeleted) onDeleted();
    } catch (e) {
      window.alert(e.status === 409
        ? L("이 카테고리에 아이템이 남아 있어요. 아이템을 먼저 삭제해 주세요.", "This category still has items. Delete them first.")
        : L("삭제하지 못했어요. 다시 시도해 주세요.", "Couldn't delete — please try again."));
    }
  }

  window.KoalaAdminItems = { openCategoryForm, openItemForm, deleteItem, deleteCategory };
})();
