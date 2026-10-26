"""Take a clothing item off a picture of a koala seen from behind WEARING it (made in Canva / Gemini on a flat green background) and fit it to OUR back koala (back_base.webp).
The koala in the picture is not exactly ours (other head size, longer body), so nothing can be subtracted; instead the item is mapped row by row from that koala's silhouette
to ours: x is kept relative to the body's left/right edge of that row, y runs between landmarks (neck line, feet) of the two koalas.
In : <gemini-ref>/back1-<item>-out.png   Out: img/koala/back/<item>.webp + `const KBACK` entry (canvas units, like KBOX).
Usage: python scripts/cut-back-worn.py <item> [picture]"""
import json, os, re, sys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
REF = "I:/Koala Study Resources/gemini-ref"; OUT = os.path.join(ROOT, "public", "img", "koala", "back"); UI = os.path.join(ROOT, "public", "js", "koala-house-ui.js")
BX, BY = 64, 222; BX_C = 276   # BX_C: the centre line of our back koala in the picture's own pixels (back_base.webp is 553 wide)
item = sys.argv[1]; path = sys.argv[2] if len(sys.argv) > 2 and not sys.argv[2].startswith("--") else None
if not path:
    for ext in (".png", ".jpg", ".jpeg", ".webp", ".jfif"):
        p = os.path.join(REF, "back1-%s-out%s" % (item, ext))
        if os.path.exists(p): path = p; break
im = Image.open(path).convert("RGB"); a = np.array(im).astype(int); H, W = a.shape[:2]
green = (a[..., 1] - np.maximum(a[..., 0], a[..., 2])) > 100
body = ~green; body = ndimage.binary_opening(body, iterations=2); lab, n = ndimage.label(body); body = lab == (1 + int(np.argmax(ndimage.sum(body, lab, range(1, n + 1)))))
mx, mn = a.max(2), a.min(2); fur = (mx - mn < 38) & (mx > 95) & (mx < 205)   # grey fur; white / very light things (sneakers, lab coat) are items
is_item = body & ~fur
if "--sat" in sys.argv: is_item = body & ((mx - mn) > 45)   # a strongly coloured item (green jersey): only saturated pixels count, so bright highlights of the fur never join
is_item = ndimage.binary_opening(is_item, iterations=2); lab, n = ndimage.label(ndimage.binary_dilation(is_item, iterations=3)); sz = ndimage.sum(is_item, lab, range(1, n + 1))
is_item = np.isin(lab, [i + 1 for i, v in enumerate(sz) if v > 0.03 * sz.max()]) & is_item
is_item = ndimage.binary_closing(is_item, iterations=4)
lab, n = ndimage.label(ndimage.binary_dilation(is_item, iterations=12)); sz = ndimage.sum(is_item, lab, range(1, n + 1))
is_item = np.isin(lab, [i + 1 for i, v in enumerate(sz) if v >= 0.15 * sz.max()]) & is_item   # bright fur highlights are not parts of the item
if "--fill" in sys.argv: is_item = ndimage.binary_fill_holes(is_item) & body   # (off by default: the fur seen through a pinafore must stay fur)

_ym = [a.split("=")[1] for a in sys.argv if a.startswith("--ymin=")]   # --ymin=0.8: the item lies below this fraction of the koala's height (shoes): nothing above counts
if _ym:
    _ys = np.where(body.any(1))[0]; _cut = int(_ys[0] + float(_ym[0]) * (_ys[-1] - _ys[0])); is_item[:_cut] = False
if "--span" in sys.argv:   # a shirt / coat / jersey covers a solid stretch of every row it is on: fill between its left and right edge (light-grey shading of white cloth looks like fur and left blotches)
    ii = ndimage.binary_closing(is_item, iterations=10)
    for y in range(H):
        xs = np.where(ii[y])[0]
        if len(xs) > 8: is_item[y, xs.min():xs.max() + 1] = True
    is_item &= body
base = np.array(Image.open(os.path.join(ROOT, "public", "img", "koala", "back_base.webp")).convert("RGBA").getchannel("A")) > 128
def extents(m):
    e = {}
    for y in range(m.shape[0]):
        xs = np.where(m[y])[0]
        if len(xs): e[y] = (xs.min(), xs.max())
    return e
src_e, dst_e = extents(body), extents(base)
ys_s = sorted(src_e); ys_d = sorted(dst_e)
# landmarks: top of the ears, the neck line (narrowest row below the head), the feet
def neck_row(e, lo, hi):
    ys = [y for y in e if lo <= y <= hi]; return min(ys, key=lambda y: e[y][1] - e[y][0])
fur_body = body & fur
src_fe = extents(fur_body)
sy_top, sy_bot = ys_s[0], ys_s[-1]; dy_top, dy_bot = ys_d[0], ys_d[-1]
sy_neck = neck_row(src_fe, int(sy_top + 0.30 * (sy_bot - sy_top)), int(sy_top + 0.46 * (sy_bot - sy_top)))
dy_neck = neck_row(dst_e, int(dy_top + 0.36 * (dy_bot - dy_top)), int(dy_top + 0.50 * (dy_bot - dy_top)))
print("source neck", sy_neck, "feet", sy_bot, " ours neck", dy_neck + BY, "feet", dy_bot + BY)
def map_y(y):   # source row -> our row
    if y <= sy_neck: return dy_neck - (sy_neck - y) * (dy_neck - dy_top) / max(1, sy_neck - sy_top)
    return dy_neck + (y - sy_neck) * (dy_bot - dy_neck) / max(1, sy_bot - sy_neck)
if "--rigid" in sys.argv:   # the picture as it is: one uniform scale (neck line to feet), its koala's centre line on ours, no row-by-row fitting (a cape keeps the shape it was drawn with)
    sc = (dy_bot - dy_neck) / max(1, sy_bot - sy_neck); cx_s = (src_e[sy_neck][0] + src_e[sy_neck][1]) / 2; cx_d = BX_C
    ys_i, xs_i = np.where(is_item); X0, X1, Y0, Y1 = xs_i.min(), xs_i.max(), ys_i.min(), ys_i.max()
    crop = Image.fromarray(np.concatenate([np.clip(a, 0, 255).astype(np.uint8), (is_item * 255).astype(np.uint8)[..., None]], 2), "RGBA").crop((X0, Y0, X1 + 1, Y1 + 1))
    nw, nh = max(1, round(crop.width * sc)), max(1, round(crop.height * sc)); crop = crop.resize((nw, nh), Image.LANCZOS)
    A = crop.getchannel("A").point(lambda v: 255 if v > 90 else 0).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8)); crop.putalpha(A)
    left = cx_d + (X0 - cx_s) * sc; top = dy_neck + (Y0 - sy_neck) * sc
    os.makedirs(OUT, exist_ok=True); crop.save(os.path.join(OUT, item + ".webp"), "WEBP", quality=92, method=6)
    box = [round(BX + left, 1), round(BY + top, 1), round(BX + left + nw, 1), round(BY + top + nh, 1)]
    s = open(UI, encoding="utf-8").read(); K = json.loads(re.search(r"  const KBACK = (\{.*?\});", s).group(1)); K[item] = box
    line = "  const KBACK = %s;   // pictures of the worn items seen from straight behind (img/koala/back/<item>.webp): [x0,y0,x1,y1] in KBOX units (cut-back-worn.py / warp-back-items.py / apply-back-fit.py)" % json.dumps(K, separators=(",", ":"))
    s = re.sub(r"  const KBACK = \{.*?\};.*", lambda m: line, s, count=1); open(UI, "w", encoding="utf-8").write(s); print(item, "rigid", box, "scale %.3f" % sc); sys.exit(0)
ys_i, xs_i = np.where(is_item); y0, y1 = ys_i.min(), ys_i.max()
OH, OW = int(map_y(y1)) - int(map_y(y0)) + 2, base.shape[1]
out = np.zeros((OH, OW, 4), float); prem = np.concatenate([a, (is_item * 255)[..., None]], 2).astype(float); prem[..., :3] *= prem[..., 3:4] / 255.0
def ext_at(e, y):
    k = min(e, key=lambda t: abs(t - y)); return e[k]
oy0 = int(map_y(y0))
for oy in range(OH):
    dy = oy0 + oy
    if dy < 0 or dy >= base.shape[0]: continue
    # inverse of map_y
    sy = (dy_neck - dy) * -1 if False else None
    if dy <= dy_neck: sy = sy_neck - (dy_neck - dy) * (sy_neck - sy_top) / max(1, dy_neck - dy_top)
    else: sy = sy_neck + (dy - dy_neck) * (sy_bot - sy_neck) / max(1, dy_bot - dy_neck)
    sy = int(round(min(max(sy, 0), H - 1)))
    if sy not in src_e: continue
    sl, sr = src_e[sy]; dl, dr = ext_at(dst_e, dy)
    if sr - sl < 4 or dr - dl < 4: continue
    xs = np.arange(dl - 40, dr + 41); u = sl + (xs - dl) / (dr - dl) * (sr - sl); ok = (u >= 0) & (u <= W - 1) & (xs >= 0) & (xs < OW)
    for c in range(4): out[oy, xs[ok], c] = np.interp(u[ok], np.arange(W), prem[sy, :, c])
_top = [int(a.split("=")[1]) for a in sys.argv if a.startswith("--top=")]
if _top: out[: max(0, _top[0] - BY - oy0)] = 0   # --top=Y: nothing above canvas row Y (trousers start at the hips, below where the arms hang)
if "--noclip" not in sys.argv:   # nothing may stick out past our koala's own silhouette (a hem line used to run out beyond the arms)
    m = np.zeros((OH, OW), bool)
    for oy in range(OH):
        dy = oy0 + oy
        if 0 <= dy < base.shape[0]: m[oy] = base[dy]
    it = int(([a.split("=")[1] for a in sys.argv if a.startswith("--clip=")] or ["6"])[0]); free = int(([a.split("=")[1] for a in sys.argv if a.startswith("--free-below=")] or ["99999"])[0])   # --free-below=Y: a skirt may flare out past the hips below canvas row Y
    m_tight = ndimage.binary_dilation(m, iterations=it)
    if free < 99999:
        m_wide = ndimage.binary_dilation(m, iterations=140); rows = np.arange(OH)[:, None] + oy0 + BY >= free
        m_tight = np.where(rows, m_wide | m_tight, m_tight)
    out[~m_tight] = 0
# green spill on the rim of the item (the flat green background bleeds into soft edges): pull green down to the other channels near the outline, unless the item is itself green
if "--green" not in sys.argv:
    solid = out[..., 3] > 200; rim = ndimage.binary_dilation(~solid, iterations=5) & (out[..., 3] > 20)
    mx2 = np.maximum(out[..., 0], out[..., 2]); out[..., 1] = np.where(rim & (out[..., 1] > mx2 + 12), mx2 + 6, out[..., 1])
if "--close" in sys.argv:   # stray holes inside the item (where the picture had bright fur highlights): close them and give the new pixels the colour of the nearest cloth
    solid = out[..., 3] > 90; cl = ndimage.binary_closing(solid, iterations=7); cl = ndimage.binary_fill_holes(cl); cl &= ndimage.binary_dilation(solid, iterations=9)
    idx = ndimage.distance_transform_edt(~solid, return_distances=False, return_indices=True)
    for c in range(3): out[..., c] = np.where(solid, out[..., c], out[..., c][idx[0], idx[1]])
    out[..., 3] = np.where(cl & ~solid, 255, out[..., 3])
al = out[..., 3:4]; rgb = np.where(al > 1, out[..., :3] / np.maximum(al, 1) * 255, 0)
res = Image.fromarray(np.concatenate([np.clip(rgb, 0, 255), al], 2).astype(np.uint8), "RGBA")
A = res.getchannel("A").point(lambda v: 255 if v > 90 else 0).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8)); res.putalpha(A)
bb = A.point(lambda v: 255 if v > 40 else 0).getbbox(); res = res.crop(bb)
os.makedirs(OUT, exist_ok=True); res.save(os.path.join(OUT, item + ".webp"), "WEBP", quality=92, method=6)
box = [round(BX + bb[0], 1), round(BY + oy0 + bb[1], 1), round(BX + bb[2], 1), round(BY + oy0 + bb[3], 1)]
s = open(UI, encoding="utf-8").read(); K = json.loads(re.search(r"  const KBACK = (\{.*?\});", s).group(1)); K[item] = box
line = "  const KBACK = %s;   // pictures of the worn items seen from straight behind (img/koala/back/<item>.webp): [x0,y0,x1,y1] in KBOX units (cut-back-worn.py maps a worn-koala picture onto our back koala; the older ones: warp-back-items.py / apply-back-fit.py)" % json.dumps(K, separators=(",", ":"))
s = re.sub(r"  const KBACK = \{.*?\};.*", lambda m: line, s, count=1); open(UI, "w", encoding="utf-8").write(s); print(item, box, res.size)
