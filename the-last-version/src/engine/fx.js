// GPU particle pools (smoke, sparks, spray, debris dust) and skid-mark decals.
import * as THREE from 'three';

const VS = `
attribute float aSize; attribute float aAlpha; attribute vec3 aColor; attribute float aRot;
varying float vAlpha; varying vec3 vColor; varying float vRot;
void main(){ vAlpha = aAlpha; vColor = aColor; vRot = aRot;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * (600.0 / -mv.z);
  gl_Position = projectionMatrix * mv; }`;
const FS_SOFT = `
uniform sampler2D tTex; varying float vAlpha; varying vec3 vColor; varying float vRot;
void main(){ vec2 p = gl_PointCoord - 0.5; float c = cos(vRot), s = sin(vRot); p = mat2(c, -s, s, c) * p;
  vec4 t = texture2D(tTex, p + 0.5); if (t.a * vAlpha < 0.01) discard; gl_FragColor = vec4(vColor * t.rgb, t.a * vAlpha); }`;

function puffTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  for (let i = 0; i < 14; i++) {
    const x = 32 + (Math.random() - 0.5) * 22, y = 32 + (Math.random() - 0.5) * 22, r = 10 + Math.random() * 14;
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  }
  return new THREE.CanvasTexture(c);
}
function dotTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d');
  const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c);
}

export class Particles {
  constructor(scene, { max = 600, additive = false, texture = 'puff' } = {}) {
    this.max = max;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(max * 3); this.size = new Float32Array(max); this.alpha = new Float32Array(max); this.col = new Float32Array(max * 3); this.rot = new Float32Array(max);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aRot', new THREE.BufferAttribute(this.rot, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({ uniforms: { tTex: { value: texture === 'puff' ? puffTexture() : dotTexture() } }, vertexShader: VS, fragmentShader: FS_SOFT, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });
    this.points = new THREE.Points(g, this.mat); this.points.frustumCulled = false; scene.add(this.points);
    this.p = Array.from({ length: max }, () => ({ life: 0 }));
    this.i = 0;
  }
  emit(pos, vel, { life = 1.5, size = 1, grow = 2, color = [0.6, 0.6, 0.6], alpha = 0.6, drag = 1, gravity = 0, spin = 0.5 } = {}) {
    const q = this.p[this.i]; this.i = (this.i + 1) % this.max;
    Object.assign(q, { x: pos.x, y: pos.y, z: pos.z, vx: vel.x, vy: vel.y, vz: vel.z, life, max: life, size, grow, color, alpha, drag, gravity, rot: Math.random() * 6, spin: (Math.random() - 0.5) * spin });
  }
  update(dt) {
    for (let k = 0; k < this.max; k++) {
      const q = this.p[k];
      if (q.life <= 0) { this.alpha[k] = 0; this.size[k] = 0; continue; }
      q.life -= dt;
      const d = Math.exp(-q.drag * dt);
      q.vx *= d; q.vy = q.vy * d - q.gravity * dt; q.vz *= d;
      q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt; q.rot += q.spin * dt;
      const t = 1 - q.life / q.max;
      this.pos[k * 3] = q.x; this.pos[k * 3 + 1] = q.y; this.pos[k * 3 + 2] = q.z;
      this.size[k] = q.size * (1 + q.grow * t);
      this.alpha[k] = q.alpha * Math.min(1, t * 8) * (1 - t);
      this.col[k * 3] = q.color[0]; this.col[k * 3 + 1] = q.color[1]; this.col[k * 3 + 2] = q.color[2];
      this.rot[k] = q.rot;
    }
    for (const a of ['position', 'aSize', 'aAlpha', 'aColor', 'aRot']) this.geo.attributes[a].needsUpdate = true;
  }
  dispose() { this.points.parent?.remove(this.points); this.geo.dispose(); this.mat.dispose(); }
}

/** Ring buffer of flat quads for tyre marks (or wakes). */
export class Decals {
  constructor(scene, { max = 600, color = 0x050505, opacity = 0.55, width = 0.24 } = {}) {
    this.max = max; this.w = width;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(max * 4 * 3);
    this.alpha = new Float32Array(max * 4);
    const idx = [];
    for (let i = 0; i < max; i++) idx.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3);
    g.setIndex(idx);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aA', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uC: { value: new THREE.Color(color) }, uO: { value: opacity } },
      vertexShader: 'attribute float aA; varying float vA; void main(){ vA = aA; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 uC; uniform float uO; varying float vA; void main(){ gl_FragColor = vec4(uC, vA * uO); }',
      transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
    });
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.frustumCulled = false; scene.add(this.mesh);
    this.geo = g; this.i = 0; this.last = new Map();
  }
  /** Add a segment from the previous point of `key` to p (world). */
  add(key, p, strength = 1) {
    const prev = this.last.get(key);
    this.last.set(key, p.clone());
    if (!prev || prev.distanceToSquared(p) > 9 || prev.distanceToSquared(p) < 0.01) return;
    const dir = p.clone().sub(prev).normalize();
    const side = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(this.w / 2);
    const k = this.i; this.i = (this.i + 1) % this.max;
    const v = [prev.clone().add(side), prev.clone().sub(side), p.clone().sub(side), p.clone().add(side)];
    v.forEach((q, j) => { this.pos[(k * 4 + j) * 3] = q.x; this.pos[(k * 4 + j) * 3 + 1] = q.y + 0.02; this.pos[(k * 4 + j) * 3 + 2] = q.z; this.alpha[k * 4 + j] = strength; });
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.aA.needsUpdate = true;
  }
  break(key) { this.last.delete(key); }
  dispose() { this.mesh.parent?.remove(this.mesh); this.geo.dispose(); }
}
