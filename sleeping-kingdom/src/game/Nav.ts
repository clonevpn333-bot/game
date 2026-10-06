import * as THREE from 'three';
import { Path } from '../world/Path';
import type { Obstacle } from '../world/City';

/**
 * Walkable space = the authored corridor around the path, minus obstacle circles, between
 * story-controlled progress limits (closed gates, fog walls, collapsing streets).
 */
/** A free-roam region off the main road: a meadow, a clearing, a camp. */
export type OpenArea = { x: number; z: number; r: number; anchorS: number; floor: (x: number, z: number) => number; slope: (x: number, z: number) => number };

export class Nav {
  minS = 0;
  maxS = Infinity;
  readonly obstacles: Obstacle[] = [];
  readonly areas: OpenArea[] = [];

  constructor(readonly path: Path) {}

  /** Areas currently reachable (their anchor lies within the progress limits). */
  private activeArea(x: number, z: number, radius: number): OpenArea | null {
    let best: OpenArea | null = null;
    let bd = Infinity;
    for (const a of this.areas) {
      if (a.anchorS > this.maxS || a.anchorS < this.minS) continue;
      const d = Math.hypot(x - a.x, z - a.z) - (a.r - radius);
      if (d < bd) {
        bd = d;
        best = a;
      }
    }
    return best;
  }

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
    let inArea: OpenArea | null = null;
    if (Math.abs(near.lateral) > hw) {
      const excess = Math.abs(near.lateral) - hw;
      const sign = Math.sign(near.lateral);
      // Off the road: allowed inside an open area; otherwise take whichever wall is closer.
      const area = this.areas.length ? this.activeArea(pos.x, pos.z, radius) : null;
      let areaPush = Infinity;
      if (area) {
        const dx = pos.x - area.x;
        const dz = pos.z - area.z;
        const d = Math.hypot(dx, dz);
        areaPush = Math.max(0, d - (area.r - radius));
        // Too steep to climb: slide back toward the middle of the area.
        const sl = area.slope(pos.x, pos.z);
        if (sl > 0.85 && d > 1e-3) areaPush = Math.max(areaPush, Math.min(0.25, (sl - 0.85) * 0.5));
        if (areaPush < excess) {
          inArea = area;
          if (areaPush > 0 && d > 1e-3) {
            pos.x -= (dx / d) * areaPush;
            pos.z -= (dz / d) * areaPush;
          }
        }
      }
      if (!inArea) {
        pos.x -= s.right.x * excess * sign;
        pos.z -= s.right.z * excess * sign;
      }
    }
    // Interpolate ground height between neighbouring samples.
    const i = near.index;
    const next = this.path.samples[Math.min(this.path.samples.length - 1, i + 1)];
    const prev = this.path.samples[Math.max(0, i - 1)];
    const along = (pos.x - s.pos.x) * s.tangent.x + (pos.z - s.pos.z) * s.tangent.z;
    const other = along >= 0 ? next : prev;
    const t = Math.min(1, Math.abs(along));
    pos.y = s.pos.y + (other.pos.y - s.pos.y) * t;
    if (inArea) {
      // Blend from the road surface onto the open ground.
      const lat = Math.abs((pos.x - s.pos.x) * s.right.x + (pos.z - s.pos.z) * s.right.z);
      const k = Math.min(1, Math.max(0, (lat - s.width / 2) / 2.5));
      pos.y = pos.y + (inArea.floor(pos.x, pos.z) - pos.y) * k;
    }
    return i;
  }

  sAt(index: number): number {
    return this.path.samples[index].s;
  }
}
