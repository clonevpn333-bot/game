import * as THREE from 'three';
import { Actor, type CharName } from '../actors/Characters';
import type { PhysicsWorld } from '../core/Physics';
import { audio } from '../audio/AudioEngine';
import { damp, dampAngle } from '../render/Globals';

/**
 * Companion / scripted character with simple steering:
 * - follow: keep near the player
 * - goto: walk/run to a point
 * - hold: stand still (optionally looking at something)
 */
export class Npc {
  readonly actor: Actor;
  readonly pos = new THREE.Vector3();
  readonly vel = new THREE.Vector3();
  yaw = 0;
  mode: 'follow' | 'goto' | 'hold' = 'hold';
  target = new THREE.Vector3();
  followOffset = new THREE.Vector3(1.2, 0, -1.6);
  run = false;
  private arrive: (() => void) | null = null;
  private stepAcc = 0;
  lookTarget: THREE.Vector3 | (() => THREE.Vector3) | null = null;
  faceYaw: number | null = null;
  hidden = false;
  speedMul = 1;
  /** combat helper (Reyes) */
  shooter = false;
  shootCd = 1;

  constructor(readonly name: CharName, scene: THREE.Object3D, p: THREE.Vector3, yaw = 0) {
    this.actor = new Actor(name);
    this.pos.copy(p);
    this.yaw = yaw;
    scene.add(this.actor.root);
    this.actor.root.position.copy(p);
    this.actor.root.rotation.y = yaw;
  }

  place(p: THREE.Vector3, yaw?: number): void {
    this.pos.copy(p);
    if (yaw !== undefined) this.yaw = yaw;
    this.vel.set(0, 0, 0);
  }

  goto(p: THREE.Vector3, run = false): Promise<void> {
    this.mode = 'goto';
    this.target.copy(p);
    this.run = run;
    return new Promise((res) => (this.arrive = res));
  }

  follow(offset?: THREE.Vector3): void {
    this.mode = 'follow';
    if (offset) this.followOffset.copy(offset);
  }

  hold(faceYaw?: number): void {
    this.mode = 'hold';
    this.faceYaw = faceYaw ?? null;
  }

  update(dt: number, phys: PhysicsWorld, player: { pos: THREE.Vector3; yaw: number; vel: THREE.Vector3 }, cameraPos: THREE.Vector3): void {
    this.actor.root.visible = !this.hidden;
    let want = new THREE.Vector3();
    let speed = 0;
    if (this.mode === 'follow') {
      const pf = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw));
      const pr = new THREE.Vector3(pf.z, 0, -pf.x);
      const goal = player.pos.clone().addScaledVector(pr, this.followOffset.x).addScaledVector(pf, this.followOffset.z);
      const d = goal.distanceTo(this.pos);
      const pd = player.pos.distanceTo(this.pos);
      // teleport if hopelessly far and not on screen
      if (pd > 28) {
        const behind = player.pos.clone().addScaledVector(pf, -4);
        const toCam = behind.clone().sub(cameraPos);
        if (toCam.length() > 3) this.pos.copy(behind);
      }
      if (d > 1.0 && pd > 2.2) {
        want = goal.sub(this.pos).setY(0).normalize();
        const ps = Math.hypot(player.vel.x, player.vel.z);
        speed = d > 6 ? 5 : Math.max(1.4, Math.min(5, ps + d * 0.4));
      }
    } else if (this.mode === 'goto') {
      const d = this.target.clone().sub(this.pos).setY(0);
      if (d.length() < 0.35) {
        this.mode = 'hold';
        const a = this.arrive;
        this.arrive = null;
        a?.();
      } else {
        want = d.normalize();
        speed = (this.run ? 4.6 : 1.55) * this.speedMul;
        if (d.length() < 1.2) speed *= 0.6;
      }
    }
    this.vel.x = damp(this.vel.x, want.x * speed, 8, dt);
    this.vel.z = damp(this.vel.z, want.z * speed, 8, dt);
    this.vel.y -= 22 * dt;
    const r = phys.moveCapsule(this.pos, this.vel, dt, 0.3, 1.7);
    const hs = Math.hypot(this.vel.x, this.vel.z);
    if (hs > 0.3) this.yaw = dampAngle(this.yaw, Math.atan2(this.vel.x, this.vel.z), 9, dt);
    else if (this.faceYaw !== null) this.yaw = dampAngle(this.yaw, this.faceYaw, 5, dt);
    else if (this.lookTarget && this.mode === 'hold') {
      const lt = typeof this.lookTarget === 'function' ? this.lookTarget() : this.lookTarget;
      const d = lt.clone().sub(this.pos);
      if (d.lengthSq() > 0.5) this.yaw = dampAngle(this.yaw, Math.atan2(d.x, d.z), 3, dt);
    }
    this.actor.speed = r.grounded ? hs : 0;
    if (hs > 0.4 && r.grounded) {
      this.stepAcc += hs * dt;
      if (this.stepAcc > (hs > 3 ? 1.4 : 0.85)) {
        this.stepAcc = 0;
        audio.footstep(r.surface, 0.55, this.pos);
      }
    }
    this.actor.root.position.copy(this.pos);
    this.actor.root.rotation.y = this.yaw;
    const lt = this.lookTarget ? (typeof this.lookTarget === 'function' ? this.lookTarget() : this.lookTarget) : null;
    this.actor.lookAt = lt;
    this.actor.update(dt);
  }

  dispose(): void {
    this.actor.dispose();
  }
}
