"""AmberBench texture painter.

Every box face is painted from the same geometry the game builds, so UVs can
never drift. Two families of material:

  * **Host materials** reproduce the vanilla mob's own colouring - cow hide,
    pig skin, wool, feathers, creeper green. Infected creatures keep these on
    whatever the blight has not eaten yet, which is what makes a Blighted Cow
    still read, instantly, as a *cow*.
  * **Blight materials** are the infection: pale-oak bark, hardened chitinous
    resin, poured amber, exposed flesh, sinew, teeth, tongue, and eyes.

Eyes are drawn as actual eyes (sclera, iris, pupil, glint) rather than dark
pixels, because "eyes in places eyes should not be" only works if they read
as eyes at 2 pixels across.
"""

from __future__ import annotations

import math
import random

from PIL import Image, ImageDraw

from core import Box, Model, face_rects

# base, shade, dark, accent, bright
MATS: dict[str, tuple] = {
    # ---- the blight -----------------------------------------------------
    "bark":      ((226, 224, 214), (198, 195, 183), (128, 124, 112), (156, 152, 138), (243, 241, 233)),
    "heartwood": ((104, 74, 48), (82, 57, 36), (48, 33, 21), (176, 108, 44), (214, 150, 74)),
    "palewood":  ((237, 233, 219), (214, 209, 192), (150, 144, 126), (176, 169, 148), (250, 247, 238)),
    "amber":     ((214, 126, 42), (176, 96, 26), (110, 56, 14), (247, 176, 82), (255, 216, 140)),
    "amberglow": ((255, 178, 74), (238, 146, 46), (196, 104, 24), (255, 226, 158), (255, 248, 214)),
    "chitin":    ((60, 42, 30), (44, 30, 21), (24, 16, 11), (176, 96, 26), (226, 140, 48)),
    "flesh":     ((160, 69, 63), (132, 54, 50), (86, 32, 30), (198, 108, 96), (222, 148, 132)),
    "sinew":     ((214, 160, 143), (186, 132, 116), (128, 84, 72), (236, 196, 178), (248, 224, 208)),
    "tooth":     ((242, 237, 220), (216, 209, 188), (150, 142, 120), (232, 226, 204), (255, 253, 244)),
    "tongue":    ((140, 58, 74), (112, 44, 58), (70, 26, 36), (176, 86, 100), (206, 126, 138)),
    "eye":       ((238, 234, 222), (206, 200, 186), (26, 20, 16), (216, 126, 42), (255, 246, 226)),
    "rot":       ((110, 100, 85), (88, 79, 66), (54, 48, 40), (140, 118, 78), (168, 150, 110)),
    "sap":       ((196, 138, 58), (166, 112, 42), (108, 70, 24), (232, 178, 92), (252, 220, 150)),
    # ---- host species (vanilla-matched) ---------------------------------
    "cow_hide":     ((72, 55, 36), (56, 42, 28), (34, 26, 17), (104, 82, 56), (128, 104, 72)),
    "cow_white":    ((226, 222, 214), (198, 194, 186), (140, 136, 128), (240, 238, 232), (252, 251, 248)),
    "pig_skin":     ((240, 165, 162), (214, 138, 136), (152, 92, 90), (250, 194, 190), (255, 214, 212)),
    "wool":         ((234, 234, 232), (208, 208, 204), (150, 150, 146), (246, 246, 244), (255, 255, 255)),
    "sheep_face":   ((212, 186, 168), (184, 158, 140), (124, 104, 92), (228, 208, 194), (242, 228, 218)),
    "feather":      ((244, 244, 240), (214, 214, 208), (152, 152, 146), (252, 252, 250), (255, 255, 255)),
    "comb":         ((186, 34, 34), (152, 26, 26), (98, 16, 16), (214, 62, 62), (238, 96, 96)),
    "beak":         ((236, 158, 40), (204, 130, 28), (140, 86, 16), (248, 190, 92), (255, 216, 140)),
    "creeper_skin": ((92, 200, 92), (68, 164, 68), (40, 106, 40), (124, 220, 124), (162, 240, 162)),
    "spider_shell": ((56, 48, 42), (42, 35, 30), (24, 19, 16), (86, 74, 64), (116, 100, 86)),
    "spider_eye":   ((190, 42, 42), (150, 28, 28), (92, 14, 14), (226, 78, 78), (255, 128, 128)),
    "skin":         ((214, 168, 132), (186, 142, 108), (124, 92, 68), (232, 194, 162), (246, 216, 188)),
    "robe":         ((116, 82, 56), (94, 65, 44), (58, 40, 26), (142, 106, 76), (168, 132, 100)),
    "zombie_skin":  ((82, 124, 62), (64, 100, 48), (40, 64, 30), (108, 150, 84), (134, 176, 108)),
    "bone":         ((232, 228, 214), (204, 200, 186), (144, 140, 128), (244, 241, 232), (255, 254, 248)),
    "wolf_fur":     ((208, 204, 196), (180, 176, 168), (120, 116, 110), (228, 225, 218), (244, 242, 238)),
    "horse_hide":   ((188, 152, 112), (160, 126, 90), (106, 82, 58), (210, 180, 144), (230, 206, 178)),
    "rabbit_fur":   ((162, 138, 112), (136, 114, 90), (88, 72, 56), (186, 166, 142), (210, 194, 174)),
    "goat_fur":     ((222, 214, 200), (194, 186, 172), (132, 126, 116), (238, 232, 222), (250, 247, 240)),
    "fox_fur":      ((208, 112, 42), (176, 90, 30), (114, 56, 18), (230, 148, 82), (246, 184, 128)),
    "cat_fur":      ((140, 106, 74), (114, 84, 58), (72, 52, 36), (166, 134, 102), (192, 164, 134)),
    "llama_fur":    ((196, 168, 132), (168, 142, 108), (112, 92, 70), (216, 194, 164), (234, 218, 194)),
    "ender_skin":   ((26, 22, 30), (18, 15, 21), (9, 8, 11), (60, 48, 72), (94, 74, 118)),
    "ender_eye":    ((196, 122, 236), (164, 92, 206), (108, 54, 140), (224, 168, 250), (244, 216, 255)),
    "bee_fuzz":     ((232, 196, 106), (204, 168, 82), (140, 112, 52), (244, 216, 148), (252, 236, 196)),
    "bee_stripe":   ((58, 44, 30), (44, 33, 22), (24, 18, 12), (86, 66, 44), (114, 90, 62)),
    "iron":         ((214, 214, 214), (186, 186, 186), (128, 128, 128), (232, 232, 232), (248, 248, 248)),
    "vine":         ((92, 132, 60), (72, 106, 46), (44, 66, 28), (118, 158, 80), (146, 186, 106)),
    "leather":      ((124, 92, 60), (100, 73, 47), (62, 45, 30), (150, 116, 80), (176, 142, 106)),
    "cloth":        ((72, 84, 108), (56, 66, 86), (34, 40, 54), (96, 110, 138), (124, 140, 170)),
    "glow":         ((255, 214, 126), (244, 186, 92), (206, 142, 52), (255, 238, 190), (255, 252, 236)),
}

# Materials that should never receive blight decoration (they are the blight).
BLIGHT_MATS = {"bark", "heartwood", "palewood", "amber", "amberglow", "chitin", "flesh",
               "sinew", "tooth", "tongue", "eye", "rot", "sap", "glow"}


def shade(c, f):
    return tuple(max(0, min(255, int(v * f))) for v in c)


def mix(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


class Painter:
    def __init__(self, img: Image.Image, rng: random.Random, blight: float = 1.0):
        self.img = img
        self.px = img.load()
        self.rng = rng
        self.blight = blight  # 0 = clean host, 1 = baseline, 2+ = late stage
        self.draw = ImageDraw.Draw(img)

    # -- primitives -------------------------------------------------------

    def _put(self, x, y, c):
        if 0 <= x < self.img.width and 0 <= y < self.img.height:
            self.px[x, y] = (*c, 255)

    def _grain(self, x, y, w, h, base, dark, vertical=True, density=0.30):
        """Wood/fur grain: streaks along one axis."""
        for _ in range(max(1, int(w * h * density / 8))):
            if vertical:
                cx = x + self.rng.randrange(w)
                top = y + self.rng.randrange(max(1, h // 2))
                run = self.rng.randint(2, max(2, h - 1))
                for j in range(run):
                    if top + j < y + h:
                        self._put(cx, top + j, shade(dark, 1.0 + 0.12 * self.rng.random()))
            else:
                cy = y + self.rng.randrange(h)
                left = x + self.rng.randrange(max(1, w // 2))
                run = self.rng.randint(2, max(2, w - 1))
                for i in range(run):
                    if left + i < x + w:
                        self._put(left + i, cy, shade(dark, 1.0 + 0.12 * self.rng.random()))

    def _crack(self, x, y, w, h, col, glint=None, steps=None):
        """A branching fracture - used for chitin plates and dried resin."""
        if w < 3 or h < 3:
            return
        vert = self.rng.random() < 0.5
        cx = x + (self.rng.randrange(1, w - 1) if vert else 0)
        cy = y + (0 if vert else self.rng.randrange(1, h - 1))
        n = steps or ((h if vert else w) + self.rng.randint(0, 3))
        for _ in range(n):
            self._put(cx, cy, glint if (glint and self.rng.random() < 0.22) else col)
            if vert:
                cy += 1
                cx = max(x, min(x + w - 1, cx + self.rng.choice((-1, 0, 0, 1))))
            else:
                cx += 1
                cy = max(y, min(y + h - 1, cy + self.rng.choice((-1, 0, 0, 1))))
            if not (x <= cx < x + w and y <= cy < y + h):
                break

    def _speckle(self, x, y, w, h, col, chance=0.10):
        for j in range(h):
            for i in range(w):
                if self.rng.random() < chance:
                    self._put(x + i, y + j, col)

    # -- eyes -------------------------------------------------------------

    def eye(self, x, y, w, h, iris=None, style="round"):
        """One eye, drawn to the species rather than from a template.

        Real animals do not share a pupil: ungulates have a horizontal bar,
        hunting mammals a vertical slit, spiders a scatter of simple eyes.
        Keeping that true is most of why a blighted cow still reads as a cow
        even with four extra eyes on its skull. The blight's own creatures use
        `bloom`, an eyeblossom rather than an eye - petals around a dark
        centre, the way the flowers in a pale garden open after dark.

        Styles: round, bar, slit, simple, void, bloom.
        """
        base, sh, darkc, accent, bright = MATS["eye"]
        iris = iris or accent
        rim = (16, 11, 8)
        pupil = (8, 6, 5)
        cx, cy = w / 2.0, h / 2.0

        for j_ in range(h):
            for i_ in range(w):
                edge = (i_ == 0 or j_ == 0 or i_ == w - 1 or j_ == h - 1)
                self._put(x + i_, y + j_, rim if (edge and min(w, h) >= 4) else base)

        if style == "void":
            # A creeper's eye is a hole. The blight lights the hole.
            for j_ in range(1, max(2, h - 1)):
                for i_ in range(1, max(2, w - 1)):
                    self._put(x + i_, y + j_, pupil)
            if min(w, h) >= 4:
                for i_ in range(1, w - 1):
                    self._put(x + i_, y + 1, MATS["amberglow"][0])
            return

        if style == "simple":
            # Spiders: several small domes rather than one eye.
            for (fx, fy) in ((0.28, 0.32), (0.62, 0.28), (0.44, 0.62), (0.74, 0.66)):
                px_ = x + max(0, min(w - 1, int(fx * w)))
                py_ = y + max(0, min(h - 1, int(fy * h)))
                self._put(px_, py_, pupil)
                if min(w, h) >= 5:
                    self._put(px_, max(y, py_ - 1), shade(MATS["spider_eye"][0], 1.0))
            return

        if style == "bloom":
            # An eyeblossom: petals of amber around a dark centre.
            for j_ in range(h):
                for i_ in range(w):
                    dx, dy = (i_ + 0.5 - cx) / max(1.0, cx), (j_ + 0.5 - cy) / max(1.0, cy)
                    r = math.sqrt(dx * dx + dy * dy)
                    if r < 0.34:
                        self._put(x + i_, y + j_, pupil)
                    elif r < 0.82 and ((i_ + j_) % 2 == 0 or min(w, h) < 5):
                        self._put(x + i_, y + j_, MATS["amberglow"][0])
                    elif r < 0.95:
                        self._put(x + i_, y + j_, iris)
            return

        # --- pupils that are actually shaped ------------------------------
        if style == "bar":
            ph = 1 if h <= 4 else 2
            pw = max(2, w - 2)
        elif style == "slit":
            pw = 1 if w <= 4 else 2
            ph = max(2, h - 2)
        else:
            pw = ph = 1 if min(w, h) <= 3 else (2 if min(w, h) <= 6 else min(w, h) // 3)
        px0 = x + (w - pw) // 2
        py0 = y + (h - ph) // 2

        if min(w, h) >= 5:
            for j_ in range(py0 - 1 - y, py0 - 1 - y + ph + 2):
                for i_ in range(px0 - 1 - x, px0 - 1 - x + pw + 2):
                    if 0 <= i_ < w and 0 <= j_ < h:
                        self._put(x + i_, y + j_, iris)
        for j_ in range(ph):
            for i_ in range(pw):
                self._put(px0 + i_, py0 + j_, pupil)
        if min(w, h) >= 4:
            self._put(px0 - 1, py0 - 1, (255, 253, 246))

    def eye_field(self, x, y, w, h, count=3, iris=None):
        """A cluster of small eyes scattered over a face - the blight's habit
        of opening eyes wherever it finishes growing."""
        for _ in range(count):
            s = self.rng.choice((3, 4, 4, 5)) if min(w, h) >= 6 else (
                3 if min(w, h) >= 4 else 2)
            if w - s < 1 or h - s < 1:
                return
            ex = x + self.rng.randrange(w - s + 1)
            ey = y + self.rng.randrange(h - s + 1)
            self.eye(ex, ey, s, s, iris=iris)

    # -- material dispatch ------------------------------------------------

    def face(self, x, y, w, h, mat, up=False, front=False, back=False):
        spec = MATS.get(mat.split(":", 1)[0], MATS["bark"])
        base, sh, darkc, accent, bright = spec
        # Flat fill with a vertical light falloff and fine noise.
        for j in range(h):
            t = j / max(1, h - 1)
            row = shade(base, 1.04 - 0.16 * t if not up else 1.10 - 0.10 * t)
            for i in range(w):
                c = row
                if self.rng.random() < 0.10:
                    c = shade(row, 0.94 if self.rng.random() < 0.5 else 1.06)
                self._put(x + i, y + j, c)
        if w >= 3 and h >= 3:
            self.draw.rectangle([x, y, x + w - 1, y + h - 1], outline=(*sh, 255))
            self.draw.line([x + 1, y, x + w - 2, y], fill=(*shade(base, 1.10), 255))

        area = w * h
        if area < 6:
            return

        if mat in ("bark", "palewood", "heartwood"):
            self._grain(x, y, w, h, base, darkc, vertical=True, density=0.55)
            self._speckle(x, y, w, h, shade(accent, 0.9), 0.03)
        elif mat in ("amber", "amberglow", "sap"):
            # Poured resin: pooled gradient, dark inclusions, wet highlight.
            for _ in range(max(1, area // 26)):
                bx = x + self.rng.randrange(w)
                by = y + self.rng.randrange(h)
                self._put(bx, by, shade(darkc, 1.15))
            for _ in range(max(1, area // 48)):
                self._crack(x, y, w, h, bright, glint=(255, 255, 236))
            if w >= 4 and h >= 4:
                self.draw.line([x + 1, y + 1, x + 1, y + max(1, h // 3)],
                               fill=(*bright, 255))
        elif mat == "chitin":
            for _ in range(max(1, area // 22)):
                self._crack(x, y, w, h, accent, glint=bright)
            self._speckle(x, y, w, h, darkc, 0.08)
        elif mat == "flesh":
            self._grain(x, y, w, h, base, darkc, vertical=False, density=0.70)
            self._speckle(x, y, w, h, accent, 0.07)
            if w >= 4 and h >= 4:
                self._put(x + w // 3, y + h // 3, bright)
        elif mat == "sinew":
            self._grain(x, y, w, h, base, sh, vertical=True, density=0.9)
        elif mat == "tongue":
            self.draw.line([x + w // 2, y, x + w // 2, y + h - 1], fill=(*darkc, 255))
            self._speckle(x, y, w, h, accent, 0.10)
        elif mat == "tooth":
            for i in range(w):
                self._put(x + i, y + h - 1, shade(darkc, 1.2))
        elif mat.startswith("eye"):
            # An eyeball is a sphere pretending to be a cube: every face but
            # the one buried in the socket looks back at you, so the eye
            # reads from any angle rather than only head-on.
            if not back:
                self.eye(x, y, w, h, style=(mat.split(":", 1)[1] if ":" in mat else "round"))
            else:
                base_s, sh_s, dk, ac, br = MATS["sinew"]
                for j in range(h):
                    for i in range(w):
                        self._put(x + i, y + j, shade(dk, 0.85 + 0.3 * self.rng.random()))
        elif mat == "rot":
            self._speckle(x, y, w, h, darkc, 0.16)
            self._grain(x, y, w, h, base, darkc, vertical=False, density=0.4)
        elif mat == "cow_hide":
            # Vanilla cows are brown with irregular white patches.
            for _ in range(max(1, area // 40)):
                px_, py_ = x + self.rng.randrange(w), y + self.rng.randrange(h)
                rw, rh = self.rng.randint(2, max(2, w // 2)), self.rng.randint(2, max(2, h // 2))
                self.draw.ellipse([px_, py_, min(x + w - 1, px_ + rw),
                                   min(y + h - 1, py_ + rh)],
                                  fill=(*MATS["cow_white"][0], 255))
            self._speckle(x, y, w, h, sh, 0.06)
        elif mat == "creeper_skin":
            # The mottled two-tone patchwork.
            for _ in range(max(2, area // 10)):
                px_, py_ = x + self.rng.randrange(w), y + self.rng.randrange(h)
                s = self.rng.randint(1, 2)
                self.draw.rectangle([px_, py_, min(x + w - 1, px_ + s),
                                     min(y + h - 1, py_ + s)],
                                    fill=(*self.rng.choice((sh, darkc, accent)), 255))
        elif mat in ("wool", "feather", "wolf_fur", "goat_fur", "llama_fur",
                     "rabbit_fur", "fox_fur", "cat_fur", "bee_fuzz"):
            self._grain(x, y, w, h, base, sh, vertical=True, density=0.85)
            self._speckle(x, y, w, h, bright, 0.06)
        elif mat in ("spider_shell", "ender_skin", "bee_stripe"):
            self._speckle(x, y, w, h, darkc, 0.14)
            self._grain(x, y, w, h, base, darkc, vertical=False, density=0.3)
        elif mat in ("iron", "bone"):
            self._grain(x, y, w, h, base, sh, vertical=True, density=0.25)
        else:
            self._grain(x, y, w, h, base, sh, vertical=True, density=0.35)

        # Late-stage infection weeps amber through whatever it is riding on.
        if self.blight > 0.35 and mat not in BLIGHT_MATS and area >= 10:
            for _ in range(max(1, int(self.blight * 0.8 + area / 110))):
                self._crack(x, y, w, h, MATS["amber"][0], glint=MATS["amber"][4])


def paint(model: Model, seed: int, blight: float = 1.0,
          eyes: dict[str, int] | None = None,
          faces: dict[str, str] | None = None) -> Image.Image:
    """Paints the whole sheet.

    `eyes` maps part name -> how many extra eyes to scatter on its front
    faces. `faces` maps part name -> a special treatment key.
    """
    img = Image.new("RGBA", (model.tex, model.tex), (0, 0, 0, 0))
    rng = random.Random(seed)
    p = Painter(img, rng, blight)
    eyes = eyes or {}
    faces = faces or {}

    for part in model.parts:
        stem = part.name.split("__r")[0]
        for b in part.boxes:
            rects = face_rects(b)
            for name, (x, y, w, h) in rects.items():
                if w <= 0 or h <= 0:
                    continue
                p.face(x, y, w, h, b.mat, up=(name == "top"),
                       front=(name == "front"),
                       back=(name in ("back", "bottom")))
            n = eyes.get(stem)
            if n:
                x, y, w, h = rects["front"]
                if w >= 3 and h >= 3:
                    p.eye_field(x, y, w, h, count=n)
                x, y, w, h = rects["top"]
                if w >= 3 and h >= 3 and n > 2:
                    p.eye_field(x, y, w, h, count=max(1, n // 2))
    return img
