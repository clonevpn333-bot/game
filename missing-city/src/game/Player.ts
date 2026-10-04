import * as THREE from 'three';
import type { Input } from '../core/Input';
import type { PhysicsWorld, Surface } from '../core/Physics';
import { Actor } from '../actors/Characters';
import { audio } from '../audio/AudioEngine';
import { clamp, damp, dampAngle, angleDiff, G } from '../render/Globals';
import { coneMaterial } from '../render/Materials';

export type PState = 'normal' | 'vault' | 'mantle' | 'climb' | 'dodge' | 'dead' | 'scripted' | 'fall';

const RADIUS = 0.32;
const HEIGHT = 1.75;
const CROUCH_H = 1.15;

export class Player {
  readonly actor: Actor;
  readonly pos = new THREE.Vector3();
  readonly vel = new THREE.Vector3();
  yaw = 0;
  camYaw = 0;
  camPitch = -0.08;
  state: PState = 'normal';
  grounded = true;
  crouching = false;
  sprinting = false;
  aiming = false;
  health = 100;
  maxHealth = 100;
  invuln = 0;
  lastHurt = 99;
  flashlightOn = false;
  canFlashlight = true;
  canAim = false;
  canJump = true;
  moveScale = 1;
  surface: Surface = 'wet';
  readonly flashlight: THREE.SpotLight;
  private beam: THREE.Mesh;
  private stepAcc = 0;
  private actionT = 0;
  private actionDur = 0;
  private from = new THREE.Vector3();
  private to = new THREE.Vector3();
  private dodgeDir = new THREE.Vector3();
  private airTime = 0;
  private ladderTop = 0;
  private ladderYaw = 0;
  /** camera */
  readonly camPos = new THREE.Vector3();
  readonly camTarget = new THREE.Vector3();
  private camDist = 2.9;
  private shoulder = 0.55;
  private fov = 62;
  fovPunch = 0;
  trauma = 0;
  private shakeT = 0;
  recoil = 0;
  onLand: ((v: number) => void) | null = null;
  onMelee: (() => void) | null = null;
  /** world-space aim ray (from camera) */
  readonly aimOrigin = new THREE.Vector3();
  readonly aimDir = new THREE.Vector3(0, 0, 1);
  meleeCooldown = 0;
  noiseLevel = 0;

  constructor(scene: THREE.Object3D) {
    this.actor = new Actor('elias');
    scene.add(this.actor.root);
    this.flashlight = new THREE.SpotLight(0xfff1d8, 0, 32, 0.42, 0.55, 1.6);
    this.flashlight.castShadow = true;
    this.flashlight.shadow.mapSize.set(1024, 1024);
    this.flashlight.shadow.bias = -0.0004;
    this.flashlight.shadow.camera.near = 0.3;
    this.flashlight.shadow.camera.far = 32;
    scene.add(this.flashlight);
    scene.add(this.flashlight.target);
    const bg = new THREE.CylinderGeometry(0.02, 1.4, 9, 20, 1, true);
    bg.translate(0, -4.5, 0);
    bg.rotateX(-Math.PI / 2);
    this.beam = new THREE.Mesh(bg, coneMaterial('#fff0d0', 0.025));
    this.beam.visible = false;
    scene.add(this.beam);
  }

  teleport(p: THREE.Vector3, yaw: number): void {
    this.pos.copy(p);
    this.vel.set(0, 0, 0);
    this.yaw = yaw;
    this.camYaw = yaw;
    this.camPitch = -0.08;
    this.state = 'normal';
    this.actor.root.position.copy(p);
    this.actor.root.rotation.y = yaw;
    this.snapCamera();
  }

  get height(): number {
    return this.crouching ? CROUCH_H : HEIGHT;
  }

  get head(): THREE.Vector3 {
    return this.pos.clone().add(new THREE.Vector3(0, this.crouching ? 1.05 : 1.6, 0));
  }

  get chest(): THREE.Vector3 {
    return this.pos.clone().add(new THREE.Vector3(0, this.crouching ? 0.8 : 1.3, 0));
  }

  hurt(amount: number, from?: THREE.Vector3): boolean {
    if (this.invuln > 0 || this.state === 'dead' || this.state === 'scripted') return false;
    this.health = Math.max(0, this.health - amount);
    this.lastHurt = 0;
    this.trauma = Math.min(1, this.trauma + 0.45);
    this.invuln = 0.35;
    audio.impact('flesh', this.chest, 0.8);
    if (from) {
      const push = this.pos.clone().sub(from).setY(0).normalize().multiplyScalar(3);
      this.vel.add(push);
    }
    if (this.health <= 0) {
      this.state = 'dead';
      this.actor.play('death', { hold: true, fade: 0.1 });
      return true;
    }
    this.actor.play('hit', { fade: 0.05 });
    return false;
  }

  revive(): void {
    this.health = this.maxHealth;
    this.state = 'normal';
    this.actor.stopOneShot(0.1);
  }

  setFlashlight(on: boolean): void {
    if (!this.canFlashlight) on = false;
    if (on !== this.flashlightOn) audio.click('switch', this.chest);
    this.flashlightOn = on;
  }

  update(dt: number, input: Input, phys: PhysicsWorld, camera: THREE.PerspectiveCamera, controlsEnabled: boolean): void {
    this.invuln = Math.max(0, this.invuln - dt);
    this.lastHurt += dt;
    this.meleeCooldown = Math.max(0, this.meleeCooldown - dt);
    if (this.lastHurt > 5 && this.health < this.maxHealth && this.state !== 'dead') this.health = Math.min(this.maxHealth, this.health + 9 * dt);

    const look = controlsEnabled ? input.takeLook() : { dx: 0, dy: 0 };
    const sens = this.aiming ? 0.6 : 1;
    this.camYaw -= look.dx * sens;
    this.camPitch = clamp(this.camPitch - look.dy * sens, -1.2, 0.95);

    const mv = controlsEnabled ? input.moveAxis() : { x: 0, y: 0 };
    const fwd = new THREE.Vector3(Math.sin(this.camYaw), 0, Math.cos(this.camYaw));
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    const wish = new THREE.Vector3().addScaledVector(fwd, mv.y).addScaledVector(right, mv.x);
    const wl = Math.min(1, wish.length());
    if (wl > 0.001) wish.normalize();

    if (controlsEnabled && input.wasPressed('flashlight')) this.setFlashlight(!this.flashlightOn);

    switch (this.state) {
      case 'normal':
      case 'fall':
        this.updateNormal(dt, input, phys, wish, wl, controlsEnabled);
        break;
      case 'vault':
      case 'mantle':
        this.updateTraverse(dt);
        break;
      case 'climb':
        this.updateClimb(dt, input, phys, mv);
        break;
      case 'dodge':
        this.updateDodge(dt, phys);
        break;
      case 'dead':
      case 'scripted':
        this.vel.x = damp(this.vel.x, 0, 8, dt);
        this.vel.z = damp(this.vel.z, 0, 8, dt);
        if (this.state === 'dead') {
          this.vel.y -= 20 * dt;
          const r = phys.moveCapsule(this.pos, this.vel, dt, RADIUS, HEIGHT);
          this.grounded = r.grounded;
        }
        this.actor.speed = 0;
        break;
    }

    // character transform
    this.actor.root.position.copy(this.pos);
    this.actor.root.rotation.y = this.yaw;
    this.actor.aim = damp(this.actor.aim, this.aiming ? 1 : 0, 14, dt);
    this.actor.crouch = damp(this.actor.crouch, this.crouching ? 1 : 0, 10, dt);
    this.actor.update(dt);
    // aim pitch: bend the spine with the camera
    if (this.actor.aim > 0.05) {
      const sp = this.actor.bone('spine');
      const ch = this.actor.bone('chest');
      const p = -this.camPitch * this.actor.aim * 0.5;
      sp?.rotateX(p);
      ch?.rotateX(p);
    }
    this.updateCamera(dt, phys, camera);
    this.updateFlashlight(dt, phys);
  }

  private updateNormal(dt: number, input: Input, phys: PhysicsWorld, wish: THREE.Vector3, wl: number, ctl: boolean): void {
    this.aiming = ctl && this.canAim && input.isDown('aim') && this.grounded;
    if (ctl && input.wasPressed('crouch')) this.crouching = !this.crouching;
    this.sprinting = ctl && input.isDown('sprint') && wl > 0.2 && !this.aiming;
    if (this.sprinting && this.crouching) {
      if (!phys.overlaps(this.pos, RADIUS, HEIGHT, CROUCH_H)) this.crouching = false;
    }
    if (!this.crouching && phys.overlaps(this.pos, RADIUS, HEIGHT, CROUCH_H)) this.crouching = true;
    const base = this.aiming ? 1.6 : this.crouching ? 1.25 : this.sprinting ? 5.4 : 2.7;
    const speed = base * this.moveScale * wl;
    const accel = this.grounded ? 14 : 3;
    this.vel.x = damp(this.vel.x, wish.x * speed, accel, dt);
    this.vel.z = damp(this.vel.z, wish.z * speed, accel, dt);
    this.vel.y -= 22 * dt;

    // facing
    if (this.aiming) this.yaw = dampAngle(this.yaw, this.camYaw, 18, dt);
    else if (wl > 0.1) this.yaw = dampAngle(this.yaw, Math.atan2(wish.x, wish.z), this.sprinting ? 9 : 12, dt);

    // jump / vault / mantle / ladder
    if (ctl && input.wasPressed('jump') && this.grounded) {
      const fx = Math.sin(this.yaw);
      const fz = Math.cos(this.yaw);
      const ledge = phys.probeLedge(this.pos, fx, fz, RADIUS);
      if (ledge?.ladder) {
        this.startClimb(ledge.collider.cy + ledge.collider.hy, ledge.collider.yaw);
      } else if (ledge && ledge.top - this.pos.y > 0.45 && ledge.top - this.pos.y < 1.3 && ledge.depth < 1.4 && this.canLand(phys, fx, fz, ledge.depth + 0.9, ledge.top)) {
        this.startTraverse('vault', new THREE.Vector3(this.pos.x + fx * (ledge.depth + 1.0), this.pos.y, this.pos.z + fz * (ledge.depth + 1.0)), ledge.top, 0.75);
      } else if (ledge && ledge.top - this.pos.y >= 1.0 && ledge.top - this.pos.y < 2.4) {
        const target = new THREE.Vector3(this.pos.x + fx * 0.75, ledge.top, this.pos.z + fz * 0.75);
        if (!phys.overlaps(target, RADIUS * 0.8, CROUCH_H, 0.05)) this.startTraverse('mantle', target, ledge.top, 1.05);
        else if (this.canJump) this.jump();
      } else if (this.canJump) {
        this.jump();
      }
      if (this.state !== 'normal') return;
    }
    // ladder by walking into it
    if (wl > 0.5) {
      const ledge = phys.probeLedge(this.pos, Math.sin(this.yaw), Math.cos(this.yaw), RADIUS);
      if (ledge?.ladder && Math.abs(angleDiff(this.yaw, ledge.collider.yaw + Math.PI)) < 0.9) {
        this.startClimb(ledge.collider.cy + ledge.collider.hy, ledge.collider.yaw);
        return;
      }
    }
    // dodge
    if (ctl && input.wasPressed('dodge') && this.grounded) {
      this.dodgeDir.copy(wl > 0.1 ? wish : new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)));
      this.yaw = Math.atan2(this.dodgeDir.x, this.dodgeDir.z);
      this.state = 'dodge';
      this.actionT = 0;
      this.actionDur = this.actor.play('dodge', { fade: 0.05 }) || 0.75;
      this.invuln = 0.5;
      audio.whoosh(this.chest, 0.3);
      return;
    }
    // melee
    if (ctl && (input.wasPressed('melee') || (input.wasPressed('fire') && !this.aiming)) && this.meleeCooldown <= 0) {
      this.meleeCooldown = 0.7;
      this.actor.play('melee', { fade: 0.08 });
      audio.whoosh(this.chest, 0.25);
      window.setTimeout(() => this.onMelee?.(), 300);
    }

    const prevY = this.vel.y;
    const r = phys.moveCapsule(this.pos, this.vel, dt, RADIUS, this.height, this.grounded ? 0.42 : 0.1, this.grounded);
    if (!this.grounded && r.grounded) {
      if (this.airTime > 0.35) {
        const impact = clamp(-prevY / 12, 0, 1);
        this.trauma = Math.min(1, this.trauma + impact * 0.4);
        if (impact > 0.4) this.actor.play('land', { fade: 0.05 });
        audio.footstep(r.surface, 1.4, this.pos);
        this.onLand?.(-prevY);
        if (-prevY > 15) this.hurt((-prevY - 15) * 6);
      }
      this.airTime = 0;
    }
    this.grounded = r.grounded;
    if (!this.grounded) this.airTime += dt;
    this.surface = r.surface;
    if (this.airTime > 0.5 && this.state === 'normal' && !this.actor.poseName) {
      this.actor.setPose('fall', 0.3);
    } else if (this.grounded && this.actor.poseName === 'fall') this.actor.setPose(null, 0.1);
    const hs = Math.hypot(this.vel.x, this.vel.z);
    this.actor.speed = this.grounded ? hs : 0;
    // footsteps
    if (this.grounded && hs > 0.4) {
      this.stepAcc += hs * dt;
      const stride = this.sprinting ? 1.45 : this.crouching ? 0.6 : 0.85;
      if (this.stepAcc > stride) {
        this.stepAcc = 0;
        audio.footstep(r.surface, this.crouching ? 0.35 : this.sprinting ? 1.25 : 0.8, this.pos);
      }
    }
    this.noiseLevel = this.sprinting ? 12 : this.crouching ? 2 : hs > 0.4 ? 6 : 0;
    if (this.pos.y < phys.killY) this.hurt(999);
  }

  private canLand(phys: PhysicsWorld, fx: number, fz: number, d: number, top: number): boolean {
    const p = new THREE.Vector3(this.pos.x + fx * d, this.pos.y, this.pos.z + fz * d);
    const g = phys.groundAt(p.x, p.z, top + 0.2);
    return !phys.overlaps(new THREE.Vector3(p.x, Math.max(g.y, this.pos.y - 3), p.z), RADIUS * 0.8, 1.2, 0.3) && g.y > this.pos.y - 4;
  }

  private jump(): void {
    this.vel.y = 6.2;
    this.grounded = false;
    this.actor.play('jump', { fade: 0.05 });
  }

  private startTraverse(kind: 'vault' | 'mantle', target: THREE.Vector3, top: number, dur: number): void {
    this.state = kind;
    this.from.copy(this.pos);
    this.to.copy(target);
    this.ladderTop = top;
    this.actionT = 0;
    this.actionDur = dur;
    this.vel.set(0, 0, 0);
    this.crouching = false;
    this.aiming = false;
    this.actor.play(kind, { fade: 0.08 });
    audio.whoosh(this.chest, 0.2);
    audio.footstep('metal', 0.6, this.pos);
  }

  private updateTraverse(dt: number): void {
    this.actionT += dt;
    const t = clamp(this.actionT / this.actionDur, 0, 1);
    if (this.state === 'vault') {
      const e = t * t * (3 - 2 * t);
      this.pos.lerpVectors(this.from, this.to, e);
      this.pos.y = this.from.y + Math.sin(t * Math.PI) * (this.ladderTop - this.from.y + 0.25);
      this.actor.speed = 0;
    } else {
      // rise first, then move forward
      const up = clamp(t / 0.6, 0, 1);
      const fw = clamp((t - 0.45) / 0.55, 0, 1);
      this.pos.x = THREE.MathUtils.lerp(this.from.x, this.to.x, fw * fw * (3 - 2 * fw));
      this.pos.z = THREE.MathUtils.lerp(this.from.z, this.to.z, fw * fw * (3 - 2 * fw));
      this.pos.y = THREE.MathUtils.lerp(this.from.y, this.to.y, 1 - Math.pow(1 - up, 2));
    }
    if (t >= 1) {
      this.pos.copy(this.to);
      if (this.state === 'vault') this.pos.y = this.from.y;
      this.state = 'normal';
      this.grounded = false;
    }
  }

  private startClimb(top: number, yaw: number): void {
    this.state = 'climb';
    this.ladderTop = top;
    this.ladderYaw = yaw + Math.PI;
    this.yaw = this.ladderYaw;
    this.vel.set(0, 0, 0);
    this.actor.setPose('climb', 0.2);
  }

  private updateClimb(dt: number, input: Input, phys: PhysicsWorld, mv: { x: number; y: number }): void {
    const v = mv.y * 1.6;
    this.pos.y += v * dt;
    this.actor.timeScale = Math.abs(mv.y) > 0.1 ? 1 : 0.0001;
    this.actor.speed = 0;
    if (Math.abs(mv.y) > 0.1) {
      this.stepAcc += Math.abs(v) * dt;
      if (this.stepAcc > 0.45) {
        this.stepAcc = 0;
        audio.footstep('metal', 0.6, this.pos);
      }
    }
    const g = phys.groundAt(this.pos.x, this.pos.z, this.pos.y + 0.1, 0.1);
    if (this.pos.y + 1.0 > this.ladderTop && mv.y > 0) {
      // climb off onto the top
      const fx = Math.sin(this.yaw);
      const fz = Math.cos(this.yaw);
      this.actor.timeScale = 1;
      this.actor.setPose(null, 0.2);
      this.startTraverse('mantle', new THREE.Vector3(this.pos.x + fx * 0.9, this.ladderTop, this.pos.z + fz * 0.9), this.ladderTop, 0.8);
      return;
    }
    if ((mv.y < 0 && this.pos.y <= g.y + 0.02) || input.wasPressed('jump') || input.wasPressed('crouch')) {
      this.actor.timeScale = 1;
      this.actor.setPose(null, 0.2);
      this.state = 'normal';
      if (input.wasPressed('jump')) this.vel.set(-Math.sin(this.yaw) * 2, 2, -Math.cos(this.yaw) * 2);
    }
  }

  private updateDodge(dt: number, phys: PhysicsWorld): void {
    this.actionT += dt;
    const t = this.actionT / this.actionDur;
    const sp = t < 0.75 ? 5.2 * (1 - t * 0.6) : 1;
    this.vel.x = this.dodgeDir.x * sp;
    this.vel.z = this.dodgeDir.z * sp;
    this.vel.y -= 22 * dt;
    const r = phys.moveCapsule(this.pos, this.vel, dt, RADIUS, CROUCH_H, 0.42, true);
    this.grounded = r.grounded;
    this.actor.speed = 0;
    if (t >= 1) this.state = 'normal';
  }

  // ---------------------------------------------------------------- camera
  snapCamera(): void {
    this.computeCamera(0, null, true);
  }

  private computeCamera(dt: number, phys: PhysicsWorld | null, snap = false): void {
    const aimK = this.actor.aim;
    const dist = THREE.MathUtils.lerp(this.crouching ? 2.5 : 2.9, 1.45, aimK) + (this.sprinting ? 0.35 : 0);
    const sh = THREE.MathUtils.lerp(0.55, 0.62, aimK);
    this.camDist = snap ? dist : damp(this.camDist, dist, 6, dt);
    this.shoulder = snap ? sh : damp(this.shoulder, sh, 6, dt);
    const pivotH = this.state === 'climb' ? 1.5 : this.crouching ? 1.15 : 1.58;
    const pivot = this.pos.clone().add(new THREE.Vector3(0, pivotH, 0));
    const cp = Math.cos(this.camPitch);
    const dir = new THREE.Vector3(Math.sin(this.camYaw) * cp, Math.sin(this.camPitch), Math.cos(this.camYaw) * cp);
    const right = new THREE.Vector3(-Math.cos(this.camYaw), 0, Math.sin(this.camYaw));
    const shoulderPt = pivot.clone().addScaledVector(right, this.shoulder);
    let want = shoulderPt.clone().addScaledVector(dir, -this.camDist);
    if (phys) {
      // keep the shoulder offset clear of walls, then the boom
      const sd = shoulderPt.clone().sub(pivot);
      const sl = sd.length();
      const sh2 = phys.raycast(pivot, sd.normalize(), sl + 0.2, (c) => !c.noShoot || true);
      const sp = sh2 ? pivot.clone().addScaledVector(sd, Math.max(0, sh2.dist - 0.2)) : shoulderPt;
      const bd = want.clone().sub(sp);
      const bl = bd.length();
      bd.normalize();
      const hit = phys.raycast(sp, bd, bl + 0.25);
      want = hit ? sp.clone().addScaledVector(bd, Math.max(0.25, hit.dist - 0.25)) : sp.clone().addScaledVector(bd, bl);
    }
    if (snap) this.camPos.copy(want);
    else this.camPos.lerp(want, 1 - Math.exp(-22 * dt));
    this.camTarget.copy(this.camPos).addScaledVector(dir, 10);
    this.aimOrigin.copy(this.camPos);
    this.aimDir.copy(dir);
  }

  private updateCamera(dt: number, phys: PhysicsWorld, camera: THREE.PerspectiveCamera): void {
    this.computeCamera(dt, phys);
    camera.position.copy(this.camPos);
    camera.lookAt(this.camTarget);
    // recoil kick + trauma shake
    this.recoil = damp(this.recoil, 0, 12, dt);
    camera.rotateX(this.recoil * 0.04);
    this.trauma = Math.max(0, this.trauma - dt * 1.3);
    this.shakeT += dt;
    if (this.trauma > 0) {
      const s = this.trauma * this.trauma;
      const n = (k: number) => Math.sin(this.shakeT * 31 * k + k * 7.1) * Math.sin(this.shakeT * 17 * k);
      camera.position.add(new THREE.Vector3(n(1) * 0.12 * s, n(2) * 0.12 * s, 0));
      camera.rotateZ(n(3) * 0.05 * s);
    }
    const wantFov = (this.aiming ? 46 : this.sprinting ? 68 : 62) + this.fovPunch;
    this.fovPunch = damp(this.fovPunch, 0, 5, dt);
    this.fov = damp(this.fov, wantFov, 8, dt);
    if (Math.abs(camera.fov - this.fov) > 0.01) {
      camera.fov = this.fov;
      camera.updateProjectionMatrix();
    }
  }

  private updateFlashlight(dt: number, phys: PhysicsWorld): void {
    const on = this.flashlightOn && this.state !== 'dead';
    const want = on ? 55 : 0;
    // subtle flicker when Echo distortion is strong
    const flick = G.uEcho.value > 0.3 ? 0.75 + 0.25 * Math.sin(performance.now() * 0.05) : 1;
    this.flashlight.intensity = damp(this.flashlight.intensity, want * flick, 20, dt);
    this.flashlight.visible = this.flashlight.intensity > 0.5;
    const origin = this.pos.clone().add(new THREE.Vector3(0, this.crouching ? 0.95 : 1.38, 0)).addScaledVector(new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)), 0.25);
    origin.addScaledVector(new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw)), 0.12);
    this.flashlight.position.copy(origin);
    const hit = phys.raycast(this.aimOrigin, this.aimDir, 40);
    const tgt = hit ? hit.point : this.aimOrigin.clone().addScaledVector(this.aimDir, 30);
    this.flashlight.target.position.lerp(tgt, 1 - Math.exp(-25 * dt));
    this.beam.visible = this.flashlight.visible;
    if (this.beam.visible) {
      this.beam.position.copy(origin).addScaledVector(this.flashlight.target.position.clone().sub(origin).normalize(), 0.6);
      this.beam.lookAt(this.flashlight.target.position);
      this.beam.rotateY(Math.PI);
      const len = Math.min(9, origin.distanceTo(this.flashlight.target.position));
      this.beam.scale.set(1, 1, len / 9);
    }
  }
}
