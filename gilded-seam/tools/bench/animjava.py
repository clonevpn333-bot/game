"""Emit bench animations as Java the game will actually play.

The bench has been producing `.animation.json` for GeckoLib, and the mod does
not use GeckoLib - so every solved gait, every death, every travelling wave
down a tentacle has been shipping in the jar and doing nothing. What renders is
vanilla's own keyframe system: `AnimationDefinition.bake(root)` gives a
`KeyframeAnimation` you `apply(state, ageInTicks)`.

This writes that. One class per shipped creature, holding the animations it
has, as compact rows parsed by `com.gildedseam.client.anim.Anims`. See that
class for why the keyframes are strings rather than `new Keyframe(...)` calls:
a solved quadruped walk is eight hundred keyframes and would put the static
initialiser well past the JVM's per-method size limit.

    from animjava import write_java_animations
    write_java_animations("gilded_cow", anims, out_dir)
"""

from __future__ import annotations

import os

# Rotations under this many degrees, and positions under this many sixteenths,
# are not visible on a creature a few blocks away - but they still cost a
# keyframe each in a file that has thousands. A channel whose entire range is
# below the threshold is dropped completely.
DEAD_ROT = 0.35
DEAD_POS = 0.06

# Java string constants are capped at 64 KB of UTF-8, so rows are grouped into
# arguments well under that. `;` separates rows inside a group: it cannot occur
# in a bone name or a number, where `|` is already the field separator.
ROW_CHARS = 900
ROW_SEP = ";"


def _class_name(shipped: str) -> str:
    return "".join(p.capitalize() for p in shipped.split("_")) + "Animations"


def _const(name: str) -> str:
    return name.rsplit(".", 1)[-1].upper()


def _rows(anim: dict) -> list[str]:
    """One row per bone and channel, shortest first so diffs stay readable."""
    out: list[str] = []
    for bone, channels in sorted(anim.get("bones", {}).items()):
        for channel, frames in sorted(channels.items()):
            if channel not in ("rotation", "position"):
                continue
            tag = "r" if channel == "rotation" else "p"
            dead = DEAD_ROT if tag == "r" else DEAD_POS
            ordered = sorted(frames.items(), key=lambda kv: float(kv[0]))
            span = 0.0
            for _, body in ordered:
                span = max(span, max(abs(v) for v in body["vector"]))
            if span < dead:
                continue
            cells = []
            for time, body in ordered:
                vec = ",".join(_num(v) for v in body["vector"])
                mark = "!" if body.get("easing") == "linear" else ""
                cells.append(f"{mark}{_time(float(time))}={vec}")
            out.append(f"{bone}|{tag}|" + "|".join(cells))
    return out


def _num(value: float) -> str:
    """Two decimals is a fortieth of a degree; more is just file size."""
    text = f"{round(float(value), 2):.2f}".rstrip("0").rstrip(".")
    return text if text not in ("", "-0") else "0"


def _time(value: float) -> str:
    """Three decimals on times, because two is not enough.

    A thirty-sample loop half a second long puts keyframes seventeen
    milliseconds apart; rounded to hundredths, adjacent frames collide and one
    of them silently replaces the other.
    """
    text = f"{round(float(value), 3):.3f}".rstrip("0").rstrip(".")
    return text if text not in ("", "-0") else "0"


def _java_string(text: str) -> str:
    return '"' + text.replace("\\", "\\\\").replace('"', '\\"') + '"'


def _chunk(rows: list[str]) -> list[list[str]]:
    """Groups rows into arguments short enough to stay well under the cap."""
    groups: list[list[str]] = [[]]
    size = 0
    for row in rows:
        if size + len(row) > ROW_CHARS and groups[-1]:
            groups.append([])
            size = 0
        groups[-1].append(row)
        size += len(row)
    return [g for g in groups if g]


def write_java_animations(shipped: str, anims: dict, out_dir: str,
                          package: str = "com.gildedseam.client.anim.gen") -> str:
    """Writes `<Shipped>Animations.java` and returns the path."""
    cls = _class_name(shipped)
    lines = [
        f"package {package};",
        "",
        "import net.minecraft.client.animation.AnimationDefinition;",
        "",
        "import com.gildedseam.client.anim.Anims;",
        "",
        "/**",
        f" * Generated from tools/bench for {shipped}. Do not edit by hand:",
        " * `python3 tools/bench/gen_geo.py` overwrites this file.",
        " *",
        " * <p>The keyframes are solved rather than posed - gaits come out of an",
        " * IK solver told the limb lengths measured off this creature's own",
        " * geometry, which is why no two species walk alike without anyone",
        " * having tuned them separately.",
        " */",
        f"public final class {cls} {{",
        "",
    ]
    kinds: set[str] = set()
    for name, anim in sorted(anims.items()):
        rows = _rows(anim)
        if not rows:
            continue
        kinds.add(_const(name))
        length = float(anim.get("animation_length", 1.0))
        loop = "true" if anim.get("loop") else "false"
        groups = _chunk(rows)
        lines.append(f"    public static final AnimationDefinition "
                     f"{_const(name)} = Anims.parse({length:.3f}F, {loop},")
        for i, group in enumerate(groups):
            joined = ROW_SEP.join(group)
            tail = "," if i < len(groups) - 1 else ");"
            lines.append(f"            {_java_string(joined)}{tail}")
        lines.append("")
    lines += [
        f"    private {cls}() {{",
        "    }",
        "}",
        "",
    ]
    os.makedirs(out_dir, exist_ok=True)
    path = os.path.join(out_dir, f"{cls}.java")
    with open(path, "w") as fh:
        fh.write("\n".join(lines))
    return path, kinds


def write_index(shipped_names: list[str], out_dir: str,
                package: str = "com.gildedseam.client.anim.gen") -> str:
    """Writes the lookup a model uses to find its own animations.

    One generated class per creature keeps each file readable and each static
    initialiser small, but a model constructed with a species *name* cannot
    reach a class by name without reflection. So the index is generated too:
    a switch from the registry path to the definitions that belong to it.
    """
    lines = [
        f"package {package};",
        "",
        "import org.jetbrains.annotations.Nullable;",
        "",
        "import net.minecraft.client.animation.AnimationDefinition;",
        "",
        "/**",
        " * Generated index of the animations in this package.",
        " * `python3 tools/bench/gen_geo.py` overwrites this file.",
        " *",
        " * <p>A null field means that creature has no animation of that kind -",
        " * the Creaking has no death because it never stood up, and the abstracts",
        " * that do not walk have no walk. Callers check rather than assume.",
        " */",
        "public record GenAnimations(",
        "        @Nullable AnimationDefinition idle,",
        "        @Nullable AnimationDefinition walk,",
        "        @Nullable AnimationDefinition run,",
        "        @Nullable AnimationDefinition attack,",
        "        @Nullable AnimationDefinition death,",
        "        @Nullable AnimationDefinition rise) {",
        "",
        "    /** Null when nothing was generated for this creature. */",
        "    @Nullable",
        "    public static GenAnimations of(String name) {",
        "        return switch (name) {",
    ]
    for shipped, kinds in sorted(shipped_names):
        cls = _class_name(shipped)
        slots = []
        for kind in ("IDLE", "WALK", "RUN", "ATTACK", "DEATH", "RISE"):
            slots.append(f"{cls}.{kind}" if kind in kinds else "null")
        lines.append(f'            case "{shipped}" -> new GenAnimations(')
        lines.append("                    " + ", ".join(slots) + ");")
    lines += [
        "            default -> null;",
        "        };",
        "    }",
        "}",
        "",
    ]
    os.makedirs(out_dir, exist_ok=True)
    path = os.path.join(out_dir, "GenAnimations.java")
    with open(path, "w") as fh:
        fh.write("\n".join(lines))
    return path
