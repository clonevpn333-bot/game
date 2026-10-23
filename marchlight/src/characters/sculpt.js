// Implicit sculpting: characters are authored as signed distance fields (smoothly blended
// anatomical primitives, cloth folds as displacement) and meshed with sparse surface nets.
// Parts carry bone weights and surface tags; vertices get skin weights blended across
// neighbouring parts, baked ambient occlusion and analytic normals from the field.

export const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
export const smax = (a, b, k) => -smin(-a, -b, k);
export const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ------------------------------------------------------------------ noise
const hash3 = (x, y, z) => { let h = (x * 374761393 + y * 668265263 + z * 1274126177) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export function vnoise(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  let fx = x - ix, fy = y - iy, fz = z - iz;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz);
  const a = hash3(ix, iy, iz), b = hash3(ix + 1, iy, iz), c = hash3(ix, iy + 1, iz), d = hash3(ix + 1, iy + 1, iz);
  const e = hash3(ix, iy, iz + 1), f = hash3(ix + 1, iy, iz + 1), g = hash3(ix, iy + 1, iz + 1), h = hash3(ix + 1, iy + 1, iz + 1);
  const x0 = a + (b - a) * fx, x1 = c + (d - c) * fx, x2 = e + (f - e) * fx, x3 = g + (h - g) * fx;
  const y0 = x0 + (x1 - x0) * fy, y1 = x2 + (x3 - x2) * fy;
  return y0 + (y1 - y0) * fz;
}

// ------------------------------------------------------------------ primitives
// Each primitive is { f(x,y,z) -> signed distance, box: [x0,y0,z0,x1,y1,z1] }.
function rotInv(rx = 0, ry = 0, rz = 0) {
  // rows of R^T for Euler XYZ (matches THREE.Euler default order)
  const a = Math.cos(rx), b = Math.sin(rx), c = Math.cos(ry), d = Math.sin(ry), e = Math.cos(rz), f = Math.sin(rz);
  const ae = a * e, af = a * f, be = b * e, bf = b * f;
  const m = [c * e, -c * f, d, af + be * d, ae - bf * d, -b * c, bf - ae * d, be + af * d, a * c]; // R (row-major)
  return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]]; // transpose
}
function oriented(cx, cy, cz, rot, fLocal, rad) {
  if (!rot) return { f: (x, y, z) => fLocal(x - cx, y - cy, z - cz), box: [cx - rad, cy - rad, cz - rad, cx + rad, cy + rad, cz + rad] };
  const m = rotInv(...rot);
  return {
    f: (x, y, z) => { const px = x - cx, py = y - cy, pz = z - cz; return fLocal(m[0] * px + m[1] * py + m[2] * pz, m[3] * px + m[4] * py + m[5] * pz, m[6] * px + m[7] * py + m[8] * pz); },
    box: [cx - rad, cy - rad, cz - rad, cx + rad, cy + rad, cz + rad],
  };
}
export function ellipsoid(cx, cy, cz, rx, ry, rz, rot = null) {
  const f = (x, y, z) => {
    const px = x / rx, py = y / ry, pz = z / rz, k0 = Math.sqrt(px * px + py * py + pz * pz);
    const qx = px / rx, qy = py / ry, qz = pz / rz, k1 = Math.sqrt(qx * qx + qy * qy + qz * qz);
    return k1 < 1e-9 ? -Math.min(rx, ry, rz) : k0 * (k0 - 1) / k1;
  };
  if (!rot) return { f: (x, y, z) => f(x - cx, y - cy, z - cz), box: [cx - rx, cy - ry, cz - rz, cx + rx, cy + ry, cz + rz] };
  return oriented(cx, cy, cz, rot, f, Math.max(rx, ry, rz));
}
export const sphere = (cx, cy, cz, r) => ({ f: (x, y, z) => Math.hypot(x - cx, y - cy, z - cz) - r, box: [cx - r, cy - r, cz - r, cx + r, cy + r, cz + r] });
// Cone with rounded ends: radius r1 at a, r2 at b (iq).
export function roundCone(a, b, r1, r2) {
  const bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2];
  const l2 = bax * bax + bay * bay + baz * baz, rr = r1 - r2, a2 = l2 - rr * rr, il2 = 1 / l2;
  const R = Math.max(r1, r2);
  return {
    f: (x, y, z) => {
      const pax = x - a[0], pay = y - a[1], paz = z - a[2];
      const yy = pax * bax + pay * bay + paz * baz, zz = yy - l2;
      const xvx = pax * l2 - bax * yy, xvy = pay * l2 - bay * yy, xvz = paz * l2 - baz * yy;
      const x2 = xvx * xvx + xvy * xvy + xvz * xvz, y2 = yy * yy * l2, z2 = zz * zz * l2;
      const k = Math.sign(rr) * rr * rr * x2;
      if (Math.sign(zz) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
      if (Math.sign(yy) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
      return (Math.sqrt(x2 * a2 * il2) + yy * rr) * il2 - r1;
    },
    box: [Math.min(a[0], b[0]) - R, Math.min(a[1], b[1]) - R, Math.min(a[2], b[2]) - R, Math.max(a[0], b[0]) + R, Math.max(a[1], b[1]) + R, Math.max(a[2], b[2]) + R],
  };
}
export const capsule = (a, b, r) => roundCone(a, b, r, r);
export function roundBox(cx, cy, cz, hx, hy, hz, r, rot = null) {
  const f = (x, y, z) => {
    const qx = Math.abs(x) - hx, qy = Math.abs(y) - hy, qz = Math.abs(z) - hz;
    const ox = Math.max(qx, 0), oy = Math.max(qy, 0), oz = Math.max(qz, 0);
    return Math.sqrt(ox * ox + oy * oy + oz * oz) + Math.min(Math.max(qx, qy, qz), 0) - r;
  };
  const rad = Math.hypot(hx, hy, hz) + r;
  if (!rot) return { f: (x, y, z) => f(x - cx, y - cy, z - cz), box: [cx - hx - r, cy - hy - r, cz - hz - r, cx + hx + r, cy + hy + r, cz + hz + r] };
  return oriented(cx, cy, cz, rot, f, rad);
}
// Torus around local y; sx/sz squash the ring into an ellipse.
export function torus(cx, cy, cz, R, r, rot = null, sx = 1, sz = 1) {
  const f = (x, y, z) => { const q = Math.hypot(x / sx, z / sz) - R; return Math.hypot(q, y) - r; };
  return oriented(cx, cy, cz, rot, f, R * Math.max(sx, sz) + r);
}
// Arbitrary function with an explicit bound.
export const custom = (f, box) => ({ f, box });

// ------------------------------------------------------------------ parts
// A part: an ordered list of ops on primitives (smooth union / smooth subtract / hard union /
// shell), an optional bump (cloth folds, hair grooves), bone weights and surface tags, all in the
// part's own rest space. `xf` maps sculpt space -> rest space (rigid, row-major 3x4) for limbs
// that are sculpted spread into an A-pose.
export class Part {
  constructor(name, { k = 0.02, xf = null, weights, tag, bump = null, bumpAmp = 0 } = {}) {
    this.name = name; this.k = k; this.xf = xf; this.weights = weights; this.tag = tag; this.bump = bump; this.bumpAmp = bumpAmp;
    this.ops = []; this.box = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
  }
  add(p, k = this.k) { this.ops.push({ p, m: 0, k }); this._grow(p.box); return this; }
  sub(p, k = this.k * 0.5) { this.ops.push({ p, m: 1, k }); return this; }
  hard(p) { this.ops.push({ p, m: 2, k: 0 }); this._grow(p.box); return this; }
  // replace the running distance with max(d, p) (clip)
  clip(p, k = 0) { this.ops.push({ p, m: 3, k }); return this; }
  _grow(b) { for (let i = 0; i < 3; i++) { this.box[i] = Math.min(this.box[i], b[i]); this.box[i + 3] = Math.max(this.box[i + 3], b[i + 3]); } }
  toRest(x, y, z, out) {
    const m = this.xf; if (!m) { out[0] = x; out[1] = y; out[2] = z; return out; }
    out[0] = m[0] * x + m[1] * y + m[2] * z + m[3]; out[1] = m[4] * x + m[5] * y + m[6] * z + m[7]; out[2] = m[8] * x + m[9] * y + m[10] * z + m[11];
    return out;
  }
  // Acceleration: a coarse grid over the part listing the ops that can matter in each cell.
  _prepare() {
    const c = this._cs = 0.025, PAD = this._accPad = 0.03, b = this.box;
    const ox = this._ox = b[0] - PAD - 0.02, oy = this._oy = b[1] - PAD - 0.02, oz = this._oz = b[2] - PAD - 0.02;
    const gx = this._gx = Math.ceil((b[3] - b[0] + 2 * PAD + 0.04) / c) + 1, gy = this._gy = Math.ceil((b[4] - b[1] + 2 * PAD + 0.04) / c) + 1, gz = this._gz = Math.ceil((b[5] - b[2] + 2 * PAD + 0.04) / c) + 1;
    this._cells = new Array(gx * gy * gz);
    const ops = this.ops;
    for (let k = 0; k < gz; k++) for (let j = 0; j < gy; j++) for (let i = 0; i < gx; i++) {
      const cx0 = ox + i * c, cy0 = oy + j * c, cz0 = oz + k * c, cx1 = cx0 + c, cy1 = cy0 + c, cz1 = cz0 + c;
      const list = [];
      for (let n = 0; n < ops.length; n++) {
        const op = ops[n], pb = op.p.box, Q = PAD + op.k;
        if (op.m === 3 || !(cx1 < pb[0] - Q || cy1 < pb[1] - Q || cz1 < pb[2] - Q || cx0 > pb[3] + Q || cy0 > pb[4] + Q || cz0 > pb[5] + Q)) list.push(op);
      }
      this._cells[i + gx * (j + gy * k)] = list;
    }
    this._ready = true;
  }
  // distance in rest space; pad = how far from a primitive we still need an accurate value
  dist(x, y, z, pad) {
    const b = this.box, P = pad + 0.02;
    if (x < b[0] - P || y < b[1] - P || z < b[2] - P || x > b[3] + P || y > b[4] + P || z > b[5] + P) return 1e3;
    if (!this._ready) this._prepare();
    let ops = this.ops;
    if (pad <= this._accPad) {
      const i = Math.floor((x - this._ox) / this._cs), j = Math.floor((y - this._oy) / this._cs), k = Math.floor((z - this._oz) / this._cs);
      if (i >= 0 && j >= 0 && k >= 0 && i < this._gx && j < this._gy && k < this._gz) ops = this._cells[i + this._gx * (j + this._gy * k)];
    }
    let d = 1e3;
    for (let n = 0; n < ops.length; n++) {
      const op = ops[n], pb = op.p.box, Q = pad + op.k;
      if (x < pb[0] - Q || y < pb[1] - Q || z < pb[2] - Q || x > pb[3] + Q || y > pb[4] + Q || z > pb[5] + Q) { if (op.m === 3) d = Math.max(d, Q); continue; }
      const v = op.p.f(x, y, z);
      if (op.m === 0) d = d >= 999 ? v : smin(d, v, op.k);
      else if (op.m === 1) d = op.k > 0 ? smax(d, -v, op.k) : Math.max(d, -v);
      else if (op.m === 2) d = Math.min(d, v);
      else d = op.k > 0 ? smax(d, v, op.k) : Math.max(d, v);
    }
    if (this.bump && d < pad + this.bumpAmp + 0.01) d -= this.bump(x, y, z);
    return d;
  }
}

// A rigid transform (sculpt space -> rest space) for rotating a limb about a pivot around z.
export function pivotZ(px, py, pz, angle) {
  // rest = R(-angle) * (p - pivot) + pivot
  const c = Math.cos(-angle), s = Math.sin(-angle);
  return [c, -s, 0, px - c * px + s * py, s, c, 0, py - s * px - c * py, 0, 0, 1, 0];
}
export function invertXf(m) { // inverse of a rigid 3x4
  const r = [m[0], m[4], m[8], m[1], m[5], m[9], m[2], m[6], m[10]];
  return [r[0], r[1], r[2], -(r[0] * m[3] + r[1] * m[7] + r[2] * m[11]), r[3], r[4], r[5], -(r[3] * m[3] + r[4] * m[7] + r[5] * m[11]), r[6], r[7], r[8], -(r[6] * m[3] + r[7] * m[7] + r[8] * m[11])];
}

// A field: parts plus blend edges between neighbouring parts (non-neighbours union hard, so an
// arm resting near a hip never fuses to it).
export class Field {
  constructor(parts, edges = []) {
    this.parts = parts; this.edges = edges.map(([a, b, k]) => [parts.indexOf(a), parts.indexOf(b), k]);
    this.ea = Int32Array.from(this.edges.map(e => e[0])); this.eb = Int32Array.from(this.edges.map(e => e[1])); this.ek = Float64Array.from(this.edges.map(e => e[2]));
    this.dp = new Float64Array(parts.length); this._r = [0, 0, 0];
    this.nbr = parts.map((p, i) => [i, ...this.edges.filter(e => e[0] === i || e[1] === i).map(e => e[0] === i ? e[1] : e[0])]);
    // per-part bounds in sculpt space for quick rejection
    this.sb = parts.map(p => { const f = new Field.Bounds(p); return f; });
  }
  eval(x, y, z, pad = 0.01) {
    const dp = this.dp, r = this._r, parts = this.parts, sb = this.sb; let d = 1e3;
    for (let i = 0; i < parts.length; i++) {
      const b = sb[i], P = pad + 0.03;
      if (x < b[0] - P || y < b[1] - P || z < b[2] - P || x > b[3] + P || y > b[4] + P || z > b[5] + P) { dp[i] = 1e3; continue; }
      const p = parts[i]; p.toRest(x, y, z, r); const v = p.dist(r[0], r[1], r[2], pad); dp[i] = v; if (v < d) d = v;
    }
    const ea = this.ea, eb = this.eb, ek = this.ek;
    for (let n = 0; n < ea.length; n++) { const va = dp[ea[n]], vb = dp[eb[n]], k = ek[n]; if (va < 0.5 && Math.abs(va - vb) < k) { const s = smin(va, vb, k); if (s < d) d = s; } }
    return d;
  }
  // bounds in sculpt space
  bounds(pad = 0.02) {
    const B = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
    for (const p of this.parts) {
      const inv = p.xf ? invertXf(p.xf) : null, b = p.box;
      for (let c = 0; c < 8; c++) {
        let x = c & 1 ? b[3] : b[0], y = c & 2 ? b[4] : b[1], z = c & 4 ? b[5] : b[2];
        if (inv) { const X = inv[0] * x + inv[1] * y + inv[2] * z + inv[3], Y = inv[4] * x + inv[5] * y + inv[6] * z + inv[7], Z = inv[8] * x + inv[9] * y + inv[10] * z + inv[11]; x = X; y = Y; z = Z; }
        B[0] = Math.min(B[0], x); B[1] = Math.min(B[1], y); B[2] = Math.min(B[2], z); B[3] = Math.max(B[3], x); B[4] = Math.max(B[4], y); B[5] = Math.max(B[5], z);
      }
    }
    for (let i = 0; i < 3; i++) { B[i] -= pad; B[i + 3] += pad; }
    return B;
  }
}

Field.Bounds = function (p) {
  const inv = p.xf ? invertXf(p.xf) : null, b = p.box, B = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
  for (let c = 0; c < 8; c++) {
    let x = c & 1 ? b[3] : b[0], y = c & 2 ? b[4] : b[1], z = c & 4 ? b[5] : b[2];
    if (inv) { const X = inv[0] * x + inv[1] * y + inv[2] * z + inv[3], Y = inv[4] * x + inv[5] * y + inv[6] * z + inv[7], Z = inv[8] * x + inv[9] * y + inv[10] * z + inv[11]; x = X; y = Y; z = Z; }
    B[0] = Math.min(B[0], x); B[1] = Math.min(B[1], y); B[2] = Math.min(B[2], z); B[3] = Math.max(B[3], x); B[4] = Math.max(B[4], y); B[5] = Math.max(B[5], z);
  }
  return B;
};

// ------------------------------------------------------------------ surface nets
// opts: h (cell size), bounds, keep(cx,cy,cz)->bool on triangle centroids, nEps (normal epsilon),
// ao: [step, count] for baked occlusion, sigma (weight blend width)
export function meshField(field, opts) {
  const h = opts.h, Bd = opts.bounds || field.bounds();
  const x0 = Bd[0], y0 = Bd[1], z0 = Bd[2];
  const nx = Math.ceil((Bd[3] - x0) / h) + 1, ny = Math.ceil((Bd[4] - y0) / h) + 1, nz = Math.ceil((Bd[5] - z0) / h) + 1;
  const N = nx * ny * nz;
  const bumpMax = Math.max(0, ...field.parts.map(p => p.bump ? p.bumpAmp : 0));
  const margin = h * 1.2 + bumpMax + 0.001;
  // lazily evaluated lattice
  const val = new Float32Array(N).fill(NaN);
  let evals = 0;
  const V = (i, j, k) => { const p = i + nx * (j + ny * k); let v = val[p]; if (v !== v) { v = val[p] = field.eval(x0 + i * h, y0 + j * h, z0 + k * h, margin); evals++; } return v; };
  // surface-following: flood from seed cells, visiting only cells the surface passes through
  const cnx = nx - 1, cny = ny - 1, cnz = nz - 1;
  const cellV = new Int32Array(cnx * cny * cnz).fill(-1), seen = new Uint8Array(cnx * cny * cnz);
  const P = [], cells = [];
  const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const cv = new Float32Array(8);
  const queue = [];
  const visit = (i, j, k) => {
    if (i < 0 || j < 0 || k < 0 || i >= cnx || j >= cny || k >= cnz) return;
    const ci = i + cnx * (j + cny * k); if (seen[ci]) return; seen[ci] = 1; queue.push(ci);
  };
  const flood = () => {
    while (queue.length) {
      const ci = queue.pop(); const i = ci % cnx, j = ((ci / cnx) | 0) % cny, k = (ci / (cnx * cny)) | 0;
      let mask = 0;
      for (let c = 0; c < 8; c++) { const v = V(i + (c & 1), j + ((c >> 1) & 1), k + ((c >> 2) & 1)); cv[c] = v; if (v < 0) mask |= 1 << c; }
      if (mask === 0 || mask === 255) continue;
      let sx = 0, sy = 0, sz = 0, n = 0;
      for (const [a, b] of E) {
        const va = cv[a], vb = cv[b]; if ((va < 0) === (vb < 0)) continue;
        const t = va / (va - vb);
        sx += (a & 1) + ((b & 1) - (a & 1)) * t; sy += ((a >> 1) & 1) + (((b >> 1) & 1) - ((a >> 1) & 1)) * t; sz += ((a >> 2) & 1) + (((b >> 2) & 1) - ((a >> 2) & 1)) * t; n++;
      }
      cellV[ci] = P.length / 3;
      P.push(x0 + (i + sx / n) * h, y0 + (j + sy / n) * h, z0 + (k + sz / n) * h);
      cells.push(i, j, k);
      // spread across faces the surface crosses
      if ((mask & 0x55) !== 0 && (mask & 0x55) !== 0x55) visit(i - 1, j, k);
      if ((mask & 0xaa) !== 0 && (mask & 0xaa) !== 0xaa) visit(i + 1, j, k);
      if ((mask & 0x33) !== 0 && (mask & 0x33) !== 0x33) visit(i, j - 1, k);
      if ((mask & 0xcc) !== 0 && (mask & 0xcc) !== 0xcc) visit(i, j + 1, k);
      if ((mask & 0x0f) !== 0 && (mask & 0x0f) !== 0x0f) visit(i, j, k - 1);
      if ((mask & 0xf0) !== 0 && (mask & 0xf0) !== 0xf0) visit(i, j, k + 1);
    }
  };
  // seeds: a coarse lattice; along each coarse edge that changes sign, find the fine edge and
  // flood from a cell beside it (once per component)
  const S = opts.seedStep ?? 4;
  const gx = Math.floor((nx - 1) / S) + 1, gy = Math.floor((ny - 1) / S) + 1, gz = Math.floor((nz - 1) / S) + 1;
  for (let k = 0; k < gz; k++) for (let j = 0; j < gy; j++) for (let i = 0; i < gx; i++) {
    const v0 = V(i * S, j * S, k * S);
    for (const [di, dj, dk] of [[1, 0, 0], [0, 1, 0], [0, 0, 1]]) {
      const i1 = i + di, j1 = j + dj, k1 = k + dk; if (i1 >= gx || j1 >= gy || k1 >= gz) continue;
      const v1 = V(i1 * S, j1 * S, k1 * S); if ((v0 < 0) === (v1 < 0)) continue;
      // walk the fine edge
      let pi_ = i * S, pj = j * S, pk = k * S, pv = v0;
      for (let s = 1; s <= S; s++) {
        const qi = i * S + di * s, qj = j * S + dj * s, qk = k * S + dk * s, qv = V(qi, qj, qk);
        if ((pv < 0) !== (qv < 0)) {
          const ci = Math.min(pi_, cnx - 1) + cnx * (Math.min(pj, cny - 1) + cny * Math.min(pk, cnz - 1));
          if (cellV[ci] < 0 && !seen[ci]) { // also try the neighbours sharing that edge
            const ii = Math.min(pi_, cnx - 1), jj = Math.min(pj, cny - 1), kk = Math.min(pk, cnz - 1);
            visit(ii, jj, kk);
            if (di) { visit(ii, jj - 1, kk); visit(ii, jj, kk - 1); visit(ii, jj - 1, kk - 1); }
            if (dj) { visit(ii - 1, jj, kk); visit(ii, jj, kk - 1); visit(ii - 1, jj, kk - 1); }
            if (dk) { visit(ii - 1, jj, kk); visit(ii, jj - 1, kk); visit(ii - 1, jj - 1, kk); }
            flood();
          }
          break;
        }
        pi_ = qi; pj = qj; pk = qk; pv = qv;
      }
    }
  }
  if (opts.stats) { opts.stats.grid = evals; opts.stats.N = N; }
  const pi = (i, j, k) => i + nx * (j + ny * k);
  // faces
  const I = [];
  const quad = (a, b, c, d, nxp, nyp, nzp) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    // orient against the expected normal
    const ax = P[a * 3], ay = P[a * 3 + 1], az = P[a * 3 + 2];
    const ux = P[b * 3] - ax, uy = P[b * 3 + 1] - ay, uz = P[b * 3 + 2] - az, vx = P[c * 3] - ax, vy = P[c * 3 + 1] - ay, vz = P[c * 3 + 2] - az;
    const gx = uy * vz - uz * vy, gy = uz * vx - ux * vz, gz = ux * vy - uy * vx;
    if (gx * nxp + gy * nyp + gz * nzp < 0) { const t = b; b = d; d = t; }
    const dac = (P[a * 3] - P[c * 3]) ** 2 + (P[a * 3 + 1] - P[c * 3 + 1]) ** 2 + (P[a * 3 + 2] - P[c * 3 + 2]) ** 2;
    const dbd = (P[b * 3] - P[d * 3]) ** 2 + (P[b * 3 + 1] - P[d * 3 + 1]) ** 2 + (P[b * 3 + 2] - P[d * 3 + 2]) ** 2;
    if (dac < dbd) I.push(a, b, c, a, c, d); else I.push(a, b, d, b, c, d);
  };
  const C = (i, j, k) => cellV[i + cnx * (j + cny * k)];
  for (let q = 0; q < cells.length; q += 3) {
    const i = cells[q], j = cells[q + 1], k = cells[q + 2];
    const v0 = val[pi(i, j, k)], in0 = v0 < 0;
    if (j > 0 && k > 0 && in0 !== (val[pi(i + 1, j, k)] < 0)) quad(C(i, j, k), C(i, j - 1, k), C(i, j - 1, k - 1), C(i, j, k - 1), in0 ? 1 : -1, 0, 0);
    if (i > 0 && k > 0 && in0 !== (val[pi(i, j + 1, k)] < 0)) quad(C(i, j, k), C(i - 1, j, k), C(i - 1, j, k - 1), C(i, j, k - 1), 0, in0 ? 1 : -1, 0);
    if (i > 0 && j > 0 && in0 !== (val[pi(i, j, k + 1)] < 0)) quad(C(i, j, k), C(i - 1, j, k), C(i - 1, j - 1, k), C(i, j - 1, k), 0, 0, in0 ? 1 : -1);
  }
  // project onto the surface and take analytic normals
  const nv = P.length / 3, pos = new Float32Array(P), nrm = new Float32Array(nv * 3);
  // one Newton step onto the surface; a tetrahedral gradient (4 taps) gives the normal
  const e = opts.nEps ?? h * 0.35, f = (x, y, z) => field.eval(x, y, z, 0.004);
  for (let v = 0; v < nv; v++) {
    const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
    const a = f(x + e, y - e, z - e), b = f(x - e, y - e, z + e), c = f(x - e, y + e, z - e), d4 = f(x + e, y + e, z + e);
    const gx = a - b - c + d4, gy = -a - b + c + d4, gz = -a + b - c + d4;
    const d = (a + b + c + d4) * 0.25;
    const L = Math.hypot(gx, gy, gz) || 1, nx_ = gx / L, ny_ = gy / L, nz_ = gz / L;
    let mv = Math.max(-h * 0.6, Math.min(h * 0.6, d));
    let px = x - nx_ * mv, py = y - ny_ * mv, pz = z - nz_ * mv;
    const d2 = f(px, py, pz); mv = Math.max(-h * 0.3, Math.min(h * 0.3, d2));
    pos[v * 3] = px - nx_ * mv; pos[v * 3 + 1] = py - ny_ * mv; pos[v * 3 + 2] = pz - nz_ * mv;
    nrm[v * 3] = nx_; nrm[v * 3 + 1] = ny_; nrm[v * 3 + 2] = nz_;
  }
  // exact plane clips (keep a*x + b*y + c*z + d >= 0): new vertices land on the plane, so
  // pieces sculpted separately meet on a clean seam
  let posA = pos, nrmA = nrm, nvA = nv, Icl = I;
  if (opts.clip) for (const pl of opts.clip) {
    const r = clipPlane(posA, nrmA, nvA, Icl, pl);
    posA = r.pos; nrmA = r.nrm; nvA = r.count; Icl = r.idx;
  }
  return compact(posA, nrmA, nvA, Icl, opts.keep);
}

// Clip a triangle mesh against a plane; f(x,y,z) = a*x+b*y+c*z+d >= 0 is kept. pl may also be a
// function returning that signed value.
function clipPlane(pos, nrm, nv, I, pl) {
  const f = typeof pl === 'function' ? pl : (x, y, z) => pl[0] * x + pl[1] * y + pl[2] * z + pl[3];
  const P = Array.from(pos.subarray(0, nv * 3)), N = Array.from(nrm.subarray(0, nv * 3));
  const sd = new Float32Array(nv); for (let v = 0; v < nv; v++) sd[v] = f(P[v * 3], P[v * 3 + 1], P[v * 3 + 2]);
  const edge = new Map(), out = [];
  const cut = (a, b) => {
    const k = a < b ? a * 1e7 + b : b * 1e7 + a; let v = edge.get(k); if (v !== undefined) return v;
    const t = sd[a] / (sd[a] - sd[b]); v = P.length / 3;
    for (let c = 0; c < 3; c++) { P.push(P[a * 3 + c] + (P[b * 3 + c] - P[a * 3 + c]) * t); N.push(N[a * 3 + c] + (N[b * 3 + c] - N[a * 3 + c]) * t); }
    const L = Math.hypot(N[v * 3], N[v * 3 + 1], N[v * 3 + 2]) || 1; N[v * 3] /= L; N[v * 3 + 1] /= L; N[v * 3 + 2] /= L;
    edge.set(k, v); return v;
  };
  for (let t = 0; t < I.length; t += 3) {
    const tri = [I[t], I[t + 1], I[t + 2]], ins = tri.map(v => sd[v] >= 0), n = ins[0] + ins[1] + ins[2];
    if (n === 3) { out.push(...tri); continue; }
    if (n === 0) continue;
    // rotate so the odd vertex is first
    let r = 0; for (let k = 0; k < 3; k++) if (n === 1 ? ins[k] : !ins[k]) r = k;
    const a = tri[r], b = tri[(r + 1) % 3], c = tri[(r + 2) % 3];
    const ab = cut(a, b), ac = cut(a, c);
    if (n === 1) out.push(a, ab, ac);
    else out.push(ab, b, c, ab, c, ac);
  }
  return { pos: new Float32Array(P), nrm: new Float32Array(N), count: P.length / 3, idx: out };
}

function compact(pos, nrm, nv, I, keepFn) {
  let idx = I;
  if (keepFn) {
    const keep = keepFn; idx = [];
    for (let t = 0; t < I.length; t += 3) {
      const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
      if (keep((pos[a] + pos[b] + pos[c]) / 3, (pos[a + 1] + pos[b + 1] + pos[c + 1]) / 3, (pos[a + 2] + pos[b + 2] + pos[c + 2]) / 3, I[t], I[t + 1], I[t + 2])) idx.push(I[t], I[t + 1], I[t + 2]);
    }
  }
  const remap = new Int32Array(nv).fill(-1); let m = 0;
  for (const v of idx) if (remap[v] < 0) remap[v] = m++;
  const pos2 = new Float32Array(m * 3), nrm2 = new Float32Array(m * 3);
  for (let v = 0; v < nv; v++) { const r = remap[v]; if (r < 0) continue; for (let c = 0; c < 3; c++) { pos2[r * 3 + c] = pos[v * 3 + c]; nrm2[r * 3 + c] = nrm[v * 3 + c]; } }
  const idx2 = new Uint32Array(idx.length); for (let t = 0; t < idx.length; t++) idx2[t] = remap[idx[t]];
  return { pos: pos2, nrm: nrm2, idx: idx2, count: m };
}

// Per-vertex attributes: blended bone weights, the nearest part's tag, baked occlusion.
// Returns skinIndex (4 per vertex), skinWeight, tag, ao, aux.
export function attributes(field, mesh, { sigma = 0.012, aoStep = 0.012, aoN = 3, aoK = 2.2 } = {}) {
  const n = mesh.count, si = new Uint16Array(n * 4), sw = new Float32Array(n * 4), tag = new Uint8Array(n), tag2 = new Uint8Array(n), mask = new Float32Array(n), pair = new Uint8Array(n), ao = new Float32Array(n), aux = new Float32Array(n), part = new Uint8Array(n);
  const r = [0, 0, 0], acc = new Map();
  for (let v = 0; v < n; v++) {
    const x = mesh.pos[v * 3], y = mesh.pos[v * 3 + 1], z = mesh.pos[v * 3 + 2];
    field.eval(x, y, z, 0.03);
    const dp = field.dp; let best = 0;
    for (let i = 1; i < dp.length; i++) if (dp[i] < dp[best]) best = i;
    acc.clear(); let tot = 0;
    for (const i of field.nbr[best]) {
      const dd = dp[i] - dp[best]; if (dd > sigma * 3) continue;
      const w = Math.exp(-dd / sigma); const p = field.parts[i]; p.toRest(x, y, z, r);
      for (const [b, bw] of p.weights(r[0], r[1], r[2])) { if (bw <= 0) continue; acc.set(b, (acc.get(b) || 0) + bw * w); tot += bw * w; }
    }
    const list = [...acc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4); let s = 0; for (const e of list) s += e[1];
    for (let k = 0; k < 4; k++) { si[v * 4 + k] = list[k] ? list[k][0] : 0; sw[v * 4 + k] = list[k] ? list[k][1] / s : 0; }
    const bp = field.parts[best]; bp.toRest(x, y, z, r); part[v] = best;
    const tg = bp.tag(r[0], r[1], r[2]); aux[v] = tg[1] || 0;
    // [tagP, aux, tagN, d, pair]: tagP where d > 0, tagN where d < 0; far from the boundary the
    // pair is dropped and both colours are the displayed one
    if (tg.length > 3 && Math.abs(tg[3]) < (bp.pairBand ?? 0.03)) { tag[v] = tg[0]; tag2[v] = tg[2]; mask[v] = tg[3]; pair[v] = tg[4] || 1; }
    else { const t = tg.length > 3 && tg[3] < 0 ? tg[2] : tg[0]; tag[v] = t; tag2[v] = t; mask[v] = 1; pair[v] = 0; }
    // occlusion: march along the normal and compare the field to the distance travelled
    const nx = mesh.nrm[v * 3], ny = mesh.nrm[v * 3 + 1], nz = mesh.nrm[v * 3 + 2];
    // occlusion relative to the field's local slope (the field is a bound, not an exact distance)
    let occ = 0, sca = 1; const d0 = field.eval(x, y, z, 0.004), e0 = aoStep * 0.35;
    const gs = Math.max(0.3, Math.min(1.2, (field.eval(x + nx * e0, y + ny * e0, z + nz * e0, 0.01) - d0) / e0));
    for (let i = 1; i <= aoN; i++) { const hs = aoStep * i; const d = (field.eval(x + nx * hs, y + ny * hs, z + nz * hs, hs + 0.01) - d0) / gs; occ += Math.max(0, hs - d) / hs * sca; sca *= 0.7; }
    ao[v] = Math.max(0.25, 1 - occ / aoK);
  }
  return { si, sw, tag, tag2, mask, pair, ao, aux, part };
}

// Drop connected components smaller than minTris triangles (specks where shells barely cross).
export function dropSpecks(mesh, minTris) {
  const n = mesh.count, idx = mesh.idx, parent = new Int32Array(n);
  for (let i = 0; i < n; i++) parent[i] = i;
  const find = (a) => { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; } return a; };
  for (let t = 0; t < idx.length; t += 3) { const a = find(idx[t]), b = find(idx[t + 1]), c = find(idx[t + 2]); parent[b] = a; parent[find(c)] = a; }
  const count = new Map();
  for (let t = 0; t < idx.length; t += 3) { const r = find(idx[t]); count.set(r, (count.get(r) || 0) + 1); }
  const out = [];
  for (let t = 0; t < idx.length; t += 3) if (count.get(find(idx[t])) >= minTris) out.push(idx[t], idx[t + 1], idx[t + 2]);
  mesh.idx = new Uint32Array(out);
  return mesh;
}

// Mirror a mesh across x = 0 (winding flipped), remapping bones.
export function mirror(mesh, at, boneMap) {
  const pos = mesh.pos.slice(), nrm = mesh.nrm.slice(), idx = mesh.idx.slice(), si = at.si.slice();
  for (let v = 0; v < mesh.count; v++) { pos[v * 3] *= -1; nrm[v * 3] *= -1; }
  for (let t = 0; t < idx.length; t += 3) { const a = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = a; }
  for (let i = 0; i < si.length; i++) si[i] = boneMap[si[i]] ?? si[i];
  return [{ pos, nrm, idx, count: mesh.count }, { ...at, si }];
}
