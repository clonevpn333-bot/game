"""Builds AmberView - a single-file 3D viewer for everything in the mod.

    python3 tools/viewer_gen.py

There is no way to open Blockbench in here, and no way to open Minecraft
either, which means the only way to *look* at what this mod builds is to build
something that can look at it. AmberView reads the exact files the game reads -
the GeckoLib geometry, the GeckoLib animations, the entity textures, the
structure templates - and bakes them into one HTML page with a WebGL renderer
inside it. Open the page, and you are looking at the shipped asset, not a
mock-up of it: if the walk cycle is wrong here, it is wrong in game.

Three rooms:

  Bestiary    every creature, textured, with its animations playing and a
              timeline you can scrub. Tier switch swaps the texture the same
              way the entity does when the resin takes hold.
  Structures  the five templates as voxels, with a height slider that peels
              the build apart layer by layer and markers where mobs spawn.
  Chunks      sample terrain for each of the mod's ground states, generated
              from the same block palette the world generator uses.
"""

from __future__ import annotations

import base64
import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, ".."))
ASSETS = os.path.join(ROOT, "src", "main", "resources", "assets", "gildedseam")
GEO_DIR = os.path.join(ASSETS, "geo")
ANIM_DIR = os.path.join(ASSETS, "animations")
TEX_DIR = os.path.join(ASSETS, "textures", "entity")
OUT = os.path.join(ROOT, "..", "viewer", "amberview.html")

sys.path.insert(0, HERE)

# ---------------------------------------------------------------------------
# Creatures
# ---------------------------------------------------------------------------

# Shipped id -> (display name, which shelf of the bestiary, a line of flavour).
CREATURES = {
    "gilded_cow": ("Blighted Cow", "Livestock",
                   "Keeps the hide, the horns and the four legs. Grows hands."),
    "gilded_pig": ("Blighted Pig", "Livestock",
                   "The snout splits lengthwise and keeps rooting."),
    "gilded_sheep": ("Blighted Sheep", "Livestock",
                     "Fleece hardened into resin plates it cannot shed."),
    "gilded_goat": ("Blighted Goat", "Livestock",
                    "Horns branch like antlers and never stop growing."),
    "gilded_horse": ("Blighted Horse", "Livestock",
                     "Still fast. That is the problem with it."),
    "gilded_llama": ("Blighted Llama", "Livestock",
                     "Spits sap that sets hard in about four seconds."),
    "gilded_chicken": ("Blighted Chicken", "Livestock",
                       "Two legs, six eyes, no sense of self-preservation."),
    "gilded_wolf": ("Blighted Wolf", "Hunters",
                    "Hunts in a pack that no longer needs to see."),
    "gilded_fox": ("Blighted Fox", "Hunters",
                   "Carries things back to the hearts. Nobody knows why."),
    "gilded_cat": ("Blighted Cat", "Hunters",
                   "Small, quiet, and the first one into a house."),
    "gilded_hare": ("Blighted Hare", "Hunters",
                    "Moves in bursts. Lands wrong. Does not care."),
    "gilded_spider": ("Blighted Spider", "Hunters",
                      "Eight legs, eight simple eyes, and resin for silk."),
    "gilded_cask": ("Gilded Cask", "Hunters",
                    "A creeper full of pressurised sap. It does not hiss."),
    "creaking_hand": ("The Creaking Hand", "The Creaking",
                      "All you see of it in the overworld: an arm through a gate."),
    "the_creaking": ("The Creaking", "The Creaking",
                     "Waist-deep in gilded water, six arms, an open chest."),
    "creaking_risen": ("The Creaking, Risen", "The Creaking",
                       "It steps out. Full body. This is the fight you lose."),
}

TIERS = (("base", ""), ("stoneware", "_stoneware"), ("lustre", "_lustre"))


def data_uri(path: str) -> str:
    with open(path, "rb") as fh:
        return "data:image/png;base64," + base64.b64encode(fh.read()).decode("ascii")


def collect_models() -> dict:
    models = {}
    for shipped, (label, group, blurb) in CREATURES.items():
        geo_path = os.path.join(GEO_DIR, f"{shipped}.geo.json")
        if not os.path.exists(geo_path):
            print(f"  ! no geometry for {shipped}, skipped")
            continue
        with open(geo_path) as fh:
            geo = json.load(fh)["minecraft:geometry"][0]

        anims = {}
        anim_path = os.path.join(ANIM_DIR, f"{shipped}.animation.json")
        if os.path.exists(anim_path):
            with open(anim_path) as fh:
                for key, body in json.load(fh)["animations"].items():
                    anims[key.rsplit(".", 1)[-1]] = body

        textures = {}
        for tier, suffix in TIERS:
            tex_path = os.path.join(TEX_DIR, f"{shipped}{suffix}.png")
            if os.path.exists(tex_path):
                textures[tier] = data_uri(tex_path)
        if not textures:
            print(f"  ! no texture for {shipped}")

        models[shipped] = {
            "label": label, "group": group, "blurb": blurb,
            "tex": geo["description"]["texture_width"],
            "bones": geo["bones"],
            "anims": anims,
            "textures": textures,
        }
        print(f"  {shipped}: {len(geo['bones'])} bones, "
              f"{len(anims)} anims, {len(textures)} tiers")
    return models


# ---------------------------------------------------------------------------
# Structures
# ---------------------------------------------------------------------------

STRUCTURE_LABELS = {
    "gilded_palace": ("The Gilded Palace",
                      "Throne hall of the Autarch. The cure is in the reliquary."),
    "hollow_city": ("The Hollow City",
                    "A town the blight walked into and never walked out of."),
    "refuge_hamlet": ("Refuge Hamlet",
                      "Boarded windows, one lantern still lit, survivors inside."),
    "mother_tree": ("The Mother Tree",
                    "65x96x65 of pale oak grown over the World Core."),
    "sunken_court": ("The Sunken Court",
                     "The Creaking's arena, in the hollow, under the canopy."),
}

# Block colours, sampled from the vanilla textures by eye. Two tones per block
# so the voxel renderer can shade the top face lighter without every build
# turning into a grey mass.
COLORS = {
    "minecraft:air": None,
    "gildedseam:seamstone": "#4a4741",
    "gildedseam:fired_shell": "#cbb48a",
    "gildedseam:gilded_vein": "#d8a340",
    "gildedseam:porcelain_bloom": "#e8dfd0",
    "gildedseam:kiln_heart": "#c2762a",
    "minecraft:quartz_block": "#ece5dd",
    "minecraft:quartz_pillar": "#e6ded4",
    "minecraft:chiseled_quartz_block": "#e0d7cb",
    "minecraft:quartz_stairs": "#ece5dd",
    "minecraft:gold_block": "#f2cb45",
    "minecraft:chest": "#8b6a33",
    "minecraft:spruce_planks": "#7a5a37",
    "minecraft:spruce_log": "#4b3722",
    "minecraft:cobblestone": "#7d7d7d",
    "minecraft:lantern": "#ffd98a",
    "minecraft:pale_oak_log": "#c2bcb2",
    "minecraft:pale_oak_wood": "#b6b0a6",
    "minecraft:pale_oak_planks": "#d5d0c6",
    "minecraft:pale_oak_leaves": "#8f9c86",
    "minecraft:resin_block": "#e08a2c",
    "minecraft:resin_bricks": "#c9762a",
    "minecraft:creaking_heart": "#5d4a3a",
    "minecraft:open_eyeblossom": "#e8b83c",
    "minecraft:closed_eyeblossom": "#7c6f9c",
    "minecraft:stone": "#7d7d7d",
    "minecraft:stone_bricks": "#7b7b7b",
    "minecraft:dirt": "#8b6748",
    "minecraft:coarse_dirt": "#7d5c40",
    "minecraft:grass_block": "#6a9a3e",
    "minecraft:oak_planks": "#a2814f",
    "minecraft:oak_log": "#6d552f",
    "minecraft:glass": "#c8e4ec",
    "minecraft:glass_pane": "#c8e4ec",
    "minecraft:iron_bars": "#8d8d8d",
    "minecraft:torch": "#ffcf6b",
    "minecraft:campfire": "#d4761f",
    "minecraft:barrel": "#7a5a37",
    "minecraft:crafting_table": "#8a6a3c",
    "minecraft:water": "#3a6fd8",
    "minecraft:gravel": "#8a8480",
    "minecraft:mossy_cobblestone": "#68785e",
    "minecraft:cobblestone_stairs": "#7d7d7d",
    "minecraft:cobblestone_slab": "#7d7d7d",
    "minecraft:cobblestone_wall": "#767676",
    "minecraft:ladder": "#96733f",
    "minecraft:bookshelf": "#9a7a4a",
    "minecraft:hay_block": "#c9a52a",
    "minecraft:white_wool": "#e9ecec",
    "minecraft:bell": "#f2cb45",
}

# These read as light sources or hot spots and get a glow in the viewer.
EMISSIVE = {"gildedseam:kiln_heart", "gildedseam:gilded_vein",
            "minecraft:lantern", "minecraft:torch", "minecraft:campfire",
            "minecraft:open_eyeblossom", "minecraft:gold_block",
            "minecraft:creaking_heart"}


def collect_structures() -> tuple[dict, set]:
    """Runs the structure builders and captures what they place."""
    import structure_gen as SG

    captured = {}
    original_save = SG.Template.save

    def capture(self, name):
        captured[name] = {
            "size": list(self.size),
            "palette": [entry["Name"] for entry in self.palette],
            "blocks": [(b["pos"], b["state"]) for b in self.blocks.values()],
            "entities": [(e["pos"], e["nbt"]["id"]) for e in self.entities],
        }
        return original_save(self, name)

    SG.Template.save = capture
    try:
        SG.build_palace()
        SG.build_city()
        SG.build_hamlet()
        SG.build_mother_tree()
        SG.build_sunken_court()
    finally:
        SG.Template.save = original_save

    unknown = set()
    out = {}
    for name, cap in captured.items():
        label, blurb = STRUCTURE_LABELS.get(name, (name, ""))
        for block_name in cap["palette"]:
            if block_name not in COLORS:
                unknown.add(block_name)
        flat = []
        for (x, y, z), state in cap["blocks"]:
            flat += [x, y, z, state]
        out[name] = {
            "label": label, "blurb": blurb,
            "size": cap["size"],
            "palette": cap["palette"],
            "blocks": flat,
            "entities": [{"pos": [round(v, 2) for v in pos],
                          "id": eid.split(":")[-1]} for pos, eid in cap["entities"]],
        }
        print(f"  {name}: {len(cap['blocks'])} blocks, {len(cap['entities'])} entities")
    return out, unknown


# ---------------------------------------------------------------------------
# Chunk samples - what the ground looks like in each state
# ---------------------------------------------------------------------------

N = 32


def _noise(seed: int):
    """Tiny deterministic value noise. Enough for a believable 32x32 sample."""
    grid = {}

    def hashed(ix, iz):
        if (ix, iz) not in grid:
            h = (ix * 374761393 + iz * 668265263 + seed * 1442695040888963407) & 0xFFFFFFFF
            h = (h ^ (h >> 13)) * 1274126177 & 0xFFFFFFFF
            grid[(ix, iz)] = ((h ^ (h >> 16)) & 0xFFFF) / 65535.0
        return grid[(ix, iz)]

    def sample(x, z, scale):
        fx, fz = x / scale, z / scale
        ix, iz = math.floor(fx), math.floor(fz)
        tx, tz = fx - ix, fz - iz
        sx = tx * tx * (3 - 2 * tx)
        sz = tz * tz * (3 - 2 * tz)
        a = hashed(ix, iz) * (1 - sx) + hashed(ix + 1, iz) * sx
        b = hashed(ix, iz + 1) * (1 - sx) + hashed(ix + 1, iz + 1) * sx
        return a * (1 - sz) + b * sz

    return sample


class Chunk:
    def __init__(self, height=24):
        self.h = height
        self.cells = {}
        self.palette = []
        self.index = {}

    def set(self, x, y, z, name):
        if not (0 <= x < N and 0 <= z < N and 0 <= y < self.h):
            return
        if name not in self.index:
            self.index[name] = len(self.palette)
            self.palette.append(name)
        self.cells[(x, y, z)] = self.index[name]

    def column(self, x, z, top, *layers):
        """Fills downward from `top` using (block, thickness) pairs."""
        y = top
        for block, thickness in layers:
            for _ in range(thickness):
                if y < 0:
                    return
                self.set(x, y, z, block)
                y -= 1

    def pack(self):
        flat = []
        for (x, y, z), state in self.cells.items():
            flat += [x, y, z, state]
        return {"size": [N, self.h, N], "palette": self.palette, "blocks": flat,
                "entities": []}


def chunk_pale_garden():
    """Untouched. The place the blight came out of, before it did."""
    c = Chunk(22)
    n = _noise(11)
    for x in range(N):
        for z in range(N):
            top = 7 + int(n(x, z, 9.0) * 3)
            c.column(x, z, top, ("minecraft:grass_block", 1),
                     ("minecraft:dirt", 3), ("minecraft:stone", 6))
            r = n(x + 90, z + 90, 3.0)
            if r > 0.86:
                for k in range(4 + int(r * 5)):
                    c.set(x, top + 1 + k, z, "minecraft:pale_oak_log")
                for dx in range(-2, 3):
                    for dz in range(-2, 3):
                        if abs(dx) + abs(dz) <= 3:
                            c.set(x + dx, top + 5 + int(r * 5), z + dz,
                                  "minecraft:pale_oak_leaves")
            elif r > 0.80:
                c.set(x, top + 1, z, "minecraft:closed_eyeblossom")
    return c


def chunk_blight_scar():
    """Overworld ground the resin has reached. A heart, and the spread from it."""
    c = Chunk(22)
    n = _noise(23)
    hx, hz = 15, 17
    for x in range(N):
        for z in range(N):
            top = 7 + int(n(x, z, 9.0) * 3)
            d = math.hypot(x - hx, z - hz)
            reach = 9.0 + n(x + 40, z + 40, 5.0) * 5.0
            if d < reach:
                bite = 1.0 - d / reach
                surface = ("gildedseam:fired_shell" if bite > 0.55
                           else "gildedseam:seamstone")
                if n(x + 7, z + 3, 2.5) < bite * 0.45:
                    surface = "gildedseam:gilded_vein"
                c.column(x, z, top, (surface, 1), ("gildedseam:seamstone", 3),
                         ("minecraft:stone", 6))
                if bite > 0.3 and n(x + 60, z, 2.0) > 0.88:
                    c.set(x, top + 1, z, "minecraft:resin_block")
            else:
                c.column(x, z, top, ("minecraft:grass_block", 1),
                         ("minecraft:dirt", 3), ("minecraft:stone", 6))
                if n(x + 90, z + 90, 3.0) > 0.90:
                    c.set(x, top + 1, z, "minecraft:open_eyeblossom")
    top = 7 + int(n(hx, hz, 9.0) * 3)
    c.set(hx, top + 1, hz, "gildedseam:kiln_heart")
    for dx, dz in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        c.set(hx + dx, top + 1, hz + dz, "gildedseam:gilded_vein")
    return c


def chunk_hollow():
    """The Creaking dimension: a ceiling, a floor, and gold standing between."""
    c = Chunk(30)
    n = _noise(37)
    for x in range(N):
        for z in range(N):
            floor = 4 + int(n(x, z, 11.0) * 3)
            pool = n(x + 30, z + 12, 7.0) > 0.62
            surface = "minecraft:gold_block" if pool else "gildedseam:seamstone"
            c.column(x, z, floor, (surface, 1), ("gildedseam:seamstone", 2),
                     ("minecraft:stone", 4))
            if not pool and n(x + 5, z + 55, 3.0) > 0.87:
                c.set(x, floor + 1, z, "minecraft:resin_bricks")
            if not pool and n(x + 71, z + 19, 2.4) > 0.93:
                c.set(x, floor + 1, z, "minecraft:open_eyeblossom")
            ceiling = 26 + int(n(x + 200, z + 200, 8.0) * 3)
            for y in range(ceiling, c.h):
                c.set(x, y, z, "minecraft:pale_oak_leaves")
            if n(x + 300, z + 300, 6.0) > 0.90:
                for y in range(floor + 1, ceiling):
                    c.set(x, y, z, "minecraft:pale_oak_log")
    return c


CHUNKS = {
    "pale_garden": ("Pale Garden", "Before. Closed eyeblossoms, pale oak, nothing wrong.",
                    chunk_pale_garden),
    "blight_scar": ("Blight Scar", "A kiln heart took root and the ground went with it.",
                    chunk_blight_scar),
    "hollow": ("The Creaking Hollow", "No sky. A canopy for a ceiling and gold on the floor.",
               chunk_hollow),
}


def collect_chunks() -> dict:
    out = {}
    for key, (label, blurb, fn) in CHUNKS.items():
        packed = fn().pack()
        packed["label"] = label
        packed["blurb"] = blurb
        out[key] = packed
        print(f"  {key}: {len(packed['blocks']) // 4} blocks")
    return out


# ---------------------------------------------------------------------------


def main() -> None:
    print("creatures:")
    models = collect_models()
    print("structures:")
    structures, unknown = collect_structures()
    print("chunks:")
    chunks = collect_chunks()

    if unknown:
        print("  ! no colour for: " + ", ".join(sorted(unknown)))

    payload = {
        "models": models,
        "structures": structures,
        "chunks": chunks,
        "colors": {k: v for k, v in COLORS.items() if v},
        "emissive": sorted(EMISSIVE),
    }

    with open(os.path.join(HERE, "viewer", "amberview.html")) as fh:
        template = fh.read()
    blob = json.dumps(payload, separators=(",", ":"))
    html = template.replace("/*__AMBERVIEW_DATA__*/null", blob)

    out = os.path.normpath(OUT)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w") as fh:
        fh.write(html)
    print(f"\n{out}: {len(html) / 1e6:.2f} MB")


if __name__ == "__main__":
    main()
