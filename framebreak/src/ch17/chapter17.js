// CHAPTER 17 — COUNTERWEIGHT. A hanging mobile in an empty white gallery:
// wire arms, painted shapes, everything balanced against everything else.
// Rin has weight here. Where he stands tips the arm he is on, and every arm
// above it. Vell has weight too — E sends Vell to sit on the far end. Ring
// three bells and climb the wires to the hook in the ceiling.
import { clamp, lerp, hash2, TAU, makeCanvas } from '../core/util.js';
import { VW, VH, fit, dlg, titleCard, objective, introSnap } from '../fx/ui2d.js';

const RED = '#d8362f', YEL = '#f2b61e', BLU = '#1f4fa8', BLK = '#17151a', MR = 1.2;
// par / side: which end of the parent this arm hangs from. w: [left, right] painted weights (0 where a child arm hangs)
const DEF = [{ par: -1, side: 0, str: 110, L: 430, w: [8, 0], col: [RED, 0] }, { par: 0, side: 1, str: 150, L: 300, w: [0, 4], col: [0, YEL] }, { par: 1, side: -1, str: 150, L: 260, w: [2, 0], col: [BLU, 0] }, { par: 2, side: 1, str: 150, L: 220, w: [1, 1], col: [BLK, RED] }];
const BELL = [null, 1, -1, -1];   // which end of each arm carries a bell
const SONG = (() => { const bars = {}, m = ['E5 . . . . . G5 . . . B5 . . . . .', '. . D5 . . . . . F#5 . . . A5 . . .', 'C5 . . . . . E5 . . . G5 . . . B5 .', '. . . . D5 . . . . . . . F#5 . . .'], b = ['E2', 'D2', 'C2', 'D2'];
  const A = [0, 1, 2, 3].map((i) => { bars['a' + i] = { vib: m[i], bass: `${b[i]} - - - - - - - - - - - - - - -`, cel: i % 2 ? '. . . . . . . . . . . . . . B6 .' : '. . . . . . . . E6 . . . . . . .' }; return 'a' + i; });
  return { bpm: 80, gain: 1, reverb: 0.6, start: 'A', tracks: { vib: { inst: 'marimba', vol: 0.7, send: 0.6 }, bass: { inst: 'upright', vol: 0.6 }, cel: { inst: 'celesta', vol: 0.4, pan: 0.3, send: 0.7 } }, bars, sections: { A }, next: { A: 'A' } }; })();
export { SONG as SONG_CH17 };

export default class Chapter17 {
  constructor(game) { this.game = game; this.id = 17; this.compositesOutgoing = true; }
  async load() { const c = (this.wall = makeCanvas(VW, VH)), x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#f6f2ea'); g.addColorStop(0.9, '#ebe5d9'); g.addColorStop(0.9, '#cfc8ba'); g.addColorStop(1, '#bdb5a6'); x.fillStyle = g; x.fillRect(0, 0, VW, VH); for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(90,80,60,${hash2(i, 1) * 0.03})`; x.fillRect(hash2(i, 2) * VW, hash2(i, 3) * VH, 30 + hash2(i, 4) * 90, 1); } const v = x.createRadialGradient(960, 480, 520, 960, 540, 1250); v.addColorStop(0, 'rgba(60,50,40,0)'); v.addColorStop(1, 'rgba(60,50,40,0.25)'); x.fillStyle = v; x.fillRect(0, 0, VW, VH); x.fillStyle = BLK; x.fillRect(930, 0, 60, 14); }
  controlsHelp() { return '<b>A/D</b> walk along an arm · <b>W</b> at the middle of an arm: climb the wire up · <b>S</b> at an end: climb down · <b>SPACE</b> jump<br><b>E</b> send Vell to sit on the far end of your arm (and call Vell back). Arms too steep to walk up need a counterweight.'; }
  start({ handoff } = {}) {
    const g = this.game; this.snap = handoff ? g.snapshot() : null; g.show3d(false); g.c2d.style.imageRendering = ''; g.c2d.style.opacity = '1'; if (handoff) g.director.releaseOutgoing();
    this.t = 0; this.fin = null; this.noPause = false; this.said = {}; this.arms = DEF.map((d) => ({ ...d, th: 0, om: 0, px: 0, py: 0 })); this.bells = BELL.map((b) => (b ? { side: b, got: false, ring: 0 } : null)); this.got = 0;
    this.r = { st: 'arm', i: 3, s: 0, f: 1, w: 0, x: 0, y: 0, vx: 0, vy: 0, u: 0, strain: 0 }; this.cp = 3; this.v = { on: -1, s: 0, x: 900, y: 700 };
    g.audio.muffle(0); g.music.play(SONG, { intensity: 1, fade: 1 }); this.solve(0.016);
    g.dialogue.say([{ who: 'vell', text: 'A mobile. Everything here is hanging off everything else, and all of it is perfectly balanced.' }, { who: 'rin', text: 'Was. Until I stood on it.' }, { who: 'vell', text: "You weigh something here! So do I. Press E and I'll sit on the far end of whatever you're standing on." }]);
    g.director.preload(18);
  }
  stop() {}
  respawn() { const r = this.r; r.st = 'arm'; r.i = this.cp; r.s = 0; r.vx = r.vy = 0; this.game.sfx.play('pp.hurt'); }
  end(i, side) { const a = this.arms[i]; return [a.px + side * a.L * Math.cos(a.th), a.py + side * a.L * Math.sin(a.th)]; }
  sub(i) { const a = this.arms[i]; let m = a.w[0] + a.w[1]; this.arms.forEach((c, j) => { if (c.par === i) m += this.sub(j); }); if (this.r.st !== 'air' && this.r.i === i) m += MR; if (this.v.on === i) m += MR; return m; }
  solve(dt) {
    const t = this.t; this.arms.forEach((a, i) => { let tq = (a.w[1] - a.w[0]) * a.L; this.arms.forEach((c, j) => { if (c.par === i) tq += c.side * a.L * this.sub(j); }); if (this.r.st === 'arm' && this.r.i === i) tq += MR * this.r.s; if (this.r.st === 'rope' && this.r.i === i) tq += 0; if (this.v.on === i) tq += MR * this.v.s; const target = clamp(tq * (0.32 / a.L), -0.52, 0.52) + Math.sin(t * 0.6 + i * 1.9) * 0.025; a.om += ((target - a.th) * 16 - a.om * 3.4) * dt; a.th += a.om * dt; });
    this.arms.forEach((a, i) => { if (a.par < 0) { a.px = 960; a.py = 14 + a.str; } else { const [ex, ey] = this.end(a.par, a.side); a.px = ex + Math.sin(this.t * 0.9 + i) * 3; a.py = ey + a.str; } });
  }
  update(dt, outgoing) {
    if (outgoing) return; const g = this.game, inp = g.input, r = this.r, v = this.v, sfx = g.sfx; this.t += dt; const t = this.t;
    if (this.fin) { this.fin.t += dt; this.solve(dt); g.audio.muffle(clamp(this.fin.t / 6, 0, 0.6)); if (this.fin.t > 5.8 && !this.fin.done) { this.fin.done = true; const ok = g.director.handoff(18, { from17: true }); if (!ok) { g.save.complete(17); g.audio.muffle(0); g.director.end({ chapter: 17 }); } } return; }
    this.solve(dt); const mv = (inp.keys.has('KeyD') ? 1 : 0) - (inp.keys.has('KeyA') ? 1 : 0), up = inp.keys.has('KeyW') ? 1 : inp.keys.has('KeyS') ? -1 : 0; r.strain = Math.max(0, r.strain - dt * 3);
    if (r.st === 'arm') { const a = this.arms[r.i], hill = -Math.sin(a.th) * mv; if (mv) { r.f = mv; if (hill > 0.3) { r.s -= mv * 90 * dt; r.strain = 1; if (!this.said.steep) { this.said.steep = true; g.dialogue.say('vell', "Too steep! You're the heavy end. Press E — I'll go and sit on the other one."); } } else { r.s += mv * 300 * (1 - Math.max(0, hill) * 1.6) * dt; r.w += dt * 11; } } else if (Math.abs(a.th) > 0.44) r.s += Math.sign(a.th) * 130 * dt;
      r.s = clamp(r.s, -a.L, a.L); r.x = a.px + r.s * Math.cos(a.th); r.y = a.py + r.s * Math.sin(a.th); if (Math.abs(r.s) < 40) this.cp = r.i;
      const b = this.bells[r.i]; if (b && !b.got && Math.abs(r.s - b.side * a.L) < 46) { b.got = true; b.ring = 1; this.got++; sfx.play('pp.chime', { pitch: 0.9 + this.got * 0.2 }); sfx.play('px.pickup'); g.save.setCheckpoint(17, null); }
      if (inp.pressed.jump) { r.st = 'air'; r.vx = mv * 300; r.vy = -780; sfx.play('pp.jump'); }
      else if (up > 0 && Math.abs(r.s) < 44) { if (a.par < 0 && this.got < 3) { if (!this.said.bell) { this.said.bell = true; g.dialogue.say('vell', `The hook won't take us yet. Bells first — ${this.got} of 3. They hang at the far ends.`); } } else { r.st = 'rope'; r.u = 0; r.s = 0; sfx.play('pp.string'); } }
      else if (up < 0) { const c = this.arms.findIndex((q) => q.par === r.i && Math.abs(r.s - q.side * a.L) < 50); if (c >= 0) { r.st = 'rope'; r.i = c; r.u = 1; r.s = 0; sfx.play('pp.string'); } } }
    else if (r.st === 'rope') { const a = this.arms[r.i]; r.u = clamp(r.u + (up * 250 * dt) / a.str, 0, 1.001); r.x = a.px; r.y = a.py - r.u * a.str; if (up && Math.floor(t * 6) !== Math.floor((t - dt) * 6)) sfx.play('pp.step', { vol: 0.3, pitch: 1.5 }); if (r.u <= 0 && up < 0) { r.st = 'arm'; r.s = 0; } if (r.u >= 1) { if (a.par < 0) { this.fin = { t: 0 }; this.noPause = true; sfx.play('fx.rise'); sfx.play('fx.shimmer'); g.dialogue.clear(); g.dialogue.say([{ who: 'rin', text: 'The hook. And above the hook — a hand, holding the whole thing up.' }, { who: 'vell', text: "It always was. Every one of them was. Come on. I think it's time we met whoever keeps doing this." }]); } else { r.st = 'arm'; r.s = a.side * (this.arms[a.par].L - 6); r.i = a.par; } } }
    else { r.vy += 2400 * dt; const py = r.y; r.x += r.vx * dt; r.y += r.vy * dt; for (let i = 0; i < this.arms.length; i++) { const a = this.arms[i], dx = r.x - a.px, c = Math.cos(a.th); if (Math.abs(dx) > a.L * c) continue; const yl = a.py + dx * Math.tan(a.th); if (r.vy >= 0 && py <= yl + 8 && r.y >= yl) { r.st = 'arm'; r.i = i; r.s = dx / c; a.om += 0.5 * Math.sign(r.s || 1); sfx.play('pp.land'); break; } } if (r.y > 1200) this.respawn(); }
    if (inp.pressed.interact && r.st === 'arm') { if (v.on === r.i) { v.on = -1; sfx.play('ink.pop'); } else { v.on = r.i; v.s = -(Math.sign(r.s) || r.f) * this.arms[r.i].L * 0.93; sfx.play('ink.boing', { vol: 0.6 }); } }
    if (v.on >= 0 && r.st === 'arm' && v.on !== r.i && !this.said.left) { this.said.left = true; g.dialogue.say('vell', "Hey! I'm still sitting down here. E calls me back."); }
    const a = v.on >= 0 ? this.arms[v.on] : null, tx = a ? a.px + v.s * Math.cos(a.th) : r.x - r.f * 70, ty = a ? a.py + v.s * Math.sin(a.th) - 28 : r.y - 170 + Math.sin(t * 2.5) * 10; v.x = lerp(v.x, tx, Math.min(1, dt * 9)); v.y = lerp(v.y, ty, Math.min(1, dt * 9));
    for (const b of this.bells) if (b) b.ring = Math.max(0, b.ring - dt * 0.8);
    if (!this.said.w && t > 9 && r.i === 3 && r.st === 'arm') { this.said.w = true; g.dialogue.say('vell', 'The wire in the middle of each arm goes UP. Stand at the middle and press W. But ring the bell first — far end.'); }
  }
  shape(ctx, x, y, m, col, th, i) { const s = 26 + Math.sqrt(m) * 30, sw = -th * 0.6 + Math.sin(this.t * 1.1 + i) * 0.06; ctx.save(); ctx.translate(x, y); ctx.rotate(sw); ctx.strokeStyle = BLK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 46); ctx.stroke(); ctx.translate(0, 46 + s * 0.8); ctx.fillStyle = col; ctx.beginPath(); if (i % 3 === 0) ctx.ellipse(0, 0, s, s * 0.82, 0.3, 0, TAU); else if (i % 3 === 1) { ctx.moveTo(-s, -s * 0.5); ctx.quadraticCurveTo(0, -s * 1.2, s * 1.1, -s * 0.2); ctx.quadraticCurveTo(s * 0.2, s * 0.9, -s, -s * 0.5); } else { ctx.moveTo(0, -s); ctx.quadraticCurveTo(s * 1.2, -s * 0.2, s * 0.3, s); ctx.quadraticCurveTo(-s * 0.2, 0, 0, -s); } ctx.fill(); ctx.restore(); }
  mobile(ctx, shadow) {
    ctx.strokeStyle = shadow ? 'rgba(40,30,20,1)' : BLK; ctx.lineCap = 'round'; this.arms.forEach((a, i) => { const [lx, ly] = this.end(i, -1), [rx, ry] = this.end(i, 1), topY = a.par < 0 ? 14 : a.py - a.str;
      ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(a.px, a.py); ctx.lineTo(a.par < 0 ? 960 : this.end(a.par, a.side)[0], topY); ctx.stroke(); ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.quadraticCurveTo(a.px, a.py - 16, rx, ry); ctx.stroke(); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(a.px, a.py - 4, 9, 0, TAU); ctx.stroke();
      [[lx, ly, 0], [rx, ry, 1]].forEach(([x, y, e]) => { if (a.w[e]) this.shape(ctx, x, y, a.w[e], shadow ? 'rgba(40,30,20,1)' : a.col[e], a.th, i * 2 + e); }); });
  }
  render() {
    const g = this.game, ctx = fit(g, '#141218'), t = this.t, r = this.r, v = this.v, k = this.fin ? clamp(this.fin.t / 5.4, 0, 1) : 0;
    ctx.drawImage(this.wall, 0, 0); ctx.save(); if (k > 0) ctx.translate(0, k * k * 500);
    ctx.save(); ctx.globalAlpha = 0.09; ctx.translate(70, 46); this.mobile(ctx, true); ctx.restore(); this.mobile(ctx, false);
    // bells
    this.bells.forEach((b, i) => { if (!b) return; const [x, y] = this.end(i, b.side), a = Math.sin(t * 30) * b.ring * 0.5; ctx.save(); ctx.translate(x, y - 6); ctx.rotate(a); ctx.fillStyle = b.got ? '#b9b2a2' : '#d9a441'; ctx.strokeStyle = BLK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-14, -8); ctx.quadraticCurveTo(-14, -40, 0, -42); ctx.quadraticCurveTo(14, -40, 14, -8); ctx.lineTo(18, -4); ctx.lineTo(-18, -4); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(0, -46, 5, 0, TAU); ctx.stroke(); ctx.restore(); if (!b.got) { ctx.strokeStyle = 'rgba(217,164,65,0.5)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y - 26, 34 + Math.sin(t * 4) * 5, 0, TAU); ctx.stroke(); } });
    // Vell: a purple disc with an eye; Rin: flat cut shapes, no outlines
    ctx.fillStyle = '#8a4fc0'; ctx.beginPath(); ctx.arc(v.x, v.y, 26, 0, TAU); ctx.fill(); ctx.fillStyle = '#f4f6ff'; ctx.beginPath(); ctx.arc(v.x + 7, v.y - 4, 9, 0, TAU); ctx.fill(); ctx.fillStyle = BLK; ctx.beginPath(); ctx.arc(v.x + 9, v.y - 4, 4, 0, TAU); ctx.fill();
    { const a = r.st === 'arm' ? this.arms[r.i] : null, sw = r.st === 'arm' ? Math.sin(r.w) : r.st === 'rope' ? Math.sin(t * 9) * 0.6 : 0.7; ctx.save(); ctx.translate(r.x + (r.strain ? Math.sin(t * 40) * 3 : 0), r.y); if (a) ctx.rotate(a.th * 0.5); ctx.scale(r.f, 1); ctx.fillStyle = '#2a3a6b'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 9 - 7, -46); ctx.lineTo(s * 9 + 7, -46); ctx.lineTo(s * 9 + s * sw * 20 + 6, 0); ctx.lineTo(s * 9 + s * sw * 20 - 6, 0); ctx.fill(); } ctx.fillStyle = '#ff8a2a'; ctx.beginPath(); ctx.moveTo(-8, -100); ctx.lineTo(-66, -112 + Math.sin(t * 6) * 8); ctx.lineTo(-60, -90); ctx.lineTo(-8, -86); ctx.fill(); ctx.fillStyle = '#1fb8ac'; ctx.beginPath(); ctx.moveTo(-20, -104); ctx.lineTo(20, -104); ctx.lineTo(25, -44); ctx.lineTo(-25, -44); ctx.fill(); if (r.st === 'rope') { ctx.fillRect(-4, -150, 8, 50); } ctx.fillStyle = '#ffd9b3'; ctx.beginPath(); ctx.arc(2, -124, 20, 0, TAU); ctx.fill(); ctx.fillStyle = '#f4f6ff'; ctx.beginPath(); ctx.moveTo(-20, -128); ctx.lineTo(-28, -158); ctx.lineTo(-8, -144); ctx.lineTo(2, -166); ctx.lineTo(10, -144); ctx.lineTo(26, -154); ctx.lineTo(20, -128); ctx.fill(); ctx.fillStyle = '#ff8a2a'; ctx.fillRect(-6, -132, 28, 9); ctx.restore(); }
    ctx.restore();
    if (k > 0) { // the hand that was holding the wire all along
      ctx.save(); ctx.translate(960, -620 + k * 700); ctx.fillStyle = '#e6ab8a'; ctx.strokeStyle = BLK; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(-210, -400, 420, 520, 120); ctx.fill(); ctx.stroke(); for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.roundRect(-196 + i * 100, 60, 88, 250 + (i === 1 || i === 2 ? 40 : 0) - Math.abs(i - 1.5) * 16, 44); ctx.fill(); ctx.stroke(); } ctx.beginPath(); ctx.roundRect(-290, -60, 110, 260, 55); ctx.fill(); ctx.stroke(); ctx.restore(); if (k > 0.8) { ctx.fillStyle = `rgba(246,242,234,${(k - 0.8) * 5})`; ctx.fillRect(0, 0, VW, VH); } }
    if (!this.fin) { const a = r.st === 'arm' ? this.arms[r.i] : null, mid = a && Math.abs(r.s) < 44; objective(ctx, this.got < 3 ? `RING THE BELLS — ${this.got} / 3` : 'CLIMB TO THE HOOK', mid ? 'W — climb the wire up from the middle of this arm' : v.on >= 0 ? 'Vell is sitting as a counterweight.  E calls Vell back.' : 'E — send Vell to the far end.  Walk to the middle of an arm to climb.', { bg: 'rgba(23,21,26,0.86)', accent: RED }); }
    titleCard(ctx, t, 17, 'COUNTERWEIGHT', BLK, RED); introSnap(ctx, this.snap, t, 2); dlg(ctx, g, { bg: 'rgba(23,21,26,0.92)', line: YEL });
  }
}
