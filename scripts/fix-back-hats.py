"""Back-view hats whose picture still holds the koala head (Gemini kept the koala in those cells): bushhat, bluecap, crown, partyhat.
cut-view-items.py scaled the whole head+hat picture like a lone hat, so the hat came out tiny and floated over the head.
Here the hat is cut out of that picture (everything that is not grey fur), the picture is registered onto iso_stand_b.webp
by its fur (scale + shift), and the hat gets the box it really covers in KBOX units. Run it after cut-view-items.py.
Usage: python scripts/fix-back-hats.py"""
import json, os, re
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage
from scipy.signal import fftconvolve

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
IMG = os.path.join(ROOT, "public", "img", "koala")
UI = os.path.join(ROOT, "public", "js", "koala-house-ui.js")
HATS = ["bushhat", "bluecap", "crown", "partyhat"]
HAT_AT = {"bushhat": (340, 345), "bluecap": (340, 335), "crown": (345, 322), "partyhat": (345, 345)}   # centre x, bottom y on the back head (KBOX units; the head dome top is about y=300)
BASE = (64, 222)                       # iso_stand_b.webp covers BASE (553x746 units, 2 px per unit)

ref = np.array(Image.open(os.path.join(IMG, "iso_stand_b.webp")).convert("RGBA").getchannel("A")) > 128
ref = np.array(Image.fromarray((ref * 255).astype(np.uint8)).resize((553, 746), Image.BILINEAR)) > 128
ref_head = ref.copy(); ref_head[330:, :] = False           # the head and ears only (rows are units from BASE)

def fur_mask(arr):
    rgb = arr[..., :3].astype(int); mx, mn = rgb.max(2), rgb.min(2)
    return (arr[..., 3] > 128) & (mx - mn < 26) & (mx > 105) & (mx < 235)

def fit(F):                            # best (scale, dx, dy) putting the fur mask F (px) inside the head mask (units)
    best = None
    for s in np.arange(0.40, 1.30, 0.02):
        w, h = max(1, round(F.shape[1] * s)), max(1, round(F.shape[0] * s))
        if w >= ref.shape[1] or h >= ref.shape[0]: continue
        f = np.array(Image.fromarray((F * 255).astype(np.uint8)).resize((w, h), Image.BILINEAR)) > 128
        inter = fftconvolve(ref_head.astype(float), f[::-1, ::-1].astype(float), mode="valid")   # |F ∩ R| for every shift
        score = 2 * inter - f.sum()                                                              # inside minus outside
        iy, ix = np.unravel_index(np.argmax(score), score.shape)
        if best is None or score[iy, ix] > best[0]: best = (float(score[iy, ix]), float(s), int(ix), int(iy))
    return best

kb = json.loads(re.search(r"const KISOB = (\{.*?\});", open(UI, encoding="utf-8").read()).group(1))
for n in HATS:
    path = os.path.join(IMG, f"{n}_isob.webp"); im = Image.open(path).convert("RGBA"); arr = np.array(im)
    fur = fur_mask(arr); fur = ndimage.binary_opening(fur, iterations=2)
    solid = arr[..., 3] > 128
    cand = solid & ~ndimage.binary_dilation(fur, iterations=2)             # everything that is not grey fur
    cand = ndimage.binary_opening(cand, iterations=1)
    lab, k = ndimage.label(ndimage.binary_closing(cand, iterations=3))
    sizes = ndimage.sum(cand, lab, range(1, k + 1)); main = lab == (1 + int(np.argmax(sizes)))   # the hat worn on the head (the stray small copy and the cheek stay behind)
    main = ndimage.binary_fill_holes(main)
    # the hat sits on the fur, so grey fur at its rim must not make the fit larger: fit with the fur only
    score, s, dx, dy = fit(fur)
    ys, xs = np.where(main); bx0, by0, bx1, by1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    alpha = Image.fromarray((main * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    out = im.copy(); out.putalpha(alpha); out = out.crop((bx0, by0, bx1, by1))
    out.save(path, "WEBP", quality=92, method=6)
    # size from the fit (the hat is as wide as it is on the koala); the place is the one every other back hat has: on the head dome, a little to the left
    w, h = (bx1 - bx0) * s, (by1 - by0) * s; cx, bottom = HAT_AT[n]
    kb[n] = [round(float(v), 1) for v in (cx - w / 2, bottom - h, cx + w / 2, bottom)]
    print(n, "scale %.2f shift (%d,%d)" % (s, dx, dy), "hat box", kb[n], "fur px", int(fur.sum()))

s_ = open(UI, encoding="utf-8").read()
line = "  const KISOB = %s;" % json.dumps(kb, separators=(",", ":"))
s_ = re.sub(r"  const KISOB = \{.*?\};", lambda m: line, s_, count=1)
open(UI, "w", encoding="utf-8").write(s_)
