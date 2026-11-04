// Contestant 99: third-person controller, camera, traversal (slide, wall-run, grapple, vault,
// dodge, double jump, swim), health, and hooks into the arsenal.
import * as THREE from 'three';
import { PlayerModel } from './playerModel.js';
import { Arsenal } from './weapons.js';
import { BUILD } from '../build.js';
import { FXColors } from '../engine/fx.js';

const UP = new THREE.Vector3(0, 1, 0);
const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _hit = {};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };

const R = 0.42;
const STAND = [0.42, 0.95, 1.38];
const CROUCH = [0.42, 0.62];

export class Player {
  constructor(game, opts = {}) {
    this.game = game;
    this.save = opts.save;
    const look = opts.look || {};
    this.model = new PlayerModel(look);
    game.scene.add(this.model.root);
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.camYaw = 0;
    this.camPitch = -0.1;
    this.maxHp = 100 + (opts.mods?.armor ? 25 : 0);
    this.hp = this.maxHp;
    this.alive = true;
    this.mode = 'normal';
    this.grounded = false;
    this.wasGrounded = false;
    this.groundCollider = null;
    this.groundNormal = new THREE.Vector3(0, 1, 0);
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.jumps = 0;
    this.abilities = { doubleJump: !!opts.doubleJump, grapple: true, wallrun: true, airDashes: opts.mods?.airDash ? 2 : 1 };
    this.mods = opts.mods || {};
    this.airDashes = this.abilities.airDashes;
    this.dodgeT = 0; this.dodgeCool = 0; this.iframes = 0; this.dodgeDir = new THREE.Vector3();
    this.slideT = 0; this.slideCool = 0;
    this.wallN = new THREE.Vector3(); this.wallT = 0; this.wallCool = 0; this.wallContactT = 0; this.wallSide = 0; this.lastWallN = new THREE.Vector3();
    this.grapple = { active: false, anchor: new THREE.Vector3(), local: new THREE.Vector3(), collider: null, enemy: null, cool: 0, t: 0, len: 0 };
    this.vault = { t: 0, from: new THREE.Vector3(), to: new THREE.Vector3(), dur: 0.28 };
    this.landT = 0;
    this.flip = 0;
    this.lastDamageT = 99;
    this.damageFlash = 0;
    this.trauma = 0;
    this.recoilPitch = 0;
    this.fovKick = 0;
    this.camDist = 3.6;
    this.camDistActual = 3.5;
    this.camPos = new THREE.Vector3();
    this.camForward = new THREE.Vector3(0, 0, -1);
    this.rightVec = new THREE.Vector3(1, 0, 0);
    this.aimTarget = new THREE.Vector3();
    this.aiming = false;
    this.fireHold = 0;
    this.stepPhase = 0;
    this.inWater = 0; // depth of water at player
    this.underwater = false;
    this.oxygen = 1;
    this.speedMult = 1;
    this.giant = 0;
    this.invincible = 0;
    this.lastSafe = new THREE.Vector3();
    this.safeTimer = 0;
    this.airTime = 0;
    this.fallStartY = 0;
    this.lastShotT = 99;
    this.killStreakT = 0;
    this.groundVel = new THREE.Vector3();
    this.crouch = false;
    this.arsenal = new Arsenal(this, game, opts.loadout || { guns: ['revolver'], melee: 'blades' });
    this.arsenal.mount();
    // grapple rope
    const rg = new THREE.CylinderGeometry(0.015, 0.015, 1, 5, 1, true);
    rg.rotateX(Math.PI / 2); rg.translate(0, 0, 0.5);
    this.rope = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: 0x8ff6ff }));
    this.rope.visible = false;
    game.scene.add(this.rope);
    this.ropeHook = new THREE.Mesh(new THREE.OctahedronGeometry(0.1), new THREE.MeshBasicMaterial({ color: 0x8ff6ff }));
    this.ropeHook.visible = false;
    game.scene.add(this.ropeHook);
    // flashlight for lights-out
    this.flashlight = new THREE.SpotLight(0xdfefff, 0, 40, 0.5, 0.5, 1.2);
    game.scene.add(this.flashlight, this.flashlight.target);
  }

  spawn(p, yaw = 0) {
    this.pos.copy(p);
    this.vel.set(0, 0, 0);
    this.yaw = yaw;
    this.camYaw = yaw + Math.PI;
    this.camPitch = -0.12;
    this.lastSafe.copy(p);
    this.mode = 'normal';
    this.alive = true;
    this.grapple.active = false;
    this.model.root.position.copy(p);
    this.model.root.rotation.y = yaw;
  }

  damageMult() { return (this.giant > 0 || this.mech ? 2 : 1) * (this.mods.glass ? 1.5 : 1) * (this.game.modifiers?.oneHit ? 1.5 : 1); }

  addRecoil(pitch, shake) {
    this.recoilPitch = Math.min(0.24, this.recoilPitch + pitch * 0.6);
    // gun kick: an immediate camera snap that springs back (feel), on top of the slower recoil climb
    const prev = this.gunKick || 0;
    this.gunKick = Math.min(0.22, prev + pitch * 1.45);
    const impulse = (this.gunKick - prev) * (this.game.settings?.shake ?? 1);
    if (this.game.camera) { this.game.camera.rotation.x += impulse; this.game.camera.rotation.z += impulse * 0.15; }
    this.fovKick = Math.min(5, this.fovKick + shake * 5);
    this.trauma = Math.min(1, this.trauma + shake * 0.55);
    this.lastShotT = 0;
  }
  shake(a) { this.trauma = Math.min(1, this.trauma + a); }

  // ------------------------------------------------------------------ damage
  damage(amount, info = {}) {
    if (!this.alive) return false;
    if (this.iframes > 0 || this.invincible > 0 || this.game.cinematic) return false;
    if (this.game.modifiers?.oneHit) amount = 999;
    if (this.mods.glass) amount *= 1.5;
    amount *= this.game.difficultyDamage ?? 1;
    this.hp -= amount;
    this.lastDamageT = 0;
    this.damageFlash = Math.min(1, this.damageFlash + amount / 30);
    this.shake(Math.min(0.6, amount / 40));
    this.game.renderer.kick(0.3);
    this.game.audio.play('hurt');
    this.game.stats.damageTaken += amount;
    if (info.from) {
      const d = _v.subVectors(info.from, this.pos); d.y = 0;
      this.game.hud.damageIndicator(Math.atan2(d.x, d.z) - (this.camYaw + Math.PI));
    }
    if (info.knock) this.vel.addScaledVector(info.knock, 1);
    this.game.emit('playerHurt', { amount, hp: this.hp, info });
    if (this.hp <= 0) { this.hp = 0; this.die(info); }
    return true;
  }
  heal(a) {
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + a);
    if (this.hp > before) this.game.renderer.fx.uHeal.value = 1;
  }
  die(info) {
    if (!this.alive) return;
    this.alive = false;
    this.mode = 'dead';
    this.grapple.active = false;
    this.arsenal.dropGrab();
    this.game.onPlayerDeath(info);
  }

  // ------------------------------------------------------------------ main update
  update(dt, input) {
    const G = this.game;
    const P = G.physics;
    this.lastDamageT += dt;
    this.lastShotT += dt;
    this.iframes = Math.max(0, this.iframes - dt);
    this.invincible = Math.max(0, this.invincible - dt);
    this.dodgeCool = Math.max(0, this.dodgeCool - dt);
    this.slideCool = Math.max(0, this.slideCool - dt);
    this.wallCool = Math.max(0, this.wallCool - dt);
    this.grapple.cool = Math.max(0, this.grapple.cool - dt);
    this.landT = Math.max(0, this.landT - dt * 4);
    this.damageFlash = Math.max(0, this.damageFlash - dt * 1.5);
    this.giant = Math.max(0, this.giant - dt);
    this.arsenal.tick(dt);

    // regen
    if (this.alive && this.lastDamageT > 3.5 && this.hp < this.maxHp) this.hp = Math.min(this.maxHp, this.hp + dt * (this.mods.regen ? 20 : 12));

    // ----- look
    const allowControl = this.alive && !G.cinematic && !G.paused;
    if (allowControl) {
      const m = input.consumeMouse();
      const aimSlow = this.aiming ? 0.6 : 1;
      this.camYaw -= m.x * aimSlow;
      this.camPitch = clamp(this.camPitch - m.y * aimSlow, -1.25, 1.2);
    } else input.consumeMouse();
    // recoil recovery
    if (this.recoilPitch > 0) {
      const r = Math.min(this.recoilPitch, dt * 0.6 + this.recoilPitch * dt * 9);
      this.camPitch = clamp(this.camPitch + r * 0.85, -1.25, 1.2);
      this.recoilPitch -= r;
    }
    const cy = Math.cos(this.camYaw), sy = Math.sin(this.camYaw);
    const fwdH = _v.set(-sy, 0, -cy);
    const rightH = _v2.set(cy, 0, -sy);
    this.rightVec.copy(rightH);

    // ----- inputs
    let mx = 0, mz = 0;
    if (allowControl) {
      mz = input.axis('KeyS', 'KeyW');
      mx = input.axis('KeyA', 'KeyD');
    }
    const wish = new THREE.Vector3().addScaledVector(fwdH, mz).addScaledVector(rightH, mx);
    const hasInput = wish.lengthSq() > 0.01;
    if (hasInput) wish.normalize();
    const sprint = allowControl && (input.down('ShiftLeft') || input.down('ShiftRight'));
    this.aiming = allowControl && (input.wantsAim ? input.wantsAim() : input.mouse.right) && this.mode !== 'swim';
    const fire = allowControl && input.mouse.left;
    const firePressed = allowControl && input.mouse.leftPressed;
    const fireReleased = input.mouse.leftReleased || (!input.mouse.left && this.fireHold > 0);
    this.fireHold = fire ? this.fireHold + dt : 0;

    if (allowControl) {
      if (input.hit('Space')) this.jumpBuffer = 0.14;
      if (input.hit('Digit1')) this.arsenal.select(0);
      if (input.hit('Digit2')) this.arsenal.select(1);
      if (input.hit('Digit3')) this.arsenal.select(2);
      if (input.mouse.wheel) this.arsenal.cycle(input.mouse.wheel > 0 ? 1 : -1);
      if (input.hit('KeyR')) this.arsenal.reload();
      if (input.hit('KeyF') || input.hit('KeyV') || input.hit('Mouse3')) this.tryMelee();
      if (input.hit('KeyE')) this.tryGrapple();
      if (input.hit('KeyQ')) this.tryDodge(wish, hasInput);
      if (input.hit('KeyC') || input.hit('ControlLeft')) this.trySlide();
    }
    this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);

    // ----- water
    const wl = G.waterLevelAt(this.pos.x, this.pos.z);
    this.inWater = Math.max(0, wl - this.pos.y);
    const camWl = G.waterLevelAt(this.camPos.x, this.camPos.z);
    this.underwater = this.camPos.y < camWl - 0.05;
    if (this.inWater > 1.35 && this.mode !== 'grapple' && this.mode !== 'vault') { if (this.mode !== 'swim') { this.mode = 'swim'; G.fx.splash(_v3.copy(this.pos).setY(wl), 18, 1.2); G.audio.play('splash', { pos: this.pos, power: 1.2 }); } }
    else if (this.mode === 'swim' && this.inWater < 1.15) this.mode = 'normal';
    if (this.inWater > 1.6) { this.oxygen = Math.max(0, this.oxygen - dt / (this.mods.lungs ? 30 : 18)); if (this.oxygen <= 0) { this._drownT = (this._drownT || 0) + dt; if (this._drownT > 1) { this._drownT = 0; this.damage(12, { type: 'drown' }); } } }
    else this.oxygen = Math.min(1, this.oxygen + dt * 0.5);

    // ----- moving platform carry & conveyors (before move)
    if (this.grounded && this.groundCollider) {
      const c = this.groundCollider;
      if (c.dynamic) {
        _v3.copy(this.pos).applyMatrix4(c.deltaM);
        this.groundVel.subVectors(_v3, this.pos).divideScalar(Math.max(dt, 1e-4));
        this.pos.copy(_v3);
      } else this.groundVel.set(0, 0, 0);
      if (c.conveyor) this.pos.addScaledVector(c.conveyor, dt);
    }

    const speedMult = this.speedMult * (this.giant > 0 || this.mech ? 1.25 : 1) * (this.mods.sprinter ? 1.08 : 1);
    const runSpeed = (sprint && mz > 0 ? 13.5 : 9) * speedMult;
    const ice = G.ice || this.groundCollider?.ice;
    const wade = this.inWater > 0.35 && this.mode !== 'swim' ? clamp(1 - (this.inWater - 0.35) * 0.45, 0.55, 1) : 1;
    const gMul = G.gravityScalePlayer ?? 1;
    const gravity = 26 * gMul;

    // ----- mode updates
    switch (this.mode) {
      case 'vault': {
        this.vault.t += dt;
        const k = clamp(this.vault.t / this.vault.dur, 0, 1);
        const e = k * k * (3 - 2 * k);
        this.pos.lerpVectors(this.vault.from, this.vault.to, e);
        this.pos.y += Math.sin(k * Math.PI) * 0.35;
        if (k >= 1) { this.mode = 'normal'; this.vel.copy(this.vault.vel); this.grounded = true; }
        break;
      }
      case 'dodge': {
        this.dodgeT += dt;
        const k = this.dodgeT / 0.32;
        const sp = 19 * (1 - k * 0.55) * speedMult;
        this.vel.x = this.dodgeDir.x * sp; this.vel.z = this.dodgeDir.z * sp;
        if (!this.grounded) this.vel.y = Math.max(this.vel.y - gravity * 0.4 * dt, -6);
        else this.vel.y = -2;
        if (k >= 1) { this.mode = 'normal'; this.vel.multiplyScalar(0.7); }
        this._move(dt);
        break;
      }
      case 'slide': {
        this.slideT += dt;
        const hv = _v3.set(this.vel.x, 0, this.vel.z);
        let sp = hv.length();
        // slopes accelerate
        const slopeBoost = this.grounded ? -this.groundNormal.dot(_v3.copy(hv).normalize().setY(0)) : 0;
        sp += (slopeBoost * 18 - (ice ? 0.3 : 4.2)) * dt;
        if (hasInput) { const d = _v3.copy(hv).normalize(); d.lerp(wish, dt * 2.5).normalize(); hv.copy(d).multiplyScalar(sp); }
        else if (sp > 0) hv.setLength(sp);
        this.vel.x = hv.x; this.vel.z = hv.z;
        this.vel.y -= gravity * dt;
        const ceiling = this._ceilingBlocked();
        const wantUp = !(input.down('KeyC') || input.down('ControlLeft')) && this.slideT > 0.35;
        if ((sp < 4.2 || wantUp) && !ceiling) { this.mode = 'normal'; this.slideCool = 0.15; G.audio.loop('slide', 0); }
        if (sp < 3 && ceiling) { hv.setLength(3); this.vel.x = hv.x; this.vel.z = hv.z; }
        if (this.jumpBuffer > 0 && !ceiling && (this.grounded || this.coyote > 0)) { this.mode = 'normal'; G.audio.loop('slide', 0); this._jump(9.2, true); }
        if (this.grounded && Math.random() < dt * (BUILD.fast ? 10 : 22)) G.fx.sparks(_v3.copy(this.pos).add(_v2.set(0, 0.1, 0)), 1, null, 3);
        this._move(dt, CROUCH);
        break;
      }
      case 'wallrun': {
        this.wallT += dt;
        const tangent = _v3.set(this.vel.x, 0, this.vel.z);
        tangent.addScaledVector(this.wallN, -tangent.dot(this.wallN));
        const sp = Math.max(9.5 * speedMult, tangent.length());
        tangent.normalize().multiplyScalar(sp);
        this.vel.x = tangent.x - this.wallN.x * 2; this.vel.z = tangent.z - this.wallN.z * 2;
        this.vel.y -= gravity * (this.wallT < 0.35 ? 0.05 : 0.28) * dt;
        this.vel.y = Math.max(this.vel.y, -5);
        this._move(dt);
        if (this.wallContactT > 0.12 || this.wallT > 1.5 || this.grounded || mz <= 0) { this._endWallrun(); }
        else if (this.jumpBuffer > 0) {
          this.jumpBuffer = 0;
          const t = _v3.copy(tangent).normalize();
          this.vel.copy(this.wallN).multiplyScalar(8.5).addScaledVector(t, sp * 0.85);
          this.vel.y = 9.5;
          this.lastWallN.copy(this.wallN);
          this._endWallrun();
          this.wallCool = 0.35;
          this.jumps = 1; this.airDashes = this.abilities.airDashes;
          G.audio.play('jump', { pos: this.pos });
          G.emit('walljump');
        }
        if (Math.random() < 0.5) G.fx.sparks(_v2.copy(this.pos).addScaledVector(this.wallN, -0.4).add(_v.set(0, 0.2, 0)), 1, this.wallN, 3);
        break;
      }
      case 'grapple': {
        const g = this.grapple;
        this._updateGrappleAnchor();
        g.t += dt;
        const to = _v3.subVectors(g.anchor, this.pos).add(_v2.set(0, -1.0, 0));
        const dist = to.length();
        to.normalize();
        const pull = 62;
        this.vel.addScaledVector(to, pull * dt);
        this.vel.y -= gravity * 0.35 * dt;
        // steer slightly with input
        if (hasInput) this.vel.addScaledVector(wish, 14 * dt);
        const sp = this.vel.length();
        if (sp > 27) this.vel.multiplyScalar(27 / sp);
        // damp sideways velocity to make pulls snappy
        const along = this.vel.dot(to);
        _v2.copy(this.vel).addScaledVector(to, -along);
        this.vel.addScaledVector(_v2, -Math.min(1, dt * 2.5));
        G.audio.loop('grapple', 0.12, { rate: clamp(sp / 30, 0, 1) });
        this._move(dt);
        if (dist < 2.2 || g.t > 2.2 || (this.jumpBuffer > 0 && g.t > 0.1) || input.hit('KeyE') && g.t > 0.1) {
          if (dist < 2.2) { this.vel.x *= 0.4; this.vel.z *= 0.4; this.vel.y = Math.max(this.vel.y * 0.3, 8.5); }
          if (this.jumpBuffer > 0) { this.jumpBuffer = 0; this.vel.y = Math.max(this.vel.y + 4, 10); }
          this._endGrapple();
        }
        break;
      }
      case 'swim': {
        const look = _v3.copy(this.camForward);
        const w3 = new THREE.Vector3().addScaledVector(look, mz).addScaledVector(rightH, mx);
        if (input.down('Space')) w3.y += 1;
        if (input.down('KeyC')) w3.y -= 1;
        if (w3.lengthSq() > 0.01) w3.normalize();
        const target = w3.multiplyScalar(5.5 * speedMult * (sprint ? 1.45 : 1));
        this.vel.lerp(target, 1 - Math.exp(-3 * dt));
        // buoyancy to float at surface when idle
        if (!hasInput && !input.down('Space') && !input.down('KeyC')) this.vel.y += (wl - 1.45 - this.pos.y) * 3 * dt;
        if (this.pos.y > wl - 1.2 && this.vel.y > 0) this.vel.y *= 0.6;
        if (this.pos.y > wl - 1.4 && input.hit('Space')) { this.vel.y = 9; this.mode = 'normal'; G.fx.splash(_v2.copy(this.pos).setY(wl), 14, 1); G.audio.play('splash', { pos: this.pos }); }
        if (G.waterFlow) { const f = G.waterFlow(this.pos); if (f) this.pos.addScaledVector(f, dt); }
        if (Math.random() < dt * 4) G.fx.bubbles(_v2.copy(this.pos).setY(this.pos.y + 1.6), 1);
        this._move(dt);
        break;
      }
      case 'dead': {
        this.vel.x *= 0.9; this.vel.z *= 0.9;
        this.vel.y -= gravity * dt;
        this._move(dt);
        break;
      }
      default: {
        // normal locomotion
        const target = _v3.copy(wish).multiplyScalar(runSpeed * wade * (this.aiming ? 0.72 : 1));
        const accel = this.grounded ? (ice ? 6 : 78) : (hasInput ? 32 : 2);
        const hv = new THREE.Vector3(this.vel.x, 0, this.vel.z);
        if (this.grounded) {
          if (hasInput) {
            // allow keeping extra momentum (from slides/dodges) that decays
            const cur = hv.length();
            if (cur > runSpeed + 0.5) {
              hv.lerp(target.clone().setLength(cur), 1 - Math.exp(-8 * dt));
              hv.setLength(Math.max(runSpeed, cur - (ice ? 1 : 16) * dt));
            } else {
              const dv = target.clone().sub(hv);
              const mx2 = accel * dt;
              if (dv.length() > mx2) dv.setLength(mx2);
              hv.add(dv);
            }
          } else {
            const f = ice ? 0.4 : 14;
            hv.multiplyScalar(Math.exp(-f * dt));
          }
        } else {
          // air control: can steer, can't exceed current speed via steering
          const cur = hv.length();
          const dv = target.clone().sub(hv);
          if (hasInput) {
            const mx2 = accel * dt;
            if (dv.length() > mx2) dv.setLength(mx2);
            hv.add(dv);
            if (hv.length() > Math.max(cur, runSpeed)) hv.setLength(Math.max(cur, runSpeed));
          }
          // bleed off excess momentum (grapple slingshots, slide-jumps) so flights stay controllable
          const hl = hv.length();
          if (hl > runSpeed + 1) hv.setLength(Math.max(runSpeed + 1, hl - hl * 0.55 * dt));
        }
        this.vel.x = hv.x; this.vel.z = hv.z;
        // gravity
        const fallMul = this.vel.y < 0 ? 1.35 : 1;
        if (!this.grounded) this.vel.y -= gravity * fallMul * dt;
        else this.vel.y = Math.min(this.vel.y, 0) - 1;
        if (this.vel.y < -42) this.vel.y = -42;
        // variable jump
        if (!input.down('Space') && this.vel.y > 4 && this.jumpHeld) { this.vel.y *= 0.55; this.jumpHeld = false; }
        // jump
        if (this.jumpBuffer > 0) {
          if (this.grounded || this.coyote > 0) this._jump(this.inWater > 0.8 ? 7 : 9.6);
          else if (this.abilities.doubleJump && this.jumps < 2) this._doubleJump();
        }
        this.crouch = false;
        this._move(dt);
        // wall-run check
        if (!this.grounded && this.abilities.wallrun && this.wallContact && this.wallCool <= 0 && mz > 0 && this.airTime > 0.08) {
          const hsp = Math.hypot(this.vel.x, this.vel.z);
          const n = this.wallContactN;
          const facingWall = -(this.vel.x * n.x + this.vel.z * n.z) / Math.max(hsp, 0.01);
          const sameWall = n.dot(this.lastWallN) > 0.9 && this.wallCool > -0.6;
          if (hsp > 4.5 && facingWall < 0.85 && this.wallContactCollider?.wallrun && !sameWall) this._startWallrun(n);
        }
        // vault / mantle
        if (hasInput && this.wallContact && this.mode === 'normal' && mz > 0) this._tryVault(wish);
      }
    }
    if (this.mode !== 'grapple') { G.audio.loop('grapple', 0); }

    // landing
    if (this.grounded && !this.wasGrounded) this._onLand();
    if (!this.grounded) { this.airTime += dt; this.coyote = Math.max(0, this.coyote - dt); }
    else { this.airTime = 0; this.coyote = 0.1; this.jumps = 0; this.airDashes = this.abilities.airDashes; this.lastWallN.set(0, 0, 0); }
    this.wasGrounded = this.grounded;
    if (this.flip > 0) this.flip = Math.max(0, this.flip - dt * 2.8);

    // safe spot tracking
    this.safeTimer += dt;
    if (this.grounded && this.safeTimer > 0.4 && this.groundCollider && !this.groundCollider.dynamic && !this.groundCollider.hazard && !this.groundCollider.noSafe && this.inWater < 0.5) {
      this.safeTimer = 0; this.lastSafe.copy(this.pos);
    }
    // hazards on ground collider
    if (this.grounded && this.groundCollider?.hazard) this._hazardTick(dt, this.groundCollider.hazard);
    // kill plane
    if (this.pos.y < (G.floor?.killY ?? -30) && this.alive) {
      this.damage(25, { type: 'fall' });
      if (this.alive) { this.pos.copy(G.floor.safeOverride || this.lastSafe).add(_v.set(0, 1.5, 0)); this.vel.set(0, 0, 0); G.audio.play('powerup'); G.emit('respawnFall'); }
    }

    // ----- facing
    const hspd = Math.hypot(this.vel.x, this.vel.z);
    const combatFacing = this.aiming || this.lastShotT < 1.2 || fire || this.arsenal.meleeT > 0 || this.arsenal.grabbed;
    let targetYaw = this.yaw;
    if (this.mode === 'wallrun' || this.mode === 'slide' || this.mode === 'dodge') { if (hspd > 1) targetYaw = Math.atan2(this.vel.x, this.vel.z); }
    else if (combatFacing && this.mode !== 'swim') targetYaw = this.camYaw + Math.PI;
    else if (hspd > 0.5 && this.mode !== 'dead') targetYaw = Math.atan2(this.vel.x, this.vel.z);
    this.yaw += angDiff(this.yaw, targetYaw) * (1 - Math.exp(-(combatFacing ? 22 : 12) * dt));
    // camera before aim: the shot ray and the weapon pose use this frame's camera, not last frame's
    if (!G.camOverride) this.updateCamera(G.frameDt || dt);

    // ----- weapons
    this._computeAim();
    if (this.alive && this.mode !== 'swim' && !G.cinematic) {
      this.arsenal.update(dt, input, this.aimTarget, fire, firePressed, fireReleased);
    }

    // ----- animate model
    const local = _v.set(this.vel.x, 0, this.vel.z).applyAxisAngle(UP, -this.yaw);
    const strafe = hspd > 1 ? local.x / hspd : 0;
    const moveBack = hspd > 1 && local.z < -0.3 * hspd;
    const w = this.arsenal.current;
    const showWeapon = this.mode !== 'swim' && this.mode !== 'dodge' && this.mode !== 'dead';
    if (w) w.model.visible = showWeapon && this.arsenal.meleeT <= 0;
    const st = {
      turn: clamp(angDiff(this.yaw, targetYaw) * 2, -1, 1), vaultProgress: this.vault ? this.vault.t / this.vault.dur : 0,
      reloading: w?.reloading || 0, underwater: this.underwater, inWater: this.inWater,
      speed: hspd, grounded: this.grounded, vy: this.vel.y, mode: this.mode, sprint: sprint && hspd > 9,
      moveBack, strafe: moveBack ? -strafe : strafe, crouch: this.crouch, land: this.landT, flip: this.flip,
      dodgeT: clamp(this.dodgeT / 0.32, 0, 1), dodgeBack: this.dodgeBack,
      wallSide: this.wallSide, aiming: this.aiming || (combatFacing && this.mode !== 'swim'), aimPitch: this.camPitch,
      weaponHand: !!w && showWeapon, twoHanded: w?.def.twoHanded, recoil: w?.recoil || 0,
      melee: this.arsenal.meleeT, meleeT: this.arsenal.meleeT > 0 ? 1 - this.arsenal.meleeT / this.arsenal.meleeDur : 0,
      meleeKind: this.arsenal.melee.id, meleeStep: this.arsenal.meleeStep, headYaw: 0, giant: this.giant > 0 || this.mech,
    };
    this.model.root.position.copy(this.pos);
    this.model.root.rotation.y = this.yaw;
    const gs = this.mech ? 2.3 : this.giant > 0 ? Math.min(2.2, 1 + Math.min(1, (12 - this.giant) * 3) * 1.2, 1 + this.giant * 2) : 1;
    this.model.root.scale.setScalar(damp(this.model.root.scale.x, gs, 6, dt));
    this.model.animate(dt, st);
    if (w && showWeapon && this.arsenal.meleeT <= 0) {
      this.model.root.updateMatrixWorld(true);
      this.arsenal.orientToTarget(this.aimTarget, 1);
    }
    // footsteps
    if (this.grounded && hspd > 2 && this.mode === 'normal') {
      const prev = this.stepPhase;
      this.stepPhase = this.model.phase;
      if (Math.floor(prev / Math.PI) !== Math.floor(this.stepPhase / Math.PI)) {
        G.audio.play('step', { pos: this.pos, metal: true, wet: this.inWater > 0.1, vol: sprint ? 1.2 : 0.9 });
        if (this.inWater > 0.1) G.fx.splash(_v2.copy(this.pos).setY(wl), 4, 0.4);
        if (this.giant > 0 || this.mech) { G.audio.play('stomp', { pos: this.pos }); this.shake(0.15); G.stompDamage(this.pos, 3.2, 30); }
      }
    }
    G.audio.loop('slide', this.alive && this.mode === 'slide' && this.grounded ? clamp(Math.hypot(this.vel.x, this.vel.z) / 18, 0, 0.45) : 0, { tc: 0.025 });
    // speed trails off both boots while sliding / dodging, plus a dust kick on the ground
    if (this.alive && (this.mode === 'slide' || this.mode === 'dodge') && hspd > 4) {
      this.effectTime = (this.effectTime || 0) - dt;
      if (this.effectTime <= 0) {
        this.effectTime = BUILD.fast ? 0.075 : 0.04;
        const off = _v.copy(this.rightVec).multiplyScalar(0.24), base = _v2.copy(this.pos).setY(this.pos.y + 0.1), col = this.mode === 'dodge' ? FXColors.cyan : FXColors.pink;
        G.fx.trail(_v3.copy(base).add(off), col, 0.2, 0.13); G.fx.trail(_v3.copy(base).sub(off), col, 0.2, 0.13);
        if (this.grounded) { this.dustTime = (this.dustTime || 0) - this.effectTime; if (this.dustTime <= 0) { this.dustTime = BUILD.fast ? 0.22 : 0.13; G.fx.dust(base, 2, 0.42); } }
      }
    }

    // ----- grapple rope visual
    this._updateRope();
    // flashlight
    if (G.lightsOut > 0.01) {
      this.flashlight.intensity = 140 * G.lightsOut;
      this.flashlight.position.copy(this.pos).add(_v.set(0, 1.7, 0)).addScaledVector(this.rightVec, 0.3);
      this.flashlight.target.position.copy(this.aimTarget);
    } else this.flashlight.intensity = 0;
  }

  _computeAim() {
    const G = this.game;
    const cam = G.camera;
    this.camForward.set(0, 0, -1).applyQuaternion(cam.quaternion);
    const startT = this.camDistActual + 0.3;
    const origin = cam.position;
    const maxD = 220;
    let best = maxD;
    const r = G.physics.raycast(_v3.copy(origin).addScaledVector(this.camForward, startT), this.camForward, maxD, _hit, (c) => c.blocksBullets && c.tag !== 'trigger');
    if (r.hit) best = r.dist + startT;
    const e = G.raycastEnemies(origin, this.camForward, best, startT);
    if (e && e.dist < best) best = e.dist;
    this.aimTarget.copy(origin).addScaledVector(this.camForward, best);
    this.aimEnemy = e ? e.enemy : null;
  }

  // ------------------------------------------------------------------ movement core
  _move(dt, spheres = STAND) {
    const P = this.game.physics;
    const disp = this.vel.length() * dt;
    const steps = Math.max(1, Math.ceil(disp / 0.25));
    const h = dt / steps;
    this.grounded = false;
    this.wallContact = false;
    let ceilingHit = false;
    let wallFound = false;
    const filter = (c) => c.tag !== 'trigger' && c.tag !== 'noplayer';
    for (let s = 0; s < steps; s++) {
      this.pos.addScaledVector(this.vel, h);
      for (let it = 0; it < 2; it++) {
        for (let i = 0; i < spheres.length; i++) {
          const oy = spheres[i];
          _v.set(this.pos.x, this.pos.y + oy, this.pos.z);
          const n = P.collideSphere(_v, R, filter);
          if (!n) continue;
          this.pos.set(_v.x, _v.y - oy, _v.z);
          for (let k = 0; k < n; k++) {
            const ct = P.contacts[k];
            const ny = ct.n.y;
            if (ny > 0.6 && i === 0) {
              this.grounded = true;
              this.groundCollider = ct.c;
              this.groundNormal.copy(ct.n);
            } else if (ny < -0.6) {
              ceilingHit = true;
              if (this.vel.y > 0) this.vel.y = 0;
              if (ct.c.dynamic && ct.c.crush) this._crushCheck(ct.c);
            } else if (Math.abs(ny) < 0.35) {
              wallFound = true;
              this.wallContactN = (this.wallContactN || new THREE.Vector3()).copy(ct.n).setY(0).normalize();
              this.wallContactCollider = ct.c;
            }
            const vn = this.vel.dot(ct.n);
            if (vn < 0) this.vel.addScaledVector(ct.n, -vn);
          }
        }
      }
    }
    if (wallFound) { this.wallContact = true; this.wallContactT = 0; } else this.wallContactT += dt;
    if (this.mode === 'wallrun' && wallFound) this.wallN.copy(this.wallContactN);
    // ground snap
    if (!this.grounded && this.wasGrounded && this.vel.y <= 0.5 && this.mode !== 'grapple' && this.mode !== 'swim' && !this._justJumped) {
      const r = P.raycast(_v.set(this.pos.x, this.pos.y + 0.3, this.pos.z), _v2.set(0, -1, 0), 0.75, _hit, filter);
      if (r.hit && r.normal.y > 0.6) {
        this.pos.y = r.point.y;
        this.grounded = true;
        this.groundCollider = r.collider;
        this.groundNormal.copy(r.normal);
        if (this.vel.y < 0) this.vel.y = 0;
      }
    }
    this._justJumped = false;
    // project velocity on slope when grounded so we walk up ramps instead of into them
    if (this.grounded && this.groundNormal.y < 0.98 && this.mode !== 'dead') {
      const vn = this.vel.dot(this.groundNormal);
      if (vn > 0 && this.vel.y <= 0) this.vel.addScaledVector(this.groundNormal, -vn);
    }
  }
  _ceilingBlocked() {
    const P = this.game.physics;
    _v.set(this.pos.x, this.pos.y + 1.38, this.pos.z);
    const list = P.query(_v.x - R, _v.y - R, _v.z - R, _v.x + R, _v.y + R, _v.z + R, []);
    for (const c of list) { if (c.tag === 'trigger') continue; if (P.sphereBox(_v, R - 0.05, c, P.contacts[15])) return true; }
    return false;
  }
  _crushCheck(c) {
    if (this.grounded && this.alive) { this.damage(200, { type: 'crush' }); this.game.emit('crushed'); }
  }
  _hazardTick(dt, hz) {
    this._hzT = (this._hzT || 0) - dt;
    if (this._hzT <= 0) {
      this._hzT = 0.25;
      this.damage(hz.dps * 0.25, { type: hz.type });
      if (hz.type === 'lava' || hz.type === 'molten') { this.vel.y = 10; this.grounded = false; this.game.fx.burst(this.pos, 12, FXColors.fire, FXColors.fireEnd, 4, 0.5, 0.5); this.game.emit('burned'); }
    }
  }

  _jump(v, fromSlide) {
    this.vel.y = v * (this.game.gravityScalePlayer < 1 ? 1.1 : 1) * (this.giant > 0 || this.mech ? 1.15 : 1);
    this.grounded = false;
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.jumps = 1;
    this.jumpHeld = true;
    this._justJumped = true;
    this.mode = 'normal';
    if (fromSlide) { const hv = _v.set(this.vel.x, 0, this.vel.z); hv.multiplyScalar(1.05); this.vel.x = hv.x; this.vel.z = hv.z; }
    this.game.audio.play('jump', { pos: this.pos });
    this.game.fx.dust(_v.copy(this.pos), 3, 0.5);
  }
  _doubleJump() {
    this.vel.y = 10;
    this.jumps = 2;
    this.jumpBuffer = 0;
    this.jumpHeld = true;
    this.flip = 1;
    this.fovKick = Math.min(4, this.fovKick + 1.5);
    // a little extra carry so the second jump feels like a boost, not a stall
    const hv = _v.set(this.vel.x, 0, this.vel.z);
    if (hv.lengthSq() > 0.25) { hv.multiplyScalar(1.12); this.vel.x = hv.x; this.vel.z = hv.z; }
    this.game.audio.play('doubleJump', { pos: this.pos });
    this.game.fx.ring(_v2.copy(this.pos).add(_v3.set(0, 0.1, 0)), 0.2, 1.6, 0.3, 0x8ff6ff);
    this.game.fx.burst(this.pos, 10, FXColors.cyan, FXColors.cyanEnd, 3, 0.25, 0.4);
    this.game.emit('doubleJump');
  }
  _onLand() {
    const vy = this._prevVy ?? this.vel.y;
    const fall = this.airTime;
    if (fall > 0.35) {
      this.landT = clamp(fall * 0.6, 0.2, 1);
      this.game.audio.play(fall > 1.2 ? 'bigLand' : 'land', { pos: this.pos });
      this.game.fx.dust(this.pos, fall > 1 ? 10 : 4, 0.8);
      if (fall > 1.2) { this.shake(0.3); this.game.fx.ring(_v.copy(this.pos).setY(this.pos.y + 0.05), 0.3, 4, 0.4, 0xffffff); }
      if (this.giant > 0 || this.mech) { this.game.stompDamage(this.pos, 6, 60); this.shake(0.5); }
    }
    if (this.inWater > 0.2 && fall > 0.3) { this.game.fx.splash(_v.copy(this.pos).setY(this.pos.y + this.inWater), 16, 1); this.game.audio.play('splash', { pos: this.pos }); }
    if (this._groundPound) {
      this._groundPound = false;
      this.game.groundPound(this.pos, this);
    }
    if (this._slamSlide) {
      this._slamSlide = false;
      const hsp = Math.hypot(this.vel.x, this.vel.z);
      if (hsp > 2) { this.mode = 'normal'; this.slideCool = 0; this.trySlide(); }
      this.game.fx.ring(_v.copy(this.pos).setY(this.pos.y + 0.05), 0.3, 3, 0.35, 0x8ff6ff);
    }
    this.game.emit('land', { fall });
  }

  // ------------------------------------------------------------------ abilities
  trySlide() {
    if (this.mode !== 'normal' || this.slideCool > 0) return;
    const hsp = Math.hypot(this.vel.x, this.vel.z);
    if (!this.grounded) {
      // air slide-slam: drop fast, slide on landing
      if (this.airTime > 0.15) { this.vel.y = Math.min(this.vel.y, -22); this._slamSlide = true; }
      return;
    }
    if (hsp < 3) { this.crouch = true; return; }
    this.mode = 'slide';
    this.slideT = 0;
    const boost = Math.max(hsp + 3.5, 14.5) * this.speedMult;
    const d = _v.set(this.vel.x, 0, this.vel.z).normalize();
    this.vel.x = d.x * boost; this.vel.z = d.z * boost;
    this.game.audio.play('slide', { pos: this.pos });
    this.game.fx.dust(this.pos, 5, 0.6);
    this.game.emit('slide');
  }
  tryDodge(wish, hasInput) {
    if (this.mode === 'dodge' || this.mode === 'vault' || this.mode === 'dead' || this.dodgeCool > 0) return;
    if (!this.grounded && this.airDashes <= 0) return;
    if (this.mode === 'grapple') this._endGrapple();
    if (this.mode === 'wallrun') this._endWallrun();
    if (this.mode === 'slide') this.game.audio.loop('slide', 0);
    if (!this.grounded) this.airDashes--;
    const fwd = _v.set(-Math.sin(this.camYaw), 0, -Math.cos(this.camYaw));
    this.dodgeDir.copy(hasInput ? wish : fwd.multiplyScalar(-1));
    this.dodgeBack = hasInput ? wish.dot(_v.set(-Math.sin(this.camYaw), 0, -Math.cos(this.camYaw))) < -0.5 : true;
    this.mode = 'dodge';
    this.dodgeT = 0;
    this.dodgeCool = 0.55;
    this.iframes = 0.3;
    if (!this.grounded) this.vel.y = Math.max(this.vel.y, 2);
    this.game.audio.play('dash', { pos: this.pos });
    this.game.fx.burst(_v.copy(this.pos).add(_v2.set(0, 1, 0)), 8, FXColors.cyan, FXColors.cyanEnd, 2, 0.3, 0.3);
    this.game.emit('dodge');
  }
  tryMelee() {
    if (this.mode === 'dead' || this.mode === 'swim' || this.mode === 'dodge') return;
    const air = !this.grounded;
    if (this.arsenal.startMelee(air)) {
      // lunge toward target
      const def = this.arsenal.melee.def;
      const t = this.game.findMeleeTarget(this.pos, this.camForward, def.lunge + 2);
      if (t) {
        const d = _v.subVectors(t.pos, this.pos); d.y = 0;
        const dist = d.length();
        if (dist > 1.6) { d.normalize(); const sp = Math.min(22, (dist - 1.2) / 0.16); this.vel.x = d.x * sp; this.vel.z = d.z * sp; }
        this.yaw = Math.atan2(d.x, d.z);
      }
      if (def.id === 'hammer' && air && this.airTime > 0.2) { this.vel.y = -28; this._groundPound = true; }
    }
  }
  tryGrapple() {
    const G = this.game;
    if (this.mode === 'grapple') { this._endGrapple(); return; }
    if (this.grapple.cool > 0 || this.mode === 'dead' || this.mode === 'vault') return;
    // prefer highlighted grapple points near the crosshair
    const pt = G.findGrapplePoint(this.game.camera.position, this.camForward, 48);
    let anchor = null, collider = null, enemy = null;
    if (pt) { anchor = pt.pos; collider = pt.collider || null; }
    else {
      const e = G.raycastEnemies(G.camera.position, this.camForward, 30, this.camDistActual);
      const r = G.physics.raycast(_v.copy(G.camera.position).addScaledVector(this.camForward, this.camDistActual), this.camForward, 42, _hit, (c) => c.grapple && c.tag !== 'trigger');
      if (e && (!r.hit || e.dist < r.dist + this.camDistActual)) { enemy = e.enemy; anchor = e.point; }
      else if (r.hit) { anchor = r.point.clone(); collider = r.collider; }
    }
    if (!anchor) { G.audio.play('dryFire'); G.hud.flashCrosshair('nograpple'); return; }
    G.audio.play('grappleFire', { pos: this.pos });
    G.audio.play('grappleHit', { pos: anchor, delay: 0.06 });
    G.fx.sparks(anchor, 8, null, 5, FXColors.cyan, FXColors.cyanEnd);
    if (enemy && !enemy.heavy) {
      // CHAIN YANK: pull the enemy to you
      G.yankEnemy(enemy, this);
      this.grapple.cool = 0.6;
      this._flashRope(anchor);
      G.emit('yank', enemy);
      return;
    }
    const g = this.grapple;
    g.active = true; g.t = 0;
    g.anchor.copy(anchor);
    g.collider = collider;
    g.enemy = enemy;
    if (collider && collider.dynamic) g.local.copy(anchor).applyMatrix4(collider.inv);
    if (this.mode === 'slide') G.audio.loop('slide', 0);
    if (this.mode === 'wallrun') this._endWallrun();
    this.mode = 'grapple';
    this.grounded = false;
    this.vel.y = Math.max(this.vel.y, 5);
    this.jumps = 1;
    G.emit('grapple');
  }
  _updateGrappleAnchor() {
    const g = this.grapple;
    if (g.enemy) { if (g.enemy.alive) g.anchor.copy(g.enemy.pos).add(_v.set(0, g.enemy.height * 0.6, 0)); else this._endGrapple(); }
    else if (g.collider && g.collider.dynamic) g.anchor.copy(g.local).applyMatrix4(g.collider.m);
  }
  _endGrapple() {
    this.grapple.active = false;
    if (this.mode === 'grapple') this.mode = 'normal';
    this.grapple.cool = 0.35;
    this.game.audio.loop('grapple', 0);
  }
  _flashRope(anchor) { this._ropeFlash = 0.18; this._ropeFlashPos = anchor.clone(); }
  _updateRope() {
    const show = this.grapple.active || this._ropeFlash > 0;
    this.rope.visible = show; this.ropeHook.visible = show;
    if (!show) return;
    if (this._ropeFlash > 0) this._ropeFlash -= 1 / 60;
    const end = this.grapple.active ? this.grapple.anchor : this._ropeFlashPos;
    const start = this.model.grappleOrigin.getWorldPosition(_v);
    _v2.subVectors(end, start);
    const len = _v2.length();
    this.rope.position.copy(start);
    this.rope.quaternion.setFromUnitVectors(_v3.set(0, 0, 1), _v2.normalize());
    this.rope.scale.set(1, 1, len);
    this.ropeHook.position.copy(end);
    this.ropeHook.rotation.y += 0.3;
  }
  _startWallrun(n) {
    this.mode = 'wallrun';
    this.wallN.copy(n);
    this.wallT = 0;
    this.vel.y = Math.max(this.vel.y, 2.5);
    const right = _v.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw)); // model's screen-right (-X local) in world
    // wall on the anatomical right if wall normal points opposite to right vector
    const rightAnat = _v.set(-Math.cos(this.yaw), 0, Math.sin(this.yaw));
    this.wallSide = n.dot(rightAnat) < 0 ? 1 : -1;
    this.airDashes = this.abilities.airDashes;
    this.jumps = 1;
    this.game.audio.play('land', { pos: this.pos, vol: 0.5 });
    this.game.emit('wallrun');
  }
  _endWallrun() {
    if (this.mode === 'wallrun') this.mode = 'normal';
    this.lastWallN.copy(this.wallN);
    this.wallCool = 0.25;
  }
  _tryVault(wish) {
    const P = this.game.physics;
    const n = this.wallContactN;
    if (!n || wish.dot(n) > -0.5) return;
    const fwd = _v3.copy(n).multiplyScalar(-1);
    // probe for a ledge top
    const probe = _v.copy(this.pos).addScaledVector(fwd, 0.75).add(_v2.set(0, 2.3, 0));
    const r = P.raycast(probe, _v2.set(0, -1, 0), 2.3, _hit, (c) => c.tag !== 'trigger');
    if (!r.hit || r.normal.y < 0.7) return;
    const h = r.point.y - this.pos.y;
    if (h < 0.45 || h > 2.05) return;
    // clearance check above ledge
    const top = r.point.clone();
    const head = _v.copy(top).add(_v2.set(0, 1.0, 0));
    const blocked = P.collideSphere(head.clone(), 0.38, (c) => c.tag !== 'trigger');
    if (blocked) return;
    this.mode = 'vault';
    this.vault.t = 0;
    this.vault.dur = h < 1.2 ? 0.22 : 0.32;
    this.vault.from.copy(this.pos);
    this.vault.to.copy(top).addScaledVector(fwd, 0.35);
    const hsp = Math.max(7, Math.hypot(this.vel.x, this.vel.z));
    this.vault.vel = fwd.clone().multiplyScalar(hsp).setY(h < 1.2 ? 1.5 : 0);
    this.game.audio.play('vault', { pos: this.pos });
    this.game.emit('vault');
  }

  // ------------------------------------------------------------------ camera
  updateCamera(dt) {
    const G = this.game;
    const cam = G.camera;
    const s = this.model.root.scale.x;
    const slide = this.mode === 'slide' || this.crouch;
    const pivotH = (slide ? 1.05 : 1.62) * s + (this.mode === 'swim' ? -0.2 : 0);
    this._pivotH = damp(this._pivotH ?? pivotH, pivotH, 12, dt);
    const aim = this.aiming;
    const targetDist = (aim ? 1.9 : 3.5) * (1 + (s - 1) * 0.9) + (this.mode === 'grapple' ? 0.8 : 0);
    const shoulder = (aim ? 0.72 : 0.62) * s;
    this.camDist = damp(this.camDist, targetDist, aim ? 14 : 8, dt);
    this._shoulder = damp(this._shoulder ?? shoulder, shoulder, 10, dt);
    // smoothed follow (slight lag on vertical for landings)
    const target = _v.copy(this.pos);
    if (!this._follow) this._follow = target.clone();
    this._follow.x = damp(this._follow.x, target.x, 30, dt);
    this._follow.z = damp(this._follow.z, target.z, 30, dt);
    this._follow.y = damp(this._follow.y, target.y, this.grounded ? 14 : 22, dt);
    const pivot = _v2.copy(this._follow).setY(this._follow.y + this._pivotH - this.landT * 0.18);
    const pitch = this.camPitch;
    const yaw = this.camYaw;
    const fwd = _v3.set(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const shoulderPt = pivot.clone().addScaledVector(right, this._shoulder);
    // collision: pivot -> shoulder -> back
    let d = this.camDist;
    const P = G.physics;
    const filt = (c) => c.tag !== 'trigger' && c.blocksCamera !== false;
    let r = P.raycast(pivot, right, this._shoulder + 0.2, _hit, filt);
    if (r.hit) shoulderPt.copy(pivot).addScaledVector(right, Math.max(0, r.dist - 0.25));
    const back = fwd.clone().negate();
    r = P.raycast(shoulderPt, back, d + 0.3, _hit, filt);
    if (r.hit) d = Math.max(0.6, r.dist - 0.3);
    this._camD = damp(this._camD ?? d, d, d < (this._camD ?? d) ? 40 : 6, dt);
    this.camDistActual = this._camD;
    cam.position.copy(shoulderPt).addScaledVector(back, this._camD);
    // look direction
    cam.rotation.order = 'YXZ';
    cam.rotation.set(pitch, yaw, 0);
    // wallrun roll
    const roll = this.mode === 'wallrun' ? -this.wallSide * 0.12 : 0;
    this._roll = damp(this._roll ?? 0, roll, 6, dt);
    cam.rotation.z = this._roll;
    this.gunKick = (this.gunKick || 0) * Math.exp(-dt * 12);
    cam.rotation.x += this.gunKick * (G.settings?.shake ?? 1);
    cam.rotation.z += this.gunKick * 0.15 * (G.settings?.shake ?? 1);
    // shake (trauma^2)
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    const sh = this.trauma * this.trauma * (G.settings?.shake ?? 1);
    if (sh > 0) {
      const t = performance.now() * 0.001;
      cam.rotation.x += (Math.sin(t * 37.1) + Math.sin(t * 21.7)) * 0.02 * sh;
      cam.rotation.y += (Math.sin(t * 29.3) + Math.sin(t * 17.9)) * 0.02 * sh;
      cam.rotation.z += Math.sin(t * 41.3) * 0.03 * sh;
    }
    // FOV
    const hsp = Math.hypot(this.vel.x, this.vel.z);
    const baseFov = G.settings?.fov ?? 75;
    let fov = baseFov + clamp((hsp - 8) * 0.9, 0, 14) + (this.mode === 'grapple' ? 6 : 0);
    if (aim) fov = baseFov - 20;
    this.fovKick = Math.max(0, this.fovKick - dt * 8);
    fov += this.fovKick;
    cam.fov = damp(cam.fov, fov, 8, dt);
    cam.updateProjectionMatrix();
    this.camPos.copy(cam.position);
    // hide model if camera too close
    this.model.root.visible = this._camD > 0.75 || this.mode === 'dead';
    // audio listener
    G.audio.setListener(cam.position, yaw);
  }
}
