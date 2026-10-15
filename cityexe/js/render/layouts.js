// Authored interior floorplans. Every building type has a designed layout:
// rooms, walls with doorways, furniture, lighting, where staff and customers
// stand or sit, and interaction points the player can use. Layouts are fixed
// per type; details (colours, art, names) vary per building so places feel
// like themselves. Coordinates: metres, origin at the centre, the street door
// on the +Z wall.
import { ModelKit } from './materials.js';
import { piece, footprint } from './furniture.js';
import { hash01 } from '../core/rng.js';

const WALL_T = 0.16;

// seats of a booth rotated a quarter turn (benches on either side along X)
function boothSeats(L, x, z, extra = {}) { L.spot('seat', x - 0.62, z, Math.PI / 2, extra); L.spot('seat', x + 0.62, z, -Math.PI / 2, extra); }

export class Layout {
  constructor(w, d, h, seed) {
    this.w = w; this.d = d; this.h = h; this.seed = seed;
    this.k = new ModelKit();
    this.col = []; this.spots = []; this.acts = []; this.lights = []; this.wins = []; this.anim = [];
    this.door = { x: 0, z: d / 2 - 0.3 };
  }
  r(salt) { return hash01(this.seed, salt); }
  pick(arr, salt) { return arr[Math.floor(this.r(salt) * arr.length) % arr.length]; }
  block(x0, z0, x1, z1, tall = false) { this.col.push({ x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1), tall }); }
  floor(x0, z0, x1, z1, surf, color) { this.k.surf(surf); this.k.box((x0 + x1) / 2, -0.03, (z0 + z1) / 2, x1 - x0, 0.06, z1 - z0, color); }
  ceiling(x0, z0, x1, z1, color = '#f0eeea', h = this.h) {
    this.k.surf('plaster'); this.k.box((x0 + x1) / 2, h + 0.03, (z0 + z1) / 2, x1 - x0, 0.06, z1 - z0, color);
  }
  // wall along X at z, from x0 to x1, with door gaps [[a,b],...]
  wallX(z, x0, x1, o = {}) {
    const h = o.h ?? this.h, gaps = (o.gaps || []).slice().sort((a, b) => a[0] - b[0]);
    let x = x0;
    const seg = (a, b) => { if (b - a < 0.02) return; this.k.surf(o.surf || 'plaster'); this.k.box((a + b) / 2, h / 2, z, b - a, h, WALL_T, o.c || '#e8e4dc'); this.block(a, z - WALL_T / 2, b, z + WALL_T / 2, true); if (o.base !== false) { this.k.surf('wood'); this.k.box((a + b) / 2, 0.06, z, b - a, 0.12, WALL_T + 0.03, o.bc || '#d8d4cc'); } };
    for (const [a, b] of gaps) { seg(x, a); if (h > 2.4) { this.k.surf(o.surf || 'plaster'); this.k.box((a + b) / 2, (h + 2.25) / 2, z, b - a, h - 2.25, WALL_T, o.c || '#e8e4dc'); } this.k.surf('wood'); this.k.box((a + b) / 2, 2.25, z, b - a + 0.1, 0.08, WALL_T + 0.04, o.frame || '#c8c0b0'); x = b; }
    seg(x, x1);
  }
  wallZ(x, z0, z1, o = {}) {
    const h = o.h ?? this.h, gaps = (o.gaps || []).slice().sort((a, b) => a[0] - b[0]);
    let z = z0;
    const seg = (a, b) => { if (b - a < 0.02) return; this.k.surf(o.surf || 'plaster'); this.k.box(x, h / 2, (a + b) / 2, WALL_T, h, b - a, o.c || '#e8e4dc'); this.block(x - WALL_T / 2, a, x + WALL_T / 2, b, true); if (o.base !== false) { this.k.surf('wood'); this.k.box(x, 0.06, (a + b) / 2, WALL_T + 0.03, 0.12, b - a, o.bc || '#d8d4cc'); } };
    for (const [a, b] of gaps) { seg(z, a); if (h > 2.4) { this.k.surf(o.surf || 'plaster'); this.k.box(x, (h + 2.25) / 2, (a + b) / 2, WALL_T, h - 2.25, b - a, o.c || '#e8e4dc'); } this.k.surf('wood'); this.k.box(x, 2.25, (a + b) / 2, WALL_T + 0.04, 0.08, b - a + 0.1, o.frame || '#c8c0b0'); z = b; }
    seg(z, z1);
  }
  // the building's shell: four outer walls, the street door, windows, floor & ceiling
  shell(o = {}) {
    const hw = this.w / 2, hd = this.d / 2;
    this.floor(-hw, -hd, hw, hd, o.floor || 'planks', o.fc || '#8a6a4a');
    this.ceiling(-hw, -hd, hw, hd, o.ceil || '#f0eeea');
    const dw = o.doorW || 1.8;
    const wo = { c: o.wc || '#e8e4dc', surf: o.wsurf || 'plaster', bc: o.bc };
    this.wallX(hd, -hw, hw, { ...wo, gaps: [[this.door.x - dw / 2, this.door.x + dw / 2]] });
    this.wallX(-hd, -hw, hw, wo);
    this.wallZ(-hw, -hd, hd, wo);
    this.wallZ(hw, -hd, hd, wo);
    // the street door (glass), the way back out
    this.k.surf('glass'); this.k.box(this.door.x, 1.12, hd + 0.04, dw - 0.1, 2.2, 0.03, '#a8c8e0', 0, 7);
    this.act('exit', this.door.x, hd - 0.7, 'Leave', { r: 1.6 });
    if (o.windows !== false) {
      for (let x = -hw + 2; x < hw - 1.5; x += o.winStep || 3.2) if (Math.abs(x - this.door.x) > dw) this.wins.push({ x, y: 1.6, z: hd - 0.09, ry: Math.PI, w: 1.6, h: 1.5 });
      for (let z = -hd + 2; z < hd - 1.5; z += o.winStep || 3.2) { this.wins.push({ x: -hw + 0.09, y: 1.6, z, ry: Math.PI / 2, w: 1.6, h: 1.5 }); this.wins.push({ x: hw - 0.09, y: 1.6, z, ry: -Math.PI / 2, w: 1.6, h: 1.5 }); }
    }
  }
  put(name, x, z, ry = 0, o = {}, solid = true) {
    this.k.append(piece(name, o), x, o.y || 0, z, ry);
    const fp = solid ? (o.fp || footprint(name)) : null;
    if (fp) {
      const rot = Math.abs(Math.sin(ry)) > 0.7;
      const fw = (rot ? fp[1] : fp[0]) / 2, fd = (rot ? fp[0] : fp[1]) / 2;
      this.block(x - fw, z - fd, x + fw, z + fd, false);
    }
    return this;
  }
  spot(type, x, z, h = 0, extra = {}) { this.spots.push({ type, x, z, h, ...extra }); return this; }
  act(kind, x, z, label, extra = {}) { this.acts.push({ kind, x, z, label, r: 1.3, ...extra }); return this; }
  light(x, z, color = '#fff0dc', i = 10, y = this.h - 0.3, dist = 0) {
    this.lights.push({ x, y, z, color, i, dist });
    this.k.surf('plastic'); this.k.cyl(x, this.h - 0.02, z, 0.28, 0.04, '#f8f4ea', 14, 0, 10);
  }
  strip(x, y, z, w, h, d, color) { this.k.surf('none'); this.k.box(x, y, z, w, h, d, color, 0, 10); }
}

// ---------------------------------------------------------------- layouts
const PALETTE = {
  sofa: ['#5a6a8a', '#8a5a4a', '#4a6a5a', '#6a5a7a', '#a08a6a', '#3a3a3e'],
  wall: ['#e8e2d6', '#d8e0e4', '#e8d8cc', '#dce4d4', '#ece6dc', '#d4d0e0'],
  wood: ['#8a6a4a', '#6a4a30', '#a8865e', '#5a3a24', '#b89a72'],
  bed: ['#4a6a9a', '#9a4a5a', '#5a8a6a', '#c8a050', '#6a5a8a'],
};

export const LAYOUTS = {
  // ---------------------------------------------------------- your apartment
  apartment(L, ctx) {
    const wall = L.pick(PALETTE.wall, 1), wood = L.pick(PALETTE.wood, 2);
    L.door.x = -3.2;
    L.shell({ floor: 'planks', fc: wood, wc: wall });
    const hw = L.w / 2, hd = L.d / 2;
    // bedroom + bathroom at the back, divided from the living area
    L.wallX(-0.6, -hw, hw, { c: wall, gaps: [[-4.1, -3.1], [1.6, 2.6]] });
    L.wallZ(-1.0, -hd, -0.6, { c: '#e8eef0', gaps: [] });
    L.floor(-hw, -hd, -1.0, -0.6, 'tile', '#dfe6ea');
    // bathroom (back left)
    L.put('toilet', -5.4, -4.6, 0); L.put('bathSink', -3.9, -4.75, 0); L.put('shower', -2.2, -4.3, 0);
    L.k.surf('tile'); L.k.box(-3.6, 1.3, -hd + 0.1, 5.0, 2.6, 0.03, '#e8f0f4');
    L.act('shower', -2.2, -3.4, 'Take a shower'); L.act('toilet', -5.4, -3.8, 'Use the bathroom');
    L.light(-3.4, -3.0, '#f4f8ff', 6);
    // bedroom (back right)
    L.put('bed', 3.2, -4.0, 0, { c2: L.pick(PALETTE.bed, 3), c: wood });
    L.put('nightstand', 1.9, -4.75, 0); L.put('nightstand', 4.5, -4.75, 0);
    L.put('wardrobe', 5.5, -2.0, -Math.PI / 2, { c: wood });
    L.put('rug', 3.2, -2.3, 0, { w: 2.4, d: 1.2, c: '#3a4a6a', c2: '#c8b080' }, false);
    L.put('painting', 3.2, -5.3, 0, { w: 1.2, h: 0.5, y: 1.6 }, false);
    L.act('bed', 3.2, -2.6, 'Sleep'); L.spot('bed', 2.8, -4.0, Math.PI); L.spot('bed', 3.6, -4.0, Math.PI);
    L.act('wardrobe', 4.7, -2.0, 'Change clothes');
    L.light(3.0, -3.0, '#fff0d8', 7);
    // living room
    const sofaC = L.pick(PALETTE.sofa, 4);
    L.put('sofa', 2.2, 2.2, Math.PI, { c: sofaC });
    L.put('coffeeTable', 2.2, 1.0, 0);
    L.put('tvStand', 2.2, -0.15, 0, { on: true });
    L.put('armchair', 4.6, 1.1, -Math.PI / 2, { c: L.pick(PALETTE.sofa, 5) });
    L.put('rug', 2.2, 1.2, 0, { w: 3.2, d: 2.6, c: L.pick(['#8a3a3a', '#3a5a8a', '#6a6a3a', '#5a3a5a'], 6) }, false);
    L.put('floorLamp', 5.4, 2.6, 0, {}, false); L.put('plant', 5.4, -0.2, 0);
    L.put('bookshelf', 0.4, 4.6, Math.PI);
    L.spot('sofa', 1.7, 2.1, Math.PI); L.spot('sofa', 2.7, 2.1, Math.PI); L.spot('seat', 4.5, 1.1, -Math.PI / 2);
    L.act('tv', 2.2, 1.6, 'Watch TV');
    // kitchen & dining (front left)
    L.put('counter', -5.3, 1.15, Math.PI / 2, { w: 2.1, upper: true });
    L.put('stove', -5.3, -0.25, Math.PI / 2);
    L.put('sink', -5.3, 2.7, Math.PI / 2);
    L.put('fridge', -5.25, 3.9, Math.PI / 2);
    L.put('dining', -2.6, 1.8, 0, { c: wood });
    L.act('fridge', -4.3, 3.9, 'Eat something'); L.act('stove', -4.3, -0.25, 'Cook a meal');
    L.spot('seat', -3.0, 1.1, 0); L.spot('seat', -2.2, 2.5, Math.PI); L.spot('stand', -4.2, 1.0, -Math.PI / 2);
    // the home computer
    L.put('desk', 0.4, -1.4, Math.PI, { on: true, c: wood });
    L.act('computer', 0.4, -2.1, 'Use computer');
    L.put('painting', -2.0, -0.5, 0, { y: 1.6 }, false);
    L.light(-3.2, 1.8, '#fff0d8', 9); L.light(2.4, 1.4, '#fff0d8', 9);
    void ctx;
  },
  // ---------------------------------------------------------- suburban house
  house(L) {
    const wall = L.pick(PALETTE.wall, 1), wood = L.pick(PALETTE.wood, 2);
    L.shell({ floor: 'planks', fc: wood, wc: wall });
    const hw = L.w / 2, hd = L.d / 2;
    // hallway split: bedrooms & bath at the back
    L.wallX(-1.2, -hw, hw, { c: wall, gaps: [[-5.2, -4.2], [-0.5, 0.5], [3.6, 4.6]] });
    L.wallZ(-2.4, -hd, -1.2, { c: wall }); L.wallZ(1.6, -hd, -1.2, { c: wall });
    // master bedroom (back left)
    L.put('bed', -5.0, -5.0, 0, { c2: L.pick(PALETTE.bed, 3), c: wood });
    L.put('nightstand', -6.6, -5.8, 0); L.put('nightstand', -3.4, -5.8, 0);
    L.put('dresser', -4.0, -1.8, Math.PI, { c: wood }); L.put('wardrobe', -7.1, -2.6, Math.PI / 2, { c: wood });
    L.put('rug', -5.0, -3.2, 0, { w: 2.6, d: 1.4 }, false);
    L.act('bed', -5.0, -3.4, 'Sleep'); L.act('wardrobe', -6.4, -2.6, 'Change clothes');
    L.spot('bed', -5.4, -5.0, Math.PI); L.spot('bed', -4.6, -5.0, Math.PI);
    L.light(-5, -4, '#fff0d8', 7);
    // bathroom (back middle)
    L.floor(-2.4, -hd, 1.6, -1.2, 'tile', '#e4eaee');
    L.put('bathtub', -0.4, -6.2, 0); L.put('toilet', 1.0, -4.0, -Math.PI / 2); L.put('bathSink', -1.8, -4.0, Math.PI / 2);
    L.act('shower', -0.4, -5.2, 'Take a bath'); L.light(-0.4, -4.2, '#f4f8ff', 6);
    // kids' room / study (back right)
    L.put('bed', 4.6, -5.6, 0, { single: true, c2: L.pick(PALETTE.bed, 7), c: '#f0e8dc', fp: [1.1, 2.15] });
    L.put('desk', 6.8, -3.0, -Math.PI / 2, { on: true });
    L.put('bookshelf', 3.0, -6.6, 0);
    L.act('computer', 6.1, -3.0, 'Use computer'); L.spot('bed', 4.6, -5.6, Math.PI, { kid: true });
    L.light(5, -4, '#fff0d8', 7);
    // living room (front right)
    L.put('sofa', 4.0, 4.6, Math.PI, { c: L.pick(PALETTE.sofa, 4) });
    L.put('armchair', 6.6, 2.6, -Math.PI / 2, { c: L.pick(PALETTE.sofa, 5) });
    L.put('coffeeTable', 4.0, 3.0, 0); L.put('tvStand', 4.0, 0.8, 0, { on: true });
    L.put('rug', 4.0, 3.0, 0, { w: 3.6, d: 2.8 }, false); L.put('floorLamp', 7.0, 5.2, 0, {}, false); L.put('tallPlant', 1.4, 5.4, 0);
    L.put('painting', 7.38, 2.6, -Math.PI / 2, { w: 1.4, h: 0.9, y: 1.7 }, false);
    L.act('tv', 4.0, 3.6, 'Watch TV'); L.spot('sofa', 3.5, 4.5, Math.PI); L.spot('sofa', 4.5, 4.5, Math.PI); L.spot('seat', 6.5, 2.6, -Math.PI / 2);
    // kitchen + dining (front left)
    L.put('counter', -7.1, 1.2, Math.PI / 2, { w: 3.0, upper: true }); L.put('stove', -7.1, -0.6, Math.PI / 2); L.put('sink', -7.1, 3.2, Math.PI / 2); L.put('fridge', -7.0, 4.6, Math.PI / 2);
    L.put('counter', -4.4, 1.6, 0, { w: 2.2, c: '#3a4a5a' });
    L.put('dining', -3.8, 4.2, 0, { c: wood });
    L.act('fridge', -6.0, 4.6, 'Eat something'); L.act('stove', -6.0, -0.6, 'Cook a meal');
    L.spot('seat', -4.2, 3.5, 0); L.spot('seat', -3.4, 4.9, Math.PI); L.spot('stand', -6.0, 1.2, -Math.PI / 2);
    L.light(-5, 2.5, '#fff0d8', 10); L.light(4, 2.5, '#fff0d8', 10);
  },
  // ---------------------------------------------------------- apartment lobby
  lobby(L) {
    L.shell({ floor: 'marble', fc: '#d8d0c4', wc: '#d8cbb8', windows: true });
    const hd = L.d / 2;
    L.put('mailboxes', -4.6, -hd + 0.2, 0, {}, false);
    L.put('elevator', 1.5, -hd + 0.08, 0, {}, false); L.put('elevator', 4.2, -hd + 0.08, 0, {}, false);
    L.act('elevator', 2.8, -hd + 1.2, 'Take the elevator');
    L.act('mailbox', -4.6, -hd + 1.0, 'Check your mail');
    L.put('armchair', -5.0, 1.8, Math.PI / 2, { c: '#6a5a4a' }); L.put('armchair', -5.0, 3.2, Math.PI / 2, { c: '#6a5a4a' }); L.put('tallPlant', -5.6, 4.4, 0); L.put('tallPlant', 5.6, 4.4, 0);
    L.put('rug', 0, 1.2, 0, { w: 4, d: 3, c: '#5a2a2a', c2: '#c8a060' }, false);
    L.put('painting', 5.88, 1.0, -Math.PI / 2, { w: 1.6, h: 1.0, y: 1.8 }, false);
    L.spot('wait', 2.8, -2.0, Math.PI); L.spot('seat', -4.9, 1.8, Math.PI / 2); L.spot('wait', -1.0, 1.0, 0);
    L.light(0, 0, '#fff0d8', 12); L.light(0, -3, '#fff0d8', 10);
  },
  // ---------------------------------------------------------- stores
  store(L, ctx) {
    const big = ctx.type === 'grocery';
    L.door.x = -L.w / 2 + 3;
    L.shell({ floor: 'tile', fc: '#d8dcd8', wc: '#eceae4', windows: true });
    const hw = L.w / 2, hd = L.d / 2;
    L.put('checkout', -hw + 3.2, hd - 4.2, 0, { lotto: ctx.type !== 'pharmacy' });
    if (big) L.put('checkout', -hw + 6.4, hd - 4.2, 0, { lotto: false });
    L.spot('staff', -hw + 3.0, hd - 5.0, 0); if (big) L.spot('staff', -hw + 6.2, hd - 5.0, 0);
    L.act('counter', -hw + 3.2, hd - 3.1, ctx.type === 'pharmacy' ? 'Buy medicine' : ctx.type === 'gas' ? 'Pay for gas & snacks' : 'Buy something');
    if (ctx.type !== 'pharmacy') L.act('lottery', -hw + 4.2, hd - 3.1, 'Lottery tickets');
    const aisles = big ? 5 : 3;
    for (let i = 0; i < aisles; i++) {
      const x = -hw + 4.2 + i * ((L.w - 6) / aisles) + 1.5;
      L.put('shelf', x, -1.2, 0, {});
      L.put('shelf', x, -3.1, 0, {});
      L.spot('browse', x + 0.9, -1.0, -Math.PI / 2); L.spot('browse', x - 0.9, -2.8, Math.PI / 2);
    }
    for (let x = -hw + 1.2; x < hw - 1; x += 1.35) L.put('fridgeCase', x, -hd + 0.45, 0);
    L.spot('browse', 0, -hd + 1.7, 0); L.spot('browse', 3, -hd + 1.7, 0);
    if (ctx.type === 'pharmacy') { L.put('reception', hw - 3, hd - 4.5, 0, { c: '#ffffff', accent: '#26a69a' }); L.spot('staff', hw - 3, hd - 5.6, 0); }
    L.put('atm', hw - 1.0, hd - 1.2, Math.PI);
    L.act('atm', hw - 1.0, hd - 2.0, 'Use the ATM');
    L.strip(-hw + 3.2, 2.8, hd - 4.6, 3.0, 0.3, 0.04, ctx.color || '#40c080');
    for (let x = -hw + 3; x < hw; x += 4) for (let z = -hd + 3; z < hd - 1; z += 4) L.light(x, z, '#f0f6ff', 8);
  },
  boutique(L, ctx) {
    L.shell({ floor: 'marble', fc: '#e8e4dc', wc: '#f4f0ea' });
    const hw = L.w / 2, hd = L.d / 2;
    const cs = ['#c04040', '#4060a0', '#e8e8e0', '#2a2a2a', '#d8a040', '#3a8a5a', '#a04080', '#8a6a4a'];
    for (let i = 0; i < 3; i++) { L.put('clothesRack', -hw + 2.2, -hd + 2 + i * 2.2, Math.PI / 2, { cs: cs.slice(i, i + 5) }); L.put('clothesRack', hw - 2.2, -hd + 2 + i * 2.2, -Math.PI / 2, { cs: cs.slice(i + 2, i + 7) }); L.spot('browse', -hw + 3.4, -hd + 2 + i * 2.2, -Math.PI / 2); L.spot('browse', hw - 3.4, -hd + 2 + i * 2.2, Math.PI / 2); }
    for (const x of [-1.2, 0, 1.2]) L.put('mannequin', x, -hd + 1.0, 0, { c: L.pick(cs, x * 10 + 9) });
    L.put('checkout', 0, hd - 3.6, 0, { lotto: false, c: '#2a2420' }); L.spot('staff', 0, hd - 4.4, 0);
    L.act('counter', 0, hd - 2.6, ctx.type === 'electronics' ? 'Buy electronics' : 'Buy clothes');
    L.act('wardrobe', -1.5, -hd + 2.0, 'Try on outfits');
    if (ctx.type === 'electronics') { L.put('displayCase', 0, 0, 0, { felt: '#1a1a2a' }); L.put('displayCase', 0, -2.0, 0, { felt: '#1a1a2a' }); }
    else L.put('displayCase', 0, -0.5, 0, {});
    L.put('tallPlant', -hw + 0.8, hd - 1, 0); L.put('tallPlant', hw - 0.8, hd - 1, 0);
    L.light(-2, -2, '#fff4e8', 9); L.light(2, -2, '#fff4e8', 9); L.light(0, 2, '#fff4e8', 9);
  },
  mall(L) {
    L.shell({ floor: 'marble', fc: '#e4dccc', wc: '#f0e8dc' });
    const hw = L.w / 2, hd = L.d / 2;
    const fronts = ['#e8c8a0', '#a8c8e8', '#e8a8b8', '#c8e8a8', '#d8c8f0', '#f0d8a0'];
    for (let i = 0; i < 6; i++) {
      const sx = i < 3 ? -1 : 1, z = -hd + 4 + (i % 3) * ((L.d - 8) / 2);
      L.k.surf('plaster'); L.k.box(sx * (hw - 3), 1.8, z, 6, 3.6, 3.6, fronts[i]);
      L.block(sx > 0 ? hw - 6 : -hw, z - 1.8, sx > 0 ? hw : -hw + 6, z + 1.8, true);
      L.k.surf('glass'); L.k.box(sx * (hw - 6.02), 1.3, z, 0.04, 2.4, 3.0, '#a8c8d8', 0, 7);
      L.strip(sx * (hw - 6.05), 3.0, z, 0.04, 0.4, 2.6, ['#ff6040', '#40a0ff', '#ff40a0', '#40ff80', '#c080ff', '#ffc040'][i]);
      L.spot('browse', sx * (hw - 7), z, sx > 0 ? -Math.PI / 2 : Math.PI / 2);
    }
    L.k.surf('marble'); L.k.cyl(0, 0.4, 0, 2.2, 0.8, '#d8d0c0', 24); L.k.surf('glass'); L.k.cyl(0, 0.75, 0, 2.0, 0.06, '#5aa0d0', 24); L.k.surf('chrome'); L.k.cyl(0, 1.3, 0, 0.12, 1.2, '#d8d8d8', 10);
    L.block(-2.3, -2.3, 2.3, 2.3);
    for (let i = 0; i < 6; i++) L.spot('wait', Math.cos(i) * 3.8, Math.sin(i) * 3.8, i);
    L.put('atm', 0, hd - 1.5, Math.PI); L.act('atm', 0, hd - 2.3, 'Use the ATM');
    L.act('counter', -hw + 7, -hd + 4, 'Shop');
    L.spot('staff', 0, hd - 3, Math.PI);
    for (let x = -6; x <= 6; x += 6) for (let z = -6; z <= 6; z += 6) L.light(x, z, '#fff4e0', 14);
  },
  // ---------------------------------------------------------- food & drink
  restaurant(L) {
    const wood = L.pick(PALETTE.wood, 2);
    L.shell({ floor: 'planks', fc: wood, wc: '#b8876a', wsurf: 'wallpaper' });
    const hw = L.w / 2, hd = L.d / 2;
    // kitchen behind a wall with a pass-through
    L.wallX(-hd + 4, -hw, hw, { c: '#c8a080', surf: 'wallpaper', gaps: [[hw - 2.2, hw - 1.2]] });
    L.floor(-hw, -hd, hw, -hd + 4, 'tile', '#e8e8e4');
    L.put('stove', -hw + 1.0, -hd + 0.5, 0); L.put('stove', -hw + 1.8, -hd + 0.5, 0); L.put('counter', -hw + 3.6, -hd + 0.45, 0, { w: 2.6 }); L.put('fridge', hw - 1.0, -hd + 0.5, 0); L.put('sink', 1.0, -hd + 0.5, 0);
    L.put('counter', -1.0, -hd + 2.4, 0, { w: 3.2, c: '#b8bcc0' });
    L.spot('cook', -hw + 1.4, -hd + 1.3, Math.PI); L.spot('cook', -1.0, -hd + 1.6, 0);
    L.light(-2, -hd + 2, '#f8f8ff', 8);
    // dining room
    const tc = L.pick(['#8a2a2a', '#2a4a3a', '#3a3a5a', '#6a4a2a'], 3);
    for (let i = 0; i < 3; i++) { L.put('booth', -hw + 1.3, -hd + 6 + i * 2.6, Math.PI / 2, { c: tc }); boothSeats(L, -hw + 1.3, -hd + 6 + i * 2.6); }
    for (let i = 0; i < 4; i++) { const x = -1.2 + (i % 2) * 3.4, z = -hd + 6.5 + Math.floor(i / 2) * 3.2; L.put('cafeTable', x, z, 0, { c: '#e8e0d0' }); L.spot('seat', x, z - 0.62, 0); L.spot('seat', x, z + 0.62, Math.PI); }
    L.put('bar', hw - 1.2, 1.0, -Math.PI / 2, { w: 3.0, stools: false, c: '#3a2418' });
    L.spot('staff', hw - 0.4, 1.0, -Math.PI / 2); L.spot('staff', hw - 2.4, -1.0, Math.PI);
    L.act('counter', hw - 2.2, 1.0, 'Order a meal'); L.act('seat', 0.5, -hd + 6.5, 'Sit and eat');
    L.put('painting', -hw + 0.1, 0, Math.PI / 2, { y: 1.8 }, false);
    for (let z = -hd + 6; z < hd - 1; z += 3) { L.light(-2, z, '#ffd8a0', 7); L.light(2.5, z, '#ffd8a0', 7); }
  },
  cafe(L) {
    L.shell({ floor: 'tile', fc: '#c8b8a0', wc: '#e8dcc8' });
    const hw = L.w / 2, hd = L.d / 2;
    L.put('bar', 0, -hd + 2.0, 0, { w: 5, stools: false, c: '#6a4a30', top: '#d8d0c0' });
    L.k.surf('metal'); L.k.rbox(-1.5, 1.35, -hd + 1.9, 0.8, 0.45, 0.5, 0.04, '#b8bcc0'); L.k.surf('chrome'); L.k.cyl(-1.5, 1.7, -hd + 1.9, 0.1, 0.2, '#d8d8d8', 10);
    L.k.surf('felt'); L.k.box(0, 2.2, -hd + 0.12, 4.0, 1.0, 0.04, '#1a1a1a'); L.k.surf('plaster'); for (let i = 0; i < 6; i++) L.k.box(-1.5 + (i % 2) * 2.2, 2.5 - Math.floor(i / 2) * 0.25, -hd + 0.15, 1.6, 0.05, 0.01, '#f0f0e0');
    L.spot('staff', -0.8, -hd + 1.2, 0); L.spot('staff', 1.4, -hd + 1.2, 0);
    L.act('counter', 0, -hd + 3.1, 'Order a coffee');
    for (let i = 0; i < 4; i++) { const x = -hw + 2 + (i % 2) * 3.6, z = -hd + 5 + Math.floor(i / 2) * 2.8; L.put('cafeTable', x, z, 0); L.spot('seat', x, z - 0.62, 0); L.spot('seat', x, z + 0.62, Math.PI); }
    L.put('armchair', hw - 1.0, hd - 2.0, -Math.PI / 2, { c: '#6a4a3a' }); L.spot('seat', hw - 1.0, hd - 2.0, -Math.PI / 2);
    L.put('bookshelf', hw - 0.3, 0, -Math.PI / 2); L.put('plant', -hw + 0.7, hd - 1.2, 0);
    L.light(-2, 0, '#ffd8a0', 8); L.light(2, 0, '#ffd8a0', 8); L.light(0, -3, '#ffd8a0', 8);
  },
  bar(L, ctx) {
    L.shell({ floor: 'planks', fc: '#3a2618', wc: '#4a2a22', wsurf: 'wallpaper', windows: false });
    const hw = L.w / 2, hd = L.d / 2;
    L.put('backBar', 0, -hd + 0.4, 0, { w: L.w - 4, neon: ctx.color || '#ff3070' });
    L.put('bar', 0, -hd + 2.3, 0, { w: L.w - 5, c: '#2a1810' });
    for (let x = -L.w / 2 + 3; x < L.w / 2 - 2.5; x += 0.75) L.spot('bar', x, -hd + 3.05, Math.PI, { stool: true });
    L.spot('bar_staff', -1.5, -hd + 1.3, 0); L.spot('bar_staff', 1.5, -hd + 1.3, 0);
    L.act('bar', 0, -hd + 3.4, 'Order a drink');
    for (let i = 0; i < 3; i++) { L.put('booth', -hw + 1.3, 0 + i * 2.6, Math.PI / 2, { c: '#5a1a1a' }); boothSeats(L, -hw + 1.3, i * 2.6); }
    L.put('pokerTable', hw - 3, 2, 0); for (let i = 0; i < 4; i++) L.spot('seat', hw - 3 + Math.sin(i * 1.6) * 1.3, 2 + Math.cos(i * 1.6) * 0.9, i * 1.6 + Math.PI);
    L.act('poker', hw - 3, 3.4, 'Play poker');
    L.strip(hw - 0.1, 2.2, -2, 0.04, 0.5, 2.2, '#40c0ff');
    for (let x = -hw + 3; x < hw - 2; x += 3.5) L.light(x, -hd + 2.5, '#ffb070', 6);
    L.light(-hw + 2, 2, '#ff9050', 5); L.light(hw - 3, 2, '#ffb070', 6);
  },
  // ---------------------------------------------------------- nightlife
  club(L, ctx) {
    L.shell({ floor: 'concrete', fc: '#1a1a20', wc: '#141418', windows: false, ceil: '#0a0a0e' });
    const hw = L.w / 2, hd = L.d / 2;
    // bouncer & coat check at the door
    L.spot('guard', 1.6, hd - 1.8, Math.PI); L.spot('guard', -1.6, hd - 1.8, Math.PI);
    // dance floor: tiles animated by the interior
    L.anim.push({ type: 'dancefloor', x0: -5, z0: -4, x1: 5, z1: 3, n: 10, m: 7 });
    L.act('dance', 0, 0, 'Dance', { r: 4.5 });
    for (let i = 0; i < 18; i++) L.spot('dance', -4 + (i % 6) * 1.6 + (Math.floor(i / 6) % 2) * 0.8, -3 + Math.floor(i / 6) * 2.2, (i * 1.7) % 6.28);
    // DJ booth on a riser
    L.k.surf('planks'); L.k.box(0, 0.3, -hd + 2.2, 6, 0.6, 3.2, '#141418'); L.block(-3, -hd, 3, -hd + 3.8);
    L.put('djBooth', 0, -hd + 2.2, 0, { y: 0.6 }, false); L.spot('dj', 0, -hd + 1.4, 0, { y: 0.6 });
    L.act('dj', 0, -hd + 4.2, 'Request a song');
    L.put('speaker', -4.2, -hd + 1.0, 0.3); L.put('speaker', 4.2, -hd + 1.0, -0.3);
    L.k.surf('none'); L.k.box(0, L.h - 0.6, -hd + 0.15, 9, 1.0, 0.1, '#0a0a10');
    L.strip(0, L.h - 0.6, -hd + 0.22, 8.6, 0.12, 0.02, ctx.color || '#d500f9'); L.strip(0, L.h - 1.0, -hd + 0.22, 8.6, 0.06, 0.02, '#30c0ff');
    // bar along the side
    L.put('backBar', hw - 0.4, 2, -Math.PI / 2, { w: 7, neon: '#30c0ff' });
    L.put('bar', hw - 2.2, 2, -Math.PI / 2, { w: 6, c: '#141418', top: '#202028' });
    L.spot('bar_staff', hw - 1.2, 0.5, -Math.PI / 2); L.spot('bar_staff', hw - 1.2, 3.5, -Math.PI / 2);
    for (let z = -0.5; z < 5; z += 0.75) L.spot('bar', hw - 3.0, z, Math.PI / 2, { stool: true });
    L.act('bar', hw - 3.3, 2, 'Order a drink');
    // VIP section
    L.k.surf('planks'); L.k.box(-hw + 2.5, 0.25, 3, 5, 0.5, 5, '#2a1a24'); L.block(-hw, 0.6, -hw + 5, 5.4);
    L.k.surf('chrome'); L.k.box(-hw + 5, 0.9, 3, 0.05, 0.8, 5, '#d8c060');
    L.put('booth', -hw + 1.3, 2.0, Math.PI / 2, { c: '#6a0a3a', y: 0.5 }, false); L.put('booth', -hw + 1.3, 4.4, Math.PI / 2, { c: '#6a0a3a', y: 0.5 }, false);
    boothSeats(L, -hw + 1.3, 2.0, { y: 0.5, vip: true }); boothSeats(L, -hw + 1.3, 4.4, { y: 0.5, vip: true });
    L.act('vip', -hw + 5.6, 3, 'VIP section ($200)');
    L.anim.push({ type: 'clublights', n: 5 });
    for (const [x, z, c] of [[-3, -2, '#ff2080'], [3, -2, '#2080ff'], [0, 2, '#a020ff'], [-6, 3, '#ff40a0'], [6, 2, '#20c0ff']]) L.lights.push({ x, y: L.h - 0.4, z, color: c, i: 26, dist: 16, club: true });
    L.lights.push({ x: 7, y: L.h - 0.5, z: 2, color: '#ffd0a0', i: 12, dist: 10 });
  },
  lounge(L, ctx) {
    L.shell({ floor: 'carpet', fc: '#3a0a1a', wc: '#2a0a14', wsurf: 'wallpaper', windows: false, ceil: '#120608' });
    const hw = L.w / 2, hd = L.d / 2;
    L.spot('guard', 1.4, hd - 1.6, Math.PI);
    L.put('stage', 0, -hd + 2.2, 0, { w: 8, d: 3.6, pole: true, curtain: '#6a0a2a' }, true);
    L.spot('perform', -1.6, -hd + 2.4, 0, { y: 0.8 }); L.spot('perform', 1.6, -hd + 2.4, 0, { y: 0.8 }); L.spot('perform', 0, -hd + 2.0, 0, { y: 0.8 });
    L.act('stage', 0, -hd + 5.0, 'Watch the show / tip ($20)');
    for (let i = 0; i < 6; i++) { const x = -hw + 2.5 + (i % 3) * ((L.w - 5) / 2), z = -hd + 6.6 + Math.floor(i / 3) * 3.2; L.put('cafeTable', x, z, 0, { c: '#1a1a1a', c2: '#5a0a1a' }); L.spot('watch', x, z + 0.62, Math.PI); L.spot('watch', x, z - 0.62, 0); }
    L.put('backBar', hw - 0.4, 3.5, -Math.PI / 2, { w: 5, neon: ctx.color || '#ff2e7e' });
    L.put('bar', hw - 2.2, 3.5, -Math.PI / 2, { w: 4.4, c: '#1a0a10' });
    L.spot('bar_staff', hw - 1.2, 3.5, -Math.PI / 2); L.act('bar', hw - 3.3, 3.5, 'Order a drink');
    for (const [x, z, c] of [[-2.5, -hd + 3, '#ff3080'], [2.5, -hd + 3, '#ff60a0'], [0, 3, '#c04060'], [hw - 3, 3.5, '#ff7090']]) L.lights.push({ x, y: L.h - 0.4, z, color: c, i: 10, dist: 10 });
    L.put('chandelier', 0, 2.5, 0, { y: L.h }, false);
  },
  casino(L) {
    L.shell({ floor: 'carpet', fc: '#4a0e1e', wc: '#2a1a24', wsurf: 'wallpaper', windows: false, ceil: '#1a0e12' });
    const hw = L.w / 2, hd = L.d / 2;
    L.spot('guard', 2.2, hd - 2, Math.PI); L.spot('guard', -2.2, hd - 2, Math.PI);
    // slot rows
    const sc = ['#c82030', '#2050c8', '#20a050', '#c8a020', '#8020c0'];
    for (let r = 0; r < 2; r++) for (let i = 0; i < 7; i++) {
      const x = -hw + 2 + i * 1.0, z = -2 + r * 5;
      L.put('slot', x, z, r ? Math.PI : 0, { c: sc[(i + r) % sc.length], top: ['#ffd040', '#ff60a0', '#40e0ff'][i % 3] });
      L.spot('gamble', x, z + (r ? -0.65 : 0.65), r ? 0 : Math.PI, { slot: true });
    }
    L.act('slots', -hw + 5, 0.5, 'Play the slots', { r: 3.5 });
    // table games
    L.put('blackjack', 3.5, -4, 0); L.spot('dealer', 3.5, -4.85, 0); for (let i = 0; i < 4; i++) { const a = -0.9 + i * 0.6; L.spot('gamble', 3.5 + Math.sin(a) * 1.25, -4 + Math.cos(a) * 0.85, a + Math.PI); }
    L.act('blackjack', 3.5, -2.6, 'Play blackjack');
    L.put('roulette', 3.8, 1.5, 0); L.spot('dealer', 2.6, 0.5, 0); for (let i = 0; i < 3; i++) L.spot('gamble', 3.2 + i * 0.7, 2.5, Math.PI);
    L.act('roulette', 3.8, 3.0, 'Play roulette');
    L.put('pokerTable', hw - 3.5, 6, 0); L.spot('dealer', hw - 3.5, 5.1, 0); for (let i = 1; i < 5; i++) { const a = i * 1.047; L.spot('gamble', hw - 3.5 + Math.sin(a) * 1.4, 6 + Math.cos(a) * 0.95, a + Math.PI); }
    L.act('poker', hw - 3.5, 7.4, 'Play poker');
    // cashier cage & bar
    L.put('cage', -3, -hd + 0.7, 0); L.spot('staff', -3, -hd + 0.3, 0);
    L.act('cage', -3, -hd + 2.0, 'Cashier');
    L.put('backBar', hw - 0.4, -6, -Math.PI / 2, { w: 5, neon: '#ffd040' }); L.put('bar', hw - 2.2, -6, -Math.PI / 2, { w: 4.2, c: '#2a1810' });
    L.spot('bar_staff', hw - 1.2, -6, -Math.PI / 2); L.act('bar', hw - 3.3, -6, 'Order a drink');
    for (const [x, z] of [[-4, -3], [-4, 4], [3.5, -2], [3.5, 5]]) L.put('chandelier', x, z, 0, { y: L.h }, false);
    for (const [x, z] of [[-4, -3], [-4, 4], [3.5, -2], [3.5, 5], [0, -hd + 2]]) L.lights.push({ x, y: L.h - 0.9, z, color: '#ffd8a0', i: 14, dist: 14 });
    L.anim.push({ type: 'slots' });
  },
  // ---------------------------------------------------------- bank
  bank(L) {
    L.shell({ floor: 'marble', fc: '#e8e2d6', wc: '#e0d6c4', windows: true });
    const hw = L.w / 2, hd = L.d / 2;
    // public lobby | teller line | staff area | vault corridor | vault
    L.put('tellerCounter', 0, -1.0, 0, { w: 8 }, true);
    L.block(-hw, -1.4, -4, -0.6, true); L.block(4, -1.4, hw, -0.6, true);
    L.wallX(-1.0, -hw, -4.2, { c: '#e0d6c4', h: 3.4 }); L.wallX(-1.0, 4.2, hw, { c: '#e0d6c4', h: 3.4, gaps: [[5.2, 6.2]] });
    for (let i = 0; i < 4; i++) { L.spot('staff', -3 + i * 2, -1.8, 0); L.spot('wait', -3 + i * 2, 0.5 + (i % 2) * 0.3, Math.PI); }
    L.act('teller', -1, 0.0, 'Teller window', { r: 2 });
    // queue ropes
    L.k.surf('chrome'); for (let x = -3; x <= 3; x += 1.5) L.k.cyl(x, 0.5, 2.2, 0.04, 1.0, '#d8c060', 8); L.k.surf('fabric'); L.k.box(0, 0.85, 2.2, 6, 0.04, 0.04, '#8a1a2a');
    L.put('atm', -hw + 1.0, 3, Math.PI / 2); L.put('atm', -hw + 1.0, 4.4, Math.PI / 2); L.act('atm', -hw + 1.9, 3.7, 'Use the ATM');
    L.put('armchair', hw - 1.2, 3.0, -Math.PI / 2, { c: '#3a4a3a' }); L.put('armchair', hw - 1.2, 4.4, -Math.PI / 2, { c: '#3a4a3a' }); L.put('tallPlant', hw - 1.0, 1.5, 0);
    L.spot('guard', hw - 2.0, 1.0, -Math.PI / 2); L.spot('guard', -hw + 2.2, 0.6, Math.PI / 2);
    // manager office (back left)
    L.wallZ(-3.0, -hd, -1.0, { c: '#d8ccb8', gaps: [[-2.6, -1.6]] });
    L.put('desk', -6.0, -4.6, Math.PI, { on: true, c: '#4a2e1a' }); L.put('bookshelf', -7.6, -6.2, Math.PI / 2); L.put('armchair', -6.0, -3.0, Math.PI, { c: '#5a3a2a' });
    L.spot('desk', -6.0, -4.0, Math.PI); L.act('banker', -6.0, -2.6, 'Talk to the manager (loans)');
    // vault corridor (back right) behind a staff door, then the vault itself
    L.wallZ(3.0, -hd, -1.0, { c: '#a8acb0', surf: 'concrete', gaps: [[-2.0, -1.2]] });
    L.floor(3.0, -hd, hw, -1.0, 'concrete', '#8a8c8e');
    L.wallZ(6.2, -hd, -2.6, { c: '#7a7e84', surf: 'concrete', gaps: [[-7.0, -3.6]] });
    L.wallX(-2.6, 6.2, hw, { c: '#7a7e84', surf: 'concrete' });
    L.col.push({ x0: 6.0, z0: -7.0, x1: 6.45, z1: -3.6, tall: true, id: 'vault' });
    L.act('vault', 5.0, -5.3, 'Vault door', { secure: true });
    L.put('depositBoxes', 8.75, -5.0, -Math.PI / 2, { w: 4 }, false);
    L.put('cashPallet', 7.3, -6.6, 0); L.put('cashPallet', 7.3, -3.5, 0);
    L.act('vaultCash', 7.3, -5.0, 'Grab the cash', { inVault: true });
    L.spot('guard', 4.2, -3.0, Math.PI);
    L.anim.push({ type: 'vault', x: 6.2, z: -5.3 });
    for (let x = -6; x <= 6; x += 4) L.light(x, 2.5, '#fff6e8', 10);
    L.light(-6, -4.5, '#fff0d8', 7); L.light(6.5, -5, '#e8f0ff', 7);
  },
  // ---------------------------------------------------------- offices
  office(L, ctx) {
    L.shell({ floor: 'carpet', fc: '#5a6270', wc: '#e4e6e8' });
    const hw = L.w / 2, hd = L.d / 2;
    L.put('reception', 0, hd - 3.2, 0, { accent: ctx.color || '#40a0e0' }); L.spot('staff', 0, hd - 3.8, 0);
    L.act('reception', 0, hd - 2.0, ctx.type === 'cityhall' ? 'City services' : 'Reception');
    L.strip(0, 2.6, hd - 0.15, 3, 0.4, 0.03, ctx.color || '#40a0e0');
    for (let r = 0; r < 2; r++) for (let i = 0; i < 4; i++) { const x = -hw + 2.2 + i * 2.0, z = -2 + r * 3.2; L.put('cubicle', x, z, 0, { c: '#7a8a9a' }); L.spot('desk', x, z + 0.6, Math.PI); L.act('work', x, z + 1.0, 'Work at your desk', { desk: true }); }
    // meeting room
    L.wallZ(2.2, -hd, -0.8, { c: '#e4e6e8', gaps: [[-1.8, -0.8]] }); L.wallX(-0.8, 2.2, hw, { c: '#e4e6e8' });
    L.put('dining', 5.0, -4.2, Math.PI / 2, { c: '#2a2a2c', c2: '#2a2c34', fp: [1.0, 1.6] }); L.put('whiteboard', 5.0, -hd + 0.12, 0, {}, false);
    L.spot('seat', 4.3, -4.6, Math.PI / 2); L.spot('seat', 5.7, -3.8, -Math.PI / 2); L.spot('teach', 5.0, -hd + 1.0, 0);
    L.act('meeting', 5.0, -2.6, 'Join the meeting');
    L.put('waterCooler', -hw + 0.5, hd - 1.5, Math.PI / 2); L.put('tallPlant', hw - 0.8, hd - 1.0, 0); L.put('tallPlant', -hw + 0.8, -hd + 0.8, 0);
    L.spot('stand', -hw + 1.2, hd - 1.6, Math.PI / 2);
    for (let x = -hw + 3; x < hw; x += 4) for (let z = -hd + 3; z < hd - 1; z += 4) L.light(x, z, '#f4f8ff', 9);
  },
  hotel(L) {
    L.shell({ floor: 'marble', fc: '#e8dcc8', wc: '#d8c8a8', wsurf: 'wallpaper' });
    const hw = L.w / 2, hd = L.d / 2;
    L.put('reception', 0, -hd + 2.4, 0, { c: '#4a2e1a', top: '#e8e0d0', accent: '#c5a572' }); L.spot('staff', -0.8, -hd + 1.8, 0); L.spot('staff', 0.8, -hd + 1.8, 0);
    L.act('reception', 0, -hd + 3.6, 'Book a room ($120)');
    L.put('elevator', hw - 1.2, -hd + 0.08, 0, {}, false);
    for (const z of [0, 2.4]) { L.put('sofa', -hw + 1.4, z, Math.PI / 2, { c: '#6a3a2a' }); L.spot('sofa', -hw + 1.3, z - 0.5, Math.PI / 2); L.spot('sofa', -hw + 1.3, z + 0.5, Math.PI / 2); }
    L.put('coffeeTable', -hw + 2.8, 1.2, Math.PI / 2); L.put('tallPlant', hw - 1, hd - 1, 0); L.put('tallPlant', -hw + 1, hd - 1, 0);
    L.put('chandelier', 0, 1, 0, { y: L.h }, false); L.lights.push({ x: 0, y: L.h - 1, z: 1, color: '#ffe0b0', i: 16, dist: 14 });
    L.light(-4, -3, '#fff0d8', 8); L.light(4, -3, '#fff0d8', 8);
  },
  // ---------------------------------------------------------- education
  school(L, ctx) {
    const college = ctx.type === 'college';
    L.shell({ floor: college ? 'planks' : 'tile', fc: college ? '#8a6a4a' : '#c8c4b8', wc: college ? '#e0d4c0' : '#e8e0c8' });
    const hw = L.w / 2, hd = L.d / 2;
    // hallway with lockers along the front; two classrooms behind
    L.wallX(hd - 4.5, -hw, hw, { c: college ? '#e0d4c0' : '#d8e4e8', gaps: [[-hw / 2 - 0.6, -hw / 2 + 0.6], [hw / 2 - 0.6, hw / 2 + 0.6]] });
    L.wallZ(0, -hd, hd - 4.5, { c: college ? '#e0d4c0' : '#d8e4e8' });
    for (let x = -hw + 0.6; x < hw - 0.5; x += 0.42) if (Math.abs(x - L.door.x) > 1.2 && Math.abs(Math.abs(x) - hw / 2) > 0.9 && x > -hw + 4.2) L.put('locker', x, hd - 4.17, 0, { c: college ? '#5a4a3a' : '#4a6a9a' });
    L.put('reception', -hw + 2.6, hd - 2, Math.PI / 2, { accent: ctx.color || '#e08a30' }); L.spot('staff', -hw + 1.8, hd - 2, Math.PI / 2);
    L.act('reception', -hw + 3.6, hd - 2, college ? 'Admissions office' : 'Front office');
    for (const side of [-1, 1]) {
      const cx = side * hw / 2;
      L.put('chalkboard', cx, -hd + 0.1, 0, {}, false);
      L.put('desk', cx, -hd + 2.0, Math.PI, { pc: false, c: '#6a4a30', fp: [1.4, 0.75] });
      L.spot('teach', cx - 1.0, -hd + 1.2, 0); L.act('teach', cx, -hd + 2.9, college ? 'Lecture (professor)' : 'Teach the class', { teacherOnly: true });
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { const x = cx - 2.4 + c * 1.6, z = -hd + 4.2 + r * 1.7; L.put('schoolDesk', x, z, Math.PI); L.spot('student', x, z + 0.32, Math.PI); }
      L.act('class', cx, -hd + 6.0, college ? 'Attend a lecture' : 'Sit in on class', { r: 2.6 });
      L.light(cx - 2, -hd + 3, '#f4f8ff', 9); L.light(cx + 2, -hd + 6, '#f4f8ff', 9);
    }
    L.light(-4, hd - 2, '#f4f8ff', 8); L.light(4, hd - 2, '#f4f8ff', 8);
  },
  // ---------------------------------------------------------- civic
  police(L) {
    L.shell({ floor: 'tile', fc: '#8a8e94', wc: '#c8ccd4' });
    const hw = L.w / 2, hd = L.d / 2;
    L.put('reception', 0, hd - 3.4, 0, { c: '#2a3a5a', top: '#c8ccd4', accent: '#2a5bd7' }); L.spot('staff', 0, hd - 4.0, 0);
    L.act('reception', 0, hd - 2.2, 'Front desk (fines, reports)');
    L.wallX(hd - 5, -hw, hw, { c: '#c8ccd4', gaps: [[-1, 1]] });
    for (let i = 0; i < 6; i++) { const x = -hw + 2.2 + (i % 3) * 2.6, z = -2 + Math.floor(i / 3) * 3; L.put('desk', x, z, 0, { on: true, c: '#5a4a3a' }); L.spot('desk', x, z + 0.6, Math.PI); }
    L.put('whiteboard', -3, -hd + 0.12, 0, {}, false);
    // cells
    for (let i = 0; i < 3; i++) { const z = -hd + 1.8 + i * 2.9; L.wallX(z + 1.4, 2.4, hw, { c: '#a8acb0', surf: 'concrete' }); L.put('cellBars', 2.6, z, Math.PI / 2, { w: 2.7 }, false); L.block(2.5, z - 1.4, 2.7, z + 1.4, true); L.put('cot', hw - 1.0, z, 0); L.spot('cell', hw - 1.5, z, -Math.PI / 2); L.spot('cell', hw - 2.6, z + 0.5, -Math.PI / 2); }
    L.put('locker', -hw + 0.5, hd - 6.2, Math.PI / 2, { c: '#3a4a6a' }); L.put('locker', -hw + 0.5, hd - 6.7, Math.PI / 2, { c: '#3a4a6a' });
    L.act('armory', -hw + 1.4, hd - 6.4, 'Armory (officers)');
    for (let x = -hw + 3; x < hw; x += 4.5) for (let z = -hd + 3; z < hd - 1; z += 4.5) L.light(x, z, '#f0f4ff', 9);
  },
  hospital(L) {
    L.shell({ floor: 'tile', fc: '#dfe4e6', wc: '#f0f4f6' });
    const hw = L.w / 2, hd = L.d / 2;
    L.put('reception', 0, hd - 3.4, 0, { c: '#ffffff', accent: '#e03a3a' }); L.spot('staff', 0, hd - 4.0, 0);
    L.act('reception', 0, hd - 2.2, 'Get treated');
    for (let i = 0; i < 4; i++) { L.put('chair', -hw + 1.0 + i * 0.6, hd - 1.2, Math.PI, {}); L.spot('seat', -hw + 1.0 + i * 0.6, hd - 1.2, Math.PI); }
    L.wallX(hd - 5.5, -hw, hw, { c: '#f0f4f6', gaps: [[-1, 1]] });
    for (let i = 0; i < 10; i++) { const x = -hw + 1.8 + (i % 5) * ((L.w - 3.6) / 4), z = i < 5 ? -hd + 1.6 : -hd + 6.6; L.put('hospitalBed', x, z, i < 5 ? 0 : Math.PI); L.spot('bed', x, z, i < 5 ? 0 : Math.PI, { patient: true }); L.spot('staff2', x + 0.9, z + (i < 5 ? 1.2 : -1.2), i < 5 ? Math.PI : 0); }
    L.strip(0, 2.6, hd - 0.15, 1.4, 0.3, 0.03, '#ff3030');
    for (let x = -hw + 3; x < hw; x += 4.5) for (let z = -hd + 3; z < hd - 1; z += 4.5) L.light(x, z, '#f4faff', 10);
  },
  fire(L) {
    L.shell({ floor: 'concrete', fc: '#7a7a76', wc: '#b8b4ac', windows: false });
    const hw = L.w / 2, hd = L.d / 2;
    L.k.surf('none');
    for (let i = 0; i < 2; i++) { const x = -hw / 2 + i * hw; L.k.rbox(x, 1.6, -2, 2.5, 3.2, 8.5, 0.15, '#c8221a'); L.k.surf('chrome'); L.k.box(x, 3.3, -2, 0.9, 0.2, 7, '#b8bcc0'); L.k.surf('rubber'); for (const sx of [-1, 1]) for (const z of [-5, 1.5]) L.k.cyl(x + sx * 1.15, 0.5, z, 0.5, 0.35, '#111', 14, 0, 0, [0, 0, Math.PI / 2]); L.k.surf('none'); L.block(x - 1.3, -6.3, x + 1.3, 2.3); }
    for (let x = -hw + 1; x < hw - 1; x += 1.1) L.put('locker', x, -hd + 0.3, 0, { c: '#8a8a80' }, false);
    L.block(-hw, -hd, hw, -hd + 0.6);
    for (let i = 0; i < 6; i++) L.spot('wait', -hw + 2 + i * 1.6, hd - 3, Math.PI);
    L.put('dining', hw - 3, hd - 3.5, 0, { c: '#6a5a4a' }); L.spot('seat', hw - 3.4, hd - 4.2, 0); L.spot('seat', hw - 2.6, hd - 2.8, Math.PI);
    L.put('tvStand', hw - 3, hd - 0.45, Math.PI, { on: true });
    for (let x = -hw + 3; x < hw; x += 5) L.light(x, 0, '#fff4e0', 12);
  },
  gym(L) {
    L.shell({ floor: 'rubber', fc: '#2a2a2e', wc: '#3a3c40' });
    const hw = L.w / 2, hd = L.d / 2;
    for (let i = 0; i < 5; i++) { L.put('treadmill', -hw + 1.4 + i * 1.3, -hd + 1.6, 0); L.spot('stand', -hw + 1.4 + i * 1.3, -hd + 1.3, 0, { treadmill: true }); }
    L.act('treadmill', -hw + 4, -hd + 3.2, 'Run on the treadmill', { r: 2.5 });
    L.put('benchPress', 3, -1, 0); L.put('benchPress', 3, 2, 0); L.spot('stand', 3, -0.2, Math.PI); L.spot('stand', 3, 2.8, Math.PI);
    L.act('weights', 3, 0.8, 'Lift weights', { r: 2.2 });
    L.put('dumbbells', -3, 1.0, Math.PI / 2); L.spot('stand', -2.2, 1.0, -Math.PI / 2);
    L.k.surf('mirror'); L.k.box(-hw + 0.06, 1.5, 0.8, 0.02, 2.2, 6, '#c8d0d8');
    L.put('reception', hw - 2.4, hd - 2.4, Math.PI, { c: '#1a1a1c', top: '#ffca28', accent: '#ffca28' }); L.spot('staff', hw - 2.4, hd - 1.8, Math.PI);
    L.act('reception', hw - 2.4, hd - 3.4, 'Buy a day pass ($14)');
    for (let x = -hw + 3; x < hw; x += 4) for (let z = -hd + 3; z < hd - 1; z += 4) L.light(x, z, '#f4f8ff', 10);
  },
  gunstore(L) {
    L.shell({ floor: 'concrete', fc: '#6a665e', wc: '#8a7e6a', wsurf: 'plaster' });
    const hw = L.w / 2, hd = L.d / 2;
    L.put('displayCase', -1.4, -hd + 3.0, 0, { guns: true }); L.put('displayCase', 1.4, -hd + 3.0, 0, { guns: true });
    L.put('gunRack', 0, -hd + 0.12, 0, {}, false);
    L.spot('staff', 0, -hd + 1.6, 0);
    L.act('guns', 0, -hd + 4.2, 'Buy weapons (license required)');
    L.put('shelf', -hw + 1.2, 1.0, 0, { prod: ['#3a4a2a', '#5a4a2a', '#2a2a2a', '#8a7a5a'] }); L.spot('browse', -hw + 2.2, 1.0, -Math.PI / 2);
    L.k.surf('felt'); L.k.box(hw - 0.08, 1.6, 0, 0.02, 1.4, 3, '#2a3a20');
    L.light(-2, -1, '#fff4e0', 9); L.light(2, -1, '#fff4e0', 9); L.light(0, 2, '#fff4e0', 8);
  },
  warehouse(L) {
    L.shell({ floor: 'concrete', fc: '#8a8a84', wc: '#a0a09a', windows: false, ceil: '#6a6a66' });
    const hw = L.w / 2, hd = L.d / 2;
    for (let x = -hw + 3; x < hw - 2.5; x += 4.5) for (const z of [-hd + 2, -hd + 6]) { L.put('palletRack', x, z, 0); L.spot('stand', x + 1.6, z + 1.2, Math.PI); }
    L.put('forklift', 3, 3, 0.4); L.put('forklift', -6, 4, -0.8);
    L.act('work', -2, 2, 'Move stock (work)', { r: 3 });
    for (let x = -hw + 4; x < hw; x += 6) for (let z = -hd + 4; z < hd; z += 6) L.light(x, z, '#fff8e8', 16);
  },
  autoshop(L) {
    L.shell({ floor: 'concrete', fc: '#5a5a56', wc: '#8a8c8e', windows: false });
    const hw = L.w / 2, hd = L.d / 2;
    L.put('carLift', -4, -2, 0); L.put('carLift', 2, -2, 0);
    L.spot('stand', -4, 0.8, Math.PI); L.spot('stand', 2, 0.8, Math.PI);
    for (let i = 0; i < 3; i++) L.put('toolChest', -hw + 1.5 + i * 1.3, -hd + 0.4, 0);
    L.put('reception', hw - 2.5, hd - 2.4, Math.PI, { c: '#2a2a2c', accent: '#78909c' }); L.spot('staff', hw - 2.5, hd - 1.8, Math.PI);
    L.act('reception', hw - 2.5, hd - 3.4, 'Repair your car');
    for (let x = -hw + 3; x < hw; x += 5) L.light(x, -1, '#f4f8ff', 14);
  },
  garage(L) {
    L.shell({ floor: 'concrete', fc: '#6a6a6a', wc: '#9a9a96', windows: false, ceil: '#5a5a58' });
    const hw = L.w / 2, hd = L.d / 2;
    for (let i = 0; i < 10; i++) { const x = -hw + 2.5 + (i % 5) * ((L.w - 5) / 4), z = i < 5 ? -hd + 3 : hd - 6; L.k.surf('none'); L.k.box(x, 0.005, z, 2.4, 0.01, 5, '#e8e8e4'); }
    for (let x = -hw + 4; x < hw; x += 8) for (const z of [-2, 3]) { L.k.surf('concrete'); L.k.box(x, L.h / 2, z, 0.6, L.h, 0.6, '#8a8a86'); L.block(x - 0.3, z - 0.3, x + 0.3, z + 0.3, true); }
    for (let x = -hw + 3; x < hw; x += 6) L.light(x, 0, '#f0f8e8', 12);
  },
  metro(L) {
    L.shell({ floor: 'tile', fc: '#a8a8a4', wc: '#c8d0d8', windows: false });
    const hw = L.w / 2, hd = L.d / 2;
    L.k.surf('concrete'); L.k.box(0, -0.6, -hd + 3, L.w, 1.2, 6, '#3a3a3a');
    L.k.surf('metal'); for (const sx of [-0.7, 0.7]) L.k.box(0, -0.55, -hd + 3 + sx, L.w, 0.1, 0.1, '#9a9a9a');
    L.k.surf('none'); L.k.box(0, 0.02, -hd + 6.1, L.w, 0.04, 0.3, '#e8c020');
    L.block(-hw, -hd, hw, -hd + 6);
    for (let x = -hw + 2; x < hw - 1; x += 3.5) { L.k.surf('wood'); L.k.box(x, 0.45, -1, 1.6, 0.08, 0.45, '#6a5a4a'); L.spot('seat', x, -0.6, Math.PI); L.spot('wait', x + 2, 0.5, Math.PI); }
    for (let x = -hw + 1; x < hw; x += 4) { L.k.surf('tile'); L.k.cyl(x, L.h / 2, 2, 0.3, L.h, '#c8ccd0', 12); }
    L.strip(0, 3.4, -hd + 6.2, 4, 0.5, 0.05, '#2e5e9e');
    L.anim.push({ type: 'train', z: -hd + 3 });
    L.spot('staff', 0, 1, Math.PI);
    L.act('metro', 0, -hd + 7.0, 'Board a train', { r: 6 });
    for (let x = -hw + 3; x < hw; x += 5) L.light(x, 0, '#f4f8ff', 10);
  },
  anomaly(L) {
    L.shell({ floor: 'carpet', fc: '#c8c8a8', wc: '#d8d4b0', windows: false, ceil: '#e8e4c8' });
    const hd = L.d / 2;
    for (let z = -hd + 4; z < hd - 2; z += 6) { L.strip(0, L.h - 0.05, z, 1.2, 0.04, 0.4, z % 18 === 0 ? '#ff4040' : '#f0f0e0'); L.k.surf('wood'); L.k.box(-L.w / 2 + 0.05, 1.1, z, 0.1, 2.2, 1.0, '#8a7a6a'); }
    L.strip(0, 1.2, -hd + 0.25, 1.0, 2.4, 0.02, '#ffffff');
    L.spot('wait', 0, -hd + 3, 0);
    for (let z = -hd + 6; z < hd; z += 12) L.lights.push({ x: 0, y: L.h - 0.3, z, color: '#fff8d0', i: 8, dist: 10 });
  },
};

// sizes per layout (fixed, authored): [w, d, h]
export const SIZES = {
  apartment: [12, 11, 2.8], house: [15, 14, 2.8], lobby: [12, 10, 3.6], store: [16, 13, 3.4], boutique: [12, 11, 3.4], mall: [28, 24, 6],
  restaurant: [14, 16, 3.2], cafe: [11, 11, 3.2], bar: [14, 12, 3.2], club: [20, 18, 5.5], lounge: [16, 16, 4.5], casino: [26, 22, 5.5], bank: [18, 15, 4.2],
  office: [20, 16, 3.2], hotel: [16, 12, 4.5], school: [22, 18, 3.4], police: [20, 16, 3.4], hospital: [22, 18, 3.4], fire: [18, 16, 6], gym: [16, 14, 3.6],
  gunstore: [11, 10, 3.2], warehouse: [26, 18, 7], autoshop: [18, 14, 5], garage: [24, 20, 3.0], metro: [24, 16, 5], anomaly: [6, 120, 3.0],
};
