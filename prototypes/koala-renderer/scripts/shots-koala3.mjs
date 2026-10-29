// 코알라 관절 팔다리 시안 D~F: node scripts/shots-koala3.mjs [baseURL] [outDir]
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
const base = process.argv[2] ?? "http://127.0.0.1:4178/";
const out = process.argv[3] ?? "docs/review-2026-10-29c";
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ channel: "chrome" });
const problems = [];
for (const d of ["cuddle", "climber", "joey", "plush"]) {
  const ctx = await b.newContext({ viewport: { width: 1000, height: 900 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => problems.push(e.message));
  await p.goto(base + `koala.html?design=${d}&still=1`); await p.waitForTimeout(700);
  await p.locator(".sheet").screenshot({ path: `${out}/koala-${d}.png` }); await ctx.close();
}
await b.close();
console.log(problems.length ? problems : "문제 없음");
