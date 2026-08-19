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
import vanilla as V
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


# Hosts built from the actual vanilla skeleton.
#
# The rule of this mod is that an infected cow still reads as a cow, and the
# surest way to honour that is to stop re-typing the cow. CI calls each vanilla
# model's createBodyLayer(), walks the mesh and commits the geometry; `vanilla`
# turns that into bench parts. So these are not proportioned *like* the vanilla
# animals - they are the vanilla animals, with resin painted on.
#
# (dump name, materials, legs -> tag, hind legs, bones to drop)
VANILLA_HOSTS = {
    "cow": ("CowModel", {"*": "cow_hide", "head": "cow_white"},
            {"right_front_leg": "fr", "left_front_leg": "fl",
             "right_hind_leg": "br", "left_hind_leg": "bl"}, ()),
    "pig": ("PigModel", {"*": "pig_skin"},
            {"right_front_leg": "fr", "left_front_leg": "fl",
             "right_hind_leg": "br", "left_hind_leg": "bl"}, ()),
    "sheep": ("SheepModel", {"*": "sheep_face"},
              {"right_front_leg": "fr", "left_front_leg": "fl",
               "right_hind_leg": "br", "left_hind_leg": "bl"}, ()),
    "goat": ("GoatModel", {"*": "goat_fur", "left_horn": "tooth",
                           "right_horn": "tooth", "nose": "goat_fur"},
             {"right_front_leg": "fr", "left_front_leg": "fl",
              "right_hind_leg": "br", "left_hind_leg": "bl"}, ()),
    # Mojang split the animals into Adult*/Baby*/Cold* variants, so the adult
    # geometry lives under a different class name than the folder suggests.
    "chicken": ("AdultChickenModel",
                {"*": "feather", "beak": "beak", "red_thing": "comb_red",
                 "left_leg": "beak", "right_leg": "beak"},
                {"right_leg": "r", "left_leg": "l"}, ()),
    "fox": ("AdultFoxModel", {"*": "fox_fur", "nose": "fox_snout"},
            {"right_front_leg": "fr", "left_front_leg": "fl",
             "right_hind_leg": "br", "left_hind_leg": "bl"}, ()),
    "rabbit": ("AdultRabbitModel", {"*": "rabbit_fur", "nose": "rabbit_nose"},
               {"right_front_leg": "fr", "left_front_leg": "fl",
                "right_hind_leg": "br", "left_hind_leg": "bl"},
               ("backlegs", "frontlegs")),
    "creeper": ("CreeperModel", {"*": "creeper_skin"},
                {"right_front_leg": "fr", "left_front_leg": "fl",
                 "right_hind_leg": "br", "left_hind_leg": "bl"}, ()),
    "llama": ("LlamaModel", {"*": "llama_fur"},
              {"right_front_leg": "fr", "left_front_leg": "fl",
               "right_hind_leg": "br", "left_hind_leg": "bl"},
              ("chest",)),
}

# Bones whose rest rotation is a baked-in pose rather than a shape, and the
# bone that actually carries the skull when it is not the one called `head`.
VANILLA_FLAT = {"goat": ("nose",)}
VANILLA_SKULL = {"goat": "nose", "chicken": "head"}


def vanilla_quad(host: str, *, eye_style: str = "round", spares: int = 3,
                 head: str | None = None) -> list[Part]:
    """A vanilla quadruped, jointed and given a face."""
    model, mats, legs, skip = VANILLA_HOSTS[host]
    head = head or VANILLA_SKULL.get(host, "head")
    parts = V.vanilla_host(model, mats=mats, skip=skip)
    parts = V.flatten(parts, VANILLA_FLAT.get(host, ()))
    hind = {n for n, t in legs.items() if t.startswith("b")}
    parts = V.jointify(parts, legs, hind=hind)
    # Vanilla hangs the head off root alongside the body. The gait drops and
    # rolls the body every stride, so anything that is merely a sibling gets
    # left behind - which is why heads and tails appeared to come loose.
    moves = {"head": "body", "tail": "body", "tailfan": "body", "neck": "body"}
    loose = {p.name for p in parts if p.parent == "root" and p.name in moves}
    if loose:
        # Only worth splitting the body if something is about to be hung on it.
        # The body is modelled upright and laid down with a 90-degree rotation;
        # a head re-hung on that inherits the lie-down, which is exactly how
        # heads ended up on the wrong side of their animals.
        parts = V.unrotate(parts, ("body",))
    parts = V.reparent(parts, moves)
    # Measure the head off the geometry rather than assuming it. The *biggest*
    # box wins, not the first: a goat's head bone lists two ears and a beard
    # before anything skull-shaped, and sizing a face off an ear is how the
    # goat ended up with no visible face at all.
    hw, hh, hd = 8.0, 8.0, 6.0
    for part in parts:
        if part.name == head and part.boxes:
            big = max(part.boxes, key=lambda b: b.size[0] * b.size[1] * b.size[2])
            hw, hh, hd = big.size
            break
    parts += infected_face(head, hw, hh, hd,
                           eye=max(3.0, min(5.0, hw * 0.52)),
                           teeth=5 if hw >= 6 else 4,
                           style=eye_style, spares=spares)
    return parts


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
    p = vanilla_quad("cow")
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
    p = vanilla_quad("pig")
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
    p = vanilla_quad("sheep")
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
    p = vanilla_quad("goat")
    p += flayed("head", at=(0.0, 6.0, 2.0), length=5.0, height=4.0, ribs=4,
                tier=1, side=1, name="throat")
    p += flayed("body", at=(5.0, 4.5, 2.0), length=8.0, height=6.0, ribs=5,
                tier=2, side=1, name="flank")
    p += lolling_tongue("head", at=(0.0, 5.5, -8.5), tier=1, segments=7, thick=1.0)
    p += antler_roots("head", at=(-2.4, 0.0, -2.0), tier=1, side=-1, name="crown_r")
    p += antler_roots("head", at=(2.4, 0.0, -2.0), tier=1, side=1, name="crown_l")
    p += antler_roots("head", at=(0.0, -0.5, -5.0), tier=2, side=1, name="crown_c")
    p += eye_cluster("head", at=(0.0, 1.5, -9.0), count=5, tier=1,
                     spread=(2.2, 3.4), size=2.2)
    p += eye_stalks("head", at=(0.0, 5.0, -1.0), count=3, tier=2, spread=2.0,
                    length=3.2)
    return _m("blighted_goat", p)


def blighted_horse() -> Model:
    """Opened under the barrel. The neck did not stop growing."""
    p = HOSTS["horse"].build()
    p += flayed("body", at=(0.0, 13.0, 2.0), length=15.0, height=6.0, ribs=8,
                tier=1, side=1, name="barrel")
    p += flayed("body", at=(0.0, -2.0, -8.0), length=6.0, height=5.0, ribs=4,
                tier=2, side=-1, name="withers")
    p += lolling_tongue("head", at=(0.0, 4.0, -9.0), tier=1, segments=8, thick=1.2)
    p += spine_plates("body", from_z=-8.0, to_z=9.0, y=0.0, count=8, tier=1,
                      height=3.6)
    p += grafted_arm("body", at=(-5.5, 5.0, -8.0), tier=2, side=-1, scale=1.1,
                     name="arm_r")
    p += grafted_arm("body", at=(5.5, 6.5, -6.0), tier=2, side=1, scale=0.85,
                     name="arm_l")
    p += eye_cluster("head", at=(0.0, 6.0, -3.5), count=5, tier=1,
                     spread=(2.6, 4.0), size=2.4, name="neckeyes")
    return _m("blighted_horse", p)


def blighted_llama() -> Model:
    """The neck is the wound. It carries the whole length of it open."""
    p = vanilla_quad("llama")
    p += flayed("head", at=(0.0, 8.0, 1.6), length=13.0, height=4.2, ribs=9,
                tier=1, side=-1, spine=True, name="throat")
    p += lolling_tongue("head", at=(0.0, 3.5, -8.0), tier=1, segments=9, thick=0.9)
    p += eye_stalks("head", at=(0.0, 14.0, -1.5), count=5, tier=2, spread=2.2,
                    length=3.6)
    p += resin_growth("body", at=(0.0, -1.0, 4.0), size=(6, 5, 5), tier=1)
    p += grafted_arm("head", at=(-3.0, 12.0, 0.0), tier=2, side=-1, scale=0.7,
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
    p = vanilla_quad("fox", eye_style="slit", spares=2)
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
    p = vanilla_quad("rabbit", eye_style="round", spares=3)
    p += flayed("leg_br", at=(-1.6, 2.0, 0.0), length=5.5, height=4.5,
                ribs=4, tier=1, side=-1, name="haunch")
    p += flayed("body", at=(0.0, 2.6, 1.0), length=7.0, height=4.0, ribs=5,
                tier=2, side=1, name="back")
    p += lolling_tongue("head", at=(0.0, 3.0, -4.0), tier=1, segments=5, thick=0.9)
    p += eye_stalks("right_ear", at=(0.0, -4.0, 0.0), count=3, tier=2, spread=1.0,
                    length=2.2)
    # One oversized arm off the back, far too big for the animal carrying it.
    p += grafted_arm("body", at=(2.6, 1.0, 2.0), tier=2, side=1, scale=1.15,
                     name="arm_l")
    p += eye_cluster("head", at=(0.0, 1.0, -5.2), count=4, tier=1,
                     spread=(2.0, 1.6), size=2.0)
    return _m("blighted_rabbit", p)


def blighted_chicken() -> Model:
    """Breast opened, wings stripped back to the bones of the wing."""
    p = vanilla_quad("chicken", eye_style="round", spares=2)
    p += flayed("body", at=(0.0, 3.0, -4.2), length=6.0, height=5.0, ribs=5,
                tier=1, side=1, name="breast")
    p += flayed("right_wing", at=(-0.8, 2.5, 2.0), length=6.0, height=3.0, ribs=4,
                tier=2, side=-1, viscera=False, name="pinion")
    p += lolling_tongue("head", at=(0.0, 3.0, -3.0), tier=1, segments=4, thick=1.0)
    p += eye_stalks("red_thing", at=(0.0, -2.0, 0.0), count=4, tier=2, spread=1.4,
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
    p = vanilla_quad("creeper", eye_style="void", spares=3)
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
    """The Warden, from its own model. It was already blind.

    Every box below is the vanilla Warden's, read out of the Minecraft jar by
    calling WardenModel.createBodyLayer() and walking the mesh - body 18x21x11,
    head 16x16x10, arms 8x28x8 hung at x +/-13, the flat 9x21 ribcage plates and
    the 16x16 tendril quads. Nothing is re-proportioned, because the horror of
    this one is recognition: it has to be unmistakably the Warden before it is
    anything else.

    What the blight adds is the sense it never had. The tendrils it listened
    with have gone woody and branched, the ribcage has been forced open, and
    the chest cavity that used to pulse is now a lantern full of eyes - on a
    creature with no eyes at all.
    """
    parts = [
        Part("bone", "root", (0.0, 24.0, 0.0), (0, 0, 0), []),
        Part("body", "bone", (0.0, -21.0, 0.0), (0, 0, 0),
             [Box((-9, -13, -4), (18, 21, 11), "sculkflesh")]),
        Part("head", "body", (0.0, -13.0, 0.0), (0, 0, 0),
             [Box((-8, -16, -5), (16, 16, 10), "sculkflesh")]),
    ]
    for side, tag in ((-1, "r"), (1, "l")):
        parts.append(Part(f"leg_{tag}", "bone", (side * 5.9, -13.0, 0.0), (0, 0, 0),
                          [Box((-2.9 if side < 0 else -3.1, 0, -3), (6, 13, 6),
                               "sculkflesh")]))
        parts.append(Part(f"arm_{tag}", "body", (side * 13.0, -13.0, 1.0), (0, 0, 0),
                          [Box((-4, 0, -4), (8, 28, 8), "sculkflesh")]))
        # The ribcage plates are flat quads in vanilla. Here they are prised
        # off the chest and given thickness, so the cage stands open.
        parts.append(Part(f"ribcage_{tag}", "body", (side * 7.0, -2.0, -4.0),
                          (0, 0, side * 26 * D),
                          [Box((-7 if side < 0 else -2, -11, -0.6), (9, 21, 1.4),
                               "tooth")]))
        # Sensory tendrils, gone woody and branched.
        parts += chain(f"tendril_{tag}", "head", (side * 8.0, -12.0, 0.0), 4,
                       (2.6, 7.0, 2.6), "bark", taper=0.78,
                       curl=(-14 * D, side * 10 * D, side * 16 * D),
                       root_rot=(-26 * D, side * 18 * D, side * 40 * D))
        parts += _giant_hand(f"claw_{tag}", f"arm_{tag}", (0.0, 28.0, 0.0), 0.6, 1.0)

    # The chest, forced open. It is a lantern now.
    parts.append(Part("cavity", "body", (0.0, -4.0, -4.4), (0, 0, 0),
                      [Box((-7, -9, -1.2), (14, 18, 2), "rot")]))
    parts.append(Part("lantern", "cavity", (0.0, 0.0, -1.6), (0, 0, 0),
                      [Box((-5, -7, -2.4), (10, 14, 3), "amberglow")]))
    for i in range(8):
        a = (2 * math.pi * i) / 8
        parts.append(Part(f"cavityeye{i}", "cavity",
                          (math.sin(a) * 5.2, math.cos(a) * 7.6, -2.2), (0, 0, 0),
                          [Box((-1.7, -1.7, -1.0), (3.4, 3.4, 1.0), "eye:bloom")]))
    # A face on something that has never had one.
    parts.append(Part("face_jaw", "head", (0.0, -1.0, -5.0), (18 * D, 0, 0),
                      [Box((-6, 0, -6), (12, 3.4, 6), "rot")]))
    for i in range(7):
        parts.append(Part(f"fang{i}", "face_jaw", (-4.8 + i * 1.6, -0.4, -4.6),
                          (0, 0, 0),
                          [Box((-0.6, -3.0, -0.6), (1.2, 3.0, 1.2), "tooth")]))
    parts += lolling_tongue("face_jaw", at=(0.0, 1.4, -3.0), tier=0, segments=8,
                            thick=1.7, name="tongue")
    parts += eye_cluster("head", at=(0.0, -8.0, -5.2), count=6, tier=0,
                         spread=(9.0, 4.0), size=3.2, name="faceeyes")
    parts += eye_stalks("body", at=(0.0, -13.0, 7.0), count=5, tier=0,
                        spread=7.0, length=5.0, name="backstalks")
    parts += flayed("body", at=(-9.0, -6.0, 1.0), length=12.0, height=9.0, ribs=6,
                    tier=0, side=-1, spine=True, name="flank")
    return _m("blighted_warden", parts, tex=256)


def blighted_enderman() -> Model:
    """The Enderman, from its own model. It cannot leave any more.

    Vanilla's boxes, exactly: an 8x12x4 body, an 8x8x8 head, and the limbs that
    make it what it is - 2x30x2, two units thick and thirty long. Get those
    wrong and it is just a tall man.

    Resin has grown through the joints and jammed the teleport, so the welds
    are visible at every hinge, and the limbs have been forced to different
    lengths by it. It walks everywhere now. Slowly.
    """
    leg_h, arm_h = 30.0, 30.0
    hip = GROUND - leg_h
    parts = [
        Part("body", "root", (0.0, hip, 0.0), (0, 0, 0),
             [Box((-4, -12, -2), (8, 12, 4), "voidflesh")]),
        Part("head", "body", (0.0, -12.0, 0.0), (0, 0, 0),
             [Box((-4, -8, -4), (8, 8, 8), "voidflesh")]),
        Part("face_jaw", "head", (0.0, -1.0, -4.0), (26 * D, 0, 0),
             [Box((-3, 0, -4), (6, 2.6, 4.5), "rot")]),
    ]
    for i in range(6):
        parts.append(Part(f"fang{i}", "face_jaw", (-2.2 + i * 0.9, -0.4, -3.2),
                          (0, 0, 0),
                          [Box((-0.4, -2.0, -0.4), (0.8, 2.0, 0.8), "tooth")]))
    # The two burning eyes, exactly where vanilla puts them, and a third the
    # blight added above the bridge.
    for side, tag in ((-1, "r"), (1, "l")):
        parts.append(Part(f"eye_{tag}", "head", (side * 2.2, -4.4, -4.2), (0, 0, 0),
                          [Box((-2.0, -1.1, -0.8), (4.0, 2.2, 1.0), "eye:void")]))
    parts.append(Part("eye_third", "head", (0.0, -7.0, -3.2), (0, 0, 0),
                      [Box((-1.6, -1.6, -1.4), (3.2, 3.2, 1.6), "eye:bloom")]))
    parts += eye_stalks("head", at=(0.0, -8.0, 0.0), count=4, tier=0, spread=2.6,
                        length=4.2, name="crown")
    for side, tag in ((-1, "r"), (1, "l")):
        # Jammed to different lengths: 30 on one side, shortened on the other.
        al = arm_h * (1.0 if side < 0 else 0.82)
        ll = leg_h * (0.88 if side < 0 else 1.0)
        parts.append(Part(f"arm_{tag}", "body", (side * 5.0, -10.0, 0.0),
                          (0, 0, side * 4 * D),
                          [Box((-1, -2, -1), (2, al, 2), "voidflesh")]))
        parts += _giant_hand(f"hand_{tag}", f"arm_{tag}", (0.0, al - 2.0, 0.0),
                             0.3, 0.85)
        parts.append(Part(f"leg_{tag}", "root", (side * 2.0, GROUND - ll, 0.0),
                          (0, 0, 0),
                          [Box((-1, 0, -1), (2, ll, 2), "voidflesh")]))
        # Resin welded into the hinges, which is why nothing folds.
        for k, frac in enumerate((0.18, 0.52, 0.84)):
            parts.append(Part(f"weld_a{tag}{k}", f"arm_{tag}", (0.0, al * frac, 0.0),
                              (0, 0, 0),
                              [Box((-2.2, -1.8, -2.2), (4.4, 3.6, 4.4), "amber")]))
            parts.append(Part(f"weld_l{tag}{k}", f"leg_{tag}", (0.0, ll * frac, 0.0),
                              (0, 0, 0),
                              [Box((-2.4, -2.0, -2.4), (4.8, 4.0, 4.8), "amber")]))
    parts += flayed("body", at=(4.0, -6.0, 0.0), length=9.0, height=7.0, ribs=5,
                    tier=0, side=1, name="flank")
    parts += chain("drape", "body", (0.0, -2.0, 2.2), 5, (5.0, 6.0, 2.0),
                   "amber", taper=0.86, curl=(4 * D, 0, 2 * D))
    return _m("blighted_enderman", parts, tex=256)


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

    Built on the real Ender Dragon now, not on a memory of one. The hand-made
    version was the right idea at the wrong proportions - a chest twenty-eight
    units deep where the dragon's is sixty-four, a five-link neck where the
    dragon has five *necks* ten units apart, three-link stub wings where a wing
    is a hundred and twelve units of span. Read out of the jar it is
    unmistakably the dragon, and the infection is grafted on afterwards.

    Vanilla rigs the dragon flat - every neck link, every one of the twelve
    tail links and both wings hang off the root, and `EnderDragonRenderer`
    chains them by hand each frame. Nothing here does that, so the chain is
    made real: each link is hung off the one in front, keeping its exact
    position, and after that a wave down the neck or the tail is one animation
    instead of thirty-seven bones of bookkeeping.

    Two thirds scale. At full size the wingspan is fourteen blocks, which is
    correct for the dragon that circles the End and wrong for something that
    has to come at you down a gallery.
    """
    mats = {"*": "dragonhide", "jaw": "rot"}
    # The gait solver finds limbs by name - `leg_fr`, `leg_fr_1`, `foot_fr` -
    # so the dragon's own three-part legs are renamed into that convention
    # rather than being re-cut by `jointify`. They are already jointed; vanilla
    # gives the dragon a thigh, a shin and a foot, which is more than most of
    # the animals in this mod start with.
    rename = {}
    for side, tag in (("right", "r"), ("left", "l")):
        for kind, pos in (("front", "f"), ("hind", "b")):
            rename[f"{side}_{kind}_leg"] = f"leg_{pos}{tag}"
            rename[f"{side}_{kind}_leg_tip"] = f"leg_{pos}{tag}_1"
            rename[f"{side}_{kind}_foot"] = f"foot_{pos}{tag}"
    parts = V.vanilla_host("EnderDragonModel", mats=mats, rename=rename)
    # A wing bone carries two cubes: the arm bone and, separately, the flat
    # quad that vanilla textures as the membrane. They are one bone, so the
    # material map cannot tell them apart - the membrane has to be picked out
    # by its shape. It is the one with no thickness.
    fixed = []
    for part in parts:
        if "wing" in part.name and part.boxes:
            fixed.append(Part(part.name, part.parent, part.pivot, part.rot,
                              [Box(b.origin, b.size,
                                   "amber" if b.size[1] < 1.0 else b.mat,
                                   grow=b.grow) for b in part.boxes]))
        else:
            fixed.append(part)
    parts = fixed
    # Necks and tail into real chains; wings and legs onto the body.
    moves = {"neck0": "body", "head": "neck4", "tail0": "body"}
    for i in range(1, 5):
        moves[f"neck{i}"] = f"neck{i - 1}"
    for i in range(1, 12):
        moves[f"tail{i}"] = f"tail{i - 1}"
    for side in ("right", "left"):
        moves[f"{side}_wing"] = "body"
    for tag in ("fr", "fl", "br", "bl"):
        moves[f"leg_{tag}"] = "body"
    parts = V.reparent(parts, moves)
    parts = V.rescale(parts, 0.66)
    # Vanilla's rest pose is a flying pose - wings straight out, neck level -
    # because the renderer overwrites all of it every frame from the dragon's
    # flight path. Nothing here does that, and a dragon held flat reads as a
    # model aeroplane. So it is posed on the ground: wings swept back and
    # drooping under their own set weight, the neck lifted into an S, the head
    # dropped at the end of it, the tail heavy.
    pose = {"right_wing": (0, -34 * D, 26 * D),
            "left_wing": (0, 34 * D, -26 * D),
            "right_wing_tip": (0, -22 * D, 30 * D),
            "left_wing_tip": (0, 22 * D, -30 * D),
            "neck0": (-26 * D, 0, 0), "neck1": (-14 * D, 0, 0),
            "neck2": (6 * D, 0, 0), "neck3": (18 * D, 0, 0),
            "neck4": (16 * D, 0, 0), "head": (10 * D, 0, 0),
            "tail0": (7 * D, 0, 0), "tail1": (5 * D, -3 * D, 0),
            "tail2": (4 * D, -4 * D, 0), "tail3": (2 * D, -5 * D, 0),
            "tail4": (0, -5 * D, 0), "tail5": (-2 * D, -4 * D, 0),
            "tail6": (-3 * D, -2 * D, 0), "tail7": (-3 * D, 2 * D, 0),
            "tail8": (-2 * D, 4 * D, 0), "tail9": (0, 5 * D, 0),
            "tail10": (2 * D, 4 * D, 0), "tail11": (3 * D, 3 * D, 0)}
    parts = [Part(p.name, p.parent, p.pivot, pose.get(p.name, p.rot), p.boxes)
             for p in parts]

    # --- and then the resin got into it ------------------------------------
    #
    # It came down in the pool and could not get out again. What is wrong with
    # it is concentrated where a flying animal is most vulnerable to something
    # that sets: the wing joints, which no longer fold, and the throat, which
    # is the longest run of soft tissue on the body.
    for side, tag in ((-1, "r"), (1, "l")):
        wing = f"{'right' if side < 0 else 'left'}_wing"
        # The membranes are vanilla's own, so nothing is bolted over them. What
        # is added is what happened to them: resin ran off the trailing edge
        # while the wing was still beating and set there, so the whole span is
        # fringed with drips of different lengths and the wing no longer folds.
        for k in range(7):
            reach = 3.0 + k * 3.4
            parts += chain(f"drip_{tag}{k}",
                           wing if k < 4 else f"{wing}_tip",
                           (side * (5.0 + k * 5.5), 2.0, 24.0 - k * 1.5), 3,
                           (3.4 - k * 0.25, reach, 3.4 - k * 0.25), "amber",
                           taper=0.74, curl=(4 * D, 0, side * 5 * D))
        # And where the joint should hinge, a swollen collar of set resin.
        parts.append(Part(f"lock_{tag}", wing, (side * 34.0, 0.0, 0.0),
                          (0, 0, side * 8 * D),
                          [Box((-7, -7, -8), (14, 14, 22), "amber")]))
        parts += eye_cluster("head", at=(side * 5.4, -3.0, -9.0), count=3, tier=1,
                             spread=(2.0, 3.4), size=2.6, out=side * 0.9,
                             name=f"eyes_{tag}")
    # The throat is open from the jaw to the chest - five necks of it.
    for i in range(5):
        parts += flayed(f"neck{i}", at=(0.0, 1.4, -3.4), length=5.0, height=3.4,
                        ribs=3, tier=1, side=1 if i % 2 else -1,
                        name=f"throat{i}")
    parts += flayed("body", at=(0.0, 2.0, -6.0), length=22.0, height=9.0, ribs=7,
                    tier=2, side=1, name="flank")
    # A second set of jaws behind the first, where the tongue was.
    parts.append(Part("gullet", "jaw", (0.0, 1.0, -6.0), (-14 * D, 0, 0),
                      [Box((-3.5, 0, -7.0), (7, 4, 8), "rot")]))
    for i in range(6):
        parts.append(Part(f"fang{i}", "jaw", (-4.4 + i * 1.8, 0.6, -9.0 + (i % 2) * 3.0),
                          (0, 0, 0),
                          [Box((-0.7, -4.2, -0.7), (1.4, 4.4, 1.4), "tooth")]))
    parts += spine_plates("body", from_z=-8.0, to_z=30.0, y=-1.0, count=9,
                          tier=1, height=6.0, name="crest")
    # The tail stopped being a tail somewhere around the eighth link.
    for i in range(7, 12):
        parts.append(Part(f"barb{i}", f"tail{i}",
                          (0.0, -3.0, 0.0), (-40 * D, i * 1.2, 0),
                          [Box((-1.3, -7.0, -1.3), (2.6, 8.0, 2.6), "tooth")]))
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
    """Not a figure. A hanging mass with things growing off it.

    Every previous version of this was a body: shoulders, a head, arms, legs.
    A body is something you can size up, and anything you can size up stops
    being frightening about ten seconds after you meet it. So there is no
    skeleton here to read.

    What replaces it, working from the cosmic-horror playbook - a body of
    bodies, a maelstrom rather than a silhouette:

      * it **hangs**. A bundle of roots descends from above and never reaches
        the ground; the mass is suspended in it, and `legs` only decides how
        far down the tapering drip beneath it goes.
      * **no arms.** Tendrils instead, dozens, at every length and thickness,
        hanging and dragging. None of them paired.
      * **no face.** Mouths open all over the mass at every angle, and rings of
        eyes orbit the core where a chest would have been.
      * **no symmetry anywhere.** Every element is placed on the golden angle,
        which never repeats and never lines up.
    """
    parts: list[Part] = []
    root_y = -30.0 if legs else -22.0

    # The bundle it hangs from: roots into the ceiling, converging downward.
    # These carry the whole mass, so they are cables rather than threads - but
    # they have to stay *separate* cables. Bunched inside a seven-unit radius
    # at six units thick they overlapped into one solid column and the thing
    # looked like it was growing out of a tree trunk. So: spread wide at the
    # ceiling, converging as they descend, and no two the same gauge.
    #
    # The rotation is worked out rather than guessed. A link's box runs along
    # local +y and the stack composes z, then y, then x, so a bone at
    # `(theta, a, 0)` points along `(sin t sin a, cos t, sin t cos a)` - which
    # is straight out along the radius at angle `a`, tipped `theta` off
    # vertical. Negative theta therefore leans *inward*, which is what a
    # suspension cable does: wide where it meets the ceiling, gathered where it
    # takes the load.
    for i in range(14):
        a = i * 2.399963
        f = i / 13.0
        gauge = 4.4 - f * 2.4
        parts += chain(f"moor{i}", "root",
                       (math.sin(a) * (20 + f * 16), root_y - 50.0,
                        math.cos(a) * (20 + f * 16)),
                       5, (gauge, 11.0 + f * 3.0, gauge),
                       # Bark, not sinew: the cables are structure and the
                       # tentacles are the creature, and at a glance across a
                       # dark cavern they need to be told apart.
                       "bark", taper=0.9,
                       curl=(-3 * D, 0, math.sin(a * 2.3) * 4 * D),
                       root_rot=(-(16.0 + f * 12.0) * D, a, 0))

    # The mass. Not a torso - an irregular knot, wider than tall.
    parts.append(Part("torso", "root", (0.0, root_y, 0.0), (0, 0, 0),
                      [Box((-23, -20, -20), (46, 34, 40), "heartwood"),
                       Box((-27, -10, -16), (54, 16, 32), "bark"),
                       Box((-17, -29, -14), (34, 13, 28), "heartwood"),
                       # An overhang at the front, so the mass leans over you.
                       Box((-20, -6, -30), (40, 20, 14), "bark")]))
    # Lobes hung off it at golden-angle intervals, no two alike.
    for i in range(11):
        a = i * 2.399963
        f = i / 10.0
        r = 13.0 + 5.0 * math.sin(f * 7.0)
        parts.append(Part(f"lobe{i}", "torso",
                          (math.sin(a) * r, -12.0 + f * 18.0, math.cos(a) * r * 0.8),
                          (math.cos(a) * 24 * D, -a, math.sin(a) * 24 * D),
                          [Box((-5 - f * 2, -5, -5), (10 + f * 4, 12 + f * 6, 10),
                               "heartwood" if i % 2 else "bark")]))

    # The core: where a chest would be, if it had one. It sits on the *front*
    # face of the overhang rather than inside the mass - the first version was
    # buried a dozen units deep in heartwood and the eyes, which are the only
    # thing on this creature that ever looks back at you, could not be seen
    # from any angle you would ever fight it from.
    parts.append(Part("chest", "torso", (0.0, -24.0, -20.0), (-22 * D, 0, 0),
                      [Box((-13, -15, -3), (26, 30, 4), "rot")]))
    parts.append(Part("heart", "chest", (0.0, 0.0, -3.2), (0, 0, 0),
                      [Box((-8, -11, -4), (16, 22, 5), "amberglow")]))
    # Rings of eyes orbiting it, three deep, none aligned.
    for ring, (count, radius, depth) in enumerate(((7, 12.0, -4.4),
                                                   (11, 18.0, -2.6),
                                                   (13, 24.0, -1.2))):
        for i in range(count):
            a = i * 2.399963 + ring * 0.7
            parts.append(Part(f"eye_r{ring}_{i}", "chest",
                              (math.sin(a) * radius, math.cos(a) * radius * 0.8, depth),
                              (0, 0, 0),
                              [Box((-2.6, -2.6, -1.6), (5.2, 5.2, 1.8), "eye:bloom")]))

    # Mouths, all over, all angles. This is the face - there isn't one.
    for i in range(14):
        a = i * 2.399963
        f = i / 13.0
        r = 15.0 + 4.0 * math.cos(f * 9.0)
        tag = f"maw{i}"
        parts.append(Part(tag, "torso",
                          (math.sin(a) * r, -16.0 + f * 24.0, math.cos(a) * r * 0.85),
                          (math.sin(a * 1.4) * 40 * D, -a, math.cos(a) * 34 * D),
                          [Box((-4.5, -4.0, -6.0), (9, 8, 6), "rot")]))
        parts.append(Part(f"{tag}_jaw", tag, (0.0, 3.2, -5.0), (30 * D, 0, 0),
                          [Box((-4.0, 0, -4.6), (8, 2.6, 5), "tongue")]))
        for k in range(5):
            parts.append(Part(f"{tag}_t{k}", tag, (-3.2 + k * 1.6, -3.6, -5.4),
                              (0, 0, 0),
                              [Box((-0.55, 0, -0.55), (1.1, 2.6 + (k % 2) * 1.2, 1.1),
                                   "tooth")]))
    # The one that matters, and the only bone the animation engine drives.
    #
    # Everything else on this creature is a field of small repeated things -
    # lobes, mouths, eyes, tentacles - and a field has no focal point. So one
    # element is built at a scale nothing else on the model comes near: a prow
    # of pale oak that hangs off the front of the overhang and points down at
    # whatever is beneath it. When it moves, it is the thing you watch.
    parts.append(Part("head", "torso", (0.0, -14.0, -28.0), (14 * D, 0, 0),
                      [Box((-11, -9, -26), (22, 18, 28), "palewood"),
                       Box((-8, -13, -18), (16, 6, 18), "bark"),
                       # A brow shelf, so there is somewhere for a face to be
                       # in shadow.
                       Box((-13, -12, -12), (26, 7, 12), "heartwood")]))
    parts.append(Part("face_jaw", "head", (0.0, 8.0, -22.0), (24 * D, 0, 0),
                      [Box((-9, 0, -20), (18, 6, 24), "rot")]))
    for i in range(10):
        parts.append(Part(f"fang{i}", "face_jaw",
                          (-8.0 + i * 1.8, -0.4, -17.0 + (i % 3) * 4.0),
                          (0, 0, 0),
                          [Box((-1.1, -6.5, -1.1), (2.2, 6.6, 2.2), "tooth")]))
    # And the upper set, so the mouth closes on something.
    for i in range(10):
        parts.append(Part(f"tusk{i}", "head",
                          (-8.0 + i * 1.8, 8.4, -17.5 + (i % 3) * 4.0),
                          (0, 0, 0),
                          [Box((-1.1, 0, -1.1), (2.2, 6.0 + (i % 2) * 2.5, 2.2),
                               "tooth")]))
    parts += lolling_tongue("face_jaw", at=(0.0, 2.6, -14.0), tier=0, segments=11,
                            thick=4.2, name="tongue")

    # Tendrils. Unpaired, every length - these are what reach you, so they are
    # built like limbs and not like hair. The mass they hang off is forty units
    # across; a two-pixel string against that reads as a stray thread, which is
    # exactly how the first pass looked. Each one leaves the body at nine or
    # ten units thick - as thick as a cow's whole leg - and tapers hard down
    # its length, so the root is heavy enough to swing something and the tip
    # still comes to a point.
    #
    # Three grades, because one grade of tentacle is a fringe:
    #   0-5   haulers - short, enormous, they take the weight and drag
    #   6-11  reachers - long and mid-weight, these are the ones that find you
    #  12-17  feelers  - thin, restless, always the first to move
    for i in range(18):
        # Not the golden angle over a full circle - that spreads them evenly,
        # and evenly spread radial limbs read as a spider, which is a shape
        # people have a name for. Squeezing the sequence into a 260-degree arc
        # centred on the front piles the long ones toward whoever is looking
        # and leaves the back of the mass nearly bare.
        a = math.pi + (((i * 2.399963) % (2 * math.pi)) - math.pi) * 0.72
        f = i / 17.0
        grade = i // 6
        links = (4, 7, 6)[grade] + (i % 3)
        thick = (11.5, 8.5, 5.5)[grade] - (i % 3) * 0.6
        # Segment lengths are chosen against the totals, not by eye: with a
        # taper of 0.84 a chain comes out about `seg * 3.5` long at four links
        # and `seg * 6.5` at nine. The first pass used sixteen-unit segments
        # and produced hundred-and-thirty-unit tentacles that hung straight
        # down through the floor. These come to roughly 35 / 65 / 33.
        seg = (9.0, 11.0, 6.5)[grade] + (i % 4) * 1.2
        # They leave from the flanks, not the underside: splayed hard outward
        # at the root, curling back down along their length, so they arch away
        # from the mass and droop. A canopy, not a skirt.
        splay = (74.0, 62.0, 48.0)[grade] + (i % 3) * 7.0
        parts += chain(f"tend{i}", "torso",
                       (math.sin(a) * (14 + f * 5), -8.0 + (i % 5) * 4.5,
                        math.cos(a) * (14 + f * 5) * 0.9),
                       links, (thick, seg, thick * 0.86), "sinew", taper=0.84,
                       curl=(11 * D, math.sin(a * 1.7) * 5 * D,
                             math.sin(a * 2.9) * 8 * D),
                       root_rot=(splay * D, a, 0))
        # Where a tendril meets the mass it is not a clean joint - it is a
        # swollen collar of the same stuff, so the limb looks grown rather than
        # plugged in.
        parts.append(Part(f"tend{i}_collar", f"tend{i}", (0.0, 0.0, 0.0),
                          (0, 0, 0),
                          [Box((-thick * 0.78, -2.5, -thick * 0.78),
                               (thick * 1.56, 7.0, thick * 1.56),
                               "bark" if grade == 0 else "heartwood")]))
        # Barbs down the heavy ones. They face backwards, like a hook.
        if grade < 2:
            for k in range(1, min(links, 4)):
                seg_name = f"tend{i}_{k}"
                parts.append(Part(f"tend{i}_barb{k}", seg_name,
                                  (0.0, seg * 0.45, thick * 0.4),
                                  (-52 * D, k * 1.1, 0),
                                  [Box((-1.4, -0.6, -1.4),
                                       (2.8, 6.5 - k * 0.9, 2.8), "tooth")]))
    # And the drip: what hangs below where legs would be.
    parts += chain("drip", "torso", (0.0, 10.0, 0.0), 8 if legs else 5,
                   (7.5, 9.0, 7.5), "amber", taper=0.86,
                   curl=(2 * D, 0, 3 * D))
    return parts


def the_creaking() -> Model:
    """THE CREAKING, waist-deep in the gilded pool.

    The hollow version: no legs, because it has never stood up. The model ends
    at a waterline of poured gold that is part of the geometry, so it reads as
    something rising out of the pool rather than standing in a puddle.
    """
    parts = _creaking_torso(legs=False)
    # The pool has to cut *through* it, not sit under it. At y=-4 there were
    # eight units of daylight between the surface and the underside of the
    # mass, so it read as a thing standing on a gold table. At -18 the mass is
    # in the gold up to its middle, which is the whole idea.
    parts.append(Part("waterline", "root", (0.0, -18.0, 0.0), (0, 0, 0),
                      [Box((-34, -2, -30), (68, 4, 60), "amberglow"),
                       Box((-40, 0, -34), (80, 3, 68), "amber")]))
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
