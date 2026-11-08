// CHAPTER 8 — THE EMPTY SKY. Vector space combat.
// Lindmere's pixels come apart into lines; above the version, ATLAS's carrier. Everything is
// drawn as glowing vector strokes on black. Newtonian-ish flight (mouse to aim, WASD thrust and
// strafe, Shift boost), lasers, lock-on missiles, interceptors that lead their shots and break
// off, drifting wreckage, and a carrier taken apart piece by piece: turrets, two shield
// generators, then the core — then fly into its open hangar. The transmissions tell you what
// "keeping" a version actually costs.
import { overlay2D, rng } from '../../engine/canvas2d.js';
import { wait } from '../../engine/ui.js';
import { flag, setFlag } from '../../game/state.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const CARRIER = { x: 0, y: -2600 };
const SHAPES = {
  ship: [[18, 0], [-12, 10], [-6, 0], [-12, -10]],
  interceptor: [[16, 0], [0, 9], [-12, 0], [0, -9]],
  drone: [[9, 0], [-6, 6], [-6, -6]],
  missile: [[6, 0], [-4, 2], [-4, -2]],
};

export default class Chapter8 {
  constructor(game) { this.game = game; this.usesPointerLock = false; }

  async load() {
    this.O = overlay2D(this.game, { cursor: 'none' });
    const R = rng(88);
    this.stars = Array.from({ length: 420 }, () => ({ x: R() * 4000 - 2000, y: R() * 4000 - 2000, z: 0.15 + R() * 0.85 }));
    this.rocks = Array.from({ length: 46 }, (_, i) => { const n = 7 + (i % 4), r = 26 + R() * 60; return { x: (R() - 0.5) * 2600, y: -400 - R() * 1900, vx: (R() - 0.5) * 20, vy: (R() - 0.5) * 20, a: R() * 6, w: (R() - 0.5) * 0.6, r, pts: Array.from({ length: n }, (_, k) => { const t = (k / n) * Math.PI * 2; return [Math.cos(t) * r * (0.7 + R() * 0.3), Math.sin(t) * r * (0.7 + R() * 0.3)]; }) }; });
    this.reset();
  }

  reset() {
    this.ship = { x: 0, y: 300, vx: 0, vy: -40, a: -Math.PI / 2, hull: 100, shield: 100, energy: 100, missiles: 6, fireT: 0, hitT: 0, dead: false };
    this.bolts = []; this.missiles = []; this.foes = []; this.bursts = []; this.texts = [];
    this.wave = 0; this.waveT = 4; this.phase = 'approach'; this.t = 0; this.over = false; this.said = new Set();
    // the carrier: a long hull with parts you can shoot off
    const C = CARRIER;
    this.carrier = {
      parts: [
        { id: 'gen1', kind: 'gen', x: C.x - 330, y: C.y + 40, r: 46, hp: 60 },
        { id: 'gen2', kind: 'gen', x: C.x + 330, y: C.y + 40, r: 46, hp: 60 },
        { id: 't1', kind: 'turret', x: C.x - 520, y: C.y + 120, r: 24, hp: 24, fireT: 2 },
        { id: 't2', kind: 'turret', x: C.x - 160, y: C.y + 150, r: 24, hp: 24, fireT: 3 },
        { id: 't3', kind: 'turret', x: C.x + 160, y: C.y + 150, r: 24, hp: 24, fireT: 2.5 },
        { id: 't4', kind: 'turret', x: C.x + 520, y: C.y + 120, r: 24, hp: 24, fireT: 3.5 },
        { id: 'core', kind: 'core', x: C.x, y: C.y - 30, r: 60, hp: 90 },
      ],
      hangarOpen: false,
    };
    this.cam = { x: 0, y: 0 };
    this.lockT = 0; this.lock = null;
  }

  start() { this.game.music.play('vector', { intensity: 0.4 }); this.intro(); }
  async restart() { this.reset(); }
  line(id, lines) { if (this.said.has(id)) return; this.said.add(id); this.game.ui.conversation(lines, () => this.disposed); }
  transmit(text) { this.texts.push({ text, t: 0 }); this.game.audio.tone({ freq: 1200, freqEnd: 1600, dur: 0.06, vol: 0.05 }); }

  async intro() {
    const g = this.game, ui = g.ui;
    this.introOn = true;
    ui.fadeColor('#000'); await ui.fade(1, 0.01); ui.fade(0, 2);
    ui.chapterCard(8, 'THE EMPTY SKY', 'Vector space combat', 3);
    await wait(900);
    await ui.say('ANCHOR', 'LOCAL VERSION: NONE. YOU ARE ABOVE THE VERSIONS. ATLAS CARRIER AHEAD.', { duration: 3 });
    const c = flag('ch7_choice');
    await ui.say('SERA', c === 'believe' ? 'You believed me. So believe this: that ship is where my life went.' : c === 'promise' ? 'You promised you\'d try. That ship is where you start.' : 'I wouldn\'t stay. So we go up. That ship is where it all goes.', { duration: 3.4 });
    await ui.say('KAI', 'I\'m flying a drawing of a spaceship.', { duration: 2 });
    ui.objective('Reach the carrier', 'Mouse aims · W/S thrust · A/D strafe · LMB lasers · hold RMB on a target to lock, release for a missile · Shift boost');
    this.introOn = false;
    this.transmit('ATLAS > UNREGISTERED OBJECT IN THE ARCHIVE LANES. INTERCEPTORS DISPATCHED.');
  }

  // ---------------------------------------------------------------- frame
  update(dt) {
    dt = Math.min(dt, 0.05);
    this.t += dt;
    if (!this.introOn && !this.over) { this.control(dt); this.ai(dt); this.flow(dt); }
    this.physics(dt);
    this.draw(dt);
    this.O.endFrame();
  }

  control(dt) {
    const s = this.ship, inp = this.game.input, O = this.O, m = O.mouse;
    if (s.dead) return;
    // aim at the cursor
    const wx = (m.x - O.W / 2) / O.dpr + this.cam.x, wy = (m.y - O.H / 2) / O.dpr + this.cam.y;
    this.aim = { x: wx, y: wy };
    const want = Math.atan2(wy - s.y, wx - s.x); s.a += clamp(wrap(want - s.a), -7 * dt, 7 * dt);
    const fx = Math.cos(s.a), fy = Math.sin(s.a), rx = -fy, ry = fx;
    const boost = inp.any('ShiftLeft', 'ShiftRight') && s.energy > 2;
    const th = (inp.any('KeyW') ? 1 : 0) - (inp.any('KeyS') ? 0.6 : 0), st = (inp.any('KeyD') ? 1 : 0) - (inp.any('KeyA') ? 1 : 0);
    const acc = 420 * (boost ? 1.9 : 1);
    s.vx += (fx * th + rx * st * 0.7) * acc * dt; s.vy += (fy * th + ry * st * 0.7) * acc * dt;
    if (boost) s.energy -= dt * 30; else s.energy = Math.min(100, s.energy + dt * 14);
    this.thrusting = th > 0;
    // lasers
    s.fireT -= dt;
    if (m.down.has(0) && s.fireT <= 0 && s.energy > 1) {
      s.fireT = 0.09; s.energy -= 1.2; this.side = -(this.side || 1);
      const ox = s.x + fx * 16 + rx * 7 * this.side, oy = s.y + fy * 16 + ry * 7 * this.side;
      this.bolts.push({ x: ox, y: oy, vx: s.vx + fx * 900, vy: s.vy + fy * 900, t: 0, team: 'p' });
      this.game.audio.tone({ type: 'square', freq: 1500, freqEnd: 300, dur: 0.07, vol: 0.05 });
    }
    // missile lock: hold RMB with a target near the cursor, release to fire
    const cand = this.targets().filter((t) => Math.hypot(t.x - wx, t.y - wy) < 90).sort((a, b) => Math.hypot(a.x - wx, a.y - wy) - Math.hypot(b.x - wx, b.y - wy))[0];
    if (m.down.has(2) && cand) { if (this.lock !== cand) { this.lock = cand; this.lockT = 0; } this.lockT += dt; if (this.lockT > 0.6 && !this.lockBeep) { this.lockBeep = true; this.game.audio.tone({ freq: 1800, dur: 0.12, vol: 0.08 }); } }
    else if (!m.down.has(2)) { if (this.lock && this.lockT > 0.6 && s.missiles > 0) { s.missiles--; this.missiles.push({ x: s.x, y: s.y, vx: s.vx + fx * 200, vy: s.vy + fy * 200, a: s.a, t: 0, target: this.lock, team: 'p' }); this.game.audio.burst({ freq: 900, freqEnd: 200, dur: 0.5, vol: 0.25 }); } this.lock = null; this.lockT = 0; this.lockBeep = false; }
  }
  targets() { return this.foes.filter((f) => f.hp > 0).concat(this.carrier.parts.filter((p) => p.hp > 0 && (p.kind !== 'core' || this.coreExposed()))); }
  coreExposed() { return this.carrier.parts.filter((p) => p.kind === 'gen' && p.hp > 0).length === 0; }

  spawn(kind, x, y) { this.foes.push({ kind, x, y, vx: 0, vy: 0, a: Math.PI / 2, hp: kind === 'interceptor' ? 5 : 2, fireT: 1 + Math.random() * 2, mode: 'attack', modeT: 0, r: kind === 'interceptor' ? 14 : 9 }); }

  ai(dt) {
    const s = this.ship;
    for (const f of this.foes) {
      if (f.hp <= 0) continue;
      f.modeT -= dt;
      const dx = s.x - f.x, dy = s.y - f.y, d = Math.hypot(dx, dy);
      // lead the target, attack runs, break off when too close, then come around again
      const lead = d / 700, tx = s.x + s.vx * lead, ty = s.y + s.vy * lead;
      let goal = Math.atan2(ty - f.y, tx - f.x);
      if (f.mode === 'attack' && d < 140) { f.mode = 'break'; f.modeT = 1.2 + Math.random(); f.breakA = goal + (Math.random() < 0.5 ? 1.6 : -1.6); }
      if (f.mode === 'break') { goal = f.breakA; if (f.modeT < 0) f.mode = 'attack'; }
      const turn = f.kind === 'interceptor' ? 3.2 : 4.5, spd = f.kind === 'interceptor' ? 330 : 380;
      f.a += clamp(wrap(goal - f.a), -turn * dt, turn * dt);
      f.vx += (Math.cos(f.a) * spd - f.vx) * Math.min(1, dt * 1.6); f.vy += (Math.sin(f.a) * spd - f.vy) * Math.min(1, dt * 1.6);
      f.fireT -= dt;
      if (f.mode === 'attack' && f.fireT < 0 && d < 700 && Math.abs(wrap(goal - f.a)) < 0.2) { f.fireT = f.kind === 'interceptor' ? 0.9 : 1.6; this.bolts.push({ x: f.x, y: f.y, vx: f.vx + Math.cos(f.a) * 620, vy: f.vy + Math.sin(f.a) * 620, t: 0, team: 'e' }); }
    }
    // carrier turrets
    for (const p of this.carrier.parts) if (p.kind === 'turret' && p.hp > 0) {
      p.fireT -= dt; const dx = s.x - p.x, dy = s.y - p.y, d = Math.hypot(dx, dy);
      p.aim = Math.atan2(dy, dx);
      if (p.fireT < 0 && d < 900) { p.fireT = 1.1 + Math.random() * 0.8; const lead = d / 520, a = Math.atan2(s.y + s.vy * lead - p.y, s.x + s.vx * lead - p.x); for (const k of [-0.06, 0.06]) this.bolts.push({ x: p.x, y: p.y, vx: Math.cos(a + k) * 520, vy: Math.sin(a + k) * 520, t: 0, team: 'e', big: true }); }
    }
  }

  flow(dt) {
    const g = this.game, ui = g.ui, s = this.ship;
    const alive = this.foes.filter((f) => f.hp > 0).length;
    if (this.phase === 'approach') {
      this.waveT -= dt;
      if (this.waveT < 0 && alive === 0 && this.wave < 3) {
        this.wave++; this.waveT = 3;
        const n = [0, 4, 6, 8][this.wave];
        for (let i = 0; i < n; i++) this.spawn(i % 3 === 2 ? 'drone' : 'interceptor', s.x + (Math.random() - 0.5) * 1200, s.y - 900 - Math.random() * 300);
        if (this.wave === 1) this.line('w1', [['SERA', 'Contacts ahead — lines, just lines. Shoot the lines!']]);
        if (this.wave === 2) { this.transmit('ATLAS > ARCHIVE STATUS: VERSIONS KEPT 4,812.'); this.line('w2', [['VENN', 'Mr. Voss. You\'ve come a long way to see a library.']]); }
        if (this.wave === 3) { this.transmit('ATLAS > VERSIONS DELETED TO MAKE ROOM: 4,811.'); this.line('w3', [['KAI', 'Four thousand eight hundred and eleven deleted. To keep four thousand eight hundred and twelve.'], ['SERA', 'Every saved world needs room. The room comes out of another one. Lindmere. Halden.'], ['VENN', 'Out of the ones nobody would miss. That was the promise. I chose carefully.']]); }
      }
      if (this.wave >= 3 && alive === 0) { this.phase = 'carrier'; ui.objective('Open the carrier', 'Destroy both shield generators (the circles), then the core'); this.line('car', [['SERA', 'Generators on either wing. Take them and the core\'s open.'], ['ANCHOR', 'HANGAR SIGNATURE DETECTED BENEATH THE CORE.']]); }
    }
    if (this.phase === 'carrier') {
      // the hangar launches drones while it can
      this.hangarT = (this.hangarT ?? 5) - dt;
      if (this.hangarT < 0 && alive < 5 && !this.coreExposed()) { this.hangarT = 7; for (let i = 0; i < 2; i++) this.spawn('drone', CARRIER.x + (i ? 60 : -60), CARRIER.y + 120); }
      if (this.coreExposed() && !this.said.has('exposed')) { this.line('exposed', [['SERA', 'Shields are down! The core — hit the core!'], ['VENN', 'If you break it, the kept versions fall. All of them. Lindmere too.'], ['KAI', 'Lindmere was never kept. It was held hostage.']]); ui.objective('Destroy the core', 'Lasers and missiles'); }
      const core = this.carrier.parts.find((p) => p.kind === 'core');
      if (core.hp <= 0 && !this.carrier.hangarOpen) { this.carrier.hangarOpen = true; this.boom(core.x, core.y, 3); ui.objective('Fly into the hangar', 'Under the carrier\'s heart, where the lines open'); this.transmit('ATLAS > ARCHIVE INTEGRITY 61%. DOCKING CORRIDOR UNSEALED.'); this.line('hangar', [['SERA', 'There — the hangar\'s open. Take us in.']]); }
      if (this.carrier.hangarOpen && Math.hypot(s.x - CARRIER.x, s.y - (CARRIER.y + 230)) < 70) this.finish();
    }
    if (s.hull <= 0 && !s.dead) { s.dead = true; this.boom(s.x, s.y, 2); this.over = true; setTimeout(() => g.fail('UNWRITTEN'), 900); }
  }

  physics(dt) {
    const s = this.ship;
    // ship
    if (!s.dead) {
      const sp = Math.hypot(s.vx, s.vy), max = this.game.input.any('ShiftLeft', 'ShiftRight') ? 620 : 380;
      if (sp > max) { s.vx *= max / sp; s.vy *= max / sp; }
      s.vx *= 1 - dt * 0.35; s.vy *= 1 - dt * 0.35;
      s.x += s.vx * dt; s.y += s.vy * dt;
      s.hitT -= dt; if (s.hitT < 0) s.shield = Math.min(100, s.shield + dt * 12);
    }
    for (const f of this.foes) { f.x += f.vx * dt; f.y += f.vy * dt; }
    for (const r of this.rocks) { r.x += r.vx * dt; r.y += r.vy * dt; r.a += r.w * dt; if (!s.dead && Math.hypot(r.x - s.x, r.y - s.y) < r.r * 0.8 + 10) { const n = Math.atan2(s.y - r.y, s.x - r.x), vn = s.vx * Math.cos(n) + s.vy * Math.sin(n); if (vn < 0) { s.vx -= 1.6 * vn * Math.cos(n); s.vy -= 1.6 * vn * Math.sin(n); this.damage(Math.min(30, -vn * 0.06)); } } }
    // the carrier's hull is solid
    if (!s.dead && Math.abs(s.x - CARRIER.x) < 700 && Math.abs(s.y - CARRIER.y) < 110 && !(this.carrier.hangarOpen && Math.abs(s.x - CARRIER.x) < 90)) { s.vy += (s.y < CARRIER.y ? -1 : 1) * 900 * dt; this.damage(dt * 20); }
    // lasers
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i]; b.t += dt; b.x += b.vx * dt; b.y += b.vy * dt;
      let dead = b.t > 1.4;
      if (!dead && b.team === 'p') {
        for (const f of this.foes) if (f.hp > 0 && Math.hypot(f.x - b.x, f.y - b.y) < f.r + 4) { f.hp--; dead = true; this.spark(b.x, b.y); if (f.hp <= 0) this.boom(f.x, f.y, f.kind === 'interceptor' ? 1 : 0.6); break; }
        if (!dead) for (const p of this.carrier.parts) if (p.hp > 0 && Math.hypot(p.x - b.x, p.y - b.y) < p.r) { if (p.kind === 'core' && !this.coreExposed()) { this.spark(b.x, b.y, true); dead = true; break; } p.hp--; dead = true; this.spark(b.x, b.y); if (p.hp <= 0) this.boom(p.x, p.y, p.kind === 'turret' ? 1.2 : 2); break; }
        if (!dead) for (const r of this.rocks) if (Math.hypot(r.x - b.x, r.y - b.y) < r.r * 0.8) { dead = true; this.spark(b.x, b.y, true); break; }
      } else if (!dead && !s.dead && Math.hypot(s.x - b.x, s.y - b.y) < 13) { dead = true; this.damage(b.big ? 12 : 7); this.spark(b.x, b.y); }
      if (dead) this.bolts.splice(i, 1);
    }
    // missiles home in
    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const m = this.missiles[i]; m.t += dt;
      const tg = m.target; if (tg && tg.hp > 0) { const want = Math.atan2(tg.y - m.y, tg.x - m.x); m.a += clamp(wrap(want - m.a), -5 * dt, 5 * dt); }
      m.vx += Math.cos(m.a) * 900 * dt; m.vy += Math.sin(m.a) * 900 * dt; const sp = Math.hypot(m.vx, m.vy); if (sp > 720) { m.vx *= 720 / sp; m.vy *= 720 / sp; }
      m.x += m.vx * dt; m.y += m.vy * dt;
      if (Math.random() < 0.8) this.bursts.push({ x: m.x, y: m.y, t: 0, T: 0.4, r: 3, trail: true });
      if (tg && tg.hp > 0 && Math.hypot(tg.x - m.x, tg.y - m.y) < (tg.r || 14) + 6) { tg.hp -= tg.kind === 'core' ? 22 : tg.kind === 'gen' ? 20 : 8; this.boom(m.x, m.y, 1); if (tg.hp <= 0) this.boom(tg.x, tg.y, tg.kind === 'gen' ? 2 : 1); this.missiles.splice(i, 1); continue; }
      if (m.t > 5) this.missiles.splice(i, 1);
    }
    for (let i = this.bursts.length - 1; i >= 0; i--) if ((this.bursts[i].t += dt) > this.bursts[i].T) this.bursts.splice(i, 1);
    for (let i = this.texts.length - 1; i >= 0; i--) if ((this.texts[i].t += dt) > 7) this.texts.splice(i, 1);
    // camera leads the ship a little toward where you aim
    const lx = this.aim ? (this.aim.x - s.x) * 0.25 : 0, ly = this.aim ? (this.aim.y - s.y) * 0.25 : 0;
    this.cam.x += (s.x + lx - this.cam.x) * Math.min(1, dt * 4); this.cam.y += (s.y + ly - this.cam.y) * Math.min(1, dt * 4);
  }
  damage(d) { const s = this.ship; s.hitT = 2.5; const sd = Math.min(s.shield, d); s.shield -= sd; s.hull -= (d - sd); this.flash = 0.25; this.game.audio.burst({ freq: 400, freqEnd: 100, type: 'lowpass', dur: 0.15, vol: 0.35 }); }
  spark(x, y, deflect) { this.bursts.push({ x, y, t: 0, T: 0.18, r: deflect ? 6 : 10, deflect }); }
  boom(x, y, k = 1) { this.bursts.push({ x, y, t: 0, T: 0.9 * k, r: 50 * k, boom: true }); for (let i = 0; i < 10 * k; i++) this.bursts.push({ x, y, t: 0, T: 0.6 + Math.random() * 0.5, r: 0, shard: true, vx: (Math.random() - 0.5) * 300 * k, vy: (Math.random() - 0.5) * 300 * k, a: Math.random() * 6 }); this.game.audio.explosion(null, 0.4 * k); this.shake = Math.max(this.shake || 0, 0.4 * k); }

  async finish() {
    if (this.over) return; this.over = true;
    const g = this.game, ui = g.ui;
    ui.objective(null);
    await ui.say('ANCHOR', 'DOCKED. INSIDE THE ARCHIVE THERE IS NO GEOMETRY. ONLY TEXT.', { duration: 3 });
    await ui.say('SERA', 'Kai, the lines are going. It\'s just… words in here.', { duration: 2.6 });
    this.unravel = 0.001;
    g.music.stop(2.5);
    await wait(3600);
    ui.fadeColor('#000'); await ui.fade(1, 1);
    g.nextChapter();
  }

  // ---------------------------------------------------------------- vector drawing
  draw(dt) {
    const O = this.O, g = O.ctx, W = O.W, H = O.H, s = O.dpr, cam = this.cam;
    this.shake = Math.max(0, (this.shake || 0) - dt * 1.5);
    const sh = this.shake * 10 * s;
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over';
    g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(0, 0, W, H); // phosphor persistence: a faint trail of the last frame
    g.globalCompositeOperation = 'lighter';
    // stars, parallax
    for (const st of this.stars) { let x = (st.x - cam.x * st.z) % 4000, y = (st.y - cam.y * st.z) % 4000; if (x < 0) x += 4000; if (y < 0) y += 4000; x = (x - 2000) * s + W / 2; y = (y - 2000) * s + H / 2; if (x < 0 || y < 0 || x > W || y > H) continue; g.fillStyle = `rgba(160,220,255,${st.z * 0.8})`; g.fillRect(x, y, s * st.z * 1.5, s * st.z * 1.5); }
    g.setTransform(s, 0, 0, s, W / 2 - cam.x * s + (Math.random() - 0.5) * sh, H / 2 - cam.y * s + (Math.random() - 0.5) * sh);
    const stroke = (pts, x, y, a, col, close = true, w = 1.6) => {
      for (const [lw, al] of [[w * 3.5, 0.18], [w, 1]]) {
        g.strokeStyle = col.replace('A', al); g.lineWidth = lw; g.beginPath();
        pts.forEach(([px, py], i) => { const X = x + px * Math.cos(a) - py * Math.sin(a), Y = y + px * Math.sin(a) + py * Math.cos(a); i ? g.lineTo(X, Y) : g.moveTo(X, Y); });
        if (close) g.closePath(); g.stroke();
      }
    };
    const CY = 'rgba(80,255,220,A)', MG = 'rgba(255,80,200,A)', AM = 'rgba(255,190,80,A)', WH = 'rgba(220,240,255,A)', RD = 'rgba(255,70,60,A)';
    // wreckage
    for (const r of this.rocks) if (Math.abs(r.x - cam.x) < 1400 && Math.abs(r.y - cam.y) < 1000) stroke(r.pts, r.x, r.y, r.a, 'rgba(130,150,190,A)');
    // the carrier: an enormous wireframe
    {
      const C = CARRIER, hull = [[-700, -40], [-560, -110], [-200, -130], [0, -180], [200, -130], [560, -110], [700, -40], [640, 90], [260, 160], [90, 230], [-90, 230], [-260, 160], [-640, 90]];
      stroke(hull, C.x, C.y, 0, MG, true, 2);
      stroke([[-600, -20], [600, -20]], C.x, C.y, 0, MG, false, 1);
      stroke([[-420, 60], [420, 60]], C.x, C.y, 0, MG, false, 1);
      for (let k = -5; k <= 5; k++) stroke([[k * 110, -110], [k * 110, 100]], C.x, C.y, 0, 'rgba(255,80,200,A)'.replace('A', 'A'), false, 0.6);
      const ho = this.carrier.hangarOpen;
      stroke([[-80, 180], [80, 180], [80, 240], [-80, 240]], C.x, C.y, 0, ho ? WH : MG, true, ho ? 2.4 : 1.2);
      if (ho) { const p = (Math.sin(this.t * 6) + 1) / 2; stroke([[-60 * p, 200], [60 * p, 200], [60 * p, 230], [-60 * p, 230]], C.x, C.y, 0, WH, true, 1); }
      for (const p of this.carrier.parts) {
        if (p.hp <= 0) { stroke([[-p.r * 0.6, -p.r * 0.6], [p.r * 0.6, p.r * 0.6]], p.x, p.y, 0, 'rgba(120,120,140,A)', false); continue; }
        if (p.kind === 'gen') { const n = 12, ring = Array.from({ length: n }, (_, k) => [Math.cos(k / n * 6.283) * p.r, Math.sin(k / n * 6.283) * p.r]); stroke(ring, p.x, p.y, this.t, CY, true, 2); stroke(ring.map(([x, y]) => [x * 0.5, y * 0.5]), p.x, p.y, -this.t * 2, CY); if (!this.coreExposed()) { g.strokeStyle = 'rgba(80,255,220,0.25)'; g.lineWidth = 1; g.beginPath(); g.moveTo(p.x, p.y); const core = this.carrier.parts.find((q) => q.kind === 'core'); g.lineTo(core.x, core.y); g.stroke(); } }
        if (p.kind === 'turret') { stroke([[-14, -14], [14, -14], [14, 14], [-14, 14]], p.x, p.y, 0, AM); stroke([[0, 0], [26, 0]], p.x, p.y, p.aim || 0, AM, false, 2); }
        if (p.kind === 'core') { const ex = this.coreExposed(), n = 6, hex = Array.from({ length: n }, (_, k) => [Math.cos(k / n * 6.283) * p.r, Math.sin(k / n * 6.283) * p.r]); stroke(hex, p.x, p.y, this.t * 0.6, ex ? RD : 'rgba(255,80,200,A)', true, ex ? 2.6 : 1); if (!ex) { const sh2 = Array.from({ length: 20 }, (_, k) => [Math.cos(k / 20 * 6.283) * (p.r + 22), Math.sin(k / 20 * 6.283) * (p.r + 22)]); stroke(sh2, p.x, p.y, 0, CY, true, 0.8); } }
        if (p.hp > 0 && p.kind !== 'core' || this.coreExposed() && p.kind === 'core') { const max = { gen: 60, turret: 24, core: 90 }[p.kind]; g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2; g.beginPath(); g.moveTo(p.x - p.r, p.y + p.r + 10); g.lineTo(p.x - p.r + 2 * p.r * p.hp / max, p.y + p.r + 10); g.stroke(); }
      }
    }
    // enemies
    for (const f of this.foes) if (f.hp > 0) stroke(SHAPES[f.kind], f.x, f.y, f.a, f.kind === 'interceptor' ? AM : RD);
    // bolts and missiles
    for (const b of this.bolts) { const k = b.team === 'p' ? 0.022 : 0.03, col = b.team === 'p' ? 'rgba(120,255,160,A)' : 'rgba(255,90,80,A)'; for (const [lw, al] of [[5, 0.25], [1.6, 1]]) { g.strokeStyle = col.replace('A', al); g.lineWidth = lw; g.beginPath(); g.moveTo(b.x, b.y); g.lineTo(b.x - b.vx * k, b.y - b.vy * k); g.stroke(); } }
    for (const m of this.missiles) stroke(SHAPES.missile, m.x, m.y, m.a, WH);
    for (const b of this.bursts) {
      const k = b.t / b.T;
      if (b.shard) { stroke([[-6, 0], [6, 0]], b.x + b.vx * b.t, b.y + b.vy * b.t, b.a + b.t * 6, `rgba(255,${200 - k * 150 | 0},120,A)`.replace('A', 1 - k), false); continue; }
      g.strokeStyle = b.trail ? `rgba(220,240,255,${0.4 * (1 - k)})` : b.deflect ? `rgba(160,200,255,${1 - k})` : `rgba(255,${220 - k * 160 | 0},120,${1 - k})`;
      g.lineWidth = b.boom ? 2.5 : 1.2; g.beginPath(); g.arc(b.x, b.y, (b.r || 3) * (b.boom ? k : 0.5 + k), 0, Math.PI * 2); g.stroke();
    }
    // the ship
    const sp = this.ship;
    if (!sp.dead) {
      stroke(SHAPES.ship, sp.x, sp.y, sp.a, CY, true, 2);
      if (this.thrusting) stroke([[-8, 4], [-16 - Math.random() * 10, 0], [-8, -4]], sp.x, sp.y, sp.a, AM, false);
      if (sp.shield > 5) { g.strokeStyle = `rgba(80,255,220,${0.08 + sp.shield / 600 + (this.flash > 0 ? 0.3 : 0)})`; g.lineWidth = 1; g.beginPath(); g.arc(sp.x, sp.y, 22, 0, Math.PI * 2); g.stroke(); }
    }
    // lock-on reticle and cursor
    if (this.aim) {
      const a = this.aim; stroke([[-8, 0], [-3, 0]], a.x, a.y, 0, WH, false); stroke([[8, 0], [3, 0]], a.x, a.y, 0, WH, false); stroke([[0, -8], [0, -3]], a.x, a.y, 0, WH, false); stroke([[0, 8], [0, 3]], a.x, a.y, 0, WH, false);
      if (this.lock && this.lock.hp > 0) { const k = clamp(this.lockT / 0.6, 0, 1), r = 40 - 20 * k; stroke([[-r, -r], [r, -r], [r, r], [-r, r]], this.lock.x, this.lock.y, this.t * 2 * (1 - k), k >= 1 ? RD : WH, true, k >= 1 ? 2 : 1); }
    }
    // the HUD, also in vector
    g.setTransform(1, 0, 0, 1, 0, 0);
    const bar = (x, y, w, v, col, label) => { g.strokeStyle = col.replace('A', 0.4); g.lineWidth = s; g.strokeRect(x, y, w, 8 * s); g.fillStyle = col.replace('A', 0.9); g.fillRect(x + 2 * s, y + 2 * s, (w - 4 * s) * clamp(v, 0, 1), 4 * s); g.font = `${11 * s}px monospace`; g.fillText(label, x, y - 4 * s); };
    bar(24 * s, H - 70 * s, 200 * s, sp.hull / 100, 'rgba(255,190,80,A)', 'HULL');
    bar(24 * s, H - 40 * s, 200 * s, sp.shield / 100, 'rgba(80,255,220,A)', 'SHIELD');
    bar(240 * s, H - 40 * s, 120 * s, sp.energy / 100, 'rgba(220,240,255,A)', 'ENERGY');
    g.fillStyle = 'rgba(220,240,255,0.9)'; g.font = `${12 * s}px monospace`; g.fillText(`MISSILES ${'▲'.repeat(sp.missiles)}`, 240 * s, H - 66 * s);
    // ATLAS transmissions, typed out
    this.texts.forEach((tx, i) => { const n = Math.floor(tx.t * 40); g.fillStyle = `rgba(255,80,200,${Math.min(1, 7 - tx.t)})`; g.font = `${13 * s}px monospace`; g.fillText(tx.text.slice(0, n) + (n < tx.text.length ? '▌' : ''), 24 * s, 110 * s + i * 22 * s); });
    if (this.flash > 0) { this.flash -= dt; g.fillStyle = `rgba(255,60,40,${this.flash * 0.4})`; g.fillRect(0, 0, W, H); }
    // inside the archive the lines come undone into words
    if (this.unravel) {
      this.unravel = Math.min(1, this.unravel + dt * 0.3);
      g.globalCompositeOperation = 'source-over'; g.fillStyle = `rgba(0,0,0,${this.unravel})`; g.fillRect(0, 0, W, H);
      g.fillStyle = `rgba(220,240,255,${this.unravel})`; g.font = `${14 * s}px monospace`;
      const words = 'kept deleted kept deleted lindmere halden arlen the works the table room 611 mara sera kai'.split(' ');
      for (let i = 0; i < 60 * this.unravel; i++) g.fillText(words[(i * 7 + Math.floor(this.t * 3)) % words.length], (i * 137) % W, ((i * 89) % H));
    }
    g.globalCompositeOperation = 'source-over';
  }

  dispose() { this.disposed = true; this.O?.dispose(); }
}
