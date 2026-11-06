// Signed-distance "digital clay": characters are sculpted from smooth-blended
// primitives, polygonised with surface nets, projected back onto the exact
// surface, and given SDF ambient occlusion and bone weights.
import * as THREE from 'three';

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);

// ---------- primitive distance functions ----------
function sdRoundCone(px, py, pz, p) {
  // capsule between a and b with radii ra -> rb (iq's round cone, robust form)
  const bax = p.bx - p.ax, bay = p.by - p.ay, baz = p.bz - p.az;
  const pax = px - p.ax, pay = py - p.ay, paz = pz - p.az;
  const l2 = p.l2, rr = p.ra - p.rb, a2 = l2 - rr * rr, il2 = 1 / l2;
  const y = pax * bax + pay * bay + paz * baz;
  const z = y - l2;
  const qx = pax * l2 - bax * y, qy = pay * l2 - bay * y, qz = paz * l2 - baz * y;
  const x2 = qx * qx + qy * qy + qz * qz;
  const y2 = y * y * l2, z2 = z * z * l2;
  const k = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - p.rb;
  if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - p.ra;
  return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - p.ra;
}

function toLocal(px, py, pz, p, out) {
  let x = px - p.cx, y = py - p.cy, z = pz - p.cz;
  if (p.m) { const m = p.m; out[0] = m[0] * x + m[1] * y + m[2] * z; out[1] = m[3] * x + m[4] * y + m[5] * z; out[2] = m[6] * x + m[7] * y + m[8] * z; }
  else { out[0] = x; out[1] = y; out[2] = z; }
}
const L = [0, 0, 0];
function sdEllipsoid(px, py, pz, p) {
  toLocal(px, py, pz, p, L);
  const x = L[0], y = L[1], z = L[2];
  const k0 = Math.sqrt((x / p.rx) ** 2 + (y / p.ry) ** 2 + (z / p.rz) ** 2);
  const k1 = Math.sqrt((x / (p.rx * p.rx)) ** 2 + (y / (p.ry * p.ry)) ** 2 + (z / (p.rz * p.rz)) ** 2);
  return k1 === 0 ? -Math.min(p.rx, p.ry, p.rz) : (k0 * (k0 - 1)) / k1;
}
function sdBox(px, py, pz, p) {
  toLocal(px, py, pz, p, L);
  const qx = Math.abs(L[0]) - p.hx + p.r, qy = Math.abs(L[1]) - p.hy + p.r, qz = Math.abs(L[2]) - p.hz + p.r;
  const ox = Math.max(qx, 0), oy = Math.max(qy, 0), oz = Math.max(qz, 0);
  return Math.sqrt(ox * ox + oy * oy + oz * oz) + Math.min(Math.max(qx, qy, qz), 0) - p.r;
}
function sdTorus(px, py, pz, p) { // ring in local XZ plane
  toLocal(px, py, pz, p, L);
  const qx = (Math.sqrt(L[0] * L[0] / (p.sx * p.sx) + L[2] * L[2] / (p.sz * p.sz)) - p.R) * Math.min(p.sx, p.sz);
  return Math.sqrt(qx * qx + L[1] * L[1] / (p.sy * p.sy)) - p.r;
}
function sdPlane(px, py, pz, p) { return (px - p.cx) * p.nx + (py - p.cy) * p.ny + (pz - p.cz) * p.nz; }

function rotMatrix(euler) {
  if (!euler) return null;
  const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...euler)).invert().elements;
  // column-major -> row-major 3x3 of inverse rotation
  return [m[0], m[4], m[8], m[1], m[5], m[9], m[2], m[6], m[10]];
}

// ---------- primitive constructors ----------
export const P = {
  capsule(a, b, ra, rb = ra, o = {}) {
    const p = { f: sdRoundCone, ax: a[0], ay: a[1], az: a[2], bx: b[0], by: b[1], bz: b[2], ra, rb, ...o };
    p.l2 = (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2 + (b[2] - a[2]) ** 2 || 1e-8;
    const r = Math.max(ra, rb);
    p.min = [Math.min(a[0], b[0]) - r, Math.min(a[1], b[1]) - r, Math.min(a[2], b[2]) - r];
    p.max = [Math.max(a[0], b[0]) + r, Math.max(a[1], b[1]) + r, Math.max(a[2], b[2]) + r];
    return p;
  },
  ellipsoid(c, r, o = {}) {
    const p = { f: sdEllipsoid, cx: c[0], cy: c[1], cz: c[2], rx: r[0], ry: r[1], rz: r[2], m: rotMatrix(o.rot), ...o };
    const R = Math.max(...r); p.min = [c[0] - R, c[1] - R, c[2] - R]; p.max = [c[0] + R, c[1] + R, c[2] + R];
    return p;
  },
  sphere(c, r, o = {}) { return P.ellipsoid(c, [r, r, r], o); },
  box(c, h, r = 0.005, o = {}) {
    const p = { f: sdBox, cx: c[0], cy: c[1], cz: c[2], hx: h[0], hy: h[1], hz: h[2], r, m: rotMatrix(o.rot), ...o };
    const R = Math.hypot(...h); p.min = [c[0] - R, c[1] - R, c[2] - R]; p.max = [c[0] + R, c[1] + R, c[2] + R];
    return p;
  },
  torus(c, R, r, o = {}) {
    const p = { f: sdTorus, cx: c[0], cy: c[1], cz: c[2], R, r, sx: o.sx || 1, sy: o.sy || 1, sz: o.sz || 1, m: rotMatrix(o.rot), ...o };
    const E = (R + r) * Math.max(p.sx, p.sz, p.sy, 1) + r * p.sy + 0.01; p.min = [c[0] - E, c[1] - E, c[2] - E]; p.max = [c[0] + E, c[1] + E, c[2] + E];
    return p;
  },
  plane(c, n, o = {}) { const l = Math.hypot(...n); return { f: sdPlane, cx: c[0], cy: c[1], cz: c[2], nx: n[0] / l, ny: n[1] / l, nz: n[2] / l, global: true, ...o }; },
};

function smin(a, b, k) { if (k <= 0) return Math.min(a, b); const h = clamp(0.5 + (0.5 * (b - a)) / k, 0, 1); return b + (a - b) * h - k * h * (1 - h); }
function smax(a, b, k) { return -smin(-a, -b, k); }

/**
 * A sculpt is a list of operations evaluated in order:
 *   { op:'add', prim, k }    smooth union
 *   { op:'sub', prim, k }    smooth subtraction
 *   { op:'inter', prim, k }  smooth intersection (clip)
 *   { op:'disp', fn }        displacement d += fn(x,y,z)
 */
export class Sculpt {
  constructor() { this.ops = []; this.tags = []; }
  add(prim, k = 0.01) { this.ops.push({ op: 'add', prim, k }); return this; }
  sub(prim, k = 0.004) { this.ops.push({ op: 'sub', prim, k }); return this; }
  inter(prim, k = 0.004) { this.ops.push({ op: 'inter', prim, k }); return this; }
  disp(fn) { this.ops.push({ op: 'disp', fn }); return this; }
  shell(t) { this.ops.push({ op: 'shell', t }); return this; } // hollow into thickness t (cloth)
  offset(t) { this.ops.push({ op: 'offset', t }); return this; }

  eval(x, y, z) {
    let d = 1e9;
    for (let i = 0, n = this.ops.length; i < n; i++) {
      const o = this.ops[i];
      switch (o.op) {
        case 'add': {
          const p = o.prim;
          if (!p.global && d < 1e8 && (x < p.min[0] - o.k - 0.02 || y < p.min[1] - o.k - 0.02 || z < p.min[2] - o.k - 0.02 || x > p.max[0] + o.k + 0.02 || y > p.max[1] + o.k + 0.02 || z > p.max[2] + o.k + 0.02)) {
            // far outside this primitive's bounds — it cannot lower d below its bound distance
            const bx = Math.max(p.min[0] - x, 0, x - p.max[0]), by = Math.max(p.min[1] - y, 0, y - p.max[1]), bz = Math.max(p.min[2] - z, 0, z - p.max[2]);
            const bd = Math.sqrt(bx * bx + by * by + bz * bz);
            if (bd - o.k > d) break;
          }
          d = smin(d, p.f(x, y, z, p), o.k); break;
        }
        case 'sub': d = smax(d, -o.prim.f(x, y, z, o.prim), o.k); break;
        case 'inter': d = smax(d, o.prim.f(x, y, z, o.prim), o.k); break;
        case 'disp': d += o.fn(x, y, z); break;
        case 'shell': d = Math.abs(d) - o.t; break;
        case 'offset': d -= o.t; break;
      }
    }
    return d;
  }

  grad(x, y, z, out, e = 0.0005) {
    // tetrahedral gradient (4 evaluations)
    const a = this.eval(x + e, y - e, z - e), b = this.eval(x - e, y - e, z + e), c = this.eval(x - e, y + e, z - e), dd = this.eval(x + e, y + e, z + e);
    out[0] = a - b - c + dd; out[1] = -a - b + c + dd; out[2] = -a + b - c + dd;
    const l = Math.hypot(out[0], out[1], out[2]) || 1; out[0] /= l; out[1] /= l; out[2] /= l;
    return out;
  }
}

/**
 * Polygonise a sculpt inside bounds [min,max] with cell size h using naive
 * surface nets. Returns a BufferGeometry with position/normal and a
 * per-vertex 'ao' attribute.
 */
export const PROF = { poly: 0, sample: 0, ao: 0, skin: 0, proj: 0 };

// ---- geometry cache (IndexedDB-backed; see cache.js). Keyed by a hash of the sculpt itself,
// so any change to a primitive, displacement function or resolution invalidates it.
export const POLY_CACHE = { map: new Map(), fresh: new Map(), used: null };
function cyrb53(str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) { const ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
const round = (k, v) => (typeof v === 'function' ? undefined : typeof v === 'number' ? Math.round(v * 1e6) / 1e6 : v);
export function sculptKey(sculpt, extra) {
  const parts = sculpt.ops.map((o) => o.op + ':' + (o.k ?? '') + ':' + (o.t ?? '') + ':' + (o.prim ? o.prim.f.name + JSON.stringify(o.prim, round) : '') + (o.fn ? o.fn.toString() : ''));
  return cyrb53(parts.join('|') + JSON.stringify(extra, round));
}
export function polygonise(sculpt, min, max, h, { ao = true, aoScale = 1, project = 1 } = {}) {
  const __t0 = performance.now();
  const key = sculptKey(sculpt, [min, max, h, ao, aoScale, project]);
  POLY_CACHE.used?.add(key);
  const hit = POLY_CACHE.map.get(key);
  if (hit) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(hit.pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(hit.nor, 3));
    geo.setIndex(new THREE.BufferAttribute(hit.idx, 1));
    if (hit.ao) geo.setAttribute('ao', new THREE.BufferAttribute(hit.ao, 1));
    PROF.poly += performance.now() - __t0;
    return geo;
  }
  const nx = Math.ceil((max[0] - min[0]) / h) + 1, ny = Math.ceil((max[1] - min[1]) / h) + 1, nz = Math.ceil((max[2] - min[2]) / h) + 1;
  const field = new Float32Array(nx * ny * nz);
  const sx = 1, sy = nx, sz = nx * ny;
  // coarse-to-fine sampling: blocks whose centre is far from the surface are filled with one value
  const B = 6, half = h * B * 0.5;
  const bx = Math.ceil(nx / B), by = Math.ceil(ny / B), bz = Math.ceil(nz / B);
  const near = new Uint8Array(bx * by * bz);
  const thresh = half * 1.9; // > half-diagonal (≈1.73·half) with margin for non-exact SDFs
  for (let kb = 0; kb < bz; kb++) for (let jb = 0; jb < by; jb++) for (let ib = 0; ib < bx; ib++) {
    const i0 = ib * B, j0 = jb * B, k0 = kb * B;
    const dc = sculpt.eval(min[0] + (i0 + B / 2) * h, min[1] + (j0 + B / 2) * h, min[2] + (k0 + B / 2) * h);
    const isNear = Math.abs(dc) <= thresh;
    near[ib + bx * (jb + by * kb)] = isNear ? 1 : 0;
    const i1 = Math.min(i0 + B, nx - 1), j1 = Math.min(j0 + B, ny - 1), k1 = Math.min(k0 + B, nz - 1);
    for (let k = k0; k <= k1; k++) for (let j = j0; j <= j1; j++) {
      let id = i0 + sy * j + sz * k;
      const z = min[2] + k * h, y = min[1] + j * h;
      for (let i = i0; i <= i1; i++, id++) {
        if (field[id] !== 0) continue;
        field[id] = isNear ? (sculpt.eval(min[0] + i * h, y, z) || 1e-7) : dc;
      }
    }
  }
  PROF.sample += performance.now() - __t0;
  // vertices: one per sign-changing cell (only cells in near blocks can change sign)
  const cnx = nx - 1, cny = ny - 1;
  const cellVert = new Int32Array(cnx * cny * (nz - 1)).fill(-1);
  const pos = [];
  const cOff = [0, sx, sy, sx + sy, sz, sx + sz, sy + sz, sx + sy + sz];
  const cx = [0, 1, 0, 1, 0, 1, 0, 1], cy = [0, 0, 1, 1, 0, 0, 1, 1], cz = [0, 0, 0, 0, 1, 1, 1, 1];
  const EA = [0, 2, 4, 6, 0, 1, 4, 5, 0, 1, 2, 3], EB = [1, 3, 5, 7, 2, 3, 6, 7, 4, 5, 6, 7];
  const v = new Float32Array(8);
  for (let kb = 0; kb < bz; kb++) for (let jb = 0; jb < by; jb++) for (let ib = 0; ib < bx; ib++) {
    if (!near[ib + bx * (jb + by * kb)]) continue;
    const i0 = ib * B, j0 = jb * B, k0 = kb * B;
    // include one extra cell of the neighbouring block so seams are covered
    const i1 = Math.min(i0 + B + 1, nx - 1), j1 = Math.min(j0 + B + 1, ny - 1), k1 = Math.min(k0 + B + 1, nz - 1);
    for (let k = Math.max(0, k0 - 1); k < k1; k++) for (let j = Math.max(0, j0 - 1); j < j1; j++) for (let i = Math.max(0, i0 - 1); i < i1; i++) {
      const ci = i + cnx * (j + cny * k);
      if (cellVert[ci] !== -1) continue;
      const base = i + sy * j + sz * k;
      let mask = 0;
      for (let c = 0; c < 8; c++) { v[c] = field[base + cOff[c]]; if (v[c] < 0) mask |= 1 << c; }
      if (mask === 0 || mask === 255) { cellVert[ci] = -2; continue; }
      let ax = 0, ay = 0, az = 0, n = 0;
      for (let e = 0; e < 12; e++) {
        const a = EA[e], b = EB[e];
        if ((v[a] < 0) === (v[b] < 0)) continue;
        const t = v[a] / (v[a] - v[b]);
        ax += cx[a] + (cx[b] - cx[a]) * t; ay += cy[a] + (cy[b] - cy[a]) * t; az += cz[a] + (cz[b] - cz[a]) * t; n++;
      }
      cellVert[ci] = pos.length / 3;
      pos.push(min[0] + (i + ax / n) * h, min[1] + (j + ay / n) * h, min[2] + (k + az / n) * h);
    }
  }
  // faces: one quad per sign-changing grid edge (look only at cells that produced vertices)
  const index = [];
  const cv = (i, j, k) => cellVert[i + cnx * (j + cny * k)];
  const quad = (a, b, c, d, flip) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (flip) index.push(a, c, b, a, d, c); else index.push(a, b, c, a, c, d);
  };
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    if (cellVert[i + cnx * (j + cny * k)] < 0) continue; // the edge's cells all share (i,j,k)
    const id = i + sy * j + sz * k;
    const s0 = field[id] < 0;
    if ((field[id + sx] < 0) !== s0) quad(cv(i, j - 1, k - 1), cv(i, j, k - 1), cv(i, j, k), cv(i, j - 1, k), !s0);
    if ((field[id + sy] < 0) !== s0) quad(cv(i - 1, j, k - 1), cv(i - 1, j, k), cv(i, j, k), cv(i, j, k - 1), !s0);
    if ((field[id + sz] < 0) !== s0) quad(cv(i - 1, j - 1, k), cv(i, j - 1, k), cv(i, j, k), cv(i - 1, j, k), !s0);
  }
  // project onto true surface + analytic normals
  const __t1 = performance.now();
  const N = pos.length / 3, nor = new Float32Array(N * 3), g = [0, 0, 0];
  for (let i = 0; i < N; i++) {
    let x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
    for (let it = 0; it < project; it++) {
      const d = sculpt.eval(x, y, z);
      if (Math.abs(d) > h * 1.5) break;
      sculpt.grad(x, y, z, g);
      x -= g[0] * d; y -= g[1] * d; z -= g[2] * d;
    }
    sculpt.grad(x, y, z, g, h * 0.35);
    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    nor[i * 3] = g[0]; nor[i * 3 + 1] = g[1]; nor[i * 3 + 2] = g[2];
  }
  PROF.proj += performance.now() - __t1;
  const geo = new THREE.BufferGeometry();
  const P32 = new Float32Array(pos), I32 = new Uint32Array(index);
  geo.setAttribute('position', new THREE.BufferAttribute(P32, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setIndex(new THREE.BufferAttribute(I32, 1));
  const __t2 = performance.now();
  let aoArr = null;
  if (ao) { aoArr = computeAO(sculpt, pos, nor, aoScale); geo.setAttribute('ao', new THREE.BufferAttribute(aoArr, 1)); }
  PROF.ao += performance.now() - __t2;
  const entry = { pos: P32, nor, idx: I32, ao: aoArr };
  POLY_CACHE.map.set(key, entry); POLY_CACHE.fresh.set(key, entry);
  PROF.poly += performance.now() - __t0;
  return geo;
}

/** Classic SDF ambient occlusion: march along the normal and compare distances. */
export function computeAO(sculpt, pos, nor, scale = 1, extra = null) {
  const N = pos.length / 3, out = new Float32Array(N);
  const steps = [0.006, 0.014, 0.03, 0.06].map((s) => s * scale);
  for (let i = 0; i < N; i++) {
    const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2], a = nor[i * 3], b = nor[i * 3 + 1], c = nor[i * 3 + 2];
    let occ = 0, w = 1;
    for (const s of steps) {
      let d = sculpt.eval(x + a * s, y + b * s, z + c * s);
      if (extra) d = Math.min(d, extra.eval(x + a * s, y + b * s, z + c * s));
      occ += w * Math.max(0, s - d) / s; w *= 0.6;
    }
    out[i] = clamp(1 - occ * 0.55, 0.15, 1);
  }
  return out;
}

/**
 * Bone weights: each tagged primitive "owns" a bone; a vertex is weighted by
 * how close it is to each bone's primitives (soft-min of distances).
 * `influences` add localised deformers (face rig).
 */
export function skinWeights(geo, prims, boneIndex, opts = {}) { const __t = performance.now(); const r = skinWeights_(geo, prims, boneIndex, opts); PROF.skin += performance.now() - __t; return r; }
function skinWeights_(geo, prims, boneIndex, { softness = 0.02, influences = [] } = {}) {
  const pos = geo.attributes.position.array, N = pos.length / 3;
  const si = new Uint16Array(N * 4), sw = new Float32Array(N * 4);
  const boneD = new Map();
  for (let i = 0; i < N; i++) {
    const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
    boneD.clear();
    let dmin = 1e9;
    for (const p of prims) {
      const d = Math.max(p.f(x, y, z, p), 0);
      const cur = boneD.get(p.bone);
      if (cur === undefined || d < cur) boneD.set(p.bone, d);
      if (d < dmin) dmin = d;
    }
    let ws = [];
    for (const [bone, d] of boneD) { const w = Math.exp(-(d - dmin) / softness); if (w > 0.01) ws.push([bone, w]); }
    let tot = ws.reduce((s, a) => s + a[1], 0);
    ws = ws.map(([b, w]) => [b, w / tot]);
    for (const inf of influences) {
      const dx = x - inf.c[0], dy = y - inf.c[1], dz = z - inf.c[2];
      const dist = Math.sqrt((dx / (inf.s?.[0] || 1)) ** 2 + (dy / (inf.s?.[1] || 1)) ** 2 + (dz / (inf.s?.[2] || 1)) ** 2);
      if (dist >= inf.r) continue;
      if (inf.only && !inf.only(x, y, z)) continue;
      const t = 1 - dist / inf.r, w = inf.w * t * t * (3 - 2 * t);
      ws = ws.map(([b, ww]) => [b, ww * (1 - w)]);
      ws.push([inf.bone, w]);
    }
    ws.sort((a, b) => b[1] - a[1]); ws = ws.slice(0, 4);
    tot = ws.reduce((s, a) => s + a[1], 0) || 1;
    for (let k = 0; k < 4; k++) {
      si[i * 4 + k] = ws[k] ? boneIndex[ws[k][0]] ?? 0 : 0;
      sw[i * 4 + k] = ws[k] ? ws[k][1] / tot : 0;
    }
  }
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  return geo;
}

export function boundsOf(prims, pad = 0.02) {
  const min = [1e9, 1e9, 1e9], max = [-1e9, -1e9, -1e9];
  for (const p of prims) { if (!p.min) continue; for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i], p.min[i] - pad); max[i] = Math.max(max[i], p.max[i] + pad); } }
  return { min, max };
}
