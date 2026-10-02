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
    blueRug: { layer: "rug", view: "40 130 240 90", svg: `<ellipse cx="160" cy="192" rx="98" ry="20" fill="#5b8def"/><ellipse cx="160" cy="192" rx="80" ry="14" fill="none" stroke="#9db8f7" stroke-width="3"/>` },
    starRug: { layer: "rug", view: "40 130 240 90", svg: `<ellipse cx="160" cy="192" rx="98" ry="20" fill="#f6c343"/><ellipse cx="160" cy="192" rx="82" ry="14.5" fill="#f59e0b"/><polygon points="160,184 163,190 170,191 165,195 166,201 160,198 154,201 155,195 150,191 157,190" fill="#fff3c4"/>` },
    mapPoster: { layer: "poster", view: "16 8 100 90", svg: `<rect x="30" y="22" width="64" height="48" rx="3" fill="#fff" stroke="#b9824f" stroke-width="4"/><rect x="34" y="26" width="56" height="40" fill="#8ec9f5"/><path d="M42 36 q8 -6 14 2 q-2 8 -8 8 q-6 -1 -6 -10z M62 44 q8 -4 12 4 q-3 9 -10 6z M70 32 q6 -2 8 4 q-4 4 -8 -4z" fill="#5fb878"/>` },
    rocketPoster: { layer: "poster", view: "16 8 100 90", svg: `<rect x="30" y="22" width="64" height="48" rx="3" fill="#1f2a55" stroke="#b9824f" stroke-width="4"/><g fill="#fff"><circle cx="40" cy="30" r="1.2"/><circle cx="82" cy="34" r="1.4"/><circle cx="48" cy="60" r="1.2"/></g><path d="M62 28 q10 10 4 28 h-8 q-6 -18 4 -28z" fill="#e8ecf4"/><circle cx="62" cy="40" r="3" fill="#3b82f6"/><path d="M58 56 l-6 6 l8 -2z M66 56 l6 6 l-8 -2z" fill="#ef4444"/><path d="M60 58 q2 8 4 0z" fill="#ffb347"/>` },
    studyDesk: { layer: "desk", view: "0 100 130 90", svg: `<rect x="8" y="118" width="98" height="10" rx="3" fill="#b9824f"/><rect x="14" y="128" width="8" height="42" fill="#9a6a3d"/><rect x="92" y="128" width="8" height="42" fill="#9a6a3d"/><rect x="26" y="128" width="62" height="20" rx="2" fill="#c99562"/><circle cx="57" cy="138" r="2.4" fill="#f3d9a8"/><rect x="22" y="102" width="30" height="16" rx="2" fill="#fff" stroke="#c9d3cf"/><path d="M26 107h22M26 111h16" stroke="#8d9c97" stroke-width="1.6"/><rect x="62" y="108" width="12" height="10" rx="2" fill="#ef4444"/>` },
    deskLamp: { layer: "lamp", view: "110 0 100 80", svg: `<path d="M160 0 V36" stroke="#6b7a75" stroke-width="2.4"/><path d="M142 58 q18 -28 36 0z" fill="#ffd166" stroke="#e0a21a" stroke-width="2.4"/><path d="M148 62 q12 18 24 0" fill="#fff3c4" opacity=".7"/>` },
    bookshelf: { layer: "shelf", view: "216 20 100 140", svg: `<rect x="228" y="30" width="72" height="122" rx="3" fill="#a9703f"/><rect x="234" y="36" width="60" height="32" fill="#8a5a31"/><rect x="234" y="72" width="60" height="32" fill="#8a5a31"/><rect x="234" y="108" width="60" height="38" fill="#8a5a31"/><g><rect x="238" y="42" width="8" height="26" fill="#ef4444"/><rect x="247" y="46" width="8" height="22" fill="#3b82f6"/><rect x="256" y="40" width="9" height="28" fill="#3fb984"/><rect x="266" y="48" width="8" height="20" fill="#f59e0b"/><rect x="238" y="80" width="10" height="24" fill="#8b5cf6"/><rect x="249" y="76" width="8" height="28" fill="#ef4444"/><rect x="262" y="90" width="26" height="14" fill="#fff"/><rect x="240" y="116" width="8" height="30" fill="#3b82f6"/><rect x="249" y="120" width="9" height="26" fill="#f59e0b"/></g>` },
    pottedPlant: { layer: "plant", view: "236 110 80 110", svg: `<path d="M270 172 q-18 -22 -4 -42 q8 18 4 42z M270 172 q2 -30 18 -40 q4 22 -18 40z M270 172 q-6 -14 -22 -14 q8 -8 22 14z" fill="#4fae6a"/><path d="M256 172 h28 l-4 28 h-20z" fill="#d97a4a"/><rect x="254" y="168" width="32" height="7" rx="2" fill="#c4683a"/>` },
    skyWall: { layer: "wall", view: ROOM_VIEW, svg: `<rect width="320" height="150" fill="#bfe3ff"/><g fill="#fff"><ellipse cx="60" cy="40" rx="26" ry="10"/><ellipse cx="78" cy="34" rx="18" ry="9"/><ellipse cx="230" cy="64" rx="28" ry="10"/><ellipse cx="250" cy="57" rx="18" ry="9"/></g><circle cx="282" cy="26" r="14" fill="#ffd166"/>` },
    greenRug: { layer: "rug", view: "40 130 240 90", svg: `<ellipse cx="160" cy="192" rx="98" ry="20" fill="#5fb878"/><ellipse cx="160" cy="192" rx="80" ry="14" fill="#86d19a"/><path d="M110 192 q6 -8 12 0 M150 196 q6 -8 12 0 M190 190 q6 -8 12 0" stroke="#4fae6a" stroke-width="2.4" fill="none" stroke-linecap="round"/>` },
    beachTowel: { layer: "rug", view: "40 130 240 90", svg: `<rect x="70" y="176" width="180" height="30" rx="4" fill="#fff"/><g fill="#f97316"><rect x="70" y="176" width="180" height="6"/><rect x="70" y="188" width="180" height="6"/><rect x="70" y="200" width="180" height="6" rx="2"/></g><g fill="#38bdf8"><rect x="70" y="182" width="180" height="6"/><rect x="70" y="194" width="180" height="6"/></g>` },
    rainbowPoster: { layer: "poster", view: "16 8 100 90", svg: `<rect x="30" y="22" width="64" height="48" rx="3" fill="#fff" stroke="#b9824f" stroke-width="4"/><g fill="none" stroke-width="4.5" stroke-linecap="round"><path d="M40 62 a22 22 0 0 1 44 0" stroke="#ef4444"/><path d="M45 62 a17 17 0 0 1 34 0" stroke="#fbbf24"/><path d="M50 62 a12 12 0 0 1 24 0" stroke="#3b82f6"/></g>` },
    scienceDesk: { layer: "desk", view: "0 90 130 100", svg: `<rect x="8" y="118" width="98" height="10" rx="3" fill="#6b7fb3"/><rect x="14" y="128" width="8" height="42" fill="#556796"/><rect x="92" y="128" width="8" height="42" fill="#556796"/><rect x="26" y="128" width="62" height="20" rx="2" fill="#7f93c6"/><circle cx="57" cy="138" r="2.4" fill="#e3eaff"/><circle cx="34" cy="104" r="13" fill="#5aa9e6"/><path d="M26 98 q8 -4 12 4 q-2 8 -8 8 q-6 -2 -4 -12z" fill="#5fb878"/><rect x="31" y="116" width="6" height="4" fill="#556796"/><path d="M72 118 v-12 l-6 -10 h16 l-6 10 v12z" fill="#e3f4ff" stroke="#6b7fb3" stroke-width="2"/><path d="M68 108 h12 v10 h-12z" fill="#a78bfa" opacity=".8"/>` },
    starLamp: { layer: "lamp", view: "90 0 140 80", svg: `<g stroke="#6b7a75" stroke-width="2"><path d="M120 0 V26"/><path d="M160 0 V44"/><path d="M200 0 V20"/></g><g fill="#ffd166" stroke="#e0a21a" stroke-width="1.6" stroke-linejoin="round"><polygon points="${starPts(120, 36, 12, 5.2)}"/><polygon points="${starPts(160, 56, 14, 6)}"/><polygon points="${starPts(200, 30, 11, 4.8)}"/></g>` },
    trophyCabinet: { layer: "shelf", view: "216 20 100 140", svg: `<rect x="228" y="30" width="72" height="122" rx="3" fill="#7b5a3a"/><rect x="234" y="36" width="60" height="110" fill="#d6edf5"/><g stroke="#7b5a3a" stroke-width="4"><path d="M234 72H294M234 108H294"/></g><g fill="#ffd166" stroke="#e0a21a" stroke-width="1.6"><path d="M250 52 h12 v8 q0 8 -6 8 q-6 0 -6 -8z"/><path d="M276 56 h10 v7 q0 7 -5 7 q-5 0 -5 -7z"/><path d="M244 90 h14 v9 q0 9 -7 9 q-7 0 -7 -9z" /><circle cx="278" cy="98" r="9"/><path d="M252 126 h16 v10 q0 10 -8 10 q-8 0 -8 -10z"/></g><rect x="274" y="120" width="12" height="20" rx="2" fill="#3b82f6"/>` },
    xmasTree: { layer: "plant", view: "236 100 80 120", svg: `<rect x="266" y="186" width="10" height="16" fill="#8a5a31"/><polygon points="271,112 248,150 294,150" fill="#2f8f4e"/><polygon points="271,134 242,176 300,176" fill="#3aa05b"/><polygon points="271,158 236,192 306,192" fill="#2f8f4e"/><polygon points="${starPts(271, 110, 9, 4)}" fill="#ffd166"/><g><circle cx="262" cy="150" r="3.4" fill="#ef4444"/><circle cx="280" cy="168" r="3.4" fill="#fde047"/><circle cx="256" cy="176" r="3.4" fill="#60a5fa"/><circle cx="288" cy="184" r="3.4" fill="#ef4444"/><circle cx="270" cy="182" r="3.4" fill="#f472b6"/></g>` },
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
