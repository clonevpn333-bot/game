/* Everything you find on the mountain: campfires, crates, luggage, caches,
 * pitons, rope anchors, ziplines, flares and pings. Geometry only. */
import * as THREE from '../../../../vendor/three/three.module.js';
import { materials, glowSprite, heightFog } from '../gfx/materials.js';
import { materialMaps } from '../gfx/textures.js';
import { mergeGeometries, boulder } from './flora.js';
import { rng } from '../../shared/rng.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
let LIB = null;

export function propGeo() {
  if (LIB) return LIB;
  const M = materials();

  /* ---- campfire: stone ring, log stack ---- */
  const stones = [];
  const r = rng(4242);
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2;
    const b = boulder(0.20 + r() * 0.1, 500 + i, 1);
    b.scale(1, 0.7, 1);
    b.translate(Math.cos(a) * 0.78, 0.02, Math.sin(a) * 0.78);
    stones.push(b);
  }
  const logs = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const g = new THREE.CylinderGeometry(0.062, 0.05, 0.86, 7);
    g.rotateZ(Math.PI / 2 - 0.55);
    g.rotateY(a);
    g.translate(Math.cos(a) * 0.16, 0.20, Math.sin(a) * 0.16);
    logs.push(g);
  }

  /* ---- crate ---- */
  const crateBody = new THREE.BoxGeometry(0.72, 0.56, 0.62, 2, 2, 2);
  crateBody.translate(0, 0.28, 0);
  const bands = [];
  for (const y of [0.08, 0.48]) {
    const band = new THREE.BoxGeometry(0.75, 0.055, 0.65);
    band.translate(0, y, 0);
    bands.push(band);
  }

  /* ---- luggage ---- */
  const caseBody = new THREE.BoxGeometry(0.66, 0.26, 0.44, 2, 1, 2);
  caseBody.translate(0, 0.14, 0);
  const handle = new THREE.TorusGeometry(0.09, 0.018, 6, 12, Math.PI);
  handle.rotateX(Math.PI / 2);
  handle.translate(0, 0.28, 0);
  const straps = [];
  for (const x of [-0.18, 0.18]) {
    const st = new THREE.BoxGeometry(0.05, 0.29, 0.46);
    st.translate(x, 0.14, 0);
    straps.push(st);
  }

  /* ---- cache: a tarp over a small pile ---- */
  const pile = boulder(0.42, 909, 1);
  pile.scale(1.3, 0.7, 1.1);
  const tarp = new THREE.SphereGeometry(0.56, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
  tarp.scale(1.1, 0.62, 0.95);
  tarp.translate(0, 0.06, 0);

  LIB = {
    campfire: { geo: mergeGeometries(stones), mat: M.rockProp },
    campfireLogs: { geo: mergeGeometries(logs), mat: M.bark },
    crate: { geo: mergeGeometries([crateBody]), mat: M.wood, bands: { geo: mergeGeometries(bands), mat: M.metal } },
    luggage: { geo: mergeGeometries([caseBody, handle]), mat: leatherCase(), straps: { geo: mergeGeometries(straps), mat: M.metalWarm } },
    cache: { geo: pile, mat: M.rockProp, cover: { geo: tarp, mat: M.canvasBag } },
    bush: { geo: boulder(0.5, 313, 1), mat: M.rockProp },
    piton: { geo: pitonGeo(), mat: M.metal },
    anchor: { geo: anchorGeo(), mat: M.metalWarm },
  };
  return LIB;
}

function leatherCase() {
  const maps = materialMaps('leather', 67, 0.07, 2);
  return heightFog(new THREE.MeshStandardMaterial({ ...maps, color: 0x7a5a3c, roughness: 0.62 }), null, 'std');
}

function pitonGeo() {
  const spike = new THREE.ConeGeometry(0.028, 0.30, 6);
  spike.rotateX(Math.PI / 2);
  spike.translate(0, 0, -0.1);
  const eye = new THREE.TorusGeometry(0.045, 0.012, 6, 10);
  eye.translate(0, 0, 0.09);
  return mergeGeometries([spike, eye]);
}

function anchorGeo() {
  const bolt = new THREE.CylinderGeometry(0.035, 0.035, 0.14, 8);
  bolt.rotateX(Math.PI / 2);
  const ring = new THREE.TorusGeometry(0.07, 0.014, 6, 14);
  ring.translate(0, -0.08, 0.02);
  return mergeGeometries([bolt, ring]);
}

/* ---------------- fire ---------------- */
export class Fire {
  constructor(scene, scale = 1) {
    this.group = new THREE.Group();
    this.sprites = [];
    const mat = glowSprite([1, 0.62, 0.24], 128);
    for (let i = 0; i < 12; i++) {
      const s = new THREE.Sprite(mat.clone());
      s.scale.setScalar(0.5 * scale);
      this.group.add(s);
      this.sprites.push({ s, t: Math.random(), speed: 0.7 + Math.random() * 0.9, r: Math.random() * 0.24 * scale, a: Math.random() * 7 });
    }
    this.light = new THREE.PointLight(0xffa04a, 6 * scale * scale, 22 * scale, 1.7);
    this.light.position.y = 0.7 * scale;
    this.group.add(this.light);
    this.scale = scale;
    scene.add(this.group);
    this.scene = scene;
    this.lit = true;
  }
  setLit(on) {
    this.lit = on;
    this.group.visible = on;
  }
  update(dt) {
    if (!this.lit) return;
    for (const p of this.sprites) {
      p.t += dt * p.speed;
      if (p.t > 1) { p.t -= 1; p.a = Math.random() * 7; p.r = Math.random() * 0.24 * this.scale; }
      const k = p.t;
      p.s.position.set(Math.cos(p.a) * p.r * (1 - k * 0.4), k * 1.35 * this.scale, Math.sin(p.a) * p.r * (1 - k * 0.4));
      p.s.scale.setScalar((0.55 - k * 0.32) * this.scale);
      p.s.material.opacity = Math.max(0, 1 - k * 1.25);
      p.s.material.color.setRGB(1, 0.72 - k * 0.42, 0.30 - k * 0.28);
    }
    this.light.intensity = (5 + Math.sin(performance.now() * 0.011) * 1.6 + Math.random() * 0.8) * this.scale * this.scale;
  }
  dispose() { this.scene.remove(this.group); }
}

/* ---------------- rope / zipline lines ---------------- */
export function makeLine(material, radial = 5) {
  const geo = new THREE.CylinderGeometry(1, 1, 1, radial, 1, true);
  geo.translate(0, 0.5, 0);
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = false;
  mesh.frustumCulled = false;
  return mesh;
}
const _up = new THREE.Vector3(0, 1, 0);
const _d = new THREE.Vector3();
export function placeLine(mesh, a, b, thickness) {
  _d.subVectors(b, a);
  const len = _d.length() || 0.001;
  mesh.position.copy(a);
  mesh.quaternion.setFromUnitVectors(_up, _d.normalize());
  mesh.scale.set(thickness, len, thickness);
}

/* ---------------- ping marker ---------------- */
export function pingMarker(color = 0xffd36e) {
  const g = new THREE.Group();
  const diamond = new THREE.OctahedronGeometry(0.34, 0);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, fog: false });
  const m = new THREE.Mesh(diamond, mat);
  m.position.y = 1.5;
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.16, 3.2, 8, 1, true),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false, fog: false }),
  );
  beam.position.y = 1.6;
  g.add(m, beam);
  g.userData.spin = m;
  return g;
}
