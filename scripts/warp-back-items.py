"""Fit the straight-back item pictures to the back koala's own silhouette, row by row.
A picture stretched into one rectangle never matches a round body (the hips, the waist, the legs, the arms are all different widths), so the
sides of the koala showed. Here every row of an item is stretched sideways so that its left / right edge lies on the koala's left / right edge in
that row (plus a margin): clothes cover the body exactly, trousers follow the hips and both legs, shoes follow the feet.
Sources: "Koala Images/back-src/<item>.webp" (the cut pictures, never changed); results: public/img/koala/back/<item>.webp + `const KBACK`.
Canvas units = KBOX units (back_base.webp sits at [64, 222]).   Usage: python scripts/warp-back-items.py"""
import json, os, re
import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
SRC = os.path.join(ROOT, "Koala Images", "back-src"); OUT = os.path.join(ROOT, "public", "img", "koala", "back")
UI = os.path.join(ROOT, "public", "js", "koala-house-ui.js")
BX, BY = 64, 222; CX = 340
body = np.array(Image.open(os.path.join(ROOT, "public", "img", "koala", "back_base.webp")).convert("RGBA").getchannel("A")) > 128

def body_extent(y, torso=False):
    if torso: return (172, 508)   # the back only, arms left out (cape)
    r = y - BY
    if r < 0 or r >= body.shape[0]: return None
    xs = np.where(body[r])[0]
    if len(xs) == 0: return None
    return xs.min() + BX, xs.max() + BX

# (top, bottom, margin) rows on the koala; "head": rows above `until` follow the head (hood) at a fixed width
FIT = {
    "tshirt": (566, 842, 10), "stripeshirt": (566, 818, 10), "jersey": (566, 852, 10), "pinkdress": (566, 884, 12), "labcoat": (566, 905, 14), "overalls": (566, 928, 8),
    "hoodie": (372, 852, 10, {"until": 575, "head": 330}),
    "jeans": (722, 928, 8), "khakishorts": (722, 892, 8), "cargopants": (722, 928, 8), "sweatpants": (722, 928, 8),
    "herocape": (590, 884, 0),
    "sneakers": (925, 972, 6), "rainboots": (885, 972, 6), "cowboyboots": (890, 972, 6), "balletshoes": (928, 972, 6), "bunnyslippers": (922, 972, 6), "soccercleats": (925, 972, 6), "sandals": (930, 972, 6), "rollerskates": (905, 976, 6),
}

SHOES = {"sneakers", "rainboots", "cowboyboots", "balletshoes", "bunnyslippers", "soccercleats", "sandals", "rollerskates"}
SLEEVE = {"tshirt": 206, "jersey": 206, "pinkdress": 196, "stripeshirt": 224, "hoodie": 230, "labcoat": 244, "overalls": 206}
TOPS = {"tshirt", "stripeshirt", "jersey", "pinkdress", "labcoat", "overalls", "hoodie"}

n_cur = None

def warp(im, top, bot, margin, head=None, sleeves=False, clip=0):
    a = np.array(im.convert("RGBA")).astype(float); H, W = a.shape[:2]
    prem = a.copy(); prem[..., :3] *= prem[..., 3:4] / 255.0
    al = a[..., 3] > 40
    ext = []
    for r in range(H):
        rr = al[max(0, r - 1):r + 2].any(0); xs = np.where(rr)[0]; ext.append((xs.min(), xs.max()) if len(xs) else None)
    fx = 1.0
    if head:
        ys = [r for r in range(H) if ext[r] and top + (bot - top) * r / (H - 1) < head["until"]]
        if ys: fx = head["head"] / max(1, max(ext[r][1] - ext[r][0] for r in ys))
    # tops: the item's sleeve ends where its width drops; that row must land where the koala's arms end (y~715), the rest (the body) below it
    ARM_END = 716; rs = None
    if sleeves:
        wid = [(e[1] - e[0]) if e else 0 for e in ext]; mx = max(wid); rw = int(np.argmax(wid))
        for r in range(rw, H):
            if wid[r] < 0.78 * mx: rs = r; break
        if rs is not None and not (0.12 * H < rs < 0.7 * H): rs = None
    def src_row(y):
        if rs is None: return int(round((y - top) / (bot - top) * (H - 1)))
        if y <= ARM_END: return int(round((y - top) / (ARM_END - top) * rs))
        return int(round(rs + (y - ARM_END) / (bot - ARM_END) * (H - 1 - rs)))
    ys_t = list(range(int(top), int(bot) + 1)); out = np.zeros((len(ys_t), 700, 4), float)
    for i, y in enumerate(ys_t):
        r = min(H - 1, max(0, src_row(y))); e = ext[r]
        if e is None: continue
        if head and y < head["until"]:
            half = (e[1] - e[0]) / 2 * fx; tl, tr = CX - half, CX + half
        else:
            be = body_extent(y, torso=(n_cur == "herocape"))
            if be is None: continue
            tl, tr = be[0] - margin, be[1] + margin
            lim = SLEEVE.get(n_cur)
            if lim: tl, tr = max(tl, CX - lim), min(tr, CX + lim)   # a sleeve reaches the upper arm, not the finger tips
        xt = np.arange(int(np.floor(tl)), int(np.ceil(tr)) + 1); u = e[0] + (xt - tl) / max(1e-6, (tr - tl)) * (e[1] - e[0])
        ok = (xt >= 0) & (xt < 700) & (u >= e[0] - 0.5) & (u <= e[1] + 0.5)
        for c in range(4): out[i, xt[ok], c] = np.interp(u[ok], np.arange(W), prem[r, :, c])
    if clip:   # nothing may stick out past the koala's own silhouette (+ a thin margin): no shelves over the gap between arm and body, no skirt-like flaps between the legs
        from scipy import ndimage
        m = np.zeros((len(ys_t), 700), bool)
        for i, y in enumerate(ys_t):
            r = y - BY
            if 0 <= r < body.shape[0]: m[i, BX:BX + body.shape[1]] = body[r]
        m = ndimage.binary_dilation(m, iterations=clip)
        out[..., :][~m] = 0
    al_ = out[..., 3:4]; rgb = np.where(al_ > 1, out[..., :3] / np.maximum(al_, 1) * 255.0, 0)
    res = np.concatenate([np.clip(rgb, 0, 255), al_], 2).astype(np.uint8)
    img = Image.fromarray(res, "RGBA"); bb = img.getchannel("A").point(lambda v: 255 if v > 30 else 0).getbbox()
    return img.crop(bb), [bb[0], int(top) + bb[1], bb[2], int(top) + bb[3]]

s = open(UI, encoding="utf-8").read(); K = json.loads(re.search(r"  const KBACK = (\{.*?\});", s).group(1))
for n, cfg in FIT.items():
    f = os.path.join(SRC, n + ".webp")
    if not os.path.exists(f): continue
    n_cur = n; top, bot, margin = cfg[:3]
    if n in SHOES:   # shoes keep their own proportions (a pair as wide as the feet), so they are not squashed
        asp = Image.open(f).height / Image.open(f).width; top = bot - min(100, 272 * asp)
    head = cfg[3] if len(cfg) > 3 else None
    img, box = warp(Image.open(f), int(top), bot, margin, head, sleeves=n in TOPS, clip=(9 if (n in TOPS and n != "pinkdress") or n in ("jeans", "khakishorts", "cargopants", "sweatpants") else 0))
    img.save(os.path.join(OUT, n + ".webp"), "WEBP", quality=92, method=6); K[n] = [round(float(v), 1) for v in box]
line = "  const KBACK = %s;   // pictures of the worn items seen from straight behind (img/koala/back/<item>.webp): [x0,y0,x1,y1] in KBOX units (scripts/warp-back-items.py fits clothes and shoes to the back koala's silhouette, scripts/apply-back-fit.py places the rest)" % json.dumps(K, separators=(",", ":"))
s = re.sub(r"  const KBACK = \{.*?\};.*", lambda m: line, s, count=1); open(UI, "w", encoding="utf-8").write(s); print(len(K), "items")
