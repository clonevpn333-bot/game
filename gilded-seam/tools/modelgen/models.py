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
    # Four gilded wire legs with shard-spike feet.
    *_leg("leg_fr", "root", (-3.0, 19.0, -3.0), (1, 3, 1), (1, 2, 1), "gold"),
    *_leg("leg_fl", "root", (3.0, 19.0, -3.0), (1, 3, 1), (1, 2, 1), "gold"),
    *_leg("leg_br", "root", (-3.0, 19.0, 3.0), (1, 3, 1), (1, 2, 1), "gold"),
    *_leg("leg_bl", "root", (3.0, 19.0, 3.0), (1, 3, 1), (1, 2, 1), "gold"),
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

ALL_MODELS = [SHARDLING, VESSEL, PORCELAIN_HOUND, SEAMSTRESS, KILNBORN,
              CHIME, FONT_OF_GOLD, MANIFOLD, RELIQUARY_COLOSSUS]

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
}

# Mobs whose texture changes per firing tier.
TIERED_TEXTURES = {"shardling", "vessel", "porcelain_hound"}
