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

# How close two absolute positions have to be to count as the same point. The
# dump carries three decimal places; anything under half a hundredth of a pixel
# is rounding, not geometry.
TOL = 0.005


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

    # Resolving a parent by position is why limbs came off their bodies. When a
    # bone's parent was one of the skipped structural groups (a hare's
    # `backlegs`, a chicken's overlay), nothing matched and the limb silently
    # fell back to `root` - so it floated exactly where it had been but no
    # longer moved with the animal.
    #
    # Every bone is matched against *all* bones now, skipped ones included, and
    # a skipped parent is flattened away properly: the child inherits its
    # grandparent and absorbs the skipped bone's offset. Falling back to root
    # is a bug, not a default, so it says so.
    everything = {b["name"]: b for b in bones if b["name"] != "root"}

    def resolve(bone):
        """Returns (parent name, extra offset to absorb)."""
        want = tuple(bone["abs"][i] - bone["offset"][i] for i in range(3))
        if max(abs(v) for v in want) < TOL:
            return "root", (0.0, 0.0, 0.0)
        best = None
        for cand_name, cand in everything.items():
            if cand_name == bone["name"]:
                continue
            # The dump rounds to three places, so subtracting an offset back
            # off an absolute position lands *near* the parent rather than on
            # it - a hare's tail missed its body by a thousandth and fell all
            # the way back to root. Match within a tolerance, not exactly.
            if max(abs(cand["abs"][i] - want[i]) for i in range(3)) >= TOL:
                continue
            # Prefer a parent that survived; a deeper one is more specific.
            if best is None or (cand_name in kept and best not in kept):
                best = cand_name
        if best is None:
            return "root", (0.0, 0.0, 0.0)
        carry = (0.0, 0.0, 0.0)
        # Walk up through dropped ancestors, folding their offsets in.
        guard = 0
        while best not in kept and guard < 16:
            guard += 1
            up = everything[best]
            carry = tuple(carry[i] + up["offset"][i] for i in range(3))
            nxt, extra = resolve(up)
            carry = tuple(carry[i] + extra[i] for i in range(3))
            best = nxt
            if best == "root":
                return "root", carry
        return rename.get(best, best), carry

    parts: list[Part] = []
    for name, bone in kept.items():
        out_name = rename.get(name, name)
        if name == root_at:
            parent, carry = "root", (0.0, 0.0, 0.0)
        else:
            parent, carry = resolve(bone)
        if parent == out_name:
            parent, carry = "root", (0.0, 0.0, 0.0)
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
        pivot = tuple(float(bone["offset"][i]) + carry[i] for i in range(3))
        parts.append(Part(out_name, parent, pivot, rot, boxes))
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
    # A leg bone need not carry its own geometry: vanilla's hare hangs the meat
    # on a `haunch` child of each hind leg, so the bone the gait wants to drive
    # is empty and the shape that should move with it is one level down. Fold
    # such a child up into its leg before cutting anything, taking its offset
    # into the box origins and its rotation onto the leg.
    kids: dict[str, list[Part]] = {}
    for part in parts:
        kids.setdefault(part.parent, []).append(part)
    folded: set[str] = set()
    merged: dict[str, Part] = {}
    for name in legs:
        host = next((p for p in parts if p.name == name), None)
        if host is None or host.boxes:
            continue
        donors = [k for k in kids.get(name, []) if k.boxes]
        if len(donors) != 1:
            continue
        donor = donors[0]
        folded.add(donor.name)
        merged[name] = Part(name, host.parent, host.pivot,
                            host.rot if any(host.rot) else donor.rot,
                            [Box(tuple(b.origin[i] + donor.pivot[i] for i in range(3)),
                                 b.size, b.mat, grow=b.grow) for b in donor.boxes])

    out: list[Part] = []
    renamed: dict[str, str] = {}
    for part in parts:
        if part.name in folded:
            continue
        part = merged.get(part.name, part)
        tag = legs.get(part.name)
        if tag is None:
            out.append(part)
            continue
        # A leg shorter than a few pixels is a foot pad, not a limb - a hare's
        # hind foot is one unit tall. It just takes the name and stays whole,
        # which the gait solver copes with: `measure_limbs` falls back to the
        # box height when a chain has no joints in it.
        box = part.boxes[0] if part.boxes else None
        if box is None or box.size[1] < 6.0:
            renamed[part.name] = f"leg_{tag}"
            out.append(Part(f"leg_{tag}", part.parent, part.pivot, part.rot,
                            part.boxes))
            continue
        ox, oy, oz = box.origin
        lw, lh, ld = box.size
        is_hind = part.name in hind
        thigh_h = lh * (0.40 if is_hind else 0.44)
        shank_h = lh * (0.42 if is_hind else 0.38)
        foot_h = lh - thigh_h - shank_h
        narrow = max(1.2, lw - 0.7)
        inset = (lw - narrow) / 2.0
        # The box does not have to start at the pivot: a goat's hind leg box
        # begins four units down. Hanging the shank at `thigh_h` rather than
        # `oy + thigh_h` slid it up into the thigh and left the foot floating
        # inside the shin, which is a large part of why the smaller animals
        # looked like they had come apart.
        renamed[part.name] = f"leg_{tag}"
        out.append(Part(f"leg_{tag}", part.parent, part.pivot, part.rot,
                        [Box((ox, oy, oz), (lw, thigh_h, ld), box.mat)]))
        out.append(Part(f"leg_{tag}_1", f"leg_{tag}", (0.0, oy + thigh_h, 0.0),
                        (0, 0, 0),
                        [Box((ox + inset, 0.0, oz + 0.2), (narrow, shank_h, ld - 0.4),
                             box.mat)]))
        out.append(Part(f"foot_{tag}", f"leg_{tag}_1", (0.0, shank_h, 0.0), (0, 0, 0),
                        [Box((ox, 0.0, oz - 0.4), (lw, foot_h, ld + 0.6),
                             hoof or box.mat)]))
    if renamed:
        out = [Part(p.name, renamed.get(p.parent, p.parent), p.pivot, p.rot, p.boxes)
               for p in out]
    return out


def unrotate(parts: list[Part], names: tuple = ("body",)) -> list[Part]:
    """Splits a rotated bone into an unrotated hinge and a rotated shell.

    Vanilla quadrupeds carry a 90-degree x-rotation on the body: the box is
    modelled standing up and then laid down. That is fine while nothing hangs
    off it - but hang the head there so it follows the gait, and the head
    inherits the ninety degrees and ends up somewhere it should never be. This
    is why heads came out on the wrong side of their animals.

    So the bone is split. `body` keeps the pivot and loses the rotation, and a
    child `body_shell` keeps the rotation and carries the cubes. At rest the
    result is pixel-identical; the difference is that anything parented to
    `body` now inherits position without inheriting the lie-down.

    Bones vanilla *already* hung off the body move down onto the shell, so they
    keep the exact transform they had in the game - a fox's tail is a child of
    the fox's body and is modelled expecting that ninety degrees. Only the
    parts this toolchain re-hangs afterwards (see `reparent`) end up on the
    rotation-free hinge, which is the whole point of having one.
    """
    split = {p.name for p in parts if p.name in names and any(p.rot)}
    if not split:
        return list(parts)
    out: list[Part] = []
    for part in parts:
        if part.name in split:
            out.append(Part(part.name, part.parent, part.pivot, (0.0, 0.0, 0.0), []))
            out.append(Part(f"{part.name}_shell", part.name, (0.0, 0.0, 0.0),
                            part.rot, part.boxes))
        elif part.parent in split:
            out.append(Part(part.name, f"{part.parent}_shell", part.pivot,
                            part.rot, part.boxes))
        else:
            out.append(part)
    return out


def flatten(parts: list[Part], names: tuple = ()) -> list[Part]:
    """Zeroes the rest rotation on named bones.

    A couple of vanilla rigs bake a *pose* into the rest position and undo it
    in `setupAnim` - the goat's `nose`, which carries the whole skull, sits at
    fifty-five degrees so the ram animation has somewhere to come from. Read
    straight out of the mesh with nothing driving it, that skull stands on end
    and the goat reads as a slab with no face. Nothing here replays
    `setupAnim`, so the pose is dropped and the bone points where the animal
    does.
    """
    if not names:
        return list(parts)
    return [Part(p.name, p.parent, p.pivot, (0.0, 0.0, 0.0), p.boxes)
            if p.name in names else p for p in parts]


def reparent(parts: list[Part], moves: dict[str, str]) -> list[Part]:
    """Hangs parts off a new parent, keeping them exactly where they were.

    Vanilla rigs are mostly *flat*: the head, the body and every leg are all
    children of root, animated independently. That is fine for vanilla, which
    barely translates the body - but this mod's gait drops and rolls the body
    by a couple of units every stride, and a head that is only a sibling stays
    behind. That is the "limbs coming off the body" you see.

    So the head and tail are hung under the body after ingestion. The pivot is
    rebased by the difference in absolute position, so nothing moves at rest;
    it only changes what follows what once something animates.

    Only bones still hanging off `root` are moved. Where vanilla already put
    the head under the body - the hare is hunched, so it does - that rig is
    already right and re-hanging it would only undo the modeller's work.
    """
    absolute: dict[str, tuple] = {}
    by_name = {p.name: p for p in parts}

    def abs_of(name: str, guard: int = 0) -> tuple:
        if name == "root" or name not in by_name or guard > 16:
            return (0.0, 0.0, 0.0)
        if name in absolute:
            return absolute[name]
        part = by_name[name]
        up = abs_of(part.parent, guard + 1)
        absolute[name] = tuple(up[i] + part.pivot[i] for i in range(3))
        return absolute[name]

    out = []
    for part in parts:
        target = moves.get(part.name)
        if target is None or target not in by_name or part.parent != "root":
            out.append(part)
            continue
        here = abs_of(part.name)
        there = abs_of(target)
        out.append(Part(part.name, target,
                        tuple(here[i] - there[i] for i in range(3)),
                        part.rot, part.boxes))
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
