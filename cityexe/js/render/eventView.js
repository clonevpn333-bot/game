// Visuals for large events and their lasting marks on the city: tornado funnels,
// meteors, floodwater, escaped animals, craters, memorials, downed trees.
import * as THREE from 'three';
import { ModelKit, makeInstMaterial, InstPool } from './materials.js';
import { ANIMALS } from '../sim/disasters.js';

const tmpM = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
const C1 = new THREE.Color();

function animalModel(kind) {
  const k = new ModelKit();
  if (kind === 'elephant') {
    k.sphere(0, 1.9, 0, 1.0, '#ffffff', 1, 0, 1.0, 0.9, 1.8, 1);
    k.sphere(0, 2.3, 1.7, 0.7, '#ffffff', 1, 0, 1, 1, 1, 1);
    k.cyl(0, 1.5, 2.35, 0.18, 1.6, '#ffffff', 8, 1, 0, [0.35, 0, 0], 0.12);
    for (const sx of [-0.85, 0.85]) k.box(sx, 2.4, 1.5, 0.08, 0.9, 0.7, '#ffffff', 1);
    for (const [x, z] of [[-0.5, 0.9], [0.5, 0.9], [-0.5, -0.9], [0.5, -0.9]]) k.cyl(x, 0.6, z, 0.28, 1.2, '#ffffff', 8, 1);
  } else if (kind === 'giraffe') {
    k.sphere(0, 2.2, 0, 0.6, '#ffffff', 1, 0, 0.9, 0.8, 1.6, 1);
    k.cyl(0, 3.4, 0.8, 0.18, 2.4, '#ffffff', 8, 1, 0, [0.35, 0, 0], 0.12);
    k.box(0, 4.6, 1.3, 0.3, 0.3, 0.7, '#ffffff', 1);
    for (const [x, z] of [[-0.3, 0.6], [0.3, 0.6], [-0.3, -0.6], [0.3, -0.6]]) k.cyl(x, 0.95, z, 0.09, 1.9, '#ffffff', 6, 1);
    for (let i = 0; i < 10; i++) k.box((i % 3 - 1) * 0.35, 2.3 + (i % 2) * 0.25, -0.6 + (i / 10) * 1.2, 0.2, 0.05, 0.2, '#8a5a20');
  } else if (kind === 'ostrich') {
    k.sphere(0, 1.1, 0, 0.45, '#ffffff', 1, 0, 1, 0.8, 1.3, 1);
    k.cyl(0, 1.7, 0.35, 0.06, 1.0, '#e8c8b8', 6, 0, 0, [0.2, 0, 0]);
    k.sphere(0, 2.2, 0.45, 0.12, '#e8c8b8');
    for (const x of [-0.15, 0.15]) k.cyl(x, 0.45, 0, 0.05, 0.9, '#e8c8b8', 6);
  } else if (kind === 'zebra') {
    k.box(0, 1.1, 0, 0.6, 0.6, 1.6, '#ffffff', 1);
    for (let i = 0; i < 7; i++) k.box(0, 1.1, -0.7 + i * 0.22, 0.62, 0.62, 0.07, '#141414');
    k.box(0, 1.45, 0.95, 0.25, 0.6, 0.3, '#ffffff', 1, 0, [0.6, 0, 0]);
    k.box(0, 1.6, 1.2, 0.22, 0.25, 0.45, '#ffffff', 1);
    for (const [x, z] of [[-0.2, 0.6], [0.2, 0.6], [-0.2, -0.6], [0.2, -0.6]]) k.cyl(x, 0.45, z, 0.07, 0.9, '#ffffff', 6, 1);
  } else {
    k.sphere(0, 0.85, 0, 0.6, '#ffffff', 1, 0, 0.9, 0.8, 1.5, 1);
    k.sphere(0, 1.0, 0.95, 0.38, '#ffffff', 1);
    for (const [x, z] of [[-0.35, 0.5], [0.35, 0.5], [-0.35, -0.5], [0.35, -0.5]]) k.cyl(x, 0.3, z, 0.15, 0.6, '#ffffff', 6, 1);
  }
  return k.build();
}

export class EventView {
  constructor(renderer, world, cityView) {
    this.R = renderer;
    this.world = world;
    this.cityView = cityView;
    const scene = renderer.scene;
    // tornado funnel: stacked rotating translucent cones
    this.funnels = [];
    const fmat = new THREE.MeshStandardMaterial({ color: '#5a5a58', transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide, roughness: 1 });
    this.funnelGeo = new THREE.CylinderGeometry(26, 4, 160, 24, 8, true).translate(0, 80, 0);
    // wobble vertices so it reads as a twisting column
    const pa = this.funnelGeo.attributes.position;
    for (let i = 0; i < pa.count; i++) { const y = pa.getY(i); pa.setX(i, pa.getX(i) + Math.sin(y * 0.05) * 6); pa.setZ(i, pa.getZ(i) + Math.cos(y * 0.04) * 5); }
    this.funnelMat = fmat;
    // meteor
    this.meteorMesh = new THREE.Mesh(new THREE.SphereGeometry(4, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 3, 1), toneMapped: false }));
    this.meteorMesh.visible = false;
    scene.add(this.meteorMesh);
    this.meteorLight = { intensity: 0, position: new THREE.Vector3() };
    // flood water plane
    this.flood = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), cityView.waterMat);
    this.flood.visible = false;
    scene.add(this.flood);
    // animals
    const mat = makeInstMaterial(renderer.U, { key: 'animal', roughness: 0.9 });
    this.animalPools = {};
    for (const k in ANIMALS) { const pool = new InstPool(animalModel(k), mat, 8, { shadow: true }); scene.add(pool.mesh); this.animalPools[k] = pool; }
    // landmarks
    this.lmGroup = new THREE.Group();
    scene.add(this.lmGroup);
    this.lmCount = -1;
    this.craterTex = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const g = c.getContext('2d');
      const gr = g.createRadialGradient(64, 64, 10, 64, 64, 64);
      gr.addColorStop(0, 'rgba(20,16,12,1)'); gr.addColorStop(0.55, 'rgba(40,32,26,0.95)'); gr.addColorStop(0.75, 'rgba(70,60,50,0.7)'); gr.addColorStop(1, 'rgba(60,50,40,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
      return new THREE.CanvasTexture(c);
    })();
    world.on('meteorImpact', (m) => { this.flash = 1; });
    this.heliMeshes = new Map();
  }

  heliMesh(h) {
    let g = this.heliMeshes.get(h.id);
    if (g) return g;
    g = new THREE.Group();
    const k = new ModelKit();
    const body = h.kind === 'police' ? '#1f3a6a' : '#d03030';
    k.sphere(0, 0, 0.3, 1.3, body, 0, 0, 1.0, 0.95, 1.6, 1);
    k.sphere(0, 0.15, 1.35, 0.85, '#1a2430', 0, 7, 0.95, 0.75, 0.8, 1);
    k.cyl(0, 0.25, -2.8, 0.3, 4.2, body, 8, 0, 0, [Math.PI / 2, 0, 0], 0.15);
    k.box(0, 0.9, -4.8, 0.1, 1.3, 0.8, body);
    k.box(0, 1.25, 0.1, 0.4, 0.4, 0.4, '#2a2a2a');
    for (const sx of [-0.9, 0.9]) { k.box(sx, -1.25, 0.2, 0.08, 0.08, 3.2, '#3a3a3a'); k.box(sx, -0.95, 0.9, 0.06, 0.6, 0.06, '#3a3a3a'); k.box(sx, -0.95, -0.6, 0.06, 0.6, 0.06, '#3a3a3a'); }
    if (h.kind === 'news') { k.box(1.31, 0.1, 0.3, 0.02, 0.5, 1.4, '#ffffff'); k.box(-1.31, 0.1, 0.3, 0.02, 0.5, 1.4, '#ffffff'); }
    const geo = k.build(); geo.setAttribute('color', geo.getAttribute('aCol'));
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.3 }));
    mesh.castShadow = true;
    g.add(mesh);
    const rot = new THREE.Mesh(new THREE.BoxGeometry(11, 0.06, 0.35), new THREE.MeshStandardMaterial({ color: '#202020', transparent: true, opacity: 0.85 }));
    rot.position.y = 1.5;
    const rot2 = rot.clone(); rot2.rotation.y = Math.PI / 2;
    const rg = new THREE.Group(); rg.add(rot, rot2); rg.position.y = 0; g.add(rg);
    const tr = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.6, 0.2), new THREE.MeshStandardMaterial({ color: '#202020' }));
    tr.position.set(0.15, 0.9, -4.8);
    g.add(tr);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 0.3, 0.2), toneMapped: false }));
    beacon.position.set(0, -0.9, -1);
    g.add(beacon);
    g.userData = { rg, tr, beacon };
    if (h.kind === 'police') {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(9, 70, 20, 1, true).translate(0, -35, 0), new THREE.MeshBasicMaterial({ color: '#d8e4ff', transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      this.R.scene.add(cone);
      g.userData.cone = cone;
      g.userData.spot = true;
    }
    this.R.scene.add(g);
    this.heliMeshes.set(h.id, g);
    return g;
  }

  updateHelis(dt) {
    const W = this.world;
    for (const h of W.helis.list) {
      const g = this.heliMesh(h);
      g.position.set(h.x, h.y + 1.3, h.z);
      g.rotation.set(h.tilt || 0, h.h, h.roll || 0, 'YXZ');
      g.userData.rg.rotation.y = h.rotor;
      g.userData.tr.rotation.x = h.rotor * 2;
      g.userData.beacon.visible = Math.floor(h.t * 1.5) % 2 === 0;
      if (g.userData.spot) {
        const on = h.spot && h.look;
        g.userData.cone.visible = !!on;
        if (on) {
          this.fxRef && this.fxRef.lights.spotlight(h.x, h.y, h.z, h.look.x, 0, h.look.z, '#eef4ff', 9000, 0.16, 260, 1);
          const c = g.userData.cone;
          const dx = h.look.x - h.x, dz = h.look.z - h.z, dy = h.y;
          const L = Math.hypot(dx, dy, dz);
          c.position.set(h.x, h.y, h.z);
          c.scale.set(1, L / 70, 1);
          c.lookAt(h.look.x, 0, h.look.z);
          c.rotateX(-Math.PI / 2);
        }
      }
    }
  }

  update(dt, fx) {
    const W = this.world;
    const D = W.disasters;
    this.fxRef = fx;
    this.updateHelis(dt);
    const t = this.R.U.uTime.value;
    // tornadoes
    while (this.funnels.length < D.tornadoes.length) { const m = new THREE.Mesh(this.funnelGeo, this.funnelMat); this.R.scene.add(m); this.funnels.push(m); }
    this.funnels.forEach((m, i) => {
      const tor = D.tornadoes[i];
      m.visible = !!tor;
      if (!tor) return;
      const fade = tor.life > tor.max - 10 ? (tor.max - tor.life) / 10 : Math.min(1, tor.life / 4);
      m.position.set(tor.x, 0, tor.z);
      m.rotation.y = t * 2.2;
      m.scale.set(fade * 0.9 + 0.1, fade, fade * 0.9 + 0.1);
      // debris & dust
      for (let k = 0; k < 6; k++) {
        const a = Math.random() * Math.PI * 2, r = 4 + Math.random() * 22 * fade;
        fx.smoke.emit({ x: tor.x + Math.cos(a) * r, y: Math.random() * 30, z: tor.z + Math.sin(a) * r, vx: -Math.sin(a) * 20, vy: 4 + Math.random() * 10, vz: Math.cos(a) * 20, life: 0, max: 2.5, s0: 4, s1: 12, c0: [0.35, 0.32, 0.28, 0.6], c1: [0.4, 0.4, 0.4, 0], rot: Math.random() * 6, vr: 2, drag: 0.4 });
      }
      if (Math.random() < 0.5) fx.glow.emit({ x: tor.x + (Math.random() - 0.5) * 30, y: 2 + Math.random() * 40, z: tor.z + (Math.random() - 0.5) * 30, vx: (Math.random() - 0.5) * 30, vy: Math.random() * 10, vz: (Math.random() - 0.5) * 30, life: 0, max: 2, s0: 0.6, s1: 0.4, c0: [0.3, 0.25, 0.2, 1], c1: [0.2, 0.2, 0.2, 0], grav: -6, rot: 0 });
    });
    // meteors
    const m = D.meteors.find((x) => !x.done);
    if (m) {
      const u = Math.min(1, m.t / m.eta);
      const x = m.sx + (m.x - m.sx) * u, y = m.sy * (1 - u), z = m.sz + (m.z - m.sz) * u;
      this.meteorMesh.visible = true;
      this.meteorMesh.position.set(x, y, z);
      this.meteorLight.position.set(x, y, z);
      this.meteorLight.intensity = 4000 * u;
      for (let k = 0; k < 8; k++) fx.glow.emit({ x, y, z, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6, vz: (Math.random() - 0.5) * 6, life: 0, max: 1.2, s0: 9, s1: 2, c0: [4, 2, 0.6, 1], c1: [1.5, 0.3, 0.05, 0], rot: 0 });
      for (let k = 0; k < 3; k++) fx.smoke.emit({ x, y, z, vx: 0, vy: 0, vz: 0, life: 0, max: 5, s0: 6, s1: 20, c0: [0.2, 0.18, 0.16, 0.7], c1: [0.4, 0.4, 0.4, 0], rot: Math.random() * 6, vr: 0.3 });
    } else { this.meteorMesh.visible = false; this.meteorLight.intensity = Math.max(0, this.meteorLight.intensity - dt * 3000); }
    if (this.meteorLight.intensity > 1) fx.lights.point(this.meteorLight.position.x, this.meteorLight.position.y, this.meteorLight.position.z, '#ffa040', this.meteorLight.intensity, 600, 10);
    for (const mm of D.meteors) if (mm.done && !mm.fxDone) {
      mm.fxDone = true;
      for (let k = 0; k < 160; k++) { const a = Math.random() * Math.PI * 2, sp = 8 + Math.random() * 40; fx.glow.emit({ x: mm.x, y: 2, z: mm.z, vx: Math.cos(a) * sp, vy: 6 + Math.random() * 30, vz: Math.sin(a) * sp, life: 0, max: 1.5 + Math.random(), s0: 3, s1: 0.5, c0: [4, 2, 0.5, 1], c1: [1, 0.2, 0, 0], grav: -18, floor: 0.2, rot: 0 }); }
      for (let k = 0; k < 80; k++) { const a = Math.random() * Math.PI * 2, sp = 4 + Math.random() * 16; fx.smoke.emit({ x: mm.x, y: 3, z: mm.z, vx: Math.cos(a) * sp, vy: 2 + Math.random() * 12, vz: Math.sin(a) * sp, life: 0, max: 8, s0: 8, s1: 30, c0: [0.3, 0.27, 0.24, 0.8], c1: [0.5, 0.5, 0.5, 0], rot: Math.random() * 6, vr: 0.2, drag: 0.3 }); }
      this.meteorLight.position.set(mm.x, 20, mm.z); this.meteorLight.intensity = 9000;
    }
    // flood
    const lvl = W.floodLevel || 0;
    if (lvl > 0.01) {
      const m2 = 60 + lvl * 60;
      this.flood.visible = true;
      this.flood.position.set((W.riverX[0] + W.riverX[1]) / 2, -0.3 + lvl * 0.9, 0);
      this.flood.scale.set(W.riverX[1] - W.riverX[0] + m2 * 2, 1, 1000);
    } else this.flood.visible = false;
    // animals
    for (const k in this.animalPools) this.animalPools[k].begin();
    for (const a of W.animals.list) {
      const pool = this.animalPools[a.kind];
      const bob = Math.abs(Math.sin(a.anim * 2)) * 0.06 * (a.v > 0.2 ? 1 : 0);
      e.set(0, a.h, Math.sin(a.anim * 2) * 0.03, 'YXZ'); q.setFromEuler(e);
      p.set(a.x, bob, a.z); s.set(1, 1, 1);
      tmpM.compose(p, q, s);
      C1.set(a.T.color);
      pool.add(tmpM, C1, C1);
    }
    for (const k in this.animalPools) this.animalPools[k].end();
    // landmarks (craters, memorials)
    const lms = W.history.landmarks;
    if (lms.length !== this.lmCount) {
      this.lmCount = lms.length;
      for (const c of this.lmGroup.children.slice()) { this.lmGroup.remove(c); c.geometry?.dispose(); }
      for (const l of lms) {
        if (l.kind === 'crater') {
          const r = l.r || 20;
          const mesh = new THREE.Mesh(new THREE.CircleGeometry(r * 1.6, 32).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: this.craterTex, transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -4 }));
          mesh.position.set(l.x, 0.25, l.z);
          this.lmGroup.add(mesh);
          const rim = new THREE.Mesh(new THREE.TorusGeometry(r * 0.95, 1.4, 6, 28).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#4a4038', roughness: 1, flatShading: true }));
          rim.position.set(l.x, 0.2, l.z);
          this.lmGroup.add(rim);
        }
        if (l.kind === 'memorial') {
          const k = new ModelKit();
          k.box(0, 0.25, 0, 2.4, 0.5, 2.4, '#8a8680');
          k.taper(0, 0.5, 0, 0.9, 0.5, 0.6, 0.35, 2.4, '#a8a49c');
          for (let i = 0; i < 6; i++) k.sphere(Math.cos(i) * 0.9, 0.6, Math.sin(i) * 0.9, 0.16, ['#e04060', '#f0d040', '#f0f0f0'][i % 3]);
          const g = k.build(); g.setAttribute('color', g.getAttribute('aCol'));
          const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }));
          mesh.position.set(l.x, 0.16, l.z);
          mesh.castShadow = true;
          this.lmGroup.add(mesh);
        }
      }
    }
    // downed trees
    if (D.treesDirty) {
      D.treesDirty = false;
      const cv = this.cityView;
      const hide = (mesh, list) => {
        if (!mesh) return;
        list.forEach((tr, i) => {
          const gi = W.city.props.trees.indexOf(tr);
          if (D.downTrees.has(gi)) { mesh.getMatrixAt(i, tmpM); tmpM.decompose(p, q, s); e.set(Math.PI / 2 - 0.1, tr.x % 6, 0); q.setFromEuler(e); tmpM.compose(p, q, s); mesh.setMatrixAt(i, tmpM); }
        });
        mesh.instanceMatrix.needsUpdate = true;
      };
      hide(cv.treeDecid, cv.trees.decid);
      hide(cv.treeCon, cv.trees.con);
    }
  }
}
