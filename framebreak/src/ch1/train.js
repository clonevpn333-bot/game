// The 5:15 express — a scripted high-speed set piece. The train is stationary
// in level space; the world scrolls past it. Trackside gantries and signal
// boxes rush in from the right, enemies board, and finally the track behind
// the train stops being rendered, dropping cars one by one.
import { TRAIN } from './level.js';
import { T } from './tiles.js';
import { PAL, ptext } from './pix.js';

const ROOF = TRAIN.roofY * 16, MAXV = 310;

export class TrainRide {
  constructor(ch) { this.ch = ch; this.reset(); }
  reset() {
    const ch = this.ch, L = ch.level;
    this.state = 'parked'; this.t = 0; this.speed = 0; this.scroll = 0; this.obstacles = []; this.falling = []; this.gone = 0; this.ev = 0; this.arrival = 900; this.spawned = [];
    for (const c of [...TRAIN.cars, TRAIN.loco]) L.fill(c, TRAIN.roofY, TRAIN.len, 3, T.TRAIN);
    L.ground(132, 24, 10); this.stationGone = false;
    L.hidden = { x0: TRAIN.dockX };
    ch.player.wallX = TRAIN.dockX * 16 - 2;
    const tr = L.triggers.find((t) => t.id === 'train'); if (tr) tr.fired = false;
    // timeline (seconds since departure)
    this.script = [
      [1.0, () => ch.game.dialogue.say('vell', 'A train! I love things that only go one way.')],
      [5, () => this.wasps(2)],
      [10, () => this.ob('high')], [12.2, () => this.ob('low')], [14.2, () => this.ob('high')], [15.4, () => this.ob('high')], [17.5, () => this.ob('low')], [18.3, () => this.ob('low')],
      [20, () => this.wasps(1)], [22, () => this.ob('high')],
      [25, () => this.drop(2)],
      [33, () => this.ob('low')], [34.4, () => this.ob('high')], [35.6, () => this.ob('low')], [37, () => this.wasps(2)], [38.5, () => this.ob('high')], [39.6, () => this.ob('high')],
      [43, () => this.drop(1)], [44, () => this.ob('low')], [46, () => this.ob('high')], [47.2, () => this.ob('low')], [48.4, () => this.ob('high')],
      [51, () => { ch.game.dialogue.say([{ who: 'vell', text: 'The track behind us just... stopped being drawn.' }, { who: 'vell', text: 'RUN FORWARD!' }]); ch.game.sfx.play('px.alarm'); ch.game.music.stinger(ch.sting.danger); }],
      [54, () => this.dropCar()], [57, () => this.dropCar()], [59, () => this.ob('high')], [60, () => this.dropCar()], [62, () => this.ob('low')], [63, () => this.dropCar()], [66, () => this.dropCar()],
      [67, () => { this.state = 'arrive'; ch.game.sfx.play('px.horn'); }],
    ];
  }
  start() {
    if (this.state !== 'parked') return;
    const ch = this.ch; this.state = 'run'; this.t = 0;
    ch.game.sfx.play('px.horn'); ch.game.music.queue('train'); ch.game.music.setIntensity(2); ch.shake(2, 0.5);
  }
  wasps(n) { const ch = this.ch; for (let i = 0; i < n; i++) this.spawned.push(ch.spawnEntity('wasp', ch.cam.x + 330 + i * 30, ROOF - 50 - i * 16)); }
  drop(n) { const ch = this.ch; for (let i = 0; i < n; i++) { const e = ch.spawnEntity('scrapper', ch.player.x + 70 + i * 34, ROOF - 150 - i * 30); if (e) { e.facing = -1; this.spawned.push(e); } } ch.game.sfx.play('px.alarm', { vol: 0.6 }); }
  ob(kind) { this.obstacles.push({ kind, x: this.ch.cam.x + 320 + 290, warn: 0.95 }); this.ch.game.sfx.play('px.telegraph', { pitch: kind === 'high' ? 1.3 : 0.8 }); }
  dropCar() {
    const ch = this.ch, i = this.gone; if (i >= TRAIN.cars.length) return;
    const x = TRAIN.cars[i]; this.gone++;
    ch.level.fill(x, TRAIN.roofY, TRAIN.len, 3, T.EMPTY);
    this.falling.push({ x: x * 16, y: ROOF, vx: -60, vy: 10, kind: i % 2 });
    ch.game.sfx.play('px.tear'); ch.game.sfx.play('px.crumble', { pitch: 0.6 }); ch.shake(5, 0.35);
    for (let k = 0; k < 14; k++) ch.fx.spark(x * 16 + Math.random() * 192, ROOF + Math.random() * 40, -80 - Math.random() * 100, -60 + Math.random() * 60, k % 2 ? 'M' : 'm', 0.6, 0, 2);
  }
  // first x (tile) that is still solid train
  get rearX() { return this.gone >= TRAIN.cars.length ? TRAIN.loco : TRAIN.cars[this.gone]; }
  unsafe(tx) { return tx < this.rearX; }

  update(dt) {
    const ch = this.ch, pl = ch.player;
    if (this.state === 'parked' || this.state === 'done') return;
    this.t += dt;
    if (this.state === 'run') {
      this.speed = Math.min(MAXV, this.speed + 110 * dt);
      if (!this.stationGone && this.t > 2.2) { this.stationGone = true; ch.level.fill(132, 24, 11, ch.level.H - 24, T.EMPTY); }
      while (this.ev < this.script.length && this.t >= this.script[this.ev][0]) this.script[this.ev++][1]();
      if (Math.floor(this.t * 5) !== Math.floor((this.t - dt) * 5) && this.speed > 100) ch.game.sfx.play('px.train', { vol: 0.35 });
    } else if (this.state === 'arrive') {
      this.arrival -= this.speed * dt;
      if (this.arrival < 260) this.speed = Math.max(120, this.speed - 260 * dt);
      if (this.arrival <= 0) this.crash();
    }
    this.scroll += this.speed * dt;
    // wind: airborne bodies drift back along the roof
    if (!pl.onGround && this.speed > 200 && pl.state !== 'dash') pl.x -= 14 * dt;
    for (const o of this.obstacles) {
      o.x -= this.speed * dt; o.warn -= dt;
      const hb = pl.hurtbox;
      const box = o.kind === 'high' ? { x: o.x - 5, y: ROOF - 400, w: 10, h: 400 - 13 } : { x: o.x - 6, y: ROOF - 13, w: 12, h: 13 };
      if (hb.x < box.x + box.w && hb.x + hb.w > box.x && hb.y < box.y + box.h && hb.y + hb.h > box.y) { if (pl.hurt(1, -1)) { ch.fx.hit(pl.x, pl.y - 14, true); ch.game.sfx.play('px.clank'); } }
    }
    this.obstacles = this.obstacles.filter((o) => o.x > ch.cam.x - 60);
    for (const f of this.falling) { f.vy += 420 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vx -= 200 * dt; }
    this.falling = this.falling.filter((f) => f.y < ch.level.H * 16 + 100);
  }
  crash() {
    const ch = this.ch; this.state = 'done'; this.speed = 0; this.arrival = 0; ch.level.hidden = null; ch.player.wallX = null; this.obstacles.length = 0;
    ch.shake(12, 0.8); ch.flash(0.25, '#f4f6ff'); ch.hitstop(0.12); ch.game.sfx.play('px.explode', { pitch: 0.6 }); ch.game.sfx.play('px.slam');
    const nx = (TRAIN.loco + TRAIN.len) * 16; for (let i = 0; i < 5; i++) ch.fx.boom(nx - 10 + Math.random() * 30, ROOF + Math.random() * 40); ch.fx.gib(nx, ROOF + 10, 8);
    ch.game.music.queue('A'); ch.game.music.setIntensity(1);
    ch.game.dialogue.say([{ who: 'rin', text: 'Somebody is deleting the grid on purpose.' }, { who: 'vell', text: 'A tidy somebody. Calls himself the Curator. Hates loose ends.' }]);
  }

  // ---- drawing ----------------------------------------------------------------
  drawRails(ctx, cam) {
    const ch = this.ch, y = ROOF + 60 - cam.y, off = Math.floor(this.scroll) % 16;
    const x0 = Math.max(0, 140 * 16 - cam.x), x1 = this.ch.level.hidden ? 320 : Math.min(320, TRAIN.dockX * 16 - cam.x);
    if (x1 <= x0) return;
    // the unrendered part of the track (behind the last car) is simply missing
    const cut = this.gone > 0 ? Math.max(x0, this.rearX * 16 - cam.x - 30) : x0;
    ctx.fillStyle = PAL.K; ctx.fillRect(cut, y, x1 - cut, 3); ctx.fillStyle = PAL.h; ctx.fillRect(cut, y, x1 - cut, 1);
    for (let x = cut - off; x < x1; x += 16) { if (x < cut) continue; ctx.fillStyle = PAL.D; ctx.fillRect(x, y + 3, 6, 2); }
    // bridge trusses rushing by
    const toff = Math.floor(this.scroll) % 64;
    for (let x = cut - toff; x < x1; x += 64) { if (x < cut - 8) continue; ctx.fillStyle = PAL.k; ctx.fillRect(x, y + 5, 4, 200); ctx.fillRect(x - 12, y + 5, 28, 3); for (let i = 0; i < 6; i++) ctx.fillRect(x + 4 + i * 4, y + 8 + i * 4, 4, 2); }
    if (this.gone > 0) for (let i = 0; i < 10; i++) { ctx.fillStyle = i % 2 ? PAL.M : PAL.U; ctx.fillRect(cut - 2 - ((i * 37 + ch.frame * 3) % 40), y - 6 + ((i * 13) % 14), 2, 2); }
  }
  drawCars(ctx, cam, bg) {
    const ch = this.ch, wf = bg.wheels[Math.floor(this.scroll / 4) % 4];
    const car = (img, px, py) => {
      const x = Math.round(px - cam.x), y = Math.round(py - cam.y); if (x > 330 || x < -200) return;
      ctx.drawImage(img, x, y);
      for (const wx of [14, 34, 144, 164]) ctx.drawImage(wf, x + wx, y + 49);
    };
    TRAIN.cars.forEach((c, i) => { if (i >= this.gone) car(i % 2 ? bg.car1 : bg.car0, c * 16, ROOF); });
    car(bg.loco, TRAIN.loco * 16, ROOF);
    // couplers
    ctx.fillStyle = PAL.G; [...TRAIN.cars.slice(1), TRAIN.loco].forEach((c, i) => { if (i + 1 > this.gone || (i + 1 === this.gone && false)) ctx.fillRect(c * 16 - 32 - cam.x, ROOF + 39 - cam.y, 32, 3); });
    for (const f of this.falling) { ctx.drawImage(f.kind ? bg.car1 : bg.car0, Math.round(f.x - cam.x), Math.round(f.y - cam.y)); }
    // speed lines
    if (this.speed > 150) { ctx.fillStyle = PAL.L; for (let i = 0; i < 7; i++) { const yy = (i * 53 + 20) % 170, xx = 320 - ((this.scroll * 1.7 + i * 97) % 420); ctx.fillRect(Math.round(xx), yy, 22 + (i % 3) * 10, 1); } }
  }
  drawObstacles(ctx, cam) {
    const ch = this.ch;
    for (const o of this.obstacles) {
      const x = Math.round(o.x - cam.x), ry = ROOF - cam.y;
      if (o.kind === 'high') {
        ctx.fillStyle = PAL.K; ctx.fillRect(x - 6, 0, 12, ry - 12); ctx.fillStyle = PAL.G; ctx.fillRect(x - 5, 0, 10, ry - 13); ctx.fillStyle = PAL.h; ctx.fillRect(x - 5, 0, 2, ry - 13);
        for (let y = ry - 20; y > 0; y -= 12) { ctx.fillStyle = PAL.g; ctx.fillRect(x - 3, y, 6, 6); }
        ctx.fillStyle = PAL.y; ctx.fillRect(x - 7, ry - 19, 14, 6); ctx.fillStyle = PAL.K; for (let i = 0; i < 3; i++) ctx.fillRect(x - 6 + i * 5, ry - 18, 2, 4); ctx.fillStyle = PAL.R; ctx.fillRect(x - 2, ry - 25, 4, 4);
      } else {
        ctx.fillStyle = PAL.K; ctx.fillRect(x - 7, ry - 14, 14, 14); ctx.fillStyle = PAL.e; ctx.fillRect(x - 6, ry - 13, 12, 12); ctx.fillStyle = PAL.a; ctx.fillRect(x - 6, ry - 13, 12, 2); ctx.fillStyle = PAL.y; ctx.fillRect(x - 4, ry - 9, 8, 3); ctx.fillStyle = PAL.R; ctx.fillRect(x - 1, ry - 17, 3, 3);
      }
      if (o.warn > 0 && Math.floor(o.warn * 12) % 2 === 0) { // incoming marker at the right edge
        const wy = o.kind === 'high' ? ry - 34 : ry - 12; ctx.fillStyle = PAL.K; ctx.fillRect(301, wy - 6, 17, 13); ctx.fillStyle = o.kind === 'high' ? PAL.O : PAL.y; ctx.fillRect(302, wy - 5, 15, 11);
        ptext(ctx, o.kind === 'high' ? 'v' : '^', 307, wy - 3, PAL.K, 0, null);
      }
    }
    void ch;
  }
}
