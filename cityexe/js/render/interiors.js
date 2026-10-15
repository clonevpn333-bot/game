// Procedural interiors. When you enter a building (or possess someone inside),
// a room is generated for that building's type and populated with the citizens
// who are actually inside it right now: clerks behind counters, customers,
// patients in hospital beds, suspects in cells, residents on the sofa.
import * as THREE from 'three';
import { ModelKit } from './materials.js';
import { PeopleView } from './peopleView.js';
import { BTYPES } from '../sim/economy.js';
import { clamp, dist, wrapAngle, damp } from '../core/math.js';
import { hash01, rand } from '../core/rng.js';

const KIND = (b, W) => {
  const biz = b.bizId != null ? W.economy.biz[b.bizId] : null;
  if (b.metro) return 'metro';
  if (b.garage) return 'garage';
  if (b.civic === 'police') return 'police';
  if (b.civic === 'fire') return 'fire';
  if (b.civic === 'hospital') return 'hospital';
  if (b.civic === 'mall') return 'mall';
  if (b.civic === 'cityhall') return 'office';
  if (b.anomaly && b.anomaly.kind === 'building') return 'anomaly';
  if (biz) {
    const t = biz.type;
    if (['grocery', 'convenience', 'pharmacy', 'electronics', 'clothing', 'gas'].includes(t)) return 'shop';
    if (['restaurant', 'cafe', 'bar'].includes(t)) return 'diner';
    if (t === 'gym') return 'gym';
    if (['office', 'news', 'hotel', 'taxi', 'utility', 'busdepot', 'towyard', 'construction'].includes(t)) return 'office';
    if (['factory', 'warehouse', 'autoshop', 'powerplant'].includes(t)) return 'warehouse';
  }
  if (b.resUnits > 0) return 'home';
  return 'office';
};

function meshFromKit(k, glow = false) {
  const g = k.build();
  g.setAttribute('color', g.getAttribute('aCol'));
  const m = glow ? new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }) : new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, metalness: 0.05 });
  return new THREE.Mesh(g, m);
}

export class Interiors {
  constructor(game) {
    this.game = game;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0b0d10');
    this.U = game.renderer.U;
    this.people = new PeopleView({ scene: this.scene, U: this.U, camera: game.renderer.camera }, game.world, { onlyExtra: true, cap: 80 });
    this.room = null;
    this.b = null;
    this.figs = new Map();
    this.player = null;
    this.trainT = 0;
  }
  get W() { return this.game.world; }
  get active() { return !!this.room; }

  canEnter(b) { return b && b.kind !== 'substation' && b.state !== 'ruin' && b.state !== 'construction'; }

  enter(b, c, playerControlled) {
    const W = this.W;
    if (this.room) this.clearRoom();
    this.b = b;
    this.c = c;
    this.kind = KIND(b, W);
    this.room = this.buildRoom(b, this.kind);
    this.scene.add(this.room.group);
    // player figure at the door
    const R = this.room;
    this.player = { id: -1, cid: c.id, x: R.door.x, z: R.door.z - 1.4, y: 0, h: Math.PI, v: 0, anim: 0, action: '', state: 'idle', player: true, vy: 0 };
    this.game.renderer.setScene(this.scene);
    const T = this.game.rig.third;
    T.dist = 3.4; T.height = 1.0; T.pitch = 0.22; T.lookY = 1.4; T.yaw = Math.PI;
    this.game.emit('interior', { b, kind: this.kind });
    this.lastOcc = '';
    this.syncFigures(true);
  }

  exit(silent = false) {
    if (!this.room) return;
    const W = this.W, b = this.b, c = this.c;
    this.clearRoom();
    this.game.renderer.setScene(null);
    if (!silent && c && c.possessed) {
      // step out onto the street
      W.citizenAI.leaveBuilding(c);
      if (c.ped) { this.game.possession.enterFoot(); this.game.rig.third.yaw = c.ped.h; }
      this.game.audio && this.game.audio.door();
    }
    this.game.emit('interiorExit', { b });
  }

  clearRoom() {
    if (!this.room) return;
    this.scene.remove(this.room.group);
    this.room.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose?.(); });
    this.room = null; this.b = null; this.player = null;
    this.figs.clear();
    this.people.extra.length = 0;
  }

  // ------------------------------------------------------------------ room generation
  buildRoom(b, kind) {
    const W = this.W;
    const seed = b.id * 7919;
    const R = (k) => hash01(seed, k);
    const big = ['hospital', 'mall', 'police', 'fire', 'metro', 'garage', 'warehouse', 'office'].includes(kind);
    const RW = kind === 'anomaly' ? 6 : clamp(Math.min(b.w, b.d) * (big ? 0.95 : 0.85), 9, big ? 34 : 18);
    const RD = kind === 'anomaly' ? 120 : clamp(Math.max(b.w, b.d) * (big ? 0.7 : 0.6), 9, big ? 30 : 16);
    const H = kind === 'warehouse' || kind === 'fire' || kind === 'mall' ? 7 : kind === 'metro' ? 6 : 3.4;
    const group = new THREE.Group();
    const k = new ModelKit(), glow = new ModelKit();
    const spots = [];
    const col = [];
    const hw = RW / 2, hd = RD / 2;
    const wallC = { shop: '#e8e4dc', diner: '#b8876a', home: ['#d8d0c0', '#c8d4dc', '#e0d0c8', '#d0d8c0'][Math.floor(R(1) * 4)], office: '#dcdedf', police: '#c8ccd4', fire: '#b8b4ac', hospital: '#eef2f4', mall: '#e8e0d0', metro: '#c8d0d8', garage: '#9a9a96', warehouse: '#a0a09a', gym: '#3a3c40', anomaly: '#d8d8d0' }[kind] || '#d8d4cc';
    const floorC = { shop: '#c8c4bc', diner: '#6a4a34', home: '#8a6a4a', office: '#7a8088', police: '#6a6e74', fire: '#6a6a66', hospital: '#d8dcdc', mall: '#d8d0c0', metro: '#8a8a88', garage: '#6a6a6a', warehouse: '#7a7a74', gym: '#2a2a2e', anomaly: '#c8c8c0' }[kind] || '#8a8a8a';
    // shell
    k.box(0, -0.05, 0, RW, 0.1, RD, floorC);
    k.box(0, H + 0.05, 0, RW, 0.1, RD, '#e8e8e4');
    k.box(-hw - 0.1, H / 2, 0, 0.2, H, RD, wallC);
    k.box(hw + 0.1, H / 2, 0, 0.2, H, RD, wallC);
    k.box(0, H / 2, -hd - 0.1, RW, H, 0.2, wallC);
    // front wall with door gap
    k.box(-hw / 2 - 0.9, H / 2, hd + 0.1, hw - 1.8, H, 0.2, wallC);
    k.box(hw / 2 + 0.9, H / 2, hd + 0.1, hw - 1.8, H, 0.2, wallC);
    k.box(0, H - 0.4, hd + 0.1, 3.6, 0.8, 0.2, wallC);
    col.push({ x0: -hw - 1, z0: -hd - 1, x1: -hw, z1: hd + 1 }, { x0: hw, z0: -hd - 1, x1: hw + 1, z1: hd + 1 }, { x0: -hw - 1, z0: -hd - 1, x1: hw + 1, z1: -hd }, { x0: -hw, z0: hd, x1: -1.8, z1: hd + 1 }, { x0: 1.8, z0: hd, x1: hw, z1: hd + 1 });
    // door (exit) glow
    glow.box(0, 1.3, hd + 0.21, 3.4, 2.6, 0.02, '#a8c8e0');
    // windows on the side walls show the time of day (updated per frame)
    const winMat = new THREE.MeshBasicMaterial({ color: '#9ec8ee', toneMapped: false });
    if (kind !== 'metro' && kind !== 'garage' && kind !== 'anomaly') {
      const wg = new THREE.Group();
      for (let z = -hd + 2; z < hd - 1.5; z += 3.2) for (const sx of [-1, 1]) {
        const w = new THREE.Mesh(new THREE.PlaneGeometry(1.8, Math.min(1.6, H - 1.6)), winMat);
        w.position.set(sx * (hw - 0.01), Math.min(1.9, H * 0.55), z);
        w.rotation.y = -sx * Math.PI / 2;
        wg.add(w);
      }
      group.add(wg);
    }
    // ceiling lights
    for (let x = -hw + 2.5; x < hw - 1; x += 5) for (let z = -hd + 2.5; z < hd - 1; z += 5) glow.box(x, H - 0.02, z, 1.6, 0.04, 0.6, '#fff4e0');
    const spot = (x, z, h, type, extra = {}) => spots.push({ x, z, h, type, ...extra });
    const blockC = (x0, z0, x1, z1) => col.push({ x0, z0, x1, z1 });
    const counter = (x, z, w, color = '#5a4a3a') => { k.box(x, 0.55, z, w, 1.1, 0.7, color); k.box(x, 1.12, z, w + 0.1, 0.06, 0.8, '#d8d4cc'); blockC(x - w / 2, z - 0.4, x + w / 2, z + 0.4); };
    switch (kind) {
      case 'shop': {
        counter(-hw + 3.2, hd - 4, 4);
        glow.box(-hw + 2.2, 1.35, hd - 4, 0.4, 0.3, 0.05, '#40ff90');
        spot(-hw + 3.2, hd - 4.9, 0, 'staff');
        spot(-hw + 2, hd - 4.9, 0, 'staff');
        const prod = ['#d04040', '#40a040', '#e0c040', '#4060c0', '#e08030', '#c040a0'];
        for (let i = 0; i < 3; i++) {
          const x = -hw + 6 + i * ((RW - 8) / 3), z0 = -hd + 3, z1 = hd - 6;
          if (x > hw - 1.5) break;
          k.box(x, 0.9, (z0 + z1) / 2, 0.9, 1.8, z1 - z0, '#d0ccc4');
          for (let s = 0; s < 3; s++) for (let j = 0; j < Math.floor((z1 - z0) / 0.6); j++) k.box(x, 0.35 + s * 0.55, z0 + 0.3 + j * 0.6, 1.0, 0.3, 0.45, prod[(i * 7 + j * 3 + s) % prod.length]);
          blockC(x - 0.5, z0, x + 0.5, z1);
          spot(x + 1.1, z0 + (z1 - z0) * 0.3, -Math.PI / 2, 'browse'); spot(x - 1.1, z0 + (z1 - z0) * 0.7, Math.PI / 2, 'browse');
        }
        // fridges along the back wall
        for (let x = -hw + 1; x < hw - 1; x += 1.4) { k.box(x, 1.1, -hd + 0.45, 1.3, 2.2, 0.8, '#d8dce0'); glow.box(x, 1.2, -hd + 0.86, 1.1, 1.8, 0.02, '#c8e8ff'); }
        blockC(-hw, -hd, hw, -hd + 0.9);
        spot(0, -hd + 1.6, 0, 'browse');
        break;
      }
      case 'diner': {
        counter(0, -hd + 2.2, RW * 0.6, '#3a2a20');
        spot(-1, -hd + 1.3, 0, 'staff'); spot(1.2, -hd + 1.3, 0, 'staff');
        for (let x = -RW * 0.3 + 1; x < RW * 0.3; x += 1.2) glow.box(x, 2.2, -hd + 0.3, 0.3, 0.6, 0.05, ['#ff8040', '#40c0ff', '#ffd040'][Math.floor(hash01(x * 9, seed) * 3)]);
        for (let i = 0; i < 6; i++) {
          const x = -hw + 2.5 + (i % 3) * ((RW - 5) / 2), z = -hd + 5.5 + Math.floor(i / 3) * 4;
          if (z > hd - 2) continue;
          k.cyl(x, 0.75, z, 0.55, 0.06, '#d8c8a8', 14); k.cyl(x, 0.37, z, 0.07, 0.74, '#2a2a2a', 6);
          blockC(x - 0.6, z - 0.6, x + 0.6, z + 0.6);
          for (const s of [-1, 1]) { k.box(x + s * 0.95, 0.45, z, 0.45, 0.06, 0.45, '#6a3a2a'); k.box(x + s * 1.15, 0.75, z, 0.06, 0.6, 0.45, '#6a3a2a'); spot(x + s * 0.95, z, s > 0 ? -Math.PI / 2 : Math.PI / 2, 'seat'); }
        }
        break;
      }
      case 'home': {
        // living room + bedroom corner + kitchen
        k.box(-hw + 1.3, 0.4, 0, 1.2, 0.8, 3.2, ['#5a6a8a', '#8a5a4a', '#4a6a5a'][Math.floor(R(2) * 3)]);
        k.box(-hw + 0.8, 0.85, 0, 0.3, 0.9, 3.2, ['#5a6a8a', '#8a5a4a', '#4a6a5a'][Math.floor(R(2) * 3)]);
        blockC(-hw, -1.6, -hw + 2, 1.6);
        spot(-hw + 1.4, -0.8, Math.PI / 2, 'sofa'); spot(-hw + 1.4, 0.8, Math.PI / 2, 'sofa');
        k.box(-hw + 3.6, 0.25, 0, 1.0, 0.5, 1.6, '#6a4a30');
        k.box(hw - 0.3, 1.3, 0, 0.1, 0.9, 1.6, '#111');
        glow.box(hw - 0.36, 1.3, 0, 0.02, 0.8, 1.5, '#4a80c0');
        // bed
        k.box(hw - 1.6, 0.3, -hd + 1.6, 2.4, 0.6, 2.2, '#e8e4dc'); k.box(hw - 1.6, 0.65, -hd + 0.6, 2.4, 0.5, 0.3, '#8a6a4a');
        blockC(hw - 2.8, -hd, hw, -hd + 2.7);
        spot(hw - 2.2, -hd + 1.7, Math.PI, 'bed'); spot(hw - 1.0, -hd + 1.7, Math.PI, 'bed');
        // kitchen
        for (let x = -hw + 0.8; x < -hw + 5; x += 0.9) k.box(x, 0.45, -hd + 0.4, 0.86, 0.9, 0.7, '#e8e8e4');
        blockC(-hw, -hd, -hw + 5, -hd + 0.8);
        spot(-hw + 2.5, -hd + 1.4, Math.PI, 'stand');
        // table
        k.box(1, 0.75, hd - 3.5, 1.6, 0.06, 1.0, '#7a5a3a'); blockC(0.2, hd - 4, 1.8, hd - 3);
        spot(1, hd - 2.6, Math.PI, 'seat'); spot(1, hd - 4.4, 0, 'seat');
        // rug and plant
        k.box(-hw + 3.6, 0.01, 0, 3.4, 0.02, 3.6, ['#8a3a3a', '#3a5a8a', '#6a6a3a'][Math.floor(R(5) * 3)]);
        k.cyl(hw - 0.6, 0.3, hd - 0.8, 0.25, 0.6, '#6a4a3a', 8); k.sphere(hw - 0.6, 0.95, hd - 0.8, 0.45, '#3a7a3a');
        break;
      }
      case 'office': {
        counter(0, hd - 3.5, 4, '#3a3e44');
        spot(0, hd - 4.4, 0, 'staff');
        for (let x = -hw + 3; x < hw - 2; x += 3.2) for (let z = -hd + 3; z < hd - 6; z += 3) {
          k.box(x, 0.74, z, 1.6, 0.05, 0.8, '#d8d4cc'); k.box(x, 0.37, z, 0.06, 0.74, 0.7, '#5a5a5a');
          k.box(x, 1.05, z - 0.25, 0.6, 0.4, 0.04, '#111'); glow.box(x, 1.05, z - 0.22, 0.54, 0.34, 0.01, '#8ab8e8');
          k.box(x, 0.6, z - 0.95, 1.7, 1.2, 0.06, '#7a8a9a');
          blockC(x - 0.85, z - 1, x + 0.85, z + 0.4);
          spot(x, z + 0.65, Math.PI, 'desk');
        }
        // elevators
        for (let x = -2.4; x <= 2.4; x += 2.4) { k.box(x, 1.2, -hd + 0.15, 1.4, 2.4, 0.1, '#a8acb0'); glow.box(x + 0.9, 1.4, -hd + 0.22, 0.1, 0.1, 0.02, '#ffcc40'); }
        break;
      }
      case 'police': {
        counter(0, hd - 4, 6, '#2a3a5a');
        spot(-1.5, hd - 4.9, 0, 'staff'); spot(1.5, hd - 4.9, 0, 'staff');
        for (let x = -hw + 3; x < 0; x += 3) for (let z = -2; z < hd - 6; z += 3) { k.box(x, 0.75, z, 1.6, 0.06, 0.9, '#5a4a3a'); blockC(x - 0.8, z - 0.5, x + 0.8, z + 0.5); spot(x, z + 0.7, Math.PI, 'desk'); }
        // holding cells
        const cells = 3;
        for (let i = 0; i < cells; i++) {
          const cx = 2 + i * ((hw - 3) / cells) + 1.5, cz = -hd + 2.2;
          for (let b2 = -1.3; b2 <= 1.3; b2 += 0.26) k.box(cx + b2, H / 2, cz + 2, 0.05, H, 0.05, '#8a8c90');
          k.box(cx - 1.5, H / 2, cz, 0.1, H, 4, '#9a9a9a');
          k.box(cx, 0.3, cz - 1.2, 1.8, 0.4, 0.8, '#6a6a6a');
          blockC(cx - 1.6, cz - 2.2, cx + 1.6, cz + 2.1);
          spot(cx, cz, 0, 'cell'); spot(cx - 0.5, cz - 1.0, 0, 'cell');
        }
        glow.box(-hw + 0.2, 2.2, 0, 0.02, 1.0, 3.0, '#2a5bd7');
        break;
      }
      case 'fire': {
        for (let i = 0; i < 2; i++) {
          const x = -hw / 2 + i * hw;
          k.box(x, 1.6, -2, 2.5, 3.2, 9, '#c8221a'); k.box(x, 3.3, -2, 0.9, 0.2, 7, '#b8bcc0');
          for (const sx of [-1, 1]) for (const z of [-5, 1.5]) k.cyl(x + sx * 1.15, 0.5, z, 0.5, 0.35, '#111', 10, 0, 0, [0, 0, Math.PI / 2]);
          blockC(x - 1.3, -6.5, x + 1.3, 2.5);
        }
        for (let x = -hw + 1; x < hw - 1; x += 1.1) { k.box(x, 1.0, -hd + 0.3, 1.0, 2.0, 0.5, '#8a8a80'); }
        blockC(-hw, -hd, hw, -hd + 0.6);
        for (let i = 0; i < 6; i++) spot(-hw + 2 + i * 1.6, hd - 3, Math.PI, 'wait');
        k.box(hw - 2.5, 0.75, hd - 4, 2, 0.06, 1, '#6a5a4a');
        spot(hw - 2.5, hd - 3.2, Math.PI, 'seat');
        break;
      }
      case 'hospital': {
        counter(0, hd - 3.5, 5, '#e0e4e8');
        spot(0, hd - 4.4, 0, 'staff');
        for (let i = 0; i < 12; i++) {
          const x = -hw + 2.5 + (i % 6) * ((RW - 5) / 5), z = i < 6 ? -hd + 2 : -hd + 7;
          k.box(x, 0.5, z, 1.0, 0.15, 2.1, '#f4f4f4'); k.box(x, 0.25, z, 0.9, 0.5, 2.0, '#9aa8b0'); k.box(x, 0.65, z - 0.8, 0.9, 0.25, 0.4, '#ffffff');
          k.box(x + 0.75, 1.0, z - 0.8, 0.05, 2.0, 0.05, '#8a8c90'); glow.box(x + 0.75, 1.6, z - 0.8, 0.3, 0.2, 0.02, '#40ff80');
          blockC(x - 0.55, z - 1.1, x + 0.55, z + 1.1);
          spot(x, z, 0, 'bed', { patient: true });
          spot(x + 1.1, z + 0.3, -Math.PI / 2, 'staff2');
        }
        glow.box(0, 2.6, hd - 0.2, 1.2, 0.3, 0.02, '#ff3030');
        break;
      }
      case 'metro': {
        // platform + tracks pit + tunnel mouths
        k.box(0, -0.6, -hd + 3, RW, 1.2, 6, '#3a3a3a');
        for (const sx of [-0.7, 0.7]) k.box(0, -0.55, -hd + 3 + sx, RW, 0.1, 0.1, '#9a9a9a');
        k.box(0, 0.02, -hd + 6.1, RW, 0.04, 0.3, '#e8c020');
        blockC(-hw, -hd, hw, -hd + 6);
        for (let x = -hw + 2; x < hw - 1; x += 3.5) { k.box(x, 0.45, -1, 1.6, 0.08, 0.45, '#6a5a4a'); spot(x, -0.6, Math.PI, 'seat'); spot(x + 2, 0.5, Math.PI, 'wait'); }
        for (let x = -hw + 1; x < hw; x += 4) k.cyl(x, H / 2, 2, 0.3, H, '#c8ccd0', 10);
        glow.box(0, 3.4, -hd + 6.2, 4, 0.5, 0.05, '#2e5e9e');
        // the train
        const tk = new ModelKit();
        tk.box(0, 1.5, 0, 40, 3, 2.8, '#c8ccd0'); for (let x = -18; x < 19; x += 3) tk.box(x, 1.9, 1.41, 1.8, 1.0, 0.02, '#1a2a3a', 0, 0);
        tk.box(0, 0.4, 1.41, 40, 0.2, 0.03, '#2e5e9e');
        const train = meshFromKit(tk);
        train.position.set(-200, -1.2, -hd + 3);
        group.add(train);
        this.train = train;
        spot(0, 1, Math.PI, 'staff');
        break;
      }
      case 'garage': {
        for (let i = 0; i < 10; i++) { const x = -hw + 2.5 + (i % 5) * ((RW - 5) / 4), z = i < 5 ? -hd + 3 : hd - 6; k.box(x, 0.01, z, 2.4, 0.02, 5, '#e8e8e4'); }
        for (let x = -hw + 4; x < hw; x += 8) for (const z of [-2, 3]) { k.box(x, H / 2, z, 0.6, H, 0.6, '#8a8a86'); blockC(x - 0.3, z - 0.3, x + 0.3, z + 0.3); }
        break;
      }
      case 'warehouse': {
        for (let x = -hw + 2.5; x < hw - 2; x += 4.5) { k.box(x, 2.2, -1, 1.2, 4.4, RD * 0.6, '#3a5a8a'); for (let y = 0.6; y < 4.2; y += 1.3) for (let z = -RD * 0.28; z < RD * 0.28; z += 1.4) k.box(x, y, -1 + z, 1.1, 1.0, 1.2, ['#b89a6a', '#a88a5a', '#c8aa7a'][Math.floor(hash01(x, y * 7, z * 3) * 3)]); blockC(x - 0.6, -1 - RD * 0.3, x + 0.6, -1 + RD * 0.3); spot(x + 1.5, -1, -Math.PI / 2, 'stand'); }
        break;
      }
      case 'mall': {
        for (let i = 0; i < 6; i++) {
          const sx = i < 3 ? -1 : 1, z = -hd + 4 + (i % 3) * ((RD - 8) / 2);
          k.box(sx * (hw - 3), 1.6, z, 6, 3.2, 3.5, ['#e8c8a0', '#a8c8e8', '#e8a8b8', '#c8e8a8'][i % 4]);
          glow.box(sx * (hw - 6.02), 2.6, z, 0.02, 0.5, 3, ['#ff6040', '#40a0ff', '#ff40a0', '#40ff80'][i % 4]);
          blockC(sx > 0 ? hw - 6 : -hw, z - 1.8, sx > 0 ? hw : -hw + 6, z + 1.8);
          spot(sx * (hw - 7), z, sx > 0 ? -Math.PI / 2 : Math.PI / 2, 'browse');
        }
        k.cyl(0, 0.5, 0, 2.2, 1.0, '#c8c0b0', 20); k.cyl(0, 1.2, 0, 0.4, 1.4, '#4a8ab0', 10); blockC(-2.3, -2.3, 2.3, 2.3);
        for (let i = 0; i < 6; i++) spot(Math.cos(i) * 4, Math.sin(i) * 4, i, 'wait');
        spot(0, hd - 3, Math.PI, 'staff');
        break;
      }
      case 'gym': {
        for (let i = 0; i < 6; i++) { const x = -hw + 2.5 + (i % 3) * 3.5, z = -hd + 3 + Math.floor(i / 3) * 4; k.box(x, 0.5, z, 0.9, 1.0, 2.0, '#202224'); glow.box(x, 1.2, z - 0.8, 0.5, 0.3, 0.02, '#ff4040'); blockC(x - 0.5, z - 1, x + 0.5, z + 1); spot(x, z, 0, 'stand'); }
        counter(hw - 3, hd - 3, 2.5, '#2a2a2e'); spot(hw - 3, hd - 3.9, 0, 'staff');
        break;
      }
      case 'anomaly': {
        // a corridor that is much longer than the building it is inside
        for (let z = -hd + 4; z < hd - 2; z += 6) { glow.box(0, H - 0.05, z, 1.2, 0.04, 0.4, z % 18 === 0 ? '#ff4040' : '#f0f0e0'); k.box(-hw + 0.05, 1.1, z, 0.1, 2.2, 1.0, '#8a7a6a'); }
        glow.box(0, 1.2, -hd + 0.25, 1.0, 2.4, 0.02, '#ffffff');
        spot(0, -hd + 3, 0, 'wait');
        break;
      }
    }
    group.add(meshFromKit(k));
    group.add(meshFromKit(glow, true));
    // lights
    const amb = new THREE.HemisphereLight('#fff8f0', '#504840', kind === 'anomaly' ? 0.4 : 0.9);
    group.add(amb);
    const pts = [];
    for (let x = -hw + RW / 4; x < hw; x += RW / 2) for (let z = -hd + RD / 4; z < hd; z += RD / 2) { const p = new THREE.PointLight(kind === 'diner' ? '#ffc890' : kind === 'anomaly' ? '#ffffff' : '#fff0dc', kind === 'warehouse' || kind === 'mall' ? 26 : 12, Math.max(RW, RD), 1.6); p.position.set(x, H - 0.4, z); p.userData.base = p.intensity; group.add(p); pts.push(p); }
    return { group, W: RW, D: RD, H, door: { x: 0, z: hd - 0.2 }, spots, col, winMat, lights: pts };
  }

  // ------------------------------------------------------------------ figures
  roleSpot(c, b) {
    const W = this.W;
    if (c.status === 'hospital') return 'bed';
    if (c.status === 'jail') return 'cell';
    if (c.job && W.economy.biz[c.job.biz]?.b === b.id && c.working) return this.kind === 'hospital' ? 'staff2' : this.kind === 'office' || this.kind === 'police' ? 'desk' : this.kind === 'fire' ? 'wait' : 'staff';
    if (c.duty != null) return 'wait';
    if (c.activity === 'sleep') return 'bed';
    if (this.kind === 'home') return rand.pick(['sofa', 'seat', 'stand']);
    if (this.kind === 'diner') return 'seat';
    if (this.kind === 'shop' || this.kind === 'mall') return 'browse';
    return 'wait';
  }

  syncFigures(force) {
    const W = this.W, b = this.b;
    if (!b) return;
    const occ = Array.from(b.occupants).filter((id) => id !== this.c?.id || !this.c.possessed);
    const key = occ.join(',');
    if (!force && key === this.lastOcc) return;
    this.lastOcc = key;
    const used = new Set();
    for (const [cid, f] of this.figs) if (!b.occupants.has(cid)) this.figs.delete(cid);
    for (const f of this.figs.values()) used.add(f.spot);
    for (const cid of occ.slice(0, 60)) {
      if (this.figs.has(cid)) continue;
      const c = W.citizens[cid];
      const want = this.roleSpot(c, b);
      let si = this.room.spots.findIndex((s, i) => !used.has(i) && (s.type === want || want === 'staff' && s.type === 'staff2'));
      if (si < 0) si = this.room.spots.findIndex((s, i) => !used.has(i) && s.type !== 'bed' && s.type !== 'cell');
      if (si < 0) continue;
      used.add(si);
      const s = this.room.spots[si];
      const f = { id: 10000 + cid, cid, x: s.x, z: s.z, y: 0, h: s.h, v: 0, anim: hash01(cid, 3) * 10, action: '', state: 'idle', spot: si, tx: s.x, tz: s.z, wander: 4 + hash01(cid) * 10 };
      this.applySpotPose(f, s, c);
      this.figs.set(cid, f);
    }
  }

  applySpotPose(f, s, c) {
    f.action = '';
    f.y = 0;
    if (s.type === 'seat' || s.type === 'sofa' || s.type === 'desk') f.action = 'sit';
    if (s.type === 'bed') { f.action = c.status === 'hospital' ? 'down' : 'sleep'; f.y = s.patient ? 0.58 : 0.45; }
    if (s.type === 'cell') f.action = c.flags.cuffed ? 'cuffed' : '';
  }

  update(dt) {
    if (!this.room) return;
    const W = this.W, R = this.room;
    // the possessed/followed citizen left this building (AI decided to go): follow outside
    const c = this.c;
    if (c && !c.possessed && !this.game.possession.autopilot) { this.exit(true); return; }
    if (c && this.game.possession.autopilot && c.at !== this.b.id) { this.exit(true); this.game.possession.mode = c.ped ? 'foot' : 'drive'; return; }
    if (this.frameT === undefined || (this.frameT += dt) > 0.5) { this.frameT = 0; this.syncFigures(false); }
    // windows follow outdoor light
    const night = W.env.night;
    R.winMat.color.setRGB(0.25 + (1 - night) * 0.9, 0.3 + (1 - night) * 0.95, 0.45 + (1 - night) * 0.9);
    const powered = this.b.powered;
    for (const l of R.lights) l.intensity = powered ? l.userData.base : 0;
    // customers wander between browse spots
    for (const f of this.figs.values()) {
      const s = R.spots[f.spot];
      if (s.type === 'browse' || s.type === 'wait') {
        f.wander -= dt;
        if (f.wander <= 0) { f.wander = 5 + rand.float() * 10; const alt = R.spots.filter((x) => x.type === s.type); const t = alt[rand.int(0, alt.length - 1)]; f.tx = t.x + (rand.float() - 0.5) * 0.6; f.tz = t.z + (rand.float() - 0.5) * 0.6; f.th = t.h; }
        const dx = f.tx - f.x, dz = f.tz - f.z, d = Math.hypot(dx, dz);
        if (d > 0.1) { f.v = 1.1; f.state = 'walk'; f.x += dx / d * Math.min(d, 1.1 * dt); f.z += dz / d * Math.min(d, 1.1 * dt); f.h += wrapAngle(Math.atan2(dx, dz) - f.h) * Math.min(1, dt * 6); f.anim += dt * 2.6; }
        else { f.v = 0; f.state = 'idle'; if (f.th != null) f.h += wrapAngle(f.th - f.h) * Math.min(1, dt * 3); }
      } else f.anim += dt * 0.5;
    }
    // metro trains arrive and leave
    if (this.train) {
      this.trainT += dt;
      const cyc = this.trainT % 40;
      const x = cyc < 8 ? -120 + (cyc / 8) * 120 : cyc < 20 ? 0 : cyc < 28 ? ((cyc - 20) / 8) ** 2 * 140 : -200;
      this.train.position.x = x;
      this.train.visible = cyc < 28;
    }
    // figures for the renderer
    const ex = this.people.extra;
    ex.length = 0;
    for (const f of this.figs.values()) { const fc = W.citizens[f.cid]; f.look = this.people.lookFor(fc); ex.push(f); }
    if (this.player && c) { this.player.look = this.people.lookFor(c); ex.push(this.player); }
    this.people.update(dt);
  }

  // ------------------------------------------------------------------ player inside
  updatePlayer(dt, P) {
    const g = this.game, I = g.input, W = this.W, R = this.room, p = this.player, c = this.c;
    if (!p) return;
    const T = g.rig.third;
    const run = I.down('ShiftLeft');
    const mx = I.axis('KeyA', 'KeyD'), mz = I.axis('KeyS', 'KeyW');
    let dx = Math.sin(T.yaw) * mz - Math.cos(T.yaw) * mx, dz = Math.cos(T.yaw) * mz + Math.sin(T.yaw) * mx;
    const len = Math.hypot(dx, dz);
    const sp = len > 0.01 ? (run ? 4.5 : 1.9) : 0;
    if (len > 0.01) { dx /= len; dz /= len; p.h += wrapAngle(Math.atan2(dx, dz) - p.h) * Math.min(1, dt * 12); }
    p.v = damp(p.v, sp, 10, dt);
    let nx = p.x + Math.sin(p.h) * p.v * dt, nz = p.z + Math.cos(p.h) * p.v * dt;
    for (const b of R.col) {
      const cx = clamp(nx, b.x0, b.x1), cz = clamp(nz, b.z0, b.z1);
      const ddx = nx - cx, ddz = nz - cz, d = Math.hypot(ddx, ddz);
      if (d < 0.35) { if (d > 1e-4) { nx = cx + ddx / d * 0.35; nz = cz + ddz / d * 0.35; } else { nx = p.x; nz = p.z; } }
    }
    p.x = nx; p.z = nz;
    p.state = p.v > 0.1 ? 'walk' : 'idle';
    p.anim += dt * p.v * 2.4;
    p.run = run && p.v > 3;
    if (p.v > 0.5) { this.stepAcc = (this.stepAcc || 0) + dt * p.v * 0.8; if (this.stepAcc > 1) { this.stepAcc = 0; g.audio && g.audio.footstep(run, 0, 0, true); } }
    // interactions
    P.prompts = [];
    const b = this.b;
    const biz = b.bizId != null ? W.economy.biz[b.bizId] : null;
    if (dist(p.x, p.z, R.door.x, R.door.z) < 2.2) {
      P.prompts.push({ key: 'E', text: `Leave ${W.citizenAI.buildingName(b.id)}` });
      if (I.hit('KeyE')) { this.exit(false); return; }
    }
    const staffSpot = R.spots.find((s) => s.type === 'staff');
    const nearStaff = staffSpot && dist(p.x, p.z, staffSpot.x, staffSpot.z) < 2.6 && Array.from(this.figs.values()).some((f) => R.spots[f.spot].type === 'staff');
    if (biz && nearStaff && BTYPES[biz.type].price) {
      P.prompts.push({ key: 'E', text: `Buy something (${biz.name})` });
      if (I.hit('KeyE')) { const amt = W.economy.visit(biz, c); g.toast(amt > 0 ? `Spent $${Math.round(amt)} at ${biz.name}.` : 'They couldn\'t serve you.'); if (amt > 0) { c.needs.hunger = Math.min(1, c.needs.hunger + 0.4); c.needs.fun = Math.min(1, c.needs.fun + 0.15); } }
      if (BTYPES[biz.type].robbable && c.duty == null) {
        P.prompts.push({ key: 'G', text: 'Rob the register', danger: true });
        if (I.hit('KeyG')) {
          c.flags.crime = { type: 'robbery', biz: biz.id };
          W.incidents.executeCrime(c);
          g.toast('The clerk hits the alarm. Police are coming — run!');
          g.audio && g.audio.alarm();
          for (const f of this.figs.values()) if (R.spots[f.spot].type === 'staff') f.action = 'hail';
        }
      }
    }
    // beds at home: sleep through the night
    if (this.kind === 'home' && b.residents.includes(c.id)) {
      const bed = R.spots.find((s) => s.type === 'bed');
      if (bed && dist(p.x, p.z, bed.x, bed.z) < 2.2) {
        P.prompts.push({ key: 'E', text: g.speedIdx >= 5 ? 'Wake up' : 'Sleep until morning' });
        if (I.hit('KeyE')) {
          if (g.speedIdx >= 5) { g.setSpeed(2); p.action = ''; }
          else { p.action = 'sleep'; p.x = bed.x; p.z = bed.z; g.setSpeed(5); c.activity = 'sleep'; this.sleeping = true; }
        }
      }
      if (this.sleeping) { c.needs.energy = Math.min(1, c.needs.energy + dt * 0.02); const h = W.minuteOfDay / 60; if (h > c.wakeH && h < c.wakeH + 1) { this.sleeping = false; g.setSpeed(2); p.action = ''; g.toast(`${c.first} wakes up. ${W.history.timeStr(W.time)}.`); } }
    }
    // work at your workplace
    if (c.job && W.economy.biz[c.job.biz]?.b === b.id) {
      if (W.citizenAI.inShift(c, W.minuteOfDay, 30)) {
        if (!c.working) { P.prompts.push({ key: 'E', text: 'Clock in' }); if (I.hit('KeyE')) { W.citizenAI.startWork(c); g.toast(`Clocked in at ${W.economy.biz[c.job.biz].name}. You're earning $${Math.round(c.job.wage)}/h.`); } }
        else P.prompts.push({ key: '', text: `On shift — earning $${Math.round(c.job.wage)}/h` });
      }
    }
    // metro: ride to another station
    if (this.kind === 'metro') {
      const others = (W.city.special.metro || []).filter((id) => id !== b.id && W.city.buildings[id].state === 'ok');
      others.forEach((id, i) => {
        P.prompts.push({ key: String(i + 1), text: `Ride to ${W.city.buildings[id].name}` });
        if (I.hit('Digit' + (i + 1)) && W.power.isPoweredAt(b.x, b.z)) {
          W.citizenAI.placeInside(c, id);
          c.money -= 2.5;
          const nb = W.city.buildings[id];
          this.enter(nb, c, true);
          g.toast(`You ride the metro to ${nb.name}.`);
        }
      });
      if (!W.power.isPoweredAt(b.x, b.z)) P.prompts.push({ key: '', text: 'Trains stopped — blackout' });
    }
    // talk to people
    let near = null, nd = 1.8;
    for (const f of this.figs.values()) { const d = dist(f.x, f.z, p.x, p.z); if (d < nd) { nd = d; near = f; } }
    if (near) {
      const o = W.citizens[near.cid];
      P.prompts.push({ key: 'T', text: `Talk to ${o.first}` });
      if (I.hit('KeyT')) { const r = W.citizenAI.addAff(c, o, 0.06); g.toast(`${o.first}: “${this.game.possession.lineFor(o, r)}”`, 5); near.h = Math.atan2(p.x - near.x, p.z - near.z); }
      if (c.job && c.job.role === 'officer' && c.duty != null && (o.record.wanted || o.flags.suspectOf)) {
        P.prompts.push({ key: 'E', text: `Arrest ${o.name}` });
        if (I.hit('KeyE')) { this.exit(false); W.citizenAI.leaveBuilding(o); this.game.possession.arrest(o, o.flags.suspectOf ? W.incidents.get(o.flags.suspectOf) : null); }
      }
    }
    // camera inside the room
    const pos = { x: p.x, y: 0, z: p.z };
    g.rig.updateThird(dt, pos, { minDist: 1.6, maxDist: 6 });
    const cam = g.renderer.camera.position;
    cam.x = clamp(cam.x, -R.W / 2 + 0.3, R.W / 2 - 0.3);
    cam.z = clamp(cam.z, -R.D / 2 + 0.3, R.D / 2 - 0.3);
    cam.y = clamp(cam.y, 0.5, R.H - 0.2);
  }
}
