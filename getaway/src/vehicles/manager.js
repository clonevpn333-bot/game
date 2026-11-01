// GETAWAY! — vehicle manager: simulation substeps, collisions (walls / vehicles / props), instanced wheels,
// skid marks & tire smoke, engine + siren voice pooling.
import * as THREE from 'three';
import { G } from '../core/context.js';
import { clamp, SpatialHash, rand, lerp } from '../core/utils.js';
import { Vehicle } from './vehicle.js';
import { wheelAssets, RIM_OF } from './models.js';

const _m = new THREE.Matrix4(), _m2 = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _e = new THREE.Euler(), _flip = new THREE.Matrix4().makeRotationY(Math.PI);
const C1 = new Float32Array(8), C2 = new Float32Array(8);

export class VehicleManager {
  constructor(scene, S) {
    this.scene = scene; this.S = S; this.list = []; this.hash = new SpatialHash(12); this.near = [];
    const W = wheelAssets(); const N = 480;
    this.tires = new THREE.InstancedMesh(W.tireGeo, W.tireMat, N); this.rims = new THREE.InstancedMesh(W.rimGeo, W.rimMat, 4);
    this.rimSets = {}; for (const k in W.rimGeos) { const m = new THREE.InstancedMesh(W.rimGeos[k], W.rimMat, N); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.castShadow = true; m.count = 0; scene.add(m); this.rimSets[k] = { m, n: 0 }; }
    for (const m of [this.tires, this.rims]) { m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.castShadow = true; m.count = 0; scene.add(m); }
    this.voices = []; this.sirens = []; this.acc = 0; this.playerVehicle = null; this.skidVoice = null;
  }
  spawn(type, opts) { const v = new Vehicle(type, opts); this.scene.add(v.root); this.list.push(v); return v; }
  remove(v) { const i = this.list.indexOf(v); if (i >= 0) this.list.splice(i, 1); v.dispose(); v.removed = true; if (v.onRemoved) v.onRemoved(); G.emit('vehicleRemoved', v); }
  query(x, z, r, out = []) { return this.hash.query(x, z, r, out); }

  update(dt) {
    const S = this.S; const n = Math.max(1, Math.ceil(dt / (1 / 100))); const h = dt / n;
    for (let k = 0; k < n; k++) {
      for (const v of this.list) if (!v.parked || v.speed > 0.05 || v.vel.y !== 0) { v.step(h, S); if (v.mode === 'drive') this.collideStatic(v); }
      this._rebuildHash();
      this._vehicleCollisions();
    }
    this._props();
    const night = G.sky ? G.sky.night : 0;
    for (const v of this.list) { v.update(dt, night, G.time); if (v.parked && v.speed > 0.3) v.parked = false; }
    this._wheels(dt); this._audio(dt);
  }
  _rebuildHash() { this.hash.clear(); for (const v of this.list) this.hash.insert(v, v.pos.x, v.pos.z, v.spec.L * 0.6); }

  // ---------------- static collision (OBB vs AABB SAT) ----------------
  collideStatic(v) {
    const sp = v.spec; const hl = sp.L / 2, hw = sp.W / 2; const s = Math.sin(v.yaw), c = Math.cos(v.yaw);
    const r = Math.hypot(hl, hw); const y0 = v.pos.y + 0.38, y1 = v.pos.y + sp.H * 0.92;
    const boxes = this.S.boxesIn(v.pos.x - r, v.pos.z - r, v.pos.x + r, v.pos.z + r);
    for (let it = 0; it < boxes.length; it++) {
      const b = boxes[it]; if (!b.solid || b.maxY <= y0 || b.minY >= y1) continue;
      const bx = (b.minX + b.maxX) / 2, bz = (b.minZ + b.maxZ) / 2, bhx = (b.maxX - b.minX) / 2, bhz = (b.maxZ - b.minZ) / 2;
      const dx = bx - v.pos.x, dz = bz - v.pos.z;
      const axes = [[s, c], [c, -s], [1, 0], [0, 1]]; let min = 1e9, nx = 0, nz = 0, ai = -1;
      let sep = false;
      for (let a = 0; a < 4; a++) {
        const [ax, az] = axes[a]; const rc = hl * Math.abs(s * ax + c * az) + hw * Math.abs(c * ax - s * az); const rb = bhx * Math.abs(ax) + bhz * Math.abs(az);
        const dist = dx * ax + dz * az; const ov = rc + rb - Math.abs(dist); if (ov <= 0) { sep = true; break; }
        if (ov < min) { min = ov; nx = dist > 0 ? -ax : ax; nz = dist > 0 ? -az : az; ai = a; }
      }
      if (sep) continue;
      if (b.glass && b.onBreak) { if (v.speed > 2) { b.onBreak(b, v.vel); v.vel.multiplyScalar(0.93); G.emit('vehicleGlass', v); } continue; }
      // step-up onto low boxes (curbs, low platforms) instead of colliding
      if (b.maxY - v.pos.y < 0.42 && b.surface) continue;
      // contact point
      let cx, cz;
      if (ai >= 2) { v.corners(C1); let best = 1e9; for (let i = 0; i < 4; i++) { const d = (C1[i * 2] - v.pos.x) * nx + (C1[i * 2 + 1] - v.pos.z) * nz; if (d < best) { best = d; cx = C1[i * 2]; cz = C1[i * 2 + 1]; } } }
      else { let best = -1e9; for (const [px, pz] of [[b.minX, b.minZ], [b.maxX, b.minZ], [b.maxX, b.maxZ], [b.minX, b.maxZ]]) { const d = (px - v.pos.x) * nx + (pz - v.pos.z) * nz; if (d > best) { best = d; cx = px; cz = pz; } } }
      v.pos.x += nx * min; v.pos.z += nz * min;
      this._impulseStatic(v, cx, cz, nx, nz, b);
    }
  }
  _impulseStatic(v, cx, cz, nx, nz, box) {
    const rx = cx - v.pos.x, rz = cz - v.pos.z; const w = v.yawRate;
    const vpx = v.vel.x + w * rz, vpz = v.vel.z - w * rx; const vn = vpx * nx + vpz * nz;
    if (vn >= 0) return;
    const m = v.mass * (v.isPlayer ? 1.5 : 1), I = v.I; const rn = rz * nx - rx * nz;
    const e = 0.22; const j = -(1 + e) * vn / (1 / m + rn * rn / I);
    v.vel.x += j * nx / m; v.vel.z += j * nz / m; v.yawRate += j * rn / I * 0.8;
    const tx = -nz, tz = nx; const vt = vpx * tx + vpz * tz; const rt = rz * tx - rx * tz;
    let jt = -vt / (1 / m + rt * rt / I); jt = clamp(jt, -0.35 * j, 0.35 * j); v.vel.x += jt * tx / m; v.vel.z += jt * tz / m; v.yawRate += jt * rt / I * 0.5;
    const imp = -vn; this._onImpact(v, imp, cx, v.pos.y + 0.6, cz, nx, nz, null, Math.abs(vt), box);
  }
  _onImpact(v, imp, x, y, z, nx, nz, other, slide = 0, box = null) {
    const p = _p.set(x, y, z);
    if (imp > 2.5) {
      const t = G.time; if (t - v.lastImpact > 0.12 || imp > 10) {
        v.lastImpact = t;
        if (G.audio) G.audio.impact(p.clone(), clamp(imp / 16, 0.15, 1.6), 'metal');
        if (G.fx) { G.fx.spark(p, new THREE.Vector3(nx, 0.3, nz), Math.min(40, imp * 2), 5); if (imp > 8) G.fx.debris(p, Math.min(12, imp * 0.6), v.color, 4, 0.08); if (imp > 6) G.fx.glass(p, Math.min(20, imp)); if (box && imp > 9) G.fx.dust(p, 4, 1.5); } if (box && G.decals) G.decals.crash(box, x, y, z, nx, nz, imp);
        G.emit('vehicleImpact', v, imp, p.clone(), other);
      }
      const dmg = Math.max(0, imp - 4.5) * (imp > 15 ? 2.2 : 1.4) * (other && other.isPlayer ? 1.25 : 1); // rammed by the player: hurts them more
      if (dmg > 0) v.damage(dmg, p.clone(), new THREE.Vector3(-nx, 0, -nz), other ? other.driver : null);
    } else if (slide > 4 && Math.random() < 0.3) { if (G.fx) G.fx.spark(p, new THREE.Vector3(nx, 0.3, nz), 4, 4); if (G.audio && Math.random() < 0.3) G.audio.scrape(p.clone(), clamp(slide / 20, 0.2, 1)); }
  }

  // ---------------- vehicle vs vehicle (OBB-OBB SAT) ----------------
  _vehicleCollisions() {
    const done = new Set();
    for (const a of this.list) {
      if (a.removed) continue;
      const near = this.hash.query(a.pos.x, a.pos.z, a.spec.L, this.near);
      for (const b of near) {
        if (b === a || b.removed) continue; const key = a.id < b.id ? a.id * 100000 + b.id : b.id * 100000 + a.id; if (done.has(key)) continue; done.add(key);
        if (Math.abs(a.pos.y - b.pos.y) > Math.max(a.spec.H, b.spec.H) * 0.85) continue;
        if (a.mode === 'rigid' && b.mode === 'rigid') continue;
        this._pair(a, b);
      }
    }
  }
  _yawOf(v) { if (v.mode !== 'rigid' || !v.rigid) return v.yaw; const f = _p.set(0, 0, 1).applyQuaternion(v.rigid.quat); return Math.atan2(f.x, f.z); }
  _pair(A, B) {
    const ya = this._yawOf(A), yb = this._yawOf(B); const sa = Math.sin(ya), ca = Math.cos(ya), sb = Math.sin(yb), cb = Math.cos(yb);
    const ha = [A.spec.L / 2, A.spec.W / 2], hb = [B.spec.L / 2, B.spec.W / 2];
    const dx = B.pos.x - A.pos.x, dz = B.pos.z - A.pos.z; if (dx * dx + dz * dz > (ha[0] + hb[0]) ** 2 * 1.2) return;
    const axes = [[sa, ca], [ca, -sa], [sb, cb], [cb, -sb]]; let min = 1e9, nx = 0, nz = 0, ai = 0;
    for (let i = 0; i < 4; i++) {
      const [ax, az] = axes[i];
      const r1 = ha[0] * Math.abs(sa * ax + ca * az) + ha[1] * Math.abs(ca * ax - sa * az);
      const r2 = hb[0] * Math.abs(sb * ax + cb * az) + hb[1] * Math.abs(cb * ax - sb * az);
      const dist = dx * ax + dz * az; const ov = r1 + r2 - Math.abs(dist); if (ov <= 0) return;
      if (ov < min) { min = ov; nx = dist > 0 ? ax : -ax; nz = dist > 0 ? az : -az; ai = i; }
    }
    // contact point
    let cx = 0, cz = 0;
    const corners = (v, yaw, out) => { const s = Math.sin(yaw), c = Math.cos(yaw); const hl = v.spec.L / 2, hw = v.spec.W / 2; let i = 0; for (const [lx, lz] of [[hw, hl], [-hw, hl], [-hw, -hl], [hw, -hl]]) { out[i++] = v.pos.x + c * lx + s * lz; out[i++] = v.pos.z - s * lx + c * lz; } };
    if (ai < 2) { corners(B, yb, C2); let best = 1e9; for (let i = 0; i < 4; i++) { const d = (C2[i * 2] - A.pos.x) * nx + (C2[i * 2 + 1] - A.pos.z) * nz; if (d < best) { best = d; cx = C2[i * 2]; cz = C2[i * 2 + 1]; } } }
    else { corners(A, ya, C1); let best = -1e9; for (let i = 0; i < 4; i++) { const d = (C1[i * 2] - A.pos.x) * nx + (C1[i * 2 + 1] - A.pos.z) * nz; if (d > best) { best = d; cx = C1[i * 2]; cz = C1[i * 2 + 1]; } } }
    const ma = A.mass * (A.isPlayer ? 1.7 : 1), mb = B.mass * (B.isPlayer ? 1.7 : 1);
    const ra = A.mode === 'rigid' ? 0 : 1 / ma, rb = B.mode === 'rigid' ? 0 : 1 / mb; const tot = (ra + rb) || 1;
    if (A.mode !== 'rigid') { A.pos.x -= nx * min * ra / tot; A.pos.z -= nz * min * ra / tot; }
    if (B.mode !== 'rigid') { B.pos.x += nx * min * rb / tot; B.pos.z += nz * min * rb / tot; }
    if (A.mode === 'rigid') { A.rigid.pos.x -= nx * min * 0.5; A.rigid.pos.z -= nz * min * 0.5; }
    if (B.mode === 'rigid') { B.rigid.pos.x += nx * min * 0.5; B.rigid.pos.z += nz * min * 0.5; }
    const rax = cx - A.pos.x, raz = cz - A.pos.z, rbx = cx - B.pos.x, rbz = cz - B.pos.z;
    const wa = A.mode === 'rigid' ? A.rigid.angVel.y : A.yawRate, wb = B.mode === 'rigid' ? B.rigid.angVel.y : B.yawRate;
    const va = A.mode === 'rigid' ? A.rigid.vel : A.vel, vb = B.mode === 'rigid' ? B.rigid.vel : B.vel;
    const vrx = (vb.x + wb * rbz) - (va.x + wa * raz), vrz = (vb.z - wb * rbx) - (va.z - wa * rax);
    const vn = vrx * nx + vrz * nz; if (vn >= 0) return;
    const rna = raz * nx - rax * nz, rnb = rbz * nx - rbx * nz; const Ia = A.I, Ib = B.I;
    const k = 1 / ma + 1 / mb + rna * rna / Ia + rnb * rnb / Ib; const e = 0.2; const j = -(1 + e) * vn / k;
    const apply = (V, sgn, m, rn, I, rx, rz) => {
      if (V.mode === 'rigid') { V.rigid.applyImpulse(new THREE.Vector3(sgn * j * nx, Math.abs(j) * 0.05, sgn * j * nz), new THREE.Vector3(cx, V.rigid.pos.y, cz)); return; }
      V.vel.x += sgn * j * nx / m; V.vel.z += sgn * j * nz / m; V.yawRate += sgn * j * rn / I;
    };
    apply(A, -1, ma, rna, Ia); apply(B, 1, mb, rnb, Ib);
    // tangential friction (helps PIT maneuvers spin the target)
    const tx = -nz, tz = nx; const vt = vrx * tx + vrz * tz; const jt = clamp(-vt / k, -0.3 * j, 0.3 * j);
    if (A.mode !== 'rigid') { A.vel.x -= jt * tx / ma; A.vel.z -= jt * tz / ma; A.yawRate -= jt * (raz * tx - rax * tz) / Ia; }
    if (B.mode !== 'rigid') { B.vel.x += jt * tx / mb; B.vel.z += jt * tz / mb; B.yawRate += jt * (rbz * tx - rbx * tz) / Ib; }
    const imp = -vn; const y = Math.max(A.pos.y, B.pos.y) + 0.6;
    this._onImpact(A, imp * (mb / (ma + mb)) * 2, cx, y, cz, -nx, -nz, B);
    this._onImpact(B, imp * (ma / (ma + mb)) * 2, cx, y, cz, nx, nz, A);
    // violent hits can flip lighter cars
    if (imp > 22 && B.mode === 'drive' && mb < ma * 0.8 && !B.isPlayer && Math.random() < 0.5) B.toRigid(new THREE.Vector3(0, 0, rand(-3, 3)));
    if (imp > 22 && A.mode === 'drive' && ma < mb * 0.8 && !A.isPlayer && Math.random() < 0.5) A.toRigid(new THREE.Vector3(0, 0, rand(-3, 3)));
    G.emit('vehicleCollision', A, B, imp);
  }

  // ---------------- props ----------------
  _props() {
    const P = G.props; if (!P) return; const near = this._pn || (this._pn = []);
    for (const v of this.list) {
      const spd = v.speed; if (spd < 0.5 || v.mode === 'rigid') continue;
      const sp = v.spec; const hl = sp.L / 2, hw = sp.W / 2; P.near(v.pos.x, v.pos.z, hl + 2, near);
      const s = Math.sin(v.yaw), c = Math.cos(v.yaw);
      for (const p of near) {
        if (p.y > v.pos.y + sp.H || p.y + p.def.h < v.pos.y) continue;
        const dx = p.x - v.pos.x, dz = p.z - v.pos.z; const lx = c * dx - s * dz, lz = s * dx + c * dz; const r = p.def.r;
        if (Math.abs(lx) > hw + r || Math.abs(lz) > hl + r) continue;
        const pt = new THREE.Vector3(p.x, p.y + 0.6, p.z);
        if (spd > p.def.brk && !p.def.static) {
          P.hit(p, v.vel, pt, 1);
          const k = clamp(p.def.mass / v.mass, 0.005, 0.35); v.vel.multiplyScalar(1 - k);
          if (p.def.mass > 80) v.damage(spd * 0.25 * clamp(p.def.mass / 200, 0.3, 1.5), pt, new THREE.Vector3(-dx, 0, -dz).normalize());
          G.emit('vehicleHitProp', v, p, spd);
        } else {
          // solid: push car out along local axis of least penetration
          const pxv = hw + r - Math.abs(lx), pzv = hl + r - Math.abs(lz);
          let nlx = 0, nlz = 0, pen; if (pxv < pzv) { nlx = -Math.sign(lx); pen = pxv; } else { nlz = -Math.sign(lz); pen = pzv; }
          const wx = c * nlx + s * nlz, wz = -s * nlx + c * nlz; v.pos.x += wx * pen; v.pos.z += wz * pen;
          const vn = v.vel.x * wx + v.vel.z * wz; if (vn < 0) { v.vel.x -= vn * wx * 1.2; v.vel.z -= vn * wz * 1.2; if (-vn > 3) this._onImpact(v, -vn, p.x, p.y + 0.5, p.z, wx, wz, null); }
        }
      }
    }
  }

  // ---------------- wheels, skids, smoke ----------------
  _wheels(dt) {
    let i = 0; const cam = G.camera ? G.camera.position : _p.set(0, 0, 0); const fx = G.fx; for (const k in this.rimSets) this.rimSets[k].n = 0;
    for (const v of this.list) {
      const dcam = v.pos.distanceToSquared(cam); const vis = dcam < 320 * 320;
      const ws = v.model.wheels; const sy = Math.sin(v.yaw), cy = Math.cos(v.yaw);
      if (v.model.glow) { const L = v.model.lightU; for (const gl of v.model.glow) gl.m.emissiveIntensity = gl.base * (gl.g === 7 ? 1 : gl.g === 1 ? 0.35 + L[1] * 0.9 : 0.08 + L[gl.g] * 1.2); }
      for (let k = 0; k < ws.length; k++) {
        const w = ws[k];
        w.spin += (v.mode === 'rigid' ? v.speed * 0.3 : (v.spin > 0.3 && !w.front && v.spec.drive !== 'FWD' ? v.vF + 25 : v.vF)) / w.r * dt;
        // suspension: wheel follows its own ground height relative to chassis plane
        const plane = v.pos.y + (w.z * Math.tan(v.pitch)) + (w.x * Math.tan(v.roll));
        const comp = v.mode === 'drive' && !v.airborne ? clamp(v.ground[k] - plane, -0.18, 0.18) : (v.airborne ? -0.08 : 0); w.comp = lerp(w.comp, comp, 0.5);
        if (w.pivot) { w.pivot.position.y = w.r + w.comp; w.pivot.rotation.set(0, w.front ? v.steerAngle : 0, 0); w.spinner.rotation.x = w.spin; }
        if (v.model.hideWheels) continue;
        if (!vis || i >= this.tires.instanceMatrix.count) continue;
        _m.copy(v.root.matrixWorld);
        _q.setFromEuler(_e.set(0, w.front ? v.steerAngle : 0, 0)); _m2.compose(_p.set(w.x, w.r + w.comp, w.z), _q, _s.set(1, 1, 1)); _m.multiply(_m2);
        _m2.makeRotationX(w.spin); _m.multiply(_m2); if (w.side < 0) _m.multiply(_flip);
        _m2.makeScale(w.w / 0.95, w.r, w.r); _m.multiply(_m2);
        this.tires.setMatrixAt(i, _m); const rs = this.rimSets[RIM_OF[v.type] || 'sport6']; rs.m.setMatrixAt(rs.n++, _m); i++;
        // skid marks + tire smoke
        if (fx && v.mode === 'drive' && !v.airborne && dcam < 200 * 200) {
          const sliding = (!w.front && (v.slip > 3.2 || v.spin > 0.25)) || (v.ctrl.brake > 0.9 && v.speed > 9 && !v.reversing) || (w.front && v.slip > 7);
          const wx = v.pos.x + cy * w.x + sy * w.z, wz = v.pos.z - sy * w.x + cy * w.z, wy = v.ground[k];
          if (sliding) {
            if (w.lastP) fx.skids.segment(w.lastP.x, w.lastP.y, w.lastP.z, wx, wy, wz, w.w);
            (w.lastP || (w.lastP = new THREE.Vector3())).set(wx, wy, wz);
            const inten = clamp((Math.max(v.slip - 3, 0) / 10) + v.spin * 0.6, 0.15, 1);
            if (v.surface === 'ground' || v.surface === 'sand' || v.surface === 'dirt') { if (Math.random() < 0.5) fx.dust({ x: wx, y: wy + 0.2, z: wz }, 1, 1.4, v.surface === 'sand' ? 0.8 : 0.55); }
            else fx.tireSmoke(_p.set(wx, wy + 0.3, wz), inten, v.vel);
          } else w.lastP = null;
        }
      }
      if (v.spec.thrusters && fx && (v.hovering || v.thrustBrake)) { for (const sx of [-1, 1]) for (const sz of [0.32, -0.32]) { const p = v.local(sx * v.spec.W * 0.42, sz * v.spec.L); p.y += 0.3; fx.smoke.emit(p.x, p.y, p.z, v.vel.x * 0.3 + (v.thrustBrake ? Math.sin(v.yaw) * 10 : 0), v.hovering ? -14 : 0.5, v.vel.z * 0.3 + (v.thrustBrake ? Math.cos(v.yaw) * 10 : 0), { life: 0.7, size: 0.3, grow: 5, r: 0.96, g: 0.98, b: 1, a: 0.5, drag: 2.5 }); } }
      if (v.thrusting && fx) { const sy2 = Math.sin(v.yaw), cy2 = Math.cos(v.yaw); for (let n2 = 0; n2 < 4; n2++) { const p = v.local((n2 - 1.5) * 0.3, -v.spec.L / 2 - 0.15); p.y += 0.62 + v.heave; fx.smoke.emit(p.x, p.y, p.z, -sy2 * 16 + v.vel.x * 0.3 + rand(-1, 1), rand(-0.5, 0.8), -cy2 * 16 + v.vel.z * 0.3 + rand(-1, 1), { life: rand(0.6, 1.1), size: 0.35, grow: 6, r: 0.95, g: 0.97, b: 1, a: 0.5, drag: 2.2, spin: rand(-1, 1) }); fx.glow.emit(p.x, p.y, p.z, -sy2 * 8, 0, -cy2 * 8, { life: 0.08, size: 0.25, r: 0.7, g: 0.85, b: 1, a: 0.8, fade: 2 }); } }
      if (!v.spec.thrusters && !v.spec.bike && fx && v.ctrl.boost && v.ctrl.throttle > 0 && v.mode === 'drive') { const s2 = Math.sin(v.yaw), c2 = Math.cos(v.yaw); for (const ex of [-0.35, 0.35]) { const p = v.local(ex * v.spec.W * 0.7, -v.spec.L / 2 - 0.15); p.y += 0.35; fx.fireL.emit(p.x, p.y, p.z, -s2 * 9 + v.vel.x * 0.6, rand(-0.2, 0.4), -c2 * 9 + v.vel.z * 0.6, { life: 0.12, size: 0.42, grow: -0.4, r: 0.45, g: 0.65, b: 1, a: 0.95, fade: 2 }); fx.fireL.emit(p.x, p.y, p.z, -s2 * 6 + v.vel.x * 0.6, 0.2, -c2 * 6 + v.vel.z * 0.6, { life: 0.18, size: 0.3, grow: 0.5, r: 1, g: 0.55, b: 0.2, a: 0.8, fade: 3 }); } }
      if (v.boostFx && fx && v.ctrl.boost && v.ctrl.throttle > 0) { const p = v.local(0, -v.spec.L / 2 - 0.2); p.y += 0.35; fx.glow.emit(p.x, p.y, p.z, -Math.sin(v.yaw) * 6, 0.3, -Math.cos(v.yaw) * 6, { life: 0.15, size: 0.35, r: 0.4, g: 0.6, b: 1, a: 0.9, grow: 0.5, fade: 2 }); }
    }
    this.tires.count = i; this.rims.count = 0; this.tires.instanceMatrix.needsUpdate = true; for (const k in this.rimSets) { const r = this.rimSets[k]; r.m.count = r.n; r.m.instanceMatrix.needsUpdate = true; }
  }

  // ---------------- audio voice pooling ----------------
  _audio(dt) {
    const A = G.audio; if (!A || !A.ready) return; const cam = G.camera.position;
    // engines: player + nearest moving vehicles
    const cands = this.list.filter((v) => v.engineOn && !v.dead && v.pos.distanceToSquared(cam) < 90 * 90).sort((a, b) => (b.isPlayer - a.isPlayer) || a.pos.distanceToSquared(cam) - b.pos.distanceToSquared(cam)).slice(0, 6);
    for (const v of this.list) if (v.voice && !cands.includes(v)) { v.voice.dispose(); v.voice = null; }
    for (const v of cands) {
      if (!v.voice) v.voice = A.createEngine(v.spec.engine);
      if (v.voice) v.voice.update(_p.copy(v.pos).setY(v.pos.y + 0.6), v.vel, v.rpm, v.ctrl.throttle, 1, v.isPlayer ? 1 : 0.8, v.isPlayer);
    }
    // sirens
    const sir = this.list.filter((v) => v.siren && !v.dead && v.pos.distanceToSquared(cam) < 300 * 300).sort((a, b) => a.pos.distanceToSquared(cam) - b.pos.distanceToSquared(cam)).slice(0, 4);
    for (const v of this.list) if (v.sirenVoice && !sir.includes(v)) { v.sirenVoice.dispose(); v.sirenVoice = null; }
    for (const v of sir) { if (!v.sirenVoice) v.sirenVoice = A.createSiren(v.sirenMode || ['wail', 'yelp', 'hilo'][v.id % 3]); v.sirenVoice.update(dt, _p.copy(v.pos).setY(v.pos.y + 1.5), v.vel, 1); }
    // player tire squeal
    const pv = this.playerVehicle;
    if (pv && !pv.dead) {
      if (!this.skidVoice) this.skidVoice = A.createLoop('skid', { ref: 6 });
      const sq = pv.mode === 'drive' && !pv.airborne && pv.surface !== 'ground' ? clamp((pv.slip - 3) / 8 + pv.spin * 0.5 + (pv.ctrl.brake > 0.9 && pv.speed > 9 ? 0.5 : 0), 0, 1) : 0;
      this.skidVoice.update(pv.pos, sq * 0.35, clamp(pv.speed / 40, 0, 1));
    } else if (this.skidVoice) this.skidVoice.update(null, 0);
  }
  clearAll(keep = []) { for (const v of [...this.list]) if (!keep.includes(v)) this.remove(v); }
}
