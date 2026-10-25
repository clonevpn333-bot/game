// MERIDIAN — the walking city. Gait simulation (four legs, lateral-sequence walk),
// the city's pose (bob/roll), footfalls, and the colossal exterior: hull, legs,
// suspended engine, skyline, the Crown.
import * as THREE from 'three';
import { Builder } from './builder.js';
import { TRAM_PATH } from './tram.js';
import { clamp, damp, lerp, rng, smoothstep, ease } from '../core/util.js';

export const GROUND_Y = -400;
export const HULL = { x0: -200, x1: 200, z0: -300, z1: 300, top: 0, bottom: -92 };
const THIGH = 168, SHIN = 176;

export const LEGS = [
  { id: 'RF', name: 'Leg Two', hip: new THREE.Vector3(174, -104, -228), off: 0.0, side: 1 },
  { id: 'LH', name: 'Leg Three', hip: new THREE.Vector3(-174, -104, 228), off: 0.25, side: -1 },
  { id: 'LF', name: 'Leg One', hip: new THREE.Vector3(-174, -104, -228), off: 0.5, side: -1 },
  { id: 'RH', name: 'Leg Four', hip: new THREE.Vector3(174, -104, 228), off: 0.75, side: 1 },
];

export class City {
  constructor(game) {
    this.game = game;
    this.speed = 4.0; this.walking = true; this.speedMul = 1; this.T = 32; this.stance = 0.78;
    this.travel = 0; this.phase = 0.06; this.bob = 0; this.roll = 0; this.pitch = 0;
    this.shakeAmount = 0; this.groundY = GROUND_Y;
    this.stride = this.speed * this.T * this.stance;
    this.legStates = LEGS.map(l => ({ ...l, foot: new THREE.Vector3(), lift: 0, planted: true, lastP: 0 }));
    this.r = rng(9);
    this.footfallListeners = [];
  }
  onFootfall(fn) { this.footfallListeners.push(fn); }

  legFoot(L, p) {
    // u = forward (-z). Returns foot position in city frame (before bob)
    const S = this.stride, st = this.stance;
    let u, lift = 0, planted;
    const uh = -L.hip.z;
    if (p < st) { u = uh + S / 2 - (p / st) * S; planted = true; }
    else { const s = (p - st) / (1 - st); const e = ease.inOutSine(s); u = uh - S / 2 + S * e; lift = Math.sin(Math.PI * s) * 34 * (1 - 0.3 * s); planted = false; }
    return { u, lift, planted };
  }

  update(dt) {
    const spd = this.speed * this.speedMul * (this.walking ? 1 : 0);
    // the gait clock runs proportional to speed so feet never slide
    const dPhase = (spd / this.speed) * dt / this.T;
    this.phase = (this.phase + dPhase) % 1;
    this.travel += spd * dt;
    // pose: drop & recover after each footfall, roll toward the supporting side
    let bob = 0, roll = 0, pitch = 0;
    for (const L of this.legStates) {
      const p = (this.phase + L.off) % 1;
      const f = this.legFoot(L, p);
      // footfall detection
      if (L.lastP > 0.9 && p < 0.1 && this.walking) this.footfall(L);
      L.lastP = p;
      L.lift = f.lift; L.planted = f.planted;
      const tSince = p * this.T; // seconds since plant
      if (p < this.stance) bob += -Math.exp(-tSince / 1.4) * Math.sin(Math.min(Math.PI, tSince * 1.6)) * 0.9;
      else roll += -L.side * Math.sin(Math.PI * (p - this.stance) / (1 - this.stance)) * 0.0022;
      if (p >= this.stance) pitch += (L.hip.z < 0 ? 1 : -1) * Math.sin(Math.PI * (p - this.stance) / (1 - this.stance)) * 0.0012;
      L.u = f.u;
    }
    const mul = this.walking ? 1 : 0;
    this.bob = damp(this.bob, bob * mul, 6, dt); this.roll = damp(this.roll, roll * mul, 2, dt); this.pitch = damp(this.pitch, pitch * mul, 2, dt);
    for (const L of this.legStates) L.foot.set(L.hip.x, this.groundY - this.bob + (L.lift || 0), -L.u);
    // world transform: the outside world moves opposite to the city
    const wr = this.game.engine.worldRoot;
    wr.position.set(0, -this.bob, this.travel);
    wr.rotation.set(-this.pitch, 0, -this.roll);
    this.shakeAmount = damp(this.shakeAmount, 0, 1.6, dt);
    this.exterior?.update(dt);
  }

  footfall(L) {
    const g = this.game;
    const cam = g.engine.camera.position;
    const d = L.foot.distanceTo(cam);
    g.audio.giantStep(L.foot, 1, d);
    const interiorDamp = g.sky ? lerp(1, 0.55, g.sky.interior) : 1;
    // the shake arrives with the sound (structure-borne it's faster — use half delay)
    setTimeout(() => { this.shakeAmount = Math.min(1.4, this.shakeAmount + clamp(1.3 - d / 900, 0.35, 1.1) * interiorDamp); g.events.emit('footfall', L); }, Math.min(1200, d / 343 * 500));
    // groan of the structure just before
    if (d < 700) g.audio.creak(new THREE.Vector3(L.hip.x * 0.6, -20, L.hip.z * 0.6), 0.6);
    this.exterior?.dustAt(L);
    for (const f of this.footfallListeners) f(L);
  }
}

// --------------------------------------------------------------------------- exterior
export class Exterior {
  constructor(game, city) {
    this.game = game; this.city = city; city.exterior = this;
    const M = game.materials;
    this.root = new THREE.Group(); this.root.name = 'exterior';
    game.engine.cityRoot.add(this.root);
    this.legs = [];
    this.buildHull();
    this.buildSkyline();
    this.buildEngine();
    for (const L of city.legStates) this.legs.push(this.buildLeg(L));
    this.dust = [];
    this.lights = [];
  }

  // ---------------------------------------------------------------- hull
  buildHull() {
    const b = new Builder(this.game, this.root, { cell: 200 });
    const H = HULL, r = rng(31);
    const hullC = 0x8a8478, darkC = 0x4b4a47, rib = 0x6a665e;
    // Main hull is split so the playable east-front quadrant can be built in detail elsewhere.
    // West half + back
    b.box('panel', [-73, -46.15, 0], [254, 91.7, 600], { color: hullC, collide: false, tex: 8, ao: false });
    b.box('panel', [127, -46.15, 90], [146, 91.7, 420], { color: hullC, collide: false, tex: 8, ao: false });
    // Front-east block (x 80..200, z -300..-120) — its east face is the Spine Gallery wall built by the spine district.
    b.box('panel', [125, -46.15, -210], [142, 91.7, 180], { color: hullC, collide: false, tex: 8, ao: false });
    // a tapered keel under the middle of the hull (between the legs) so Meridian reads as a ship, not a box
    { const k = new THREE.Shape(); k.moveTo(-140, 0); k.lineTo(140, 0); k.lineTo(96, -20); k.lineTo(-96, -20); k.closePath();
      b.extrude('panel', k, 380, [0, -91.8, 0], { color: 0x6a665e, tex: 8 });
      const kr = new THREE.Shape(); kr.moveTo(-142, 0.2); kr.lineTo(142, 0.2); kr.lineTo(97.5, -20.6); kr.lineTo(-97.5, -20.6); kr.closePath();
      for (let z = -180; z <= 180; z += 30) b.extrude('darkSteel', kr, 2, [0, -91.8, z], { color: darkC, tex: 8 });
      for (const sx of [-1, 1]) for (let z = -170; z <= 170; z += 20) b.box('lampWarm', [sx * 120.6, -101, z], [0.6, 0.4, 6], { collide: false, ao: false, rz: sx * 0.43 }); }
    // underside trusses
    // (both grids stop short of the work line's corridor under the starboard-forward corner: the line, its
    //  tram and the relay deck's west side need the air)
    for (let z = -280; z <= 280; z += 40) { const x1 = z === -280 ? 140 : 195; b.box('darkSteel', [(-195 + x1) / 2, -95, z], [x1 + 195, 6, 4], { color: darkC, collide: false, ao: false }); }
    for (let x = -180; x <= 180; x += 45) { const z0 = x === 180 ? -240 : -295; b.box('darkSteel', [x, -97, (z0 + 295) / 2], [4, 4, 295 - z0], { color: darkC, collide: false, ao: false }); }
    // hull ribs + window bands on all four faces
    const sides = [
      { axis: 'x', at: H.x1, n: 1, from: -295, to: 295 }, { axis: 'x', at: H.x0, n: -1, from: -295, to: 295 },
      { axis: 'z', at: H.z0, n: -1, from: -195, to: 195 }, { axis: 'z', at: H.z1, n: 1, from: -195, to: 195 },
    ];
    for (const s of sides) {
      for (let t = s.from; t <= s.to; t += 22) {
        if (s.axis === 'x' && s.n > 0 && t < -120 && t > -290) continue; // spine gallery region detailed separately
        const p = s.axis === 'x' ? [s.at + s.n * 1.5, -46, t] : [t, -46, s.at + s.n * 1.5];
        const sz = s.axis === 'x' ? [3, 92, 2.4] : [2.4, 92, 3];
        b.box('darkSteel', p, sz, { color: rib, collide: false, ao: false });
      }
      for (const y of [-14, -30, -58, -74]) {
        const p = s.axis === 'x' ? [s.at + s.n * 0.6, y, 0] : [0, y, s.at + s.n * 0.6];
        const len = s.axis === 'x' ? 590 : 390;
        if (s.axis === 'x' && s.n > 0) { // skip the playable stretch
          b.box('facade', [s.at + 0.6, y, 80], [1.2, 6, 440], { color: 0xcfc6b6, collide: false, ao: false, tex: 30 });
          continue;
        }
        b.box('facade', p, s.axis === 'x' ? [1.2, 6, len] : [len, 6, 1.2], { color: 0xcfc6b6, collide: false, ao: false, tex: 30 });
      }
      // deck-edge walkways & railings band
      const p2 = s.axis === 'x' ? [s.at + s.n * 2, -1, 0] : [0, -1, s.at + s.n * 2];
      if (!(s.axis === 'x' && s.n > 0)) b.box('darkSteel', p2, s.axis === 'x' ? [4, 2, 600] : [400, 2, 4], { color: darkC, collide: false, ao: false });
    }
    // big pipes along the hull flanks
    for (const sx of [-1, 1]) for (const y of [-40, -66]) {
      const x = sx * (H.x1 + 3.2);
      const z0 = sx > 0 ? -110 : -290;
      b.tube('rust', [x, y, z0], [x, y, 290], 2.2, { seg: 12, color: 0x9a8a78 });
    }
    // floodlight masts at the deck edges (just glows; real lights are local)
    for (let i = 0; i < 26; i++) {
      const t = -290 + i * 23, sx = i % 2 ? 1 : -1;
      if (sx > 0 && t < -110) continue;
      b.box('darkSteel', [sx * 199.4, 3.7, t], [0.6, 8, 0.6], { color: darkC, collide: false, ao: false }); // on the deck edge
      b.box('lampWarm', [sx * 199.4, 8.0, t], [1.2, 0.6, 1.2], { collide: false, ao: false });
    }
    b.finalize().forEach(m => { m.castShadow = false; });
  }

  // ---------------------------------------------------------------- skyline across the deck
  buildSkyline() {
    const r = rng(77), M = this.game.materials;
    const boxes = [];
    // keep the east-front quarter (playable district) clear: x > 110 && z < 40
    for (let i = 0; i < 260; i++) {
      const x = -190 + r() * 380, z = -290 + r() * 580;
      if (x > 100 && z < 60 && z > -300) continue;
      if (TRAM_PATH.some(p => p.y > -10 && Math.hypot(p.x - x, p.z - z) < 16)) continue; // keep clear of the tram line and its deck portal
      const dc = Math.hypot(x, z + 80);
      const crown = dc < 70;
      const h = crown ? 60 + r() * 120 : 8 + Math.pow(r(), 2) * 40 + (Math.abs(x) < 60 ? 10 : 0);
      const w = crown ? 14 + r() * 14 : 8 + r() * 18, d = crown ? 14 + r() * 14 : 8 + r() * 18;
      boxes.push({ x, z, w, d, h, crown });
    }
    // towers are stacked tiers that step back as they rise, each capped by a darker slab, with a
    // penthouse/plant room on top; windows are mapped from world position so every floor is the same size
    const tiers = [], caps = [];
    for (const bx of boxes) {
      const n = bx.crown ? 3 : bx.h > 26 ? (r() < 0.6 ? 2 : 1) : 1, ry = r() < 0.2 ? r() * 0.6 : 0;
      const tone = new THREE.Color().setHSL(0.07 + r() * 0.07, 0.1 + r() * 0.12, bx.crown ? 0.72 : 0.5 + r() * 0.24);
      let y = -0.35, w = bx.w, d = bx.d;
      const parts = n === 1 ? [1] : n === 2 ? [0.68, 0.32] : [0.55, 0.28, 0.17];
      parts.forEach((f, k) => {
        const h = bx.h * f;
        tiers.push({ x: bx.x, y, z: bx.z, w, h, d, ry, c: tone });
        caps.push({ x: bx.x, y: y + h, z: bx.z, w: w + 0.6, h: 0.7, d: d + 0.6, ry, c: new THREE.Color(0x6a655c) });
        y += h + 0.7; w *= 0.72; d *= 0.72;
      });
      caps.push({ x: bx.x + (r() - 0.5) * w * 0.4, y, z: bx.z + (r() - 0.5) * d * 0.4, w: w * 0.45, h: 2.5 + r() * 2, d: d * 0.4, ry, c: new THREE.Color(0x8a847a) });
    }
    const inst = (list, mat) => {
      const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
      geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 3).fill(1), 3));
      const im = new THREE.InstancedMesh(geo, mat, list.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      list.forEach((t, i) => { m4.compose(new THREE.Vector3(t.x, t.y, t.z), q.setFromEuler(e.set(0, t.ry, 0)), new THREE.Vector3(t.w, t.h, t.d)); im.setMatrixAt(i, m4); im.setColorAt(i, t.c); });
      im.castShadow = false; im.receiveShadow = false; this.root.add(im); return im;
    };
    const towerMat = M.facade.clone();
    towerMat.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace('#include <fog_vertex>', `#include <fog_vertex>
        {
          mat4 im = modelMatrix * instanceMatrix;
          vec3 wp = (im * vec4(position, 1.0)).xyz, wn = abs(normalize(mat3(im) * normal));
          vec2 bu = (wn.x > 0.5 ? wp.zy : wn.z > 0.5 ? wp.xy : wp.xz + 999.0) / 51.2; // 16 windows per tile, 3.2 m floors
          #ifdef USE_MAP
            vMapUv = bu;
          #endif
          #ifdef USE_NORMALMAP
            vNormalMapUv = bu;
          #endif
          #ifdef USE_ROUGHNESSMAP
            vRoughnessMapUv = bu;
          #endif
          #ifdef USE_METALNESSMAP
            vMetalnessMapUv = bu;
          #endif
          #ifdef USE_EMISSIVEMAP
            vEmissiveMapUv = bu;
          #endif
        }`);
    };
    towerMat.customProgramCacheKey = () => 'towerUV';
    inst(tiers, towerMat);
    inst(caps, M.concrete);
    // the Crown: a cluster of slender towers with observation rings and a spire
    const b = new Builder(this.game, this.root, { cell: 400 });
    const cz = -80;
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2, rr = i === 0 ? 0 : 34;
      const x = Math.cos(a) * rr - 10, z = cz + Math.sin(a) * rr;
      const h = i === 0 ? 210 : 120 + r() * 50;
      b.box('facade', [x, h / 2, z], [18, h, 18], { color: 0xe8e0d0, collide: false, ao: false, tex: 16 });
      b.cyl('steel', [x, h * 0.72, z], 16, 3, { color: 0xb8b2a6, seg: 24 });
      b.cyl('glassDark', [x, h * 0.72 + 2.5, z], 15, 2.2, { seg: 24 });
      b.box('lampCool', [x, h + 1, z], [2, 2, 2], { collide: false, ao: false });
    }
    b.tube('steel', [-10, 210, cz], [-10, 270, cz], 1.4, { r2: 0.2, color: 0xc8c2b6 });
    b.box('lampRed', [-10, 271, cz], [1.6, 1.6, 1.6], { collide: false, ao: false });
    // central ridge truss ("the Spine crest") with gantry cranes
    for (let z = -260; z <= 260; z += 30) {
      b.box('darkSteel', [-40, 30, z], [2, 60, 2], { color: 0x5a5852, collide: false, ao: false });
      b.box('darkSteel', [-40, 60, z + 15], [3, 3, 30], { color: 0x5a5852, collide: false, ao: false });
    }
    b.finalize().forEach(m => { m.castShadow = false; });
    // gantry cranes that slowly move along the crest (life on the skyline)
    this.cranes = [];
    for (let i = 0; i < 3; i++) {
      const g = new THREE.Group(); const cb = new Builder(this.game, g, { cell: 400 });
      cb.box('hazard', [0, 0, 0], [4, 4, 4], { collide: false, ao: false, tex: 2 });
      cb.box('darkSteel', [12, 0, 0], [26, 2, 2], { color: 0xc8a030, collide: false, ao: false });
      cb.tube('cable', [24, 0, 0], [24, -30, 0], 0.2);
      cb.box('rust', [24, -31.5, 0], [5, 3, 5], { collide: false, ao: false }); // hangs from the cable end
      cb.finalize();
      g.position.set(-40, 62, -200 + i * 160); this.root.add(g);
      this.cranes.push({ g, phase: i * 2.1, base: -200 + i * 160 });
    }
  }

  // ---------------------------------------------------------------- engine
  buildEngine() {
    const g = this.engine = new THREE.Group(); g.position.set(0, -170, -10);
    const b = new Builder(this.game, g, { cell: 400 });
    // suspension struts to the hull
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; b.tube('darkSteel', [Math.cos(a) * 30, 20, Math.sin(a) * 30], [Math.cos(a) * 80, 80, Math.sin(a) * 80], 3.2, { color: 0x4a4844 }); }
    b.cyl('panel', [0, 0, 0], 36, 46, { color: 0x6a665e, seg: 40 });
    b.cyl('darkSteel', [0, 28, 0], 30, 10, { color: 0x3a3936, seg: 40 });
    b.cyl('darkSteel', [0, -28, 0], 30, 10, { r2: 34, color: 0x3a3936, seg: 40 });
    // folded harvest petals underneath (dormant)
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; b.box('rust', [Math.cos(a) * 22, -44, Math.sin(a) * 22], [10, 30, 3], { ry: -a + Math.PI / 2, rx: 0.4, color: 0x8a7a68, collide: false, ao: false }); }
    // glowing seams
    for (const y of [-12, 0, 12]) b.cyl('engineGlow', [0, y, 0], 36.4, 1.2, { seg: 40, open: true });
    b.cyl('engineGlow', [0, -48, 0], 10, 6, { seg: 24 });
    b.finalize().forEach(m => { m.castShadow = false; });
    this.engineRings = [];
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(48 + i * 9, 1.6, 8, 64), this.game.materials.steel);
      ring.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(ring.geometry.attributes.position.count * 3).fill(0.6), 3));
      ring.rotation.x = Math.PI / 2 + (i - 1) * 0.3; g.add(ring); this.engineRings.push(ring);
    }
    this.engineLight = new THREE.PointLight(0x6fd6ff, 0, 400, 1.5); this.engineLight.position.set(0, -50, 0); g.add(this.engineLight);
    this.root.add(g);
  }

  // ---------------------------------------------------------------- legs
  buildLeg(L) {
    const M = this.game.materials;
    const leg = { L };
    const sd = L.side;
    const hipG = new THREE.Group(); hipG.position.copy(L.hip); this.root.add(hipG);
    // hip housing (static, bolted under the hull)
    const hb = new Builder(this.game, hipG, { cell: 1000 });
    hb.cyl('panel', [0, 0, 0], 30, 46, { rz: Math.PI / 2, color: 0x7a7468, seg: 40, tex: 8 });
    for (const x of [-18, -6, 6, 18]) hb.cyl('darkSteel', [x, 0, 0], 31, 2.2, { rz: Math.PI / 2, color: 0x4a4844, seg: 40 });
    hb.cyl('darkSteel', [sd * 23.5, 0, 0], 22, 3, { rz: Math.PI / 2, color: 0x3a3936, seg: 40 });
    hb.cyl('hazard', [sd * 25.5, 0, 0], 9, 1.4, { rz: Math.PI / 2, seg: 24 });
    hb.box('darkSteel', [0, 18, 0], [50, 26, 50], { color: 0x55524c, collide: false, ao: false });
    for (const sz of [-1, 1]) hb.tube('darkSteel', [0, 26, sz * 26], [0, -6, sz * 34], 4, { color: 0x4a4844, seg: 12 });
    hb.finalize();
    // thigh (pivots at the hip): a box-girder with armour plates, rams and cable runs
    const thigh = new THREE.Group(); hipG.add(thigh);
    const tb = new Builder(this.game, thigh, { cell: 1000 });
    const TW = 26, TD = 30;
    tb.box('panel', [0, -THIGH / 2, 0], [TW, THIGH, TD], { color: 0x8a8478, collide: false, tex: 10, ao: false });
    for (const sz of [-1, 1]) {
      tb.box('darkSteel', [0, -THIGH / 2, sz * (TD / 2 + 1.2)], [TW - 6, THIGH - 30, 2.4], { color: 0x45433f, collide: false, ao: false });
      for (let y = -20; y > -THIGH + 20; y -= 9) tb.box('darkSteel', [0, y, sz * (TD / 2 + 2.6)], [TW - 10, 1.2, 1.2], { color: 0x5a5852, collide: false, ao: false });
    }
    for (let y = -16; y > -THIGH + 12; y -= 22) {
      tb.box('rust', [0, y, 0], [TW + 2, 3.5, TD + 2], { color: 0x8a6a50, collide: false, ao: false });
      tb.box('lampWarm', [sd * (TW / 2 + 1.1), y + 4, 8], [0.6, 1.2, 1.2], { collide: false, ao: false });
      tb.box('lampRed', [sd * (TW / 2 + 1.1), y + 4, -8], [0.6, 1.2, 1.2], { collide: false, ao: false });
    }
    // hydraulic rams (front & back)
    for (const sz of [-1, 1]) for (const sx of [-1, 1]) {
      tb.tube('darkSteel', [sx * 8, -12, sz * (TD / 2 + 6)], [sx * 8, -THIGH * 0.58, sz * (TD / 2 + 6)], 4.2, { color: 0x3c3b38, seg: 16 });
      tb.tube('steel', [sx * 8, -THIGH * 0.58, sz * (TD / 2 + 6)], [sx * 8, -THIGH + 18, sz * (TD / 2 + 6)], 2.4, { color: 0xd8d8d8, seg: 14 });
      tb.box('darkSteel', [sx * 8, -12, sz * (TD / 2 + 3)], [6, 6, 6], { color: 0x3a3936, collide: false, ao: false });
    }
    // maintenance ladder cage & landings on the outboard face (sells the scale: human-sized)
    tb.box('hazard', [sd * (TW / 2 + 0.3), -THIGH * 0.42, 2], [0.4, THIGH * 0.72, 1.2], { collide: false, ao: false, tex: 2 });
    for (let y = -24; y > -THIGH + 30; y -= 30) { tb.box('grate', [sd * (TW / 2 + 1.6), y, 2], [3, 0.3, 5], { color: 0x9a9a9a, collide: false, ao: false, tex: 1 }); tb.railing([sd * (TW / 2 + 3), y, -0.5], [sd * (TW / 2 + 3), y, 4.5], { collide: false, h: 1.1 }); }
    tb.path('cable', [[sd * 9, -2, TD / 2 + 1], [sd * 11, -THIGH * 0.5, TD / 2 + 3.5], [sd * 9, -THIGH + 8, TD / 2 + 1]], 1.1, { segs: 24 });
    tb.path('cable', [[-sd * 9, -2, TD / 2 + 1], [-sd * 10, -THIGH * 0.5, TD / 2 + 3], [-sd * 9, -THIGH + 8, TD / 2 + 1]], 0.8, { segs: 24 });
    tb.finalize();
    // painted leg number
    const num = new THREE.Mesh(new THREE.PlaneGeometry(22, 22), M.board(L.name === 'Leg Two' ? '2' : L.name === 'Leg One' ? '1' : L.name === 'Leg Three' ? '3' : '4', { color: '#e8e0d0', font: '700 110px "Barlow Condensed", sans-serif', w: 128, h: 128 }));
    num.position.set(sd * (TW / 2 + 0.15), -48, -6); num.rotation.y = sd * Math.PI / 2; thigh.add(num);
    // knee
    const knee = new THREE.Group(); knee.position.y = -THIGH; thigh.add(knee);
    const kb = new Builder(this.game, knee, { cell: 1000 });
    kb.cyl('panel', [0, 0, 0], 21, 36, { rz: Math.PI / 2, color: 0x6e6a62, seg: 36, tex: 8 });
    kb.cyl('darkSteel', [0, 0, 0], 22, 6, { rz: Math.PI / 2, color: 0x3a3936, seg: 36 });
    kb.cyl('hazard', [sd * 18.5, 0, 0], 8, 1.2, { rz: Math.PI / 2, seg: 24 });
    kb.box('lampRed', [sd * 19.3, 0, 0], [0.8, 2, 2], { collide: false, ao: false });
    // shin
    const SW = 22, SDp = 24;
    kb.box('panel', [0, -SHIN / 2, 0], [SW, SHIN, SDp], { color: 0x8a8478, collide: false, tex: 10, ao: false });
    for (const sz of [-1, 1]) kb.box('darkSteel', [0, -SHIN / 2, sz * (SDp / 2 + 1)], [SW - 6, SHIN - 24, 2], { color: 0x45433f, collide: false, ao: false });
    for (let y = -20; y > -SHIN + 14; y -= 24) kb.box('rust', [0, y, 0], [SW + 2, 3, SDp + 2], { color: 0x8a6a50, collide: false, ao: false });
    for (const sz of [-1, 1]) for (const sx of [-1, 1]) { kb.tube('darkSteel', [sx * 6.5, -10, sz * (SDp / 2 + 4)], [sx * 6.5, -SHIN * 0.6, sz * (SDp / 2 + 4)], 3.2, { color: 0x3c3b38, seg: 14 }); kb.tube('steel', [sx * 6.5, -SHIN * 0.6, sz * (SDp / 2 + 4)], [sx * 6.5, -SHIN + 26, sz * (SDp / 2 + 4)], 1.8, { color: 0xd8d8d8, seg: 12 }); }
    kb.finalize();
    // foot (kept level, below the ankle)
    const foot = new THREE.Group(); this.root.add(foot);
    const fb = new Builder(this.game, foot, { cell: 1000 });
    fb.cyl('darkSteel', [0, 9, 0], 15, 16, { color: 0x3a3936, seg: 28 });
    fb.cyl('panel', [0, 2.5, 0], 32, 5, { r2: 27, color: 0x5c5850, seg: 40 });
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + Math.PI / 6; fb.box('rust', [Math.cos(a) * 29, 1.6, Math.sin(a) * 29], [18, 3.2, 8], { ry: -a, color: 0x6a5240, collide: false, ao: false }); }
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; fb.tube('steel', [Math.cos(a) * 12, 16, Math.sin(a) * 12], [Math.cos(a) * 22, 4, Math.sin(a) * 22], 1.2, { color: 0xc8c8c8, seg: 8 }); }
    fb.finalize();
    leg.hipG = hipG; leg.thigh = thigh; leg.knee = knee; leg.foot = foot;
    return leg;
  }

  dustAt(L) {
    // dust ring rising where the foot lands — spawn in the city frame, drifting backwards with the ground
    const fx = this.game.fx; const p = L.foot.clone(); p.y = this.city.groundY - this.city.bob + 2;
    const d = p.distanceTo(this.game.engine.camera.position);
    if (d > 2500) return;
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2;
      fx.alpha.spawn({ x: p.x + Math.cos(a) * 22, y: p.y, z: p.z + Math.sin(a) * 22, vx: Math.cos(a) * 9, vy: 2 + Math.random() * 3, vz: Math.sin(a) * 9 + this.city.speed,
        life: 7 + Math.random() * 4, s0: 18, s1: 60, c0: [0.62, 0.56, 0.47, 0.5], c1: [0.62, 0.56, 0.47, 0], drag: 0.35, spin: (Math.random() - 0.5) * 0.2 });
    }
  }

  update(dt) {
    const c = this.city, t = this.game.time;
    for (const leg of this.legs) {
      const L = leg.L;
      const ls = c.legStates.find(s => s.id === L.id);
      const foot = ls.foot; // city frame
      const rel = foot.clone().add(new THREE.Vector3(0, 17, 0)).sub(L.hip); // hip-relative ankle target
      rel.x = 0;
      const du = -rel.z, dy = rel.y;
      let d = Math.hypot(du, dy); d = Math.min(d, THIGH + SHIN - 0.5);
      const a = Math.atan2(du, -dy);
      const alpha = Math.acos(clamp((THIGH * THIGH + d * d - SHIN * SHIN) / (2 * THIGH * d), -1, 1));
      const beta = Math.acos(clamp((THIGH * THIGH + SHIN * SHIN - d * d) / (2 * THIGH * SHIN), -1, 1));
      const th1 = a + alpha, th2 = th1 - (Math.PI - beta);
      leg.thigh.rotation.x = th1; leg.knee.rotation.x = th2 - th1;
      // foot follows the shin end in world, kept level, slight toe lift during swing
      leg.knee.updateMatrixWorld(true);
      const ankle = new THREE.Vector3(0, -SHIN, 0).applyMatrix4(leg.knee.matrixWorld);
      this.root.worldToLocal(ankle);
      leg.foot.position.copy(ankle).add(new THREE.Vector3(0, -17, 0));
      leg.foot.rotation.x = ls.planted ? 0 : -Math.sin((ls.lift || 0) / 34 * Math.PI) * 0.15;
    }
    // engine
    this.engineRings.forEach((r, i) => (r.rotation.z += dt * (0.05 + i * 0.03) * (i % 2 ? -1 : 1) * (this.city.walking ? 1 : 0.1)));
    for (const cr of this.cranes) { cr.g.position.z = cr.base + Math.sin(t * 0.02 + cr.phase) * 60; cr.g.rotation.y = Math.sin(t * 0.05 + cr.phase) * 0.8; }
  }
}
