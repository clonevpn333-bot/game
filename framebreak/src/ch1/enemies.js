// Chapter 1 enemies, props and mechanisms. Each enemy is a small state
// machine with a readable telegraph before every attack.
import { moveBody, groundAhead } from './physics.js';
import { PAL } from './pix.js';
import { approach, clamp } from '../core/util.js';

const GRAV = 820;

class Enemy {
  constructor(ch, x, y, o = {}) {
    this.ch = ch; this.x = x; this.y = y; this.vx = 0; this.vy = 0; this.w = 14; this.h = 20; this.hp = 3;
    this.facing = o.face || -1; this.flash = 0; this.stun = 0; this.state = 'idle'; this.st = 0; this.t = Math.random() * 3;
    this.dead = false; this.onGround = false; this.juggle = false; this.enemy = true; this.contact = 1; this.score = 1; this.o = o;
  }
  get hurtbox() { return { x: this.x - this.w / 2, y: this.y - this.h, w: this.w, h: this.h }; }
  set(state) { this.state = state; this.st = 0; }
  takeHit(hit) {
    this.hp -= hit.dmg; this.flash = 0.11; this.stun = hit.heavy ? 0.5 : 0.3;
    if (!this.fixed) { this.vx = hit.kbx; this.vy = hit.kby; if (hit.kby < -150) { this.juggle = true; this.onGround = false; } else if (this.juggle) this.vy = Math.min(this.vy, -110); }
    this.onHit?.(hit);
    if (this.hp <= 0) this.die();
    return 'hit';
  }
  die() {
    if (this.dead) return; this.dead = true;
    const ch = this.ch; ch.fx.boom(this.x, this.y - this.h / 2); ch.fx.gib(this.x, this.y - this.h / 2, 4); ch.game.sfx.play('px.explode'); ch.shake(3, 0.15);
    ch.onEnemyKilled(this);
  }
  body(dt, grav = true) {
    if (grav) this.vy = Math.min(this.vy + GRAV * dt, 380);
    const vxBefore = this.vx;
    moveBody(this.ch.level, this, dt, this.ch.solids);
    if (this.juggle && this.wallDir && Math.abs(vxBefore) > 150) { // wall splat
      this.vx = -vxBefore * 0.35; this.ch.fx.hit(this.x + this.wallDir * this.w / 2, this.y - this.h / 2); this.ch.game.sfx.play('px.clank'); this.hp -= 1; this.flash = 0.1; if (this.hp <= 0) this.die();
    }
    if (this.onGround) { if (this.juggle && this.stun <= 0.1) this.juggle = false; this.vx = approach(this.vx, 0, 700 * dt); }
    if (this.y > this.ch.level.H * 16 + 60) this.dead = true;
  }
  tick(dt) { this.t += dt; this.st += dt; this.flash -= dt; if (this.stun > 0) { this.stun -= dt; return true; } return false; }
  facePlayer() { this.facing = this.ch.player.x > this.x ? 1 : -1; }
  get pdx() { return this.ch.player.x - this.x; } get pdy() { return this.ch.player.y - this.y; }
  exclaim() { this.ch.fx.text('!', this.x, this.y - this.h - 6, '#ffd166'); this.ch.game.sfx.play('px.telegraph'); }
}

export class Scrapper extends Enemy {
  constructor(ch, x, y, o) { super(ch, x, y, o); this.w = 14; this.h = 21; this.hp = 4; this.speed = 34; }
  update(dt) {
    const pl = this.ch.player;
    if (this.tick(dt)) { this.body(dt); this.frame = 'scr_hurt'; return; }
    const near = Math.abs(this.pdx) < 110 && Math.abs(this.pdy) < 40 && pl.state !== 'dead';
    switch (this.state) {
      case 'idle': case 'walk': {
        if (near) this.facePlayer();
        const ahead = groundAhead(this.ch.level, this.x + this.facing * 11, this.y);
        if (!ahead || this.wallDir === this.facing) { if (!near) this.facing = -this.facing; this.vx = 0; }
        else this.vx = this.facing * (near ? this.speed * 1.5 : this.speed);
        if (near && Math.abs(this.pdx) < 26 && Math.abs(this.pdy) < 26) { this.set('wind'); this.vx = 0; this.exclaim(); }
        this.frame = 'scr_walk' + (Math.floor(this.t * 8) % 4);
        break;
      }
      case 'wind': this.vx = 0; this.frame = this.st < 0.18 ? 'scr_wind0' : 'scr_wind1'; if (this.st > 0.42) { this.set('swing'); this.vx = this.facing * 90; this.ch.game.sfx.play('px.swing', { pitch: 0.7 }); } break;
      case 'swing':
        this.frame = this.st < 0.1 ? 'scr_swing0' : 'scr_swing1';
        if (this.st < 0.14) this.ch.enemyAttack({ x: this.facing > 0 ? this.x + 2 : this.x - 24, y: this.y - 22, w: 22, h: 22 }, 1, this.facing);
        if (this.st > 0.5) this.set('walk');
        break;
    }
    this.body(dt);
  }
  draw(ctx, atlas, cam) { atlas.draw(ctx, this.frame || 'scr_walk0', this.x - cam.x, this.y - cam.y, this.facing < 0, this.flash > 0); }
}

export class Wasp extends Enemy {
  constructor(ch, x, y, o) { super(ch, x, y - 8, o); this.w = 16; this.h = 12; this.hp = 2; this.home = { x, y: y - 8 }; this.cool = 1 + Math.random() * 1.5; this.side = Math.random() < 0.5 ? -1 : 1; this.contact = 1; }
  update(dt) {
    const pl = this.ch.player;
    if (this.tick(dt)) { this.body(dt, true); this.frame = 'wasp_hurt'; return; }
    this.juggle = false;
    const active = Math.abs(this.pdx) < 170 && Math.abs(this.pdy) < 120 && pl.state !== 'dead';
    let tx = this.home.x + Math.sin(this.t * 0.9) * 20, ty = this.home.y + Math.sin(this.t * 2.3) * 5;
    if (active) { this.facePlayer(); if (Math.sin(this.t * 0.4) > 0.8) this.side = -this.side; tx = pl.x + this.side * 62; ty = pl.y - 52 + Math.sin(this.t * 2.3) * 6; }
    if (this.state === 'aim') { tx = this.x; ty = this.y; }
    this.vx = approach(this.vx, clamp((tx - this.x) * 2.2, -75, 75), 260 * dt); this.vy = approach(this.vy, clamp((ty - this.y) * 2.2, -60, 60), 260 * dt);
    this.cool -= dt;
    if (this.state === 'idle' && active && this.cool <= 0 && this.ch.onScreen(this.x, this.y)) { this.set('aim'); this.exclaim(); }
    if (this.state === 'aim' && this.st > 0.5) {
      const a = Math.atan2(pl.y - 12 - this.y, pl.x - this.x); this.ch.spawnBullet(this.x, this.y + 4, Math.cos(a) * 105, Math.sin(a) * 105);
      this.ch.game.sfx.play('px.shot', { pitch: 0.6, vol: 0.7 }); this.set('idle'); this.cool = 1.9 + Math.random();
    }
    this.x += this.vx * dt; this.y += this.vy * dt;
    const r = Math.floor(this.t * 20) % 2; this.frame = this.state === 'aim' ? 'wasp_aim' + r : 'wasp' + r;
  }
  draw(ctx, atlas, cam) { atlas.draw(ctx, this.frame || 'wasp0', this.x - cam.x, this.y - cam.y, this.facing < 0, this.flash > 0); }
  get hurtbox() { return { x: this.x - 9, y: this.y - 8, w: 18, h: 15 }; }
}

export class Sentry extends Enemy {
  constructor(ch, x, y, o) { super(ch, x, y, o); this.w = 18; this.h = 18; this.hp = 5; this.fixed = true; this.cool = 1; this.contact = 0; }
  update(dt) {
    const pl = this.ch.player; this.tick(dt); this.stun = 0;
    const see = Math.abs(this.pdy) < 30 && Math.abs(this.pdx) < 170 && pl.state !== 'dead' && this.ch.onScreen(this.x, this.y);
    this.cool -= dt;
    if (this.state === 'idle') { if (Math.abs(this.pdx) > 14) this.facePlayer(); this.frame = 'sentry0'; if (see && this.cool <= 0) { this.set('charge'); this.ch.game.sfx.play('px.telegraph', { pitch: 0.8 }); } }
    else if (this.state === 'charge') { this.frame = this.st < 0.3 ? 'sentry_c0' : 'sentry_c1'; if (this.st > 0.62) { this.set('burst'); this.shots = 3; this.shotT = 0; } }
    else if (this.state === 'burst') {
      this.shotT -= dt; this.frame = this.shotT > 0.09 ? 'sentry_fire' : 'sentry_c1';
      if (this.shotT <= 0 && this.shots > 0) { this.shots--; this.shotT = 0.16; this.ch.spawnBullet(this.x + this.facing * 16, this.y - 11, this.facing * 150, 0); this.ch.game.sfx.play('px.shot', { pitch: 0.75, vol: 0.7 }); }
      if (this.shots <= 0 && this.shotT <= 0) { this.set('idle'); this.cool = 1.5; }
    }
  }
  draw(ctx, atlas, cam) { atlas.draw(ctx, this.frame || 'sentry0', this.x - cam.x, this.y - cam.y, this.facing < 0, this.flash > 0); }
}

export class Bulwark extends Enemy {
  constructor(ch, x, y, o) { super(ch, x, y, o); this.w = 22; this.h = 30; this.hp = 10; this.speed = 22; this.cool = 1.5; this.score = 4; }
  takeHit(hit) {
    const front = hit.dir === -this.facing || (hit.srcX != null && Math.sign(hit.srcX - this.x) === this.facing);
    if (this.state !== 'stagger' && front && !hit.heavy) { this.ch.game.sfx.play('px.guard'); this.ch.fx.hit(this.x + this.facing * 12, this.y - 16); this.vx = -this.facing * 30; return 'blocked'; }
    if (this.state !== 'stagger' && front && hit.heavy) { this.set('stagger'); this.ch.game.sfx.play('px.clank'); this.ch.fx.text('GUARD BREAK', this.x, this.y - 44, '#ff9a3c'); hit = { ...hit, kbx: hit.kbx * 0.3, kby: 0 }; }
    const r = super.takeHit({ ...hit, kbx: hit.kbx * 0.4, kby: Math.max(hit.kby * 0.4, -120) }); this.juggle = false; this.stun = Math.min(this.stun, 0.18); return r;
  }
  update(dt) {
    const pl = this.ch.player;
    if (this.tick(dt)) { this.body(dt); this.frame = this.state === 'stagger' ? 'bul_stagger' : 'bul_hurt'; return; }
    this.cool -= dt;
    const near = Math.abs(this.pdx) < 150 && Math.abs(this.pdy) < 50 && pl.state !== 'dead';
    switch (this.state) {
      case 'idle': case 'walk':
        if (near) { this.facePlayer(); this.vx = this.facing * this.speed; if (Math.abs(this.pdx) < 52 && this.cool <= 0) { this.set('wind'); this.exclaim(); } } else this.vx = 0;
        if (!groundAhead(this.ch.level, this.x + this.facing * 14, this.y)) this.vx = 0;
        this.frame = 'bul_walk' + (Math.abs(this.vx) > 1 ? Math.floor(this.t * 6) % 4 : 0); break;
      case 'wind': this.vx = 0; this.frame = 'bul_wind'; if (this.st > 0.5) { this.set('bash'); this.vx = this.facing * 230; this.ch.game.sfx.play('px.dash', { pitch: 0.7 }); } break;
      case 'bash': this.frame = 'bul_bash'; if (this.st < 0.26) { this.vx = this.facing * 230; this.ch.enemyAttack({ x: this.facing > 0 ? this.x + 4 : this.x - 26, y: this.y - 30, w: 22, h: 30 }, 1, this.facing); } if (this.st > 0.6) { this.set('walk'); this.cool = 1.6; } break;
      case 'stagger': this.vx = 0; this.frame = 'bul_stagger'; if (this.st > 1.7) this.set('walk'); break;
    }
    this.body(dt);
  }
  draw(ctx, atlas, cam) { atlas.draw(ctx, this.frame || 'bul_walk0', this.x - cam.x, this.y - cam.y, this.facing < 0, this.flash > 0); }
}

// ---- props ----------------------------------------------------------------
export class Crate extends Enemy {
  constructor(ch, x, y, o) { super(ch, x, y, o); this.w = 16; this.h = 16; this.hp = 1; this.enemy = false; this.contact = 0; this.prop = true; this.blocks = true; }
  takeHit() { this.dead = true; const ch = this.ch; ch.fx.burst(this.x, this.y - 8, 12, ['E', 'a', 'e', 'D'], 120); ch.game.sfx.play('px.crumble', { pitch: 1.4 }); ch.dropPickup(this.x, this.y - 8); return 'hit'; }
  update(dt) { this.vy = Math.min(this.vy + GRAV * dt, 380); this.vx = 0; moveBody(this.ch.level, this, dt, null); if (this.onGround && (this.groundTile === 5 || this.groundTile === 6)) this.x += (this.groundTile === 5 ? 45 : -45) * dt; if (this.y > this.ch.level.H * 16) this.dead = true; }
  draw(ctx, atlas, cam) { atlas.draw(ctx, 'crate', this.x - cam.x, this.y - cam.y); }
}
export class Barrel extends Enemy {
  constructor(ch, x, y, o) { super(ch, x, y, o); this.w = 12; this.h = 17; this.hp = 99; this.enemy = false; this.contact = 0; this.prop = true; this.live = false; this.fuse = 0; }
  takeHit(hit) {
    if (hit.shot) { this.explode(); return 'hit'; }
    this.live = true; this.fuse = 1.6; this.vx = Math.sign(hit.kbx || hit.dir) * 270; this.vy = Math.min(hit.kby, -90); this.onGround = false; this.flash = 0.1;
    this.ch.game.sfx.play('px.clank'); return 'hit';
  }
  explode() {
    if (this.dead) return; this.dead = true; const ch = this.ch, cx = this.x, cy = this.y - 9;
    ch.fx.boom(cx, cy); ch.fx.sprite('fx_boom', cx - 14, cy + 6, 6, 18); ch.fx.sprite('fx_boom', cx + 12, cy - 8, 6, 18); ch.game.sfx.play('px.explode', { pitch: 0.8 }); ch.shake(7, 0.3); ch.hitstop(0.06);
    ch.playerAttack({ x: cx - 40, y: cy - 38, w: 80, h: 72 }, { dmg: 5, kb: [220, -260], stop: 0, heavy: true, radial: true, srcX: cx }, new Set([this]), 1, true);
    const pl = ch.player; if (Math.hypot(pl.x - cx, pl.y - 12 - cy) < 34) pl.hurt(1, Math.sign(pl.x - cx) || 1);
  }
  update(dt) {
    this.flash -= dt; this.vy = Math.min(this.vy + GRAV * dt, 380);
    const vx0 = this.vx; moveBody(this.ch.level, this, dt, this.ch.solids);
    if (this.onGround && (this.groundTile === 5 || this.groundTile === 6)) this.x += (this.groundTile === 5 ? 45 : -45) * dt;
    if (this.live) {
      this.fuse -= dt;
      if (this.wallDir || this.fuse <= 0) return this.explode();
      if (this.onGround) { this.vx = vx0 * 0.985; if (Math.abs(this.vx) < 30) return this.explode(); }
      for (const e of this.ch.entities) if (e.enemy && !e.dead) { const b = e.hurtbox; if (b && this.x > b.x - 6 && this.x < b.x + b.w + 6 && this.y - 9 > b.y - 6 && this.y - 9 < b.y + b.h + 6) return this.explode(); }
      if (this.ch.boss?.hitByBarrel(this)) return this.explode();
    } else this.vx = 0;
    if (this.y > this.ch.level.H * 16) this.dead = true;
  }
  draw(ctx, atlas, cam) { atlas.draw(ctx, this.live && Math.floor(this.fuse * 14) % 2 ? 'barrel1' : 'barrel0', this.x - cam.x, this.y - cam.y, false, this.flash > 0 || (this.live && this.fuse < 0.4 && Math.floor(this.fuse * 30) % 2 === 0)); }
}

// ---- mechanisms -----------------------------------------------------------
function fill(ctx, c, x, y, w, h) { ctx.fillStyle = PAL[c]; ctx.fillRect(Math.round(x), Math.round(y), w, h); }

export class Crusher {
  constructor(ch, x, y, o) { this.ch = ch; this.x0 = x - 8; this.top = y; this.bottom = o.bottom * 16; this.len = 30; this.t = -(o.phase || 0); this.rest = this.bottom - this.top - 92; this.len = this.rest; this.solid = { x: this.x0, y: this.top, w: 32, h: this.len, dx: 0, dy: 0 }; this.mech = true; }
  update(dt) {
    this.t += dt; const full = this.bottom - this.top, c = ((this.t % 3.1) + 3.1) % 3.1, prev = this.len;
    if (c < 1.2) this.len = this.rest;
    else if (c < 1.6) this.len = this.rest + (Math.floor(this.t * 40) % 2 ? 2 : 0);          // shudder telegraph
    else if (c < 1.76) this.len = this.rest + (full - this.rest) * ((c - 1.6) / 0.16);
    else if (c < 2.3) this.len = full;
    else this.len = full - (full - this.rest) * ((c - 2.3) / 0.8);
    if (prev < full - 1 && this.len >= full - 1 && this.ch.onScreen(this.x0 + 16, this.bottom)) { this.ch.game.sfx.play('px.slam', { vol: 0.8 }); this.ch.shake(3, 0.12); this.ch.fx.sprite('fx_dust', this.x0 + 2, this.bottom, 4, 16); this.ch.fx.sprite('fx_dust', this.x0 + 30, this.bottom, 4, 16); }
    this.solid.dy = this.len - prev; this.solid.h = this.len; this.falling = this.len > prev + 2;
    // crush check against entities resting underneath
    if (this.falling) for (const e of this.ch.entities) if (e.enemy && !e.dead && e.x > this.x0 && e.x < this.x0 + 32 && e.y - e.h < this.top + this.len && e.y > this.top + this.len - 12) e.takeHit({ dmg: 9, kbx: 0, kby: 0, heavy: true, dir: 1 });
  }
  draw(ctx, atlas, cam) {
    const x = this.x0 - cam.x, y = this.top - cam.y, L = Math.round(this.len);
    fill(ctx, 'G', x + 9, y, 14, L - 14); fill(ctx, 'i', x + 11, y, 2, L - 14); fill(ctx, 'h', x + 13, y, 3, L - 14); fill(ctx, 'K', x + 8, y, 1, L - 14); fill(ctx, 'K', x + 23, y, 1, L - 14);
    for (let yy = (L % 8); yy < L - 16; yy += 8) fill(ctx, 'g', x + 9, y + yy, 14, 1);
    const hy = y + L - 16; // head
    fill(ctx, 'K', x - 1, hy - 1, 34, 18); fill(ctx, 'h', x, hy, 32, 16); fill(ctx, 'i', x, hy, 32, 2); fill(ctx, 'G', x, hy + 11, 32, 5);
    for (let i = 0; i < 32; i += 8) { fill(ctx, 'y', x + i, hy + 4, 4, 5); fill(ctx, 'K', x + i + 4, hy + 4, 4, 5); }
    for (let i = 1; i < 32; i += 6) fill(ctx, 'W', x + i, hy + 14, 3, 2);
  }
}
export class Lift {
  constructor(ch, x, y, o) { this.ch = ch; this.w = (o.w || 3) * 16; this.x0 = x - 8; this.y0 = o.y0 * 16; this.y1 = o.y1 * 16; this.y = this.y0; this.dir = -1; this.wait = 1; this.solid = { x: this.x0, y: this.y, w: this.w, h: 8, dx: 0, dy: 0 }; this.mech = true; }
  update(dt) {
    const prev = this.y;
    if (this.wait > 0) this.wait -= dt; else { this.y += this.dir * 48 * dt; if (this.y <= this.y1) { this.y = this.y1; this.dir = 1; this.wait = 1.3; } if (this.y >= this.y0) { this.y = this.y0; this.dir = -1; this.wait = 1.3; } }
    this.solid.dy = this.y - prev; this.solid.y = this.y;
  }
  draw(ctx, atlas, cam) {
    const x = this.x0 - cam.x, y = Math.round(this.y - cam.y);
    for (const cx of [x + 4, x + this.w - 6]) { fill(ctx, 'n', cx, this.y1 - 120 - cam.y, 2, this.y0 - this.y1 + 140); }
    fill(ctx, 'K', x - 1, y - 1, this.w + 2, 10); fill(ctx, 'h', x, y, this.w, 8); fill(ctx, 'W', x, y, this.w, 1); fill(ctx, 'i', x, y + 1, this.w, 1); fill(ctx, 'G', x, y + 5, this.w, 3);
    for (let i = 2; i < this.w; i += 8) { fill(ctx, 'y', x + i, y + 3, 4, 2); }
    fill(ctx, this.wait > 0 ? 'J' : 'R', x + this.w / 2 - 1, y + 5, 2, 2);
  }
}
export class Gate {
  constructor(ch, tx, ty, hTiles) { this.ch = ch; this.x = tx * 16; this.y = ty * 16; this.h = hTiles * 16; this.open = 1; this.target = 1; this.solid = { x: this.x, y: this.y, w: 16, h: this.h, dx: 0, dy: 0, off: true }; this.mech = true; }
  close() { if (this.target !== 0) { this.target = 0; this.ch.game.sfx.play('px.slam', { vol: 0.7, pitch: 1.3 }); } }
  release() { if (this.target !== 1) { this.target = 1; this.ch.game.sfx.play('px.clank'); } }
  update(dt) { this.open = approach(this.open, this.target, dt * 3.5); this.solid.off = this.open > 0.9; this.solid.h = this.h * (1 - this.open); }
  draw(ctx, atlas, cam) {
    const hh = Math.round(this.h * (1 - this.open)); if (hh <= 0) return; const x = this.x - cam.x, y = this.y - cam.y;
    fill(ctx, 'K', x, y, 16, hh); fill(ctx, 'G', x + 1, y, 14, hh - 1); fill(ctx, 'h', x + 2, y, 3, hh - 1);
    for (let yy = hh - 8; yy > 0; yy -= 10) { fill(ctx, 'y', x + 2, y + yy, 12, 3); fill(ctx, 'K', x + 6, y + yy, 4, 3); }
    fill(ctx, 'R', x + 6, y + hh - 4, 4, 2);
  }
}
export class Pickup {
  constructor(ch, x, y, kind) { this.ch = ch; this.x = x; this.y = y; this.vy = -120; this.kind = kind; this.t = 0; this.w = 8; this.h = 8; this.vx = 0; this.pickup = true; }
  update(dt) {
    this.t += dt; this.vy = Math.min(this.vy + 500 * dt, 200); moveBody(this.ch.level, this, dt, null);
    const pl = this.ch.player; if (this.t > 0.25 && Math.abs(pl.x - this.x) < 12 && Math.abs(pl.y - 12 - this.y + 4) < 18) {
      this.dead = true; this.ch.game.sfx.play('px.pickup', { pitch: this.kind === 'hp' ? 1 : 1.3 });
      if (this.kind === 'hp') pl.hp = Math.min(pl.maxHp, pl.hp + 1); else pl.energy = Math.min(pl.maxEnergy, pl.energy + 1.5);
      this.ch.fx.burst(this.x, this.y - 4, 6, this.kind === 'hp' ? ['c', 'C', 'W'] : ['y', 'Y', 'W'], 60, 0);
    }
    if (this.t > 9) this.dead = true;
  }
  draw(ctx, atlas, cam) {
    if (this.t > 7 && Math.floor(this.t * 12) % 2) return;
    const x = Math.round(this.x - cam.x), y = Math.round(this.y - cam.y - 8 + Math.sin(this.t * 6) * 1.5);
    if (this.kind === 'hp') atlas.draw(ctx, 'heart1', x - 4, y);
    else { fill(ctx, 'K', x - 4, y, 8, 8); fill(ctx, 'y', x - 3, y + 1, 6, 6); fill(ctx, 'W', x - 2, y + 2, 2, 2); fill(ctx, 'O', x - 3, y + 6, 6, 1); }
  }
}

export const SPAWN = { scrapper: Scrapper, wasp: Wasp, sentry: Sentry, bulwark: Bulwark, crate: Crate, barrel: Barrel, crusher: Crusher, lift: Lift };
