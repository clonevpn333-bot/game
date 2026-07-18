"""Geometry for every creature of the Gilded Seam.

Coordinates are vanilla model space: +y is down, ground is y=24 for parts
attached to root. Rotations are radians applied at the part pivot.
"""

import math

from lib import Box, Model, Part

D = math.pi / 180.0  # degrees → radians


def _leg(name, parent, pivot, upper, lower, style="glaze", rot=(0, 0, 0)):
    """Two-segment limb helper: <name> with child <name>_lower."""
    uw, uh, ud = upper
    lw, lh, ld = lower
    return [
        Part(name, parent, pivot, rot,
             [Box((-uw / 2, 0, -ud / 2), upper, style)]),
        Part(name + "_lower", name, (0, uh, 0), (0, 0, 0),
             [Box((-lw / 2, 0, -ld / 2), lower, style)]),
    ]


# ---------------------------------------------------------------------------
# Stage I — Hairline
# ---------------------------------------------------------------------------

SHARDLING = Model("shardling", 64, [
    # A skittering crab of saucer-fragments around one gold bead.
    Part("core", "root", (0.0, 19.0, 0.0), (0, 0, 0), [
        Box((-4, -5, -4), (8, 5, 8), "glaze"),
    ]),
    Part("bead", "core", (0.0, -2.0, -4.0), (0, 0, 0), [
        Box((-1, -1, -1), (2, 2, 2), "glow"),
    ]),
    Part("plate_n", "core", (0.0, -5.0, -4.0), (-20 * D, 0, 0), [
        Box((-3, -4, -1), (6, 4, 1), "dark"),
    ]),
    Part("plate_s", "core", (0.0, -5.0, 4.0), (20 * D, 0, 0), [
        Box((-3, -4, 0), (6, 4, 1), "dark"),
    ]),
    Part("plate_e", "core", (4.0, -5.0, 0.0), (0, 0, -20 * D), [
        Box((0, -4, -3), (1, 4, 6), "dark"),
    ]),
    Part("plate_w", "core", (-4.0, -5.0, 0.0), (0, 0, 20 * D), [
        Box((-1, -4, -3), (1, 4, 6), "dark"),
    ]),
    Part("crest", "core", (0.0, -5.0, 1.0), (0, 0, 17 * D), [
        Box((-0.5, -6, -2), (1, 6, 4), "gold"),
    ]),
    # Stoneware mutation: a second crest, tilted against the first.
    Part("crest_2", "core", (0.0, -5.0, 2.5), (0, 0, -22 * D), [
        Box((-0.5, -5, -1.5), (1, 5, 3), "dark"),
    ]),
    # Four gilded wire legs with shard-spike feet.
    *_leg("leg_fr", "root", (-3.0, 19.0, -3.0), (1, 3, 1), (1, 2, 1), "gold"),
    *_leg("leg_fl", "root", (3.0, 19.0, -3.0), (1, 3, 1), (1, 2, 1), "gold"),
    *_leg("leg_br", "root", (-3.0, 19.0, 3.0), (1, 3, 1), (1, 2, 1), "gold"),
    *_leg("leg_bl", "root", (3.0, 19.0, 3.0), (1, 3, 1), (1, 2, 1), "gold"),
    # Lustre mutation: a third pair of legs erupts from the midline.
    *_leg("leg_mr", "root", (-3.8, 19.0, 0.0), (1, 3, 1), (1, 2, 1), "gold"),
    *_leg("leg_ml", "root", (3.8, 19.0, 0.0), (1, 3, 1), (1, 2, 1), "gold"),
])

VESSEL = Model("vessel", 128, [
    Part("torso", "root", (0.0, 11.0, 0.0), (0, 0, 0), [
        Box((-4, -6, -2.5), (8, 6, 5), "glaze"),
    ]),
    Part("chest", "torso", (0.0, -6.0, 0.0), (0, 0, 0), [
        Box((-5, -7, -3), (10, 7, 6), "glaze"),
        Box((-1, -6, -3.6), (2, 5, 1), "gold"),      # the great front seam
        Box((-5.5, -7.5, -1), (1, 2, 2), "dark"),     # chipped shoulder
    ]),
    Part("head", "chest", (0.0, -7.0, 0.0), (0, 0, 0), [
        Box((-3.5, -8, -3.5), (7, 8, 7), "mask"),
    ]),
    Part("crown", "head", (1.0, -8.0, 0.0), (0, 0, 12 * D), [
        Box((-1, -3, -1), (2, 3, 2), "gold"),
    ]),
    # Primary arms.
    *_leg("arm_r", "chest", (-5.5, -6.0, 0.0), (3, 7, 3), (3, 7, 3)),
    *_leg("arm_l", "chest", (5.5, -6.0, 0.0), (3, 7, 3), (3, 7, 3)),
    # The Lustre surplus: a second, thinner pair grown from the lower torso.
    *_leg("spare_arm_r", "torso", (-4.5, -3.0, 0.0), (2, 6, 2), (2, 6, 2), "gold"),
    *_leg("spare_arm_l", "torso", (4.5, -3.0, 0.0), (2, 6, 2), (2, 6, 2), "gold"),
    # Legs.
    *_leg("leg_r", "root", (-2.0, 11.0, 0.0), (3, 7, 3), (3, 6, 3)),
    *_leg("leg_l", "root", (2.0, 11.0, 0.0), (3, 7, 3), (3, 6, 3)),
])

PORCELAIN_HOUND = Model("porcelain_hound", 128, [
    Part("body", "root", (0.0, 12.0, 0.0), (0, 0, 0), [
        Box((-3.5, -3, -7), (7, 6, 10), "glaze"),
    ]),
    Part("haunch", "body", (0.0, -1.0, 3.0), (0, 0, 0), [
        Box((-4, -2.5, 0), (8, 6, 5), "glaze"),
    ]),
    Part("mane", "body", (0.0, -3.0, -5.0), (-24 * D, 0, 0), [
        Box((-2.5, -4, 0), (5, 4, 1), "dark"),
        Box((-1.5, -6, 0.2), (3, 2, 1), "gold"),
    ]),
    Part("neck", "body", (0.0, -1.5, -6.5), (28 * D, 0, 0), [
        Box((-2, -2, -4.5), (4, 4, 5), "glaze"),
    ]),
    Part("head", "neck", (0.0, 0.0, -4.0), (-28 * D, 0, 0), [
        Box((-2.5, -2.5, -4.5), (5, 5, 5), "mask"),
        Box((-1.5, -0.5, -8.5), (3, 2, 4), "glaze"),   # muzzle
        Box((-0.5, -5.0, -2.0), (1, 3, 2), "gold"),    # crest shard
    ]),
    Part("jaw", "head", (0.0, 1.5, -4.5), (10 * D, 0, 0), [
        Box((-1.5, 0, -3.8), (3, 1, 4), "dark"),
    ]),
    Part("tail", "haunch", (0.0, -1.5, 5.0), (35 * D, 0, 0), [
        Box((-1, -1, 0), (2, 2, 4), "glaze"),
    ]),
    Part("tail_tip", "tail", (0.0, 0.0, 4.0), (18 * D, 0, 0), [
        Box((-0.5, -0.5, 0), (1, 1, 4), "gold"),
    ]),
    # Stoneware mutation: shard-fins erupt down the spine.
    Part("spine_0", "body", (0.0, -3.0, -2.0), (-12 * D, 0, 0), [
        Box((-0.5, -3, -0.5), (1, 3, 1), "dark"),
    ]),
    Part("spine_1", "body", (0.0, -3.0, 1.0), (0, 0, 0), [
        Box((-0.5, -4, -0.5), (1, 4, 1), "dark"),
    ]),
    Part("spine_2", "haunch", (0.0, -2.5, 2.0), (14 * D, 0, 0), [
        Box((-0.5, -3, -0.5), (1, 3, 1), "dark"),
    ]),
    # Lustre mutation: the mane finishes gilding into a solid gold ruff.
    Part("mane_lustre", "body", (0.0, -3.0, -5.5), (-30 * D, 0, 0), [
        Box((-3.5, -5, -0.5), (7, 5, 1), "gold"),
    ]),
    *_leg("leg_fr", "root", (-2.5, 12.0, -5.0), (2, 6, 3), (2, 6, 2)),
    *_leg("leg_fl", "root", (2.5, 12.0, -5.0), (2, 6, 3), (2, 6, 2)),
    *_leg("leg_br", "root", (-3.0, 12.0, 6.0), (3, 6, 4), (2, 6, 2)),
    *_leg("leg_bl", "root", (3.0, 12.0, 6.0), (3, 6, 4), (2, 6, 2)),
])

# ---------------------------------------------------------------------------
# Stage II — Crazing
# ---------------------------------------------------------------------------

SEAMSTRESS = Model("seamstress", 128, [
    Part("pelvis", "root", (0.0, 7.0, 0.0), (0, 0, 0), [
        Box((-3.5, -3, -2), (7, 3, 4), "glaze"),
    ]),
    Part("torso", "pelvis", (0.0, -3.0, 0.0), (0, 0, 0), [
        Box((-3, -8, -2), (6, 8, 4), "glaze"),
        Box((-0.5, -8, -2.6), (1, 8, 1), "gold"),      # spine seam, worn outside
    ]),
    Part("chest", "torso", (0.0, -8.0, 0.0), (0, 0, 0), [
        Box((-4, -6, -2.5), (8, 6, 5), "glaze"),
    ]),
    Part("spool", "chest", (0.0, -4.0, 2.5), (0, 0, 0), [
        Box((-2, -2, 0), (4, 4, 2), "gold"),
        Box((-3, 1, 0.5), (1, 6, 1), "thread"),
        Box((2, 0, 0.5), (1, 5, 1), "thread"),
    ]),
    Part("head", "chest", (0.0, -6.0, 0.0), (0, 0, 0), [
        Box((-3, -7, -3), (6, 7, 6), "mask"),
    ]),
    Part("hood", "head", (0.0, -7.0, 0.0), (0, 0, 0), [
        Box((-3.5, -1, -3.5), (7, 4, 7), "dark"),
        Box((-2, 5.0, -3.6), (4, 3, 1), "dark"),       # chin veil
    ]),
    # Upper thread-arms (the lash pair).
    *_leg("arm_ur", "chest", (-4.5, -5.0, 0.0), (2, 8, 2), (2, 7, 2)),
    *_leg("arm_ul", "chest", (4.5, -5.0, 0.0), (2, 8, 2), (2, 7, 2)),
    Part("needle_r", "arm_ur_lower", (0.0, 7.0, 0.0), (0, 0, 0), [
        Box((-0.5, 0, -0.5), (1, 3, 1), "gold"),
    ]),
    Part("needle_l", "arm_ul_lower", (0.0, 7.0, 0.0), (0, 0, 0), [
        Box((-0.5, 0, -0.5), (1, 3, 1), "gold"),
    ]),
    # Lower loom-arms (the mending pair).
    *_leg("arm_lr", "torso", (-3.5, -7.0, 0.0), (2, 7, 2), (2, 6, 2)),
    *_leg("arm_ll", "torso", (3.5, -7.0, 0.0), (2, 7, 2), (2, 6, 2)),
    # Lustre mutation: a third, purely gold pair grown from the pelvis.
    *_leg("arm_xr", "pelvis", (-3.5, -2.0, 0.0), (1, 6, 1), (1, 6, 1), "gold"),
    *_leg("arm_xl", "pelvis", (3.5, -2.0, 0.0), (1, 6, 1), (1, 6, 1), "gold"),
    # Stilt legs: thigh, back-bent shin, spike foot.
    *_leg("leg_r", "root", (-2.0, 7.0, 0.0), (2, 7, 2), (2, 7, 2)),
    *_leg("leg_l", "root", (2.0, 7.0, 0.0), (2, 7, 2), (2, 7, 2)),
    Part("foot_r", "leg_r_lower", (0.0, 7.0, 0.0), (0, 0, 0), [
        Box((-0.5, 0, -0.5), (1, 3, 1), "gold"),
    ]),
    Part("foot_l", "leg_l_lower", (0.0, 7.0, 0.0), (0, 0, 0), [
        Box((-0.5, 0, -0.5), (1, 3, 1), "gold"),
    ]),
])

KILNBORN = Model("kilnborn", 128, [
    Part("pelvis", "root", (0.0, 16.0, 0.0), (0, 0, 0), [
        Box((-5, -3, -3.5), (10, 3, 7), "kiln"),
    ]),
    Part("torso", "pelvis", (0.0, -3.0, 0.0), (0, 0, 0), [
        Box((-7, -12, -5), (14, 12, 10), "kiln"),
        Box((-3, -7, -5.8), (6, 6, 1), "glow"),        # the furnace hatch
        Box((-7.6, -10, -3), (1, 7, 6), "dark"),       # rib vent, left wall
        Box((6.6, -10, -3), (1, 7, 6), "dark"),        # rib vent, right wall
    ]),
    Part("chimney", "torso", (0.0, -12.0, 3.0), (0, 0, 0), [
        Box((-2, -5, -2), (4, 5, 4), "kiln"),
        Box((-1.5, -8, -1.5), (3, 3, 3), "dark"),
    ]),
    # Lustre mutation: a second flue and molten shoulder-spikes.
    Part("chimney_2", "torso", (-4.5, -12.0, 2.0), (0, 0, 14 * D), [
        Box((-1.5, -4, -1.5), (3, 4, 3), "kiln"),
    ]),
    Part("spike_r", "pauldron_r", (-3.0, -2.0, 0.0), (0, 0, 28 * D), [
        Box((-1, -4, -1), (2, 4, 2), "glow"),
    ]),
    Part("spike_l", "pauldron_l", (3.0, -2.0, 0.0), (0, 0, -28 * D), [
        Box((-1, -4, -1), (2, 4, 2), "glow"),
    ]),
    Part("head", "torso", (0.0, -12.0, -2.0), (0, 0, 0), [
        Box((-3, -4, -3), (6, 4, 6), "mask"),
    ]),
    Part("pauldron_r", "torso", (-7.0, -11.0, 0.0), (0, 0, 8 * D), [
        Box((-4, -2, -3.5), (4, 5, 7), "dark"),
    ]),
    Part("pauldron_l", "torso", (7.0, -11.0, 0.0), (0, 0, -8 * D), [
        Box((0, -2, -3.5), (4, 5, 7), "dark"),
    ]),
    *_leg("arm_r", "pauldron_r", (-2.0, 2.0, 0.0), (4, 7, 4), (5, 8, 5), "kiln"),
    *_leg("arm_l", "pauldron_l", (2.0, 2.0, 0.0), (4, 7, 4), (5, 8, 5), "kiln"),
    Part("knuckle_r", "arm_r_lower", (0.0, 8.0, -1.0), (0, 0, 0), [
        Box((-2, -1, -2), (4, 2, 2), "gold"),
    ]),
    Part("knuckle_l", "arm_l_lower", (0.0, 8.0, -1.0), (0, 0, 0), [
        Box((-2, -1, -2), (4, 2, 2), "gold"),
    ]),
    *_leg("leg_r", "root", (-3.5, 16.0, 0.0), (5, 5, 5), (5, 3, 5), "kiln"),
    *_leg("leg_l", "root", (3.5, 16.0, 0.0), (5, 5, 5), (5, 3, 5), "kiln"),
])

CHIME = Model("chime", 64, [
    Part("mask", "root", (0.0, 8.0, 0.0), (0, 0, 0), [
        Box((-5, -6, -1), (10, 12, 2), "mask"),
        Box((-5, -8, -2), (10, 2, 3), "gold"),         # brow band
        Box((-3, 6, -1.5), (6, 2, 2), "glaze"),        # chin
        Box((-1, -2, -2), (2, 5, 1), "dark"),          # nose ridge
    ]),
    Part("bell", "mask", (0.0, -1.0, 1.0), (0, 0, 0), [
        Box((-3, -2, 0), (6, 6, 4), "gold"),
    ]),
    Part("rod_0", "mask", (-3.0, 8.0, 0.0), (0, 0, 0), [
        Box((-0.5, 0, -0.5), (1, 5, 1), "thread"),
    ]),
    Part("rod_1", "mask", (0.0, 8.0, 0.0), (0, 0, 0), [
        Box((-0.5, 0, -0.5), (1, 6, 1), "thread"),
    ]),
    Part("rod_2", "mask", (3.0, 8.0, 0.0), (0, 0, 0), [
        Box((-0.5, 0, -0.5), (1, 4, 1), "thread"),
    ]),
    # The orbiting halo of shard-petals.
    Part("halo", "root", (0.0, 8.0, 0.0), (0, 0, 0), []),
    *[Part(f"petal_{i}", "halo", (0.0, 0.0, 0.0), (0, i * 60 * D, 0), [
        Box((-1, -2.5, 6.5), (2, 5, 1), "dark" if i % 2 else "glaze"),
    ]) for i in range(6)],
    # Lustre mutation: a second, inner ring of gold petals, counter-spun.
    Part("halo_2", "root", (0.0, 8.0, 0.0), (0, 0, 0), []),
    *[Part(f"petal_i{i}", "halo_2", (0.0, 0.0, 0.0), (0, (30 + i * 60) * D, 0), [
        Box((-1, -1.5, 4.5), (2, 3, 1), "gold"),
    ]) for i in range(6)],
])

FONT_OF_GOLD = Model("font_of_gold", 128, [
    Part("base", "root", (0.0, 20.0, 0.0), (0, 0, 0), [
        Box((-5, -4, -5), (10, 4, 10), "dark"),
    ]),
    Part("belly", "base", (0.0, -4.0, 0.0), (0, 0, 0), [
        Box((-6, -8, -6), (12, 8, 12), "glaze"),
        Box((-3.5, -7, -6.6), (3, 6, 1), "glaze"),     # seam lip, left
        Box((0.5, -7, -6.6), (3, 6, 1), "glaze"),      # seam lip, right
        Box((-0.5, -7, -6.3), (1, 6, 1), "glow"),      # the weeping seam
    ]),
    Part("shoulder", "belly", (0.0, -8.0, 0.0), (0, 0, 0), [
        Box((-5, -4, -5), (10, 4, 10), "glaze"),
    ]),
    Part("neck", "shoulder", (0.0, -4.0, 0.0), (0, 0, 0), [
        Box((-3, -3, -3), (6, 3, 6), "gold"),
    ]),
    Part("handle_r", "belly", (-6.0, -6.0, 0.0), (0, 0, 14 * D), [
        Box((-2, 0, -1), (2, 6, 2), "dark"),
    ]),
    Part("handle_l", "belly", (6.0, -6.0, 0.0), (0, 0, -14 * D), [
        Box((0, 0, -1), (2, 6, 2), "dark"),
    ]),
    Part("spout_0", "shoulder", (-4.0, -4.0, -3.0), (0, 0, 0), [
        Box((-1, -1, -1), (2, 2, 2), "gold"),
    ]),
    Part("spout_1", "shoulder", (4.5, -4.0, 2.0), (0, 0, 0), [
        Box((-1, -1, -1), (2, 2, 2), "gold"),
    ]),
    # Lustre mutation: more spouts, and a crown of set gold around the mouth.
    Part("spout_2", "shoulder", (3.5, -4.0, -3.5), (0, 0, 0), [
        Box((-1, -1, -1), (2, 2, 2), "gold"),
    ]),
    Part("spout_3", "belly", (-5.5, -6.0, 3.0), (0, 0, -18 * D), [
        Box((-1, -1, -1), (2, 2, 2), "gold"),
    ]),
    Part("crown", "shoulder", (0.0, -4.0, 0.0), (0, 0, 0), [
        Box((-4, -4.5, -4), (8, 2, 8), "glow"),
    ]),
    *_leg("root_fr", "root", (-4.0, 20.0, -4.0), (3, 2, 3), (2, 2, 2), "dark"),
    *_leg("root_fl", "root", (4.0, 20.0, -4.0), (3, 2, 3), (2, 2, 2), "dark"),
    *_leg("root_br", "root", (-4.0, 20.0, 4.0), (3, 2, 3), (2, 2, 2), "dark"),
    *_leg("root_bl", "root", (4.0, 20.0, 4.0), (3, 2, 3), (2, 2, 2), "dark"),
])

# ---------------------------------------------------------------------------
# Stage III — Lustre
# ---------------------------------------------------------------------------


def _radial_arm(i, count, prefix, parent, pivot_r, pivot_y, seg1, seg2, hand, style, splay):
    """One radial limb of the Manifold, facing outward at its station."""
    theta = (360.0 / count) * i * D
    px = pivot_r * math.sin(theta)
    pz = pivot_r * math.cos(theta)
    s1w, s1h, s1d = seg1
    s2w, s2h, s2d = seg2
    parts = [
        Part(f"{prefix}{i}", parent, (px, pivot_y, pz), (splay, theta, 0), [
            Box((-s1w / 2, 0, -s1d / 2), seg1, style),
        ]),
        Part(f"{prefix}{i}_mid", f"{prefix}{i}", (0, s1h, 0), (-2 * splay, 0, 0), [
            Box((-s2w / 2, 0, -s2d / 2), seg2, style),
        ]),
    ]
    if hand:
        hw, hh, hd = hand
        parts.append(Part(f"{prefix}{i}_hand", f"{prefix}{i}_mid", (0, s2h, 0), (splay, 0, 0), [
            Box((-hw / 2, 0, -hd / 2), hand, "glaze"),
            Box((-hw / 2, hh, -hd / 2), (1, 2, 1), "gold"),
            Box((hw / 2 - 1, hh, hd / 2 - 1), (1, 2, 1), "gold"),
        ]))
    return parts


MANIFOLD = Model("manifold", 128, [
    Part("knot", "root", (0.0, 13.0, 0.0), (0, 0, 0), [
        Box((-5, -7, -5), (10, 8, 10), "glaze"),
    ]),
    Part("knot2", "knot", (0.0, -3.0, 0.0), (17 * D, 34 * D, 11 * D), [
        Box((-4, -3, -4), (8, 6, 8), "dark"),
    ]),
    Part("core", "knot", (0.0, -2.0, 0.0), (0, 45 * D, 0), [
        Box((-2.5, -2.5, -2.5), (5, 5, 5), "glow"),
    ]),
    # Six walking arms, radially stationed, angled out and down.
    *[part
      for i in range(6)
      for part in _radial_arm(i, 6, "walker_", "knot", 4.5, 0.0,
                              (2, 6, 2), (2, 7, 2), (3, 2, 3), "glaze", 40 * D)],
    # Five flailing arms reaching from the upper knot.
    *[part
      for i in range(5)
      for part in _radial_arm(i, 5, "flail_", "knot", 3.5, -6.0,
                              (2, 6, 2), (2, 6, 2), None, "dark", -55 * D)],
])

RELIQUARY_COLOSSUS = Model("reliquary_colossus", 256, [
    Part("pelvis", "root", (0.0, -6.0, 0.0), (0, 0, 0), [
        Box((-8, -5, -6), (16, 5, 12), "glaze"),
        Box((-6, -6.2, -7), (12, 2, 2), "glow"),       # gold pooled in the lap
    ]),
    Part("skirt_f", "pelvis", (0.0, 0.0, -6.0), (9 * D, 0, 0), [
        Box((-6, 0, -1), (12, 8, 1), "dark"),
    ]),
    Part("skirt_b", "pelvis", (0.0, 0.0, 6.0), (-9 * D, 0, 0), [
        Box((-6, 0, 0), (12, 8, 1), "dark"),
    ]),
    Part("torso", "pelvis", (0.0, -5.0, 0.0), (0, 0, 0), [
        Box((-9, -10, -6), (18, 10, 12), "glaze"),
    ]),
    Part("chest", "torso", (0.0, -10.0, 0.0), (0, 0, 0), [
        Box((-8, -12, -5), (16, 12, 10), "glaze"),
        Box((-1, -11, -5.6), (2, 10, 1), "gold"),      # sternum seam
    ]),
    Part("shrine", "chest", (0.0, -8.0, 5.0), (0, 0, 0), [
        Box((-5, -3, 0), (10, 8, 4), "dark"),
        Box((-3, -1, 4), (6, 5, 1), "gold"),           # reliquary door
    ]),
    Part("head", "chest", (0.0, -12.0, 0.0), (0, 0, 0), [
        Box((-5, -12, -3), (10, 12, 6), "mask"),
    ]),
    Part("halo_disc", "head", (0.0, -6.0, 3.0), (0, 0, 0), [
        Box((-7, -7, 0), (14, 14, 1), "gold"),
    ]),
    Part("crown_0", "head", (0.0, -12.0, 0.0), (0, 0, 0), [
        Box((-1, -4, -0.5), (2, 4, 1), "gold"),
    ]),
    Part("crown_1", "head", (-3.0, -12.0, 0.0), (0, 0, 14 * D), [
        Box((-1, -3, -0.5), (2, 3, 1), "gold"),
    ]),
    Part("crown_2", "head", (3.0, -12.0, 0.0), (0, 0, -14 * D), [
        Box((-1, -3, -0.5), (2, 3, 1), "gold"),
    ]),
    # Three tiers of arms. Top pair does the sweeping and slamming.
    *_leg("arm_tr", "chest", (-9.0, -11.0, 0.0), (5, 14, 5), (5, 12, 5)),
    *_leg("arm_tl", "chest", (9.0, -11.0, 0.0), (5, 14, 5), (5, 12, 5)),
    Part("hand_tr", "arm_tr_lower", (0.0, 12.0, 0.0), (0, 0, 0), [
        Box((-3, 0, -3), (6, 3, 6), "dark"),
    ]),
    Part("hand_tl", "arm_tl_lower", (0.0, 12.0, 0.0), (0, 0, 0), [
        Box((-3, 0, -3), (6, 3, 6), "dark"),
    ]),
    # Middle pair gestures; lower pair stays folded in prayer.
    *_leg("arm_mr", "chest", (-8.0, -4.0, 0.0), (4, 12, 4), (4, 10, 4)),
    *_leg("arm_ml", "chest", (8.0, -4.0, 0.0), (4, 12, 4), (4, 10, 4)),
    *_leg("arm_lr", "torso", (-7.0, -8.0, -2.0), (3, 10, 3), (3, 8, 3), "dark"),
    *_leg("arm_ll", "torso", (7.0, -8.0, -2.0), (3, 10, 3), (3, 8, 3), "dark"),
    # Legs.
    *_leg("leg_r", "root", (-5.0, -6.0, 0.0), (7, 14, 8), (7, 14, 8)),
    *_leg("leg_l", "root", (5.0, -6.0, 0.0), (7, 14, 8), (7, 14, 8)),
    Part("foot_r", "leg_r_lower", (0.0, 14.0, 0.0), (0, 0, 0), [
        Box((-4, 0, -5), (8, 2, 10), "dark"),
    ]),
    Part("foot_l", "leg_l_lower", (0.0, 14.0, 0.0), (0, 0, 0), [
        Box((-4, 0, -5), (8, 2, 10), "dark"),
    ]),
])

# ---------------------------------------------------------------------------
# The gilded livestock — every farmyard shape, kept. Mutation parts are
# named mut1_* (Stoneware) and mut2_* (Lustre); the client toggles them
# by prefix.
# ---------------------------------------------------------------------------

GILDED_COW = Model("gilded_cow", 128, [
    Part("body", "root", (0.0, 11.0, 0.0), (0, 0, 0), [
        Box((-6, -10, -9), (12, 10, 18), "glaze"),
        Box((-0.5, 0, -8), (1, 1, 16), "gold"),          # belly seam
    ]),
    Part("hump", "body", (0.0, -10.0, -4.0), (0, 0, 0), [
        Box((-3, -3, -2), (6, 3, 6), "kiln"),             # the kiln-vent hump
    ]),
    Part("head", "body", (0.0, -8.0, -9.0), (0, 0, 0), [
        Box((-4, -3, -6), (8, 7, 6), "mask"),
    ]),
    Part("jaw", "head", (0.0, 4.0, -6.0), (8 * D, 0, 0), [
        Box((-3.5, 0, 0), (3, 2, 5), "dark"),             # the jaw, split
        Box((0.5, 0, 0), (3, 2, 5), "dark"),
        Box((-0.5, 0, 0.5), (1, 2, 4), "glow"),           # gold between the halves
    ]),
    Part("horn_r", "head", (-4.0, -2.0, -3.0), (0, 0, 35 * D), [
        Box((-1, -3, -1), (1, 3, 1), "gold"),
    ]),
    Part("horn_l", "head", (4.0, -2.0, -3.0), (0, 0, -35 * D), [
        Box((0, -3, -1), (1, 3, 1), "gold"),
    ]),
    Part("tail", "body", (0.0, -9.0, 9.0), (30 * D, 0, 0), [
        Box((-0.5, 0, 0), (1, 6, 1), "thread"),
    ]),
    *_leg("leg_fr", "root", (-4.0, 11.0, -6.0), (3, 7, 3), (3, 6, 3)),
    *_leg("leg_fl", "root", (4.0, 11.0, -6.0), (3, 7, 3), (3, 6, 3)),
    *_leg("leg_br", "root", (-4.0, 11.0, 6.0), (3, 7, 3), (3, 6, 3)),
    *_leg("leg_bl", "root", (4.0, 11.0, 6.0), (3, 7, 3), (3, 6, 3)),
    # Stoneware: plates buckle up along the spine.
    Part("mut1_spine_0", "body", (0.0, -10.0, 1.0), (-10 * D, 0, 0), [
        Box((-0.5, -4, -0.5), (1, 4, 1), "dark"),
    ]),
    Part("mut1_spine_1", "body", (0.0, -10.0, 5.0), (10 * D, 0, 0), [
        Box((-0.5, -3, -0.5), (1, 3, 1), "dark"),
    ]),
    # Lustre: the vent blooms.
    Part("mut2_bloom", "hump", (0.0, -3.0, 1.0), (0, 0, 0), [
        Box((-3, -5, -0.5), (6, 5, 1), "gold"),
        Box((-0.5, -5, -3), (1, 5, 6), "gold"),
        Box((-1, -3, -1), (2, 2, 2), "glow"),
    ]),
])

GILDED_PIG = Model("gilded_pig", 128, [
    Part("body", "root", (0.0, 16.0, 0.0), (0, 0, 0), [
        Box((-5, -8, -7), (10, 8, 14), "glaze"),          # the pot
    ]),
    Part("lid", "body", (0.0, -8.0, 0.0), (0, 0, 0), [
        Box((-4, -2, -5), (8, 2, 10), "dark"),
        Box((-1, -4, -1), (2, 2, 2), "gold"),             # lid handle
    ]),
    Part("head", "body", (0.0, -4.0, -7.0), (0, 0, 0), [
        Box((-3.5, -3, -4), (7, 6, 4), "mask"),
    ]),
    Part("snout", "head", (0.0, 0.0, -4.0), (0, 0, 0), [
        Box((-1.5, -1, -3), (3, 3, 3), "gold"),           # spout snout
    ]),
    Part("tail", "body", (0.0, -6.0, 7.0), (-40 * D, 0, 0), [
        Box((-0.5, 0, 0), (1, 1, 3), "thread"),
        Box((-0.5, -1, 2), (1, 1, 1), "thread"),
    ]),
    *_leg("leg_fr", "root", (-3.0, 16.0, -4.5), (3, 4, 3), (3, 4, 3)),
    *_leg("leg_fl", "root", (3.0, 16.0, -4.5), (3, 4, 3), (3, 4, 3)),
    *_leg("leg_br", "root", (-3.0, 16.0, 4.5), (3, 4, 3), (3, 4, 3)),
    *_leg("leg_bl", "root", (3.0, 16.0, 4.5), (3, 4, 3), (3, 4, 3)),
    # Stoneware: side spouts start leaking.
    Part("mut1_spout_r", "body", (-5.0, -4.0, 0.0), (0, 0, 20 * D), [
        Box((-2, -1, -1), (2, 2, 2), "gold"),
    ]),
    Part("mut1_spout_l", "body", (5.0, -4.0, 0.0), (0, 0, -20 * D), [
        Box((0, -1, -1), (2, 2, 2), "gold"),
    ]),
    # Lustre: the lid lifts on a ring of light, and a third pair of legs.
    Part("mut2_glow_ring", "body", (0.0, -8.5, 0.0), (0, 0, 0), [
        Box((-3.5, 0, -4.5), (7, 1, 9), "glow"),
    ]),
    *_leg("mut2_leg_mr", "root", (-3.6, 16.0, 0.0), (3, 4, 3), (3, 4, 3), "gold"),
    *_leg("mut2_leg_ml", "root", (3.6, 16.0, 0.0), (3, 4, 3), (3, 4, 3), "gold"),
])

GILDED_SHEEP = Model("gilded_sheep", 128, [
    Part("body", "root", (0.0, 13.0, 0.0), (0, 0, 0), [
        Box((-4, -6, -8), (8, 6, 16), "glaze"),
    ]),
    Part("fleece", "body", (0.0, -6.0, 0.0), (0, 0, 0), [
        Box((-5, -3, -9), (10, 5, 18), "thread"),          # wool of wound gold
    ]),
    Part("head", "body", (0.0, -4.0, -8.0), (0, 0, 0), [
        Box((-3, -3, -5), (6, 6, 5), "mask"),
        Box((-4, -2, -3), (1, 2, 3), "glaze"),             # ear r
        Box((3, -2, -3), (1, 2, 3), "glaze"),              # ear l
    ]),
    Part("tail", "fleece", (0.0, 0.0, 9.0), (20 * D, 0, 0), [
        Box((-1, 0, 0), (2, 3, 1), "thread"),
    ]),
    *_leg("leg_fr", "root", (-2.5, 13.0, -6.0), (2, 6, 2), (2, 5, 2), "gold"),
    *_leg("leg_fl", "root", (2.5, 13.0, -6.0), (2, 6, 2), (2, 5, 2), "gold"),
    *_leg("leg_br", "root", (-2.5, 13.0, 6.0), (2, 6, 2), (2, 5, 2), "gold"),
    *_leg("leg_bl", "root", (2.5, 13.0, 6.0), (2, 6, 2), (2, 5, 2), "gold"),
    # Stoneware: needles work their way out of the fleece.
    *[Part(f"mut1_needle_{i}", "fleece", (-3.0 + i * 2.0, -3.0, -6.0 + i * 4.0),
           ((-20 + i * 12) * D, 0, (25 - i * 15) * D), [
        Box((-0.5, -4, -0.5), (1, 4, 1), "gold"),
    ]) for i in range(4)],
    # Lustre: the spool the thread was always for.
    Part("mut2_spool", "fleece", (0.0, -3.0, 2.0), (0, 0, 0), [
        Box((-2, -6, -2), (4, 6, 4), "dark"),
        Box((-2.5, -5, -2.5), (5, 3, 5), "thread"),
    ]),
])

GILDED_CHICKEN = Model("gilded_chicken", 64, [
    Part("body", "root", (0.0, 16.0, 0.0), (0, 0, 0), [
        Box((-3.5, -6, -4.5), (7, 6, 9), "glaze"),         # the teapot
    ]),
    Part("head", "body", (0.0, -5.0, -3.5), (0, 0, 0), [
        Box((-2, -4, -2), (4, 4, 4), "mask"),
        Box((-1, -5, -1), (2, 1, 2), "gold"),              # comb
    ]),
    Part("beak", "head", (0.0, -2.0, -2.0), (0, 0, 0), [
        Box((-1, -0.5, -3), (2, 1, 3), "gold"),            # spout beak
    ]),
    Part("handle", "body", (0.0, -4.0, 4.5), (-30 * D, 0, 0), [
        Box((-1, 0, 0), (2, 5, 1), "dark"),                # tail handle
    ]),
    Part("wing_r", "body", (-3.5, -5.0, -1.0), (0, 0, 0), [
        Box((-1, 0, -2), (1, 4, 6), "dark"),
    ]),
    Part("wing_l", "body", (3.5, -5.0, -1.0), (0, 0, 0), [
        Box((0, 0, -2), (1, 4, 6), "dark"),
    ]),
    *_leg("leg_r", "root", (-1.5, 16.0, 0.0), (1, 6, 1), (2, 2, 2), "gold"),
    *_leg("leg_l", "root", (1.5, 16.0, 0.0), (1, 6, 1), (2, 2, 2), "gold"),
    # Stoneware: a second set of wing-plates.
    Part("mut1_wing2_r", "body", (-3.5, -3.0, 1.0), (0, 0, 20 * D), [
        Box((-1, 0, -1), (1, 3, 4), "gold"),
    ]),
    Part("mut1_wing2_l", "body", (3.5, -3.0, 1.0), (0, 0, -20 * D), [
        Box((0, 0, -1), (1, 3, 4), "gold"),
    ]),
    # Lustre: the second head. A teapot may have two spouts.
    Part("mut2_head2", "body", (2.0, -5.5, -2.5), (0, -25 * D, -15 * D), [
        Box((-1.5, -3.5, -1.5), (3, 3, 3), "mask"),
        Box((-0.5, -2.5, -3.5), (1, 1, 2), "gold"),
    ]),
])

GILDED_SPIDER = Model("gilded_spider", 128, [
    Part("abdomen", "root", (0.0, 15.0, 3.0), (0, 0, 0), [
        Box((-5, -4, -1), (10, 6, 10), "glaze"),           # the tureen
    ]),
    Part("lid", "abdomen", (0.0, -4.0, 4.0), (0, 0, 0), [
        Box((-4, -1.5, -4), (8, 2, 8), "dark"),
        Box((-1, -3, -1), (2, 2, 2), "gold"),
    ]),
    Part("cephalo", "root", (0.0, 15.0, -3.0), (0, 0, 0), [
        Box((-4, -3, -6), (8, 5, 7), "glaze"),
        Box((-3, 2, -5.8), (6, 3, 1), "mask"),             # the face, underneath
    ]),
    *[Part(f"leg_{i}", "root", (-4.5 if i < 4 else 4.5, 13.0, -4.0 + (i % 4) * 2.6),
           (0, (30 - (i % 4) * 20) * D * (1 if i < 4 else -1), (55 * D) * (1 if i < 4 else -1)), [
        Box((-1 if i < 4 else 0, 0, -0.5), (1, 7, 1), "gold"),
    ]) for i in range(8)],
    *[Part(f"leg_{i}_mid", f"leg_{i}", (-0.5 if i < 4 else 0.5, 7.0, 0.0),
           (0, 0, (-95 * D) * (1 if i < 4 else -1)), [
        Box((-0.5, 0, -0.5), (1, 9, 1), "gold"),
    ]) for i in range(8)],
    # Stoneware: the lid sprouts a warning gem and rim-spikes.
    Part("mut1_gem", "lid", (0.0, -3.0, 0.0), (0, 0, 0), [
        Box((-1, -2, -1), (2, 2, 2), "glow"),
    ]),
    Part("mut1_spikes", "abdomen", (0.0, -4.5, 1.0), (0, 0, 0), [
        Box((-4.5, 0, -0.5), (1, 2, 1), "gold"),
        Box((3.5, 0, -0.5), (1, 2, 1), "gold"),
    ]),
    # Lustre: a ninth and tenth leg. The tureen sets more places.
    *[Part(f"mut2_leg_{i}", "root", (-4.5 if i == 0 else 4.5, 13.0, 4.6),
           (0, (-25 * D) * (1 if i == 0 else -1), (55 * D) * (1 if i == 0 else -1)), [
        Box((-1 if i == 0 else 0, 0, -0.5), (1, 7, 1), "gold"),
    ]) for i in range(2)],
    *[Part(f"mut2_leg_{i}_mid", f"mut2_leg_{i}", (-0.5 if i == 0 else 0.5, 7.0, 0.0),
           (0, 0, (-95 * D) * (1 if i == 0 else -1)), [
        Box((-0.5, 0, -0.5), (1, 9, 1), "gold"),
    ]) for i in range(2)],
])

GILDED_CASK = Model("gilded_cask", 64, [
    # The creeper's silhouette, refired as a crazed powder-urn.
    Part("body", "root", (0.0, 20.0, 0.0), (0, 0, 0), [
        Box((-4, -14, -3), (8, 14, 6), "glaze"),
        Box((-3.5, -12.5, -3.6), (7, 7, 1), "mask"),       # the face plate
        Box((-4.2, -5, -3.2), (8, 1, 6), "gold"),          # hoop band, low
        Box((-4.2, -10, -3.2), (8, 1, 6), "gold"),         # hoop band, high
    ]),
    *_leg("leg_fr", "root", (-2.0, 20.0, -2.5), (3, 4, 3), (2, 0, 2)),
    *_leg("leg_fl", "root", (2.0, 20.0, -2.5), (3, 4, 3), (2, 0, 2)),
    *_leg("leg_br", "root", (-2.0, 20.0, 2.5), (3, 4, 3), (2, 0, 2)),
    *_leg("leg_bl", "root", (2.0, 20.0, 2.5), (3, 4, 3), (2, 0, 2)),
    # Stoneware: pressure vents.
    Part("mut1_vent_r", "body", (-4.0, -8.0, 0.0), (0, 0, 25 * D), [
        Box((-2, -1, -1), (2, 2, 2), "kiln"),
    ]),
    Part("mut1_vent_l", "body", (4.0, -8.0, 0.0), (0, 0, -25 * D), [
        Box((0, -1, -1), (2, 2, 2), "kiln"),
    ]),
    # Lustre: the stopper-crown. It is very full now.
    Part("mut2_crown", "body", (0.0, -14.0, 0.0), (0, 0, 0), [
        Box((-2, -3, -2), (4, 3, 4), "glow"),
        Box((-3, -1, -3), (6, 1, 6), "gold"),
    ]),
])

# ---------------------------------------------------------------------------
# The folk — the people the Seam has not finished with yet.
# ---------------------------------------------------------------------------

REFUGEE = Model("refugee", 128, [
    Part("body", "root", (0.0, 6.0, 0.0), (0, 0, 0), [
        Box((-4, 0, -2), (8, 10, 4), "leather"),
        Box((-4.5, 6, -2.5), (9, 4, 5), "leather"),        # ragged skirt
    ]),
    Part("bundle", "body", (0.0, 1.0, 2.0), (0, 0, 0), [
        Box((-2.5, 0, 0), (5, 4, 3), "coat"),              # everything they own
    ]),
    Part("head", "body", (0.0, 0.0, 0.0), (0, 0, 0), [
        Box((-3, -6, -3), (6, 6, 6), "skin"),
    ]),
    Part("hood", "head", (0.0, -6.0, 0.0), (0, 0, 0), [
        Box((-3.5, 0, -3.5), (7, 4, 7), "coat"),
        Box((-3.5, 4, 1), (7, 3, 3), "coat"),              # cowl down the back
    ]),
    Part("arm_r", "body", (-4.5, 1.0, 0.0), (0, 0, 0), [
        Box((-2, 0, -1.5), (3, 10, 3), "leather"),
    ]),
    Part("arm_l", "body", (4.5, 1.0, 0.0), (0, 0, 0), [
        Box((-1, 0, -1.5), (3, 10, 3), "leather"),
    ]),
    *_leg("leg_r", "root", (-2.0, 16.0, 0.0), (3, 4, 3), (3, 4, 3), "leather"),
    *_leg("leg_l", "root", (2.0, 16.0, 0.0), (3, 4, 3), (3, 4, 3), "leather"),
])

GILT_MAD = Model("gilt_mad", 128, [
    Part("body", "root", (0.0, 6.0, 0.0), (0, 0, 0), [
        Box((-4, 0, -2), (8, 10, 4), "coat"),
        Box((-5, 7, -3), (10, 6, 6), "coat"),              # long robe skirt
        Box((-0.5, 1, -2.5), (1, 8, 1), "gold"),           # self-sewn seam, worn proudly
    ]),
    Part("head", "body", (0.0, 0.0, 0.0), (0, 0, 0), [
        Box((-3, -6, -3), (6, 6, 6), "skin"),
    ]),
    Part("half_mask", "head", (0.0, -6.0, 0.0), (0, 0, 0), [
        Box((-3.2, 0.5, -3.3), (6, 3, 1), "gold"),         # gold half-mask over the eyes
    ]),
    Part("arm_r", "body", (-4.5, 1.0, 0.0), (0, 0, 0), [
        Box((-2, 0, -1.5), (3, 10, 3), "coat"),
    ]),
    Part("bell", "arm_r", (-0.5, 10.0, 0.0), (0, 0, 0), [
        Box((-1.5, 0, -1.5), (3, 3, 3), "gold"),           # the handbell
    ]),
    Part("arm_l", "body", (4.5, 1.0, 0.0), (0, 0, 0), [
        Box((-1, 0, -1.5), (3, 10, 3), "coat"),
    ]),
    *_leg("leg_r", "root", (-2.0, 16.0, 0.0), (3, 4, 3), (3, 4, 3), "coat"),
    *_leg("leg_l", "root", (2.0, 16.0, 0.0), (3, 4, 3), (3, 4, 3), "coat"),
])

HALF_SEWN = Model("half_sewn", 128, [
    # A person the Seam has not finished. Half flesh, half ware.
    Part("body", "root", (0.0, 6.0, 0.0), (0, 0, 0), [
        Box((-4, 0, -2), (8, 10, 4), "skin"),
        Box((-4.2, 1, -2.4), (4, 7, 1), "glaze"),          # chest, already ware
        Box((0.2, 2, -2.3), (1, 6, 1), "gold"),            # the working seam
    ]),
    Part("head", "body", (0.0, 0.0, 0.0), (0, 0, 0), [
        Box((-3, -6, -3), (6, 6, 6), "skin"),
        Box((-3.2, -6.2, -3.2), (3, 6, 1), "mask"),        # half the face, replaced
    ]),
    Part("arm_r", "body", (-4.5, 1.0, 0.0), (0, 0, 0), [
        Box((-2, 0, -1.5), (3, 10, 3), "glaze"),           # this arm is finished
    ]),
    Part("arm_l", "body", (4.5, 1.0, 0.0), (0, 0, 0), [
        Box((-1, 0, -1.5), (3, 10, 3), "skin"),            # this one is not
    ]),
    *_leg("leg_r", "root", (-2.0, 16.0, 0.0), (3, 4, 3), (3, 4, 3), "glaze"),
    *_leg("leg_l", "root", (2.0, 16.0, 0.0), (3, 4, 3), (3, 4, 3), "leather"),
    # Stoneware: more patches.
    Part("mut1_patch", "body", (0.0, 0.0, 0.0), (0, 0, 0), [
        Box((0.4, 2, 1.4), (3, 5, 1), "glaze"),
        Box((-3.4, 6, 1.4), (2, 3, 1), "glaze"),
    ]),
    # Lustre: the surplus arrives early.
    *_leg("mut2_spare_arm", "body", (-4.0, 6.0, 1.0), (2, 6, 2), (2, 5, 2), "gold"),
])

# ---------------------------------------------------------------------------
# The Overlord King and the living
# ---------------------------------------------------------------------------

PORCELAIN_AUTARCH = Model("porcelain_autarch", 256, [
    # The dais the court carries: a walking palanquin of eight gilded legs.
    Part("dais", "root", (0.0, 2.0, 0.0), (0, 0, 0), [
        Box((-11, -4, -9), (22, 4, 18), "dark"),
        Box((-9, -5.5, -7), (18, 2, 14), "gold"),
    ]),
    *[part
      for i in range(8)
      for part in _radial_arm(i, 8, "bearer_", "root", 9.0, 2.0,
                              (2, 10, 2), (2, 12, 2), (3, 2, 3), "gold", 32 * D)],
    # The King himself.
    Part("torso", "dais", (0.0, -5.5, 0.0), (0, 0, 0), [
        Box((-10, -14, -7), (20, 14, 14), "glaze"),
        Box((-10.6, -13, -5), (1, 12, 10), "dark"),    # cloak wall, right
        Box((9.6, -13, -5), (1, 12, 10), "dark"),      # cloak wall, left
    ]),
    Part("chest", "torso", (0.0, -14.0, 0.0), (0, 0, 0), [
        Box((-9, -12, -6), (18, 12, 12), "glaze"),
        Box((-3, -10, -6.6), (6, 8, 1), "glow"),        # the reliquary window
        Box((-9.5, -12.5, -6.5), (19, 2, 13), "gold"),  # collar of set gold
    ]),
    Part("head", "chest", (0.0, -12.0, 0.0), (0, 0, 0), [
        Box((-6, -14, -4), (12, 14, 8), "mask"),
    ]),
    Part("crown_band", "head", (0.0, -14.0, 0.0), (0, 0, 0), [
        Box((-7, -3, -5), (14, 3, 10), "gold"),
        Box((-6.3, -1, -5.3), (12, 1, 1), "dark"),      # crown filigree course
    ]),
    # Regalia: brow and chin bands, shoulder shrines, hanging censers.
    Part("brow_band", "head", (0.0, -10.0, -4.2), (0, 0, 0), [
        Box((-6, 0, 0), (12, 2, 1), "gold"),
    ]),
    Part("chin_band", "head", (0.0, -2.0, -4.2), (0, 0, 0), [
        Box((-3, 0, 0), (6, 2, 1), "gold"),
    ]),
    Part("shrine_r", "chest", (-6.0, -12.5, 2.0), (0, 0, 8 * D), [
        Box((-2.5, -6, -2), (5, 6, 4), "dark"),
        Box((-1.5, -5, -2.4), (3, 4, 1), "gold"),
    ]),
    Part("shrine_l", "chest", (6.0, -12.5, 2.0), (0, 0, -8 * D), [
        Box((-2.5, -6, -2), (5, 6, 4), "dark"),
        Box((-1.5, -5, -2.4), (3, 4, 1), "gold"),
    ]),
    Part("censer_r", "dais", (-9.0, -5.5, -8.0), (0, 0, 0), [
        Box((-0.5, 0, -0.5), (1, 5, 1), "dark"),
        Box((-1.5, 5, -1.5), (3, 3, 3), "glow"),
    ]),
    Part("censer_l", "dais", (9.0, -5.5, -8.0), (0, 0, 0), [
        Box((-0.5, 0, -0.5), (1, 5, 1), "dark"),
        Box((-1.5, 5, -1.5), (3, 3, 3), "glow"),
    ]),
    Part("fringe_f", "dais", (0.0, -1.0, -9.2), (6 * D, 0, 0), [
        Box((-9, 0, 0), (18, 5, 1), "thread"),
    ]),
    Part("fringe_b", "dais", (0.0, -1.0, 9.2), (-6 * D, 0, 0), [
        Box((-9, 0, 0), (18, 5, 1), "thread"),
    ]),
    *[Part(f"crown_spike_{i}", "crown_band", (-6.0 + i * 3.0, -3.0, 0.0),
           (0, 0, (i - 2) * -8 * D), [
        Box((-1, -4 - (2 if i == 2 else 0), 3.5), (2, 4 + (2 if i == 2 else 0), 1), "gold"),
    ]) for i in range(5)],
    # Two great arms.
    *_leg("arm_r", "chest", (-10.5, -11.0, 0.0), (6, 16, 6), (6, 14, 6)),
    *_leg("arm_l", "chest", (10.5, -11.0, 0.0), (6, 16, 6), (6, 14, 6)),
    Part("hand_r", "arm_r_lower", (0.0, 14.0, 0.0), (0, 0, 0), [
        Box((-3.5, 0, -3.5), (7, 3, 7), "dark"),
    ]),
    Part("hand_l", "arm_l_lower", (0.0, 14.0, 0.0), (0, 0, 0), [
        Box((-3.5, 0, -3.5), (7, 3, 7), "dark"),
    ]),
    # Four mantle-arms of drawn gold, the King's surplus.
    *_leg("mantle_arm_r0", "torso", (-9.5, -12.0, 3.0), (2, 8, 2), (2, 8, 2), "gold"),
    *_leg("mantle_arm_l0", "torso", (9.5, -12.0, 3.0), (2, 8, 2), (2, 8, 2), "gold"),
    *_leg("mantle_arm_r1", "torso", (-9.5, -6.0, 5.0), (2, 7, 2), (2, 7, 2), "gold"),
    *_leg("mantle_arm_l1", "torso", (9.5, -6.0, 5.0), (2, 7, 2), (2, 7, 2), "gold"),
    # Three orbiting halo rings behind the crown.
    Part("ring_0", "head", (0.0, -8.0, 5.0), (0, 0, 0), []),
    *[Part(f"ring0_petal_{i}", "ring_0", (0.0, 0.0, 0.0), (0, 0, i * 60 * D), [
        Box((-1.5, -11, -0.5), (3, 5, 1), "gold"),
    ]) for i in range(6)],
    Part("ring_1", "head", (0.0, -8.0, 7.0), (0, 0, 0), []),
    *[Part(f"ring1_petal_{i}", "ring_1", (0.0, 0.0, 0.0), (0, 0, (30 + i * 60) * D), [
        Box((-1, -15, -0.5), (2, 6, 1), "glaze"),
    ]) for i in range(6)],
    Part("ring_2", "head", (0.0, -8.0, 9.0), (0, 0, 0), []),
    *[Part(f"ring2_petal_{i}", "ring_2", (0.0, 0.0, 0.0), (0, 0, (15 + i * 45) * D), [
        Box((-1, -19, -0.5), (2, 7, 1), "dark" if i % 2 else "gold"),
    ]) for i in range(8)],
])

SALT_SWORN = Model("salt_sworn", 128, [
    Part("body", "root", (0.0, 6.0, 0.0), (0, 0, 0), [
        Box((-4, 0, -2), (8, 10, 4), "coat"),
        Box((-4.5, 7, -2.5), (9, 3, 5), "coat"),        # coat skirt
        Box((-2, 2, -3), (4, 5, 1), "leather"),         # salt satchel
    ]),
    Part("head", "body", (0.0, 0.0, 0.0), (0, 0, 0), [
        Box((-3, -6, -3), (6, 6, 6), "skin"),
    ]),
    Part("hat", "head", (0.0, -6.0, 0.0), (0, 0, 6 * D), [
        Box((-4.5, 0, -4.5), (9, 1, 9), "leather"),
        Box((-2.5, -3, -2.5), (5, 3, 5), "leather"),
    ]),
    Part("arm_r", "body", (-4.5, 1.0, 0.0), (0, 0, 0), [
        Box((-2, 0, -1.5), (3, 10, 3), "coat"),
    ]),
    Part("blade", "arm_r", (-0.5, 10.0, 0.0), (0, 0, 0), [
        Box((-0.5, 0, -0.5), (1, 7, 1), "dark"),
    ]),
    Part("arm_l", "body", (4.5, 1.0, 0.0), (0, 0, 0), [
        Box((-1, 0, -1.5), (3, 10, 3), "coat"),
    ]),
    Part("lantern", "arm_l", (0.5, 10.0, 0.0), (0, 0, 0), [
        Box((-1.5, 0, -1.5), (3, 3, 3), "glow"),
    ]),
    *_leg("leg_r", "root", (-2.0, 16.0, 0.0), (3, 4, 3), (3, 4, 3), "leather"),
    *_leg("leg_l", "root", (2.0, 16.0, 0.0), (3, 4, 3), (3, 4, 3), "leather"),
])

ALL_MODELS = [SHARDLING, VESSEL, PORCELAIN_HOUND, SEAMSTRESS, KILNBORN,
              CHIME, FONT_OF_GOLD, MANIFOLD, RELIQUARY_COLOSSUS,
              PORCELAIN_AUTARCH, SALT_SWORN,
              GILDED_COW, GILDED_PIG, GILDED_SHEEP, GILDED_CHICKEN,
              GILDED_SPIDER, GILDED_CASK, REFUGEE, GILT_MAD, HALF_SEWN]

# Which parts carry the serene painted face.
MASK_PARTS = {
    "shardling": set(),
    "vessel": {"head"},
    "porcelain_hound": {"head"},
    "seamstress": {"head"},
    "kilnborn": {"head"},
    "chime": {"mask"},
    "font_of_gold": set(),
    "manifold": set(),
    "reliquary_colossus": {"head"},
    "porcelain_autarch": {"head"},
    "salt_sworn": set(),
    "gilded_cow": {"head"},
    "gilded_pig": {"head"},
    "gilded_sheep": {"head"},
    "gilded_chicken": {"head", "mut2_head2"},
    "gilded_spider": {"cephalo"},
    "gilded_cask": {"body"},
    "refugee": set(),
    "gilt_mad": set(),
    "half_sewn": {"head"},
}

# Every species regilds as it refires: all textures come in three tiers.
TIERED_TEXTURES = {"shardling", "vessel", "porcelain_hound", "seamstress", "kilnborn",
                   "chime", "font_of_gold", "manifold", "reliquary_colossus",
                   "porcelain_autarch", "gilded_cow", "gilded_pig", "gilded_sheep",
                   "gilded_chicken", "gilded_spider", "gilded_cask", "half_sewn"}
