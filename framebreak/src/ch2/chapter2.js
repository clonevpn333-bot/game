// CHAPTER 2 — INK & VIOLENCE. Hand-drawn cartoon brawler with elastic physics.
// Different rules from the pixel world: Rin stretches an arm to grab, swing
// and throw; squashes flat to slip under machinery; bounces instead of dashes.
// Opens with the PIXEL→INK transformation and ends with the INK→PAPER flood.
import { Pen, paperTexture, drawRin, drawVell, drawEnemy, drawSplat, INK, CREAM, TEAL, ORANGE, RED, WASH, WASH2, GOLD } from './ink.js';
import { SONG_CH2, STING2 } from '../audio/songs/ch2.js';
import { clamp, lerp, damp, approach, Spring, TAU, hash2, ease } from '../core/util.js';
import { wrapText } from '../core/dialogue.js';

const VW = 1920, VH = 1080, FLOOR = 900, GRAV = 3200;
const ARENA = { x0: 6520, x1: 8300 };

export default class Chapter2 {
  constructor(game) { this.game = game; this.id = 2; this.compositesOutgoing = true; }
  async load() { this.pen = new Pen(); this.paper = paperTexture(); }
  controlsHelp() { return '<b>A/D</b> move · <b>SPACE</b> jump (hold to bounce) · <b>J</b> stretch-grab / throw (aim with W/A/S/D) · <b>L</b> hold & release: wind-up punch<br><b>S</b> on ground: squash flat · <b>S</b> in air: cannonball'; }

  start({ checkpoint, handoff }) {
    const g = this.game; g.show3d(false); g.c2d.style.imageRendering = '';
    this.t = 0; this.cam = { x: 0, y: 0 }; this.fx = []; this.splats = []; this.blots = []; this.shake = 0; this.said = {}; this.dissolve = 0; this.flood = null; this.ended = false; this.noPause = false;
    this.solids = [
      { x: -500, y: FLOOR, w: 3100, h: 500 }, { x: 4000, y: FLOOR, w: 5600, h: 500 }, { x: -500, y: -800, w: 440, h: 1800 },
      { x: 900, y: 650, w: 320, h: 44, thin: true }, { x: 3230, y: 770, w: 240, h: 44, thin: true },
      { x: 5000, y: 250, w: 520, h: 606, duct: true }, { x: 6300, y: 150, w: 110, h: 712, duct: true },
      { x: 8300, y: -400, w: 1300, h: 1300, boss: true },
    ];
    this.gate = { x: 2300, y: 250, w: 90, h: 650, open: 0 }; this.solids.push(this.gate);
    this.button = { x: 2180, y: 400, r: 70, hit: false };
    this.wallL = { x: ARENA.x0 - 300, y: -400, w: 300, h: 1300, off: true }; this.solids.push(this.wallL);
    this.pegs = [{ x: 1560, y: 360 }, { x: 2900, y: 330 }, { x: 3350, y: 270 }, { x: 3800, y: 330 }, { x: 7400, y: 250 }];
    this.hammers = [{ x: 5700, ph: 0 }, { x: 6000, ph: 1.3 }].map((h) => ({ ...h, y: 250, w: 200, hh: 150, vy: 0, t: h.ph }));
    this.enemies = [];
    for (const [k, x] of [['stamper', 1300], ['stamper', 1800], ['inkwell', 4500], ['stamper', 4800], ['nib', 5850], ['stamper', 6150], ['nib', 4300]]) this.spawnEnemy(k, x, k === 'nib' ? 380 : FLOOR - 60);
    this.cps = { start: 300, vat: 2450, hall: 4150, boss: 6650 };
    this.cp = checkpoint && this.cps[checkpoint] ? checkpoint : 'start';
    this.p = { x: this.cps[this.cp], y: FLOOR, vx: 0, vy: 0, w: 56, h: 120, ground: true, face: 1, sx: new Spring(1, 260, 13), sy: new Spring(1, 260, 13), walk: 0, hp: 5, inv: 0, flatT: 0, flat: 0, ball: false, hold: null, wind: 0, hurt: 0, t: 0, blink: 0, arm: { state: 'idle', x: 0, y: 0, dx: 1, dy: 0, len: 0 }, scarf: [0, 1, 2, 3].map(() => ({ x: 0, y: 0 })), coyote: 0, buf: 0 };
    this.vell = { x: this.p.x - 200, y: 600, t: 0, on: !handoff };
    this.boss = null; this.intro = null;
    if (this.cp !== 'start') { this.gate.open = 1; this.button.hit = true; this.enemies = this.enemies.filter((e) => e.x > this.p.x); }
    if (this.cp === 'boss') this.enemies = [];
    if (handoff) { this.intro = { t: 0, snap: handoff.snapshot, rin: handoff.rin, atlas: handoff.atlas, rx: handoff.rin.sx * VW, popped: false }; this.p.x = 420; this.p.y = -400; this.p.ground = false; this.noPause = true; g.music.stop(1.8); g.audio.muffle(0); g.sfx.play('fx.whoosh'); }
    else { g.music.play(SONG_CH2, { section: 'A', intensity: 1, fade: 0.3 }); this.title = 3.5; }
    this.cam.x = this.p.x - 700;
    g.director.preload(3);
  }
  stop() {}
  respawn() {
    const p = this.p; p.x = this.cps[this.cp]; p.y = FLOOR; p.vx = p.vy = 0; p.hp = 5; p.inv = 1.5; p.flatT = 0; p.ball = false; p.hold = null; p.arm.state = 'idle'; this.blots = [];
    if (this.boss && !this.flood) { this.boss = null; this.wallL.off = true; this.enemies = []; this.said.boss = false; this.game.music.play(SONG_CH2, { section: 'A', intensity: 1 }); }
  }
  spawnEnemy(kind, x, y) { const e = { kind, x, y, r: kind === 'nib' ? 36 : 52, vx: 0, vy: 0, sx: 1, sy: 1, face: -1, t: Math.random() * 3, state: 'walk', st: 0, flash: 0, rot: 0, bounces: 0, home: y }; this.enemies.push(e); return e; }
  say(key, lines) { if (this.said[key]) return; this.said[key] = true; this.game.dialogue.say(lines); }
  pow(text, x, y, col = RED) { this.fx.push({ k: 'text', text, x, y, t: 0, col, rot: (Math.random() - 0.5) * 0.4 }); }
  burst(x, y, r = 80) { this.fx.push({ k: 'burst', x, y, r, t: 0 }); }
  splat(x, y, r = 70) { this.splats.push({ x, y, r, seed: Math.random() * 99 }); if (this.splats.length > 40) this.splats.shift(); this.game.sfx.play('ink.splat'); }

  // ---- collision -----------------------------------------------------------------
  box(p) { const flat = p.flat > 0.6; const w = flat ? 150 : p.w, h = flat ? 24 : p.ball ? 90 : p.h; return { x: p.x - w / 2, y: p.y - h, w, h }; }
  moveActor(p, dt) {
    const hitsX = () => { const b = this.box(p); for (const s of this.solids) { if (s.off || (s === this.gate && s.open > 0.95) || s.thin) continue; const sy = s === this.gate ? s.y - s.open * 700 : s.y; if (b.x < s.x + s.w && b.x + b.w > s.x && b.y < sy + s.h && b.y + b.h > sy + 2) return s; } return null; };
    p.x += p.vx * dt; let s = hitsX();
    if (s) { const b = this.box(p); if (p.vx > 0 || (p.vx === 0 && p.x < s.x + s.w / 2)) p.x = s.x - b.w / 2 - 0.5; else p.x = s.x + s.w + b.w / 2 + 0.5; p.hitWall = Math.sign(p.vx) || 1; p.vx = 0; }
    const prevY = p.y; p.y += p.vy * dt; p.ground = false;
    const b = this.box(p);
    for (const q of this.solids) {
      if (q.off || (q === this.gate && q.open > 0.95)) continue; const sy = q === this.gate ? q.y - q.open * 700 : q.y;
      if (!(b.x < q.x + q.w && b.x + b.w > q.x && b.y < sy + q.h && b.y + b.h > sy)) continue;
      if (p.vy >= 0 && prevY <= sy + 30) { p.y = sy; p.ground = true; p.landV = p.vy; p.vy = 0; }
      else if (!q.thin && p.vy < 0) { p.y = sy + q.h + b.h + 0.5; p.vy = 0; }
    }
    if (this.flood) for (const c of this.flood.crates) { if (p.vy >= 0 && b.x < c.x + c.w && b.x + b.w > c.x && p.y >= c.y && prevY <= c.y + 40) { p.y = c.y; p.ground = true; p.landV = p.vy; p.vy = 0; } }
  }
  canStand(p) { const b = { x: p.x - p.w / 2, y: p.y - p.h, w: p.w, h: p.h - 4 }; for (const s of this.solids) { if (s.off || s.thin) continue; if (b.x < s.x + s.w && b.x + b.w > s.x && b.y < s.y + s.h && b.y + b.h > s.y) return false; } for (const h of this.hammers) if (b.x < h.x + h.w && b.x + b.w > h.x && b.y < h.y + h.hh) return false; return true; }
  solidAt(x, y) { for (const s of this.solids) { if (s.off || s.thin || (s === this.gate && s.open > 0.95)) continue; if (x > s.x && x < s.x + s.w && y > s.y && y < s.y + s.h) return true; } return false; }

  // ---- update --------------------------------------------------------------------
  update(dt, outgoing) {
    if (outgoing) return;
    const g = this.game, inp = g.input, p = this.p; this.t += dt; this.pen.tick(this.t); this.shake = Math.max(0, this.shake - dt * 40); if (this.title > 0) this.title -= dt;
    if (this.intro) { this.updateIntro(dt); if (this.intro && this.intro.t < 1.7) return; }
    const ctl = !(this.fed > 0);
    const ax = ctl ? inp.axisX : 0, ix = ax > 0.3 ? 1 : ax < -0.3 ? -1 : 0, down = ctl && inp.down.down, up = ctl && inp.down.up;
    p.t += dt; p.inv -= dt; p.hurt -= dt; p.flatT -= dt; p.blink = Math.sin(p.t * 1.3) > 0.985 ? 1 : 0;
    // squash state
    const wantFlat = p.flatT > 0 || (down && p.ground && !p.hold) || (p.flat > 0.6 && !this.canStand(p));
    const was = p.flat; p.flat = approach(p.flat, wantFlat ? 1 : 0, dt * 9);
    if (was <= 0.6 && p.flat > 0.6) g.sfx.play('ink.squash'); if (was > 0.6 && p.flat <= 0.6) { g.sfx.play('ink.pop'); p.sy.kick(5); }
    const flat = p.flat > 0.6, arm = p.arm;
    // run: bouncy acceleration (not the snappy pixel run)
    const maxV = flat ? 240 : 520, acc = p.ground ? 3000 : 1700;
    if (arm.state !== 'swing' && arm.state !== 'zip') { if (ix) { p.vx = approach(p.vx, ix * maxV, acc * dt); if (arm.state === 'idle') p.face = ix; } else p.vx = approach(p.vx, 0, (p.ground ? 2200 : 300) * dt); }
    if (p.ground) p.walk += Math.abs(p.vx) * dt * 0.022;
    // jump / bounce
    if (ctl && inp.pressed.jump) p.buf = 0.12; else p.buf -= dt; if (p.ground) p.coyote = 0.1; else p.coyote -= dt;
    if (p.buf > 0 && p.coyote > 0 && !flat && arm.state !== 'swing') { p.vy = -1150; p.buf = 0; p.coyote = 0; p.ground = false; p.sx.x = 0.75; p.sy.x = 1.3; g.sfx.play('ink.jump'); }
    if (ctl && inp.released.jump && p.vy < -400 && !p.bounced) p.vy *= 0.5;
    if (ctl && inp.pressed.down && !p.ground && !p.ball && arm.state !== 'swing' && !flat) { p.ball = true; p.vy = 1500; p.vx *= 0.3; g.sfx.play('ink.whistle', { pitch: 0.5 }); }
    // gravity (paper-flat Rin drifts down like a leaf)
    if (arm.state !== 'zip') p.vy = Math.min(p.vy + GRAV * dt * (flat && !p.ground ? 0.25 : 1), flat && !p.ground ? 260 : 2200);
    this.updateArm(dt, ix, up, down, inp, ctl);
    // punch: hold to wind up, release to let fly
    if (ctl && inp.down.shoot && arm.state === 'idle' && !p.hold && !flat) { if (p.wind === 0) g.sfx.play('ink.stretch', { pitch: 0.7 }); p.wind = Math.min(1, p.wind + dt * 1.8); }
    else if (p.wind > 0) { this.punch(p.wind); p.wind = 0; }
    const wasGround = p.ground; p.hitWall = 0;
    this.moveActor(p, dt);
    if (p.ground && !wasGround) {
      const v = p.landV || 0; p.bounced = false;
      if (p.ball) { p.ball = false; this.shake = 14; g.sfx.play('ink.hammer', { vol: 0.7 }); this.burst(p.x, p.y, 150); for (const e of this.enemies) if (Math.abs(e.x - p.x) < 260 && Math.abs(e.y - p.y) < 200 && e.state !== 'held') { e.state = 'stun'; e.st = 0; e.vy = -700; e.flash = 0.15; } p.vy = -820; p.ground = false; p.bounced = true; p.sx.x = 1.5; p.sy.x = 0.5; }
      else if (v > 500) { p.sx.x = 1 + Math.min(0.5, v / 2600); p.sy.x = 1 - Math.min(0.45, v / 2600); g.sfx.play('ink.land'); if (inp.down.jump && v > 900 && !flat) { p.vy = -Math.min(1350, v * 0.8); p.ground = false; p.bounced = true; g.sfx.play('ink.boing'); } }
    }
    p.sx.update(dt); p.sy.update(dt);
    // scarf follow-through (verlet-ish chain)
    let ax0 = p.x - p.face * 14, ay0 = p.y - 120 * p.sy.x; for (const s of p.scarf) { const tx = ax0 - p.face * 30 - p.vx * 0.03, ty = ay0 + 14 - p.vy * 0.012 + Math.sin(p.t * 9 + ax0 * 0.01) * 4; s.x = damp(s.x, tx, 16, dt); s.y = damp(s.y, ty, 16, dt); ax0 = s.x; ay0 = s.y; }
    // hazards
    if (p.y > FLOOR + 60 && p.x > 2600 && p.x < 4000 && !this.flood) { this.hurt(1, true); p.x = p.x < 3300 ? 2480 : 4100; p.y = FLOOR; p.vx = p.vy = 0; this.splat(p.x, FLOOR, 90); }
    this.updateHammers(dt); this.updateEnemies(dt); this.updateBlots(dt);
    if (this.boss) this.updateBoss(dt);
    if (this.flood) this.updateFlood(dt);
    this.triggers();
    for (const f of this.fx) f.t += dt; this.fx = this.fx.filter((f) => f.t < 0.6);
    const v = this.vell; v.t += dt; if (v.on) { v.x = damp(v.x, p.x - p.face * 150, 2.5, dt); v.y = damp(v.y, p.y - 260 + Math.sin(v.t * 2) * 18, 2.5, dt); v.look = Math.sign(p.x - v.x); v.blink = Math.sin(v.t * 1.7) > 0.98 ? 1 : 0; }
    // camera
    const tx = clamp(p.x - VW / 2 + p.face * 120, this.boss && !this.flood ? ARENA.x0 - 160 : -60, this.boss ? 7480 : 7200); this.cam.x = damp(this.cam.x, tx, 4, dt);
    this.cam.y = damp(this.cam.y, this.flood ? Math.min(0, p.y - 620) : Math.min(0, p.y - 500), 4, dt);
    if (p.hp <= 0 && !this.dead) { this.dead = 1.2; g.sfx.play('ink.whistle'); } if (this.dead) { this.dead -= dt; if (this.dead <= 0) { this.dead = 0; this.respawn(); } }
  }
  hurt(n, quiet) { const p = this.p; if (p.inv > 0 || this.fed > 0) return; if (this.game.easy && p.hp <= 1) n = 0; p.hp -= n; p.inv = 1.4; p.hurt = 0.5; if (p.hold) { p.hold.state = 'stun'; p.hold = null; } p.arm.state = 'idle'; if (!quiet) { p.vy = -600; p.vx = -p.face * 300; } this.shake = 12; this.game.sfx.play('ink.hurt'); this.game.save.data.stats.deaths += p.hp <= 0 ? 1 : 0; }

  updateArm(dt, ix, up, down, inp, ctl) {
    const p = this.p, arm = p.arm, g = this.game, sh = { x: p.x + p.face * 18, y: p.y - 100 };
    if (ctl && inp.pressed.attack && p.flat < 0.5) {
      let dx = ix, dy = (down && !p.ground ? 1 : 0) - (up ? 1 : 0); if (!dx && !dy) dx = p.face; const L = Math.hypot(dx, dy); dx /= L; dy /= L;
      if (p.hold) { // throw!
        const e = p.hold; p.hold = null; e.state = 'thrown'; e.vx = dx * 1700; e.vy = dy * 1700 - 250; e.bounces = 0; e.st = 0; if (dx) p.face = Math.sign(dx); p.sx.x = 1.3; p.sy.x = 0.8; g.sfx.play('ink.throw'); this.pow('FWIP!', p.x + dx * 120, p.y - 220, TEAL);
      } else if (arm.state === 'idle') { arm.state = 'out'; arm.dx = dx; arm.dy = dy; arm.len = 40; arm.x = sh.x; arm.y = sh.y; if (dx) p.face = Math.sign(dx); g.sfx.play('ink.stretch'); }
    }
    if (arm.state === 'out') {
      arm.len += 2900 * dt; arm.x = sh.x + arm.dx * arm.len; arm.y = sh.y + arm.dy * arm.len;
      for (const e of this.enemies) if (e.state !== 'held' && e.state !== 'dead' && Math.hypot(e.x - arm.x, e.y - arm.y) < e.r + 34) { arm.state = 'reel'; arm.target = e; e.state = 'held'; g.sfx.play('ink.grab'); this.burst(e.x, e.y, 60); return; }
      for (const pg of this.pegs) if (Math.hypot(pg.x - arm.x, pg.y - arm.y) < 60) { arm.state = 'swing'; arm.peg = pg; arm.rope = Math.max(180, Math.hypot(pg.x - p.x, pg.y - (p.y - 100))); g.sfx.play('ink.grab'); p.ball = false; return; }
      if (this.solidAt(arm.x, arm.y) && arm.len > 120) { arm.state = 'zip'; arm.zt = 0; g.sfx.play('ink.grab'); return; }
      if (arm.len > 600) { arm.state = 'back'; g.sfx.play('ink.snap', { vol: 0.5 }); }
    } else if (arm.state === 'back' || arm.state === 'reel') {
      arm.len -= 3400 * dt; arm.x = sh.x + arm.dx * arm.len; arm.y = sh.y + arm.dy * arm.len;
      if (arm.state === 'reel') { arm.target.x = arm.x; arm.target.y = arm.y; }
      if (arm.len <= 50) { if (arm.state === 'reel') { p.hold = arm.target; g.sfx.play('ink.snap'); p.sy.x = 0.85; this.say('throw', [{ who: 'vell', text: 'Got one! Aim with the arrow keys and press J to THROW.' }]); } arm.state = 'idle'; }
    } else if (arm.state === 'swing') {
      const pg = arm.peg; arm.x = pg.x; arm.y = pg.y; arm.rope = approach(arm.rope, 300, 260 * dt);
      if (ix) p.vx += ix * 900 * dt;
      const cx = p.x, cy = p.y - 100 + p.vy * dt, dxp = cx + p.vx * dt - pg.x, dyp = cy - pg.y, d = Math.hypot(dxp, dyp);
      if (d > arm.rope) { const nx = dxp / d, ny = dyp / d, vr = p.vx * nx + p.vy * ny; if (vr > 0) { p.vx -= vr * nx * 1.02; p.vy -= vr * ny * 1.02; } p.x = pg.x + nx * arm.rope - p.vx * dt; p.y = pg.y + ny * arm.rope + 100 - p.vy * dt; }
      if (!inp.down.attack || p.ground) { arm.state = 'back'; arm.len = 200; if (!p.ground) { p.vx *= 1.25; p.vy = p.vy * 1.2 - 250; p.bounced = true; g.sfx.play('ink.snap'); this.pow('WHEE!', p.x, p.y - 240, ORANGE); } }
    } else if (arm.state === 'zip') {
      arm.zt += dt; const dx = arm.x - sh.x, dy = arm.y - sh.y, d = Math.hypot(dx, dy) || 1; p.vx = (dx / d) * 1500; p.vy = (dy / d) * 1500;
      if (d < 90 || arm.zt > 0.45 || p.hitWall) { arm.state = 'idle'; p.vy = Math.min(p.vy, -300) * 0.6; p.vx *= 0.3; g.sfx.play('ink.snap'); }
    }
    if (p.hold) { p.hold.x = p.x + p.face * 8; p.hold.y = p.y - 250 * p.sy.x; p.hold.vx = p.hold.vy = 0; }
  }
  punch(w) {
    const p = this.p, g = this.game, reach = 170 + w * 380, x0 = p.x, x1 = p.x + p.face * reach; let hit = false;
    this.fx.push({ k: 'punch', x: p.x, y: p.y - 100, x1, face: p.face, t: 0, w }); g.sfx.play('ink.snap'); p.sx.x = 1.35; p.sy.x = 0.8;
    for (const e of this.enemies) if (e.state !== 'held' && Math.abs(e.y - (p.y - 80)) < 130 && (e.x - x0) * p.face > -20 && (e.x - x1) * p.face < e.r) { e.state = 'thrown'; e.vx = p.face * (900 + w * 1100); e.vy = -350 - w * 300; e.bounces = 1; e.st = 0; e.flash = 0.15; hit = true; this.burst(e.x, e.y, 110); }
    if (Math.abs(this.button.y - (p.y - 100)) < 120 && (this.button.x - x0) * p.face > 0 && (this.button.x - x1) * p.face < 60) this.pressButton();
    if (hit) { g.sfx.play('ink.punch'); this.pow(w > 0.7 ? 'KA-POW!' : 'BOP!', x1, p.y - 190); this.shake = 6 + w * 10; }
  }
  pressButton() { if (this.button.hit) return; this.button.hit = true; this.game.sfx.play('ink.honk'); this.game.sfx.play('ink.crank'); this.pow('DING!', this.button.x, this.button.y - 110, GOLD); this.game.music.stinger(STING2.tada); }

  updateHammers(dt) {
    const p = this.p, g = this.game;
    for (const h of this.hammers) {
      h.t += dt; const c = h.t % 2.6, top = 250, low = FLOOR - h.hh; const prev = h.y;
      if (c < 1.3) h.y = top + (c > 1.0 ? Math.sin(c * 60) * 5 : 0); else if (c < 1.45) h.y = lerp(top, low, (c - 1.3) / 0.15); else if (c < 1.95) h.y = low; else h.y = lerp(low, top, (c - 1.95) / 0.65);
      if (prev < low - 2 && h.y >= low - 2) { if (Math.abs(h.x + h.w / 2 - this.cam.x - VW / 2) < 1200) { g.sfx.play('ink.hammer'); this.shake = 10; } this.burst(h.x + h.w / 2, FLOOR, 130); for (const e of this.enemies) if (e.x > h.x && e.x < h.x + h.w && e.state !== 'held') this.kill(e); }
      const b = this.box(p); if (b.x < h.x + h.w && b.x + b.w > h.x && b.y < h.y + h.hh && h.y > top + 40 && p.flat < 0.6) { p.flatT = 2.4; p.flat = 1; p.vy = 0; this.pow('SPLAT!', p.x, p.y - 120); this.say('flat', [{ who: 'rin', text: "...I'm fine. I'm PAPER, but I'm fine." }, { who: 'vell', text: 'Flat is a superpower here. Flat fits through things.' }]); }
    }
  }
  kill(e) { if (e.state === 'dead') return; e.state = 'dead'; this.burst(e.x, e.y, 120); this.splat(e.x, Math.min(e.y + 40, FLOOR), e.kind === 'inkwell' ? 120 : 70); this.game.sfx.play('ink.pop'); if (this.p.hold === e) this.p.hold = null; }
  updateEnemies(dt) {
    const p = this.p, g = this.game;
    for (const e of this.enemies) {
      e.t += dt; e.st += dt; e.flash -= dt; e.sx = damp(e.sx, 1, 10, dt); e.sy = damp(e.sy, 1, 10, dt);
      const dx = p.x - e.x, near = Math.abs(dx) < 1100;
      if (e.state === 'held') { e.rot = Math.sin(e.t * 20) * 0.15; continue; }
      if (e.state === 'thrown') {
        e.vy += GRAV * 0.6 * dt; e.x += e.vx * dt; e.y += e.vy * dt; e.rot += dt * 14 * Math.sign(e.vx || 1);
        let bonk = false;
        if (e.y > FLOOR - e.r) { e.y = FLOOR - e.r; e.vy = -Math.abs(e.vy) * 0.6; bonk = true; if (e.x > 2600 && e.x < 4000) { this.kill(e); continue; } }
        if (this.solidAt(e.x + Math.sign(e.vx) * e.r, e.y)) { e.vx = -e.vx * 0.6; e.x += e.vx * dt * 2; bonk = true; }
        if (e.y < -300) { e.vy = Math.abs(e.vy); }
        for (const o of this.enemies) if (o !== e && o.state !== 'held' && o.state !== 'dead' && Math.hypot(o.x - e.x, o.y - e.y) < o.r + e.r) { this.kill(o); this.pow('BONK!', o.x, o.y - 100); bonk = true; e.bounces += 2; g.sfx.play('ink.bonk'); }
        if (!this.button.hit && Math.hypot(this.button.x - e.x, this.button.y - e.y) < this.button.r + e.r) { this.pressButton(); bonk = true; e.bounces = 9; }
        if (this.boss && this.bossMouthHit(e)) { this.kill(e); continue; }
        if (bonk) { e.bounces++; e.sx = 1.4; e.sy = 0.6; g.sfx.play('ink.bonk', { vol: 0.6 }); if (e.kind === 'inkwell' || e.bounces > 3) { if (e.kind === 'inkwell') { for (const o of this.enemies) if (o !== e && Math.hypot(o.x - e.x, o.y - e.y) < 260 && o.state !== 'held') this.kill(o); this.pow('SPLOOSH!', e.x, e.y - 100, INK); } this.kill(e); } }
        continue;
      }
      if (e.state === 'stun') { e.vy += GRAV * dt; e.y += e.vy * dt; if (e.y > e.home) { e.y = e.home; e.vy = 0; } e.rot = Math.sin(e.t * 16) * 0.2; if (e.st > 2.2) { e.state = 'walk'; e.rot = 0; } continue; }
      e.rot = 0; e.face = Math.sign(dx) || 1;
      if (e.kind === 'stamper') {
        e.vy += GRAV * dt; e.y += e.vy * dt; e.x += e.vx * dt;
        if (e.y >= FLOOR - 60) { if (e.vy > 300) { e.sx = 1.35; e.sy = 0.65; if (near) g.sfx.play('ink.bonk', { vol: 0.4, pitch: 0.6 }); if (Math.abs(dx) < 110 && p.ground && p.flat < 0.6 && p.inv <= 0) { p.flatT = 1.6; p.flat = 1; this.hurt(1, true); this.pow('STAMPED!', p.x, p.y - 140); } } e.y = FLOOR - 60; e.vy = 0; e.vx = 0; if (near && e.st > 1.1 && !(e.x > 2500 && e.x < 4050)) { e.st = 0; e.vy = -820; e.vx = e.face * 300; e.sx = 0.75; e.sy = 1.3; } }
        if (this.solidAt(e.x + e.face * 60, e.y)) e.vx = 0;
      } else if (e.kind === 'inkwell') {
        if (e.state === 'walk') { const want = Math.abs(dx) > 620 ? e.face : Math.abs(dx) < 420 ? -e.face : 0; if (!this.solidAt(e.x + want * 70, e.y) && !(e.x + want * 70 > 2560 && e.x + want * 70 < 4040)) e.x += want * 130 * dt; e.y = FLOOR - 50 + Math.abs(Math.sin(e.t * 7)) * -8; if (near && e.st > 2.4) { e.state = 'aim'; e.st = 0; e.sy = 0.7; e.sx = 1.25; } }
        else if (e.state === 'aim' && e.st > 0.6) { e.state = 'walk'; e.st = 0; e.sy = 1.4; e.sx = 0.75; const T = 0.95; this.blots.push({ x: e.x, y: e.y - 80, vx: dx / T, vy: (p.y - 60 - (e.y - 80)) / T - 0.5 * 1800 * T, t: 0 }); g.sfx.play('ink.pop', { pitch: 0.6 }); }
      } else if (e.kind === 'nib') {
        if (e.state === 'walk') { e.x = damp(e.x, p.x + Math.sin(e.t * 1.3) * 200, 1.4, dt); e.y = damp(e.y, e.home + Math.sin(e.t * 3) * 24, 3, dt); if (near && e.st > 3 && Math.abs(dx) < 260) { e.state = 'dive'; e.st = 0; g.sfx.play('ink.whistle', { pitch: 0.5, vol: 0.6 }); } }
        else if (e.state === 'dive') { if (e.st > 0.45) e.y += 1700 * dt; else e.sy = 1.3; if (Math.hypot(p.x - e.x, p.y - 60 - e.y) < 80) this.hurt(1); if (e.y > FLOOR - 56) { e.y = FLOOR - 56; e.state = 'stuck'; e.st = 0; g.sfx.play('ink.bonk'); this.burst(e.x, FLOOR, 70); } }
        else if (e.state === 'stuck') { e.rot = Math.sin(e.t * 30) * 0.06 * Math.max(0, 1 - e.st); if (e.st > 1.8) { e.state = 'walk'; e.st = 0; } }
      }
      // stomp: land on a head to squash it
      if (e.kind !== 'nib' && p.vy > 200 && !p.ground && Math.abs(p.x - e.x) < e.r + 30 && p.y > e.y - e.r - 30 && p.y < e.y + 10 && e.state !== 'stun') { e.state = 'stun'; e.st = 0; e.sy = 0.4; e.sx = 1.6; p.vy = p.ball ? -1250 : -950; p.ball = false; p.bounced = true; g.sfx.play('ink.boing'); this.pow('BOING!', e.x, e.y - 120, TEAL); }
    }
    this.enemies = this.enemies.filter((e) => e.state !== 'dead');
  }
  updateBlots(dt) {
    const p = this.p;
    for (const b of this.blots) { b.t += dt; b.vy += 1800 * dt; b.x += b.vx * dt; b.y += b.vy * dt; if (Math.hypot(p.x - b.x, p.y - 60 - b.y) < 70 && p.flat < 0.6) { this.hurt(1); b.dead = true; this.splat(b.x, b.y, 60); } else if (b.y > FLOOR - 10 || this.solidAt(b.x, b.y)) { b.dead = true; this.splat(b.x, Math.min(b.y, FLOOR), 60); } }
    this.blots = this.blots.filter((b) => !b.dead);
  }

  triggers() {
    const p = this.p, g = this.game;
    this.gate.open = approach(this.gate.open, this.button.hit ? 1 : 0, 1 / 60 * 1.2);
    for (const k in this.cps) if (p.x > this.cps[k] && this.cps[k] > this.cps[this.cp] && p.ground) { this.cp = k; g.save.setCheckpoint(2, k); p.hp = Math.min(5, p.hp + 1); }
    if (this.intro) return;
    if (p.x > 900) this.say('grab', [{ who: 'vell', text: "Button's up there, gate's down here. Press J to stretch, grab a Stamper..." }, { who: 'vell', text: '...then hold W and press J again. Up it goes.' }]);
    if (p.x > 2420) this.say('peg', [{ who: 'vell', text: 'Pegs! Aim up, HOLD J to swing, let go at the top of the arc.' }]);
    if (p.x > 4700) this.say('duct', [{ who: 'vell', text: 'Too tall? Be less tall. Hold S.' }]);
    if (p.x > 6000) this.say('slot', [{ who: 'rin', text: 'Every one of these machines has a face.' }, { who: 'vell', text: 'They all live here. That is sort of my point about the Curator.' }]);
    if (p.x > ARENA.x0 + 260 && !this.boss) this.startBoss();
  }

  // ---- THE PRESS --------------------------------------------------------------------
  startBoss() {
    const g = this.game; this.boss = { hp: 6, state: 'intro', st: 0, mouth: 0, roller: null, squeeze: 0, face: 'grin', n: 0, shake: 0 };
    this.wallL.off = false; this.wallL.x = ARENA.x0 - 300; g.music.play(SONG_CH2, { section: 'boss', intensity: 1, fade: 0.3 }); g.sfx.play('ink.roar'); this.shake = 20;
    g.dialogue.say([{ who: 'press', text: 'HOT OFF THE ME! Curator\'s orders: EVERYTHING gets printed FLAT!' }, { who: 'vell', text: "It opens its mouth when it prints. Feed it something it didn't order!" }]);
  }
  bossMouthHit(e) { const b = this.boss; if (b.mouth < 0.5 || b.state === 'jam') return false; if (e.x > 8180 && e.y > 420 && e.y < 760) { b.hp--; b.face = 'choke'; b.state = 'choke'; b.st = 0; b.shake = 1; this.shake = 22; this.game.sfx.play('ink.honk'); this.game.sfx.play('ink.roar', { pitch: 1.5, vol: 0.6 }); this.pow('GULP!', 8200, 480, INK); this.game.music.stinger(STING2.wah); if (b.hp === 3) this.game.dialogue.say('press', 'MISPRINT! MISPRINT! ...FINE. DOUBLE-SIDED!'); return true; } return false; }
  updateBoss(dt) {
    const b = this.boss, p = this.p, g = this.game, fast = b.hp <= 3 ? 0.7 : 1; b.st += dt; b.shake = Math.max(0, b.shake - dt * 2);
    const alive = this.enemies.length, set = (s) => { b.state = s; b.st = 0; };
    b.mouth = approach(b.mouth, ['print', 'laugh', 'jam', 'squeeze'].includes(b.state) ? 1 : 0, dt * 5);
    this.wallL.x = approach(this.wallL.x, b.state === 'squeeze' && b.st < 4.6 ? ARENA.x0 + 560 : ARENA.x0 - 300, dt * (b.state === 'squeeze' ? 260 : 500)); b.squeeze = clamp((this.wallL.x - (ARENA.x0 - 300)) / 860, 0, 1);
    if (p.x < this.wallL.x + 330 && !this.wallL.off) { p.x = this.wallL.x + 330; if (b.state === 'squeeze') p.vx = Math.max(p.vx, 0); }
    switch (b.state) {
      case 'intro': if (b.st > 2.5) set('idle'); break;
      case 'idle': b.face = 'grin'; if (b.st > 1.1 * fast) { const k = b.n++ % 3; set(alive < 1 ? 'print' : k === 0 ? 'print' : k === 1 ? 'roller' : 'squeeze'); if (b.state === 'roller') { g.sfx.play('ink.crank'); this.pow('!', 8150, 620, RED); } if (b.state === 'squeeze') g.sfx.play('ink.steam'); } break;
      case 'print': b.face = 'open'; if (b.st > 0.5 && !b.spat) { b.spat = true; if (alive < 3) { const e = this.spawnEnemy(b.n % 2 ? 'inkwell' : 'stamper', 8200, 600); e.state = 'stun'; e.vy = -900; e.st = 1.2; e.x = 8100; e.fly = -(500 + Math.random() * 600); } g.sfx.play('ink.print'); } if (b.st > 2.3 * fast) { b.spat = false; set('idle'); } break;
      case 'roller': if (b.st > 0.8 && !b.roller) { b.roller = { x: 8200, v: -1150 / fast }; g.sfx.play('ink.pipe'); } if (b.roller) { const r = b.roller; r.x += r.v * dt; if (Math.abs(p.x - r.x) < 90 && p.y > FLOOR - 120 && p.flat < 0.6) { p.flatT = 2; p.flat = 1; this.hurt(1, true); this.pow('SQUISH!', p.x, p.y - 130); } for (const e of this.enemies) if (Math.abs(e.x - r.x) < 80 && e.y > FLOOR - 140 && e.state !== 'held' && e.state !== 'thrown') { e.state = 'stun'; e.st = 0; e.sy = 0.3; } if (r.x < this.wallL.x + 300) { b.roller = null; set('idle'); } } break;
      case 'squeeze': b.face = b.st > 1.5 ? 'open' : 'grin'; if (b.st > 5.6) set('idle'); if (b.hp <= 3 && Math.floor(b.st * 2) !== Math.floor((b.st - dt) * 2)) this.blots.push({ x: this.wallL.x + 400 + Math.random() * 900, y: -100, vx: 0, vy: 300, t: 0 }); break;
      case 'choke': if (b.st > 1.4) { if (b.hp <= 0) { set('jam'); b.face = 'dead'; g.sfx.play('ink.steam'); g.dialogue.clear(); g.dialogue.say('vell', "It's jammed OPEN! Get flat (hold S) and post yourself in!"); this.enemies.forEach((e) => this.kill(e)); } else set('idle'); } break;
      case 'jam': if (p.flat > 0.6 && p.x > 8130 && !this.fed) { this.fed = 0.001; g.sfx.play('ink.pipe'); g.dialogue.clear(); this.noPause = true; } break;
    }
    for (const e of this.enemies) if (e.fly) { e.x += e.fly * dt; if (e.y >= e.home - 2 && e.vy >= 0) e.fly = 0; }
    if (this.fed > 0) { // Rin goes through the rollers as a sheet; the machine does not enjoy it
      this.fed += dt; p.x = 8400 + this.fed * 160; p.y = 640; p.vx = p.vy = 0; b.shake = 1; this.shake = 8 + this.fed * 6; if (Math.floor(this.fed * 8) !== Math.floor((this.fed - dt) * 8)) { g.sfx.play('ink.crank'); g.sfx.play('ink.bonk', { pitch: 0.5 + this.fed * 0.3 }); }
      if (this.fed > 2.8) this.startFlood();
    }
  }

  // ---- INK → PAPER (transformation, part one) -------------------------------------
  startFlood() {
    const g = this.game, p = this.p; this.fed = 0; this.boss.state = 'burst'; this.flood = { t: 0, level: FLOOR + 200, crates: [{ x: 7250, y: FLOOR, w: 260 }, { x: 7700, y: FLOOR, w: 240 }, { x: 6850, y: FLOOR, w: 240 }], handed: false };
    p.x = 7900; p.y = 200; p.vx = -500; p.vy = -700; p.flatT = 1.2; p.flat = 1; this.shake = 40; this.wallL.off = false;
    g.sfx.play('fx.boom'); g.sfx.play('ink.flood'); g.music.play(SONG_CH2, { section: 'flood', intensity: 1, fade: 0.5 }); g.music.stinger(STING2.wah);
    for (let i = 0; i < 12; i++) this.splat(7600 + Math.random() * 800, 300 + Math.random() * 600, 60 + Math.random() * 90);
    g.dialogue.say([{ who: 'rin', text: "It's all running together..." }, { who: 'vell', text: 'Ink always wants to BECOME something. Stay on top of it!' }, { who: 'vell', text: "It's thickening. Sheets. Folds... oh. Oh, I know this one." }]);
  }
  updateFlood(dt) {
    const f = this.flood, p = this.p, g = this.game; f.t += dt; f.level -= (60 + f.t * 9) * dt; this.dissolve = clamp((f.t - 5) / 7, 0, 1);
    f.crates.forEach((c, i) => { c.y = f.level - 26 + Math.sin(f.t * 2 + i * 2) * 10; c.x += Math.sin(f.t * 0.7 + i) * 10 * dt; });
    if (p.y > f.level + 30) { p.y = f.level + 30; p.vy = -900; p.inv = 0.5; this.splat(p.x, f.level, 80); } // the ink spits you back up — it wants you on top
    g.audio.muffle(this.dissolve * 0.6);
    if (f.t > 13.5 && !f.handed) {
      f.handed = true; g.save.record('shard', { carried: true, from: 2 });
      const ok = g.director.handoff(3, { level: (f.level - this.cam.y) / VH, rin: { sx: (p.x - this.cam.x) / VW, sy: (p.y - this.cam.y) / VH, face: p.face }, hp: p.hp / 5 });
      if (!ok) { this.ended = true; g.save.complete(2); g.audio.muffle(0); g.director.end({ chapter: 2 }); }
    }
  }

  // ---- PIXEL → INK (transformation, part two — part one is Chapter 1's tear) -------
  updateIntro(dt) {
    const it = this.intro, g = this.game, p = this.p; it.t += dt; it.rx = clamp(it.rx + g.input.axisX * 700 * dt, 300, VW - 300);
    if (it.t < 1.7) { p.x = this.cam.x + it.rx; p.y = -300; p.vy = 900; p.vx = 0; for (const s of p.scarf) { s.x = p.x; s.y = p.y - 150; } }
    if (it.t >= 1.7 && !it.popped) { it.popped = true; p.x = this.cam.x + it.rx; p.y = 260; p.vy = 500; g.sfx.play('ink.pop'); g.sfx.play('ink.whistle', { pitch: 0.5 }); this.burst(p.x, p.y - 80, 200); g.music.play(SONG_CH2, { section: 'count', intensity: 1, fade: 0.05 }); }
    if (it.popped && p.ground && !it.landed) { it.landed = true; this.shake = 24; g.sfx.play('ink.hammer'); this.pow('THUD!', p.x, p.y - 260); p.sx.x = 1.7; p.sy.x = 0.35; this.vell.on = true; this.vell.x = p.x + 300; this.vell.y = 200; g.director.releaseOutgoing(); }
    if (it.landed && it.t > 3.6) { this.intro = null; this.noPause = false; this.title = 3.5; g.music.stinger(STING2.vell);
      g.dialogue.say([{ who: 'vell', text: 'You kept the scarf! ...You lost your everything else.' }, { who: 'rin', text: 'I have... gloves now? And no elbows.' }, { who: 'vell', text: 'Rubber-hose rules. You reach, you bounce, you squash. Nobody here stays one shape.' }]); }
  }
  drawIntro(ctx, S) {
    const it = this.intro, t = it.t, snap = it.snap, n = 80, cw = snap.width / n, k = clamp(t / 2.6, 0, 1);
    // every column of pixels drips downward, thins into a brush stroke and turns to ink
    for (let i = 0; i < n; i++) {
      const h = hash2(i, 7), delay = h * 0.5, u = clamp((t - delay) / 2.2, 0, 1), e = u * u;
      const w = (VW / n) * lerp(1.02, 0.16 + h * 0.3, clamp(u * 1.6, 0, 1)), x = (i + 0.5) * (VW / n) - w / 2 + Math.sin(t * 3 + i) * 14 * u, y = e * VH * (0.8 + h * 1.4), hh = VH * (1 + e * (1.5 + h * 2));
      ctx.globalAlpha = 1 - clamp((u - 0.75) / 0.25, 0, 1); ctx.imageSmoothingEnabled = u > 0.35;
      ctx.drawImage(snap, i * cw, 0, cw, snap.height, x, y, w, hh);
      if (u > 0.1) { ctx.globalAlpha *= clamp((u - 0.1) / 0.4, 0, 1); ctx.fillStyle = INK; ctx.fillRect(x, y, w, hh); ctx.beginPath(); ctx.arc(x + w / 2, y + hh, w * 0.9, 0, TAU); ctx.fill(); }
    }
    ctx.globalAlpha = 1; ctx.imageSmoothingEnabled = true;
    if (t < 1.7) { // Rin is still a sprite, tumbling — smeared more and more
      const f = it.atlas.frames['rin_fall' + (Math.floor(t * 10) % 2)], sc = 6 + k * 3, x = it.rx, y = lerp(it.rin.sy * VH, 330, ease.outCubic(clamp(t / 1.7, 0, 1)));
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 5) * 0.3); ctx.imageSmoothingEnabled = t > 1.1; ctx.scale(sc * (1 - k * 0.3), sc * (1 + k * 0.9));
      ctx.drawImage(it.atlas.R, f.x, f.y, f.w, f.h, -f.ox, -f.oy + 20, f.w, f.h); ctx.restore(); ctx.imageSmoothingEnabled = true;
      if (t > 1.45) { ctx.globalAlpha = (t - 1.45) / 0.25; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 260 * (t - 1.45) * 4, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
    }
    void S;
  }

  // ---- render --------------------------------------------------------------------
  render() {
    const g = this.game, ctx = g.ctx, pen = this.pen, p = this.p, S = Math.min(g.W / VW, g.H / VH), t = this.t;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = ctx.createPattern(this.paper, 'repeat'); ctx.fillRect(0, 0, g.W, g.H);
    const sh = this.shake * (g.settings.shake ?? 1); ctx.setTransform(S, 0, 0, S, (g.W - VW * S) / 2 + (Math.random() - 0.5) * sh * S, (g.H - VH * S) / 2 + (Math.random() - 0.5) * sh * S);
    const reveal = this.intro ? clamp((this.intro.t - 1.5) / 1.6, 0, 1) : 1, D = this.dissolve;
    pen.lw = 6 * (1 - D); ctx.globalAlpha = reveal;
    const cx = this.cam.x, cy = this.cam.y;
    // far factory: washes, gears, machines with eyes
    ctx.save(); ctx.translate(-cx * 0.35, -cy * 0.35);
    for (let i = -1; i < 14; i++) { const x = i * 520, h = 380 + hash2(i, 3) * 360; ctx.fillStyle = i % 2 ? WASH : '#dfd6bd'; ctx.fillRect(x, 860 - h, 380, h + 400); if (D < 1) { ctx.globalAlpha = reveal * (1 - D) * 0.5; pen.rect(ctx, x, 860 - h, 380, h + 400, { seed: i + 200, lw: 3 }); ctx.globalAlpha = reveal; }
      const gx = x + 190, gy = 860 - h + 150, R = 90; ctx.save(); ctx.translate(gx, gy); ctx.rotate(t * (i % 2 ? 0.6 : -0.6)); ctx.fillStyle = WASH2; ctx.beginPath(); for (let k = 0; k < 16; k++) { const a = (k / 16) * TAU, rr = k % 2 ? R : R * 0.8; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.fill(); ctx.fillStyle = CREAM; ctx.beginPath(); ctx.arc(0, 0, 26, 0, TAU); ctx.fill(); ctx.restore();
      if (i % 3 === 0) { pen.eye(ctx, x + 120, 860 - h + 330, 22, clamp((p.x - cx * 0.65 - x) / 600, -1, 1), 0, Math.sin(t * 0.9 + i) > 0.96 ? 1 : 0, i + 300); pen.eye(ctx, x + 250, 860 - h + 330, 22, clamp((p.x - cx * 0.65 - x) / 600, -1, 1), 0, Math.sin(t * 0.9 + i) > 0.96 ? 1 : 0, i + 301); }
      const py = Math.sin(t * 2.2 + i) * 60; ctx.fillStyle = WASH2; ctx.fillRect(x + 410, 500 + py, 50, 500); ctx.fillRect(x + 395, 480 + py, 80, 30); }
    ctx.restore();
    ctx.translate(-cx, -cy);
    // floor: bold line, hatching underneath
    ctx.fillStyle = '#e4dabd'; ctx.fillRect(-500, FLOOR, 3100, 600); ctx.fillRect(4000, FLOOR, 5600, 600);
    for (const [x0, x1] of [[-500, 2600], [4000, 9600]]) { pen.line(ctx, Math.max(x0, cx - 100), FLOOR, Math.min(x1, cx + VW + 100), FLOOR, 9 * (1 - D), x0); for (let x = Math.max(x0, Math.floor((cx - 100) / 90) * 90); x < Math.min(x1, cx + VW + 100); x += 90) pen.line(ctx, x + 30, FLOOR + 26, x - 10, FLOOR + 80, 3 * (1 - D), x); }
    // ink vat
    if (cx < 4100 && cx + VW > 2500) { ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(2600, 1500); ctx.lineTo(2600, 990); for (let x = 2600; x <= 4000; x += 50) ctx.lineTo(x, 990 + Math.sin(x * 0.02 + t * 3) * 12); ctx.lineTo(4000, 1500); ctx.fill(); pen.line(ctx, 2600, FLOOR, 2600, 1400, 9, 5); pen.line(ctx, 4000, FLOOR, 4000, 1400, 9, 6); for (let i = 0; i < 4; i++) { const bx = 2750 + i * 330 + Math.sin(t + i) * 30, r = 14 + ((t * 30 + i * 37) % 30); ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(bx, 970 - ((t * 60 + i * 50) % 90), r * 0.5, 0, TAU); ctx.stroke(); } }
    for (const s of this.splats) drawSplat(ctx, pen, s.x, s.y, s.r, s.seed);
    // solids
    for (const s of this.solids) {
      if (s.off || s.boss || s.y === FLOOR || s.x + s.w < cx - 200 || s.x > cx + VW + 200) continue;
      if (s === this.gate) { const y = s.y - s.open * 700; pen.rect(ctx, s.x, y, s.w, s.h, { seed: 31, fill: GOLD }); for (let i = 0; i < 6; i++) pen.line(ctx, s.x + 8, y + 50 + i * 100, s.x + s.w - 8, y + 90 + i * 100, 5, 32 + i); pen.eye(ctx, s.x + 28, y + s.h - 110, 14, -1, 0, 0, 33); pen.eye(ctx, s.x + 62, y + s.h - 110, 14, -1, 0, 0, 34); continue; }
      if (s === this.wallL) { pen.rect(ctx, s.x, s.y, s.w, s.h, { seed: 35, fill: WASH2 }); for (let y = 0; y < 900; y += 150) pen.blob(ctx, s.x + s.w - 30, y + 60, 16, 16, { seed: y, fill: WASH, lw: 4, n: 8 }); pen.eye(ctx, s.x + s.w - 110, 420, 30, 1, 0, 0, 36); pen.eye(ctx, s.x + s.w - 110, 520, 30, 1, 0, 0, 37); continue; }
      pen.rect(ctx, s.x, s.y, s.w, s.h, { seed: s.x * 0.01, fill: s.thin ? '#b08a62' : WASH });
      if (s.duct) { for (let y = s.y + 60; y < s.y + s.h - 40; y += 120) pen.line(ctx, s.x + 10, y, s.x + s.w - 10, y + 10, 4, y); pen.poly(ctx, [[s.x + s.w * 0.2, s.y + s.h - 70], [s.x + s.w * 0.8, s.y + s.h - 70], [s.x + s.w * 0.7, s.y + s.h - 20], [s.x + s.w * 0.3, s.y + s.h - 20]], { seed: 40, fill: GOLD, lw: 4 }); pen.text(ctx, 'LOW', s.x + s.w / 2, s.y + s.h - 45, 30); }
    }
    // button + pegs
    const bt = this.button; pen.line(ctx, bt.x, bt.y, bt.x + 120, bt.y - 20, 12, 41); pen.blob(ctx, bt.x, bt.y, bt.r, bt.r, { seed: 42, fill: bt.hit ? '#9be84f' : RED }); pen.blob(ctx, bt.x - 12, bt.y - 14, bt.r * 0.4, bt.r * 0.3, { seed: 43, fill: '#fff', lw: 0 }); if (!bt.hit) pen.text(ctx, 'HIT ME', bt.x, bt.y + bt.r + 40, 34, RED, 'center', -0.06);
    for (const pg of this.pegs) { pen.line(ctx, pg.x, pg.y - 400, pg.x, pg.y - 20, 7, pg.x); pen.blob(ctx, pg.x, pg.y, 26, 26, { seed: pg.x, fill: GOLD }); pen.blob(ctx, pg.x, pg.y, 9, 9, { seed: pg.x + 1, fill: INK, lw: 0 }); }
    for (const h of this.hammers) { pen.rect(ctx, h.x + 70, -200, 60, h.y + 200, { seed: h.x, fill: WASH2 }); pen.rect(ctx, h.x, h.y, h.w, h.hh, { seed: h.x + 1, fill: '#8a5a44' }); pen.rect(ctx, h.x - 14, h.y + h.hh - 36, h.w + 28, 36, { seed: h.x + 2, fill: INK }); pen.eye(ctx, h.x + 70, h.y + 60, 16, 0, 1, 0, h.x + 3); pen.eye(ctx, h.x + 130, h.y + 60, 16, 0, 1, 0, h.x + 4); }
    if (this.boss || cx > 6200) this.drawBoss(ctx, pen);
    // entities
    for (const e of this.enemies) if (e !== p.hold) drawEnemy(ctx, pen, e);
    for (const b of this.blots) { pen.blob(ctx, b.x, b.y, 26, 30, { seed: b.t * 9, fill: INK, lw: 0, wob: 0.25 }); }
    if (this.vell.on) drawVell(ctx, pen, this.vell);
    const arm = p.arm, showP = !(this.intro && this.intro.t < 1.7) && !(p.inv > 0 && Math.floor(p.inv * 20) % 2 && p.hurt <= 0) && !(this.fed > 0);
    if (showP) {
      if (arm.state === 'swing') pen.line(ctx, arm.x, arm.y, arm.x, arm.y, 1, 1);
      drawRin(ctx, pen, { x: p.x, y: p.y, face: p.face, sx: p.sx.x, sy: p.sy.x, vx: p.vx, walk: p.walk, ground: p.ground, t: p.t, scarf: p.scarf, blink: p.blink, flat: p.flat, ball: p.ball, hurt: p.hurt, hold: !!p.hold, wind: p.wind, effort: arm.state !== 'idle' || p.wind > 0, armTo: arm.state !== 'idle' ? { x: arm.x, y: arm.y } : null, armTaut: arm.state === 'swing' || arm.state === 'zip' ? 1 : 0, lookY: p.vy > 300 ? 0.6 : p.vy < -300 ? -0.6 : 0 });
      if (p.hold) drawEnemy(ctx, pen, p.hold);
    }
    // effects
    for (const f of this.fx) {
      const k = f.t / 0.6;
      if (f.k === 'burst') pen.burst(ctx, f.x, f.y, f.r * (0.3 + k), f.r * (0.7 + k * 1.2), 9, f.x, 7 * (1 - k));
      if (f.k === 'text') pen.text(ctx, f.text, f.x, f.y - k * 50, 64 * (1 + Math.sin(Math.min(1, k * 3) * Math.PI) * 0.3), f.col, 'center', f.rot);
      if (f.k === 'punch' && f.t < 0.14) { const u = f.t / 0.14, hx = lerp(f.x, f.x1, ease.outBack(Math.min(1, u * 1.6))); pen.hose(ctx, f.x + f.face * 20, f.y, hx, f.y, Math.sin(u * 9) * 12, 13, TEAL, 60); pen.blob(ctx, hx, f.y, 34 + f.w * 26, 30 + f.w * 22, { seed: 61, fill: '#fff' }); pen.burst(ctx, hx + f.face * 40, f.y, 30, 70 + f.w * 50, 7, 62, 6); }
    }
    if (this.flood) this.drawFlood(ctx, pen);
    ctx.globalAlpha = 1; ctx.setTransform(S, 0, 0, S, (g.W - VW * S) / 2, (g.H - VH * S) / 2);
    if (this.intro) this.drawIntro(ctx, S);
    this.drawHud(ctx, pen);
    // letterbox mask
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#0d0f1f'; const ox = (g.W - VW * S) / 2, oy = (g.H - VH * S) / 2; if (ox > 0.5) { ctx.fillRect(0, 0, ox, g.H); ctx.fillRect(g.W - ox, 0, ox + 1, g.H); } if (oy > 0.5) { ctx.fillRect(0, 0, g.W, oy); ctx.fillRect(0, g.H - oy, g.W, oy + 1); }
  }
  drawBoss(ctx, pen) {
    const b = this.boss || { mouth: 0, face: 'sleep', shake: 0, squeeze: 0, hp: 6, state: 'off' }, t = this.t, sq = b.squeeze || 0;
    const X = 8300 + (Math.random() - 0.5) * b.shake * 16, Y = (Math.random() - 0.5) * b.shake * 10;
    ctx.save(); ctx.translate(X, FLOOR + Y); ctx.scale(1 - sq * 0.08 + Math.sin(t * 7) * 0.01, 1 + sq * 0.1 + Math.sin(t * 7 + 1) * 0.012);
    // smokestack puffing, hopper, body
    pen.rect(ctx, 320, -1180, 110, 380, { seed: 101, fill: WASH2 }); for (let i = 0; i < 3; i++) { const k = (t * 0.5 + i / 3) % 1; pen.blob(ctx, 375 - k * 120, -1220 - k * 260, 40 + k * 50, 36 + k * 44, { seed: 102 + i, fill: '#fff', lw: 5 * (1 - k) }); }
    pen.poly(ctx, [[-10, -40], [-10, -820], [120, -960], [760, -960], [760, -40]], { seed: 103, fill: '#c9705f' });
    pen.poly(ctx, [[60, -960], [140, -1090], [460, -1090], [520, -960]], { seed: 104, fill: WASH });
    for (let i = 0; i < 5; i++) pen.blob(ctx, 60 + i * 150, -90, 14, 14, { seed: 105 + i, fill: GOLD, lw: 4, n: 8 });
    // crank wheel
    ctx.save(); ctx.translate(560, -420); ctx.rotate(t * (b.state === 'off' ? 0 : 3)); pen.blob(ctx, 0, 0, 120, 120, { seed: 110, fill: WASH2 }); for (let i = 0; i < 4; i++) pen.line(ctx, 0, 0, Math.cos(i * 1.57) * 110, Math.sin(i * 1.57) * 110, 10, 111 + i); pen.blob(ctx, 0, 0, 26, 26, { seed: 115, fill: GOLD }); ctx.restore();
    // face
    const look = clamp((this.p.x - 8300) / 900, -1, 0), dead = b.face === 'dead', choke = b.face === 'choke';
    for (const [ex, r] of [[90, 74], [290, 62]]) { if (dead || choke) { pen.blob(ctx, ex, -700, r, r, { seed: ex, fill: '#fff' }); pen.line(ctx, ex - r * 0.5, -700 - r * 0.5, ex + r * 0.5, -700 + r * 0.5, 12, ex + 1); pen.line(ctx, ex + r * 0.5, -700 - r * 0.5, ex - r * 0.5, -700 + r * 0.5, 12, ex + 2); } else if (b.face === 'sleep') pen.line(ctx, ex - r, -690, ex + r, -690, 12, ex); else pen.eye(ctx, ex, -700, r, look, 0.3, 0, ex); }
    if (!dead && b.face !== 'sleep') { pen.line(ctx, 0, -830, 170, -770, 16, 120); pen.line(ctx, 360, -800, 220, -770, 16, 121); }
    // mouth = feed tray
    const m = b.mouth; pen.poly(ctx, [[-20, -500], [330, -500], [330, -500 + 40 + m * 200], [-20, -500 + 40 + m * 240]], { seed: 122, fill: INK });
    if (m > 0.3) { for (let i = 0; i < 5; i++) pen.poly(ctx, [[10 + i * 62, -500], [60 + i * 62, -500], [35 + i * 62, -450]], { seed: 123 + i, fill: '#fff', lw: 4 }); pen.blob(ctx, 150, -500 + m * 170, 110, 40 * m, { seed: 129, fill: RED, lw: 4 }); }
    pen.poly(ctx, [[-170, -250 + m * 40], [40, -290], [40, -230], [-170, -200 + m * 40]], { seed: 130, fill: WASH }); // tray
    if (b.state === 'jam') pen.text(ctx, 'FEED ME →', -260, -330 + Math.sin(t * 6) * 10, 54, RED);
    ctx.restore();
    // roller sweeping the floor
    if (b.roller) { const r = b.roller; pen.line(ctx, r.x, FLOOR - 60, 8300, FLOOR - 200, 16, 131); ctx.save(); ctx.translate(r.x, FLOOR - 62); ctx.rotate(-t * 16); pen.blob(ctx, 0, 0, 62, 62, { seed: 132, fill: INK }); pen.line(ctx, -50, 0, 50, 0, 6, 133, CREAM); pen.line(ctx, 0, -50, 0, 50, 6, 134, CREAM); ctx.restore(); }
    else if (b.state === 'roller') { pen.text(ctx, '!!', 8150, FLOOR - 160, 90, RED); }
  }
  drawFlood(ctx, pen) {
    const f = this.flood, t = this.t, D = this.dissolve, cx = this.cam.x, cy = this.cam.y;
    for (const c of f.crates) { pen.rect(ctx, c.x, c.y, c.w, 70, { seed: c.w, fill: '#b08a62' }); pen.line(ctx, c.x, c.y, c.x + c.w, c.y + 70, 5 * (1 - D), c.w + 1); }
    // the ink: one black sea that separates into flat layered sheets (→ paper)
    const cols = ['#17131f', '#2b3350', '#3f5196', '#6b86c9'];
    for (let L = 3; L >= 0; L--) {
      const sep = D * (L * 70), y0 = f.level - sep; if (L > 0 && D <= 0.02) continue;
      ctx.save(); if (D > 0.2) { ctx.shadowColor = 'rgba(10,10,30,0.5)'; ctx.shadowBlur = 24 * D; ctx.shadowOffsetY = -10 * D; }
      ctx.fillStyle = L === 0 ? cols[0] : cols[L]; ctx.beginPath(); ctx.moveTo(cx - 100, cy + VH + 400);
      for (let x = cx - 100; x <= cx + VW + 100; x += 40) { const sm = Math.sin(x * 0.012 + t * (2 - L * 0.3) + L * 2) * (26 - D * 8) + Math.sin(x * 0.031 + L) * 12; const fold = D > 0.5 ? Math.abs(((x * 0.004 + L * 0.3) % 1) - 0.5) * 60 * (D - 0.5) * 2 : 0; ctx.lineTo(x, y0 + sm * (1 - D * 0.5) - fold); }
      ctx.lineTo(cx + VW + 100, cy + VH + 400); ctx.fill(); ctx.restore();
    }
  }
  drawHud(ctx, pen) {
    const p = this.p, g = this.game, t = this.t;
    for (let i = 0; i < 5; i++) { const x = 70 + i * 62, y = 70, on = i < p.hp; ctx.save(); ctx.translate(x, y + (on ? Math.sin(t * 3 + i) * 3 : 0)); ctx.beginPath(); ctx.moveTo(0, -30); ctx.bezierCurveTo(26, 4, 22, 28, 0, 28); ctx.bezierCurveTo(-22, 28, -26, 4, 0, -30); ctx.fillStyle = on ? TEAL : 'rgba(23,19,31,0.12)'; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.stroke(); if (on) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-7, 8, 5, 0, TAU); ctx.fill(); } ctx.restore(); }
    if (p.hold) pen.text(ctx, 'J — THROW  (aim: W A S D)', VW / 2, VH - 70, 36, INK);
    if (this.boss && this.boss.hp > 0 && !this.flood) { pen.text(ctx, 'THE PRESS', VW - 260, 60, 40, RED, 'center', 0.02); for (let i = 0; i < 6; i++) pen.blob(ctx, VW - 420 + i * 64, 120, 24, 24, { seed: 140 + i, fill: i < this.boss.hp ? RED : CREAM, lw: 5, n: 8 }); }
    if (this.title > 0) { const k = clamp(Math.min(this.title, 3.5 - this.title) * 3, 0, 1); ctx.globalAlpha = k; pen.text(ctx, 'CHAPTER 2', VW / 2, 300, 44, RED); pen.text(ctx, 'INK & VIOLENCE', VW / 2, 390, 110, INK, 'center', -0.02); ctx.globalAlpha = 1; }
    const d = g.dialogue.current;
    if (d) { // speech balloon
      const lines = wrapText(g.dialogue.visibleText, 52), full = wrapText(d.text, 52), w = 1100, h = 90 + full.length * 50, x = (VW - w) / 2, y = this.title > 0 ? 470 : 120;
      pen.blob(ctx, VW / 2, y + h / 2, w / 2, h / 2 + 10, { seed: 150, fill: '#fff', wob: 0.02, n: 18 }); pen.poly(ctx, [[x + 150, y + h - 4], [x + 110, y + h + 46], [x + 230, y + h - 2]], { seed: 151, fill: '#fff', lw: 6 }); ctx.fillStyle = '#fff'; ctx.fillRect(x + 150, y + h - 16, 70, 18);
      pen.text(ctx, d.speaker.name, x + 80, y + 44, 30, d.speaker.color === '#f4f6ff' ? INK : d.speaker.color, 'left'); lines.forEach((ln, i) => pen.text(ctx, ln, VW / 2, y + 96 + i * 50, 38, INK));
    }
  }
}
