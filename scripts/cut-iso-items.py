"""Cut the Gemini sheets (item on flat green, 3/4 view) apart into public/img/koala/<item>_iso.webp and
write where each sits (canvas coords, same system as KBOX) into the `const KISO = ...` line of public/js/koala-house-ui.js.
Inputs: <gemini-ref>/sheet-NN-<group>-out.jfif and redo-NN-out.jfif (+ sheets.json / redo.json from the make-*-sheets scripts).
Usage: python scripts/cut-iso-items.py [gemini-ref folder]"""
import glob, json, math, os, re, sys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

ROOT = os.path.join(os.path.dirname(__file__), "..")
REF = sys.argv[1] if len(sys.argv) > 1 else "I:/Koala Study Resources/gemini-ref"
SHEETS = os.path.join(ROOT, "Koala Images", "item-sheets")
IMG = os.path.join(ROOT, "public", "img", "koala")
UI = os.path.join(ROOT, "public", "js", "koala-house-ui.js")
src = open(UI, encoding="utf-8").read()
KBOX = {"hoodie": [122, 528, 562, 819], "backpack": [131, 545, 560, 832], "scarf": [185, 531, 497, 780], "glasses": [162, 362, 520, 500], "bushhat": [108, 188, 574, 441], "partyhat": [259, 100, 422, 290], "crown": [249, 190, 433, 295]}
for k, v in re.findall(r'"(\w+)": \[(\d+, \d+, \d+, \d+)\]', src.split("const K3")[0].split("const KBOX")[1]): KBOX[k] = [int(x) for x in v.split(",")]
# manual nudges after looking at them in the room: item -> [dx, dy, scale] (canvas units)
ADJ = json.load(open(os.path.join(os.path.dirname(__file__), "iso-item-adjust.json"))) if os.path.exists(os.path.join(os.path.dirname(__file__), "iso-item-adjust.json")) else {}
# items taken from a redo sheet instead of the main one (later wins)
REDO_WINS = {"crown", "freckles", "sandals", "soccercleats", "bunnyslippers", "rollerskates"}

def key_alpha(rgb, bg=None):
    """alpha from the distance to the flat green (its colour is read from the picture), so green items (jersey, cleats) keep their colour"""
    a = rgb.astype(int)
    if bg is None:
        dom = a[..., 1] - np.maximum(a[..., 0], a[..., 2]); sel = a[dom > 140]
        bg = np.median(sel, axis=0) if len(sel) > 200 else np.array([0, 255, 0])
    d = np.sqrt(((a - bg) ** 2).sum(axis=2))
    return a, np.clip((d - 70) / 60.0, 0, 1), bg

GREENISH = {"jersey", "soccercleats", "backpack", "bushhat", "flowercrown", "scarf", "cargopants", "goggles", "monocle", "wizardhat", "bunnyears"}   # items whose own colours are green: no rim clean-up
def cut(out_img, quad, label_frac, item_name=""):
    """quad = (x0,y0,x1,y1) in output px. Returns (RGBA image of the item, bbox in quad px) or None."""
    x0, y0, x1, y1 = quad; w, h = x1 - x0, y1 - y0
    full = np.asarray(out_img.crop(quad).convert("RGB")); _, gal, bgc = key_alpha(full)
    big = ndimage.binary_opening(gal < 0.02, iterations=3)         # the flat green square (the cell), without the frame lines / labels around it
    ys, xs = np.where(big); gx0, gy0, gx1, gy1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    pad = round(min(gx1 - gx0, gy1 - gy0) * 0.015)
    gx0 += pad; gy0 += pad; gx1 -= pad; gy1 -= pad
    rgb = full[gy0:gy1, gx0:gx1]; pad_x, pad_y = x0 + gx0, y0 + gy0
    a, al, _ = key_alpha(rgb, bgc)
    ph, pw = al.shape
    al[: round(ph * label_frac), : round(pw * 0.6)] = 0          # the "1. Name" label
    m = al > 0.5
    lab, n = ndimage.label(ndimage.binary_dilation(m, iterations=6))
    if n == 0: return None
    sizes = ndimage.sum(m, lab, range(1, n + 1)); keep = [i + 1 for i, s in enumerate(sizes) if s >= 25]
    if not keep: return None
    mask = np.isin(lab, keep) & ndimage.binary_dilation(m, iterations=6)
    al = al * mask
    # despill the semi-transparent edge, then pull the edge in a hair so no green rim is left
    edge = ndimage.binary_dilation((al < 0.98) & (al > 0), iterations=2) & (al > 0); a2 = a.copy(); mx = np.maximum(a2[..., 0], a2[..., 2])
    a2[..., 1] = np.where(edge, np.minimum(a2[..., 1], mx), a2[..., 1])
    near = ndimage.binary_dilation(al < 0.5, iterations=4) & (al > 0)                    # a bright green tint right at the outline is spill, not the item's own colour
    spill = near & (a2[..., 1] > 185) & ((a2[..., 1] - mx) > 35)
    a2[..., 1] = np.where(spill, np.minimum(a2[..., 1], mx + 10), a2[..., 1])
    if item_name not in GREENISH:                                                         # soft edges (tulle, fur): any green left within a few pixels of the outline is spill
        rim = ndimage.binary_dilation(al < 0.5, iterations=6) & (al > 0) & ((a2[..., 1] - mx) > 18)
        a2[..., 1] = np.where(rim, np.minimum(a2[..., 1], mx + 4), a2[..., 1])
    tint = (al > 0) & (a2[..., 1] > 175) & ((a2[..., 1] - mx) > 60)                   # glass lenses / holes that still carry the flat green
    a2[..., 1] = np.where(tint, np.minimum(a2[..., 1], mx + 10), a2[..., 1])
    if item_name in ("tutu", "angelwings", "butterflywings"): al = np.where((a2[..., 1] - mx) > 6, 0, al)
    A = Image.fromarray((al * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.5))
    im = Image.fromarray(a2.astype(np.uint8), "RGB").convert("RGBA"); im.putalpha(A)
    bb = A.point(lambda v: 255 if v > 40 else 0).getbbox()
    if not bb: return None
    return im.crop(bb), (bb[0] + pad_x, bb[1] + pad_y, bb[2] + pad_x, bb[3] + pad_y), (pad_x - pad, pad_y - pad, x0 + gx1 + pad, y0 + gy1 + pad)

def quads(size, ncells):
    W, H = size; rows = 2 if (ncells > 2 or H / W > 0.75) else 1
    return [((i % 2) * W // 2, (i // 2) * H // rows, ((i % 2) + 1) * W // 2, (i // 2 + 1) * H // rows) for i in range(ncells)], rows

results = {}   # item -> (image, canvas box)
alt = {}
MODE = os.environ.get("MODE", "hybrid")   # fit: size/centre taken from the front item; direct: where Gemini drew it in the cell; hybrid: direct centre for hats, fit for the rest
HATS = re.findall(r'"(\w+)"', re.search(r"const KSLOT = \{ hat: \[([^\]]*)\]", src).group(1))
def handle(item, got, geo, orig, geo_direct=None):
    """geo: function px(quad box)->canvas units box. Fit by the geometric mean of the width/height ratios, centred on the front item."""
    im, bb, quad = got
    cb = geo(bb, quad)
    ox0, oy0, ox1, oy1 = orig; ow, oh = ox1 - ox0, oy1 - oy0
    w, h = cb[2] - cb[0], cb[3] - cb[1]
    s = math.sqrt((ow / w) * (oh / h))
    nw, nh = w * s, h * s; cx, cy = (ox0 + ox1) / 2, (oy0 + oy1) / 2
    dx, dy, sc = ADJ.get(item, [0, 0, 1])
    nw, nh = nw * sc, nh * sc
    fit = [round(cx + dx - nw / 2, 1), round(cy + dy - nh / 2, 1), round(cx + dx + nw / 2, 1), round(cy + dy + nh / 2, 1)]
    direct = [round(v, 1) for v in geo_direct(bb, quad)] if geo_direct else fit
    hybrid = fit
    if item in HATS:   # hats: Gemini's own centre (where it seated the hat on the 3/4 head) with the front item's size
        w2, h2 = fit[2] - fit[0], fit[3] - fit[1]; hx, hy = (direct[0] + direct[2]) / 2 + dx, (direct[1] + direct[3]) / 2 + dy
        hybrid = [round(hx - w2 / 2, 1), round(hy - h2 / 2, 1), round(hx + w2 / 2, 1), round(hy + h2 / 2, 1)]
    results[item] = (im, direct if MODE == "direct" else fit if MODE == "fit" else hybrid)
    alt[item] = {"fit": fit, "direct": direct}

# main sheets: the item picture is a quadrant of the output; the in-cell position is only used relative to the cell
meta = json.load(open(os.path.join(SHEETS, "sheets.json")))
for sh in meta:
    f = os.path.join(REF, sh["file"].replace(".png", "-out.jfif"))
    if not os.path.exists(f): print("missing", f); continue
    out = Image.open(f).convert("RGB"); qs, rows = quads(out.size, len(sh["cells"]))
    for c, q in zip(sh["cells"], qs):
        if c["item"] in REDO_WINS: continue
        got = cut(out, q, 0.12, c["item"])
        if not got: print("nothing for", c["item"]); continue
        rg = sh["region"]; rw, rh = rg[2] - rg[0], rg[3] - rg[1]; cw, ch = c["w"], c["h"]; LABH = 51
        def gd(bb, sq, rg=rg, rw=rw, rh=rh, cw=cw, ch=ch):
            sx0, sy0, sx1, sy1 = sq; sw, sh_ = sx1 - sx0, sy1 - sy0
            if abs(sw / sh_ - cw / (ch + LABH)) < abs(sw / sh_ - cw / ch): sy0 += sh_ * LABH / (ch + LABH); sh_ = sy1 - sy0   # the "1. Name" label sits inside the green square
            return (rg[0] + (bb[0] - sx0) / sw * rw, rg[1] + (bb[1] - sy0) / sh_ * rh, rg[0] + (bb[2] - sx0) / sw * rw, rg[1] + (bb[3] - sy0) / sh_ * rh)
        handle(c["item"], got, gd, KBOX[c["item"]], gd)
# redo sheets: the cell is a zoomed crop, so keep the position (canvas units) but still normalise size to the front item
red = json.load(open(os.path.join(SHEETS, "redo.json")))
order = {}
for r in red:
    for c in r["cells"]: order.setdefault(c["item"], []).append((r["file"], c))
for item, lst in order.items():
    for fn, c in lst[::-1]:                                        # newest redo sheet wins; skip a missing file
        f = os.path.join(REF, fn.replace(".png", "-out.jfif"))
        if os.path.exists(f): break
    else: continue
    out = Image.open(f).convert("RGB"); r = next(r for r in red if r["file"] == fn); qs, rows = quads(out.size, len(r["cells"]))
    q = qs[[x["item"] for x in r["cells"]].index(item) if fn != "redo-03.png" or True else 0]
    got = cut(out, q, 0.14, item)
    if not got: print("nothing for", item, fn); continue
    side, cx, cy = c["side"], c["cx"], c["cy"]
    # the green square is the zoomed cell: its width is `side` canvas units
    def geo(bb, sq): sw = sq[2] - sq[0]; return tuple((cx if i % 2 == 0 else cy) - side / 2 + ((bb[i] - sq[i % 2]) / sw) * side for i in range(4))
    handle(item, got, geo, KBOX[item], geo)

kiso = {}
for item, (im, box) in sorted(results.items()):
    im.save(os.path.join(IMG, item + "_iso.webp"), "WEBP", quality=90, method=6)
    kiso[item] = box
line = "  const KISO = " + json.dumps(kiso, separators=(",", ":")) + ";   // 3/4-view item pictures (img/koala/<item>_iso.webp) for the iso body: [x0,y0,x1,y1] in KBOX units (made by scripts/cut-iso-items.py)"
s = open(UI, encoding="utf-8").read()
s = re.sub(r"  const KISO = .*\n", lambda m: line + "\n", s) if "const KISO = " in s else s.replace("  const KBEHIND = ", line + "\n  const KBEHIND = ", 1)
open(UI, "w", encoding="utf-8").write(s)
json.dump(alt, open(os.path.join(SHEETS, "kiso-modes.json"), "w"))
print(len(kiso), "items cut:", " ".join(sorted(kiso)))
