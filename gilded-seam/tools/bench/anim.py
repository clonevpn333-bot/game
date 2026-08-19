"""Locomotion and combat animation, solved rather than hand-keyed.

The animations this replaces were rotation curves: every leg swung like a
pendulum about its shoulder, which is the single most recognisable tell of a
cheap modded mob. Real legs do not do that. A real leg *lifts* - the foot
leaves the ground, folds toward the body, swings through, and is set back down
in front - and the body drops onto each footfall instead of gliding.

So this module does not write keyframes directly. It builds the motion the way
an animator would think about it, and bakes the result:

  1. A **gait** is a set of foot phases. Which foot leaves the ground when is
     the difference between a walk, a trot, a pace and a bound, and it is the
     first thing you read about an animal from a distance.
  2. Each foot gets a **trajectory in space**, not an angle. During stance it
     is pinned to the ground and travels backwards under the body at exactly
     the speed the body travels forward, so it does not skate. During swing it
     lifts on an arc, with the peak past the middle so the leg snaps forward
     and sets down softly.
  3. The joint angles come from **inverse kinematics** - given where the hip is
     and where the foot must be, solve the triangle. Knees and hocks are given
     opposing bend directions because that is how a quadruped is actually put
     together.
  4. The body **bobs, rolls, pitches and yaws** off the same phase clock, and
     the head and neck lag it, because a head that moves in lockstep with the
     shoulders reads as a puppet.

Everything is then sampled and written out as ordinary GeckoLib keyframes, so
the game needs no runtime support for any of it.
"""

from __future__ import annotations

import math

DEG = 180.0 / math.pi

# ---------------------------------------------------------------------------
# Gait patterns: the phase, in cycles, at which each foot leaves the ground.
# ---------------------------------------------------------------------------
# Quadruped foot order is always (front-right, front-left, back-right, back-left).
GAITS = {
    # Lateral-sequence walk. The classic four-beat: no two feet lift together,
    # which is what makes a walk look careful and heavy.
    "walk":  {"phases": (0.0, 0.5, 0.75, 0.25), "duty": 0.68},
    # Diagonal pairs, two beats, suspension between. Dogs, wolves, cats.
    "trot":  {"phases": (0.0, 0.5, 0.5, 0.0), "duty": 0.48},
    # Lateral pairs. Camels and llamas do this, and it rolls the body sideways.
    "pace":  {"phases": (0.0, 0.5, 0.0, 0.5), "duty": 0.50},
    # Front pair, then back pair. Hares and anything that hops.
    "bound": {"phases": (0.0, 0.06, 0.42, 0.48), "duty": 0.36},
    # Transverse gallop. Duty below 0.5 means there are moments with nothing
    # on the ground at all - the suspension phase is what makes a run a run
    # rather than a walk played fast.
    "gallop": {"phases": (0.0, 0.13, 0.52, 0.66), "duty": 0.31},
    # Two legs.
    "biped": {"phases": (0.0, 0.5), "duty": 0.62},
    # Two legs, airborne. A sprint, and for the big ones a stagger.
    "sprint": {"phases": (0.0, 0.5), "duty": 0.38},
}


def _smooth(t: float) -> float:
    return t * t * (3.0 - 2.0 * t)


def _foot_path(phase: float, *, stride: float, lift: float, duty: float,
               push: float = 0.0):
    """Where a foot is, relative to its neutral spot, at a point in the cycle.

    Returns (z, y): z forward-positive along the direction of travel, y up.
    Stance is a straight backwards slide - the foot is on the ground and the
    animal moves over it. Swing is an arc, weighted so the foot is highest
    just after it leaves and reaches forward before it lands.
    """
    p = phase % 1.0
    if p < duty:                                    # planted
        t = p / duty
        return stride * (0.5 - t), -push * math.sin(math.pi * t)
    t = (p - duty) / (1.0 - duty)                   # in the air
    # Ease out of the ground fast, ease into the landing slow.
    z = stride * (-0.5 + _smooth(t))
    y = lift * math.sin(math.pi * min(1.0, t * 1.12)) ** 0.72
    return z, y


def _ik2(hip_y: float, target_z: float, target_y: float,
         upper: float, lower: float, flip: float):
    """Two-bone IK in the sagittal plane, by the law of cosines.

    Angles come back as (thigh, shank) rotations about x, in radians, with the
    convention the geometry uses: positive swings the limb forward. `flip`
    is +1 for a knee that folds backwards and -1 for one that folds forwards,
    which is the whole difference between a foreleg and a hind leg.
    """
    dz, dy = target_z, hip_y - target_y
    dist = math.hypot(dz, dy)
    reach = upper + lower
    dist = max(1e-4, min(dist, reach * 0.999))      # never lock straight
    # Angle from vertical to the hip->foot line.
    base = math.atan2(dz, max(1e-4, dy))
    cos_knee = (upper * upper + lower * lower - dist * dist) / (2 * upper * lower)
    knee = math.acos(max(-1.0, min(1.0, cos_knee)))
    cos_hip = (upper * upper + dist * dist - lower * lower) / (2 * upper * dist)
    hip = math.acos(max(-1.0, min(1.0, cos_hip)))
    thigh = base + flip * hip
    shank = flip * -(math.pi - knee)
    return thigh, shank


class Limb:
    """One leg, measured off the model rather than guessed at."""

    def __init__(self, root: str, segments: list[str], foot: str | None,
                 lengths: list[float], hip_y: float, flip: float):
        self.root = root
        self.segments = segments
        self.foot = foot
        self.lengths = lengths
        self.hip_y = hip_y
        self.flip = flip

    @property
    def reach(self) -> float:
        return sum(self.lengths)


def measure_limbs(model, roots: list[str], hind: set[str] | None = None):
    """Reads limb chains out of a compiled bench model.

    Walks down from each named root through its single-child descendants,
    recording how long each segment is from the distance between pivots. That
    is why the animations are per-species without anyone tuning them: a hare's
    shank really is short, and the solver is told so by the model.
    """
    pm = model.part_map()
    children: dict[str, list[str]] = {}
    for part in model.parts:
        children.setdefault(part.parent, []).append(part.name)

    hind = hind or set()
    limbs = []
    for root in roots:
        if root not in pm:
            continue
        chain = [root]
        node = root
        while True:
            kids = [c for c in children.get(node, [])
                    if "__r" not in c and (c.startswith("leg_") or c.startswith("foot_")
                                           or c.startswith("hand") or c.startswith("arm"))]
            if not kids:
                break
            node = sorted(kids, key=len)[0]
            chain.append(node)
        lengths = []
        for i in range(1, len(chain)):
            piv = pm[chain[i]].pivot
            lengths.append(max(0.5, abs(piv[1])))
        if not lengths:
            # Single-box limb: fall back to the box height so it still moves.
            box = pm[root].boxes[0] if pm[root].boxes else None
            lengths = [box.size[1] if box else 8.0]
        hip_y = pm[root].pivot[1]
        foot = chain[-1] if chain[-1].startswith("foot") else None
        segs = [c for c in chain if c != foot]
        limbs.append(Limb(root, segs, foot, lengths, hip_y,
                          -1.0 if root in hind else 1.0))
    return limbs


# ---------------------------------------------------------------------------
# The gait itself
# ---------------------------------------------------------------------------


def locomotion(limbs: list[Limb], *, period: float, gait: str = "walk",
               stride: float | None = None, lift: float | None = None,
               body: str | None = None, spine: list[str] | None = None,
               head: str | None = None, jaw: str | None = None,
               tail: list[str] | None = None, bob: float | None = None,
               samples: int = 24, sway: float = 1.0, limp: float = 0.0,
               flex: float = 0.0, wrong: float = 0.0, airborne: float = 0.0) -> dict:
    """Bakes a full locomotion cycle.

    `limp` drags one diagonal, which is what stops thirteen species that all
    walk correctly from all walking *identically* - these are sick animals and
    they should not move like show ponies.

    Three parameters separate a run from a walk played fast, which is what a
    sped-up walk cycle always looks like:

    `flex` gathers and extends the spine once per stride. A galloping animal
    folds in the middle and throws itself open again, and that single curve
    carries more of the read than the legs do.

    `airborne` lifts the whole body during the suspension phase - the moment
    with no feet down at all - so the creature actually leaves the ground.

    `wrong` is the haunting. It over-extends one side past where the joint
    should stop, lets the head loll off the direction of travel, and hangs the
    jaw slack. The animal is not running well. It is running *at you*, on a
    body that no longer entirely belongs to it.
    """
    pattern = GAITS[gait]
    phases, duty = pattern["phases"], pattern["duty"]
    reach = max(limb.reach for limb in limbs)
    stride = stride if stride is not None else reach * 0.62
    lift = lift if lift is not None else reach * 0.26
    bob = bob if bob is not None else reach * 0.055

    tracks: dict[str, dict[str, dict]] = {}

    def put(bone, channel, t, vec, easing="easeInOutSine"):
        chan = tracks.setdefault(bone, {}).setdefault(channel, {})
        chan[str(round(t, 4))] = {"vector": [round(v, 3) for v in vec],
                                  "easing": easing}

    for i in range(samples + 1):
        u = i / samples
        t = round(u * period, 4)

        # --- body: drop onto each footfall, roll into the stride ------------
        beats = 2 if gait in ("walk", "trot", "pace") else 1
        drop = -bob * (0.5 - 0.5 * math.cos(2 * math.pi * beats * u))
        # Suspension: everything is off the ground at once, so lift the body
        # instead of only bouncing it.
        drop -= airborne * reach * 0.16 * max(0.0, math.sin(2 * math.pi * u - 0.4)) ** 2
        surge = bob * 0.35 * math.sin(2 * math.pi * u)
        roll = sway * 3.2 * math.sin(2 * math.pi * u)
        pitch = sway * 2.1 * math.sin(2 * math.pi * beats * u + 0.9)
        # Gather and extend: the body folds shut and throws itself open once
        # per stride. This is the curve that reads as speed.
        pitch += flex * 13.0 * math.sin(2 * math.pi * u - 0.55)
        yaw = sway * 1.6 * math.sin(2 * math.pi * u + 1.9)
        yaw += wrong * 5.0 * math.sin(2 * math.pi * u * 0.5 + 1.1)

        if body:
            put(body, "position", t, [wrong * 0.7 * math.sin(2 * math.pi * u * 0.5),
                                      drop, surge])
            put(body, "rotation", t, [pitch, yaw, roll + wrong * 6.0
                                      * math.sin(2 * math.pi * u * 0.5 + 2.4)])

        # The spine passes the body's roll along with a delay, so the animal
        # bends through its length instead of turning as one rigid block.
        for k, bone in enumerate(spine or []):
            lag = 0.10 * (k + 1)
            put(bone, "rotation", t,
                [sway * 1.4 * math.sin(2 * math.pi * (u - lag) + 0.6),
                 sway * 2.4 * math.sin(2 * math.pi * (u - lag) + 1.9),
                 sway * 2.0 * math.sin(2 * math.pi * (u - lag))])

        # A head does not ride the shoulders: it holds itself steady and
        # catches up late. Counter most of the bob, lag the rest.
        if head:
            hl = 0.18
            # `wrong` stops the head stabilising and lets it loll instead.
            steady = 1.0 - 0.8 * wrong
            put(head, "rotation", t,
                [-pitch * 0.55 * steady + 2.6 * math.sin(2 * math.pi * (u - hl) + 1.2)
                 + wrong * 9.0 * math.sin(2 * math.pi * (u - 0.3) * 0.5),
                 -yaw * 0.4 * steady + 2.2 * math.sin(2 * math.pi * (u - hl))
                 + wrong * 14.0 * math.sin(2 * math.pi * u * 0.5 + 0.8),
                 -roll * 0.45 * steady + wrong * 11.0
                 * math.sin(2 * math.pi * u * 0.5 + 2.0)])
        if jaw:
            # Slack, not chewing: at speed it simply hangs open.
            put(jaw, "rotation", t,
                [11 + 7 * (0.5 - 0.5 * math.cos(2 * math.pi * beats * u))
                 + wrong * 26.0, 0, 0])

        # Tails and other dangling chains: each link copies the one above it
        # a little later and a little wider. Follow-through, for free.
        for k, bone in enumerate(tail or []):
            lag = 0.14 * (k + 1)
            amp = 3.0 + 2.2 * k
            put(bone, "rotation", t,
                [amp * 0.6 * math.sin(2 * math.pi * (u - lag) + 2.2),
                 amp * math.sin(2 * math.pi * (u - lag)),
                 amp * 0.5 * math.sin(2 * math.pi * (u - lag) + 1.0)])

        # --- legs: solve, don't swing --------------------------------------
        for k, limb in enumerate(limbs):
            phase = u + phases[k % len(phases)]
            drag = limp if (k % 3 == 0) else 0.0
            # One side reaches further than a joint should allow.
            over = 1.0 + (wrong * 0.30 if k % 2 else -wrong * 0.12)
            z, y = _foot_path(phase, stride=stride * (1.0 - drag) * over,
                              lift=lift * (1.0 - drag * 1.6) * over, duty=duty,
                              push=bob * 0.5)
            upper = limb.lengths[0]
            lower = sum(limb.lengths[1:]) or upper * 0.9
            # The hip itself rides the body, so the foot target moves with it.
            thigh, shank = _ik2(upper + lower, z, y - drop, upper, lower, limb.flip)
            put(limb.segments[0], "rotation", t, [thigh * DEG, 0, 0])
            if len(limb.segments) > 1:
                per = shank / max(1, len(limb.segments) - 1)
                for s, bone in enumerate(limb.segments[1:]):
                    put(bone, "rotation", t, [per * DEG, 0, 0])
            if limb.foot:
                # Ankle keeps the foot level with the ground through stance,
                # then points on the way through - heel strike, toe off.
                level = -(thigh + shank)
                airborne = max(0.0, y) / max(1e-3, lift)
                put(limb.foot, "rotation", t,
                    [(level * DEG) * 0.85 - 26.0 * airborne, 0, 0])

    return {"loop": True, "animation_length": round(period, 3),
            "bones": {b: c for b, c in tracks.items()}}


# ---------------------------------------------------------------------------
# Attacks
# ---------------------------------------------------------------------------


def strike(*, arms: list[list[str]], length: float = 0.9,
           head: str | None = None, jaw: str | None = None,
           body: str | None = None, legs: list[Limb] | None = None,
           stagger: float = 0.0, reach: float = 78.0,
           step: float = 0.0) -> dict:
    """Anticipation, contact, follow-through, settle.

    The contact frame is deliberately short and lands on a hard ease so the
    blow arrives rather than drifts in; everything else is slow. The body
    counter-moves *away* first - that anticipation is what gives a hit its
    weight - then drives through and overshoots before settling.

    `stagger` offsets each arm in time. Two arms that fire together read as a
    clap; two arms a tenth of a second apart read as a mauling.
    """
    tracks: dict[str, dict[str, dict]] = {}

    def put(bone, channel, t, vec, easing="easeInOutSine"):
        chan = tracks.setdefault(bone, {}).setdefault(channel, {})
        chan[str(round(max(0.0, t), 4))] = {"vector": [round(v, 3) for v in vec],
                                            "easing": easing}

    coil, hit, over = length * 0.40, length * 0.53, length * 0.72

    for a, chain in enumerate(arms):
        off = stagger * a
        for s, bone in enumerate(chain):
            # Down the arm each joint fires slightly later and travels less:
            # the shoulder starts it, the hand finishes it.
            delay = 0.035 * s
            scale = 1.0 - 0.22 * s
            put(bone, "rotation", 0.0, [0, 0, 0])
            put(bone, "rotation", coil + off + delay,
                [-reach * 0.42 * scale, 0, 6 * scale], "easeInQuart")
            put(bone, "rotation", hit + off + delay,
                [reach * scale, 0, -4 * scale], "easeOutQuart")
            put(bone, "rotation", over + off + delay,
                [-reach * 0.14 * scale, 0, 0])
            put(bone, "rotation", length, [0, 0, 0])

    if body:
        put(body, "rotation", 0.0, [0, 0, 0])
        put(body, "rotation", coil, [-9, 7, 0], "easeInQuart")
        put(body, "rotation", hit, [13, -6, 0], "easeOutQuart")
        put(body, "rotation", over, [-3, 2, 0])
        put(body, "rotation", length, [0, 0, 0])
        put(body, "position", 0.0, [0, 0, 0])
        put(body, "position", coil, [0, 0.6, -step * 0.4], "easeInQuart")
        put(body, "position", hit, [0, -1.4, step], "easeOutQuart")
        put(body, "position", length, [0, 0, 0])

    if head:
        put(head, "rotation", 0.0, [0, 0, 0])
        put(head, "rotation", coil, [-21, 0, 0], "easeInQuart")
        put(head, "rotation", hit, [24, 0, 0], "easeOutQuart")
        put(head, "rotation", length, [0, 0, 0])
    if jaw:
        put(jaw, "rotation", 0.0, [12, 0, 0])
        put(jaw, "rotation", coil, [52, 0, 0])
        put(jaw, "rotation", hit, [8, 0, 0], "easeOutQuart")
        put(jaw, "rotation", length, [12, 0, 0])

    # The legs brace: it steps into the blow and takes the recoil.
    for k, limb in enumerate(legs or []):
        side = 1 if k % 2 == 0 else -1
        put(limb.segments[0], "rotation", 0.0, [0, 0, 0])
        put(limb.segments[0], "rotation", coil, [10 * side, 0, 0], "easeInQuart")
        put(limb.segments[0], "rotation", hit, [-16 * side, 0, 0], "easeOutQuart")
        put(limb.segments[0], "rotation", length, [0, 0, 0])
        if limb.foot:
            put(limb.foot, "rotation", coil, [-8, 0, 0])
            put(limb.foot, "rotation", hit, [12, 0, 0], "easeOutQuart")
            put(limb.foot, "rotation", length, [0, 0, 0])

    return {"loop": False, "animation_length": round(length, 3), "bones": tracks}


def idle(*, body: str, period: float = 4.4, depth: float = 0.6,
         head: str | None = None, jaw: str | None = None,
         limbs: list[Limb] | None = None, tail: list[str] | None = None,
         samples: int = 16, unease: float = 1.0) -> dict:
    """Breathing, weight shifting, and a head that keeps looking around.

    Nothing here stands still. The weight shift is slower than the breath and
    not a whole number of breaths long, so the two never quite line up and the
    loop does not tick.
    """
    tracks: dict[str, dict[str, dict]] = {}

    def put(bone, channel, t, vec):
        chan = tracks.setdefault(bone, {}).setdefault(channel, {})
        chan[str(round(t, 4))] = {"vector": [round(v, 3) for v in vec],
                                  "easing": "easeInOutSine"}

    for i in range(samples + 1):
        u = i / samples
        t = round(u * period, 4)
        breath = -depth * (0.5 - 0.5 * math.cos(2 * math.pi * u))
        shift = unease * 1.5 * math.sin(2 * math.pi * u * 0.5)
        put(body, "position", t, [shift * 0.35, breath, 0])
        put(body, "rotation", t, [breath * 0.8, shift * 0.5, shift])
        if head:
            put(head, "rotation", t,
                [-breath * 0.6 + unease * 2.0 * math.sin(2 * math.pi * u * 1.5 + 0.7),
                 unease * 6.0 * math.sin(2 * math.pi * u * 0.5 + 2.1),
                 unease * 1.6 * math.sin(2 * math.pi * u * 0.75)])
        if jaw:
            put(jaw, "rotation", t,
                [13 + 6 * (0.5 - 0.5 * math.cos(2 * math.pi * u)), 0, 0])
        for k, limb in enumerate(limbs or []):
            side = 1 if k % 2 == 0 else -1
            put(limb.segments[0], "rotation", t, [shift * 0.9 * side, 0, 0])
        for k, bone in enumerate(tail or []):
            lag = 0.2 * (k + 1)
            put(bone, "rotation", t,
                [2.0 * math.sin(2 * math.pi * (u - lag) * 0.5),
                 (3.0 + 1.5 * k) * math.sin(2 * math.pi * (u - lag) * 0.5 + 1.0),
                 2.0 * math.sin(2 * math.pi * (u - lag))])

    return {"loop": True, "animation_length": round(period, 3), "bones": tracks}


# ---------------------------------------------------------------------------
# Things with no bones in them
# ---------------------------------------------------------------------------


def writhe(chains: list[list[str]], *, period: float = 6.0, samples: int = 20,
           amp: float = 14.0, tip: float = 2.4, lag: float = 0.17,
           body: str | None = None, head: str | None = None,
           jaw: str | None = None, swell: float = 1.0,
           drift: float = 0.0) -> dict:
    """Tentacles. Not arms - `strike` was making them punch.

    Feeding tendrils to the arm code was the whole problem: an arm has a
    shoulder, an elbow and an intent, so `strike` rotates every joint toward
    the same instant of contact. Eighteen of those firing a tenth of a second
    apart is not a monster, it is a drum solo, and that is exactly what it
    looked like.

    A tentacle has no joints and no intent. What travels down it is a *wave*,
    and three things make that read:

      * each link repeats the link above it a beat later (`lag`), so the shape
        moves outward along the limb rather than the whole limb swinging;
      * the amplitude grows toward the tip (`tip`), because the root is
        carrying the weight of everything past it and can barely move;
      * every chain gets its own phase, so no two are ever at the same point
        in the cycle and the mass never pulses.

    A second, much slower swell rides on top at an incommensurate rate, which
    is what stops a loop this long from reading as a loop.
    """
    tracks: dict[str, dict[str, dict]] = {}

    def put(bone, channel, t, vec):
        chan = tracks.setdefault(bone, {}).setdefault(channel, {})
        chan[str(round(t, 4))] = {"vector": [round(v, 3) for v in vec],
                                  "easing": "easeInOutSine"}

    for i in range(samples + 1):
        u = i / samples
        t = round(u * period, 4)
        for c, chain in enumerate(chains):
            # 2.399963 rad is the golden angle; spreading phases by it is the
            # cheapest way to guarantee nothing ever lines up.
            base = c * 2.399963
            n = max(1, len(chain) - 1)
            for s, bone in enumerate(chain):
                w = 2 * math.pi * (u - s * lag) + base
                grow = 1.0 + (tip - 1.0) * (s / n)
                a = amp * grow
                # The slow swell opens and closes the whole limb; it is a
                # half-cycle over the loop so it never repeats within it.
                breathe = swell * 6.0 * math.sin(math.pi * u + base) * (s / n)
                put(bone, "rotation", t,
                    [a * math.sin(w) + breathe + drift * grow,
                     a * 0.42 * math.sin(w * 0.5 + base * 1.3),
                     a * 0.66 * math.cos(w + 0.9)])

    if body:
        for i in range(samples + 1):
            u = i / samples
            t = round(u * period, 4)
            heave = -1.8 * (0.5 - 0.5 * math.cos(2 * math.pi * u))
            roll = 2.2 * math.sin(2 * math.pi * u * 0.5)
            put(body, "position", t, [roll * 0.6, heave, roll * 0.3])
            put(body, "rotation", t, [heave * 1.2, roll * 0.7, roll])
            if head:
                put(head, "rotation", t,
                    [-heave * 2.0 + 3.0 * math.sin(2 * math.pi * u * 1.5 + 0.7),
                     7.0 * math.sin(2 * math.pi * u * 0.5 + 2.1),
                     2.4 * math.sin(2 * math.pi * u * 0.75)])
            if jaw:
                put(jaw, "rotation", t,
                    [16 + 11 * (0.5 - 0.5 * math.cos(2 * math.pi * u * 0.5)), 0, 0])

    return {"loop": True, "animation_length": round(period, 3), "bones": tracks}


def lash(chains: list[list[str]], *, length: float = 1.9, reach: float = 70.0,
         groups: int = 3, body: str | None = None, head: str | None = None,
         jaw: str | None = None, step: float = 0.0,
         flare: bool = False) -> dict:
    """A whip, which is the opposite shape to a punch.

    A punch has every joint arriving together. A whip has the *base* leading
    and each link arriving later than the one before it - the energy runs out
    to the tip, which is why the tip is the part that breaks the sound barrier.
    So the per-link delay here is deliberately large and runs base-first, where
    `strike` uses a small delay for the opposite reason.

    Before that the limb curls the wrong way and holds - a coil, up and back
    over itself like a scorpion - and the hold is what tells you it is coming.

    `groups` splits the tendrils into waves so they do not all arrive at once;
    `flare` throws them outward and upward instead of forward, for a roar.
    """
    tracks: dict[str, dict[str, dict]] = {}

    def put(bone, channel, t, vec, easing="easeInOutSine"):
        chan = tracks.setdefault(bone, {}).setdefault(channel, {})
        chan[str(round(max(0.0, t), 4))] = {"vector": [round(v, 3) for v in vec],
                                            "easing": easing}

    coil, hold, throw = length * 0.26, length * 0.44, length * 0.62

    for c, chain in enumerate(chains):
        wave = (c % max(1, groups)) / max(1, groups)
        off = wave * length * 0.16
        spin = c * 2.399963
        n = max(1, len(chain) - 1)
        for s, bone in enumerate(chain):
            # Base first, tip last: this is the crack.
            delay = (length * 0.20) * (s / n)
            grow = 0.55 + 0.85 * (s / n)
            if flare:
                out_x, out_y, out_z = (-reach * 0.75 * grow,
                                       math.sin(spin) * 26 * grow,
                                       math.cos(spin) * 34 * grow)
            else:
                out_x, out_y, out_z = (reach * grow,
                                       math.sin(spin) * 12 * grow,
                                       math.cos(spin) * 10 * grow)
            put(bone, "rotation", 0.0, [0, 0, 0])
            put(bone, "rotation", coil + off + delay * 0.35,
                [-reach * 0.55 * grow, math.sin(spin) * 18 * grow,
                 math.cos(spin) * 22 * grow], "easeOutQuart")
            # The hold. Nothing moves; that is the point of it.
            put(bone, "rotation", hold + off + delay * 0.35,
                [-reach * 0.50 * grow, math.sin(spin) * 16 * grow,
                 math.cos(spin) * 20 * grow], "linear")
            put(bone, "rotation", throw + off + delay,
                [out_x, out_y, out_z], "easeOutQuart")
            put(bone, "rotation", length * 0.86 + off + delay,
                [out_x * -0.18, out_y * 0.3, out_z * 0.3])
            put(bone, "rotation", length, [0, 0, 0])

    if body:
        put(body, "rotation", 0.0, [0, 0, 0])
        put(body, "rotation", coil, [-11, 8, 3], "easeOutQuart")
        put(body, "rotation", hold, [-10, 8, 3], "linear")
        put(body, "rotation", throw, [16, -7, -2], "easeOutQuart")
        put(body, "rotation", length, [0, 0, 0])
        put(body, "position", 0.0, [0, 0, 0])
        put(body, "position", coil, [0, 1.4, -step * 0.5], "easeOutQuart")
        put(body, "position", hold, [0, 1.4, -step * 0.5], "linear")
        put(body, "position", throw, [0, -2.6, step], "easeOutQuart")
        put(body, "position", length, [0, 0, 0])
    if head:
        put(head, "rotation", 0.0, [0, 0, 0])
        put(head, "rotation", coil, [-26, 0, 0], "easeOutQuart")
        put(head, "rotation", hold, [-25, 0, 0], "linear")
        put(head, "rotation", throw, [30, 0, 0], "easeOutQuart")
        put(head, "rotation", length, [0, 0, 0])
    if jaw:
        put(jaw, "rotation", 0.0, [14, 0, 0])
        put(jaw, "rotation", coil, [66, 0, 0], "easeOutQuart")
        put(jaw, "rotation", hold, [70, 0, 0], "linear")
        put(jaw, "rotation", throw, [10, 0, 0], "easeOutQuart")
        put(jaw, "rotation", length, [14, 0, 0])

    return {"loop": False, "animation_length": round(length, 3), "bones": tracks}


# ---------------------------------------------------------------------------
# Dying, lying there, and getting back up
# ---------------------------------------------------------------------------


def collapse(*, body: str, head: str | None = None, jaw: str | None = None,
             limbs: list[Limb] | None = None, tail: list[str] | None = None,
             length: float = 1.5, style: str = "fold", height: float = 12.0) -> dict:
    """A death that ends with a body on the floor, not a despawn.

    Four ways to go down, because thirteen animals dropping identically is the
    thing that makes a kill feel like a counter ticking:

      fold      the legs give out first and it comes down on its chest
      topple    it stays rigid and falls sideways like furniture
      buckle    the head goes down, the hindquarters follow, a slow crumple
      burst     it comes apart upward, then what is left drops

    The last keyframe is the pose it will hold for the next minute, so it has
    to be a *settled* one - flat, still, and unmistakably down.
    """
    tracks: dict[str, dict[str, dict]] = {}

    def put(bone, channel, t, vec, easing="easeInOutSine"):
        tracks.setdefault(bone, {}).setdefault(channel, {})[str(round(t, 4))] = {
            "vector": [round(v, 3) for v in vec], "easing": easing}

    drop = -height * 0.62
    if style == "topple":
        put(body, "rotation", 0.0, [0, 0, 0])
        put(body, "rotation", length * 0.30, [0, 0, -14], "easeInQuart")
        put(body, "rotation", length * 0.72, [0, 0, -78], "easeInQuart")
        put(body, "rotation", length, [4, 0, -90])
        put(body, "position", 0.0, [0, 0, 0])
        put(body, "position", length, [0, drop, 0], "easeOutQuad")
    elif style == "burst":
        put(body, "position", 0.0, [0, 0, 0])
        put(body, "position", length * 0.22, [0, -height * 0.30, 0], "easeOutQuart")
        put(body, "position", length, [0, drop, 0], "easeInQuart")
        put(body, "rotation", length * 0.22, [-22, 0, 9])
        put(body, "rotation", length, [88, 0, 0])
    elif style == "buckle":
        put(body, "rotation", 0.0, [0, 0, 0])
        put(body, "rotation", length * 0.34, [26, 0, 4], "easeInQuart")
        put(body, "rotation", length * 0.70, [64, 0, -6])
        put(body, "rotation", length, [86, 0, -3])
        put(body, "position", 0.0, [0, 0, 0])
        put(body, "position", length, [0, drop, 0], "easeInQuart")
    else:                                     # fold
        put(body, "rotation", 0.0, [0, 0, 0])
        put(body, "rotation", length * 0.40, [16, 0, 0], "easeInQuart")
        put(body, "rotation", length, [84, 0, 6])
        put(body, "position", 0.0, [0, 0, 0])
        put(body, "position", length * 0.40, [0, -height * 0.12, 0])
        put(body, "position", length, [0, drop, 0], "easeInQuart")

    if head:
        put(head, "rotation", 0.0, [0, 0, 0])
        put(head, "rotation", length * 0.45, [-26, 12, 0], "easeInQuart")
        put(head, "rotation", length, [34, 26, 14])       # lolling, face down
    if jaw:
        put(jaw, "rotation", 0.0, [12, 0, 0])
        put(jaw, "rotation", length * 0.5, [48, 0, 0])
        put(jaw, "rotation", length, [40, 0, 0])          # stays hanging open
    for k, limb in enumerate(limbs or []):
        side = 1 if k % 2 == 0 else -1
        put(limb.segments[0], "rotation", 0.0, [0, 0, 0])
        put(limb.segments[0], "rotation", length * 0.35, [-30 * side, 0, 0], "easeInQuart")
        put(limb.segments[0], "rotation", length, [72 + 14 * side, 0, 12 * side])
        for seg in limb.segments[1:]:
            put(seg, "rotation", length * 0.35, [40, 0, 0])
            put(seg, "rotation", length, [-96, 0, 0])     # folded under it
        if limb.foot:
            put(limb.foot, "rotation", length, [26, 0, 0])
    for k, bone in enumerate(tail or []):
        put(bone, "rotation", length * 0.5, [10 + 8 * k, 12, 0])
        put(bone, "rotation", length, [4, 22 + 10 * k, 0])
    return {"loop": False, "animation_length": round(length, 3), "bones": tracks}


def rise(*, body: str, head: str | None = None, jaw: str | None = None,
         limbs: list[Limb] | None = None, length: float = 2.2,
         height: float = 12.0) -> dict:
    """Getting back up, badly.

    Deliberately not the collapse reversed. It hauls one side up first, hangs
    there, then snaps upright and overshoots - the read is *effort*, and then
    something that is angrier than it was when it went down.
    """
    tracks: dict[str, dict[str, dict]] = {}

    def put(bone, channel, t, vec, easing="easeInOutSine"):
        tracks.setdefault(bone, {}).setdefault(channel, {})[str(round(t, 4))] = {
            "vector": [round(v, 3) for v in vec], "easing": easing}

    drop = -height * 0.62
    put(body, "position", 0.0, [0, drop, 0])
    put(body, "position", length * 0.30, [0, drop * 0.86, 0])
    put(body, "position", length * 0.74, [0, drop * 0.16, 0], "easeOutQuart")
    put(body, "position", length * 0.86, [0, height * 0.06, 0])   # overshoot
    put(body, "position", length, [0, 0, 0])
    put(body, "rotation", 0.0, [84, 0, 6])
    put(body, "rotation", length * 0.30, [70, 14, 18])            # one side first
    put(body, "rotation", length * 0.74, [12, -6, -8], "easeOutQuart")
    put(body, "rotation", length * 0.86, [-14, 0, 0])
    put(body, "rotation", length, [0, 0, 0])
    if head:
        put(head, "rotation", 0.0, [34, 26, 14])
        put(head, "rotation", length * 0.55, [40, -18, -6])
        put(head, "rotation", length * 0.80, [-34, 0, 0], "easeOutQuart")   # snaps up
        put(head, "rotation", length, [0, 0, 0])
    if jaw:
        put(jaw, "rotation", 0.0, [40, 0, 0])
        put(jaw, "rotation", length * 0.78, [62, 0, 0], "easeOutQuart")     # roar
        put(jaw, "rotation", length, [14, 0, 0])
    for k, limb in enumerate(limbs or []):
        side = 1 if k % 2 == 0 else -1
        put(limb.segments[0], "rotation", 0.0, [72 + 14 * side, 0, 12 * side])
        put(limb.segments[0], "rotation", length * (0.34 + 0.08 * k), [-24, 0, 0],
            "easeOutQuart")
        put(limb.segments[0], "rotation", length, [0, 0, 0])
        for seg in limb.segments[1:]:
            put(seg, "rotation", 0.0, [-96, 0, 0])
            put(seg, "rotation", length * 0.7, [18, 0, 0], "easeOutQuart")
            put(seg, "rotation", length, [0, 0, 0])
        if limb.foot:
            put(limb.foot, "rotation", 0.0, [26, 0, 0])
            put(limb.foot, "rotation", length, [0, 0, 0])
    return {"loop": False, "animation_length": round(length, 3), "bones": tracks}
