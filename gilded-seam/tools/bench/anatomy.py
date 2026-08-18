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
    """A quadruped, built from what actually distinguishes one from another.

    The previous version of this class was a cow with adjustable numbers, and
    every animal generated from it came out a cow: same uniform legs at all
    four corners, no neck, a flat plate for a muzzle, and a rabbit standing
    upright on stilts. The fields below exist because they are the features
    you actually identify an animal by at a glance -

      * fore and hind limbs sized and placed separately. Almost no animal has
        four identical legs, and the ones that come closest (horses) still
        carry them at different heights.
      * a real neck. On a llama it is the entire silhouette; a llama without
        one is a beige cow.
      * a muzzle with length and its own height on the skull, because a fox, a
        wolf and a sheep differ mostly in the shape of the face.
      * haunches - the heavy rear thigh mass on anything that springs.
      * a shoulder ruff, which is the reason a wolf reads as a wolf from
        behind.
    """

    hide: str
    body: tuple = (12, 10, 18)      # w, h, d
    body_y: float = 4.0
    body_pitch: float = 0.0         # nose-down tilt, for crouched builds
    head: tuple = (8, 8, 6)
    head_y: float = 4.0
    head_z: float = -9.0
    head_pitch: float = 0.0
    # (w, h, d, pitch, y, z) - the head hangs off the end of it when present.
    neck: tuple | None = None
    leg: tuple = (4, 12, 4)         # fallback when fore/hind are not given
    leg_x: float = 4.0
    leg_z: float = 6.0
    fore_leg: tuple | None = None
    hind_leg: tuple | None = None
    fore_at: tuple | None = None    # (x, z)
    hind_at: tuple | None = None
    plantigrade: bool = False       # hind foot flat and long, like a hare
    haunch: tuple | None = None     # (w, h, d) heavy rear thigh
    ruff: tuple | None = None       # (w, h, d, mat, y, z) shoulder mane
    head_mat: str | None = None
    leg_mat: str | None = None
    hoof_mat: str | None = None
    muzzle: tuple | None = None     # (w, h, d, mat, y)
    snout: tuple | None = None      # legacy flat plate; muzzle supersedes it
    ears: tuple | None = None       # (w, h, d, mat, x, y, z)
    ear_roll: float = -22.0         # degrees; upright vs. lopped
    horns: bool = False
    horn_sweep: float = -30.0       # degrees back from vertical
    beard: tuple | None = None      # (w, h, d, mat)
    tail: tuple | None = None       # (w, h, d, mat, rot_x)
    tail_links: int = 1
    fleece: float = 0.0
    fleece_mat: str = "wool"
    eye_style: str = "round"
    eye_spares: int = 3

    def build(self) -> list[Part]:
        hm = self.head_mat or self.hide
        lm = self.leg_mat or self.hide
        bw, bh, bd = self.body
        hw, hh, hd = self.head
        parts = [
            Part("body", "root", (0.0, self.body_y, 0.0),
                 (self.body_pitch * D, 0, 0),
                 [_b((-bw / 2, 0, -bd / 2), (bw, bh, bd), self.hide)]),
        ]

        head_parent, head_off = "body", (0.0, self.head_y - self.body_y,
                                         self.head_z)
        if self.neck:
            nw, nh, nd, npitch, ny, nz = self.neck
            parts.append(Part("neck", "body", (0.0, ny, nz), (npitch * D, 0, 0),
                              [_b((-nw / 2, -nh, -nd / 2), (nw, nh, nd), self.hide)]))
            head_parent, head_off = "neck", (0.0, -nh, 0.0)

        parts.append(Part("head", head_parent, head_off,
                          (self.head_pitch * D, 0, 0),
                          [_b((-hw / 2, 0, -hd), (hw, hh, hd), hm)]))

        if self.fleece:
            parts[0].boxes.append(
                _b((-bw / 2, 0, -bd / 2), (bw, bh, bd), self.fleece_mat,
                   grow=self.fleece))
            head = next(p for p in parts if p.name == "head")
            head.boxes.append(
                _b((-hw / 2, 0, -hd + 1), (hw, hh - 1, hd - 2), self.fleece_mat,
                   grow=self.fleece * 0.7))

        # A muzzle is a box with length, not a plate stuck on the front.
        if self.muzzle:
            mw, mh, md, mm, my = self.muzzle
            parts.append(Part("muzzle", "head", (0.0, my, -hd), (0, 0, 0),
                              [_b((-mw / 2, 0, -md), (mw, mh, md), mm)]))
        elif self.snout:
            sw, sh, sd, sm = self.snout
            parts.append(Part("snout", "head", (0.0, hh * 0.45, -hd), (0, 0, 0),
                              [_b((-sw / 2, 0, -sd), (sw, sh, sd), sm)]))

        if self.beard:
            gw, gh, gd, gm = self.beard
            parts.append(Part("beard", "head", (0.0, hh - 0.5, -hd + 0.5),
                              (0, 0, 0),
                              [_b((-gw / 2, 0, -gd), (gw, gh, gd), gm)]))

        if self.ears:
            ew, eh, ed, em, ex, ey, ez = self.ears
            parts.append(Part("ear_r", "head", (-ex, ey, ez),
                              (0, 0, self.ear_roll * D),
                              [_b((-ew, 0, -ed / 2), (ew, eh, ed), em)]))
            parts.extend(mirror(parts[-1:], "ear_r", "ear_l"))

        if self.horns:
            parts.append(Part("horn_r", "head", (-hw / 2, 1.0, -hd + 1.5),
                              (0, 0, self.horn_sweep * D),
                              [_b((-3, -1, -1), (3, 1.5, 1.5), "tooth")]))
            parts.extend(mirror(parts[-1:], "horn_r", "horn_l"))

        if self.ruff:
            rw, rh, rd, rm, ry, rz = self.ruff
            parts.append(Part("ruff", "body", (0.0, ry, rz), (0, 0, 0),
                              [_b((-rw / 2, 0, -rd / 2), (rw, rh, rd), rm)]))

        if self.tail:
            tw, th, td, tm, trx = self.tail
            seg = th / max(1, self.tail_links)
            parent, piv = "body", (0.0, 1.0, bd / 2)
            for i in range(self.tail_links):
                name = "tail" if i == 0 else f"tail_{i}"
                parts.append(Part(name, parent, piv,
                                  (trx if i == 0 else trx * 0.35, 0, 0),
                                  [_b((-tw / 2, 0, 0), (tw, seg, td), tm)]))
                parent, piv = name, (0.0, seg, 0.0)

        parts.extend(infected_face("head", hw, hh, hd,
                                   eye=max(3.0, min(5.0, hw * 0.52)),
                                   teeth=5 if hw >= 6 else 4,
                                   style=self.eye_style, spares=self.eye_spares))

        fore = self.fore_leg or self.leg
        hind = self.hind_leg or self.leg
        fx, fz = self.fore_at or (self.leg_x, self.leg_z)
        hx, hz = self.hind_at or (self.leg_x, self.leg_z)
        for tag, sx in (("fr", -1), ("fl", 1)):
            parts.extend(self._limb(tag, sx, -fz, fx, fore, lm, hind=False))
        for tag, sx in (("br", -1), ("bl", 1)):
            if self.haunch:
                qw, qh, qd = self.haunch
                parts.append(Part(f"haunch_{tag}", "body",
                                  (sx * (hx + 0.3), GROUND - self.body_y - qh - hind[1] * 0.55,
                                   hz - qd * 0.15),
                                  (0, 0, 0),
                                  [_b((-qw / 2, 0, -qd / 2), (qw, qh, qd), lm)]))
            parts.extend(self._limb(tag, sx, hz, hx, hind, lm, hind=True))
        return parts

    def _limb(self, tag, sx, sz, at_x, dims, lm, *, hind) -> list[Part]:
        """A leg with joints in it, instead of one rigid post.

        Vanilla legs are a single box, which is why a vanilla walk can only
        swing them like a pendulum - there is no knee to bend and no foot to
        lift. This splits the same column into thigh, shank and foot. At rest
        every joint is at zero and the three stack back into exactly the box
        that was there before, so the animal's standing silhouette is
        unchanged; under animation the leg can now fold, lift and plant.

        Fore and hind get different proportions on purpose: a hind leg carries
        a longer shank and a hock that breaks the other way, and that asymmetry
        is most of what makes a quadruped read as an animal rather than a table
        walking.
        """
        lw, lh, ld = dims
        thigh_h = lh * (0.40 if hind else 0.44)
        shank_h = lh * (0.42 if hind else 0.38)
        foot_h = lh - thigh_h - shank_h
        top = GROUND - lh
        tw, sw = lw, max(1.5, lw - 0.7)
        # A hare does not stand on its toes: the hind foot is long and flat.
        fd = ld + (5.0 if (hind and self.plantigrade) else 0.6)
        fh = max(1.0, foot_h * (0.55 if (hind and self.plantigrade) else 1.0))
        return [
            Part(f"leg_{tag}", "root", (sx * at_x, top, sz), (0, 0, 0),
                 [_b((-tw / 2, 0, -ld / 2), (tw, thigh_h, ld), lm)]),
            Part(f"leg_{tag}_1", f"leg_{tag}", (0.0, thigh_h, 0.0), (0, 0, 0),
                 [_b((-sw / 2, 0, -ld / 2 + 0.2), (sw, shank_h, ld - 0.4), lm)]),
            Part(f"foot_{tag}", f"leg_{tag}_1", (0.0, shank_h, 0.0), (0, 0, 0),
                 [_b((-lw / 2, 0, -ld / 2 - 0.4), (lw, fh, fd),
                     self.hoof_mat or lm)]),
        ]


# Proportions taken from the vanilla models, then given the parts vanilla
# implies but does not model separately - a wolf's muzzle, a llama's neck.
HOSTS: dict[str, Quad] = {
    "cow": Quad("cow_hide", body=(12, 10, 18), body_y=4, head=(8, 8, 6),
                head_y=4, head_z=-9,
                fore_leg=(4, 12, 4), hind_leg=(4, 12, 4),
                fore_at=(4, 6), hind_at=(4, 6),
                horns=True, muzzle=(6, 4, 2, "cow_white", 3.4),
                ears=(2, 3, 1, "cow_hide", 4.5, 1.5, -3),
                tail=(1, 8, 1, "cow_hide", -0.35), tail_links=2,
                eye_style="bar", eye_spares=3),

    "pig": Quad("pig_skin", body=(10, 8, 16), body_y=10, head=(8, 8, 8),
                head_y=10, head_z=-8,
                fore_leg=(4, 6, 4), hind_leg=(4, 6, 4),
                fore_at=(3, 5), hind_at=(3, 5),
                muzzle=(4, 3, 1.5, "pig_skin", 4.0),
                ears=(2, 2, 1, "pig_skin", 4.2, 0.5, -5), ear_roll=34.0,
                tail=(1, 3, 1, "pig_skin", -0.8),
                eye_style="bar", eye_spares=2),

    # Deep-chested, short-legged, heavy fleece, long narrow face.
    "sheep": Quad("sheep_face", body=(8, 8, 16), body_y=5, head=(6, 6, 8),
                  head_y=6, head_z=-8,
                  fore_leg=(4, 11, 4), hind_leg=(4, 11, 4),
                  fore_at=(3, 5), hind_at=(3, 5),
                  muzzle=(4, 3, 2, "sheep_face", 3.2),
                  ears=(3, 2, 1, "sheep_face", 3.2, 1.0, -4), ear_roll=52.0,
                  tail=(2, 4, 2, "wool", -0.3),
                  fleece=1.75,
                  eye_style="bar", eye_spares=3),

    # Not a cow: narrower, longer face, horns swept back, and a beard.
    "goat": Quad("goat_fur", body=(9, 9, 15), body_y=5, head=(5, 6, 9),
                 head_y=3, head_z=-8,
                 neck=(4, 5, 5, -18.0, 1.0, -6.0),
                 fore_leg=(3, 13, 3), hind_leg=(4, 12, 4),
                 fore_at=(3, 5), hind_at=(3.4, 5),
                 horns=True, horn_sweep=-96.0,
                 muzzle=(3.5, 3, 2, "goat_fur", 3.2),
                 beard=(2, 4, 1.5, "goat_fur"),
                 ears=(3.5, 1.5, 1, "goat_fur", 2.6, 1.2, -3), ear_roll=72.0,
                 tail=(1.5, 3, 1.5, "goat_fur", -1.4),
                 eye_style="bar", eye_spares=3),

    # Big head, low slung body, short legs, enormous brush of a tail.
    "fox": Quad("fox_fur", body=(6, 5, 12), body_y=12, head=(8, 6, 6),
                head_y=10, head_z=-6, head_pitch=6.0,
                fore_leg=(2, 7, 2), hind_leg=(2, 7, 2),
                fore_at=(2.4, 4), hind_at=(2.4, 4),
                haunch=(4, 5, 6),
                muzzle=(3, 2.5, 4, "fox_snout", 3.0),
                ears=(2.5, 4, 1, "fox_fur", 3.2, -1.4, -2.0), ear_roll=-10.0,
                tail=(5, 11, 5, "fox_fur", -0.10), tail_links=2,
                eye_style="slit", eye_spares=2),

    # Deep chest, shoulder ruff, blunt muzzle, tail carried out behind.
    "wolf": Quad("wolf_fur", body=(6, 7, 11), body_y=8, head=(6, 6, 5),
                 head_y=6, head_z=-6,
                 fore_leg=(2.5, 9, 2.5), hind_leg=(2.5, 9, 2.5),
                 fore_at=(2.6, 4), hind_at=(2.6, 4),
                 haunch=(4, 5, 5),
                 ruff=(9, 7, 8, "wolf_fur", -0.6, -2.0),
                 muzzle=(3, 3, 4, "wolf_fur", 3.0),
                 ears=(2, 3, 1, "wolf_fur", 2.5, -0.5, -1.5), ear_roll=-8.0,
                 tail=(2.5, 9, 2.5, "wolf_fur", -0.9), tail_links=2,
                 eye_style="slit", eye_spares=2),

    # Slim, long-backed, front legs longer than the hind, whip tail.
    "cat": Quad("cat_fur", body=(5, 5, 11), body_y=12, head=(5, 4.5, 5),
                head_y=10, head_z=-5,
                fore_leg=(2, 10, 2), hind_leg=(2, 9, 2),
                fore_at=(1.8, 4), hind_at=(2.2, 4),
                haunch=(3.5, 4.5, 5),
                muzzle=(3, 2, 1.5, "cat_fur", 2.4),
                ears=(2, 2.5, 1, "cat_fur", 1.8, -0.5, -1.5), ear_roll=-6.0,
                tail=(1.2, 10, 1.2, "cat_fur", -1.1), tail_links=3,
                eye_style="slit", eye_spares=3),

    # Long neck carrying a small head, long legs, deep body.
    "horse": Quad("horse_hide", body=(10, 11, 22), body_y=3, head=(5, 6, 10),
                  head_y=3, head_z=-11, head_pitch=14.0,
                  neck=(5, 12, 7, -38.0, 1.0, -8.0),
                  fore_leg=(4, 17, 4), hind_leg=(4.5, 17, 4.5),
                  fore_at=(4, 8), hind_at=(4, 8),
                  muzzle=(4, 4, 3, "horse_hide", 2.6),
                  ears=(1.5, 3, 1, "horse_hide", 2.0, -1.5, -3.0), ear_roll=-14.0,
                  tail=(3, 13, 3, "horse_hide", -0.4), tail_links=2,
                  eye_style="bar", eye_spares=2),

    # The neck is the animal. Small head, very long muzzle, banana ears.
    "llama": Quad("llama_fur", body=(9, 12, 16), body_y=3, head=(4, 5, 9),
                  head_y=0, head_z=-4, head_pitch=8.0,
                  neck=(4.5, 15, 5, -12.0, 1.0, -6.0),
                  fore_leg=(3.5, 15, 3.5), hind_leg=(3.5, 15, 3.5),
                  fore_at=(3.2, 6), hind_at=(3.2, 6),
                  muzzle=(3, 2.5, 2, "llama_fur", 2.6),
                  ears=(1.5, 4, 1, "llama_fur", 1.6, -1.5, -2.0), ear_roll=-9.0,
                  tail=(2, 4, 2, "llama_fur", -0.6),
                  eye_style="bar", eye_spares=2),
}


def rabbit_host() -> list[Part]:
    """A hare, crouched, which is the only pose a hare is ever in.

    Built as its own thing rather than a shrunken cow. The mass sits over
    enormous hind haunches, the hind feet are long and flat on the ground, the
    forelegs are thin props holding the chest up, and the ears are half the
    height of the animal. Standing it on four matching posts, which is what
    the shared quadruped produced, threw away every one of those.
    """
    parts = [
        Part("body", "root", (0.0, 13.0, 1.0), (-14 * D, 0, 0),
             [_b((-3, 0, -5), (6, 6, 10), "rabbit_fur")]),
        Part("head", "body", (0.0, -3.0, -5.0), (10 * D, 0, 0),
             [_b((-2.5, 0, -4), (5, 4.5, 5), "rabbit_fur")]),
        Part("nose", "head", (0.0, 2.4, -4.0), (0, 0, 0),
             [_b((-1, 0, -1), (2, 1.5, 1), "rabbit_nose")]),
        Part("ear_r", "head", (-1.7, -0.4, -1.2), (-6 * D, -8 * D, -13 * D),
             [_b((-1, -6, -0.5), (2, 6.5, 1), "rabbit_fur")]),
    ]
    parts.extend(mirror(parts[-1:], "ear_r", "ear_l"))
    parts.append(Part("tail", "body", (0.0, 1.0, 5.0), (-0.5, 0, 0),
                      [_b((-1.5, 0, 0), (3, 3, 2), "rabbit_fur")]))
    parts.extend(infected_face("head", 5, 4.5, 5, eye=3.4, teeth=4,
                               style="round", spares=3))
    # Forelegs: thin, near-vertical props.
    for tag, sx in (("fr", -1), ("fl", 1)):
        parts += [
            Part(f"leg_{tag}", "root", (sx * 2.0, 17.0, -3.5), (0, 0, 0),
                 [_b((-1, 0, -1), (2, 4, 2), "rabbit_fur")]),
            Part(f"leg_{tag}_1", f"leg_{tag}", (0.0, 4.0, 0.0), (0, 0, 0),
                 [_b((-0.9, 0, -0.9), (1.8, 3, 1.8), "rabbit_fur")]),
            Part(f"foot_{tag}", f"leg_{tag}_1", (0.0, 3.0, 0.0), (0, 0, 0),
                 [_b((-1, 0, -1.6), (2, 1.5, 2.6), "rabbit_fur")]),
        ]
    # Hind: a big haunch, a short shank, and a long flat foot.
    for tag, sx in (("br", -1), ("bl", 1)):
        parts += [
            Part(f"haunch_{tag}", "body", (sx * 2.6, 1.0, 3.0), (0, 0, 0),
                 [_b((-1.5, 0, -3), (3, 5, 6), "rabbit_fur")]),
            Part(f"leg_{tag}", "root", (sx * 2.6, 17.5, 3.5), (0, 0, 0),
                 [_b((-1.2, 0, -1.2), (2.4, 3.5, 2.4), "rabbit_fur")]),
            Part(f"leg_{tag}_1", f"leg_{tag}", (0.0, 3.5, 0.0), (32 * D, 0, 0),
                 [_b((-1.1, 0, -1.1), (2.2, 2.5, 2.2), "rabbit_fur")]),
            Part(f"foot_{tag}", f"leg_{tag}_1", (0.0, 2.5, 0.0), (-32 * D, 0, 0),
                 [_b((-1.2, 0, -5.2), (2.4, 1.2, 7), "rabbit_fur")]),
        ]
    return parts


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
    """A hen: upright, tail-heavy, and mostly beak and comb from the front.

    The old version was a box with two pegs. What actually makes a chicken
    recognisable is the vertical stack - feet, thin scaled legs, a body tipped
    back with the tail up, and a small head carried high and forward on a
    neck - plus three separate red bits on the face that do not exist on any
    other animal here: comb on top, wattle underneath, beak between them.
    """
    parts = [
        # Body tipped back so the tail rides high, the way a hen stands.
        Part("body", "root", (0.0, 10.5, 0.0), (6 * D, 0, 0),
             [_b((-3, 0, -4), (6, 7, 9), "feather")]),
        Part("tailfan", "body", (0.0, 0.5, 5.0), (-42 * D, 0, 0),
             [_b((-2.5, 0, 0), (5, 6, 1.5), "feather")]),
        Part("neck", "body", (0.0, 1.0, -3.5), (7 * D, 0, 0),
             [_b((-1.5, -5, -1.5), (3, 5, 3), "feather")]),
        Part("head", "neck", (0.0, -5.0, 0.0), (0, 0, 0),
             [_b((-2, 0, -3), (4, 5, 3), "feather")]),
        Part("beak", "head", (0.0, 2.2, -3.0), (0, 0, 0),
             [_b((-1.5, 0, -2.5), (3, 2, 2.5), "beak")]),
        # Comb along the crown, wattle hanging under the beak. Both red, both
        # jagged, and together they are the whole silhouette of the head.
        Part("comb", "head", (0.0, 0.0, -1.0), (0, 0, 0),
             [_b((-0.6, -2.5, -2.0), (1.2, 2.5, 4.5), "comb_red")]),
        Part("wattle", "head", (0.0, 4.0, -2.6), (0, 0, 0),
             [_b((-1.1, 0, -1.2), (2.2, 3, 1.2), "comb_red")]),
        Part("wing_r", "body", (-3.0, 1.0, -2.0), (0, 0, 0),
             [_b((-1, 0, 0), (1, 5, 7), "feather")]),
    ]
    parts.extend(mirror(parts[-1:], "wing_r", "wing_l"))
    parts.extend(infected_face("head", 4, 5, 3, eye=3.0, teeth=4,
                               jaw_mat="beak", style="round", spares=2))
    # Scaled legs with a real hock, and splayed three-toed feet.
    for tag, sx in (("r", -1), ("l", 1)):
        parts += [
            Part(f"leg_{tag}", "root", (sx * 2.0, 16.5, 0.5), (0, 0, 0),
                 [_b((-1.3, 0, -1.3), (2.6, 4, 2.6), "beak")]),
            Part(f"leg_{tag}_1", f"leg_{tag}", (0.0, 4.0, 0.0), (0, 0, 0),
                 [_b((-1.05, 0, -1.05), (2.1, 2.5, 2.1), "beak")]),
            Part(f"foot_{tag}", f"leg_{tag}_1", (0.0, 2.5, 0.0), (0, 0, 0),
                 [_b((-1.6, 0, -2.6), (3.2, 1, 4), "beak")]),
        ]
    return parts


def human_face(anchor: str, *, hw: float = 8.0, hh: float = 8.0,
               hd: float = 8.0, skin: str = "skin", eye: str = "eye_human",
               name: str = "face", hollow: float = 0.0) -> list[Part]:
    """An actual face, in geometry, on a person.

    The people in this mod had eight-by-eight cubes for heads and nothing on
    them - no eyes, no mouth, no nose. A flat cube reads as a mannequin no
    matter what the texture does, and these are supposed to be the last people
    alive. So: a brow with a real overhang, eyeballs that stand out of their
    sockets, a nose bridge, cheekbones, and a jaw that hangs slightly open.

    `hollow` sinks the eyes and sharpens the cheeks - the difference between a
    survivor and someone who has been awake for six days.
    """
    p = name
    front = -hd / 2
    ex = hw * 0.21
    ey = -hh * 0.10
    parts = [
        # Brow ridge, overhanging - this is what casts the eyes into shadow.
        Part(f"{p}_brow", anchor, (0.0, ey - hh * 0.17, front),
             (0, 0, 0),
             [_b((-hw * 0.44, -hh * 0.10, -0.9 - hollow * 0.5),
                 (hw * 0.88, hh * 0.16, 1.0 + hollow * 0.5), skin)]),
        Part(f"{p}_nose", anchor, (0.0, ey + hh * 0.10, front), (0, 0, 0),
             [_b((-hw * 0.10, -hh * 0.14, -1.3), (hw * 0.20, hh * 0.32, 1.4), skin)]),
        Part(f"{p}_jaw", anchor, (0.0, hh * 0.30, front + hd * 0.10),
             (7 * D, 0, 0),
             [_b((-hw * 0.34, 0, -hd * 0.34), (hw * 0.68, hh * 0.22, hd * 0.36),
                 skin)]),
        Part(f"{p}_mouth", f"{p}_jaw", (0.0, 0.0, -hd * 0.32), (0, 0, 0),
             [_b((-hw * 0.22, -hh * 0.06, -0.5), (hw * 0.44, hh * 0.09, 0.6),
                 "tongue")]),
    ]
    for side, tag in ((-1, "r"), (1, "l")):
        # Socket sunk into the skull, eyeball standing proud of it.
        parts.append(Part(f"{p}_socket_{tag}", anchor,
                          (side * ex, ey, front + 0.2), (0, 0, 0),
                          [_b((-hw * 0.15, -hh * 0.12, -0.4),
                              (hw * 0.30, hh * 0.24, 0.6), "rot")]))
        parts.append(Part(f"{p}_eye_{tag}", f"{p}_socket_{tag}",
                          (0.0, 0.0, -0.4), (0, side * -9 * D, 0),
                          [_b((-hw * 0.12, -hh * 0.09, -0.9),
                              (hw * 0.24, hh * 0.18, 1.0), eye)]))
        parts.append(Part(f"{p}_cheek_{tag}", anchor,
                          (side * hw * 0.30, ey + hh * 0.20, front + 0.4),
                          (0, 0, side * 12 * D),
                          [_b((-hw * 0.11, -hh * 0.09, -0.7),
                              (hw * 0.22, hh * 0.20, 0.8), skin)]))
    return parts


def humanoid(skin: str, cloth: str, *, tall: float = 0.0, build: float = 1.0,
             face: bool = True, hollow: float = 0.0, hair: str | None = None,
             pack: bool = False, eye: str = "eye_human") -> list[Part]:
    """A person, at a height a person actually is.

    Vanilla humanoids are 32 units and read stubby next to everything else in
    this mod; these are 36 with longer legs and a neck, which is most of the
    difference. `build` widens the frame, `hollow` starves the face, `pack`
    straps salvage to their back, and they all get a face with eyes in it.
    """
    w = 8.0 * build
    leg_h = 14.0 + tall
    body_h = 13.0
    hip = GROUND - leg_h
    parts = [
        Part("body", "root", (0.0, hip, 0.0), (0, 0, 0),
             [_b((-w / 2, -body_h, -2.2), (w, body_h, 4.4), cloth)]),
        # Shoulders as their own mass, so the frame is not a plank.
        Part("shoulders", "body", (0.0, -body_h + 1.0, 0.0), (0, 0, 0),
             [_b((-w / 2 - 0.8, -2.6, -2.6), (w + 1.6, 3.4, 5.2), cloth)]),
        Part("neck", "shoulders", (0.0, -2.0, 0.0), (0, 0, 0),
             [_b((-1.9, -2.6, -1.9), (3.8, 3.0, 3.8), skin)]),
        Part("head", "neck", (0.0, -2.6, 0.0), (0, 0, 0),
             [_b((-4, -8, -4), (8, 8, 8), skin)]),
    ]
    if hair:
        parts.append(Part("hair", "head", (0.0, -8.0, 0.0), (0, 0, 0),
                          [_b((-4.3, 0, -4.3), (8.6, 4.0, 8.6), hair)]))
    if face:
        parts += human_face("head", hw=8, hh=8, hd=8, skin=skin, eye=eye,
                            hollow=hollow)
        # The face parts hang off the head's own origin, which sits 8 up.
        for part in parts:
            if part.parent == "head" and part.name.startswith("face_"):
                px, py, pz = part.pivot
                part.pivot = (px, py - 4.0, pz)
    for side, tag in ((-1, "r"), (1, "l")):
        parts.append(Part(f"arm_{tag}", "shoulders", (side * (w / 2 + 1.6), -0.4, 0.0),
                          (0, 0, side * -4 * D),
                          [_b((-2.0, -1.4, -2.0), (4, 8.0, 4), cloth)]))
        parts.append(Part(f"arm_{tag}_1", f"arm_{tag}", (0.0, 6.6, 0.0), (0, 0, 0),
                          [_b((-1.8, 0, -1.8), (3.6, 7.0, 3.6), cloth)]))
        parts.append(Part(f"hand_{tag}", f"arm_{tag}_1", (0.0, 7.0, 0.0), (0, 0, 0),
                          [_b((-1.9, 0, -1.9), (3.8, 3.0, 3.8), skin)]))
        parts.append(Part(f"leg_{tag}", "root", (side * 2.2, hip, 0.0), (0, 0, 0),
                          [_b((-2.1, 0, -2.1), (4.2, leg_h * 0.52, 4.2), cloth)]))
        parts.append(Part(f"leg_{tag}_1", f"leg_{tag}", (0.0, leg_h * 0.52, 0.0),
                          (0, 0, 0),
                          [_b((-1.9, 0, -1.9), (3.8, leg_h * 0.34, 3.8), cloth)]))
        parts.append(Part(f"foot_{tag}", f"leg_{tag}_1", (0.0, leg_h * 0.34, 0.0),
                          (0, 0, 0),
                          [_b((-2.1, 0, -3.2), (4.2, leg_h * 0.14, 5.4), "bark")]))
    if pack:
        parts.append(Part("pack", "body", (0.0, -body_h * 0.62, 2.4), (0, 0, 0),
                          [_b((-3.4, -4.0, 0), (6.8, 8.0, 3.4), "bark"),
                           _b((-3.8, -1.0, 0.2), (7.6, 1.6, 3.6), "sinew")]))
        parts.append(Part("bedroll", "pack", (0.0, -4.6, 1.6), (0, 90 * D, 0),
                          [_b((-1.6, -1.6, -4.0), (3.2, 3.2, 8.0), "wool")]))
    return parts


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


def flayed(anchor: str, *, at: tuple, length: float, height: float,
           ribs: int = 5, tier: int = 1, side: int = -1, name: str = "flay",
           viscera: bool = True, spine: bool = False) -> list[Part]:
    """Hide torn off and peeled back, exposing the ribcage and what it held.

    `split_open` makes a wound. This makes an *absence*: a whole panel of hide
    and muscle stripped away down the flank, the skin left hanging in a ragged
    curtain at the edge of it, and the bare ribs standing in the gap with the
    gut sagging out between them.

    Built rib by rib rather than as one striped box, because a ribcage reads as
    a ribcage only when you can see daylight between the bones. Each rib is
    curved by rolling it further as it goes down the body, and the lower ones
    are shorter and further apart - the pattern the eye expects from an animal
    that has been opened up.
    """
    p = f"mut{tier}_{name}"
    x, y, z = at
    parts = [
        # The cavity itself: dark, set into the body, so ribs stand proud.
        Part(p, anchor, (x, y, z), (0, 0, 0),
             [_b((0 if side < 0 else -0.9, -height / 2, -length / 2),
                 (0.9, height, length), "rot")]),
    ]
    # Ribs, curving as they descend.
    for i in range(ribs):
        f = i / max(1, ribs - 1)
        rib_h = height * (0.92 - 0.34 * f)
        roll = (14 + 30 * f) * side
        parts.append(Part(f"{p}_rib{i}", p,
                          (side * 0.35, -height * 0.42,
                           -length / 2 + length * (0.10 + 0.80 * f)),
                          (0, 0, roll * D),
                          [_b((-0.55 if side < 0 else -0.35, 0, -0.6),
                              (0.9, rib_h, 1.2), "tooth")]))
    # Gut sagging out between the lower ribs.
    if viscera:
        parts.append(Part(f"{p}_gut", p, (side * 0.9, height * 0.06, 0.0),
                          (0, 0, 0),
                          [_b((-1.1 if side < 0 else -0.5, 0, -length * 0.26),
                              (1.6, height * 0.40, length * 0.52), "flesh")]))
        parts.append(Part(f"{p}_gut2", f"{p}_gut", (0.0, height * 0.34, 0.0),
                          (0, 0, -18 * side * D),
                          [_b((-0.8 if side < 0 else -0.4, 0, -length * 0.16),
                              (1.2, height * 0.30, length * 0.32), "sinew")]))
    # The hide itself, still attached along the bottom edge of the wound and
    # hanging off it. It drapes downward (+y is down here) and peels outward,
    # rather than jutting off the front like a paddle.
    parts.append(Part(f"{p}_pelt", p, (side * 0.5, height * 0.44, length * 0.12),
                      (0, 0, (34 * side) * D),
                      [_b((-1.1 if side < 0 else -0.1, 0, -length * 0.30),
                          (1.2, height * 0.72, length * 0.60), "hide_torn")]))
    parts.append(Part(f"{p}_pelt2", f"{p}_pelt", (0.0, height * 0.70, 0.0),
                      (0, 0, (20 * side) * D),
                      [_b((-0.9 if side < 0 else -0.1, 0, -length * 0.20),
                          (1.0, height * 0.42, length * 0.40), "hide_torn")]))
    # Vertebrae showing where the panel runs up onto the back.
    if spine:
        for i in range(max(2, ribs - 1)):
            f = i / max(1, ribs - 2)
            parts.append(Part(f"{p}_vert{i}", p,
                              (side * 0.2, -height * 0.52,
                               -length / 2 + length * (0.18 + 0.66 * f)),
                              (0, 0, 0),
                              [_b((-0.7, -1.1, -0.7), (1.4, 1.4, 1.4), "tooth")]))
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
