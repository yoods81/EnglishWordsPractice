"""Lying pictures for the items Gemini could not draw on the lying koala (thin / low-contrast ones).
The face / neck items that DID come out well tell how the iso (3/4 front) picture maps onto the lying picture
(scale, rotation, shift, measured on the alpha masks); the same map is applied to the iso pictures of the missing items.
Writes img/koala/<item>_isol.webp and adds the boxes to `const KISOL` in public/js/koala-house-ui.js.
Usage: python scripts/place-lie-items.py"""
import json, math, os, re
import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
IMG = os.path.join(ROOT, "public", "img", "koala")
UI = os.path.join(ROOT, "public", "js", "koala-house-ui.js")
src = open(UI, encoding="utf-8").read()
KISO = json.loads(re.search(r"const KISO = (\{.*?\});", src).group(1))
KISOL = json.loads(re.search(r"const KISOL = (\{.*?\});", src).group(1))

GROUPS = {   # items whose iso -> lying map is measured : items placed with that map
    "face": (["sunglasses", "starglasses", "heartglasses"], ["glasses", "freckles", "monocle"]),
    "neck": (["goldchain"], ["pearlnecklace", "scarf", "heartpendant", "diamondpendant"]),
}

def mask_stats(path, box):   # centroid (x, y), spread along the long axis and principal angle of the alpha mask, in the box's own coordinate units
    a = np.array(Image.open(path).convert("RGBA").getchannel("A")).astype(float) / 255
    h, w = a.shape; ys, xs = np.mgrid[0:h, 0:w]
    xs = box[0] + (xs + .5) / w * (box[2] - box[0]); ys = box[1] + (ys + .5) / h * (box[3] - box[1])
    m = a.sum(); cx, cy = (a * xs).sum() / m, (a * ys).sum() / m
    area = m * (box[2] - box[0]) / w * (box[3] - box[1]) / h
    cxx, cyy, cxy = (a * (xs - cx) ** 2).sum() / m, (a * (ys - cy) ** 2).sum() / m, (a * (xs - cx) * (ys - cy)).sum() / m
    major = math.sqrt((cxx + cyy) / 2 + math.sqrt(((cxx - cyy) / 2) ** 2 + cxy ** 2))   # spread along the long axis (thin items have almost no area, so the area is no scale)
    return (cx, cy), major, 0.5 * math.atan2(2 * cxy, cxx - cyy)

def solve(refs):
    ss, ds, pairs = [], [], []
    for n in refs:
        (c1, a1, t1), (c2, a2, t2) = mask_stats(f"{IMG}/{n}_iso.webp", KISO[n]), mask_stats(f"{IMG}/{n}_isol.webp", KISOL[n])
        d = (t2 - t1 + math.pi / 2) % math.pi - math.pi / 2          # principal axes are only defined up to 180 degrees
        ss.append(a2 / a1); ds.append(d); pairs.append((c1, c2))
    s, d = float(np.mean(ss)), float(np.mean(ds)); R = np.array([[math.cos(d), -math.sin(d)], [math.sin(d), math.cos(d)]])
    t = np.mean([np.array(c2) - s * R @ np.array(c1) for c1, c2 in pairs], axis=0)
    print("  scale %.3f  rotation %.1f deg  from %s (per item: %s)" % (s, math.degrees(d), refs, [round(math.degrees(x)) for x in ds]))
    return s, d, R, t

# Fine tuning on iso_lie.webp (1076x683): the measured map comes from koalas Gemini drew a little differently, so these are put by eye on the picture.
# eyes: near (297,330), far (418,200), nose (388,278), mouth (440,330). anchor = where the item's own anchor point (box centre, or the lens of the monocle) goes; mult = size on top of the measured scale; off = shift after the map
TUNE = {"glasses": dict(anchor=(372, 270), mult=1.0), "monocle": dict(anchor=(384, 179), mult=0.95, lens=True), "freckles": dict(anchor=(402, 312), mult=1.3, dark=True),
        "pearlnecklace": dict(mult=0.78, off=(-30, -15)), "scarf": dict(mult=0.62, off=(-30, -10)), "heartpendant": dict(mult=0.9, off=(-20, -10)), "diamondpendant": dict(mult=0.9, off=(-20, -10))}

for gname, (refs, targets) in GROUPS.items():
    s, d, R, t = solve(refs)
    for n in targets:
        tu = TUNE.get(n, {}); b = KISO[n]; im = Image.open(f"{IMG}/{n}_iso.webp").convert("RGBA")
        ku = (b[2] - b[0]) / im.width                                       # box units per picture pixel
        k = s * tu.get("mult", 1.0) * ku                                    # lying pixels per iso picture pixel
        im2 = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
        if tu.get("dark"):                                                    # tiny dots vanish on grey fur: darker and fuller
            q = np.array(im2).astype(float); q[..., :3] *= 0.6; q[..., 3] = np.clip(q[..., 3] * 1.8, 0, 255); im2 = Image.fromarray(q.astype(np.uint8), "RGBA")
        im2 = im2.rotate(-math.degrees(d), resample=Image.BICUBIC, expand=True)   # PIL rotates counter-clockwise; the canvas y axis points down
        cen = np.array([(b[0] + b[2]) / 2, (b[1] + b[3]) / 2])               # the picture's anchor point in box units: its centre ...
        if tu.get("lens"):                                                    # ... or the lens (the round top part) of the monocle
            al = np.array(im.getchannel("A")) > 40; top = al[: im.height // 2]; yy, xx = np.nonzero(top)
            cen = np.array([b[0] + xx.mean() * ku, b[1] + yy.mean() * ku])
        ctr = s * tu.get("mult", 1.0) * R @ (np.array([(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]) - cen) + (np.array(tu["anchor"]) if "anchor" in tu else s * R @ cen + t + np.array(tu.get("off", (0, 0))))
        x0, y0 = ctr[0] - im2.width / 2, ctr[1] - im2.height / 2
        im2.save(f"{IMG}/{n}_isol.webp", "WEBP", quality=90, method=6)
        KISOL[n] = [round(float(x0), 1), round(float(y0), 1), round(float(x0 + im2.width), 1), round(float(y0 + im2.height), 1)]
        print("  placed", n, KISOL[n])

line = "  const KISOL = %s;" % json.dumps(KISOL, separators=(",", ":"))
src = re.sub(r"  const KISOL = \{.*?\};", lambda m: line, src, count=1)
open(UI, "w", encoding="utf-8").write(src)
