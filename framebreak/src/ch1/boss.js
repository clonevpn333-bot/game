// GRIDLOCK — three-phase boss. It hangs from a ceiling rail, fights with two
// chain fists, and in its last phase starts ripping the pixel grid itself.
import { BOSS_ROOM } from './level.js';
import { T } from './tiles.js';
import { PAL } from './pix.js';
import { approach, clamp, lerp } from '../core/util.js';

const R = BOSS_ROOM, X0 = R.x0 * 16, X1 = R.x1 * 16, FLOOR = R.floorY * 16, CEIL = R.ceilY * 16;
export const BOSS_MAXHP = 64;

export class Gridlock {
  constructor(ch) {
    this.ch = ch; this.x = (X0 + X1) / 2; this.baseY = CEIL + 42; this.y = this.baseY - 110; this.lower = 0;
    this.hp = BOSS_MAXHP; this.phase = 1; this.state = 'intro'; this.st = 0; this.t = 0; this.flash = 0; this.face = 'idle'; this.faceT = 0;
    this.fists = [-1, 1].map((s) => ({ side: s, x: this.x + s * 74, y: this.y + 34, hx: s * 74, hy: 34, state: 'home', t: 0, frame: 'closed', solid: { x: 0, y: 0, w: 30, h: 26, dx: 0, dy: 0, off: true }, flash: 0 }));
    this.pattern = 0; this.cool = 1.2; this.summoned = false; this.laser = null; this.chunks = []; this.dead = false; this.active = false;
    this.voidCols = new Set(); this.tearT = 0; this.shakeX = 0; this.pull = 0;
    for (const f of this.fists) ch.solids.push(f.solid);
  }
  get stateIdx() { return this.phase - 1; }
  set(s) { this.state = s; this.st = 0; }
  setFace(f, t = 0.6) { this.face = f; this.faceT = t; }

  // ---- damage in ---------------------------------------------------------------
  hitBoxes() {
    const b = [{ x: this.x - 12, y: this.y + 8, w: 24, h: 24, mul: this.phase === 3 ? 1.5 : 1, part: 'core' }, { x: this.x - 20, y: this.y - 30, w: 40, h: 28, mul: 0.6, part: 'head' }];
    for (const f of this.fists) if (f.state === 'stuck') b.push({ x: f.x - 16, y: f.y - 16, w: 32, h: 32, mul: 0.5, part: 'fist', fist: f });
    return b;
  }
  takeBox(box, m, set, dir) {
    if (this.dead || !this.active || this.state === 'intro') return 0;
    if (set.has(this)) return 0;
    for (const hb of this.hitBoxes()) {
      if (box.x < hb.x + hb.w && box.x + box.w > hb.x && box.y < hb.y + hb.h && box.y + box.h > hb.y) {
        set.add(this); this.damage(m.dmg * hb.mul, hb, Math.max(box.x, hb.x) + 6, Math.max(box.y, hb.y) + 6, m.heavy); return 1;
      }
    }
    return 0;
  }
  hitByBarrel(b) { for (const hb of this.hitBoxes()) if (b.x > hb.x - 8 && b.x < hb.x + hb.w + 8 && b.y - 9 > hb.y - 8 && b.y - 9 < hb.y + hb.h + 8) return true; return false; }
  damage(d, hb, fx, fy, heavy) {
    const ch = this.ch; this.hp -= d; this.flash = 0.09; if (hb?.fist) hb.fist.flash = 0.09;
    ch.fx.hit(fx, fy, heavy); ch.game.sfx.play(heavy ? 'px.hitbig' : 'px.hit', { pitch: 0.8 }); if (hb?.part === 'core') this.setFace('hurt', 0.35);
    if (this.hp <= 0) { this.hp = 0; this.die(); return; }
    const want = this.hp <= BOSS_MAXHP * 0.34 ? 3 : this.hp <= BOSS_MAXHP * 0.68 ? 2 : 1;
    if (want > this.phase) this.nextPhase(want);
  }
  nextPhase(p) {
    const ch = this.ch; this.phase = p; this.set('roar'); this.laser = null; this.cool = 1;
    for (const f of this.fists) if (f.state !== 'home') { f.state = 'return'; f.t = 0; }
    ch.game.sfx.play('px.bossroar'); ch.shake(8, 0.9); ch.fx.gib(this.x - 30, this.y, 5); ch.fx.gib(this.x + 30, this.y + 10, 5); ch.fx.boom(this.x + 24, this.y - 6); ch.fx.boom(this.x - 28, this.y + 20);
    ch.game.music.setIntensity(p === 2 ? 3 : 3); ch.game.music.queue(p === 2 ? 'boss2' : 'boss3');
    if (p === 2) ch.game.dialogue.say('boss', 'GRID INTEGRITY... NEGOTIABLE.');
    if (p === 3) { ch.game.dialogue.say([{ who: 'boss', text: 'IF I CANNOT ALIGN YOU, I WILL UNMAKE THE GRID.' }, { who: 'vell', text: "It's tearing the pixels off the world! That is NOT a figure of speech!" }]); ch.startTear(); }
  }
  die() {
    this.dead = true; this.set('dying'); this.laser = null; this.setFace('dead', 99);
    for (const f of this.fists) { f.state = 'limp'; f.t = 0; f.solid.off = true; }
    this.ch.onBossDefeated();
  }

  // ---- floor ripping ------------------------------------------------------------
  ripColumn(tx) {
    const L = this.ch.level; if (tx <= R.x0 + 1 || tx >= R.x1 - 2 || this.voidCols.has(tx) || this.voidCols.size >= 9) return false;
    if (this.voidCols.has(tx - 1) && this.voidCols.has(tx - 2)) return false; if (this.voidCols.has(tx + 1) && this.voidCols.has(tx + 2)) return false;
    this.voidCols.add(tx); for (let y = R.floorY; y < L.H; y++) L.set(tx, y, T.EMPTY);
    this.ch.fx.burst(tx * 16 + 8, FLOOR + 4, 14, ['m', 'M', 'U', 'W'], 150); this.ch.game.sfx.play('px.tear', { vol: 0.7 });
    return true;
  }

  update(dt) {
    const ch = this.ch, pl = ch.player; this.t += dt; this.st += dt; this.flash -= dt; this.faceT -= dt; this.cool -= dt;
    if (this.faceT <= 0 && !this.dead) this.face = this.phase === 1 ? 'idle' : 'angry';
    const fast = this.phase === 3 ? 0.7 : this.phase === 2 ? 0.85 : 1;

    // body: lowers while a fist is stuck; drifts along the rail toward the player
    const anyStuck = this.fists.some((f) => f.state === 'stuck');
    this.lower = approach(this.lower, anyStuck ? 1 : 0, dt * 2.2);
    let targetY = this.baseY + this.lower * 44 + Math.sin(this.t * 1.7) * 2;
    if (this.state === 'intro') { targetY = this.baseY; this.y = approach(this.y, targetY, 70 * dt); if (this.st > 2.4) { this.set('idle'); this.active = true; this.cool = 1; } }
    else if (this.state === 'dying') { /* driven by chapter outro */ }
    else {
      this.y = lerp(this.y, targetY, 1 - Math.exp(-8 * dt));
      if (!anyStuck && this.state !== 'laser') this.x = approach(this.x, clamp(pl.x, X0 + 96, X1 - 96), 26 * dt);
    }
    this.shakeX = this.state === 'roar' ? (Math.floor(this.t * 40) % 2 ? 2 : -2) : 0;

    if (this.state === 'roar') { this.setFace('angry', 0.2); if (this.st > 1.3) { if (this.phase === 2) { this.set('rip'); } else this.set('idle'); } }
    else if (this.state === 'rip') { // phase 2 opener: both fists tear tiles out
      if (this.st < 0.05) { let n = 0; for (const tx of [R.x0 + 5, R.x0 + 6, R.x1 - 7, R.x1 - 6]) setTimeout(() => this.ripColumn(tx), 150 * n++); ch.shake(6, 0.6); }
      if (this.st > 1) this.set('idle');
    }
    else if (this.state === 'idle' && this.cool <= 0 && pl.state !== 'dead') this.chooseAttack();
    else if (this.state === 'bullets') {
      this.setFace('charge', 0.1);
      const volleys = this.phase === 3 ? 5 : 3, t0 = 0.6 * fast;
      const k = Math.floor((this.st - t0) / (0.42 * fast));
      if (this.st > t0 && k >= this.volley && this.volley < volleys) {
        this.volley++; const aim = Math.atan2(pl.y - 12 - (this.y - 16), pl.x - this.x), n = this.phase === 1 ? 3 : 5;
        for (let i = 0; i < n; i++) { const a = aim + (i - (n - 1) / 2) * 0.24 + (this.volley % 2 ? 0.08 : -0.08); ch.spawnBullet(this.x, this.y - 16, Math.cos(a) * 98, Math.sin(a) * 98, true); }
        ch.game.sfx.play('px.shot', { pitch: 0.5 });
      }
      if (this.volley >= volleys && this.st > t0 + volleys * 0.42 * fast + 0.3) { this.set('idle'); this.cool = 0.9 * fast; }
    }
    else if (this.state === 'laser') {
      const L = this.laser; this.setFace('charge', 0.1);
      if (this.st < 0.8) { L.on = false; }
      else { if (!L.on) { L.on = true; ch.game.sfx.play('px.laser'); } L.x += L.dir * 210 * dt / fast * 0.9; ch.shake(1.5, 0.05);
        if (Math.abs(pl.x - L.x) < 7 && pl.y > this.y) pl.hurt(1, L.dir);
        if (ch.frame % 2 === 0) ch.fx.spark(L.x, FLOOR - 1, (Math.random() - 0.5) * 120, -60 - Math.random() * 80, 'M', 0.3);
        if ((L.dir > 0 && L.x > X1 - 12) || (L.dir < 0 && L.x < X0 + 12)) { this.laser = null; this.set('idle'); this.cool = 0.8 * fast; } }
    }
    else if (this.state === 'attack') { if (this.fists.every((f) => f.state === 'home')) { this.set('idle'); this.cool = (this.phase === 1 ? 1.0 : 0.6) * fast; } }

    for (const f of this.fists) this.updateFist(f, dt, fast);
    // thrown chunks
    for (const c of this.chunks) {
      c.vy += 420 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.t += dt;
      if (Math.abs(pl.x - c.x) < 11 && Math.abs(pl.y - 12 - c.y) < 15) { pl.hurt(1, Math.sign(c.vx) || 1); c.dead = true; }
      if (c.y > FLOOR - 6 || c.x < X0 || c.x > X1) c.dead = true;
      if (c.dead) { ch.fx.burst(c.x, c.y, 10, ['h', 'G', 'i'], 130); ch.game.sfx.play('px.crumble'); ch.shake(2, 0.1); }
    }
    this.chunks = this.chunks.filter((c) => !c.dead);
    // phase 3: the grid keeps coming apart
    if (this.phase === 3 && !this.dead) { this.tearT -= dt; if (this.tearT <= 0) { this.tearT = 5.5; const tx = R.x0 + 2 + Math.floor(Math.random() * (R.x1 - R.x0 - 4)); if (Math.abs(tx * 16 + 8 - pl.x) > 20) this.ripColumn(tx); } }
  }

  chooseAttack() {
    const lists = [['slam', 'bullets', 'slam', 'sweep'], ['throw', 'slam2', 'laser', 'bullets', 'sweep', 'throw'], ['slam2', 'laser', 'throw', 'bullets', 'sweep']];
    const list = lists[this.phase - 1]; let a = list[this.pattern++ % list.length];
    const pl = this.ch.player, near = this.fists.slice().sort((p, q) => Math.abs(p.x - pl.x) - Math.abs(q.x - pl.x));
    if (this.phase >= 2 && !this.summoned) { this.summoned = true; this.ch.spawnEntity('wasp', this.x - 90, CEIL + 50); this.ch.spawnEntity('wasp', this.x + 90, CEIL + 50); this.ch.game.sfx.play('px.alarm'); }
    if (a === 'slam') { this.startFist(near[0], 'track'); this.set('attack'); }
    else if (a === 'slam2') { this.startFist(near[0], 'track'); near[1].delay = 0.75; this.startFist(near[1], 'wait'); this.set('attack'); }
    else if (a === 'sweep') { const f = this.fists[pl.x < this.x ? 1 : 0]; this.startFist(f, 'sweepPrep'); this.set('attack'); }
    else if (a === 'throw') { this.startFist(near[1], 'grabMove'); this.set('attack'); }
    else if (a === 'bullets') { this.set('bullets'); this.volley = 0; this.ch.game.sfx.play('px.telegraph', { pitch: 0.6 }); }
    else if (a === 'laser') { const dir = pl.x > this.x ? -1 : 1; this.laser = { x: dir > 0 ? X0 + 14 : X1 - 14, dir, on: false }; this.set('laser'); this.ch.game.sfx.play('px.alarm'); }
  }
  startFist(f, s) { f.state = s; f.t = 0; }

  updateFist(f, dt, fast) {
    const ch = this.ch, pl = ch.player, home = { x: this.x + f.hx, y: this.y + f.hy + Math.sin(this.t * 2 + f.side) * 3 };
    f.t += dt; f.flash -= dt; f.solid.off = true; const px = f.x, py = f.y;
    const hurtTouch = (pad = 0) => { if (Math.abs(pl.x - f.x) < 17 + pad && pl.y > f.y - 16 && pl.y - pl.h < f.y + 16) pl.hurt(1, Math.sign(pl.x - f.x) || 1); };
    switch (f.state) {
      case 'home': f.x = lerp(f.x, home.x, 1 - Math.exp(-7 * dt)); f.y = lerp(f.y, home.y, 1 - Math.exp(-7 * dt)); f.frame = 'closed'; break;
      case 'wait': f.x = lerp(f.x, home.x, 0.1); f.y = lerp(f.y, home.y, 0.1); if (f.t >= (f.delay || 0)) this.startFist(f, 'track'); break;
      case 'track': {
        f.frame = 'closed'; const tx = clamp(pl.x, X0 + 18, X1 - 18), ty = CEIL + 44;
        f.x = lerp(f.x, tx, 1 - Math.exp(-6 * dt)); f.y = lerp(f.y, ty, 1 - Math.exp(-8 * dt));
        if (f.t > 0.75 * fast) { this.startFist(f, 'hold'); ch.game.sfx.play('px.telegraph'); }
        break;
      }
      case 'hold': f.frame = 'slam'; f.x += Math.floor(this.t * 50) % 2 ? 1 : -1; if (f.t > 0.26 * fast) this.startFist(f, 'fall'); break;
      case 'fall':
        f.frame = 'slam'; f.y += 660 * dt; hurtTouch(0);
        if (f.y >= FLOOR - 15) {
          f.y = FLOOR - 15; this.startFist(f, 'stuck'); ch.game.sfx.play('px.slam'); ch.shake(7, 0.3); ch.hitstop(0.04);
          ch.fx.sprite('fx_dust', f.x - 20, FLOOR, 4, 14); ch.fx.sprite('fx_dust', f.x + 20, FLOOR, 4, 14); ch.fx.burst(f.x, FLOOR - 2, 12, ['i', 'h', 'W'], 150);
          if (pl.onGround && Math.abs(pl.x - f.x) < 44) pl.hurt(1, Math.sign(pl.x - f.x) || 1);
          if (this.phase >= 2 && Math.random() < 0.5) this.ripColumn(Math.floor(f.x / 16) + (Math.random() < 0.5 ? -2 : 2));
        }
        break;
      case 'stuck': f.frame = 'closed'; f.solid.off = false; f.solid.x = f.x - 15; f.solid.y = f.y - 12; f.solid.dx = f.solid.dy = 0; if (f.t > (this.phase === 1 ? 2.3 : this.phase === 2 ? 1.8 : 1.5)) this.startFist(f, 'return'); break;
      case 'return': f.frame = 'open'; f.x = lerp(f.x, home.x, 1 - Math.exp(-6 * dt)); f.y = lerp(f.y, home.y, 1 - Math.exp(-6 * dt)); if (f.t > 0.55) this.startFist(f, 'home'); break;
      case 'sweepPrep': {
        f.frame = 'open'; const sx = f.side < 0 ? X0 + 20 : X1 - 20; f.x = lerp(f.x, sx, 1 - Math.exp(-7 * dt)); f.y = lerp(f.y, FLOOR - 17, 1 - Math.exp(-7 * dt));
        if (f.t > 0.3 && ch.frame % 3 === 0) ch.fx.spark(f.x, FLOOR - 2, -f.side * 80, -90, 'y', 0.3);
        if (f.t > 0.85 * fast) { this.startFist(f, 'sweep'); ch.game.sfx.play('px.dash', { pitch: 0.6 }); }
        break;
      }
      case 'sweep': f.frame = 'closed'; f.x -= f.side * 255 * dt / Math.max(0.8, fast); f.y = FLOOR - 17; hurtTouch(-2); if (ch.frame % 2 === 0) ch.fx.spark(f.x + f.side * 14, FLOOR - 1, f.side * 60, -70, 'y', 0.25);
        if ((f.side < 0 && f.x > X1 - 22) || (f.side > 0 && f.x < X0 + 22)) this.startFist(f, 'return'); break;
      case 'grabMove': {
        f.frame = 'open'; if (f.t < 0.02) { let tx = Math.floor((pl.x + (pl.x < this.x ? 64 : -64)) / 16); tx = clamp(tx, R.x0 + 3, R.x1 - 4); f.gx = tx; }
        f.x = lerp(f.x, f.gx * 16 + 8, 1 - Math.exp(-7 * dt)); f.y = lerp(f.y, FLOOR - 15, 1 - Math.exp(-7 * dt));
        if (f.t > 0.6 * fast) { this.startFist(f, 'grabLift'); this.ripColumn(f.gx); f.holding = true; }
        break;
      }
      case 'grabLift': f.frame = 'closed'; f.y = lerp(f.y, CEIL + 60, 1 - Math.exp(-6 * dt)); f.x = lerp(f.x, home.x, 1 - Math.exp(-3 * dt));
        if (f.t > 0.55 * fast) { f.holding = false; const T2 = 0.85, vx = (pl.x - f.x) / T2, vy = (pl.y - 14 - f.y) / T2 - 0.5 * 420 * T2; this.chunks.push({ x: f.x, y: f.y + 14, vx, vy, t: 0, v: Math.random() < 0.5 ? 0 : 1 }); ch.game.sfx.play('px.swing', { pitch: 0.5 }); this.startFist(f, 'return'); }
        break;
      case 'limp': f.frame = 'open'; break;
    }
    if (f.state !== 'stuck') { f.solid.dx = f.x - px; f.solid.dy = f.y - py; }
  }

  draw(ctx, atlas, cam) {
    const bx = Math.round(this.x + this.shakeX - cam.x), by = Math.round(this.y - cam.y);
    const sc = this.ch.outro ? this.ch.outro.bossScale : null;
    // rail
    ctx.fillStyle = PAL.K; ctx.fillRect(X0 - cam.x, CEIL - cam.y, X1 - X0, 5); ctx.fillStyle = PAL.G; ctx.fillRect(X0 - cam.x, CEIL - cam.y + 1, X1 - X0, 2); ctx.fillStyle = PAL.h; ctx.fillRect(X0 - cam.x, CEIL - cam.y + 1, X1 - X0, 1);
    for (let x = X0 + 6; x < X1; x += 24) { ctx.fillStyle = PAL.y; ctx.fillRect(x - cam.x, CEIL - cam.y + 3, 6, 1); }
    // hanger from rail down to trolley when lowered
    const railY = CEIL - cam.y + 4, topY = by - 42;
    if (topY > railY) { ctx.fillStyle = PAL.K; ctx.fillRect(bx - 5, railY, 10, topY - railY); ctx.fillStyle = PAL.G; ctx.fillRect(bx - 4, railY, 8, topY - railY); ctx.fillStyle = PAL.i; ctx.fillRect(bx - 2, railY, 2, topY - railY); for (let y = railY + 2; y < topY; y += 6) { ctx.fillStyle = PAL.K; ctx.fillRect(bx - 4, y, 8, 1); } }
    // chains
    for (const f of this.fists) {
      const sx = this.x + f.side * 47, sy = this.y - 4, ex = f.x, ey = f.y - 18, n = Math.max(3, Math.floor(Math.hypot(ex - sx, ey - sy) / 8));
      const sag = f.state === 'home' || f.state === 'limp' ? 10 : 3;
      for (let i = 1; i < n; i++) { const u = i / n; atlas.draw(ctx, 'boss_link', lerp(sx, ex, u) - cam.x, lerp(sy, ey, u) + Math.sin(u * Math.PI) * sag - cam.y); }
    }
    if (sc) { // dying: stretched toward the rift
      const f = atlas.frames['boss_body' + this.stateIdx]; ctx.save(); ctx.translate(bx, by); ctx.scale(sc.x, sc.y);
      ctx.drawImage(atlas.R, f.x, f.y, f.w, f.h, -f.ox, -f.oy, f.w, f.h); ctx.restore();
    } else {
      atlas.draw(ctx, 'boss_body' + this.stateIdx, bx, by, false, this.flash > 0);
      // CRT face with scanline flicker
      if (!(this.face === 'dead' && Math.floor(this.t * 24) % 3 === 0)) atlas.draw(ctx, 'boss_face_' + this.face, bx, by - 16 + (Math.floor(this.t * 12) % 9 === 0 ? 1 : 0), this.face === 'dead' && Math.floor(this.t * 12) % 2 === 0);
      if (this.phase === 3 && Math.floor(this.t * 16) % 2) { ctx.fillStyle = PAL.W; ctx.fillRect(bx - 2, by + 17, 3, 3); }
    }
    for (const f of this.fists) {
      atlas.draw(ctx, 'boss_fist_' + f.frame, f.x - cam.x, f.y - cam.y, f.side > 0, f.flash > 0);
      if (f.holding) atlas.draw(ctx, 'boss_chunk0', f.x - cam.x, f.y + 18 - cam.y);
      if (f.state === 'track' || f.state === 'hold') { ctx.fillStyle = f.state === 'hold' && Math.floor(this.t * 20) % 2 ? PAL.Y : PAL.R; ctx.fillRect(Math.round(f.x - 14 - cam.x), FLOOR - cam.y, 28, 2); ctx.fillRect(Math.round(f.x - 8 - cam.x), FLOOR - cam.y - 2, 16, 1); }
    }
    for (const c of this.chunks) atlas.draw(ctx, 'boss_chunk' + c.v, c.x - cam.x, c.y - cam.y, Math.floor(c.t * 10) % 2 === 0);
    // laser
    if (this.laser) {
      const L = this.laser, lx = Math.round(L.x - cam.x), y0 = by - 10, y1 = FLOOR - cam.y;
      if (!L.on) { if (Math.floor(this.t * 16) % 2) { ctx.fillStyle = PAL.M; for (let y = y0; y < y1; y += 4) ctx.fillRect(lx, y, 1, 2); } ctx.fillStyle = PAL.R; ctx.fillRect(lx - 6, y1, 12, 2); }
      else { ctx.fillStyle = PAL.U; ctx.fillRect(lx - 5, y0, 10, y1 - y0); ctx.fillStyle = PAL.m; ctx.fillRect(lx - 3, y0, 6, y1 - y0); ctx.fillStyle = PAL.M; ctx.fillRect(lx - 2, y0, 4, y1 - y0); ctx.fillStyle = PAL.W; ctx.fillRect(lx - 1, y0, 2, y1 - y0);
        for (let y = y0 + (Math.floor(this.t * 30) % 4); y < y1; y += 4) { ctx.fillStyle = PAL.U; ctx.fillRect(lx - 6, y, 1, 2); ctx.fillRect(lx + 5, y + 2, 1, 2); }
        // beam path from the head to the column
        ctx.fillStyle = PAL.M; const hx = bx; for (let i = 0; i < 10; i++) { const u = i / 10; ctx.fillRect(Math.round(lerp(hx, lx, u)), Math.round(lerp(by - 16, y0, u)), 2, 2); } }
    }
  }
}
