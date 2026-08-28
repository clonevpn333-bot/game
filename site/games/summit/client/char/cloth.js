/* Verlet cloth for the scarf and the gear that hangs off a climber's harness.
 * Cheap: a handful of points per strip, solved three times a frame. */
import * as THREE from '../../../../vendor/three/three.module.js';

export class ClothStrip {
  /**
   * @param anchorBone bone the strip hangs from
   * @param opts { count, spacing, width, gravity, drag, stiffness, material, offset }
   */
  constructor(anchorBone, opts = {}) {
    this.bone = anchorBone;
    this.count = opts.count ?? 8;
    this.spacing = opts.spacing ?? 0.075;
    this.width = opts.width ?? 0.09;
    this.gravity = opts.gravity ?? -9.4;
    this.drag = opts.drag ?? 0.985;
    this.offset = opts.offset ? opts.offset.clone() : new THREE.Vector3(0, -0.02, -0.06);
    this.pts = [];
    this.prev = [];
    for (let i = 0; i < this.count; i++) {
      this.pts.push(new THREE.Vector3(0, -i * this.spacing, 0));
      this.prev.push(this.pts[i].clone());
    }
    const seg = this.count - 1;
    const geo = new THREE.PlaneGeometry(this.width, this.spacing * seg, 1, seg);
    geo.translate(0, -this.spacing * seg * 0.5, 0);
    this.geometry = geo;
    this.mesh = new THREE.Mesh(geo, opts.material);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = true;
    this._a = new THREE.Vector3();
    this._w = new THREE.Vector3();
    this.time = 0;
  }

  update(dt, wind, velocity) {
    dt = Math.min(dt, 1 / 30);
    this.time += dt;
    this.bone.updateWorldMatrix(true, false);
    const root = this._a.copy(this.offset).applyMatrix4(this.bone.matrixWorld);

    // Snap the whole strip to the anchor on the first frame, and after any jump
    // (respawn, teleport) — otherwise it stretches back to where it used to be.
    if (!this.inited || this.pts[0].distanceToSquared(root) > 4) {
      for (let i = 0; i < this.count; i++) {
        this.pts[i].set(root.x, root.y - i * this.spacing, root.z);
        this.prev[i].copy(this.pts[i]);
      }
      this.inited = true;
    }

    this._w.copy(wind || ZERO);
    this._w.x += Math.sin(this.time * 2.3) * 1.4;
    this._w.z += Math.cos(this.time * 1.7) * 1.1;
    if (velocity) this._w.addScaledVector(velocity, -1.15);

    for (let i = 0; i < this.count; i++) {
      const p = this.pts[i], q = this.prev[i];
      if (i === 0) { p.copy(root); q.copy(root); continue; }
      const vx = (p.x - q.x) * this.drag, vy = (p.y - q.y) * this.drag, vz = (p.z - q.z) * this.drag;
      q.copy(p);
      p.x += vx + this._w.x * dt * dt * 2.4;
      p.y += vy + (this.gravity + this._w.y) * dt * dt;
      p.z += vz + this._w.z * dt * dt * 2.4;
    }
    for (let iter = 0; iter < 3; iter++) {
      this.pts[0].copy(root);
      for (let i = 1; i < this.count; i++) {
        const a = this.pts[i - 1], b = this.pts[i];
        const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
        const d = Math.hypot(dx, dy, dz) || 1e-5;
        const k = (d - this.spacing) / d * (i === 1 ? 1 : 0.5);
        b.x -= dx * k; b.y -= dy * k; b.z -= dz * k;
        if (i > 1) { a.x += dx * k * 0.5; a.y += dy * k * 0.5; a.z += dz * k * 0.5; }
      }
    }
    this.writeGeometry();
  }

  writeGeometry() {
    const pos = this.geometry.attributes.position;
    const up = new THREE.Vector3(), side = new THREE.Vector3(), dir = new THREE.Vector3();
    for (let i = 0; i < this.count; i++) {
      const p = this.pts[i];
      const a = this.pts[Math.max(0, i - 1)], b = this.pts[Math.min(this.count - 1, i + 1)];
      dir.subVectors(b, a).normalize();
      up.set(0, 0, 1);
      side.crossVectors(dir, up);
      if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
      side.normalize().multiplyScalar(this.width * 0.5);
      pos.setXYZ(i * 2, p.x - side.x, p.y - side.y, p.z - side.z);
      pos.setXYZ(i * 2 + 1, p.x + side.x, p.y + side.y, p.z + side.z);
    }
    pos.needsUpdate = true;
    this.geometry.computeVertexNormals();
    this.geometry.computeBoundingSphere();
  }

  dispose() { this.geometry.dispose(); this.mesh.parent?.remove(this.mesh); }
}

const ZERO = new THREE.Vector3();

/** Scarf + a coil of rope on the harness. Added to the scene, not the skeleton. */
export function makeClothSet(rig, mats) {
  const scarf = new ClothStrip(rig.byName.get('neck'), {
    count: 7, spacing: 0.075, width: 0.115, material: mats.gear,
    offset: new THREE.Vector3(0, 0.02, -0.055), gravity: -7.5,
  });
  const tail = new ClothStrip(rig.byName.get('hips'), {
    count: 6, spacing: 0.055, width: 0.045, material: mats.gear,
    offset: new THREE.Vector3(0.16, 0.02, 0.02), gravity: -11, drag: 0.97,
  });
  return [scarf, tail];
}
