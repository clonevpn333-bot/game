import * as THREE from 'three';

/**
 * Signed-distance sculpting. Shapes are built from smooth-blended primitives
 * (spheres, ellipsoids, round cones, rounded boxes, tori), then meshed with
 * Surface Nets into one continuous organic surface. Each primitive carries a
 * material slot and a bone, so the same pass yields vertex colours, per-vertex
 * surface properties and automatic skin weights.
 */

const SPHERE = 0;
const ELLIPSOID = 1;
const CONE = 2; // round cone / capsule
const BOX = 3;
const TORUS = 4;

export interface PrimOpts {
  /** smooth blend radius with what came before (metres) */
  k?: number;
  /** subtract instead of add */
  sub?: boolean;
  mat?: number;
  bone?: string;
  /** second bone; weight blends bone→bone2 along a cone's length */
  bone2?: string;
  /** euler rotation (radians) for ellipsoid / box / torus */
  rot?: [number, number, number];
  /** tie-break for material ownership (cloth over skin, trim over cloth) */
  priority?: number;
}

interface Prim {
  t: number;
  a: [number, number, number];
  b: [number, number, number];
  r1: number;
  r2: number;
  e: [number, number, number];
  round: number;
  inv: number[] | null; // world → local 3x3 (row major)
  k: number;
  sub: boolean;
  mat: number;
  bone: string;
  bone2: string | null;
  priority: number;
  min: [number, number, number];
  max: [number, number, number];
  // round-cone precompute
  ba: [number, number, number];
  l2: number;
  rr: number;
  a2: number;
  il2: number;
}

export interface Material {
  color: THREE.ColorRepresentation;
  rough?: number;
  metal?: number;
  /** subsurface warmth for skin */
  sss?: number;
  /** emissive strength (0 = none) */
  glow?: number;
  /** marks cloth that crowd instances may recolour */
  tint?: number;
}

export interface SculptMesh {
  geometry: THREE.BufferGeometry;
  /** world-space bounds of the surface */
  box: THREE.Box3;
}

function smin(a: number, b: number, k: number): number {
  if (k <= 0) return Math.min(a, b);
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}
function smax(a: number, b: number, k: number): number {
  return -smin(-a, -b, k);
}

function rotInverse(rx: number, ry: number, rz: number): number[] {
  const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz));
  const e = m.elements; // column-major; transpose = inverse for rotations
  return [e[0], e[1], e[2], e[4], e[5], e[6], e[8], e[9], e[10]];
}

export class Sculpt {
  readonly prims: Prim[] = [];
  readonly materials: Material[];
  /** extra hand-built skinned geometry (cloth) merged after meshing */
  readonly extras: ((bones: Map<string, number>) => THREE.BufferGeometry)[] = [];

  constructor(materials: Material[]) {
    this.materials = materials;
  }

  private push(p: Partial<Prim> & { t: number }, o: PrimOpts, pad: [number, number, number, number, number, number]): this {
    const k = o.k ?? 0.02;
    const prim: Prim = {
      t: p.t,
      a: p.a ?? [0, 0, 0],
      b: p.b ?? [0, 0, 0],
      r1: p.r1 ?? 0,
      r2: p.r2 ?? 0,
      e: p.e ?? [0, 0, 0],
      round: p.round ?? 0,
      inv: o.rot ? rotInverse(o.rot[0], o.rot[1], o.rot[2]) : null,
      k,
      sub: !!o.sub,
      mat: o.mat ?? 0,
      bone: o.bone ?? 'root',
      bone2: o.bone2 ?? null,
      priority: o.priority ?? 0,
      min: [pad[0] - k, pad[1] - k, pad[2] - k],
      max: [pad[3] + k, pad[4] + k, pad[5] + k],
      ba: [0, 0, 0],
      l2: 1,
      rr: 0,
      a2: 1,
      il2: 1,
    };
    if (prim.t === CONE) {
      const ba: [number, number, number] = [prim.b[0] - prim.a[0], prim.b[1] - prim.a[1], prim.b[2] - prim.a[2]];
      prim.ba = ba;
      prim.l2 = Math.max(1e-8, ba[0] * ba[0] + ba[1] * ba[1] + ba[2] * ba[2]);
      prim.rr = prim.r1 - prim.r2;
      prim.a2 = prim.l2 - prim.rr * prim.rr;
      prim.il2 = 1 / prim.l2;
    }
    this.prims.push(prim);
    return this;
  }

  sphere(c: [number, number, number], r: number, o: PrimOpts = {}): this {
    return this.push({ t: SPHERE, a: c, r1: r }, o, [c[0] - r, c[1] - r, c[2] - r, c[0] + r, c[1] + r, c[2] + r]);
  }

  ellipsoid(c: [number, number, number], radii: [number, number, number], o: PrimOpts = {}): this {
    const m = Math.max(...radii);
    return this.push({ t: ELLIPSOID, a: c, e: radii }, o, [c[0] - m, c[1] - m, c[2] - m, c[0] + m, c[1] + m, c[2] + m]);
  }

  /** Round cone from a (radius r1) to b (radius r2); r1 === r2 gives a capsule. */
  cone(a: [number, number, number], b: [number, number, number], r1: number, r2 = r1, o: PrimOpts = {}): this {
    const m = Math.max(r1, r2);
    return this.push({ t: CONE, a, b, r1, r2 }, o, [Math.min(a[0], b[0]) - m, Math.min(a[1], b[1]) - m, Math.min(a[2], b[2]) - m, Math.max(a[0], b[0]) + m, Math.max(a[1], b[1]) + m, Math.max(a[2], b[2]) + m]);
  }

  box(c: [number, number, number], half: [number, number, number], round: number, o: PrimOpts = {}): this {
    const m = Math.hypot(...half) + round;
    return this.push({ t: BOX, a: c, e: half, round }, o, [c[0] - m, c[1] - m, c[2] - m, c[0] + m, c[1] + m, c[2] + m]);
  }

  /** Torus in its local XZ plane (use rot to orient). */
  torus(c: [number, number, number], R: number, r: number, o: PrimOpts = {}): this {
    const m = R + r;
    return this.push({ t: TORUS, a: c, r1: R, r2: r }, o, [c[0] - m, c[1] - m, c[2] - m, c[0] + m, c[1] + m, c[2] + m]);
  }

  /** Mirror every primitive whose name/bone ends with .L into .R across x = 0. */
  mirror(fromIndex = 0): this {
    const n = this.prims.length;
    for (let i = fromIndex; i < n; i++) {
      const p = this.prims[i];
      if (!p.bone.endsWith('.L') && !(p.bone2 ?? '').endsWith('.L')) continue;
      const q: Prim = JSON.parse(JSON.stringify(p));
      q.a[0] = -q.a[0];
      q.b[0] = -q.b[0];
      q.ba[0] = -q.ba[0];
      const mn = q.min[0];
      q.min[0] = -q.max[0];
      q.max[0] = -mn;
      q.bone = p.bone.replace(/\.L$/, '.R');
      q.bone2 = p.bone2 ? p.bone2.replace(/\.L$/, '.R') : null;
      if (q.inv) {
        // mirror the rotation: M' = S M S with S = diag(-1,1,1)
        const m = q.inv;
        q.inv = [m[0], -m[1], -m[2], -m[3], m[4], m[5], -m[6], m[7], m[8]];
      }
      this.prims.push(q);
    }
    return this;
  }

  // ------------------------------------------------------------------ evaluation
  private primDist(p: Prim, x: number, y: number, z: number): number {
    let px = x - p.a[0];
    let py = y - p.a[1];
    let pz = z - p.a[2];
    if (p.inv && p.t !== CONE) {
      const m = p.inv;
      const lx = m[0] * px + m[1] * py + m[2] * pz;
      const ly = m[3] * px + m[4] * py + m[5] * pz;
      const lz = m[6] * px + m[7] * py + m[8] * pz;
      px = lx;
      py = ly;
      pz = lz;
    }
    switch (p.t) {
      case SPHERE:
        return Math.sqrt(px * px + py * py + pz * pz) - p.r1;
      case ELLIPSOID: {
        const ex = p.e[0];
        const ey = p.e[1];
        const ez = p.e[2];
        const k0 = Math.sqrt((px / ex) ** 2 + (py / ey) ** 2 + (pz / ez) ** 2);
        const k1 = Math.sqrt((px / (ex * ex)) ** 2 + (py / (ey * ey)) ** 2 + (pz / (ez * ez)) ** 2);
        return k1 < 1e-9 ? -Math.min(ex, ey, ez) : (k0 * (k0 - 1)) / k1;
      }
      case CONE: {
        const ba = p.ba;
        const l2 = p.l2;
        const yy = px * ba[0] + py * ba[1] + pz * ba[2];
        const zz = yy - l2;
        const qx = px * l2 - ba[0] * yy;
        const qy = py * l2 - ba[1] * yy;
        const qz = pz * l2 - ba[2] * yy;
        const x2 = qx * qx + qy * qy + qz * qz;
        const y2 = yy * yy * l2;
        const z2 = zz * zz * l2;
        const k = Math.sign(p.rr) * p.rr * p.rr * x2;
        if (Math.sign(zz) * p.a2 * z2 > k) return Math.sqrt(x2 + z2) * p.il2 - p.r2;
        if (Math.sign(yy) * p.a2 * y2 < k) return Math.sqrt(x2 + y2) * p.il2 - p.r1;
        return (Math.sqrt(Math.max(0, x2 * p.a2 * p.il2)) + yy * p.rr) * p.il2 - p.r1;
      }
      case BOX: {
        const qx = Math.abs(px) - p.e[0] + p.round;
        const qy = Math.abs(py) - p.e[1] + p.round;
        const qz = Math.abs(pz) - p.e[2] + p.round;
        const ox = Math.max(qx, 0);
        const oy = Math.max(qy, 0);
        const oz = Math.max(qz, 0);
        return Math.sqrt(ox * ox + oy * oy + oz * oz) + Math.min(Math.max(qx, Math.max(qy, qz)), 0) - p.round;
      }
      case TORUS: {
        const q = Math.sqrt(px * px + pz * pz) - p.r1;
        return Math.sqrt(q * q + py * py) - p.r2;
      }
    }
    return 1e9;
  }

  /** Full field value at a point (smooth CSG, with AABB culling). */
  field(x: number, y: number, z: number): number {
    let d = 1e9;
    for (const p of this.prims) {
      // cheap lower bound from the primitive's padded box
      const dx = Math.max(p.min[0] - x, 0, x - p.max[0]);
      const dy = Math.max(p.min[1] - y, 0, y - p.max[1]);
      const dz = Math.max(p.min[2] - z, 0, z - p.max[2]);
      const lb = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (p.sub) {
        if (lb > 0) continue;
        d = smax(d, -this.primDist(p, x, y, z), p.k);
      } else {
        if (lb > d + p.k) continue;
        d = smin(d, this.primDist(p, x, y, z), p.k);
      }
    }
    return d;
  }

  // ------------------------------------------------------------------ meshing
  /**
   * Surface Nets mesh of the field. `cell` is the grid spacing in metres.
   * Bones map bone names → index (for skin weights); omit for static meshes.
   */
  mesh(cell: number, bones?: Map<string, number>): SculptMesh {
    const lo = [Infinity, Infinity, Infinity];
    const hi = [-Infinity, -Infinity, -Infinity];
    for (const p of this.prims) {
      if (p.sub) continue;
      for (let i = 0; i < 3; i++) {
        lo[i] = Math.min(lo[i], p.min[i]);
        hi[i] = Math.max(hi[i], p.max[i]);
      }
    }
    for (let i = 0; i < 3; i++) {
      lo[i] -= cell * 2;
      hi[i] += cell * 2;
    }
    const nx = Math.ceil((hi[0] - lo[0]) / cell) + 1;
    const ny = Math.ceil((hi[1] - lo[1]) / cell) + 1;
    const nz = Math.ceil((hi[2] - lo[2]) / cell) + 1;
    const data = new Float32Array(nx * ny * nz);
    // narrow band: probe 4³ blocks at their centre and only sample the full
    // grid where the surface can pass (the field is ~1-Lipschitz)
    const B = 4;
    const reach = (1.5 * Math.sqrt(3) * cell) * 1.6 + cell;
    for (let bz = 0; bz < nz; bz += B) {
      for (let by = 0; by < ny; by += B) {
        for (let bx = 0; bx < nx; bx += B) {
          const ez = Math.min(nz, bz + B);
          const ey = Math.min(ny, by + B);
          const ex = Math.min(nx, bx + B);
          const c = this.field(lo[0] + (bx + (ex - bx - 1) / 2) * cell, lo[1] + (by + (ey - by - 1) / 2) * cell, lo[2] + (bz + (ez - bz - 1) / 2) * cell);
          const far = Math.abs(c) > reach;
          for (let z = bz; z < ez; z++) {
            const wz = lo[2] + z * cell;
            for (let y = by; y < ey; y++) {
              const wy = lo[1] + y * cell;
              const row = nx * (y + ny * z);
              if (far) data.fill(c, row + bx, row + ex);
              else for (let x = bx; x < ex; x++) data[row + x] = this.field(lo[0] + x * cell, wy, wz);
            }
          }
        }
      }
    }

    const cellIndex = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1);
    const pos: number[] = [];
    const idx: number[] = [];
    const g = new Float32Array(8);
    const EDGES: [number, number][] = [];
    for (let i = 0; i < 8; i++) for (let j = 0; j < 3; j++) if (!(i & (1 << j))) EDGES.push([i, i | (1 << j)]);
    const cid = (x: number, y: number, z: number) => x + (nx - 1) * (y + (ny - 1) * z);
    const at = (x: number, y: number, z: number) => data[x + nx * (y + ny * z)];

    for (let z = 0; z < nz - 1; z++) {
      for (let y = 0; y < ny - 1; y++) {
        for (let x = 0; x < nx - 1; x++) {
          let mask = 0;
          for (let i = 0; i < 8; i++) {
            const v = at(x + (i & 1), y + ((i >> 1) & 1), z + ((i >> 2) & 1));
            g[i] = v;
            if (v < 0) mask |= 1 << i;
          }
          if (mask === 0 || mask === 255) continue;
          let sx = 0;
          let sy = 0;
          let sz = 0;
          let n = 0;
          for (const [a, b] of EDGES) {
            const va = g[a];
            const vb = g[b];
            if (va < 0 === vb < 0) continue;
            const t = va / (va - vb);
            sx += (a & 1) + t * ((b & 1) - (a & 1));
            sy += ((a >> 1) & 1) + t * (((b >> 1) & 1) - ((a >> 1) & 1));
            sz += ((a >> 2) & 1) + t * (((b >> 2) & 1) - ((a >> 2) & 1));
            n++;
          }
          cellIndex[cid(x, y, z)] = pos.length / 3;
          pos.push(lo[0] + (x + sx / n) * cell, lo[1] + (y + sy / n) * cell, lo[2] + (z + sz / n) * cell);
        }
      }
    }
    // faces: one quad per sign-changing grid edge, joining the 4 surrounding cells
    for (let z = 1; z < nz - 1; z++) {
      for (let y = 1; y < ny - 1; y++) {
        for (let x = 1; x < nx - 1; x++) {
          const inside = at(x, y, z) < 0;
          // edge along +x
          if (x < nx - 1 && inside !== at(x + 1, y, z) < 0 && y > 0 && z > 0) {
            this.quad(idx, cellIndex[cid(x, y, z)], cellIndex[cid(x, y - 1, z)], cellIndex[cid(x, y - 1, z - 1)], cellIndex[cid(x, y, z - 1)], inside);
          }
          if (y < ny - 1 && inside !== at(x, y + 1, z) < 0) {
            this.quad(idx, cellIndex[cid(x, y, z)], cellIndex[cid(x, y, z - 1)], cellIndex[cid(x - 1, y, z - 1)], cellIndex[cid(x - 1, y, z)], inside);
          }
          if (z < nz - 1 && inside !== at(x, y, z + 1) < 0) {
            this.quad(idx, cellIndex[cid(x, y, z)], cellIndex[cid(x - 1, y, z)], cellIndex[cid(x - 1, y - 1, z)], cellIndex[cid(x, y - 1, z)], inside);
          }
        }
      }
    }

    // refine onto the surface and take analytic normals from the gradient
    const vcount = pos.length / 3;
    const P = new Float32Array(pos);
    const N = new Float32Array(vcount * 3);
    const h = cell * 0.25;
    for (let i = 0; i < vcount; i++) {
      let x = P[i * 3];
      let y = P[i * 3 + 1];
      let z = P[i * 3 + 2];
      for (let it = 0; it < 2; it++) {
        const d = this.field(x, y, z);
        const gx = this.field(x + h, y, z) - this.field(x - h, y, z);
        const gy = this.field(x, y + h, z) - this.field(x, y - h, z);
        const gz = this.field(x, y, z + h) - this.field(x, y, z - h);
        const gl = Math.hypot(gx, gy, gz) || 1;
        const nxv = gx / gl;
        const nyv = gy / gl;
        const nzv = gz / gl;
        if (it === 0) {
          const step = Math.max(-cell * 0.5, Math.min(cell * 0.5, d));
          x -= nxv * step;
          y -= nyv * step;
          z -= nzv * step;
        } else {
          N[i * 3] = nxv;
          N[i * 3 + 1] = nyv;
          N[i * 3 + 2] = nzv;
        }
      }
      P[i * 3] = x;
      P[i * 3 + 1] = y;
      P[i * 3 + 2] = z;
    }

    // make every triangle face along the field gradient (outward)
    for (let t = 0; t < idx.length; t += 3) {
      const a = idx[t] * 3;
      const b = idx[t + 1] * 3;
      const c = idx[t + 2] * 3;
      const ux = P[b] - P[a];
      const uy = P[b + 1] - P[a + 1];
      const uz = P[b + 2] - P[a + 2];
      const vx = P[c] - P[a];
      const vy = P[c + 1] - P[a + 1];
      const vz = P[c + 2] - P[a + 2];
      const fx = uy * vz - uz * vy;
      const fy = uz * vx - ux * vz;
      const fz = ux * vy - uy * vx;
      const nx2 = N[a] + N[b] + N[c];
      const ny2 = N[a + 1] + N[b + 1] + N[c + 1];
      const nz2 = N[a + 2] + N[b + 2] + N[c + 2];
      if (fx * nx2 + fy * ny2 + fz * nz2 < 0) {
        const tmp = idx[t + 1];
        idx[t + 1] = idx[t + 2];
        idx[t + 2] = tmp;
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(N, 3));
    geo.setIndex(idx);
    this.paint(geo);
    if (bones) this.skin(geo, bones);
    geo.computeBoundingBox();
    geo.computeBoundingSphere();
    return { geometry: geo, box: geo.boundingBox!.clone() };
  }

  private quad(out: number[], a: number, b: number, c: number, d: number, flip: boolean): void {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (flip) out.push(a, b, c, a, c, d);
    else out.push(a, c, b, a, d, c);
  }

  /** Material colour + surface (roughness, metalness, sss, glow, tint) per vertex. */
  private paint(geo: THREE.BufferGeometry): void {
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const n = pos.count;
    const col = new Float32Array(n * 3);
    const surf = new Float32Array(n * 4);
    const tint = new Float32Array(n);
    const ink = new Float32Array(n);
    const cols = this.materials.map((m) => new THREE.Color(m.color));
    const adds = this.prims.filter((p) => !p.sub);
    const dist = new Float32Array(adds.length);
    // clothing, hair and armour claim a margin over skin so body bulges never poke through
    const cover = this.materials.map((m) => ((m.sss ?? 0) > 0 || (m.glow ?? 0) > 0 ? 0 : 0.012));
    for (let i = 0; i < n; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      let best = 1e9;
      for (let j = 0; j < adds.length; j++) {
        const p = adds[j];
        const dx = Math.max(p.min[0] - x, 0, x - p.max[0]);
        const dy = Math.max(p.min[1] - y, 0, y - p.max[1]);
        const dz = Math.max(p.min[2] - z, 0, z - p.max[2]);
        if (dx * dx + dy * dy + dz * dz > 0.25 * 0.25 && best < 0.1) {
          dist[j] = 1e9;
          continue;
        }
        const d = this.primDist(p, x, y, z) - p.priority * 0.002 - cover[p.mat];
        dist[j] = d;
        if (d < best) best = d;
      }
      // ink line where two different materials meet (clothing seams, hems, lips)
      let bestMat = -1;
      let bd = 1e9;
      for (let j = 0; j < adds.length; j++) if (dist[j] < bd) { bd = dist[j]; bestMat = adds[j].mat; }
      let best2 = 1e9;
      const skinBest = (this.materials[bestMat]?.sss ?? 0) > 0;
      for (let j = 0; j < adds.length; j++) {
        const mj = adds[j].mat;
        if (mj === bestMat || dist[j] >= best2) continue;
        if (skinBest && (this.materials[mj].sss ?? 0) > 0) continue; // no line between skin and lips
        if ((this.materials[mj].glow ?? 0) > 0 || (this.materials[bestMat]?.glow ?? 0) > 0) continue;
        best2 = dist[j];
      }
      const gap = best2 - bd;
      ink[i] = gap < 0.003 ? 1 - gap / 0.003 : 0;
      let r = 0;
      let g = 0;
      let b = 0;
      let ro = 0;
      let me = 0;
      let ss = 0;
      let gl = 0;
      let ti = 0;
      let wsum = 0;
      for (let j = 0; j < adds.length; j++) {
        const w = Math.max(0, 1 - (dist[j] - best) / 0.0012);
        if (w <= 0) continue;
        const m = this.materials[adds[j].mat];
        const c = cols[adds[j].mat];
        r += c.r * w;
        g += c.g * w;
        b += c.b * w;
        ro += (m.rough ?? 0.7) * w;
        me += (m.metal ?? 0) * w;
        ss += (m.sss ?? 0) * w;
        gl += (m.glow ?? 0) * w;
        ti += (m.tint ?? 0) * w;
        wsum += w;
      }
      wsum = wsum || 1;
      col[i * 3] = r / wsum;
      col[i * 3 + 1] = g / wsum;
      col[i * 3 + 2] = b / wsum;
      surf[i * 4] = ro / wsum;
      surf[i * 4 + 1] = me / wsum;
      surf[i * 4 + 2] = ss / wsum;
      surf[i * 4 + 3] = gl / wsum;
      tint[i] = ti / wsum;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('surf', new THREE.BufferAttribute(surf, 4));
    geo.setAttribute('tint', new THREE.BufferAttribute(tint, 1));
    geo.setAttribute('ink', new THREE.BufferAttribute(ink, 1));
  }

  /** Automatic skin weights: each primitive pulls its vertices toward its bone(s). */
  private skin(geo: THREE.BufferGeometry, bones: Map<string, number>): void {
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const n = pos.count;
    const si = new Uint16Array(n * 4);
    const sw = new Float32Array(n * 4);
    const adds = this.prims.filter((p) => !p.sub);
    const acc = new Map<number, number>();
    for (let i = 0; i < n; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      acc.clear();
      let best = 1e9;
      const ds: number[] = [];
      for (const p of adds) {
        const d = this.primDist(p, x, y, z);
        ds.push(d);
        if (d < best) best = d;
      }
      adds.forEach((p, j) => {
        const rel = ds[j] - best;
        if (rel > 0.06) return;
        const w = Math.exp(-rel / 0.012);
        const b0 = bones.get(p.bone) ?? 0;
        if (p.bone2 && p.t === CONE) {
          // split along the cone's axis for smooth bending between two bones
          const ba = p.ba;
          const t = Math.min(1, Math.max(0, ((x - p.a[0]) * ba[0] + (y - p.a[1]) * ba[1] + (z - p.a[2]) * ba[2]) / p.l2));
          const s = t * t * (3 - 2 * t);
          const b1 = bones.get(p.bone2) ?? b0;
          acc.set(b0, (acc.get(b0) ?? 0) + w * (1 - s));
          acc.set(b1, (acc.get(b1) ?? 0) + w * s);
        } else acc.set(b0, (acc.get(b0) ?? 0) + w);
      });
      const top = [...acc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
      const tot = top.reduce((s, e) => s + e[1], 0) || 1;
      top.forEach(([bi, w], k) => {
        si[i * 4 + k] = bi;
        sw[i * 4 + k] = w / tot;
      });
    }
    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
    geo.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
  }
}
