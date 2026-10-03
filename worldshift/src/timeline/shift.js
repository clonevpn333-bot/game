// Timeline shifting: the signature mechanic. The target era materialises in an
// expanding wavefront centred on the player while the old era dissolves
// outside it — camera orientation is untouched so you see the *same place*
// transform. Holding Q opens a small "peek" bubble into another era.
import * as THREE from 'three';
import { G, ERA_YEARS, ERA_NAMES } from '../core/state.js';
import { clamp, damp, lerp, smoothstep } from '../core/mathx.js';
import { EU } from '../world/materials.js';
import { ERA_DEF } from '../world/eras.js';

const DURATION = 1.45;
const MAX_R = 1500;

export class ShiftSystem {
  constructor() {
    this.active = false;
    this.t = 0;
    this.from = 0;
    this.to = 0;
    this.cooldown = 0;
    this.charge = 1;          // chrono energy 0..1
    this.cost = 0.34;
    this.rechargeRate = 0.11; // per second
    this.peekR = 0;
    this.peekEra = 1;
    this.peekHeld = false;
    this.lastEra = 1;
    this.blockedFlash = 0;
    this.center = new THREE.Vector3();
    this.obstructed = [false, false, false];
    this.unlocked = [true, true, true];
    this.onShift = [];
  }

  canShiftTo(era) {
    return era !== G.era && !this.active && this.cooldown <= 0 && this.charge >= this.cost - 1e-3 && this.unlocked[era] && !G.player.dead;
  }

  // Check whether the player's body would be inside a solid in another era
  checkObstruction(era) {
    const p = G.player;
    const pos = p.vehicle ? p.vehicle.pos : p.pos;
    const r = p.vehicle ? 1.0 : 0.28;
    const h = p.vehicle ? 1.4 : 1.7;
    return !G.collision.bodyFree(era, pos.x, pos.y + 0.05, pos.z, r, h);
  }

  request(era) {
    if (era === G.era) return false;
    if (!this.unlocked[era]) { G.hud && G.hud.toast('This era is not reachable yet', 'warn'); return false; }
    if (this.active || this.cooldown > 0) return false;
    if (this.charge < this.cost - 1e-3) {
      G.hud && G.hud.toast('CHRONO CHARGE LOW', 'warn');
      G.audio && G.audio.play('denied');
      return false;
    }
    // make sure the destination exists around us
    const p = G.player;
    G.chunks.update(p.pos.x, p.pos.z, era, true);
    if (this.checkObstruction(era)) {
      this.blockedFlash = 1;
      G.hud && G.hud.toast(`TEMPORAL OBSTRUCTION — something occupies this space in ${ERA_YEARS[era]}`, 'warn');
      G.audio && G.audio.play('denied');
      G.cam && G.cam.shake(0.15);
      return false;
    }
    this.start(era);
    return true;
  }

  start(era) {
    const p = G.player;
    this.from = G.era;
    this.to = era;
    this.lastEra = this.from;
    this.active = true;
    this.t = 0;
    this.charge -= this.cost;
    this.peekR = 0;
    this.center.set(p.pos.x, p.pos.y + 1.0, p.pos.z);
    if (p.vehicle) this.center.copy(p.vehicle.pos).y += 1;
    // set uniforms
    for (let e = 0; e < 3; e++) {
      EU[e].uShiftCenter.value.copy(this.center);
      EU[e].uShiftEdge.value.copy(ERA_DEF[era].edge);
      EU[e].uShiftEdgeW.value = 2.2;
    }
    EU[this.from].uShiftMode.value = 1;
    EU[this.to].uShiftMode.value = -1;
    EU[this.from].uShiftRadius.value = 0;
    EU[this.to].uShiftRadius.value = 0;
    G.chunks.setVisibleEras([this.from, this.to]);
    G.world.setEraVisible([this.from, this.to]);
    // gameplay switches immediately (collision, AI, physics)
    G.era = era;
    G.chunks.visibleEra = era;
    G.sky.setEra(era, this.from);
    G.audio && G.audio.shift(this.from, era);
    G.cam && (G.cam.shake(0.35), G.cam.kick(14));
    for (const fn of this.onShift) fn(this.from, era);
    G.events && G.events.emit('shift', this.from, era);
  }

  update(dt, input) {
    const fin = G.engine.final;
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.charge = Math.min(1, this.charge + this.rechargeRate * dt * (this.active ? 0 : 1));
    this.blockedFlash = Math.max(0, this.blockedFlash - dt * 2.5);

    // obstruction status for HUD (cheap point checks)
    if (G.frame % 10 === 0) for (let e = 0; e < 3; e++) this.obstructed[e] = e !== G.era && this.checkObstruction(e);

    // input
    if (!this.active && G.player && !G.player.dead && !G.ui?.modal) {
      if (input.keyPressed('Digit1')) this.request(0);
      if (input.keyPressed('Digit2')) this.request(1);
      if (input.keyPressed('Digit3')) this.request(2);
      this.peekHeld = input.key('KeyQ');
      if (this.peekHeld && input.wheel !== 0) {
        let e = this.peekEra;
        do { e = (e + (input.wheel > 0 ? 1 : 2)) % 3; } while (e === G.era);
        this.peekEra = e;
      }
      if (this.peekEra === G.era) this.peekEra = this.lastEra !== G.era ? this.lastEra : (G.era + 1) % 3;
    } else this.peekHeld = false;

    if (this.active) {
      this.t += dt;
      const k = clamp(this.t / DURATION, 0, 1);
      const r = MAX_R * Math.pow(k, 2.6) + k * 6;
      EU[this.from].uShiftRadius.value = r;
      EU[this.to].uShiftRadius.value = r;
      G.sky.blend = smoothstep(0, 0.75, k);
      // post fx envelope
      const env = Math.sin(Math.min(1, k * 1.6) * Math.PI);
      fin.uDistort.value = env * (1 - k * 0.6);
      fin.uFlash.value = Math.max(0, 0.6 - this.t * 3.2);
      { const c = ERA_DEF[this.to].edge; fin.uFlashColor.value.set(c.r * 0.8, c.g * 0.8, c.b * 0.8); }
      fin.uScan.value = env * 0.8;
      if (k >= 1) this.finish();
    } else {
      fin.uDistort.value = damp(fin.uDistort.value, 0, 10, dt);
      fin.uFlash.value = damp(fin.uFlash.value, 0, 10, dt);
      fin.uScan.value = damp(fin.uScan.value, this.blockedFlash * 0.6, 10, dt);
      // Peek bubble
      const want = this.peekHeld ? 7.5 : 0;
      this.peekR = damp(this.peekR, want, this.peekHeld ? 5 : 12, dt);
      const pe = this.peekEra;
      if (this.peekR > 0.05) {
        const p = G.player;
        const c = p.vehicle ? p.vehicle.pos : p.pos;
        for (let e = 0; e < 3; e++) {
          EU[e].uShiftCenter.value.set(c.x, c.y + 1.0, c.z);
          EU[e].uShiftEdge.value.copy(ERA_DEF[pe].edge);
          EU[e].uShiftEdgeW.value = 0.6;
          EU[e].uShiftRise.value = 0;
          EU[e].uShiftMode.value = 0;
          EU[e].uShiftRadius.value = this.peekR;
        }
        EU[G.era].uShiftMode.value = 1;
        EU[pe].uShiftMode.value = -1;
        G.chunks.setVisibleEras([G.era, pe]);
        G.world.setEraVisible([G.era, pe]);
        this._peeking = true;
        fin.uPeek.value = clamp(this.peekR / 7.5, 0, 1);
        { const c = ERA_DEF[pe].edge; fin.uPeekColor.value.set(c.r, c.g, c.b); }
      } else if (this._peeking) {
        this._peeking = false;
        for (let e = 0; e < 3; e++) { EU[e].uShiftMode.value = 0; EU[e].uShiftRise.value = 1; }
        G.chunks.setVisibleEras([G.era]);
        G.world.setEraVisible([G.era]);
        fin.uPeek.value = 0;
      }
    }
    fin.uDamage.value = damp(fin.uDamage.value, 0, 2.5, dt);
  }

  finish() {
    this.active = false;
    this.cooldown = 0.6;
    for (let e = 0; e < 3; e++) { EU[e].uShiftMode.value = 0; EU[e].uShiftRadius.value = 0; EU[e].uShiftRise.value = 1; }
    G.chunks.setVisibleEras([this.to]);
    G.world.setEraVisible([this.to]);
    G.sky.setEra(this.to);
    if (this.t < 50) G.hud && G.hud.eraArrived(this.to);
    const found = G.chronicle.revealFor(this.to);
    if (found.length && G.hud) G.hud.consequences(found);
    G.events && G.events.emit('shiftDone', this.from, this.to);
  }
}

export { ERA_NAMES };
