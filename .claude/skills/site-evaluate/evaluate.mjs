// Site evaluation: screenshots + numbers for every role × width × page. Local only (wrangler dev :8787).
// usage: node .claude/skills/site-evaluate/evaluate.mjs <outDir> [--dev=mobile,tablet,desktop] [--role=none,free,paid,admin]
//        [--pages=/,/faq.html] [--view=quiz,koala] [--no-shots]
import { open, dismissPopups, BASE } from "../browser-test/lib.mjs";
import fs from "fs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

let axeSrc = null;
try { axeSrc = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8"); }
catch { console.log("note: axe-core not installed — run: npm install --prefix .claude/skills/site-evaluate"); }

const args = process.argv.slice(2);
const outDir = args.find((a) => !a.startsWith("--")) || "eval-out";
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.split("=")[1].split(",").filter(Boolean) : d; };
const SIZES = { mobile: [390, 844], tablet: [820, 1180], desktop: [1200, 1000] };
const devs = opt("dev", Object.keys(SIZES));
const roles = opt("role", ["none", "free", "paid", "admin"]);
const pages = opt("pages", ["/", "/learn.html", "/faq.html", "/vocabulary-words.html", "/town-words.html", "/times-tables.html"]);
const views = opt("view", ["quiz", "spelling", "flashcards", "typegame", "timestable", "wordlist", "koala"]);
const shots = !args.includes("--no-shots");
fs.mkdirSync(outDir, { recursive: true });

// Numbers measured on the current screen.
async function measure(p) {
  const m = await p.evaluate(() => {
    const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none"; };
    const small = [];
    for (const el of document.querySelectorAll("button, a[href], [role=button], input:not([type=hidden]), select")) {
      if (!vis(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 44 || r.height < 44) small.push(`${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""} "${(el.innerText || el.getAttribute("aria-label") || "").trim().slice(0, 20)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
    const broken = [...document.images].filter((i) => vis(i) && i.complete && i.naturalWidth === 0).map((i) => i.currentSrc || i.src);
    return {
      overflow: Math.max(0, document.documentElement.scrollWidth - innerWidth),
      smallTargets: { count: small.length, examples: small.slice(0, 8) },
      brokenImages: broken,
    };
  });
  if (axeSrc) {
    await p.addScriptTag({ content: axeSrc });
    m.axe = await p.evaluate(async () => (await window.axe.run(document, { resultTypes: ["violations"] })).violations
      .map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, help: v.help })));
  }
  return m;
}

const result = { base: BASE, date: new Date().toISOString(), runs: [] };
for (const role of roles) for (const dev of devs) {
  const [w, h] = SIZES[dev];
  const { b, p } = await open({ role, width: w, height: h });
  const errors = [];
  p.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  p.on("console", (msg) => { if (msg.type() === "error") errors.push("console: " + msg.text().slice(0, 200) + (msg.location()?.url ? ` @ ${msg.location().url.slice(0, 120)}` : "")); });
  const shoot = async (tag) => { if (!shots) return null; const f = `${role}-${dev}-${tag}.png`; await p.screenshot({ path: `${outDir}/${f}`, fullPage: true }); return f; };

  for (const path of pages) {
    const before = errors.length;
    const t0 = Date.now();
    const resp = await p.goto(BASE + path, { waitUntil: "load" }).catch((e) => { errors.push("goto: " + e.message); return null; });
    const loadMs = Date.now() - t0;
    await p.waitForTimeout(800); await dismissPopups(p);
    const tag = path === "/" ? "home" : path.replace(/^\/|\.html$/g, "").replace(/\W+/g, "_");
    const m = await measure(p);
    result.runs.push({ role, dev, page: path, status: resp ? resp.status() : null, loadMs, ...m, errors: errors.slice(before), shot: await shoot(tag) });
  }

  // App tabs inside index.html (nav buttons can be hidden on small screens → click via JS).
  if (views.length) {
    await p.goto(BASE + "/", { waitUntil: "load" }); await p.waitForTimeout(1500); await dismissPopups(p);
    for (const v of views) {
      const before = errors.length;
      const ok = await p.evaluate((v) => { const el = document.querySelector(`.tab-btn[data-view="${v}"]`); if (!el) return false; el.click(); return true; }, v);
      await p.waitForTimeout(1200); await dismissPopups(p);
      const m = ok ? await measure(p) : {};
      result.runs.push({ role, dev, view: v, found: ok, ...m, errors: errors.slice(before), shot: ok ? await shoot("view-" + v) : null });
    }
  }
  await b.close();
}

// Short summary for the console; the full data is in result.json.
fs.writeFileSync(`${outDir}/result.json`, JSON.stringify(result, null, 2));
const bad = result.runs.filter((r) => r.overflow > 0 || (r.errors || []).length || (r.brokenImages || []).length || (r.axe || []).some((a) => a.impact === "critical" || a.impact === "serious"));
console.log(`runs: ${result.runs.length}, screens with problems: ${bad.length}`);
for (const r of bad) {
  const where = `${r.role}/${r.dev}/${r.page || "view:" + r.view}`;
  const ax = (r.axe || []).filter((a) => a.impact === "critical" || a.impact === "serious").map((a) => `${a.id}×${a.n}`).join(" ");
  console.log(`- ${where}${r.overflow ? ` overflow=${r.overflow}px` : ""}${r.errors.length ? ` errors=${r.errors.length}` : ""}${r.brokenImages?.length ? ` broken=${r.brokenImages.length}` : ""}${ax ? ` axe: ${ax}` : ""}`);
}
console.log("done:", outDir);
