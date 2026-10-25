// Architecture kit: real geometry for building faces so the city reads as built places rather
// than textured boxes. facade() dresses one face of a building mass with framed windows (some lit),
// sills, lintels, floor ledges, pilasters, a cornice, and per-style extras (balconies, shutters,
// flower boxes, AC units). rooftop() adds the clutter that makes skylines believable. Palettes keep
// each district coherent.
import { rng } from '../core/util.js';
import { planter, laundry } from './props.js';

export const PALETTES = {
  terrace: { walls: [0xd9c6a5, 0xcfb08c, 0xe4d4b6, 0xc99f7c, 0xd6bc9c], trim: 0xf0e6d4, ledge: 0xb9ab95, frame: 0xece4d4, shutters: [0x4f7a6a, 0x7a4a3a, 0x3f5f7a, 0x8a7a40], wallMat: 'plaster', trimMat: 'plaster' },
  brick: { walls: [0xb07258, 0xa06650, 0xbc8a70, 0x9a6a58], trim: 0xe2d8c6, ledge: 0xcfc4b0, frame: 0x3a3a38, shutters: [0x2f4f5f, 0x5a3a2a], wallMat: 'brick', trimMat: 'concrete' },
  industrial: { walls: [0x5c6164, 0x666a6c, 0x545a5e], trim: 0x2e3134, ledge: 0x3a3e42, frame: 0x26292c, shutters: [0x8a6a2a], wallMat: 'panel', trimMat: 'darkSteel' },
};

// A face-local frame: u runs along the wall, y up, n out of the wall (the wall surface is at n = 0).
function frame(face, at) {
  const ax = face[0], sgn = face[1] === '+' ? 1 : -1;
  // returns world position and box size for local (u, y, n) and size (su, sy, sn)
  if (ax === 'x') return { P: (u, y, n) => [at + sgn * n, y, u], S: (su, sy, sn) => [sn, sy, su], ry: (a) => sgn * a, sgn, ax };
  return { P: (u, y, n) => [u, y, at + sgn * n], S: (su, sy, sn) => [su, sy, sn], ry: (a) => sgn * a, sgn, ax };
}

// facade(b, { face: 'x+', at, u0, u1, y0, y1, floor = 3.2, bay = 2.8, style = 'terrace', seed, balcony = 0,
//   shutters = 0.4, flowers = 0.25, ac = 0.15, lit = 0.35, ground = 'plain' | 'none', skip: [[u0, u1, y0, y1]], cornice = true })
export function facade(b, o) {
  const pal = PALETTES[o.style || 'terrace'], r = rng(o.seed ?? 7), F = frame(o.face, o.at);
  const floor = o.floor ?? 3.2, bay = o.bay ?? 2.8, len = o.u1 - o.u0, nb = Math.max(1, Math.round(len / bay)), bw = len / nb;
  const nf = Math.max(1, Math.floor((o.y1 - o.y0) / floor + 0.01));
  const skip = o.skip || [], skipped = (u, y) => skip.some(([a, c, d, e]) => u > a && u < c && y > d && y < e);
  const box = (mat, u, y, n, su, sy, sn, color, extra = {}) => b.box(mat, F.P(u, y, n), F.S(su, sy, sn), { color, collide: false, ao: false, tex: 1, ...extra });
  const shutterCol = pal.shutters[Math.floor(r() * pal.shutters.length)];
  // floor ledges and the cornice
  for (let f = 1; f < nf; f++) box(pal.trimMat, (o.u0 + o.u1) / 2, o.y0 + f * floor, 0.07, len + 0.1, 0.14, 0.14, pal.ledge);
  if (o.cornice !== false) {
    box(pal.trimMat, (o.u0 + o.u1) / 2, o.y1 - 0.12, 0.12, len + 0.3, 0.24, 0.24, pal.trim);
    box(pal.trimMat, (o.u0 + o.u1) / 2, o.y1 + 0.06, 0.2, len + 0.5, 0.14, 0.4, pal.ledge);
  }
  // pilasters every few bays (and at the ends)
  const pilEvery = o.pilasters ?? 3;
  if (pilEvery) for (let i = 0; i <= nb; i += pilEvery) box(pal.trimMat, o.u0 + i * bw, (o.y0 + o.y1) / 2, 0.05, 0.32, o.y1 - o.y0, 0.1, pal.trim);
  for (let f = (o.ground === 'none' ? 1 : 0); f < nf; f++) {
    const yb = o.y0 + f * floor, wy = yb + floor * 0.55, wh = floor * (f === 0 && o.ground === 'tall' ? 0.72 : 0.5);
    const balconyRow = f > 0 && o.balcony && r() < o.balcony * 1.6;
    for (let i = 0; i < nb; i++) {
      const u = o.u0 + (i + 0.5) * bw; if (skipped(u, wy)) continue;
      const ww = Math.min(bw * 0.55, 1.6), lit = r() < (o.lit ?? 0.35);
      const glassMat = lit ? (r() < 0.75 ? 'glassLit' : 'glassLitCool') : 'glassDark';
      const door = balconyRow && r() < 0.7, h = door ? floor * 0.72 : wh, yc = door ? yb + h / 2 + 0.05 : wy;
      // glass set just proud of the wall, frame around it, sill and lintel
      box(glassMat, u, yc, 0.03, ww, h, 0.04, 0xffffff);
      box('wood', u, yc + h / 2 + 0.05, 0.06, ww + 0.16, 0.1, 0.1, pal.frame);
      if (!door) box(pal.trimMat, u, yc - h / 2 - 0.05, 0.1, ww + 0.3, 0.09, 0.2, pal.trim); // sill
      for (const s of [-1, 1]) box('wood', u + s * (ww / 2 + 0.04), yc, 0.06, 0.08, h, 0.1, pal.frame);
      box('wood', u, yc, 0.05, 0.05, h, 0.04, pal.frame); // mullion
      if (door) { // balcony slab + rail
        box('concrete', u, yb - 0.04, 0.6, ww + 0.9, 0.14, 1.2, pal.ledge);
        const p0 = F.P(u - (ww + 0.8) / 2, yb + 0.03, 1.15), p1 = F.P(u + (ww + 0.8) / 2, yb + 0.03, 1.15);
        b.railing(p0, p1, { collide: false, h: 0.95 });
        if (r() < 0.4) planter(b, F.P(u + ww * 0.3, yb + 0.03, 0.85), 0.5, 0.35);
        if (r() < 0.25) laundry(b, F.P(u - (ww + 0.7) / 2, yb + 1.9, 1.1), F.P(u + (ww + 0.7) / 2, yb + 1.9, 1.1), 3, Math.floor(r() * 99));
        continue;
      }
      if (r() < (o.shutters ?? 0.4)) for (const s of [-1, 1]) box('wood', u + s * (ww / 2 + 0.28), yc, 0.08, 0.5, h, 0.05, shutterCol, { ry: 0 });
      else if (r() < (o.flowers ?? 0.25)) planter(b, F.P(u, yc - h / 2 - 0.12, 0.25), F.ax === 'x' ? 0.35 : ww * 0.9, F.ax === 'x' ? ww * 0.9 : 0.35, { flowers: true });
      if (r() < (o.ac ?? 0.15)) { box('paint', u + ww / 2 + 0.45, yc - h / 2 + 0.25, 0.3, 0.7, 0.5, 0.55, 0xc8c4bc, { round: 0.04 }); }
    }
  }
}

// rooftop(b, cx, y, cz, w, d, { seed, style }) — parapet, a water tank on legs, vents, AC units, a mast
export function rooftop(b, cx, y, cz, w, d, o = {}) {
  const r = rng(o.seed ?? 3), pal = PALETTES[o.style || 'terrace'];
  const par = (x, z, sx, sz) => b.box(pal.trimMat, [x, y + 0.45, z], [sx, 0.9, sz], { color: pal.ledge, collide: false, ao: false, tex: 2 });
  par(cx, cz - d / 2 + 0.12, w, 0.24); par(cx, cz + d / 2 - 0.12, w, 0.24); par(cx - w / 2 + 0.12, cz, 0.24, d); par(cx + w / 2 - 0.12, cz, 0.24, d);
  if (r() < 0.7) { // water tank on a frame
    const tx = cx + (r() - 0.5) * w * 0.5, tz = cz + (r() - 0.5) * d * 0.5;
    for (const [dx, dz] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) b.box('darkSteel', [tx + dx, y + 0.9, tz + dz], [0.14, 1.8, 0.14], { color: 0x3a3a38, collide: false, ao: false });
    b.box('darkSteel', [tx, y + 1.85, tz], [1.9, 0.12, 1.9], { color: 0x3a3a38, collide: false, ao: false });
    b.cyl('wood', [tx, y + 3.0, tz], 1.0, 2.2, { color: 0x7a6248, seg: 14 });
    b.cyl('rust', [tx, y + 4.2, tz], 1.06, 0.2, { r2: 0.6, color: 0x5a4a3a, seg: 14 });
  }
  const n = 2 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) b.box('paint', [cx + (r() - 0.5) * (w - 2), y + 0.4, cz + (r() - 0.5) * (d - 2)], [0.9 + r() * 0.6, 0.8, 0.7 + r() * 0.5], { color: 0xbcb8b0, collide: false, round: 0.05 });
  for (let i = 0; i < 2; i++) b.cyl('steel', [cx + (r() - 0.5) * (w - 2), y + 0.5, cz + (r() - 0.5) * (d - 2)], 0.18, 1.0, { color: 0x8a8a84, seg: 8 });
  if (r() < 0.5) { const mx = cx + (r() - 0.5) * (w - 2), mz = cz + (r() - 0.5) * (d - 2); b.tube('steel', [mx, y, mz], [mx, y + 4.5, mz], 0.05); b.tube('steel', [mx - 0.6, y + 3.8, mz], [mx + 0.6, y + 3.8, mz], 0.03); }
}

// industrialWall(b, { face, at, u0, u1, y0, y1, seed }) — columns, horizontal panel bands, a light
// strip per bay and hazard trim at the base: big halls stop reading as blank walls
export function industrialWall(b, o) {
  const F = frame(o.face, o.at), r = rng(o.seed ?? 5), len = o.u1 - o.u0, H = o.y1 - o.y0;
  const box = (mat, u, y, n, su, sy, sn, color, extra = {}) => b.box(mat, F.P(u, y, n), F.S(su, sy, sn), { color, collide: false, ao: false, tex: 2, ...extra });
  const nb = Math.max(1, Math.round(len / (o.bay ?? 8))), bw = len / nb;
  for (let i = 0; i <= nb; i++) { const u = o.u0 + i * bw; box('darkSteel', u, o.y0 + H / 2, 0.25, 0.5, H, 0.5, 0x3c3f42); box('darkSteel', u, o.y0 + H / 2, 0.5, 0.9, H, 0.1, 0x45484b); }
  for (let y = o.y0 + 4; y < o.y1 - 1; y += 4.5) box('darkSteel', (o.u0 + o.u1) / 2, y, 0.08, len, 0.25, 0.16, 0x4a4d50);
  box('hazard', (o.u0 + o.u1) / 2, o.y0 + 0.5, 0.05, len, 1.0, 0.08, 0xffffff, { tex: 1 });
  for (let i = 0; i < nb; i++) {
    const u = o.u0 + (i + 0.5) * bw;
    if (r() < 0.75) box(r() < 0.8 ? 'lampWarm' : 'lampCool', u, o.y0 + Math.min(H - 2, 7.5), 0.18, bw * 0.45, 0.14, 0.12, 0xffffff);
    if (o.panels !== false && r() < 0.4) box('paint', u + (r() - 0.5) * bw * 0.4, o.y0 + 1.6 + r() * 1.5, 0.12, 0.9, 1.2, 0.25, [0x8a3a2a, 0x2f5a6a, 0x7a7a3a][Math.floor(r() * 3)], { round: 0.03 }); // panels, boxes
  }
}
