"""Contact sheets for the STRAIGHT back view of the dress-up koala (img/koala/back_base.webp, 553x746, same canvas as base.webp).
Each cell = the back koala with the item's old FRONT picture laid roughly where it goes (only to show what and where).
Gemini redraws the item as worn from behind, keeps the koala identical, background flat green (the same "koala kept" format that worked for the lying sheets);
cut-back-items.py then takes the item out by comparing with back_base.webp.
Usage: python scripts/make-back-sheets.py -> "Koala Images/item-sheets/backview-NN.png" + backviews.json"""
import json, os, re
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
IMG = os.path.join(ROOT, "public", "img", "koala")
OUT = os.path.join(ROOT, "Koala Images", "item-sheets")
src = open(os.path.join(ROOT, "public", "js", "koala-house-ui.js"), encoding="utf-8").read()
KSLOT = {k: re.findall(r'"(\w+)"', v) for k, v in re.findall(r"(\w+): \[([^\]]*)\]", re.search(r"const KSLOT = \{(.*?)\};", src, re.S).group(1))}
NAME = dict(re.findall(r'(\w+): \["[^"]*", "([^"]+)"\]', src.split("const KNAME = ")[1].split("// Admin-added")[0]))
KBOX = {}
for k, v in re.findall(r'"(\w+)": \[(\d+, \d+, \d+, \d+)\]', src.split("const K3")[0].split("const KBOX")[1]): KBOX[k] = [int(x) for x in v.split(",")]
KBOX.update({"hoodie": [122, 528, 562, 819], "backpack": [131, 545, 560, 832], "scarf": [185, 531, 497, 780], "bushhat": [108, 188, 574, 441], "partyhat": [259, 100, 422, 290], "crown": [249, 190, 433, 295]})
BASE = (64, 222)
BG, GAP, LAB = (232, 236, 244), 36, 51
font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 33)
items = KSLOT["hat"] + ["scarf"] + KSLOT["body"] + KSLOT["legs"] + KSLOT["feet"] + KSLOT["back"]   # what can be seen from behind
body = Image.open(os.path.join(IMG, "back_base.webp")).convert("RGBA")

def cell(item):
    c = Image.new("RGBA", body.size, BG + (255,)); c.alpha_composite(body)
    ref = Image.open(os.path.join(IMG, item + ".webp")).convert("RGBA"); b = KBOX[item]
    c.alpha_composite(ref.resize((b[2] - b[0], b[3] - b[1]), Image.LANCZOS), (b[0] - BASE[0], b[1] - BASE[1]))
    return c.convert("RGB")

# Tall things (wizard / santa / chef hats, bunny ears, wings ...) need room: those cells get extra room above and at the sides, and the label sits in that room.
TALL = [["wizardhat", "santahat", "chefhat", "bunnyears"], ["gradhat", "beanie", "cowboyhat"], ["herocape", "angelwings", "butterflywings", "surfboard"]]
MT, MS = 230, 100   # extra room above / at each side of the koala in a tall cell

def tall_cell(item):   # the koala low in a bigger cell; the front picture of the item drawn whole (it may reach above the head or beside the body)
    c = Image.new("RGBA", (body.width + 2 * MS, body.height + MT), BG + (255,)); c.alpha_composite(body, (MS, MT))
    ref = Image.open(os.path.join(IMG, item + ".webp")).convert("RGBA"); b = KBOX[item]
    c.alpha_composite(ref.resize((b[2] - b[0], b[3] - b[1]), Image.LANCZOS), (b[0] - BASE[0] + MS, b[1] - BASE[1] + MT))
    return c.convert("RGB")

os.makedirs(OUT, exist_ok=True); meta = []; cw, ch = body.size
if os.environ.get("TALL"):
    tw, th = body.width + 2 * MS, body.height + MT
    for n, chunk in enumerate(TALL, 1):
        rows = -(-len(chunk) // 2); W, H = GAP + 2 * (tw + GAP), GAP + rows * (th + GAP)
        sheet = Image.new("RGB", (W, H), BG); d = ImageDraw.Draw(sheet); cells = []
        for i, it in enumerate(chunk):
            x, y = GAP + (i % 2) * (tw + GAP), GAP + (i // 2) * (th + GAP)
            sheet.paste(tall_cell(it), (x, y)); d.text((x + 8, y + 6), "%d. %s" % (i + 1, NAME.get(it, it)), fill=(40, 50, 70), font=font)
            cells.append({"item": it, "x": x, "y": y, "w": tw, "h": th})
        fn = "backtall-%02d.png" % n; sheet.save(os.path.join(OUT, fn)); meta.append({"file": fn, "size": [W, H], "layout": "tall", "koala": [MS, MT], "label": 60, "cells": cells}); print(fn, [c["item"] for c in cells])
    json.dump(meta, open(os.path.join(OUT, "backtall.json"), "w"), indent=1); raise SystemExit
for n, s in enumerate(range(0, len(items), 4), 1):
    chunk = items[s:s + 4]; rows = -(-len(chunk) // 2)
    W, H = GAP + 2 * (cw + GAP), GAP + rows * (ch + LAB + GAP)
    sheet = Image.new("RGB", (W, H), BG); d = ImageDraw.Draw(sheet); cells = []
    for i, it in enumerate(chunk):
        x, y = GAP + (i % 2) * (cw + GAP), GAP + (i // 2) * (ch + LAB + GAP)
        sheet.paste(cell(it), (x, y + LAB)); d.text((x + 8, y + 6), "%d. %s" % (i + 1, NAME.get(it, it)), fill=(40, 50, 70), font=font)
        cells.append({"item": it, "x": x, "y": y + LAB, "w": cw, "h": ch})
    fn = "backview-%02d.png" % n; sheet.save(os.path.join(OUT, fn)); meta.append({"file": fn, "size": [W, H], "cells": cells}); print(fn, [c["item"] for c in cells])
json.dump(meta, open(os.path.join(OUT, "backviews.json"), "w"), indent=1)
