import * as THREE from 'three';
import type { Player } from './Player';
import type { Remnant } from './Remnant';
import type { PhysicsWorld } from '../core/Physics';
import type { Effects } from '../render/Effects';
import { audio } from '../audio/AudioEngine';
import type { Input } from '../core/Input';

/** The pistol, melee resolution and hit feedback. */
export class Combat {
  mag = 12;
  magSize = 12;
  reserve = 24;
  private cd = 0;
  private reloading = 0;
  hasGun = false;
  readonly gun: THREE.Group;
  hitMarker = 0;
  onKill: ((r: Remnant) => void) | null = null;

  constructor(private player: Player, private fx: Effects) {
    this.gun = this.buildGun();
    this.gun.visible = false;
    const hand = player.actor.bone('hand.R');
    hand?.add(this.gun);
    player.onMelee = () => this.meleeHit?.();
  }

  meleeHit: (() => void) | null = null;

  private buildGun(): THREE.Group {
    const g = new THREE.Group();
    const dark = new THREE.MeshStandardMaterial({ color: 0x1a1b1d, roughness: 0.35, metalness: 0.8 });
    const grip = new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.8 });
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.035, 0.2), dark);
    slide.position.set(0, 0.03, 0.05);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.025, 0.17), dark);
    frame.position.set(0, 0.005, 0.04);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.11, 0.045), grip);
    handle.position.set(0, -0.045, -0.02);
    handle.rotation.x = 0.25;
    g.add(slide, frame, handle);
    // orient: hand bone Y runs along the fingers; point the barrel along the index finger direction
    g.rotation.set(-Math.PI / 2 + 0.15, 0, 0);
    g.position.set(0.0, 0.07, 0.02);
    g.scale.setScalar(1.0);
    return g;
  }

  muzzleWorld(): THREE.Vector3 {
    const p = new THREE.Vector3(0, 0.03, 0.17);
    return this.gun.localToWorld(p);
  }

  update(dt: number, input: Input, phys: PhysicsWorld, enemies: Remnant[], ctl: boolean): void {
    this.cd = Math.max(0, this.cd - dt);
    this.hitMarker = Math.max(0, this.hitMarker - dt);
    const p = this.player;
    this.gun.visible = this.hasGun && (p.aiming || p.actor.aim > 0.3);
    p.canAim = this.hasGun;
    if (this.reloading > 0) {
      this.reloading -= dt;
      if (this.reloading <= 0) {
        const need = this.magSize - this.mag;
        const take = Math.min(need, this.reserve);
        this.mag += take;
        this.reserve -= take;
      }
    }
    if (!ctl || !this.hasGun) return;
    if (input.wasPressed('reload') && this.reloading <= 0 && this.mag < this.magSize && this.reserve > 0) this.reload();
    if (p.aiming && input.isDown('fire') && this.cd <= 0 && this.reloading <= 0 && p.actor.aim > 0.6) {
      if (this.mag <= 0) {
        if (input.wasPressed('fire')) audio.click('dry', p.chest);
        if (this.reserve > 0) this.reload();
        return;
      }
      this.fire(phys, enemies);
    }
  }

  private reload(): void {
    this.reloading = 1.3;
    this.player.actor.play('reload', { fade: 0.1 });
    audio.click('reload', this.player.chest);
  }

  private fire(phys: PhysicsWorld, enemies: Remnant[]): void {
    const p = this.player;
    this.cd = 0.24;
    this.mag--;
    const spread = 0.008 + (Math.hypot(p.vel.x, p.vel.z) > 0.5 ? 0.012 : 0);
    const dir = p.aimDir.clone().add(new THREE.Vector3((Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread)).normalize();
    const origin = p.aimOrigin.clone().addScaledVector(dir, 0.5);
    const world = phys.raycast(origin, dir, 120, (c) => !c.noShoot);
    let maxD = world ? world.dist : 120;
    let hitEnemy: Remnant | null = null;
    let mult = 1;
    for (const e of enemies) {
      const h = e.hitTest(origin, dir, maxD);
      if (h && h.dist < maxD) {
        maxD = h.dist;
        hitEnemy = e;
        mult = h.mult;
      }
    }
    const end = origin.clone().addScaledVector(dir, maxD);
    const muzzle = this.muzzleWorld();
    this.fx.muzzle(muzzle, dir, this.camRef ?? new THREE.Camera());
    this.fx.tracer(muzzle, end, this.camRef ?? new THREE.Camera());
    audio.gunshot(muzzle, 1);
    p.recoil += 1;
    p.trauma = Math.min(1, p.trauma + 0.12);
    p.noiseLevel = 30;
    if (hitEnemy) {
      const wasDead = hitEnemy.dead;
      hitEnemy.damage(34 * mult, muzzle);
      this.hitMarker = 0.15;
      audio.impact('flesh', end, mult > 1 ? 1.2 : 0.8);
      if (!wasDead && hitEnemy.dead) this.onKill?.(hitEnemy);
    } else if (world) {
      this.fx.burst('sparks', world.point, world.normal, 8);
      this.fx.burst('dust', world.point, world.normal, 3);
      this.fx.decal(world.point, world.normal);
      const surf = world.collider?.surface;
      audio.impact(surf === 'metal' ? 'metal' : surf === 'glass' ? 'glass' : surf === 'wood' ? 'wood' : 'concrete', world.point);
    }
  }

  camRef: THREE.Camera | null = null;

  /** Melee: short cone in front of the player. */
  resolveMelee(enemies: Remnant[]): boolean {
    const p = this.player;
    const f = new THREE.Vector3(Math.sin(p.yaw), 0, Math.cos(p.yaw));
    let hit = false;
    for (const e of enemies) {
      if (e.dead) continue;
      const d = e.pos.clone().sub(p.pos).setY(0);
      const dist = d.length();
      if (dist < 2.0 && d.normalize().dot(f) > 0.45) {
        const wasDead = e.dead;
        e.damage(30, p.pos, true);
        hit = true;
        if (!wasDead && e.dead) this.onKill?.(e);
      }
    }
    if (hit) {
      audio.impact('melee', p.chest);
      audio.impact('thud', p.chest, 0.8);
      p.trauma = Math.min(1, p.trauma + 0.25);
    }
    return hit;
  }
}
