// Browser-test helper for Koala Study Mate (see SKILL.md). Local only: talks to `wrangler dev --port 8799`.
import { chromium } from "playwright-core";
import crypto from "crypto";
import fs from "fs";

export const BASE = "http://127.0.0.1:8799";
const SECRET = "localtestsecret123"; // must match .dev.vars written by setup.sh
const USERS = { admin: "adm1", paid: "paid1", free: "free1" };

const BROWSERS = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
];

// role: "admin" | "paid" | "free" | "none" (logged out). The session cookie is stateless + HMAC-signed.
export async function open({ role = "admin", width = 1200, height = 1000, touch = false } = {}) {
  const executablePath = BROWSERS.find((f) => fs.existsSync(f));
  if (!executablePath) throw new Error("No Edge/Chrome found — edit BROWSERS in lib.mjs");
  const b = await chromium.launch({ executablePath, headless: true });
  const ctx = await b.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch, deviceScaleFactor: touch ? 2 : 1 });
  if (role !== "none") {
    const payload = `${USERS[role]}.${role}.${Date.now() + 6 * 3600e3}`;
    const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
    await ctx.addCookies([{ name: "ywp_session", value: encodeURIComponent(`${payload}.${sig}`), url: BASE }]);
  }
  const p = await ctx.newPage();
  p.on("pageerror", (e) => console.log("PAGEERR", e.message));
  p.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE", m.text().slice(0, 200)); });
  return { b, p, ctx };
}

// Free/guest accounts get a "Good to know" note on first load that blocks clicks — close it.
export async function dismissPopups(p) {
  const ok = p.locator("#datanote-overlay:not([hidden]) #datanote-ok-btn");
  if (await ok.count()) { await ok.click().catch(() => {}); await p.waitForTimeout(300); }
}

// Open My Koala (nav buttons may be hidden on small screens, so click through JS).
export async function gotoKoala(p) {
  await p.goto(BASE + "/");
  await p.waitForTimeout(2500);
  await dismissPopups(p);
  await p.evaluate(() => document.querySelector('.tab-btn[data-view="koala"]').click());
  await p.waitForTimeout(2000);
}

// A transparent PNG (coloured triangle with empty margins) for item-upload tests. Writes it to `file`.
export async function makePng(p, file, color = "#e0245e") {
  const b64 = await p.evaluate((col) => {
    const c = document.createElement("canvas"); c.width = 600; c.height = 600;
    const g = c.getContext("2d");
    g.fillStyle = col; g.beginPath(); g.moveTo(300, 120); g.lineTo(420, 460); g.lineTo(180, 460); g.closePath(); g.fill();
    return c.toDataURL("image/png").split(",")[1];
  }, color);
  fs.writeFileSync(file, Buffer.from(b64, "base64"));
  return file;
}
