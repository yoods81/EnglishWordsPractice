// Generates public/css/themes.css (Dark and Ivory colour themes) from style.css.
//
// Rather than hand-maintaining hundreds of overrides, every colour in style.css
// is mapped by rule: light surfaces become dark (Dark) or warm paper (Ivory),
// dark neutral text becomes light (Dark); saturated brand colours and white-on-
// colour text stay as they are. Re-run after changing style.css:
//   node scripts/gen-themes.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "css");
const src = fs.readFileSync(path.join(root, "style.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

/* ---------- colour helpers ---------- */
function parseColor(s) {
  s = s.trim().toLowerCase();
  if (s === "white") return { r: 255, g: 255, b: 255, a: 1 };
  let m = s.match(/^#([0-9a-f]{3,8})$/);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join("");
    if (h.length !== 6 && h.length !== 8) return null;
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1 };
  }
  m = s.match(/^rgba?\(([^)]+)\)$/);
  if (m) {
    const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat);
    if (p.length < 3 || p.some(Number.isNaN)) return null;
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  }
  return null;
}
function toHsl({ r, g, b, a }) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  let h = 0, s = 0;
  if (d) {
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? ((g - b) / d + (g < b ? 6 : 0)) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return { h, s, l, a };
}
function fromHsl({ h, s, l, a }) {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  let [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const v = (n) => Math.round((n + m) * 255);
  return a < 1 ? `rgba(${v(r)},${v(g)},${v(b)},${+a.toFixed(3)})` : "#" + [r, g, b].map((n) => v(n).toString(16).padStart(2, "0")).join("");
}

/* ---------- theme mappers: (hsl, kind) => hsl | null (null = leave) ---------- */
// kind: "bg" (surfaces), "line" (borders/outlines), "text"
const THEMES = {
  dark: (c, kind) => {
    if (kind === "text") {
      // dark neutral text -> light; white and saturated colours stay
      if (c.l < 0.5 && c.s < 0.5) return { ...c, s: Math.min(c.s, 0.12), l: 0.9 - c.l * 0.35 };
      if (c.l < 0.42 && c.s >= 0.5) return { ...c, l: Math.min(0.66, c.l + 0.3) };
      return null;
    }
    if (c.l > 0.74) {
      if (c.s < 0.1) c = { ...c, h: 165, s: 0.2 };
      const nl = kind === "line" ? 0.1 + (1 - c.l) * 1.6 : 0.09 + (1 - c.l) * 0.7;
      return { ...c, s: Math.min(c.s, 0.35) * 0.8, l: Math.min(nl, kind === "line" ? 0.34 : 0.3) };
    }
    if (kind === "bg" && c.l < 0.25 && c.s < 0.3) return { ...c, l: Math.min(0.4, c.l + 0.12) };
    return null;
  },
  ivory: (c, kind) => {
    if (kind === "text") return null;
    const greenish = c.h >= 100 && c.h <= 200;
    if (c.l > 0.88 && (c.s < 0.12 || (greenish && c.s < 0.7))) {
      const nl = Math.min(c.l, 0.985) - (c.l > 0.99 ? 0.012 : 0.02);
      return { h: 42, s: c.l > 0.99 ? 0.65 : 0.42, l: nl, a: c.a };
    }
    if (kind === "line" && c.l > 0.8 && greenish) return { h: 40, s: 0.3, l: c.l - 0.04, a: c.a };
    return null;
  },
};

const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|\bwhite\b/g;
function kindOf(prop) {
  if (/^(background(-color|-image)?)$/.test(prop) || prop === "fill") return "bg";
  if (/^(border(-top|-right|-bottom|-left)?(-color)?|outline(-color)?|stroke|border-color)$/.test(prop)) return "line";
  if (prop === "color" || prop === "caret-color" || prop === "-webkit-text-fill-color") return "text";
  if (prop.startsWith("--")) {
    if (/(^--)(bg|card|surface|panel|paper)/.test(prop)) return "bg";
    if (/(text|muted|ink|fg)/.test(prop)) return "text";
    if (/(outline|line|border)/.test(prop)) return "line";
  }
  return null;
}
function mapValue(prop, value, mapper) {
  const kind = kindOf(prop);
  if (!kind) return null;
  let changed = false;
  // never touch colours inside url(...) / var(...)
  const parts = value.split(/(url\([^)]*\)|var\([^)]*\))/);
  const out = parts.map((p, i) => {
    if (i % 2) return p;
    return p.replace(COLOR_RE, (m) => {
      const col = parseColor(m);
      if (!col || col.a === 0) return m;
      const hsl = mapper(toHsl(col), kind);
      if (!hsl) return m;
      changed = true;
      return fromHsl(hsl);
    });
  }).join("");
  return changed ? out : null;
}

/* ---------- tiny CSS block parser ---------- */
function parseBlocks(text) {
  const nodes = [];
  let i = 0;
  while (i < text.length) {
    const open = text.indexOf("{", i);
    if (open < 0) break;
    const head = text.slice(i, open).trim();
    let depth = 1, j = open + 1;
    while (j < text.length && depth) { if (text[j] === "{") depth++; else if (text[j] === "}") depth--; j++; }
    const body = text.slice(open + 1, j - 1);
    if (head.startsWith("@")) nodes.push({ at: head, children: /^@(media|supports)/.test(head) ? parseBlocks(body) : null });
    else nodes.push({ sel: head, body });
    i = j;
  }
  return nodes;
}
function splitDecls(body) {
  const out = []; let cur = "", depth = 0, q = null;
  for (const ch of body) {
    if (q) { cur += ch; if (ch === q) q = null; continue; }
    if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; }
    if (ch === "(") depth++; if (ch === ")") depth--;
    if (ch === ";" && !depth) { out.push(cur); cur = ""; } else cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out.map((d) => { const k = d.indexOf(":"); return k < 0 ? null : [d.slice(0, k).trim().toLowerCase(), d.slice(k + 1).trim()]; }).filter(Boolean);
}
function prefixSel(sel, theme) {
  const P = `html[data-theme="${theme}"]`;
  return sel.split(/,(?![^(]*\))/).map((s) => {
    s = s.trim();
    if (/^:root\b/.test(s)) return s.replace(/^:root/, P);
    if (/^html\b/.test(s)) return s.replace(/^html/, P);
    return `${P} ${s}`;
  }).join(",\n");
}
function emit(nodes, theme, mapper) {
  let out = "";
  for (const n of nodes) {
    if (n.at) {
      if (n.children) { const inner = emit(n.children, theme, mapper); if (inner) out += `${n.at} {\n${inner}}\n`; }
      continue;
    }
    if (n.sel.includes("@")) continue;
    const decls = splitDecls(n.body).map(([p, v]) => { const nv = mapValue(p, v, mapper); return nv ? `${p}: ${nv.replace(/\s*!important/, "")} !important;` : null; }).filter(Boolean);
    if (decls.length) out += `${prefixSel(n.sel, theme)} {\n  ${decls.join("\n  ")}\n}\n`;
  }
  return out;
}

const nodes = parseBlocks(src);
const extra = {
  dark: `html[data-theme="dark"] { color-scheme: dark; --bg: #13211c !important; --card-bg: #1c2d27 !important; --text: #e6eeea !important; --muted: #9fb1aa !important; }
html[data-theme="dark"] img, html[data-theme="dark"] video { filter: brightness(.92); }
html[data-theme="dark"] input, html[data-theme="dark"] select, html[data-theme="dark"] textarea { color-scheme: dark; }
html[data-theme="dark"] .koala-avatar-svg, html[data-theme="dark"] .koala-room-svg, html[data-theme="dark"] .koala-icon-svg { filter: none; }
`,
  ivory: "",
};
let css = "/* AUTO-GENERATED by scripts/gen-themes.mjs from style.css — do not edit by hand. */\n";
for (const [theme, mapper] of Object.entries(THEMES)) css += `\n/* ===== ${theme} ===== */\n` + emit(nodes, theme, mapper) + extra[theme];
fs.writeFileSync(path.join(root, "themes.css"), css);
console.log("themes.css", css.length, "bytes");
