"""Where each worn item sits on the straight back koala (img/koala/back_base.webp), measured on the koala's own body (canvas units, the same as KBOX):
head dome top y~262, neck y~555, shoulders y~575, arms to y~710 (x 100..580), torso x 182..497, hips y~730, legs split y~840, ankles y~940, floor y~968; centre x=340.
Each entry: (width, top, bottom) - the picture is stretched to that box, centred on x=340 -  or (width, None, bottom)/(width, top, None) to keep the aspect.
Writes `const KBACK` in public/js/koala-house-ui.js.   Usage: python scripts/apply-back-fit.py"""
import json, os, re
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
IMG = os.path.join(ROOT, "public", "img", "koala", "back"); UI = os.path.join(ROOT, "public", "js", "koala-house-ui.js")
CX = 340
FIT = {
    # hats: the base sits on the head dome
    "partyhat": (150, None, 352), "wizardhat": (330, None, 350), "chefhat": (250, None, 340), "santahat": (270, None, 372), "crown": (190, None, 312), "bunnyears": (290, None, 322),
    # tops (sleeves reach the arms)
    "tshirt": (440, 566, 840), "stripeshirt": (470, 566, 810), "hoodie": (420, 440, 850), "jersey": (440, 566, 850), "pinkdress": (400, 566, 880), "labcoat": (470, 566, 905), "overalls": (380, 566, 915),
    # bottoms (above the ankles so the shoes show)
    "jeans": (300, 715, 925), "khakishorts": (300, 715, 905), "cargopants": (300, 715, 925), "sweatpants": (300, 715, 925),
    "plaidskirt": (360, 728, 842), "denimskirt": (350, 728, 846), "flowerskirt": (370, 728, 852), "tutu": (430, 724, 850),
    # shoes: a pair as wide as the feet, standing on the floor line
    "sneakers": (290, None, 972), "rainboots": (292, None, 972), "cowboyboots": (292, None, 972), "balletshoes": (290, None, 972), "bunnyslippers": (290, None, 972), "soccercleats": (290, None, 972), "sandals": (290, None, 972), "rollerskates": (292, None, 975),
    # back things
    "herocape": (330, 595, 885), "angelwings": (560, 480, None), "butterflywings": (520, 470, None), "backpack": (340, 556, 872), "surfboard": (120, 430, 910),
}
# the bunny headband comes as a whole loop: from behind only the top of the band over the head shows, not its ends hanging at the sides
_f = os.path.join(IMG, "bunnyears.webp")
if os.path.exists(_f):
    _im = Image.open(_f).convert("RGBA")
    if _im.height > 0.9 * 1.5 * _im.width * 0.65: _im.crop((0, 0, _im.width, round(_im.height * 0.47))).save(_f, "WEBP", quality=92, method=6)
s = open(UI, encoding="utf-8").read(); K = json.loads(re.search(r"  const KBACK = (\{.*?\});", s).group(1))
for n, (w, top, bot) in FIT.items():
    f = os.path.join(IMG, n + ".webp")
    if not os.path.exists(f): continue
    im = Image.open(f); asp = im.height / im.width
    if top is None: top = bot - w * asp
    elif bot is None: bot = top + w * asp
    K[n] = [round(CX - w / 2, 1), round(top, 1), round(CX + w / 2, 1), round(bot, 1)]
line = "  const KBACK = %s;   // pictures of the worn items seen from straight behind (img/koala/back/<item>.webp): [x0,y0,x1,y1] in KBOX units (scripts/cut-back-alone.py, then scripts/apply-back-fit.py)" % json.dumps(K, separators=(",", ":"))
s = re.sub(r"  const KBACK = \{.*?\};.*", lambda m: line, s, count=1); open(UI, "w", encoding="utf-8").write(s); print(len(K), "items")
