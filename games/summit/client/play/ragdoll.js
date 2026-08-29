/* Verlet ragdoll. When a climber takes a real fall the rig hands over to this:
 * eleven weighted particles, distance constraints and terrain collision, mapped
 * back onto the skeleton so the body tumbles with actual weight. */
import * as THREE from '../../../../vendor/three/three.module.js';

const NAMES = ['hips', 'chest', 'head', 'shL', 'shR', 'handL', 'handR', 'kneeL', 'kneeR', 'footL', 'footR'];

export class Ragdoll {
  constructor(rig, world) {
    this.rig = rig;
    this.world = world;
    this.p = {};
    this.prev = {};
    this.active = false;
    this.time = 0;
    for (const n of NAMES) { this.p[n] = new THREE.Vector3(); this.prev[n] = new THREE.Vector3(); }
    this.links = [
      ['hips', 'chest', 0.38, 1], ['chest', 'head', 0.24, 1],
      ['chest', 'shL', 0.20, 1], ['chest', 'shR', 0.20, 1],
      ['shL', 'handL', 0.54, 0.85], ['shR', 'handR', 0.54, 0.85],
      ['hips', 'kneeL', 0.46, 1], ['hips', 'kneeR', 0.46, 1],
      ['kneeL', 'footL', 0.44, 1], ['kneeR', 'footR', 0.44, 1],
      ['hips', 'shL', 0.52, 0.5], ['hips', 'shR', 0.52, 0.5],
      ['shL', 'shR', 0.40, 0.7], ['kneeL', 'kneeR', 0.26, 0.25],
      ['hips', 'head', 0.60, 0.35],
    ];
    this._v = new THREE.Vector3();
    this._q = new THREE.Quaternion();
    this._m = new THREE.Matrix4();
  }

  /** Snapshots the current pose and starts simulating. */
  start(velocity) {
    const b = this.rig.byName;
    const get = (name) => b.get(name).getWorldPosition(new THREE.Vector3());
    this.rig.root.updateMatrixWorld(true);
    const map = {
      hips: get('hips'), chest: get('chest'), head: get('head'),
      shL: get('armL'), shR: get('armR'), handL: get('handL'), handR: get('handR'),
      kneeL: get('shinL'), kneeR: get('shinR'), footL: get('footL'), footR: get('footR'),
    };
    for (const n of NAMES) {
      this.p[n].copy(map[n]);
      this.prev[n].copy(map[n]).addScaledVector(velocity || ZERO, -1 / 60);
    }
    this.active = true;
    this.time = 0;
    this.settle = 0;
  }

  stop() { this.active = false; }

  update(dt) {
    if (!this.active) return;
    dt = Math.min(dt, 1 / 45);
    this.time += dt;
    const g = -21.5;
    for (const n of NAMES) {
      const p = this.p[n], q = this.prev[n];
      const vx = (p.x - q.x) * 0.992, vy = (p.y - q.y) * 0.992, vz = (p.z - q.z) * 0.992;
      q.copy(p);
      p.x += vx; p.y += vy + g * dt * dt; p.z += vz;
    }
    for (let it = 0; it < 6; it++) {
      for (const [a, b, len, stiff] of this.links) this.constrain(a, b, len, stiff);
      this.collide();
    }
    this.applyToRig();
    const speed = this.p.hips.distanceTo(this.prev.hips) / dt;
    if (speed < 0.35) this.settle += dt; else this.settle = 0;
  }

  constrain(an, bn, len, stiff) {
    const a = this.p[an], b = this.p[bn];
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
    const d = Math.hypot(dx, dy, dz) || 1e-5;
    const k = ((d - len) / d) * 0.5 * stiff;
    a.x += dx * k; a.y += dy * k; a.z += dz * k;
    b.x -= dx * k; b.y -= dy * k; b.z -= dz * k;
  }

  collide() {
    for (const n of NAMES) {
      const p = this.p[n];
      const h = this.world.height(p.x, p.z) + 0.11;
      if (p.y < h) {
        const q = this.prev[n];
        p.y = h;
        // friction and a little bounce off the slope
        const nrm = this.world.normal(p.x, p.z);
        const vx = p.x - q.x, vz = p.z - q.z;
        q.x = p.x - vx * 0.55; q.z = p.z - vz * 0.55;
        q.y = p.y + (p.y - q.y) * 0.22;
        p.x += nrm.x * 0.012; p.z += nrm.z * 0.012;
      }
    }
  }

  /** Drives the skeleton from the particles. */
  applyToRig() {
    const b = this.rig.byName;
    const rootWorld = this.rig.mesh;
    rootWorld.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(rootWorld.matrixWorld).invert();

    // hips: position + orientation from hips->chest and shoulder line
    const up = this._v.copy(this.p.chest).sub(this.p.hips).normalize();
    const across = new THREE.Vector3().subVectors(this.p.shL, this.p.shR).normalize();
    const fwd = new THREE.Vector3().crossVectors(across, up).normalize();
    const m = this._m.makeBasis(across, up, fwd);
    const worldQ = new THREE.Quaternion().setFromRotationMatrix(m);
    const parentQ = new THREE.Quaternion();
    rootWorld.getWorldQuaternion(parentQ);
    b.get('hips').quaternion.copy(parentQ.invert().multiply(worldQ));
    b.get('hips').position.copy(this.p.hips.clone().applyMatrix4(inv));
    b.get('hips').updateMatrixWorld(true);

    this.aim('spine1', this.p.hips, this.p.chest);
    this.aim('chest', this.p.hips, this.p.head);
    this.aim('armL', this.p.shL, this.p.handL);
    this.aim('armR', this.p.shR, this.p.handR);
    this.aim('thighL', this.p.hips, this.p.kneeL);
    this.aim('thighR', this.p.hips, this.p.kneeR);
    this.aim('shinL', this.p.kneeL, this.p.footL);
    this.aim('shinR', this.p.kneeR, this.p.footR);
  }

  /** Rotates a bone so its rest direction points from a to b in world space. */
  aim(name, a, b) {
    const bone = this.rig.byName.get(name);
    if (!bone) return;
    bone.updateWorldMatrix(true, false);
    const child = bone.children.find((c) => c.isBone);
    if (!child) return;
    const from = new THREE.Vector3().setFromMatrixPosition(bone.matrixWorld);
    const to = new THREE.Vector3().setFromMatrixPosition(child.matrixWorld);
    const cur = to.sub(from).normalize();
    const want = this._v.copy(b).sub(a).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(cur, want);
    const parentQ = new THREE.Quaternion();
    bone.parent.getWorldQuaternion(parentQ);
    const local = parentQ.clone().invert().multiply(q).multiply(parentQ);
    bone.quaternion.premultiply(local);
    bone.updateMatrixWorld(true);
  }

  get settled() { return this.settle > 1.1; }
}

const ZERO = new THREE.Vector3();
