"""Emit GeckoLib geometry and animations for every creature.

    python3 tools/bench/gen_geo.py

Geometry is transcribed from the same bench models the vanilla layers come
from, so a creature can be moved onto GeckoLib without being rebuilt. The
animations are generated per species from a short description - gait period,
swing, which bones are legs - which is why thirteen animals can each get a
walk tuned to their own build instead of sharing one.
"""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core import lower, pack_uvs
from geo import (animation, breathe, gait, key, strike, track, write_animations,
                 write_geo)
import bestiary as B
import anim as A

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                     "..", ".."))
GEO_DIR = os.path.join(ROOT, "src", "main", "resources", "assets", "gildedseam",
                       "geo")
ANIM_DIR = os.path.join(ROOT, "src", "main", "resources", "assets", "gildedseam",
                        "animations")

# How each one dies. Thirteen identical collapses is what makes a kill feel
# like a counter ticking rather than an event.
DEATHS = {
    "gilded_cow": "topple", "gilded_pig": "burst", "gilded_sheep": "fold",
    "gilded_goat": "topple", "gilded_horse": "buckle", "gilded_llama": "buckle",
    "gilded_chicken": "burst", "gilded_wolf": "fold", "gilded_fox": "fold",
    "gilded_cat": "fold", "gilded_hare": "burst", "gilded_cask": "burst",
    "gilded_spider": "buckle",
}

QUAD_LEGS = ["leg_fr", "leg_fl", "leg_br", "leg_bl"]
QUAD_HIND = {"leg_br", "leg_bl"}
SPIDER_LEGS = ["leg_r0", "leg_r1", "leg_r2", "leg_r3",
               "leg_l0", "leg_l1", "leg_l2", "leg_l3"]

# Per-species locomotion. Gait comes first, because which feet leave the ground
# together is what you actually recognise an animal by from across a field: a
# llama paces, a wolf trots, a hare bounds, a cow walks a careful four-beat.
# `limp` drags one diagonal - these animals are sick, and none of them should
# move like a show pony.
#
#   (shipped, legs, hind, period, gait, sway, limp, tail)
BEASTS = {
    "blighted_cow":     ("gilded_cow", QUAD_LEGS, QUAD_HIND, 1.15, "walk", 1.0, 0.10, ["tail"]),
    "blighted_pig":     ("gilded_pig", QUAD_LEGS, QUAD_HIND, 0.84, "walk", 1.3, 0.06, ["tail"]),
    "blighted_sheep":   ("gilded_sheep", QUAD_LEGS, QUAD_HIND, 0.98, "walk", 1.1, 0.14, ["tail"]),
    "blighted_goat":    ("gilded_goat", QUAD_LEGS, QUAD_HIND, 0.88, "walk", 0.9, 0.05, ["tail"]),
    "blighted_wolf":    ("gilded_wolf", QUAD_LEGS, QUAD_HIND, 0.62, "trot", 0.7, 0.04, ["tail"]),
    "blighted_fox":     ("gilded_fox", QUAD_LEGS, QUAD_HIND, 0.56, "trot", 0.8, 0.08, ["tail"]),
    "blighted_cat":     ("gilded_cat", QUAD_LEGS, QUAD_HIND, 0.54, "trot", 0.9, 0.03, ["tail"]),
    "blighted_rabbit":  ("gilded_hare", QUAD_LEGS, QUAD_HIND, 0.50, "bound", 1.4, 0.00, ["tail"]),
    "blighted_horse":   ("gilded_horse", QUAD_LEGS, QUAD_HIND, 1.22, "walk", 0.8, 0.12, ["tail"]),
    "blighted_llama":   ("gilded_llama", QUAD_LEGS, QUAD_HIND, 1.06, "pace", 1.6, 0.09, ["tail"]),
    "blighted_chicken": ("gilded_chicken", ["leg_r", "leg_l"], set(), 0.46, "biped", 1.5, 0.07, []),
    "blighted_creeper": ("gilded_cask", QUAD_LEGS, QUAD_HIND, 0.78, "walk", 1.2, 0.18, []),
    "blighted_spider":  ("gilded_spider", SPIDER_LEGS, set(), 0.58, "walk", 0.5, 0.05, []),
}


def chains_of(have: set, prefix: str, count: int) -> list[list[str]]:
    """Collects `prefix0`, `prefix0_1`, `prefix0_2`, ... into whole chains.

    `chain()` names its first link without a suffix, so a tentacle is
    `tend3, tend3_1, tend3_2` and not `tend3_0, tend3_1`. Walking the names
    rather than assuming a length means a chain that got longer or shorter in
    the geometry is still animated end to end.
    """
    out = []
    for i in range(count):
        if f"{prefix}{i}" not in have:
            continue
        chain = [f"{prefix}{i}"]
        while f"{prefix}{i}_{len(chain)}" in have:
            chain.append(f"{prefix}{i}_{len(chain)}")
        out.append(chain)
    return out


def main() -> None:
    os.makedirs(GEO_DIR, exist_ok=True)
    os.makedirs(ANIM_DIR, exist_ok=True)

    for bench_name, cfg in BEASTS.items():
        shipped, legs, hind, period, gait_name, sway, limp, tail = cfg
        model = lower(B.BESTIARY[bench_name]())
        pack_uvs(model)
        write_geo(model, shipped, os.path.join(GEO_DIR, f"{shipped}.geo.json"))

        limbs = A.measure_limbs(model, legs, hind)
        jaw = "face_jaw"
        have = {p.name for p in model.parts}
        tail = [t for t in tail if t in have]
        # Grafted arms are the thing that mauls you; the mouth is a backup.
        arms = [c for c in (["mut2_arm_r", "mut2_arm_r_fore", "mut2_arm_r_hand"],
                            ["mut2_arm_l", "mut2_arm_l_fore", "mut2_arm_l_hand"])
                if c[0] in have]

        anims = {
            f"animation.{shipped}.idle": A.idle(
                body="body", head="head", jaw=jaw, limbs=limbs, tail=tail,
                period=4.0 + 0.7 * len(shipped) % 2.3, unease=sway),
            f"animation.{shipped}.walk": A.locomotion(
                limbs, period=period, gait=gait_name, body="body", head="head",
                jaw=jaw, tail=tail, sway=sway, limp=limp),
            # Not the walk played fast. A gallop has a suspension phase, the
            # spine gathers and throws open once a stride, and `wrong` lets the
            # head loll and one side over-reach - it is coming at you on a body
            # it no longer fully owns.
            f"animation.{shipped}.run": A.locomotion(
                limbs, period=period * 0.55,
                gait="bound" if gait_name == "bound" else
                     ("sprint" if gait_name == "biped" else "gallop"),
                body="body", head="head", jaw=jaw, tail=tail,
                sway=sway * 1.3, limp=limp * 0.4, flex=1.0, wrong=0.85,
                airborne=1.0, samples=30),
            f"animation.{shipped}.attack": A.strike(
                arms=arms, length=0.78, head="head", jaw=jaw, body="body",
                legs=limbs, stagger=0.11, reach=84.0, step=1.6),
            # Killing one does not finish it: it falls where it stood, lies
            # there for a minute, and gets back up worse.
            f"animation.{shipped}.death": A.collapse(
                body="body", head="head", jaw=jaw, limbs=limbs, tail=tail,
                length=1.4 + 0.3 * (len(shipped) % 3),
                style=DEATHS.get(shipped, "fold"),
                height=max(6.0, min(20.0, limbs[0].reach if limbs else 12.0))),
            f"animation.{shipped}.rise": A.rise(
                body="body", head="head", jaw=jaw, limbs=limbs, length=2.2,
                height=max(6.0, min(20.0, limbs[0].reach if limbs else 12.0))),
        }
        write_animations(os.path.join(ANIM_DIR, f"{shipped}.animation.json"), anims)

    # --- abstracts and the taken -----------------------------------------
    # (bench name, body bone, head bone, jaw bone, limb roots, arm chains)
    OTHERS = {
        "the_choir": ("stalk", "bell", "maw0_jaw", [], []),
        "the_harrow": ("hub", "sac", None,
                       [f"leg{i}" for i in range(7)], []),
        "the_lacuna": ("shell", "skull", None,
                       ["leg_fr", "leg_fl", "leg_br", "leg_bl"], []),
        # The Warden's arm is one rigid box, as vanilla's is - there is no
        # `arm_r_1`, and driving one meant the whole swing landed on nothing.
        # The chain that does exist runs arm, hand, finger.
        "blighted_warden": ("body", "head", "face_jaw", ["leg_r", "leg_l"],
                            [["arm_r", "claw_r", "claw_r_f0", "claw_r_f0_1"],
                             ["arm_l", "claw_l", "claw_l_f0", "claw_l_f0_1"]]),
        # Rebuilt on WitherBossModel, so the bones are vanilla's: a ribcage,
        # three named heads, and no arms at all - what moves instead is the
        # curtain of roots it now hangs in and the tendrils venting out of the
        # collapsed head.
        "blighted_wither": ("ribcage", "center_head", "center_head_jaw", [],
                            [[f"right_head_tend{k}", f"right_head_tend{k}_1",
                              f"right_head_tend{k}_2"] for k in range(6)]),
        # Rebuilt on the vanilla skeleton, so the bones are vanilla's names put
        # through the toolchain's convention: a body rather than a chest, four
        # jointed legs rather than four stubs, and the neck is five real links
        # driven as one arm chain.
        "blighted_dragon": ("body", "head", "jaw",
                            ["leg_fr", "leg_fl", "leg_br", "leg_bl"],
                            [["neck0", "neck1", "neck2", "neck3", "neck4",
                              "head"]]),
        "blighted_enderman": ("body", "head", "face_jaw", ["leg_r", "leg_l"],
                              [["arm_r", "arm_r_1", "arm_r_2"],
                               ["arm_l", "arm_l_1", "arm_l_2"]]),
    }
    for bench_name, (body, head, jaw, legroots, armchains) in OTHERS.items():
        model = lower(B.BESTIARY[bench_name]())
        pack_uvs(model)
        write_geo(model, bench_name, os.path.join(GEO_DIR, f"{bench_name}.geo.json"))
        have = {p.name for p in model.parts}
        limbs = A.measure_limbs(model, [r for r in legroots if r in have], set())
        arms = [c for c in armchains if c[0] in have]
        anims = {
            f"animation.{bench_name}.idle": A.idle(
                body=body, head=head if head in have else None,
                jaw=jaw if jaw and jaw in have else None,
                limbs=limbs, period=5.6, depth=0.9, unease=1.1),
            f"animation.{bench_name}.attack": A.strike(
                arms=arms, length=1.1, head=head if head in have else None,
                jaw=jaw if jaw and jaw in have else None, body=body,
                legs=limbs, stagger=0.09, reach=92.0, step=2.4),
        }
        if limbs:
            anims[f"animation.{bench_name}.walk"] = A.locomotion(
                limbs, period=1.5, gait="biped" if len(limbs) == 2 else "walk",
                body=body, head=head if head in have else None,
                jaw=jaw if jaw and jaw in have else None, sway=1.2, limp=0.14,
                samples=26)
            anims[f"animation.{bench_name}.run"] = A.locomotion(
                limbs, period=0.95,
                gait="sprint" if len(limbs) == 2 else "gallop",
                body=body, head=head if head in have else None,
                jaw=jaw if jaw and jaw in have else None, sway=1.5, limp=0.0,
                flex=1.0, wrong=0.9, airborne=1.0, samples=30)
        # A twelve-link tail that does not move is twelve links of dead weight,
        # and the dragon's is the longest thing in the mod. The idle gets a
        # travelling wave laid over it - and over the neck, offset so the two
        # ends of the animal are never doing the same thing at once.
        if bench_name == "blighted_wither":
            # It hangs in the roots, so the roots are what carries its weight
            # about - a slow sway through the whole curtain rather than a body
            # that bobs on nothing.
            curtain = chains_of(have, "root", 7)
            if curtain:
                wave = A.writhe(curtain, period=7.2, samples=16, amp=4.0,
                                tip=2.2, lag=0.15)
                idle = anims[f"animation.{bench_name}.idle"]
                for bone, channels in wave["bones"].items():
                    idle["bones"].setdefault(bone, {}).update(channels)
        if bench_name == "blighted_dragon":
            tails = [[f"tail{i}" for i in range(12) if f"tail{i}" in have],
                     [f"neck{i}" for i in range(5) if f"neck{i}" in have]]
            tails = [c for c in tails if c]
            wave = A.writhe(tails, period=5.6, samples=18, amp=5.0, tip=2.6,
                            lag=0.13)
            idle = anims[f"animation.{bench_name}.idle"]
            for bone, channels in wave["bones"].items():
                idle["bones"].setdefault(bone, {}).update(channels)
        write_animations(os.path.join(ANIM_DIR, f"{bench_name}.animation.json"), anims)

    # --- the Creaking, hand and body ------------------------------------
    # Six arms is not six copies of one arm. They fire in sequence, outside
    # pair first, and the small sternum pair last and fastest, so a swing
    # arrives as a rolling mauling rather than a synchronised clap.
    CREAK_ARMS = [
        ["arm0_r", "arm0_r_1", "arm0_r_2", "hand0_r"],
        ["arm0_l", "arm0_l_1", "arm0_l_2", "hand0_l"],
        ["arm1_r", "arm1_r_1", "arm1_r_2", "hand1_r"],
        ["arm1_l", "arm1_l_1", "arm1_l_2", "hand1_l"],
        ["arms_r", "arms_r_1", "arms_r_2", "hands_r"],
        ["arms_l", "arms_l_1", "arms_l_2", "hands_l"],
    ]

    for bench_name, shipped in (("creaking_hand", "creaking_hand"),
                                ("the_creaking", "the_creaking"),
                                ("creaking_risen", "creaking_risen")):
        model = lower(B.BESTIARY[bench_name]() if bench_name in B.BESTIARY
                      else getattr(B, bench_name)())
        pack_uvs(model)
        write_geo(model, shipped, os.path.join(GEO_DIR, f"{shipped}.geo.json"))
        have = {p.name for p in model.parts}

        if shipped == "creaking_hand":
            fingers = [[f"hand_f{i}", f"hand_f{i}_1", f"hand_f{i}_2"]
                       for i in range(4)] + [["hand_th", "hand_th_1"]]
            fingers = [c for c in fingers if c[0] in have]
            write_animations(os.path.join(ANIM_DIR, f"{shipped}.animation.json"), {
                "animation.creaking_hand.idle": A.idle(
                    body="arm", period=6.0, depth=0.9, limbs=[], unease=0.7),
                # It comes through the gate, opens, and closes on something.
                "animation.creaking_hand.reach": A.strike(
                    arms=fingers, length=1.9, body="arm", stagger=0.07,
                    reach=54.0, step=3.0),
                "animation.creaking_hand.slam": A.strike(
                    arms=[["arm"]] + fingers, length=1.25, body="arm",
                    stagger=0.04, reach=96.0, step=4.5),
            })
            continue

        # No arms, no legs. The tendrils are what moves, and there are
        # eighteen of them at four different lengths.
        # They are tendrils, so they get `writhe` and `lash` rather than the
        # arm code - and whole chains, every link, not the first three: a wave
        # that stops a third of the way down a limb is not a wave.
        tendrils = chains_of(have, "tend", 18)
        # The cables it hangs from move too, a beat behind: the mass drags on
        # them. Only the lower half of each is worth keyframing - the ends are
        # buried in the ceiling and a wave up there is invisible and costs the
        # same to ship as one down here.
        moorings = [c[2:] for c in chains_of(have, "moor", 14)]
        legs = []
        anims = {
            # Nearly nine seconds a cycle. Slow is what makes it read as heavy.
            f"animation.{shipped}.idle": A.writhe(
                tendrils + moorings, period=8.6, samples=16, amp=11.0,
                tip=3.1, lag=0.19, body="torso", head="head", jaw="face_jaw"),
            # A roar throws everything outward and holds it open.
            f"animation.{shipped}.roar": A.lash(
                tendrils, length=2.6, reach=58.0, groups=2, body="torso",
                head="head", jaw="face_jaw", step=1.5, flare=True),
            # A slam brings them down in three waves.
            f"animation.{shipped}.slam": A.lash(
                tendrils, length=1.7, reach=104.0, groups=3, body="torso",
                head="head", jaw="face_jaw", step=5.0),
        }
        if legs:
            anims[f"animation.{shipped}.walk"] = A.locomotion(
                legs, period=2.1, gait="biped", body="torso", head="head",
                jaw="face_jaw", sway=1.3, limp=0.16, samples=28)
            anims[f"animation.{shipped}.charge"] = A.locomotion(
                legs, period=1.35, gait="biped", body="torso", head="head",
                jaw="face_jaw", sway=1.8, limp=0.0, samples=28)
        write_animations(os.path.join(ANIM_DIR, f"{shipped}.animation.json"), anims)

    print("done.")


if __name__ == "__main__":
    main()
