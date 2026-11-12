// Copies the Koala House build into public/house/ (stage 5 S10).
// Build it first in the house repo:  cd ../koala-house-3d && npm run build:site
// Then:  npm run house:sync            (or: node scripts/house-sync.mjs <path to dist-site>)
// public/house/ is replaced as a whole, so files from an older build never linger.
import fs from "fs";
import path from "path";

const src = path.resolve(process.argv[2] || "../koala-house-3d/dist-site");
const dest = path.resolve("public/house");
for (const f of ["index.html", "version.json", "admin/index.html"]) {
  if (!fs.existsSync(path.join(src, f))) { console.error(`missing ${f} in ${src} — run npm run build:site in koala-house-3d first`); process.exit(1); }
}
fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true });
const v = JSON.parse(fs.readFileSync(path.join(dest, "version.json"), "utf8"));
console.log(`public/house <- ${src}  (${v.label})`);
