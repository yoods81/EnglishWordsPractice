"""Put the clothes / shoes / scarf on the 3/4 koala by the BODY, not by the old front koala.
cut-iso-items.py / cut-view-items.py sized and centred every picture on the box of the OLD front koala (KBOX). The new 3/4 body has a bigger
head and different proportions, so shirts started in the chin, trousers hung under the shirt and shoes floated.
Here each picture (front: <item>_iso.webp on iso_stand_f.webp, back: <item>_isob.webp on iso_stand_b.webp) is registered onto the part of the
body it covers (torso+arms for tops, legs for trousers / skirts, feet for shoes, the strip under the chin for the scarf):
scale and shift are searched so that the picture's silhouette and the body part overlap best (intersection over union).
Writes `const KISO` / `const KISOB` in public/js/koala-house-ui.js. Hats, glasses, necklaces ... keep the places they have.
Usage: python scripts/align-iso-items.py [front|back|both]"""
import json, os, re, sys
import numpy as np
from PIL import Image, ImageFilter
from scipy.signal import fftconvolve

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
IMG = os.path.join(ROOT, "public", "img", "koala")
UI = os.path.join(ROOT, "public", "js", "koala-house-ui.js")
src = open(UI, encoding="utf-8").read()
KSLOT = {k: re.findall(r'"(\w+)"', v) for k, v in re.findall(r"(\w+): \[([^\]]*)\]", re.search(r"const KSLOT = \{(.*?)\};", src, re.S).group(1))}
BASE = (64, 222)
GW, GH = 700, 1100           # the canvas in units (1 unit = 1 grid px)

# rows (canvas units) of the body part each kind of item covers
PART = {"body": (598, 840), "legs": (805, 945), "feet": (930, 990), "scarf": (598, 655)}
SKIP = {"overalls": "body+legs"}   # one piece: registered as a body part from shoulders to the ankles
PART_OF = {n: "body" for n in KSLOT["body"]}; PART_OF.update({n: "legs" for n in KSLOT["legs"]}); PART_OF.update({n: "feet" for n in KSLOT["feet"]}); PART_OF["scarf"] = "scarf"
PART_OF["overalls"] = "all"; PART["all"] = (598, 945)

def canvas_mask(path, box=None, thr=100):
    im = Image.open(path).convert("RGBA"); a = im.getchannel("A")
    if box is None: box = (BASE[0], BASE[1], BASE[0] + 553, BASE[1] + 746)
    w, h = max(1, round(box[2] - box[0])), max(1, round(box[3] - box[1]))
    a = a.resize((w, h), Image.BILINEAR); m = np.zeros((GH, GW), bool)
    x0, y0 = round(box[0]), round(box[1])
    sx0, sy0 = max(0, -x0), max(0, -y0); x1, y1 = min(GW, x0 + w), min(GH, y0 + h)
    m[y0 + sy0:y1, x0 + sx0:x1] = (np.array(a)[sy0:sy0 + (y1 - y0 - sy0), sx0:sx0 + (x1 - x0 - sx0)] > thr)
    return m

def register(body, item_path, box, part):
    r0, r1 = PART[part]; R = np.zeros_like(body); R[r0:r1] = body[r0:r1]
    if part == "feet": R = np.array(Image.fromarray((R * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(15))) > 128    # shoes are a little bigger than the feet
    ys, xs = np.where(R); rx0, ry0, rx1, ry1 = xs.min() - 90, ys.min() - 110, xs.max() + 91, ys.max() + 111
    Rc = R[max(0, ry0):ry1, max(0, rx0):rx1].astype(float); ox, oy = max(0, rx0), max(0, ry0)
    im = Image.open(item_path).convert("RGBA"); A = im.getchannel("A")
    bw, bh = box[2] - box[0], box[3] - box[1]; cx, cy = (box[0] + box[2]) / 2, (box[1] + box[3]) / 2
    best = None
    for f in np.arange(0.55, 1.65, 0.025):
        w, h = max(2, round(bw * f)), max(2, round(bh * f))
        m = (np.array(A.resize((w, h), Image.BILINEAR)) > 100).astype(float)
        if m.shape[0] >= Rc.shape[0] or m.shape[1] >= Rc.shape[1]: continue
        inter = fftconvolve(Rc, m[::-1, ::-1], mode="valid")                      # inter[y, x]: overlap when the picture's top-left sits at (x, y)
        iou = inter / (m.sum() + Rc.sum() - inter)
        # stay near where the picture was (a shirt must not slide to the legs)
        gy, gx = np.mgrid[0:iou.shape[0], 0:iou.shape[1]]
        tlx, tly = gx + ox, gy + oy; ccx, ccy = tlx + w / 2, tly + h / 2
        iou = np.where((np.abs(ccx - cx) < 90) & (np.abs(ccy - cy) < 130), iou, 0)
        iy, ix = np.unravel_index(np.argmax(iou), iou.shape)
        if best is None or iou[iy, ix] > best[0]: best = (float(iou[iy, ix]), f, int(ix + ox), int(iy + oy), w, h)
    s, f, x, y, w, h = best
    return [x, y, x + w, y + h], s, f

def anatomy(body):
    """feet: span and floor line; neck: where the head ends (centre x of the body just under the chin)"""
    ys, xs = np.where(body[895:1000]); fx0, fx1, fy1 = xs.min(), xs.max(), 895 + ys.max()
    r = body[588]; nx = np.where(r)[0]
    return {"feet": (fx0, fx1, fy1), "neck": ((nx.min() + nx.max()) / 2, 588)}

def place_feet(box, a):   # a pair of shoes: as wide as the feet (a little more), standing on the floor line
    fx0, fx1, fy1 = a["feet"]; w0, h0 = box[2] - box[0], box[3] - box[1]; w = (fx1 - fx0) * 0.66; h = h0 * w / w0; cx = (fx0 + fx1) / 2
    return [cx - w / 2, fy1 + 10 - h, cx + w / 2, fy1 + 10]

def place_scarf(box, a):  # wrapped round the neck right under the chin
    nx, ny = a["neck"]; w0, h0 = box[2] - box[0], box[3] - box[1]; w = 200; h = h0 * w / w0
    return [nx - w / 2, ny + 8, nx + w / 2, ny + 8 + h]

def run(view):
    key, suf, bodyf = ("KISO", "_iso", "iso_stand_f.webp") if view == "front" else ("KISOB", "_isob", "iso_stand_b.webp")
    boxes = json.loads(re.search(r"const %s = (\{.*?\});" % key, src).group(1))
    body = canvas_mask(os.path.join(IMG, bodyf)); anat = anatomy(body)
    for n, part in PART_OF.items():
        if n not in boxes: continue
        if part in ("feet", "scarf"):
            new = (place_feet if part == "feet" else place_scarf)(boxes[n], anat)
            print("%-6s %-12s %-6s placed %s -> %s" % (view, n, part, [round(v) for v in boxes[n]], [round(v) for v in new])); boxes[n] = [round(float(v), 1) for v in new]; continue
        new, s, f = register(body, os.path.join(IMG, n + suf + ".webp"), boxes[n], part)
        print("%-6s %-12s %-6s iou %.2f scale x%.2f  %s -> %s" % (view, n, part, s, f, [round(v) for v in boxes[n]], new))
        boxes[n] = [round(float(v), 1) for v in new]
    return key, boxes

which = sys.argv[1] if len(sys.argv) > 1 else "both"
out = src
for view in (["front", "back"] if which == "both" else [which]):
    key, boxes = run(view)
    line = "  const %s = %s;" % (key, json.dumps(boxes, separators=(",", ":")))
    out = re.sub(r"  const %s = \{.*?\};" % key, lambda m: line, out, count=1)
open(UI, "w", encoding="utf-8").write(out)
