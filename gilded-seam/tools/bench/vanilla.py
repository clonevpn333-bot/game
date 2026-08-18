"""Build bench parts directly from dumped vanilla geometry.

The mod's rule is that an infected cow must still read as a cow, and the surest
way to honour that is to stop re-typing the cow. `tools/oracle/DumpModels.java`
runs in CI, calls each vanilla model's `createBodyLayer()`, walks the mesh and
writes every bone and cube to JSON. This module turns that JSON into bench
`Part`s, so a host is the *actual* vanilla skeleton with materials painted onto
it - not an approximation of one.

Both spaces already agree: vanilla entity models and the bench both measure in
sixteenths with +y down and the ground plane at y = 24, and `PartPose` stores
rotations in radians exactly as `Part` does. So the conversion is a
transcription with no arithmetic in it, which is the point - arithmetic is
where the cow stops being a cow.

    from vanilla import vanilla_host
    parts = vanilla_host("CowModel", mats={"*": "cow_hide", "head": "cow_white"})
"""

from __future__ import annotations

import json
import os

from core import Box, Part

HERE = os.path.dirname(os.path.abspath(__file__))
DUMP = os.path.normpath(os.path.join(HERE, "..", "oracle", "vanilla-models.json"))

_CACHE: dict | None = None


def load(path: str | None = None) -> dict:
    """Reads the dump, keyed by simple class name (``CowModel``)."""
    global _CACHE
    if _CACHE is not None and path is None:
        return _CACHE
    target = path or DUMP
    if not os.path.exists(target):
        raise FileNotFoundError(
            f"{target} missing - it is produced by the 'Dump vanilla model "
            f"geometry' step in CI and committed back to the branch.")
    with open(target) as fh:
        raw = json.load(fh)["models"]
    out = {}
    for full_name, body in raw.items():
        out[full_name.rsplit(".", 1)[-1]] = body
    if path is None:
        _CACHE = out
    return out


def available() -> list[str]:
    try:
        return sorted(load())
    except FileNotFoundError:
        return []


def _material(name: str, mats: dict[str, str]) -> str:
    """Longest-matching key wins, so ``head`` can override ``*``."""
    best, best_len = mats.get("*", "hide"), -1
    for key, value in mats.items():
        if key == "*":
            continue
        if (name == key or name.startswith(key)) and len(key) > best_len:
            best, best_len = value, len(key)
    return best


def vanilla_host(model: str, *, mats: dict[str, str], skip: tuple = (),
                 rename: dict[str, str] | None = None,
                 root_at: str | None = None,
                 dump: dict | None = None) -> list[Part]:
    """Transcribes a dumped vanilla model into bench parts.

    `mats` maps bone-name prefixes to bench materials; `*` is the fallback.
    `skip` drops bones by prefix - vanilla carries overlay layers (a `hat`
    duplicating the head, wool over a sheep) that would z-fight once the same
    geometry is textured once rather than twice.
    `rename` maps vanilla bone names onto the names the rest of this toolchain
    expects, so the animation engine keeps finding `head`, `body` and `leg_*`.
    """
    models = dump if dump is not None else load()
    if model not in models:
        raise KeyError(f"{model} not in the dump; have: {', '.join(sorted(models))}")
    body = models[model]
    if "error" in body:
        raise ValueError(f"{model}: {body['error']}")

    rename = dict(rename or {})
    bones = body["bones"]
    kept = {}
    for bone in bones:
        name = bone["name"]
        if name == "root":
            continue
        if any(name == s or name.startswith(s) for s in skip):
            continue
        kept[name] = bone

    # Vanilla nests through structural bones ("bone", "root") that carry no
    # cubes. Those are kept when something hangs off them and dropped when the
    # dump flattened them away, so parents always resolve.
    def parent_of(bone) -> str:
        # The dump records absolute positions, so a bone's parent is whichever
        # kept bone its offset was measured against.
        want = tuple(round(bone["abs"][i] - bone["offset"][i], 4) for i in range(3))
        for cand_name, cand in kept.items():
            if cand_name == bone["name"]:
                continue
            if tuple(round(v, 4) for v in cand["abs"]) == want:
                return rename.get(cand_name, cand_name)
        return "root"

    parts: list[Part] = []
    for name, bone in kept.items():
        out_name = rename.get(name, name)
        parent = "root" if name == root_at else parent_of(bone)
        if parent == out_name:
            parent = "root"
        rot = tuple(bone.get("rot", (0.0, 0.0, 0.0)))
        boxes = []
        for cube in bone.get("cubes", []):
            origin = cube.get("origin")
            dims = cube.get("dimensions")
            if origin is None or dims is None:
                continue
            # Vanilla ships zero-thickness quads (tendrils, ribcage plates,
            # wings). A flat box has no volume to texture, so give it just
            # enough to exist.
            size = tuple(max(0.6, float(d)) for d in dims)
            grow = float(cube.get("grow") or 0.0)
            boxes.append(Box(tuple(float(v) for v in origin), size,
                             _material(name, mats), grow=grow))
        parts.append(Part(out_name, parent, tuple(float(v) for v in bone["offset"]),
                          rot, boxes))
    return parts


def jointify(parts: list[Part], legs: dict[str, str], *, hind: set[str] = frozenset(),
             hoof: str | None = None) -> list[Part]:
    """Splits vanilla's single-box legs into thigh, shank and foot.

    Vanilla legs are one rigid box, which is exactly why a vanilla walk can
    only swing them from the shoulder. The bench's IK gait needs joints. This
    takes the leg bone as dumped and cuts the *same* column into three, so the
    standing silhouette is bit-for-bit the vanilla leg and the animation engine
    still has knees to bend.

    `legs` maps the vanilla bone name onto the tag this toolchain uses
    (``right_front_leg`` -> ``fr``), because the gait code looks for
    ``leg_fr``, ``leg_fr_1`` and ``foot_fr``.
    """
    out: list[Part] = []
    for part in parts:
        tag = legs.get(part.name)
        if tag is None or not part.boxes:
            out.append(part)
            continue
        box = part.boxes[0]
        ox, oy, oz = box.origin
        lw, lh, ld = box.size
        is_hind = part.name in hind
        thigh_h = lh * (0.40 if is_hind else 0.44)
        shank_h = lh * (0.42 if is_hind else 0.38)
        foot_h = lh - thigh_h - shank_h
        narrow = max(1.2, lw - 0.7)
        inset = (lw - narrow) / 2.0
        out.append(Part(f"leg_{tag}", part.parent, part.pivot, part.rot,
                        [Box((ox, oy, oz), (lw, thigh_h, ld), box.mat)]))
        out.append(Part(f"leg_{tag}_1", f"leg_{tag}", (0.0, thigh_h, 0.0), (0, 0, 0),
                        [Box((ox + inset, 0.0, oz + 0.2), (narrow, shank_h, ld - 0.4),
                             box.mat)]))
        out.append(Part(f"foot_{tag}", f"leg_{tag}_1", (0.0, shank_h, 0.0), (0, 0, 0),
                        [Box((ox, 0.0, oz - 0.4), (lw, foot_h, ld + 0.6),
                             hoof or box.mat)]))
    return out


def describe(model: str) -> str:
    """One line per bone, for eyeballing a dump before building on it."""
    body = load()[model]
    if "error" in body:
        return f"{model}: {body['error']}"
    lines = [f"{model}  texture={body.get('texture')}"]
    for bone in body["bones"]:
        cubes = bone.get("cubes", [])
        desc = "; ".join(
            f"{tuple(c.get('origin', []))}->{tuple(c.get('dimensions', []))}"
            for c in cubes)
        lines.append(f"  {bone['name']:<18} at {tuple(bone['offset'])}  {desc}")
    return "\n".join(lines)


if __name__ == "__main__":
    import sys
    names = sys.argv[1:] or available()
    if not names:
        print("no dump found at", DUMP)
    for n in names:
        print(describe(n))
