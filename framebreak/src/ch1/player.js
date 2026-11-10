// RIN (pixel form) — combo action-platformer controller.
// run / variable jump / double jump / wall slide + kick / dash (i-frames) /
// slide / 3-hit ground combo / launcher / air combo / dive-slam with pogo /
// frame-shot with charge. 60 Hz fixed step, pixel-snapped presentation.
import { moveBody, touchingWall, canStand, boxOf } from './physics.js';
import { T } from './tiles.js';
import { RIN_ANIMS } from './sprites_rin.js';
import { approach, clamp } from '../core/util.js';

const RUN = 125, ACC_G = 1300, ACC_A = 950, FRIC = 1500, GRAV = 900, MAXFALL = 340;
const JUMP = 288, DJUMP = 250, COYOTE = 0.09, BUFFER = 0.11;
const WALL_SLIDE = 52, WALL_JX = 165, WALL_JY = 272, WALL_LOCK = 0.15;
const DASH_V = 300, DASH_T = 0.17, DASH_CD = 0.32, SLIDE_T = 0.42;
const STAND_H = 24, SLIDE_H = 11;

// box: [forward offset, y offset from feet, w, h]
export const MOVES = {
  atk1: { anim: 'atk1', dur: 0.22, active: [0.04, 0.13], box: [2, -24, 32, 22], dmg: 1, kb: [100, -30], stop: 0.045, fx: 'fx_s1', next: 'atk2', cancel: 0.12, lunge: 70 },
  atk2: { anim: 'atk2', dur: 0.24, active: [0.04, 0.14], box: [0, -40, 32, 38], dmg: 1, kb: [80, -110], stop: 0.045, fx: 'fx_s2', next: 'atk3', cancel: 0.13, lunge: 55 },
  atk3: { anim: 'atk3', dur: 0.4, active: [0.13, 0.23], box: [-2, -44, 44, 48], dmg: 3, kb: [280, -160], stop: 0.11, fx: 'fx_s3', heavy: true, lunge: 110, shake: 4, fxAt: 0.12 },
  up: { anim: 'up', dur: 0.32, active: [0.07, 0.2], box: [-4, -54, 30, 54], dmg: 2, kb: [25, -350], stop: 0.08, fx: 'fx_up', heavy: true, launcher: true, fxAt: 0.07 },
  air1: { anim: 'air1', dur: 0.19, active: [0.03, 0.12], box: [0, -26, 32, 24], dmg: 1, kb: [70, -70], stop: 0.04, fx: 'fx_s1', next: 'air2', cancel: 0.1, air: true },
  air2: { anim: 'air2', dur: 0.24, active: [0.04, 0.15], box: [-20, -42, 52, 46], dmg: 2, kb: [150, -150], stop: 0.06, fx: 'fx_spin', next: 'air1', cancel: 0.17, air: true },
};

export class Player {
  constructor(ch) {
    this.ch = ch;
    this.x = 0; this.y = 0; this.w = 10; this.h = STAND_H; this.vx = 0; this.vy = 0;
    this.onGround = false; this.wallDir = 0; this.riding = null; this.dropT = 0;
    this.facing = 1; this.state = 'normal';
    this.hp = 6; this.maxHp = 6; this.energy = 4; this.maxEnergy = 4;
    this.coyote = 0; this.jumpBuf = 0; this.jumps = 1; this.airDash = 1;
    this.dashT = 0; this.dashCd = 0; this.slideT = 0; this.wallLock = 0; this.invuln = 0; this.iframes = 0;
    this.move = null; this.moveT = 0; this.hitSet = new Set(); this.queued = null; this.fxDone = false;
    this.atkBuf = 0; this.chargeT = 0; this.shootCd = 0; this.hurtT = 0; this.landT = 0; this.deadT = 0;
    this.anim = 'idle'; this.animT = 0; this.stepT = 0; this.wallSliding = false; this.diving = false; this.control = true;
    this.lastSafe = { x: 0, y: 0 };
    this.wallX = null; // invisible barrier (train ride)
    this.airAtks = 3; this.shootAnim = 0; this.launched = false; this.recoiled = false; this.groundTile = 0; this.groundTx = 0; this.groundTy = 0;
  }
  spawn(x, y) {
    Object.assign(this, { x, y, vx: 0, vy: 0, state: 'normal', hp: this.maxHp, energy: this.maxEnergy, move: null, invuln: 1, diving: false, h: STAND_H, deadT: 0, hurtT: 0, riding: null });
    this.lastSafe = { x, y };
  }
  get cx() { return this.x; } get cy() { return this.y - this.h / 2; }
  get hurtbox() { return boxOf(this); }
  setAnim(a) { if (this.anim !== a) { this.anim = a; this.animT = 0; } }
  frameName() {
    const a = RIN_ANIMS[this.anim], n = a.f.length; let i = Math.floor(this.animT * a.fps);
    i = a.loop ? i % n : Math.min(i, n - 1);
    return 'rin_' + a.f[i];
  }

  update(dt) {
    const ch = this.ch, inp = ch.game.input, L = ch.level, sfx = ch.game.sfx;
    const ctl = this.control && this.state !== 'dead';
    const ax = ctl ? inp.axisX : 0, ix = ax > 0.3 ? 1 : ax < -0.3 ? -1 : 0, down = ctl && inp.down.down, up = ctl && inp.down.up;
    this.animT += dt; this.invuln -= dt; this.iframes -= dt; this.dashCd -= dt; this.wallLock -= dt; this.shootCd -= dt; this.dropT -= dt; this.landT -= dt;
    this.energy = Math.min(this.maxEnergy, this.energy + dt * 0.22);
    if (ctl && inp.pressed.jump) this.jumpBuf = BUFFER; else this.jumpBuf -= dt;
    if (ctl && inp.pressed.attack) this.atkBuf = 0.14; else this.atkBuf -= dt;

    if (this.state === 'dead') {
      this.deadT += dt; this.vy = Math.min(this.vy + GRAV * dt, MAXFALL); this.vx = approach(this.vx, 0, 300 * dt);
      moveBody(L, this, dt, ch.solids); if (this.deadT > 1.25) ch.respawn(); return;
    }
    if (this.state === 'hurt') {
      this.hurtT -= dt; this.vy = Math.min(this.vy + GRAV * dt, MAXFALL);
      moveBody(L, this, dt, ch.solids); this.setAnim('hurt');
      if (this.hurtT <= 0) this.state = 'normal';
      this.postMove(dt); return;
    }

    // ---- dash
    if (this.state === 'dash') {
      this.dashT -= dt; this.vx = this.facing * DASH_V; this.vy = 0;
      if (ch.frame % 2 === 0) ch.fx.afterimage(this);
      moveBody(L, this, dt, ch.solids); this.setAnim('dash');
      if (this.jumpBuf > 0 && (this.onGround || this.coyote > 0)) { this.state = 'normal'; this.doJump(); this.vx = this.facing * DASH_V * 0.8; }
      else if (this.dashT <= 0 || this.wallDir) { this.state = 'normal'; this.vx = this.facing * RUN; }
      this.postMove(dt); return;
    }
    // ---- slide
    if (this.state === 'slide') {
      this.slideT -= dt; const sp = 130 + 150 * clamp(this.slideT / SLIDE_T, 0, 1);
      this.vx = this.facing * sp; this.vy = Math.min(this.vy + GRAV * dt, MAXFALL);
      if (ch.frame % 4 === 0) ch.fx.sprite('fx_dust', this.x - this.facing * 8, this.y, 4, 18);
      moveBody(L, this, dt, ch.solids); this.setAnim('slide');
      const clear = canStand(L, this, STAND_H);
      if (this.jumpBuf > 0 && clear && this.onGround) { this.h = STAND_H; this.state = 'normal'; this.doJump(); this.vx = this.facing * 190; }
      else if ((this.slideT <= 0 && clear) || !this.onGround || this.wallDir) { if (clear) { this.h = STAND_H; this.state = 'normal'; } else if (this.wallDir) { this.facing = -this.facing; this.slideT = 0.2; } }
      this.postMove(dt); return;
    }

    // ---- horizontal control
    const moving = this.move && !this.move.air && this.onGround;
    if (this.wallLock <= 0 && !moving && !this.diving) {
      const target = ix * RUN, acc = this.onGround ? (ix ? ACC_G : FRIC) : ix ? ACC_A : 260;
      if (Math.abs(this.vx) > RUN && ix === Math.sign(this.vx) && !this.onGround) { /* keep dash/slide momentum in the air */ this.vx = approach(this.vx, target, 220 * dt); }
      else this.vx = approach(this.vx, target, acc * dt);
      if (ix && !this.move) this.facing = ix;
    } else if (moving) this.vx = approach(this.vx, 0, 900 * dt);

    // conveyor
    if (this.onGround && (this.groundTile === T.CONV_R || this.groundTile === T.CONV_L)) this.x += (this.groundTile === T.CONV_R ? 45 : -45) * dt;

    // ---- wall slide
    this.wallSliding = false;
    if (!this.onGround && this.vy > 0 && ix && touchingWall(L, this, ix) && !this.move && !this.diving) {
      this.wallSliding = true; this.vy = Math.min(this.vy, WALL_SLIDE); this.facing = ix; this.jumps = 1; this.airDash = 1;
      if (ch.frame % 8 === 0) ch.fx.sprite('fx_dust', this.x + ix * 5, this.y - 6, 4, 16);
    }
    // ---- gravity
    if (!this.diving) this.vy = Math.min(this.vy + GRAV * dt, MAXFALL);
    if (ctl && inp.released.jump && this.vy < -90 && !this.launched) this.vy *= 0.45;

    // ---- jump
    if (this.onGround) { this.coyote = COYOTE; this.jumps = 1; this.airDash = 1; this.launched = false; } else this.coyote -= dt;
    if (this.jumpBuf > 0 && !this.diving) {
      if (down && this.onGround && this.groundTile === T.ONEWAY) { this.dropT = 0.18; this.jumpBuf = 0; this.y += 2; }
      else if (this.coyote > 0) this.doJump();
      else if (!this.onGround && (touchingWall(L, this, 1) || touchingWall(L, this, -1))) {
        const d = touchingWall(L, this, 1) ? 1 : -1;
        this.vx = -d * WALL_JX; this.vy = -WALL_JY; this.facing = -d; this.wallLock = WALL_LOCK; this.jumpBuf = 0; this.jumps = 1; this.move = null; this.launched = true;
        sfx.play('px.jump', { pitch: 1.15 }); ch.fx.sprite('fx_dust', this.x + d * 5, this.y - 8, 4, 18);
      } else if (this.jumps > 0) {
        this.jumps--; this.vy = -DJUMP; this.jumpBuf = 0; this.move = null;
        sfx.play('px.djump'); ch.fx.sprite('fx_ring', this.x, this.y, 4, 20);
      }
    }
    // ---- dash / slide
    if (ctl && inp.pressed.down && this.onGround && this.dashCd <= 0 && !this.move && this.state === 'normal' && this.groundTile !== 2) { this.state = 'slide'; this.slideT = SLIDE_T; this.h = SLIDE_H; this.dashCd = 0.25; if (ix) this.facing = ix; sfx.play('px.slide'); }
    else if (ctl && inp.pressed.dash && this.dashCd <= 0 && !this.diving) {
      if (down && this.onGround) { this.state = 'slide'; this.slideT = SLIDE_T; this.h = SLIDE_H; this.move = null; this.dashCd = 0.25; sfx.play('px.slide'); }
      else if (this.onGround || this.airDash > 0) {
        if (!this.onGround) this.airDash--;
        if (ix) this.facing = ix;
        this.state = 'dash'; this.dashT = DASH_T; this.dashCd = DASH_CD; this.iframes = 0.15; this.move = null; sfx.play('px.dash');
        ch.fx.sprite('fx_dust', this.x - this.facing * 6, this.y, 4, 18);
      }
    }
    // ---- attacks
    if (this.atkBuf > 0 && !this.diving && this.state === 'normal') {
      let nextMove = null;
      if (!this.move) {
        if (!this.onGround && down) { this.startDive(); this.atkBuf = 0; }
        else if (up && this.onGround) nextMove = 'up';
        else nextMove = this.onGround ? 'atk1' : (this.airAtks > 0 ? 'air1' : null);
      } else if (this.move.next && this.moveT >= this.move.cancel) {
        if (!this.onGround && down) { this.move = null; this.startDive(); this.atkBuf = 0; }
        else if (up && this.onGround) nextMove = 'up';
        else nextMove = this.move.next;
        if (nextMove) {
          const nm = MOVES[nextMove];
          if (nm.air && this.onGround) nextMove = 'atk1'; else if (!nm.air && !this.onGround) nextMove = 'air1';
          if (MOVES[nextMove].air && this.airAtks <= 0) nextMove = null;
        }
      }
      if (nextMove) this.startMove(nextMove);
    }
    if (this.onGround) this.airAtks = 3;
    if (this.move) this.updateMove(dt);
    // ---- frame shot (tap) / charged frame (hold)
    if (ctl && !this.diving) {
      if (inp.down.shoot) { this.chargeT += dt; if (this.chargeT > 0.25 && ch.frame % 6 === 0) ch.fx.chargeMote(this); }
      if (inp.released.shoot || (this.chargeT > 0 && !inp.down.shoot)) {
        const big = this.chargeT >= 0.55 && this.energy >= 2;
        if (this.shootCd <= 0 && (big || this.energy >= 1)) {
          this.energy -= big ? 2 : 1; this.shootCd = big ? 0.35 : 0.16;
          ch.spawnShot(this.x + this.facing * 12, this.y - 15, this.facing, big);
          sfx.play(big ? 'px.charge' : 'px.shot'); if (!this.move) { this.setAnim(this.onGround ? 'shoot' : 'ashoot'); this.animT = 0; this.shootAnim = 0.2; }
          if (big) { this.vx -= this.facing * 90; ch.shake(3, 0.15); }
        } else if (this.shootCd <= 0) sfx.play('ui.back', { vol: 0.4 });
        this.chargeT = 0;
      }
    }
    // ---- dive
    if (this.diving) { this.vx = approach(this.vx, 0, 600 * dt); this.vy = 400; if (ch.frame % 2 === 0) ch.fx.afterimage(this); }

    const wasGround = this.onGround, vyBefore = this.vy;
    moveBody(L, this, dt, ch.solids);
    if (this.onGround && !wasGround) {
      if (this.diving) this.endDive();
      else if (vyBefore > 180) { this.landT = 0.09; sfx.play('px.land'); ch.fx.sprite('fx_dust', this.x, this.y, 4, 16); }
      if (this.move && this.move.air) this.move = null;
    }
    // ---- animation
    this.shootAnim -= dt;
    if (this.diving) this.setAnim('dive');
    else if (this.move) this.setAnim(this.move.anim);
    else if (this.shootAnim > 0) { /* hold shoot pose */ }
    else if (this.wallSliding) this.setAnim('wall');
    else if (!this.onGround) this.setAnim(this.vy < 0 ? 'jump' : 'fall');
    else if (this.landT > 0) this.setAnim('land');
    else if (Math.abs(this.vx) > 14 && ix) { this.setAnim('run'); this.stepT -= dt; if (this.stepT <= 0) { this.stepT = 0.21; sfx.play('px.step'); } }
    else this.setAnim('idle');
    this.postMove(dt);
  }

  postMove(dt) {
    const ch = this.ch, L = ch.level;
    if (this.crushed && this.invuln <= 0) this.hurt(2, 0, true);
    if (this.onGround && this.groundTile === T.CRUMBLE) ch.touchCrumble(this.groundTx, this.groundTy);
    if (this.onGround && this.state !== 'dead' && (this.groundTile === T.SOLID || this.groundTile === T.TRAIN) && !ch.unsafeGround(this.groundTx)) this.lastSafe = { x: this.x, y: this.y };
    // hazards: electric spikes
    const tx = Math.floor(this.x / 16), ty = Math.floor((this.y - 2) / 16);
    if (L.get(tx, ty) === T.SPIKE && this.invuln <= 0) this.hurt(1, -this.facing);
    if (this.y > L.H * 16 + 40 && this.state !== 'dead') ch.fellOut();
  }

  doJump() {
    this.vy = -JUMP; this.jumpBuf = 0; this.coyote = 0; this.onGround = false; if (this.move && !this.move.air) this.move = null;
    this.ch.game.sfx.play('px.jump'); this.ch.fx.sprite('fx_dust', this.x, this.y, 4, 20);
  }
  startMove(name) {
    const m = MOVES[name]; this.move = m; this.moveT = 0; this.hitSet.clear(); this.fxDone = false; this.atkBuf = 0; this.setAnim(m.anim); this.animT = 0;
    const ix = this.ch.game.input.axisX; if (ix > 0.3) this.facing = 1; else if (ix < -0.3) this.facing = -1;
    if (m.lunge && this.onGround) this.vx = this.facing * m.lunge;
    if (m.air) { this.airAtks--; if (this.vy > 40) this.vy = 40; }
    if (m.launcher) { this.vx = this.facing * 30; }
    this.ch.game.sfx.play(m.heavy ? 'px.launch' : 'px.swing', { pitch: name === 'atk2' || name === 'air2' ? 1.15 : 1 });
  }
  updateMove(dt) {
    const m = this.move, ch = this.ch; this.moveT += dt;
    if (!this.fxDone && this.moveT >= (m.fxAt ?? m.active[0])) { this.fxDone = true; ch.fx.slash(m.fx, this); if (m.launcher && this.onGround) { this.vy = -300; this.onGround = false; this.launched = true; this.coyote = 0; } }
    if (this.moveT >= m.active[0] && this.moveT <= m.active[1]) {
      const b = { x: this.facing > 0 ? this.x + m.box[0] : this.x - m.box[0] - m.box[2], y: this.y + m.box[1], w: m.box[2], h: m.box[3] };
      const res = ch.playerAttack(b, m, this.hitSet, this.facing);
      if (res.hit) { if (!this.onGround) { this.vy = Math.min(this.vy, -95); this.airAtks = Math.min(3, this.airAtks + 1); } this.energy = Math.min(this.maxEnergy, this.energy + 0.3 * res.hit); }
      if (res.blocked && !this.recoiled) { this.vx = -this.facing * 140; this.recoiled = true; }
    }
    if (this.moveT >= m.dur) { this.move = null; this.recoiled = false; }
  }
  startDive() { this.diving = true; this.move = null; this.vy = 400; this.vx *= 0.3; this.hitSet.clear(); this.ch.game.sfx.play('px.launch', { pitch: 0.8 }); }
  endDive() {
    const ch = this.ch; this.diving = false; this.landT = 0.16;
    ch.game.sfx.play('px.slam'); ch.shake(5, 0.2); ch.fx.sprite('fx_dust', this.x - 10, this.y, 4, 14); ch.fx.sprite('fx_dust', this.x + 10, this.y, 4, 14); ch.fx.sprite('fx_ring', this.x, this.y - 2, 4, 16);
    ch.playerAttack({ x: this.x - 30, y: this.y - 20, w: 60, h: 22 }, { dmg: 2, kb: [120, -200], stop: 0.08, heavy: true, radial: true }, new Set(), this.facing);
  }
  // Called by the chapter each step while diving to test for stomps.
  diveBox() { return { x: this.x - 9, y: this.y - 12, w: 18, h: 18 }; }
  pogo() { this.diving = false; this.vy = -270; this.jumps = 1; this.airDash = 1; this.airAtks = 3; this.launched = true; }

  hurt(dmg, dir = 0, force = false) {
    if (this.state === 'dead' || (!force && (this.invuln > 0 || this.iframes > 0))) return false;
    const ch = this.ch;
    const easy = ch.game.easy; if (easy) { this._half = !this._half; if (this._half) dmg = 0; }
    this.hp -= dmg; this.invuln = easy ? 1.8 : 1.15; this.move = null; this.diving = false; this.chargeT = 0; if (this.h !== STAND_H && canStand(ch.level, this, STAND_H)) this.h = STAND_H;
    ch.combo.drop(); ch.shake(5, 0.25); ch.hitstop(0.09); ch.flash(0.12, '#c2362f');
    if (this.hp <= 0) { this.die(); return true; }
    this.state = 'hurt'; this.hurtT = 0.28; this.vx = (dir || -this.facing) * 130; this.vy = -170; this.onGround = false;
    ch.game.sfx.play('px.hurt');
    return true;
  }
  die() {
    const ch = this.ch; this.state = 'dead'; this.deadT = 0; this.vy = -200; this.vx = -this.facing * 60; this.hp = 0;
    ch.game.sfx.play('px.die'); ch.fx.burst(this.x, this.y - 12, 26, ['c', 'O', 'W', 'C']); ch.game.save.data.stats.deaths++;
  }
  get visible() { return this.state !== 'dead' && (this.invuln <= 0 || Math.floor(this.invuln * 30) % 2 === 0); }
}
