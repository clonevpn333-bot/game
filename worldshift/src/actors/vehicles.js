// Vehicles: procedural era models, arcade-with-weight physics, AI traffic,
// player driving, damage, explosions, and era transformation when shifting.
import * as THREE from 'three';
import { G } from '../core/state.js';
import { RNG, clamp, damp, dampAngle, wrapAngle, lerp, approach } from '../core/mathx.js';
import { chunkCoord } from '../world/layout.js';
import { CF } from '../world/collision.js';
import { patchActorMaterial } from '../world/materials.js';

// ---------------------------------------------------------------- models --
// Side profiles: [x (length), y (height)] counter-clockwise, front at +x
const PROFILES = {
  sedan: [[-2.3, 0.32], [2.3, 0.32], [2.36, 0.62], [2.25, 0.86], [1.35, 0.92], [0.62, 1.38], [-1.1, 1.4], [-1.85, 0.98], [-2.34, 0.92], [-2.38, 0.6]],
  pickup: [[-2.6, 0.45], [2.5, 0.45], [2.55, 0.8], [2.4, 1.05], [1.4, 1.12], [0.95, 1.75], [-0.35, 1.78], [-0.5, 1.12], [-2.6, 1.12]],
  van: [[-2.5, 0.4], [2.45, 0.4], [2.5, 0.85], [2.2, 1.2], [1.5, 2.15], [-2.45, 2.2], [-2.55, 0.9]],
  moto: [[-1.0, 0.45], [1.0, 0.45], [1.05, 0.75], [0.6, 1.05], [-0.2, 0.95], [-0.8, 1.0], [-1.05, 0.8]],
  sport: [[-2.35, 0.25], [2.4, 0.25], [2.5, 0.45], [2.1, 0.68], [0.9, 0.8], [0.1, 1.18], [-1.0, 1.2], [-2.0, 0.88], [-2.4, 0.78]],
  pod: [[-1.8, 0.35], [1.8, 0.35], [1.95, 0.9], [1.3, 1.65], [-1.2, 1.7], [-1.9, 1.0]],
  interceptor: [[-2.45, 0.28], [2.5, 0.28], [2.6, 0.55], [2.0, 0.78], [0.8, 0.88], [0.0, 1.3], [-1.2, 1.32], [-2.2, 0.95], [-2.5, 0.8]],
  hauler: [[-3.0, 0.45], [2.9, 0.45], [3.0, 1.1], [2.4, 2.2], [-3.0, 2.4]],
  buggy: [[-1.9, 0.6], [1.9, 0.6], [2.1, 0.9], [1.3, 1.0], [0.6, 1.3], [-1.5, 1.3], [-2.0, 1.0]],
  rattruck: [[-2.7, 0.6], [2.6, 0.6], [2.7, 1.2], [2.3, 1.4], [1.3, 1.45], [0.9, 2.05], [-0.6, 2.1], [-0.8, 1.45], [-2.7, 1.5]],
};
// glass band profiles (slightly inset)
const GLASS = {
  sedan: [[1.3, 0.94], [0.65, 1.34], [-1.06, 1.36], [-1.78, 0.98]],
  pickup: [[1.36, 1.14], [0.93, 1.72], [-0.33, 1.74], [-0.46, 1.14]],
  van: [[2.15, 1.22], [1.52, 2.05], [0.6, 2.08], [0.6, 1.25]],
  sport: [[0.88, 0.82], [0.12, 1.15], [-0.98, 1.17], [-1.9, 0.9]],
  pod: [[1.85, 0.95], [1.28, 1.6], [-1.15, 1.64], [-1.8, 1.02]],
  interceptor: [[0.78, 0.9], [0.02, 1.27], [-1.18, 1.29], [-2.1, 0.97]],
  hauler: [[2.85, 1.15], [2.35, 2.1], [1.6, 2.15], [1.6, 1.2]],
  buggy: [[1.25, 1.02], [0.6, 1.28], [0.5, 1.28], [0.5, 1.02]],
  rattruck: [[1.26, 1.47], [0.88, 2.0], [-0.55, 2.04], [-0.72, 1.47]],
};

export const VTYPES = {
  sedan: { profile: 'sedan', width: 1.78, wheelR: 0.33, wheelbase: 2.7, track: 1.5, mass: 1300, power: 9.5, top: 46, grip: 9, colors: ['#8a1e1e', '#2a3a5a', '#d8d4c8', '#3a5a3a', '#6a6a70', '#1a1a1e', '#c8a040', '#5a2a4a'], era: 0, cls: 'car' },
  taxi: { profile: 'sedan', width: 1.78, wheelR: 0.33, wheelbase: 2.7, track: 1.5, mass: 1350, power: 9, top: 44, grip: 9, colors: ['#f0c020'], era: 0, cls: 'taxi', sign: true },
  cop: { profile: 'sedan', width: 1.8, wheelR: 0.34, wheelbase: 2.75, track: 1.52, mass: 1450, power: 12, top: 54, grip: 10, colors: ['#1a1a20'], era: 0, cls: 'police', lightbar: true, twoTone: '#f0f0f0' },
  pickup: { profile: 'pickup', width: 1.9, wheelR: 0.4, wheelbase: 3.1, track: 1.6, mass: 1800, power: 9, top: 40, grip: 8.5, colors: ['#6a2a1a', '#2a4a6a', '#c8c0a8', '#3a3a3a', '#4a5a3a'], era: 0, cls: 'truck' },
  van: { profile: 'van', width: 1.95, wheelR: 0.36, wheelbase: 3.0, track: 1.65, mass: 2100, power: 7.5, top: 36, grip: 8, colors: ['#e8e4dc', '#4a5a7a', '#8a3a2a'], era: 0, cls: 'van' },
  moto: { profile: 'moto', width: 0.5, wheelR: 0.33, wheelbase: 1.45, track: 0, mass: 220, power: 13, top: 52, grip: 9.5, colors: ['#a01818', '#1a1a1a', '#2a4aa0'], era: 0, cls: 'moto', bike: true },
  sport: { profile: 'sport', width: 1.95, wheelR: 0.34, wheelbase: 2.75, track: 1.65, mass: 1250, power: 16, top: 70, grip: 11, colors: ['#e8ecf0', '#15171c', '#c01850', '#1a6ab0', '#e0a020'], era: 1, cls: 'car', strips: true },
  pod: { profile: 'pod', width: 1.7, wheelR: 0.28, wheelbase: 2.3, track: 1.45, mass: 1000, power: 9, top: 40, grip: 10, colors: ['#f2f2ee', '#30c0e0'], era: 1, cls: 'taxi', strips: true, hover: true },
  interceptor: { profile: 'interceptor', width: 2.0, wheelR: 0.35, wheelbase: 2.9, track: 1.7, mass: 1500, power: 17, top: 72, grip: 11.5, colors: ['#10141a'], era: 1, cls: 'police', lightbar: true, strips: true },
  hauler: { profile: 'hauler', width: 2.3, wheelR: 0.42, wheelbase: 3.8, track: 1.9, mass: 3200, power: 8, top: 38, grip: 8, colors: ['#d8dce0', '#3a3f48'], era: 1, cls: 'truck', strips: true },
  hoverbike: { profile: 'moto', width: 0.55, wheelR: 0.3, wheelbase: 1.5, track: 0, mass: 240, power: 16, top: 66, grip: 10, colors: ['#15171c', '#e8ecf0'], era: 1, cls: 'moto', bike: true, hover: true, strips: true },
  buggy: { profile: 'buggy', width: 1.9, wheelR: 0.48, wheelbase: 2.6, track: 1.7, mass: 900, power: 11, top: 46, grip: 10, colors: ['#6a5a3a', '#5a3a2a', '#4a4a3a'], era: 2, cls: 'car', cage: true, rust: true },
  rattruck: { profile: 'rattruck', width: 2.0, wheelR: 0.5, wheelbase: 3.2, track: 1.75, mass: 2300, power: 9, top: 38, grip: 8.5, colors: ['#5a4a3a', '#4a3a2a'], era: 2, cls: 'truck', cage: true, rust: true, armor: true },
  trike: { profile: 'moto', width: 0.9, wheelR: 0.4, wheelbase: 1.6, track: 0.9, mass: 300, power: 12, top: 46, grip: 9, colors: ['#5a4a3a'], era: 2, cls: 'moto', rust: true },
};
// era counterparts by class
const COUNTERPART = {
  car: ['sedan', 'sport', 'buggy'], taxi: ['taxi', 'pod', 'buggy'], police: ['cop', 'interceptor', 'buggy'],
  truck: ['pickup', 'hauler', 'rattruck'], van: ['van', 'hauler', 'rattruck'], moto: ['moto', 'hoverbike', 'trike'],
};
const TRAFFIC_MIX = [
  [['sedan', 10], ['taxi', 3], ['pickup', 3], ['van', 2], ['moto', 1]],
  [['sport', 6], ['pod', 6], ['hauler', 2], ['hoverbike', 2]],
  [['buggy', 3], ['rattruck', 1], ['trike', 1]],
];

const geoCache = {};
function bodyGeo(type) {
  const key = 'b_' + type;
  if (geoCache[key]) return geoCache[key];
  const t = VTYPES[type];
  const prof = PROFILES[t.profile];
  const shape = new THREE.Shape(prof.map(([x, y]) => new THREE.Vector2(x, y)));
  const w = t.bike ? t.width : t.width - 0.12;
  const g = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 2, curveSegments: 4 });
  g.translate(0, 0, -w / 2);
  g.rotateY(-Math.PI / 2); // front → +z
  g.computeVertexNormals();
  geoCache[key] = g;
  return g;
}
function glassGeo(type) {
  const key = 'g_' + type;
  if (geoCache[key] !== undefined) return geoCache[key];
  const t = VTYPES[type];
  const gp = GLASS[t.profile];
  if (!gp) { geoCache[key] = null; return null; }
  const shape = new THREE.Shape(gp.map(([x, y]) => new THREE.Vector2(x, y)));
  const w = t.width - 0.04;
  const g = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false });
  g.translate(0, 0, -w / 2);
  g.rotateY(-Math.PI / 2);
  geoCache[key] = g;
  return g;
}
const wheelGeo = new THREE.CylinderGeometry(1, 1, 1, 16);
wheelGeo.rotateZ(Math.PI / 2);
const hubGeo = new THREE.CylinderGeometry(0.55, 0.55, 1.02, 8);
hubGeo.rotateZ(Math.PI / 2);

const sharedMats = {};
function mat(key, era, make) {
  const k = key + '|' + era;
  if (!sharedMats[k]) { sharedMats[k] = make(); patchActorMaterial(sharedMats[k], era); }
  return sharedMats[k];
}

function buildModel(type) {
  const t = VTYPES[type];
  const era = t.era;
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const color = new THREE.Color(t.colorPick || t.colors[0]);
  const paint = new THREE.MeshPhysicalMaterial({
    color, roughness: t.rust ? 0.75 : 0.32, metalness: t.rust ? 0.35 : 0.5, clearcoat: t.rust ? 0 : 0.8, clearcoatRoughness: 0.15,
  });
  patchActorMaterial(paint, era);
  const bm = new THREE.Mesh(bodyGeo(type), paint);
  bm.castShadow = true; bm.receiveShadow = true;
  body.add(bm);
  const gg = glassGeo(type);
  if (gg) {
    const gm = new THREE.Mesh(gg, mat('glass', era, () => new THREE.MeshPhysicalMaterial({ color: era === 1 ? 0x0a1420 : 0x101418, roughness: 0.05, metalness: 0.6, clearcoat: 1 })));
    body.add(gm);
  }
  const L = PROFILES[t.profile].reduce((m, p) => Math.max(m, p[0]), 0);
  const B = PROFILES[t.profile].reduce((m, p) => Math.min(m, p[0]), 0);
  const H = PROFILES[t.profile].reduce((m, p) => Math.max(m, p[1]), 0);
  const hw = t.width / 2;
  // lights
  const em = (c, i = 3) => mat('em' + c, era, () => new THREE.MeshStandardMaterial({ color: 0x000000, emissive: new THREE.Color(c), emissiveIntensity: i }));
  const head = new THREE.Mesh(new THREE.BoxGeometry(t.bike ? 0.18 : 0.35, 0.12, 0.05), em(era === 1 ? '#bfe8ff' : '#fff2d0', 4));
  const tail = new THREE.Mesh(new THREE.BoxGeometry(t.bike ? 0.15 : 0.32, 0.1, 0.05), em('#ff2010', 3));
  const fy = (PROFILES[t.profile][2] || [0, 0.6])[1];
  if (t.bike) {
    const h1 = head.clone(); h1.position.set(0, 0.85, L + 0.02); body.add(h1);
    const t1 = tail.clone(); t1.position.set(0, 0.8, B - 0.02); body.add(t1);
  } else {
    for (const s of [-1, 1]) {
      const h1 = head.clone(); h1.position.set(s * (hw - 0.3), fy, L + 0.04); body.add(h1);
      const t1 = tail.clone(); t1.position.set(s * (hw - 0.3), fy, B - 0.04); body.add(t1);
    }
  }
  if (t.strips) {
    const sc = era === 1 ? (type === 'interceptor' ? '#ff2a4a' : '#30e0ff') : '#ffffff';
    const s = new THREE.Mesh(new THREE.BoxGeometry(t.bike ? 0.04 : t.width + 0.02, 0.03, (L - B) * 0.9), em(sc, 3));
    s.position.set(0, 0.42, (L + B) / 2);
    body.add(s);
  }
  if (t.lightbar) {
    const lb = new THREE.Group();
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.25), em('#ff1010', 5));
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.25), em('#1040ff', 5));
    r.position.x = -0.28; b.position.x = 0.28;
    lb.add(r, b);
    lb.position.set(0, H + 0.08, -0.2);
    body.add(lb);
    root.userData.lightbar = [r, b];
    if (t.twoTone) {
      const door = new THREE.Mesh(new THREE.BoxGeometry(t.width + 0.01, 0.42, 1.9), mat('white2', era, () => new THREE.MeshPhysicalMaterial({ color: t.twoTone, roughness: 0.3, metalness: 0.3, clearcoat: 0.8 })));
      door.position.set(0, 0.62, -0.1);
      body.add(door);
    }
  }
  if (t.sign) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.18), em('#ffe080', 2));
    s.position.set(0, H + 0.1, -0.3);
    body.add(s);
  }
  if (t.cage) {
    const cm = mat('cage', era, () => new THREE.MeshStandardMaterial({ color: 0x3a3028, roughness: 0.7, metalness: 0.6 }));
    for (const s of [-1, 1]) for (const z of [0.5, -1.3]) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, H + 0.2, 6), cm);
      bar.position.set(s * (hw - 0.05), (H + 0.2) / 2 + 0.3, z);
      body.add(bar);
    }
    const top = new THREE.Mesh(new THREE.BoxGeometry(t.width, 0.06, 2.0), cm);
    top.position.set(0, H + 0.45, -0.4);
    body.add(top);
  }
  // wheels
  const wheels = [];
  const tyre = mat('tyre', era, () => new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.9 }));
  const hub = mat('hub', era, () => new THREE.MeshStandardMaterial({ color: era === 2 ? 0x5a4a3a : 0xa0a4a8, roughness: 0.35, metalness: 0.9 }));
  const wpos = t.bike
    ? (t.track ? [[0, L - 0.35], [-t.track / 2, B + 0.4], [t.track / 2, B + 0.4]] : [[0, L - 0.35], [0, B + 0.35]])
    : [[-t.track / 2, L - 0.85], [t.track / 2, L - 0.85], [-t.track / 2, B + 0.75], [t.track / 2, B + 0.75]];
  for (const [x, z] of wpos) {
    const w = new THREE.Group();
    const tm = new THREE.Mesh(wheelGeo, tyre);
    tm.scale.set(t.bike ? 0.14 : 0.24, t.wheelR, t.wheelR);
    tm.castShadow = true;
    const hm = new THREE.Mesh(hubGeo, hub);
    hm.scale.set(t.bike ? 0.15 : 0.25, t.wheelR, t.wheelR);
    w.add(tm, hm);
    w.position.set(x, t.wheelR, z);
    if (t.hover) {
      tm.visible = false; hm.visible = false;
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(t.wheelR, t.wheelR * 0.8, 0.08, 14), em(era === 1 ? '#30e0ff' : '#ffffff', 3));
      w.add(pad);
    }
    root.add(w);
    wheels.push({ g: w, front: z > 0, x, z });
  }
  root.userData.wheels = wheels;
  root.userData.body = body;
  root.userData.paint = paint;
  root.userData.length = L - B;
  root.userData.front = L;
  root.userData.back = B;
  root.userData.height = H;
  return root;
}

// ---------------------------------------------------------------- vehicle --
let NEXT_ID = 1;
export class Vehicle {
  constructor(type, x, z, yaw, opts = {}) {
    this.id = NEXT_ID++;
    this.pos = new THREE.Vector3(x, 0, z);
    this.yaw = yaw;
    this.speed = 0;        // forward m/s
    this.lat = 0;          // lateral slip m/s
    this.vy = 0;
    this.yawRate = 0;
    this.steer = 0;
    this.health = 100;
    this.dead = false;
    this.burning = 0;
    this.driver = opts.driver || null; // 'player' | 'ai' | null
    this.ai = null;
    this.parked = !!opts.parked;
    this.pitch = 0; this.roll = 0; this.suspY = 0; this.suspV = 0;
    this.wheelSpin = 0;
    this.era = VTYPES[type].era;
    this.colorPick = opts.color || null;
    this.setType(type, opts.color);
    this.siren = false;
    this.horn = 0;
    this.reversing = false;
    this.lastHit = 0;
    this.smoke = 0;
    this.persistent = !!opts.persistent;
  }

  setType(type, color = null) {
    const t = VTYPES[type];
    if (this.model && this.model.parent) this.model.parent.remove(this.model);
    this.type = type;
    this.t = t;
    this.era = t.era;
    const c = color || this.colorPick || t.colors[Math.floor(Math.random() * t.colors.length)];
    this.colorPick = t.colors.includes(c) ? c : t.colors[Math.floor(Math.random() * t.colors.length)];
    t.colorPick = this.colorPick;
    this.model = buildModel(type);
    this.model.userData.paint.color.set(this.colorPick);
    this.halfL = this.model.userData.length / 2;
    this.halfW = t.width / 2 + 0.05;
    this.centerZ = (this.model.userData.front + this.model.userData.back) / 2;
    this.camDist = t.bike ? 5.2 : this.halfL > 2.8 ? 9 : 7;
    this.camHeight = t.bike ? 1.4 : this.model.userData.height + 0.6;
    if (G.vehicles) G.vehicles.group.add(this.model);
  }

  get forward() { return new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)); }

  // corners of the footprint (world xz)
  corners() {
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
    const rx = fz, rz = -fx;
    const cz = this.centerZ;
    const cx0 = this.pos.x + fx * cz, cz0 = this.pos.z + fz * cz;
    const out = [];
    for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
      out.push([cx0 + fx * this.halfL * a + rx * this.halfW * b, cz0 + fz * this.halfL * a + rz * this.halfW * b, a, b]);
    }
    return out;
  }

  damage(n, at = null) {
    if (this.dead) return;
    const armor = this.t.armor ? 0.6 : 1;
    this.health -= n * armor;
    if (this.health <= 0) this.explode();
  }

  explode() {
    if (this.dead) return;
    this.dead = true;
    this.health = 0;
    this.speed *= 0.3;
    this.burning = 12;
    G.fx && G.fx.explosion(this.pos.clone().setY(this.pos.y + 1), 1.2);
    G.audio.play('explosion', this.pos);
    G.events.emit('noise', this.pos, 90, 'explosion');
    G.combat && G.combat.radialDamage(this.pos, 7, 140, this);
    this.model.userData.paint.color.multiplyScalar(0.12);
    this.model.userData.paint.roughness = 1;
    this.vy = 6;
    const p = G.player;
    if (p.vehicle === this) G.vehicles.exit(true);
  }
}

// ----------------------------------------------------------- manager ------
export class Vehicles {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.list = [];
    this.rng = new RNG(777);
    this.spawnTimer = 0;
    this.parkedSeen = new Set();
    this.engine = null;
    G.events.on('shift', (from, to) => this.onShift(from, to));
  }

  add(type, x, z, yaw, opts = {}) {
    const v = new Vehicle(type, x, z, yaw, opts);
    const g = G.collision.ground(v.era, x, z, 50, 0.3);
    v.pos.y = g.y;
    this.list.push(v);
    return v;
  }

  remove(v) {
    if (v.model.parent) v.model.parent.remove(v.model);
    const i = this.list.indexOf(v);
    if (i >= 0) this.list.splice(i, 1);
    if (v.aiDriver && v.aiDriver.alive && !v.aiDriver.persistent) v.aiDriver.alive = false;
  }

  onShift(from, to) {
    const pv = G.player.vehicle;
    if (pv) {
      // the harness field carries the vehicle across: it re-materialises as its era counterpart
      const nt = COUNTERPART[pv.t.cls][to];
      pv.setType(nt);
      G.hud.toast(`Your ${VTYPES[COUNTERPART[pv.t.cls][from]] ? COUNTERPART[pv.t.cls][from] : 'vehicle'} re-materialised as a ${nt}`, 'info', 2.5);
    }
    // other vehicles belong to their era; drop ones from the old era after the wave passes
    setTimeout(() => {
      for (const v of this.list.slice()) if (v.era !== G.era && v !== G.player.vehicle && !v.persistent) this.remove(v);
      this.parkedSeen.clear();
    }, 1500);
    this._populate(true);
  }

  // ---------------------------------------------------------- population --
  _populate(burst) {
    const era = G.era;
    const p = G.player.pos;
    let traffic = this.list.filter((v) => v.era === era && v.driver === 'ai').length;
    const target = [14, 18, 4][era];
    let tries = burst ? 40 : 3;
    while (traffic < target && tries-- > 0) {
      const a = this.rng.range(0, Math.PI * 2);
      const r = burst ? this.rng.range(25, 110) : this.rng.range(80, 130);
      const x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r;
      const cc = chunkCoord(x, z);
      const ec = G.chunks.eraChunk(cc.ci, cc.cj, era);
      if (!ec || !ec.lanes.length) continue;
      const lane = ec.lanes[Math.floor(this.rng.next() * ec.lanes.length)];
      if (lane.deck && era !== 1) continue;
      const t = this.rng.range(0.1, 0.9);
      const lx = lerp(lane.ax, lane.bx, t), lz = lerp(lane.az, lane.bz, t);
      if (this.list.some((v) => Math.hypot(v.pos.x - lx, v.pos.z - lz) < 9)) continue;
      if (!burst) {
        const fwd = new THREE.Vector3(); G.camera.getWorldDirection(fwd);
        if ((lx - G.camera.position.x) * fwd.x + (lz - G.camera.position.z) * fwd.z > 0 && Math.hypot(lx - p.x, lz - p.z) < 100) continue;
      }
      const type = this.rng.weighted(TRAFFIC_MIX[era]);
      const v = this.add(type, lx, lz, Math.atan2(lane.bx - lane.ax, lane.bz - lane.az), { driver: 'ai' });
      if (lane.deck) v.pos.y = G.collision.ground(era, lx, lz, 30, 0.3).y;
      v.ai = { lane, target: lane.road === 'highway' || lane.road === 'skyway' ? 22 : lane.road === 'avenue' ? 13 : 9, wait: 0, panic: 0 };
      traffic++;
    }
    // parked cars at chunk slots near the player
    G.chunks.forEachActive(era, (c, ec) => {
      if (this.parkedSeen.has(c.key)) return;
      if (Math.hypot(c.cx - p.x, c.cz - p.z) > 170) return;
      this.parkedSeen.add(c.key);
      const rng = new RNG((c.ci * 92821) ^ (c.cj * 31337) ^ era);
      for (const s of ec.parking) {
        if (!rng.chance(era === 2 ? 0.08 : s.driveway ? 0.5 : 0.45)) continue;
        if (this.list.some((v) => Math.hypot(v.pos.x - s.x, v.pos.z - s.z) < 4)) continue;
        const type = rng.weighted(TRAFFIC_MIX[era].filter(([t]) => VTYPES[t].cls !== 'police'));
        const v = this.add(type, s.x, s.z, s.yaw + (rng.chance(0.5) ? Math.PI : 0), { parked: true });
        v.chunkKey = c.key;
      }
    });
  }

  // ---------------------------------------------------------- player ----
  nearestEnterable(pos, maxD = 3.2) {
    let best = null, bd = maxD;
    for (const v of this.list) {
      if (v.dead || v.era !== G.era) continue;
      const d = Math.hypot(v.pos.x - pos.x, v.pos.z - pos.z) - v.halfW;
      if (d < bd) { bd = d; best = v; }
    }
    return best;
  }

  enter(v) {
    const p = G.player;
    if (v.driver === 'ai') {
      // carjack: the driver is thrown out and flees, witnesses report it
      const d = G.crowd.spawn(v.pos.x + Math.cos(v.yaw) * 2, v.pos.z - Math.sin(v.yaw) * 2, G.era, { state: 'flee' });
      if (d) { d.fear = 1.5; d.fearPos.copy(p.pos); d.witnessed = { pos: p.pos.clone(), kind: 'carjack', t: G.time }; }
      G.events.emit('noise', v.pos, 25, 'assault');
      G.events.emit('crime', { kind: 'carjack', pos: v.pos.clone() });
    }
    v.driver = 'player';
    v.ai = null;
    v.parked = false;
    p.vehicle = v;
    p.aiming = false;
    p.action = null;
    p.state = 'ground';
    G.audio.play('door', v.pos);
    G.hud.toast(`${v.type.toUpperCase()} — W/S throttle · A/D steer · Space handbrake · H horn · F exit`, 'info', 3);
  }

  exit(forced = false) {
    const p = G.player;
    const v = p.vehicle;
    if (!v) return;
    if (!forced && Math.abs(v.speed) > 8) { G.hud.toast('Too fast to bail out', 'warn', 1.5); return; }
    const rx = Math.cos(v.yaw), rz = -Math.sin(v.yaw);
    let x = v.pos.x - rx * (v.halfW + 0.7), z = v.pos.z - rz * (v.halfW + 0.7);
    if (!G.collision.bodyFree(G.era, x, v.pos.y, z)) { x = v.pos.x + rx * (v.halfW + 0.7); z = v.pos.z + rz * (v.halfW + 0.7); }
    v.driver = null;
    p.vehicle = null;
    p.teleport(x, v.pos.y + 0.3, z, v.yaw);
    p.vel.set(Math.sin(v.yaw) * v.speed * 0.4, 0, Math.cos(v.yaw) * v.speed * 0.4);
    G.audio.play('door', v.pos);
  }

  // Push the walking player out of vehicle footprints (OBB vs circle)
  pushOut(pos, r, h) {
    for (const v of this.list) {
      if (v.era !== G.era || v === G.player.vehicle) continue;
      const dx = pos.x - v.pos.x, dz = pos.z - v.pos.z;
      if (dx * dx + dz * dz > 30) continue;
      if (pos.y > v.pos.y + v.model.userData.height + 0.1) continue;
      const fx = Math.sin(v.yaw), fz = Math.cos(v.yaw);
      let lz = dx * fx + dz * fz - v.centerZ, lx = dx * fz - dz * fx;
      const ex = v.halfW + r, ez = v.halfL + r;
      if (Math.abs(lx) < ex && Math.abs(lz) < ez) {
        const px = ex - Math.abs(lx), pz = ez - Math.abs(lz);
        if (px < pz) lx = Math.sign(lx) * ex; else lz = Math.sign(lz) * ez;
        lz += v.centerZ;
        pos.x = v.pos.x + lz * fx + lx * fz;
        pos.z = v.pos.z + lz * fz - lx * fx;
      }
    }
  }

  // ---------------------------------------------------------- update ----
  update(dt, input) {
    const era = G.era;
    const p = G.player;
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) { this.spawnTimer = 1.0; this._populate(false); }
    // enter / exit
    if (input.keyPressed('KeyF') && !p.dead) {
      if (p.vehicle) this.exit();
      else {
        const v = this.nearestEnterable(p.pos);
        if (v) this.enter(v);
      }
    }
    if (!p.vehicle && !p.dead) {
      const v = this.nearestEnterable(p.pos);
      if (v && !G.interact?.prompting) G.hud.setPrompt(`<kbd>F</kbd>${v.driver === 'ai' ? 'Carjack' : 'Enter'} ${v.type}`);
      else if (!G.interact?.prompting) G.hud.setPrompt('');
    }
    for (const v of this.list.slice()) {
      if (v.era !== era && v !== p.vehicle && !G.shift.active) { this.remove(v); continue; }
      const dist = Math.hypot(v.pos.x - p.pos.x, v.pos.z - p.pos.z);
      if (dist > 220 && v !== p.vehicle && !v.persistent) { this.remove(v); continue; }
      if (v.parked && dist > 180) { this.remove(v); continue; }
      if (v.dead && v.burning <= 0 && dist > 60 && !v.persistent) { this.remove(v); continue; }
      if (v === p.vehicle) this._drivePlayer(v, dt, input);
      else if (v.driver === 'ai' && v.ai && !v.dead) this._driveAI(v, dt);
      else { v.steer = 0; this._coast(v, dt); }
      this._physics(v, dt);
      this._visual(v, dt);
    }
    if (p.vehicle) {
      const v = p.vehicle;
      p.pos.copy(v.pos);
      v.model.updateMatrixWorld(true);
      const seat = v.t.bike ? new THREE.Vector3(0, 0.55, -0.15) : new THREE.Vector3(v.t.width * 0.22, 0.2, 0.1);
      p.seatMatrix = new THREE.Matrix4().makeTranslation(seat.x, seat.y, seat.z).premultiply(v.model.matrixWorld);
      this._engineSound(v);
    }
    else if (this.engine) this._stopEngine();
  }

  _drivePlayer(v, dt, input) {
    const t = v.t;
    const thr = input.key('KeyW') || input.key('ArrowUp') ? 1 : 0;
    const brk = input.key('KeyS') || input.key('ArrowDown') ? 1 : 0;
    const st = (input.key('KeyA') || input.key('ArrowLeft') ? 1 : 0) - (input.key('KeyD') || input.key('ArrowRight') ? 1 : 0);
    v.handbrake = input.key('Space');
    if (input.keyPressed('KeyH')) { G.audio.play('horn', v.pos); G.events.emit('noise', v.pos, 25, 'horn'); }
    if (input.keyPressed('KeyG') && t.lightbar) v.siren = !v.siren;
    const speedK = clamp(1 - Math.abs(v.speed) / (t.top * 1.2), 0.25, 1);
    v.steer = damp(v.steer, st * 0.55 * speedK, 8, dt);
    if (v.dead) return;
    const top = t.top * (v.health < 30 ? 0.6 : 1);
    if (thr) {
      if (v.speed < -0.5) v.speed = approach(v.speed, 0, 18 * dt);
      else v.speed += t.power * dt * clamp(1 - v.speed / top, 0, 1) * (v.speed < 8 ? 1.3 : 1);
    }
    if (brk) {
      if (v.speed > 0.5) v.speed = approach(v.speed, 0, 22 * dt);
      else v.speed = Math.max(v.speed - t.power * 0.5 * dt, -10);
    }
    v.reversing = v.speed < -0.5;
    if (!thr && !brk) v.speed = approach(v.speed, 0, (1.2 + Math.abs(v.speed) * 0.04) * dt);
    if (v.handbrake) v.speed = approach(v.speed, 0, 6 * dt);
  }

  _coast(v, dt) {
    v.speed = approach(v.speed, 0, (v.dead ? 6 : 4) * dt);
    v.handbrake = false;
  }

  _driveAI(v, dt) {
    const ai = v.ai;
    if (ai.custom) { ai.custom(v, dt); return; }
    const lane = ai.lane;
    const t = v.t;
    // lane direction and distance to its end
    const lx = lane.bx - lane.ax, lz = lane.bz - lane.az;
    const ll = Math.hypot(lx, lz) || 1;
    const dirx = lx / ll, dirz = lz / ll;
    const along = (v.pos.x - lane.ax) * dirx + (v.pos.z - lane.az) * dirz;
    const toEnd = ll - along;
    // steer toward a look-ahead point on the lane (or into the next lane)
    let tx, tz;
    const look = 6 + Math.abs(v.speed) * 0.4;
    if (toEnd < look && ai.next) {
      const nl = ai.next;
      const nlx = nl.bx - nl.ax, nlz = nl.bz - nl.az, nll = Math.hypot(nlx, nlz) || 1;
      const k = look - toEnd;
      tx = nl.ax + (nlx / nll) * k; tz = nl.az + (nlz / nll) * k;
    } else {
      const a = Math.min(ll, along + look);
      tx = lane.ax + dirx * a; tz = lane.az + dirz * a;
    }
    const desired = Math.atan2(tx - v.pos.x, tz - v.pos.z);
    const err = wrapAngle(desired - v.yaw);
    v.steer = damp(v.steer, clamp(err * 1.4, -0.6, 0.6), 6, dt);
    if (!ai.next && toEnd < 30) ai.next = this._pickNext(lane, v);
    if (toEnd <= 0.5) {
      if (ai.next) { ai.lane = ai.next; ai.next = null; }
      else { this.remove(v); return; }
    }
    // target speed: lane speed, slow for turns, traffic lights, obstacles, panic
    let target = ai.target * (v.health < 40 ? 0.6 : 1);
    if (Math.abs(err) > 0.4) target = Math.min(target, 6);
    if (ai.panic > 0) { ai.panic -= dt; target *= 1.5; }
    // traffic signal at the end of this lane (city intersections only)
    if (lane.road !== 'highway' && lane.road !== 'skyway' && G.era < 2 && toEnd < 18 && toEnd > 4) {
      const axis = Math.abs(dirz) > Math.abs(dirx) ? 0 : 1;
      if (signalState(axis, G.time) !== 2 && ai.panic <= 0) target = Math.min(target, Math.max(0, (toEnd - 6) * 0.8));
    }
    // obstacle ahead (vehicles, player, NPCs)
    const fx = Math.sin(v.yaw), fz = Math.cos(v.yaw);
    let block = 99;
    const check = (x, z, rad) => {
      const dx = x - v.pos.x, dz = z - v.pos.z;
      const f = dx * fx + dz * fz;
      if (f < 0 || f > 22) return;
      const side = Math.abs(dx * fz - dz * fx);
      if (side < v.halfW + rad) block = Math.min(block, f);
    };
    for (const o of this.list) if (o !== v && o.era === v.era) check(o.pos.x, o.pos.z, o.halfW);
    const pl = G.player;
    check(pl.vehicle ? pl.vehicle.pos.x : pl.pos.x, pl.vehicle ? pl.vehicle.pos.z : pl.pos.z, 0.6);
    if (G.crowd) for (const n of G.crowd.npcs) if (n.alive && n.era === v.era && n.state !== 'dead') check(n.pos.x, n.pos.z, 0.4);
    if (block < 99) {
      target = Math.min(target, Math.max(0, (block - v.halfL - 3) * 0.9));
      if (block < v.halfL + 5) {
        ai.wait += dt;
        if (ai.wait > 3 && (G.time + v.id) % 7 < 0.05) G.audio.play('horn', v.pos);
      }
    } else ai.wait = 0;
    const acc = v.speed < target ? t.power * 0.7 : -14;
    v.speed = v.speed < target ? Math.min(target, v.speed + acc * dt) : Math.max(target, v.speed + acc * dt);
    v.handbrake = false;
  }

  _pickNext(lane, v) {
    const ex = lane.bx, ez = lane.bz;
    const dx = lane.bx - lane.ax, dz = lane.bz - lane.az, dl = Math.hypot(dx, dz);
    const cands = [];
    const cc = chunkCoord(ex, ez);
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const ec = G.chunks.eraChunk(cc.ci + i, cc.cj + j, v.era);
      if (!ec) continue;
      for (const l of ec.lanes) {
        if (l === lane) continue;
        if (!!l.deck !== !!lane.deck) continue;
        const d = Math.hypot(l.ax - ex, l.az - ez);
        const ldx = l.bx - l.ax, ldz = l.bz - l.az, ll = Math.hypot(ldx, ldz);
        const dot = (dx * ldx + dz * ldz) / (dl * ll);
        if (dot < -0.3) continue;
        if (dot > 0.9 && d < 2.5) cands.push([l, 6]);       // straight on
        else if (dot <= 0.9 && d < 16) {
          // turning: the new lane must start on the correct side
          const cross = dx * ldz - dz * ldx;
          cands.push([l, cross < 0 ? 2 : 1]);
        }
      }
    }
    if (!cands.length) return null;
    return this.rng.weighted(cands);
  }

  _physics(v, dt) {
    const t = v.t;
    const col = G.collision;
    const era = G.era;
    // tyre forces: lateral slip decays with grip (less with handbrake / damage)
    let grip = t.grip * (v.handbrake ? 0.25 : 1) * (G.weather && G.weather.wet ? 0.75 : 1);
    if (v.era === 2 && t.cls !== 'moto') grip *= 1.05;
    const wb = t.wheelbase;
    const yawTarget = (v.speed / wb) * Math.tan(v.steer);
    v.yawRate = damp(v.yawRate, yawTarget * (v.handbrake ? 1.35 : 1), v.handbrake ? 3 : 10, dt);
    v.yaw += v.yawRate * dt;
    // drift: when the yaw rate outruns the tyres, lateral velocity builds
    const slipGen = v.yawRate * v.speed * (v.handbrake ? 0.35 : 0.08);
    v.lat += slipGen * dt;
    v.lat = approach(v.lat, 0, grip * dt * (1 + Math.abs(v.lat) * 0.1));
    v.lat = clamp(v.lat, -12, 12);
    v.drifting = Math.abs(v.lat) > 2.2 && Math.abs(v.speed) > 6;
    if (v.drifting && G.fx && Math.random() < 0.6) {
      const back = v.model.userData.back;
      G.fx.tireSmoke(new THREE.Vector3(v.pos.x + Math.sin(v.yaw) * back, v.pos.y + 0.2, v.pos.z + Math.cos(v.yaw) * back));
    }
    if (v === G.player.vehicle && G.audio.ready) this._skid(v);
    const fx = Math.sin(v.yaw), fz = Math.cos(v.yaw);
    const rx = fz, rz = -fx;
    const mvx = fx * v.speed + rx * v.lat, mvz = fz * v.speed + rz * v.lat;
    const ox = v.pos.x, oz = v.pos.z;
    v.pos.x += mvx * dt;
    v.pos.z += mvz * dt;
    // ground at wheels (suspension)
    const hw = v.halfW * 0.8, hl = v.halfL * 0.75;
    const cz = v.centerZ;
    const hY = v.pos.y + 1.2;
    const gfl = col.ground(era, v.pos.x + fx * (cz + hl) + rx * hw, v.pos.z + fz * (cz + hl) + rz * hw, hY, 0.15).y;
    const gfr = col.ground(era, v.pos.x + fx * (cz + hl) - rx * hw, v.pos.z + fz * (cz + hl) - rz * hw, hY, 0.15).y;
    const gbl = col.ground(era, v.pos.x + fx * (cz - hl) + rx * hw, v.pos.z + fz * (cz - hl) + rz * hw, hY, 0.15).y;
    const gbr = col.ground(era, v.pos.x + fx * (cz - hl) - rx * hw, v.pos.z + fz * (cz - hl) - rz * hw, hY, 0.15).y;
    const valid = [gfl, gfr, gbl, gbr].filter((y) => y > -1e8);
    const gAvg = valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : -1e9;
    const hover = t.hover ? 0.35 + Math.sin(G.time * 3 + v.id) * 0.04 : 0;
    if (v.pos.y > gAvg + hover + 0.05) {
      v.vy -= 22 * dt;
      v.pos.y += v.vy * dt;
      v.air = true;
    }
    if (v.pos.y <= gAvg + hover + 0.05) {
      if (v.air && v.vy < -6) {
        G.audio.play('land', v.pos, clamp(-v.vy / 15, 0.3, 1.2));
        v.suspV -= v.vy * 0.04;
        if (v.vy < -14) v.damage(-v.vy * 1.2);
        if (v === G.player.vehicle) G.cam.shake(clamp(-v.vy / 30, 0, 0.5));
      }
      v.air = false;
      v.pos.y = lerp(v.pos.y, gAvg + hover, Math.min(1, dt * 30));
      v.vy = 0;
    }
    if (gAvg < -1e8) { v.vy -= 22 * dt; v.pos.y += v.vy * dt; }
    if (v.pos.y < -30) { if (v === G.player.vehicle) this.exit(true); v.dead = true; this.remove(v); return; }
    // body tilt from terrain + inertia
    const tp = valid.length === 4 ? Math.atan2(((gfl + gfr) - (gbl + gbr)) / 2, hl * 2) : 0;
    const tr = valid.length === 4 ? Math.atan2(((gfl + gbl) - (gfr + gbr)) / 2, hw * 2) : 0;
    const accel = (v.speed - (v.prevSpeed || 0)) / Math.max(dt, 1e-3);
    v.prevSpeed = v.speed;
    v.pitch = damp(v.pitch, -tp + clamp(-accel * 0.006, -0.06, 0.06), 10, dt);
    v.roll = damp(v.roll, tr + clamp(v.yawRate * v.speed * (t.bike ? -0.05 : 0.008), t.bike ? -0.6 : -0.08, t.bike ? 0.6 : 0.08), 8, dt);
    // spring
    v.suspV += (-v.suspY * 120 - v.suspV * 9) * dt;
    v.suspY += v.suspV * dt;

    // collisions against the static world: test footprint points at body height
    let hit = false, nx = 0, nz = 0;
    for (const [px, pz] of v.corners()) {
      const c = col.pointSolid(era, px, v.pos.y + 0.6, pz) || col.pointSolid(era, px, v.pos.y + 1.0, pz);
      if (c && !(c.flags & CF.WALKONLY)) {
        if (c.topAt(px, pz) < v.pos.y + 0.75) continue; // drive over low stuff (kerbs, debris ramps)
        hit = true;
        // push direction: from the collider centre outwards along the shallow axis
        const dl = px - c.minX, dr = c.maxX - px, db = pz - c.minZ, df = c.maxZ - pz;
        const m = Math.min(dl, dr, db, df);
        if (m === dl) nx -= dl + 0.02; else if (m === dr) nx += dr + 0.02; else if (m === db) nz -= db + 0.02; else nz += df + 0.02;
      }
    }
    if (hit) {
      const nl = Math.hypot(nx, nz) || 1;
      v.pos.x += nx; v.pos.z += nz;
      const impact = Math.abs((mvx * nx + mvz * nz) / nl);
      if (impact > 0.5 || Math.abs(v.speed) > 2) {
        const sp = Math.abs(v.speed);
        if (sp > 5 && G.time - v.lastHit > 0.3) {
          v.lastHit = G.time;
          const dmg = sp * (0.6 + impact * 0.15);
          v.damage(dmg);
          G.audio.play('crash', v.pos, clamp(sp / 25, 0.3, 1.2));
          G.fx && G.fx.sparks(new THREE.Vector3(v.pos.x + fx * v.halfL, v.pos.y + 0.6, v.pos.z + fz * v.halfL), 14);
          if (v === G.player.vehicle) G.cam.shake(clamp(sp / 35, 0.1, 0.7));
          G.events.emit('noise', v.pos, 30, 'crash');
          if (v.driver === 'ai' && v.ai) v.ai.panic = 3;
        }
        v.speed *= -0.25;
        v.lat *= 0.4;
        if (!isFinite(v.pos.x)) { v.pos.x = ox; v.pos.z = oz; }
      }
    }
    // vehicle vs vehicle (two circles each)
    for (const o of this.list) {
      if (o === v || o.era !== v.era || o.id < v.id) continue;
      const dx = o.pos.x - v.pos.x, dz = o.pos.z - v.pos.z;
      const d = Math.hypot(dx, dz);
      const minD = (v.halfW + o.halfW) * 0.9 + 0.5;
      if (d < Math.max(minD, (v.halfL + o.halfL) * 0.55) && d > 1e-3) {
        // refine with circle pairs along each body
        let best = null;
        for (const a of [-0.5, 0.5]) for (const b of [-0.5, 0.5]) {
          const ax = v.pos.x + Math.sin(v.yaw) * (v.centerZ + a * v.halfL), az = v.pos.z + Math.cos(v.yaw) * (v.centerZ + a * v.halfL);
          const bx = o.pos.x + Math.sin(o.yaw) * (o.centerZ + b * o.halfL), bz = o.pos.z + Math.cos(o.yaw) * (o.centerZ + b * o.halfL);
          const dd = Math.hypot(bx - ax, bz - az);
          const rr = v.halfW + o.halfW;
          if (dd < rr && (!best || dd < best.dd)) best = { dd, nx: (bx - ax) / (dd || 1), nz: (bz - az) / (dd || 1), pen: rr - dd };
        }
        if (best) {
          const mv = v.t.mass, mo = o.t.mass, tot = mv + mo;
          v.pos.x -= best.nx * best.pen * (mo / tot); v.pos.z -= best.nz * best.pen * (mo / tot);
          o.pos.x += best.nx * best.pen * (mv / tot); o.pos.z += best.nz * best.pen * (mv / tot);
          const rel = Math.abs(v.speed - o.speed * Math.cos(o.yaw - v.yaw));
          if (rel > 4 && G.time - v.lastHit > 0.4) {
            v.lastHit = o.lastHit = G.time;
            v.damage(rel * 0.8 * (mo / tot) * 2); o.damage(rel * 0.8 * (mv / tot) * 2);
            G.audio.play('crash', v.pos, clamp(rel / 20, 0.3, 1.2));
            G.fx && G.fx.sparks(new THREE.Vector3((v.pos.x + o.pos.x) / 2, v.pos.y + 0.7, (v.pos.z + o.pos.z) / 2), 18);
            G.events.emit('noise', v.pos, 40, 'crash');
            G.events.emit('crash', v, o, rel);
            if (G.player.vehicle === v || G.player.vehicle === o) G.cam.shake(clamp(rel / 30, 0.1, 0.6));
            for (const q of [v, o]) if (q.ai) q.ai.panic = 2.5;
          }
          const transfer = (v.speed * mv - o.speed * mo * Math.cos(o.yaw - v.yaw)) / tot;
          v.speed -= transfer * 0.8;
          o.speed += transfer * 0.8 * Math.cos(o.yaw - v.yaw);
        }
      }
    }
    // vehicles vs pedestrians
    if (Math.abs(v.speed) > 3 && G.crowd) {
      for (const n of G.crowd.npcs) {
        if (!n.alive || n.era !== v.era || n.state === 'dead') continue;
        const dx = n.pos.x - v.pos.x, dz = n.pos.z - v.pos.z;
        if (dx * dx + dz * dz > (v.halfL + 1) ** 2) continue;
        const lz = dx * fx + dz * fz - v.centerZ, lx = dx * fz - dz * fx;
        if (Math.abs(lx) < v.halfW + 0.3 && Math.abs(lz) < v.halfL + 0.3) {
          G.crowd.damage(n, Math.abs(v.speed) * 4, v.pos, 'vehicle');
          n.pos.x += fx * 1.2; n.pos.z += fz * 1.2;
          G.audio.play('punch', n.pos);
          v.speed *= 0.85;
          if (v === G.player.vehicle) G.events.emit('crime', { kind: 'vehicular', pos: n.pos.clone() });
        }
      }
    }
    // the walking player getting hit
    const pl = G.player;
    if (!pl.vehicle && Math.abs(v.speed) > 4 && v !== pl.vehicle) {
      const dx = pl.pos.x - v.pos.x, dz = pl.pos.z - v.pos.z;
      const lz = dx * fx + dz * fz - v.centerZ, lx = dx * fz - dz * fx;
      if (Math.abs(lx) < v.halfW + 0.3 && Math.abs(lz) < v.halfL + 0.3 && pl.pos.y < v.pos.y + 1.5) {
        pl.damage(Math.abs(v.speed) * 2.2, v.pos, 'vehicle');
        pl.vel.set(fx * v.speed * 0.6 + (lx > 0 ? rx : -rx) * 3, 5, fz * v.speed * 0.6);
        pl.state = 'air'; pl.fallStartY = pl.pos.y;
        v.speed *= 0.7;
      }
    }
    // burning wreck
    if (v.burning > 0) {
      v.burning -= dt;
      if (G.fx && Math.random() < 0.5) G.fx.fire(v.pos.clone().setY(v.pos.y + 1));
    } else if (v.health < 35 && !v.dead && G.fx && Math.random() < 0.3) {
      G.fx.smoke(new THREE.Vector3(v.pos.x + fx * (v.model.userData.front - 0.6), v.pos.y + 1.0, v.pos.z + fz * (v.model.userData.front - 0.6)), v.health < 15);
      if (v.health < 15) { v.health -= dt * 2.5; if (v.health <= 0) v.explode(); }
    }
  }

  _visual(v, dt) {
    const m = v.model;
    m.position.set(v.pos.x, v.pos.y + v.suspY, v.pos.z);
    m.rotation.set(0, v.yaw, 0, 'YXZ');
    const body = m.userData.body;
    body.rotation.set(v.pitch, 0, v.roll, 'YXZ');
    v.wheelSpin += (v.speed / v.t.wheelR) * dt;
    for (const w of m.userData.wheels) {
      w.g.rotation.set(v.t.hover ? 0 : v.wheelSpin, w.front ? v.steer : 0, 0, 'YXZ');
    }
    if (m.userData.lightbar) {
      const on = v.siren || (v.driver === 'ai' && v.ai && v.ai.pursuit);
      const ph = Math.floor(G.time * 6) % 2;
      m.userData.lightbar[0].visible = on ? ph === 0 : true;
      m.userData.lightbar[1].visible = on ? ph === 1 : true;
    }
  }

  _skid(v) {
    const a = G.audio;
    if (!this.skidNode) {
      const ctx = a.ctx;
      const src = ctx.createBufferSource(); src.buffer = a.noise; src.loop = true;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1600; f.Q.value = 3;
      const g = ctx.createGain(); g.gain.value = 0;
      src.connect(f); f.connect(g); g.connect(a.sfx); src.start();
      this.skidNode = { g };
    }
    this.skidNode.g.gain.value = damp(this.skidNode.g.gain.value, v.drifting ? 0.25 : 0, 10, 0.016);
  }

  _engineSound(v) {
    const a = G.audio;
    if (!a.ready) return;
    const ctx = a.ctx;
    if (!this.engine) {
      const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700;
      const g = ctx.createGain(); g.gain.value = 0;
      o1.connect(f); o2.connect(f); f.connect(g); g.connect(a.sfx);
      o1.start(); o2.start();
      this.engine = { o1, o2, f, g };
    }
    const e = this.engine;
    const t = v.t;
    const rpm = 0.2 + (Math.abs(v.speed) / t.top) * 0.8 + (v.drifting ? 0.1 : 0);
    const gearRpm = (rpm * 4) % 1 * 0.35 + rpm * 0.65;
    if (t.era === 1 && t.hover) { e.o1.type = 'sine'; e.o2.type = 'triangle'; e.o1.frequency.value = 180 + gearRpm * 500; e.o2.frequency.value = 360 + gearRpm * 900; e.f.frequency.value = 2400; }
    else if (t.era === 1) { e.o1.type = 'sawtooth'; e.o2.type = 'sine'; e.o1.frequency.value = 90 + gearRpm * 260; e.o2.frequency.value = 600 + gearRpm * 1400; e.f.frequency.value = 1800; }
    else { e.o1.type = 'sawtooth'; e.o2.type = 'square'; e.o1.frequency.value = (t.bike ? 70 : 45) + gearRpm * (t.bike ? 160 : 110); e.o2.frequency.value = e.o1.frequency.value * 0.5; e.f.frequency.value = 500 + gearRpm * 900; }
    e.g.gain.value = v.dead ? 0 : 0.07 + rpm * 0.06;
  }
  _stopEngine() {
    if (this.engine) { this.engine.g.gain.value = 0; }
    if (this.skidNode) this.skidNode.g.gain.value = 0;
  }
}

// Traffic signal state shared with the traffic-light shader (30 s cycle)
// returns 2 green, 1 yellow, 0 red for axis 0 (N-S) / 1 (E-W)
export function signalState(axis, time) {
  const c = ((time % 30) + 30) % 30;
  if (axis === 0) return c < 12 ? 2 : c < 15 ? 1 : 0;
  return c < 15 ? 0 : c < 27 ? 2 : 1;
}

export { COUNTERPART };
