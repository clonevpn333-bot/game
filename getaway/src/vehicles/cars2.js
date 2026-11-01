// GETAWAY! — hand-modelled real-proportion cars (crease-line builder). No real badges or names.
//  rivolta  — V12 hybrid hypercar (4.95 x 2.03 x 1.16 m, 2.78 m wheelbase): Y-lights, arrow intakes, slashed side intake.
//  strada   — super-SUV (4.95 x 2.05 x 1.82 m, 3.00 m wheelbase): slim lights, honeycomb grille, floating black roof.
import * as THREE from 'three';
import { buildCreaseCar } from './creasecar.js';

const DARK = 0x0b0c0e, MESH = 0x24272c;

// ===================== TORO RIVOLTA =====================
const RIV = {
  ZF: 2.475, ZR: -2.475, nz: 140,
  axles: [{ z: 1.3, r: 0.355, R: 0.445 }, { z: -1.48, r: 0.355, R: 0.455 }],
  lines: {
    p0: [[[0, 0]], [[-2.4, 0.22], [-2.0, 0.12], [2.2, 0.12], [2.42, 0.16]], -2.42, 2.42],
    p1: [[[-2.4, 0.8], [-1.5, 0.9], [1.3, 0.9], [2.0, 0.82], [2.42, 0.55]], [[-2.4, 0.22], [-2.0, 0.12], [2.2, 0.12], [2.42, 0.16]], -2.42, 2.42],
    p2: [[[-2.45, 0.92], [-1.5, 0.985], [0, 0.94], [1.3, 0.97], [2.0, 0.97], [2.42, 0.84]], [[-2.45, 0.3], [-1.5, 0.27], [0, 0.24], [1.3, 0.25], [2.0, 0.26], [2.42, 0.17]], -2.45, 2.42],
    p3: [[[-2.475, 0.96], [-1.5, 1.015], [-0.6, 0.985], [0.4, 0.965], [1.3, 1.0], [2.0, 0.99], [2.32, 0.93]], [[-2.475, 0.62], [-1.5, 0.68], [-0.55, 0.66], [0.3, 0.55], [0.95, 0.5], [1.3, 0.5], [2.0, 0.47], [2.32, 0.36]], -2.475, 2.32],
    p4: [[[-2.475, 0.93], [-1.5, 0.985], [-0.7, 0.94], [0.3, 0.9], [1.3, 0.96], [2.0, 0.95], [2.36, 0.87]], [[-2.475, 0.93], [-1.5, 0.95], [-0.7, 0.88], [0.3, 0.8], [1.3, 0.8], [2.0, 0.7], [2.36, 0.56]], -2.475, 2.36],
    p5: [[[-2.475, 0.8], [-1.5, 0.84], [-0.7, 0.8], [0.3, 0.78], [0.9, 0.8], [1.3, 0.8], [2.42, 0.66]], [[-2.475, 0.955], [-1.5, 0.965], [-0.7, 0.9], [0.3, 0.84], [0.9, 0.84], [1.3, 0.81], [2.42, 0.54]], -2.475, 2.42],
    p6: [[[-2.475, 0.6], [-1.5, 0.66], [0, 0.7], [0.9, 0.62], [1.6, 0.5], [2.46, 0.4]], [[-2.475, 0.965], [-1.5, 0.975], [-0.7, 0.905], [0.3, 0.845], [0.9, 0.84], [1.6, 0.74], [2.46, 0.53]], -2.475, 2.46],
    p7: [[[0, 0]], [[-2.475, 0.97], [-1.5, 0.98], [-0.7, 0.91], [0.3, 0.85], [0.9, 0.845], [1.6, 0.76], [2.475, 0.53]], -2.475, 2.475],
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
  tailCap(r, fan) { const [p0, p1, p2, p2m, p3, p4, p5, p6, p7] = r; const cut = 0.8; const k = (p4.y - cut) / (p4.y - p3.y); const R4 = p4.clone().lerp(p3, k), R0 = new THREE.Vector3(0, cut, p4.z); fan('paint', [R0, p7, p6, p5, p4, R4], new THREE.Vector3(0, 0, -1)); fan('trim', [R0, R4, p3, p2m, p2, p1, p0], new THREE.Vector3(0, 0, -1)); },
  frontLip: ({ box }) => [box(1.72, 0.03, 0.32, 0, 0.12, -0.12, DARK), box(0.05, 0.14, 0.3, -0.7, 0.18, -0.12, DARK), box(0.05, 0.14, 0.3, 0.7, 0.18, -0.12, DARK)],
  rearLip: ({ box }) => { const o = [box(1.6, 0.03, 0.42, 0, 0.18, 0.2, DARK)]; for (let i = -3; i <= 3; i++) o.push(box(0.02, 0.2, 0.42, i * 0.22, 0.28, 0.2, DARK)); return o; },
  details(a) {
    const { V, seg, box, poly, parts, lights, interior, paintParts, profile, sideX, sidePatch, ZR = -2.475 } = a;
    for (const s of [-1, 1]) {
      const X = (x) => s * x;
      // Y-shaped headlights: slit along the nose edge + the two arms of the Y
      const A = V(X(0.36), 0.505, 2.415), B = V(X(0.8), 0.535, 2.29), M = V(X(0.6), 0.52, 2.36);
      lights.push(seg(A, B, 0.03, 0.04, 0xf4f9ff, 7)); lights.push(seg(M, V(X(0.72), 0.6, 2.3), 0.03, 0.035, 0xf4f9ff, 7)); lights.push(seg(M, V(X(0.66), 0.42, 2.38), 0.03, 0.035, 0xf4f9ff, 7));
      lights.push(box(0.12, 0.035, 0.03, X(0.5), 0.49, 2.405, 0xffffff, 0, 0)); lights.push(box(0.1, 0.03, 0.03, X(0.68), 0.505, 2.34, 0xffffff, 0, 0));
      parts.push(poly([A, B, V(X(0.82), 0.47, 2.27), V(X(0.38), 0.45, 2.41)].map((v) => v.clone().setZ(v.z - 0.004)), 0x15171a));
      // arrow-shaped body-colour blades splitting the big black intakes
      paintParts.push(seg(V(X(0.2), 0.165, 2.452), V(X(0.6), 0.165, 2.445), 0.03, 0.045, 0xffffff));
      paintParts.push(seg(V(X(0.4), 0.455, 2.42), V(X(0.68), 0.37, 2.36), 0.025, 0.04, 0xffffff)); paintParts.push(seg(V(X(0.68), 0.37, 2.36), V(X(0.84), 0.43, 2.3), 0.025, 0.035, 0xffffff));
      for (let i = 0; i < 4; i++) parts.push(box(0.36, 0.01, 0.02, X(0.55), 0.2 + i * 0.04, 2.405, MESH));

      // mirror on a stalk
      const mz = 0.62, my = 0.93; const mx = sideX(mz, 0.85) + 0.16; parts.push(seg(V(X(mx - 0.16), 0.9, mz + 0.05), V(X(mx), my, mz), 0.04, 0.03, DARK)); paintParts.push(box(0.2, 0.1, 0.12, X(mx + 0.02), my + 0.02, mz - 0.02, 0xffffff));
      // side: door cut lines, fuel flap, the big slashed intake behind the door with its body-colour blade
      for (const z of [-0.5, 0.86]) { const p = profile(z); for (let i = 3; i < 5; i++) parts.push(seg(V(X(p[i].x + 0.005), p[i].y, z), V(X(p[i + 1].x + 0.005), p[i + 1].y, z), 0.008, 0.008, 0x050506)); }
    }
    sidePatch([[-0.5, 0.47], [-0.47, 0.88], [-1.2, 0.93], [-1.02, 0.62], [-0.82, 0.47]], 0.006, 0x050506, parts, 64);
    for (const s of [-1, 1]) { const pts = [[-0.52, 0.6], [-1.08, 0.88]].map(([z, y]) => V(s * (sideX(z, y) + 0.02), y, z)); paintParts.push(seg(pts[0], pts[1], 0.05, 0.05, 0xffffff)); }
    // dark sill blade
    for (const s of [-1, 1]) { const pts = []; for (let i = 0; i <= 12; i++) { const z = -1.0 + i / 12 * 1.85; const p = profile(z)[3]; pts.push(V(s * (p.x + 0.01), p.y - 0.01, z)); } for (let i = 0; i < 12; i++) parts.push(seg(pts[i], pts[i + 1], 0.04, 0.035, 0x15171a)); }
    // engine bay: hexagon-pattern louvres behind the cabin
    for (let i = 0; i < 6; i++) { const z = -2.24 - i * 0.035; const y = profile(z)[8].y + 0.005; parts.push(box(0.9, 0.012, 0.02, 0, y, z, 0x2b2e33)); }
    // rear: Y taillights, central high hex exhausts, black mesh
    const tz = ZR - 0.006;
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
  ZF: 2.473, ZR: -2.473, nz: 130, archLip: 0.06,
  axles: [{ z: 1.5, r: 0.405, R: 0.5 }, { z: -1.5, r: 0.405, R: 0.5 }],
  lines: {
    p0: [[[0, 0]], [[-2.4, 0.36], [-2.0, 0.24], [2.0, 0.24], [2.42, 0.32]], -2.42, 2.42],
    p1: [[[-2.4, 0.85], [-2.0, 0.92], [2.0, 0.92], [2.42, 0.86]], [[-2.4, 0.36], [-2.0, 0.24], [2.0, 0.24], [2.42, 0.32]], -2.42, 2.42],
    p2: [[[-2.45, 0.95], [-1.9, 0.985], [1.9, 0.985], [2.44, 0.94]], [[-2.45, 0.5], [-1.9, 0.42], [1.9, 0.42], [2.44, 0.4]], -2.45, 2.44],
    p3: [[[-2.473, 0.97], [-1.5, 1.018], [0, 1.02], [1.5, 1.018], [2.47, 0.95]], [[-2.473, 0.7], [-1.5, 0.66], [0, 0.62], [1.5, 0.62], [2.47, 0.6]], -2.473, 2.47],
    p4: [[[-2.473, 0.93], [-1.5, 0.99], [0, 0.995], [1.5, 0.99], [2.42, 0.94]], [[-2.473, 1.2], [-1.5, 1.19], [0, 1.16], [1.5, 1.12], [2.38, 1.06]], -2.473, 2.38],
    p5: [[[-2.473, 0.86], [-1.5, 0.9], [0, 0.9], [0.95, 0.9], [2.45, 0.86]], [[-2.473, 1.21], [-1.5, 1.2], [0, 1.17], [0.95, 1.145], [2.41, 1.085]], -2.473, 2.41],
    p6: [[[-2.473, 0.6], [0, 0.7], [0.95, 0.62], [2.473, 0.62]], [[-2.473, 1.22], [-1.5, 1.21], [0, 1.18], [0.95, 1.155], [2.42, 1.1]], -2.473, 2.42],
    p7: [[[0, 0]], [[-2.473, 1.22], [-1.5, 1.21], [0, 1.18], [0.95, 1.165], [2.42, 1.11]], -2.473, 2.42],
  },
  canopy: {
    z0: -2.3, z1: 0.95, rail: 0.12,
    belt: [[-2.3, 1.24], [-1.5, 1.22], [0, 1.19], [0.95, 1.162]], x0: [[-2.3, 0.8], [-1.5, 0.86], [0, 0.865], [0.95, 0.84]],
    roof: [[-2.3, 1.56], [-2.0, 1.76], [-1.6, 1.79], [0.2, 1.82], [0.95, 1.17]], x1: [[-2.3, 0.66], [-2.0, 0.7], [0.2, 0.73], [0.95, 0.8]], drop: [[-2.3, 0.02], [-2.0, 0.04], [0.2, 0.05], [0.95, 0]],
    mat: (j, zc, yc, belt) => {
      if (j <= 2) { const win = zc > -2.0 && zc < 0.9 && yc > belt + 0.035; const pillar = Math.abs(zc + 0.42) < 0.07 || (zc < -1.48 && zc > -1.62); return win && !pillar ? 'glass' : (yc > belt + 0.035 ? 'trim' : 'paint'); }
      if (j === 3) return zc > 0.22 ? 'glass' : 'trim';
      return zc > 0.22 || zc < -2.02 ? 'glass' : 'trim';
    },
    rearCap: 'glass',
  },
  doors: { z0: -0.42, z1: 0.95, rows: [3, 4] },
  plate: { text: 'SV 0001', y: 0.92 },
  noseCap(f, fan) { const [p0, p1, p2, p2m, p3, p4, p5, p6, p7] = f; fan('paint', [new THREE.Vector3(0, 0.7, 2.47), p7, p6, p5, p4, p3, p2m, p2, p1, p0], new THREE.Vector3(0, 0, 1)); },
  tailCap(r, fan) { const [p0, p1, p2, p2m, p3, p4, p5, p6, p7] = r; const cut = 0.62; const k = (p4.y - cut) / (p4.y - p3.y); const R4 = p4.clone().lerp(p3, Math.min(1, k)), R0 = new THREE.Vector3(0, cut, p4.z); fan('paint', [R0, p7, p6, p5, p4, R4], new THREE.Vector3(0, 0, -1)); fan('trim', [R0, R4, p3, p2m, p2, p1, p0], new THREE.Vector3(0, 0, -1)); },
  frontLip: ({ box }) => [box(1.7, 0.03, 0.2, 0, 0.27, -0.06, DARK)],
  rearLip: ({ box }) => { const o = [box(1.5, 0.22, 0.06, 0, 0.42, 0.0, DARK)]; for (const x of [-0.62, -0.46, 0.46, 0.62]) { const g = new THREE.CylinderGeometry(0.055, 0.06, 0.16, 14); g.rotateX(Math.PI / 2); g.translate(x, 0.36, -0.04); o.push({ geo: g, c: 0x2a2c30 }); o.push({ geo: new THREE.CircleGeometry(0.045, 12).rotateY(Math.PI).translate(x, 0.36, -0.125), c: 0x050505 }); } return o; },
  details(a) {
    const { V, seg, box, parts, lights, interior, paintParts, profile, sideX, sidePatch } = a; const ZF = 2.473, ZR = -2.473;
    // grille: wide black trapezoid with honeycomb
    const honey = (cx, cy, w, h) => { parts.push(box(w, h, 0.03, cx, cy, ZF + 0.006, DARK)); const nx = Math.floor(w / 0.042), ny = Math.floor(h / 0.03); for (let r = 0; r < ny; r++) for (let c = 0; c < nx; c++) parts.push(box(0.03, 0.016, 0.01, cx - w / 2 + 0.03 + c * 0.042 + (r % 2) * 0.021, cy - h / 2 + 0.022 + r * 0.03, ZF + 0.024, MESH)); };
    honey(0, 0.955, 0.86, 0.085);
    // big lower intakes (centre + sides) with honeycomb, body-colour bars between them
    honey(0, 0.72, 1.0, 0.075); honey(0, 0.47, 1.16, 0.15);
    for (const s of [-1, 1]) honey(s * 0.8, 0.56, 0.17, 0.3);
    for (const s of [-1, 1]) {
      const X = (x) => s * x;
      // slim headlights: dark housing + main beam strip + DRL signature underneath
      parts.push(seg(V(X(0.47), 0.985, ZF + 0.004), V(X(0.95), 0.995, 2.39), 0.03, 0.06, 0x15171a));
      lights.push(seg(V(X(0.5), 0.995, ZF + 0.02), V(X(0.93), 1.003, 2.405), 0.015, 0.02, 0xf6fbff, 0)); lights.push(seg(V(X(0.5), 0.968, ZF + 0.02), V(X(0.93), 0.976, 2.405), 0.012, 0.01, 0xf6fbff, 7));
      for (let i = 0; i < 4; i++) lights.push(box(0.045, 0.022, 0.02, X(0.58 + i * 0.085), 0.995, ZF + 0.024 - i * 0.02, 0xffffff, 0, 0));
      // fender vent behind the front wheel
      const vz = 0.86; sidePatch && 0; const vx = sideX(vz, 0.9) + 0.006; parts.push(box(0.012, 0.05, 0.3, X(vx), 0.9, vz, 0x050506)); parts.push(box(0.016, 0.012, 0.3, X(vx + 0.004), 0.915, vz, 0x9aa0a6));
      // door cuts (front + rear doors), flush handles
      for (const z of [0.95, -0.42, -1.42]) { const p = profile(z); for (let i = 3; i < 5; i++) parts.push(seg(V(X(p[i].x + 0.005), p[i].y, z), V(X(p[i + 1].x + 0.005), p[i + 1].y, z), 0.008, 0.008, 0x050506)); }
      for (const z of [0.05, -1.05]) parts.push(box(0.012, 0.022, 0.2, X(sideX(z, 1.03) + 0.006), 1.03, z, 0x2a2c30));
      // mirrors (black)
      const mz = 0.8, my = 1.27, mx = sideX(mz, 1.1) + 0.14; parts.push(box(0.24, 0.15, 0.1, X(mx), my, mz, DARK)); parts.push(seg(V(X(mx - 0.12), 1.22, mz + 0.02), V(X(mx - 0.02), my - 0.03, mz), 0.05, 0.03, DARK));
    }
    // black cladding along the sills
    for (const s of [-1, 1]) { const pts = []; for (let i = 0; i <= 12; i++) { const z = -0.98 + i / 12 * 1.96; const p = profile(z)[3]; pts.push(V(s * (p.x + 0.008), p.y + 0.02, z)); } for (let i = 0; i < 12; i++) parts.push(seg(pts[i], pts[i + 1], 0.03, 0.06, DARK)); }
    // roof spoiler, shark-fin, tailgate light bar
    parts.push(box(1.36, 0.04, 0.3, 0, 1.77, -2.12, DARK)); parts.push(box(0.06, 0.07, 0.2, 0, 1.85, -1.75, DARK));
    const tz = ZR - 0.006; parts.push(box(1.7, 0.09, 0.02, 0, 1.14, tz, 0x101114));
    for (const s of [-1, 1]) { lights.push(box(0.42, 0.04, 0.02, s * 0.68, 1.15, tz - 0.004, 0xff140c, 0, 1)); lights.push(box(0.12, 0.03, 0.02, s * 0.36, 1.13, tz - 0.004, 0xffffff, 0, 4)); lights.push(box(0.1, 0.02, 0.02, s * 0.88, 1.12, tz - 0.004, 0xffa21a, 0, s > 0 ? 2 : 3)); }
    lights.push(box(0.5, 0.02, 0.02, 0, 1.765, -2.3, 0xff140c, 0, 1));
    // interior
    for (const s of [-1, 1]) { const x = s * 0.42; for (const z of [0.1, -0.85]) { interior.push(box(0.5, 0.12, 0.5, x, 0.72, z, 0x2a1d18)); interior.push(box(0.5, 0.7, 0.12, x, 1.05, z - 0.3, 0x2a1d18, -0.15)); } }
    interior.push(box(1.6, 0.12, 0.4, 0, 1.15, 0.72, 0x161618)); lights.push(box(0.34, 0.16, 0.01, 0.0, 1.24, 0.66, 0x3aa0ff, -0.4, 7));
  },
};
export const CREASE_DEFS = { rivolta: RIV, strada: STR };
export function buildCrease(spec, color) { return buildCreaseCar(CREASE_DEFS[spec.crease], spec, color); }
