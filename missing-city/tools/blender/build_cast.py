"""
THE MISSING CITY — cast builder on the CC0 MakeHuman base mesh.

  blender -b --python tools/blender/build_cast.py -- <out_dir> [name ...] [--preview] [--nobake]

Per character: MakeHuman macro + face morphs -> anatomical body; clothing by zone inflation + smoothing;
fitted collars/hems/cuffs/belts/gear (ray-cast onto the body); hair from the scalp helper; painted
brows/stubble/lips; eyes + lashes; 49-bone armature (fingers included) built from MakeHuman joints;
automatic weights; procedural materials baked to a PBR atlas; facial expression morphs; full animation set.
"""
import os
import sys
import math
import random
import bpy
import bmesh
import numpy as np
from mathutils import Vector, Matrix, Quaternion, Euler, noise

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_characters as bc  # noqa: E402
import mh  # noqa: E402
from build_characters import (  # noqa: E402
    C, lin, link, activate, apply_mods, from_bm, set_slot, vcol, solid_col, smooth, gauss, tube, lathe,
    rounded_box, get_mat, MATS, reset, game_rot, HINGES as _H, FPS,
)

OUT = bc.OUT
PREVIEW = bc.PREVIEW
NOBAKE = bc.NOBAKE

# ============================================================================ cast definitions
CAST = {
    'elias': dict(
        height=1.80, gender=1.0, age=29, muscle=0.62, weight=0.45, prop=0.75, race={'caucasian': 1.0},
        face={'head/head-square': 0.35, 'chin/chin-prominent-incr': 0.25, 'nose/nose-hump-incr': 0.2, 'cheek/l-cheek-bones-incr': 0.35, 'cheek/r-cheek-bones-incr': 0.35,
              'eyebrows/eyebrows-trans-down': 0.25, 'mouth/mouth-lowerlip-volume-incr': 0.2, 'neck/neck-scale-horiz-incr': 0.15},
        skin='#c49478', hair='#231711', hair_style='short', stubble=0.6, brows=0.9, eye='#4a3826', tex=2048, hero=True,
        top='#26333f', top_kind='jacket', inner='#2e2f31', bottom='#25272c', bottom_kind='jeans', shoes='#3d2b1f', shoe_kind='boots',
        gear=['chestlight', 'holster', 'radio', 'badge'],
    ),
    'maya': dict(
        height=1.66, gender=0.0, age=31, muscle=0.45, weight=0.38, prop=0.8, race={'asian': 0.85, 'caucasian': 0.15},
        face={'head/head-oval': 0.4, 'nose/nose-point-width-decr': 0.2, 'chin/chin-width-decr': 0.2, 'mouth/mouth-upperlip-volume-incr': 0.2, 'eyebrows/eyebrows-angle-up': 0.15},
        skin='#d9ad8c', hair='#0f0b09', hair_style='ponytail', stubble=0.0, brows=0.85, eye='#2a1a10', tex=2048, hero=True,
        top='#56603f', top_kind='jacket', inner='#d8d2c4', bottom='#3a3530', bottom_kind='cargo', shoes='#4a3a2a', shoe_kind='boots',
        gear=['satchel', 'badge'], expr_race='asian',
    ),
    'reyes': dict(
        height=1.84, gender=1.0, age=38, muscle=0.88, weight=0.62, prop=0.6, race={'caucasian': 0.55, 'african': 0.25, 'asian': 0.2},
        face={'head/head-square': 0.55, 'nose/nose-flaring-incr': 0.35, 'nose/nose-scale-horiz-incr': 0.2, 'chin/chin-width-incr': 0.35, 'neck/neck-scale-horiz-incr': 0.45,
              'eyebrows/eyebrows-trans-down': 0.2, 'mouth/mouth-scale-horiz-incr': 0.15},
        skin='#a8754f', hair='#120e0d', hair_style='buzz', stubble=0.2, beard=True, brows=1.0, eye='#1e140c', tex=2048, hero=True,
        top='#3a3f33', top_kind='combat', inner='#3a3f33', accent='#4e5340', bottom='#3a3c32', bottom_kind='cargo', shoes='#262420', shoe_kind='boots',
        gear=['vest', 'holster', 'radio', 'gloves', 'backpack'],
    ),
    'voss': dict(
        height=1.78, gender=1.0, age=62, muscle=0.4, weight=0.5, prop=0.6, race={'caucasian': 1.0},
        face={'head/head-age-incr': 0.6, 'cheek/l-cheek-volume-decr': 0.35, 'cheek/r-cheek-volume-decr': 0.35, 'nose/nose-scale-vert-incr': 0.25, 'nose/nose-point-down': 0.2,
              'ears/l-ear-scale-incr': 0.3, 'ears/r-ear-scale-incr': 0.3, 'head/head-oval': 0.3, 'eyebrows/eyebrows-angle-down': 0.2},
        skin='#d6b29c', hair='#b3b0ab', hair_style='grey', stubble=0.3, brows=0.75, eye='#4a5a6a', tex=2048, hero=True,
        top='#3c3e42', top_kind='longcoat', inner='#b8bcc0', bottom='#2a2b2f', bottom_kind='slacks', shoes='#151515', shoe_kind='dress',
        gear=['glasses', 'scarf', 'badge'], scarf='#6a2a2a',
    ),
    'ellie': dict(
        height=1.27, gender=0.0, age=8, muscle=0.5, weight=0.5, prop=0.5, race={'caucasian': 1.0},
        face={'cheek/l-cheek-volume-incr': 0.35, 'cheek/r-cheek-volume-incr': 0.35, 'nose/nose-point-up': 0.35, 'nose/nose-scale-vert-decr': 0.2, 'eyebrows/eyebrows-trans-up': 0.15},
        skin='#ecc4a2', hair='#5b3a24', hair_style='kid', stubble=0.0, brows=0.55, eye='#5a4020', tex=2048, hero=True,
        top='#f2c419', top_kind='raincoat', inner='#e8e4dc', bottom='#3a4f86', bottom_kind='jeans', shoes='#c8302c', shoe_kind='rainboots',
        gear=['hood'],
    ),
    'elias_teen': dict(
        height=1.76, gender=1.0, age=18, muscle=0.5, weight=0.4, prop=0.7, race={'caucasian': 1.0},
        face={'head/head-square': 0.2, 'nose/nose-hump-incr': 0.1, 'eyebrows/eyebrows-trans-down': 0.2},
        skin='#cc9e80', hair='#231711', hair_style='short', stubble=0.0, brows=0.8, eye='#4a3826', tex=1024,
        top='#3b5d48', top_kind='hoodie', inner='#3b5d48', bottom='#2a3550', bottom_kind='jeans', shoes='#e6e6e6', shoe_kind='sneakers',
        gear=[],
    ),
    'elias_child': dict(
        height=1.34, gender=1.0, age=9, muscle=0.5, weight=0.45, prop=0.5, race={'caucasian': 1.0},
        face={'nose/nose-point-up': 0.2},
        skin='#dcae8c', hair='#231711', hair_style='short', stubble=0.0, brows=0.6, eye='#4a3826', tex=1024,
        top='#c8d4dc', top_kind='gown', inner='#c8d4dc', bottom='#c8d4dc', bottom_kind='gown', shoes='#e8e8e8', shoe_kind='socks',
        gear=[],
    ),
    'civ_man': dict(
        height=1.79, gender=1.0, age=45, muscle=0.5, weight=0.6, prop=0.5, race={'caucasian': 0.8, 'african': 0.2}, lod=True,
        face={'head/head-round': 0.3, 'nose/nose-scale-horiz-incr': 0.2},
        skin='#c49070', hair='#2e241c', hair_style='short', stubble=0.35, brows=0.85, eye='#3a2a1a', tex=1024,
        top='#4a3a2e', top_kind='longcoat', inner='#a8a8a0', bottom='#2a2a30', bottom_kind='slacks', shoes='#1c1610', shoe_kind='dress',
        gear=['scarf'], scarf='#3a4a5a',
    ),
    'civ_woman': dict(
        height=1.67, gender=0.0, age=34, muscle=0.45, weight=0.45, prop=0.6, race={'caucasian': 0.7, 'african': 0.3}, lod=True,
        face={'head/head-oval': 0.3},
        skin='#c99a78', hair='#4a2c18', hair_style='bob', stubble=0.0, brows=0.8, eye='#3a2a1a', tex=1024,
        top='#6b2b3a', top_kind='jacket', inner='#e0dcd0', bottom='#2a2a33', bottom_kind='skirt', shoes='#1a1a1a', shoe_kind='dress',
        gear=['satchel'],
    ),
    'civ_office': dict(
        height=1.76, gender=1.0, age=36, muscle=0.5, weight=0.5, prop=0.6, race={'african': 0.85, 'caucasian': 0.15}, lod=True,
        face={'head/head-square': 0.2},
        skin='#7a4c32', hair='#100c0a', hair_style='buzz', stubble=0.2, brows=0.9, eye='#1e140c', tex=1024,
        top='#2e3440', top_kind='suit', inner='#e8e8e4', bottom='#2e3440', bottom_kind='slacks', shoes='#141414', shoe_kind='dress',
        gear=['tie'], tie='#6a1a20', expr_race='african',
    ),
    'civ_nurse': dict(
        height=1.64, gender=0.0, age=28, muscle=0.45, weight=0.42, prop=0.6, race={'asian': 0.5, 'caucasian': 0.5}, lod=True,
        face={},
        skin='#d6a07c', hair='#1a120c', hair_style='ponytail', stubble=0.0, brows=0.8, eye='#2a1a10', tex=1024,
        top='#5a8a9a', top_kind='scrubs', inner='#5a8a9a', bottom='#5a8a9a', bottom_kind='scrubs', shoes='#e8e8e8', shoe_kind='sneakers',
        gear=['badge'],
    ),
    'civ_kid': dict(
        height=1.22, gender=1.0, age=7, muscle=0.5, weight=0.5, prop=0.5, race={'african': 0.4, 'caucasian': 0.6}, lod=True,
        face={},
        skin='#b07e5c', hair='#1a120c', hair_style='short', stubble=0.0, brows=0.6, eye='#2a1a10', tex=1024,
        top='#c04030', top_kind='hoodie', inner='#c04030', bottom='#2a3a5a', bottom_kind='jeans', shoes='#2a2a2a', shoe_kind='sneakers',
        gear=['backpack'], accent='#2a4a8a',
    ),
    'remnant': dict(
        height=1.98, gender=1.0, age=40, muscle=0.25, weight=0.0, prop=0.0, race={'caucasian': 0.4, 'african': 0.3, 'asian': 0.3}, lod=True, remnant=True,
        face={'head/head-scale-vert-incr': 0.4, 'cheek/l-cheek-volume-decr': 1.0, 'cheek/r-cheek-volume-decr': 1.0, 'neck/neck-scale-vert-incr': 0.8},
        skin='#0c0c10', hair='#050505', hair_style='none', stubble=0.0, brows=0.0, eye='#000000', tex=1024,
        top='#121216', top_kind='rags', inner='#121216', bottom='#0e0e12', bottom_kind='rags', shoes='#0a0a0a', shoe_kind='none',
        gear=[],
    ),
}

FINGERS = [1, 2, 3, 4, 5]


# ============================================================================ body from MakeHuman
def morph_body(s):
    V0, groups = mh.load_base()
    V = V0.copy()
    mh.apply_macros(V, s['gender'], s['age'], s['muscle'], s['weight'], s.get('prop', 0.5), s['race'])
    for t, w in s.get('face', {}).items():
        mh.apply(V, t, w)
    if s.get('remnant'):
        for t in ('armslegs/l-lowerarm-scale-vert-incr', 'armslegs/r-lowerarm-scale-vert-incr', 'armslegs/l-hand-scale-incr', 'armslegs/r-hand-scale-incr',
                  'armslegs/l-upperarm-scale-vert-incr', 'armslegs/r-upperarm-scale-vert-incr'):
            mh.apply(V, t, 1.0)
    Vb = mh.to_blender(V)
    body_idx = mh.group_verts(groups, 'body')
    zmin = Vb[body_idx, 2].min()
    zmax = Vb[body_idx, 2].max()
    scale = s['height'] / (zmax - zmin)
    Vb[:, 2] -= zmin
    Vb *= scale
    return Vb, groups, scale


def mesh_from_groups(name, Vb, groups, names):
    faces = []
    for g in names:
        faces += groups.get(g, [])
    used = sorted({i for f in faces for i in f})
    remap = {o: n for n, o in enumerate(used)}
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(Vb[i]) for i in used], [], [[remap[i] for i in f] for f in faces])
    me.update()
    ob = link(bpy.data.objects.new(name, me))
    return ob, used, remap


def adjacency(me):
    nb = [set() for _ in me.vertices]
    for e in me.edges:
        a, b = e.vertices
        nb[a].add(b)
        nb[b].add(a)
    return [list(x) for x in nb]


def laplacian(co, nb, mask, iters, fac=0.5):
    co = co.copy()
    idx = np.nonzero(mask)[0]
    for _ in range(iters):
        new = co.copy()
        for i in idx:
            n = nb[i]
            if n:
                new[i] = co[i] * (1 - fac) + co[n].mean(axis=0) * fac
        co = new
    return co


def seg_t(p, a, b):
    ab = b - a
    t = np.dot(p - a, ab) / max(1e-9, np.dot(ab, ab))
    return t, np.linalg.norm(p - (a + ab * np.clip(t, 0, 1)))


def build_body_mh(s, Vb, groups, J):
    k = s['height'] / 1.8
    ob, used, remap = mesh_from_groups('Body', Vb, groups, ['body'])
    me = ob.data
    smooth(ob)
    co = np.array([v.co[:] for v in me.vertices])
    nb = adjacency(me)
    tk, bk = s['top_kind'], s['bottom_kind']
    rem = s.get('remnant')
    neckz = J['neck'][2]
    collar_z = neckz - 0.004 * k
    waist_z = J['hips'][2] + 0.06 * k
    ankle_z = J['l-ankle'][2] + 0.05 * k
    zones = np.zeros(len(co), dtype=np.int32)  # 0 skin, 1 top, 2 inner, 3 bottom, 4 shoe, 5 hand
    short_sleeve = tk in ('scrubs', 'gown')
    hand_segs = {}
    for side in 'lr':
        segs = [(J[f'{side}-hand'], J[f'{side}-finger-3-1'], 0.05 * k)]
        for f in FINGERS:
            pts = [J[f'{side}-hand']] + [J[f'{side}-finger-{f}-{j}'] for j in range(1, 5)]
            for j in range(len(pts) - 1):
                segs.append((pts[j], pts[j + 1], 0.016 * k))
        hand_segs[side] = segs
    for i, p in enumerate(co):
        side = 'l' if p[0] >= 0 else 'r'
        sh, el, wr = J[f'{side}-shoulder'], J[f'{side}-elbow'], J[f'{side}-hand']
        ta, da = seg_t(p, sh, wr)
        if ta > 0.9 and not rem:
            if any(seg_t(p, a_, b_)[1] < r_ for a_, b_, r_ in hand_segs[side]) and seg_t(p, sh, wr)[0] > 0.97:
                zones[i] = 5
                continue
        on_arm = da < 0.085 * k * (1.3 if s['age'] > 14 else 1.0) and abs(p[0]) > abs(sh[0]) * 0.75 and ta > -0.05
        if rem:
            zones[i] = 1
            continue
        if on_arm:
            if ta > 1.0:
                zones[i] = 5
            elif short_sleeve and ta > 0.42:
                zones[i] = 0
            elif ta > 0.96:
                zones[i] = 0
            else:
                zones[i] = 1
            continue
        if p[2] > collar_z:
            zones[i] = 0 if (p[2] > collar_z + 0.014 * k or math.hypot(p[0], p[1] - J['neck'][1]) < 0.068 * k) else 1
            continue
        if p[2] > waist_z:
            zones[i] = 1
            if tk in ('longcoat', 'suit') and p[1] < J['neck'][1] - 0.05 * k and abs(p[0]) < (0.012 + 0.05 * max(0.0, (p[2] - waist_z) / (collar_z - waist_z)) ** 1.4) * k:
                zones[i] = 2
            continue
        if p[2] < ankle_z and s['shoe_kind'] != 'none':
            zones[i] = 4 if s['shoe_kind'] != 'socks' else 4
            continue
        if bk in ('skirt',) and p[2] < J['l-knee'][2] - 0.02 * k:
            zones[i] = 0
            continue
        zones[i] = 3
    # garment shaping: smooth away anatomy under clothes, then inflate along normals
    clothed = zones != 0
    clothed &= zones != 5
    co = laplacian(co, nb, clothed & (zones != 4), 5, 0.5)
    if s['shoe_kind'] == 'socks':
        co = laplacian(co, nb, zones == 4, 4, 0.4)
    if 'gloves' in s['gear']:
        co = laplacian(co, nb, zones == 5, 2, 0.3)
    for i, v in enumerate(me.vertices):
        v.co = co[i]
    me.update()
    normals = np.array([v.normal[:] for v in me.vertices])
    off = np.zeros(len(co))
    top_off = {'jacket': 0.016, 'combat': 0.008, 'hoodie': 0.014, 'raincoat': 0.017, 'longcoat': 0.018, 'suit': 0.01, 'scrubs': 0.006, 'gown': 0.008, 'rags': 0.0}.get(tk, 0.01)
    bot_off = {'jeans': 0.013, 'cargo': 0.019, 'slacks': 0.014, 'skirt': 0.012, 'scrubs': 0.009, 'gown': 0.01, 'rags': 0.0}.get(bk, 0.008)
    for i, p in enumerate(co):
        z = zones[i]
        if z in (1, 2):
            side = 'l' if p[0] >= 0 else 'r'
            ta, da = seg_t(p, J[f'{side}-shoulder'], J[f'{side}-hand'])
            arm = da < 0.085 * k and abs(p[0]) > abs(J[f'{side}-shoulder'][0]) * 0.75
            off[i] = top_off * (0.75 if arm and ta > 0.5 else 1.0) * (0.7 if z == 2 else 1.0)
        elif z == 3:
            off[i] = bot_off
        elif z == 4:
            off[i] = {'boots': 0.016, 'rainboots': 0.02, 'sneakers': 0.012, 'dress': 0.009, 'socks': 0.003}.get(s['shoe_kind'], 0.012)
        elif z == 5 and 'gloves' in s['gear']:
            off[i] = 0.002
    # blend offsets across zone borders so garments taper into cuffs instead of stepping
    for _ in range(3):
        new = off.copy()
        for i in range(len(off)):
            if nb[i] and zones[i] != 0:
                new[i] = 0.5 * off[i] + 0.5 * off[nb[i]].mean()
        off = new
    co = co + normals * (off * k)[:, None]
    # shoes: flatten the sole, extend toe & heel slightly
    if s['shoe_kind'] not in ('none', 'socks'):
        for i in np.nonzero(zones == 4)[0]:
            if co[i, 2] < 0.012 * k:
                co[i, 2] = 0.0
            if co[i, 2] < 0.03 * k:
                fwd = -co[i, 1] + J['l-ankle'][1]
                co[i, 1] -= 0.008 * k * np.clip(fwd / (0.1 * k), 0, 1)
    if rem:
        for i in range(len(co)):
            n = noise.noise(Vector(co[i] * 14))
            co[i] += normals[i] * n * 0.012
    for i, v in enumerate(me.vertices):
        v.co = co[i]
    me.update()
    return ob, used, remap, zones


def assign_body_zones(ob, s, zones, J):
    me = ob.data
    tk, bk = s['top_kind'], s['bottom_kind']
    me.materials.clear()
    if s.get('remnant'):
        me.materials.append(get_mat('remnant'))
        solid_col(ob, lin(C(s['skin'])))
        return
    bottom_mat = 'denim' if bk == 'jeans' else 'bottom'
    shoe_mat = 'rubber' if s['shoe_kind'] in ('rainboots', 'sneakers') else ('top' if s['shoe_kind'] == 'socks' else 'leather')
    hand_mat = 'leather' if 'gloves' in s['gear'] else 'skin'
    slots = ['skin', 'top', 'inner', bottom_mat, shoe_mat, hand_mat]
    for m in slots:
        me.materials.append(get_mat(m))
    for poly in me.polygons:
        zs = [zones[v] for v in poly.vertices]
        poly.material_index = max(set(zs), key=zs.count)
    skin = lin(C(s['skin']))
    cols = {0: skin, 1: lin(C(s['top'])), 2: lin(C(s['inner'])), 3: lin(C(s['bottom'])), 4: lin(C(s['shoes'])), 5: (0.03, 0.03, 0.03) if 'gloves' in s['gear'] else skin}
    k = s['height'] / 1.8
    eyeL, eyeR = Vector(J['l-eye']), Vector(J['r-eye'])
    eyec = (eyeL + eyeR) / 2
    hair = lin(C(s['hair']))
    stub = s.get('stubble', 0)
    brows = s.get('brows', 0.8)
    lipc = tuple(c * f for c, f in zip(skin, (0.82, 0.58, 0.56)))
    mouth = Vector(J['mouth']) if 'mouth' in J else eyec + Vector((0, -0.01, -0.07 * k))
    sole = (0.88, 0.88, 0.86) if s['shoe_kind'] == 'sneakers' else (0.025, 0.022, 0.02)
    ears_z = eyec.z
    attr = me.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
    head_k = (eyeL - eyeR).length / 0.064

    for i, v in enumerate(me.vertices):
        p = v.co
        z = int(zones[i])
        c = Vector(cols[z])
        if z == 4 and p.z < 0.014 * k:
            c = Vector(sole)
        if z == 0 and p.z > J['neck'][2]:
            # ---- face painting in eye-relative space
            for eye, sx in ((eyeL, 1), (eyeR, -1)):
                d = p - eye
                # eyebrows: arch above each eye
                u = (d.x * sx) / head_k
                bz = 0.017 * head_k + 0.004 * head_k * math.cos((u - 0.004) * 60)
                if -0.018 < u < 0.03 and d.y < 0.01:
                    w = gauss((d.z - bz) / head_k, 0.0055) * gauss(u - 0.006, 0.024) * brows
                    w *= 0.65 + 0.35 * noise.noise(p * 2400)
                    c = c.lerp(Vector(hair) * 0.7, min(1.0, w * 2.2))
                # under-eye shadow / lids
                c = c * (1 - 0.12 * gauss((d.length) / head_k, 0.014))
            # lips
            dm = p - mouth
            if dm.y < 0.015 * head_k:
                lw = gauss(dm.x / head_k, 0.02) * gauss(dm.z / head_k, 0.007)
                c = c.lerp(Vector(lipc), min(1.0, lw * 1.4))
            # cheeks
            for eye, sx in ((eyeL, 1), (eyeR, -1)):
                dc = p - (eye + Vector((0.012 * sx, -0.012, -0.03)) * head_k)
                c = c.lerp(Vector((min(1, skin[0] * 1.07), skin[1] * 0.86, skin[2] * 0.86)), 0.18 * gauss(dc.length / head_k, 0.022) * (1.7 if s['age'] < 14 else 1))
            # stubble/beard shadow
            if stub > 0 and p.z < mouth.z + 0.02 * head_k and p.y < J['neck'][1] + 0.02 * head_k and p.z > J['neck'][2] + 0.0:
                region = 1 - gauss((p - mouth).length / head_k, 0.011) * 0.8
                region *= np.clip((J['neck'][1] + 0.03 * head_k - p.y) / (0.04 * head_k), 0, 1)
                nb_ = 0.7 + 0.3 * noise.noise(p * 2600)
                c = c.lerp(Vector(hair) * 0.75 + Vector(skin) * 0.3, stub * region * 0.55 * nb_)
            # scalp: buzz cut painted as hair colour
            if s['hair_style'] == 'buzz' and p.z > eyec.z + 0.035 * head_k and p.y > eyec.y + 0.02 * head_k * 0:
                hl = np.clip((p.z - (eyec.z + 0.04 * head_k)) / (0.015 * head_k), 0, 1)
                if p.y > eyec.y - 0.0:
                    c = c.lerp(Vector(hair) * 0.9 + Vector(skin) * 0.15, hl * (0.8 + 0.2 * noise.noise(p * 3000)))
        attr.data[i].color = (c.x, c.y, c.z, 1)


def build_eyes(s, Vb, groups, J):
    parts = []
    iris = lin(C(s['eye']))
    for side, sx in (('l', 1), ('r', -1)):
        idx = mh.group_verts(groups, f'helper-{side}-eye')
        pts = Vb[idx]
        ctr = Vector(pts.mean(axis=0))
        r = float(np.linalg.norm(pts - pts.mean(axis=0), axis=1).max()) * 0.98
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=20, v_segments=14, radius=r)
        bmesh.ops.translate(bm, vec=ctr, verts=bm.verts)
        eo = from_bm('Eye', bm)
        smooth(eo)
        set_slot(eo, 'eye')

        def eyecol(p, ec=ctr):
            d = (p - ec).normalized()
            a = math.degrees(math.acos(max(-1, min(1, -d.y))))
            if a < 11:
                return (0.004, 0.003, 0.003)
            if a < 28:
                return tuple(c * (0.45 + 0.55 * (a - 11) / 17) for c in iris)
            if a < 32:
                return (0.03, 0.025, 0.02)
            return (0.66, 0.62, 0.58)

        vcol(eo, eyecol)
        parts.append(eo)
    # eyelashes from the MakeHuman lash helpers
    lash_groups = [g for g in groups if 'eyelashes' in g]
    if lash_groups and not s.get('lod'):
        lo, _, _ = mesh_from_groups('Lashes', Vb, groups, lash_groups)
        sol = lo.modifiers.new('Sol', 'SOLIDIFY')
        sol.thickness = 0.0006
        apply_mods(lo)
        set_slot(lo, 'hair')
        solid_col(lo, (0.01, 0.008, 0.007))
        parts.append(lo)
    return parts


def build_hair_mh(s, body, J):
    """Hair grown from the scalp of the (morphed) body: a fitted cap with a soft hairline + style volumes."""
    style = s['hair_style']
    if style in ('none', 'buzz'):
        return []
    k = s['height'] / 1.8
    hair = lin(C(s['hair']))
    eyeL, eyeR = Vector(J['l-eye']), Vector(J['r-eye'])
    eyec = (eyeL + eyeR) / 2
    hk = (eyeL - eyeR).length / 0.064
    lod = s.get('lod')
    hl = {  # hairline height (eye-relative, metres at hk=1) by azimuth: front, temple, side, back
        'short': (0.043, 0.036, 0.016, -0.062), 'grey': (0.07, 0.052, 0.018, -0.06), 'ponytail': (0.04, 0.03, 0.006, -0.07),
        'bob': (0.035, 0.022, -0.02, -0.075), 'kid': (0.03, 0.018, -0.02, -0.075), 'long': (0.035, 0.022, -0.02, -0.08),
    }[style]

    def hairline(d):
        th = abs(math.atan2(d.x, -d.y))  # 0 = front, pi = back
        if th < 0.9:
            return hl[0] + (hl[1] - hl[0]) * (th / 0.9) + 0.18 * d.x * d.x
        if th < 1.75:
            return hl[1] + (hl[2] - hl[1]) * ((th - 0.9) / 0.85)
        return hl[2] + (hl[3] - hl[2]) * ((th - 1.75) / (math.pi - 1.75))

    bm = bmesh.new()
    bm.from_mesh(body.data)
    keep = set()
    for f in bm.faces:
        c = f.calc_center_median()
        d = (c - eyec) / hk
        if d.z > hairline(d) and c.z > J['neck'][2] + 0.04 * k:
            keep.add(f.index)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.index not in keep], context='FACES')
    # thickness falloff towards the hairline
    bm.verts.ensure_lookup_table()
    ring = {v.index: 0 for v in bm.verts if v.is_boundary}
    frontier = list(ring)
    for depth in (1, 2, 3, 4):
        nxt = []
        for vi in frontier:
            for e_ in bm.verts[vi].link_edges:
                o = e_.other_vert(bm.verts[vi]).index
                if o not in ring:
                    ring[o] = depth
                    nxt.append(o)
        frontier = nxt
    for vt in bm.verts:
        if vt.index in ring and ring[vt.index] <= 1:
            d = (vt.co - eyec) / hk
            target_z = eyec.z + hairline(d) * hk
            w = 1.0 if ring[vt.index] == 0 else 0.5
            vt.co.z = vt.co.z + (target_z - vt.co.z) * w
    me = bpy.data.meshes.new('Hair')
    bm.to_mesh(me)
    bm.free()
    ob = link(bpy.data.objects.new('Hair', me))
    ob.data.materials.clear()
    for a in list(ob.data.color_attributes):
        ob.data.color_attributes.remove(a)
    if ob.data.shape_keys:
        ob.shape_key_clear()
    smooth(ob)
    weights = {vi: [0.06, 0.3, 0.55, 0.78, 0.93][d] for vi, d in ring.items()}
    vg = ob.vertex_groups.new(name='thick')
    for v in ob.data.vertices:
        vg.add([v.index], weights.get(v.index, 1.0), 'REPLACE')
    # style volume before solidify: lift the crown
    thick = {'short': 0.016, 'grey': 0.01, 'ponytail': 0.009, 'bob': 0.02, 'kid': 0.018, 'long': 0.018}[style]
    vol = {'short': 0.012, 'grey': 0.004, 'ponytail': 0.002, 'bob': 0.012, 'kid': 0.012, 'long': 0.01}[style]
    for v in ob.data.vertices:
        d = (v.co - eyec) / hk
        w = weights.get(v.index, 1.0)
        crown = max(0.0, min(1.0, (d.z - 0.04) / 0.06))
        v.co += v.normal * vol * hk * crown * w
    sol = ob.modifiers.new('Sol', 'SOLIDIFY')
    sol.thickness = thick * hk
    sol.offset = 1
    sol.vertex_group = 'thick'
    sol.thickness_vertex_group = 0.04
    apply_mods(ob)
    ob.vertex_groups.clear()
    # long styles: extend a curtain down from the side/back edge
    if style in ('bob', 'kid', 'long'):
        length = {'bob': 0.1, 'kid': 0.14, 'long': 0.28}[style] * hk
        bm = bmesh.new()
        bm.from_mesh(ob.data)
        edges = []
        for e_ in bm.edges:
            if e_.is_boundary:
                c = (e_.verts[0].co + e_.verts[1].co) / 2
                d = (c - eyec) / hk
                if not (d.y < -0.02 and abs(d.x) < 0.07):
                    edges.append(e_)
        if edges:
            ret = bmesh.ops.extrude_edge_only(bm, edges=edges)
            vs = [g for g in ret['geom'] if isinstance(g, bmesh.types.BMVert)]
            for vt in vs:
                d = (vt.co - eyec) / hk
                out = Vector((d.x, d.y + 0.01, 0)).normalized()
                lenf = 1.0 if d.y > -0.02 else 0.75
                vt.co += Vector((0, 0, -length * lenf)) + out * 0.012 * hk
        bm.to_mesh(ob.data)
        bm.free()
        sol = ob.modifiers.new('Sol', 'SOLIDIFY')
        sol.thickness = 0.004 * hk
        apply_mods(ob)
    for v in ob.data.vertices:
        n1 = noise.noise(Vector((v.co.x * 170, v.co.y * 170, v.co.z * 26)))
        n2 = noise.noise(Vector((v.co.x * 45, v.co.y * 45, v.co.z * 45)))
        v.co += v.normal * (n1 * 0.0018 + n2 * 0.0028) * hk
    smooth(ob)
    set_slot(ob, 'hair')

    def hcol(o):
        vcol(o, lambda p: tuple(c * (0.8 + 0.35 * noise.noise(Vector((p.x * 220, p.y * 220, p.z * 40)))) for c in hair))

    hcol(ob)
    parts = [ob]
    from mathutils.bvhtree import BVHTree
    dg = bpy.context.evaluated_depsgraph_get()
    bvh = BVHTree.FromObject(ob, dg)
    ctr = eyec + Vector((0, 0.03, 0.025)) * hk

    def surf(direction, lift=0.0015):
        d = Vector(direction).normalized()
        best = None
        o = ctr
        for _ in range(3):  # take the outermost hit (outer shell of the solidified cap)
            hit = bvh.ray_cast(o + d * 0.0005, d, 0.3)
            if hit[0] is None:
                break
            best = hit[0]
            o = hit[0]
        return (best + d * lift * hk) if best is not None else ctr + d * 0.1 * hk

    def lock(dirs, w, name='Lock'):
        pts = [tuple(surf(dd)) for dd in dirs]
        n = len(pts) - 1
        rad = [(w * hk * (1 - 0.7 * i / n), w * hk * 0.35 * (1 - 0.6 * i / n)) for i in range(n + 1)]
        lk = tube(name, pts, rad, seg=7)
        set_slot(lk, 'hair')
        hcol(lk)
        return lk

    def sph(az, el):
        return (math.sin(az) * math.cos(el), -math.cos(az) * math.cos(el), math.sin(el))

    if s.get('beard'):
        parts += beard_cap(s, body, J)
    if not lod:
        if style == 'short':
            for i in range(7):
                a0 = 0.3 - i * 0.02
                e0 = 1.15 - i * 0.06
                dirs = [sph(a0 + (-0.45 - i * 0.1 - a0) * t, e0 + (0.5 + i * 0.012 - e0) * t) for t in np.linspace(0, 1, 7)]
                parts.append(lock(dirs, 0.012))
        elif style == 'grey':
            for i in range(9):
                az = (i - 4) * 0.22
                dirs = [sph(az * (1 + t * 0.4), 0.75 + t * 0.9) for t in np.linspace(0, 1, 6)]
                parts.append(lock(dirs, 0.014))
        elif style == 'ponytail':
            base = surf(sph(math.pi, 0.25), 0.0)
            pts = [base, base + Vector((0, 0.03, -0.012)) * hk, base + Vector((0, 0.05, -0.07)) * hk, base + Vector((0, 0.045, -0.15)) * hk,
                   base + Vector((0, 0.03, -0.23)) * hk, base + Vector((0, 0.02, -0.29)) * hk]
            pt = tube('Pony', [tuple(p) for p in pts], [0.02 * hk, 0.028 * hk, 0.027 * hk, 0.02 * hk, 0.011 * hk, 0.002 * hk], seg=12)
            set_slot(pt, 'hair')
            hcol(pt)
            parts.append(pt)
            tie = tube('Tie', [tuple(base + Vector((0, 0.016, -0.005)) * hk), tuple(base + Vector((0, 0.027, -0.012)) * hk)], 0.019 * hk, seg=12)
            set_slot(tie, 'plastic')
            solid_col(tie, (0.02, 0.02, 0.02))
            parts.append(tie)
            for i in range(10):
                az = (i - 4.5) * 0.3
                dirs = [sph(az + (math.pi * (1 if az >= 0 else -1) - az) * t * 0.85, 0.45 + 0.6 * (1 - t) - 0.2 * t) for t in np.linspace(0, 1, 7)]
                parts.append(lock(dirs, 0.017))
        elif style in ('kid', 'bob'):
            for i in range(7):
                az = (i - 3) * 0.16
                dirs = [sph(az * (1 + t * 0.3), 1.1 - t * 0.85) for t in np.linspace(0, 1, 6)]
                parts.append(lock(dirs, 0.02, 'Bang'))
    return parts


def beard_cap(s, body, J):
    """Short full beard grown from the jaw/chin/upper-lip faces."""
    k = s['height'] / 1.8
    hair = lin(C(s['hair']))
    eyeL, eyeR = Vector(J['l-eye']), Vector(J['r-eye'])
    eyec = (eyeL + eyeR) / 2
    hk = (eyeL - eyeR).length / 0.064
    mouth = Vector(J['mouth'])
    bm = bmesh.new()
    bm.from_mesh(body.data)
    keep = set()
    for f in bm.faces:
        c = f.calc_center_median()
        d = (c - eyec) / hk
        dm = (c - mouth) / hk
        if c.z < J['neck'][2] + 0.01 * k:
            continue
        lipzone = abs(dm.x) < 0.024 and -0.009 < dm.z < 0.006 and dm.y < 0.0
        jaw = d.z < -0.045 and d.y < 0.035 and abs(d.x) < 0.075
        cheek = d.z < -0.02 and abs(d.x) > 0.045 and d.y < 0.02 and d.y > -0.08
        moust = abs(dm.x) < 0.028 and 0.006 < dm.z < 0.018 and dm.y < 0.0
        if (jaw or cheek or moust) and not lipzone:
            keep.add(f.index)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.index not in keep], context='FACES')
    me = bpy.data.meshes.new('Beard')
    bm.to_mesh(me)
    bm.free()
    ob = link(bpy.data.objects.new('Beard', me))
    for a in list(ob.data.color_attributes):
        ob.data.color_attributes.remove(a)
    if ob.data.shape_keys:
        ob.shape_key_clear()
    ob.data.materials.clear()
    sol = ob.modifiers.new('Sol', 'SOLIDIFY')
    sol.thickness = 0.004 * hk
    sol.offset = 1
    apply_mods(ob)
    for v in ob.data.vertices:
        v.co += v.normal * noise.noise(v.co * 400) * 0.0012 * hk
    smooth(ob)
    set_slot(ob, 'hair')
    vcol(ob, lambda p: tuple(c * (0.7 + 0.4 * noise.noise(p * 500)) for c in hair))
    return [ob]


def build_shoes_mh(s, body, zones, J):
    """Model footwear around each foot and remove the bare-foot faces beneath."""
    kind = s['shoe_kind']
    if kind in ('none', 'socks'):
        return []
    k = s['height'] / 1.8
    me = body.data
    co = np.array([v.co[:] for v in me.vertices])
    col = lin(C(s['shoes']))
    parts = []
    for side, sx in (('l', 1), ('r', -1)):
        idx = [i for i in np.nonzero(zones == 4)[0] if co[i, 0] * sx > 0]
        if not idx:
            continue
        P = co[idx]
        heel, toe = P[:, 1].max() + 0.008 * k, P[:, 1].min() - 0.012 * k
        cx = float(np.median(P[:, 0]))
        an = J[f'{side}-ankle']
        nsec = 11
        rings = []
        bm = bmesh.new()
        for i in range(nsec):
            u = i / (nsec - 1)
            y = heel + (toe - heel) * u
            band = P[np.abs(P[:, 1] - y) < 0.02 * k]
            if len(band):
                half = (band[:, 0].max() - band[:, 0].min()) / 2 + 0.01 * k
                xc = (band[:, 0].max() + band[:, 0].min()) / 2
                htop = band[:, 2].max() + 0.008 * k
            else:
                half, xc, htop = 0.04 * k, cx, 0.05 * k
            if u > 0.82:
                half *= 1 - (u - 0.82) * 2.2
                htop = max(0.035 * k, htop * (1 - (u - 0.82) * 1.6))
            if kind in ('boots',) and u < 0.4:
                htop = max(htop, an[2] + 0.06 * k)
            if kind == 'rainboots' and u < 0.45:
                htop = max(htop, an[2] + 0.17 * k)
            if kind == 'dress':
                htop = min(htop, an[2] - 0.005 * k) if u > 0.3 else htop
            ring = []
            seg = 16
            for kx in range(seg):
                a = 2 * math.pi * kx / seg
                ca, sa = math.cos(a), math.sin(a)
                # rounded box section: flat sole, slightly bulged sides
                x = xc + half * (abs(ca) ** 0.6) * math.copysign(1, ca)
                z = htop * (0.5 + 0.5 * math.copysign(abs(sa) ** 0.75, sa))
                ring.append(bm.verts.new((x, y, max(0.0, z))))
            rings.append(ring)
        for i in range(nsec - 1):
            for kx in range(16):
                bm.faces.new((rings[i][kx], rings[i][(kx + 1) % 16], rings[i + 1][(kx + 1) % 16], rings[i + 1][kx]))
        bm.faces.new(list(reversed(rings[0])))
        bm.faces.new(rings[-1])
        ob = from_bm('Shoe', bm)
        sub = ob.modifiers.new('Sub', 'SUBSURF')
        sub.levels = 1
        apply_mods(ob)
        for v in ob.data.vertices:
            if v.co.z < 0.004 * k:
                v.co.z = 0.0
        smooth(ob)
        mat = 'rubber' if kind in ('rainboots', 'sneakers') else 'leather'
        set_slot(ob, mat)
        sole = (0.9, 0.9, 0.88) if kind == 'sneakers' else (0.02, 0.018, 0.016)
        vcol(ob, lambda p: sole if p.z < 0.016 * k else col)
        parts.append((ob, f'foot.{"L" if sx > 0 else "R"}'))
        if kind in ('boots', 'sneakers', 'dress') and not s.get('lod'):
            for i in range(4):
                yy = heel + (toe - heel) * (0.38 + i * 0.075)
                band = P[np.abs(P[:, 1] - yy) < 0.02 * k]
                zt = (band[:, 2].max() + 0.012 * k) if len(band) else 0.07 * k
                lace = tube('Lace', [(cx - 0.02 * k, yy, zt), (cx + 0.02 * k, yy - 0.004 * k, zt)], 0.0025 * k, seg=5)
                set_slot(lace, 'nylon')
                solid_col(lace, (0.05, 0.04, 0.03) if kind != 'sneakers' else (0.92, 0.92, 0.92))
                parts.append((lace, f'foot.{"L" if sx > 0 else "R"}'))
    # remove bare feet hidden by the shoes
    bm = bmesh.new()
    bm.from_mesh(me)
    zl = zones
    kill = [f for f in bm.faces if all(zl[v.index] == 4 for v in f.verts)]
    bmesh.ops.delete(bm, geom=kill, context='FACES')
    bm.to_mesh(me)
    bm.free()
    return parts


# ============================================================================ armature
def build_armature_mh(s, J):
    arm = bpy.data.armatures.new('Armature')
    ao = link(bpy.data.objects.new('Armature', arm))
    activate(ao)
    bpy.ops.object.mode_set(mode='EDIT')
    eb = arm.edit_bones
    V = lambda n: Vector(J[n])
    top = Vector((0, J['head'][1], s['height']))
    rest = {}

    def bone(name, head, tail, parent=None, roll_vec=None, connect=False):
        b = eb.new(name)
        b.head = head
        b.tail = tail
        if roll_vec is not None:
            b.align_roll(roll_vec)
        if parent:
            b.parent = eb[parent]
            b.use_connect = connect
        return b

    def hinge(name, head, tail, parent_dir, parent, fallback):
        """Bone whose local X is the joint's flexion axis; returns rest flexion angle."""
        y = (tail - head).normalized()
        a = parent_dir.cross(y)
        if a.length < 0.05:
            a = Vector(fallback)
        a = (a - y * a.dot(y)).normalized()
        z = a.cross(y)
        if parent_dir.dot(z) > 0:  # flexion must move the child away from the parent direction
            a = -a
            z = a.cross(y)
        b = bone(name, head, tail, parent, z, True)
        ang = parent_dir.angle(y)
        return ang

    pelvis = V('pelvis')
    bone('hips', pelvis, V('spine-3'), roll_vec=Vector((0, -1, 0)))
    bone('spine', V('spine-3'), V('spine-1'), 'hips', Vector((0, -1, 0)), True)
    bone('chest', V('spine-1'), V('neck'), 'spine', Vector((0, -1, 0)), True)
    bone('neck', V('neck'), V('head'), 'chest', Vector((0, -1, 0)), True)
    bone('head', V('head'), top, 'neck', Vector((0, -1, 0)), True)
    for side, S in (('l', 'L'), ('r', 'R')):
        sh = V(f'{side}-shoulder')
        el = V(f'{side}-elbow')
        wr = V(f'{side}-hand')
        mid = V(f'{side}-finger-3-1')
        bone(f'shoulder.{S}', V(f'{side}-clavicle'), sh, 'chest', Vector((0, -1, 0)))
        bone(f'upperarm.{S}', sh, el, f'shoulder.{S}', Vector((0, -1, 0)), True)
        rest[f'forearm.{S}'] = hinge(f'forearm.{S}', el, wr, (el - sh).normalized(), f'upperarm.{S}', (-1, 0, 0))
        bone(f'hand.{S}', wr, mid, f'forearm.{S}', Vector((0, -1, 0)), True)
        # fingers
        palm_n = (V(f'{side}-finger-2-1') - V(f'{side}-finger-5-1')).cross(mid - wr).normalized()
        if side == 'r':
            palm_n = -palm_n
        for f in FINGERS:
            pts = [V(f'{side}-finger-{f}-{j}') for j in range(1, 5)]
            prev_dir = (pts[0] - wr).normalized()
            parent = f'hand.{S}'
            for j in range(3):
                name = f'f{f}{j + 1}.{S}'
                y = (pts[j + 1] - pts[j]).normalized()
                z = -palm_n if f != 1 else (-palm_n + (mid - wr).normalized() * 0.3).normalized()
                bone(name, pts[j], pts[j + 1], parent, z, j > 0)
                rest[name] = prev_dir.angle(y)
                prev_dir = y
                parent = name
        th = V(f'{side}-upper-leg')
        kn = V(f'{side}-knee')
        an = V(f'{side}-ankle')
        toe = V(f'{side}-foot-2') if f'{side}-foot-2' in J else an + Vector((0, -0.13, -0.06))
        bone(f'thigh.{S}', th, kn, 'hips', Vector((0, -1, 0)))
        rest[f'shin.{S}'] = hinge(f'shin.{S}', kn, an, (kn - th).normalized(), f'thigh.{S}', (1, 0, 0))
        y = (toe - an).normalized()
        bone(f'foot.{S}', an, toe, f'shin.{S}', Vector((0, 0, 1)) - y * y.z, True)
    bpy.ops.object.mode_set(mode='OBJECT')
    return ao, rest


# ============================================================================ animation with rest correction
class MHAnimator(bc.Animator):
    def __init__(self, arm, s):
        super().__init__(arm, s)
        self.rest_flex = s['_rest_flex']
        self.k = s['height'] / 1.8
        # corrections taking MakeHuman's rest pose to the canonical rest the poses were authored for
        self.corr = {}
        A = bc.ARM_A
        for S, sx in (('L', 1), ('R', -1)):
            ua = arm.data.bones[f'upperarm.{S}']
            d = (ua.tail_local - ua.head_local).normalized()
            self.corr[f'upperarm.{S}'] = d.rotation_difference(Vector((math.sin(A) * sx, 0, -math.cos(A))))
            th = arm.data.bones[f'thigh.{S}']
            d = (th.tail_local - th.head_local).normalized()
            self.corr[f'thigh.{S}'] = d.rotation_difference(Vector((0.03 * sx, 0, -1)).normalized())
            fa = arm.data.bones[f'forearm.{S}']
            hd = arm.data.bones[f'hand.{S}']
            d0 = (fa.tail_local - fa.head_local).normalized()
            d1 = (hd.tail_local - hd.head_local).normalized()
            self.corr[f'hand.{S}'] = d1.rotation_difference(d0).slerp(Quaternion(), 0.3)
            ft = arm.data.bones[f'foot.{S}']
            sh = arm.data.bones[f'shin.{S}']
        self.hinge_names = set(bc.HINGES) | {b.name for b in arm.data.bones if b.name.startswith('f') and b.name[1].isdigit()}

    def apply(self, pose):
        for b in self.pb:
            b.rotation_quaternion = Quaternion()
            b.location = Vector()
        fing = {S: pose.get(f'fingers.{S}', 0.35) for S in 'LR'}
        thumb = {S: pose.get(f'thumb.{S}', 0.2) for S in 'LR'}
        index = {S: pose.get(f'index.{S}', fing[S]) for S in 'LR'}
        for b in self.pb:
            name = b.name
            if name in self.hinge_names:
                if name.startswith('f') and name[1].isdigit():
                    f = int(name[1])
                    seg = int(name[2])
                    S = name[-1]
                    c = thumb[S] if f == 1 else (index[S] if f == 2 else fing[S])
                    mult = (0.25, 0.7, 0.8)[seg - 1] if f == 1 else (0.9, 1.15, 0.8)[seg - 1]
                    spread = 0.0
                    val = c * mult
                    b.rotation_quaternion = Quaternion((1, 0, 0), val - self.rest_flex.get(name, 0.0) * (0.0 if seg == 1 else 0.6))
                else:
                    val = pose.get(name, 0.0)
                    b.rotation_quaternion = Quaternion((1, 0, 0), val - self.rest_flex.get(name, 0.0))
                continue
            val = pose.get(name)
            R = game_rot(*val) if val is not None else Quaternion()
            corr = self.corr.get(name)
            if corr is not None:
                R = R @ corr
            B = self.B[name]
            b.rotation_quaternion = B.inverted() @ R @ B
        if 'loc' in pose:
            v = pose['loc']
            B = self.B['hips']
            self.pb['hips'].location = B.inverted() @ (Vector((v[0], -v[2], v[1])) * self.k)


bc.Animator = MHAnimator


# ============================================================================ build
def build(name):
    reset()
    MATS.clear()
    s = dict(CAST[name])
    s['kid'] = s['age'] < 14
    s['female'] = s['gender'] < 0.5
    s['build'] = 1.0
    Vb, groups, scale = morph_body(s)
    J = mh.joint_positions(Vb, groups)
    J['hips'] = J['pelvis']
    k = s['height'] / 1.8
    # keys used by the shared detail builder
    Jd = {
        'hips': tuple(J['pelvis']), 'chest': tuple((J['spine-2'] + J['spine-1']) / 2), 'neck': tuple(J['neck']), 'head': tuple(J['head']),
        'shoulder': tuple(J['l-shoulder']), 'elbow': tuple(J['l-elbow']), 'wrist': tuple(J['l-hand']), 'thigh': tuple(J['l-upper-leg']),
        'knee': tuple(J['l-knee']), 'ankle': tuple(J['l-ankle']), 'toe': tuple(J.get('l-foot-2', J['l-ankle'])), 'head_top': (0, 0, s['height']),
    }
    arm, rest_flex = build_armature_mh(s, J)
    s['_rest_flex'] = rest_flex
    body, used, remap, zones = build_body_mh(s, Vb, groups, J)
    assign_body_zones(body, s, zones, J)
    # facial expression morphs (heroes)
    if s.get('hero'):
        deltas = mh.expression_deltas(s.get('expr_race', 'caucasian'))
        body.shape_key_add(name='Basis')
        for kname, d in deltas.items():
            sk = body.shape_key_add(name=kname)
            dd = mh.to_blender(d) * scale
            for o, n in remap.items():
                if dd[o].any():
                    sk.data[n].co = body.data.vertices[n].co + Vector(dd[o])
    eyes = build_eyes(s, Vb, groups, J) if not s.get('remnant') else []
    hair = build_hair_mh(s, body, J)
    shoes = build_shoes_mh(s, body, zones, J)
    s.setdefault('accent', s['top'])
    details = bc.build_details(s, Jd, (J['head'][1], J['head'][2], k), body)
    others = [(p, 'head') for p in eyes + hair] + shoes + details
    bc.bind(body, others, arm)
    ob = bc.finalize(s, name, body, [o for o, _ in others], arm)
    bc.make_anims(arm, s, 'hero' if name in ('elias', 'maya', 'reyes', 'voss', 'ellie') else ('companion' if name == 'elias_teen' else 'civ'))
    tris = sum(len(p.vertices) - 2 for p in ob.data.polygons)
    if PREVIEW:
        arm.animation_data.action = bpy.data.actions.get('idle')
        bpy.context.scene.frame_set(10)
        bc.SPECS[name] = s
        bc.preview(name, ob, arm)
        arm.animation_data.action = None
    activate(ob, [arm])
    path = os.path.join(OUT, f'{name}.glb')
    bpy.ops.export_scene.gltf(
        filepath=path, export_format='GLB', use_selection=True, export_animations=True,
        export_animation_mode='NLA_TRACKS', export_force_sampling=True, export_frame_step=1,
        export_def_bones=False, export_yup=True, export_apply=False, export_skins=True,
        export_image_format='JPEG', export_jpeg_quality=88, export_normals=True, export_tangents=False,
        export_colors=False, export_morph=bool(s.get('hero')), export_morph_normal=False, export_optimize_animation_size=True,
    )
    print(f'[char] {name}: tris={tris} -> {path} ({os.path.getsize(path) / 1024:.0f} KB)')


if __name__ == '__main__':
    names = bc.ONLY or list(CAST.keys())
    for n in names:
        build(n)
    print('ALL DONE')
