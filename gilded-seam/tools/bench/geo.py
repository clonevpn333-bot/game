"""Export AmberBench models as GeckoLib geometry, and author animations.

GeckoLib eats Bedrock-format `.geo.json`: a flat list of bones, each naming
its parent, carrying a pivot and a list of cubes with UV corners. That is a
near-exact match for what the bench already builds, with two differences worth
being careful about:

  * Bedrock space has **+y up** and measures from the creature's feet, while
    bench space (like vanilla entity models) has **+y down**. Every pivot and
    every cube origin is flipped through the ground plane on the way out.
  * Bedrock pivots are absolute, not relative to the parent, so the exporter
    accumulates each bone's position up the tree.

Getting those two right is the whole job; everything else is transcription.

The second half of this module authors `.animation.json` files. Writing
keyframes as data rather than by hand in Blockbench means an animation can be
*derived* - a gait can be generated for thirteen creatures from one description
with per-species timing - and it stays in version control as something
readable.
"""

from __future__ import annotations

import json
import math

from core import Model, face_rects, validate

GROUND = 24.0


# ---------------------------------------------------------------------------
# Geometry
# ---------------------------------------------------------------------------


def to_geo(model: Model, name: str) -> dict:
    """Converts a compiled bench model into a GeckoLib geometry document."""
    validate(model)
    pm = model.part_map()
    bones = []

    def absolute(part):
        x = y = z = 0.0
        node = part
        while node is not None:
            x += node.pivot[0]
            y += node.pivot[1]
            z += node.pivot[2]
            node = pm.get(node.parent)
        return x, y, z

    for part in model.parts:
        ax, ay, az = absolute(part)
        bone = {
            "name": part.name,
            # Bedrock measures up from the feet; the bench measures down.
            "pivot": [round(ax, 4), round(GROUND - ay, 4), round(az, 4)],
        }
        if part.parent != "root":
            bone["parent"] = part.parent
        rx, ry, rz = part.rot
        if rx or ry or rz:
            # Bedrock rotations are degrees, and x/y invert with the flip.
            bone["rotation"] = [round(-rx * 180.0 / math.pi, 3),
                                round(-ry * 180.0 / math.pi, 3),
                                round(rz * 180.0 / math.pi, 3)]
        cubes = []
        for b in part.boxes:
            if b.uv is None:
                continue
            ox, oy, oz = b.origin
            w, h, d = b.size
            cubes.append({
                "origin": [round(ax + ox, 4),
                           round(GROUND - (ay + oy + h), 4),
                           round(az + oz, 4)],
                "size": [round(w, 4), round(h, 4), round(d, 4)],
                "uv": [b.uv[0], b.uv[1]],
                **({"inflate": round(b.grow, 3)} if b.grow else {}),
            })
        if cubes:
            bone["cubes"] = cubes
        bones.append(bone)

    span = 0.0
    for bone in bones:
        span = max(span, abs(bone["pivot"][0]), abs(bone["pivot"][2]))
    return {
        "format_version": "1.12.0",
        "minecraft:geometry": [{
            "description": {
                "identifier": f"geometry.{name}",
                "texture_width": model.tex,
                "texture_height": model.tex,
                "visible_bounds_width": max(2.0, span / 6.0),
                "visible_bounds_height": max(2.0, span / 5.0),
                "visible_bounds_offset": [0, 1, 0],
            },
            "bones": bones,
        }],
    }


def write_geo(model: Model, name: str, path: str) -> None:
    with open(path, "w") as fh:
        json.dump(to_geo(model, name), fh, indent=1)
    print(f"{path}: {len(model.parts)} bones")


# ---------------------------------------------------------------------------
# Animation authoring
# ---------------------------------------------------------------------------

EASE = "easeInOutSine"


def key(t: float, vec, easing: str | None = EASE):
    """One keyframe. Easing is what separates an animation from a metronome."""
    if easing is None:
        return {str(round(t, 3)): [round(v, 3) for v in vec]}
    return {str(round(t, 3)): {"vector": [round(v, 3) for v in vec],
                               "easing": easing}}


def track(*frames) -> dict:
    out = {}
    for f in frames:
        out.update(f)
    return out


def animation(length: float, bones: dict, loop: bool = True) -> dict:
    return {"loop": loop, "animation_length": round(length, 3), "bones": bones}


def gait(legs: list[str], *, period: float = 0.8, swing: float = 26.0,
         body: str | None = None, head: str | None = None,
         jaw: str | None = None, bounce: float = 1.1) -> dict:
    """A four-beat walk with weight, generated rather than hand-keyed.

    Diagonal pairs move together; the body drops onto each footfall and rolls
    into the stride; the head lags that drop by a quarter period, which is
    most of what makes a walk read as heavy rather than floaty.
    """
    half = period / 2.0
    bones: dict = {}
    for i, leg in enumerate(legs):
        phase = ((i % 2) + ((i // 2) % 2)) % 2
        offset = phase * half
        bones[leg] = {"rotation": track(
            key(0.0, [swing if offset else -swing, 0, 0]),
            key(half, [-swing if offset else swing, 0, 0]),
            key(period, [swing if offset else -swing, 0, 0]),
        )}
    if body:
        bones[body] = {
            "position": track(
                key(0.0, [0, 0, 0]),
                key(period * 0.25, [0, -bounce, 0]),
                key(half, [0, 0, 0]),
                key(period * 0.75, [0, -bounce, 0]),
                key(period, [0, 0, 0]),
            ),
            "rotation": track(
                key(0.0, [0, 0, -2.5]),
                key(half, [0, 0, 2.5]),
                key(period, [0, 0, -2.5]),
            ),
        }
    if head:
        bones[head] = {"rotation": track(
            key(0.0, [3.5, 0, 0]),
            key(period * 0.5, [-3.5, 0, 0]),
            key(period, [3.5, 0, 0]),
        )}
    if jaw:
        bones[jaw] = {"rotation": track(
            key(0.0, [12, 0, 0]),
            key(period * 0.5, [22, 0, 0]),
            key(period, [12, 0, 0]),
        )}
    return animation(period, bones)


def strike(head: str | None, arms: list[str], *, length: float = 0.85,
           jaw: str | None = None, body: str | None = None) -> dict:
    """Coil, snap, overshoot, settle.

    The snap occupies about a fifth of the coil's time and the recovery
    overshoots before settling. That asymmetry is the entire difference
    between a hit that lands and a limb waving.
    """
    coil, hit, over = length * 0.42, length * 0.55, length * 0.78
    bones: dict = {}
    for arm in arms:
        bones[arm] = {"rotation": track(
            key(0.0, [0, 0, 0]),
            key(coil, [34, 0, 0]),
            key(hit, [-72, 0, 0], easing="easeOutQuart"),
            key(over, [10, 0, 0]),
            key(length, [0, 0, 0]),
        )}
    if head:
        bones[head] = {"rotation": track(
            key(0.0, [0, 0, 0]),
            key(coil, [16, 0, 0]),
            key(hit, [-26, 0, 0], easing="easeOutQuart"),
            key(length, [0, 0, 0]),
        )}
    if jaw:
        bones[jaw] = {"rotation": track(
            key(0.0, [14, 0, 0]),
            key(coil, [46, 0, 0]),
            key(hit, [6, 0, 0], easing="easeOutQuart"),
            key(length, [14, 0, 0]),
        )}
    if body:
        bones[body] = {"position": track(
            key(0.0, [0, 0, 0]),
            key(coil, [0, 0, 1.2]),
            key(hit, [0, 0, -2.4], easing="easeOutQuart"),
            key(length, [0, 0, 0]),
        )}
    return animation(length, bones, loop=False)


def breathe(body: str, *, length: float = 4.0, depth: float = 0.55,
            extra: dict | None = None) -> dict:
    """Idle. Nothing in this mod should ever stand perfectly still."""
    bones = {body: {"position": track(
        key(0.0, [0, 0, 0]),
        key(length * 0.5, [0, -depth, 0]),
        key(length, [0, 0, 0]),
    )}}
    if extra:
        bones.update(extra)
    return animation(length, bones)


def write_animations(path: str, animations: dict) -> None:
    with open(path, "w") as fh:
        json.dump({"format_version": "1.8.0", "animations": animations}, fh, indent=1)
    print(f"{path}: {len(animations)} animations")
