import * as THREE from 'three';

export interface LightSocket {
  pos: THREE.Vector3;
  color: THREE.Color;
  intensity: number;
  distance: number;
  /** 0 = steady, >0 = flicker amount */
  flicker: number;
  on: boolean;
  /** per-socket multiplier (scripted dimming) */
  dim: number;
  /** only in an echo / present */
  layer?: 'echo' | 'present';
  phase: number;
  /** emissive meshes that should flicker together with this light */
  emissives?: THREE.MeshBasicMaterial[];
  baseEmissive?: THREE.Color[];
}

/**
 * A fixed set of real point lights reassigned to the nearest light sockets.
 * Keeps shader light counts constant (no recompiles) while a level can have hundreds of lamps.
 */
export class LightPool {
  readonly lights: THREE.PointLight[] = [];
  private assigned: (LightSocket | null)[] = [];
  private fade: number[] = [];
  sockets: LightSocket[] = [];
  private timer = 0;
  echo = 0;
  /** global dimmer for power failures (0..1) */
  master = 1;

  constructor(readonly group: THREE.Group, count = 8) {
    for (let i = 0; i < count; i++) {
      const l = new THREE.PointLight(0xffffff, 0, 10, 2);
      l.castShadow = false;
      group.add(l);
      this.lights.push(l);
      this.assigned.push(null);
      this.fade.push(0);
    }
  }

  add(pos: THREE.Vector3, color: THREE.ColorRepresentation, intensity: number, distance: number, flicker = 0, layer?: 'echo' | 'present'): LightSocket {
    const s: LightSocket = {
      pos: pos.clone(), color: new THREE.Color(color), intensity, distance, flicker, on: true, dim: 1, layer,
      phase: Math.random() * 100,
    };
    this.sockets.push(s);
    return s;
  }

  clear(): void {
    this.sockets = [];
    for (let i = 0; i < this.lights.length; i++) {
      this.assigned[i] = null;
      this.fade[i] = 0;
      this.lights[i].intensity = 0;
    }
  }

  private socketValue(s: LightSocket, t: number): number {
    if (!s.on) return 0;
    let k = s.dim;
    if (s.layer === 'echo') k *= this.echo;
    else if (s.layer === 'present') k *= 1 - this.echo;
    if (s.flicker > 0) {
      const f = Math.sin(t * 13 + s.phase) * Math.sin(t * 7.3 + s.phase * 2) + Math.sin(t * 41 + s.phase);
      const off = Math.sin(t * 0.7 + s.phase) > 1 - s.flicker * 0.6 && Math.sin(t * 23 + s.phase) > 0;
      k *= off ? 0.05 : 1 - s.flicker * 0.3 * (0.5 + 0.5 * f);
    }
    return k;
  }

  update(dt: number, t: number, focus: THREE.Vector3): void {
    // flicker emissives for every socket (cheap)
    for (const s of this.sockets) {
      if (!s.emissives) continue;
      const k = this.socketValue(s, t);
      s.emissives.forEach((m, i) => m.color.copy(s.baseEmissive![i]).multiplyScalar(Math.max(0.03, k)));
    }
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = 0.2;
      const scored = this.sockets
        .filter((s) => s.on)
        .map((s) => ({ s, d: s.pos.distanceToSquared(focus) / (s.distance * s.distance * s.intensity * 0.2 + 1) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, this.lights.length)
        .map((e) => e.s);
      const want = new Set(scored);
      const free: number[] = [];
      for (let i = 0; i < this.lights.length; i++) {
        const a = this.assigned[i];
        const ud = this.lights[i].userData as { stale?: boolean };
        if (a && want.has(a)) {
          want.delete(a);
          ud.stale = false;
        } else if (a) {
          ud.stale = true;
          if (this.fade[i] < 0.05) free.push(i);
        } else {
          free.unshift(i);
        }
      }
      for (const s of want) {
        const i = free.shift();
        if (i === undefined) break;
        this.assigned[i] = s;
        this.fade[i] = 0;
        (this.lights[i].userData as { stale?: boolean }).stale = false;
      }
    }
    for (let i = 0; i < this.lights.length; i++) {
      const s = this.assigned[i];
      const l = this.lights[i];
      // never toggle visibility: a change in visible light count recompiles every material
      if (!s) {
        l.intensity = 0;
        continue;
      }
      const stale = (l.userData as { stale?: boolean }).stale;
      this.fade[i] = THREE.MathUtils.clamp(this.fade[i] + (stale ? -dt * 3 : dt * 2.5), 0, 1);
      if (stale && this.fade[i] <= 0) {
        this.assigned[i] = null;
        l.intensity = 0;
        continue;
      }
      l.position.copy(s.pos);
      l.color.copy(s.color);
      l.distance = s.distance;
      l.intensity = s.intensity * this.socketValue(s, t) * this.fade[i] * this.master;
    }
  }
}
