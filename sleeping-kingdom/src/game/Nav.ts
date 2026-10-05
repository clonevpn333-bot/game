import * as THREE from 'three';
import { Path } from '../world/Path';
import type { Obstacle } from '../world/City';

/**
 * Walkable space = the authored corridor around the path, minus obstacle circles, between
 * story-controlled progress limits (closed gates, fog walls, collapsing streets).
 */
export class Nav {
  minS = 0;
  maxS = Infinity;
  readonly obstacles: Obstacle[] = [];

  constructor(readonly path: Path) {}

  /** Clamp position into the corridor, set its ground height, return path index. */
  resolve(pos: THREE.Vector3, radius: number, hint: number): number {
    for (const o of this.obstacles) {
      const dx = pos.x - o.x;
      const dz = pos.z - o.z;
      const d = Math.hypot(dx, dz);
      const min = o.r + radius;
      if (d < min && d > 1e-4) {
        pos.x = o.x + (dx / d) * min;
        pos.z = o.z + (dz / d) * min;
      }
    }
    let near = this.path.nearest(pos.x, pos.z, hint);
    let s = near.sample;
    // Progress limits.
    if (s.s > this.maxS || s.s < this.minS) {
      const limit = this.path.at(Math.max(this.minS, Math.min(this.maxS, s.s)));
      const dir = s.s > this.maxS ? 1 : -1;
      const along = (pos.x - limit.pos.x) * limit.tangent.x + (pos.z - limit.pos.z) * limit.tangent.z;
      if (along * dir > 0) {
        pos.x -= limit.tangent.x * along;
        pos.z -= limit.tangent.z * along;
      }
      near = this.path.nearest(pos.x, pos.z, this.path.indexAt(limit.s));
      s = near.sample;
    }
    const hw = s.width / 2 - radius;
    if (Math.abs(near.lateral) > hw) {
      const excess = Math.abs(near.lateral) - hw;
      const sign = Math.sign(near.lateral);
      pos.x -= s.right.x * excess * sign;
      pos.z -= s.right.z * excess * sign;
    }
    // Interpolate ground height between neighbouring samples.
    const i = near.index;
    const next = this.path.samples[Math.min(this.path.samples.length - 1, i + 1)];
    const prev = this.path.samples[Math.max(0, i - 1)];
    const along = (pos.x - s.pos.x) * s.tangent.x + (pos.z - s.pos.z) * s.tangent.z;
    const other = along >= 0 ? next : prev;
    const t = Math.min(1, Math.abs(along));
    pos.y = s.pos.y + (other.pos.y - s.pos.y) * t;
    return i;
  }

  sAt(index: number): number {
    return this.path.samples[index].s;
  }
}
