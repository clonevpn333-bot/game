// Chapter 1 sprite art: enemies, Vell, props, projectiles and effects.
// Big forms are blocked in with pixel-exact primitives, details are stamped
// by hand, and every animation frame is authored separately.
import { Pix } from './pix.js';

// --- shared drawing helpers ------------------------------------------------------
// Shaded metal plate: ramp = [dark, mid, light, highlight]
function plate(p, x, y, w, h, r, rivets = false) {
  p.rect(x, y, w, h, r[1]);
  p.rect(x, y, w, 1, r[2]); p.rect(x, y, 1, h, r[2]);
  p.rect(x, y + h - 1, w, 1, r[0]); p.rect(x + w - 1, y, 1, h, r[0]);
  p.set(x, y, r[3]);
  if (rivets && w > 5 && h > 5) { p.set(x + 2, y + 2, r[0]); p.set(x + w - 3, y + 2, r[0]); p.set(x + 2, y + h - 3, r[0]); p.set(x + w - 3, y + h - 3, r[0]); }
}
function dome(p, cx, cy, rx, ry, r) {
  p.ellipse(cx, cy, rx, ry, r[1]);
  p.ellipse(cx - rx * 0.25, cy - ry * 0.3, rx * 0.55, ry * 0.5, r[2]);
  p.set(Math.round(cx - rx * 0.4), Math.round(cy - ry * 0.5), r[3]);
}
const STEEL = ['G', 'h', 'H', 'i'], RUST = ['D', 'e', 'E', 'a'], DARK = ['K', 'g', 'G', 'h'], BRASS = ['e', 'E', 'a', 'A'];
const HAZ = ['o', 'O', 'y', 'Y'], CRIM = ['r', 'R', 'o', 'O'], VIOL = ['V', 'u', 'U', 'm'], NAVY = ['k', 'n', 'N', 'b'];

// --- SCRAPPER: rust walker with a wrench arm -------------------------------------
function scrapper({ bob = 0, legA = 0, legB = 0, arm = 'rest', eye = 'R', lean = 0, squash = 0 }) {
  const p = new Pix(40, 34), X = 18 + lean, Y = 30;
  // legs (pistons): thigh housing + sliding rod + foot
  const leg = (x, lift, dark) => {
    const L = new Pix(40, 34), c = dark ? ['K', 'g', 'G', 'h'] : STEEL;
    L.rect(x, Y - 9 + bob, 3, 4, c[1]); L.rect(x + 1, Y - 6 + bob, 1, 5 - lift - bob, c[3]);
    L.rect(x - 1, Y - 2 - lift, 5, 2, c[2]); L.rect(x - 1, Y - 1 - lift, 5, 1, c[0]);
    p.blit(L, 0, 0, { sep: 'K' });
  };
  leg(X - 6, legB, true); leg(X + 2, legA, false);
  // back arm stub
  p.rect(X - 8, Y - 17 + bob, 3, 3, 'G');
  // body: can with domed head
  const B = new Pix(40, 34), by = Y - 21 + bob + squash;
  dome(B, X, by + 3, 8, 6 - squash, RUST);
  plate(B, X - 8, by + 3, 17, 10 - squash, RUST);
  B.rect(X - 8, by + 3, 17, 1, 'D');
  // visor
  B.rect(X - 3, by + 4, 11, 4, 'K');
  B.rect(X - 2, by + 5, 9, 2, eye === 'R' ? 'r' : 'o'); B.rect(X + 1, by + 5, 4, 2, eye === 'R' ? 'R' : 'y'); B.set(X + 3, by + 5, eye === 'R' ? 'o' : 'W');
  // chest bolts, vent, hazard stripe
  B.rect(X - 6, by + 9, 5, 1, 'D'); B.rect(X - 6, by + 11, 5, 1, 'D');
  B.set(X + 5, by + 10, 'A'); B.set(X + 2, by + 10, 'A');
  B.rect(X - 8, by + 12 - squash, 17, 1, 'D');
  // antenna
  B.line(X - 4, by - 3, X - 6, by - 7, 'h'); B.set(X - 6, by - 8, eye === 'R' ? 'R' : 'y');
  p.blit(B, 0, 0, { sep: 'K' });
  // wrench arm
  const A = new Pix(40, 34), sx = X + 6, sy = by + 8;
  const arms = { rest: [[3, 4], [5, 8]], back: [[-3, -3], [-7, -7]], up: [[2, -5], [1, -11]], fwd: [[6, 0], [12, 1]], down: [[5, 4], [10, 7]] };
  const [e, h] = arms[arm];
  A.line(sx, sy, sx + e[0], sy + e[1], 'G', 3); A.line(sx + e[0], sy + e[1], sx + h[0], sy + h[1], 'h', 2);
  A.line(sx, sy, sx + e[0], sy + e[1], 'H', 1);
  // wrench head (C shape)
  const hx = sx + h[0], hy = sy + h[1];
  A.rect(hx - 1, hy - 2, 4, 5, 'i'); A.rect(hx + 1, hy - 1, 2, 3, 0); A.rect(hx - 1, hy - 2, 4, 1, 'W');
  A.set(sx, sy, 'A');
  p.blit(A, 0, 0, { sep: 'K' });
  return p.outline('K');
}

// --- WASP DRONE: hazard-yellow flyer ----------------------------------------------
function wasp({ rotor = 0, eye = 'J', tilt = 0, hurt = false }) {
  const p = new Pix(28, 24), X = 14, Y = 13 + tilt;
  // rotor mast + blades (2 frames: wide blur / narrow)
  p.rect(X - 1, Y - 8, 2, 3, 'h');
  if (rotor === 0) { p.rect(X - 10, Y - 9, 20, 1, 'i'); p.rect(X - 7, Y - 10, 14, 1, 'H'); }
  else { p.rect(X - 5, Y - 9, 10, 1, 'W'); p.rect(X - 9, Y - 9, 3, 1, 'h'); p.rect(X + 6, Y - 9, 3, 1, 'h'); }
  // body
  const B = new Pix(28, 24);
  B.ellipse(X, Y, 8, 5, 'O'); B.ellipse(X - 1, Y - 2, 6, 2.4, 'y'); B.set(X - 4, Y - 3, 'Y');
  B.rect(X - 2, Y - 5, 2, 11, 'K'); B.rect(X + 3, Y - 4, 2, 9, 'K');           // hazard bands
  B.rect(X - 8, Y + 1, 17, 1, 'o');
  // eye pod
  B.rect(X + 4, Y - 2, 5, 4, 'K'); B.rect(X + 5, Y - 1, 3, 2, eye === 'J' ? 'J' : 'R'); B.set(X + 6, Y - 1, eye === 'J' ? 'p' : 'Y');
  // stinger cannon
  B.rect(X - 1, Y + 5, 3, 3, 'G'); B.rect(X, Y + 7, 1, 2, 'h');
  // tail fin
  B.poly([[X - 8, Y - 1], [X - 12, Y - 4], [X - 12, Y + 2]], 'o'); B.set(X - 12, Y - 4, 'O');
  p.blit(B, 0, 0);
  if (hurt) p.remapAll({ O: 'W', y: 'W', o: 'i' });
  return p.outline('K');
}

// --- SENTRY: floor turret with telegraphed burst -----------------------------------
function sentry({ charge = 0, recoil = 0, eye = 'B' }) {
  const p = new Pix(30, 26), X = 13, Y = 24;
  plate(p, X - 9, Y - 5, 19, 5, DARK); p.rect(X - 9, Y - 5, 19, 1, 'h');
  p.rect(X - 7, Y - 3, 2, 1, 'y'); p.rect(X - 3, Y - 3, 2, 1, 'y'); p.rect(X + 1, Y - 3, 2, 1, 'y'); p.rect(X + 5, Y - 3, 2, 1, 'y');
  p.rect(X - 2, Y - 9, 5, 4, 'G'); p.rect(X - 2, Y - 9, 1, 4, 'h');
  const H = new Pix(30, 26);
  dome(H, X, Y - 13, 7, 6, NAVY); H.rect(X - 7, Y - 12, 15, 3, 'N'); H.rect(X - 7, Y - 10, 15, 1, 'k');
  H.rect(X + 1, Y - 15, 5, 4, 'K'); H.rect(X + 2, Y - 14, 3, 2, charge ? 'O' : eye); H.set(X + 3, Y - 14, charge > 1 ? 'W' : charge ? 'Y' : 'L');
  // barrel
  H.rect(X + 6 - recoil, Y - 12, 8, 3, 'h'); H.rect(X + 6 - recoil, Y - 12, 8, 1, 'i'); H.rect(X + 13 - recoil, Y - 13, 2, 5, 'G'); H.rect(X + 13 - recoil, Y - 13, 2, 1, 'H');
  if (charge > 1) { H.set(X + 15 - recoil, Y - 11, 'Y'); H.set(X + 16 - recoil, Y - 11, 'W'); }
  p.blit(H, 0, 0, { sep: 'K' });
  return p.outline('K');
}

// --- BULWARK: heavy shield bot ---------------------------------------------------
function bulwark({ bob = 0, legA = 0, legB = 0, shield = 'front', lean = 0, eye = 'R' }) {
  const p = new Pix(48, 42), X = 22 + lean, Y = 38;
  const leg = (x, lift, dark) => {
    const L = new Pix(48, 42), c = dark ? DARK : STEEL;
    L.rect(x, Y - 11 + bob, 5, 6, c[1]); L.rect(x, Y - 11 + bob, 1, 6, c[2]); L.rect(x + 1, Y - 6 + bob, 3, 5 - lift - bob, c[0]); L.rect(x + 2, Y - 6 + bob, 1, 5 - lift - bob, c[2]);
    L.rect(x - 1, Y - 3 - lift, 8, 3, c[1]); L.rect(x - 1, Y - 3 - lift, 8, 1, c[3]); L.rect(x - 1, Y - 1 - lift, 8, 1, c[0]);
    p.blit(L, 0, 0, { sep: 'K' });
  };
  leg(X - 9, legB, true); leg(X + 1, legA, false);
  const B = new Pix(48, 42), by = Y - 30 + bob;
  // hunched torso
  plate(B, X - 11, by + 6, 22, 14, CRIM); B.rect(X - 11, by + 6, 22, 2, 'O'); B.rect(X - 11, by + 18, 22, 2, 'r');
  dome(B, X - 1, by + 6, 11, 6, CRIM);
  // shoulder exhausts
  B.rect(X - 10, by - 3, 3, 5, 'G'); B.rect(X - 10, by - 3, 3, 1, 'i'); B.rect(X - 5, by - 2, 3, 4, 'G'); B.rect(X - 5, by - 2, 3, 1, 'i');
  // head slit
  B.rect(X - 1, by + 4, 10, 5, 'K'); B.rect(X, by + 6, 8, 2, 'r'); B.rect(X + 3, by + 6, 4, 2, eye === 'R' ? 'O' : 'W'); B.set(X + 5, by + 6, 'Y');
  // belly furnace grille
  B.rect(X - 7, by + 12, 9, 5, 'K'); for (let i = 0; i < 4; i++) B.rect(X - 6 + i * 2, by + 13, 1, 3, i % 2 ? 'o' : 'y');
  B.set(X + 6, by + 11, 'A'); B.set(X + 6, by + 15, 'A');
  p.blit(B, 0, 0, { sep: 'K' });
  // shield
  const S = new Pix(48, 42);
  if (shield === 'front') {
    plate(S, X + 9, by + 1, 7, 24, STEEL, true); S.rect(X + 10, by + 4, 5, 2, 'y'); S.rect(X + 10, by + 20, 5, 2, 'y');
    S.rect(X + 11, by + 9, 3, 8, 'B'); S.rect(X + 11, by + 9, 1, 8, 'L'); S.rect(X + 15, by + 1, 1, 24, 'W');
    S.rect(X + 6, by + 11, 3, 3, 'G');
  } else if (shield === 'bash') {
    plate(S, X + 13, by + 2, 8, 24, STEEL, true); S.rect(X + 14, by + 5, 6, 2, 'y'); S.rect(X + 14, by + 21, 6, 2, 'y');
    S.rect(X + 15, by + 10, 4, 8, 'B'); S.rect(X + 20, by + 2, 1, 24, 'W'); S.rect(X + 6, by + 12, 7, 3, 'G'); S.rect(X + 6, by + 12, 7, 1, 'H');
  } else if (shield === 'up') { // staggered: shield thrown overhead
    plate(S, X - 2, by - 12, 24, 7, STEEL, true); S.rect(X + 1, by - 10, 2, 3, 'y'); S.rect(X + 17, by - 10, 2, 3, 'y'); S.rect(X + 7, by - 10, 8, 3, 'B');
    S.line(X + 8, by + 8, X + 9, by - 5, 'G', 3);
  } else if (shield === 'back') {
    plate(S, X + 5, by + 3, 6, 22, STEEL, true); S.rect(X + 6, by + 6, 4, 2, 'y');
  }
  p.blit(S, 0, 0, { sep: 'K' });
  return p.outline('K');
}

// --- VELL (pixel form): a little glitch-sprite that never fully renders ---------
function vell(f) {
  const p = new Pix(22, 24), X = 10, Y = 13 + [0, -1, 0, 1][f % 4];
  // antenna (crooked) with a lamp
  p.line(X + 1, Y - 6, X + 3, Y - 9, 'U'); p.line(X + 3, Y - 9, X + 2, Y - 11, 'U'); p.set(X + 2, Y - 12, f % 2 ? 'Y' : 'y');
  // body: rounded square, chipped corner
  p.rect(X - 6, Y - 5, 13, 11, 'U'); p.rect(X - 5, Y - 6, 11, 13, 'U');
  p.rect(X - 5, Y - 5, 9, 3, 'm'); p.rect(X - 4, Y - 5, 4, 1, 'M');
  p.rect(X - 6, Y + 3, 13, 2, 'u'); p.rect(X - 5, Y + 5, 11, 2, 'u');
  p.rect(X + 4, Y + 4, 3, 3, 0); p.set(X + 4, Y + 4, 'u');                 // missing corner
  // one big eye, one small eye (always mismatched)
  p.rect(X - 4, Y - 2, 5, 5, 'W'); p.rect(X - 2 + (f === 2 ? -1 : 0), Y - 1, 2, 3, 'K'); p.set(X - 4, Y - 2, 'i');
  p.rect(X + 3, Y - 1, 2, 2, 'W'); p.set(X + 4, Y, 'K');
  if (f === 3) { p.rect(X - 4, Y - 2, 5, 5, 'U'); p.rect(X - 4, Y, 5, 1, 'K'); p.rect(X + 3, Y - 1, 2, 2, 'U'); p.rect(X + 3, Y, 2, 1, 'K'); } // blink
  // little feet
  p.rect(X - 4, Y + 7, 2, 2, 'V'); p.rect(X + 1, Y + 7, 2, 2, 'V');
  // glitch: one scanline of the body displaced
  if (f === 1) { for (let x = 0; x < 20; x++) { const c = p.get(x, Y + 1); p.set(x, Y + 1, 0); if (c) p.set(x + 2, Y + 1, c); } }
  return p.outline('K');
}

// --- props -------------------------------------------------------------------
function crate() {
  const p = new Pix(16, 16);
  p.rect(0, 0, 16, 16, 'E'); for (let y = 3; y < 16; y += 4) p.rect(0, y, 16, 1, 'e');
  for (let i = 0; i < 16; i++) { p.set(i, i, 'a'); p.set(i, 15 - i, 'a'); p.set(i + 1, i, 'e'); }
  p.frame(0, 0, 16, 16, 'D'); p.frame(1, 1, 14, 14, 'a'); p.rect(1, 14, 14, 1, 'e'); p.rect(14, 1, 1, 14, 'e');
  for (const [x, y] of [[0, 0], [13, 0], [0, 13], [13, 13]]) { p.rect(x, y, 3, 3, 'h'); p.set(x + 1, y + 1, 'i'); }
  return p;
}
function barrel(f) {
  const p = new Pix(14, 18);
  p.rect(1, 1, 12, 16, 'R'); p.rect(1, 1, 3, 16, 'o'); p.rect(11, 1, 2, 16, 'r'); p.rect(2, 1, 1, 16, 'O');
  for (const y of [1, 5, 12, 16]) { p.rect(0, y, 14, 1, 'G'); p.set(2, y, 'i'); }
  p.rect(3, 7, 8, 4, 'y'); p.poly([[5, 10], [7, 7], [9, 10]], 'K'); p.set(7, 9, f ? 'W' : 'y');
  return p.outline('K');
}
function beacon(on, f) {
  const p = new Pix(16, 34), X = 8;
  plate(p, X - 6, 28, 12, 5, STEEL); p.rect(X - 1, 8, 3, 20, 'h'); p.rect(X - 1, 8, 1, 20, 'i'); p.rect(X + 1, 8, 1, 20, 'G');
  p.rect(X - 2, 20, 5, 2, 'G'); p.rect(X - 2, 12, 5, 2, 'G');
  p.rect(X - 4, 2, 9, 7, 'K'); p.rect(X - 3, 3, 7, 5, on ? (f ? 'C' : 'c') : 'N'); if (on) { p.rect(X - 2, 4, 3, 2, 'w'); } else p.set(X - 2, 4, 'b');
  // the square "frame" glyph
  p.frame(X - 2, 4, 5, 3, on ? 'w' : 'b');
  return p.outline('K');
}
function gib(kind) {
  const p = new Pix(10, 10);
  if (kind === 0) { p.ellipse(4.5, 4.5, 3.5, 3.5, 'h'); p.ellipse(4.5, 4.5, 1.5, 1.5, 0); for (const [x, y] of [[4, 0], [5, 0], [4, 9], [5, 9], [0, 4], [0, 5], [9, 4], [9, 5]]) p.set(x, y, 'H'); p.set(3, 2, 'i'); }
  if (kind === 1) { p.rect(2, 3, 6, 3, 'E'); p.rect(2, 3, 6, 1, 'a'); p.set(3, 5, 'D'); }
  if (kind === 2) { p.rect(3, 1, 3, 7, 'h'); p.rect(2, 1, 5, 2, 'H'); p.set(3, 1, 'i'); }
  if (kind === 3) { p.poly([[1, 6], [5, 1], [8, 5], [4, 8]], 'e'); p.set(4, 3, 'E'); }
  return p.outline('K');
}

// --- effects --------------------------------------------------------------------
// Slash crescents: bright leading edge, cyan body, dithered teal tail.
function slash(w, h, cx, cy, r, a0, a1, f, thick = 5) {
  const p = new Pix(w, h), T = [1, 0.75, 0.4][f], th = thick * [1, 0.8, 0.45][f];
  const span = a1 - a0, lead = a0 + span * [0.55, 1, 1][f], tail = a0 + span * [0, 0.25, 0.6][f];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy); if (d > r || d < r - th) continue;
    let a = Math.atan2(dy, dx); while (a < a0 - 0.01) a += Math.PI * 2; while (a > a0 + Math.PI * 2) a -= Math.PI * 2;
    if (a < tail || a > lead) continue;
    const u = (a - tail) / Math.max(0.01, lead - tail), edge = (r - d) / th; // u: 0 tail → 1 lead
    const width = u * u; if (edge > width + 0.15) continue;
    let c = 'T';
    if (u > 0.75 && edge < 0.5) c = 'W'; else if (u > 0.45) c = edge < 0.35 ? 'w' : 'C'; else if (u > 0.2) c = 'c';
    if (c === 'T' && (x + y) % 2) continue; // dithered tail
    if (T < 0.5 && c === 'W') c = 'C';
    p.set(x, y, c);
  }
  return p;
}
function hitSpark(f) {
  const p = new Pix(32, 32), c = 16, len = [5, 10, 13, 14][f], inner = [0, 3, 8, 12][f];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.3, l = i % 2 ? len * 0.6 : len;
    p.line(c + Math.cos(a) * inner, c + Math.sin(a) * inner, c + Math.cos(a) * l, c + Math.sin(a) * l, f < 2 ? 'W' : 'y', f === 1 && i % 2 === 0 ? 2 : 1);
  }
  if (f === 0) { p.ellipse(c, c, 4, 4, 'W'); p.ellipse(c, c, 2, 2, 'Y'); }
  if (f === 1) { p.ellipse(c, c, 3, 3, 'Y', false); }
  return p;
}
function dust(f) {
  const p = new Pix(24, 16), r = [3, 4, 4, 3][f], spread = [2, 5, 8, 10][f], up = [0, 2, 4, 6][f];
  const col = f < 2 ? 'i' : 'H';
  p.ellipse(12 - spread, 12 - up, r, r, col); p.ellipse(12 + spread, 12 - up, r - 1, r - 1, col); p.ellipse(12, 12 - up - 1, r - 1, r - 1, f < 3 ? 'W' : 'H');
  if (f >= 2) for (let y = 0; y < 16; y++) for (let x = 0; x < 24; x++) if ((x + y) % 2 && f === 3) p.set(x, y, 0);
  if (f >= 1) { p.ellipse(12 - spread, 12 - up, r - 2, r - 2, 0); if (f >= 2) p.ellipse(12 + spread, 12 - up, r - 2, r - 2, 0); }
  return p;
}
function boom(f) {
  const p = new Pix(48, 48), c = 24;
  const R = [6, 13, 18, 21, 22, 23][f];
  if (f === 0) { p.ellipse(c, c, R, R, 'W'); return p; }
  const cols = [['W'], ['Y', 'W'], ['O', 'y', 'Y'], ['o', 'O', 'y'], ['R', 'o'], ['G', 'r']][f];
  const blobs = [[0, 0, 1], [-0.45, -0.3, 0.6], [0.5, -0.25, 0.55], [0.2, 0.5, 0.6], [-0.4, 0.45, 0.5]];
  cols.forEach((col, i) => { const s = 1 - i * 0.3; for (const [bx, by, br] of blobs) p.ellipse(c + bx * R, c + by * R, br * R * s, br * R * s, col); });
  if (f >= 3) { const hole = R * [0, 0, 0, 0.45, 0.7, 0.86][f]; for (const [bx, by, br] of blobs) p.ellipse(c + bx * R * 0.8, c + by * R * 0.8 + 1, br * hole, br * hole, 0); }
  if (f === 5) for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if ((x + y) % 2) p.set(x, y, 0);
  return p;
}
function frameShot(f) { // Rin's projectile: a tumbling hollow frame
  const p = new Pix(14, 14), c = 7;
  if (f === 0) { p.frame(c - 4, c - 4, 8, 8, 'C'); p.frame(c - 3, c - 3, 6, 6, 'w'); }
  else if (f === 1) { p.poly([[c, c - 5], [c + 5, c], [c, c + 5], [c - 5, c]], 'C'); p.poly([[c, c - 4], [c + 4, c], [c, c + 4], [c - 4, c]], 'w'); p.poly([[c, c - 2], [c + 2, c], [c, c + 2], [c - 2, c]], 0); }
  else { p.frame(c - 5, c - 2, 10, 5, 'C'); p.frame(c - 4, c - 1, 8, 3, 'w'); }
  return p.outline('T');
}
function bigShot(f) {
  const p = new Pix(24, 24), c = 12, s = f ? 8 : 9;
  p.frame(c - s, c - s, s * 2, s * 2, 'c'); p.frame(c - s + 1, c - s + 1, s * 2 - 2, s * 2 - 2, 'C'); p.frame(c - s + 2, c - s + 2, s * 2 - 4, s * 2 - 4, 'w');
  p.frame(c - 3, c - 3, 6, 6, f ? 'C' : 'w');
  return p.outline('T');
}
function bullet(f, col = ['R', 'O', 'Y']) {
  const p = new Pix(10, 10);
  p.ellipse(4.5, 4.5, 3.5, 3.5, col[0]); p.ellipse(4.5, 4.5, 2.5, 2.5, col[1]); p.ellipse(f ? 4 : 5, 4, 1, 1, col[2]);
  return p.outline('K');
}
function ring(f) {
  const p = new Pix(32, 14), rx = [5, 9, 13, 15][f];
  p.ellipse(16, 7, rx, rx * 0.35, f < 2 ? 'W' : 'C', false);
  if (f === 3) for (let x = 0; x < 32; x += 2) for (let y = 0; y < 14; y++) p.set(x, y, 0);
  return p;
}
function smoke(f) {
  const p = new Pix(20, 20), r = [3, 5, 7, 8][f], col = ['h', 'G', 'G', 'g'][f];
  p.ellipse(10, 10, r, r, col); p.ellipse(8, 8, r * 0.6, r * 0.6, ['H', 'h', 'G', 'G'][f]);
  if (f >= 2) for (let y = 0; y < 20; y++) for (let x = 0; x < 20; x++) if ((x + y + f) % 2 && Math.hypot(x - 10, y - 10) > r * 0.5) p.set(x, y, 0);
  return p;
}
function bolt(f) { // electric hazard arc 16x16
  const p = new Pix(16, 16), pts = f ? [[2, 15], [5, 9], [3, 6], [8, 3], [6, 0]] : [[13, 15], [9, 10], [12, 6], [7, 3], [9, 0]];
  for (let i = 0; i + 1 < pts.length; i++) p.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 'C');
  for (let i = 0; i + 1 < pts.length; i++) p.line(pts[i][0] + 1, pts[i][1], pts[i + 1][0] + 1, pts[i + 1][1], 'w');
  return p;
}
function shard() { // the loose pixel Rin carries between realities
  const p = new Pix(10, 10);
  p.rect(2, 2, 6, 6, 'm'); p.rect(2, 2, 6, 1, 'M'); p.rect(2, 2, 1, 6, 'M'); p.rect(3, 3, 2, 2, 'W'); p.rect(7, 3, 1, 5, 'U'); p.rect(3, 7, 5, 1, 'U');
  return p.outline('K');
}
function heart(full) { const p = new Pix(9, 8); p.stamp(0, 0, ['.KK.KK...', 'KccKcCK..', 'KcccccK..', 'KTcccTK..', '.KTcTK...', '..KTK....', '...K.....']); if (!full) p.remapAll({ c: 'n', C: 'N', T: 'k' }); return p; }

export function addWorldFrames(atlas) {
  // scrapper
  const sw = [{ bob: 0, legA: 0, legB: 2 }, { bob: 1, legA: 0, legB: 1 }, { bob: 0, legA: 2, legB: 0 }, { bob: 1, legA: 1, legB: 0 }];
  sw.forEach((o, i) => atlas.add('scr_walk' + i, scrapper(o), 18, 31));
  atlas.add('scr_wind0', scrapper({ arm: 'back', lean: -1, eye: 'Y' }), 18, 31);
  atlas.add('scr_wind1', scrapper({ arm: 'up', lean: -2, eye: 'Y', bob: -1 }), 18, 31);
  atlas.add('scr_swing0', scrapper({ arm: 'fwd', lean: 3, eye: 'Y' }), 18, 31);
  atlas.add('scr_swing1', scrapper({ arm: 'down', lean: 2, bob: 1 }), 18, 31);
  atlas.add('scr_hurt', scrapper({ arm: 'up', lean: -3, squash: 1, eye: 'Y' }), 18, 31);
  // wasp
  atlas.add('wasp0', wasp({ rotor: 0 }), 14, 13); atlas.add('wasp1', wasp({ rotor: 1 }), 14, 13);
  atlas.add('wasp_aim0', wasp({ rotor: 0, eye: 'R', tilt: 1 }), 14, 13); atlas.add('wasp_aim1', wasp({ rotor: 1, eye: 'R', tilt: 1 }), 14, 13);
  atlas.add('wasp_hurt', wasp({ rotor: 1, hurt: true, tilt: -1 }), 14, 13);
  // sentry
  atlas.add('sentry0', sentry({}), 13, 25); atlas.add('sentry_c0', sentry({ charge: 1 }), 13, 25);
  atlas.add('sentry_c1', sentry({ charge: 2 }), 13, 25); atlas.add('sentry_fire', sentry({ charge: 2, recoil: 2 }), 13, 25);
  // bulwark
  sw.forEach((o, i) => atlas.add('bul_walk' + i, bulwark(o), 22, 39));
  atlas.add('bul_wind', bulwark({ lean: -2, shield: 'front', eye: 'W' }), 22, 39);
  atlas.add('bul_bash', bulwark({ lean: 3, shield: 'bash', eye: 'W', legA: 1 }), 22, 39);
  atlas.add('bul_stagger', bulwark({ lean: -2, shield: 'up', bob: 1 }), 22, 39);
  atlas.add('bul_hurt', bulwark({ lean: -3, shield: 'back', bob: 1, eye: 'W' }), 22, 39);
  // vell
  for (let i = 0; i < 4; i++) atlas.add('vell' + i, vell(i), 10, 13);
  // props
  atlas.add('crate', crate(), 8, 16); atlas.add('barrel0', barrel(0), 7, 18); atlas.add('barrel1', barrel(1), 7, 18);
  atlas.add('beacon_off', beacon(false, 0), 8, 34); atlas.add('beacon_on0', beacon(true, 0), 8, 34); atlas.add('beacon_on1', beacon(true, 1), 8, 34);
  for (let i = 0; i < 4; i++) atlas.add('gib' + i, gib(i), 5, 5);
  atlas.add('shard', shard(), 5, 5); atlas.add('heart1', heart(true), 0, 0); atlas.add('heart0', heart(false), 0, 0);
  // slashes — origin at Rin's feet-centre so they can be drawn at the player position
  const PI = Math.PI;
  for (let f = 0; f < 3; f++) {
    atlas.add('fx_s1_' + f, slash(64, 56, 30, 30, 26, -0.9, 0.75, f, 7), 28, 48);
    atlas.add('fx_s2_' + f, slash(64, 64, 26, 40, 30, 0.6 - PI * 0.5 - 1.4, 0.2, f, 7).clone(), 26, 54);
    atlas.add('fx_s3_' + f, slash(80, 72, 34, 40, 36, -PI * 0.75, PI * 0.42, f, 10), 30, 58);
    atlas.add('fx_up_' + f, slash(56, 80, 14, 46, 32, -PI * 0.62, 0.35, f, 8), 20, 60);
    atlas.add('fx_spin_' + f, slash(72, 72, 36, 36, 32, f * 1.6, f * 1.6 + PI * 1.5, f, 7), 36, 50);
  }
  for (let i = 0; i < 4; i++) { atlas.add('fx_hit' + i, hitSpark(i), 16, 16); atlas.add('fx_dust' + i, dust(i), 12, 14); atlas.add('fx_ring' + i, ring(i), 16, 7); atlas.add('fx_smoke' + i, smoke(i), 10, 10); }
  for (let i = 0; i < 6; i++) atlas.add('fx_boom' + i, boom(i), 24, 24);
  for (let i = 0; i < 3; i++) atlas.add('fx_shot' + i, frameShot(i), 7, 7);
  atlas.add('fx_big0', bigShot(0), 12, 12); atlas.add('fx_big1', bigShot(1), 12, 12);
  atlas.add('fx_bul0', bullet(0), 5, 5); atlas.add('fx_bul1', bullet(1), 5, 5);
  atlas.add('fx_mag0', bullet(0, ['U', 'm', 'W']), 5, 5); atlas.add('fx_mag1', bullet(1, ['U', 'M', 'W']), 5, 5);
  atlas.add('fx_bolt0', bolt(0), 8, 16); atlas.add('fx_bolt1', bolt(1), 8, 16);
}
export { plate, dome, STEEL, RUST, DARK, BRASS, HAZ, CRIM, VIOL, NAVY };
