// Pooled particle effects: fire, smoke, sparks, debris, muzzle flashes,
// tracers, impact dust, shift motes, rain.
import * as THREE from 'three';
import { G } from '../core/state.js';
import { GU } from '../world/materials.js';

const N = 3000;

function particleMaterial(additive) {
  return new THREE.ShaderMaterial({
    uniforms: { uScale: { value: 600 } },
    vertexShader: /* glsl */`
      attribute float aSize; attribute vec4 aCol; attribute float aSoft;
      varying vec4 vCol; varying float vSoft;
      uniform float uScale;
      void main() {
        vCol = aCol; vSoft = aSoft;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * uScale / max(0.1, -mv.z);
      }`,
    fragmentShader: /* glsl */`
      varying vec4 vCol; varying float vSoft;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c) * 2.0;
        float a = 1.0 - smoothstep(1.0 - vSoft, 1.0, d);
        if (a <= 0.01) discard;
        gl_FragColor = vec4(vCol.rgb, vCol.a * a);
      }`,
    transparent: true,
    depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
}

class Pool {
  constructor(scene, additive) {
    this.pos = new Float32Array(N * 3);
    this.col = new Float32Array(N * 4);
    this.size = new Float32Array(N);
    this.soft = new Float32Array(N);
    this.p = [];
    for (let i = 0; i < N; i++) this.p.push({ alive: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, max: 1, s0: 1, s1: 1, c0: [1, 1, 1, 1], c1: [1, 1, 1, 0], grav: 0, drag: 0, soft: 0.5 });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aCol', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSoft', new THREE.BufferAttribute(this.soft, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo = g;
    this.mat = particleMaterial(additive);
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = additive ? 5 : 4;
    scene.add(this.points);
    this.cursor = 0;
  }
  emit(o) {
    for (let k = 0; k < N; k++) {
      this.cursor = (this.cursor + 1) % N;
      const p = this.p[this.cursor];
      if (p.alive) continue;
      Object.assign(p, o);
      p.alive = true;
      p.life = 0;
      return p;
    }
    return null;
  }
  update(dt) {
    let n = 0;
    for (const p of this.p) {
      if (!p.alive) continue;
      p.life += dt;
      if (p.life >= p.max) { p.alive = false; continue; }
      p.vy += p.grav * dt;
      const dr = Math.exp(-p.drag * dt);
      p.vx *= dr; p.vy *= dr; p.vz *= dr;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.floor !== undefined && p.y < p.floor) { p.y = p.floor; p.vy *= -0.3; p.vx *= 0.6; p.vz *= 0.6; }
      const t = p.life / p.max;
      this.pos[n * 3] = p.x; this.pos[n * 3 + 1] = p.y; this.pos[n * 3 + 2] = p.z;
      for (let k = 0; k < 4; k++) this.col[n * 4 + k] = p.c0[k] + (p.c1[k] - p.c0[k]) * t;
      this.size[n] = p.s0 + (p.s1 - p.s0) * t;
      this.soft[n] = p.soft;
      n++;
    }
    this.geo.setDrawRange(0, n);
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aCol.needsUpdate = true;
    this.geo.attributes.aSize.needsUpdate = true;
    this.geo.attributes.aSoft.needsUpdate = true;
    this.mat.uniforms.uScale.value = window.innerHeight * G.engine.pixelRatio * 0.9;
  }
}

const R = Math.random;

export class FX {
  constructor(scene) {
    this.add = new Pool(scene, true);
    this.alpha = new Pool(scene, false);
    // tracers
    this.tracers = [];
    const tg = new THREE.BufferGeometry();
    this.tpos = new Float32Array(200 * 6);
    this.tcol = new Float32Array(200 * 6);
    tg.setAttribute('position', new THREE.BufferAttribute(this.tpos, 3).setUsage(THREE.DynamicDrawUsage));
    tg.setAttribute('color', new THREE.BufferAttribute(this.tcol, 3).setUsage(THREE.DynamicDrawUsage));
    this.tgeo = tg;
    const tl = new THREE.LineSegments(tg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    tl.frustumCulled = false;
    scene.add(tl);
    // flash lights (few, reused)
    this.lights = [];
    for (let i = 0; i < 3; i++) {
      const l = new THREE.PointLight(0xffaa55, 0, 16, 2);
      scene.add(l);
      this.lights.push({ l, t: 0, max: 0.1, i0: 0 });
    }
    // rain
    this.rainOn = 0;
  }

  flashLight(pos, color = 0xffaa55, intensity = 60, dur = 0.06, dist = 14) {
    const L = this.lights.reduce((a, b) => (a.t <= b.t ? a : b));
    L.l.position.copy(pos);
    L.l.color.set(color);
    L.l.distance = dist;
    L.t = dur; L.max = dur; L.i0 = intensity;
  }

  muzzle(pos, dir, color = [3, 2, 0.8]) {
    for (let i = 0; i < 6; i++) {
      this.add.emit({ x: pos.x, y: pos.y, z: pos.z, vx: dir.x * (4 + R() * 8) + (R() - 0.5), vy: dir.y * 6 + (R() - 0.5), vz: dir.z * (4 + R() * 8) + (R() - 0.5), max: 0.05 + R() * 0.04, s0: 0.25, s1: 0.05, c0: [...color, 1], c1: [color[0], color[1] * 0.5, 0, 0], grav: 0, drag: 6, soft: 0.6 });
    }
    this.alpha.emit({ x: pos.x, y: pos.y, z: pos.z, vx: dir.x, vy: 0.5, vz: dir.z, max: 0.5, s0: 0.15, s1: 0.6, c0: [0.6, 0.6, 0.6, 0.25], c1: [0.6, 0.6, 0.6, 0], grav: 0.5, drag: 2, soft: 1 });
    this.flashLight(pos, new THREE.Color(color[0] / 3, color[1] / 3, color[2] / 3), 40, 0.05, 12);
  }

  tracer(a, b, color = [3, 2.2, 1.2], life = 0.07) {
    this.tracers.push({ a: a.clone(), b: b.clone(), t: 0, life, color });
    if (this.tracers.length > 200) this.tracers.shift();
  }

  impact(pos, normal, kind = 'concrete') {
    const flesh = kind === 'flesh', metal = kind === 'metal';
    const n = flesh ? 8 : 10;
    for (let i = 0; i < n; i++) {
      const vx = normal.x * 3 + (R() - 0.5) * 4, vy = normal.y * 3 + R() * 3, vz = normal.z * 3 + (R() - 0.5) * 4;
      if (flesh) this.alpha.emit({ x: pos.x, y: pos.y, z: pos.z, vx, vy, vz, max: 0.4, s0: 0.12, s1: 0.04, c0: [0.45, 0.02, 0.02, 0.9], c1: [0.3, 0, 0, 0], grav: -14, drag: 1, soft: 0.4 });
      else this.alpha.emit({ x: pos.x, y: pos.y, z: pos.z, vx: vx * 0.6, vy: vy * 0.6, vz: vz * 0.6, max: 0.6 + R() * 0.4, s0: 0.1, s1: 0.5, c0: [0.65, 0.62, 0.58, 0.5], c1: [0.6, 0.58, 0.55, 0], grav: -1, drag: 3, soft: 1 });
    }
    if (!flesh) {
      for (let i = 0; i < (metal ? 10 : 4); i++) this.add.emit({ x: pos.x, y: pos.y, z: pos.z, vx: normal.x * 4 + (R() - 0.5) * 8, vy: normal.y * 4 + R() * 5, vz: normal.z * 4 + (R() - 0.5) * 8, max: 0.25 + R() * 0.2, s0: 0.06, s1: 0.02, c0: [4, 2.6, 1, 1], c1: [2, 0.6, 0, 0], grav: -18, drag: 1, soft: 0.3 });
    }
  }

  sparks(pos, n = 12) {
    for (let i = 0; i < n; i++) this.add.emit({ x: pos.x, y: pos.y, z: pos.z, vx: (R() - 0.5) * 10, vy: R() * 6, vz: (R() - 0.5) * 10, max: 0.3 + R() * 0.4, s0: 0.07, s1: 0.02, c0: [5, 3, 1, 1], c1: [3, 0.8, 0, 0], grav: -20, drag: 0.5, soft: 0.3, floor: pos.y - 0.8 });
  }

  smoke(pos, dark = false) {
    const c = dark ? 0.08 : 0.55;
    this.alpha.emit({ x: pos.x + (R() - 0.5) * 0.3, y: pos.y, z: pos.z + (R() - 0.5) * 0.3, vx: (R() - 0.5) * 0.6 + 0.6, vy: 1.4 + R(), vz: (R() - 0.5) * 0.6, max: 2.5 + R() * 1.5, s0: 0.5, s1: 3.2, c0: [c, c, c, 0.5], c1: [c, c, c, 0], grav: 0.3, drag: 0.6, soft: 1 });
  }

  tireSmoke(pos) {
    this.alpha.emit({ x: pos.x, y: pos.y, z: pos.z, vx: (R() - 0.5) * 1.5, vy: 0.4 + R() * 0.5, vz: (R() - 0.5) * 1.5, max: 1.4 + R(), s0: 0.6, s1: 2.8, c0: [0.8, 0.8, 0.8, 0.35], c1: [0.8, 0.8, 0.8, 0], grav: 0.1, drag: 1.2, soft: 1 });
  }

  fire(pos, scale = 1) {
    this.add.emit({ x: pos.x + (R() - 0.5) * scale, y: pos.y, z: pos.z + (R() - 0.5) * scale, vx: (R() - 0.5) * 0.6, vy: 2 + R() * 2, vz: (R() - 0.5) * 0.6, max: 0.5 + R() * 0.5, s0: 0.9 * scale, s1: 0.2, c0: [5, 2.2, 0.5, 0.9], c1: [3, 0.4, 0.05, 0], grav: 1, drag: 0.5, soft: 0.8 });
    if (R() < 0.4) this.smoke(new THREE.Vector3(pos.x, pos.y + 1.5, pos.z), true);
  }

  explosion(pos, scale = 1) {
    for (let i = 0; i < 60 * scale; i++) {
      const a = R() * Math.PI * 2, b = R() * Math.PI - Math.PI / 2, s = 4 + R() * 10;
      this.add.emit({ x: pos.x, y: pos.y, z: pos.z, vx: Math.cos(a) * Math.cos(b) * s, vy: Math.abs(Math.sin(b)) * s + 2, vz: Math.sin(a) * Math.cos(b) * s, max: 0.5 + R() * 0.6, s0: 1.8 * scale, s1: 0.4, c0: [6, 3, 1, 1], c1: [3, 0.5, 0.1, 0], grav: -2, drag: 2.5, soft: 0.9 });
    }
    for (let i = 0; i < 30 * scale; i++) {
      this.alpha.emit({ x: pos.x + (R() - 0.5) * 2, y: pos.y + R(), z: pos.z + (R() - 0.5) * 2, vx: (R() - 0.5) * 6, vy: 2 + R() * 5, vz: (R() - 0.5) * 6, max: 3 + R() * 2, s0: 1.5, s1: 6 * scale, c0: [0.12, 0.11, 0.1, 0.8], c1: [0.2, 0.2, 0.2, 0], grav: 0.4, drag: 1.4, soft: 1 });
    }
    this.sparks(pos, 30);
    this.flashLight(pos, 0xff8833, 400 * scale, 0.35, 40);
    G.cam && G.cam.shake(Math.max(0, 0.9 - pos.distanceTo(G.camera.position) / 60));
  }

  shiftMotes(pos, color) {
    for (let i = 0; i < 80; i++) {
      const a = R() * Math.PI * 2, r = 1 + R() * 4;
      this.add.emit({ x: pos.x + Math.cos(a) * r, y: pos.y + R() * 3, z: pos.z + Math.sin(a) * r, vx: Math.cos(a) * 4, vy: (R() - 0.2) * 3, vz: Math.sin(a) * 4, max: 0.8 + R() * 0.8, s0: 0.12, s1: 0.0, c0: [color.r * 4, color.g * 4, color.b * 4, 1], c1: [color.r, color.g, color.b, 0], grav: 0, drag: 1.5, soft: 0.5 });
    }
  }

  arc(a, b, color = [1.5, 2.5, 5]) {
    // jagged electric bolt from a to b drawn as several tracer segments
    let prev = a.clone();
    const steps = 7;
    for (let i = 1; i <= steps; i++) {
      const p = a.clone().lerp(b, i / steps);
      if (i < steps) p.add(new THREE.Vector3((R() - 0.5) * 0.7, (R() - 0.5) * 0.7, (R() - 0.5) * 0.7));
      this.tracer(prev, p, color, 0.12);
      prev = p;
    }
    this.flashLight(b, 0x88aaff, 80, 0.1, 12);
  }

  update(dt) {
    this.add.update(dt);
    this.alpha.update(dt);
    // tracers
    let n = 0;
    this.tracers = this.tracers.filter((t) => (t.t += dt) < t.life);
    for (const t of this.tracers) {
      if (n >= 200) break;
      const k = 1 - t.t / t.life;
      const o = n * 6;
      this.tpos[o] = t.a.x; this.tpos[o + 1] = t.a.y; this.tpos[o + 2] = t.a.z;
      this.tpos[o + 3] = t.b.x; this.tpos[o + 4] = t.b.y; this.tpos[o + 5] = t.b.z;
      for (let j = 0; j < 2; j++) { this.tcol[o + j * 3] = t.color[0] * k; this.tcol[o + j * 3 + 1] = t.color[1] * k; this.tcol[o + j * 3 + 2] = t.color[2] * k; }
      n++;
    }
    this.tgeo.setDrawRange(0, n * 2);
    this.tgeo.attributes.position.needsUpdate = true;
    this.tgeo.attributes.color.needsUpdate = true;
    for (const L of this.lights) {
      L.t = Math.max(0, L.t - dt);
      L.l.intensity = L.max > 0 ? L.i0 * (L.t / L.max) : 0;
    }
    void GU;
  }
}
