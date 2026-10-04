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
  });

  /* ---------- Sub-items: art for what sits on / in a room item ----------
     Things on a desk or in a toy box are drawn in a 20 x 24 box standing on y = 24;
     frame pictures in 56 x 40; books are drawn by bookSvg(). */
  const TOY_ART = {
    toyTeddy: `<circle cx="4.5" cy="4.5" r="2.6" fill="#b9824f"/><circle cx="15.5" cy="4.5" r="2.6" fill="#b9824f"/><circle cx="10" cy="8" r="6.4" fill="#c9915a"/><ellipse cx="10" cy="19" rx="6.6" ry="5.2" fill="#c9915a"/><ellipse cx="10" cy="10" rx="2.8" ry="2.1" fill="#f3d9b8"/><circle cx="7.6" cy="7" r=".9" fill="#26332f"/><circle cx="12.4" cy="7" r=".9" fill="#26332f"/><circle cx="10" cy="9.4" r=".9" fill="#26332f"/>`,
    toyBall: `<circle cx="10" cy="14.5" r="9.5" fill="#fff" stroke="#e5e7eb"/><path d="M10 5 a9.5 9.5 0 0 1 8 6 L10 14.5Z" fill="#ef4444"/><path d="M18.5 15 a9.5 9.5 0 0 1 -4 7 L10 14.5Z" fill="#3b82f6"/><path d="M1.5 14 a9.5 9.5 0 0 1 3 -6 L10 14.5Z" fill="#fbbf24"/>`,
    toyCar: `<path d="M1 22 q0 -4 3 -5 l3 -4 q1.4 -1.6 4 -1.6 h3.4 q2.2 0 3.6 1.8 l2 3.4 q2 .6 2 3.8 v2.6 H1z" fill="#ef4444"/><path d="M7.6 14.4 h4 v3.4 H5.4z M13 14.4 h2 l2.4 3.4 H13z" fill="#bfe3ff"/><circle cx="6" cy="22" r="2.2" fill="#26332f"/><circle cx="15" cy="22" r="2.2" fill="#26332f"/>`,
    toyRobot: `<path d="M10 1 v3" stroke="#6b7a75" stroke-width="1.2"/><circle cx="10" cy="1.4" r="1.3" fill="#ef4444"/><rect x="4.5" y="4" width="11" height="8" rx="2" fill="#cbd5e1" stroke="#94a3b8" stroke-width=".8"/><circle cx="8" cy="8" r="1.4" fill="#38bdf8"/><circle cx="12" cy="8" r="1.4" fill="#38bdf8"/><rect x="5.5" y="13" width="9" height="8" rx="1.6" fill="#94a3b8"/><rect x="2.5" y="13.4" width="2.4" height="6" rx="1" fill="#cbd5e1"/><rect x="15.1" y="13.4" width="2.4" height="6" rx="1" fill="#cbd5e1"/><rect x="6.4" y="21" width="2.8" height="3" fill="#6b7a75"/><rect x="10.8" y="21" width="2.8" height="3" fill="#6b7a75"/>`,
    toyDino: `<ellipse cx="9" cy="17.5" rx="7" ry="5.5" fill="#3fb06a"/><path d="M13.5 14 q4 -2 3.4 -8" stroke="#3fb06a" stroke-width="3.6" fill="none" stroke-linecap="round"/><circle cx="17" cy="5.2" r="3.2" fill="#3fb06a"/><circle cx="17.6" cy="4.6" r=".7" fill="#26332f"/><path d="M5 12.6 l1.6 -2.6 l1.6 2.6 M8.6 12 l1.6 -2.6 l1.6 2.6" fill="#2f8f4e"/><rect x="5" y="21" width="2.8" height="3" fill="#2f8f4e"/><rect x="10.4" y="21" width="2.8" height="3" fill="#2f8f4e"/><path d="M2.4 18 q-2 1 -1.8 3.4" stroke="#3fb06a" stroke-width="2.6" fill="none" stroke-linecap="round"/>`,
    toyBlocks: `<g stroke="#fff" stroke-width=".8"><rect x="1" y="16" width="8" height="8" fill="#ef4444"/><rect x="10" y="16" width="8" height="8" fill="#3b82f6"/><rect x="5.5" y="8" width="8" height="8" fill="#fbbf24"/></g><text x="5.2" y="23" font-family="Arial,sans-serif" font-weight="800" font-size="6" fill="#fff">A</text>`,
    toyDuck: `<ellipse cx="9" cy="18.5" rx="7.4" ry="5.5" fill="#fde047"/><circle cx="13" cy="9" r="5" fill="#fde047"/><path d="M16.6 9.4 l3.2 1 l-3.2 1.4z" fill="#f97316"/><circle cx="14" cy="8" r=".9" fill="#26332f"/><path d="M4 18 q4 4 8 0" fill="none" stroke="#f5c400" stroke-width="1.2"/>`,
    toyRocket: `<path d="M10 1 q5 5 4.4 14 H5.6 Q5 6 10 1z" fill="#f8fafc" stroke="#cbd5e1" stroke-width=".8"/><circle cx="10" cy="9" r="2.2" fill="#38bdf8"/><path d="M5.6 12 l-3.4 5.4 l3.6 -1z M14.4 12 l3.4 5.4 l-3.6 -1z" fill="#ef4444"/><path d="M7.4 15 h5.2 l-1.4 4 q-1.2 2.4 -2.4 0z" fill="#f97316"/><path d="M8.2 20 h3.6 l-1.8 4z" fill="#fde047"/>`,
    toyBunny: `<ellipse cx="7" cy="4.5" rx="1.8" ry="4.4" fill="#f1f5f9" stroke="#e2e8f0" stroke-width=".6"/><ellipse cx="13" cy="4.5" rx="1.8" ry="4.4" fill="#f1f5f9" stroke="#e2e8f0" stroke-width=".6"/><circle cx="10" cy="11" r="5" fill="#f1f5f9" stroke="#e2e8f0" stroke-width=".6"/><ellipse cx="10" cy="19.2" rx="5.8" ry="4.8" fill="#f1f5f9" stroke="#e2e8f0" stroke-width=".6"/><circle cx="8.2" cy="10.4" r=".8" fill="#26332f"/><circle cx="11.8" cy="10.4" r=".8" fill="#26332f"/><circle cx="10" cy="12.2" r=".9" fill="#f9a8d4"/><circle cx="14.6" cy="22" r="1.8" fill="#fff"/>`,
    toyDrum: `<ellipse cx="10" cy="11" rx="8.4" ry="3" fill="#fde7d0" stroke="#ef4444" stroke-width="1.2"/><path d="M1.6 11 v9 q8.4 5 16.8 0 v-9 q-8.4 4.4 -16.8 0z" fill="#ef4444"/><path d="M4 14 l3 6 M10 15 v7 M16 14 l-3 6" stroke="#fff" stroke-width=".8" fill="none"/><path d="M5 2 l5 7 M15 2 l-5 7" stroke="#b9824f" stroke-width="1.4" stroke-linecap="round"/>`,
  };
  const DESK_ART = {
    pencilCup: `<path d="M4 24 h12 l-1.2 -11 H5.2z" fill="#60a5fa"/><path d="M7 13 V5" stroke="#ef4444" stroke-width="2.2" stroke-linecap="round"/><path d="M10 13 V2" stroke="#fbbf24" stroke-width="2.2" stroke-linecap="round"/><path d="M13 13 V4" stroke="#3fb984" stroke-width="2.2" stroke-linecap="round"/>`,
    miniGlobe: `<circle cx="10" cy="9" r="7.4" fill="#5aa9e6"/><path d="M5 6 q4 -3 6 1 q-1 4 -4 4 q-3 -1 -2 -5z M12 11 q3 -1 4 2 q-3 2 -4 -2z" fill="#5fb878"/><path d="M3 9 a7 7 0 0 0 14 0" fill="none" stroke="#b9824f" stroke-width="1.2"/><rect x="9" y="16" width="2" height="4" fill="#b9824f"/><rect x="5.5" y="20" width="9" height="4" rx="1.5" fill="#9a6a3d"/>`,
    alarmClock: `<circle cx="5" cy="4" r="2.6" fill="#ef4444"/><circle cx="15" cy="4" r="2.6" fill="#ef4444"/><circle cx="10" cy="14" r="8.4" fill="#fff" stroke="#ef4444" stroke-width="2"/><path d="M10 14 V9 M10 14 L13.4 15.6" stroke="#26332f" stroke-width="1.4" stroke-linecap="round"/><path d="M4 22 l-1.6 2 M16 22 l1.6 2" stroke="#ef4444" stroke-width="1.6" stroke-linecap="round"/>`,
    miniCactus: `<rect x="7.4" y="3" width="5.2" height="15" rx="2.6" fill="#4fae6a"/><path d="M7.4 11 h-2.4 q-1.6 0 -1.6 -1.8 V7" stroke="#4fae6a" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M12.6 9 h2.4 q1.6 0 1.6 -1.8 V5" stroke="#4fae6a" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="10" cy="3" r="1.4" fill="#f472b6"/><path d="M4 17 h12 l-1.4 7 H5.4z" fill="#d97a4a"/><rect x="3.4" y="16" width="13.2" height="2.6" rx="1" fill="#c4683a"/>`,
    notebooks: `<rect x="1.5" y="17" width="17" height="6.4" rx="1" fill="#3b82f6"/><rect x="3" y="11" width="14" height="6.4" rx="1" fill="#ef4444"/><rect x="2" y="5" width="16" height="6.4" rx="1" fill="#3fb984"/><path d="M4 20 h6 M5 14 h6 M4 8 h6" stroke="#fff" stroke-width="1" stroke-linecap="round"/>`,
    cocoaMug: `<path d="M5 3 q-1.4 2 0 4 M9 2 q-1.4 2 0 4 M13 3 q-1.4 2 0 4" stroke="#cbd5e1" stroke-width="1.2" fill="none" stroke-linecap="round"/><rect x="3" y="9" width="12" height="14.6" rx="2.4" fill="#ec6b8a"/><path d="M15 12 q5 0 5 4.6 t-5 4.6" stroke="#ec6b8a" stroke-width="2.4" fill="none"/><ellipse cx="9" cy="9.4" rx="6" ry="1.8" fill="#7b4a2b"/>`,
    crayonBox: `<path d="M4.5 9 V4" stroke="#ef4444" stroke-width="2.4" stroke-linecap="round"/><path d="M8 9 V2" stroke="#3b82f6" stroke-width="2.4" stroke-linecap="round"/><path d="M11.5 9 V3" stroke="#3fb984" stroke-width="2.4" stroke-linecap="round"/><path d="M15 9 V5" stroke="#a78bfa" stroke-width="2.4" stroke-linecap="round"/><rect x="1.5" y="9" width="17" height="14.4" rx="1.6" fill="#fbbf24"/><rect x="4" y="13" width="12" height="6" rx="1" fill="#fff"/>`,
    stickerBook: `<rect x="2" y="2" width="16" height="21.4" rx="1.6" fill="#a78bfa"/><rect x="4" y="4.4" width="12" height="16.6" rx="1" fill="#fff"/><polygon points="${starPts(7.8, 9, 2.8, 1.2)}" fill="#fbbf24"/><polygon points="${starPts(13, 13.4, 2.6, 1.1)}" fill="#ef4444"/><polygon points="${starPts(8.4, 17.4, 2.4, 1)}" fill="#3b82f6"/>`,
    secretDiary: `<rect x="2.5" y="2" width="15" height="21.4" rx="1.6" fill="#7c3aed"/><rect x="2.5" y="2" width="3" height="21.4" rx="1" fill="#5b21b6"/><rect x="8.6" y="10" width="6" height="5.6" rx="1" fill="#fbbf24"/><path d="M10.4 10 v-1.8 a1.2 1.2 0 0 1 2.4 0 V10" stroke="#fbbf24" stroke-width="1" fill="none"/>`,
    marbleBag: `<path d="M5 8 q-3 4 -3 9 q0 6.4 8 6.4 t8 -6.4 q0 -5 -3 -9z" fill="#c9915a"/><path d="M5 8 h10 l1.2 -3 H3.8z" fill="#b9824f"/><circle cx="7.4" cy="17" r="2.2" fill="#38bdf8"/><circle cx="12.4" cy="16.4" r="2.2" fill="#ef4444"/><circle cx="10" cy="20.4" r="2.2" fill="#fde047"/>`,
  };
  const DRAWER_SUBS = ["crayonBox", "stickerBook", "secretDiary", "marbleBag"];
  const PIC_ART = {
    picMeadow: `<rect width="56" height="40" fill="#bfe3ff"/><circle cx="46" cy="9" r="5" fill="#fde047"/><path d="M0 30 q14 -10 28 -2 t28 -4 V40 H0z" fill="#6bc487"/><path d="M0 35 q18 -7 34 0 t22 -2 V40 H0z" fill="#4fae6a"/><circle cx="12" cy="30" r="2" fill="#f472b6"/><circle cx="24" cy="33" r="2" fill="#ef4444"/><circle cx="38" cy="31" r="2" fill="#fde047"/>`,
    picSea: `<rect width="56" height="40" fill="#cfeaff"/><circle cx="12" cy="9" r="5" fill="#fde047"/><rect y="22" width="56" height="18" fill="#3b82f6"/><path d="M0 26 q7 -4 14 0 t14 0 t14 0 t14 0" stroke="#93c5fd" stroke-width="1.6" fill="none"/><path d="M24 24 h16 l-3 7 H27z" fill="#b9824f"/><path d="M32 8 V24" stroke="#6b4a2b" stroke-width="1.4"/><path d="M33 9 L44 22 H33z" fill="#fff"/><path d="M31 12 L22 22 h9z" fill="#fecaca"/>`,
    picRainbow: `<rect width="56" height="40" fill="#d8efff"/><g fill="none" stroke-width="3.2"><path d="M6 36 a22 22 0 0 1 44 0" stroke="#ef4444"/><path d="M10 36 a18 18 0 0 1 36 0" stroke="#fbbf24"/><path d="M14 36 a14 14 0 0 1 28 0" stroke="#3fb984"/><path d="M18 36 a10 10 0 0 1 20 0" stroke="#3b82f6"/></g><ellipse cx="9" cy="35" rx="9" ry="5" fill="#fff"/><ellipse cx="47" cy="35" rx="9" ry="5" fill="#fff"/>`,
    picSpace: `<rect width="56" height="40" fill="#1f2a55"/><g fill="#fff"><circle cx="8" cy="8" r="1"/><circle cx="22" cy="5" r=".8"/><circle cx="46" cy="10" r="1"/><circle cx="36" cy="32" r=".9"/><circle cx="6" cy="32" r=".8"/></g><circle cx="38" cy="16" r="9" fill="#f59e0b"/><ellipse cx="38" cy="16" rx="14" ry="3.4" fill="none" stroke="#fde68a" stroke-width="1.6" transform="rotate(-18 38 16)"/><circle cx="14" cy="26" r="5" fill="#38bdf8"/><circle cx="12.6" cy="24.6" r="1.4" fill="#7dd3fc"/>`,
    picFlowers: `<rect width="56" height="40" fill="#fde7f0"/><path d="M0 34 H56 V40 H0z" fill="#6bc487"/><path d="M12 36 V22 M28 36 V16 M44 36 V24" stroke="#3fb984" stroke-width="1.6"/><circle cx="12" cy="20" r="5" fill="#ef4444"/><circle cx="12" cy="20" r="2" fill="#fde047"/><circle cx="28" cy="14" r="6" fill="#f472b6"/><circle cx="28" cy="14" r="2.4" fill="#fde047"/><circle cx="44" cy="22" r="5" fill="#fbbf24"/><circle cx="44" cy="22" r="2" fill="#b45309"/>`,
    picKoala: `<rect width="56" height="40" fill="#d6f2e6"/><rect x="24" y="0" width="8" height="40" fill="#9a6a3d"/><path d="M32 8 q14 -2 20 6 M24 24 q-12 -2 -18 4" stroke="#4fae6a" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="21" cy="11" r="3.8" fill="#a9b6b1"/><circle cx="35" cy="11" r="3.8" fill="#a9b6b1"/><ellipse cx="28" cy="31" rx="8" ry="7" fill="#a9b6b1"/><circle cx="28" cy="18" r="7.4" fill="#a9b6b1"/><ellipse cx="28" cy="20.4" rx="2.4" ry="3" fill="#26332f"/><circle cx="24.6" cy="16.4" r="1" fill="#26332f"/><circle cx="31.4" cy="16.4" r="1" fill="#26332f"/>`,
    picNight: `<rect width="56" height="40" fill="#26335f"/><path d="M12 6 a6 6 0 1 0 6 8 a5 5 0 1 1 -6 -8z" fill="#fde68a"/><g fill="#fff"><circle cx="30" cy="8" r="1"/><circle cx="42" cy="14" r="1.2"/><circle cx="48" cy="6" r=".8"/><circle cx="36" cy="22" r=".9"/><circle cx="8" cy="22" r=".8"/></g><path d="M0 34 q16 -8 30 -2 t26 -4 V40 H0z" fill="#1b2548"/>`,
    picBeach: `<rect width="56" height="40" fill="#d6f0ff"/><circle cx="46" cy="8" r="5" fill="#fde047"/><rect y="20" width="56" height="9" fill="#38bdf8"/><path d="M0 28 q28 -6 56 0 V40 H0z" fill="#f6e3b0"/><path d="M18 36 Q20 20 16 10" stroke="#9a6a3d" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M16 10 q-8 -2 -10 4 M16 10 q2 -8 10 -6 M16 10 q8 0 10 6 M16 10 q-6 4 -6 10" stroke="#3fb984" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  };
  Object.assign(PIC_ART, {
    picCastle: `<rect width="56" height="40" fill="#cfe8ff"/><rect y="34" width="56" height="6" fill="#6bc487"/><rect x="17" y="17" width="22" height="19" fill="#c4b5fd"/><rect x="12" y="10" width="8" height="26" fill="#a78bfa"/><rect x="36" y="10" width="8" height="26" fill="#a78bfa"/><path d="M10 10 L16 2 L22 10z M34 10 L40 2 L46 10z" fill="#ef4444"/><path d="M24 36 v-8 a4 4 0 0 1 8 0 v8z" fill="#7c3aed"/><path d="M16 2 v-2 M40 2 v-2" stroke="#26332f" stroke-width="1"/>`,
    picButterfly: `<rect width="56" height="40" fill="#fde7f0"/><path d="M0 34 H56 V40 H0z" fill="#6bc487"/><ellipse cx="22" cy="15" rx="9" ry="7" fill="#fb923c"/><ellipse cx="34" cy="15" rx="9" ry="7" fill="#fb923c"/><ellipse cx="24" cy="24" rx="6" ry="5" fill="#a78bfa"/><ellipse cx="32" cy="24" rx="6" ry="5" fill="#a78bfa"/><rect x="27" y="10" width="2.4" height="20" rx="1.2" fill="#26332f"/><circle cx="21" cy="14" r="2" fill="#fff"/><circle cx="35" cy="14" r="2" fill="#fff"/>`,
    picPuppy: `<rect width="56" height="40" fill="#fff3c4"/><ellipse cx="15" cy="22" rx="6" ry="11" fill="#8a5a31"/><ellipse cx="41" cy="22" rx="6" ry="11" fill="#8a5a31"/><circle cx="28" cy="21" r="13" fill="#c97b3a"/><ellipse cx="28" cy="27" rx="7.5" ry="5.6" fill="#f3d9b8"/><circle cx="28" cy="24.6" r="2.4" fill="#26332f"/><circle cx="22" cy="18" r="2" fill="#26332f"/><circle cx="34" cy="18" r="2" fill="#26332f"/><path d="M28 28 v5" stroke="#ef4444" stroke-width="3.4" stroke-linecap="round"/>`,
    picKitten: `<rect width="56" height="40" fill="#e6f4ff"/><path d="M14 18 L16 3 L26 12z M42 18 L40 3 L30 12z" fill="#f59e0b"/><path d="M17 12 L18 7 L22 11z M39 12 L38 7 L34 11z" fill="#fbcfe8"/><circle cx="28" cy="22" r="14" fill="#f59e0b"/><path d="M21 21 q3 -3 6 0 M29 21 q3 -3 6 0" stroke="#26332f" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M26 27 l2 2 l2 -2z" fill="#f472b6"/><path d="M12 25 h8 M12 29 h8 M36 25 h8 M36 29 h8" stroke="#fff" stroke-width="1"/>`,
    picMountain: `<rect width="56" height="40" fill="#d8efff"/><circle cx="46" cy="9" r="4.4" fill="#fde047"/><path d="M0 36 L18 8 L34 36z" fill="#6b7a99"/><path d="M22 36 L38 14 L56 36z" fill="#8a97b8"/><path d="M18 8 L13.6 15 L18 13 L22 16z" fill="#fff"/><path d="M38 14 L34 20 L38 18.4 L42 21z" fill="#fff"/><rect y="34" width="56" height="6" fill="#6bc487"/>`,
    picDinoPic: `<rect width="56" height="40" fill="#e5f7d4"/><rect y="34" width="56" height="6" fill="#a3d977"/><path d="M8 30 L2 26 L10 24z" fill="#3fb984"/><ellipse cx="24" cy="27" rx="14" ry="8.4" fill="#3fb984"/><path d="M30 24 Q40 20 38 10" stroke="#3fb984" stroke-width="7" fill="none" stroke-linecap="round"/><ellipse cx="41" cy="9" rx="7" ry="5" fill="#3fb984"/><circle cx="43" cy="7.6" r="1.4" fill="#26332f"/><rect x="15" y="32" width="5" height="6" rx="1.6" fill="#2f8f4e"/><rect x="28" y="32" width="5" height="6" rx="1.6" fill="#2f8f4e"/><path d="M14 20 l2 -4 l2 4 M20 19 l2 -4 l2 4 M26 20 l2 -4 l2 4" fill="#f6c343"/>`,
    picBalloons: `<rect width="56" height="40" fill="#e9f3ff"/><path d="M16 17 L28 38 M28 14 L28 38 M40 17 L28 38" stroke="#6b7a75" stroke-width=".8" fill="none"/><ellipse cx="16" cy="12" rx="7" ry="9" fill="#ef4444"/><ellipse cx="28" cy="9" rx="7" ry="9" fill="#fbbf24"/><ellipse cx="40" cy="12" rx="7" ry="9" fill="#3b82f6"/><path d="M13 7 q1 -3 4 -3" stroke="#fff" stroke-width="1.4" fill="none" opacity=".7"/>`,
    picRocketPic: `<rect width="56" height="40" fill="#1f2a55"/><g fill="#fff"><circle cx="8" cy="8" r="1"/><circle cx="48" cy="6" r="1"/><circle cx="44" cy="30" r=".8"/><circle cx="10" cy="30" r=".9"/></g><path d="M28 3 Q36 12 34 26 H22 Q20 12 28 3z" fill="#fff"/><path d="M28 3 Q32 7 33 11 H23 Q24 7 28 3z" fill="#ef4444"/><circle cx="28" cy="17" r="3.2" fill="#38bdf8"/><path d="M22 20 L16 28 L22 26z M34 20 L40 28 L34 26z" fill="#ef4444"/><path d="M24 26 H32 L28 37z" fill="#fbbf24"/>`,
    picFish: `<rect width="56" height="40" fill="#38bdf8"/><path d="M0 36 q7 -4 14 0 t14 0 t14 0 t14 0 V40 H0z" fill="#0ea5e9"/><ellipse cx="26" cy="21" rx="13" ry="8" fill="#f97316"/><path d="M38 21 L48 13 V29z" fill="#fb923c"/><circle cx="19" cy="19" r="2" fill="#fff"/><circle cx="19" cy="19" r="1" fill="#26332f"/><path d="M26 14 v14" stroke="#fff" stroke-width="1.4" opacity=".6"/><g fill="none" stroke="#fff" stroke-width="1"><circle cx="8" cy="12" r="2"/><circle cx="12" cy="6" r="1.4"/></g>`,
    picCake: `<rect width="56" height="40" fill="#fff0f5"/><rect x="10" y="22" width="36" height="14" rx="2" fill="#f9a8d4"/><rect x="14" y="14" width="28" height="9" rx="2" fill="#fde68a"/><path d="M10 26 q3 4 6 0 t6 0 t6 0 t6 0 t6 0 t6 0" fill="#fff"/><rect x="20" y="8" width="2.4" height="7" fill="#3b82f6"/><rect x="27" y="8" width="2.4" height="7" fill="#ef4444"/><rect x="34" y="8" width="2.4" height="7" fill="#3fb984"/><path d="M21.2 3 q-2 3 0 4 q2 -1 0 -4 M28.2 3 q-2 3 0 4 q2 -1 0 -4 M35.2 3 q-2 3 0 4 q2 -1 0 -4" fill="#fbbf24"/>`,
    picForest: `<rect width="56" height="40" fill="#d6f2e6"/><rect y="33" width="56" height="7" fill="#6bc487"/><g fill="#8a5a31"><rect x="12" y="28" width="3" height="7"/><rect x="27" y="26" width="3" height="9"/><rect x="42" y="28" width="3" height="7"/></g><g fill="#3fb984"><path d="M13.5 8 L5 22 H22z M13.5 16 L3 30 H24z"/><path d="M28.5 4 L19 20 H38z M28.5 13 L16 28 H41z"/><path d="M43.5 8 L35 22 H52z M43.5 16 L33 30 H54z"/></g>`,
    picSnow: `<rect width="56" height="40" fill="#cfe3ff"/><path d="M0 32 q28 -8 56 0 V40 H0z" fill="#fff"/><circle cx="28" cy="29" r="9" fill="#fff" stroke="#dbeafe" stroke-width="1"/><circle cx="28" cy="16" r="6.6" fill="#fff" stroke="#dbeafe" stroke-width="1"/><rect x="23" y="5" width="10" height="6" fill="#26332f"/><rect x="21" y="10" width="14" height="2" fill="#26332f"/><path d="M28 16 l7 1.4 l-7 1.6z" fill="#f97316"/><circle cx="25.6" cy="14" r=".9" fill="#26332f"/><circle cx="30.4" cy="14" r=".9" fill="#26332f"/><g fill="#fff"><circle cx="8" cy="8" r="1.4"/><circle cx="46" cy="14" r="1.4"/><circle cx="12" cy="22" r="1.2"/></g>`,
  });
  // Family photos: little cartoon people (x, height, shirt colour) standing on y = 36.
  const person = (x, h, c) => `<rect x="${x - h * 0.17}" y="${36 - h * 0.72}" width="${h * 0.34}" height="${h * 0.72}" rx="${h * 0.1}" fill="${c}"/><circle cx="${x}" cy="${36 - h + h * 0.18}" r="${h * 0.18}" fill="#f5c9a0"/>`;
  const people = (list) => list.map(([x, h, c]) => person(x, h, c)).join("");
  const FAM = [[14, 30, "#ef4444"], [28, 24, "#3b82f6"], [40, 16, "#f59e0b"]];
  const PHOTO_ART = {
    photoPicnic: `<rect width="56" height="40" fill="#bfe8ff"/><rect y="26" width="56" height="14" fill="#8fd694"/><circle cx="48" cy="8" r="4.4" fill="#fde047"/><rect x="8" y="30" width="40" height="8" fill="#ef4444"/><path d="M8 30 H48 M8 34 H48 M20 30 V38 M32 30 V38" stroke="#fff" stroke-width="1.4"/>${people([[18, 26, "#3b82f6"], [30, 22, "#f472b6"], [40, 14, "#fbbf24"]])}`,
    photoBeach: `<rect width="56" height="40" fill="#d6f0ff"/><rect y="16" width="56" height="9" fill="#38bdf8"/><path d="M0 26 q28 -6 56 0 V40 H0z" fill="#f6e3b0"/><circle cx="8" cy="8" r="4.4" fill="#fde047"/><path d="M34 14 a10 10 0 0 1 20 0z" fill="#ef4444"/><path d="M44 14 V34" stroke="#8a5a31" stroke-width="1.6"/>${people([[12, 26, "#3b82f6"], [24, 22, "#f472b6"], [34, 14, "#fbbf24"]])}`,
    photoBirthday: `<rect width="56" height="40" fill="#ffe9f0"/><rect y="34" width="56" height="6" fill="#f9a8d4"/><ellipse cx="10" cy="10" rx="4" ry="5" fill="#ef4444"/><ellipse cx="46" cy="9" rx="4" ry="5" fill="#3b82f6"/><ellipse cx="38" cy="14" rx="3.6" ry="4.6" fill="#fbbf24"/>${people(FAM)}<path d="M10.6 12 l3.4 -8 l3.4 8z M24.4 10 l3.6 -7 l3.6 7z M37.4 8 l2.6 -6 l2.6 6z" fill="#a78bfa"/>`,
    photoPark: `<rect width="56" height="40" fill="#d8efff"/><rect y="28" width="56" height="12" fill="#6bc487"/><rect x="44" y="14" width="3" height="16" fill="#8a5a31"/><circle cx="45.5" cy="12" r="8" fill="#3fb984"/>${people([[10, 28, "#8b5cf6"], [22, 24, "#3b82f6"], [31, 15, "#f472b6"]])}`,
    photoZoo: `<rect width="56" height="40" fill="#e5f7d4"/><rect y="30" width="56" height="10" fill="#a3d977"/><rect x="38" y="6" width="5" height="26" fill="#fbbf24"/><ellipse cx="42" cy="8" rx="6" ry="4" fill="#fbbf24"/><rect x="40" y="2" width="1.6" height="4" fill="#9a6a3d"/><rect x="43.4" y="2" width="1.6" height="4" fill="#9a6a3d"/><g fill="#9a6a3d"><circle cx="40" cy="14" r="1.4"/><circle cx="42" cy="22" r="1.6"/></g>${people([[10, 28, "#ef4444"], [22, 22, "#3b82f6"]])}`,
    photoCamp: `<rect width="56" height="40" fill="#26335f"/><g fill="#fff"><circle cx="8" cy="6" r="1"/><circle cx="30" cy="4" r=".8"/><circle cx="50" cy="9" r="1"/></g><rect y="33" width="56" height="7" fill="#3f6f55"/><path d="M30 33 L42 12 L54 33z" fill="#f97316"/><path d="M42 12 L38 33 H46z" fill="#c2410c"/><path d="M10 34 l6 -9 l6 9z" fill="#ef4444"/><path d="M13 34 q3 -8 6 0z" fill="#fbbf24"/>${people([[24, 18, "#3b82f6"], [6, 14, "#f472b6"]])}`,
    photoSnow: `<rect width="56" height="40" fill="#d6e8ff"/><rect y="30" width="56" height="10" fill="#fff"/><circle cx="28" cy="31" r="6.6" fill="#fff" stroke="#bfdbfe"/><circle cx="28" cy="22" r="4.6" fill="#fff" stroke="#bfdbfe"/><path d="M28 22 l5 1 l-5 1z" fill="#f97316"/>${people([[10, 26, "#ef4444"], [46, 22, "#3b82f6"], [38, 14, "#f59e0b"]])}<g fill="#fff"><circle cx="8" cy="8" r="1.4"/><circle cx="24" cy="6" r="1.2"/><circle cx="46" cy="10" r="1.4"/></g>`,
    photoGrad: `<rect width="56" height="40" fill="#f3e8ff"/><rect y="34" width="56" height="6" fill="#c4b5fd"/><g fill="#26332f"><path d="M6 6 l8 -3 l8 3 l-8 3z M30 4 l8 -3 l8 3 l-8 3z"/></g><g fill="#fbbf24"><polygon points="${starPts(48, 18, 3.6, 1.6)}"/><polygon points="${starPts(8, 20, 3, 1.4)}"/></g>${people([[14, 28, "#26332f"], [28, 24, "#26332f"], [40, 16, "#26332f"]])}<rect x="24" y="22" width="9" height="2.4" fill="#fff"/>`,
  };
  // colour, height, mark (0 dot, 1 square, 2 diamond, 3 triangle)
  const BOOK_DEF = {
    koalaBook: ["#ef4444", 26, 0], abcBook: ["#3b82f6", 22, 1], spaceBook: ["#26335f", 27, 2], dinoBook: ["#3fb984", 24, 3],
    fairyBook: ["#f472b6", 23, 0], mathBook: ["#f59e0b", 27, 1], oceanBook: ["#06b6d4", 22, 2], jokeBook: ["#fde047", 25, 3],
    atlasBook: ["#c9915a", 28, 0], artBook: ["#a78bfa", 24, 1], animalBook: ["#84cc16", 26, 2], songBook: ["#8b5cf6", 22, 3],
  };
  const bookMark = (m, cx, cy, s, fill) => [
    `<circle cx="${cx}" cy="${cy}" r="${s}" fill="${fill}"/>`,
    `<rect x="${cx - s}" y="${cy - s}" width="${2 * s}" height="${2 * s}" fill="${fill}"/>`,
    `<path d="M${cx} ${cy - s * 1.2} L${cx + s} ${cy} L${cx} ${cy + s * 1.2} L${cx - s} ${cy}z" fill="${fill}"/>`,
    `<path d="M${cx} ${cy - s} L${cx + s} ${cy + s} H${cx - s}z" fill="${fill}"/>`,
  ][m];
  const bookSvg = (id, x, base) => {
    const [c, h, m] = BOOK_DEF[id];
    const w = 8.4, y = base - h;
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1" fill="${c}"/><rect x="${x}" y="${y + 3}" width="${w}" height="1.4" fill="#fff" opacity=".55"/><rect x="${x}" y="${base - 5}" width="${w}" height="1.4" fill="#fff" opacity=".55"/>${bookMark(m, +(x + w / 2).toFixed(1), +(y + h / 2).toFixed(1), 1.7, "#fff")}`;
  };
  const bigBook = (id) => {
    const [c, , m] = BOOK_DEF[id];
    return `<rect x="9" y="3" width="22" height="34" rx="2.4" fill="${c}"/><rect x="9" y="3" width="4.4" height="34" rx="2" fill="#000" opacity=".18"/><rect x="15.5" y="8" width="12" height="11" rx="1.6" fill="#fff" opacity=".88"/>${bookMark(m, 21.5, 13.5, 3.2, c)}<path d="M16 25 h11 M16 30 h7" stroke="#fff" stroke-width="1.8" stroke-linecap="round" opacity=".85"/>`;
  };
  // Put a 20 x 24 piece of art at centre cx, standing on y = base, scaled by s.
  const placed = (art, cx, base, s) => `<g transform="translate(${(cx - 10 * s).toFixed(1)} ${(base - 24 * s).toFixed(1)}) scale(${s})">${art}</g>`;
  const shelfBooks = (sel) => sel.filter((id) => BOOK_DEF[id]).map((id, i) => bookSvg(id, +(236 + (i % 6) * 9.6).toFixed(1), [68, 104, 146][Math.floor(i / 6)] || 146)).join("");
  const deskSubs = (sel) => {
    const top = sel.filter((id) => DESK_ART[id] && !DRAWER_SUBS.includes(id));
    const drawer = sel.filter((id) => DRAWER_SUBS.includes(id));
    return top.map((id, i) => placed(DESK_ART[id], 19 + i * 18, 118, 0.9)).join("") + drawer.map((id, i) => placed(DESK_ART[id], [40, 74][i], 146, 0.5)).join("");
  };
  // Wall frames: `g` is the outer rectangle, `b` the border; the picture fills the inside.
  const picAt = (id, x, y, w, h) => `<g transform="translate(${x} ${y}) scale(${(w / 56).toFixed(4)} ${(h / 40).toFixed(4)})">${PIC_ART[id] || PIC_ART.picMeadow}</g>`;
  const hangStr = (cx, y) => `<path d="M${cx} ${y} L${cx - 10} ${y - 10} M${cx} ${y} L${cx + 10} ${y - 10}" stroke="#6b7a75" stroke-width="1" fill="none"/>`;
  const frameBuild = (outer, extra, g) => {
    const r = g || { x: 30, y: 22, w: 64, h: 48, b: 2 };
    return (sel) => hangStr(r.x + r.w / 2, r.y) + picAt(sel[0], r.x + r.b, r.y + r.b, r.w - 2 * r.b, r.h - 2 * r.b) + outer + (extra || "");
  };
  const rectFrame = (r, color, w) => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="3" fill="none" stroke="${color}" stroke-width="${w}"/>`;
  // a frame that holds up to 3 family photos side by side
  const collageBuild = (sel) => {
    const slot = (i) => {
      const x = 22 + i * 31, y = 33;
      const id = sel[i];
      return PHOTO_ART[id]
        ? `<g transform="translate(${x} ${y}) scale(${(26 / 56).toFixed(4)} ${(30 / 40).toFixed(4)})">${PHOTO_ART[id]}</g>`
        : `<rect x="${x}" y="${y}" width="26" height="30" fill="#f1ede4"/><path d="M${x + 13} ${y + 10} v10 M${x + 8} ${y + 15} h10" stroke="#d6cfbf" stroke-width="2" stroke-linecap="round"/>`;
    };
    return hangStr(62, 28) + `<rect x="14" y="28" width="96" height="40" rx="3" fill="#fff8ec"/>` + [0, 1, 2].map(slot).join("") +
      `<rect x="14" y="28" width="96" height="40" rx="3" fill="none" stroke="#9a6a3d" stroke-width="4"/><rect x="20" y="31" width="29" height="34" fill="none" stroke="#c99562" stroke-width="1"/><rect x="51" y="31" width="29" height="34" fill="none" stroke="#c99562" stroke-width="1"/><rect x="82" y="31" width="29" height="34" fill="none" stroke="#c99562" stroke-width="1"/>`;
  };
  const toyBoxBuild = (body, trim, deco) => (sel) =>
    `<rect x="26" y="184" width="52" height="8" fill="#5b3e22"/>` +
    sel.filter((id) => TOY_ART[id]).map((id, i) => placed(TOY_ART[id], [33, 46, 59, 72][i], 193, 0.85)).join("") +
    `<rect x="24" y="190" width="56" height="22" rx="3" fill="${body}"/>${deco}<rect x="22" y="186" width="60" height="6" rx="2" fill="${trim}"/>`;
  // A parent item whose picture changes with its sub-items. `base` is its normal picture when nothing is on it.
  const subBuild = (id, fn) => { const a = ROOM_ART[id]; const base = a.svg; a.build = (sel) => (sel && sel.length ? fn(sel) : base); };
  const bareBookshelf = `<rect x="228" y="30" width="72" height="122" rx="3" fill="#a9703f"/><rect x="234" y="36" width="60" height="32" fill="#8a5a31"/><rect x="234" y="72" width="60" height="32" fill="#8a5a31"/><rect x="234" y="108" width="60" height="38" fill="#8a5a31"/>`;
  subBuild("bookshelf", (sel) => bareBookshelf + shelfBooks(sel));
  subBuild("rainbowShelf", (sel) => shelfFrame("#8a5a31", shelfBooks(sel)));
  subBuild("studyDesk", (sel) => deskBase("#b9824f", "#9a6a3d", "#c99562", "#f3d9a8") + deskSubs(sel));
  subBuild("pinkDesk", (sel) => deskBase("#f9a8d4", "#f472b6", "#fbcfe8", "#be185d") + deskSubs(sel));
  const FG = { x: 30, y: 22, w: 64, h: 48, b: 2 };
  const FGS = { x: 44, y: 32, w: 36, h: 28, b: 2 };
  const FGB = { x: 16, y: 12, w: 92, h: 66, b: 5 };
  const frames = {
    woodFrame: frameBuild(rectFrame(FG, "#b9824f", 4)),
    goldFrame: frameBuild(rectFrame(FG, "#e0a21a", 4), `<rect x="33" y="25" width="58" height="42" fill="none" stroke="#fde68a" stroke-width="1"/>`),
    candyFrame: frameBuild(rectFrame(FG, "#f472b6", 4), `<rect x="30" y="22" width="64" height="48" rx="3" fill="none" stroke="#fbbf24" stroke-width="4" stroke-dasharray="7 7"/>`),
    smallFrame: frameBuild(rectFrame(FGS, "#6b4a2e", 3), "", FGS),
    bigFrame: frameBuild(rectFrame(FGB, "#5b3e22", 7), `<rect x="19.5" y="15.5" width="85" height="59" fill="none" stroke="#c99562" stroke-width="1.4"/>`, FGB),
    aluminumFrame: (sel) => hangStr(62, 22) + `<rect x="30" y="22" width="64" height="48" fill="#fff"/>` + picAt(sel[0], 36, 28, 52, 36) + `<rect x="31.2" y="23.2" width="61.6" height="45.6" fill="none" stroke="#c3ccd4" stroke-width="2.4"/><rect x="30" y="22" width="64" height="48" fill="none" stroke="#8794a1" stroke-width="1.4"/><path d="M31 24 H60" stroke="#fff" stroke-width="1" opacity=".9"/>`,
    roundFrame: (sel) => hangStr(62, 20) + `<defs><clipPath id="rf-clip"><circle cx="62" cy="46" r="23"/></clipPath></defs><g clip-path="url(#rf-clip)">${picAt(sel[0], 33, 30, 58, 34)}</g><circle cx="62" cy="46" r="24" fill="none" stroke="#14b8a6" stroke-width="4"/><circle cx="62" cy="46" r="21.6" fill="none" stroke="#99f6e4" stroke-width="1"/>`,
  };
  const ROOM_ART_FRAME_VIEW = "8 4 108 90";
  frames.familyFrame = collageBuild;
  Object.keys(frames).forEach((id) => { ROOM_ART[id] = { layer: "poster", view: ROOM_ART_FRAME_VIEW, build: frames[id], svg: frames[id]([]) }; });
  const toyBoxes = {
    woodToyBox: toyBoxBuild("#c9915a", "#a9703f", `<path d="M24 197 H80 M24 204 H80" stroke="#a9703f" stroke-width="1.6"/><rect x="40" y="195" width="24" height="10" rx="2" fill="#fff3c4"/><text x="52" y="203" text-anchor="middle" font-family="Arial, sans-serif" font-weight="800" font-size="7" fill="#b45309">TOYS</text>`),
    rainbowToyBox: toyBoxBuild("#fff", "#a78bfa", ["#ef4444", "#f97316", "#fbbf24", "#3fb984", "#38bdf8", "#a78bfa"].map((c, i) => `<rect x="${24 + i * 9.33}" y="192" width="9.4" height="20" fill="${c}"/>`).join("")),
    starToyBox: toyBoxBuild("#3b82f6", "#1d4ed8", `<polygon points="${starPts(38, 201, 6, 2.6)}" fill="#fde047"/><polygon points="${starPts(54, 205, 4.6, 2)}" fill="#fff"/><polygon points="${starPts(68, 199, 4, 1.8)}" fill="#fde047"/>`),
  };
  Object.keys(toyBoxes).forEach((id) => { ROOM_ART[id] = { layer: "toy", view: "14 156 76 58", build: toyBoxes[id], svg: toyBoxes[id]([]) }; });
  // Pet outfits: 24 x 24 pieces. Head pieces sit on the head (bottom edge at y 22), the rest are centred.
  const PW_ART = {
    pwPartyHat: `<path d="M12 2 L19 21 H5z" fill="#a78bfa"/><path d="M8.6 12 h6.8 M7 17 h10" stroke="#fde047" stroke-width="2"/><circle cx="12" cy="2.6" r="2.2" fill="#f472b6"/><rect x="4" y="20.5" width="16" height="2" rx="1" fill="#7c3aed"/>`,
    pwBow: `<path d="M12 14 L2 7 V20z M12 14 L22 7 V20z" fill="#f472b6"/><circle cx="12" cy="14" r="3.4" fill="#ec4899"/>`,
    pwTopHat: `<rect x="3" y="19" width="18" height="3.4" rx="1.4" fill="#26332f"/><rect x="6.5" y="4" width="11" height="16" rx="1" fill="#26332f"/><rect x="6.5" y="14.6" width="11" height="3.2" fill="#ef4444"/>`,
    pwFlowers: `<path d="M1 19 q11 -5 22 0" stroke="#3fb984" stroke-width="2.2" fill="none"/><g stroke="#fff" stroke-width=".8"><circle cx="4" cy="17" r="3.2" fill="#f472b6"/><circle cx="9" cy="14.6" r="3.2" fill="#fde047"/><circle cx="14.4" cy="14.6" r="3.2" fill="#fb923c"/><circle cx="20" cy="17" r="3.2" fill="#a78bfa"/></g><circle cx="12" cy="17.4" r="3.4" fill="#ef4444" stroke="#fff" stroke-width=".8"/>`,
    pwCollar: `<path d="M2 8 Q12 20 22 8" stroke="#ef4444" stroke-width="3.6" fill="none" stroke-linecap="round"/><circle cx="12" cy="17.4" r="3.2" fill="#fbbf24" stroke="#d97706" stroke-width="1"/>`,
    pwBell: `<path d="M2 8 Q12 20 22 8" stroke="#3b82f6" stroke-width="3.6" fill="none" stroke-linecap="round"/><path d="M8 20 a4 4 0 0 1 8 0z" fill="#fbbf24" stroke="#d97706" stroke-width=".8"/><circle cx="12" cy="21.4" r="1.2" fill="#92400e"/>`,
    pwScarf: `<path d="M2 7 Q12 18 22 7 V12 Q12 23 2 12z" fill="#f97316"/><rect x="14.6" y="13" width="5.4" height="10" rx="1.6" fill="#f97316"/><path d="M14.6 17 h5.4 M14.6 20 h5.4" stroke="#fff" stroke-width="1.1"/>`,
    pwBowTie: `<path d="M12 12 L2.4 5.6 V18.4z M12 12 L21.6 5.6 V18.4z" fill="#3b82f6"/><rect x="9.6" y="9.4" width="4.8" height="5.2" rx="1.4" fill="#1d4ed8"/>`,
    pwSweater: `<path d="M5 3 H19 L23 12 L19 13.6 V23 H5 V13.6 L1 12z" fill="#38bdf8"/><path d="M5 9 h14 M5 14 h14 M5 19 h14" stroke="#fff" stroke-width="1.8"/><path d="M8.6 3 q3.4 5 6.8 0" fill="#0ea5e9"/>`,
    pwRaincoat: `<path d="M4 2 H20 L23 23 H1z" fill="#fbbf24"/><path d="M12 2 V23" stroke="#d97706" stroke-width="1.4"/><circle cx="9.6" cy="10" r="1.2" fill="#d97706"/><circle cx="9.6" cy="15" r="1.2" fill="#d97706"/><path d="M6 2 q6 6 12 0" fill="#f59e0b"/>`,
    pwCape: `<path d="M5 2 H19 L24 23 Q12 18 0 23z" fill="#ef4444"/><circle cx="12" cy="3.4" r="2.6" fill="#fbbf24"/>`,
    pwBoots: `<path d="M1.6 4 H9.6 V15 H11.6 V21 H1.6z" fill="#16a34a"/><path d="M14.4 4 H22.4 V15 H24 V21 H14.4z" fill="#16a34a"/><rect x="1.6" y="18.4" width="10" height="2.6" fill="#14532d"/><rect x="14.4" y="18.4" width="9.6" height="2.6" fill="#14532d"/>`,
    pwSneakers: `<path d="M1 11 H7 L10.6 16 H11.6 V21 H1z" fill="#ef4444"/><path d="M13 11 H19 L22.6 16 H23.6 V21 H13z" fill="#ef4444"/><rect x="1" y="19" width="10.6" height="2.4" fill="#fff"/><rect x="13" y="19" width="10.6" height="2.4" fill="#fff"/><path d="M3 14 h4 M15 14 h4" stroke="#fff" stroke-width="1.2"/>`,
  };
  // where each pet wears things: head (top of the head), neck, body, feet
  const PET_WEAR = {
    catPet: { head: [238, 164], neck: [238, 185], body: [238, 194], feet: [238, 207] },
    dogPet: { head: [238, 165], neck: [238, 187], body: [238, 197], feet: [238, 207] },
    bunnyPet: { head: [238, 171], neck: [238, 187], body: [238, 197], feet: [238, 207] },
    turtlePet: { head: [257, 194], neck: [250, 200], body: [238, 196], feet: [238, 205] },
    parrotPet: { head: [238, 165], neck: [238, 181], body: [238, 193], feet: [238, 207] },
    hedgehogPet: { head: [257, 195], neck: [251, 200], body: [240, 193], feet: [240, 206] },
    ducklingPet: { head: [244, 171], neck: [242, 190], body: [238, 197], feet: [238, 208] },
    frogPet: { head: [238, 178], neck: [238, 191], body: [238, 198], feet: [238, 207] },
    joeyPet: { head: [238, 164], neck: [238, 181], body: [238, 193], feet: [238, 207] },
  };
  const PW_SCALE = { head: 0.62, neck: 0.72, body: 0.95, feet: 0.62 };
  const PW_GROUP = { pwPartyHat: "head", pwBow: "head", pwTopHat: "head", pwFlowers: "head", pwCollar: "neck", pwBell: "neck", pwScarf: "neck", pwBowTie: "neck", pwSweater: "body", pwRaincoat: "body", pwCape: "body", pwBoots: "feet", pwSneakers: "feet" };
  const wearSvg = (petId, sel) => ["body", "neck", "feet", "head"].map((g) => {
    const id = sel.find((x) => PW_GROUP[x] === g);
    if (!id) return "";
    const [ax, ay0] = PET_WEAR[petId][g], ay = g === "feet" ? ay0 - 3 : ay0;
    const sc = PW_SCALE[g], oy = g === "head" ? 22 : 12;
    return `<g transform="translate(${(ax - 12 * sc).toFixed(1)} ${(ay - oy * sc).toFixed(1)}) scale(${sc})">${PW_ART[id]}</g>`;
  }).join("");
  Object.keys(PET_WEAR).forEach((petId) => {
    const base = ROOM_ART[petId].svg;
    ROOM_ART[petId].build = (sel) => base + wearSvg(petId, sel);
  });
  // Small picture of one sub-item for cards and the detail popup.
  function subIcon(id) {
    const head = `<svg class="koala-icon-svg koala-sub-svg" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" `;
    if (BOOK_DEF[id]) return `${head}viewBox="0 0 40 40">${bigBook(id)}</svg>`;
    if (PHOTO_ART[id]) return `${head}viewBox="-2 -2 60 44"><g>${PHOTO_ART[id]}</g><rect x="0" y="0" width="56" height="40" fill="none" stroke="#9a6a3d" stroke-width="3"/></svg>`;
    if (PIC_ART[id]) return `${head}viewBox="-2 -2 60 44"><g>${PIC_ART[id]}</g><rect x="0" y="0" width="56" height="40" fill="none" stroke="#b9824f" stroke-width="3"/></svg>`;
    if (PW_ART[id]) return `${head}viewBox="-1 -1 26 26">${PW_ART[id]}</svg>`;
    const art = TOY_ART[id] || DESK_ART[id];
    return art ? `${head}viewBox="-3 -1 26 27">${art}</svg>` : "";
  }

  // Draw order inside the room: back to front.
  const ROOM_ORDER = ["wall", "garland", "window", "poster", "shelf", "lamp", "rug", "desk", "toy"];
  const ROOM_SLOT_LAYER = { wallpaper: "wall", rug: "rug", poster: "poster", desk: "desk", lamp: "lamp", shelf: "shelf", plant: "plant", window: "window", garland: "garland", pet: "pet", toy: "toy" };
  const ROOM_BASE_FLOOR = `<rect y="150" width="320" height="70" fill="#dcbd8c"/><path d="M0 172H320M0 194H320" stroke="#cda973" stroke-width="2"/><rect y="146" width="320" height="6" fill="#c9a36b"/>`;

  // opts.sub: { parentId: [subIds] } drawn on / in their parent item.
  function roomItem(id, sub) {
    const a = ROOM_ART[id];
    if (!a) return "";
    return a.build ? a.build((sub && sub[id]) || []) : a.svg;
  }

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
    // Items that hold sub-items get a class so the studio can make them tappable / highlight the picked one.
    const grp = (id) => `<g data-item="${id}"${ROOM_ART[id].build ? ` class="koala-hit${o.pick === id ? " koala-picked" : ""}"` : ""}>${roomItem(id, o.sub)}</g>`;
    const parts = [grp(byLayer.wall), ROOM_BASE_FLOOR];
    ROOM_ORDER.slice(1).forEach((l) => { if (byLayer[l]) parts.push(grp(byLayer[l])); });
    const koala = avatar(koalaEq, { view: "full" }).replace('class="koala-avatar-svg" ', "").replace("<svg ", '<svg x="106" y="84" width="108" height="111" ');
    // Studio preview: a soft shadow on the floor so the koala stands on the
    // ground instead of hovering in front of the wall.
    if (o.shadow) parts.push('<ellipse cx="160" cy="182" rx="42" ry="5.5" fill="#000" opacity=".16"/>');
    parts.push(koala);
    if (byLayer.pet) parts.push(grp(byLayer.pet));
    if (byLayer.plant) parts.push(grp(byLayer.plant));
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

  return { avatar, room, itemPicture, itemIcon, previewFor, subIcon, artIds: () => Object.keys(ART), hasArt: (id) => !!ART[id] || !!ROOM_ART[id] };
});
