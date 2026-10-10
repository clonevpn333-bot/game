# Blender build for the hand-modeled heads.
#   python build_head.py render head_female /abs/prefix      -> clay renders (front / side / three-quarter)
#   python build_head.py export heads /abs/out.glb           -> textured heads with blink / jaw shape keys
# The head cages are typed in by hand (see head_*.py). This script only does what a modeler's tools would:
# mirror, cut the eye / mouth openings, extrude lids and the mouth bag, subdivide, unwrap, bake AO, export.
import sys, os, math, importlib, copy
import bpy, bmesh
from mathutils import Vector, Matrix
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

def B(p):  # game cm (x right, y up, z fwd) -> blender meters (x, -z, y)
    return Vector((p[0] / 100, -p[2] / 100, p[1] / 100))
def G(v):  # blender meters -> game cm
    return (v.x * 100, v.z * 100, -v.y * 100)

# ------------------------------------------------------------------------------------------------
def limit_pos(v):
    # Catmull-Clark limit position of a cage vertex
    if v.is_boundary:
        nb = [e.other_vert(v) for e in v.link_edges if e.is_boundary]
        if len(nb) == 2: return (nb[0].co + nb[1].co + 4 * v.co) / 6
        return v.co.copy()
    n = len(v.link_edges)
    es = sum((e.other_vert(v).co for e in v.link_edges), Vector())
    fs = Vector()
    for f in v.link_faces:
        if len(f.verts) == 4:
            i = list(f.verts).index(v); fs += f.verts[(i + 2) % 4].co
        else:
            fs += f.calc_center_median()
    return (n * n * v.co + 4 * es + fs) / (n * (n + 5))

def interpolate(bm, sharp, iters=25):
    # move the cage so the smooth surface passes (mostly) through the hand-placed points
    target = {v: v.co.copy() for v in bm.verts}
    for it in range(iters):
        lim = {v: limit_pos(v) for v in bm.verts}
        for v in bm.verts: v.co += (target[v] - lim[v]) * 0.5
    for v in bm.verts: v.co = target[v] + (v.co - target[v]) * sharp

def add_ears(bm, H):
    t, f = math.radians(H.EAR_TILT), math.radians(H.EAR_FLARE)
    E = H.EAR; NR, NC = len(E), len(E[0])
    for sx in (1, -1):
        def place(u, v, w):
            u2 = u * math.cos(t) + v * math.sin(t); v2 = -u * math.sin(t) + v * math.cos(t)
            x = H.EAR_POS[0] + u2 * math.sin(f) + w * math.cos(f)
            z = H.EAR_POS[2] - u2 * math.cos(f) + w * math.sin(f)
            return B((sx * x, H.EAR_POS[1] + v2, z))
        Fv = [[bm.verts.new(place(*E[r][c])) for c in range(NC)] for r in range(NR)]
        Bv = [[bm.verts.new(place(E[r][c][0] + (0.25 if c == NC - 1 else 0), E[r][c][1], (E[r][c][2] - 0.35) if c == NC - 1 else E[r][c][2] * 0.35)) for c in range(NC)] for r in range(NR)]
        def quad(a, b, c, d):
            q = (a, b, c, d) if sx > 0 else (d, c, b, a)
            try: bm.faces.new(q).material_index = 2
            except ValueError: pass
        for r in range(NR - 1):
            for c in range(NC - 1):
                quad(Fv[r][c], Fv[r + 1][c], Fv[r + 1][c + 1], Fv[r][c + 1])
                quad(Bv[r][c + 1], Bv[r + 1][c + 1], Bv[r + 1][c], Bv[r][c])
            quad(Fv[r][NC - 1], Fv[r + 1][NC - 1], Bv[r + 1][NC - 1], Bv[r][NC - 1])
        for c in range(NC - 1):
            quad(Fv[0][c], Fv[0][c + 1], Bv[0][c + 1], Bv[0][c])
            quad(Fv[NR - 1][c + 1], Fv[NR - 1][c], Bv[NR - 1][c], Bv[NR - 1][c + 1])

def cage(H, rows):
    R, C = len(rows), len(rows[0])
    verts, idxR, idxL = [], {}, {}
    for r in range(R):
        for c in range(C):
            p = rows[r][c]
            if p is None: continue
            idxR[(r, c)] = len(verts); verts.append(B(p))
            if abs(p[0]) < 1e-6: idxL[(r, c)] = idxR[(r, c)]
            else: idxL[(r, c)] = len(verts); verts.append(B((-p[0], p[1], p[2])))
    e0, e1, e2 = H.EYE_ROWS; m0, m1 = H.MOUTH_ROWS
    holes = {(e0, 2), (e0, 3), (e1, 2), (e1, 3), (m0, 0), (m0, 1)}
    faces = []
    for r in range(R - 1):
        for c in range(C - 1):
            if (r, c) in holes: continue
            q = [(r, c), (r + 1, c), (r + 1, c + 1), (r, c + 1)]
            if any(k not in idxR for k in q): continue
            faces.append([idxR[k] for k in q])
            faces.append([idxL[k] for k in reversed(q)])
    for c in range(C - 1):  # crown strip
        q = [idxR[(0, c)], idxR[(0, c + 1)], idxL[(0, c + 1)], idxL[(0, c)]]
        q2 = [v for i, v in enumerate(q) if v not in q[:i]]
        faces.append(q2[::-1])
    bm = bmesh.new()
    vs = [bm.verts.new(v) for v in verts]
    for f in faces: bm.faces.new([vs[i] for i in f])
    bm.verts.ensure_lookup_table()
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ec = Vector(H.EYE_CENTER)
    loop = [(e0, 2), (e0, 3), (e0, 4), (e1, 4), (e2, 4), (e2, 3), (e2, 2), (e1, 2)]
    rims = {sx: [vs[idx[k]] for k in loop] for idx, sx in ((idxR, 1), (idxL, -1))}
    mring = [vs[idxR[(m0, 0)]], vs[idxR[(m0, 1)]], vs[idxR[(m0, 2)]], vs[idxR[(m1, 2)]], vs[idxR[(m1, 1)]], vs[idxR[(m1, 0)]],
             vs[idxL[(m1, 1)]], vs[idxL[(m1, 2)]], vs[idxL[(m0, 2)]], vs[idxL[(m0, 1)]]]
    inner = []
    # eye openings: lid thickness wrapping the eyeball, then back into the socket
    for sx in (1, -1):
        rim = rims[sx]; cen = B((ec.x * sx, ec.y, ec.z)); prev = rim
        for step, (rad, back) in enumerate(((H.EYE_RADIUS + 0.03, 0.0), (H.EYE_RADIUS - 0.25, 0.55))):
            new = []
            for v in prev:
                d = (v.co - cen); d.normalize()
                new.append(bm.verts.new(cen + d * (rad / 100) + Vector((0, back / 100, 0))))
            for i in range(len(rim)):
                a, b2 = prev[i], prev[(i + 1) % len(rim)]
                c2, d2 = new[(i + 1) % len(rim)], new[i]
                try:
                    f = bm.faces.new((a, b2, c2, d2) if sx > 0 else (b2, a, d2, c2))
                    if step == 1: inner.append(f)
                except ValueError: pass
            prev = new
    # mouth bag
    prev = mring
    for k, (dz, sc, dy) in enumerate(((0.6, 0.95, 0.0), (1.8, 0.75, -0.3), (2.6, 0.35, -0.2))):
        new = [bm.verts.new(Vector((v.co.x * sc, v.co.y + dz / 100, v.co.z + dy / 100))) for v in prev]
        for i in range(len(mring)):
            a, b2 = prev[i], prev[(i + 1) % len(mring)]
            c2, d2 = new[(i + 1) % len(mring)], new[i]
            try:
                f = bm.faces.new((b2, a, d2, c2))
                if k > 0: inner.append(f)
            except ValueError: pass
        prev = new
    try: inner.append(bm.faces.new(list(reversed(prev))))
    except ValueError: pass
    for f in inner: f.material_index = 1
    if hasattr(H, 'EAR'): add_ears(bm, H)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    interpolate(bm, getattr(H, 'SHARP', 1.0))
    return bm

def obj_from_bm(name, bm, level):
    me = bpy.data.meshes.new(name + '_cage'); bm.to_mesh(me)
    for p in me.polygons: p.use_smooth = True
    ob = bpy.data.objects.new(name + '_cage', me); bpy.context.collection.objects.link(ob)
    if level:
        mod = ob.modifiers.new('sub', 'SUBSURF'); mod.levels = level; mod.render_levels = level
    dg = bpy.context.evaluated_depsgraph_get()
    me2 = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    me2.name = name
    ob2 = bpy.data.objects.new(name, me2); bpy.context.collection.objects.link(ob2)
    bpy.data.objects.remove(ob)
    return ob2

# ------------------------------------------------------------------------------------------------
# cage variants for the shape keys (same topology, so the subdivided vertices line up)
def rows_blink(H):
    R = copy.deepcopy(H.ROWS); e0, e1, e2 = H.EYE_ROWS
    lo = R[e2]
    for c in (2, 3, 4):
        x, y, z = R[e0][c]; ly = lo[c][1]
        R[e0][c] = (x, ly + (0.12 if c == 3 else 0.06), z + (0.12 if c == 3 else 0.02))
    x, y, z = R[e0 - 1][3]; R[e0 - 1][3] = (x, y - 0.12, z)
    return R

def rows_jaw(H, deg=13):
    R = copy.deepcopy(H.ROWS); m0, m1 = H.MOUTH_ROWS
    hinge = (getattr(H, 'JAW_HINGE', (-2.2, -0.8)))  # (y, z) of the jaw hinge axis
    wcol = [1, 1, 1, 1, 0.92, 0.75, 0.5, 0.25, 0.08, 0, 0, 0]
    for r in range(m1, len(R)):
        fall = 1.0 if r < len(R) - 3 else (0.6 if r == len(R) - 3 else (0.25 if r == len(R) - 2 else 0))
        for c in range(len(R[r])):
            p = R[r][c]
            if p is None: continue
            a = math.radians(deg) * wcol[c] * fall
            y, z = p[1] - hinge[0], p[2] - hinge[1]
            ny = y * math.cos(a) - z * math.sin(a); nz = y * math.sin(a) + z * math.cos(a)
            R[r][c] = (p[0], ny + hinge[0], nz + hinge[1])
    return R

class Var:  # a head module with replaced rows
    def __init__(self, H, rows):
        self.__dict__.update({k: getattr(H, k) for k in dir(H) if not k.startswith('__')}); self.ROWS = rows

def head_object(H, name, level=1):
    base = obj_from_bm(name, cage(H, H.ROWS), level)
    keys = {'blink': rows_blink(H), 'jawOpen': rows_jaw(H)}
    base.shape_key_add(name='Basis')
    for kn, rows in keys.items():
        tmp = obj_from_bm(name + '_' + kn, cage(Var(H, rows), rows), level)
        sk = base.shape_key_add(name=kn, from_mix=False); sk.value = 0.0
        for i, v in enumerate(tmp.data.vertices): sk.data[i].co = v.co
        bpy.data.objects.remove(tmp)
    return base

# ------------------------------------------------------------------------------------------------
# hair: a shell of hand-placed strand paths (mirrored) + an optional ponytail tube + hair tie
def scale_pt(p, S):
    if S == 1: return p
    return (p[0] * S, p[1] * (S if p[1] > 0 else 1.03), p[2] * S)

def hair_object(Hh, name, level=2, S=1.0):
    P = [[scale_pt(p, S) for p in path] for path in Hh.PATHS]; NP, NK = len(P), len(P[0])
    whorl = getattr(Hh, 'START', 'hairline') == 'whorl'
    vmax = 0.95 if getattr(Hh, 'FREE_ENDS', False) else 0.9
    bm = bmesh.new(); R, L = {}, {}
    uv = {}
    for i, path in enumerate(P):
        for k, p in enumerate(path):
            v = bm.verts.new(B(p)); R[(i, k)] = v; uv[v] = (i / (NP - 1) * 0.5, (0.035 if whorl else 0.02) + k / (NK - 1) * vmax)
            if abs(p[0]) < 1e-6: L[(i, k)] = v
            else:
                v2 = bm.verts.new(B((-p[0], p[1], p[2]))); L[(i, k)] = v2; uv[v2] = uv[v]
    faces = []
    for i in range(NP - 1):
        for k in range(NK - 1):
            faces.append(bm.faces.new((R[(i, k)], R[(i, k + 1)], R[(i + 1, k + 1)], R[(i + 1, k)])))
            faces.append(bm.faces.new((L[(i + 1, k)], L[(i + 1, k + 1)], L[(i, k + 1)], L[(i, k)])))
    cen = B((0, 1.5, -1.0)); edge = []
    if whorl:   # close the crown with a fan around the whorl
        top = bm.verts.new(sum((R[(i, 0)].co for i in range(NP)), Vector()) / NP + Vector((0, 0, 0.001))); uv[top] = (0.25, 0.035)
        ring = [R[(i, 0)] for i in range(NP)] + [L[(i, 0)] for i in range(NP - 2, 0, -1)]
        for j in range(len(ring)):
            try: bm.faces.new((ring[(j + 1) % len(ring)], ring[j], top))
            except ValueError: pass
    # tuck the hairline edge in toward the scalp
    for i in (range(NP) if not whorl else []):
        for side in ((R,) if abs(P[i][0][0]) < 1e-6 else (R, L)):
            v = side[(i, 0)]; d = (cen - v.co).normalized()
            nv = bm.verts.new(v.co + d * 0.004); uv[nv] = (uv[v][0], 0.0); edge.append((side, i, nv))
    tuck = {}
    for side, i, nv in edge: tuck[(id(side), i)] = nv
    for side in ((R, L) if not whorl else ()):
        for i in range(NP - 1):
            a, b2 = side[(i, 0)], side[(i + 1, 0)]
            ta, tb = tuck.get((id(side), i)) or tuck[(id(R), i)], tuck.get((id(side), i + 1)) or tuck[(id(R), i + 1)]
            try: bm.faces.new((ta, a, b2, tb) if side is R else (tb, b2, a, ta))
            except ValueError: pass
    # ponytail tube
    if getattr(Hh, 'TUBE', None):
        ring0 = [R[(i, NK - 1)] for i in range(NP)] + [L[(i, NK - 1)] for i in range(NP - 2, 0, -1)]
        N = len(ring0); prev = ring0
        T = Hh.TUBE
        for t in range(1, len(T)):
            c, r = Vector(T[t][0]), T[t][1]
            cp = Vector(T[t - 1][0]); cn = Vector(T[min(len(T) - 1, t + 1)][0])
            d = (cn - cp).normalized()
            up = Vector((0, 1, 0)); up = (up - d * up.dot(d)).normalized(); side = d.cross(up).normalized()
            if side.x < 0: side = -side
            ring = []
            for j in range(N):
                th = j / N * 2 * math.pi
                q = c + (up * math.cos(th) + side * math.sin(th)) * r
                v = bm.verts.new(B(tuple(q))); uv[v] = (j / N, 1.1 + t / len(T) * 0.8); ring.append(v)
            for j in range(N):
                a, b2 = prev[j], prev[(j + 1) % N]; c2, d2 = ring[(j + 1) % N], ring[j]
                try: bm.faces.new((a, b2, c2, d2))
                except ValueError: pass
            prev = ring
        tip = bm.verts.new(prev[0].co * 0 + sum((v.co for v in prev), Vector()) / N); uv[tip] = (0.5, 1.92)
        for j in range(N):
            try: bm.faces.new((prev[j], prev[(j + 1) % N], tip))
            except ValueError: pass
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    # make sure the shell faces outward (away from the head center)
    f0 = bm.faces[0] if hasattr(bm.faces, '__getitem__') else None
    bm.faces.ensure_lookup_table()
    out = sum(((f.calc_center_median() - cen).dot(f.normal) for f in bm.faces), 0.0)
    if out < 0: bmesh.ops.reverse_faces(bm, faces=bm.faces)
    interpolate(bm, getattr(Hh, 'SHARP', 1.0))
    # uv layer on the cage, carried through the subdivision
    me = bpy.data.meshes.new(name + '_cage'); bm.to_mesh(me)
    order = list(bm.verts)
    uvl = me.uv_layers.new(name='UV')
    for poly in me.polygons:
        for li in poly.loop_indices:
            uvl.data[li].uv = uv[order[me.loops[li].vertex_index]]
    for p2 in me.polygons: p2.use_smooth = True
    bm.free()
    ob = bpy.data.objects.new(name + '_cage', me); bpy.context.collection.objects.link(ob)
    mod = ob.modifiers.new('sub', 'SUBSURF'); mod.levels = level; mod.render_levels = level
    dg = bpy.context.evaluated_depsgraph_get()
    me2 = bpy.data.meshes.new_from_object(ob.evaluated_get(dg)); me2.name = name
    ob2 = bpy.data.objects.new(name, me2); bpy.context.collection.objects.link(ob2)
    bpy.data.objects.remove(ob)
    return ob2

def cap_object(C, name, S=1.0):
    bm = bmesh.new(); rows = []; uv = {}
    N = 12
    for ri, (y, cz, rx, rz) in enumerate(C.DOME):
        pts = [scale_pt((rx * math.sin(j / N * math.pi), y, cz + rz * math.cos(j / N * math.pi)), S) for j in range(N + 1)]
        row = [bm.verts.new(B(p)) for p in pts]
        for j, v in enumerate(row): uv[v] = (j / N * 0.5, ri / (len(C.DOME) - 1) * 0.8)
        rowL = [row[0]] + [bm.verts.new(B((-pts[j][0], pts[j][1], pts[j][2]))) for j in range(1, N)] + [row[N]]
        for j in range(1, N): uv[rowL[j]] = uv[row[j]]
        rows.append((row, rowL))
    for ri in range(len(rows) - 1):
        (a, aL), (b, bL) = rows[ri], rows[ri + 1]
        for j in range(N):
            for q in ((a[j], b[j], b[j + 1], a[j + 1]), (aL[j + 1], bL[j + 1], bL[j], aL[j])):
                try: bm.faces.new(q)
                except ValueError: pass
    # brim from the bottom row
    y, cz, rx, rz = C.DOME[-1]
    inner, outer, under = [], [], []
    for (ang, reach, droop) in C.BRIM:
        a = math.radians(ang)
        base = scale_pt((rx * math.sin(a) * 0.985, y + 0.35, cz + rz * math.cos(a) * 0.985), S)
        dirv = (math.sin(a) * 0.55, 0, math.cos(a)); L2 = math.hypot(dirv[0], dirv[2])
        tip = (base[0] + dirv[0] / L2 * reach, base[1] - droop, base[2] + dirv[2] / L2 * reach)
        vi = bm.verts.new(B(base)); vo = bm.verts.new(B(tip)); vu = bm.verts.new(B((tip[0], tip[1] - 0.35, tip[2])))
        uv[vi] = (0.6, 0.9); uv[vo] = (0.9, 0.9); uv[vu] = (0.95, 0.95)
        inner.append(vi); outer.append(vo); under.append(vu)
    for j in range(len(inner) - 1):
        for q in ((inner[j], outer[j], outer[j + 1], inner[j + 1]), (outer[j], under[j], under[j + 1], outer[j + 1])):
            try: bm.faces.new(q)
            except ValueError: pass
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me)
    order = list(bm.verts); uvl = me.uv_layers.new(name='UV')
    for poly in me.polygons:
        poly.use_smooth = True
        for li in poly.loop_indices: uvl.data[li].uv = uv[order[me.loops[li].vertex_index]]
    bm.free()
    ob = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(ob)
    mod = ob.modifiers.new('sub', 'SUBSURF'); mod.levels = 1
    dg = bpy.context.evaluated_depsgraph_get(); me2 = bpy.data.meshes.new_from_object(ob.evaluated_get(dg)); me2.name = name
    bpy.data.objects.remove(ob)
    ob2 = bpy.data.objects.new(name, me2); bpy.context.collection.objects.link(ob2)
    return ob2

def cap_texture(col, patch=(225, 215, 190), W=256):
    rng = np.random.default_rng(5)
    img = np.ones((W, W, 3), np.float32) * np.array(col, np.float32)
    img *= (0.9 + 0.12 * rng.random((W, W)))[..., None]
    im = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)); d = ImageDraw.Draw(im)
    for k in (2, 4): d.line([(k * W // 12, int(W * 0.2)), (k * W // 12, int(W * 0.8))], fill=tuple(int(c * 0.82) for c in col), width=1)  # panel seams
    d.rectangle([(int(W * 0.58), int(W * 0.85)), (W, W)], fill=tuple(int(c * 0.85) for c in col))  # brim
    return im

def hair_texture(col, W=256, Hh=1024):
    rng = np.random.default_rng(11)
    img = np.zeros((Hh, W, 4), np.float32)
    base = np.array(col, np.float32)
    # strands: per-column brightness streaks, slowly varying along the length
    cols = rng.random(W)                       # one value per strand column (fine strands)
    clump = np.asarray(Image.fromarray((rng.random((8, 24)) * 255).astype(np.uint8)).resize((W, Hh), Image.BICUBIC), np.float32) / 255
    along = np.asarray(Image.fromarray((rng.random((Hh // 16, W)) * 255).astype(np.uint8)).resize((W, Hh), Image.BICUBIC), np.float32) / 255
    k = 0.85 + 0.45 * cols[None, :] ** 1.5 + 0.2 * (clump - 0.5) + 0.12 * (along - 0.5)
    img[..., :3] = base * k[..., None]
    img[..., 3] = 1.0
    # fringe: the hairline end of the shell (v ~ 0 -> bottom rows of the image) fades out strand by strand
    rows = np.arange(Hh)[:, None]
    vv = 1 - (rows + 0.5) / Hh             # uv v of each row
    cut = 0.004 + 0.016 * rng.random(W)[None, :]
    img[..., 3] = np.where(vv < 0.03, np.clip((vv - cut * 0.4) / (cut + 1e-4), 0, 1), 1.0) * img[..., 3]
    endc = 0.93 + 0.035 * rng.random(W)[None, :]          # free hair ends (bob, short hair) thin out unevenly
    img[..., 3] = np.where((vv > 0.92) & (vv < 1.0), np.clip((endc - vv) / 0.012, 0, 1), 1.0) * img[..., 3]
    im = Image.fromarray(np.clip(img, 0, 255 if False else 255).astype(np.uint8) if False else None) if False else None
    rgb = np.clip(img[..., :3], 0, 255).astype(np.uint8); a = (np.clip(img[..., 3], 0, 1) * 255).astype(np.uint8)
    return Image.fromarray(np.dstack([rgb, a]), 'RGBA')

YMIN, YMAX = -22.0, 12.0
def uv_of(p):  # game cm -> (u, v)
    u = 0.5 + math.atan2(p[0], p[2]) / (2 * math.pi)
    v = (p[1] - YMIN) / (YMAX - YMIN)
    return u, v

def unwrap(ob):
    me = ob.data
    uvl = me.uv_layers.new(name='UV')
    for poly in me.polygons:
        us = []
        for li in poly.loop_indices:
            p = G(me.vertices[me.loops[li].vertex_index].co)
            us.append(uv_of(p))
        umin = min(u for u, v in us)
        for k, li in enumerate(poly.loop_indices):
            u, v = us[k]
            if max(uu for uu, vv in us) - umin > 0.5 and u < 0.5: u += 1.0
            uvl.data[li].uv = (u, v)
        if poly.material_index == 1:
            for li in poly.loop_indices: uvl.data[li].uv = (0.002, 0.002)   # inside of mouth / sockets: dark corner
        if poly.material_index == 2:   # ears: their own patch of plain skin in the (hidden) lower corner
            for li in poly.loop_indices: uvl.data[li].uv = (0.5, 0.2)    # plain skin (front of the neck)

def bake_ao(ob, size, samples=48):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = samples
    img = bpy.data.images.new('ao', size, size)
    mat = bpy.data.materials.new('bake'); mat.use_nodes = True
    n = mat.node_tree.nodes.new('ShaderNodeTexImage'); n.image = img; mat.node_tree.nodes.active = n
    ob.data.materials.clear(); ob.data.materials.append(mat); ob.data.materials.append(mat)
    for o in bpy.data.objects:
        if o and o.name in bpy.context.view_layer.objects: o.select_set(False)
    ob.select_set(True); bpy.context.view_layer.objects.active = ob
    sc.render.bake.margin = 6
    hidden = []
    for o in bpy.data.objects:
        if o is not ob and not o.hide_render: o.hide_render = True; hidden.append(o)
    bpy.ops.object.bake(type='AO')
    for o in hidden: o.hide_render = False
    a = np.array(img.pixels[:]).reshape(size, size, 4)[::-1, :, 0]   # top row first
    return a

# ------------------------------------------------------------------------------------------------
def paint_head(H, look, ao, size):
    S = size
    def px(p):
        u, v = uv_of(p); return ((u % 1.0) * S, (1 - v) * S)
    rng = np.random.default_rng(7)
    def blobs(scale, amp):
        small = rng.random((max(2, S // scale), max(2, S // scale)))
        im = Image.fromarray((small * 255).astype(np.uint8)).resize((S, S), Image.BICUBIC)
        return (np.asarray(im, np.float32) / 255 - 0.5) * amp
    skin = np.array(look['skin'], np.float32)
    col = np.ones((S, S, 3), np.float32) * skin
    m = blobs(24, 0.08) + blobs(96, 0.06) + blobs(256, 0.05)
    col *= (1 + m)[..., None]
    # paint layers with PIL (RGBA over the base)
    base = Image.fromarray(np.clip(col, 0, 255).astype(np.uint8), 'RGB').convert('RGBA')
    def layer(draw_fn, blur):
        L = Image.new('RGBA', (S, S), (0, 0, 0, 0)); d = ImageDraw.Draw(L); draw_fn(d)
        if blur: L = L.filter(ImageFilter.GaussianBlur(blur))
        return L
    def both(p): return [p, (-p[0], p[1], p[2])]
    def blob(d, p, r_cm, rgba):
        for q in both(p):
            x, y = px(q); r = r_cm * S / 45
            d.ellipse((x - r, y - r, x + r, y + r), fill=rgba)
    R = H.ROWS; e0, e1, e2 = H.EYE_ROWS; m0, m1 = H.MOUTH_ROWS
    hair = tuple(int(c) for c in look['hair'])
    F = look.get('face', {})
    # blush / redness / under-eye / temple shadow
    base = Image.alpha_composite(base, layer(lambda d: (
        blob(d, (4.2, -3.0, 7.6), 1.9, (205, 105, 95, int(70 + F.get('makeup', 0) * 40))),
        blob(d, (0, -3.4, 11.0), 0.9, (205, 100, 90, 60)),
        blob(d, (1.4, -4.2, 9.2), 0.7, (200, 100, 90, 50)),
        blob(d, (3.1, -1.25, 7.9), 1.1, (110, 70, 85, int(45 + F.get('age', 0) * 50))),
        blob(d, (7.0, -1.4, -1.5), 1.6, (205, 110, 100, 70)),
        blob(d, (0, -10.2, 9.0), 1.2, (200, 120, 110, 30))), S / 40))
    # stubble / beard shadow
    if F.get('stubble'):
        st = F['stubble']
        def beard(d):
            for side in (1, -1):
                pts = [R[m0 - 2][1], R[m0 - 2][2], R[m0 - 2][4], R[m0 - 2][6], R[len(R) - 4][7], R[len(R) - 4][5], R[len(R) - 4][3], R[len(R) - 4][0]]
                d.polygon([px((side * p[0], p[1], p[2])) for p in pts], fill=(60, 52, 52, int(90 * st)))
        base = Image.alpha_composite(base, layer(beard, S / 90))
    # age lines: forehead, crow's feet, nasolabial folds
    if F.get('age', 0) > 0.35:
        ag = F['age']
        def lines(d):
            for k in range(3):
                y = 3.6 + k * 1.0
                d.line([px((sx * x, y + 0.15 * math.cos(x / 3), 8.5 - abs(x) * 0.12)) for sx in (-1,) for x in (3.6, 2.4, 1.2, 0)] + [px((x, y + 0.15 * math.cos(x / 3), 8.5 - abs(x) * 0.12)) for x in (1.2, 2.4, 3.6)], fill=(120, 75, 65, int(70 * ag)), width=2)
            for side in (1, -1):
                for k in range(3):
                    d.line([px((side * 4.9, 0.3 - k * 0.45, 6.6)), px((side * 5.6, 0.55 - k * 0.6, 6.1))], fill=(120, 75, 65, int(80 * ag)), width=1)
                d.line([px((side * 1.9, -4.4, 8.3)), px((side * 2.6, -5.6, 8.1)), px((side * 2.75, -6.9, 7.9))], fill=(120, 72, 62, int(110 * ag)), width=3)
        base = Image.alpha_composite(base, layer(lines, S / 700))
    if F.get('mustache'):
        mc = tuple(int(c) for c in F['mustache'])
        def must(d):
            import random; rr = random.Random(9)
            for k in range(900):
                side = 1 if rr.random() < 0.5 else -1; t = rr.random()
                x = side * t * 2.6; y = -5.0 - t * 0.5 - rr.random() * 0.75
                d.line([px((x, y, 9.7 - t * 1.2)), px((x + side * 0.12, y - 0.35, 9.7 - t * 1.2))], fill=mc + (150 + rr.randint(0, 100),), width=2)
        base = Image.alpha_composite(base, layer(must, 0.7))
    # lips
    lc = tuple(int(c) for c in F.get('lips', (170, 95, 92)))
    def lips(d):
        for side in (1, -1):
            sp = lambda p: px((side * p[0], p[1], p[2]))
            up = [R[m0 - 1][0], R[m0 - 1][1], R[m0][2], R[m0][1], R[m0][0]]
            lo = [R[m1][0], R[m1][1], R[m1][2], R[m1 + 1][2], R[m1 + 1][1], R[m1 + 1][0]]
            d.polygon([sp(p) for p in up], fill=lc + (200,))
            d.polygon([sp(p) for p in lo], fill=tuple(min(255, int(c * 1.04)) for c in lc) + (200,))
    base = Image.alpha_composite(base, layer(lips, S / 300))
    def mouthline(d):
        for side in (1, -1):
            d.line([px((side * p[0], (R[m0][c][1] + R[m1][c][1]) / 2, p[2])) for c, p in enumerate(R[m0][:3])], fill=(60, 25, 28, 255), width=max(1, S // 400))
    base = Image.alpha_composite(base, layer(mouthline, S / 1000))
    # brows: many short strokes along a hand-drawn brow path
    bc = tuple(int(c * 0.75) for c in F.get('brows', look['hair']))
    BROW = look.get('brow_path', [(1.35, 1.95, 8.8), (2.4, 2.45, 8.65), (3.6, 2.6, 8.25), (4.7, 2.2, 7.6)])
    bw = look.get('brow_w', 0.32)
    def brows(d):
        import random; rr = random.Random(3)
        for side in (1, -1):
            for k in range(520):
                t = rr.random(); i = min(len(BROW) - 2, int(t * (len(BROW) - 1))); f = t * (len(BROW) - 1) - i
                a, b = BROW[i], BROW[i + 1]
                p = [a[j] + (b[j] - a[j]) * f for j in range(3)]
                w = bw * (1 - t * 0.55)
                off = (rr.random() - 0.5) * w
                x0, y0 = px((side * p[0], p[1] + off, p[2])); x1, y1 = px((side * (p[0] + 0.28), p[1] + off + 0.1 + (0.05 if t > 0.5 else 0.12), p[2]))
                d.line([(x0, y0), (x1, y1)], fill=bc + (120 + rr.randint(0, 100),), width=2)
    base = Image.alpha_composite(base, layer(brows, 0.6))
    # lashes / liner along the upper lid, lower lid line, eyeshadow
    def eyes(d):
        for side in (1, -1):
            sp = lambda p: px((side * p[0], p[1], p[2]))
            top = [R[e1][2], R[e0][2], R[e0][3], R[e0][4], R[e1][4]]
            if F.get('makeup', 0) > 0.2:
                shadow = [R[e1][2], R[e0][2], R[e0][3], R[e0][4], R[e1][4], (R[e1][4][0], R[e0 - 1][4][1] - 0.4, R[e0 - 1][4][2]), (R[e0 - 1][3][0], R[e0 - 1][3][1] - 0.5, R[e0 - 1][3][2]), (R[e0 - 1][2][0], R[e0 - 1][2][1] - 0.6, R[e0 - 1][2][2])]
                d.polygon([sp(p) for p in shadow], fill=(120, 80, 85, int(70 * F['makeup'])))
            d.line([sp(p) for p in top], fill=(25, 16, 15, 255), width=max(2, S // 300))
            bot = [R[e1][2], R[e2][2], R[e2][3], R[e2][4], R[e1][4]]
            d.line([sp(p) for p in bot], fill=(90, 55, 50, 150), width=max(1, S // 600))
    base = Image.alpha_composite(base, layer(eyes, S / 900))
    # scalp: hair colour above the hairline (under the hair mesh)
    HL = look.get('hairline', [(0, 6.8, 8.1), (2.4, 6.6, 7.6), (4.4, 6.0, 6.4), (5.6, 5.0, 5.0), (6.3, 3.0, 3.2), (6.5, 0.8, 1.6), (6.9, 0.0, 0.0), (6.4, -4.5, -3.5), (5.0, -6.0, -6.0), (0.05, -6.6, -7.5)])
    def scalp(d):
        pts = [px(p) for p in HL] + [px((-p[0], p[1], p[2])) for p in reversed(HL)]
        # region above the line, both halves (the texture wraps at the back)
        xs = [p[0] for p in pts]
        poly_r = [px(p) for p in HL] + [(px(HL[-1])[0] if px(HL[-1])[0] > S / 2 else S, 0), (px(HL[0])[0], 0)]
        poly_r = [px(p) for p in HL] + [(S, px(HL[-1])[1]), (S, 0), (px(HL[0])[0], 0)]
        poly_l = [px((-p[0], p[1], p[2])) for p in HL] + [(0, px(HL[-1])[1]), (0, 0), (px(HL[0])[0], 0)]
        if look.get('fringe_paths'):   # bald on top: only the horseshoe band carries hair colour
            FP = look['fringe_paths']
            for sx in (1, -1):
                band = [px((sx * max(0.05, p[0][0]), p[0][1] - 0.3, p[0][2])) for p in FP] + [px((sx * max(0.05, p[-1][0]), p[-1][1] + 0.2, p[-1][2])) for p in reversed(FP)]
                d.polygon(band, fill=hair + (200,))
            return
        d.polygon(poly_r, fill=hair + (235,)); d.polygon(poly_l, fill=hair + (235,))
    base = Image.alpha_composite(base, layer(scalp, S / 250))
    out = np.asarray(base.convert('RGB'), np.float32)
    a = np.clip(ao, 0, 1) ** 1.2
    out *= (0.38 + 0.62 * a)[..., None]
    out[-8:, :8] = (40, 18, 20)          # dark corner (uv 0,0) used by the mouth / socket interiors
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))

def eye_texture(iris, size=256):
    S = size; img = np.zeros((S // 2, S, 3), np.float32)
    rng = np.random.default_rng(3)
    streak = np.asarray(Image.fromarray((rng.random((8, 64)) * 255).astype(np.uint8)).resize((S, S // 2), Image.BICUBIC), np.float32) / 255
    for j in range(S // 2):
        th = (j + 0.5) / (S // 2) * math.pi            # 0 = front pole
        for i in range(S):
            if th < 0.5:
                t = th / 0.5; k = (0.6 + 0.4 * t) * (0.8 + 0.35 * (streak[j, i] - 0.5))
                c = np.array(iris, np.float32) * k
                if t > 0.82: c *= 1 - (t - 0.82) / 0.18 * 0.65
                if th < 0.2: c = np.array((8, 6, 6), np.float32)
            else:
                t = (th - 0.5) / (math.pi - 0.5)
                c = np.array((226 - t * 60, 214 - t * 80, 204 - t * 80), np.float32)
            img[j, i] = c
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))

# ------------------------------------------------------------------------------------------------
def material(name, img_path, rough=0.6):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; bsdf = nt.nodes['Principled BSDF']
    bsdf.inputs['Roughness'].default_value = rough
    if img_path:
        tn = nt.nodes.new('ShaderNodeTexImage'); tn.image = bpy.data.images.load(img_path)
        nt.links.new(tn.outputs['Color'], bsdf.inputs['Base Color'])
    return m

def clay(ob, col):
    m = bpy.data.materials.new('clay'); m.use_nodes = True
    bsdf = m.node_tree.nodes['Principled BSDF']; bsdf.inputs['Base Color'].default_value = col; bsdf.inputs['Roughness'].default_value = 0.55
    ob.data.materials.clear(); ob.data.materials.append(m)

def setup_render(res=(520, 600)):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 12; sc.cycles.use_denoising = False
    sc.render.resolution_x, sc.render.resolution_y = res
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs[1].default_value = 0.05
    for nm, loc, en in (('key', (0.6, -1.0, 0.5), 22), ('fill', (-0.8, -0.6, 0.1), 5), ('rim', (0.2, 0.9, 0.5), 10)):
        ld = bpy.data.lights.new(nm, 'AREA'); ld.energy = en; ld.size = 0.6
        lo = bpy.data.objects.new(nm, ld); sc.collection.objects.link(lo); lo.location = loc
        d = Vector((0, 0, -0.02)) - Vector(loc); lo.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    cam_d = bpy.data.cameras.new('cam'); cam_d.lens = 85
    cam = bpy.data.objects.new('cam', cam_d); sc.collection.objects.link(cam); sc.camera = cam
    return cam

def render_views(prefix, cam):
    sc = bpy.context.scene
    for name, loc, rot in (('front', (0, -0.95, -0.02), (math.radians(90), 0, 0)), ('side', (0.95, 0.0, -0.02), (math.radians(90), 0, math.radians(90))), ('q', (0.62, -0.72, -0.0), (math.radians(90), 0, math.radians(40)))):
        cam.location = loc; cam.rotation_euler = rot
        sc.render.filepath = f'{prefix}_{name}.png'
        bpy.ops.render.render(write_still=True)

def eyeballs(H, mat=None):
    out = []
    for sx in (1, -1):
        c = H.EYE_CENTER
        bpy.ops.mesh.primitive_uv_sphere_add(radius=H.EYE_RADIUS / 100, location=B((c[0] * sx, c[1], c[2])), segments=24, ring_count=16)
        e = bpy.context.active_object; e.rotation_euler = (math.radians(90), 0, 0); bpy.ops.object.shade_smooth()
        if mat: e.data.materials.append(mat)
        out.append(e)
    return out

if __name__ == '__main__':
    mode = sys.argv[1]
    bpy.ops.wm.read_factory_settings(use_empty=True)
    if mode == 'render':
        H = importlib.import_module(sys.argv[2])
        ob = obj_from_bm('head', cage(H, H.ROWS), 2)
        clay(ob, (0.62, 0.5, 0.44, 1))
        for e in eyeballs(H): clay(e, (0.9, 0.9, 0.88, 1))
        render_views(sys.argv[3], setup_render())
