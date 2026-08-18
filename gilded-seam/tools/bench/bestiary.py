"""The creatures of the Amberblight.

Every blighted animal is `HOSTS[species].build()` - the vanilla silhouette,
untouched - plus corruption grafted on as `mut1_`/`mut2_` parts. Stage one is
a body coming apart; stage two is the blight building something new out of the
pieces: arms with fingers, tongues, eyes on stalks, pale oak growing from the
skull.
"""

from __future__ import annotations

import math

from core import D, Box, Model, Part, chain, mirror, radial, torus
from anatomy import (GROUND, HOSTS, antler_roots, chicken_host, creeper_host,
                     infected_face,
                     eye_cluster,
                     extra_legs, eye_stalks, grafted_arm, humanoid,
                     lolling_tongue, resin_growth, spider_host, spine_plates,
                     split_open)


def _m(name, parts, tex=0):
    return Model(name, parts, tex)


# ---------------------------------------------------------------------------
# The blighted farmyard - host silhouette preserved, anatomy violated
# ---------------------------------------------------------------------------


def blighted_cow() -> Model:
    p = HOSTS["cow"].build()
    # Stage 1: the flank splits, the spine erupts, the jaw unhinges.
    p += split_open("body", at=(0.0, 5.0, 1.0), width=7.0, height=6.0, tier=1,
                    name="flank")
    p += spine_plates("body", from_z=-6.0, to_z=7.0, y=0.0, count=6, tier=1,
                      height=3.4)
    p += lolling_tongue("head", at=(0.0, 6.0, -5.0), tier=1, segments=6)
    p += resin_growth("body", at=(-4.5, 3.0, -5.0), size=(4, 4, 4), tier=1)
    # Stage 2: arms it should not have, and a crown of pale oak.
    p += grafted_arm("body", at=(-6.0, 2.5, -5.0), tier=2, side=-1, scale=1.1,
                     name="arm_r")
    p += grafted_arm("body", at=(6.0, 2.5, -5.0), tier=2, side=1, scale=1.1,
                     name="arm_l")
    p += antler_roots("head", at=(-2.5, 0.5, -3.0), tier=2, side=-1, name="roots_r")
    p += antler_roots("head", at=(2.5, 0.5, -3.0), tier=2, side=1, name="roots_l")
    p += eye_stalks("body", at=(0.0, 0.5, 5.0), count=3, tier=2, spread=3.2)
    p += eye_cluster("head", at=(0.0, 3.0, -6.0), count=4, tier=1, spread=(3.2, 2.2), size=2.8)
    p += eye_cluster("body", at=(-6.2, 4.0, 3.0), count=3, tier=1, spread=(1.4, 3.0), size=2.4, out=-0.6)
    return _m("blighted_cow", p)


def blighted_pig() -> Model:
    p = HOSTS["pig"].build()
    p += split_open("body", at=(0.0, 8.0, 2.0), width=6.0, height=5.0, tier=1,
                    name="belly")
    p += lolling_tongue("head", at=(0.0, 7.0, -8.0), tier=1, segments=5, thick=1.4)
    p += resin_growth("body", at=(0.0, -0.5, 3.0), size=(5, 4, 5), tier=1)
    p += extra_legs("body", at=(-4.5, 6.0, -1.0), tier=2, count=2, length=9.0,
                    side=-1, name="legs_r")
    p += extra_legs("body", at=(4.5, 6.0, -1.0), tier=2, count=2, length=9.0,
                    side=1, name="legs_l")
    p += grafted_arm("body", at=(-5.0, 2.0, -6.0), tier=2, side=-1, scale=0.9,
                     name="arm_r")
    p += eye_stalks("head", at=(0.0, 0.0, -4.0), count=4, tier=2, spread=2.6,
                    length=2.4)
    p += eye_cluster("head", at=(0.0, 3.0, -8.2), count=5, tier=1, spread=(3.0, 2.4), size=2.6)
    return _m("blighted_pig", p)


def blighted_sheep() -> Model:
    p = HOSTS["sheep"].build()
    # The fleece keeps growing after the sheep stops.
    p += split_open("body", at=(0.0, 3.0, 3.0), width=6.0, height=5.0, tier=1,
                    name="fleecerift")
    p += spine_plates("body", from_z=-5.0, to_z=6.0, y=-1.0, count=5, tier=1,
                      height=3.0)
    p += lolling_tongue("head", at=(0.0, 5.0, -7.0), tier=1, segments=5, thick=1.3)
    p += eye_stalks("body", at=(0.0, -1.0, -4.0), count=5, tier=2, spread=3.4,
                    length=3.6)
    p += grafted_arm("body", at=(-4.5, 2.0, -4.0), tier=2, side=-1, scale=0.95,
                     name="arm_r")
    p += grafted_arm("body", at=(4.5, 2.0, -4.0), tier=2, side=1, scale=0.95,
                     name="arm_l")
    p += antler_roots("head", at=(-2.0, 0.0, -4.0), tier=2, side=-1, name="roots_r")
    p += eye_cluster("head", at=(0.0, 2.5, -8.2), count=4, tier=1, spread=(2.4, 2.0), size=2.4)
    p += eye_cluster("body", at=(0.0, -0.5, -6.0), count=4, tier=1, spread=(3.4, 1.6), size=2.6, out=-0.6)
    return _m("blighted_sheep", p)


def blighted_chicken() -> Model:
    p = chicken_host()
    # The neck keeps going.
    p += chain("mut1_neck", "body", (0.0, -3.0, -3.0), 4, (2.4, 2.2, 2.4),
               "sinew", taper=0.9, curl=(-8 * D, 0, 0), root_rot=(-16 * D, 0, 0))
    p += lolling_tongue("head", at=(0.0, 3.0, -3.0), tier=1, segments=4, thick=1.0)
    p += split_open("body", at=(0.0, 4.0, 3.0), width=4.0, height=4.0, tier=1,
                    depth=1.6, name="crop")
    p += grafted_arm("body", at=(-3.0, 2.0, -2.0), tier=2, side=-1, scale=0.7,
                     name="arm_r")
    p += grafted_arm("body", at=(3.0, 2.0, -2.0), tier=2, side=1, scale=0.7,
                     name="arm_l")
    p += eye_stalks("head", at=(0.0, 0.0, -1.0), count=3, tier=2, spread=1.8,
                    length=2.0)
    p += eye_cluster("head", at=(0.0, 2.0, -3.2), count=3, tier=1, spread=(1.6, 1.4), size=2.0)
    return _m("blighted_chicken", p)


def blighted_spider() -> Model:
    p = spider_host()
    p += split_open("abdomen", at=(0.0, 0.0, 4.0), width=7.0, height=6.0, tier=1,
                    name="sac")
    p += lolling_tongue("head", at=(0.0, 2.0, -7.0), tier=1, segments=5, thick=1.2)
    p += resin_growth("abdomen", at=(0.0, -4.5, 0.0), size=(5, 4, 6), tier=1)
    for i, side in ((0, -1), (1, 1)):
        p += extra_legs("abdomen", at=(side * 4.5, 0.0, 2.0), tier=2, count=2,
                        length=11.0, side=side, name=f"legs{i}")
    p += eye_stalks("head", at=(0.0, -3.5, -5.0), count=4, tier=2, spread=3.0,
                    length=2.6)
    p += eye_cluster("head", at=(0.0, -1.0, -8.2), count=6, tier=1, spread=(3.4, 2.6), size=2.4)
    return _m("blighted_spider", p)


def blighted_creeper() -> Model:
    p = creeper_host()
    # It was always going to come apart; now it does it slowly.
    p += split_open("body", at=(0.0, 6.0, -2.0), width=6.0, height=8.0, tier=1,
                    depth=2.4, name="core")
    p += resin_growth("body", at=(0.0, 6.0, 0.0), size=(4, 5, 4), tier=1,
                      name="heart")
    p += spine_plates("body", from_z=1.0, to_z=1.0, y=0.0, count=4, tier=1,
                      height=2.6)
    p += grafted_arm("body", at=(-4.0, 2.0, 0.0), tier=2, side=-1, scale=0.9,
                     name="arm_r")
    p += grafted_arm("body", at=(4.0, 2.0, 0.0), tier=2, side=1, scale=0.9,
                     name="arm_l")
    p += eye_stalks("head", at=(0.0, -8.0, -2.0), count=5, tier=2, spread=3.0,
                    length=2.2)
    p += lolling_tongue("head", at=(0.0, -1.0, -4.0), tier=2, segments=5, thick=1.2)
    p += eye_cluster("head", at=(0.0, -4.0, -4.2), count=5, tier=1, spread=(3.2, 2.6), size=2.8)
    return _m("blighted_creeper", p)


def blighted_wolf() -> Model:
    p = HOSTS["wolf"].build()
    p += split_open("body", at=(0.0, 4.0, 2.0), width=5.0, height=5.0, tier=1,
                    depth=1.8, name="ribs")
    p += lolling_tongue("head", at=(0.0, 5.0, -5.0), tier=1, segments=6, thick=1.2)
    p += spine_plates("body", from_z=-4.0, to_z=5.0, y=-0.5, count=5, tier=1,
                      height=2.8)
    p += antler_roots("head", at=(-2.0, 0.0, -3.0), tier=2, side=-1, name="roots_r")
    p += antler_roots("head", at=(2.0, 0.0, -3.0), tier=2, side=1, name="roots_l")
    p += grafted_arm("body", at=(-3.5, 2.0, -3.0), tier=2, side=-1, scale=0.85,
                     name="arm_r")
    p += grafted_arm("body", at=(3.5, 2.0, -3.0), tier=2, side=1, scale=0.85,
                     name="arm_l")
    p += eye_stalks("body", at=(0.0, -0.5, 4.0), count=3, tier=2, spread=2.4,
                    length=2.4)
    p += eye_cluster("head", at=(0.0, 2.0, -6.2), count=4, tier=1, spread=(2.4, 2.0), size=2.4)
    return _m("blighted_wolf", p)


def _corrupt_quad(host: str, name: str, *, rift_z: float, rift: tuple,
                  tongue_at: tuple, eyes_at: tuple, arm_at: tuple,
                  legs_at: tuple | None = None, roots: bool = False,
                  tongue_len: int = 5) -> Model:
    """The standard progression, fitted to one host's proportions."""
    p = HOSTS[host].build()
    w, h = rift
    p += split_open("body", at=(0.0, rift_z, 1.0), width=w, height=h, tier=1,
                    name="flank")
    p += spine_plates("body", from_z=-4.0, to_z=5.0, y=0.0, count=5, tier=1,
                      height=2.8)
    p += lolling_tongue("head", at=tongue_at, tier=1, segments=tongue_len,
                        thick=1.1)
    p += eye_cluster("head", at=eyes_at, count=4, tier=1, spread=(2.4, 2.0),
                     size=2.4)
    ax, ay, az = arm_at
    p += grafted_arm("body", at=(-ax, ay, az), tier=2, side=-1, scale=0.95,
                     name="arm_r")
    p += grafted_arm("body", at=(ax, ay, az), tier=2, side=1, scale=0.95,
                     name="arm_l")
    p += eye_stalks("body", at=(0.0, 0.0, 4.0), count=3, tier=2, spread=2.6)
    if roots:
        p += antler_roots("head", at=(-2.0, 0.0, -3.0), tier=2, side=-1,
                          name="roots_r")
        p += antler_roots("head", at=(2.0, 0.0, -3.0), tier=2, side=1,
                          name="roots_l")
    if legs_at:
        lx, ly, lz = legs_at
        p += extra_legs("body", at=(-lx, ly, lz), tier=2, count=2, length=8.0,
                        side=-1, name="legs_r")
        p += extra_legs("body", at=(lx, ly, lz), tier=2, count=2, length=8.0,
                        side=1, name="legs_l")
    return _m(name, p)


def blighted_fox() -> Model:
    # Foxes keep their brush; the blight just puts eyes along it.
    return _corrupt_quad("fox", "blighted_fox", rift_z=3.0, rift=(4.5, 4.0),
                         tongue_at=(0.0, 4.0, -6.0), eyes_at=(0.0, 2.0, -6.2),
                         arm_at=(3.2, 2.0, -3.0), roots=True)


def blighted_cat() -> Model:
    return _corrupt_quad("cat", "blighted_cat", rift_z=3.0, rift=(4.0, 3.5),
                         tongue_at=(0.0, 3.0, -5.0), eyes_at=(0.0, 1.5, -5.2),
                         arm_at=(3.0, 2.0, -2.5), tongue_len=6)


def blighted_horse() -> Model:
    # The big one: room for a second set of legs under the barrel.
    return _corrupt_quad("horse", "blighted_horse", rift_z=6.0, rift=(7.0, 7.0),
                         tongue_at=(0.0, 6.0, -11.0), eyes_at=(0.0, 2.0, -11.2),
                         arm_at=(5.5, 3.0, -6.0), legs_at=(5.0, 8.0, 2.0),
                         roots=True, tongue_len=7)


def blighted_llama() -> Model:
    return _corrupt_quad("llama", "blighted_llama", rift_z=5.0, rift=(5.5, 6.0),
                         tongue_at=(0.0, 2.0, -9.0), eyes_at=(0.0, -2.0, -9.2),
                         arm_at=(4.5, 2.0, -5.0), roots=True)


def blighted_rabbit() -> Model:
    p = HOSTS["rabbit"].build()
    p += split_open("body", at=(0.0, 3.0, 1.0), width=4.0, height=3.5, tier=1,
                    depth=1.4, name="ribs")
    p += lolling_tongue("head", at=(0.0, 3.0, -4.0), tier=1, segments=5, thick=0.9)
    p += eye_stalks("head", at=(0.0, -0.5, -2.0), count=4, tier=2, spread=2.0,
                    length=2.0)
    p += extra_legs("body", at=(-3.0, 3.0, 1.0), tier=2, count=2, length=7.0,
                    side=-1, name="legs_r")
    p += extra_legs("body", at=(3.0, 3.0, 1.0), tier=2, count=2, length=7.0,
                    side=1, name="legs_l")
    p += eye_cluster("head", at=(0.0, 1.0, -5.2), count=4, tier=1, spread=(2.0, 1.6), size=2.0)
    return _m("blighted_rabbit", p)


def blighted_goat() -> Model:
    p = HOSTS["goat"].build()
    p += split_open("body", at=(0.0, 4.0, 2.0), width=6.0, height=6.0, tier=1,
                    name="flank")
    p += antler_roots("head", at=(-2.0, 0.0, -3.0), tier=1, side=-1, name="roots_r")
    p += antler_roots("head", at=(2.0, 0.0, -3.0), tier=1, side=1, name="roots_l")
    p += lolling_tongue("head", at=(0.0, 5.0, -6.0), tier=1, segments=6, thick=1.2)
    p += grafted_arm("body", at=(-5.0, 2.0, -4.0), tier=2, side=-1, scale=1.0,
                     name="arm_r")
    p += grafted_arm("body", at=(5.0, 2.0, -4.0), tier=2, side=1, scale=1.0,
                     name="arm_l")
    p += eye_stalks("body", at=(0.0, 0.0, 5.0), count=4, tier=2, spread=3.0)
    p += eye_cluster("head", at=(0.0, 2.5, -7.2), count=4, tier=1, spread=(2.2, 2.2), size=2.4)
    return _m("blighted_goat", p)


# ---------------------------------------------------------------------------
# The abstracts - no host left to recognise
# ---------------------------------------------------------------------------


def the_tangle() -> Model:
    """A knot of grafted arms around a hanging amber heart. There is no body
    plan here; the blight simply kept building hands."""
    parts = [
        Part("core", "root", (0.0, 10.0, 0.0), (0, 0, 0),
             [Box((-5, -5, -5), (10, 10, 10), "chitin")]),
        Part("heart", "core", (0.0, 0.0, 0.0), (0, 0, 0),
             [Box((-3, -3, -3), (6, 6, 6), "amberglow")]),
    ]

    def spoke(i, a, x, z):
        side = -1 if math.sin(a) < 0 else 1
        out = [Part(f"knot{i}", "core", (x, math.cos(a * 2.0) * 3.0, z),
                    (math.sin(a) * 40 * D, -a, math.cos(a) * 40 * D),
                    [Box((-1.6, 0, -1.6), (3.2, 5, 3.2), "sinew")])]
        out += grafted_arm(f"knot{i}", at=(0.0, 5.0, 0.0), tier=0, side=side,
                           scale=1.15, name=f"hand{i}")
        return out

    parts += radial(9, 6.0, spoke)
    parts += eye_stalks("core", at=(0.0, -5.0, 0.0), count=5, tier=0, spread=4.0,
                        length=4.0, name="crown")
    parts += chain("drip", "core", (0.0, 5.0, 0.0), 5, (2.6, 3.4, 2.6), "amber",
                   taper=0.8, curl=(6 * D, 0, 2 * D))
    return _m("the_tangle", parts)


def heartwood_colossus() -> Model:
    """A pale oak that stood up. Dormant until you walk into its shadow."""
    parts = [
        Part("trunk", "root", (0.0, 4.0, 0.0), (0, 0, 0),
             [Box((-8, -14, -6), (16, 26, 12), "bark")]),
        Part("cavity", "trunk", (0.0, -4.0, -6.0), (0, 0, 0),
             [Box((-5, -6, -1.5), (10, 12, 3), "flesh")]),
        Part("heart", "cavity", (0.0, 0.0, -1.0), (0, 0, 0),
             [Box((-3, -4, -1.5), (6, 8, 3), "amberglow")]),
        Part("head", "trunk", (0.0, -14.0, 0.0), (0, 0, 0),
             [Box((-5, -9, -5), (10, 9, 10), "palewood")]),
        Part("maw", "head", (0.0, -2.0, -5.0), (0, 0, 0),
             [Box((-3.5, -3, -2), (7, 4, 2), "tongue")]),
    ]
    for i in range(6):
        parts.append(Part(f"tooth{i}", "maw", (-2.6 + i * 1.05, -3.0, -1.0),
                          (0, 0, 0), [Box((-0.5, 0, -0.5), (1, 2.2, 1), "tooth")]))
    parts += eye_stalks("head", at=(0.0, -9.0, -1.0), count=5, tier=0, spread=4.0,
                        length=3.4, name="crown")
    parts += lolling_tongue("maw", at=(0.0, -1.0, -1.0), tier=0, segments=7,
                            thick=1.8)
    for side, tag in ((-1, "r"), (1, "l")):
        parts += chain(f"arm_{tag}", "trunk", (side * 8.0, -12.0, 0.0), 4,
                       (4.0, 8.0, 4.0), "bark", taper=0.84,
                       curl=(10 * D, 0, side * 16 * D),
                       root_rot=(0, 0, side * 34 * D))
        parts += grafted_arm(f"arm_{tag}_3", at=(0.0, 5.0, 0.0), tier=0,
                             side=side, scale=1.6, name=f"hand_{tag}")
        parts += chain(f"root_{tag}", "root", (side * 5.0, GROUND - 6.0, 2.0), 3,
                       (3.4, 4.0, 3.4), "bark", taper=0.8,
                       curl=(0, 0, side * -18 * D))
    parts += spine_plates("trunk", from_z=-4.0, to_z=6.0, y=-14.0, count=6,
                          tier=0, height=5.0, name="crest")
    return _m("heartwood_colossus", parts)


def amber_sovereign() -> Model:
    """THE AMBER SOVEREIGN.

    The blight's finished thought: a djinn of heartwood and poured resin that
    does not walk. Six arms hang unattached in the air around it, each ringed
    at wrist and shoulder; three haloes of amber counter-rotate about the
    body; the skull wears a crown of open eyes and a pair of great ringed
    horns; and where legs should be there is nothing but trailing root.
    """
    parts: list[Part] = []

    # -- torso: a heavy barrel of heartwood, split by a glowing seam ------
    parts.append(Part("core", "root", (0.0, -14.0, 0.0), (0, 0, 0),
                      [Box((-13, -18, -9), (26, 30, 18), "heartwood"),
                       Box((-13.4, -10, -9.4), (27, 5, 19), "chitin")]))
    parts.append(Part("mantle", "core", (0.0, 12.0, 0.0), (0, 0, 0),
                      [Box((-16, -4, -11), (32, 7, 22), "chitin"),
                       Box((-17.5, 1, -12.5), (35, 3, 25), "amber")]))
    # Shoulders: slabs of hardened resin the arms do not actually touch.
    for side, tag in ((-1, "r"), (1, "l")):
        parts.append(Part(f"pauldron_{tag}", "core", (side * 13.0, -13.0, 0.0),
                          (0, 0, side * -14 * D),
                          [Box((-6 if side < 0 else 0, -5, -8), (6, 9, 16), "chitin"),
                           Box((-6.4 if side < 0 else -0.4, -6.5, -8.4),
                               (6.8, 2.5, 16.8), "amber")]))
    # The open reliquary: the blight's heart, watched by its own ring of eyes.
    parts.append(Part("chest", "core", (0.0, -6.0, -9.0), (0, 0, 0),
                      [Box((-7, -8, -1.2), (14, 16, 2.4), "flesh")]))
    parts.append(Part("heart", "chest", (0.0, 0.0, -1.6), (0, 0, 0),
                      [Box((-4.5, -6, -2.2), (9, 12, 3), "amberglow")]))
    for i in range(8):
        a = (2 * math.pi * i) / 8
        parts.append(Part(f"ribeye{i}", "chest",
                          (math.sin(a) * 5.6, math.cos(a) * 6.6, -1.9),
                          (0, 0, 0),
                          [Box((-1.3, -1.3, -0.9), (2.6, 2.6, 0.9), "eye")]))
    # Ribs of exposed pale oak clasping the cavity.
    for i in range(5):
        yy = -13.0 + i * 3.4
        for side in (-1, 1):
            parts.append(Part(f"rib{i}{'r' if side < 0 else 'l'}", "core",
                              (side * 7.5, yy, -9.2), (0, 0, side * 22 * D),
                              [Box((-1.2, -1.0, -1.2), (2.4, 6.5, 2.0), "palewood")]))
    parts += torus("beltring", "core", (0.0, 8.0, 0.0), 15.0, 18, 2.2, "amber")

    # -- skull, jaw, crown ------------------------------------------------
    parts.append(Part("neck", "core", (0.0, -16.0, 0.0), (0, 0, 0),
                      [Box((-4.5, -6, -4.5), (9, 6, 9), "sinew")]))
    parts.append(Part("head", "neck", (0.0, -6.0, 0.0), (0, 0, 0),
                      [Box((-8.5, -14, -7.5), (17, 14, 15), "palewood")]))
    parts.append(Part("brow", "head", (0.0, -9.5, -7.5), (0, 0, 0),
                      [Box((-9, -3, -2), (18, 4, 2.6), "chitin")]))
    parts.append(Part("visage", "head", (0.0, -7.5, -7.8), (0, 0, 0),
                      [Box((-7, -6, -0.8), (14, 12, 1.0), "eye")]))
    parts.append(Part("jaw", "head", (0.0, 0.0, -3.0), (16 * D, 0, 0),
                      [Box((-6, -1.5, -6), (12, 5, 7), "palewood")]))
    for i in range(8):
        parts.append(Part(f"fang{i}", "jaw", (-5.0 + i * 1.42, -1.5, -5.6),
                          (0, 0, 0),
                          [Box((-0.6, 0, -0.6), (1.2, 3.0, 1.2), "tooth")]))
    for i in range(6):
        parts.append(Part(f"upfang{i}", "head", (-4.4 + i * 1.75, 0.0, -6.4),
                          (0, 0, 0),
                          [Box((-0.6, -2.6, -0.6), (1.2, 2.6, 1.2), "tooth")]))
    # Great swept horns, each wearing rings - the djinn read.
    for side, tag in ((-1, "r"), (1, "l")):
        parts += chain(f"horn_{tag}", "head", (side * 7.5, -12.0, -1.0), 4,
                       (4.2, 7.5, 4.2), "heartwood", taper=0.78,
                       curl=(14 * D, 0, side * 16 * D),
                       root_rot=(-14 * D, side * 10 * D, side * 40 * D))
        for k, host in enumerate((f"horn_{tag}", f"horn_{tag}_1", f"horn_{tag}_2")):
            parts += torus(f"hring_{tag}{k}", host, (0.0, 3.0, 0.0),
                           4.0 - 0.55 * k, 10, 1.1, "amberglow",
                           rot=(90 * D, 0, 0))
    parts += eye_stalks("head", at=(0.0, -14.0, 0.0), count=5, tier=0,
                        spread=6.0, length=5.0, name="crown")

    # -- six arms that are not attached to anything -----------------------
    # Three pairs at different heights, each hanging in its own shoulder ring.
    for row, (y, x, z, sc) in enumerate(((-30.0, 24.0, -4.0, 1.7),
                                         (-12.0, 30.0, 1.0, 2.2),
                                         (6.0, 26.0, 6.0, 1.9))):
        for side in (-1, 1):
            i = row * 2 + (0 if side < 0 else 1)
            hub = f"float{i}"
            parts.append(Part(hub, "root", (side * x, y, z),
                              (0, side * -18 * D, side * 8 * D), []))
            parts += torus(f"shring{i}", hub, (0.0, -2.0, 0.0), 5.0, 12, 1.4,
                           "amber")
            parts += grafted_arm(hub, at=(0.0, 0.0, 0.0), tier=0, side=side,
                                 scale=sc, name=f"hand{i}")
            parts += torus(f"wring{i}", f"mut0_hand{i}_fore",
                           (0.0, 5.4 * sc, 0.0), 2.6, 10, 1.0, "amberglow")

    # -- two haloes, close and heavy --------------------------------------
    for k, (r, seg, th, tilt) in enumerate(((26.0, 22, 2.6, 62.0),
                                            (33.0, 26, 2.0, -74.0))):
        parts += torus(f"halo{k}", "root", (0.0, -16.0, 0.0), r, seg, th,
                       "amberglow" if k == 0 else "amber",
                       rot=(tilt * D, 0, (k * 2 - 1) * 26 * D))

    # -- root-skirt where legs would be -----------------------------------
    for i in range(7):
        a = (2 * math.pi * i) / 7
        parts += chain(f"trail{i}", "mantle",
                       (math.sin(a) * 9.0, 3.0, math.cos(a) * 7.0), 5,
                       (3.2, 6.0, 3.2), "heartwood", taper=0.76,
                       curl=(math.sin(a) * 10 * D, 0, math.cos(a) * 10 * D),
                       root_rot=(math.sin(a) * 16 * D, 0, -math.cos(a) * 16 * D))
    return _m("amber_sovereign", parts, tex=256)


# ---------------------------------------------------------------------------
# People
# ---------------------------------------------------------------------------


def half_sapped() -> Model:
    """A person the blight has not finished: one side still theirs."""
    p = humanoid("skin", "cloth")
    p += split_open("body", at=(2.0, -6.0, -2.0), width=4.0, height=7.0, tier=1,
                    depth=1.4, name="chest")
    p += lolling_tongue("head", at=(0.0, -1.0, -4.0), tier=1, segments=5,
                        thick=1.1)
    p += eye_stalks("head", at=(0.0, -8.0, -1.0), count=3, tier=2, spread=2.6,
                    length=2.6)
    p += grafted_arm("body", at=(-4.5, -8.0, 1.0), tier=2, side=-1, scale=0.85,
                     name="spare")
    p += antler_roots("head", at=(-3.0, -8.0, 0.0), tier=2, side=-1, name="roots")
    # The finished half: bark where an arm used to be.
    p.append(Part("mut1_barkarm", "arm_r", (0.0, 0.0, 0.0), (0, 0, 0),
                  [Box((-4.4, -2.4, -2.4), (4.8, 13, 4.8), "bark")]))
    p += eye_cluster("body", at=(2.0, -8.0, -2.4), count=4, tier=1, spread=(2.2, 3.0), size=2.2, out=-0.5)
    return _m("half_sapped", p)


def tapper() -> Model:
    """The hireable resin-tapper: living, armed, and sick of this."""
    p = humanoid("skin", "cloth")
    p.append(Part("hat", "head", (0.0, -8.0, 0.0), (0, 0, 5 * D),
                  [Box((-5.5, -1, -5.5), (11, 1.5, 11), "leather"),
                   Box((-3.5, -4, -3.5), (7, 3, 7), "leather")]))
    p.append(Part("satchel", "body", (0.0, -4.0, 2.0), (0, 0, 0),
                  [Box((-3, 0, 0), (6, 5, 3), "leather")]))
    p.append(Part("tapline", "body", (0.0, -9.0, -2.2), (0, 0, 18 * D),
                  [Box((-1, 0, -0.6), (2, 9, 1), "leather")]))
    p.append(Part("lantern", "arm_l", (2.0, 10.0, 0.0), (0, 0, 0),
                  [Box((-1.6, 0, -1.6), (3.2, 3.4, 3.2), "glow")]))
    p.append(Part("tap", "arm_r", (-2.0, 10.0, 0.0), (0, 0, 0),
                  [Box((-0.6, 0, -0.6), (1.2, 7, 1.2), "iron")]))
    return _m("tapper", p)


def refugee() -> Model:
    p = humanoid("skin", "leather")
    p.append(Part("hood", "head", (0.0, -8.0, 0.0), (0, 0, 0),
                  [Box((-4.6, -1.2, -4.6), (9.2, 3.4, 9.2), "cloth"),
                   Box((-4.6, 2.2, -3.6), (1.2, 6, 8.2), "cloth"),
                   Box((3.4, 2.2, -3.6), (1.2, 6, 8.2), "cloth"),
                   Box((-4.6, 2.2, 3.4), (9.2, 6, 1.2), "cloth")]))
    p.append(Part("bundle", "body", (0.0, -6.0, 2.0), (0, 0, 0),
                  [Box((-3, 0, 0), (6, 5, 3.4), "cloth"),
                   Box((-2, -1.4, 0.4), (4, 1.4, 2.6), "leather")]))
    p.append(Part("belt", "body", (0.0, -2.0, 0.0), (0, 0, 0),
                  [Box((-4.3, 0, -2.3), (8.6, 1.4, 4.6), "leather")]))
    return _m("refugee", p)


BESTIARY = {
    "blighted_cow": blighted_cow,
    "blighted_pig": blighted_pig,
    "blighted_sheep": blighted_sheep,
    "blighted_chicken": blighted_chicken,
    "blighted_spider": blighted_spider,
    "blighted_creeper": blighted_creeper,
    "blighted_wolf": blighted_wolf,
    "blighted_rabbit": blighted_rabbit,
    "blighted_goat": blighted_goat,
    "blighted_fox": blighted_fox,
    "blighted_cat": blighted_cat,
    "blighted_horse": blighted_horse,
    "blighted_llama": blighted_llama,
    "the_tangle": the_tangle,
    "heartwood_colossus": heartwood_colossus,
    "amber_sovereign": amber_sovereign,
    "half_sapped": half_sapped,
    "tapper": tapper,
    "refugee": refugee,
}

# Extra eyes scattered onto specific parts when painting.
EYE_FIELDS = {
    "blighted_cow": {"mut1_flank": 3, "head": 1},
    "blighted_pig": {"mut1_belly": 3},
    "blighted_sheep": {"mut1_fleecerift": 3},
    "blighted_chicken": {"mut1_crop": 2},
    "blighted_spider": {"mut1_sac": 4, "head": 2},
    "blighted_creeper": {"mut1_core": 4},
    "blighted_wolf": {"mut1_ribs": 3},
    "blighted_rabbit": {"mut1_ribs": 2},
    "blighted_goat": {"mut1_flank": 3},
    "blighted_fox": {"mut1_flank": 3},
    "blighted_cat": {"mut1_flank": 3},
    "blighted_horse": {"mut1_flank": 3},
    "blighted_llama": {"mut1_flank": 3},
    "the_tangle": {"core": 4},
    "heartwood_colossus": {"cavity": 4, "trunk": 3},
    "amber_sovereign": {"core": 4, "mantle": 3, "head": 2, "chest": 2},
    "half_sapped": {"mut1_chest": 2},
}

# Species that keep a living, uninfected texture (no tier variants).
LIVING = {"tapper", "refugee"}
UNTIERED = {"creaking_hand", "the_creaking"}

DISPLAY = {
    "blighted_cow": ("Blighted Cow", "hide and horns intact; the flank is not"),
    "blighted_pig": ("Blighted Sow", "six legs by the second firing"),
    "blighted_sheep": ("Blighted Ewe", "the fleece keeps growing after death"),
    "blighted_chicken": ("Blighted Hen", "the neck kept going"),
    "blighted_spider": ("Blighted Spider", "twelve legs and a tongue"),
    "blighted_creeper": ("Blighted Creeper", "opens instead of detonating"),
    "blighted_wolf": ("Blighted Wolf", "pale oak out of the skull"),
    "blighted_rabbit": ("Blighted Hare", "small, fast, and wrong"),
    "blighted_goat": ("Blighted Goat", "rooted horns, grafted hands"),
    "blighted_fox": ("Blighted Fox", "keeps the brush; eyes along it"),
    "blighted_cat": ("Blighted Cat", "small, quiet, and watching"),
    "blighted_horse": ("Blighted Horse", "six legs under the barrel"),
    "blighted_llama": ("Blighted Llama", "spits something worse now"),
    "the_tangle": ("The Tangle", "abstract: a knot that kept building hands"),
    "heartwood_colossus": ("Heartwood Colossus", "abstract: a pale oak that stood up"),
    "amber_sovereign": ("The Amber Sovereign", "six unattached arms, three haloes"),
    "half_sapped": ("Half-Sapped", "a person the blight has not finished"),
    "tapper": ("Resin Tapper", "hireable; cuts the blight for a living"),
    "refugee": ("Refugee", "scared; can be talked into fighting"),
}


# ---------------------------------------------------------------------------
# THE CREAKING - what the blight was always growing toward
# ---------------------------------------------------------------------------


def _giant_hand(prefix: str, parent: str, at: tuple, scale: float,
                curl: float = 1.0) -> list[Part]:
    """One colossal hand: palm, thumb and four fingers with claws.

    Built as its own function because it is used twice - once on the arm that
    comes through the portal, and once on each arm of the full body - and the
    two have to be recognisably the same hand.
    """
    s = scale
    parts = [
        Part(prefix, parent, at, (0, 0, 0),
             [Box((-5 * s, -1.5 * s, -6 * s), (10 * s, 3 * s, 11 * s), "heartwood"),
              Box((-5.2 * s, -1.7 * s, -2 * s), (10.4 * s, 1.2 * s, 5 * s), "amber")]),
    ]
    # Four fingers off the front edge, splayed and curling in.
    for i in range(4):
        fx = (-3.3 + i * 2.2) * s
        parts += chain(f"{prefix}_f{i}", prefix, (fx, 0.5 * s, -5.5 * s), 4,
                       (2.0 * s, 3.6 * s, 2.0 * s), "bark", taper=0.84,
                       curl=(24 * D * curl, 0, 0),
                       root_rot=(6 * D, (i - 1.5) * 9 * D, (i - 1.5) * 6 * D))
        tip = f"{prefix}_f{i}_3"
        parts.append(Part(f"{prefix}_c{i}", tip, (0.0, 2.6 * s, 0.0), (14 * D, 0, 0),
                          [Box((-0.9 * s, 0, -0.9 * s), (1.8 * s, 3.4 * s, 1.8 * s), "tooth")]))
    # Thumb, set low and opposed.
    parts += chain(f"{prefix}_th", prefix, (-5 * s, 0.5 * s, -1.5 * s), 3,
                   (2.4 * s, 3.4 * s, 2.4 * s), "bark", taper=0.85,
                   curl=(18 * D * curl, 0, 10 * D),
                   root_rot=(10 * D, -26 * D, -62 * D))
    parts.append(Part(f"{prefix}_thc", f"{prefix}_th_2", (0.0, 2.4 * s, 0.0), (12 * D, 0, 0),
                      [Box((-0.9 * s, 0, -0.9 * s), (1.8 * s, 3.2 * s, 1.8 * s), "tooth")]))
    # An eye in the palm. It watches what it reaches for.
    parts.append(Part(f"{prefix}_palmeye", prefix, (0.0, -1.7 * s, -1.0 * s), (0, 0, 0),
                      [Box((-2.2 * s, -1.2 * s, -2.2 * s),
                           (4.4 * s, 1.4 * s, 4.4 * s), "eye:bloom")]))
    return parts


def creaking_hand() -> Model:
    """THE CREAKING HAND.

    All that fits through a gate: a forearm and a hand, reaching in. The arm
    is cut at the elbow by the portal ring it is coming through, and the ring
    itself is part of the model so the thing always reads as *arriving* rather
    than as a creature that happens to have no body.
    """
    parts: list[Part] = []
    # The gate ring it is coming through, hanging in the air behind the arm.
    parts += torus("ring", "root", (0.0, -14.0, 10.0), 11.5, 26, 3.0, "amberglow",
                   rot=(90 * D, 0, 0))
    parts += torus("ring2", "root", (0.0, -14.0, 11.6), 13.5, 28, 2.0, "heartwood",
                   rot=(90 * D, 0, 0))
    # Forearm, thickest where it disappears into the ring.
    parts += chain("arm", "root", (0.0, -14.0, 10.0), 6, (10.5, 7.0, 10.5),
                   "heartwood", taper=0.93, curl=(-4 * D, 0, 0),
                   root_rot=(-88 * D, 0, 0))
    # Resin bands where the bark has split along the forearm.
    # Split bark, not bracelets: bands sit inside the arm's own width.
    for i, host in enumerate(("arm_1", "arm_3")):
        parts += torus(f"band{i}", host, (0.0, 3.2, 0.0), 4.4 - i * 0.3, 14, 1.2,
                       "amber")
    parts += _giant_hand("hand", "arm_5", (0.0, 6.0, 0.0), 1.2)
    # Sap still running off it from the crossing.
    for i in range(5):
        a = (2 * math.pi * i) / 5
        parts += chain(f"drip{i}", "arm_3", (math.sin(a) * 5.0, 4.0, math.cos(a) * 5.0),
                       3, (1.6, 4.0, 1.6), "amber", taper=0.7, curl=(0, 0, 0))
    return _m("creaking_hand", parts, tex=256)


def _creaking_torso(legs: bool) -> list[Part]:
    """The body itself: a heavyweight humanoid with too many arms.

    Proportioned like something built to hit: enormous deltoids and pectorals,
    a chest that reads wider than it is tall, and a head deliberately far too
    small for it, sunk between the shoulders so it looks less like a face than
    like something the body carries. Six arms - two heavy pairs and one small
    pair folded at the sternum - because a silhouette with the wrong count is
    unsettling faster than any amount of texture detail.
    """
    parts: list[Part] = []

    # Hips only exist on the walking version; in the pool it ends at the gold.
    root_y = -34.0 if legs else -26.0
    parts.append(Part("torso", "root", (0.0, root_y, 0.0), (0, 0, 0),
                      [Box((-15, -18, -10), (30, 22, 20), "heartwood")]))
    # Slab of chest, wider than tall, overhanging the waist.
    parts.append(Part("chest", "torso", (0.0, -18.0, 0.0), (0, 0, 0),
                      [Box((-23, -16, -12), (46, 18, 24), "heartwood"),
                       Box((-24, -17, -13), (48, 5, 26), "chitin")]))
    # Pectoral plates, angled inward so the chest reads as muscle not a box.
    for side in (-1, 1):
        parts.append(Part(f"pec_{'r' if side < 0 else 'l'}", "chest",
                          (side * 13.0, -8.0, -12.2), (0, side * -16 * D, side * 10 * D),
                          [Box((-7 if side < 0 else 0, -7, -3.5), (7, 15, 4),
                               "heartwood"),
                           Box((-7.2 if side < 0 else -0.2, -7.5, -3.8), (7.4, 3, 4.4),
                               "chitin")]))
    # Ribs peeled outward from the sternum.
    for i in range(5):
        yy = -14.0 + i * 3.4
        for side in (-1, 1):
            parts.append(Part(f"rib{i}{'r' if side < 0 else 'l'}", "chest",
                              (side * 7.0, yy, -12.4), (0, 0, side * 30 * D),
                              [Box((-2.0, -1.4, -2.0), (4.0, 12.0, 3.2), "palewood")]))
    # The heart, in a cavity between the pectorals.
    parts.append(Part("cavity", "chest", (0.0, -7.0, -12.6), (0, 0, 0),
                      [Box((-7, -8, -1.2), (14, 16, 2), "flesh")]))
    parts.append(Part("heart", "cavity", (0.0, 0.0, -1.6), (0, 0, 0),
                      [Box((-4.5, -6, -2.2), (9, 12, 3), "amberglow")]))
    for i in range(8):
        a = (2 * math.pi * i) / 8
        parts.append(Part(f"chesteye{i}", "cavity",
                          (math.sin(a) * 5.4, math.cos(a) * 6.6, -2.0), (0, 0, 0),
                          [Box((-1.7, -1.7, -1.0), (3.4, 3.4, 1.0), "eye:bloom")]))

    # --- six arms ------------------------------------------------------
    # Two heavy pairs off the shoulder shelf and one small pair at the
    # sternum, all built from the same hand that came through the gate.
    for side, tag in ((-1, "r"), (1, "l")):
        parts.append(Part(f"delt_{tag}", "chest", (side * 23.0, -12.0, 0.0),
                          (0, 0, side * -20 * D),
                          [Box((-11 if side < 0 else 0, -9, -11), (11, 20, 22), "chitin")]))
        for k, (drop, thick, scale, out) in enumerate(((2.0, 11.0, 1.15, 14),
                                                       (9.0, 8.5, 0.9, 30))):
            arm = f"arm{k}_{tag}"
            parts += chain(arm, f"delt_{tag}", (side * 3.0, drop, 0.0), 3,
                           (thick, 14.0, thick), "heartwood", taper=0.87,
                           curl=(20 * D, 0, side * 12 * D),
                           root_rot=(-18 * D, 0, side * out * D))
            parts += _giant_hand(f"hand{k}_{tag}", f"{arm}_2", (0.0, 11.0, 0.0),
                                 scale, curl=0.85)
        # The small pair, folded in tight against the sternum.
        small = f"arms_{tag}"
        parts += chain(small, "chest", (side * 9.0, -4.0, -11.0), 3,
                       (5.0, 8.0, 5.0), "sinew", taper=0.85,
                       curl=(46 * D, 0, side * -18 * D),
                       root_rot=(-52 * D, side * 20 * D, side * 26 * D))
        parts += _giant_hand(f"hands_{tag}", f"{small}_2", (0.0, 6.0, 0.0), 0.5,
                             curl=1.3)

    # --- the head it carries -------------------------------------------
    # Small, low, and set back between the shoulders.
    parts.append(Part("neck", "chest", (0.0, -15.0, 3.0), (14 * D, 0, 0),
                      [Box((-4, -6, -4), (8, 7, 8), "sinew")]))
    parts.append(Part("head", "neck", (0.0, -6.0, 0.0), (-10 * D, 0, 0),
                      [Box((-6.5, -9, -6), (13, 9, 12), "palewood")]))
    parts.extend(infected_face("head", 13, 9, 6, eye=4.4, teeth=7,
                               jaw_mat="heartwood", style="bloom", spares=3))
    for i in range(5):
        a = (2 * math.pi * i) / 5
        parts += chain(f"crown{i}", "head", (math.sin(a) * 3.6, -9.0, math.cos(a) * 3.2),
                       3, (2.2, 5.0, 2.2), "bark", taper=0.78,
                       curl=(math.sin(a) * 16 * D, 0, math.cos(a) * 16 * D),
                       root_rot=(math.sin(a) * 30 * D, a, -math.cos(a) * 30 * D))
    return parts


def the_creaking() -> Model:
    """THE CREAKING, waist-deep in the gilded pool.

    The hollow version: no legs, because it has never stood up. The model ends
    at a waterline of poured gold that is part of the geometry, so it reads as
    something rising out of the pool rather than standing in a puddle.
    """
    parts = _creaking_torso(legs=False)
    parts.append(Part("waterline", "root", (0.0, -4.0, 0.0), (0, 0, 0),
                      [Box((-26, -2, -22), (52, 4, 44), "amberglow"),
                       Box((-30, 0, -26), (60, 3, 52), "amber")]))
    # Sap sheeting off it, still running back into the pool.
    for i in range(9):
        a = (2 * math.pi * i) / 9
        parts += chain(f"sheet{i}", "torso",
                       (math.sin(a) * 13.0, 0.0, math.cos(a) * 8.0), 3,
                       (2.6, 5.0, 2.6), "amber", taper=0.74)
    return _m("the_creaking", parts, tex=512)


def creaking_risen() -> Model:
    """THE CREAKING, standing.

    What steps through into the overworld: the same body with legs under it,
    dug in and braced. Nothing else in the mod is built at this scale.
    """
    parts = _creaking_torso(legs=True)
    for side, tag in ((-1, "r"), (1, "l")):
        parts += chain(f"leg_{tag}", "root", (side * 9.0, -34.0, 0.0), 3,
                       (13.0, 13.0, 13.0), "heartwood", taper=0.88,
                       curl=(-8 * D, 0, side * 6 * D),
                       root_rot=(6 * D, 0, side * -7 * D))
        parts.append(Part(f"foot_{tag}", f"leg_{tag}_2", (0.0, 11.0, 0.0), (0, 0, 0),
                          [Box((-7, 0, -12), (14, 5, 20), "bark")]))
        # Roots spilling off each foot, gripping whatever it lands on.
        for i in range(4):
            a = (2 * math.pi * i) / 4
            parts += chain(f"root_{tag}{i}", f"foot_{tag}",
                           (math.sin(a) * 4.0, 4.0, math.cos(a) * 6.0), 3,
                           (2.4, 4.0, 2.4), "bark", taper=0.76,
                           root_rot=(math.cos(a) * 42 * D, 0, -math.sin(a) * 42 * D))
    return _m("creaking_risen", parts, tex=512)



BESTIARY["creaking_hand"] = creaking_hand
BESTIARY["the_creaking"] = the_creaking
BESTIARY["creaking_risen"] = creaking_risen
DISPLAY["creaking_hand"] = ("The Creaking Hand", "all that fits through a gate")
DISPLAY["the_creaking"] = ("The Creaking", "waist-deep in the gold it grew in")
DISPLAY["creaking_risen"] = ("The Creaking, Risen", "what steps into the overworld")
EYE_FIELDS["the_creaking"] = {"torso": 4, "head": 2}
