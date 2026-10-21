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
      <p class="koala-admin-note">${L("참고: 3D 팝아웃 전용 옷장 미리보기에는 아직 노출되지 않아요(추후 작업). 상점·착용·방 화면에는 2D 그림으로 바로 나와요.", "Note: not shown in the premium 3D Pop-out wardrobe preview yet (follow-up work). Shows immediately in the shop, worn, and room views via the 2D picture.")}</p>
      `}
      ${isEdit ? `<label class="koala-admin-field koala-admin-check"><input type="checkbox" data-f="active" ${item.active === false ? "" : "checked"}> ${L("상점에 보이기", "Visible in the shop")}</label>` : ""}
      <div class="koala-admin-actions"><button type="button" class="pill accent" data-go>${isEdit ? L("저장", "Save") : L("추가", "Add")}</button><button type="button" class="pill" data-koala-zoom-close>${L("취소", "Cancel")}</button></div>
      <p class="koala-admin-err" data-err hidden></p>`;
    openOverlay(isEdit ? L("아이템 수정", "Edit item") : L("아이템 추가", "Add item"), body, (card) => {
      const syncCoinsRow = () => { card.querySelector("[data-coins-row]").style.display = card.querySelector('[data-f="unlockType"]').value === "coins" ? "" : "none"; };
      card.querySelector('[data-f="unlockType"]').addEventListener("change", syncCoinsRow);
      syncCoinsRow();
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
          const img3d = !isHouse ? await uploadImage(file("img3d")) : null;
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

  window.KoalaAdminItems = { openCategoryForm, openItemForm };
})();
