// The recurring cast: Kai Voss, Sera Lind, Dr. Eda Venn.
import * as THREE from 'three';
import { P, Sculpt } from './sculpt.js';
import { Humanoid, clothMaterial, hairMaterial, lerp3, add, mul, norm, V } from './humanoid.js';
import { surfaceTube, stitches, zipper, raySurface, attachDetail, project } from './details.js';
import { preloadSets } from '../engine/assets.js';
import { POLY_CACHE } from './sculpt.js';
import { warmCache, persistCache } from './cache.js';
import { BlockHumanoid } from './blocks.js';

const MAT_CANVAS = 7; // blocks.js MAT.canvas
export const CAST_TEXTURES = ['leather_dark', 'linen', 'fleece', 'velvet']; // only the Clerk still uses textured cloth

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
  body: { height: 1.8, shoulder: 1.05, hipWidth: 1, armAngle: 40, headScale: 1.2 },
  look: {
    skin: '#c39276', hair: '#2b1f18', hairStyle: 'swept', eyes: '#46657f', stubble: true, browThick: 1.3,
    top: '#3e4542', topMat: MAT_CANVAS, sleeves: 'long', cuff: '#2c302f', pants: '#2c3a52', shoes: '#9a9a96', sole: '#e6e0d2',
    outfit(add, { J, s, sw, C, MAT, rbox, at }) {
      const top = C('#3e4542'), dark = C('#2c302f'), orange = C('#c8692a'), metal = C('#a8acb0');
      add(rbox(0.15, 0.06, 0.14), at([0, J.neck[1] + 0.0, -0.005]), dark, 'chest', MAT.canvas);              // standing collar
      add(rbox(0.13, 0.015, 0.125), at([0, J.neck[1] + 0.03, 0.0]), orange, 'chest', MAT.canvas, 0);          // orange lining
      add(rbox(0.012, 0.42 * s, 0.012), at([0, J.chest[1] - 0.07 * s, 0.108]), metal, 'chest', MAT.metal, 0);  // zip
      for (const x of [-1, 1]) add(rbox(0.085, 0.06, 0.014), at([x * 0.085 * sw, J.chest[1] + 0.05 * s, 0.108]), dark, 'chest', MAT.canvas, 0); // chest pocket flaps
      add(rbox(0.31, 0.045, 0.21), at([0, J.hips[1] + 0.02 * s, 0]), dark, 'hips', MAT.canvas, 0);            // jacket hem band
      for (const sd of ['L', 'R']) { const u = J['upperArm' + sd], f = J['forearm' + sd]; add(rbox(0.108, 0.03, 0.112), at([(u[0] + f[0]) / 2, (u[1] + f[1]) / 2, -0.005], 0, 0, sd === 'L' ? 0.7 : -0.7), orange, 'upperArm' + sd, MAT.canvas, 0); } // reflective band
    },
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
  body: { height: 1.69, shoulder: 0.92, hipWidth: 1.05, armAngle: 38, headScale: 1.2, handScale: 0.92 },
  look: {
    fem: true, skin: '#e0b196', hair: '#5a2b1c', hairStyle: 'framed', ponytail: true, eyes: '#6f8048', freckles: true, browThick: 0.9,
    top: '#54706f', topMat: MAT_CANVAS, sleeves: 'rolled', pants: '#3a3a36', shoes: '#6b4a34', sole: '#1e1c1a', boots: true, build: 0.92,
    outfit(add, { J, s, sw, C, MAT, rbox, at }) {
      const strap = C('#2a2a2c'), metal = C('#b0b2b4');
      add(rbox(0.14, 0.05, 0.13), at([0, J.neck[1] + 0.0, -0.005]), C('#40585a'), 'chest', MAT.canvas);       // collar
      for (const x of [-1, 1]) add(rbox(0.03, 0.32 * s, 0.012), at([x * 0.075 * sw, J.chest[1] + 0.0, 0.112], -0.04, 0, x * 0.12), strap, 'chest', MAT.leather, 0); // harness
      add(rbox(0.22 * sw, 0.028, 0.012), at([0, J.chest[1] - 0.05 * s, 0.112]), strap, 'chest', MAT.leather, 0);
      add(rbox(0.032, 0.03, 0.012), at([0, J.chest[1] - 0.05 * s, 0.12]), metal, 'chest', MAT.metal, 0);    // buckle
      add(rbox(0.05, 0.05, 0.01), at([0.21 * sw, J.chest[1] + 0.06 * s, 0.0], 0, Math.PI / 2, 0), C('#1b2a2c'), 'upperArmL', MAT.canvas, 0); // ATLAS patch
      add(rbox(0.3, 0.04, 0.2), at([0, J.hips[1] + 0.04 * s, 0]), C('#2a221b'), 'hips', MAT.leather, 0);   // belt
      for (const sd of ['L', 'R']) { const t = J['thigh' + sd], k = J['shin' + sd]; add(rbox(0.04, 0.11, 0.1), at([t[0] * 1.55, (t[1] + k[1]) / 2, 0.01]), C('#33332f'), 'thigh' + sd, MAT.canvas); } // cargo pockets
    },
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
  body: { height: 1.71, shoulder: 0.93, hipWidth: 1.0, armAngle: 36, headScale: 1.18, handScale: 0.92 },
  look: {
    fem: true, skin: '#d7b39f', hair: '#a7a29c', hairStyle: 'bun', eyes: '#55473a', glasses: true, browThick: 0.8, headW: 0.95,
    top: '#e9e7e1', sleeves: 'long', cuff: '#d6d3cc', pants: '#26272b', shoes: '#151517', sole: '#111111',
    outfit(add, { J, s, sw, C, MAT, rbox, at }) {
      const coat = C('#e9e7e1'), black = C('#1d1d20');
      add(rbox(0.12, 0.09, 0.12), at([0, J.neck[1] + 0.02, 0]), black, 'neck', MAT.knit);                  // turtleneck
      add(rbox(0.08, 0.2 * s, 0.012), at([0, J.chest[1] - 0.02 * s, 0.108]), black, 'chest', MAT.knit, 0);   // turtleneck between the lapels
      for (const x of [-1, 1]) add(rbox(0.05, 0.22 * s, 0.014), at([x * 0.055, J.chest[1] + 0.0, 0.11], 0, 0, x * 0.2), C('#d8d5ce'), 'chest', MAT.cloth, 0); // lapels
      add(rbox(0.06, 0.08, 0.012), at([0.09 * sw, J.chest[1] - 0.02 * s, 0.112]), C('#1b2b3d'), 'chest', MAT.canvas, 0);      // ATLAS ID badge
      for (const sd of ['L', 'R']) { const t = J['thigh' + sd], k = J['shin' + sd]; add(rbox(0.17, 0.48 * s, 0.2), at([t[0] * 1.05, (t[1] + k[1]) / 2 - 0.02 * s, -0.005]), coat, 'thigh' + sd, MAT.cloth); } // coat skirts
      add(rbox(0.34, 0.12, 0.22), at([0, J.hips[1] - 0.02 * s, 0]), coat, 'hips', MAT.cloth);
    },
  },
};

/** Build a character (heavy; call while loading). */
export async function buildCharacter(def) {
  if (def.look) { const ch = new BlockHumanoid(def); ch.build(); return ch; } // block characters: instant, no textures
  await preloadSets(CAST_TEXTURES);
  await warmCache(def.name);
  POLY_CACHE.used = new Set(); POLY_CACHE.fresh.clear();
  const ch = new Humanoid(def);
  ch.build();
  const used = POLY_CACHE.used; POLY_CACHE.used = null;
  if (POLY_CACHE.fresh.size) persistCache(def.name, used);
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
