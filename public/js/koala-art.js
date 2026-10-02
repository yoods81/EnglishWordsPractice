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

  // A card picture for one item: the koala wearing just that item, cropped.
  function itemPicture(id) {
    const art = ART[id];
    if (!art) return "";
    return avatar({ [SLOT_OF[id]]: id }, { view: art.view });
  }

  return { avatar, itemPicture, hasArt: (id) => !!ART[id] };
});
