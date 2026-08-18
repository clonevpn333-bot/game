"""Software renderer for AmberBench models.

Draws the compiled part tree exactly as the game would: same hierarchy, same
UVs, same texture. Used to eyeball a creature without launching Minecraft, and
to produce the bestiary sheets. Supersampled, two-light shading, contact
shadow, and per-tier part visibility so you can see a mutation line at a
glance.
"""

from __future__ import annotations

import math
import os

from PIL import Image, ImageDraw, ImageFilter, ImageFont

from core import Model, face_rects, tier_of

BG = (22, 21, 25)

FACE_CORNERS = {
    "front":  ((0, 0, 0), (1, 0, 0), (1, 1, 0), (0, 1, 0)),
    "back":   ((1, 0, 1), (0, 0, 1), (0, 1, 1), (1, 1, 1)),
    "left":   ((1, 0, 0), (1, 0, 1), (1, 1, 1), (1, 1, 0)),
    "right":  ((0, 0, 1), (0, 0, 0), (0, 1, 0), (0, 1, 1)),
    "top":    ((0, 0, 1), (1, 0, 1), (1, 0, 0), (0, 0, 0)),
    "bottom": ((0, 1, 0), (1, 1, 0), (1, 1, 1), (0, 1, 1)),
}


def _rx(p, a):
    c, s = math.cos(a), math.sin(a)
    return (p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c)


def _ry(p, a):
    c, s = math.cos(a), math.sin(a)
    return (p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c)


def _rz(p, a):
    c, s = math.cos(a), math.sin(a)
    return (p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2])


def _chain(model: Model, part, pose):
    """Composes a part's transform up through its ancestors."""
    stack = []
    pm = model.part_map()
    node = part
    while node is not None:
        stack.append(node)
        node = pm.get(node.parent)

    def apply(p):
        for node in stack:
            rot = pose.get(node.name, node.rot)
            # Vanilla's ModelPart pushes z, then y, then x onto the matrix
            # stack, so a point meets x first. GeckoLib does the same. Any
            # other order silently disagrees with the game on every part that
            # rotates about more than one axis - fingers, angled eye sockets.
            p = _rx(p, rot[0])
            p = _ry(p, rot[1])
            p = _rz(p, rot[2])
            p = (p[0] + node.pivot[0], p[1] + node.pivot[1], p[2] + node.pivot[2])
        return p

    return apply


def render(model: Model, texture: Image.Image, tier: int = 2, size: int = 320,
           yaw: float = math.radians(-34), pitch: float = math.radians(16),
           zoom_mult: float = 1.0, pose: dict | None = None, ss: int = 2,
           shadow: bool = True) -> Image.Image:
    tex = texture.convert("RGBA")
    tpx = tex.load()
    pose = pose or {}
    px_size = size * ss

    key = (-0.42, -0.78, -0.46)
    kl = math.sqrt(sum(v * v for v in key))
    key = tuple(v / kl for v in key)
    fill = (0.55, -0.25, 0.30)
    fl = math.sqrt(sum(v * v for v in fill))
    fill = tuple(v / fl for v in fill)

    quads = []
    for part in model.parts:
        if tier_of(model, part.name) > tier:
            continue
        tf = _chain(model, part, pose)
        for b in part.boxes:
            if b.uv is None:
                continue
            ox, oy, oz = b.origin
            w, h, d = b.size
            g = b.grow
            ox, oy, oz = ox - g, oy - g, oz - g
            w, h, d = w + 2 * g, h + 2 * g, d + 2 * g
            rects = face_rects(b)
            for face, corners in FACE_CORNERS.items():
                rx, ry, rw, rh = rects[face]
                if rw <= 0 or rh <= 0:
                    continue
                world = []
                for cx, cy, cz in corners:
                    p = tf((ox + cx * w, oy + cy * h, oz + cz * d))
                    p = _ry(p, yaw)
                    p = _rx(p, pitch)
                    world.append(p)
                ux = tuple(world[1][i] - world[0][i] for i in range(3))
                vy = tuple(world[3][i] - world[0][i] for i in range(3))
                n = (ux[1] * vy[2] - ux[2] * vy[1],
                     ux[2] * vy[0] - ux[0] * vy[2],
                     ux[0] * vy[1] - ux[1] * vy[0])
                nl = math.sqrt(sum(v * v for v in n)) or 1.0
                n = tuple(v / nl for v in n)
                if n[2] > 0:
                    continue
                lam = max(0.0, -sum(n[i] * key[i] for i in range(3)))
                rim = max(0.0, -sum(n[i] * fill[i] for i in range(3)))
                lit = 0.52 + 0.44 * lam + 0.16 * rim
                for j in range(rh):
                    for i in range(rw):
                        r, g_, bl, a = tpx[min(rx + i, tex.width - 1),
                                            min(ry + j, tex.height - 1)]
                        if a == 0:
                            continue
                        col = (min(255, int(r * lit)), min(255, int(g_ * lit)),
                               min(255, int(bl * lit)))
                        pts = []
                        for fu, fv in ((i / rw, j / rh), ((i + 1) / rw, j / rh),
                                       ((i + 1) / rw, (j + 1) / rh), (i / rw, (j + 1) / rh)):
                            pts.append([
                                world[0][k] + (world[1][k] - world[0][k]) * fu
                                + (world[3][k] - world[0][k]) * fv
                                + (world[2][k] - world[1][k] - world[3][k]
                                   + world[0][k]) * fu * fv
                                for k in range(3)])
                        quads.append((sum(p[2] for p in pts) / 4.0, pts, col))

    if not quads:
        return Image.new("RGBA", (size, size), (0, 0, 0, 0))

    xs = [p[0] for _, pts, _ in quads for p in pts]
    ys = [p[1] for _, pts, _ in quads for p in pts]
    span = max(max(xs) - min(xs), max(ys) - min(ys)) or 1.0
    zoom = (px_size * 0.84) / span * zoom_mult
    cx, cy = (max(xs) + min(xs)) / 2.0, (max(ys) + min(ys)) / 2.0

    img = Image.new("RGBA", (px_size, px_size), (0, 0, 0, 0))
    if shadow:
        sh = Image.new("RGBA", (px_size, px_size), (0, 0, 0, 0))
        sd = ImageDraw.Draw(sh)
        foot = (max(ys) - cy) * zoom + px_size / 2
        rad = span * zoom * 0.30
        sd.ellipse([px_size / 2 - rad, foot - rad * 0.22,
                    px_size / 2 + rad, foot + rad * 0.22], fill=(0, 0, 0, 130))
        img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(px_size / 90.0)))

    draw = ImageDraw.Draw(img)
    quads.sort(key=lambda q: -q[0])
    for _, pts, col in quads:
        draw.polygon([((p[0] - cx) * zoom + px_size / 2,
                       (p[1] - cy) * zoom + px_size / 2) for p in pts], fill=col)
    return img.resize((size, size), Image.LANCZOS)


# ---------------------------------------------------------------------------
# Sheets
# ---------------------------------------------------------------------------

TIER_NAMES = ("Green Sap", "Hardened", "Amberlit")


def _font(sz=15):
    for path in ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
                 "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"):
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, sz)
            except OSError:
                pass
    return ImageFont.load_default()


def sheet(entries, out_path, title, subtitle="", tile=320):
    """entries: list of (model, texture_for_tier(callable), display, blurb)."""
    f_title = _font(21)
    f_name = _font(17)
    f_small = _font(13)
    header = 96
    label_h = 46
    width = tile * 3 + 48
    height = header + len(entries) * (tile + label_h)
    img = Image.new("RGBA", (width, height), (*BG, 255))
    d = ImageDraw.Draw(img)
    d.text((24, 18), title, fill=(247, 200, 120, 255), font=f_title)
    if subtitle:
        d.text((24, 46), subtitle, fill=(150, 142, 130, 255), font=f_small)
    d.line([24, 70, width - 24, 70], fill=(58, 52, 48, 255))
    for i, name in enumerate(TIER_NAMES):
        d.text((24 + i * tile + 8, 78), f"{i + 1}.  {name}",
               fill=(214, 126, 42, 255), font=f_small)

    for row, (model, tex_for, display, blurb) in enumerate(entries):
        y0 = header + row * (tile + label_h)
        d.rectangle([16, y0 - 6, width - 16, y0 + tile + label_h - 14],
                    outline=(48, 44, 42, 255))
        for col in range(3):
            tex = tex_for(col)
            if tex is None:
                continue
            im = render(model, tex, tier=col, size=tile,
                        zoom_mult=0.74 + 0.10 * col)
            img.alpha_composite(im, (24 + col * tile, y0))
        d.text((26, y0 + tile + 2), display, fill=(240, 236, 228, 255), font=f_name)
        if blurb:
            d.text((26, y0 + tile + 22), blurb, fill=(146, 138, 128, 255), font=f_small)
    img.convert("RGB").save(out_path)
    print("wrote", out_path)


def portrait(model, texture, out_path, size=560, yaw=math.radians(-28),
             pitch=math.radians(12), tier=2):
    img = Image.new("RGBA", (size, size), (*BG, 255))
    img.alpha_composite(render(model, texture, tier=tier, size=size, yaw=yaw,
                               pitch=pitch, zoom_mult=0.92, ss=3))
    img.convert("RGB").save(out_path)
    print("wrote", out_path)
