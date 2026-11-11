// CHAPTER 11 — LEAD & LIGHT. A rose window of leaded glass, and Rin a figure
// of light walking its rim. Light is thrown outward from the heart of the
// window in time with the organ: step round the rim to catch it and the panes
// wake, one by one. Black shards crack what you have lit. Three windows.
import { clamp, lerp, hash2, TAU, makeCanvas } from '../core/util.js';
import { VW, VH, fit, dlg, titleCard, objective, introSnap } from '../fx/ui2d.js';

const N = 12, CX = 960, CY = 560, RR = [84, 200, 318, 430, 478], RIM = 454, LEAD = '#0b0a0d';
const PAL = [['#d23a44', '#2f6fd0', '#f0b030', '#2fa36a', '#8a4fc0', '#e8642a'], ['#ffd166', '#2fd3c6', '#f4f6ff', '#3f8fe0', '#ff9a3c', '#9be84f'], ['#8a2be2', '#e83a6a', '#2b3fb0', '#ff7a3c', '#c06fc0', '#1f9a8a']];
const MOV = [{ name: 'WINDOW I — DAWN', goal: 14, dur: 4 }, { name: 'WINDOW II — NOON', goal: 22, dur: 3 }, { name: 'WINDOW III — DUSK', goal: 30, dur: 2.5 }];
const BPM = 96, BEAT = 60 / BPM;
const SONG = (() => { const bars = {}, ch = [['D3+F3+A3', 'D2', 'D5 . A5 . F5 . A5 . D6 . A5 . F5 . A5 .'], ['A#2+D3+F3', 'A#1', 'D5 . A#5 . F5 . A#5 . D6 . A#5 . F5 . A#5 .'], ['F3+A3+C4', 'F2', 'C5 . A5 . F5 . A5 . C6 . A5 . F5 . A5 .'], ['C3+E3+G3', 'C2', 'C5 . G5 . E5 . G5 . C6 . G5 . E5 . G5 .']], mel = ['A5 - - - F5 - - - E5 - D5 - - - - -', 'F5 - - - D5 - - - C5 - D5 - - - - -', 'C6 - - - A5 - - - G5 - F5 - - - - -', 'G5 - - - E5 - - - D5 - E5 - C5 - - -'];
  const A = ch.map(([c, b, a], i) => { bars['a' + i] = { org: `${c} - - - - - - - - - - - - - - -`, arp: a, bass: `${b} . . . ${b} . . . ${b} . . . ${b} . ${b} .`, mel: mel[i] }; return 'a' + i; });
  return { bpm: BPM, gain: 1, reverb: 0.55, start: 'A', tracks: { org: { inst: 'organ', vol: 0.5, send: 0.6 }, arp: { inst: 'celesta', vol: 0.55, pan: 0.2, send: 0.5 }, bass: { inst: 'pizz', vol: 0.8 }, mel: { inst: 'flute', vol: 0.5, pan: -0.2, send: 0.6, layer: 1 } }, bars, sections: { A }, next: { A: 'A' } }; })();
export { SONG as SONG_CH11 };
const la = (i) => (i * TAU) / N - Math.PI / 2;
const sector = (ctx, r0, r1, i, pad = 0) => { const a0 = la(i) - Math.PI / N + pad, a1 = la(i) + Math.PI / N - pad; ctx.beginPath(); ctx.arc(CX, CY, r1, a0, a1); ctx.arc(CX, CY, r0, a1, a0, true); ctx.closePath(); };

export default class Chapter11 {
  constructor(game) { this.game = game; this.id = 11; this.compositesOutgoing = true; }
  async load() {
    const c = (this.bg = makeCanvas(VW, VH)), x = c.getContext('2d'); x.fillStyle = '#100e18'; x.fillRect(0, 0, VW, VH);
    for (let j = 0; j < 20; j++) for (let i = -1; i < 17; i++) { const bx = i * 124 + (j % 2) * 62, by = j * 56, h = hash2(i, j); x.fillStyle = `rgb(${26 + h * 16},${24 + h * 14},${38 + h * 18})`; x.fillRect(bx + 2, by + 2, 120, 52); x.fillStyle = 'rgba(255,255,255,0.03)'; x.fillRect(bx + 2, by + 2, 120, 3); }
    x.fillStyle = '#0a0910'; x.fillRect(0, 980, VW, 100); for (let i = 0; i < 16; i++) { x.fillStyle = i % 2 ? '#15131d' : '#1b1826'; x.beginPath(); x.moveTo(i * 120, 980); x.lineTo(i * 120 + 120, 980); x.lineTo(960 + (i - 7) * 190, 1080); x.lineTo(960 + (i - 8) * 190, 1080); x.fill(); }
    x.strokeStyle = '#07060b'; x.lineWidth = 46; x.beginPath(); x.arc(CX, CY - 30, 452, 0, TAU); x.stroke(); x.strokeStyle = '#2c2838'; x.lineWidth = 8; x.beginPath(); x.arc(CX, CY - 30, 476, 0, TAU); x.stroke(); x.beginPath(); x.arc(CX, CY - 30, 430, 0, TAU); x.stroke();
    for (const s of [-1, 1]) { const px = CX + s * 760; x.fillStyle = '#0c0b12'; x.fillRect(px - 60, 0, 120, 980); x.fillStyle = '#1e1b29'; x.fillRect(px - 44, 0, 14, 980); x.fillRect(px + 30, 0, 14, 980); x.fillRect(px - 76, 900, 152, 80); }
    const v = x.createRadialGradient(CX, CY, 420, CX, CY, 1150); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.75)'); x.fillStyle = v; x.fillRect(0, 0, VW, VH);
    const n = (this.grain = makeCanvas(512, 512)), y = n.getContext('2d'); for (let i = 0; i < 2600; i++) { y.fillStyle = `rgba(${hash2(i, 1) > 0.5 ? '255,255,255' : '0,0,0'},${hash2(i, 2) * 0.16})`; y.beginPath(); y.ellipse(hash2(i, 3) * 512, hash2(i, 4) * 512, 1 + hash2(i, 5) * 9, 1 + hash2(i, 6) * 3, hash2(i, 7) * 3, 0, TAU); y.fill(); }
  }
  controlsHelp() { return '<b>A/D</b> step round the window · <b>SPACE</b> jump to the far side<br>Stand where the gold light lands. Step away from the black shards.'; }
  start({ handoff } = {}) {
    const g = this.game; this.snap = handoff ? g.snapshot() : null; g.show3d(false); g.c2d.style.imageRendering = ''; g.c2d.style.opacity = '1'; if (handoff) g.director.releaseOutgoing();
    this.t = 0; this.fin = null; this.noPause = false; this.lane = 6; this.ang = la(6); this.hp = 5; this.shake = 0; this.rep = 0; this.parts = []; this.glow = [0, 1, 2].map(() => new Float32Array(N)); this.setMov(0); this.bt = 3.2;
    g.audio.muffle(0); g.music.play(SONG, { intensity: 1, fade: 1 });
    g.dialogue.say([{ who: 'vell', text: 'Stained glass. Somebody cut the light into pieces and soldered it back together.' }, { who: 'rin', text: 'I can see through my own hands.' }, { who: 'vell', text: 'The window is asleep. Catch the light it throws and the panes wake up. A and D — walk the rim.' }]);
    g.director.preload(12);
  }
  setMov(i) { this.mov = i; this.lit = [0, 1, 2].map(() => new Uint8Array(N)); this.got = 0; this.notes = []; this.h = 0; this.gl = this.lane; this.dir = 1; this.wi = 0; this.sc = 0; this.cel = 0; this.bt = 1.5; }
  stop() {}
  respawn() { this.hp = 5; this.setMov(this.mov); }
  note(lane, bad = 0) { this.notes.push({ lane: ((lane % N) + N) % N, u: 0, bad, dur: MOV[this.mov].dur * BEAT }); }
  tick() {
    const h = this.h++, m = this.mov, walk = () => (this.gl = (this.gl + [1, -1, 2, -2, 1, 1, -1][this.wi++ % 7] + N) % N), sweep = () => { if (++this.sc % 6 === 0) this.dir *= -1; return (this.gl = (this.gl + this.dir + N) % N); };
    if (m === 0) { if (h % 4 === 0) this.note(walk()); if (h > 24 && h % 16 === 10) this.note(this.lane, 1); }
    else if (m === 1) { if (h % 2 === 0) this.note(sweep()); if (h % 6 === 3) this.note(this.lane, 1); if (h % 32 === 30) this.note((this.gl = (this.gl + 6) % N)); }
    else { const ph = h % 16; if (ph < 8) this.note(sweep()); else if (ph === 10) this.note(this.lane, 1); else if (ph === 12) this.note(this.lane + 1, 1); else if (ph === 14) this.note((this.gl = (this.gl + 6) % N)); }
  }
  update(dt, outgoing) {
    if (outgoing) return; const g = this.game, inp = g.input, M = MOV[this.mov]; this.t += dt; this.shake = Math.max(0, this.shake - dt * 2);
    for (let k = 0; k < 3; k++) for (let i = 0; i < N; i++) this.glow[k][i] = lerp(this.glow[k][i], this.cel > 0 || this.fin ? 0.6 + 0.4 * Math.sin(this.t * 10 + i + k * 2) : this.lit[k][i], Math.min(1, dt * 6));
    for (const p of this.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 500 * dt; p.t -= dt; } this.parts = this.parts.filter((p) => p.t > 0);
    if (this.fin) { this.fin.t += dt; g.audio.muffle(clamp(this.fin.t / 6, 0, 0.6)); if (this.fin.t > 6 && !this.fin.done) { this.fin.done = true; const ok = g.director.handoff(12, { from11: true }); if (!ok) { g.save.complete(11); g.audio.muffle(0); g.director.end({ chapter: 11 }); } } return; }
    const dx = (inp.pressed.right ? 1 : 0) - (inp.pressed.left ? 1 : 0), hold = (inp.down.right ? 1 : 0) - (inp.down.left ? 1 : 0); let step = dx; if (dx) this.rep = 0.2; else if (hold) { this.rep -= dt; if (this.rep <= 0) { step = hold; this.rep = 0.085; } }
    if (step) { this.lane = (this.lane + step + N) % N; g.sfx.play('pp.step', { vol: 0.4, pitch: 1.2 }); } if (inp.pressed.jump) { this.lane = (this.lane + 6) % N; g.sfx.play('fx.whoosh', { vol: 0.5, pitch: 1.4 }); }
    let d = la(this.lane) - this.ang; d = Math.atan2(Math.sin(d), Math.cos(d)); this.ang += d * Math.min(1, dt * 22);
    if (this.cel > 0) { this.cel -= dt; if (this.cel <= 0) { if (this.mov < 2) { this.setMov(this.mov + 1); g.dialogue.say('vell', this.mov === 1 ? 'A new window. Faster — and when the light jumps to the far side, so do you. SPACE.' : 'Last one. It comes in runs now. Walk WITH it.'); } else { this.fin = { t: 0 }; this.noPause = true; g.sfx.play('px.crumble'); g.sfx.play('fx.rise'); g.dialogue.clear(); g.dialogue.say([{ who: 'rin', text: 'Every pane awake. It is... humming.' }, { who: 'vell', text: "Too much light for the lead! It's coming apart — into THREADS?" }]); } } return; }
    this.bt -= dt; if (this.bt <= 0) { this.bt += BEAT / 2; this.tick(); }
    for (const n of this.notes) { n.u += dt / n.dur; const here = n.lane === this.lane;
      if (!n.bad && !n.hit && n.u > 0.95 && n.u < 1.09 && here) { n.hit = true; this.got++; let k = [0, 1, 2].find((q) => !this.lit[q][n.lane]), i = n.lane; if (k === undefined) for (let q = 0; q < 36 && k === undefined; q++) { const kk = q % 3, ii = (n.lane + ((q / 3) | 0) + 1) % N; if (!this.lit[kk][ii]) { k = kk; i = ii; } } if (k !== undefined) this.lit[k][i] = 1; g.sfx.play('pp.chime', { pitch: [1, 1.125, 1.25, 1.5, 1.68][this.got % 5], vol: 0.7 }); for (let j = 0; j < 10; j++) this.parts.push({ x: CX + Math.cos(la(n.lane)) * RIM, y: CY + Math.sin(la(n.lane)) * RIM, vx: (Math.random() - 0.5) * 500, vy: -Math.random() * 500, t: 0.6, c: '#ffe9a8' }); }
      if (n.bad && !n.hit && n.u > 0.98 && n.u < 1.04 && here) { n.hit = true; this.shake = 1; g.sfx.play('px.hurt'); g.sfx.play('px.crumble', { vol: 0.5 }); if (!g.easy) this.hp--; if (this.got > 0) { this.got--; const all = []; for (let k = 0; k < 3; k++) for (let i = 0; i < N; i++) if (this.lit[k][i]) all.push([k, i]); const q = all[(Math.random() * all.length) | 0]; if (q) this.lit[q[0]][q[1]] = 0; } if (this.hp <= 0) { g.save.data.stats.deaths++; g.dialogue.say('vell', 'It cracked right through. Again — step OFF the lane the black one is riding.'); this.respawn(); return; } } }
    this.notes = this.notes.filter((n) => n.u < 1.12 && !(n.hit && !n.bad));
    if (this.got >= M.goal) { this.cel = 2.6; this.notes = []; this.hp = 5; g.sfx.play('fx.shimmer'); g.sfx.play('pp.chime', { pitch: 2 }); g.save.setCheckpoint(11, null); }
  }
  render() {
    const g = this.game, ctx = fit(g, '#000'), t = this.t, P = PAL[this.mov], M = MOV[this.mov], k = this.fin ? clamp(this.fin.t / 5.5, 0, 1) : 0, sh = this.shake * 14;
    ctx.drawImage(this.bg, 0, 0); ctx.save(); ctx.translate((Math.random() - 0.5) * sh + CX, (Math.random() - 0.5) * sh + CY - 30); ctx.scale(0.88, 0.88); ctx.translate(-CX, -CY);
    // light thrown onto the floor by every lit outer pane
    ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < N; i++) for (let q = 1; q < 3; q++) { const v = this.glow[q][i]; if (v < 0.05) continue; const a = la(i), r = (RR[q] + RR[q + 1]) / 2, px = CX + Math.cos(a) * r, py = CY + Math.sin(a) * r; ctx.fillStyle = P[(i + q * 2) % 6]; ctx.globalAlpha = 0.05 * v; ctx.beginPath(); ctx.moveTo(px - 40, py); ctx.lineTo(px + 40, py); ctx.lineTo(px - 250 + 110, 1080); ctx.lineTo(px - 250 - 110, 1080); ctx.fill(); } ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.fillStyle = '#050508'; ctx.beginPath(); ctx.arc(CX, CY, RR[4] + 6, 0, TAU); ctx.fill();
    for (let q = 0; q < 3; q++) for (let i = 0; i < N; i++) { const v = this.glow[q][i], col = P[(i + q * 2) % 6], a = la(i), fly = k > 0 ? k * k * (500 + hash2(i, q) * 900) : 0; ctx.save(); if (fly) { ctx.translate(Math.cos(a) * fly, Math.sin(a) * fly + k * k * 300); ctx.translate(CX + Math.cos(a) * RR[q + 1], CY + Math.sin(a) * RR[q + 1]); ctx.rotate(k * (hash2(i, q + 5) - 0.5) * 6); ctx.translate(-CX - Math.cos(a) * RR[q + 1], -CY - Math.sin(a) * RR[q + 1]); }
      sector(ctx, RR[q], RR[q + 1], i); ctx.fillStyle = col; ctx.globalAlpha = 0.2 + 0.8 * v; if (v > 0.3) { ctx.shadowColor = col; ctx.shadowBlur = 34 * v; } ctx.fill(); ctx.shadowBlur = 0;
      const rm = (RR[q] + RR[q + 1]) / 2, mx = CX + Math.cos(a) * rm, my = CY + Math.sin(a) * rm, s = (RR[q + 1] - RR[q]) * 0.3; ctx.globalAlpha = 0.25 + 0.6 * v; ctx.fillStyle = '#fff'; ctx.beginPath(); if (q === 1) { ctx.moveTo(mx + Math.cos(a) * s, my + Math.sin(a) * s); ctx.lineTo(mx - Math.sin(a) * s * 0.7, my + Math.cos(a) * s * 0.7); ctx.lineTo(mx - Math.cos(a) * s, my - Math.sin(a) * s); ctx.lineTo(mx + Math.sin(a) * s * 0.7, my - Math.cos(a) * s * 0.7); } else ctx.ellipse(mx, my, s * (q ? 0.7 : 0.9), s * (q ? 0.7 : 0.5), a, 0, TAU); ctx.closePath(); ctx.globalAlpha = (0.12 + 0.3 * v); ctx.fill(); ctx.globalAlpha = 1; ctx.strokeStyle = LEAD; ctx.lineWidth = 5; ctx.stroke();
      sector(ctx, RR[q], RR[q + 1], i); ctx.lineWidth = 10; ctx.stroke(); ctx.strokeStyle = 'rgba(150,150,175,0.22)'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); }
    if (!this.fin) { ctx.save(); ctx.beginPath(); ctx.arc(CX, CY, RR[3], 0, TAU); ctx.clip(); ctx.globalAlpha = 0.5; ctx.fillStyle = ctx.createPattern(this.grain, 'repeat'); ctx.fillRect(CX - 440, CY - 440, 880, 880); ctx.restore(); }
    // rim: where the light lands, and where it will crack
    for (let i = 0; i < N; i++) { sector(ctx, RR[3], RR[4], i, 0.012); ctx.fillStyle = '#16141f'; ctx.fill(); ctx.strokeStyle = LEAD; ctx.lineWidth = 6; ctx.stroke(); }
    for (const n of this.notes) if (n.u > 0.45 && !n.hit) { sector(ctx, RR[3], RR[4], n.lane, 0.012); ctx.fillStyle = n.bad ? '#c2362f' : '#ffd166'; ctx.globalAlpha = (n.u - 0.45) * (n.bad ? 0.9 : 0.6) * (n.bad ? 0.6 + 0.4 * Math.sin(t * 30) : 1); ctx.fill(); ctx.globalAlpha = 1; }
    // hub rosette fills with progress
    { const pr = clamp(this.got / M.goal, 0, 1); ctx.fillStyle = '#0d0c14'; ctx.beginPath(); ctx.arc(CX, CY, RR[0], 0, TAU); ctx.fill(); for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + t * 0.2; ctx.beginPath(); ctx.ellipse(CX + Math.cos(a) * 36, CY + Math.sin(a) * 36, 34, 17, a, 0, TAU); ctx.fillStyle = '#ffd166'; ctx.globalAlpha = i / 6 < pr ? 1 : 0.15; ctx.shadowColor = '#ffd166'; ctx.shadowBlur = i / 6 < pr ? 24 : 0; ctx.fill(); ctx.shadowBlur = 0; ctx.globalAlpha = 1; ctx.strokeStyle = LEAD; ctx.lineWidth = 5; ctx.stroke(); } ctx.fillStyle = '#c06fc0'; ctx.shadowColor = '#c06fc0'; ctx.shadowBlur = 20; ctx.save(); ctx.translate(CX, CY); ctx.rotate(t * 1.5); ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(15, 0); ctx.lineTo(0, 22); ctx.lineTo(-15, 0); ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0; ctx.stroke(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(3, -3, 5, 0, TAU); ctx.fill(); ctx.restore();
      ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(CX, CY, 500, -Math.PI / 2, -Math.PI / 2 + pr * TAU + 0.001); ctx.stroke(); ctx.lineCap = 'butt'; }
    // notes
    for (const n of this.notes) { if (n.hit) continue; const a = la(n.lane), r = lerp(RR[0], RIM, Math.min(1.1, n.u)), x = CX + Math.cos(a) * r, y = CY + Math.sin(a) * r, s = 14 + n.u * 16; ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      if (n.bad) { ctx.fillStyle = '#060509'; ctx.strokeStyle = '#e8483c'; ctx.lineWidth = 3; ctx.shadowColor = '#c2362f'; ctx.shadowBlur = 18; ctx.beginPath(); ctx.moveTo(s * 1.5, 0); ctx.lineTo(s * 0.2, s * 0.8); ctx.lineTo(-s * 0.4, s * 0.3); ctx.lineTo(-s * 1.2, s * 0.6); ctx.lineTo(-s * 0.6, -s * 0.1); ctx.lineTo(-s, -s * 0.7); ctx.lineTo(s * 0.3, -s * 0.5); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      else { const gr = ctx.createLinearGradient(-s * 5, 0, 0, 0); gr.addColorStop(0, 'rgba(255,220,120,0)'); gr.addColorStop(1, 'rgba(255,230,150,0.7)'); ctx.fillStyle = gr; ctx.fillRect(-s * 5, -4, s * 5, 8); ctx.fillStyle = '#fff6cf'; ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 26; ctx.rotate(t * 3); ctx.beginPath(); for (let i = 0; i < 8; i++) { const rr = i % 2 ? s * 0.42 : s; ctx.lineTo(Math.cos(i * TAU / 8) * rr, Math.sin(i * TAU / 8) * rr); } ctx.closePath(); ctx.fill(); } ctx.restore(); }
    // Rin: a small leaded figure of light on the rim
    if (k < 0.5) { ctx.save(); ctx.translate(CX + Math.cos(this.ang) * RIM, CY + Math.sin(this.ang) * RIM); ctx.rotate(this.ang + Math.PI / 2); ctx.lineJoin = 'round'; ctx.strokeStyle = LEAD; ctx.lineWidth = 4; ctx.shadowColor = '#2fd3c6'; ctx.shadowBlur = 22; const pane = (c, pts) => { ctx.fillStyle = c; ctx.beginPath(); pts.forEach(([x, y]) => ctx.lineTo(x, y)); ctx.closePath(); ctx.fill(); ctx.stroke(); };
      pane('#2a3a6b', [[-11, 0], [-2, 0], [-3, -22], [-12, -22]]); pane('#2a3a6b', [[2, 0], [11, 0], [12, -22], [3, -22]]); pane('#2fd3c6', [[-15, -22], [15, -22], [11, -56], [-11, -56]]); pane('#ff9a3c', [[-12, -56], [12, -56], [26 + Math.sin(t * 6) * 4, -44], [8, -48]]); ctx.fillStyle = '#ffe6c4'; ctx.beginPath(); ctx.arc(0, -70, 14, 0, TAU); ctx.fill(); ctx.stroke(); pane('#f4f6ff', [[-14, -74], [-22, -92], [-8, -84], [-2, -100], [5, -84], [18, -94], [14, -74]]); ctx.shadowBlur = 0; ctx.fillStyle = '#ff9a3c'; ctx.fillRect(-9, -74, 18, 5); ctx.restore(); }
    for (const p of this.parts) { ctx.globalAlpha = Math.min(1, p.t * 2); ctx.fillStyle = p.c; ctx.fillRect(p.x - 4, p.y - 4, 8, 8); } ctx.globalAlpha = 1; ctx.restore();
    if (k > 0) { // the lead lets go: strands of wool run across the dark
      const C = ['#2fd3c6', '#ff9a3c', '#f0b030', '#c06fc0', '#e8e0cc', '#d23a44']; ctx.lineCap = 'round'; for (let i = 0; i < 46; i++) { const u = clamp(k * 1.8 - hash2(i, 1) * 0.8, 0, 1); if (u <= 0) continue; const y0 = hash2(i, 2) * VH; ctx.strokeStyle = C[i % 6]; ctx.lineWidth = 9 + hash2(i, 3) * 12; ctx.beginPath(); for (let x = -40; x <= VW * u + 40; x += 40) ctx.lineTo(x, y0 + Math.sin(x * 0.006 + i + t) * 50 + Math.sin(x * 0.03 + i) * 8); ctx.stroke(); ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 2; ctx.setLineDash([6, 9]); ctx.stroke(); ctx.setLineDash([]); } ctx.lineCap = 'butt'; }
    if (!this.fin) { objective(ctx, this.cel > 0 ? 'THE WINDOW WAKES' : M.name, this.cel > 0 ? '' : `Catch the gold light  ${this.got} / ${M.goal}   ·   A / D walk the rim   ·   SPACE far side`, { accent: '#ffd166' }); for (let i = 0; i < 5; i++) { ctx.fillStyle = i < this.hp ? '#ffd166' : '#2c2838'; ctx.save(); ctx.translate(1700 + i * 40, 70); ctx.rotate(Math.PI / 4); ctx.fillRect(-11, -11, 22, 22); ctx.restore(); } }
    titleCard(ctx, t, 11, 'LEAD & LIGHT', '#fff', '#ffd166'); introSnap(ctx, this.snap, t, 2.2); dlg(ctx, g, { bg: 'rgba(10,9,16,0.9)', line: '#ffd166' });
  }
}
