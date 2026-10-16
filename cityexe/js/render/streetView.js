// Street furniture that makes the sidewalks feel lived in: food carts, kiosks,
// a taco truck, hustlers' folding tables (with the vendors working them), and
// flyers pasted on every storefront.
import * as THREE from 'three';
import { ModelKit, makeInstMaterial } from './materials.js';
import { hash01 } from '../core/rng.js';

function standKit(kind, seed) {
  const k = new ModelKit();
  const col = ['#d8302a', '#2a7ad8', '#e8b020', '#2a9a5a', '#d85a1a'][Math.floor(hash01(seed, 1) * 5)];
  if (kind === 'hotdog' || kind === 'coffee') {
    k.surf('metal'); k.rbox(0, 0.75, 0, 1.6, 0.8, 0.8, 0.05, '#c8ccd0');
    k.surf('plastic'); k.box(0, 0.75, 0.41, 1.5, 0.5, 0.02, col);
    k.surf('rubber'); for (const s of [-1, 1]) k.cyl(s * 0.6, 0.2, 0, 0.2, 0.08, '#1a1a1a', 12, 0, 0, [Math.PI / 2, 0, 0]);
    k.surf('metal'); k.cyl(0, 1.6, 0, 0.025, 1.7, '#8a8a8a', 6);
    k.surf('fabric'); k.cyl(0, 2.45, 0, 1.3, 0.35, col, 12, 0, 0, null, 0.05);
    k.surf('plastic'); k.box(0, 1.2, 0.1, 1.3, 0.1, 0.5, '#f0f0f0');
  } else if (kind === 'tacos') {
    k.surf('metal'); k.rbox(0, 1.55, 0, 2.2, 2.4, 4.6, 0.15, col); k.rbox(0, 0.55, 1.8, 2.1, 0.7, 1.0, 0.1, col);
    k.surf('glass'); k.box(0, 1.3, 2.32, 1.9, 0.6, 0.02, '#30404a', 0, 7);
    k.surf('none'); k.box(1.11, 1.75, -0.3, 0.02, 0.9, 2.4, '#fff0c8', 0, 10);
    k.surf('fabric'); k.box(1.45, 2.35, -0.3, 0.7, 0.05, 2.6, '#f0d040');
    k.surf('rubber'); for (const s of [-1, 1]) for (const z of [-1.4, 1.5]) k.cyl(s * 1.0, 0.38, z, 0.38, 0.25, '#1a1a1a', 12, 0, 0, [0, 0, Math.PI / 2]);
  } else if (kind === 'news' || kind === 'flowers') {
    k.surf('planks'); k.box(0, 1.1, 0, 1.8, 2.2, 1.2, kind === 'news' ? '#2a4a3a' : '#e8e0d0');
    k.surf('fabric'); k.box(0, 2.3, 0.55, 2.0, 0.08, 0.9, col);
    k.surf('wood'); k.box(0, 0.9, 0.75, 1.8, 0.1, 0.5, '#8a6a4a');
    if (kind === 'flowers') { k.surf('leaf'); for (let i = 0; i < 9; i++) k.blob(-0.7 + (i % 5) * 0.35, 1.05 + Math.floor(i / 5) * 0.12, 0.75, 0.13, 0.13, 0.13, ['#e83a5a', '#f0d030', '#f0f0f0', '#a83ad0', '#ff8a30'][i % 5], 0, 0, i, 0.3, 0); }
    else { k.surf('plastic'); for (let i = 0; i < 6; i++) k.box(-0.65 + i * 0.26, 1.0, 0.75, 0.22, 0.03, 0.3, ['#f0f0f0', '#e8d8a0', '#d0e0f0'][i % 3]); }
  } else if (kind === 'monte') {
    k.surf('wood'); k.box(0, 0.72, 0, 0.9, 0.04, 0.6, '#5a4632');
    k.surf('metal'); for (const [x, z] of [[-0.4, -0.25], [0.4, -0.25], [-0.4, 0.25], [0.4, 0.25]]) k.cyl(x, 0.36, z, 0.015, 0.72, '#3a3a3a', 4);
    k.surf('plastic'); for (let i = 0; i < 3; i++) k.box(-0.2 + i * 0.2, 0.745, 0, 0.1, 0.005, 0.14, '#f0f0f0');
    k.surf('fabric'); k.box(0.7, 0.25, 0.2, 0.5, 0.5, 0.5, '#a8885a');
  }
  return k;
}

const FLYERS = [
  ['NOW HIRING', 'Apply inside', '#d8302a', '#fff'], ['HELP WANTED', 'All shifts · $18/h', '#1a1a1a', '#f0d040'], ['PARTY', 'Sat · The Velvet', '#7a2ad0', '#fff'],
  ['LOST DOG', 'Answers to Biscuit', '#f4f0e4', '#1a1a1a'], ['GRAND OPENING', '50% off!', '#e8b020', '#1a1a1a'], ['LIVE MUSIC', 'Fri 9pm', '#2a7ad8', '#fff'],
  ['ROOM FOR RENT', 'Call 555-0144', '#f4f0e4', '#2a4a8a'], ['WE BUY GOLD', 'Cash today', '#1a6a3a', '#f0d040'],
];
function flyerTex(f) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 180;
  const g = c.getContext('2d');
  g.fillStyle = f[2]; g.fillRect(0, 0, 128, 180);
  g.fillStyle = f[3]; g.textAlign = 'center';
  g.font = 'bold 22px sans-serif';
  const words = f[0].split(' ');
  words.forEach((w, i) => g.fillText(w, 64, 46 + i * 26));
  g.font = '13px sans-serif'; g.fillText(f[1], 64, 46 + words.length * 26 + 12);
  g.globalAlpha = 0.5; for (let i = 0; i < 6; i++) g.fillRect(14 + i * 18, 150, 8, 26);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

export class StreetView {
  constructor(renderer, world, peopleView) {
    this.R = renderer; this.W = world; this.people = peopleView;
    this.group = new THREE.Group();
    renderer.scene.add(this.group);
    this.vendors = [];
    this.built = false;
  }
  build() {
    const W = this.W, S = W.street;
    if (!S || !S.stands.length) return;
    this.built = true;
    // all stands in one static mesh
    const k = new ModelKit();
    for (const s of S.stands) {
      if (s.kind !== 'flyers') k.append(standKit(s.kind, s.id), s.x, 0, s.z, s.h);
      const c = W.citizens[s.model];
      // the vendor stands behind the counter (the flyer guy and the hustler out front)
      const back = s.kind === 'tacos' ? -2.2 : s.kind === 'flyers' ? 0 : -0.75;
      const vx = s.x + Math.sin(s.h) * back + (s.kind === 'tacos' ? Math.cos(s.h) * 1.6 : 0), vz = s.z + Math.cos(s.h) * back - (s.kind === 'tacos' ? Math.sin(s.h) * 1.6 : 0);
      if (c) this.vendors.push({ id: 90000 + s.id, cid: -1, x: vx, z: vz, y: s.kind === 'tacos' ? 0.9 : 0, h: s.h, v: 0, anim: hash01(s.id) * 10, action: s.kind === 'monte' ? 'cards' : s.kind === 'flyers' ? 'sell' : 'sell', state: 'idle', look: this.people.lookFor(c), stand: s });
    }
    if (k.pos.length) {
      const im = new THREE.InstancedMesh(k.build(), makeInstMaterial(this.R.U, { key: 'static' }), 1);
      im.setMatrixAt(0, new THREE.Matrix4());
      const geo = im.geometry;
      geo.setAttribute('iCol1', new THREE.InstancedBufferAttribute(new Float32Array([1, 1, 1]), 3));
      geo.setAttribute('iCol2', new THREE.InstancedBufferAttribute(new Float32Array([1, 1, 1]), 3));
      geo.setAttribute('iState', new THREE.InstancedBufferAttribute(new Float32Array([0, 0, 0, 0]), 4));
      im.castShadow = true; im.frustumCulled = false;
      this.group.add(im);
    }
    // flyers on storefronts, near the door
    const spots = FLYERS.map(() => []);
    for (const b of W.city.buildings) {
      if (!b.door || b.kind === 'house' || b.state !== 'ok' || !(b.shop || b.bizType || b.resUnits > 0)) continue;
      const n = Math.floor(hash01(b.id, 3) * 4);
      for (let i = 0; i < n; i++) {
        const side = hash01(b.id, 10 + i) < 0.5 ? -1 : 1, along = side * (1.4 + hash01(b.id, 20 + i) * 3.5), y = 1.2 + hash01(b.id, 30 + i) * 0.9;
        let x = b.door[0], z = b.door[1], ry = 0;
        if (b.front === 'N') { x += along; z = b.z0 - 0.04; ry = Math.PI; }
        else if (b.front === 'S') { x += along; z = b.z1 + 0.04; ry = 0; }
        else if (b.front === 'W') { z += along; x = b.x0 - 0.04; ry = -Math.PI / 2; }
        else { z += along; x = b.x1 + 0.04; ry = Math.PI / 2; }
        spots[Math.floor(hash01(b.id, 40 + i) * FLYERS.length)].push([x, y, z, ry, (hash01(b.id, 50 + i) - 0.5) * 0.25]);
      }
    }
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    const plane = new THREE.PlaneGeometry(0.42, 0.6);
    FLYERS.forEach((f, i) => {
      const list = spots[i];
      if (!list.length) return;
      const im = new THREE.InstancedMesh(plane, new THREE.MeshStandardMaterial({ map: flyerTex(f), roughness: 0.85 }), list.length);
      list.forEach(([x, y, z, ry, rz], j) => { e.set(0, ry, rz, 'YXZ'); q.setFromEuler(e); m4.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, 1, 1)); im.setMatrixAt(j, m4); });
      im.frustumCulled = false;
      this.group.add(im);
    });
  }
  update(dt) {
    if (!this.built) { this.build(); if (!this.built) return; }
    const ex = this.people.extra;
    ex.length = 0;
    const cam = this.R.camera.position;
    for (const v of this.vendors) {
      if (!this.W.street.isOpen(v.stand)) continue;
      if ((v.x - cam.x) ** 2 + (v.z - cam.z) ** 2 > 200 * 200) continue;
      v.anim += dt * 0.6;
      ex.push(v);
    }
  }
}
