// Static geometry builder: authored boxes/cylinders/etc are batched per material
// and spatial cell into merged meshes, with Rapier colliders and climb metadata.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { G } from '../core/physics.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
const WHITE = new THREE.Color(1, 1, 1);

// Box geometry with UVs scaled to real-world size and baked vertical "AO".
function sizedBox(sx, sy, sz, texScale, ao) {
  const segY = ao ? Math.min(6, Math.max(1, Math.ceil(sy / 2.5))) : 1;
  const g = new THREE.BoxGeometry(sx, sy, sz, 1, segY, 1);
  const uv = g.attributes.uv, pos = g.attributes.position, nor = g.attributes.normal;
  for (let i = 0; i < uv.count; i++) {
    const nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i));
    const px = pos.getX(i) + sx / 2, py = pos.getY(i) + sy / 2, pz = pos.getZ(i) + sz / 2;
    let u, v;
    if (nx > 0.5) { u = pz; v = py; } else if (ny > 0.5) { u = px; v = pz; } else { u = px; v = py; }
    uv.setXY(i, u / texScale, v / texScale);
  }
  return g;
}

function applyColor(g, color, ao, bottomY, aoRange = 2.2, topDark = 0) {
  const pos = g.attributes.position, nor = g.attributes.normal;
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    let f = 1;
    if (ao) {
      const h = pos.getY(i) - bottomY;
      f = 0.5 + 0.5 * Math.min(1, Math.max(0, h / aoRange));
      if (nor.getY(i) < -0.5) f *= 0.55; // undersides darker
    }
    col[i * 3] = color.r * f; col[i * 3 + 1] = color.g * f; col[i * 3 + 2] = color.b * f;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
}

export class Builder {
  constructor(game, parent, { cell = 70 } = {}) {
    this.game = game; this.parent = parent; this.cell = cell;
    this.M = game.materials; this.physics = game.physics;
    this.buckets = new Map();
    this.meshes = [];
  }
  _bucket(mat, x, z, flags) {
    const key = `${mat}|${Math.floor(x / this.cell)}|${Math.floor(z / this.cell)}|${flags}`;
    let b = this.buckets.get(key); if (!b) { b = { mat, geoms: [], flags }; this.buckets.set(key, b); }
    return b;
  }
  // Add a prepared geometry (already in local space of `matrix`)
  geom(mat, g, matrix, { color = WHITE, ao = false, bottomY = null, cast = true, receive = true } = {}) {
    if (!g.attributes.color) {
      if (ao) { g.computeBoundingBox(); applyColor(g, color, true, bottomY ?? g.boundingBox.min.y); }
      else applyColor(g, color, false, 0);
    }
    g.applyMatrix4(matrix);
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (g.index === null) { /* fine */ }
    _v.setFromMatrixPosition(matrix);
    this._bucket(mat, _v.x, _v.z, (cast ? 1 : 0) | (receive ? 2 : 0)).geoms.push(g.index ? g.toNonIndexed() : g);
    return g;
  }

  // Axis-aligned or Y-rotated box. p = center, s = size.
  box(mat, p, s, o = {}) {
    const { rx = 0, ry = 0, rz = 0, color = WHITE, tex = 2, ao = true, collide = true, cast = true, receive = true, meta = {}, visible = true } = o;
    _q.setFromEuler(_e.set(rx, ry, rz));
    if (visible) {
      const g = sizedBox(s[0], s[1], s[2], tex, ao);
      if (ao) applyColor(g, toColor(color), true, -s[1] / 2, o.aoRange ?? 2.2);
      else applyColor(g, toColor(color), false, 0);
      _m.compose(_v.set(p[0], p[1], p[2]), _q, _s.set(1, 1, 1));
      this.geom(mat, g, _m, { cast, receive });
    }
    if (collide) {
      return this.physics.addBox({ x: p[0], y: p[1], z: p[2] }, { x: s[0] / 2, y: s[1] / 2, z: s[2] / 2 }, (rx || ry || rz) ? { x: _q.x, y: _q.y, z: _q.z, w: _q.w } : null, meta);
    }
    return null;
  }
  // Collider only
  solid(p, s, o = {}) { return this.box(null, p, s, { ...o, visible: false }); }

  cyl(mat, p, r, h, o = {}) {
    const { rx = 0, ry = 0, rz = 0, color = WHITE, seg = 16, collide = false, r2 = r, cast = true, open = false, tex = 2, meta = {} } = o;
    const g = new THREE.CylinderGeometry(r2, r, h, seg, 1, open);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (Math.PI * 2 * r) / tex, uv.getY(i) * h / tex);
    applyColor(g, toColor(color), false, 0);
    _q.setFromEuler(_e.set(rx, ry, rz));
    _m.compose(_v.set(p[0], p[1], p[2]), _q, _s.set(1, 1, 1));
    this.geom(mat, g, _m, { cast });
    if (collide) return this.physics.addCylinder({ x: p[0], y: p[1], z: p[2] }, h / 2, Math.max(r, r2), (rx || ry || rz) ? { x: _q.x, y: _q.y, z: _q.z, w: _q.w } : null, meta);
    return null;
  }
  sphere(mat, p, r, o = {}) {
    const { color = WHITE, seg = 16, sy = 1, cast = true } = o;
    const g = new THREE.SphereGeometry(r, seg, Math.max(6, seg >> 1));
    g.scale(1, sy, 1);
    applyColor(g, toColor(color), false, 0);
    _m.makeTranslation(p[0], p[1], p[2]);
    this.geom(mat, g, _m, { cast });
  }
  // Tube between two points (pipes, struts, cables)
  tube(mat, a, b, r, o = {}) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
    const len = A.distanceTo(B); if (len < 1e-4) return;
    const g = new THREE.CylinderGeometry(o.r2 ?? r, r, len, o.seg ?? 10, 1, o.open ?? false);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (Math.PI * 2 * r) / (o.tex ?? 1), uv.getY(i) * len / (o.tex ?? 1));
    applyColor(g, toColor(o.color ?? WHITE), false, 0);
    const mid = A.clone().add(B).multiplyScalar(0.5);
    _q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
    _m.compose(mid, _q, _s.set(1, 1, 1));
    this.geom(mat, g, _m, { cast: o.cast ?? true });
    if (o.collide) {
      this.physics.addCylinder({ x: mid.x, y: mid.y, z: mid.z }, len / 2, Math.max(r, 0.08), { x: _q.x, y: _q.y, z: _q.z, w: _q.w }, o.meta || {});
    }
  }
  // Polyline tube (cables with sag)
  path(mat, pts, r, o = {}) {
    const curve = new THREE.CatmullRomCurve3(pts.map(p => (p.isVector3 ? p : new THREE.Vector3(...p))));
    const g = new THREE.TubeGeometry(curve, o.segs ?? Math.max(8, pts.length * 3), r, o.radial ?? 6, false);
    applyColor(g, toColor(o.color ?? WHITE), false, 0);
    this.geom(mat, g, _m.identity(), { cast: o.cast ?? false });
  }
  // Extruded shape in XY plane, extruded along Z (depth), then transformed
  extrude(mat, shape, depth, p, o = {}) {
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: o.bevel ?? false, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 1, curveSegments: o.curve ?? 8 });
    g.translate(0, 0, -depth / 2);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / (o.tex ?? 2), uv.getY(i) / (o.tex ?? 2));
    applyColor(g, toColor(o.color ?? WHITE), false, 0);
    _q.setFromEuler(_e.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0));
    _m.compose(_v.set(p[0], p[1], p[2]), _q, _s.set(1, 1, 1));
    this.geom(mat, g, _m, { cast: o.cast ?? true });
  }
  plane(mat, p, w, h, o = {}) {
    const g = new THREE.PlaneGeometry(w, h);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / (o.tex ?? w), uv.getY(i) * h / (o.tex ?? h));
    applyColor(g, toColor(o.color ?? WHITE), false, 0);
    _q.setFromEuler(_e.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0));
    _m.compose(_v.set(p[0], p[1], p[2]), _q, _s.set(1, 1, 1));
    this.geom(mat, g, _m, { cast: o.cast ?? false, receive: o.receive ?? true });
  }

  // Stairs from (x,y,z) going along direction (dx,dz unit) up `rise` over `run`, width w.
  stairs(mat, p, run, rise, w, ry = 0, o = {}) {
    const steps = Math.max(2, Math.round(rise / 0.22));
    const sr = rise / steps, sd = run / steps;
    const c = Math.cos(ry), s = Math.sin(ry);
    for (let i = 0; i < steps; i++) {
      const d = sd * (i + 0.5), h = sr * (i + 1);
      // step block from floor to step top
      this.box(mat, [p[0] + s * d, p[1] + h / 2, p[2] + c * d], [w, h, sd], { ry, color: o.color, collide: false, tex: o.tex ?? 1 });
    }
    // smooth ramp collider so the character glides up
    const len = Math.hypot(run, rise), ang = Math.atan2(rise, run);
    const cx = p[0] + s * run / 2, cz = p[2] + c * run / 2, cy = p[1] + rise / 2;
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-ang, ry, 0, 'YXZ'));
    // offset ramp down so its top surface passes through step nosings
    const nrm = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
    this.physics.addBox({ x: cx - nrm.x * 0.12, y: cy - nrm.y * 0.12, z: cz - nrm.z * 0.12 }, { x: w / 2, y: 0.12, z: len / 2 }, q, { surface: o.surface ?? 'metal' });
    if (o.rails !== false) {
      for (const side of [-1, 1]) {
        const ox = c * side * (w / 2 - 0.05), oz = -s * side * (w / 2 - 0.05);
        this.tube('steel', [p[0] + ox, p[1] + 1.0, p[2] + oz], [p[0] + ox + s * run, p[1] + rise + 1.0, p[2] + oz + c * run], 0.035, { color: o.railColor ?? 0x8a8f96 });
        for (let k = 0; k <= 2; k++) { const t = k / 2; this.tube('steel', [p[0] + ox + s * run * t, p[1] + rise * t, p[2] + oz + c * run * t], [p[0] + ox + s * run * t, p[1] + rise * t + 1.0, p[2] + oz + c * run * t], 0.03, { color: o.railColor ?? 0x8a8f96 }); }
      }
    }
  }

  // Railing along a segment (with collision so the player can't fall off)
  railing(a, b, o = {}) {
    const h = o.h ?? 1.05, col = o.color ?? 0x9aa0a6;
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), len = A.distanceTo(B);
    this.tube('steel', [a[0], a[1] + h, a[2]], [b[0], b[1] + h, b[2]], 0.04, { color: col });
    this.tube('steel', [a[0], a[1] + h * 0.5, a[2]], [b[0], b[1] + h * 0.5, b[2]], 0.025, { color: col });
    const n = Math.max(1, Math.round(len / (o.spacing ?? 1.6)));
    for (let i = 0; i <= n; i++) { const t = i / n; const p = A.clone().lerp(B, t); this.tube('steel', [p.x, p.y, p.z], [p.x, p.y + h, p.z], 0.03, { color: col }); }
    if (o.collide !== false) {
      const mid = A.clone().add(B).multiplyScalar(0.5), ry = Math.atan2(B.x - A.x, B.z - A.z);
      this.box(null, [mid.x, mid.y + 0.7, mid.z], [0.1, 1.4, len], { ry, visible: false, meta: { surface: 'metal', rail: true } });
    }
  }
  // Ladder (climbable). base at p, height h, facing ry (ladder plane faces +z rotated)
  ladder(p, h, ry = 0, o = {}) {
    const c = Math.cos(ry), s = Math.sin(ry), w = 0.5;
    for (const side of [-1, 1]) this.tube('steel', [p[0] + c * side * w / 2, p[1], p[2] - s * side * w / 2], [p[0] + c * side * w / 2, p[1] + h, p[2] - s * side * w / 2], 0.03, { color: o.color ?? 0xd8b030 });
    for (let y = 0.3; y < h; y += 0.3) this.tube('steel', [p[0] - c * w / 2, p[1] + y, p[2] + s * w / 2], [p[0] + c * w / 2, p[1] + y, p[2] - s * w / 2], 0.02, { color: o.color ?? 0xd8b030 });
    const col = this.physics.addBox({ x: p[0] - s * 0.08, y: p[1] + h / 2, z: p[2] - c * 0.08 }, { x: 0.3, y: h / 2, z: 0.06 }, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), { climb: 'ladder', ladderTop: p[1] + h, ladderRy: ry, surface: 'metal', group: G.STATIC });
    return col;
  }

  finalize() {
    for (const b of this.buckets.values()) {
      if (!b.geoms.length) continue;
      const merged = mergeGeometries(b.geoms, false);
      if (!merged) { console.warn('merge failed', b.mat); continue; }
      merged.computeBoundingSphere(); merged.computeBoundingBox();
      const mat = this.M[b.mat];
      if (!mat) { console.warn('missing material', b.mat); continue; }
      const mesh = new THREE.Mesh(merged, mat);
      mesh.castShadow = !!(b.flags & 1) && !mat.transparent; mesh.receiveShadow = !!(b.flags & 2);
      mesh.matrixAutoUpdate = false; mesh.updateMatrix();
      this.parent.add(mesh); this.meshes.push(mesh);
      b.geoms.forEach(g => g.dispose());
    }
    this.buckets.clear();
    return this.meshes;
  }
}

export function toColor(c) { return c instanceof THREE.Color ? c : new THREE.Color(c); }
