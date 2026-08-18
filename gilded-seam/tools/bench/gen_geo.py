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
        "blighted_warden": ("body", "head", "face_jaw", ["leg_r", "leg_l"],
                            [["arm_r", "arm_r_1", "arm_r_2", "arm_r_3"],
                             ["arm_l", "arm_l_1", "arm_l_2", "arm_l_3"]]),
        "blighted_wither": ("ribcage", "skull0", "skull0_jaw", [], []),
        "blighted_dragon": ("chest", "head", "face_jaw",
                            ["leg_r", "leg_l", "hind_r", "hind_l"],
                            [["neck", "neck_1", "neck_2", "neck_3", "neck_4"]]),
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

        arms = [c for c in CREAK_ARMS if c[0] in have]
        legs = A.measure_limbs(model, ["leg_r", "leg_l"], set()) if "leg_r" in have else []
        anims = {
            f"animation.{shipped}.idle": A.idle(
                body="chest", head="head", jaw="face_jaw", limbs=legs,
                period=6.4, depth=1.1, unease=0.8),
            f"animation.{shipped}.roar": A.strike(
                arms=arms, length=2.6, head="head", jaw="face_jaw",
                body="chest", legs=legs, stagger=0.09, reach=62.0, step=2.0),
            f"animation.{shipped}.slam": A.strike(
                arms=arms, length=1.5, head="head", jaw="face_jaw",
                body="chest", legs=legs, stagger=0.06, reach=108.0, step=5.0),
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
