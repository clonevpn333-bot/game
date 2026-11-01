# GETAWAY! car modelling toolkit (runs headless on Blender's Python module: `pip install bpy`).
# Coordinates are written in GAME space (x = car's left, y = up, z = forward, metres) and converted to Blender
# (X = x, Y = -z, Z = y); the glTF exporter's +Y-up conversion turns them back into game space exactly.
# Naming contract with the game's importer (src/vehicles/glbcars.js):
#   materials  carpaint* (recoloured), glass*, light_head / light_drl / light_tail / light_rev / light_ind_l / light_ind_r
#   objects    wheel_FL/FR/RL/RR (spin + steer), caliper_FL.. (steer only)
import bpy, bmesh, math
from mathutils import Vector, Matrix

def G2B(x, y, z): return Vector((x, -z, y))
def G2B_inv(v): return Vector((v.x, v.z, -v.y))

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for c in (bpy.data.objects, bpy.data.meshes, bpy.data.materials): [c.remove(x) for x in list(c)]

def pwl(keys, z):
    if z <= keys[0][0]: return keys[0][1]
    for (z0, v0), (z1, v1) in zip(keys, keys[1:]):
        if z <= z1: return v0 + (v1 - v0) * (z - z0) / ((z1 - z0) or 1)
    return keys[-1][1]

# ---------------------------------------------------------------- materials
_M = {}
def mat(name, color=(0.5, 0.5, 0.5), metal=0.0, rough=0.5, emit=None, emit_strength=0.0, alpha=1.0, transmission=0.0, coat=0.0):
    if name in _M: return _M[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (*color, 1); b.inputs['Metallic'].default_value = metal; b.inputs['Roughness'].default_value = rough
    if coat: b.inputs['Coat Weight'].default_value = coat
    if emit: b.inputs['Emission Color'].default_value = (*emit, 1); b.inputs['Emission Strength'].default_value = emit_strength
    if alpha < 1:
        b.inputs['Alpha'].default_value = alpha
        for attr, val in (('surface_render_method', 'BLENDED'), ('blend_method', 'BLEND')):
            try: setattr(m, attr, val)
            except Exception: pass
    if transmission: b.inputs['Transmission Weight'].default_value = transmission
    _M[name] = m; return m

def srgb(h): return tuple(((c / 255) ** 2.2) for c in ((h >> 16) & 255, (h >> 8) & 255, h & 255))

# ---------------------------------------------------------------- mesh helpers
def obj_from_bm(name, bm, mats=()):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    for m in mats: me.materials.append(m)
    return o

def bake(o):  # apply all modifiers (no operator context needed)
    dg = bpy.context.evaluated_depsgraph_get(); ev = o.evaluated_get(dg); me = bpy.data.meshes.new_from_object(ev)
    old = o.data; o.modifiers.clear(); o.data = me; bpy.data.meshes.remove(old); return o

def subd(o, levels=2): m = o.modifiers.new('subd', 'SUBSURF'); m.levels = levels; m.render_levels = levels; m.use_creases = True; return m

def boolean(o, cutter, op='DIFFERENCE', apply=True, hide=True):
    m = o.modifiers.new('bool', 'BOOLEAN'); m.operation = op; m.object = cutter; m.solver = 'EXACT'
    if apply: bake(o)
    if hide: bpy.data.objects.remove(cutter)
    return o

def smooth(o, angle=35):
    me = o.data
    try: me.shade_smooth()
    except Exception:
        for p in me.polygons: p.use_smooth = True
    try: me.set_sharp_from_angle(angle=math.radians(angle))
    except Exception as e: print('sharp-from-angle unavailable', e)
    return o

def surf(o, origin, direction):
    """ray-cast onto an object (game coords in/out) -> hit point (game coords) or None"""
    o_b = G2B(*origin); d_b = G2B(*direction); inv = o.matrix_world.inverted()
    ok, loc, nrm, idx = o.ray_cast(inv @ o_b, (inv.to_3x3() @ d_b).normalized())
    if not ok: return None
    w = o.matrix_world @ loc; return Vector((w.x, w.z, -w.y))

def loft(name, rings, closed_ring=True, cap=True, mat_of=None, crease_of=None, mats=(), cap_mat=None, cap_crease=0.85):
    """rings: list of [Vector(game)...] same length. mat_of(i_ring, k_edge)->material index; crease_of(k_edge)->0..1 for
    longitudinal edges starting at ring point k."""
    bm = bmesh.new(); cl = bm.edges.layers.float.get('crease_edge') or bm.edges.layers.float.new('crease_edge')
    V = [[bm.verts.new(G2B(*p)) for p in r] for r in rings]; n = len(rings[0]); m = n if closed_ring else n - 1
    for i in range(len(rings) - 1):
        for k in range(m):
            k2 = (k + 1) % n; f = bm.faces.new((V[i][k], V[i + 1][k], V[i + 1][k2], V[i][k2]))
            if mat_of: f.material_index = mat_of(i, k)
    if cap and closed_ring:
        # end faces as quad domes: inset rings toward the face centre, crease on the outer boundary -> flat face, rounded edge
        for ring_pts, rv, rev in ((rings[0], V[0], True), (rings[-1], V[-1], False)):
            cen = sum((Vector(p) for p in ring_pts), Vector()) / len(ring_pts); prev = rv; layers = []
            for t in (0.82, 0.55, 0.28):
                cur = [bm.verts.new(G2B(*(cen + (Vector(p) - cen) * t))) for p in ring_pts]
                for k in range(n):
                    k2 = (k + 1) % n; q = (prev[k], cur[k], cur[k2], prev[k2]); f = bm.faces.new(tuple(reversed(q)) if not rev else q)
                    yc = sum(G2B_inv(v.co).y for v in q) / 4; f.material_index = cap_mat(yc, rev) if cap_mat else 0
                prev = cur
            f = bm.faces.new(list(reversed(prev)) if rev else prev); f.material_index = cap_mat(cen.y, rev) if cap_mat else 0
            layers.append(rv)
            if crease_of:
                for k in range(n):
                    e = bm.edges.get((rv[k], rv[(k + 1) % n]))
                    if e: e[cl] = cap_crease
    bm.normal_update(); bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if crease_of:
        for i in range(len(rings) - 1):
            for k in range(n):
                e = bm.edges.get((V[i][k], V[i + 1][k]))
                if e: e[cl] = crease_of(k)
    return obj_from_bm(name, bm, mats)

def box(name, size, center, m=None, rot=None, bevel=0.0):
    """axis-aligned box built directly in mesh space (game coords): size=(w along x, h along y, d along z)"""
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    w, h, d = size; cx, cy, cz = center
    if bevel: w, h, d = max(0.002, w - 2 * bevel), max(0.002, h - 2 * bevel), max(0.002, d - 2 * bevel)
    for v in bm.verts: v.co = Vector((cx + v.co.x * w, -(cz + v.co.y * d), cy + v.co.z * h))
    if bevel: bmesh.ops.bevel(bm, geom=list(bm.edges), offset=min(bevel, w * 0.45, h * 0.45, d * 0.45), segments=2, affect='EDGES', profile=0.5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); return obj_from_bm(name, bm, [m] if m else [])

def prism(name, pts2, depth, m=None):
    """extrude a planar polygon given in game coords (list of (x,y,z)) along its normal by depth (both sides 1/2)"""
    bm = bmesh.new(); vs = [bm.verts.new(G2B(*p)) for p in pts2]; f = bm.faces.new(vs); bm.normal_update(); nrm = f.normal.copy()
    r = bmesh.ops.extrude_face_region(bm, geom=[f]); top = [e for e in r['geom'] if isinstance(e, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, verts=top, vec=nrm * depth); bmesh.ops.translate(bm, verts=bm.verts[:], vec=-nrm * depth / 2)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); return obj_from_bm(name, bm, [m] if m else [])

def tube(name, pts, r, m=None, seg=10):  # swept round tube along a polyline (game coords)
    bm = bmesh.new(); rings = []
    for i, p in enumerate(pts):
        a = Vector(pts[max(0, i - 1)]); b = Vector(pts[min(len(pts) - 1, i + 1)]); t = (b - a).normalized()
        up = Vector((0, 1, 0)) if abs(t.y) < 0.9 else Vector((1, 0, 0)); u = t.cross(up).normalized(); v = t.cross(u)
        rings.append([bm.verts.new(G2B(*(Vector(p) + (u * math.cos(k / seg * 6.283) + v * math.sin(k / seg * 6.283)) * r))) for k in range(seg)])
    for i in range(len(rings) - 1):
        for k in range(seg): bm.faces.new((rings[i][k], rings[i][(k + 1) % seg], rings[i + 1][(k + 1) % seg], rings[i + 1][k]))
    bm.faces.new(list(reversed(rings[0]))); bm.faces.new(rings[-1])  # closed solid (boolean-safe)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return obj_from_bm(name, bm, [m] if m else [])

def beam(name, A, B, w, t, side_axis, m=None):
    """rectangular bar from A to B (game coords): w across, t along side_axis"""
    A = Vector(A); B = Vector(B); d = (B - A).normalized(); u = side_axis.normalized(); u = (u - d * u.dot(d)).normalized(); v = d.cross(u).normalized()
    bm = bmesh.new(); vs = []
    for P in (A, B):
        for su, sv in ((-1, -1), (1, -1), (1, 1), (-1, 1)): vs.append(bm.verts.new(G2B(*(P + u * su * t / 2 + v * sv * w / 2))))
    for a, b, c, dd in ((0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)): bm.faces.new((vs[a], vs[b], vs[c], vs[dd]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); return obj_from_bm(name, bm, [m] if m else [])

def lathe(name, prof, segs=48, m_of=None, mats=(), axis_center=(0, 0, 0)):
    """revolve a (radius, axial) profile about the game x axis; returns wheel-oriented object at axis_center"""
    bm = bmesh.new(); R = []
    for i in range(segs):
        a = i / segs * 6.283185; R.append([bm.verts.new(G2B(axis_center[0] + ax, axis_center[1] + r * math.cos(a), axis_center[2] + r * math.sin(a))) for r, ax in prof])
    for i in range(segs):
        for k in range(len(prof) - 1):
            f = bm.faces.new((R[i][k], R[i][k + 1], R[(i + 1) % segs][k + 1], R[(i + 1) % segs][k]))
            if m_of: f.material_index = m_of(k)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); return obj_from_bm(name, bm, mats)

def join(name, objs):
    objs = [o for o in objs if o]; bm = bmesh.new(); mats = []
    for o in objs:
        me = o.data.copy(); me.transform(o.matrix_world); mm = []
        for s in me.materials:
            if s not in mats: mats.append(s)
            mm.append(mats.index(s))
        for p in me.polygons: p.material_index = mm[p.material_index] if mm else 0
        bm2 = bmesh.new(); bm2.from_mesh(me); bmesh.ops.transform(bm2, matrix=Matrix.Identity(4), verts=bm2.verts[:]); tmp = bpy.data.meshes.new('t'); bm2.to_mesh(tmp); bm2.free(); bm.from_mesh(tmp); bpy.data.meshes.remove(tmp); bpy.data.meshes.remove(me)
        bpy.data.objects.remove(o)
    return obj_from_bm(name, bm, mats)

def honeycomb(name, cx, cy, z, w, h, cell=0.034, depth=0.02, m=None, tilt=0.0):
    """hex-cell mesh in a rectangle on the plane z (front-facing), cells are open rings (looks like a real grille)"""
    bm = bmesh.new(); rw = cell * 0.5; inner = rw * 0.72; nx = int(w / (cell * 0.9)); ny = int(h / (cell * 0.78))
    for j in range(ny):
        for i in range(nx):
            px = cx - w / 2 + (i + 0.5 + (0.5 if j % 2 else 0)) * cell * 0.9; py = cy - h / 2 + (j + 0.5) * cell * 0.78
            if abs(px - cx) > w / 2 - rw * 0.6: continue
            zz = z - (py - cy) * tilt; o = [bm.verts.new(G2B(px + rw * math.cos(a), py + rw * math.sin(a), zz)) for a in [k * 1.0472 + 0.5236 for k in range(6)]]
            ii = [bm.verts.new(G2B(px + inner * math.cos(a), py + inner * math.sin(a), zz - depth)) for a in [k * 1.0472 + 0.5236 for k in range(6)]]
            for k in range(6): bm.faces.new((o[k], o[(k + 1) % 6], ii[(k + 1) % 6], ii[k]))
    return obj_from_bm(name, bm, [m] if m else [])

def wheel(tag, cx, cy, cz, r_tire, width, rim_r, spokes, m_rubber, m_rim, m_disc, m_cal, side, spoke_style='multi', cal_col=None):
    """modelled wheel: tyre (lathe with sidewall + tread grooves), rim barrel + lip, spokes, hub, brake disc + caliper"""
    s = side  # +1 left (x>0), -1 right; outer face points to +s
    tp = []; ws = width / 2
    for i in range(25):
        a = -math.pi / 2 + i / 24 * math.pi; ax = math.sin(a); rr = rim_r + (r_tire - rim_r) * (0.55 + 0.45 * math.cos(a)) ** 0.6
        if abs(ax) < 0.8 and i % 3 == 1: rr -= 0.006
        tp.append((rr, s * ws * ax))
    tp = [(rim_r * 0.98, -s * ws * 0.92)] + tp + [(rim_r * 0.98, s * ws * 0.92)]
    tire = lathe(f'wheel_{tag}_tire', tp, 64, mats=[m_rubber], axis_center=(cx, cy, cz))
    rp = [(rim_r * 0.9, -s * ws * 0.85), (rim_r * 0.96, -s * ws * 0.8), (rim_r * 0.96, s * ws * 0.62), (rim_r * 1.02, s * ws * 0.7), (rim_r * 0.99, s * ws * 0.8), (rim_r * 0.9, s * ws * 0.74)]
    barrel = lathe(f'wheel_{tag}_barrel', rp, 64, mats=[m_rim], axis_center=(cx, cy, cz))
    parts = [tire, barrel]
    hub = lathe(f'wheel_{tag}_hub', [(0.0, s * ws * 0.66), (0.075, s * ws * 0.66), (0.09, s * ws * 0.6), (0.1, s * ws * 0.4)], 24, mats=[m_rim], axis_center=(cx, cy, cz)); parts.append(hub)
    face = s * ws * 0.6
    for i in range(spokes):
        a = i / spokes * 6.283185
        for twist, wdt in (((0.13, 0.016), (-0.13, 0.016)) if spoke_style == 'multi' else ((0.0, 0.03),)):
            A = Vector((cx + face, cy + 0.09 * math.cos(a), cz + 0.09 * math.sin(a))); aa = a + twist; rr = rim_r * 0.93
            B = Vector((cx + face - s * 0.05, cy + rr * math.cos(aa), cz + rr * math.sin(aa)))
            parts.append(beam(f'wheel_{tag}_sp', A, B, wdt, 0.035, Vector((1, 0, 0)), m_rim))
    disc = lathe(f'wheel_{tag}_disc', [(0.1, -s * 0.012), (rim_r * 0.82, -s * 0.012), (rim_r * 0.82, s * 0.012), (0.1, s * 0.012)], 48, mats=[m_disc], axis_center=(cx + s * ws * 0.1, cy, cz))
    parts.append(disc)
    wobj = join(f'wheel_{tag}', parts)
    cal = box(f'caliper_{tag}', (0.07, 0.16, 0.26), (cx + s * ws * 0.18, cy + rim_r * 0.55, cz - rim_r * 0.25), m_cal, bevel=0.015)
    return wobj, cal

def export(path):
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_yup=True, export_apply=True, export_materials='EXPORT', use_selection=False)
