"""Back-view and lying-view item pictures from the Gemini sheets made by make-view-sheets.py.
 back  (view-01..11): the item alone on green  -> img/koala/<item>_isob.webp, placed from the front item's box mapped onto the back body
 lying (view-21..25): the koala is kept, background green -> diff against iso_lie.webp -> img/koala/<item>_isol.webp, box in iso_lie pixels
Writes `const KISOB = ...` and `const KISOL = ...` into public/js/koala-house-ui.js.
Usage: python scripts/cut-view-items.py [gemini-ref folder]"""
import json, os, re, sys, math
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

lib = open(os.path.join(os.path.dirname(__file__), "cut-iso-items.py"), encoding="utf-8").read().split("results = {}")[0]
exec(compile(lib, "cut-iso-items-lib", "exec"))     # imports, REF, SHEETS, IMG, UI, src, KBOX, key_alpha, cut, quads

def body_bbox(name, W, H):
    a = np.array(Image.open(os.path.join(IMG, name)).convert("RGBA").resize((W, H)))[..., 3] > 128
    ys, xs = np.where(a); return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
BASE = (64, 222, 617, 968)
fb = body_bbox("iso_stand_f.webp", 553, 746); bb_ = body_bbox("iso_stand_b.webp", 553, 746)
def to_back(box):      # a front item's box -> the same spot on the back body (relative to each body's silhouette)
    fw, fh, bw, bh = fb[2] - fb[0], fb[3] - fb[1], bb_[2] - bb_[0], bb_[3] - bb_[1]
    x0, y0, x1, y1 = box; X = lambda x: BASE[0] + bb_[0] + (x - BASE[0] - fb[0]) / fw * bw; Y = lambda y: BASE[1] + bb_[1] + (y - BASE[1] - fb[1]) / fh * bh
    return [X(x0), Y(y0), X(x1), Y(y1)], bw / fw

LIE_SLOT = {"hat": (130, 40, 560, 330), "face": (220, 220, 520, 400), "neck": (440, 330, 700, 470), "body": (430, 250, 900, 560), "legs": (700, 380, 1050, 640), "feet": (820, 330, 1076, 680)}   # where each kind of item sits on iso_lie.webp (same as make-view-sheets.py)
KSLOT = {k: re.findall(r'"(\w+)"', v) for k, v in re.findall(r"(\w+): \[([^\]]*)\]", re.search(r"const KSLOT = \{(.*?)\};", src, re.S).group(1))}
kisob, kisol = {}, {}
SKIP_LIE = {"jeans", "khakishorts", "sneakers", "freckles", "monocle", "pearlnecklace", "scarf", "glasses", "heartpendant"}   # Gemini drew them torn / on the belly: lying koala shows them without these
REDO = {"flowercrown", "beanie", "cowboyhat", "butterflywings", "surfboard"}
views = json.load(open(os.path.join(SHEETS, "views.json")))
redo = json.load(open(os.path.join(SHEETS, "viewredo.json"))) if os.path.exists(os.path.join(SHEETS, "viewredo.json")) else []
def find(fn):
    base = fn.replace(".png", "-out")
    for ext in (".jfif", ".png", ".jpg", ".webp"):
        for nm in (base + ext, re.sub(r"-(back|lie)-\w+-out", "", base) + ext):
            p = os.path.join(REF, nm)
            if os.path.exists(p): return p
    g = [f for f in os.listdir(REF) if f.startswith(fn.split("-")[0] + "-" + fn.split("-")[1] + "-") and "-out" in f]
    return os.path.join(REF, g[0]) if g else None

# ---- back
done = {}
for sh in redo + [s for s in views if s["view"] == "back"]:
    f = find(sh["file"])
    if not f: print("missing", sh["file"]); continue
    out = Image.open(f).convert("RGB"); qs, rows = quads(out.size, len(sh["cells"]))
    for c, q in zip(sh["cells"], qs):
        it = c["item"]
        if it in done or (it in REDO and not sh["file"].startswith("viewredo")): continue
        got = cut(out, q, 0.12, it)
        if not got: print("nothing for", it); continue
        im, bb, sq = got; box, k = to_back(KBOX[it])
        w, h = bb[2] - bb[0], bb[3] - bb[1]; ow, oh = (box[2] - box[0]), (box[3] - box[1])
        s = math.sqrt((ow / w) * (oh / h)); nw, nh = w * s, h * s; cx, cy = (box[0] + box[2]) / 2, (box[1] + box[3]) / 2
        im.save(os.path.join(IMG, it + "_isob.webp"), "WEBP", quality=90, method=6)
        kisob[it] = [round(cx - nw / 2, 1), round(cy - nh / 2, 1), round(cx + nw / 2, 1), round(cy + nh / 2, 1)]; done[it] = 1

# hats seen from behind: sit on the top of the back head (head centre x~335, top y~300 in canvas units), at most as wide as the head
HEAD_CX, HEAD_TOP, HEAD_W = 335, 300, 300
HATS = re.findall(r'"(\w+)"', re.search(r"const KSLOT = \{ hat: \[([^\]]*)\]", src).group(1))
for it in [n for n in kisob if n in HATS]:
    x0, y0, x1, y1 = kisob[it]; w, h = x1 - x0, y1 - y0; k = min(1.0, HEAD_W / w); nw, nh = w * k, h * k
    kisob[it] = [round(HEAD_CX - nw / 2, 1), round(HEAD_TOP + 8 - nh, 1), round(HEAD_CX + nw / 2, 1), round(HEAD_TOP + 8, 1)]

# ---- lying (koala kept: the item is what differs from the lying picture)
lie = Image.open(os.path.join(IMG, "iso_lie.webp")).convert("RGBA"); LW, LH = lie.size
for sh in [s for s in views if s["view"] == "lie" and 12 <= int(s["file"].split("-")[1]) <= 25]:
    f = find(sh["file"])
    if not f: print("missing", sh["file"]); continue
    out = Image.open(f).convert("RGB"); qs, rows = quads(out.size, len(sh["cells"]))
    for c, q in zip(sh["cells"], qs):
        it = c["item"]
        if it in SKIP_LIE: continue
        qi = out.crop(q); a = np.asarray(qi).astype(int)
        dom = a[..., 1] - np.maximum(a[..., 0], a[..., 2])
        ng = ndimage.binary_opening((dom < 90) & (np.arange(a.shape[0])[:, None] >= 45), iterations=2)
        ys, xs = np.where(ng); x0, y0 = xs.min(), ys.min()
        qw = q[2] - q[0]; w = round(qw * 0.9316); h = round(w * LH / LW)        # the koala keeps its size in every cell (0.9316 of the quadrant width); the ear (top-left) is never covered by an item
        ref = np.array(lie.resize((w, h), Image.LANCZOS)).astype(int); r = np.zeros_like(a); ra = np.zeros(a.shape[:2], bool)
        hh, ww = min(h, a.shape[0] - y0), min(w, a.shape[1] - x0)
        r[y0:y0 + hh, x0:x0 + ww] = ref[:hh, :ww, :3]; ra[y0:y0 + hh, x0:x0 + ww] = ref[:hh, :ww, 3] > 128
        d = np.sqrt(((a - r) ** 2).sum(axis=2))
        item = (dom < 90) & ((~ra) | (d > 42)); item[:45, :] = False
        item = ndimage.binary_opening(item, iterations=2)
        # Gemini nudges the koala a little on some sheets: whatever lies outside the part of the body the item belongs to is a ghost of the koala, not the item
        slot = next((k for k, v in KSLOT.items() if it in v), None)
        if slot in LIE_SLOT:
            sx0, sy0, sx1, sy1 = LIE_SLOT[slot]; m = 70; kk = w / LW; reg = np.zeros(item.shape, bool)
            reg[max(0, int(y0 + (sy0 - m) * kk)):int(y0 + (sy1 + m) * kk), max(0, int(x0 + (sx0 - m) * kk)):int(x0 + (sx1 + m) * kk)] = True
            item &= reg
        lab, n = ndimage.label(item); sizes = ndimage.sum(item, lab, range(1, n + 1)); item = np.isin(lab, [i + 1 for i, s_ in enumerate(sizes) if s_ > 150])
        item = ndimage.binary_closing(item, iterations=5); item = ndimage.binary_fill_holes(item)
        A = Image.fromarray((item * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.6))
        # hi-res colours: take the output pixels, scaled up to the lying picture's pixel size
        PADX = 80; src_rgb = Image.fromarray(a.astype(np.uint8), "RGB"); K = LW / w
        box = (x0, y0, x0 + w + PADX, y0 + h + PADX)                      # items may stick out past the koala (shoes): keep a margin
        crop = src_rgb.crop(box).resize((round((w + PADX) * K), round((h + PADX) * K)), Image.LANCZOS).convert("RGBA")
        crop.putalpha(A.crop(box).resize(crop.size, Image.LANCZOS))
        bb = crop.getchannel("A").point(lambda v: 255 if v > 40 else 0).getbbox()
        if not bb: print("nothing (lie) for", it); continue
        crop.crop(bb).save(os.path.join(IMG, it + "_isol.webp"), "WEBP", quality=90, method=6)
        kisol[it] = [round(v, 1) for v in bb]

s = open(UI, encoding="utf-8").read()
def put(name, d, note):
    global s
    line = "  const %s = %s;   // %s\n" % (name, json.dumps(d, separators=(",", ":")), note)
    s = re.sub(r"  const %s = .*\n" % name, lambda m: line, s) if "const %s = " % name in s else s.replace("  const KBEHIND = ", line + "  const KBEHIND = ", 1)
put("KISOB", kisob, "item pictures for the iso BACK body (img/koala/<item>_isob.webp), [x0,y0,x1,y1] in KBOX units (scripts/cut-view-items.py)")
put("KISOL", kisol, "item pictures for the LYING picture (img/koala/<item>_isol.webp), [x0,y0,x1,y1] in iso_lie.webp pixels (scripts/cut-view-items.py)")
open(UI, "w", encoding="utf-8").write(s)
print(len(kisob), "back:", " ".join(sorted(kisob))); print(len(kisol), "lie:", " ".join(sorted(kisol)))
