// Character rendering: body parts are separate instanced meshes so every visible
// person animates (walk/run cycles, sitting, lying down, hoses, handcuffs...)
// in a few draw calls.
import * as THREE from 'three';
import { ModelKit, makeInstMaterial, InstPool } from './materials.js';
import { UNIFORMS } from '../sim/citizens.js';

const tmpM = new THREE.Matrix4(), base = new THREE.Matrix4(), part = new THREE.Matrix4(), rot = new THREE.Matrix4();
const q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
const C1 = new THREE.Color(), C2 = new THREE.Color();
const sphere = new THREE.Sphere();

function partGeo(fn) { const k = new ModelKit(); fn(k); return k.build(); }

export class PeopleView {
  constructor(renderer, world) {
    this.R = renderer;
    this.world = world;
    const U = renderer.U;
    const mat = makeInstMaterial(U, { key: 'ppl', roughness: 0.75, metalness: 0.0, snow: false });
    const cap = 900;
    // pivot conventions: torso origin at hips, legs/arms origin at joint (extend downward)
    const G = {
      torso: partGeo((k) => { k.taper(0, 0, 0, 0.44, 0.26, 0.5, 0.28, 0.62, '#ffffff', 1); k.box(0, 0.66, 0, 0.14, 0.08, 0.12, '#ffffff', 2); }),
      head: partGeo((k) => { k.sphere(0, 0.12, 0, 0.13, '#ffffff', 2, 0, 0.92, 1.12, 1, 1); k.box(0, 0.11, 0.115, 0.05, 0.05, 0.03, '#ffffff', 2); }),
      hair: partGeo((k) => { k.sphere(0, 0.18, -0.015, 0.135, '#ffffff', 1, 0, 1.0, 0.72, 1.04, 1); }),
      hat: partGeo((k) => { k.cyl(0, 0.24, 0, 0.14, 0.09, '#ffffff', 10, 1); k.box(0, 0.205, 0.1, 0.24, 0.025, 0.14, '#ffffff', 1); }),
      leg: partGeo((k) => { k.taper(0, -0.84, 0, 0.13, 0.15, 0.17, 0.18, 0.84, '#ffffff', 1); k.box(0, -0.86, 0.04, 0.12, 0.08, 0.26, '#2a2420'); }),
      arm: partGeo((k) => { k.taper(0, -0.56, 0, 0.09, 0.1, 0.12, 0.13, 0.56, '#ffffff', 1); k.box(0, -0.6, 0, 0.08, 0.1, 0.09, '#ffffff', 2); }),
      umbrella: partGeo((k) => { k.cyl(0, 0.45, 0, 0.012, 0.9, '#222222', 4); k.cyl(0, 0.92, 0, 0.55, 0.2, '#ffffff', 10, 1, 0, null, 0.04); }),
      tool: partGeo((k) => { k.box(0, -0.05, 0.25, 0.06, 0.06, 0.55, '#3a3a3a'); }),
    };
    this.pools = {};
    for (const k in G) {
      const pool = new InstPool(G[k], mat, k === 'leg' || k === 'arm' ? cap * 2 : cap, { shadow: k !== 'umbrella' && k !== 'hat', receive: true });
      renderer.scene.add(pool.mesh);
      this.pools[k] = pool;
    }
    this.frustum = new THREE.Frustum();
    this.pm = new THREE.Matrix4();
    this.visible = [];
    this.umbrellaCols = ['#2a2a30', '#c03030', '#2a5aa0', '#e0b020', '#3a7a4a', '#7a3a8a'].map((c) => new THREE.Color(c));
    this.extra = []; // non-citizen figures (e.g. interior NPCs) supplied by other views
  }

  lookFor(c) {
    const role = c.job && (c.duty != null || c.working) ? c.job.role : null;
    const uni = role && UNIFORMS[role];
    return {
      shirt: uni ? uni.shirt : c.look.shirt,
      pants: uni ? uni.pants : c.look.pants,
      hat: uni && uni.hat ? uni.hat : c.look.hat ? c.look.shirt : null,
      skin: c.look.skin, hair: c.look.hair, h: c.look.height, b: c.look.build, style: c.look.hairStyle,
    };
  }

  update(dt) {
    const W = this.world;
    const cam = this.R.camera;
    this.pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.pm);
    for (const k in this.pools) this.pools[k].begin();
    this.visible.length = 0;
    const cx = cam.position.x, cz = cam.position.z, cy = cam.position.y;
    const maxD = Math.max(240, cy * 2.2);
    for (const ped of W.peds.list) {
      if (ped.hidden) continue;
      const d2 = (ped.x - cx) ** 2 + (ped.z - cz) ** 2;
      if (d2 > maxD * maxD) continue;
      sphere.center.set(ped.x, (ped.y || 0) + 1, ped.z); sphere.radius = 1.2;
      if (!this.frustum.intersectsSphere(sphere)) continue;
      const c = W.citizens[ped.cid];
      this.drawPerson(ped, this.lookFor(c), d2 < 90 * 90);
      this.visible.push(ped);
    }
    for (const f of this.extra) this.drawPerson(f, f.look, true);
    for (const k in this.pools) this.pools[k].end();
  }

  drawPerson(ped, L, detail) {
    const P = this.pools;
    const scale = L.h || 1;
    const act = ped.action || '';
    const moving = ped.v > 0.1 && ped.state === 'walk';
    const run = ped.run && moving;
    const ph = ped.anim || 0;
    let swing = moving ? Math.sin(ph * (run ? 1.6 : 1.25)) * (run ? 0.85 : 0.5) : 0;
    let bob = moving ? Math.abs(Math.cos(ph * (run ? 1.6 : 1.25))) * (run ? 0.07 : 0.035) : Math.sin(ph * 2) * 0.006;
    let lie = 0, sit = 0, kneel = 0, lean = run ? 0.18 : 0;
    if (act === 'down' || act === 'sleep' || ped.fallen > 0) lie = 1;
    if (act === 'sit') sit = 1;
    if (act === 'kneel' || act === 'repair' && (ped.id % 2 === 0)) kneel = 1;
    // base transform
    let y = (ped.y || 0) + bob;
    e.set(lie ? -Math.PI / 2 : lean, ped.h, 0, 'YXZ');
    if (lie) y += 0.16;
    q.setFromEuler(e);
    p.set(ped.x, y, ped.z);
    s.set(scale * (L.b || 1), scale, scale * (L.b || 1));
    base.compose(p, q, s);
    if (lie) base.multiply(tmpM.makeTranslation(0, 0, -0.1));
    const hipY = sit ? 0.48 : kneel ? 0.55 : 0.9;
    C1.set(L.shirt); C2.set(L.skin);
    // torso
    part.makeTranslation(0, hipY, 0);
    tmpM.multiplyMatrices(base, part);
    P.torso.add(tmpM, C1, C2);
    // head
    let headTurn = 0;
    part.makeTranslation(0, hipY + 0.68, 0);
    if (act === 'phone') rot.makeRotationZ(0.15), part.multiply(rot);
    tmpM.multiplyMatrices(base, part);
    P.head.add(tmpM, C2, C2);
    if (detail) {
      C1.set(L.hair);
      if (L.hat) { const hc = new THREE.Color(L.hat); P.hat.add(tmpM, hc, hc); }
      else if (L.style !== 4) P.hair.add(tmpM, C1, C1);
    }
    // legs
    C1.set(L.pants);
    for (const side of [-1, 1]) {
      let a = swing * side;
      if (sit) a = -Math.PI / 2;
      if (kneel) a = side > 0 ? -Math.PI / 2 : 0.2;
      part.makeTranslation(side * 0.11, hipY, 0);
      rot.makeRotationX(a);
      part.multiply(rot);
      if (kneel && side < 0) part.multiply(tmpM.makeTranslation(0, 0.35, 0));
      tmpM.multiplyMatrices(base, part);
      P.leg.add(tmpM, C1, C2);
    }
    // arms
    C1.set(L.shirt);
    for (const side of [-1, 1]) {
      let ax = -swing * side * 0.9, az = side * 0.06;
      if (act === 'hose' || act === 'repair' || act === 'build' || act === 'kneel' || act === 'carry') ax = -1.2 + (act === 'build' || act === 'repair' ? Math.sin(ph * 6 + side) * 0.3 : 0);
      if (act === 'cuffed') { ax = 0.5; az = -side * 0.25; }
      if (act === 'phone' && side > 0) { ax = -2.4; az = 0.4; }
      if (act === 'hail' && side > 0) { ax = -2.8; az = 0.3; }
      if (act === 'direct' && side > 0) { ax = -1.5; az = 1.2 + Math.sin(ph * 3) * 0.4; }
      if (act === 'notes') { ax = -0.9; az = -side * 0.4; }
      if (act === 'arrest') { ax = -1.3; }
      if (act === 'wait' || act === 'watch') { ax = 0.05; }
      if (act === 'sit') ax = -0.5;
      if (ped.umbrella && side > 0 && !act) { ax = -1.1; az = 0.35; }
      if (run && !act) ax *= 1.3;
      part.makeTranslation(side * 0.29, hipY + 0.6, 0);
      e.set(ax, 0, az, 'XYZ');
      rot.makeRotationFromEuler(e);
      part.multiply(rot);
      tmpM.multiplyMatrices(base, part);
      P.arm.add(tmpM, C1, C2);
      if (side > 0 && (act === 'hose' || act === 'build' || act === 'repair') && detail) {
        part.multiply(tmpM.makeTranslation(0, -0.6, 0));
        tmpM.multiplyMatrices(base, part);
        P.tool.add(tmpM, C1, C2);
      }
    }
    if (ped.umbrella && detail && !lie && !act) {
      part.makeTranslation(0.08, hipY + 0.95, 0.05);
      tmpM.multiplyMatrices(base, part);
      const uc = this.umbrellaCols[ped.id % this.umbrellaCols.length];
      P.umbrella.add(tmpM, uc, uc);
    }
  }
}
