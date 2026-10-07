import * as THREE from 'three';

export type Surface = 'cloud' | 'wood' | 'tile' | 'carpet' | 'metal' | 'water' | 'stone' | 'soft';

export interface Collider {
  min: THREE.Vector3;
  max: THREE.Vector3;
  /** Ramps rise from min.y to max.y along `axis` in direction `dir`. */
  ramp?: { axis: 'x' | 'z'; dir: 1 | -1 };
  climbable: boolean;
  surface: Surface;
  enabled: boolean;
  /** Per-frame displacement for moving platforms (written by whoever moves it). */
  delta?: THREE.Vector3;
  noCamera?: boolean;
  tag?: string;
}

export interface WaterVolume {
  min: THREE.Vector3;
  max: THREE.Vector3;
  /** Surface height can be animated (tide). */
  level: number;
  deep: boolean;
  enabled: boolean;
}

export class Body {
  readonly pos = new THREE.Vector3();
  readonly vel = new THREE.Vector3();
  radius = 0.32;
  height = 1.5;
  stepHeight = 0.42;
  gravity = 24;
  grounded = false;
  ground: Collider | null = null;
  groundY = -Infinity;
  inWater = false;
  waterDepth = 0;
  /** True on the frame the body lands. */
  landed = false;
  landSpeed = 0;
  hitWall = false;
  readonly wallNormal = new THREE.Vector3();
  ghost = false;
}

const tmpC = new THREE.Vector3();

export class PhysicsWorld {
  colliders: Collider[] = [];
  water: WaterVolume[] = [];

  clear(): void {
    this.colliders = [];
    this.water = [];
  }

  add(c: Partial<Collider> & { min: THREE.Vector3; max: THREE.Vector3 }): Collider {
    const col: Collider = {
      climbable: true,
      surface: 'stone',
      enabled: true,
      ...c,
    };
    this.colliders.push(col);
    return col;
  }

  addBox(cx: number, cy: number, cz: number, w: number, h: number, d: number, opts: Partial<Collider> = {}): Collider {
    return this.add({
      ...opts,
      min: new THREE.Vector3(cx - w / 2, cy - h / 2, cz - d / 2),
      max: new THREE.Vector3(cx + w / 2, cy + h / 2, cz + d / 2),
    });
  }

  addWater(min: THREE.Vector3, max: THREE.Vector3, deep: boolean): WaterVolume {
    const w: WaterVolume = { min, max, level: max.y, deep, enabled: true };
    this.water.push(w);
    return w;
  }

  /** Height of the walkable top of a collider at (x,z) (clamped into its footprint). */
  topAt(c: Collider, x: number, z: number): number {
    if (!c.ramp) return c.max.y;
    const { axis, dir } = c.ramp;
    const lo = axis === 'x' ? c.min.x : c.min.z;
    const hi = axis === 'x' ? c.max.x : c.max.z;
    const v = THREE.MathUtils.clamp(axis === 'x' ? x : z, lo, hi);
    let t = (v - lo) / (hi - lo);
    if (dir < 0) t = 1 - t;
    return c.min.y + t * (c.max.y - c.min.y);
  }

  private overlapXZ(c: Collider, x: number, z: number, r: number): boolean {
    const cx = THREE.MathUtils.clamp(x, c.min.x, c.max.x);
    const cz = THREE.MathUtils.clamp(z, c.min.z, c.max.z);
    const dx = x - cx;
    const dz = z - cz;
    return dx * dx + dz * dz < r * r;
  }

  step(body: Body, dt: number): void {
    body.landed = false;
    body.hitWall = false;
    if (body.ghost) {
      body.pos.addScaledVector(body.vel, dt);
      return;
    }
    // Carry with moving platform.
    if (body.grounded && body.ground?.delta) body.pos.add(body.ground.delta);

    const speed = Math.hypot(body.vel.x, body.vel.z, body.vel.y);
    const steps = Math.min(6, Math.max(1, Math.ceil((speed * dt) / (body.radius * 0.6))));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) this.substep(body, h);
    this.updateWater(body);
  }

  private substep(body: Body, dt: number): void {
    const wasGrounded = body.grounded;
    body.pos.x += body.vel.x * dt;
    body.pos.z += body.vel.z * dt;
    this.resolveXZ(body);

    body.vel.y -= body.gravity * dt;
    if (body.inWater && body.waterDepth > 0.4) body.vel.y = Math.max(body.vel.y, -6);
    const oldY = body.pos.y;
    body.pos.y += body.vel.y * dt;

    // Ceiling
    if (body.vel.y > 0) {
      for (const c of this.colliders) {
        if (!c.enabled || c.ramp) continue;
        if (!this.overlapXZ(c, body.pos.x, body.pos.z, body.radius * 0.8)) continue;
        if (c.min.y >= oldY + body.height - 0.06 && c.min.y < body.pos.y + body.height) {
          body.pos.y = c.min.y - body.height;
          body.vel.y = 0;
        }
      }
    }

    // Ground
    const allowance = wasGrounded ? body.stepHeight : Math.max(0.08, oldY - body.pos.y + 0.08);
    let best = -Infinity;
    let bestC: Collider | null = null;
    for (const c of this.colliders) {
      if (!c.enabled) continue;
      if (!this.overlapXZ(c, body.pos.x, body.pos.z, body.radius * 0.72)) continue;
      const top = this.topAt(c, body.pos.x, body.pos.z);
      if (top <= body.pos.y + allowance && top > best) {
        best = top;
        bestC = c;
      }
    }
    body.groundY = best;
    const snap = wasGrounded && body.vel.y <= 0 ? 0.35 : 0;
    if (bestC && body.vel.y <= 0 && body.pos.y <= best + snap) {
      if (!wasGrounded) {
        body.landed = true;
        body.landSpeed = -body.vel.y;
      }
      body.pos.y = best;
      body.vel.y = 0;
      body.grounded = true;
      body.ground = bestC;
    } else {
      body.grounded = false;
      body.ground = null;
    }
  }

  private resolveXZ(body: Body): void {
    const feet = body.pos.y;
    const head = body.pos.y + body.height;
    const r = body.radius;
    for (let iter = 0; iter < 2; iter++) {
      for (const c of this.colliders) {
        if (!c.enabled) continue;
        if (c.max.y <= feet + 0.001 || c.min.y >= head) continue;
        const top = this.topAt(c, body.pos.x, body.pos.z);
        if (top <= feet + body.stepHeight && (body.grounded || top <= feet + 0.12)) continue;
        if (c.ramp && top <= feet + body.stepHeight) continue;
        const cx = THREE.MathUtils.clamp(body.pos.x, c.min.x, c.max.x);
        const cz = THREE.MathUtils.clamp(body.pos.z, c.min.z, c.max.z);
        let dx = body.pos.x - cx;
        let dz = body.pos.z - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 >= r * r) continue;
        if (d2 > 1e-8) {
          const d = Math.sqrt(d2);
          dx /= d;
          dz /= d;
          const push = r - d;
          body.pos.x += dx * push;
          body.pos.z += dz * push;
          this.killVel(body, dx, dz);
        } else {
          // Center inside the box: push out along the smallest axis.
          const px1 = c.max.x - body.pos.x + r, px0 = body.pos.x - c.min.x + r;
          const pz1 = c.max.z - body.pos.z + r, pz0 = body.pos.z - c.min.z + r;
          const m = Math.min(px1, px0, pz1, pz0);
          if (m === px1) { body.pos.x += px1; dx = 1; dz = 0; }
          else if (m === px0) { body.pos.x -= px0; dx = -1; dz = 0; }
          else if (m === pz1) { body.pos.z += pz1; dx = 0; dz = 1; }
          else { body.pos.z -= pz0; dx = 0; dz = -1; }
          this.killVel(body, dx, dz);
        }
      }
    }
  }

  private killVel(body: Body, nx: number, nz: number): void {
    const vn = body.vel.x * nx + body.vel.z * nz;
    if (vn < 0) {
      body.vel.x -= vn * nx;
      body.vel.z -= vn * nz;
    }
    body.hitWall = true;
    body.wallNormal.set(nx, 0, nz);
  }

  private updateWater(body: Body): void {
    body.inWater = false;
    body.waterDepth = 0;
    for (const w of this.water) {
      if (!w.enabled) continue;
      if (body.pos.x < w.min.x || body.pos.x > w.max.x || body.pos.z < w.min.z || body.pos.z > w.max.z) continue;
      if (body.pos.y > w.level || body.pos.y < w.min.y - 2) continue;
      body.inWater = true;
      body.waterDepth = w.level - body.pos.y;
    }
  }

  /** Is a vertical column at (x,z) between y0 and y1 free of colliders? */
  spaceFree(x: number, z: number, y0: number, y1: number, r: number): boolean {
    for (const c of this.colliders) {
      if (!c.enabled) continue;
      if (c.max.y <= y0 + 0.02 || c.min.y >= y1) continue;
      if (this.topAt(c, x, z) <= y0 + 0.02) continue;
      if (this.overlapXZ(c, x, z, r)) return false;
    }
    return true;
  }

  /** Highest walkable top under (x,z) at or below y. */
  groundBelow(x: number, z: number, y: number, r = 0.2): number {
    let best = -Infinity;
    for (const c of this.colliders) {
      if (!c.enabled) continue;
      if (!this.overlapXZ(c, x, z, r)) continue;
      const t = this.topAt(c, x, z);
      if (t <= y + 0.05 && t > best) best = t;
    }
    return best;
  }

  /** Ledge in front of the body that can be mantled. */
  findLedge(body: Body, fwd: THREE.Vector3, minRise: number, maxRise: number): { top: number; x: number; z: number; c: Collider } | null {
    const feet = body.pos.y;
    for (const dist of [body.radius + 0.25, body.radius + 0.55]) {
      const px = body.pos.x + fwd.x * dist;
      const pz = body.pos.z + fwd.z * dist;
      let best: { top: number; c: Collider } | null = null;
      for (const c of this.colliders) {
        if (!c.enabled || !c.climbable || c.ramp) continue;
        if (px < c.min.x - 0.05 || px > c.max.x + 0.05 || pz < c.min.z - 0.05 || pz > c.max.z + 0.05) continue;
        const top = c.max.y;
        const rise = top - feet;
        if (rise < minRise || rise > maxRise) continue;
        if (!best || top > best.top) best = { top, c };
      }
      if (best) {
        const lx = body.pos.x + fwd.x * (body.radius + 0.75);
        const lz = body.pos.z + fwd.z * (body.radius + 0.75);
        if (this.spaceFree(lx, lz, best.top, best.top + body.height * 0.9, body.radius * 0.8) &&
            this.spaceFree(body.pos.x, body.pos.z, feet + 0.4, best.top + 0.6, body.radius * 0.5)) {
          const gy = this.groundBelow(lx, lz, best.top + 0.05, 0.1);
          if (gy > best.top - 0.3) return { top: best.top, x: lx, z: lz, c: best.c };
        }
      }
    }
    return null;
  }

  /** Low obstacle in front that can be vaulted over; returns landing point. */
  findVault(body: Body, fwd: THREE.Vector3): { top: number; land: THREE.Vector3 } | null {
    const feet = body.pos.y;
    const px = body.pos.x + fwd.x * (body.radius + 0.3);
    const pz = body.pos.z + fwd.z * (body.radius + 0.3);
    for (const c of this.colliders) {
      if (!c.enabled || c.ramp) continue;
      if (px < c.min.x || px > c.max.x || pz < c.min.z || pz > c.max.z) continue;
      const rise = c.max.y - feet;
      if (rise < 0.35 || rise > 1.25) continue;
      // depth along fwd
      for (let d = 0.6; d <= 2.2; d += 0.2) {
        const lx = body.pos.x + fwd.x * (body.radius + 0.3 + d);
        const lz = body.pos.z + fwd.z * (body.radius + 0.3 + d);
        const inside = lx >= c.min.x && lx <= c.max.x && lz >= c.min.z && lz <= c.max.z;
        if (inside) continue;
        if (!this.spaceFree(lx, lz, feet + 0.05, feet + body.height, body.radius)) return null;
        const gy = this.groundBelow(lx, lz, feet + 0.3, 0.15);
        if (gy < feet - 3) return null;
        if (!this.spaceFree((px + lx) / 2, (pz + lz) / 2, c.max.y + 0.02, c.max.y + 1.0, 0.2)) return null;
        tmpC.set(lx, Math.max(gy, feet - 3), lz);
        return { top: c.max.y, land: tmpC.clone() };
      }
    }
    return null;
  }

  /** Ray vs colliders; returns hit distance or Infinity. */
  raycast(origin: THREE.Vector3, dir: THREE.Vector3, maxDist: number, forCamera = false): number {
    let best = maxDist;
    const ix = 1 / (dir.x || 1e-9), iy = 1 / (dir.y || 1e-9), iz = 1 / (dir.z || 1e-9);
    for (const c of this.colliders) {
      if (!c.enabled || (forCamera && c.noCamera)) continue;
      let t1 = (c.min.x - origin.x) * ix, t2 = (c.max.x - origin.x) * ix;
      let tmin = Math.min(t1, t2), tmax = Math.max(t1, t2);
      t1 = (c.min.y - origin.y) * iy; t2 = (c.max.y - origin.y) * iy;
      tmin = Math.max(tmin, Math.min(t1, t2)); tmax = Math.min(tmax, Math.max(t1, t2));
      t1 = (c.min.z - origin.z) * iz; t2 = (c.max.z - origin.z) * iz;
      tmin = Math.max(tmin, Math.min(t1, t2)); tmax = Math.min(tmax, Math.max(t1, t2));
      if (tmax >= Math.max(tmin, 0) && tmin < best && tmin > 0) best = tmin;
    }
    return best;
  }

  /** Line of sight between two points (true if clear). */
  lineOfSight(a: THREE.Vector3, b: THREE.Vector3): boolean {
    const dir = tmpC.subVectors(b, a);
    const len = dir.length();
    if (len < 1e-4) return true;
    dir.divideScalar(len);
    return this.raycast(a, dir.clone(), len, true) >= len - 0.05;
  }
}
