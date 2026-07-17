"""Model compiler for The Gilded Seam.

Single source of truth for entity geometry: each model is declared as data
(parts, pivots, rotations, boxes, paint styles). From that we emit:

  1. Java `LayerDefinition` bodies (pasted into the client model classes),
     with texture UVs assigned by an automatic shelf packer.
  2. The matching entity textures, painted box-by-box so every face of every
     cube gets deliberate porcelain/gold/kiln artwork on exactly the pixels
     the model samples.

Because both outputs come from the same data, model UVs and textures can
never drift apart.
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass, field

from PIL import Image, ImageDraw

# ---------------------------------------------------------------------------
# Geometry model
# ---------------------------------------------------------------------------


@dataclass
class Box:
    origin: tuple[float, float, float]  # offset from part pivot (model space, +y down)
    size: tuple[float, float, float]
    style: str = "glaze"
    grow: float = 0.0
    uv: tuple[int, int] | None = None  # assigned by the packer

    @property
    def isize(self) -> tuple[int, int, int]:
        w, h, d = self.size
        return (max(1, round(w)), max(1, round(h)), max(1, round(d)))

    def uv_extent(self) -> tuple[int, int]:
        w, h, d = self.isize
        return (2 * (w + d), h + d)


@dataclass
class Part:
    name: str
    parent: str  # "root" or another part name
    pivot: tuple[float, float, float]
    rot: tuple[float, float, float] = (0.0, 0.0, 0.0)  # radians
    boxes: list[Box] = field(default_factory=list)


@dataclass
class Model:
    name: str
    tex: int  # texture is tex x tex
    parts: list[Part]

    def part_map(self) -> dict[str, Part]:
        return {p.name: p for p in self.parts}

    def children_of(self, name: str) -> list[Part]:
        return [p for p in self.parts if p.parent == name]


# ---------------------------------------------------------------------------
# UV shelf packing
# ---------------------------------------------------------------------------


def pack_uvs(model: Model, padding: int = 1) -> None:
    """Assigns box.uv for every box using a simple shelf packer."""
    boxes: list[Box] = [b for p in model.parts for b in p.boxes]
    # Tallest shelves first gives dense packing.
    boxes.sort(key=lambda b: (-b.uv_extent()[1], -b.uv_extent()[0]))

    x = y = shelf_h = 0
    for box in boxes:
        w, h = box.uv_extent()
        if w > model.tex:
            raise ValueError(f"{model.name}: box too wide for texture: {box}")
        if x + w > model.tex:
            x = 0
            y += shelf_h + padding
            shelf_h = 0
        if y + h > model.tex:
            raise ValueError(
                f"{model.name}: texture {model.tex}x{model.tex} overflow at box {box}")
        box.uv = (x, y)
        x += w + padding
        shelf_h = max(shelf_h, h)


# ---------------------------------------------------------------------------
# Java emission
# ---------------------------------------------------------------------------


def _f(value: float) -> str:
    text = f"{value:.4f}".rstrip("0").rstrip(".")
    if "." not in text and "e" not in text:
        text += ".0"
    return text + "F"


def emit_java(model: Model) -> str:
    """Emits the body of createBodyLayer() for this model."""
    lines: list[str] = []
    lines.append("        MeshDefinition mesh = new MeshDefinition();")
    lines.append("        PartDefinition root = mesh.getRoot();")
    lines.append("")

    emitted: dict[str, str] = {"root": "root"}

    def java_var(name: str) -> str:
        pieces = name.split("_")
        return pieces[0] + "".join(s.capitalize() for s in pieces[1:])

    def emit_part(part: Part) -> None:
        parent_var = emitted[part.parent]
        var = java_var(part.name)
        cubes: list[str] = []
        for box in part.boxes:
            u, v = box.uv
            ox, oy, oz = box.origin
            w, h, d = box.size
            grow = (f", new CubeDeformation({_f(box.grow)[:-1]}F)" if box.grow else "")
            cubes.append(
                f".texOffs({u}, {v}).addBox({_f(ox)}, {_f(oy)}, {_f(oz)}, "
                f"{_f(w)}, {_f(h)}, {_f(d)}{grow})")
        cube_chain = "CubeListBuilder.create()" + "".join(
            "\n                        " + c for c in cubes)

        px, py, pz = part.pivot
        rx, ry, rz = part.rot
        if rx or ry or rz:
            pose = (f"PartPose.offsetAndRotation({_f(px)}, {_f(py)}, {_f(pz)}, "
                    f"{_f(rx)}, {_f(ry)}, {_f(rz)})")
        else:
            pose = f"PartPose.offset({_f(px)}, {_f(py)}, {_f(pz)})"

        lines.append(f"        PartDefinition {var} = {parent_var}.addOrReplaceChild(\"{part.name}\",")
        lines.append(f"                {cube_chain},")
        lines.append(f"                {pose});")
        emitted[part.name] = var

        for child in model.children_of(part.name):
            emit_part(child)

    for part in model.children_of("root"):
        emit_part(part)

    lines.append("")
    lines.append(f"        return LayerDefinition.create(mesh, {model.tex}, {model.tex});")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Painting
# ---------------------------------------------------------------------------

PALETTES = {
    # base, base_shade, crack, seam gold (dark, mid, bright)
    "glaze": ((244, 239, 230), (222, 214, 199), (62, 55, 48), (166, 116, 24), (222, 168, 62), (247, 220, 138)),
    "dark": ((196, 186, 170), (168, 158, 142), (52, 45, 40), (150, 104, 22), (203, 152, 52), (240, 209, 122)),
    "gold": ((216, 168, 62), (176, 128, 38), (120, 82, 18), (150, 104, 22), (232, 186, 84), (250, 228, 152)),
    "kiln": ((94, 74, 62), (72, 56, 47), (40, 30, 26), (255, 118, 42), (255, 162, 64), (255, 214, 110)),
    "mask": ((248, 244, 236), (230, 223, 210), (70, 62, 54), (166, 116, 24), (222, 168, 62), (247, 220, 138)),
    "glow": ((255, 196, 84), (238, 160, 52), (196, 108, 28), (255, 232, 160), (255, 244, 200), (255, 252, 232)),
    "thread": ((222, 168, 62), (190, 138, 44), (150, 104, 22), (222, 168, 62), (240, 200, 104), (252, 236, 176)),
}

COBALT = (60, 91, 168)
COBALT_DARK = (40, 62, 122)


def _shade(color, factor):
    return tuple(max(0, min(255, int(c * factor))) for c in color)


class FacePainter:
    """Paints one rectangular face region of the unwrapped box."""

    def __init__(self, img: Image.Image, rng: random.Random, gold_density: float):
        self.img = img
        self.rng = rng
        self.gold = gold_density

    def base(self, x, y, w, h, style):
        base, shade, crack, g_dark, g_mid, g_bright = PALETTES[style]
        px = self.img.load()
        for j in range(h):
            for i in range(w):
                c = base
                # Vertical glaze gradient + speckle.
                t = j / max(1, h - 1)
                c = _shade(c, 1.0 - 0.10 * t)
                if self.rng.random() < 0.08:
                    c = _shade(c, 0.94 if self.rng.random() < 0.5 else 1.05)
                px[x + i, y + j] = (*c, 255)
        # Edge shading makes each plate read as a separate piece of ware.
        draw = ImageDraw.Draw(self.img)
        if w >= 3 and h >= 3:
            draw.rectangle([x, y, x + w - 1, y + h - 1], outline=(*shade, 255))
            # Top highlight edge.
            draw.line([x + 1, y, x + w - 2, y], fill=(*_shade(base, 1.08), 255))

    def _walk(self, x, y, w, h, main, glint=None, partial=False):
        """A crack / seam: a seeded random walk across the face in one hue,
        with the occasional bright glint pixel."""
        rng = self.rng
        px = self.img.load()
        if w < 3 or h < 3:
            return
        vertical = rng.random() < 0.5
        if vertical:
            cx, cy = rng.randint(1, w - 2), 0
        else:
            cx, cy = 0, rng.randint(1, h - 2)
        steps = (h if vertical else w) + rng.randint(0, 2)
        if partial:
            steps = max(2, steps // 2)
            if vertical:
                cy = rng.randint(0, h // 2)
            else:
                cx = rng.randint(0, w // 2)
        for _ in range(steps):
            if 0 <= cx < w and 0 <= cy < h:
                color = main
                if glint is not None and rng.random() < 0.25:
                    color = glint
                px[x + cx, y + cy] = (*color, 255)
            if vertical:
                cy += 1
                cx += rng.choice((-1, 0, 0, 0, 1))
                cx = max(0, min(w - 1, cx))
            else:
                cx += 1
                cy += rng.choice((-1, 0, 0, 0, 1))
                cy = max(0, min(h - 1, cy))

    def decorate(self, x, y, w, h, style):
        base, shade, crack, g_dark, g_mid, g_bright = PALETTES[style]
        area = w * h
        if style == "glow":
            # Molten: bright core, darker rim, no cracks.
            draw = ImageDraw.Draw(self.img)
            if w >= 4 and h >= 4:
                draw.rectangle([x + 1, y + 1, x + w - 2, y + h - 2], fill=(*g_bright[:3], 255))
                draw.rectangle([x, y, x + w - 1, y + h - 1], outline=(*base, 255))
            return
        if area < 12:
            return  # tiny faces stay clean
        if style == "gold" or style == "thread":
            # Hammered gold: a few burnish strokes.
            for _ in range(max(1, area // 48)):
                self._walk(x, y, w, h, _shade(base, 1.12), g_bright, partial=True)
            for _ in range(area // 64):
                self._walk(x, y, w, h, shade, None, partial=True)
            return
        if style == "kiln":
            # Fired clay: ember cracks glowing from inside.
            for _ in range(max(1, area // 30)):
                self._walk(x, y, w, h, g_dark, g_bright)
            return
        # Porcelain styles: sparse crazing (fine grey cracks), then the
        # occasional kintsugi seam — one bold line of gold, not a flood.
        soft_crack = _shade(crack, 2.4)
        for _ in range(area // 40):
            self._walk(x, y, w, h, soft_crack, crack)
        n_seams = int(area / 110 * self.gold)
        if self.rng.random() < min(0.9, 0.30 * self.gold):
            n_seams += 1
        for _ in range(n_seams):
            self._walk(x, y, w, h, g_mid, g_bright)

    def mask_features(self, x, y, w, h):
        """Serene painted features for a face plate: closed eyes, tear-lines."""
        if w < 6 or h < 6:
            return
        draw = ImageDraw.Draw(self.img)
        eye_y = y + h // 3
        lx = x + w // 4
        rx = x + (3 * w) // 4 - 1
        for ex in (lx, rx):
            # A closed eye: gentle cobalt arc.
            draw.line([ex - 1, eye_y, ex + 1, eye_y], fill=(*COBALT_DARK, 255))
            draw.point((ex - 2, eye_y - 1), fill=(*COBALT, 255))
            draw.point((ex + 2, eye_y - 1), fill=(*COBALT, 255))
            # Gold tear-line falling from the eye.
            g = PALETTES["glaze"][4]
            gb = PALETTES["glaze"][5]
            for j in range(eye_y + 1, min(y + h - 1, eye_y + h // 2)):
                draw.point((ex, j), fill=(*(g if (j % 2) else gb), 255))
        # A small cobalt bloom on the brow.
        bx, by = x + w // 2, y + 1
        draw.point((bx, by), fill=(*COBALT, 255))
        if h > 8:
            draw.point((bx - 1, by + 1), fill=(*COBALT_DARK, 255))
            draw.point((bx + 1, by + 1), fill=(*COBALT_DARK, 255))


FACES = ("top", "bottom", "right", "front", "left", "back")


def face_rects(box: Box):
    w, h, d = box.isize
    u, v = box.uv
    return {
        "top": (u + d, v, w, d),
        "bottom": (u + d + w, v, w, d),
        "right": (u, v + d, d, h),
        "front": (u + d, v + d, w, h),
        "left": (u + d + w, v + d, d, h),
        "back": (u + d + w + d, v + d, w, h),
    }


def paint(model: Model, seed: int, gold_density: float = 1.0,
          mask_parts: set[str] | None = None,
          warm: float = 0.0) -> Image.Image:
    """Paints the full texture for a model. `mask_parts` get serene painted
    faces on their front plate; `warm` tints toward higher firing tiers."""
    img = Image.new("RGBA", (model.tex, model.tex), (0, 0, 0, 0))
    rng = random.Random(seed)
    painter = FacePainter(img, rng, gold_density)
    mask_parts = mask_parts or set()

    for part in model.parts:
        for box in part.boxes:
            rects = face_rects(box)
            for face_name in FACES:
                x, y, w, h = rects[face_name]
                if w <= 0 or h <= 0:
                    continue
                painter.base(x, y, w, h, box.style)
                painter.decorate(x, y, w, h, box.style)
                if part.name in mask_parts and face_name == "front" and box.style == "mask":
                    painter.mask_features(x, y, w, h)

    if warm > 0:
        # Lustre firing: pull the whole palette toward hot ivory-gold.
        px = img.load()
        for j in range(model.tex):
            for i in range(model.tex):
                r, g, b, a = px[i, j]
                if a == 0:
                    continue
                r = min(255, int(r * (1 + 0.06 * warm)))
                g = min(255, int(g * (1 + 0.02 * warm)))
                b = int(b * (1 - 0.10 * warm))
                px[i, j] = (r, g, b, a)
    return img
