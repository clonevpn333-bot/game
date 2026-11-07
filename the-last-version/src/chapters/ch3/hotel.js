// The sixth floor of the Halden Grand: corridor, lobby, guest rooms,
// housekeeping, moldings, sconces, hinged doors, hiding places, nav graph.
import * as THREE from 'three';
import { pbr, preloadSets, model } from '../../engine/assets.js';

export const HOTEL_TEXTURES = ['carpet', 'wallpaper', 'wood_panel', 'ceiling', 'walnut', 'velvet', 'plaster_white', 'parquet', 'marble', 'linen', 'bath_tiles', 'ship_hull', 'ship_deck'];
export const HOTEL_MODELS = ['ArmChair_01', 'ClassicConsole_01', 'ClassicNightstand_01', 'Chandelier_01', 'Television_01', 'vintage_suitcase', 'ornate_mirror_01', 'fancy_picture_frame_01', 'wooden_bookshelf_worn', 'GothicBed_01', 'vintage_telephone_wall_clock', 'wall_clock', 'drawer_cabinet', 'vintage_flashlight', 'WetFloorSign_01'];

const H = 2.9; // ceiling height
export const LAYOUT = {
  corridor: { x0: 0, x1: 62, z0: -1.25, z1: 1.25 },
  lobby: { x0: -8, x1: 0, z0: -3.5, z1: 3.5 },
  rooms: {
    // number: side (-1 south / +1 north), centre x, enterable
    602: { side: -1, x: 6, open: true }, 604: { side: -1, x: 14, open: true }, 606: { side: -1, x: 22 }, 608: { side: -1, x: 30 }, 610: { side: -1, x: 38 }, 612: { side: -1, x: 46 }, 614: { side: -1, x: 54 },
    601: { side: 1, x: 6 }, 603: { side: 1, x: 14 }, 605: { side: 1, x: 22 }, 607: { side: 1, x: 30 }, 609: { side: 1, x: 38, open: true }, 611: { side: 1, x: 46, open: true, hidden: true }, 613: { side: 1, x: 54 },
  },
  roomW: 7.4, roomD: 6.2,
  housekeeping: { x0: 62, x1: 67, z0: -3, z1: 3 },
};

// ---------------------------------------------------------------------------
class Builder {
  constructor() { this.parts = new Map(); }
  acc(key) { if (!this.parts.has(key)) this.parts.set(key, { p: [], n: [], uv: [], i: [] }); return this.parts.get(key); }
  quad(key, a, b, c, d, n, uvs) {
    const A = this.acc(key), base = A.p.length / 3;
    for (const v of [a, b, c, d]) A.p.push(...v);
    for (let k = 0; k < 4; k++) A.n.push(...n);
    for (const u of uvs) A.uv.push(...u);
    A.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  /** Box with metre UVs; faces: which sides to emit {px,nx,py,ny,pz,nz}. */
  box(key, x0, x1, y0, y1, z0, z1, faces = {}) {
    const f = { px: 1, nx: 1, py: 1, ny: 1, pz: 1, nz: 1, ...faces };
    if (f.pz) this.quad(key, [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);
    if (f.nz) this.quad(key, [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], [[-x1, y0], [-x0, y0], [-x0, y1], [-x1, y1]]);
    if (f.px) this.quad(key, [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], [[-z1, y0], [-z0, y0], [-z0, y1], [-z1, y1]]);
    if (f.nx) this.quad(key, [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], [[z0, y0], [z1, y0], [z1, y1], [z0, y1]]);
    if (f.py) this.quad(key, [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], [[x0, z1], [x1, z1], [x1, z0], [x0, z0]]);
    if (f.ny) this.quad(key, [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0], [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]);
  }
  /** A wall segment between (xa,za)-(xb,zb) with thickness, facing normal n (+side). Layered: wainscot, rail, wallpaper, crown, baseboard. */
  wall(xa, za, xb, zb, nx, nz, { skip = [], t = 0.12, both = false } = {}) {
    // build as an axis aligned slab
    const alongX = Math.abs(zb - za) < 1e-6;
    const segs = [[alongX ? Math.min(xa, xb) : Math.min(za, zb), alongX ? Math.max(xa, xb) : Math.max(za, zb)]];
    // carve openings (doors): skip = [[a0,a1,height]]
    let pieces = segs;
    for (const [a0, a1, hgt] of skip) {
      const out = [];
      for (const [s0, s1] of pieces) {
        if (a1 <= s0 || a0 >= s1) { out.push([s0, s1]); continue; }
        if (a0 > s0) out.push([s0, a0]);
        if (a1 < s1) out.push([a1, s1]);
        // lintel above the opening
        this._layer(alongX, Math.max(a0, s0), Math.min(a1, s1), alongX ? za : xa, nx, nz, t, hgt, H, both);
      }
      pieces = out;
    }
    for (const [s0, s1] of pieces) this._layer(alongX, s0, s1, alongX ? za : xa, nx, nz, t, 0, H, both, true);
  }
  _layer(alongX, s0, s1, c, nx, nz, t, y0, y1, both, trims = false) {
    const n = alongX ? nz : nx;
    const face = (key, ya, yb, depth = 0) => {
      // a thin slab on the +n side of the wall line
      const o0 = c + n * (t / 2), o1 = o0 + n * depth;
      const lo = Math.min(o0, o1 + n * 0.001), hi = Math.max(o0, o1 + n * 0.001);
      if (alongX) this.box(key, s0, s1, ya, yb, lo, hi, { py: depth > 0.005 ? 1 : 0, ny: 0, px: depth > 0.005 ? 1 : 0, nx: depth > 0.005 ? 1 : 0, pz: n > 0 ? 1 : 0, nz: n < 0 ? 1 : 0 });
      else this.box(key, lo, hi, ya, yb, s0, s1, { py: depth > 0.005 ? 1 : 0, ny: 0, pz: depth > 0.005 ? 1 : 0, nz: depth > 0.005 ? 1 : 0, px: n > 0 ? 1 : 0, nx: n < 0 ? 1 : 0 });
    };
    const ya = Math.max(y0, 0), yb = y1;
    if (ya < 1.0) face('wainscot', ya, Math.min(1.0, yb), 0.015);
    if (yb > 1.0) face('wallpaper', Math.max(1.0, ya), yb, 0.0);
    if (trims) {
      face('trim', 0, 0.16, 0.03);            // baseboard
      face('trim', 0.98, 1.06, 0.035);        // chair rail
      face('trim', H - 0.14, H, 0.06);        // crown
    }
    // structural core so the wall reads thick at openings
    if (alongX) this.box('core', s0, s1, y0, y1, c - t / 2, c + t / 2, { pz: 0, nz: 0, py: 0, ny: 0 }); else this.box('core', c - t / 2, c + t / 2, y0, y1, s0, s1, { px: 0, nx: 0, py: 0, ny: 0 });
  }
  meshes(materials) {
    const out = [];
    for (const [k, A] of this.parts) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(A.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(A.n, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(A.uv, 2)); g.setIndex(A.i);
      const m = new THREE.Mesh(g, materials[k] || materials.core); m.receiveShadow = true; m.castShadow = k !== 'floor' && k !== 'ceiling';
      m.name = k; out.push(m);
    }
    return out;
  }
}

// ---------------------------------------------------------------------------
function plaqueTexture(text) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, '#c9a45a'); gr.addColorStop(0.5, '#f0d690'); gr.addColorStop(1, '#8a6a30');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 128); g.strokeStyle = '#5a4520'; g.lineWidth = 6; g.strokeRect(6, 6, 244, 116);
  g.fillStyle = '#2a1e0c'; g.font = 'bold 74px Cormorant Garamond, Georgia, serif'; g.textAlign = 'center'; g.fillText(text, 128, 90);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function paintingTexture(kind) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 384; const g = c.getContext('2d');
  if (kind === 'ship') {
    const sky = g.createLinearGradient(0, 0, 0, 384); sky.addColorStop(0, '#2a3440'); sky.addColorStop(0.6, '#5a6a6a'); sky.addColorStop(1, '#1a2a30'); g.fillStyle = sky; g.fillRect(0, 0, 512, 384);
    g.fillStyle = '#16202a'; g.beginPath(); g.moveTo(80, 260); g.lineTo(430, 250); g.lineTo(400, 300); g.lineTo(110, 305); g.fill();
    g.fillStyle = '#d8d4c8'; g.fillRect(220, 200, 90, 50); g.fillRect(240, 170, 50, 30);
    for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(200,220,230,${Math.random() * 0.15})`; g.fillRect(Math.random() * 512, 280 + Math.random() * 104, 30, 2); }
  } else if (kind === 'family') {
    g.fillStyle = '#c9b48a'; g.fillRect(0, 0, 512, 384);
    const fig = (x, h, col) => { g.fillStyle = col; g.beginPath(); g.arc(x, 384 - h - 30, 26, 0, 7); g.fill(); g.fillRect(x - 30, 384 - h, 60, h); };
    fig(160, 190, '#3a3a40'); fig(300, 210, '#5a4a3a'); fig(232, 110, '#a85a4a');
    g.fillStyle = 'rgba(80,60,40,0.4)'; g.fillRect(0, 0, 512, 384);
  } else {
    const sky = g.createLinearGradient(0, 0, 0, 384); sky.addColorStop(0, '#7a8aa0'); sky.addColorStop(1, '#c9b07a'); g.fillStyle = sky; g.fillRect(0, 0, 512, 384);
    g.fillStyle = '#3a4a30'; g.beginPath(); g.moveTo(0, 300); for (let x = 0; x <= 512; x += 32) g.lineTo(x, 260 + Math.sin(x * 0.02) * 30); g.lineTo(512, 384); g.lineTo(0, 384); g.fill();
    g.fillStyle = '#5a5248'; g.fillRect(330, 160, 60, 110); g.fillRect(320, 150, 80, 14);
  }
  // varnish crackle
  g.strokeStyle = 'rgba(30,20,10,0.15)'; for (let i = 0; i < 80; i++) { g.beginPath(); let x = Math.random() * 512, y = Math.random() * 384; g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (Math.random() - 0.5) * 30; y += (Math.random() - 0.5) * 30; g.lineTo(x, y); } g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---------------------------------------------------------------------------
export class Door {
  constructor({ pos, along, side, width = 0.95, number, mat, frameMat, brass, locked = false, keycard = false, swingSign = 1 }) {
    // hinge at one edge; the slab swings into the room (away from the corridor)
    this.group = new THREE.Group();
    this.pivot = new THREE.Group(); this.group.add(this.pivot);
    this.width = width; this.locked = locked; this.keycard = keycard;
    this.angle = 0; this.vel = 0; this.min = 0; this.max = 1.75; this.number = number;
    const slab = new THREE.Mesh(new THREE.BoxGeometry(width, 2.12, 0.05), mat);
    slab.position.set(width / 2, 1.06, 0); slab.castShadow = slab.receiveShadow = true; this.pivot.add(slab);
    // raised panels (two per face)
    for (const zz of [0.03, -0.03]) for (const [py, ph] of [[1.55, 0.7], [0.62, 0.8]]) { const p = new THREE.Mesh(new THREE.BoxGeometry(width - 0.24, ph, 0.012), mat); p.position.set(width / 2, py, zz); this.pivot.add(p); }
    // lever handle + escutcheon + keycard lock
    for (const zz of [0.045, -0.045]) {
      const esc = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.012), brass); esc.position.set(width - 0.09, 1.0, zz); this.pivot.add(esc);
      const lever = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.13, 8), brass); lever.rotation.z = Math.PI / 2; lever.position.set(width - 0.14, 1.04, zz * 1.4); this.pivot.add(lever);
    }
    if (keycard || number) {
      const reader = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.12, 0.025), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4 }));
      reader.position.set(width - 0.09, 1.18, 0.05); this.pivot.add(reader);
      this.led = new THREE.Mesh(new THREE.SphereGeometry(0.006, 6, 4), new THREE.MeshStandardMaterial({ color: 0x200000, emissive: locked ? 0xff2020 : 0x20ff40, emissiveIntensity: 3 }));
      this.led.position.set(width - 0.09, 1.22, 0.064); this.pivot.add(this.led);
    }
    if (number) {
      const plaque = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.1), new THREE.MeshStandardMaterial({ map: plaqueTexture(String(number)), metalness: 0.6, roughness: 0.35 }));
      plaque.position.set(width / 2, 1.62, 0.032); this.pivot.add(plaque); this.plaque = plaque;
      const peep = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.07, 8), brass); peep.rotation.x = Math.PI / 2; peep.position.set(width / 2, 1.5, 0); this.pivot.add(peep);
    }
    // frame + casing
    for (const sx of [-0.06, width + 0.06]) { const j = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.22, 0.2), frameMat); j.position.set(sx, 1.11, 0); this.group.add(j); }
    const head = new THREE.Mesh(new THREE.BoxGeometry(width + 0.22, 0.12, 0.2), frameMat); head.position.set(width / 2, 2.2, 0); this.group.add(head);
    // orient: `along` = 'x' walls run along x; side = which way the room is (+1 +z / -1 -z)
    this.group.position.copy(pos);
    if (along === 'x') this.group.rotation.y = side > 0 ? 0 : Math.PI;
    else this.group.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    this.swing = swingSign; // positive angle opens into the room
    this.slab = slab;
    this.group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  }
  /** Torque-driven hinge with damping, hard stops and slam detection. Returns slam speed. */
  update(dt) {
    this.vel *= Math.exp(-dt * 2.4);
    this.angle += this.vel * dt;
    let slam = 0;
    if (this.angle < this.min) { slam = Math.abs(this.vel); this.angle = this.min; this.vel = -this.vel * 0.15; }
    if (this.angle > this.max) { slam = Math.abs(this.vel) * 0.6; this.angle = this.max; this.vel = -this.vel * 0.2; }
    this.pivot.rotation.y = -this.angle * this.swing;
    return slam;
  }
  get isOpen() { return this.angle > 0.9; }
  hingeWorld() { return this.group.getWorldPosition(new THREE.Vector3()); }
}

// ---------------------------------------------------------------------------
export async function buildHotel(scene) {
  await preloadSets(HOTEL_TEXTURES);
  const models = {};
  await Promise.all(HOTEL_MODELS.map(async (id) => (models[id] = await model(id))));
  const root = new THREE.Group(); scene.add(root);
  const B = new Builder();
  const { corridor: C, lobby: L, rooms, roomW, roomD, housekeeping: HK } = LAYOUT;
  const mats = {
    floor: pbr('carpet', { size: 2.2, color: 0x9a6a62 }),
    roomFloor: pbr('parquet', { size: 1.6, color: 0xb59a80 }),
    lobbyFloor: pbr('marble', { size: 2.5, roughness: 0.6 }),
    ceiling: pbr('ceiling', { size: 3, color: 0xd8d2c6 }),
    wallpaper: pbr('wallpaper', { size: 1.4, color: 0xc8b8a0 }),
    wainscot: pbr('wood_panel', { size: 1.2, color: 0x8a6650 }),
    trim: pbr('walnut', { size: 1, color: 0x6a4c38, roughness: 0.6 }),
    core: pbr('plaster_white', { size: 2, color: 0x8a8278 }),
    hkWall: pbr('bath_tiles', { size: 1.2 }),
  };
  mats.floor.userData.base = mats.floor.color.clone();
  // ship materials for the opening morph (corridor starts as the Meridian's passageway)
  mats.shipWall = pbr('ship_hull', { size: 2, color: 0x8a9496, metal: true, roughness: 0.7 });
  mats.shipFloor = pbr('ship_deck', { size: 2, color: 0x6a7470, metal: true });

  // floors & ceilings
  B.box('floor', C.x0 - 0.1, C.x1 + 0.1, -0.1, 0, C.z0, C.z1, { ny: 0, px: 0, nx: 0, pz: 0, nz: 0 });
  B.box('ceiling', C.x0 - 0.1, C.x1 + 0.1, H, H + 0.1, C.z0, C.z1, { py: 0, px: 0, nx: 0, pz: 0, nz: 0, ny: 1 });
  B.box('lobbyFloor', L.x0, L.x1, -0.1, 0, L.z0, L.z1, { ny: 0, px: 0, nx: 0, pz: 0, nz: 0 });
  B.box('ceiling', L.x0, L.x1, H + 0.6, H + 0.7, L.z0, L.z1, { py: 0, px: 0, nx: 0, pz: 0, nz: 0, ny: 1 });
  // corridor walls with door openings
  const doorW = 0.95;
  const south = [], north = [];
  for (const [num, r] of Object.entries(rooms)) {
    const op = [r.x - roomW / 2 + 0.8, r.x - roomW / 2 + 0.8 + doorW + 0.02, 2.2];
    (r.side < 0 ? south : north).push({ num: +num, r, op });
  }
  B.wall(C.x0, C.z0, C.x1, C.z0, 0, 1, { skip: south.map((d) => d.op) });           // south wall faces +z (into corridor)
  B.wall(C.x0, C.z1, C.x1, C.z1, 0, -1, { skip: north.filter((d) => !d.r.hidden).map((d) => d.op).concat([[59.4, 60.4, 2.2]]) });
  // east end wall with the housekeeping door
  B.wall(C.x1, C.z0, C.x1, C.z1, -1, 0, { skip: [[-0.48, 0.48, 2.2]] });
  // lobby walls
  B.wall(L.x0, L.z0, L.x1, L.z0, 0, 1); B.wall(L.x0, L.z1, L.x1, L.z1, 0, -1); B.wall(L.x0, L.z0, L.x0, L.z1, 1, 0, { skip: [[-0.9, 0.9, 2.4]] });
  B.wall(L.x1, L.z0, L.x1, C.z0, -1, 0); B.wall(L.x1, C.z1, L.x1, L.z1, -1, 0);

  const colliders = [];
  const solid = (x0, x1, z0, z1, tag) => colliders.push({ minX: Math.min(x0, x1), maxX: Math.max(x0, x1), minZ: Math.min(z0, z1), maxZ: Math.max(z0, z1), tag });
  // corridor wall colliders (with door gaps)
  const wallCol = (zLine, list) => { let x = C.x0; for (const d of list.sort((a, b) => a.op[0] - b.op[0])) { if (d.r.hidden) continue; solid(x, d.op[0], zLine - 0.08, zLine + 0.08); x = d.op[1]; } solid(x, C.x1 + 0.2, zLine - 0.08, zLine + 0.08); };
  wallCol(C.z0, south); wallCol(C.z1, north);
  solid(C.x1, C.x1 + 0.15, C.z0, -0.48); solid(C.x1, C.x1 + 0.15, 0.48, C.z1);
  solid(L.x0, L.x1, L.z0 - 0.1, L.z0); solid(L.x0, L.x1, L.z1, L.z1 + 0.1); solid(L.x0 - 0.1, L.x0, L.z0, L.z1);
  solid(L.x1 - 0.06, L.x1 + 0.06, L.z0, C.z0); solid(L.x1 - 0.06, L.x1 + 0.06, C.z1, L.z1);
  // the hidden 611: a wall section covering the opening until rewritten
  const hidden = north.find((d) => d.r.hidden);
  const hiddenWall = new THREE.Group();
  {
    const hb = new Builder();
    hb.wall(hidden.op[0] - 0.02, C.z1, hidden.op[1] + 0.02, C.z1, 0, -1);
    hb.meshes(mats).forEach((m) => hiddenWall.add(m));
    root.add(hiddenWall);
  }
  const hiddenCol = { minX: hidden.op[0], maxX: hidden.op[1], minZ: C.z1 - 0.08, maxZ: C.z1 + 0.08, tag: 'hidden611' };
  colliders.push(hiddenCol);

  // rooms (enterable) — shells with their own floor/ceiling/walls
  const roomInfo = {};
  for (const [num, r] of Object.entries(rooms)) {
    const zIn = r.side < 0 ? C.z0 : C.z1, zOut = zIn + r.side * roomD;
    const x0 = r.x - roomW / 2, x1 = r.x + roomW / 2;
    roomInfo[num] = { x0, x1, z0: Math.min(zIn, zOut), z1: Math.max(zIn, zOut), side: r.side, x: r.x, open: !!r.open, door: null };
    if (!r.open) continue;
    B.box('roomFloor', x0, x1, -0.1, 0, Math.min(zIn, zOut), Math.max(zIn, zOut), { ny: 0, px: 0, nx: 0, pz: 0, nz: 0 });
    B.box('ceiling', x0, x1, H, H + 0.1, Math.min(zIn, zOut), Math.max(zIn, zOut), { py: 0, px: 0, nx: 0, pz: 0, nz: 0, ny: 1 });
    B.wall(x0, zIn, x0, zOut, 1, 0); B.wall(x1, zIn, x1, zOut, -1, 0);
    // outer wall with a window opening
    B.wall(x0, zOut, x1, zOut, 0, -r.side, { skip: [[r.x - 0.9, r.x + 0.9, 2.4]] });
    // window sill/void filler (below/above window)
    B.box('wainscot', r.x - 0.9, r.x + 0.9, 0, 0.8, Math.min(zOut, zOut - r.side * 0.12), Math.max(zOut, zOut - r.side * 0.12));
    solid(x0 - 0.08, x0 + 0.08, Math.min(zIn, zOut), Math.max(zIn, zOut)); solid(x1 - 0.08, x1 + 0.08, Math.min(zIn, zOut), Math.max(zIn, zOut));
    solid(x0, x1, zOut - 0.1, zOut + 0.1);
  }
  // corridor-side walls of the closed rooms read as walls already; their doors are locked props.

  // housekeeping closet
  B.box('floor', HK.x0, HK.x1, -0.1, 0, HK.z0, HK.z1, { ny: 0, px: 0, nx: 0, pz: 0, nz: 0 });
  B.box('ceiling', HK.x0, HK.x1, H, H + 0.1, HK.z0, HK.z1, { py: 0, px: 0, nx: 0, pz: 0, nz: 0, ny: 1 });
  B.box('hkWall', HK.x0, HK.x1, 0, H, HK.z0 - 0.1, HK.z0, { pz: 1, nz: 0, py: 0, ny: 0, px: 0, nx: 0 });
  B.box('hkWall', HK.x0, HK.x1, 0, H, HK.z1, HK.z1 + 0.1, { pz: 0, nz: 1, py: 0, ny: 0, px: 0, nx: 0 });
  B.box('hkWall', HK.x1, HK.x1 + 0.1, 0, H, HK.z0, HK.z1, { px: 0, nx: 1, py: 0, ny: 0, pz: 0, nz: 0 });
  B.box('hkWall', HK.x0 + 0.01, HK.x0 + 0.12, 0, H, HK.z0, -0.48, { px: 1, nx: 0, py: 0, ny: 0, pz: 0, nz: 0 });
  B.box('hkWall', HK.x0 + 0.01, HK.x0 + 0.12, 0, H, 0.48, HK.z1, { px: 1, nx: 0, py: 0, ny: 0, pz: 0, nz: 0 });
  solid(HK.x0, HK.x1, HK.z0 - 0.15, HK.z0); solid(HK.x0, HK.x1, HK.z1, HK.z1 + 0.15); solid(HK.x1, HK.x1 + 0.15, HK.z0, HK.z1);

  const shell = B.meshes(mats);
  shell.forEach((m) => root.add(m));

  // ---------------- doors
  const brass = new THREE.MeshStandardMaterial({ color: 0xc9a14a, metalness: 1, roughness: 0.32 });
  const doorMat = pbr('walnut', { size: 1.2, color: 0x7a5440, roughness: 0.55 });
  const frameMat = pbr('walnut', { size: 1, color: 0x4a3428, roughness: 0.6 });
  const doors = [];
  for (const d of [...south, ...north]) {
    const zLine = d.r.side < 0 ? C.z0 : C.z1;
    const door = new Door({ pos: new THREE.Vector3(d.r.side < 0 ? d.op[1] - 0.01 : d.op[0] + 0.01, 0, zLine), along: 'x', side: d.r.side, number: d.num, mat: doorMat, frameMat, brass, locked: !d.r.open });
    // hinge side: rotate so slabs line up with the opening
    door.group.rotation.y = d.r.side < 0 ? Math.PI : 0;
    door.group.position.set(d.r.side < 0 ? d.op[1] - 0.01 : d.op[0] + 0.01, 0, zLine);
    door.swing = -1;
    if (d.r.hidden) door.group.visible = false;
    root.add(door.group); doors.push(door); roomInfo[d.num].door = door;
  }
  const hkDoor = new Door({ pos: new THREE.Vector3(C.x1, 0, 0.48), along: 'z', side: 1, number: null, mat: pbr('walnut', { size: 1, color: 0x5a5a58 }), frameMat, brass, locked: true, keycard: true });
  hkDoor.group.rotation.y = Math.PI / 2; hkDoor.swing = -1; hkDoor.isHK = true;
  root.add(hkDoor.group); doors.push(hkDoor);
  // stairwell (chained shut)
  const stair = new Door({ pos: new THREE.Vector3(59.4, 0, C.z1), along: 'x', side: 1, mat: pbr('walnut', { size: 1, color: 0x6a6a64 }), frameMat, brass, locked: true });
  stair.group.rotation.y = 0; stair.swing = -1; stair.stair = true; root.add(stair.group); doors.push(stair);
  const exitTex = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 96; const g = c.getContext('2d'); g.fillStyle = '#062a12'; g.fillRect(0, 0, 256, 96); g.fillStyle = '#5aff8a'; g.font = 'bold 64px sans-serif'; g.textAlign = 'center'; g.fillText('EXIT', 128, 72); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const exitSign = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.06), [null, null, null, null, new THREE.MeshStandardMaterial({ map: exitTex, emissiveMap: exitTex, emissive: 0xffffff, emissiveIntensity: 1.6 }), new THREE.MeshStandardMaterial({ color: 0x111111 })].map((m) => m || new THREE.MeshStandardMaterial({ color: 0x111111 })));
  exitSign.position.set(59.9, 2.55, C.z1 - 0.06); exitSign.rotation.y = Math.PI; root.add(exitSign);
  const chain = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.02, 6, 20), new THREE.MeshStandardMaterial({ color: 0x6a6a6a, metalness: 1, roughness: 0.4 })); chain.position.set(59.9, 1.05, C.z1 - 0.08); chain.scale.y = 0.4; root.add(chain);

  // ---------------- lighting: sconces (emissive + a few real lights), lobby chandelier
  const sconces = [];
  const shadeMat = new THREE.MeshStandardMaterial({ color: 0x2a1a10, emissive: 0xffb36a, emissiveIntensity: 1.8, roughness: 0.6 });
  for (let x = 3; x < C.x1; x += 8) for (const side of [-1, 1]) {
    const z = side < 0 ? C.z0 + 0.07 : C.z1 - 0.07;
    if (side > 0 && Math.abs(x - 46) < 1.5) continue;
    const g = new THREE.Group();
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 12), brass); plate.rotation.x = Math.PI / 2; g.add(plate);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.16, 6), brass); arm.rotation.x = Math.PI / 2; arm.position.z = 0.08; g.add(arm);
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.11, 0.16, 16, 1, true), shadeMat.clone()); shade.position.set(0, 0.05, 0.16); shade.material.side = THREE.DoubleSide; g.add(shade);
    g.position.set(x, 1.95, z); g.rotation.y = side < 0 ? 0 : Math.PI;
    root.add(g);
    sconces.push({ g, shade, x, z, on: true, flicker: Math.random() < 0.3 });
  }
  const lights = [];
  for (let i = 0; i < 7; i++) { const l = new THREE.PointLight(0xffa860, 0, 9, 2); root.add(l); lights.push(l); }
  const chand = models.Chandelier_01.clone(); chand.position.set(-4, H + 0.6 - 0.85, 0); root.add(chand);
  const chandLight = new THREE.PointLight(0xffc488, 0, 10, 2); chandLight.position.set(-4, 2.6, 0); root.add(chandLight);

  // ---------------- furniture & props
  const place = (id, x, y, z, ry = 0, s = 1, target = root) => { const o = models[id].clone(); o.position.set(x, y, z); o.rotation.y = ry; o.scale.setScalar(s); target.add(o); return o; };
  // lobby
  place('ClassicConsole_01', -7.5, 0, 0, Math.PI / 2); place('ornate_mirror_01', -7.92, 1.2, 0, Math.PI / 2, 1.2);
  place('ArmChair_01', -6.4, 0, -2.6, 0.3); place('ArmChair_01', -6.4, 0, 2.6, Math.PI - 0.3);
  place('wall_clock', -2, 2.1, L.z1 - 0.08, Math.PI);
  // elevator doors (lobby west wall)
  const elev = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: 0x9a948a, metalness: 1, roughness: 0.25 });
  for (const sz of [-0.46, 0.46]) { const d = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.3, 0.9), steel); d.position.set(L.x0 + 0.08, 1.15, sz); elev.add(d); }
  const elevFrame = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.6, 2.2), brass); elevFrame.position.set(L.x0 + 0.04, 1.3, 0); elevFrame.scale.set(1, 1, 1); root.add(elevFrame); root.add(elev);
  const elevInd = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.12), new THREE.MeshStandardMaterial({ color: 0, emissive: 0xff8a30, emissiveIntensity: 1.2 })); elevInd.position.set(L.x0 + 0.13, 2.75, 0); elevInd.rotation.y = Math.PI / 2; root.add(elevInd);
  // corridor: paintings, consoles, the 611 painting
  const paintings = [];
  const frameTpl = models.fancy_picture_frame_01;
  const addPainting = (x, z, ry, kind, scale = 1.6) => {
    const g = new THREE.Group();
    const f = frameTpl.clone(); f.scale.setScalar(scale); g.add(f);
    const canvasM = new THREE.Mesh(new THREE.PlaneGeometry(0.52 * scale, 0.38 * scale), new THREE.MeshStandardMaterial({ map: paintingTexture(kind), roughness: 0.55 }));
    canvasM.position.z = 0.008 * scale; g.add(canvasM);
    g.position.set(x, 1.6, z); g.rotation.y = ry; root.add(g); paintings.push(g);
    return g;
  };
  addPainting(10, C.z1 - 0.03, Math.PI, 'landscape');
  addPainting(26, C.z0 + 0.03, 0, 'ship');
  const bigPainting = addPainting(46.4, C.z1 - 0.04, Math.PI, 'family', 2.6);
  place('ClassicConsole_01', 26, 0, C.z1 - 0.32, Math.PI, 0.85);
  place('WetFloorSign_01', 33, 0, 0.3, 0.7);
  // housekeeping cart (with the keycard) in the corridor near 612
  const cart = new THREE.Group();
  const cartMat = new THREE.MeshStandardMaterial({ color: 0x3a3532, roughness: 0.6, metalness: 0.4 });
  const cartBody = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 0.55), cartMat); cartBody.position.y = 0.6; cart.add(cartBody);
  const towels = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 0.4), pbr('linen', { size: 0.5, color: 0xe8e4dc })); towels.position.set(-0.25, 1.17, 0); cart.add(towels);
  const bag = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.22, 0.7, 12), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 })); bag.position.set(0.85, 0.5, 0); cart.add(bag);
  for (const [x, z] of [[-0.5, -0.22], [0.5, -0.22], [-0.5, 0.22], [0.5, 0.22]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 10), cartMat); w.rotation.x = Math.PI / 2; w.position.set(x, 0.06, z); cart.add(w); }
  const keycard = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.004, 0.054), new THREE.MeshStandardMaterial({ color: 0xd8c27a, metalness: 0.5, roughness: 0.3, emissive: 0x302000 }));
  keycard.position.set(0.3, 1.06, 0.05); keycard.rotation.y = 0.4; cart.add(keycard);
  cart.position.set(52, 0, -0.55); root.add(cart);
  solid(51.4, 53.4, -0.85, -0.25);
  // breaker panel in housekeeping
  const panel = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.8, 0.6), new THREE.MeshStandardMaterial({ color: 0x7a7a72, metalness: 0.6, roughness: 0.5 })); panel.add(box);
  const lever = new THREE.Group(); lever.position.set(-0.08, 0, 0);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.04), new THREE.MeshStandardMaterial({ color: 0xb02a1a, roughness: 0.5 })); handle.position.y = 0.15; lever.add(handle); lever.rotation.z = -0.8; panel.add(lever);
  panel.position.set(HK.x1 - 0.08, 1.3, 1.6); root.add(panel);
  const shelf = place('wooden_bookshelf_worn', 64.5, 0, HK.z0 + 0.35, 0, 0.9);

  // ---------------- room interiors
  const hides = [];
  const roomProps = {};
  const furnishRoom = (num, kind) => {
    const R = roomInfo[num], s = R.side, inner = s < 0 ? R.z0 : R.z1; // outer wall z
    const midZ = (R.z0 + R.z1) / 2;
    const g = new THREE.Group(); root.add(g);
    const bed = place('GothicBed_01', R.x + 1.1, 0, inner - s * 1.25, s < 0 ? 0 : Math.PI, 1, g);
    solid(R.x + 0.35, R.x + 1.85, Math.min(inner - s * 0.2, inner - s * 2.3), Math.max(inner - s * 0.2, inner - s * 2.3));
    place('ClassicNightstand_01', R.x - 0.15, 0, inner - s * 0.32, s < 0 ? 0 : Math.PI, 1, g);
    const lamp = new THREE.PointLight(0xffb070, 0, 5, 2); lamp.position.set(R.x - 0.15, 0.95, inner - s * 0.35); g.add(lamp);
    const lampShade = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 0.2, 14, 1, true), shadeMat.clone()); lampShade.position.set(R.x - 0.15, 0.9, inner - s * 0.32); lampShade.material.side = THREE.DoubleSide; lampShade.material.emissiveIntensity = 0; g.add(lampShade);
    place('Television_01', R.x + 1.1, 0.75, midZ + s * 1.55 - s * 0.3, s < 0 ? Math.PI : 0, 1, g);
    place('drawer_cabinet', R.x + 1.1, 0, R.z0 + (s < 0 ? R.z1 - R.z0 - 0.0 : 0) + (s < 0 ? -0.0 : 0) + (s < 0 ? -0.3 : 0.3) * 0 + (s < 0 ? (R.z1 - 0.32) - R.z0 : 0.32), s < 0 ? Math.PI : 0, 0.75, g);
    // wardrobe (hiding place) against the side wall
    const wx = R.x0 + 0.38, wz = midZ;
    const wardrobe = new THREE.Group(); wardrobe.position.set(wx, 0, wz); g.add(wardrobe);
    const wood = pbr('walnut', { size: 1, color: 0x6a4a36 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.1, 1.3), wood); body.position.y = 1.05; wardrobe.add(body);
    const crown = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.1, 1.4), wood); crown.position.y = 2.12; wardrobe.add(crown);
    // louvred doors
    const louver = new THREE.MeshStandardMaterial({ color: 0x5a3e2e, roughness: 0.6 });
    for (const dz of [-0.32, 0.32]) { const dr = new THREE.Group(); for (let k = 0; k < 14; k++) { const sl = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.6), louver); sl.position.set(0.31, 0.35 + k * 0.11, dz); sl.rotation.z = 0.5; dr.add(sl); } wardrobe.add(dr); }
    solid(wx - 0.3, wx + 0.3, wz - 0.65, wz + 0.65);
    hides.push({ room: num, kind: 'wardrobe', pos: new THREE.Vector3(wx + 0.75, 0, wz), inside: new THREE.Vector3(wx, 1.55, wz), look: new THREE.Vector3(wx + 3, 1.4, wz), group: wardrobe });
    // under the bed
    hides.push({ room: num, kind: 'bed', pos: new THREE.Vector3(R.x + 1.1, 0, inner - s * 2.6), inside: new THREE.Vector3(R.x + 1.1, 0.22, inner - s * 1.3), look: new THREE.Vector3(R.x + 1.1, 0.1, midZ - s * 3), group: bed });
    // window: rain on glass with lightning beyond, curtains
    const outerZ = inner;
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.6), new THREE.MeshPhysicalMaterial({ color: 0x0a1418, roughness: 0.08, transmission: 0.0, metalness: 0.1, transparent: true, opacity: 0.35 }));
    glass.position.set(R.x, 1.6, outerZ); glass.rotation.y = s < 0 ? 0 : Math.PI; g.add(glass);
    const night = new THREE.Mesh(new THREE.PlaneGeometry(3, 2.4), new THREE.MeshBasicMaterial({ color: 0x050a10 }));
    night.position.set(R.x, 1.6, outerZ + s * 0.6); night.rotation.y = s < 0 ? 0 : Math.PI; g.add(night);
    const curtainMat = pbr('velvet', { size: 1, color: 0x6a1a1a, side: THREE.DoubleSide });
    for (const cx of [-1.1, 1.1]) {
      const cg = new THREE.PlaneGeometry(0.7, 2.6, 12, 1); const p = cg.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 22) * 0.05);
      cg.computeVertexNormals();
      const cu = new THREE.Mesh(cg, curtainMat); cu.position.set(R.x + cx, 1.5, outerZ - s * 0.12); cu.rotation.y = s < 0 ? 0 : Math.PI; g.add(cu);
    }
    roomProps[num] = { group: g, lamp, lampShade, night };
    return g;
  };
  furnishRoom(602); furnishRoom(604); furnishRoom(609);
  // flashlight on 602's nightstand
  const fl = models.vintage_flashlight.clone(); fl.scale.setScalar(0.9);
  const r602 = roomInfo[602]; fl.position.set(r602.x - 0.15, 0.72, r602.z0 + 0.4); fl.rotation.set(0, 1.2, Math.PI / 2); root.add(fl);
  // phone in 604
  const phone = models.vintage_telephone_wall_clock.clone(); const r604 = roomInfo[604]; phone.position.set(r604.x + 2.6, 1.2, r604.z0 + 0.08); root.add(phone);
  // Venn's journal + family photo in 609
  const r609 = roomInfo[609];
  const journal = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.3), new THREE.MeshStandardMaterial({ color: 0x3a1e14, roughness: 0.7 })); journal.position.set(r609.x - 0.15, 0.72, r609.z1 - 0.35); root.add(journal);
  const photo = addPainting(r609.x + 2.8, 1.5, Math.PI / 2, 'family', 0.6); photo.position.set(r609.x0 + 0.05, 1.5, (r609.z0 + r609.z1) / 2 + 1.6); photo.rotation.y = Math.PI / 2;
  place('vintage_suitcase', r609.x + 2.6, 0, r609.z1 - 0.6, 0.3, 0.6);
  // 611: Lia's room — a child's room from a version that was never built
  const r611 = roomInfo[611];
  const lia = new THREE.Group(); root.add(lia); lia.visible = false;
  {
    const bed = models.GothicBed_01.clone(); bed.scale.set(0.7, 0.8, 0.75); bed.position.set(r611.x + 1.5, 0, r611.z1 - 1.0); bed.rotation.y = Math.PI; lia.add(bed);
    const quilt = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.1, 1.4), new THREE.MeshStandardMaterial({ color: 0xd9a86a, roughness: 0.9 })); quilt.position.set(r611.x + 1.5, 0.52, r611.z1 - 1.1); lia.add(quilt);
    // drawings pinned to the wall: rings, a ship, a house, three figures
    const drawings = ['rings', 'ship', 'house', 'family'];
    drawings.forEach((k, i) => {
      const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#f2ecdc'; g.fillRect(0, 0, 256, 256);
      g.lineWidth = 6; g.lineCap = 'round';
      const col = ['#2a6ad8', '#d83a2a', '#2aa84a', '#e8a01a'][i]; g.strokeStyle = col;
      if (k === 'rings') { for (let r = 30; r < 120; r += 24) { g.beginPath(); g.arc(128, 128, r, 0, 7); g.stroke(); } g.fillStyle = '#222'; g.font = '28px Comic Sans MS, cursive'; g.fillText('MUMS MACHINE', 20, 240); }
      if (k === 'ship') { g.beginPath(); g.moveTo(30, 170); g.lineTo(226, 170); g.lineTo(200, 210); g.lineTo(56, 210); g.closePath(); g.stroke(); g.strokeRect(100, 120, 60, 50); for (let x = 0; x < 256; x += 30) { g.beginPath(); g.arc(x, 225, 15, Math.PI, 0); g.stroke(); } }
      if (k === 'house') { g.strokeRect(60, 110, 136, 110); g.beginPath(); g.moveTo(50, 115); g.lineTo(128, 40); g.lineTo(206, 115); g.stroke(); g.fillStyle = '#222'; g.font = '30px cursive'; g.fillText('611', 100, 180); }
      if (k === 'family') { for (const [x, h] of [[70, 120], [186, 130], [128, 80]]) { g.beginPath(); g.arc(x, 220 - h, 16, 0, 7); g.stroke(); g.beginPath(); g.moveTo(x, 236 - h); g.lineTo(x, 236 - h + 60); g.stroke(); } g.fillStyle = '#222'; g.font = '26px cursive'; g.fillText('ME  MUM  DAD', 50, 250); }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }));
      m.position.set(r611.x0 + 0.07, 1.3 + (i % 2) * 0.5, r611.z0 + 1.2 + i * 0.7); m.rotation.y = Math.PI / 2; m.rotation.z = (Math.random() - 0.5) * 0.15; lia.add(m);
    });
    // the impossible doorway: a free-standing frame, full of daylight from another world
    const portal = new THREE.Group(); portal.position.set(r611.x - 1.2, 0, (r611.z0 + r611.z1) / 2 + 0.6); portal.rotation.y = Math.PI / 2;
    const stone = new THREE.MeshStandardMaterial({ color: 0x8a8070, roughness: 0.95 });
    for (const sx of [-0.65, 0.65]) { const j = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.6, 0.4), stone); j.position.set(sx, 1.3, 0); portal.add(j); }
    const arch = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.16, 8, 20, Math.PI), stone); arch.position.y = 2.6; portal.add(arch);
    const lightPlane = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 3.1), new THREE.MeshBasicMaterial({ map: (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 256; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#fff8e0'); gr.addColorStop(0.6, '#ffe2a0'); gr.addColorStop(0.62, '#8aa060'); gr.addColorStop(1, '#5a7040'); g.fillStyle = gr; g.fillRect(0, 0, 128, 256); g.fillStyle = 'rgba(90,82,70,0.8)'; g.fillRect(70, 90, 30, 70); g.fillRect(64, 84, 42, 10); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })() }));
    lightPlane.position.y = 1.5; portal.add(lightPlane);
    const sun = new THREE.SpotLight(0xffe9b8, 0, 12, 0.7, 0.6, 1); sun.position.set(0, 2.2, -0.5); sun.target.position.set(0, 0, 4); portal.add(sun, sun.target);
    lia.add(portal);
    lia.userData = { portal, sun, lightPlane };
  }

  // ---------------- navigation graph for the Clerk (corridor + room interiors)
  const nodes = [];
  const add = (x, z, room = null) => { nodes.push({ x, z, room, links: [] }); return nodes.length - 1; };
  const corridorNodes = [];
  for (let x = -5; x <= 61; x += 4) corridorNodes.push(add(x, 0));
  for (let i = 0; i < corridorNodes.length - 1; i++) { nodes[corridorNodes[i]].links.push(corridorNodes[i + 1]); nodes[corridorNodes[i + 1]].links.push(corridorNodes[i]); }
  const roomNodes = {};
  for (const [num, R] of Object.entries(roomInfo)) {
    if (!R.open) continue;
    const doorX = R.x - LAYOUT.roomW / 2 + 0.8 + doorW / 2;
    const outside = add(doorX, R.side * 0.2), threshold = add(doorX, R.side * 1.7, +num), inside = add(R.x, (R.z0 + R.z1) / 2, +num), deep = add(R.x + 1.8, (R.z0 + R.z1) / 2 + R.side * 1.2, +num);
    const nearest = corridorNodes.reduce((b, i) => (Math.abs(nodes[i].x - doorX) < Math.abs(nodes[b].x - doorX) ? i : b), corridorNodes[0]);
    const link = (a, b) => { nodes[a].links.push(b); nodes[b].links.push(a); };
    link(nearest, outside); link(outside, threshold); link(threshold, inside); link(inside, deep);
    roomNodes[num] = { outside, threshold, inside, deep };
  }
  const hkOut = add(61, 0), hkIn = add(64.5, 0, 'hk'); nodes[hkOut].links.push(hkIn, corridorNodes[corridorNodes.length - 1]); nodes[hkIn].links.push(hkOut); nodes[corridorNodes[corridorNodes.length - 1]].links.push(hkOut);

  return {
    root, colliders, doors, roomInfo, hides, sconces, lights, chandLight, mats, shell, paintings, bigPainting, cart, keycard, panel, lever, flashlightProp: fl, phone, journal, lia, hiddenWall, hiddenCol, hkDoor, stair, roomProps, nodes, roomNodes, corridorNodes, exitSign,
  };
}
