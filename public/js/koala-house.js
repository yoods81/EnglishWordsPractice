// Koala Study Mate — My Koala House.
//
// An isometric room-decorating game: a big floor plan of the whole house (each room is a live
// mini-picture), a full-screen room editor (drag items from the right-hand panel into the room,
// tap a placed item for its menu), a yard (house front + garden) behind the entrance, and the
// 3D-style koala walking around inside.
//
// Everything is drawn as SVG. Furniture is built from boxes / cylinders / spheres in tile units,
// so every piece shares one isometric angle. Any piece can be swapped for a real picture:
// see public/img/house/README.md (the manifest) — pieces without a picture fall back to the SVG.
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.KoalaHouse = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ============================== geometry ============================== */
  const TW = 64, TH = 32, HW = TW / 2, HH = TH / 2; // tile on screen is 64 x 32
  const WALL_H = 150;
  const proj = (x, y, z) => [(x - y) * HW, (x + y) * HH - (z || 0)];
  const pstr = (a) => a.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");

  function hex(c) { if (c.length === 4) c = "#" + c[1] + c[1] + c[2] + c[2] + c[3] + c[3]; const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function toHex(r) { return "#" + r.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join(""); }
  function shade(c, f) { // f > 0 lightens towards white, f < 0 darkens towards black
    const r = hex(c), t = f > 0 ? 255 : 0, k = Math.abs(f);
    return toHex(r.map((v) => v + (t - v) * k));
  }
  const faces = (c) => ({ top: shade(c, 0.14), left: c, right: shade(c, -0.2), edge: shade(c, -0.32) });

  /* ---- part builders (tile units; z in px) ---- */
  const B = (x, y, z, w, d, h, c) => ({ t: "b", x, y, z, w, d, h, c });
  const C = (x, y, z, r, h, c) => ({ t: "c", x, y, z, r, h, c });
  const S = (x, y, z, r, c) => ({ t: "s", x, y, z, r, c });
  const PY = (x, y, z, w, d, h, c) => ({ t: "py", x, y, z, w, d, h, c });

  function partSvg(p) {
    if (p.t === "b") {
      const f = faces(p.c), x = p.x, y = p.y, z = p.z, w = p.w, d = p.d, h = p.h;
      const top = [proj(x, y, z + h), proj(x + w, y, z + h), proj(x + w, y + d, z + h), proj(x, y + d, z + h)];
      const lf = [proj(x, y + d, z + h), proj(x + w, y + d, z + h), proj(x + w, y + d, z), proj(x, y + d, z)];
      const rf = [proj(x + w, y, z + h), proj(x + w, y + d, z + h), proj(x + w, y + d, z), proj(x + w, y, z)];
      return `<polygon points="${pstr(lf)}" fill="${f.left}"/><polygon points="${pstr(rf)}" fill="${f.right}"/><polygon points="${pstr(top)}" fill="${f.top}"/>`;
    }
    if (p.t === "c") {
      const f = faces(p.c), [cx, cy] = proj(p.x, p.y, p.z), rx = p.r * HW * Math.SQRT2, ry = p.r * HH * Math.SQRT2, top = cy - p.h;
      return `<path d="M${cx - rx} ${top}V${cy}A${rx} ${ry} 0 0 0 ${cx + rx} ${cy}V${top}Z" fill="${f.left}"/>`
        + `<path d="M${cx} ${top}V${cy + ry}A${rx} ${ry} 0 0 0 ${cx + rx} ${cy}V${top}Z" fill="${f.right}"/>`
        + `<ellipse cx="${cx}" cy="${top}" rx="${rx}" ry="${ry}" fill="${f.top}"/>`;
    }
    if (p.t === "s") {
      const [cx, cy] = proj(p.x, p.y, p.z), f = faces(p.c);
      return `<circle cx="${cx}" cy="${cy}" r="${p.r}" fill="${f.right}"/><circle cx="${cx - p.r * 0.12}" cy="${cy - p.r * 0.14}" r="${p.r * 0.86}" fill="${f.left}"/><circle cx="${cx - p.r * 0.3}" cy="${cy - p.r * 0.36}" r="${p.r * 0.4}" fill="${f.top}"/>`;
    }
    if (p.t === "py") {
      const f = faces(p.c), x = p.x, y = p.y, z = p.z, w = p.w, d = p.d;
      const apex = proj(x + w / 2, y + d / 2, z + p.h);
      const lf = [proj(x, y + d, z), proj(x + w, y + d, z), apex];
      const rf = [proj(x + w, y + d, z), proj(x + w, y, z), apex];
      return `<polygon points="${pstr(lf)}" fill="${f.left}"/><polygon points="${pstr(rf)}" fill="${f.right}"/>`;
    }
    if (p.t === "e") { const [cx, cy] = proj(p.x, p.y, p.z); return `<text x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" font-size="${p.s}" text-anchor="middle" style="font-family:'Segoe UI Emoji','Apple Color Emoji','Noto Color Emoji',sans-serif">${p.ch}</text>`; }
    return "";
  }
  function partPoints(p) { // a few screen points per part, for bounding boxes
    if (p.t === "b" || p.t === "py") {
      const o = [];
      [[0, 0], [p.w, 0], [p.w, p.d], [0, p.d]].forEach((q) => { o.push(proj(p.x + q[0], p.y + q[1], p.z)); o.push(proj(p.x + q[0], p.y + q[1], p.z + p.h)); });
      return o;
    }
    if (p.t === "c") {
      const [cx, cy] = proj(p.x, p.y, p.z), rx = p.r * HW * Math.SQRT2, ry = p.r * HH * Math.SQRT2;
      return [[cx - rx, cy - p.h - ry], [cx + rx, cy - p.h - ry], [cx - rx, cy + ry], [cx + rx, cy + ry]];
    }
    if (p.t === "e") { const [cx, cy] = proj(p.x, p.y, p.z); return [[cx - p.s / 2, cy - p.s], [cx + p.s / 2, cy]]; }
    const [cx, cy] = proj(p.x, p.y, p.z);
    return [[cx - p.r, cy - p.r], [cx + p.r, cy + p.r]];
  }

  /* quarter turns: front (+y) -> +x -> -y -> -x. A part sits in a W x D footprint (tiles). */
  function rotPart(p, W) {
    if (p.t === "b" || p.t === "py") return Object.assign({}, p, { x: p.y, y: W - (p.x + p.w), w: p.d, d: p.w });
    return Object.assign({}, p, { x: p.y, y: W - p.x });
  }
  const bbox = (p) => {
    if (p.t === "b" || p.t === "py") return { x: p.x, y: p.y, z: p.z, w: p.w, d: p.d, h: p.h };
    if (p.t === "c") return { x: p.x - p.r, y: p.y - p.r, z: p.z, w: 2 * p.r, d: 2 * p.r, h: p.h };
    if (p.t === "s") { const r = p.r / 46; return { x: p.x - r, y: p.y - r, z: p.z - p.r, w: 2 * r, d: 2 * r, h: 2 * p.r }; }
    return { x: p.x - 0.05, y: p.y - 0.05, z: p.z, w: 0.1, d: 0.1, h: p.s || 10 };
  };
  // painter's order for the parts of a turned piece: A goes before B when A lies wholly behind it on some axis
  function sortParts(parts) {
    const n = parts.length, bb = parts.map(bbox), E = 0.02, before = [];
    const behind = (a, b) => a.x + a.w <= b.x + E || a.y + a.d <= b.y + E || a.z + a.h <= b.z + E;
    const out = Array.from({ length: n }, () => []), indeg = new Array(n).fill(0);
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const ij = behind(bb[i], bb[j]), ji = behind(bb[j], bb[i]);
      if (ij && !ji) { out[i].push(j); indeg[j]++; } else if (ji && !ij) { out[j].push(i); indeg[i]++; }
    }
    const res = [], ready = [];
    for (let i = 0; i < n; i++) if (!indeg[i]) ready.push(i);
    while (ready.length) { ready.sort((a, b) => a - b); const i = ready.shift(); res.push(i); out[i].forEach((j) => { if (!--indeg[j]) ready.push(j); }); }
    if (res.length < n) for (let i = 0; i < n; i++) if (!res.includes(i)) res.push(i); // a cycle: keep the rest in input order
    return res.map((i) => parts[i]);
  }
  function turnParts(parts, w, d, m) {
    m = ((m | 0) % 4 + 4) % 4;
    if (!m) return { w, d, parts };
    let o = { w, d, parts };
    for (let i = 0; i < m; i++) { const W = o.w; o = { w: o.d, d: o.w, parts: o.parts.map((p) => rotPart(p, W)) }; }
    o.parts = sortParts(o.parts);
    return o;
  }

  /* ============================== catalog ============================== */
  // def: { id, cat, name:[ko,en], w, d (footprint, tiles), parts, price, flat, stack, topH, where }
  //   cat: furniture | rug | small | plant | wall | outdoor    where: in | out | both
  // wall defs: { wall:true, uw (tiles), vh (px), art(u0, v0) -> svg in (tiles, px) space }
  const D = {};
  const add = (id, cat, name, w, d, price, parts, extra) => { D[id] = Object.assign({ id, cat, name, w, d, price: price || 0, parts, where: "in" }, extra || {}); };
  const WOOD = "#c99a63", WOOD_D = "#9c6f3f", WHITE = "#f4f1ea";

  function bed(id, name, col, price) {
    add(id, "furniture", name, 2, 3, price, [
      B(0, 0, 0, 2, 3, 8, WOOD), B(0.06, 0.24, 8, 1.88, 2.7, 12, WHITE), B(0.06, 1.1, 8, 1.88, 1.84, 15, col),
      B(0.2, 0.34, 20, 0.7, 0.55, 6, WHITE), B(1.1, 0.34, 20, 0.7, 0.55, 6, WHITE), B(0, 0, 0, 2, 0.22, 48, WOOD_D)]);
  }
  bed("bedBlue", ["하늘 침대", "Sky Bed"], "#7aa8e0", 0);
  bed("bedPink", ["분홍 침대", "Pink Bed"], "#ef9fb8", 90);
  bed("bedMint", ["민트 침대", "Mint Bed"], "#7cc9b0", 90);

  function sofa(id, name, col, price) {
    add(id, "furniture", name, 3, 1, price, [
      B(0, 0, 0, 3, 1, 16, col), B(0, 0, 16, 3, 0.3, 32, shade(col, -0.06)), B(0, 0, 16, 0.28, 1, 16, shade(col, -0.1)), B(2.72, 0, 16, 0.28, 1, 16, shade(col, -0.1)),
      B(0.28, 0.3, 16, 1.22, 0.7, 8, shade(col, 0.1)), B(1.5, 0.3, 16, 1.22, 0.7, 8, shade(col, 0.1))], { seat: 24 });
  }
  sofa("sofaRed", ["빨강 소파", "Red Sofa"], "#d9604f", 0);
  sofa("sofaBlue", ["파랑 소파", "Blue Sofa"], "#5b8fd0", 70);
  sofa("sofaGreen", ["초록 소파", "Green Sofa"], "#68b57c", 70);

  function armchair(id, name, col, price) {
    add(id, "furniture", name, 1, 1, price, [B(0, 0, 0, 1, 1, 14, col), B(0, 0, 14, 1, 0.28, 30, shade(col, -0.06)), B(0, 0, 14, 0.24, 1, 12, shade(col, -0.1)), B(0.76, 0, 14, 0.24, 1, 12, shade(col, -0.1)), B(0.24, 0.28, 14, 0.52, 0.72, 7, shade(col, 0.12))], { seat: 21 });
  }
  armchair("chairPurple", ["보라 안락의자", "Purple Armchair"], "#9a7be0", 40);
  armchair("chairYellow", ["노랑 안락의자", "Yellow Armchair"], "#f2c94c", 40);

  add("tableRound", "furniture", ["둥근 식탁", "Round Table"], 2, 2, 0, [C(1, 1, 0, 0.14, 28, WOOD_D), C(1, 1, 28, 0.95, 5, WOOD), C(1, 1, 0, 0.4, 4, WOOD_D)], { topH: 33 });
  add("tableSquare", "furniture", ["네모 식탁", "Square Table"], 2, 2, 50, [B(0.1, 0.1, 0, 0.18, 0.18, 28, WOOD_D), B(1.72, 0.1, 0, 0.18, 0.18, 28, WOOD_D), B(0.1, 1.72, 0, 0.18, 0.18, 28, WOOD_D), B(1.72, 1.72, 0, 0.18, 0.18, 28, WOOD_D), B(0, 0, 28, 2, 2, 5, "#f0b4b4")], { topH: 33 });
  function desk(id, name, col, price) {
    add(id, "furniture", name, 2, 1, price, [B(0.05, 0.08, 0, 0.14, 0.14, 30, shade(col, -0.2)), B(0.05, 0.78, 0, 0.14, 0.14, 30, shade(col, -0.2)), B(1.0, 0.08, 0, 0.14, 0.14, 30, shade(col, -0.2)), B(1.0, 0.78, 0, 0.14, 0.14, 30, shade(col, -0.2)),
      B(1.35, 0.04, 0, 0.62, 0.92, 30, shade(col, -0.08)), B(1.4, 0.0, 14, 0.5, 0.04, 2, shade(col, -0.35)), B(1.4, 0.0, 22, 0.5, 0.04, 2, shade(col, -0.35)), B(0, 0, 30, 2, 1, 4, col)], { topH: 34, subKind: "desk" });
  }
  desk("deskWood", ["나무 책상", "Wood Desk"], WOOD, 0);
  desk("deskWhite", ["하얀 책상", "White Desk"], WHITE, 60);
  desk("deskBlue", ["과학 책상", "Science Desk"], "#6aa6d9", 90);
  function chair(id, name, col, price) {
    add(id, "furniture", name, 1, 1, price, [B(0.14, 0.14, 0, 0.1, 0.1, 18, shade(col, -0.25)), B(0.76, 0.14, 0, 0.1, 0.1, 18, shade(col, -0.25)), B(0.14, 0.76, 0, 0.1, 0.1, 18, shade(col, -0.25)), B(0.76, 0.76, 0, 0.1, 0.1, 18, shade(col, -0.25)),
      B(0.1, 0.1, 18, 0.8, 0.8, 5, col), B(0.1, 0.1, 23, 0.8, 0.1, 28, shade(col, -0.08))], { seat: 23 });
  }
  chair("stoolBlue", ["파랑 의자", "Blue Chair"], "#5b8fd0", 0);
  chair("stoolRed", ["빨강 의자", "Red Chair"], "#e66a5a", 20);

  function books(x, y, z, w, n) { // a row of colourful books standing on a shelf board
    const cols = ["#e66a5a", "#5b8fd0", "#68b57c", "#f2c94c", "#9a7be0", "#ef8fb0"], o = [];
    let cx = x;
    for (let i = 0; i < n; i++) { const bw = 0.12 + ((i * 7) % 3) * 0.03, bh = 15 + ((i * 5) % 4) * 3; if (cx + bw > x + w) break; o.push(B(cx, y, z, bw, 0.5, bh, cols[i % cols.length])); cx += bw + 0.015; }
    return o;
  }
  function bookshelf(id, name, col, price) {
    const struct = [B(0, 0, 0, 2, 0.1, 88, shade(col, -0.18)), B(0, 0, 0, 0.1, 0.75, 88, col), B(1.9, 0, 0, 0.1, 0.75, 88, col), B(0.1, 0.1, 0, 1.8, 0.65, 4, col), B(0.1, 0.1, 28, 1.8, 0.65, 4, col), B(0.1, 0.1, 56, 1.8, 0.65, 4, col), B(0, 0, 84, 2, 0.75, 4, col)];
    add(id, "furniture", name, 2, 1, price, [struct[0], struct[1], struct[2], struct[3]].concat(books(0.14, 0.18, 4, 1.72, 11), [struct[4]], books(0.14, 0.18, 32, 1.72, 9), [struct[5]], books(0.14, 0.18, 60, 1.72, 10), [struct[6]]), { subKind: "books", subBase: struct });
  }
  bookshelf("shelfWood", ["나무 책장", "Wood Bookshelf"], WOOD, 0);
  bookshelf("shelfWhite", ["하얀 책장", "White Bookshelf"], WHITE, 80);
  function wardrobe(id, name, col, price) {
    add(id, "furniture", name, 2, 1, price, [B(0, 0, 0, 2, 1, 100, col), B(0.96, 0.99, 0, 0.04, 0.03, 100, shade(col, -0.4)), B(0.82, 1.0, 46, 0.07, 0.04, 14, "#f2d27a"), B(1.11, 1.0, 46, 0.07, 0.04, 14, "#f2d27a"), B(0, 0.99, 96, 2, 0.04, 4, shade(col, -0.15))]);
  }
  wardrobe("wardrobeWood", ["나무 옷장", "Wood Wardrobe"], "#b9814a", 0);
  wardrobe("wardrobeMint", ["민트 옷장", "Mint Wardrobe"], "#8fd1bd", 90);
  add("dresser", "furniture", ["서랍장", "Dresser"], 2, 1, 0, [B(0, 0, 0, 2, 1, 40, "#d9a066"), B(0.1, 1.0, 5, 0.86, 0.03, 14, "#e8b887"), B(1.04, 1.0, 5, 0.86, 0.03, 14, "#e8b887"), B(0.1, 1.0, 22, 0.86, 0.03, 14, "#e8b887"), B(1.04, 1.0, 22, 0.86, 0.03, 14, "#e8b887"),
    B(0.45, 1.03, 10, 0.16, 0.03, 3, "#8a5a3a"), B(1.4, 1.03, 10, 0.16, 0.03, 3, "#8a5a3a"), B(0.45, 1.03, 27, 0.16, 0.03, 3, "#8a5a3a"), B(1.4, 1.03, 27, 0.16, 0.03, 3, "#8a5a3a")], { topH: 40 });
  add("tvStand", "furniture", ["TV와 장", "TV Stand"], 2, 1, 100, [B(0, 0.1, 0, 2, 0.8, 18, "#2f343c"), B(0.08, 0.98, 4, 0.8, 0.03, 10, "#4a5260"), B(1.12, 0.98, 4, 0.8, 0.03, 10, "#4a5260"), B(0.8, 0.4, 18, 0.4, 0.2, 5, "#1e2228"),
    B(0.15, 0.42, 22, 1.7, 0.1, 54, "#1e2228"), B(0.22, 0.52, 27, 1.56, 0.03, 44, "#7fb6e8"), B(0.3, 0.55, 40, 0.6, 0.02, 18, "#a8d4f5")]);
  add("fridge", "furniture", ["냉장고", "Fridge"], 1, 1, 120, [B(0, 0, 0, 1, 1, 104, "#eef1f3"), B(0, 1.0, 62, 1, 0.03, 2, "#9aa6ae"), B(0.82, 1.03, 70, 0.07, 0.03, 24, "#9aa6ae"), B(0.82, 1.03, 30, 0.07, 0.03, 22, "#9aa6ae")]);
  add("counter", "furniture", ["조리대", "Kitchen Counter"], 2, 1, 110, [B(0, 0, 0, 2, 1, 34, "#d9a066"), B(0, 0, 34, 2, 1, 4, "#f2eadb"), B(0.12, 1.0, 6, 0.86, 0.03, 24, "#e8b887"), B(1.02, 1.0, 6, 0.86, 0.03, 24, "#e8b887"), B(0.6, 0.28, 38, 0.8, 0.45, 2, "#aab4bb"), B(0.42, 0.1, 38, 0.06, 0.06, 16, "#aab4bb")], { topH: 38 });
  add("stove", "furniture", ["가스레인지", "Stove"], 1, 1, 100, [B(0, 0, 0, 1, 1, 36, "#e8e8e8"), B(0, 0, 36, 1, 1, 3, "#3a3f46"), C(0.3, 0.3, 39, 0.16, 2, "#222"), C(0.7, 0.3, 39, 0.16, 2, "#222"), C(0.3, 0.7, 39, 0.16, 2, "#222"), C(0.7, 0.7, 39, 0.16, 2, "#222"), B(0.1, 1.0, 12, 0.8, 0.03, 18, "#2f343c")], { topH: 39 });
  add("bathtub", "furniture", ["욕조", "Bathtub"], 2, 1, 100, [B(0, 0, 0, 2, 1, 26, "#f2f6f8"), B(0.1, 0.1, 22, 1.8, 0.8, 5, "#9ed7ee"), B(1.82, 0.4, 26, 0.1, 0.1, 14, "#b9c4ca"), S(0.5, 0.5, 30, 6, "#ffffff"), S(0.9, 0.6, 29, 5, "#ffffff")]);
  add("toilet", "furniture", ["변기", "Toilet"], 1, 1, 60, [B(0.2, 0.05, 0, 0.6, 0.3, 40, "#f2f6f8"), B(0.2, 0.3, 0, 0.6, 0.65, 18, "#f2f6f8"), B(0.25, 0.35, 18, 0.5, 0.55, 3, "#dcebf0")]);
  add("vanity", "furniture", ["세면대", "Sink"], 1, 1, 70, [B(0.1, 0.1, 0, 0.8, 0.8, 30, "#f2f6f8"), B(0.1, 0.1, 30, 0.8, 0.8, 4, "#ffffff"), B(0.25, 0.25, 34, 0.5, 0.5, 2, "#cfe6f0"), B(0.45, 0.14, 34, 0.08, 0.08, 14, "#aab4bb")], { topH: 34 });
  add("toybox", "furniture", ["장난감 상자", "Toy Box"], 1, 1, 0, [B(0.05, 0.1, 0, 0.9, 0.8, 24, "#e66a5a"), B(0.05, 0.1, 24, 0.9, 0.8, 4, "#ffd166"), B(0.38, 0.98, 12, 0.26, 0.03, 8, "#ffd166"), S(0.3, 0.5, 32, 6, "#5b8fd0"), B(0.55, 0.3, 28, 0.2, 0.2, 10, "#68b57c")], { subKind: "toys" });
  add("piano", "furniture", ["피아노", "Piano"], 2, 1, 200, [B(0, 0, 0, 2, 0.9, 52, "#2f2a36"), B(0.05, 0.92, 30, 1.9, 0.18, 4, "#f4f1ea"), B(0.05, 1.0, 34, 1.9, 0.04, 2, "#2f2a36"), B(0, 0.1, 52, 2, 0.8, 6, "#3a3342")]);

  function rug(id, name, kind, col, price) {
    const f = [];
    if (kind === "round") f.push(C(1.5, 1.5, 0, 1.45, 2, col), C(1.5, 1.5, 2, 1.08, 0.6, shade(col, 0.3)), C(1.5, 1.5, 2.6, 0.62, 0.4, shade(col, -0.05)));
    else if (kind === "square") f.push(B(0, 0, 0, 2, 2, 2, col), B(0.18, 0.18, 2, 1.64, 1.64, 0.6, shade(col, 0.3)), B(0.42, 0.42, 2.6, 1.16, 1.16, 0.4, shade(col, -0.05)));
    else f.push(B(0, 0, 0, 3, 1, 2, col), B(0.14, 0.14, 2, 2.72, 0.72, 0.6, shade(col, 0.3)));
    add(id, "rug", name, kind === "round" ? 3 : kind === "square" ? 2 : 3, kind === "round" ? 3 : kind === "square" ? 2 : 1, price, f, { flat: true });
  }
  rug("rugBlue", ["파란 원형 러그", "Blue Round Rug"], "round", "#7aa8e0", 0);
  rug("rugRed", ["빨간 원형 러그", "Red Round Rug"], "round", "#e07a7a", 40);
  rug("rugGreen", ["잔디 러그", "Grass Rug"], "round", "#74c27a", 40);
  rug("rugPinkSq", ["분홍 네모 러그", "Pink Square Rug"], "square", "#ef9fb8", 30);
  rug("rugYellowSq", ["노란 네모 러그", "Yellow Square Rug"], "square", "#f2c94c", 30);
  rug("rugRunner", ["긴 러그", "Runner Rug"], "runner", "#9a7be0", 30);

  /* ---- small things (stack on tables / desks / dressers) ---- */
  const small = (id, name, price, parts, extra) => add(id, "small", name, 1, 1, price, parts, Object.assign({ stack: true }, extra || {}));
  small("lampDesk", ["스탠드", "Desk Lamp"], 0, [C(0.5, 0.5, 0, 0.2, 3, "#555a63"), C(0.5, 0.5, 3, 0.04, 22, "#555a63"), C(0.5, 0.5, 25, 0.26, 12, "#f2c94c")]);
  small("lampPink", ["분홍 스탠드", "Pink Lamp"], 30, [C(0.5, 0.5, 0, 0.2, 3, "#555a63"), C(0.5, 0.5, 3, 0.04, 22, "#555a63"), C(0.5, 0.5, 25, 0.26, 12, "#ef8fb0")]);
  small("vase", ["꽃병", "Flower Vase"], 0, [C(0.5, 0.5, 0, 0.2, 14, "#7fc9e8"), S(0.4, 0.5, 20, 7, "#ef6f8e"), S(0.6, 0.45, 23, 7, "#f2c94c"), S(0.5, 0.58, 19, 6, "#ffffff")]);
  small("bookStack", ["책 더미", "Books"], 0, [B(0.15, 0.2, 0, 0.7, 0.6, 5, "#e66a5a"), B(0.2, 0.22, 5, 0.65, 0.55, 5, "#5b8fd0"), B(0.17, 0.25, 10, 0.62, 0.5, 5, "#68b57c")]);
  small("laptop", ["노트북", "Laptop"], 60, [B(0.1, 0.2, 0, 0.8, 0.6, 3, "#aeb6bf"), B(0.1, 0.2, 3, 0.8, 0.05, 26, "#2f343c"), B(0.15, 0.25, 6, 0.7, 0.02, 18, "#8fd0ff")]);
  small("teddy", ["곰인형", "Teddy Bear"], 30, [S(0.5, 0.5, 10, 11, "#c98a5a"), S(0.5, 0.5, 26, 9, "#c98a5a"), S(0.3, 0.42, 34, 4, "#c98a5a"), S(0.7, 0.42, 34, 4, "#c98a5a"), S(0.5, 0.62, 24, 3, "#f2d6b8")]);
  small("cake", ["케이크", "Cake"], 30, [C(0.5, 0.5, 0, 0.36, 10, "#fff0f4"), C(0.5, 0.5, 10, 0.36, 3, "#ef8fb0"), S(0.5, 0.5, 18, 5, "#e63946")]);
  small("fruitBowl", ["과일 그릇", "Fruit Bowl"], 25, [C(0.5, 0.5, 0, 0.34, 6, "#c9955a"), S(0.4, 0.5, 11, 6, "#e63946"), S(0.62, 0.46, 11, 6, "#f2c94c"), S(0.5, 0.62, 13, 6, "#68b57c")]);
  small("blocks", ["블록", "Toy Blocks"], 20, [B(0.1, 0.3, 0, 0.4, 0.4, 14, "#5b8fd0"), B(0.5, 0.3, 0, 0.4, 0.4, 14, "#e66a5a"), B(0.3, 0.32, 14, 0.4, 0.36, 14, "#f2c94c")]);
  small("ball", ["공", "Ball"], 15, [S(0.5, 0.5, 8, 8, "#e66a5a"), { t: "c", x: 0.5, y: 0.5, z: 7, r: 0.16, h: 2, c: "#ffffff" }]);
  small("clockDesk", ["탁상시계", "Alarm Clock"], 20, [C(0.5, 0.5, 0, 0.22, 14, "#ef8fb0"), C(0.5, 0.5, 14, 0.12, 2, "#ffffff")]);
  small("pottedSmall", ["작은 화분", "Small Plant"], 0, [C(0.5, 0.5, 0, 0.2, 10, "#c9774a"), S(0.5, 0.5, 18, 9, "#4aa36a"), S(0.38, 0.55, 15, 6, "#68b57c")]);

  /* ---- plants (floor) ---- */
  add("plantBig", "plant", ["큰 화분", "Big Plant"], 1, 1, 0, [C(0.5, 0.5, 0, 0.3, 18, "#c9774a"), S(0.5, 0.5, 40, 16, "#4aa36a"), S(0.32, 0.55, 30, 11, "#68b57c"), S(0.68, 0.45, 34, 12, "#3e9560"), S(0.5, 0.5, 56, 11, "#68b57c")], { where: "both" });
  add("cactus", "plant", ["선인장", "Cactus"], 1, 1, 30, [C(0.5, 0.5, 0, 0.26, 14, "#d99a5b"), C(0.5, 0.5, 14, 0.18, 34, "#6bb36f"), C(0.28, 0.5, 26, 0.1, 14, "#6bb36f"), C(0.72, 0.5, 32, 0.1, 12, "#6bb36f"), S(0.5, 0.5, 49, 4, "#ef6f8e")]);
  add("palm", "plant", ["야자수 화분", "Palm"], 1, 1, 60, [C(0.5, 0.5, 0, 0.3, 16, "#7d8fb0"), C(0.5, 0.5, 16, 0.07, 46, "#8a6a3a"), S(0.2, 0.5, 66, 13, "#3e9560"), S(0.8, 0.5, 66, 13, "#3e9560"), S(0.5, 0.2, 68, 13, "#4aa36a"), S(0.5, 0.8, 68, 13, "#4aa36a"), S(0.5, 0.5, 74, 12, "#68b57c")], { where: "both" });
  add("lampFloor", "small", ["플로어 조명", "Floor Lamp"], 1, 1, 50, [C(0.5, 0.5, 0, 0.26, 3, "#555a63"), C(0.5, 0.5, 3, 0.04, 78, "#555a63"), C(0.5, 0.5, 80, 0.3, 16, "#fff2b0")], {});
  D.lampFloor.cat = "furniture";

  /* ---- outdoor ---- */
  const out = (id, name, w, d, price, parts, extra) => add(id, "outdoor", name, w, d, price, parts, Object.assign({ where: "out" }, extra || {}));
  function tree(id, name, leaf, price) {
    out(id, name, 2, 2, price, [C(1, 1, 0, 0.16, 46, "#8a5a3a"), S(1, 1, 72, 30, leaf), S(0.5, 1.2, 60, 20, shade(leaf, -0.06)), S(1.5, 0.8, 62, 20, shade(leaf, 0.06)), S(1, 1, 92, 20, shade(leaf, 0.1))]);
  }
  tree("treeApple", ["사과나무", "Apple Tree"], "#4aa36a", 0);
  tree("treeCherry", ["벚꽃나무", "Cherry Tree"], "#f4b6c6", 70);
  tree("treeMaple", ["단풍나무", "Maple Tree"], "#e0793a", 70);
  out("bush", ["덤불", "Bush"], 1, 1, 0, [S(0.5, 0.5, 14, 17, "#4aa36a"), S(0.28, 0.6, 10, 12, "#3e9560"), S(0.74, 0.46, 12, 13, "#68b57c")]);
  out("flowerBed", ["꽃밭", "Flower Bed"], 2, 1, 0, [B(0, 0.05, 0, 2, 0.9, 8, "#8a5a3a"), B(0.06, 0.1, 8, 1.88, 0.8, 2, "#5a3d27"), S(0.3, 0.4, 16, 7, "#ef6f8e"), S(0.7, 0.55, 16, 7, "#f2c230"), S(1.1, 0.4, 16, 7, "#9a7be0"), S(1.5, 0.55, 16, 7, "#ef6f8e"), S(1.8, 0.4, 16, 7, "#ffffff")]);
  out("pond", ["연못", "Pond"], 3, 3, 100, [C(1.5, 1.5, 0, 1.4, 4, "#b8bfc6"), C(1.5, 1.5, 4, 1.18, 1, "#7ec9ea"), C(1.1, 1.2, 5, 0.3, 1, "#a8e4f5"), S(1.9, 1.7, 9, 7, "#68b57c"), S(1.2, 2.0, 9, 6, "#ef8fb0")], { flat: true });
  out("bench", ["벤치", "Bench"], 2, 1, 60, [B(0.1, 0.15, 0, 0.12, 0.7, 14, "#6e4a2a"), B(1.78, 0.15, 0, 0.12, 0.7, 14, "#6e4a2a"), B(0, 0.1, 14, 2, 0.8, 4, WOOD), B(0, 0.08, 18, 2, 0.12, 22, WOOD)], { seat: 18 });
  out("swing", ["그네", "Swing"], 2, 1, 100, [B(0, 0.4, 0, 0.1, 0.1, 78, "#e66a5a"), B(1.9, 0.4, 0, 0.1, 0.1, 78, "#e66a5a"), B(0, 0.4, 76, 2, 0.1, 5, "#e66a5a"), B(0.45, 0.42, 14, 0.04, 0.04, 62, "#555"), B(1.5, 0.42, 14, 0.04, 0.04, 62, "#555"), B(0.35, 0.3, 10, 1.3, 0.3, 5, "#5b8fd0")]);
  out("fence", ["울타리", "Fence"], 1, 1, 0, [B(0.04, 0.4, 0, 0.14, 0.14, 26, "#fafafa"), B(0.82, 0.4, 0, 0.14, 0.14, 26, "#fafafa"), B(0, 0.44, 8, 1, 0.06, 5, "#ececec"), B(0, 0.44, 18, 1, 0.06, 5, "#ececec")]);
  out("gardenLamp", ["정원등", "Garden Lamp"], 1, 1, 50, [C(0.5, 0.5, 0, 0.12, 52, "#555a63"), C(0.5, 0.5, 52, 0.22, 16, "#fff2b0"), C(0.5, 0.5, 68, 0.28, 4, "#555a63")]);
  out("mailbox", ["우체통", "Mailbox"], 1, 1, 30, [C(0.5, 0.5, 0, 0.07, 30, "#8a5a3a"), B(0.2, 0.25, 30, 0.6, 0.5, 20, "#e0463a"), B(0.78, 0.4, 44, 0.04, 0.2, 14, "#ffd166")]);
  out("sandbox", ["모래놀이터", "Sandbox"], 2, 2, 80, [B(0, 0, 0, 2, 2, 10, "#c9955a"), B(0.12, 0.12, 8, 1.76, 1.76, 3, "#f2dca0"), S(0.8, 0.9, 16, 7, "#e0b86a"), B(1.2, 1.0, 11, 0.3, 0.3, 8, "#e66a5a")]);
  out("doghouse", ["강아지 집", "Dog House"], 2, 2, 90, [B(0.15, 0.2, 0, 1.7, 1.5, 36, "#e8b887"), PY(0.05, 0.1, 36, 1.9, 1.7, 26, "#c9503f"), B(0.6, 1.7, 2, 0.6, 0.03, 22, "#4a3322")]);
  out("fountain", ["분수", "Fountain"], 2, 2, 160, [C(1, 1, 0, 0.95, 14, "#c0c4c8"), C(1, 1, 14, 0.8, 2, "#7ec9ea"), C(1, 1, 0, 0.18, 44, "#c0c4c8"), C(1, 1, 44, 0.44, 5, "#c0c4c8"), C(1, 1, 49, 0.36, 1, "#7ec9ea"), S(1, 1, 60, 5, "#a8e4f5")]);
  out("stones", ["징검다리", "Stepping Stones"], 1, 1, 0, [C(0.5, 0.5, 0, 0.38, 3, "#b8bfc6")], { flat: true });
  out("hedge", ["생울타리", "Hedge"], 2, 1, 40, [B(0, 0.1, 0, 2, 0.8, 30, "#3e9560"), B(0.06, 0.16, 30, 1.88, 0.68, 4, "#4aa36a")]);
  out("snowman", ["눈사람", "Snowman"], 1, 1, 50, [S(0.5, 0.5, 14, 15, "#ffffff"), S(0.5, 0.5, 38, 11, "#ffffff"), B(0.4, 0.4, 46, 0.2, 0.2, 8, "#333"), S(0.5, 0.62, 38, 2, "#e0793a")]);
  out("car", ["자동차", "Car"], 3, 2, 200, [B(0.1, 0.2, 6, 2.8, 1.6, 18, "#e04b4b"), B(0.7, 0.3, 24, 1.5, 1.4, 16, "#cfe2ff"), B(0.7, 0.3, 24, 1.5, 1.4, 3, "#e04b4b"), C(0.6, 0.15, 8, 0.28, 6, "#333"), C(2.4, 0.15, 8, 0.28, 6, "#333"), C(0.6, 1.85, 8, 0.28, 6, "#333"), C(2.4, 1.85, 8, 0.28, 6, "#333")], { where: "both" });

  out("treePine", ["소나무", "Pine Tree"], 2, 2, 70, [C(1, 1, 0, 0.14, 30, "#8a5a3a"), PY(0.1, 0.1, 22, 1.8, 1.8, 44, "#2f7d5a"), PY(0.3, 0.3, 52, 1.4, 1.4, 40, "#3a8f68"), PY(0.5, 0.5, 80, 1.0, 1.0, 36, "#4aa37a")]);
  out("rock", ["바위", "Rock"], 1, 1, 20, [S(0.5, 0.55, 10, 15, "#a9b0b8"), S(0.3, 0.45, 8, 10, "#b9c0c8")]);
  out("tulips", ["튤립 화단", "Tulip Bed"], 2, 1, 40, [B(0, 0.05, 0, 2, 0.9, 8, "#8a5a3a"), B(0.06, 0.1, 8, 1.88, 0.8, 2, "#5a3d27"), S(0.3, 0.4, 18, 6, "#e63946"), S(0.7, 0.55, 20, 6, "#ffd166"), S(1.1, 0.4, 18, 6, "#ef8fb0"), S(1.5, 0.55, 20, 6, "#e63946"), S(1.8, 0.4, 18, 6, "#ffffff")]);
  out("gate", ["대문", "Gate"], 2, 1, 40, [B(0, 0.45, 0, 0.14, 0.14, 50, "#fafafa"), B(1.86, 0.45, 0, 0.14, 0.14, 50, "#fafafa"), B(0.14, 0.48, 12, 0.85, 0.06, 4, "#ececec"), B(0.14, 0.48, 30, 0.85, 0.06, 4, "#ececec"), B(1.01, 0.48, 12, 0.85, 0.06, 4, "#ececec"), B(1.01, 0.48, 30, 0.85, 0.06, 4, "#ececec")]);
  // pieces used by the automatic garden border (not for sale)
  out("hedge1", ["울타리 나무", "Border Hedge"], 1, 1, 0, [B(0, 0.1, 0, 1, 0.8, 26, "#3e9560"), B(0.06, 0.16, 26, 0.88, 0.68, 4, "#4aa36a")], { virtual: true });
  out("stoneWall1", ["돌담", "Stone Wall"], 1, 1, 0, [B(0, 0.2, 0, 1, 0.6, 22, "#aeb4ba"), B(0, 0.16, 22, 1, 0.68, 4, "#c9cfd4")], { virtual: true });
  D.fence.seat = 0;

  /* ---- wall decorations: art is drawn in px on the wall plane (64 px = 1 tile along the wall) ---- */
  const wd = (id, name, uw, vh, price, art, extra) => { D[id] = Object.assign({ id, cat: "wall", name, wall: true, uw, vh, pw: uw * 64, price, where: "in", art, defH: 60 }, extra || {}); };
  const rect = (u, v, w, h, fill, rx) => `<rect x="${u}" y="${v}" width="${w}" height="${h}" fill="${fill}"${rx ? ` rx="${rx}"` : ""}/>`;
  function windowArt(sky, curtain, night) {
    return (pw, vh) => rect(-4, -4, pw + 8, vh + 8, "#a4713a", 3) + rect(3, 3, pw - 6, vh - 6, sky)
      + (night ? `<circle cx="${pw * 0.72}" cy="${vh * 0.3}" r="8" fill="#ffd166"/><circle cx="${pw * 0.22}" cy="${vh * 0.25}" r="2" fill="#fff"/><circle cx="${pw * 0.4}" cy="${vh * 0.6}" r="1.6" fill="#fff"/><circle cx="${pw * 0.55}" cy="${vh * 0.78}" r="1.8" fill="#fff"/>`
        : `<ellipse cx="${pw * 0.3}" cy="${vh * 0.35}" rx="14" ry="6" fill="#fff" opacity=".92"/><ellipse cx="${pw * 0.7}" cy="${vh * 0.62}" rx="12" ry="5" fill="#fff" opacity=".92"/>`)
      + rect(pw / 2 - 2, 3, 4, vh - 6, "#a4713a") + rect(3, vh / 2 - 2, pw - 6, 4, "#a4713a")
      + rect(-10, -10, 20, vh + 20, curtain, 4) + rect(pw - 10, -10, 20, vh + 20, curtain, 4) + rect(-12, -14, pw + 24, 7, shade(curtain, -0.28), 3);
  }
  wd("winDay", ["파란 하늘 창문", "Day Window"], 1.6, 62, 0, windowArt("#bfe0ff", "#f4a6a6", false), { defH: 50 });
  wd("winSunset", ["노을 창문", "Sunset Window"], 1.6, 62, 50, windowArt("#ffc99b", "#8fb8e8", false), { defH: 50 });
  wd("winNight", ["별밤 창문", "Night Window"], 1.6, 62, 70, windowArt("#2f3b6e", "#f2d46b", true), { defH: 50 });
  const frame = (inner) => (pw, vh) => rect(0, 0, pw, vh, "#c99a63", 3) + rect(5, 5, pw - 10, vh - 10, "#fffaf0") + inner(pw, vh);
  wd("frameSun", ["해님 그림", "Sun Picture"], 0.9, 48, 0, frame((pw, vh) => `<circle cx="${pw / 2}" cy="${vh / 2 - 3}" r="9" fill="#f2c230"/><path d="M10 ${vh - 8}q${(pw - 20) / 2} -20 ${pw - 20} 0z" fill="#68b57c"/>`), { defH: 70, subKind: "frame" });
  wd("frameCat", ["고양이 그림", "Cat Picture"], 0.8, 50, 30, frame((pw, vh) => `<circle cx="${pw / 2}" cy="${vh / 2 + 3}" r="12" fill="#e8b887"/><path d="M${pw / 2 - 11} ${vh / 2 - 4}l3 -11 7 6zM${pw / 2 + 11} ${vh / 2 - 4}l-3 -11 -7 6z" fill="#e8b887"/><circle cx="${pw / 2 - 4.5}" cy="${vh / 2 + 1}" r="1.8" fill="#333"/><circle cx="${pw / 2 + 4.5}" cy="${vh / 2 + 1}" r="1.8" fill="#333"/>`), { defH: 70, subKind: "frame" });
  wd("frameRainbow", ["무지개 그림", "Rainbow"], 1.1, 44, 40, frame((pw, vh) => ["#ef6f8e", "#f2c230", "#68b57c", "#5b8fd0"].map((c, i) => `<path d="M${14 + i * 4} ${vh - 9}a${(pw - 28) / 2 - i * 4} ${(pw - 28) / 2 - i * 4} 0 0 1 ${pw - 28 - i * 8} 0" stroke="${c}" stroke-width="4" fill="none"/>`).join("")), { defH: 70, subKind: "frame" });
  wd("posterRocket", ["로켓 포스터", "Rocket Poster"], 0.9, 58, 50, (pw, vh) => rect(0, 0, pw, vh, "#dfe9ff", 3) + `<path d="M${pw / 2} 8q11 15 0 34q-11 -19 0 -34z" fill="#e66a5a"/><circle cx="${pw / 2}" cy="23" r="3.4" fill="#cfe2ff"/><path d="M${pw / 2 - 6} 40l-7 9 7 -3zM${pw / 2 + 6} 40l7 9 -7 -3z" fill="#5b8fd0"/>`, { defH: 60 });
  wd("posterMap", ["세계 지도", "World Map"], 1.6, 50, 60, (pw, vh) => rect(0, 0, pw, vh, "#bfe3ff", 3) + `<path d="M12 22q10 -10 20 0t18 10l-8 12q-14 4 -24 -4z M${pw * 0.55} 14q12 -8 22 2t5 18l-15 5q-10 -8 -12 -25z" fill="#68b57c"/>`, { defH: 70 });
  wd("clockWall", ["벽시계", "Wall Clock"], 0.7, 40, 20, (pw, vh) => `<circle cx="${pw / 2}" cy="${vh / 2}" r="${vh / 2 - 2}" fill="#fff" stroke="#c99a63" stroke-width="4"/><path d="M${pw / 2} ${vh / 2}V${vh / 2 - 12}M${pw / 2} ${vh / 2}l9 5" stroke="#333" stroke-width="2.4" stroke-linecap="round"/>`, { defH: 90 });
  wd("wallShelf", ["벽 선반", "Wall Shelf"], 1.4, 36, 30, (pw, vh) => rect(0, vh - 6, pw, 6, "#c99a63", 2) + rect(8, vh - 26, 8, 20, "#e66a5a") + rect(18, vh - 30, 8, 24, "#5b8fd0") + rect(28, vh - 23, 8, 17, "#68b57c") + `<circle cx="${pw * 0.78}" cy="${vh - 16}" r="9" fill="#f2c94c"/>`, { defH: 80 });
  wd("garland", ["깃발 장식", "Bunting"], 2.2, 34, 20, (pw, vh) => `<path d="M0 4Q${pw / 2} 20 ${pw} 4" stroke="#8a5a3a" stroke-width="2" fill="none"/>` + [0.1, 0.3, 0.5, 0.7, 0.9].map((t, i) => `<path d="M${pw * t - 8} ${5 + Math.sin(t * Math.PI) * 13}l16 0l-8 20z" fill="${["#ef6f8e", "#f2c230", "#68b57c", "#5b8fd0", "#9a7be0"][i]}"/>`).join(""), { defH: 100 });
  wd("tvWall", ["벽걸이 TV", "Wall TV"], 1.5, 56, 110, (pw, vh) => rect(0, 0, pw, vh, "#1e2228", 4) + rect(5, 5, pw - 10, vh - 10, "#7fb6e8") + rect(14, 12, 34, 16, "#a8d4f5", 3), { defH: 60 });
  wd("mirror", ["거울", "Mirror"], 0.8, 66, 40, (pw, vh) => rect(0, 0, pw, vh, "#ead08a", 22) + rect(5, 5, pw - 10, vh - 10, "#d8f0fa", 18) + `<path d="M${pw * 0.25} ${vh * 0.3}l${pw * 0.15} -10" stroke="#fff" stroke-width="3"/>`, { defH: 50 });

  /* ---- wallpapers & floors ---- */
  const WALLS = {
    cream: { n: ["크림", "Cream"], c: "#f6ecd9", a: "#e8d9bd", k: "dots", p: 0 },
    mint: { n: ["민트 줄무늬", "Mint Stripes"], c: "#d6efe5", a: "#bfe3d4", k: "stripes", p: 40 },
    sky: { n: ["하늘 줄무늬", "Sky Stripes"], c: "#d7e8fb", a: "#bcd6f3", k: "stripes", p: 40 },
    pink: { n: ["분홍 마름모", "Pink Diamonds"], c: "#fbe4ea", a: "#f3c9d6", k: "diamonds", p: 50 },
    night: { n: ["별밤", "Starry Night"], c: "#38437a", a: "#ffe9a8", k: "stars", p: 90 },
    yellow: { n: ["노랑 물방울", "Yellow Dots"], c: "#fdf0b8", a: "#f6dc7a", k: "dots", p: 50 },
    wood: { n: ["나무 판자", "Wood Panels"], c: "#d9b98a", a: "#b8925f", k: "planks", p: 70 },
    purple: { n: ["보라 줄무늬", "Purple Stripes"], c: "#4a2f8a", a: "#6b4bb0", k: "stripes", p: 80 },
  };
  const FLOORS = {
    wood: { n: ["나무 바닥", "Wood"], c: "#dcbd8c", a: "#cda973", k: "planks", p: 0 },
    lightWood: { n: ["밝은 나무", "Light Wood"], c: "#f0dcb4", a: "#e0c690", k: "planks", p: 40 },
    pinkTile: { n: ["분홍 타일", "Pink Tiles"], c: "#fbd9e2", a: "#f4b9ca", k: "checker", p: 50 },
    blueTile: { n: ["파란 타일", "Blue Tiles"], c: "#d6ecf7", a: "#a9d4ea", k: "checker", p: 50 },
    plum: { n: ["자주 카펫", "Plum Carpet"], c: "#9b5a78", a: "#8a4a68", k: "plain", p: 70 },
    stone: { n: ["돌 바닥", "Stone"], c: "#cfd3d6", a: "#b4babe", k: "checker", p: 60 },
    grass: { n: ["잔디", "Grass"], c: "#8fd08a", a: "#7fc27a", k: "checker", p: 0 },
    lime: { n: ["연두 잔디", "Light Grass"], c: "#b6e07a", a: "#a4d068", k: "checker", p: 30 },
    autumn: { n: ["가을 잔디", "Autumn Grass"], c: "#d9c27a", a: "#c9b068", k: "checker", p: 30 },
    meadow: { n: ["꽃 들판", "Flower Meadow"], c: "#a6dc8c", a: "#96cf7c", k: "flowers", p: 40 },
    paved: { n: ["돌 포장", "Paving"], c: "#d9d5cc", a: "#bdb8ac", k: "bricks", p: 40 },
    sand: { n: ["모래 정원", "Zen Sand"], c: "#efe2c2", a: "#d9c9a0", k: "rake", p: 50 },
    snow: { n: ["눈 덮인 마당", "Snow"], c: "#f3f8fb", a: "#e1ecf4", k: "checker", p: 50 },
  };
  ["grass", "lime", "autumn", "meadow", "paved", "sand", "snow"].forEach((k) => { FLOORS[k].yard = true; });

  /* ============================== rendering ============================== */
  function orient(def, m) {
    m = ((m | 0) % 4 + 4) % 4;
    if (!m) return { w: def.w, d: def.d, parts: def.parts };
    def._o = def._o || {};
    return def._o[m] || (def._o[m] = turnParts(def.parts, def.w, def.d, m));
  }

  // Optional pictures (see public/img/house/README.md). { id: { src, wpx, ax, ay } }
  let MANIFEST = {};
  function setManifest(m) { MANIFEST = m && typeof m === "object" ? m : {}; }

  function pictureSvg(id, o, m) {
    const e = MANIFEST[id];
    if (!e || !e.src) return "";
    const w = e.wpx || 120, h = w * (e.ratio || 1), ax = e.ax != null ? e.ax : 0.5, ay = e.ay != null ? e.ay : 0.85;
    const [cx, cy] = proj(o.w / 2, o.d / 2, 0);
    return `<image href="${e.src}" x="${cx - w * ax}" y="${cy - h * ay}" width="${w}" height="${h}"${m & 1 ? ` transform="translate(${cx * 2} 0) scale(-1 1)"` : ""} preserveAspectRatio="xMidYMid meet"/>`;
  }
  /* ---- things inside furniture (sub-items) ---- */
  const BOOKCOL = ["#e66a5a", "#5b8fd0", "#68b57c", "#f2c94c", "#9a7be0", "#ef8fb0", "#4fb3b3", "#e0793a"];
  const SUBV = {
    pencilCup: ["✏️", "#fff"], miniGlobe: ["🌍", "#fff"], alarmClock: ["⏰", "#fff"], miniCactus: ["🌵", "#fff"], notebooks: ["📒", "#fff"], cocoaMug: ["☕", "#fff"], crayonBox: ["🖍️", "#fff"], stickerBook: ["⭐", "#fff"], secretDiary: ["📔", "#fff"], marbleBag: ["🔮", "#fff"],
    picMeadow: ["🌻", "#d5f0c4"], picSea: ["⛵", "#bfe3ff"], picRainbow: ["🌈", "#e4f2ff"], picSpace: ["🪐", "#34417a"], picFlowers: ["🌸", "#ffe6ee"], picKoala: ["🐨", "#dff0d8"], picNight: ["🌙", "#34417a"], picBeach: ["🏖️", "#ffe9b8"], picCastle: ["🏰", "#e6ddff"], picButterfly: ["🦋", "#ffeef8"],
    picPuppy: ["🐶", "#ffe9d0"], picKitten: ["🐱", "#fff0d8"], picMountain: ["🏔️", "#dfeeff"], picDinoPic: ["🦖", "#dff5d2"], picBalloons: ["🎈", "#fff0f0"], picRocketPic: ["🚀", "#dfe9ff"], picFish: ["🐠", "#cfeeff"], picCake: ["🎂", "#fff0f4"], picForest: ["🌲", "#d8f0d0"], picSnow: ["⛄", "#eaf6ff"],
    toyTeddy: ["🧸", "#fff"], toyBall: ["🏐", "#fff"], toyCar: ["🚗", "#fff"], toyRobot: ["🤖", "#fff"], toyDino: ["🦖", "#fff"], toyBlocks: ["🧱", "#fff"], toyDuck: ["🦆", "#fff"], toyRocket: ["🚀", "#fff"], toyBunny: ["🐰", "#fff"], toyDrum: ["🥁", "#fff"],
  };
  const subVis = (id) => SUBV[id] || null;
  const bookColor = (id) => { let h = 0; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return BOOKCOL[h % BOOKCOL.length]; };
  function subParts(def, it) {
    const sub = it.sub || [];
    if (def.subKind === "books") {
      const o = def.subBase.slice();
      sub.slice(0, 18).forEach((id, k) => { const row = Math.floor(k / 6) % 3, col = k % 6; o.push(B(0.16 + col * 0.28, 0.18, 4 + row * 28, 0.22, 0.5, 17 + (k * 5) % 8, bookColor(id))); });
      return o;
    }
    if (def.subKind === "desk") {
      const o = def.parts.slice();
      sub.slice(0, 5).forEach((id, k) => { const v = subVis(id); if (v) o.push({ t: "e", x: 0.25 + k * 0.38, y: 0.55, z: 36, s: 15, ch: v[0] }); });
      return o;
    }
    if (def.subKind === "toys") {
      const o = def.parts.slice(0, 3);
      sub.slice(0, 4).forEach((id, k) => { const v = subVis(id); if (v) o.push({ t: "e", x: 0.22 + (k % 2) * 0.45, y: 0.3 + Math.floor(k / 2) * 0.4, z: 30 + (k % 2) * 4, s: 17, ch: v[0] }); });
      return o;
    }
    return null;
  }
  function itemInner(def, m, it) {
    const sp = it && it.sub && def.subKind ? subParts(def, it) : null;
    const o = sp ? turnParts(sp, def.w, def.d, m) : orient(def, m);
    return pictureSvg(def.id, o, m) || o.parts.map(partSvg).join("");
  }
  function itemBox(def, m) { // screen bounding box of a floor piece (origin at tile 0,0)
    const o = orient(def, m);
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    o.parts.forEach((p) => partPoints(p).forEach((q) => { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }));
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }
  function thumbSvg(id, size) {
    const def = D[id];
    if (!def) return "";
    if (def.wall) {
      return `<svg class="kh-thumb" viewBox="-16 -20 ${def.pw + 32} ${def.vh + 40}" aria-hidden="true">${def.art(def.pw, def.vh)}</svg>`;
    }
    const b = itemBox(def, 0), pad = 6;
    return `<svg class="kh-thumb" viewBox="${b.x - pad} ${b.y - pad} ${b.w + pad * 2} ${b.h + pad * 2}" aria-hidden="true">${itemInner(def, 0)}</svg>`;
  }

  /* ---- room shell: walls + floor ---- */
  function wallPattern(k, c, a, len) { // px on the wall plane, 64 px = 1 tile
    let s = "";
    const W = len * 64;
    if (k === "stripes") for (let x = 0; x < W; x += 64) s += `<rect x="${x + 4}" y="${-WALL_H}" width="32" height="${WALL_H}" fill="${a}"/>`;
    else if (k === "dots") for (let x = 0; x < W; x += 32) for (let j = 0; j < 5; j++) s += `<circle cx="${x + 16 + (j % 2) * 16}" cy="${-WALL_H + 16 + j * 30}" r="3.4" fill="${a}"/>`;
    else if (k === "diamonds") for (let x = 0; x < W; x += 32) for (let j = 0; j < 5; j++) s += `<path d="M${x + 16} ${-WALL_H + 8 + j * 30}l7 12l-7 12l-7 -12z" fill="${a}"/>`;
    else if (k === "stars") for (let x = 0; x < W; x += 32) for (let j = 0; j < 5; j++) if (((x / 32) + j) % 2 === 0) s += `<circle cx="${x + 12}" cy="${-WALL_H + 14 + j * 28}" r="2.4" fill="${a}"/>`;
    else if (k === "planks") for (let x = 0; x < W; x += 32) s += `<rect x="${x}" y="${-WALL_H}" width="2" height="${WALL_H}" fill="${a}"/>`;
    return s;
  }
  function shellSvg(room, st, kind) {
    const C_ = room.C, R_ = room.R, wl = WALLS[st.wall] || WALLS.cream, fl = FLOORS[st.floor] || FLOORS.wood;
    const o = [];
    const floorTop = [proj(0, 0, 0), proj(C_, 0, 0), proj(C_, R_, 0), proj(0, R_, 0)];
    if (kind !== "yard") {
      // wall slabs (left wall along c=0 / right wall along r=0)
      const L = [proj(0, 0, WALL_H), proj(0, R_, WALL_H), proj(0, R_, 0), proj(0, 0, 0)];
      const Rg = [proj(0, 0, WALL_H), proj(C_, 0, WALL_H), proj(C_, 0, 0), proj(0, 0, 0)];
      o.push(`<polygon points="${pstr(L)}" fill="${shade(wl.c, -0.1)}"/><g transform="matrix(-0.5 0.25 0 1 0 0)" clip-path="url(#khL${room.uid})">${wallPattern(wl.k, wl.c, shade(wl.a, -0.1), R_)}</g>`);
      o.push(`<polygon points="${pstr(Rg)}" fill="${wl.c}"/><g transform="matrix(0.5 0.25 0 1 0 0)" clip-path="url(#khR${room.uid})">${wallPattern(wl.k, wl.c, wl.a, C_)}</g>`);
      // skirting boards + wall top edge + corner
      o.push(`<polygon points="${pstr([proj(0, 0, 8), proj(0, R_, 8), proj(0, R_, 0), proj(0, 0, 0)])}" fill="${shade(wl.c, -0.28)}"/><polygon points="${pstr([proj(0, 0, 8), proj(C_, 0, 8), proj(C_, 0, 0), proj(0, 0, 0)])}" fill="${shade(wl.c, -0.18)}"/>`);
      o.push(`<polygon points="${pstr([proj(0, 0, WALL_H), proj(0, R_, WALL_H), proj(-0.18, R_, WALL_H + 0), proj(-0.18, 0, WALL_H)])}" fill="${shade(wl.c, 0.5)}"/>`);
      o.push(`<polygon points="${pstr([proj(0, 0, WALL_H), proj(C_, 0, WALL_H), proj(C_, -0.18, WALL_H), proj(0, -0.18, WALL_H)])}" fill="${shade(wl.c, 0.5)}"/>`);
      o.push(`<polygon points="${pstr([proj(0, -0.18, WALL_H), proj(0, 0, WALL_H), proj(0, 0, WALL_H - 8), proj(0, -0.18, WALL_H - 8)])}" fill="${shade(wl.c, -0.3)}"/>`);
    }
    // floor slab (thickness) + top
    const frontL = [proj(0, R_, 0), proj(C_, R_, 0), proj(C_, R_, -12), proj(0, R_, -12)];
    const frontR = [proj(C_, 0, 0), proj(C_, R_, 0), proj(C_, R_, -12), proj(C_, 0, -12)];
    o.push(`<polygon points="${pstr(frontL)}" fill="${shade(fl.c, -0.38)}"/><polygon points="${pstr(frontR)}" fill="${shade(fl.c, -0.5)}"/>`);
    o.push(`<polygon points="${pstr(floorTop)}" fill="${fl.c}"/>`);
    if (fl.k === "checker") {
      for (let c = 0; c < C_; c++) for (let r = 0; r < R_; r++) if ((c + r) % 2) o.push(`<polygon points="${pstr([proj(c, r, 0), proj(c + 1, r, 0), proj(c + 1, r + 1, 0), proj(c, r + 1, 0)])}" fill="${fl.a}"/>`);
    } else if (fl.k === "planks") {
      for (let r = 1; r < R_; r++) o.push(`<polyline points="${pstr([proj(0, r, 0), proj(C_, r, 0)])}" stroke="${fl.a}" stroke-width="1.6" fill="none"/>`);
      for (let r = 0; r < R_; r++) for (let c = (r % 2) + 1; c < C_; c += 3) o.push(`<polyline points="${pstr([proj(c, r, 0), proj(c, r + 1, 0)])}" stroke="${fl.a}" stroke-width="1.2" fill="none"/>`);
    } else if (fl.k === "flowers") {
      for (let c = 0; c < C_; c++) for (let r = 0; r < R_; r++) { if ((c + r) % 2) o.push(`<polygon points="${pstr([proj(c, r, 0), proj(c + 1, r, 0), proj(c + 1, r + 1, 0), proj(c, r + 1, 0)])}" fill="${fl.a}"/>`); if ((c * 7 + r * 13) % 5 === 0) { const q = proj(c + 0.3 + ((c * 3 + r) % 3) * 0.2, r + 0.5, 0); o.push(`<circle cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="2.6" fill="${["#ef6f8e", "#f2c230", "#ffffff", "#9a7be0"][(c + r) % 4]}"/>`); } }
    } else if (fl.k === "bricks") {
      for (let r = 1; r < R_; r++) o.push(`<polyline points="${pstr([proj(0, r, 0), proj(C_, r, 0)])}" stroke="${fl.a}" stroke-width="1.4" fill="none"/>`);
      for (let c = 1; c < C_; c++) o.push(`<polyline points="${pstr([proj(c, 0, 0), proj(c, R_, 0)])}" stroke="${fl.a}" stroke-width="1.4" fill="none"/>`);
    } else if (fl.k === "rake") {
      for (let r = 0; r < R_; r++) for (let q = 0.25; q < 1; q += 0.25) o.push(`<polyline points="${pstr([proj(0, r + q, 0), proj(C_, r + q, 0)])}" stroke="${fl.a}" stroke-width="1" fill="none"/>`);
      for (const [c, r] of [[3, 6], [9, 8]]) if (c + 1 < C_ && r + 1 < R_) o.push(`<ellipse cx="${proj(c + 0.5, r + 0.5, 0)[0]}" cy="${proj(c + 0.5, r + 0.5, 0)[1] - 3}" rx="14" ry="8" fill="#b9b2a4"/>`);
    } else for (let c = 1; c < C_; c += 1) for (let r = (c % 2); r < R_; r += 2) o.push(`<circle cx="${proj(c + 0.5, r + 0.5, 0)[0]}" cy="${proj(c + 0.5, r + 0.5, 0)[1]}" r="1.6" fill="${fl.a}"/>`);
    if (kind === "yard") o.push(pathSvg(st));
    return { svg: o.join(""), clips: `<clipPath id="khL${room.uid}"><rect x="0" y="${-WALL_H}" width="${R_ * 64}" height="${WALL_H}"/></clipPath><clipPath id="khR${room.uid}"><rect x="0" y="${-WALL_H}" width="${C_ * 64}" height="${WALL_H}"/></clipPath>` };
  }

  /* ---- yard: house exteriors + garden ---- */
  const HOUSE_WALLS = { cream: ["크림", "Cream", "#f6e7c9"], sky: ["하늘", "Sky", "#cfe3f7"], pink: ["분홍", "Pink", "#f7d3dc"], mint: ["민트", "Mint", "#cdeedf"], lemon: ["레몬", "Lemon", "#fdf0b8"], white: ["하양", "White", "#f7f7f4"], brick: ["벽돌", "Brick", "#d9a08a"] };
  const HOUSE_ROOFS = { red: ["빨강", "Red", "#c9503f"], blue: ["파랑", "Blue", "#4f78c0"], green: ["초록", "Green", "#4f9a63"], plum: ["보라", "Plum", "#8a5ab0"], orange: ["주황", "Orange", "#e0793a"], gray: ["회색", "Gray", "#7d858f"], brown: ["갈색", "Brown", "#8a5a3a"] };
  const HOUSE_DOORS = { wood: ["나무", "Wood", "#a4713a"], red: ["빨강", "Red", "#d95d4f"], blue: ["파랑", "Blue", "#4f78c0"], yellow: ["노랑", "Yellow", "#f2c230"], green: ["초록", "Green", "#4f9a63"] };
  const HOUSE_STYLES = {
    cottage: { n: ["아담한 집", "Cottage"], w: 6, d: 4, p: 0 },
    villa: { n: ["넓은 집", "Wide House"], w: 10, d: 4, p: 150 },
    twoStory: { n: ["2층집", "Two-storey"], w: 6, d: 4, p: 200 },
    modern: { n: ["모던 하우스", "Modern House"], w: 8, d: 4, p: 250 },
    cabin: { n: ["통나무집", "Log Cabin"], w: 6, d: 4, p: 120 },
    castle: { n: ["동화 성", "Fairy Castle"], w: 8, d: 5, p: 400 },
  };
  const YARD_SIZES = { normal: { n: ["보통 마당", "Normal"], C: 14, R: 12, p: 0 }, wide: { n: ["넓은 마당", "Wide"], C: 18, R: 12, p: 120 }, large: { n: ["아주 넓은 마당", "Large"], C: 18, R: 16, p: 250 } };
  const BORDERS = { none: ["없음", "None"], fence: ["하얀 울타리", "White Fence"], hedge: ["생울타리", "Hedge"], stone: ["돌담", "Stone Wall"] };
  const PATHS = { none: ["없음", "None"], stones: ["징검다리", "Stepping Stones"], brick: ["벽돌길", "Brick Path"], plank: ["나무길", "Plank Path"] };
  const GARDEN_PRESETS = {
    lawn: { n: ["푸른 잔디 정원", "Green Lawn"], floor: "grass", border: "fence", path: "stones", size: "normal" },
    flower: { n: ["꽃 정원", "Flower Garden"], floor: "meadow", border: "hedge", path: "brick", size: "normal" },
    wide: { n: ["넓은 앞마당", "Big Front Yard"], floor: "grass", border: "none", path: "stones", size: "wide" },
    zen: { n: ["모래 정원", "Zen Garden"], floor: "sand", border: "stone", path: "plank", size: "normal" },
    winter: { n: ["겨울 정원", "Winter Garden"], floor: "snow", border: "fence", path: "stones", size: "normal" },
    autumn: { n: ["가을 정원", "Autumn Garden"], floor: "autumn", border: "hedge", path: "brick", size: "normal" },
  };
  const YARD = { ko: "마당", en: "Yard", label: ["마당", "Yard"], kind: "yard", C: 14, R: 12, wall: "cream", floor: "grass", id: "yard" };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function yardDims(y) { const z = YARD_SIZES[(y && y.size)] || YARD_SIZES.normal; return { C: z.C, R: z.R }; }
  function yardRoom(y) { return Object.assign({}, YARD, yardDims(y), { uid: "yard" + ((y && y.size) || "normal") }); }
  function houseRect(y) {
    const h = (y && y.house) || {}, sty = HOUSE_STYLES[h.style] || HOUSE_STYLES.cottage, dm = yardDims(y), rot = h.rot ? 1 : 0, sh = h.shift || 0;
    if (!rot) { const c0 = clamp(Math.floor((dm.C - sty.w) / 2) + sh, 0, dm.C - sty.w); return { c0, r0: 0, c1: c0 + sty.w, r1: sty.d, w: sty.w, d: sty.d, rot }; }
    const r0 = clamp(Math.floor((dm.R - sty.w) / 2) + sh, 0, dm.R - sty.w);
    return { c0: 0, r0, c1: sty.d, r1: r0 + sty.w, w: sty.w, d: sty.d, rot };
  }
  const mirrorPart = (p) => ((p.t === "b" || p.t === "py") ? Object.assign({}, p, { x: p.y, y: p.x, w: p.d, d: p.w }) : Object.assign({}, p, { x: p.y, y: p.x }));

  function houseLocal(h, w, d) { // the building in its own tiles: width along x, front face at y = d - 0.3
    const W = (HOUSE_WALLS[h.wall] || HOUSE_WALLS.cream)[2], R = (HOUSE_ROOFS[h.roof] || HOUSE_ROOFS.red)[2], Dr = (HOUSE_DOORS[h.door] || HOUSE_DOORS.wood)[2];
    const m = 0.3, yF = d - 0.3, o = [], st = h.style || "cottage", glass = "#b7d8f2";
    const win = (x, z, ww, hh) => o.push(B(x, yF, z, ww, 0.05, hh, glass), B(x - 0.04, yF - 0.02, z + hh, ww + 0.08, 0.08, 4, "#fff"), B(x - 0.04, yF - 0.02, z - 3, ww + 0.08, 0.08, 4, "#fff"), B(x + ww / 2 - 0.03, yF, z, 0.06, 0.06, hh, "#fff"));
    const door = (cx, hh) => o.push(B(cx - 0.7, yF - 0.02, 0, 1.4, 0.06, hh, Dr), B(cx - 0.7, yF - 0.02, hh - 4, 1.4, 0.08, 4, shade(Dr, -0.3)), S(cx + 0.45, yF + 0.04, hh / 2, 2.4, "#f2c94c"), B(cx - 0.9, yF, 0, 1.8, 0.4, 4, "#d8d2c4"));
    const cx = w / 2;
    if (st === "cottage") {
      o.push(B(m, 0.3, 0, w - 2 * m, d - 0.6, 88, W), PY(0, 0, 88, w, d, 56, R), B(w - 1.4, 0.8, 88, 0.6, 0.6, 46, shade(R, -0.1)));
      win(1.0, 20, 1.5, 46); win(w - 2.5, 20, 1.5, 46); door(cx, 64);
    } else if (st === "villa") {
      o.push(B(m, 0.3, 0, w - 2 * m, d - 0.6, 80, W), PY(0, 0, 80, w, d, 42, R), B(1.2, 0.8, 80, 0.6, 0.6, 40, shade(R, -0.1)), B(w - 1.8, 0.8, 80, 0.6, 0.6, 40, shade(R, -0.1)));
      win(0.9, 20, 1.4, 44); win(2.7, 20, 1.4, 44); win(w - 2.3, 20, 1.4, 44); win(w - 4.1, 20, 1.4, 44); door(cx, 62);
      o.push(B(cx - 1.3, yF + 0.2, 62, 2.6, 0.9, 5, shade(R, -0.05)), B(cx - 1.3, yF + 0.95, 0, 0.14, 0.14, 62, "#fff"), B(cx + 1.16, yF + 0.95, 0, 0.14, 0.14, 62, "#fff"));
    } else if (st === "twoStory") {
      o.push(B(m, 0.3, 0, w - 2 * m, d - 0.6, 150, W), B(m - 0.04, 0.26, 70, w - 2 * m + 0.08, d - 0.5, 5, shade(W, -0.18)), PY(0, 0, 150, w, d, 58, R), B(w - 1.4, 0.8, 150, 0.6, 0.6, 44, shade(R, -0.1)));
      win(0.9, 20, 1.3, 38); win(w - 2.2, 20, 1.3, 38); door(cx, 60);
      win(0.9, 92, 1.3, 38); win(w - 2.2, 92, 1.3, 38); win(cx - 0.65, 92, 1.3, 38);
      o.push(B(cx - 1.2, yF + 0.1, 80, 2.4, 0.6, 4, "#fff"), B(cx - 1.2, yF + 0.6, 80, 2.4, 0.05, 14, "#ececec"));
    } else if (st === "modern") {
      o.push(B(m, 0.3, 0, w - 2 * m, d - 0.6, 96, W), B(0, 0.2, 96, w, d - 0.4, 6, shade(R, -0.15)), B(1.2, 0.8, 102, w - 3.4, d - 1.6, 46, shade(W, -0.06)), B(0.9, 0.5, 148, w - 2.8, d - 1.0, 5, shade(R, -0.15)));
      o.push(B(m + 0.5, yF, 16, 2.8, 0.05, 58, "#9cc9ea"), B(w - 3.6, yF, 16, 2.8, 0.05, 58, "#9cc9ea"), B(1.6, 3.35 + (d - 4), 112, w - 4.2, 0.05, 26, "#9cc9ea")); door(cx, 66);
    } else if (st === "cabin") {
      const body = shade(W, -0.3);
      o.push(B(m, 0.3, 0, w - 2 * m, d - 0.6, 80, body));
      for (let z = 10; z < 80; z += 14) o.push(B(m - 0.02, yF, z, w - 2 * m + 0.04, 0.05, 2, shade(body, -0.28)), B(w - m, 0.3, z, 0.05, d - 0.6, 2, shade(body, -0.34)));
      o.push(PY(0, 0, 80, w, d, 74, R), B(w - 1.5, 0.8, 80, 0.7, 0.7, 62, "#aeb4ba")); win(0.9, 24, 1.3, 38); win(w - 2.2, 24, 1.3, 38); door(cx, 62);
    } else { // castle
      const stone = shade(W, -0.14);
      o.push(B(m, 0.4, 0, w - 2 * m, d - 0.8, 110, stone));
      for (let i = 0; i < Math.floor((w - 2 * m) / 0.7); i++) o.push(B(m + 0.1 + i * 0.7, yF - 0.18, 110, 0.4, 0.2, 10, stone));
      [0.0, w - 1.6].forEach((tx) => o.push(B(tx, d - 2.0, 0, 1.6, 1.6, 150, shade(stone, -0.05)), PY(tx - 0.1, d - 2.1, 150, 1.8, 1.8, 54, R), B(tx + 0.5, d - 0.42, 90, 0.5, 0.05, 30, glass)));
      o.push(B(cx - 1.0, yF - 0.02, 0, 2.0, 0.06, 80, Dr), B(cx - 1.0, yF - 0.02, 76, 2.0, 0.08, 4, shade(Dr, -0.3)), S(cx + 0.7, yF + 0.04, 38, 2.6, "#f2c94c"), B(cx - 1.2, yF, 0, 2.4, 0.4, 4, "#d8d2c4"));
      win(1.6, 50, 0.9, 34); win(w - 2.5, 50, 0.9, 34);
    }
    return o;
  }
  // the house in yard tiles (turned to face +x when rot is set)
  function houseParts(y) {
    const h = (y && y.house) || {}, rc = houseRect(y), loc = houseLocal(h, rc.w, rc.d);
    return loc.map((p) => {
      const q = rc.rot ? mirrorPart(p) : p;
      return Object.assign({}, q, { x: q.x + (rc.rot ? rc.c0 : rc.c0), y: q.y + (rc.rot ? rc.r0 : 0) });
    });
  }
  const houseDepth = (y) => { const rc = houseRect(y); return rc.c1 + rc.r1 - 0.4; };
  function doorSpan(y) { // the two tiles in front of the door, along the front wall
    const rc = houseRect(y);
    return rc.rot ? { rot: 1, a: Math.floor(rc.r0 + rc.w / 2) - 1 } : { rot: 0, a: Math.floor(rc.c0 + rc.w / 2) - 1 };
  }
  // automatic border pieces + path tiles
  function yardExtras(y) {
    const dm = yardDims(y), rc = houseRect(y), ds = doorSpan(y), virt = [], path = [];
    const inHouse = (c, r) => c >= rc.c0 && c < rc.c1 && r >= rc.r0 && r < rc.r1;
    const id = { fence: "fence", hedge: "hedge1", stone: "stoneWall1" }[y && y.border];
    if (id) {
      const add = (c, r, m) => { if (!inHouse(c, r)) virt.push({ uid: "", id, c, r, m, z: 0, fixed: true }); };
      for (let r = 0; r < dm.R; r++) { add(0, r, 1); add(dm.C - 1, r, 1); }
      for (let c = 1; c < dm.C - 1; c++) { add(c, 0, 0); add(c, dm.R - 1, 0); }
      // leave a gate in front of the door
      for (let i = virt.length - 1; i >= 0; i--) { const v = virt[i]; if (ds.rot ? (v.c === dm.C - 1 && (v.r === ds.a || v.r === ds.a + 1)) : (v.r === dm.R - 1 && (v.c === ds.a || v.c === ds.a + 1))) virt.splice(i, 1); }
    }
    if (y && y.path && y.path !== "none") {
      if (ds.rot) for (let c = rc.c1; c < dm.C; c++) { path.push([c, ds.a]); path.push([c, ds.a + 1]); }
      else for (let r = rc.r1; r < dm.R; r++) { path.push([ds.a, r]); path.push([ds.a + 1, r]); }
    }
    return { virt, path };
  }
  function pathSvg(y) {
    const kind = y.path, o = [];
    if (!kind || kind === "none") return "";
    yardExtras(y).path.forEach(([c, r], i) => {
      const quad = (a, b, w, d) => pstr([proj(a, b, 0), proj(a + w, b, 0), proj(a + w, b + d, 0), proj(a, b + d, 0)]);
      if (kind === "stones") { const q = proj(c + 0.5, r + 0.5 + (i % 2 ? 0.1 : -0.1), 0); o.push(`<ellipse cx="${q[0].toFixed(1)}" cy="${(q[1] - 1).toFixed(1)}" rx="19" ry="9" fill="#aeb4ba"/><ellipse cx="${q[0].toFixed(1)}" cy="${(q[1] - 3).toFixed(1)}" rx="19" ry="9" fill="#cfd4d8"/>`); }
      else if (kind === "brick") o.push(`<polygon points="${quad(c, r, 1, 1)}" fill="${(c + r) % 2 ? "#d99a7d" : "#cc8b6f"}" stroke="#b97a60" stroke-width="1"/>`);
      else o.push(`<polygon points="${quad(c + 0.04, r, 0.92, 1)}" fill="${i % 2 ? "#c99a63" : "#b98a55"}" stroke="#8f6a3e" stroke-width="1"/>`);
    });
    return o.join("");
  }

  /* ---- scene: everything as one SVG ---- */
  let uidSeq = 0;
  function sceneBox(room, kind) {
    const C_ = room.C, R_ = room.R, top = kind === "yard" ? 300 : WALL_H;
    return { x: -R_ * HW - 24, y: -top - 28, w: (C_ + R_) * HW + 48, h: (C_ + R_) * HH + top + 28 + 56 };
  }
  function depthKey(i) { const o = orient(D[i.id], i.m); return (i.c + o.w) + (i.r + o.d) + (i.z || 0) / 200; }
  function depthCmp(a, b) { return depthKey(a) - depthKey(b); }
  function floorItemSvg(i) {
    const def = D[i.id], [x, y] = proj(i.c, i.r, i.z || 0);
    return `<g class="kh-it${i.fixed ? " kh-fixed" : ""}" data-uid="${i.uid || ""}" data-id="${i.id}" data-k="${def.flat ? -1 : depthKey(i).toFixed(3)}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">${itemInner(def, i.m, i)}</g>`;
  }
  function wallMatrix(side) { return side === "L" ? "matrix(-0.5 0.25 0 1 0 0)" : "matrix(0.5 0.25 0 1 0 0)"; }
  function wallItemSvg(i) {
    const def = D[i.id], v = -(i.h || def.defH) - def.vh;
    let art = def.art(def.pw, def.vh);
    const sv = def.subKind === "frame" && i.sub && i.sub[0] ? subVis(i.sub[0]) : null;
    if (sv) { const fs = Math.min(def.pw, def.vh) * 0.55; art += `<rect x="5" y="5" width="${def.pw - 10}" height="${def.vh - 10}" fill="${sv[1]}"/><text x="${def.pw / 2}" y="${def.vh / 2 + fs * 0.34}" font-size="${fs.toFixed(0)}" text-anchor="middle" style="font-family:'Segoe UI Emoji','Apple Color Emoji','Noto Color Emoji',sans-serif">${sv[0]}</text>`; }
    return `<g class="kh-it kh-wall" data-uid="${i.uid || ""}" data-id="${i.id}" data-k="-2"><g transform="${wallMatrix(i.side)}"><g transform="translate(${i.u * 64} ${v})">${art}</g></g></g>`;
  }
  // Render one room (state: {wall, floor, items:[...]}) into an SVG string. opts: {label, extra}
  function roomSvg(room, st, opts) {
    const o = opts || {}, kind = room.kind || "room";
    room.uid = room.uid || ++uidSeq;
    const box = sceneBox(room, kind), sh = shellSvg(room, st, kind), keyed = [], flatSvg = [], wallSvg = [];
    let items = (st.items || []).slice();
    if (kind === "yard") {
      keyed.push({ k: houseDepth(st), svg: `<g class="kh-house" data-k="${houseDepth(st).toFixed(3)}">${houseParts(st).map(partSvg).join("")}</g>` });
      items = items.concat(yardExtras(st).virt);
    }
    items.forEach((i) => {
      const d = D[i.id]; if (!d) return;
      if (d.wall) wallSvg.push(wallItemSvg(i));
      else if (d.flat) flatSvg.push(floorItemSvg(i));
      else keyed.push({ k: depthKey(i), svg: floorItemSvg(i) });
    });
    keyed.sort((a, b) => a.k - b.k);
    const view = `${box.x} ${box.y} ${box.w} ${box.h}`;
    return `<svg class="kh-room-svg" viewBox="${view}" xmlns="http://www.w3.org/2000/svg" ${o.label ? `role="img" aria-label="${o.label}"` : 'aria-hidden="true"'}><defs>${sh.clips}</defs><g class="kh-shell">${sh.svg}</g><g class="kh-items">${wallSvg.join("")}${flatSvg.join("")}${keyed.map((x) => x.svg).join("")}${""}</g>${o.extra || ""}</svg>`;
  }

  /* ============================== rooms & state ============================== */
  // The kinds of room sold in the shop. Each one built on the floor plan becomes its own room.
  const ROOMS = {
    study: { ko: "공부방", en: "Study", C: 6, R: 6, price: 0, wall: "mint", floor: "wood", ic: "📚" },
    bedroom: { ko: "침실", en: "Bedroom", C: 6, R: 6, price: 150, wall: "sky", floor: "lightWood", ic: "🛏️" },
    master: { ko: "마스터룸", en: "Master Room", C: 8, R: 8, price: 500, wall: "pink", floor: "plum", ic: "👑" },
    living: { ko: "거실", en: "Living Room", C: 8, R: 7, price: 250, wall: "cream", floor: "wood", ic: "🛋️" },
    kitchen: { ko: "주방", en: "Kitchen", C: 6, R: 6, price: 250, wall: "yellow", floor: "pinkTile", ic: "🍳" },
    playroom: { ko: "놀이방", en: "Playroom", C: 7, R: 6, price: 200, wall: "sky", floor: "lime", ic: "🧸" },
    cinema: { ko: "시네마룸", en: "Cinema", C: 7, R: 7, price: 400, wall: "purple", floor: "plum", ic: "🎬" },
    bath: { ko: "화장실", en: "Bathroom", C: 5, R: 5, price: 180, wall: "sky", floor: "blueTile", ic: "🛁" },
    garage: { ko: "차고", en: "Garage", C: 7, R: 6, price: 200, wall: "cream", floor: "stone", ic: "🚗" },
  };
  const ROOM_ORDER = ["study", "bedroom", "master", "living", "kitchen", "playroom", "cinema", "bath", "garage"];
  Object.keys(ROOMS).forEach((k) => { ROOMS[k].id = k; });
  // the floor plan: a 3 x 3 grid of room plots; the entrance (and the yard) is below the bottom row
  const PLAN = { cols: 3, rows: 3 };
  const SLOTS = []; for (let r = 0; r < PLAN.rows; r++) for (let c = 0; c < PLAN.cols; c++) SLOTS.push("s" + (r * PLAN.cols + c));
  const START_SLOT = "s7";

  const STORE_KEY = "koalaHouse:v2", OLD_KEY = "koalaHouse:v1";
  let seq = 0;
  const newUid = () => Date.now().toString(36) + (++seq).toString(36) + Math.random().toString(36).slice(2, 4);

  function starter() {
    const it = (id, c, r, m) => ({ uid: newUid(), id, c, r, m: m || 0, z: 0 });
    return {
      v: 2, cur: START_SLOT,
      owned: { bedBlue: 1, sofaRed: 1, deskWood: 1, stoolBlue: 1, shelfWood: 1, wardrobeWood: 1, tableRound: 1, rugBlue: 1, lampDesk: 1, vase: 1, bookStack: 1, plantBig: 1, dresser: 1, toybox: 1, tvStand: 1, fridge: 1, counter: 1, stove: 1, bathtub: 1, toilet: 1, vanity: 1, treeApple: 1, bush: 1, flowerBed: 1, bench: 1, fence: 1, stones: 1, pottedSmall: 1, winDay: 1, frameSun: 1 },
      worn: {}, walls: { cream: 1, mint: 1 }, floors: { wood: 1, grass: 1 }, houseStyles: { cottage: 1 }, yardSizes: { normal: 1 },
      slots: {
        [START_SLOT]: { type: "study", wall: "mint", floor: "wood", items: [it("rugBlue", 1, 2), it("deskWood", 3, 0), Object.assign(it("stoolBlue", 3, 1), { m: 0 }), it("shelfWood", 0, 1, 1), it("plantBig", 5, 5), Object.assign(it("lampDesk", 4, 0), { z: 34 }), Object.assign(it("bookStack", 3, 0), { z: 34 }), { uid: newUid(), id: "winDay", side: "R", u: 1.5, h: 56 }, { uid: newUid(), id: "frameSun", side: "L", u: 3.5, h: 70 }] },
      },
      yard: { size: "normal", floor: "grass", border: "fence", path: "stones", house: { style: "cottage", wall: "cream", roof: "red", door: "wood", rot: 0, shift: 0 }, items: [it("treeApple", 1, 5), it("flowerBed", 9, 6), it("bench", 3, 9), it("bush", 0, 8)] },
    };
  }
  function migrate(o) { // v1 kept one room per kind; v2 keeps rooms on plots of the floor plan
    const S = starter();
    Object.assign(S, { owned: Object.assign(S.owned, o.owned || {}), worn: o.worn || {}, walls: o.walls || S.walls, floors: o.floors || S.floors });
    S.slots = {};
    const own = Object.keys(o.owned_rooms || { study: 1 }).filter((k) => ROOMS[k] && o.rooms && o.rooms[k]);
    let n = 0;
    own.forEach((k) => {
      const slot = k === "study" ? START_SLOT : SLOTS.filter((x) => x !== START_SLOT)[n++];
      if (!slot) return;
      const r = o.rooms[k];
      S.slots[slot] = { type: k, wall: r.wall, floor: r.floor, items: (r.items || []).map((i) => (i.m ? Object.assign({}, i, { m: 1 }) : i)) };
    });
    if (!S.slots[START_SLOT]) S.slots[START_SLOT] = starter().slots[START_SLOT];
    if (o.yard) S.yard = Object.assign(starter().yard, { floor: o.yard.floor || "grass", items: (o.yard.items || []).filter((i) => D[i.id]) });
    return S;
  }
  function load() {
    try { const s = JSON.parse(localStorage.getItem(STORE_KEY)); if (s && s.v === 2 && s.slots && s.yard) return s; } catch (e) { /* fall through */ }
    try { const o = JSON.parse(localStorage.getItem(OLD_KEY)); if (o && o.rooms) return migrate(o); } catch (e) { /* fall through */ }
    return starter();
  }
  function persist(S) { try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { /* storage may be blocked */ } }

  // a plot of the plan (or the yard) as a room definition
  function roomOf(S, id) {
    if (id === "yard") return yardRoom(S.yard);
    const st = S.slots[id];
    if (!st) return null;
    const t = ROOMS[st.type];
    let n = 0, idx = 0;
    SLOTS.forEach((sl) => { const o = S.slots[sl]; if (o && o.type === st.type) { n++; if (sl === id) idx = n; } });
    return Object.assign({}, t, { id, uid: "slot" + id + st.type, label: [t.ko + (n > 1 ? " " + idx : ""), t.en + (n > 1 ? " " + idx : "")] });
  }
  const stateOf = (S, id) => (id === "yard" ? S.yard : S.slots[id]);

  /* ---- placement rules ---- */
  function footprint(i) { const o = orient(D[i.id], i.m); return { w: o.w, d: o.d }; }
  function cellsOf(i) { const f = footprint(i), a = []; for (let c = 0; c < f.w; c++) for (let r = 0; r < f.d; r++) a.push((Math.floor(i.c + 1e-6) + c) + "," + (Math.floor(i.r + 1e-6) + r)); return a; }
  D._house = { id: "_house", cat: "sys", name: ["집", "House"], w: 1, d: 1, price: 0, parts: [], virtual: true, where: "none" };
  // occupant map for non-flat floor pieces
  function occupancy(items, skipUid) {
    const m = {};
    items.forEach((i) => { const d = D[i.id]; if (!d || d.wall || d.flat || i.uid === skipUid) return; cellsOf(i).forEach((k) => { (m[k] = m[k] || []).push(i); }); });
    return m;
  }
  // everything that blocks a floor cell in this room (the yard adds the house and the border)
  function occ(room, st, skipUid) {
    const m = occupancy(st.items, skipUid);
    if (room.kind === "yard") {
      yardExtras(st).virt.forEach((v) => cellsOf(v).forEach((k) => { (m[k] = m[k] || []).push(v); }));
      const rc = houseRect(st);
      for (let c = rc.c0; c < rc.c1; c++) for (let r = rc.r0; r < rc.r1; r++) (m[c + "," + r] = m[c + "," + r] || []).push({ id: "_house", uid: "_house", c, r, m: 0 });
    }
    return m;
  }
  // can the piece sit at (c, r)? returns {ok, z}
  function canPlace(room, st, piece, skipUid) {
    const def = D[piece.id], f = footprint(piece);
    const c0 = Math.round(piece.c), r0 = Math.round(piece.r);
    if (c0 < 0 || r0 < 0 || c0 + f.w > room.C || r0 + f.d > room.R) return { ok: false, z: 0 };
    const o = occ(room, st, skipUid);
    if (def.flat) {
      for (let c = 0; c < f.w; c++) for (let r = 0; r < f.d; r++) { const l = o[(c0 + c) + "," + (r0 + r)]; if (l && l.some((x) => x.id === "_house")) return { ok: false, z: 0 }; }
      return { ok: true, z: 0 };
    }
    let z = 0, ok = true;
    for (let c = 0; c < f.w; c++) for (let r = 0; r < f.d; r++) {
      const list = o[(c0 + c) + "," + (r0 + r)];
      if (!list || !list.length) continue;
      const top = list.find((x) => D[x.id].topH && !D[x.id].stack);
      if (def.stack && top && list.length === 1) z = Math.max(z, D[top.id].topH); else ok = false;
    }
    return { ok, z };
  }
  function freeCells(room, st) {
    const o = occ(room, st), a = [];
    for (let c = 0; c < room.C; c++) for (let r = 0; r < room.R; r++) if (!o[c + "," + r]) a.push([c, r]);
    return a;
  }
  // what is the koala allowed to sit on? the seat item whose cell is (c, r)
  function seatAt(st, c, r) {
    return (st.items || []).find((i) => { const d = D[i.id]; return d && d.seat && cellsOf(i).includes(c + "," + r); }) || null;
  }
  // the direction a seat faces (the way the koala looks when sitting on it): 0 +y, 1 +x, 2 -y, 3 -x
  const seatFacing = (i) => ((i.m | 0) % 4 + 4) % 4;

  return {
    TW, TH, WALL_H, D, WALLS, FLOORS, ROOMS, ROOM_ORDER, PLAN, SLOTS, START_SLOT, YARD, HOUSE_WALLS, HOUSE_ROOFS, HOUSE_DOORS, HOUSE_STYLES, YARD_SIZES, BORDERS, PATHS, GARDEN_PRESETS,
    proj, shade, orient, itemBox, itemInner, thumbSvg, roomSvg, wallItemSvg, floorItemSvg, sceneBox, depthCmp, roomOf, stateOf, yardDims, houseRect, subVis, bookColor,
    canPlace, freeCells, occupancy, occ, depthKey, footprint, cellsOf, seatAt, seatFacing, load, persist, starter, newUid, setManifest, wallMatrix, houseParts,
  };
});
