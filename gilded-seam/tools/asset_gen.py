"""Generates block/item textures, the mod icon, and all JSON assets/data.

Textures are procedural pixel art in the mod's palette: cold porcelain,
black crazing, kintsugi gold, cobalt accents. JSON is emitted for
blockstates, block/item models, 26.x item definitions, loot tables,
recipes, tags, damage types, advancements and the language file.
"""

import json
import math
import os
import random

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, ".."))
ASSETS = os.path.join(ROOT, "src", "main", "resources", "assets", "gildedseam")
DATA = os.path.join(ROOT, "src", "main", "resources", "data", "gildedseam")
MCDATA = os.path.join(ROOT, "src", "main", "resources", "data", "minecraft")

PORCELAIN = (244, 239, 230)
PORCELAIN_SHADE = (219, 211, 196)
CRACK = (62, 55, 48)
GOLD_DARK = (166, 116, 24)
GOLD = (222, 168, 62)
GOLD_BRIGHT = (247, 220, 138)
COBALT = (60, 91, 168)
CLAY = (94, 74, 62)
CLAY_DARK = (58, 45, 38)
EMBER = (255, 118, 42)
EMBER_BRIGHT = (255, 214, 110)

MOBS = ["shardling", "vessel", "porcelain_hound", "seamstress", "kilnborn",
        "chime", "font_of_gold", "manifold", "reliquary_colossus"]

EGG_ACCENTS = {
    "shardling": GOLD,
    "vessel": PORCELAIN_SHADE,
    "porcelain_hound": (200, 190, 175),
    "seamstress": COBALT,
    "kilnborn": EMBER,
    "chime": GOLD_BRIGHT,
    "font_of_gold": (255, 196, 84),
    "manifold": CRACK,
    "reliquary_colossus": (120, 82, 18),
}


def wjson(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as fh:
        json.dump(obj, fh, indent=2)
        fh.write("\n")


def save(img, *rel):
    path = os.path.join(ASSETS, "textures", *rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path)


def base16(color, shade, rng, speckle=0.10):
    img = Image.new("RGBA", (16, 16))
    px = img.load()
    for y in range(16):
        for x in range(16):
            c = color
            if rng.random() < speckle:
                c = shade
            t = y / 15.0
            c = tuple(max(0, min(255, int(v * (1.04 - 0.10 * t)))) for v in c)
            px[x, y] = (*c, 255)
    return img


def walk(img, rng, color, glint=None, steps=None):
    px = img.load()
    w, h = img.size
    vertical = rng.random() < 0.5
    x = rng.randint(1, w - 2) if vertical else 0
    y = 0 if vertical else rng.randint(1, h - 2)
    for _ in range(steps or (h if vertical else w)):
        if 0 <= x < w and 0 <= y < h:
            c = glint if (glint and rng.random() < 0.3) else color
            px[x, y] = (*c, 255)
        if vertical:
            y += 1
            x = max(0, min(w - 1, x + rng.choice((-1, 0, 0, 1))))
        else:
            x += 1
            y = max(0, min(h - 1, y + rng.choice((-1, 0, 0, 1))))


# --- block textures ---------------------------------------------------------

def gen_blocks():
    rng = random.Random(20260717)

    # Seamstone: glazed stone shot with gold.
    img = base16(PORCELAIN, PORCELAIN_SHADE, rng)
    for _ in range(3):
        walk(img, rng, (110, 100, 88))
    for _ in range(2):
        walk(img, rng, GOLD, GOLD_BRIGHT)
    save(img, "block", "seamstone.png")

    # Gilded vein: winding solder-threads over pale ground.
    img = base16(PORCELAIN_SHADE, (200, 190, 175), rng)
    for _ in range(5):
        walk(img, rng, GOLD, GOLD_BRIGHT)
    for _ in range(2):
        walk(img, rng, GOLD_DARK)
    save(img, "block", "gilded_vein.png")

    # Porcelain bloom: cup (petal ring) and gold stem tile.
    img = base16(PORCELAIN, PORCELAIN_SHADE, rng)
    draw = ImageDraw.Draw(img)
    for a in range(8):
        ang = a * math.pi / 4.0
        x = int(7.5 + math.cos(ang) * 5)
        y = int(7.5 + math.sin(ang) * 5)
        draw.point((x, y), fill=(*COBALT, 255))
        draw.point((x + 1, y), fill=(*COBALT, 255))
    draw.ellipse([6, 6, 9, 9], outline=(*GOLD, 255))
    draw.point((7, 7), fill=(*GOLD_BRIGHT, 255))
    draw.point((8, 8), fill=(*GOLD_DARK, 255))
    save(img, "block", "porcelain_bloom_cup.png")

    img = base16(GOLD, GOLD_DARK, rng, speckle=0.2)
    for _ in range(2):
        walk(img, rng, GOLD_BRIGHT)
    save(img, "block", "porcelain_bloom_stem.png")

    # Kiln heart: fired clay walls around a furnace mouth.
    def kiln(hot):
        img = base16(CLAY, CLAY_DARK, rng)
        for _ in range(4 if hot else 2):
            walk(img, rng, EMBER, EMBER_BRIGHT)
        draw = ImageDraw.Draw(img)
        mouth = EMBER_BRIGHT if hot else EMBER
        draw.rectangle([5, 6, 10, 11], fill=(*CLAY_DARK, 255))
        draw.rectangle([6, 7, 9, 10], fill=(*mouth, 255))
        draw.rectangle([7, 8, 8, 9], fill=(255, 246, 200, 255))
        return img

    save(kiln(False), "block", "kiln_heart_side.png")
    save(kiln(True), "block", "kiln_heart_side_hot.png")

    img = base16(CLAY_DARK, (40, 30, 26), rng)
    draw = ImageDraw.Draw(img)
    for r in (6, 4, 2):
        col = [GOLD_DARK, GOLD, GOLD_BRIGHT][(6 - r) // 2]
        draw.ellipse([7.5 - r, 7.5 - r, 7.5 + r, 7.5 + r], outline=(*col, 255))
    save(img, "block", "kiln_heart_top.png")

    img = base16(CLAY_DARK, (40, 30, 26), rng)
    save(img, "block", "kiln_heart_bottom.png")

    # Fired shell: overlapping kiln-ware plates.
    img = base16(PORCELAIN_SHADE, (200, 190, 175), rng)
    draw = ImageDraw.Draw(img)
    for row in range(4):
        y = row * 4
        off = 2 if row % 2 else 0
        for col in range(-1, 4):
            x = col * 5 + off
            draw.arc([x, y - 2, x + 6, y + 5], 0, 180, fill=(*CRACK, 255))
    for _ in range(2):
        walk(img, rng, GOLD, GOLD_BRIGHT)
    save(img, "block", "fired_shell.png")


# --- item textures ----------------------------------------------------------

def gen_items():
    rng = random.Random(9021)

    def blank():
        return Image.new("RGBA", (16, 16), (0, 0, 0, 0))

    # Porcelain shard: a broken triangle, gold along the fracture.
    img = blank()
    draw = ImageDraw.Draw(img)
    draw.polygon([(3, 13), (8, 2), (12, 13)], fill=(*PORCELAIN, 255), outline=(*PORCELAIN_SHADE, 255))
    for x, y in [(8, 3), (7, 5), (8, 7), (7, 9), (8, 11)]:
        img.putpixel((x, y), (*GOLD, 255))
    img.putpixel((8, 5), (*GOLD_BRIGHT, 255))
    img.putpixel((6, 12), (*CRACK, 255))
    save(img, "item", "porcelain_shard.png")

    # Gold thread: a wound spool.
    img = blank()
    draw = ImageDraw.Draw(img)
    draw.rectangle([5, 2, 10, 4], fill=(*CLAY, 255))
    draw.rectangle([5, 11, 10, 13], fill=(*CLAY, 255))
    for y in range(5, 11):
        color = GOLD_BRIGHT if y % 2 else GOLD
        draw.line([4, y, 11, y], fill=(*color, 255))
    draw.line([11, 6, 14, 9], fill=(*GOLD, 255))
    img.putpixel((14, 10), (*GOLD_BRIGHT, 255))
    save(img, "item", "gold_thread.png")

    # Kintsugi blade: porcelain edge, gold cracks, dark grip.
    img = blank()
    draw = ImageDraw.Draw(img)
    for i in range(9):
        x = 12 - i
        y = 2 + i
        draw.line([x - 1, y, x, y], fill=(*PORCELAIN, 255))
        if i % 3 == 1:
            img.putpixel((x - 1, y), (*GOLD, 255))
    draw.line([13, 2, 12, 3], fill=(*GOLD_BRIGHT, 255))
    draw.line([3, 10, 5, 12], fill=(*GOLD_DARK, 255))
    draw.line([2, 12, 3, 13], fill=(*CLAY_DARK, 255))
    draw.line([1, 13, 2, 14], fill=(*CLAY_DARK, 255))
    img.putpixel((4, 11), (*GOLD, 255))
    save(img, "item", "kintsugi_blade.png")

    # Rivening salt: a heap of biting crystals.
    img = blank()
    draw = ImageDraw.Draw(img)
    draw.polygon([(3, 13), (8, 8), (13, 13)], fill=(*PORCELAIN, 255))
    for x, y in [(5, 11), (8, 9), (10, 12), (7, 12)]:
        img.putpixel((x, y), (255, 255, 255, 255))
    for x, y in [(6, 13), (9, 11), (11, 13)]:
        img.putpixel((x, y), (*COBALT, 255))
    draw.point((8, 7), fill=(255, 255, 255, 255))
    save(img, "item", "rivening_salt.png")

    # Spawn eggs: porcelain eggs with accent spotting.
    for mob in MOBS:
        accent = EGG_ACCENTS[mob]
        img = blank()
        draw = ImageDraw.Draw(img)
        draw.ellipse([4, 2, 11, 13], fill=(*PORCELAIN, 255), outline=(*PORCELAIN_SHADE, 255))
        r = random.Random(hash(mob) & 0xFFFF)
        for _ in range(7):
            x = r.randint(5, 10)
            y = r.randint(3, 12)
            img.putpixel((x, y), (*accent, 255))
        img.putpixel((7, 6), (*GOLD, 255))
        img.putpixel((8, 9), (*GOLD_DARK, 255))
        save(img, "item", f"{mob}_spawn_egg.png")


def gen_icon():
    img = Image.new("RGBA", (128, 128), (24, 20, 18, 255))
    draw = ImageDraw.Draw(img)
    rng = random.Random(7)
    # The mask.
    draw.ellipse([28, 16, 100, 112], fill=(*PORCELAIN, 255))
    draw.ellipse([28, 16, 100, 112], outline=(*PORCELAIN_SHADE, 255), width=3)
    # Closed eyes.
    draw.arc([42, 52, 60, 64], 0, 180, fill=(*COBALT, 255), width=2)
    draw.arc([68, 52, 86, 64], 0, 180, fill=(*COBALT, 255), width=2)
    # Gold tears.
    for x in (51, 77):
        for y in range(66, 96, 3):
            draw.rectangle([x - 1, y, x, y + 1], fill=(*(GOLD if y % 2 else GOLD_BRIGHT), 255))
    # The great crack, mended.
    x, y = 64, 8
    while y < 122:
        draw.rectangle([x - 1, y, x + 1, y + 2], fill=(*GOLD, 255))
        if rng.random() < 0.3:
            draw.point((x + 2, y), fill=(*GOLD_BRIGHT, 255))
        x += rng.choice((-2, -1, 0, 1, 2))
        x = max(34, min(94, x))
        y += 3
    path = os.path.join(ASSETS, "icon.png")
    img.save(path)


# --- JSON: assets ------------------------------------------------------------

SIMPLE_BLOCKS = ["seamstone", "fired_shell"]
ITEMS_GENERATED = ["porcelain_shard", "gold_thread", "rivening_salt"]


def gen_asset_json():
    # Simple cube blocks.
    for name in SIMPLE_BLOCKS:
        wjson(os.path.join(ASSETS, "blockstates", f"{name}.json"),
              {"variants": {"": {"model": f"gildedseam:block/{name}"}}})
        wjson(os.path.join(ASSETS, "models", "block", f"{name}.json"),
              {"parent": "minecraft:block/cube_all",
               "textures": {"all": f"gildedseam:block/{name}"}})

    # Gilded vein: carpet-style mat.
    wjson(os.path.join(ASSETS, "blockstates", "gilded_vein.json"),
          {"variants": {"": {"model": "gildedseam:block/gilded_vein"}}})
    wjson(os.path.join(ASSETS, "models", "block", "gilded_vein.json"),
          {"parent": "minecraft:block/carpet",
           "textures": {"wool": "gildedseam:block/gilded_vein"}})

    # Porcelain bloom: solid fluted cup on a gold stem (no cutout needed).
    wjson(os.path.join(ASSETS, "blockstates", "porcelain_bloom.json"),
          {"variants": {"": {"model": "gildedseam:block/porcelain_bloom"}}})
    wjson(os.path.join(ASSETS, "models", "block", "porcelain_bloom.json"), {
        "parent": "minecraft:block/block",
        "textures": {
            "particle": "gildedseam:block/porcelain_bloom_cup",
            "cup": "gildedseam:block/porcelain_bloom_cup",
            "stem": "gildedseam:block/porcelain_bloom_stem",
        },
        "elements": [
            {"from": [7, 0, 7], "to": [9, 5, 9],
             "faces": {f: {"texture": "#stem"} for f in
                       ("north", "south", "east", "west", "up", "down")}},
            {"from": [4, 5, 4], "to": [12, 11, 12],
             "faces": {f: {"texture": "#cup"} for f in
                       ("north", "south", "east", "west", "up", "down")}},
        ],
    })

    # Kiln heart: cool model for ages 0-2, hot model for age 3.
    wjson(os.path.join(ASSETS, "blockstates", "kiln_heart.json"), {
        "variants": {
            "age=0": {"model": "gildedseam:block/kiln_heart"},
            "age=1": {"model": "gildedseam:block/kiln_heart"},
            "age=2": {"model": "gildedseam:block/kiln_heart"},
            "age=3": {"model": "gildedseam:block/kiln_heart_hot"},
        }
    })
    for suffix, side in (("", "kiln_heart_side"), ("_hot", "kiln_heart_side_hot")):
        wjson(os.path.join(ASSETS, "models", "block", f"kiln_heart{suffix}.json"), {
            "parent": "minecraft:block/cube_bottom_top",
            "textures": {
                "side": f"gildedseam:block/{side}",
                "top": "gildedseam:block/kiln_heart_top",
                "bottom": "gildedseam:block/kiln_heart_bottom",
            },
        })

    # Block items.
    for name in SIMPLE_BLOCKS + ["gilded_vein", "porcelain_bloom", "kiln_heart"]:
        wjson(os.path.join(ASSETS, "models", "item", f"{name}.json"),
              {"parent": f"gildedseam:block/{name}"})
        wjson(os.path.join(ASSETS, "items", f"{name}.json"),
              {"model": {"type": "minecraft:model", "model": f"gildedseam:item/{name}"}})

    # Plain items.
    for name in ITEMS_GENERATED:
        wjson(os.path.join(ASSETS, "models", "item", f"{name}.json"),
              {"parent": "minecraft:item/generated",
               "textures": {"layer0": f"gildedseam:item/{name}"}})
        wjson(os.path.join(ASSETS, "items", f"{name}.json"),
              {"model": {"type": "minecraft:model", "model": f"gildedseam:item/{name}"}})

    wjson(os.path.join(ASSETS, "models", "item", "kintsugi_blade.json"),
          {"parent": "minecraft:item/handheld",
           "textures": {"layer0": "gildedseam:item/kintsugi_blade"}})
    wjson(os.path.join(ASSETS, "items", "kintsugi_blade.json"),
          {"model": {"type": "minecraft:model", "model": "gildedseam:item/kintsugi_blade"}})

    for mob in MOBS:
        name = f"{mob}_spawn_egg"
        wjson(os.path.join(ASSETS, "models", "item", f"{name}.json"),
              {"parent": "minecraft:item/generated",
               "textures": {"layer0": f"gildedseam:item/{name}"}})
        wjson(os.path.join(ASSETS, "items", f"{name}.json"),
              {"model": {"type": "minecraft:model", "model": f"gildedseam:item/{name}"}})


def gen_lang():
    mob_names = {
        "shardling": "Shardling",
        "vessel": "Vessel",
        "porcelain_hound": "Porcelain Hound",
        "seamstress": "Seamstress",
        "kilnborn": "Kilnborn",
        "chime": "Chime",
        "font_of_gold": "Font of Gold",
        "manifold": "Manifold",
        "reliquary_colossus": "Reliquary Colossus",
    }
    lang = {
        "block.gildedseam.seamstone": "Seamstone",
        "block.gildedseam.gilded_vein": "Gilded Vein",
        "block.gildedseam.porcelain_bloom": "Porcelain Bloom",
        "block.gildedseam.kiln_heart": "Kiln Heart",
        "block.gildedseam.fired_shell": "Fired Shell",
        "item.gildedseam.porcelain_shard": "Porcelain Shard",
        "item.gildedseam.gold_thread": "Gold Thread",
        "item.gildedseam.kintsugi_blade": "Kintsugi Blade",
        "item.gildedseam.rivening_salt": "Rivening Salt",
        "effect.gildedseam.gilded": "Gilded",
        "death.attack.gildedseam.gilding": "%1$s was mended shut",
        "death.attack.gildedseam.gilding.player": "%1$s was mended shut while fighting %2$s",
        "death.attack.gildedseam.reliquary_slam": "%1$s was flattened beneath praying hands",
        "death.attack.gildedseam.reliquary_slam.player": "%1$s was flattened beneath praying hands while fighting %2$s",
        "advancements.gildedseam.root.title": "The Gilded Seam",
        "advancements.gildedseam.root.description": "Pick up a shard of something that used to be alive",
        "advancements.gildedseam.gilded.title": "Kintsugi",
        "advancements.gildedseam.gilded.description": "Feel the golden thread start stitching you shut",
        "advancements.gildedseam.shatter_the_cathedral.title": "Shatter the Cathedral",
        "advancements.gildedseam.shatter_the_cathedral.description": "Break the Reliquary Colossus back into honest pieces",
    }
    for mob, display in mob_names.items():
        lang[f"entity.gildedseam.{mob}"] = display
        lang[f"item.gildedseam.{mob}_spawn_egg"] = f"{display} Spawn Egg"
    wjson(os.path.join(ASSETS, "lang", "en_us.json"), dict(sorted(lang.items())))


# --- JSON: data -------------------------------------------------------------

def item_pool(name, count_min, count_max, looting_extra=0):
    entry = {"type": "minecraft:item", "name": name}
    functions = [{
        "function": "minecraft:set_count",
        "count": {"type": "minecraft:uniform", "min": float(count_min), "max": float(count_max)},
    }]
    if looting_extra:
        functions.append({
            "function": "minecraft:enchanted_count_increase",
            "enchantment": "minecraft:looting",
            "count": {"type": "minecraft:uniform", "min": 0.0, "max": float(looting_extra)},
        })
    entry["functions"] = functions
    return {"rolls": 1.0, "entries": [entry]}


def gen_data_json():
    # Block loot.
    def self_drop(name):
        return {
            "type": "minecraft:block",
            "pools": [{
                "rolls": 1.0,
                "entries": [{"type": "minecraft:item", "name": f"gildedseam:{name}"}],
                "conditions": [{"condition": "minecraft:survives_explosion"}],
            }],
        }

    wjson(os.path.join(DATA, "loot_table", "blocks", "seamstone.json"), self_drop("seamstone"))
    wjson(os.path.join(DATA, "loot_table", "blocks", "fired_shell.json"), self_drop("fired_shell"))
    wjson(os.path.join(DATA, "loot_table", "blocks", "gilded_vein.json"), {
        "type": "minecraft:block",
        "pools": [item_pool("gildedseam:gold_thread", 0, 1)],
    })
    wjson(os.path.join(DATA, "loot_table", "blocks", "porcelain_bloom.json"), {
        "type": "minecraft:block",
        "pools": [item_pool("gildedseam:porcelain_shard", 0, 2)],
    })
    wjson(os.path.join(DATA, "loot_table", "blocks", "kiln_heart.json"), {
        "type": "minecraft:block",
        "pools": [item_pool("gildedseam:gold_thread", 2, 4),
                  item_pool("gildedseam:porcelain_shard", 2, 5)],
    })

    # Entity loot.
    entity_loot = {
        "shardling": [item_pool("gildedseam:porcelain_shard", 0, 2, 1)],
        "vessel": [item_pool("gildedseam:porcelain_shard", 1, 3, 1),
                   item_pool("gildedseam:gold_thread", 0, 1, 1)],
        "porcelain_hound": [item_pool("gildedseam:porcelain_shard", 1, 2, 1)],
        "seamstress": [item_pool("gildedseam:gold_thread", 1, 3, 1),
                       item_pool("gildedseam:porcelain_shard", 0, 2, 1)],
        "kilnborn": [item_pool("gildedseam:porcelain_shard", 2, 4, 2),
                     item_pool("gildedseam:gold_thread", 1, 2, 1)],
        "chime": [item_pool("gildedseam:gold_thread", 1, 2, 1),
                  item_pool("minecraft:amethyst_shard", 0, 1, 1)],
        "font_of_gold": [item_pool("gildedseam:gold_thread", 2, 4, 2),
                         item_pool("minecraft:gold_nugget", 2, 6, 3)],
        "manifold": [item_pool("gildedseam:porcelain_shard", 3, 6, 2),
                     item_pool("gildedseam:gold_thread", 1, 3, 1)],
        "reliquary_colossus": [
            {"rolls": 1.0, "entries": [{"type": "minecraft:item", "name": "gildedseam:kiln_heart"}]},
            item_pool("gildedseam:gold_thread", 4, 8),
            item_pool("minecraft:gold_ingot", 3, 6, 3),
            item_pool("gildedseam:porcelain_shard", 6, 12),
        ],
    }
    for mob, pools in entity_loot.items():
        wjson(os.path.join(DATA, "loot_table", "entities", f"{mob}.json"),
              {"type": "minecraft:entity", "pools": pools})

    # Recipes.
    wjson(os.path.join(DATA, "recipe", "kintsugi_blade.json"), {
        "type": "minecraft:crafting_shaped",
        "category": "equipment",
        "pattern": [" S ", " S ", " T "],
        "key": {"S": "gildedseam:porcelain_shard", "T": "gildedseam:gold_thread"},
        "result": {"id": "gildedseam:kintsugi_blade", "count": 1},
    })
    wjson(os.path.join(DATA, "recipe", "rivening_salt.json"), {
        "type": "minecraft:crafting_shapeless",
        "category": "misc",
        "ingredients": ["minecraft:bone_meal", "minecraft:sugar", "minecraft:amethyst_shard"],
        "result": {"id": "gildedseam:rivening_salt", "count": 2},
    })
    wjson(os.path.join(DATA, "recipe", "fired_shell.json"), {
        "type": "minecraft:crafting_shaped",
        "category": "building",
        "pattern": ["SS", "SS"],
        "key": {"S": "gildedseam:porcelain_shard"},
        "result": {"id": "gildedseam:fired_shell", "count": 1},
    })

    # Tags.
    wjson(os.path.join(DATA, "tags", "item", "kintsugi_repair.json"),
          {"replace": False, "values": ["gildedseam:porcelain_shard"]})
    wjson(os.path.join(MCDATA, "tags", "block", "mineable", "pickaxe.json"),
          {"replace": False, "values": ["gildedseam:seamstone", "gildedseam:kiln_heart",
                                        "gildedseam:fired_shell"]})
    wjson(os.path.join(MCDATA, "tags", "damage_type", "bypasses_armor.json"),
          {"replace": False, "values": ["gildedseam:gilding"]})

    # Damage types.
    wjson(os.path.join(DATA, "damage_type", "gilding.json"),
          {"message_id": "gildedseam.gilding", "scaling": "when_caused_by_living_non_player",
           "exhaustion": 0.0})
    wjson(os.path.join(DATA, "damage_type", "reliquary_slam.json"),
          {"message_id": "gildedseam.reliquary_slam", "scaling": "when_caused_by_living_non_player",
           "exhaustion": 0.1})

    # Advancements.
    wjson(os.path.join(DATA, "advancement", "root.json"), {
        "display": {
            "icon": {"id": "gildedseam:porcelain_shard"},
            "title": {"translate": "advancements.gildedseam.root.title"},
            "description": {"translate": "advancements.gildedseam.root.description"},
            "background": "minecraft:gui/advancements/backgrounds/stone",
            "frame": "task", "show_toast": True, "announce_to_chat": False, "hidden": False,
        },
        "criteria": {"got_shard": {
            "trigger": "minecraft:inventory_changed",
            "conditions": {"items": [{"items": ["gildedseam:porcelain_shard"]}]},
        }},
    })
    wjson(os.path.join(DATA, "advancement", "gilded.json"), {
        "parent": "gildedseam:root",
        "display": {
            "icon": {"id": "gildedseam:gold_thread"},
            "title": {"translate": "advancements.gildedseam.gilded.title"},
            "description": {"translate": "advancements.gildedseam.gilded.description"},
            "frame": "task", "show_toast": True, "announce_to_chat": True, "hidden": False,
        },
        "criteria": {"got_gilded": {
            "trigger": "minecraft:effects_changed",
            "conditions": {"effects": {"gildedseam:gilded": {}}},
        }},
    })
    wjson(os.path.join(DATA, "advancement", "shatter_the_cathedral.json"), {
        "parent": "gildedseam:gilded",
        "display": {
            "icon": {"id": "gildedseam:kintsugi_blade"},
            "title": {"translate": "advancements.gildedseam.shatter_the_cathedral.title"},
            "description": {"translate": "advancements.gildedseam.shatter_the_cathedral.description"},
            "frame": "challenge", "show_toast": True, "announce_to_chat": True, "hidden": False,
        },
        "criteria": {"killed_colossus": {
            "trigger": "minecraft:player_killed_entity",
            "conditions": {"entity": {"type": "gildedseam:reliquary_colossus"}},
        }},
    })


def main():
    gen_blocks()
    gen_items()
    gen_icon()
    gen_asset_json()
    gen_lang()
    gen_data_json()
    print("assets generated.")


if __name__ == "__main__":
    main()
