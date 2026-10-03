// Era realisation of lots + building geometry emission.
//   1996 spec  = base design of the lot
//   2047 spec  = evolved from 1996 (preserved & renovated, or replaced)
//   2189 spec  = ruin of the 2047 spec (collapse, jagged tops, overgrowth)
// Shared lot identity + footprint is what lets the player recognise a place
// across 193 years.
import * as THREE from 'three';
import { RNG, hash32, clamp } from '../core/mathx.js';
import { LAYER as L } from './textures.js';
import { CF, SURF } from './collision.js';
import { placeProp } from './props.js';
import { signQuad } from './signs.js';
import { terrainHeight } from './layout.js';

export const STYLE = { BRICK: 0, OFFICE: 1, CURTAIN: 2, DECO: 3, HOUSE: 4, INDUSTRIAL: 5, TECH: 6, BLANK: 7 };
const STORE = 10, ABANDONED = 20;

const C = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
const shade = (c, k) => [c[0] * k, c[1] * k, c[2] * k];

const BRICK_TINTS = ['#ffffff', '#f2e6dc', '#e8d8cc', '#d8c8c0', '#fff0e6'];
const CONCRETE_TINTS = ['#e8e4dc', '#d8d4cc', '#f0ece4', '#c8c4bc', '#e0d8c8'];
const STONE_TINTS = ['#f0e4d0', '#e8dcc8', '#d8ccb8'];
const HOUSE_TINTS = ['#e8e8e0', '#b8c8d8', '#e0d0a0', '#b0c8a8', '#d8b8a8', '#c8c0b0', '#9ab0c8', '#e8d8c0'];
const TECH_TINTS = ['#e8ecf0', '#3a3f48', '#c8d0d8', '#1e2228', '#f4f4f0'];
const GLASS_TINTS = ['#9fb8c8', '#7a9aa8', '#a8b0c0', '#6a8a9a'];
const IND_TINTS = ['#c8ccd0', '#a8b8c8', '#d0c0a8', '#b0a090', '#8a9aa8'];

function eraRng(lot, era) {
  return new RNG(hash32(lot.seed ^ (era * 0x9e3779b1)));
}

function body(x0, z0, x1, z1, h, style, layer, col, floorH, seed, opts = {}) {
  return { x0, z0, x1, z1, h, style, layer, col, floorH, seed, roof: 'flat', roofCol: C('#6a6866'), roofLayer: L.gravel, parapet: true, store: false, ...opts };
}

function inset(lot, d) {
  return { x0: lot.x0 + d, z0: lot.z0 + d, x1: lot.x1 - d, z1: lot.z1 - d };
}

// ------------------------------------------------------------------ 1996 --
function spec96(lot) {
  const r = eraRng(lot, 0);
  const s = { era: 0, bodies: [], f: {}, ground: 'concrete', kind: lot.kind };
  const W = lot.x1 - lot.x0, D = lot.z1 - lot.z0;
  const seedF = r.next();
  switch (lot.kind) {
    case 'tower': {
      const center = Math.hypot((lot.x0 + lot.x1) / 2 + 150, (lot.z0 + lot.z1) / 2 + 300);
      const tall = clamp(1.25 - center / 500, 0.15, 1);
      const typ = r.weighted([['brick', 4], ['office', 3 * tall + 0.5], ['deco', 1.5], ['shop', 2]]);
      const i = inset(lot, r.range(0.0, 1.2));
      if (typ === 'brick') {
        const floors = r.int(4, 8);
        s.bodies.push(body(i.x0, i.z0, i.x1, i.z1, floors * 3.2 + 0.6, STYLE.BRICK, r.chance(0.6) ? L.brick : L.brickTan, C(r.pick(BRICK_TINTS)), 3.2, r.next(), { store: r.chance(0.75) }));
        s.f.fireEscape = r.chance(0.65);
        s.f.waterTank = r.chance(0.55);
        s.f.ac = r.int(0, 3);
        s.f.signs = r.chance(0.8) ? r.int(1, 2) : 0;
        s.f.awning = r.chance(0.6);
      } else if (typ === 'office') {
        const floors = r.int(8, 10 + Math.floor(tall * 22));
        const h = floors * 3.7;
        const col = C(r.pick(CONCRETE_TINTS));
        if (floors > 14 && W > 24 && D > 24) {
          s.bodies.push(body(i.x0, i.z0, i.x1, i.z1, 3.7 * 4, STYLE.OFFICE, L.concrete, col, 3.7, seedF, { store: true }));
          const j = inset(i, r.range(3, 6));
          s.bodies.push(body(j.x0, j.z0, j.x1, j.z1, h, STYLE.OFFICE, L.concrete, col, 3.7, seedF));
        } else {
          s.bodies.push(body(i.x0, i.z0, i.x1, i.z1, h, STYLE.OFFICE, L.concrete, col, 3.7, seedF, { store: r.chance(0.5) }));
        }
        s.f.antenna = r.chance(0.4);
        s.f.ac = r.int(1, 4);
        s.f.signs = r.chance(0.5) ? 1 : 0;
      } else if (typ === 'deco') {
        const floors = r.int(6, 10 + Math.floor(tall * 10));
        const col = C(r.pick(STONE_TINTS));
        s.bodies.push(body(i.x0, i.z0, i.x1, i.z1, floors * 3.6, STYLE.DECO, L.stone, col, 3.6, seedF, { store: r.chance(0.5) }));
        if (floors > 9) {
          const j = inset(i, Math.min(W, D) * 0.18);
          s.bodies.push(body(j.x0, j.z0, j.x1, j.z1, floors * 3.6 + r.int(2, 5) * 3.6, STYLE.DECO, L.stone, col, 3.6, seedF));
        }
        s.f.antenna = r.chance(0.25);
        s.f.signs = r.chance(0.4) ? 1 : 0;
      } else {
        const floors = r.int(2, 4);
        s.bodies.push(body(i.x0, i.z0, i.x1, i.z1, floors * 3.4 + 0.6, r.chance(0.6) ? STYLE.BRICK : STYLE.OFFICE, r.chance(0.5) ? L.brick : L.plaster, C(r.pick(BRICK_TINTS)), 3.4, r.next(), { store: true }));
        s.f.signs = r.int(1, 2);
        s.f.awning = r.chance(0.7);
        s.f.ac = r.int(0, 2);
        s.f.billboard = r.chance(0.2);
      }
      break;
    }
    case 'lowrise': {
      const i = inset(lot, r.range(0.5, 2));
      const floors = r.int(2, 3);
      s.bodies.push(body(i.x0, i.z0, i.x1, i.z1, floors * 3.4 + 0.5, STYLE.BRICK, r.chance(0.5) ? L.brick : L.plaster, C(r.pick(BRICK_TINTS)), 3.4, r.next(), { store: true }));
      s.f.signs = r.int(1, 2);
      s.f.awning = r.chance(0.7);
      s.f.ac = r.int(0, 2);
      if (lot.abandoned) s.f.abandoned = true;
      break;
    }
    case 'shop': {
      const i = inset(lot, 0.5);
      const floors = r.int(1, 2);
      s.bodies.push(body(i.x0, i.z0, i.x1, i.z1, floors * 4.2 + 0.8, STYLE.OFFICE, r.chance(0.5) ? L.plaster : L.brickTan, C(r.pick(CONCRETE_TINTS)), 4.2, r.next(), { store: true }));
      s.f.signs = 1;
      s.f.awning = r.chance(0.5);
      s.f.ac = r.int(1, 3);
      s.f.billboard = r.chance(0.25);
      break;
    }
    case 'mall': {
      const i = inset(lot, 4);
      s.bodies.push(body(i.x0, i.z0, i.x1, i.z1, 13, STYLE.BLANK, L.plaster, C('#e8dccc'), 6.5, r.next(), { store: true }));
      s.f.signs = 3;
      s.f.ac = 6;
      s.ground = 'asphalt';
      break;
    }
    case 'parking':
      s.ground = 'parking';
      s.f.lamps = true;
      break;
    case 'plaza':
      s.ground = 'plaza';
      s.f.plaza = r.pick(['fountain', 'statue', 'trees']);
      break;
    case 'house': {
      const face = lot.face || 0;
      const hw = Math.min(W - 4, 11), hd = Math.min(D - 8, 12);
      const cx = (lot.x0 + lot.x1) / 2, cz = (lot.z0 + lot.z1) / 2;
      // push the house toward its street side
      let x0 = cx - hw / 2, x1 = cx + hw / 2, z0 = cz - hd / 2, z1 = cz + hd / 2;
      const front = 6;
      if (face === 0) { z0 = lot.z0 + front; z1 = z0 + hd; }
      if (face === 2) { z1 = lot.z1 - front; z0 = z1 - hd; }
      if (face === 3) { x0 = lot.x0 + 3; x1 = x0 + Math.min(hw, W - 6); }
      if (face === 1) { x1 = lot.x1 - 3; x0 = x1 - Math.min(hw, W - 6); }
      const floors = r.int(1, 2);
      const mat = r.weighted([[L.siding, 5], [L.brick, 2], [L.plaster, 2]]);
      const tint = mat === L.siding ? C(r.pick(HOUSE_TINTS)) : mat === L.brick ? C(r.pick(BRICK_TINTS)) : C(r.pick(HOUSE_TINTS));
      const b = body(x0, z0, x1, z1, floors * 3.0 + 0.4, STYLE.HOUSE, mat, tint, 3.0, r.next(), {
        roof: 'gable', roofAxis: (x1 - x0) > (z1 - z0) ? 'x' : 'z', roofCol: C(r.pick(['#5a4a44', '#4a4f58', '#6a3a30', '#3f4a3e', '#58524c'])), roofLayer: L.tiles, parapet: false,
      });
      s.bodies.push(b);
      s.ground = 'yard';
      s.f.porch = r.chance(0.6);
      s.f.chimney = r.chance(0.5);
      s.f.fence = r.chance(0.55) ? 'picket' : null;
      s.f.yardTree = r.chance(0.7);
      s.f.mailbox = true;
      s.f.driveway = r.chance(0.6);
      if (lot.abandoned) { s.f.abandoned = true; s.f.fence = r.chance(0.5) ? 'chain' : null; }
      break;
    }
    case 'mansion': {
      const i = inset(lot, Math.min(W, D) * 0.22);
      const floors = r.int(2, 3);
      const mat = r.pick([L.stone, L.plaster, L.brickTan]);
      s.bodies.push(body(i.x0, i.z0, i.x1, i.z1, floors * 3.4 + 0.5, STYLE.DECO, mat, C(r.pick(STONE_TINTS)), 3.4, r.next(), {
        roof: 'gable', roofAxis: (i.x1 - i.x0) > (i.z1 - i.z0) ? 'x' : 'z', roofCol: C(r.pick(['#3a3f4a', '#5a3a30', '#4a4a4a'])), roofLayer: L.tiles, parapet: false,
      }));
      s.ground = 'yard';
      s.f.hedge = true;
      s.f.pool = r.chance(0.5);
      s.f.yardTree = true;
      s.f.driveway = true;
      break;
    }
    case 'warehouse': {
      const i = inset(lot, r.range(2, 6));
      const h = r.range(8, 14);
      const mat = r.chance(0.6) ? L.corrugated : L.brick;
      s.bodies.push(body(i.x0, i.z0, i.x1, i.z1, h, STYLE.INDUSTRIAL, mat, C(r.pick(mat === L.brick ? BRICK_TINTS : IND_TINTS)), h, r.next(), { roofLayer: L.metal, roofCol: C('#7a7e82') }));
      s.ground = 'asphalt';
      s.f.ac = r.int(1, 4);
      s.f.vent = r.int(2, 6);
      s.f.yard = r.int(2, 6);
      s.f.fence = 'chain';
      s.f.smokestack = r.chance(0.15);
      break;
    }
    case 'yard':
      s.ground = 'asphalt';
      s.f.containers = r.int(6, 14);
      s.f.fence = 'chain';
      s.f.tanks = r.chance(0.3);
      break;
    case 'vacant':
      s.ground = 'dirt';
      s.f.junk = true;
      s.f.fence = 'chain';
      break;
    case 'park':
      s.ground = 'park';
      break;
    default:
      break;
  }
  return s;
}

// ------------------------------------------------------------------ 2047 --
function spec47(lot, s96, facts) {
  const r = eraRng(lot, 1);
  const s = { era: 1, bodies: [], f: {}, ground: s96.ground, kind: lot.kind };
  const W = lot.x1 - lot.x0, D = lot.z1 - lot.z0;
  const preserve = (k = 1) => {
    for (const b of s96.bodies) s.bodies.push({ ...b, col: b.col.slice(), seed: b.seed });
    s.f = { ...s96.f, holoSigns: s96.f.signs, signs: 0, awning: false, waterTank: false, ledStrips: r.chance(0.5 * k), solar: r.chance(0.4) };
    // glass rooftop addition on taller preserved buildings
    if (s96.bodies.length && s96.bodies[0].roof === 'flat' && r.chance(0.45 * k)) {
      const top = s96.bodies[s96.bodies.length - 1];
      const add = r.int(1, 3) * 3.6;
      s.bodies.push(body(top.x0 + 1.2, top.z0 + 1.2, top.x1 - 1.2, top.z1 - 1.2, top.h + add, STYLE.CURTAIN, L.metal, C(r.pick(GLASS_TINTS)), 3.6, r.next(), { baseOffset: top.h }));
    }
  };
  switch (lot.kind) {
    case 'tower':
    case 'lowrise': {
      if (r.chance(lot.kind === 'tower' ? 0.32 : 0.45)) { preserve(); break; }
      const center = Math.hypot((lot.x0 + lot.x1) / 2 + 150, (lot.z0 + lot.z1) / 2 + 300);
      const tall = clamp(1.3 - center / 520, 0.25, 1);
      const style = r.weighted([[STYLE.CURTAIN, 5], [STYLE.TECH, 4], [STYLE.OFFICE, 1]]);
      const layer = style === STYLE.CURTAIN ? L.metal : style === STYLE.TECH ? L.panel : L.concrete;
      const col = C(style === STYLE.CURTAIN ? r.pick(GLASS_TINTS) : r.pick(TECH_TINTS));
      const podH = r.int(3, 5) * 4.2;
      const i = inset(lot, 0.6);
      s.bodies.push(body(i.x0, i.z0, i.x1, i.z1, podH, STYLE.TECH, L.panel, C(r.pick(TECH_TINTS)), 4.2, r.next(), { store: true }));
      const minDim = Math.min(W, D);
      if (minDim > 14) {
        const j = inset(i, r.range(1.5, Math.min(6, minDim * 0.2)));
        const h = podH + r.range(40, 80 + 180 * tall) * (lot.kind === 'lowrise' ? 0.4 : 1);
        s.bodies.push(body(j.x0, j.z0, j.x1, j.z1, h, style, layer, col, 3.6, r.next()));
        if (h > 90 && r.chance(0.6)) {
          const k = inset(j, Math.min(j.x1 - j.x0, j.z1 - j.z0) * 0.16);
          s.bodies.push(body(k.x0, k.z0, k.x1, k.z1, h + r.range(15, 50), style, layer, shade(col, 0.95), 3.6, r.next()));
        }
        s.f.helipad = h > 120 && r.chance(0.4);
        s.f.antenna = !s.f.helipad && r.chance(0.5);
        s.f.crown = r.chance(0.6);
      }
      s.f.ledStrips = true;
      s.f.holo = r.int(1, 3);
      s.f.holoSigns = r.int(1, 2);
      break;
    }
    case 'shop': {
      const i = inset(lot, 0.5);
      const floors = r.int(3, 8);
      s.bodies.push(body(i.x0, i.z0, i.x1, i.z1, floors * 3.8, STYLE.TECH, L.panel, C(r.pick(TECH_TINTS)), 3.8, r.next(), { store: true }));
      s.f.holoSigns = r.int(1, 2);
      s.f.ledStrips = r.chance(0.7);
      s.f.holo = r.chance(0.5) ? 1 : 0;
      break;
    }
    case 'mall': {
      const i = inset(lot, 3);
      s.bodies.push(body(i.x0, i.z0, i.x1, i.z1, 18, STYLE.TECH, L.panel, C('#e8ecf0'), 6, r.next(), { store: true }));
      const j = inset(i, 14);
      s.bodies.push(body(j.x0, j.z0, j.x1, j.z1, 18 + r.range(60, 110), STYLE.CURTAIN, L.metal, C(r.pick(GLASS_TINTS)), 3.6, r.next()));
      s.f.holo = 3;
      s.f.holoSigns = 3;
      s.f.ledStrips = true;
      s.f.roofGarden = true;
      break;
    }
    case 'parking': {
      if (r.chance(0.5)) {
        const i = inset(lot, 1);
        s.bodies.push(body(i.x0, i.z0, i.x1, i.z1, 5 * 3.2, STYLE.TECH, L.concrete, C('#b8bcc0'), 3.2, r.next()));
        s.f.ledStrips = true;
        s.ground = 'concrete';
      } else {
        s.ground = 'plaza';
        s.f.plaza = 'holo';
      }
      break;
    }
    case 'plaza':
      s.ground = 'plaza';
      s.f.plaza = s96.f.plaza === 'trees' ? 'trees' : 'holo';
      s.f.keepStatue = s96.f.plaza === 'statue';
      break;
    case 'house': {
      if (r.chance(0.55) || lot.abandoned) {
        preserve(0.3);
        s.f.solar = r.chance(0.7);
        s.f.fence = s96.f.fence ? 'glass' : null;
        s.f.abandoned = false;
        // Old Kessler: development depends on who won the land in 1996
        if (lot.abandoned) {
          const owner = facts.get('oldkessler.owner', 1);
          if (owner === 'halvorsen') {
            s.bodies = [];
            const i = inset(lot, 1.5);
            s.bodies.push(body(i.x0, i.z0, i.x1, i.z1, r.range(30, 60), STYLE.TECH, L.panel, C('#3a3f48'), 3.4, r.next()));
            s.f = { ledStrips: true, holoSigns: 1, fence: null };
            s.ground = 'concrete';
          } else if (owner === 'trust') {
            s.f.yardTree = true;
            s.f.garden = true;
            s.ground = 'yard';
          }
        }
      } else {
        const i = { x0: lot.x0 + 1, z0: lot.z0 + 1, x1: lot.x1 - 1, z1: lot.z1 - 1 };
        if (lot.face === 0) i.z0 += 4; else if (lot.face === 2) i.z1 -= 4; else if (lot.face === 3) i.x0 += 3; else i.x1 -= 3;
        const floors = r.int(3, 5);
        s.bodies.push(body(i.x0, i.z0, i.x1, i.z1, floors * 3.2, r.chance(0.5) ? STYLE.TECH : STYLE.BRICK, r.chance(0.5) ? L.panel : L.brickTan, C(r.pick(TECH_TINTS)), 3.2, r.next()));
        s.f.solar = true;
        s.f.ledStrips = r.chance(0.4);
        s.ground = 'concrete';
      }
      break;
    }
    case 'mansion': {
      if (r.chance(0.6)) { preserve(0.2); s.f.solar = true; break; }
      const i = inset(lot, Math.min(W, D) * 0.2);
      s.bodies.push(body(i.x0, i.z0, i.x1, i.z1, 7.2, STYLE.CURTAIN, L.metal, C('#e8ecf0'), 3.6, r.next()));
      const j = { x0: i.x0 + 2, z0: i.z0 - 0.5, x1: (i.x0 + i.x1) / 2, z1: i.z1 - 3 };
      s.bodies.push(body(j.x0, j.z0, j.x1, j.z1, 10.8, STYLE.TECH, L.panel, C('#f4f4f0'), 3.6, r.next()));
      s.ground = 'yard';
      s.f = { pool: true, hedge: true, yardTree: true, ledStrips: true, driveway: true };
      break;
    }
    case 'warehouse': {
      const i = inset(lot, 2);
      const h = r.range(14, 26);
      s.bodies.push(body(i.x0, i.z0, i.x1, i.z1, h, r.chance(0.5) ? STYLE.TECH : STYLE.BLANK, L.panel, C(r.pick(TECH_TINTS)), 4.2, r.next()));
      s.ground = 'concrete';
      s.f = { ledStrips: true, vent: r.int(3, 8), ac: r.int(2, 5), solar: r.chance(0.5), yard: r.int(2, 5), fence: 'glass', holoSigns: 1 };
      break;
    }
    case 'yard':
      s.ground = 'concrete';
      s.f = { containers: r.int(14, 26), fence: 'glass', tanks: r.chance(0.4), stack: 3 };
      break;
    case 'vacant': {
      const owner = facts.get('oldkessler.owner', 1);
      if (owner === 'trust') {
        s.ground = 'park';
        s.f = { garden: true };
      } else {
        const i = inset(lot, 1);
        s.bodies.push(body(i.x0, i.z0, i.x1, i.z1, r.range(24, 70), STYLE.TECH, L.panel, C('#2a2f38'), 3.4, r.next()));
        s.f = { ledStrips: true, holoSigns: 1 };
        s.ground = 'concrete';
      }
      break;
    }
    case 'park':
      s.ground = 'park';
      break;
    default:
      break;
  }
  return s;
}

// ------------------------------------------------------------------ 2189 --
function spec89(lot, s47) {
  const r = eraRng(lot, 2);
  const s = { era: 2, bodies: [], f: {}, ground: s47.ground, kind: lot.kind, ruin: true };
  const groundMap = { concrete: 'ruinground', asphalt: 'ruinground', plaza: 'ruinground', parking: 'ruinground', yard: 'wild', park: 'forest', dirt: 'wild' };
  s.ground = groundMap[s47.ground] || 'wild';
  const collapseAll = r.chance(0.07);
  let tallest = 0;
  for (const b of s47.bodies) tallest = Math.max(tallest, b.h);
  for (const b of s47.bodies) {
    if (collapseAll) break;
    const nb = { ...b, col: shade(b.col, 0.86), store: false, jag: true };
    const tall = b.h > 40;
    const f = tall ? r.range(0.25, 0.8) : r.range(0.55, 1.0);
    nb.h = Math.max(3, b.h * f);
    if (nb.baseOffset !== undefined && nb.baseOffset >= nb.h - 1) continue; // addition fell off
    if (b.roof === 'gable') {
      if (r.chance(0.5)) { nb.roof = 'flat'; nb.parapet = false; nb.roofGone = true; }
      else nb.roofSag = true;
    }
    nb.parapet = false;
    s.bodies.push(nb);
  }
  // half-collapse: split the main body into a standing and fallen part
  if (s.bodies.length && !collapseAll && r.chance(0.3)) {
    const b = s.bodies[0];
    const W = b.x1 - b.x0, D = b.z1 - b.z0;
    if (Math.min(W, D) > 10 && b.h > 10) {
      const t = r.range(0.4, 0.6);
      const splitX = W > D;
      const fallen = { ...b, jag: true, h: Math.max(2.5, b.h * r.range(0.15, 0.35)) };
      const standing = { ...b };
      if (splitX) {
        const xm = b.x0 + W * t;
        if (r.chance(0.5)) { standing.x1 = xm; fallen.x0 = xm; } else { standing.x0 = xm; fallen.x1 = xm; }
      } else {
        const zm = b.z0 + D * t;
        if (r.chance(0.5)) { standing.z1 = zm; fallen.z0 = zm; } else { standing.z0 = zm; fallen.z1 = zm; }
      }
      s.bodies[0] = standing;
      s.bodies.splice(1, 0, fallen);
      s.f.rubbleRamp = { splitX, fallen, standing };
    }
  }
  s.f.ivy = Math.min(10, Math.floor(r.range(2, 7) * (tallest > 30 ? 1.6 : 1)));
  s.f.rubble = collapseAll ? 14 : r.int(2, 6);
  s.f.roofTrees = r.int(0, 3);
  s.f.collapsed = collapseAll;
  s.f.fadedSigns = s47.f.holoSigns ? 1 : 0;
  s.f.wildTrees = r.int(2, 6);
  if (s47.f.containers) s.f.containers = Math.floor(s47.f.containers * 0.5);
  if (s47.f.pool) s.f.pool = 'swamp';
  return s;
}

// ------------------------------------------------------------- realise ---
export function realizeLot(lot, era, facts) {
  const s96 = spec96(lot);
  if (era === 0) return s96;
  const s47 = spec47(lot, s96, facts);
  if (era === 1) return s47;
  return spec89(lot, s47);
}

// -------------------------------------------------------- emit helpers ---
function lotGroundY(lot) {
  if (lot.flat) return 0.15;
  let mn = 1e9;
  for (const [x, z] of [[lot.x0, lot.z0], [lot.x1, lot.z0], [lot.x0, lot.z1], [lot.x1, lot.z1], [(lot.x0 + lot.x1) / 2, (lot.z0 + lot.z1) / 2]]) {
    mn = Math.min(mn, terrainHeight(x, z));
  }
  return mn + 0.15;
}

// which faces of a rect touch the block boundary (street-facing)
function streetFaces(b, block) {
  const e = 2.5;
  return {
    n: b.z0 - block.z0 < e, s: block.z1 - b.z1 < e, w: b.x0 - block.x0 < e, e: block.x1 - b.x1 < e,
  };
}

// Emit a jagged ruin top band for a body (2189)
function emitJag(ctx, b, y0, yTop, r) {
  const g = ctx.geo.get('uber');
  const m = [b.layer, STYLE.BLANK, b.seed, b.floorH];
  const inner = shade(b.col, 0.45);
  const segs = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const n = Math.max(1, Math.round(len / 3.2));
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n;
      const ax = x0 + (x1 - x0) * t0, az = z0 + (z1 - z0) * t0;
      const bx = x0 + (x1 - x0) * t1, bz = z0 + (z1 - z0) * t1;
      const hh = r.next() < 0.35 ? 0 : r.range(0.3, 1) * Math.min(b.floorH * 2.2, 8);
      if (hh < 0.2) continue;
      const mm = [b.layer, b.style >= 0 && b.style !== STYLE.BLANK && b.style !== STYLE.CURTAIN ? b.style : STYLE.BLANK, b.seed, b.floorH];
      g.wall(ax, az, bx, bz, yTop, yTop + hh, b.col, mm, 0, y0);
      g.wall(ax, az, bx, bz, yTop, yTop + hh, inner, m, 0, y0, true);
      // cap
      const nx = (bz - az) / (len / n), nz = -(bx - ax) / (len / n);
      const tt = 0.3;
      g.quad([ax - nx * tt, yTop + hh, az - nz * tt], [bx - nx * tt, yTop + hh, bz - nz * tt], [bx, yTop + hh, bz], [ax, yTop + hh, az], [0, 1, 0], [0, 0], [1, 0], [1, 0.3], [0, 0.3], b.col, [L.concrete, -1, 0, 0]);
      const cx0 = Math.min(ax, bx) - Math.abs(nx) * tt, cx1 = Math.max(ax, bx) + Math.abs(nx) * 0.0;
      ctx.collider(Math.min(ax, bx, ax - nx * tt, bx - nx * tt), yTop, Math.min(az, bz, az - nz * tt, bz - nz * tt), Math.max(ax, bx, ax - nx * tt, bx - nx * tt), yTop + hh, Math.max(az, bz, az - nz * tt, bz - nz * tt), CF.SOLID, SURF.concrete);
      void cx0; void cx1;
    }
  };
  // perimeter, walking each face so wall normals point outward
  segs(b.x0, b.z1, b.x1, b.z1);
  segs(b.x1, b.z1, b.x1, b.z0);
  segs(b.x1, b.z0, b.x0, b.z0);
  segs(b.x0, b.z0, b.x0, b.z1);
}

function emitBody(ctx, b, y0, spec, r, bodyIndex) {
  const g = ctx.geo.get('uber');
  const era = spec.era;
  let style = b.style + (b.store ? STORE : 0) + (spec.f.abandoned ? ABANDONED : 0);
  const m = [b.layer, style, b.seed, b.floorH];
  const baseY = b.baseOffset !== undefined ? y0 + b.baseOffset : y0 - 1.2;
  const topY = y0 + b.h;
  const roofM = [b.roofLayer, -1, b.seed, 0];
  const isFlat = b.roof === 'flat';
  // walls (+ flat roof top)
  g.box(b.x0, baseY, b.z0, b.x1, topY, b.z1, b.col, m, {
    faces: isFlat && !b.roofGone ? (1 | 2 | 4 | 16 | 32) : (1 | 2 | 16 | 32),
    vBase: y0, uBase: (b.seed * 97) % 40, topM: roofM, topCol: b.roofCol,
  });
  ctx.collider(b.x0, baseY, b.z0, b.x1, topY, b.z1, CF.SOLID, b.layer === L.corrugated || b.layer === L.metal ? SURF.metal : SURF.concrete);
  if (b.roofGone) {
    // interior visible from above: dark floor slab one floor down + inner walls
    const fy = topY - Math.min(b.floorH, b.h * 0.5);
    g.box(b.x0 + 0.3, fy - 0.3, b.z0 + 0.3, b.x1 - 0.3, fy, b.z1 - 0.3, shade(b.col, 0.4), [L.rubble, -1, 0, 0], { faces: 4 });
    const inner = shade(b.col, 0.35);
    g.wall(b.x0 + 0.3, b.z1 - 0.3, b.x1 - 0.3, b.z1 - 0.3, fy, topY, inner, [b.layer, -1, 0, 0], 0, y0, true);
    g.wall(b.x1 - 0.3, b.z1 - 0.3, b.x1 - 0.3, b.z0 + 0.3, fy, topY, inner, [b.layer, -1, 0, 0], 0, y0, true);
    g.wall(b.x1 - 0.3, b.z0 + 0.3, b.x0 + 0.3, b.z0 + 0.3, fy, topY, inner, [b.layer, -1, 0, 0], 0, y0, true);
    g.wall(b.x0 + 0.3, b.z0 + 0.3, b.x0 + 0.3, b.z1 - 0.3, fy, topY, inner, [b.layer, -1, 0, 0], 0, y0, true);
  }
  // parapet
  if (isFlat && b.parapet && b.h > 5) {
    const t = 0.35, ph = 0.9;
    const pm = [b.layer, STYLE.BLANK, b.seed, b.floorH];
    const pc = shade(b.col, 0.95);
    const cap = [L.concrete, -1, 0, 0];
    const cc = C('#b8b4ac');
    const bx = (x0, z0, x1, z1) => {
      g.box(x0, topY, z0, x1, topY + ph, z1, pc, pm, { vBase: y0, topM: cap, topCol: cc, faces: 1 | 2 | 4 | 16 | 32 });
      ctx.collider(x0, topY, z0, x1, topY + ph, z1, CF.SOLID, SURF.concrete);
    };
    bx(b.x0, b.z0, b.x1, b.z0 + t);
    bx(b.x0, b.z1 - t, b.x1, b.z1);
    bx(b.x0, b.z0 + t, b.x0 + t, b.z1 - t);
    bx(b.x1 - t, b.z0 + t, b.x1, b.z1 - t);
  }
  // gable roof
  if (b.roof === 'gable' && !b.roofGone) {
    const rh = Math.min(b.x1 - b.x0, b.z1 - b.z0) * (b.roofSag ? 0.22 : 0.38);
    g.gable(b.x0, b.z0, b.x1, b.z1, topY, rh, b.roofAxis || 'x', b.roofCol, roofM, b.roofSag ? 0.1 : 0.45);
    // approximate roof collision with a stepped ridge
    const ax = b.roofAxis || 'x';
    for (let k = 0; k < 3; k++) {
      const f = (k + 1) / 4;
      if (ax === 'x') {
        const hz = ((b.z1 - b.z0) / 2) * (1 - f);
        const zm = (b.z0 + b.z1) / 2;
        ctx.collider(b.x0, topY, zm - hz, b.x1, topY + rh * f, zm + hz, CF.SOLID, SURF.wood);
      } else {
        const hx = ((b.x1 - b.x0) / 2) * (1 - f);
        const xm = (b.x0 + b.x1) / 2;
        ctx.collider(xm - hx, topY, b.z0, xm + hx, topY + rh * f, b.z1, CF.SOLID, SURF.wood);
      }
    }
  }
  if (b.jag) emitJag(ctx, b, y0, topY, r);

  // ---- street-level details
  const sf = streetFaces(b, ctx.block);
  const ground = b.baseOffset === undefined;
  if (ground && b.store && era === 0) {
    // awnings + signs on street faces
    const faces = [];
    if (sf.n) faces.push([0, -1, (b.x0 + b.x1) / 2, b.z0, b.x1 - b.x0]);
    if (sf.s) faces.push([0, 1, (b.x0 + b.x1) / 2, b.z1, b.x1 - b.x0]);
    if (sf.w) faces.push([-1, 0, b.x0, (b.z0 + b.z1) / 2, b.z1 - b.z0]);
    if (sf.e) faces.push([1, 0, b.x1, (b.z0 + b.z1) / 2, b.z1 - b.z0]);
    let signsLeft = spec.f.signs || 0;
    for (const [nx, nz, cx, cz, len] of faces) {
      if (spec.f.awning && len > 6) {
        const aw = Math.min(len - 2, r.range(5, 12));
        const ay = y0 + b.floorH * 0.78;
        const awCol = C(r.pick(['#b8382e', '#2e6a3a', '#2a4a8a', '#c88a2a', '#6a2a5a', '#e8e0d0']));
        const tx = -nz, tz = nx;
        const ox = cx + tx * r.range(-(len - aw) / 2, (len - aw) / 2), oz = cz + tz * r.range(-(len - aw) / 2, (len - aw) / 2);
        const d = 1.6;
        const p0 = [ox - tx * aw / 2, ay, oz - tz * aw / 2];
        const p1 = [ox + tx * aw / 2, ay, oz + tz * aw / 2];
        const p2 = [ox + tx * aw / 2 + nx * d, ay - 0.7, oz + tz * aw / 2 + nz * d];
        const p3 = [ox - tx * aw / 2 + nx * d, ay - 0.7, oz - tz * aw / 2 + nz * d];
        // both sides of the awning
        const up = [nx * 0.4, 0.9, nz * 0.4];
        const lft = nx * tz - nz * tx > 0;
        if (lft) { g.quad(p0, p1, p2, p3, up, [0, 0], [aw, 0], [aw, 2], [0, 2], awCol, [L.fabric, -1, 0, 0]); g.quad(p3, p2, p1, p0, [-up[0], -up[1], -up[2]], [0, 0], [aw, 0], [aw, 2], [0, 2], shade(awCol, 0.6), [L.fabric, -1, 0, 0]); }
        else { g.quad(p1, p0, p3, p2, up, [0, 0], [aw, 0], [aw, 2], [0, 2], awCol, [L.fabric, -1, 0, 0]); g.quad(p2, p3, p0, p1, [-up[0], -up[1], -up[2]], [0, 0], [aw, 0], [aw, 2], [0, 2], shade(awCol, 0.6), [L.fabric, -1, 0, 0]); }
      }
      if (signsLeft > 0 && len > 5) {
        signsLeft--;
        const sg = ctx.signs.random(r.chance(0.1) ? 'special' : 'neon96', r);
        const sw = Math.min(len - 2, r.range(4, 7)), sh = sw / 4;
        const sy = y0 + b.floorH * 0.95 + sh / 2;
        const tx = -nz, tz = nx;
        const off = r.range(-(len - sw) / 2 + 0.5, (len - sw) / 2 - 0.5);
        signQuad(ctx.geo.get('sign'), sg, cx + tx * off + nx * 0.08, sy, cz + tz * off + nz * 0.08, nx, nz, sw, sh, [1, 1, 1], 2, r.next());
        // sign back panel
        g.boxRot(cx + tx * off + nx * 0.04, sy, cz + tz * off + nz * 0.04, sw / 2 + 0.1, sh / 2 + 0.1, 0.04, Math.atan2(nx, nz), C('#1a1a1e'), [L.metal, -1, 0, 0]);
        ctx.lights && ctx.lights.push({ x: cx + tx * off + nx * 1.5, y: sy, z: cz + tz * off + nz * 1.5, kind: 'sign', color: sg.style });
      }
    }
  }
  // 2047 holo signs at street level + LED strips + holo ads
  if (era === 1 && bodyIndex === 0 && ground) {
    const faces = [];
    if (sf.n) faces.push([0, -1, (b.x0 + b.x1) / 2, b.z0, b.x1 - b.x0]);
    if (sf.s) faces.push([0, 1, (b.x0 + b.x1) / 2, b.z1, b.x1 - b.x0]);
    if (sf.w) faces.push([-1, 0, b.x0, (b.z0 + b.z1) / 2, b.z1 - b.z0]);
    if (sf.e) faces.push([1, 0, b.x1, (b.z0 + b.z1) / 2, b.z1 - b.z0]);
    let n = spec.f.holoSigns || 0;
    for (const [nx, nz, cx, cz, len] of faces) {
      if (n-- <= 0 || len < 6) continue;
      const sg = ctx.signs.random('holo47', r);
      const sw = Math.min(len - 2, r.range(5, 9)), sh = sw / 4;
      const sy = y0 + Math.min(b.h, 4.2) + sh / 2 + 0.3;
      const tx = -nz, tz = nx;
      const off = r.range(-(len - sw) / 2 + 0.5, (len - sw) / 2 - 0.5);
      signQuad(ctx.geo.get('holo'), sg, cx + tx * off + nx * 0.6, sy, cz + tz * off + nz * 0.6, nx, nz, sw, sh, [1.6, 1.6, 1.6], 0, r.next());
      // storefront light strip along the whole face
      const lc = r.pick([[0.3, 2.2, 3.0], [3.0, 0.4, 2.2], [2.6, 2.0, 0.5]]);
      const half = len / 2;
      ctx.geo.get('emissive').boxRot(cx + nx * 0.08, y0 + 4.05, cz + nz * 0.08, half - 0.2, 0.05, 0.05, Math.atan2(nx, nz) + Math.PI / 2, lc, [0, 2, r.next(), 0]);
    }
  }
  if (era === 2 && spec.f.fadedSigns && bodyIndex === 0 && ground) {
    if (sf.n || sf.s) {
      const nz = sf.n ? -1 : 1;
      const sg = ctx.signs.get('f:' + ['SYNTH NOODLE', 'MEMCLINIC', 'NEXUS', 'DATA DEN', 'ORBIT', 'SOMA', 'BIOLAB', 'TOKYO-9', 'NEURO SPA', 'LUMEN'][Math.floor(r.next() * 10)]);
      signQuad(ctx.geo.get('sign'), sg, (b.x0 + b.x1) / 2, y0 + 4.6, (nz < 0 ? b.z0 : b.z1) + nz * 0.05, 0, nz, 6, 1.5, [0.6, 0.6, 0.6], 0, 0);
    }
  }
}

function emitLedStrips(ctx, b, y0, r) {
  const e = ctx.geo.get('emissive');
  const col = r.pick([[0.3, 2.6, 3.4], [3.2, 0.5, 2.6], [2.8, 2.2, 0.6], [0.6, 3.2, 1.4]]);
  const t = 0.12;
  const top = y0 + b.h;
  const m = [0, 2, r.next(), 0];
  for (const [x, z] of [[b.x0, b.z0], [b.x1, b.z0], [b.x0, b.z1], [b.x1, b.z1]]) {
    e.box(x - t, y0 + 4, z - t, x + t, top, z + t, col, m);
  }
  // crown ring
  e.box(b.x0 - 0.1, top - 0.4, b.z0 - 0.1, b.x1 + 0.1, top - 0.2, b.z0 + 0.05, col, m, { faces: 1 | 2 | 16 | 32 });
  e.box(b.x0 - 0.1, top - 0.4, b.z1 - 0.05, b.x1 + 0.1, top - 0.2, b.z1 + 0.1, col, m, { faces: 1 | 2 | 16 | 32 });
}

function emitHoloAds(ctx, b, y0, r, count) {
  const h = ctx.geo.get('holo');
  for (let i = 0; i < count; i++) {
    const side = r.int(0, 3);
    const nx = side === 1 ? 1 : side === 3 ? -1 : 0, nz = side === 2 ? 1 : side === 0 ? -1 : 0;
    const len = nx !== 0 ? b.z1 - b.z0 : b.x1 - b.x0;
    if (len < 8 || b.h < 30) continue;
    const w = Math.min(len * 0.8, r.range(10, 22));
    const hh = w * 0.25;
    const cy = y0 + r.range(b.h * 0.35, b.h * 0.85);
    const cx = nx > 0 ? b.x1 : nx < 0 ? b.x0 : (b.x0 + b.x1) / 2;
    const cz = nz > 0 ? b.z1 : nz < 0 ? b.z0 : (b.z0 + b.z1) / 2;
    const sg = ctx.signs.random('holo47', r);
    signQuad(h, sg, cx + nx * 1.2, cy, cz + nz * 1.2, nx, nz, w, hh, [2.2, 2.2, 2.2], 3, r.next());
    // second, larger vertical "screen" glow panel
    if (r.chance(0.5)) {
      const col = r.pick([[0.2, 1.2, 2.0], [1.8, 0.3, 1.4], [1.6, 1.2, 0.3]]);
      const tx = -nz, tz = nx;
      const sw = Math.min(len * 0.3, 6), sh = r.range(12, 26);
      const off = r.range(-len * 0.3, len * 0.3);
      const px = cx + tx * off + nx * 0.15, pz = cz + tz * off + nz * 0.15;
      const yb = cy - sh * 0.5 - hh;
      ctx.geo.get('emissive').quad(
        [px - tx * sw / 2, yb, pz - tz * sw / 2], [px + tx * sw / 2, yb, pz + tz * sw / 2],
        [px + tx * sw / 2, yb + sh, pz + tz * sw / 2], [px - tx * sw / 2, yb + sh, pz - tz * sw / 2],
        [nx, 0, nz], [0, 0], [sw, 0], [sw, sh], [0, sh], col, [0, 3, r.next(), 0]);
    }
  }
}

function emitRoofProps(ctx, b, y0, spec, r) {
  const top = y0 + b.h;
  const W = b.x1 - b.x0, D = b.z1 - b.z0;
  const rp = (name, yaw = 0, s = 1) => {
    const x = b.x0 + 2 + r.next() * Math.max(0.1, W - 4);
    const z = b.z0 + 2 + r.next() * Math.max(0.1, D - 4);
    placeProp(ctx, name, x, top, z, yaw, s);
  };
  const f = spec.f;
  if (spec.era === 0) {
    if (f.waterTank) rp('watertank', 0, r.range(0.8, 1.0));
    for (let i = 0; i < (f.ac || 0); i++) rp('acunit', r.int(0, 3) * Math.PI / 2);
    if (f.antenna) rp('antenna');
    for (let i = 0; i < (f.vent || 0); i++) rp('vent');
    if (f.billboard && W > 9) placeProp(ctx, 'billboard', (b.x0 + b.x1) / 2, top, (b.z0 + b.z1) / 2, r.int(0, 3) * Math.PI / 2);
  } else if (spec.era === 1) {
    for (let i = 0; i < Math.min(3, f.ac || 0); i++) rp('acunit', 0);
    if (f.solar) for (let i = 0; i < Math.min(8, Math.floor(W * D / 60)); i++) rp('solar', 0.2);
    if (f.helipad && W > 16 && D > 16) placeProp(ctx, 'helipad', (b.x0 + b.x1) / 2, top, (b.z0 + b.z1) / 2);
    else if (f.antenna) rp('antenna', 0, 1.6);
    if (f.roofGarden) for (let i = 0; i < 5; i++) rp('tree_street_' + r.int(0, 2));
  } else {
    for (let i = 0; i < (f.roofTrees || 0); i++) {
      const x = b.x0 + 2 + r.next() * Math.max(0.1, W - 4), z = b.z0 + 2 + r.next() * Math.max(0.1, D - 4);
      placeProp(ctx, 'tree_' + r.pick(['oak', 'maple', 'birch']) + '_' + r.int(0, 2), x, top, z, r.range(0, 6), r.range(0.6, 1.0), null, { noCollide: true });
    }
    for (let i = 0; i < 3; i++) {
      const x = b.x0 + 1.5 + r.next() * Math.max(0.1, W - 3), z = b.z0 + 1.5 + r.next() * Math.max(0.1, D - 3);
      placeProp(ctx, 'grass_tuft', x, top, z, r.range(0, 6), r.range(0.8, 1.6), null, { noCollide: true });
    }
  }
}

function emitFireEscape(ctx, b, y0, r) {
  const sf = streetFaces(b, ctx.block);
  // prefer a street face for the iconic look, else any
  const opts = [];
  if (sf.n) opts.push([0, -1]); if (sf.s) opts.push([0, 1]); if (sf.w) opts.push([-1, 0]); if (sf.e) opts.push([1, 0]);
  if (!opts.length) opts.push([0, 1]);
  const [nx, nz] = r.pick(opts);
  const len = nx !== 0 ? b.z1 - b.z0 : b.x1 - b.x0;
  if (len < 8) return;
  const g = ctx.geo.get('uber');
  const floors = Math.floor(b.h / b.floorH);
  const w = 4.2, d = 1.4;
  const tx = -nz, tz = nx;
  const off = r.range(-len / 2 + w, len / 2 - w);
  const fx = (nx > 0 ? b.x1 : nx < 0 ? b.x0 : (b.x0 + b.x1) / 2) + tx * off;
  const fz = (nz > 0 ? b.z1 : nz < 0 ? b.z0 : (b.z0 + b.z1) / 2) + tz * off;
  const col = C('#2e3236');
  const mm = [L.metal, -1, 0, 0];
  const yaw = Math.atan2(nx, nz);
  for (let f = 1; f < floors; f++) {
    const y = y0 + f * b.floorH - 0.1;
    const cx = fx + nx * d / 2, cz = fz + nz * d / 2;
    g.boxRot(cx, y, cz, w / 2, 0.04, d / 2, yaw, col, mm);
    // railing
    g.boxRot(fx + nx * d, y + 0.95, fz + nz * d, w / 2, 0.03, 0.03, yaw, col, mm);
    g.boxRot(fx + nx * d + tx * w / 2, y + 0.48, fz + nz * d + tz * w / 2, 0.03, 0.48, 0.03, yaw, col, mm);
    g.boxRot(fx + nx * d - tx * w / 2, y + 0.48, fz + nz * d - tz * w / 2, 0.03, 0.48, 0.03, yaw, col, mm);
    // stair to next platform
    if (f < floors - 1) {
      const sx0 = fx + nx * d * 0.5 - tx * w * 0.4, sz0 = fz + nz * d * 0.5 - tz * w * 0.4;
      const sx1 = fx + nx * d * 0.5 + tx * w * 0.4, sz1 = fz + nz * d * 0.5 + tz * w * 0.4;
      const flip = f % 2 === 0;
      g.tube(flip ? sx1 : sx0, y, flip ? sz1 : sz0, flip ? sx0 : sx1, y + b.floorH, flip ? sz0 : sz1, 0.08, 0.08, 4, col, mm);
    }
    // platform collider (walkable)
    const ax0 = Math.min(fx - tx * w / 2, fx + tx * w / 2 + nx * d), ax1 = Math.max(fx - tx * w / 2 + nx * d, fx + tx * w / 2);
    const az0 = Math.min(fz - tz * w / 2, fz + tz * w / 2 + nz * d), az1 = Math.max(fz - tz * w / 2 + nz * d, fz + tz * w / 2);
    ctx.collider(Math.min(ax0, ax1), y - 0.08, Math.min(az0, az1), Math.max(ax0, ax1), y, Math.max(az0, az1), CF.SOLID | CF.NOCAM, SURF.metal);
  }
  // drop ladder + climb volume running from street to roof
  const lx = fx + nx * d * 0.85, lz = fz + nz * d * 0.85;
  g.boxRot(lx, y0 + b.floorH * 0.5 + 0.8, lz, 0.25, b.floorH * 0.5 - 0.6, 0.03, yaw, col, mm);
  const cw = 0.7;
  ctx.collider(Math.min(fx - tx * cw, fx + tx * cw + nx * d), y0 + 1.0, Math.min(fz - tz * cw, fz + tz * cw + nz * d),
    Math.max(fx - tx * cw + nx * d, fx + tx * cw), y0 + b.h + 0.5, Math.max(fz - tz * cw + nz * d, fz + tz * cw), CF.CLIMB, SURF.metal);
}

function emitIvy(ctx, b, y0, count, r) {
  for (let i = 0; i < count; i++) {
    const side = r.int(0, 3);
    const nx = side === 1 ? 1 : side === 3 ? -1 : 0, nz = side === 2 ? 1 : side === 0 ? -1 : 0;
    const len = nx !== 0 ? b.z1 - b.z0 : b.x1 - b.x0;
    const tx = -nz, tz = nx;
    const off = r.range(-len / 2 + 1.5, len / 2 - 1.5);
    const cx = (nx > 0 ? b.x1 : nx < 0 ? b.x0 : (b.x0 + b.x1) / 2) + tx * off;
    const cz = (nz > 0 ? b.z1 : nz < 0 ? b.z0 : (b.z0 + b.z1) / 2) + tz * off;
    const top = y0 + b.h - r.range(0, Math.min(6, b.h * 0.3));
    const sc = r.range(0.8, 1.5);
    placeProp(ctx, 'ivy', cx, top, cz, Math.atan2(nx, nz), sc, null, { noCollide: true, scaleY: Math.min(2.5, (top - y0) / 8 / sc) });
    // climbable vines
    if (r.chance(0.5)) {
      const cw = 0.8;
      ctx.collider(Math.min(cx - tx * cw, cx + tx * cw), y0 + 0.5, Math.min(cz - tz * cw, cz + tz * cw), Math.max(cx - tx * cw, cx + tx * cw) + nx * 0.6, top, Math.max(cz - tz * cw, cz + tz * cw) + nz * 0.6, CF.CLIMB, SURF.leaves);
    }
  }
}

// --------------------------------------------------------- ground ---------
function emitLotGround(ctx, lot, spec, y0, r) {
  const g = ctx.geo.get('uber');
  const era = spec.era;
  const gy = y0 + 0.01;
  const kind = spec.ground;
  const quad = (layer, col, x0 = lot.x0, z0 = lot.z0, x1 = lot.x1, z1 = lot.z1, y = gy) => {
    g.quad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], [0, 1, 0], [x0, z1], [x1, z1], [x1, z0], [x0, z0], col, [layer, -1, 0, 0]);
  };
  if (kind === 'yard' || kind === 'park' || kind === 'wild' || kind === 'forest') quad(L.grass, era === 2 ? C('#a8c890') : C('#d8e8c0'));
  else if (kind === 'asphalt' || kind === 'parking') quad(L.asphalt, C('#ffffff'));
  else if (kind === 'plaza') quad(L.tiles, era === 1 ? C('#c8ccd0') : C('#d8ccb8'));
  else if (kind === 'dirt') quad(L.dirt, C('#ffffff'));
  else if (kind === 'ruinground') quad(L.rubble, C('#c8c8b8'));
  else quad(L.concrete, C('#d8d4cc'));

  const W = lot.x1 - lot.x0, D = lot.z1 - lot.z0;
  const f = spec.f;
  // parking stripes
  if (kind === 'parking') {
    const lines = ctx.geo.get('uber');
    for (let x = lot.x0 + 3; x < lot.x1 - 3; x += 2.8) {
      for (const zr of [[lot.z0 + 2, lot.z0 + 7.5], [lot.z1 - 7.5, lot.z1 - 2]]) {
        lines.quad([x, gy + 0.01, zr[1]], [x + 0.12, gy + 0.01, zr[1]], [x + 0.12, gy + 0.01, zr[0]], [x, gy + 0.01, zr[0]], [0, 1, 0], [0, 0], [1, 0], [1, 1], [0, 1], C('#e8e8e0'), [L.paint, -1, 0, 0]);
        ctx.parking.push({ x: x + 1.4, z: (zr[0] + zr[1]) / 2, yaw: 0 });
      }
    }
    if (era < 2) for (let i = 0; i < 2; i++) placeProp(ctx, era === 0 ? 'lamp96' : 'lamp47', lot.x0 + W * (0.3 + i * 0.4), gy, (lot.z0 + lot.z1) / 2, 0);
  }
  if (kind === 'plaza') {
    const cx = (lot.x0 + lot.x1) / 2, cz = (lot.z0 + lot.z1) / 2;
    if (f.plaza === 'fountain' && era < 2) placeProp(ctx, 'fountain', cx, gy, cz);
    else if (f.plaza === 'statue' || f.keepStatue) placeProp(ctx, 'statue', cx, gy, cz, r.range(0, 6));
    else if (f.plaza === 'holo') placeProp(ctx, 'holopillar', cx, gy, cz);
    for (let i = 0; i < 4; i++) placeProp(ctx, 'bench', cx + (i % 2 ? 6 : -6), gy, cz + (i < 2 ? 6 : -6), (i % 2 ? -1 : 1) * Math.PI / 2);
    const tn = f.plaza === 'trees' ? 8 : 4;
    for (let i = 0; i < tn; i++) {
      const tx = lot.x0 + 3 + r.next() * (W - 6), tz = lot.z0 + 3 + r.next() * (D - 6);
      if (Math.hypot(tx - cx, tz - cz) < 6) continue;
      ctx.tree(tx, gy, tz, r);
    }
  }
  if (kind === 'yard' || (era === 2 && kind === 'wild')) {
    if (f.yardTree || era === 2) {
      const n = era === 2 ? (f.wildTrees || 2) : 1 + (r.chance(0.4) ? 1 : 0);
      for (let i = 0; i < n; i++) ctx.tree(lot.x0 + 2 + r.next() * (W - 4), gy, lot.z0 + 2 + r.next() * (D - 4), r, era === 2 ? 1.3 : 1);
    }
    if (era === 2) for (let i = 0; i < 6; i++) placeProp(ctx, 'bush_' + r.int(0, 2), lot.x0 + r.next() * W, gy, lot.z0 + r.next() * D, r.range(0, 6), r.range(0.8, 1.6), null, { noCollide: true });
  }
  if (kind === 'park' || kind === 'forest') {
    const n = Math.floor(W * D / (era === 2 ? 90 : 160));
    for (let i = 0; i < n; i++) ctx.tree(lot.x0 + 3 + r.next() * (W - 6), gy, lot.z0 + 3 + r.next() * (D - 6), r, era === 2 ? 1.5 : 1);
    if (era < 2) for (let i = 0; i < 6; i++) placeProp(ctx, 'bench', lot.x0 + 6 + r.next() * (W - 12), gy, lot.z0 + 6 + r.next() * (D - 12), r.int(0, 3) * Math.PI / 2);
    for (let i = 0; i < 10; i++) placeProp(ctx, 'bush_' + r.int(0, 2), lot.x0 + r.next() * W, gy, lot.z0 + r.next() * D, r.range(0, 6), r.range(0.8, 1.4), null, { noCollide: true });
  }
  if (kind === 'dirt' && f.junk) {
    for (let i = 0; i < 4; i++) placeProp(ctx, 'grass_tuft', lot.x0 + r.next() * W, gy, lot.z0 + r.next() * D, r.range(0, 6), r.range(0.8, 1.4), null, { noCollide: true });
    placeProp(ctx, r.pick(['wreck_0', 'wreck_1', 'wreck_2']), lot.x0 + W * 0.5, gy, lot.z0 + D * 0.5, r.range(0, 6));
    for (let i = 0; i < 3; i++) placeProp(ctx, r.pick(['drum', 'pallet', 'crate']), lot.x0 + r.next() * W, gy, lot.z0 + r.next() * D, r.range(0, 6));
  }
  if (f.containers) {
    const n = f.containers;
    for (let i = 0; i < n; i++) {
      const stack = era === 2 ? 1 : r.int(1, f.stack || 2);
      const x = lot.x0 + 5 + r.next() * Math.max(1, W - 10), z = lot.z0 + 4 + r.next() * Math.max(1, D - 8);
      const yaw = r.chance(0.5) ? 0 : Math.PI / 2;
      for (let s = 0; s < stack; s++) placeProp(ctx, 'container_' + r.int(0, 5), x, gy + s * 2.6, z, yaw + (era === 2 ? r.range(-0.1, 0.1) : 0), 1, era === 2 ? C('#a89080') : null);
    }
  }
  if (f.tanks) placeProp(ctx, 'tank_ind', lot.x0 + W * 0.7, gy, lot.z0 + D * 0.3, 0, era === 2 ? 0.95 : 1, era === 2 ? C('#a08070') : null);
  if (f.pool) {
    const px0 = lot.x0 + W * 0.15, px1 = px0 + Math.min(10, W * 0.4), pz0 = lot.z1 - Math.min(8, D * 0.3) - 3, pz1 = lot.z1 - 3;
    g.box(px0 - 0.4, gy - 0.02, pz0 - 0.4, px1 + 0.4, gy + 0.1, pz1 + 0.4, C('#e8e4dc'), [L.tiles, -1, 0, 0], { faces: 4 });
    ctx.geo.get('glass').quad([px0, gy + 0.11, pz1], [px1, gy + 0.11, pz1], [px1, gy + 0.11, pz0], [px0, gy + 0.11, pz0], [0, 1, 0], [0, 0], [1, 0], [1, 1], [0, 1], f.pool === 'swamp' ? C('#3a5a2a') : C('#3ab8d8'), [0, -1, 0, 0]);
  }
  // fences around yards
  if (f.fence && (kind === 'yard' || kind === 'asphalt' || kind === 'dirt' || kind === 'concrete')) {
    const name = f.fence === 'picket' ? 'fence_picket' : f.fence === 'glass' ? 'fence_glass' : 'fence_chain';
    const face = lot.face;
    const segs = [];
    const fy = gy;
    // place along the lot's non-street sides and the front with a gap
    const pushLine = (x0, z0, x1, z1, gap) => {
      const len = Math.hypot(x1 - x0, z1 - z0);
      const n = Math.floor(len / 4);
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        if (gap && Math.abs(t - 0.5) < 0.18) continue;
        segs.push([x0 + (x1 - x0) * t, z0 + (z1 - z0) * t, Math.atan2(x1 - x0, z1 - z0) + Math.PI / 2, len / n / 4]);
      }
    };
    if (kind === 'yard') {
      if (face === 0) pushLine(lot.x0 + 0.3, lot.z0 + 0.3, lot.x1 - 0.3, lot.z0 + 0.3, true);
      if (face === 2) pushLine(lot.x0 + 0.3, lot.z1 - 0.3, lot.x1 - 0.3, lot.z1 - 0.3, true);
    } else {
      pushLine(lot.x0 + 0.5, lot.z0 + 0.5, lot.x1 - 0.5, lot.z0 + 0.5, true);
      pushLine(lot.x0 + 0.5, lot.z1 - 0.5, lot.x1 - 0.5, lot.z1 - 0.5, false);
      pushLine(lot.x0 + 0.5, lot.z0 + 0.5, lot.x0 + 0.5, lot.z1 - 0.5, false);
      pushLine(lot.x1 - 0.5, lot.z0 + 0.5, lot.x1 - 0.5, lot.z1 - 0.5, false);
    }
    if (era === 2 && name !== 'fence_chain') return;
    for (const [x, z, yaw, s] of segs) placeProp(ctx, name, x, fy, z, yaw, 1, era === 2 ? C('#8a6a50') : null, { scaleX: s });
  }
  if (f.hedge && era < 2) {
    for (let x = lot.x0 + 2; x < lot.x1 - 2; x += 4) placeProp(ctx, 'hedge', x + 2, gy, lot.face === 2 ? lot.z1 - 0.8 : lot.z0 + 0.8, 0);
  }
  if (f.mailbox && era === 0) {
    const mx = (lot.x0 + lot.x1) / 2 + 3, mz = lot.face === 2 ? lot.z1 - 0.6 : lot.z0 + 0.6;
    if (lot.face === 0 || lot.face === 2) placeProp(ctx, 'mailbox', mx, gy, mz, lot.face === 2 ? 0 : Math.PI, 0.6);
  }
  if (f.driveway && era < 2 && (lot.face === 0 || lot.face === 2)) {
    const dx0 = lot.x1 - 5.5, dx1 = lot.x1 - 1.5;
    const dz0 = lot.face === 0 ? lot.z0 : lot.z1 - 9, dz1 = lot.face === 0 ? lot.z0 + 9 : lot.z1;
    g.quad([dx0, gy + 0.01, dz1], [dx1, gy + 0.01, dz1], [dx1, gy + 0.01, dz0], [dx0, gy + 0.01, dz0], [0, 1, 0], [dx0, dz1], [dx1, dz1], [dx1, dz0], [dx0, dz0], C('#d0ccc4'), [L.concrete, -1, 0, 0]);
    ctx.parking.push({ x: (dx0 + dx1) / 2, z: (dz0 + dz1) / 2, yaw: 0, driveway: true });
  }
  if (f.garden) {
    for (let i = 0; i < 6; i++) placeProp(ctx, 'bush_' + r.int(0, 2), lot.x0 + r.next() * W, gy, lot.z0 + r.next() * D, r.range(0, 6), r.range(0.8, 1.3), null, { noCollide: true });
    for (let i = 0; i < 2; i++) ctx.tree(lot.x0 + 2 + r.next() * (W - 4), gy, lot.z0 + 2 + r.next() * (D - 4), r);
  }
}

// ------------------------------------------------------------- main -------
export function emitLot(ctx, lot, era) {
  const spec = realizeLot(lot, era, ctx.facts);
  const r = eraRng(lot, era + 7);
  const y0 = lotGroundY(lot);
  emitLotGround(ctx, lot, spec, y0, r);
  if (spec.f.collapsed) {
    const W = lot.x1 - lot.x0, D = lot.z1 - lot.z0;
    const n = Math.max(2, Math.floor(W * D / 50));
    for (let i = 0; i < n; i++) placeProp(ctx, 'rubble_' + r.int(0, 3), lot.x0 + 2 + r.next() * (W - 4), y0, lot.z0 + 2 + r.next() * (D - 4), r.range(0, 6), r.range(1.2, 2.6));
    return spec;
  }
  spec.bodies.forEach((b, i) => {
    emitBody(ctx, b, y0, spec, r, i);
    if (era === 1 && spec.f.ledStrips && i === spec.bodies.length - 1 && b.h > 12) emitLedStrips(ctx, b, y0, r);
    if (era === 1 && spec.f.holo && i === spec.bodies.length - 1) emitHoloAds(ctx, b, y0, r, spec.f.holo);
  });
  const top = spec.bodies[spec.bodies.length - 1];
  if (top && top.roof === 'flat' && !top.roofGone) emitRoofProps(ctx, top, y0, spec, r);
  const main = spec.bodies[0];
  if (main && era === 0 && spec.f.fireEscape && main.h > 9) emitFireEscape(ctx, main, y0, r);
  if (main && era === 1 && spec.f.fireEscape && main.h > 9 && main.style === STYLE.BRICK && r.chance(0.5)) emitFireEscape(ctx, main, y0, r);
  if (main && era === 0 && main.roof === 'gable') {
    // porch + chimney + door
    const g = ctx.geo.get('uber');
    if (spec.f.chimney) {
      const cx = main.x0 + 1.5, cz = (main.z0 + main.z1) / 2;
      g.box(cx - 0.5, y0 + main.h - 1, cz - 0.6, cx + 0.5, y0 + main.h + 3.2, cz + 0.6, C('#d8c8c0'), [L.brick, -1, 0, 0]);
    }
  }
  if (main && main.roof === 'gable' && era < 2) emitHouseDoor(ctx, main, y0, lot, spec, r);
  if (era === 2) {
    for (const b of spec.bodies) if (b.h > 4) emitIvy(ctx, b, y0, Math.ceil((spec.f.ivy || 2) / spec.bodies.length), r);
    const n = spec.f.rubble || 0;
    for (let i = 0; i < n; i++) {
      const b = main || lot;
      const side = r.int(0, 3);
      const x = side === 1 ? b.x1 + 1.5 : side === 3 ? b.x0 - 1.5 : b.x0 + r.next() * (b.x1 - b.x0);
      const z = side === 2 ? b.z1 + 1.5 : side === 0 ? b.z0 - 1.5 : b.z0 + r.next() * (b.z1 - b.z0);
      placeProp(ctx, 'rubble_' + r.int(0, 3), x, y0, z, r.range(0, 6), r.range(0.6, 1.2));
    }
    if (spec.f.rubbleRamp) emitRubbleRamp(ctx, spec.f.rubbleRamp, y0, r);
  }
  return spec;
}

function emitHouseDoor(ctx, b, y0, lot, spec, r) {
  const g = ctx.geo.get('uber');
  const face = lot.face || 0;
  const nx = face === 1 ? 1 : face === 3 ? -1 : 0, nz = face === 2 ? 1 : face === 0 ? -1 : 0;
  const cx = nx > 0 ? b.x1 : nx < 0 ? b.x0 : (b.x0 + b.x1) / 2 - 1.5;
  const cz = nz > 0 ? b.z1 : nz < 0 ? b.z0 : (b.z0 + b.z1) / 2 - 1.5;
  const yaw = Math.atan2(nx, nz);
  g.boxRot(cx + nx * 0.03, y0 + 1.05, cz + nz * 0.03, 0.55, 1.05, 0.05, yaw, C(r.pick(['#6a2a24', '#2a3a5a', '#3a4a2a', '#e8e4dc', '#4a3020'])), [L.wood, -1, 0, 0]);
  if (spec.f.porch) {
    const px = cx + nx * 1.4, pz = cz + nz * 1.4;
    g.boxRot(px, y0 + 0.15, pz, 2.4, 0.15, 1.4, yaw, C('#b8a890'), [L.wood, -1, 0, 0]);
    g.boxRot(px + nx * 1.1, y0 + 2.8, pz + nz * 1.1, 2.6, 0.08, 0.5, yaw, C('#6a5a4a'), [L.wood, -1, 0, 0]);
    const tx = -nz, tz = nx;
    for (const s of [-2.2, 2.2]) g.boxRot(px + nx * 1.2 + tx * s, y0 + 1.4, pz + nz * 1.2 + tz * s, 0.08, 1.4, 0.08, yaw, C('#e8e4dc'), [L.paint, -1, 0, 0]);
    ctx.collider(Math.min(px - 2.4, px + 2.4), y0, Math.min(pz - 1.4, pz + 1.4), Math.max(px - 2.4, px + 2.4), y0 + 0.3, Math.max(pz - 1.4, pz + 1.4), CF.SOLID, SURF.wood);
  }
}

function emitRubbleRamp(ctx, rr, y0, r) {
  // A sloped debris pile from the street up onto the fallen half — climbable
  // route into the upper floors of the standing half.
  const f = rr.fallen;
  const g = ctx.geo.get('uber');
  const topY = y0 + f.h;
  let x0 = f.x0, x1 = f.x1, z0 = f.z0, z1 = f.z1;
  let axis, ya, yb;
  if (rr.splitX) {
    // ramp runs along x away from the standing half
    const standingLeft = rr.standing.x1 <= f.x0 + 0.01;
    const len = Math.min(12, topY - y0 + 6);
    if (standingLeft) { x0 = f.x1; x1 = f.x1 + len; ya = topY; yb = y0; } else { x1 = f.x0; x0 = f.x0 - len; ya = y0; yb = topY; }
    axis = 'x';
  } else {
    const standingTop = rr.standing.z1 <= f.z0 + 0.01;
    const len = Math.min(12, topY - y0 + 6);
    if (standingTop) { z0 = f.z1; z1 = f.z1 + len; ya = topY; yb = y0; } else { z1 = f.z0; z0 = f.z0 - len; ya = y0; yb = topY; }
    axis = 'z';
  }
  const b = ctx.block;
  x0 = Math.max(x0, b.x0 - 3); x1 = Math.min(x1, b.x1 + 3); z0 = Math.max(z0, b.z0 - 3); z1 = Math.min(z1, b.z1 + 3);
  if (x1 - x0 < 2 || z1 - z0 < 2) return;
  ctx.ramp(x0, z0, x1, z1, ya, yb, axis);
  // visual: sloped quad + scattered chunks
  const col = C('#8a8478');
  const m = [L.rubble, -1, 0, 0];
  if (axis === 'x') {
    g.quad([x0, ya, z1], [x1, yb, z1], [x1, yb, z0], [x0, ya, z0], [0, 1, 0], [x0, z1], [x1, z1], [x1, z0], [x0, z0], col, m);
  } else {
    g.quad([x0, ya, z0], [x0, yb, z1], [x1, yb, z1], [x1, ya, z0], [0, 1, 0], [x0, z0], [x0, z1], [x1, z1], [x1, z0], col, m);
  }
  for (let i = 0; i < 10; i++) {
    const t = r.next();
    const x = axis === 'x' ? x0 + (x1 - x0) * t : x0 + r.next() * (x1 - x0);
    const z = axis === 'z' ? z0 + (z1 - z0) * t : z0 + r.next() * (z1 - z0);
    const y = ya + (yb - ya) * t;
    placeProp(ctx, 'rubble_' + r.int(0, 3), x, y - 0.6, z, r.range(0, 6), r.range(0.4, 0.8), null, { noCollide: true });
  }
}

// Far-LOD: simple boxes for every building of a chunk (no details)
export function emitLotFar(gb, lot, era, facts) {
  const spec = realizeLot(lot, era, facts);
  if (spec.f.collapsed) return;
  const y0 = lotGroundY(lot);
  for (const b of spec.bodies) {
    if (b.h < 6 && b.roof !== 'gable') continue;
    let style = b.style + (b.store ? STORE : 0) + (spec.f.abandoned ? ABANDONED : 0);
    const baseY = b.baseOffset !== undefined ? y0 + b.baseOffset : y0 - 0.5;
    gb.box(b.x0, baseY, b.z0, b.x1, y0 + b.h, b.z1, b.col, [b.layer, style, b.seed, b.floorH], {
      faces: 1 | 2 | 4 | 16 | 32, vBase: y0, uBase: (b.seed * 97) % 40, topM: [b.roofLayer, -1, b.seed, 0], topCol: b.roofCol,
    });
    if (b.roof === 'gable' && !b.roofGone) {
      const rh = Math.min(b.x1 - b.x0, b.z1 - b.z0) * 0.38;
      gb.gable(b.x0, b.z0, b.x1, b.z1, y0 + b.h, rh, b.roofAxis || 'x', b.roofCol, [b.roofLayer, -1, 0, 0], 0.3);
    }
  }
}
