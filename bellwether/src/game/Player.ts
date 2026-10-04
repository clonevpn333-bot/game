import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { Input } from '../core/Input';
import type { PhysicsWorld, Surface } from '../core/Physics';
import { audio } from '../audio/AudioEngine';
import { clamp, damp, lerp } from '../render/Globals';

const RADIUS = 0.32;
const STAND_H = 1.78;
const CROUCH_H = 1.15;
const STAND_EYE = 1.64;
const CROUCH_EYE = 1.04;

export type PState = 'normal' | 'vault' | 'mantle' | 'climb' | 'dead';
export type Weapon = 'none' | 'pistol' | 'baton';

/** First-person Elias: body physics, camera feel, viewmodel. */
export class Player {
  readonly pos = new THREE.Vector3();
  readonly vel = new THREE.Vector3();
  yaw = 0;
  pitch = 0;
  state: PState = 'normal';
  grounded = true;
  crouching = false;
  sprinting = false;
  health = 100;
  readonly maxHealth = 100;
  trauma = 0;
  fovPunch = 0;
  moveScale = 1;
  flashlightOn = false;
  canFlashlight = false;
  weapon: Weapon = 'none';
  /** set by Combat: aim-down-sights blend 0..1 */
  ads = 0;
  noiseLevel = 0;
  surface: Surface = 'wet';
  invuln = 0;
  readonly camPos = new THREE.Vector3();
  readonly aimDir = new THREE.Vector3(0, 0, 1);
  readonly flashlight: THREE.SpotLight;
  readonly view = new THREE.Group();
  private eye = STAND_EYE;
  private height = STAND_H;
  private bobPhase = 0;
  private bobAmt = 0;
  private stepAcc = 0;
  private airTime = 0;
  private landDip = 0;
  private from = new THREE.Vector3();
  private to = new THREE.Vector3();
  private top = 0;
  private actionT = 0;
  private actionDur = 1;
  private ladderYaw = 0;
  private regenDelay = 0;
  private fov = 72;
  private sway = new THREE.Vector2();
  private recoil = 0;
  private reachT = 0;
  private swingT = 0;
  private arms: { root: THREE.Group; pistol: THREE.Group; baton: THREE.Group; left: THREE.Group; right: THREE.Group };
  hurtFlash = 0;
  onDeath: (() => void) | null = null;

  constructor(private readonly cam: THREE.PerspectiveCamera) {
    this.flashlight = new THREE.SpotLight(0xfff1d8, 0, 30, 0.45, 0.5, 1.6);
    this.flashlight.castShadow = true;
    this.flashlight.shadow.mapSize.set(1024, 1024);
    this.flashlight.shadow.bias = -0.0004;
    this.flashlight.shadow.camera.near = 0.2;
    this.flashlight.shadow.camera.far = 30;
    this.flashlight.position.set(0.18, -0.12, 0);
    this.flashlight.target.position.set(0.05, -0.1, -1);
    cam.add(this.flashlight, this.flashlight.target);
    this.arms = this.buildArms();
    this.view.add(this.arms.root);
    cam.add(this.view);
  }

  get head(): THREE.Vector3 {
    return this.camPos;
  }

  get chest(): THREE.Vector3 {
    return this.pos.clone().add(new THREE.Vector3(0, this.eye - 0.35, 0));
  }

  get speed(): number {
    return Math.hypot(this.vel.x, this.vel.z);
  }

  // ---------------------------------------------------------------- viewmodel
  private buildArms(): { root: THREE.Group; pistol: THREE.Group; baton: THREE.Group; left: THREE.Group; right: THREE.Group } {
    const root = new THREE.Group();
    const sleeve = new THREE.MeshStandardMaterial({ color: '#4b5236', roughness: 0.85 });
    const cuff = new THREE.MeshStandardMaterial({ color: '#3a4030', roughness: 0.9 });
    const skin = new THREE.MeshStandardMaterial({ color: '#c48f6a', roughness: 0.75 });
    const gun = new THREE.MeshStandardMaterial({ color: '#23262b', roughness: 0.42, metalness: 0.65 });
    const grip = new THREE.MeshStandardMaterial({ color: '#141518', roughness: 0.8 });
    const watch = new THREE.MeshStandardMaterial({ color: '#c8c2b4', roughness: 0.3, metalness: 0.8 });
    const rb = (w: number, h: number, d: number, r = 0.012) => new RoundedBoxGeometry(w, h, d, 2, r);
    const mk = (g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => {
      const o = new THREE.Mesh(g, m);
      o.position.set(x, y, z);
      o.rotation.set(rx, ry, rz);
      return o;
    };
    const arm = (side: 1 | -1) => {
      const g = new THREE.Group();
      g.add(mk(rb(0.1, 0.1, 0.42, 0.025), sleeve, 0, 0, 0.21));
      g.add(mk(rb(0.108, 0.108, 0.04, 0.01), cuff, 0, 0, 0.02));
      g.add(mk(rb(0.085, 0.08, 0.1, 0.018), skin, 0, -0.005, -0.04));
      g.add(mk(rb(0.08, 0.045, 0.08, 0.015), skin, 0, -0.03, -0.1, 0.4));
      g.add(mk(rb(0.03, 0.03, 0.065, 0.01), skin, -side * 0.045, 0.01, -0.07, 0, side * 0.5));
      if (side === 1) g.add(mk(rb(0.112, 0.11, 0.03, 0.006), watch, 0, 0, 0.055));
      return g;
    };
    const right = arm(-1);
    right.position.set(0.17, -0.2, -0.28);
    const left = arm(1);
    left.position.set(-0.13, -0.22, -0.3);
    root.add(right, left);
    const pistol = new THREE.Group();
    pistol.add(mk(rb(0.035, 0.045, 0.2, 0.008), gun, 0, 0.05, -0.08));
    pistol.add(mk(rb(0.03, 0.03, 0.17, 0.006), gun, 0, 0.02, -0.07));
    pistol.add(mk(rb(0.032, 0.1, 0.045, 0.008), grip, 0, -0.02, 0.0, -0.25));
    pistol.add(mk(rb(0.012, 0.012, 0.012, 0.003), new THREE.MeshBasicMaterial({ color: '#ffd27a' }), 0, 0.078, -0.16));
    pistol.add(mk(rb(0.012, 0.012, 0.012, 0.003), new THREE.MeshBasicMaterial({ color: '#7fe3a0' }), 0, 0.078, 0.005));
    pistol.position.set(0, 0.01, -0.12);
    right.add(pistol);
    const baton = new THREE.Group();
    baton.add(mk(new THREE.CylinderGeometry(0.016, 0.016, 0.5, 8), grip, 0, 0, -0.27, Math.PI / 2));
    baton.add(mk(new THREE.CylinderGeometry(0.022, 0.022, 0.12, 8), gun, 0, 0, -0.06, Math.PI / 2));
    baton.position.set(0, 0, -0.06);
    right.add(baton);
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.renderOrder = 10;
        m.frustumCulled = false;
      }
    });
    root.visible = false;
    return { root, pistol, baton, left, right };
  }

  /** Brief reach-forward of the right hand (pressing buttons, opening doors). */
  reach(): void {
    this.reachT = 0.55;
  }

  swing(): void {
    this.swingT = 0.42;
  }

  kick(amount: number): void {
    this.recoil = Math.min(1, this.recoil + amount);
  }

  // ---------------------------------------------------------------- lifecycle
  teleport(p: THREE.Vector3, yaw = this.yaw, pitch = 0): void {
    this.pos.copy(p);
    this.vel.set(0, 0, 0);
    this.yaw = yaw;
    this.pitch = pitch;
    this.state = 'normal';
    this.snapCamera();
  }

  revive(): void {
    this.health = this.maxHealth;
    this.state = 'normal';
    this.hurtFlash = 0;
    this.trauma = 0;
  }

  hurt(dmg: number, from?: THREE.Vector3): void {
    if (this.state === 'dead' || this.invuln > 0) return;
    this.health -= dmg;
    this.regenDelay = 4;
    this.hurtFlash = 1;
    this.trauma = Math.min(1, this.trauma + dmg / 40);
    if (from) {
      const d = from.clone().sub(this.pos);
      this.yaw += clamp(Math.sin(Math.atan2(d.x, d.z) - this.yaw), -1, 1) * 0.05;
    }
    audio.impact('flesh', this.chest, 0.7);
    if (this.health <= 0) {
      this.health = 0;
      this.state = 'dead';
      this.onDeath?.();
    }
  }

  // ---------------------------------------------------------------- update
  update(dt: number, input: Input, phys: PhysicsWorld, ctl: boolean): void {
    this.invuln = Math.max(0, this.invuln - dt);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt * 1.5);
    this.regenDelay -= dt;
    if (this.regenDelay < 0 && this.state !== 'dead') this.health = Math.min(this.maxHealth, this.health + 12 * dt);
    // look
    const look = input.takeLook();
    if (ctl && this.state !== 'dead') {
      const k = 1 - this.ads * 0.45;
      this.yaw -= look.dx * k;
      this.pitch = clamp(this.pitch - look.dy * k, -1.45, 1.45);
    }
    // flashlight
    if (ctl && this.canFlashlight && input.wasPressed('flashlight')) {
      this.flashlightOn = !this.flashlightOn;
      audio.click('switch');
    }
    this.flashlight.intensity = damp(this.flashlight.intensity, this.flashlightOn ? 60 : 0, 18, dt);
    // the shadow map must exist (rendered at least once) or every lit material's sampler is invalid
    this.flashlight.shadow.autoUpdate = this.flashlight.intensity > 0.5 || !this.flashlight.shadow.map;

    switch (this.state) {
      case 'vault':
      case 'mantle':
        this.updateTraverse(dt);
        break;
      case 'climb':
        this.updateClimb(dt, input, phys, ctl ? input.moveAxis() : { x: 0, y: 0 });
        break;
      case 'dead':
        this.vel.x = damp(this.vel.x, 0, 4, dt);
        this.vel.z = damp(this.vel.z, 0, 4, dt);
        this.vel.y -= 15 * dt;
        phys.moveCapsule(this.pos, this.vel, dt, RADIUS, CROUCH_H, 0.2, true);
        this.eye = damp(this.eye, 0.35, 3, dt);
        break;
      default:
        this.updateMove(dt, input, phys, ctl);
    }
    this.updateCamera(dt);
  }

  private updateMove(dt: number, input: Input, phys: PhysicsWorld, ctl: boolean): void {
    const mv = ctl ? input.moveAxis() : { x: 0, y: 0 };
    // crouch (toggle-hold), cannot stand up into a ceiling
    const wantCrouch = ctl && input.isDown('crouch');
    if (wantCrouch) this.crouching = true;
    else if (this.crouching && !phys.overlaps(this.pos, RADIUS * 0.9, STAND_H, 0.1)) this.crouching = false;
    this.sprinting = ctl && input.isDown('sprint') && mv.y > 0.3 && !this.crouching && this.ads < 0.5;
    const speed = (this.crouching ? 1.7 : this.sprinting ? 5.8 : 3.1) * this.moveScale * (1 - this.ads * 0.4);
    const fx = Math.sin(this.yaw);
    const fz = Math.cos(this.yaw);
    // camera looks down -Z at yaw 0 -> forward vector is (-sin, -cos)
    // forward (-sin, -cos), right (cos, -sin)
    const wish = new THREE.Vector3(-fx * mv.y + fz * mv.x, 0, -fz * mv.y - fx * mv.x);
    const wl = wish.length();
    if (wl > 1) wish.divideScalar(wl);
    const accel = this.grounded ? 16 : 3;
    this.vel.x = damp(this.vel.x, wish.x * speed, accel, dt);
    this.vel.z = damp(this.vel.z, wish.z * speed, accel, dt);
    this.vel.y -= 16 * dt;
    this.height = damp(this.height, this.crouching ? CROUCH_H : STAND_H, 12, dt);

    // jump / vault / mantle / ladder
    const fwd = new THREE.Vector3(-fx, 0, -fz);
    if (ctl && input.wasPressed('jump') && this.grounded) {
      const ledge = phys.probeLedge(this.pos, fwd.x, fwd.z, RADIUS);
      const rise = ledge ? ledge.top - this.pos.y : 0;
      if (ledge?.ladder) {
        this.startClimb(ledge.collider.cy + ledge.collider.hy, ledge.collider.yaw);
        return;
      } else if (ledge && rise > 0.45 && rise < 1.25 && ledge.depth < 1.4 && this.canLand(phys, fwd, ledge.depth + 0.9, ledge.top)) {
        this.startTraverse('vault', new THREE.Vector3(this.pos.x + fwd.x * (ledge.depth + 1.0), this.pos.y, this.pos.z + fwd.z * (ledge.depth + 1.0)), ledge.top, 0.55);
        return;
      } else if (ledge && rise >= 0.9 && rise < 2.3) {
        const target = new THREE.Vector3(this.pos.x + fwd.x * 0.7, ledge.top, this.pos.z + fwd.z * 0.7);
        if (!phys.overlaps(target, RADIUS * 0.8, CROUCH_H, 0.05)) {
          this.startTraverse('mantle', target, ledge.top, 0.85);
          return;
        }
      }
      this.vel.y = 5.0;
      this.grounded = false;
      audio.footstep(this.surface, 0.5, this.pos);
    }
    // walk into a ladder to climb it
    if (mv.y > 0.5) {
      const ledge = phys.probeLedge(this.pos, fwd.x, fwd.z, RADIUS);
      if (ledge?.ladder) {
        this.startClimb(ledge.collider.cy + ledge.collider.hy, ledge.collider.yaw);
        return;
      }
    }

    const prevY = this.vel.y;
    const r = phys.moveCapsule(this.pos, this.vel, dt, RADIUS, this.height, this.grounded ? 0.42 : 0.1, this.grounded);
    if (!this.grounded && r.grounded) {
      const impact = clamp(-prevY / 10, 0, 1);
      if (this.airTime > 0.25) {
        this.landDip = 0.08 * impact + 0.02;
        this.trauma = Math.min(1, this.trauma + impact * 0.25);
        audio.footstep(r.surface, 1.2, this.pos);
        if (-prevY > 14) this.hurt((-prevY - 14) * 7);
      }
      this.airTime = 0;
    }
    this.grounded = r.grounded;
    if (!this.grounded) this.airTime += dt;
    this.surface = r.surface;
    const hs = this.speed;
    if (this.grounded && hs > 0.3) {
      this.stepAcc += hs * dt;
      const stride = this.sprinting ? 1.7 : this.crouching ? 0.75 : 1.15;
      if (this.stepAcc > stride) {
        this.stepAcc = 0;
        audio.footstep(r.surface, this.crouching ? 0.3 : this.sprinting ? 1.1 : 0.7, this.pos);
      }
    }
    this.noiseLevel = this.sprinting ? 12 : this.crouching ? 1.5 : hs > 0.4 ? 6 : 0;
    if (this.pos.y < phys.killY) this.hurt(999);
  }

  private canLand(phys: PhysicsWorld, fwd: THREE.Vector3, d: number, top: number): boolean {
    const p = new THREE.Vector3(this.pos.x + fwd.x * d, this.pos.y, this.pos.z + fwd.z * d);
    const g = phys.groundAt(p.x, p.z, top + 0.2);
    return !phys.overlaps(new THREE.Vector3(p.x, Math.max(g.y, this.pos.y - 3), p.z), RADIUS * 0.8, 1.2, 0.3) && g.y > this.pos.y - 4;
  }

  private startTraverse(kind: 'vault' | 'mantle', target: THREE.Vector3, top: number, dur: number): void {
    this.state = kind;
    this.from.copy(this.pos);
    this.to.copy(target);
    this.top = top;
    this.actionT = 0;
    this.actionDur = dur;
    this.vel.set(0, 0, 0);
    this.crouching = false;
    audio.whoosh(this.chest, 0.2);
    audio.footstep('metal', 0.5, this.pos);
    this.reach();
  }

  private updateTraverse(dt: number): void {
    this.actionT += dt;
    const t = clamp(this.actionT / this.actionDur, 0, 1);
    if (this.state === 'vault') {
      const e = t * t * (3 - 2 * t);
      this.pos.lerpVectors(this.from, this.to, e);
      this.pos.y = this.from.y + Math.sin(t * Math.PI) * (this.top - this.from.y + 0.2);
    } else {
      const up = clamp(t / 0.6, 0, 1);
      const fw = clamp((t - 0.45) / 0.55, 0, 1);
      this.pos.x = lerp(this.from.x, this.to.x, fw * fw * (3 - 2 * fw));
      this.pos.z = lerp(this.from.z, this.to.z, fw * fw * (3 - 2 * fw));
      this.pos.y = lerp(this.from.y, this.to.y, 1 - Math.pow(1 - up, 2));
      this.height = lerp(STAND_H, CROUCH_H, Math.sin(t * Math.PI));
    }
    if (t >= 1) {
      this.pos.copy(this.to);
      if (this.state === 'vault') this.pos.y = this.from.y;
      this.state = 'normal';
      this.grounded = false;
      this.landDip = 0.05;
    }
  }

  private startClimb(top: number, yaw: number): void {
    this.state = 'climb';
    this.top = top;
    this.ladderYaw = yaw;
    this.vel.set(0, 0, 0);
    this.crouching = false;
  }

  private updateClimb(dt: number, input: Input, phys: PhysicsWorld, mv: { x: number; y: number }): void {
    const v = mv.y * 2.0;
    this.pos.y += v * dt;
    if (Math.abs(mv.y) > 0.1) {
      this.stepAcc += Math.abs(v) * dt;
      if (this.stepAcc > 0.42) {
        this.stepAcc = 0;
        audio.footstep('metal', 0.6, this.pos);
      }
    }
    const g = phys.groundAt(this.pos.x, this.pos.z, this.pos.y + 0.1, 0.1);
    if (this.pos.y + 1.0 > this.top && mv.y > 0) {
      // over the top: towards the ladder's back side
      const fx = -Math.sin(this.ladderYaw);
      const fz = -Math.cos(this.ladderYaw);
      this.startTraverse('mantle', new THREE.Vector3(this.pos.x + fx * 0.9, this.top, this.pos.z + fz * 0.9), this.top, 0.7);
      return;
    }
    if ((mv.y < 0 && this.pos.y <= g.y + 0.02) || input.wasPressed('jump') || input.wasPressed('crouch')) {
      this.state = 'normal';
      if (input.wasPressed('jump')) this.vel.set(Math.sin(this.ladderYaw) * 2, 2, Math.cos(this.ladderYaw) * 2);
    }
  }

  // ---------------------------------------------------------------- camera
  snapCamera(): void {
    this.eye = this.crouching ? CROUCH_EYE : STAND_EYE;
    this.updateCamera(0);
  }

  private updateCamera(dt: number): void {
    const cam = this.cam;
    if (this.state !== 'dead') this.eye = damp(this.eye, this.crouching ? CROUCH_EYE : STAND_EYE, 10, dt);
    // head bob, phase-locked to stride
    const hs = this.grounded && this.state === 'normal' ? this.speed : 0;
    this.bobAmt = damp(this.bobAmt, clamp(hs / 3.1, 0, 1.6), 8, dt);
    this.bobPhase += hs * dt * (this.sprinting ? 2.25 : 2.75);
    const bobY = Math.abs(Math.sin(this.bobPhase)) * 0.045 * this.bobAmt - 0.02 * this.bobAmt;
    const bobX = Math.cos(this.bobPhase) * 0.022 * this.bobAmt;
    this.landDip = damp(this.landDip, 0, 7, dt);
    this.camPos.set(this.pos.x, this.pos.y + this.eye + bobY - this.landDip, this.pos.z);
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    this.camPos.addScaledVector(right, bobX);
    // trauma shake (squared)
    this.trauma = Math.max(0, this.trauma - dt * 1.3);
    const sh = this.trauma * this.trauma;
    const t = performance.now() / 1000;
    const shYaw = Math.sin(t * 31) * 0.03 * sh;
    const shPitch = Math.sin(t * 27 + 1) * 0.03 * sh;
    const roll = Math.sin(t * 23) * 0.04 * sh + Math.cos(this.bobPhase) * 0.004 * this.bobAmt;
    this.recoil = Math.max(0, this.recoil - dt * 6);
    cam.position.copy(this.camPos);
    cam.rotation.set(this.pitch + shPitch + this.recoil * 0.05, this.yaw + shYaw, roll, 'YXZ');
    const targetFov = 72 + (this.sprinting ? 6 : 0) - this.ads * 18;
    this.fovPunch = damp(this.fovPunch, 0, 6, dt);
    this.fov = damp(this.fov, targetFov, 8, dt);
    const f = this.fov + this.fovPunch;
    if (Math.abs(cam.fov - f) > 0.01) {
      cam.fov = f;
      cam.updateProjectionMatrix();
    }
    cam.getWorldDirection(this.aimDir);
    // viewmodel
    const show = this.weapon !== 'none' || this.reachT > 0;
    this.arms.root.visible = show && this.state !== 'dead';
    this.arms.pistol.visible = this.weapon === 'pistol';
    this.arms.baton.visible = this.weapon === 'baton';
    this.arms.left.visible = this.weapon === 'pistol' && this.ads > 0.2 || this.state === 'mantle' || this.state === 'climb';
    this.reachT = Math.max(0, this.reachT - dt);
    this.swingT = Math.max(0, this.swingT - dt);
    this.sway.x = damp(this.sway.x, 0, 8, dt);
    this.sway.y = damp(this.sway.y, 0, 8, dt);
    const R = this.arms.right;
    const reach = this.reachT > 0 ? Math.sin((1 - this.reachT / 0.55) * Math.PI) : 0;
    const sw = this.swingT > 0 ? 1 - this.swingT / 0.42 : 0;
    const adsX = lerp(0.17, 0.0, this.ads);
    const adsY = lerp(-0.2, -0.13, this.ads);
    R.position.set(adsX + bobX * 0.6, adsY + bobY * 0.5 - this.recoil * 0.02 + reach * 0.05, -0.28 + this.recoil * 0.05 - reach * 0.18);
    R.rotation.set(this.recoil * 0.35 + reach * 0.2 + (sw > 0 ? Math.sin(sw * Math.PI) * -0.9 : 0), sw > 0 ? lerp(0.9, -0.8, sw) : 0, sw > 0 ? -0.6 : 0);
    const L = this.arms.left;
    L.position.set(lerp(-0.13, -0.035, this.ads), lerp(-0.22, -0.16, this.ads), lerp(-0.3, -0.32, this.ads));
    L.rotation.set(0, lerp(0, 0.35, this.ads), 0);
  }
}
