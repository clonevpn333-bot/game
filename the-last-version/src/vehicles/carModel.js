// Procedural car models built from a lofted body: side/plan profiles define
// cross-sections, wheel arches are cut from the lower body, the greenhouse is
// painted with pillars/glass/trim, and real wheels, lights, mirrors, grille,
// exhaust, interior silhouette and underbody are added as separate parts.
import * as THREE from 'three';

const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Piecewise smooth curve through [z, value] keys (monotone z). */
function curve(keys) {
  return (z) => {
    if (z <= keys[0][0]) return keys[0][1];
    for (let i = 0; i < keys.length - 1; i++) {
      const [z0, v0] = keys[i], [z1, v1] = keys[i + 1];
      if (z <= z1) { const t = (z - z0) / (z1 - z0); const s = t * t * (3 - 2 * t); return v0 + (v1 - v0) * (keys[i].lin ? t : s); }
    }
    return keys[keys.length - 1][1];
  };
}

// ---------------------------------------------------------------------------
// Body types (all dimensions metres; z forward, y up, x left)
// ---------------------------------------------------------------------------
export const BODIES = {
  gt: { // Kai's car: a worn 90s-style grand tourer coupe
    length: 4.55, wheelbase: 2.62, wheelR: 0.345, track: 1.6, tyreW: 0.26,
    bottom: [[-2.28, 0.34], [-2.0, 0.2], [1.95, 0.2], [2.28, 0.3]],
    shoulder: [[-2.28, 0.74], [-2.1, 0.9], [-1.4, 0.94], [0.2, 0.9], [1.1, 0.8], [2.0, 0.7], [2.28, 0.58]],
    roof: [[-1.95, 0], [-1.8, 0.96], [-0.9, 1.24], [-0.15, 1.27], [0.55, 1.2], [1.12, 0.84]],
    width: [[-2.28, 0.84], [-2.0, 0.93], [-1.3, 0.96], [0, 0.93], [1.3, 0.95], [2.0, 0.9], [2.28, 0.78]],
    cabinW: 0.72, tumble: 0.16, glassStart: 1.1, glassEnd: -1.85, aPillar: 1.0, bPillar: -0.62, cPillar: -1.55, sideWindowTop: 0.04,
    wsTop: 0.5, noseRound: 0.35, tailRound: 0.25,
  },
  police: { // full-size interceptor sedan
    length: 5.0, wheelbase: 2.95, wheelR: 0.36, track: 1.66, tyreW: 0.25,
    bottom: [[-2.5, 0.38], [-2.2, 0.24], [2.15, 0.24], [2.5, 0.36]],
    shoulder: [[-2.5, 0.86], [-2.3, 1.0], [-1.5, 1.02], [0.3, 0.98], [1.2, 0.94], [2.2, 0.88], [2.5, 0.7]],
    roof: [[-1.7, 0], [-1.55, 1.04], [-1.05, 1.44], [0.25, 1.47], [0.75, 1.36], [1.25, 0.96]],
    width: [[-2.5, 0.9], [-2.2, 0.96], [0, 0.98], [2.2, 0.95], [2.5, 0.86]],
    cabinW: 0.78, tumble: 0.14, glassStart: 1.2, glassEnd: -1.6, aPillar: 1.05, bPillar: -0.3, cPillar: -1.25, sideWindowTop: 0.05,
    wsTop: 0.7, noseRound: 0.3, tailRound: 0.3,
  },
  sedan: {
    length: 4.7, wheelbase: 2.75, wheelR: 0.33, track: 1.56, tyreW: 0.22,
    bottom: [[-2.35, 0.36], [-2.05, 0.22], [2.0, 0.22], [2.35, 0.34]],
    shoulder: [[-2.35, 0.82], [-2.15, 0.96], [-1.4, 0.98], [0.3, 0.95], [1.2, 0.88], [2.1, 0.82], [2.35, 0.66]],
    roof: [[-1.6, 0], [-1.45, 1.0], [-0.95, 1.42], [0.2, 1.44], [0.7, 1.32], [1.2, 0.92]],
    width: [[-2.35, 0.84], [-2.1, 0.9], [0, 0.92], [2.1, 0.9], [2.35, 0.8]],
    cabinW: 0.74, tumble: 0.14, glassStart: 1.15, glassEnd: -1.5, aPillar: 1.0, bPillar: -0.25, cPillar: -1.2, sideWindowTop: 0.05,
    wsTop: 0.65, noseRound: 0.3, tailRound: 0.3,
  },
  hatch: {
    length: 4.05, wheelbase: 2.5, wheelR: 0.31, track: 1.5, tyreW: 0.2,
    bottom: [[-2.02, 0.4], [-1.8, 0.22], [1.75, 0.22], [2.02, 0.32]],
    shoulder: [[-2.02, 0.9], [-1.9, 0.98], [0, 0.94], [1.0, 0.88], [1.8, 0.8], [2.02, 0.64]],
    roof: [[-2.0, 0], [-1.95, 1.0], [-1.8, 1.42], [0.2, 1.48], [0.6, 1.38], [1.05, 0.9]],
    width: [[-2.02, 0.84], [-1.8, 0.87], [0, 0.88], [1.8, 0.86], [2.02, 0.76]],
    cabinW: 0.74, tumble: 0.1, glassStart: 1.0, glassEnd: -1.95, aPillar: 0.9, bPillar: -0.4, cPillar: -1.6, sideWindowTop: 0.05,
    wsTop: 0.55, noseRound: 0.3, tailRound: 0.15,
  },
  van: {
    length: 5.2, wheelbase: 3.2, wheelR: 0.36, track: 1.7, tyreW: 0.23,
    bottom: [[-2.6, 0.42], [-2.4, 0.3], [2.2, 0.3], [2.6, 0.4]],
    shoulder: [[-2.6, 1.05], [-2.5, 1.1], [1.6, 1.1], [2.2, 0.98], [2.6, 0.8]],
    roof: [[-2.58, 0], [-2.55, 2.05], [0.9, 2.1], [1.5, 1.85], [2.0, 1.15]],
    width: [[-2.6, 0.96], [-2.4, 0.99], [2.2, 0.98], [2.6, 0.9]],
    cabinW: 0.94, tumble: 0.03, glassStart: 2.0, glassEnd: 0.95, aPillar: 1.85, bPillar: 1.0, cPillar: 0.95, sideWindowTop: 0.15, sideWindowsRear: false,
    wsTop: 1.45, noseRound: 0.25, tailRound: 0.05,
  },
};

// ---------------------------------------------------------------------------
// Textures
// ---------------------------------------------------------------------------
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }

/**
 * Paint/trim map for the lower body in (u=z along length, v=around) space.
 * Draws panel seams, door gaps, fuel flap, liveries. Returns {map, rough, bump}.
 */
function bodyTextures(def, opts) {
  const W = 1024, H = 512;
  const [c, g] = canvas(W, H);
  const [cb, gb] = canvas(W, H); // bump: seams = dark
  g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
  gb.fillStyle = '#808080'; gb.fillRect(0, 0, W, H);
  const zx = (z) => ((z + def.length / 2) / def.length) * W;
  // v: 0..1 around the half loop (0 = bottom centre, ~0.25 side, 0.5 top centre) — both halves mirrored
  const seam = (x0, y0, x1, y1, w = 2) => { gb.strokeStyle = '#000'; gb.lineWidth = w; gb.beginPath(); gb.moveTo(x0, y0); gb.lineTo(x1, y1); gb.stroke(); g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = w * 0.6; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
  const vy = (v) => v * H;
  const sideLo = vy(0.13), sideHi = vy(0.36), sideLo2 = vy(1 - 0.13), sideHi2 = vy(1 - 0.36);
  // doors
  const doors = opts.doors ?? [[def.aPillar - 0.05, def.bPillar]];
  for (const [zf, zr] of doors) for (const [lo, hi] of [[sideLo, sideHi], [sideHi2, sideLo2]]) {
    seam(zx(zf), lo, zx(zf), hi); seam(zx(zr), lo, zx(zr), hi);
    // door handle recess
    gb.fillStyle = '#202020'; gb.fillRect(zx(zr) + 10, lo + (hi - lo) * (lo < H / 2 ? 0.72 : 0.28) - 4, 34, 8);
  }
  // hood and boot seams across the top
  seam(zx(def.glassStart + 0.12), vy(0.36), zx(def.glassStart + 0.12), vy(0.64));
  seam(zx(def.length / 2 - 0.25), vy(0.36), zx(def.length / 2 - 0.25), vy(0.64));
  if (def.glassEnd > -def.length / 2 + 0.2) seam(zx(def.glassEnd - 0.1), vy(0.36), zx(def.glassEnd - 0.1), vy(0.64));
  // front fender line behind wheel arch
  for (const v of [0.18, 0.82]) { seam(zx(def.wheelbase / 2 + def.wheelR + 0.25), vy(v), zx(def.wheelbase / 2 + def.wheelR + 0.25), vy(v + (v < 0.5 ? 0.18 : -0.18))); }
  // fuel flap (right rear)
  gb.strokeStyle = '#000'; gb.lineWidth = 2; gb.strokeRect(zx(-def.wheelbase / 2 - 0.05), vy(0.27), 26, 22);
  // rocker / lower cladding darkening
  g.fillStyle = 'rgba(30,30,30,0.85)'; g.fillRect(0, 0, W, vy(0.06)); g.fillRect(0, H - vy(0.06), W, vy(0.06));
  if (opts.livery) opts.livery(g, W, H, zx, vy);
  // dirt and wear: lower body grime, chips
  const grime = g.createLinearGradient(0, 0, 0, vy(0.2));
  grime.addColorStop(0, `rgba(60,50,40,${opts.dirt ?? 0.35})`); grime.addColorStop(1, 'rgba(60,50,40,0)');
  g.fillStyle = grime; g.fillRect(0, 0, W, vy(0.2));
  const grime2 = g.createLinearGradient(0, H, 0, H - vy(0.2));
  grime2.addColorStop(0, `rgba(60,50,40,${opts.dirt ?? 0.35})`); grime2.addColorStop(1, 'rgba(60,50,40,0)');
  g.fillStyle = grime2; g.fillRect(0, H - vy(0.2), W, vy(0.2));
  for (let i = 0; i < (opts.chips ?? 40); i++) { g.fillStyle = `rgba(200,200,200,${0.2 + Math.random() * 0.4})`; g.fillRect(Math.random() * W, Math.random() < 0.5 ? Math.random() * vy(0.25) : H - Math.random() * vy(0.25), 1 + Math.random() * 2, 1 + Math.random() * 2); }
  const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;
  const bump = new THREE.CanvasTexture(cb); bump.anisotropy = 8;
  return { map, bump };
}

/** Greenhouse texture: glass, pillars, roof paint, window trim. */
function cabinTexture(def, opts) {
  const W = 1024, H = 512;
  const [c, g] = canvas(W, H);
  const [cr, gr] = canvas(W, H); // roughness/metal (G=rough, B=metal)
  const [ca, ga] = canvas(W, H); ga.fillStyle = '#fff'; ga.fillRect(0, 0, W, H); // alpha: glass translucent
  const zx = (z) => ((z + def.length / 2) / def.length) * W;
  g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
  gr.fillStyle = 'rgb(0,90,140)'; gr.fillRect(0, 0, W, H);
  // v layout for the greenhouse strip: 0..0.5 left side→roof centre, 0.5..1 roof centre→right side
  const glass = '#0b0e12';
  const sideA = (v0, v1) => {
    // side windows between A-pillar and C-pillar, excluding B-pillar
    g.fillStyle = glass; gr.fillStyle = 'rgb(0,12,0)';
    const top = v0, bot = v1;
    const zA = def.aPillar - 0.05, zB = def.bPillar, zC = def.cPillar;
    g.fillRect(zx(zB + 0.06), Math.min(top, bot) * H, zx(zA) - zx(zB + 0.06), Math.abs(bot - top) * H);
    gr.fillRect(zx(zB + 0.06), Math.min(top, bot) * H, zx(zA) - zx(zB + 0.06), Math.abs(bot - top) * H);
    ga.fillStyle = '#7a7a7a'; ga.fillRect(zx(zB + 0.06), Math.min(top, bot) * H, zx(zA) - zx(zB + 0.06), Math.abs(bot - top) * H);
    if (def.sideWindowsRear !== false) {
      g.fillRect(zx(zC), Math.min(top, bot) * H, zx(zB - 0.06) - zx(zC), Math.abs(bot - top) * H);
      gr.fillRect(zx(zC), Math.min(top, bot) * H, zx(zB - 0.06) - zx(zC), Math.abs(bot - top) * H);
    }
    // chrome/black window trim lines
    g.fillStyle = opts.chromeTrim ? '#c8c8c8' : '#111'; g.fillRect(zx(zC), Math.min(top, bot) * H - 3, zx(zA) - zx(zC), 3);
  };
  sideA(0.08, 0.3); sideA(0.92, 0.7);
  // windscreen and rear window across the roof region (v 0.3..0.7)
  g.fillStyle = glass; gr.fillStyle = 'rgb(0,12,0)';
  const ws0 = zx(def.wsTop ?? def.aPillar), ws1 = zx(def.glassStart);
  g.fillRect(ws0, 0.3 * H, ws1 - ws0, 0.4 * H); gr.fillRect(ws0, 0.3 * H, ws1 - ws0, 0.4 * H);
  ga.fillStyle = '#6a6a6a'; ga.fillRect(ws0 + 6, 0.3 * H + 6, ws1 - ws0 - 12, 0.4 * H - 12);
  if (def.glassEnd < def.cPillar) { const r0 = zx(def.glassEnd), r1 = zx(def.cPillar - 0.05); g.fillRect(r0, 0.32 * H, r1 - r0, 0.36 * H); gr.fillRect(r0, 0.32 * H, r1 - r0, 0.36 * H); }
  // dark ceramic frit border along glass edges
  g.strokeStyle = '#050505'; g.lineWidth = 6; g.strokeRect(ws0, 0.3 * H, ws1 - ws0, 0.4 * H);
  if (opts.roofColor) { g.fillStyle = opts.roofColor; g.fillRect(zx(def.cPillar), 0.3 * H, zx(def.aPillar) - zx(def.cPillar), 0.4 * H); }
  const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;
  const rough = new THREE.CanvasTexture(cr);
  const alpha = new THREE.CanvasTexture(ca);
  return { map, rough, alpha };
}

function tyreTreadTexture() {
  const [c, g] = canvas(64, 256);
  g.fillStyle = 'rgb(128,128,255)'; g.fillRect(0, 0, 64, 256);
  for (let y = 0; y < 256; y += 16) {
    g.fillStyle = 'rgb(128,40,255)'; g.fillRect(0, y, 64, 3);
    g.fillStyle = 'rgb(40,128,255)'; for (const x of [14, 30, 46]) g.fillRect(x + ((y / 16) % 2) * 4, y + 3, 3, 13);
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 6);
  return t;
}

// ---------------------------------------------------------------------------
// Lofted body geometry
// ---------------------------------------------------------------------------
function loftBody(def) {
  const NZ = 72, NS = 34; // stations, points per half-loop (bottom centre → top centre)
  const L = def.length;
  const yb = curve(def.bottom), ys = curve(def.shoulder), ww = curve(def.width);
  const roofKeys = def.roof;
  const zRoof0 = roofKeys[0][0], zRoof1 = roofKeys[roofKeys.length - 1][0];
  const yr = curve(roofKeys.slice(1));
  const wheelZ = [def.wheelbase / 2, -def.wheelbase / 2];
  const archR = def.wheelR + 0.06;
  const lower = { pos: [], uv: [] }, upper = { pos: [], uv: [] };
  for (let i = 0; i <= NZ; i++) {
    const t = i / NZ;
    // denser sampling near the ends
    const z = -L / 2 + L * (0.5 - 0.5 * Math.cos(t * Math.PI));
    const bot = yb(z), sh = ys(z);
    // end rounding in plan view
    const er = z > 0 ? def.noseRound : def.tailRound;
    const ez = Math.max(z - (L / 2 - def.noseRound), (-L / 2 + def.tailRound) - z, 0);
    let w = ww(z) * Math.sqrt(Math.max(0.0004, 1 - (ez / er) ** 2));
    // fender bulges at the wheels
    for (const wz of wheelZ) w += 0.028 * Math.exp(-(((z - wz) / 0.55) ** 2));
    const inCabin = z > zRoof0 && z < zRoof1;
    const roofY = inCabin ? Math.max(sh, yr(z)) : sh;
    const cabinBlend = inCabin ? sstep(0, 0.1, roofY - sh) : 0;
    // ---- lower half-loop: bottom centre → rocker → side → shoulder → hood centre (if no cabin)
    for (let k = 0; k <= NS; k++) {
      const s = k / NS;
      let x, y;
      if (s < 0.12) { const u = s / 0.12; x = w * 0.92 * u; y = bot; }
      else if (s < 0.2) { const u = (s - 0.12) / 0.08; const a = u * Math.PI / 2; x = w * 0.92 + Math.sin(a) * w * 0.08; y = bot + (1 - Math.cos(a)) * 0.08; }
      else if (s < 0.7) { const u = (s - 0.2) / 0.5; x = w * (1 - 0.02 * Math.sin(u * Math.PI)) - u * u * 0.04; y = bot + 0.08 + (sh - bot - 0.08) * u; }
      else { // shoulder → top centre (hood/deck crown or cabin base)
        const u = (s - 0.7) / 0.3; const a = u * Math.PI / 2;
        const topW = w - 0.04;
        x = topW * Math.cos(a);
        // inside the cabin the top folds down into door cards so the interior stays visible
        y = sh + Math.sin(a) * 0.05 * (1 - cabinBlend) - Math.sin(a) * 0.4 * cabinBlend;
        if (cabinBlend > 0) x = lerp(x, topW - 0.06 * Math.sin(a), cabinBlend);
      }
      // wheel arch cut (outer side only)
      for (const wz of wheelZ) {
        const dz = z - wz;
        if (Math.abs(dz) < archR && x > w * 0.55 && y < 0.9) {
          const archY = def.wheelR + Math.sqrt(archR * archR - dz * dz) * 0.98;
          if (y < archY) y = Math.max(y, archY * sstep(w * 0.55, w * 0.8, x) + y * (1 - sstep(w * 0.55, w * 0.8, x)));
        }
      }
      lower.pos.push([x, y, z]);
      lower.uv.push([(z + L / 2) / L, s * 0.5]);
    }
    // ---- greenhouse half-loop: shoulder (pulled in by tumblehome) → roof centre
    for (let k = 0; k <= 14; k++) {
      const s = k / 14;
      const cw = Math.min(w - 0.04, def.cabinW + 0.12) ;
      const baseW = lerp(w - 0.04, cw, 0.25);
      let x, y;
      if (!inCabin || roofY - sh < 0.02) { x = (w - 0.04) * (1 - s); y = sh + 0.0005; }
      else {
        const h = roofY - sh;
        if (s < 0.65) { const u = s / 0.65; x = lerp(baseW, def.cabinW, Math.pow(u, 1.2)) - def.tumble * u * u * 0.4; y = sh + h * u * 0.93; }
        else { const u = (s - 0.65) / 0.35; const a = u * Math.PI / 2; x = (def.cabinW - def.tumble * 0.4) * Math.cos(a) * (1 - u * 0.0); y = sh + h * (0.93 + 0.07 * Math.sin(a)); }
      }
      upper.pos.push([x, y, z]);
      upper.uv.push([(z + L / 2) / L, s * 0.5]);
    }
  }
  const build = (src, per) => {
    // mirror the half-loop to make a closed loop: left side (x>0) then right side (x<0)
    const pos = [], uv = [], idx = [];
    const rows = NZ + 1, cols = per * 2 - 1;
    for (let i = 0; i < rows; i++) {
      for (let k = 0; k < per; k++) { const p = src.pos[i * per + k]; pos.push(p[0], p[1], p[2]); uv.push(src.uv[i * per + k][0], src.uv[i * per + k][1]); }
      for (let k = per - 2; k >= 0; k--) { const p = src.pos[i * per + k]; pos.push(-p[0], p[1], p[2]); uv.push(src.uv[i * per + k][0], 1 - src.uv[i * per + k][1]); }
    }
    for (let i = 0; i < rows - 1; i++) for (let k = 0; k < cols - 1; k++) {
      const a = i * cols + k, b = a + 1, c = a + cols, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  };
  const lowerGeo = build(lower, NS + 1), upperGeo = build(upper, 15);
  // fix winding so normals face outward
  for (const g of [lowerGeo, upperGeo]) { const n = g.attributes.normal; let out = 0; const p = g.attributes.position; for (let i = 0; i < p.count; i += 7) out += Math.sign(n.getX(i) * p.getX(i) + n.getY(i) * (p.getY(i) - 0.6)); if (out < 0) { const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } g.computeVertexNormals(); } }
  // end caps: close nose/tail with fans
  return { lowerGeo, upperGeo, yb, ys, ww };
}

// ---------------------------------------------------------------------------
// Parts
// ---------------------------------------------------------------------------
const SHARED = {};
function shared() {
  if (SHARED.ready) return SHARED;
  SHARED.ready = true;
  SHARED.tyreMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.92, normalMap: tyreTreadTexture(), normalScale: new THREE.Vector2(1.2, 1.2) });
  SHARED.rimMat = new THREE.MeshStandardMaterial({ color: 0x9ea2a6, metalness: 1, roughness: 0.28 });
  SHARED.darkRim = new THREE.MeshStandardMaterial({ color: 0x24262a, metalness: 0.8, roughness: 0.4 });
  SHARED.discMat = new THREE.MeshStandardMaterial({ color: 0x5d5a57, metalness: 1, roughness: 0.55 });
  SHARED.caliper = new THREE.MeshStandardMaterial({ color: 0xa8231c, roughness: 0.45, metalness: 0.2 });
  SHARED.black = new THREE.MeshStandardMaterial({ color: 0x0c0c0d, roughness: 0.6 });
  SHARED.plastic = new THREE.MeshStandardMaterial({ color: 0x18191b, roughness: 0.75 });
  SHARED.chrome = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 1, roughness: 0.12 });
  SHARED.glass = new THREE.MeshPhysicalMaterial({ color: 0x0b0e12, roughness: 0.04, metalness: 0.1, clearcoat: 1, transparent: true, opacity: 0.55 });
  SHARED.lens = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transmission: 0.6, transparent: true, opacity: 0.35, clearcoat: 1 });
  SHARED.headlight = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2d8, emissiveIntensity: 3, roughness: 0.2 });
  SHARED.reflector = new THREE.MeshStandardMaterial({ color: 0xbfc3c8, metalness: 1, roughness: 0.15 });
  SHARED.tail = new THREE.MeshStandardMaterial({ color: 0x400404, emissive: 0xff1a10, emissiveIntensity: 1.6, roughness: 0.3 });
  SHARED.indicator = new THREE.MeshStandardMaterial({ color: 0x3a2200, emissive: 0xff8a10, emissiveIntensity: 0.4, roughness: 0.3 });
  SHARED.seat = new THREE.MeshStandardMaterial({ color: 0x1c1a19, roughness: 0.85 });
  SHARED.under = new THREE.MeshStandardMaterial({ color: 0x0f0f10, roughness: 0.95 });
  // wheel geometry: lathe tyre profile with rounded shoulders and sidewall bulge
  SHARED.wheelCache = {};
  return SHARED;
}

function wheelGeos(R, W, style) {
  const key = R + ':' + W + ':' + style;
  const S = shared();
  if (S.wheelCache[key]) return S.wheelCache[key];
  const rimR = R * 0.66;
  const prof = [];
  const n = 14;
  for (let i = 0; i <= n; i++) { // tyre cross-section: inner bead → sidewall → tread → sidewall → bead
    const a = (i / n) * Math.PI;
    const x = -Math.cos(a) * W / 2;
    const bulge = Math.sin(a);
    const r = rimR + (R - rimR) * Math.pow(bulge, 0.35);
    prof.push(new THREE.Vector2(r, x * (0.94 + 0.06 * bulge)));
  }
  const tyre = new THREE.LatheGeometry(prof, 40); tyre.rotateZ(Math.PI / 2);
  // tread UVs along circumference
  const rim = new THREE.Group();
  // barrel
  const barrel = new THREE.CylinderGeometry(rimR, rimR, W * 0.9, 32, 1, true); barrel.rotateZ(Math.PI / 2);
  // spokes: extruded twin-spoke shape
  const shape = new THREE.Shape(); shape.absarc(0, 0, rimR * 0.98, 0, Math.PI * 2, false);
  const spokes = style === 'steel' ? 0 : style === 'mesh' ? 10 : 5;
  if (spokes) {
    for (let i = 0; i < spokes; i++) {
      const a0 = (i / spokes) * Math.PI * 2, span = (Math.PI * 2) / spokes;
      const hole = new THREE.Path();
      const r0 = rimR * 0.33, r1 = rimR * 0.9;
      const g0 = style === 'mesh' ? 0.12 : 0.22, g1 = style === 'mesh' ? 0.08 : 0.1;
      hole.moveTo(Math.cos(a0 + span * g0) * r0, Math.sin(a0 + span * g0) * r0);
      hole.absarc(0, 0, r1, a0 + span * g1, a0 + span * (1 - g1), false);
      hole.lineTo(Math.cos(a0 + span * (1 - g0)) * r0, Math.sin(a0 + span * (1 - g0)) * r0);
      hole.absarc(0, 0, r0, a0 + span * (1 - g0), a0 + span * g0, true);
      shape.holes.push(hole);
    }
  } else {
    for (let i = 0; i < 8; i++) { const h = new THREE.Path(); const a = (i / 8) * Math.PI * 2; h.absarc(Math.cos(a) * rimR * 0.62, Math.sin(a) * rimR * 0.62, rimR * 0.1, 0, Math.PI * 2, true); shape.holes.push(h); }
  }
  const face = new THREE.ExtrudeGeometry(shape, { depth: 0.035, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.008, bevelSegments: 2, curveSegments: 24 });
  face.rotateY(Math.PI / 2); face.translate(W * 0.28, 0, 0);
  const hub = new THREE.CylinderGeometry(rimR * 0.18, rimR * 0.22, 0.05, 16); hub.rotateZ(Math.PI / 2); hub.translate(W * 0.32, 0, 0);
  const disc = new THREE.CylinderGeometry(rimR * 0.82, rimR * 0.82, 0.028, 32); disc.rotateZ(Math.PI / 2); disc.translate(W * 0.05, 0, 0);
  const caliper = new THREE.BoxGeometry(0.06, rimR * 0.5, rimR * 0.3); caliper.translate(W * 0.12, rimR * 0.55, -rimR * 0.2);
  const lip = new THREE.TorusGeometry(rimR, 0.012, 6, 40); lip.rotateY(Math.PI / 2); lip.translate(W * 0.36, 0, 0);
  const out = { tyre, barrel, face, hub, disc, caliper, lip, rimR };
  S.wheelCache[key] = out;
  return out;
}

function makeWheel(def, side, opts) {
  const S = shared();
  const G = wheelGeos(def.wheelR, def.tyreW, opts.wheelStyle || 'twin');
  const spin = new THREE.Group(); // rotates with the axle
  const tyre = new THREE.Mesh(G.tyre, S.tyreMat);
  const rimMat = opts.darkRims ? S.darkRim : S.rimMat;
  const face = new THREE.Mesh(G.face, rimMat), hub = new THREE.Mesh(G.hub, S.chrome), barrel = new THREE.Mesh(G.barrel, rimMat), lip = new THREE.Mesh(G.lip, S.chrome);
  spin.add(tyre, face, hub, barrel, lip);
  const disc = new THREE.Mesh(G.disc, S.discMat);
  spin.add(disc);
  const caliper = new THREE.Mesh(G.caliper, opts.caliper ? S.caliper : S.plastic); // does not spin
  const steer = new THREE.Group(); // steering + suspension
  steer.add(spin, caliper);
  if (side < 0) { spin.scale.x = -1; caliper.scale.x = -1; }
  spin.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { steer, spin };
}

/** Builds a complete car. Returns a Group with .wheels, .lights, .parts */
export function buildCar(type = 'gt', opts = {}) {
  const def = BODIES[type];
  const S = shared();
  const car = new THREE.Group(); car.name = 'car-' + type;
  const body = new THREE.Group(); car.add(body); // body moves on suspension
  const { lowerGeo, upperGeo, ys, ww } = loftBody(def);
  const tex = bodyTextures(def, opts);
  const paint = new THREE.MeshPhysicalMaterial({
    color: opts.color ?? 0x2f3b45, map: tex.map, bumpMap: tex.bump, bumpScale: 1.4,
    metalness: opts.metallic ?? 0.55, roughness: opts.roughness ?? 0.32, clearcoat: 1, clearcoatRoughness: opts.clearcoatRough ?? 0.06,
  });
  const lower = new THREE.Mesh(lowerGeo, paint); lower.castShadow = true; lower.receiveShadow = true; body.add(lower);
  const ct = cabinTexture(def, opts);
  const cabinMat = new THREE.MeshPhysicalMaterial({ color: opts.color ?? 0x2f3b45, map: ct.map, roughnessMap: ct.rough, metalnessMap: ct.rough, alphaMap: ct.alpha, transparent: true, roughness: 1, metalness: 1, clearcoat: 1, clearcoatRoughness: 0.05, side: THREE.DoubleSide });
  // greenhouse colour: pillars painted, glass near-black (map multiplies), so tint white → body colour via onBeforeCompile
  cabinMat.color = new THREE.Color(0xffffff);
  const paintCol = new THREE.Color(opts.color ?? 0x2f3b45);
  cabinMat.onBeforeCompile = (sh) => {
    sh.uniforms.uPaint = { value: paintCol };
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uPaint;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        // white texels take the paint colour; dark texels stay glass
        float isPaint = step(0.5, sampledDiffuseColor.r);
        diffuseColor.rgb = mix(diffuseColor.rgb, uPaint * sampledDiffuseColor.rgb, isPaint);`);
  };
  const upper = new THREE.Mesh(upperGeo, cabinMat); upper.castShadow = true; body.add(upper);
  car.paint = paint; car.cabinMat = cabinMat; car.paintColor = paintCol;

  // ---- interior silhouette (seen through glass)
  const interior = new THREE.Group(); body.add(interior);
  const floorY = 0.32;
  for (const sx of [1, -1]) {
    const seat = new THREE.Group();
    const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.5), S.seat); cushion.position.set(0, floorY + 0.12, 0);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.62, 0.12), S.seat); back.position.set(0, floorY + 0.48, -0.26); back.rotation.x = -0.22;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.18, 0.1), S.seat); head.position.set(0, floorY + 0.86, -0.34);
    seat.add(cushion, back, head);
    seat.position.set(sx * 0.38, 0, def.bPillar + 0.15);
    interior.add(seat);
  }
  const dash = new THREE.Mesh(new THREE.BoxGeometry(def.cabinW * 2 - 0.1, 0.22, 0.4), S.plastic);
  dash.position.set(0, ys(def.aPillar) - 0.02, def.aPillar - 0.05); interior.add(dash);
  const wheelPivot = new THREE.Group();
  wheelPivot.position.set(0.38, ys(def.aPillar) - 0.02, def.aPillar - 0.3); wheelPivot.rotation.x = -0.45;
  const steeringWheel = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.018, 8, 28), S.plastic);
  const spokeG = new THREE.BoxGeometry(0.34, 0.03, 0.02);
  const sw = new THREE.Group(); sw.add(steeringWheel, new THREE.Mesh(spokeG, S.plastic));
  wheelPivot.add(sw); interior.add(wheelPivot);
  car.steeringWheel = sw; car.steeringPivot = wheelPivot;
  // dashboard glow (instrument cluster)
  const cluster = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.1), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x58d0ff, emissiveIntensity: 0.8 }));
  cluster.position.set(0.38, ys(def.aPillar) + 0.08, def.aPillar - 0.24); cluster.rotation.x = -0.6 + Math.PI; cluster.rotation.y = Math.PI;
  interior.add(cluster);
  const cabinFloor = new THREE.Mesh(new THREE.BoxGeometry(def.cabinW * 2, 0.04, def.aPillar - def.cPillar), S.under);
  cabinFloor.position.set(0, floorY, (def.aPillar + def.cPillar) / 2); interior.add(cabinFloor);
  car.seatPos = new THREE.Vector3(0.38, floorY + 0.02, def.bPillar + 0.1);

  // ---- end caps / bumpers / grille / lights
  const front = def.length / 2, rear = -def.length / 2;
  const noseY = ys(front - 0.05), tailY = ys(rear + 0.05);
  // front bumper + grille
  const bumperShape = (wd, h, r) => { const sh = new THREE.Shape(); sh.moveTo(-wd / 2 + r, 0); sh.lineTo(wd / 2 - r, 0); sh.quadraticCurveTo(wd / 2, 0, wd / 2, r); sh.lineTo(wd / 2, h - r); sh.quadraticCurveTo(wd / 2, h, wd / 2 - r, h); sh.lineTo(-wd / 2 + r, h); sh.quadraticCurveTo(-wd / 2, h, -wd / 2, h - r); sh.lineTo(-wd / 2, r); sh.quadraticCurveTo(-wd / 2, 0, -wd / 2 + r, 0); return sh; };
  const splitter = new THREE.Mesh(new THREE.ExtrudeGeometry(bumperShape(ww(front - 0.3) * 1.7, 0.05, 0.02), { depth: 0.12, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 2 }), S.plastic);
  splitter.position.set(0, 0.2, front - 0.3); body.add(splitter);
  const grilleTex = (() => { const [c, g] = canvas(256, 64); g.fillStyle = '#000'; g.fillRect(0, 0, 256, 64); g.strokeStyle = '#3a3a3a'; g.lineWidth = 2; for (let x = -64; x < 256; x += 10) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 32, 64); g.stroke(); g.beginPath(); g.moveTo(x + 32, 0); g.lineTo(x, 64); g.stroke(); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const grille = new THREE.Mesh(new THREE.PlaneGeometry(ww(front - 0.1) * 1.2, 0.14), new THREE.MeshStandardMaterial({ map: grilleTex, roughness: 0.6, metalness: 0.4 }));
  grille.position.set(0, 0.4, front + 0.001); body.add(grille);
  if (opts.pushBar) {
    const pb = new THREE.Group();
    for (const x of [-0.35, 0.35]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.06), S.black); p.position.set(x, 0.5, front + 0.12); pb.add(p); }
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.06), S.black); top.position.set(0, 0.72, front + 0.12); pb.add(top);
    body.add(pb);
  }
  // headlights: housing, reflector, lens, LED strip
  car.lights = { head: [], tail: [], brake: [], extra: [] };
  for (const sx of [1, -1]) {
    const hx = sx * (ww(front - 0.25) - 0.22);
    const housing = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.12), S.black);
    housing.position.set(hx, noseY - 0.045, front - 0.22); housing.rotation.x = 0.25; body.add(housing);
    const refl = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 16), S.reflector); refl.rotation.x = Math.PI / 2;
    refl.position.set(hx + 0.06 * sx, noseY - 0.04, front - 0.115); body.add(refl);
    const bulb = new THREE.Mesh(new THREE.CircleGeometry(0.03, 16), S.headlight); bulb.position.set(hx + 0.06 * sx, noseY - 0.04, front - 0.104); body.add(bulb);
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.012, 0.01), S.headlight); led.position.set(hx - 0.04 * sx, noseY - 0.0, front - 0.11); body.add(led);
    const lens = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.11, 0.01), S.lens); lens.position.set(hx, noseY - 0.035, front - 0.1); lens.rotation.x = 0.25; body.add(lens);
    car.lights.head.push(bulb, led);
    const ind = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.02), S.indicator); ind.position.set(sx * (ww(front - 0.2) - 0.08), 0.42, front - 0.04); body.add(ind);
    // taillights
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.07, 0.04), S.tail.clone());
    tail.position.set(sx * (ww(rear + 0.2) - 0.26), tailY - 0.06, rear + 0.13); body.add(tail);
    car.lights.tail.push(tail);
    // exhaust tips
    if (opts.exhaust !== false) { const ex = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.16, 16, 1, true), S.chrome); ex.material.side = THREE.DoubleSide; ex.rotation.x = Math.PI / 2; ex.position.set(sx * 0.42, 0.28, rear + 0.05); body.add(ex); }
    // mirror
    const mirror = new THREE.Group();
    const stalk = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 0.05), S.plastic); stalk.position.x = 0.04 * sx;
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8), paint); cap.scale.set(0.9, 0.62, 0.45); cap.position.set(0.11 * sx, 0.02, 0);
    const glassM = new THREE.Mesh(new THREE.CircleGeometry(0.055, 12), S.chrome); glassM.position.set(0.11 * sx, 0.02, -0.032); glassM.rotation.y = Math.PI; glassM.scale.y = 0.62;
    mirror.add(stalk, cap, glassM);
    mirror.position.set(sx * (ww(def.aPillar) - 0.06), ys(def.aPillar) + 0.06, def.aPillar - 0.08);
    body.add(mirror);
    // door handle
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.025, 0.13), S.plastic);
    handle.position.set(sx * (ww(def.bPillar) + 0.0), ys(def.bPillar) - 0.07, def.bPillar - 0.15); body.add(handle);
  }
  // rear bumper + diffuser
  const rb = new THREE.Mesh(new THREE.ExtrudeGeometry(bumperShape(ww(rear + 0.3) * 1.6, 0.08, 0.03), { depth: 0.1, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 2 }), S.plastic);
  rb.position.set(0, 0.22, rear + 0.2); body.add(rb);
  for (let i = -3; i <= 3; i++) { const fin = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.1, 0.25), S.black); fin.position.set(i * 0.12, 0.24, rear + 0.18); body.add(fin); }
  if (opts.spoiler) {
    const sp = new THREE.Mesh(new THREE.BoxGeometry(ww(rear + 0.3) * 1.7, 0.025, 0.2), paint); sp.position.set(0, tailY + 0.13, rear + 0.22); body.add(sp);
    for (const sx of [1, -1]) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.08), S.black); st.position.set(sx * 0.55, tailY + 0.06, rear + 0.24); body.add(st); }
  }
  // underbody tray
  const under = new THREE.Mesh(new THREE.BoxGeometry(def.width.reduce((m, k) => Math.max(m, k[1]), 0) * 1.8, 0.04, def.length * 0.9), S.under);
  under.position.y = 0.2; body.add(under);
  // licence plates
  const plateTex = (() => { const [c, g] = canvas(256, 64); g.fillStyle = '#e9e6dc'; g.fillRect(0, 0, 256, 64); g.fillStyle = '#1a2a6a'; g.font = 'bold 40px monospace'; g.textAlign = 'center'; g.fillText(opts.plate || ('HLD ' + Math.floor(1000 + Math.random() * 8999)), 128, 47); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const plateMat = new THREE.MeshStandardMaterial({ map: plateTex, roughness: 0.4, metalness: 0.3 });
  const plateF = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.12), plateMat); plateF.position.set(0, 0.36, front + 0.005); body.add(plateF);
  const plateR = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.12), plateMat); plateR.position.set(0, 0.44, rear - 0.01); plateR.rotation.y = Math.PI; body.add(plateR);

  // police lightbar
  if (opts.lightbar) {
    const lb = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.28), S.black); lb.add(base);
    const red = new THREE.MeshStandardMaterial({ color: 0x300000, emissive: 0xff1010, emissiveIntensity: 0 });
    const blue = new THREE.MeshStandardMaterial({ color: 0x000530, emissive: 0x1a4dff, emissiveIntensity: 0 });
    const segs = [];
    for (let i = 0; i < 6; i++) { const m = i < 3 ? red : blue; const s = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.07, 0.24), m); s.position.set(-0.5 + i * 0.2, 0.07, 0); lb.add(s); segs.push(s); }
    lb.position.set(0, curve(def.roof.slice(1))((def.aPillar + def.cPillar) / 2) + 0.05, (def.aPillar + def.cPillar) / 2 - 0.1);
    body.add(lb);
    car.lightbar = { group: lb, red, blue };
  }
  if (opts.taxiSign) {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.16, 0.18), new THREE.MeshStandardMaterial({ color: 0xffe08a, emissive: 0xffc840, emissiveIntensity: 1.2 }));
    sign.position.set(0, curve(def.roof.slice(1))(-0.3) + 0.1, -0.3); body.add(sign);
  }

  // ---- wheels
  car.wheels = [];
  const wy = def.wheelR;
  for (const [z, front] of [[def.wheelbase / 2, true], [-def.wheelbase / 2, false]]) for (const sx of [1, -1]) {
    const w = makeWheel(def, sx, opts);
    w.steer.position.set(sx * (def.track / 2), wy, z);
    car.add(w.steer);
    car.wheels.push({ ...w, front, side: sx, restY: wy, compression: 0 });
  }
  body.traverse((o) => { if (o.isMesh && o.material !== S.lens && o.material !== S.glass) { o.castShadow = true; o.receiveShadow = true; } });
  car.body = body; car.def = def;
  car.halfExtents = new THREE.Vector3(Math.max(...def.width.map((k) => k[1])), 0.7, def.length / 2);
  return car;
}

// Liveries
export function policeLivery(g, W, H, zx, vy) {
  // black/white panda scheme with a bold stripe and unit numbers
  g.fillStyle = 'rgba(15,17,22,1)';
  g.fillRect(0, vy(0.2), zx(-1.4), vy(0.6)); g.fillRect(zx(1.25), vy(0.2), W - zx(1.25), vy(0.6));
  g.fillStyle = '#e8e8e8'; g.fillRect(zx(-1.4), vy(0.12), zx(1.25) - zx(-1.4), vy(0.25)); g.fillRect(zx(-1.4), H - vy(0.37), zx(1.25) - zx(-1.4), vy(0.25));
  g.fillStyle = '#1a3fa8'; g.fillRect(zx(-1.4), vy(0.24), zx(1.25) - zx(-1.4), vy(0.03)); g.fillRect(zx(-1.4), H - vy(0.27), zx(1.25) - zx(-1.4), vy(0.03));
  g.fillStyle = '#111'; g.font = `bold ${vy(0.06)}px sans-serif`; g.textAlign = 'center';
  g.save(); g.translate(zx(0.1), vy(0.2)); g.scale(1, -1); g.fillText('CIVIC SECURITY', 0, 0); g.restore();
  g.fillText('CIVIC SECURITY', zx(0.1), H - vy(0.17));
  g.fillStyle = '#e8e8e8'; g.fillRect(zx(1.8), vy(0.42), zx(2.3) - zx(1.8), vy(0.16));
}
