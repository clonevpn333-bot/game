// Character anatomy authored as signed distance fields (see sculpt.js).
// Four pieces are sculpted separately at their own resolution and cached by shape:
//   body  (torso, limbs, boots, garment hems/collars/cuffs, cloth folds)   ~9 mm cells
//   head  (skull, face, ears, neck, beard)                                ~2.6 mm cells
//   hair  (a shell over the scalp with a hairline and groomed grooves)    ~3 mm cells
//   hands (palm, jointed fingers, thumb, glove cuffs)                     ~2.6 mm cells
// Limbs are sculpted spread into an A-pose (arms ARM_A, legs LEG_A) so nothing fuses; the rig
// binds the skeleton in that pose, and the rest pose (arms hanging) comes back through skinning.
import { Part, Field, meshField, attributes, mirror, dropSpecks, ellipsoid, sphere, roundCone, capsule, roundBox, torus, custom, pivotZ, sstep, vnoise, smin } from './sculpt.js';

export const ARM_A = 0.52, LEG_A = 0.07;
export const TAG = { SKIN: 0, LIP: 1, TOP: 2, TOPD: 3, ACC: 4, PANTS: 5, PANTSD: 6, BOOT: 7, SOLE: 8, GLOVE: 9, HAIR: 10, NAIL: 11, SCALP: 12, BOOTD: 13 };

const CACHE = new Map();
const cached = (key, fn) => { if (!CACHE.has(key)) CACHE.set(key, fn()); return CACHE.get(key); };
export const anatomyCache = CACHE;
const add3 = (a, x, y, z) => [a.x + x, a.y + y, a.z + z];

// Outfit → garment shape options
export function garment(L) {
  const o = L.outfit;
  const g = { hem: 0.86, collar: 'crew', sleeve: 'long', cuff: false, boots: 'tall', coverall: false, jacket: false, gloves: false, tank: !!L.tank };
  if (o === 'runner') Object.assign(g, { hem: 0.845, collar: 'stand', cuff: true, jacket: true, gloves: true });
  if (o === 'runnerLight') Object.assign(g, { hem: 0.845, collar: 'stand', sleeve: 'rolled', jacket: true });
  if (o === 'engineer' || o === 'worker') Object.assign(g, { hem: 0, collar: 'coverall', sleeve: 'rolled', coverall: true });
  if (o === 'casual' || o === 'vendor' || o === 'smart') Object.assign(g, { hem: 0.9, collar: 'crew', boots: 'low' });
  if (L.socks) g.boots = 'socks';
  if (o === 'smart') g.collar = 'shirt';
  if (g.tank) { g.sleeve = 'none'; g.collar = 'tank'; }
  return g;
}

// The body's neck matches the head piece's neck exactly below the seam (rest y 1.438) and tucks
// 1.5 mm inside above it, so the two pieces meet without a step.
export const NECK_SEAM = 1.455, WRIST_SEAM = 0.852;
function neckPrim() { return roundCone([0, 1.358, -0.03], [0, 1.518, -0.019], 0.056, 0.047); }
// The trapezius pair and neck exactly as the torso blends them (absolute rest coordinates); the
// head piece uses the same field so the two pieces share one surface across the seam.
const TRAP_L = capsule([0, 1.4, -0.022], [0.125, 1.348, -0.014], 0.036), TRAP_R = capsule([0, 1.4, -0.022], [-0.125, 1.348, -0.014], 0.036), NECK = neckPrim();
function neckBase(x, y, z) { return smin(smin(TRAP_L.f(x, y, z), TRAP_R.f(x, y, z), 0.05), NECK.f(x, y, z), 0.04); }
// signed keep-functions for the seams (>= 0 kept), in sculpt space
const armAxis = (s) => [s * Math.sin(ARM_A), -Math.cos(ARM_A)];
function wristAlong(x, y, s) { const a = baseRest()[s > 0 ? 'armL' : 'armR'], u = armAxis(s); return (x - a.x) * u[0] + (y - a.y) * u[1]; }
const WRIST_T = 1.35 - WRIST_SEAM;
// hand-bone share of the skin around the wrist (identical on both sides of the seam)
const handFrac = (y) => sstep(0.885, 0.815, y);
// ------------------------------------------------------------------ body
// Sculpted once per garment at base proportions (sh = hw = bw = 1); the rig deforms the cached
// mesh to each character's build through its skin weights (see deformToBuild).
const V3 = (x, y, z) => ({ x, y, z });
export function baseRest(sh = 1, hw = 1) {
  return {
    armL: V3(0.18 * sh, 1.35, -0.005), foreL: V3(0.185 * sh, 1.07, -0.005), handL: V3(0.185 * sh, 0.82, 0),
    armR: V3(-0.18 * sh, 1.35, -0.005), foreR: V3(-0.185 * sh, 1.07, -0.005), handR: V3(-0.185 * sh, 0.82, 0),
    thighL: V3(0.09 * hw, 0.88, 0), shinL: V3(0.095 * hw, 0.47, 0.005), footL: V3(0.095 * hw, 0.075, 0),
    thighR: V3(-0.09 * hw, 0.88, 0), shinR: V3(-0.095 * hw, 0.47, 0.005), footR: V3(-0.095 * hw, 0.075, 0),
  };
}
export const isFem = (P) => P.fr > 0.55 && !P.kid;
export function sculptBody(P, L, B, lod) {
  const g = garment(L), fem = isFem(P);
  const key = keyOf('body', P, L, lod);
  return cached(key, () => buildBodyField(baseRest(), { sh: 1, hw: 1, bw: 1, fr: fem ? 0.85 : 0.4, kid: false }, g, B, lod));
}

function buildBodyField(rest, P, g, B, lod) {
  const { sh, hw, bw, fr, kid } = P;
  const wst = (bw * 0.6 + 0.4) * 0.9;
  const fem = fr > 0.55 && !kid;
  const bust = fem ? 0.04 + (fr - 0.55) * 0.05 : 0;
  const hem = g.hem;
  const nz = (x, y, z, s) => vnoise(x * s, y * s, z * s) - 0.5;

  // --- torso
  const torsoW = (x, y, z) => {
    const a = sstep(0.94, 1.08, y), b = sstep(1.1, 1.24, y), n = sstep(1.37, NECK_SEAM - 0.004, y);
    const ax = Math.abs(x), sw = sstep(0.09, 0.17, ax) * sstep(1.24, 1.34, y) * 0.55;
    const w = [[B.hips, 1 - a], [B.spine, a * (1 - b)], [B.chest, a * b * (1 - n) * (1 - sw)], [B.neck, n], [x > 0 ? B.shoulderL : B.shoulderR, a * b * (1 - n) * sw]];
    if (y < 0.86) { const t = sstep(0.86, 0.74, y) * 0.5 * sstep(0.02, 0.09, ax); w.push([x > 0 ? B.thighL : B.thighR, t]); w[0][1] *= 1 - t; }
    return w;
  };
  // Tags carry a signed distance to the nearest colour boundary ([tag, aux, tag2, d]: tag where
  // d > 0, tag2 where d < 0); the shader thresholds it per pixel, so edges stay clean.
  const neckD = (x, y, z) => {
    const ax = Math.abs(x);
    if (g.collar === 'stand') return Math.min(y - 1.402, 0.07 - Math.hypot(x, z + 0.022));
    if (g.collar === 'crew') return y - (1.392 - Math.max(0, z) * 0.3);
    if (g.collar === 'coverall' || g.collar === 'shirt') return y - (1.402 - sstep(0.0, 0.06, z) * Math.max(0, 0.05 - ax) * 1.6);
    // tank: skin above a scooped neckline and outside the armholes, except along the straps
    const neck = y - (z > 0 ? 1.3 + ax * 0.9 : 1.37 + ax * 0.3);
    const strap = 0.017 - Math.abs(ax - 0.074);
    const arm = ax - (0.112 + Math.max(0, 1.37 - y) * 0.3);
    return Math.max(Math.min(neck, -strap), arm);
  };
  const torsoTag = (x, y, z) => {
    const nd = neckD(x, y, z);
    if (nd > -0.03) return [TAG.SKIN, 0, TAG.TOP, nd, 2];
    if (g.coverall) return [TAG.TOP, 0];
    if (g.jacket) {
      if (y < hem) return [TAG.TOPD, 0, TAG.PANTS, y - (hem - 0.011), 3];
      return [TAG.TOP, 0, TAG.TOPD, y - (hem + 0.012), 4];
    }
    if (hem > 0) return [TAG.TOP, 0, TAG.PANTS, y - hem, 5];
    return [TAG.TOP, 0];
  };
  const torsoBump = (x, y, z) => {
    if (y > 1.4) return 0;
    const ax = Math.abs(x);
    let b = 0;
    // bunching at the waist under the belt
    b += Math.sin(y * 260 + nz(x, y, z, 30) * 5) * 0.0018 * sstep(0.9, 0.95, y) * sstep(1.06, 0.98, y);
    // folds from the armpits across the chest
    b += Math.sin((y + ax * 0.9) * 210 + nz(x, y, z, 22) * 4) * 0.0016 * sstep(0.06, 0.13, ax) * sstep(1.08, 1.18, y) * sstep(1.34, 1.27, y);
    // soft drape everywhere
    b += nz(x, y, z, 18) * 0.0022 + nz(x, y, z, 45) * 0.0008;
    if (!g.jacket && y < hem) b *= 0.6;
    return b;
  };
  const torso = new Part('torso', { k: 0.05, weights: torsoW, tag: torsoTag, bump: torsoBump, bumpAmp: 0.004 });
  torso.add(ellipsoid(0, 0.915, -0.005, 0.148 * hw, 0.105, 0.1))
    .add(ellipsoid(0.068 * hw, 0.855, -0.042, 0.08 * hw, 0.09, 0.074)).add(ellipsoid(-0.068 * hw, 0.855, -0.042, 0.08 * hw, 0.09, 0.074))
    .add(ellipsoid(0, 1.04, 0.0, 0.128 * wst, 0.11, 0.09 * (0.7 + bw * 0.3)))
    .add(ellipsoid(0, 1.21, -0.008, 0.152 * sh, 0.165, 0.108))
    .add(ellipsoid(0.066 * sh, 1.258, 0.032, 0.074 * sh, 0.058, 0.068), 0.04).add(ellipsoid(-0.066 * sh, 1.258, 0.032, 0.074 * sh, 0.058, 0.068), 0.04)
    .add(TRAP_L).add(TRAP_R)
    .add(ellipsoid(0, 1.29, -0.06, 0.12 * sh, 0.09, 0.06), 0.05) // upper back / scapulae
    .add(NECK, 0.04);
  if (bust > 0) for (const sx of [-1, 1]) torso.add(ellipsoid(sx * 0.07 * sh, 1.218, 0.058, bust * 1.05, bust * 0.95, bust * 0.9), 0.045);
  if (g.jacket) {
    // jacket body stands off the hips and flares slightly at the hem
    torso.add(ellipsoid(0, hem + 0.04, -0.005, 0.163 * hw, 0.065, 0.116), 0.04);
    torso.add(torus(0, hem, -0.005, 0.158 * hw, 0.0075, null, 1, 0.74), 0.006);
  } else if (hem > 0) {
    torso.add(torus(0, hem, -0.004, 0.148 * hw, 0.005, null, 1, 0.72), 0.005);
  }
  if (g.collar === 'stand') {
  } else if (g.collar === 'crew') torso.add(torus(0, 1.392, -0.008, 0.062, 0.0065, null, 1, 0.94), 0.005);
  else if (g.collar === 'coverall' || g.collar === 'shirt') {
    // fold-down collar: two flaps resting on the shoulders
    for (const sx of [-1, 1]) torso.add(ellipsoid(sx * 0.045, 1.395, 0.03, 0.045, 0.014, 0.045, [0.5, sx * 0.3, sx * -0.35]), 0.008);
    torso.add(torus(0, 1.4, -0.01, 0.064, 0.008, null, 1, 0.94), 0.006);
  }

  // --- limbs (sculpted spread; xf maps back to rest space)
  const parts = [torso];
  const edges = [];
  for (const s of ['L', 'R']) {
    const sx = s === 'L' ? 1 : -1;
    const a = rest['arm' + s], e = rest['fore' + s], h = rest['hand' + s];
    const axf = pivotZ(a.x, a.y, a.z, sx * ARM_A);
    const upW = (x, y, z) => { const t = sstep(1.12, 1.03, y), u = sstep(1.29, 1.37, y) * 0.45; return [[B['arm' + s], (1 - t * 0.5) * (1 - u)], [B['fore' + s], t * 0.5], [B['shoulder' + s], u * 0.7], [B.chest, u * 0.3]]; };
    const sleeveTag = (yCut) => (x, y, z) => {
      if (g.sleeve === 'none') return [TAG.SKIN, 0];
      if (g.sleeve === 'rolled') { if (y < yCut - 0.011) return [TAG.TOPD, 0, TAG.SKIN, y - (yCut - 0.022), 6]; return [TAG.TOP, 0, TAG.TOPD, y - (yCut + 0.004), 7]; }
      return [TAG.TOP, 0];
    };
    const elbowFolds = (x, y, z) => {
      if (g.sleeve === 'none') return 0;
      const env = sstep(1.17, 1.1, y) * sstep(0.98, 1.05, y) * (g.sleeve === 'rolled' ? 0 : 1);
      return Math.sin(y * 330 + nz(x, y, z, 40) * 5) * 0.0024 * env * sstep(-0.03, 0.02, z - e.z) + nz(x, y, z, 26) * 0.0016;
    };
    const up = new Part('upper' + s, { k: 0.025, xf: axf, weights: upW, tag: sleeveTag(1.11), bump: elbowFolds, bumpAmp: 0.004 });
    up.add(roundCone(add3(a, 0, 0.012, 0), add3(e, 0, 0, 0), 0.045 * bw, 0.037 * bw))
      .add(ellipsoid(a.x + sx * 0.008, a.y - 0.03, a.z, 0.048 * bw, 0.07, 0.054 * bw), 0.03)
      .add(ellipsoid(a.x + sx * 0.002, 1.2, a.z + 0.01, 0.034 * bw, 0.075, 0.037 * bw), 0.03);
    if (g.sleeve === 'rolled') up.add(torus(e.x, 1.112, e.z, 0.044 * bw, 0.011), 0.008);
    const foreW = (x, y, z) => { const t = sstep(1.0, 1.08, y), u = handFrac(y); return [[B['fore' + s], (1 - t * 0.5) * (1 - u)], [B['arm' + s], t * 0.5], [B['hand' + s], u]]; };
    const foreTag = (x, y, z) => {
      if (g.sleeve !== 'long') return [TAG.SKIN, 0];
      if (g.cuff) return [TAG.TOP, 0, TAG.ACC, y - 0.893, 8];
      return [TAG.TOP, 0];
    };
    const foreBump = (x, y, z) => g.sleeve === 'long' ? nz(x, y, z, 30) * 0.0018 + Math.sin(y * 240 + nz(x, y, z, 20) * 6) * 0.0012 * sstep(0.9, 0.95, y) * sstep(1.0, 0.96, y) : 0;
    const fore = new Part('fore' + s, { k: 0.02, xf: axf, weights: foreW, tag: foreTag, bump: foreBump, bumpAmp: 0.003 });
    fore.add(roundCone(add3(e, 0, 0.005, 0), [h.x, 0.835, h.z], 0.044 * bw, 0.028 * bw))
      .add(ellipsoid(e.x + sx * 0.004, 0.99, e.z + 0.004, 0.042 * bw, 0.075, 0.04 * bw), 0.03)
      .add(ellipsoid(h.x, 0.858, h.z, 0.021, 0.04, 0.027), 0.02);
    if (g.cuff) fore.add(torus(h.x, 0.885, h.z, 0.032 * bw, 0.0085, null, 0.85, 1), 0.006);
    // legs
    const t0 = rest['thigh' + s], k0 = rest['shin' + s], f0 = rest['foot' + s];
    const lxf = pivotZ(t0.x, t0.y, t0.z, sx * LEG_A);
    const pantsTag = (x, y, z) => [g.coverall ? TAG.TOP : TAG.PANTS, 0];
    const thW = (x, y, z) => { const t = sstep(0.52, 0.44, y), u = sstep(0.8, 0.9, y) * 0.4; return [[B['thigh' + s], (1 - t * 0.5) * (1 - u)], [B['shin' + s], t * 0.5], [B.hips, u]]; };
    const thBump = (x, y, z) => Math.sin(y * 280 + nz(x, y, z, 30) * 6) * 0.0022 * sstep(0.62, 0.52, y) * sstep(0.42, 0.47, y) + nz(x, y, z, 20) * 0.0022 + Math.sin((y - Math.abs(x) * 1.2) * 200) * 0.0012 * sstep(0.74, 0.82, y);
    const thigh = new Part('thigh' + s, { k: 0.03, xf: lxf, weights: thW, tag: pantsTag, bump: thBump, bumpAmp: 0.004 });
    thigh.add(roundCone([t0.x, 0.9, t0.z - 0.005], add3(k0, 0, 0, -0.005), 0.08 * hw, 0.053 * bw))
      .add(ellipsoid(t0.x + sx * 0.008, 0.69, t0.z + 0.024, 0.066 * hw, 0.16, 0.058), 0.04)
      .add(ellipsoid(t0.x, 0.71, t0.z - 0.03, 0.058 * hw, 0.15, 0.052), 0.04);
    const socks = g.boots === 'socks', bootTop = g.boots === 'tall' ? 0.3 : socks ? 0.13 : 0.15;
    const shW = (x, y, z) => { const t = sstep(0.52, 0.44, y), u = sstep(0.14, 0.09, y) * 0.5; return [[B['shin' + s], (1 - t * 0.5) * (1 - u)], [B['thigh' + s], t * 0.5], [B['foot' + s], u]]; };
    const shBump = (x, y, z) => { // tucked trousers bunch above the boot
      const bunch = Math.sin(y * 200 + nz(x, y, z, 25) * 7) * 0.003 * sstep(bootTop - 0.005, bootTop + 0.02, y) * sstep(bootTop + 0.11, bootTop + 0.05, y);
      return bunch + nz(x, y, z, 20) * 0.002 + Math.sin(y * 300) * 0.0015 * sstep(0.55, 0.5, y) * sstep(0.42, 0.46, y) * sstep(0.0, -0.02, z - k0.z);
    };
    const shin = new Part('shin' + s, { k: 0.025, xf: lxf, weights: shW, tag: pantsTag, bump: shBump, bumpAmp: 0.004 });
    shin.add(roundCone(add3(k0, 0, 0.01, -0.004), [f0.x, 0.12, f0.z - 0.006], 0.051 * bw, 0.034 * bw))
      .add(ellipsoid(k0.x, 0.33, k0.z - 0.022, 0.048 * bw, 0.11, 0.048 * bw), 0.04)
      .add(sphere(k0.x, 0.47, k0.z + 0.03, 0.032), 0.03);
    if (g.boots === 'tall') shin.add(ellipsoid(k0.x, bootTop + 0.04, k0.z - 0.006, 0.054 * bw, 0.06, 0.054 * bw), 0.03); // trouser blousing
    // boot
    const ftW = (x, y, z) => { const t = sstep(0.07, 0.13, z - f0.z), u = sstep(0.12, bootTop, y) * 0.6; return [[B['foot' + s], (1 - t) * (1 - u)], [B['toe' + s], t * (1 - u)], [B['shin' + s], u]]; };
    const ftTag = (x, y, z) => {
      if (socks) return y > bootTop - 0.02 ? [TAG.BOOTD, 0, TAG.BOOT, y - (bootTop - 0.008), 10] : [TAG.BOOT, 0];
      if (y < 0.05) return [TAG.BOOT, 0, TAG.SOLE, y - 0.0265, 9];
      if (y > bootTop - 0.03) return [TAG.BOOTD, 0, TAG.BOOT, y - (bootTop - 0.011), 10];
      return [TAG.BOOT, 0];
    };
    const ftBump = (x, y, z) => (Math.sin(y * 260 + nz(x, y, z, 30) * 4) * 0.0012 * sstep(0.1, 0.13, y) * sstep(bootTop - 0.02, bootTop - 0.06, y)) + nz(x, y, z, 60) * 0.0006;
    const foot = new Part('foot' + s, { k: 0.018, xf: lxf, weights: ftW, tag: ftTag, bump: ftBump, bumpAmp: 0.002 });
    const fx = f0.x, fz = f0.z;
    if (socks) { // a soft socked foot: heel, arch, rounded toes; no sole
      foot.add(roundCone([fx, 0.075, fz - 0.012], [fx, bootTop + 0.004, fz - 0.01], 0.042 * bw, 0.044 * bw))
        .add(ellipsoid(fx, 0.04, fz - 0.03, 0.036, 0.04, 0.042), 0.02)
        .add(ellipsoid(fx + sx * 0.004, 0.032, fz + 0.06, 0.04, 0.03, 0.075), 0.03)
        .add(ellipsoid(fx + sx * 0.006, 0.026, fz + 0.13, 0.042, 0.024, 0.036), 0.02);
    } else {
    foot.add(roundCone([fx, 0.07, fz - 0.008], [fx, bootTop + 0.006, fz - 0.008], 0.05 * bw, 0.055 * bw))
      .add(ellipsoid(fx, 0.055, fz - 0.035, 0.047, 0.055, 0.054), 0.02)
      .add(roundBox(fx, 0.052, fz + 0.045, 0.028, 0.022, 0.07, 0.026), 0.025)
      .add(ellipsoid(fx + sx * 0.003, 0.043, fz + 0.135, 0.052, 0.039, 0.056), 0.025)
      .add(torus(fx, bootTop + 0.002, fz - 0.008, 0.055 * bw, 0.0065), 0.004)
      .hard(roundBox(fx + sx * 0.002, 0.0145, fz + 0.045, 0.045, 0.0072, 0.128, 0.008));
    }
    parts.push(up, fore, thigh, shin, foot);
    edges.push([torso, up, 0.035], [up, fore, 0.03], [torso, thigh, 0.055], [thigh, shin, 0.035], [shin, foot, 0.02]);
  }
  const field = new Field(parts, edges);
  const h = { high: 0.016, low: 0.03, far: 0.055 }[lod];
  // clip off the hands (sculpted finer) and the top of the neck (the head piece owns it)
  const neckClip = (x, y, z) => Math.max(NECK_SEAM - y, Math.hypot(x, z + 0.025) - 0.09);
  const wristClip = (x, y, z) => (Math.abs(x) < 0.2 || y > 1.2 || y < 0.65) ? 1 : WRIST_T - wristAlong(x, y, Math.sign(x));
  const mesh = meshField(field, { h, clip: [neckClip, wristClip], nEps: h * 0.3 });
  const at = attributes(field, mesh, { sigma: 0.014, aoStep: 0.02, aoN: 3, aoK: 1.3 });
  // the neck matches the head piece's (unoccluded) shading where the two meet
  for (let v = 0; v < mesh.count; v++) { const y = mesh.pos[v * 3 + 1]; if (y > 1.4 && Math.hypot(mesh.pos[v * 3], mesh.pos[v * 3 + 2] + 0.025) < 0.07) at.ao[v] += (1 - at.ao[v]) * sstep(1.4, 1.425, y); }
  return { mesh, at };
}

// ------------------------------------------------------------------ head
// Head-local coordinates relative to the head bone (the skull base): chin ~0, crown ~0.235,
// adult proportions (head 15.6 cm wide, eyes 6.4 cm apart, 12 mm eyeballs). Kids scale by headS.
export const FACE = {
  eye: [0.033, 0.11, 0.0715], eyeR: 0.0148, brow: [0.033, 0.1315, 0.0885], mouthY: 0.0442, corner: [0.0178, 0.0442, 0.09],
  jaw: [0, 0.075, -0.004], hair1: [0, 0.17, -0.1], hair2: [0, 0.03, -0.122], ear: [0.075, 0.104, -0.012],
};
function neckRC() { return roundCone([0, -0.11, -0.03], [0, 0.05, -0.019], 0.056, 0.047); }
export function headShape(P, L) {
  const fem = P.fr > 0.55 && !P.kid, kid = P.kid, old = L.age > 0;
  const jw = fem ? 0.9 : 1.0, ch = kid ? 1.12 : 1, F = FACE, ex = F.eye[0], ey = F.eye[1];
  const head = new Part('head', { k: 0.018 });
  head.add(ellipsoid(0, 0.13, -0.014, 0.078, 0.105, 0.1))                                        // cranium
    .add(ellipsoid(0, 0.112, 0.028, 0.066, 0.078, 0.06), 0.028)                                  // upper face
    .add(ellipsoid(0, 0.152, 0.036, 0.063, 0.05, 0.052), 0.025)                                  // forehead
    // stylized: soft round cheeks and a simple tapered jaw, no cheekbones or muzzle
    .add(ellipsoid(0.033, 0.074, 0.05, 0.026 * ch, 0.024 * ch, 0.026), 0.03).add(ellipsoid(-0.033, 0.074, 0.05, 0.026 * ch, 0.024 * ch, 0.026), 0.03) // cheeks
    .add(ellipsoid(0, 0.05, 0.03, 0.054 * jw, 0.05, 0.054), 0.03)                                 // lower face
    .add(ellipsoid(0, 0.02, 0.058, 0.024 * jw, 0.02, 0.02), 0.035)                               // chin
    .add(capsule([0.012, 0.128, 0.086], [0.04, 0.13, 0.078], 0.007), 0.024).add(capsule([-0.012, 0.128, 0.086], [-0.04, 0.13, 0.078], 0.007), 0.024); // soft brow
  // nose
  const nk = kid ? 0.82 : 1;
  head.add(roundCone([0, 0.112, 0.086], [0, 0.079, 0.086 + 0.017 * nk], 0.0058, 0.0078), 0.014)
    .add(ellipsoid(0, 0.0765, 0.086 + 0.0185 * nk, 0.0095, 0.0075, 0.0078), 0.012);
  // lips
  const my = F.mouthY;
  const lu = ellipsoid(0, my + 0.0038, 0.0885, 0.016, fem ? 0.0042 : 0.0034, 0.0062);
  const ll = ellipsoid(0, my - 0.0042, 0.0875, 0.0148, fem ? 0.0048 : 0.004, 0.0064);
  // no sculpted lips: the mouth is built from blocks in rig.js (stylized)
  // eye sockets open around the eyeballs; an upper-lid fold and a lower-lid ridge
  for (const sx of [-1, 1]) {
    head.sub(ellipsoid(sx * ex, ey, 0.083, 0.0168, 0.0096, 0.013), 0.005);
    head.add(ellipsoid(sx * ex, ey + 0.0098, 0.0805, 0.0165, 0.004, 0.009), 0.005);
  }
  // ears: a shell with a rim
  for (const sx of [-1, 1]) {
    head.add(ellipsoid(sx * F.ear[0], F.ear[1], F.ear[2], 0.0085, 0.023, 0.015, [0, sx * 0.42, sx * -0.1]), 0.008);
  }
  head.add(custom((x, y, z) => neckBase(x, y + 1.468, z), [-0.16, -0.13, -0.08, 0.16, 0.06, 0.05]), 0.016);
  if (!fem && !kid) head.add(ellipsoid(0, 0.006, 0.031, 0.0085, 0.0105, 0.0085), 0.006);
  return { head, lu, ll, fem, old };
}

// Simplified scalp for the hair shell (cranium, forehead, temples, ears, nape).
function scalpShape(P) {
  const p = new Part('scalp', { k: 0.018 });
  p.add(ellipsoid(0, 0.13, -0.014, 0.078, 0.105, 0.1))
    .add(ellipsoid(0, 0.112, 0.028, 0.066, 0.078, 0.06), 0.028)
    .add(ellipsoid(0, 0.152, 0.036, 0.063, 0.05, 0.052), 0.025)
    .add(neckRC(), 0.016);
  for (const sx of [-1, 1]) p.add(ellipsoid(sx * FACE.ear[0], FACE.ear[1], FACE.ear[2], 0.0085, 0.027, 0.0165, [0, sx * 0.42, sx * -0.1]), 0.006);
  return p;
}
export function sculptHead(P, L, B, lod) {
  const fem = P.fr > 0.55 && !P.kid;
  const key = keyOf('head', P, L, lod);
  return cached(key, () => {
    const { head, lu, ll, old } = headShape(P, L);
    const my = FACE.mouthY, cx = FACE.corner[0];
    // the jaw takes everything below the lip line, out along the jaw to the ear
    const jawW = (x, y, z) => {
      const ax = Math.abs(x), line = my + Math.max(0, ax - cx) * 0.55, wd = 0.0008 + Math.max(0, ax - cx) * 0.5;
      return sstep(line + wd, line - wd, y) * sstep(-0.03, 0.01, z + (0.06 - ax) * 0.3) * sstep(-0.006, 0.012, y);
    };
    head.weights = (x, y, z) => {
      const jw = jawW(x, y, z);
      const n = sstep(0.028, NECK_SEAM - 1.468, y) * (1 - jw); // all neck at the seam, matching the body piece
      const cr = Math.exp(-(((Math.abs(x) - cx) / 0.01) ** 2 + ((y - my) / 0.01) ** 2)) * sstep(0.07, 0.085, z) * 0.85;
      const rest = Math.max(0, 1 - jw - n - cr);
      return [[B.head, rest], [B.jaw, jw * (1 - cr)], [B.neck, n], [x > 0 ? B.cornerL : B.cornerR, cr]];
    };
    head.pairBand = 0.006;
    head.tag = (x, y, z) => {
      const cheek = Math.exp(-(((Math.abs(x) - 0.038) / 0.018) ** 2 + ((y - 0.072) / 0.018) ** 2)) * sstep(0.04, 0.06, z);
      const nose = Math.exp(-((x / 0.01) ** 2 + ((y - 0.075) / 0.01) ** 2)) * sstep(0.098, 0.106, z) * 0.6;
      const ear = sstep(0.065, 0.078, Math.abs(x)) * sstep(0.07, 0.085, y) * sstep(0.14, 0.125, y) * 0.55;
      return [TAG.SKIN, Math.min(1, cheek * 0.8 + nose + ear)];
    };
    const parts = [head];
    if (L.beard) {
      const beard = new Part('beard', { k: 0.012, weights: head.weights, tag: () => [TAG.HAIR, 0.2] });
      beard.add(custom((x, y, z) => {
        const d = head.dist(x, y, z, 0.03);
        const ax = Math.abs(x);
        let m = sstep(0.083, 0.064, y + Math.max(0, 0.045 - ax) * 0.3) * sstep(-0.035, -0.005, y + z * 0.4);
        if (ax > 0.045) m = Math.max(m, sstep(0.115, 0.1, y) * sstep(0.03, 0.012, z) * sstep(-0.028, -0.01, z) * sstep(0.055, 0.07, ax)); // sideburns
        const must = sstep(my + 0.0075, my + 0.0105, y) * sstep(0.069, 0.064, y) * sstep(0.028, 0.02, ax) * sstep(0.078, 0.088, z);
        const lips = sstep(0.022, 0.017, ax) * sstep(my + 0.011, my + 0.006, y) * sstep(my - 0.012, my - 0.007, y);
        m = Math.max(m * (1 - lips), must);
        const th = 0.0085 * m - 0.004 * (1 - m);
        return d - th;
      }, [-0.09, -0.05, -0.06, 0.09, 0.13, 0.12]));
      parts.push(beard);
    }
    const field = new Field(parts, []);
    const h = { high: 0.0052, low: 0.011, far: 0.02 }[lod];
    const mesh = dropSpecks(meshField(field, { h, bounds: [-0.1, -0.06, -0.13, 0.1, 0.25, 0.13], clip: [[0, 1, 0, -(NECK_SEAM - 1.468)]], nEps: h * 0.3 }), 20);
    const at = attributes(field, mesh, { sigma: 0.0035, aoStep: 0.0045, aoN: 3, aoK: 2.2 });
    // match the body piece's (lifted) neck shading at the seam
    for (let v = 0; v < mesh.count; v++) { const y = mesh.pos[v * 3 + 1]; if (y < 0.012 && mesh.pos[v * 3 + 2] < 0.035) at.ao[v] += (1 - at.ao[v]) * sstep(0.012, NECK_SEAM - 1.468, y); }
    if (lod === 'high') splitMouth(mesh, at, B, h);
    return { mesh, at };
  });
}

// Cut the lip line into a clean seam: snap the row of vertices nearest the line onto it and
// duplicate them, so faces above stay on the head and faces below follow the jaw.
function splitMouth(mesh, at, B, h) {
  const LY = FACE.mouthY, inZone = (x, z) => Math.abs(x) < FACE.corner[0] - 0.0005 && z > 0.084;
  const n0 = mesh.count, dup = new Int32Array(n0).fill(-1);
  const P = Array.from(mesh.pos), N = Array.from(mesh.nrm), SI = Array.from(at.si), SW = Array.from(at.sw);
  const TG = Array.from(at.tag), T2 = Array.from(at.tag2), MK = Array.from(at.mask), PR = Array.from(at.pair), AO = Array.from(at.ao), AX = Array.from(at.aux), PT = Array.from(at.part);
  for (let v = 0; v < n0; v++) {
    const x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2];
    if (!inZone(x, z) || Math.abs(y - LY) > h * 0.55) continue;
    P[v * 3 + 1] = LY;
    let cr = 0, cb = B.cornerL; for (let k = 0; k < 4; k++) { const b = SI[v * 4 + k]; if (b === B.cornerL || b === B.cornerR) { cr += SW[v * 4 + k]; cb = b; } }
    const set = (i, bone) => { SI[i * 4] = bone; SW[i * 4] = 1 - cr; SI[i * 4 + 1] = cb; SW[i * 4 + 1] = cr; SI[i * 4 + 2] = 0; SW[i * 4 + 2] = 0; SI[i * 4 + 3] = 0; SW[i * 4 + 3] = 0; };
    const d = P.length / 3; dup[v] = d;
    P.push(x, LY, z); N.push(N[v * 3], N[v * 3 + 1], N[v * 3 + 2]);
    for (let k = 0; k < 4; k++) { SI.push(0); SW.push(0); }
    TG.push(TG[v]); T2.push(T2[v]); MK.push(MK[v]); PR.push(PR[v]); AO.push(AO[v] * 0.45); AO[v] *= 0.45; AX.push(AX[v]); PT.push(PT[v]);
    set(v, B.head); set(d, B.jaw);
  }
  const idx = mesh.idx, out = [];
  for (let t = 0; t < idx.length; t += 3) {
    let a = idx[t], b = idx[t + 1], c = idx[t + 2];
    const cy = (P[a * 3 + 1] + P[b * 3 + 1] + P[c * 3 + 1]) / 3;
    if (dup[a] >= 0 && dup[b] >= 0 && dup[c] >= 0) continue; // degenerate on the line
    if (cy < LY && inZone((P[a * 3] + P[b * 3] + P[c * 3]) / 3, (P[a * 3 + 2] + P[b * 3 + 2] + P[c * 3 + 2]) / 3)) { if (dup[a] >= 0) a = dup[a]; if (dup[b] >= 0) b = dup[b]; if (dup[c] >= 0) c = dup[c]; }
    out.push(a, b, c);
  }
  mesh.pos = new Float32Array(P); mesh.nrm = new Float32Array(N); mesh.idx = new Uint32Array(out); mesh.count = P.length / 3;
  at.si = new Uint16Array(SI); at.sw = new Float32Array(SW); at.tag = new Uint8Array(TG); at.tag2 = new Uint8Array(T2); at.mask = new Float32Array(MK); at.pair = new Uint8Array(PR); at.ao = new Float32Array(AO); at.aux = new Float32Array(AX); at.part = new Uint8Array(PT);
}

// ------------------------------------------------------------------ hair
const HL = [[0, 0.52], [0.55, 0.44], [0.85, 0.26], [1.15, -0.12], [1.35, -0.08], [1.55, 0.02], [1.75, -0.18], [2.0, -0.46], [2.5, -0.62], [Math.PI, -0.66]];
function hairline(th) {
  const a = Math.abs(th);
  for (let i = 1; i < HL.length; i++) if (a <= HL[i][0]) { const t = (a - HL[i - 1][0]) / (HL[i][0] - HL[i - 1][0]); const s = t * t * (3 - 2 * t); return HL[i - 1][1] + (HL[i][1] - HL[i - 1][1]) * s; }
  return HL[HL.length - 1][1];
}
export function sculptHair(P, L, B, lod) {
  const style = L.hairStyle;
  if (style === 'bald') return null;
  const fem = P.fr > 0.55 && !P.kid;
  const key = keyOf('hair', P, L, lod);
  return cached(key, () => {
    const head = scalpShape(P);
    const C = [0, 0.12, -0.012];
    const S = {
      crop: { base: 0.009, top: 0.009, groove: 'crown', lower: 0 },
      swept: { base: 0.008, top: 0.006, groove: 'swept', lower: 0 },
      ponytail: { base: 0.0045, top: 0.002, groove: 'back', lower: 0 },
      braid: { base: 0.0045, top: 0.002, groove: 'back', lower: 0 },
      bun: { base: 0.005, top: 0.002, groove: 'up', lower: 0 },
      curls: { base: 0.02, top: 0.008, groove: 'curl', lower: 0.05 },
      long: { base: 0.008, top: 0.004, groove: 'down', lower: 0 },
      shaved: { base: 0.0022, top: 0, groove: 'none', lower: 0 },
    }[style] || { base: 0.006, top: 0.004, groove: 'crown', lower: 0 };
    const E = FACE.ear, earD = (x, y, z) => Math.hypot(Math.abs(x) - E[0], (y - E[1]) / 1.6, (z - E[2]) / 1.1) - 0.021;
    const shell = (x, y, z) => {
      const dx = x - C[0], dy = y - C[1], dz = z - C[2], len = Math.hypot(dx, dy, dz) || 1;
      const th = Math.atan2(dx, dz), dyn = dy / len;
      const Lh = hairline(th) - S.lower;
      let m = sstep(Lh - 0.05, Lh + 0.05, dyn);
      m *= sstep(-0.004, 0.012, earD(x, y, z));
      const thick = (S.base + S.top * sstep(-0.1, 0.8, dyn)) * m - 0.015 * (1 - m);
      return head.dist(x, y, z, 0.04) - thick;
    };
    const hair = new Part('hair', { k: 0.02, weights: (x, y, z) => [[B.head, 1]], tag: (x, y, z) => [style === 'shaved' ? TAG.SCALP : TAG.HAIR, 0] });
    hair.add(custom(shell, [-0.11, -0.03, -0.14, 0.11, 0.26, 0.13]));
    if (style === 'swept') {
      hair.add(ellipsoid(0.006, 0.22, 0.02, 0.07, 0.048, 0.084, [0.15, 0, -0.12]), 0.03);
      hair.add(ellipsoid(-0.026, 0.2, 0.07, 0.054, 0.026, 0.034, [0.5, 0.3, -0.35]), 0.022);
    }
    if (style === 'crop') hair.add(ellipsoid(0, 0.214, 0.012, 0.058, 0.026, 0.07), 0.035);
    if (style === 'ponytail' || style === 'braid') hair.add(sphere(0, 0.165, -0.104, 0.022), 0.022);
    if (style === 'bun') hair.add(ellipsoid(0, 0.232, -0.085, 0.038, 0.034, 0.038), 0.022);
    if (style === 'long') {
      hair.add(roundCone([0, 0.12, -0.076], [0, -0.06, -0.074], 0.066, 0.058), 0.035);
      for (const sx of [-1, 1]) hair.add(roundCone([sx * 0.072, 0.12, 0.004], [sx * 0.066, -0.02, -0.022], 0.018, 0.022), 0.026);
    }
    // stylized hair: a few broad sculpted clumps, no strand-scale noise
    const curl = (x, y, z) => { const s = 42; return (vnoise(x * s, y * s, z * s) - 0.45) * 0.011; };
    hair.bump = (x, y, z) => {
      const dx = x - C[0], dz = z - C[2];
      switch (S.groove) {
        case 'crown': { const u = Math.atan2(x - 0.0, z + 0.05); return Math.sin(u * 14 + vnoise(x * 30, y * 30, z * 30) * 2) * 0.0016; }
        case 'swept': return Math.sin((x * 0.95 + z * 0.3) * 110 + vnoise(x * 25, y * 25, z * 25) * 3) * 0.0018;
        case 'back': case 'up': case 'down': { const u = Math.atan2(dx, dz); return Math.sin(u * 18 + vnoise(x * 25, y * 25, z * 25) * 2) * 0.0014; }
        case 'curl': return curl(x, y, z);
        default: return 0;
      }
    };
    hair.bumpAmp = S.groove === 'curl' ? 0.008 : 0.002;
    if (style === 'long') hair.weights = (x, y, z) => { const t = sstep(0.06, -0.04, y); return [[B.head, 1 - t], [B.hair1, t]]; };
    const field = new Field([hair], []);
    const h = { high: 0.0062, low: 0.013, far: 0.022 }[lod];
    const mesh = dropSpecks(meshField(field, { h, bounds: [-0.115, -0.09, -0.15, 0.115, 0.27, 0.13], nEps: h * 0.3 }), 30);
    const at = attributes(field, mesh, { sigma: 0.004, aoStep: 0.006, aoN: 3, aoK: 1.3 });
    return { mesh, at };
  });
}

// ------------------------------------------------------------------ hands
// Sculpted for the left hand (palm facing -x), mirrored for the right.
export function sculptHands(P, L, B, lod) {
  const g = garment(L), rest = baseRest();
  P = { ...P, bw: 1, kid: false };
  const key = keyOf('hands', P, L, lod);
  return cached(key, () => {
    const h0 = rest.handL, a = rest.armL;
    const xf = pivotZ(a.x, a.y, a.z, ARM_A);
    const o = (x, y, z) => [h0.x + x, h0.y + y, h0.z + z];
    const handTag = (x, y, z) => {
      if (g.gloves) return [TAG.GLOVE, y - h0.y > 0.013 ? 0.5 : 0];
      return [TAG.SKIN, 0];
    };
    const handW = (x, y, z) => { const u = handFrac(y); return [[B.handL, u], [B.foreL, 1 - u]]; };
    const palm = new Part('palm', { k: 0.012, xf, weights: handW, tag: handTag, bump: g.gloves ? (x, y, z) => (vnoise(x * 300, y * 300, z * 300) - 0.5) * 0.0006 : null, bumpAmp: 0.001 });
    palm.add(roundCone([h0.x, 0.95, h0.z], [h0.x, 0.835, h0.z], 0.03, 0.026))
      .add(ellipsoid(h0.x, 0.858, h0.z, 0.021, 0.04, 0.027), 0.02)
      .add(ellipsoid(...o(0, 0.012, 0), 0.0185, 0.032, 0.0255), 0.012)
      .add(roundBox(...o(0.001, -0.046, 0.003), 0.0042, 0.031, 0.029, 0.0105), 0.016)
      .add(ellipsoid(...o(-0.0085, -0.034, 0.026), 0.011, 0.026, 0.015), 0.012)
      .add(ellipsoid(...o(-0.0065, -0.052, -0.024), 0.0095, 0.028, 0.011), 0.012);
    if (g.gloves) palm.add(torus(...o(0, 0.02, 0), 0.0235, 0.0056, null, 0.82, 1), 0.004);
    const parts = [palm], edges = [];
    const FZ = [0.026, 0.0085, -0.0085, -0.0245], LEN = [[0.041, 0.025, 0.02], [0.045, 0.028, 0.022], [0.042, 0.026, 0.021], [0.033, 0.02, 0.018]], RAD = [0.0084, 0.0087, 0.0082, 0.0072];
    const CURL = [[0.16, 0.3, 0.22], [0.2, 0.34, 0.24], [0.24, 0.38, 0.26], [0.3, 0.42, 0.28]], FAN = [0.06, 0.015, -0.025, -0.07];
    for (let f = 0; f < 4; f++) {
      const fingerW = (x, y, z) => { const ly = y - h0.y, t = sstep(-0.074, -0.092, ly); return [[B.handL, 1 - t], [B.fingersL, t]]; };
      const fingerTag = (x, y, z) => { if (g.gloves) return [TAG.GLOVE, 0]; const ly = y - h0.y; return [x - h0.x > 0.004 && ly < -0.15 + f * 0.0 + (3 - f) * 0 + (f === 3 ? 0.02 : 0) ? TAG.NAIL : TAG.SKIN, 0]; };
      const fp = new Part('finger' + f, { k: 0.006, xf, weights: fingerW, tag: fingerTag });
      let px = 0.002, py = -0.082, pz = FZ[f], ang = 0;
      const r0 = RAD[f] * (P.kid ? 0.95 : 1);
      fp.add(sphere(...o(0.004, -0.081, FZ[f]), r0 * 1.08), 0.006);
      for (let k = 0; k < 3; k++) {
        ang += CURL[f][k];
        const L2 = LEN[f][k] * (0.96 + P.bw * 0.04);
        const nx = px - Math.sin(ang) * L2, ny = py - Math.cos(ang) * L2, nzz = pz + Math.sin(FAN[f]) * L2 * 0.5;
        const ra = r0 * (1 - k * 0.1), rb = r0 * (1 - (k + 1) * 0.1) * (k === 2 ? 0.92 : 1);
        fp.add(roundCone(o(px, py, pz), o(nx, ny, nzz), ra, rb), 0.004);
        px = nx; py = ny; pz = nzz;
      }
      const fingerTagFinal = (x, y, z) => {
        if (g.gloves) return [TAG.GLOVE, 0];
        // nail: back of the last phalanx (+x side for the left hand)
        const dx = x - (h0.x + px), dy = y - (h0.y + py), dz = z - (h0.z + pz);
        if (x - h0.x > px - 0.002 + 0.004 && Math.hypot(dx, dy, dz) < 0.016) return [TAG.NAIL, 0];
        return [TAG.SKIN, 0];
      };
      fp.tag = fingerTagFinal;
      parts.push(fp); edges.push([palm, fp, 0.012]);
    }
    const thW = (x, y, z) => { const ly = y - h0.y, t = sstep(-0.05, -0.07, ly) * 0.5; return [[B.handL, 1 - t], [B.fingersL, t]]; };
    const thumb = new Part('thumb', { k: 0.006, xf, weights: thW, tag: handTag });
    thumb.add(roundCone(o(-0.004, -0.02, 0.026), o(-0.011, -0.046, 0.047), 0.0128, 0.0108), 0.006)
      .add(roundCone(o(-0.011, -0.046, 0.047), o(-0.017, -0.066, 0.058), 0.0104, 0.0094), 0.004)
      .add(roundCone(o(-0.017, -0.066, 0.058), o(-0.021, -0.082, 0.062), 0.0094, 0.0078), 0.004);
    parts.push(thumb); edges.push([palm, thumb, 0.016]);
    const field = new Field(parts, edges);
    const h = { high: 0.0045, low: 0.011, far: 0.018 }[lod];
    const mesh = meshField(field, { h, bounds: field.bounds(0.01).map((v, i) => i === 4 ? Math.min(v, 1.0) : v), clip: [(x, y, z) => wristAlong(x, y, 1) - WRIST_T], nEps: h * 0.3 });
    const at = attributes(field, mesh, { sigma: 0.004, aoStep: 0.005, aoN: 3, aoK: 1.2 });
    const bm = { [B.handL]: B.handR, [B.foreL]: B.foreR, [B.fingersL]: B.fingersR };
    const [mR, aR] = mirror(mesh, at, bm);
    return { L: { mesh, at }, R: { mesh: mR, at: aR } };
  });
}

export function clearAnatomyCache() { CACHE.clear(); }

// ------------------------------------------------------------------ jobs (worker prewarm)
export function keyOf(kind, P, L, lod) {
  const fem = isFem(P);
  if (kind === 'body') return ['body', lod, fem ? 1 : 0, JSON.stringify(garment(L))].join('|');
  if (kind === 'head') return ['head', lod, P.kid ? 1 : 0, fem ? 1 : 0, L.beard ? 1 : 0].join('|');
  if (kind === 'hair') return ['hair', lod, L.hairStyle].join('|');
  return ['hands', lod, garment(L).gloves ? 1 : 0].join('|');
}
export function runJob(j) {
  const f = { body: sculptBody, head: sculptHead, hair: sculptHair, hands: sculptHands }[j.kind];
  return f(j.P, j.L, j.B, j.lod);
}
// Every piece the game can ask for: garments x frame, heads, hair styles, gloves.
export function allJobs(B, hairStyles) {
  const jobs = [], lods = ['high', 'low', 'far'];
  const adult = (fem) => ({ sh: 1, hw: 1, bw: 1, fr: fem ? 0.85 : 0.4, kid: false });
  const outfits = [{ outfit: 'runner' }, { outfit: 'runnerLight' }, { outfit: 'casual' }, { outfit: 'casual', tank: true }, { outfit: 'smart' }, { outfit: 'engineer' }];
  for (const fem of [false, true]) jobs.push({ kind: 'body', P: adult(fem), L: { outfit: 'casual', socks: true }, lod: 'high', B }); // Rook in bed
  for (const lod of lods) {
    for (const o of outfits) for (const fem of [false, true]) jobs.push({ kind: 'body', P: adult(fem), L: o, lod, B });
    for (const fem of [false, true]) for (const beard of [false, true]) if (!(fem && beard)) jobs.push({ kind: 'head', P: adult(fem), L: { beard }, lod, B });
    jobs.push({ kind: 'head', P: { ...adult(false), kid: true }, L: { beard: false }, lod, B });
    for (const hs of hairStyles) if (hs !== 'bald') jobs.push({ kind: 'hair', P: adult(false), L: { hairStyle: hs }, lod, B });
    for (const o of [{ outfit: 'runner' }, { outfit: 'casual' }]) jobs.push({ kind: 'hands', P: adult(false), L: o, lod, B });
  }
  return jobs;
}
