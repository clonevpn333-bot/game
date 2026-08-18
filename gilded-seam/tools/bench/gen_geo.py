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

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                     "..", ".."))
GEO_DIR = os.path.join(ROOT, "src", "main", "resources", "assets", "gildedseam",
                       "geo")
ANIM_DIR = os.path.join(ROOT, "src", "main", "resources", "assets", "gildedseam",
                        "animations")

QUAD_LEGS = ["leg_fr", "leg_fl", "leg_br", "leg_bl"]

# Per-species timing. A hare does not walk like a horse, and a walk cycle that
# ignores that is the thing that makes modded mobs feel weightless.
BEASTS = {
    "blighted_cow":     ("gilded_cow", QUAD_LEGS, 0.92, 24.0, 1.2),
    "blighted_pig":     ("gilded_pig", QUAD_LEGS, 0.74, 27.0, 0.9),
    "blighted_sheep":   ("gilded_sheep", QUAD_LEGS, 0.86, 25.0, 1.0),
    "blighted_goat":    ("gilded_goat", QUAD_LEGS, 0.80, 27.0, 1.0),
    "blighted_wolf":    ("gilded_wolf", QUAD_LEGS, 0.58, 33.0, 1.3),
    "blighted_fox":     ("gilded_fox", QUAD_LEGS, 0.54, 34.0, 1.3),
    "blighted_cat":     ("gilded_cat", QUAD_LEGS, 0.50, 31.0, 1.1),
    "blighted_rabbit":  ("gilded_hare", QUAD_LEGS, 0.44, 38.0, 1.8),
    "blighted_horse":   ("gilded_horse", QUAD_LEGS, 1.05, 22.0, 1.5),
    "blighted_llama":   ("gilded_llama", QUAD_LEGS, 0.98, 23.0, 1.2),
    "blighted_chicken": ("gilded_chicken", ["leg_r", "leg_l"], 0.40, 34.0, 1.0),
    "blighted_creeper": ("gilded_cask", QUAD_LEGS, 0.70, 20.0, 0.8),
    "blighted_spider":  ("gilded_spider",
                         ["leg_r0", "leg_r1", "leg_r2", "leg_r3",
                          "leg_l0", "leg_l1", "leg_l2", "leg_l3"], 0.52, 16.0, 0.5),
}


def main() -> None:
    os.makedirs(GEO_DIR, exist_ok=True)
    os.makedirs(ANIM_DIR, exist_ok=True)

    for bench_name, (shipped, legs, period, swing, bounce) in BEASTS.items():
        model = lower(B.BESTIARY[bench_name]())
        pack_uvs(model)
        write_geo(model, shipped, os.path.join(GEO_DIR, f"{shipped}.geo.json"))

        jaw = "face_jaw"
        anims = {
            f"animation.{shipped}.idle": breathe("body", length=4.0, depth=0.4, extra={
                jaw: {"rotation": track(
                    key(0.0, [14, 0, 0]),
                    key(2.0, [20, 0, 0]),
                    key(4.0, [14, 0, 0]),
                )},
            }),
            f"animation.{shipped}.walk": gait(legs, period=period, swing=swing,
                                              body="body", head="head", jaw=jaw,
                                              bounce=bounce),
            f"animation.{shipped}.attack": strike("head", [], length=0.8,
                                                  jaw=jaw, body="body"),
        }
        write_animations(os.path.join(ANIM_DIR, f"{shipped}.animation.json"), anims)

    # --- the Creaking, hand and body ------------------------------------
    for bench_name, shipped in (("creaking_hand", "creaking_hand"),
                                ("the_creaking", "the_creaking"),
                                ("creaking_risen", "creaking_risen")):
        model = lower(B.BESTIARY[bench_name]() if bench_name in B.BESTIARY
                      else getattr(B, bench_name)())
        pack_uvs(model)
        write_geo(model, shipped, os.path.join(GEO_DIR, f"{shipped}.geo.json"))

    # The hand reaches, grabs, and drags back through the gate.
    hand_fingers = [f"hand_f{i}" for i in range(4)] + ["hand_th"]
    write_animations(os.path.join(ANIM_DIR, "creaking_hand.animation.json"), {
        "animation.creaking_hand.idle": animation(5.0, {
            "arm": {"rotation": track(key(0.0, [0, 0, 0]), key(2.5, [0, 4, 2]),
                                      key(5.0, [0, 0, 0]))},
            **{f: {"rotation": track(key(0.0, [0, 0, 0]), key(2.5, [10, 0, 0]),
                                     key(5.0, [0, 0, 0]))} for f in hand_fingers},
        }),
        "animation.creaking_hand.reach": animation(1.6, {
            "arm": {"rotation": track(
                key(0.0, [0, 0, 0]),
                key(0.5, [14, 0, 0]),
                key(0.95, [-34, 0, 0], easing="easeOutQuart"),
                key(1.6, [0, 0, 0]))},
            **{f: {"rotation": track(
                key(0.0, [0, 0, 0]),
                key(0.5, [-22, 0, 0]),
                key(1.05, [48, 0, 0], easing="easeOutQuart"),
                key(1.6, [0, 0, 0]))} for f in hand_fingers},
        }, loop=False),
        "animation.creaking_hand.slam": animation(1.2, {
            "arm": {"rotation": track(
                key(0.0, [0, 0, 0]),
                key(0.45, [42, 0, 0]),
                key(0.62, [-58, 0, 0], easing="easeOutQuart"),
                key(1.2, [0, 0, 0]))},
        }, loop=False),
    })

    for shipped in ("the_creaking", "creaking_risen"):
        arms = [f"arm{k}_{t}" for k in (0, 1) for t in ("r", "l")]
        anims = {
            f"animation.{shipped}.idle": breathe("chest", length=5.5, depth=0.7, extra={
                "head": {"rotation": track(key(0.0, [0, 0, 0]), key(2.75, [4, 6, 0]),
                                           key(5.5, [0, 0, 0]))},
                "face_jaw": {"rotation": track(key(0.0, [16, 0, 0]),
                                               key(2.75, [26, 0, 0]),
                                               key(5.5, [16, 0, 0]))},
                **{a: {"rotation": track(key(0.0, [0, 0, 0]),
                                         key(2.75, [6, 0, 3]),
                                         key(5.5, [0, 0, 0]))} for a in arms},
            }),
            f"animation.{shipped}.roar": animation(2.4, {
                "chest": {"rotation": track(key(0.0, [0, 0, 0]), key(0.7, [-14, 0, 0]),
                                            key(1.4, [8, 0, 0], easing="easeOutQuart"),
                                            key(2.4, [0, 0, 0]))},
                "head": {"rotation": track(key(0.0, [0, 0, 0]), key(0.7, [-30, 0, 0]),
                                           key(1.5, [12, 0, 0], easing="easeOutQuart"),
                                           key(2.4, [0, 0, 0]))},
                "face_jaw": {"rotation": track(key(0.0, [16, 0, 0]),
                                               key(0.7, [62, 0, 0]),
                                               key(1.8, [58, 0, 0]),
                                               key(2.4, [16, 0, 0]))},
                **{a: {"rotation": track(key(0.0, [0, 0, 0]), key(0.7, [-24, 0, 0]),
                                         key(1.4, [18, 0, 0], easing="easeOutQuart"),
                                         key(2.4, [0, 0, 0]))} for a in arms},
            }, loop=False),
            f"animation.{shipped}.slam": strike("head", arms, length=1.3,
                                                jaw="face_jaw", body="chest"),
        }
        if shipped == "creaking_risen":
            anims[f"animation.{shipped}.walk"] = gait(["leg_r", "leg_l"], period=1.5,
                                                      swing=17.0, body="torso",
                                                      head="head", jaw="face_jaw",
                                                      bounce=2.2)
        write_animations(os.path.join(ANIM_DIR, f"{shipped}.animation.json"), anims)

    print("done.")


if __name__ == "__main__":
    main()
