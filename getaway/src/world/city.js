// GETAWAY! — Port Sol procedural city generator
import * as THREE from 'three';
import { makeRng, clamp, lerp, smoothstep, noise2 } from '../core/utils.js';
import { StaticWorld } from './static.js';
import { Builder } from './builder.js';
import * as T from './textures.js';
import { XS, ZS, HR, CURB, RIVER, WATER_Y, SEA_X, SEA_Z, BEACH_Z0, BRIDGES_Z, TUNNEL, HWY, RAIL_Z, AIRPORT, REMOVED_EW, LANDMARKS, district, roadKind } from './layout.js';
import { buildInfrastructure } from './infra.js';
import { buildLandmarks } from './landmarks.js';

export const SHOP_NAMES = ['SOL BURGER', 'LUCKY DRAGON', 'VINYL VAULT', 'PIXEL PALACE', "MAMA ROSA'S", 'QUIK MART', 'NEON NOODLE', 'BLUE MOON BAR', 'GOLD & CO.', 'TACO TORNADO', 'FLEX GYM', 'DONUT DYNASTY', 'PAWN KINGS', 'SUNSET LIQUOR', 'MERIDIAN BOOKS', 'ZIP CELL', "KICKS 'N' DRIP", 'CAFE SOLEIL', 'BOMBSHELL SALON', 'OCEAN OPTICS', 'THE GREASE PIT', 'WOK THIS WAY', 'SUSHI SAMURAI', 'HOT YOGA HUT', 'SUNNY DELI', 'BURNOUT AUTO', 'SMOKE & MIRRORS', 'ROXY CINEMA', 'DIAMOND DINER', 'CHROME CAFE', 'SPIN CYCLE', 'PHARMACY 24', 'ARCADE ZONE', "BIG TONY'S PIZZA", 'FRESH CUTZ', 'GADGET GURU', 'BAIT & TACKLE', 'SURF SHACK', 'HOTEL MIRAGE', 'NIGHT OWL', 'BODEGA SOL', 'TATTOO TEMPLE', 'POKE BOWL', 'LUXE JEWELS', 'RECORD RIOT', 'BREW HAHA', 'CRAB SHACK', 'MOTEL 9', 'CASH 4 GOLD', 'GLAMOUR NAILS', 'PET PALACE', 'KARAOKE KING', 'BAKERY', 'HARDWARE', 'FLORIST', 'BIKE SHOP', 'GAME STOP & GO', 'ICE CREAM', 'LAUNDRY', 'DENTIST', 'HALCYON SECURITY', 'SOL TELECOM', 'BANK ATM', 'POLICE'];

export function generateCity(scene, quality = 'high') {
  const rng = makeRng(20261101);
  const S = new StaticWorld(24);
  const B = new Builder(200);
  const root = new THREE.Group(); root.name = 'city'; scene.add(root);
  const mats = makeMaterials();
  S.terrainFn = terrainHeight;
  S.terrainMat = (x, z) => (z > BEACH_Z0 + 20 ? 'sand' : (x > -830 && x < SEA_X && z > -830) || (x < AIRPORT.x1 && x > AIRPORT.x0 && z > AIRPORT.z0 && z < AIRPORT.z1) || Math.abs(z + 550) < 30 || Math.abs(z + 300) < 10 ? 'asphalt' : 'ground');
  const ctx = { S, B, mats, rng, root, props: [], trees: [], lights: [], glass: [], parking: [], pedAreas: [], wander: [], landmarks: {}, nightMats: mats._night, interiorLights: [], billboards: [], spawnRoads: [], ladders: [], climbs: [] };
  setupHelpers(ctx);

  // ---------- water + terrain holes ----------
  S.addHole(RIVER.x0, -1400, RIVER.x1, SEA_Z + 400);
  S.addWater(RIVER.x0, -1400, RIVER.x1, SEA_Z + 400, WATER_Y);
  S.addWater(SEA_X, -1400, 3000, 3000, WATER_Y);
  S.addWater(-3000, SEA_Z - 40, 3000, 3000, WATER_Y);
  S.addHole(SEA_X, -1400, 3000, 3000);
  S.addHole(TUNNEL.x0, TUNNEL.z - HR, TUNNEL.x1, TUNNEL.z + HR);

  // ---------- road network graph ----------
  ctx.graph = buildGraph();

  // ---------- infrastructure (roads, bridges, highway, tunnel, rail, quays) ----------
  buildInfrastructure(ctx);

  // ---------- blocks ----------
  const reserved = Object.values(LANDMARKS).filter((l) => l.x0 !== undefined && l.z0 !== undefined);
  const isReserved = (x0, z0, x1, z1) => reserved.some((l) => x0 < l.x1 && x1 > l.x0 && z0 < l.z1 && z1 > l.z0);
  for (let i = 0; i < XS.length - 1; i++) {
    const xa = XS[i], xb = XS[i + 1]; if (xb - xa !== 100) continue;
    for (let j = 0; j < ZS.length - 1; j++) {
      const za = ZS[j], zb = ZS[j + 1];
      const merged = REMOVED_EW.find((r) => r.xa === xa && (r.z === za || r.z === zb));
      if (merged && merged.z === za) continue; // handled by the block above
      const zEnd = merged ? zb + 100 : zb;
      const bx0 = xa + HR, bx1 = xb - HR, bz0 = za + HR, bz1 = zEnd - HR;
      // curb slab (sidewalk level) for whole block
      ctx.slab(bx0, bz0, bx1, bz1);
      const ix0 = bx0 + 4, ix1 = bx1 - 4, iz0 = bz0 + 4, iz1 = bz1 - 4;
      if (isReserved(ix0, iz0, ix1, iz1)) continue;
      const cx = (xa + xb) / 2, cz = (za + zEnd) / 2; const d = district(cx, cz);
      const special = (za === -600 && zb === -500) ? 'hwy' : (za === -700 && zb === -600) ? 'rail' : null;
      fillBlock(ctx, d, special, ix0, iz0, ix1, iz1, rng);
    }
  }
  // river strips (between road 300/500 and the river)
  for (let j = 0; j < ZS.length - 1; j++) {
    const za = ZS[j], zb = ZS[j + 1];
    ctx.slab(300 + HR, za + HR, RIVER.x0, zb - HR, 'walk'); ctx.slab(RIVER.x1, za + HR, 500 - HR, zb - HR, 'walk');
    promenade(ctx, 300 + HR + 4, za + HR, RIVER.x0, zb - HR, rng, -1);
    promenade(ctx, RIVER.x1, za + HR, 500 - HR - 4, zb - HR, rng, 1);
  }
  // port quay strip (x 708..790)
  for (let j = 0; j < ZS.length - 1; j++) { const za = ZS[j], zb = ZS[j + 1]; ctx.slab(700 + HR, za + HR, SEA_X, zb - HR, 'lot'); portQuay(ctx, 700 + HR + 4, za + HR + 2, SEA_X - 2, zb - HR - 2, rng); }

  buildLandmarks(ctx);
  buildGround(ctx);
  beach(ctx, rng);
  hills(ctx, root, mats);
  airport(ctx, rng);

  const meshes = B.build(mats, root, { shadows: true });
  const water = makeWater(root, mats);
  return { static: S, graph: ctx.graph, mats, root, meshes, water, props: ctx.props, trees: ctx.trees, lights: ctx.lights, glass: ctx.glass, parking: ctx.parking, pedAreas: ctx.pedAreas, wander: ctx.wander, landmarks: ctx.landmarks, nightMats: mats._night, billboards: ctx.billboards, ladders: ctx.ladders, climbs: ctx.climbs, interiorLights: ctx.interiorLights, district, terrainHeight };
}

// ---------------- terrain ----------------
export function terrainHeight(x, z) {
  // beach slope into the sea
  if (z > BEACH_Z0 + 28 && x < SEA_X) { const t = (z - (BEACH_Z0 + 28)) / (SEA_Z + 40 - BEACH_Z0 - 28); return t < 1 ? lerp(0.05, -1.6, smoothstep(0, 1, t)) : -5; }
  if (x > SEA_X) return -5;
  if (x >= RIVER.x0 && x <= RIVER.x1) return RIVER.bed;
  // northern hills
  if (z < -830) { const t = (-830 - z); const n = noise2(x * 0.004, z * 0.004) * 60 + noise2(x * 0.015, z * 0.015) * 14; return Math.min(240, t * 0.28 + Math.max(0, t - 150) * 0.5) * (0.6 + n / 90) ; }
  // west of the city: gentle rolling grass towards airport (flat at airport)
  if (x < -830 && (x > AIRPORT.x1 + 60 || z < AIRPORT.z0 || z > AIRPORT.z1)) { const t = Math.min(1, (-830 - x) / 60); if (z > -580 && z < -520) return 0; if (z > -310 && z < -290) return 0; return t * (noise2(x * 0.01, z * 0.01) * 3); }
  return 0;
}

// ---------------- materials ----------------
function makeMaterials() {
  const night = [];
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const rep = (t, x, y) => { const c = t.clone(); c.needsUpdate = true; c.repeat.set(x, y); return c; };
  const m = {
    default: std({ color: 0x888888, roughness: 0.8 }),
    road: std({ map: T.roadMarked(2), roughness: 0.92, metalness: 0 }),
    roadRes: std({ map: T.roadMarked(1, 'res'), roughness: 0.92 }),
    hwy: std({ map: T.roadMarked(3, 'hwy'), roughness: 0.9 }),
    isect: std({ map: T.intersection(), roughness: 0.92 }),
    asphalt: std({ map: T.asphalt(), roughness: 0.93 }),
    walk: std({ map: T.sidewalk(), roughness: 0.85 }),
    curb: std({ color: 0xa9a59d, roughness: 0.8 }),
    grass: std({ map: T.grass(), roughness: 1 }),
    sand: std({ map: T.sand(), roughness: 1 }),
    plaza: std({ map: T.plaza(), roughness: 0.75 }),
    lot: std({ map: T.concrete(), roughness: 0.9 }),
    concrete: std({ map: T.concrete(), roughness: 0.85, color: 0xd0ccc4 }),
    dirt: std({ map: T.dirt(), roughness: 1 }),
    rails: std({ map: T.rails(), roughness: 0.9 }),
    roof: std({ map: T.concrete(), color: 0x8a8781, roughness: 0.95 }),
    metal: std({ color: 0x8b9096, roughness: 0.45, metalness: 0.7 }),
    steel: std({ color: 0xc0562a, roughness: 0.6, metalness: 0.5 }),
    yellowSteel: std({ color: 0xe0a91c, roughness: 0.5, metalness: 0.4 }),
    wood: std({ color: 0x8a6440, roughness: 0.9 }),
    vc: std({ vertexColors: true, roughness: 0.7, metalness: 0.1 }),
    vcMetal: std({ vertexColors: true, roughness: 0.35, metalness: 0.75 }),
    glow: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
    glassDark: std({ color: 0x1b2a33, roughness: 0.05, metalness: 0.9 }),
    tunnelWall: std({ color: 0xc9c6bd, roughness: 0.6, map: T.concrete() }),
  };
  // facades
  const styles = { glass: 4, office: 4, brick: 4, plaster: 4, warehouse: 4, house: 4, tower: 4, deco: 4, garage: 2, shop: 1, construction: 1, bank: 1 };
  for (const [s, n] of Object.entries(styles)) for (let v = 0; v < n; v++) {
    const f = T.facade(s, v); const reflective = s === 'glass' || s === 'tower';
    const mat = std({ map: f.map, emissiveMap: f.emissive, emissive: 0xffffff, emissiveIntensity: 0, roughnessMap: f.rm, metalnessMap: f.rm, roughness: reflective ? 0.55 : 1, metalness: reflective ? 1 : 0.9, envMapIntensity: reflective ? 1.2 : 1.0 });
    mat.userData.night = s === 'shop' ? 1.1 : 1.0; night.push(mat); m[`fac_${s}_${v}`] = mat;
  }
  // sign atlas
  const atlas = makeSignAtlas(); m.signs = std({ map: atlas.tex, emissiveMap: atlas.tex, emissive: 0xffffff, emissiveIntensity: 0.15, roughness: 0.5 }); m.signs.userData.night = 1.3; m.signs.userData.day = 0.15; night.push(m.signs);
  m._atlas = atlas;
  m.lightPanels = new THREE.MeshBasicMaterial({ color: 0xfff2d8, toneMapped: false });
  m._night = night;
  return m;
}
function makeSignAtlas() {
  const W = 2048, H = 2048, cols = 4, rows = 16, sw = W / cols, sh = H / rows;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); const r = makeRng(99);
  const pal = [['#c0392b', '#fff'], ['#1e3799', '#f6e58d'], ['#111', '#ff4fd8'], ['#f39c12', '#222'], ['#16a085', '#fff'], ['#2c2c54', '#33d9b2'], ['#fff', '#c0392b'], ['#222', '#ffd32a'], ['#8e44ad', '#fff'], ['#e1e1e1', '#1e272e'], ['#0a3d62', '#fff'], ['#b33939', '#ffda79']];
  const fonts = ['900 {s}px "Arial Black", Impact, sans-serif', 'bold italic {s}px Georgia, serif', 'bold {s}px "Trebuchet MS", sans-serif', '900 italic {s}px Impact, sans-serif'];
  SHOP_NAMES.forEach((name, i) => {
    const x = (i % cols) * sw, y = Math.floor(i / cols) * sh; const [bg, fg] = name === 'POLICE' ? ['#0b2a6b', '#fff'] : name === 'HALCYON SECURITY' ? ['#0d0f12', '#c8a24a'] : pal[(r() * pal.length) | 0];
    g.fillStyle = bg; g.fillRect(x + 2, y + 2, sw - 4, sh - 4); g.strokeStyle = fg; g.globalAlpha = 0.5; g.lineWidth = 4; g.strokeRect(x + 8, y + 8, sw - 16, sh - 16); g.globalAlpha = 1;
    let s = sh * 0.6; const f = fonts[(r() * fonts.length) | 0]; g.font = f.replace('{s}', s); while (g.measureText(name).width > sw * 0.88) { s *= 0.92; g.font = f.replace('{s}', s); }
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = fg; g.shadowBlur = 8; g.fillText(name, x + sw / 2, y + sh / 2 + 3); g.shadowBlur = 0;
  });
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const uv = (i) => { const col = i % cols, row = Math.floor(i / cols); return [col / cols, 1 - (row + 1) / rows, (col + 1) / cols, 1 - row / rows]; };
  return { tex, uv, count: SHOP_NAMES.length };
}

// ---------------- helpers on ctx ----------------
const FACADE_DIMS = T.FACADES;
function setupHelpers(ctx) {
  const { S, B, mats } = ctx;
  ctx.facMat = (style, v) => { const n = { garage: 2, shop: 1, construction: 1, bank: 1 }[style] || 4; return `fac_${style}_${v % n}`; };
  ctx.solid = (mat, x0, y0, z0, x1, y1, z1, o = {}) => {
    const b = S.addBox(x0, y0, z0, x1, y1, z1, o);
    B.box(mat, x0, y0, z0, x1, y1, z1, { tw: o.tw || 4, th: o.th, faces: o.faces || (o.top ? 'pz nz px nx ny' : 'all'), base: o.base, color: o.color });
    if (o.top) B.box(o.top, x0, y0, z0, x1, y1, z1, { tw: o.topTw || 8, faces: 'py' });
    return b;
  };
  ctx.deco = (mat, x0, y0, z0, x1, y1, z1, o = {}) => B.box(mat, x0, y0, z0, x1, y1, z1, o);
  ctx.vbox = (color, x0, y0, z0, x1, y1, z1, solid = false, o = {}) => { B.box(o.metal ? 'vcMetal' : 'vc', x0, y0, z0, x1, y1, z1, { color: hex3(color), faces: o.faces }); if (solid) return S.addBox(x0, y0, z0, x1, y1, z1, o); };
  ctx.glowBox = (color, x0, y0, z0, x1, y1, z1) => B.box('glow', x0, y0, z0, x1, y1, z1, { color: hex3(color) });
  ctx.slab = (x0, z0, x1, z1, mat = 'walk') => {
    S.addBox(x0, -0.5, z0, x1, CURB, z1, { mat: 'concrete', solid: false });
    B.box(mat, x0, CURB - 0.001, z0, x1, CURB, z1, { tw: 4, faces: 'py', topScale: mat === 'walk' ? 4 : 8 });
    B.box('curb', x0, -0.02, z0, x1, CURB, z1, { tw: 4, faces: 'pz nz px nx' });
  };
  ctx.groundQuad = (mat, x0, z0, x1, z1, y = CURB + 0.005, scale = 8) => B.box(mat, x0, y - 0.001, z0, x1, y, z1, { faces: 'py', topScale: scale });
  // vertical quad facing a direction ('pz','nz','px','nx'), uvRect [u0,v0,u1,v1]
  ctx.vquad = (mat, cx, cy, cz, w, h, face, uvr = [0, 0, 1, 1]) => {
    const [u0, v0, u1, v1] = uvr; const hw = w / 2, hh = h / 2; let p;
    if (face === 'pz') p = [[cx - hw, cy - hh, cz], [cx + hw, cy - hh, cz], [cx + hw, cy + hh, cz], [cx - hw, cy + hh, cz]];
    else if (face === 'nz') p = [[cx + hw, cy - hh, cz], [cx - hw, cy - hh, cz], [cx - hw, cy + hh, cz], [cx + hw, cy + hh, cz]];
    else if (face === 'px') p = [[cx, cy - hh, cz + hw], [cx, cy - hh, cz - hw], [cx, cy + hh, cz - hw], [cx, cy + hh, cz + hw]];
    else p = [[cx, cy - hh, cz - hw], [cx, cy - hh, cz + hw], [cx, cy + hh, cz + hw], [cx, cy + hh, cz - hw]];
    const n = { pz: [0, 0, 1], nz: [0, 0, -1], px: [1, 0, 0], nx: [-1, 0, 0] }[face];
    B.quad(mat, p, [u0, v0, u1, v0, u1, v1, u0, v1], n);
  };
  ctx.sign = (idx, cx, cy, cz, w, h, face) => ctx.vquad('signs', cx, cy, cz, w, h, face, mats._atlas.uv(idx % mats._atlas.count));
  ctx.prop = (type, x, z, yaw = 0, y = CURB) => ctx.props.push({ type, x, y, z, yaw });
  ctx.tree = (x, z, kind = 'round', s = 1, y = CURB) => ctx.trees.push({ x, y, z, kind, s });
  // generic building with facade sides, roof top, parapet and rooftop clutter
  ctx.building = (x0, z0, x1, z1, h, style, v, o = {}) => {
    const y0 = o.y0 ?? CURB; const f = FACADE_DIMS[style];
    const box = S.addBox(x0, y0 - 0.2, z0, x1, h, z1, { mat: style === 'glass' || style === 'tower' ? 'glass' : 'concrete', climb: !!o.climb, tag: 'building' });
    const mat = ctx.facMat(style, v);
    B.box(mat, x0, y0, z0, x1, h, z1, { tw: f.tw, th: f.th, faces: 'pz nz px nx', base: y0 + (o.groundFloor ? 0 : 0) });
    B.box('roof', x0, h - 0.01, z0, x1, h, z1, { faces: 'py', topScale: 8 });
    if (o.parapet !== false && (x1 - x0) > 6) {
      const p = 0.35, ph = 1.0, col = o.parapetColor || 0x8f8b84;
      ctx.vbox(col, x0, h, z0, x1, h + ph, z0 + p, true); ctx.vbox(col, x0, h, z1 - p, x1, h + ph, z1, true);
      ctx.vbox(col, x0, h, z0 + p, x0 + p, h + ph, z1 - p, true); ctx.vbox(col, x1 - p, h, z0 + p, x1, h + ph, z1 - p, true);
    }
    if (o.clutter !== false) roofClutter(ctx, x0, z0, x1, z1, h, ctx.rng, o.tall);
    trim(ctx, x0, z0, x1, z1, y0, h, style, f);
    return box;
  };
  // street-level shopfront on a face: sign + awning + breakable glass pane
  ctx.shopfront = (x0, x1, z, face, rng, o = {}) => { // along X at plane z (face pz/nz) or along Z at plane x (face px/nx) — x0,x1 are along-face coords
    const along = face === 'pz' || face === 'nz'; const out = face === 'pz' || face === 'px' ? 1 : -1; const w = x1 - x0; const mid = (x0 + x1) / 2;
    const y0 = CURB, y1 = CURB + 4.2; const off = out * 0.06;
    // shop interior facade panel
    if (along) ctx.vquad(ctx.facMat('shop', 0), mid, (y0 + y1) / 2, z + off, w - 0.6, y1 - y0, face);
    else ctx.vquad(ctx.facMat('shop', 0), z + off, (y0 + y1) / 2, mid, w - 0.6, y1 - y0, face);
    // sign
    const si = o.sign ?? Math.floor(rng() * (SHOP_NAMES.length - 4)); const sw = Math.min(w - 1, 7), sy = y1 + 0.75;
    if (along) ctx.sign(si, mid, sy, z + out * 0.12, sw, 1.3, face); else ctx.sign(si, z + out * 0.12, sy, mid, sw, 1.3, face);
    // awning
    if (rng() < 0.65) {
      const cols = [0xc0392b, 0x1e5799, 0x27ae60, 0xf1c40f, 0x8e44ad, 0xe67e22, 0x2d3436]; const col = cols[(rng() * cols.length) | 0];
      const geo = new THREE.BoxGeometry(along ? w - 0.8 : 1.8, 0.08, along ? 1.8 : w - 0.8); const mtx = new THREE.Matrix4();
      const rot = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(along ? 1 : 0, 0, along ? 0 : 1), (along ? -out : out) * 0.35);
      if (along) mtx.makeTranslation(mid, y1 - 0.2, z + out * 0.9); else mtx.makeTranslation(z + out * 0.9, y1 - 0.2, mid);
      mtx.multiply(rot); B.geom('vc', geo, mtx, { color: hex3(col) });
    }
    // breakable glass pane
    const gp = { face, along, a0: x0 + 0.4, a1: x1 - 0.4, c: z + out * 0.18, y0: y0 + 0.4, y1: y1 - 0.2 };
    ctx.glass.push(gp);
  };
}
export function hex3(c) { return [((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255]; }

const TRIM = { brick: [0xc9b9a0, 0x8f7b66], plaster: [0xf1e6cf, 0xb9a98c], office: [0xd9d6cf, 0x8d8a85], deco: [0xe6dcc6, 0x9c8f78], house: [0xffffff, 0x9a9389], warehouse: [0x6d747b, 0x50565c], glass: [0xbfc8cf, 0x39434c], tower: [0x9aa6b0, 0x2a333b], bank: [0xefe9dc, 0xa79f8d], garage: [0xcfcac2, 0x8a8781] };
function trim(ctx, x0, z0, x1, z1, y0, h, style, f) {
  const [lite, dark] = TRIM[style] || TRIM.office; const w = x1 - x0, d = z1 - z0; if (w < 5 || d < 5) return;
  const band = (y, hh, out, col) => { ctx.vbox(col, x0 - out, y, z0 - out, x1 + out, y + hh, z0); ctx.vbox(col, x0 - out, y, z1, x1 + out, y + hh, z1 + out); ctx.vbox(col, x0 - out, y, z0, x0, y + hh, z1); ctx.vbox(col, x1, y, z0, x1 + out, y + hh, z1); };
  // stone plinth
  if (y0 < 1) band(y0, 0.55, 0.08, dark);
  if (style === 'glass' || style === 'tower') { band(h - 0.9, 0.9, 0.12, lite); for (let y = y0 + f.th; y < h - 2; y += f.th) band(y - 0.12, 0.12, 0.04, dark); return; }
  if (style === 'warehouse') { band(h - 0.5, 0.5, 0.15, dark); return; }
  // cornice + floor bands + corner pilasters
  band(h - 0.75, 0.75, 0.35, lite); band(h - 1.0, 0.25, 0.18, dark);
  const fh = f.th / f.floors; let n = 0; for (let y = y0 + fh; y < h - 1.5; y += fh) { if (++n % (style === 'house' ? 1 : 2) === 0 || n === 1) band(y - 0.1, 0.22, 0.12, lite); }
  if (h - y0 > 6) for (const [cx, cz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) ctx.vbox(lite, cx - 0.35, y0, cz - 0.35, cx + 0.35, h - 0.75, cz + 0.35);
}
function roofClutter(ctx, x0, z0, x1, z1, h, rng, tall) {
  const w = x1 - x0, d = z1 - z0; if (w < 8 || d < 8) return;
  const n = Math.min(6, Math.floor((w * d) / 250) + 1);
  for (let i = 0; i < n; i++) {
    const sx = 1.5 + rng() * 2.5, sz = 1.5 + rng() * 2.5, sy = 1 + rng() * 1.6;
    const x = x0 + 2 + rng() * (w - 4 - sx), z = z0 + 2 + rng() * (d - 4 - sz);
    ctx.vbox(rng() < 0.5 ? 0xb8bcc0 : 0x9aa0a6, x, h, z, x + sx, h + sy, z + sz, true, { metal: true });
  }
  if (rng() < 0.3 && !tall) { // water tower
    const cx = x0 + w * 0.3, cz = z0 + d * 0.3; const geo = new THREE.CylinderGeometry(1.8, 1.8, 3.2, 14); ctx.B.geom('wood', geo, new THREE.Matrix4().makeTranslation(cx, h + 4.6, cz));
    const cone = new THREE.ConeGeometry(2.0, 1.2, 14); ctx.B.geom('vc', cone, new THREE.Matrix4().makeTranslation(cx, h + 6.8, cz), { color: hex3(0x5a4a3a) });
    for (const [dx, dz] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]]) ctx.vbox(0x333333, cx + dx - 0.1, h, cz + dz - 0.1, cx + dx + 0.1, h + 3, cz + dz + 0.1);
  }
  if (tall && rng() < 0.6) { const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2; ctx.vbox(0xcccccc, cx - 0.15, h, cz - 0.15, cx + 0.15, h + 10 + rng() * 14, cz + 0.15, false, { metal: true }); ctx.glowBox(0xff2020, cx - 0.3, h + 24, cz - 0.3, cx + 0.3, h + 24.6, cz + 0.3); }
}

// ---------------- road graph ----------------
function buildGraph() {
  const nodes = [], edges = [], key = new Map();
  const node = (x, z, y = 0, kind = 'isect') => { const k = x + ',' + z + ',' + y; if (key.has(k)) return key.get(k); const n = { id: nodes.length, x, y, z, kind, out: [], inn: [], light: kind === 'isect', phase: ((x + z) * 0.013) % 27 }; nodes.push(n); key.set(k, n); return n; };
  const edge = (a, b, pts, o = {}) => {
    const mk = (p, q, P) => { let len = 0; for (let i = 1; i < P.length; i++) len += Math.hypot(P[i].x - P[i - 1].x, P[i].y - P[i - 1].y, P[i].z - P[i - 1].z); const e = { id: edges.length, a: p.id, b: q.id, pts: P, len, lanes: o.lanes || 2, speed: o.speed || 15, kind: o.kind || 'city', tunnel: !!o.tunnel, hwy: !!o.hwy }; edges.push(e); p.out.push(e.id); q.inn.push(e.id); return e; };
    const P = pts || [{ x: a.x, y: a.y, z: a.z }, { x: b.x, y: b.y, z: b.z }];
    mk(a, b, P); if (!o.oneway) mk(b, a, [...P].reverse());
  };
  const isRiver = (x) => x > 300 && x < 500;
  // grid nodes
  for (const x of XS) for (const z of ZS) node(x, z);
  // north-south roads
  for (const x of XS) for (let j = 0; j < ZS.length - 1; j++) { const z = ZS[j], z2 = ZS[j + 1]; const k = roadKind(x, (z + z2) / 2); edge(node(x, z), node(x, z2), null, { kind: k, lanes: k === 'res' ? 1 : 2, speed: k === 'res' ? 12 : 15 }); }
  // east-west roads
  for (const z of ZS) for (let i = 0; i < XS.length - 1; i++) {
    const x = XS[i], x2 = XS[i + 1];
    if (REMOVED_EW.some((r) => r.z === z && r.xa === x)) continue;
    if (x === 300 && x2 === 500) {
      if (BRIDGES_Z.includes(z)) edge(node(x, z), node(x2, z), null, { kind: 'city', lanes: 2, speed: 17 });
      continue;
    }
    const k = roadKind((x + x2) / 2, z); edge(node(x, z), node(x2, z), null, { kind: k, lanes: k === 'res' ? 1 : 2, speed: k === 'res' ? 12 : 15 });
  }
  // the z=300 street dives into the harbor tunnel between x=200 and x=600 (no surface link 200-300 / 500-600)
  const tz = TUNNEL.z;
  const rm = (ax, bx) => { for (const e of edges) { const A = nodes[e.a], B2 = nodes[e.b]; if (A.z === tz && B2.z === tz && ((A.x === ax && B2.x === bx) || (A.x === bx && B2.x === ax))) e.dead = true; } };
  rm(200, 300); rm(500, 600);
  const tp = [{ x: 200, y: 0, z: tz }, { x: TUNNEL.x0, y: 0, z: tz }, { x: TUNNEL.rampW, y: TUNNEL.floor, z: tz }, { x: TUNNEL.rampE, y: TUNNEL.floor, z: tz }, { x: TUNNEL.x1, y: 0, z: tz }, { x: 600, y: 0, z: tz }];
  edge(node(200, tz), node(600, tz), tp, { kind: 'city', lanes: 2, speed: 18, tunnel: true });
  // elevated highway (3 lanes each way) with end ramps
  const hz = HWY.z, hy = HWY.y;
  const hW = node(-1150, hz, 0, 'ramp'), hE = node(HWY.rampE1, hz, 0, 'ramp');
  const hwyPts = [{ x: -1150, y: 0, z: hz }, { x: HWY.x0, y: hy, z: hz }, { x: -500, y: hy, z: hz }, { x: 0, y: hy, z: hz }, { x: HWY.x1, y: hy, z: hz }, { x: HWY.rampE1, y: 0, z: hz }];
  edge(hW, hE, hwyPts, { kind: 'hwy', lanes: 3, speed: 30, hwy: true });
  // connect highway ends: east end into port road x=700 ; west end to airport road
  const n700 = node(700, -500), n700b = node(700, -600);
  hE.x = 700; edge(hE, n700, null, { lanes: 1, kind: 'res', speed: 12 }); edge(hE, n700b, null, { lanes: 1, kind: 'res', speed: 12 });
  const aj = node(-1150, -300, 0, 'ramp'); edge(hW, aj, null, { lanes: 2, kind: 'city', speed: 18 });
  edge(aj, node(-800, -300), [{ x: -1150, y: 0, z: -300 }, { x: -800, y: 0, z: -300 }], { lanes: 2, kind: 'city', speed: 18 });
  const term = node(-1500, -100, 0, 'ramp'); edge(aj, term, [{ x: -1150, y: 0, z: -300 }, { x: -1150, y: 0, z: -100 }, { x: -1500, y: 0, z: -100 }], { lanes: 2, kind: 'city', speed: 14 });
  for (const n of nodes) { if (n.kind !== 'isect') n.light = false; }
  const live = edges.filter((e) => !e.dead);
  // rebuild out/in lists without dead edges
  for (const n of nodes) { n.out = n.out.filter((id) => !edges[id].dead); n.inn = n.inn.filter((id) => !edges[id].dead); if (n.out.length + n.inn.length < 6) n.light = false; }
  // suburbs / port intersections use stop-yield instead of lights
  for (const n of nodes) if (n.light && roadKind(n.x, n.z) === 'res') n.light = false;
  return { nodes, edges, live };
}

// ---------------- ground ----------------
function subtract(r, h) {
  if (h.x0 >= r.x1 || h.x1 <= r.x0 || h.z0 >= r.z1 || h.z1 <= r.z0) return [r];
  const out = [];
  if (h.x0 > r.x0) out.push({ x0: r.x0, z0: r.z0, x1: h.x0, z1: r.z1 });
  if (h.x1 < r.x1) out.push({ x0: h.x1, z0: r.z0, x1: r.x1, z1: r.z1 });
  const mx0 = Math.max(r.x0, h.x0), mx1 = Math.min(r.x1, h.x1);
  if (h.z0 > r.z0) out.push({ x0: mx0, z0: r.z0, x1: mx1, z1: h.z0 });
  if (h.z1 < r.z1) out.push({ x0: mx0, z0: h.z1, x1: mx1, z1: r.z1 });
  return out;
}
function buildGround(ctx) {
  let rects = [{ x0: -2300, z0: -830, x1: SEA_X, z1: BEACH_Z0 + 28 }];
  const holes = [{ x0: RIVER.x0, z0: -2000, x1: RIVER.x1, z1: 2000 }, { x0: TUNNEL.x0, z0: TUNNEL.z - HR, x1: TUNNEL.x1, z1: TUNNEL.z + HR }, { x0: AIRPORT.x0, z0: AIRPORT.z0, x1: AIRPORT.x1, z1: AIRPORT.z1 }];
  for (const h of holes) rects = rects.flatMap((r) => subtract(r, h));
  for (const r of rects) {
    // split into 200m tiles so chunks cull properly
    for (let x = r.x0; x < r.x1; x += 200) for (let z = r.z0; z < r.z1; z += 200) {
      const xx = Math.min(r.x1, x + 200), zz = Math.min(r.z1, z + 200);
      const mat = x < -830 ? 'grass' : 'asphalt';
      ctx.B.box(mat, x, -0.06, z, xx, -0.05, zz, { faces: 'py', topScale: mat === 'grass' ? 10 : 12 });
    }
  }
}

// ---------------- district block fillers ----------------
function fillBlock(ctx, d, special, x0, z0, x1, z1, rng) {
  if (special === 'hwy') return hwyBlock(ctx, x0, z0, x1, z1, rng, d);
  if (special === 'rail') return railBlock(ctx, x0, z0, x1, z1, rng, d);
  switch (d) {
    case 'downtown': return rng() < 0.08 ? plazaBlock(ctx, x0, z0, x1, z1, rng) : downtownBlock(ctx, x0, z0, x1, z1, rng);
    case 'shopping': return shopBlock(ctx, x0, z0, x1, z1, rng, 'shopping');
    case 'midtown': return rng() < 0.12 ? parkBlock(ctx, x0, z0, x1, z1, rng) : shopBlock(ctx, x0, z0, x1, z1, rng, 'midtown');
    case 'north': return shopBlock(ctx, x0, z0, x1, z1, rng, 'north');
    case 'suburbs': return rng() < 0.1 ? parkBlock(ctx, x0, z0, x1, z1, rng) : suburbBlock(ctx, x0, z0, x1, z1, rng);
    case 'port': return portBlock(ctx, x0, z0, x1, z1, rng);
    default: return parkBlock(ctx, x0, z0, x1, z1, rng);
  }
}
function sidewalkProps(ctx, x0, z0, x1, z1, rng, kinds) {
  // along each side of the block, just inside the curb
  const sides = [['z', z0 - 3.2, x0, x1, 0], ['z', z1 + 3.2, x0, x1, Math.PI], ['x', x0 - 3.2, z0, z1, Math.PI / 2], ['x', x1 + 3.2, z0, z1, -Math.PI / 2]];
  for (const [axis, c, a0, a1, yaw] of sides) {
    for (let a = a0 + 6; a < a1 - 4; a += 7 + rng() * 6) {
      const k = kinds[(rng() * kinds.length) | 0]; if (!k) continue;
      const x = axis === 'z' ? a : c, z = axis === 'z' ? c : a;
      if (k === 'tree') ctx.tree(x, z, 'round', 0.8 + rng() * 0.4); else ctx.prop(k, x, z, yaw);
    }
    // street lamps at fixed spacing close to the curb
    for (let a = a0 + 2; a < a1; a += 26) { const off = axis === 'z' ? (c < z0 ? -0.5 : 0.5) : (c < x0 ? -0.5 : 0.5); const x = axis === 'z' ? a : c + off, z = axis === 'z' ? c + off : a; ctx.prop('lamp', x, z, yaw); }
  }
}
function downtownBlock(ctx, x0, z0, x1, z1, rng) {
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2; const central = 1 - clamp(Math.hypot(cx, cz + 50) / 400, 0, 1);
  const split = rng() < 0.55; const lots = split ? [[x0, z0, cx - 1.5, cz - 1.5], [cx + 1.5, z0, x1, cz - 1.5], [x0, cz + 1.5, cx - 1.5, z1], [cx + 1.5, cz + 1.5, x1, z1]] : [[x0, z0, x1, z1]];
  for (const [a0, b0, a1, b1] of lots) {
    const inset = split ? 1 : 3 + rng() * 4; const lx0 = a0 + inset, lz0 = b0 + inset, lx1 = a1 - inset, lz1 = b1 - inset;
    const h = 30 + rng() * 70 + central * central * 170 * rng() + (split ? 0 : 30);
    const style = rng() < 0.55 ? 'glass' : rng() < 0.5 ? 'tower' : rng() < 0.6 ? 'office' : 'deco'; const v = (rng() * 4) | 0;
    // podium with shops
    const podH = 6 + rng() * 4;
    ctx.building(lx0, lz0, lx1, lz1, podH, rng() < 0.5 ? 'office' : 'deco', v, { clutter: false });
    const shops = [['pz', lz1, lx0, lx1], ['nz', lz0, lx0, lx1], ['px', lx1, lz0, lz1], ['nx', lx0, lz0, lz1]];
    for (const [face, c, s0, s1] of shops) { const n = Math.max(1, Math.floor((s1 - s0) / 11)); const w = (s1 - s0) / n; for (let k = 0; k < n; k++) if (rng() < 0.6) ctx.shopfront(s0 + k * w, s0 + (k + 1) * w, c, face, rng); }
    // tiers
    let tx0 = lx0 + 1.5, tz0 = lz0 + 1.5, tx1 = lx1 - 1.5, tz1 = lz1 - 1.5, base = podH; const tiers = h > 90 ? 3 : h > 50 ? 2 : 1;
    for (let t = 0; t < tiers; t++) {
      const th = t === tiers - 1 ? h : base + (h - base) * (0.55 + rng() * 0.15);
      ctx.building(tx0, tz0, tx1, tz1, th, style, v, { y0: base, tall: t === tiers - 1 && h > 80, clutter: t === tiers - 1 });
      base = th; const s = Math.min(tx1 - tx0, tz1 - tz0) * 0.12; tx0 += s; tz0 += s; tx1 -= s; tz1 -= s;
    }
    if (h > 120 && rng() < 0.5) { // crown lights
      const col = [0x5ad1ff, 0xffd36b, 0xff5ad1][(rng() * 3) | 0]; ctx.glowBox(col, tx0 - 0.1, base - 0.6, tz0 - 0.1, tx1 + 0.1, base - 0.3, tz1 + 0.1);
    }
  }
  sidewalkProps(ctx, x0, z0, x1, z1, rng, ['bin', 'tree', 'hydrant', null, 'bench', 'newsbox', 'meter', 'tree', 'busstop', null]);
  ctx.wander.push({ x0: x0 - 3, z0: z0 - 3, x1: x1 + 3, z1: z1 + 3, density: 1 });
}
function plazaBlock(ctx, x0, z0, x1, z1, rng) {
  ctx.groundQuad('plaza', x0, z0, x1, z1, CURB + 0.01, 6);
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  ctx.solid('concrete', cx - 6, CURB, cz - 6, cx + 6, CURB + 0.7, cz + 6, { tw: 4 }); // fountain basin
  ctx.glowBox(0x9fe7ff, cx - 5.5, CURB + 0.65, cz - 5.5, cx + 5.5, CURB + 0.68, cz + 5.5);
  ctx.vbox(0xdedad0, cx - 0.8, CURB, cz - 0.8, cx + 0.8, CURB + 3.5, cz + 0.8, true);
  for (let i = 0; i < 10; i++) ctx.tree(x0 + 5 + rng() * (x1 - x0 - 10), z0 + 5 + rng() * (z1 - z0 - 10), 'round', 1 + rng() * 0.3);
  for (let i = 0; i < 8; i++) ctx.prop('bench', x0 + 6 + rng() * (x1 - x0 - 12), z0 + 6 + rng() * (z1 - z0 - 12), rng() * 6);
  ctx.wander.push({ x0, z0, x1, z1, density: 2.2 });
  ctx.pedAreas.push({ x0, z0, x1, z1 });
}
function shopBlock(ctx, x0, z0, x1, z1, rng, d) {
  // perimeter row buildings, inner courtyard / parking
  const depth = 14 + rng() * 6; const styles = d === 'north' ? ['brick', 'warehouse', 'office'] : d === 'midtown' ? ['brick', 'plaster', 'office', 'deco'] : ['plaster', 'brick', 'deco', 'office'];
  const hMax = d === 'shopping' ? 24 : d === 'midtown' ? 34 : 18;
  const row = (a0, a1, face) => {
    let a = a0; while (a < a1 - 6) {
      const w = Math.min(a1 - a, 9 + rng() * 10); const gap = rng() < 0.25 ? 2.5 : 0; const h = 8 + rng() * (hMax - 8);
      const st = styles[(rng() * styles.length) | 0], v = (rng() * 4) | 0;
      let bx0, bz0, bx1, bz1;
      if (face === 'nz') { bx0 = a; bx1 = a + w - gap; bz0 = z0; bz1 = z0 + depth; }
      else if (face === 'pz') { bx0 = a; bx1 = a + w - gap; bz0 = z1 - depth; bz1 = z1; }
      else if (face === 'nx') { bz0 = a; bz1 = a + w - gap; bx0 = x0; bx1 = x0 + depth; }
      else { bz0 = a; bz1 = a + w - gap; bx0 = x1 - depth; bx1 = x1; }
      ctx.building(bx0, bz0, bx1, bz1, h, st, v);
      const c = face === 'nz' ? bz0 : face === 'pz' ? bz1 : face === 'nx' ? bx0 : bx1;
      if (rng() < (d === 'north' ? 0.4 : 0.85)) ctx.shopfront(face === 'nz' || face === 'pz' ? bx0 : bz0, face === 'nz' || face === 'pz' ? bx1 : bz1, c, face, rng);
      if (gap) { if (rng() < 0.5) ctx.prop('dumpster', face === 'nz' || face === 'pz' ? a + w - gap / 2 : (face === 'nx' ? x0 + depth - 3 : x1 - depth + 3), face === 'nz' || face === 'pz' ? (face === 'nz' ? z0 + depth - 3 : z1 - depth + 3) : a + w - gap / 2, 0); }
      a += w;
    }
  };
  row(x0, x1, 'nz'); row(x0, x1, 'pz'); row(z0 + depth, z1 - depth, 'nx'); row(z0 + depth, z1 - depth, 'px');
  // courtyard: parking lot with spots
  const cx0 = x0 + depth + 1, cx1 = x1 - depth - 1, cz0 = z0 + depth + 1, cz1 = z1 - depth - 1;
  if (cx1 - cx0 > 10 && cz1 - cz0 > 10) {
    ctx.groundQuad('lot', cx0, cz0, cx1, cz1, CURB + 0.01, 8);
    for (let x = cx0 + 3; x < cx1 - 3; x += 3.2) { if (rng() < 0.35) ctx.parking.push({ x, z: cz0 + 3, yaw: 0 }); if (rng() < 0.35) ctx.parking.push({ x, z: cz1 - 3, yaw: Math.PI }); }
    ctx.prop('dumpster', cx0 + 2, cz0 + 1.5, 0);
  }
  sidewalkProps(ctx, x0, z0, x1, z1, rng, d === 'north' ? ['bin', null, 'hydrant', null] : ['bin', 'tree', 'hydrant', 'bench', 'newsbox', 'tree', null, 'mailbox', 'busstop']);
  ctx.wander.push({ x0: x0 - 3, z0: z0 - 3, x1: x1 + 3, z1: z1 + 3, density: d === 'shopping' ? 1.6 : d === 'north' ? 0.5 : 1 });
}
function parkBlock(ctx, x0, z0, x1, z1, rng) {
  ctx.groundQuad('grass', x0, z0, x1, z1, CURB + 0.01, 10);
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  ctx.groundQuad('plaza', cx - 2, z0, cx + 2, z1, CURB + 0.02, 4); ctx.groundQuad('plaza', x0, cz - 2, x1, cz + 2, CURB + 0.02, 4);
  for (let i = 0; i < 26; i++) { const x = x0 + 3 + rng() * (x1 - x0 - 6), z = z0 + 3 + rng() * (z1 - z0 - 6); if (Math.abs(x - cx) < 4 || Math.abs(z - cz) < 4) continue; ctx.tree(x, z, rng() < 0.2 ? 'pine' : 'round', 0.9 + rng() * 0.6); }
  for (let i = 0; i < 6; i++) ctx.prop('bench', cx + (rng() < 0.5 ? -3.5 : 3.5), z0 + 8 + rng() * (z1 - z0 - 16), Math.PI / 2);
  sidewalkProps(ctx, x0, z0, x1, z1, rng, [null, 'bin', null]);
  ctx.wander.push({ x0, z0, x1, z1, density: 1.2 }); ctx.pedAreas.push({ x0, z0, x1, z1 });
}
function suburbBlock(ctx, x0, z0, x1, z1, rng) {
  ctx.groundQuad('grass', x0, z0, x1, z1, CURB + 0.01, 10);
  const lot = 17; const roofCols = [0x7a3b2e, 0x4a4f57, 0x3b5a7a, 0x6b4a33, 0x555555];
  const house = (hx, hz, face) => {
    const w = 9 + rng() * 3, dd = 8 + rng() * 3, h = 3 + (rng() < 0.4 ? 3 : 0) + CURB;
    let bx0, bz0; if (face === 'nz') { bx0 = hx; bz0 = z0 + 5; } else if (face === 'pz') { bx0 = hx; bz0 = z1 - 5 - dd; } else if (face === 'nx') { bx0 = x0 + 5; bz0 = hz; } else { bx0 = x1 - 5 - dd; bz0 = hz; }
    const along = face === 'nz' || face === 'pz'; const bx1 = bx0 + (along ? w : dd), bz1 = bz0 + (along ? dd : w);
    ctx.building(bx0, bz0, bx1, bz1, h, 'house', (rng() * 4) | 0, { parapet: false, clutter: false, climb: true });
    // gabled roof
    const rc = roofCols[(rng() * roofCols.length) | 0]; const ridge = 2.2;
    const geo = new THREE.CylinderGeometry(0.01, 1, 1, 4, 1); geo.rotateY(Math.PI / 4);
    const m = new THREE.Matrix4().makeTranslation((bx0 + bx1) / 2, h + ridge / 2, (bz0 + bz1) / 2).multiply(new THREE.Matrix4().makeScale((bx1 - bx0) * 0.75, ridge, (bz1 - bz0) * 0.75));
    ctx.B.geom('vc', geo, m, { color: hex3(rc) });
    ctx.S.addBox(bx0 + 1, h, bz0 + 1, bx1 - 1, h + ridge * 0.6, bz1 - 1, { tag: 'roof' });
    // door + garage
    const fc = face === 'nz' ? bz0 : face === 'pz' ? bz1 : face === 'nx' ? bx0 : bx1; const out = face === 'pz' || face === 'px' ? 0.05 : -0.05;
    if (along) { ctx.vbox(0x6b4a33, bx0 + 1.5, CURB, fc + out - 0.03, bx0 + 2.6, CURB + 2.1, fc + out + 0.03); ctx.vbox(0xe8e8e8, bx1 - 4.2, CURB, fc + out - 0.03, bx1 - 1, CURB + 2.4, fc + out + 0.03); }
    else { ctx.vbox(0x6b4a33, fc + out - 0.03, CURB, bz0 + 1.5, fc + out + 0.03, CURB + 2.1, bz0 + 2.6); ctx.vbox(0xe8e8e8, fc + out - 0.03, CURB, bz1 - 4.2, fc + out + 0.03, CURB + 2.4, bz1 - 1); }
    // driveway with parked car
    if (along) { const dz0 = face === 'nz' ? z0 - 4 : bz1, dz1 = face === 'nz' ? bz0 : z1 + 4; ctx.groundQuad('lot', bx1 - 4.4, dz0, bx1 - 0.8, dz1, CURB + 0.02, 6); if (rng() < 0.5) ctx.parking.push({ x: bx1 - 2.6, z: (dz0 + dz1) / 2, yaw: face === 'nz' ? Math.PI : 0 }); }
    else { const dx0 = face === 'nx' ? x0 - 4 : bx1, dx1 = face === 'nx' ? bx0 : x1 + 4; ctx.groundQuad('lot', dx0, bz1 - 4.4, dx1, bz1 - 0.8, CURB + 0.02, 6); if (rng() < 0.5) ctx.parking.push({ x: (dx0 + dx1) / 2, z: bz1 - 2.6, yaw: face === 'nx' ? -Math.PI / 2 : Math.PI / 2 }); }
    if (rng() < 0.7) ctx.tree(along ? bx0 - 2 : (face === 'nx' ? x0 + 2 : x1 - 2), along ? (face === 'nz' ? z0 + 2 : z1 - 2) : bz0 - 2, rng() < 0.3 ? 'pine' : 'round', 0.9 + rng() * 0.5);
    if (rng() < 0.5) ctx.prop('mailbox', along ? bx0 + 3 : (face === 'nx' ? x0 - 0.5 : x1 + 0.5), along ? (face === 'nz' ? z0 - 0.5 : z1 + 0.5) : bz0 + 3, 0);
  };
  for (let a = x0 + 1; a < x1 - lot + 1; a += lot) { house(a, 0, 'nz'); house(a, 0, 'pz'); }
  for (let a = z0 + 22; a < z1 - 22 - lot + 1; a += lot) { house(0, a, 'nx'); house(0, a, 'px'); }
  // backyard fences
  ctx.vbox(0xb59a76, x0 + 20, CURB, (z0 + z1) / 2 - 0.05, x1 - 20, CURB + 1.4, (z0 + z1) / 2 + 0.05, true);
  for (let i = 0; i < 4; i++) ctx.tree(x0 + 20 + rng() * (x1 - x0 - 40), z0 + 22 + rng() * (z1 - z0 - 44), 'round', 1 + rng() * 0.5);
  sidewalkProps(ctx, x0, z0, x1, z1, rng, ['tree', null, 'hydrant', null, 'tree']);
  ctx.wander.push({ x0: x0 - 3, z0: z0 - 3, x1: x1 + 3, z1: z1 + 3, density: 0.35 });
}
function portBlock(ctx, x0, z0, x1, z1, rng) {
  ctx.groundQuad('lot', x0, z0, x1, z1, CURB + 0.01, 10);
  const cx = (x0 + x1) / 2;
  if (rng() < 0.6) { // big warehouse + yard
    const h = 9 + rng() * 6; ctx.building(x0 + 2, z0 + 2, x1 - 2, z0 + (z1 - z0) * 0.55, h, 'warehouse', (rng() * 4) | 0, { clutter: true });
    for (let i = 0; i < 3; i++) ctx.vbox(0x3d4146, x0 + 6 + i * 22, CURB, z0 + (z1 - z0) * 0.55 - 0.1, x0 + 14 + i * 22, CURB + 4.5, z0 + (z1 - z0) * 0.55 + 0.1);
    containerStacks(ctx, x0 + 3, z0 + (z1 - z0) * 0.6 + 2, x1 - 3, z1 - 3, rng, 2);
  } else containerStacks(ctx, x0 + 3, z0 + 3, x1 - 3, z1 - 3, rng, 3);
  // chain link fence segments
  ctx.vbox(0x8a9096, x0, CURB, z1 - 0.05, cx - 6, CURB + 2.4, z1 + 0.05, true, { metal: true }); ctx.vbox(0x8a9096, cx + 6, CURB, z1 - 0.05, x1, CURB + 2.4, z1 + 0.05, true, { metal: true });
  sidewalkProps(ctx, x0, z0, x1, z1, rng, [null, 'barrel', null, 'cone']);
  ctx.wander.push({ x0: x0 - 3, z0: z0 - 3, x1: x1 + 3, z1: z1 + 3, density: 0.25 });
}
export const CONTAINER_COLS = [0xb03a2e, 0x1f618d, 0x117a65, 0xd4ac0d, 0x6c3483, 0xba4a00, 0x566573, 0x1b4f72, 0x7b241c];
export function containerStacks(ctx, x0, z0, x1, z1, rng, maxH = 3) {
  const L = 12.2, W = 2.45, H = 2.6;
  for (let z = z0; z < z1 - W * 3; z += W * 3 + 5) {
    for (let x = x0; x < x1 - L; x += L + 0.4) {
      if (rng() < 0.2) continue; const n = 1 + Math.floor(rng() * maxH);
      for (let k = 0; k < 3; k++) for (let lvl = 0; lvl < n; lvl++) {
        if (lvl > 0 && rng() < 0.2) break;
        const cz = z + k * (W + 0.1); const col = CONTAINER_COLS[(rng() * CONTAINER_COLS.length) | 0];
        ctx.vbox(col, x, CURB + lvl * H, cz, x + L, CURB + (lvl + 1) * H, cz + W, true, { metal: false, mat: 'metal', climb: true });
        ctx.vbox(0x222222, x + 0.05, CURB + lvl * H + 0.1, cz - 0.02, x + 0.15, CURB + (lvl + 1) * H - 0.1, cz + W + 0.02);
      }
    }
  }
}
function hwyBlock(ctx, x0, z0, x1, z1, rng, d) {
  // under-highway lots: parking + low buildings at the edges
  ctx.groundQuad('lot', x0, z0, x1, z1, CURB + 0.01, 10);
  ctx.building(x0 + 2, z0, x1 - 2, z0 + 10, 7 + rng() * 2, rng() < 0.5 ? 'brick' : 'warehouse', (rng() * 4) | 0);
  ctx.building(x0 + 2, z1 - 10, x1 - 2, z1, 7 + rng() * 2, rng() < 0.5 ? 'brick' : 'warehouse', (rng() * 4) | 0);
  ctx.shopfront(x0 + 4, x0 + 16, z1 - 10, 'nz', rng); ctx.shopfront(x0 + 4, x0 + 16, z0 + 10, 'pz', rng);
  for (let x = x0 + 4; x < x1 - 4; x += 3.3) if (rng() < 0.3) ctx.parking.push({ x, z: z0 + 15, yaw: Math.PI });
  sidewalkProps(ctx, x0, z0, x1, z1, rng, [null, 'bin', null, 'hydrant']);
  ctx.wander.push({ x0: x0 - 3, z0: z0 - 3, x1: x1 + 3, z1: z1 + 3, density: 0.4 });
}
function railBlock(ctx, x0, z0, x1, z1, rng) {
  // rail corridor passes through z -662..-638
  ctx.groundQuad('lot', x0, z0, x1, z1, CURB + 0.01, 10);
  ctx.building(x0 + 2, z0, x1 - 2, -664, 8 + rng() * 10, rng() < 0.5 ? 'brick' : 'warehouse', (rng() * 4) | 0);
  ctx.building(x0 + 2, -636, x1 - 2, z1, 8 + rng() * 12, rng() < 0.5 ? 'brick' : 'office', (rng() * 4) | 0);
  ctx.shopfront(x0 + 6, x0 + 18, z1, 'pz', rng); ctx.shopfront(x1 - 18, x1 - 6, z0, 'nz', rng);
  sidewalkProps(ctx, x0, z0, x1, z1, rng, [null, 'bin', null]);
}
function promenade(ctx, x0, z0, x1, z1, rng, side) {
  for (let z = z0 + 4; z < z1 - 2; z += 9) { ctx.tree((x0 + x1) / 2 + side * 3, z, 'round', 0.8 + rng() * 0.3); if (rng() < 0.4) ctx.prop('bench', (x0 + x1) / 2 - side * 2, z + 4, side > 0 ? Math.PI / 2 : -Math.PI / 2); }
  for (let z = z0 + 2; z < z1; z += 22) ctx.prop('lamp', (x0 + x1) / 2, z, 0);
  ctx.wander.push({ x0, z0, x1, z1, density: 0.6 });
}
function portQuay(ctx, x0, z0, x1, z1, rng) {
  // bollards along quay edge + occasional containers / crates
  for (let z = z0 + 2; z < z1; z += 8) ctx.vbox(0x2f3337, SEA_X - 1.2, CURB, z - 0.3, SEA_X - 0.6, CURB + 0.8, z + 0.3, true, { metal: true });
  if (rng() < 0.6) containerStacks(ctx, x0 + 4, z0 + 4, x1 - 12, z1 - 4, rng, 4);
}
function beach(ctx, rng) {
  // boardwalk + sand + lifeguard huts + palms (z from 612 down to sea)
  const z0 = BEACH_Z0;
  ctx.S.addBox(-800, -0.5, 600 + HR, SEA_X, CURB, z0, { solid: false });
  ctx.B.box('walk', -800, CURB - 0.001, 600 + HR, SEA_X, CURB, z0, { faces: 'py', topScale: 4 });
  ctx.B.box('curb', -800, -0.05, 600 + HR, SEA_X, CURB, z0, { faces: 'pz nz' });
  ctx.solid('wood', -800, 0, z0, SEA_X, 0.5, z0 + 18, { mat: 'wood', faces: 'py pz', solid: false, tw: 3 });
  for (let x = -790; x < SEA_X - 10; x += 19) { ctx.tree(x, z0 + 1.5 + rng() * 2, 'palm', 0.9 + rng() * 0.4, 0.5); if (rng() < 0.4) ctx.prop('bench', x + 8, z0 + 4, Math.PI); if (rng() < 0.5) ctx.prop('lamp', x + 4, z0 + 1, Math.PI); }
  // sand quads, sloped strips
  for (let z = z0 + 18; z < SEA_Z + 40; z += 10) {
    const y0 = terrainHeight(0, z) + 0.02, y1 = terrainHeight(0, z + 10) + 0.02;
    for (let x = -2300; x < SEA_X; x += 200) ctx.B.quad('sand', [[x, y1, z + 10], [Math.min(SEA_X, x + 200), y1, z + 10], [Math.min(SEA_X, x + 200), y0, z], [x, y0, z]], [x / 8, (z + 10) / 8, (x + 200) / 8, (z + 10) / 8, (x + 200) / 8, z / 8, x / 8, z / 8]);
  }
  for (let i = 0; i < 9; i++) { // lifeguard towers
    const x = -720 + i * 170, z = z0 + 55; const col = i % 2 ? 0xe74c3c : 0xf1c40f;
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) ctx.vbox(0xf5f5f5, x + dx * 1.1 - 0.08, terrainHeight(x, z), z + dz * 1.1 - 0.08, x + dx * 1.1 + 0.08, 3, z + dz * 1.1 + 0.08);
    ctx.vbox(col, x - 1.5, 3, z - 1.5, x + 1.5, 5.2, z + 1.5, true); ctx.vbox(0xffffff, x - 1.7, 5.2, z - 1.7, x + 1.7, 5.4, z + 1.7);
  }
  for (let i = 0; i < 40; i++) ctx.prop('umbrella', -780 + rng() * 1500, z0 + 28 + rng() * 50, rng() * 6, terrainHeight(0, z0 + 50));
  ctx.wander.push({ x0: -800, z0: z0 + 2, x1: SEA_X, z1: z0 + 80, density: 0.8, beach: true });
}
function hills(ctx, root, mats) {
  // northern Crown Hills heightfield
  const x0 = -2300, x1 = 900, z0 = -1500, z1 = -800; const nx = 96, nz = 28;
  const geo = new THREE.PlaneGeometry(x1 - x0, z1 - z0, nx, nz); geo.rotateX(-Math.PI / 2); geo.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
  const pos = geo.attributes.position; const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i); const h = z > -831 ? -0.1 : terrainHeight(x, z); pos.setY(i, h - 0.1);
    const t = clamp(h / 160, 0, 1); const snow = h > 150 ? 1 : 0; const n = noise2(x * 0.05, z * 0.05) * 0.15;
    col[i * 3] = lerp(0.32, 0.5, t) + snow * 0.4 + n; col[i * 3 + 1] = lerp(0.45, 0.46, t) + snow * 0.45 + n; col[i * 3 + 2] = lerp(0.22, 0.42, t) + snow * 0.5 + n;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true })); m.receiveShadow = true; root.add(m);
  // pine forest on the hills
  const r = makeRng(5);
  for (let i = 0; i < 700; i++) { const x = x0 + 100 + r() * (x1 - x0 - 200), z = -840 - r() * 520; const h = terrainHeight(x, z); if (h > 140) continue; ctx.trees.push({ x, y: h, z, kind: 'pine', s: 1 + r() * 0.8 }); }
  // distant mountains ring (visual)
  const mg = new THREE.ConeGeometry(1, 1, 7, 1); const mm = new THREE.MeshStandardMaterial({ color: 0x6f7f8c, roughness: 1, flatShading: true });
  const inst = new THREE.InstancedMesh(mg, mm, 40); const M = new THREE.Matrix4();
  for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2; const R = 3200 + r() * 600; const s = 300 + r() * 500; M.compose(new THREE.Vector3(Math.cos(a) * R - 600, s * 0.4 - 20, Math.sin(a) * R * 0.8 - 300), new THREE.Quaternion(), new THREE.Vector3(s * 1.4, s, s * 1.4)); inst.setMatrixAt(i, M); }
  root.add(inst);
}
function airport(ctx, rng) {
  const A = AIRPORT; const { B, S } = ctx;
  ctx.groundQuad('grass', A.x0, A.z0, A.x1, A.z1, 0.0, 12); S.addBox(A.x0, -0.5, A.z0, A.x1, 0.0, A.z1, { solid: false });
  // runway
  const rz = A.runwayZ, rh = A.runwayHalf;
  ctx.groundQuad('asphalt', A.runwayX0, rz - rh, A.runwayX1, rz + rh, 0.03, 12);
  for (let x = A.runwayX0 + 40; x < A.runwayX1 - 40; x += 50) ctx.glowBox(0xf0f0f0, x, 0.04, rz - 0.4, x + 26, 0.05, rz + 0.4);
  for (let x = A.runwayX0; x < A.runwayX1; x += 30) { ctx.glowBox(0xfff3c4, x, 0.04, rz - rh - 1, x + 0.6, 0.3, rz - rh - 0.4); ctx.glowBox(0xfff3c4, x, 0.04, rz + rh + 0.4, x + 0.6, 0.3, rz + rh + 1); }
  for (let k = 0; k < 8; k++) { ctx.glowBox(0xf0f0f0, A.runwayX0 + 10, 0.04, rz - rh + 3 + k * 5.6, A.runwayX0 + 40, 0.05, rz - rh + 5 + k * 5.6); ctx.glowBox(0xf0f0f0, A.runwayX1 - 40, 0.04, rz - rh + 3 + k * 5.6, A.runwayX1 - 10, 0.05, rz - rh + 5 + k * 5.6); }
  // taxiway + apron
  ctx.groundQuad('asphalt', A.runwayX0 + 100, -240, A.runwayX1 - 60, -210, 0.03, 12);
  ctx.groundQuad('lot', -1900, -210, -1250, -130, 0.03, 12);
  for (let x = -1880; x < -1260; x += 70) { ctx.groundQuad('asphalt', x, -240, x + 10, -210, 0.035, 12); }
  // terminal
  ctx.building(-1800, -125, -1450, -75, 18, 'glass', 2, { y0: 0, tall: false });
  ctx.vbox(0xdddddd, -1810, 18, -130, -1440, 19.5, -70, true);
  ctx.building(-1430, -120, -1380, -80, 34, 'office', 1, { y0: 0 }); // control tower base
  ctx.solid('glassDark', -1420, 34, -112, -1388, 40, -88, { top: 'roof' });
  for (let i = 0; i < 5; i++) { // jet bridges
    const x = -1780 + i * 70; ctx.vbox(0xc9c9c9, x, 4, -150, x + 4, 7, -125, true, { metal: true });
  }
  // hangars
  for (let i = 0; i < 4; i++) { const x = -2100 + i * 120; ctx.building(x, -520, x + 90, -440, 16, 'warehouse', i, { y0: 0 }); ctx.vbox(0x3a3f45, x + 10, 0, -440.1, x + 80, 13, -439.9); }
  // perimeter fence
  ctx.vbox(0x8a9096, A.x0, 0, A.z0, A.x1, 3, A.z0 + 0.1, true, { metal: true });
  ctx.vbox(0x8a9096, A.x0, 0, A.z1 - 0.1, -1530, 3, A.z1, true, { metal: true }); ctx.vbox(0x8a9096, -1470, 0, A.z1 - 0.1, A.x1, 3, A.z1, true, { metal: true });
  ctx.vbox(0x8a9096, A.x0, 0, A.z0, A.x0 + 0.1, 3, A.z1, true, { metal: true }); ctx.vbox(0x8a9096, A.x1 - 0.1, 0, A.z0, A.x1, 3, -340, true, { metal: true }); ctx.vbox(0x8a9096, A.x1 - 0.1, 0, -290, A.x1, 3, A.z1, true, { metal: true });
  for (let i = 0; i < 30; i++) ctx.parking.push({ x: -1750 + (i % 15) * 3.3, z: -40 - Math.floor(i / 15) * 8, yaw: 0, airport: true });
  ctx.landmarks.airport = { terminal: { x: -1625, z: -100 }, apron: { x: -1600, z: -170 }, runway: { x0: A.runwayX0, x1: A.runwayX1, z: rz } };
  ctx.wander.push({ x0: -1800, z0: -70, x1: -1450, z1: -60, density: 1 });
}
function makeWater(root, mats) {
  const geo = new THREE.PlaneGeometry(9000, 9000, 1, 1); geo.rotateX(-Math.PI / 2);
  const n = T.water(); n.repeat.set(600, 600);
  const mat = new THREE.MeshStandardMaterial({ color: 0x1b5566, roughness: 0.08, metalness: 0.15, normalMap: n, normalScale: new THREE.Vector2(0.6, 0.6), transparent: true, opacity: 0.92 });
  const m = new THREE.Mesh(geo, mat); m.position.set(0, WATER_Y, 0); m.receiveShadow = true; m.renderOrder = 1; root.add(m);
  // seabed
  const bed = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), new THREE.MeshStandardMaterial({ color: 0x2a3d3a, roughness: 1 })); bed.rotation.x = -Math.PI / 2; bed.position.y = -5.05; root.add(bed);
  return m;
}
