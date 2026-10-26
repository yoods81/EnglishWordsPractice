"""Straight-back item pictures from Gemini sheets where ONLY the item is redrawn (no koala) on flat green, at the place it sits on the koala.
Sheets: make-back-sheets.py (backview-NN, backtall-NN); results: <gemini-ref>/backview-NN-out.* / backtall-NN-out.*  (same grid as the input).
Each cell is cut with the same green-key code as the 3/4 pictures (cut-iso-items.py); Gemini keeps the place and scale of the item from the input cell, so the box where it drew the item is used as it is.
Writes img/koala/back/<item>.webp and `const KBACK` (box in KBOX units) into public/js/koala-house-ui.js.
Usage: python scripts/cut-back-alone.py [gemini-ref folder] [file stem e.g. backview-04]"""
import json, math, os, re, sys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
lib = open(os.path.join(ROOT, "scripts", "cut-iso-items.py"), encoding="utf-8").read().split("results = {}")[0]
_argv = sys.argv; sys.argv = [_argv[0]] + ([_argv[1]] if len(_argv) > 1 else [])
exec(compile(lib, "cut-iso-items-lib", "exec"))     # REF, IMG, UI, src, KBOX, key_alpha, cut
sys.argv = _argv
STEM = sys.argv[2] if len(sys.argv) > 2 else None
SH = os.path.join(ROOT, "Koala Images", "item-sheets")
META = json.load(open(os.path.join(SH, "backviews.json")))
if os.path.exists(os.path.join(SH, "backtall.json")): META += json.load(open(os.path.join(SH, "backtall.json")))
BASE_XY = (64, 222)
KSLOT_BODY = re.findall(r'"(\w+)"', re.search(r"body: \[([^\]]*)\]", src).group(1)); KSLOT_LEGS = re.findall(r'"(\w+)"', re.search(r"legs: \[([^\]]*)\]", src).group(1))
HATS = re.findall(r'"(\w+)"', re.search(r"const KSLOT = \{ hat: \[([^\]]*)\]", src).group(1))
os.makedirs(os.path.join(IMG, "back"), exist_ok=True)

def find(fn):
    stem = fn.replace(".png", "-out")
    for ext in (".png", ".jfif", ".jpg", ".jpeg", ".webp"):
        p = os.path.join(REF, stem + ext)
        if os.path.exists(p): return p

kback = {}
for sh in META:
    if STEM and not sh["file"].startswith(STEM): continue
    f = find(sh["file"])
    if not f: print("missing", sh["file"]); continue
    out = Image.open(f).convert("RGB"); W, H = out.size; k = W / sh["size"][0]            # sheet px -> output px
    tall = sh.get("layout") == "tall"; ox0 = BASE_XY[0] - (sh["koala"][0] if tall else 0); oy0 = BASE_XY[1] - (sh["koala"][1] if tall else 0)
    for c in sh["cells"]:
        item = c["item"]; q = tuple(round(v * k) for v in (c["x"] - (0), c["y"] - (51 if not tall else 0), c["x"] + c["w"], c["y"] + c["h"]))
        lab = (0.075 if sh["file"].startswith(("backview-01", "backview-02", "backview-05", "backview-06")) else 0.0)   # the labels of these four sheets sit INSIDE the green panel (top-left), on the others above it
        src_img = out
        if sh["file"].startswith("backview-08"):   # this sheet came back with a green koala silhouette in each cell: the shoes are the non-green things in the lowest strip of the green panel
            arr = np.array(out).astype(int); Wq, Hq = out.size; i_ = sh["cells"].index(c)
            qq = (Wq // 2 * (i_ % 2), Hq // 2 * (i_ // 2), Wq // 2 * (i_ % 2 + 1), Hq // 2 * (i_ // 2 + 1)); sub = arr[qq[1]:qq[3], qq[0]:qq[2]]
            dom = sub[..., 1] - np.maximum(sub[..., 0], sub[..., 2]); green = dom > 140
            bgc = np.median(sub[:6].reshape(-1, 3), axis=0)           # the cell is not green here, only the koala silhouette is: the light sheet colour round it is the background too
            plain0 = np.sqrt(((sub - bgc) ** 2).sum(2)) < 45
            lp, npl = ndimage.label(plain0); edge = set(np.unique(np.concatenate([lp[0], lp[-1], lp[:, 0], lp[:, -1]]))) - {0}
            plain = np.isin(lp, list(edge))                          # only the light sheet colour that reaches the cell border is background: white shoes keep their white (heels were see-through)
            ng = (~green) & (~plain) & (dom < 90); H8 = ng.shape[0]
            ng[: round(H8 * 0.62)] = False; ng[round(H8 * 0.985):] = False; ng = ndimage.binary_opening(ng, iterations=2); ng = ndimage.binary_closing(ng, iterations=12); ng = ndimage.binary_fill_holes(ng)   # white shoes look like the light background: close the gaps
            lab2, n2 = ndimage.label(ndimage.binary_dilation(ng, iterations=3)); sz = ndimage.sum(ng, lab2, range(1, n2 + 1)); ng = np.isin(lab2, [j + 1 for j, v in enumerate(sz) if v > 250]) & ng
            if not ng.any(): print("nothing for", item); continue
            ng &= ~ndimage.binary_dilation(green, iterations=2)   # the green silhouette between the two shoes must not be filled in
            ys2, xs2 = np.where(ng); bx0, by0, bx1, by1 = xs2.min(), ys2.min(), xs2.max() + 1, ys2.max() + 1
            al = ndimage.binary_dilation(ng, iterations=1); A = Image.fromarray((al * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))
            rgbs = sub.copy(); mx = np.maximum(rgbs[..., 0], rgbs[..., 2]); rim = ndimage.binary_dilation(~ng, iterations=3) & al; rgbs[..., 1] = np.where(rim, np.minimum(rgbs[..., 1], mx + 6), rgbs[..., 1])
            im = Image.fromarray(np.clip(rgbs, 0, 255).astype(np.uint8), "RGB").convert("RGBA"); im.putalpha(A); im = im.crop((bx0, by0, bx1, by1))
            w0, h0 = im.size; nw = (483 - 200) * 0.92; nh = h0 * nw / w0; cx = (200 + 483) / 2; cy = 968 - nh / 2 + 6
            box = [round(cx - nw / 2, 1), round(cy - nh / 2, 1), round(cx + nw / 2, 1), round(cy + nh / 2, 1)]
            im.save(os.path.join(IMG, "back", item + ".webp"), "WEBP", quality=92, method=6); kback[item] = box; print("%-14s feet box %s" % (item, box)); continue
        got = cut(src_img, q, lab, item)
        if got:   # keep only the pieces that belong to the item: whatever is much smaller than the biggest piece is label text or a stray speck
            g_im, g_bb, g_sq = got; ga = np.array(g_im.getchannel("A")) > 40; gl, gk = ndimage.label(ndimage.binary_dilation(ga, iterations=6))
            if gk > 1:
                gs = ndimage.sum(ga, gl, range(1, gk + 1)); keepl = [j + 1 for j, v in enumerate(gs) if v >= 0.06 * gs.max()]
                gm = np.isin(gl, keepl) & ga; arr_ = np.array(g_im); arr_[..., 3] = np.where(gm, arr_[..., 3], 0); g_im = Image.fromarray(arr_, "RGBA"); got = (g_im, g_bb, g_sq)
        if not got: print("nothing for", item); continue
        im, bb, sq = got
        # where the cell's own koala canvas starts (canvas units = sheet px)
        cx0 = (c["x"]) * k; cy0 = (c["y"]) * k
        direct = [ox0 + (bb[0] - cx0) / k, oy0 + (bb[1] - cy0) / k, ox0 + (bb[2] - cx0) / k, oy0 + (bb[3] - cy0) / k]
        fb = KBOX[item]; ow, oh = fb[2] - fb[0], fb[3] - fb[1]; w, h = direct[2] - direct[0], direct[3] - direct[1]
        if sh["file"].startswith("backview-08"):
            fx0, fx1, fy1 = 200, 483, 968   # the feet of the back koala (canvas units)
            w0 = (bb[2] - bb[0]); h0 = (bb[3] - bb[1]); nw = (fx1 - fx0) * 0.80; nh = h0 * nw / w0; cx = (fx0 + fx1) / 2; cy = fy1 - nh / 2 + 8
        elif sh["file"].startswith(("backview-01", "backview-02", "backview-05", "backview-06")) and item not in ("gradhat", "wizardhat", "santahat"):
            # sheets redrawn with a different shape than the front item (long trousers, a real coat, a back-of-the-hat view): sized by the WIDTH of the front item, anchored by what the item is
            s = 1.0; nw = ow; nh = nw * h / w; cx = (fb[0] + fb[2]) / 2
            if item in HATS: cy = fb[3] - nh / 2
            else:   # clothes: fitted to the back koala's own body (canvas units): [width, top, bottom]
                FIT = {"jeans": (300, 690, 955), "khakishorts": (300, 690, 955), "cargopants": (300, 690, 955), "sweatpants": (300, 690, 955), "overalls": (372, 563, 945), "pinkdress": (400, 563, 868), "labcoat": (440, 563, 885), "jersey": (400, 563, 848)}
                if item in FIT: nw, top, bot = FIT[item]; nh = bot - top; cy = (top + bot) / 2
                else: cy = 563 + nh / 2
        elif True:   # since the sheets of 08 on do not keep the place of the input cell, every item is sized by the front item's box and put on the front item's centre; the roomy sheets: Gemini draws the item big and in the middle of its panel, so size by the front item's box (geometric mean of the ratios) and centre on it
            s = math.sqrt((ow / w) * (oh / h)) if (w > 0 and h > 0) else 1.0; nw, nh = w * s, h * s
            cx, cy = ((direct[0] + direct[2]) / 2, (direct[1] + direct[3]) / 2) if False else ((fb[0] + fb[2]) / 2, (fb[1] + fb[3]) / 2)
        else:      # Gemini keeps the place and scale of the item from the input cell: the drawn box is used as it is (a back view may be another shape: a hood, a longer hem)
            s = 1.0; nw, nh = w, h; cx, cy = (direct[0] + direct[2]) / 2, (direct[1] + direct[3]) / 2
        box = [round(cx - nw / 2, 1), round(cy - nh / 2, 1), round(cx + nw / 2, 1), round(cy + nh / 2, 1)]
        im.save(os.path.join(IMG, "back", item + ".webp"), "WEBP", quality=92, method=6); kback[item] = box
        print("%-14s box %s (drawn %s, scale x%.2f)" % (item, box, [round(v) for v in direct], s))

s_ = open(UI, encoding="utf-8").read(); m = re.search(r"  const KBACK = (\{.*?\});", s_)
old = json.loads(m.group(1)) if m else {}; old.update(kback)
line = "  const KBACK = %s;   // pictures of the worn items seen from straight behind (img/koala/back/<item>.webp): [x0,y0,x1,y1] in KBOX units (scripts/cut-back-alone.py)" % json.dumps(old, separators=(",", ":"))
s_ = re.sub(r"  const KBACK = \{.*?\};.*", lambda mm: line, s_, count=1) if m else s_.replace("  const KBEHIND = ", line + "\n  const KBEHIND = ", 1)
open(UI, "w", encoding="utf-8").write(s_)
