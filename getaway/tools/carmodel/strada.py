# Strada SV (super-SUV) — modelled from the traced reference photos. Run: python3 tools/carmodel/strada.py
import sys, os, math; sys.path.insert(0, os.path.dirname(__file__))
from carlib import *
reset()
P = mat('carpaint', srgb(0x23333d), metal=0.4, rough=0.38, coat=1.0); K = mat('trim_black', srgb(0x0c0d0f), metal=0.2, rough=0.45)
GL = mat('glass', srgb(0x2a3238), metal=0.3, rough=0.02, alpha=0.42); GB = mat('glass_black', srgb(0x07090b), rough=0.05)
CH = mat('chrome', srgb(0xb8bec4), metal=1.0, rough=0.15); MESH = mat('grille_mesh', srgb(0x1a1c20), metal=0.5, rough=0.4)
LH = mat('light_head', (1, 1, 1), emit=(1, 0.98, 0.94), emit_strength=2.0); LD = mat('light_drl', (1, 1, 1), emit=(0.9, 0.95, 1.0), emit_strength=3.0)
LT = mat('light_tail', srgb(0x500000), emit=(1, 0.04, 0.02), emit_strength=1.5); LR = mat('light_rev', (0.9, 0.9, 0.9), emit=(1, 1, 1), emit_strength=0.3)
IL = mat('light_ind_l', srgb(0x402000), emit=(1, 0.55, 0.05), emit_strength=1.0); IR = mat('light_ind_r', srgb(0x402000), emit=(1, 0.55, 0.05), emit_strength=1.0)
LENS = mat('glass_lens', (0.9, 0.95, 1.0), rough=0.02, alpha=0.25)
RUB = mat('rubber', srgb(0x161618), rough=0.85); RIM = mat('rim', srgb(0x17181b), metal=0.85, rough=0.32); DISC = mat('disc', srgb(0x6d7177), metal=1, rough=0.35); CAL = mat('caliper', srgb(0x111214), metal=0.3, rough=0.4)
INT = mat('interior', srgb(0x2a1d18), rough=0.8)

ZF, ZR = 2.473, -2.473
FLOOR = [(-2.42, 0.44), (-2.1, 0.25), (2.2, 0.25), (2.42, 0.29)]
BELT = [(-2.4, 1.34), (-1.5, 1.345), (0.0, 1.325), (1.16, 1.29), (2.0, 1.2), (2.36, 1.06)]
HOODC = [(-2.4, 1.36), (-1.5, 1.365), (0.0, 1.345), (1.16, 1.275), (1.9, 1.225), (2.15, 1.17), (2.3, 1.11), (2.4, 1.04)]
def ring(z, front_face=0.0, rear_face=0.0):
    fl = pwl(FLOOR, z); be = pwl(BELT, z); hc = pwl(HOODC, z)
    xw = pwl([(-2.47, 0.9), (-2.3, 0.98), (-2.0, 1.01), (-1.5, 1.02), (1.5, 1.02), (2.1, 0.995), (2.33, 0.96), (2.47, 0.86)], z)
    q = [(0.0, fl), (xw * 0.86, fl), (xw * 0.96, 0.32), (xw, 0.64), (xw * 0.955, be - 0.05), (xw * 0.85, be + 0.014), (0.0, hc)]
    pts = [Vector((x, y, z)) for x, y in q]
    if front_face or rear_face:  # end rings pulled inward for the faces (rounded by subdivision): more in plan than in height
        k = front_face or rear_face; c = Vector((0, 0.72, z))
        pts = [Vector((p.x * k * 0.92, c.y + (p.y - c.y) * (0.5 + k * 0.5), z)) for p in pts]
    full = pts + [Vector((-p.x, p.y, p.z)) for p in reversed(pts[1:-1])]
    return full
ST = [-2.473, -2.44, -2.38, -2.28, -2.1, -1.49, -1.0, -0.5, 0.1, 0.7, 1.16, 1.5, 1.84, 2.15, 2.3, 2.39, 2.44, 2.473]
PLAN = [(-2.473, 0.8), (-2.44, 0.9), (-2.38, 0.96), (-2.28, 0.99), (-2.1, 1.0), (2.15, 1.0), (2.3, 0.985), (2.39, 0.95), (2.44, 0.88), (2.473, 0.78)]
rings = []
for z in ST:
    r = ring(z)
    k = pwl(PLAN, z)
    for p in r: p.x *= k
    for p in r:  # faces lean: compress the last stations toward the previous one for the upper points (monotonic: no folds)
        lean = min(1.0, max(0.0, (p.y - 0.62) / 0.5))
        if z > 2.33: p.z = 2.33 + (z - 2.33) * (1 - 0.7 * lean)
        if z < -2.36: p.z = -2.36 + (z + 2.36) * (1 - 0.75 * min(1.0, max(0.0, (p.y - 0.95) / 0.35)))
    rings.append(r)
N = len(rings[0])
def mat_of(i, k): return 1 if k in (0, 1, 10, 11) else 0
def crease_of(k): return {1: 1.0, 11: 1.0, 2: 0.6, 10: 0.6, 4: 0.75, 8: 0.75, 5: 0.35, 7: 0.35}.get(k, 0.0)
body = loft('body', rings, mat_of=mat_of, crease_of=crease_of, mats=[P, K], cap_mat=lambda y, rear: 1 if y < (0.62 if rear else 0.36) else 0, cap_crease=0.7); subd(body, 2); bake(body)
# wheel arches (real openings) + arch liners
AX = [(1.84, 0.41), (-1.49, 0.41)]
for az, ar in AX:
    for s in (1, -1):
        cut = lathe('archcut', [(0.0, -0.3), (0.465, -0.3), (0.465, 0.3), (0.0, 0.3)], 40, axis_center=(s * 1.06, ar, az)); boolean(body, cut)
        liner = lathe('liner', [(0.455, -0.16), (0.455, 0.16)], 40, mats=[K], axis_center=(s * 0.86, ar, az))
# panel gaps: door cuts, hood shut lines, tailgate
def gap(name, pts, w=0.006, d=0.012): return tube(name, pts, w, None, 6)
def sx0(side, y, z):
    h = surf(body, (side * 1.6, y, z), (-side, 0, 0)); return abs(h.x) if h else 1.0
cuts = []
for s in (1, -1):
    for z in (1.12, -0.2, -1.07):
        cuts.append(gap('g', [(s * sx0(s, y, z), y, z) for y in (0.36, 0.6, 0.9, 1.15, 1.3)]))
for c in cuts: boolean(body, c)
# surface helpers (ray-cast onto the subdivided body)
def fz(x, y):
    h = surf(body, (x, y, 3.5), (0, 0, -1)); return h.z if h else 2.4
def rz(x, y):
    h = surf(body, (x, y, -3.5), (0, 0, 1)); return h.z if h else -2.4
def sx(side, y, z):
    h = surf(body, (side * 1.6, y, z), (-side, 0, 0)); return abs(h.x) if h else 1.0
# front: grille band + three honeycomb intakes (recessed), headlight slots, fender vents
extras = []
def inset(name, cx, cy, w, h, frame=0.02, protrude=0.012):
    """dark honeycomb panel sitting just proud of the face, framed by a body-colour bevelled surround"""
    zf = max(fz(cx - w / 2 + 0.02, cy), fz(cx + w / 2 - 0.02, cy), fz(cx, cy)); zc = zf + protrude
    extras.append(box(name + '_back', (w, h, 0.03), (cx, cy, zc - 0.012), K, bevel=0.004))
    extras.append(honeycomb(name + '_mesh', cx, cy, zc + 0.004, w - 0.02, h - 0.014, cell=0.03, depth=0.012, m=MESH))
    for (fw, fh, fx, fy) in ((w + 2 * frame, frame, cx, cy + h / 2 + frame / 2), (w + 2 * frame, frame, cx, cy - h / 2 - frame / 2), (frame, h, cx - w / 2 - frame / 2, cy), (frame, h, cx + w / 2 + frame / 2, cy)):
        extras.append(box(name + '_frame', (fw, fh, 0.04), (fx, fy, zc - 0.01), P, bevel=0.006))
inset('grille', 0, 1.0, 0.84, 0.07, frame=0.012); inset('upper', 0, 0.76, 1.0, 0.075); inset('lower', 0, 0.48, 1.16, 0.16)
for s in (1, -1): inset('corner' + str(s), s * 0.71, 0.58, 0.15, 0.3)
for s in (1, -1):
    # slim headlight: slot, lens, LED signature
    # slim headlight: slot cut along the real face, lens, LED signature
    xi, xo = s * 0.47, s * 0.9; zi, zo = fz(xi, 1.045), fz(xo, 1.05)
    extras.append(beam('hl_house', (xi, 1.045, zi + 0.004), (xo, 1.05, zo + 0.004), 0.06, 0.016, Vector((0, 0, 1)), GB))
    extras.append(beam('hl_main', (s * 0.52, 1.055, fz(s * 0.52, 1.055) + 0.012), (s * 0.86, 1.06, fz(s * 0.86, 1.06) + 0.012), 0.02, 0.006, Vector((0, 0, 1)), LH))
    extras.append(beam('hl_drl', (s * 0.49, 1.028, fz(s * 0.49, 1.028) + 0.012), (s * 0.88, 1.033, fz(s * 0.88, 1.033) + 0.012), 0.007, 0.006, Vector((0, 0, 1)), LD))
    extras.append(beam('hl_lens', (xi, 1.045, zi + 0.018), (xo, 1.05, zo + 0.018), 0.058, 0.004, Vector((0, 0, 1)), LENS))
    # wrap-around: the light continues round the corner onto the fender
    xc = sx(s, 1.06, 2.24); zc2 = 2.24
    extras.append(beam('hl_wrap_house', (xo, 1.05, zo + 0.004), (s * (xc + 0.004), 1.065, zc2), 0.058, 0.016, Vector((1, 0, 0.6)), GB))
    extras.append(beam('hl_wrap_drl', (xo, 1.033, zo + 0.012), (s * (xc + 0.012), 1.045, zc2 + 0.01), 0.007, 0.006, Vector((1, 0, 0.6)), LD))
    vz = 1.3; x0 = sx(s, 1.075, vz); vent = beam('vent', (s * (x0 + 0.03), 1.06, vz - 0.11), (s * (x0 + 0.03), 1.09, vz + 0.11), 0.04, 0.09, Vector((1, 0, 0))); boolean(body, vent)
    extras.append(beam('vent_blade', (s * (x0 - 0.008), 1.077, vz - 0.1), (s * (x0 - 0.008), 1.097, vz + 0.1), 0.012, 0.012, Vector((1, 0, 0)), CH))
    for z in (0.05, -0.98):  # flush door handles
        x1 = sx(s, 1.2, z); h = beam('handle', (s * (x1 + 0.02), 1.2, z - 0.11), (s * (x1 + 0.02), 1.2, z + 0.11), 0.03, 0.05, Vector((1, 0, 0))); boolean(body, h)
        extras.append(beam('handle_in', (s * (x1 - 0.012), 1.2, z - 0.1), (s * (x1 - 0.012), 1.2, z + 0.1), 0.024, 0.008, Vector((1, 0, 0)), CH))
    # mirrors on stalks
    xm = sx(s, 1.28, 1.05); m = box('mirror', (0.13, 0.17, 0.22), (s * (xm + 0.13), 1.42, 1.06), K, bevel=0.03); extras.append(m)
    extras.append(box('mirror_arm', (0.12, 0.04, 0.06), (s * (xm + 0.03), 1.35, 1.07), K, bevel=0.012))
    # taillights wrapping the corner
    extras.append(beam('tail', (s * 0.35, 1.25, rz(s * 0.35, 1.25) - 0.006), (s * 0.86, 1.255, rz(s * 0.86, 1.255) - 0.006), 0.035, 0.012, Vector((0, 0, 1)), LT))
    xt = sx(s, 1.255, -2.2); extras.append(beam('tail_side', (s * 0.86, 1.255, rz(s * 0.86, 1.255) - 0.004), (s * (xt + 0.004), 1.26, -2.2), 0.035, 0.012, Vector((1, 0, -0.5)), LT))
    extras.append(beam('rev', (s * 0.24, 1.215, rz(s * 0.24, 1.215) - 0.006), (s * 0.34, 1.215, rz(s * 0.34, 1.215) - 0.006), 0.02, 0.01, Vector((0, 0, 1)), LR))
    extras.append(beam('ind_r', (s * 0.6, 1.215, rz(s * 0.6, 1.215) - 0.006), (s * 0.78, 1.215, rz(s * 0.78, 1.215) - 0.006), 0.015, 0.01, Vector((0, 0, 1)), IL if s > 0 else IR))
    for x in (0.46, 0.62):  # quad exhaust
        extras.append(lathe('exh', [(0.0, -0.02), (0.05, -0.02), (0.058, 0.0), (0.058, 0.12), (0.05, 0.12)], 20, mats=[CH], axis_center=(s * x, 0.38, rz(s * x, 0.38) - 0.04)))
extras.append(beam('tail_bar', (-0.86, 1.25, rz(0, 1.25) - 0.002), (0.86, 1.25, rz(0, 1.25) - 0.002), 0.075, 0.01, Vector((0, 0, 1)), GB))
extras.append(box('plate_recess', (0.56, 0.16, 0.02), (0, 0.84, rz(0, 0.84) - 0.004), K, bevel=0.006))
extras.append(box('diffuser', (1.5, 0.18, 0.2), (0, 0.4, rz(0, 0.4) + 0.06), K, bevel=0.02))
extras.append(box('splitter', (1.6, 0.025, 0.2), (0, 0.27, fz(0, 0.3) - 0.04), K, bevel=0.008))
# greenhouse: floating black roof, glass, black pillars
GB_BELT = [(-2.34, 1.36), (-1.5, 1.365), (0.0, 1.345), (1.16, 1.3)]
ROOF = [(-2.34, 1.39), (-2.16, 1.75), (-1.9, 1.785), (-0.77, 1.83), (0.33, 1.78), (1.16, 1.31)]
X0 = [(-2.34, 0.8), (-2.1, 0.86), (0.3, 0.875), (1.16, 0.84)]; X1 = [(-2.34, 0.7), (-2.16, 0.7), (0.33, 0.74), (1.16, 0.82)]
GST = [-2.34, -2.25, -2.16, -2.13, -1.9, -1.5, -1.11, -1.02, -0.6, -0.29, -0.17, 0.33, 0.75, 1.16]
gr = []
for z in GST:
    be = pwl(GB_BELT, z); rf = pwl(ROOF, z); x0 = pwl(X0, z); x1 = pwl(X1, z); drop = pwl([(-2.34, 0.0), (-2.16, 0.05), (0.33, 0.06), (1.16, 0.0)], z)
    pts = [Vector((x0 * 0.85, be - 0.14, z)), Vector((x0, be, z)), Vector((x0 * 0.97, be + 0.05, z)), Vector((x1, max(be + 0.06, rf - drop), z)), Vector((x1 * 0.55, rf - 0.008, z)), Vector((0, rf, z))]
    gr.append(pts + [Vector((-p.x, p.y, p.z)) for p in reversed(pts[:-1])])
def gmat(i, k):
    if i < 0 or i >= len(GST) - 1: return 2  # caps black
    z0, z1 = GST[i], GST[i + 1]; zc = (z0 + z1) / 2
    side = k in (2, 8); roof = k in (3, 4, 5, 6, 7)
    pill = (-0.29 <= zc <= -0.17) or (-1.11 <= zc <= -1.02) or zc < -2.13
    if side: return 2 if pill else 1
    if roof: return 1 if (zc > 0.33 or zc < -2.16) else 2
    return 0 if k in (0, 1, 9, 10) else 2
def gcrease(k): return {2: 0.9, 8: 0.9, 3: 0.8, 7: 0.8, 1: 1.0, 9: 1.0}.get(k, 0.0)
house = loft('greenhouse', gr, mat_of=gmat, crease_of=gcrease, mats=[P, GL, GB]); subd(house, 2); bake(house)
extras.append(box('roof_spoiler', (1.3, 0.035, 0.3), (0, 1.77, -2.03), GB, bevel=0.01)); extras.append(box('fin', (0.05, 0.06, 0.2), (0, 1.84, -1.6), GB, bevel=0.02))
# interior hint
for s in (1, -1):
    for z in (0.25, -0.75): extras += [box('seat', (0.5, 0.12, 0.5), (s * 0.42, 0.78, z), INT, bevel=0.03), box('back', (0.5, 0.7, 0.12), (s * 0.42, 1.12, z - 0.3), INT, bevel=0.03)]
extras.append(box('dash', (1.6, 0.14, 0.4), (0, 1.24, 0.95), K, bevel=0.03))
smooth(body, 32); smooth(house, 30)
for e in extras:
    bb = [e.matrix_world @ Vector(c) for c in e.bound_box]; xs = [v.x for v in bb]
    if False: print("PART", e.name, round(min(xs),2), round(max(xs),2), "y", round(min(-v.y for v in bb),2), round(max(-v.y for v in bb),2), "h", round(min(v.z for v in bb),2), round(max(v.z for v in bb),2))
detail = join("details", extras)
# wheels: 23" multi-spoke, black
for tag, z, s in (('FL', 1.84, 1), ('FR', 1.84, -1), ('RL', -1.49, 1), ('RR', -1.49, -1)):
    wheel(tag, s * 0.875, 0.41, z, 0.41, 0.3, 0.295, 15, RUB, RIM, DISC, CAL, s, 'multi')
out = os.path.join(os.path.dirname(__file__), '../../assets/cars/strada.glb'); export(os.path.abspath(out)); print('wrote', out, os.path.getsize(out) // 1024, 'KB')
