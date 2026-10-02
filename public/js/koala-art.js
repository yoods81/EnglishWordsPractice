// Koala Study Mate — the dress-up Koala (Phase 2).
//
// Pure SVG-string builder, no DOM. The base koala uses the same colours and
// shapes as the Koala artwork already used in Spelling/Flashcards, minus the
// baked-in graduation cap (the Graduation Hat is now an item the child earns).
// Each item draws on a back layer (behind the body) and/or a front layer.
// All art lives in one 200x205 coordinate space so any item fits any koala.
//
// Later phases reuse avatar() as-is (e.g. the homepage profile in Phase 5).
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.KoalaArt = api;
})(typeof self !== "undefined" ? self : this, function () {
  const FULL_VIEW = "0 0 200 205";
  const HEAD_VIEW = "26 12 148 124";

  // view: which crop the small item picture on a card uses.
  const ART = {
    blueCap: {
      view: "head",
      front: `<path d="M60 58 C58 34 80 26 100 26 C120 26 142 34 140 58 Z" fill="#3b82f6"/>
        <path d="M60 56 C76 62 124 62 140 56 L152 64 C128 74 72 74 48 64 Z" fill="#2563eb"/>
        <circle cx="100" cy="25" r="4.2" fill="#93c5fd"/>
        <path d="M80 38 Q100 31 120 38" stroke="#60a5fa" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    },
    gradHat: {
      view: "head",
      front: `<polygon points="100,26 150,41 100,58 50,41" fill="#26332f"/>
        <rect x="80" y="50" width="40" height="10" rx="3" fill="#26332f"/>
        <line x1="146" y1="42" x2="146" y2="62" stroke="#ffd166" stroke-width="2.6"/><circle cx="146" cy="65" r="3.4" fill="#ffd166"/>`,
    },
    crown: {
      view: "head",
      front: `<path d="M62 54 L66 26 L84 40 L100 22 L116 40 L134 26 L138 54 Z" fill="#ffd166" stroke="#e0a21a" stroke-width="2.6" stroke-linejoin="round"/>
        <rect x="62" y="48" width="76" height="9" rx="3" fill="#f5b83d" stroke="#e0a21a" stroke-width="1.6"/>
        <circle cx="100" cy="37" r="3.6" fill="#ef4444"/><circle cx="78" cy="52" r="2.6" fill="#3fb984"/><circle cx="122" cy="52" r="2.6" fill="#3b82f6"/>`,
    },
    roundGlasses: {
      view: "head",
      front: `<g fill="rgba(255,255,255,.3)" stroke="#26332f" stroke-width="3.2"><circle cx="82" cy="76" r="13"/><circle cx="118" cy="76" r="13"/></g>
        <path d="M95 75 Q100 70 105 75" stroke="#26332f" stroke-width="3.2" fill="none" stroke-linecap="round"/>
        <path d="M69 73 L56 69 M131 73 L144 69" stroke="#26332f" stroke-width="3" stroke-linecap="round"/>`,
    },
    sunglasses: {
      view: "head",
      front: `<path d="M65 68 H98 V80 Q98 93 81.5 93 Q65 93 65 80 Z" fill="#1f2a27"/>
        <path d="M102 68 H135 V80 Q135 93 118.5 93 Q102 93 102 80 Z" fill="#1f2a27"/>
        <rect x="96" y="68" width="8" height="4" fill="#1f2a27"/>
        <path d="M71 74 H80 M108 74 H117" stroke="#fff" stroke-opacity=".5" stroke-width="3" stroke-linecap="round"/>
        <path d="M65 70 L54 67 M135 70 L146 67" stroke="#1f2a27" stroke-width="3" stroke-linecap="round"/>`,
    },
    redScarf: {
      view: "full",
      front: `<path d="M62 117 Q100 138 138 117 L142 131 Q100 153 58 131 Z" fill="#ef4444"/>
        <path d="M66 124 Q100 143 134 124" stroke="#fca5a5" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/>
        <path d="M116 138 L126 168 L109 172 L103 143 Z" fill="#dc2626"/>`,
    },
    heroCape: {
      view: "full",
      back: `<path d="M62 114 L22 192 Q100 208 178 192 L138 114 Z" fill="#ef4444"/>
        <path d="M62 114 L22 192 Q56 200 80 198 L74 126 Z" fill="#b91c1c" opacity=".45"/>`,
      front: `<path d="M64 120 Q100 134 136 120" stroke="#dc2626" stroke-width="6" fill="none" stroke-linecap="round"/>
        <rect x="86" y="118" width="28" height="10" rx="5" fill="#ffd166" stroke="#e0a21a" stroke-width="2"/>`,
    },
    headphones: {
      view: "head",
      front: `<path d="M52 70 C48 24 152 24 148 70" fill="none" stroke="#26332f" stroke-width="7" stroke-linecap="round"/>
        <ellipse cx="50" cy="70" rx="9.5" ry="15" fill="#ef4444" stroke="#26332f" stroke-width="3"/>
        <ellipse cx="150" cy="70" rx="9.5" ry="15" fill="#ef4444" stroke="#26332f" stroke-width="3"/>`,
    },
    backpack: {
      view: "full",
      back: `<rect x="36" y="104" width="128" height="86" rx="26" fill="#f59e0b"/>
        <rect x="62" y="148" width="76" height="34" rx="11" fill="#d97706"/>`,
      front: `<path d="M76 116 Q69 142 78 170" stroke="#d97706" stroke-width="8" fill="none" stroke-linecap="round"/>
        <path d="M124 116 Q131 142 122 170" stroke="#d97706" stroke-width="8" fill="none" stroke-linecap="round"/>`,
    },
  };

  // Front layers are drawn in this slot order, so e.g. headwear always sits
  // on top of headphones, and glasses on top of the face.
  const FRONT_ORDER = ["clothing", "accessory", "face", "headwear"];
  // Back layers sit behind the body (cape first, backpack in front of it).
  const BACK_ORDER = ["clothing", "accessory"];

  const BASE = `
    <ellipse cx="72" cy="182" rx="20" ry="9" fill="#8d9c97"/><ellipse cx="128" cy="182" rx="20" ry="9" fill="#8d9c97"/>
    <ellipse cx="100" cy="146" rx="46" ry="40" fill="#a9b7b2"/>
    <ellipse cx="100" cy="152" rx="28" ry="28" fill="#e3ebe8"/>
    <ellipse cx="66" cy="168" rx="20" ry="15" fill="#a9b7b2"/><ellipse cx="134" cy="168" rx="20" ry="15" fill="#a9b7b2"/>
    <line x1="64" y1="124" x2="46" y2="152" stroke="#a9b7b2" stroke-width="14" stroke-linecap="round"/><circle cx="45" cy="154" r="8" fill="#8d9c97"/>
    <line x1="136" y1="124" x2="154" y2="152" stroke="#a9b7b2" stroke-width="14" stroke-linecap="round"/><circle cx="155" cy="154" r="8" fill="#8d9c97"/>
    <circle cx="50" cy="66" r="24" fill="#a9b7b2"/><circle cx="50" cy="66" r="15" fill="#eef2f0"/>
    <path d="M42 62 q6 -6 12 0 M40 70 q8 -5 14 1" stroke="#c9d3cf" stroke-width="2" fill="none" stroke-linecap="round"/>
    <circle cx="150" cy="66" r="24" fill="#a9b7b2"/><circle cx="150" cy="66" r="15" fill="#eef2f0"/>
    <path d="M146 62 q6 -6 12 0 M146 71 q8 -5 14 1" stroke="#c9d3cf" stroke-width="2" fill="none" stroke-linecap="round"/>
    <ellipse cx="100" cy="82" rx="46" ry="40" fill="#a9b7b2"/>
    <ellipse cx="100" cy="96" rx="30" ry="22" fill="#c4cfcb"/>
    <circle cx="72" cy="94" r="7" fill="#ff7a90" opacity="0.45"/><circle cx="128" cy="94" r="7" fill="#ff7a90" opacity="0.45"/>
    <circle cx="82" cy="76" r="5.2" fill="#1f2a27"/><circle cx="118" cy="76" r="5.2" fill="#1f2a27"/>
    <circle cx="84" cy="74" r="1.7" fill="#fff"/><circle cx="120" cy="74" r="1.7" fill="#fff"/>
    <ellipse cx="100" cy="92" rx="15" ry="18" fill="#1f2a27"/><ellipse cx="95" cy="85" rx="4.5" ry="2.6" fill="#fff" opacity="0.35"/>
    <path d="M90 116 Q100 123 110 116" stroke="#1f2a27" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;

  const SLOT_OF = {
    blueCap: "headwear", gradHat: "headwear", crown: "headwear",
    roundGlasses: "face", sunglasses: "face",
    redScarf: "clothing", heroCape: "clothing",
    headphones: "accessory", backpack: "accessory",
  };

  function layer(equipped, order, side) {
    return order.map((slot) => {
      const id = equipped && equipped[slot];
      const art = id && ART[id];
      return art && art[side] && SLOT_OF[id] === slot ? `<g data-item="${id}" data-layer="${side}">${art[side]}</g>` : "";
    }).join("");
  }

  // equipped: { slot: itemId }. opts: { view: "full" | "head", label }.
  function avatar(equipped, opts) {
    const o = opts || {};
    const eq = equipped || {};
    const viewBox = o.view === "head" ? HEAD_VIEW : FULL_VIEW;
    const label = o.label ? ` role="img" aria-label="${String(o.label).replace(/"/g, "&quot;")}"` : ` aria-hidden="true"`;
    return `<svg class="koala-avatar-svg" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg"${label} focusable="false">` +
      layer(eq, BACK_ORDER, "back") + BASE + layer(eq, FRONT_ORDER, "front") + `</svg>`;
  }


  /* ---------- Study Room (Phase 4) ----------
     A fixed 320x220 scene: wall above y=150, floor below. Each room item has
     a home position, so any combination looks right. The koala stands in the
     middle (x 106-214) wearing whatever it has equipped. */
  const ROOM_VIEW = "0 0 320 220";
  const ROOM_ART = {
    creamWall: { layer: "wall", view: ROOM_VIEW, svg: `<rect width="320" height="150" fill="#fbf1dc"/><g fill="#f3e2bd"><circle cx="40" cy="30" r="3"/><circle cx="120" cy="60" r="3"/><circle cx="200" cy="20" r="3"/><circle cx="280" cy="80" r="3"/><circle cx="70" cy="110" r="3"/><circle cx="230" cy="120" r="3"/></g>` },
    mintWall: { layer: "wall", view: ROOM_VIEW, svg: `<rect width="320" height="150" fill="#d6f2e6"/><g fill="#c3ead9"><rect x="20" width="22" height="150"/><rect x="80" width="22" height="150"/><rect x="140" width="22" height="150"/><rect x="200" width="22" height="150"/><rect x="260" width="22" height="150"/></g>` },
    nightWall: { layer: "wall", view: ROOM_VIEW, svg: `<rect width="320" height="150" fill="#26335f"/><g fill="#fff"><circle cx="30" cy="24" r="2"/><circle cx="95" cy="52" r="1.6"/><circle cx="150" cy="16" r="2.2"/><circle cx="215" cy="46" r="1.8"/><circle cx="290" cy="22" r="2"/><circle cx="60" cy="100" r="1.6"/><circle cx="250" cy="104" r="2"/><circle cx="180" cy="90" r="1.5"/></g><path d="M262 40 a16 16 0 1 0 14 22 a12 12 0 1 1 -14 -22z" fill="#ffd166"/>` },
    blueRug: { layer: "rug", view: "40 130 240 90", svg: `<ellipse cx="160" cy="192" rx="98" ry="20" fill="#5b8def"/><ellipse cx="160" cy="192" rx="80" ry="14" fill="none" stroke="#9db8f7" stroke-width="3"/>` },
    starRug: { layer: "rug", view: "40 130 240 90", svg: `<ellipse cx="160" cy="192" rx="98" ry="20" fill="#f6c343"/><ellipse cx="160" cy="192" rx="82" ry="14.5" fill="#f59e0b"/><polygon points="160,184 163,190 170,191 165,195 166,201 160,198 154,201 155,195 150,191 157,190" fill="#fff3c4"/>` },
    mapPoster: { layer: "poster", view: "16 8 100 90", svg: `<rect x="30" y="22" width="64" height="48" rx="3" fill="#fff" stroke="#b9824f" stroke-width="4"/><rect x="34" y="26" width="56" height="40" fill="#8ec9f5"/><path d="M42 36 q8 -6 14 2 q-2 8 -8 8 q-6 -1 -6 -10z M62 44 q8 -4 12 4 q-3 9 -10 6z M70 32 q6 -2 8 4 q-4 4 -8 -4z" fill="#5fb878"/>` },
    rocketPoster: { layer: "poster", view: "16 8 100 90", svg: `<rect x="30" y="22" width="64" height="48" rx="3" fill="#1f2a55" stroke="#b9824f" stroke-width="4"/><g fill="#fff"><circle cx="40" cy="30" r="1.2"/><circle cx="82" cy="34" r="1.4"/><circle cx="48" cy="60" r="1.2"/></g><path d="M62 28 q10 10 4 28 h-8 q-6 -18 4 -28z" fill="#e8ecf4"/><circle cx="62" cy="40" r="3" fill="#3b82f6"/><path d="M58 56 l-6 6 l8 -2z M66 56 l6 6 l-8 -2z" fill="#ef4444"/><path d="M60 58 q2 8 4 0z" fill="#ffb347"/>` },
    studyDesk: { layer: "desk", view: "0 100 130 90", svg: `<rect x="8" y="118" width="98" height="10" rx="3" fill="#b9824f"/><rect x="14" y="128" width="8" height="42" fill="#9a6a3d"/><rect x="92" y="128" width="8" height="42" fill="#9a6a3d"/><rect x="26" y="128" width="62" height="20" rx="2" fill="#c99562"/><circle cx="57" cy="138" r="2.4" fill="#f3d9a8"/><rect x="22" y="102" width="30" height="16" rx="2" fill="#fff" stroke="#c9d3cf"/><path d="M26 107h22M26 111h16" stroke="#8d9c97" stroke-width="1.6"/><rect x="62" y="108" width="12" height="10" rx="2" fill="#ef4444"/>` },
    deskLamp: { layer: "lamp", view: "110 0 100 80", svg: `<path d="M160 0 V36" stroke="#6b7a75" stroke-width="2.4"/><path d="M142 58 q18 -28 36 0z" fill="#ffd166" stroke="#e0a21a" stroke-width="2.4"/><path d="M148 62 q12 18 24 0" fill="#fff3c4" opacity=".7"/>` },
    bookshelf: { layer: "shelf", view: "216 20 100 140", svg: `<rect x="228" y="30" width="72" height="122" rx="3" fill="#a9703f"/><rect x="234" y="36" width="60" height="32" fill="#8a5a31"/><rect x="234" y="72" width="60" height="32" fill="#8a5a31"/><rect x="234" y="108" width="60" height="38" fill="#8a5a31"/><g><rect x="238" y="42" width="8" height="26" fill="#ef4444"/><rect x="247" y="46" width="8" height="22" fill="#3b82f6"/><rect x="256" y="40" width="9" height="28" fill="#3fb984"/><rect x="266" y="48" width="8" height="20" fill="#f59e0b"/><rect x="238" y="80" width="10" height="24" fill="#8b5cf6"/><rect x="249" y="76" width="8" height="28" fill="#ef4444"/><rect x="262" y="90" width="26" height="14" fill="#fff"/><rect x="240" y="116" width="8" height="30" fill="#3b82f6"/><rect x="249" y="120" width="9" height="26" fill="#f59e0b"/></g>` },
    pottedPlant: { layer: "plant", view: "236 110 80 110", svg: `<path d="M270 172 q-18 -22 -4 -42 q8 18 4 42z M270 172 q2 -30 18 -40 q4 22 -18 40z M270 172 q-6 -14 -22 -14 q8 -8 22 14z" fill="#4fae6a"/><path d="M256 172 h28 l-4 28 h-20z" fill="#d97a4a"/><rect x="254" y="168" width="32" height="7" rx="2" fill="#c4683a"/>` },
  };
  // Draw order inside the room: back to front.
  const ROOM_ORDER = ["wall", "poster", "shelf", "lamp", "rug", "desk"];
  const ROOM_SLOT_LAYER = { wallpaper: "wall", rug: "rug", poster: "poster", desk: "desk", lamp: "lamp", shelf: "shelf", plant: "plant" };
  const ROOM_BASE_FLOOR = `<rect y="150" width="320" height="70" fill="#dcbd8c"/><path d="M0 172H320M0 194H320" stroke="#cda973" stroke-width="2"/><rect y="146" width="320" height="6" fill="#c9a36b"/>`;

  function roomItem(id) { return ROOM_ART[id] ? ROOM_ART[id].svg : ""; }

  // The whole scene. roomEq: { slot: itemId } for the room; koalaEq: what the
  // koala wears. Without a wallpaper the Cream Wall shows.
  function room(roomEq, koalaEq, opts) {
    const o = opts || {};
    const eq = roomEq || {};
    const byLayer = {};
    Object.keys(eq).forEach((slot) => {
      const id = eq[slot];
      if (ROOM_ART[id] && ROOM_SLOT_LAYER[slot] === ROOM_ART[id].layer) byLayer[ROOM_ART[id].layer] = id;
    });
    if (!byLayer.wall) byLayer.wall = "creamWall";
    const parts = [`<g data-item="${byLayer.wall}">${roomItem(byLayer.wall)}</g>`, ROOM_BASE_FLOOR];
    ROOM_ORDER.slice(1).forEach((l) => { if (byLayer[l]) parts.push(`<g data-item="${byLayer[l]}">${roomItem(byLayer[l])}</g>`); });
    const koala = avatar(koalaEq, { view: "full" }).replace('class="koala-avatar-svg" ', "").replace("<svg ", '<svg x="106" y="84" width="108" height="111" ');
    parts.push(koala);
    if (byLayer.plant) parts.push(`<g data-item="${byLayer.plant}">${roomItem(byLayer.plant)}</g>`);
    const label = o.label ? ` role="img" aria-label="${String(o.label).replace(/"/g, "&quot;")}"` : ` aria-hidden="true"`;
    return `<svg class="koala-room-svg" viewBox="${ROOM_VIEW}" xmlns="http://www.w3.org/2000/svg"${label} focusable="false">${parts.join("")}</svg>`;
  }

  // A card picture for one room item: an empty cream room cropped to the item.
  function roomItemPicture(id) {
    const art = ROOM_ART[id];
    if (!art) return "";
    const wall = art.layer === "wall" ? art.svg : ROOM_ART.creamWall.svg;
    const item = art.layer === "wall" ? "" : art.svg;
    return `<svg class="koala-room-svg" viewBox="${art.view}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${wall}${ROOM_BASE_FLOOR}${item}</svg>`;
  }

  // A card picture for one item: the koala wearing just that item, cropped.
  function itemPicture(id) {
    if (ROOM_ART[id]) return roomItemPicture(id);
    const art = ART[id];
    if (!art) return "";
    return avatar({ [SLOT_OF[id]]: id }, { view: art.view });
  }

  return { avatar, room, itemPicture, hasArt: (id) => !!ART[id] || !!ROOM_ART[id] };
});
