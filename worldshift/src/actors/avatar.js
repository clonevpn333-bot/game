// Visual character built from the procedural rig. Used for the player and
// hero NPCs (crowd NPCs use the instanced renderer in crowd.js).
import * as THREE from 'three';
import { PART_DEFS, bodyGeometries, solveSkeleton, makeJointMatrices, J, NJ } from './rig.js';
import { patchActorMaterial } from '../world/materials.js';

const _m = new THREE.Matrix4();
const _local = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3();

export const PLAYER_LOOK = {
  skin: '#c8906c', hair: '#1c1612', top: '#2a3442', sleeve: '#2a3442', forearm: '#2a3442', legs: '#22262c', shoes: '#151515',
  coat: '#3a2f2a', hairStyle: 'hair', harness: true, scarf: '#8a2a2a',
};

export class Avatar {
  constructor(look = PLAYER_LOOK, era = -1, opts = {}) {
    this.group = new THREE.Group();
    this.joints = makeJointMatrices();
    this.parts = [];
    this.look = look;
    const geos = bodyGeometries();
    const mats = {};
    const mk = (slot, color, rough = 0.8, metal = 0, emissive = null) => {
      const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: rough, metalness: metal });
      if (emissive) { m.emissive = new THREE.Color(emissive); m.emissiveIntensity = 2.5; }
      patchActorMaterial(m, era);
      mats[slot] = m;
      return m;
    };
    mk('skin', look.skin, 0.6);
    mk('hair', look.hair, 0.75);
    mk('top', look.top, 0.85);
    mk('sleeve', look.sleeve || look.top, 0.85);
    mk('forearm', look.forearm || look.sleeve || look.top, 0.85);
    mk('legs', look.legs, 0.85);
    mk('shoes', look.shoes, 0.5);
    mk('coat', look.coat || look.top, 0.8);
    mk('accent', look.accent || '#30e0ff', 0.3, 0.2, look.accent || '#30e0ff');
    mk('scarf', look.scarf || '#555', 0.9);
    mk('eye', '#101010', 0.2);
    this.mats = mats;
    for (const def of PART_DEFS) {
      let key = def[1];
      if (key === 'hair') {
        if (look.hairStyle === 'none') continue;
        key = look.hairStyle === 'long' ? 'longhair' : 'hair';
      }
      const mesh = new THREE.Mesh(geos[key], mats[def[8]]);
      mesh.matrixAutoUpdate = false;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      this.group.add(mesh);
      this.parts.push({ mesh, joint: def[0], ox: def[2], oy: def[3], oz: def[4] });
    }
    // eyes
    const eyeG = new THREE.SphereGeometry(0.014, 8, 6);
    for (const sx of [-0.035, 0.035]) {
      const e = new THREE.Mesh(eyeG, mats.eye);
      e.matrixAutoUpdate = false;
      this.group.add(e);
      this.parts.push({ mesh: e, joint: J.head, ox: sx, oy: 0.125, oz: 0.098 });
    }
    // coat skirt (swings with motion)
    if (look.coat) {
      const coat = new THREE.Mesh(geos.coat, mats.coat);
      coat.matrixAutoUpdate = false;
      coat.castShadow = true;
      coat.material.side = THREE.DoubleSide;
      this.group.add(coat);
      this.coat = coat;
    }
    if (look.scarf) {
      const sg = new THREE.TorusGeometry(0.075, 0.03, 8, 16);
      sg.rotateX(Math.PI / 2);
      const s = new THREE.Mesh(sg, mats.scarf);
      s.matrixAutoUpdate = false;
      s.castShadow = true;
      this.group.add(s);
      this.parts.push({ mesh: s, joint: J.neck, ox: 0, oy: 0.0, oz: 0 });
    }
    if (look.harness) {
      const h = new THREE.Mesh(geos.harness, mats.accent);
      h.matrixAutoUpdate = false;
      this.group.add(h);
      this.parts.push({ mesh: h, joint: J.chest, ox: 0, oy: 0.0, oz: 0 });
      const h2 = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 6, 18), mats.accent);
      h2.geometry.translate(0, 0.06, -0.17);
      h2.matrixAutoUpdate = false;
      this.group.add(h2);
      this.parts.push({ mesh: h2, joint: J.chest, ox: 0, oy: 0.0, oz: 0 });
      // wrist bands
      for (const j of [J.elL, J.elR]) {
        const b = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 14), mats.accent);
        b.geometry.rotateX(Math.PI / 2);
        b.matrixAutoUpdate = false;
        this.group.add(b);
        this.parts.push({ mesh: b, joint: j, ox: 0, oy: -0.22, oz: 0 });
      }
    }
    if (look.cap) this._accessory(geos.cap, look.capColor || '#2a4a8a', J.head, 0, 0.17, 0.0, era);
    if (look.helmet) this._accessory(geos.helmet, look.helmetColor || '#1a1e24', J.head, 0, 0.13, 0.0, era, 0.4, 0.5);
    if (look.visor) this._accessory(geos.visor, look.visorColor || '#30e0ff', J.head, 0, 0.13, 0.1, era, 0.2, 0, look.visorColor || '#30e0ff');
    if (look.mask) this._accessory(geos.mask, look.maskColor || '#4a4038', J.head, 0, 0.1, 0.012, era);
    if (look.backpack) this._accessory(geos.backpack, look.packColor || '#4a3a2a', J.chest, 0, 0, 0, era);
    // held item slot
    this.heldMesh = null;
    this.coatSwing = new THREE.Vector2();
    this.coatVel = new THREE.Vector2();
    this.scale = opts.scale || 1;
  }

  _accessory(geo, color, joint, ox, oy, oz, era, rough = 0.7, metal = 0, emissive = null) {
    const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: rough, metalness: metal });
    if (emissive) { m.emissive = new THREE.Color(emissive); m.emissiveIntensity = 3; }
    patchActorMaterial(m, era);
    const mesh = new THREE.Mesh(geo, m);
    mesh.matrixAutoUpdate = false;
    mesh.castShadow = true;
    this.group.add(mesh);
    this.parts.push({ mesh, joint, ox, oy, oz });
  }

  setHeld(mesh) {
    if (this.heldMesh) this.group.remove(this.heldMesh);
    this.heldMesh = mesh;
    if (mesh) {
      mesh.matrixAutoUpdate = false;
      this.group.add(mesh);
    }
  }

  // root: position + yaw; pose: Pose
  update(pose, x, y, z, yaw, dt, velLocal = null) {
    _q.setFromAxisAngle(_v.set(0, 1, 0), yaw);
    _m.compose(_v.set(x, y, z), _q, _s.set(this.scale, this.scale, this.scale));
    solveSkeleton(pose, _m, this.joints);
    for (const p of this.parts) {
      _local.makeTranslation(p.ox, p.oy, p.oz);
      p.mesh.matrix.multiplyMatrices(this.joints[p.joint], _local);
      p.mesh.matrixWorldNeedsUpdate = true;
    }
    if (this.coat) {
      // spring the coat against local velocity
      const tx = velLocal ? -velLocal.x * 0.06 : 0;
      const tz = velLocal ? Math.max(-0.9, Math.min(0.2, -velLocal.z * 0.09)) : 0;
      const k = 60, d = 9;
      this.coatVel.x += ((tx - this.coatSwing.x) * k - this.coatVel.x * d) * dt;
      this.coatVel.y += ((tz - this.coatSwing.y) * k - this.coatVel.y * d) * dt;
      this.coatSwing.x += this.coatVel.x * dt;
      this.coatSwing.y += this.coatVel.y * dt;
      // legs spread affects the skirt: average thigh pitch
      const avgLeg = (pose.r[J.thL * 3] + pose.r[J.thR * 3]) * 0.5;
      _e.set(this.coatSwing.y + Math.min(0, avgLeg) * 0.55, 0, this.coatSwing.x, 'XYZ');
      _q.setFromEuler(_e);
      _local.compose(_v.set(0, -0.02, 0), _q, _s.set(1, 1, 1));
      this.coat.matrix.multiplyMatrices(this.joints[J.hips], _local);
      this.coat.matrixWorldNeedsUpdate = true;
    }
    if (this.heldMesh) {
      this.heldMesh.matrix.multiplyMatrices(this.joints[J.haR], this.heldOffset || _local.identity());
      this.heldMesh.matrixWorldNeedsUpdate = true;
    }
  }

  handWorld(right = true, out = new THREE.Vector3()) {
    return out.setFromMatrixPosition(this.joints[right ? J.haR : J.haL]);
  }
  headWorld(out = new THREE.Vector3()) {
    return out.setFromMatrixPosition(this.joints[J.head]);
  }
  setVisible(v) { this.group.visible = v; }
}

export { NJ };
