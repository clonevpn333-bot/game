"""
THE MISSING CITY — character pipeline (Blender 4.x, headless).

Builds every character procedurally: armature, sculpted body (Skin modifier + subdivision + shaping),
modeled head/face/eyes/ears/hair, hands, footwear and clothing details, auto-weighted skinning,
procedural shader networks baked to a PBR texture atlas, and a full keyframed animation set.

Usage:
  blender -b --python tools/blender/build_characters.py -- <out_dir> [char ...] [--preview] [--nobake]
"""
import bpy
import bmesh
import math
import os
import sys
import random
from mathutils import Vector, Matrix, Quaternion, Euler, noise

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else '/tmp/chars'
FLAGS = set(a for a in argv[1:] if a.startswith('--'))
ONLY = [a for a in argv[1:] if not a.startswith('--')]
PREVIEW = '--preview' in FLAGS
NOBAKE = '--nobake' in FLAGS
os.makedirs(OUT, exist_ok=True)

FPS = 30
ARM_A = math.radians(42)  # rest A-pose: arm angle from vertical

# ============================================================================ character specs
def C(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))


def lin(c):
    return tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c)


SPECS = {
    'elias': dict(
        height=1.80, build=1.0, kid=False, female=False, tex=2048,
        skin='#bf8f74', hair='#241812', hair_style='short', stubble=0.55,
        top='#283746', top_kind='jacket', inner='#2e2f31', bottom='#26282d', bottom_kind='jeans', shoes='#3d2b1f', shoe_kind='boots',
        gear=['chestlight', 'holster', 'radio', 'badge'], eye='#4a3826',
    ),
    'maya': dict(
        height=1.66, build=0.9, kid=False, female=True, tex=2048,
        skin='#d8ab88', hair='#100c0a', hair_style='ponytail', stubble=0,
        top='#55613f', top_kind='jacket', inner='#d8d2c4', bottom='#3a3530', bottom_kind='cargo', shoes='#4a3a2a', shoe_kind='boots',
        gear=['satchel', 'badge'], eye='#2a1a10',
    ),
    'reyes': dict(
        height=1.84, build=1.14, kid=False, female=False, tex=2048,
        skin='#a87452', hair='#141010', hair_style='buzz', stubble=0.0, beard=True,
        top='#3a3f33', top_kind='combat', inner='#3a3f33', accent='#4e5340', bottom='#3a3c32', bottom_kind='cargo', shoes='#262420', shoe_kind='boots',
        gear=['vest', 'holster', 'radio', 'gloves', 'backpack'], eye='#1e140c',
    ),
    'voss': dict(
        height=1.78, build=0.96, kid=False, female=False, tex=2048,
        skin='#d9b6a0', hair='#b0aeaa', hair_style='grey', stubble=0.25,
        top='#3c3e42', top_kind='longcoat', inner='#b8bcc0', bottom='#2a2b2f', bottom_kind='slacks', shoes='#151515', shoe_kind='dress',
        gear=['glasses', 'scarf', 'badge'], eye='#4a5a6a', scarf='#6a2a2a',
    ),
    'ellie': dict(
        height=1.27, build=1.0, kid=True, female=True, tex=2048,
        skin='#ecc4a2', hair='#5b3a24', hair_style='kid', stubble=0,
        top='#f2c419', top_kind='raincoat', inner='#e8e4dc', bottom='#3a4f86', bottom_kind='jeans', shoes='#c8302c', shoe_kind='rainboots',
        gear=['hood'], eye='#5a4020',
    ),
    'elias_teen': dict(
        height=1.76, build=0.92, kid=False, female=False, tex=1024,
        skin='#d0a080', hair='#241812', hair_style='short', stubble=0,
        top='#3b5d48', top_kind='hoodie', inner='#3b5d48', bottom='#2a3550', bottom_kind='jeans', shoes='#e6e6e6', shoe_kind='sneakers',
        gear=[], eye='#4a3826',
    ),
    'elias_child': dict(
        height=1.36, build=1.0, kid=True, female=False, tex=1024,
        skin='#dcae8c', hair='#241812', hair_style='short', stubble=0,
        top='#c8d4dc', top_kind='gown', inner='#c8d4dc', bottom='#c8d4dc', bottom_kind='gown', shoes='#e8e8e8', shoe_kind='socks',
        gear=[], eye='#4a3826',
    ),
    'civ_man': dict(
        height=1.79, build=1.05, kid=False, female=False, tex=1024, lod=True,
        skin='#c49070', hair='#2e241c', hair_style='short', stubble=0.3,
        top='#4a3a2e', top_kind='longcoat', inner='#a8a8a0', bottom='#2a2a30', bottom_kind='slacks', shoes='#1c1610', shoe_kind='dress',
        gear=['scarf'], eye='#3a2a1a', scarf='#3a4a5a',
    ),
    'civ_woman': dict(
        height=1.67, build=0.9, kid=False, female=True, tex=1024, lod=True,
        skin='#e4bea0', hair='#6a4426', hair_style='bob', stubble=0,
        top='#6b2b3a', top_kind='jacket', inner='#e0dcd0', bottom='#2a2a33', bottom_kind='skirt', shoes='#1a1a1a', shoe_kind='dress',
        gear=['satchel'], eye='#3a2a1a',
    ),
    'civ_office': dict(
        height=1.76, build=1.0, kid=False, female=False, tex=1024, lod=True,
        skin='#8a5a3c', hair='#141010', hair_style='buzz', stubble=0.2,
        top='#2e3440', top_kind='suit', inner='#e8e8e4', bottom='#2e3440', bottom_kind='slacks', shoes='#141414', shoe_kind='dress',
        gear=['tie'], eye='#1e140c', tie='#6a1a20',
    ),
    'civ_nurse': dict(
        height=1.64, build=0.92, kid=False, female=True, tex=1024, lod=True,
        skin='#d6a07c', hair='#1a120c', hair_style='ponytail', stubble=0,
        top='#5a8a9a', top_kind='scrubs', inner='#5a8a9a', bottom='#5a8a9a', bottom_kind='scrubs', shoes='#e8e8e8', shoe_kind='sneakers',
        gear=['badge'], eye='#2a1a10',
    ),
    'civ_kid': dict(
        height=1.22, build=1.0, kid=True, female=False, tex=1024, lod=True,
        skin='#c48c68', hair='#1a120c', hair_style='short', stubble=0,
        top='#c04030', top_kind='hoodie', inner='#c04030', bottom='#2a3a5a', bottom_kind='jeans', shoes='#2a2a2a', shoe_kind='sneakers',
        gear=['backpack'], eye='#2a1a10', accent='#2a4a8a',
    ),
    'remnant': dict(
        height=1.95, build=0.82, kid=False, female=False, tex=1024, remnant=True,
        skin='#0c0c10', hair='#050505', hair_style='none', stubble=0,
        top='#121216', top_kind='rags', inner='#121216', bottom='#0e0e12', bottom_kind='rags', shoes='#0a0a0a', shoe_kind='none',
        gear=[], eye='#000000',
    ),
}

# ============================================================================ utils
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.fps = FPS


def link(ob):
    bpy.context.collection.objects.link(ob)
    return ob


def activate(ob, others=()):
    bpy.ops.object.select_all(action='DESELECT') if bpy.context.mode == 'OBJECT' else None
    for o in others:
        o.select_set(True)
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob


def apply_mods(ob):
    activate(ob)
    for m in list(ob.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)


def new_mesh(name, verts, faces, edges=()):
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, list(edges), faces)
    me.update()
    return link(bpy.data.objects.new(name, me))


def from_bm(name, bm):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    return link(bpy.data.objects.new(name, me))


def set_slot(ob, matname):
    """Single material slot for the whole object."""
    ob.data.materials.clear()
    ob.data.materials.append(get_mat(matname))


def vcol(ob, fn):
    """Fill a point colour attribute from fn(world_co) -> rgb."""
    me = ob.data
    if 'Col' not in me.color_attributes:
        me.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
    attr = me.color_attributes['Col']
    mw = ob.matrix_world
    for i, v in enumerate(me.vertices):
        c = fn(mw @ v.co)
        attr.data[i].color = (c[0], c[1], c[2], 1.0)


def solid_col(ob, rgb):
    vcol(ob, lambda p: rgb)


def smooth(ob, angle=None):
    for p in ob.data.polygons:
        p.use_smooth = True


def gauss(d, r):
    return math.exp(-(d * d) / (r * r))


def prim(kind, **kw):
    bm = bmesh.new()
    if kind == 'sphere':
        bmesh.ops.create_uvsphere(bm, u_segments=kw.get('u', 16), v_segments=kw.get('v', 10), radius=kw.get('r', 1))
    elif kind == 'cube':
        bmesh.ops.create_cube(bm, size=1)
    elif kind == 'cyl':
        bmesh.ops.create_cone(bm, cap_ends=kw.get('caps', True), segments=kw.get('seg', 12), radius1=kw.get('r1', 1), radius2=kw.get('r2', 1), depth=kw.get('d', 1))
    elif kind == 'torus':
        pass
    return bm


def bm_transform(bm, loc=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1)):
    M = Matrix.Translation(loc) @ Euler(rot).to_matrix().to_4x4() @ Matrix.Diagonal((*scale, 1))
    bmesh.ops.transform(bm, matrix=M, verts=bm.verts)


def rounded_box(name, size, loc, rot=(0, 0, 0), bevel=0.01, seg=2):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1)
    bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
    if bevel > 0:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=min(bevel, min(size) * 0.45), segments=seg, affect='EDGES', profile=0.5)
    bm_transform(bm, loc, rot)
    ob = from_bm(name, bm)
    smooth(ob)
    return ob


def tube(name, pts, radii, seg=10, caps=True):
    """Polyline tube with per-point radius (for straps, cables, hair strands)."""
    bm = bmesh.new()
    rings = []
    n = len(pts)
    if isinstance(radii, (int, float)):
        radii = [radii] * n
    elif isinstance(radii, tuple) and len(radii) == 2 and all(isinstance(x, (int, float)) for x in radii):
        radii = [radii] * n
    for i, p in enumerate(pts):
        p = Vector(p)
        if i < n - 1:
            d = (Vector(pts[i + 1]) - p).normalized()
        else:
            d = (p - Vector(pts[i - 1])).normalized()
        up = Vector((0, 0, 1)) if abs(d.z) < 0.9 else Vector((1, 0, 0))
        a = d.cross(up).normalized()
        b = d.cross(a).normalized()
        r = radii[i] if isinstance(radii, (list, tuple)) else radii
        ring = []
        for k in range(seg):
            t = 2 * math.pi * k / seg
            rr = r if not isinstance(r, tuple) else None
            if isinstance(r, tuple):
                ring.append(bm.verts.new(p + a * math.cos(t) * r[0] + b * math.sin(t) * r[1]))
            else:
                ring.append(bm.verts.new(p + a * math.cos(t) * rr + b * math.sin(t) * rr))
        rings.append(ring)
    for i in range(n - 1):
        for k in range(seg):
            bm.faces.new((rings[i][k], rings[i][(k + 1) % seg], rings[i + 1][(k + 1) % seg], rings[i + 1][k]))
    if caps:
        bm.faces.new(list(reversed(rings[0])))
        bm.faces.new(rings[-1])
    ob = from_bm(name, bm)
    smooth(ob)
    return ob


def lathe(name, profile, center=(0, 0, 0), seg=20, sx=1.0, sy=1.0, close_top=True, close_bottom=True, rot=None):
    """profile: list of (radius, z) from bottom to top."""
    bm = bmesh.new()
    rings = []
    for r, z in profile:
        ring = []
        for k in range(seg):
            t = 2 * math.pi * k / seg
            ring.append(bm.verts.new((math.cos(t) * r * sx, math.sin(t) * r * sy, z)))
        rings.append(ring)
    for i in range(len(rings) - 1):
        for k in range(seg):
            bm.faces.new((rings[i][k], rings[i][(k + 1) % seg], rings[i + 1][(k + 1) % seg], rings[i + 1][k]))
    if close_bottom:
        bm.faces.new(list(reversed(rings[0])))
    if close_top:
        bm.faces.new(rings[-1])
    if rot:
        bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Euler(rot).to_matrix())
    bmesh.ops.translate(bm, vec=Vector(center), verts=bm.verts)
    ob = from_bm(name, bm)
    smooth(ob)
    return ob


# ============================================================================ materials (procedural, baked later)
MATS = {}


def nodes_clear(mat):
    nt = mat.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    return nt


def get_mat(name):
    if name in MATS:
        return MATS[name]
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = nodes_clear(mat)
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    nt.links.new(bsdf.outputs[0], out.inputs[0])
    col = nt.nodes.new('ShaderNodeVertexColor')
    col.layer_name = 'Col'
    tc = nt.nodes.new('ShaderNodeTexCoord')
    L = nt.links.new

    def noise_tex(scale, detail=4, rough=0.6, coord='Object'):
        n = nt.nodes.new('ShaderNodeTexNoise')
        n.inputs['Scale'].default_value = scale
        n.inputs['Detail'].default_value = detail
        n.inputs['Roughness'].default_value = rough
        L(tc.outputs[coord], n.inputs['Vector'])
        return n

    def mix_col(a, b, fac, blend='MULTIPLY'):
        m = nt.nodes.new('ShaderNodeMix')
        m.data_type = 'RGBA'
        m.blend_type = blend
        m.inputs[0].default_value = fac
        L(a, m.inputs[6])
        if isinstance(b, (tuple, list)):
            m.inputs[7].default_value = (*b, 1)
        else:
            L(b, m.inputs[7])
        return m.outputs[2]

    def ramp(src, stops):
        r = nt.nodes.new('ShaderNodeValToRGB')
        r.color_ramp.elements[0].position = stops[0][0]
        r.color_ramp.elements[0].color = (*stops[0][1], 1)
        r.color_ramp.elements[1].position = stops[-1][0]
        r.color_ramp.elements[1].color = (*stops[-1][1], 1)
        for p, c in stops[1:-1]:
            e = r.color_ramp.elements.new(p)
            e.color = (*c, 1)
        L(src, r.inputs[0])
        return r

    def bump(height_out, strength, dist=0.002, normal=None):
        b = nt.nodes.new('ShaderNodeBump')
        b.inputs['Strength'].default_value = strength
        b.inputs['Distance'].default_value = dist
        L(height_out, b.inputs['Height'])
        if normal is not None:
            L(normal, b.inputs['Normal'])
        return b.outputs['Normal']

    def weave(scale):
        # fabric weave: two crossing waves
        w1 = nt.nodes.new('ShaderNodeTexWave')
        w1.wave_type = 'BANDS'
        w1.bands_direction = 'X'
        w1.inputs['Scale'].default_value = scale
        w2 = nt.nodes.new('ShaderNodeTexWave')
        w2.wave_type = 'BANDS'
        w2.bands_direction = 'Z'
        w2.inputs['Scale'].default_value = scale
        L(tc.outputs['Object'], w1.inputs['Vector'])
        L(tc.outputs['Object'], w2.inputs['Vector'])
        m = nt.nodes.new('ShaderNodeMath')
        m.operation = 'MULTIPLY'
        L(w1.outputs['Fac'], m.inputs[0])
        L(w2.outputs['Fac'], m.inputs[1])
        return m.outputs[0]

    def folds(scale_z, strength_noise=2.5):
        # cloth folds: wave along Z distorted by noise
        w = nt.nodes.new('ShaderNodeTexWave')
        w.wave_type = 'BANDS'
        w.bands_direction = 'Z'
        w.inputs['Scale'].default_value = scale_z
        w.inputs['Distortion'].default_value = strength_noise
        w.inputs['Detail'].default_value = 3
        w.inputs['Detail Scale'].default_value = 1.5
        L(tc.outputs['Object'], w.inputs['Vector'])
        return w.outputs['Fac']

    base = col.outputs['Color']
    rough = 0.8
    metal = 0.0
    nrm = None
    emit = None
    kind = name
    if kind == 'skin':
        n1 = noise_tex(60, 6, 0.6)
        n2 = noise_tex(8, 3, 0.5)
        c = mix_col(base, ramp(n2.outputs['Fac'], [(0.3, (0.88, 0.8, 0.78)), (0.7, (1.05, 0.98, 0.95))]).outputs[0], 1.0)
        c = mix_col(c, ramp(n1.outputs['Fac'], [(0.4, (0.93, 0.9, 0.9)), (0.6, (1.02, 1.0, 1.0))]).outputs[0], 1.0)
        base = c
        rn = ramp(n1.outputs['Fac'], [(0.3, (0.45,) * 3), (0.7, (0.62,) * 3)])
        rough = rn.outputs[0]
        nrm = bump(n1.outputs['Fac'], 0.12, 0.002)
    elif kind in ('top', 'inner', 'bottom', 'accent', 'scarf'):
        fabric = {'top': 320, 'inner': 520, 'bottom': 360, 'accent': 260, 'scarf': 180}[kind]
        wv = weave(fabric)
        fl = folds(9 if kind != 'inner' else 14)
        n1 = noise_tex(5, 4, 0.6)
        nrm = bump(fl, 0.14, 0.006)
        nrm = bump(wv, 0.08, 0.001, normal=nrm)
        wear = ramp(n1.outputs['Fac'], [(0.35, (0.82, 0.82, 0.82)), (0.65, (1.08, 1.06, 1.04))])
        base = mix_col(base, wear.outputs[0], 1.0)
        base = mix_col(base, ramp(wv, [(0.0, (0.86,) * 3), (1.0, (1.04,) * 3)]).outputs[0], 1.0)
        rough = 0.86 if kind != 'top' else 0.78
    elif kind == 'denim':
        w = nt.nodes.new('ShaderNodeTexWave')
        w.wave_type = 'BANDS'
        w.bands_direction = 'DIAGONAL'
        w.inputs['Scale'].default_value = 320
        L(tc.outputs['Object'], w.inputs['Vector'])
        n1 = noise_tex(14, 5, 0.7)
        fade = ramp(n1.outputs['Fac'], [(0.3, (0.75, 0.78, 0.85)), (0.7, (1.25, 1.25, 1.3))])
        base = mix_col(base, fade.outputs[0], 1.0)
        base = mix_col(base, ramp(w.outputs['Fac'], [(0.0, (0.85,) * 3), (1.0, (1.08,) * 3)]).outputs[0], 1.0)
        h = nt.nodes.new('ShaderNodeMath')
        h.operation = 'MULTIPLY_ADD'
        L(folds(11), h.inputs[0])
        h.inputs[1].default_value = 0.7
        L(w.outputs['Fac'], h.inputs[2])
        nrm = bump(h.outputs[0], 0.3, 0.004)
        rough = 0.9
    elif kind == 'leather':
        v = nt.nodes.new('ShaderNodeTexVoronoi')
        v.inputs['Scale'].default_value = 220
        L(tc.outputs['Object'], v.inputs['Vector'])
        n1 = noise_tex(6, 4, 0.6)
        base = mix_col(base, ramp(n1.outputs['Fac'], [(0.3, (0.7,) * 3), (0.7, (1.15,) * 3)]).outputs[0], 1.0)
        nrm = bump(v.outputs['Distance'], 0.25, 0.002)
        rough = ramp(n1.outputs['Fac'], [(0.3, (0.35,) * 3), (0.7, (0.6,) * 3)]).outputs[0]
    elif kind == 'rubber':
        n1 = noise_tex(80, 3, 0.5)
        nrm = bump(n1.outputs['Fac'], 0.15, 0.002)
        rough = 0.75
    elif kind == 'hair':
        # strand look: stretched noise along the hair flow (Z) + wave stripes
        mp = nt.nodes.new('ShaderNodeMapping')
        mp.inputs['Scale'].default_value = (90, 90, 6)
        L(tc.outputs['Object'], mp.inputs['Vector'])
        n = nt.nodes.new('ShaderNodeTexNoise')
        n.inputs['Scale'].default_value = 4
        n.inputs['Detail'].default_value = 8
        L(mp.outputs['Vector'], n.inputs['Vector'])
        strands = ramp(n.outputs['Fac'], [(0.3, (0.55,) * 3), (0.5, (0.9,) * 3), (0.7, (1.35,) * 3)])
        base = mix_col(base, strands.outputs[0], 1.0)
        nrm = bump(n.outputs['Fac'], 0.6, 0.003)
        rough = 0.5
    elif kind == 'eye':
        rough = 0.08
    elif kind == 'metal':
        n1 = noise_tex(40, 4, 0.6)
        rough = ramp(n1.outputs['Fac'], [(0.3, (0.25,) * 3), (0.7, (0.5,) * 3)]).outputs[0]
        metal = 1.0
    elif kind == 'plastic':
        rough = 0.45
    elif kind == 'emit':
        emit = base
        rough = 0.3
    elif kind == 'nylon':
        wv = weave(260)
        n1 = noise_tex(7, 4, 0.6)
        base = mix_col(base, ramp(n1.outputs['Fac'], [(0.3, (0.8,) * 3), (0.7, (1.1,) * 3)]).outputs[0], 1.0)
        nrm = bump(wv, 0.4, 0.003)
        rough = 0.7
    elif kind == 'remnant':
        n1 = noise_tex(9, 6, 0.7)
        v = nt.nodes.new('ShaderNodeTexVoronoi')
        v.feature = 'DISTANCE_TO_EDGE'
        v.inputs['Scale'].default_value = 26
        L(tc.outputs['Object'], v.inputs['Vector'])
        cracks = ramp(v.outputs['Distance'], [(0.0, (1, 1, 1)), (0.04, (0, 0, 0))])
        emit = mix_col(cracks.outputs[0], (0.35, 0.8, 1.0), 1.0)
        base = mix_col(base, ramp(n1.outputs['Fac'], [(0.3, (0.6,) * 3), (0.7, (1.4,) * 3)]).outputs[0], 1.0)
        nrm = bump(n1.outputs['Fac'], 0.6, 0.006)
        rough = 0.32
    if isinstance(base, bpy.types.NodeSocket):
        L(base, bsdf.inputs['Base Color'])
    if isinstance(rough, bpy.types.NodeSocket):
        L(rough, bsdf.inputs['Roughness'])
    else:
        bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metal
    if nrm is not None:
        L(nrm, bsdf.inputs['Normal'])
    if emit is not None:
        L(emit, bsdf.inputs['Emission Color'])
        bsdf.inputs['Emission Strength'].default_value = 1.0
    if kind == 'skin':
        bsdf.inputs['Subsurface Weight'].default_value = 0.0
    MATS[name] = mat
    return mat


# ============================================================================ skeleton
def joints(s):
    """Joint positions in Blender space (Z up, front = -Y, character's left = +X)."""
    H = s['height']
    b = s['build']
    if s['kid']:
        k = H / 1.27
        J = dict(
            hips=(0, 0, 0.66), spine=(0, 0.005, 0.74), chest=(0, 0.01, 0.84), neck=(0, 0.02, 1.0), head=(0, 0.01, 1.05), head_top=(0, 0, 1.27),
            clav=(0.025, 0.0, 0.97), shoulder=(0.12, 0.015, 0.97), uparm=0.205, forearm=0.18, hand=0.085,
            thigh=(0.07, 0.0, 0.62), knee=(0.073, -0.01, 0.345), ankle=(0.075, 0.015, 0.06), toe=(0.075, -0.1, 0.015),
        )
        J = {n: (tuple(x * k for x in v) if isinstance(v, tuple) else v * k) for n, v in J.items()}
    else:
        k = H / 1.80
        remn = s.get('remnant')
        J = dict(
            hips=(0, 0, 0.97), spine=(0, 0.01, 1.07), chest=(0, 0.015, 1.23), neck=(0, 0.025, 1.47), head=(0, 0.015, 1.555), head_top=(0, 0, 1.80),
            clav=(0.03, 0.0, 1.425), shoulder=(0.185 * b, 0.02, 1.405), uparm=0.29 * (1.18 if remn else 1), forearm=0.265 * (1.22 if remn else 1), hand=0.1 * (1.3 if remn else 1),
            thigh=(0.095 * b, 0.0, 0.925), knee=(0.1 * b, -0.01, 0.505), ankle=(0.1 * b, 0.02, 0.085), toe=(0.1 * b, -0.125, 0.02),
        )
        if s['female']:
            J['shoulder'] = (0.165 * b, 0.02, 1.405)
            J['thigh'] = (0.1 * b, 0.0, 0.925)
        J = {n: (tuple(x * k for x in v) if isinstance(v, tuple) else v * k) for n, v in J.items()}
    # arm chain in A-pose
    sx, sy, sz = J['shoulder']
    d = Vector((math.sin(ARM_A), 0.0, -math.cos(ARM_A)))
    elbow = Vector(J['shoulder']) + d * J['uparm'] + Vector((0, -0.01, 0))
    wrist = elbow + d * J['forearm'] + Vector((0, -0.015, 0))
    hand_end = wrist + d * J['hand']
    J['elbow'] = tuple(elbow)
    J['wrist'] = tuple(wrist)
    J['hand_end'] = tuple(hand_end)
    return J


BONE_LIST = ['hips', 'spine', 'chest', 'neck', 'head',
             'shoulder.L', 'upperarm.L', 'forearm.L', 'hand.L',
             'shoulder.R', 'upperarm.R', 'forearm.R', 'hand.R',
             'thigh.L', 'shin.L', 'foot.L', 'thigh.R', 'shin.R', 'foot.R']
HINGES = {'forearm.L', 'forearm.R', 'shin.L', 'shin.R', 'foot.L', 'foot.R'}


def mirror(p, side):
    return (p[0] if side == 'L' else -p[0], p[1], p[2])


def build_armature(s, J):
    arm = bpy.data.armatures.new('Armature')
    ao = link(bpy.data.objects.new('Armature', arm))
    activate(ao)
    bpy.ops.object.mode_set(mode='EDIT')
    eb = arm.edit_bones

    def bone(name, head, tail, parent=None, roll_to=None, connect=False):
        b = eb.new(name)
        b.head = head
        b.tail = tail
        if roll_to is not None:
            b.align_roll(Vector(roll_to))
        if parent:
            b.parent = eb[parent]
            b.use_connect = connect
        return b

    bone('hips', J['hips'], J['spine'], roll_to=(0, -1, 0))
    bone('spine', J['spine'], J['chest'], 'hips', (0, -1, 0), True)
    bone('chest', J['chest'], J['neck'], 'spine', (0, -1, 0), True)
    bone('neck', J['neck'], J['head'], 'chest', (0, -1, 0), True)
    bone('head', J['head'], J['head_top'], 'neck', (0, -1, 0), True)
    for side in ('L', 'R'):
        m = lambda p: mirror(p, side)
        bone(f'shoulder.{side}', m(J['clav']), m(J['shoulder']), 'chest', (0, -1, 0))
        bone(f'upperarm.{side}', m(J['shoulder']), m(J['elbow']), f'shoulder.{side}', (0, -1, 0), True)
        bone(f'forearm.{side}', m(J['elbow']), m(J['wrist']), f'upperarm.{side}', (0, -1, 0), True)
        bone(f'hand.{side}', m(J['wrist']), m(J['hand_end']), f'forearm.{side}', (0, -1, 0), True)
        bone(f'thigh.{side}', m(J['thigh']), m(J['knee']), 'hips', (0, -1, 0))
        bone(f'shin.{side}', m(J['knee']), m(J['ankle']), f'thigh.{side}', (0, 1, 0), True)
        bone(f'foot.{side}', m(J['ankle']), m(J['toe']), f'shin.{side}', (0, 0, 1), True)
    bpy.ops.object.mode_set(mode='OBJECT')
    return ao


# ============================================================================ body
MB_K = 1 / 0.574  # metaball element radius -> visible radius calibration


def build_body(s, J):
    """Organic body from blended metaball volumes, quad-remeshed with QuadriFlow."""
    b = s['build']
    kid = s['kid']
    fem = s['female']
    remn = s.get('remnant')
    lod = s.get('lod')
    k = s['height'] / (1.27 if kid else 1.8)
    mbd = bpy.data.metaballs.new('BodyMB')
    mbo = link(bpy.data.objects.new('BodyMB', mbd))
    mbd.resolution = 0.011 * k
    mbd.render_resolution = 0.011 * k
    mbd.threshold = 0.6
    th = 0.62 if remn else 1.0
    W = b * th
    pants = s['bottom_kind'] in ('jeans', 'cargo', 'slacks', 'scrubs', 'gown')
    sleeves = s['top_kind'] not in ('scrubs', 'gown')

    def ell(c, semi, rot=(0, 0, 0), neg=False, stiff=2.0):
        e = mbd.elements.new()
        e.type = 'ELLIPSOID'
        m = max(semi)
        e.radius = m * MB_K
        e.size_x, e.size_y, e.size_z = semi[0] / m, semi[1] / m, semi[2] / m
        e.co = Vector(c)
        e.rotation = Euler(rot).to_quaternion()
        e.stiffness = stiff
        e.use_negative = neg
        return e

    def cap(p0, p1, r, stiff=2.0):
        p0 = Vector(p0)
        p1 = Vector(p1)
        d = p1 - p0
        e = mbd.elements.new()
        e.type = 'CAPSULE'
        e.radius = r * MB_K
        e.size_x = max(0.001, d.length / 2)
        e.co = (p0 + p1) / 2
        e.rotation = Vector((1, 0, 0)).rotation_difference(d.normalized())
        e.stiffness = stiff
        return e

    def chain(pts, radii, n=3):
        """Tapered limb: several overlapping capsules along a polyline."""
        for i in range(len(pts) - 1):
            a, c = Vector(pts[i]), Vector(pts[i + 1])
            for j in range(n):
                t0, t1 = j / n, (j + 1) / n
                r = radii[i] + (radii[i + 1] - radii[i]) * (t0 + t1) / 2
                cap(a.lerp(c, t0), a.lerp(c, t1), r)

    Z = lambda z: z * k
    hz = J['hips'][2]
    cz = J['chest'][2]
    nz = J['neck'][2]
    S = k * (0.78 if kid else 1.0)
    if kid:
        ell((0, 0.012 * k, hz - 0.02 * k), (0.135 * S, 0.1 * S, 0.1 * S))
        ell((0, 0.0, (hz + cz) / 2 + 0.01 * k), (0.13 * S, 0.105 * S, 0.11 * S))
        ell((0, 0.01 * k, cz + 0.07 * k), (0.135 * S, 0.1 * S, 0.12 * S))
        for sx in (1, -1):
            ell((0.06 * sx * k, 0.015 * k, nz - 0.02 * k), (0.07 * S, 0.055 * S, 0.035 * S), rot=(0, -0.35 * sx, 0))
    else:
        f = 1.0 if not fem else 0.0
        ell((0, 0.012 * k, hz - 0.03 * k), ((0.14 + 0.025 * (1 - f)) * S * W, 0.1 * S * th, 0.095 * S))           # pelvis
        ell((0, 0.004 * k, (hz + cz) / 2 + 0.01 * k), ((0.138 - 0.012 * (1 - f)) * S * W, 0.098 * S * th, 0.105 * S))   # belly/waist
        ell((0, 0.012 * k, cz + 0.06 * k), ((0.155 - 0.015 * (1 - f)) * S * W, 0.107 * S * th, 0.15 * S))          # ribcage
        ell((0, -0.012 * k, cz + 0.12 * k), ((0.162 - 0.022 * (1 - f)) * S * W, 0.095 * S * th, 0.095 * S))        # chest
        ell((0, 0.04 * k, cz + 0.13 * k), ((0.145 - 0.015 * (1 - f)) * S * W, 0.075 * S * th, 0.1 * S))           # upper back / lats
        for sx in (1, -1):
            ell((0.075 * sx * k, 0.018 * k, nz - 0.03 * k), (0.085 * S * W, 0.055 * S * th, 0.032 * S), rot=(0, -0.42 * sx, 0))  # trapezius slope
            ell((0.07 * sx * k, 0.075 * k, hz - 0.085 * k), (0.065 * S, 0.055 * S * th, 0.075 * S))                # glutes
            if fem and not remn:
                ell((0.068 * sx * k, -0.07 * k, cz + 0.1 * k), (0.06 * S, 0.055 * S, 0.055 * S))                 # bust
    # neck
    cap((0, 0.022 * k, nz - 0.03 * k), (0, 0.018 * k, J['head'][2] + 0.06 * k), (0.05 if not kid else 0.045) * S)
    for side in ('L', 'R'):
        m = lambda p: Vector(mirror(p, side))
        sh = m(J['shoulder'])
        el = m(J['elbow'])
        wr = m(J['wrist'])
        sx = 1 if side == 'L' else -1
        # deltoid
        ell(tuple(sh + Vector((0.012 * sx * k, 0.0, -0.01 * k))), (0.062 * S * W, 0.066 * S * W, 0.072 * S * W))
        sl = 1.12 if sleeves else 1.0
        chain([sh + Vector((0, 0, -0.02 * k)), sh.lerp(el, 0.5), el, el.lerp(wr, 0.45), wr - (wr - el).normalized() * 0.012 * k],
               [0.056 * S * W * sl, 0.05 * S * W * sl, 0.042 * S * th * sl, 0.042 * S * th * sl, 0.031 * S * th * (1.25 if sleeves else 1.0)], n=2)
        tj = m(J['thigh'])
        kn = m(J['knee'])
        an = m(J['ankle'])
        hip = tj + Vector((0, 0.008 * k, -0.02 * k))
        if pants:
            radii = [0.084 * S * W, 0.078 * S * W, 0.062 * S * th, 0.063 * S * th, 0.057 * S * th, 0.055 * S * th]
        else:
            radii = [0.09 * S * W, 0.078 * S * W, 0.052 * S * th, 0.06 * S * th, 0.045 * S * th, 0.037 * S * th]
        chain([hip, hip.lerp(kn, 0.45), kn, kn.lerp(an, 0.3) + Vector((0, 0.012 * k, 0)), kn.lerp(an, 0.72), an + Vector((0, 0, 0.03 * k))], radii, n=2)
    bpy.context.view_layer.update()
    activate(mbo)
    bpy.ops.object.convert(target='MESH')
    ob = bpy.context.active_object
    ob.name = 'Body'
    # quad remesh to an even, deformation-friendly topology
    target = 2600 if lod else 7600
    # metaball output can contain duplicate verts; a voxel remesh guarantees a clean manifold
    rm = ob.modifiers.new('Vox', 'REMESH')
    rm.mode = 'VOXEL'
    rm.voxel_size = 0.009 * k
    rm.use_smooth_shade = True
    apply_mods(ob)
    before = len(ob.data.polygons)
    activate(ob)
    res = None
    for sym in (True, False):
        try:
            res = bpy.ops.object.quadriflow_remesh(target_faces=target, use_mesh_symmetry=sym, smooth_normals=True, use_preserve_sharp=False, use_preserve_boundary=False, seed=3)
        except Exception as ex:
            print('quadriflow error', ex)
        ob = bpy.context.active_object
        if len(ob.data.polygons) < before * 0.6:
            break
    print('[body] metaball faces', before, '-> remeshed', len(ob.data.polygons), res)
    if len(ob.data.polygons) > target * 1.6:
        dec = ob.modifiers.new('Dec', 'DECIMATE')
        dec.ratio = target * 1.0 / max(1, len(ob.data.polygons))
        apply_mods(ob)
    sm = ob.modifiers.new('Smooth', 'SMOOTH')
    sm.factor = 0.4
    sm.iterations = 3
    apply_mods(ob)
    smooth(ob)
    if remn:
        for vv in ob.data.vertices:
            p = vv.co
            if cz - 0.1 * k < p.z < nz and p.y < 0:
                vv.co += vv.normal * 0.007 * math.sin(p.z / k * 110)
            vv.co += vv.normal * (noise.noise(p * 14) * 0.01)
    return ob


# ============================================================================ head
def build_head(s, J):
    k = s['height'] / (1.27 if s['kid'] else 1.8)
    kid = s['kid']
    fem = s['female']
    hs = k * (0.9 if kid else 1.0)
    cz = J['head'][2] + 0.1 * hs
    cy = J['head'][1] - 0.004
    lod = s.get('lod')
    soft = 0.6 if (fem or kid) else 1.0
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=44 if lod else 88, v_segments=32 if lod else 64, radius=1.0)
    for vt in bm.verts:
        x, y, z = vt.co
        X = x * 0.077
        Y = y * 0.096
        Z = z * 0.117
        if z < 0.05:
            t = max(0.0, (0.05 - z) / 1.05)
            jaw = 1 - 0.24 * t ** 1.4 * (0.85 if fem or kid else 1.0)
            X *= jaw
            Y *= 1 - 0.15 * t
            if y < 0:
                Y -= 0.01 * t ** 2
        if y < 0:
            Y *= 0.93
        else:
            Y *= 1.06
            Z += 0.005 * y
        if z < 0:
            Z *= 0.9
        X *= 1 - 0.07 * gauss(z - 0.3, 0.25) * gauss(y + 0.35, 0.45)
        p = Vector((X, Y, Z))
        # jaw angle and chin breadth (squarer lower face for adult men)
        for sx in (1, -1):
            d = (p - Vector((0.058 * sx, -0.02, -0.068))).length
            p.x += 0.006 * sx * gauss(d, 0.03) * soft
        p.y -= 0.005 * gauss(p.x, 0.025) * gauss(p.z + 0.095, 0.015) * soft
        for sx in (1, -1):
            d = (p - Vector((0.032 * sx, -0.085, 0.014))).length
            p.y += 0.012 * gauss(d, 0.017)
            d = (p - Vector((0.033 * sx, -0.091, 0.034))).length
            p.y -= 0.006 * gauss(d, 0.019) * soft
            d = (p - Vector((0.048 * sx, -0.07, -0.012))).length
            p.x += 0.006 * sx * gauss(d, 0.024)
            p.y -= 0.005 * gauss(d, 0.02)
            if kid:
                d = (p - Vector((0.043 * sx, -0.07, -0.032))).length
                p += Vector((0.006 * sx, -0.007, 0)) * gauss(d, 0.03)
            # nasolabial fold
            d = math.hypot(p.x - 0.022 * sx, p.z + 0.03)
            if p.y < -0.06:
                p.y += 0.0018 * gauss(d, 0.004)
        dx = p.x
        nz = p.z
        if p.y < -0.055:
            front = min(1.0, max(0.0, (-p.y - 0.055) / 0.02))
            nk = 0.8 if kid else 1.0
            bridge = gauss(dx, 0.0105) * max(0.0, min(1.0, (0.026 - nz) / 0.04)) * max(0.0, min(1.0, (nz + 0.03) / 0.012))
            p.y -= 0.029 * bridge * nk * front
            tip = gauss(dx, 0.012) * gauss(nz + 0.024, 0.011)
            p.y -= 0.013 * tip * nk * front
            for sx in (1, -1):
                nd = math.hypot(dx - 0.013 * sx, nz + 0.027)
                p.y -= 0.0055 * gauss(nd, 0.0075) * front
                p.x += 0.002 * sx * gauss(nd, 0.006) * front
            # under-nose groove
            p.y += 0.003 * gauss(dx, 0.01) * gauss(nz + 0.036, 0.004) * front
            lip_u = gauss(dx, 0.02) * gauss(nz + 0.043, 0.0075)
            lip_l = gauss(dx, 0.017) * gauss(nz + 0.057, 0.008)
            p.y -= (0.0085 * lip_u + 0.0095 * lip_l) * front
            p.y += 0.0045 * gauss(dx, 0.022) * gauss(nz + 0.05, 0.003) * front
            for sx in (1, -1):
                p.y += 0.003 * gauss(math.hypot(dx - 0.024 * sx, nz + 0.05), 0.004) * front
            p.y -= 0.007 * gauss(dx, 0.018) * gauss(nz + 0.088, 0.012) * soft * front
        vt.co = p * hs
    bmesh.ops.translate(bm, vec=Vector((0, cy, cz)), verts=bm.verts)
    ob = from_bm('Head', bm)
    smooth(ob)
    set_slot(ob, 'skin')
    skin = lin(C(s['skin']))
    lipc = tuple(c * f for c, f in zip(skin, (0.8, 0.58, 0.56)))
    stub = s.get('stubble', 0)
    hair = lin(C(s['hair']))
    blush = (min(1, skin[0] * 1.06), skin[1] * 0.82, skin[2] * 0.82)

    def head_col(p):
        lp = (p - Vector((0, cy, cz))) / hs
        c = Vector(skin)
        if lp.y < -0.045:
            lw = gauss(lp.x, 0.021) * (gauss(lp.z + 0.043, 0.0075) + gauss(lp.z + 0.057, 0.008))
            c = c * (1 - 0.35 * gauss(lp.x, 0.024) * gauss(lp.z + 0.05, 0.0025))
            c = c.lerp(Vector(lipc), min(1, lw * 1.3))
            for sx in (1, -1):
                d = math.hypot(lp.x - 0.045 * sx, lp.z + 0.02)
                c = c.lerp(Vector(blush), 0.16 * gauss(d, 0.025) * (1.8 if s['kid'] else 1))
            # nose tip warmth
            c = c.lerp(Vector(blush), 0.25 * gauss(lp.x, 0.012) * gauss(lp.z + 0.024, 0.012))
        if stub > 0 and lp.y < 0.03:
            region = max(0.0, min(1.0, (-0.012 - lp.z) / 0.03))
            region *= 1 - gauss(lp.x, 0.017) * gauss(lp.z + 0.052, 0.009)
            region *= max(0.0, min(1.0, (0.075 - abs(lp.x) + 0.01) / 0.02)) if lp.z > -0.04 else 1
            nb = 0.7 + 0.3 * noise.noise(p * 1400)
            c = c.lerp(Vector(hair) * 0.8 + Vector(skin) * 0.3, stub * region * 0.6 * nb)
        for sx in (1, -1):
            d = math.hypot(lp.x - 0.032 * sx, lp.z - 0.012)
            if lp.y < -0.05:
                c = c * (1 - 0.22 * gauss(d, 0.017))
        # ears/neck slightly redder, forehead lighter
        c = c * (1 + 0.04 * max(0.0, lp.z - 0.04) * 10)
        return tuple(c)

    vcol(ob, head_col)
    parts = [ob]
    for sx in (1, -1):
        e = lathe('Ear', [(0.001, -0.004), (0.011, -0.004), (0.017, 0.0), (0.016, 0.004), (0.008, 0.007), (0.001, 0.005)], seg=16, sx=1.0, sy=1.6)
        # helix rim
        for v_ in e.data.vertices:
            v_.co.z += 0.002 * math.sin(math.atan2(v_.co.y, v_.co.x) * 2)
        e.rotation_euler = (0, math.radians(90) * sx, math.radians(-10) * sx)
        e.location = (0.075 * sx * hs, cy + 0.012 * hs, cz + 0.004 * hs)
        e.scale = (hs * 1.3, hs * 1.3, hs * 1.3)
        activate(e)
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        set_slot(e, 'skin')
        solid_col(e, tuple(c * f for c, f in zip(skin, (0.97, 0.9, 0.9))))
        parts.append(e)
    iris = lin(C(s['eye']))
    er = 0.0122 * hs
    for sx in (1, -1):
        ec = Vector((0.032 * sx * hs, cy - 0.0705 * hs, cz + 0.014 * hs))
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=20, v_segments=14, radius=er)
        bmesh.ops.translate(bm, vec=ec, verts=bm.verts)
        eo = from_bm('Eye', bm)
        smooth(eo)
        set_slot(eo, 'eye')

        def eyecol(p, ec=ec):
            d = (p - ec).normalized()
            a = math.degrees(math.acos(max(-1, min(1, -d.y))))
            if a < 10:
                return (0.005, 0.004, 0.003)
            if a < 27:
                f = 0.45 + 0.55 * (a - 10) / 17
                return tuple(c * f for c in iris)
            if a < 31:
                return (0.03, 0.025, 0.02)
            return (0.62, 0.58, 0.55)

        vcol(eo, eyecol)
        parts.append(eo)
        # eyelids: shells slightly larger than the eyeball
        for upper in (True, False):
            bm = bmesh.new()
            bmesh.ops.create_uvsphere(bm, u_segments=20, v_segments=14, radius=er * 1.12)
            kill = []
            for vt in bm.verts:
                z = vt.co.z / (er * 1.12)
                yy = vt.co.y / (er * 1.12)
                if upper:
                    keep = z > 0.3 and yy < 0.65
                else:
                    keep = z < -0.55 and yy < 0.65
                if not keep:
                    kill.append(vt)
            bmesh.ops.delete(bm, geom=kill, context='VERTS')
            bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Euler((math.radians(6 if upper else -4), 0, 0)).to_matrix())
            bmesh.ops.translate(bm, vec=ec, verts=bm.verts)
            lid = from_bm('Lid', bm)
            sol = lid.modifiers.new('Sol', 'SOLIDIFY')
            sol.thickness = 0.0015 * hs
            apply_mods(lid)
            smooth(lid)
            set_slot(lid, 'skin')
            solid_col(lid, tuple(c * 0.86 for c in skin))
            parts.append(lid)
        if not s.get('remnant'):
            pts = []
            for i in range(8):
                t = i / 7
                pts.append(((0.016 + t * 0.032) * sx * hs, cy - (0.092 - 0.01 * t * t) * hs, cz + (0.036 + 0.007 * math.sin(t * math.pi) - 0.003 * t) * hs))
            br = tube('Brow', pts, [(0.0042 * hs * (1.25 - 0.7 * (i / 7)), 0.0022 * hs) for i in range(8)], seg=6)
            set_slot(br, 'hair')
            solid_col(br, tuple(c * 0.8 for c in hair))
            parts.append(br)
    return parts, (cy, cz, hs)


def build_hair(s, J, hinfo):
    cy, cz, hs = hinfo
    style = s['hair_style']
    hair = lin(C(s['hair']))
    parts = []
    if style == 'none':
        return parts
    lod = s.get('lod')

    def hair_col(ob, var=0.3):
        vcol(ob, lambda p: tuple(c * (0.82 + var * noise.noise(Vector((p.x * 220, p.y * 220, p.z * 40)))) for c in hair))

    def shell(name, rx, ry, rz, hairline=0.32, side_cut=0.05, back_low=-0.45, thick=0.01, volume=1.0, temple=0.0):
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=32 if lod else 48, v_segments=20 if lod else 32, radius=1.0)
        kill = []
        for vt in bm.verts:
            x, y, z = vt.co
            front_edge = hairline + 0.1 * abs(x) ** 2 - temple * gauss(abs(x) - 0.55, 0.2)
            if y < -0.25 and z < front_edge:
                kill.append(vt)
                continue
            if abs(x) > 0.55 and z < side_cut and y < 0.25:
                kill.append(vt)
                continue
            if z < back_low:
                kill.append(vt)
                continue
            if z < side_cut - 0.15 and y < 0.0:
                kill.append(vt)
                continue
            top = max(0.0, z) ** 1.5 * (volume - 1)
            vt.co = Vector((x * rx * (1 + top * 0.3), y * ry * (1 + top * 0.25), z * rz * (1 + top * 0.35)))
        bmesh.ops.delete(bm, geom=kill, context='VERTS')
        bmesh.ops.translate(bm, vec=Vector((0, cy + 0.005 * hs, cz + 0.005 * hs)), verts=bm.verts)
        # thickness falls off towards the cut edges so the hairline is soft, not a helmet rim
        bm.verts.ensure_lookup_table()
        ring = {v.index: 0 for v in bm.verts if v.is_boundary}
        frontier = list(ring)
        for depth in (1, 2, 3):
            nxt = []
            for vi in frontier:
                for e_ in bm.verts[vi].link_edges:
                    o = e_.other_vert(bm.verts[vi]).index
                    if o not in ring:
                        ring[o] = depth
                        nxt.append(o)
            frontier = nxt
        weights = {vi: [0.08, 0.35, 0.65, 0.9][d] for vi, d in ring.items()}
        ob = from_bm(name, bm)
        smooth(ob)
        vg = ob.vertex_groups.new(name='thick')
        for v in ob.data.vertices:
            vg.add([v.index], weights.get(v.index, 1.0), 'REPLACE')
        sol = ob.modifiers.new('Sol', 'SOLIDIFY')
        sol.thickness = thick * hs
        sol.offset = 1
        sol.vertex_group = 'thick'
        sol.thickness_vertex_group = 0.05
        apply_mods(ob)
        ob.vertex_groups.clear()
        for v in ob.data.vertices:
            n = noise.noise(Vector((v.co.x * 160, v.co.y * 160, v.co.z * 22)))
            n2 = noise.noise(Vector((v.co.x * 40, v.co.y * 40, v.co.z * 40)))
            v.co += v.normal * (n * 0.0022 + n2 * 0.003) * hs
        set_slot(ob, 'hair')
        hair_col(ob)
        return ob

    def tuft(p0, p1, r, name='Tuft'):
        mid = (Vector(p0) + Vector(p1)) / 2 + Vector((0, 0, 0.006 * hs))
        t = tube(name, [tuple(p0), tuple(mid), tuple(p1)], [(r, r * 0.55), (r * 0.9, r * 0.5), (r * 0.15, r * 0.1)], seg=7)
        set_slot(t, 'hair')
        hair_col(t)
        return t

    def on_head(az, el, lift, rx=0.084, ry=0.104, rz=0.123):
        """Point on the scalp ellipsoid: az around Z from front (-Y), el elevation."""
        return Vector((math.sin(az) * math.cos(el) * (rx + lift) * hs, cy - math.cos(az) * math.cos(el) * (ry + lift) * hs, cz + 0.005 * hs + math.sin(el) * (rz + lift) * hs))

    def lock(az0, el0, az1, el1, w, name='Lock', lift=0.006, n=6):
        pts, rad = [], []
        for i in range(n):
            t = i / (n - 1)
            az = az0 + (az1 - az0) * t
            el = el0 + (el1 - el0) * t
            pts.append(tuple(on_head(az, el, lift + 0.004 * math.sin(t * math.pi))))
            ww = w * (1 - t * 0.8) * hs
            rad.append((ww, ww * 0.32))
        lk = tube(name, pts, rad, seg=7)
        set_slot(lk, 'hair')
        hair_col(lk)
        return lk

    if style == 'short':
        parts.append(shell('Hair', 0.083 * hs, 0.103 * hs, 0.121 * hs, hairline=0.42, side_cut=0.16, back_low=-0.5, thick=0.011, volume=1.22, temple=0.14))
        if not lod:
            # side part on the left, locks swept to the right over the crown and forehead
            for i in range(7):
                a0 = 0.32 - i * 0.03
                parts.append(lock(a0, 0.95 - i * 0.06, -0.55 - i * 0.12, 0.42 + i * 0.035, 0.02, lift=0.007))
            for i in range(5):
                parts.append(lock(0.5 + i * 0.12, 0.85, 0.75 + i * 0.18, 0.3, 0.018, lift=0.006))
    elif style == 'buzz':
        parts.append(shell('Hair', 0.0795 * hs, 0.099 * hs, 0.1185 * hs, hairline=0.38, side_cut=0.0, back_low=-0.45, thick=0.0025, volume=1.0, temple=0.1))
    elif style == 'grey':
        parts.append(shell('Hair', 0.082 * hs, 0.102 * hs, 0.12 * hs, hairline=0.5, side_cut=0.1, back_low=-0.5, thick=0.009, volume=1.12, temple=0.25))
        if not lod:
            # swept-back strands
            for i in range(7):
                x = (i - 3) * 0.018 * hs
                parts.append(tuft((x, cy - 0.07 * hs, cz + 0.095 * hs), (x * 1.1, cy + 0.02 * hs, cz + 0.12 * hs), 0.012 * hs))
    elif style in ('ponytail', 'bob', 'kid'):
        sh = shell('Hair', 0.084 * hs, 0.104 * hs, 0.123 * hs, hairline=0.34, side_cut=-0.25 if style != 'ponytail' else 0.1, back_low=-0.62 if style != 'ponytail' else -0.4,
                   thick=0.011, volume=1.15, temple=0.05)
        parts.append(sh)
        if style == 'ponytail':
            base = Vector((0, cy + 0.098 * hs, cz + 0.035 * hs))
            pts = [base, base + Vector((0, 0.03, -0.015)) * hs, base + Vector((0, 0.05, -0.07)) * hs, base + Vector((0, 0.045, -0.15)) * hs, base + Vector((0, 0.03, -0.23)) * hs, base + Vector((0, 0.022, -0.27)) * hs]
            pt = tube('Pony', [tuple(p) for p in pts], [0.021 * hs, 0.028 * hs, 0.026 * hs, 0.019 * hs, 0.01 * hs, 0.002 * hs], seg=12)
            set_slot(pt, 'hair')
            hair_col(pt)
            parts.append(pt)
            tie = tube('Tie', [tuple(base + Vector((0, 0.02, -0.006)) * hs), tuple(base + Vector((0, 0.03, -0.014)) * hs)], 0.019 * hs, seg=12)
            set_slot(tie, 'plastic')
            solid_col(tie, (0.02, 0.02, 0.02))
            parts.append(tie)
            # side-swept bangs
            parts.append(tuft((0.03 * hs, cy - 0.085 * hs, cz + 0.085 * hs), (-0.045 * hs, cy - 0.095 * hs, cz + 0.06 * hs), 0.016 * hs))
        else:
            long_ = 0.15 if style == 'kid' else 0.11
            for sx in (1, -1):
                pts = [(0.072 * sx * hs, cy - 0.03 * hs, cz + 0.06 * hs), (0.088 * sx * hs, cy - 0.02 * hs, cz - 0.03 * hs), (0.088 * sx * hs, cy - 0.0, cz - long_ * hs), (0.082 * sx * hs, cy + 0.01 * hs, cz - (long_ + 0.03) * hs)]
                cur = tube('Side', pts, [(0.016 * hs, 0.022 * hs), (0.02 * hs, 0.03 * hs), (0.016 * hs, 0.03 * hs), (0.004 * hs, 0.01 * hs)], seg=8)
                set_slot(cur, 'hair')
                hair_col(cur)
                parts.append(cur)
            for i in range(5):
                x = (i - 2) * 0.024 * hs
                parts.append(tuft((x * 0.8, cy - 0.075 * hs, cz + 0.1 * hs), (x * 1.1, cy - 0.1 * hs, cz + 0.045 * hs), 0.017 * hs, 'Bang'))
            back = tube('Back', [(0, cy + 0.075 * hs, cz + 0.03 * hs), (0, cy + 0.095 * hs, cz - 0.06 * hs), (0, cy + 0.085 * hs, cz - long_ * hs), (0, cy + 0.07 * hs, cz - (long_ + 0.035) * hs)],
                        [(0.07 * hs, 0.03 * hs), (0.074 * hs, 0.03 * hs), (0.06 * hs, 0.022 * hs), (0.03 * hs, 0.008 * hs)], seg=12)
            set_slot(back, 'hair')
            hair_col(back)
            parts.append(back)
    if s.get('beard'):
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=40, v_segments=28, radius=1.0)
        kill = [vt for vt in bm.verts if vt.co.z > 0.02 or vt.co.y > 0.35 or (vt.co.y < -0.5 and vt.co.z > -0.3 and abs(vt.co.x) < 0.35)]
        bmesh.ops.delete(bm, geom=kill, context='VERTS')
        for vt in bm.verts:
            vt.co = Vector((vt.co.x * 0.072 * hs, vt.co.y * 0.09 * hs, vt.co.z * 0.112 * hs))
        bmesh.ops.translate(bm, vec=Vector((0, cy - 0.003 * hs, cz - 0.004 * hs)), verts=bm.verts)
        bd = from_bm('Beard', bm)
        sol = bd.modifiers.new('Sol', 'SOLIDIFY')
        sol.thickness = 0.005 * hs
        sol.offset = 1
        apply_mods(bd)
        smooth(bd)
        set_slot(bd, 'hair')
        vcol(bd, lambda p: tuple(c * (0.75 + 0.4 * noise.noise(p * 300)) for c in hair))
        parts.append(bd)
        # moustache
        m = tube('Moustache', [(-0.022 * hs, cy - 0.095 * hs, cz - 0.05 * hs), (0, cy - 0.1 * hs, cz - 0.04 * hs), (0.022 * hs, cy - 0.095 * hs, cz - 0.05 * hs)], [(0.006 * hs, 0.004 * hs)] * 3, seg=6)
        set_slot(m, 'hair')
        solid_col(m, tuple(c * 0.9 for c in hair))
        parts.append(m)
    return parts


# ============================================================================ hands & feet
def build_hand(s, J, side):
    sgn = 1 if side == 'L' else -1
    k = s['height'] / (1.27 if s['kid'] else 1.8)
    S = k * (0.75 if s['kid'] else 1.0) * (1.25 if s.get('remnant') else 1.0)
    w = Vector(mirror(J['wrist'], side))
    he = Vector(mirror(J['hand_end'], side))
    d = (he - w).normalized()
    fwd = Vector((0, -1, 0))
    side_ax = d.cross(fwd).normalized()  # across the palm
    parts = []
    palm = rounded_box('Palm', (0.075 * S, 0.028 * S, 0.085 * S), (0, 0, 0), bevel=0.012 * S, seg=2)
    # orient palm: local Z along d, local X across
    M = Matrix((side_ax, side_ax.cross(d) * -1, d)).transposed().to_4x4()
    palm.matrix_world = Matrix.Translation(w + d * 0.045 * S) @ M
    activate(palm)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    parts.append(palm)
    # fingers: 4 curled tubes + thumb
    for i in range(4):
        off = (i - 1.5) * 0.019 * S
        base = w + d * 0.088 * S + side_ax * off
        L = (0.045 + (0.008 if i in (1, 2) else 0)) * S * (1.4 if s.get('remnant') else 1)
        curl = 0.55 if not s.get('remnant') else 0.2
        p1 = base + d * L * 0.5 + fwd * L * 0.12 * curl
        p2 = p1 + (d * math.cos(curl) + fwd * math.sin(curl)).normalized() * L * 0.45
        p3 = p2 + (d * math.cos(curl * 2) + fwd * math.sin(curl * 2)).normalized() * L * 0.35
        f = tube('Finger', [tuple(base), tuple(p1), tuple(p2), tuple(p3)], [0.0085 * S, 0.008 * S, 0.0072 * S, 0.006 * S], seg=7)
        parts.append(f)
    tb = w + d * 0.03 * S + side_ax * (-0.036 * S if side == 'L' else 0.036 * S) * (1 if side == 'L' else 1) + fwd * 0.012 * S
    t1 = tb + d * 0.03 * S + fwd * 0.018 * S + side_ax * (-0.006 * S)
    t2 = t1 + d * 0.025 * S + fwd * 0.012 * S
    parts.append(tube('Thumb', [tuple(tb), tuple(t1), tuple(t2)], [0.0105 * S, 0.0095 * S, 0.0075 * S], seg=7))
    gloves = 'gloves' in s['gear']
    for p in parts:
        set_slot(p, 'leather' if gloves else 'skin')
        solid_col(p, (0.03, 0.03, 0.03) if gloves else lin(C(s['skin'])))
    return parts


def build_shoe(s, J, side):
    k = s['height'] / (1.27 if s['kid'] else 1.8)
    S = k * (0.78 if s['kid'] else 1.0)
    kind = s['shoe_kind']
    if kind == 'none':
        return []
    a = Vector(mirror(J['ankle'], side))
    t = Vector(mirror(J['toe'], side))
    col = lin(C(s['shoes']))
    parts = []
    L = (t - a).length + 0.075 * S
    y0 = a.y + 0.07 * S
    # sole + upper via lathe-like loft: build from cross sections along the foot
    bm = bmesh.new()
    rings = []
    sections = 9
    for i in range(sections):
        u = i / (sections - 1)
        y = y0 - u * (L + 0.06 * S)
        width = (0.045 + 0.012 * math.sin(u * math.pi * 0.9)) * S
        if u > 0.85:
            width *= 1 - (u - 0.85) * 2.2
        height = (0.11 if kind in ('boots', 'rainboots') else 0.075) * S * (1 - u * 0.62) + 0.03 * S
        if kind == 'rainboots':
            height = (0.2 - u * 0.15) * S if u < 0.35 else (0.07 - (u - 0.35) * 0.05) * S + 0.02 * S
        ring = []
        segs = 12
        for kx in range(segs):
            ang = 2 * math.pi * kx / segs
            x = math.cos(ang) * width
            z = (math.sin(ang) * 0.5 + 0.5) * height
            ring.append(bm.verts.new((a.x + x, y, 0.0 + z)))
        rings.append(ring)
    for i in range(sections - 1):
        for kx in range(12):
            bm.faces.new((rings[i][kx], rings[i][(kx + 1) % 12], rings[i + 1][(kx + 1) % 12], rings[i + 1][kx]))
    bm.faces.new(list(reversed(rings[0])))
    bm.faces.new(rings[-1])
    ob = from_bm('Shoe', bm)
    smooth(ob)
    sub = ob.modifiers.new('Sub', 'SUBSURF')
    sub.levels = 1
    apply_mods(ob)
    mat = 'rubber' if kind in ('rainboots', 'sneakers') else 'leather'
    set_slot(ob, mat)
    sole = (0.9, 0.9, 0.88) if kind == 'sneakers' else (0.02, 0.02, 0.02)
    vcol(ob, lambda p: sole if p.z < 0.018 * S else col)
    parts.append(ob)
    if kind in ('boots', 'dress', 'sneakers'):
        # laces
        for i in range(4):
            yy = y0 - (0.06 + i * 0.022) * S - 0.0 * S
            lace = tube('Lace', [(a.x - 0.022 * S, yy, (0.095 - i * 0.012) * S), (a.x + 0.022 * S, yy - 0.004, (0.095 - i * 0.012) * S)], 0.0025 * S, seg=5)
            set_slot(lace, 'nylon')
            solid_col(lace, (0.05, 0.04, 0.03) if kind != 'sneakers' else (0.9, 0.9, 0.9))
            parts.append(lace)
    return parts


# ============================================================================ clothing zones & details
def zone_materials(body, s, J):
    """Assign material zones on the body mesh by position: skin / top / inner / bottom."""
    k = s['height'] / (1.27 if s['kid'] else 1.8)
    me = body.data
    names = ['skin', 'top', 'inner', 'bottom']
    bk = s['bottom_kind']
    tk = s['top_kind']
    bottom_mat = 'denim' if bk == 'jeans' else 'bottom'
    if s.get('remnant'):
        names = ['remnant']
        bottom_mat = 'remnant'
    me.materials.clear()
    for n in (['skin', 'top', 'inner', bottom_mat] if not s.get('remnant') else ['remnant']):
        me.materials.append(get_mat(n))
    if s.get('remnant'):
        solid_col(body, lin(C(s['skin'])))
        return
    skin = lin(C(s['skin']))
    top = lin(C(s['top']))
    inner = lin(C(s['inner']))
    bottom = lin(C(s['bottom']))
    waist_z = J['hips'][2] + 0.04 * k
    neck_z = J['neck'][2] + 0.0 * k
    wrist = Vector(J['wrist'])
    elbow = Vector(J['elbow'])
    ankle_z = J['ankle'][2] + 0.05 * k
    short_sleeve = tk in ('scrubs', 'gown')
    long_top = tk in ('longcoat', 'raincoat')
    skirt = bk in ('skirt', 'gown')

    def classify(p):
        ax = abs(p.x)
        on_arm = ax > J['shoulder'][0] * 0.95 and p.z < J['shoulder'][2] + 0.03 * k and p.z > J['hips'][2] - 0.25 * k and ax > abs(p.y) * 0.8 and ax > 0.12 * k
        if on_arm:
            ap = Vector((ax, p.y, p.z))
            t = (ap - Vector(J['shoulder'])).dot((wrist - Vector(J['shoulder'])).normalized()) / (wrist - Vector(J['shoulder'])).length
            if short_sleeve and t > 0.42:
                return 0
            if t > 0.97:
                return 0
            return 1
        if p.z > neck_z and math.hypot(p.x, p.y - 0.022 * k) < 0.072 * k:
            return 0
        if p.z > neck_z + 0.06 * k:
            return 0
        if p.z > waist_z:
            # open jacket front shows inner layer
            if tk in ('longcoat', 'suit') and p.y < -0.06 * k and abs(p.x) < (0.012 + 0.055 * max(0.0, (p.z - waist_z) / (neck_z - waist_z)) ** 1.5) * k and p.z > waist_z + 0.02 * k:
                return 2
            return 1
        if long_top and p.z > J['knee'][2] + 0.06 * k:
            return 1
        if skirt and p.z > J['knee'][2] - 0.02 * k:
            return 3
        if p.z < ankle_z:
            return 3
        if skirt:
            return 0
        return 3

    for poly in me.polygons:
        c = Vector((0, 0, 0))
        for vi in poly.vertices:
            c += me.vertices[vi].co
        c /= len(poly.vertices)
        poly.material_index = classify(c)
    cols = {0: skin, 1: top, 2: inner, 3: bottom}

    def vc(p):
        return cols[classify(p)]

    vcol(body, vc)


from mathutils.bvhtree import BVHTree


def body_bvh(body):
    dg = bpy.context.evaluated_depsgraph_get()
    return BVHTree.FromObject(body, dg)


def surf_point(bvh, origin, direction, offset=0.0):
    """Ray from inside outward (or outside inward) to the body surface."""
    d = Vector(direction).normalized()
    hit = bvh.ray_cast(Vector(origin), d, 2.0)
    if hit[0] is None:
        return None, None
    return hit[0] + hit[1].normalized() * offset * (1 if hit[1].dot(d) > 0 else -1) if False else hit[0] + d * offset, hit[1]


def ring_points(bvh, center, axis, n, offset, skip_front=0.0, start=0.0, max_dist=0.3):
    """Points around an axis on the body surface (rays cast outward from the axis)."""
    axis = Vector(axis).normalized()
    ref = Vector((0, -1, 0)) if abs(axis.y) < 0.9 else Vector((1, 0, 0))
    u = (ref - axis * ref.dot(axis)).normalized()  # 'front' direction
    w = axis.cross(u).normalized()
    pts = []
    for i in range(n):
        a = start + 2 * math.pi * i / n
        if skip_front > 0:
            aa = (a + math.pi) % (2 * math.pi) - math.pi
            if abs(aa) < skip_front:
                continue
        d = u * math.cos(a) + w * math.sin(a)
        p, nrm = surf_point(bvh, center, d, offset)
        if p is None or (p - Vector(center)).length > max_dist:
            p = Vector(center) + d * max_dist
        pts.append(p)
    return pts


def band(name, rings, mat, col, closed=True, thick=0.006):
    """Strip mesh through a list of rings (each a list of points)."""
    bm = bmesh.new()
    R = [[bm.verts.new(p) for p in ring] for ring in rings]
    n = len(R[0])
    for i in range(len(R) - 1):
        for j in range(n if closed else n - 1):
            bm.faces.new((R[i][j], R[i][(j + 1) % n], R[i + 1][(j + 1) % n], R[i + 1][j]))
    ob = from_bm(name, bm)
    bpy.context.view_layer.update()
    ob.data.update()
    sol = ob.modifiers.new('Sol', 'SOLIDIFY')
    sol.thickness = thick
    sol.offset = 0
    sub = ob.modifiers.new('Sub', 'SUBSURF')
    sub.levels = 1
    apply_mods(ob)
    smooth(ob)
    set_slot(ob, mat)
    solid_col(ob, col)
    return ob


def place_on_surface(ob, bvh, origin, direction, offset):
    """Move an object (built at origin) onto the body surface along direction and orient to the normal."""
    p, nrm = surf_point(bvh, origin, direction, 0)
    if p is None:
        return
    nrm = nrm.normalized()
    if nrm.dot(Vector(direction)) < 0:
        nrm = -nrm
    q = Vector((0, -1, 0)).rotation_difference(nrm)
    ob.matrix_world = Matrix.Translation(p + nrm * offset) @ q.to_matrix().to_4x4()
    activate(ob)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)


def front_item(name, size, bvh, x, z, offset, mat, col, bevel=0.006):
    ob = rounded_box(name, size, (0, 0, 0), bevel=bevel)
    place_on_surface(ob, bvh, (x, -0.6, z), (0, 1, 0), offset + size[1] / 2)
    set_slot(ob, mat)
    solid_col(ob, col)
    return ob


def build_details(s, J, hinfo, body):
    """Collars, zips, pockets, cuffs, belts, vests, coat skirts, gear — fitted to the body surface."""
    k = s['height'] / (1.27 if s['kid'] else 1.8)
    tk = s['top_kind']
    bk = s['bottom_kind']
    gear = set(s['gear'])
    top = lin(C(s['top']))
    inner = lin(C(s['inner']))
    bottom = lin(C(s['bottom']))
    acc = lin(C(s.get('accent', s['top'])))
    dark = (0.015, 0.015, 0.016)
    parts = []
    bvh = body_bvh(body)
    if s.get('remnant'):
        rnd = random.Random(7)
        for i in range(16):
            ang = rnd.uniform(0, math.pi * 2)
            z0 = rnd.uniform(J['hips'][2] - 0.1, J['chest'][2] + 0.15)
            p0, _ = surf_point(bvh, (0, 0.01, z0), (math.cos(ang), math.sin(ang), 0), 0.002)
            if p0 is None:
                continue
            out = Vector((math.cos(ang), math.sin(ang), 0))
            pts = [p0, p0 + out * 0.015 + Vector((0, 0, -0.12 * k)), p0 + out * 0.03 + Vector((0, 0, -0.27 * k * rnd.uniform(0.6, 1.4)))]
            st = tube('Rag', [tuple(p) for p in pts], [(0.026 * k, 0.004 * k), (0.022 * k, 0.003 * k), (0.006 * k, 0.002 * k)], seg=6)
            set_slot(st, 'remnant')
            solid_col(st, lin(C('#16161c')))
            parts.append((st, None))
        return parts

    chest_z = J['chest'][2]
    neck_z = J['neck'][2]
    waist_z = J['hips'][2] + 0.04 * k
    hips_z = J['hips'][2]
    jacketish = tk in ('jacket', 'longcoat', 'raincoat', 'combat', 'suit', 'hoodie')

    # ---- collar: standing band hugging the neck base, open at the front for jackets
    if tk in ('jacket', 'longcoat', 'raincoat', 'combat', 'suit'):
        n = 28
        z0 = neck_z - 0.012 * k
        skip = 0.5 if tk in ('longcoat', 'suit') else 0.0
        r_lo = ring_points(bvh, (0, 0.022 * k, z0), (0, 0, 1), n, 0.005 * k, skip_front=skip, max_dist=0.075 * k)
        ctr = Vector((0, 0.022 * k, 0))
        r_mid = [p + Vector((0, 0, 0.026 * k)) + (p - Vector((ctr.x, ctr.y, p.z))).normalized() * (0.002 * k) for p in r_lo]
        r_hi = [p + Vector((0, 0, 0.014 * k)) + (p - Vector((ctr.x, ctr.y, p.z))).normalized() * (0.007 * k) for p in r_mid]
        col = band('Collar', [r_lo, r_mid, r_hi], 'top', tuple(c * 0.88 for c in top), closed=False, thick=0.006 * k)
        parts.append((col, None))
        if tk in ('longcoat', 'suit'):
            # lapels: flat strips down the open front edges
            for sx in (1, -1):
                pts_l, pts_r = [], []
                for i in range(7):
                    t = i / 6
                    z = neck_z - 0.02 * k - t * (neck_z - waist_z - 0.06 * k) * (0.5 if tk != 'longcoat' else 0.55)
                    xw = (0.03 + 0.03 * (1 - t)) * k
                    p1, _ = surf_point(bvh, (sx * xw, -0.5, z), (0, 1, 0), -0.006 * k)
                    p2, _ = surf_point(bvh, (sx * (xw + 0.035 * k * (1 - t * 0.7)), -0.5, z), (0, 1, 0), -0.006 * k)
                    if p1 is not None and p2 is not None:
                        pts_l.append(p1)
                        pts_r.append(p2)
                if len(pts_l) > 2:
                    bmx = bmesh.new()
                    A = [bmx.verts.new(pp) for pp in pts_l]
                    Bv = [bmx.verts.new(pp) for pp in pts_r]
                    for i in range(len(A) - 1):
                        f = (A[i], Bv[i], Bv[i + 1], A[i + 1]) if sx > 0 else (A[i], A[i + 1], Bv[i + 1], Bv[i])
                        bmx.faces.new(f)
                    lap = from_bm('Lapel', bmx)
                    sol = lap.modifiers.new('Sol', 'SOLIDIFY')
                    sol.thickness = 0.006 * k
                    apply_mods(lap)
                    smooth(lap)
                    set_slot(lap, 'top')
                    solid_col(lap, tuple(c * 0.92 for c in top))
                    parts.append((lap, None))
    if tk == 'suit' or 'tie' in gear:
        tie = rounded_box('Tie', (0.04 * k, 0.008 * k, 0.26 * k), (0, 0, 0), bevel=0.003)
        place_on_surface(tie, bvh, (0, -0.6, chest_z + 0.1 * k), (0, 1, 0), 0.008 * k)
        set_slot(tie, 'scarf')
        solid_col(tie, lin(C(s.get('tie', '#6a1a20'))))
        parts.append((tie, 'chest'))
    # ---- zipper / placket
    if tk in ('raincoat', 'hoodie', 'combat', 'jacket'):
        zs = [waist_z - 0.05 * k + i * (neck_z - waist_z) / 8 for i in range(9)]
        pts = []
        for z in zs:
            pz, _ = surf_point(bvh, (0, -0.6, z), (0, 1, 0), -0.004 * k)
            if pz is not None:
                pts.append(tuple(pz))
        if len(pts) > 2:
            zp = tube('Zip', pts, 0.004 * k, seg=6)
            set_slot(zp, 'plastic' if tk == 'raincoat' else 'metal')
            solid_col(zp, (0.04, 0.04, 0.04) if tk == 'raincoat' else (0.3, 0.3, 0.3))
            parts.append((zp, None))
    # ---- chest pockets
    if tk in ('jacket', 'combat'):
        for sx in (1, -1):
            parts.append((front_item('Pocket', (0.07 * k, 0.01 * k, 0.075 * k), bvh, 0.085 * sx * k, chest_z + 0.1 * k, 0.0, 'top', tuple(c * 0.85 for c in top)), 'chest'))
            parts.append((front_item('Flap', (0.078 * k, 0.012 * k, 0.026 * k), bvh, 0.085 * sx * k, chest_z + 0.14 * k, 0.004 * k, 'top', tuple(c * 0.78 for c in top)), 'chest'))
    if tk in ('jacket', 'raincoat', 'longcoat', 'hoodie'):
        # hand-warmer / hip pockets
        for sx in (1, -1):
            parts.append((front_item('HipPocket', (0.085 * k, 0.008 * k, 0.012 * k), bvh, 0.1 * sx * k, waist_z + 0.02 * k, 0.0, 'top', tuple(c * 0.7 for c in top), bevel=0.003), None))
    # ---- hem band
    if tk in ('jacket', 'hoodie', 'combat', 'suit'):
        z = waist_z - 0.035 * k
        r1 = ring_points(bvh, (0, 0.012 * k, z), (0, 0, 1), 32, 0.008 * k, skip_front=0.12 if tk in ('suit',) else 0)
        r2 = [p + Vector((0, 0, -0.04 * k)) for p in r1]
        parts.append((band('Hem', [r1, r2], 'top', tuple(c * 0.85 for c in top), closed=(tk not in ('suit',)), thick=0.01 * k), None))
    # ---- hood
    if tk == 'hoodie' or 'hood' in gear:
        p_back, _ = surf_point(bvh, (0, 0.6, neck_z - 0.06 * k), (0, -1, 0), 0)
        by = p_back.y if p_back is not None else 0.1 * k
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=20, v_segments=12, radius=1.0)
        kill = [vt for vt in bm.verts if vt.co.y < -0.15 or vt.co.z < -0.55]
        bmesh.ops.delete(bm, geom=kill, context='VERTS')
        for vt in bm.verts:
            vt.co = Vector((vt.co.x * 0.11 * k, vt.co.y * 0.05 * k, vt.co.z * 0.075 * k))
        bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Euler((math.radians(-25), 0, 0)).to_matrix())
        bmesh.ops.translate(bm, vec=Vector((0, by + 0.01 * k, neck_z - 0.045 * k)), verts=bm.verts)
        hood = from_bm('Hood', bm)
        sol = hood.modifiers.new('Sol', 'SOLIDIFY')
        sol.thickness = 0.008 * k
        sub = hood.modifiers.new('Sub', 'SUBSURF')
        sub.levels = 1
        apply_mods(hood)
        smooth(hood)
        set_slot(hood, 'top')
        solid_col(hood, tuple(c * 0.9 for c in top))
        parts.append((hood, 'chest'))
    # ---- long coats / raincoat skirt (weights transferred from the body so it follows the legs)
    if tk in ('longcoat', 'raincoat'):
        L = (hips_z - J['knee'][2]) + (0.07 if tk == 'longcoat' else -0.02) * k
        r0 = 0.18 * k * s['build']
        if s['kid']:
            r0 = 0.15 * k
        prof = [(r0 * 1.0, waist_z - 0.02 * k), (r0 * 1.08, hips_z - 0.08 * k), (r0 * 1.22, hips_z - L * 0.55), (r0 * 1.34, hips_z - L)]
        skirt = lathe('Skirt', prof, seg=32, sx=1.02, sy=0.8, close_top=False, close_bottom=False, center=(0, 0.012 * k, 0))
        bm = bmesh.new()
        bm.from_mesh(skirt.data)
        kill = [f for f in bm.faces if f.calc_center_median().y < -0.05 * k and abs(f.calc_center_median().x) < 0.035 * k * (1 + (hips_z - f.calc_center_median().z) * 1.5) and f.calc_center_median().z < hips_z - 0.04 * k]
        bmesh.ops.delete(bm, geom=kill, context='FACES')
        bm.to_mesh(skirt.data)
        bm.free()
        sol = skirt.modifiers.new('Sol', 'SOLIDIFY')
        sol.thickness = 0.01 * k
        sub = skirt.modifiers.new('Sub', 'SUBSURF')
        sub.levels = 1
        apply_mods(skirt)
        for v in skirt.data.vertices:
            a = math.atan2(v.co.y, v.co.x)
            depth = max(0.0, (waist_z - v.co.z) / L)
            v.co += Vector((math.cos(a), math.sin(a), 0)) * math.sin(a * 9 + 0.5) * 0.009 * depth * k
        set_slot(skirt, 'top')
        solid_col(skirt, top)
        parts.append((skirt, None))
        nb = 4 if tk == 'longcoat' else 3
        for i in range(nb):
            bz = chest_z + 0.15 * k - i * 0.11 * k
            bt = front_item('Button', (0.02 * k, 0.008 * k, 0.02 * k if tk == 'longcoat' else 0.011 * k), bvh, 0.04 * k, bz, 0.004 * k, 'plastic',
                            (0.03, 0.03, 0.03) if tk == 'longcoat' else (0.05, 0.04, 0.03), bevel=0.004)
            parts.append((bt, 'chest' if bz > J['chest'][2] else 'spine'))
        # back vent seam & belt for trench feel
        if tk == 'longcoat':
            r1 = ring_points(bvh, (0, 0.012 * k, waist_z + 0.01 * k), (0, 0, 1), 32, 0.012 * k, skip_front=0.2)
            r2 = [p + Vector((0, 0, 0.035 * k)) for p in r1]
            parts.append((band('CoatBelt', [r1, r2], 'top', tuple(c * 0.8 for c in top), closed=False, thick=0.008 * k), None))
    # ---- belt
    if bk in ('jeans', 'cargo', 'slacks') and tk not in ('longcoat', 'raincoat'):
        r1 = ring_points(bvh, (0, 0.012 * k, hips_z + 0.0), (0, 0, 1), 32, 0.006 * k)
        r2 = [p + Vector((0, 0, 0.035 * k)) for p in r1]
        parts.append((band('Belt', [r1, r2], 'leather', (0.035, 0.022, 0.014), thick=0.008 * k), 'hips'))
        parts.append((front_item('Buckle', (0.045 * k, 0.012 * k, 0.034 * k), bvh, 0, hips_z + 0.0175 * k, 0.008 * k, 'metal', (0.55, 0.52, 0.45), bevel=0.003), 'hips'))
    # ---- pant hems at the ankles
    if bk not in ('skirt', 'gown', 'rags'):
        for side in ('L', 'R'):
            an = Vector(mirror(J['ankle'], side))
            kn = Vector(mirror(J['knee'], side))
            ax = (kn - an).normalized()
            c0 = an + ax * 0.075 * k
            r1 = ring_points(bvh, c0, ax, 20, 0.006 * k, max_dist=0.09 * k)
            r2 = [p - ax * 0.03 * k + (p - c0).normalized() * 0.006 * k for p in r1]
            parts.append((band('PantHem', [r1, r2], 'denim' if bk == 'jeans' else 'bottom', tuple(c * 0.85 for c in bottom), thick=0.006 * k), f'shin.{side}'))
    if bk == 'cargo':
        for sx in (1, -1):
            kz = (J['thigh'][2] + J['knee'][2]) / 2
            pk = rounded_box('Cargo', (0.035 * k, 0.1 * k, 0.12 * k), (0, 0, 0), bevel=0.01)
            p, nrm = surf_point(bvh, (sx * J['thigh'][0], 0.0, kz), (sx, 0, 0), 0.0)
            if p is not None:
                pk.location = p + Vector((sx * 0.016 * k, 0, 0))
                activate(pk)
                bpy.ops.object.transform_apply(location=True)
            set_slot(pk, 'bottom')
            solid_col(pk, tuple(c * 0.85 for c in bottom))
            parts.append((pk, 'thigh.L' if sx > 0 else 'thigh.R'))
    # ---- tactical vest
    if 'vest' in gear:
        rings = []
        for i in range(6):
            z = waist_z - 0.02 * k + i * (neck_z - 0.06 * k - waist_z) / 5
            rings.append(ring_points(bvh, (0, 0.012 * k, z), (0, 0, 1), 32, 0.016 * k))
        vest = band('Vest', rings, 'nylon', acc, closed=True, thick=0.022 * k)
        parts.append((vest, None))
        for sx in (-0.1, -0.035, 0.035, 0.1):
            parts.append((front_item('Pouch', (0.058 * k, 0.04 * k, 0.09 * k), bvh, sx * k * s['build'], waist_z + 0.08 * k, 0.02 * k, 'nylon', tuple(c * 0.85 for c in acc), bevel=0.008), 'spine'))
        for sx in (1, -1):
            pts = ring_points(bvh, (sx * 0.09 * k, 0.0, neck_z - 0.03 * k), (1, 0, 0), 16, 0.016 * k)
            top_pts = [p for p in pts if p.z > neck_z - 0.06 * k]
            top_pts.sort(key=lambda p: p.y)
            if len(top_pts) > 2:
                st = tube('Strap', [tuple(p) for p in top_pts], (0.024 * k, 0.007 * k), seg=6)
                set_slot(st, 'nylon')
                solid_col(st, tuple(c * 0.8 for c in acc))
                parts.append((st, 'chest'))
    if 'backpack' in gear:
        p, _ = surf_point(bvh, (0, 0.6, chest_z + 0.08 * k), (0, -1, 0), 0)
        by = (p.y if p is not None else 0.15 * k) + 0.075 * k
        bp = rounded_box('Pack', (0.29 * k * s['build'], 0.15 * k, 0.38 * k), (0, by, chest_z + 0.08 * k), bevel=0.04 * k)
        set_slot(bp, 'nylon')
        bpc = acc if s['kid'] else tuple(c * 0.8 for c in acc)
        solid_col(bp, bpc)
        parts.append((bp, 'chest'))
        fp = rounded_box('PackPocket', (0.21 * k, 0.05 * k, 0.16 * k), (0, by + 0.09 * k, chest_z - 0.02 * k), bevel=0.016 * k)
        set_slot(fp, 'nylon')
        solid_col(fp, tuple(c * 0.75 for c in bpc))
        parts.append((fp, 'chest'))
        for sx in (1, -1):
            pts = [tuple(pp) for pp in ring_points(bvh, (sx * 0.1 * k, 0.0, chest_z + 0.14 * k), (1, 0, 0), 12, 0.006 * k) if pp.z > chest_z + 0.05 * k]
            pts.sort(key=lambda q: q[1])
            if len(pts) > 2:
                st = tube('PackStrap', pts, (0.02 * k, 0.005 * k), seg=6)
                set_slot(st, 'nylon')
                solid_col(st, tuple(c * 0.7 for c in bpc))
                parts.append((st, 'chest'))
    if 'holster' in gear:
        tz = J['thigh'][2] - 0.14 * k
        p, _ = surf_point(bvh, (-J['thigh'][0], 0.0, tz), (-1, 0, 0), 0)
        hx = (p.x if p is not None else -0.17 * k) - 0.025 * k
        h = rounded_box('Holster', (0.05 * k, 0.1 * k, 0.17 * k), (hx, 0.0, tz), bevel=0.012 * k)
        set_slot(h, 'leather')
        solid_col(h, (0.03, 0.03, 0.03))
        parts.append((h, 'thigh.R'))
        th_ax = (Vector(mirror(J['knee'], 'R')) - Vector(mirror(J['thigh'], 'R'))).normalized()
        c0 = Vector(mirror(J['thigh'], 'R')) + th_ax * 0.2 * k
        r1 = ring_points(bvh, c0, th_ax, 20, 0.004 * k, max_dist=0.1 * k)
        r2 = [pp + th_ax * 0.025 * k for pp in r1]
        parts.append((band('LegStrap', [r1, r2], 'nylon', (0.02, 0.02, 0.02), thick=0.005 * k), 'thigh.R'))
    if 'radio' in gear:
        parts.append((front_item('Radio', (0.05 * k, 0.03 * k, 0.085 * k), bvh, -0.11 * k, chest_z + 0.15 * k, 0.012 * k, 'plastic', dark, bevel=0.008), 'chest'))
    if 'chestlight' in gear:
        parts.append((front_item('Light', (0.05 * k, 0.065 * k, 0.05 * k), bvh, 0.105 * k, chest_z + 0.17 * k, 0.012 * k, 'metal', (0.06, 0.06, 0.065), bevel=0.01), 'chest'))
        lens = lathe('Lens', [(0.001, 0), (0.019 * k, 0), (0.019 * k, 0.004 * k), (0.001, 0.004 * k)], seg=16, rot=(math.radians(90), 0, 0))
        p, nrm = surf_point(bvh, (0.105 * k, -0.6, chest_z + 0.17 * k), (0, 1, 0), 0)
        if p is not None:
            lens.location = p + Vector((0, -0.078 * k, 0))
            activate(lens)
            bpy.ops.object.transform_apply(location=True)
        set_slot(lens, 'emit')
        solid_col(lens, (1.0, 0.92, 0.75))
        parts.append((lens, 'chest'))
    if 'badge' in gear:
        parts.append((front_item('Badge', (0.045 * k, 0.005 * k, 0.06 * k), bvh, -0.08 * k, chest_z + 0.07 * k, 0.004 * k, 'plastic', (0.85, 0.85, 0.82), bevel=0.002), 'chest'))
    if 'satchel' in gear:
        p, _ = surf_point(bvh, (0.0, 0.0, hips_z - 0.02 * k), (1, 0, 0), 0)
        sx_ = (p.x if p is not None else 0.18 * k) + 0.04 * k
        sb = rounded_box('Satchel', (0.07 * k, 0.22 * k, 0.17 * k), (sx_, 0.0, hips_z - 0.03 * k), bevel=0.02 * k)
        set_slot(sb, 'leather')
        solid_col(sb, lin(C('#4a3420')))
        parts.append((sb, 'hips'))
        # diagonal strap across the torso, following the surface
        pts = []
        for i in range(10):
            t = i / 9
            z = (hips_z + 0.05 * k) + t * (neck_z - 0.03 * k - hips_z - 0.05 * k)
            x = 0.15 * k - t * 0.27 * k
            pf, _ = surf_point(bvh, (x, -0.6, z), (0, 1, 0), -0.006 * k)
            if pf is not None:
                pts.append(tuple(pf))
        if len(pts) > 2:
            st = tube('SatchelStrap', pts, (0.02 * k, 0.005 * k), seg=6)
            set_slot(st, 'leather')
            solid_col(st, lin(C('#3a2818')))
            parts.append((st, None))
    if 'scarf' in gear:
        r_lo = ring_points(bvh, (0, 0.02 * k, neck_z + 0.005 * k), (0, 0, 1), 24, 0.012 * k)
        r_hi = [pp + Vector((0, 0, 0.05 * k)) for pp in r_lo]
        parts.append((band('Scarf', [r_lo, r_hi], 'scarf', lin(C(s.get('scarf', '#6a2a2a'))), thick=0.02 * k), None))
        pts = []
        for i in range(6):
            z = neck_z - i * 0.06 * k
            pf, _ = surf_point(bvh, (0.035 * k, -0.6, z), (0, 1, 0), -0.014 * k)
            if pf is not None:
                pts.append(tuple(pf))
        if len(pts) > 2:
            tail = tube('ScarfTail', pts, (0.045 * k, 0.008 * k), seg=6)
            set_slot(tail, 'scarf')
            solid_col(tail, lin(C(s.get('scarf', '#6a2a2a'))))
            parts.append((tail, 'chest'))
    if 'glasses' in gear:
        cy, cz, hs = hinfo
        for sx in (1, -1):
            pts = []
            for i in range(13):
                a = 2 * math.pi * i / 12
                pts.append((0.032 * sx * hs + math.cos(a) * 0.017 * hs, cy - 0.093 * hs, cz + 0.014 * hs + math.sin(a) * 0.012 * hs))
            fr = tube('Frame', pts, 0.0016 * hs, seg=4, caps=False)
            set_slot(fr, 'metal')
            solid_col(fr, (0.05, 0.05, 0.05))
            parts.append((fr, 'head'))
            arm_ = tube('Temple', [(0.049 * sx * hs, cy - 0.091 * hs, cz + 0.018 * hs), (0.079 * sx * hs, cy - 0.04 * hs, cz + 0.016 * hs), (0.08 * sx * hs, cy + 0.01 * hs, cz + 0.002 * hs)], 0.0016 * hs, seg=4)
            set_slot(arm_, 'metal')
            solid_col(arm_, (0.05, 0.05, 0.05))
            parts.append((arm_, 'head'))
        br = tube('Bridge', [(-0.015 * hs, cy - 0.094 * hs, cz + 0.018 * hs), (0.015 * hs, cy - 0.094 * hs, cz + 0.018 * hs)], 0.0016 * hs, seg=4)
        set_slot(br, 'metal')
        solid_col(br, (0.05, 0.05, 0.05))
        parts.append((br, 'head'))
    # ---- sleeve cuffs
    if tk not in ('scrubs', 'gown'):
        for side in ('L', 'R'):
            w = Vector(mirror(J['wrist'], side))
            el = Vector(mirror(J['elbow'], side))
            d = (w - el).normalized()
            c0 = w - d * 0.05 * k
            r1 = ring_points(bvh, c0, d, 18, 0.005 * k, max_dist=0.08 * k)
            r2 = [pp + d * 0.032 * k + (pp - c0).normalized() * 0.003 * k for pp in r1]
            parts.append((band('Cuff', [r1, r2], 'top', tuple(c * 0.82 for c in top), thick=0.006 * k), f'forearm.{side}'))
    # ---- shoulder seams for jackets
    if jacketish and not s.get('lod'):
        for side in ('L', 'R'):
            sh = Vector(mirror(J['shoulder'], side))
            el = Vector(mirror(J['elbow'], side))
            d = (el - sh).normalized()
            c0 = sh + d * 0.035 * k
            r1 = ring_points(bvh, c0, d, 18, 0.0025 * k, max_dist=0.1 * k)
            r2 = [pp + d * 0.006 * k for pp in r1]
            parts.append((band('Seam', [r1, r2], 'top', tuple(c * 0.75 for c in top), thick=0.003 * k), None))
    return parts


# ============================================================================ binding
def bind(body, others, arm):
    activate(arm, [body])
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    for ob, bone in others:
        ob.parent = arm
        mod = ob.modifiers.new('Armature', 'ARMATURE')
        mod.object = arm
        if bone:
            vg = ob.vertex_groups.new(name=bone)
            vg.add(list(range(len(ob.data.vertices))), 1.0, 'REPLACE')
        else:
            # transfer weights from the body surface
            for bn in BONE_LIST:
                ob.vertex_groups.new(name=bn)
            dt = ob.modifiers.new('DT', 'DATA_TRANSFER')
            dt.object = body
            dt.use_vert_data = True
            dt.data_types_verts = {'VGROUP_WEIGHTS'}
            dt.vert_mapping = 'POLYINTERP_NEAREST'
            dt.layers_vgroup_select_src = 'ALL'
            dt.layers_vgroup_select_dst = 'NAME'
            activate(ob)
            bpy.ops.object.modifier_move_to_index(modifier='DT', index=0)
            bpy.ops.object.modifier_apply(modifier='DT')


def finalize(s, name, body, extras, arm):
    """Join everything, UV-unwrap, bake procedural materials to an atlas, swap to baked material."""
    objs = [body] + extras
    counts = {}
    for o in objs:
        key = o.name.split('.')[0]
        counts[key] = counts.get(key, 0) + sum(len(pp.vertices) - 2 for pp in o.data.polygons)
    print('[tris]', sorted(counts.items(), key=lambda kv: -kv[1])[:12])
    activate(body, objs)
    bpy.ops.object.join()
    ob = body
    ob.name = name
    # UV atlas
    activate(ob)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.006, area_weight=0.0, scale_to_bounds=True)
    bpy.ops.object.mode_set(mode='OBJECT')
    if NOBAKE:
        return ob
    res = s.get('tex', 1024)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = 2
    sc.render.bake.margin = 6
    sc.cycles.use_denoising = False
    sc.cycles.use_adaptive_sampling = False
    imgs = {}

    def route(channel):
        """Temporarily wire a Principled input into an Emission shader so EMIT bakes capture it."""
        saved = []
        for mat in ob.data.materials:
            nt = mat.node_tree
            bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
            out = next(n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL')
            em = nt.nodes.new('ShaderNodeEmission')
            em.name = 'BAKE_EMIT'
            sock = bsdf.inputs[channel]
            if sock.is_linked:
                nt.links.new(sock.links[0].from_socket, em.inputs['Color'])
            else:
                v = sock.default_value
                em.inputs['Color'].default_value = (v, v, v, 1) if isinstance(v, float) else tuple(v)
            if channel == 'Emission Color':
                em.inputs['Strength'].default_value = bsdf.inputs['Emission Strength'].default_value
            prev = out.inputs['Surface'].links[0].from_socket
            nt.links.new(em.outputs[0], out.inputs['Surface'])
            saved.append((nt, em, out, prev))
        return saved

    def unroute(saved):
        for nt, em, out, prev in saved:
            nt.links.new(prev, out.inputs['Surface'])
            nt.nodes.remove(em)

    for kind, colorspace in (('DIFFUSE', 'sRGB'), ('ROUGHNESS', 'Non-Color'), ('NORMAL', 'Non-Color'), ('EMIT', 'sRGB')):
        img = bpy.data.images.new(f'{name}_{kind}', res, res, alpha=False, float_buffer=False)
        img.colorspace_settings.name = colorspace
        if kind == 'NORMAL':
            img.generated_color = (0.5, 0.5, 1, 1)
        for mat in ob.data.materials:
            nt = mat.node_tree
            tn = nt.nodes.get('BAKE_TARGET') or nt.nodes.new('ShaderNodeTexImage')
            tn.name = 'BAKE_TARGET'
            tn.image = img
            tn.select = True
            nt.nodes.active = tn
        saved = None
        if kind == 'DIFFUSE':
            saved = route('Base Color')
        elif kind == 'ROUGHNESS':
            saved = route('Roughness')
        elif kind == 'EMIT':
            saved = route('Emission Color')
        activate(ob)
        bpy.ops.object.bake(type='EMIT' if kind != 'NORMAL' else 'NORMAL', use_clear=True, margin=6)
        if saved:
            unroute(saved)
        img.filepath_raw = os.path.join(OUT, f'_{name}_{kind.lower()}.png')
        img.file_format = 'PNG'
        img.save()
        imgs[kind] = img
    # final material
    fm = bpy.data.materials.new(f'{name}_mat')
    fm.use_nodes = True
    nt = nodes_clear(fm)
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    nt.links.new(bsdf.outputs[0], out.inputs[0])
    td = nt.nodes.new('ShaderNodeTexImage')
    td.image = imgs['DIFFUSE']
    nt.links.new(td.outputs['Color'], bsdf.inputs['Base Color'])
    tr = nt.nodes.new('ShaderNodeTexImage')
    tr.image = imgs['ROUGHNESS']
    sep = nt.nodes.new('ShaderNodeSeparateColor')
    nt.links.new(tr.outputs['Color'], sep.inputs[0])
    nt.links.new(sep.outputs['Green'], bsdf.inputs['Roughness'])
    bsdf.inputs['Metallic'].default_value = 0.0
    tn_ = nt.nodes.new('ShaderNodeTexImage')
    tn_.image = imgs['NORMAL']
    nm = nt.nodes.new('ShaderNodeNormalMap')
    nt.links.new(tn_.outputs['Color'], nm.inputs['Color'])
    nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
    if s.get('remnant') or 'chestlight' in s['gear']:
        te = nt.nodes.new('ShaderNodeTexImage')
        te.image = imgs['EMIT']
        nt.links.new(te.outputs['Color'], bsdf.inputs['Emission Color'])
        bsdf.inputs['Emission Strength'].default_value = 1.0
    ob.data.materials.clear()
    ob.data.materials.append(fm)
    for p in ob.data.polygons:
        p.material_index = 0
    return ob


# ============================================================================ animation
def game_rot(x, y, z):
    """Rotation in game axes (x right-handed pitch, y yaw about up, z roll about forward) -> Blender quaternion.
    game X = blender X, game Y(up) = blender Z, game Z(forward) = blender -Y."""
    qx = Quaternion((1, 0, 0), x)
    qy = Quaternion((0, 0, 1), y)
    qz = Quaternion((0, -1, 0), z)
    return qx @ qy @ qz


class Animator:
    def __init__(self, arm, s):
        self.arm = arm
        self.s = s
        self.pb = arm.pose.bones
        self.B = {b.name: b.bone.matrix_local.to_quaternion() for b in self.pb}
        for b in self.pb:
            b.rotation_mode = 'QUATERNION'
        self.kid = s['kid']
        self.k = s['height'] / (1.27 if s['kid'] else 1.8)

    def apply(self, pose):
        for b in self.pb:
            b.rotation_quaternion = Quaternion()
            b.location = Vector()
        for name, val in pose.items():
            if name == 'loc':
                B = self.B['hips']
                v = Vector((val[0], -val[2], val[1])) * self.k
                self.pb['hips'].location = B.inverted() @ v
                continue
            if name not in self.pb:
                continue
            if name in HINGES:
                self.pb[name].rotation_quaternion = Quaternion((1, 0, 0), val)
            else:
                R = game_rot(*val)
                B = self.B[name]
                self.pb[name].rotation_quaternion = B.inverted() @ R @ B

    def key(self, frame):
        for b in self.pb:
            b.keyframe_insert('rotation_quaternion', frame=frame)
        self.pb['hips'].keyframe_insert('location', frame=frame)

    def action(self, name, frames, fn, step=2, loop=True):
        act = bpy.data.actions.new(name)
        self.arm.animation_data_create()
        self.arm.animation_data.action = act
        fs = list(range(0, frames + 1, step))
        if fs[-1] != frames:
            fs.append(frames)
        for f in fs:
            t = f / frames
            self.apply(fn(t, f / FPS))
            self.key(f + 1)
        # make loops seamless by ensuring quaternion continuity
        for fc in act.fcurves:
            for kp in fc.keyframe_points:
                kp.interpolation = 'BEZIER'
                kp.handle_left_type = 'AUTO_CLAMPED'
                kp.handle_right_type = 'AUTO_CLAMPED'
            if loop:
                m = fc.modifiers.new('CYCLES')
        act.use_fake_user = True
        track = self.arm.animation_data.nla_tracks.new()
        track.name = name
        st = track.strips.new(name, 1, act)
        st.name = name
        track.mute = True
        self.arm.animation_data.action = None
        return act


def P(**kw):
    return dict(kw)


def blend(a, b, t):
    out = {}
    keys = set(a) | set(b)
    for kk in keys:
        va = a.get(kk, 0.0 if kk in HINGES else (0, 0, 0))
        vb = b.get(kk, 0.0 if kk in HINGES else (0, 0, 0))
        if isinstance(va, (int, float)):
            out[kk] = va + (vb - va) * t
        else:
            out[kk] = tuple(x + (y - x) * t for x, y in zip(va, vb))
    return out


def add(a, b):
    out = dict(a)
    for kk, vb in b.items():
        va = out.get(kk, 0.0 if kk in HINGES else (0, 0, 0))
        if isinstance(va, (int, float)):
            out[kk] = va + vb
        else:
            out[kk] = tuple(x + y for x, y in zip(va, vb))
    return out


def ease(t):
    return t * t * (3 - 2 * t)


def seq(t, keys):
    """keys: list of (time, pose). Smoothstep between keyframes."""
    if t <= keys[0][0]:
        return keys[0][1]
    for i in range(len(keys) - 1):
        t0, p0 = keys[i]
        t1, p1 = keys[i + 1]
        if t <= t1:
            return blend(p0, p1, ease((t - t0) / max(1e-5, t1 - t0)))
    return keys[-1][1]


AL = -ARM_A + 0.1   # left upper arm relaxed (adduct to side)
AR = ARM_A - 0.1


def base_pose(arms_out=0.0, elbow=0.18):
    return {
        'upperarm.L': (0.05, 0, AL + arms_out), 'upperarm.R': (0.05, 0, AR - arms_out),
        'forearm.L': elbow, 'forearm.R': elbow,
        'hand.L': (0, 0, 0.05), 'hand.R': (0, 0, -0.05),
        'shin.L': 0.05, 'shin.R': 0.05,
        'shoulder.L': (0, 0, 0), 'shoulder.R': (0, 0, 0),
    }


def locomotion(t, amp, kid=False):
    """Generic gait at phase t (0..1). amp: dict of parameters."""
    p = 2 * math.pi * t
    s = math.sin(p)
    c = math.cos(p)
    A = amp['leg']
    fwd = amp.get('fwd', 0.0)
    pose = base_pose(elbow=amp['elbow'])

    def knee(ph):
        swing = max(0.0, math.cos(ph + 0.35)) ** 2
        load = max(0.0, math.cos(ph - 2.1)) ** 4
        return amp['knee0'] + amp['knee'] * swing + amp['load'] * load

    pose['thigh.L'] = (-A * s - fwd, 0, 0.02)
    pose['thigh.R'] = (A * s - fwd, 0, -0.02)
    pose['shin.L'] = knee(p)
    pose['shin.R'] = knee(p + math.pi)
    toe_off_L = max(0.0, -math.sin(p + 0.25)) ** 2
    toe_off_R = max(0.0, math.sin(p + 0.25)) ** 2
    pose['foot.L'] = -amp['toe'] * toe_off_L + 0.18 * max(0.0, s) + fwd * 0.3
    pose['foot.R'] = -amp['toe'] * toe_off_R + 0.18 * max(0.0, -s) + fwd * 0.3
    bob = amp['bob'] * math.cos(2 * p) - amp['bob'] - amp.get('drop', 0.0)
    pose['loc'] = (-amp['sway'] * c, bob, 0.0)
    pose['hips'] = (amp.get('tilt', 0.0), -amp['twist'] * s, 0.025 * c * amp.get('roll', 1))
    pose['spine'] = (amp['lean'] * 0.5, amp['twist'] * s * 0.6, -0.015 * c)
    pose['chest'] = (amp['lean'] * 0.5 + 0.01 * math.cos(2 * p), amp['twist'] * s * 0.7, 0)
    pose['neck'] = (-amp['lean'] * 0.5, -amp['twist'] * s * 0.6, 0)
    pose['head'] = (-amp['lean'] * 0.3 + 0.015 * math.cos(2 * p + 0.5), 0, 0)
    arm = amp['arm']
    pose['upperarm.L'] = (arm * s + amp.get('armback', 0), 0, AL + amp.get('armout', 0.05))
    pose['upperarm.R'] = (-arm * s + amp.get('armback', 0), 0, AR - amp.get('armout', 0.05))
    pose['forearm.L'] = amp['elbow'] + amp['elbowSwing'] * max(0.0, -s)
    pose['forearm.R'] = amp['elbow'] + amp['elbowSwing'] * max(0.0, s)
    pose['shoulder.L'] = (0, 0.04 * s, 0)
    pose['shoulder.R'] = (0, 0.04 * s, 0)
    return pose


WALK = dict(leg=0.42, knee0=0.06, knee=1.0, load=0.18, toe=0.35, bob=0.018, sway=0.022, twist=0.08, lean=0.06, arm=0.32, elbow=0.22, elbowSwing=0.25)
RUN = dict(leg=0.78, fwd=0.18, knee0=0.25, knee=1.75, load=0.35, toe=0.55, bob=0.035, sway=0.015, twist=0.12, lean=0.22, arm=0.75, elbow=1.35, elbowSwing=0.25, armout=0.08)
SPRINT = dict(leg=0.95, fwd=0.25, knee0=0.3, knee=2.0, load=0.4, toe=0.7, bob=0.04, sway=0.01, twist=0.14, lean=0.35, arm=0.95, elbow=1.45, elbowSwing=0.2, armout=0.06)
CROUCH = dict(leg=0.35, fwd=0.95, knee0=1.35, knee=0.55, load=0.1, toe=0.2, bob=0.012, sway=0.03, twist=0.06, lean=0.42, arm=0.12, elbow=0.6, elbowSwing=0.1, drop=0.36, tilt=0.15, armback=-0.3)
REM_RUN = dict(leg=0.85, fwd=0.4, knee0=0.45, knee=1.6, load=0.3, toe=0.6, bob=0.05, sway=0.04, twist=0.2, lean=0.65, arm=0.35, elbow=0.4, elbowSwing=0.3, armback=0.5, armout=0.25, drop=0.12)
REM_WALK = dict(leg=0.4, fwd=0.2, knee0=0.3, knee=0.9, load=0.2, toe=0.3, bob=0.03, sway=0.05, twist=0.12, lean=0.45, arm=0.1, elbow=0.2, elbowSwing=0.1, armout=0.1, drop=0.06)


def idle_pose(t, tsec, k=1.0, alert=0.0):
    p = 2 * math.pi * t
    br = math.sin(p * 2)  # breathing (2 breaths per loop)
    sway = math.sin(p)
    pose = base_pose(arms_out=0.03, elbow=0.2 + alert * 0.4)
    pose['loc'] = (0.012 * sway, -0.004 + 0.002 * br - alert * 0.05, 0)
    pose['hips'] = (0, 0.02 * sway, -0.025 * sway)
    pose['spine'] = (0.015 * br * 0 + alert * 0.08, 0, 0.012 * sway)
    pose['chest'] = (-0.018 * br, 0, 0.01 * sway)
    pose['neck'] = (0.01 * br, 0.06 * math.sin(p + 1.2), 0)
    pose['head'] = (0.02 * math.sin(p * 1.5), 0.08 * math.sin(p + 0.6), 0.02 * sway)
    pose['thigh.L'] = (-0.02 - alert * 0.15, 0, 0.04 + 0.02 * sway)
    pose['thigh.R'] = (0.02 - alert * 0.15, 0, -0.04 + 0.02 * sway)
    pose['shin.L'] = 0.04 + 0.03 * max(0, -sway) + alert * 0.3
    pose['shin.R'] = 0.08 + 0.05 * max(0, sway) + alert * 0.3
    pose['foot.L'] = -0.02 + alert * 0.15
    pose['foot.R'] = -0.05 + alert * 0.15
    pose['upperarm.L'] = (0.03 + 0.02 * br, 0, AL + 0.04 + 0.01 * br)
    pose['upperarm.R'] = (0.03 + 0.02 * br, 0, AR - 0.04 - 0.01 * br)
    return pose


def aim_pose(pitch=0.0):
    """Two-handed pistol aim (upper body)."""
    return {
        'spine': (0.05, -0.12, 0), 'chest': (0.02, -0.18, 0), 'neck': (0, 0.16, 0), 'head': (0.0, 0.12, 0.05),
        'shoulder.R': (0, 0.05, 0), 'shoulder.L': (0, -0.12, 0),
        'upperarm.R': (-1.42 - pitch, -0.08, AR - 0.12), 'forearm.R': 0.12, 'hand.R': (0.0, 0.0, 0.0),
        'upperarm.L': (-1.28 - pitch, -0.62, AL + 0.62), 'forearm.L': 0.72, 'hand.L': (0.25, 0.3, -0.2),
        'fingers.R': 1.15, 'index.R': 0.35, 'thumb.R': 0.6, 'fingers.L': 0.95, 'thumb.L': 0.3,
    }


def make_anims(arm, s, kind):
    A = Animator(arm, s)
    kid = s['kid']
    rem = s.get('remnant')
    acts = []

    def act(name, seconds, fn, step=2, loop=True):
        acts.append(A.action(name, max(2, int(round(seconds * FPS))), fn, step, loop))

    if rem:
        hunch = {'spine': (0.4, 0, 0), 'chest': (0.35, 0, 0), 'neck': (-0.2, 0, 0), 'head': (-0.35, 0, 0.25)}

        def rem_idle(t, ts):
            p = 2 * math.pi * t
            pose = idle_pose(t, ts, alert=0.6)
            pose = add(pose, hunch)
            twitch = 1.0 if (int(t * 17) % 7 == 0) else 0.0
            pose['head'] = (-0.35 + 0.3 * twitch, 0.6 * math.sin(p * 3) * twitch, 0.25 + 0.4 * twitch)
            pose['upperarm.L'] = (0.2, 0.1, AL + 0.2)
            pose['upperarm.R'] = (0.15 - 0.4 * twitch, -0.1, AR - 0.25)
            pose['forearm.L'] = 0.3
            pose['forearm.R'] = 0.5 + 0.8 * twitch
            pose['hand.L'] = (0.3, 0, 0.3)
            return pose
        act('rem_idle', 3.0, rem_idle, step=1)
        act('rem_walk', 1.3, lambda t, ts: add(locomotion(t, REM_WALK), {'head': (-0.2, 0.3 * math.sin(t * 12), 0.3)}))
        act('rem_run', 0.6, lambda t, ts: add(locomotion(t, REM_RUN), {'head': (-0.4, 0, 0.1 * math.sin(t * 6.28))}))

        def rem_lunge(t, ts):
            stand = add(idle_pose(0, 0, alert=1), hunch)
            wind = add(locomotion(0.25, REM_RUN), {'spine': (0.2, 0.3, 0), 'chest': (0.3, 0.3, 0), 'upperarm.L': (0.9, 0, AL + 0.6), 'upperarm.R': (0.9, 0, AR - 0.6), 'loc': (0, -0.25, -0.15)})
            strike = {'spine': (0.55, -0.1, 0), 'chest': (0.4, -0.1, 0), 'head': (0.2, 0, 0), 'neck': (0.2, 0, 0),
                      'upperarm.L': (-1.9, 0.2, AL + 0.35), 'upperarm.R': (-1.9, -0.2, AR - 0.35), 'forearm.L': 0.1, 'forearm.R': 0.1,
                      'thigh.L': (-1.0, 0, 0), 'thigh.R': (0.6, 0, 0), 'shin.L': 0.5, 'shin.R': 0.3, 'loc': (0, -0.2, 0.35), 'hand.L': (-0.4, 0, 0), 'hand.R': (-0.4, 0, 0)}
            return seq(t, [(0, stand), (0.35, wind), (0.55, strike), (0.7, strike), (1.0, stand)])
        act('rem_lunge', 1.1, rem_lunge, step=1, loop=False)

        def rem_crawl(t, ts):
            p = 2 * math.pi * t
            s_ = math.sin(p)
            return {
                'loc': (0.03 * math.cos(p), -0.62 + 0.02 * math.cos(2 * p), 0), 'hips': (1.25, 0.1 * s_, 0),
                'spine': (0.2, -0.1 * s_, 0), 'chest': (0.1, -0.1 * s_, 0), 'neck': (-0.9, 0, 0), 'head': (-0.6, 0.15 * math.sin(p * 2), 0.3),
                'upperarm.L': (-1.4 + 0.5 * s_, 0, AL + 0.35), 'upperarm.R': (-1.4 - 0.5 * s_, 0, AR - 0.35),
                'forearm.L': 0.3 + 0.4 * max(0, s_), 'forearm.R': 0.3 + 0.4 * max(0, -s_), 'hand.L': (0.9, 0, 0), 'hand.R': (0.9, 0, 0),
                'thigh.L': (-1.9 - 0.45 * s_, 0, 0.4), 'thigh.R': (-1.9 + 0.45 * s_, 0, -0.4), 'shin.L': 1.9 - 0.4 * max(0, -s_), 'shin.R': 1.9 - 0.4 * max(0, s_),
                'foot.L': -0.6, 'foot.R': -0.6,
            }
        act('rem_crawl', 1.0, rem_crawl)

        def rem_scream(t, ts):
            stand = add(idle_pose(0, 0, alert=0.6), hunch)
            sc = {'spine': (-0.15, 0, 0), 'chest': (-0.25, 0, 0), 'neck': (-0.4, 0, 0), 'head': (-0.5, 0, 0.1 * math.sin(ts * 60)),
                  'upperarm.L': (-0.2, 0, AL + 1.2), 'upperarm.R': (-0.2, 0, AR - 1.2), 'forearm.L': 0.4, 'forearm.R': 0.4, 'loc': (0, -0.05, 0)}
            return seq(t, [(0, stand), (0.25, sc), (0.8, sc), (1, stand)])
        act('rem_scream', 1.6, rem_scream, step=1, loop=False)

        def rem_hit(t, ts):
            stand = add(idle_pose(0, 0, alert=0.6), hunch)
            hit = add(stand, {'spine': (-0.35, 0.3, 0), 'chest': (-0.3, 0.2, 0), 'head': (-0.4, 0.4, 0.3), 'loc': (0, 0, -0.12)})
            return seq(t, [(0, stand), (0.2, hit), (1, stand)])
        act('rem_hit', 0.45, rem_hit, step=1, loop=False)

        def rem_death(t, ts):
            stand = add(idle_pose(0, 0, alert=0.6), hunch)
            kneel = {'loc': (0, -0.5, 0), 'thigh.L': (-1.4, 0, 0.1), 'thigh.R': (-1.4, 0, -0.1), 'shin.L': 2.2, 'shin.R': 2.2, 'spine': (0.6, 0, 0), 'chest': (0.4, 0, 0), 'head': (0.6, 0.4, 0.3),
                     'upperarm.L': (0.3, 0, AL), 'upperarm.R': (0.3, 0, AR), 'forearm.L': 0.2, 'forearm.R': 0.2}
            down = {'loc': (0, -0.85, -0.3), 'hips': (1.45, 0.2, 0), 'thigh.L': (-0.3, 0, 0.1), 'thigh.R': (-0.1, 0, -0.1), 'shin.L': 0.6, 'shin.R': 0.2, 'spine': (0.1, 0, 0), 'chest': (0.1, 0, 0), 'head': (-0.3, 0.8, 0),
                    'upperarm.L': (-2.6, 0, AL + 0.4), 'upperarm.R': (-2.0, 0, AR - 0.6), 'forearm.L': 0.4, 'forearm.R': 0.6}
            return seq(t, [(0, stand), (0.3, kneel), (0.7, down), (1, down)])
        act('rem_death', 1.4, rem_death, step=1, loop=False)
        act('rem_frozen', 1.0, lambda t, ts: add(idle_pose(0, 0, alert=0.8), {'spine': (0.3, 0, 0), 'upperarm.L': (-1.2, 0, AL + 0.3), 'upperarm.R': (-1.5, 0, AR - 0.2), 'forearm.L': 0.4, 'forearm.R': 0.2, 'head': (-0.3, 0, 0.4)}), step=10)
        return acts

    # ------------------------------------------------------------------ human set
    act('idle', 4.0, lambda t, ts: idle_pose(t, ts))
    act('idle_alert', 3.0, lambda t, ts: idle_pose(t, ts, alert=0.6))
    walk_amp = dict(WALK)
    run_amp = dict(RUN)
    if kid:
        walk_amp.update(leg=0.48, arm=0.4, bob=0.02)
        run_amp.update(arm=0.9, elbow=1.2, lean=0.15)
    act('walk', 1.1 if not kid else 0.85, lambda t, ts: locomotion(t, walk_amp))
    act('run', 0.72 if not kid else 0.56, lambda t, ts: locomotion(t, run_amp))
    if kind == 'hero' or kind == 'companion':
        act('sprint', 0.6, lambda t, ts: locomotion(t, SPRINT))
        act('walk_back', 1.2, lambda t, ts: locomotion(1 - t, dict(WALK, leg=0.32, arm=0.15)))
        act('crouch_idle', 3.0, lambda t, ts: add(locomotion(0.0, dict(CROUCH, leg=0.0, bob=0.0, twist=0.0, arm=0.0)), {'chest': (0.02 * math.sin(t * 12.56), 0, 0), 'head': (-0.2, 0.15 * math.sin(t * 6.28), 0)}))
        act('crouch_walk', 1.3, lambda t, ts: locomotion(t, CROUCH))

        def aim_idle(t, ts):
            p = idle_pose(t, ts, alert=0.35)
            p['thigh.L'] = (-0.15, 0, 0.06)
            p['thigh.R'] = (0.12, 0, -0.06)
            p['shin.L'] = 0.25
            p['shin.R'] = 0.3
            p['hips'] = (0, 0.25, 0)
            p['loc'] = (0, -0.035, 0)
            p.update(aim_pose())
            p['chest'] = (0.02 + 0.006 * math.sin(t * 12.56), -0.18, 0)
            return p
        act('aim_idle', 3.0, aim_idle)

        def melee(t, ts):
            ready = add(idle_pose(0, 0, alert=0.6), {'upperarm.R': (-0.3, 0, AR - 0.2), 'forearm.R': 1.3, 'upperarm.L': (-0.5, 0, AL + 0.3), 'forearm.L': 1.4})
            wind = add(ready, {'spine': (0.0, 0.5, 0), 'chest': (0, 0.4, 0), 'upperarm.R': (-0.6, 0.6, AR - 0.9), 'forearm.R': 1.8, 'loc': (0, -0.06, -0.05)})
            hit = add(ready, {'spine': (0.15, -0.55, 0), 'chest': (0.1, -0.5, 0), 'upperarm.R': (-1.45, -0.6, AR - 0.4), 'forearm.R': 0.5, 'thigh.L': (-0.5, 0, 0), 'shin.L': 0.4, 'thigh.R': (0.3, 0, 0), 'loc': (0, -0.08, 0.12)})
            return seq(t, [(0, ready), (0.3, wind), (0.5, hit), (0.62, hit), (1.0, ready)])
        act('melee', 0.65, melee, step=1, loop=False)

        def reload_(t, ts):
            a = aim_idle(0, 0)
            down = add(a, {'upperarm.R': (1.0, 0.2, 0.3), 'forearm.R': 0.7, 'upperarm.L': (1.2, 0.5, -0.55), 'forearm.L': 1.6, 'hand.L': (0.4, 0, 0), 'head': (0.35, -0.1, 0)})
            grab = add(down, {'upperarm.L': (0.7, 0.1, -0.2), 'forearm.L': 1.2})
            return seq(t, [(0, a), (0.2, down), (0.45, grab), (0.6, down), (0.85, a), (1, a)])
        act('reload', 1.3, reload_, step=1, loop=False)

        def dodge(t, ts):
            stand = idle_pose(0, 0, alert=0.5)
            tuck = {'thigh.L': (-1.9, 0, 0.1), 'thigh.R': (-1.9, 0, -0.1), 'shin.L': 2.3, 'shin.R': 2.3, 'foot.L': -0.4, 'foot.R': -0.4,
                    'spine': (0.6, 0, 0), 'chest': (0.4, 0, 0), 'neck': (0.4, 0, 0), 'head': (0.4, 0, 0),
                    'upperarm.L': (-1.0, 0, AL + 0.2), 'upperarm.R': (-1.0, 0, AR - 0.2), 'forearm.L': 1.8, 'forearm.R': 1.8}
            if t < 0.12:
                return blend(stand, dict(tuck, loc=(0, -0.45, 0)), ease(t / 0.12))
            if t < 0.78:
                u = (t - 0.12) / 0.66
                ang = u * math.pi * 2
                y = -0.45 - 0.12 * math.sin(u * math.pi)
                return dict(tuck, hips=(ang, 0, 0), loc=(0, y, 0))
            return blend(dict(tuck, loc=(0, -0.45, 0)), stand, ease((t - 0.78) / 0.22))
        act('dodge', 0.75, dodge, step=1, loop=False)

        def jump(t, ts):
            crouchp = add(idle_pose(0, 0), {'loc': (0, -0.12, 0), 'thigh.L': (-0.5, 0, 0.04), 'thigh.R': (-0.5, 0, -0.04), 'shin.L': 0.9, 'shin.R': 0.9, 'foot.L': -0.3, 'foot.R': -0.3, 'spine': (0.2, 0, 0), 'upperarm.L': (0.5, 0, AL), 'upperarm.R': (0.5, 0, AR)})
            air = add(idle_pose(0, 0), {'thigh.L': (-0.7, 0, 0.05), 'thigh.R': (-0.1, 0, -0.05), 'shin.L': 1.1, 'shin.R': 0.7, 'foot.L': -0.4, 'foot.R': -0.5, 'upperarm.L': (-0.7, 0, AL + 0.35), 'upperarm.R': (-0.5, 0, AR - 0.35), 'forearm.L': 0.6, 'forearm.R': 0.6, 'spine': (0.05, 0, 0)})
            return seq(t, [(0, crouchp), (0.3, air), (1, air)])
        act('jump', 0.5, jump, step=1, loop=False)

        def fall(t, ts):
            p = 2 * math.pi * t
            return add(idle_pose(0, 0), {'thigh.L': (-0.5 + 0.2 * math.sin(p), 0, 0.12), 'thigh.R': (-0.2 - 0.2 * math.sin(p), 0, -0.12), 'shin.L': 0.9, 'shin.R': 0.6,
                                          'upperarm.L': (-0.6 + 0.4 * math.sin(p * 2), 0, AL + 1.0), 'upperarm.R': (-0.6 - 0.4 * math.sin(p * 2), 0, AR - 1.0), 'forearm.L': 0.6, 'forearm.R': 0.6, 'spine': (-0.1, 0, 0), 'head': (-0.2, 0, 0)})
        act('fall', 0.8, fall)

        def land(t, ts):
            stand = idle_pose(0, 0)
            sq = add(stand, {'loc': (0, -0.3, 0), 'thigh.L': (-0.9, 0, 0.08), 'thigh.R': (-0.9, 0, -0.08), 'shin.L': 1.6, 'shin.R': 1.6, 'foot.L': -0.6, 'foot.R': -0.6, 'spine': (0.4, 0, 0), 'upperarm.L': (-0.3, 0, AL + 0.4), 'upperarm.R': (-0.3, 0, AR - 0.4), 'forearm.L': 0.6, 'forearm.R': 0.6})
            return seq(t, [(0, sq), (0.25, sq), (1, stand)])
        act('land', 0.5, land, step=1, loop=False)

        def vault(t, ts):
            stand = locomotion(0.25, RUN)
            plant = {'loc': (-0.05, 0.05, 0), 'hips': (0.2, 0.2, 0.6), 'spine': (0.35, 0.1, -0.2), 'chest': (0.2, 0, -0.1),
                     'upperarm.R': (-0.4, 0, AR + 0.1), 'forearm.R': 0.1, 'hand.R': (1.2, 0, 0), 'upperarm.L': (-1.2, 0, AL + 0.6), 'forearm.L': 0.5,
                     'thigh.L': (-1.4, 0, 0.6), 'thigh.R': (-1.0, 0, 0.5), 'shin.L': 1.2, 'shin.R': 0.6}
            over = {'loc': (0.05, 0.1, 0), 'hips': (0.0, 0.3, 0.9), 'spine': (0.2, 0.1, -0.3), 'chest': (0.1, 0, -0.2),
                    'upperarm.R': (-0.2, 0, AR + 0.3), 'forearm.R': 0.15, 'hand.R': (1.3, 0, 0), 'upperarm.L': (-1.5, 0, AL + 1.0), 'forearm.L': 0.4,
                    'thigh.L': (-1.2, 0, 1.0), 'thigh.R': (-0.9, 0, 0.9), 'shin.L': 0.4, 'shin.R': 0.2}
            return seq(t, [(0, stand), (0.25, plant), (0.55, over), (0.8, locomotion(0.75, RUN)), (1, locomotion(0.0, RUN))])
        act('vault', 0.75, vault, step=1, loop=False)

        def mantle(t, ts):
            stand = idle_pose(0, 0)
            reach = add(stand, {'upperarm.L': (-2.9, 0, AL + 0.3), 'upperarm.R': (-2.9, 0, AR - 0.3), 'forearm.L': 0.3, 'forearm.R': 0.3, 'head': (-0.4, 0, 0), 'loc': (0, -0.05, 0)})
            hang = add(stand, {'upperarm.L': (-2.6, 0, AL + 0.4), 'upperarm.R': (-2.6, 0, AR - 0.4), 'forearm.L': 1.4, 'forearm.R': 1.4, 'spine': (0.25, 0, 0), 'thigh.L': (-0.9, 0, 0), 'shin.L': 1.4, 'thigh.R': (-0.2, 0, 0), 'shin.R': 0.6})
            push = add(stand, {'upperarm.L': (-0.3, 0, AL + 0.6), 'upperarm.R': (-0.3, 0, AR - 0.6), 'forearm.L': 0.2, 'forearm.R': 0.2, 'hand.L': (1.2, 0, 0), 'hand.R': (1.2, 0, 0), 'spine': (0.75, 0, 0), 'chest': (0.3, 0, 0), 'thigh.L': (-1.9, 0, 0.1), 'shin.L': 2.2, 'thigh.R': (-0.4, 0, 0), 'shin.R': 1.0, 'loc': (0, -0.2, 0)})
            return seq(t, [(0, stand), (0.18, reach), (0.4, hang), (0.7, push), (1, stand)])
        act('mantle', 1.05, mantle, step=1, loop=False)

        def climb(t, ts):
            p = 2 * math.pi * t
            s_ = math.sin(p)
            return {'spine': (0.05, 0, 0), 'head': (-0.25, 0, 0),
                    'upperarm.L': (-2.4 - 0.35 * s_, 0, AL + 0.35), 'upperarm.R': (-2.4 + 0.35 * s_, 0, AR - 0.35), 'forearm.L': 1.0 + 0.5 * s_, 'forearm.R': 1.0 - 0.5 * s_,
                    'thigh.L': (-0.9 - 0.5 * s_, 0, 0.08), 'thigh.R': (-0.9 + 0.5 * s_, 0, -0.08), 'shin.L': 1.3 + 0.5 * s_, 'shin.R': 1.3 - 0.5 * s_, 'foot.L': -0.3, 'foot.R': -0.3, 'loc': (0, -0.1, -0.05)}
        act('climb', 1.0, climb)

        def push(t, ts):
            l = locomotion(t, dict(WALK, leg=0.35, lean=0.45, arm=0.0, bob=0.01))
            l.update({'upperarm.L': (-1.25, -0.3, AL + 0.5), 'upperarm.R': (-1.25, 0.3, AR - 0.5), 'forearm.L': 0.9, 'forearm.R': 0.9, 'hand.L': (-0.9, 0, 0), 'hand.R': (-0.9, 0, 0), 'spine': (0.35, 0, 0), 'chest': (0.2, 0, 0), 'head': (-0.25, 0, 0)})
            return l
        act('push', 1.4, push)

        def interact(t, ts):
            stand = idle_pose(0, 0)
            reach = add(stand, {'upperarm.R': (-1.15, -0.15, AR - 0.3), 'forearm.R': 0.45, 'hand.R': (-0.2, 0, 0), 'spine': (0.12, -0.1, 0), 'head': (0.15, -0.1, 0), 'loc': (0, -0.02, 0.03)})
            return seq(t, [(0, stand), (0.35, reach), (0.6, reach), (1, stand)])
        act('interact', 0.9, interact, step=1, loop=False)

        def pickup(t, ts):
            stand = idle_pose(0, 0)
            low = add(stand, {'loc': (0, -0.42, 0), 'thigh.L': (-1.5, 0, 0.15), 'thigh.R': (-0.9, 0, -0.1), 'shin.L': 1.9, 'shin.R': 1.9, 'foot.L': -0.5, 'foot.R': -0.8,
                              'spine': (0.5, 0, 0), 'chest': (0.3, 0, 0), 'head': (0.3, 0, 0), 'upperarm.R': (-0.9, 0, AR - 0.1), 'forearm.R': 0.3})
            return seq(t, [(0, stand), (0.4, low), (0.6, low), (1, stand)])
        act('pickup', 1.2, pickup, step=1, loop=False)

        def keypad(t, ts):
            p = 2 * math.pi * t
            stand = idle_pose(t, ts)
            press = 0.5 + 0.5 * math.sin(p * 4)
            stand.update({'upperarm.R': (-1.3 + 0.08 * press, -0.25, AR - 0.35), 'forearm.R': 0.9 - 0.3 * press, 'hand.R': (-0.3, 0, 0), 'head': (0.1, -0.15, 0), 'spine': (0.06, -0.08, 0)})
            return stand
        act('keypad', 1.6, keypad, step=1)

        def hit(t, ts):
            stand = idle_pose(0, 0, alert=0.5)
            h = add(stand, {'spine': (-0.3, 0.15, 0.05), 'chest': (-0.25, 0.1, 0), 'head': (-0.35, 0.2, 0.1), 'loc': (0, -0.03, -0.08), 'upperarm.L': (-0.4, 0, AL + 0.4), 'upperarm.R': (-0.3, 0, AR - 0.4)})
            return seq(t, [(0, stand), (0.15, h), (1, stand)])
        act('hit', 0.45, hit, step=1, loop=False)

        def death(t, ts):
            stand = idle_pose(0, 0, alert=0.5)
            buckle = {'loc': (0, -0.5, 0.05), 'thigh.L': (-1.3, 0, 0.1), 'thigh.R': (-1.5, 0, -0.1), 'shin.L': 2.1, 'shin.R': 2.3, 'foot.L': -0.5, 'foot.R': -0.5, 'spine': (0.5, 0, 0), 'chest': (0.3, 0, 0), 'head': (0.6, 0, 0),
                      'upperarm.L': (-0.3, 0, AL), 'upperarm.R': (-0.3, 0, AR), 'forearm.L': 0.5, 'forearm.R': 0.5}
            down = {'loc': (0.1, -0.88, 0.4), 'hips': (-1.5, 0.3, 0.1), 'thigh.L': (-0.3, 0, 0.15), 'thigh.R': (-0.6, 0, -0.1), 'shin.L': 0.5, 'shin.R': 0.9, 'spine': (-0.1, 0, 0), 'head': (-0.2, 0.9, 0),
                    'upperarm.L': (-0.3, 0, AL + 1.0), 'upperarm.R': (-1.0, 0, AR - 0.8), 'forearm.L': 0.4, 'forearm.R': 0.9}
            return seq(t, [(0, stand), (0.35, buckle), (0.75, down), (1, down)])
        act('death', 1.6, death, step=1, loop=False)

        def hold_door(t, ts):
            p = 2 * math.pi * t
            tr = 0.03 * math.sin(p * 9)
            return {'loc': (0, -0.12, 0), 'spine': (0.4 + tr, 0, 0), 'chest': (0.2, 0, 0), 'head': (-0.3, 0, 0.1),
                    'upperarm.L': (-1.6 + tr, 0, AL + 0.5), 'upperarm.R': (-1.6 - tr, 0, AR - 0.5), 'forearm.L': 0.25, 'forearm.R': 0.25, 'hand.L': (-1.1, 0, 0), 'hand.R': (-1.1, 0, 0),
                    'thigh.L': (-0.7, 0, 0.1), 'thigh.R': (0.5, 0, -0.1), 'shin.L': 0.8, 'shin.R': 0.3, 'foot.L': -0.1, 'foot.R': 0.3}
        act('hold_door', 1.0, hold_door, step=1)

        def reach(t, ts):
            stand = idle_pose(t, ts)
            stand.update({'upperarm.R': (-1.3, -0.1, AR - 0.25), 'forearm.R': 0.2, 'hand.R': (-0.1, 0, 0), 'spine': (0.1, 0, 0), 'head': (0.05, 0, 0), 'loc': (0, -0.02, 0.04)})
            return stand
        act('reach', 3.0, reach)

    # shared social / cutscene set
    def sit(t, ts):
        p = idle_pose(t, ts)
        p.update({'loc': (0, -0.47, -0.05), 'thigh.L': (-1.55, 0, 0.12), 'thigh.R': (-1.55, 0, -0.12), 'shin.L': 1.5, 'shin.R': 1.45, 'foot.L': 0.0, 'foot.R': 0.0, 'spine': (-0.05, 0, 0),
                  'upperarm.L': (-0.3, 0, AL + 0.1), 'upperarm.R': (-0.3, 0, AR - 0.1), 'forearm.L': 0.9, 'forearm.R': 0.9, 'hand.L': (0.2, 0, 0), 'hand.R': (0.2, 0, 0)})
        return p
    act('sit', 4.0, sit)

    def talk(t, ts):
        p = idle_pose(t, ts)
        q = 2 * math.pi * t
        g1 = max(0.0, math.sin(q * 2)) ** 2
        g2 = max(0.0, math.sin(q * 3 + 1)) ** 2
        p['upperarm.R'] = (-0.45 * g1 - 0.05, -0.2 * g1, AR - 0.2 * g1)
        p['forearm.R'] = 0.4 + 1.0 * g1
        p['hand.R'] = (0.1, 0.3 * g1, 0)
        p['upperarm.L'] = (-0.25 * g2, 0.1 * g2, AL + 0.15 * g2)
        p['forearm.L'] = 0.3 + 0.7 * g2
        p['head'] = (0.04 * math.sin(q * 4), 0.1 * math.sin(q), 0.03 * math.sin(q * 2))
        return p
    act('talk', 4.0, talk)

    def look_around(t, ts):
        p = idle_pose(t, ts, alert=0.2)
        q = 2 * math.pi * t
        p['neck'] = (0, 0.35 * math.sin(q), 0)
        p['head'] = (-0.12 + 0.1 * math.sin(q * 2), 0.45 * math.sin(q), 0)
        p['chest'] = (0, 0.18 * math.sin(q - 0.3), 0)
        return p
    act('look_around', 5.0, look_around)

    def point(t, ts):
        p = idle_pose(t, ts)
        p.update({'upperarm.R': (-1.5, 0.1, AR - 0.2), 'forearm.R': 0.05, 'hand.R': (0, 0, 0), 'head': (0, 0.05, 0), 'chest': (0, -0.1, 0)})
        return p
    act('point', 2.0, point)

    def kneel(t, ts):
        p = idle_pose(t, ts)
        p.update({'loc': (0, -0.5, -0.05), 'thigh.L': (-1.5, 0, 0.1), 'shin.L': 1.55, 'foot.L': 0.0, 'thigh.R': (0.1, 0, -0.1), 'shin.R': 1.65, 'foot.R': -1.0,
                  'spine': (0.15, 0, 0), 'upperarm.L': (-0.4, 0, AL + 0.1), 'forearm.L': 0.9, 'upperarm.R': (-0.2, 0, AR - 0.1), 'forearm.R': 0.5, 'head': (0.15, 0, 0)})
        return p
    act('kneel', 3.0, kneel)

    def phone(t, ts):
        p = idle_pose(t, ts)
        p.update({'upperarm.R': (-0.5, 0.6, AR - 1.0), 'forearm.R': 2.4, 'hand.R': (0, 0.4, 0.3), 'head': (0.05, 0.1, -0.12)})
        return p
    act('phone', 4.0, phone)

    def look_up(t, ts):
        p = idle_pose(t, ts)
        p.update({'neck': (-0.35, 0, 0), 'head': (-0.45, 0.05 * math.sin(t * 6.28), 0), 'chest': (-0.08, 0, 0)})
        return p
    act('look_up', 4.0, look_up)

    def cower(t, ts):
        q = 2 * math.pi * t
        tr = 0.015 * math.sin(q * 11)
        return {'loc': (0, -0.55 if not kid else -0.4, 0), 'thigh.L': (-2.0, 0, 0.15), 'thigh.R': (-2.0, 0, -0.15), 'shin.L': 2.4, 'shin.R': 2.4, 'foot.L': -0.6, 'foot.R': -0.6,
                'spine': (0.55 + tr, 0, 0), 'chest': (0.35, 0, 0), 'neck': (0.3, 0, 0), 'head': (0.4, 0.1 * math.sin(q), 0),
                'upperarm.L': (-1.0, -0.5, AL + 0.55), 'upperarm.R': (-1.0, 0.5, AR - 0.55), 'forearm.L': 1.6, 'forearm.R': 1.6}
    act('cower', 2.0, cower)

    def hug(t, ts):
        p = idle_pose(t, ts)
        p.update({'upperarm.L': (-1.25, -0.75, AL + 0.6), 'upperarm.R': (-1.25, 0.75, AR - 0.6), 'forearm.L': 1.5, 'forearm.R': 1.5, 'hand.L': (0, -0.3, 0), 'hand.R': (0, 0.3, 0),
                  'head': (0.25, 0.25, 0.15), 'spine': (0.12, 0, 0), 'loc': (0, -0.03, 0)})
        return p
    act('hug', 4.0, hug)

    def wave(t, ts):
        p = idle_pose(t, ts)
        q = 2 * math.pi * t
        p.update({'upperarm.R': (-0.4, 0.3, AR - 1.9), 'forearm.R': 0.9 + 0.35 * math.sin(q * 3), 'head': (0, -0.1, 0)})
        return p
    act('wave', 2.0, wave)

    def chair_tied(t, ts):   # memory flashback: child in the Orpheus chair
        p = sit(t, ts)
        p.update({'upperarm.L': (-0.15, 0, AL + 0.15), 'upperarm.R': (-0.15, 0, AR - 0.15), 'forearm.L': 1.2, 'forearm.R': 1.2, 'head': (0.1, 0.2 * math.sin(t * 6.28 * 2), 0)})
        return p
    act('chair', 4.0, chair_tied)
    return acts


# ============================================================================ preview render
def preview(name, ob, arm):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.samples = 24
    sc.cycles.use_denoising = False
    sc.cycles.device = 'CPU'
    sc.render.resolution_x = 640
    sc.render.resolution_y = 900
    sc.render.film_transparent = False
    world = bpy.data.worlds.new('w')
    sc.world = world
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs[0].default_value = (0.12, 0.13, 0.15, 1)
    H = SPECS[name]['height']
    for loc, en, size in [((-2.5, -3, 2.6), 900, 2), ((3, -1.5, 1.6), 350, 3), ((0, 3, 2.5), 600, 2)]:
        ld = bpy.data.lights.new('L', 'AREA')
        ld.energy = en
        ld.size = size
        lo = link(bpy.data.objects.new('L', ld))
        lo.location = loc
        d = Vector((0, 0, H * 0.55)) - Vector(loc)
        lo.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    cam = bpy.data.cameras.new('cam')
    cam.lens = 70
    co = link(bpy.data.objects.new('cam', cam))
    sc.camera = co
    for tag, pos in (('front', (0.3, -4.6, H * 0.6)), ('back', (-0.6, 4.4, H * 0.62)), ('face', (0.15, -1.2, H * 0.92)), ('face34', (-0.75, -1.05, H * 0.93))):
        co.location = pos
        tgt = Vector((0, 0, H * (0.52 if not tag.startswith('face') else 0.925)))
        co.rotation_euler = (tgt - Vector(pos)).to_track_quat('-Z', 'Y').to_euler()
        cam.lens = 70 if not tag.startswith('face') else 85
        sc.render.filepath = os.path.join(OUT, f'_preview_{name}_{tag}.png')
        bpy.ops.render.render(write_still=True)


# ============================================================================ main
def build(name):
    reset()
    MATS.clear()
    s = SPECS[name]
    J = joints(s)
    arm = build_armature(s, J)
    body = build_body(s, J)
    zone_materials(body, s, J)
    head_parts, hinfo = build_head(s, J)
    hair_parts = build_hair(s, J, hinfo)
    hand_parts = build_hand(s, J, 'L') + build_hand(s, J, 'R')
    shoe_parts = build_shoe(s, J, 'L') + build_shoe(s, J, 'R')
    details = build_details(s, J, hinfo, body)
    others = [(p, 'head') for p in head_parts + hair_parts]
    others += [(p, 'hand.L' if p.matrix_world.translation.x + sum((v.co.x for v in p.data.vertices), 0) / max(1, len(p.data.vertices)) > 0 else 'hand.R') for p in hand_parts]
    others += [(p, 'foot.L' if sum(v.co.x for v in p.data.vertices) > 0 else 'foot.R') for p in shoe_parts]
    others += details
    bind(body, others, arm)
    ob = finalize(s, name, body, [o for o, _ in others], arm)
    kind = 'hero' if name in ('elias', 'maya', 'reyes', 'voss', 'ellie') else 'civ'
    if name == 'elias_teen':
        kind = 'companion'
    make_anims(arm, s, kind)
    tris = sum(len(p.vertices) - 2 for p in ob.data.polygons)
    if PREVIEW:
        # pose for preview: idle frame
        arm.animation_data.action = bpy.data.actions.get('idle')
        bpy.context.scene.frame_set(10)
        preview(name, ob, arm)
        arm.animation_data.action = None
    # export
    activate(ob, [arm])
    path = os.path.join(OUT, f'{name}.glb')
    bpy.ops.export_scene.gltf(
        filepath=path, export_format='GLB', use_selection=True, export_animations=True,
        export_animation_mode='NLA_TRACKS', export_force_sampling=True, export_frame_step=1,
        export_def_bones=False, export_yup=True, export_apply=False, export_skins=True,
        export_image_format='JPEG' if True else 'AUTO', export_jpeg_quality=88, export_normals=True, export_tangents=False,
        export_colors=False, export_morph=False, export_optimize_animation_size=True,
    )
    print(f'[char] {name}: tris={tris} -> {path} ({os.path.getsize(path) / 1024:.0f} KB)')


if __name__ == '__main__':
    names = ONLY or list(SPECS.keys())
    for n in names:
        build(n)
    print('ALL DONE')
