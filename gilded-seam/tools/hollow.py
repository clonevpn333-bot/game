#!/usr/bin/env python3
"""Builds the Creaking's hollow: terrain, biomes, and the dimension itself.

The hollow used to be a fixed single biome sitting on `minecraft:nether`
noise settings. That produced a cavern made of netherrack full of lava, and
then - because the nether's surface rules ask *which nether biome am I in*
before they lay anything down, and the answer here was always "none of them" -
none of the interesting branches ever fired. What the player got was a grey
box. "The dimension is literally just another - there's zero difference."

So the hollow is generated from Mojang's own nether file rather than
remembered, and the surgery is done here where it can be read:

  * every block is swapped for one of ours or for something from the pale
    garden, and there is no lava anywhere;
  * every `biome_is` condition is repointed at one of *our* biomes, so the
    branches actually run;
  * and there are four biomes instead of one, spread by the same multi-noise
    parameters the nether uses, so the place has regions instead of being
    uniform in every direction.

Run from the mod root:  python3 tools/hollow.py
"""

from __future__ import annotations

import copy
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
ORACLE = os.path.join(HERE, "oracle", "vanilla")
DATA = os.path.join(ROOT, "src", "main", "resources", "data")
OURS = os.path.join(DATA, "gildedseam")

NS = "gildedseam"


def mc(name: str) -> str:
    return name if ":" in name else "minecraft:" + name


def ours(name: str) -> str:
    return NS + ":" + name


# --------------------------------------------------------------------------
# The four biomes.
#
# Each one takes over one branch of the nether's surface rules, which is why
# the palettes are described the same way the rules are: what the ceiling is
# made of, what you stand on, what is underneath that, and what the noise
# patches lay down on top.
# --------------------------------------------------------------------------

BIOMES = {
    # The baseline. Bare seamstone in every direction, shot through with
    # fired shell where something got hot enough to vitrify.
    "creaking_hollow": {
        "from": "nether_wastes",
        "params": (0.0, 0.0, 0.0, 0.0, 0.0, 0.0),
        "blocks": {
            "netherrack": ours("seamstone"),
            "gravel": ours("fired_shell"),
            "soul_sand": ours("gilt_mass"),
        },
        "fog": "#241203",
        "sky": "#120a04",
        "water": "#5c3a12",
        "loop": "minecraft:ambient.nether_wastes.loop",
        "additions": "minecraft:ambient.nether_wastes.additions",
        "music": "minecraft:music.overworld.deep_dark",
        "spawns": [
            ("shardling", 60, 2, 4),
            ("vessel", 40, 1, 3),
            ("porcelain_hound", 25, 2, 3),
            ("half_sewn", 12, 1, 2),
        ],
    },
    # Pale oak grown floor to ceiling in columns, standing in moss. The
    # closest thing the hollow has to a forest, and the reason the Creaking
    # came from here.
    "pale_colonnade": {
        "from": "basalt_deltas",
        "params": (-0.5, 0.0, 0.0, 0.0, 0.175, 0.0),
        "blocks": {
            "basalt": "minecraft:pale_oak_log",
            "blackstone": "minecraft:pale_moss_block",
            "gravel": "minecraft:tuff",
        },
        "fog": "#2b2723",
        "sky": "#141311",
        "water": "#495047",
        "loop": "minecraft:ambient.basalt_deltas.loop",
        "additions": "minecraft:ambient.basalt_deltas.additions",
        "music": "minecraft:music.overworld.deep_dark",
        "spawns": [
            ("half_sewn", 45, 1, 3),
            ("shardling", 30, 2, 4),
            ("chime", 18, 1, 1),
        ],
    },
    # Flats of set resin, cracked into brick by its own cooling. Walk
    # carefully: the low places are full of gold that has not gone hard.
    "amber_flats": {
        "from": "soul_sand_valley",
        "params": (0.0, -0.5, 0.0, 0.0, 0.0, 0.0),
        "blocks": {
            "soul_sand": "minecraft:resin_block",
            "soul_soil": "minecraft:resin_bricks",
            "gravel": ours("gilt_mass"),
        },
        "fog": "#5a3208",
        "sky": "#2a1704",
        "water": "#7a4a10",
        "loop": "minecraft:ambient.soul_sand_valley.loop",
        "additions": "minecraft:ambient.soul_sand_valley.additions",
        "music": "minecraft:music.overworld.deep_dark",
        "spawns": [
            ("vessel", 50, 2, 4),
            ("shardling", 30, 2, 3),
            ("kilnborn", 6, 1, 1),
        ],
    },
    # The only lit part of the hollow, and lit from below: froglight seams
    # in polished deepslate, like something buried is still burning.
    "lantern_deeps": {
        "from": "warped_forest",
        "params": (0.0, 0.5, 0.0, 0.0, 0.375, 0.0),
        "blocks": {
            "warped_nylium": "minecraft:polished_deepslate",
            "warped_wart_block": "minecraft:ochre_froglight",
        },
        "fog": "#3b2c10",
        "sky": "#191307",
        "water": "#6a5218",
        "loop": "minecraft:ambient.warped_forest.loop",
        "additions": "minecraft:ambient.warped_forest.additions",
        "music": "minecraft:music.overworld.deep_dark",
        "spawns": [
            ("porcelain_hound", 45, 2, 4),
            ("shardling", 25, 2, 3),
            ("seamstress", 10, 1, 1),
        ],
    },
}

# nether biome id -> our biome id, for repointing the surface rules.
REPOINT = {mc(spec["from"]): ours(name) for name, spec in BIOMES.items()}

# Blocks that appear outside any biome branch: the bulk stone, the default
# fill, and the lava that pools in holes. There is no lava here - what pools
# in the low places is gold that never finished setting.
GLOBAL_BLOCKS = {
    "minecraft:netherrack": ours("seamstone"),
    "minecraft:lava": ours("gilt_mass"),
}


def substitute(node, mapping):
    """Rewrites every `Name` in a subtree through `mapping`, in place.

    Block *properties* go with the name: `basalt` carries an `axis` and
    `pale_oak_log` also has one, but `pale_moss_block` has none, and leaving a
    stale property behind is a hard parse failure. So a swap to a block that
    does not take the old properties drops them.
    """
    if isinstance(node, dict):
        name = node.get("Name")
        if isinstance(name, str) and name in mapping:
            replacement = mapping[name]
            node["Name"] = replacement
            props = node.get("Properties")
            if props and not KEEPS_AXIS.get(replacement):
                node.pop("Properties", None)
        for value in node.values():
            substitute(value, mapping)
    elif isinstance(node, list):
        for value in node:
            substitute(value, mapping)
    return node


# Which replacements are pillar-shaped and therefore still want the `axis`
# property the nether's basalt came with.
KEEPS_AXIS = {
    "minecraft:pale_oak_log": True,
    "minecraft:ochre_froglight": True,
    "minecraft:bone_block": True,
}


def branch_biome(branch):
    """The biome a top-level surface-rule branch tests for, if it tests one."""
    cond = branch.get("if_true", {})
    if cond.get("type") == "minecraft:biome":
        return cond.get("biome_is")
    return None


def rewrite_surface_rule(rule):
    """Repoints every biome test at one of ours and swaps the palettes.

    The order of the nether's sequence is load-bearing - bedrock shell first,
    then bulk stone, then the per-biome branches, then a fallback - so this
    walks it in place rather than rebuilding it.
    """
    out = copy.deepcopy(rule)
    kept = []
    for branch in out["sequence"]:
        biome = branch_biome(branch)
        if biome is not None:
            if biome not in REPOINT:
                # A nether biome we have no answer for. Dropping the branch is
                # honest; leaving it in would be a rule that can never fire.
                continue
            target = REPOINT[biome]
            branch["if_true"]["biome_is"] = target
            spec = BIOMES[target.split(":")[1]]
            substitute(branch, {mc(k): v for k, v in spec["blocks"].items()})
            kept.append(target)
            continue

        # The floor-depth branch is not keyed on a biome itself; the biome
        # tests are nested one level in, alongside the lava-in-holes rule.
        inner = branch.get("then_run", {})
        if inner.get("type") == "minecraft:sequence":
            survivors = []
            for sub in inner["sequence"]:
                sub_biome = branch_biome(sub)
                if sub_biome is not None:
                    if sub_biome not in REPOINT:
                        continue
                    target = REPOINT[sub_biome]
                    sub["if_true"]["biome_is"] = target
                    spec = BIOMES[target.split(":")[1]]
                    substitute(sub, {mc(k): v for k, v in spec["blocks"].items()})
                    kept.append(target)
                survivors.append(sub)
            inner["sequence"] = survivors

    out["sequence"] = [b for b in out["sequence"] if b]
    substitute(out, GLOBAL_BLOCKS)

    missing = {ours(n) for n in BIOMES} - set(kept)
    if missing:
        raise SystemExit("no surface rule branch survived for: " + ", ".join(sorted(missing)))
    return out


def noise_settings(nether):
    d = copy.deepcopy(nether)
    d["default_block"] = {"Name": ours("seamstone")}
    # Nothing is liquid down here. Whatever ran, ran a long time ago.
    d["default_fluid"] = {"Name": "minecraft:air"}
    d["sea_level"] = 0
    d["aquifers_enabled"] = False
    d["ore_veins_enabled"] = False
    d["disable_mob_generation"] = False
    d["surface_rule"] = rewrite_surface_rule(nether["surface_rule"])
    return d


PARAM_NAMES = ("temperature", "humidity", "continentalness", "erosion",
               "weirdness", "offset")


def dimension():
    entries = []
    for name, spec in BIOMES.items():
        params = dict(zip(PARAM_NAMES, spec["params"]))
        params["depth"] = 0.0
        entries.append({"biome": ours(name), "parameters": params})
    return {
        "type": ours("creaking"),
        "generator": {
            "type": "minecraft:noise",
            "settings": ours("creaking"),
            "biome_source": {
                "type": "minecraft:multi_noise",
                "biomes": entries,
            },
        },
    }


def biome(name, spec):
    """One biome file.

    The colours live under `attributes`, not under `effects`. They moved, and
    because codecs drop keys they do not recognise, every colour in these
    files was silently thrown away for a while. `effects` still holds
    `water_color`; everything else is a namespaced attribute now.
    """
    return {
        "has_precipitation": False,
        "temperature": 0.4,
        "downfall": 0.0,
        "effects": {"water_color": spec["water"]},
        "carvers": ["minecraft:nether_cave"],
        "features": [[], [], [], [], [], [], [], [], [], []],
        "spawners": {
            "monster": [
                {"type": ours(mob), "weight": w, "minCount": lo, "maxCount": hi}
                for mob, w, lo, hi in spec["spawns"]
            ],
            "creature": [],
            "ambient": [],
            "axolotls": [],
            "underground_water_creature": [],
            "water_creature": [],
            "water_ambient": [],
            "misc": [],
        },
        "spawn_costs": {},
        "attributes": {
            "minecraft:visual/fog_color": spec["fog"],
            "minecraft:visual/sky_color": spec["sky"],
            "minecraft:audio/ambient_sounds": {
                "loop": spec["loop"],
                "mood": {
                    "sound": "minecraft:ambient.cave",
                    "tick_delay": 4200,
                    "block_search_extent": 8,
                    "offset": 2.0,
                },
                "additions": {
                    "sound": spec["additions"],
                    "tick_chance": 0.0143,
                },
            },
            "minecraft:audio/background_music": {
                "default": {
                    "sound": spec["music"],
                    "min_delay": 18000,
                    "max_delay": 40000,
                },
            },
        },
    }


def write(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as handle:
        json.dump(obj, handle, indent=2)
        handle.write("\n")
    print("  %-64s %6d bytes" % (os.path.relpath(path, ROOT), os.path.getsize(path)))


def main():
    source = os.path.join(ORACLE, "worldgen_noise_settings_nether.json")
    if not os.path.exists(source):
        raise SystemExit("no nether reference at " + source
                         + "\n(it is copied out of the jar by CI; see the workflow)")
    with open(source) as handle:
        nether = json.load(handle)

    write(os.path.join(OURS, "worldgen", "noise_settings", "creaking.json"),
          noise_settings(nether))
    for name, spec in BIOMES.items():
        write(os.path.join(OURS, "worldgen", "biome", name + ".json"), biome(name, spec))
    write(os.path.join(OURS, "dimension", "creaking.json"), dimension())

    # The hollow's structures ask for this tag, and the nether cave carver
    # only eats blocks the base-stone tag admits - so seamstone has to be in
    # it or the carver runs and does nothing.
    write(os.path.join(OURS, "tags", "worldgen", "biome", "hollow.json"),
          {"replace": False, "values": [ours(n) for n in BIOMES]})
    write(os.path.join(DATA, "minecraft", "tags", "block", "base_stone_nether.json"),
          {"replace": False, "values": [ours("seamstone")]})
    return 0


if __name__ == "__main__":
    sys.exit(main())
