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
    """The Mother Tree - grown, not extruded.

    The first version of this was a cylinder with a lens of leaves balanced on
    top, which reads as a mushroom from every angle. A tree does not do that.
    It flares into the ground on buttress roots, its trunk tapers on a curve
    rather than a straight line, and its crown is not one blob - it is the sum
    of where the limbs ended. So this builds limbs first and hangs the canopy
    off their tips.
    """
    import math as _m
    W, H, L = 49, 84, 49
    t = Template(W, H, L)
    cx = cz = W // 2

    def blob(x, y, z, r, name, props=None, jitter=0):
        """A rough sphere - the unit every woody thing here is drawn with."""
        ri = int(_m.ceil(r))
        rr = r * r
        for dx in range(-ri, ri + 1):
            for dy in range(-ri, ri + 1):
                for dz in range(-ri, ri + 1):
                    d = dx * dx + dy * dy + dz * dz
                    if d > rr:
                        continue
                    if jitter and d > rr * 0.55 and (dx * 7 + dy * 13 + dz * 5) % 4 == 0:
                        continue
                    px, py, pz = x + dx, y + dy, z + dz
                    if 0 <= px < W and 0 <= py < H and 0 <= pz < L:
                        t.set(px, py, pz, name, props)

    def limb(x, y, z, yaw, pitch, length, r0, r1, mat, props=None,
             droop=0.0, steps=None):
        """Draws a tapering limb along an arc and returns where it ended.

        `droop` bends the limb over its length - positive sags, negative
        reaches for the sky. Branches that travel in a straight line are the
        other half of why the old tree looked manufactured.
        """
        steps = steps or int(length * 2)
        for i in range(steps + 1):
            f = i / steps
            p = pitch + droop * f * f
            d = length * f
            px = x + _m.sin(yaw) * _m.cos(p) * d
            py = y + _m.sin(p) * d
            pz = z + _m.cos(yaw) * _m.cos(p) * d
            blob(int(round(px)), int(round(py)), int(round(pz)),
                 r0 + (r1 - r0) * f, mat, props)
        f = 1.0
        p = pitch + droop
        return (x + _m.sin(yaw) * _m.cos(p) * length,
                y + _m.sin(p) * length,
                z + _m.cos(yaw) * _m.cos(p) * length)

    # --- buttress roots ---------------------------------------------------
    # Tall flared arches that carry the trunk into the ground, with daylight
    # under them. This is the silhouette that says "old tree" before you have
    # even looked up.
    for i in range(9):
        a = (2 * _m.pi * i) / 9 + 0.18
        limb(cx + _m.sin(a) * 3, 15, cz + _m.cos(a) * 3, a, -0.62,
             21.0, 3.4, 1.0, PALE_LOG, droop=-0.5)
        # Surface roots crawling on out past the arch.
        ex = cx + _m.sin(a) * 20
        ez = cz + _m.cos(a) * 20
        limb(ex, 1, ez, a + 0.30, -0.06, 7.0, 1.5, 0.7, RESIN)
        limb(ex, 1, ez, a - 0.34, -0.05, 6.0, 1.4, 0.7, PALE_LOG)
        for k in range(3):
            rx = int(round(cx + _m.sin(a + k * 0.2) * (11 + k * 5)))
            rz = int(round(cz + _m.cos(a + k * 0.2) * (11 + k * 5)))
            if 0 <= rx < W and 0 <= rz < L:
                t.set(rx, 1, rz, EYE_OPEN)

    # --- trunk ------------------------------------------------------------
    # Concave taper: fat and flaring for the first ten blocks, then settling.
    for y in range(0, 52):
        f = y / 51.0
        r = 12.5 * (1.0 - f) ** 1.9 + 4.2
        ri = int(_m.ceil(r))
        rr, hr = r * r, max(0.0, r - 2.6) ** 2
        for dx in range(-ri, ri + 1):
            for dz in range(-ri, ri + 1):
                d = dx * dx + dz * dz
                if not (hr <= d <= rr):
                    continue
                # Ridged bark, so the trunk is not a smooth pipe.
                if (dx * 3 + dz * 5 + y) % 11 == 0 and d > rr * 0.7:
                    continue
                px, pz = cx + dx, cz + dz
                if 0 <= px < W and 0 <= pz < L:
                    t.set(px, y, pz, PALE_LOG, {"axis": "y"})
        if y % 4 == 0:
            for k in range(5):
                a = (2 * _m.pi * k) / 5 + y * 0.21
                px = int(round(cx + _m.sin(a) * (r - 0.4)))
                pz = int(round(cz + _m.cos(a) * (r - 0.4)))
                if 0 <= px < W and 0 <= pz < L:
                    t.set(px, y, pz, RESIN)
        if y in (16, 25, 34, 43):
            t.set(cx + int(r) - 1, y, cz, CREAK,
                  {"active": "true", "natural": "true"})

    # --- limbs ------------------------------------------------------------
    # Five primaries, each forking twice. The tips are collected and the
    # canopy is grown from them, so the crown follows the branching instead
    # of being a hat sitting on top of it.
    tips = []
    for i in range(5):
        a = (2 * _m.pi * i) / 5 + 0.4
        base_y = 38 + (i % 3) * 4
        end = limb(cx + _m.sin(a) * 3, base_y, cz + _m.cos(a) * 3,
                   a, 0.86, 17.0, 3.2, 1.7, PALE_WOOD, droop=-0.26)
        for j in (-1, 1):
            end2 = limb(end[0], end[1], end[2], a + j * 0.42, 0.52,
                        11.0, 1.7, 1.0, PALE_WOOD, droop=-0.18)
            tips.append(end2)
            for k in (-1, 1):
                tips.append(limb(end2[0], end2[1], end2[2],
                                 a + j * 0.42 + k * 0.5, 0.34, 6.5, 1.0, 0.6,
                                 PALE_WOOD, droop=-0.12))
    # A crown limb straight up the middle, so the tree has a peak.
    tips.append(limb(cx, 50, cz, 0.0, 1.45, 13.0, 2.6, 1.2, PALE_WOOD))

    # --- canopy -----------------------------------------------------------
    for (tx, ty, tz) in tips:
        blob(int(round(tx)), int(round(ty)), int(round(tz)), 6.2,
             PALE_LEAVES, {"persistent": "true"}, jitter=1)
    # Resin hanging out of the boughs, and eyeblossoms opening in the crown.
    for n, (tx, ty, tz) in enumerate(tips):
        if n % 3:
            continue
        px, pz = int(round(tx)), int(round(tz))
        for dy in range(1, 6 + (n % 4)):
            py = int(round(ty)) - 6 - dy
            if 0 <= px < W and 0 <= pz < L and 0 < py < H:
                t.set(px, py, pz, RESIN)
        if 0 <= px < W and 0 <= pz < L and int(ty) + 6 < H:
            t.set(px, int(round(ty)) + 6, pz, EYE_OPEN)

    # --- the hollow: a root cage around the core --------------------------
    for y in range(1, 15):
        r = 6.5
        ri = int(_m.ceil(r))
        for dx in range(-ri, ri + 1):
            for dz in range(-ri, ri + 1):
                if dx * dx + dz * dz <= r * r:
                    t.set(cx + dx, y, cz + dz, "minecraft:air")
    for i in range(14):
        a = (2 * _m.pi * i) / 14
        for y in range(1, 15):
            wobble = _m.sin(y * 0.42 + i) * 1.3
            x = int(round(cx + _m.sin(a) * (6 + wobble)))
            z = int(round(cz + _m.cos(a) * (6 + wobble)))
            if 0 <= x < W and 0 <= z < L:
                t.set(x, y, z, PALE_LOG if y % 4 else RESIN)

    # --- the World Core ---------------------------------------------------
    t.fill(cx - 2, 1, cz - 2, cx + 2, 5, cz + 2, RESIN)
    t.fill(cx - 1, 2, cz - 1, cx + 1, 4, cz + 1, KILN)
    t.set(cx, 3, cz, KILN)
    for dx, dz in ((-3, 0), (3, 0), (0, -3), (0, 3)):
        t.set(cx + dx, 1, cz + dz, BLOOM)
    for x in range(cx - 7, cx + 8):
        for z in range(cz - 7, cz + 8):
            if (x - cx) ** 2 + (z - cz) ** 2 <= 49:
                t.set(x, 0, z, SEAMSTONE)
                if (x + z) % 4 == 0:
                    t.set(x, 1, z, VEIN)

    t.set(cx - 5, 1, cz, CHEST, {"facing": "east"},
          {"id": "minecraft:chest", "LootTable": "gildedseam:chests/palace_reliquary"})
    t.set(cx + 5, 1, cz, CHEST, {"facing": "west"},
          {"id": "minecraft:chest", "LootTable": "gildedseam:chests/palace_reliquary"})

    # --- the congregation --------------------------------------------------
    t.entity(cx, 6.0, cz, "gildedseam:reliquary_colossus")
    for i, eid in enumerate(("gildedseam:manifold", "gildedseam:seamstress",
                             "gildedseam:kilnborn", "gildedseam:font_of_gold")):
        a = (2 * _m.pi * i) / 4
        t.entity(cx + _m.sin(a) * 4, 2.0, cz + _m.cos(a) * 4, eid)
    for i in range(8):
        a = (2 * _m.pi * i) / 8 + 0.4
        t.entity(cx + _m.sin(a) * 15, 2.0, cz + _m.cos(a) * 15, "gildedseam:shardling")
    for i, eid in enumerate(("gildedseam:gilded_cow", "gildedseam:gilded_pig",
                             "gildedseam:gilded_sheep", "gildedseam:half_sewn")):
        a = (2 * _m.pi * i) / 4 + 0.8
        t.entity(cx + _m.sin(a) * 20, 2.0, cz + _m.cos(a) * 20, eid)

    t.save("mother_tree")




# ---------------------------------------------------------------------------
# THE SUNKEN COURT — the Creaking's arena, in the hollow.
#
# A ring of heartwood pillars around a pool of poured gold, with the Creaking
# sitting waist-deep at the centre. The floor is a raised ring you fight on;
# the pool is the hazard, and the pillars are the only cover from a reach that
# crosses the whole room. Nothing spawns here by accident: this is a built
# place, so arriving means finding it.
# ---------------------------------------------------------------------------

PALE_PLANK = "minecraft:pale_oak_planks"
RESIN_BRICK_BLOCK = "minecraft:resin_bricks"


def build_sunken_court():
    import math as _m
    W, H, L = 45, 24, 45
    t = Template(W, H, L)
    cx = cz = W // 2

    def ring(y, r0, r1, name, props=None):
        for x in range(W):
            for z in range(L):
                d = _m.sqrt((x - cx) ** 2 + (z - cz) ** 2)
                if r0 <= d <= r1:
                    t.set(x, y, z, name, props)

    # Floor: an outer walkway of resin brick, then the pool.
    for y in (0,):
        ring(y, 0, 21, RESIN_BRICK_BLOCK)
    ring(1, 13, 21, PALE_PLANK)
    ring(2, 18, 21, PALE_LOG, {"axis": "y"})
    # The pool itself, sunk two deep and filled with gold.
    for y in (0, 1):
        ring(y, 0, 12.4, GOLD if y else SEAMSTONE)
    ring(1, 0, 9.0, "minecraft:gold_block")
    # Veins crawling out of the pool onto the walkway.
    for i in range(40):
        a = (2 * _m.pi * i) / 40
        for step in range(13, 19):
            x = int(round(cx + _m.sin(a) * step))
            z = int(round(cz + _m.cos(a) * step))
            if (x + z + step) % 3 == 0 and 0 <= x < W and 0 <= z < L:
                t.set(x, 2, z, VEIN)

    # Twelve pillars of heartwood, ringing the pool, each crowned with resin.
    for i in range(12):
        a = (2 * _m.pi * i) / 12
        px = int(round(cx + _m.sin(a) * 16))
        pz = int(round(cz + _m.cos(a) * 16))
        h = 13 + (i % 3) * 2
        for y in range(1, h):
            t.set(px, y, pz, PALE_LOG, {"axis": "y"})
            if y in (5, 9) or y == h - 1:
                for dx, dz in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    t.set(px + dx, y, pz + dz, RESIN)
        t.set(px, h, pz, KILN if i % 4 == 0 else CREAK,
              {"age": "3"} if i % 4 == 0 else {"active": "true", "natural": "true"})
        # Eyeblossoms at the foot of every pillar: the room is watching.
        for dx, dz in ((2, 0), (-2, 0), (0, 2), (0, -2)):
            t.set(px + dx, 1, pz + dz, EYE_OPEN)

    # A canopy of pale oak overhead, so the court feels roofed and closed.
    for y in (20, 21):
        for x in range(W):
            for z in range(L):
                d = _m.sqrt((x - cx) ** 2 + (z - cz) ** 2)
                if d <= 20 and (x + z + y) % 4 != 0:
                    t.set(x, y, z, PALE_LEAVES, {"persistent": "true"})

    # The way in: a gate frame on the north edge, already built, unlit.
    for h in range(1, 6):
        t.set(cx - 2, h, 1, PALE_LOG, {"axis": "y"})
        t.set(cx + 2, h, 1, PALE_LOG, {"axis": "y"})
    for x in range(cx - 2, cx + 3):
        t.set(x, 6, 1, PALE_LOG, {"axis": "x"})
        t.set(x, 0, 1, PALE_LOG, {"axis": "x"})

    # Two chests of supplies on the walkway - this is a boss room, and the
    # player arriving may have spent everything getting here.
    t.set(cx - 17, 2, cz, CHEST, {"facing": "east"},
          {"id": "minecraft:chest", "LootTable": "gildedseam:chests/palace_reliquary"})
    t.set(cx + 17, 2, cz, CHEST, {"facing": "west"},
          {"id": "minecraft:chest", "LootTable": "gildedseam:chests/palace_reliquary"})

    # The Creaking, waist-deep at the centre, and its court around the rim.
    t.entity(cx, 2.0, cz, "gildedseam:the_creaking")
    for i in range(6):
        a = (2 * _m.pi * i) / 6 + 0.3
        t.entity(cx + _m.sin(a) * 18, 3.0, cz + _m.cos(a) * 18,
                 ("gildedseam:manifold", "gildedseam:seamstress",
                  "gildedseam:kilnborn")[i % 3])
    t.save("sunken_court")


if __name__ == "__main__":
    build_palace()
    build_city()
    build_hamlet()
    build_mother_tree()
    build_sunken_court()
