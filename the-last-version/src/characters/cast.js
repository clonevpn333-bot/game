// The recurring cast: Kai Voss, Sera Lind, Dr. Eda Venn.
import * as THREE from 'three';
import { P, Sculpt } from './sculpt.js';
import { Humanoid, clothMaterial, hairMaterial, lerp3, add, mul, norm, V } from './humanoid.js';
import { surfaceTube, stitches, zipper, raySurface, attachDetail, project } from './details.js';
import { preloadSets } from '../engine/assets.js';

export const CAST_TEXTURES = ['leather_dark', 'denim', 'jersey', 'linen', 'fleece', 'leather_brown', 'velvet'];

const T = (p, bone, k = 0.02) => Object.assign(p, { bone, k });
const OP = (p, op, k = 0.004) => Object.assign(p, { op, k });

// ---------------------------------------------------------------------------
// shared garment generators (reference 1.80 m units scaled by s)
// ---------------------------------------------------------------------------
function torsoPrims(ch, o = {}) {
  const J = ch.J, s = ch.def.body.height / 1.8, sw = ch.def.body.shoulder ?? 1, fem = o.fem ? 1 : 0;
  const armA = (ch.def.body.armAngle ?? 40) * Math.PI / 180;
  const pr = [
    T(P.ellipsoid([0, 1.325 * s, 0.008 * s], [0.165 * s * sw, 0.148 * s, (0.11 + fem * 0.012) * s]), 'chest', 0),
    T(P.ellipsoid([0, 1.165 * s, 0], [(0.148 - fem * 0.02) * s * sw, 0.14 * s, 0.1 * s]), 'spine', 0.06 * s),
    T(P.ellipsoid([0, 1.0 * s, 0], [(0.155 + fem * 0.01) * s, 0.11 * s, 0.106 * s]), 'hips', 0.05 * s),
  ];
  if (fem) for (const sx of [1, -1]) pr.push(T(P.ellipsoid([0.055 * sx * s, 1.3 * s, 0.07 * s], [0.055 * s, 0.05 * s, 0.05 * s]), 'chest', 0.04 * s));
  for (const [side, sx] of [['L', 1], ['R', -1]]) {
    const ua = J['upperArm' + side], fa = J['forearm' + side], ha = J['hand' + side];
    pr.push(T(P.capsule([0.06 * sx * s, 1.45 * s, -0.01 * s], ua, 0.066 * s, 0.062 * s), 'clavicle' + side, 0.045 * s));
    pr.push(T(P.capsule(ua, fa, (o.sleeve ?? 0.058) * s, (o.sleeve ?? 0.058) * 0.85 * s), 'upperArm' + side, 0.02 * s));
    const end = o.rolled ? lerp3(fa, ha, 0.42) : lerp3(fa, ha, 0.93);
    pr.push(T(P.capsule(fa, end, 0.049 * s, (o.rolled ? 0.047 : 0.044) * s), 'forearm' + side, 0.02 * s));
    // cuff
    pr.push(T(P.torus(lerp3(fa, ha, o.rolled ? 0.4 : 0.9), (o.rolled ? 0.046 : 0.041) * s, (o.rolled ? 0.014 : 0.008) * s, { rot: [0, 0, armA * sx], sy: o.rolled ? 1.4 : 1 }), 'forearm' + side, 0.006 * s));
  }
  return pr;
}

function findSurface(prims, x, y, fromZ = 0.4) {
  const sc = new Sculpt(); for (const p of prims) if (!p.op) sc.add(p, p.k ?? 0.01);
  return raySurface(sc, [x, y, fromZ], [0, 0, -1], 0.8);
}

function shoeParts(ch, side, o = {}) {
  const J = ch.J, s = ch.def.body.height / 1.8, sx = side === 'L' ? 1 : -1;
  const x = J['foot' + side][0];
  const boot = o.boot ? 1 : 0;
  const upper = [
    T(P.capsule([x, 0.06 * s, -0.045 * s], [x, 0.048 * s, 0.135 * s], 0.048 * s, 0.04 * s), 'foot' + side, 0),
    T(P.ellipsoid([x, (0.1 + boot * 0.04) * s, -0.018 * s], [0.045 * s, (0.055 + boot * 0.05) * s, 0.054 * s]), 'foot' + side, 0.025 * s),
    T(P.ellipsoid([x + 0.004 * sx * s, 0.045 * s, 0.118 * s], [0.046 * s, 0.034 * s, 0.062 * s]), 'toe' + side, 0.03 * s),
    OP(P.plane([0, 0.026 * s, 0], [0, -1, 0]), 'inter', 0.004 * s),
    // collar opening
    OP(P.ellipsoid([x, (0.165 + boot * 0.09) * s, -0.012 * s], [0.036 * s, 0.03 * s, 0.042 * s]), 'sub', 0.008 * s),
  ];
  const sole = [
    T(P.box([x, 0.017 * s, 0.045 * s], [0.05 * s, 0.017 * s, 0.13 * s], 0.014 * s), 'foot' + side, 0),
    T(P.box([x + 0.004 * sx * s, 0.017 * s, 0.13 * s], [0.05 * s, 0.017 * s, 0.05 * s], 0.016 * s), 'toe' + side, 0.02 * s),
    OP(P.plane([0, 0.0, 0], [0, -1, 0]), 'inter', 0.002 * s),
  ];
  return { upper, sole, x };
}

function addShoes(ch, upperMat, soleMat, laceMat, o = {}) {
  const pieces = [];
  for (const side of ['L', 'R']) {
    const sp = shoeParts(ch, side, o);
    const s = ch.def.body.height / 1.8;
    pieces.push({
      name: 'shoe' + side, prims: sp.upper, material: upperMat, res: 0.0032 * s, softness: 0.02, aoScale: 0.5,
      after: (m, sc) => {
        // laces: criss-cross over the tongue
        const geos = [];
        const pts = [];
        for (let i = 0; i < 5; i++) {
          const z = (0.005 + i * 0.024) * s, y = (0.112 - i * 0.012) * s;
          const a = raySurface(sc, [sp.x + 0.016 * s, y + 0.1, z], [0, -1, 0], 0.3), b = raySurface(sc, [sp.x - 0.016 * s, y + 0.1, z + 0.012 * s], [0, -1, 0], 0.3);
          if (a && b) pts.push([a, b]);
        }
        const lacePrims = sp.upper.filter((p) => !p.op);
        for (let i = 0; i < pts.length - 1; i++) {
          geos.push(surfaceTube(sc, [pts[i][0], lerp3(pts[i][0], pts[i + 1][1], 0.5), pts[i + 1][1]], { radius: 0.0022 * s, lift: 0.002, samples: 8 }));
          geos.push(surfaceTube(sc, [pts[i][1], lerp3(pts[i][1], pts[i + 1][0], 0.5), pts[i + 1][0]], { radius: 0.0022 * s, lift: 0.002, samples: 8 }));
        }
        for (const g of geos) attachDetail(ch, g, laceMat, lacePrims, 'lace', 0.02);
        // welt stitching around the upper just above the sole
        const ring = [];
        for (let i = 0; i <= 24; i++) { const a = (i / 24) * Math.PI * 2; ring.push([sp.x + Math.cos(a) * 0.06 * s, 0.035 * s, 0.045 * s + Math.sin(a) * 0.14 * s]); }
        attachDetail(ch, stitches(sc, ring, { spacing: 0.006 * s }), laceMat, lacePrims, 'welt', 0.02);
      },
    });
    pieces.push({ name: 'sole' + side, prims: sp.sole, material: soleMat, res: 0.0032 * s, softness: 0.02, aoScale: 0.4 });
  }
  return pieces;
}

function pantsPieces(ch, mat, o = {}) {
  const J = ch.J, s = ch.def.body.height / 1.8, hw = ch.def.body.hipWidth ?? 1;
  const pr = [
    T(P.ellipsoid([0, 0.955 * s, -0.004 * s], [0.158 * s * hw, 0.13 * s, 0.112 * s]), 'hips', 0),
    T(P.ellipsoid([0, 1.03 * s, 0], [0.148 * s, 0.07 * s, 0.103 * s]), 'hips', 0.04 * s),
  ];
  for (const [side, sx] of [['L', 1], ['R', -1]]) {
    const th = J['thigh' + side], sh = J['shin' + side], ft = J['foot' + side];
    pr.push(T(P.capsule(add(th, [0, 0.03 * s, 0]), sh, 0.084 * s * hw, 0.058 * s), 'thigh' + side, 0.03 * s));
    pr.push(T(P.capsule(sh, add(ft, [0, (o.tucked ? 0.12 : 0.055) * s, 0]), 0.056 * s, (o.flare ? 0.052 : 0.048) * s), 'shin' + side, 0.02 * s));
    if (o.cargo) pr.push(T(P.box(add(lerp3(th, sh, 0.55), [0.06 * sx * s, 0, 0.01 * s]), [0.012 * s, 0.05 * s, 0.045 * s], 0.008 * s), 'thigh' + side, 0.012 * s));
  }
  pr.push(OP(P.plane([0, 1.065 * s, 0], [0, 1, 0]), 'inter', 0.004 * s));
  // fabric bunching at knees and ankles
  const disp = (x, y, z) => {
    let d = 0;
    const ky = J.shinL[1];
    const kn = Math.exp(-(((y - ky) / (0.05 * s)) ** 2));
    d += kn * 0.0025 * Math.sin(y * 260 + x * 40) * (z < 0 ? 1 : 0.4);
    const an = Math.exp(-(((y - 0.13 * s) / (0.05 * s)) ** 2));
    d += an * 0.003 * Math.sin(y * 300 + Math.atan2(z, x) * 3);
    const hip = Math.exp(-(((y - 0.86 * s) / (0.05 * s)) ** 2));
    d += hip * 0.0012 * Math.sin(x * 120 + y * 90);
    return d;
  };
  return [{
    name: 'pants', prims: pr, material: mat, res: 0.0058 * s, softness: 0.035 * s, disp,
    after: (m, sc, chr) => {
      const seamMat = o.seamMat || mat;
      const prims = pr.filter((p) => !p.op);
      for (const [side, sx] of [['L', 1], ['R', -1]]) {
        const th = J['thigh' + side], sh = J['shin' + side];
        // outer side seam
        const pts = [];
        for (let i = 0; i <= 8; i++) { const t = i / 8; const c = lerp3(add(th, [0, 0.06 * s, 0]), add(J['foot' + side], [0, 0.08 * s, 0]), t); pts.push([c[0] + 0.12 * sx * s, c[1], c[2]]); }
        attachDetail(chr, stitches(sc, pts, { spacing: 0.007 * s, len: 0.004 * s, radius: 0.0008 }), o.stitchMat, prims, 'stitch', 0.03);
        attachDetail(chr, surfaceTube(sc, pts, { radius: 0.0016 * s, samples: 30 }), seamMat, prims, 'seam', 0.03);
        // front pocket opening curve
        const pk = [];
        for (let i = 0; i <= 6; i++) { const t = i / 6; pk.push([(0.07 + t * 0.07) * sx * s, (1.04 - t * t * 0.1) * s, 0.15 * s]); }
        attachDetail(chr, surfaceTube(sc, pk, { radius: 0.002 * s, samples: 14 }), seamMat, prims, 'pocket', 0.03);
        attachDetail(chr, stitches(sc, pk.map((p) => [p[0] - 0.006 * sx, p[1] - 0.005, p[2]]), { spacing: 0.006 * s, radius: 0.0007 }), o.stitchMat, prims, 'stitch', 0.03);
      }
      // waistband line + belt loops
      const wb = [];
      for (let i = 0; i <= 40; i++) { const a = (i / 40) * Math.PI * 2; wb.push([Math.cos(a) * 0.17 * s, 1.03 * s, Math.sin(a) * 0.13 * s]); }
      attachDetail(chr, stitches(sc, wb, { spacing: 0.006 * s, radius: 0.0007 }), o.stitchMat, prims, 'stitch', 0.03);
    },
  }];
}

// ---------------------------------------------------------------------------
// hair generation helpers
// ---------------------------------------------------------------------------
function scalpSampler(ch, hc, hs, accept, n, rng = Math.random) {
  // uniform points on the cranium ellipsoid surface (head-local)
  const out = [];
  let guard = 0;
  while (out.length < n && guard++ < n * 60) {
    const u = rng() * 2 - 1, th = rng() * Math.PI * 2, r = Math.sqrt(1 - u * u);
    const nrm = [r * Math.cos(th), u, r * Math.sin(th)];
    const p = [nrm[0] * 0.08, 0.022 + nrm[1] * 0.093, -0.012 + nrm[2] * 0.1];
    if (!accept(p, nrm)) continue;
    out.push({ p, n: norm([nrm[0] / 0.08, nrm[1] / 0.093, nrm[2] / 0.1]) });
  }
  return out;
}
const W = (hc, hs, p) => [hc[0] + p[0] * hs, hc[1] + p[1] * hs, hc[2] + p[2] * hs];

function capSculpt(hc, hs, hairline, extra = 0.004) {
  const sc = new Sculpt();
  sc.add(P.ellipsoid(W(hc, hs, [0, 0.022, -0.012]), [(0.077 + extra) * hs, (0.09 + extra) * hs, (0.097 + extra) * hs]), 0);
  sc.inter(P.plane(W(hc, hs, hairline.c), hairline.n), 0.006 * hs);
  for (const sx of [1, -1]) sc.sub(P.sphere(W(hc, hs, [0.04 * sx, 0.07, 0.1]), 0.022 * hs), 0.01 * hs);
  const b = { min: [hc[0] - 0.1 * hs, hc[1] - 0.09 * hs, hc[2] - 0.13 * hs], max: [hc[0] + 0.1 * hs, hc[1] + 0.13 * hs, hc[2] + 0.11 * hs] };
  return { sc, b };
}

// ---------------------------------------------------------------------------
// KAI VOSS — courier, late 20s. Charcoal technical jacket, dark denim,
// worn sneakers, fingerless driving gloves, the Anchor on his left wrist.
// ---------------------------------------------------------------------------
export const KAI = {
  name: 'Kai',
  skin: 0xbf957e,
  body: { height: 1.8, shoulder: 1.05, hipWidth: 1, armAngle: 40, headScale: 1.0 },
  face: { width: 1, jawWidth: 1.08, chinWidth: 1.18, brow: 1.15, noseLength: 1.05, noseWidth: 1.02, lipWidth: 1, lipFull: 0.9, neck: 1.08, adam: true, stubble: 0.32, stubbleColor: 0x3a2e2a, iris: 0x6a8aa8, browColor: 0x231812, browThick: 1.6, lipColor: 0xa86a5e, flush: 0xc97b68 },
  gloves: null,
  outfit(ch) {
    const s = 1;
    const jacket = clothMaterial('leather_dark', { color: 0x6c7a80, scale: 6, normal: 0.9 });
    const lining = clothMaterial('jersey', { color: 0xc8692a, scale: 10 });
    const seamMat = clothMaterial('leather_dark', { color: 0x3c3f3c, scale: 10 });
    const stitch = clothMaterial(null, { color: 0x8c8a80, roughness: 0.8 });
    const metal = new THREE.MeshStandardMaterial({ color: 0x9a9c9e, metalness: 1, roughness: 0.32 });
    const denim = clothMaterial('denim', { color: 0x6a7890, scale: 9, normal: 1.2 });
    const shirt = clothMaterial('jersey', { color: 0x2c2f33, scale: 12 });
    ch.def.gloves = clothMaterial('leather_brown', { color: 0x4a3a30, scale: 14 });

    const J = ch.J;
    const tp = torsoPrims(ch);
    // flaps on the chest: positioned on the actual surface
    const flaps = [];
    for (const sx of [1, -1]) {
      const sp = findSurface(tp, 0.085 * sx, 1.335);
      if (sp) flaps.push(T(P.box([sp[0], sp[1], sp[2] + 0.002], [0.042, 0.027, 0.006], 0.004, { rot: [-0.18, 0.32 * sx, 0] }), 'chest', 0.006));
    }
    const prims = [
      ...tp, ...flaps,
      T(P.torus([0, 1.505, 0.0], 0.068, 0.012, { sy: 2.6, sz: 0.92 }), 'chest', 0.012),
      T(P.torus([0, 0.945, 0.0], 1, 0.011, { sx: 0.152, sz: 0.104, sy: 1.4 }), 'hips', 0.008),
      OP(P.plane([0, 0.925, 0], [0, -1, 0]), 'inter', 0.004),
      OP(P.capsule([0, 1.43, 0.0], [0, 1.75, 0.01], 0.057), 'sub', 0.004),
      OP(P.box([0, 1.56, 0.1], [0.012, 0.05, 0.05], 0.002, { rot: [0.3, 0, 0] }), 'sub', 0.006),
    ];
    const wrinkle = (x, y, z) => {
      let d = 0;
      for (const side of ['L', 'R']) {
        const e = J['forearm' + side];
        const dd = Math.hypot(x - e[0], y - e[1], z - e[2]);
        if (dd < 0.09) d += (1 - dd / 0.09) * 0.003 * Math.sin((x * 0.6 + y) * 220);
        const w = J['hand' + side];
        const dw = Math.hypot(x - w[0], y - w[1], z - w[2]);
        if (dw < 0.12 && dw > 0.03) d += (1 - dw / 0.12) * 0.0022 * Math.sin(dw * 300);
      }
      // waist gathering above the hem
      if (y < 1.0 && y > 0.94) d += 0.0015 * Math.sin(Math.atan2(z, x) * 22) * (1 - Math.abs(y - 0.97) / 0.03);
      // back folds
      if (z < -0.05 && y > 1.1 && y < 1.4) d += 0.0012 * Math.sin(y * 70 + x * 30);
      return d;
    };
    const pieces = [];
    pieces.push({
      name: 'jacket', prims, material: jacket, res: 0.0062, softness: 0.03, disp: wrinkle,
      after: (m, sc, c) => {
        const wp = prims.filter((p) => !p.op);
        // zipper from hem to collar
        const zp = [];
        for (let i = 0; i <= 12; i++) { const y = 0.935 + i * (0.6 / 12); const hit = raySurface(sc, [0, y, 0.3], [0, 0, -1], 0.5); if (hit) zp.push(hit); }
        if (zp.length > 3) attachDetail(c, zipper(sc, zp, { teeth: 90, sliderAt: 0.93 }), metal, wp, 'zipper');
        // placket seams either side of the zipper
        for (const sx of [1, -1]) attachDetail(c, stitches(sc, zp.map((p) => [p[0] + 0.011 * sx, p[1], p[2]]), { spacing: 0.006, radius: 0.0007 }), stitch, wp, 'stitch');
        // shoulder seams, armholes, side seams, yoke
        for (const [side, sx] of [['L', 1], ['R', -1]]) {
          const ua = J['upperArm' + side], d = J['armDir' + side];
          attachDetail(c, surfaceTube(sc, [[0.07 * sx, 1.53, -0.01], [0.14 * sx, 1.5, -0.015], [0.2 * sx, 1.49, -0.02]], { radius: 0.0018, samples: 16 }), seamMat, wp, 'seam');
          const ring = [], up = [0, 0, 1], side2 = norm([d[1], -d[0], 0].map((v) => v * sx));
          const ctr = add(ua, mul(d, 0.03));
          for (let i = 0; i <= 20; i++) { const a = (i / 20) * Math.PI * 2; ring.push(add(ctr, add(mul(up, Math.cos(a) * 0.08), mul(side2, Math.sin(a) * 0.08)))); }
          attachDetail(c, surfaceTube(sc, ring, { radius: 0.0018, samples: 40 }), seamMat, wp, 'seam');
          attachDetail(c, stitches(sc, ring.map((p) => add(p, mul(d, 0.008))), { spacing: 0.006, radius: 0.0007 }), stitch, wp, 'stitch');
          const sideSeam = [[0.16 * sx, 1.34, -0.02], [0.16 * sx, 1.2, -0.02], [0.17 * sx, 1.05, -0.02], [0.17 * sx, 0.94, -0.02]];
          attachDetail(c, surfaceTube(sc, sideSeam, { radius: 0.0016, samples: 20 }), seamMat, wp, 'seam');
          // chest yoke
          attachDetail(c, surfaceTube(sc, [[0.015 * sx, 1.405, 0.2], [0.09 * sx, 1.41, 0.2], [0.17 * sx, 1.42, 0.1]], { radius: 0.0016, samples: 16 }), seamMat, wp, 'seam');
          attachDetail(c, stitches(sc, [[0.015 * sx, 1.398, 0.2], [0.09 * sx, 1.403, 0.2], [0.17 * sx, 1.413, 0.1]], { spacing: 0.006, radius: 0.0007 }), stitch, wp, 'stitch');
          // reflective accent strip on the sleeve
          const fa = J['forearm' + side];
          const strip = [];
          for (let i = 0; i <= 16; i++) { const a = (i / 16) * Math.PI * 2; strip.push(add(lerp3(ua, fa, 0.55), add(mul(up, Math.cos(a) * 0.08), mul(side2, Math.sin(a) * 0.08)))); }
          attachDetail(c, surfaceTube(sc, strip, { radius: 0.0035, samples: 40, radial: 4 }), new THREE.MeshStandardMaterial({ color: 0xc8692a, roughness: 0.5 }), wp, 'accent');
        }
      },
    });
    // collar lining (visible orange inner band)
    pieces.push({ name: 'lining', prims: [T(P.torus([0, 1.51, 0.0], 0.06, 0.006, { sy: 3.2, sz: 0.9 }), 'chest', 0), OP(P.capsule([0, 1.4, 0.0], [0, 1.75, 0.01], 0.054), 'sub', 0.002)], material: lining, res: 0.0035, softness: 0.03 });
    // t-shirt neckline
    pieces.push({ name: 'shirt', prims: [T(P.torus([0, 1.46, 0.02], 0.058, 0.009, { sy: 1.2, sz: 0.95 }), 'chest', 0), T(P.ellipsoid([0, 1.4, 0.03], [0.07, 0.05, 0.05]), 'chest', 0.01), OP(P.capsule([0, 1.4, 0.0], [0, 1.75, 0.0], 0.051), 'sub', 0.003)], material: shirt, res: 0.004, softness: 0.03 });
    pieces.push(...pantsPieces(ch, denim, { stitchMat: clothMaterial(null, { color: 0xb08a4a, roughness: 0.8 }), seamMat: clothMaterial('denim', { color: 0x58647a, scale: 9 }) }));
    const upperMat = clothMaterial('leather_brown', { color: 0x9a9a96, scale: 18, normal: 0.8 });
    const soleMat = clothMaterial(null, { color: 0xd8cdb5, roughness: 0.85 });
    const laceMat = clothMaterial(null, { color: 0xe6e2da, roughness: 0.9 });
    pieces.push(...addShoes(ch, upperMat, soleMat, laceMat));
    return pieces;
  },
  hair(ch, hc, hs) {
    // Sculpted short hair: a volume over the scalp with a swept quiff and
    // displacement grooves along the comb direction, plus a fringe of clumps.
    const sc = new Sculpt();
    sc.add(P.ellipsoid(W(hc, hs, [0, 0.026, -0.014]), [0.0835 * hs, 0.098 * hs, 0.1035 * hs]), 0);
    sc.add(P.ellipsoid(W(hc, hs, [-0.006, 0.083, 0.02]), [0.06 * hs, 0.03 * hs, 0.07 * hs], { rot: [0.25, 0, 0.08] }), 0.03 * hs);
    sc.add(P.ellipsoid(W(hc, hs, [0, 0.07, -0.05]), [0.07 * hs, 0.04 * hs, 0.06 * hs]), 0.03 * hs);
    // hairline: forehead, temples, around the ears and nape
    sc.inter(P.plane(W(hc, hs, [0, 0.068, 0.08]), [0, -1, 0.75]), 0.008 * hs);
    for (const sx of [1, -1]) {
      sc.sub(P.sphere(W(hc, hs, [0.047 * sx, 0.078, 0.095]), 0.026 * hs), 0.012 * hs);
      sc.sub(P.ellipsoid(W(hc, hs, [0.085 * sx, -0.012, 0.0]), [0.03 * hs, 0.042 * hs, 0.03 * hs]), 0.01 * hs);
      // short faded sides
      sc.sub(P.ellipsoid(W(hc, hs, [0.105 * sx, 0.01, -0.02]), [0.022 * hs, 0.06 * hs, 0.08 * hs]), 0.02 * hs);
    }
    sc.inter(P.plane(W(hc, hs, [0, -0.05, 0]), [0, -1, 0]), 0.01 * hs);
    const c0 = W(hc, hs, [0, 0.0, 0]);
    sc.disp((x, y, z) => {
      const lx = (x - c0[0]) / hs, ly = (y - c0[1]) / hs, lz = (z - c0[2]) / hs;
      // strands run front→back: grooves vary across the head (around Z)
      const a = Math.atan2(lx + 0.01 * Math.sin(lz * 60), ly + 0.03);
      const g = Math.sin(a * 34 + lz * 25) * 0.0016 + Math.sin(a * 79 + lz * 9) * 0.0007;
      return g * hs * Math.min(1, Math.max(0, ly / 0.04));
    });
    const b = { min: [hc[0] - 0.11 * hs, hc[1] - 0.07 * hs, hc[2] - 0.13 * hs], max: [hc[0] + 0.11 * hs, hc[1] + 0.14 * hs, hc[2] + 0.12 * hs] };
    const clumps = [];
    return { color: 0x2b1f18, cap: sc, capBounds: b, clumps, capRes: 0.0032 };
  },
  accessories(ch) { addAnchor(ch, 'L'); },
};

/** The Anchor: a segmented wrist device with a glowing core ring. */
export function addAnchor(ch, side) {
  const g = new THREE.Group();
  const s = ch.def.body.height / 1.8;
  const steel = new THREE.MeshStandardMaterial({ color: 0x6d7378, metalness: 1, roughness: 0.38 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1b1e21, metalness: 0.6, roughness: 0.5 });
  const glow = new THREE.MeshStandardMaterial({ color: 0x0b2a30, emissive: 0x4fe3ff, emissiveIntensity: 2.4, roughness: 0.2 });
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.043 * s, 0.045 * s, 0.032 * s, 28, 1, true), dark);
  band.material.side = THREE.DoubleSide; g.add(band);
  for (let i = 0; i < 10; i++) {
    const seg = new THREE.Mesh(new THREE.BoxGeometry(0.02 * s, 0.03 * s, 0.006 * s), steel);
    const a = (i / 10) * Math.PI * 2;
    seg.position.set(Math.cos(a) * 0.047 * s, 0, Math.sin(a) * 0.047 * s); seg.rotation.y = -a + Math.PI / 2;
    g.add(seg);
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.047 * s, 0.0022 * s, 6, 48), glow); ring.rotation.x = Math.PI / 2; ring.position.y = 0.017 * s; g.add(ring);
  const ring2 = ring.clone(); ring2.position.y = -0.017 * s; g.add(ring2);
  const core = new THREE.Group();
  const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.016 * s, 0.018 * s, 0.012 * s, 24), steel);
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.011 * s, 0.011 * s, 0.013 * s, 24), glow);
  housing.rotation.x = lens.rotation.x = Math.PI / 2;
  core.add(housing, lens);
  for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.0015 * s, 0.0015 * s, 0.004 * s, 6), steel); b.rotation.x = Math.PI / 2; b.position.set(Math.cos(i * 1.57 + 0.78) * 0.0145 * s, Math.sin(i * 1.57 + 0.78) * 0.0145 * s, 0.006 * s); core.add(b); }
  core.position.set(0, 0, 0.05 * s); g.add(core);
  // orient: band axis along the forearm, core facing the back of the hand
  const fa = V(...ch.J['forearm' + side]), ha = V(...ch.J['hand' + side]);
  const d = ha.clone().sub(fa).normalize();
  g.quaternion.setFromUnitVectors(V(0, 1, 0), d);
  const pos = fa.clone().lerp(ha, 0.8);
  g.position.copy(pos).sub(V(...ch.worldRest['forearm' + side]));
  ch.bones['forearm' + side].add(g);
  // light so the device actually illuminates nearby surfaces in the dark
  const light = new THREE.PointLight(0x4fe3ff, 0.25, 0.8, 2);
  light.position.set(0, 0, 0.06 * s); g.add(light);
  ch.anchor = { group: g, glow, light };
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// ---------------------------------------------------------------------------
// SERA LIND — ATLAS field technician. Teal-grey utility jacket with rolled
// sleeves, harness, cargo trousers, work boots, low auburn ponytail.
// ---------------------------------------------------------------------------
export const SERA = {
  name: 'Sera',
  skin: 0xe0b196,
  body: { height: 1.69, shoulder: 0.9, hipWidth: 1.06, armAngle: 38, headScale: 1.02, handScale: 0.92 },
  face: { width: 0.95, jawWidth: 0.88, chinWidth: 0.85, chinLength: 0.95, brow: 0.75, noseLength: 0.9, noseWidth: 0.88, lipWidth: 0.96, lipFull: 1.22, neck: 0.84, freckles: true, iris: 0x6f8048, browColor: 0x4a2a1c, browThick: 0.95, browArch: 1, lipColor: 0xb4605a, flush: 0xd9826f, lashColor: 0x120c0a },
  outfit(ch) {
    const s = ch.def.body.height / 1.8;
    const jacketMat = clothMaterial('linen', { color: 0x54706f, scale: 9, normal: 1.1, sheen: 0.4, sheenColor: 0x9ab8b4 });
    const seamMat = clothMaterial('linen', { color: 0x40585a, scale: 9 });
    const stitch = clothMaterial(null, { color: 0xc9c3a8, roughness: 0.8 });
    const pantsMat = clothMaterial('fleece', { color: 0x3a3a36, scale: 10, normal: 0.6 });
    const strap = clothMaterial('leather_dark', { color: 0x2a2a2c, scale: 14 });
    const metal = new THREE.MeshStandardMaterial({ color: 0xb0b2b4, metalness: 1, roughness: 0.3 });
    const J = ch.J;
    const tp = torsoPrims(ch, { fem: true, rolled: true, sleeve: 0.054 });
    const prims = [
      ...tp,
      T(P.torus([0, 1.505 * s, 0.0], 0.062 * s, 0.009 * s, { sy: 2.2, sz: 0.9 }), 'chest', 0.01 * s),
      OP(P.plane([0, 0.93 * s, 0], [0, -1, 0]), 'inter', 0.004),
      OP(P.capsule([0, 1.43 * s, 0.0], [0, 1.75 * s, 0.01], 0.052 * s), 'sub', 0.004),
      OP(P.box([0, 1.5 * s, 0.1 * s], [0.02 * s, 0.08 * s, 0.05 * s], 0.002, { rot: [0.25, 0, 0] }), 'sub', 0.008),
    ];
    const pieces = [{
      name: 'jacket', prims, material: jacketMat, res: 0.005 * s, softness: 0.028 * s,
      disp: (x, y, z) => (y < 1.0 * s ? 0.0015 * Math.sin(Math.atan2(z, x) * 18) : 0) + (z < -0.05 ? 0.001 * Math.sin(y * 80) : 0),
      after: (m, sc, c) => {
        const wp = prims.filter((p) => !p.op);
        const zp = [];
        for (let i = 0; i <= 10; i++) { const y = (0.94 + i * 0.045) * s; const hit = raySurface(sc, [0, y, 0.3], [0, 0, -1], 0.5); if (hit) zp.push(hit); }
        if (zp.length > 3) attachDetail(c, zipper(sc, zp, { teeth: 70, sliderAt: 0.92 }), metal, wp, 'zipper');
        // harness: two straps over the shoulders crossing to a chest buckle
        for (const sx of [1, -1]) {
          const pts = [[0.09 * sx * s, 1.5 * s, -0.08 * s], [0.1 * sx * s, 1.52 * s, 0.0], [0.08 * sx * s, 1.42 * s, 0.12 * s], [0.02 * sx * s, 1.3 * s, 0.14 * s], [0.08 * sx * s, 1.1 * s, 0.12 * s]];
          attachDetail(c, surfaceTube(sc, pts, { radius: 0.0055 * s, lift: 0.003, samples: 40, radial: 4 }), strap, wp, 'strap');
          attachDetail(c, surfaceTube(sc, [[0.06 * sx * s, 1.25 * s, -0.12 * s], [0.12 * sx * s, 1.05 * s, -0.08 * s], [0.16 * sx * s, 1.05 * s, 0.02]], { radius: 0.005 * s, lift: 0.003, samples: 20, radial: 4 }), strap, wp, 'strap');
          attachDetail(c, surfaceTube(sc, [[0.07 * sx * s, 1.53 * s, -0.01 * s], [0.18 * sx * s, 1.5 * s, -0.02 * s]], { radius: 0.0016, samples: 12 }), seamMat, wp, 'seam');
          attachDetail(c, stitches(sc, zp.map((p) => [p[0] + 0.012 * sx, p[1], p[2]]), { spacing: 0.006, radius: 0.0007 }), stitch, wp, 'stitch');
        }
        const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.03 * s, 0.025 * s, 0.008 * s), metal);
        const bp = project(sc, [0, 1.3 * s, 0.2], 0.008);
        buckle.position.copy(bp.p).sub(V(...c.worldRest.chest)); c.bones.chest.add(buckle);
        // ATLAS patch on the left sleeve
        const patch = new THREE.Mesh(new THREE.CircleGeometry(0.022 * s, 24), new THREE.MeshStandardMaterial({ map: patchTexture(), roughness: 0.8 }));
        const pp = project(sc, lerp3(J.upperArmL, J.forearmL, 0.35).map((v, i) => v + (i === 0 ? 0.06 : i === 2 ? 0.02 : 0)), 0.0015);
        patch.position.copy(pp.p).sub(V(...c.worldRest.upperArmL));
        patch.lookAt(pp.p.clone().add(pp.n)); patch.quaternion.premultiply(new THREE.Quaternion());
        c.bones.upperArmL.add(patch); patch.position.copy(pp.p).sub(V(...c.worldRest.upperArmL));
      },
    }];
    // bare forearms below the rolled sleeves
    for (const [side] of [['L'], ['R']]) {
      const fa = J['forearm' + side], ha = J['hand' + side];
      pieces.push({ name: 'arm' + side, prims: [T(P.capsule(lerp3(fa, ha, 0.3), lerp3(fa, ha, 1.0), 0.038 * s, 0.025 * s), 'forearm' + side, 0)], material: ch.skinMat, res: 0.004 * s, softness: 0.02,
        color: (x, y, z, c) => c.set(ch.def.skin) });
    }
    pieces.push(...pantsPieces(ch, pantsMat, { cargo: true, tucked: true, stitchMat: stitch, seamMat: pantsMat }));
    const boot = clothMaterial('leather_brown', { color: 0x6b4a34, scale: 16 });
    const sole = clothMaterial(null, { color: 0x1e1c1a, roughness: 0.9 });
    pieces.push(...addShoes(ch, boot, sole, clothMaterial(null, { color: 0x2a2018, roughness: 0.9 }), { boot: true }));
    return pieces;
  },
  hair(ch, hc, hs) {
    const hairline = { c: [0, 0.055, 0.088], n: [0, -1, 0.62] };
    const { sc, b } = capSculpt(hc, hs, hairline, 0.004);
    const tie = [0, -0.035, -0.105];
    const clumps = [];
    const accept = (p) => (p[1] - 0.055) - 0.62 * (p[2] - 0.088) > 0.003;
    for (const { p, n } of scalpSampler(ch, hc, hs, accept, 420)) {
      // middle part: strands flow sideways away from x=0, then back to the tie
      const sx = p[0] >= 0 ? 1 : -1;
      const toTie = norm([tie[0] - p[0], tie[1] - p[1], tie[2] - p[2]]);
      const dist = Math.hypot(tie[0] - p[0], tie[1] - p[1], tie[2] - p[2]);
      clumps.push({ root: W(hc, hs, mul(p, 0.985)), dir: norm(add(mul(n, 0.5), add([0.5 * sx, 0, 0], toTie))), len: dist * 1.05 * hs, width: (0.006 + Math.random() * 0.003) * hs, flat: 0.3, droop: 0.05, towards: toTie, pull: 0.9, segs: 8, side: [0, 1, 0] });
    }
    // face-framing loose strands
    for (const sx of [1, -1]) for (let i = 0; i < 5; i++) {
      clumps.push({ root: W(hc, hs, [0.045 * sx + i * 0.004 * sx, 0.065 - i * 0.004, 0.07]), dir: [0.3 * sx, -0.4, 0.4], len: (0.1 + Math.random() * 0.03) * hs, width: 0.004 * hs, flat: 0.3, droop: 0.5, curl: 0.6 * sx, segs: 8, side: [0, 0, 1] });
    }
    return {
      color: 0x5a2b1c, spec: 0.6, cap: sc, capBounds: b, clumps, scalp: { c: V(...W(hc, hs, [0, 0.022, -0.012])), r: 0.084 * hs },
      tail: (c, mat) => ponytail(c, hc, hs, tie, mat),
    };
  },
};

function patchTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#1b2a2c'; g.beginPath(); g.arc(64, 64, 62, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#d7c79a'; g.lineWidth = 4; g.beginPath(); g.arc(64, 64, 54, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#d7c79a'; g.font = 'bold 30px sans-serif'; g.textAlign = 'center'; g.fillText('ATLAS', 64, 75);
  g.strokeStyle = '#4fe3ff'; g.lineWidth = 2; g.beginPath(); g.arc(64, 64, 36, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/** Ponytail: strand clumps skinned to a 3-bone spring chain. */
function ponytail(ch, hc, hs, tie, mat) {
  const base = W(hc, hs, tie);
  const bones = [];
  let parent = ch.bones.head, parentW = ch.worldRest.head;
  const L = 0.07 * hs;
  for (let i = 0; i < 3; i++) {
    const b = new THREE.Bone(); b.name = 'tail' + i;
    const pw = [base[0], base[1] - i * L, base[2] - 0.01 * i];
    b.position.set(pw[0] - parentW[0], pw[1] - parentW[1], pw[2] - parentW[2]);
    parent.add(b); bones.push(b); parent = b; parentW = pw;
  }
  const clumps = [];
  for (let i = 0; i < 70; i++) {
    const a = Math.random() * Math.PI * 2, r = Math.random() * 0.012 * hs;
    clumps.push({ root: [base[0] + Math.cos(a) * r, base[1] + 0.005, base[2] + Math.sin(a) * r * 0.6], dir: [Math.cos(a) * 0.15, -1, -0.15], len: (0.17 + Math.random() * 0.06) * hs, width: 0.006 * hs, flat: 0.5, droop: 0.1, curl: (Math.random() - 0.5) * 0.8, segs: 9, side: [1, 0, 0] });
  }
  const geo = makeTailGeo(clumps);
  // weights by height along the chain
  const pos = geo.attributes.position.array, n = pos.length / 3;
  const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
  const idx = bones.map((b) => ch.boneList.length + bones.indexOf(b));
  for (let i = 0; i < n; i++) {
    const t = Math.min(2.999, Math.max(0, (base[1] - pos[i * 3 + 1]) / L));
    const k = Math.floor(t), f = t - k;
    si[i * 4] = idx[k]; sw[i * 4] = 1 - f; si[i * 4 + 1] = idx[Math.min(2, k + 1)]; sw[i * 4 + 1] = f;
  }
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  // tie band
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.012 * hs, 0.004 * hs, 6, 16), new THREE.MeshStandardMaterial({ color: 0x1d2a2c, roughness: 0.7 }));
  band.rotation.x = Math.PI / 2; band.position.set(0, 0.002, 0); bones[0].add(band);
  return { bones, geo, mat };
}

import { hairClumps } from './humanoid.js';
function makeTailGeo(clumps) { return hairClumps({ clumps }); }

// ---------------------------------------------------------------------------
// DR. EDA VENN — ATLAS director. Long lab coat over a black turtleneck,
// silver hair in a severe bun, thin metal glasses.
// ---------------------------------------------------------------------------
export const VENN = {
  name: 'Venn',
  skin: 0xd7b39f,
  body: { height: 1.71, shoulder: 0.92, hipWidth: 1.02, armAngle: 36, headScale: 1.0, handScale: 0.92 },
  face: { width: 0.94, jawWidth: 0.9, chinWidth: 0.9, chinLength: 1.04, brow: 0.9, noseLength: 1.12, noseWidth: 0.92, lipWidth: 0.95, lipFull: 0.78, neck: 0.86, iris: 0x55473a, browColor: 0x8c8580, browThick: 0.8, browArch: 0.6, lipColor: 0xa66b66, flush: 0xc78a7a },
  outfit(ch) {
    const s = ch.def.body.height / 1.8;
    const coat = clothMaterial('linen', { color: 0xffffff, scale: 10, normal: 0.5 }); coat.color.setRGB(1.25, 1.25, 1.3);
    const turtle = clothMaterial('fleece', { color: 0x1d1d20, scale: 12, normal: 0.8 });
    const J = ch.J;
    const tp = torsoPrims(ch, { fem: true, sleeve: 0.06 });
    const skirt = [];
    for (const sx of [1, -1]) skirt.push(T(P.capsule([0.08 * sx * s, 0.98 * s, 0], [0.12 * sx * s, 0.52 * s, -0.01 * s], 0.11 * s, 0.11 * s), 'thigh' + (sx > 0 ? 'L' : 'R'), 0.06 * s));
    const prims = [...tp, ...skirt,
      T(P.box([0.07 * s, 1.36 * s, 0.11 * s], [0.03 * s, 0.11 * s, 0.006 * s], 0.004, { rot: [0.0, 0.0, 0.3] }), 'chest', 0.008),
      T(P.box([-0.07 * s, 1.36 * s, 0.11 * s], [0.03 * s, 0.11 * s, 0.006 * s], 0.004, { rot: [0.0, 0.0, -0.3] }), 'chest', 0.008),
      OP(P.plane([0, 0.5 * s, 0], [0, -1, 0]), 'inter', 0.004),
      OP(P.capsule([0, 1.4 * s, 0.03], [0, 1.75 * s, 0.03], 0.06 * s), 'sub', 0.006),
      OP(P.box([0, 0.75 * s, 0.14 * s], [0.006 * s, 0.24 * s, 0.05 * s], 0.002), 'sub', 0.004),
    ];
    const pieces = [{ name: 'coat', prims, material: coat, res: 0.0058 * s, softness: 0.04 * s, disp: (x, y, z) => (y < 0.95 * s ? 0.003 * Math.sin(Math.atan2(z, x) * 9 + y * 6) : 0) }];
    pieces.push({ name: 'turtleneck', prims: [T(P.capsule([0, 1.43 * s, 0.0], [0, 1.53 * s, -0.005], 0.06 * s, 0.056 * s), 'neck', 0), T(P.ellipsoid([0, 1.38 * s, 0.03 * s], [0.09 * s, 0.06 * s, 0.07 * s]), 'chest', 0.02), OP(P.capsule([0, 1.45 * s, 0.0], [0, 1.75 * s, 0.0], 0.049 * s), 'sub', 0.003)], material: turtle, res: 0.004 * s, softness: 0.03, disp: (x, y) => 0.0015 * Math.sin(y * 260) });
    pieces.push(...pantsPieces(ch, clothMaterial('fleece', { color: 0x26272b, scale: 12, normal: 0.5 }), { stitchMat: clothMaterial(null, { color: 0x333338 }), seamMat: clothMaterial(null, { color: 0x222226 }) }).map((p) => { p.prims = p.prims.filter((q) => !(q.bone && q.bone.startsWith('hips') && !q.op)); p.prims.push(OP(P.plane([0, 0.6 * s, 0], [0, 1, 0]), 'inter', 0.004)); p.after = null; return p; }));
    pieces.push(...addShoes(ch, clothMaterial('leather_dark', { color: 0x1a1a1c, scale: 16 }), clothMaterial(null, { color: 0x111111 }), clothMaterial(null, { color: 0x111111 })));
    return pieces;
  },
  hair(ch, hc, hs) {
    const hairline = { c: [0, 0.058, 0.086], n: [0, -1, 0.66] };
    const { sc, b } = capSculpt(hc, hs, hairline, 0.0035);
    const bun = [0, 0.06, -0.1];
    const clumps = [];
    const accept = (p) => (p[1] - 0.058) - 0.66 * (p[2] - 0.086) > 0.003;
    for (const { p, n } of scalpSampler(ch, hc, hs, accept, 300)) {
      const to = norm([bun[0] - p[0], bun[1] - p[1], bun[2] - p[2]]);
      clumps.push({ root: W(hc, hs, mul(p, 0.99)), dir: norm(add(mul(n, 0.3), to)), len: Math.hypot(bun[0] - p[0], bun[1] - p[1], bun[2] - p[2]) * hs, width: 0.0055 * hs, flat: 0.3, droop: 0.0, towards: to, pull: 1, segs: 7, side: [0, 1, 0] });
    }
    // the bun: coiled clumps
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 6, r = 0.012 + (i / 60) * 0.018;
      clumps.push({ root: W(hc, hs, [bun[0] + Math.cos(a) * r, bun[1] + Math.sin(a) * r, bun[2] - 0.012]), dir: [-Math.sin(a), Math.cos(a), -0.2], len: 0.05 * hs, width: 0.008 * hs, flat: 0.5, droop: 0, curl: 1.5, segs: 6, side: [0, 0, 1] });
    }
    return { color: 0xa7a29c, spec: 0.7, cap: sc, capBounds: b, clumps, scalp: { c: V(...W(hc, hs, [0, 0.022, -0.012])), r: 0.082 * hs } };
  },
  accessories(ch) {
    // thin wire glasses
    const hc = ch.headCentre(), hs = 1.71 / 1.8;
    const mat = new THREE.MeshStandardMaterial({ color: 0xc0b8a8, metalness: 1, roughness: 0.25 });
    const lensMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0.95, roughness: 0.02, transparent: true, opacity: 0.2, thickness: 0.002 });
    const g = new THREE.Group();
    for (const sx of [1, -1]) {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.017, 0.0011, 6, 28), mat); rim.scale.y = 0.75;
      rim.position.set(0.032 * sx, 0.008, 0.103); g.add(rim);
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.017, 24), lensMat); lens.scale.y = 0.75; lens.position.copy(rim.position); g.add(lens);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.0009, 0.0009, 0.1, 5), mat); arm.rotation.x = Math.PI / 2; arm.position.set(0.05 * sx, 0.01, 0.055); arm.rotation.z = 0.05 * sx; g.add(arm);
    }
    const bridge = new THREE.Mesh(new THREE.TorusGeometry(0.007, 0.0009, 5, 12, Math.PI), mat); bridge.position.set(0, 0.012, 0.104); g.add(bridge);
    g.scale.setScalar(hs);
    g.position.set(hc[0] - ch.J.head[0], hc[1] - ch.J.head[1], hc[2] - ch.J.head[2]);
    ch.bones.head.add(g);
  },
};

/** Build a character (heavy; call while loading). */
export async function buildCharacter(def) {
  await preloadSets(CAST_TEXTURES);
  const ch = new Humanoid(def);
  ch.build();
  if (ch.tail) {
    // append tail bones to the skeleton and add the skinned ponytail
    const bones = [...ch.boneList, ...ch.tail.bones];
    ch.boneList = bones; ch.tail.bones.forEach((b, i) => (ch.boneIndex[b.name] = ch.boneList.length - 3 + i));
    ch.updateMatrixWorld(true);
    const sk = new THREE.Skeleton(bones);
    ch.skeleton = sk;
    for (const m of ch.meshes) m.bind(sk, new THREE.Matrix4());
    const tail = new THREE.SkinnedMesh(ch.tail.geo, ch.tail.mat); tail.frustumCulled = false; tail.castShadow = true;
    ch.add(tail); tail.bind(sk, new THREE.Matrix4()); ch.meshes.push(tail);
    for (const b of ch.tail.bones) ch.restPose[b.name] = { p: b.position.clone(), q: b.quaternion.clone() };
  }
  return ch;
}

// ---------------------------------------------------------------------------
// THE CLERK — what remains of the night clerk of a version that collapsed.
// Too tall, too thin, uniform immaculate, face smoothed away.
// ---------------------------------------------------------------------------
export const CLERK = {
  name: 'Clerk',
  skin: 0xb8b0a8,
  body: { height: 2.12, shoulder: 0.86, hipWidth: 0.9, armAngle: 24, headScale: 0.92, handScale: 1.15 },
  face: { width: 0.9, jawWidth: 0.85, chinWidth: 0.8, chinLength: 1.25, brow: 1.4, noseLength: 0.35, noseWidth: 0.6, lipWidth: 0.7, lipFull: 0.25, neck: 0.75, iris: 0x111111, browColor: 0x111111, browThick: 0.01, lipColor: 0x9a8a84, flush: 0xa89890 },
  outfit(ch) {
    const s = ch.def.body.height / 1.8;
    const coat = clothMaterial('velvet', { color: 0x4a1418, scale: 9, normal: 0.8, sheen: 0.6, sheenColor: 0x803038 });
    const brass = new THREE.MeshStandardMaterial({ color: 0xc9a14a, metalness: 1, roughness: 0.3 });
    const tp = torsoPrims(ch, { sleeve: 0.05 });
    const prims = [...tp,
      T(P.torus([0, 1.505 * s, 0.0], 0.056 * s, 0.007 * s, { sy: 1.6, sz: 0.9 }), 'chest', 0.008),
      OP(P.plane([0, 0.86 * s, 0], [0, -1, 0]), 'inter', 0.004),
      OP(P.capsule([0, 1.43 * s, 0.03], [0, 1.75 * s, 0.03], 0.05 * s), 'sub', 0.004),
      OP(P.box([0, 1.36 * s, 0.13 * s], [0.03 * s, 0.12 * s, 0.05 * s], 0.002, { rot: [0.0, 0, 0] }), 'sub', 0.01)];
    const pieces = [{ name: 'coat', prims, material: coat, res: 0.0065 * s, softness: 0.035 * s,
      after: (m, sc, c) => {
        for (let i = 0; i < 4; i++) { const p = raySurface(sc, [0.035 * s, (1.3 - i * 0.1) * s, 0.4], [0, 0, -1], 0.6); if (!p) continue; const b = new THREE.Mesh(new THREE.SphereGeometry(0.009 * s, 8, 6), brass); b.position.set(p[0] - c.worldRest.chest[0], p[1] - c.worldRest.chest[1], p[2] - c.worldRest.chest[2] + 0.003); c.bones.chest.add(b); }
      } }];
    pieces.push({ name: 'shirt', prims: [T(P.ellipsoid([0, 1.38 * s, 0.05 * s], [0.06 * s, 0.09 * s, 0.05 * s]), 'chest', 0), T(P.torus([0, 1.47 * s, 0.01], 0.05 * s, 0.006 * s, { sy: 1.4 }), 'neck', 0.004), OP(P.capsule([0, 1.4 * s, 0.0], [0, 1.75 * s, 0.0], 0.046 * s), 'sub', 0.003)], material: clothMaterial('linen', { color: 0xe9e6e0, scale: 14 }), res: 0.004 * s, softness: 0.03 });
    pieces.push(...pantsPieces(ch, clothMaterial('fleece', { color: 0x141416, scale: 12, normal: 0.4 }), { stitchMat: clothMaterial(null, { color: 0x222222 }), seamMat: clothMaterial(null, { color: 0x121212 }) }).map((p) => { p.after = null; return p; }));
    pieces.push(...addShoes(ch, clothMaterial('leather_dark', { color: 0x0e0e10, scale: 16 }), clothMaterial(null, { color: 0x0a0a0a }), clothMaterial(null, { color: 0x0a0a0a })));
    return pieces;
  },
  hair(ch, hc, hs) {
    const sc = new Sculpt();
    sc.add(P.ellipsoid(W(hc, hs, [0, 0.026, -0.016]), [0.081 * hs, 0.094 * hs, 0.1 * hs]), 0);
    sc.inter(P.plane(W(hc, hs, [0, 0.075, 0.08]), [0, -1, 0.7]), 0.006 * hs);
    for (const sx of [1, -1]) sc.sub(P.ellipsoid(W(hc, hs, [0.085 * sx, -0.012, 0.0]), [0.03 * hs, 0.04 * hs, 0.03 * hs]), 0.01 * hs);
    sc.inter(P.plane(W(hc, hs, [0, -0.02, 0]), [0, -1, 0]), 0.01 * hs);
    const c0 = W(hc, hs, [0, 0, 0]);
    sc.disp((x, y, z) => Math.sin(Math.atan2((x - c0[0]) / hs, (y - c0[1]) / hs) * 60) * 0.0005 * hs);
    return { color: 0x0c0b0a, spec: 0.9, cap: sc, capBounds: { min: [hc[0] - 0.11 * hs, hc[1] - 0.05 * hs, hc[2] - 0.13 * hs], max: [hc[0] + 0.11 * hs, hc[1] + 0.13 * hs, hc[2] + 0.12 * hs] }, clumps: [], capRes: 0.0034 };
  },
};
