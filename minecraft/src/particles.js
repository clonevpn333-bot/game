// ============================================================================
//  Lightweight GPU point particle system (block break, explosions, splashes)
// ============================================================================
import * as THREE from 'three';
import { GRAVITY } from './constants.js';

const MAX = 900;

export class Particles {
  constructor(scene) {
    this.scene = scene;
    this.pos = new Float32Array(MAX * 3);
    this.col = new Float32Array(MAX * 3);
    this.vel = new Float32Array(MAX * 3);
    this.life = new Float32Array(MAX);
    this.size = new Float32Array(MAX);
    this.head = 0;
    const g = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
    this.colAttr = new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.posAttr);
    g.setAttribute('color', this.colAttr);
    const mat = new THREE.PointsMaterial({ size: 0.14, vertexColors: true, transparent: true, depthWrite: false, sizeAttenuation: true });
    this.points = new THREE.Points(g, mat);
    this.points.frustumCulled = false;
    g.setDrawRange(0, MAX);
    scene.add(this.points);
    for (let i = 0; i < MAX; i++) { this.life[i] = 0; this.pos[i * 3 + 1] = -9999; }
  }

  _spawn(x, y, z, vx, vy, vz, r, g, b, life) {
    const i = this.head; this.head = (this.head + 1) % MAX;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
    this.col[i * 3] = r; this.col[i * 3 + 1] = g; this.col[i * 3 + 2] = b;
    this.life[i] = life;
  }

  blockBreak(x, y, z, color = [0.6, 0.5, 0.4]) {
    for (let i = 0; i < 14; i++)
      this._spawn(x + (Math.random() - 0.5) * 0.5, y + (Math.random() - 0.5) * 0.5, z + (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 2, Math.random() * 2.5, (Math.random() - 0.5) * 2,
        color[0] * (0.7 + Math.random() * 0.3), color[1] * (0.7 + Math.random() * 0.3), color[2] * (0.7 + Math.random() * 0.3), 0.8 + Math.random() * 0.4);
  }
  explosion(x, y, z) {
    for (let i = 0; i < 120; i++) {
      const s = 2 + Math.random() * 7;
      const d = new THREE.Vector3().randomDirection().multiplyScalar(s);
      const t = Math.random();
      this._spawn(x, y, z, d.x, Math.abs(d.y) * 0.6 + 2, d.z, 1, 0.4 + t * 0.4, 0.1, 0.6 + Math.random() * 0.5);
    }
  }
  splash(x, y, z) {
    for (let i = 0; i < 16; i++)
      this._spawn(x, y, z, (Math.random() - 0.5) * 3, Math.random() * 3, (Math.random() - 0.5) * 3, 0.3, 0.5, 0.95, 0.6);
  }

  update(dt) {
    for (let i = 0; i < MAX; i++) {
      if (this.life[i] <= 0) { if (this.pos[i * 3 + 1] !== -9999) this.pos[i * 3 + 1] = -9999; continue; }
      this.life[i] -= dt;
      this.vel[i * 3 + 1] -= GRAVITY * 0.5 * dt;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      if (this.life[i] <= 0) this.pos[i * 3 + 1] = -9999;
    }
    this.posAttr.needsUpdate = true;
    this.colAttr.needsUpdate = true;
  }
}
