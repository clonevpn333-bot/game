// Humanoid builder: skeleton, sculpted head/face/hands/clothing meshes, hair,
// eyes with lids, teeth, and the face rig. Characters face +Z, Y up, metres.
import * as THREE from 'three';
import { P, Sculpt, polygonise, skinWeights } from './sculpt.js';
import { pbr, triplanar } from '../engine/assets.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const norm = (a) => { const l = Math.hypot(...a); return [a[0] / l, a[1] / l, a[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------
export function makeJoints(s) {
  const H = s.height / 1.8; // scale relative to the 1.80 m reference
  const sw = s.shoulder ?? 1, hw = s.hipWidth ?? 1;
  const armA = (s.armAngle ?? 40) * Math.PI / 180;
  const J = {};
  J.root = [0, 0, 0];
  J.hips = [0, 0.98 * H, 0];
  J.spine = [0, 1.1 * H, 0];
  J.chest = [0, 1.3 * H, 0];
  J.neck = [0, 1.49 * H, -0.01 * H];
  J.head = [0, 1.585 * H, 0.005 * H];
  for (const [side, sx] of [['L', 1], ['R', -1]]) {
    J['clavicle' + side] = [0.035 * sx * H, 1.44 * H, 0.0];
    J['upperArm' + side] = [0.185 * sx * H * sw, 1.435 * H, -0.015 * H];
    const d = [Math.sin(armA) * sx, -Math.cos(armA), 0];
    J['forearm' + side] = add(J['upperArm' + side], mul(d, 0.29 * H));
    J['hand' + side] = add(J['forearm' + side], mul(d, 0.255 * H));
    J['thigh' + side] = [0.092 * sx * H * hw, 0.93 * H, 0];
    J['shin' + side] = [0.098 * sx * H * hw, 0.505 * H, 0.012 * H];
    J['foot' + side] = [0.1 * sx * H * hw, 0.085 * H, -0.012 * H];
    J['toe' + side] = [0.104 * sx * H * hw, 0.022 * H, 0.125 * H];
  }
  J.armDirL = [Math.sin(armA), -Math.cos(armA), 0];
  J.armDirR = [-Math.sin(armA), -Math.cos(armA), 0];
  return J;
}

const PARENT = {
  hips: 'root', spine: 'hips', chest: 'spine', neck: 'chest', head: 'neck', jaw: 'head',
  clavicleL: 'chest', upperArmL: 'clavicleL', forearmL: 'upperArmL', handL: 'forearmL',
  clavicleR: 'chest', upperArmR: 'clavicleR', forearmR: 'upperArmR', handR: 'forearmR',
  thighL: 'hips', shinL: 'thighL', footL: 'shinL', toeL: 'footL',
  thighR: 'hips', shinR: 'thighR', footR: 'shinR', toeR: 'footR',
};

// ---------------------------------------------------------------------------
// Head sculpt (head-local coordinates, origin ≈ centre of the skull at eye
// height, face toward +Z). Parameters let one function make distinct faces.
// ---------------------------------------------------------------------------
function headSculpt(f) {
  const s = new Sculpt();
  const prims = { head: [], jaw: [] };
  const A = (p, k, bone = 'head') => { p.bone = bone; prims[bone === 'jaw' ? 'jaw' : 'head'].push(p); s.add(p, k); return p; };
  // NOTE: 'neck'-tagged prims are collected with the head set for weighting
  const w = f.width ?? 1, jw = f.jawWidth ?? 1, cl = f.chinLength ?? 1;
  // cranium + face mass
  A(P.ellipsoid([0, 0.024, -0.012], [0.079 * w, 0.091, 0.097]), 0);
  A(P.ellipsoid([0, -0.006, 0.014], [0.056 * w, 0.05, 0.06]), 0.03);
  // cheekbones + cheeks
  for (const sx of [1, -1]) {
    A(P.ellipsoid([0.044 * sx * w, -0.002, 0.052], [0.02, 0.013, 0.018]), 0.016);
    A(P.ellipsoid([0.038 * sx * w, -0.024, 0.042], [0.016, 0.016, 0.017]), 0.02);
    // jaw angle
    A(P.ellipsoid([0.05 * sx * jw, -0.052, -0.016], [0.015, 0.024, 0.024], { rot: [0.3, 0, 0] }), 0.02, 'jaw');
  }
  // jaw / chin (lower face follows the jaw bone)
  A(P.capsule([0.047 * jw, -0.06, -0.012], [0.017, -0.085 * cl, 0.05], 0.012, 0.012), 0.018, 'jaw');
  A(P.capsule([-0.047 * jw, -0.06, -0.012], [-0.017, -0.085 * cl, 0.05], 0.012, 0.012), 0.018, 'jaw');
  A(P.ellipsoid([0, -0.083 * cl, 0.058], [0.02 * (f.chinWidth ?? 1), 0.016, 0.017]), 0.016, 'jaw');
  // brow ridge + forehead slope
  A(P.capsule([-0.042 * w, 0.032, 0.077], [0.042 * w, 0.032, 0.077], 0.013 * (f.brow ?? 1)), 0.022);
  // nose
  const nl = f.noseLength ?? 1, nw = f.noseWidth ?? 1;
  A(P.capsule([0, 0.024, 0.087], [0, -0.019 * nl, 0.104 + 0.004 * nl], 0.0075, 0.0095 * nw), 0.012);
  A(P.sphere([0, -0.022 * nl, 0.104 + 0.003 * nl], 0.0115 * nw), 0.006);
  for (const sx of [1, -1]) A(P.ellipsoid([0.0125 * sx * nw, -0.028 * nl, 0.094], [0.0085, 0.0075, 0.009]), 0.006);
  // lips
  const lw = f.lipWidth ?? 1, lf = f.lipFull ?? 1;
  A(P.ellipsoid([0, -0.0465, 0.0835], [0.02 * lw, 0.0056 * lf, 0.0075]), 0.007);
  for (const sx of [1, -1]) A(P.ellipsoid([0.007 * sx, -0.0458, 0.0845], [0.0085, 0.0048 * lf, 0.0064]), 0.004);
  A(P.ellipsoid([0, -0.059, 0.0795], [0.017 * lw, 0.0064 * lf, 0.0082]), 0.007, 'jaw');
  // philtrum ridge
  A(P.capsule([0.003, -0.035, 0.0905], [0.003, -0.043, 0.0895], 0.0026), 0.004);
  A(P.capsule([-0.003, -0.035, 0.0905], [-0.003, -0.043, 0.0895], 0.0026), 0.004);
  // ears
  for (const sx of [1, -1]) {
    A(P.ellipsoid([0.079 * sx * w, -0.004, -0.008], [0.011, 0.03, 0.019], { rot: [0.15, -0.35 * sx, 0.12 * sx] }), 0.008);
    A(P.torus([0.083 * sx * w, 0.0, -0.01], 0.017, 0.0042, { rot: [0, 0, Math.PI / 2], sx: 1, sy: 1, sz: 0.72 }), 0.004);
  }
  // neck + throat
  A(P.capsule([0, -0.06, -0.034], [0, -0.17, -0.026], 0.049 * (f.neck ?? 1), 0.056 * (f.neck ?? 1)), 0.025, 'neck');
  if (f.adam) A(P.ellipsoid([0, -0.11, 0.025], [0.009, 0.014, 0.008]), 0.012);
  // ---- carving ----
  // eye sockets
  for (const sx of [1, -1]) s.sub(P.ellipsoid([0.032 * sx, 0.009, 0.08], [0.0175, 0.0125, 0.013]), 0.009);
  // nostrils
  for (const sx of [1, -1]) s.sub(P.ellipsoid([0.0068 * sx * nw, -0.0315 * nl, 0.1], [0.0034, 0.0022, 0.005], { rot: [0.5, 0, 0] }), 0.002);
  // mouth line
  s.sub(P.box([0, -0.0525, 0.091], [0.0195 * lw, 0.001, 0.0085], 0.001), 0.002);
  // ear concha
  for (const sx of [1, -1]) s.sub(P.ellipsoid([0.087 * sx * w, -0.003, -0.006], [0.0055, 0.016, 0.011], { rot: [0.15, -0.35 * sx, 0] }), 0.003);
  // nasolabial softness and temples
  for (const sx of [1, -1]) s.sub(P.ellipsoid([0.075 * sx * w, 0.03, 0.045], [0.012, 0.02, 0.02]), 0.02);
  // under-chin
  s.sub(P.ellipsoid([0, -0.125, 0.05], [0.06, 0.03, 0.04]), 0.02);
  return { s, prims };
}

// ---------------------------------------------------------------------------
// Hand sculpt in a canonical frame, then mapped onto the arm.
// frame: fingers along +D, palm normal +N, thumb side +T
// ---------------------------------------------------------------------------
function handPrims(origin, D, N, T, scale, side, glove = false) {
  const prims = [];
  const at = (d, n, t) => add(origin, add(mul(D, d * scale), add(mul(N, n * scale), mul(T, t * scale))));
  const bone = (b) => b + side;
  // wrist + palm
  prims.push(Object.assign(P.capsule(at(-0.02, 0, 0), at(0.012, 0, 0), 0.024 * scale, 0.026 * scale), { bone: bone('hand'), k: 0.01 }));
  prims.push(Object.assign(P.capsule(at(0.02, 0.0, 0.018), at(0.075, -0.002, 0.024), 0.016 * scale, 0.014 * scale), { bone: bone('hand'), k: 0.012 }));
  prims.push(Object.assign(P.capsule(at(0.02, 0.0, -0.018), at(0.072, 0.0, -0.022), 0.016 * scale, 0.013 * scale), { bone: bone('hand'), k: 0.012 }));
  prims.push(Object.assign(P.capsule(at(0.025, 0.005, 0.0), at(0.075, 0.003, 0.0), 0.018 * scale, 0.015 * scale), { bone: bone('hand'), k: 0.012 }));
  // thenar pad
  prims.push(Object.assign(P.ellipsoid(at(0.03, 0.011, 0.024), [0.018 * scale, 0.014 * scale, 0.014 * scale]), { bone: bone('hand'), k: 0.01 }));
  const fingers = [
    { n: 'index', t: 0.024, len: [0.044, 0.026, 0.021], r: 0.0092 },
    { n: 'middle', t: 0.0075, len: [0.048, 0.03, 0.022], r: 0.0095 },
    { n: 'ring', t: -0.0095, len: [0.045, 0.028, 0.021], r: 0.0089 },
    { n: 'pinky', t: -0.025, len: [0.036, 0.021, 0.019], r: 0.0078 },
  ];
  const joints = {};
  for (const f of fingers) {
    let p = at(0.078 + (f.n === 'middle' ? 0.003 : 0), 0.0, f.t);
    const pts = [p];
    let dir = norm(add(D, mul(N, 0.12))); // slight natural curl
    for (let i = 0; i < 3; i++) {
      const L = f.len[i] * scale * (glove && i === 0 ? 1 : 1);
      const q = add(p, mul(dir, L));
      prims.push(Object.assign(P.capsule(p, q, f.r * scale * (1 - i * 0.08), f.r * scale * (0.9 - i * 0.08)), { bone: bone(f.n + i), k: 0.004 }));
      // knuckle
      if (i === 0) prims.push(Object.assign(P.sphere(add(p, mul(N, -0.002 * scale)), f.r * 1.05 * scale), { bone: bone('hand'), k: 0.006 }));
      p = q; pts.push(p);
      dir = norm(add(dir, mul(N, 0.22)));
    }
    joints[f.n] = pts;
    // nail (dorsal = -N)
    if (!glove) {
      const tip = pts[3], mid = lerp3(pts[2], pts[3], 0.6);
      prims.push(Object.assign(P.ellipsoid(add(mid, mul(N, -f.r * 0.75 * scale)), [0.0062 * scale, 0.0062 * scale, 0.0062 * scale]), { bone: bone(f.n + 2), k: 0.002, nail: true }));
    }
  }
  // thumb
  let p = at(0.012, 0.012, 0.03);
  const tdir0 = norm(add(add(mul(D, 0.65), mul(T, 0.62)), mul(N, 0.42)));
  let dir = tdir0; const tl = [0.036, 0.03, 0.024]; const tpts = [p];
  for (let i = 0; i < 3; i++) {
    const q = add(p, mul(dir, tl[i] * scale));
    prims.push(Object.assign(P.capsule(p, q, (0.0125 - i * 0.0015) * scale, (0.011 - i * 0.0015) * scale), { bone: bone('thumb' + i), k: i === 0 ? 0.012 : 0.004 }));
    p = q; tpts.push(p);
    dir = norm(add(dir, mul(N, 0.18)));
  }
  joints.thumb = tpts;
  return { prims, joints };
}

// ---------------------------------------------------------------------------
// Materials
// ---------------------------------------------------------------------------
function skinMaterial(color) {
  const m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.52, metalness: 0, sheen: 0.35, sheenRoughness: 0.6, sheenColor: new THREE.Color(0.8, 0.35, 0.3), vertexColors: true, clearcoat: 0.05, clearcoatRoughness: 0.5 });
  // wrap lighting + subsurface tint: soften the terminator and redden it
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
      reflectedLight.indirectDiffuse += diffuseColor.rgb * vec3(0.10, 0.03, 0.02);`);
    aoAttr(sh);
  };
  return m;
}
// multiplies the baked 'ao' vertex attribute into the material
function aoAttr(sh) {
  if (!sh.vertexShader.includes('attribute float ao;')) {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float ao; varying float vAO;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvAO = ao;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vAO;').replace('#include <aomap_fragment>', '#include <aomap_fragment>\nreflectedLight.indirectDiffuse *= vAO; reflectedLight.indirectSpecular *= mix(1.0, vAO, 0.8); reflectedLight.directDiffuse *= mix(1.0, vAO, 0.55);');
  }
}

export function clothMaterial(key, o = {}) {
  let m;
  if (key) {
    m = pbr(key, { size: 1, color: o.color ?? 0xffffff, normal: o.normal ?? 1, roughness: o.roughness ?? 1, physical: o.sheen ? { sheen: o.sheen, sheenRoughness: 0.8, sheenColor: new THREE.Color(o.sheenColor ?? 0xffffff) } : null });
    triplanar(m, o.scale ?? 8, o.normal ?? 1);
    const prev = m.onBeforeCompile;
    m.onBeforeCompile = (sh) => { prev(sh); aoAttr(sh); };
    m.customProgramCacheKey = () => 'cloth-tri-ao' + (o.scale ?? 8);
  } else {
    m = new THREE.MeshStandardMaterial({ color: o.color ?? 0x888888, roughness: o.roughness ?? 0.7, metalness: o.metalness ?? 0 });
    m.onBeforeCompile = (sh) => aoAttr(sh);
  }
  if (o.vertexColors) m.vertexColors = true;
  return m;
}

// ---------------------------------------------------------------------------
// Iris / eye texture
// ---------------------------------------------------------------------------
function eyeTexture(irisColor, size = 256) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d');
  // sclera with faint veins, warm at the edges
  const sg = g.createRadialGradient(size / 2, size / 2, size * 0.1, size / 2, size / 2, size / 2);
  sg.addColorStop(0, '#f4f1ec'); sg.addColorStop(0.7, '#e9e2da'); sg.addColorStop(1, '#d9b9ad');
  g.fillStyle = sg; g.fillRect(0, 0, size, size);
  g.strokeStyle = 'rgba(170,60,60,0.18)'; g.lineWidth = 1;
  for (let i = 0; i < 18; i++) {
    const a = Math.random() * Math.PI * 2; let r = size * 0.48; let x = size / 2 + Math.cos(a) * r, y = size / 2 + Math.sin(a) * r;
    g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 5; k++) { r -= size * 0.035; const aa = a + (Math.random() - 0.5) * 0.3; x = size / 2 + Math.cos(aa) * r; y = size / 2 + Math.sin(aa) * r; g.lineTo(x, y); }
    g.stroke();
  }
  // iris
  const R = size * 0.21, cx = size / 2, cy = size / 2;
  const col = new THREE.Color(irisColor);
  const css = (k, a = 1) => `rgba(${Math.round(col.r * 255 * k)},${Math.round(col.g * 255 * k)},${Math.round(col.b * 255 * k)},${a})`;
  const ig = g.createRadialGradient(cx, cy, R * 0.25, cx, cy, R);
  ig.addColorStop(0, css(1.35)); ig.addColorStop(0.55, css(1)); ig.addColorStop(0.92, css(0.55)); ig.addColorStop(1, 'rgba(20,16,14,1)');
  g.fillStyle = ig; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill();
  // fibres
  for (let i = 0; i < 160; i++) {
    const a = (i / 160) * Math.PI * 2 + Math.random() * 0.03;
    g.strokeStyle = Math.random() < 0.5 ? css(1.6, 0.35) : css(0.4, 0.35);
    g.lineWidth = Math.random() * 1.4 + 0.3;
    g.beginPath(); g.moveTo(cx + Math.cos(a) * R * 0.32, cy + Math.sin(a) * R * 0.32); g.lineTo(cx + Math.cos(a) * R * (0.75 + Math.random() * 0.22), cy + Math.sin(a) * R * (0.75 + Math.random() * 0.22)); g.stroke();
  }
  // collarette ring
  g.strokeStyle = css(1.7, 0.4); g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, R * 0.45, 0, Math.PI * 2); g.stroke();
  // pupil
  g.fillStyle = '#060506'; g.beginPath(); g.arc(cx, cy, R * 0.36, 0, Math.PI * 2); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

// sphere UV-mapped so that the iris (texture centre) faces +Z
function eyeGeometry(r) {
  const g = new THREE.SphereGeometry(r, 32, 24);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) / r, y = p.getY(i) / r, z = p.getZ(i) / r;
    // azimuthal projection around +Z
    const th = Math.acos(Math.max(-1, Math.min(1, z))), ph = Math.atan2(y, x), rr = (th / Math.PI) * 0.95;
    uv.setXY(i, 0.5 + Math.cos(ph) * rr, 0.5 + Math.sin(ph) * rr);
  }
  return g;
}

// ---------------------------------------------------------------------------
// Hair: tapered, flattened strand clumps grown along guide directions
// ---------------------------------------------------------------------------
export function hairClumps(spec, rng = Math.random) {
  // spec.clumps: [{root:[x,y,z], dir:[...], len, width, curl, droop, segs}]
  const pos = [], nor = [], uvs = [], idx = [], col = [];
  const segsDefault = 7, sides = 5;
  for (const c of spec.clumps) {
    const segs = c.segs ?? segsDefault;
    let p = V(...c.root), d = V(...c.dir).normalize();
    const gravity = V(0, -1, 0);
    const side0 = V(...(c.side ?? [1, 0, 0])).normalize();
    const pts = [], frames = [];
    for (let i = 0; i <= segs; i++) {
      pts.push(p.clone());
      const t = i / segs;
      // bend: droop under gravity, curl around side axis
      d.addScaledVector(gravity, (c.droop ?? 0.15) / segs * 2).normalize();
      if (c.curl) d.applyAxisAngle(side0, c.curl / segs);
      if (c.towards) d.lerp(V(...c.towards).normalize(), (c.pull ?? 0.2) / segs * 2).normalize();
      p = p.clone().addScaledVector(d, c.len / segs);
      // keep strands off the scalp
      if (spec.scalp) { const q = p.clone().sub(spec.scalp.c); const r = q.length(); const minR = spec.scalp.r * (1 + 0.04 * (1 - t)); if (r < minR) p = spec.scalp.c.clone().addScaledVector(q.normalize(), minR); }
    }
    const base = pos.length / 3;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const tan = (i < segs ? pts[i + 1].clone().sub(pts[i]) : pts[i].clone().sub(pts[i - 1])).normalize();
      const bx = side0.clone().sub(tan.clone().multiplyScalar(side0.dot(tan))).normalize();
      const by = tan.clone().cross(bx).normalize();
      const w = c.width * (1 - Math.pow(t, 1.6) * 0.92) * (i === 0 ? 0.85 : 1), th = w * (c.flat ?? 0.35);
      for (let k = 0; k < sides; k++) {
        const a = (k / sides) * Math.PI * 2;
        const o = bx.clone().multiplyScalar(Math.cos(a) * w).addScaledVector(by, Math.sin(a) * th);
        const P0 = pts[i].clone().add(o);
        pos.push(P0.x, P0.y, P0.z);
        const n = bx.clone().multiplyScalar(Math.cos(a) / w).addScaledVector(by, Math.sin(a) / th).normalize();
        nor.push(n.x, n.y, n.z);
        uvs.push(k / sides, t);
        const shade = 0.55 + 0.45 * t; // roots darker
        col.push(shade, shade, shade);
      }
    }
    for (let i = 0; i < segs; i++) for (let k = 0; k < sides; k++) {
      const a = base + i * sides + k, b = base + i * sides + ((k + 1) % sides), cc = a + sides, dd = b + sides;
      idx.push(a, cc, b, b, cc, dd);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  return g;
}

export function hairMaterial(color, spec = 0.5) {
  // anisotropic-ish strand shading via a fine striation normal texture
  const c = document.createElement('canvas'); c.width = 64; c.height = 256;
  const g = c.getContext('2d'); g.fillStyle = 'rgb(128,128,255)'; g.fillRect(0, 0, 64, 256);
  for (let x = 0; x < 64; x++) { const v = 128 + (Math.random() - 0.5) * 140; g.fillStyle = `rgb(${v},128,255)`; g.fillRect(x, 0, 1, 256); }
  const n = new THREE.CanvasTexture(c); n.wrapS = n.wrapT = THREE.RepeatWrapping; n.repeat.set(3, 1);
  return new THREE.MeshPhysicalMaterial({ color, roughness: 0.5, metalness: 0, normalMap: n, normalScale: new THREE.Vector2(0.6, 0.6), vertexColors: true, sheen: 0.25, sheenRoughness: 0.4, sheenColor: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.15), specularIntensity: spec, side: THREE.DoubleSide });
}

// ---------------------------------------------------------------------------
// The character
// ---------------------------------------------------------------------------
export class Humanoid extends THREE.Group {
  constructor(def) {
    super();
    this.def = def;
    this.name = def.name;
    this.J = makeJoints(def.body);
    this.buildSkeleton();
    this.meshes = [];
    this.face = { jaw: 0, smile: 0, frown: 0, browUp: 0, browIn: 0, blink: 0, squint: 0, lookAt: null, lidOpen: 1, mouthO: 0, sneer: 0 };
  }

  buildSkeleton() {
    const J = this.J;
    this.bones = {};
    const make = (name, parentName, pos) => {
      const b = new THREE.Bone(); b.name = name;
      const pp = parentName ? this.worldRest[parentName] : [0, 0, 0];
      b.position.set(pos[0] - pp[0], pos[1] - pp[1], pos[2] - pp[2]);
      this.bones[name] = b; this.worldRest[name] = pos;
      if (parentName) this.bones[parentName].add(b);
      return b;
    };
    this.worldRest = {};
    make('root', null, J.root);
    for (const n of ['hips', 'spine', 'chest', 'neck', 'head', 'clavicleL', 'upperArmL', 'forearmL', 'handL', 'clavicleR', 'upperArmR', 'forearmR', 'handR', 'thighL', 'shinL', 'footL', 'toeL', 'thighR', 'shinR', 'footR', 'toeR']) make(n, PARENT[n], J[n]);
    // face bones (positions in world rest)
    const hc = this.headCentre();
    const hp = (x, y, z) => [hc[0] + x, hc[1] + y, hc[2] + z];
    make('jaw', 'head', hp(0, -0.03, -0.005));
    make('mouthL', 'head', hp(0.022, -0.053, 0.084));
    make('mouthR', 'head', hp(-0.022, -0.053, 0.084));
    make('lipU', 'head', hp(0, -0.045, 0.094));
    make('lipL', 'jaw', hp(0, -0.06, 0.09));
    make('browL', 'head', hp(0.032, 0.03, 0.085));
    make('browR', 'head', hp(-0.032, 0.03, 0.085));
    make('cheekL', 'head', hp(0.04, -0.02, 0.07));
    make('cheekR', 'head', hp(-0.04, -0.02, 0.07));
    // hands (fingers)
    this.hands = {};
    for (const side of ['L', 'R']) {
      const sx = side === 'L' ? 1 : -1;
      const D = this.J['armDir' + side];
      const N = norm([-Math.abs(D[1]) * sx, -Math.abs(D[0]), 0]);
      const T = [0, 0, 1];
      const scale = (this.def.body.handScale ?? 1) * (this.def.body.height / 1.8);
      const H = handPrims(this.J['hand' + side], D, N, T, scale, side);
      this.hands[side] = { D, N, T, scale, H };
      for (const f of ['index', 'middle', 'ring', 'pinky', 'thumb']) {
        const pts = H.joints[f];
        let parent = 'hand' + side;
        for (let i = 0; i < 3; i++) { make(f + i + side, parent, pts[i]); parent = f + i + side; }
      }
    }
    this.add(this.bones.root);
    this.boneList = Object.values(this.bones);
    this.boneIndex = {}; this.boneList.forEach((b, i) => (this.boneIndex[b.name] = i));
    this.bones.root.updateMatrixWorld(true);
    this.skeleton = new THREE.Skeleton(this.boneList);
  }

  headCentre() { const h = this.J.head; return [h[0], h[1] + 0.085 * (this.def.body.height / 1.8) * (this.def.body.headScale ?? 1), h[2] + 0.012]; }

  addSkinned(geo, material, name) {
    const m = new THREE.SkinnedMesh(geo, material);
    m.name = name; m.castShadow = true; m.receiveShadow = true;
    m.frustumCulled = false;
    m.bind(this.skeleton, new THREE.Matrix4());
    this.add(m); this.meshes.push(m);
    return m;
  }

  /** Builds every mesh. Heavy (≈0.5–1.5 s); call during loading. */
  build() {
    const d = this.def, J = this.J, Hs = d.body.height / 1.8, hs = (d.body.headScale ?? 1) * Hs;
    const hc = this.headCentre();
    // ---------- head ----------
    const { s: hsSculpt, prims: hp } = headSculpt(d.face);
    const toWorld = (p) => { // move head-local prims into world rest pose
      for (const k of ['ax', 'cx', 'bx']) if (p[k] !== undefined) p[k] = p[k] * hs + hc[0];
      for (const k of ['ay', 'cy', 'by']) if (p[k] !== undefined) p[k] = p[k] * hs + hc[1];
      for (const k of ['az', 'cz', 'bz']) if (p[k] !== undefined) p[k] = p[k] * hs + hc[2];
      for (const k of ['ra', 'rb', 'rx', 'ry', 'rz', 'hx', 'hy', 'hz', 'r', 'R']) if (p[k] !== undefined) p[k] *= hs;
      if (p.l2) p.l2 *= hs * hs;
      if (p.min) { p.min = p.min.map((v, i) => v * hs + hc[i]); p.max = p.max.map((v, i) => v * hs + hc[i]); }
    };
    for (const o of hsSculpt.ops) { if (o.prim) toWorld(o.prim); if (o.k) o.k *= hs; }
    // neck primitive also belongs to the neck bone at its base
    const headGeo = polygonise(hsSculpt, [hc[0] - 0.11 * hs, hc[1] - 0.29 * hs, hc[2] - 0.13 * hs], [hc[0] + 0.11 * hs, hc[1] + 0.13 * hs, hc[2] + 0.13 * hs], 0.0029 * hs, { aoScale: 0.6 * hs });
    const P0 = (x, y, z) => [hc[0] + x * hs, hc[1] + y * hs, hc[2] + z * hs];
    const neckPrim = Object.assign(P.capsule(P0(0, -0.14, -0.03), P0(0, -0.3, -0.03), 0.05 * hs), { bone: 'neck' });
    const chestPrim = Object.assign(P.capsule(P0(0, -0.32, -0.03), P0(0, -0.4, -0.03), 0.06 * hs), { bone: 'chest' });
    skinWeights(headGeo, [...hp.head, ...hp.jaw, neckPrim, chestPrim], this.boneIndex, {
      softness: 0.012 * hs,
      influences: [
        { bone: 'mouthL', c: P0(0.022, -0.053, 0.086), r: 0.022 * hs, w: 0.9 },
        { bone: 'mouthR', c: P0(-0.022, -0.053, 0.086), r: 0.022 * hs, w: 0.9 },
        { bone: 'lipU', c: P0(0, -0.045, 0.095), r: 0.014 * hs, w: 0.7, s: [1.6, 0.8, 1] , only: (x, y) => y > hc[1] - 0.0525 * hs },
        { bone: 'lipL', c: P0(0, -0.06, 0.09), r: 0.014 * hs, w: 0.6, s: [1.6, 0.8, 1], only: (x, y) => y < hc[1] - 0.0525 * hs },
        { bone: 'browL', c: P0(0.032, 0.034, 0.085), r: 0.026 * hs, w: 0.8, s: [1.3, 0.8, 1] },
        { bone: 'browR', c: P0(-0.032, 0.034, 0.085), r: 0.026 * hs, w: 0.8, s: [1.3, 0.8, 1] },
        { bone: 'cheekL', c: P0(0.04, -0.022, 0.07), r: 0.026 * hs, w: 0.7 },
        { bone: 'cheekR', c: P0(-0.04, -0.022, 0.07), r: 0.026 * hs, w: 0.7 },
      ],
    });
    // fix: everything above the mouth line must not follow the jaw
    this.fixJawWeights(headGeo, hc[1] - 0.0525 * hs, hc[2]);
    this.paintFace(headGeo, hp, hc, hs);
    this.skinMat = skinMaterial(0xffffff);
    this.headMesh = this.addSkinned(headGeo, this.skinMat, 'head');

    this.buildEyes(hc, hs);
    this.buildTeeth(hc, hs);
    this.buildBrows(hc, hs);

    // ---------- hands ----------
    for (const side of ['L', 'R']) {
      const { H, scale } = this.hands[side];
      const sc = new Sculpt();
      for (const p of H.prims) sc.add(p, p.k);
      const all = H.prims;
      const b = boundsOf(all, 0.02);
      const g = polygonise(sc, b.min, b.max, 0.0025 * scale, { aoScale: 0.35 });
      skinWeights(g, all, this.boneIndex, { softness: 0.004 });
      // nails: lighter, pinker
      const pos = g.attributes.position.array, cols = new Float32Array(pos.length);
      const base = new THREE.Color(d.skin), nail = base.clone().lerp(new THREE.Color(0xf2c9c0), 0.55);
      const nails = all.filter((p) => p.nail);
      for (let i = 0; i < pos.length / 3; i++) {
        let c = base;
        for (const n of nails) if (n.f(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2], n) < 0.0008) c = nail;
        cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
      }
      g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      this.addSkinned(g, this.skinMat, 'hand' + side);
      if (d.gloves) this.buildGlove(side, H, scale);
    }

    // ---------- clothing ----------
    for (const piece of d.outfit(this)) this.buildPiece(piece);
    // ---------- hair ----------
    if (d.hair) this.buildHair(d.hair(this, hc, hs));
    // ---------- accessories (rigid, parented to bones) ----------
    if (d.accessories) d.accessories(this);
    this.restPose = {};
    for (const [n, b] of Object.entries(this.bones)) this.restPose[n] = { p: b.position.clone(), q: b.quaternion.clone() };
    this.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return this;
  }

  fixJawWeights(geo, mouthY, zFront) {
    const pos = geo.attributes.position.array, si = geo.attributes.skinIndex.array, sw = geo.attributes.skinWeight.array;
    const jaw = this.boneIndex.jaw, lipL = this.boneIndex.lipL, head = this.boneIndex.head;
    for (let i = 0; i < pos.length / 3; i++) {
      const y = pos[i * 3 + 1];
      for (let k = 0; k < 4; k++) {
        const b = si[i * 4 + k];
        if ((b === jaw || b === lipL) && y > mouthY + 0.0006) {
          // fade jaw influence above the mouth line (cheeks keep a little)
          const keep = Math.max(0, 1 - (y - mouthY) / 0.012) * 0.5;
          const moved = sw[i * 4 + k] * (1 - keep);
          sw[i * 4 + k] -= moved;
          // give it to the head bone slot (find or replace weakest)
          let hk = -1; for (let j = 0; j < 4; j++) if (si[i * 4 + j] === head) hk = j;
          if (hk < 0) { let mn = 0; for (let j = 1; j < 4; j++) if (sw[i * 4 + j] < sw[i * 4 + mn]) mn = j; if (mn === k) continue; si[i * 4 + mn] = head; sw[i * 4 + mn] = 0; hk = mn; }
          sw[i * 4 + hk] += moved;
        }
      }
    }
  }

  /** Vertex colours: lips, cheek flush, eye shadowing, stubble, freckles. */
  paintFace(geo, hp, hc, hs) {
    const f = this.def.face, pos = geo.attributes.position.array, n = pos.length / 3;
    const cols = new Float32Array(n * 3);
    const skin = new THREE.Color(this.def.skin), lip = new THREE.Color(f.lipColor ?? 0xb86a62), flush = new THREE.Color(f.flush ?? 0xd77d6c);
    const stub = new THREE.Color(f.stubbleColor ?? 0x3b3330);
    const c = new THREE.Color();
    const freckles = f.freckles ? Array.from({ length: 110 }, () => [(Math.random() - 0.5) * 0.09, -0.01 + (Math.random() - 0.5) * 0.04, 0.09]) : [];
    for (let i = 0; i < n; i++) {
      const x = (pos[i * 3] - hc[0]) / hs, y = (pos[i * 3 + 1] - hc[1]) / hs, z = (pos[i * 3 + 2] - hc[2]) / hs;
      c.copy(skin);
      // lips
      const lu = Math.hypot(x / 0.021, (y + 0.047) / 0.0075), ll = Math.hypot(x / 0.019, (y + 0.06) / 0.0085);
      const lipT = Math.max(0, 1 - Math.min(lu, ll)) ;
      if (z > 0.07) c.lerp(lip, Math.min(0.75, lipT * 1.6));
      // cheek flush
      for (const sx of [1, -1]) { const dd = Math.hypot((x - 0.045 * sx) / 0.025, (y + 0.025) / 0.02); if (dd < 1 && z > 0.03) c.lerp(flush, (1 - dd) * 0.28); }
      // nose tip flush
      { const dd = Math.hypot(x / 0.014, (y + 0.022) / 0.012); if (dd < 1 && z > 0.09) c.lerp(flush, (1 - dd) * 0.25); }
      // ear flush
      if (Math.abs(x) > 0.07 && y > -0.035 && y < 0.03) c.lerp(flush, 0.2);
      // eye area: slightly darker and cooler
      for (const sx of [1, -1]) { const dd = Math.hypot((x - 0.032 * sx) / 0.024, (y - 0.006) / 0.018); if (dd < 1 && z > 0.05) c.multiplyScalar(1 - (1 - dd) * 0.12); }
      // stubble on jaw, chin, upper lip
      if (f.stubble) {
        const jawRegion = y < -0.03 && y > -0.12 && z > 0.01 + Math.max(0, y + 0.06) * 1.5 && Math.abs(x) < 0.06;
        const notLips = lipT < 0.05;
        const upperLip = y < -0.032 && y > -0.044 && Math.abs(x) < 0.025;
        if ((jawRegion || upperLip) && notLips) {
          let a = f.stubble * (0.6 + Math.random() * 0.4);
          if (y > -0.04 && Math.abs(x) > 0.035) a *= Math.max(0, 1 - (y + 0.04) / 0.02);
          if (y < -0.1) a *= Math.max(0, (y + 0.12) / 0.02);
          c.lerp(stub, a);
        }
      }
      for (const fr of freckles) { const dd = Math.hypot(x - fr[0], y - fr[1]); if (dd < 0.0022 && z > 0.06) c.lerp(new THREE.Color(0x9a5b3e), 0.35); }
      cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  }

  buildEyes(hc, hs) {
    const f = this.def.face;
    const tex = eyeTexture(f.iris ?? 0x5a7a52);
    const eyeR = 0.0122 * hs;
    this.eyes = [];
    this.lids = [];
    const eyeMat = new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.03 });
    const lidMat = new THREE.MeshPhysicalMaterial({ color: this.def.skin, roughness: 0.55, sheen: 0.3, sheenColor: new THREE.Color(0.8, 0.4, 0.35) });
    const lashMat = new THREE.MeshStandardMaterial({ color: f.lashColor ?? 0x1a1412, roughness: 0.8 });
    for (const sx of [1, -1]) {
      const pivot = new THREE.Object3D();
      const local = new THREE.Vector3(0.032 * sx * hs, 0.009 * hs, 0.0685 * hs);
      pivot.position.set(hc[0] + local.x, hc[1] + local.y, hc[2] + local.z).sub(V(...this.J.head));
      this.bones.head.add(pivot);
      const eye = new THREE.Mesh(eyeGeometry(eyeR), eyeMat);
      eye.rotation.y = 0.04 * sx; // slight divergence at rest
      pivot.add(eye);
      // wet cornea bulge
      const cornea = new THREE.Mesh(new THREE.SphereGeometry(eyeR * 0.55, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2.4), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 1, roughness: 0, thickness: 0.002, ior: 1.376, transparent: true, opacity: 0.15, clearcoat: 1 }));
      cornea.rotation.x = Math.PI / 2; cornea.position.z = eyeR * 0.6; eye.add(cornea);
      this.eyes.push({ pivot, eye, side: sx });
      // eyelids: partial spherical shells that rotate about the eye centre
      for (const upper of [true, false]) {
        const lidR = eyeR * 1.12;
        const g = new THREE.SphereGeometry(lidR, 28, 10, Math.PI / 2 - Math.PI * 0.62, Math.PI * 1.24, upper ? 0 : Math.PI * 0.5, Math.PI * 0.5);
        // rotate so the shell opening faces +Z
        const lid = new THREE.Mesh(g, lidMat);
        const holder = new THREE.Object3D(); holder.add(lid);
        pivot.add(holder);
        // lash strip along the lid edge
        const lash = new THREE.Mesh(new THREE.TorusGeometry(lidR * 1.01, 0.0007 * hs, 4, 24, Math.PI * 0.95), lashMat);
        lash.rotation.set(Math.PI / 2, 0, 0.025 * Math.PI);
        holder.add(lash);
        this.lids.push({ holder, upper, side: sx, lash });
      }
    }
  }

  buildTeeth(hc, hs) {
    const mat = new THREE.MeshPhysicalMaterial({ color: 0xece4d6, roughness: 0.25, clearcoat: 0.6 });
    const gum = new THREE.MeshStandardMaterial({ color: 0x5a1f22, roughness: 0.6, side: THREE.DoubleSide });
    const mk = (upper) => {
      const g = new THREE.Group();
      for (let i = -3; i <= 3; i++) {
        const a = i * 0.2;
        const w = (Math.abs(i) < 2 ? 0.0038 : 0.0032) * hs;
        const t = new THREE.Mesh(new THREE.BoxGeometry(w, 0.0058 * hs, 0.004 * hs), mat);
        const R = 0.02 * hs;
        t.position.set(Math.sin(a) * R, upper ? -0.0028 * hs : 0.0028 * hs, Math.cos(a) * R - R);
        t.rotation.y = a;
        g.add(t);
      }
      return g;
    };
    const upper = mk(true), lower = mk(false);
    const ref = V(hc[0], hc[1] - 0.0515 * hs, hc[2] + 0.073 * hs);
    upper.position.copy(ref).sub(V(...this.J.head));
    this.bones.head.add(upper);
    const jawW = this.worldRest.jaw;
    lower.position.set(ref.x - jawW[0], ref.y - jawW[1] - 0.001 * hs, ref.z - jawW[2] - 0.002 * hs);
    this.bones.jaw.add(lower);
    // mouth interior so an open mouth never shows through the head
    const bag = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), gum);
    bag.scale.set(0.019 * hs, 0.013 * hs, 0.02 * hs);
    bag.position.set(hc[0], hc[1] - 0.054 * hs, hc[2] + 0.05 * hs).sub(V(...this.J.head));
    this.bones.head.add(bag);
    const tongue = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshStandardMaterial({ color: 0xa04a4a, roughness: 0.4 }));
    tongue.scale.set(0.015 * hs, 0.006 * hs, 0.022 * hs);
    tongue.position.set(0, -0.026 * hs, 0.055 * hs);
    this.bones.jaw.add(tongue);
  }

  buildBrows(hc, hs) {
    const f = this.def.face;
    const mat = hairMaterial(f.browColor ?? 0x2a1d16, 0.2);
    this.brows = [];
    for (const sx of [1, -1]) {
      const clumps = [];
      for (let i = 0; i < 44; i++) {
        const t = i / 43;
        const x = (0.016 + t * 0.03) * sx;
        const y = 0.03 + Math.sin(t * Math.PI) * 0.005 - t * 0.002 + (f.browArch ?? 0) * Math.sin(t * Math.PI) * 0.004;
        const z = 0.0905 - t * t * 0.02;
        clumps.push({ root: [x * hs, (y - 0.003 + Math.random() * 0.004) * hs, z * hs], dir: [sx * (0.6 + t * 0.4), 0.35 - t * 0.5, 0.2], len: 0.013 * hs, width: 0.0028 * hs * (f.browThick ?? 1) * (1 - t * 0.45), flat: 0.35, droop: 0.05, segs: 3, side: [0, 0, 1] });
      }
      const g = hairClumps({ clumps });
      const brow = new THREE.Mesh(g, mat);
      const bone = this.bones[sx > 0 ? 'browL' : 'browR'];
      // geometry is in head-local space (relative to hc); convert to bone space
      const bw = this.worldRest[bone.name];
      brow.position.set(hc[0] - bw[0], hc[1] - bw[1], hc[2] - bw[2]);
      bone.add(brow);
      this.brows.push(brow);
    }
  }

  buildPiece(piece) {
    const sc = new Sculpt();
    for (const p of piece.prims) {
      if (p.op === 'sub') sc.sub(p, p.k ?? 0.004);
      else if (p.op === 'inter') sc.inter(p, p.k ?? 0.004);
      else sc.add(p, p.k ?? 0.01);
    }
    if (piece.disp) sc.disp(piece.disp);
    if (piece.offset) sc.offset(piece.offset);
    const b = piece.bounds ?? boundsOf(piece.prims.filter((p) => !p.op), 0.03);
    const g = polygonise(sc, b.min, b.max, piece.res ?? 0.006, { aoScale: piece.aoScale ?? 1 });
    const skinPrims = piece.prims.filter((p) => !p.op && p.bone);
    skinWeights(g, piece.weightPrims ?? skinPrims, this.boneIndex, { softness: piece.softness ?? 0.03 });
    if (piece.color) {
      const pos = g.attributes.position.array, cols = new Float32Array(pos.length), c = new THREE.Color();
      for (let i = 0; i < pos.length / 3; i++) { piece.color(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2], c); cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b; }
      g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    }
    const m = this.addSkinned(g, piece.material, piece.name);
    if (piece.after) piece.after(m, sc, this);
    return m;
  }

  buildGlove(side, H, scale) {
    const d = this.def;
    const prims = H.prims.filter((p) => !p.nail && (p.bone.startsWith('hand') || /0[LR]$/.test(p.bone)));
    const sc = new Sculpt();
    for (const p of prims) sc.add(p, p.k);
    sc.offset(0.0016 * scale);
    // open fingertips: clip along each finger's first segment
    const b = boundsOf(prims, 0.02);
    const g = polygonise(sc, b.min, b.max, 0.0021 * scale, { aoScale: 0.35 });
    skinWeights(g, prims, this.boneIndex, { softness: 0.004 });
    this.addSkinned(g, d.gloves, 'glove' + side);
  }

  buildHair(spec) {
    // hair cap (sculpted volume) + strand clumps
    const hc = this.headCentre();
    const mat = hairMaterial(spec.color, spec.spec ?? 0.5);
    if (spec.cap) {
      const sc = spec.cap;
      const b = spec.capBounds;
      const g = polygonise(sc, b.min, b.max, spec.capRes ?? 0.003, { aoScale: 0.5 });
      const cols = new Float32Array(g.attributes.position.count * 3).fill(0.75);
      g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      skinWeights(g, [Object.assign(P.sphere(hc, 0.1), { bone: 'head' })], this.boneIndex);
      const capMat = mat.clone(); capMat.side = THREE.FrontSide;
      this.addSkinned(g, capMat, 'hairCap');
    }
    if (spec.clumps.length) {
      const g = hairClumps(spec);
      const mesh = new THREE.Mesh(g, mat);
      mesh.position.set(-this.J.head[0], -this.J.head[1], -this.J.head[2]);
      this.bones.head.add(mesh);
      this.hairMesh = mesh;
    }
    if (spec.tail) {
      // ponytail on a 3-bone spring chain
      this.tail = spec.tail(this, mat);
    }
  }
}

function boundsOf(prims, pad) {
  const min = [1e9, 1e9, 1e9], max = [-1e9, -1e9, -1e9];
  for (const p of prims) { if (!p.min) continue; for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i], p.min[i] - pad); max[i] = Math.max(max[i], p.max[i] + pad); } }
  return { min, max };
}

export { boundsOf, V, add, mul, lerp3, norm, cross };
