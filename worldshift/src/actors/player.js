// Player controller: kinematic character with sprint, jump, vault, mantle,
// ledge grab, climbing, crouch, slide, swimming, fall reactions — and the
// blended procedural animation that sells it.
import * as THREE from 'three';
import { G } from '../core/state.js';
import { clamp, lerp, damp, dampAngle, wrapAngle, approach, smoothstep } from '../core/mathx.js';
import { CF, SURF } from '../world/collision.js';
import {
  Pose, poseIdle, poseLocomotion, poseCrouch, poseAir, poseFall, poseLand, poseSlide, poseVault, poseMantle,
  poseClimb, poseHang, poseSwim, poseSit, poseAim, poseMelee, poseBlock, poseDodge, poseHit, poseDead, J,
} from './rig.js';
import { Avatar } from './avatar.js';

const RADIUS = 0.32;
const HEIGHT = 1.78;
const CROUCH_H = 1.1;
const STEP = 0.42;
const GRAV = -24;
const WALK = 2.0, JOG = 4.6, SPRINT = 7.6, CROUCH_SPD = 2.1;

const _v = new THREE.Vector3();
const _p = new THREE.Vector3();

export class Player {
  constructor(scene) {
    this.pos = new THREE.Vector3(0, 0.2, 0);
    this.vel = new THREE.Vector3();
    this.yaw = 0;           // body facing
    this.state = 'ground';
    this.grounded = true;
    this.crouch = false;
    this.height = HEIGHT;
    this.health = 100;
    this.maxHealth = 100;
    this.armor = 0;
    this.stamina = 1;
    this.surf = SURF.concrete;
    this.inWater = false;
    this.airTime = 0;
    this.fallStartY = 0;
    this.landK = 0;
    this.landTimer = 0;
    this.phase = 0;
    this.speedN = 0;
    this.moveSpeed = 0;
    this.action = null;      // { type, t, dur, ... } for vault/mantle/dodge/slide
    this.climbPhase = 0;
    this.climbCol = null;
    this.hangLedge = null;
    this.vehicle = null;
    this.aiming = false;
    this.aimPitch = 0;
    this.recoil = 0;
    this.melee = null;
    this.blocking = false;
    this.hitT = 1; this.hitSide = 0;
    this.dead = false;
    this.deadT = 0;
    this.invuln = 0;
    this.noise = 0;          // how loud the player is (for AI hearing)
    this.lastStep = 0;
    this.footstepCb = null;

    this.pose = new Pose();
    this.tmp = new Pose();
    this.weights = { idle: 1, loco: 0, crouch: 0, air: 0, fall: 0, slide: 0, vault: 0, mantle: 0, climb: 0, hang: 0, swim: 0, sit: 0, dodge: 0, dead: 0 };
    this.upperW = 0; // aim
    this.blockW = 0;
    this.leanX = 0; this.leanZ = 0;
    this.prevVel = new THREE.Vector3();
    this.headLook = 0;
    this.velLocal = new THREE.Vector3();

    this.avatar = new Avatar();
    scene.add(this.avatar.group);
  }

  get era() { return G.era; }
  get headY() { return this.pos.y + this.height - 0.1; }
  get chest() { return _p.set(this.pos.x, this.pos.y + 1.3, this.pos.z); }

  teleport(x, y, z, yaw = this.yaw) {
    this.pos.set(x, y, z);
    this.vel.set(0, 0, 0);
    this.yaw = yaw;
    this.state = 'ground';
    this.action = null;
  }

  // ------------------------------------------------------------- update --
  update(dt, input, camYaw) {
    if (this.vehicle) { this._animate(dt); return; }
    if (this.dead) { this.deadT += dt; this._animate(dt); return; }
    this.invuln = Math.max(0, this.invuln - dt);
    const col = G.collision;
    const era = G.era;

    // input → desired direction (camera relative)
    let ix = input.axis('KeyA', 'KeyD');
    let iz = input.axis('KeyS', 'KeyW');
    const ilen = Math.hypot(ix, iz);
    if (ilen > 1) { ix /= ilen; iz /= ilen; }
    const fwdX = Math.sin(camYaw), fwdZ = Math.cos(camYaw);
    // screen-right in world space for a camera looking along (sin, cos)
    const rightX = -fwdZ, rightZ = fwdX;
    const dx = fwdX * iz + rightX * ix;
    const dz = fwdZ * iz + rightZ * ix;
    const hasInput = ilen > 0.1;
    const sprintKey = input.key('ShiftLeft') || input.key('ShiftRight');
    const walkKey = input.key('AltLeft') || input.key('KeyZ');

    if (input.keyPressed('KeyC') || input.keyPressed('ControlLeft')) {
      if (this.state === 'ground' && this.moveSpeed > 5.5 && !this.crouch) this._startSlide(dx, dz);
      else if (this.state === 'ground') this.crouch = !this.crouch;
    }

    // Actions in progress (vault / mantle / slide / dodge)
    if (this.action) {
      this._updateAction(dt, input, dx, dz, hasInput);
      this._animate(dt);
      return;
    }

    if (this.state === 'climb') { this._updateClimb(dt, input, iz, ix); this._animate(dt); return; }
    if (this.state === 'hang') { this._updateHang(dt, input, iz); this._animate(dt); return; }

    // target speed
    let target = 0;
    if (hasInput) {
      if (this.crouch) target = CROUCH_SPD;
      else if (walkKey) target = WALK;
      else if (sprintKey && this.stamina > 0.05 && !this.aiming) target = SPRINT;
      else target = this.aiming ? 3.0 : JOG;
      target *= Math.min(1, ilen);
    }
    if (this.inWater) target = Math.min(target, 2.6) * (sprintKey ? 1.4 : 1);
    if (this.blocking) target = Math.min(target, 1.8);
    if (this.melee) target *= 0.35;
    const sprinting = target >= SPRINT - 0.1 && this.moveSpeed > JOG;
    this.stamina = clamp(this.stamina + (sprinting ? -0.12 : 0.18) * dt, 0, 1);

    const grounded = this.state === 'ground';
    const accel = grounded ? (target > this.moveSpeed ? 22 : 30) : 5;
    if (hasInput) {
      const len = Math.hypot(dx, dz) || 1;
      const ndx = dx / len, ndz = dz / len;
      const vx = this.vel.x, vz = this.vel.z;
      const tvx = ndx * target, tvz = ndz * target;
      const k = 1 - Math.exp(-accel * dt / Math.max(1, target));
      if (grounded || this.inWater) {
        // turn responsiveness: keep momentum but swing direction quickly
        this.vel.x = lerp(vx, tvx, Math.min(1, accel * dt / Math.max(1.5, Math.hypot(tvx - vx, tvz - vz)) * 1.6));
        this.vel.z = lerp(vz, tvz, Math.min(1, accel * dt / Math.max(1.5, Math.hypot(tvx - vx, tvz - vz)) * 1.6));
      } else {
        this.vel.x += (tvx - vx) * k * 0.6;
        this.vel.z += (tvz - vz) * k * 0.6;
      }
      // face movement (or camera when aiming)
      if (!this.aiming) this.yaw = dampAngle(this.yaw, Math.atan2(ndx, ndz), grounded ? 12 : 4, dt);
    } else if (grounded || this.inWater) {
      const sp = Math.hypot(this.vel.x, this.vel.z);
      const ns = approach(sp, 0, 30 * dt);
      if (sp > 1e-4) { this.vel.x *= ns / sp; this.vel.z *= ns / sp; }
    }
    if (this.aiming || this.blocking || this.melee) this.yaw = dampAngle(this.yaw, camYaw, 18, dt);

    // jump
    if (input.keyPressed('Space')) {
      if (this.aiming && grounded) {
        this._startDodge(hasInput ? dx : Math.sin(this.yaw), hasInput ? dz : Math.cos(this.yaw));
        this._animate(dt);
        return;
      }
      if (grounded && !this.inWater) {
        // try vault/mantle first if something is in front
        if (!this._tryTraverse(true)) {
          this.vel.y = this.crouch ? 6.2 : 7.2;
          this.state = 'air';
          this.crouch = false;
          this.fallStartY = this.pos.y;
          G.audio && G.audio.play('jump', this.pos);
        }
      } else if (this.inWater) {
        this.vel.y = 4;
      }
    }
    // auto vault / mantle while sprinting into low obstacles
    if (grounded && hasInput && this.moveSpeed > 4 && !this.crouch) this._tryTraverse(false);
    if (this.action) { this._animate(dt); return; }

    // gravity / swimming
    if (this.inWater) {
      const wy = col.result.waterY;
      const targetY = wy - 1.25;
      this.vel.y = damp(this.vel.y, (targetY - this.pos.y) * 3, 4, dt);
    } else if (this.state !== 'ground') {
      this.vel.y += GRAV * dt;
      this.vel.y = Math.max(this.vel.y, -55);
    }

    // integrate with substeps
    const sp = Math.hypot(this.vel.x, this.vel.z, this.vel.y);
    const steps = Math.min(6, Math.max(1, Math.ceil(sp * dt / 0.25)));
    const h = this.crouch ? CROUCH_H : HEIGHT;
    this.height = damp(this.height, h, 14, dt);
    const sdt = dt / steps;
    let wasGrounded = this.state === 'ground';
    for (let s = 0; s < steps; s++) {
      this.pos.x += this.vel.x * sdt;
      this.pos.z += this.vel.z * sdt;
      col.resolveCylinder(era, this.pos, RADIUS, this.height, STEP);
      // vehicles as obstacles
      if (G.vehicles) G.vehicles.pushOut(this.pos, RADIUS, this.height);
      this.pos.y += this.vel.y * sdt;
      // ceiling
      if (this.vel.y > 0) {
        const ceil = col.ceiling(era, this.pos.x, this.pos.z, this.pos.y + 0.5, RADIUS * 0.8);
        if (this.pos.y + this.height > ceil) { this.pos.y = ceil - this.height; this.vel.y = 0; }
      }
      const gr = col.ground(era, this.pos.x, this.pos.z, this.pos.y + STEP, RADIUS * 0.7);
      const gy = gr.y;
      this.inWater = gr.water && this.pos.y < gr.waterY - 0.9;
      if (this.vel.y <= 0 && this.pos.y <= gy + 0.001) {
        this.pos.y = gy;
        if (this.state !== 'ground') this._onLand();
        this.state = 'ground';
        this.vel.y = 0;
        this.surf = gr.surf;
      } else if (wasGrounded && this.vel.y <= 0 && this.pos.y - gy < STEP + 0.1 && !this.inWater) {
        // snap down steps / slopes
        this.pos.y = gy;
        this.surf = gr.surf;
      } else if (!this.inWater) {
        if (this.state === 'ground') { this.state = 'air'; this.fallStartY = this.pos.y; this.airTime = 0; }
      }
      wasGrounded = this.state === 'ground';
    }
    if (this.inWater) { this.state = 'swim'; this.crouch = false; }
    else if (this.state === 'swim') this.state = 'air';
    if (this.state === 'air') {
      this.airTime += dt;
      this._tryLedgeGrab();
      if (this.state === 'air' && hasInput) this._tryClimbStart(dx, dz, true);
    }
    if (this.state === 'ground' && hasInput && iz > 0.5) this._tryClimbStart(dx, dz, false);

    // world bounds
    this.pos.x = clamp(this.pos.x, -1330, 1330);
    this.pos.z = clamp(this.pos.z, -1330, 1330);
    if (this.pos.y < -60) this.respawnSafe();

    this.moveSpeed = Math.hypot(this.vel.x, this.vel.z);
    this.noise = this.moveSpeed > 6 ? 1 : this.moveSpeed > 3 ? 0.5 : this.crouch ? 0.05 : 0.2;
    this._footsteps(dt);
    this._animate(dt);
  }

  respawnSafe() {
    const s = G.lastSafe || { x: 0, y: 2, z: 0 };
    this.teleport(s.x, s.y + 0.5, s.z);
  }

  _onLand() {
    const fall = this.fallStartY - this.pos.y;
    const vy = -this.vel.y;
    this.landK = clamp((vy - 4) / 14, 0, 1);
    this.landTimer = 0.0001;
    if (vy > 4) G.audio && G.audio.play('land', this.pos, clamp(vy / 15, 0.3, 1));
    if (G.cam) G.cam.shake(clamp((vy - 8) / 20, 0, 0.6));
    if (vy > 17) {
      const dmg = (vy - 17) * 7;
      this.damage(dmg, null, 'fall');
      if (this.moveSpeed > 3 && vy < 24) {
        // roll out of it
        this._startDodge(this.vel.x, this.vel.z, true);
      }
    }
    void fall;
  }

  _footsteps(dt) {
    if (this.state !== 'ground' || this.moveSpeed < 0.6) return;
    const stride = this.moveSpeed > 6 ? 1.0 : this.moveSpeed > 3 ? 0.78 : 0.62;
    // phase is advanced in _animate: emit on half cycles
    const half = Math.floor(this.phase / Math.PI);
    if (half !== this.lastStep) {
      this.lastStep = half;
      G.audio && G.audio.footstep(this.surf, this.pos, this.moveSpeed > 6 ? 1 : this.crouch ? 0.3 : 0.6);
    }
    void stride; void dt;
  }

  // Look ahead for vaultable / mantleable obstacles
  _tryTraverse(jumpPressed) {
    const col = G.collision, era = G.era;
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
    // probe forward at knee/chest height
    let hitTop = -1e9, hitC = null, dist = 0;
    for (const d of [0.45, 0.75, 1.0]) {
      const px = this.pos.x + fx * d, pz = this.pos.z + fz * d;
      const c = col.pointSolid(era, px, this.pos.y + 0.7, pz) || col.pointSolid(era, px, this.pos.y + 1.2, pz) || col.pointSolid(era, px, this.pos.y + 0.5, pz);
      if (c) {
        hitC = c; dist = d;
        hitTop = c.topAt(px, pz);
        break;
      }
    }
    if (!hitC) return false;
    if (hitC.flags & CF.NOVAULT) return false;
    const rel = hitTop - this.pos.y;
    if (rel <= STEP) return false;
    // headroom above the obstacle
    const ax = this.pos.x + fx * (dist + 0.35), az = this.pos.z + fz * (dist + 0.35);
    const ceil = col.ceiling(era, ax, az, hitTop + 0.05, 0.2);
    if (ceil - hitTop < 1.0) return false;
    if (rel <= 1.35 && (jumpPressed || this.moveSpeed > 4)) {
      // vault if thin and free on the other side, else mantle up
      const depth = this._obstacleDepth(fx, fz, dist, hitTop);
      if (depth < 1.3) {
        const lx = this.pos.x + fx * (dist + depth + 0.6), lz = this.pos.z + fz * (dist + depth + 0.6);
        const g = col.ground(era, lx, lz, hitTop + 0.1, 0.2);
        if (g.y < hitTop - 0.3 && col.bodyFree(era, lx, g.y, lz, 0.3, 1.7)) {
          this._startAction('vault', 0.48, { sx: this.pos.x, sy: this.pos.y, sz: this.pos.z, ex: lx, ey: g.y, ez: lz, top: hitTop });
          return true;
        }
      }
      if (jumpPressed || rel < 1.0) {
        const tx = this.pos.x + fx * (dist + 0.45), tz = this.pos.z + fz * (dist + 0.45);
        if (col.bodyFree(era, tx, hitTop, tz, 0.28, 1.7)) {
          this._startAction('mantle', rel < 1.0 ? 0.42 : 0.6, { sx: this.pos.x, sy: this.pos.y, sz: this.pos.z, ex: tx, ey: hitTop, ez: tz });
          return true;
        }
      }
    } else if (rel <= 2.5 && jumpPressed) {
      const tx = this.pos.x + fx * (dist + 0.45), tz = this.pos.z + fz * (dist + 0.45);
      if (col.bodyFree(era, tx, hitTop, tz, 0.28, 1.7)) {
        this._startAction('mantle', 0.85, { sx: this.pos.x, sy: this.pos.y, sz: this.pos.z, ex: tx, ey: hitTop, ez: tz, high: true });
        return true;
      }
    }
    return false;
  }

  _obstacleDepth(fx, fz, start, top) {
    const col = G.collision, era = G.era;
    for (let d = start + 0.15; d < start + 2.0; d += 0.15) {
      const c = col.pointSolid(era, this.pos.x + fx * d, top - 0.15, this.pos.z + fz * d);
      if (!c) return d - start;
    }
    return 9;
  }

  _tryLedgeGrab() {
    if (this.vel.y > 1.5 || this.airTime < 0.12) return;
    const col = G.collision, era = G.era;
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
    const px = this.pos.x + fx * 0.55, pz = this.pos.z + fz * 0.55;
    const hand = this.pos.y + 2.05;
    const c = col.pointSolid(era, px, hand - 0.25, pz);
    if (!c || (c.flags & CF.NOVAULT)) return;
    const top = c.topAt(px, pz);
    if (top < hand - 0.6 || top > hand + 0.15) return;
    // space above?
    if (!col.bodyFree(era, px + fx * 0.3, top, pz + fz * 0.3, 0.25, 1.0)) return;
    this.state = 'hang';
    this.hangLedge = { top, x: px, z: pz };
    this.vel.set(0, 0, 0);
    this.pos.y = top - 2.0;
    G.audio && G.audio.play('grab', this.pos);
  }

  _updateHang(dt, input, iz) {
    const l = this.hangLedge;
    if (input.keyPressed('Space') || iz > 0.5) {
      const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
      this._startAction('mantle', 0.7, { sx: this.pos.x, sy: this.pos.y, sz: this.pos.z, ex: l.x + fx * 0.3, ey: l.top, ez: l.z + fz * 0.3, high: true });
      this.state = 'ground';
    } else if (iz < -0.5 || input.keyPressed('KeyC')) {
      this.state = 'air';
      this.airTime = -0.3;
      this.pos.x -= Math.sin(this.yaw) * 0.25;
      this.pos.z -= Math.cos(this.yaw) * 0.25;
    }
  }

  _tryClimbStart(dx, dz, fromAir) {
    const col = G.collision, era = G.era;
    const len = Math.hypot(dx, dz) || 1;
    const fx = dx / len, fz = dz / len;
    const arr = col.queryBox(era, this.pos.x - 0.8, this.pos.z - 0.8, this.pos.x + 0.8, this.pos.z + 0.8);
    for (const c of arr) {
      if (!(c.flags & CF.CLIMB)) continue;
      const px = this.pos.x + fx * 0.5, pz = this.pos.z + fz * 0.5;
      if (px < c.minX - 0.1 || px > c.maxX + 0.1 || pz < c.minZ - 0.1 || pz > c.maxZ + 0.1) continue;
      if (this.pos.y + 1.0 < c.minY || this.pos.y > c.maxY - 0.5) continue;
      this.state = 'climb';
      this.climbCol = c;
      this.vel.set(0, 0, 0);
      // face the climbable surface
      this.yaw = Math.atan2(fx, fz);
      // snap facing to the nearest axis
      const a = Math.round(this.yaw / (Math.PI / 2)) * (Math.PI / 2);
      this.yaw = a;
      void fromAir;
      return true;
    }
    return false;
  }

  _updateClimb(dt, input, iz, ix) {
    const c = this.climbCol;
    const col = G.collision, era = G.era;
    const sp = 2.4;
    this.pos.y += iz * sp * dt;
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
    const rx = fz, rz = -fx;
    this.pos.x += -rx * ix * 1.4 * dt;
    this.pos.z += -rz * ix * 1.4 * dt;
    this.climbPhase += Math.abs(iz) * dt * 6 + Math.abs(ix) * dt * 4;
    col.resolveCylinder(era, this.pos, RADIUS * 0.8, 1.6, 0.0, CF.CLIMB);
    // reached the top → mantle on
    if (this.pos.y + 1.3 > c.maxY) {
      const tx = this.pos.x + fx * 0.8, tz = this.pos.z + fz * 0.8;
      const g = col.ground(era, tx, tz, c.maxY + 1.0, 0.2);
      if (col.bodyFree(era, tx, g.y, tz, 0.28, 1.7) && g.y > this.pos.y) {
        this.state = 'ground';
        this._startAction('mantle', 0.6, { sx: this.pos.x, sy: this.pos.y, sz: this.pos.z, ex: tx, ey: g.y, ez: tz, high: true });
        return;
      }
      this.pos.y = c.maxY - 1.3;
    }
    // left the climbable volume or pressed jump
    const inside = this.pos.x > c.minX - 0.6 && this.pos.x < c.maxX + 0.6 && this.pos.z > c.minZ - 0.6 && this.pos.z < c.maxZ + 0.6;
    if (input.keyPressed('Space')) {
      this.state = 'air';
      this.vel.set(-fx * 4, 5.5, -fz * 4);
      this.yaw += Math.PI;
      this.fallStartY = this.pos.y;
      return;
    }
    const g = col.ground(era, this.pos.x, this.pos.z, this.pos.y + 0.1, 0.2);
    if (iz < 0 && this.pos.y <= g.y + 0.05) { this.pos.y = g.y; this.state = 'ground'; return; }
    if (!inside || this.pos.y < c.minY - 1.2) { this.state = 'air'; this.fallStartY = this.pos.y; }
  }

  _startAction(type, dur, data = {}) {
    this.action = { type, t: 0, dur, ...data };
    this.vel.set(0, 0, 0);
    if (type === 'vault' || type === 'mantle') G.audio && G.audio.play('vault', this.pos);
  }

  _startSlide(dx, dz) {
    const sp = Math.max(this.moveSpeed, 7.5) + 1.2;
    const len = Math.hypot(this.vel.x, this.vel.z) || 1;
    this._startAction('slide', 0.85, { vx: (this.vel.x / len) * sp, vz: (this.vel.z / len) * sp });
    G.audio && G.audio.play('slide', this.pos);
    void dx; void dz;
  }

  _startDodge(dx, dz, landing = false) {
    const len = Math.hypot(dx, dz) || 1;
    this._startAction('dodge', landing ? 0.6 : 0.55, { vx: (dx / len) * 7.5, vz: (dz / len) * 7.5 });
    this.yaw = Math.atan2(dx, dz);
    this.invuln = 0.4;
    G.audio && G.audio.play('dodge', this.pos);
  }

  _updateAction(dt, input, dx, dz, hasInput) {
    const a = this.action;
    a.t += dt;
    const k = clamp(a.t / a.dur, 0, 1);
    const col = G.collision, era = G.era;
    if (a.type === 'vault' || a.type === 'mantle') {
      const e = a.type === 'mantle' ? smoothstep(0, 1, k) : k;
      const arc = a.type === 'vault' ? Math.sin(k * Math.PI) * 0.35 + (a.top - a.sy) * Math.sin(Math.min(1, k * 1.6) * Math.PI * 0.5) * (1 - k) : 0;
      this.pos.x = lerp(a.sx, a.ex, a.type === 'mantle' ? smoothstep(0.35, 1, k) : e);
      this.pos.z = lerp(a.sz, a.ez, a.type === 'mantle' ? smoothstep(0.35, 1, k) : e);
      this.pos.y = a.type === 'mantle' ? lerp(a.sy, a.ey, smoothstep(0, 0.7, k)) : lerp(a.sy, a.ey, k) + arc;
      if (k >= 1) {
        this.action = null;
        this.state = 'ground';
        if (a.type === 'vault') {
          const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
          this.vel.set(fx * 5, 0, fz * 5);
          this.state = 'air';
          this.fallStartY = this.pos.y;
        }
      }
    } else if (a.type === 'slide') {
      const f = 1 - k * 0.75;
      this.vel.x = a.vx * f; this.vel.z = a.vz * f;
      this.pos.x += this.vel.x * dt; this.pos.z += this.vel.z * dt;
      col.resolveCylinder(era, this.pos, RADIUS, 0.9, STEP);
      const g = col.ground(era, this.pos.x, this.pos.z, this.pos.y + STEP, RADIUS * 0.7);
      if (this.pos.y - g.y > 0.6) { this.action = null; this.state = 'air'; this.fallStartY = this.pos.y; return; }
      this.pos.y = g.y;
      this.height = 0.9;
      if (input.keyPressed('Space') && k > 0.15) {
        this.action = null;
        this.vel.y = 7.0;
        this.state = 'air';
        return;
      }
      if (k >= 1) {
        this.action = null;
        // stay crouched if something is overhead
        const ceil = col.ceiling(era, this.pos.x, this.pos.z, this.pos.y + 0.5);
        if (ceil - this.pos.y < HEIGHT) this.crouch = true;
      }
    } else if (a.type === 'dodge') {
      const f = Math.sin((1 - k) * Math.PI * 0.5);
      this.pos.x += a.vx * f * dt; this.pos.z += a.vz * f * dt;
      col.resolveCylinder(era, this.pos, RADIUS, 1.0, STEP);
      const g = col.ground(era, this.pos.x, this.pos.z, this.pos.y + STEP, RADIUS * 0.7);
      if (this.pos.y - g.y > 0.8) { this.action = null; this.state = 'air'; this.fallStartY = this.pos.y; return; }
      this.pos.y = g.y;
      if (k >= 1) { this.action = null; this.vel.set(a.vx * 0.3, 0, a.vz * 0.3); }
    }
    this.moveSpeed = Math.hypot(this.vel.x, this.vel.z);
    void dx; void dz; void hasInput;
  }

  damage(amount, from = null, type = 'bullet') {
    if (this.dead || this.invuln > 0 || G.godMode) return false;
    if (this.blocking && type === 'melee') amount *= 0.2;
    if (this.armor > 0) {
      const ab = Math.min(this.armor, amount * 0.6);
      this.armor -= ab;
      amount -= ab;
    }
    this.health -= amount;
    this.hitT = 0;
    if (from) {
      const dx = from.x - this.pos.x, dz = from.z - this.pos.z;
      const rel = wrapAngle(Math.atan2(dx, dz) - this.yaw);
      this.hitSide = rel > 0 ? 1 : -1;
      G.hud && G.hud.damageFrom(from);
    }
    G.engine.final.uDamage.value = Math.min(1, G.engine.final.uDamage.value + amount / 40);
    G.cam && G.cam.shake(Math.min(0.5, amount / 60));
    G.audio && G.audio.play('hurt', this.pos);
    if (this.health <= 0) {
      this.health = 0;
      this.die();
    }
    return true;
  }

  heal(n) { this.health = Math.min(this.maxHealth, this.health + n); }

  die() {
    if (this.dead) return;
    this.dead = true;
    this.deadT = 0;
    this.action = null;
    G.events && G.events.emit('player:died');
  }

  revive(x, y, z) {
    this.dead = false;
    this.health = this.maxHealth;
    this.teleport(x, y, z);
  }

  // ---------------------------------------------------------- animation --
  _animate(dt) {
    const p = this.pose.clear();
    const t = G.time;
    const W = this.weights;
    const sp = this.moveSpeed;
    // phase advance synced to distance travelled (no foot sliding)
    const stride = sp > 6 ? 2.6 : sp > 3.2 ? 2.15 : this.crouch ? 1.1 : 1.45;
    this.phase += (sp / stride) * Math.PI * dt;
    this.speedN = damp(this.speedN, sp < 0.2 ? 0 : sp < WALK + 0.5 ? sp / (WALK + 0.5) : sp < JOG + 0.5 ? 1 + (sp - WALK - 0.5) / (JOG - WALK) : 2 + clamp((sp - JOG - 0.5) / (SPRINT - JOG - 0.5), 0, 1), 10, dt);

    // target weights
    const tw = { idle: 0, loco: 0, crouch: 0, air: 0, fall: 0, slide: 0, vault: 0, mantle: 0, climb: 0, hang: 0, swim: 0, sit: 0, dodge: 0, dead: 0 };
    const act = this.action ? this.action.type : null;
    if (this.dead) tw.dead = 1;
    else if (this.vehicle) tw.sit = 1;
    else if (act === 'slide') tw.slide = 1;
    else if (act === 'vault') tw.vault = 1;
    else if (act === 'mantle') tw.mantle = 1;
    else if (act === 'dodge') tw.dodge = 1;
    else if (this.state === 'climb') tw.climb = 1;
    else if (this.state === 'hang') tw.hang = 1;
    else if (this.state === 'swim') tw.swim = 1;
    else if (this.state === 'air') {
      const fallDist = this.fallStartY - this.pos.y;
      if (fallDist > 5 || this.airTime > 1.4) tw.fall = 1; else tw.air = 1;
    } else if (this.crouch) tw.crouch = 1;
    else {
      const m = clamp(this.speedN * 1.5, 0, 1);
      tw.loco = m; tw.idle = 1 - m;
    }
    const fast = act === 'dodge' || act === 'vault' || act === 'mantle' || this.dead ? 30 : 12;
    let total = 0;
    for (const k in W) { W[k] = damp(W[k], tw[k], fast, dt); total += W[k]; }
    if (total < 1e-3) { W.idle = 1; total = 1; }

    // accumulate weighted poses
    const tmp = this.tmp;
    const acc = (fn, w) => {
      if (w < 0.002) return;
      tmp.clear();
      fn(tmp);
      p.blend(tmp, w / (accW += w));
    };
    let accW = 0;
    acc((q) => poseIdle(q, t, 1, 0), W.idle);
    acc((q) => poseLocomotion(q, this.phase, Math.max(0.15, this.speedN)), W.loco);
    acc((q) => poseCrouch(q, this.phase, clamp(sp / CROUCH_SPD, 0, 1)), W.crouch);
    acc((q) => poseAir(q, this.vel.y, t), W.air);
    acc((q) => poseFall(q, t), W.fall);
    acc((q) => poseSlide(q, t), W.slide);
    acc((q) => poseVault(q, this.action && act === 'vault' ? this.action.t / this.action.dur : 1), W.vault);
    acc((q) => poseMantle(q, this.action && act === 'mantle' ? this.action.t / this.action.dur : 1), W.mantle);
    acc((q) => poseClimb(q, this.climbPhase), W.climb);
    acc((q) => poseHang(q, t), W.hang);
    acc((q) => poseSwim(q, t * 3.2), W.swim);
    acc((q) => poseSit(q, true), W.sit);
    acc((q) => poseDodge(q, this.action && act === 'dodge' ? this.action.t / this.action.dur : 0), W.dodge);
    acc((q) => poseDead(q, this.hitSide || 1, this.deadT * 1.6), W.dead);

    // landing compression (additive)
    if (this.landTimer > 0) {
      this.landTimer += dt;
      const lk = this.landK * Math.max(0, 1 - this.landTimer / (0.18 + this.landK * 0.3)) ;
      if (lk > 0.01) { tmp.clear(); poseLand(tmp, lk); p.blend(tmp, Math.min(1, lk * 1.4)); }
      else this.landTimer = 0;
    }

    // upper body: aim / melee / block
    const wantAim = this.aiming && !this.dead && !this.vehicle && !act && this.state !== 'climb' && this.state !== 'hang' && this.state !== 'swim';
    this.upperW = damp(this.upperW, wantAim ? 1 : 0, 16, dt);
    if (this.upperW > 0.01) {
      tmp.clear();
      poseAim(tmp, this.aimPitch, this.weaponTwoHanded, this.recoil);
      p.blendUpper(tmp, this.upperW);
    }
    this.blockW = damp(this.blockW, this.blocking ? 1 : 0, 18, dt);
    if (this.blockW > 0.01) { tmp.clear(); poseBlock(tmp); p.blendUpper(tmp, this.blockW); }
    if (this.melee) {
      tmp.clear();
      poseMelee(tmp, this.melee.kind, this.melee.t / this.melee.dur);
      p.blendUpper(tmp, 1);
      // lunge legs a little
      p.add(J.thL, -0.15, 0, 0); p.add(J.knR, 0.1, 0, 0);
    }
    this.recoil = damp(this.recoil, 0, 14, dt);

    // hit reaction
    if (this.hitT < 1) {
      this.hitT += dt * 3.5;
      poseHit(p, this.hitSide, this.hitT);
    }

    // secondary motion: lean into acceleration
    const ax = (this.vel.x - this.prevVel.x) / Math.max(dt, 1e-4);
    const az = (this.vel.z - this.prevVel.z) / Math.max(dt, 1e-4);
    this.prevVel.copy(this.vel);
    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
    const fwdA = ax * sy + az * cy;
    const latA = ax * cy - az * sy;
    const grounded = this.state === 'ground' && !act;
    this.leanX = damp(this.leanX, grounded ? clamp(fwdA * 0.012, -0.18, 0.22) : 0, 8, dt);
    this.leanZ = damp(this.leanZ, grounded ? clamp(-latA * 0.01, -0.2, 0.2) : 0, 8, dt);
    p.add(J.spine, this.leanX, 0, this.leanZ * 0.5);
    p.roll += this.leanZ * 0.6;
    // turning lean (yaw rate)
    const yawRate = wrapAngle(this.yaw - (this._prevYaw ?? this.yaw)) / Math.max(dt, 1e-4);
    this._prevYaw = this.yaw;
    this._turnLean = damp(this._turnLean || 0, clamp(-yawRate * sp * 0.012, -0.25, 0.25), 10, dt);
    p.roll += this._turnLean;

    // head looks toward camera direction when idle-ish
    if (G.cam && !this.dead) {
      const rel = wrapAngle(G.cam.yaw - this.yaw);
      const look = Math.abs(rel) < 1.9 ? clamp(rel, -1.0, 1.0) : 0;
      this.headLook = damp(this.headLook, look * (1 - Math.min(1, sp / 6)) * (1 - this.upperW), 5, dt);
      p.add(J.neck, 0, this.headLook * 0.45, 0);
      p.add(J.head, -G.cam.pitch * 0.25 * (1 - this.upperW), this.headLook * 0.45, 0);
    }

    // local velocity for coat physics
    this.velLocal.set(this.vel.x * cy - this.vel.z * sy, this.vel.y, this.vel.x * sy + this.vel.z * cy);
    let rx = this.pos.x, ry = this.pos.y, rz = this.pos.z, ryaw = this.yaw;
    if (this.vehicle && this.seatMatrix) {
      _v.setFromMatrixPosition(this.seatMatrix);
      rx = _v.x; ry = _v.y; rz = _v.z;
      ryaw = this.vehicle.yaw;
    }
    this.avatar.update(p, rx, ry, rz, ryaw, dt, this.velLocal);
  }
}
