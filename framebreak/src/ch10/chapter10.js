// CHAPTER 10 — LAMPLIGHT. A shadow-puppet theatre: a cloth screen, a lamp
// behind it, and everything else a black cut-out on a rod. The lamp slides
// left and right; every shadow slides with it, and the ones hung nearer the
// flame travel further. Platforms are shadows. So are you.
import { clamp, lerp, hash2, TAU, makeCanvas } from '../core/util.js';
import { VW, VH, fit, dlg, titleCard, objective, introSnap } from '../fx/ui2d.js';
import { hand2d } from '../ch18/atelierkit.js';

const INK = '#1a110c', HOLE = '#f0c684', GY = 860, SH = 260;
const SONG = (() => { const bars = {}, m = ['D4 . A4 . G4 . E4 . D4 . E4 . G4 . A4 .', 'B4 . A4 . G4 . E4 . G4 . . . E4 . D4 .', 'D4 . E4 . G4 . A4 . B4 . D5 . B4 . A4 .', 'G4 . E4 . D4 . . . E4 . G4 . D4 . . .'], f = ['. . . . . . . . A5 - - - G5 - E5 -', '. . . . D5 - - - . . . . . . . .', '. . . . . . . . D6 - - B5 - - A5 -', 'G5 - - - - - - - . . . . . . . .'];
  const A = [0, 1, 2, 3].map((i) => { bars['a' + i] = { mar: m[i], fl: f[i], bass: i % 2 ? 'G2 - - - - - - - D2 - - - - - - -' : 'D2 - - - - - - - A2 - - - - - - -', bell: i === 3 ? '. . . . . . . . . . . . D6 . . .' : 'D5 . . . . . . . . . . . . . . .' }; return 'a' + i; });
  return { bpm: 84, gain: 1, reverb: 0.4, start: 'A', tracks: { mar: { inst: 'marimba', vol: 0.75, pan: -0.2, send: 0.3 }, fl: { inst: 'flute', vol: 0.5, pan: 0.2, send: 0.5, layer: 1 }, bass: { inst: 'upright', vol: 0.8 }, bell: { inst: 'bell', vol: 0.4, send: 0.6 } }, bars, sections: { A }, next: { A: 'A' } }; })();
export { SONG as SONG_CH10 };
// [kind, x, top, w, h, depth]  g = ground, w = wall, p = one-way shadow ledge
const LEVEL = [
  ['g', -400, GY, 1400, 400, 0], ['p', 1300, GY, 300, 46, 1.2],
  ['g', 1900, GY, 800, 400, 0], ['p', 2100, 740, 260, 40, 0.5], ['p', 1994, 620, 260, 40, 1.5], ['p', 1888, 500, 260, 40, 2.5], ['w', 2700, 530, 60, 730, 0],
  ['g', 2760, GY, 840, 400, 0], ['p', 3860, GY, 260, 46, 1], ['p', 4250, GY, 260, 46, -1],
  ['g', 4700, GY, 700, 400, 0], ['p', 4900, 740, 220, 40, 1], ['p', 5600, 620, 220, 40, -1.5],
  ['g', 6150, 500, 900, 760, 0],
];
const OBJ = [[1000, 'CROSS THE GAP', 'Step on the shadow, then slide the lamp (← →) to carry yourself across.'], [2760, 'CLIMB THE TOWER', 'Slide the lamp until the three shadows spread out into stairs.'], [4700, 'CROSS THE PIT', 'These two hang on opposite sides of the flame. They move in opposite directions.'], [1e9, 'REACH THE LAMP', 'Ride one shadow up to the next.']];

export default class Chapter10 {
  constructor(game) { this.game = game; this.id = 10; this.compositesOutgoing = true; }
  async load() {
    const c = (this.cloth = makeCanvas(VW, VH)), x = c.getContext('2d'), g = x.createRadialGradient(960, 470, 80, 960, 520, 1150); g.addColorStop(0, '#f8dca0'); g.addColorStop(0.5, '#e2a55c'); g.addColorStop(1, '#8a4a22'); x.fillStyle = g; x.fillRect(0, 0, VW, VH);
    for (let i = 0; i < VH; i += 3) { x.fillStyle = `rgba(90,50,20,${0.03 + hash2(i, 1) * 0.05})`; x.fillRect(0, i, VW, 1); } for (let i = 0; i < VW; i += 3) { x.fillStyle = `rgba(255,240,200,${hash2(i, 2) * 0.05})`; x.fillRect(i, 0, 1, VH); }
    for (let i = 0; i < 26; i++) { x.fillStyle = `rgba(110,60,25,${0.03 + hash2(i, 7) * 0.04})`; x.beginPath(); x.ellipse(hash2(i, 3) * VW, hash2(i, 4) * VH, 60 + hash2(i, 5) * 200, 30 + hash2(i, 6) * 120, hash2(i, 8) * 3, 0, TAU); x.fill(); }
    x.strokeStyle = 'rgba(90,50,20,0.25)'; x.lineWidth = 3; x.setLineDash([14, 10]); x.beginPath(); x.moveTo(640, 0); x.lineTo(640, VH); x.moveTo(1280, 0); x.lineTo(1280, VH); x.stroke();
    const v = (this.vig = makeCanvas(VW, VH)), y = v.getContext('2d'), q = y.createRadialGradient(960, 520, 420, 960, 540, 1180); q.addColorStop(0, 'rgba(20,8,0,0)'); q.addColorStop(1, 'rgba(20,8,0,0.82)'); y.fillStyle = q; y.fillRect(0, 0, VW, VH);
    y.fillStyle = INK; y.fillRect(0, 0, VW, 26); for (let i = 0; i < 49; i++) { y.beginPath(); y.arc(i * 40 + 20, 26, 20, 0, Math.PI); y.fill(); y.fillRect(i * 40 + 18, 44, 4, 16 + (i % 3) * 8); y.beginPath(); y.arc(i * 40 + 20, 66 + (i % 3) * 8, 6, 0, TAU); y.fill(); }
  }
  controlsHelp() { return '<b>A/D</b> walk · <b>SPACE</b> jump · <b>← →</b> slide the lamp<br>Every shadow slides when the lamp does. Shadows hung nearer the flame slide further.'; }
  start({ handoff } = {}) {
    const g = this.game; this.snap = handoff ? g.snapshot() : null; g.show3d(false); g.c2d.style.imageRendering = ''; g.c2d.style.opacity = '1'; if (handoff) g.director.releaseOutgoing();
    this.t = 0; this.L = 0; this.Lt = 0; this.cam = 0; this.fin = null; this.noPause = false; this.said = {}; this.r = { x: 200, y: GY, vx: 0, vy: 0, f: 1, w: 0, on: null, coy: 0, buf: 0 }; this.cp = [200, GY]; this.vx = 120; this.vy = 600;
    g.audio.muffle(0); g.music.play(SONG, { intensity: 1, fade: 1.2 });
    g.dialogue.say([{ who: 'vell', text: "Behind every page there's a cloth, and behind the cloth there's a lamp. We're the shadows now." }, { who: 'rin', text: 'I am on a stick.' }, { who: 'vell', text: "Everybody's on a stick. Slide the lamp with ← and → — the shadows slide with it." }]);
    g.director.preload(11);
  }
  stop() {}
  respawn() { const r = this.r; r.x = this.cp[0]; r.y = this.cp[1]; r.vx = r.vy = 0; this.game.sfx.play('pp.hurt'); }
  X(p) { return p[1] + this.L * SH * p[5]; }
  update(dt, outgoing) {
    if (outgoing) return; const g = this.game, inp = g.input, r = this.r; this.t += dt;
    if (this.fin) { this.fin.t += dt; g.audio.muffle(clamp(this.fin.t / 6, 0, 0.6)); if (this.fin.t > 6.2 && !this.fin.done) { this.fin.done = true; const ok = g.director.handoff(11, { from10: true }); if (!ok) { g.save.complete(10); g.audio.muffle(0); g.director.end({ chapter: 10 }); } } return; }
    const li = (inp.keys.has('ArrowRight') ? 1 : 0) - (inp.keys.has('ArrowLeft') ? 1 : 0), L0 = this.L; this.Lt = clamp(this.Lt + li * dt * 0.9, -1, 1); this.L += (this.Lt - this.L) * Math.min(1, dt * 8); if (li && Math.floor(this.t * 6) !== Math.floor((this.t - dt) * 6)) g.sfx.play('pp.slide', { vol: 0.25, pitch: 0.7 + this.Lt * 0.2 });
    if (r.on) r.x += r.on[5] * SH * (this.L - L0);
    const mv = (inp.keys.has('KeyD') ? 1 : 0) - (inp.keys.has('KeyA') ? 1 : 0); r.vx = lerp(r.vx, mv * 430, Math.min(1, dt * (r.on ? 14 : 7))); if (mv) r.f = mv; r.vy = Math.min(1500, r.vy + 2400 * dt);
    if (r.on) r.coy = 0.12; else r.coy -= dt; if (inp.pressed.jump) r.buf = 0.14; else r.buf -= dt; if (r.buf > 0 && r.coy > 0) { r.vy = -900; r.buf = r.coy = 0; r.on = null; g.sfx.play('pp.jump'); } if (r.vy < 0 && !inp.down.jump) r.vy += 2600 * dt;
    r.x += r.vx * dt; for (const p of LEVEL) { if (p[0] === 'p') continue; const px = this.X(p); if (r.x + 20 > px && r.x - 20 < px + p[3] && r.y > p[2] + 6 && r.y - 116 < p[2] + p[4]) { r.x = r.x < px + p[3] / 2 ? px - 20 : px + p[3] + 20; r.vx = 0; } }
    const py = r.y; r.y += r.vy * dt; const was = r.on; r.on = null; for (const p of LEVEL) { const px = this.X(p); if (r.x + 16 > px && r.x - 16 < px + p[3] && r.vy >= 0 && py <= p[2] + 3 && r.y >= p[2]) { r.y = p[2]; r.vy = 0; r.on = p; } }
    if (r.on && !was) g.sfx.play('pp.land', { vol: 0.5 }); if (r.on && r.on[0] === 'g') this.cp = [clamp(r.x, this.X(r.on) + 50, this.X(r.on) + r.on[3] - 50), r.on[2]];
    if (r.on && Math.abs(r.vx) > 40) { r.w += dt * 11; if (Math.floor(r.w / Math.PI) !== Math.floor((r.w - dt * 11) / Math.PI)) g.sfx.play('pp.step', { vol: 0.35 }); }
    if (r.y > 1400) this.respawn(); r.x = Math.max(-300, r.x);
    this.cam = lerp(this.cam, clamp(r.x - 800, -300, 5100), Math.min(1, dt * 4)); this.vx = lerp(this.vx, r.x - r.f * 90, Math.min(1, dt * 3)); this.vy = lerp(this.vy, r.y - 200, Math.min(1, dt * 3));
    const say = (k, x, who, text) => { if (!this.said[k] && r.x > x) { this.said[k] = true; g.dialogue.say(who, text); } };
    say('a', 2000, 'vell', 'Things hung nearer the flame throw shadows that travel further. Spread them out.'); say('b', 2900, 'vell', "Some puppets hang on the FAR side of the flame. Those go the other way. Don't ask me how."); say('c', 4800, 'rin', 'There it is. The first light anything was ever shown with.');
    if (r.x > 6480 && r.on) { this.fin = { t: 0 }; this.noPause = true; g.sfx.play('fx.shimmer'); g.sfx.play('fx.rise'); g.dialogue.clear(); g.dialogue.say([{ who: 'rin', text: "It's warm." }, { who: 'vell', text: "It's catching COLOUR. The light's going through something now — that's glass!" }]); }
  }

  // ---- drawing -----------------------------------------------------------
  soft(ctx, d, fn) { const a = Math.abs(d); for (const o of a > 0.2 ? [-1, 1, 0] : [0]) { ctx.save(); ctx.translate(o * a * 4, o * a * 1.5); ctx.globalAlpha = o ? 0.2 : 0.96 - a * 0.08; fn(); ctx.restore(); } }
  rod(ctx, x, y) { ctx.strokeStyle = 'rgba(26,17,12,0.55)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 6, VH); ctx.stroke(); }
  piece(ctx, p, t) {
    const x = this.X(p) - this.cam, [k, , top, w, h] = p; if (x > VW + 200 || x + w < -200) return; ctx.fillStyle = INK;
    if (k === 'p') { const sway = Math.sin(t * 1.3 + p[1]) * 2; this.rod(ctx, x + w * 0.3, top + h); this.rod(ctx, x + w * 0.7, top + h); ctx.save(); ctx.translate(0, sway); ctx.beginPath(); ctx.roundRect(x, top, w, h * 0.6, 12); ctx.fill(); for (let i = 0; i < w / 40; i++) { ctx.beginPath(); ctx.arc(x + 20 + i * 40, top + h * 0.6, 20, 0, Math.PI); ctx.fill(); ctx.fillRect(x + 18 + i * 40, top + h * 0.6 + 18, 4, 14); } ctx.fillStyle = HOLE; for (let i = 0; i < w / 40 - 0.5; i++) { const cx = x + 20 + i * 40, cy = top + h * 0.32; ctx.beginPath(); ctx.moveTo(cx, cy - 9); ctx.lineTo(cx + 9, cy); ctx.lineTo(cx, cy + 9); ctx.lineTo(cx - 9, cy); ctx.fill(); } ctx.restore(); return; }
    ctx.fillRect(x, top, w, h + 300); if (k === 'w') { for (let i = 0; i < 3; i++) ctx.fillRect(x - 8 + i * 28, top - 22, 20, 24); ctx.fillStyle = HOLE; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x + 30, top + 70 + i * 90, 11, Math.PI, 0); ctx.rect(x + 19, top + 70 + i * 90, 22, 26); ctx.fill(); } return; }
    for (let i = 0; i < w / 14; i++) { const gh = 10 + hash2(i, p[1]) * 22; ctx.beginPath(); ctx.moveTo(x + i * 14, top + 2); ctx.lineTo(x + i * 14 + 5 + Math.sin(t * 2 + i) * 2, top - gh); ctx.lineTo(x + i * 14 + 10, top + 2); ctx.fill(); }
    ctx.strokeStyle = HOLE; ctx.lineWidth = 4; ctx.fillStyle = HOLE; for (let i = 0; i < w / 90 - 0.3; i++) { const cx = x + 45 + i * 90; ctx.beginPath(); ctx.arc(cx, top + 62, 22, 0.3, 5.2); ctx.stroke(); ctx.beginPath(); ctx.arc(cx + 4, top + 62, 7, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(cx + 45, top + 104, 5, 0, TAU); ctx.fill(); }
  }
  puppet(ctx, r, t) {
    const { x, y, f } = r, air = !r.on, sw = air ? 0.7 : Math.sin(r.w) * Math.min(1, Math.abs(r.vx) / 200), X = x - this.cam; this.rod(ctx, X, y - 60); ctx.save(); ctx.translate(X, y); ctx.scale(f, 1); ctx.rotate(air ? -0.12 : sw * 0.03); ctx.fillStyle = INK;
    for (const s of [-1, 1]) { const a = s * sw * 0.7; ctx.save(); ctx.translate(s * 7, -54); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(9, 0); ctx.lineTo(6, 30); ctx.lineTo(-6, 30); ctx.fill(); ctx.translate(0, 28); ctx.rotate(air ? 0.5 : Math.max(0, -a) * 0.9); ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.lineTo(5, 24); ctx.lineTo(16, 27); ctx.lineTo(-5, 27); ctx.fill(); ctx.restore(); }
    ctx.beginPath(); ctx.moveTo(-17, -98); ctx.lineTo(15, -98); ctx.lineTo(22, -46); ctx.lineTo(-24, -46); ctx.fill();                       // coat
    const tl = Math.sin(t * 5) * 8; ctx.beginPath(); ctx.moveTo(-10, -100); ctx.quadraticCurveTo(-46, -104 + tl, -78, -82 - tl); ctx.quadraticCurveTo(-48, -92 + tl, -12, -88); ctx.fill();   // scarf
    ctx.save(); ctx.translate(12, -92); ctx.rotate(-sw * 0.8 + (air ? -1.8 : 0.2)); ctx.fillRect(-5, 0, 10, 40); ctx.beginPath(); ctx.arc(0, 42, 7, 0, TAU); ctx.fill(); ctx.restore();
    ctx.beginPath(); ctx.arc(2, -118, 21, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.moveTo(20, -116); ctx.lineTo(29, -110); ctx.lineTo(18, -106); ctx.fill(); for (let i = 0; i < 5; i++) { const a = -2.9 + i * 0.5; ctx.beginPath(); ctx.moveTo(2 + Math.cos(a - 0.3) * 17, -118 + Math.sin(a - 0.3) * 17); ctx.lineTo(2 + Math.cos(a) * (36 + (i % 2) * 8), -118 + Math.sin(a) * (36 + (i % 2) * 8)); ctx.lineTo(2 + Math.cos(a + 0.3) * 17, -118 + Math.sin(a + 0.3) * 17); ctx.fill(); }
    ctx.fillStyle = HOLE; ctx.beginPath(); ctx.ellipse(9, -120, 7, 5, 0, 0, TAU); ctx.fill(); for (const [px, py] of [[0, -54], [12, -92], [-4, -72], [4, -72]]) { ctx.beginPath(); ctx.arc(px, py, 2.6, 0, TAU); ctx.fill(); } for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-14 + i * 10, -52); ctx.lineTo(-10 + i * 10, -60); ctx.lineTo(-6 + i * 10, -52); ctx.fill(); }
    ctx.restore();
  }
  render() {
    const g = this.game, ctx = fit(g, '#120804'), t = this.t, r = this.r, k = this.fin ? clamp(this.fin.t / 5.5, 0, 1) : 0;
    ctx.drawImage(this.cloth, 0, 0); const fl = 0.86 + Math.sin(t * 13) * 0.04 + Math.sin(t * 31) * 0.03 + hash2(Math.floor(t * 20), 1) * 0.05, lx = this.fin ? 6560 - this.cam : 960 + this.L * 560, ly = this.fin ? 380 : 430;
    ctx.globalCompositeOperation = 'lighter'; const gl = ctx.createRadialGradient(lx, ly, 10, lx, ly, 620 + k * 900); gl.addColorStop(0, `rgba(255,236,170,${0.5 * fl})`); gl.addColorStop(0.35, `rgba(255,190,90,${0.2 * fl})`); gl.addColorStop(1, 'rgba(255,160,60,0)'); ctx.fillStyle = gl; ctx.fillRect(0, 0, VW, VH); ctx.globalCompositeOperation = 'source-over';
    // far scenery: pale, soft, sliding the furthest
    for (let i = 0; i < 22; i++) { const bx = i * 420 + hash2(i, 9) * 200 - this.cam * 0.55 + this.L * SH * 2.4, h = 240 + hash2(i, 2) * 300; if (bx < -300 || bx > VW + 300) continue; ctx.save(); ctx.globalAlpha = 0.2; ctx.fillStyle = '#4a2812'; if (i % 3 === 0) { for (let s = 0; s < 4; s++) { const w = 220 - s * 44, y = GY - 60 - s * (h / 5); ctx.beginPath(); ctx.moveTo(bx - w * 0.75, y); ctx.quadraticCurveTo(bx - w / 2, y - 16, bx - w / 2 + 16, y - 44); ctx.lineTo(bx + w / 2 - 16, y - 44); ctx.quadraticCurveTo(bx + w / 2, y - 16, bx + w * 0.75, y); ctx.fill(); ctx.fillRect(bx - w / 2 + 20, y, w - 40, h / 5); } ctx.fillRect(bx - 5, GY - 60 - h * 0.8 - 70, 10, 70); } else { ctx.fillRect(bx - 9, GY - h, 18, h); for (let s = 0; s < 5; s++) { ctx.beginPath(); ctx.ellipse(bx + Math.sin(s * 2.4) * 46, GY - h - 10 + s * 34, 78 - s * 6, 36, Math.sin(s) * 0.4, 0, TAU); ctx.fill(); } } ctx.restore(); }
    for (const p of LEVEL) this.soft(ctx, p[5], () => this.piece(ctx, p, t));
    { const x = 6560 - this.cam; if (x < VW + 200) { ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(x - 46, 500); ctx.lineTo(x - 30, 440); ctx.lineTo(x + 30, 440); ctx.lineTo(x + 46, 500); ctx.fill(); ctx.fillRect(x - 12, 400, 24, 44); ctx.fillStyle = `rgba(255,244,200,${fl})`; ctx.beginPath(); ctx.moveTo(x, 300 - Math.sin(t * 9) * 8); ctx.quadraticCurveTo(x + 30, 370, x, 402); ctx.quadraticCurveTo(x - 30, 370, x, 300 - Math.sin(t * 9) * 8); ctx.fill(); } }
    { const vx = this.vx - this.cam, vy = this.vy + Math.sin(t * 3) * 10; this.rod(ctx, vx, vy + 20); ctx.fillStyle = INK; ctx.save(); ctx.translate(vx, vy); ctx.rotate(Math.sin(t * 2) * 0.15); for (let i = 0; i < 8; i++) { ctx.rotate(TAU / 8); ctx.beginPath(); ctx.moveTo(-9, -14); ctx.lineTo(0, -34 - (i % 2) * 10); ctx.lineTo(9, -14); ctx.fill(); } ctx.beginPath(); ctx.arc(0, 0, 20, 0, TAU); ctx.fill(); ctx.fillStyle = HOLE; ctx.beginPath(); ctx.arc(5, -2, 7, 0, TAU); ctx.fill(); ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(7, -2, 3, 0, TAU); ctx.fill(); ctx.restore(); }
    this.puppet(ctx, r, t);
    if (k > 0) { // the cloth takes colour: panes of glass bloom outward from the flame
      const cx = 6560 - this.cam, C = ['#c8323c', '#2f6fd0', '#f0b030', '#2fa36a', '#8a4fc0', '#e8642a']; for (let i = 0; i < 90; i++) { const a = hash2(i, 1) * TAU, d = hash2(i, 2) * 1700, u = clamp(k * 2.2 - d / 1100, 0, 1); if (u <= 0) continue; const px = cx + Math.cos(a) * d, py = 420 + Math.sin(a) * d * 0.7, s = 70 + hash2(i, 3) * 130; ctx.globalAlpha = u * 0.85; ctx.fillStyle = C[i % 6]; ctx.strokeStyle = '#0c0808'; ctx.lineWidth = 9; ctx.beginPath(); for (let j = 0; j < 5; j++) { const b = j * TAU / 5 + hash2(i, 4) * 3; ctx.lineTo(px + Math.cos(b) * s * (0.6 + hash2(i * 7 + j, 5) * 0.6), py + Math.sin(b) * s * (0.6 + hash2(i * 7 + j, 6) * 0.6)); } ctx.closePath(); ctx.fill(); ctx.stroke(); } ctx.globalAlpha = 1; }
    for (const s of [-1, 1]) for (const o of [14, 0]) { ctx.fillStyle = '#2a1408'; ctx.globalAlpha = o ? 0.12 : 0.3; hand2d(ctx, 960 + s * 640 + this.L * 150 + o, 1150 + Math.sin(t * 1.4 + s) * 10 - Math.abs(this.L - this.Lt) * 60, 300 + o, s * 0.2 + (this.L - this.Lt) * 0.6); } ctx.globalAlpha = 1;
    if (k > 0) { ctx.fillStyle = '#2a1408'; ctx.globalAlpha = 0.5 * Math.min(1, k * 2); hand2d(ctx, 6560 - this.cam + 40, 300 - (1 - Math.min(1, k * 1.4)) * 700, 460, Math.PI - 0.15); ctx.globalAlpha = 1; }
    ctx.drawImage(this.vig, 0, 0);
    if (!this.fin) { const ob = OBJ.find((o) => r.x < o[0]); objective(ctx, ob[1], ob[2], { y: 96, bg: 'rgba(26,17,12,0.82)', accent: '#f0c684', dim: '#e2c79c' }); ctx.fillStyle = 'rgba(26,17,12,0.8)'; ctx.fillRect(760, 1010, 400, 10); ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.arc(960 + this.L * 190, 1015, 16, 0, TAU); ctx.fill(); ctx.font = '700 20px "Trebuchet MS", sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#f0c684'; ctx.fillText('←  LAMP  →', 960, 1056); }
    titleCard(ctx, t, 10, 'LAMPLIGHT', '#fff1cf', '#f0c684'); introSnap(ctx, this.snap, t, 2); dlg(ctx, g, { bg: 'rgba(26,17,12,0.9)', line: '#f0c684', fg: '#fff1cf' });
  }
}
