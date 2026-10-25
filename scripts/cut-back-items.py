"""Item pictures for the straight BACK view of the dress-up koala, cut from the Gemini sheets made by make-back-sheets.py
(<gemini-ref>/backview-NN-out.(png|jfif|jpg), a 2x2 grid: the koala kept identical, the item redrawn from behind, flat green background).
For every cell: the koala silhouette of img/koala/back_base.webp is registered onto the cell (scale + shift, best overlap), the cell is warped
into the koala's own coordinates, and the item is whatever differs from the plain koala (or lies outside it). Each item is saved as
img/koala/back/<item>.webp, cropped, with its box in canvas units (the same units as KBOX: back_base sits at [64, 222, 617, 968]) written to
`const KBACK = {...}` in public/js/koala-house-ui.js.
Usage: python scripts/cut-back-items.py [gemini-ref folder] [only-sheet-number]"""
import json, os, re, sys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage
from scipy.signal import fftconvolve

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
REF = sys.argv[1] if len(sys.argv) > 1 else "I:/Koala Study Resources/gemini-ref"
ONLY = int(sys.argv[2]) if len(sys.argv) > 2 else None
IMG = os.path.join(ROOT, "public", "img", "koala")
UI = os.path.join(ROOT, "public", "js", "koala-house-ui.js")
SHEETS = os.path.join(ROOT, "Koala Images", "item-sheets")
META = json.load(open(os.path.join(SHEETS, "backviews.json")))
if os.path.exists(os.path.join(SHEETS, "backtall.json")): META += json.load(open(os.path.join(SHEETS, "backtall.json")))   # backtall-NN: cells with room above / beside the koala (tall hats, wings, capes)
BASE_XY = (64, 222)                       # back_base.webp sits here in canvas units (553 x 746)
PADL, PADT = 160, 210                     # room around the koala for hats / wings / capes (canvas units)
base = Image.open(os.path.join(IMG, "back_base.webp")).convert("RGBA"); BW, BH = base.size
base_a = np.array(base.getchannel("A")) > 128
base_rgb = np.array(base.convert("RGB")).astype(int)
os.makedirs(os.path.join(IMG, "back"), exist_ok=True)

def find(fn):
    stem = fn.replace(".png", "-out")
    for ext in (".png", ".jfif", ".jpg", ".jpeg", ".webp"):
        p = os.path.join(REF, stem + ext)
        if os.path.exists(p): return p

def green_dom(a): return a[..., 1] - np.maximum(a[..., 0], a[..., 2])

def register(nongreen):
    """scale + shift putting the plain koala silhouette onto the cell's non-green area (the item only ever adds area)"""
    H, W = nongreen.shape; ys, xs = np.where(nongreen[int(H * 0.12):]); ys += int(H * 0.12)
    s0 = (xs.max() - xs.min()) / BW; best = None
    cell = nongreen.astype(float)
    for s in np.arange(s0 * 0.80, s0 * 1.12, s0 * 0.012):
        w, h = max(8, round(BW * s)), max(8, round(BH * s))
        b = np.array(Image.fromarray((base_a * 255).astype(np.uint8)).resize((w, h), Image.BILINEAR)) > 128
        if b.shape[0] >= H or b.shape[1] >= W: continue
        inter = fftconvolve(cell, b[::-1, ::-1].astype(float), mode="valid")       # |cell ∩ base| for every shift
        score = inter / (b.sum() + 0.15 * cell.sum())                                # the koala must lie inside the cell area; extra area (the item) costs little
        iy, ix = np.unravel_index(np.argmax(score), score.shape)
        if best is None or score[iy, ix] > best[0]: best = (float(score[iy, ix]), float(s), int(ix), int(iy))
    return best

kback = {}
for sh in META:
    n = int(re.search(r"(\d+)", sh["file"]).group(1)); tall = sh.get("layout") == "tall"
    if ONLY and n != ONLY and not (tall and ONLY >= 100 and ONLY - 100 == n): continue
    f = find(sh["file"])   # backtall sheets: the output keeps the same name + -out
    if not f: print("missing", sh["file"]); continue
    out = Image.open(f).convert("RGB"); W, H = out.size
    for i, c in enumerate(sh["cells"]):
        item = c["item"]
        if tall: k = W / sh["size"][0]; q = (round(c["x"] * k), round(c["y"] * k), round((c["x"] + c["w"]) * k), round((c["y"] + c["h"]) * k)); labfrac = sh["label"] / c["h"]
        else: q = (W // 2 * (i % 2), H // 2 * (i // 2), W // 2 * (i % 2 + 1), H // 2 * (i // 2 + 1)) if len(sh["cells"]) > 1 else (0, 0, W, H); labfrac = 0.105
        cell = np.array(out.crop(q)).astype(int); ch, cw = cell.shape[:2]
        ng = green_dom(cell) < 90
        ng[: int(ch * labfrac)] = False                                   # the "1. Name" label band
        ng = ndimage.binary_opening(ng, iterations=1)
        lab, k = ndimage.label(ndimage.binary_dilation(ng, iterations=3)); sizes = ndimage.sum(ng, lab, range(1, k + 1))
        ng = np.isin(lab, [j + 1 for j, s_ in enumerate(sizes) if s_ > 0.05 * sizes.max()]) & ng      # drop the label text
        sc, s, ox, oy = register(ng)
        # warp the cell into koala coordinates (with room around), RGB and "non-green"
        M = (s, 0, ox - PADL * s, 0, s, oy - PADT * s)
        sizeC = (BW + 2 * PADL, BH + PADT + 60)
        rgb = Image.fromarray(cell.astype(np.uint8)).transform(sizeC, Image.AFFINE, M, Image.BICUBIC, fillcolor=(0, 255, 0))
        arr = np.array(rgb).astype(int)
        nong = green_dom(arr) < 90
        # the plain koala in the same coordinates
        bcanvas = np.zeros(arr.shape, int); ba = np.zeros(arr.shape[:2], bool)
        bcanvas[PADT:PADT + BH, PADL:PADL + BW] = base_rgb; ba[PADT:PADT + BH, PADL:PADL + BW] = base_a
        diff = np.sqrt(((arr - bcanvas) ** 2).sum(2))
        top = int((ch * labfrac - oy) / s) + PADT                          # rows of the label band in koala coordinates: nothing there
        nong[: max(0, top)] = False
        near = ndimage.binary_dilation(ba, iterations=7)                 # the registration is good to a few pixels: a thin ring around the koala is not an item
        inside = nong & ba & (diff > 38)
        outside = ndimage.binary_opening(nong & ~near, iterations=3)
        item = ndimage.binary_opening(inside, iterations=2) | outside
        # keep what is the item: pieces touching the koala or big
        lab, k = ndimage.label(ndimage.binary_dilation(item, iterations=4)); sizes = ndimage.sum(item, lab, range(1, k + 1))
        item = np.isin(lab, [j + 1 for j, s_ in enumerate(sizes) if s_ > 220]) & item
        item = ndimage.binary_closing(item, iterations=4); item = ndimage.binary_fill_holes(item)
        # items that lie ON the koala (clothes) hide it: take them whole; despill green at the rim
        A = Image.fromarray((item * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.9))
        rgbo = arr.copy(); mx = np.maximum(rgbo[..., 0], rgbo[..., 2])
        rim = ndimage.binary_dilation(~item, iterations=4) & item
        rgbo[..., 1] = np.where(rim, np.minimum(rgbo[..., 1], mx + 6), rgbo[..., 1])
        im = Image.fromarray(np.clip(rgbo, 0, 255).astype(np.uint8), "RGB").convert("RGBA"); im.putalpha(A)
        bb = A.point(lambda v: 255 if v > 40 else 0).getbbox()
        if not bb: print("nothing for", item and sh["file"], c["item"]); continue
        im.crop(bb).save(os.path.join(IMG, "back", c["item"] + ".webp"), "WEBP", quality=92, method=6)
        kback[c["item"]] = [round(BASE_XY[0] + bb[0] - PADL, 1), round(BASE_XY[1] + bb[1] - PADT, 1), round(BASE_XY[0] + bb[2] - PADL, 1), round(BASE_XY[1] + bb[3] - PADT, 1)]
        print("%-14s fit %.2f scale %.3f  box %s" % (c["item"], sc, s, kback[c["item"]]))

s_ = open(UI, encoding="utf-8").read()
old = {}
m = re.search(r"  const KBACK = (\{.*?\});", s_)
if m: old = json.loads(m.group(1))
old.update(kback)
line = "  const KBACK = %s;   // pictures of the worn items seen from straight behind (img/koala/back/<item>.webp): [x0,y0,x1,y1] in KBOX units (scripts/cut-back-items.py)" % json.dumps(old, separators=(",", ":"))
if m: s_ = re.sub(r"  const KBACK = \{.*?\};.*", lambda mm: line, s_, count=1)
else: s_ = s_.replace("  const KBEHIND = ", line + "\n  const KBEHIND = ", 1)
open(UI, "w", encoding="utf-8").write(s_)
