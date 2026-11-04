// Procedural floor builder. A floor is a recipe: a visual THEME plus a sequence of ROOMS laid out
// along +Z, separated by blast gates, with a checkpoint at each room. Each room type builds its own
// set and runs its own objective (clear the room, destroy targets, cross a hazard, hold a zone...).
// Story lines (Halo / Iris) hang off the recipe: intro, per-room enter/clear beats, outro.
import * as THREE from 'three';
import { Mat, moltenMaterial } from '../engine/materials.js';
import { Box } from '../engine/physics.js';
import { FXColors } from '../engine/fx.js';
import { setStyle } from '../engine/stylize.js';
import {
  brickTextures, carpetTexture, lockerTexture, shelfTexture, woodFloorTextures, checkerTextures, billboardTexture, rackTexture, detailedSurface,
} from '../engine/textures.js';
import { solid, wall, Press, Hatch, dropDrone, Mover, screen, sign, Spotlight, marquee, Elevator, stageLights, pipeRun, embers, confetti, pyro } from './kit.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const K = (k) => `<span class="key">${k}</span>`;
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const texMat = (maps, rep, o = {}) => {
  const c = (t) => { if (!t) return t; const x = t.clone(); x.repeat.set(rep[0], rep[1]); x.needsUpdate = true; return x; };
  return new THREE.MeshStandardMaterial({ map: c(maps.map), normalMap: c(maps.normalMap), roughnessMap: c(maps.roughnessMap), ...o });
};
const glowMat = (color, i = 3) => new THREE.MeshStandardMaterial({ color: '#000', emissive: color, emissiveIntensity: i });

// ================================================================== THEMES
// floor / wall / trim materials, palette, fog, lights, music, and per-room dressing
export const THEMES = {
  backstage: {
    floor: () => Mat.concrete('#3a3a3e', 6), wall: () => Mat.panel('#2c2e34', 1), trim: '#f2c230', glow: '#ff9a3a',
    bg: '#09090b', fog: ['#16161c', 0.012], light: { sky: '#8a8070', ground: '#2a2420', hemi: 0.5, key: '#ffe8d0', keyI: 2.0 },
    style: { rim: '#ffcf8a', rimStrength: 0.7, sky: '#8090b0', ground: '#6a4a30' }, practical: '#ffd8a0', music: 'f1',
    dress(c, z0, z1) {
      const { g, HW, r } = c;
      for (let z = z0 + 4; z < z1 - 3; z += 9) {
        // road cases + cable reels along the walls
        for (const s of [-1, 1]) {
          if (r() < 0.6) solid(g, { pos: [s * (HW - 1.4), 0.7, z], size: [1.6, 1.4, 2.2], mat: Mat.paint('#1b1c20', 0.6, 0.2), round: 0.06 });
          if (r() < 0.4) { const reel = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.5, 16), Mat.paint('#c9a03a', 0.5, 0.3)); reel.rotation.z = Math.PI / 2; reel.position.set(s * (HW - 1.2), 0.7, z + 2.5); g.scene.add(reel); }
        }
      }
      pipeRun(g, [[-HW + 0.6, c.CH - 2, z0], [-HW + 0.6, c.CH - 2, z1]], { r: 0.3, stripes: 'yellow', flangeEvery: 6 });
      pipeRun(g, [[HW - 0.6, c.CH - 3, z0], [HW - 0.6, c.CH - 3, z1]], { r: 0.4, copper: true, flangeEvery: 5 });
      // hanging work lights
      for (let z = z0 + 6; z < z1; z += 12) { const lamp = new THREE.Mesh(new THREE.ConeGeometry(0.6, 0.6, 12, 1, true), Mat.metal('#222')); lamp.position.set(0, c.CH - 1.2, z); g.scene.add(lamp); }
    },
    cover: 'crates',
  },
  lockers: {
    floor: () => Mat.tile('#8a9aa2', '#3a444c', 10, 4, 0.35), wall: () => texMat(lockerTexture('#2f5a72', 1), [3, 1], { metalness: 0.5, roughness: 0.45 }), trim: '#25f4ff', glow: '#25f4ff',
    bg: '#06090c', fog: ['#0e1418', 0.011], light: { sky: '#a0c8e0', ground: '#1a2a30', hemi: 0.55, key: '#e0f4ff', keyI: 1.9 },
    style: { rim: '#9fe8ff', rimStrength: 0.75, sky: '#7ab0d0', ground: '#2a4048' }, practical: '#d8f4ff', music: 'f1',
    dress(c, z0, z1) {
      const { g, HW, r } = c;
      // benches
      for (let z = z0 + 5; z < z1 - 4; z += 10) for (const s of [-1, 1]) solid(g, { pos: [s * (HW - 2.6), 0.4, z], size: [0.9, 0.18, 4], mat: woodMat(), round: 0.04 });
      // fluorescent tubes
      for (let z = z0 + 4; z < z1; z += 8) for (const x of [-6, 6]) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 3), glowMat('#e8f8ff', 2.5)); t.position.set(x, c.CH - 0.3, z); g.scene.add(t); }
    },
    cover: 'lockers',
  },
  showfloor: {
    floor: () => texMat(checkerTextures('#cfc6b8', '#9a1440', 8), [3, 3], { metalness: 0.15, roughness: 0.5 }), wall: () => Mat.panel('#2a1438', 1), trim: '#ffd400', glow: '#ff2d6f',
    bg: '#0a0410', fog: ['#1a0a20', 0.009], light: { sky: '#c070ff', ground: '#300a20', hemi: 0.6, key: '#fff0e0', keyI: 2.2 },
    style: { rim: '#ff8ad0', rimStrength: 0.8, sky: '#a070ff', ground: '#802040' }, practical: '#ffd0f0', music: 'f1',
    dress(c, z0, z1) {
      const { g, HW, CH } = c;
      for (const s of [-1, 1]) marquee(g, [s * (HW - 0.05), CH - 2, (z0 + z1) / 2], z1 - z0 - 4, s * -Math.PI / 2, Math.floor((z1 - z0) / 1.5), '#ffd400');
      for (let z = z0 + 8; z < z1; z += 16) c.spots.push(new Spotlight(g, [(z / 16 % 2 ? -1 : 1) * (HW - 2), CH - 1, z], z % 32 ? '#ff2d6f' : '#25f4ff', { center: [0, 0, z], radius: 8, intensity: 500 }));
    },
    cover: 'podiums',
  },
  neon: {
    floor: () => Mat.concrete('#24262c', 6), wall: () => texMat(brickTextures('#4a2a34', '#141016'), [6, 2], { roughness: 0.85 }), trim: '#ff2d6f', glow: '#ff2d6f',
    bg: '#04030a', fog: ['#120818', 0.014], light: { sky: '#5040a0', ground: '#200818', hemi: 0.45, key: '#c0a0ff', keyI: 1.4 },
    style: { rim: '#ff5ab0', rimStrength: 0.95, sky: '#6040ff', ground: '#ff2060' }, practical: '#ff6ab8', music: 'f4',
    dress(c, z0, z1) {
      const { g, HW, CH, r } = c;
      const ads = [['HALO BRAND DUSTPANS', 'for when the contestant is the mess'], ['JUMP BOOTS', 'now 40% less explode-y'], ['VOTE CHAOS', 'text 99-99-99'], ['TOWER LIVING', 'you will never want to leave'], ['RESPAWN INSURANCE', 'terms and conditions apply'], ['DRINK GLOW', 'it glows. that is the flavor.']];
      for (let z = z0 + 5; z < z1 - 3; z += 11) for (const s of [-1, 1]) {
        const [t, sub] = ads[(r() * ads.length) | 0];
        const pal = [['#ff2d6f', '#2a0418'], ['#25f4ff', '#031a24'], ['#ffd400', '#241a02'], ['#a050ff', '#14042a']][(r() * 4) | 0];
        const b = new THREE.Mesh(new THREE.PlaneGeometry(7, 3.5), new THREE.MeshBasicMaterial({ map: billboardTexture(t, sub, { color: pal[0], bg: pal[1] }), toneMapped: false }));
        b.position.set(s * (HW - 0.1), 6 + r() * 3, z); b.rotation.y = -s * Math.PI / 2; g.scene.add(b);
        const l = new THREE.PointLight(pal[0], 14, 10, 1.6); l.position.set(s * (HW - 2), 7, z); g.scene.add(l); g.dim(l);
      }
      // neon tubes + steam vents on the ground
      for (let z = z0 + 2; z < z1; z += 6) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 4), glowMat(r() < 0.5 ? '#ff2d6f' : '#25f4ff', 3)); t.position.set((r() < 0.5 ? -1 : 1) * (HW - 0.2), 3, z); g.scene.add(t); }
      c.steam = (c.steam || []).concat([V(-HW + 3, 0, z0 + 7), V(HW - 3, 0, z1 - 7)]);
    },
    cover: 'cars',
  },
  archive: {
    floor: () => texMat({ map: carpetTexture('#4a2c1c', '#2a160c', '#a07a3a'), normalMap: detailedSurface('fabric').normalMap }, [10, 10], { roughness: 0.95 }), wall: () => texMat(woodFloorTextures('#4a2e1a'), [4, 2], { roughness: 0.6 }), trim: '#d4a53a', glow: '#ffb060',
    bg: '#060403', fog: ['#120c08', 0.02], light: { sky: '#a08060', ground: '#1a1008', hemi: 0.35, key: '#ffd8a0', keyI: 1.2 },
    style: { rim: '#ffc070', rimStrength: 0.7, sky: '#806040', ground: '#402010' }, practical: '#ffc890', music: 'f12',
    dress(c, z0, z1) {
      const { g, HW, CH } = c;
      for (let z = z0 + 3; z < z1 - 2; z += 4) for (const s of [-1, 1]) solid(g, { pos: [s * (HW - 0.8), 3, z], size: [1.2, 6, 3.6], mat: [Mat.paint('#2a1a10'), Mat.paint('#2a1a10'), Mat.paint('#2a1a10'), Mat.paint('#2a1a10'), shelfMat(), shelfMat()] });
      // green banker lamps hanging
      for (let z = z0 + 5; z < z1; z += 10) for (const x of [-7, 7]) { const sh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), Mat.paint('#1a5a2a', 0.3, 0.3)); sh.position.set(x, CH - 2, z); g.scene.add(sh); const b = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), glowMat('#ffd890', 3)); b.position.set(x, CH - 2.05, z); g.scene.add(b); }
    },
    cover: 'shelves',
  },
  boiler: {
    floor: () => Mat.grate(6), wall: () => texMat(brickTextures('#6a3020', '#1c1410'), [6, 2], { roughness: 0.8 }), trim: '#ff6a1a', glow: '#ff6a1a',
    bg: '#0a0504', fog: ['#1a0c08', 0.016], light: { sky: '#b07050', ground: '#2a1008', hemi: 0.45, key: '#ffc890', keyI: 1.6 },
    style: { rim: '#ff9a4a', rimStrength: 0.85, sky: '#a06040', ground: '#a03010' }, practical: '#ff9a5a', music: 'f4',
    dress(c, z0, z1) {
      const { g, HW, CH, r } = c;
      for (const s of [-1, 1]) {
        pipeRun(g, [[s * (HW - 0.7), 1.6, z0], [s * (HW - 0.7), 1.6, z1]], { r: 0.5, copper: true, flangeEvery: 4 });
        pipeRun(g, [[s * (HW - 1.2), CH - 2.5, z0], [s * (HW - 1.2), CH - 2.5, z1]], { r: 0.45, stripes: 'red', flangeEvery: 5, valve: 0 });
      }
      for (let z = z0 + 6; z < z1 - 4; z += 14) { const s = r() < 0.5 ? -1 : 1; const tank = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 6, 20), Mat.metal('#6a4a30', 0.45, 0.8)); tank.position.set(s * (HW - 3), 3, z); g.scene.add(tank); g.physics.add(new Box({ pos: V(s * (HW - 3), 3, z), size: [4, 6, 4] })); }
      c.steam = (c.steam || []).concat([V(-HW + 2.5, 0.5, (z0 + z1) / 2), V(HW - 2.5, 0.5, z0 + 5)]);
      embers(g, { minX: -HW + 2, maxX: HW - 2, minZ: z0, maxZ: z1, y: 0.2 }, 6);
    },
    cover: 'tanks',
  },
  servers: {
    floor: () => Mat.panel('#1a1e26', 4), wall: () => texMat({ map: rackTexture('#25f4ff') }, [6, 1], { emissive: '#ffffff', emissiveIntensity: 0.25, emissiveMap: rackTexture('#25f4ff'), metalness: 0.6, roughness: 0.4 }), trim: '#25f4ff', glow: '#25f4ff',
    bg: '#020408', fog: ['#04101a', 0.016], light: { sky: '#3080c0', ground: '#04080c', hemi: 0.4, key: '#a0e0ff', keyI: 1.3 },
    style: { rim: '#4ae0ff', rimStrength: 1.0, sky: '#2060a0', ground: '#002030' }, practical: '#80e8ff', music: 'f12',
    dress(c, z0, z1) {
      const { g, HW, CH } = c;
      for (let z = z0 + 2; z < z1; z += 5) { const t = new THREE.Mesh(new THREE.BoxGeometry(2 * HW - 2, 0.08, 0.3), glowMat('#25f4ff', 1.6)); t.position.set(0, CH - 0.2, z); g.scene.add(t); }
    },
    cover: 'racks',
  },
};
let _wood, _shelf;
function woodMat() { return _wood || (_wood = texMat(woodFloorTextures('#7a5030'), [1, 1], { roughness: 0.55 })); }
function shelfMat() { return _shelf || (_shelf = new THREE.MeshStandardMaterial({ map: shelfTexture(), roughness: 0.85 })); }

// ================================================================== cover pieces
const COVER = {
  crates(c, x, z) { const { g, r } = c; if (r() < 0.5) g.addProp(r() < 0.5 ? 'crateBig' : 'crate', [x, 1, z]); else solid(g, { pos: [x, 0.9, z], size: [2.6, 1.8, 1.8], mat: Mat.paint('#3a3e46', 0.55, 0.3), round: 0.08 }); if (r() < 0.3) g.addProp('barrel', [x + 1.8, 0.6, z + 0.6]); },
  lockers(c, x, z) { const { g, r } = c; const rot = r() < 0.5 ? 0 : Math.PI / 2; solid(g, { pos: [x, 1.5, z], size: rot ? [0.9, 3, 4] : [4, 3, 0.9], mat: texMat(lockerTexture('#4a7a2a', 10 + ((r() * 80) | 0)), [1, 1], { metalness: 0.5, roughness: 0.45 }) }); },
  podiums(c, x, z) { const { g } = c; solid(g, { pos: [x, 1.1, z], size: [2.4, 2.2, 2.4], mat: Mat.paint('#e8e2d0', 0.35, 0.2), round: 0.15 }); const t = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.2, 2.45), glowMat('#ff2d6f', 2)); t.position.set(x, 2.1, z); g.scene.add(t); },
  cars(c, x, z) { const { g, r } = c; const col = ['#c42040', '#2060c0', '#e0b020', '#20a070', '#e8e8e8'][(r() * 5) | 0]; solid(g, { pos: [x, 0.75, z], size: [2.2, 1.1, 4.4], mat: Mat.paint(col, 0.3, 0.6), round: 0.35 }); solid(g, { pos: [x, 1.6, z - 0.2], size: [1.9, 0.7, 2.4], mat: Mat.glass('#203040', 0.6), round: 0.25, collide: false }); for (const sx of [-1, 1]) for (const sz of [-1.4, 1.4]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 14), Mat.rubber()); w.rotation.z = Math.PI / 2; w.position.set(x + sx * 1.1, 0.42, z + sz); g.scene.add(w); } },
  shelves(c, x, z) { const { g, r } = c; const along = r() < 0.6; solid(g, { pos: [x, 2, z], size: along ? [1, 4, 5] : [5, 4, 1], mat: [Mat.paint('#2a1a10'), Mat.paint('#2a1a10'), Mat.paint('#2a1a10'), Mat.paint('#2a1a10'), shelfMat(), shelfMat()] }); },
  tanks(c, x, z) { const { g } = c; const t = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 2.4, 16), Mat.metal('#7a5a3a', 0.45, 0.85)); t.position.set(x, 1.2, z); g.scene.add(t); g.physics.add(new Box({ pos: V(x, 1.2, z), size: [2, 2.4, 2] })); },
  racks(c, x, z) { const { g } = c; const m = new THREE.MeshStandardMaterial({ map: rackTexture('#3dff9a'), emissive: '#ffffff', emissiveMap: rackTexture('#3dff9a'), emissiveIntensity: 0.3, metalness: 0.5, roughness: 0.4 }); solid(g, { pos: [x, 1.6, z], size: [1.4, 3.2, 3.6], mat: [Mat.metal('#1a1e26'), Mat.metal('#1a1e26'), Mat.metal('#1a1e26'), Mat.metal('#1a1e26'), m, m] }); },
  pillars(c, x, z) { solid(c.g, { pos: [x, c.CH / 2, z], size: [1.6, c.CH, 1.6], mat: c.wallMat }); },
};

// ================================================================== hazards / objectives
// Destructible target (power core / ad tower / data terminal).
export class Target {
  constructor(g, pos, name, o = {}) {
    this.g = g; this.name = name; this.onDestroy = o.onDestroy;
    this.pos = V(pos[0], pos[1] + 1.6, pos[2]);
    this.hp = this.max = o.hp || 380; this.alive = true; this.radius = 1.4;
    const color = o.color || '#25f4ff';
    const grp = this.grp = new THREE.Group(); grp.position.set(...pos); g.scene.add(grp);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.9, 0.6, 16), Mat.metal('#2a2e36', 0.4, 0.9)); base.position.y = 0.3; grp.add(base);
    this.coreMat = glowMat(color, 4);
    this.core = new THREE.Mesh(o.shape === 'screen' ? new THREE.BoxGeometry(1.8, 2.4, 0.3) : new THREE.CylinderGeometry(0.7, 0.7, 2.2, 20), this.coreMat); this.core.position.y = 1.7; grp.add(this.core);
    for (let i = 0; i < 6; i++) { const bar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.6, 0.12), Mat.metal('#888', 0.3, 1)); const a = i / 6 * Math.PI * 2; bar.position.set(Math.cos(a) * 1.1, 1.7, Math.sin(a) * 1.1); grp.add(bar); }
    for (const y of [0.55, 2.9]) { const r = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.1, 6, 20), Mat.paint('#f2c230', 0.4, 0.5)); r.rotation.x = Math.PI / 2; r.position.y = y; grp.add(r); }
    this.lbl = sign(g, [name], [0, 3.6, 0], 3.2, 0.8, 0, { parent: grp, glow: color, double: true });
    this.light = new THREE.PointLight(color, 30, 12); this.light.position.y = 1.7; grp.add(this.light);
    const c = new Box({ pos: this.pos.clone(), size: [1.8, 2.8, 1.8] }); c.owner = this; g.physics.add(c); this.collider = c;
    g.destructibles.push(this); g.addHazard(this);
    this.flash = 0;
  }
  onShot(dmg, info) {
    if (!this.alive) return;
    this.hp -= dmg * (info.weapon === 'hammer' || info.weapon === 'blades' ? 1.6 : 1);
    this.flash = 1;
    this.g.fx.electric(info.point || this.pos, 5, 0.4);
    this.g.audio.play('zap', { pos: this.pos });
    this.g.hud.hitmarker(false, false);
    if (this.hp <= 0) this.destroy();
  }
  destroy(silent) {
    if (!this.alive && !silent) return;
    this.alive = false;
    const g = this.g;
    this.core.visible = false; this.light.intensity = 0; this.lbl.visible = false; this.collider.enabled = false;
    if (!silent) {
      g.explode(this.pos, 1.6, 40, { source: 'player' });
      g.fx.electric(this.pos, 40, 2);
      g.audio.play('glassShatter', { pos: this.pos }); g.audio.play('cheer', { big: 1.6 });
      g.addHype(0.15); g.player.shake(0.5); g.slowmo(0.35, 0.6);
    }
    if (this.onDestroy) this.onDestroy(silent);
  }
  update(dt) {
    if (!this.alive) return;
    this.flash = Math.max(0, this.flash - dt * 5);
    this.core.rotation.y += dt * 0.8;
    this.coreMat.emissiveIntensity = 3 + Math.sin(performance.now() * 0.006) + this.flash * 6;
    this.grp.scale.setScalar(1 + this.flash * 0.04);
  }
}

// Laser beam: a glowing bar that sweeps, rotates or blinks; touching it hurts and knocks you back.
class Laser {
  constructor(g, o) {
    this.g = g; this.o = o; this.t = o.phase || 0;
    this.len = o.len; this.y0 = o.y;
    this.mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, o.len, 8), new THREE.MeshBasicMaterial({ color: o.color || '#ff2040', toneMapped: false }));
    this.glow = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, o.len, 8, 1, true), new THREE.MeshBasicMaterial({ color: o.color || '#ff2040', transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.mesh.add(this.glow);
    g.scene.add(this.mesh);
    for (const s of [-1, 1]) { const em = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), Mat.metal('#2a2e36')); this.mesh.add(em); em.position.y = s * o.len / 2; }
    this.a = V(); this.b = V(); this.on = true;
    g.addHazard(this);
  }
  update(dt) {
    const o = this.o; this.t += dt;
    const m = this.mesh;
    let x = 0, y = this.y0, z = o.z, rot = 0;
    if (o.mode === 'sweepZ') z = o.z + Math.sin(this.t * (o.speed || 1)) * (o.range || 4);
    if (o.mode === 'sweepY') y = o.y + (Math.sin(this.t * (o.speed || 1)) * 0.5 + 0.5) * (o.range || 2);
    if (o.mode === 'spin') rot = this.t * (o.speed || 0.8);
    this.on = o.mode !== 'blink' || Math.sin(this.t * (o.speed || 2) + (o.phase || 0)) > -0.2;
    m.visible = this.on;
    m.position.set(x, y, z); m.rotation.set(0, 0, Math.PI / 2 + rot);
    const dir = V(Math.cos(rot), Math.sin(rot), 0);
    this.a.set(x, y, z).addScaledVector(dir, -this.len / 2); this.b.set(x, y, z).addScaledVector(dir, this.len / 2);
    if (!this.on) return;
    const pl = this.g.player; if (!pl.alive) return;
    const h = pl.mode === 'slide' || pl.crouch ? 0.85 : 1.75;
    // distance between the beam segment and the player's vertical capsule axis
    const pa = V(pl.pos.x, pl.pos.y + 0.3, pl.pos.z), pb = V(pl.pos.x, pl.pos.y + h, pl.pos.z);
    if (segDist(this.a, this.b, pa, pb) < 0.45 && (this.cool = (this.cool || 0) - dt) <= 0) {
      this.cool = 0.6;
      const push = V(0, 6, Math.sign(pl.pos.z - z || 1) * -7);
      pl.damage(o.damage || 18, { type: 'laser', knock: push, from: V(pl.pos.x, y, z) });
      this.g.fx.sparks(V(pl.pos.x, y, pl.pos.z), 14, null, 6, FXColors.pink, FXColors.pinkEnd);
      this.g.audio.play('zap', { pos: pl.pos });
    }
  }
}
function segDist(p1, q1, p2, q2) {
  const d1 = q1.clone().sub(p1), d2 = q2.clone().sub(p2), r = p1.clone().sub(p2);
  const a = d1.dot(d1), e = d2.dot(d2), f = d2.dot(r);
  let s, t;
  const c = d1.dot(r), b = d1.dot(d2), den = a * e - b * b;
  s = den > 1e-6 ? Math.min(1, Math.max(0, (b * f - c * e) / den)) : 0;
  t = (b * s + f) / e;
  if (t < 0) { t = 0; s = Math.min(1, Math.max(0, -c / a)); } else if (t > 1) { t = 1; s = Math.min(1, Math.max(0, (b - c) / a)); }
  return p1.clone().addScaledVector(d1, s).distanceTo(p2.clone().addScaledVector(d2, t));
}

// ================================================================== ROOMS
// Each room: build(c, room, z0) -> { len, run*(g), update?(dt), skip?() }
function hatchesFor(c, z0, len, n = 4) {
  const { g, HW, r } = c, out = [];
  for (let i = 0; i < n; i++) {
    const side = i % 2 ? 1 : -1, z = z0 + 6 + (i / Math.max(1, n - 1)) * (len - 12);
    out.push(new Hatch(g, [side * (HW - 4 - r() * 3), 0, z], { color: c.T.glow }));
  }
  return out;
}
function coverField(c, z0, len, density = 1, kind) {
  const { HW, r } = c, k = kind || c.T.cover;
  const n = Math.round(len / 7 * density);
  for (let i = 0; i < n; i++) {
    const z = z0 + 5 + r() * (len - 10), x = (r() * 2 - 1) * (HW - 5);
    if (Math.abs(x) < 2.2 && r() < 0.7) continue; // keep a lane down the middle
    COVER[k](c, x, z);
  }
}
// spawn helper: [type, count] groups, from hatches or the ceiling (drones)
function spawnGroup(c, room, list) {
  const { g } = c; let n = 0;
  for (const [type, count] of list) for (let i = 0; i < count; i++) {
    const d = n++ * 0.55;
    g.later(d, () => {
      if (type === 'drone') dropDrone(g, [(c.r() * 2 - 1) * (c.HW - 4), c.CH - 1, room.z0 + 6 + c.r() * (room.len - 10)], { drop: c.CH - 7 });
      else room.hatches[(c.r() * room.hatches.length) | 0].spawn(type);
    });
  }
  return n;
}

export const ROOMS = {
  // ---- open combat room with cover; waves of robots from floor hatches / ceiling ports
  arena(c, room, z0) {
    const len = room.len || 36;
    coverField(c, z0, len, room.cover ?? 1, room.coverKind);
    if (room.catwalks) catwalks(c, z0, len);
    room.hatches = hatchesFor(c, z0, len, room.hatchCount || 4);
    for (let i = 0; i < (room.barrels ?? 3); i++) c.g.addProp('barrel', [(c.r() * 2 - 1) * (c.HW - 3), 0.6, z0 + 4 + c.r() * (len - 8)]);
    c.F.spawnPoints.push([-c.HW + 5, 0, z0 + len / 2], [c.HW - 5, 0, z0 + len / 2]);
    return {
      len,
      *run(g) {
        const waves = room.waves || [[['clanker', 4]], [['clanker', 3], ['drone', 2]]];
        if (room.vote) g.audience.setAuto(true, 18);
        for (let w = 0; w < waves.length; w++) {
          const total = spawnGroup(c, room, waves[w]);
          g.setObjective(room.objective || 'CLEAR THE ROOM', `WAVE ${w + 1} / ${waves.length}`);
          yield total * 0.55 + 2.6;
          yield () => g.aliveEnemies() <= (w < waves.length - 1 ? 1 : 0);
          if (w < waves.length - 1) { g.hud.banner(`WAVE ${w + 2}`, 'event', 2); yield 1.5; }
        }
        g.audience.setAuto(false);
      },
    };
  },
  // ---- destroy N targets while the room keeps spawning reinforcements
  targets(c, room, z0) {
    const len = room.len || 40, { g, HW } = c, n = room.count || 3;
    coverField(c, z0, len, room.cover ?? 0.8, room.coverKind);
    room.hatches = hatchesFor(c, z0, len, 4);
    const label = room.label || 'POWER CORE';
    room.targets = [];
    for (let i = 0; i < n; i++) {
      const x = n === 1 ? 0 : -HW * 0.55 + (i / (n - 1)) * HW * 1.1, z = z0 + len * 0.45 + (i % 2 ? 6 : -2);
      room.targets.push(new Target(g, [x, 0, z], label, { color: room.color || c.T.glow, hp: room.hp || 380, shape: room.shape, onDestroy: () => { room.down = (room.down || 0) + 1; } }));
    }
    return {
      len,
      *run(g) {
        const total = room.targets.length;
        const upd = () => g.setObjective(room.objective || `DESTROY THE ${label}S`, `${room.down || 0} / ${total} destroyed`);
        upd(); room.down = room.down || 0;
        if (room.vote) g.audience.setAuto(true, 20);
        spawnGroup(c, room, room.first || [['clanker', 3], ['drone', 1]]);
        let t = 0, last = -1;
        while (room.down < total) {
          yield 0.25; t += 0.25;
          if (room.down !== last) { last = room.down; upd(); if (room.down > 0 && room.down < total) spawnGroup(c, room, room.reinforce || [['clanker', 2], ['shield', 1]]); }
          if (t > (room.every || 9) && g.aliveEnemies() < (room.maxAlive || 6)) { t = 0; spawnGroup(c, room, [[c.r() < 0.3 ? 'drone' : 'clanker', 2]]); }
        }
        g.audience.setAuto(false);
        g.setObjective('MOP UP', 'finish the stragglers');
        yield () => g.aliveEnemies() === 0;
      },
      skip() { for (const t of room.targets) if (t.alive) t.destroy(true); },
    };
  },
  // ---- stamping hall: a grid of presses to time your way through
  presses(c, room, z0) {
    const len = room.len || 32, { g, HW, r } = c;
    const cols = room.cols || 3, rows = Math.floor((len - 8) / 8);
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
      const x = -HW + (j + 0.5) * (2 * HW / cols), z = z0 + 6 + i * 8;
      g.addHazard(new Press(g, { pos: [x, 0, z], size: [2 * HW / cols - 1.2, 2.4, 5], lowY: 0, highY: 8, cycle: { up: 1.6 + r() * 0.8, warn: 0.6, down: 0.18, hold: 0.5, rise: 0.9 }, offset: r() * 3, rods: [[-1.2, 0], [1.2, 0]] }));
    }
    room.hatches = hatchesFor(c, z0, len, 2);
    return {
      len,
      *run(g) {
        g.setObjective(room.objective || 'CROSS THE STAMPING HALL', 'time the presses · slide under the gaps');
        if (room.waves) spawnGroup(c, room, room.waves[0]);
        yield () => g.player.pos.z > z0 + len - 3;
      },
    };
  },
  // ---- THE FLOOR IS LAVA: a molten pit with stepping stones, movers and grapple points
  lava(c, room, z0) {
    const len = room.len || 40, { g, HW, r } = c;
    room.noFloor = true;
    const molten = moltenMaterial({ scale: 0.25 });
    const pit = new THREE.Mesh(new THREE.BoxGeometry(2 * HW, 0.4, len - 6), molten); pit.position.set(0, -1.6, z0 + len / 2); g.scene.add(pit);
    const hz = g.physics.addBox({ pos: V(0, -1.7, z0 + len / 2), size: [2 * HW, 0.4, len - 6], hazard: { dps: 40, type: 'molten' } }); hz.noSafe = true;
    // landings at both ends
    solid(g, { pos: [0, -0.5, z0 + 1.5], size: [2 * HW, 1, 3], mat: c.floorMat, cast: false });
    solid(g, { pos: [0, -0.5, z0 + len - 1.5], size: [2 * HW, 1, 3], mat: c.floorMat, cast: false });
    for (const s of [-1, 1]) { const lip = new THREE.Mesh(new THREE.BoxGeometry(2 * HW, 0.25, 0.3), Mat.paint(c.T.trim, 0.5, 0.4)); lip.position.set(0, 0.02, z0 + (s < 0 ? 3 : len - 3)); g.scene.add(lip); }
    for (const lx of [-HW * 0.6, HW * 0.6]) for (let z = z0 + 8; z < z0 + len - 4; z += 12) { const l = new THREE.PointLight('#ff6a1a', 40, 18, 1.4); l.position.set(lx, 0, z); g.scene.add(l); }
    embers(g, { minX: -HW + 1, maxX: HW - 1, minZ: z0 + 3, maxZ: z0 + len - 3, y: -1.3 }, 18);
    // stepping stones: two weaving paths + a high route on movers
    const stoneMat = Mat.panel('#3a3530', 1);
    let x = -4;
    for (let z = z0 + 6; z < z0 + len - 5; z += 4.2) {
      x = Math.max(-HW + 4, Math.min(HW - 4, x + (r() * 2 - 1) * 5));
      const h = 0.2 + r() * 1.4;
      solid(g, { pos: [x, h - 0.6, z], size: [2.6, 1.2, 2.6], mat: stoneMat, round: 0.1 });
      const t = new THREE.Mesh(new THREE.BoxGeometry(2.62, 0.08, 2.62), glowMat(c.T.glow, 1.6)); t.position.set(x, h, z); g.scene.add(t);
    }
    for (let i = 0; i < (room.movers ?? 2); i++) {
      const z = z0 + 10 + i * ((len - 20) / Math.max(1, (room.movers ?? 2) - 1));
      new Mover(g, { points: [[HW - 5, 1.2, z], [-HW + 5, 1.2, z]], size: [3.2, 0.5, 3.2], speed: 3 + r() * 1.5, wait: 0.6, glowColor: c.T.glow });
    }
    for (let z = z0 + 9; z < z0 + len - 6; z += 10) g.addGrapplePoint(V((r() * 2 - 1) * (HW - 6), 9, z));
    return {
      len,
      *run(g) {
        g.setObjective(room.objective || 'THE FLOOR IS LAVA', 'hop the platforms · E to grapple the rings');
        if (room.waves) spawnGroup(c, room, room.waves[0]);
        yield () => g.player.pos.z > z0 + len - 3 && g.player.grounded && g.player.pos.y > -0.5;
      },
    };
  },
  // ---- laser grid: sweeping / spinning / blinking beams to jump, slide and dash through
  lasers(c, room, z0) {
    const len = room.len || 34, { g, HW, r } = c;
    const modes = room.modes || ['low', 'high', 'sweepZ', 'blink', 'spin'];
    let z = z0 + 6, i = 0;
    while (z < z0 + len - 4) {
      const mode = modes[i % modes.length];
      if (mode === 'low') new Laser(g, { len: 2 * HW, y: 0.55, z, mode: 'static' });
      else if (mode === 'high') new Laser(g, { len: 2 * HW, y: 1.25, z, mode: 'static', color: '#ff8a1f' });
      else if (mode === 'sweepZ') new Laser(g, { len: 2 * HW, y: 0.9, z, mode: 'sweepZ', range: 2.5, speed: 1.2 + r() });
      else if (mode === 'blink') { new Laser(g, { len: 2 * HW, y: 1.0, z, mode: 'blink', speed: 2.2 }); new Laser(g, { len: 2 * HW, y: 0.4, z: z + 1, mode: 'blink', speed: 2.2, phase: Math.PI }); }
      else if (mode === 'spin') new Laser(g, { len: 9, y: 4.6, z, mode: 'spin', speed: 0.9, color: '#ff2d6f' });
      z += mode === 'spin' ? 7 : 4.5; i++;
    }
    for (const s of [-1, 1]) solid(g, { pos: [s * (HW - 0.4), 2, (z0 + z0 + len) / 2], size: [0.8, 4, len - 4], mat: Mat.metal('#2a2e36', 0.4, 0.8) });
    room.hatches = hatchesFor(c, z0, len, 2);
    return {
      len,
      *run(g) {
        g.setObjective(room.objective || 'GET THROUGH THE LASER GRID', 'SPACE over the low beams · C slide under the high ones');
        if (room.waves) spawnGroup(c, room, room.waves[0]);
        yield () => g.player.pos.z > z0 + len - 2;
      },
    };
  },
  // ---- hold the spotlight: stand in the zone while robots try to push you out
  hold(c, room, z0) {
    const len = room.len || 36, { g } = c, cz = z0 + len / 2, R = room.radius || 4.5;
    coverField(c, z0, len, room.cover ?? 0.7, room.coverKind);
    room.hatches = hatchesFor(c, z0, len, 4);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.12, 8, 48), glowMat('#ffd400', 3)); ring.rotation.x = Math.PI / 2; ring.position.set(0, 0.08, cz); g.scene.add(ring);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(R, 40), new THREE.MeshBasicMaterial({ color: '#ffd400', transparent: true, opacity: 0.08, depthWrite: false })); disc.rotation.x = -Math.PI / 2; disc.position.set(0, 0.06, cz); g.scene.add(disc);
    const spot = new Spotlight(g, [0, c.CH - 1, cz], '#fff2c0', { center: [0, 0, cz], radius: 0.1, intensity: 700 });
    c.spots.push(spot);
    return {
      len,
      *run(g) {
        const need = room.time || 25; let held = 0, spawnT = 0;
        if (room.vote) g.audience.setAuto(true, 12);
        spawnGroup(c, room, room.first || [['clanker', 3]]);
        while (held < need) {
          yield 0.1;
          const pl = g.player, inside = Math.hypot(pl.pos.x, pl.pos.z - cz) < R && pl.alive;
          if (inside) held += 0.1;
          ring.material.emissiveIntensity = inside ? 4 + Math.sin(g.time * 10) : 1.2;
          disc.material.opacity = inside ? 0.16 : 0.05;
          g.setObjective(room.objective || 'HOLD THE SPOTLIGHT', `${Math.floor(held)}s / ${need}s ${inside ? '· ON AIR' : '· GET IN THE LIGHT'}`);
          spawnT += 0.1;
          if (spawnT > (room.every || 6) && g.aliveEnemies() < (room.maxAlive || 6)) { spawnT = 0; spawnGroup(c, room, [[c.r() < 0.25 ? 'drone' : c.r() < 0.2 ? 'shield' : 'clanker', 2]]); }
        }
        g.audience.setAuto(false);
        ring.material.emissiveIntensity = 0.3;
        g.audio.play('cheer', { big: 1.4 }); confetti(g, V(0, 6, cz), 140, 12);
        g.setObjective('MOP UP', 'the spotlight is yours');
        yield () => g.aliveEnemies() === 0;
      },
    };
  },
};
function catwalks(c, z0, len) {
  const { g, HW } = c, cw = Mat.grate(3);
  for (const s of [-1, 1]) {
    solid(g, { pos: [s * (HW - 3), 4.5, z0 + len / 2], size: [5, 0.4, len - 8], mat: cw });
    solid(g, { pos: [s * (HW - 3), 2.2, z0 + 6.2], size: [3, 0.4, 7], rot: [-0.62, 0, 0], mat: cw });
    for (let z = z0 + 6; z < z0 + len - 4; z += 6) solid(g, { pos: [s * (HW - 3), 2.2, z], size: [0.4, 4.4, 0.4], mat: Mat.metal('#3a3530') });
  }
}

// ================================================================== FLOOR
export function makeFloor(R) {
  const W = R.width || 36, HW = W / 2, CH = R.ceiling || 14;
  function build(g, { checkpoint }) {
    const T = THEMES[R.theme] || THEMES.backstage;
    const r = rng((R.id || 2) * 7919 + 13);
    const F = {
      spawn: { pos: [0, 0.2, -3], yaw: 0 }, checkpoints: {}, bounds: { minX: -HW, maxX: HW, minZ: 0, maxZ: 10 },
      groundY: 0, ceilingY: CH, killY: -10, spawnPoints: [], beastSpawn: null,
      votePool: R.votePool || ['barrels', 'lightsout', 'doublebots', 'freeze', 'lasers', 'lowgrav', 'meteors', 'firestorm'],
      fogDensity: T.fog[1], floodable: false, events: {}, center: [0, 0, 20],
    };
    const c = { g, F, T, HW, CH, r, spots: [], steam: [] };
    setStyle(T.style);
    g.scene.background = new THREE.Color(T.bg);
    g.scene.fog = new THREE.FogExp2(T.fog[0], T.fog[1]);
    stageLights(g, { ...T.light, dir: [-0.35, 1, 0.25] });
    c.floorMat = T.floor(); c.wallMat = T.wall();
    // ---- arrival dock
    solid(g, { pos: [0, -0.5, -4], size: [W, 1, 8], mat: c.floorMat, cast: false });
    F.arrive = new Elevator(g, { pos: [0, 0, -7.6], rotY: Math.PI, open: false }); F.arrive.entered = true;
    solid(g, { pos: [0, CH / 2, -8.5], size: [W + 2, CH, 1], mat: c.wallMat });
    sign(g, [R.sign || R.name], [0, CH - 3.5, -7.9], 16, 3, 0, { glow: T.glow, size: 140 });
    screen(g, g.host, [-HW + 5, CH * 0.55, -7.7], 4.5, 0); screen(g, g.host, [HW - 5, CH * 0.55, -7.7], 4.5, 0);
    // ---- rooms
    let z = 0;
    F.rooms = [];
    R.rooms.forEach((room, i) => {
      room.z0 = z;
      const built = ROOMS[room.type](c, room, z);
      room.len = built.len;
      room.built = built;
      if (!room.noFloor) solid(g, { pos: [0, -0.5, z + built.len / 2], size: [W, 1, built.len], mat: c.floorMat, cast: false });
      F.checkpoints[i] = { pos: [0, 0.2, z + 1.5], yaw: 0 };
      // gate at the end of each room (opens when the room is done)
      room.gate = solid(g, { pos: [0, CH / 2, z + built.len + 0.5], size: [W, CH, 1], mat: Mat.hazard(6), dynamic: true });
      sign(g, [`${i + 1} / ${R.rooms.length}`], [0, CH - 2, z + built.len - 0.05], 4, 1.2, Math.PI, { glow: T.glow });
      T.dress(c, z, z + built.len + 1);
      // practicals
      for (let lz = z + 6; lz < z + built.len; lz += 14) { const l = new THREE.PointLight(T.practical, 40, 30, 1.4); l.position.set(0, CH - 2, lz); g.scene.add(l); g.dim(l); }
      F.rooms.push(room);
      z += built.len + 1;
    });
    // ---- exit dock + elevator
    solid(g, { pos: [0, -0.5, z + 5], size: [W, 1, 10], mat: c.floorMat, cast: false });
    F.exit = new Elevator(g, { pos: [0, 0, z + 4.6], rotY: 0, onEnter: () => F.onExit() });
    F.checkpoints[F.rooms.length] = { pos: [0, 0.2, z + 1.5], yaw: 0 };
    solid(g, { pos: [0, CH / 2, z + 10.5], size: [W + 2, CH, 1], mat: c.wallMat });
    marquee(g, [0, 6.2, z + 4.2], 8, Math.PI, 14, T.trim);
    const zEnd = z + 10;
    // ---- shell: side walls + ceiling
    for (const s of [-1, 1]) solid(g, { pos: [s * (HW + 0.5), CH / 2, (zEnd - 8) / 2], size: [1, CH, zEnd + 8], mat: c.wallMat, uv: 6 });
    wall(g, [0, CH + 0.5, (zEnd - 8) / 2], [W + 4, 1, zEnd + 12], { ceiling: true });
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, zEnd + 8), Mat.panel('#14161a', 6)); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, CH, (zEnd - 8) / 2); g.scene.add(ceil);
    for (let bz = -6; bz < zEnd; bz += 8) { const beam = new THREE.Mesh(new THREE.BoxGeometry(W, 0.6, 0.5), Mat.metal('#2a2c30', 0.5, 0.8)); beam.position.set(0, CH - 0.4, bz); g.scene.add(beam); }
    F.bounds = { minX: -HW, maxX: HW, minZ: 0, maxZ: zEnd - 10 };
    F.center = [0, 0, zEnd / 2];
    F.nav = { minX: -HW, maxX: HW, minZ: -6, maxZ: zEnd, cell: 1.5, minY: -0.5, maxY: 1.4, topY: CH - 3 };
    F.zEnd = zEnd;
    // ---- per-frame
    F.update = (dt) => {
      for (const s of c.spots) s.update?.(dt);
      for (const room of F.rooms) room.built.update?.(dt);
      for (const p of c.steam) if (Math.random() < dt * 3) g.fx.smokePuff(p, 1, 1.4, 1.2);
    };
    g.addHazard({ update: (dt) => F.update(dt) });
    F.openGate = (gate, instant) => {
      if (instant) { gate.mesh.position.y += CH + 2; gate.collider.enabled = false; return; }
      g.audio.play('hydraulic', { pos: gate.mesh.position });
      const y0 = gate.mesh.position.y; let t = 0;
      g.addHazard({ update(dt) { t += dt; gate.mesh.position.y = y0 + Math.min(1, t / 2.2) * (CH + 2); if (t > 2.2) { gate.collider.enabled = false; this.dead = true; } } });
    };
    if (R.build) R.build(g, F, c);
    g.audio.loop(R.ambience || 'machinery', R.ambience === null ? 0 : 0.18, { rate: 1 });
    return F;
  }

  function* script(g, cp) {
    const F = g.floor;
    const say = (who, t, o = {}) => g.say(who, t, { priority: 2, ...o });
    const lines = function* (list) { for (const [who, text, o, wait] of list || []) { say(who, text, o); yield wait ?? Math.max(2.5, text.length * 0.055); } };
    for (let i = 0; i < cp; i++) { F.rooms[i].built.skip?.(); F.openGate(F.rooms[i].gate, true); }
    g.music.setState('explore'); g.musicState = 'explore';
    if (cp === 0) {
      g.setObjective(R.introObjective || 'GET MOVING', R.tagline || '');
      yield* lines(R.intro);
      if (R.onStart) R.onStart(g, F);
    }
    for (let i = cp; i < F.rooms.length; i++) {
      const room = F.rooms[i];
      yield () => g.player.pos.z > room.z0 - 0.5 || i === cp;
      g.music.setState(room.music || (room.type === 'arena' || room.type === 'targets' || room.type === 'hold' ? 'combat' : 'explore'));
      if (room.enter) { for (const [who, text, o] of room.enter) say(who, text, o); }
      if (room.gift && !(g.save.data.unlocked.weapons.includes(room.gift.weapon) && g.player.arsenal.slots.some((s) => s.id === room.gift.weapon))) {
        const gd = room.gift;
        const p = g.addPickup('gift', V(gd.pos?.[0] ?? 0, gd.pos?.[1] ?? 1.2, room.z0 + (gd.z ?? 5)), {
          onPick: () => {
            g.player.arsenal.addWeapon(gd.weapon); g.save.unlockWeapon(gd.weapon);
            g.hud.toast('UNLOCKED: ' + gd.label, 'unlock'); g.music.sting('unlock');
            if (gd.hint) g.hud.hint(gd.hint, 7, 'gift' + gd.weapon);
            if (gd.line) say(gd.line[0], gd.line[1], gd.line[2] || {});
          },
        });
        p.landed = true;
      }
      yield* room.built.run(g);
      if (room.clear) yield* lines(room.clear);
      g.addHype(0.12);
      F.openGate(room.gate);
      g.checkpoint(i + 1);
      F.checkpoints[i + 1] = F.checkpoints[i + 1] || { pos: [0, 0.2, room.z0 + room.len + 2], yaw: 0 };
    }
    g.music.setState('full');
    g.setObjective('GET TO THE ELEVATOR', '');
    yield* lines(R.outro);
    F.exit.setOpen(true);
    yield () => F.exit.entered;
  }

  return {
    name: R.name,
    build(g, o) {
      const F = build(g, o);
      F.onExit = () => {
        g.cinematic = true; g.player.vel.set(0, 0, 0); F.exit.setOpen(false);
        g.audio.loop(R.ambience || 'machinery', 0);
        g.setCam([0, 2.2, F.zEnd - 1.4], [0, 1.5, F.zEnd - 9], 60, 3);
        let t = 0.2;
        for (const [who, text, o] of R.exitLines || [['halo', `FLOOR ${R.id}... COMPLETE! Up you go!`, { mood: 'gleeful' }]]) { g.later(t, () => g.say(who, text, { priority: 3, ...o })); t += Math.max(3, text.length * 0.06); }
        g.later(t + 2, () => g.completeFloor());
      };
      return F;
    },
    script,
    scoreTarget: R.scoreTarget || 9000,
    elevatorLines: R.elevatorLines || [],
    elevatorDur: R.elevatorDur || 7,
    rewards: R.rewards || [],
    completeLine: R.completeLine,
  };
}
