"""Entry point: generates Java LayerDefinition bodies + entity textures."""

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from lib import emit_java, pack_uvs, paint
from models import ALL_MODELS, MASK_PARTS, TIERED_TEXTURES

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", ".."))
TEXTURE_DIR = os.path.join(ROOT, "src", "main", "resources", "assets", "gildedseam",
                           "textures", "entity")
SNIPPET_DIR = os.environ.get("SNIPPET_DIR",
                             os.path.join(os.path.dirname(__file__), "out"))

SEEDS = {name: i * 7919 + 42 for i, name in enumerate(
    ["shardling", "vessel", "porcelain_hound", "seamstress", "kilnborn",
     "chime", "font_of_gold", "manifold", "reliquary_colossus"])}
SEEDS["porcelain_autarch"] = 991199
SEEDS["salt_sworn"] = 445566


def main() -> None:
    os.makedirs(TEXTURE_DIR, exist_ok=True)
    os.makedirs(SNIPPET_DIR, exist_ok=True)

    for model in ALL_MODELS:
        pack_uvs(model)

        java = emit_java(model)
        with open(os.path.join(SNIPPET_DIR, f"{model.name}_layer.java.txt"), "w") as fh:
            fh.write(java + "\n")

        seed = SEEDS[model.name]
        masks = MASK_PARTS[model.name]

        base = paint(model, seed, gold_density=1.0, mask_parts=masks)
        base.save(os.path.join(TEXTURE_DIR, f"{model.name}.png"))

        if model.name in TIERED_TEXTURES:
            stoneware = paint(model, seed, gold_density=1.8, mask_parts=masks, warm=0.5)
            stoneware.save(os.path.join(TEXTURE_DIR, f"{model.name}_stoneware.png"))
            lustre = paint(model, seed, gold_density=3.0, mask_parts=masks, warm=1.0)
            lustre.save(os.path.join(TEXTURE_DIR, f"{model.name}_lustre.png"))

        n_parts = len(model.parts)
        n_boxes = sum(len(p.boxes) for p in model.parts)
        print(f"{model.name:22s} parts={n_parts:3d} boxes={n_boxes:3d} tex={model.tex}")

    print("done.")


if __name__ == "__main__":
    main()
