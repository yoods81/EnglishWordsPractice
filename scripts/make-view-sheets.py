"""Contact sheets for the koala's BACK view (iso_stand_b) and LYING view (iso_lie): each cell = the body picture (left) +
the item's front picture as a reference (right panel). Gemini draws the item as worn on that body, on flat green.
Usage: python scripts/make-view-sheets.py -> "Koala Images/item-sheets/view-*.png" + views.json"""
import json, os, re
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), "..")
IMG = os.path.join(ROOT, "public", "img", "koala")
OUT = os.path.join(ROOT, "Koala Images", "item-sheets")
src = open(os.path.join(ROOT, "public", "js", "koala-house-ui.js"), encoding="utf-8").read()
KSLOT = {k: re.findall(r'"(\w+)"', v) for k, v in re.findall(r"(\w+): \[([^\]]*)\]", src.split("const KSLOT = ")[1].split("const KNAME")[0])}
NAME = dict(re.findall(r'(\w+): \["[^"]*", "([^"]+)"\]', src.split("const KNAME = ")[1].split("// Admin-added")[0]))
BASE = (64, 222, 617, 968)   # where the standing body picture sits in the canvas
SC, GAP, LAB, BG = 1.5, 36, 51, (232, 236, 244)
font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 33); small = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 24)

# (view, group, items, region of the canvas for the crop (back) / None (lie), cells per sheet)
BACK = [
    ("back", "head", KSLOT["hat"], (64, 20, 617, 560)),
    ("back", "torso", ["scarf"] + KSLOT["body"], (64, 520, 617, 940)),
    ("back", "legs-feet", KSLOT["legs"] + KSLOT["feet"], (64, 600, 617, 1040)),
    ("back", "back", KSLOT["back"], (64, 20, 617, 1040)),
]
LIE = [("lie", "all", KSLOT["hat"] + KSLOT["face"] + KSLOT["neck"] + KSLOT["body"] + KSLOT["legs"] + KSLOT["feet"], None)]

def body_crop(view, region):
    if view == "lie":
        b = Image.open(os.path.join(IMG, "iso_lie.webp")).convert("RGBA"); w = 800
        full = Image.new("RGBA", b.size, BG + (255,)); full.alpha_composite(b)
        return full.resize((w, round(w * b.height / b.width)), Image.LANCZOS)
    b = Image.open(os.path.join(IMG, "iso_stand_b.webp")).convert("RGBA").resize((round((BASE[2] - BASE[0]) * SC), round((BASE[3] - BASE[1]) * SC)), Image.LANCZOS)
    x0, y0, x1, y1 = region
    full = Image.new("RGBA", (round((617 - 64) * SC), round((1040 - 20) * SC)), BG + (255,)); full.alpha_composite(b, (0, round((BASE[1] - 20) * SC)))
    return full.crop(tuple(round(v * SC) for v in (0, y0 - 20, x1 - 64, y1 - 20)))

# rough places on the lying picture (1076x683 px) where each kind of item goes: [x0, y0, x1, y1]
LIE_SLOT = {"hat": (130, 40, 560, 330), "face": (220, 220, 520, 400), "neck": (440, 330, 700, 470), "body": (430, 250, 900, 560), "legs": (700, 380, 1050, 640), "feet": (820, 330, 1076, 680)}
KBOX = {}
for k, v in re.findall(r'"(\w+)": \[(\d+, \d+, \d+, \d+)\]', src.split("const K3")[0].split("const KBOX")[1]): KBOX[k] = [int(x) for x in v.split(",")]
KBOX.update({"hoodie": [122, 528, 562, 819], "backpack": [131, 545, 560, 832], "scarf": [185, 531, 497, 780], "glasses": [162, 362, 520, 500], "bushhat": [108, 188, 574, 441], "partyhat": [259, 100, 422, 290], "crown": [249, 190, 433, 295]})
BEHIND = ["herocape", "angelwings", "butterflywings", "surfboard"]

def cell(item, view, region):
    """body picture with the FRONT item laid roughly where it belongs (the wrong view, only to show what and where)"""
    ref = Image.open(os.path.join(IMG, item + ".webp")).convert("RGBA")
    if view == "lie":
        body = body_crop(view, region); k = body.width / 1076
        slot = next(sl for sl, names in KSLOT.items() if item in names); slot = {"body": "body"}.get(slot, slot)
        x0, y0, x1, y1 = [v * k for v in LIE_SLOT[slot]]; s = min((x1 - x0) / ref.width, (y1 - y0) / ref.height)
        r = ref.resize((round(ref.width * s), round(ref.height * s)), Image.LANCZOS); c = body.convert("RGBA")
        c.alpha_composite(r, (round((x0 + x1) / 2 - r.width / 2), round((y0 + y1) / 2 - r.height / 2)))
        return c.convert("RGB"), body.width, body.height
    body = body_crop(view, region); c = body.convert("RGBA"); b = KBOX[item]
    r = ref.resize((round((b[2] - b[0]) * SC), round((b[3] - b[1]) * SC)), Image.LANCZOS)
    if item in BEHIND: base = Image.new("RGBA", c.size, BG + (255,)); base.alpha_composite(r, (round((b[0] - region[0]) * SC), round((b[1] - region[1]) * SC))); base.alpha_composite(c); c = base
    else: c.alpha_composite(r, (round((b[0] - region[0]) * SC), round((b[1] - region[1]) * SC)))
    return c.convert("RGB"), body.width, body.height

REDO = os.environ.get("REDO")   # REDO=1: only the back-view items that came back wrong the first time
if REDO:
    BACK = [("back", "head", ["flowercrown", "beanie", "cowboyhat"], (64, 20, 617, 560)), ("back", "back", ["butterflywings", "surfboard"], (64, 20, 617, 1040))]; LIE = []
PREFIX = "viewredo" if REDO else "view"
meta, n = [], 0
for view, gname, items, region in BACK + LIE:
    sheets = -(-len(items) // 4); size = -(-len(items) // sheets)
    for s in range(sheets):
        chunk = items[s * size:(s + 1) * size]; cells = []
        ims = [cell(i, view, region) for i in chunk]; cw, ch = ims[0][0].size
        nrows = -(-len(chunk) // 2); W, H = GAP + 2 * (cw + GAP), GAP + nrows * (ch + LAB + GAP)
        sheet = Image.new("RGB", (W, H), BG); d = ImageDraw.Draw(sheet)
        for i, (item, (im, bw, bh)) in enumerate(zip(chunk, ims)):
            x, y = GAP + (i % 2) * (cw + GAP), GAP + (i // 2) * (ch + LAB + GAP)
            sheet.paste(im, (x, y + LAB)); d.text((x + 8, y + 6), "%d. %s" % (i + 1, NAME.get(item, item)), fill=(40, 50, 70), font=font)
            cells.append({"item": item, "x": x, "y": y + LAB, "w": cw, "h": ch, "bodyW": bw, "bodyH": bh})
        n += 1; fn = "%s-%02d-%s-%s.png" % (PREFIX, n, view, gname); sheet.save(os.path.join(OUT, fn))
        meta.append({"file": fn, "view": view, "group": gname, "region": region, "size": [W, H], "scale": SC, "cells": cells}); print(fn, W, H, chunk)
json.dump(meta, open(os.path.join(OUT, "viewredo.json" if REDO else "views.json"), "w"), indent=1)
