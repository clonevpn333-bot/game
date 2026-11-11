// THE CASCADE — the ending. One run, drawn in every format the game has been,
// flickering between them on the beat and finally all at once. Mostly a
// cutscene; three short playable beats (jump, break, push). You cannot fail it.
import { clamp, lerp, hash2, TAU, makeCanvas } from '../core/util.js';
import { VW, VH, fit, dlg, introSnap } from '../fx/ui2d.js';

const GY = 820, RX = 560, SPD = 640, INK = '#17131f';
const hx = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const sh = (c, k) => { const [r, g, b] = hx(c); return k <= 1 ? `rgb(${(r * k) | 0},${(g * k) | 0},${(b * k) | 0})` : `rgb(${(r + (255 - r) * (k - 1)) | 0},${(g + (255 - g) * (k - 1)) | 0},${(b + (255 - b) * (k - 1)) | 0})`; };
const grad = (c, a, b) => { const g = c.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, a); g.addColorStop(1, b); c.fillStyle = g; c.fillRect(0, 0, VW, VH); };
const pat = (size, fn) => { const cv = makeCanvas(size, size); fn(cv.getContext('2d'), size); return cv; };
const DITHER = pat(8, (c) => { c.fillStyle = 'rgba(0,0,0,0.38)'; c.fillRect(0, 0, 4, 4); c.fillRect(4, 4, 4, 4); });
const TONE = pat(14, (c) => { c.fillStyle = 'rgba(23,19,31,0.5)'; c.beginPath(); c.arc(7, 7, 3.2, 0, TAU); c.fill(); });
const STITCH = pat(24, (c) => { c.strokeStyle = 'rgba(0,0,0,0.28)'; c.lineWidth = 4; c.lineCap = 'round'; for (const y of [0, 24]) { c.beginPath(); c.moveTo(3, y - 9); c.lineTo(12, y + 3); c.lineTo(21, y - 9); c.stroke(); } c.beginPath(); c.moveTo(3, 3); c.lineTo(12, 15); c.lineTo(21, 3); c.stroke(); c.strokeStyle = 'rgba(255,255,255,0.22)'; c.lineWidth = 2; c.beginPath(); c.moveTo(5, 1); c.lineTo(12, 11); c.stroke(); });
const P = new WeakMap(), pt = (c, cv) => { let m = P.get(c); if (!m) P.set(c, (m = new Map())); if (!m.has(cv)) m.set(cv, c.createPattern(cv, 'repeat')); return m.get(cv); };
// pal: [sky top, sky bottom, far, mid, ground, ground top, accent]
const STYLES = [
  { name: 'PIXEL PANIC', pal: ['#232a4d', '#5876c9', '#2f3a6b', '#3f5196', '#454c63', '#98a2bd', '#ffd166'],
    bg(c, t, p) { for (let i = 0; i < 6; i++) { c.fillStyle = sh(p[0], 1 + i * 0.16); c.fillRect(0, i * 144, VW, 144); } c.fillStyle = '#f4f6ff'; for (let i = 0; i < 40; i++) c.fillRect(((hash2(i, 1) * 240) | 0) * 8, ((hash2(i, 2) * 60) | 0) * 8, 8, 8); },
    box(c, x, y, w, h, col) { const q = 8; x = Math.round(x / q) * q; y = Math.round(y / q) * q; w = Math.max(q, Math.round(w / q) * q); h = Math.max(q, Math.round(h / q) * q); c.fillStyle = col; c.fillRect(x, y, w, h); if (h > 24) { c.fillStyle = sh(col, 1.35); c.fillRect(x, y, w, q); c.fillStyle = sh(col, 0.62); c.fillRect(x, y + h - q, w, q); c.fillRect(x + w - q, y, q, h); } },
    ball(c, x, y, r, col) { this.box(c, x - r, y - r * 0.6, r * 2, r * 1.2, col); this.box(c, x - r * 0.6, y - r, r * 1.2, r * 2, col); } },
  { name: 'INK & VIOLENCE', pal: ['#f3ead2', '#ecdcae', '#d6c796', '#c2ad74', '#9a8456', '#b8a070', '#e8483c'],
    bg(c, t, p) { grad(c, p[0], p[1]); c.fillStyle = 'rgba(120,90,50,0.12)'; for (let i = 0; i < 9; i++) { c.beginPath(); c.ellipse(hash2(i, 1) * VW, hash2(i, 2) * 600, 160 + hash2(i, 3) * 200, 60, 0, 0, TAU); c.fill(); } },
    box(c, x, y, w, h, col, k, t) { const j = (n) => (hash2(Math.floor(t * 8) + n, x | 0) - 0.5) * 7; c.fillStyle = col; c.strokeStyle = INK; c.lineWidth = 7; c.lineJoin = 'round'; c.beginPath(); c.moveTo(x + j(1), y + j(2)); c.lineTo(x + w + j(3), y + j(4)); c.lineTo(x + w + j(5), y + h + j(6)); c.lineTo(x + j(7), y + h + j(8)); c.closePath(); c.fill(); c.stroke(); },
    ball(c, x, y, r, col, k, t) { c.fillStyle = col; c.strokeStyle = INK; c.lineWidth = 7; c.beginPath(); c.ellipse(x, y, r * (1 + Math.sin(t * 8) * 0.04), r * (1 - Math.sin(t * 8) * 0.04), 0, 0, TAU); c.fill(); c.stroke(); } },
  { name: 'FOLD THE WORLD', pal: ['#bfe3df', '#f6efe0', '#9cc9c0', '#e8a87c', '#d98b5f', '#f2e3c6', '#e8483c'],
    bg(c, t, p) { grad(c, p[0], p[1]); },
    box(c, x, y, w, h, col) { c.fillStyle = 'rgba(40,30,20,0.22)'; c.fillRect(x + 12, y + 14, w, h); c.save(); c.translate(x + w / 2, y + h / 2); c.rotate((hash2(x | 0, 3) - 0.5) * 0.03); c.fillStyle = col; c.fillRect(-w / 2, -h / 2, w, h); c.strokeStyle = sh(col, 1.5); c.lineWidth = 4; c.strokeRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4); c.restore(); },
    ball(c, x, y, r, col) { c.fillStyle = 'rgba(40,30,20,0.22)'; c.beginPath(); c.arc(x + 10, y + 12, r, 0, TAU); c.fill(); c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.strokeStyle = sh(col, 1.5); c.lineWidth = 4; c.stroke(); } },
  { name: 'DOMINO CITY', pal: ['#255c40', '#3f8a5f', '#f3ead2', '#f3ead2', '#7a4a2a', '#a8703f', '#e8483c'],
    bg(c, t, p) { grad(c, p[0], p[1]); },
    box(c, x, y, w, h, col, k) { c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(x + 8, y + 8, w, h); c.fillStyle = col; c.strokeStyle = '#3a2a1a'; c.lineWidth = 5; c.beginPath(); c.roundRect(x, y, w, h, Math.min(14, w / 3, h / 3)); c.fill(); c.stroke(); if (k !== 'chr' && w > 60 && h > 100) { c.beginPath(); c.moveTo(x + 8, y + h / 2); c.lineTo(x + w - 8, y + h / 2); c.stroke(); c.fillStyle = '#17131f'; for (let i = 0; i < 6; i++) if (hash2(x | 0, i) > 0.4) { c.beginPath(); c.arc(x + w * (0.3 + (i % 2) * 0.4), y + h * (0.12 + ((i / 2) | 0) * 0.13 + (i > 3 ? 0.42 : 0)), Math.min(10, w * 0.08), 0, TAU); c.fill(); } } },
    ball(c, x, y, r, col) { c.fillStyle = col; c.strokeStyle = '#3a2a1a'; c.lineWidth = 5; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.stroke(); } },
  { name: '1996', pal: ['#3a2330', '#8a4a44', '#5c3340', '#6a738f', '#454c63', '#6a738f', '#ffd166'],
    bg(c, t, p) { for (let i = 0; i < 9; i++) { c.fillStyle = sh(p[0], 1 + (i > 4 ? 8 - i : i) * 0.12); c.fillRect(0, i * 96, VW, 96); } },
    box(c, x, y, w, h, col) { const q = 12; x = Math.round(x / q) * q; y = Math.round(y / q) * q; w = Math.max(q, Math.round(w / q) * q); h = Math.max(q, Math.round(h / q) * q); c.fillStyle = col; c.fillRect(x, y, w, h); c.fillStyle = pt(c, DITHER); c.fillRect(x, y + h * 0.5, w, h * 0.5); c.fillRect(x + w * 0.7, y, w * 0.3, h * 0.5); },
    ball(c, x, y, r, col) { this.box(c, x - r, y - r, r * 2, r * 2, col); },
    post(c) { c.fillStyle = '#2b3040'; c.fillRect(0, VH - 96, VW, 96); c.fillStyle = '#c9d1e6'; c.fillRect(0, VH - 96, VW, 6); c.font = '700 44px "Courier New", monospace'; c.textAlign = 'left'; c.fillStyle = '#3fae4f'; c.fillText('HEALTH 100%', 60, VH - 30); c.fillStyle = '#ffd166'; c.fillText('AMMO 40', 520, VH - 30); } },
  { name: 'BLOCK COLLAPSE', pal: ['#f2b08a', '#ffd9b0', '#8f949f', '#b85c48', '#9e6b3d', '#7fae5a', '#ffd166'],
    bg(c, t, p) { grad(c, p[0], p[1]); },
    box(c, x, y, w, h, col) { const d = 16; c.fillStyle = sh(col, 1.3); c.beginPath(); c.moveTo(x, y); c.lineTo(x + d, y - d); c.lineTo(x + w + d, y - d); c.lineTo(x + w, y); c.fill(); c.fillStyle = sh(col, 0.62); c.beginPath(); c.moveTo(x + w, y); c.lineTo(x + w + d, y - d); c.lineTo(x + w + d, y + h - d); c.lineTo(x + w, y + h); c.fill(); c.fillStyle = col; c.fillRect(x, y, w, h); c.strokeStyle = 'rgba(0,0,0,0.22)'; c.lineWidth = 2; c.beginPath(); for (let i = 40; i < w; i += 40) { c.moveTo(x + i, y); c.lineTo(x + i, y + h); } for (let j = 40; j < h; j += 40) { c.moveTo(x, y + j); c.lineTo(x + w, y + j); } c.stroke(); },
    ball(c, x, y, r, col) { this.box(c, x - r, y - r, r * 2, r * 2, col); } },
  { name: 'FULL RESOLUTION', pal: ['#141a33', '#b0603f', '#1b2238', '#2a3350', '#20242e', '#4a5066', '#7ff5e6'],
    bg(c, t, p) { grad(c, p[0], p[1]); c.globalCompositeOperation = 'lighter'; for (let i = 0; i < 18; i++) { c.fillStyle = `rgba(255,${150 + ((i * 40) % 100)},${90 + ((i * 70) % 160)},0.07)`; c.beginPath(); c.arc(hash2(i, 1) * VW, 300 + hash2(i, 2) * 500, 30 + hash2(i, 3) * 70, 0, TAU); c.fill(); } c.globalCompositeOperation = 'source-over'; c.strokeStyle = 'rgba(200,220,255,0.25)'; c.lineWidth = 2; c.beginPath(); for (let i = 0; i < 60; i++) { const x = hash2(i, 5) * VW, y = (hash2(i, 6) * VH + t * 1500) % VH; c.moveTo(x, y); c.lineTo(x - 8, y + 44); } c.stroke(); },
    box(c, x, y, w, h, col) { const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, sh(col, 1.3)); g.addColorStop(1, sh(col, 0.5)); c.fillStyle = g; c.fillRect(x, y, w, h); c.fillStyle = 'rgba(255,255,255,0.1)'; c.fillRect(x + w * 0.14, y, w * 0.12, h); c.fillStyle = '#ffcf9a'; c.fillRect(x, y, w, 3); if (w > 100 && h > 150) { c.fillStyle = 'rgba(255,214,150,0.75)'; for (let j = 0; j < h / 46 - 1; j++) for (let i = 0; i < w / 44 - 0.5; i++) if (hash2((x | 0) + i, j) > 0.5) c.fillRect(x + 12 + i * 44, y + 20 + j * 46, 20, 14); } },
    ball(c, x, y, r, col) { const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r); g.addColorStop(0, sh(col, 1.6)); g.addColorStop(1, sh(col, 0.5)); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); } },
  { name: 'CLAY HEART', pal: ['#f6e6c8', '#f0d2a8', '#d9b48a', '#9cc28a', '#b9d08a', '#cfe0a0', '#e8742a'],
    bg(c, t, p) { grad(c, p[0], p[1]); },
    box(c, x, y, w, h, col, k, t) { const f = Math.floor(t * 12), j = (n) => (hash2(f + n, x | 0) - 0.5) * 5; x += j(1); y += j(2); const g = c.createRadialGradient(x + w * 0.3, y + h * 0.22, 4, x + w * 0.5, y + h * 0.5, Math.max(w, h) * 0.8); g.addColorStop(0, sh(col, 1.38)); g.addColorStop(1, sh(col, 0.72)); c.fillStyle = g; c.beginPath(); c.roundRect(x, y, w, h, Math.min(w, h) * 0.32); c.fill(); c.fillStyle = 'rgba(0,0,0,0.07)'; c.beginPath(); c.ellipse(x + w * 0.62, y + h * 0.6, w * 0.16, Math.min(h * 0.1, 22), 0.5, 0, TAU); c.fill(); },
    ball(c, x, y, r, col, k, t) { const f = Math.floor(t * 12); x += (hash2(f, 3) - 0.5) * 4; const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, 2, x, y, r); g.addColorStop(0, sh(col, 1.4)); g.addColorStop(1, sh(col, 0.72)); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); } },
  { name: 'BREAK THE PAGE', pal: ['#ffffff', '#ffffff', '#ffffff', '#ffffff', '#17131f', '#17131f', '#e8483c'],
    bg(c, t, p) { c.fillStyle = '#fff'; c.fillRect(0, 0, VW, VH); c.fillStyle = pt(c, TONE); c.fillRect(0, 0, VW, 330); },
    box(c, x, y, w, h, col, k) { c.fillStyle = k === 'chr' || col === INK ? col : '#fff'; c.strokeStyle = INK; c.lineWidth = 8; c.lineJoin = 'miter'; c.fillRect(x, y, w, h); c.strokeRect(x, y, w, h); if (k !== 'chr' && col !== INK && w > 50) { c.save(); c.beginPath(); c.rect(x + w * 0.62, y, w * 0.38, h); c.clip(); c.lineWidth = 3; c.beginPath(); for (let i = -h; i < w; i += 14) { c.moveTo(x + i, y + h); c.lineTo(x + i + h, y); } c.stroke(); c.restore(); } },
    ball(c, x, y, r, col) { c.fillStyle = col; c.strokeStyle = INK; c.lineWidth = 8; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.stroke(); } },
  { name: 'LAMPLIGHT', pal: ['#f8dca0', '#c9813f', '#7a4a22', '#4a2812', '#1a110c', '#1a110c', '#1a110c'],
    bg(c, t, p) { const g = c.createRadialGradient(960, 430, 60, 960, 520, 1150); g.addColorStop(0, '#ffe9b0'); g.addColorStop(0.5, '#e2a55c'); g.addColorStop(1, '#6a3414'); c.fillStyle = g; c.fillRect(0, 0, VW, VH); },
    box(c, x, y, w, h, col, k) { c.globalAlpha = k === 'far' ? 0.3 : k === 'mid' ? 0.6 : 1; c.fillStyle = '#1a110c'; c.fillRect(x, y, w, h); c.globalAlpha = 1; if (k === 'wall' || k === 'gtop') { c.fillStyle = '#f0c684'; for (let i = 20; i < w - 10; i += 44) { c.beginPath(); c.moveTo(x + i, y + 6); c.lineTo(x + i + 8, y + 14); c.lineTo(x + i, y + 22); c.lineTo(x + i - 8, y + 14); c.fill(); } } },
    ball(c, x, y, r, col, k) { c.globalAlpha = k === 'mid' ? 0.6 : 1; c.fillStyle = '#1a110c'; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.globalAlpha = 1; } },
  { name: 'LEAD & LIGHT', pal: ['#0d0c14', '#1a1626', '#2f6fd0', '#8a4fc0', '#2fa36a', '#f0b030', '#d23a44'],
    bg(c, t, p) { grad(c, p[0], p[1]); },
    box(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(x, y, w, h); c.fillStyle = 'rgba(255,255,255,0.2)'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + w, y); c.lineTo(x, y + h); c.fill(); c.strokeStyle = '#0b0a0d'; c.lineWidth = 9; c.lineJoin = 'round'; c.strokeRect(x, y, w, h); c.beginPath(); c.moveTo(x + w, y); c.lineTo(x, y + h); if (w > 120) for (let i = 120; i < w; i += 120) { c.moveTo(x + i, y); c.lineTo(x + i, y + h); } c.stroke(); },
    ball(c, x, y, r, col) { c.fillStyle = col; c.strokeStyle = '#0b0a0d'; c.lineWidth = 8; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.stroke(); c.beginPath(); c.moveTo(x - r, y); c.lineTo(x + r, y); c.stroke(); } },
  { name: 'LOOSE THREADS', pal: ['#f1d3bd', '#f6e2cf', '#6b7fb8', '#3f9c94', '#c9605a', '#e8dcc0', '#d9a441'],
    bg(c, t, p) { grad(c, p[0], p[1]); c.fillStyle = pt(c, STITCH); c.globalAlpha = 0.35; c.fillRect(0, 0, VW, VH); c.globalAlpha = 1; },
    box(c, x, y, w, h, col) { c.fillStyle = col; c.beginPath(); c.roundRect(x, y, w, h, Math.min(12, w / 3, h / 3)); c.fill(); c.fillStyle = pt(c, STITCH); c.fill(); if (w > 30 && h > 30) { c.strokeStyle = 'rgba(255,250,235,0.8)'; c.lineWidth = 3; c.setLineDash([10, 8]); c.strokeRect(x + 7, y + 7, w - 14, h - 14); c.setLineDash([]); } },
    ball(c, x, y, r, col) { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.fillStyle = pt(c, STITCH); c.fill(); } },
  { name: 'PHOSPHOR', pal: ['#03080c', '#03080c', '#1d5a78', '#2f8fb0', '#7ff5e6', '#7ff5e6', '#ffd166'],
    bg(c, t, p) { c.fillStyle = '#03080c'; c.fillRect(0, 0, VW, VH); c.strokeStyle = 'rgba(29,90,120,0.3)'; c.lineWidth = 2; c.beginPath(); for (let x = 0; x <= VW; x += 120) { c.moveTo(x, 0); c.lineTo(x, VH); } for (let y = 0; y <= VH; y += 120) { c.moveTo(0, y); c.lineTo(VW, y); } c.stroke(); },
    box(c, x, y, w, h, col) { c.fillStyle = '#03080c'; c.fillRect(x, y, w, h); c.strokeStyle = col; c.globalAlpha = 0.22; c.lineWidth = 12; c.strokeRect(x, y, w, h); c.globalAlpha = 1; c.lineWidth = 3; c.strokeRect(x, y, w, h); },
    ball(c, x, y, r, col) { c.fillStyle = '#03080c'; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.strokeStyle = col; c.globalAlpha = 0.22; c.lineWidth = 12; c.stroke(); c.globalAlpha = 1; c.lineWidth = 3; c.stroke(); } },
];
const NS = STYLES.length, CH = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
// phases: [id, seconds]   (push lasts until the bar is full)
const PH = [['recap', 11], ['jump', 17], ['close', 8], ['break', 17], ['all', 9], ['push', 1e9], ['end', 19]];

export class Cascade {
  constructor(ch, k, snap) {
    const g = (this.game = ch.game); this.ch = ch; this.k = k; this.snap = snap; this.t = 0; this.pi = 0; this.pt = 0; this.dist = 0; this.ry = 0; this.rv = 0; this.inset = 0; this.insetT = 0; this.bar = 0; this.flash = 0; this.shake = 0; this.catchT = 0; this.stun = 0; this.parts = []; this.said = -1; this.line = -1;
    this.beat = 60 / (ch.bpm || 120); this.gaps = []; for (let i = 0; i < 7; i++) this.gaps.push({ at: 11 + 2.2 + i * 2.25, w: 200 }); this.walls = []; for (let i = 0; i < 9; i++) this.walls.push({ at: 36 + 1.6 + i * 1.75, hp: 1 });
    g.music.setIntensity(3); g.dialogue.clear(); g.dialogue.say([{ who: 'vell', text: "Every way we ever existed — it's all loose now. Don't pick one. RUN." }]);
  }
  get phase() { return PH[this.pi][0]; }
  update(dt) {
    const g = this.game, inp = g.input, sfx = g.sfx, ph = this.phase; this.t += dt; this.pt += dt; this.flash = Math.max(0, this.flash - dt * 1.6); this.shake = Math.max(0, this.shake - dt * 2); this.stun = Math.max(0, this.stun - dt); this.catchT = Math.max(0, this.catchT - dt);
    const spd = ph === 'end' ? lerp(SPD, this.k === 'one' ? 150 : 260, clamp(this.pt / 3, 0, 1)) : ph === 'push' ? SPD * (0.25 + this.bar * 0.6) : SPD * (this.stun > 0 ? 0.3 : 1); this.dist += spd * dt;
    for (const p of this.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 1800 * dt; p.r += p.s * dt; p.t -= dt; } this.parts = this.parts.filter((p) => p.t > 0);
    // Rin's hop
    const jumpOk = ph === 'jump' || ph === 'recap' || ph === 'close' || ph === 'all'; if (jumpOk && inp.pressed.jump && this.ry <= 0 && this.catchT <= 0) { this.rv = 1080; sfx.play('pp.jump'); } if (this.ry > 0 || this.rv > 0) { this.ry += this.rv * dt; this.rv -= 3000 * dt; if (this.ry <= 0) { this.ry = 0; this.rv = 0; sfx.play('pp.land', { vol: 0.4 }); } }
    if (ph === 'jump') for (const q of this.gaps) { if (!q.done && this.t > q.at + 0.12) { q.done = true; if (this.ry < 24) { this.catchT = 0.7; sfx.play('ink.stretch'); sfx.play('pp.string'); if (!this.saidCatch) { this.saidCatch = true; g.dialogue.say('vell', 'Got you! SPACE when the ground runs out!'); } } } }
    if (ph === 'break') { for (const w of this.walls) { const x = RX + (w.at - this.t) * SPD; if (w.hp > 0 && x < RX + 330 && x > RX - 30 && (inp.pressed.attack || inp.pressed.mouseL)) { w.hp = 0; this.smash(x); this.insetT = Math.max(30, this.insetT - 22); sfx.play('px.hitbig'); sfx.play('px.explode', { vol: 0.5, pitch: 1.3 }); this.shake = 0.7; break; } }
      for (const w of this.walls) if (w.hp > 0 && this.t > w.at - 0.05) { w.hp = 0; this.smash(RX + 40); this.stun = 0.45; this.insetT = Math.min(150, this.insetT + 22); sfx.play('ink.bonk'); this.shake = 0.5; if (!this.saidBonk) { this.saidBonk = true; g.dialogue.say('vell', 'J! Break them BEFORE they reach you!'); } } }
    if (ph === 'push') { const hold = inp.down.jump || inp.down.attack || inp.down.interact; this.bar = clamp(this.bar + (hold ? dt / 4.2 : -dt * 0.16), 0, 1); this.insetT = lerp(170, 16, this.bar); if (hold) { this.shake = Math.max(this.shake, 0.25 + this.bar * 0.5); if (Math.floor(this.t * 9) !== Math.floor((this.t - dt) * 9)) sfx.play('pp.crank', { pitch: 0.8 + this.bar }); } if (this.bar >= 1) { this.flash = 1.6; this.insetT = 0; this.inset = 0; sfx.play('fx.boom'); sfx.play('fx.shimmer'); sfx.play('px.tear'); this.smash(960, 80); g.music.setIntensity(this.k === 'one' ? 0 : this.k === 'seal' ? 1 : 2); this.next(); } }
    this.inset = lerp(this.inset, this.insetT, Math.min(1, dt * 5));
    if (this.pt > PH[this.pi][1]) this.next();
    if (ph === 'end') { const E = this.ch.ENDS[this.k], ln = Math.min(E.lines.length - 1, Math.floor((this.pt - 3) / 4.6)); if (this.pt > 3 && ln > this.line) { this.line = ln; sfx.play('pp.chime', { pitch: 0.8 + ln * 0.15 }); } if (this.pt > 18.2 && !this.done) { this.done = true; g.director.end({ chapter: 14, final: true, title: E.name, text: E.text }); } }
  }
  next() { const g = this.game; this.pi = Math.min(PH.length - 1, this.pi + 1); this.pt = 0; const ph = this.phase;
    if (ph === 'jump') g.dialogue.say('rin', 'The ground keeps changing its mind.');
    if (ph === 'close') { this.insetT = 80; g.sfx.play('px.bossroar', { vol: 0.6 }); g.dialogue.say([{ who: 'curator', text: 'Stop. LOOK at it. Nothing matches. Nothing is finished.' }, { who: 'rin', text: 'It was never supposed to match.' }]); }
    if (ph === 'break') { g.dialogue.say('vell', "He's throwing frames at us. Empty ones! Break them — J!"); for (const w of this.walls) w.at += this.t - 36; }
    if (ph === 'all') { this.insetT = 120; g.dialogue.say([{ who: 'vell', text: "It's ALL here. Every one of you, at the same time." }, { who: 'rin', text: 'I was never one thing. I was the thing that got through.' }]); }
    if (ph === 'push') { this.insetT = 170; g.dialogue.clear(); g.dialogue.say('vell', 'Last frame. PUSH — hold SPACE!'); }
    if (ph === 'end') g.dialogue.clear(); if (ph === 'jump') for (const q of this.gaps) q.at += this.t - 11; }
  smash(x, n = 22) { for (let i = 0; i < n; i++) this.parts.push({ x: x + (Math.random() - 0.5) * 90, y: GY - Math.random() * 340, vx: (Math.random() - 0.3) * 900, vy: -Math.random() * 900, r: Math.random() * 6, s: (Math.random() - 0.5) * 14, w: 20 + Math.random() * 50, t: 0.9 + Math.random() * 0.5, i }); }

  // the one scene, drawn with whichever style is asked for
  scene(c, si, clipX = 0, clipW = VW) {
    const S = STYLES[si], p = S.pal, t = this.t, d = this.dist, ph = this.phase; S.bg(c, t, p);
    for (let i = -1; i < 10; i++) { const n = Math.floor((d * 0.35) / 260) + i, x = n * 260 - d * 0.35; if (x > clipX + clipW + 40 || x + 190 < clipX - 40) continue; const h = 220 + hash2(n, 7) * 400; S.box(c, x, GY - h, 180, h + 10, p[2], 'far', t); }
    for (let i = -1; i < 6; i++) { const n = Math.floor((d * 0.7) / 520) + i, x = n * 520 - d * 0.7 + 200; if (x > clipX + clipW + 80 || x < clipX - 120) continue; S.box(c, x, GY - 250, 26, 250, p[3], 'mid', t); S.ball(c, x + 13, GY - 290, 62, p[3], 'mid', t); }
    // ground, with the gaps cut out of it
    { let x0 = -60; const cuts = ph === 'jump' ? this.gaps.map((q) => RX + (q.at - t) * SPD - 30).filter((x) => x > -300 && x < VW + 100).sort((a, b) => a - b) : []; for (const gx of [...cuts, VW + 80]) { if (gx - x0 > 4) { S.box(c, x0, GY, gx - x0, 300, p[4], 'gnd', t); S.box(c, x0, GY, gx - x0, 26, p[5], 'gtop', t); } x0 = gx + 200; } }
    if (ph === 'break') for (const w of this.walls) { const x = RX + (w.at - t) * SPD; if (w.hp > 0 && x < VW + 100) { S.box(c, x, GY - 340, 84, 340, p[6], 'wall', t); S.box(c, x + 18, GY - 300, 48, 250, p[0], 'wall', t); } }
    for (const q of this.parts) S.box(c, q.x, q.y, q.w, q.w * 0.6, p[6], 'chr', t);
    // Vell
    const vy = GY - 250 - this.ry * 0.6 + Math.sin(t * 4) * 16, vx = RX - 110 + Math.sin(t * 2.3) * 14; S.ball(c, vx, vy, 30, '#c06fc0', 'chr', t); S.ball(c, vx + 9, vy - 5, 9, '#f4f6ff', 'chr', t);
    if (this.catchT > 0) { c.strokeStyle = '#c06fc0'; c.lineWidth = 6; c.beginPath(); c.moveTo(vx, vy); c.lineTo(RX, GY - 80 + Math.sin(this.catchT / 0.7 * Math.PI) * 150); c.stroke(); }
    // Rin, built from the same two primitives so every style redraws him its own way
    const air = this.ry > 0, a = air ? 0.9 : Math.sin(d * 0.022), b = -a, Y = GY - this.ry + (this.catchT > 0 ? Math.sin((this.catchT / 0.7) * Math.PI) * 150 : 0), X = RX, lg = air ? 30 : 46;
    S.box(c, X - 74 - Math.sin(t * 9) * 8, Y - 124 + Math.sin(t * 7) * 6, 60, 16, '#ff9a3c', 'chr', t);
    S.box(c, X - 20 + a * 20, Y - lg - Math.max(0, -a) * 14, 16, lg, '#2a3a6b', 'chr', t); S.box(c, X + 2 + b * 20, Y - lg - Math.max(0, -b) * 14, 16, lg, '#2a3a6b', 'chr', t);
    S.box(c, X - 26, Y - 124, 52, 82, '#2fd3c6', 'chr', t); S.box(c, X - 6 + b * 18, Y - 114, 14, 46, '#1fa79c', 'chr', t);
    S.ball(c, X + 4, Y - 152, 30, '#ffd0a4', 'chr', t); S.box(c, X - 28, Y - 196, 18, 26, '#f4f6ff', 'chr', t); S.box(c, X - 8, Y - 206, 18, 30, '#f4f6ff', 'chr', t); S.box(c, X + 12, Y - 196, 16, 24, '#f4f6ff', 'chr', t); S.box(c, X + 6, Y - 162, 28, 12, '#ff9a3c', 'chr', t);
    S.post?.(c, t);
  }
  render() {
    const g = this.game, ctx = fit(g, '#000'), t = this.t, ph = this.phase, b = this.beat, sh2 = this.shake * 16;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, VW, VH); ctx.clip(); ctx.translate((Math.random() - 0.5) * sh2, (Math.random() - 0.5) * sh2);
    let strips = 1, per = b * 2; if (ph === 'jump') per = b; if (ph === 'close') { strips = 2 + Math.floor(this.pt / 2.7); per = b; } if (ph === 'break') { strips = 4; per = b / 2; } if (ph === 'all') { strips = 8 + Math.floor(this.pt); per = 0.13; } if (ph === 'push') { strips = 16; per = lerp(0.12, 0.05, this.bar); }
    const base = Math.floor(t / per);
    if (ph === 'end') this.endScene(ctx);
    else if (strips === 1) this.scene(ctx, ph === 'recap' ? Math.min(NS - 1, Math.floor(this.pt / (11 / NS))) : (base * 5) % NS);
    else { const w = VW / strips; for (let i = 0; i < strips; i++) { ctx.save(); ctx.beginPath(); ctx.rect(i * w, 0, w + 1, VH); ctx.clip(); this.scene(ctx, ph === 'all' || ph === 'push' ? Math.floor(hash2(i, base) * NS) : (base * 5 + i * 3) % NS, i * w, w); ctx.restore(); ctx.fillStyle = '#000'; ctx.fillRect(i * w - 2, 0, 4, VH); } }
    ctx.restore();
    // the Curator's frame, closing
    const n = this.inset; if (n > 2 && ph !== 'end') { ctx.fillStyle = '#17131f'; ctx.fillRect(0, 0, VW, n); ctx.fillRect(0, VH - n, VW, n); ctx.fillRect(0, 0, n * 1.6, VH); ctx.fillRect(VW - n * 1.6, 0, n * 1.6, VH); ctx.strokeStyle = '#d9a441'; ctx.lineWidth = 10; ctx.strokeRect(n * 1.6, n, VW - n * 3.2, VH - n * 2); ctx.lineWidth = 3; ctx.strokeRect(n * 1.6 - 16, n - 16, VW - n * 3.2 + 32, VH - n * 2 + 32); if (n > 70) { ctx.fillStyle = '#f4f6ff'; const bl = Math.sin(t * 0.9) > 0.94 ? 2 : 12; ctx.fillRect(900, n * 0.5 - bl / 2, 44, bl); ctx.fillRect(976, n * 0.5 - bl / 2, 44, bl); } }
    ctx.textAlign = 'left';
    if (ph === 'recap') { const i = Math.min(NS - 1, Math.floor(this.pt / (11 / NS))), u = (this.pt / (11 / NS)) % 1; ctx.fillStyle = 'rgba(13,15,31,0.82)'; ctx.fillRect(0, 930, 760, 96); ctx.fillStyle = '#ff9a3c'; ctx.fillRect(0, 930, 12, 96); ctx.font = '900 62px "Trebuchet MS", sans-serif'; ctx.fillStyle = '#fff'; ctx.globalAlpha = Math.min(1, u * 5); ctx.fillText(String(CH[i]).padStart(2, '0') + '  ' + STYLES[i].name, 40, 998); ctx.globalAlpha = 1; }
    const prompt = ph === 'jump' ? 'SPACE — JUMP' : ph === 'break' ? 'J — BREAK THE FRAMES' : ph === 'push' ? 'HOLD SPACE — PUSH' : ''; if (prompt) { ctx.textAlign = 'center'; ctx.font = '900 46px "Trebuchet MS", sans-serif'; ctx.lineWidth = 10; ctx.strokeStyle = '#0d0f1f'; ctx.strokeText(prompt, 960, 150); ctx.fillStyle = '#fff'; ctx.fillText(prompt, 960, 150); }
    if (ph === 'push') { ctx.fillStyle = '#0d0f1f'; ctx.fillRect(560, 180, 800, 34); ctx.fillStyle = '#ffd166'; ctx.fillRect(566, 186, 788 * this.bar, 22); }
    if (ph === 'end') { const E = this.ch.ENDS[this.k]; ctx.textAlign = 'center'; if (this.pt > 0.8) { ctx.globalAlpha = clamp((this.pt - 0.8) / 1.5, 0, 1); ctx.fillStyle = 'rgba(13,15,31,0.86)'; ctx.fillRect(0, 60, VW, 150); ctx.font = '800 26px "Trebuchet MS", sans-serif'; ctx.fillStyle = '#ff9a3c'; ctx.fillText(E.sub.toUpperCase().split('').join(' '), 960, 108); ctx.font = '900 76px "Trebuchet MS", sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText(E.name, 960, 182); ctx.globalAlpha = 1; }
      if (this.line >= 0) { const u = clamp((this.pt - 3 - this.line * 4.6) / 0.8, 0, 1); ctx.globalAlpha = u; ctx.fillStyle = 'rgba(13,15,31,0.86)'; ctx.fillRect(0, 880, VW, 120); ctx.font = '600 40px Georgia, serif'; ctx.fillStyle = '#fff'; ctx.fillText(E.lines[this.line], 960, 954); ctx.globalAlpha = 1; } if (this.pt > 17) { ctx.fillStyle = `rgba(13,15,31,${clamp((this.pt - 17) / 1.2, 0, 1)})`; ctx.fillRect(0, 0, VW, VH); } }
    if (this.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${Math.min(1, this.flash)})`; ctx.fillRect(0, 0, VW, VH); }
    introSnap(ctx, this.snap, t, 1.2); if (ph !== 'end') dlg(ctx, g, { top: ph === 'recap' ? false : false });
  }
  endScene(ctx) {
    const t = this.t, k = this.k;
    if (k === 'one') { this.scene(ctx, 2); ctx.fillStyle = `rgba(244,240,230,${clamp(this.pt / 6, 0, 0.55)})`; ctx.fillRect(0, 0, VW, VH); }                       // one tidy format, fading pale
    else if (k === 'seal') { const n = 6, w = VW / n, gut = lerp(0, 34, clamp(this.pt / 3, 0, 1)); for (let i = 0; i < n; i++) { ctx.save(); ctx.beginPath(); ctx.rect(i * w + gut / 2, gut, w - gut, VH - gut * 2); ctx.clip(); this.scene(ctx, [0, 2, 7, 8, 10, 11][i], i * w, w); ctx.restore(); ctx.strokeStyle = '#d9a441'; ctx.lineWidth = 6; ctx.strokeRect(i * w + gut / 2, gut, w - gut, VH - gut * 2); } }
    else { const nx = 6, ny = 4, w = VW / nx, h = VH / ny; for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { ctx.save(); ctx.beginPath(); ctx.rect(i * w, j * h, w + 1, h + 1); ctx.clip(); this.scene(ctx, Math.floor(hash2(i * 7 + j, Math.floor(t / 1.7 + hash2(i, j) * 3)) * NS), i * w, w); ctx.restore(); } }
  }
}
