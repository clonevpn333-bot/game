// Vehicle models. Bodies are lofted through cross sections so they have real
// curves (hood slope, tumblehome, rounded flanks), with a glass greenhouse,
// pillars, wheel arches, spoked rims with brake discs, light housings, grilles,
// plates, mirrors, door seams, handles, wipers and exhausts. Parts are tagged
// for per-instance paint (aPaint 1), lights (aGlow) and surface type.
import * as THREE from 'three';
import { ModelKit } from './materials.js';
import { VTYPES } from '../sim/traffic.js';

const DARK = '#151618', TIRE = '#161616', TRIM = '#2a2c30', CHROME = '#c8ccd0', GLASS = '#121a22', P = '#ffffff';

function wheel(k, x, y, z, r, w, side, opts = {}) {
  const rot = [0, 0, Math.PI / 2];
  k.surf('rubber');
  k.lathe(x, y, z, [[r * 0.64, -w / 2], [r * 0.93, -w / 2], [r, -w / 2 + 0.04], [r, w / 2 - 0.04], [r * 0.93, w / 2], [r * 0.64, w / 2]], TIRE, 16, 0, 0, rot);
  k.surf(opts.steel ? 'metal' : 'chrome');
  const rimC = opts.rim || (opts.steel ? '#3a3c40' : '#b8bcc2');
  const face = x + side * (w / 2 - 0.02);
  k.cyl(face - side * 0.04, y, z, r * 0.64, 0.05, rimC, 16, 0, 0, rot);
  k.surf('metal');
  k.cyl(face - side * 0.12, y, z, r * 0.5, 0.03, '#5a5450', 14, 0, 0, rot); // brake disc
  k.surf(opts.steel ? 'metal' : 'chrome');
  const spokes = opts.spokes ?? 5;
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2;
    k.box(face, y + Math.cos(a) * r * 0.32, z + Math.sin(a) * r * 0.32, 0.03, r * 0.5, r * 0.11, rimC, 0, 0, [a, 0, 0]);
  }
  k.cyl(face + side * 0.005, y, z, r * 0.14, 0.04, '#d8dce0', 10, 0, 0, rot);
}

function arches(k, len, wid, zf, zb, r) {
  k.surf('plastic');
  for (const z of [zf, zb]) for (const sx of [-1, 1]) {
    const g = new THREE.TorusGeometry(r + 0.07, 0.045, 5, 14, Math.PI);
    k.geo(g, '#101012', 0, 0, new THREE.Matrix4().makeRotationY(Math.PI / 2).setPosition(sx * (wid / 2 - 0.02), r + 0.02, z));
  }
}

function plates(k, len, wid, yF, yB) {
  k.surf('metal');
  k.rbox(0, yF, len / 2 + 0.03, 0.52, 0.12, 0.02, 0.01, '#e8e8e0');
  k.rbox(0, yB, -len / 2 - 0.03, 0.52, 0.12, 0.02, 0.01, '#e8e8e0');
  k.box(0, yB, -len / 2 - 0.042, 0.4, 0.05, 0.005, '#2a3a6a');
}

function headlights(k, len, wid, y, opts = {}) {
  const w = opts.w ?? 0.36, h = opts.h ?? 0.13;
  for (const sx of [-1, 1]) {
    const x = sx * (wid / 2 - (opts.inset ?? 0.3));
    k.surf('chrome');
    k.rbox(x, y, len / 2 - 0.02, w + 0.04, h + 0.04, 0.08, 0.03, '#202226');
    k.surf('glass');
    k.rbox(x, y, len / 2 + 0.005, w, h, 0.06, 0.03, '#fff6e0', 0, 1);
    if (opts.drl !== false) k.box(x, y - h / 2 - 0.03, len / 2 + 0.01, w * 0.8, 0.02, 0.03, '#ffffff', 0, 1);
  }
}
function taillights(k, len, wid, y, opts = {}) {
  const w = opts.w ?? 0.38, h = opts.h ?? 0.13;
  k.surf('glass');
  for (const sx of [-1, 1]) {
    k.rbox(sx * (wid / 2 - (opts.inset ?? 0.26)), y, -len / 2 - 0.005, w, h, 0.06, 0.03, '#ff2a1a', 0, 2);
    if (opts.wrap !== false) k.rbox(sx * (wid / 2 - 0.02), y, -len / 2 + 0.16, 0.05, h * 0.9, 0.24, 0.02, '#ff2a1a', 0, 2);
    k.box(sx * (wid / 2 - (opts.inset ?? 0.26)) - sx * w * 0.32, y - 0.02, -len / 2 - 0.01, w * 0.25, h * 0.5, 0.04, '#f0f0f0');
  }
}

// passenger car: lofted lower body + greenhouse
function car(t, o = {}) {
  const T = VTYPES[t];
  const L = T.len, W = T.wid;
  const k = new ModelKit();
  const r = o.wheel ?? 0.33;
  const sill = r * 0.95, belt = o.belt ?? 0.92, roof = o.roof ?? 1.42;
  const nose = o.nose ?? 0.66, tail = o.tail ?? 0.9;
  const zf = L * 0.33, zb = -L * 0.31;
  const round = o.round ?? 0.55;
  // lower body (painted)
  k.surf('none');
  const lower = [
    { z: -L / 2, w: W * 0.94, yb: sill + 0.04, yt: tail - 0.05, r: round },
    { z: -L / 2 + 0.12, w: W * 0.99, yb: sill - 0.03, yt: tail + 0.02, r: round },
    { z: -L / 2 + 0.6, w: W, yb: sill - 0.05, yt: o.hatch ? belt + 0.02 : tail + 0.04, r: round },
    { z: zb, w: W, yb: sill - 0.05, yt: belt, r: round },
    { z: 0, w: W, yb: sill - 0.06, yt: belt, r: round },
    { z: zf, w: W * 0.995, yb: sill - 0.05, yt: belt - 0.02, r: round },
    { z: L / 2 - 0.45, w: W * 0.98, yb: sill - 0.02, yt: nose + 0.06, r: round },
    { z: L / 2 - 0.08, w: W * 0.94, yb: sill + 0.03, yt: nose - 0.03, r: round },
    { z: L / 2, w: W * 0.88, yb: sill + 0.08, yt: nose - 0.1, r: round },
  ];
  k.loft(lower, P, 1, 0, 18);
  // greenhouse: glass loft with a painted roof cap
  const cabLen = L * (o.cab ?? 0.46), cabOff = o.cabOff ?? -0.04 * L;
  const zr = cabOff - cabLen / 2 - (o.hatch ? 0 : 0.15), zw = cabOff + cabLen / 2 + 0.25;
  const rw = W * (o.roofW ?? 0.76);
  const gh = [
    { z: o.hatch ? -L / 2 + 0.2 : zr - 0.1, w: W * 0.9, yb: belt - 0.06, yt: belt + (o.hatch ? 0.25 : 0.02), r: 0.4 },
    { z: (o.hatch ? -L / 2 + 0.38 : zr + 0.45), w: rw, yb: belt - 0.06, yt: roof, r: 0.4 },
    { z: zw - (o.rake ?? 0.75), w: rw, yb: belt - 0.06, yt: roof, r: 0.4 },
    { z: zw, w: W * 0.9, yb: belt - 0.06, yt: belt + 0.02, r: 0.4 },
  ];
  k.loft(gh, GLASS, 0, 7, 16);
  const rz0 = gh[1].z + 0.08, rz1 = gh[2].z - 0.06;
  k.rbox(0, roof + 0.005, (rz0 + rz1) / 2, rw + 0.04, 0.06, rz1 - rz0 + 0.14, 0.03, P, 1);
  // pillars (painted)
  for (const sx of [-1, 1]) {
    k.tube([[sx * W * 0.44, belt, zw - 0.05], [sx * rw * 0.5, roof, gh[2].z]], 0.045, P, 5, 1);
    k.tube([[sx * W * 0.44, belt, gh[0].z + 0.12], [sx * rw * 0.5, roof, gh[1].z]], o.hatch ? 0.07 : 0.06, P, 5, 1);
    k.box(sx * (W * 0.42 + 0.0), (belt + roof) / 2, (rz0 + rz1) / 2 - 0.1, 0.05, roof - belt, 0.09, P, 1, 0, [0, 0, sx * 0.12]);
    // door seams, handles, side skirt
    k.surf('plastic');
    for (const z of [zw - 0.3, (rz0 + rz1) / 2 - 0.08, o.twoDoor ? null : gh[1].z + 0.15]) if (z != null) k.box(sx * (W / 2 + 0.003), (sill + belt) / 2, z, 0.006, belt - sill - 0.08, 0.012, '#0e0e10');
    k.surf('chrome');
    k.rbox(sx * (W / 2 + 0.012), belt - 0.1, (rz0 + rz1) / 2 + 0.05, 0.02, 0.03, 0.14, 0.01, '#c0c4c8');
    if (!o.twoDoor) k.rbox(sx * (W / 2 + 0.012), belt - 0.1, gh[1].z - 0.05, 0.02, 0.03, 0.14, 0.01, '#c0c4c8');
    k.surf('none');
    // mirrors
    k.rbox(sx * (W / 2 + 0.1), belt + 0.08, zw - 0.35, 0.16, 0.1, 0.12, 0.03, P, 1);
    k.surf('glass'); k.box(sx * (W / 2 + 0.13), belt + 0.08, zw - 0.42, 0.11, 0.07, 0.01, '#9aa8b4');
    k.surf('none');
  }
  // wipers
  k.surf('plastic');
  for (const sx of [-0.25, 0.2]) k.box(sx, belt + 0.06, zw - 0.08, 0.5, 0.015, 0.03, '#0a0a0a', 0, 0, [0.5, 0, 0.12]);
  // grille + bumpers
  k.surf('plastic');
  k.rbox(0, sill + 0.12, L / 2 + 0.02, W * 0.9, 0.2, 0.14, 0.05, o.chromeBumpers ? CHROME : TRIM);
  k.rbox(0, sill + 0.12, -L / 2 - 0.02, W * 0.9, 0.2, 0.14, 0.05, o.chromeBumpers ? CHROME : TRIM);
  k.rbox(0, nose - 0.17, L / 2 + 0.005, W * (o.grilleW ?? 0.4), 0.15, 0.05, 0.03, '#0c0d0e');
  k.surf('chrome');
  for (let i = 0; i < 3; i++) k.box(0, nose - 0.22 + i * 0.05, L / 2 + 0.03, W * (o.grilleW ?? 0.4) * 0.9, 0.012, 0.01, '#9aa0a6');
  k.surf('metal');
  k.cyl(-W * 0.3, sill + 0.02, -L / 2 - 0.04, 0.04, 0.16, '#8a8c90', 8, 0, 0, [Math.PI / 2, 0, 0]);
  headlights(k, L, W, nose - 0.12, o.lights);
  taillights(k, L, W, tail - 0.14, o.tails);
  plates(k, L, W, sill + 0.13, sill + 0.3);
  arches(k, L, W, zf, zb, r);
  for (const z of [zf, zb]) for (const sx of [-1, 1]) wheel(k, sx * (W / 2 - 0.13), r, z, r, 0.24, sx, { spokes: o.spokes, steel: o.steel });
  return k;
}

function lightbar(k, y, z, w = 1.2) {
  k.surf('plastic');
  k.rbox(0, y, z, w + 0.06, 0.08, 0.34, 0.03, '#1a1a1c');
  k.surf('glass');
  k.rbox(-w / 4, y + 0.08, z, w / 2 - 0.04, 0.1, 0.28, 0.04, '#ff2020', 0, 3);
  k.rbox(w / 4, y + 0.08, z, w / 2 - 0.04, 0.1, 0.28, 0.04, '#2040ff', 0, 4);
}

// cab-over/conventional truck cab with a separate body
function truck(t, o = {}) {
  const T = VTYPES[t];
  const L = T.len, W = T.wid;
  const k = new ModelKit();
  const r = o.wheel ?? 0.44;
  const cabLen = o.cabLen ?? 2.1;
  const cz = L / 2 - cabLen / 2;
  const floor = r + 0.25;
  const cabC = o.cabColor || P, cabPaint = o.cabPaint ?? 1;
  // chassis rails
  k.surf('metal');
  k.box(0, r + 0.05, 0, W * 0.6, 0.22, L * 0.94, DARK);
  // cab
  k.surf('none');
  k.loft([
    { z: L / 2 - cabLen, w: W * 0.98, yb: floor, yt: floor + 1.95, r: 0.25 },
    { z: L / 2 - 0.55, w: W, yb: floor - 0.1, yt: floor + 1.92, r: 0.25 },
    { z: L / 2 - 0.12, w: W * 0.97, yb: floor - 0.1, yt: floor + 1.0, r: 0.35 },
    { z: L / 2, w: W * 0.9, yb: floor - 0.05, yt: floor + 0.8, r: 0.45 },
  ], cabC, cabPaint, 0, 16);
  k.surf('glass');
  k.box(0, floor + 1.4, L / 2 - 0.36, W * 0.84, 0.75, 0.05, GLASS, 0, 7, [-0.35, 0, 0]);
  for (const sx of [-1, 1]) k.box(sx * (W / 2 + 0.005), floor + 1.4, cz + 0.2, 0.02, 0.6, cabLen * 0.5, GLASS, 0, 7);
  k.surf('none');
  for (const sx of [-1, 1]) {
    k.surf('metal'); k.cyl(sx * (W / 2 + 0.22), floor + 1.4, L / 2 - 0.5, 0.015, 0.7, '#2a2a2a', 5);
    k.surf('plastic'); k.rbox(sx * (W / 2 + 0.22), floor + 1.45, L / 2 - 0.5, 0.06, 0.32, 0.2, 0.02, '#1a1a1c');
    k.surf('metal'); k.rbox(sx * (W / 2 - 0.05), floor - 0.15, cz + 0.2, 0.25, 0.08, 0.5, 0.02, '#6a6c70');
  }
  k.surf('plastic');
  k.rbox(0, floor + 0.35, L / 2 + 0.03, W * 0.7, 0.45, 0.06, 0.04, '#121314');
  k.surf('chrome');
  for (let i = 0; i < 4; i++) k.box(0, floor + 0.18 + i * 0.11, L / 2 + 0.065, W * 0.66, 0.02, 0.01, '#a0a4a8');
  k.surf('plastic');
  k.rbox(0, r + 0.15, L / 2 + 0.06, W, 0.28, 0.16, 0.05, o.chromeBumper ? CHROME : TRIM);
  headlights(k, L + 0.04, W, floor + 0.35, { w: 0.32, h: 0.18, inset: 0.24 });
  // body
  const bodyLen = L - cabLen - 0.15;
  if (o.body !== false) {
    const bh = (o.bodyH ?? T.hgt) - floor;
    k.surf(o.bodyColor && !o.bodyPaint ? 'metal' : 'none');
    k.rbox(0, floor + bh / 2, -L / 2 + bodyLen / 2, W, bh, bodyLen, 0.06, o.bodyColor || P, o.bodyPaint ?? 1);
    // vertical ribs + rear doors
    k.surf('metal');
    for (let z = -L / 2 + 0.4; z < -L / 2 + bodyLen - 0.2; z += 0.6) for (const sx of [-1, 1]) k.box(sx * (W / 2 + 0.01), floor + bh / 2, z, 0.02, bh - 0.1, 0.05, '#9a9c9e');
    k.box(0, floor + bh / 2, -L / 2 - 0.01, 0.03, bh - 0.12, 0.02, '#4a4c50');
    for (const sx of [-1, 1]) k.box(sx * 0.3, floor + bh / 2, -L / 2 - 0.02, 0.04, bh * 0.7, 0.03, '#8a8c90');
  }
  taillights(k, L, W, r + 0.35, { wrap: false, w: 0.3, h: 0.16 });
  plates(k, L, W, r + 0.2, r + 0.2);
  const zf = L / 2 - 0.85, zb = -L / 2 + (o.rearAxle ?? 1.2);
  arches(k, L, W, zf, zb, r);
  wheel(k, -(W / 2 - 0.16), r, zf, r, 0.3, -1, { steel: true, spokes: 8 });
  wheel(k, W / 2 - 0.16, r, zf, r, 0.3, 1, { steel: true, spokes: 8 });
  for (const sx of [-1, 1]) {
    wheel(k, sx * (W / 2 - 0.16), r, zb, r, 0.3, sx, { steel: true, spokes: 8 });
    if (o.dual) wheel(k, sx * (W / 2 - 0.16), r, zb - 1.05, r, 0.3, sx, { steel: true, spokes: 8 });
  }
  return k;
}

// distant LOD: body silhouette + glass + plain wheels
export function buildLowModels() {
  const M = {};
  const lo = (t, o = {}) => {
    const T = VTYPES[t];
    const L = T.len, W = T.wid, H = T.hgt;
    const k = new ModelKit();
    const r = o.r ?? 0.36;
    if (o.box) {
      k.box(0, r + (H - r) / 2, 0, W, H - r, L, o.color || P, o.color ? 0 : 1);
      k.box(0, r + (H - r) * 0.72, L / 2 - (o.cab ?? 1.0), W + 0.02, (H - r) * 0.3, 0.6, GLASS, 0, 7);
    } else {
      k.loft([
        { z: -L / 2, w: W * 0.95, yb: r * 0.95, yt: o.tail ?? 0.9, r: 0.5 },
        { z: -L * 0.3, w: W, yb: r * 0.9, yt: o.belt ?? 0.95, r: 0.5 },
        { z: L * 0.3, w: W, yb: r * 0.9, yt: (o.belt ?? 0.95) - 0.05, r: 0.5 },
        { z: L / 2, w: W * 0.9, yb: r, yt: o.nose ?? 0.66, r: 0.5 },
      ], P, 1, 0, 10);
      k.loft([
        { z: -L * 0.3, w: W * 0.88, yb: (o.belt ?? 0.95) - 0.05, yt: (o.belt ?? 0.95) + 0.02, r: 0.4 },
        { z: -L * 0.18, w: W * 0.78, yb: (o.belt ?? 0.95) - 0.05, yt: H, r: 0.4 },
        { z: L * 0.08, w: W * 0.78, yb: (o.belt ?? 0.95) - 0.05, yt: H, r: 0.4 },
        { z: L * 0.24, w: W * 0.88, yb: (o.belt ?? 0.95) - 0.05, yt: (o.belt ?? 0.95) + 0.02, r: 0.4 },
      ], GLASS, 0, 7, 8);
    }
    for (const sx of [-1, 1]) {
      k.box(sx * (W / 2 - 0.25), (o.nose ?? 0.66) - 0.12, L / 2 + 0.01, 0.34, 0.12, 0.04, '#fff6e0', 0, 1);
      k.box(sx * (W / 2 - 0.22), (o.tail ?? 0.9) - 0.14, -L / 2 - 0.01, 0.36, 0.12, 0.04, '#ff2a1a', 0, 2);
      for (const z of [L * 0.32, -L * 0.3]) k.cyl(sx * (W / 2 - 0.13), r, z, r, 0.24, TIRE, 8, 0, 0, [0, 0, Math.PI / 2]);
    }
    if (t === 'police') { k.box(-0.3, H + 0.06, -0.25, 0.55, 0.1, 0.28, '#ff2020', 0, 3); k.box(0.3, H + 0.06, -0.25, 0.55, 0.1, 0.28, '#2040ff', 0, 4); }
    if (t === 'ambulance' || t === 'firetruck') { k.box(-0.4, H + 0.06, L / 2 - 1.5, 0.6, 0.12, 0.28, '#ff2020', 0, 3); k.box(0.4, H + 0.06, L / 2 - 1.5, 0.6, 0.12, 0.28, '#2040ff', 0, 4); }
    if (t === 'taxi') k.box(0, H + 0.08, -0.3, 0.7, 0.18, 0.28, '#f8e070', 0, 5);
    M[t] = k.build();
  };
  lo('hatch', { tail: 1.0 }); lo('sedan'); lo('oldsedan'); lo('taxi'); lo('police');
  lo('suv', { r: 0.39, belt: 1.12, nose: 0.98, tail: 1.1 }); lo('sports', { belt: 0.8, nose: 0.58, tail: 0.8 });
  lo('pickup', { r: 0.4, belt: 1.1, nose: 0.85, tail: 1.1 }); lo('oldpickup', { r: 0.4, belt: 1.1, nose: 0.85, tail: 1.1 });
  lo('van', { box: true, r: 0.38, cab: 0.8 });
  lo('delivery', { box: true, r: 0.44, cab: 1.0 }); lo('ambulance', { box: true, r: 0.44, color: '#f4f4f4' }); lo('firetruck', { box: true, r: 0.44, color: '#c8221a', cab: 1.2 });
  lo('bus', { box: true, r: 0.48, cab: 5.5 }); lo('tow', { box: true, r: 0.44 }); lo('utility', { box: true, r: 0.44, color: '#f0f0ec' }); lo('construction', { box: true, r: 0.44, color: '#c0a060' });
  return M;
}

export function buildVehicleModels() {
  const M = {};
  M.hatch = car('hatch', { hatch: true, cab: 0.58, cabOff: -0.2, roof: 1.45, belt: 0.93, nose: 0.7, rake: 0.85 }).build();
  M.sedan = car('sedan', {}).build();
  M.oldsedan = car('oldsedan', { roof: 1.47, cab: 0.42, round: 0.3, chromeBumpers: true, steel: true, spokes: 6, grilleW: 0.62, roofW: 0.8 }).build();
  M.suv = car('suv', { belt: 1.12, roof: 1.75, cab: 0.62, cabOff: -0.35, wheel: 0.39, nose: 0.98, tail: 1.1, round: 0.35, hatch: true, grilleW: 0.55, rake: 0.6 }).build();
  M.sports = car('sports', { belt: 0.78, roof: 1.18, cab: 0.36, cabOff: -0.25, wheel: 0.34, nose: 0.58, tail: 0.8, twoDoor: true, roofW: 0.7, rake: 0.95, spokes: 10, lights: { h: 0.08, w: 0.42 }, tails: { h: 0.06, w: 0.5 } }).build();
  {
    const k = car('taxi', {});
    k.surf('plastic'); k.rbox(0, 1.55, -0.3, 0.72, 0.2, 0.28, 0.06, '#f8e070', 0, 5);
    k.box(0, 1.55, -0.16, 0.5, 0.12, 0.01, '#202020');
    // checker stripe
    k.surf('none');
    for (let i = 0; i < 10; i++) for (const sx of [-1, 1]) k.box(sx * (VTYPES.taxi.wid / 2 + 0.004), 0.62, -1.4 + i * 0.3, 0.006, 0.09, 0.15, i % 2 ? '#141414' : '#f4f4f0');
    M.taxi = k.build();
  }
  {
    const T = VTYPES.police;
    const k = car('police', { belt: 0.95, roof: 1.47, grilleW: 0.5, steel: true, spokes: 8 });
    lightbar(k, 1.52, -0.25);
    // black & white livery, push bar, spotlight, antennas
    k.surf('none');
    for (const sx of [-1, 1]) {
      k.box(sx * (T.wid / 2 + 0.004), 0.68, 0.1, 0.006, 0.44, T.len * 0.46, '#121418');
      k.box(sx * (T.wid / 2 + 0.006), 0.78, 0.0, 0.006, 0.08, 1.1, '#d0b040');
    }
    k.surf('metal');
    k.rbox(0, 0.55, T.len / 2 + 0.2, T.wid * 0.6, 0.5, 0.08, 0.03, '#1a1a1a');
    for (const sx of [-0.4, 0.4]) k.rbox(sx, 0.55, T.len / 2 + 0.12, 0.08, 0.5, 0.18, 0.03, '#1a1a1a');
    k.surf('chrome'); k.cyl(-T.wid / 2 - 0.05, 1.0, 0.9, 0.08, 0.14, '#c8c8c8', 10, 0, 0, [Math.PI / 2, 0, 0]);
    k.surf('metal'); k.cyl(0.4, 1.8, -1.6, 0.008, 0.6, '#1a1a1a', 4);
    M.police = k.build();
  }
  // pickups
  for (const t of ['pickup', 'oldpickup']) {
    const T = VTYPES[t];
    const old = t === 'oldpickup';
    const L = T.len, W = T.wid;
    const k = new ModelKit();
    const r = 0.4, sill = r * 0.95, belt = 1.1, roof = 1.82;
    k.surf('none');
    k.loft([
      { z: -L / 2, w: W * 0.97, yb: sill, yt: belt - 0.02, r: 0.25 },
      { z: L * 0.05, w: W, yb: sill - 0.05, yt: belt, r: 0.3 },
      { z: L / 2 - 0.5, w: W * 0.99, yb: sill - 0.03, yt: belt - 0.08, r: 0.35 },
      { z: L / 2, w: W * 0.9, yb: sill + 0.05, yt: belt - 0.25, r: 0.45 },
    ], P, 1, 0, 16);
    const cz0 = -L * 0.06, cz1 = L * 0.25;
    k.loft([
      { z: cz0, w: W * 0.9, yb: belt - 0.05, yt: roof, r: 0.3 },
      { z: cz1 - 0.55, w: W * 0.86, yb: belt - 0.05, yt: roof, r: 0.3 },
      { z: cz1, w: W * 0.9, yb: belt - 0.05, yt: belt + 0.05, r: 0.3 },
    ], GLASS, 0, 7, 14);
    k.rbox(0, roof + 0.01, (cz0 + cz1 - 0.55) / 2, W * 0.88, 0.07, cz1 - 0.55 - cz0 + 0.12, 0.03, P, 1);
    for (const sx of [-1, 1]) {
      k.tube([[sx * W * 0.44, belt, cz1 - 0.05], [sx * W * 0.43, roof, cz1 - 0.55]], 0.05, P, 5, 1);
      k.box(sx * W * 0.445, (belt + roof) / 2, cz0 + 0.05, 0.06, roof - belt, 0.12, P, 1);
      k.rbox(sx * (W / 2 + 0.12), belt + 0.1, cz1 - 0.3, 0.16, 0.14, 0.12, 0.03, old ? CHROME : P, old ? 0 : 1);
    }
    // bed
    k.surf('metal');
    k.box(0, belt - 0.04, -L * 0.28, W * 0.86, 0.04, L * 0.42, '#2a2a2a');
    k.surf('none');
    for (const sx of [-1, 1]) k.rbox(sx * (W / 2 - 0.05), belt + 0.2, -L * 0.27, 0.1, 0.42, L * 0.44, 0.03, P, 1);
    k.rbox(0, belt + 0.2, -L / 2 + 0.05, W, 0.42, 0.1, 0.03, P, 1);
    k.rbox(0, belt + 0.2, cz0 - 0.08, W * 0.9, 0.42, 0.08, 0.03, P, 1);
    k.surf('plastic');
    k.rbox(0, sill + 0.12, L / 2 + 0.04, W, 0.24, 0.16, 0.05, old ? CHROME : TRIM);
    k.rbox(0, sill + 0.12, -L / 2 - 0.04, W, 0.24, 0.16, 0.05, old ? CHROME : TRIM);
    k.rbox(0, belt - 0.4, L / 2 + 0.01, W * 0.62, 0.3, 0.05, 0.03, '#0c0d0e');
    k.surf('chrome');
    for (let i = 0; i < 4; i++) k.box(0, belt - 0.52 + i * 0.08, L / 2 + 0.035, W * 0.58, 0.015, 0.01, '#a0a4a8');
    headlights(k, L, W, belt - 0.42, { w: 0.34, h: 0.2, inset: 0.3 });
    taillights(k, L, W, belt - 0.2, { wrap: false, w: 0.16, h: 0.36, inset: 0.12 });
    plates(k, L, W, sill + 0.13, sill + 0.35);
    arches(k, L, W, L * 0.33, -L * 0.3, r);
    for (const z of [L * 0.33, -L * 0.3]) for (const sx of [-1, 1]) wheel(k, sx * (W / 2 - 0.15), r, z, r, 0.28, sx, { steel: old, spokes: old ? 6 : 6 });
    M[t] = k.build();
  }
  // van
  {
    const T = VTYPES.van;
    const L = T.len, W = T.wid;
    const k = new ModelKit();
    const r = 0.38, sill = r;
    k.surf('none');
    k.loft([
      { z: -L / 2, w: W * 0.98, yb: sill, yt: 2.2, r: 0.3 },
      { z: L / 2 - 1.1, w: W, yb: sill - 0.05, yt: 2.25, r: 0.3 },
      { z: L / 2 - 0.55, w: W * 0.98, yb: sill - 0.05, yt: 1.35, r: 0.4 },
      { z: L / 2, w: W * 0.92, yb: sill + 0.05, yt: 1.0, r: 0.5 },
    ], P, 1, 0, 16);
    k.surf('glass');
    k.box(0, 1.75, L / 2 - 0.82, W * 0.86, 0.7, 0.05, GLASS, 0, 7, [-0.65, 0, 0]);
    for (const sx of [-1, 1]) {
      k.box(sx * (W / 2 + 0.005), 1.7, L / 2 - 1.5, 0.02, 0.5, 0.75, GLASS, 0, 7);
      k.surf('none'); k.rbox(sx * (W / 2 + 0.12), 1.5, L / 2 - 1.1, 0.16, 0.16, 0.12, 0.03, P, 1); k.surf('glass');
    }
    k.surf('plastic');
    k.box(W / 2 + 0.006, 1.2, -0.4, 0.006, 1.4, 0.02, '#0e0e10');
    k.box(W / 2 + 0.008, 1.95, -0.6, 0.02, 0.04, 2.0, '#2a2a2c');
    k.rbox(0, sill + 0.12, L / 2 + 0.03, W, 0.24, 0.14, 0.05, TRIM);
    k.rbox(0, sill + 0.12, -L / 2 - 0.03, W, 0.24, 0.14, 0.05, TRIM);
    k.rbox(0, 0.85, L / 2 + 0.005, W * 0.5, 0.18, 0.05, 0.03, '#0c0d0e');
    headlights(k, L, W, 0.88, { w: 0.34, h: 0.16 });
    taillights(k, L, W, 1.1, { wrap: false, w: 0.16, h: 0.42, inset: 0.12 });
    plates(k, L, W, sill + 0.13, sill + 0.35);
    arches(k, L, W, L * 0.33, -L * 0.32, r);
    for (const z of [L * 0.33, -L * 0.32]) for (const sx of [-1, 1]) wheel(k, sx * (W / 2 - 0.14), r, z, r, 0.26, sx, { steel: true, spokes: 6 });
    M.van = k.build();
  }
  {
    const T = VTYPES.delivery;
    const k = truck('delivery', { bodyColor: '#f0eee8', bodyPaint: 0, cabLen: 1.9 });
    for (const sx of [-1, 1]) { k.surf('none'); k.box(sx * (T.wid / 2 + 0.012), 1.7, -0.9, 0.01, 0.8, 2.6, '#c84a2a'); k.box(sx * (T.wid / 2 + 0.014), 1.25, -0.9, 0.01, 0.08, 2.6, '#2a2a2a'); }
    M.delivery = k.build();
  }
  {
    const T = VTYPES.ambulance;
    const k = truck('ambulance', { bodyColor: '#f4f4f4', bodyPaint: 0, cabColor: '#f4f4f4', cabPaint: 0, cabLen: 2.0 });
    k.surf('none');
    for (const sx of [-1, 1]) {
      k.box(sx * (T.wid / 2 + 0.012), 1.3, -0.6, 0.01, 0.28, T.len - 2.4, '#d02020');
      k.box(sx * (T.wid / 2 + 0.014), 2.0, -1.0, 0.01, 0.7, 0.24, '#d02020');
      k.box(sx * (T.wid / 2 + 0.014), 2.0, -1.0, 0.01, 0.24, 0.7, '#d02020');
    }
    lightbar(k, 2.66, 2.3, 1.3);
    k.surf('glass');
    for (const sx of [-1, 1]) { k.rbox(sx * 0.85, T.hgt + 0.06, -T.len / 2 + 0.2, 0.3, 0.16, 0.2, 0.04, '#ff2020', 0, 3); k.rbox(sx * 0.85, T.hgt + 0.06, T.len / 2 - 2.2, 0.3, 0.16, 0.2, 0.04, '#2040ff', 0, 4); }
    M.ambulance = k.build();
  }
  {
    const T = VTYPES.firetruck;
    const k = truck('firetruck', { bodyColor: '#c8221a', bodyPaint: 0, cabColor: '#c8221a', cabPaint: 0, cabLen: 2.5, bodyH: 2.7, dual: true, rearAxle: 2.0, chromeBumper: true });
    k.surf('metal');
    for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) k.rbox(sx * (T.wid / 2 + 0.01), 1.55, -3.0 + i * 1.6, 0.03, 1.3, 1.4, 0.03, '#b8bcc0');
    k.surf('chrome');
    k.box(0, 3.05, -0.8, 0.9, 0.16, 7.2, CHROME);
    for (const sx of [-0.42, 0.42]) k.box(sx, 3.15, -0.8, 0.06, 0.12, 7.2, CHROME);
    for (let i = 0; i < 12; i++) k.box(0, 3.15, -4.2 + i * 0.6, 0.85, 0.05, 0.05, '#9a9c9e');
    k.surf('rubber');
    k.cyl(0.9, 2.85, -2.5, 0.35, 0.3, '#c8a040', 14, 0, 0, [0, 0, Math.PI / 2]);
    lightbar(k, 2.75, 3.4, 1.6);
    M.firetruck = k.build();
  }
  {
    const T = VTYPES.bus;
    const L = T.len, W = T.wid;
    const k = new ModelKit();
    const r = 0.48, fl = 0.55;
    k.surf('none');
    k.rbox(0, fl + 0.6, 0, W, 1.2, L, 0.12, P, 1);
    k.surf('glass');
    k.rbox(0, fl + 1.65, 0, W + 0.01, 1.05, L - 0.4, 0.1, GLASS, 0, 7);
    k.rbox(0, fl + 1.5, L / 2 - 0.05, W * 0.92, 1.4, 0.1, 0.08, GLASS, 0, 7);
    k.surf('none');
    k.rbox(0, fl + 2.42, 0, W, 0.5, L, 0.14, '#f0f0f0');
    k.surf('metal');
    k.rbox(0, fl + 2.78, -1.0, 1.7, 0.28, 3.2, 0.08, '#c8c8c8');
    for (let i = 0; i < 6; i++) for (const sx of [-1, 1]) k.box(sx * (W / 2 + 0.012), fl + 1.65, -L / 2 + 1.0 + i * 1.95, 0.02, 1.0, 0.1, '#e8e8e8');
    // doors
    k.surf('glass');
    for (const z of [L / 2 - 1.0, -0.8]) { k.box(W / 2 + 0.015, fl + 1.1, z, 0.02, 2.0, 1.1, GLASS, 0, 7); }
    k.surf('none');
    k.box(0, fl + 2.45, L / 2 + 0.03, 1.6, 0.28, 0.04, '#ffb020', 0, 5);
    k.surf('plastic');
    k.rbox(0, r + 0.1, L / 2 + 0.05, W, 0.3, 0.14, 0.05, TRIM);
    k.rbox(0, r + 0.1, -L / 2 - 0.05, W, 0.3, 0.14, 0.05, TRIM);
    headlights(k, L, W, 0.95, { w: 0.4, h: 0.2, inset: 0.35 });
    taillights(k, L, W, 1.2, { wrap: false, w: 0.2, h: 0.4, inset: 0.15 });
    plates(k, L, W, 0.6, 0.6);
    arches(k, L, W, L * 0.32, -L * 0.26, r);
    for (const z of [L * 0.32, -L * 0.26]) for (const sx of [-1, 1]) wheel(k, sx * (W / 2 - 0.18), r, z, r, 0.32, sx, { steel: true, spokes: 8 });
    M.bus = k.build();
  }
  {
    const T = VTYPES.tow;
    const k = truck('tow', { body: false, cabLen: 2.2 });
    k.surf('metal');
    k.rbox(0, 1.05, -1.4, T.wid, 0.3, 3.6, 0.05, '#2a2a2e');
    k.box(0, 1.95, -2.6, 0.3, 1.6, 0.3, '#e8a020', 0, 0, [0.5, 0, 0]);
    k.box(0, 2.45, -1.8, 0.24, 0.24, 2.0, '#e8a020', 0, 0, [-0.35, 0, 0]);
    k.tube([[0, 2.9, -3.1], [0, 2.4, -3.4], [0, 1.6, -3.5]], 0.02, '#202020', 4);
    k.surf('glass');
    k.rbox(-0.5, 2.75, 0.6, 0.3, 0.14, 0.2, 0.04, '#ffa020', 0, 6);
    k.rbox(0.5, 2.75, 0.6, 0.3, 0.14, 0.2, 0.04, '#ffa020', 0, 6);
    M.tow = k.build();
  }
  {
    const T = VTYPES.utility;
    const k = truck('utility', { bodyColor: '#f0f0ec', bodyPaint: 0, bodyH: 1.75, cabLen: 2.1 });
    k.surf('metal');
    k.box(0, 2.05, -1.5, 0.3, 0.3, 2.6, '#f0c020');
    k.rbox(0, 2.4, -2.9, 0.9, 0.7, 0.9, 0.06, '#f0c020');
    k.surf('glass');
    k.rbox(-0.5, 2.75, 0.4, 0.3, 0.14, 0.2, 0.04, '#ffa020', 0, 6);
    k.rbox(0.5, 2.75, 0.4, 0.3, 0.14, 0.2, 0.04, '#ffa020', 0, 6);
    void T;
    M.utility = k.build();
  }
  {
    const T = VTYPES.construction;
    const k = truck('construction', { body: false, cabLen: 2.2 });
    k.surf('metal');
    k.taper(0, 1.0, -1.2, T.wid, 3.4, T.wid * 1.05, 3.6, 1.1, '#c0a060', 0);
    k.surf('concrete');
    k.blob(0, 2.05, -1.2, 0.9, 0.3, 1.4, '#8a7a68', 0, 0, 3, 0.3, 1);
    k.surf('glass');
    k.rbox(-0.5, 2.75, 0.6, 0.3, 0.14, 0.2, 0.04, '#ffa020', 0, 6);
    k.rbox(0.5, 2.75, 0.6, 0.3, 0.14, 0.2, 0.04, '#ffa020', 0, 6);
    M.construction = k.build();
  }
  return M;
}
