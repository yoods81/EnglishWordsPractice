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
  // Crop the transparent margin off a picture (so the size sliders mean the garment itself) and
  // shrink it to at most 900px. Resolves { blob, url, aspect } with aspect = height / width.
  function trimImage(file) {
    return new Promise((resolve, reject) => {
      const src = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        try {
          const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
          const g = c.getContext("2d"); g.drawImage(img, 0, 0);
          const data = g.getImageData(0, 0, c.width, c.height).data;
          let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
          for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
            if (data[(y * c.width + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
          }
          URL.revokeObjectURL(src);
          if (x1 < 0) { reject(new Error("empty")); return; }
          const cw = x1 - x0 + 1, ch = y1 - y0 + 1, k = Math.min(1, 900 / Math.max(cw, ch));
          const out = document.createElement("canvas"); out.width = Math.max(1, Math.round(cw * k)); out.height = Math.max(1, Math.round(ch * k));
          out.getContext("2d").drawImage(c, x0, y0, cw, ch, 0, 0, out.width, out.height);
          out.toBlob((blob) => {
            if (!blob) { reject(new Error("encode")); return; }
            resolve({ blob, url: URL.createObjectURL(blob), aspect: out.height / out.width });
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
  function openItemForm({ kind, cats, cat, item, onSaved, lang }) {
    LANG = lang || "ko";
    const isHouse = kind === "house";
    const isEdit = !!item;
    const catOptions = (cats || []).map((c) => `<option value="${esc(c.id)}"${c.id === (item ? item.cat : cat) ? " selected" : ""}>${esc(c.label)}</option>`).join("");
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
      ` : `
      <label class="koala-admin-field">${L("2D 스티커용 그림", "2D Sticker picture")}<input type="file" accept="image/png,image/webp,image/jpeg" data-f="img2d"></label>
      <label class="koala-admin-field">${L("3D 팝아웃용 그림", "3D Pop-out picture")}<input type="file" accept="image/png,image/webp,image/jpeg" data-f="img3d"></label>
      ${kind === "character" ? `<div class="koala-admin-fit" data-fit hidden>
        <p class="koala-admin-note">${L("3D 그림을 코알라에 입혀 본 모습이에요. 어색하면 슬라이더로 맞춰 주세요.", "This is the 3D picture on the koala. Use the sliders if it looks off.")}</p>
        <svg class="koala-admin-fit-svg" viewBox="${KV.join(" ")}" data-fit-svg></svg>
        <label><span>${L("좌우", "Left/Right")}</span><input type="range" data-fit-s="cx" min="64" max="617" step="1"></label>
        <label><span>${L("위아래", "Up/Down")}</span><input type="range" data-fit-s="cy" min="20" max="1040" step="1"></label>
        <label><span>${L("크기", "Size")}</span><input type="range" data-fit-s="w" min="40" max="700" step="1"></label>
        <button type="button" class="pill small" data-fit-reset>${L("자동 위치로 되돌리기", "Reset to auto")}</button>
      </div>` : `<p class="koala-admin-note">${L("참고: 3D 팝아웃 옷장에는 나오지 않아요. 상점·방 화면에는 2D 그림으로 나와요.", "Note: not in the 3D Pop-out wardrobe. Shows in the shop and room views via the 2D picture.")}</p>`}
      `}
      ${isEdit ? `<label class="koala-admin-field koala-admin-check"><input type="checkbox" data-f="active" ${item.active === false ? "" : "checked"}> ${L("상점에 보이기", "Visible in the shop")}</label>` : ""}
      <div class="koala-admin-actions"><button type="button" class="pill accent" data-go>${isEdit ? L("저장", "Save") : L("추가", "Add")}</button><button type="button" class="pill" data-koala-zoom-close>${L("취소", "Cancel")}</button>${isEdit ? `<button type="button" class="pill koala-admin-del" data-del>${L("🗑 삭제", "🗑 Delete")}</button>` : ""}</div>
      <p class="koala-admin-err" data-err hidden></p>`;
    openOverlay(isEdit ? L("아이템 수정", "Edit item") : L("아이템 추가", "Add item"), body, (card) => {
      const syncCoinsRow = () => { card.querySelector("[data-coins-row]").style.display = card.querySelector('[data-f="unlockType"]').value === "coins" ? "" : "none"; };
      card.querySelector('[data-f="unlockType"]').addEventListener("change", syncCoinsRow);
      syncCoinsRow();

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
        const fileEl = card.querySelector('[data-f="img3d"]');
        fileEl.addEventListener("change", async () => {
          const errEl = card.querySelector("[data-err]");
          errEl.hidden = true;
          const file = fileEl.files && fileEl.files[0];
          if (!file) return;
          try {
            trimmed = await trimImage(file);
            picUrl = trimmed.url; aspect = trimmed.aspect;
            autoPlace();
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
          const img = isHouse ? await uploadImage(file("img")) : null;
          const img2d = !isHouse ? await uploadImage(file("img2d")) : null;
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
            if (!isHouse && !img2d) { errEl.hidden = false; errEl.textContent = L("2D 그림은 꼭 올려 주세요.", "Please add the 2D picture."); goBtn.disabled = false; return; }
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
