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
  const HEAD_VIEW = "26 2 148 134";

  // A five-point star polygon centred on (cx, cy).
  function starPts(cx, cy, R, r) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rad = i % 2 ? r : R;
      pts.push((cx + rad * Math.cos(a)).toFixed(1) + "," + (cy + rad * Math.sin(a)).toFixed(1));
    }
    return pts.join(" ");
  }

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
    partyHat: {
      view: "head",
      front: `<polygon points="100,6 74,58 126,58" fill="#a78bfa"/><path d="M90 30 L110 30 M82 44 L118 44" stroke="#fde047" stroke-width="4" stroke-linecap="round"/><circle cx="100" cy="7" r="6.5" fill="#f472b6"/><circle cx="94" cy="50" r="2.4" fill="#f472b6"/><circle cx="108" cy="52" r="2.4" fill="#fde047"/>`,
    },
    flowerCrown: {
      view: "head",
      front: `<path d="M58 56 Q100 40 142 56" stroke="#4fae6a" stroke-width="5" fill="none" stroke-linecap="round"/>
        <g><circle cx="66" cy="54" r="6" fill="#f472b6"/><circle cx="66" cy="54" r="2.2" fill="#fde047"/><circle cx="84" cy="47" r="6.4" fill="#fde047"/><circle cx="84" cy="47" r="2.2" fill="#f59e0b"/><circle cx="100" cy="44" r="7" fill="#fff"/><circle cx="100" cy="44" r="2.4" fill="#f472b6"/><circle cx="116" cy="47" r="6.4" fill="#a78bfa"/><circle cx="116" cy="47" r="2.2" fill="#fde047"/><circle cx="134" cy="54" r="6" fill="#fb923c"/><circle cx="134" cy="54" r="2.2" fill="#fde047"/></g>`,
    },
    wizardHat: {
      view: "head",
      front: `<path d="M62 56 Q100 66 138 56 L114 10 Q104 2 92 14 Z" fill="#4c3a9e"/><ellipse cx="100" cy="56" rx="52" ry="9" fill="#3b2b80"/><path d="M72 50 Q100 58 128 50" stroke="#fde047" stroke-width="4" fill="none"/><polygon points="${starPts(101, 34, 7.5, 3.2)}" fill="#fde047"/>`,
    },
    starGlasses: {
      view: "head",
      front: `<g fill="rgba(253,224,71,.55)" stroke="#26332f" stroke-width="3" stroke-linejoin="round"><polygon points="${starPts(82, 76, 17, 8)}"/><polygon points="${starPts(118, 76, 17, 8)}"/></g><path d="M97 74 Q100 70 103 74" stroke="#26332f" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M66 72 L54 68 M134 72 L146 68" stroke="#26332f" stroke-width="3" stroke-linecap="round"/>`,
    },
    bowTie: {
      view: "full",
      front: `<path d="M100 126 L76 112 L76 140 Z" fill="#ef4444"/><path d="M100 126 L124 112 L124 140 Z" fill="#ef4444"/><path d="M82 120 L82 132 M118 120 L118 132" stroke="#fca5a5" stroke-width="2" stroke-linecap="round"/><rect x="93" y="118" width="14" height="16" rx="5" fill="#b91c1c"/>`,
    },
    goldMedal: {
      view: "full",
      front: `<path d="M82 116 L100 152 L118 116" fill="none" stroke="#3b82f6" stroke-width="8" stroke-linejoin="round"/><circle cx="100" cy="158" r="13" fill="#ffd166" stroke="#e0a21a" stroke-width="3"/><polygon points="${starPts(100, 158, 7, 3)}" fill="#e0a21a"/>`,
    },
    santaHat: {
      view: "head",
      front: `<path d="M62 56 Q66 20 108 20 Q136 22 146 44 Q130 38 118 44 Q90 52 62 56Z" fill="#dc2626"/><rect x="56" y="50" width="90" height="13" rx="6.5" fill="#fff"/><circle cx="148" cy="44" r="9" fill="#fff"/>`,
    },
    surfboard: {
      view: "full",
      back: `<g transform="rotate(16 160 120)"><ellipse cx="164" cy="118" rx="17" ry="74" fill="#38bdf8"/><path d="M164 46 V190" stroke="#fff" stroke-width="3"/><path d="M150 96 q14 8 28 0" stroke="#fde047" stroke-width="5" fill="none"/></g>`,
    },
  };

  /* ---------- Shop expansion: more headwear/face/clothing/accessories + Jewelry + Shoes ---------- */
  function heartPath(cx, cy, s) {
    const f = (n) => +n.toFixed(1);
    return `M${cx} ${f(cy + s * 0.8)} C${f(cx - s * 1.4)} ${f(cy - s * 0.2)} ${f(cx - s * 0.6)} ${f(cy - s * 1.1)} ${cx} ${f(cy - s * 0.35)} C${f(cx + s * 0.6)} ${f(cy - s * 1.1)} ${f(cx + s * 1.4)} ${f(cy - s * 0.2)} ${cx} ${f(cy + s * 0.8)} Z`;
  }
  // Points along the neck curve (66,120) -> (100,152) -> (134,120).
  function neckPt(t) { return [66 + 68 * t, 120 + 64 * t * (1 - t)]; }
  const NECK_D = "M66 120 Q100 152 134 120";
  const pearls = Array.from({ length: 11 }, (_, i) => { const p = neckPt(i / 10); return `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="4.2" fill="#fff" stroke="#cbd5e1" stroke-width="1.2"/>`; }).join("");
  const bracelet = (cx, cy) => ["#ef4444", "#fde047", "#3b82f6", "#3fb984", "#f472b6"].map((c, i) => `<circle cx="${(cx + (i - 2) * 3.2 * 0.84).toFixed(1)}" cy="${(cy + (i - 2) * 3.2 * 0.54).toFixed(1)}" r="3" fill="${c}" stroke="#fff" stroke-width=".8"/>`).join("");
  const pair = (s) => `${s}<g transform="translate(56 0)">${s}</g>`;
  const shirtBody = "M58 128 Q100 140 142 128 Q150 160 132 182 Q100 192 68 182 Q50 160 58 128Z";
  const sleeves = (c) => `<line x1="64" y1="126" x2="51" y2="146" stroke="${c}" stroke-width="16" stroke-linecap="round"/><line x1="136" y1="126" x2="149" y2="146" stroke="${c}" stroke-width="16" stroke-linecap="round"/>`;

  Object.assign(ART, {
    beanie: { view: "head", front: `<path d="M58 60 C56 30 80 22 100 22 C120 22 144 30 142 60 Z" fill="#e11d48"/><path d="M72 58 V30 M86 56 V25 M100 56 V22 M114 56 V25 M128 58 V30" stroke="#be123c" stroke-width="2.4" opacity=".6"/><rect x="55" y="50" width="90" height="15" rx="7.5" fill="#be123c"/><circle cx="100" cy="19" r="8.5" fill="#fff"/>` },
    cowboyHat: { view: "head", front: `<path d="M70 56 C66 30 76 22 100 27 C124 22 134 30 130 56 Z" fill="#b45309"/><rect x="69" y="44" width="62" height="8" fill="#7c2d12"/><path d="M36 58 Q46 50 70 52 L130 52 Q154 50 164 58 Q156 68 140 62 L60 62 Q44 68 36 58Z" fill="#a16207"/>` },
    chefHat: { view: "head", front: `<g fill="#fff" stroke="#d1d5db" stroke-width="2"><circle cx="76" cy="34" r="15"/><circle cx="124" cy="34" r="15"/><circle cx="100" cy="26" r="18"/></g><rect x="74" y="42" width="52" height="18" rx="3" fill="#fff" stroke="#d1d5db" stroke-width="2"/><path d="M84 46 V58 M100 46 V58 M116 46 V58" stroke="#e5e7eb" stroke-width="2"/>` },
    bunnyEars: { view: "head", front: `<path d="M64 54 Q100 44 136 54" stroke="#f472b6" stroke-width="6" fill="none" stroke-linecap="round"/><g transform="rotate(-12 82 52)"><ellipse cx="82" cy="28" rx="10" ry="25" fill="#fff" stroke="#e5e7eb" stroke-width="2"/><ellipse cx="82" cy="30" rx="4.6" ry="17" fill="#fbcfe8"/></g><g transform="rotate(12 118 52)"><ellipse cx="118" cy="28" rx="10" ry="25" fill="#fff" stroke="#e5e7eb" stroke-width="2"/><ellipse cx="118" cy="30" rx="4.6" ry="17" fill="#fbcfe8"/></g>` },
    heartGlasses: { view: "head", front: `<g fill="rgba(244,114,182,.5)" stroke="#be185d" stroke-width="3" stroke-linejoin="round"><path d="${heartPath(82, 76, 15)}"/><path d="${heartPath(118, 76, 15)}"/></g><path d="M97 74 Q100 70 103 74" stroke="#be185d" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M64 72 L54 68 M136 72 L146 68" stroke="#be185d" stroke-width="3" stroke-linecap="round"/>` },
    catEyeGlasses: { view: "head", front: `<g fill="rgba(167,139,250,.35)" stroke="#6d28d9" stroke-width="3" stroke-linejoin="round"><path d="M62 70 L60 60 L96 68 Q99 90 80 90 Q63 90 62 70Z"/><path d="M138 70 L140 60 L104 68 Q101 90 120 90 Q137 90 138 70Z"/></g><path d="M97 72 Q100 68 103 72" stroke="#6d28d9" stroke-width="3" fill="none"/><path d="M60 66 L52 64 M140 66 L148 64" stroke="#6d28d9" stroke-width="3" stroke-linecap="round"/>` },
    goggles: { view: "head", front: `<rect x="46" y="66" width="108" height="20" rx="8" fill="#1e3a8a" opacity=".85"/><g fill="rgba(147,197,253,.6)" stroke="#1d4ed8" stroke-width="5"><circle cx="82" cy="76" r="14"/><circle cx="118" cy="76" r="14"/></g><path d="M74 70 Q80 66 86 70 M110 70 Q116 66 122 70" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".8"/>` },
    eyePatch: { view: "head", front: `<path d="M52 56 L112 82 M118 76 L148 62" stroke="#111827" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="118" cy="76" rx="14" ry="12" fill="#111827"/><path d="M110 72 Q116 68 122 72" stroke="#4b5563" stroke-width="2.4" fill="none" stroke-linecap="round"/>` },
    moustache: { view: "head", front: `<path d="M68 114 Q70 100 86 104 Q96 106 100 110 Q104 106 114 104 Q130 100 132 114 Q118 110 100 116 Q82 110 68 114Z" fill="#5b3a29" stroke="#3f2a1c" stroke-width="1.6" stroke-linejoin="round"/>` },
    freckles: { view: "head", front: `<g fill="#b45309" opacity=".85"><circle cx="64" cy="100" r="2.2"/><circle cx="71" cy="104" r="2.2"/><circle cx="78" cy="99" r="2.2"/><circle cx="68" cy="94" r="1.8"/><circle cx="136" cy="100" r="2.2"/><circle cx="129" cy="104" r="2.2"/><circle cx="122" cy="99" r="2.2"/><circle cx="132" cy="94" r="1.8"/></g>` },
    monocle: { view: "head", front: `<circle cx="118" cy="76" r="14" fill="rgba(255,255,255,.3)" stroke="#d4a017" stroke-width="3.4"/><path d="M128 87 Q142 106 134 136" stroke="#d4a017" stroke-width="2" fill="none" stroke-dasharray="3 2.4"/><path d="M110 70 Q116 66 122 70" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".8"/>` },

    tshirt: { view: "full", front: `<path d="${shirtBody}" fill="#38bdf8"/>${sleeves("#38bdf8")}<path d="M84 128 Q100 142 116 128" stroke="#0ea5e9" stroke-width="5" fill="none" stroke-linecap="round"/><polygon points="${starPts(100, 158, 12, 5.2)}" fill="#fff"/>` },
    hoodie: { view: "full", front: `<path d="${shirtBody}" fill="#8b5cf6"/>${sleeves("#8b5cf6")}<path d="M66 124 Q100 148 134 124" stroke="#7c3aed" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M92 136 V150 M108 136 V150" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><path d="M78 162 H122 L118 178 H82 Z" fill="#7c3aed"/>` },
    stripeShirt: { view: "full", front: `<defs><clipPath id="kaStripe"><path d="${shirtBody}"/></clipPath></defs><path d="${shirtBody}" fill="#fff"/><g clip-path="url(#kaStripe)" fill="#ef4444"><rect x="40" y="136" width="120" height="7"/><rect x="40" y="150" width="120" height="7"/><rect x="40" y="164" width="120" height="7"/><rect x="40" y="178" width="120" height="7"/></g>${sleeves("#fff")}<g stroke="#ef4444" stroke-width="3"><path d="M56 138 L46 152 M144 138 L154 152" stroke-linecap="round"/></g><path d="M84 128 Q100 140 116 128" stroke="#ef4444" stroke-width="4" fill="none" stroke-linecap="round"/>` },
    pinkDress: { view: "full", front: `<path d="M64 126 Q100 138 136 126 L152 184 Q100 198 48 184 Z" fill="#f9a8d4"/><path d="M64 126 Q100 138 136 126 L134 146 Q100 154 66 146Z" fill="#f472b6"/><path d="M60 126 q-6 -8 6 -10 M140 126 q6 -8 -6 -10" stroke="#f472b6" stroke-width="7" fill="none" stroke-linecap="round"/><rect x="66" y="144" width="68" height="7" rx="3" fill="#ec4899"/><path d="M78 166 q4 6 8 0 M104 172 q4 6 8 0 M126 164 q4 6 8 0" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round"/>` },
    labCoat: { view: "full", front: `<path d="${shirtBody}" fill="#fff" stroke="#cbd5e1" stroke-width="2"/>${sleeves("#fff")}<path d="M78 128 L100 170 L122 128" stroke="#cbd5e1" stroke-width="3" fill="none" stroke-linejoin="round"/><path d="M80 128 L90 146 L100 134 L110 146 L120 128 Z" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="2"/><circle cx="100" cy="152" r="2.6" fill="#94a3b8"/><circle cx="100" cy="164" r="2.6" fill="#94a3b8"/><rect x="112" y="156" width="16" height="14" rx="2" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1.6"/><path d="M118 152 v10" stroke="#3b82f6" stroke-width="2.6" stroke-linecap="round"/>` },
    overalls: { view: "full", front: `<path d="${shirtBody}" fill="#fde047"/>${sleeves("#fde047")}<path d="M62 150 Q100 160 138 150 Q144 168 132 182 Q100 192 68 182 Q56 168 62 150Z" fill="#3b82f6"/><rect x="80" y="134" width="40" height="26" rx="5" fill="#3b82f6"/><path d="M82 136 L74 122 M118 136 L126 122" stroke="#2563eb" stroke-width="5" stroke-linecap="round"/><circle cx="84" cy="140" r="2.4" fill="#fde047"/><circle cx="116" cy="140" r="2.4" fill="#fde047"/><rect x="90" y="146" width="20" height="10" rx="2" fill="#2563eb"/>` },
    jersey: { view: "full", front: `<path d="${shirtBody}" fill="#ef4444"/>${sleeves("#ef4444")}<path d="M84 128 Q100 142 116 128" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M92 146 H108 L98 170" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M58 142 L48 156 M142 142 L152 156" stroke="#fff" stroke-width="3" stroke-linecap="round"/>` },

    balloon: { view: "full", front: `<path d="M155 154 Q170 120 168 74" stroke="#6b7a75" stroke-width="1.8" fill="none"/><ellipse cx="168" cy="54" rx="17" ry="21" fill="#ef4444"/><path d="M168 75 l-4 6 h8z" fill="#dc2626"/><ellipse cx="161" cy="46" rx="4" ry="7" fill="#fff" opacity=".45" transform="rotate(20 161 46)"/>` },
    magicWand: { view: "full", front: `<line x1="155" y1="154" x2="180" y2="96" stroke="#6d28d9" stroke-width="5" stroke-linecap="round"/><line x1="170" y1="118" x2="176" y2="104" stroke="#fde047" stroke-width="5" stroke-linecap="round"/><polygon points="${starPts(184, 88, 11, 4.8)}" fill="#fde047" stroke="#e0a21a" stroke-width="1.6" stroke-linejoin="round"/><circle cx="168" cy="82" r="2" fill="#fde047"/><circle cx="194" cy="100" r="1.8" fill="#fde047"/>` },
    umbrella: { view: "full", front: `<path d="M160 164 q-2 10 -10 8" stroke="#374151" stroke-width="3.4" fill="none" stroke-linecap="round"/><line x1="160" y1="164" x2="182" y2="68" stroke="#374151" stroke-width="3.4" stroke-linecap="round"/><path d="M183 58 Q196 90 172 132 Q170 98 174 70Z" fill="#ef4444"/><path d="M180 70 Q186 100 174 128" stroke="#fca5a5" stroke-width="2" fill="none"/><rect x="170" y="108" width="12" height="4" rx="2" fill="#374151" transform="rotate(-14 176 110)"/>` },
    guitar: { view: "full", front: `<g transform="rotate(-28 148 160)"><rect x="145" y="92" width="6" height="58" fill="#7c4a1d"/><rect x="143" y="84" width="10" height="13" rx="2" fill="#3f2a14"/><ellipse cx="148" cy="178" rx="21" ry="16" fill="#d97706"/><ellipse cx="148" cy="156" rx="14" ry="11" fill="#d97706"/><circle cx="148" cy="170" r="5.6" fill="#3f2a14"/><path d="M148 100 V182" stroke="#fde68a" stroke-width="1" opacity=".8"/></g>` },
    storyBook: { view: "full", front: `<rect x="74" y="146" width="52" height="36" rx="3" fill="#3b82f6"/><rect x="74" y="146" width="7" height="36" rx="2" fill="#2563eb"/><rect x="82" y="178" width="42" height="3" fill="#fff"/><polygon points="${starPts(104, 162, 9, 4)}" fill="#fde047"/><path d="M86 154 H96 M86 158 H92" stroke="#bfdbfe" stroke-width="2" stroke-linecap="round"/>` },
    camera: { view: "full", front: `<rect x="120" y="142" width="44" height="30" rx="6" fill="#374151"/><rect x="128" y="136" width="14" height="8" rx="2" fill="#4b5563"/><circle cx="142" cy="157" r="10" fill="#1f2937" stroke="#9ca3af" stroke-width="2.4"/><circle cx="142" cy="157" r="5" fill="#60a5fa"/><rect x="152" y="146" width="8" height="5" rx="1.5" fill="#fde047"/>` },
    soccerBall: { view: "full", front: `<circle cx="168" cy="176" r="17" fill="#fff" stroke="#1f2937" stroke-width="2.4"/><polygon points="${starPts(168, 176, 6.4, 6.4).split(" ").filter((_, i) => i % 2 === 0).join(" ")}" fill="#1f2937"/><path d="M168 170 V160 M162 175 L153 172 M174 175 L183 172 M164 182 L158 190 M172 182 L178 190" stroke="#1f2937" stroke-width="2" stroke-linecap="round"/>` },

    pearlNecklace: { view: "full", front: pearls },
    goldChain: { view: "full", front: `<path d="${NECK_D}" stroke="#f5b83d" stroke-width="4" fill="none" stroke-dasharray="5 2.4" stroke-linecap="round"/><path d="${NECK_D}" stroke="#fde68a" stroke-width="1.4" fill="none" opacity=".8"/>` },
    heartPendant: { view: "full", front: `<path d="${NECK_D}" stroke="#d4a017" stroke-width="2.4" fill="none"/><path d="${heartPath(100, 146, 10)}" fill="#ef4444" stroke="#b91c1c" stroke-width="1.8" stroke-linejoin="round"/><ellipse cx="95" cy="141" rx="2.4" ry="1.6" fill="#fff" opacity=".7"/>` },
    starPendant: { view: "full", front: `<path d="${NECK_D}" stroke="#d4a017" stroke-width="2.4" fill="none"/><polygon points="${starPts(100, 148, 12, 5.2)}" fill="#fde047" stroke="#e0a21a" stroke-width="1.8" stroke-linejoin="round"/>` },
    diamondPendant: { view: "full", front: `<path d="${NECK_D}" stroke="#94a3b8" stroke-width="2.4" fill="none"/><polygon points="100,138 110,149 100,164 90,149" fill="#7dd3fc" stroke="#0ea5e9" stroke-width="1.8" stroke-linejoin="round"/><path d="M90 149 H110 M100 138 L96 149 L100 164 L104 149 Z" stroke="#e0f2fe" stroke-width="1.2" fill="none"/>` },
    goldEarrings: { view: "head", front: `<g stroke="#d4a017" stroke-width="2"><path d="M40 84 V96"/><path d="M160 84 V96"/></g><g fill="#fcd34d" stroke="#d4a017" stroke-width="1.6"><circle cx="40" cy="84" r="4"/><circle cx="160" cy="84" r="4"/><circle cx="40" cy="101" r="5.4"/><circle cx="160" cy="101" r="5.4"/></g>` },
    hoopEarrings: { view: "head", front: `<g fill="none" stroke="#f5b83d" stroke-width="3.4"><circle cx="38" cy="98" r="10"/><circle cx="162" cy="98" r="10"/></g><g fill="#fcd34d"><circle cx="40" cy="86" r="3"/><circle cx="160" cy="86" r="3"/></g>` },
    friendshipBracelet: { view: "full", front: bracelet(50, 146) + bracelet(150, 146) },
    rubyBrooch: { view: "full", front: `<g fill="#f5b83d" stroke="#e0a21a" stroke-width="1.4"><circle cx="78" cy="136" r="4"/><circle cx="86" cy="140" r="4"/><circle cx="86" cy="150" r="4"/><circle cx="78" cy="154" r="4"/><circle cx="70" cy="150" r="4"/><circle cx="70" cy="140" r="4"/></g><circle cx="78" cy="145" r="7" fill="#dc2626" stroke="#fde68a" stroke-width="2"/><ellipse cx="75.6" cy="142.4" rx="2" ry="1.4" fill="#fff" opacity=".7"/>` },
    hairClip: { view: "head", front: `<g transform="translate(128 52) rotate(18)"><path d="M0 0 L-14 -9 L-14 9 Z" fill="#f472b6"/><path d="M0 0 L14 -9 L14 9 Z" fill="#f472b6"/><circle r="4.6" fill="#ec4899"/><circle cx="-8" cy="0" r="1.6" fill="#fff"/><circle cx="8" cy="0" r="1.6" fill="#fff"/></g>` },

    sneakers: { view: "full", front: pair(`<path d="M52 184 Q52 170 72 170 Q93 170 93 184 Q93 192 72 192 Q52 192 52 184Z" fill="#fff" stroke="#cbd5e1" stroke-width="2"/><path d="M54 188 Q72 196 92 188" stroke="#ef4444" stroke-width="3.4" fill="none" stroke-linecap="round"/><path d="M64 174 H80 M65 179 H79" stroke="#94a3b8" stroke-width="2" stroke-linecap="round"/><path d="M56 180 Q72 176 90 180" stroke="#ef4444" stroke-width="2.4" fill="none"/>`) },
    boots: { view: "full", front: pair(`<path d="M55 166 H89 V184 Q89 192 74 192 H58 Q52 192 52 186 V170 Q52 166 55 166Z" fill="#92400e"/><rect x="53" y="162" width="38" height="7" rx="3" fill="#78350f"/><path d="M52 190 H92" stroke="#451a03" stroke-width="4" stroke-linecap="round"/><path d="M60 174 H82 M60 180 H82" stroke="#b45309" stroke-width="1.6"/>`) },
    rainBoots: { view: "full", front: pair(`<path d="M56 164 H88 V184 Q90 192 74 192 H58 Q52 192 52 186 V168 Q52 164 56 164Z" fill="#facc15"/><rect x="54" y="162" width="36" height="6" rx="3" fill="#eab308"/><path d="M52 190 H92" stroke="#dc2626" stroke-width="4" stroke-linecap="round"/><g fill="#fff" opacity=".85"><circle cx="64" cy="174" r="2.4"/><circle cx="78" cy="176" r="2.4"/><circle cx="68" cy="183" r="2.4"/></g>`) },
    flipFlops: { view: "full", front: pair(`<ellipse cx="72" cy="186" rx="21" ry="8" fill="#fb923c" stroke="#ea580c" stroke-width="1.8"/><path d="M72 178 L60 186 M72 178 L84 186" stroke="#f43f5e" stroke-width="3.4" stroke-linecap="round"/><circle cx="72" cy="178" r="2.6" fill="#f43f5e"/>`) },
    slippers: { view: "full", front: pair(`<ellipse cx="72" cy="185" rx="21" ry="10" fill="#f9a8d4"/><g fill="#fbcfe8"><circle cx="58" cy="179" r="5"/><circle cx="66" cy="175" r="5"/><circle cx="75" cy="174" r="5"/><circle cx="84" cy="177" r="5"/></g><ellipse cx="72" cy="190" rx="20" ry="3" fill="#ec4899" opacity=".5"/>`) },
    balletShoes: { view: "full", front: pair(`<path d="M52 185 Q52 172 72 172 Q92 172 92 185 Q92 192 72 192 Q52 192 52 185Z" fill="#fbcfe8" stroke="#f9a8d4" stroke-width="2"/><path d="M62 174 L82 166 M82 174 L62 166" stroke="#f472b6" stroke-width="2.6" stroke-linecap="round"/><path d="M80 166 q6 -2 6 4 M64 166 q-6 -2 -6 4" stroke="#f472b6" stroke-width="2" fill="none"/>`) },
    soccerBoots: { view: "full", front: pair(`<path d="M52 184 Q52 170 72 170 Q93 170 93 184 Q93 191 72 191 Q52 191 52 184Z" fill="#1f2937"/><path d="M58 178 L86 182 M58 183 L84 187" stroke="#84cc16" stroke-width="3" stroke-linecap="round"/><g fill="#9ca3af"><rect x="55" y="190" width="5" height="5" rx="1"/><rect x="66" y="191" width="5" height="5" rx="1"/><rect x="77" y="191" width="5" height="5" rx="1"/><rect x="86" y="189" width="5" height="5" rx="1"/></g>`) },
    rollerSkates: { view: "full", front: pair(`<path d="M52 184 Q52 168 72 168 Q93 168 93 184 L93 189 H52Z" fill="#f9a8d4" stroke="#ec4899" stroke-width="2"/><rect x="52" y="188" width="41" height="4" rx="1.5" fill="#6b7280"/><g fill="#38bdf8" stroke="#0284c7" stroke-width="1.4"><circle cx="58" cy="196" r="4.4"/><circle cx="68" cy="196" r="4.4"/><circle cx="78" cy="196" r="4.4"/><circle cx="88" cy="196" r="4.4"/></g><path d="M62 174 H82 M63 179 H81" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`) },
    sparkleShoes: { view: "full", front: pair(`<path d="M52 184 Q52 170 72 170 Q93 170 93 184 Q93 192 72 192 Q52 192 52 184Z" fill="#a78bfa" stroke="#7c3aed" stroke-width="2"/><path d="M54 188 Q72 196 92 188" stroke="#fde047" stroke-width="3" fill="none" stroke-linecap="round"/><polygon points="${starPts(64, 180, 5, 2.2)}" fill="#fff"/><polygon points="${starPts(80, 177, 4, 1.8)}" fill="#fde047"/><polygon points="${starPts(82, 186, 3.2, 1.4)}" fill="#fff"/>`) },
    snowBoots: { view: "full", front: pair(`<path d="M55 168 H89 V184 Q90 192 74 192 H58 Q52 192 52 186 V172 Q52 168 55 168Z" fill="#3b82f6"/><g fill="#fff"><circle cx="56" cy="166" r="5"/><circle cx="64" cy="164" r="5"/><circle cx="72" cy="163" r="5"/><circle cx="80" cy="164" r="5"/><circle cx="88" cy="166" r="5"/></g><path d="M52 190 H92" stroke="#e5e7eb" stroke-width="4" stroke-linecap="round"/><path d="M60 176 H84 M60 182 H84" stroke="#93c5fd" stroke-width="1.8"/>`) },
  });

  // Front layers are drawn in this slot order, so e.g. headwear always sits
  // on top of headphones, and glasses on top of the face.
  const FRONT_ORDER = ["clothing", "shoes", "jewelry", "accessory", "face", "headwear"];
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
    <g class="koala-eyes"><circle cx="82" cy="76" r="5.2" fill="#1f2a27"/><circle cx="118" cy="76" r="5.2" fill="#1f2a27"/>
    <circle cx="84" cy="74" r="1.7" fill="#fff"/><circle cx="120" cy="74" r="1.7" fill="#fff"/></g>
    <ellipse cx="100" cy="92" rx="15" ry="18" fill="#1f2a27"/><ellipse cx="95" cy="85" rx="4.5" ry="2.6" fill="#fff" opacity="0.35"/>
    <path d="M90 116 Q100 123 110 116" stroke="#1f2a27" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;

  const SLOT_OF = {
    blueCap: "headwear", gradHat: "headwear", crown: "headwear",
    roundGlasses: "face", sunglasses: "face",
    redScarf: "clothing", heroCape: "clothing",
    headphones: "accessory", backpack: "accessory",
    partyHat: "headwear", flowerCrown: "headwear", wizardHat: "headwear", santaHat: "headwear",
    starGlasses: "face", bowTie: "clothing", goldMedal: "accessory", surfboard: "accessory",
  };
  ["beanie", "cowboyHat", "chefHat", "bunnyEars"].forEach((i) => { SLOT_OF[i] = "headwear"; });
  ["heartGlasses", "catEyeGlasses", "goggles", "eyePatch", "moustache", "freckles", "monocle"].forEach((i) => { SLOT_OF[i] = "face"; });
  ["tshirt", "hoodie", "stripeShirt", "pinkDress", "labCoat", "overalls", "jersey"].forEach((i) => { SLOT_OF[i] = "clothing"; });
  ["balloon", "magicWand", "umbrella", "guitar", "storyBook", "camera", "soccerBall"].forEach((i) => { SLOT_OF[i] = "accessory"; });
  ["pearlNecklace", "goldChain", "heartPendant", "starPendant", "diamondPendant", "goldEarrings", "hoopEarrings", "friendshipBracelet", "rubyBrooch", "hairClip"].forEach((i) => { SLOT_OF[i] = "jewelry"; });
  ["sneakers", "boots", "rainBoots", "flipFlops", "slippers", "balletShoes", "soccerBoots", "rollerSkates", "sparkleShoes", "snowBoots"].forEach((i) => { SLOT_OF[i] = "shoes"; });

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
    blueRug: { layer: "rug", view: "58 168 204 48", svg: `<ellipse cx="160" cy="192" rx="98" ry="20" fill="#5b8def"/><ellipse cx="160" cy="192" rx="80" ry="14" fill="none" stroke="#9db8f7" stroke-width="3"/>` },
    starRug: { layer: "rug", view: "58 168 204 48", svg: `<ellipse cx="160" cy="192" rx="98" ry="20" fill="#f6c343"/><ellipse cx="160" cy="192" rx="82" ry="14.5" fill="#f59e0b"/><polygon points="160,184 163,190 170,191 165,195 166,201 160,198 154,201 155,195 150,191 157,190" fill="#fff3c4"/>` },
    mapPoster: { layer: "poster", view: "16 8 100 90", svg: `<rect x="30" y="22" width="64" height="48" rx="3" fill="#fff" stroke="#b9824f" stroke-width="4"/><rect x="34" y="26" width="56" height="40" fill="#8ec9f5"/><path d="M42 36 q8 -6 14 2 q-2 8 -8 8 q-6 -1 -6 -10z M62 44 q8 -4 12 4 q-3 9 -10 6z M70 32 q6 -2 8 4 q-4 4 -8 -4z" fill="#5fb878"/>` },
    rocketPoster: { layer: "poster", view: "16 8 100 90", svg: `<rect x="30" y="22" width="64" height="48" rx="3" fill="#1f2a55" stroke="#b9824f" stroke-width="4"/><g fill="#fff"><circle cx="40" cy="30" r="1.2"/><circle cx="82" cy="34" r="1.4"/><circle cx="48" cy="60" r="1.2"/></g><path d="M62 28 q10 10 4 28 h-8 q-6 -18 4 -28z" fill="#e8ecf4"/><circle cx="62" cy="40" r="3" fill="#3b82f6"/><path d="M58 56 l-6 6 l8 -2z M66 56 l6 6 l-8 -2z" fill="#ef4444"/><path d="M60 58 q2 8 4 0z" fill="#ffb347"/>` },
    studyDesk: { layer: "desk", view: "0 100 130 90", svg: `<rect x="8" y="118" width="98" height="10" rx="3" fill="#b9824f"/><rect x="14" y="128" width="8" height="42" fill="#9a6a3d"/><rect x="92" y="128" width="8" height="42" fill="#9a6a3d"/><rect x="26" y="128" width="62" height="20" rx="2" fill="#c99562"/><circle cx="57" cy="138" r="2.4" fill="#f3d9a8"/><rect x="22" y="102" width="30" height="16" rx="2" fill="#fff" stroke="#c9d3cf"/><path d="M26 107h22M26 111h16" stroke="#8d9c97" stroke-width="1.6"/><rect x="62" y="108" width="12" height="10" rx="2" fill="#ef4444"/>` },
    deskLamp: { layer: "lamp", view: "110 0 100 80", svg: `<path d="M160 0 V36" stroke="#6b7a75" stroke-width="2.4"/><path d="M142 58 q18 -28 36 0z" fill="#ffd166" stroke="#e0a21a" stroke-width="2.4"/><path d="M148 62 q12 18 24 0" fill="#fff3c4" opacity=".7"/>` },
    bookshelf: { layer: "shelf", view: "216 20 100 140", svg: `<rect x="228" y="30" width="72" height="122" rx="3" fill="#a9703f"/><rect x="234" y="36" width="60" height="32" fill="#8a5a31"/><rect x="234" y="72" width="60" height="32" fill="#8a5a31"/><rect x="234" y="108" width="60" height="38" fill="#8a5a31"/><g><rect x="238" y="42" width="8" height="26" fill="#ef4444"/><rect x="247" y="46" width="8" height="22" fill="#3b82f6"/><rect x="256" y="40" width="9" height="28" fill="#3fb984"/><rect x="266" y="48" width="8" height="20" fill="#f59e0b"/><rect x="238" y="80" width="10" height="24" fill="#8b5cf6"/><rect x="249" y="76" width="8" height="28" fill="#ef4444"/><rect x="262" y="90" width="26" height="14" fill="#fff"/><rect x="240" y="116" width="8" height="30" fill="#3b82f6"/><rect x="249" y="120" width="9" height="26" fill="#f59e0b"/></g>` },
    pottedPlant: { layer: "plant", view: "236 110 80 110", svg: `<path d="M270 172 q-18 -22 -4 -42 q8 18 4 42z M270 172 q2 -30 18 -40 q4 22 -18 40z M270 172 q-6 -14 -22 -14 q8 -8 22 14z" fill="#4fae6a"/><path d="M256 172 h28 l-4 28 h-20z" fill="#d97a4a"/><rect x="254" y="168" width="32" height="7" rx="2" fill="#c4683a"/>` },
    skyWall: { layer: "wall", view: ROOM_VIEW, svg: `<rect width="320" height="150" fill="#bfe3ff"/><g fill="#fff"><ellipse cx="60" cy="40" rx="26" ry="10"/><ellipse cx="78" cy="34" rx="18" ry="9"/><ellipse cx="230" cy="64" rx="28" ry="10"/><ellipse cx="250" cy="57" rx="18" ry="9"/></g><circle cx="282" cy="26" r="14" fill="#ffd166"/>` },
    greenRug: { layer: "rug", view: "58 168 204 48", svg: `<ellipse cx="160" cy="192" rx="98" ry="20" fill="#5fb878"/><ellipse cx="160" cy="192" rx="80" ry="14" fill="#86d19a"/><path d="M110 192 q6 -8 12 0 M150 196 q6 -8 12 0 M190 190 q6 -8 12 0" stroke="#4fae6a" stroke-width="2.4" fill="none" stroke-linecap="round"/>` },
    beachTowel: { layer: "rug", view: "58 168 204 48", svg: `<rect x="70" y="176" width="180" height="30" rx="4" fill="#fff"/><g fill="#f97316"><rect x="70" y="176" width="180" height="6"/><rect x="70" y="188" width="180" height="6"/><rect x="70" y="200" width="180" height="6" rx="2"/></g><g fill="#38bdf8"><rect x="70" y="182" width="180" height="6"/><rect x="70" y="194" width="180" height="6"/></g>` },
    rainbowPoster: { layer: "poster", view: "16 8 100 90", svg: `<rect x="30" y="22" width="64" height="48" rx="3" fill="#fff" stroke="#b9824f" stroke-width="4"/><g fill="none" stroke-width="4.5" stroke-linecap="round"><path d="M40 62 a22 22 0 0 1 44 0" stroke="#ef4444"/><path d="M45 62 a17 17 0 0 1 34 0" stroke="#fbbf24"/><path d="M50 62 a12 12 0 0 1 24 0" stroke="#3b82f6"/></g>` },
    scienceDesk: { layer: "desk", view: "0 90 130 100", svg: `<rect x="8" y="118" width="98" height="10" rx="3" fill="#6b7fb3"/><rect x="14" y="128" width="8" height="42" fill="#556796"/><rect x="92" y="128" width="8" height="42" fill="#556796"/><rect x="26" y="128" width="62" height="20" rx="2" fill="#7f93c6"/><circle cx="57" cy="138" r="2.4" fill="#e3eaff"/><circle cx="34" cy="104" r="13" fill="#5aa9e6"/><path d="M26 98 q8 -4 12 4 q-2 8 -8 8 q-6 -2 -4 -12z" fill="#5fb878"/><rect x="31" y="116" width="6" height="4" fill="#556796"/><path d="M72 118 v-12 l-6 -10 h16 l-6 10 v12z" fill="#e3f4ff" stroke="#6b7fb3" stroke-width="2"/><path d="M68 108 h12 v10 h-12z" fill="#a78bfa" opacity=".8"/>` },
    starLamp: { layer: "lamp", view: "90 0 140 80", svg: `<g stroke="#6b7a75" stroke-width="2"><path d="M120 0 V26"/><path d="M160 0 V44"/><path d="M200 0 V20"/></g><g fill="#ffd166" stroke="#e0a21a" stroke-width="1.6" stroke-linejoin="round"><polygon points="${starPts(120, 36, 12, 5.2)}"/><polygon points="${starPts(160, 56, 14, 6)}"/><polygon points="${starPts(200, 30, 11, 4.8)}"/></g>` },
    trophyCabinet: { layer: "shelf", view: "216 20 100 140", svg: `<rect x="228" y="30" width="72" height="122" rx="3" fill="#7b5a3a"/><rect x="234" y="36" width="60" height="110" fill="#d6edf5"/><g stroke="#7b5a3a" stroke-width="4"><path d="M234 72H294M234 108H294"/></g><g fill="#ffd166" stroke="#e0a21a" stroke-width="1.6"><path d="M250 52 h12 v8 q0 8 -6 8 q-6 0 -6 -8z"/><path d="M276 56 h10 v7 q0 7 -5 7 q-5 0 -5 -7z"/><path d="M244 90 h14 v9 q0 9 -7 9 q-7 0 -7 -9z" /><circle cx="278" cy="98" r="9"/><path d="M252 126 h16 v10 q0 10 -8 10 q-8 0 -8 -10z"/></g><rect x="274" y="120" width="12" height="20" rx="2" fill="#3b82f6"/>` },
    xmasTree: { layer: "plant", view: "236 100 80 120", svg: `<rect x="266" y="186" width="10" height="16" fill="#8a5a31"/><polygon points="271,112 248,150 294,150" fill="#2f8f4e"/><polygon points="271,134 242,176 300,176" fill="#3aa05b"/><polygon points="271,158 236,192 306,192" fill="#2f8f4e"/><polygon points="${starPts(271, 110, 9, 4)}" fill="#ffd166"/><g><circle cx="262" cy="150" r="3.4" fill="#ef4444"/><circle cx="280" cy="168" r="3.4" fill="#fde047"/><circle cx="256" cy="176" r="3.4" fill="#60a5fa"/><circle cx="288" cy="184" r="3.4" fill="#ef4444"/><circle cx="270" cy="182" r="3.4" fill="#f472b6"/></g>` },
  };
  /* ---------- Study Room expansion: more of every category + Window, Hanging Decor, Pets, Toys ---------- */
  const rep = (n, f) => Array.from({ length: n }, (_, i) => f(i)).join("");
  const RW = (bg, inner) => ({ layer: "wall", view: ROOM_VIEW, svg: `<rect width="320" height="150" fill="${bg}"/>${inner || ""}` });
  const RR = (inner) => ({ layer: "rug", view: "58 168 204 48", svg: inner });
  const RP = (bg, inner) => ({ layer: "poster", view: "16 8 100 90", svg: `<rect x="30" y="22" width="64" height="48" rx="3" fill="${bg}" stroke="#b9824f" stroke-width="4"/>${inner}` });
  const deskBase = (top, leg, front, knob) => `<rect x="8" y="118" width="98" height="10" rx="3" fill="${top}"/><rect x="14" y="128" width="8" height="42" fill="${leg}"/><rect x="92" y="128" width="8" height="42" fill="${leg}"/><rect x="26" y="128" width="62" height="20" rx="2" fill="${front}"/><circle cx="57" cy="138" r="2.4" fill="${knob}"/>`;
  const RD = (top, leg, front, knob, stuff) => ({ layer: "desk", view: "0 84 130 90", svg: deskBase(top, leg, front, knob) + stuff });
  const RL = (inner) => ({ layer: "lamp", view: "110 0 100 80", svg: inner });
  const shelfFrame = (c, inner) => `<rect x="228" y="30" width="72" height="122" rx="3" fill="${c}"/><rect x="234" y="36" width="60" height="32" fill="rgba(0,0,0,.14)"/><rect x="234" y="72" width="60" height="32" fill="rgba(0,0,0,.14)"/><rect x="234" y="108" width="60" height="38" fill="rgba(0,0,0,.14)"/>${inner}`;
  const RS = (c, inner) => ({ layer: "shelf", view: "216 20 100 140", svg: shelfFrame(c, inner) });
  const pot = (c, d) => `<path d="M256 172 h28 l-4 28 h-20z" fill="${c}"/><rect x="254" y="168" width="32" height="7" rx="2" fill="${d}"/>`;
  const RPL = (inner) => ({ layer: "plant", view: "236 100 80 110", svg: inner });
  const winFrame = (frame, scene, bars) => `<rect x="108" y="26" width="100" height="60" rx="4" fill="${frame}"/><rect x="113" y="31" width="90" height="50" fill="#bfe3ff"/>${scene}${bars === false ? "" : `<rect x="156" y="31" width="4" height="50" fill="${frame}"/><rect x="113" y="54" width="90" height="4" fill="${frame}"/>`}`;
  const RWIN = (frame, scene, bars) => ({ layer: "window", view: "104 22 108 68", svg: winFrame(frame, scene, bars) });
  const swag = (n, f) => rep(2, (h) => rep(n, (i) => { const t = (i + 0.5) / n; return f(h * 160 + 160 * t, 4 + 56 * t * (1 - t), i + h * n); }));
  const SWAG_STR = (c) => `<path d="M0 4 Q80 32 160 4 M160 4 Q240 32 320 4" stroke="${c}" stroke-width="2" fill="none"/>`;
  const RG = (inner) => ({ layer: "garland", view: "104 0 112 34", svg: inner });
  const RPET = (inner) => ({ layer: "pet", view: "208 158 64 54", svg: inner });
  const RT = (inner) => ({ layer: "toy", view: "14 156 76 58", svg: inner });
  const COLS = ["#ef4444", "#fbbf24", "#3b82f6", "#3fb984", "#f472b6", "#a78bfa"];

  Object.assign(ROOM_ART, {
    /* wallpapers */
    pinkWall: RW("#fde2ea", rep(8, (i) => `<rect x="${i * 40 + 10}" width="20" height="150" fill="#fbcfe0"/>`)),
    blueDotWall: RW("#d9ecff", rep(4, (r) => rep(9, (c) => `<circle cx="${c * 40 + (r % 2 ? 20 : 0) + 10}" cy="${r * 38 + 16}" r="4.5" fill="#fff"/>`))),
    ginghamWall: RW("#fff6c4", rep(8, (i) => `<rect x="${i * 40}" width="20" height="150" fill="#ffe36e" opacity=".55"/>`) + rep(4, (i) => `<rect y="${i * 40 + 10}" width="320" height="20" fill="#ffe36e" opacity=".55"/>`)),
    forestWall: RW("#d4f1d9", rep(7, (i) => `<rect x="${i * 48 + 22}" y="104" width="8" height="46" fill="#8a5a31"/><polygon points="${i * 48 + 26},${44 + (i % 3) * 8} ${i * 48 + 4},112 ${i * 48 + 48},112" fill="#3aa05b"/><polygon points="${i * 48 + 26},${28 + (i % 3) * 8} ${i * 48 + 10},82 ${i * 48 + 42},82" fill="#2f8f4e"/>`) + `<circle cx="270" cy="26" r="12" fill="#fff3a8"/>`),
    oceanWall: RW("#bfe9f7", `<path d="M0 100 q20 -14 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 V150 H0Z" fill="#5fb9e6"/><path d="M0 124 q20 -12 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 V150 H0Z" fill="#3b9bd6"/><g fill="#f97316"><ellipse cx="70" cy="60" rx="14" ry="8"/><path d="M84 60 l12 -8 v16z"/><ellipse cx="230" cy="40" rx="12" ry="7"/><path d="M242 40 l10 -7 v14z"/></g><g fill="#fff" opacity=".7"><circle cx="40" cy="30" r="3"/><circle cx="150" cy="70" r="4"/><circle cx="280" cy="80" r="3"/></g>`),
    spaceWall: RW("#2a1f4d", `<g fill="#fff"><circle cx="30" cy="30" r="1.8"/><circle cx="130" cy="20" r="1.5"/><circle cx="200" cy="70" r="2"/><circle cx="300" cy="24" r="1.8"/><circle cx="90" cy="120" r="1.6"/><circle cx="260" cy="120" r="1.8"/></g><circle cx="70" cy="58" r="18" fill="#f59e0b"/><ellipse cx="70" cy="58" rx="30" ry="6" fill="none" stroke="#fde68a" stroke-width="3"/><circle cx="240" cy="44" r="12" fill="#38bdf8"/><circle cx="236" cy="40" r="4" fill="#7dd3fc"/><circle cx="170" cy="100" r="7" fill="#f472b6"/>`),
    sunsetWall: { layer: "wall", view: ROOM_VIEW, svg: `<defs><linearGradient id="kaSun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a78bfa"/><stop offset=".55" stop-color="#f58bb0"/><stop offset="1" stop-color="#ffb36b"/></linearGradient></defs><rect width="320" height="150" fill="url(#kaSun)"/><circle cx="160" cy="150" r="46" fill="#ffe29a"/><g fill="#fff" opacity=".6"><ellipse cx="60" cy="40" rx="30" ry="8"/><ellipse cx="260" cy="64" rx="34" ry="8"/></g>` },

    /* rugs */
    redRug: RR(`<ellipse cx="160" cy="192" rx="98" ry="20" fill="#ef4444"/><ellipse cx="160" cy="192" rx="80" ry="14" fill="none" stroke="#fde7d0" stroke-width="4"/><ellipse cx="160" cy="192" rx="52" ry="8" fill="#b91c1c"/>`),
    heartRug: RR(`<ellipse cx="160" cy="192" rx="98" ry="20" fill="#f9a8d4"/><path d="${heartPath(160, 190, 16)}" fill="#fff" transform="translate(0 0)"/><path d="${heartPath(100, 192, 6)}" fill="#fff"/><path d="${heartPath(220, 192, 6)}" fill="#fff"/>`),
    rainbowRug: RR(`<ellipse cx="160" cy="192" rx="98" ry="20" fill="#ef4444"/><ellipse cx="160" cy="192" rx="84" ry="16" fill="#fbbf24"/><ellipse cx="160" cy="192" rx="70" ry="12" fill="#3fb984"/><ellipse cx="160" cy="192" rx="56" ry="8.5" fill="#3b82f6"/><ellipse cx="160" cy="192" rx="42" ry="5" fill="#a78bfa"/>`),
    stripeRug: RR(`<rect x="66" y="176" width="188" height="32" rx="3" fill="#fff"/>${rep(8, (i) => `<rect x="${72 + i * 22}" y="176" width="11" height="32" fill="${COLS[i % 6]}"/>`)}<path d="M66 178h-6M66 184h-6M66 190h-6M66 196h-6M66 202h-6M254 178h6M254 184h6M254 190h6M254 196h6M254 202h6" stroke="#cbd5e1" stroke-width="2"/>`),
    flowerRug: RR(`<ellipse cx="160" cy="192" rx="98" ry="20" fill="#bde8c6"/>${rep(5, (i) => `<g transform="translate(${90 + i * 35} ${192 + (i % 2 ? 4 : -3)})"><circle r="6" fill="#f472b6"/><circle cx="-5" cy="-3" r="4" fill="#fb7ab2"/><circle cx="5" cy="-3" r="4" fill="#fb7ab2"/><circle cx="-4" cy="4" r="4" fill="#fb7ab2"/><circle cx="4" cy="4" r="4" fill="#fb7ab2"/><circle r="3" fill="#fde047"/></g>`)}`),
    pawRug: RR(`<ellipse cx="160" cy="192" rx="98" ry="20" fill="#b9824f"/><ellipse cx="160" cy="196" rx="20" ry="9" fill="#fde7d0"/><ellipse cx="132" cy="186" rx="6" ry="5" fill="#fde7d0"/><ellipse cx="148" cy="180" rx="6" ry="5" fill="#fde7d0"/><ellipse cx="172" cy="180" rx="6" ry="5" fill="#fde7d0"/><ellipse cx="188" cy="186" rx="6" ry="5" fill="#fde7d0"/>`),
    cloudRug: RR(`<ellipse cx="160" cy="192" rx="98" ry="20" fill="#8ec9f5"/><g fill="#fff"><ellipse cx="120" cy="192" rx="20" ry="7"/><ellipse cx="134" cy="187" rx="12" ry="6"/><ellipse cx="200" cy="196" rx="22" ry="7"/><ellipse cx="214" cy="190" rx="12" ry="6"/><ellipse cx="164" cy="186" rx="14" ry="5"/></g>`),
    purpleRug: RR(`<ellipse cx="160" cy="192" rx="98" ry="20" fill="#a78bfa"/><ellipse cx="160" cy="192" rx="82" ry="14.5" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="4 5"/><ellipse cx="160" cy="192" rx="56" ry="9" fill="#c4b5fd"/>`),

    /* posters */
    kangarooPoster: RP("#ffe2b8", `<path d="M34 62 H90" stroke="#d6a266" stroke-width="3"/><ellipse cx="58" cy="50" rx="9" ry="12" fill="#c97b3a"/><circle cx="64" cy="35" r="6" fill="#c97b3a"/><path d="M62 31 l-2 -8 l5 5z M67 31 l3 -7 l2 8z" fill="#c97b3a"/><path d="M50 56 q-14 4 -14 6 q10 2 18 -2z" fill="#a8602a"/><ellipse cx="60" cy="52" rx="4" ry="5" fill="#e6b27a"/><circle cx="66" cy="34" r="1.2" fill="#1f2a27"/>`),
    dinoPoster: RP("#d6f5d9", `<ellipse cx="58" cy="52" rx="17" ry="10" fill="#3aa05b"/><path d="M70 46 q8 -4 8 -14" stroke="#3aa05b" stroke-width="7" fill="none" stroke-linecap="round"/><circle cx="80" cy="30" r="6" fill="#3aa05b"/><circle cx="82" cy="29" r="1.4" fill="#fff"/><rect x="48" y="58" width="5" height="8" fill="#2f8f4e"/><rect x="64" y="58" width="5" height="8" fill="#2f8f4e"/><path d="M42 52 q-8 2 -9 8 q10 -2 14 -6z" fill="#3aa05b"/><path d="M50 43 l3 -6 l3 6 M58 42 l3 -6 l3 6" fill="#f59e0b"/>`),
    abcPoster: RP("#fffdf0", `<text x="62" y="50" text-anchor="middle" font-family="Arial Rounded MT Bold, Arial, sans-serif" font-weight="800" font-size="20"><tspan fill="#ef4444">A</tspan><tspan fill="#3b82f6">B</tspan><tspan fill="#3fb984">C</tspan></text><path d="M40 58 H84" stroke="#fbbf24" stroke-width="3" stroke-linecap="round"/>`),
    solarPoster: RP("#1f2a55", `<circle cx="38" cy="46" r="9" fill="#f59e0b"/><circle cx="54" cy="46" r="2.6" fill="#a78bfa"/><circle cx="62" cy="46" r="3.4" fill="#38bdf8"/><circle cx="72" cy="46" r="4.2" fill="#ef4444"/><circle cx="84" cy="46" r="5.2" fill="#fbbf24"/><g fill="#fff"><circle cx="46" cy="30" r="1"/><circle cx="76" cy="62" r="1"/><circle cx="62" cy="28" r="1"/></g>`),
    fishPoster: RP("#8ed3f2", `<ellipse cx="58" cy="46" rx="14" ry="9" fill="#f97316"/><path d="M70 46 l12 -8 v16z" fill="#f97316"/><circle cx="50" cy="43" r="1.8" fill="#fff"/><path d="M34 62 q6 -6 12 0 t12 0 t12 0 t12 0" stroke="#fff" stroke-width="2.4" fill="none"/><g fill="#fff" opacity=".8"><circle cx="40" cy="34" r="2"/><circle cx="44" cy="28" r="1.4"/></g>`),
    mountainPoster: RP("#cfe9ff", `<circle cx="78" cy="34" r="6" fill="#fde047"/><polygon points="34,66 56,32 78,66" fill="#6b7fb3"/><polygon points="56,66 76,42 90,66" fill="#8da2d6"/><polygon points="56,32 50,43 56,40 62,43" fill="#fff"/>`),
    mathPoster: RP("#fff7d6", `<g font-family="Arial, sans-serif" font-weight="800" font-size="17" text-anchor="middle"><text x="46" y="42" fill="#ef4444">+</text><text x="66" y="42" fill="#3b82f6">−</text><text x="80" y="42" fill="#3fb984">×</text><text x="46" y="62" fill="#a78bfa">÷</text><text x="68" y="62" fill="#f59e0b">=</text><text x="82" y="62" fill="#ec4899">7</text></g>`),
    musicPoster: RP("#f3e8ff", `<g stroke="#a78bfa" stroke-width="1.4"><path d="M36 34H88M36 40H88M36 46H88M36 52H88M36 58H88"/></g><g fill="#26332f"><ellipse cx="50" cy="56" rx="5" ry="3.6"/><ellipse cx="72" cy="50" rx="5" ry="3.6"/></g><path d="M55 56 V36 M77 50 V32 M55 36 L77 32" stroke="#26332f" stroke-width="2.2" fill="none"/>`),

    /* desks */
    computerDesk: RD("#7f8fa6", "#64748b", "#94a3b8", "#e2e8f0", `<rect x="28" y="92" width="40" height="24" rx="3" fill="#374151"/><rect x="31" y="95" width="34" height="17" fill="#7dd3fc"/><rect x="44" y="116" width="8" height="2" fill="#374151"/><rect x="72" y="112" width="26" height="5" rx="1.5" fill="#cbd5e1"/><circle cx="102" cy="115" r="2.6" fill="#cbd5e1"/>`),
    artDesk: RD("#d8b98a", "#b5925d", "#e6cfa6", "#8a5a31", `<ellipse cx="38" cy="112" rx="18" ry="6" fill="#f3e1c0"/><g><circle cx="30" cy="111" r="2.4" fill="#ef4444"/><circle cx="38" cy="109" r="2.4" fill="#3b82f6"/><circle cx="46" cy="112" r="2.4" fill="#fbbf24"/></g><rect x="68" y="102" width="12" height="16" rx="2" fill="#e5e7eb"/><path d="M72 102 l-3 -12 M76 102 l1 -14" stroke="#8a5a31" stroke-width="2.2" stroke-linecap="round"/><rect x="86" y="96" width="16" height="22" fill="#fff" stroke="#c9d3cf"/><path d="M89 108 q6 -8 12 0" stroke="#3fb984" stroke-width="2" fill="none"/>`),
    globeDesk: RD("#7b5a3a", "#5e4329", "#8d6a46", "#f3d9a8", `<circle cx="34" cy="102" r="14" fill="#5aa9e6"/><path d="M26 98 q8 -6 12 2 q-2 8 -8 8 q-6 -2 -4 -10z M40 106 q6 -2 8 4 q-5 3 -8 -4z" fill="#5fb878"/><path d="M34 116 v3" stroke="#6b7a75" stroke-width="3"/><rect x="26" y="118" width="16" height="2" fill="#6b7a75"/><rect x="72" y="106" width="10" height="12" rx="2" fill="#fff"/><path d="M75 106 l-1 -8 M79 106 l2 -9" stroke="#ef4444" stroke-width="2.2" stroke-linecap="round"/>`),
    pinkDesk: RD("#f9a8d4", "#f472b6", "#fbcfe8", "#be185d", `<rect x="24" y="96" width="22" height="22" rx="2" fill="#fff" stroke="#f472b6" stroke-width="2"/><path d="${heartPath(35, 107, 6)}" fill="#ef4444"/><rect x="66" y="108" width="14" height="10" rx="3" fill="#fff"/><path d="M73 108 q-8 -10 -3 -14 q5 4 3 14z M73 108 q8 -10 3 -14 q-5 4 -3 14z" fill="#f472b6"/><circle cx="90" cy="112" r="6" fill="#fde047"/>`),
    pianoDesk: RD("#374151", "#1f2937", "#4b5563", "#e5e7eb", `<rect x="14" y="104" width="84" height="13" rx="2" fill="#fff" stroke="#9ca3af"/>${rep(10, (i) => `<path d="M${22 + i * 8} 104 V117" stroke="#d1d5db"/>`)}${rep(7, (i) => (i === 2 || i === 5 ? "" : `<rect x="${19 + i * 8}" y="104" width="5" height="8" fill="#1f2937"/>`))}`),
    bookDesk: RD("#4fae6a", "#3d8c55", "#6bc487", "#fff", `<rect x="22" y="104" width="28" height="7" fill="#ef4444"/><rect x="24" y="97" width="26" height="7" fill="#3b82f6"/><rect x="21" y="111" width="30" height="7" fill="#fbbf24"/><rect x="26" y="90" width="22" height="7" fill="#a78bfa"/><circle cx="76" cy="111" r="6.4" fill="#ef4444"/><path d="M76 105 q1 -4 4 -5" stroke="#3d8c55" stroke-width="2" fill="none"/>`),
    craftDesk: RD("#f59e0b", "#d97706", "#fbbf24", "#fff", `<rect x="22" y="104" width="22" height="14" rx="2" fill="#fff" stroke="#d97706"/>${rep(6, (i) => `<path d="M${25 + i * 3.4} 104 v-10" stroke="${COLS[i]}" stroke-width="2.6" stroke-linecap="round"/>`)}<rect x="56" y="108" width="30" height="10" fill="#fff" stroke="#cbd5e1"/><path d="M60 112 l8 -3 l8 3 l8 -3" stroke="#ef4444" stroke-width="2" fill="none"/><path d="M92 112 l6 -6 M98 112 l-6 -6" stroke="#6b7a75" stroke-width="2" stroke-linecap="round"/>`),
    snackDesk: RD("#a78bfa", "#8b5cf6", "#c4b5fd", "#fff", `<path d="M26 118 l-2 -16 h16 l-2 16z" fill="#fff" stroke="#cbd5e1" stroke-width="1.6"/><rect x="27" y="108" width="12" height="9" fill="#f5f3ff"/><ellipse cx="72" cy="116" rx="16" ry="4" fill="#fff" stroke="#cbd5e1"/><circle cx="66" cy="112" r="5" fill="#c97b3a"/><circle cx="76" cy="111" r="5" fill="#c97b3a"/><circle cx="64" cy="111" r="1" fill="#6b3d1c"/><circle cx="77" cy="109" r="1" fill="#6b3d1c"/>`),

    /* lamps */
    lanternLamp: RL(`<path d="M160 0 V22" stroke="#6b7a75" stroke-width="2.4"/><rect x="152" y="20" width="16" height="5" rx="2" fill="#e0a21a"/><ellipse cx="160" cy="42" rx="17" ry="18" fill="#ef4444"/><path d="M160 24 V60 M148 28 Q141 42 148 56 M172 28 Q179 42 172 56" stroke="#b91c1c" stroke-width="1.6" fill="none"/><rect x="152" y="58" width="16" height="5" rx="2" fill="#e0a21a"/><path d="M160 63 V74 M156 63 V72 M164 63 V72" stroke="#fbbf24" stroke-width="2" stroke-linecap="round"/>`),
    moonLamp: RL(`<path d="M160 0 V18" stroke="#6b7a75" stroke-width="2.4"/><path d="M164 18 a22 22 0 1 0 12 40 a17 17 0 1 1 -12 -40z" fill="#ffd166" stroke="#e0a21a" stroke-width="2.4"/><circle cx="148" cy="42" r="2" fill="#e0a21a" opacity=".6"/>`),
    cloudLamp: RL(`<path d="M160 0 V22" stroke="#6b7a75" stroke-width="2.4"/><g fill="#fff" stroke="#cbd5e1" stroke-width="1.6"><ellipse cx="160" cy="44" rx="26" ry="14"/><ellipse cx="144" cy="38" rx="13" ry="11"/><ellipse cx="170" cy="34" rx="15" ry="12"/></g><ellipse cx="160" cy="48" rx="20" ry="6" fill="#fff3c4" opacity=".85"/>`),
    sunLamp: RL(`<path d="M160 0 V20" stroke="#6b7a75" stroke-width="2.4"/>${rep(10, (i) => `<path d="M160 44 L${(160 + 28 * Math.cos(i * 0.628)).toFixed(1)} ${(44 + 28 * Math.sin(i * 0.628)).toFixed(1)}" stroke="#fbbf24" stroke-width="4" stroke-linecap="round"/>`)}<circle cx="160" cy="44" r="15" fill="#ffd166" stroke="#e0a21a" stroke-width="2.4"/><circle cx="155" cy="42" r="1.6" fill="#b45309"/><circle cx="165" cy="42" r="1.6" fill="#b45309"/><path d="M155 49 q5 4 10 0" stroke="#b45309" stroke-width="1.6" fill="none"/>`),
    chandelier: RL(`<path d="M160 0 V16" stroke="#6b7a75" stroke-width="2.4"/><path d="M128 52 Q160 70 192 52" stroke="#e0a21a" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M160 16 V52" stroke="#e0a21a" stroke-width="4"/>${[130, 160, 190].map((x) => `<rect x="${x - 3}" y="${x === 160 ? 34 : 40}" width="6" height="12" fill="#fff" stroke="#e5e7eb"/><path d="M${x} ${x === 160 ? 24 : 30} q5 5 0 9 q-5 -4 0 -9z" fill="#ffb347"/>`).join("")}<g fill="#7dd3fc"><circle cx="140" cy="62" r="3"/><circle cx="160" cy="68" r="3.4"/><circle cx="180" cy="62" r="3"/></g>`),
    flowerLamp: RL(`<path d="M160 0 V22" stroke="#6b7a75" stroke-width="2.4"/>${rep(6, (i) => `<ellipse cx="${(160 + 14 * Math.cos(i * 1.047)).toFixed(1)}" cy="${(42 + 14 * Math.sin(i * 1.047)).toFixed(1)}" rx="9" ry="9" fill="#f9a8d4" stroke="#f472b6" stroke-width="1.6"/>`)}<circle cx="160" cy="42" r="9" fill="#fff3c4" stroke="#e0a21a" stroke-width="1.6"/>`),
    bulbLamp: RL(`${[[130, 30], [160, 48], [190, 24]].map(([x, y]) => `<path d="M${x} 0 V${y}" stroke="#6b7a75" stroke-width="2"/><rect x="${x - 4}" y="${y}" width="8" height="7" rx="1.5" fill="#6b7a75"/><ellipse cx="${x}" cy="${y + 16}" rx="9" ry="11" fill="#fde68a" stroke="#e0a21a" stroke-width="1.8"/><path d="M${x - 3} ${y + 12} q3 -4 6 0" stroke="#fff" stroke-width="2" fill="none" opacity=".8"/>`).join("")}`),
    rainbowLamp: RL(`${[[124, 26, "#ef4444"], [142, 44, "#fbbf24"], [160, 30, "#3fb984"], [178, 48, "#3b82f6"], [196, 28, "#a78bfa"]].map(([x, y, c]) => `<path d="M${x} 0 V${y}" stroke="#6b7a75" stroke-width="1.8"/><circle cx="${x}" cy="${y + 9}" r="9.5" fill="${c}"/><circle cx="${x - 3}" cy="${y + 6}" r="2.4" fill="#fff" opacity=".6"/>`).join("")}`),
    jellyLamp: RL(`<path d="M160 0 V20" stroke="#6b7a75" stroke-width="2.4"/><path d="M138 44 Q138 20 160 20 Q182 20 182 44 Z" fill="#c4b5fd" stroke="#8b5cf6" stroke-width="2"/><g stroke="#a78bfa" stroke-width="3" fill="none" stroke-linecap="round"><path d="M145 44 q-4 10 0 18 q4 6 0 12"/><path d="M155 44 q4 10 0 18 q-4 8 0 14"/><path d="M165 44 q-4 10 0 18 q4 6 0 12"/><path d="M175 44 q4 10 0 18 q-4 8 0 12"/></g><circle cx="152" cy="34" r="3" fill="#fff" opacity=".6"/>`),

    /* shelves */
    toyShelf: RS("#f59e0b", `<rect x="238" y="52" width="14" height="14" fill="#ef4444"/><rect x="254" y="52" width="14" height="14" fill="#3b82f6"/><rect x="246" y="38" width="14" height="14" fill="#fbbf24"/><circle cx="282" cy="60" r="6.5" fill="#3fb984"/><circle cx="250" cy="88" r="10" fill="#a9703f"/><circle cx="244" cy="80" r="4" fill="#a9703f"/><circle cx="256" cy="80" r="4" fill="#a9703f"/><rect x="268" y="86" width="22" height="14" rx="2" fill="#f472b6"/><path d="M240 126 h24 l-2 -8 h-20z" fill="#38bdf8"/><circle cx="246" cy="132" r="4" fill="#374151"/><circle cx="258" cy="132" r="4" fill="#374151"/><polygon points="280,138 290,138 285,118" fill="#a78bfa"/>`),
    plantShelf: RS("#f8fafc", `<g><path d="M240 68 h16 l-2 -12 h-12z" fill="#d97a4a"/><path d="M248 56 q-8 -10 -2 -16 q6 6 2 16z M248 56 q8 -10 2 -16 q-6 6 -2 16z" fill="#4fae6a"/><path d="M270 68 h16 l-2 -10 h-12z" fill="#38bdf8"/><path d="M278 58 q-10 -4 -10 -14 q10 2 10 14z M278 58 q10 -4 10 -14 q-10 2 -10 14z" fill="#3aa05b"/><path d="M244 104 h18 l-2 -12 h-14z" fill="#fbbf24"/><circle cx="253" cy="86" r="6" fill="#f472b6"/><path d="M253 92 v4" stroke="#3aa05b" stroke-width="2"/><path d="M276 104 h14 l-2 -14 h-10z" fill="#a78bfa"/><path d="M283 90 v-12" stroke="#3aa05b" stroke-width="3"/><path d="M283 82 l-8 -4 M283 82 l8 -4" stroke="#3aa05b" stroke-width="3"/></g>`),
    cubbyShelf: RS("#e2e8f0", `<rect x="238" y="46" width="16" height="20" rx="2" fill="#38bdf8"/><rect x="258" y="42" width="14" height="24" rx="2" fill="#f472b6"/><rect x="276" y="50" width="14" height="16" rx="2" fill="#fbbf24"/><rect x="238" y="84" width="22" height="20" rx="2" fill="#3fb984"/><rect x="266" y="76" width="24" height="28" rx="2" fill="#a78bfa"/><rect x="240" y="124" width="14" height="22" rx="2" fill="#ef4444"/><rect x="258" y="130" width="30" height="16" rx="2" fill="#f59e0b"/>`),
    rainbowShelf: RS("#8a5a31", rep(8, (i) => `<rect x="${238 + i * 7}" y="${42 - (i % 3) * 2}" width="6" height="${26 + (i % 3) * 2}" fill="${["#ef4444", "#f97316", "#fbbf24", "#3fb984", "#38bdf8", "#3b82f6", "#a78bfa", "#f472b6"][i]}"/>`) + rep(8, (i) => `<rect x="${238 + i * 7}" y="${78 + (i % 2) * 2}" width="6" height="${24 - (i % 2) * 2}" fill="${["#f472b6", "#a78bfa", "#3b82f6", "#38bdf8", "#3fb984", "#fbbf24", "#f97316", "#ef4444"][i]}"/>`) + rep(6, (i) => `<rect x="${240 + i * 9}" y="${116 + (i % 2) * 3}" width="8" height="${28 - (i % 2) * 3}" fill="${COLS[i]}"/>`)),
    globeShelf: RS("#3b6aa0", `<circle cx="258" cy="52" r="14" fill="#5aa9e6"/><path d="M250 46 q8 -6 12 2 q-2 8 -8 8 q-6 -2 -4 -10z M264 56 q6 -2 8 4 q-5 3 -8 -4z" fill="#5fb878"/><rect x="254" y="66" width="8" height="2" fill="#e2e8f0"/><rect x="274" y="44" width="14" height="22" fill="#fef3c7"/><rect x="240" y="88" width="48" height="14" fill="#ef4444"/><rect x="244" y="92" width="40" height="3" fill="#fff"/><rect x="240" y="120" width="10" height="26" fill="#fbbf24"/><rect x="252" y="124" width="8" height="22" fill="#fff"/><rect x="262" y="118" width="26" height="28" fill="#c9a36b"/>`),
    aquariumShelf: { layer: "shelf", view: "216 20 100 140", svg: `<rect x="228" y="40" width="72" height="112" rx="3" fill="#6b7a75"/><rect x="233" y="46" width="62" height="82" rx="3" fill="#7dd3fc"/><rect x="233" y="96" width="62" height="32" fill="#3b9bd6"/><path d="M233 100 q8 -4 16 0 t16 0 t16 0 t16 0" stroke="#fff" stroke-width="2" fill="none" opacity=".7"/><ellipse cx="252" cy="78" rx="8" ry="5" fill="#f97316"/><path d="M260 78 l7 -5 v10z" fill="#f97316"/><ellipse cx="280" cy="108" rx="7" ry="4" fill="#fbbf24"/><path d="M273 108 l-6 -4 v8z" fill="#fbbf24"/><path d="M240 128 q2 -14 6 -2 q3 -12 6 2" stroke="#3fb984" stroke-width="3" fill="none"/><rect x="233" y="126" width="62" height="5" fill="#e6c98a"/><rect x="236" y="134" width="56" height="14" fill="#555f5b"/>` },
    craftShelf: RS("#c4683a", `<g><rect x="238" y="46" width="14" height="22" rx="2" fill="#e0f2fe" stroke="#93c5fd"/>${rep(4, (i) => `<path d="M${241 + i * 3} 46 v-9" stroke="${COLS[i]}" stroke-width="2.4" stroke-linecap="round"/>`)}<rect x="258" y="50" width="14" height="18" rx="2" fill="#fef3c7" stroke="#fcd34d"/><rect x="276" y="44" width="14" height="24" rx="2" fill="#fce7f3" stroke="#f9a8d4"/><circle cx="246" cy="92" r="9" fill="#ef4444"/><circle cx="266" cy="92" r="9" fill="#3b82f6"/><circle cx="286" cy="92" r="9" fill="#fbbf24"/><rect x="240" y="122" width="20" height="24" fill="#fff" stroke="#cbd5e1"/><rect x="264" y="126" width="24" height="20" fill="#d1fae5" stroke="#6ee7b7"/></g>`),
    floatShelf: { layer: "shelf", view: "216 20 100 140", svg: `<g fill="#b9824f"><rect x="226" y="60" width="76" height="6" rx="2"/><rect x="226" y="100" width="76" height="6" rx="2"/><rect x="226" y="140" width="76" height="6" rx="2"/></g><rect x="236" y="38" width="14" height="22" fill="#3b82f6"/><rect x="252" y="42" width="12" height="18" fill="#ef4444"/><circle cx="282" cy="50" r="10" fill="#fbbf24"/><path d="M240 100 h18 l-2 -14 h-14z" fill="#d97a4a"/><path d="M249 86 q-8 -8 -2 -14 q6 4 2 14z M249 86 q8 -8 2 -14 q-6 4 -2 14z" fill="#4fae6a"/><rect x="270" y="86" width="22" height="14" fill="#a78bfa"/><circle cx="246" cy="128" r="11" fill="#5aa9e6"/><rect x="266" y="116" width="10" height="24" fill="#fff" stroke="#cbd5e1"/><rect x="278" y="122" width="12" height="18" fill="#f472b6"/>` },
    gameShelf: RS("#6d28d9", `<rect x="238" y="42" width="24" height="24" fill="#ef4444"/><rect x="264" y="46" width="26" height="20" fill="#fbbf24"/><g fill="#fff"><circle cx="246" cy="50" r="2"/><circle cx="254" cy="58" r="2"/><circle cx="276" cy="52" r="2"/></g><rect x="238" y="80" width="30" height="22" fill="#3fb984"/><rect x="270" y="76" width="20" height="26" fill="#38bdf8"/><path d="M244 90 h18 M244 95 h12" stroke="#fff" stroke-width="2"/><rect x="238" y="118" width="22" height="26" fill="#f472b6"/><rect x="262" y="122" width="28" height="22" fill="#f59e0b"/><circle cx="276" cy="133" r="6" fill="#fff"/>`),

    /* plants */
    cactus: RPL(`<path d="M270 172 v-46 q0 -8 7 -8 q7 0 7 8 v46z" fill="#3fb06a" transform="translate(-7 0)"/><path d="M263 150 h-8 q-4 0 -4 -5 v-12 M277 142 h10 q4 0 4 -5 v-12" stroke="#3fb06a" stroke-width="7" fill="none" stroke-linecap="round"/><circle cx="270" cy="118" r="5" fill="#f472b6"/>${pot("#d97a4a", "#c4683a")}`),
    sunflower: RPL(`<path d="M270 172 V124" stroke="#3aa05b" stroke-width="5"/><path d="M270 154 q-14 -2 -16 -12 q12 0 16 12z" fill="#4fae6a"/>${rep(10, (i) => `<ellipse cx="${(270 + 14 * Math.cos(i * 0.628)).toFixed(1)}" cy="${(116 + 14 * Math.sin(i * 0.628)).toFixed(1)}" rx="6" ry="4.4" fill="#fbbf24" transform="rotate(${i * 36} ${(270 + 14 * Math.cos(i * 0.628)).toFixed(1)} ${(116 + 14 * Math.sin(i * 0.628)).toFixed(1)})"/>`)}<circle cx="270" cy="116" r="9" fill="#8a5a31"/>${pot("#c4683a", "#a85a2e")}`),
    bonsai: RPL(`<path d="M270 172 q-6 -14 0 -26 q6 -10 -2 -22" stroke="#8a5a31" stroke-width="6" fill="none" stroke-linecap="round"/><g fill="#3aa05b"><circle cx="262" cy="124" r="11"/><circle cx="276" cy="120" r="12"/><circle cx="270" cy="138" r="10"/></g><rect x="252" y="170" width="36" height="8" rx="2" fill="#6b7a75"/><rect x="258" y="178" width="24" height="5" fill="#556b66"/>`),
    fern: RPL(`<g fill="none" stroke="#3aa05b" stroke-width="5" stroke-linecap="round"><path d="M270 170 q-24 -10 -26 -34"/><path d="M270 170 q-10 -20 -8 -44"/><path d="M270 170 q2 -24 0 -48"/><path d="M270 170 q12 -20 12 -42"/><path d="M270 170 q24 -10 28 -32"/></g>${pot("#6d8fd9", "#5a7cc4")}`),
    palmTree: RPL(`<path d="M270 172 q-4 -30 2 -56" stroke="#a9703f" stroke-width="7" fill="none" stroke-linecap="round"/><g fill="#3aa05b"><path d="M272 116 q-24 -8 -34 6 q18 -4 34 -6z"/><path d="M272 116 q24 -8 34 6 q-18 -4 -34 -6z"/><path d="M272 116 q-16 -20 -30 -14 q16 2 30 14z"/><path d="M272 116 q16 -20 30 -14 q-16 2 -30 14z"/><path d="M272 116 q0 -22 -2 -24 q-4 12 2 24z"/></g>${pot("#e8a24f", "#d48b33")}`),
    tulips: RPL(`<g stroke="#3aa05b" stroke-width="3" fill="none"><path d="M262 170 q-2 -22 -4 -38"/><path d="M270 170 V124"/><path d="M278 170 q2 -22 4 -34"/></g><path d="M252 132 q6 -14 12 0 q-6 4 -12 0z" fill="#ef4444"/><path d="M264 122 q6 -14 12 0 q-6 4 -12 0z" fill="#fbbf24"/><path d="M276 134 q6 -14 12 0 q-6 4 -12 0z" fill="#f472b6"/>${pot("#9ca3af", "#6b7280")}`),
    bambooPlant: RPL(`<g fill="#6fbf73" stroke="#3aa05b" stroke-width="1.6"><rect x="258" y="118" width="7" height="56" rx="2"/><rect x="268" y="108" width="7" height="66" rx="2"/><rect x="278" y="124" width="7" height="50" rx="2"/></g><g stroke="#3aa05b" stroke-width="2"><path d="M258 140h7M258 158h7M268 128h7M268 148h7M278 142h7"/></g><path d="M265 112 q-10 -6 -14 0 q8 0 14 0z M275 106 q10 -6 14 0 q-8 0 -14 0z" fill="#3aa05b"/>${pot("#6b7a75", "#556b66")}`),
    monstera: RPL(`<g fill="#2f8f4e"><path d="M270 170 q-30 -4 -30 -30 q22 -4 30 30z"/><path d="M270 170 q30 -4 30 -30 q-22 -4 -30 30z"/><path d="M270 170 q-16 -20 -4 -44 q18 14 4 44z"/></g><g stroke="#aee8b6" stroke-width="1.6" fill="none"><path d="M270 170 L248 146 M270 170 L292 146 M270 170 L268 134"/></g>${pot("#e5e7eb", "#cbd5e1")}`),
    succulents: RPL(`<g fill="#7bc8a4" stroke="#3fb06a" stroke-width="1.4"><path d="M262 170 q-10 -8 0 -18 q10 10 0 18z"/><path d="M262 170 q-18 -2 -14 -14 q14 0 14 14z"/><path d="M262 170 q18 -2 14 -14 q-14 0 -14 14z"/></g><g fill="#9bdc9b" stroke="#3fb06a" stroke-width="1.4"><path d="M280 168 q-8 -6 0 -14 q8 8 0 14z"/><path d="M280 168 q-14 0 -10 -10 q10 0 10 10z"/><path d="M280 168 q14 0 10 -10 q-10 0 -10 10z"/></g><circle cx="262" cy="150" r="3" fill="#f472b6"/>${pot("#f4a259", "#e08a3a")}`),
    lavender: RPL(`<g stroke="#3aa05b" stroke-width="2.4" fill="none"><path d="M262 170 q-4 -26 -6 -46"/><path d="M270 170 V116"/><path d="M278 170 q4 -26 6 -44"/></g><g fill="#a78bfa">${[[256, 124], [270, 116], [284, 126]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="3.4" ry="9"/><circle cx="${x - 3}" cy="${y + 4}" r="2.6"/><circle cx="${x + 3}" cy="${y + 2}" r="2.6"/>`).join("")}</g>${pot("#f1f5f9", "#cbd5e1")}`),

    /* windows */
    skyWindow: RWIN("#fff", `<circle cx="190" cy="44" r="7" fill="#fde047"/><g fill="#fff"><ellipse cx="136" cy="44" rx="14" ry="5"/><ellipse cx="144" cy="40" rx="9" ry="5"/></g><rect x="113" y="72" width="90" height="9" fill="#8fd694"/>`),
    nightWindow: RWIN("#e5e7eb", `<rect x="113" y="31" width="90" height="50" fill="#26335f"/><path d="M180 38 a9 9 0 1 0 8 13 a7 7 0 1 1 -8 -13z" fill="#ffd166"/><g fill="#fff"><circle cx="126" cy="42" r="1.4"/><circle cx="144" cy="64" r="1.4"/><circle cx="196" cy="68" r="1.4"/><circle cx="170" cy="40" r="1.2"/></g>`),
    rainWindow: RWIN("#fff", `<rect x="113" y="31" width="90" height="50" fill="#8da2b8"/><g stroke="#dbeafe" stroke-width="1.8" stroke-linecap="round">${rep(12, (i) => `<path d="M${120 + i * 7} ${36 + (i % 3) * 8} l-3 8"/>`)}</g><g fill="#6b7a8c"><ellipse cx="140" cy="40" rx="16" ry="6"/><ellipse cx="180" cy="38" rx="14" ry="5"/></g>`),
    snowWindow: RWIN("#fff", `<rect x="113" y="31" width="90" height="50" fill="#dbeafe"/><rect x="113" y="70" width="90" height="11" fill="#fff"/><g fill="#fff" stroke="#bfdbfe" stroke-width=".6">${rep(14, (i) => `<circle cx="${118 + ((i * 29) % 82)}" cy="${34 + ((i * 17) % 34)}" r="2.2"/>`)}</g>`),
    sunsetWindow: { layer: "window", view: "104 22 108 68", svg: `<defs><linearGradient id="kaSunW" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a78bfa"/><stop offset=".6" stop-color="#f58bb0"/><stop offset="1" stop-color="#ffb36b"/></linearGradient></defs><rect x="108" y="26" width="100" height="60" rx="4" fill="#fff"/><rect x="113" y="31" width="90" height="50" fill="url(#kaSunW)"/><path d="M144 81 a16 16 0 0 1 32 0z" fill="#ffe29a"/><rect x="156" y="31" width="4" height="50" fill="#fff"/><rect x="113" y="54" width="90" height="4" fill="#fff"/>` },
    curtainWindow: RWIN("#b9824f", `<circle cx="184" cy="42" r="6" fill="#fde047"/><path d="M113 31 q18 6 14 50 h-14z" fill="#f9a8d4"/><path d="M203 31 q-18 6 -14 50 h14z" fill="#f9a8d4"/><path d="M113 31 v50 M120 33 v48" stroke="#f472b6" stroke-width="2"/><path d="M203 31 v50 M196 33 v48" stroke="#f472b6" stroke-width="2"/><rect x="108" y="26" width="100" height="5" rx="2" fill="#8a5a31"/>`, false),
    portholeWindow: { layer: "window", view: "104 22 108 68", svg: `<circle cx="158" cy="56" r="29" fill="#b9824f"/><circle cx="158" cy="56" r="23" fill="#8ed3f2"/><path d="M135 62 q6 -4 12 0 t12 0 t12 0 t12 0 V79 a23 23 0 0 1 -48 0z" fill="#3b9bd6" transform="translate(0 -4)"/><circle cx="166" cy="46" r="5" fill="#fde047"/><circle cx="158" cy="56" r="23" fill="none" stroke="#e0a21a" stroke-width="3"/>` },
    treeWindow: RWIN("#fff", `<path d="M113 81 Q140 62 170 74 Q190 66 203 74 V81Z" fill="#8fd694"/><rect x="146" y="52" width="9" height="28" fill="#8a5a31"/><circle cx="150" cy="46" r="16" fill="#3aa05b"/><circle cx="138" cy="52" r="10" fill="#2f8f4e"/><circle cx="162" cy="50" r="10" fill="#2f8f4e"/><g fill="#ef4444"><circle cx="146" cy="44" r="2"/><circle cx="156" cy="52" r="2"/></g>`),
    cityWindow: RWIN("#fff", `<rect x="113" y="31" width="90" height="50" fill="#f3b27a"/><g fill="#44506e"><rect x="118" y="52" width="14" height="29"/><rect x="134" y="42" width="16" height="39"/><rect x="152" y="58" width="12" height="23"/><rect x="166" y="46" width="18" height="35"/><rect x="186" y="56" width="14" height="25"/></g><g fill="#ffe29a"><rect x="121" y="58" width="3" height="3"/><rect x="127" y="66" width="3" height="3"/><rect x="138" y="48" width="3" height="3"/><rect x="143" y="58" width="3" height="3"/><rect x="171" y="52" width="3" height="3"/><rect x="177" y="62" width="3" height="3"/></g>`),
    seaWindow: RWIN("#fff", `<rect x="113" y="31" width="90" height="26" fill="#bfe9f7"/><rect x="113" y="54" width="90" height="27" fill="#3b9bd6"/><path d="M113 62 q8 -4 15 0 t15 0 t15 0 t15 0 t15 0 t15 0" stroke="#fff" stroke-width="1.8" fill="none" opacity=".7"/><path d="M168 54 V36 L184 52Z" fill="#fff"/><path d="M164 54 h24 l-4 6 h-16z" fill="#ef4444"/><circle cx="130" cy="42" r="5" fill="#fde047"/>`),

    /* hanging decor: two swags across the top */
    buntingDecor: RG(SWAG_STR("#6b7a75") + swag(9, (x, y, i) => `<path d="M${(x - 8).toFixed(1)} ${y.toFixed(1)} L${(x + 8).toFixed(1)} ${y.toFixed(1)} L${x.toFixed(1)} ${(y + 17).toFixed(1)}Z" fill="${COLS[i % 6]}"/>`)),
    heartDecor: RG(SWAG_STR("#cbd5e1") + swag(8, (x, y, i) => `<path d="${heartPath(+x.toFixed(1), +(y + 8).toFixed(1), 7)}" fill="${["#ef4444", "#f472b6", "#fb7185", "#f9a8d4"][i % 4]}"/>`)),
    starDecor: RG(SWAG_STR("#cbd5e1") + swag(8, (x, y, i) => `<polygon points="${starPts(+x.toFixed(1), +(y + 8).toFixed(1), 8, 3.4)}" fill="${["#fde047", "#fbbf24", "#fff3a8"][i % 3]}" stroke="#e0a21a" stroke-width="1"/>`)),
    lightDecor: RG(SWAG_STR("#374151") + swag(11, (x, y, i) => `<circle cx="${x.toFixed(1)}" cy="${(y + 5).toFixed(1)}" r="6" fill="${COLS[i % 6]}" opacity=".35"/><circle cx="${x.toFixed(1)}" cy="${(y + 5).toFixed(1)}" r="3.4" fill="${COLS[i % 6]}"/>`)),
    chainDecor: RG(swag(14, (x, y, i) => `<ellipse cx="${x.toFixed(1)}" cy="${(y + 3).toFixed(1)}" rx="6.5" ry="3.6" fill="none" stroke="${COLS[i % 6]}" stroke-width="2.6"/>`)),
    leafDecor: RG(SWAG_STR("#4fae6a") + swag(12, (x, y, i) => `<ellipse cx="${x.toFixed(1)}" cy="${(y + 7).toFixed(1)}" rx="3.6" ry="8" fill="${i % 2 ? "#3aa05b" : "#6fbf73"}" transform="rotate(${i % 2 ? 22 : -22} ${x.toFixed(1)} ${(y + 3).toFixed(1)})"/>`)),
    pomDecor: RG(SWAG_STR("#cbd5e1") + swag(9, (x, y, i) => `<circle cx="${x.toFixed(1)}" cy="${(y + 7).toFixed(1)}" r="6.4" fill="${COLS[i % 6]}"/><circle cx="${(x - 2).toFixed(1)}" cy="${(y + 5).toFixed(1)}" r="1.8" fill="#fff" opacity=".6"/>`)),
    craneDecor: RG(swag(7, (x, y, i) => `<path d="M${x.toFixed(1)} ${y.toFixed(1)} v8" stroke="#cbd5e1" stroke-width="1.6"/><path d="M${(x - 8).toFixed(1)} ${(y + 8).toFixed(1)} L${(x + 8).toFixed(1)} ${(y + 8).toFixed(1)} L${x.toFixed(1)} ${(y + 22).toFixed(1)}Z" fill="${COLS[i % 6]}"/><path d="M${(x - 8).toFixed(1)} ${(y + 8).toFixed(1)} L${x.toFixed(1)} ${(y + 22).toFixed(1)} L${(x - 2).toFixed(1)} ${(y + 8).toFixed(1)}Z" fill="#fff" opacity=".35"/>`)),
    snowDecor: RG(swag(8, (x, y, i) => `<g stroke="#7dd3fc" stroke-width="2" stroke-linecap="round" transform="translate(${x.toFixed(1)} ${(y + 8).toFixed(1)})"><path d="M0 -8 V8 M-7 -4 L7 4 M-7 4 L7 -4"/></g><path d="M${x.toFixed(1)} ${y.toFixed(1)} v0" stroke="#7dd3fc"/>`)),
    streamerDecor: RG(rep(9, (i) => { const x = 14 + i * 36; const c = COLS[i % 6]; return `<path d="M${x} 0 q8 8 0 16 t0 16 t0 12" stroke="${c}" stroke-width="3.4" fill="none" stroke-linecap="round"/>`; })),

    /* pets: they sit on the floor to the right of the koala */
    catPet: RPET(`<path d="M252 200 q14 -2 10 -18" stroke="#f59e0b" stroke-width="5" fill="none" stroke-linecap="round"/><ellipse cx="238" cy="194" rx="13" ry="14" fill="#f59e0b"/><circle cx="238" cy="174" r="11" fill="#f59e0b"/><path d="M229 168 l-1 -10 l8 5z M247 168 l1 -10 l-8 5z" fill="#f59e0b"/><circle cx="234" cy="173" r="1.8" fill="#26332f"/><circle cx="242" cy="173" r="1.8" fill="#26332f"/><path d="M236 178 q2 2 4 0" stroke="#26332f" stroke-width="1.4" fill="none"/><path d="M232 190 h12 M232 196 h12" stroke="#d97706" stroke-width="2"/><ellipse cx="238" cy="206" rx="13" ry="3.5" fill="#fde7c4"/>`),
    dogPet: RPET(`<ellipse cx="238" cy="196" rx="14" ry="12" fill="#c97b3a"/><circle cx="238" cy="176" r="12" fill="#c97b3a"/><ellipse cx="226" cy="178" rx="5" ry="9" fill="#8a5a31"/><ellipse cx="250" cy="178" rx="5" ry="9" fill="#8a5a31"/><ellipse cx="238" cy="181" rx="6" ry="4.6" fill="#f3d9b8"/><circle cx="238" cy="179" r="2" fill="#26332f"/><circle cx="233" cy="174" r="1.8" fill="#26332f"/><circle cx="243" cy="174" r="1.8" fill="#26332f"/><path d="M238 184 v4" stroke="#ef4444" stroke-width="3" stroke-linecap="round"/><path d="M252 200 q10 -6 8 -16" stroke="#c97b3a" stroke-width="4" fill="none" stroke-linecap="round"/><ellipse cx="238" cy="207" rx="14" ry="3.5" fill="#a8602a"/>`),
    bunnyPet: RPET(`<ellipse cx="238" cy="196" rx="13" ry="12" fill="#fff" stroke="#e5e7eb" stroke-width="1.6"/><circle cx="238" cy="178" r="10" fill="#fff" stroke="#e5e7eb" stroke-width="1.6"/><ellipse cx="232" cy="162" rx="3.6" ry="11" fill="#fff" stroke="#e5e7eb" stroke-width="1.6"/><ellipse cx="244" cy="162" rx="3.6" ry="11" fill="#fff" stroke="#e5e7eb" stroke-width="1.6"/><ellipse cx="232" cy="163" rx="1.6" ry="7" fill="#fbcfe8"/><ellipse cx="244" cy="163" rx="1.6" ry="7" fill="#fbcfe8"/><circle cx="234" cy="177" r="1.6" fill="#26332f"/><circle cx="242" cy="177" r="1.6" fill="#26332f"/><circle cx="238" cy="181" r="1.8" fill="#f472b6"/><circle cx="251" cy="202" r="4" fill="#fff" stroke="#e5e7eb" stroke-width="1.4"/>`),
    fishBowlPet: RPET(`<circle cx="238" cy="190" r="17" fill="rgba(147,197,253,.4)" stroke="#60a5fa" stroke-width="2.4"/><path d="M222 190 q4 -3 8 0 t8 0 t8 0 t8 0" stroke="#fff" stroke-width="1.6" fill="none" opacity=".8"/><ellipse cx="236" cy="192" rx="7" ry="4.6" fill="#f97316"/><path d="M243 192 l6 -4 v8z" fill="#f97316"/><circle cx="232" cy="191" r="1.2" fill="#fff"/><g fill="#fff" opacity=".7"><circle cx="246" cy="180" r="1.6"/><circle cx="248" cy="175" r="1.2"/></g><g fill="#a78bfa"><circle cx="228" cy="203" r="2.2"/><circle cx="236" cy="205" r="2.2"/><circle cx="244" cy="203" r="2.2"/></g><path d="M222 177 q16 -6 32 0" stroke="#fff" stroke-width="2" fill="none" opacity=".6"/>`),
    turtlePet: RPET(`<path d="M222 200 a16 14 0 0 1 32 0z" fill="#4fae6a" stroke="#2f8f4e" stroke-width="2"/><path d="M230 200 q0 -10 8 -12 q8 2 8 12 M238 188 v12" stroke="#2f8f4e" stroke-width="1.8" fill="none"/><ellipse cx="256" cy="199" rx="7" ry="5.4" fill="#8fd694"/><circle cx="258" cy="197" r="1.4" fill="#26332f"/><ellipse cx="228" cy="204" rx="5" ry="3.4" fill="#8fd694"/><ellipse cx="246" cy="204" rx="5" ry="3.4" fill="#8fd694"/><path d="M220 200 l-6 2 l6 1z" fill="#8fd694"/>`),
    parrotPet: RPET(`<path d="M222 204 H254" stroke="#8a5a31" stroke-width="4" stroke-linecap="round"/><path d="M238 204 V208" stroke="#8a5a31" stroke-width="4"/><ellipse cx="238" cy="190" rx="9" ry="15" fill="#ef4444"/><circle cx="238" cy="172" r="8" fill="#ef4444"/><path d="M243 172 l7 3 l-6 3z" fill="#fbbf24"/><circle cx="236" cy="171" r="1.8" fill="#fff"/><circle cx="236" cy="171" r=".9" fill="#26332f"/><path d="M230 186 q-6 8 0 16 q6 -6 4 -14z" fill="#3b82f6"/><path d="M236 202 l-2 8 M240 202 l2 8" stroke="#3b82f6" stroke-width="3" stroke-linecap="round"/>`),
    hedgehogPet: RPET(`<path d="M220 200 q0 -26 20 -26 q18 0 20 26z" fill="#8a6a52"/>${rep(9, (i) => `<path d="M${224 + i * 4} ${190 - (i % 3) * 3} l-2 -8 l4 6z" fill="#6b4f3a"/>`)}<ellipse cx="256" cy="200" rx="8" ry="6" fill="#f0d6bf"/><circle cx="260" cy="198" r="1.6" fill="#26332f"/><circle cx="263" cy="200" r="1.8" fill="#26332f"/><ellipse cx="236" cy="204" rx="5" ry="2.6" fill="#f0d6bf"/>`),
    ducklingPet: RPET(`<ellipse cx="238" cy="196" rx="14" ry="11" fill="#fde047"/><circle cx="244" cy="180" r="10" fill="#fde047"/><path d="M252 181 l8 2 l-8 3z" fill="#f97316"/><circle cx="246" cy="178" r="1.8" fill="#26332f"/><path d="M226 194 q-8 -2 -10 -8 q8 0 10 8z" fill="#fbbf24"/><path d="M232 205 l-1 4 M244 205 l1 4" stroke="#f97316" stroke-width="3" stroke-linecap="round"/>`),
    frogPet: RPET(`<ellipse cx="238" cy="196" rx="15" ry="11" fill="#3fb06a"/><circle cx="230" cy="184" r="6" fill="#3fb06a"/><circle cx="246" cy="184" r="6" fill="#3fb06a"/><circle cx="230" cy="183" r="3" fill="#fff"/><circle cx="246" cy="183" r="3" fill="#fff"/><circle cx="230" cy="183" r="1.4" fill="#26332f"/><circle cx="246" cy="183" r="1.4" fill="#26332f"/><path d="M230 196 q8 6 16 0" stroke="#2f8f4e" stroke-width="2" fill="none" stroke-linecap="round"/><ellipse cx="224" cy="206" rx="6" ry="3" fill="#2f8f4e"/><ellipse cx="252" cy="206" rx="6" ry="3" fill="#2f8f4e"/><circle cx="234" cy="190" r="1.4" fill="#2f8f4e"/>`),
    joeyPet: RPET(`<path d="M254 202 q10 -2 8 -12 q-8 4 -14 10z" fill="#b8763a"/><ellipse cx="238" cy="192" rx="12" ry="14" fill="#c97b3a"/><ellipse cx="238" cy="196" rx="7" ry="8" fill="#e6b27a"/><circle cx="238" cy="172" r="9" fill="#c97b3a"/><path d="M231 166 l-3 -12 l7 8z M245 166 l3 -12 l-7 8z" fill="#c97b3a"/><path d="M231 164 l-2 -7 l4 5z M245 164 l2 -7 l-4 5z" fill="#fbcfe8"/><circle cx="234" cy="171" r="1.6" fill="#26332f"/><circle cx="242" cy="171" r="1.6" fill="#26332f"/><ellipse cx="238" cy="176" rx="2.4" ry="1.8" fill="#26332f"/><ellipse cx="238" cy="207" rx="14" ry="3" fill="#a8602a"/>`),

    /* toys: on the floor to the left, in front of the desk */
    teddyToy: RT(`<circle cx="40" cy="170" r="6" fill="#b9824f"/><circle cx="64" cy="170" r="6" fill="#b9824f"/><circle cx="52" cy="178" r="13" fill="#c9915a"/><ellipse cx="52" cy="198" rx="13" ry="14" fill="#c9915a"/><ellipse cx="52" cy="199" rx="7" ry="9" fill="#ecc89a"/><ellipse cx="52" cy="182" rx="5" ry="3.6" fill="#ecc89a"/><circle cx="52" cy="181" r="1.8" fill="#26332f"/><circle cx="47" cy="176" r="1.5" fill="#26332f"/><circle cx="57" cy="176" r="1.5" fill="#26332f"/><circle cx="38" cy="196" r="5" fill="#c9915a"/><circle cx="66" cy="196" r="5" fill="#c9915a"/><path d="M44 189 L60 189 L52 193Z" fill="#ef4444"/>`),
    ballToy: RT(`<circle cx="52" cy="190" r="17" fill="#fff" stroke="#e5e7eb" stroke-width="1.6"/><path d="M52 173 a17 17 0 0 1 14 8 L52 190Z" fill="#ef4444"/><path d="M66 181 a17 17 0 0 1 3 14 L52 190Z" fill="#fbbf24"/><path d="M52 190 L69 195 a17 17 0 0 1 -12 12Z" fill="#3b82f6"/><path d="M52 190 L45 206 a17 17 0 0 1 -12 -14Z" fill="#3fb984"/><circle cx="52" cy="190" r="3.4" fill="#fff"/>`),
    blocksToy: RT(`<g stroke="#fff" stroke-width="1.6"><rect x="30" y="192" width="18" height="18" fill="#ef4444"/><rect x="50" y="192" width="18" height="18" fill="#3b82f6"/><rect x="40" y="174" width="18" height="18" fill="#fbbf24"/></g><g fill="#fff" font-family="Arial, sans-serif" font-weight="800" font-size="12" text-anchor="middle"><text x="39" y="206">A</text><text x="59" y="206">B</text><text x="49" y="188">C</text></g>`),
    carToy: RT(`<path d="M24 200 q0 -6 6 -8 l8 -10 q3 -3 8 -3 h14 q5 0 8 4 l8 9 q6 1 6 8 v4 H24z" fill="#ef4444"/><path d="M40 186 h10 v10 H34z M54 186 h8 l6 10 H54z" fill="#bfe3ff"/><circle cx="38" cy="206" r="7" fill="#374151"/><circle cx="66" cy="206" r="7" fill="#374151"/><circle cx="38" cy="206" r="3" fill="#cbd5e1"/><circle cx="66" cy="206" r="3" fill="#cbd5e1"/>`),
    robotToy: RT(`<path d="M52 166 v-6" stroke="#6b7a75" stroke-width="2.6"/><circle cx="52" cy="159" r="3.4" fill="#ef4444"/><rect x="38" y="166" width="28" height="22" rx="5" fill="#cbd5e1" stroke="#94a3b8" stroke-width="1.6"/><circle cx="46" cy="176" r="3.6" fill="#38bdf8"/><circle cx="58" cy="176" r="3.6" fill="#38bdf8"/><path d="M45 183 h14" stroke="#6b7a75" stroke-width="2"/><rect x="34" y="190" width="36" height="20" rx="4" fill="#94a3b8"/><circle cx="52" cy="200" r="4" fill="#fbbf24"/><rect x="26" y="192" width="8" height="14" rx="3" fill="#cbd5e1"/><rect x="70" y="192" width="8" height="14" rx="3" fill="#cbd5e1"/>`),
    drumToy: RT(`<ellipse cx="52" cy="184" rx="22" ry="7" fill="#fde7d0" stroke="#ef4444" stroke-width="2"/><path d="M30 184 v20 q22 10 44 0 v-20 q-22 8 -44 0z" fill="#ef4444"/><path d="M34 188 l9 14 l9 -14 l9 14 l9 -14" stroke="#fde7d0" stroke-width="2" fill="none"/><path d="M42 178 l-8 -14 M62 178 l8 -14" stroke="#c9915a" stroke-width="3" stroke-linecap="round"/><circle cx="33" cy="162" r="3" fill="#c9915a"/><circle cx="71" cy="162" r="3" fill="#c9915a"/>`),
    horseToy: RT(`<path d="M24 208 Q52 220 80 208" stroke="#b9824f" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M34 190 q-4 -18 12 -22 l6 -8 l4 8 q14 2 14 12 q2 10 -4 20 l-4 8 l-4 -8 h-12 l-4 8 l-4 -8z" fill="#c9915a"/><path d="M46 168 q-8 2 -10 10" stroke="#6b3d1c" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="58" cy="172" r="1.6" fill="#26332f"/><path d="M42 188 h22 v6 h-22z" fill="#ef4444"/>`),
    trainToy: RT(`<rect x="22" y="188" width="30" height="16" rx="3" fill="#3b82f6"/><rect x="26" y="178" width="14" height="10" fill="#2563eb"/><rect x="44" y="172" width="8" height="16" fill="#374151"/><rect x="56" y="192" width="22" height="12" rx="2" fill="#fbbf24"/><path d="M52 198 h4" stroke="#374151" stroke-width="3"/><g fill="#374151"><circle cx="30" cy="206" r="5"/><circle cx="46" cy="206" r="5"/><circle cx="64" cy="206" r="5"/><circle cx="74" cy="206" r="5"/></g><g fill="#e5e7eb" opacity=".8"><circle cx="48" cy="166" r="3"/><circle cx="53" cy="160" r="2.4"/></g>`),
    dinoToy: RT(`<ellipse cx="50" cy="196" rx="18" ry="11" fill="#3fb06a"/><path d="M62 190 q10 -4 10 -16" stroke="#3fb06a" stroke-width="8" fill="none" stroke-linecap="round"/><circle cx="73" cy="172" r="7" fill="#3fb06a"/><circle cx="75" cy="170" r="1.6" fill="#fff"/><rect x="38" y="202" width="7" height="9" rx="2" fill="#2f8f4e"/><rect x="56" y="202" width="7" height="9" rx="2" fill="#2f8f4e"/><path d="M26 198 q-10 0 -12 8 q12 -2 16 -6z" fill="#3fb06a"/><path d="M40 187 l3 -7 l3 7 M50 185 l3 -7 l3 7" fill="#fbbf24"/>`),
    giftToy: RT(`<rect x="30" y="184" width="44" height="26" rx="2" fill="#ef4444"/><rect x="28" y="176" width="48" height="10" rx="2" fill="#dc2626"/><rect x="48" y="176" width="8" height="34" fill="#fde047"/><path d="M52 176 q-14 -14 -10 -4 q6 4 10 4 q4 0 10 -4 q4 -10 -10 4z" fill="#fde047" stroke="#e0a21a" stroke-width="1.4"/>`),
  });

  // Draw order inside the room: back to front.
  const ROOM_ORDER = ["wall", "garland", "window", "poster", "shelf", "lamp", "rug", "desk", "toy"];
  const ROOM_SLOT_LAYER = { wallpaper: "wall", rug: "rug", poster: "poster", desk: "desk", lamp: "lamp", shelf: "shelf", plant: "plant", window: "window", garland: "garland", pet: "pet", toy: "toy" };
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
    // Studio preview: a soft shadow on the floor so the koala stands on the
    // ground instead of hovering in front of the wall.
    if (o.shadow) parts.push('<ellipse cx="160" cy="182" rx="42" ry="5.5" fill="#000" opacity=".16"/>');
    parts.push(koala);
    if (byLayer.pet) parts.push(`<g data-item="${byLayer.pet}">${roomItem(byLayer.pet)}</g>`);
    if (byLayer.plant) parts.push(`<g data-item="${byLayer.plant}">${roomItem(byLayer.plant)}</g>`);
    const label = o.label ? ` role="img" aria-label="${String(o.label).replace(/"/g, "&quot;")}"` : ` aria-hidden="true"`;
    // opts.view crops the scene (e.g. zoom in on the koala); default: the whole room.
    return `<svg class="koala-room-svg" viewBox="${o.view || ROOM_VIEW}" xmlns="http://www.w3.org/2000/svg"${label} focusable="false">${parts.join("")}</svg>`;
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

  // Tight per-item bounding boxes "x y w h", measured from the artwork itself
  // (see tests/ — regenerated whenever art changes).
  const ICON_VIEW = {
    blueCap: "45 18 110 57",
    gradHat: "47 23 106 48",
    crown: "59 19 82 41",
    roundGlasses: "53 60 94 32",
    sunglasses: "51 64 98 32",
    redScarf: "55 114 90 61",
    heroCape: "19 111 162 92",
    headphones: "38 33 125 56",
    backpack: "33 101 134 92",
    partyHat: "71 -3 58 64",
    flowerCrown: "55 34 90 29",
    wizardHat: "45 4 110 64",
    starGlasses: "51 56 98 37",
    bowTie: "73 109 54 34",
    goldMedal: "79 113 42 61",
    santaHat: "53 17 107 49",
    surfboard: "125 40 79 158",
    beanie: "52 8 96 61",
    cowboyHat: "33 23 134 45",
    chefHat: "58 5 84 58",
    bunnyEars: "59 -1 82 59",
    heartGlasses: "51 64 98 27",
    catEyeGlasses: "49 57 102 36",
    goggles: "43 59 114 34",
    eyePatch: "49 53 102 38",
    moustache: "65 100 70 19",
    freckles: "58 88 28 22",
    monocle: "101 59 39 80",
    tshirt: "48 123 104 67",
    hoodie: "48 121 104 69",
    stripeShirt: "37 123 126 67",
    pinkDress: "45 113 110 81",
    labCoat: "48 123 104 67",
    overalls: "48 119 104 71",
    jersey: "45 123 110 67",
    balloon: "148 30 40 127",
    magicWand: "152 74 47 83",
    umbrella: "147 55 44 120",
    guitar: "91 80 95 123",
    storyBook: "71 143 58 42",
    camera: "117 133 50 42",
    soccerBall: "148 156 40 40",
    pearlNecklace: "59 113 82 30",
    goldChain: "63 117 74 22",
    heartPendant: "63 117 74 40",
    starPendant: "63 117 74 44",
    diamondPendant: "63 117 74 50",
    goldEarrings: "30 78 20 32",
    hoopEarrings: "26 86 24 24",
    friendshipBracelet: "40 138 22 16",
    rubyBrooch: "63 129 30 32",
    hairClip: "109 36 38 32",
    sneakers: "49 167 103 28",
    boots: "49 159 102 36",
    rainBoots: "49 159 102 36",
    flipFlops: "48 172 104 25",
    slippers: "48 166 104 32",
    balletShoes: "49 163 102 33",
    soccerBoots: "49 167 103 32",
    rollerSkates: "49 165 103 38",
    sparkleShoes: "49 167 103 28",
    snowBoots: "48 155 104 40",
  };

  // Item-only picture for small shop cards: no koala, just the thing.
  function itemIcon(id) {
    if (ROOM_ART[id]) {
      const a = ROOM_ART[id];
      if (a.layer === "wall") return `<svg class="koala-icon-svg" viewBox="0 0 320 150" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${a.svg}</svg>`;
      return `<svg class="koala-icon-svg" viewBox="${a.view}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${a.svg}</svg>`;
    }
    const art = ART[id];
    if (!art) return "";
    const vb = ICON_VIEW[id] || (art.view === "head" ? HEAD_VIEW : FULL_VIEW);
    return `<svg class="koala-icon-svg" viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${art.back || ""}${art.front || ""}</svg>`;
  }

  // "After wearing" picture: the koala as it looks now with this item swapped
  // in (room items: the room with the item placed in it).
  function previewFor(id, equipped, roomEquipped, slot) {
    if (ROOM_ART[id]) {
      return room(Object.assign({}, roomEquipped || {}, { [slot]: id }), equipped || {});
    }
    const art = ART[id];
    if (!art) return "";
    return avatar(Object.assign({}, equipped || {}, { [SLOT_OF[id]]: id }), { view: art.view === "head" ? "head" : "full" });
  }

  return { avatar, room, itemPicture, itemIcon, previewFor, artIds: () => Object.keys(ART), hasArt: (id) => !!ART[id] || !!ROOM_ART[id] };
});
