import * as THREE from 'three';

/**
 * Small verlet cloth (cloaks and capes). The top row is pinned between two anchor objects;
 * the rest swings under gravity, wind and body collision. It's simulated in world space so
 * running, rolling and turning all drag the cloth naturally.
 */
export class Cloth {
  readonly mesh: THREE.Mesh;
  private readonly pos: THREE.Vector3[] = [];
  private readonly prev: THREE.Vector3[] = [];
  private readonly rest: number;
  private readonly restY: number;
  private initialized = false;
  private readonly tmpA = new THREE.Vector3();
  private readonly tmpB = new THREE.Vector3();
  private readonly tmpC = new THREE.Vector3();
  readonly colliders: Array<{ obj: THREE.Object3D; offset: THREE.Vector3; r: number }> = [];
  wind = new THREE.Vector3(0.6, 0, 0.3);
  gravity = 9.8;

  constructor(
    private readonly cols: number,
    private readonly rows: number,
    width: number,
    length: number,
    material: THREE.Material,
    private readonly anchorL: THREE.Object3D,
    private readonly anchorR: THREE.Object3D,
    private readonly flare = 1.35,
  ) {
    const geo = new THREE.PlaneGeometry(width, length, cols - 1, rows - 1);
    this.mesh = new THREE.Mesh(geo, material);
    this.mesh.castShadow = true;
    this.mesh.frustumCulled = false;
    this.rest = width / (cols - 1);
    this.restY = length / (rows - 1);
    for (let i = 0; i < cols * rows; i += 1) {
      this.pos.push(new THREE.Vector3());
      this.prev.push(new THREE.Vector3());
    }
    // Tattered hem: shorten alternate bottom columns via UV-independent geometry jitter.
  }

  private anchorPoint(col: number, target: THREE.Vector3): THREE.Vector3 {
    this.anchorL.getWorldPosition(this.tmpA);
    this.anchorR.getWorldPosition(this.tmpB);
    const t = col / (this.cols - 1);
    return target.copy(this.tmpB).lerp(this.tmpA, t);
  }

  reset(): void {
    this.initialized = false;
  }

  private init(): void {
    const down = new THREE.Vector3(0, -1, 0);
    for (let r = 0; r < this.rows; r += 1) {
      for (let c = 0; c < this.cols; c += 1) {
        const i = r * this.cols + c;
        this.anchorPoint(c, this.pos[i]).addScaledVector(down, r * this.restY);
        this.prev[i].copy(this.pos[i]);
      }
    }
    this.initialized = true;
  }

  private readonly lastAnchor = new THREE.Vector3();

  update(dt: number, time: number): void {
    this.anchorL.getWorldPosition(this.tmpA);
    if (this.initialized && this.tmpA.distanceTo(this.lastAnchor) > 3) this.initialized = false;
    this.lastAnchor.copy(this.tmpA);
    if (!this.initialized) this.init();
    const steps = 2;
    const h = Math.min(dt, 1 / 30) / steps;
    for (let s = 0; s < steps; s += 1) {
      const gust = 0.6 + 0.4 * Math.sin(time * 1.7) * Math.sin(time * 0.6 + 1);
      for (let r = 1; r < this.rows; r += 1) {
        for (let c = 0; c < this.cols; c += 1) {
          const i = r * this.cols + c;
          const p = this.pos[i];
          const v = this.tmpC.copy(p).sub(this.prev[i]).multiplyScalar(0.975);
          this.prev[i].copy(p);
          p.add(v);
          p.y -= this.gravity * h * h;
          const w = (r / this.rows) * gust * h * h * 6;
          p.x += this.wind.x * w * (1 + Math.sin(time * 3 + c) * 0.3);
          p.z += this.wind.z * w;
        }
      }
      for (let c = 0; c < this.cols; c += 1) this.anchorPoint(c, this.pos[c]);
      for (let iter = 0; iter < 3; iter += 1) {
        for (let r = 0; r < this.rows; r += 1) {
          for (let c = 0; c < this.cols; c += 1) {
            const i = r * this.cols + c;
            const widthHere = this.rest * (1 + (this.flare - 1) * (r / (this.rows - 1)));
            if (c < this.cols - 1) this.satisfy(i, i + 1, widthHere, r === 0);
            if (r < this.rows - 1) this.satisfy(i, i + this.cols, this.restY, r === 0);
          }
        }
        for (const col of this.colliders) {
          col.obj.localToWorld(this.tmpA.copy(col.offset));
          for (let i = this.cols; i < this.pos.length; i += 1) {
            const p = this.pos[i];
            const d = this.tmpB.copy(p).sub(this.tmpA);
            const len = d.length();
            if (len < col.r && len > 1e-5) p.addScaledVector(d, (col.r - len) / len);
          }
        }
      }
    }
    // Write vertices (the mesh lives in world space).
    const attr = this.mesh.geometry.attributes.position as THREE.BufferAttribute;
    for (let r = 0; r < this.rows; r += 1) {
      for (let c = 0; c < this.cols; c += 1) {
        const i = r * this.cols + c;
        const p = this.pos[i];
        attr.setXYZ(i, p.x, p.y, p.z);
      }
    }
    attr.needsUpdate = true;
    this.mesh.geometry.computeVertexNormals();
    this.mesh.geometry.computeBoundingSphere();
  }

  private satisfy(a: number, b: number, rest: number, pinA: boolean): void {
    const pa = this.pos[a];
    const pb = this.pos[b];
    const d = this.tmpA.copy(pb).sub(pa);
    const len = d.length();
    if (len < 1e-6) return;
    const diff = (len - rest) / len;
    if (pinA && b < this.cols) return;
    if (pinA) {
      pb.addScaledVector(d, -diff);
    } else {
      pa.addScaledVector(d, diff * 0.5);
      pb.addScaledVector(d, -diff * 0.5);
    }
  }

  /** Teleport the whole cloth by an offset (respawn, world shifts). */
  shift(delta: THREE.Vector3): void {
    for (let i = 0; i < this.pos.length; i += 1) {
      this.pos[i].add(delta);
      this.prev[i].add(delta);
    }
  }
}
