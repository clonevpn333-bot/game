// Chapter 1 backgrounds: a dusk industrial metropolis in four parallax layers
// with animated machinery (gears, pistons, smokestacks, blinking lamps) and
// THE FRAMEWORK — the reality machine — hanging in the sky.
import { Pix } from './pix.js';
import { rng, makeCanvas } from '../core/util.js';

export const VW = 320, VH = 180;

function sky() {
  const p = new Pix(VW, VH), bands = ['k', 'v', 'V', 'u', 'U', 'm', 'O', 'y'], ys = [0, 26, 52, 78, 102, 122, 140, 156, 190];
  for (let i = 0; i < bands.length; i++) {
    const y0 = ys[i], y1 = ys[i + 1];
    p.rect(0, y0, VW, y1 - y0, bands[i]);
    if (i + 1 < bands.length) { const h = Math.min(12, y1 - y0); p.dither(0, y1 - h, VW, h, bands[i], bands[i + 1], (x, j) => (j + 1) / (h + 1)); }
  }
  const r = rng(77);
  for (let i = 0; i < 70; i++) { const x = r.int(0, VW - 1), y = r.int(0, 70); p.set(x, y, r.chance(0.2) ? 'W' : r.chance(0.5) ? 'L' : 'U'); if (r.chance(0.08)) { p.set(x - 1, y, 'U'); p.set(x + 1, y, 'U'); p.set(x, y - 1, 'U'); p.set(x, y + 1, 'U'); } }
  // sun, low and huge, striped by haze
  const sx = 96, sy = 150;
  for (let y = sy - 34; y < sy + 34; y++) for (let x = sx - 34; x < sx + 34; x++) { const d = Math.hypot(x - sx, y - sy); if (d < 33 && !(y > sy - 6 && (y % 5 === 0 || (y > sy + 8 && y % 5 === 1)))) p.set(x, y, d < 30 ? 'Y' : 'y'); }
  // thin cloud streaks
  for (let i = 0; i < 9; i++) { const x = r.int(0, VW), y = r.int(84, 138), w = r.int(18, 60); p.rect(x, y, w, 1, y < 104 ? 'U' : y < 124 ? 'M' : 'Y'); p.rect(x + 4, y + 1, w - 10, 1, y < 104 ? 'u' : y < 124 ? 'm' : 'O'); }
  return p;
}

// THE FRAMEWORK: an impossibly large square frame in the sky. Through it, the
// sky is a different colour. One corner is already cracked.
function framework() {
  const p = new Pix(150, 120);
  const outer = [[20, 4], [138, 18], [130, 112], [8, 96]], inner = [[34, 20], [124, 30], [118, 98], [24, 86]];
  p.poly(outer, 'u'); p.poly(inner, 0);
  // inside: another sky (cold teal — a different format)
  const q = new Pix(150, 120); q.poly(inner, 't');
  for (let y = 0; y < 120; y++) for (let x = 0; x < 150; x++) if (q.get(x, y)) { const g = (x * 0.4 + y) / 120; p.set(x, y, g < 0.35 ? 't' : g < 0.6 ? ((x + y) % 2 ? 't' : 'T') : g < 0.8 ? 'T' : ((x + y) % 2 ? 'T' : 'c')); if ((x * 7 + y * 13) % 97 === 0) p.set(x, y, 'C'); }
  // bevel + panel seams
  p.line(20, 4, 138, 18, 'U'); p.line(21, 5, 137, 19, 'U'); p.line(20, 4, 8, 96, 'U'); p.line(34, 20, 124, 30, 'V'); p.line(34, 20, 24, 86, 'V'); p.line(118, 98, 24, 86, 'm'); p.line(124, 30, 118, 98, 'U');
  for (let i = 1; i < 8; i++) { const t = i / 8; p.line(20 + 118 * t, 4 + 14 * t, 34 + 90 * t - 4, 20 + 10 * t - 1, 'V'); p.line(8 + 122 * t, 96 + 16 * t, 24 + 94 * t, 86 + 12 * t, 'V'); }
  for (let i = 1; i < 6; i++) { const t = i / 6; p.line(20 - 12 * t, 4 + 92 * t, 34 - 10 * t, 20 + 66 * t, 'V'); p.line(138 - 8 * t, 18 + 94 * t, 124 - 6 * t, 30 + 68 * t, 'V'); }
  // running lights
  for (let i = 0; i < 12; i++) { const t = i / 12; p.set(Math.round(22 + 114 * t), Math.round(6 + 13.5 * t), i % 3 ? 'm' : 'Y'); p.set(Math.round(10 + 119 * t), Math.round(95 + 15 * t), i % 4 ? 'm' : 'M'); }
  // the crack (upper right corner), leaking magenta
  p.line(126, 16, 120, 24, 'M'); p.line(120, 24, 124, 30, 'W'); p.line(124, 30, 117, 36, 'M'); p.line(120, 24, 114, 22, 'm'); p.set(118, 30, 'W');
  for (const [x, y] of [[129, 10], [133, 14], [127, 6], [136, 9]]) p.rect(x, y, 2, 2, 'M');
  return p;
}

function farCity(seed = 5) {
  const W = 480, H = 100, p = new Pix(W, H), r = rng(seed);
  let x = 0;
  while (x < W) {
    const w = r.int(10, 34), h = r.int(18, 82), y = H - h, kind = r.int(0, 4);
    p.rect(x, y, w, h, 'V'); p.rect(x, y, 1, h, 'u'); p.rect(x, y, w, 1, 'u');
    if (kind === 0) { p.rect(x + 3, y - 5, w - 6, 5, 'V'); p.rect(x + 3, y - 5, w - 6, 1, 'u'); }        // setback
    if (kind === 1) { p.rect(x + (w >> 1), y - r.int(8, 18), 1, 18, 'V'); p.set(x + (w >> 1), y - 18, 'M'); } // spire
    if (kind === 2) { p.ellipse(x + w / 2, y, w / 2 - 1, 5, 'V'); }                                      // dome
    if (kind === 3) { p.rect(x + 2, y - 7, 4, 7, 'V'); p.rect(x + 1, y - 9, 6, 2, 'u'); }                // tank
    for (let wy = y + 4; wy < H - 4; wy += 4) for (let wx = x + 3; wx < x + w - 2; wx += 3) if (r.chance(0.3)) p.set(wx, wy, r.chance(0.3) ? 'M' : 'U');
    x += w + r.int(-2, 3);
  }
  // sky bridges
  for (let i = 0; i < 5; i++) { const bx = r.int(0, W - 60), by = r.int(40, 70); p.rect(bx, by, r.int(30, 60), 2, 'V'); p.rect(bx, by, 50, 1, 'u'); }
  // horizon haze: ordered-dither the bases of the towers toward the sky colour
  const M = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  for (let j = 0; j < 30; j++) for (let hx = 0; hx < W; hx++) { const y = H - 30 + j; if (p.get(hx, y) && (M[(y & 3) * 4 + (hx & 3)] + 0.5) / 16 < (j / 30) * 0.7) p.set(hx, y, 'u'); }
  return p;
}

function midCity(seed = 11) {
  const W = 640, H = 140, p = new Pix(W, H), r = rng(seed);
  midCity.stacks = [];
  const building = (x, w, h) => {
    const y = H - h; p.rect(x, y, w, h, 'v'); p.rect(x, y, w, 1, 'V'); p.rect(x, y, 1, h, 'V'); p.rect(x + w - 1, y, 1, h, 'k');
    for (let fy = y + 6; fy < H - 6; fy += 9) { p.rect(x + 2, fy + 6, w - 4, 1, 'k'); for (let wx = x + 4; wx < x + w - 5; wx += 6) { const lit = r.chance(0.42); p.rect(wx, fy, 3, 4, lit ? (r.chance(0.5) ? 'O' : 'y') : 'k'); if (lit) p.set(wx, fy, 'Y'); } }
    return y;
  };
  let x = 0;
  while (x < W) {
    const kind = r.int(0, 5), w = r.int(34, 70);
    if (kind <= 1) { const y = building(x, w, r.int(50, 110)); if (r.chance(0.6)) { p.rect(x + 4, y - 8, 10, 8, 'v'); p.rect(x + 4, y - 8, 10, 1, 'V'); p.rect(x + 2, y - 10, 14, 2, 'V'); for (const lx of [x + 5, x + 12]) p.rect(lx, y - 1, 1, 1, 'k'); } if (r.chance(0.5)) { p.rect(x + w - 8, y - 16, 1, 16, 'V'); p.set(x + w - 8, y - 17, 'R'); } }
    else if (kind === 2) { // smokestack cluster
      p.rect(x, H - 46, w, 46, 'v'); p.rect(x, H - 46, w, 1, 'V');
      for (let s = 0; s < 2; s++) { const sx = x + 8 + s * 22, sh = r.int(84, 122); midCity.stacks.push({ x: sx + 4, y: H - sh }); p.rect(sx, H - sh, 9, sh, 'v'); p.rect(sx, H - sh, 2, sh, 'V'); p.rect(sx - 1, H - sh, 11, 3, 'V'); for (let b = 0; b < 3; b++) p.rect(sx, H - sh + 8 + b * 7, 9, 3, b % 2 ? 'r' : 'u'); }
      for (let wx = x + 4; wx < x + w - 4; wx += 7) p.rect(wx, H - 38, 4, 3, r.chance(0.6) ? 'O' : 'k');
    } else if (kind === 3) { // storage spheres
      p.rect(x, H - 30, w, 30, 'v'); p.rect(x, H - 30, w, 1, 'V');
      for (let s = 0; s < 2; s++) { const cx = x + 14 + s * 28; p.ellipse(cx, H - 46, 13, 13, 'v'); p.ellipse(cx - 4, H - 51, 6, 5, 'V'); p.rect(cx - 13, H - 46, 27, 1, 'k'); p.rect(cx - 9, H - 34, 2, 6, 'V'); p.rect(cx + 8, H - 34, 2, 6, 'V'); }
    } else if (kind === 4) { // refinery frame with pipes
      const y = H - r.int(60, 96);
      for (let gx = x; gx < x + w; gx += 12) p.rect(gx, y, 2, H - y, 'v');
      for (let gy = y; gy < H; gy += 14) { p.rect(x, gy, w, 2, 'v'); p.rect(x, gy, w, 1, 'V'); }
      for (let gx = x; gx + 12 < x + w; gx += 12) for (let gy = y; gy + 14 < H; gy += 14) if (r.chance(0.5)) p.line(gx + 1, gy + 1, gx + 12, gy + 14, 'v'); else if (r.chance(0.3)) { p.rect(gx + 3, gy + 4, 8, 8, 'v'); p.rect(gx + 3, gy + 4, 8, 1, 'V'); p.rect(gx + 5, gy + 7, 3, 2, 'O'); }
      p.rect(x + 6, y - 12, 3, 12, 'v'); p.set(x + 7, y - 13, 'R');
    } else { // crane
      const y = H - 100; p.rect(x + 10, y, 4, 100, 'v'); p.rect(x + 10, y, 1, 100, 'V'); for (let gy = y; gy < H; gy += 8) p.line(x + 10, gy, x + 13, gy + 8, 'k');
      p.rect(x - 6, y + 4, w + 4, 3, 'v'); p.rect(x - 6, y + 4, w + 4, 1, 'V'); p.line(x + 12, y - 10, x + w - 4, y + 4, 'V'); p.line(x + 12, y - 10, x - 6, y + 4, 'V'); p.rect(x + 11, y - 10, 2, 10, 'v');
      p.rect(x + w - 10, y + 7, 1, 24, 'V'); p.rect(x + w - 13, y + 31, 7, 5, 'v'); p.rect(x + w - 13, y + 31, 7, 1, 'V'); p.set(x + 12, y - 11, 'R');
    }
    x += w + r.int(2, 10);
  }
  // elevated rail line across the whole strip
  p.rect(0, H - 58, W, 3, 'v'); p.rect(0, H - 58, W, 1, 'V'); for (let px = 6; px < W; px += 40) { p.rect(px, H - 55, 3, 55, 'v'); p.line(px - 6, H - 55, px + 1, H - 48, 'v'); p.line(px + 9, H - 55, px + 2, H - 48, 'v'); }
  return p;
}

function nearCity(seed = 23) {
  const W = 640, H = 120, p = new Pix(W, H), r = rng(seed);
  let x = 0;
  while (x < W) {
    const kind = r.int(0, 3), w = r.int(40, 90);
    if (kind === 0) { // water tower
      const y = H - r.int(60, 90); p.poly([[x + 8, y + 22], [x + 30, y + 22], [x + 36, H], [x + 2, H]], 0);
      for (const lx of [x + 8, x + 29]) p.rect(lx, y + 20, 2, H - y - 20, 'k'); p.line(x + 9, y + 30, x + 29, y + 50, 'k'); p.line(x + 29, y + 30, x + 9, y + 50, 'k'); p.line(x + 9, y + 54, x + 29, y + 74, 'k'); p.line(x + 29, y + 54, x + 9, y + 74, 'k');
      p.rect(x + 4, y, 30, 22, 'k'); p.rect(x + 4, y, 30, 1, 'n'); p.rect(x + 4, y, 1, 22, 'n'); p.poly([[x + 3, y], [x + 19, y - 9], [x + 35, y]], 'k'); p.line(x + 3, y, x + 19, y - 9, 'n'); for (let b = 0; b < 3; b++) p.rect(x + 4, y + 5 + b * 6, 30, 1, 'K');
    } else if (kind === 1) { // pipe rack
      const y = H - r.int(30, 56); for (let px = x; px < x + w; px += 16) { p.rect(px, y, 2, H - y, 'k'); p.rect(px, y, 1, H - y, 'n'); }
      for (let i = 0; i < 3; i++) { p.rect(x - 4, y + i * 6, w + 8, 4, 'k'); p.rect(x - 4, y + i * 6, w + 8, 1, 'n'); for (let fx = x + 6; fx < x + w; fx += 22) p.rect(fx, y + i * 6 - 1, 2, 6, 'n'); }
      p.rect(x + 12, y - 14, 4, 14, 'k'); p.rect(x + 9, y - 16, 10, 3, 'k'); p.rect(x + 9, y - 16, 10, 1, 'n');
    } else if (kind === 2) { // billboard + roofline
      const y = H - r.int(40, 70); p.rect(x, y + 26, w, H - y - 26, 'k'); p.rect(x, y + 26, w, 1, 'n');
      p.rect(x + 6, y, w - 14, 20, 'K'); p.frame(x + 6, y, w - 14, 20, 'n'); p.rect(x + 12, y + 20, 2, 6, 'k'); p.rect(x + w - 16, y + 20, 2, 6, 'k');
      // neon glyphs: square frames (the keepers' sigil)
      for (let g = 0; g < Math.floor((w - 24) / 12); g++) { const gx = x + 11 + g * 12, c = g % 2 ? 'm' : 'c'; p.frame(gx, y + 5, 8, 9, c); if (g % 3 === 0) p.rect(gx + 3, y + 8, 2, 3, c); }
    } else { // antenna farm
      const y = H - r.int(24, 44); p.rect(x, y, w, H - y, 'k'); p.rect(x, y, w, 1, 'n');
      for (let a = 0; a < 3; a++) { const ax = x + 8 + a * r.int(10, 20), ah = r.int(14, 40); p.rect(ax, y - ah, 1, ah, 'k'); p.rect(ax - 3, y - ah + 4, 7, 1, 'k'); p.rect(ax - 2, y - ah + 9, 5, 1, 'k'); p.set(ax, y - ah - 1, 'R'); }
      for (let vx = x + 4; vx < x + w - 6; vx += 12) { p.rect(vx, y - 5, 6, 5, 'k'); p.rect(vx, y - 5, 6, 1, 'n'); }
    }
    x += w + r.int(6, 26);
  }
  // sagging cables
  for (let i = 0; i < 6; i++) { const x0 = r.int(0, W - 120), y0 = r.int(20, 60), len = r.int(70, 140); for (let t = 0; t <= len; t++) { const u = t / len; p.set(x0 + t, Math.round(y0 + Math.sin(u * Math.PI) * 9), 'k'); } }
  return p;
}

// Gear rotation frames (covers one 60° symmetric period).
export function gearFrames(R, teeth, n = 8, cols = ['v', 'V', 'u']) {
  const frames = [], size = (R + 4) * 2;
  for (let f = 0; f < n; f++) {
    const p = new Pix(size, size), c = size / 2, rot = (f / n) * (Math.PI / 3);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const dx = x - c + 0.5, dy = y - c + 0.5, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx) - rot;
      const tooth = ((a / (Math.PI * 2)) * teeth % 1 + 1) % 1 < 0.5;
      if (d > R + (tooth ? 3 : 0)) continue;
      let col = cols[0];
      if (d > R - 3) col = cols[1];
      // spoke holes
      const sa = (((a / (Math.PI * 2)) * 6) % 1 + 1) % 1;
      if (d > R * 0.32 && d < R * 0.72 && sa > 0.22 && sa < 0.78) continue;
      if (d < R * 0.3) col = d < R * 0.12 ? cols[2] : cols[1];
      if (dx + dy < -R * 0.9 && d > R - 3) col = cols[2];
      p.set(x, y, col);
    }
    frames.push(p.toCanvas());
  }
  return frames;
}

// --- the train ---------------------------------------------------------------
// One car is 12 tiles long and 3 tiles tall (the roof is the walkable top).
export function trainCar(kind = 0) {
  const W = 192, H = 64, p = new Pix(W, H);
  // body
  p.rect(2, 6, W - 4, 40, 'N'); p.rect(2, 6, W - 4, 2, 'B'); p.rect(2, 30, W - 4, 3, 'b'); p.rect(2, 33, W - 4, 13, 'n'); p.rect(2, 44, W - 4, 2, 'k');
  // roof: ribbed, lighter (this is the floor the player runs on)
  p.rect(0, 0, W, 7, 'h'); p.rect(0, 0, W, 1, 'W'); p.rect(0, 1, W, 1, 'i'); p.rect(0, 2, W, 2, 'H'); p.rect(0, 6, W, 1, 'K');
  for (let x = 6; x < W; x += 12) { p.rect(x, 2, 1, 4, 'G'); }
  for (let x = 30; x < W - 20; x += 48) { p.rect(x, 2, 14, 3, 'G'); p.rect(x, 2, 14, 1, 'h'); } // roof vents
  // windows
  if (kind === 0) for (let x = 12; x < W - 20; x += 22) { p.rect(x, 12, 15, 12, 'K'); p.rect(x + 1, 13, 13, 10, 'y'); p.rect(x + 1, 13, 13, 2, 'Y'); p.rect(x + 1, 21, 13, 2, 'O'); p.rect(x + 7, 13, 1, 10, 'K'); if ((x / 22) % 3 === 1) { p.rect(x + 3, 17, 3, 6, 'k'); p.rect(x + 3, 15, 3, 3, 'k'); } }
  else { // cargo car: corrugated panels + hazard door
    for (let x = 6; x < W - 6; x += 4) p.rect(x, 9, 1, 20, 'b');
    p.rect(76, 9, 40, 22, 'G'); p.frame(76, 9, 40, 22, 'K'); for (let i = 0; i < 40; i += 8) p.poly([[76 + i, 30], [80 + i, 30], [84 + i, 26], [80 + i, 26]], 'y'); p.rect(94, 14, 4, 6, 'h');
  }
  // stripe + rivets
  p.rect(2, 26, W - 4, 2, 'c'); p.rect(2, 26, W - 4, 1, 'C');
  for (let x = 5; x < W - 4; x += 8) p.set(x, 36, 'b');
  // doors at both ends
  for (const x of [4, W - 14]) { p.rect(x, 10, 10, 34, 'n'); p.frame(x, 10, 10, 34, 'K'); p.rect(x + 2, 13, 6, 8, 'O'); p.set(x + 7, 28, 'i'); }
  // undercarriage
  p.rect(8, 46, W - 16, 6, 'g'); p.rect(8, 46, W - 16, 1, 'G'); for (let x = 40; x < W - 40; x += 26) { p.rect(x, 48, 16, 6, 'G'); p.rect(x, 48, 16, 1, 'h'); }
  // couplers
  p.rect(0, 38, 3, 4, 'G'); p.rect(W - 3, 38, 3, 4, 'G');
  return p;
}
export function trainLoco() {
  const W = 192, H = 64, p = trainCar(0);
  // sloped nose on the right
  for (let y = 0; y < 46; y++) { const cut = Math.max(0, Math.round((46 - y) * 0.75) - 6); for (let x = W - cut; x < W; x++) p.set(x, y, 0); }
  p.line(W - 28, 0, W - 2, 34, 'W', 2); p.rect(W - 34, 12, 22, 12, 'K'); p.poly([[W - 33, 13], [W - 22, 13], [W - 14, 23], [W - 33, 23]], 'C'); p.poly([[W - 33, 13], [W - 24, 13], [W - 22, 16], [W - 33, 16]], 'w');
  p.rect(W - 10, 36, 8, 6, 'Y'); p.rect(W - 9, 37, 6, 4, 'W'); p.rect(W - 12, 44, 12, 4, 'R');
  return p;
}
export function wheel(f) {
  const p = new Pix(14, 14);
  p.ellipse(6.5, 6.5, 6.5, 6.5, 'K'); p.ellipse(6.5, 6.5, 5.5, 5.5, 'G'); p.ellipse(6.5, 6.5, 4, 4, 'g'); p.ellipse(6.5, 6.5, 1.5, 1.5, 'H');
  const a = (f / 4) * Math.PI * 0.5; for (let i = 0; i < 4; i++) { const b = a + (i * Math.PI) / 2; p.line(6.5 + Math.cos(b) * 1.5, 6.5 + Math.sin(b) * 1.5, 6.5 + Math.cos(b) * 4.4, 6.5 + Math.sin(b) * 4.4, 'h'); }
  return p;
}

export function buildBackgrounds() {
  const skyP = sky(), fw = framework();
  const skyC = skyP.toCanvas(), fwC = fw.toCanvas();
  const far = farCity(), mid = midCity(), near = nearCity();
  // far city haze fix: re-stamp haze only where transparent stays transparent
  return {
    sky: skyC, framework: fwC, far: far.toCanvas(), mid: mid.toCanvas(), near: near.toCanvas(),
    gearBig: gearFrames(30, 12, 8, ['v', 'V', 'u']), gearSmall: gearFrames(15, 8, 8, ['v', 'V', 'u']),
    gearFg: gearFrames(22, 10, 8, ['n', 'N', 'b']),
    car0: trainCar(0).toCanvas(), car1: trainCar(1).toCanvas(), loco: trainLoco().toCanvas(),
    wheels: [0, 1, 2, 3].map((f) => wheel(f).toCanvas()), stacks: midCity.stacks.slice(),
    farW: 480, midW: 640, nearW: 640,
  };
}

// Preview sheet for the art tool.
export function addBgFrames(atlas) {
  atlas.add('sky', sky()); atlas.add('framework', framework()); atlas.add('far', farCity()); atlas.add('mid', midCity()); atlas.add('near', nearCity());
  atlas.add('car0', trainCar(0)); atlas.add('car1', trainCar(1)); atlas.add('loco', trainLoco());
}
export function makeStatic(w, h) { return makeCanvas(w, h); }
