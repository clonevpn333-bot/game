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
                     rabbit_host, flayed,
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


# Every host gets its own pathology.
#
# The previous version ran nearly all of them through one `_corrupt_quad`
# helper, which gave the fox, the cat, the horse and the llama the same rift in
# the same place, the same eye cluster on the head, the same symmetric pair of
# arms at the same height, and the same fan of eye stalks on the rump. Four
# animals, one disease. What follows gives each species a *different* disease -
# a different part of the body opens, a different thing grows out of it, and
# most of them are no longer symmetric, because nothing about this should look
# designed.


def blighted_cow() -> Model:
    """Opened along the ribs on one side. It still chews."""
    p = HOSTS["cow"].build()
    p += flayed("body", at=(-6.0, 4.0, -1.0), length=11.0, height=7.0, ribs=6,
                tier=1, side=-1, spine=True, name="flank")
    p += spine_plates("body", from_z=-6.0, to_z=7.0, y=0.0, count=6, tier=1,
                      height=3.4)
    p += lolling_tongue("head", at=(0.0, 6.0, -5.0), tier=1, segments=6)
    p += resin_growth("body", at=(4.5, 3.0, -5.0), size=(4, 4, 4), tier=1)
    # One arm, out of the opened side. Asymmetry is the point.
    p += grafted_arm("body", at=(-6.5, 2.0, -3.0), tier=2, side=-1, scale=1.2,
                     name="arm_r")
    p += antler_roots("head", at=(-2.5, 0.5, -3.0), tier=2, side=-1, name="roots_r")
    p += antler_roots("head", at=(2.5, 0.5, -3.0), tier=2, side=1, name="roots_l")
    p += eye_cluster("head", at=(0.0, 3.0, -6.2), count=4, tier=1,
                     spread=(3.2, 2.2), size=2.8)
    return _m("blighted_cow", p)


def blighted_pig() -> Model:
    """Burst from underneath. It walks on more legs than it was issued."""
    p = HOSTS["pig"].build()
    p += flayed("body", at=(0.0, 8.6, 1.0), length=10.0, height=5.0, ribs=5,
                tier=1, side=1, name="belly")
    p += lolling_tongue("head", at=(0.0, 7.0, -8.0), tier=1, segments=5, thick=1.4)
    p += resin_growth("body", at=(0.0, -0.5, 3.0), size=(5, 4, 5), tier=1)
    p += extra_legs("body", at=(-4.5, 6.0, -1.0), tier=2, count=2, length=9.0,
                    side=-1, name="legs_r")
    p += extra_legs("body", at=(4.5, 6.0, -1.0), tier=2, count=3, length=9.0,
                    side=1, name="legs_l")
    p += eye_stalks("head", at=(0.0, 0.0, -4.0), count=4, tier=2, spread=2.6,
                    length=2.6)
    p += eye_cluster("head", at=(0.0, 3.0, -8.2), count=5, tier=1,
                     spread=(3.0, 2.4), size=2.6)
    return _m("blighted_pig", p)


def blighted_sheep() -> Model:
    """Shorn to the spine. The fleece went hard before it came off."""
    p = HOSTS["sheep"].build()
    # The wound runs along the back, not the flank: it has been stripped.
    p += flayed("body", at=(0.0, 4.4, 0.0), length=13.0, height=5.0, ribs=7,
                tier=1, side=-1, spine=True, name="shorn")
    p += spine_plates("body", from_z=-5.0, to_z=6.0, y=-1.0, count=5, tier=1,
                      height=3.0)
    p += lolling_tongue("head", at=(0.0, 5.0, -7.0), tier=1, segments=5, thick=1.3)
    p += eye_cluster("body", at=(0.0, 2.0, -7.0), count=6, tier=1,
                     spread=(4.2, 1.8), size=2.6, out=-0.6, name="wooleyes")
    p += grafted_arm("body", at=(4.8, 3.0, -4.0), tier=2, side=1, scale=0.95,
                     name="arm_l")
    p += antler_roots("head", at=(-2.0, 0.0, -4.0), tier=2, side=-1, name="roots_r")
    p += eye_cluster("head", at=(0.0, 2.5, -8.2), count=4, tier=1,
                     spread=(2.4, 2.0), size=2.4)
    return _m("blighted_sheep", p)


def blighted_goat() -> Model:
    """The throat opened and the horns kept going."""
    p = HOSTS["goat"].build()
    p += flayed("neck", at=(0.0, -2.0, 1.2), length=5.0, height=4.0, ribs=4,
                tier=1, side=1, name="throat")
    p += flayed("body", at=(5.0, 4.5, 2.0), length=8.0, height=6.0, ribs=5,
                tier=2, side=1, name="flank")
    p += lolling_tongue("head", at=(0.0, 5.5, -8.5), tier=1, segments=7, thick=1.0)
    p += antler_roots("head", at=(-2.4, 0.0, -2.0), tier=1, side=-1, name="crown_r")
    p += antler_roots("head", at=(2.4, 0.0, -2.0), tier=1, side=1, name="crown_l")
    p += antler_roots("head", at=(0.0, -0.5, -5.0), tier=2, side=1, name="crown_c")
    p += eye_cluster("head", at=(0.0, 1.5, -9.0), count=5, tier=1,
                     spread=(2.2, 3.4), size=2.2)
    p += eye_stalks("neck", at=(0.0, -3.0, -1.0), count=3, tier=2, spread=2.0,
                    length=3.2)
    return _m("blighted_goat", p)


def blighted_horse() -> Model:
    """Opened under the barrel. The neck did not stop growing."""
    p = HOSTS["horse"].build()
    p += flayed("body", at=(0.0, 13.0, 2.0), length=15.0, height=6.0, ribs=8,
                tier=1, side=1, name="barrel")
    p += flayed("neck", at=(0.0, -5.0, 1.5), length=6.0, height=5.0, ribs=4,
                tier=2, side=-1, name="withers")
    p += lolling_tongue("head", at=(0.0, 4.0, -9.0), tier=1, segments=8, thick=1.2)
    p += spine_plates("body", from_z=-8.0, to_z=9.0, y=0.0, count=8, tier=1,
                      height=3.6)
    p += grafted_arm("body", at=(-5.5, 5.0, -8.0), tier=2, side=-1, scale=1.1,
                     name="arm_r")
    p += grafted_arm("body", at=(5.5, 6.5, -6.0), tier=2, side=1, scale=0.85,
                     name="arm_l")
    p += eye_cluster("neck", at=(0.0, -8.0, -3.5), count=5, tier=1,
                     spread=(2.6, 4.0), size=2.4, name="neckeyes")
    return _m("blighted_horse", p)


def blighted_llama() -> Model:
    """The neck is the wound. It carries the whole length of it open."""
    p = HOSTS["llama"].build()
    p += flayed("neck", at=(0.0, -7.0, 1.6), length=13.0, height=4.2, ribs=9,
                tier=1, side=-1, spine=True, name="throat")
    p += lolling_tongue("head", at=(0.0, 3.5, -8.0), tier=1, segments=9, thick=0.9)
    p += eye_stalks("neck", at=(0.0, -12.0, -1.5), count=5, tier=2, spread=2.2,
                    length=3.6)
    p += resin_growth("body", at=(0.0, -1.0, 4.0), size=(6, 5, 5), tier=1)
    p += grafted_arm("neck", at=(-3.0, -10.0, 0.0), tier=2, side=-1, scale=0.7,
                     name="arm_r")
    p += eye_cluster("head", at=(0.0, 1.5, -9.0), count=4, tier=1,
                     spread=(1.8, 2.6), size=2.0)
    return _m("blighted_llama", p)


def blighted_wolf() -> Model:
    """The ruff tore away. The shoulders underneath are bare."""
    p = HOSTS["wolf"].build()
    p += flayed("body", at=(-4.0, 3.0, -2.0), length=9.0, height=6.0, ribs=6,
                tier=1, side=-1, spine=True, name="shoulder")
    p += lolling_tongue("head", at=(0.0, 4.5, -5.5), tier=1, segments=7, thick=1.2)
    p += spine_plates("body", from_z=-4.0, to_z=5.0, y=-0.5, count=6, tier=1,
                      height=3.2)
    # Arms come out from under the ruff, not off the ribs.
    p += grafted_arm("ruff", at=(-4.5, 3.0, -1.0), tier=2, side=-1, scale=0.9,
                     name="arm_r")
    p += grafted_arm("ruff", at=(4.5, 3.0, -1.0), tier=2, side=1, scale=0.9,
                     name="arm_l")
    p += eye_stalks("body", at=(0.0, -0.5, 4.0), count=3, tier=2, spread=2.4,
                    length=2.4)
    p += eye_cluster("head", at=(0.0, 2.0, -6.2), count=4, tier=1,
                     spread=(2.4, 2.0), size=2.4)
    return _m("blighted_wolf", p)


def blighted_fox() -> Model:
    """The brush stripped to its vertebrae, and still wagging."""
    p = HOSTS["fox"].build()
    p += flayed("tail", at=(0.0, 4.0, 0.0), length=7.0, height=4.0, ribs=6,
                tier=1, side=1, viscera=False, name="brush")
    p += flayed("body", at=(3.4, 2.5, 1.0), length=7.0, height=4.5, ribs=4,
                tier=2, side=1, name="flank")
    p += lolling_tongue("head", at=(0.0, 4.0, -9.5), tier=1, segments=6)
    p += eye_cluster("tail", at=(0.0, 5.0, 0.0), count=5, tier=1,
                     spread=(2.6, 5.0), size=2.2, name="brusheyes")
    p += grafted_arm("body", at=(-3.4, 3.5, 3.0), tier=2, side=-1, scale=0.65,
                     name="arm_r")
    p += eye_cluster("head", at=(0.0, 2.0, -6.2), count=4, tier=1,
                     spread=(3.0, 2.0), size=2.4)
    return _m("blighted_fox", p)


def blighted_cat() -> Model:
    """Spine laid open. The tail is a whip of loose bone."""
    p = HOSTS["cat"].build()
    p += flayed("body", at=(0.0, 2.2, 0.0), length=10.0, height=4.0, ribs=7,
                tier=1, side=-1, spine=True, viscera=False, name="spine")
    p += lolling_tongue("head", at=(0.0, 3.0, -5.0), tier=1, segments=8, thick=0.8)
    p += eye_stalks("tail", at=(0.0, 3.0, 0.0), count=4, tier=2, spread=1.4,
                    length=2.0)
    p += grafted_arm("body", at=(3.0, 3.0, -3.5), tier=2, side=1, scale=0.6,
                     name="arm_l")
    p += eye_cluster("head", at=(0.0, 1.5, -5.2), count=4, tier=1,
                     spread=(2.4, 2.0), size=2.4)
    return _m("blighted_cat", p)


def blighted_rabbit() -> Model:
    """The haunches split. The ears are cartilage and nothing else."""
    p = rabbit_host()
    p += flayed("haunch_br", at=(-1.6, 2.0, 0.0), length=5.5, height=4.5,
                ribs=4, tier=1, side=-1, name="haunch")
    p += flayed("body", at=(0.0, 2.6, 1.0), length=7.0, height=4.0, ribs=5,
                tier=2, side=1, name="back")
    p += lolling_tongue("head", at=(0.0, 3.0, -4.0), tier=1, segments=5, thick=0.9)
    p += eye_stalks("ear_r", at=(0.0, -4.0, 0.0), count=3, tier=2, spread=1.0,
                    length=2.2)
    # One oversized arm off the back, far too big for the animal carrying it.
    p += grafted_arm("body", at=(2.6, 1.0, 2.0), tier=2, side=1, scale=1.15,
                     name="arm_l")
    p += eye_cluster("head", at=(0.0, 1.0, -5.2), count=4, tier=1,
                     spread=(2.0, 1.6), size=2.0)
    return _m("blighted_rabbit", p)


def blighted_chicken() -> Model:
    """Breast opened, wings stripped back to the bones of the wing."""
    p = chicken_host()
    p += flayed("body", at=(0.0, 3.0, -4.2), length=6.0, height=5.0, ribs=5,
                tier=1, side=1, name="breast")
    p += flayed("wing_r", at=(-0.8, 2.5, 2.0), length=6.0, height=3.0, ribs=4,
                tier=2, side=-1, viscera=False, name="pinion")
    p += lolling_tongue("head", at=(0.0, 3.0, -3.0), tier=1, segments=4, thick=1.0)
    p += eye_stalks("comb", at=(0.0, -2.0, 0.0), count=4, tier=2, spread=1.4,
                    length=2.4)
    p += grafted_arm("body", at=(3.2, 2.0, -2.0), tier=2, side=1, scale=0.7,
                     name="arm_l")
    p += eye_cluster("head", at=(0.0, 2.0, -3.2), count=3, tier=1,
                     spread=(1.6, 1.4), size=2.0)
    return _m("blighted_chicken", p)


def blighted_spider() -> Model:
    p = spider_host()
    p += split_open("abdomen", at=(0.0, 0.0, 4.0), width=7.0, height=6.0, tier=1,
                    depth=2.4, name="sac")
    p += flayed("abdomen", at=(4.0, 0.0, 0.0), length=8.0, height=6.0, ribs=5,
                tier=2, side=1, viscera=False, name="carapace")
    p += lolling_tongue("head", at=(0.0, 2.0, -7.0), tier=1, segments=5, thick=1.2)
    p += resin_growth("abdomen", at=(0.0, -4.5, 0.0), size=(5, 4, 6), tier=1)
    for side in (-1, 1):
        p += extra_legs("abdomen", at=(side * 4.5, 0.0, 2.0), tier=2, count=2,
                        length=10.0, side=side,
                        name="legs_r" if side < 0 else "legs_l")
    p += eye_stalks("head", at=(0.0, -3.5, -5.0), count=4, tier=2, spread=3.0,
                    length=2.8)
    p += eye_cluster("head", at=(0.0, -1.0, -8.2), count=6, tier=1,
                     spread=(3.4, 2.6), size=2.4)
    return _m("blighted_spider", p)


def blighted_creeper() -> Model:
    p = creeper_host()
    p += split_open("body", at=(0.0, 6.0, -2.0), width=6.0, height=8.0, tier=1,
                    depth=2.6, name="cask")
    p += flayed("body", at=(-4.0, 8.0, 1.0), length=9.0, height=7.0, ribs=6,
                tier=2, side=-1, name="seam")
    p += resin_growth("body", at=(0.0, 2.0, 2.5), size=(6, 5, 4), tier=1)
    p += lolling_tongue("head", at=(0.0, 6.0, -4.0), tier=1, segments=5, thick=1.2)
    p += eye_stalks("body", at=(0.0, 1.0, 2.0), count=4, tier=2, spread=3.0,
                    length=3.0)
    p += eye_cluster("head", at=(0.0, 3.0, -4.2), count=4, tier=1,
                     spread=(3.0, 3.0), size=2.6)
    return _m("blighted_creeper", p)


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


# ---------------------------------------------------------------------------
# The abstracts. These are what the blight builds when it stops copying.
#
# Everything else in this mod is a hijacked animal, and hijacked animals are
# limited by the animal. An abstract has no host and no body plan to respect,
# which is exactly why it is the dangerous end of the bestiary: nothing about
# its shape has to make sense, and nothing about it is symmetrical.
# ---------------------------------------------------------------------------


def the_choir() -> Model:
    """A column of fused throats. It is the sound that reaches you first.

    No limbs at all - it moves by growing forward and rotting behind. What it
    has instead is mouths: nineteen of them, at every height, all open, all
    facing different directions.
    """
    parts = [
        Part("stalk", "root", (0.0, GROUND - 4.0, 0.0), (0, 0, 0),
             [Box((-6, -34, -6), (12, 34, 12), "sinew")]),
        Part("bell", "stalk", (0.0, -34.0, 0.0), (0, 0, 0),
             [Box((-9, -10, -9), (18, 12, 18), "flesh")]),
    ]
    for i in range(19):
        f = i / 18.0
        a = i * 2.399963          # golden angle, so nothing lines up
        r = 5.0 + 3.5 * math.sin(f * 5.0)
        y = -3.0 - f * 38.0
        tag = f"maw{i}"
        parts.append(Part(tag, "stalk", (math.sin(a) * r, y, math.cos(a) * r),
                          (math.sin(a * 1.7) * 30 * D, -a, math.cos(a) * 24 * D),
                          [Box((-2.8, -2.6, -4.6), (5.6, 5.2, 5.0), "rot")]))
        parts.append(Part(f"{tag}_jaw", tag, (0.0, 2.0, -3.6), (34 * D, 0, 0),
                          [Box((-2.4, 0, -3.4), (4.8, 1.8, 3.6), "tongue")]))
        for k in range(4):
            parts.append(Part(f"{tag}_t{k}", tag, (-1.8 + k * 1.2, -2.2, -4.0),
                              (0, 0, 0),
                              [Box((-0.45, 0, -0.45), (0.9, 2.0 + (k % 2), 0.9),
                                   "tooth")]))
    parts += chain("root_a", "stalk", (0.0, 0.0, 0.0), 4, (5.0, 6.0, 5.0),
                   "bark", taper=0.8, curl=(0, 12 * D, 14 * D),
                   root_rot=(30 * D, 0, 40 * D))
    parts += chain("root_b", "stalk", (0.0, 0.0, 0.0), 4, (4.4, 6.0, 4.4),
                   "bark", taper=0.8, curl=(0, -14 * D, -12 * D),
                   root_rot=(-24 * D, 0, -46 * D))
    parts += eye_stalks("bell", at=(0.0, -10.0, 0.0), count=7, tier=0,
                        spread=6.0, length=5.0, name="crown")
    return _m("the_choir", parts, tex=256)


def the_harrow() -> Model:
    """Legs, and a socket where a body should be. It walks over you.

    Seven legs of three different lengths around a suspended amber sac. There
    is no front. It does not turn to face you because every direction is
    already the front.
    """
    parts = [
        Part("hub", "root", (0.0, GROUND - 26.0, 0.0), (0, 0, 0),
             [Box((-7, -7, -7), (14, 14, 14), "chitin")]),
        Part("sac", "hub", (0.0, 5.0, 0.0), (0, 0, 0),
             [Box((-5.5, 0, -5.5), (11, 13, 11), "amberglow")]),
        Part("ring", "hub", (0.0, 0.0, 0.0), (0, 0, 0),
             [Box((-9, -2, -9), (18, 4, 18), "bark")]),
    ]
    for i in range(7):
        a = (2 * math.pi * i) / 7
        length = (17.0, 24.0, 11.0)[i % 3]
        thick = 3.4 - 0.5 * (i % 3)
        parts += chain(f"leg{i}", "hub", (math.sin(a) * 8.0, 0.0, math.cos(a) * 8.0),
                       4, (thick, length * 0.34, thick), "bark", taper=0.82,
                       curl=(0, 0, 46 * D),
                       root_rot=(math.cos(a) * -64 * D, -a, math.sin(a) * 64 * D))
        parts.append(Part(f"claw{i}", f"leg{i}_3", (0.0, length * 0.28, 0.0),
                          (0, 0, 0),
                          [Box((-1.0, 0, -1.0), (2.0, 5.0, 2.0), "tooth")]))
    parts += eye_cluster("sac", at=(0.0, 6.0, -5.4), count=6, tier=0,
                         spread=(5.0, 5.0), size=3.0, name="sacked")
    parts += chain("drip", "sac", (0.0, 13.0, 0.0), 4, (2.4, 4.0, 2.4), "amber",
                   taper=0.76, curl=(4 * D, 0, 3 * D))
    return _m("the_harrow", parts, tex=256)


def the_lacuna() -> Model:
    """A hole in the shape of an animal, held open by resin.

    The blight took a host and then took the host away. What is left is the
    negative: a shell of hardened sap in the outline of something four-legged,
    with nothing inside it but eyes and the strands holding the gap apart.
    """
    parts = [
        # Edges only. The first version used slabs three thick and the outline
        # filled itself in - it read as a solid crate rather than as a gap.
        # These are struts along the edges of the volume, and the space
        # between them is the entire point of the creature.
        Part("shell", "root", (0.0, 4.0, 0.0), (0, 0, 0),
             [Box((sx * 7.2 - 0.9, sy * 6.5 + 6.5 - 0.9, -13), (1.8, 1.8, 26), "amber")
              for sx in (-1, 1) for sy in (-1, 1)]
             + [Box((sx * 7.2 - 0.9, 0, sz * 12.1 + 12.1 - 0.9), (1.8, 15, 1.8), "amber")
                for sx in (-1, 1) for sz in (-1, 1)]
             + [Box((-7.2, sy * 6.5 + 6.5 - 0.9, sz * 12.1 + 12.1 - 0.9),
                    (14.4, 1.8, 1.8), "amber")
                for sy in (-1, 1) for sz in (-1, 1)]),
        Part("skull", "shell", (0.0, 1.0, -13.0), (0, 0, 0),
             [Box((sx * 4.3 - 0.8, sy * 5.2 + 5.2 - 0.8, -9), (1.6, 1.6, 9), "amber")
              for sx in (-1, 1) for sy in (-1, 1)]
             + [Box((-4.3, sy * 5.2 + 5.2 - 0.8, -9), (8.6, 1.6, 1.6), "amber")
                for sy in (-1, 1)]),
    ]
    # Strands holding the void open, at random angles.
    for i in range(11):
        f = i / 10.0
        a = i * 2.399963
        parts.append(Part(f"strand{i}", "shell",
                          (math.sin(a) * 5.5, 2.0 + f * 10.0, -11.0 + f * 22.0),
                          (0, 0, math.cos(a) * 40 * D),
                          [Box((-0.7, 0, -0.7), (1.4, 11.0, 1.4), "amber")]))
    # And the eyes, floating in the space where the animal used to be.
    for i in range(9):
        a = i * 2.399963
        f = i / 8.0
        parts.append(Part(f"void_eye{i}", "shell",
                          (math.sin(a) * 4.0, 4.0 + f * 7.0, -10.0 + f * 20.0),
                          (0, -a, 0),
                          [Box((-2.0, -2.0, -2.0), (4.0, 4.0, 4.0), "eye:void")]))
    for tag, sx, sz in (("fr", -1, -1), ("fl", 1, -1), ("br", -1, 1), ("bl", 1, 1)):
        parts += chain(f"leg_{tag}", "shell", (sx * 6.0, 14.0, sz * 9.0), 3,
                       (3.0, 4.0, 3.0), "amber", taper=0.86,
                       curl=(sz * 6 * D, 0, sx * 4 * D))
    return _m("the_lacuna", parts, tex=256)


# ---------------------------------------------------------------------------
# The taken. Four things the blight should never have been able to reach, and
# did. Each is built from its own vanilla silhouette rather than from a shared
# boss template, because the horror of these is recognition.
# ---------------------------------------------------------------------------


def blighted_warden() -> Model:
    """It was already blind. Now it is full of eyes and cannot use them.

    Keeps the Warden's build exactly - the enormous shoulders, the low-slung
    ribcage, the long arms, the head with nothing on the front of it - and
    puts the thing it lacked into it. The sensory tendrils are replaced with
    branching antler roots, and the chest cavity is a lantern.
    """
    parts = [
        Part("body", "root", (0.0, GROUND - 34.0, 0.0), (0, 0, 0),
             [Box((-9, -20, -6), (18, 21, 12), "sculkflesh")]),
        Part("ribs", "body", (0.0, -13.0, -6.2), (0, 0, 0),
             [Box((-7, -8, -1.4), (14, 16, 2), "rot")]),
        Part("lantern", "ribs", (0.0, 0.0, -1.6), (0, 0, 0),
             [Box((-4.5, -5.5, -2.4), (9, 11, 3), "amberglow")]),
        # Shoulders: the Warden's defining mass.
        Part("shoulders", "body", (0.0, -20.0, 0.0), (0, 0, 0),
             [Box((-13, -8, -7), (26, 9, 14), "sculkflesh")]),
        Part("head", "shoulders", (0.0, -8.0, 0.0), (0, 0, 0),
             [Box((-5, -8, -5), (10, 8, 10), "sculkflesh")]),
        # No eyes on the face. That was true before and it is still true.
        Part("face_jaw", "head", (0.0, -1.0, -5.0), (18 * D, 0, 0),
             [Box((-4, 0, -4), (8, 3, 4), "rot")]),
    ]
    for i in range(6):
        parts.append(Part(f"fang{i}", "face_jaw", (-3.0 + i * 1.2, -0.5, -3.0),
                          (0, 0, 0),
                          [Box((-0.5, -2.4, -0.5), (1, 2.4, 1), "tooth")]))
    # Six ribs peeled off the cage.
    for i in range(6):
        for side in (-1, 1):
            parts.append(Part(f"rib{i}{'r' if side < 0 else 'l'}", "body",
                              (side * 6.0, -19.0 + i * 3.0, -6.4),
                              (0, 0, side * (22 + 8 * i) * D),
                              [Box((-1.4, -1.0, -1.6), (2.8, 10.0, 2.6), "tooth")]))
    # Antler roots where the sensory tendrils were.
    for side in (-1, 1):
        tag = "r" if side < 0 else "l"
        parts += chain(f"tendril_{tag}", "head", (side * 3.5, -8.0, -1.0), 4,
                       (2.4, 7.0, 2.4), "bark", taper=0.78,
                       curl=(-12 * D, side * 10 * D, side * 14 * D),
                       root_rot=(-30 * D, side * 20 * D, side * 34 * D))
        parts += chain(f"arm_{tag}", "shoulders", (side * 13.0, -3.0, 0.0), 4,
                       (6.0, 12.0, 6.0), "sculkflesh", taper=0.88,
                       curl=(8 * D, 0, side * 6 * D),
                       root_rot=(12 * D, 0, side * 14 * D))
        parts += _giant_hand(f"claw_{tag}", f"arm_{tag}_3", (0.0, 9.0, 0.0), 0.55, 1.0)
        parts += chain(f"leg_{tag}", "root", (side * 5.0, GROUND - 15.0, 0.0), 3,
                       (5.5, 6.0, 5.5), "sculkflesh", taper=0.9)
    parts += eye_cluster("shoulders", at=(0.0, -6.0, -7.2), count=7, tier=0,
                         spread=(11.0, 3.0), size=3.0, name="shouldereyes")
    parts += eye_stalks("body", at=(0.0, -20.0, 6.0), count=5, tier=0,
                        spread=7.0, length=5.0, name="backstalks")
    parts += lolling_tongue("face_jaw", at=(0.0, 1.0, -2.5), tier=0, segments=8,
                            thick=1.6, name="tongue")
    return _m("blighted_warden", parts, tex=256)


def blighted_wither() -> Model:
    """Three skulls, and the resin grew a fourth that does not fit.

    The ribcage and the three heads on their spine are kept; what changes is
    that it is no longer floating. Roots have grown down out of the spine and
    taken the weight, so it stands - and the fourth skull hangs underneath on
    a stalk, upside down, still working.
    """
    parts = [
        Part("spine", "root", (0.0, GROUND - 40.0, 0.0), (0, 0, 0),
             [Box((-3, -4, -3), (6, 24, 6), "bonewood")]),
        Part("ribcage", "spine", (0.0, -4.0, 0.0), (0, 0, 0),
             [Box((-11, -3, -3), (22, 6, 6), "bonewood")]),
    ]
    for i in range(5):
        for side in (-1, 1):
            parts.append(Part(f"rib{i}{'r' if side < 0 else 'l'}", "ribcage",
                              (side * (3.0 + i * 1.6), 2.0, 0.0),
                              (0, 0, side * (14 + 12 * i) * D),
                              [Box((-1.1, 0, -1.4), (2.2, 12.0 - i * 1.4, 2.8),
                                   "bonewood")]))
    # Three skulls on the crossbar, plus a fourth slung underneath.
    for k, (x, sc) in enumerate(((0.0, 1.0), (-9.0, 0.78), (9.0, 0.78))):
        tag = f"skull{k}"
        parts.append(Part(tag, "ribcage", (x, -3.0, 0.0),
                          (0, (k - 1) * 16 * D, (k - 1) * -6 * D),
                          [Box((-5 * sc, -9 * sc, -5 * sc), (10 * sc, 9 * sc, 10 * sc),
                               "bonewood")]))
        parts.append(Part(f"{tag}_jaw", tag, (0.0, -1.5 * sc, -4.0 * sc),
                          (16 * D, 0, 0),
                          [Box((-4 * sc, 0, -4 * sc), (8 * sc, 2.6 * sc, 4.5 * sc),
                               "rot")]))
        for i in range(5):
            parts.append(Part(f"{tag}_t{i}", f"{tag}_jaw",
                              (-3.0 * sc + i * 1.5 * sc, -0.4, -3.2 * sc), (0, 0, 0),
                              [Box((-0.5, -2.2 * sc, -0.5), (1, 2.2 * sc, 1), "tooth")]))
        for side in (-1, 1):
            parts.append(Part(f"{tag}_eye_{'r' if side < 0 else 'l'}", tag,
                              (side * 2.4 * sc, -5.0 * sc, -5.0 * sc), (0, 0, 0),
                              [Box((-1.8 * sc, -1.8 * sc, -1.2), (3.6 * sc, 3.6 * sc, 1.4),
                                   "eye:bloom")]))
    # The fourth: hanging under the cage on a stalk, inverted.
    parts += chain("gullet", "ribcage", (2.0, 4.0, 1.0), 4, (3.0, 5.0, 3.0),
                   "sinew", taper=0.86, curl=(6 * D, 0, -8 * D),
                   root_rot=(10 * D, 0, -14 * D))
    parts.append(Part("skull3", "gullet_3", (0.0, 4.0, 0.0), (math.pi, 0, 0.4),
                      [Box((-4, 0, -4), (8, 8, 8), "bonewood")]))
    parts.append(Part("skull3_jaw", "skull3", (0.0, 7.0, -3.0), (-26 * D, 0, 0),
                      [Box((-3.4, 0, -3.6), (6.8, 2.4, 4.0), "rot")]))
    parts += eye_cluster("skull3", at=(0.0, 3.0, -4.2), count=5, tier=0,
                         spread=(3.2, 3.2), size=2.6, name="undereyes")
    # Roots taking the weight it used to not need.
    for i in range(5):
        a = (2 * math.pi * i) / 5 + 0.4
        parts += chain(f"root{i}", "spine", (math.sin(a) * 3.0, 20.0, math.cos(a) * 3.0),
                       4, (3.2, 6.0, 3.2), "bark", taper=0.84,
                       curl=(0, 0, 10 * D),
                       root_rot=(math.cos(a) * 26 * D, -a, math.sin(a) * 26 * D))
    return _m("blighted_wither", parts, tex=256)


def blighted_dragon() -> Model:
    """Grounded. The wings set into resin before it could land properly.

    The Ender Dragon's proportions are kept - the long neck, the deep chest,
    the whip tail - but the membranes have hardened into amber sheets that no
    longer fold, so it drags them. It walks now. That is worse.
    """
    parts = [
        Part("chest", "root", (0.0, GROUND - 30.0, 0.0), (0, 0, 0),
             [Box((-9, -12, -14), (18, 14, 28), "dragonhide")]),
        Part("hips", "chest", (0.0, -2.0, 14.0), (0, 0, 0),
             [Box((-7, -8, 0), (14, 10, 14), "dragonhide")]),
    ]
    # Neck: five segments, rising then levelling.
    parts += chain("neck", "chest", (0.0, -9.0, -14.0), 5, (7.0, 8.0, 7.0),
                   "dragonhide", taper=0.88, curl=(-14 * D, 0, 0),
                   root_rot=(-58 * D, 0, 0))
    parts.append(Part("head", "neck_4", (0.0, 7.0, 0.0), (44 * D, 0, 0),
                      [Box((-5, -5, -13), (10, 9, 14), "dragonhide")]))
    parts.append(Part("face_jaw", "head", (0.0, 3.5, -11.0), (20 * D, 0, 0),
                      [Box((-4, 0, -9), (8, 3, 10), "rot")]))
    for i in range(7):
        parts.append(Part(f"fang{i}", "head", (-3.6 + i * 1.2, 4.0, -11.0 + (i % 2) * 1.5),
                          (0, 0, 0),
                          [Box((-0.55, 0, -0.55), (1.1, 3.2, 1.1), "tooth")]))
    for side in (-1, 1):
        tag = "r" if side < 0 else "l"
        parts.append(Part(f"horn_{tag}", "head", (side * 4.0, -4.0, -3.0),
                          (-24 * D, side * 16 * D, side * 26 * D),
                          [Box((-1.4, -9, -1.4), (2.8, 9, 2.8), "tooth")]))
        parts += eye_cluster("head", at=(side * 4.6, -1.0, -7.0), count=3, tier=0,
                             spread=(1.4, 3.0), size=2.8, out=side * 0.8,
                             name=f"eyes_{tag}")
        # Wing: an arm, then hardened amber sheets between the fingers.
        parts += chain(f"wing_{tag}", "chest", (side * 9.0, -10.0, -6.0), 3,
                       (5.0, 14.0, 5.0), "dragonhide", taper=0.85,
                       curl=(0, side * -10 * D, side * 16 * D),
                       root_rot=(-14 * D, side * 20 * D, side * 68 * D))
        for k in range(4):
            parts.append(Part(f"sheet_{tag}{k}", f"wing_{tag}_2",
                              (0.0, 6.0, -6.0 + k * 4.0),
                              (0, side * (10 + k * 9) * D, side * 8 * D),
                              [Box((-0.8 if side < 0 else -0.2, -2.0, -1.6),
                                   (1.0, 20.0 - k * 3.0, 3.2), "amber")]))
        parts += chain(f"leg_{tag}", "root", (side * 7.0, GROUND - 14.0, -6.0), 3,
                       (5.0, 5.5, 5.0), "dragonhide", taper=0.88)
        parts += chain(f"hind_{tag}", "root", (side * 6.0, GROUND - 16.0, 12.0), 3,
                       (5.5, 6.5, 5.5), "dragonhide", taper=0.88)
    parts += chain("tail", "hips", (0.0, -2.0, 14.0), 7, (6.0, 9.0, 6.0),
                   "dragonhide", taper=0.82, curl=(3 * D, 0, 2 * D),
                   root_rot=(-8 * D, 0, 0))
    parts += spine_plates("chest", from_z=-12.0, to_z=12.0, y=-12.0, count=8,
                          tier=0, height=5.0, name="crest")
    return _m("blighted_dragon", parts, tex=512)


def blighted_enderman() -> Model:
    """Too tall for the room, and it stopped being able to leave.

    The silhouette is intact: the absurd height, the thin limbs, the small
    head. The blight has jammed the teleport - resin has grown through the
    joints - so the limbs now hang at lengths that do not match, and it walks
    everywhere, slowly, on legs that are no longer the same size.
    """
    parts = [
        Part("body", "root", (0.0, GROUND - 44.0, 0.0), (0, 0, 0),
             [Box((-4, -20, -3), (8, 20, 6), "voidflesh")]),
        Part("head", "body", (0.0, -20.0, 0.0), (0, 0, 0),
             [Box((-4, -8, -4), (8, 8, 8), "voidflesh")]),
        Part("face_jaw", "head", (0.0, -1.0, -4.0), (24 * D, 0, 0),
             [Box((-3, 0, -4), (6, 2.6, 4.5), "rot")]),
    ]
    for i in range(6):
        parts.append(Part(f"fang{i}", "face_jaw", (-2.2 + i * 0.9, -0.4, -3.2),
                          (0, 0, 0),
                          [Box((-0.4, -2.0, -0.4), (0.8, 2.0, 0.8), "tooth")]))
    # The signature: two burning eyes, wide apart, and now a third above.
    for side in (-1, 1):
        parts.append(Part(f"eye_{'r' if side < 0 else 'l'}", "head",
                          (side * 2.4, -4.6, -4.2), (0, 0, 0),
                          [Box((-2.0, -1.2, -0.8), (4.0, 2.4, 1.0), "eye:void")]))
    parts.append(Part("eye_third", "head", (0.0, -7.2, -3.4), (0, 0, 0),
                      [Box((-1.6, -1.6, -1.4), (3.2, 3.2, 1.6), "eye:bloom")]))
    parts += eye_stalks("head", at=(0.0, -8.0, 0.0), count=4, tier=0, spread=2.6,
                        length=4.0, name="crown")
    # Limbs of deliberately mismatched length - the joints are full of resin.
    for side, tag in ((-1, "r"), (1, "l")):
        arm_len = 15.0 if side < 0 else 12.0
        parts += chain(f"arm_{tag}", "body", (side * 5.0, -18.0, 0.0), 3,
                       (2.6, arm_len, 2.6), "voidflesh", taper=0.94,
                       curl=(4 * D, 0, side * 3 * D),
                       root_rot=(6 * D, 0, side * 8 * D))
        parts += _giant_hand(f"hand_{tag}", f"arm_{tag}_2",
                             (0.0, arm_len * 0.88, 0.0), 0.34, 0.8)
        leg_len = 13.0 if side < 0 else 15.5
        parts += chain(f"leg_{tag}", "root", (side * 2.4, GROUND - leg_len * 2.2, 0.0),
                       3, (3.0, leg_len, 3.0), "voidflesh", taper=0.92,
                       curl=(0, 0, side * 2 * D))
        # Resin welded into the joints, which is why it cannot fold.
        for k in range(3):
            # chain() names its first link without a suffix.
            link = f"leg_{tag}" if k == 0 else f"leg_{tag}_{k}"
            parts.append(Part(f"weld_{tag}{k}", link,
                              (0.0, leg_len * 0.4, 0.0), (0, 0, 0),
                              [Box((-2.4, -2.0, -2.4), (4.8, 4.0, 4.8), "amber")]))
    parts += chain("drape", "body", (0.0, -19.0, 3.0), 5, (5.0, 6.0, 2.0),
                   "amber", taper=0.86, curl=(4 * D, 0, 2 * D))
    return _m("blighted_enderman", parts, tex=256)


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
    """The body: hunched, narrow, arboreal - not a gorilla.

    The previous version was a forty-six-wide horizontal slab of chest with a
    tiny head sunk into it and heavy arms hanging off either side, which is
    the exact silhouette of a great ape and read as one. Everything here is
    turned ninety degrees away from that:

      * the trunk is **narrow and tall**, splintered like standing deadwood,
        with the mass in the vertical rather than across the shoulders
      * the shoulders are **hunched above the head**, the way a vulture stands,
        so the skull sits in a well between them
      * the skull is **elongated and thrust forward** on a short thick neck -
        a long jaw and deep sockets, not a cube
      * the six arms all hang **forward and down** at different lengths, the
        longest reaching past the ground line, and they are deliberately not
        mirrored. Symmetry reads as designed; this should read as grown
      * the crown is **swept-back antlers**, not a disc

    What survives from the old one is the open chest cavity with the heart in
    it, because that part was working.
    """
    parts: list[Part] = []

    root_y = -34.0 if legs else -26.0
    # Trunk: narrow, tall, and leaning forward over its own feet.
    parts.append(Part("torso", "root", (0.0, root_y, 0.0), (-9 * D, 0, 0),
                      [Box((-11, -20, -9), (22, 24, 18), "heartwood"),
                       Box((-12.5, -14, -10), (25, 8, 20), "bark")]))
    # Chest stays narrow; the height does the work.
    parts.append(Part("chest", "torso", (0.0, -20.0, 0.0), (-7 * D, 0, 0),
                      [Box((-13, -26, -10), (26, 28, 20), "heartwood")]))
    # Splintered staves running up the trunk, standing off the surface.
    for i in range(7):
        a = (2 * math.pi * i) / 7 + 0.3
        parts.append(Part(f"stave{i}", "chest",
                          (math.sin(a) * 12.0, -12.0, math.cos(a) * 9.0),
                          (0, -a, math.sin(a) * 9 * D),
                          [Box((-1.8, -15, -1.8), (3.6, 30, 3.6), "bark")]))

    # Ribcage, standing open. Ribs curl further as they descend.
    for i in range(6):
        f = i / 5.0
        for side in (-1, 1):
            parts.append(Part(f"rib{i}{'r' if side < 0 else 'l'}", "chest",
                              (side * 5.0, -22.0 + i * 3.6, -10.4),
                              (0, 0, side * (26 + 26 * f) * D),
                              [Box((-1.6, -1.2, -1.8), (3.2, 13.0 - 3.0 * f, 3.0),
                                   "tooth")]))
    parts.append(Part("cavity", "chest", (0.0, -14.0, -10.6), (0, 0, 0),
                      [Box((-6.5, -9, -1.2), (13, 18, 2), "rot")]))
    parts.append(Part("heart", "cavity", (0.0, 0.0, -1.6), (0, 0, 0),
                      [Box((-4.5, -6, -2.4), (9, 12, 3), "amberglow")]))
    for i in range(8):
        a = (2 * math.pi * i) / 8
        parts.append(Part(f"chesteye{i}", "cavity",
                          (math.sin(a) * 5.0, math.cos(a) * 7.4, -2.2), (0, 0, 0),
                          [Box((-1.7, -1.7, -1.0), (3.4, 3.4, 1.0), "eye:bloom")]))
    # Gut hanging out of the bottom of the cage.
    parts.append(Part("viscera", "chest", (1.5, -2.0, -9.0), (0, 0, 0),
                      [Box((-4, -3, -3), (8, 11, 6), "flesh")]))
    parts.append(Part("viscera2", "viscera", (0.0, 8.0, 0.0), (14 * D, 0, -12 * D),
                      [Box((-2.6, 0, -2.2), (5.2, 9, 4.4), "sinew")]))

    # --- shoulders, hunched above the head ------------------------------
    for side, tag in ((-1, "r"), (1, "l")):
        hunch = 5.0 if side < 0 else 2.0     # not level; nothing here is
        parts.append(Part(f"delt_{tag}", "chest",
                          (side * 12.0, -26.0 - hunch, -1.0),
                          (0, 0, side * -34 * D),
                          [Box((-9 if side < 0 else 0, -12, -9), (9, 20, 18),
                               "bark"),
                           Box((-8 if side < 0 else 1, -14, -8), (7, 5, 16),
                               "chitin")]))
        # Spines off the shoulder caps.
        for k in range(3):
            parts.append(Part(f"spur_{tag}{k}", f"delt_{tag}",
                              (side * 5.0, -11.0 + k * 4.0, -4.0 + k * 4.0),
                              (0, 0, side * -58 * D),
                              [Box((-1.2, -9 + k * 1.6, -1.2), (2.4, 9 - k * 1.6, 2.4),
                                   "tooth")]))

    # --- growth that ignores the body plan ------------------------------
    # Branches out of the torso at angles no skeleton would produce, some
    # ending in nothing. This is the part that stops it reading as a big man:
    # the outline never resolves into a shape you can name.
    for i in range(9):
        a = i * 2.399963                     # golden angle - never repeats
        f = i / 8.0
        parts += chain(f"bough{i}", "chest",
                       (math.sin(a) * 11.0, -6.0 - f * 20.0, math.cos(a) * 8.0),
                       3 + (i % 3), (3.4 - f * 1.2, 9.0 + f * 5.0, 3.4 - f * 1.2),
                       "bark", taper=0.8,
                       curl=(math.cos(a) * 14 * D, math.sin(a) * 10 * D,
                             math.sin(a * 1.3) * 18 * D),
                       root_rot=(math.cos(a) * 56 * D, -a,
                                 math.sin(a) * 62 * D))
    # A second, half-formed ribcage growing out of the left flank, as if the
    # thing tried to build another one of itself and stopped.
    parts.append(Part("twin", "chest", (14.0, -16.0, -2.0), (0, -34 * D, 24 * D),
                      [Box((-6, -12, -7), (12, 16, 14), "heartwood")]))
    for i in range(4):
        parts.append(Part(f"twinrib{i}", "twin", (0.0, -10.0 + i * 3.2, -7.2),
                          (0, 0, (34 + 16 * i) * D),
                          [Box((-1.4, -1.0, -1.4), (2.8, 9.0, 2.4), "tooth")]))
    parts.append(Part("twineye", "twin", (0.0, -4.0, -7.6), (0, 0, 0),
                      [Box((-2.6, -2.6, -1.2), (5.2, 5.2, 1.4), "eye:bloom")]))

    # --- the head: long skull thrust forward ----------------------------
    parts.append(Part("neckstalk", "chest", (0.0, -24.0, -3.0), (26 * D, 0, 0),
                      [Box((-4.5, -9, -4.5), (9, 10, 9), "sinew")]))
    parts.append(Part("head", "neckstalk", (0.0, -9.0, 0.0), (14 * D, 0, 0),
                      [Box((-6, -8, -15), (12, 11, 17), "palewood")]))
    # The skull is not a mask sitting on a neck - it is still partly the tree.
    # Splinters run back out of it into the shoulders, and it is not level.
    for i in range(5):
        a = i * 2.399963
        parts.append(Part(f"splinter{i}", "head",
                          (math.sin(a) * 5.0, -6.0 + i * 1.4, -2.0 + math.cos(a) * 4.0),
                          (math.cos(a) * 30 * D, -a, math.sin(a) * 34 * D),
                          [Box((-1.1, -1.0, -1.1), (2.2, 13.0 - i * 1.5, 2.2), "bark")]))
    # Long upper jaw running out past the skull.
    parts.append(Part("snout", "head", (0.0, 5.0, -15.0), (0, 0, 0),
                      [Box((-4.5, -5, -9), (9, 6, 9), "palewood")]))
    for i in range(7):
        parts.append(Part(f"fang{i}", "snout", (-3.6 + i * 1.2, 1.0, -8.0 + (i % 2)),
                          (0, 0, 0),
                          [Box((-0.6, 0, -0.6), (1.2, 3.4 - (i % 3) * 0.7, 1.2),
                               "tooth")]))
    parts.append(Part("face_jaw", "head", (0.0, 3.0, -13.0), (22 * D, 0, 0),
                      [Box((-4, 0, -10), (8, 3.6, 11), "heartwood")]))
    for i in range(6):
        parts.append(Part(f"jawfang{i}", "face_jaw", (-3.0 + i * 1.2, 0.0, -9.0 + (i % 2)),
                          (0, 0, 0),
                          [Box((-0.55, -3.0, -0.55), (1.1, 3.0, 1.1), "tooth")]))
    parts += lolling_tongue("face_jaw", at=(0.0, 1.6, -6.0), tier=0, segments=7,
                            thick=1.6, name="tongue")
    # Sockets set deep, two on one side and three on the other.
    for side, tag, n in ((-1, "r", 2), (1, "l", 3)):
        for k in range(n):
            parts.append(Part(f"socket_{tag}{k}", "head",
                              (side * (3.4 + k * 1.4), -2.0 + k * 2.6, -9.0 - k * 2.0),
                              (0, side * -22 * D, 0),
                              [Box((-2.2, -2.2, -1.0), (4.4, 4.4, 1.4), "rot")]))
            parts.append(Part(f"eye_{tag}{k}", f"socket_{tag}{k}", (0.0, 0.0, -1.0),
                              (0, 0, 0),
                              [Box((-1.8, -1.8, -1.8), (3.6, 3.6, 2.2), "eye:bloom")]))
    # Antlers: swept back off the skull, forking. Not a crown, not a disc.
    for side in (-1, 1):
        tag = "r" if side < 0 else "l"
        parts += chain(f"antler_{tag}", "head", (side * 4.5, -8.0, -4.0), 4,
                       (2.8, 8.0, 2.8), "bark", taper=0.78,
                       curl=(-16 * D, side * 8 * D, side * 12 * D),
                       root_rot=(-44 * D, side * 24 * D, side * 30 * D))
        parts += chain(f"tine_{tag}", f"antler_{tag}_2", (0.0, 4.0, 0.0), 2,
                       (1.8, 6.0, 1.8), "bark", taper=0.8,
                       curl=(-12 * D, 0, side * 20 * D),
                       root_rot=(-30 * D, 0, side * 46 * D))

    # --- six arms, forward and down, three different lengths ------------
    # (drop, thickness, links, forward swing, out swing)
    SETS = ((-22.0, 9.0, 5, 34, 16), (-12.0, 7.0, 4, 22, 26), (-2.0, 5.0, 3, 12, 40))
    for side, tag in ((-1, "r"), (1, "l")):
        for k, (drop, thick, links, fwd, out) in enumerate(SETS):
            # Break the mirror: one side reaches further than the other.
            skew = 1.0 + (0.16 if side < 0 else -0.10) * (k + 1)
            arm = f"arm{k}_{tag}"
            parts += chain(arm, f"delt_{tag}", (side * 4.0, drop, -2.0), links,
                           (thick, 13.0 * skew, thick), "heartwood", taper=0.86,
                           curl=(9 * D, 0, side * 7 * D),
                           root_rot=(fwd * skew * D, side * 6 * D, side * out * D))
            parts += _giant_hand(f"hand{k}_{tag}", f"{arm}_{links - 1}",
                                 (0.0, 13.0 * skew * 0.86 ** (links - 1), 0.0),
                                 0.5 + 0.16 * (2 - k), 1.0)
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



for _fn in (the_choir, the_harrow, the_lacuna, blighted_warden,
            blighted_wither, blighted_dragon, blighted_enderman):
    BESTIARY[_fn.__name__] = _fn

EYE_FIELDS["the_choir"] = {"stalk": 5, "bell": 3}
EYE_FIELDS["the_harrow"] = {"sac": 4}
EYE_FIELDS["the_lacuna"] = {"shell": 6}
EYE_FIELDS["blighted_warden"] = {"shoulders": 4, "body": 3}
EYE_FIELDS["blighted_wither"] = {"ribcage": 3}
EYE_FIELDS["blighted_dragon"] = {"head": 3, "chest": 2}
EYE_FIELDS["blighted_enderman"] = {"head": 2}

BESTIARY["creaking_hand"] = creaking_hand
BESTIARY["the_creaking"] = the_creaking
BESTIARY["creaking_risen"] = creaking_risen
DISPLAY["creaking_hand"] = ("The Creaking Hand", "all that fits through a gate")
DISPLAY["the_creaking"] = ("The Creaking", "waist-deep in the gold it grew in")
DISPLAY["creaking_risen"] = ("The Creaking, Risen", "what steps into the overworld")
EYE_FIELDS["the_creaking"] = {"torso": 4, "head": 2}
