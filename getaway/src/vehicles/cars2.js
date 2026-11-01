// GETAWAY! — hand-modelled real-proportion cars (crease-line builder). No real badges or names.
//  rivolta  — V12 hybrid hypercar (4.95 x 2.03 x 1.16 m, 2.78 m wheelbase): Y-lights, arrow intakes, slashed side intake.
//  strada   — super-SUV (4.95 x 2.05 x 1.82 m, 3.00 m wheelbase): slim lights, honeycomb grille, floating black roof.
import * as THREE from 'three';
import { buildCreaseCar } from './creasecar.js';

const DARK = 0x0b0c0e, MESH = 0x24272c;

// ===================== TORO RIVOLTA =====================
const RIV = {
  photo: { views: [{ img: 'riv', slot: 0, cam: [-0.9252, 0.8535, 8.6168, -0.3428, 0.7447, 25.785, 1.1795] }], minFacing: 0.2 },
  ZF: 2.475, ZR: -2.475, nz: 140,
  axles: [{ z: 1.3, r: 0.355, R: 0.445 }, { z: -1.48, r: 0.355, R: 0.455 }],
  lines: {
    p0: [[[0, 0]], [[-2.4, 0.22], [-2.0, 0.12], [2.2, 0.12], [2.42, 0.16]], -2.42, 2.42],
    p1: [[[-2.4, 0.8], [-1.5, 0.9], [1.3, 0.9], [2.0, 0.82], [2.42, 0.55]], [[-2.4, 0.22], [-2.0, 0.12], [2.2, 0.12], [2.42, 0.16]], -2.42, 2.42],
    p2: [[[-2.45, 0.92], [-1.5, 0.985], [0, 0.94], [1.3, 0.97], [2.0, 0.97], [2.42, 0.84]], [[-2.45, 0.3], [-1.5, 0.27], [0, 0.24], [1.3, 0.25], [2.0, 0.26], [2.42, 0.17]], -2.45, 2.42],
    p3: [[[-2.475, 0.96], [-1.5, 1.015], [-0.6, 0.985], [0.4, 0.965], [1.3, 1.0], [2.0, 0.99], [2.32, 0.93]], [[-2.475, 0.7], [-1.5, 0.68], [-0.55, 0.66], [0.3, 0.55], [0.95, 0.5], [1.3, 0.5], [2.0, 0.47], [2.32, 0.36]], -2.475, 2.32],
    p4: [[[-2.32, 0.92], [-1.5, 0.985], [-0.7, 0.94], [0.3, 0.9], [1.3, 0.96], [2.0, 0.95], [2.36, 0.87]], [[-2.32, 0.92], [-1.5, 0.95], [-0.7, 0.88], [0.3, 0.8], [1.3, 0.78], [2.0, 0.66], [2.36, 0.53]], -2.32, 2.36],
    p5: [[[-2.32, 0.8], [-1.5, 0.84], [-0.7, 0.8], [0.3, 0.78], [0.9, 0.8], [1.3, 0.8], [2.0, 0.76], [2.42, 0.66]], [[-2.32, 0.945], [-1.5, 0.965], [-0.7, 0.9], [0.3, 0.84], [0.9, 0.83], [1.3, 0.815], [1.7, 0.765], [2.0, 0.69], [2.42, 0.53]], -2.32, 2.42],
    p6: [[[-2.32, 0.6], [-1.5, 0.66], [0, 0.7], [0.9, 0.62], [1.3, 0.55], [1.6, 0.5], [2.46, 0.4]], [[-2.32, 0.955], [-1.5, 0.975], [-0.7, 0.905], [0.3, 0.845], [0.9, 0.835], [1.3, 0.765], [1.6, 0.69], [2.46, 0.49]], -2.32, 2.46],
    p7: [[[0, 0]], [[-2.32, 0.96], [-1.5, 0.98], [-0.7, 0.91], [0.3, 0.85], [0.9, 0.84], [1.3, 0.775], [1.6, 0.705], [2.475, 0.495]], -2.32, 2.475],
  },
  canopy: {
    z0: -2.2, z1: 0.95, rail: 0.14, n: 120,
    belt: [[-2.2, 0.965], [-1.5, 0.975], [-0.7, 0.905], [0.3, 0.845], [0.95, 0.84]], x0: [[-2.2, 0.5], [-1.5, 0.7], [-0.7, 0.76], [0.3, 0.76], [0.95, 0.6]],
    roof: [[-2.2, 0.985], [-1.4, 1.06], [-0.75, 1.135], [-0.2, 1.16], [0.05, 1.16], [0.95, 0.845]], x1: [[-2.2, 0.38], [-1.4, 0.46], [-0.6, 0.52], [0.05, 0.53], [0.95, 0.58]], drop: [[-2.2, 0], [-1.4, 0.02], [-0.6, 0.035], [0.95, 0]],
    mat: (j, zc, yc, belt) => j <= 2 ? (zc > -0.85 + (yc - belt) * 1.3 && zc < 0.92 ? 'glass' : 'paint') : j === 3 ? (zc > 0.05 ? 'glass' : 'paint') : (zc > 0.05 ? 'glass' : zc > -0.85 ? 'paint' : 'trim'),
    rearCap: 'trim',
  },
  doors: { z0: -0.5, z1: 0.86 },
  plate: { text: 'R1V0LT', y: 0.6 },
  noseCap(f, fan) {
    const [p0, p1, p2, p2m, p3, p4, p5, p6, p7] = f; const Vv = (x, y, z) => new THREE.Vector3(x, y, z); const fw = Vv(0, -0.2, 1);
    const I1 = Vv(0.8, 0.46, 2.36), I2 = Vv(0.6, 0.16, 2.44), Bc = Vv(0, 0.16, 2.45);
    fan('trim', [Vv(0, 0.32, 2.45), p7, p6, p5, p4, I1, I2, Bc], fw); // black intakes + centre
    fan('paint', [p4, p3, p2m, p2, I2, I1], fw); // body-colour boomerang corners
    fan('trim', [Bc, I2, p2, p1, p0], fw);
  },
  tailCap(r, fan) { const [p0, p1, p2, p2m, p3, p4, p5, p6, p7] = r; const cut = 0.74; const k = (p4.y - cut) / (p4.y - p3.y); const R4 = p4.clone().lerp(p3, k), R0 = new THREE.Vector3(0, cut, p4.z); fan('paint', [R0, p7, p6, p5, p4, R4], new THREE.Vector3(0, 0, -1)); fan('trim', [R0, R4, p3, p2m, p2, p1, p0], new THREE.Vector3(0, 0, -1)); },
  frontLip: ({ box }) => [box(1.72, 0.03, 0.32, 0, 0.12, -0.12, DARK), box(0.05, 0.14, 0.3, -0.7, 0.18, -0.12, DARK), box(0.05, 0.14, 0.3, 0.7, 0.18, -0.12, DARK)],
  rearLip: ({ box }) => { const o = [box(1.6, 0.03, 0.42, 0, 0.18, 0.2, DARK)]; for (let i = -3; i <= 3; i++) o.push(box(0.02, 0.2, 0.42, i * 0.22, 0.28, 0.2, DARK)); return o; },
  details(a) {
    const { V, seg, box, poly, parts, lights, interior, paintParts, profile, sideX, sidePatch, ZR = -2.475 } = a;
    for (const s of [-1, 1]) {
      const X = (x) => s * x;
      // Y-shaped headlights: slit along the nose edge + the two arms of the Y
      const A = V(X(0.36), 0.455, 2.44), B = V(X(0.8), 0.49, 2.33), M = V(X(0.6), 0.47, 2.39);
      lights.push(seg(A, B, 0.03, 0.04, 0xf4f9ff, 7)); lights.push(seg(M, V(X(0.72), 0.53, 2.33), 0.03, 0.035, 0xf4f9ff, 7)); lights.push(seg(M, V(X(0.66), 0.42, 2.38), 0.03, 0.035, 0xf4f9ff, 7));
      // headlight recess: body-colour eyebrow overhanging the light + dark inner housing
      paintParts.push(seg(V(X(0.34), 0.49, 2.455), V(X(0.83), 0.525, 2.325), 0.07, 0.025, 0xffffff)); parts.push(seg(V(X(0.36), 0.44, 2.43), V(X(0.81), 0.475, 2.3), 0.05, 0.05, 0x0c0d0f));
      // front intakes: vertical fins for depth
      for (let k = 0; k < 4; k++) { const x = 0.32 + k * 0.12; parts.push(box(0.018, 0.2, 0.06, X(x), 0.27, 2.43 - k * 0.025, 0x1c1e22)); }
      lights.push(box(0.12, 0.035, 0.03, X(0.5), 0.445, 2.43, 0xffffff, 0, 0)); lights.push(box(0.1, 0.03, 0.03, X(0.68), 0.46, 2.37, 0xffffff, 0, 0));
      parts.push(poly([A, B, V(X(0.82), 0.42, 2.31), V(X(0.38), 0.4, 2.43)].map((v) => v.clone().setZ(v.z - 0.004)), 0x15171a));
      // the Y light wraps back along the fender side: dark housing + light blade
      { const P1 = V(X(sideX(2.28, 0.56) + 0.004), 0.56, 2.28), P2 = V(X(sideX(1.86, 0.63) + 0.006), 0.63, 1.86), P3 = V(X(sideX(1.86, 0.57) + 0.006), 0.57, 1.86), P4 = V(X(sideX(2.28, 0.5) + 0.004), 0.5, 2.28);
        parts.push(poly([P1, P2, P3, P4], 0x111214)); lights.push(seg(P1.clone().setY(0.55), P2.clone().setY(0.615), 0.02, 0.022, 0xf4f9ff, 7)); lights.push(seg(V(P1.x, 0.53, 2.2), V(P3.x, 0.585, 1.92), 0.02, 0.018, 0xf4f9ff, 0)); }
      // arrow-shaped body-colour blades splitting the big black intakes
      paintParts.push(seg(V(X(0.2), 0.165, 2.452), V(X(0.6), 0.165, 2.445), 0.03, 0.045, 0xffffff));
      paintParts.push(seg(V(X(0.4), 0.455, 2.42), V(X(0.68), 0.37, 2.36), 0.025, 0.04, 0xffffff)); paintParts.push(seg(V(X(0.68), 0.37, 2.36), V(X(0.84), 0.43, 2.3), 0.025, 0.035, 0xffffff));
      for (let i = 0; i < 4; i++) parts.push(box(0.36, 0.01, 0.02, X(0.55), 0.2 + i * 0.04, 2.405, MESH));

      // mirror on a stalk
      const mz = 0.62, my = 0.93; const mx = sideX(mz, 0.85) + 0.16; parts.push(seg(V(X(mx - 0.16), 0.9, mz + 0.05), V(X(mx), my, mz), 0.04, 0.03, DARK)); paintParts.push(box(0.2, 0.1, 0.12, X(mx + 0.02), my + 0.02, mz - 0.02, 0xffffff));
      // side: door cut lines, fuel flap, the big slashed intake behind the door with its body-colour blade
      for (const z of [-0.5, 0.86]) { const p = profile(z); for (let i = 3; i < 5; i++) parts.push(seg(V(X(p[i].x + 0.005), p[i].y, z), V(X(p[i + 1].x + 0.005), p[i + 1].y, z), 0.008, 0.008, 0x050506)); }
    }
    sidePatch([[-0.42, 0.5], [-0.44, 0.86], [-0.98, 0.9], [-0.86, 0.6], [-0.66, 0.48]], 0.006, 0x050506, parts, 64);
    // depth: raised body-colour lip around the side intake, fins inside it, slats in the front-wheel vent
    for (const sd of [-1, 1]) {
      const ring = [[-0.42, 0.5], [-0.44, 0.86], [-0.98, 0.9], [-0.86, 0.6], [-0.66, 0.48]]; const P = ring.map(([z, y]) => V(sd * (sideX(z, y) + 0.022), y, z));
      for (let i = 0; i < P.length; i++) paintParts.push(seg(P[i], P[(i + 1) % P.length], 0.035, 0.022, 0xffffff));
      for (let k = 0; k < 5; k++) { const z = -0.5 - k * 0.09; const y0 = 0.53 + k * 0.01, y1 = 0.84 + k * 0.012; parts.push(seg(V(sd * (sideX(z, y0) + 0.014), y0, z), V(sd * (sideX(z, y1) + 0.014), y1, z - 0.03), 0.028, 0.014, 0x1c1e22)); }
      for (let k = 0; k < 4; k++) { const y = 0.34 + k * 0.07; parts.push(seg(V(sd * (sideX(0.84, y) + 0.016), y, 0.84), V(sd * (sideX(0.66, y) + 0.016), y - 0.03, 0.66), 0.03, 0.014, 0x1c1e22)); }
      const vr = [[0.86, 0.3], [0.86, 0.62], [0.66, 0.5], [0.62, 0.28]].map(([z, y]) => V(sd * (sideX(z, y) + 0.02), y, z)); for (let i = 0; i < 3; i++) paintParts.push(seg(vr[i], vr[i + 1], 0.03, 0.02, 0xffffff));
    }
    sidePatch([[0.86, 0.3], [0.86, 0.62], [0.66, 0.5], [0.62, 0.28]], 0.006, 0x050506, parts, 40); // vent behind the front wheel
    for (const s of [-1, 1]) { const pts = [[-0.46, 0.6], [-0.92, 0.85]].map(([z, y]) => V(s * (sideX(z, y) + 0.02), y, z)); paintParts.push(seg(pts[0], pts[1], 0.05, 0.05, 0xffffff)); }
    // dark sill blade
    for (const s of [-1, 1]) { const pts = []; for (let i = 0; i <= 12; i++) { const z = -1.0 + i / 12 * 1.85; const p = profile(z)[3]; pts.push(V(s * (p.x + 0.01), p.y - 0.01, z)); } for (let i = 0; i < 12; i++) parts.push(seg(pts[i], pts[i + 1], 0.04, 0.035, 0x15171a)); }
    // engine bay: hexagon-pattern louvres behind the cabin
    for (let i = 0; i < 6; i++) { const z = -2.24 - i * 0.035; const y = profile(z)[8].y + 0.005; parts.push(box(0.9, 0.012, 0.02, 0, y, z, 0x2b2e33)); }
    // rear: Y taillights, central high hex exhausts, black mesh
    const tz = -2.4;
    for (const s of [-1, 1]) { const X = (x) => s * x; lights.push(seg(V(X(0.32), 0.9, tz), V(X(0.9), 0.92, tz), 0.02, 0.025, 0xff140c, 1)); lights.push(seg(V(X(0.62), 0.91, tz), V(X(0.72), 0.83, tz), 0.02, 0.02, 0xff140c, 1)); lights.push(seg(V(X(0.62), 0.91, tz), V(X(0.7), 0.94, tz - 0.02), 0.02, 0.02, 0xff140c, 1)); lights.push(box(0.12, 0.025, 0.02, X(0.82), 0.84, tz, 0xffa21a, 0, s > 0 ? 2 : 3)); lights.push(box(0.12, 0.02, 0.02, X(0.45), 0.84, tz, 0xffffff, 0, 4)); }
    for (const x of [-0.13, 0.13]) { const g = new THREE.CylinderGeometry(0.1, 0.1, 0.2, 6, 1, true); g.rotateX(Math.PI / 2); g.rotateZ(Math.PI / 6); g.translate(x, 0.72, ZR - 0.02); parts.push({ geo: g, c: 0x9a9fa6 }); parts.push({ geo: new THREE.CircleGeometry(0.085, 6).rotateY(Math.PI).rotateZ(Math.PI / 6).translate(x, 0.72, ZR - 0.05), c: 0x050505 }); }
    for (let i = 0; i < 6; i++) parts.push(box(1.7, 0.012, 0.02, 0, 0.4 + i * 0.05, ZR - 0.008, MESH));
    lights.push(box(0.6, 0.012, 0.02, 0, 0.982, -2.4, 0xff140c, 0, 1));
    // interior
    for (const s of [-1, 1]) { const x = s * 0.4; interior.push(box(0.48, 0.1, 0.5, x, 0.32, -0.35, 0x1d1d20)); interior.push(box(0.48, 0.62, 0.1, x, 0.62, -0.62, 0x1d1d20, -0.32)); }
    interior.push(box(1.36, 0.08, 0.36, 0, 0.78, 0.45, 0x161618)); lights.push(box(0.3, 0.12, 0.01, 0.4, 0.86, 0.36, 0x3aa0ff, -0.6, 7));
  },
};

// ===================== STRADA SV =====================
const STR = {
  subdiv: { iters: 2, r: 0.22 }, smooth: 48, tailMat: (y) => (y > 0.62 ? 'paint' : 'trim'),
  photo: { views: [{ img: 'sv_side', slot: 0, ortho: { cx: 334.5, s: 123.5, gy: 333, ys: 0.97, side: -1 } }, { img: 'sv_front', slot: 1, cam: [-0.0105, 1.1607, 7.3781, 0.3231, 0.871, 27.9753, -1.7439] }], minFacing: 0.25 },
  ZF: 2.473, ZR: -2.473, nz: 150, archLip: 0.05,
  // traced from a flat side photo (123.5 px/m): hood 1.27 -> 1.22 m then a short tall front face, belt 1.30-1.36 m,
  // roof 1.83 m, near-vertical rear glass, axles at +1.84 / -1.49
  axles: [{ z: 1.84, r: 0.41, R: 0.44 }, { z: -1.49, r: 0.41, R: 0.44 }],
  lines: {
    p0: [[[0, 0]], [[-2.42, 0.44], [-2.1, 0.24], [2.2, 0.24], [2.42, 0.28]], -2.42, 2.42],
    p1: [[[-2.42, 0.86], [-2.1, 0.93], [2.2, 0.93], [2.42, 0.88]], [[-2.42, 0.44], [-2.1, 0.24], [2.2, 0.24], [2.42, 0.28]], -2.42, 2.42],
    p2: [[[-2.47, 0.88], [-2.0, 0.985], [2.0, 0.985], [2.45, 0.84]], [[-2.47, 0.48], [-2.1, 0.33], [0, 0.29], [2.1, 0.3], [2.45, 0.29]], -2.47, 2.45],
    p3: [[[-2.473, 0.94], [-2.2, 1.0], [-1.5, 1.02], [0, 1.022], [1.5, 1.02], [2.1, 1.0], [2.473, 0.86]], [[-2.473, 0.95], [-2.2, 0.62], [-1.6, 0.57], [0, 0.56], [1.6, 0.57], [2.473, 0.62]], -2.473, 2.473],
    p4: [[[-2.34, 0.9], [-2.1, 0.97], [-1.5, 0.995], [0, 1.0], [1.16, 0.995], [2.0, 0.965], [2.36, 0.84]], [[-2.34, 1.34], [-1.5, 1.345], [0, 1.325], [1.16, 1.29], [2.0, 1.2], [2.36, 1.05]], -2.34, 2.36],
    p5: [[[-2.34, 0.8], [-1.5, 0.9], [0, 0.9], [1.16, 0.88], [2.0, 0.86], [2.36, 0.76]], [[-2.34, 1.355], [-1.5, 1.36], [0, 1.34], [1.16, 1.305], [2.0, 1.215], [2.36, 1.07]], -2.34, 2.36],
    p6: [[[-2.34, 0.6], [0, 0.7], [1.16, 0.6], [2.36, 0.6]], [[-2.34, 1.36], [-1.5, 1.365], [0, 1.345], [1.16, 1.27], [1.98, 1.225], [2.15, 1.175], [2.36, 1.08]], -2.34, 2.36],
    p7: [[[0, 0]], [[-2.34, 1.36], [-1.5, 1.365], [0, 1.345], [1.16, 1.275], [1.98, 1.23], [2.15, 1.18], [2.36, 1.085]], -2.34, 2.36],
  },
  canopy: {
    z0: -2.34, z1: 1.16, rail: 0.22, n: 130, subdiv: { iters: 2, r: 0.2 },
    belt: [[-2.34, 1.365], [-1.5, 1.365], [0, 1.345], [1.16, 1.3]], x0: [[-2.34, 0.8], [-2.1, 0.86], [0.3, 0.875], [1.16, 0.84]],
    roof: [[-2.34, 1.38], [-2.16, 1.74], [-1.9, 1.78], [-0.77, 1.83], [0.33, 1.78], [1.16, 1.31]], x1: [[-2.34, 0.7], [-2.16, 0.7], [0.33, 0.74], [1.16, 0.82]], drop: [[-2.34, 0.0], [-2.16, 0.06], [0.33, 0.075], [1.16, 0]],
    mat: (j, zc, yc, belt) => {
      if (j <= 2) { const win = zc > -2.13 && zc < 1.12 && yc > belt + 0.03; const pillar = (zc > -0.29 && zc < -0.17) || (zc > -1.11 && zc < -1.02); return win && !pillar ? 'glass' : (yc > belt + 0.03 ? 'trim' : 'paint'); }
      if (j === 3) return zc > 0.36 ? 'glass' : 'trim';
      return zc > 0.36 || zc < -2.15 ? 'glass' : 'trim';
    },
    rearCap: 'glass',
  },
  doors: { z0: -0.2, z1: 1.12, rows: [3, 4], segs: [3, 4], yMin: 0.45 },
  plate: { text: 'SV 0001', y: 0.88 },
  noseCap(f, fan) { const [p0, p1, p2, p2m, p3, p4, p5, p6, p7] = f; fan('paint', [new THREE.Vector3(0, 0.7, 2.45), p7, p6, p5, p4, p3, p2m, p2, p1, p0], new THREE.Vector3(0, 0, 1)); },
  tailCap(r, fan) { const [p0, p1, p2, p2m, p3, p4, p5, p6, p7] = r; fan('paint', [new THREE.Vector3(0, 1.0, -2.46), p7, p6, p5, p4, p3], new THREE.Vector3(0, 0, -1)); fan('trim', [new THREE.Vector3(0, 0.62, -2.44), p3, p2m, p2, p1, p0], new THREE.Vector3(0, 0, -1)); },
  frontLip: ({ box }) => [box(1.6, 0.03, 0.2, 0, 0.27, -0.12, DARK)],
  rearLip: ({ box }) => { const o = [box(1.5, 0.22, 0.06, 0, 0.42, 0.03, DARK)]; for (const x of [-0.62, -0.46, 0.46, 0.62]) { const g = new THREE.CylinderGeometry(0.055, 0.06, 0.16, 14); g.rotateX(Math.PI / 2); g.translate(x, 0.36, -0.04); o.push({ geo: g, c: 0x2a2c30 }); o.push({ geo: new THREE.CircleGeometry(0.045, 12).rotateY(Math.PI).translate(x, 0.36, -0.125), c: 0x050505 }); } return o; },
  details(a) {
    const { V, seg, box, parts, lights, interior, paintParts, profile, sideX, sidePatch } = a; const ZF = 2.473, ZR = -2.473;
    // the front face leans back: hood edge (1.085 m) sits at z 2.36, the bumper (0.62 m) at 2.473, the chin (0.29 m) at 2.42
    const fz = (y) => (y >= 0.62 ? 2.36 + 0.113 * (1.085 - Math.min(1.085, y)) / 0.465 : 2.473 - 0.053 * (0.62 - y) / 0.33);
    const rz = (y) => (y >= 0.95 ? -2.34 - 0.133 * (1.34 - Math.min(1.34, y)) / 0.39 : -2.473 + 0.05 * (0.95 - y) / 0.5);
    // grille: wide black trapezoid with honeycomb
    const honey = (cx, cy, w, h) => { const zz = fz(cy) - Math.abs(cx) * 0.06; parts.push(box(w, h, 0.03, cx, cy, zz + 0.004, DARK)); const nx = Math.floor(w / 0.042), ny = Math.floor(h / 0.03); for (let r = 0; r < ny; r++) for (let c = 0; c < nx; c++) parts.push(box(0.03, 0.016, 0.01, cx - w / 2 + 0.03 + c * 0.042 + (r % 2) * 0.021, cy - h / 2 + 0.022 + r * 0.03, zz + 0.022, MESH)); };
    honey(0, 1.0, 0.84, 0.075);
    // big lower intakes (centre + sides) with honeycomb, body-colour bars between them
    honey(0, 0.76, 1.0, 0.075); honey(0, 0.48, 1.16, 0.16);
    for (const s of [-1, 1]) honey(s * 0.71, 0.58, 0.15, 0.3);
    for (const s of [-1, 1]) {
      const X = (x) => s * x;
      // slim headlights: dark housing + main beam strip + DRL signature underneath
      parts.push(seg(V(X(0.46), 1.035, fz(1.035) + 0.006), V(X(0.84), 1.045, fz(1.04) - 0.06), 0.03, 0.055, 0x15171a));
      lights.push(seg(V(X(0.49), 1.045, fz(1.045) + 0.022), V(X(0.83), 1.053, fz(1.05) - 0.045), 0.015, 0.018, 0xf6fbff, 0)); lights.push(seg(V(X(0.49), 1.02, fz(1.02) + 0.022), V(X(0.83), 1.028, fz(1.03) - 0.045), 0.012, 0.01, 0xf6fbff, 7));
      for (let i = 0; i < 4; i++) lights.push(box(0.045, 0.02, 0.02, X(0.57 + i * 0.065), 1.045, fz(1.045) + 0.024 - i * 0.017, 0xffffff, 0, 0));
      // fender vent behind the front wheel
      const vz = 1.3; const vx = sideX(vz, 1.07) + 0.006; parts.push(seg(V(X(vx), 1.05, vz - 0.09), V(X(vx), 1.09, vz + 0.09), 0.012, 0.035, 0x050506)); parts.push(seg(V(X(vx + 0.004), 1.075, vz - 0.09), V(X(vx + 0.004), 1.1, vz + 0.09), 0.014, 0.01, 0xb8bec4));
      // door cuts (front + rear doors), flush handles
      for (const z of [1.12, -0.2, -1.07]) { const p = profile(z); for (let i = 3; i < 5; i++) parts.push(seg(V(X(p[i].x + 0.005), p[i].y, z), V(X(p[i + 1].x + 0.005), p[i + 1].y, z), 0.008, 0.008, 0x050506)); }
      for (const z of [0.04, -0.98]) parts.push(box(0.012, 0.024, 0.22, X(sideX(z, 1.2) + 0.006), 1.2, z, 0x3a3c40));
      // mirrors (black)
      const mz = 1.1, my = 1.38, mx = sideX(mz, 1.25) + 0.13; parts.push(box(0.24, 0.15, 0.1, X(mx), my, mz, DARK)); parts.push(seg(V(X(mx - 0.12), 1.33, mz + 0.02), V(X(mx - 0.02), my - 0.03, mz), 0.05, 0.03, DARK));
    }
    // black cladding along the sills
    for (const s of [-1, 1]) { const pts = []; for (let i = 0; i <= 12; i++) { const z = -0.95 + i / 12 * 2.3; const p = profile(z)[2]; pts.push(V(s * (p.x + 0.02), p.y + 0.03, z)); } for (let i = 0; i < 12; i++) parts.push(seg(pts[i], pts[i + 1], 0.03, 0.06, DARK)); }
    // roof spoiler, shark-fin, tailgate light bar
    parts.push(box(1.3, 0.035, 0.3, 0, 1.765, -2.0, DARK)); parts.push(box(0.06, 0.06, 0.2, 0, 1.8, -1.75, DARK));
    const tz = rz(1.24) - 0.006; parts.push(box(1.6, 0.08, 0.02, 0, 1.24, tz, 0x101114));
    for (const s of [-1, 1]) { lights.push(box(0.42, 0.04, 0.02, s * 0.68, 1.25, tz - 0.004, 0xff140c, 0, 1)); lights.push(box(0.12, 0.03, 0.02, s * 0.36, 1.23, tz - 0.004, 0xffffff, 0, 4)); lights.push(box(0.1, 0.02, 0.02, s * 0.88, 1.22, tz - 0.004, 0xffa21a, 0, s > 0 ? 2 : 3)); lights.push(seg(V(s * (sideX(-2.3, 1.25) - 0.03), 1.25, -2.3), V(s * (sideX(-2.12, 1.26) - 0.022), 1.26, -2.12), 0.03, 0.035, 0xff140c, 1)); }
    lights.push(box(0.5, 0.02, 0.02, 0, 1.745, -2.08, 0xff140c, 0, 1));
    // interior
    for (const s of [-1, 1]) { const x = s * 0.42; for (const z of [0.25, -0.75]) { interior.push(box(0.5, 0.12, 0.5, x, 0.78, z, 0x2a1d18)); interior.push(box(0.5, 0.7, 0.12, x, 1.12, z - 0.3, 0x2a1d18, -0.15)); } }
    interior.push(box(1.6, 0.12, 0.4, 0, 1.24, 0.9, 0x161618)); lights.push(box(0.34, 0.16, 0.01, 0.0, 1.33, 0.84, 0x3aa0ff, -0.4, 7));
  },
};
export const CREASE_DEFS = { rivolta: RIV, strada: STR };
export function buildCrease(spec, color) { return buildCreaseCar(CREASE_DEFS[spec.crease], spec, color); }
