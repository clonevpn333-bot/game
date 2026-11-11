// CHAPTER 15 — PERSISTENCE. A pencil flipbook, twelve drawings to a scene,
// and a thumb on the corner of the pad. Time does not pass here; you turn it.
// Q and E flip back and forward. The drawings move from page to page — a
// bridge lowers, a balloon rises, a bird crosses — but Rin is not one of the
// drawings: when you flip, the world moves and he stays where he is standing.
import { clamp, lerp, hash2, TAU, makeCanvas } from '../core/util.js';
import { VW, VH, fit, dlg, titleCard, objective, introSnap } from '../fx/ui2d.js';

const G = 'rgba(38,38,46,0.88)', BLUE = 'rgba(80,110,190,0.9)', NF = 12;
const SONG = (() => { const bars = {}, ch = [['C3', 'E4+G4', 'G5 . . E5 . . C5 . . E5 . .'], ['A2', 'C4+E4', 'A5 . . E5 . . C5 . . . . .'], ['F2', 'A3+C4', 'F5 . . A5 . . C6 . . A5 . .'], ['G2', 'B3+D4', 'B5 . . G5 . . D5 . . . . .']];
  const A = ch.map(([b, c, m], i) => { bars['a' + i] = { bass: `${b} . . . . . . . . . . .`, pizz: `. . . ${c} . . ${c} . . . . .`, mel: m }; return 'a' + i; });
  return { bpm: 112, gain: 1, reverb: 0.25, start: 'A', tracks: { bass: { inst: 'upright', vol: 0.8 }, pizz: { inst: 'pizz', vol: 0.6, pan: -0.2 }, mel: { inst: 'celesta', vol: 0.6, pan: 0.2, send: 0.4 } }, bars, sections: { A }, next: { A: 'A' } }; })();
export { SONG as SONG_CH15 };
const jit = (i, s) => hash2(i * 3.1 + s, s * 1.7 + i) - 0.5;
function pl(c, pts, s, w = 3.2, col = G, close = false) { for (const [o, a] of [[0, 1], [1, 0.35]]) { c.strokeStyle = col; c.globalAlpha *= a; c.lineWidth = w * (o ? 0.6 : 1); c.lineJoin = c.lineCap = 'round'; c.beginPath(); pts.forEach(([x, y], i) => c.lineTo(x + jit(i + o * 9, s) * 4, y + jit(i + o * 9 + 40, s) * 4)); if (close) c.closePath(); c.stroke(); if (o) c.globalAlpha /= 0.35; } }
const ring = (c, x, y, r, s, w, col, ry = r) => { const p = []; for (let i = 0; i <= 15; i++) { const a = (i / 15) * TAU * 1.05; p.push([x + Math.cos(a) * r, y + Math.sin(a) * ry]); } pl(c, p, s, w, col); };
function hatch(c, x, y, w, h, s, col = G, step = 13, a = 0.5) { c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip(); c.strokeStyle = col; c.lineWidth = 1.7; c.globalAlpha *= a; c.beginPath(); for (let i = -h; i < w; i += step) { c.moveTo(x + i + jit(i, s) * 5, y + h); c.lineTo(x + i + h + jit(i + 5, s) * 5, y); } c.stroke(); c.restore(); }
const BR = [-1.4, -1.4, -1.4, -1.05, -0.7, -0.35, 0, 0, -0.35, -0.7, -1.05, -1.4], at = (A, f) => { const i = Math.min(NF - 2, Math.floor(f)); return lerp(A[i], A[i + 1], f - i); };
const bird = (f) => { const u = f / 11; return [lerp(300, 1500, u), 760 - Math.sin(u * Math.PI) * 300 - u * 240]; };
// each scene: fixed ground, things that are drawn differently on every page, and an exit to the right
const SC = [
  { tip: ['LOWER THE BRIDGE', 'E flips forward, Q flips back. Hold to riffle. Find the page where the bridge is down.'], gnd: [[0, 800, 600, 300], [1300, 800, 640, 300]], start: [140, 800],
    dyn: (f) => (Math.abs(at(BR, f)) < 0.16 ? [[600, 800, 700, 22]] : [[0, -999, 0, 0]]), wall: () => [],
    draw(c, f, s, col) { const a = at(BR, f), ex = 600 + Math.cos(a) * 700, ey = 800 + Math.sin(a) * 700; pl(c, [[600, 800], [ex, ey]], s, 9, col); pl(c, [[600, 780], [ex, ey - 20]], s + 1, 3, col); for (let i = 1; i < 7; i++) { const u = i / 7; pl(c, [[600 + (ex - 600) * u, 800 + (ey - 800) * u], [600 + (ex - 600) * u, 780 + (ey - 800) * u]], s + i, 2.5, col); } pl(c, [[560, 560], [ex, ey - 10]], s + 2, 2, col); pl(c, [[560, 800], [560, 540], [600, 540]], s + 3, 6, col); } },
  { tip: ['RIDE THE BALLOON', 'Stand in the basket, then flip forward. The drawing moves. You go with it.'], gnd: [[0, 860, 790, 240], [1300, 380, 640, 720]], start: [140, 860],
    dyn: (f) => [[lerp(790, 1080, f / 11), lerp(860, 380, f / 11), 200, 24]], wall: () => [],
    draw(c, f, s, col) { const x = lerp(790, 1080, f / 11) + 100, y = lerp(860, 380, f / 11); ring(c, x, y - 290, 120, s, 4, col, 140); pl(c, [[x - 100, y], [x + 100, y], [x + 86, y + 70], [x - 86, y + 70]], s + 1, 4, col, true); hatch(c, x - 96, y + 4, 192, 64, s, col, 11); for (const o of [-90, -30, 30, 90]) pl(c, [[x + o, y], [x + o * 0.9, y - 170]], s + o, 2, col); if (col === G) hatch(c, x - 120, y - 430, 240, 280, s, 'rgba(210,70,60,0.9)', 9, 0.55); } },
  { tip: ['THE BIRD, THEN THE BOULDER', 'Ride the bird across. If something is in your way afterwards — it was not always there.'], gnd: [[0, 860, 520, 240], [1560, 520, 380, 600]], start: [140, 860],
    dyn: (f) => { const [x, y] = bird(f); return [[x - 95, y, 190, 22]]; }, wall: (f) => (f >= 5.5 ? [[1730, 320, 130, 200]] : []),
    draw(c, f, s, col) { const [x, y] = bird(f), up = Math.round(f) % 2; ring(c, x, y + 26, 96, s, 4, col, 30); ring(c, x + 104, y + 4, 26, s + 1, 4, col); pl(c, [[x + 128, y + 2], [x + 162, y + 10], [x + 128, y + 16]], s + 2, 3.5, col); pl(c, [[x - 30, y + 14], [x - 10, y + (up ? -110 : 110)], [x + 60, y + (up ? -60 : 80)], [x + 40, y + 16]], s + 3, 4, col); pl(c, [[x - 96, y + 24], [x - 150, y + 6], [x - 140, y + 40], [x - 96, y + 34]], s + 4, 3.5, col); if (col === G) { c.fillStyle = G; c.beginPath(); c.arc(x + 112, y, 4, 0, TAU); c.fill(); }
      const bx = f >= 5.5 ? 1795 : 1795 - (5.5 - Math.min(5.5, f)) * 22, by = f >= 5.5 ? 420 : 420 - Math.min(1, 5.5 - f) * 290 - (5.5 - f) * 6; ring(c, bx, by, 100, s + 6, 5, col); if (col === G) hatch(c, bx - 72, by - 72, 144, 144, s, G, 9, 0.6); pl(c, [[1600, 232], [1900, 250]], 5, 6, col); } },
];

export default class Chapter15 {
  constructor(game) { this.game = game; this.id = 15; this.compositesOutgoing = true; }
  async load() { const p = (this.paper = makeCanvas(VW, VH)), x = p.getContext('2d'); x.fillStyle = '#f5f2e9'; x.fillRect(0, 0, VW, VH); for (let i = 0; i < 1500; i++) { x.fillStyle = `rgba(90,100,130,${hash2(i, 2) * 0.05})`; x.beginPath(); x.ellipse(hash2(i, 3) * VW, hash2(i, 4) * VH, 4 + hash2(i, 5) * 40, 2 + hash2(i, 6) * 8, hash2(i, 7) * 3, 0, TAU); x.fill(); } for (let i = 0; i < 9; i++) { x.strokeStyle = `rgba(60,60,70,${0.28 - i * 0.025})`; x.lineWidth = 2; x.beginPath(); x.moveTo(40 + i * 3, VH - 8 - i * 5); x.lineTo(VW - 8 - i * 5, VH - 8 - i * 5); x.lineTo(VW - 8 - i * 5, 40 + i * 3); x.stroke(); } for (const hx of [760, 1160]) { x.fillStyle = '#1c1a22'; x.beginPath(); x.arc(hx, 34, 15, 0, TAU); x.fill(); } }
  controlsHelp() { return '<b>A/D</b> walk · <b>SPACE</b> jump · <b>Q / E</b> (or ← →) flip the page back / forward — hold to riffle<br>Flipping moves the drawings, not you.'; }
  start({ handoff } = {}) {
    const g = this.game; this.snap = handoff ? g.snapshot() : null; g.show3d(false); g.c2d.style.imageRendering = ''; g.c2d.style.opacity = '1'; if (handoff) g.director.releaseOutgoing();
    this.t = 0; this.fin = null; this.noPause = false; this.turn = 0; this.flick = 0; this.rep = 0; this.setScene(0);
    g.audio.muffle(0); g.music.play(SONG, { intensity: 1, fade: 1 });
    g.dialogue.say([{ who: 'vell', text: "Pencil. Twelve drawings and a thumb. Nothing here moves — somebody just flips fast enough that you can't tell." }, { who: 'rin', text: 'Who is flipping?' }, { who: 'vell', text: 'You are. Q and E. The drawings change. YOU stay put.' }]);
    g.director.preload(16);
  }
  setScene(i) { this.si = i; this.f = 0; this.ff = 0; const [x, y] = SC[i].start; this.r = { x, y, vx: 0, vy: 0, f: 1, w: 0, on: null, di: -1, coy: 0, buf: 0 }; this.prev = SC[i].dyn(0); }
  stop() {}
  respawn() { const [x, y] = SC[this.si].start, r = this.r; r.x = x; r.y = y; r.vx = r.vy = 0; r.di = -1; this.game.sfx.play('pp.hurt'); }
  update(dt, outgoing) {
    if (outgoing) return; const g = this.game, inp = g.input, r = this.r, sc = SC[this.si]; this.t += dt; this.turn = Math.max(0, this.turn - dt * 1.1); this.flick = Math.max(0, this.flick - dt * 5);
    if (this.fin) { this.fin.t += dt; this.ff = (this.ff + dt * (6 + this.fin.t * 10)) % 11; if (Math.floor(this.ff * 2) !== Math.floor((this.ff - dt * 12) * 2)) g.sfx.play('pp.fold', { vol: 0.3, pitch: 1.5 }); g.audio.muffle(clamp(this.fin.t / 6, 0, 0.6)); if (this.fin.t > 5.6 && !this.fin.done) { this.fin.done = true; const ok = g.director.handoff(16, { from15: true }); if (!ok) { g.save.complete(15); g.audio.muffle(0); g.director.end({ chapter: 15 }); } } return; }
    const fd = (inp.keys.has('KeyE') || inp.keys.has('ArrowRight') ? 1 : 0) - (inp.keys.has('KeyQ') || inp.keys.has('ArrowLeft') ? 1 : 0); if (!fd) this.rep = 0; else { this.rep -= dt; if (this.rep <= 0) { const nf = clamp(this.f + fd, 0, NF - 1); if (nf !== this.f) { this.f = nf; this.flick = 1; g.sfx.play('pp.fold', { vol: 0.4, pitch: 1.1 + nf * 0.03 }); } this.rep = this.rep < -0.5 ? 0.3 : 0.11; } }
    this.ff += clamp(this.f - this.ff, -dt * 16, dt * 16);
    const D = sc.dyn(this.ff), Wl = sc.wall(this.ff); if (r.di >= 0 && D[r.di] && this.prev[r.di] && D[r.di][2] > 0 && this.prev[r.di][2] > 0) { r.x += D[r.di][0] - this.prev[r.di][0]; r.y = D[r.di][1]; } this.prev = D;
    const mv = (inp.keys.has('KeyD') ? 1 : 0) - (inp.keys.has('KeyA') ? 1 : 0); r.vx = lerp(r.vx, mv * 400, Math.min(1, dt * (r.on ? 14 : 7))); if (mv) r.f = mv; r.vy = Math.min(1500, r.vy + 2400 * dt);
    if (r.on) r.coy = 0.12; else r.coy -= dt; if (inp.pressed.jump) r.buf = 0.14; else r.buf -= dt; if (r.buf > 0 && r.coy > 0) { r.vy = -900; r.buf = r.coy = 0; r.on = null; r.di = -1; g.sfx.play('pp.jump'); } if (r.vy < 0 && !inp.down.jump) r.vy += 2600 * dt;
    r.x += r.vx * dt; for (const [gx, gt, gw, gh] of [...sc.gnd, ...Wl]) if (r.x + 18 > gx && r.x - 18 < gx + gw && r.y > gt + 6 && r.y - 110 < gt + gh) { r.x = r.x < gx + gw / 2 ? gx - 18 : gx + gw + 18; r.vx = 0; }
    const py = r.y; r.y += r.vy * dt; const was = r.on; r.on = null; r.di = -1; const all = [...sc.gnd, ...Wl, ...D], nd = sc.gnd.length + Wl.length; all.forEach(([gx, gt, gw], i) => { if (gw > 0 && r.x + 14 > gx && r.x - 14 < gx + gw && r.vy >= 0 && py <= gt + 6 && r.y >= gt) { r.y = gt; r.vy = 0; r.on = true; r.di = i >= nd ? i - nd : -1; } });
    if (r.on && !was) g.sfx.play('pp.land', { vol: 0.4 }); if (r.on && Math.abs(r.vx) > 40) r.w += dt * 11; if (r.y > 1250) this.respawn(); r.x = Math.max(30, r.x);
    if (r.x > 1890 && r.on) { if (this.si < SC.length - 1) { this.setScene(this.si + 1); this.turn = 1; g.sfx.play('pp.fold'); g.sfx.play('pp.chime'); g.save.setCheckpoint(15, null); if (this.si === 2) g.dialogue.say('vell', 'Last one. Remember: flipping BACK is allowed. Nobody said time only goes one way in here.'); } else { this.fin = { t: 0 }; this.noPause = true; g.sfx.play('fx.rise'); g.dialogue.clear(); g.dialogue.say([{ who: 'rin', text: 'The thumb has let go.' }, { who: 'vell', text: 'All the pages at once! And behind the pad — hands. TWO of them. With string.' }]); } }
  }
  render() {
    const g = this.game, ctx = fit(g, '#22202a'), t = this.t, r = this.r, sc = SC[this.si], f = this.ff, seed = Math.round(f) * 7 + this.si * 100, k = this.fin ? clamp(this.fin.t / 5, 0, 1) : 0;
    ctx.save(); if (this.turn > 0) { const u = this.turn * this.turn; ctx.transform(1 - u * 0.9, -u * 0.25, 0, 1, 0, u * 60); ctx.globalAlpha = 1 - u * 0.4; } if (k > 0) { ctx.translate(960, 540); ctx.rotate(Math.sin(t * 30) * 0.01 * k); ctx.scale(1 + k * 0.4, 1 + k * 0.4); ctx.translate(-960, -540); }
    ctx.drawImage(this.paper, 0, 0);
    // doodled sky
    ring(ctx, 1560, 200, 70, seed, 3.5, G); for (let i = 0; i < 10; i++) { const a = (i * TAU) / 10 + f * 0.1; pl(ctx, [[1560 + Math.cos(a) * 92, 200 + Math.sin(a) * 92], [1560 + Math.cos(a) * 126, 200 + Math.sin(a) * 126]], seed + i, 3, G); } hatch(ctx, 1490, 130, 140, 140, seed, 'rgba(240,170,40,0.9)', 8, 0.6);
    for (let i = 0; i < 3; i++) { const cx = 300 + i * 520 + f * (14 + i * 6), cy = 170 + i * 46; pl(ctx, [[cx - 90, cy + 30], [cx - 70, cy - 10], [cx - 20, cy - 34], [cx + 30, cy - 20], [cx + 80, cy - 4], [cx + 96, cy + 30], [cx - 90, cy + 30]], seed + i * 5, 3, G); }
    // ground
    for (const [gx, gt, gw, gh] of sc.gnd) { hatch(ctx, gx, gt, gw, gh, seed + gx, G, 15, 0.42); pl(ctx, [[gx, gt + gh], [gx, gt], [gx + gw * 0.33, gt], [gx + gw * 0.66, gt], [gx + gw, gt], [gx + gw, gt + gh]], seed + gx, 5, G); for (let i = 0; i < gw / 60; i++) pl(ctx, [[gx + 20 + i * 60, gt], [gx + 26 + i * 60, gt - 16 - hash2(i, gx) * 14], [gx + 34 + i * 60, gt]], seed + i, 2, 'rgba(60,140,80,0.9)'); }
    // onion skin: the page before and the page after, in blue pencil
    if (!this.fin) for (const d of [-1, 1]) { const of = Math.round(f) + d; if (of < 0 || of >= NF) continue; ctx.globalAlpha = 0.17; sc.draw(ctx, of, of * 7 + this.si * 100, BLUE); ctx.globalAlpha = 1; }
    if (this.fin) for (let i = 0; i < NF; i += 2) { ctx.globalAlpha = 0.3; sc.draw(ctx, (f + i) % 11, i * 7, i % 4 ? G : BLUE); } ctx.globalAlpha = 1; sc.draw(ctx, f, seed, G);
    { const dx = 1860; pl(ctx, [[dx, sc.gnd[1][1]], [dx, sc.gnd[1][1] - 150], [dx + 30, sc.gnd[1][1] - 180], [dx + 60, sc.gnd[1][1] - 150]], seed, 4, G); pl(ctx, [[dx + 14, sc.gnd[1][1] - 60], [dx + 44, sc.gnd[1][1] - 80], [dx + 14, sc.gnd[1][1] - 100]], seed + 1, 3, 'rgba(210,70,60,0.9)'); }
    // Vell and Rin are not on the pages: they redraw themselves twelve times a second regardless
    const s2 = Math.floor(t * 12); { const vx = r.x - r.f * 80, vy = r.y - 190 + Math.sin(t * 2.5) * 12; ring(ctx, vx, vy, 24, s2, 3.5, 'rgba(150,80,170,0.95)'); hatch(ctx, vx - 24, vy - 24, 48, 48, s2, 'rgba(150,80,170,0.9)', 6, 0.7); ring(ctx, vx + 7, vy - 3, 7, s2 + 1, 2.5, G); }
    { const sw = r.on ? Math.sin(r.w) * Math.min(1, Math.abs(r.vx) / 200) : 0.6; ctx.save(); ctx.translate(r.x, r.y); ctx.scale(r.f, 1); for (const s of [-1, 1]) pl(ctx, [[s * 6, -48], [s * 7 + s * sw * 14, -24], [s * 6 + s * sw * 26, 0], [s * 6 + s * sw * 26 + 12, 0]], s2 + s, 4.5, G); hatch(ctx, -20, -104, 40, 58, s2, 'rgba(30,170,160,0.95)', 6, 0.75); pl(ctx, [[-20, -104], [20, -104], [24, -46], [-24, -46]], s2 + 3, 4, G, true); pl(ctx, [[-8, -102], [-44, -108 + Math.sin(t * 6) * 8], [-74, -92]], s2 + 4, 7, 'rgba(235,125,40,0.95)'); ring(ctx, 3, -124, 20, s2 + 5, 4, G); for (let i = 0; i < 4; i++) pl(ctx, [[-10 + i * 8, -140], [-20 + i * 10, -164 - (i % 2) * 8], [-2 + i * 8, -142]], s2 + 6 + i, 3, G); pl(ctx, [[-8, -128], [18, -128]], s2 + 11, 5, 'rgba(235,125,40,0.95)'); ctx.restore(); }
    // page numbers down the margin, and the thumb on the corner
    for (let i = 0; i < NF; i++) { const on = i === Math.round(f); pl(ctx, [[70 + i * 44, 1020], [70 + i * 44 + 26, 1020], [70 + i * 44 + 26, 1046], [70 + i * 44, 1046]], i, on ? 4 : 2, on ? 'rgba(210,70,60,0.95)' : G, true); if (on) hatch(ctx, 70 + i * 44, 1020, 26, 26, i, 'rgba(210,70,60,0.9)', 5, 0.8); }
    { const b = this.flick, cx = 1920, cy = 1080, q = 170 + b * 70; ctx.fillStyle = '#fbfaf5'; ctx.beginPath(); ctx.moveTo(cx - q, cy); ctx.lineTo(cx, cy - q); ctx.lineTo(cx - q * 0.72, cy - q * 0.72); ctx.fill(); pl(ctx, [[cx - q, cy], [cx - q * 0.72, cy - q * 0.72], [cx, cy - q]], 3, 3.5, G); hatch(ctx, cx - q, cy - q, q, q, 4, G, 9, 0.18);
      ctx.save(); ctx.translate(1800 - b * 26, 1030 - b * 30); ctx.rotate(-0.72 - b * 0.16); ctx.fillStyle = '#f0d2bc'; ctx.beginPath(); ctx.roundRect(-70, -150, 140, 420, 68); ctx.fill(); hatch(ctx, -70, -150, 140, 420, 9, 'rgba(190,120,90,0.9)', 10, 0.35); pl(ctx, [[-70, 260], [-70, -90], [-50, -138], [0, -152], [50, -138], [70, -90], [70, 260]], 9, 5, G); pl(ctx, [[-44, -60], [-44, -112], [0, -132], [44, -112], [44, -60], [-44, -60]], 10, 3, G); pl(ctx, [[-50, 40], [0, 30], [50, 40]], 11, 2.5, G); pl(ctx, [[-50, 62], [0, 52], [50, 62]], 12, 2.5, G); ctx.restore(); }
    ctx.restore();
    if (k > 0.8) { ctx.fillStyle = `rgba(245,242,233,${(k - 0.8) * 5})`; ctx.fillRect(0, 0, VW, VH); }
    if (!this.fin) { objective(ctx, sc.tip[0], sc.tip[1], { bg: 'rgba(38,38,46,0.86)', accent: '#d2463c' }); ctx.font = '700 40px Georgia, serif'; ctx.fillStyle = G; ctx.textAlign = 'right'; ctx.fillText(`${Math.round(f) + 1} / ${NF}`, 1700, 1050); }
    titleCard(ctx, t, 15, 'PERSISTENCE', '#26262e', '#d2463c'); introSnap(ctx, this.snap, t, 2); dlg(ctx, g, { bg: 'rgba(38,38,46,0.92)', line: '#d2463c' });
  }
}
