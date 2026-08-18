"""Build everything: geometry -> Java + textures + preview sheets.

    python3 tools/bench/gen.py [preview_out_dir]
"""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core import emit_java, lower, pack_uvs, stats
from paint import paint
from render import portrait, sheet
import bestiary as B

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                     "..", ".."))
TEX_DIR = os.path.join(ROOT, "src", "main", "resources", "assets", "gildedseam",
                       "textures", "entity")

# The in-game registry names these creatures already ship under. The bench
# names are the design names; this maps them onto the shipped ids so new
# geometry drops straight into the existing entity classes.
LEGACY = {
    "blighted_cow": "gilded_cow",
    "blighted_pig": "gilded_pig",
    "blighted_sheep": "gilded_sheep",
    "blighted_chicken": "gilded_chicken",
    "blighted_spider": "gilded_spider",
    "blighted_creeper": "gilded_cask",
    "amber_sovereign": "porcelain_autarch",
    "blighted_wolf": "gilded_wolf",
    "blighted_goat": "gilded_goat",
    "blighted_rabbit": "gilded_hare",
}
# The Tangle, the Colossus, the Tapper and the Refugee are authored here and
# rendered for the bestiary, but their in-game entity classes still carry the
# previous geometry; they are wired in the next pass.
UNWIRED = {"the_tangle", "heartwood_colossus", "tapper", "refugee", "half_sapped"}
SNIP_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")

# Green Sap / Hardened / Amberlit - how far the resin has taken the body.
TIER_BLIGHT = (0.55, 1.45, 2.60)
SUFFIX = ("", "_stoneware", "_lustre")


def build_all():
    models = {}
    for name, fn in B.BESTIARY.items():
        m = lower(fn())
        pack_uvs(m)
        models[name] = m
    return models


def main():
    out_dir = sys.argv[1] if len(sys.argv) > 1 else "."
    os.makedirs(TEX_DIR, exist_ok=True)
    os.makedirs(SNIP_DIR, exist_ok=True)
    os.makedirs(out_dir, exist_ok=True)

    models = build_all()
    textures = {}

    for i, (name, m) in enumerate(models.items()):
        seed = 20260817 + i * 6151
        shipped = LEGACY.get(name, name)
        ship_assets = name not in UNWIRED
        with open(os.path.join(SNIP_DIR, f"{shipped}_layer.java.txt"), "w") as fh:
            fh.write(emit_java(m) + "\n")
        eyes = B.EYE_FIELDS.get(name)
        tiers = []
        if name in B.LIVING:
            img = paint(m, seed, blight=0.0, eyes=eyes)
            if ship_assets:
                img.save(os.path.join(TEX_DIR, f"{shipped}.png"))
            tiers = [img, img, img]
        else:
            for t, blight in enumerate(TIER_BLIGHT):
                img = paint(m, seed, blight=blight, eyes=eyes)
                if ship_assets:
                    img.save(os.path.join(TEX_DIR, f"{shipped}{SUFFIX[t]}.png"))
                tiers.append(img)
        textures[name] = tiers
        print(stats(m))

    def entry(name):
        disp, blurb = B.DISPLAY[name]
        return (models[name], lambda t, n=name: textures[n][t], disp, blurb)

    sheet([entry(n) for n in ("blighted_cow", "blighted_pig", "blighted_sheep")],
          os.path.join(out_dir, "bestiary_livestock.png"),
          "THE BLIGHTED FARMYARD",
          "the vanilla silhouette is kept exactly; the infection is grafted on top")
    sheet([entry(n) for n in ("blighted_chicken", "blighted_wolf", "blighted_goat",
                              "blighted_rabbit")],
          os.path.join(out_dir, "bestiary_livestock2.png"),
          "THE BLIGHTED FARMYARD II",
          "hen, wolf, goat, hare - each still unmistakably itself")
    sheet([entry(n) for n in ("blighted_spider", "blighted_creeper", "half_sapped")],
          os.path.join(out_dir, "bestiary_hostiles.png"),
          "HOSTILES AND THE HALF-SAPPED",
          "the mobs that were already trying to kill you")
    sheet([entry(n) for n in ("the_tangle", "heartwood_colossus")],
          os.path.join(out_dir, "bestiary_abstracts.png"),
          "THE ABSTRACTS",
          "no host left to recognise - these are what the blight builds unsupervised")
    sheet([entry(n) for n in ("tapper", "refugee")],
          os.path.join(out_dir, "bestiary_people.png"),
          "THE LIVING",
          "hireable tappers and the refugees you can talk into fighting")

    portrait(models["amber_sovereign"], textures["amber_sovereign"][2],
             os.path.join(out_dir, "boss_amber_sovereign.png"), size=620)
    portrait(models["heartwood_colossus"], textures["heartwood_colossus"][2],
             os.path.join(out_dir, "boss_colossus.png"), size=520)
    print("done.")


if __name__ == "__main__":
    main()
