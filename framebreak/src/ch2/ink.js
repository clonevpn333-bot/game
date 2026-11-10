// Hand-drawn cartoon toolkit for Chapter 2. Everything is drawn as vector
// paths with "boiling" ink lines (re-jittered on twos), rubber-hose limbs and
// squash & stretch. Nothing is a rotated rigid sprite.
import { noise1, makeCanvas, lerp, clamp, TAU } from '../core/util.js';

export const INK = '#17131f', CREAM = '#f3ead2', TEAL = '#2fd3c6', ORANGE = '#ff9a3c', RED = '#e2543a', WASH = '#cfd6d9', WASH2 = '#a9b7bf', GOLD = '#e9c46a', PINK = '#c06fc0';

export class Pen {
  constructor() { this.boil = 0; this.lw = 6; }
  tick(t) { this.boil = Math.floor(t * 9); }
  j(seed, amp = 3) { return noise1(seed * 7.13 + this.boil * 19.7, 3) * amp; }
  // wobbly closed blob (ellipse-ish). squash via rx/ry; rot in radians
  blob(ctx, x, y, rx, ry, { rot = 0, seed = 1, fill = '#fff', lw = this.lw, wob = 0.05, n = 14, stroke = INK } = {}) {
    ctx.beginPath(); const c = Math.cos(rot), s = Math.sin(rot);
    for (let i = 0; i <= n; i++) {
      const a = (i % n) / n * TAU, k = 1 + noise1(seed * 3.3 + (i % n) * 1.7 + this.boil * 11.3, 5) * wob, px = Math.cos(a) * rx * k, py = Math.sin(a) * ry * k;
      const X = x + px * c - py * s, Y = y + px * s + py * c;
      if (i === 0) ctx.moveTo(X, Y); else { const a0 = ((i - 0.5) / n) * TAU, k0 = 1.06 + noise1(seed + i + this.boil * 5.1, 7) * wob; const qx = Math.cos(a0) * rx * k0, qy = Math.sin(a0) * ry * k0; ctx.quadraticCurveTo(x + qx * c - qy * s, y + qx * s + qy * c, X, Y); }
    }
    ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.lineJoin = 'round'; ctx.stroke(); }
  }
  // wobbly polygon / polyline
  poly(ctx, pts, { seed = 1, fill = null, lw = this.lw, close = true, amp = 2.5, stroke = INK } = {}) {
    ctx.beginPath();
    pts.forEach((p, i) => { const x = p[0] + this.j(seed + i * 2.1, amp), y = p[1] + this.j(seed + i * 3.7 + 9, amp); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
    if (close) ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }
  }
  rect(ctx, x, y, w, h, o = {}) { this.poly(ctx, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], o); }
  // rubber-hose limb: a fat curve from a to b that bows by `bend`
  hose(ctx, ax, ay, bx, by, bend, w, col = INK, seed = 1) {
    const mx = (ax + bx) / 2, my = (ay + by) / 2, dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    const cx = mx + nx * bend + this.j(seed, 2), cy = my + ny * bend + this.j(seed + 5, 2);
    ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(cx, cy, bx, by);
    ctx.strokeStyle = INK; ctx.lineWidth = w + 7; ctx.stroke(); if (col !== INK) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke(); }
  }
  line(ctx, ax, ay, bx, by, lw = this.lw, seed = 1, col = INK) { ctx.beginPath(); ctx.moveTo(ax + this.j(seed, 2), ay + this.j(seed + 3, 2)); ctx.lineTo(bx + this.j(seed + 6, 2), by + this.j(seed + 9, 2)); ctx.lineWidth = lw; ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.stroke(); }
  // pie-cut eye
  eye(ctx, x, y, r, lookX = 0, lookY = 0, blink = 0, seed = 1) {
    if (blink > 0.5) { this.line(ctx, x - r, y, x + r, y, 5, seed); return; }
    this.blob(ctx, x, y, r, r * 1.25, { seed, fill: '#fff', lw: 4, wob: 0.03, n: 10 });
    const px = x + lookX * r * 0.4, py = y + lookY * r * 0.5, pr = r * 0.55;
    ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(px, py); ctx.arc(px, py, pr, -0.9, TAU - 1.5); ctx.closePath(); ctx.fill();
  }
  // radial impact burst lines
  burst(ctx, x, y, r0, r1, n = 8, seed = 1, lw = 6) { for (let i = 0; i < n; i++) { const a = (i / n) * TAU + this.j(seed + i, 0.2); this.line(ctx, x + Math.cos(a) * r0, y + Math.sin(a) * r0, x + Math.cos(a) * r1, y + Math.sin(a) * r1, lw, seed + i * 3); } }
  text(ctx, str, x, y, size = 40, col = INK, align = 'center', rot = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot + this.j(str.length, 0.012)); ctx.font = `900 ${size}px "Comic Sans MS","Chalkboard SE","Marker Felt","Segoe Print",cursive`; ctx.textAlign = align; ctx.textBaseline = 'middle';
    ctx.lineWidth = size * 0.22; ctx.strokeStyle = CREAM; ctx.lineJoin = 'round'; ctx.strokeText(str, 0, 0); ctx.fillStyle = col; ctx.fillText(str, 0, 0); ctx.restore();
  }
}

// Paper grain + faint halftone, rendered once.
export function paperTexture(w = 512, h = 512) {
  const c = makeCanvas(w, h), ctx = c.getContext('2d'); ctx.fillStyle = CREAM; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 5000; i++) { ctx.fillStyle = `rgba(${Math.random() < 0.5 ? '120,90,50' : '255,255,255'},${Math.random() * 0.06})`; ctx.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 1); }
  for (let i = 0; i < 40; i++) { ctx.strokeStyle = 'rgba(120,90,50,0.035)'; ctx.beginPath(); const y = Math.random() * h; ctx.moveTo(0, y); ctx.lineTo(w, y + Math.random() * 20 - 10); ctx.stroke(); }
  return c;
}

// ---- RIN, cartoon form -----------------------------------------------------------
// r: { x, y (feet), face, sx, sy (squash), walk (phase), state, lookX, lookY, armTo:{x,y}|null,
//      punch:{x,y}|null, flat (0..1), ball, hurt, t, scarf:[{x,y}], blink, hold }
export function drawRin(ctx, pen, r) {
  const f = r.face, t = r.t;
  ctx.save(); ctx.translate(r.x, r.y);
  if (r.ball) { // rolled up for a ground-pound
    ctx.rotate(t * 14 * f); pen.blob(ctx, 0, -46, 46, 46, { seed: 3, fill: TEAL }); pen.blob(ctx, 10, -60, 24, 20, { seed: 4, fill: '#fff', lw: 5 }); ctx.fillStyle = ORANGE; ctx.fillRect(-46, -52, 92, 12); ctx.restore(); return;
  }
  if (r.flat > 0.6) { // pancake: a flat sheet with a face on top
    const w = 100, h = 14; pen.poly(ctx, [[-w, -h], [w, -h - 4], [w + 8, 0], [-w - 6, 0]], { seed: 5, fill: TEAL });
    pen.poly(ctx, [[-w * 0.2, -h - 2], [w * 0.75, -h - 5], [w * 0.8, -3], [-w * 0.15, -2]], { seed: 6, fill: '#fff', lw: 4 });
    pen.eye(ctx, f * 30, -h + 2, 7, 0, 0, 0, 7); pen.eye(ctx, f * 52, -h + 1, 7, 0, 0, 0, 8); ctx.fillStyle = ORANGE; ctx.fillRect(-w * 0.9, -h + 1, 30, 8);
    ctx.restore(); return;
  }
  ctx.scale(r.sx, r.sy);
  const lean = clamp(r.vx / 900, -0.25, 0.25), bob = Math.abs(Math.sin(r.walk)) * 8 * (r.ground ? 1 : 0);
  const hipY = -52 + bob * 0.4, chestY = -98 + bob, headY = -150 + bob * 1.3, cx = lean * 60;
  // legs (rubber hose) with big boots
  for (const side of [-1, 1]) {
    const ph = r.walk + (side > 0 ? 0 : Math.PI), stride = r.ground ? Math.sin(ph) * 34 * Math.min(1, Math.abs(r.vx) / 200) : side * 14, lift = r.ground ? Math.max(0, Math.cos(ph)) * 22 * Math.min(1, Math.abs(r.vx) / 200) : 18;
    const fx = side * 16 + stride * f, fy = -8 - lift;
    pen.hose(ctx, side * 12 + cx * 0.3, hipY, fx, fy - 6, side * 10, 13, '#3f5196', 20 + side);
    pen.blob(ctx, fx + f * 12, fy, 26, 15, { seed: 30 + side, fill: '#fff', lw: 5, n: 10 });
  }
  // scarf (verlet points are in world space → convert)
  if (r.scarf) { ctx.save(); ctx.scale(1 / r.sx, 1 / r.sy); ctx.beginPath(); ctx.moveTo(cx * r.sx - f * 14, chestY * r.sy - 22); for (const p of r.scarf) ctx.lineTo(p.x - r.x, p.y - r.y); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = 26; ctx.stroke(); ctx.strokeStyle = ORANGE; ctx.lineWidth = 17; ctx.stroke(); ctx.restore(); }
  // back arm
  const sw = Math.sin(r.walk) * 30 * Math.min(1, Math.abs(r.vx) / 200);
  if (!r.hold) pen.hose(ctx, cx - f * 20, chestY - 6, cx - f * 30 - sw * f, chestY + 44, -f * 14, 12, TEAL, 40);
  if (!r.hold) pen.blob(ctx, cx - f * 30 - sw * f, chestY + 48, 14, 14, { seed: 41, fill: '#fff', lw: 5, n: 8 });
  // body
  pen.blob(ctx, cx, (hipY + chestY) / 2 - 4, 34, 40, { seed: 2, fill: TEAL, rot: lean });
  ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx + f * 6, chestY - 4); ctx.lineTo(cx + f * 8 + lean * 20, hipY + 6); ctx.stroke(); // zipper
  pen.blob(ctx, cx, chestY - 18, 30, 13, { seed: 9, fill: ORANGE, lw: 5, n: 10 }); // scarf wrap
  // head
  const hx = cx + lean * 30 + f * 4, hy = headY;
  // hair spikes behind
  pen.poly(ctx, [[hx - f * 44, hy - 4], [hx - f * 70, hy - 30], [hx - f * 40, hy - 30], [hx - f * 56, hy - 62], [hx - f * 20, hy - 46], [hx - f * 18, hy - 78], [hx + f * 8, hy - 50], [hx + f * 30, hy - 70], [hx + f * 34, hy - 30]], { seed: 11, fill: '#fff', lw: 6, amp: 3 });
  pen.blob(ctx, hx, hy, 44, 40, { seed: 12, fill: '#ffd9b3' });
  pen.poly(ctx, [[hx - f * 46, hy - 12], [hx - f * 30, hy - 44], [hx + f * 10, hy - 48], [hx + f * 44, hy - 26], [hx + f * 46, hy - 10], [hx + f * 10, hy - 18], [hx - f * 20, hy - 6]], { seed: 13, fill: '#fff', lw: 6, amp: 2 }); // fringe
  pen.poly(ctx, [[hx - f * 44, hy - 20], [hx + f * 46, hy - 24], [hx + f * 46, hy - 10], [hx - f * 44, hy - 6]], { seed: 14, fill: ORANGE, lw: 5, amp: 1.5 }); // goggle band
  pen.blob(ctx, hx + f * 26, hy - 16, 13, 11, { seed: 15, fill: GOLD, lw: 5, n: 8 });
  if (r.hurt > 0) { // X eyes, open mouth
    for (const ex of [6, 30]) { pen.line(ctx, hx + f * ex - 8, hy - 2, hx + f * ex + 8, hy + 14, 5, ex); pen.line(ctx, hx + f * ex + 8, hy - 2, hx + f * ex - 8, hy + 14, 5, ex + 1); }
    pen.blob(ctx, hx + f * 18, hy + 26, 10, 9, { seed: 17, fill: INK, lw: 0 });
  } else {
    pen.eye(ctx, hx + f * 6, hy + 6, 10, f * (r.lookX ?? 1), r.lookY || 0, r.blink, 16); pen.eye(ctx, hx + f * 30, hy + 6, 10, f * (r.lookX ?? 1), r.lookY || 0, r.blink, 18);
    ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath();
    if (r.effort) { ctx.moveTo(hx + f * 6, hy + 26); ctx.lineTo(hx + f * 30, hy + 24); ctx.moveTo(hx + f * 0, hy - 8); ctx.lineTo(hx + f * 14, hy - 3); } else ctx.arc(hx + f * 18, hy + 20, 9, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }
  // front arm: idle swing, stretch-grab, punch wind-up, or holding something overhead
  const shx = cx + f * 18, shy = chestY - 4;
  let hand = { x: cx + f * 28 + sw * f, y: chestY + 46 }, bend = f * 14, col = TEAL;
  if (r.hold) { hand = { x: cx + f * 8, y: headY - 84 }; bend = -f * 20; pen.hose(ctx, cx - f * 20, chestY - 6, cx - f * 14, headY - 84, f * 20, 12, TEAL, 40); pen.blob(ctx, cx - f * 14, headY - 88, 15, 15, { seed: 41, fill: '#fff', lw: 5, n: 8 }); }
  if (r.armTo) { hand = { x: (r.armTo.x - r.x) / r.sx, y: (r.armTo.y - r.y) / r.sy }; bend = Math.sin(t * 30) * 10 * (1 - (r.armTaut || 0)); }
  if (r.wind > 0) { hand = { x: cx - f * (40 + r.wind * 70), y: chestY - 10 - r.wind * 20 }; bend = -f * 30; }
  pen.hose(ctx, shx, shy, hand.x, hand.y, bend, 12, col, 50);
  const big = r.armTo || r.wind > 0 ? 1.5 + (r.wind || 0) * 0.8 : 1;
  pen.blob(ctx, hand.x, hand.y, 15 * big, 15 * big, { seed: 51, fill: '#fff', lw: 5, n: 8 });
  if (big > 1) { ctx.strokeStyle = INK; ctx.lineWidth = 3; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(hand.x + i * 6 * big, hand.y - 6 * big); ctx.lineTo(hand.x + i * 6 * big, hand.y - 12 * big); ctx.stroke(); } }
  ctx.restore();
}

// ---- VELL, cartoon form: a rubbery ink-cat with one big eye and one small -------
export function drawVell(ctx, pen, v) {
  ctx.save(); ctx.translate(v.x, v.y); ctx.scale(v.sx || 1, v.sy || 1);
  ctx.strokeStyle = INK; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-30, 10); ctx.quadraticCurveTo(-70, 20 + Math.sin(v.t * 5) * 14, -66, -26); ctx.stroke(); // tail
  pen.poly(ctx, [[-30, -30], [-40, -62], [-14, -40]], { seed: 71, fill: PINK, lw: 5 }); pen.poly(ctx, [[30, -30], [38, -66], [12, -40]], { seed: 72, fill: PINK, lw: 5 });
  pen.blob(ctx, 0, 0, 40, 36, { seed: 70, fill: PINK });
  pen.eye(ctx, -12, -4, 15, v.look || 0, 0, v.blink, 73); pen.eye(ctx, 18, -2, 8, v.look || 0, 0, v.blink, 74);
  ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(4, 14, 7, 0.1, Math.PI - 0.1); ctx.stroke();
  ctx.restore();
}

// ---- enemies ----------------------------------------------------------------------
// e: { kind, x, y (centre), r, sx, sy, face, t, state, flash, rot }
export function drawEnemy(ctx, pen, e) {
  ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.rot || 0); ctx.scale(e.sx, e.sy);
  const dizzy = e.state === 'thrown' || e.state === 'held' || e.state === 'ko';
  const eyes = (y, sp, r) => { if (dizzy) { for (const s of [-1, 1]) { ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.beginPath(); for (let a = 0; a < 9; a += 0.5) { const rr = a * r / 9; ctx.lineTo(s * sp + Math.cos(a + e.t * 9) * rr, y + Math.sin(a + e.t * 9) * rr); } ctx.stroke(); } } else { pen.eye(ctx, -sp, y, r, e.face, 0.2, 0, 81); pen.eye(ctx, sp, y, r, e.face, 0.2, 0, 82); ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-sp - r, y - r * 1.5); ctx.lineTo(-sp + r, y - r * 0.9); ctx.moveTo(sp + r, y - r * 1.5); ctx.lineTo(sp - r, y - r * 0.9); ctx.stroke(); } };
  const col = e.flash > 0 ? '#fff' : null;
  if (e.kind === 'stamper') { // a rubber stamp on stubby feet
    pen.blob(ctx, 0, -62, 20, 18, { seed: 83, fill: col || '#8a5a44' }); pen.rect(ctx, -10, -50, 20, 26, { seed: 84, fill: col || '#8a5a44' });
    pen.poly(ctx, [[-44, -26], [44, -26], [52, 22], [-52, 22]], { seed: 85, fill: col || RED });
    pen.rect(ctx, -56, 22, 112, 16, { seed: 86, fill: col || INK }); eyes(-4, 18, 11);
    pen.blob(ctx, -26, 44, 16, 9, { seed: 87, fill: '#fff', lw: 5, n: 8 }); pen.blob(ctx, 26, 44, 16, 9, { seed: 88, fill: '#fff', lw: 5, n: 8 });
  } else if (e.kind === 'inkwell') { // fat bottle that spits blots
    pen.rect(ctx, -16, -66, 32, 22, { seed: 89, fill: col || WASH2 }); pen.rect(ctx, -22, -74, 44, 12, { seed: 90, fill: col || INK });
    pen.blob(ctx, 0, 0, 50, 46, { seed: 91, fill: col || '#5876c9' }); pen.blob(ctx, 0, 14, 40, 26, { seed: 92, fill: INK, lw: 0, wob: 0.08 });
    eyes(-14, 17, 11); if (e.state === 'aim') pen.blob(ctx, 0, -78, 14, 14, { seed: 93, fill: INK, lw: 0, wob: 0.2 });
  } else if (e.kind === 'nib') { // flying pen nib
    pen.poly(ctx, [[0, 56], [-26, 0], [-20, -40], [20, -40], [26, 0]], { seed: 94, fill: col || GOLD }); pen.line(ctx, 0, 50, 0, 6, 4, 95); pen.blob(ctx, 0, 0, 6, 6, { seed: 96, fill: INK, lw: 0 });
    eyes(-22, 10, 7);
    for (const s of [-1, 1]) pen.poly(ctx, [[s * 18, -34], [s * (54 + Math.sin(e.t * 40) * 8), -50 + Math.sin(e.t * 40 + s) * 10], [s * 20, -20]], { seed: 97 + s, fill: '#fff', lw: 4 });
  }
  ctx.restore();
}

export function drawSplat(ctx, pen, x, y, r, seed) {
  ctx.fillStyle = INK; ctx.beginPath();
  for (let i = 0; i <= 16; i++) { const a = (i / 16) * TAU, k = 0.6 + Math.abs(noise1(seed * 9.1 + (i % 16) * 2.3, 4)) * 0.9, px = x + Math.cos(a) * r * k, py = y + Math.sin(a) * r * k * 0.8; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
  ctx.fill(); for (let i = 0; i < 5; i++) { const a = noise1(seed + i * 5, 2) * 6, d = r * (1.2 + Math.abs(noise1(seed + i, 8))); ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8, r * 0.12, 0, TAU); ctx.fill(); }
}
export { lerp };
