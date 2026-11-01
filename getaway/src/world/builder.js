// GETAWAY! — geometry batcher: accumulates boxes/quads/arbitrary geometry per (chunk, material)
import * as THREE from 'three';

class Batch {
  constructor() { this.p = []; this.n = []; this.uv = []; this.c = []; this.idx = []; this.vc = false; this.ex = []; }
}
const _v = new THREE.Vector3(), _nrm = new THREE.Matrix3();

export class Builder {
  constructor(chunk = 200) { this.chunk = chunk; this.batches = new Map(); }
  _b(mat, x, z, chunked = true) {
    const key = (chunked ? Math.floor(x / this.chunk) + ',' + Math.floor(z / this.chunk) : 'g') + '|' + mat;
    let b = this.batches.get(key); if (!b) { b = new Batch(); b.mat = mat; b.key = key; this.batches.set(key, b); } return b;
  }
  // world-space UV box. o: {tw, th, u0, v0, faces:'all'|'sides'|'top'|..., color:[r,g,b], chunked}
  box(mat, x0, y0, z0, x1, y1, z1, o = {}) {
    const b = this._b(mat, (x0 + x1) / 2, (z0 + z1) / 2, o.chunked !== false);
    const tw = o.tw || 4, th = o.th || tw, base = o.base ?? y0; const col = o.color;
    const faces = o.faces || 'all';
    const quad = (a, bb, c, d, n, uvs, em = 0) => {
      const i = b.p.length / 3;
      for (const v of [a, bb, c, d]) b.p.push(v[0], v[1], v[2]);
      for (let k = 0; k < 4; k++) b.n.push(n[0], n[1], n[2]);
      b.uv.push(...uvs);
      if (col) { b.vc = true; for (let k = 0; k < 4; k++) b.c.push(col[0], col[1], col[2]); } else if (b.vc) for (let k = 0; k < 4; k++) b.c.push(1, 1, 1);
      if (o.ex !== undefined) for (let k = 0; k < 4; k++) b.ex.push(o.ex);
      b.idx.push(i, i + 1, i + 2, i, i + 2, i + 3);
    };
    const want = (f) => faces === 'all' || faces.includes(f);
    const uo = o.u0 || 0;
    const vy0 = (y0 - base) / th, vy1 = (y1 - base) / th;
    if (want('pz')) quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], [uo + x0 / tw, vy0, uo + x1 / tw, vy0, uo + x1 / tw, vy1, uo + x0 / tw, vy1]);
    if (want('nz')) quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], [uo - x1 / tw, vy0, uo - x0 / tw, vy0, uo - x0 / tw, vy1, uo - x1 / tw, vy1]);
    if (want('px')) quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], [uo - z1 / tw, vy0, uo - z0 / tw, vy0, uo - z0 / tw, vy1, uo - z1 / tw, vy1]);
    if (want('nx')) quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], [uo + z0 / tw, vy0, uo + z1 / tw, vy0, uo + z1 / tw, vy1, uo + z0 / tw, vy1]);
    const ts = o.topScale || tw;
    if (want('py')) quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], [x0 / ts, z1 / ts, x1 / ts, z1 / ts, x1 / ts, z0 / ts, x0 / ts, z0 / ts]);
    if (want('ny')) quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0], [x0 / ts, z0 / ts, x1 / ts, z0 / ts, x1 / ts, z1 / ts, x0 / ts, z1 / ts]);
  }
  // horizontal quad with explicit uv mapping (for roads): corners in order, uvs flat array of 8
  quad(mat, pts, uvs, normal = [0, 1, 0], o = {}) {
    const cx = (pts[0][0] + pts[2][0]) / 2, cz = (pts[0][2] + pts[2][2]) / 2;
    const b = this._b(mat, cx, cz, o.chunked !== false); const i = b.p.length / 3;
    for (const v of pts) b.p.push(v[0], v[1], v[2]);
    for (let k = 0; k < 4; k++) b.n.push(normal[0], normal[1], normal[2]);
    b.uv.push(...uvs);
    if (o.color) { b.vc = true; for (let k = 0; k < 4; k++) b.c.push(...o.color); } else if (b.vc) for (let k = 0; k < 4; k++) b.c.push(1, 1, 1);
    b.idx.push(i, i + 1, i + 2, i, i + 2, i + 3);
  }
  // add a three.js geometry transformed by matrix
  geom(mat, geo, matrix, o = {}) {
    const g = geo.index ? geo : geo; const pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv;
    _v.set(0, 0, 0).applyMatrix4(matrix);
    const b = this._b(mat, _v.x, _v.z, o.chunked !== false); const i0 = b.p.length / 3;
    _nrm.getNormalMatrix(matrix);
    for (let i = 0; i < pos.count; i++) {
      _v.fromBufferAttribute(pos, i).applyMatrix4(matrix); b.p.push(_v.x, _v.y, _v.z);
      if (nor) { _v.fromBufferAttribute(nor, i).applyMatrix3(_nrm).normalize(); b.n.push(_v.x, _v.y, _v.z); } else b.n.push(0, 1, 0);
      if (uv) b.uv.push(uv.getX(i) * (o.uvScale || 1), uv.getY(i) * (o.uvScale || 1)); else b.uv.push(0, 0);
      if (o.color) { b.vc = true; b.c.push(...o.color); } else if (b.vc) b.c.push(1, 1, 1);
    }
    if (g.index) { const ix = g.index.array; for (let k = 0; k < ix.length; k++) b.idx.push(i0 + ix[k]); }
    else for (let k = 0; k < pos.count; k++) b.idx.push(i0 + k);
  }
  build(materials, parent, { shadows = true } = {}) {
    const meshes = [];
    for (const b of this.batches.values()) {
      if (!b.idx.length) continue;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(b.n, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
      if (b.vc) {
        // pad colors if mixed
        const need = b.p.length; if (b.c.length < need) { const pad = new Array(need - b.c.length).fill(1); b.c = pad.concat(b.c); }
        geo.setAttribute('color', new THREE.Float32BufferAttribute(b.c, 3));
      }
      geo.setIndex(b.p.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(b.idx, 1) : new THREE.Uint16BufferAttribute(b.idx, 1));
      geo.computeBoundingSphere(); geo.computeBoundingBox();
      let mat = materials[b.mat]; if (!mat) { console.warn('missing material', b.mat); mat = materials.default; }
      const m = new THREE.Mesh(geo, mat); m.matrixAutoUpdate = false; m.updateMatrix();
      const isGround = /road|isect|walk|grass|sand|plaza|concrete_g|dirt|rail|asph|lot/.test(b.mat);
      m.castShadow = shadows && !isGround && !mat.transparent; m.receiveShadow = shadows;
      m.userData.batch = b.key; parent.add(m); meshes.push(m);
    }
    this.batches.clear(); return meshes;
  }
}
