"""Zoomed-in redo sheets for items that came out tiny (the item is cropped tight so Gemini has to draw it large).
Usage: python scripts/make-redo-sheets.py  -> "Koala Images/item-sheets/redo-*.png" + redo.json"""
import json, os, re
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), "..")
IMG = os.path.join(ROOT, "public", "img", "koala")
OUT = os.path.join(ROOT, "Koala Images", "item-sheets")
src = open(os.path.join(ROOT, "public", "js", "koala-house-ui.js"), encoding="utf-8").read()
KBOX = {"base": [64, 222, 617, 968], "hoodie": [122, 528, 562, 819], "backpack": [131, 545, 560, 832], "scarf": [185, 531, 497, 780], "glasses": [162, 362, 520, 500], "bushhat": [108, 188, 574, 441], "partyhat": [259, 100, 422, 290], "crown": [249, 190, 433, 295]}
for k, v in re.findall(r'"(\w+)": \[(\d+, \d+, \d+, \d+)\]', src.split("const K3")[0].split("const KBOX")[1]): KBOX[k] = [int(x) for x in v.split(",")]
NAME = dict(re.findall(r'(\w+): \["[^"]*", "([^"]+)"\]', src.split("const KNAME = ")[1].split("// Admin-added")[0]))
ITEMS = ["crown", "freckles", "sandals", "soccercleats", "bunnyslippers", "rollerskates"]
CELL, GAP, LAB, BG = 800, 36, 51, (232, 236, 244)
font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 33)
body = Image.open(os.path.join(IMG, "iso_stand_f.webp")).convert("RGBA")

def cell(item):
    x0, y0, x1, y1 = KBOX[item]; cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    side = max(x1 - x0, y1 - y0) * 1.5            # crop square in canvas units
    k = 2                                          # work at 2x, then fit to CELL
    M = 300   # margin so a crop near the edge never leaves the canvas
    full = Image.new("RGBA", (round(1300 * k), round(1700 * k)), BG + (255,))
    def put(im, b): full.alpha_composite(im.resize((round((b[2] - b[0]) * k), round((b[3] - b[1]) * k)), Image.LANCZOS), (round((b[0] + M) * k), round((b[1] + M) * k)))
    put(body, KBOX["base"]); put(Image.open(os.path.join(IMG, item + ".webp")).convert("RGBA"), KBOX[item])
    box = tuple(round(v * k) for v in (cx - side / 2 + M, cy - side / 2 + M, cx + side / 2 + M, cy + side / 2 + M))
    return full.crop(box).resize((CELL, CELL), Image.LANCZOS), {"cx": cx, "cy": cy, "side": side}

meta = []
for n, chunk in enumerate([ITEMS[:4], ITEMS[4:], ["sandals", "soccercleats"], ["soccercleats", "sandals"]]):   # 3rd = second try for the two that came back flat
    nrows = -(-len(chunk) // 2)
    W, H = GAP + 2 * (CELL + GAP), GAP + nrows * (CELL + LAB + GAP)
    sheet = Image.new("RGB", (W, H), BG); d = ImageDraw.Draw(sheet); cells = []
    for i, item in enumerate(chunk):
        x, y = GAP + (i % 2) * (CELL + GAP), GAP + (i // 2) * (CELL + LAB + GAP)
        im, geo = cell(item); sheet.paste(im.convert("RGB"), (x, y + LAB))
        d.text((x + 8, y + 6), "%d. %s" % (i + 1, NAME.get(item, item)), fill=(40, 50, 70), font=font)
        cells.append(dict(item=item, x=x, y=y + LAB, w=CELL, h=CELL, **geo))
    fn = "redo-%02d.png" % (n + 1); sheet.save(os.path.join(OUT, fn)); meta.append({"file": fn, "size": [W, H], "cells": cells}); print(fn, W, H, chunk)
json.dump(meta, open(os.path.join(OUT, "redo.json"), "w"), indent=1)
