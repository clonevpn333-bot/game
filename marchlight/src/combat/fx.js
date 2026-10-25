// Particle & effect system: sparks, smoke, dust, debris, tracers, muzzle flashes,
// kinetic shockwaves, explosions, steam, ambient motes.
import * as THREE from 'three';
import { radialTexture } from '../core/textures.js';
import { rng } from '../core/util.js';

const VS = /* glsl */`
  attribute float aSize; attribute vec4 aColor; attribute float aRot;
  varying vec4 vColor; varying float vRot;
  #include <common>
  #include <logdepthbuf_pars_vertex>
  uniform float uScale;
  void main(){
    vColor = aColor; vRot = aRot;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uScale / max(0.1, -mv.z);
    #include <logdepthbuf_vertex>
  }`;
const FS = /* glsl */`
  uniform sampler2D uTex; varying vec4 vColor; varying float vRot;
  #include <common>
  #include <logdepthbuf_pars_fragment>
  void main(){
    #include <logdepthbuf_fragment>
    vec2 c = gl_PointCoord - 0.5; float s = sin(vRot), co = cos(vRot);
    c = vec2(c.x * co - c.y * s, c.x * s + c.y * co) + 0.5;
    vec4 t = texture2D(uTex, c);
    gl_FragColor = vec4(vColor.rgb * t.rgb, vColor.a * t.a);
    if (gl_FragColor.a < 0.004) discard;
  }`;

class Pool {
  constructor(parent, max, tex, blending) {
    this.max = max; this.n = 0;
    this.p = new Float32Array(max * 3); this.v = new Float32Array(max * 3);
    this.life = new Float32Array(max); this.age = new Float32Array(max);
    this.size0 = new Float32Array(max); this.size1 = new Float32Array(max);
    this.c0 = new Float32Array(max * 4); this.c1 = new Float32Array(max * 4);
    this.grav = new Float32Array(max); this.drag = new Float32Array(max); this.rot = new Float32Array(max); this.spin = new Float32Array(max);
    this.geo = new THREE.BufferGeometry();
    this.aPos = new THREE.BufferAttribute(new Float32Array(max * 3), 3); this.aSize = new THREE.BufferAttribute(new Float32Array(max), 1);
    this.aColor = new THREE.BufferAttribute(new Float32Array(max * 4), 4); this.aRot = new THREE.BufferAttribute(new Float32Array(max), 1);
    [this.aPos, this.aSize, this.aColor, this.aRot].forEach(a => a.setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('position', this.aPos); this.geo.setAttribute('aSize', this.aSize); this.geo.setAttribute('aColor', this.aColor); this.geo.setAttribute('aRot', this.aRot);
    this.mat = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, uniforms: { uTex: { value: tex }, uScale: { value: 600 } }, transparent: true, depthWrite: false, blending });
    this.points = new THREE.Points(this.geo, this.mat); this.points.frustumCulled = false; this.points.renderOrder = blending === THREE.AdditiveBlending ? 10 : 5;
    parent.add(this.points);
  }
  spawn(o) {
    let i = this.n < this.max ? this.n++ : Math.floor(Math.random() * this.max);
    this.p[i * 3] = o.x; this.p[i * 3 + 1] = o.y; this.p[i * 3 + 2] = o.z;
    this.v[i * 3] = o.vx || 0; this.v[i * 3 + 1] = o.vy || 0; this.v[i * 3 + 2] = o.vz || 0;
    this.life[i] = o.life; this.age[i] = 0; this.size0[i] = o.s0; this.size1[i] = o.s1 ?? o.s0;
    const c0 = o.c0, c1 = o.c1 || o.c0;
    for (let k = 0; k < 4; k++) { this.c0[i * 4 + k] = c0[k]; this.c1[i * 4 + k] = c1[k]; }
    this.grav[i] = o.g ?? 0; this.drag[i] = o.drag ?? 0; this.rot[i] = o.rot ?? Math.random() * 6.28; this.spin[i] = o.spin ?? 0;
  }
  update(dt, scale) {
    this.mat.uniforms.uScale.value = scale;
    let w = 0;
    for (let i = 0; i < this.n; i++) {
      this.age[i] += dt;
      if (this.age[i] >= this.life[i]) continue;
      // compact
      if (w !== i) {
        for (let k = 0; k < 3; k++) { this.p[w * 3 + k] = this.p[i * 3 + k]; this.v[w * 3 + k] = this.v[i * 3 + k]; }
        for (let k = 0; k < 4; k++) { this.c0[w * 4 + k] = this.c0[i * 4 + k]; this.c1[w * 4 + k] = this.c1[i * 4 + k]; }
        this.life[w] = this.life[i]; this.age[w] = this.age[i]; this.size0[w] = this.size0[i]; this.size1[w] = this.size1[i];
        this.grav[w] = this.grav[i]; this.drag[w] = this.drag[i]; this.rot[w] = this.rot[i]; this.spin[w] = this.spin[i];
      }
      const d = Math.max(0, 1 - this.drag[w] * dt);
      this.v[w * 3] *= d; this.v[w * 3 + 1] = this.v[w * 3 + 1] * d - this.grav[w] * dt; this.v[w * 3 + 2] *= d;
      this.p[w * 3] += this.v[w * 3] * dt; this.p[w * 3 + 1] += this.v[w * 3 + 1] * dt; this.p[w * 3 + 2] += this.v[w * 3 + 2] * dt;
      this.rot[w] += this.spin[w] * dt;
      const t = this.age[w] / this.life[w];
      this.aPos.array[w * 3] = this.p[w * 3]; this.aPos.array[w * 3 + 1] = this.p[w * 3 + 1]; this.aPos.array[w * 3 + 2] = this.p[w * 3 + 2];
      this.aSize.array[w] = this.size0[w] + (this.size1[w] - this.size0[w]) * t;
      for (let k = 0; k < 4; k++) this.aColor.array[w * 4 + k] = this.c0[w * 4 + k] + (this.c1[w * 4 + k] - this.c0[w * 4 + k]) * t;
      this.aRot.array[w] = this.rot[w];
      w++;
    }
    this.n = w;
    this.geo.setDrawRange(0, w);
    this.aPos.needsUpdate = this.aSize.needsUpdate = this.aColor.needsUpdate = this.aRot.needsUpdate = true;
  }
}

export class FX {
  constructor(game) {
    this.game = game;
    const root = game.engine.cityRoot;
    this.r = rng(4242);
    const spark = radialTexture(64, [[0, 'rgba(255,255,255,1)'], [0.3, 'rgba(255,255,255,0.7)'], [1, 'rgba(255,255,255,0)']]);
    const smoke = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
      for (let i = 0; i < 24; i++) { const g = x.createRadialGradient(64 + (Math.random() - 0.5) * 50, 64 + (Math.random() - 0.5) * 50, 0, 64, 64, 50); g.addColorStop(0, 'rgba(255,255,255,0.12)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); }
      return new THREE.CanvasTexture(c); })();
    this.add = new Pool(root, 3000, spark, THREE.AdditiveBlending);
    this.alpha = new Pool(root, 2000, smoke, THREE.NormalBlending);
    this.lights = []; for (let i = 0; i < 2; i++) { const l = new THREE.PointLight(0xffb060, 0, 9, 2); root.add(l); this.lights.push({ l, t: 0, max: 0 }); }
    this.li = 0;
    this.meshes = []; // transient meshes (shockwaves, tracers, debris)
    this.emitters = [];
    this.ringGeo = new THREE.RingGeometry(0.8, 1, 48);
    this.debrisGeo = new THREE.BoxGeometry(1, 1, 1);
    this.tracerGeo = new THREE.CylinderGeometry(0.012, 0.012, 1, 4, 1, true); this.tracerGeo.rotateX(Math.PI / 2); this.tracerGeo.translate(0, 0, 0.5);
    this.decalGeo = new THREE.CircleGeometry(1, 8);
  }

  flash(pos, color = 0xffb060, intensity = 8, dur = 0.06, dist = 9) {
    const L = this.lights[this.li++ % this.lights.length];
    L.l.position.copy(pos); L.l.color.set(color); L.l.distance = dist; L.l.intensity = intensity; L.t = dur; L.max = dur; L.peak = intensity;
  }

  sparks(pos, normal, n = 10, speed = 6, color = [1, 0.7, 0.3, 1]) {
    for (let i = 0; i < n; i++) {
      const d = new THREE.Vector3(this.r() - 0.5, this.r() - 0.5, this.r() - 0.5).normalize().multiplyScalar(0.7).add(normal || new THREE.Vector3(0, 1, 0)).normalize();
      const s = speed * (0.4 + this.r());
      this.add.spawn({ x: pos.x, y: pos.y, z: pos.z, vx: d.x * s, vy: d.y * s, vz: d.z * s, life: 0.25 + this.r() * 0.35, s0: 0.08 + this.r() * 0.05, s1: 0.01, c0: [color[0] * 3, color[1] * 3, color[2] * 3, 1], c1: [color[0], color[1] * 0.4, color[2] * 0.2, 0], g: 12, drag: 1.5 });
    }
  }
  smoke(pos, n = 4, size = 1, color = [0.35, 0.34, 0.33, 0.5], vel = null, life = 2.2) {
    for (let i = 0; i < n; i++) {
      this.alpha.spawn({ x: pos.x + (this.r() - 0.5) * size * 0.4, y: pos.y + (this.r() - 0.5) * size * 0.3, z: pos.z + (this.r() - 0.5) * size * 0.4,
        vx: (vel?.x || 0) + (this.r() - 0.5) * 0.8, vy: (vel?.y ?? 0.8) + this.r() * 0.5, vz: (vel?.z || 0) + (this.r() - 0.5) * 0.8,
        life: life * (0.7 + this.r() * 0.6), s0: 0.6 * size, s1: 2.4 * size, c0: color, c1: [color[0], color[1], color[2], 0], drag: 0.8, spin: (this.r() - 0.5) * 0.8 });
    }
  }
  dust(pos, scale = 1) {
    for (let i = 0; i < 10 * scale; i++) {
      const a = this.r() * Math.PI * 2, s = 1.5 + this.r() * 2.5;
      this.alpha.spawn({ x: pos.x, y: pos.y + 0.05, z: pos.z, vx: Math.cos(a) * s * scale, vy: 0.3 + this.r() * 0.5, vz: Math.sin(a) * s * scale, life: 0.8 + this.r() * 0.6, s0: 0.25 * scale, s1: 1.1 * scale, c0: [0.55, 0.5, 0.45, 0.35], c1: [0.55, 0.5, 0.45, 0], drag: 3 });
    }
  }
  muzzle(pos, dir, big = false) {
    for (let i = 0; i < 6; i++) {
      const s = 4 + this.r() * 10;
      this.add.spawn({ x: pos.x, y: pos.y, z: pos.z, vx: dir.x * s + (this.r() - 0.5) * 2, vy: dir.y * s + (this.r() - 0.5) * 2, vz: dir.z * s + (this.r() - 0.5) * 2, life: 0.05 + this.r() * 0.04, s0: big ? 0.35 : 0.25, s1: 0.05, c0: [4, 2.6, 1.2, 1], c1: [2, 0.6, 0.1, 0] });
    }
    this.add.spawn({ x: pos.x, y: pos.y, z: pos.z, life: 0.05, s0: big ? 0.6 : 0.45, s1: 0.2, c0: [5, 3.5, 2, 1], c1: [3, 1, 0.2, 0] });
    this.smoke(pos.clone().addScaledVector(dir, 0.2), 1, 0.25, [0.6, 0.6, 0.6, 0.18], dir.clone().multiplyScalar(1.2), 0.7);
    this.flash(pos, 0xffb070, big ? 10 : 7, 0.05, 8);
  }
  tracer(from, to, color = 0xffd090) {
    const len = from.distanceTo(to); if (len < 0.5) return;
    const m = new THREE.Mesh(this.tracerGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(4), transparent: true, opacity: 0.9, depthWrite: false }));
    m.position.copy(from); m.lookAt(to); m.scale.set(1, 1, Math.min(len, 6));
    this.game.engine.cityRoot.add(m);
    const dir = to.clone().sub(from).normalize();
    this.meshes.push({ m, t: 0, life: Math.max(0.05, len / 300), update: (e, k) => { e.m.position.copy(from).addScaledVector(dir, (len - Math.min(len, 6)) * k + 0); e.m.material.opacity = 0.9 * (1 - k); } });
  }
  impact(pos, normal, mat = 'metal') {
    if (mat === 'metal') this.sparks(pos, normal, 8, 5);
    if (mat === 'drone') this.sparks(pos, normal, 14, 7, [0.6, 0.9, 1, 1]);
    this.smoke(pos, mat === 'concrete' ? 3 : 1, 0.3, mat === 'concrete' ? [0.6, 0.58, 0.55, 0.4] : [0.4, 0.4, 0.4, 0.25], normal.clone().multiplyScalar(0.6), 0.9);
    // scorch decal
    const d = new THREE.Mesh(this.decalGeo, new THREE.MeshBasicMaterial({ color: 0x080808, transparent: true, opacity: 0.75, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));
    d.scale.setScalar(0.06 + this.r() * 0.04); d.position.copy(pos).addScaledVector(normal, 0.01); d.lookAt(pos.clone().add(normal));
    this.game.engine.cityRoot.add(d);
    this.meshes.push({ m: d, t: 0, life: 12, update: (e, k) => { e.m.material.opacity = 0.75 * (1 - Math.max(0, (k - 0.8) / 0.2)); } });
  }
  debris(pos, n = 6, color = 0x3a3d42, speed = 7, size = 0.15) {
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(this.debrisGeo, new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.6 }));
      const s = size * (0.4 + this.r());
      m.scale.set(s, s * (0.3 + this.r()), s * (0.5 + this.r())); m.position.copy(pos); m.castShadow = true;
      const v = new THREE.Vector3(this.r() - 0.5, this.r() * 0.8 + 0.2, this.r() - 0.5).normalize().multiplyScalar(speed * (0.4 + this.r()));
      const av = new THREE.Vector3(this.r() - 0.5, this.r() - 0.5, this.r() - 0.5).multiplyScalar(18);
      this.game.engine.cityRoot.add(m);
      this.meshes.push({ m, t: 0, life: 2.5 + this.r(), update: (e, k, dt) => { v.y -= 15 * dt; e.m.position.addScaledVector(v, dt); e.m.rotation.x += av.x * dt; e.m.rotation.y += av.y * dt; if (k > 0.8) e.m.scale.multiplyScalar(0.92); } });
    }
  }
  explosion(pos, size = 1) {
    this.flash(pos, 0xff9040, 30 * size, 0.25, 18 * size);
    for (let i = 0; i < 40 * size; i++) {
      const d = new THREE.Vector3(this.r() - 0.5, this.r() - 0.3, this.r() - 0.5).normalize(), s = (3 + this.r() * 9) * size;
      this.add.spawn({ x: pos.x, y: pos.y, z: pos.z, vx: d.x * s, vy: d.y * s, vz: d.z * s, life: 0.3 + this.r() * 0.5, s0: (0.6 + this.r()) * size, s1: 0.1, c0: [4, 2.2, 0.8, 1], c1: [1.5, 0.3, 0.05, 0], drag: 3, g: 2 });
    }
    this.sparks(pos, new THREE.Vector3(0, 1, 0), 25 * size, 12 * size);
    this.smoke(pos, 10 * size, 1.6 * size, [0.18, 0.17, 0.16, 0.7], new THREE.Vector3(0, 1.4, 0), 3.5);
    this.shockwave(pos, 4 * size, [1, 0.6, 0.3]);
    this.debris(pos, 8 * size, 0x2a2c30, 10 * size, 0.2 * size);
  }
  shockwave(pos, radius = 3, color = [1, 0.6, 0.25], normal = null, dur = 0.45) {
    const m = new THREE.Mesh(this.ringGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(...color).multiplyScalar(3), transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.position.copy(pos);
    if (normal) m.lookAt(pos.clone().add(normal)); else m.lookAt(this.game.engine.camera.position);
    this.game.engine.cityRoot.add(m);
    this.meshes.push({ m, t: 0, life: dur, update: (e, k) => { const s = 0.2 + k * radius; e.m.scale.setScalar(s); e.m.material.opacity = 0.8 * (1 - k) * (1 - k); } });
  }
  kineticBurst(pos, scale = 1) {
    this.shockwave(pos, 2.5 * scale, [1, 0.6, 0.25]);
    for (let i = 0; i < 20 * scale; i++) {
      const d = new THREE.Vector3(this.r() - 0.5, this.r() - 0.5, this.r() - 0.5).normalize(), s = 5 + this.r() * 6;
      this.add.spawn({ x: pos.x, y: pos.y, z: pos.z, vx: d.x * s, vy: d.y * s, vz: d.z * s, life: 0.3 + this.r() * 0.3, s0: 0.12, s1: 0.02, c0: [3, 1.8, 0.8, 1], c1: [1, 0.4, 0.1, 0], drag: 5 });
    }
    this.flash(pos, 0xffa050, 10 * scale, 0.15, 10);
  }
  kineticCone(origin, dir, n) {
    for (let i = 0; i < 40 * n; i++) {
      const d = dir.clone().add(new THREE.Vector3(this.r() - 0.5, this.r() - 0.5, this.r() - 0.5).multiplyScalar(0.7)).normalize(), s = 10 + this.r() * 12;
      this.add.spawn({ x: origin.x, y: origin.y, z: origin.z, vx: d.x * s, vy: d.y * s, vz: d.z * s, life: 0.25 + this.r() * 0.2, s0: 0.2, s1: 0.5, c0: [2.5, 1.5, 0.7, 0.8], c1: [1, 0.4, 0.1, 0], drag: 6 });
    }
    this.shockwave(origin.clone().addScaledVector(dir, 1.5), 3 + n, [1, 0.6, 0.3], dir, 0.35);
  }
  tetherBeam(from, to, dur = 0.2, release = false) {
    const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
    const l = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: release ? new THREE.Color(5, 3, 1.4) : new THREE.Color(1.5, 3.5, 5), transparent: true }));
    l.frustumCulled = false; this.game.engine.cityRoot.add(l);
    this.meshes.push({ m: l, t: 0, life: dur, update: (e, k) => { e.m.material.opacity = 1 - k; } });
    if (release) for (let i = 0; i < 16; i++) { const t = i / 15; const p = from.clone().lerp(to, t); this.add.spawn({ x: p.x, y: p.y, z: p.z, vx: (this.r() - 0.5), vy: (this.r() - 0.5), vz: (this.r() - 0.5), life: 0.3, s0: 0.2, s1: 0.02, c0: [3, 1.8, 0.8, 1], c1: [1, 0.4, 0.1, 0] }); }
  }
  // continuous emitters (steam vents, sparks from welding etc.)
  emitter(o) { const e = { t: 0, rate: 10, acc: 0, active: true, ...o }; this.emitters.push(e); return e; }

  // free an effect's GPU resources (groups too), but never the shared geometries
  release(obj) {
    const shared = new Set([this.ringGeo, this.debrisGeo, this.tracerGeo, this.decalGeo]);
    obj.traverse(o => {
      if (o.geometry && !shared.has(o.geometry)) o.geometry.dispose();
      for (const m of Array.isArray(o.material) ? o.material : o.material ? [o.material] : []) m.dispose();
    });
  }
  update(dt) {
    const cam = this.game.engine.camera;
    const scale = window.innerHeight * 0.5 / Math.tan(cam.fov * Math.PI / 360) * this.game.engine.renderer.getPixelRatio();
    for (const e of this.emitters) {
      if (!e.active) continue;
      if (e.range && e.pos.distanceTo(this.game.player.pos) > e.range) continue;
      e.acc += dt * e.rate;
      while (e.acc > 1) { e.acc--; e.spawn(this); }
    }
    this.add.update(dt, scale); this.alpha.update(dt, scale);
    for (const L of this.lights) { if (L.t > 0) { L.t -= dt; L.l.intensity = L.peak * Math.max(0, L.t / L.max); } else L.l.intensity = 0; }
    for (let i = this.meshes.length - 1; i >= 0; i--) {
      const e = this.meshes[i]; e.t += dt; const k = Math.min(1, e.t / e.life);
      e.update?.(e, k, dt);
      if (k >= 1) { this.meshes.splice(i, 1); e.m.removeFromParent(); if (!e.keep) this.release(e.m); }
    }
  }
}
