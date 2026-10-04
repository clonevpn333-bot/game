import * as THREE from 'three';

/** Which reality a collider exists in. 'echo' colliders are solid only while an Echo is active. */
export type Layer = 'always' | 'present' | 'echo';

export interface Collider {
  id: number;
  cx: number; cy: number; cz: number;
  hx: number; hy: number; hz: number;
  yaw: number; cos: number; sin: number;
  /** ramp: top surface rises along local +z from bottom to top */
  ramp: boolean;
  layer: Layer;
  enabled: boolean;
  ladder?: boolean;
  noVault?: boolean;
  /** surface used for footsteps */
  surface?: Surface;
  tag?: string;
  /** bullets pass through */
  noShoot?: boolean;
  /** used by movable crates */
  dynamic?: boolean;
  owner?: unknown;
}

export type Surface = 'concrete' | 'wet' | 'tile' | 'wood' | 'metal' | 'carpet' | 'dirt' | 'glass';

export interface RayHit {
  dist: number;
  point: THREE.Vector3;
  normal: THREE.Vector3;
  collider: Collider;
}

export interface MoveResult {
  grounded: boolean;
  groundY: number;
  hitWall: boolean;
  wallNormal: THREE.Vector3;
  wallCollider: Collider | null;
  ceiling: boolean;
  surface: Surface;
}

let NEXT_ID = 1;

export class PhysicsWorld {
  colliders: Collider[] = [];
  echoActive = false;
  /** base ground plane height; -Infinity for none (bottomless) */
  floorY = 0;
  floorSurface: Surface = 'wet';
  killY = -40;

  add(opts: Partial<Collider> & { cx: number; cy: number; cz: number; hx: number; hy: number; hz: number }): Collider {
    const yaw = opts.yaw ?? 0;
    const c: Collider = {
      id: NEXT_ID++,
      yaw,
      cos: Math.cos(yaw),
      sin: Math.sin(yaw),
      ramp: false,
      layer: 'always',
      enabled: true,
      ...opts,
    } as Collider;
    c.cos = Math.cos(c.yaw);
    c.sin = Math.sin(c.yaw);
    this.colliders.push(c);
    return c;
  }

  /** Box from min/max corners (axis-aligned). */
  addBox(minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number, extra: Partial<Collider> = {}): Collider {
    return this.add({
      cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, cz: (minZ + maxZ) / 2,
      hx: Math.abs(maxX - minX) / 2, hy: Math.abs(maxY - minY) / 2, hz: Math.abs(maxZ - minZ) / 2,
      ...extra,
    });
  }

  setYaw(c: Collider, yaw: number): void {
    c.yaw = yaw;
    c.cos = Math.cos(yaw);
    c.sin = Math.sin(yaw);
  }

  remove(c: Collider): void {
    const i = this.colliders.indexOf(c);
    if (i >= 0) this.colliders.splice(i, 1);
  }

  clear(): void {
    this.colliders.length = 0;
    this.floorY = 0;
    this.killY = -40;
    this.floorSurface = 'wet';
  }

  isSolid(c: Collider): boolean {
    if (!c.enabled) return false;
    if (c.layer === 'always') return true;
    return c.layer === 'echo' ? this.echoActive : !this.echoActive;
  }

  private toLocal(c: Collider, x: number, z: number): [number, number] {
    const dx = x - c.cx;
    const dz = z - c.cz;
    // rotate by -yaw
    return [dx * c.cos - dz * c.sin, dx * c.sin + dz * c.cos];
  }

  private toWorldDir(c: Collider, lx: number, lz: number): [number, number] {
    return [lx * c.cos + lz * c.sin, -lx * c.sin + lz * c.cos];
  }

  topAt(c: Collider, lz: number): number {
    if (!c.ramp) return c.cy + c.hy;
    const t = THREE.MathUtils.clamp((lz + c.hz) / (2 * c.hz), 0, 1);
    return c.cy - c.hy + t * 2 * c.hy;
  }

  /** Highest walkable surface under (x,z) at or below maxY. */
  groundAt(x: number, z: number, maxY: number, radius = 0.2): { y: number; surface: Surface; collider: Collider | null } {
    let best = this.floorY;
    let surf: Surface = this.floorSurface;
    let col: Collider | null = null;
    for (const c of this.colliders) {
      if (!this.isSolid(c) || c.ladder) continue;
      const [lx, lz] = this.toLocal(c, x, z);
      const r = c.ramp ? 0 : radius;
      if (Math.abs(lx) > c.hx + r || Math.abs(lz) > c.hz + r) continue;
      const top = this.topAt(c, lz);
      if (top <= maxY && top > best) {
        best = top;
        surf = c.surface ?? 'concrete';
        col = c;
      }
    }
    return { y: best, surface: surf, collider: col };
  }

  /**
   * Move a vertical capsule. pos is the feet position (mutated). vel is mutated (vertical zeroed on ground/ceiling).
   */
  moveCapsule(pos: THREE.Vector3, vel: THREE.Vector3, dt: number, radius: number, height: number, stepUp = 0.42, snapDown = true): MoveResult {
    const res: MoveResult = {
      grounded: false, groundY: this.floorY, hitWall: false, wallNormal: new THREE.Vector3(),
      wallCollider: null, ceiling: false, surface: this.floorSurface,
    };
    // substep horizontal motion to avoid tunnelling
    const dx = vel.x * dt;
    const dz = vel.z * dt;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / (radius * 0.5)));
    for (let s = 0; s < steps; s++) {
      pos.x += dx / steps;
      pos.z += dz / steps;
      this.resolveWalls(pos, radius, height, stepUp, res);
    }

    // vertical
    pos.y += vel.y * dt;
    const g = this.groundAt(pos.x, pos.z, pos.y + stepUp, radius * 0.6);
    if (vel.y <= 0.01 && pos.y <= g.y + (snapDown ? 0.25 : 0.02)) {
      if (pos.y < g.y || snapDown) pos.y = g.y;
      if (pos.y <= g.y + 0.001) {
        res.grounded = true;
        vel.y = Math.max(vel.y, 0);
      }
    }
    res.groundY = g.y;
    res.surface = g.surface;
    // ceiling
    if (vel.y > 0) {
      for (const c of this.colliders) {
        if (!this.isSolid(c) || c.ramp || c.ladder) continue;
        const [lx, lz] = this.toLocal(c, pos.x, pos.z);
        if (Math.abs(lx) > c.hx + radius * 0.5 || Math.abs(lz) > c.hz + radius * 0.5) continue;
        const bottom = c.cy - c.hy;
        if (pos.y + height > bottom && pos.y + height < bottom + 0.5 && pos.y < bottom) {
          pos.y = bottom - height;
          vel.y = 0;
          res.ceiling = true;
        }
      }
    }
    return res;
  }

  private resolveWalls(pos: THREE.Vector3, radius: number, height: number, stepUp: number, res: MoveResult): void {
    for (let iter = 0; iter < 2; iter++) {
      for (const c of this.colliders) {
        if (!this.isSolid(c) || c.ramp) continue;
        const top = c.cy + c.hy;
        const bottom = c.cy - c.hy;
        if (top <= pos.y + stepUp || bottom >= pos.y + height) continue;
        if (c.ladder) continue;
        const [lx, lz] = this.toLocal(c, pos.x, pos.z);
        const qx = THREE.MathUtils.clamp(lx, -c.hx, c.hx);
        const qz = THREE.MathUtils.clamp(lz, -c.hz, c.hz);
        let nx = lx - qx;
        let nz = lz - qz;
        const d2 = nx * nx + nz * nz;
        if (d2 > radius * radius) continue;
        let push: number;
        if (d2 < 1e-8) {
          // centre inside box: push along smallest penetration
          const px = c.hx - Math.abs(lx);
          const pz = c.hz - Math.abs(lz);
          if (px < pz) {
            nx = Math.sign(lx) || 1;
            nz = 0;
            push = px + radius;
          } else {
            nx = 0;
            nz = Math.sign(lz) || 1;
            push = pz + radius;
          }
        } else {
          const d = Math.sqrt(d2);
          nx /= d;
          nz /= d;
          push = radius - d;
        }
        const [wx, wz] = this.toWorldDir(c, nx, nz);
        pos.x += wx * push;
        pos.z += wz * push;
        res.hitWall = true;
        res.wallNormal.set(wx, 0, wz);
        res.wallCollider = c;
      }
    }
  }

  /** Does a capsule at pos overlap anything solid (used for stand-up checks / spawn). */
  overlaps(pos: THREE.Vector3, radius: number, height: number, minY = 0.05): boolean {
    for (const c of this.colliders) {
      if (!this.isSolid(c) || c.ramp || c.ladder) continue;
      if (c.cy + c.hy <= pos.y + minY || c.cy - c.hy >= pos.y + height) continue;
      const [lx, lz] = this.toLocal(c, pos.x, pos.z);
      const qx = THREE.MathUtils.clamp(lx, -c.hx, c.hx);
      const qz = THREE.MathUtils.clamp(lz, -c.hz, c.hz);
      if ((lx - qx) ** 2 + (lz - qz) ** 2 < radius * radius) return true;
    }
    return false;
  }

  /** Ray vs all colliders (yaw OBBs). */
  raycast(origin: THREE.Vector3, dir: THREE.Vector3, maxDist: number, filter?: (c: Collider) => boolean): RayHit | null {
    let best: RayHit | null = null;
    let bestT = maxDist;
    for (const c of this.colliders) {
      if (!this.isSolid(c) || c.ladder) continue;
      if (filter && !filter(c)) continue;
      // local ray
      const ox = origin.x - c.cx;
      const oz = origin.z - c.cz;
      const lox = ox * c.cos - oz * c.sin;
      const loz = ox * c.sin + oz * c.cos;
      const loy = origin.y - c.cy;
      const ldx = dir.x * c.cos - dir.z * c.sin;
      const ldz = dir.x * c.sin + dir.z * c.cos;
      const ldy = dir.y;
      let tmin = 0;
      let tmax = bestT;
      let axis = -1;
      let sign = 1;
      const o = [lox, loy, loz];
      const d = [ldx, ldy, ldz];
      const h = [c.hx, c.hy, c.hz];
      let ok = true;
      for (let i = 0; i < 3; i++) {
        if (Math.abs(d[i]) < 1e-9) {
          if (o[i] < -h[i] || o[i] > h[i]) {
            ok = false;
            break;
          }
        } else {
          let t1 = (-h[i] - o[i]) / d[i];
          let t2 = (h[i] - o[i]) / d[i];
          let s = -1;
          if (t1 > t2) {
            const tt = t1;
            t1 = t2;
            t2 = tt;
            s = 1;
          }
          if (t1 > tmin) {
            tmin = t1;
            axis = i;
            sign = s;
          }
          if (t2 < tmax) tmax = t2;
          if (tmin > tmax) {
            ok = false;
            break;
          }
        }
      }
      if (!ok || axis < 0) continue;
      if (tmin < bestT) {
        bestT = tmin;
        const ln = [0, 0, 0];
        ln[axis] = sign;
        const [wx, wz] = this.toWorldDir(c, ln[0], ln[2]);
        best = {
          dist: tmin,
          point: origin.clone().addScaledVector(dir, tmin),
          normal: new THREE.Vector3(wx, ln[1], wz),
          collider: c,
        };
      }
    }
    // floor plane
    if (dir.y < -1e-6 && Number.isFinite(this.floorY)) {
      const t = (this.floorY - origin.y) / dir.y;
      if (t > 0 && t < bestT) {
        best = {
          dist: t,
          point: origin.clone().addScaledVector(dir, t),
          normal: new THREE.Vector3(0, 1, 0),
          collider: null as unknown as Collider,
        };
      }
    }
    return best;
  }

  /** Clear line of sight between points. */
  lineOfSight(a: THREE.Vector3, b: THREE.Vector3): boolean {
    const dir = b.clone().sub(a);
    const d = dir.length();
    if (d < 1e-4) return true;
    dir.divideScalar(d);
    const hit = this.raycast(a, dir, d - 0.05, (c) => !c.noShoot);
    return !hit;
  }

  /** Find a vaultable / mantleable ledge in front of a capsule. */
  probeLedge(pos: THREE.Vector3, fx: number, fz: number, radius: number): { top: number; depth: number; collider: Collider; ladder: boolean } | null {
    const px = pos.x + fx * (radius + 0.35);
    const pz = pos.z + fz * (radius + 0.35);
    let best: { top: number; depth: number; collider: Collider; ladder: boolean } | null = null;
    for (const c of this.colliders) {
      if (!this.isSolid(c) || c.ramp) continue;
      const [lx, lz] = this.toLocal(c, px, pz);
      if (Math.abs(lx) > c.hx + 0.05 || Math.abs(lz) > c.hz + 0.05) continue;
      const top = c.cy + c.hy;
      const bottom = c.cy - c.hy;
      if (top < pos.y + 0.3 || bottom > pos.y + 1.0) continue;
      if (c.ladder) return { top, depth: 0, collider: c, ladder: true };
      if (c.noVault) continue;
      // depth of the obstacle along the facing direction
      const [ldx, ldz] = [fx * c.cos - fz * c.sin, fx * c.sin + fz * c.cos];
      const depth = Math.abs(ldx) * c.hx * 2 + Math.abs(ldz) * c.hz * 2;
      if (!best || top > best.top) best = { top, depth, collider: c, ladder: false };
    }
    return best;
  }
}
