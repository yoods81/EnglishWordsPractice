"""One reference image per item for the straight-back view: the plain back koala (back_base.webp) on a light panel with the item's name written above.
Gemini draws the same koala wearing the item (back view, koala unchanged, flat green background); cut-back-worn.py then takes the item out by comparing with back_base.
Usage: python scripts/make-back-single.py -> "Koala Images/item-sheets/back1-<item>.png" """
import os, re
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
IMG = os.path.join(ROOT, "public", "img", "koala"); OUT = os.path.join(ROOT, "Koala Images", "item-sheets")
src = open(os.path.join(ROOT, "public", "js", "koala-house-ui.js"), encoding="utf-8").read()
NAME = dict(re.findall(r'(\w+): \["[^"]*", "([^"]+)"\]', src.split("const KNAME = ")[1].split("// Admin-added")[0]))
ITEMS = ["hoodie", "stripeshirt", "pinkdress", "labcoat", "jersey", "plaidskirt", "denimskirt", "flowerskirt", "tutu", "backpack", "herocape",
         "jeans", "khakishorts", "cargopants", "sweatpants", "sneakers", "rainboots", "cowboyboots", "balletshoes", "bunnyslippers", "soccercleats", "sandals", "rollerskates"]
BG = (232, 236, 244); font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 44)
body = Image.open(os.path.join(IMG, "back_base.webp")).convert("RGBA"); os.makedirs(OUT, exist_ok=True)
for it in ITEMS:
    W, H = 760, 1070; c = Image.new("RGB", (W, H), BG); d = ImageDraw.Draw(c)
    b = body.resize((553, 746)); c.paste(b, (103, 250), b)
    d.text((24, 22), "%s" % NAME.get(it, it), fill=(40, 50, 70), font=font)
    # the item's old FRONT picture, small, in the top-right corner: only for its design, colours and pattern (it is the wrong view for the koala from behind)
    ref = Image.open(os.path.join(IMG, "th", it + ".webp")).convert("RGBA")   # the shop-card picture (th/): the whole item, not the front-view layer; k = min(210 / ref.width, 190 / ref.height); ref = ref.resize((max(1, round(ref.width * k)), max(1, round(ref.height * k))), Image.LANCZOS)
    d.rectangle((W - 246, 14, W - 14, 236), fill=(255, 255, 255), outline=(190, 198, 214), width=2)
    c.paste(ref, (W - 246 + (232 - ref.width) // 2, 24 + (200 - ref.height) // 2), ref)
    d.text((W - 238, 206), "FRONT (design only)", fill=(120, 130, 150), font=ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 18))
    c.save(os.path.join(OUT, "back1-%s.png" % it)); print(it)
