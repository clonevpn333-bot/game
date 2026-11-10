// CHAPTER 1 — PIXEL PANIC. True 2D pixel art: a 320x180 framebuffer, baked
// palette sprites, integer scaling, pixel-snapped camera.
import { Atlas, PAL, ptext } from './pix.js';
import { addRinFrames } from './sprites_rin.js';
import { addWorldFrames } from './sprites_world.js';
import { addBossFrames } from './sprites_boss.js';
import { Tileset, T, TS, isSolid } from './tiles.js';
import { buildBackgrounds, VW, VH } from './background.js';
import { buildLevel, TRAIN, BOSS_ROOM } from './level.js';
import { Player } from './player.js';
import { SPAWN, Gate, Pickup } from './enemies.js';
import { Gridlock, BOSS_MAXHP } from './boss.js';
import { TrainRide } from './train.js';
import { Fx, Combo } from './fx.js';
import { overlap } from './physics.js';
import { SONG_CH1, STING } from '../audio/songs/ch1.js';
import { makeCanvas, clamp, lerp, damp, hash2 } from '../core/util.js';
import { wrapText } from '../core/dialogue.js';

const BR = BOSS_ROOM;

export default class Chapter1 {
  constructor(game) { this.game = game; this.id = 1; this.sting = STING; }

  async load() {
    this.atlas = new Atlas(); addRinFrames(this.atlas); addWorldFrames(this.atlas); addBossFrames(this.atlas); this.atlas.bake(1024);
    this.tiles = new Tileset(); this.bg = buildBackgrounds();
    this.buf = makeCanvas(VW, VH); this.bx = this.buf.getContext('2d'); this.bx.imageSmoothingEnabled = false;
  }

  start({ checkpoint }) {
    const g = this.game;
    this.level = buildLevel(); this.fx = new Fx(this); this.combo = new Combo(this); this.player = new Player(this);
    this.entities = []; this.solids = []; this.shots = []; this.bullets = []; this.gates = {};
    this.cam = { x: 0, y: 0, look: 0, ty: 0 }; this.frame = 0; this.time = 0; this.stopT = 0; this.shakeT = 0; this.shakeMag = 0; this.flashT = 0; this.flashC = '#fff';
    this.tear = 0; this.tearOn = false; this.boss = null; this.outro = null; this.arena = null; this.vell = null; this.title = 4.2; this.ended = false;
    this.smoke = []; this.blocks = [];
    for (const s of this.level.spawns) this.spawnEntity(s.type, s.x, s.y, s);
    this.gates.a1 = this.addGate(302, 12, 5); this.gates.a2 = this.addGate(323, 12, 5); this.gates.b1 = this.addGate(334, 13, 4); this.gates.b2 = this.addGate(335, 13, 4);
    this.train = new TrainRide(this);
    this.activeCp = checkpoint || 'start';
    const cp = this.level.checkpoints.find((c) => c.id === this.activeCp) || this.level.checkpoints[0];
    this.player.spawn(cp.x, cp.y); this.applyCheckpointState(cp.id, true);
    this.cam.x = clamp(cp.x - 160, 0, this.level.W * 16 - VW); this.cam.y = cp.y - 124; this.cam.ty = this.cam.y;
    g.show3d(false); g.c2d.style.imageRendering = 'pixelated';
    g.music.play(SONG_CH1, { section: this.activeCp === 'start' ? 'intro' : 'A', intensity: 1, fade: 0.2 });
    if (this.activeCp === 'start') g.dialogue.say('rin', 'Sector Nine, frame seam check. Third alarm this shift...', { hold: 2.2 });
  }
  stop() { this.game.c2d.style.imageRendering = ''; }

  // World state that depends on how far the player already got.
  applyCheckpointState(id, initial = false) {
    const order = ['start', 'shaft', 'highroof', 'station', 'dock', 'lift', 'preboss'], i = order.indexOf(id);
    if (i >= 2 && !this.vell) this.vell = { x: this.player.x - 20, y: this.player.y - 30, t: 0 };
    if (i >= 4) { this.train.state = 'done'; this.train.arrival = 0; this.level.hidden = null; this.player.wallX = null; this.fireTrigger('train', true); }
    for (const t of this.level.triggers) if (t.x < this.player.x - 8 && ['collapse', 'vell1', 'train', 'vell2'].includes(t.id)) t.fired = true;
    if (i >= 1 && initial) this.level.fill(72, 27, 28, 2, T.EMPTY); // the bridge is already gone
    if (i >= 6) { const tr = this.level.triggers.find((t) => t.id === 'arena'); tr.fired = true; }
  }
  fireTrigger(id, silent) { const t = this.level.triggers.find((q) => q.id === id); if (t) t.fired = true; void silent; }
  addGate(tx, ty, h) { const g = new Gate(this, tx, ty, h); this.entities.push(g); this.solids.push(g.solid); return g; }
  spawnEntity(type, x, y, opts = {}) { const C = SPAWN[type]; if (!C) return null; const e = new C(this, x, y, opts); this.entities.push(e); if (e.solid) this.solids.push(e.solid); return e; }
  dropPickup(x, y) { const r = Math.random(); if (r < 0.3 && this.player.hp < this.player.maxHp) this.entities.push(new Pickup(this, x, y, 'hp')); else if (r < 0.75) this.entities.push(new Pickup(this, x, y, 'en')); }
  spawnShot(x, y, dir, big) { this.shots.push({ x, y, vx: dir * (big ? 240 : 330), big, t: 0, hit: new Set(), pierce: big ? 4 : 1 }); }
  spawnBullet(x, y, vx, vy, mag = false) { this.bullets.push({ x, y, vx, vy, t: 0, mag, friendly: false }); }
  onScreen(x, y, pad = 16) { return x > this.cam.x - pad && x < this.cam.x + VW + pad && y > this.cam.y - pad && y < this.cam.y + VH + pad; }
  shake(mag, t) { if (mag >= this.shakeMag || this.shakeT <= 0) { this.shakeMag = mag * (this.game.settings.shake ?? 1); this.shakeT = t; } }
  hitstop(t) { this.stopT = Math.max(this.stopT, t); }
  flash(t, c = '#f4f6ff') { this.flashT = t; this.flashC = c; this.flashDur = t; }

  // ---- combat plumbing ------------------------------------------------------------
  playerAttack(box, m, set, dir, fromBarrel = false) {
    let hit = 0, blocked = false; const pl = this.player, sfx = this.game.sfx;
    for (const e of this.entities) {
      if (e.dead || !e.takeHit || set.has(e)) continue; const hb = e.hurtbox; if (!hb || !overlap(box, hb)) continue;
      set.add(e);
      const d = m.radial ? Math.sign(e.x - (m.srcX ?? pl.x)) || dir : dir;
      const r = e.takeHit({ dmg: m.dmg, kbx: d * m.kb[0], kby: m.kb[1], heavy: m.heavy, launcher: m.launcher, dir: d, srcX: fromBarrel ? m.srcX : pl.x });
      if (r === 'hit') { hit++; this.fx.hit(clamp(pl.x + dir * 16, hb.x, hb.x + hb.w), clamp(box.y + box.h / 2, hb.y, hb.y + hb.h), m.heavy); if (e.enemy) { this.combo.add(); sfx.play(m.heavy ? 'px.hitbig' : 'px.hit', { pitch: 1 + Math.min(0.5, this.combo.n * 0.02) }); } }
      else if (r === 'blocked') blocked = true;
    }
    if (this.boss && !fromBarrel) { const h = this.boss.takeBox(box, m, set, dir); if (h) { hit += h; this.combo.add(); } }
    else if (this.boss && fromBarrel) { const h = this.boss.takeBox(box, m, set, dir); hit += h; }
    // parry: slashing a bullet sends it back
    if (!fromBarrel && !m.radial) for (const b of this.bullets) if (!b.friendly && b.x > box.x && b.x < box.x + box.w && b.y > box.y && b.y < box.y + box.h) {
      b.friendly = true; b.vx = dir * Math.max(200, Math.abs(b.vx) * 2); b.vy *= -0.3; b.t = 0; this.fx.hit(b.x, b.y); sfx.play('px.guard', { pitch: 1.3 }); hit++; this.combo.add();
    }
    if (hit) { if (m.stop) this.hitstop(m.stop); if (m.shake) this.shake(m.shake, 0.15); else this.shake(1.5, 0.06); }
    return { hit, blocked };
  }
  enemyAttack(box, dmg, dir) { if (overlap(box, this.player.hurtbox)) this.player.hurt(dmg, dir); }
  onEnemyKilled(e) { if (e.enemy) { this.dropPickup(e.x, e.y - 8); if (this.combo.n > this.game.save.data.stats.bestCombo) this.game.save.data.stats.bestCombo = this.combo.n; } }

  touchCrumble(tx, ty) { const k = this.level.idx(tx, ty); if (!this.level.crumble.has(k)) { this.level.crumble.set(k, { t: 0, tx, ty }); } }
  unsafeGround(tx) {
    if (tx >= 70 && tx <= 100) return true;
    if (tx >= TRAIN.cars[0] && tx < TRAIN.dockX) return this.train.unsafe(tx) || this.train.state === 'run' && tx < this.train.rearX + 2;
    if (this.boss && tx >= BR.x0) { for (let d = -1; d <= 1; d++) if (this.boss.voidCols.has(tx + d)) return true; }
    return false;
  }
  fellOut() {
    const pl = this.player; pl.hp -= 1; this.game.sfx.play('px.hurt'); this.combo.drop();
    if (pl.hp <= 0) { pl.die(); pl.deadT = 0.7; return; }
    let s = pl.lastSafe;
    if (this.train.state !== 'parked' && this.train.state !== 'done' && s.x < this.train.rearX * 16 + 16) s = { x: this.train.rearX * 16 + 60, y: TRAIN.roofY * 16 };
    if (this.boss) { let tx = Math.floor(s.x / 16); for (let k = 0; k < 20 && (!isSolid(this.level.get(tx, BR.floorY)) || this.boss.voidCols.has(tx)); k++) tx += (tx < (BR.x0 + BR.x1) / 2 ? 1 : -1); s = { x: tx * 16 + 8, y: BR.floorY * 16 }; }
    pl.x = s.x; pl.y = s.y; pl.vx = pl.vy = 0; pl.invuln = 1.6; pl.state = 'normal'; pl.diving = false; this.flash(0.15, '#c2362f');
  }
  respawn() {
    const g = this.game, L = this.level, pl = this.player;
    const cp = L.checkpoints.find((c) => c.id === this.activeCp) || L.checkpoints[0];
    this.bullets.length = 0; this.shots.length = 0; this.fx.clear(); this.combo.drop(); g.dialogue.clear();
    // reset set pieces that sit ahead of this checkpoint
    if (cp.x < 100 * 16) { L.fill(72, 27, 28, 2, T.GIRDER); L.fill(81, 27, 3, 2, T.EMPTY); L.fill(91, 27, 3, 2, T.EMPTY); L.collapse.started = false; L.collapse.x = L.collapse.x0; L.triggers.find((t) => t.id === 'collapse').fired = false; L.crumble.clear(); }
    if (this.train.state !== 'done') { for (const e of this.train.spawned) if (e) e.dead = true; this.train.reset(); }
    if (this.arena && !this.arena.done) { for (const e of this.arena.spawned) e.dead = true; this.arena = null; this.gates.a1.release(); this.gates.a2.release(); L.triggers.find((t) => t.id === 'arena').fired = false; }
    if (this.boss) {
      const i = this.solids.length; for (const f of this.boss.fists) { const k = this.solids.indexOf(f.solid); if (k >= 0) this.solids.splice(k, 1); } void i;
      for (const tx of this.boss.voidCols) L.fill(tx, BR.floorY, 1, L.H - BR.floorY, T.SOLID);
      this.entities.forEach((e) => { if (e.enemy && e.x > BR.x0 * 16) e.dead = true; });
      this.boss = null; this.tear = 0; this.tearOn = false; this.outro = null; this.gates.b1.release(); this.gates.b2.release(); L.triggers.find((t) => t.id === 'boss').fired = false;
    }
    pl.spawn(cp.x, cp.y); this.cam.x = clamp(cp.x - 160, 0, L.W * 16 - VW); this.cam.y = this.cam.ty = cp.y - 124;
    g.music.queue('A'); g.music.setIntensity(1); g.audio.muffle(0); this.flash(0.3, '#0d0f1f');
  }

  // ---- triggers & scripted beats --------------------------------------------------
  runTriggers() {
    const pl = this.player, g = this.game, L = this.level;
    for (const t of L.triggers) {
      if (t.fired || pl.x < t.x || pl.x > t.x + t.w) continue; t.fired = true;
      if (t.id === 'collapse') { L.collapse.started = true; L.collapse.t = 0.9; g.sfx.play('px.crumble'); this.shake(3, 0.4); g.music.setIntensity(2); }
      if (t.id === 'vell1') {
        this.vell = { x: pl.x + 40, y: pl.y - 60, t: 0, appear: 1 }; g.music.stinger(STING.vell); g.sfx.play('px.glitch');
        g.dialogue.say([{ who: 'vell', text: "Oh! You can SEE me. That's... not great news for you." }, { who: 'rin', text: "Keeper Rin, Frame Maintenance. You're outside your reality." }, { who: 'vell', text: "I'm outside ALL of them. I'm Vell. Also: your sky is leaking." }]);
      }
      if (t.id === 'train') { if (pl.y <= TRAIN.roofY * 16 + 2) this.train.start(); else t.fired = false; }
      if (t.id === 'arena') {
        this.gates.a1.close(); this.gates.a2.close(); g.music.setIntensity(2); g.music.stinger(STING.danger);
        this.arena = { wave: 0, spawned: [this.spawnEntity('bulwark', 317 * 16, 17 * 16)], done: false };
        g.dialogue.say('vell', "Front's all shield. Hit it HARD, or hit it from behind.");
      }
      if (t.id === 'vell2') g.dialogue.say([{ who: 'vell', text: 'For the record: I am a loose end.' }, { who: 'rin', text: 'Then stay behind me.' }, { who: 'vell', text: "I'm a floating square. EVERYTHING is behind you." }]);
      if (t.id === 'boss') {
        this.gates.b1.close(); this.gates.b2.close(); this.boss = new Gridlock(this); g.music.queue('boss1'); g.music.setIntensity(3); g.sfx.play('px.bossroar'); this.shake(6, 1.2);
        g.dialogue.say([{ who: 'boss', text: 'KEEPER. YOU ARE OFF-GRID.' }, { who: 'boss', text: 'THE CURATOR DECREES: ONE FORMAT. ONE PIXEL SIZE. NO EXCEPTIONS.' }]);
        g.director.preload(2);
      }
    }
    // collapsing skybridge chases the player
    const c = L.collapse;
    if (c.started && c.x < c.x1) {
      c.t -= 1 / 60;
      if (c.t <= 0) {
        c.t = 0.155; const tx = c.x++;
        if (L.get(tx, c.y) !== T.EMPTY) { L.fill(tx, c.y, 1, c.h, T.EMPTY); this.debris(tx * 16, c.y * 16, 16, 32); if (this.onScreen(tx * 16, c.y * 16)) { g.sfx.play('px.crumble'); this.shake(2, 0.1); } }
        if (c.x >= c.x1) g.music.setIntensity(1);
      }
    }
    // crumble tiles
    for (const [k, cr] of L.crumble) { cr.t += 1 / 60; if (cr.t > 0.45 && L.tiles[k] === T.CRUMBLE) { L.tiles[k] = T.EMPTY; this.debris(cr.tx * 16, cr.ty * 16, 16, 8); g.sfx.play('px.crumble', { pitch: 1.2 }); } if (cr.t > 4) { L.tiles[k] = T.CRUMBLE; L.crumble.delete(k); } }
    // checkpoints
    for (const cp of L.checkpoints) if (cp.id !== this.activeCp && Math.abs(pl.x - cp.x) < 12 && Math.abs(pl.y - cp.y) < 30 && pl.state !== 'dead') {
      const order = L.checkpoints.map((q) => q.id); if (order.indexOf(cp.id) < order.indexOf(this.activeCp)) continue;
      this.activeCp = cp.id; g.save.setCheckpoint(1, cp.id); g.sfx.play('px.checkpoint'); pl.hp = Math.min(pl.maxHp, pl.hp + 2); this.fx.burst(cp.x, cp.y - 28, 12, ['c', 'C', 'w'], 80, 0); this.fx.text('SAVED', cp.x, cp.y - 40, PAL.C);
    }
    // arena waves
    const a = this.arena;
    if (a && !a.done && a.spawned.every((e) => e.dead)) {
      if (a.wave === 0) { a.wave = 1; a.spawned = [this.spawnEntity('scrapper', 306 * 16, 17 * 16), this.spawnEntity('scrapper', 320 * 16, 17 * 16), this.spawnEntity('wasp', 313 * 16, 11 * 16)]; g.sfx.play('px.alarm'); }
      else { a.done = true; this.gates.a1.release(); this.gates.a2.release(); g.music.setIntensity(1); g.music.stinger(STING.checkpoint); }
    }
  }
  debris(x, y, w, h) { for (let i = 0; i < 8; i++) this.fx.spark(x + Math.random() * w, y + Math.random() * h, (Math.random() - 0.5) * 60, -20 - Math.random() * 60, ['e', 'D', 'E', 'a'][i % 4], 0.9, 420, 2 + (i % 2)); }

  startTear() { this.tearOn = true; }
  onBossDefeated() {
    const g = this.game; this.outro = { t: 0, rift: 0, riftX: (BR.x0 + BR.x1) * 8, bossScale: { x: 1, y: 1 }, handed: false, cols: 0, said: false };
    g.music.queue('tear'); g.music.setIntensity(1); g.sfx.play('px.bossroar', { pitch: 0.7 }); this.hitstop(0.3); this.shake(10, 1.5); this.flash(0.4);
    this.bullets.length = 0; this.entities.forEach((e) => { if (e.enemy) e.die(); });
    g.dialogue.clear(); g.dialogue.say('boss', 'ERROR. REALITY OUT OF BOUNDS—', { hold: 1.2 });
    this.noPause = true;
  }
  updateOutro(dt) {
    const o = this.outro, g = this.game, pl = this.player, b = this.boss; o.t += dt;
    this.tear = Math.min(1, this.tear + dt * 0.12);
    // the boss claws at the edges of the screen, then is pulled into the rift
    if (o.t > 1.2) {
      const k = clamp((o.t - 1.2) / 2.6, 0, 1);
      b.fists[0].x = lerp(b.fists[0].x, this.cam.x + 14, 0.08); b.fists[1].x = lerp(b.fists[1].x, this.cam.x + VW - 14, 0.08); b.fists.forEach((f) => { f.y = lerp(f.y, this.cam.y + 60, 0.06); f.frame = 'closed'; });
      o.rift = Math.min(1, o.rift + dt * 0.22);
      b.x = lerp(b.x, o.riftX, 0.04); o.bossScale.x = lerp(1, 0.08, k * k); o.bossScale.y = lerp(1, 1.9, k); b.y += (k > 0.4 ? 30 : 0) * dt;
      if (k >= 1 && !o.gone) { o.gone = true; this.fx.burst(o.riftX, b.y, 40, ['m', 'M', 'W', 'U'], 220); g.sfx.play('px.tear'); this.shake(8, 0.5); b.fists.forEach((f) => { f.x = -9999; }); }
      if (Math.random() < 0.3) g.sfx.play('px.glitch', { vol: 0.5 });
    }
    if (o.t > 3.4 && !o.said) { o.said = true; g.dialogue.say([{ who: 'vell', text: "Don't fight the pull! Formats don't END..." }, { who: 'vell', text: '...they CONVERT. Trust the fall!' }]); }
    // floor peels away outward from the rift; the pull grows until it wins
    if (o.t > 4) {
      o.colT = (o.colT || 0) - dt;
      if (o.colT <= 0 && o.cols < 9) { o.colT = 0.5; const c = Math.floor(o.riftX / 16); for (const tx of [c - o.cols, c + o.cols + 1]) { for (let y = BR.floorY; y < this.level.H; y++) this.level.set(tx, y, T.EMPTY); b.voidCols.add(tx); this.fx.burst(tx * 16 + 8, BR.floorY * 16 + 4, 10, ['m', 'M', 'U', 'W'], 150); } o.cols++; g.sfx.play('px.tear', { vol: 0.6 }); }
      const pull = 60 + (o.t - 4) * 55, d = o.riftX - pl.x;
      pl.vx += Math.sign(d) * pull * dt; if (Math.abs(d) < 60) pl.vy -= pull * 1.5 * dt;
      if (this.frame % 2 === 0) this.fx.spark(pl.x + (Math.random() - 0.5) * 200, BR.floorY * 16 - Math.random() * 120, Math.sign(d) * 80, -30, 'M', 0.5, 0, 1);
    }
    g.audio.muffle(clamp((o.t - 5) / 6, 0, 0.7));
    const inRift = o.t > 4.5 && Math.abs(pl.x - o.riftX) < 8 + o.rift * 20;
    if (!o.handed && (inRift || o.t > 13 || pl.y > BR.floorY * 16 + 60 && o.t > 4)) this.handoff();
  }
  handoff() {
    const o = this.outro, g = this.game, pl = this.player; o.handed = true;
    this.drawWorld(); // final frame
    const snap = makeCanvas(VW, VH); snap.getContext('2d').drawImage(this.buf, 0, 0);
    g.save.record('shard', { carried: true, from: 1 }); g.save.data.stats.bestCombo = Math.max(g.save.data.stats.bestCombo, this.combo.best);
    const ok = g.director.handoff(2, { snapshot: snap, rin: { sx: (pl.x - this.cam.x) / VW, sy: (pl.y - 12 - this.cam.y) / VH, facing: pl.facing, frame: pl.frameName() }, riftX: (o.riftX - this.cam.x) / VW, atlas: this.atlas, hp: pl.hp / pl.maxHp });
    if (!ok) { this.ended = true; g.save.complete(1); g.director.end({ chapter: 1 }); }
  }

  // ---- update ------------------------------------------------------------------
  update(dt, outgoing) {
    if (outgoing) return; // frozen once the next reality owns the frame
    const g = this.game, pl = this.player;
    this.time += dt; this.frame++; this.title -= dt;
    this.shakeT -= dt; this.flashT -= dt; this.combo.update(dt);
    if (this.stopT > 0) { this.stopT -= dt; return; }
    pl.update(dt);
    this.runTriggers(); this.train.update(dt);
    for (const e of this.entities) if (!e.dead) e.update(dt);
    // dive stomps & contact damage
    const hb = pl.hurtbox;
    for (const e of this.entities) {
      if (e.dead || !e.enemy) continue; const eb = e.hurtbox; if (!eb) continue;
      if (pl.diving && overlap(pl.diveBox(), eb)) { const r = e.takeHit({ dmg: 2, kbx: 0, kby: 120, heavy: true, dir: pl.facing, srcX: e.x }); if (r) { pl.pogo(); this.fx.hit(e.x, eb.y, true); g.sfx.play('px.hitbig'); this.combo.add(); this.hitstop(0.06); this.shake(3, 0.1); } }
      else if (e.contact && e.stun <= 0 && pl.state !== 'dash' && overlap(hb, eb)) pl.hurt(e.contact, Math.sign(pl.x - e.x) || 1);
    }
    if (this.boss && pl.diving) { const s = new Set(); if (this.boss.takeBox(pl.diveBox(), { dmg: 2, heavy: true }, s, pl.facing)) { pl.pogo(); this.combo.add(); this.hitstop(0.06); } }
    this.entities = this.entities.filter((e) => { if (e.dead && e.solid) { const k = this.solids.indexOf(e.solid); if (k >= 0) this.solids.splice(k, 1); } return !e.dead; });
    this.updateProjectiles(dt);
    if (this.boss) this.boss.update(dt);
    if (this.outro) this.updateOutro(dt);
    if (this.tearOn && !this.outro && this.boss) this.tear = lerp(this.tear, 0.08 + 0.3 * (1 - this.boss.hp / (BOSS_MAXHP * 0.34)), 0.02);
    this.fx.update(dt);
    // companion
    const v = this.vell; if (v) { v.t += dt; const tx = pl.x - pl.facing * 22, ty = pl.y - 34 + Math.sin(v.t * 2.2) * 4; v.x = damp(v.x, tx, 3.5, dt); v.y = damp(v.y, ty, 3.5, dt); if (v.appear > 0) v.appear -= dt; }
    this.updateCamera(dt);
    // background smoke
    if (this.frame % 14 === 0) for (const s of this.bg.stacks) this.smoke.push({ x: s.x, y: s.y, t: 0, d: Math.random() });
    for (const s of this.smoke) { s.t += dt; s.y -= 9 * dt; s.x -= (6 + s.d * 4) * dt; } this.smoke = this.smoke.filter((s) => s.t < 4);
    // intensity: combat nearby?
    if (!this.boss && !this.arena?.spawned.some((e) => !e.dead) && this.train.state !== 'run' && !this.level.collapse.started) {
      if (this.frame % 30 === 0) { const hot = this.entities.some((e) => e.enemy && !e.dead && Math.abs(e.x - pl.x) < 150 && Math.abs(e.y - pl.y) < 90); g.music.setIntensity(hot ? 2 : 1); }
    }
  }
  updateProjectiles(dt) {
    const L = this.level, pl = this.player, sfx = this.game.sfx;
    for (const s of this.shots) {
      s.x += s.vx * dt; s.t += dt; const r = s.big ? 9 : 4, box = { x: s.x - r, y: s.y - r, w: r * 2, h: r * 2 };
      if (isSolid(L.get(Math.floor(s.x / 16), Math.floor(s.y / 16))) || s.t > 1.4) { s.dead = true; this.fx.hit(s.x, s.y); continue; }
      const m = { dmg: s.big ? 4 : 1, kb: [s.big ? 160 : 50, -40], heavy: s.big, stop: s.big ? 0.05 : 0.015 };
      for (const e of this.entities) { if (e.dead || !e.takeHit || s.hit.has(e)) continue; const hb = e.hurtbox; if (!hb || !overlap(box, hb)) continue; s.hit.add(e); const res = e.takeHit({ dmg: m.dmg, kbx: Math.sign(s.vx) * m.kb[0], kby: m.kb[1], heavy: m.heavy, dir: Math.sign(s.vx), shot: true, srcX: s.x - s.vx }); this.fx.hit(s.x, s.y, s.big); sfx.play(res === 'blocked' ? 'px.guard' : 'px.hit', { pitch: 1.3 }); if (res === 'hit' && e.enemy) this.combo.add(); if (--s.pierce <= 0) { s.dead = true; break; } }
      if (!s.dead && this.boss && this.boss.takeBox(box, m, s.hit, Math.sign(s.vx))) { this.combo.add(); if (--s.pierce <= 0) s.dead = true; }
    }
    this.shots = this.shots.filter((s) => !s.dead);
    for (const b of this.bullets) {
      b.x += b.vx * dt; b.y += b.vy * dt; b.t += dt;
      if (b.t > 5 || isSolid(L.get(Math.floor(b.x / 16), Math.floor(b.y / 16)))) { b.dead = true; this.fx.burst(b.x, b.y, 3, ['O', 'y']); continue; }
      if (b.friendly) {
        for (const e of this.entities) { if (e.dead || !e.enemy) continue; const hb = e.hurtbox; if (hb && b.x > hb.x && b.x < hb.x + hb.w && b.y > hb.y && b.y < hb.y + hb.h) { e.takeHit({ dmg: 2, kbx: Math.sign(b.vx) * 90, kby: -60, heavy: true, dir: Math.sign(b.vx), srcX: b.x - b.vx }); this.fx.hit(b.x, b.y, true); sfx.play('px.hitbig'); b.dead = true; break; } }
        if (!b.dead && this.boss && this.boss.takeBox({ x: b.x - 4, y: b.y - 4, w: 8, h: 8 }, { dmg: 2, heavy: true }, new Set(), Math.sign(b.vx))) b.dead = true;
      } else { const hb = pl.hurtbox; if (b.x > hb.x - 2 && b.x < hb.x + hb.w + 2 && b.y > hb.y - 2 && b.y < hb.y + hb.h + 2 && pl.iframes <= 0) { if (pl.hurt(1, Math.sign(b.vx) || 1)) b.dead = true; } }
    }
    this.bullets = this.bullets.filter((b) => !b.dead);
  }
  updateCamera(dt) {
    const pl = this.player, L = this.level, c = this.cam;
    c.look = damp(c.look, pl.facing * 26, 2.5, dt);
    let tx = pl.x - VW / 2 + c.look;
    if (pl.onGround || pl.wallSliding) c.ty = pl.y - 124; else if (pl.y - c.y < 44) c.ty = pl.y - 44; else if (pl.y - c.y > 150) c.ty = pl.y - 150;
    let ty = c.ty, minX = 0, maxX = L.W * 16 - VW;
    if (this.train.state !== 'done' && pl.x > TRAIN.cars[0] * 16 - 40) { maxX = (TRAIN.dockX - 1) * 16 - VW + 40; ty = TRAIN.roofY * 16 - 118; if (this.train.state !== 'parked') minX = Math.max(minX, this.train.rearX * 16 - 60); }
    if (this.boss) { minX = BR.x0 * 16; maxX = BR.x1 * 16 - VW; ty = BR.ceilY * 16 - 6; }
    tx = clamp(tx, minX, Math.max(minX, maxX)); ty = clamp(ty, 0, L.H * 16 - VH);
    c.x = damp(c.x, tx, this.boss ? 5 : 9, dt); c.y = damp(c.y, ty, 7, dt);
    if (Math.abs(c.x - tx) < 0.5) c.x = tx;
  }

  // ---- render ------------------------------------------------------------------
  render() {
    this.drawWorld();
    this.present();
  }
  drawWorld() {
    const ctx = this.bx, L = this.level, bg = this.bg, at = this.atlas, t = this.time;
    let sx = 0, sy = 0;
    if (this.shakeT > 0) { sx = Math.round((Math.random() * 2 - 1) * this.shakeMag); sy = Math.round((Math.random() * 2 - 1) * this.shakeMag); }
    const cam = { x: Math.round(this.cam.x) + sx, y: Math.round(this.cam.y) + sy }, px = cam.x + this.train.scroll;
    // --- sky + the Framework
    ctx.drawImage(bg.sky, 0, 0);
    const fwx = 176 - Math.round(px * 0.012) % 400, fwy = 4 - Math.round(cam.y * 0.02);
    ctx.drawImage(bg.framework, ((fwx % 620) + 620) % 620 - 150, fwy + 6);
    // --- parallax city
    const strip = (img, w, f, y) => { const o = -Math.floor(px * f) % w; for (let x = o - w; x < VW; x += w) ctx.drawImage(img, x, y); return o; };
    const baseY = Math.round((L.H * 16 - VH - cam.y) * 0.06);
    strip(bg.far, bg.farW, 0.07, 62 + Math.round(baseY * 0.5));
    const mo = strip(bg.mid, bg.midW, 0.2, 44 + baseY);
    for (let rep = -1; rep < 2; rep++) { // animated machinery on the mid layer
      const ox = mo + rep * bg.midW; if (ox > VW || ox + bg.midW < 0) continue;
      const gf = Math.floor(t * 7) % 8;
      ctx.drawImage(bg.gearBig[gf], ox + 140, 44 + baseY + 62); ctx.drawImage(bg.gearSmall[7 - gf], ox + 198, 44 + baseY + 84); ctx.drawImage(bg.gearBig[7 - gf], ox + 470, 44 + baseY + 70); ctx.drawImage(bg.gearSmall[gf], ox + 452, 44 + baseY + 58);
      for (const s of this.smoke) { const r = 2 + Math.floor(s.t * 1.6), x = Math.round(ox + s.x), y = Math.round(44 + baseY + s.y); ctx.fillStyle = s.t < 1.5 ? PAL.u : PAL.V; ctx.fillRect(x - r, y - r + 1, r * 2, r * 2 - 2); ctx.fillRect(x - r + 1, y - r, r * 2 - 2, r * 2); }
      // piston towers
      for (const [pxx, ph] of [[300, 0], [330, 1.6], [560, 0.8]]) { const h = 18 + Math.round((Math.sin(t * 2.4 + ph) * 0.5 + 0.5) * 22); ctx.fillStyle = PAL.V; ctx.fillRect(ox + pxx + 3, 44 + baseY + 80 - h, 4, h); ctx.fillStyle = PAL.u; ctx.fillRect(ox + pxx, 44 + baseY + 76 - h, 10, 5); ctx.fillStyle = PAL.v; ctx.fillRect(ox + pxx - 1, 44 + baseY + 80, 12, 14); }
    }
    strip(bg.near, bg.nearW, 0.42, 66 + Math.round(baseY * 1.6));
    // blinking beacons on the near layer are baked red; add a soft pulse dither band at the horizon
    // --- tiles
    const hidden = L.hidden, arr = hidden ? Math.round(this.train.arrival) : 0;
    const tx0 = Math.floor(cam.x / TS), ty0 = Math.floor(cam.y / TS), tx1 = tx0 + 21, ty1 = ty0 + 12, af = Math.floor(t * 10);
    for (let pass = 0; pass < 2; pass++) for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0 - (hidden ? Math.ceil(arr / 16) : 0); tx <= tx1; tx++) {
      if (tx < 0 || ty < 0 || tx >= L.W || ty >= L.H) continue;
      const hid = hidden && tx >= hidden.x0; if (hidden && !hid && tx < tx0) continue;
      const dx = tx * TS - cam.x + (hid ? arr : 0), dy = ty * TS - cam.y; if (dx > VW || dx < -16) continue;
      const tl = L.tiles[ty * L.W + tx];
      if (pass === 0) { const b = L.back[ty * L.W + tx]; if (b && !isSolid(tl) || (b && tl === T.TRAIN)) ctx.drawImage(this.tiles.back(b, (tx * 7 + ty * 13) % 12, af >> 1), dx, dy); continue; }
      if (!tl || tl === T.TRAIN) continue;
      let img;
      if (tl === T.SOLID) img = this.tiles.solid(L.theme[tx], L.mask(tx, ty), L.variant(tx, ty));
      else if (tl === T.CRUMBLE) { const cr = L.crumble.get(ty * L.W + tx); img = this.tiles.tile(tl, { stage: cr ? (cr.t > 0.25 ? 2 : 1) : 0 }); }
      else img = this.tiles.tile(tl, { theme: L.theme[tx], mask: L.mask(tx, ty), v: tx, f: tl === T.SPIKE ? af >> 1 : af });
      if (img) ctx.drawImage(img, dx + (tl === T.CRUMBLE && L.crumble.has(ty * L.W + tx) ? (af % 2 ? 1 : -1) : 0), dy);
    }
    // void under the control hall when the floor is ripped out
    if (this.boss) for (let tx = Math.max(tx0, BR.x0); tx <= Math.min(tx1, BR.x1 - 1); tx++) if (!isSolid(L.get(tx, BR.floorY))) for (let ty = BR.floorY; ty <= ty1; ty++) this.atlas.draw(ctx, 'void' + ((tx + ty + (af >> 2)) % 3), tx * 16 - cam.x, ty * 16 - cam.y);
    // --- decor, signs, checkpoints
    for (const d of L.decor) this.drawDecor(ctx, d, cam);
    for (const s of L.signs) { const x = s.x - cam.x, y = s.y - cam.y, w = s.text.length * 6 + 7; if (x > VW || x + w < 0) continue; ctx.fillStyle = PAL.K; ctx.fillRect(x, y, w, 13); ctx.fillStyle = PAL.n; ctx.fillRect(x + 1, y + 1, w - 2, 11); ctx.fillStyle = PAL[s.color]; ctx.fillRect(x + 1, y + 11, w - 2, 1); ctx.fillStyle = PAL.G; ctx.fillRect(x + 4, y + 13, 1, 5); ctx.fillRect(x + w - 5, y + 13, 1, 5); if (hash2(Math.floor(t * 9), s.x) > 0.06) ptext(ctx, s.text, x + 4, y + 3, PAL[s.color], 0, null); }
    for (const cp of L.checkpoints) { if (cp.id === 'start') continue; const on = L.checkpoints.findIndex((c) => c.id === cp.id) <= L.checkpoints.findIndex((c) => c.id === this.activeCp); at.draw(ctx, on ? 'beacon_on' + (Math.floor(t * 4) % 2) : 'beacon_off', cp.x - cam.x + (hidden && cp.x >= hidden.x0 * 16 ? arr : 0), cp.y - cam.y); }
    // --- train
    if (cam.x + VW > 138 * 16 && cam.x < 232 * 16) { this.train.drawRails(ctx, cam); this.train.drawCars(ctx, cam, bg); }
    // --- entities
    for (const e of this.entities) if (e.mech && this.onScreen(e.solid.x, e.solid.y, 120)) e.draw(ctx, at, cam);
    for (const e of this.entities) if (!e.mech && this.onScreen(e.x, e.y, 40)) e.draw(ctx, at, cam);
    if (this.boss) this.boss.draw(ctx, at, cam);
    this.fx.drawBack(ctx, at, cam);
    const v = this.vell; if (v && !(v.appear > 0 && Math.floor(v.t * 20) % 2)) at.draw(ctx, 'vell' + [0, 0, 0, 1, 0, 2, 0, 3][Math.floor(v.t * 5) % 8], v.x - cam.x, v.y - cam.y, this.player.x < v.x);
    const pl = this.player; if (pl.visible) at.draw(ctx, pl.frameName(), pl.x - cam.x, pl.y - cam.y, pl.facing < 0);
    if (pl.chargeT > 0.55 && Math.floor(t * 20) % 2) { ctx.fillStyle = PAL.w; ctx.fillRect(Math.round(pl.x + pl.facing * 9 - cam.x) - 1, Math.round(pl.y - 16 - cam.y), 3, 3); }
    for (const s of this.shots) at.draw(ctx, s.big ? 'fx_big' + (Math.floor(s.t * 16) % 2) : 'fx_shot' + (Math.floor(s.t * 18) % 3), s.x - cam.x, s.y - cam.y);
    for (const b of this.bullets) at.draw(ctx, (b.mag ? 'fx_mag' : 'fx_bul') + (Math.floor(b.t * 12) % 2), b.x - cam.x, b.y - cam.y, false, b.friendly && Math.floor(b.t * 30) % 2 === 0);
    this.fx.draw(ctx, at, cam);
    this.train.drawObstacles(ctx, cam);
    if (this.outro) this.drawRift(ctx, cam);
    if (this.flashT > 0) { ctx.globalAlpha = clamp(this.flashT / (this.flashDur || 0.2), 0, 1) * 0.8; ctx.fillStyle = this.flashC; ctx.fillRect(0, 0, VW, VH); ctx.globalAlpha = 1; }
    this.drawHud(ctx);
  }
  drawDecor(ctx, d, cam) {
    const x = d.x * 16 - cam.x, y = d.y * 16 - cam.y; if (x > VW + 20 || x < -40) return;
    const r = (c, a, b, w, h) => { ctx.fillStyle = PAL[c]; ctx.fillRect(x + a, y + b, w, h); };
    if (d.k === 'ac') { r('K', 0, -13, 22, 13); r('h', 1, -12, 20, 12); r('i', 1, -12, 20, 1); r('G', 1, -3, 20, 3); for (let i = 0; i < 4; i++) r('K', 3 + i * 4, -9, 2, 5); r('K', 17, -10, 3, 3); r(Math.floor(this.time * 3) % 2 ? 'J' : 'j', 18, -9, 1, 1); }
    if (d.k === 'antenna') { r('K', 5, -34, 3, 34); r('h', 6, -34, 1, 34); r('K', 0, -27, 13, 2); r('K', 2, -20, 9, 2); r('h', 1, -27, 11, 1); r(Math.floor(this.time * 2) % 2 ? 'R' : 'r', 5, -37, 3, 3); }
    if (d.k === 'tank') { r('K', -1, -27, 26, 27); r('e', 0, -26, 24, 26); r('E', 0, -26, 6, 26); r('a', 2, -26, 2, 26); r('D', 18, -26, 6, 26); for (const b of [-22, -13, -4]) r('D', 0, b, 24, 1); r('K', 2, -30, 20, 4); r('h', 3, -29, 18, 2); }
    if (d.k === 'bench') { r('K', 0, -8, 26, 3); r('E', 1, -7, 24, 1); r('K', 2, -5, 2, 5); r('K', 22, -5, 2, 5); r('K', 0, -15, 26, 2); r('a', 1, -14, 24, 1); r('K', 1, -13, 1, 6); r('K', 24, -13, 1, 6); }
    if (d.k === 'lamp') { r('K', 3, -40, 3, 40); r('h', 4, -40, 1, 40); r('K', 0, -44, 12, 5); r('Y', 1, -40, 10, 2); r('y', 2, -38, 8, 1); }
  }
  drawRift(ctx, cam) {
    const o = this.outro, x = Math.round(o.riftX - cam.x), w = Math.round(o.rift * 34); if (w <= 0) return;
    // a tear in the screen: cream paper and wet ink behind the pixels
    for (let y = 0; y < VH; y += 2) {
      const j = Math.round(Math.sin(y * 0.31 + this.time * 3) * 3 + Math.sin(y * 0.11) * 4), ww = w + Math.round(Math.sin(y * 0.07 + this.time) * 3);
      ctx.fillStyle = '#f3ead2'; ctx.fillRect(x - ww + j, y, ww * 2, 2);
      ctx.fillStyle = PAL.K; ctx.fillRect(x - ww + j - 1, y, 2, 2); ctx.fillRect(x + ww + j - 1, y, 2, 2);
      if ((y + this.frame) % 14 === 0) { ctx.fillRect(x - ww + j + 3, y, Math.max(2, ww - 4), 1); }
    }
    ctx.fillStyle = PAL.K; for (let i = 0; i < 8; i++) { const yy = (i * 47 + this.frame * 2) % VH; ctx.fillRect(x - 2 + Math.round(Math.sin(i * 2.1) * w * 0.6), yy, 2, 6); }
  }

  drawHud(ctx) {
    const pl = this.player, g = this.game, at = this.atlas;
    for (let i = 0; i < pl.maxHp; i++) at.draw(ctx, i < pl.hp ? 'heart1' : 'heart0', 6 + i * 9, 6);
    for (let i = 0; i < pl.maxEnergy; i++) { const f = clamp(pl.energy - i, 0, 1); ctx.fillStyle = PAL.K; ctx.fillRect(6 + i * 9, 16, 8, 6); ctx.fillStyle = PAL.n; ctx.fillRect(7 + i * 9, 17, 6, 4); if (f > 0) { ctx.fillStyle = f >= 1 ? PAL.y : PAL.o; ctx.fillRect(7 + i * 9, 17, Math.round(6 * f), 4); if (f >= 1) { ctx.fillStyle = PAL.Y; ctx.fillRect(7 + i * 9, 17, 6, 1); } } }
    const c = this.combo;
    if (c.n > 1) { const y = 8 - Math.round(c.pop * 3); const col = { D: PAL.i, C: PAL.C, B: PAL.y, A: PAL.O, S: PAL.M }[c.rank]; ptext(ctx, c.n + ' HITS', VW - 8, y, col, 1); ptext(ctx, c.rank, VW - 8, y + 10, col, 1); ctx.fillStyle = PAL.K; ctx.fillRect(VW - 50, y + 20, 42, 3); ctx.fillStyle = col; ctx.fillRect(VW - 49, y + 21, Math.round(40 * clamp(c.t / 2.4, 0, 1)), 1); }
    if (this.boss && this.boss.active && !this.outro) {
      const w = 180, x = (VW - w) >> 1, y = VH - 13, f = this.boss.hp / BOSS_MAXHP;
      ctx.fillStyle = PAL.K; ctx.fillRect(x - 2, y - 2, w + 4, 9); ctx.fillStyle = PAL.r; ctx.fillRect(x, y, w, 5); ctx.fillStyle = this.boss.phase === 3 ? PAL.M : PAL.O; ctx.fillRect(x, y, Math.round(w * f), 5); ctx.fillStyle = this.boss.phase === 3 ? PAL.W : PAL.y; ctx.fillRect(x, y, Math.round(w * f), 1);
      ctx.fillStyle = PAL.K; ctx.fillRect(x + Math.round(w * 0.34), y, 1, 5); ctx.fillRect(x + Math.round(w * 0.68), y, 1, 5);
      ptext(ctx, 'GRIDLOCK', VW / 2, y - 11, PAL.y, 0.5);
    }
    // title card
    if (this.title > 0) {
      const a = this.title, k = a > 3.7 ? (4.2 - a) / 0.5 : a < 0.5 ? a / 0.5 : 1, w = Math.round(VW * k);
      ctx.fillStyle = PAL.K; ctx.fillRect((VW - w) >> 1, 66, w, 30); ctx.fillStyle = PAL.c; ctx.fillRect((VW - w) >> 1, 66, w, 1); ctx.fillRect((VW - w) >> 1, 95, w, 1);
      if (k >= 1) { ptext(ctx, 'CHAPTER 1', VW / 2, 71, PAL.c, 0.5); ptext(ctx, 'P I X E L   P A N I C', VW / 2, 82, PAL.W, 0.5); }
    }
    // dialogue
    const d = g.dialogue.current;
    if (d) {
      const lines = wrapText(g.dialogue.visibleText, 46), full = wrapText(d.text, 46), h = 16 + full.length * 9, y = VH - h - (this.boss && this.boss.active ? 30 : 6);
      ctx.fillStyle = PAL.K; ctx.fillRect(14, y, VW - 28, h); ctx.fillStyle = PAL.k; ctx.fillRect(15, y + 1, VW - 30, h - 2); ctx.fillStyle = d.speaker.color; ctx.fillRect(15, y + 1, 2, h - 2);
      ptext(ctx, d.speaker.name, 21, y + 4, d.speaker.color, 0, null);
      lines.forEach((ln, i) => ptext(ctx, ln, 21, y + 13 + i * 9, PAL.W, 0, null));
    }
  }

  // Integer-scaled presentation, plus the grid-tear effect: the frame is cut
  // into 16px blocks that slip, drop out and drift as the reality fails.
  present() {
    const g = this.game, ctx = g.ctx; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
    const scale = Math.max(1, Math.floor(Math.min(g.W / VW, g.H / VH))), dw = VW * scale, dh = VH * scale, ox = (g.W - dw) >> 1, oy = (g.H - dh) >> 1;
    ctx.fillStyle = '#0d0f1f'; ctx.fillRect(0, 0, g.W, g.H);
    this.view = { scale, ox, oy };
    if (this.tear <= 0.001) { ctx.drawImage(this.buf, 0, 0, VW, VH, ox, oy, dw, dh); return; }
    const k = this.tear, B = 16, f = Math.floor(this.time * 12), o = this.outro, rx = o ? o.riftX - Math.round(this.cam.x) : -999;
    ctx.fillStyle = '#f3ead2'; if (o) ctx.fillRect(ox, oy, dw, dh);
    for (let by = 0; by < VH; by += B) for (let bxx = 0; bxx < VW; bxx += B) {
      const h = hash2(bxx / B + f * 0.37, by / B), h2 = hash2(bxx / B, by / B + 31), hh = Math.min(B, VH - by);
      let dx = 0, dy = 0, drop = false;
      if (h2 < k * 0.55) { const hs = hash2((bxx / B) * 3 + Math.floor(f / 3), by / B); if (hs < 0.5) dx = Math.round((hs - 0.25) * 16 * k) ; else dy = Math.round((hs - 0.75) * 16 * k); }
      if (h < k * 0.05) drop = true;
      if (o) { // blocks peel away into the rift
        const d = Math.abs(bxx + 8 - rx), reach = o.rift * 30 + Math.max(0, o.t - 4) * 22;
        if (d < reach) { const p = clamp((reach - d) / 60, 0, 1) * (0.5 + h2); dx += Math.round((rx - bxx - 8) * p * 0.8); dy += Math.round(-p * 30 * (h2 - 0.3)); if (p > 0.85) drop = true; }
      }
      if (drop) continue;
      ctx.drawImage(this.buf, bxx, by, B, hh, ox + (bxx + dx) * scale, oy + (by + dy) * scale, B * scale, hh * scale);
    }
  }
  perfInfo() { return `ents ${this.entities.length} · parts ${this.fx.parts.length}`; }
}
