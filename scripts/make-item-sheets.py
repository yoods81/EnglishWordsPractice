"""Contact sheets of the koala's worn items drawn over the 3/4 (iso) body, for redrawing the items at the body's angle.
Usage: python scripts/make-item-sheets.py   -> "Koala Images/item-sheets/sheet-*.png" + sheets.json (cell layout, used to cut the results apart)"""
import json, os, re
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), "..")
IMG = os.path.join(ROOT, "public", "img", "koala")
OUT = os.path.join(ROOT, "Koala Images", "item-sheets")
src = open(os.path.join(ROOT, "public", "js", "koala-house-ui.js"), encoding="utf-8").read()

def grab(name):
    m = re.search(r"const %s = (\{.*?\});" % name, src, re.S)
    return json.loads(m.group(1)) if m else None
KBOX = {"base": [64, 222, 617, 968], "hoodie": [122, 528, 562, 819], "backpack": [131, 545, 560, 832], "scarf": [185, 531, 497, 780], "glasses": [162, 362, 520, 500], "bushhat": [108, 188, 574, 441], "partyhat": [259, 100, 422, 290], "crown": [249, 190, 433, 295]}
for k, v in re.findall(r'"(\w+)": \[(\d+, \d+, \d+, \d+)\]', src.split("const K3")[0].split("const KBOX")[1]): KBOX[k] = [int(x) for x in v.split(",")]
KSLOT = {k: re.findall(r'"(\w+)"', v) for k, v in re.findall(r"(\w+): \[([^\]]*)\]", src.split("const KSLOT = ")[1].split("const KNAME")[0])}
NAME = dict(re.findall(r'(\w+): \["[^"]*", "([^"]+)"\]', src.split("const KNAME = ")[1].split("// Admin-added")[0]))
BEHIND = ["herocape", "angelwings", "butterflywings", "surfboard"]

CANVAS = (64, 20)   # top-left of the standing picture's viewBox
# (sheet group, items, crop region in canvas coords, columns, rows per sheet)
GROUPS = [
    ("head", KSLOT["hat"] + KSLOT["face"], (64, 20, 617, 560), 2, 2),
    ("torso", KSLOT["neck"] + KSLOT["body"], (64, 520, 617, 940), 2, 2),
    ("legs-feet", KSLOT["legs"] + KSLOT["feet"], (64, 600, 617, 1040), 2, 2),
    ("back", KSLOT["back"], (64, 20, 617, 1040), 2, 2),
]
SC = 1.5   # sheets are drawn 1.5x so each cell keeps enough pixels for the redraw
BG, GAP, LAB = (232, 236, 244), int(24 * SC), int(34 * SC)
font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", int(22 * SC))

def body():
    b = Image.open(os.path.join(IMG, "iso_stand_f.webp")).convert("RGBA")
    return b.resize((KBOX["base"][2] - KBOX["base"][0], KBOX["base"][3] - KBOX["base"][1]), Image.LANCZOS)
BODY = body()

def cell(item, region):
    x0, y0, x1, y1 = region
    full = Image.new("RGBA", (round((617 - 64) * SC), round((1040 - 20) * SC)), BG + (255,))
    def put(im, box):
        im = im.resize((round((box[2] - box[0]) * SC), round((box[3] - box[1]) * SC)), Image.LANCZOS)
        full.alpha_composite(im, (round((box[0] - CANVAS[0]) * SC), round((box[1] - CANVAS[1]) * SC)))
    it = Image.open(os.path.join(IMG, item + ".webp")).convert("RGBA")
    if item in BEHIND: put(it, KBOX[item])
    put(BODY, KBOX["base"])
    if item not in BEHIND: put(it, KBOX[item])
    return full.crop(tuple(round(v * SC) for v in (x0 - CANVAS[0], y0 - CANVAS[1], x1 - CANVAS[0], y1 - CANVAS[1])))

meta, n = [], 0
for gname, items, region, cols, rows in GROUPS:
    per = cols * rows
    sheets = -(-len(items) // per)
    size = -(-len(items) // sheets)           # balanced: 22 -> 8,7,7
    for s in range(sheets):
        chunk = items[s * size:(s + 1) * size]
        cw, ch = round((region[2] - region[0]) * SC), round((region[3] - region[1]) * SC)
        nrows = -(-len(chunk) // cols)
        W, H = GAP + cols * (cw + GAP), GAP + nrows * (ch + LAB + GAP)
        sheet = Image.new("RGB", (W, H), BG); d = ImageDraw.Draw(sheet)
        cells = []
        for i, item in enumerate(chunk):
            cx, cy = GAP + (i % cols) * (cw + GAP), GAP + (i // cols) * (ch + LAB + GAP)
            sheet.paste(cell(item, region).convert("RGB"), (cx, cy + LAB))
            d.text((cx + 8, cy + 6), "%d. %s" % (i + 1, NAME.get(item, item)), fill=(40, 50, 70), font=font)
            cells.append({"item": item, "x": cx, "y": cy + LAB, "w": cw, "h": ch})
        fn = "sheet-%02d-%s.png" % (n + 1, gname); n += 1
        sheet.save(os.path.join(OUT, fn))
        meta.append({"file": fn, "group": gname, "region": region, "size": [W, H], "scale": SC, "cells": cells})
json.dump(meta, open(os.path.join(OUT, "sheets.json"), "w"), indent=1)
for m in meta: print(m["file"], m["size"], [c["item"] for c in m["cells"]])
