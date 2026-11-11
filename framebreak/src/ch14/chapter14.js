// CHAPTER 14 — ONE BREATH. Ink wash on rice paper. Nothing here is built;
// it is painted, and what you paint is real for as long as it is wet. Hold the
// mouse button (or J) and the brush lays down a stroke Rin can walk on. Ink is
// finite, strokes dry and flake away, and falling water takes them at once.
import { clamp, lerp, hash2, TAU, makeCanvas } from '../core/util.js';
import { VW, VH, fit, dlg, titleCard, objective, introSnap } from '../fx/ui2d.js';

const INK = '#15110f', GY = 880, HY = 520;
const GROUND = [[-300, GY, 1200, 400], [1500, GY, 800, 400], [2300, HY, 500, 800], [3100, HY, 1400, 800]], STONES = [1750, 2520], ENSO = { x: 3950, y: 290, r: 150 }, FALL = [2800, 3100];
const SONG = (() => { const bars = {}, k = ['D4 . . . A4 . . . G4 . F4 . D4 . . .', 'C4 . . . G4 . . . A4 . . . . . . .', 'D4 . . . F4 . G4 . A4 . . . C5 . . .', 'A4 . G4 . F4 . . . D4 . . . . . . .'], f = ['. . . . . . . . D5 - - - - - C5 -', 'A4 - - - - - - - . . . . . . . .', '. . . . . . . . F5 - - - D5 - - -', 'C5 - - - A4 - - - - - - - . . . .'];
  const A = [0, 1, 2, 3].map((i) => { bars['a' + i] = { koto: k[i], fl: f[i], bass: i % 2 ? 'C2 - - - - - - - - - - - - - - -' : 'D2 - - - - - - - - - - - - - - -' }; return 'a' + i; });
  return { bpm: 66, gain: 1, reverb: 0.55, start: 'A', tracks: { koto: { inst: 'pizz', vol: 0.8, send: 0.5 }, fl: { inst: 'flute', vol: 0.55, pan: 0.15, send: 0.7, layer: 1 }, bass: { inst: 'upright', vol: 0.5 } }, bars, sections: { A }, next: { A: 'A' } }; })();
export { SONG as SONG_CH14 };
const OBJ = [[900, 'PAINT A BRIDGE', 'Hold the mouse button and drag — or move the brush with the arrow keys and hold J.'], [2300, 'PAINT A WAY UP', 'A slope works. Ink runs out: the inkstone refills it, and old strokes dry and flake off.'], [3100, 'CROSS THE FALLS', 'Water takes ink straight off the page. Paint, and run.'], [1e9, 'ONE CIRCLE, ONE BREATH', 'Paint all the way round the ring before the first of it dries.']];

export default class Chapter14 {
  constructor(game) { this.game = game; this.id = 14; this.compositesOutgoing = true; }
  async load() {
    const p = (this.paper = makeCanvas(VW, VH)), x = p.getContext('2d'); x.fillStyle = '#ece3cf'; x.fillRect(0, 0, VW, VH); for (let i = 0; i < 5000; i++) { x.fillStyle = `rgba(${hash2(i, 1) > 0.5 ? '110,90,60' : '255,252,240'},${hash2(i, 2) * 0.07})`; x.fillRect(hash2(i, 3) * VW, hash2(i, 4) * VH, 2 + hash2(i, 5) * 22, 1.2); } const v = x.createRadialGradient(960, 500, 500, 960, 540, 1200); v.addColorStop(0, 'rgba(120,90,50,0)'); v.addColorStop(1, 'rgba(120,90,50,0.22)'); x.fillStyle = v; x.fillRect(0, 0, VW, VH);
    this.hills = [0, 1, 2].map((L) => { const c = makeCanvas(2400, 700), q = c.getContext('2d'); for (let i = 0; i < 7; i++) { const cx = hash2(i, L * 3 + 1) * 2400, w = 260 + hash2(i, L + 2) * 420, h = 200 + hash2(i, L + 5) * (360 - L * 70), g = q.createLinearGradient(0, 700 - h, 0, 700); g.addColorStop(0, `rgba(40,44,52,${0.16 + L * 0.13})`); g.addColorStop(1, 'rgba(40,44,52,0)'); q.fillStyle = g; for (const o of [0, -2400, 2400]) { q.beginPath(); q.moveTo(cx + o - w, 700); q.quadraticCurveTo(cx + o - w * 0.3, 700 - h * 1.25, cx + o, 700 - h); q.quadraticCurveTo(cx + o + w * 0.35, 700 - h * 0.7, cx + o + w, 700); q.fill(); } } return c; });
  }
  controlsHelp() { return '<b>A/D</b> walk · <b>SPACE</b> jump · <b>mouse</b>: hold the button and drag to paint<br>No mouse? <b>arrow keys</b> move the brush, hold <b>J</b> to paint.'; }
  start({ handoff } = {}) {
    const g = this.game; this.snap = handoff ? g.snapshot() : null; g.show3d(false); g.c2d.style.imageRendering = ''; g.c2d.style.opacity = '1'; if (handoff) g.director.releaseOutgoing(); g.input.exitLock();
    this.t = 0; this.cam = 0; this.fin = null; this.noPause = false; this.said = {}; this.pts = []; this.ink = 1; this.last = null; this.b = { x: 700, y: 600, key: false, down: false }; this.r = { x: 260, y: GY, vx: 0, vy: 0, f: 1, w: 0, on: false, coy: 0, buf: 0 }; this.cp = [260, GY]; this.cov = new Uint8Array(12);
    g.audio.muffle(0); g.music.play(SONG, { intensity: 1, fade: 1.2 });
    g.dialogue.say([{ who: 'vell', text: 'Ink and water. Nothing here gets drawn twice. One stroke, one breath.' }, { who: 'rin', text: 'There is no bridge.' }, { who: 'vell', text: "There's no bridge YET. Hold the mouse button and paint one. It's real for as long as it's wet." }]);
    g.director.preload(15);
  }
  stop() {}
  respawn() { const r = this.r; r.x = this.cp[0]; r.y = this.cp[1]; r.vx = r.vy = 0; this.game.sfx.play('pp.hurt'); }
  solid(x, y) { for (const [gx, gt, gw] of GROUND) if (x > gx && x < gx + gw && y > gt) return true; return false; }
  update(dt, outgoing) {
    if (outgoing) return; const g = this.game, inp = g.input, r = this.r, b = this.b, m = inp.mouse; this.t += dt; const t = this.t;
    if (this.fin) { this.fin.t += dt; g.audio.muffle(clamp(this.fin.t / 6, 0, 0.6)); if (this.fin.t > 6 && !this.fin.done) { this.fin.done = true; const ok = g.director.handoff(15, { from14: true }); if (!ok) { g.save.complete(14); g.audio.muffle(0); g.director.end({ chapter: 14 }); } } return; }
    // brush
    const S = Math.min(g.W / VW, g.H / VH), mx = (m.nx * g.W - (g.W - VW * S) / 2) / S + this.cam, my = (m.ny * g.H - (g.H - VH * S) / 2) / S, kx = (inp.keys.has('ArrowRight') ? 1 : 0) - (inp.keys.has('ArrowLeft') ? 1 : 0), ky = (inp.keys.has('ArrowDown') ? 1 : 0) - (inp.keys.has('ArrowUp') ? 1 : 0);
    if (kx || ky) { if (!b.key) { b.key = true; b.x = r.x + r.f * 80; b.y = r.y - 20; } b.x += kx * 560 * dt; b.y += ky * 560 * dt; } else if (Math.abs(m.nx - (this.lnx ?? m.nx)) + Math.abs(m.ny - (this.lny ?? m.ny)) > 0.001) b.key = false; this.lnx = m.nx; this.lny = m.ny; if (!b.key) { b.x = mx; b.y = my; } b.x = clamp(b.x, this.cam + 10, this.cam + VW - 10); b.y = clamp(b.y, 20, VH - 20);
    const down = (b.key ? inp.down.attack : m.left || inp.down.attack) && this.ink > 0.01 && !this.solid(b.x, b.y);
    if (down) { const L = this.last; if (!L) this.last = { x: b.x, y: b.y }; else { const d = Math.hypot(b.x - L.x, b.y - L.y), n = Math.floor(d / 8); for (let i = 1; i <= n && this.ink > 0; i++) { const u = (i * 8) / d, px = L.x + (b.x - L.x) * u, py = L.y + (b.y - L.y) * u; if (!this.solid(px, py)) { this.pts.push({ x: px, y: py, r: clamp(21 - (d / dt) * 0.006, 10, 20), t: 0, life: px > FALL[0] && px < FALL[1] ? 1.5 : 18 }); this.ink -= 8 / 1500; } } if (n) { this.last = { x: L.x + (b.x - L.x) * ((n * 8) / d), y: L.y + (b.y - L.y) * ((n * 8) / d) }; if (Math.random() < 0.25) g.sfx.play('ink.squash', { vol: 0.1, pitch: 1.3 + Math.random() * 0.5 }); } } } else this.last = null;
    for (const p of this.pts) { p.t += dt; if (p.t >= p.life) this.ink = Math.min(1, this.ink + 8 / 1500); } this.pts = this.pts.filter((p) => p.t < p.life);
    for (const sx of STONES) if (Math.abs(r.x - sx) < 60 && r.on && this.ink < 0.98) { this.ink = 1; g.sfx.play('pp.chime', { pitch: 0.7 }); }
    // Rin
    const mv = (inp.keys.has('KeyD') ? 1 : 0) - (inp.keys.has('KeyA') ? 1 : 0); r.vx = lerp(r.vx, mv * 400, Math.min(1, dt * (r.on ? 14 : 7))); if (mv) r.f = mv; r.vy = Math.min(1500, r.vy + 2400 * dt);
    if (r.on) r.coy = 0.12; else r.coy -= dt; if (inp.pressed.jump) r.buf = 0.14; else r.buf -= dt; if (r.buf > 0 && r.coy > 0) { r.vy = -880; r.buf = r.coy = 0; r.on = false; g.sfx.play('pp.jump'); } if (r.vy < 0 && !inp.down.jump) r.vy += 2600 * dt;
    r.x += r.vx * dt; for (const [gx, gt, gw] of GROUND) if (r.x + 18 > gx && r.x - 18 < gx + gw && r.y > gt + 6) { r.x = r.x < gx + gw / 2 ? gx - 18 : gx + gw + 18; r.vx = 0; }
    const py = r.y; r.y += r.vy * dt; const was = r.on; r.on = false; let top = 1e9;
    for (const [gx, gt, gw] of GROUND) if (r.x + 14 > gx && r.x - 14 < gx + gw && r.vy >= 0 && py <= gt + 3 && r.y >= gt) top = Math.min(top, gt);
    if (r.vy >= 0) for (const p of this.pts) { const dx = Math.abs(r.x - p.x); if (dx < p.r + 8) { const st = p.y - p.r * 0.75; if (py <= st + 26 && r.y >= st - 1) top = Math.min(top, st); } }
    if (top < 1e9) { r.y = top; r.vy = 0; r.on = true; if (!was) g.sfx.play('pp.land', { vol: 0.4 }); } if (r.on && Math.abs(r.vx) > 40) r.w += dt * 11;
    for (const [gx, gt, gw] of GROUND) if (r.on && r.y === gt && r.x > gx + 60 && r.x < gx + gw - 60) this.cp = [r.x, gt]; if (r.y > 1300) this.respawn(); r.x = Math.max(-200, r.x);
    this.cam = lerp(this.cam, clamp(r.x - 760, -200, 2560), Math.min(1, dt * 3.5));
    const say = (k, x, who, text) => { if (!this.said[k] && r.x > x) { this.said[k] = true; g.dialogue.say(who, text); } };
    say('a', 1560, 'vell', 'Ink runs out. Stand on the stone and it fills again. Old strokes dry and flake away on their own.'); say('b', 2000, 'rin', 'A cliff. No stairs.'); say('c', 2380, 'vell', 'Water takes ink straight off the page. Paint, and RUN.'); say('d', 3300, 'vell', 'One circle. One breath. All the way round before the first of it dries. This is the whole art, Rin.');
    // the enso
    this.cov.fill(0); for (const p of this.pts) { const dx = p.x - ENSO.x, dy = p.y - ENSO.y, d = Math.hypot(dx, dy); if (Math.abs(d - ENSO.r) < 42) this.cov[Math.floor(((Math.atan2(dy, dx) + TAU) % TAU) / (TAU / 12)) % 12] = 1; }
    if (this.cov.every((v) => v) && r.x > 3100) { this.fin = { t: 0 }; this.noPause = true; g.sfx.play('fx.shimmer'); g.sfx.play('pp.chime', { pitch: 0.6 }); g.sfx.play('fx.rise'); g.dialogue.clear(); g.dialogue.say([{ who: 'rin', text: 'It closed.' }, { who: 'vell', text: "And now somebody wants to see it MOVE. A corner's lifting — there are more pages under this one!" }]); }
  }
  render() {
    const g = this.game, ctx = fit(g, '#1a1612'), t = this.t, r = this.r, cam = this.cam, k = this.fin ? clamp(this.fin.t / 5.5, 0, 1) : 0;
    ctx.save(); if (k > 0) { const z = 1 + k * k * 5; ctx.translate(ENSO.x - cam, ENSO.y); ctx.scale(z, z); ctx.translate(-(ENSO.x - cam), -ENSO.y); }
    ctx.drawImage(this.paper, 0, 0); this.hills.forEach((h, L) => { const o = ((cam * (0.12 + L * 0.12)) % 2400 + 2400) % 2400; ctx.drawImage(h, -o, 250 + L * 60); ctx.drawImage(h, 2400 - o, 250 + L * 60); });
    { const sx = 1500 - cam * 0.08; ctx.fillStyle = 'rgba(200,60,50,0.75)'; ctx.beginPath(); ctx.arc(sx, 210, 60, 0, TAU); ctx.fill(); }
    ctx.translate(-cam, 0);
    // falls
    { const [a, b] = FALL; ctx.fillStyle = 'rgba(120,150,170,0.14)'; ctx.fillRect(a, 0, b - a, VH); ctx.strokeStyle = 'rgba(70,100,125,0.35)'; ctx.lineWidth = 3; for (let i = 0; i < 26; i++) { const x = a + 8 + i * 11.4, y = ((t * (700 + (i % 5) * 90) + i * 173) % 1300) - 150; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.sin(i) * 3, y + 90 + (i % 4) * 30); ctx.stroke(); } }
    // ground: a wet contour stroke over a wash that fades downward
    for (const [gx, gt, gw] of GROUND) { const gr = ctx.createLinearGradient(0, gt, 0, gt + 380); gr.addColorStop(0, 'rgba(21,17,15,0.78)'); gr.addColorStop(0.25, 'rgba(21,17,15,0.3)'); gr.addColorStop(1, 'rgba(21,17,15,0)'); ctx.fillStyle = gr; ctx.fillRect(gx, gt, gw, 400); ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.lineWidth = 14; ctx.beginPath(); for (let x = gx; x <= gx + gw; x += 40) ctx.lineTo(x, gt + 4 + Math.sin(x * 0.03) * 3); ctx.stroke(); ctx.lineWidth = 3; ctx.globalAlpha = 0.35; for (let i = 0; i < gw / 26; i++) { const x = gx + 8 + i * 26; ctx.beginPath(); ctx.moveTo(x, gt + 18); ctx.lineTo(x + (hash2(i, gx) - 0.5) * 16, gt + 60 + hash2(i, 9) * 150); ctx.stroke(); } ctx.globalAlpha = 1;
      for (let i = 0; i < gw / 420; i++) { const px = gx + 120 + i * 420 + hash2(i, gx) * 120, h = 150 + hash2(i, gt) * 110; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(px, gt); ctx.quadraticCurveTo(px + 14, gt - h * 0.5, px - 6, gt - h); ctx.stroke(); for (let j = 0; j < 5; j++) { ctx.lineWidth = 16 - j * 2; ctx.globalAlpha = 0.75; const y = gt - h * (0.42 + j * 0.13), w = 80 - j * 12; ctx.beginPath(); ctx.moveTo(px - w, y + 12); ctx.quadraticCurveTo(px, y - 16, px + w, y + 10); ctx.stroke(); } ctx.globalAlpha = 1; } }
    for (const sx of STONES) { const gy = sx < 2300 ? GY : HY; ctx.fillStyle = INK; ctx.beginPath(); ctx.roundRect(sx - 54, gy - 26, 108, 30, 8); ctx.fill(); ctx.fillStyle = '#3a4250'; ctx.beginPath(); ctx.ellipse(sx, gy - 22, 34, 8, 0, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(sx - 10, gy - 24, 12, 2.5, 0, 0, TAU); ctx.fill(); }
    // the ring to close
    { ctx.setLineDash([6, 16]); ctx.strokeStyle = 'rgba(21,17,15,0.3)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(ENSO.x, ENSO.y, ENSO.r, 0, TAU); ctx.stroke(); ctx.setLineDash([]); for (let i = 0; i < 12; i++) if (this.cov[i]) { ctx.strokeStyle = 'rgba(200,60,50,0.5)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(ENSO.x, ENSO.y, ENSO.r + 50, (i * TAU) / 12 + 0.04, ((i + 1) * TAU) / 12 - 0.04); ctx.stroke(); } }
    // every stroke you have laid: a wet halo round a dark core, thinning as it dries
    for (const p of this.pts) { const a = clamp((p.life - p.t) / Math.min(3, p.life), 0, 1); ctx.fillStyle = INK; ctx.globalAlpha = 0.1 * a; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 1.8, 0, TAU); ctx.fill(); } for (const p of this.pts) { const a = clamp((p.life - p.t) / Math.min(3, p.life), 0, 1); ctx.fillStyle = INK; ctx.globalAlpha = (0.82 + hash2(p.x | 0, p.y | 0) * 0.18) * a; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.55 + a * 0.45), 0, TAU); ctx.fill(); } ctx.globalAlpha = 1;
    // Vell, a blot with an eye; Rin, five strokes
    { const vx = r.x - r.f * 80, vy = r.y - 190 + Math.sin(t * 2.5) * 12; ctx.fillStyle = 'rgba(150,80,160,0.25)'; ctx.beginPath(); ctx.arc(vx, vy, 40, 0, TAU); ctx.fill(); ctx.fillStyle = '#8a4a98'; ctx.beginPath(); for (let i = 0; i < 9; i++) { const a = (i * TAU) / 9, rr = 22 + Math.sin(t * 3 + i * 2) * 4; ctx.lineTo(vx + Math.cos(a) * rr, vy + Math.sin(a) * rr); } ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(vx + 6, vy - 3, 7, 0, TAU); ctx.fill(); ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(vx + 8, vy - 3, 3, 0, TAU); ctx.fill(); }
    { const sw = r.on ? Math.sin(r.w) * Math.min(1, Math.abs(r.vx) / 200) : 0.6; ctx.save(); ctx.translate(r.x, r.y); ctx.scale(r.f, 1); ctx.lineCap = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = 11; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 5, -46); ctx.lineTo(s * 6 + s * sw * 24, -2); ctx.stroke(); } ctx.fillStyle = 'rgba(40,170,160,0.8)'; ctx.beginPath(); ctx.ellipse(0, -72, 23, 34, 0.08, 0, TAU); ctx.fill(); ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-18, -100); ctx.quadraticCurveTo(-26, -70, -14, -42); ctx.stroke(); ctx.strokeStyle = 'rgba(230,120,40,0.9)'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(-6, -100); ctx.quadraticCurveTo(-40, -106 + Math.sin(t * 6) * 8, -70, -92 - Math.sin(t * 6) * 8); ctx.stroke(); ctx.fillStyle = '#f2d9bd'; ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(3, -122, 19, 0, TAU); ctx.fill(); ctx.stroke(); ctx.lineWidth = 7; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-8 + i * 7, -136); ctx.lineTo(-20 + i * 9, -158 - (i % 2) * 8); ctx.stroke(); } ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(11, -124, 3, 0, TAU); ctx.fill(); ctx.restore(); }
    // the brush
    if (!this.fin) { const b = this.b; ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(-0.6); ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(12, -22, 7, -40); ctx.lineTo(-7, -40); ctx.quadraticCurveTo(-12, -22, 0, 0); ctx.fill(); ctx.fillStyle = '#b8894a'; ctx.fillRect(-6, -150, 12, 112); ctx.fillStyle = '#7a5226'; ctx.fillRect(-7, -48, 14, 10); ctx.restore(); }
    for (let i = 0; i < 26; i++) { const x = cam + ((hash2(i, 1) * 2200 + t * (30 + i * 3)) % 2200) - 100, y = ((hash2(i, 2) * 1200 + t * (50 + i * 4)) % 1200) - 60; ctx.fillStyle = 'rgba(226,150,160,0.8)'; ctx.beginPath(); ctx.ellipse(x, y, 9, 5, t + i, 0, TAU); ctx.fill(); }
    ctx.restore();
    if (k > 0.75) { ctx.fillStyle = `rgba(236,227,207,${(k - 0.75) * 4})`; ctx.fillRect(0, 0, VW, VH); }
    if (!this.fin) { const ob = OBJ.find((o) => r.x < o[0]); objective(ctx, ob[1], ob[2], { bg: 'rgba(21,17,15,0.82)', accent: '#c83c32', dim: '#d8ccb4' }); ctx.fillStyle = 'rgba(21,17,15,0.82)'; ctx.fillRect(40, 140, 330, 44); ctx.fillStyle = '#d8ccb4'; ctx.font = '800 20px "Trebuchet MS", sans-serif'; ctx.textAlign = 'left'; ctx.fillText('INK', 56, 169); ctx.fillStyle = '#3a342c'; ctx.fillRect(112, 154, 240, 16); ctx.fillStyle = this.ink < 0.2 ? '#c83c32' : '#ece3cf'; ctx.fillRect(112, 154, 240 * clamp(this.ink, 0, 1), 16);
      ctx.fillStyle = '#c83c32'; ctx.fillRect(1780, 940, 84, 84); ctx.strokeStyle = '#ece3cf'; ctx.lineWidth = 5; ctx.strokeRect(1794, 954, 56, 56); ctx.beginPath(); ctx.moveTo(1794, 982); ctx.lineTo(1850, 982); ctx.moveTo(1822, 954); ctx.lineTo(1822, 1010); ctx.stroke(); }
    titleCard(ctx, t, 14, 'ONE BREATH', INK, '#c83c32'); introSnap(ctx, this.snap, t, 2); dlg(ctx, g, { bg: 'rgba(21,17,15,0.9)', line: '#c83c32', fg: '#ece3cf' });
  }
}
