// GETAWAY! — pooled visual effects: particles (smoke/fire/sparks/dust/water/glass), debris chunks,
// shell casings, tracers, muzzle flashes, dynamic flash lights, shockwave rings, decals and skid marks.
import * as THREE from 'three';
import { G } from '../core/context.js';
import { rand, clamp, lerp } from '../core/utils.js';
import { softParticle, sparkTexture, bulletHoleTexture, scorchTexture, skidTexture } from '../world/textures.js';

const cap = (n) => (n > 0 && n < 400 ? n : n >= 400 ? 400 : 0); // NaN/Infinity-proof particle counts
const PVS = `attribute float size; attribute vec4 pcolor; attribute float rot; varying vec4 vColor; varying float vRot;
void main(){ vColor = pcolor; vRot = rot; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = min(size * (900.0 / max(0.5, -mv.z)) * (projectionMatrix[1][1] / 1.7), 320.0); gl_Position = projectionMatrix * mv; if (-mv.z < 1.2) vColor.a *= clamp((-mv.z - 0.4) / 0.8, 0.0, 1.0); }`;
const PFS = `uniform sampler2D map; varying vec4 vColor; varying float vRot;
void main(){ vec2 c = gl_PointCoord - 0.5; float s = sin(vRot), co = cos(vRot); vec2 uv = vec2(co*c.x - s*c.y, s*c.x + co*c.y) + 0.5; vec4 t = texture2D(map, uv); gl_FragColor = vec4(vColor.rgb * t.rgb, vColor.a * t.a); if (gl_FragColor.a < 0.003) discard; }`;

class ParticleLayer {
  constructor(scene, max, tex, additive) {
    this.max = max; this.n = 0;
    this.pos = new Float32Array(max * 3); this.vel = new Float32Array(max * 3); this.col = new Float32Array(max * 4); this.size = new Float32Array(max); this.rot = new Float32Array(max);
    this.life = new Float32Array(max); this.age = new Float32Array(max); this.grow = new Float32Array(max); this.drag = new Float32Array(max); this.grav = new Float32Array(max); this.a0 = new Float32Array(max); this.spin = new Float32Array(max); this.s0 = new Float32Array(max); this.fade = new Uint8Array(max);
    this.base = new Float32Array(max * 3);
    const g = new THREE.BufferGeometry();
    this.aPos = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage); this.aCol = new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage);
    this.aSize = new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage); this.aRot = new THREE.BufferAttribute(this.rot, 1).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.aPos); g.setAttribute('pcolor', this.aCol); g.setAttribute('size', this.aSize); g.setAttribute('rot', this.aRot);
    const m = new THREE.ShaderMaterial({ vertexShader: PVS, fragmentShader: PFS, uniforms: { map: { value: tex } }, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });
    this.points = new THREE.Points(g, m); this.points.frustumCulled = false; this.points.renderOrder = additive ? 5 : 4; scene.add(this.points);
    g.setDrawRange(0, 0);
  }
  emit(x, y, z, vx, vy, vz, { life = 1, size = 1, grow = 0, r = 1, g = 1, b = 1, a = 1, drag = 0.5, grav = 0, spin = 0, fade = 1 } = {}) {
    if (this.n >= this.max) { // overwrite oldest-ish
      const i = (Math.random() * this.max) | 0; this._set(i, x, y, z, vx, vy, vz, life, size, grow, r, g, b, a, drag, grav, spin, fade); return;
    }
    this._set(this.n++, x, y, z, vx, vy, vz, life, size, grow, r, g, b, a, drag, grav, spin, fade);
  }
  _set(i, x, y, z, vx, vy, vz, life, size, grow, r, g, b, a, drag, grav, spin, fade) {
    const i3 = i * 3, i4 = i * 4; this.pos[i3] = x; this.pos[i3 + 1] = y; this.pos[i3 + 2] = z; this.vel[i3] = vx; this.vel[i3 + 1] = vy; this.vel[i3 + 2] = vz;
    this.base[i3] = r; this.base[i3 + 1] = g; this.base[i3 + 2] = b; this.col[i4] = r; this.col[i4 + 1] = g; this.col[i4 + 2] = b; this.col[i4 + 3] = a;
    this.life[i] = life; this.age[i] = 0; this.size[i] = size; this.s0[i] = size; this.grow[i] = grow; this.drag[i] = drag; this.grav[i] = grav; this.a0[i] = a; this.spin[i] = spin; this.rot[i] = Math.random() * 6.28; this.fade[i] = fade;
  }
  update(dt) {
    let i = 0;
    while (i < this.n) {
      this.age[i] += dt;
      if (this.age[i] >= this.life[i]) { this._copy(this.n - 1, i); this.n--; continue; }
      const i3 = i * 3, t = this.age[i] / this.life[i]; const dr = Math.max(0, 1 - this.drag[i] * dt);
      this.vel[i3] *= dr; this.vel[i3 + 1] = this.vel[i3 + 1] * dr - this.grav[i] * dt; this.vel[i3 + 2] *= dr;
      this.pos[i3] += this.vel[i3] * dt; this.pos[i3 + 1] += this.vel[i3 + 1] * dt; this.pos[i3 + 2] += this.vel[i3 + 2] * dt;
      if (this.pos[i3 + 1] < -0.6 && this.grav[i] > 0) { this.pos[i3 + 1] = -0.6; this.vel[i3 + 1] *= -0.3; }
      this.size[i] = this.s0[i] * (1 + this.grow[i] * t);
      const f = this.fade[i] === 1 ? (1 - t) * Math.min(1, t * 8) : this.fade[i] === 2 ? (1 - t) : (1 - t * t);
      this.col[i * 4 + 3] = this.a0[i] * f;
      if (this.fade[i] === 3) { // fire: shift color toward dark smoke
        const k = clamp(t * 1.6, 0, 1); this.col[i * 4] = lerp(this.base[i3], 0.15, k); this.col[i * 4 + 1] = lerp(this.base[i3 + 1], 0.13, k); this.col[i * 4 + 2] = lerp(this.base[i3 + 2], 0.12, k);
      }
      this.rot[i] += this.spin[i] * dt; i++;
    }
    this.points.geometry.setDrawRange(0, this.n);
    this.aPos.needsUpdate = this.aCol.needsUpdate = this.aSize.needsUpdate = this.aRot.needsUpdate = true;
  }
  _copy(src, dst) {
    if (src === dst) return; const s3 = src * 3, d3 = dst * 3, s4 = src * 4, d4 = dst * 4;
    for (let k = 0; k < 3; k++) { this.pos[d3 + k] = this.pos[s3 + k]; this.vel[d3 + k] = this.vel[s3 + k]; this.base[d3 + k] = this.base[s3 + k]; }
    for (let k = 0; k < 4; k++) this.col[d4 + k] = this.col[s4 + k];
    this.life[dst] = this.life[src]; this.age[dst] = this.age[src]; this.size[dst] = this.size[src]; this.s0[dst] = this.s0[src]; this.grow[dst] = this.grow[src]; this.drag[dst] = this.drag[src]; this.grav[dst] = this.grav[src]; this.a0[dst] = this.a0[src]; this.spin[dst] = this.spin[src]; this.rot[dst] = this.rot[src]; this.fade[dst] = this.fade[src];
  }
}

// Instanced physical chunks (concrete, glass, metal, brass)
class ChunkLayer {
  constructor(scene, geo, mat, max) {
    this.mesh = new THREE.InstancedMesh(geo, mat, max); this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.mesh.frustumCulled = false; this.mesh.castShadow = true;
    this.max = max; this.n = 0; this.items = []; for (let i = 0; i < max; i++) this.items.push({ p: new THREE.Vector3(), v: new THREE.Vector3(), q: new THREE.Quaternion(), w: new THREE.Vector3(), s: 1, life: 0, age: 0, c: new THREE.Color() });
    this.mesh.count = 0; scene.add(this.mesh); this._m = new THREE.Matrix4(); this._s = new THREE.Vector3(); this._dq = new THREE.Quaternion(); this._ax = new THREE.Vector3();
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
  }
  emit(p, v, s, life, color, ground) {
    let it; if (this.n < this.max) it = this.items[this.n++]; else it = this.items[(Math.random() * this.max) | 0];
    it.p.copy(p); it.v.copy(v); it.s = s; it.life = life; it.age = 0; it.q.set(Math.random(), Math.random(), Math.random(), Math.random()).normalize(); it.w.set(rand(-12, 12), rand(-12, 12), rand(-12, 12)); it.c.set(color); it.ground = ground;
  }
  update(dt, S) {
    let i = 0;
    while (i < this.n) {
      const it = this.items[i]; it.age += dt;
      if (it.age > it.life) { const last = this.items[this.n - 1]; this.items[this.n - 1] = it; this.items[i] = last; this.n--; continue; }
      it.v.y -= 15.7 * dt; it.p.addScaledVector(it.v, dt);
      const gh = it.ground ?? (S ? S.groundAt(it.p.x, it.p.z, it.p.y + 0.5, 0.5).h : 0);
      if (it.p.y < gh + it.s * 0.5) { it.p.y = gh + it.s * 0.5; if (it.v.y < 0) it.v.y *= -0.3; it.v.x *= 0.6; it.v.z *= 0.6; it.w.multiplyScalar(0.6); it.ground = gh; }
      const wl = it.w.length(); if (wl > 0.01) { this._dq.setFromAxisAngle(this._ax.copy(it.w).divideScalar(wl), wl * dt); it.q.premultiply(this._dq); }
      const sc = it.s * (it.age > it.life - 0.5 ? (it.life - it.age) / 0.5 : 1);
      this._m.compose(it.p, it.q, this._s.set(sc, sc, sc)); this.mesh.setMatrixAt(i, this._m); this.mesh.setColorAt(i, it.c);
      i++;
    }
    this.mesh.count = this.n; this.mesh.instanceMatrix.needsUpdate = true; if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}

// velocity-stretched glowing streaks (sparks, embers, speed lines)
class StreakLayer {
  constructor(scene, max = 900) {
    this.max = max; this.n = 0; this.p = new Float32Array(max * 3); this.v = new Float32Array(max * 3); this.life = new Float32Array(max); this.age = new Float32Array(max); this.col = new Float32Array(max * 3); this.len = new Float32Array(max); this.grav = new Float32Array(max);
    const g = new THREE.BufferGeometry(); this.pos = new Float32Array(max * 6); this.vc = new Float32Array(max * 6);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('color', new THREE.BufferAttribute(this.vc, 3).setUsage(THREE.DynamicDrawUsage));
    this.mesh = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); this.mesh.frustumCulled = false; this.mesh.renderOrder = 6; scene.add(this.mesh);
  }
  emit(x, y, z, vx, vy, vz, life, r, g, b, len = 0.035, grav = 12) { const i = this.n < this.max ? this.n++ : (Math.random() * this.max) | 0; const i3 = i * 3; this.p[i3] = x; this.p[i3 + 1] = y; this.p[i3 + 2] = z; this.v[i3] = vx; this.v[i3 + 1] = vy; this.v[i3 + 2] = vz; this.life[i] = life; this.age[i] = 0; this.col[i3] = r; this.col[i3 + 1] = g; this.col[i3 + 2] = b; this.len[i] = len; this.grav[i] = grav; }
  update(dt) {
    let i = 0; while (i < this.n) {
      this.age[i] += dt; if (this.age[i] >= this.life[i]) { const j = --this.n; for (const a of [this.p, this.v, this.col]) { a[i * 3] = a[j * 3]; a[i * 3 + 1] = a[j * 3 + 1]; a[i * 3 + 2] = a[j * 3 + 2]; } this.life[i] = this.life[j]; this.age[i] = this.age[j]; this.len[i] = this.len[j]; this.grav[i] = this.grav[j]; continue; }
      const i3 = i * 3; this.v[i3 + 1] -= this.grav[i] * dt; this.v[i3] *= 1 - 0.8 * dt; this.v[i3 + 2] *= 1 - 0.8 * dt;
      this.p[i3] += this.v[i3] * dt; this.p[i3 + 1] += this.v[i3 + 1] * dt; this.p[i3 + 2] += this.v[i3 + 2] * dt; if (this.p[i3 + 1] < -0.5 && this.grav[i] > 0) { this.p[i3 + 1] = -0.5; this.v[i3 + 1] *= -0.4; }
      const k = 1 - this.age[i] / this.life[i], L = this.len[i], o = i * 6;
      this.pos[o] = this.p[i3]; this.pos[o + 1] = this.p[i3 + 1]; this.pos[o + 2] = this.p[i3 + 2]; this.pos[o + 3] = this.p[i3] - this.v[i3] * L; this.pos[o + 4] = this.p[i3 + 1] - this.v[i3 + 1] * L; this.pos[o + 5] = this.p[i3 + 2] - this.v[i3 + 2] * L;
      for (let c = 0; c < 3; c++) { this.vc[o + c] = this.col[i3 + c] * k * 2; this.vc[o + 3 + c] = 0; } i++;
    }
    this.mesh.geometry.setDrawRange(0, this.n * 2); this.mesh.geometry.attributes.position.needsUpdate = true; this.mesh.geometry.attributes.color.needsUpdate = true;
  }
}

export class FX {
  constructor(scene, staticWorld) {
    this.scene = scene; this.S = staticWorld; this.quality = 1;
    this.smoke = new ParticleLayer(scene, 4000, softParticle(), false);
    this.glow = new ParticleLayer(scene, 3000, sparkTexture(), true);
    this.fireL = new ParticleLayer(scene, 2500, softParticle(), true);
    this.chunks = new ChunkLayer(scene, new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.8 }), 500);
    this.shards = new ChunkLayer(scene, new THREE.TetrahedronGeometry(0.7), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.05, metalness: 0.6, transparent: true, opacity: 0.75 }), 500);
    this.shells = new ChunkLayer(scene, new THREE.CylinderGeometry(0.5, 0.5, 2.2, 6), new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.9, roughness: 0.3 }), 160);
    this.shells.mesh.castShadow = false;
    // flash lights
    this.lights = []; for (let i = 0; i < 3; i++) { const l = new THREE.PointLight(0xffaa55, 0, 30, 1.6); l.userData.t = 0; scene.add(l); this.lights.push(l); }
    // tracers
    const tg = new THREE.BufferGeometry(); this.trMax = 120; this.trPos = new Float32Array(this.trMax * 6); this.trCol = new Float32Array(this.trMax * 6); this.trLife = new Float32Array(this.trMax); this.trN = 0;
    tg.setAttribute('position', new THREE.BufferAttribute(this.trPos, 3).setUsage(THREE.DynamicDrawUsage)); tg.setAttribute('color', new THREE.BufferAttribute(this.trCol, 3).setUsage(THREE.DynamicDrawUsage));
    this.tracers = new THREE.LineSegments(tg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); this.tracers.frustumCulled = false; scene.add(this.tracers);
    // muzzle flash sprites
    this.flashMat = new THREE.SpriteMaterial({ map: sparkTexture(), color: 0xffd28a, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    this.flashes = []; for (let i = 0; i < 12; i++) { const s = new THREE.Sprite(this.flashMat.clone()); s.visible = false; s.userData.t = 0; scene.add(s); this.flashes.push(s); }
    // shockwave rings
    this.rings = []; const rg = new THREE.RingGeometry(0.85, 1, 48); rg.rotateX(-Math.PI / 2);
    for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: 0xffe0b0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })); m.visible = false; m.userData.t = 0; scene.add(m); this.rings.push(m); }
    const sg = new THREE.SphereGeometry(1, 24, 12);
    this.balls = []; for (let i = 0, N = cap(4); i < N; i++) { const m = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ color: 0xffcf8a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); m.visible = false; m.userData.t = 0; scene.add(m); this.balls.push(m); }
    this.decals = new Decals(scene); this.skids = new Skids(scene); this.streaks = new StreakLayer(scene); this.burning = [];
    this.emitters = [];
  }
  _light(pos, color, intensity, dist, dur) {
    let l = this.lights.find((x) => x.userData.t <= 0) || this.lights.reduce((a, b) => (a.userData.t < b.userData.t ? a : b));
    l.position.copy(pos); l.color.set(color); l.intensity = intensity; l.distance = dist; l.userData.t = dur; l.userData.dur = dur; l.userData.i0 = intensity;
  }
  spark(p, dir, n = 8, speed = 8) {
    for (let i = 0, N = cap(n * 1.5 * this.quality); i < N; i++) this.streaks.emit(p.x, p.y, p.z, (dir ? dir.x * speed : 0) + rand(-6, 6), (dir ? dir.y * speed : 0) + rand(0, 7), (dir ? dir.z * speed : 0) + rand(-6, 6), rand(0.2, 0.55), 1, rand(0.55, 0.85), 0.25, 0.03, 14);
    for (let i = 0, N = cap(n * this.quality); i < N; i++) this.glow.emit(p.x, p.y, p.z, (dir ? dir.x * speed : 0) + rand(-4, 4), (dir ? dir.y * speed : 0) + rand(0, 5), (dir ? dir.z * speed : 0) + rand(-4, 4), { life: rand(0.25, 0.6), size: rand(0.08, 0.16), r: 1, g: rand(0.6, 0.9), b: 0.4, a: 1, drag: 1.5, grav: 12, fade: 2 });
  }
  smokePuff(p, { n = 1, size = 1.5, life = 2, color = 0.85, alpha = 0.35, vel = null, spread = 0.5, rise = 1 } = {}) {
    for (let i = 0, N = cap(n); i < N; i++) { const c = color * rand(0.9, 1.05); this.smoke.emit(p.x + rand(-spread, spread), p.y + rand(-0.2, 0.2), p.z + rand(-spread, spread), (vel ? vel.x : 0) + rand(-0.6, 0.6), rise + rand(0, 0.6) + (vel ? vel.y : 0), (vel ? vel.z : 0) + rand(-0.6, 0.6), { life: life * rand(0.8, 1.2), size, grow: 2.2, r: c, g: c, b: c * 1.02, a: alpha, drag: 0.9, spin: rand(-0.6, 0.6) }); }
  }
  tireSmoke(p, intensity, vel) { if (Math.random() > intensity * 1.2 * this.quality) return; this.smokePuff(p, { size: 0.9 + intensity, life: 1.6 + intensity, color: 0.9, alpha: 0.18 + intensity * 0.25, vel: vel ? { x: vel.x * 0.25, y: 0, z: vel.z * 0.25 } : null, spread: 0.3, rise: 0.4 }); }
  dust(p, n = 6, size = 2, color = 0.65) { for (let i = 0, N = cap(n * this.quality); i < N; i++) this.smoke.emit(p.x + rand(-1, 1), p.y + rand(0, 0.5), p.z + rand(-1, 1), rand(-3, 3), rand(0.5, 2.5), rand(-3, 3), { life: rand(1.5, 3), size, grow: 2.5, r: color * 1.05, g: color * 0.98, b: color * 0.88, a: 0.35, drag: 1.2, spin: rand(-0.5, 0.5) }); }
  fire(p, intensity = 1, spread = 0.6) {
    if (Math.random() < intensity * this.quality) this.fireL.emit(p.x + rand(-spread, spread), p.y, p.z + rand(-spread, spread), rand(-0.5, 0.5), rand(2, 4) * intensity, rand(-0.5, 0.5), { life: rand(0.4, 0.9), size: rand(0.7, 1.4) * intensity, grow: -0.4, r: 1, g: rand(0.45, 0.7), b: 0.15, a: 0.8, drag: 0.5, fade: 3, spin: rand(-2, 2) });
    if (Math.random() < 0.25 * intensity * this.quality) this.smokePuff({ x: p.x, y: p.y + 1.5 * intensity, z: p.z }, { size: 1.5 * intensity, life: 3.5, color: 0.15, alpha: 0.45, rise: 2.5, spread });
  }
  water(p, dir, n = 4, speed = 10) { for (let i = 0, N = cap(n * this.quality); i < N; i++) this.smoke.emit(p.x, p.y, p.z, dir.x * speed + rand(-1, 1), dir.y * speed + rand(-1, 1), dir.z * speed + rand(-1, 1), { life: rand(0.8, 1.4), size: rand(0.25, 0.5), grow: 3, r: 0.85, g: 0.93, b: 1, a: 0.5, drag: 0.3, grav: 9.8, fade: 2 }); }
  splash(p, size = 1) { for (let i = 0, N = cap(40 * size * this.quality); i < N; i++) this.smoke.emit(p.x + rand(-size, size), p.y, p.z + rand(-size, size), rand(-3, 3) * size, rand(4, 9) * Math.sqrt(size), rand(-3, 3) * size, { life: rand(0.8, 1.6), size: rand(0.4, 0.9) * size, grow: 2, r: 0.9, g: 0.95, b: 1, a: 0.6, drag: 0.4, grav: 12, fade: 2 }); }
  debris(p, n = 10, color = 0x8f8b84, speed = 8, size = 0.25) { for (let i = 0, N = cap(n * this.quality); i < N; i++) this.chunks.emit(p, new THREE.Vector3(rand(-1, 1) * speed, rand(0.3, 1.2) * speed, rand(-1, 1) * speed), size * rand(0.5, 1.5), rand(3, 7), color); }
  glass(p, n = 30, normal = null, speed = 5) {
    for (let i = 0, N = cap(n * this.quality); i < N; i++) { const v = new THREE.Vector3(rand(-1, 1), rand(0, 1), rand(-1, 1)).multiplyScalar(speed); if (normal) v.addScaledVector(normal, speed * 0.8); this.shards.emit(new THREE.Vector3(p.x + rand(-0.6, 0.6), p.y + rand(-0.4, 0.4), p.z + rand(-0.6, 0.6)), v, rand(0.04, 0.14), rand(2, 4), 0xcfe8f0); }
    for (let i = 0, N = cap(10 * this.quality); i < N; i++) this.glow.emit(p.x, p.y, p.z, rand(-3, 3), rand(0, 3), rand(-3, 3), { life: 0.4, size: 0.05, r: 0.8, g: 0.9, b: 1, a: 0.8, grav: 10, fade: 2 });
  }
  shell(p, dir) { this.shells.emit(p, new THREE.Vector3(dir.x * 3 + rand(-0.5, 0.5), rand(2, 3.5), dir.z * 3 + rand(-0.5, 0.5)), 0.025, 4, 0xd4a64a); }
  tracer(a, b, color = [1, 0.85, 0.5]) {
    const i = this.trN % this.trMax; this.trN++; const o = i * 6;
    this.trPos.set([a.x, a.y, a.z, b.x, b.y, b.z], o); this.trCol.set([...color.map((c) => c * 0.3), ...color], o); this.trLife[i] = 0.07;
  }
  muzzle(p, dir, size = 1, color = 0xffd28a) {
    const s = this.flashes.find((f) => !f.visible) || this.flashes[0]; s.visible = true; s.position.copy(p).addScaledVector(dir, 0.15 * size); s.scale.setScalar(0.7 * size * rand(0.8, 1.2)); s.material.color.set(color); s.material.rotation = rand(0, 6); s.userData.t = 0.05;
    this._light(p, 0xffb060, 6 * size, 12, 0.06);
    this.glow.emit(p.x, p.y, p.z, dir.x * 4, dir.y * 4 + 0.5, dir.z * 4, { life: 0.15, size: 0.35 * size, grow: 1, r: 1, g: 0.8, b: 0.5, a: 0.7, fade: 2 });
    this.smoke.emit(p.x, p.y, p.z, dir.x * 2, 0.5, dir.z * 2, { life: 0.9, size: 0.3 * size, grow: 3, r: 0.8, g: 0.8, b: 0.8, a: 0.12, drag: 2 });
  }
  impact(p, n, mat = 'concrete') {
    const nx = n ? n.x : 0, ny = n ? n.y : 1, nz = n ? n.z : 0;
    if (mat === 'metal' || mat === 'vehicle') this.spark(p, n, 6, 5);
    else if (mat === 'glass') this.glass(p, 6, n, 3);
    else if (mat === 'water') this.splash(p, 0.25);
    else if (mat === 'flesh') { for (let i = 0, N = cap(5); i < N; i++) this.smoke.emit(p.x, p.y, p.z, nx * 2 + rand(-1, 1), ny * 2 + rand(0, 1), nz * 2 + rand(-1, 1), { life: 0.4, size: 0.15, grow: 2, r: 0.6, g: 0.6, b: 0.62, a: 0.4, drag: 2 }); }
    else { for (let i = 0, N = cap(6 * this.quality); i < N; i++) this.smoke.emit(p.x, p.y, p.z, nx * 3 + rand(-1.5, 1.5), ny * 3 + rand(0, 1.5), nz * 3 + rand(-1.5, 1.5), { life: rand(0.5, 1), size: rand(0.15, 0.3), grow: 3, r: 0.75, g: 0.72, b: 0.66, a: 0.45, drag: 2 }); this.chunks.emit(p, new THREE.Vector3(nx * 3 + rand(-2, 2), ny * 3 + rand(1, 3), nz * 3 + rand(-2, 2)), 0.04, 1.5, 0x8f8b84); }
    if (mat !== 'water' && mat !== 'flesh' && mat !== 'ground' && n) this.decals.add('hole', p, n, 0.12);
  }
  explosion(p, size = 1) {
    const q = this.quality;
    this._light(p, 0xffa040, 120 * size, 50 * size, 0.6);
    const b = this.balls.find((x) => !x.visible) || this.balls[0]; b.visible = true; b.position.copy(p); b.userData.t = 0; b.userData.size = size;
    const r = this.rings.find((x) => !x.visible) || this.rings[0]; r.visible = true; r.position.set(p.x, p.y + 0.3, p.z); r.userData.t = 0; r.userData.size = size;
    for (let i = 0, N = cap(70 * size * q); i < N; i++) { const d = new THREE.Vector3(rand(-1, 1), rand(-0.2, 1), rand(-1, 1)).normalize().multiplyScalar(rand(4, 16) * size); this.fireL.emit(p.x, p.y + 0.5, p.z, d.x, d.y, d.z, { life: rand(0.5, 1.2), size: rand(1.5, 3.5) * size, grow: 1.2, r: 1, g: rand(0.5, 0.75), b: 0.2, a: 0.9, drag: 3, fade: 3, spin: rand(-1, 1) }); }
    for (let i = 0, N = cap(40 * size * q); i < N; i++) { const d = new THREE.Vector3(rand(-1, 1), rand(0, 1), rand(-1, 1)).normalize().multiplyScalar(rand(2, 9) * size); const c = rand(0.1, 0.25); this.smoke.emit(p.x, p.y + 1, p.z, d.x, d.y + 2, d.z, { life: rand(3, 7), size: rand(2.5, 5) * size, grow: 2, r: c, g: c, b: c, a: 0.55, drag: 1.4, spin: rand(-0.3, 0.3) }); }
    for (let i = 0, N = cap(60 * q); i < N; i++) this.glow.emit(p.x, p.y + 0.5, p.z, rand(-25, 25), rand(5, 30), rand(-25, 25), { life: rand(0.6, 1.6), size: rand(0.1, 0.25), r: 1, g: 0.7, b: 0.3, a: 1, drag: 0.8, grav: 15, fade: 2 });
    this.debris(p, 18 * size, 0x2a2a2a, 14 * size, 0.3);
    // flaming debris arcing out with fire/smoke trails
    for (let i = 0, N = cap(9 * size * q); i < N; i++) this.burning.push({ p: p.clone().setY(p.y + 0.8), v: new THREE.Vector3(rand(-1, 1), rand(0.6, 1.4), rand(-1, 1)).normalize().multiplyScalar(rand(9, 20) * Math.sqrt(size)), life: rand(1.4, 3) });
    // ember streaks
    for (let i = 0, N = cap(90 * q); i < N; i++) this.streaks.emit(p.x, p.y + 0.6, p.z, rand(-22, 22), rand(4, 26), rand(-22, 22), rand(0.6, 1.5), 1, rand(0.45, 0.75), 0.15, 0.05, 11);
    // ground shockwave dust ring
    const gy = this.S ? this.S.groundAt(p.x, p.z, p.y + 1).h : p.y;
    for (let i = 0, N = cap(46 * size * q); i < N; i++) { const a = (i / 46) * Math.PI * 2 + rand(-0.05, 0.05); const sp = rand(14, 24) * size; this.smoke.emit(p.x + Math.cos(a) * 1.5, gy + 0.3, p.z + Math.sin(a) * 1.5, Math.cos(a) * sp, rand(0.2, 1.2), Math.sin(a) * sp, { life: rand(1.2, 2.2), size: rand(1.4, 2.4) * size, grow: 2.5, r: 0.62, g: 0.58, b: 0.52, a: 0.38, drag: 2.6, spin: rand(-0.5, 0.5) }); }
    // fire keeps burning on the ground
    let t = 7 * size; const fp = new THREE.Vector3(p.x, gy + 0.2, p.z); this.addEmitter({ update: (dt) => { t -= dt; this.fire(fp, clamp(t / 4, 0.25, 1.2) * size, 1.6 * size); return t > 0; } });
    // secondary pops
    for (let k = 0; k < 2; k++) setTimeout(() => { const q2 = p.clone().add(new THREE.Vector3(rand(-3, 3), rand(0.5, 2.5), rand(-3, 3))); this._light(q2, 0xff8a30, 40 * size, 20, 0.25); this.spark(q2, null, 14, 8); for (let i = 0, N = cap(12 * q); i < N; i++) this.fireL.emit(q2.x, q2.y, q2.z, rand(-4, 4), rand(1, 5), rand(-4, 4), { life: rand(0.4, 0.8), size: rand(0.8, 1.6), grow: 1, r: 1, g: 0.6, b: 0.2, a: 0.9, drag: 2, fade: 3 }); }, 250 + k * 380 + Math.random() * 200);
    this.decals.add('scorch', new THREE.Vector3(p.x, this.S ? this.S.groundAt(p.x, p.z, p.y + 1).h : 0, p.z), new THREE.Vector3(0, 1, 0), 5 * size);
  }
  addEmitter(e) { this.emitters.push(e); return e; } // { update(dt) -> bool alive }
  update(dt) {
    this.smoke.update(dt); this.glow.update(dt); this.fireL.update(dt); this.chunks.update(dt, this.S); this.shards.update(dt, this.S); this.shells.update(dt, this.S);
    for (const l of this.lights) if (l.userData.t > 0) { l.userData.t -= dt; l.intensity = l.userData.i0 * Math.max(0, l.userData.t / l.userData.dur); } else l.intensity = 0;
    for (const s of this.flashes) if (s.visible) { s.userData.t -= dt; if (s.userData.t <= 0) s.visible = false; }
    for (const b of this.balls) if (b.visible) { b.userData.t += dt; const t = b.userData.t / 0.45; if (t > 1) { b.visible = false; continue; } b.scale.setScalar((2 + 9 * Math.sqrt(t)) * b.userData.size); b.material.opacity = 0.9 * (1 - t); }
    for (const r of this.rings) if (r.visible) { r.userData.t += dt; const t = r.userData.t / 0.7; if (t > 1) { r.visible = false; continue; } r.scale.setScalar((3 + 40 * t) * r.userData.size); r.material.opacity = 0.6 * (1 - t); }
    // tracers fade
    let any = false; for (let i = 0, N = cap(this.trMax); i < N; i++) { if (this.trLife[i] > 0) { this.trLife[i] -= dt; any = true; if (this.trLife[i] <= 0) { this.trPos.fill(0, i * 6, i * 6 + 6); } } }
    if (any) { this.tracers.geometry.attributes.position.needsUpdate = true; this.tracers.geometry.attributes.color.needsUpdate = true; }
    for (let i = this.emitters.length - 1; i >= 0; i--) if (!this.emitters[i].update(dt)) this.emitters.splice(i, 1);
    this.decals.update(dt); this.skids.update(); this.streaks.update(dt);
    // flaming debris
    for (let i = this.burning.length - 1; i >= 0; i--) { const b = this.burning[i]; b.life -= dt; b.v.y -= 15 * dt; b.p.addScaledVector(b.v, dt); const gh = this.S ? this.S.groundAt(b.p.x, b.p.z, b.p.y + 0.5, 0.5).h : 0; if (b.p.y < gh + 0.1) { b.p.y = gh + 0.1; b.v.multiplyScalar(0.3); b.v.y = Math.abs(b.v.y) * 0.3; } if (Math.random() < 0.9 * this.quality) this.fireL.emit(b.p.x, b.p.y, b.p.z, rand(-0.3, 0.3), rand(0.2, 0.8), rand(-0.3, 0.3), { life: rand(0.25, 0.5), size: rand(0.35, 0.7), grow: -0.3, r: 1, g: rand(0.45, 0.65), b: 0.15, a: 0.9, fade: 3 }); if (Math.random() < 0.5 * this.quality) this.smokePuff(b.p, { size: 0.6, life: 1.6, color: 0.2, alpha: 0.35, rise: 0.6, spread: 0.1 }); if (b.life <= 0) this.burning.splice(i, 1); }
    // speed lines & rain splashes
    const P = G.player; const pv = P && P.vehicle; const cam = G.camera;
    if (pv && pv.speed > 34 && cam && G.mode === 'play') { const f = cam.getWorldDirection(this._fd || (this._fd = new THREE.Vector3())); const n = (pv.speed - 34) * 0.12 * (pv.ctrl.boost ? 2.5 : 1); for (let i = 0, N = cap(n); i < N; i++) { const a = rand(0, Math.PI * 2), r = rand(2.2, 6); const up = Math.sin(a) * r, side = Math.cos(a) * r; const x = cam.position.x + f.x * rand(8, 22) + f.z * side, y = cam.position.y + up * 0.6, z = cam.position.z + f.z * rand(8, 22) - f.x * side; this.streaks.emit(x, y, z, -f.x * pv.speed * 1.4, -f.y * pv.speed * 1.4, -f.z * pv.speed * 1.4, 0.18, 0.35, 0.38, 0.42, 0.06, 0); } }
    if (G.sky && G.sky.w.rain > 0.2 && cam) { const n = G.sky.w.rain * 8 * this.quality; for (let i = 0, N = cap(n); i < N; i++) { const x = cam.position.x + rand(-22, 22), z = cam.position.z + rand(-22, 22); const y = this.S.groundAt(x, z, cam.position.y + 5, 0).h + 0.05; for (let k = 0; k < 2; k++) this.streaks.emit(x, y, z, rand(-1, 1), rand(1.5, 2.5), rand(-1, 1), 0.2, 0.3, 0.33, 0.38, 0.04, 14); } }
  }
}

// ---- oriented decal quads (bullet holes, scorch marks) ----
class Decals {
  constructor(scene) {
    this.max = 300; const g = new THREE.PlaneGeometry(1, 1);
    this.layers = {
      hole: new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ map: bulletHoleTexture(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, roughness: 1 }), this.max),
      scorch: new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ map: scorchTexture(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, roughness: 1 }), 60),
    };
    for (const k in this.layers) { const m = this.layers[k]; m.count = 0; m.frustumCulled = false; m.userData.i = 0; m.renderOrder = 2; scene.add(m); }
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._z = new THREE.Vector3(0, 0, 1); this._s = new THREE.Vector3(); this._p = new THREE.Vector3();
  }
  add(kind, p, n, size) {
    const m = this.layers[kind]; const cap = m.instanceMatrix.count; const i = m.userData.i % cap; m.userData.i++;
    this._q.setFromUnitVectors(this._z, n); const spin = new THREE.Quaternion().setFromAxisAngle(this._z, Math.random() * 6.28); this._q.multiply(spin);
    this._p.copy(p).addScaledVector(n, 0.02); this._m.compose(this._p, this._q, this._s.set(size, size, size)); m.setMatrixAt(i, this._m); m.count = Math.min(cap, Math.max(m.count, i + 1)); m.instanceMatrix.needsUpdate = true;
  }
  update() {}
}

// ---- skid marks: ribbon quads laid behind sliding tires ----
class Skids {
  constructor(scene) {
    this.max = 2400; this.pos = new Float32Array(this.max * 4 * 3); this.uv = new Float32Array(this.max * 4 * 2); this.alpha = new Float32Array(this.max * 4); const idx = [];
    for (let i = 0; i < this.max; i++) { const b = i * 4; idx.push(b, b + 1, b + 2, b, b + 2, b + 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('uv', new THREE.BufferAttribute(this.uv, 2));
    g.setIndex(idx);
    const mat = new THREE.MeshBasicMaterial({ map: skidTexture(), transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, color: 0x111111, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(g, mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = 2; scene.add(this.mesh); this.i = 0; this.dirty = false;
  }
  // add segment between previous and current tire contact (left/right edges)
  segment(ax, ay, az, bx, by, bz, w = 0.26) {
    const dx = bx - ax, dz = bz - az; const L = Math.hypot(dx, dz); if (L < 0.05 || L > 3) return;
    const nx = -dz / L * w / 2, nz = dx / L * w / 2; const i = this.i % this.max; this.i++; const o = i * 12;
    this.pos.set([ax + nx, ay + 0.02, az + nz, ax - nx, ay + 0.02, az - nz, bx - nx, by + 0.02, bz - nz, bx + nx, by + 0.02, bz + nz], o);
    const v0 = (this.i * 0.37) % 1; this.uv.set([0, v0, 1, v0, 1, v0 + L / 4, 0, v0 + L / 4], i * 8); this.dirty = true;
  }
  update() { if (this.dirty) { this.mesh.geometry.attributes.position.needsUpdate = true; this.mesh.geometry.attributes.uv.needsUpdate = true; this.dirty = false; } }
}
