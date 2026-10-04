import * as THREE from 'three';
import type { Player } from './Player';
import type { Machine } from './Machine';
import type { PhysicsWorld } from '../core/Physics';
import type { Effects } from '../render/Effects';
import type { Input } from '../core/Input';
import { audio } from '../audio/AudioEngine';
import { damp } from '../render/Globals';

/** First-person pistol and baton. */
export class Combat {
  mag = 12;
  readonly magSize = 12;
  reserve = 36;
  private cd = 0;
  private reloading = 0;
  private meleeCd = 0;
  private meleePending = -1;
  hitMarker = 0;
  kills = 0;
  onShot: (() => void) | null = null;
  /** extra shootable things (a giant's knee actuators) supplied by the level */
  extraTargets: (() => { hitTest: (o: THREE.Vector3, d: THREE.Vector3, max: number) => { dist: number; head: boolean; point: THREE.Vector3 } | null; damage: (n: number) => void }[]) | null = null;

  constructor(private player: Player, private fx: Effects, private camera: THREE.Camera) {}

  get canShoot(): boolean {
    return this.player.weapon === 'pistol';
  }

  update(dt: number, input: Input, phys: PhysicsWorld, machines: Machine[], ctl: boolean): void {
    const p = this.player;
    this.cd = Math.max(0, this.cd - dt);
    this.meleeCd = Math.max(0, this.meleeCd - dt);
    this.hitMarker = Math.max(0, this.hitMarker - dt);
    const aiming = ctl && this.canShoot && input.isDown('aim') && this.reloading <= 0;
    p.ads = damp(p.ads, aiming ? 1 : 0, 14, dt);
    if (this.reloading > 0) {
      this.reloading -= dt;
      if (this.reloading <= 0) {
        const take = Math.min(this.magSize - this.mag, this.reserve);
        this.mag += take;
        this.reserve -= take;
        audio.click('slide');
      }
    }
    if (this.meleePending >= 0) {
      this.meleePending -= dt;
      if (this.meleePending < 0) this.resolveMelee(machines);
    }
    if (!ctl || p.state === 'dead') return;
    // baton / quick melee (V), or left click while holding the baton
    if ((input.wasPressed('melee') || (p.weapon === 'baton' && input.wasPressed('fire'))) && this.meleeCd <= 0) {
      this.meleeCd = 0.6;
      p.swing();
      audio.whoosh(p.chest, 0.3);
      this.meleePending = 0.16;
      return;
    }
    if (!this.canShoot) return;
    if (input.wasPressed('reload') && this.mag < this.magSize && this.reserve > 0 && this.reloading <= 0) this.reload();
    if (input.wasPressed('fire') && this.cd <= 0 && this.reloading <= 0) {
      if (this.mag <= 0) {
        audio.click('dry');
        if (this.reserve > 0) this.reload();
        return;
      }
      this.fire(phys, machines);
    }
  }

  reload(): void {
    this.reloading = 1.3;
    audio.click('reload');
  }

  private fire(phys: PhysicsWorld, machines: Machine[]): void {
    const p = this.player;
    this.cd = 0.17;
    this.mag--;
    const origin = p.camPos.clone();
    const dir = p.aimDir.clone();
    // a little spread when hip-firing or moving
    const spread = (1 - p.ads) * 0.025 + Math.min(1, p.speed / 5) * 0.015;
    dir.x += (Math.random() - 0.5) * spread;
    dir.y += (Math.random() - 0.5) * spread;
    dir.z += (Math.random() - 0.5) * spread;
    dir.normalize();
    const muzzle = origin.clone().add(new THREE.Vector3(0.12 * (1 - p.ads), -0.1, 0).applyQuaternion(this.camera.quaternion)).addScaledVector(dir, 0.45);
    this.fx.muzzle(muzzle, dir, this.camera);
    audio.gunshot(undefined, 0.9);
    p.kick(0.55);
    p.trauma = Math.min(1, p.trauma + 0.06);
    this.onShot?.();
    const world = phys.raycast(origin, dir, 120, (c) => !c.noShoot);
    let bestM: Machine | null = null;
    let best: { dist: number; head: boolean; point: THREE.Vector3 } | null = null;
    for (const m of machines) {
      const h = m.hitTest(origin, dir, world ? world.dist : 120);
      if (h && (!best || h.dist < best.dist)) {
        best = h;
        bestM = m;
      }
    }
    let extraHit: { damage: (n: number) => void } | null = null;
    for (const t of this.extraTargets?.() ?? []) {
      const h = t.hitTest(origin, dir, world ? world.dist : 120);
      if (h && (!best || h.dist < best.dist)) {
        best = h;
        bestM = null;
        extraHit = t;
      }
    }
    if (extraHit && best) {
      extraHit.damage(30);
      this.fx.tracer(muzzle, best.point, this.camera);
      this.hitMarker = 0.2;
      audio.impact('metal', best.point, 1);
    } else if (bestM && best) {
      const dmg = best.head ? (bestM.kind === 'maintenance' ? 70 : 60) : bestM.kind === 'maintenance' ? 22 : 30;
      const was = bestM.dead;
      bestM.damage(dmg, origin, this.fx);
      this.fx.tracer(muzzle, best.point, this.camera);
      this.hitMarker = best.head ? 0.25 : 0.15;
      audio.impact('metal', best.point, best.head ? 1.1 : 0.7);
      if (!was && bestM.dead) this.kills++;
    } else if (world) {
      this.fx.tracer(muzzle, world.point, this.camera);
      this.fx.burst('sparks', world.point, world.normal, 6);
      this.fx.burst('dust', world.point, world.normal, 4);
      this.fx.decal(world.point, world.normal);
      audio.impact('concrete', world.point, 0.5);
    } else this.fx.tracer(muzzle, origin.clone().addScaledVector(dir, 60), this.camera);
  }

  private resolveMelee(machines: Machine[]): void {
    const p = this.player;
    const fwd = p.aimDir.clone().setY(0).normalize();
    let hit = false;
    for (const m of machines) {
      if (m.dead) continue;
      const to = m.chest.clone().sub(p.camPos);
      const d = to.length();
      if (d > (p.weapon === 'baton' ? 2.4 : 1.9)) continue;
      if (to.setY(0).normalize().dot(fwd) < 0.55) continue;
      m.damage(p.weapon === 'baton' ? 48 : 26, p.camPos, this.fx);
      m.pos.addScaledVector(fwd, m.kind === 'maintenance' ? 0.1 : 0.6);
      hit = true;
    }
    if (hit) {
      audio.impact('melee', p.chest, 1.2);
      audio.impact('metal', p.chest, 0.8);
      p.trauma = Math.min(1, p.trauma + 0.2);
      this.hitMarker = 0.15;
    }
  }
}
