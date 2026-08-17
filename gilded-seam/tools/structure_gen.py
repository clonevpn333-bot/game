"""Generates the Gilded Palace and Hollow City structure templates (.nbt).

Writes vanilla structure-template NBT directly (gzipped), so the palace of
the Overlord King and the Seam-taken city are built here, block by block,
without opening the game. Both are wired into worldgen by the JSON files in
data/gildedseam/worldgen/.
"""

import gzip
import io
import os
import struct

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
OUT = os.path.join(ROOT, "src", "main", "resources", "data", "gildedseam", "structure")

# Any reasonably-recent DataVersion works: the game's DataFixerUpper
# migrates templates forward on load. 3953 = 1.21.
DATA_VERSION = 3953

# ---------------------------------------------------------------------------
# Minimal NBT writer
# ---------------------------------------------------------------------------


def _str(buf, s):
    data = s.encode("utf-8")
    buf.write(struct.pack(">H", len(data)))
    buf.write(data)


def _payload(buf, value):
    if isinstance(value, bool):
        buf.write(struct.pack(">b", 1 if value else 0))
    elif isinstance(value, int):
        buf.write(struct.pack(">i", value))
    elif isinstance(value, float):
        buf.write(struct.pack(">d", value))
    elif isinstance(value, str):
        _str(buf, value)
    elif isinstance(value, dict):
        for key, item in value.items():
            buf.write(struct.pack(">b", _tag_id(item)))
            _str(buf, key)
            _payload(buf, item)
        buf.write(b"\x00")
    elif isinstance(value, list):
        item_id = _tag_id(value[0]) if value else 1
        buf.write(struct.pack(">bi", item_id, len(value)))
        for item in value:
            _payload(buf, item)
    else:
        raise TypeError(f"unsupported NBT value: {value!r}")


def _tag_id(value):
    if isinstance(value, bool):
        return 1
    if isinstance(value, int):
        return 3
    if isinstance(value, float):
        return 6
    if isinstance(value, str):
        return 8
    if isinstance(value, list):
        return 9
    if isinstance(value, dict):
        return 10
    raise TypeError(f"unsupported NBT value: {value!r}")


def write_nbt(path, compound):
    buf = io.BytesIO()
    buf.write(b"\x0a")  # root compound
    _str(buf, "")
    _payload(buf, compound)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with gzip.open(path, "wb") as fh:
        fh.write(buf.getvalue())


# ---------------------------------------------------------------------------
# Template builder
# ---------------------------------------------------------------------------


class Template:
    def __init__(self, sx, sy, sz):
        self.size = (sx, sy, sz)
        self.palette = []
        self.palette_index = {}
        self.blocks = {}
        self.entities = []

    def state(self, name, props=None):
        key = (name, tuple(sorted((props or {}).items())))
        if key not in self.palette_index:
            entry = {"Name": name}
            if props:
                entry["Properties"] = {k: str(v) for k, v in props.items()}
            self.palette_index[key] = len(self.palette)
            self.palette.append(entry)
        return self.palette_index[key]

    def set(self, x, y, z, name, props=None, nbt=None):
        block = {"pos": [x, y, z], "state": self.state(name, props)}
        if nbt:
            block["nbt"] = nbt
        self.blocks[(x, y, z)] = block

    def fill(self, x0, y0, z0, x1, y1, z1, name, props=None):
        for x in range(x0, x1 + 1):
            for y in range(y0, y1 + 1):
                for z in range(z0, z1 + 1):
                    self.set(x, y, z, name, props)

    def entity(self, x, y, z, entity_id, extra=None):
        nbt = {"id": entity_id}
        if extra:
            nbt.update(extra)
        self.entities.append({
            "pos": [float(x), float(y), float(z)],
            "blockPos": [int(x), int(y), int(z)],
            "nbt": nbt,
        })

    def save(self, name):
        write_nbt(os.path.join(OUT, f"{name}.nbt"), {
            "size": list(self.size),
            "palette": self.palette,
            "blocks": list(self.blocks.values()),
            "entities": self.entities,
            "DataVersion": DATA_VERSION,
        })
        print(f"{name}: {len(self.blocks)} blocks, {len(self.entities)} entities, size {self.size}")


SEAMSTONE = "gildedseam:seamstone"
FIRED = "gildedseam:fired_shell"
VEIN = "gildedseam:gilded_vein"
BLOOM = "gildedseam:porcelain_bloom"
KILN = "gildedseam:kiln_heart"
QUARTZ = "minecraft:quartz_block"
PILLAR = "minecraft:quartz_pillar"
CHISELED = "minecraft:chiseled_quartz_block"
GOLD = "minecraft:gold_block"
STAIRS = "minecraft:quartz_stairs"
CHEST = "minecraft:chest"


# ---------------------------------------------------------------------------
# The Gilded Palace — throne hall of the Porcelain Autarch. The cure lies
# in the reliquary chests beside the throne.
# ---------------------------------------------------------------------------


def build_palace():
    W, H, L = 33, 19, 33
    t = Template(W, H, L)
    cx = W // 2

    # Foundation and floor: seamstone slab with a quartz checker nave.
    t.fill(0, 0, 0, W - 1, 0, L - 1, SEAMSTONE)
    for x in range(2, W - 2):
        for z in range(2, L - 2):
            t.set(x, 1, z, QUARTZ if (x + z) % 2 == 0 else SEAMSTONE)
    # Gold carpet up the nave.
    for z in range(2, L - 4):
        t.set(cx, 1, z, GOLD)

    # Colonnade walls: fired-shell parapet with quartz pillars.
    for x in range(1, W - 1):
        for z in (1, L - 2):
            t.fill(x, 1, z, x, 3, z, FIRED)
    for z in range(1, L - 1):
        for x in (1, W - 2):
            t.fill(x, 1, z, x, 3, z, FIRED)
    for x in range(1, W - 1, 4):
        for z in (1, L - 2):
            t.fill(x, 1, z, x, 8, z, PILLAR, {"axis": "y"})
            t.set(x, 9, z, CHISELED)
    for z in range(1, L - 1, 4):
        for x in (1, W - 2):
            t.fill(x, 1, z, x, 8, z, PILLAR, {"axis": "y"})
            t.set(x, 9, z, CHISELED)

    # Gold cornice ring at pillar height.
    for x in range(1, W - 1):
        for z in (1, L - 2):
            t.set(x, 10, z, GOLD)
    for z in range(1, L - 1):
        for x in (1, W - 2):
            t.set(x, 10, z, GOLD)

    # Grand doorway (south face, low z).
    t.fill(cx - 2, 1, 1, cx + 2, 5, 1, "minecraft:air")

    # Throne dais at the north end.
    for step, y in ((4, 2), (3, 3), (2, 4)):
        t.fill(cx - step, y, L - 4 - step, cx + step, y, L - 4 + 1, SEAMSTONE)
    t.fill(cx - 2, 5, L - 5, cx + 2, 5, L - 4, QUARTZ)
    t.fill(cx - 2, 6, L - 4, cx + 2, 9, L - 4, FIRED)      # throne back
    t.fill(cx - 1, 6, L - 4, cx + 1, 8, L - 4, GOLD)

    # The King, enthroned.
    t.entity(cx + 0.5, 6.0, L - 6 + 0.5, "gildedseam:porcelain_autarch")

    # The reliquary: the cure, kept in reach of the throne.
    for dx in (-4, 4):
        t.set(cx + dx, 5, L - 5, CHEST,
              {"facing": "south"},
              {"id": "minecraft:chest", "LootTable": "gildedseam:chests/palace_reliquary"})
        t.set(cx + dx, 4, L - 5, GOLD)

    # Kiln hearts in the four corners of the hall, veins bleeding inward.
    for x, z in ((3, 3), (W - 4, 3), (3, L - 4), (W - 4, L - 4)):
        t.set(x, 2, z, KILN, {"age": "3"})
        t.set(x + 1, 2, z, VEIN)
        t.set(x, 2, z + 1, VEIN)
    for x, z in ((8, 6), (W - 9, 8), (10, L - 7), (W - 7, L - 11), (6, 16), (W - 5, 18)):
        t.set(x, 2, z, VEIN)
    for x, z in ((5, 9), (W - 6, 12), (12, L - 6)):
        t.set(x, 2, z, BLOOM)

    # Courtiers.
    t.entity(cx - 6.5, 2.0, 10.5, "gildedseam:seamstress")
    t.entity(cx + 6.5, 2.0, 14.5, "gildedseam:kilnborn")
    t.entity(cx - 3.5, 2.0, 20.5, "gildedseam:vessel")
    t.entity(cx + 4.5, 2.0, 6.5, "gildedseam:vessel")

    t.save("gilded_palace")


# ---------------------------------------------------------------------------
# The Hollow City — a town the Seam finished with. Ruined fired-shell
# houses around a plaza, a Font of Gold in the fountain, and the last two
# Salt-Sworn holding the gate.
# ---------------------------------------------------------------------------


def build_city():
    W, H, L = 41, 13, 41
    t = Template(W, H, L)

    # Streets: a seamstone cross with vein cracks.
    t.fill(0, 0, 0, W - 1, 0, L - 1, SEAMSTONE)
    for x in range(17, 24):
        t.fill(x, 1, 0, x, 1, L - 1, SEAMSTONE)
    for z in range(17, 24):
        t.fill(0, 1, z, W - 1, 1, z, SEAMSTONE)
    for x, z in ((19, 3), (21, 9), (18, 30), (22, 36), (4, 20), (11, 22), (30, 18), (36, 21),
                 (20, 15), (16, 25)):
        t.set(x, 2, z, VEIN)

    def ruined_house(x0, z0, w, l, h, doorway_x):
        t.fill(x0, 1, z0, x0 + w - 1, 1, z0 + l - 1, FIRED)
        for y in range(2, 2 + h):
            for x in range(x0, x0 + w):
                for z in (z0, z0 + l - 1):
                    # Ruin: walls crumble toward the top.
                    if (x * 7 + z * 13 + y * 5) % (3 + y) != 0:
                        t.set(x, y, z, FIRED)
            for z in range(z0, z0 + l):
                for x in (x0, x0 + w - 1):
                    if (x * 11 + z * 3 + y * 7) % (3 + y) != 0:
                        t.set(x, y, z, FIRED)
        # Doorway.
        t.fill(doorway_x, 2, z0, doorway_x + 1, 3, z0, "minecraft:air")

    ruined_house(3, 3, 11, 10, 5, 7)
    ruined_house(27, 4, 10, 9, 4, 31)
    ruined_house(4, 28, 10, 10, 5, 8)
    ruined_house(28, 27, 9, 11, 4, 31)

    # The old market hall: half-collapsed colonnade.
    for x in range(6, 12, 2):
        t.fill(x, 1, 15, x, 5, 15, PILLAR, {"axis": "y"})
    t.fill(6, 6, 15, 11, 6, 15, QUARTZ)

    # Plaza fountain, now a font in the literal sense.
    t.fill(18, 1, 18, 22, 1, 22, QUARTZ)
    t.fill(18, 2, 18, 22, 2, 18, FIRED)
    t.fill(18, 2, 22, 22, 2, 22, FIRED)
    t.fill(18, 2, 19, 18, 2, 21, FIRED)
    t.fill(22, 2, 19, 22, 2, 21, FIRED)
    t.set(20, 2, 20, GOLD)
    t.entity(20.5, 3.0, 20.5, "gildedseam:font_of_gold")

    # Kiln cellar under one house.
    t.set(8, 1, 7, KILN, {"age": "2"})
    for x, z in ((7, 7), (9, 7), (8, 6)):
        t.set(x, 1, z, VEIN)
    for x, z in ((30, 8), (7, 32), (33, 30)):
        t.set(x, 2, z, BLOOM)

    # City loot: what the citizens were carrying when the gold found them.
    t.set(31, 2, 9, CHEST, {"facing": "west"},
          {"id": "minecraft:chest", "LootTable": "gildedseam:chests/hollow_city"})
    t.set(6, 2, 31, CHEST, {"facing": "east"},
          {"id": "minecraft:chest", "LootTable": "gildedseam:chests/hollow_city"})

    # The claimed and the last defenders.
    t.entity(12.5, 2.0, 20.5, "gildedseam:vessel")
    t.entity(25.5, 2.0, 19.5, "gildedseam:vessel")
    t.entity(20.5, 2.0, 28.5, "gildedseam:porcelain_hound")
    t.entity(9.5, 2.0, 9.5, "gildedseam:shardling")
    t.entity(19.5, 2.0, 4.5, "gildedseam:salt_sworn")
    t.entity(21.5, 2.0, 37.5, "gildedseam:salt_sworn")

    t.save("hollow_city")


# ---------------------------------------------------------------------------
# The Refuge Hamlet — where the scared people went. Three intact cottages,
# a well, a lamplighter on watch, and one prophet nobody invited.
# ---------------------------------------------------------------------------

PLANKS = "minecraft:spruce_planks"
LOG = "minecraft:spruce_log"
COBBLE = "minecraft:cobblestone"
LANTERN = "minecraft:lantern"


def build_hamlet():
    W, H, L = 33, 10, 33
    t = Template(W, H, L)
    t.fill(0, 0, 0, W - 1, 0, L - 1, "minecraft:coarse_dirt")

    def cottage(x0, z0, w, l, door_dx):
        t.fill(x0, 0, z0, x0 + w - 1, 0, z0 + l - 1, COBBLE)
        for y in (1, 2, 3):
            for x in range(x0, x0 + w):
                t.set(x, y, z0, PLANKS)
                t.set(x, y, z0 + l - 1, PLANKS)
            for z in range(z0, z0 + l):
                t.set(x0, y, z, PLANKS)
                t.set(x0 + w - 1, y, z, PLANKS)
        for x, z in ((x0, z0), (x0 + w - 1, z0), (x0, z0 + l - 1), (x0 + w - 1, z0 + l - 1)):
            t.fill(x, 1, z, x, 3, z, LOG, {"axis": "y"})
        t.fill(x0, 4, z0, x0 + w - 1, 4, z0 + l - 1, PLANKS)
        t.fill(x0 + 1, 4, z0 + 1, x0 + w - 2, 4, z0 + l - 2, PLANKS)
        # Doorway and a window.
        t.fill(x0 + door_dx, 1, z0, x0 + door_dx, 2, z0, "minecraft:air")
        t.set(x0 + 2, 2, z0 + l - 1, "minecraft:glass")
        t.set(x0 + w - 2, 1, z0 + 2, LANTERN, {"hanging": "false"})

    cottage(3, 4, 8, 7, 3)
    cottage(21, 5, 9, 8, 4)
    cottage(11, 21, 9, 8, 4)

    # The well.
    t.fill(15, 1, 12, 18, 1, 15, COBBLE)
    t.fill(16, 0, 13, 17, 1, 14, "minecraft:water")
    for x, z in ((15, 12), (18, 12), (15, 15), (18, 15)):
        t.fill(x, 1, z, x, 3, z, "minecraft:cobblestone_wall")
    t.fill(15, 4, 12, 18, 4, 15, PLANKS)

    # The people.
    t.entity(6.5, 1.0, 7.5, "gildedseam:refugee")
    t.entity(24.5, 1.0, 8.5, "gildedseam:refugee")
    t.entity(14.5, 1.0, 24.5, "gildedseam:refugee")
    t.entity(19.5, 1.0, 18.5, "gildedseam:refugee")
    t.entity(10.5, 1.0, 16.5, "gildedseam:salt_sworn")
    t.entity(27.5, 1.0, 27.5, "gildedseam:gilt_mad")

    # A shared pantry.
    t.set(5, 1, 5, CHEST, {"facing": "south"},
          {"id": "minecraft:chest", "LootTable": "gildedseam:chests/hollow_city"})

    t.save("refuge_hamlet")




# ---------------------------------------------------------------------------
# THE MOTHER — where the blight came from.
#
# A colossal pale oak grown over something it should not have grown over.
# The trunk is hollow; inside, at the bottom of a root-cage, sits the World
# Core: a knot of kiln-hearts and poured resin that is still pumping. This is
# the structure the whole infection is downstream of, and the only place the
# Rivening can be finished for good.
# ---------------------------------------------------------------------------

PALE_LOG = "minecraft:pale_oak_log"
PALE_WOOD = "minecraft:pale_oak_wood"
PALE_LEAVES = "minecraft:pale_oak_leaves"
RESIN = "minecraft:resin_block"
RESIN_BRICK = "minecraft:resin_bricks"
CREAK = "minecraft:creaking_heart"
EYE_OPEN = "minecraft:open_eyeblossom"


def build_mother_tree():
    import math as _m
    W, H, L = 49, 72, 49
    t = Template(W, H, L)
    cx = cz = W // 2

    def disc(y, r, name, props=None, hollow=0):
        rr = r * r
        hr = hollow * hollow
        for x in range(W):
            for z in range(L):
                d = (x - cx) ** 2 + (z - cz) ** 2
                if d <= rr and d >= hr:
                    t.set(x, y, z, name, props)

    # --- buttress roots crawling out across the ground -------------------
    for i in range(10):
        a = (2 * _m.pi * i) / 10
        for step in range(4, 23):
            x = int(round(cx + _m.sin(a) * step))
            z = int(round(cz + _m.cos(a) * step))
            if not (0 <= x < W and 0 <= z < L):
                continue
            h = max(0, 5 - step // 4)
            for y in range(h + 1):
                t.set(x, y, z, PALE_LOG if step % 3 else RESIN)
            if step % 5 == 0:
                t.set(x, h + 1, z, EYE_OPEN)

    # --- the trunk: hollow, tapering, resin-veined ------------------------
    for y in range(0, 46):
        r = 8 - y // 9
        disc(y, r, PALE_LOG, {"axis": "y"}, hollow=max(0, r - 2))
        # Resin bleeding down the outside of the bark.
        if y % 3 == 0:
            for i in range(6):
                a = (2 * _m.pi * i) / 6 + y * 0.15
                x = int(round(cx + _m.sin(a) * r))
                z = int(round(cz + _m.cos(a) * r))
                if 0 <= x < W and 0 <= z < L:
                    t.set(x, y, z, RESIN)
        # Creaking hearts set into the wood, still beating.
        if y in (12, 21, 30, 38):
            t.set(cx + r - 1, y, cz, CREAK, {"active": "true", "natural": "true"})

    # --- the hollow: a root cage around the core -------------------------
    for y in range(1, 14):
        disc(y, 6, "minecraft:air", hollow=0)
    for i in range(12):
        a = (2 * _m.pi * i) / 12
        for y in range(1, 14):
            wobble = _m.sin(y * 0.4 + i) * 1.2
            x = int(round(cx + _m.sin(a) * (5 + wobble)))
            z = int(round(cz + _m.cos(a) * (5 + wobble)))
            if 0 <= x < W and 0 <= z < L:
                t.set(x, y, z, PALE_LOG if y % 4 else RESIN)

    # --- the World Core ---------------------------------------------------
    t.fill(cx - 2, 1, cz - 2, cx + 2, 5, cz + 2, RESIN)
    t.fill(cx - 1, 2, cz - 1, cx + 1, 4, cz + 1, KILN)
    t.set(cx, 3, cz, KILN)
    for dx, dz in ((-3, 0), (3, 0), (0, -3), (0, 3)):
        t.set(cx + dx, 1, cz + dz, BLOOM)
        t.fill(cx + dx, 0, cz + dz, cx + dx, 0, cz + dz, SEAMSTONE)
    for x in range(cx - 6, cx + 7):
        for z in range(cz - 6, cz + 7):
            if (x - cx) ** 2 + (z - cz) ** 2 <= 36:
                t.set(x, 0, z, SEAMSTONE)
                if (x + z) % 4 == 0:
                    t.set(x, 1, z, VEIN)

    # The reliquary: what you came for.
    t.set(cx - 5, 1, cz, CHEST, {"facing": "east"},
          {"id": "minecraft:chest", "LootTable": "gildedseam:chests/palace_reliquary"})
    t.set(cx + 5, 1, cz, CHEST, {"facing": "west"},
          {"id": "minecraft:chest", "LootTable": "gildedseam:chests/palace_reliquary"})

    # --- canopy -----------------------------------------------------------
    for y in range(44, 66):
        t_ = (y - 44) / 21.0
        r = int(round(20 * _m.sin(_m.pi * (0.18 + 0.82 * t_)) * (1.0 - 0.25 * t_)))
        if r < 2:
            continue
        rr, inner = r * r, (r - 3) ** 2
        for x in range(W):
            for z in range(L):
                d = (x - cx) ** 2 + (z - cz) ** 2
                if inner <= d <= rr and (x + y + z) % 3 != 0:
                    t.set(x, y, z, PALE_LEAVES, {"persistent": "true"})
    # Boughs reaching out of the canopy, dripping.
    for i in range(8):
        a = (2 * _m.pi * i) / 8
        for step in range(3, 17):
            x = int(round(cx + _m.sin(a) * step))
            z = int(round(cz + _m.cos(a) * step))
            y = 46 + step // 3
            if 0 <= x < W and 0 <= z < L and y < H:
                t.set(x, y, z, PALE_WOOD)
                if step % 4 == 0:
                    for dy in range(1, 4):
                        if y - dy > 0:
                            t.set(x, y - dy, z, RESIN)

    # --- the congregation --------------------------------------------------
    t.entity(cx, 6.0, cz, "gildedseam:reliquary_colossus")
    for i, eid in enumerate(("gildedseam:manifold", "gildedseam:seamstress",
                             "gildedseam:kilnborn", "gildedseam:font_of_gold")):
        a = (2 * _m.pi * i) / 4
        t.entity(cx + _m.sin(a) * 4, 2.0, cz + _m.cos(a) * 4, eid)
    for i in range(8):
        a = (2 * _m.pi * i) / 8 + 0.4
        t.entity(cx + _m.sin(a) * 14, 6.0, cz + _m.cos(a) * 14, "gildedseam:shardling")
    for i, eid in enumerate(("gildedseam:gilded_cow", "gildedseam:gilded_pig",
                             "gildedseam:gilded_sheep", "gildedseam:half_sewn")):
        a = (2 * _m.pi * i) / 4 + 0.8
        t.entity(cx + _m.sin(a) * 18, 6.0, cz + _m.cos(a) * 18, eid)

    t.save("mother_tree")


if __name__ == "__main__":
    build_palace()
    build_city()
    build_hamlet()
    build_mother_tree()
