"""Software renderer for previewing the bestiary.

Renders each model's box geometry (same data the Java LayerDefinitions are
generated from) with its real UV-mapped texture, using a painter's-algorithm
orthographic 3/4 view. Also renders block dioramas from the block textures.

Usage: python3 render_preview.py <output_dir>
"""

import math
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from PIL import Image, ImageDraw, ImageFont

from lib import face_rects, pack_uvs, paint
from models import ALL_MODELS, MASK_PARTS, TIERED_TEXTURES

TEX_DIR = os.path.normpath(os.path.join(
    os.path.dirname(__file__), "..", "..", "src", "main", "resources",
    "assets", "gildedseam", "textures"))

# Which mutation parts are hidden below which tier (mirrors the Java models).
TIER_VISIBILITY = {
    "shardling": {"crest_2": 1, "leg_mr": 2, "leg_mr_lower": 2, "leg_ml": 2, "leg_ml_lower": 2},
    "vessel": {"spare_arm_r": 2, "spare_arm_r_lower": 2, "spare_arm_l": 2, "spare_arm_l_lower": 2},
    "porcelain_hound": {"spine_0": 1, "spine_1": 1, "spine_2": 1, "mane_lustre": 2},
    "seamstress": {"arm_xr": 2, "arm_xr_lower": 2, "arm_xl": 2, "arm_xl_lower": 2},
    "kilnborn": {"chimney_2": 2, "spike_r": 2, "spike_l": 2},
    "chime": {f"petal_i{i}": 2 for i in range(6)},
    "font_of_gold": {"spout_2": 2, "spout_3": 2, "crown": 2},
    "manifold": {},
    "reliquary_colossus": {},
    "porcelain_autarch": {},
    "salt_sworn": {},
}

# Static preview poses (radians), mirroring each species' resting stance.
POSES = {
    "seamstress": {"arm_lr": (-0.9, 0, 0), "arm_ll": (-0.9, 0, 0),
                   "arm_lr_lower": (-0.4, 0, 0), "arm_ll_lower": (-0.4, 0, 0),
                   "arm_xr": (-0.5, 0, -0.35), "arm_xl": (-0.5, 0, 0.35)},
    "reliquary_colossus": {"arm_lr": (-1.7, 0.55, 0), "arm_ll": (-1.7, -0.55, 0),
                           "arm_lr_lower": (1.25, 0, 0), "arm_ll_lower": (1.25, 0, 0),
                           "arm_tr": (-0.25, 0, 0.4), "arm_tl": (-0.25, 0, -0.4),
                           "arm_tr_lower": (0.5, 0, 0), "arm_tl_lower": (0.5, 0, 0),
                           "arm_mr": (-0.9, 0, 0.7), "arm_ml": (-0.9, 0, -0.7),
                           "arm_mr_lower": (0.6, 0, 0), "arm_ml_lower": (0.6, 0, 0)},
    "porcelain_hound": {"tail": (0.15, 0, 0)},
    "porcelain_autarch": {"arm_r": (-0.35, 0, 0.5), "arm_l": (-0.35, 0, -0.5),
                          "arm_r_lower": (0.55, 0, 0), "arm_l_lower": (0.55, 0, 0),
                          "mantle_arm_r0": (-0.5, 0, 0.5), "mantle_arm_l0": (-0.5, 0, -0.5),
                          "mantle_arm_r1": (-0.3, 0, 0.6), "mantle_arm_l1": (-0.3, 0, -0.6)},
    "salt_sworn": {"arm_l": (-0.4, 0, 0), "arm_r": (0.15, 0, 0)},
}

TIER_SCALE_STEP = {
    "seamstress": 0.12, "font_of_gold": 0.2, "manifold": 0.1,
    "reliquary_colossus": 0.0, "porcelain_autarch": 0.0, "salt_sworn": 0.0,
}
MIN_TIER = {"seamstress": 1, "kilnborn": 1, "chime": 1, "font_of_gold": 1,
            "manifold": 2, "reliquary_colossus": 2, "porcelain_autarch": 2,
            "salt_sworn": 0}


def rot_x(p, a):
    x, y, z = p
    c, s = math.cos(a), math.sin(a)
    return (x, y * c - z * s, y * s + z * c)


def rot_y(p, a):
    x, y, z = p
    c, s = math.cos(a), math.sin(a)
    return (x * c + z * s, y, -x * s + z * c)


def rot_z(p, a):
    x, y, z = p
    c, s = math.cos(a), math.sin(a)
    return (x * c - y * s, x * s + y * c, z)


def transform_chain(model, part, extra_pose):
    """Returns a function mapping part-space points to model space."""
    chain = []
    node = part
    parts = model.part_map()
    while node is not None:
        chain.append(node)
        node = parts.get(node.parent)
    chain.reverse()

    def apply(p):
        for node in reversed(chain):
            rx, ry, rz = node.rot
            erx, ery, erz = extra_pose.get(node.name, (0, 0, 0))
            rx, ry, rz = rx + erx, ry + ery, rz + erz
            if rz:
                p = rot_z(p, rz)
            if ry:
                p = rot_y(p, ry)
            if rx:
                p = rot_x(p, rx)
            px, py, pz = node.pivot
            p = (p[0] + px, p[1] + py, p[2] + pz)
        return p

    return apply


FACE_CORNERS = {
    # each face: (corner00, corner10, corner11, corner01) in unit box coords,
    # matching the texture rect orientation from face_rects().
    "top": ((0, 0, 0), (1, 0, 0), (1, 0, 1), (0, 0, 1)),
    "bottom": ((0, 1, 1), (1, 1, 1), (1, 1, 0), (0, 1, 0)),
    "north": ((1, 0, 0), (0, 0, 0), (0, 1, 0), (1, 1, 0)),
    "south": ((0, 0, 1), (1, 0, 1), (1, 1, 1), (0, 1, 1)),
    "west": ((0, 0, 0), (0, 0, 1), (0, 1, 1), (0, 1, 0)),
    "east": ((1, 0, 1), (1, 0, 0), (1, 1, 0), (1, 1, 1)),
}
FACE_TO_RECT = {"north": "front", "south": "back", "west": "right",
                "east": "left", "top": "top", "bottom": "bottom"}


def render_model(model, texture, tier, size=280, yaw=math.radians(-33), pitch=math.radians(18),
                 scale_mult=1.0):
    tex = texture.convert("RGBA")
    tw = tex.width
    tpx = tex.load()
    vis = TIER_VISIBILITY.get(model.name, {})
    pose = POSES.get(model.name, {})

    quads = []  # (depth, [screen pts], color)
    light = (-0.45, -0.8, -0.4)
    ll = math.sqrt(sum(v * v for v in light))
    light = tuple(v / ll for v in light)

    for part in model.parts:
        if vis.get(part.name, 0) > tier:
            continue
        tf = transform_chain(model, part, pose)
        for box in part.boxes:
            ox, oy, oz = box.origin
            w, h, d = box.size
            rects = face_rects(box)
            for face, corners in FACE_CORNERS.items():
                rx, ry, rw, rh = rects[FACE_TO_RECT[face]]
                if rw <= 0 or rh <= 0:
                    continue
                world = []
                for cx, cy, cz in corners:
                    p = (ox + cx * w, oy + cy * h, oz + cz * d)
                    p = tf(p)
                    p = rot_y(p, yaw)
                    p = rot_x(p, pitch)
                    world.append(p)
                # Backface cull + shade via world normal.
                ux = tuple(world[1][i] - world[0][i] for i in range(3))
                vy = tuple(world[3][i] - world[0][i] for i in range(3))
                n = (ux[1] * vy[2] - ux[2] * vy[1],
                     ux[2] * vy[0] - ux[0] * vy[2],
                     ux[0] * vy[1] - ux[1] * vy[0])
                nl = math.sqrt(sum(v * v for v in n)) or 1.0
                n = tuple(v / nl for v in n)
                if n[2] > 0:  # facing away from camera (+z toward viewer after flip)
                    continue
                shade = 0.62 + 0.38 * max(0.0, -(n[0] * light[0] + n[1] * light[1] + n[2] * light[2]))

                # Split the face into texel quads.
                for j in range(rh):
                    for i in range(rw):
                        r, g, b, a = tpx[min(rx + i, tw - 1), min(ry + j, tex.height - 1)]
                        if a == 0:
                            continue
                        color = (int(r * shade), int(g * shade), int(b * shade), 255)
                        pts = []
                        for (fu, fv) in ((i / rw, j / rh), ((i + 1) / rw, j / rh),
                                         ((i + 1) / rw, (j + 1) / rh), (i / rw, (j + 1) / rh)):
                            p = [world[0][k] + (world[1][k] - world[0][k]) * fu
                                 + (world[3][k] - world[0][k]) * fv
                                 + (world[2][k] - world[1][k] - world[3][k] + world[0][k]) * fu * fv
                                 for k in range(3)]
                            pts.append(p)
                        depth = sum(p[2] for p in pts) / 4.0
                        quads.append((depth, pts, color))

    if not quads:
        return Image.new("RGBA", (size, size), (0, 0, 0, 0))

    xs = [p[0] for _, pts, _ in quads for p in pts]
    ys = [p[1] for _, pts, _ in quads for p in pts]
    span = max(max(xs) - min(xs), max(ys) - min(ys)) or 1.0
    zoom = (size * 0.86) / span * scale_mult
    cx = (max(xs) + min(xs)) / 2.0
    cy = (max(ys) + min(ys)) / 2.0

    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    quads.sort(key=lambda q: -q[0])  # far (large +z) first
    for _, pts, color in quads:
        screen = [((p[0] - cx) * zoom + size / 2, (p[1] - cy) * zoom + size / 2) for p in pts]
        draw.polygon(screen, fill=color)
    return img


def load_texture(name, tier):
    suffix = {0: "", 1: "_stoneware", 2: "_lustre"}[tier]
    path = os.path.join(TEX_DIR, "entity", f"{name}{suffix}.png")
    if not os.path.exists(path):
        return None  # untiered species (the living)
    return Image.open(path)


def sheet(models, out_path, title, tile=280, label_h=34):
    tiers = [0, 1, 2]
    font = ImageFont.load_default()
    header = 52
    width = tile * 3 + 40
    height = header + len(models) * (tile + label_h + 8)
    img = Image.new("RGBA", (width, height), (26, 22, 20, 255))
    draw = ImageDraw.Draw(img)
    draw.text((20, 16), title, fill=(247, 220, 138, 255), font=font)
    draw.text((width - 260, 16), "Bisque  /  Stoneware  /  Lustre", fill=(200, 190, 175, 255), font=font)

    for row, model in enumerate(models):
        y0 = header + row * (tile + label_h + 8)
        display = model.name.replace("_", " ").title()
        draw.text((20, y0 + tile + 6), display, fill=(244, 239, 230, 255), font=font)
        min_tier = MIN_TIER.get(model.name, 0)
        step = TIER_SCALE_STEP.get(model.name, 0.16)
        for col, tier in enumerate(tiers):
            x0 = 20 + col * tile
            if tier < min_tier:
                draw.text((x0 + tile * 0.32, y0 + tile * 0.48),
                          "(not fired\n  this soft)", fill=(90, 80, 72, 255), font=font)
                continue
            tex = load_texture(model.name, tier)
            if tex is None:
                if tier > 0:
                    continue
                tex = load_texture(model.name, 0)
            tile_img = render_model(model, tex, tier, size=tile,
                                    scale_mult=0.72 + 0.14 * tier if step else 0.9)
            img.alpha_composite(tile_img, (x0, y0))
            draw.text((x0 + 4, y0 + 4), ["Bisque", "Stoneware", "Lustre"][tier],
                      fill=(222, 168, 62, 255), font=font)
    img.convert("RGB").save(out_path)
    print("wrote", out_path)


def render_block(textures, size=140, yaw=math.radians(215), pitch=math.radians(22)):
    """textures: dict face->16x16 image (keys: top, side, bottom) drawn as a cube."""
    quads = []
    faces = {
        "top": (((0, 0, 0), (1, 0, 0), (1, 0, 1), (0, 0, 1)), textures["top"], 1.0),
        "north": (((1, 0, 0), (0, 0, 0), (0, 1, 0), (1, 1, 0)), textures["side"], 0.8),
        "west": (((0, 0, 0), (0, 0, 1), (0, 1, 1), (0, 1, 0)), textures["side"], 0.62),
    }
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    out = []
    for face, (corners, tex, shade) in faces.items():
        tp = tex.convert("RGBA").load()
        world = []
        for c in corners:
            p = (c[0] * 16 - 8, c[1] * 16 - 8, c[2] * 16 - 8)
            p = rot_y(p, yaw)
            p = rot_x(p, pitch)
            world.append(p)
        for j in range(16):
            for i in range(16):
                r, g, b, a = tp[i, j]
                color = (int(r * shade), int(g * shade), int(b * shade), a)
                pts = []
                for (fu, fv) in ((i / 16, j / 16), ((i + 1) / 16, j / 16),
                                 ((i + 1) / 16, (j + 1) / 16), (i / 16, (j + 1) / 16)):
                    p = [world[0][k] + (world[1][k] - world[0][k]) * fu
                         + (world[3][k] - world[0][k]) * fv
                         + (world[2][k] - world[1][k] - world[3][k] + world[0][k]) * fu * fv
                         for k in range(3)]
                    pts.append(p)
                out.append((sum(p[2] for p in pts) / 4, pts, color))
    xs = [p[0] for _, pts, _ in out for p in pts]
    ys = [p[1] for _, pts, _ in out for p in pts]
    span = max(max(xs) - min(xs), max(ys) - min(ys))
    zoom = size * 0.82 / span
    cx = (max(xs) + min(xs)) / 2
    cy = (max(ys) + min(ys)) / 2
    out.sort(key=lambda q: -q[0])
    for _, pts, color in out:
        if color[3] == 0:
            continue
        draw.polygon([((p[0] - cx) * zoom + size / 2, (p[1] - cy) * zoom + size / 2) for p in pts],
                     fill=color)
    return img


def blocks_sheet(out_path):
    font = ImageFont.load_default()
    bt = lambda n: Image.open(os.path.join(TEX_DIR, "block", n + ".png"))
    it = lambda n: Image.open(os.path.join(TEX_DIR, "item", n + ".png"))

    blocks = [
        ("Seamstone", {"top": bt("seamstone"), "side": bt("seamstone")}),
        ("Gilded Vein", {"top": bt("gilded_vein"), "side": bt("gilded_vein")}),
        ("Kiln Heart (cool)", {"top": bt("kiln_heart_top"), "side": bt("kiln_heart_side")}),
        ("Kiln Heart (white-hot)", {"top": bt("kiln_heart_top"), "side": bt("kiln_heart_side_hot")}),
        ("Fired Shell", {"top": bt("fired_shell"), "side": bt("fired_shell")}),
        ("Porcelain Bloom (cup)", {"top": bt("porcelain_bloom_cup"), "side": bt("porcelain_bloom_cup")}),
    ]
    items = ["porcelain_shard", "gold_thread", "kintsugi_blade", "rivening_salt",
             "vessel_spawn_egg", "reliquary_colossus_spawn_egg"]

    tile = 150
    width = tile * 6 + 40
    height = 60 + tile + 40 + 128 + 60
    img = Image.new("RGBA", (width, height), (26, 22, 20, 255))
    draw = ImageDraw.Draw(img)
    draw.text((20, 14), "THE SEAM UNDERFOOT - infection blocks (these spread on their own)",
              fill=(247, 220, 138, 255), font=font)
    for i, (name, texs) in enumerate(blocks):
        x = 20 + i * tile
        img.alpha_composite(render_block(texs, size=tile - 16), (x, 46))
        draw.text((x + 4, 46 + tile - 12), name, fill=(244, 239, 230, 255), font=font)

    y2 = 60 + tile + 24
    draw.text((20, y2 - 4), "ITEMS", fill=(247, 220, 138, 255), font=font)
    for i, name in enumerate(items):
        x = 20 + i * tile
        icon = it(name).resize((112, 112), Image.NEAREST)
        img.alpha_composite(icon, (x, y2 + 16))
        draw.text((x, y2 + 16 + 116), name.replace("_", " "), fill=(200, 190, 175, 255), font=font)
    img.convert("RGB").save(out_path)
    print("wrote", out_path)


def main():
    out_dir = sys.argv[1] if len(sys.argv) > 1 else "."
    os.makedirs(out_dir, exist_ok=True)
    for model in ALL_MODELS:
        pack_uvs(model)

    by_name = {m.name: m for m in ALL_MODELS}
    sheet([by_name[n] for n in ("shardling", "vessel", "porcelain_hound")],
          os.path.join(out_dir, "bestiary_stage1.png"),
          "STAGE I - HAIRLINE (mutations: Bisque -> Stoneware -> Lustre)")
    sheet([by_name[n] for n in ("seamstress", "kilnborn", "chime", "font_of_gold")],
          os.path.join(out_dir, "bestiary_stage2.png"),
          "STAGE II - CRAZING (never fired below Stoneware)")
    sheet([by_name[n] for n in ("manifold", "reliquary_colossus")],
          os.path.join(out_dir, "bestiary_stage3.png"),
          "STAGE III - LUSTRE (the abstracts: always fully mutated)")
    sheet([by_name[n] for n in ("porcelain_autarch", "salt_sworn")],
          os.path.join(out_dir, "bestiary_kingdom.png"),
          "THE KINGDOM - the Overlord King, and the help you can hire", tile=340)
    blocks_sheet(os.path.join(out_dir, "blocks_items.png"))


if __name__ == "__main__":
    main()
