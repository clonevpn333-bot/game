"""AmberBench - a model compiler for Minecraft entity geometry.

This is the project's answer to authoring models by hand in Blockbench: a
declarative Python DSL that is strictly more expressive than the vanilla
`CubeListBuilder` chain, plus a compiler that lowers it to the Java the game
actually wants.

What it gives you over hand-written LayerDefinitions:

  * **Per-box rotation.** Vanilla can only rotate a *part*, so organic shapes
    normally need one PartDefinition per angled cube, hand-nested. Here a box
    carries its own `rot`/`pivot` and the compiler hoists it into a synthetic
    part automatically (`lower()`), exactly the way Blockbench exports.
  * **Symmetry.** `mirror()` reflects a whole limb tree across X, so paired
    anatomy is authored once.
  * **Chains.** `chain()` builds tapering multi-segment limbs, tentacles and
    spines with per-segment curl, which is what makes a creature read as
    *grown* rather than *assembled*.
  * **Rings / radial arrays.** `radial()` places N copies around an axis, for
    haloes, rib cages and crowns.
  * **Auto texture sizing.** The UV packer tries 32/64/128/256 and picks the
    first that fits, so geometry edits never silently overflow the sheet.
  * **One source of truth.** The same compiled tree feeds the Java emitter,
    the texture painter, the software renderer and the WebGL viewer, so the
    model you look at is provably the model the game builds.

Model space matches Minecraft: +x right, +y DOWN, +z back; 1 unit = 1/16 block.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field, replace

Vec = tuple[float, float, float]

D = math.pi / 180.0  # degrees -> radians, for readable authoring


@dataclass
class Box:
    """One cube. `rot` (radians, about `pivot`) is compiled away by lower()."""

    origin: Vec  # min corner, relative to the owning part's pivot
    size: Vec
    mat: str = "bark"
    grow: float = 0.0
    rot: Vec | None = None
    pivot: Vec | None = None
    uv: tuple[int, int] | None = None

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
    parent: str = "root"
    pivot: Vec = (0.0, 0.0, 0.0)
    rot: Vec = (0.0, 0.0, 0.0)
    boxes: list[Box] = field(default_factory=list)

    def child(self, name: str, pivot: Vec, rot: Vec = (0.0, 0.0, 0.0),
              boxes: list[Box] | None = None) -> "Part":
        return Part(name, self.name, pivot, rot, boxes or [])


@dataclass
class Model:
    name: str
    parts: list[Part]
    tex: int = 0  # 0 = choose automatically

    def part_map(self) -> dict[str, Part]:
        return {p.name: p for p in self.parts}

    def children_of(self, name: str) -> list[Part]:
        return [p for p in self.parts if p.parent == name]

    def find(self, name: str) -> Part:
        for p in self.parts:
            if p.name == name:
                return p
        raise KeyError(f"{self.name}: no part {name!r}")


# ---------------------------------------------------------------------------
# Authoring helpers
# ---------------------------------------------------------------------------


def box(origin: Vec, size: Vec, mat: str = "bark", grow: float = 0.0,
        rot: Vec | None = None, pivot: Vec | None = None) -> Box:
    return Box(origin, size, mat, grow, rot, pivot)


def centered(size: Vec, mat: str = "bark", y: float = 0.0, z: float = 0.0,
             **kw) -> Box:
    """A box centred on the part's x axis, hanging from (0, y, z)."""
    w, h, d = size
    return Box((-w / 2.0, y, z - d / 2.0), size, mat, **kw)


def mirror(parts: list[Part], src: str, dst: str,
           keep_parent: bool = True) -> list[Part]:
    """Reflects every part whose name starts with `src` across the X axis.

    Names are rewritten src->dst (so `arm_r/...` becomes `arm_l/...`) and both
    the pivots and the box origins are flipped, which is how you get true
    bilateral symmetry without authoring the second side by hand.
    """
    out: list[Part] = []
    renamed = {p.name: p.name.replace(src, dst, 1) for p in parts
               if p.name.startswith(src)}
    for part in parts:
        if not part.name.startswith(src):
            continue
        px, py, pz = part.pivot
        rx, ry, rz = part.rot
        parent = part.parent
        if parent in renamed:
            parent = renamed[parent]
        elif not keep_parent:
            parent = "root"
        boxes = []
        for b in part.boxes:
            ox, oy, oz = b.origin
            w, h, d = b.size
            nrot = None
            npiv = None
            if b.rot is not None:
                brx, bry, brz = b.rot
                nrot = (brx, -bry, -brz)
            if b.pivot is not None:
                vx, vy, vz = b.pivot
                npiv = (-vx, vy, vz)
            boxes.append(replace(b, origin=(-ox - w, oy, oz), rot=nrot,
                                 pivot=npiv, uv=None))
        out.append(Part(renamed[part.name], parent, (-px, py, pz),
                        (rx, -ry, -rz), boxes))
    return out


def chain(name: str, parent: str, pivot: Vec, segments: int,
          size: Vec, mat: str = "bark", taper: float = 0.82,
          length: float | None = None, curl: Vec = (0.0, 0.0, 0.0),
          root_rot: Vec = (0.0, 0.0, 0.0), grow: float = 0.0) -> list[Part]:
    """A tapering multi-segment limb: `name`, `name_1`, `name_2`, ...

    Each link hangs off the end of the one before it and adds `curl`, so a
    tentacle, a spine or a finger is one call instead of six nested parts.
    """
    w, h, d = size
    seg_len = length if length is not None else h
    parts: list[Part] = []
    for i in range(segments):
        scale = taper ** i
        sw, sd = max(1.0, w * scale), max(1.0, d * scale)
        sh = seg_len * (taper ** (i * 0.5))
        pname = name if i == 0 else f"{name}_{i}"
        pparent = parent if i == 0 else (name if i == 1 else f"{name}_{i - 1}")
        ppivot = pivot if i == 0 else (0.0, prev_h, 0.0)
        prot = root_rot if i == 0 else curl
        parts.append(Part(pname, pparent, ppivot, prot,
                          [Box((-sw / 2.0, 0.0, -sd / 2.0), (sw, sh, sd), mat,
                               grow=grow)]))
        prev_h = sh
    return parts


def radial(count: int, radius: float, make, y: float = 0.0,
           phase: float = 0.0, tilt: float = 0.0) -> list[Part]:
    """Places `count` sub-trees evenly around the Y axis.

    `make(i, angle, x, z)` returns the parts for one spoke; used for haloes of
    rings, rib cages, crowns and radial limb sets.
    """
    out: list[Part] = []
    for i in range(count):
        a = phase + (2.0 * math.pi * i) / count
        out.extend(make(i, a, math.sin(a) * radius, math.cos(a) * radius))
    return out


def torus(name: str, parent: str, pivot: Vec, radius: float, segments: int,
          thickness: float = 1.0, mat: str = "amber",
          rot: Vec = (0.0, 0.0, 0.0)) -> list[Part]:
    """A ring built from `segments` chords - the Sovereign's floating haloes."""
    hub = Part(name, parent, pivot, rot, [])
    parts = [hub]
    chord = 2.0 * radius * math.sin(math.pi / segments) + 0.6
    for i in range(segments):
        a = (2.0 * math.pi * i) / segments
        parts.append(Part(f"{name}_s{i}", name,
                          (math.sin(a) * radius, 0.0, math.cos(a) * radius),
                          (0.0, -a, 0.0),
                          [Box((-chord / 2.0, -thickness / 2.0, -thickness / 2.0),
                               (chord, thickness, thickness), mat)]))
    return parts


# ---------------------------------------------------------------------------
# Lowering: rotated boxes -> synthetic parts
# ---------------------------------------------------------------------------


def lower(model: Model) -> Model:
    """Rewrites per-box rotations into real parts the game can build."""
    parts: list[Part] = []
    for part in model.parts:
        plain: list[Box] = []
        extra: list[Part] = []
        for i, b in enumerate(part.boxes):
            if b.rot is None:
                plain.append(b)
                continue
            piv = b.pivot if b.pivot is not None else b.origin
            ox, oy, oz = b.origin
            vx, vy, vz = piv
            extra.append(Part(f"{part.name}__r{i}", part.name, piv, b.rot,
                              [replace(b, origin=(ox - vx, oy - vy, oz - vz),
                                       rot=None, pivot=None)]))
        parts.append(replace(part, boxes=plain))
        parts.extend(extra)
    return Model(model.name, parts, model.tex)


def tier_of(model: Model, part_name: str) -> int:
    """Mutation tier a part belongs to, from `mut1_`/`mut2_` name prefixes.

    Children inherit their parent's tier, so an eye cluster grown on a
    stage-2 arm disappears with the arm.
    """
    pm = model.part_map()
    tier = 0
    node = pm.get(part_name)
    while node is not None:
        stem = node.name.split("__r")[0]
        if stem.startswith("mut1_"):
            tier = max(tier, 1)
        elif stem.startswith("mut2_"):
            tier = max(tier, 2)
        node = pm.get(node.parent)
    return tier


# ---------------------------------------------------------------------------
# UV packing
# ---------------------------------------------------------------------------

TEX_SIZES = (32, 64, 128, 256, 512)


def pack_uvs(model: Model, padding: int = 1) -> int:
    """Shelf-packs every box and picks the smallest texture that fits."""
    boxes = [b for p in model.parts for b in p.boxes]
    boxes.sort(key=lambda b: (-b.uv_extent()[1], -b.uv_extent()[0]))
    candidates = [model.tex] if model.tex else TEX_SIZES
    for size in candidates:
        x = y = shelf = 0
        ok = True
        for b in boxes:
            w, h = b.uv_extent()
            if w > size:
                ok = False
                break
            if x + w > size:
                x = 0
                y += shelf + padding
                shelf = 0
            if y + h > size:
                ok = False
                break
            b.uv = (x, y)
            x += w + padding
            shelf = max(shelf, h)
        if ok:
            model.tex = size
            return size
        for b in boxes:
            b.uv = None
    raise ValueError(f"{model.name}: geometry does not fit {candidates[-1]}px")


def face_rects(b: Box) -> dict[str, tuple[int, int, int, int]]:
    w, h, d = b.isize
    u, v = b.uv
    return {
        "top": (u + d, v, w, d),
        "bottom": (u + d + w, v, w, d),
        "right": (u, v + d, d, h),
        "front": (u + d, v + d, w, h),
        "left": (u + d + w, v + d, d, h),
        "back": (u + d + w + d, v + d, w, h),
    }


# ---------------------------------------------------------------------------
# Java emission
# ---------------------------------------------------------------------------


def _f(v: float) -> str:
    t = f"{v:.4f}".rstrip("0").rstrip(".")
    if "." not in t:
        t += ".0"
    return t + "F"


def _var(name: str) -> str:
    bits = name.replace("__r", "_r").split("_")
    return bits[0] + "".join(s.capitalize() for s in bits[1:])


def emit_java(model: Model) -> str:
    """Emits the body of a createBodyLayer() for the lowered model."""
    lines = ["        MeshDefinition mesh = new MeshDefinition();",
             "        PartDefinition root = mesh.getRoot();", ""]
    seen = {"root": "root"}

    def emit(part: Part) -> None:
        cubes = []
        for b in part.boxes:
            u, v = b.uv
            ox, oy, oz = b.origin
            w, h, d = b.size
            grow = f", new CubeDeformation({_f(b.grow)[:-1]}F)" if b.grow else ""
            cubes.append(f".texOffs({u}, {v}).addBox({_f(ox)}, {_f(oy)}, {_f(oz)}, "
                         f"{_f(w)}, {_f(h)}, {_f(d)}{grow})")
        chain_src = "CubeListBuilder.create()" + "".join(
            "\n                        " + c for c in cubes)
        px, py, pz = part.pivot
        rx, ry, rz = part.rot
        if rx or ry or rz:
            pose = (f"PartPose.offsetAndRotation({_f(px)}, {_f(py)}, {_f(pz)}, "
                    f"{_f(rx)}, {_f(ry)}, {_f(rz)})")
        else:
            pose = f"PartPose.offset({_f(px)}, {_f(py)}, {_f(pz)})"
        var = _var(part.name)
        lines.append(f"        PartDefinition {var} = {seen[part.parent]}"
                     f".addOrReplaceChild(\"{part.name}\",")
        lines.append(f"                {chain_src},")
        lines.append(f"                {pose});")
        seen[part.name] = var
        for ch in model.children_of(part.name):
            emit(ch)

    for p in model.children_of("root"):
        emit(p)
    lines.append("")
    lines.append(f"        return LayerDefinition.create(mesh, {model.tex}, {model.tex});")
    return "\n".join(lines)


def stats(model: Model) -> str:
    boxes = sum(len(p.boxes) for p in model.parts)
    return f"{model.name:24s} parts={len(model.parts):3d} boxes={boxes:3d} tex={model.tex}"
