"""Export an AmberBench model as a Minecraft *item* model.

Item models are not entity models: the game wants a flat list of axis-aligned
cuboids in a 16-unit box, each face carrying its own UV rect, rather than a
pivoted part tree. This walks a compiled bench model, bakes the part
hierarchy down into world-space boxes, and writes the JSON - which means a
held item can be built with the same DSL, painter and preview renderer as the
creatures, instead of being drawn as a flat sprite.

Vanilla only allows one rotation axis per element, at a fixed set of angles,
so anything angled is snapped to the nearest legal value. Keep item geometry
mostly square and it survives the trip intact.
"""

from __future__ import annotations

import json
import math

from core import Model, face_rects

LEGAL_ANGLES = (-45.0, -22.5, 0.0, 22.5, 45.0)

# Item-model faces, and which bench face rect feeds each one.
FACE_MAP = {
    "north": "front", "south": "back", "west": "right",
    "east": "left", "up": "top", "down": "bottom",
}


def _snap(deg: float) -> float:
    return min(LEGAL_ANGLES, key=lambda a: abs(a - deg))


def export(model: Model, texture: str, *, origin=(8.0, 8.0, 8.0),
           scale: float = 1.0, display: dict | None = None) -> dict:
    """Bakes `model` into an item-model dict.

    `origin` is where the model's own zero lands inside the 16-unit item box,
    and `scale` shrinks a creature-sized model down to something a hand can
    hold.
    """
    pm = model.part_map()
    elements = []

    def world_offset(part):
        """Accumulated pivot of a part, walking up to the root."""
        x = y = z = 0.0
        rot = [0.0, 0.0, 0.0]
        node = part
        while node is not None:
            x += node.pivot[0]
            y += node.pivot[1]
            z += node.pivot[2]
            rot = [rot[i] + node.rot[i] for i in range(3)]
            node = pm.get(node.parent)
        return (x, y, z), rot

    for part in model.parts:
        (px, py, pz), rot = world_offset(part)
        for b in part.boxes:
            if b.uv is None:
                continue
            ox, oy, oz = b.origin
            w, h, d = b.size
            # Bench space has +y down; item space has +y up.
            x0 = origin[0] + (px + ox) * scale
            y0 = origin[1] - (py + oy + h) * scale
            z0 = origin[2] + (pz + oz) * scale
            frm = [round(x0, 3), round(y0, 3), round(z0, 3)]
            to = [round(x0 + w * scale, 3), round(y0 + h * scale, 3),
                  round(z0 + d * scale, 3)]

            rects = face_rects(b)
            faces = {}
            for name, key in FACE_MAP.items():
                rx, ry, rw, rh = rects[key]
                if rw <= 0 or rh <= 0:
                    continue
                k = 16.0 / model.tex
                faces[name] = {
                    "uv": [round(rx * k, 4), round(ry * k, 4),
                           round((rx + rw) * k, 4), round((ry + rh) * k, 4)],
                    "texture": "#0",
                }
            element = {"from": frm, "to": to, "faces": faces}

            # One axis only, snapped - pick whichever rotation is largest.
            degs = [r / math.pi * 180.0 for r in rot]
            axis_i = max(range(3), key=lambda i: abs(degs[i]))
            if abs(degs[axis_i]) > 6.0:
                element["rotation"] = {
                    "angle": _snap(degs[axis_i]),
                    "axis": ("x", "y", "z")[axis_i],
                    "origin": [round(origin[0] + px * scale, 3),
                               round(origin[1] - py * scale, 3),
                               round(origin[2] + pz * scale, 3)],
                }
            elements.append(element)

    out = {
        "textures": {"0": texture, "particle": texture},
        "elements": elements,
    }
    if display:
        out["display"] = display
    return out


def write(model: Model, texture: str, path: str, **kwargs) -> None:
    with open(path, "w") as fh:
        json.dump(export(model, texture, **kwargs), fh, indent=1)
    print(f"{path}: {len(export(model, texture, **kwargs)['elements'])} elements")
