// Visual effects: GPU point particles, tracers, decals, flash lights, shockwaves, debris, shells.
import * as THREE from 'three';
import { glowTexture, softTexture } from './textures.js';
import { Body } from './physics.js';
import { Mat } from './materials.js';

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const Z = new THREE.Vector3(0, 0, 1);
const Y = new THREE.Vector3(0, 1, 0);
const rand = (a, b) => a + Math.random() * (b - a);

class ParticleSystem {
  constructor(capacity, additive, texture) {
    this.cap = capacity;
    this.n = 0;
    this.pos = new Float32Array(capacity * 3);
    this.col = new Float32Array(capacity * 4);
    this.size = new Float32Array(capacity);
    this.vel = new Float32Array(capacity * 3);
    this.life = new Float32Array(capacity);
    this.max = new Float32Array(capacity);
    this.s0 = new Float32Array(capacity);
    this.s1 = new Float32Array(capacity);
    this.c0 = new Float32Array(capacity * 4);
    this.c1 = new Float32Array(capacity * 4);
    this.grav = new Float32Array(capacity);
    this.drag = new Float32Array(capacity);
    const g = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
    this.colAttr = new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage);
    this.sizeAttr = new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.posAttr);
    g.setAttribute('color', this.colAttr);
    g.setAttribute('size', this.sizeAttr);
    g.setDrawRange(0, 0);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uTex: { value: texture }, uScale: { value: 600 } },
      vertexShader: /* glsl */`
        attribute float size; attribute vec4 color; varying vec4 vColor; uniform float uScale;
        void main(){ vColor = color; vec4 mv = modelViewMatrix * vec4(position,1.0);
          gl_PointSize = size * uScale / max(0.1, -mv.z); gl_Position = projectionMatrix * mv; }
      `,
      fragmentShader: /* glsl */`
        uniform sampler2D uTex; varying vec4 vColor;
        void main(){ vec4 t = texture2D(uTex, gl_PointCoord); gl_FragColor = vec4(vColor.rgb, vColor.a * t.a); }
      `,
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = additive ? 10 : 9;
    this.geo = g;
  }
  emit(x, y, z, vx, vy, vz, life, s0, s1, c0, c1, grav = 0, drag = 0) {
    let i;
    if (this.n < this.cap) i = this.n++;
    else i = (Math.random() * this.cap) | 0;
    const i3 = i * 3, i4 = i * 4;
    this.pos[i3] = x; this.pos[i3 + 1] = y; this.pos[i3 + 2] = z;
    this.vel[i3] = vx; this.vel[i3 + 1] = vy; this.vel[i3 + 2] = vz;
    this.life[i] = life; this.max[i] = life;
    this.s0[i] = s0; this.s1[i] = s1;
    this.c0[i4] = c0[0]; this.c0[i4 + 1] = c0[1]; this.c0[i4 + 2] = c0[2]; this.c0[i4 + 3] = c0[3];
    this.c1[i4] = c1[0]; this.c1[i4 + 1] = c1[1]; this.c1[i4 + 2] = c1[2]; this.c1[i4 + 3] = c1[3];
    this.grav[i] = grav; this.drag[i] = drag;
  }
  update(dt, floorY = -1e9) {
    let n = this.n;
    for (let i = 0; i < n; i++) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        // swap remove
        n--;
        if (i !== n) this._copy(n, i);
        i--;
        continue;
      }
      const i3 = i * 3, i4 = i * 4;
      const d = Math.max(0, 1 - this.drag[i] * dt);
      this.vel[i3] *= d; this.vel[i3 + 1] = this.vel[i3 + 1] * d + this.grav[i] * dt; this.vel[i3 + 2] *= d;
      this.pos[i3] += this.vel[i3] * dt; this.pos[i3 + 1] += this.vel[i3 + 1] * dt; this.pos[i3 + 2] += this.vel[i3 + 2] * dt;
      const t = 1 - this.life[i] / this.max[i];
      this.size[i] = this.s0[i] + (this.s1[i] - this.s0[i]) * t;
      for (let k = 0; k < 4; k++) this.col[i4 + k] = this.c0[i4 + k] + (this.c1[i4 + k] - this.c0[i4 + k]) * t;
    }
    this.n = n;
    this.geo.setDrawRange(0, n);
    this.posAttr.needsUpdate = true;
    this.colAttr.needsUpdate = true;
    this.sizeAttr.needsUpdate = true;
  }
  _copy(src, dst) {
    const s3 = src * 3, d3 = dst * 3, s4 = src * 4, d4 = dst * 4;
    for (let k = 0; k < 3; k++) { this.pos[d3 + k] = this.pos[s3 + k]; this.vel[d3 + k] = this.vel[s3 + k]; }
    for (let k = 0; k < 4; k++) { this.col[d4 + k] = this.col[s4 + k]; this.c0[d4 + k] = this.c0[s4 + k]; this.c1[d4 + k] = this.c1[s4 + k]; }
    this.size[dst] = this.size[src]; this.life[dst] = this.life[src]; this.max[dst] = this.max[src];
    this.s0[dst] = this.s0[src]; this.s1[dst] = this.s1[src]; this.grav[dst] = this.grav[src]; this.drag[dst] = this.drag[src];
  }
  clear() { this.n = 0; this.geo.setDrawRange(0, 0); }
}

const C = {
  white: [1, 1, 1, 1], spark: [1.6, 1.1, 0.5, 1], sparkEnd: [1.0, 0.3, 0.05, 0],
  fire: [1.8, 0.9, 0.3, 0.9], fireEnd: [0.6, 0.1, 0.02, 0],
  smoke: [0.25, 0.25, 0.27, 0.55], smokeEnd: [0.12, 0.12, 0.13, 0],
  dust: [0.55, 0.52, 0.48, 0.35], dustEnd: [0.4, 0.38, 0.35, 0],
  water: [0.8, 0.95, 1.0, 0.7], waterEnd: [0.6, 0.85, 1.0, 0],
  cyan: [0.3, 1.5, 2.0, 1], cyanEnd: [0.1, 0.4, 1.0, 0],
  pink: [2.0, 0.4, 1.0, 1], pinkEnd: [0.8, 0.1, 0.5, 0],
  green: [0.5, 2.0, 0.8, 1], greenEnd: [0.1, 0.8, 0.3, 0],
  oil: [0.05, 0.05, 0.06, 0.9], oilEnd: [0.05, 0.05, 0.06, 0],
};
export const FXColors = C;

export class FX {
  constructor(scene, physics, quality = 1) {
    this.scene = scene;
    this.physics = physics;
    this.quality = quality;
    this.glow = new ParticleSystem(Math.floor(4000 * quality) + 500, true, glowTexture());
    this.smoke = new ParticleSystem(Math.floor(1600 * quality) + 300, false, softTexture());
    scene.add(this.glow.points, this.smoke.points);

    // pooled flash lights (fixed count to avoid shader recompiles)
    this.lights = [];
    for (let i = 0; i < 4; i++) {
      const l = new THREE.PointLight(0xffaa55, 0, 14, 2);
      l.userData.t = 0;
      scene.add(l);
      this.lights.push(l);
    }
    this.lightIdx = 0;

    // tracers
    this.tracers = [];
    const tg = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true);
    tg.rotateX(Math.PI / 2); tg.translate(0, 0, 0.5);
    for (let i = 0; i < 48; i++) {
      const m = new THREE.Mesh(tg, new THREE.MeshBasicMaterial({ color: 0xffd38a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      m.visible = false; m.frustumCulled = false;
      m.userData = { t: 0, life: 0.06 };
      scene.add(m);
      this.tracers.push(m);
    }
    this.tracerIdx = 0;

    // shockwave rings
    this.rings = [];
    const rg = new THREE.RingGeometry(0.85, 1, 48);
    rg.rotateX(-Math.PI / 2);
    for (let i = 0; i < 10; i++) {
      const m = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: 0xffc070, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      m.visible = false;
      m.userData = { t: 0, life: 0.5, r0: 1, r1: 8 };
      scene.add(m);
      this.rings.push(m);
    }
    this.ringIdx = 0;

    // fireball spheres (for big explosions)
    this.balls = [];
    const bg = new THREE.IcosahedronGeometry(1, 2);
    for (let i = 0; i < 8; i++) {
      const m = new THREE.Mesh(bg, new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      m.visible = false;
      m.userData = { t: 0, life: 0.4, r: 3 };
      scene.add(m);
      this.balls.push(m);
    }
    this.ballIdx = 0;

    // decals (instanced)
    const dg = new THREE.PlaneGeometry(1, 1);
    const dc = document.createElement('canvas'); dc.width = dc.height = 64;
    const dctx = dc.getContext('2d');
    const gr = dctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.3, 'rgba(10,8,6,0.9)'); gr.addColorStop(0.6, 'rgba(30,20,10,0.4)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    dctx.fillStyle = gr; dctx.fillRect(0, 0, 64, 64);
    const dtex = new THREE.CanvasTexture(dc);
    this.decalMax = 220;
    this.decals = new THREE.InstancedMesh(dg, new THREE.MeshBasicMaterial({ map: dtex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }), this.decalMax);
    this.decals.count = 0;
    this.decals.frustumCulled = false;
    this.decalIdx = 0;
    this.decals.renderOrder = 2;
    scene.add(this.decals);

    // debris pool
    this.debris = [];
    const dgeos = [new THREE.BoxGeometry(0.22, 0.12, 0.3), new THREE.BoxGeometry(0.15, 0.15, 0.15), new THREE.CylinderGeometry(0.06, 0.06, 0.35, 6), new THREE.TetrahedronGeometry(0.16)];
    const dmats = [Mat.metal('#5a6070', 0.5), Mat.metal('#3a3f4a', 0.6), Mat.paint('#c9a227', 0.5), Mat.metal('#888f99', 0.3)];
    for (let i = 0; i < 90; i++) {
      const m = new THREE.Mesh(dgeos[i % 4], dmats[(i * 7) % 4]);
      m.visible = false; m.castShadow = false;
      scene.add(m);
      this.debris.push({ mesh: m, body: null });
    }
    this.debrisIdx = 0;

    // shell casings
    this.shells = [];
    const sg = new THREE.CylinderGeometry(0.018, 0.018, 0.07, 6);
    sg.rotateZ(Math.PI / 2);
    const smat = new THREE.MeshStandardMaterial({ color: '#d4a640', metalness: 1, roughness: 0.25 });
    const sgShot = new THREE.CylinderGeometry(0.03, 0.03, 0.09, 8); sgShot.rotateZ(Math.PI / 2);
    const smatShot = new THREE.MeshStandardMaterial({ color: '#c42020', metalness: 0.3, roughness: 0.4 });
    for (let i = 0; i < 40; i++) {
      const shot = i % 4 === 0;
      const m = new THREE.Mesh(shot ? sgShot : sg, shot ? smatShot : smat);
      m.visible = false;
      scene.add(m);
      this.shells.push({ mesh: m, body: null, shot });
    }
    this.shellIdx = 0;
    this.onShellTink = null;
  }

  // ---- particles ----
  sparks(p, n = 12, dir = null, speed = 9, color = C.spark, colorEnd = C.sparkEnd) {
    n = Math.ceil(n * this.quality);
    for (let i = 0; i < n; i++) {
      _v.set(rand(-1, 1), rand(-0.2, 1), rand(-1, 1)).normalize();
      if (dir) _v.addScaledVector(dir, 1.3).normalize();
      const s = speed * rand(0.3, 1.2);
      this.glow.emit(p.x, p.y, p.z, _v.x * s, _v.y * s, _v.z * s, rand(0.15, 0.5), rand(0.05, 0.12), 0.01, color, colorEnd, -18, 1.5);
    }
  }
  burst(p, n, color, colorEnd, speed = 4, size = 0.3, life = 0.6, grav = 0) {
    n = Math.ceil(n * this.quality);
    for (let i = 0; i < n; i++) {
      _v.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize().multiplyScalar(speed * rand(0.2, 1));
      this.glow.emit(p.x, p.y, p.z, _v.x, _v.y, _v.z, life * rand(0.6, 1.2), size * rand(0.6, 1.3), size * 0.2, color, colorEnd, grav, 2);
    }
  }
  smokePuff(p, n = 6, size = 1.2, life = 1.6, color = C.smoke, rise = 1.2) {
    n = Math.ceil(n * this.quality);
    for (let i = 0; i < n; i++) {
      this.smoke.emit(p.x + rand(-0.3, 0.3), p.y + rand(-0.2, 0.3), p.z + rand(-0.3, 0.3), rand(-0.8, 0.8), rand(0.3, 1.2) * rise, rand(-0.8, 0.8), life * rand(0.7, 1.3), size * 0.5, size * rand(1.5, 2.5), color, C.smokeEnd, 0.4, 1.2);
    }
  }
  dust(p, n = 8, size = 0.8) { this.smokePuff(p, n, size, 1.1, C.dust, 0.6); }
  splash(p, n = 20, power = 1) {
    n = Math.ceil(n * this.quality);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = rand(0.5, 3) * power;
      this.glow.emit(p.x, p.y, p.z, Math.cos(a) * r, rand(3, 8) * power, Math.sin(a) * r, rand(0.4, 0.9), rand(0.08, 0.2), 0.05, C.water, C.waterEnd, -22, 0.5);
    }
    for (let i = 0; i < n / 3; i++) this.smoke.emit(p.x, p.y, p.z, rand(-1, 1), rand(0.5, 2), rand(-1, 1), rand(0.5, 1), 0.4, 1.4, [0.85, 0.95, 1, 0.4], [0.85, 0.95, 1, 0], -1, 1);
  }
  fire(p, n = 3, size = 0.6, spread = 0.3) {
    n = Math.ceil(n * this.quality);
    for (let i = 0; i < n; i++) {
      this.glow.emit(p.x + rand(-spread, spread), p.y, p.z + rand(-spread, spread), rand(-0.5, 0.5), rand(2, 4), rand(-0.5, 0.5), rand(0.4, 0.8), size, size * 0.2, C.fire, C.fireEnd, 1, 1);
    }
  }
  muzzle(p, dir, color = C.fire, big = 1) {
    for (let i = 0; i < 6 * big; i++) {
      _v.copy(dir).multiplyScalar(rand(2, 9)).add(_v2.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)));
      this.glow.emit(p.x, p.y, p.z, _v.x, _v.y, _v.z, rand(0.04, 0.09), rand(0.15, 0.3) * big, 0.05, color, C.fireEnd, 0, 4);
    }
    this.smoke.emit(p.x, p.y, p.z, dir.x, dir.y + 0.4, dir.z, 0.6, 0.15 * big, 0.6 * big, [0.6, 0.6, 0.6, 0.25], [0.5, 0.5, 0.5, 0], 0.5, 2);
  }
  trail(p, color = C.cyan, size = 0.25, life = 0.25) {
    this.glow.emit(p.x, p.y, p.z, 0, 0, 0, life, size, 0.02, color, [color[0] * 0.3, color[1] * 0.3, color[2] * 0.3, 0], 0, 0);
  }
  bubbles(p, n = 4) {
    for (let i = 0; i < n; i++) this.glow.emit(p.x + rand(-0.2, 0.2), p.y, p.z + rand(-0.2, 0.2), rand(-0.3, 0.3), rand(1, 2.5), rand(-0.3, 0.3), rand(0.6, 1.5), rand(0.05, 0.12), 0.08, [0.6, 0.9, 1, 0.6], [0.6, 0.9, 1, 0], 1.5, 1);
  }
  electric(p, n = 6, radius = 0.6) {
    for (let i = 0; i < n; i++) {
      _v.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize().multiplyScalar(radius);
      this.glow.emit(p.x + _v.x, p.y + _v.y, p.z + _v.z, _v.x * 6, _v.y * 6, _v.z * 6, rand(0.05, 0.15), rand(0.1, 0.22), 0.02, C.cyan, C.cyanEnd, 0, 3);
    }
  }

  // ---- lights ----
  flashLight(p, color = 0xffaa55, intensity = 40, life = 0.12, distance = 14) {
    const l = this.lights[this.lightIdx++ % this.lights.length];
    l.position.copy(p);
    l.color.set(color);
    l.distance = distance;
    l.userData.i0 = intensity;
    l.userData.t = life;
    l.userData.life = life;
    l.intensity = intensity;
  }

  tracer(from, to, color = 0xffd38a, width = 0.025, life = 0.07) {
    const m = this.tracers[this.tracerIdx++ % this.tracers.length];
    _v.subVectors(to, from);
    const len = _v.length();
    if (len < 0.01) return;
    m.position.copy(from);
    m.quaternion.setFromUnitVectors(Z, _v.divideScalar(len));
    m.scale.set(width, width, len);
    m.material.color.set(color);
    m.material.opacity = 1;
    m.visible = true;
    m.userData.t = life; m.userData.life = life; m.userData.w = width;
  }

  ring(p, r0 = 0.5, r1 = 8, life = 0.45, color = 0xffc070, normal = null) {
    const m = this.rings[this.ringIdx++ % this.rings.length];
    m.position.copy(p);
    if (normal) m.quaternion.setFromUnitVectors(Y, normal); else m.quaternion.identity();
    m.material.color.set(color);
    m.visible = true;
    Object.assign(m.userData, { t: life, life, r0, r1 });
    m.scale.setScalar(r0);
  }

  fireball(p, r = 3, life = 0.35, color = 0xffa040) {
    const m = this.balls[this.ballIdx++ % this.balls.length];
    m.position.copy(p);
    m.material.color.set(color);
    m.visible = true;
    Object.assign(m.userData, { t: life, life, r });
    m.scale.setScalar(0.2);
  }

  decal(p, normal, size = 0.25) {
    _q.setFromUnitVectors(Z, normal);
    _v.copy(p).addScaledVector(normal, 0.015);
    _s.set(size, size, size);
    _m.compose(_v, _q, _s);
    const i = this.decalIdx++ % this.decalMax;
    this.decals.setMatrixAt(i, _m);
    this.decals.count = Math.min(this.decalMax, this.decalIdx);
    this.decals.instanceMatrix.needsUpdate = true;
  }

  explosion(p, scale = 1, opts = {}) {
    const q = this.quality;
    this.fireball(p, 2.6 * scale, 0.32 + 0.1 * scale, opts.color || 0xffa040);
    this.burst(p, 40 * scale, C.fire, C.fireEnd, 9 * scale, 0.9 * scale, 0.55, 2);
    this.sparks(p, 30 * scale, null, 16 * scale);
    this.smokePuff(p, 14 * scale, 2.2 * scale, 2.4, C.smoke, 2);
    this.ring(p.clone().setY(p.y + 0.1), 0.5, 9 * scale, 0.45, 0xffc070);
    this.flashLight(p, 0xff9040, 140 * scale, 0.35, 22 * scale);
    if (opts.debris !== false) this.spawnDebris(p, Math.round(6 * scale * q), 10 * scale);
  }

  spawnDebris(p, n = 6, speed = 8, life = 6) {
    for (let i = 0; i < n; i++) {
      const d = this.debris[this.debrisIdx++ % this.debris.length];
      if (d.body) this.physics.removeBody(d.body);
      d.mesh.visible = true;
      d.mesh.position.copy(p);
      d.mesh.scale.setScalar(rand(0.7, 1.6));
      const b = new Body({ r: 0.12, mass: 0.3, bounce: 0.35, friction: 0.6, mesh: d.mesh, life: life + rand(0, 2), collideBodies: false, density: 1.6, kind: 'debris' });
      b.pos.copy(p).add(_v.set(rand(-0.3, 0.3), rand(0, 0.4), rand(-0.3, 0.3)));
      b.vel.set(rand(-1, 1), rand(0.4, 1.4), rand(-1, 1)).normalize().multiplyScalar(speed * rand(0.4, 1));
      b.spin.set(rand(-15, 15), rand(-15, 15), rand(-15, 15));
      b.onExpire = () => { d.mesh.visible = false; d.body = null; };
      d.body = b;
      this.physics.addBody(b);
    }
  }

  // Detach an existing mesh as a physical debris piece (robot parts!)
  detach(mesh, vel, life = 7, r = 0.25) {
    mesh.updateWorldMatrix(true, false);
    mesh.matrixWorld.decompose(_v, _q, _s);
    this.scene.add(mesh);
    mesh.position.copy(_v); mesh.quaternion.copy(_q); mesh.scale.copy(_s);
    const b = new Body({ r, mass: 0.6, bounce: 0.3, friction: 0.7, mesh, life, collideBodies: false, density: 1.4, kind: 'debris' });
    b.pos.copy(_v);
    b.vel.copy(vel);
    b.spin.set(rand(-10, 10), rand(-10, 10), rand(-10, 10));
    b.onExpire = () => { this.scene.remove(mesh); };
    this.physics.addBody(b);
    return b;
  }

  ejectShell(p, dir, shot = false) {
    let s = null;
    for (let k = 0; k < this.shells.length; k++) {
      const c = this.shells[this.shellIdx++ % this.shells.length];
      if (c.shot === shot) { s = c; break; }
    }
    if (!s) return;
    if (s.body) this.physics.removeBody(s.body);
    s.mesh.visible = true;
    const b = new Body({ r: 0.03, mass: 0.05, bounce: 0.45, friction: 0.5, mesh: s.mesh, life: 3, collideBodies: false, density: 2, kind: 'shell' });
    b.pos.copy(p);
    b.vel.copy(dir).multiplyScalar(rand(2.5, 4)).add(_v.set(rand(-0.5, 0.5), rand(2, 3.5), rand(-0.5, 0.5)));
    b.spin.set(rand(-30, 30), rand(-30, 30), rand(-30, 30));
    b.onImpact = (body, speed) => { if (this.onShellTink && speed > 1.5) this.onShellTink(body.pos, speed, shot); };
    b.onExpire = () => { s.mesh.visible = false; s.body = null; };
    s.body = b;
    this.physics.addBody(b);
  }

  update(dt) {
    this.glow.update(dt);
    this.smoke.update(dt);
    for (const l of this.lights) {
      if (l.userData.t > 0) {
        l.userData.t -= dt;
        l.intensity = Math.max(0, l.userData.i0 * (l.userData.t / l.userData.life));
      } else l.intensity = 0;
    }
    for (const m of this.tracers) {
      if (!m.visible) continue;
      m.userData.t -= dt;
      if (m.userData.t <= 0) { m.visible = false; continue; }
      const k = m.userData.t / m.userData.life;
      m.material.opacity = k;
      m.scale.x = m.scale.y = m.userData.w * (0.5 + k * 0.5);
    }
    for (const m of this.rings) {
      if (!m.visible) continue;
      m.userData.t -= dt;
      if (m.userData.t <= 0) { m.visible = false; continue; }
      const k = 1 - m.userData.t / m.userData.life;
      const e = 1 - Math.pow(1 - k, 3);
      m.scale.setScalar(m.userData.r0 + (m.userData.r1 - m.userData.r0) * e);
      m.material.opacity = 1 - k;
    }
    for (const m of this.balls) {
      if (!m.visible) continue;
      m.userData.t -= dt;
      if (m.userData.t <= 0) { m.visible = false; continue; }
      const k = 1 - m.userData.t / m.userData.life;
      m.scale.setScalar(m.userData.r * (0.3 + 0.7 * Math.sqrt(k)));
      m.material.opacity = (1 - k) * 0.9;
      m.material.color.setRGB(1, 0.7 - k * 0.5, 0.3 - k * 0.3);
    }
  }

  reset() {
    this.glow.clear(); this.smoke.clear();
    for (const m of this.tracers) m.visible = false;
    for (const m of this.rings) m.visible = false;
    for (const m of this.balls) m.visible = false;
    for (const d of this.debris) { d.mesh.visible = false; d.body = null; }
    for (const s of this.shells) { s.mesh.visible = false; s.body = null; }
    this.decals.count = 0; this.decalIdx = 0;
    for (const l of this.lights) { l.intensity = 0; l.userData.t = 0; }
  }
}
