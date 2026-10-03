import * as THREE from 'three';

// Growable typed array
class FArr {
  constructor(n = 1024) {
    this.a = new Float32Array(n);
    this.n = 0;
  }
  push3(x, y, z) {
    if (this.n + 3 > this.a.length) this._grow(this.n + 3);
    const a = this.a, n = this.n;
    a[n] = x; a[n + 1] = y; a[n + 2] = z;
    this.n = n + 3;
  }
  push2(x, y) {
    if (this.n + 2 > this.a.length) this._grow(this.n + 2);
    this.a[this.n] = x; this.a[this.n + 1] = y;
    this.n += 2;
  }
  push4(x, y, z, w) {
    if (this.n + 4 > this.a.length) this._grow(this.n + 4);
    const a = this.a, n = this.n;
    a[n] = x; a[n + 1] = y; a[n + 2] = z; a[n + 3] = w;
    this.n = n + 4;
  }
  _grow(min) {
    let s = this.a.length * 2;
    while (s < min) s *= 2;
    const b = new Float32Array(s);
    b.set(this.a.subarray(0, this.n));
    this.a = b;
  }
  view() { return this.a.slice(0, this.n); }
}
class IArr {
  constructor(n = 1024) { this.a = new Uint32Array(n); this.n = 0; }
  push(v) {
    if (this.n + 1 > this.a.length) {
      const b = new Uint32Array(this.a.length * 2);
      b.set(this.a);
      this.a = b;
    }
    this.a[this.n++] = v;
  }
  view() { return this.a.slice(0, this.n); }
}

const _v = new THREE.Vector3();
const _n = new THREE.Vector3();
const _m3 = new THREE.Matrix3();

// Accumulates geometry with the shared world vertex format:
// position, normal, uv (metres), color (tint / HDR emissive), aMat (layer, style, seed, w)
export class GeoBuffer {
  constructor() {
    this.pos = new FArr(4096);
    this.nrm = new FArr(4096);
    this.uv = new FArr(2048);
    this.col = new FArr(4096);
    this.mat = new FArr(4096);
    this.idx = new IArr(4096);
    this.chunkAttr = null; // optional aChunk for far LOD
    this.vcount = 0;
  }
  get empty() { return this.vcount === 0; }

  vert(x, y, z, nx, ny, nz, u, v, r, g, b, m0, m1, m2, m3) {
    this.pos.push3(x, y, z);
    this.nrm.push3(nx, ny, nz);
    this.uv.push2(u, v);
    this.col.push3(r, g, b);
    this.mat.push4(m0, m1, m2, m3);
    if (this.chunkAttr) this.chunkAttr.push2(this._ci, this._cj);
    return this.vcount++;
  }
  setChunk(ci, cj) {
    if (!this.chunkAttr) this.chunkAttr = new FArr(2048);
    this._ci = ci; this._cj = cj;
  }
  tri(a, b, c) { this.idx.push(a); this.idx.push(b); this.idx.push(c); }

  // Quad from 4 corners (counter-clockwise when viewed from the front)
  quad(p0, p1, p2, p3, nrm, uv0, uv1, uv2, uv3, col, m) {
    const a = this.vert(p0[0], p0[1], p0[2], nrm[0], nrm[1], nrm[2], uv0[0], uv0[1], col[0], col[1], col[2], m[0], m[1], m[2], m[3]);
    const b = this.vert(p1[0], p1[1], p1[2], nrm[0], nrm[1], nrm[2], uv1[0], uv1[1], col[0], col[1], col[2], m[0], m[1], m[2], m[3]);
    const c = this.vert(p2[0], p2[1], p2[2], nrm[0], nrm[1], nrm[2], uv2[0], uv2[1], col[0], col[1], col[2], m[0], m[1], m[2], m[3]);
    const d = this.vert(p3[0], p3[1], p3[2], nrm[0], nrm[1], nrm[2], uv3[0], uv3[1], col[0], col[1], col[2], m[0], m[1], m[2], m[3]);
    this.tri(a, b, c);
    this.tri(a, c, d);
  }

  // Axis-aligned box. opts: col [r,g,b], m [layer,style,seed,w], faces bitmask
  // (1 +x, 2 -x, 4 +y, 8 -y, 16 +z, 32 -z), uvBase for facade continuity,
  // topM (aMat for top face), facadeOffsetY (v origin for facade UVs)
  box(x0, y0, z0, x1, y1, z1, col, m, opts = {}) {
    const faces = opts.faces === undefined ? 63 : opts.faces;
    const vb = opts.vBase !== undefined ? opts.vBase : y0;
    const u0 = opts.uBase || 0;
    const mt = opts.topM || m;
    const ct = opts.topCol || col;
    const W = x1 - x0, D = z1 - z0;
    // +z face (u runs +x)
    if (faces & 16) this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1],
      [u0, y0 - vb], [u0 + W, y0 - vb], [u0 + W, y1 - vb], [u0, y1 - vb], col, m);
    // +x face (u runs -z)
    if (faces & 1) this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0],
      [u0 + W, y0 - vb], [u0 + W + D, y0 - vb], [u0 + W + D, y1 - vb], [u0 + W, y1 - vb], col, m);
    // -z face (u runs -x)
    if (faces & 32) this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1],
      [u0 + W + D, y0 - vb], [u0 + 2 * W + D, y0 - vb], [u0 + 2 * W + D, y1 - vb], [u0 + W + D, y1 - vb], col, m);
    // -x face (u runs +z)
    if (faces & 2) this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0],
      [u0 + 2 * W + D, y0 - vb], [u0 + 2 * W + 2 * D, y0 - vb], [u0 + 2 * W + 2 * D, y1 - vb], [u0 + 2 * W + D, y1 - vb], col, m);
    // top
    if (faces & 4) this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0],
      [x0, z1], [x1, z1], [x1, z0], [x0, z0], ct, mt);
    // bottom
    if (faces & 8) this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0],
      [x0, z0], [x1, z0], [x1, z1], [x0, z1], col, m);
  }

  // Box rotated around Y by yaw, centred at (cx, cy, cz) with half extents
  boxRot(cx, cy, cz, hx, hy, hz, yaw, col, m, faces = 63) {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const P = (lx, ly, lz) => [cx + lx * c + lz * s, cy + ly, cz - lx * s + lz * c];
    const N = (nx, ny, nz) => [nx * c + nz * s, ny, -nx * s + nz * c];
    const W = hx * 2, D = hz * 2, H = hy * 2;
    if (faces & 16) this.quad(P(-hx, -hy, hz), P(hx, -hy, hz), P(hx, hy, hz), P(-hx, hy, hz), N(0, 0, 1), [0, 0], [W, 0], [W, H], [0, H], col, m);
    if (faces & 1) this.quad(P(hx, -hy, hz), P(hx, -hy, -hz), P(hx, hy, -hz), P(hx, hy, hz), N(1, 0, 0), [0, 0], [D, 0], [D, H], [0, H], col, m);
    if (faces & 32) this.quad(P(hx, -hy, -hz), P(-hx, -hy, -hz), P(-hx, hy, -hz), P(hx, hy, -hz), N(0, 0, -1), [0, 0], [W, 0], [W, H], [0, H], col, m);
    if (faces & 2) this.quad(P(-hx, -hy, -hz), P(-hx, -hy, hz), P(-hx, hy, hz), P(-hx, hy, -hz), N(-1, 0, 0), [0, 0], [D, 0], [D, H], [0, H], col, m);
    if (faces & 4) this.quad(P(-hx, hy, hz), P(hx, hy, hz), P(hx, hy, -hz), P(-hx, hy, -hz), N(0, 1, 0), [0, 0], [W, 0], [W, D], [0, D], col, m);
    if (faces & 8) this.quad(P(-hx, -hy, -hz), P(hx, -hy, -hz), P(hx, -hy, hz), P(-hx, -hy, hz), N(0, -1, 0), [0, 0], [W, 0], [W, D], [0, D], col, m);
  }

  // Vertical wall quad between two XZ points with facade UVs
  wall(ax, az, bx, bz, y0, y1, col, m, uBase = 0, vBase = null, flip = false) {
    const len = Math.hypot(bx - ax, bz - az);
    let nx = (bz - az) / len, nz = -(bx - ax) / len;
    if (flip) { nx = -nx; nz = -nz; }
    const vb = vBase === null ? y0 : vBase;
    if (!flip) {
      this.quad([bx, y0, bz], [ax, y0, az], [ax, y1, az], [bx, y1, bz], [nx, 0, nz],
        [uBase, y0 - vb], [uBase + len, y0 - vb], [uBase + len, y1 - vb], [uBase, y1 - vb], col, m);
    } else {
      this.quad([ax, y0, az], [bx, y0, bz], [bx, y1, bz], [ax, y1, az], [nx, 0, nz],
        [uBase, y0 - vb], [uBase + len, y0 - vb], [uBase + len, y1 - vb], [uBase, y1 - vb], col, m);
    }
  }

  // Cylinder / prism along Y
  cylinder(cx, y0, cz, r0, r1, h, seg, col, m, caps = true) {
    const base = this.vcount;
    const circ = 2 * Math.PI * Math.max(r0, r1);
    const dr = r0 - r1;
    const sl = Math.hypot(dr, h);
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      const c = Math.cos(a), s = Math.sin(a);
      const nx = c * (h / sl), ny = dr / sl, nz = s * (h / sl);
      this.vert(cx + c * r0, y0, cz + s * r0, nx, ny, nz, (i / seg) * circ, 0, col[0], col[1], col[2], m[0], m[1], m[2], m[3]);
      this.vert(cx + c * r1, y0 + h, cz + s * r1, nx, ny, nz, (i / seg) * circ, h, col[0], col[1], col[2], m[0], m[1], m[2], m[3]);
    }
    for (let i = 0; i < seg; i++) {
      const a = base + i * 2;
      this.tri(a, a + 1, a + 3);
      this.tri(a, a + 3, a + 2);
    }
    if (caps && r1 > 0.001) {
      const c0 = this.vert(cx, y0 + h, cz, 0, 1, 0, cx, cz, col[0], col[1], col[2], m[0], m[1], m[2], m[3]);
      const ring = this.vcount;
      for (let i = 0; i <= seg; i++) {
        const a = (i / seg) * Math.PI * 2;
        this.vert(cx + Math.cos(a) * r1, y0 + h, cz + Math.sin(a) * r1, 0, 1, 0, cx + Math.cos(a) * r1, cz + Math.sin(a) * r1, col[0], col[1], col[2], m[0], m[1], m[2], m[3]);
      }
      for (let i = 0; i < seg; i++) this.tri(c0, ring + i + 1, ring + i);
    }
  }

  // Generic oriented cylinder between two 3D points
  tube(ax, ay, az, bx, by, bz, r0, r1, seg, col, m) {
    const dir = new THREE.Vector3(bx - ax, by - ay, bz - az);
    const len = dir.length();
    if (len < 1e-4) return;
    dir.divideScalar(len);
    const up = Math.abs(dir.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const t = new THREE.Vector3().crossVectors(dir, up).normalize();
    const b2 = new THREE.Vector3().crossVectors(t, dir).normalize();
    const base = this.vcount;
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      const c = Math.cos(a), s = Math.sin(a);
      const nx = t.x * c + b2.x * s, ny = t.y * c + b2.y * s, nz = t.z * c + b2.z * s;
      this.vert(ax + nx * r0, ay + ny * r0, az + nz * r0, nx, ny, nz, i / seg, 0, col[0], col[1], col[2], m[0], m[1], m[2], m[3]);
      this.vert(bx + nx * r1, by + ny * r1, bz + nz * r1, nx, ny, nz, i / seg, len, col[0], col[1], col[2], m[0], m[1], m[2], m[3]);
    }
    for (let i = 0; i < seg; i++) {
      const a = base + i * 2;
      this.tri(a, a + 1, a + 3);
      this.tri(a, a + 3, a + 2);
    }
  }

  // Gable roof prism over rect, ridge along x (axis 'x') or z
  gable(x0, z0, x1, z1, y, h, axis, col, m, overhang = 0.4) {
    x0 -= overhang; z0 -= overhang; x1 += overhang; z1 += overhang;
    if (axis === 'x') {
      const zm = (z0 + z1) / 2;
      const sl = Math.hypot(zm - z0, h);
      const ny = (zm - z0) / sl, nz = h / sl;
      this.quad([x0, y, z1], [x1, y, z1], [x1, y + h, zm], [x0, y + h, zm], [0, ny, nz], [x0, 0], [x1, 0], [x1, sl], [x0, sl], col, m);
      this.quad([x1, y, z0], [x0, y, z0], [x0, y + h, zm], [x1, y + h, zm], [0, ny, -nz], [x1, 0], [x0, 0], [x0, sl], [x1, sl], col, m);
      // gable ends
      const a = this.vert(x0, y, z0, -1, 0, 0, z0, 0, col[0], col[1], col[2], m[0], m[1], m[2], m[3]);
      const b = this.vert(x0, y, z1, -1, 0, 0, z1, 0, col[0], col[1], col[2], m[0], m[1], m[2], m[3]);
      const c = this.vert(x0, y + h, zm, -1, 0, 0, zm, h, col[0], col[1], col[2], m[0], m[1], m[2], m[3]);
      this.tri(a, b, c);
      const d = this.vert(x1, y, z1, 1, 0, 0, z1, 0, col[0], col[1], col[2], m[0], m[1], m[2], m[3]);
      const e = this.vert(x1, y, z0, 1, 0, 0, z0, 0, col[0], col[1], col[2], m[0], m[1], m[2], m[3]);
      const f = this.vert(x1, y + h, zm, 1, 0, 0, zm, h, col[0], col[1], col[2], m[0], m[1], m[2], m[3]);
      this.tri(d, e, f);
    } else {
      const xm = (x0 + x1) / 2;
      const sl = Math.hypot(xm - x0, h);
      const ny = (xm - x0) / sl, nx = h / sl;
      this.quad([x1, y, z1], [x1, y, z0], [xm, y + h, z0], [xm, y + h, z1], [nx, ny, 0], [z1, 0], [z0, 0], [z0, sl], [z1, sl], col, m);
      this.quad([x0, y, z0], [x0, y, z1], [xm, y + h, z1], [xm, y + h, z0], [-nx, ny, 0], [z0, 0], [z1, 0], [z1, sl], [z0, sl], col, m);
      const a = this.vert(x0, y, z1, 0, 0, 1, x0, 0, col[0], col[1], col[2], m[0], m[1], m[2], m[3]);
      const b = this.vert(x1, y, z1, 0, 0, 1, x1, 0, col[0], col[1], col[2], m[0], m[1], m[2], m[3]);
      const c = this.vert(xm, y + h, z1, 0, 0, 1, xm, h, col[0], col[1], col[2], m[0], m[1], m[2], m[3]);
      this.tri(a, b, c);
      const d = this.vert(x1, y, z0, 0, 0, -1, x1, 0, col[0], col[1], col[2], m[0], m[1], m[2], m[3]);
      const e = this.vert(x0, y, z0, 0, 0, -1, x0, 0, col[0], col[1], col[2], m[0], m[1], m[2], m[3]);
      const f = this.vert(xm, y + h, z0, 0, 0, -1, xm, h, col[0], col[1], col[2], m[0], m[1], m[2], m[3]);
      this.tri(d, e, f);
    }
  }

  // Merge a template BufferGeometry transformed by matrix. Template may carry
  // its own color / aMat attributes; `col` multiplies, `m` overrides aMat if given.
  addGeometry(geo, matrix, col = null, m = null) {
    const p = geo.attributes.position, n = geo.attributes.normal;
    const uv = geo.attributes.uv, c = geo.attributes.color, am = geo.attributes.aMat;
    _m3.getNormalMatrix(matrix);
    const base = this.vcount;
    for (let i = 0; i < p.count; i++) {
      _v.fromBufferAttribute(p, i).applyMatrix4(matrix);
      if (n) _n.fromBufferAttribute(n, i).applyMatrix3(_m3).normalize(); else _n.set(0, 1, 0);
      let r = 1, g = 1, b = 1;
      if (c) { r = c.getX(i); g = c.getY(i); b = c.getZ(i); }
      if (col) { r *= col[0]; g *= col[1]; b *= col[2]; }
      let m0 = 0, m1 = -1, m2 = 0, m3 = 0;
      if (am) { m0 = am.getX(i); m1 = am.getY(i); m2 = am.getZ(i); m3 = am.getW(i); }
      if (m) { m0 = m[0]; m1 = m[1]; m2 = m[2]; m3 = m[3]; }
      this.vert(_v.x, _v.y, _v.z, _n.x, _n.y, _n.z, uv ? uv.getX(i) : 0, uv ? uv.getY(i) : 0, r, g, b, m0, m1, m2, m3);
    }
    if (geo.index) {
      const ix = geo.index;
      for (let i = 0; i < ix.count; i++) this.idx.push(base + ix.getX(i));
    } else {
      for (let i = 0; i < p.count; i++) this.idx.push(base + i);
    }
  }

  build() {
    if (this.vcount === 0) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos.view(), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(this.nrm.view(), 3));
    g.setAttribute('uv', new THREE.BufferAttribute(this.uv.view(), 2));
    g.setAttribute('color', new THREE.BufferAttribute(this.col.view(), 3));
    g.setAttribute('aMat', new THREE.BufferAttribute(this.mat.view(), 4));
    if (this.chunkAttr) g.setAttribute('aChunk', new THREE.BufferAttribute(this.chunkAttr.view(), 2));
    g.setIndex(new THREE.BufferAttribute(this.idx.view(), 1));
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
}

// Bucketed builder: one GeoBuffer per material kind
export class ChunkGeo {
  constructor() {
    this.b = {};
  }
  get(kind) {
    if (!this.b[kind]) this.b[kind] = new GeoBuffer();
    return this.b[kind];
  }
}

// Bake a template geometry (from THREE primitives) with a constant colour and aMat
export function bakeTemplate(geo, col, m) {
  const g = geo.index ? geo : geo;
  const n = g.attributes.position.count;
  const c = new Float32Array(n * 3);
  const am = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    c[i * 3] = col[0]; c[i * 3 + 1] = col[1]; c[i * 3 + 2] = col[2];
    am[i * 4] = m[0]; am[i * 4 + 1] = m[1]; am[i * 4 + 2] = m[2]; am[i * 4 + 3] = m[3];
  }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  g.setAttribute('aMat', new THREE.BufferAttribute(am, 4));
  return g;
}
