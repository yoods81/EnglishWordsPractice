// Koala pose audit: the room exactly as a user sees it (real size, no zoom) + a 3x crop of the koala, for every facing.
// usage: node koala-audit.mjs <outDir> [width=1920] [height=850] [role=admin] [outfitJSON]
import { open, gotoKoala } from "./lib.mjs";
import fs from "fs";
const [outDir, W = "1920", H = "850", role = "admin", outfitJson] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const worn = outfitJson ? JSON.parse(outfitJson) : { hat: "wizardhat", neck: "scarf", body: "tshirt", legs: "jeans", feet: "sneakers", back: "backpack" };
const { b, p } = await open({ role, width: +W, height: +H, dsf: 3 });
await p.addInitScript(() => { try { localStorage.setItem("ywp_lang_v1", "ko"); } catch (e) {} });
await gotoKoala(p);
await p.evaluate((worn) => { const S = KoalaHouse.load(); S.worn = worn; Object.values(worn).forEach((n) => { S.owned[n] = 1; }); KoalaHouse.persist(S); }, worn);
await p.reload(); await p.waitForTimeout(1500);
await p.evaluate(() => { const o = KoalaHouse.setWardApi; KoalaHouse.setWardApi = (a) => o(a && Object.assign({}, a, { status: () => ({ state: "owned" }) })); });
await p.evaluate(() => document.querySelector('.tab-btn[data-view="koala"]').click()); await p.waitForTimeout(900);
await p.evaluate(() => document.querySelector('[data-koala-dim="3d"]')?.click()); await p.waitForTimeout(900);
await p.evaluate(() => document.querySelector('[data-koala-tab="room"]')?.click()); await p.waitForTimeout(900);
await p.evaluate(() => document.querySelector(".kh-proom")?.dispatchEvent(new MouseEvent("click", { bubbles: true }))); await p.waitForTimeout(2200);
const kbox = () => p.evaluate(() => { const q = document.querySelector(".kh-koala").getBoundingClientRect(); return { x: q.x, y: q.y, w: q.width, h: q.height }; });
export async function shots(tag) {
  await p.evaluate(() => document.querySelector('[data-act="x"]')?.click()); await p.waitForTimeout(500);
  await p.screenshot({ path: `${outDir}/${tag}-room.png`, scale: "css" });
  const k = await kbox(); const pad = 14;
  await p.screenshot({ path: `${outDir}/${tag}-koala.png`, clip: { x: Math.max(0, k.x - pad), y: Math.max(0, k.y - pad), width: k.w + pad * 2, height: k.h + pad * 2 } });
}
// stand / sit / lie on the floor, in the four facings, turned with the real menu buttons
const kb = await kbox(); await p.mouse.click(kb.x + kb.w / 2, kb.y + kb.h * 0.5); await p.waitForTimeout(700);
const press = async (act) => { await p.evaluate((a) => document.querySelector(`.kh-mbtn[data-act="${a}"]`)?.click(), act); await p.waitForTimeout(1300); };
const reselect = async () => { const k = await kbox(); await p.mouse.click(k.x + k.w / 2, k.y + k.h * 0.5); await p.waitForTimeout(500); };
for (let d = 0; d < 4; d++) {
  await press("rot"); await shots(`d${d}-stand`); await reselect();
  await press("sit"); await shots(`d${d}-sit`); await reselect();
  await press("sit"); await shots(`d${d}-lie`); await reselect();
  await press("sit"); await reselect();            // up again
}
await b.close();
