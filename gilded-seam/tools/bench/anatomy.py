"""Host silhouettes and the corruption operators that ruin them.

Rule one of this mod: **an infected cow must still read as a cow.** So every
blighted animal starts from the vanilla creature's own proportions - the same
box sizes, the same pivots, the same hide colours - and the infection is then
*grafted on top* as named `mut1_`/`mut2_` parts that appear as it matures.
The host silhouette is never replaced, only violated.

Ground level is y = 24 (Minecraft model space, +y down), matching vanilla.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field

from core import D, Box, Part, chain, mirror

GROUND = 24.0


def _b(o, s, mat, **kw) -> Box:
    return Box(o, s, mat, **kw)


# ---------------------------------------------------------------------------
# Host silhouettes
# ---------------------------------------------------------------------------


@dataclass
class Quad:
    """A vanilla-proportioned quadruped."""

    hide: str
    body: tuple = (12, 10, 18)      # w, h, d
    body_y: float = 4.0
    head: tuple = (8, 8, 6)
    head_y: float = 4.0
    head_z: float = -9.0
    leg: tuple = (4, 12, 4)
    leg_x: float = 4.0
    leg_z: float = 6.0
    head_mat: str | None = None
    leg_mat: str | None = None
    hoof_mat: str | None = None
    snout: tuple | None = None       # (w, h, d, mat)
    ears: tuple | None = None        # (w, h, d, mat, x, y, z)
    horns: bool = False
    tail: tuple | None = None        # (w, h, d, mat, rot_x)
    fleece: float = 0.0              # wool overlay inflation
    fleece_mat: str = "wool"
    # Real pupils differ by species and keeping that true is most of why an
    # infected animal still reads as that animal.
    eye_style: str = "round"
    eye_spares: int = 3

    def build(self) -> list[Part]:
        hm = self.head_mat or self.hide
        lm = self.leg_mat or self.hide
        bw, bh, bd = self.body
        hw, hh, hd = self.head
        lw, lh, ld = self.leg
        parts = [
            Part("body", "root", (0.0, self.body_y, 0.0), (0, 0, 0),
                 [_b((-bw / 2, 0, -bd / 2), (bw, bh, bd), self.hide)]),
            Part("head", "body", (0.0, self.head_y - self.body_y, self.head_z),
                 (0, 0, 0),
                 [_b((-hw / 2, 0, -hd), (hw, hh, hd), hm)]),
        ]
        if self.fleece:
            parts[0].boxes.append(
                _b((-bw / 2, 0, -bd / 2), (bw, bh, bd), self.fleece_mat,
                   grow=self.fleece))
            parts[1].boxes.append(
                _b((-hw / 2, 0, -hd + 1), (hw, hh - 1, hd - 2), self.fleece_mat,
                   grow=self.fleece * 0.7))
        if self.snout:
            sw, sh, sd, sm = self.snout
            parts.append(Part("snout", "head", (0.0, hh * 0.45, -hd), (0, 0, 0),
                              [_b((-sw / 2, 0, -sd), (sw, sh, sd), sm)]))
        if self.ears:
            ew, eh, ed, em, ex, ey, ez = self.ears
            parts.append(Part("ear_r", "head", (-ex, ey, ez), (0, 0, -22 * D),
                              [_b((-ew, 0, -ed / 2), (ew, eh, ed), em)]))
            parts.extend(mirror(parts[-1:], "ear_r", "ear_l"))
        if self.horns:
            parts.append(Part("horn_r", "head", (-hw / 2, 1.0, -hd + 1.5),
                              (0, 0, -30 * D),
                              [_b((-3, -1, -1), (3, 1.5, 1.5), "tooth")]))
            parts.extend(mirror(parts[-1:], "horn_r", "horn_l"))
        if self.tail:
            tw, th, td, tm, trx = self.tail
            parts.append(Part("tail", "body", (0.0, 1.0, bd / 2), (trx, 0, 0),
                              [_b((-tw / 2, 0, 0), (tw, th, td), tm)]))
        parts.extend(infected_face("head", hw, hh, hd,
                                   eye=max(3.0, min(5.0, hw * 0.52)),
                                   teeth=5 if hw >= 6 else 4,
                                   style=self.eye_style, spares=self.eye_spares))
        for tag, sx, sz in (("fr", -1, -1), ("fl", 1, -1), ("br", -1, 1), ("bl", 1, 1)):
            parts.extend(self._limb(tag, sx, sz, lw, lh, ld, lm))
        return parts

    def _limb(self, tag, sx, sz, lw, lh, ld, lm) -> list[Part]:
        """A leg with joints in it, instead of one rigid post.

        Vanilla legs are a single box, which is why a vanilla walk can only
        swing them like a pendulum - there is no knee to bend and no foot to
        lift. This splits the same column into thigh, shank and foot. At rest
        every joint is at zero and the three stack back into exactly the box
        that was there before, so the animal's standing silhouette is
        unchanged; under animation the leg can now fold, lift and plant.

        Front and hind limbs get different proportions on purpose: a hind leg
        carries a longer shank and a hock that breaks the other way, and that
        asymmetry is most of what makes a quadruped read as an animal rather
        than a table walking.
        """
        hind = sz > 0
        thigh_h = lh * (0.40 if hind else 0.44)
        shank_h = lh * (0.42 if hind else 0.38)
        foot_h = lh - thigh_h - shank_h
        top = GROUND - lh
        # Slight taper down the limb - thicker at the shoulder, narrow at the
        # ankle - so it reads as a leg and not as a chair leg.
        tw, sw = lw, max(1.5, lw - 0.7)
        parts = [
            Part(f"leg_{tag}", "root", (sx * self.leg_x, top, sz * self.leg_z),
                 (0, 0, 0),
                 [_b((-tw / 2, 0, -ld / 2), (tw, thigh_h, ld), lm)]),
            Part(f"leg_{tag}_1", f"leg_{tag}", (0.0, thigh_h, 0.0), (0, 0, 0),
                 [_b((-sw / 2, 0, -ld / 2 + 0.2), (sw, shank_h, ld - 0.4), lm)]),
            Part(f"foot_{tag}", f"leg_{tag}_1", (0.0, shank_h, 0.0), (0, 0, 0),
                 [_b((-lw / 2, 0, -ld / 2 - 0.4), (lw, foot_h, ld + 0.6),
                     self.hoof_mat or lm)]),
        ]
        return parts


# Vanilla proportions, straight off the vanilla models.
HOSTS: dict[str, Quad] = {
    "cow": Quad("cow_hide", body=(12, 10, 18), body_y=4, head=(8, 8, 6),
                head_y=4, head_z=-9, leg=(4, 12, 4), leg_x=4, leg_z=6,
                horns=True, snout=(6, 4, 1, "cow_white"),
                ears=(2, 3, 1, "cow_hide", 4.5, 1.5, -3),
                tail=(1, 8, 1, "cow_hide", -0.35),
                 eye_style="bar", eye_spares=3),
    "pig": Quad("pig_skin", body=(10, 8, 16), body_y=10, head=(8, 8, 8),
                head_y=10, head_z=-8, leg=(4, 6, 4), leg_x=3, leg_z=5,
                snout=(4, 3, 1, "pig_skin"),
                ears=(2, 2, 1, "pig_skin", 4.2, 0.5, -5),
                tail=(1, 3, 1, "pig_skin", -0.8),
                 eye_style="bar", eye_spares=2),
    "sheep": Quad("sheep_face", body=(8, 6, 16), body_y=6, head=(6, 6, 8),
                  head_y=6, head_z=-8, leg=(4, 12, 4), leg_x=3, leg_z=5,
                  fleece=1.75,
                 eye_style="bar", eye_spares=3),
    "rabbit": Quad("rabbit_fur", body=(6, 5, 10), body_y=15, head=(5, 4, 5),
                   head_y=13, head_z=-5, leg=(2, 4, 2), leg_x=2, leg_z=3.5,
                   ears=(1.5, 5, 1, "rabbit_fur", 1.6, -1.0, -1.0),
                   tail=(2, 2, 2, "rabbit_fur", -0.6),
                 eye_style="round", eye_spares=3),
    "goat": Quad("goat_fur", body=(9, 8, 16), body_y=6, head=(5, 6, 7),
                 head_y=6, head_z=-8, leg=(3, 12, 3), leg_x=3, leg_z=5,
                 horns=True, ears=(3, 1.5, 1, "goat_fur", 3.0, 1.5, -3),
                 tail=(1, 3, 1, "goat_fur", -0.9),
                 eye_style="bar", eye_spares=3),
    "fox": Quad("fox_fur", body=(6, 5, 11), body_y=11, head=(8, 6, 6),
                head_y=10, head_z=-6, leg=(2, 6, 2), leg_x=2.5, leg_z=3.5,
                snout=(3, 2, 2, "fox_fur"),
                ears=(2, 3, 1, "fox_fur", 3.0, -1.0, -2.0),
                tail=(4, 9, 4, "fox_fur", -0.35),
                 eye_style="slit", eye_spares=2),
    "cat": Quad("cat_fur", body=(6, 5, 10), body_y=12, head=(5, 4, 5),
                head_y=11, head_z=-5, leg=(2, 7, 2), leg_x=2, leg_z=3.5,
                ears=(2, 2, 1, "cat_fur", 1.8, -0.5, -1.5),
                tail=(1, 9, 1, "cat_fur", -0.9),
                 eye_style="slit", eye_spares=3),
    "horse": Quad("horse_hide", body=(10, 11, 22), body_y=2, head=(6, 8, 8),
                  head_y=-2, head_z=-11, leg=(4, 16, 4), leg_x=4, leg_z=8,
                  snout=(4, 4, 2, "horse_hide"),
                  ears=(1.5, 3, 1, "horse_hide", 2.2, -2.0, -4.0),
                  tail=(3, 12, 3, "horse_hide", -0.4),
                 eye_style="bar", eye_spares=2),
    "llama": Quad("llama_fur", body=(8, 12, 16), body_y=2, head=(4, 8, 6),
                  head_y=-6, head_z=-9, leg=(3, 14, 3), leg_x=3, leg_z=6,
                  ears=(1.5, 3, 1, "llama_fur", 1.8, -2.5, -2.5),
                  tail=(2, 4, 2, "llama_fur", -0.6),
                 eye_style="bar", eye_spares=2),
    "wolf": Quad("wolf_fur", body=(6, 6, 12), body_y=8, head=(6, 6, 6),
                 head_y=7, head_z=-6, leg=(2, 8, 2), leg_x=2.5, leg_z=4,
                 snout=(3, 3, 2, "wolf_fur"),
                 ears=(2, 3, 1, "wolf_fur", 2.5, -0.5, -1.5),
                 tail=(2, 8, 2, "wolf_fur", -0.5),
                 eye_style="slit", eye_spares=2),
}


def creeper_host() -> list[Part]:
    """Vanilla creeper: 8x12x4 torso, cubic head, four stubby legs."""
    parts = [
        Part("body", "root", (0.0, 6.0, 0.0), (0, 0, 0),
             [_b((-4, 0, -2), (8, 12, 4), "creeper_skin")]),
        Part("head", "body", (0.0, 0.0, 0.0), (0, 0, 0),
             [_b((-4, -8, -4), (8, 8, 8), "creeper_skin")]),
    ]
    # The creeper's head is a cube with the face on the front; the blight
    # gives that face somewhere to open.
    parts.extend(infected_face("head", 8, 8, 4, eye=4.2, teeth=5,
                               jaw_mat="creeper_skin", style="void", spares=2))
    for tag, sx, sz in (("fr", -1, -1), ("fl", 1, -1), ("br", -1, 1), ("bl", 1, 1)):
        parts.append(Part(f"leg_{tag}", "root", (sx * 2, 18.0, sz * 4), (0, 0, 0),
                          [_b((-2, 0, -2), (4, 6, 4), "creeper_skin")]))
    return parts


def spider_host() -> list[Part]:
    """Vanilla spider: head, thorax, abdomen and eight jointed legs."""
    parts = [
        Part("body", "root", (0.0, 15.0, 0.0), (0, 0, 0),
             [_b((-3, -3, -3), (6, 6, 6), "spider_shell")]),
        Part("abdomen", "body", (0.0, 0.0, 9.0), (0, 0, 0),
             [_b((-5, -4, -6), (10, 8, 12), "spider_shell")]),
        Part("head", "body", (0.0, 0.0, -3.0), (0, 0, 0),
             [_b((-4, -4, -8), (8, 8, 8), "spider_shell")]),
    ]
    for i in range(4):
        z = -1.0 + i * 2.6
        yaw = (36 - i * 24) * D
        parts.append(Part(f"leg_r{i}", "body", (-4.0, 0.0, z), (0, yaw, 48 * D),
                          [_b((-8, -1, -1), (8, 2, 2), "spider_shell")]))
        parts.append(Part(f"leg_r{i}_2", f"leg_r{i}", (-8.0, 0.0, 0.0), (0, 0, -80 * D),
                          [_b((-9, -1, -1), (9, 2, 2), "spider_shell")]))
    # Spiders already have eyes; the blight adds more, and a mouth.
    parts.extend(infected_face("head", 8, 8, 4, eye=3.4, teeth=6,
                               jaw_mat="spider_shell", style="simple", spares=3))
    parts.extend(mirror([p for p in parts if p.name.startswith("leg_r")],
                        "leg_r", "leg_l"))
    return parts


def chicken_host() -> list[Part]:
    parts = [
        Part("body", "root", (0.0, 11.0, 0.0), (0, 0, 0),
             [_b((-3, 0, -4), (6, 8, 8), "feather")]),
        Part("head", "body", (0.0, -4.0, -4.0), (0, 0, 0),
             [_b((-2, 0, -3), (4, 6, 3), "feather")]),
        Part("beak", "head", (0.0, 2.0, -3.0), (0, 0, 0),
             [_b((-2, 0, -2), (4, 2, 2), "beak")]),
        Part("wattle", "head", (0.0, 3.0, -3.0), (0, 0, 0),
             [_b((-1, 0, -2), (2, 2, 2), "comb")]),
        Part("comb", "head", (0.0, 0.0, -1.5), (0, 0, 0),
             [_b((-0.5, -2, -2), (1, 2, 4), "comb")]),
        Part("wing_r", "body", (-3.0, 1.0, -1.0), (0, 0, 0),
             [_b((-1, 0, -3), (1, 4, 6), "feather")]),
    ]
    parts.extend(mirror(parts[-1:], "wing_r", "wing_l"))
    parts.extend(infected_face("head", 4, 6, 3, eye=3.0, teeth=4,
                               jaw_mat="feather", style="round", spares=2))
    parts.append(Part("leg_r", "root", (-2.0, 19.0, 1.0), (0, 0, 0),
                      [_b((-1, 0, -3), (3, 5, 3), "beak")]))
    parts.extend(mirror(parts[-1:], "leg_r", "leg_l"))
    return parts


def humanoid(skin: str, cloth: str, *, tall: float = 0.0) -> list[Part]:
    """Vanilla humanoid proportions - villagers, the dead, the living."""
    return [
        Part("body", "root", (0.0, 12.0 - tall, 0.0), (0, 0, 0),
             [_b((-4, -12, -2), (8, 12, 4), cloth)]),
        Part("head", "body", (0.0, -12.0, 0.0), (0, 0, 0),
             [_b((-4, -8, -4), (8, 8, 8), skin)]),
        Part("arm_r", "body", (-4.0, -10.0, 0.0), (0, 0, 0),
             [_b((-4, -2, -2), (4, 12, 4), cloth)]),
        Part("arm_l", "body", (4.0, -10.0, 0.0), (0, 0, 0),
             [_b((0, -2, -2), (4, 12, 4), cloth)]),
        Part("leg_r", "root", (-2.0, 12.0, 0.0), (0, 0, 0),
             [_b((-2, 0, -2), (4, 12, 4), cloth)]),
        Part("leg_l", "root", (2.0, 12.0, 0.0), (0, 0, 0),
             [_b((-2, 0, -2), (4, 12, 4), cloth)]),
    ]


# ---------------------------------------------------------------------------
# Corruption operators
# ---------------------------------------------------------------------------


def split_open(anchor: str, *, at: tuple, width: float, height: float,
               depth: float = 2.0, tier: int = 1, name: str = "rift",
               eyes: bool = True) -> list[Part]:
    """Tears the host open along a seam: two peeled-back shell flaps, wet
    flesh and strung amber inside, and eyes looking out of the wound."""
    p = f"mut{tier}_{name}"
    x, y, z = at
    parts = [
        Part(p, anchor, (x, y, z), (0, 0, 0),
             [_b((-width / 2, -height / 2, -depth * 0.4), (width, height, depth), "flesh")]),
        Part(f"{p}_flap_r", p, (-width / 2, 0.0, 0.0), (0, -28 * D, 0),
             [_b((-width * 0.55, -height / 2, -1.0), (width * 0.55, height, 1.6), "chitin")]),
        Part(f"{p}_flap_l", p, (width / 2, 0.0, 0.0), (0, 28 * D, 0),
             [_b((0, -height / 2, -1.0), (width * 0.55, height, 1.6), "chitin")]),
    ]
    # Strands of resin bridging the gap, like drawn sap.
    for i in range(3):
        t = (i + 1) / 4.0
        parts.append(Part(f"{p}_strand{i}", p,
                          (-width / 2 + width * t, -height / 2 + height * t * 0.6,
                           -depth * 0.45),
                          (0, 0, (18 - 12 * i) * D),
                          [_b((-0.5, 0, -0.5), (1, height * 0.55, 1), "amber")]))
    if eyes:
        parts.append(Part(f"{p}_eyes", p, (0.0, 0.0, -depth * 0.45), (0, 0, 0),
                          [_b((-width * 0.32, -height * 0.28, -0.6),
                              (width * 0.64, height * 0.56, 0.6), "eye")]))
    return parts


def grafted_arm(anchor: str, *, at: tuple, tier: int = 2, side: int = -1,
                scale: float = 1.0, name: str = "arm") -> list[Part]:
    """A human arm - shoulder, forearm, hand, four fingers and a thumb -
    growing out of an animal that should not have one."""
    p = f"mut{tier}_{name}"
    x, y, z = at
    up = 6.0 * scale
    fore = 6.0 * scale
    parts = [
        # Shoulder hangs down and out; the elbow then swings the forearm
        # forward, so the limb reads as an arm rather than a spoke.
        Part(p, anchor, (x, y, z), (8 * D, 0, side * 34 * D),
             [_b((-1.2 * scale, 0, -1.2 * scale), (2.4 * scale, up, 2.4 * scale), "sinew")]),
        Part(f"{p}_fore", p, (0.0, up, 0.0), (-62 * D, 0, side * -18 * D),
             [_b((-1.0 * scale, 0, -1.0 * scale), (2 * scale, fore, 2 * scale), "flesh")]),
        Part(f"{p}_hand", f"{p}_fore", (0.0, fore, 0.0), (-14 * D, 0, 0),
             [_b((-1.4 * scale, 0, -0.9 * scale), (2.8 * scale, 2.2 * scale, 1.8 * scale), "chitin")]),
    ]
    for i in range(4):
        fx = (-1.1 + i * 0.75) * scale
        parts.extend(chain(f"{p}_f{i}", f"{p}_hand", (fx, 2.2 * scale, 0.0),
                           3, (0.8 * scale, 1.6 * scale, 0.8 * scale), "tooth",
                           taper=0.86, curl=(22 * D, 0, 0),
                           root_rot=(6 * D, 0, (i - 1.5) * 7 * D)))
    parts.extend(chain(f"{p}_thumb", f"{p}_hand", (-1.4 * scale, 1.0 * scale, 0.0),
                       2, (0.9 * scale, 1.5 * scale, 0.9 * scale), "tooth",
                       taper=0.85, curl=(20 * D, 0, 0),
                       root_rot=(0, 0, -70 * D)))
    return parts


def lolling_tongue(anchor: str, *, at: tuple, tier: int = 1, segments: int = 6,
                   thick: float = 1.6, name: str = "tongue") -> list[Part]:
    """A tongue far too long for the skull it came out of."""
    p = f"mut{tier}_{name}"
    parts = chain(p, anchor, at, segments, (thick, 2.6, thick * 0.7), "tongue",
                  taper=0.88, curl=(16 * D, 0, 0), root_rot=(58 * D, 0, 0))
    tip = f"{p}_{segments - 1}"
    parts.append(Part(f"{p}_tip", tip, (0.0, 2.0, 0.0), (0, 0, 0),
                      [_b((-0.6, 0, -0.5), (1.2, 1.6, 1.0), "amber")]))
    return parts


def eye_stalks(anchor: str, *, at: tuple, count: int = 3, tier: int = 2,
               spread: float = 3.0, length: float = 3.0,
               name: str = "stalks") -> list[Part]:
    """Eyes on stalks, the way eyeblossoms open on a pale oak."""
    p = f"mut{tier}_{name}"
    x, y, z = at
    parts = [Part(p, anchor, (x, y, z), (0, 0, 0), [])]
    for i in range(count):
        a = (i / max(1, count - 1) - 0.5) * 2.0
        parts.append(Part(f"{p}_s{i}", p, (a * spread, 0.0, -abs(a) * 0.8),
                          (-18 * D, a * 26 * D, a * 30 * D),
                          [_b((-0.5, -length, -0.5), (1, length, 1), "sinew")]))
        parts.append(Part(f"{p}_e{i}", f"{p}_s{i}", (0.0, -length, 0.0), (0, 0, 0),
                          [_b((-1.2, -2.4, -1.2), (2.4, 2.4, 2.4), "eye")]))
    return parts


def spine_plates(anchor: str, *, from_z: float, to_z: float, y: float,
                 count: int = 5, tier: int = 1, height: float = 3.0,
                 name: str = "plates") -> list[Part]:
    """A ridge of hardened resin plates pushing up through the hide."""
    p = f"mut{tier}_{name}"
    parts = [Part(p, anchor, (0.0, y, 0.0), (0, 0, 0), [])]
    for i in range(count):
        t = i / max(1, count - 1)
        z = from_z + (to_z - from_z) * t
        h = height * (0.55 + 0.45 * math.sin(math.pi * t))
        parts.append(Part(f"{p}_p{i}", p, (0.0, 0.0, z), (-16 * D, 0, 0),
                          [_b((-1.2, -h, -0.8), (2.4, h, 1.6), "chitin")]))
    return parts


def antler_roots(anchor: str, *, at: tuple, tier: int = 2, side: int = -1,
                 name: str = "roots") -> list[Part]:
    """Pale oak growing out of the skull, because the blight is still wood."""
    p = f"mut{tier}_{name}"
    x, y, z = at
    parts = chain(p, anchor, (x, y, z), 3, (1.6, 4.0, 1.6), "bark",
                  taper=0.78, curl=(-14 * D, side * 10 * D, side * 22 * D),
                  root_rot=(-24 * D, 0, side * 30 * D))
    parts.extend(chain(f"{p}_b", f"{p}_1", (0.0, 2.0, 0.0), 2, (1.1, 3.0, 1.1),
                       "bark", taper=0.8, curl=(-10 * D, 0, side * 26 * D),
                       root_rot=(-30 * D, 0, side * -46 * D)))
    return parts


def resin_growth(anchor: str, *, at: tuple, size: tuple = (4, 4, 4),
                 tier: int = 1, name: str = "bulb") -> list[Part]:
    """A blister of amber welded to the host, lit from inside."""
    p = f"mut{tier}_{name}"
    w, h, d = size
    return [
        Part(p, anchor, at, (0, 0, 0),
             [_b((-w / 2, -h / 2, -d / 2), (w, h, d), "amber")]),
        Part(f"{p}_core", p, (0.0, 0.0, 0.0), (0, 0, 0),
             [_b((-w / 4, -h / 4, -d / 4), (w / 2, h / 2, d / 2), "amberglow")]),
    ]


def extra_legs(anchor: str, *, at: tuple, tier: int = 2, count: int = 2,
               length: float = 9.0, side: int = -1,
               name: str = "legs") -> list[Part]:
    """Surplus limbs, jointed the wrong way."""
    p = f"mut{tier}_{name}"
    x, y, z = at
    parts: list[Part] = []
    for i in range(count):
        zz = z + i * 3.4
        parts.extend(chain(f"{p}{i}", anchor, (x, y, zz), 3,
                           (1.8, length / 2.4, 1.8), "chitin", taper=0.8,
                           curl=(0, 0, side * -64 * D),
                           root_rot=(0, side * 12 * D, side * 58 * D)))
    return parts


def eye_cluster(anchor: str, *, at: tuple, count: int = 4, tier: int = 1,
                spread: tuple = (4.0, 3.0), size: float = 2.6,
                out: float = -1.0, name: str = "eyes") -> list[Part]:
    """A knot of eyeballs bulging straight out of the hide.

    Unlike `eye_stalks` these sit tight against the body, which is what makes
    a blighted animal unsettling at a glance rather than only in close-up:
    you register the eyes before you register what they are attached to."""
    p = f"mut{tier}_{name}"
    x, y, z = at
    sx, sy = spread
    parts = [Part(p, anchor, (x, y, z), (0, 0, 0), [])]
    for i in range(count):
        a = (i / max(1, count - 1) - 0.5) * 2.0
        b = math.sin(i * 2.399)  # scattered, not in a row
        s_i = size * (0.72 + 0.38 * abs(math.cos(i * 1.7)))
        parts.append(Part(f"{p}_e{i}", p,
                          (a * sx, b * sy, out * (0.4 + 0.25 * abs(b))),
                          (0, a * 26 * D, b * 20 * D),
                          [_b((-s_i / 2, -s_i / 2, -s_i * 0.62), (s_i, s_i, s_i * 0.62),
                              "eye"),
                           _b((-s_i * 0.62, -s_i * 0.62, -s_i * 0.3),
                              (s_i * 1.24, s_i * 1.24, s_i * 0.4), "sinew")]))
    return parts


def infected_face(anchor: str, hw: float, hh: float, hd: float, *,
                  eye: float = 2.6, teeth: int = 5, jaw_mat: str = "flesh",
                  tier: int = 0, name: str = "face",
                  style: str = "round", spares: int = 3) -> list[Part]:
    """The blight's face, built to stand proud of the skull.

    A host with a plain box for a head reads as a reskin no matter what is
    happening to the rest of it, so every infected creature gets this from
    stage one: eyeballs that bulge out past the snout in their own sinew
    sockets, an unhinged lower jaw on a real pivot, two opposed rows of
    teeth, and a tongue sitting in the gap. All of it is geometry rather than
    paint, so it catches the light and throws shadow at any angle.

    `anchor` is the head part; `hw/hh/hd` its box dimensions, so the face
    scales itself to whatever it is growing out of.
    """
    p = f"mut{tier}_{name}" if tier else name
    front = -hd
    parts: list[Part] = [Part(p, anchor, (0.0, 0.0, 0.0), (0, 0, 0), [])]

    # --- eyes ------------------------------------------------------------
    # Set wide and high, and pushed a full unit clear of the face so they
    # break the silhouette instead of sitting flush in it.
    for side, tag in ((-1, "r"), (1, "l")):
        ex = side * hw * 0.29
        ey = hh * 0.30
        parts.append(Part(f"{p}_socket_{tag}", p, (ex, ey, front + 0.2),
                          (0, side * 24 * D, side * -10 * D),
                          [_b((-eye * 0.62, -eye * 0.62, -0.9),
                              (eye * 1.24, eye * 1.24, 1.0), "sinew")]))
        parts.append(Part(f"{p}_eye_{tag}", f"{p}_socket_{tag}", (0.0, 0.0, -0.9),
                          (0, 0, 0),
                          [_b((-eye / 2, -eye / 2, -eye * 0.8),
                              (eye, eye, eye * 0.8), "eye:" + style)]))
        # A brow of hardened resin over each eye, so the face has a scowl.
        parts.append(Part(f"{p}_brow_{tag}", p, (ex, ey - eye * 0.72, front + 0.1),
                          (0, 0, side * 14 * D),
                          [_b((-eye * 0.7, -0.9, -1.2), (eye * 1.4, 1.1, 1.4), "chitin")]))

    # Spare eyes crowded onto the skull: the face is wrong before the rest
    # of the body has begun to change.
    for i, (sx, sy, sc) in enumerate((((-0.30, -0.55, 0.55), (0.34, -0.62, 0.45),
                                       (0.0, -0.80, 0.40))[:spares])):
        s = eye * sc
        parts.append(Part(f"{p}_spare{i}", p,
                          (sx * hw, sy * hh + hh * 0.30, front + 0.3),
                          (0, sx * 40 * D, sy * 26 * D),
                          [_b((-s / 2, -s / 2, -s * 0.85), (s, s, s * 0.85), "eye:bloom" if i % 2 else "eye:" + style)]))

    # --- upper jaw and its teeth -----------------------------------------
    parts.append(Part(f"{p}_maw", p, (0.0, hh * 0.66, front + 0.4), (0, 0, 0),
                      [_b((-hw * 0.42, -1.2, -1.6), (hw * 0.84, 1.6, 1.8), jaw_mat)]))
    for i in range(teeth):
        t = (i / max(1, teeth - 1) - 0.5) * 2.0
        parts.append(Part(f"{p}_ut{i}", f"{p}_maw",
                          (t * hw * 0.34, 0.4, -0.9), (0, 0, t * 8 * D),
                          [_b((-0.45, 0, -0.45), (0.9, 1.9 - abs(t) * 0.5, 0.9), "tooth")]))

    # --- lower jaw, hinged and hanging open ------------------------------
    parts.append(Part(f"{p}_jaw", p, (0.0, hh * 0.70, front + 1.6), (26 * D, 0, 0),
                      [_b((-hw * 0.40, 0, -3.0), (hw * 0.80, 1.6, 3.2), jaw_mat)]))
    for i in range(teeth):
        t = (i / max(1, teeth - 1) - 0.5) * 2.0
        parts.append(Part(f"{p}_lt{i}", f"{p}_jaw",
                          (t * hw * 0.32, 0.1, -2.4), (0, 0, t * -8 * D),
                          [_b((-0.4, -1.7 + abs(t) * 0.4, -0.4),
                              (0.8, 1.7 - abs(t) * 0.4, 0.8), "tooth")]))
    parts.append(Part(f"{p}_gullet", f"{p}_jaw", (0.0, 0.2, -1.4), (0, 0, 0),
                      [_b((-hw * 0.26, -0.2, -1.4), (hw * 0.52, 0.9, 1.8), "tongue")]))
    return parts
