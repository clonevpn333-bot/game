"""Splices generated LayerDefinitions back into the Java sources.

The bench is the source of truth for geometry, and it emits three things from
one model: the texture (with its UV packing), the GeckoLib geometry, and the
vanilla `LayerDefinition` the entity renderer builds from. Those three only
agree if they are generated together. Re-pack the UVs without re-splicing the
Java and every creature in the game wears its texture crooked - which is
exactly the kind of failure that is invisible in a build log and obvious the
moment you load a world.

So this is not a convenience script. Run it whenever geometry changes:

    python3 tools/bench/gen.py && python3 tools/bench/splice.py
"""

from __future__ import annotations

import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, "..", ".."))
SNIP = os.path.join(HERE, "out")
JAVA = os.path.join(ROOT, "src", "client", "java", "com", "gildedseam", "client",
                    "model")

# Which generated snippet feeds which method, in which file.
TARGETS = {
    "GildedBeastLayers.java": {
        "createGildedCowLayer": "gilded_cow",
        "createGildedPigLayer": "gilded_pig",
        "createGildedSheepLayer": "gilded_sheep",
        "createGildedChickenLayer": "gilded_chicken",
        "createGildedSpiderLayer": "gilded_spider",
        "createGildedCaskLayer": "gilded_cask",
        "createGildedWolfLayer": "gilded_wolf",
        "createGildedGoatLayer": "gilded_goat",
        "createGildedHareLayer": "gilded_hare",
        "createGildedFoxLayer": "gilded_fox",
        "createGildedCatLayer": "gilded_cat",
        "createGildedHorseLayer": "gilded_horse",
        "createGildedLlamaLayer": "gilded_llama",
    },
}


def method_span(src: str, name: str):
    """Finds the body of `public static LayerDefinition <name>() { ... }`."""
    m = re.search(r"public static LayerDefinition\s+" + re.escape(name)
                  + r"\s*\(\s*\)\s*\{", src)
    if not m:
        return None
    i = m.end()
    depth = 1
    while i < len(src) and depth:
        if src[i] == "{":
            depth += 1
        elif src[i] == "}":
            depth -= 1
        i += 1
    return m.end(), i - 1


def main() -> None:
    changed = 0
    missing = []
    for filename, methods in TARGETS.items():
        path = os.path.join(JAVA, filename)
        if not os.path.exists(path):
            missing.append(filename)
            continue
        src = open(path).read()
        for method, snippet in methods.items():
            snip_path = os.path.join(SNIP, f"{snippet}_layer.java.txt")
            if not os.path.exists(snip_path):
                missing.append(snippet)
                continue
            span = method_span(src, method)
            if span is None:
                missing.append(f"{filename}:{method}")
                continue
            body = open(snip_path).read().rstrip()
            start, end = span
            if src[start:end].strip() == body.strip():
                continue
            src = src[:start] + "\n" + body + "\n    " + src[end:]
            changed += 1
            print(f"  spliced {method} <- {snippet}")
        open(path, "w").write(src)

    print(f"{changed} layer(s) updated")
    if missing:
        print("  ! not found: " + ", ".join(sorted(set(missing))))
        sys.exit(1 if changed == 0 else 0)


if __name__ == "__main__":
    main()
