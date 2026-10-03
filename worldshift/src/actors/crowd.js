// Pedestrians: instanced rendering of procedural rigs + simulated behaviour.
// Only the current era is simulated; population is re-seeded around the
// player on a shift so the new era is instantly alive.
import * as THREE from 'three';
import { G } from '../core/state.js';
import { RNG, clamp, damp, dampAngle, wrapAngle, lerp, hash32 } from '../core/mathx.js';
import { CHUNK, chunkCoord, chunkOrigin, chunkRoads, ROAD, blockRect, district } from '../world/layout.js';
import { patchActorMaterial } from '../world/materials.js';
import {
  Pose, PART_DEFS, bodyGeometries, solveSkeleton, makeJointMatrices, J,
  poseIdle, poseLocomotion, poseCower, posePhone, posePanic, poseDead, poseTalk, poseHit, poseAim, poseMelee, poseCrouch, poseSit,
} from './rig.js';

const MAX = 56;
const _m = new THREE.Matrix4();
const _l = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3();
const _zero = new THREE.Matrix4().makeScale(0, 0, 0);
const UP = new THREE.Vector3(0, 1, 0);

// Era wardrobes
const PAL = [
  { // 1996: denim, flannel, windbreakers, bright 90s colours
    top: ['#3a5f9a', '#a8322e', '#2f6b4a', '#d8c08a', '#6a3a7a', '#e0e0d8', '#c86a2a', '#2a2a30', '#3a8aa8', '#8a2a4a'],
    legs: ['#2e4a78', '#3a3a40', '#5a4a3a', '#2a2a2e', '#7a6a50', '#3e5e8e'],
    shoes: ['#f0f0f0', '#2a2018', '#3a3a3a', '#7a5a3a'],
    acc: { cap: 0.18, backpack: 0.15 },
  },
  { // 2047: sleek blacks/whites with neon accents
    top: ['#15171c', '#e8eaee', '#1e2a3a', '#2a1a2e', '#3a3f48', '#0e1a1e', '#f2f2ee', '#4a1a3a'],
    legs: ['#101216', '#2a2e36', '#e0e2e6', '#1a1a22'],
    shoes: ['#f4f4f4', '#0a0a0c', '#30e0ff', '#ff3ac8'],
    acc: { visor: 0.3, backpack: 0.1 },
  },
  { // 2189: earthy rags, scavenged armour, masks
    top: ['#5a4a38', '#6a5a40', '#3a4a38', '#7a6a50', '#4a3a30', '#5a5a48', '#8a6a48'],
    legs: ['#3a3228', '#4a4038', '#2e3a2e', '#5a4a3a'],
    shoes: ['#2a2018', '#3a3020', '#1a1a14'],
    acc: { mask: 0.3, backpack: 0.45, helmet: 0.1 },
  },
];
const SKIN = ['#f0c8a8', '#d8a888', '#b88060', '#8a5a40', '#6a4030', '#e8b898', '#c89070'];
const HAIR = ['#1a1410', '#3a2a1a', '#6a4a2a', '#b89060', '#8a8a88', '#2a1a10', '#a03020'];

function col(hex) { return new THREE.Color(hex); }

export class NPC {
  constructor() {
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.pose = new Pose();
    this.tmp = new Pose();
    this.colors = {};
    this.alive = false;
  }
}

export class Crowd {
  constructor(scene) {
    this.scene = scene;
    this.npcs = [];
    for (let i = 0; i < MAX; i++) this.npcs.push(new NPC());
    this.renderers = [0, 1, 2].map((e) => this._makeRenderer(e));
    this.joints = makeJointMatrices();
    this.spawnTimer = 0;
    this.rng = new RNG(1234);
    this.hostiles = [];   // registered by combat for AI-controlled fighters
    this.era = G.era;
    G.events.on('shift', (from, to) => this.onShift(from, to));
    G.events.on('noise', (pos, radius, kind) => this.onNoise(pos, radius, kind));
  }

  _makeRenderer(era) {
    const geos = bodyGeometries();
    const group = new THREE.Group();
    const parts = [];
    const mk = (geo, joint, ox, oy, oz, slot, cap = MAX, flags = {}) => {
      const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: slot === 'skin' ? 0.6 : 0.85, metalness: 0 });
      if (flags.emissive) { m.emissive = new THREE.Color(1, 1, 1); m.emissiveIntensity = 2.0; }
      patchActorMaterial(m, era);
      const im = new THREE.InstancedMesh(geo, m, cap);
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      im.setColorAt(0, new THREE.Color(1, 1, 1));
      im.count = 0;
      im.castShadow = true;
      im.frustumCulled = false;
      group.add(im);
      parts.push({ im, joint, ox, oy, oz, slot, opt: flags.opt || null });
    };
    for (const d of PART_DEFS) {
      if (d[1] === 'hair') {
        mk(geos.hair, d[0], d[2], d[3], d[4], 'hair', MAX, { opt: 'hair' });
        mk(geos.longhair, d[0], d[2], d[3], d[4], 'hair', MAX, { opt: 'longhair' });
        continue;
      }
      mk(geos[d[1]], d[0], d[2], d[3], d[4], d[8]);
    }
    mk(geos.cap, J.head, 0, 0.17, 0, 'acc', MAX, { opt: 'cap' });
    mk(geos.helmet, J.head, 0, 0.13, 0, 'acc', MAX, { opt: 'helmet' });
    mk(geos.visor, J.head, 0, 0.13, 0.1, 'glow', MAX, { opt: 'visor', emissive: true });
    mk(geos.mask, J.head, 0, 0.1, 0.012, 'acc', MAX, { opt: 'mask' });
    mk(geos.backpack, J.chest, 0, 0, 0, 'acc', MAX, { opt: 'backpack' });
    const coat = new THREE.CylinderGeometry(0.19, 0.25, 0.55, 10, 1, true); coat.translate(0, -0.28, 0);
    mk(coat, J.hips, 0, -0.02, 0, 'top', MAX, { opt: 'coat' });
    // held weapon (simple box) for armed NPCs
    const gun = new THREE.BoxGeometry(0.05, 0.12, 0.3); gun.translate(0, -0.06, 0.12);
    mk(gun, J.haR, 0, 0, 0, 'gun', MAX, { opt: 'gun' });
    group.visible = era === G.era;
    this.scene.add(group);
    return { group, parts, era };
  }

  // Appearance
  dress(n, era, rng, role = 'civ') {
    const p = PAL[era];
    n.colors.skin = col(rng.pick(SKIN));
    n.colors.hair = col(rng.pick(HAIR));
    n.colors.top = col(rng.pick(p.top));
    n.colors.sleeve = rng.chance(0.4) ? n.colors.skin : n.colors.top;
    n.colors.forearm = rng.chance(0.5) ? n.colors.skin : n.colors.sleeve;
    n.colors.legs = col(rng.pick(p.legs));
    n.colors.shoes = col(rng.pick(p.shoes));
    n.colors.acc = col(rng.pick(p.legs)).multiplyScalar(0.8);
    n.colors.glow = col(rng.pick(['#30e0ff', '#ff3ac8', '#7aff5a', '#ffd23c']));
    n.colors.gun = col('#1a1a1c');
    n.opts = {
      hair: false, longhair: false, cap: false, helmet: false, visor: false, mask: false, backpack: false, coat: false, gun: false,
    };
    const hs = rng.next();
    if (hs < 0.45) n.opts.hair = true; else if (hs < 0.85) n.opts.longhair = true;
    for (const [k, v] of Object.entries(p.acc)) if (rng.chance(v)) n.opts[k] = true;
    if (rng.chance(era === 1 ? 0.3 : 0.15)) n.opts.coat = true;
    n.scale = rng.range(0.92, 1.07);
    n.width = rng.range(0.9, 1.15);
    if (role === 'cop' || role === 'enemy') {
      const ec = role === 'cop' ? ['#1e2a4a', '#202428', '#3a4a3a'][era] : ['#2a2a2a', '#101014', '#4a3a2a'][era];
      n.colors.top = col(ec); n.colors.sleeve = n.colors.top; n.colors.forearm = n.colors.top;
      n.colors.legs = col(role === 'cop' ? ['#1a2238', '#18181c', '#3a3a2a'][era] : '#22201e');
      n.opts.cap = role === 'cop' && era === 0;
      n.opts.helmet = era === 1 || (role === 'enemy' && era === 2 && rng.chance(0.5));
      n.opts.visor = era === 1;
      n.opts.mask = era === 2 && role === 'enemy';
      n.opts.backpack = false;
      n.colors.acc = col(role === 'cop' ? ['#1a2a5a', '#e8ecf0', '#5a4a3a'][era] : '#1a1a1a');
      n.colors.glow = col(role === 'cop' ? '#ff3030' : '#ff8a20');
    }
  }

  // ------------------------------------------------------------ spawning --
  spawn(x, z, era, opts = {}) {
    const n = this.npcs.find((q) => !q.alive);
    if (!n) return null;
    const rng = new RNG(hash32((x * 13 + z * 7) | 0) ^ (G.frame * 31));
    n.alive = true;
    n.era = era;
    n.role = opts.role || 'civ';
    n.pos.set(x, opts.y !== undefined ? opts.y : G.collision.ground(era, x, z, 50).y, z);
    n.vel.set(0, 0, 0);
    n.yaw = rng.range(-Math.PI, Math.PI);
    n.state = opts.state || 'walk';
    n.stateT = 0;
    n.phase = rng.range(0, 6);
    n.speed = 0;
    n.walkSpeed = rng.range(1.15, 1.6);
    n.health = opts.health || 40;
    n.maxHealth = n.health;
    n.fear = 0;
    n.fearPos = new THREE.Vector3();
    n.hitT = 1; n.hitSide = 1;
    n.deadT = 0;
    n.talkPartner = null;
    n.dir = rng.chance(0.5) ? 1 : -1;
    n.seed = rng.next();
    n.ring = null;
    n.ringS = 0;
    n.crossing = null;
    n.witnessed = null;
    n.callT = 0;
    n.ai = null;
    n.aimW = 0;
    n.meleeT = -1;
    n.name = opts.name || null;
    n.onDeath = opts.onDeath || null;
    n.persistent = !!opts.persistent;
    this.dress(n, era, rng, n.role);
    if (opts.colors) Object.assign(n.colors, opts.colors);
    if (opts.opts) Object.assign(n.opts, opts.opts);
    if (n.role === 'civ' && !opts.noRing) this._assignRing(n);
    return n;
  }

  _ringFor(ci, cj) {
    const b = blockRect(ci, cj);
    const roads = b.roads;
    const pad = (r) => (r === 'none' ? -1.5 : ROAD[r].walk * 0.5 + 0.2);
    return { ci, cj, x0: b.x0 - pad(roads[3]), x1: b.x1 + pad(roads[1]), z0: b.z0 - pad(roads[0]), z1: b.z1 + pad(roads[2]), roads };
  }
  _assignRing(n) {
    const cc = chunkCoord(n.pos.x, n.pos.z);
    n.ring = this._ringFor(cc.ci, cc.cj);
    // project onto ring perimeter
    const r = n.ring;
    const W = r.x1 - r.x0, D = r.z1 - r.z0;
    const px = clamp(n.pos.x, r.x0, r.x1), pz = clamp(n.pos.z, r.z0, r.z1);
    const dl = px - r.x0, dr = r.x1 - px, dt = pz - r.z0, db = r.z1 - pz;
    const m = Math.min(dl, dr, dt, db);
    let s;
    if (m === dt) s = px - r.x0;
    else if (m === dr) s = W + (pz - r.z0);
    else if (m === db) s = W + D + (r.x1 - px);
    else s = 2 * W + D + (r.z1 - pz);
    n.ringS = s;
  }
  _ringPoint(r, s, out) {
    const W = r.x1 - r.x0, D = r.z1 - r.z0, P = 2 * (W + D);
    s = ((s % P) + P) % P;
    if (s < W) return out.set(r.x0 + s, 0, r.z0);
    s -= W;
    if (s < D) return out.set(r.x1, 0, r.z0 + s);
    s -= D;
    if (s < W) return out.set(r.x1 - s, 0, r.z1);
    s -= W;
    return out.set(r.x0, 0, r.z1 - s);
  }

  density(era, d) {
    const base = { D: 30, G: 26, B: 18, S: 10, W: 7, A: 8, I: 9, P: 14, H: 3 }[d] || 0;
    const night = G.sky ? G.sky.night : 0;
    let k = era === 0 ? 1 : era === 1 ? 1.35 : 0.3;
    k *= 1 - night * 0.55;
    return Math.round(base * k);
  }

  onShift(from, to) {
    // old-era pedestrians fade out with the wavefront (their renderer stays visible during the shift)
    this.era = to;
    for (const n of this.npcs) if (n.alive && n.era !== to && !n.persistent) n.alive = false;
    this.renderers.forEach((r, i) => { r.group.visible = i === to || i === from; });
    setTimeout(() => this.renderers.forEach((r, i) => { r.group.visible = i === G.era; }), 1600);
    this.spawnTimer = 0;
    this._populate(true);
  }

  _populate(burst) {
    const era = G.era;
    const p = G.player.pos;
    const d = district(chunkCoord(p.x, p.z).ci, chunkCoord(p.x, p.z).cj);
    const target = Math.min(MAX - 6, this.density(era, d) + 6);
    let count = this.npcs.filter((n) => n.alive && n.role === 'civ' && n.era === era).length;
    let tries = burst ? 60 : 4;
    while (count < target && tries-- > 0) {
      // pick an active chunk spawn point
      const a = this.rng.range(0, Math.PI * 2);
      const r = burst ? this.rng.range(8, 90) : this.rng.range(55, 100);
      const x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r;
      const cc = chunkCoord(x, z);
      const ec = G.chunks.eraChunk(cc.ci, cc.cj, era);
      if (!ec || !ec.spawns.length) continue;
      const sp = ec.spawns[Math.floor(this.rng.next() * ec.spawns.length)];
      if (!burst) {
        // don't pop in front of the camera
        _v.set(sp.x - G.camera.position.x, 0, sp.z - G.camera.position.z);
        const fwd = new THREE.Vector3(); G.camera.getWorldDirection(fwd);
        if (_v.dot(fwd) > 0 && _v.length() < 70) continue;
      }
      const n = this.spawn(sp.x, sp.z, era, { y: sp.y, state: sp.kind === 'camp' ? 'idle' : 'walk', noRing: sp.kind === 'camp' });
      if (!n) break;
      if (sp.kind === 'camp') { n.state = this.rng.chance(0.5) ? 'sit' : 'idle'; n.home = sp; }
      else if (this.rng.chance(0.12)) n.state = 'idle';
      count++;
    }
  }

  // ------------------------------------------------------------- events --
  onNoise(pos, radius, kind) {
    for (const n of this.npcs) {
      if (!n.alive || n.era !== G.era || n.state === 'dead' || n.role !== 'civ') continue;
      const d = n.pos.distanceTo(pos);
      if (d > radius) continue;
      const k = 1 - d / radius;
      n.fear = Math.min(1.5, n.fear + (kind === 'gunshot' || kind === 'explosion' ? 1.2 : 0.6) * (0.5 + k));
      n.fearPos.copy(pos);
      if (n.fear > 0.6 && n.state !== 'flee' && n.state !== 'cower' && n.state !== 'phone') {
        if (d < 8 && this.rng.chance(0.4)) this.setState(n, 'cower');
        else this.setState(n, 'flee');
        if (this.rng.chance(0.35)) G.audio.play('scream', n.pos);
      }
      // witnesses of a crime may call the authorities
      if ((kind === 'gunshot' || kind === 'assault' || kind === 'crash' || kind === 'explosion') && !n.witnessed && d < radius * 0.8) {
        n.witnessed = { pos: pos.clone(), kind, t: G.time };
      }
    }
  }

  setState(n, s) {
    n.state = s;
    n.stateT = 0;
  }

  damage(n, amount, from, kind = 'bullet') {
    if (!n.alive || n.state === 'dead') return false;
    n.health -= amount;
    n.hitT = 0;
    if (from) {
      const rel = wrapAngle(Math.atan2(from.x - n.pos.x, from.z - n.pos.z) - n.yaw);
      n.hitSide = rel > 0 ? 1 : -1;
    }
    if (n.ai && n.ai.onHurt) n.ai.onHurt(n, from, amount);
    if (n.health <= 0) {
      this.setState(n, 'dead');
      n.deadT = 0;
      n.vel.set(0, 0, 0);
      if (n.onDeath) n.onDeath(n);
      G.events.emit('npc:died', n, kind);
      return true;
    }
    if (n.role === 'civ') {
      n.fear = 1.5;
      if (from) n.fearPos.set(from.x, from.y || 0, from.z);
      this.setState(n, 'flee');
    }
    return false;
  }

  // ------------------------------------------------------------- update --
  update(dt) {
    const era = G.era;
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) { this.spawnTimer = 0.6; this._populate(false); }
    const p = G.player.pos;
    for (const n of this.npcs) {
      if (!n.alive) continue;
      const dist = n.pos.distanceTo(p);
      if (!n.persistent && (dist > 150 || (n.era !== era && !G.shift.active))) { n.alive = false; continue; }
      if (n.era !== era) continue;
      n.stateT += dt;
      if (n.ai) n.ai.update(n, dt);
      else this._civilian(n, dt);
      this._move(n, dt);
      this._animate(n, dt, dist);
    }
    this._render();
  }

  _civilian(n, dt) {
    n.fear = Math.max(0, n.fear - dt * 0.05);
    const s = n.state;
    if (s === 'dead') { n.deadT += dt; if (n.deadT > 40 && !n.persistent) n.alive = false; n.speed = 0; return; }
    // phone call to report a crime
    if (n.witnessed && s !== 'phone' && s !== 'dead' && n.fear < 1.2 && this.rng.chance(dt * 0.6)) {
      this.setState(n, 'phone');
      n.callT = 0;
    }
    if (s === 'phone') {
      n.speed = damp(n.speed, 0, 6, dt);
      n.callT += dt;
      if (n.callT > 4) {
        if (G.authority && n.witnessed) G.authority.report(n.witnessed.pos, n.witnessed.kind, n);
        n.witnessed = null;
        this.setState(n, n.fear > 0.4 ? 'flee' : 'walk');
      }
      return;
    }
    if (s === 'flee') {
      const away = Math.atan2(n.pos.x - n.fearPos.x, n.pos.z - n.fearPos.z);
      n.yaw = dampAngle(n.yaw, away + Math.sin(G.time * 1.3 + n.seed * 9) * 0.4, 6, dt);
      n.speed = damp(n.speed, 5.2, 4, dt);
      if (n.stateT > 6 && n.fear < 0.5) { this._assignRing(n); this.setState(n, 'walk'); }
      return;
    }
    if (s === 'cower') {
      n.speed = 0;
      if (n.stateT > 5 && n.fear < 0.8) this.setState(n, 'flee');
      return;
    }
    if (s === 'sit' || s === 'idle' || s === 'talk') {
      n.speed = damp(n.speed, 0, 6, dt);
      if (s === 'talk' && n.talkPartner) {
        const tp = n.talkPartner;
        n.yaw = dampAngle(n.yaw, Math.atan2(tp.pos.x - n.pos.x, tp.pos.z - n.pos.z), 4, dt);
      }
      // react to the player: look / step back if bumped
      if (n.stateT > (s === 'talk' ? 12 : 6 + n.seed * 10) && !n.home) {
        if (n.talkPartner) { n.talkPartner.talkPartner = null; n.talkPartner = null; }
        if (!n.ring) this._assignRing(n);
        this.setState(n, 'walk');
      }
      return;
    }
    // walking along the sidewalk ring
    if (!n.ring) this._assignRing(n);
    const r = n.ring;
    if (n.crossing) {
      const c = n.crossing;
      const dx = c.x - n.pos.x, dz = c.z - n.pos.z;
      const d = Math.hypot(dx, dz);
      n.yaw = dampAngle(n.yaw, Math.atan2(dx, dz), 6, dt);
      n.speed = damp(n.speed, n.walkSpeed * 1.25, 3, dt);
      if (d < 0.8) {
        n.crossing = null;
        n.ring = this._ringFor(c.ci, c.cj);
        this._assignRing(n);
      }
      return;
    }
    n.ringS += n.dir * n.speed * dt;
    const W = r.x1 - r.x0, D = r.z1 - r.z0;
    const P = 2 * (W + D);
    const s2 = ((n.ringS % P) + P) % P;
    // at corners: maybe cross the street to the neighbouring block
    const corners = [0, W, W + D, 2 * W + D];
    for (let ci = 0; ci < 4; ci++) {
      if (Math.abs(s2 - corners[ci]) < 0.3 && (!n.lastCorner || G.time - n.lastCorner > 4)) {
        n.lastCorner = G.time;
        if (this.rng.chance(0.35)) {
          // corner 0 = NW, 1 = NE, 2 = SE, 3 = SW; cross along the direction of travel
          const goingCW = n.dir > 0;
          let ni = r.ci, nj = r.cj;
          const side = goingCW ? [3, 0, 1, 2][ci] : [0, 1, 2, 3][ci]; // the road we'd continue along
          void side;
          const dirs = goingCW ? [[0, -1], [1, 0], [0, 1], [-1, 0]] : [[-1, 0], [0, -1], [1, 0], [0, 1]];
          const [di, dj] = dirs[ci];
          ni += di; nj += dj;
          const roadSide = di === 1 ? 1 : di === -1 ? 3 : dj === 1 ? 2 : 0;
          if (r.roads[roadSide] !== 'none' && G.chunks.eraChunk(ni, nj, G.era)) {
            const target = this._ringFor(ni, nj);
            const cp = this._ringPoint(r, corners[ci], new THREE.Vector3());
            const tx = di === 0 ? cp.x : di > 0 ? target.x0 : target.x1;
            const tz = dj === 0 ? cp.z : dj > 0 ? target.z0 : target.z1;
            n.crossing = { x: tx, z: tz, ci: ni, cj: nj };
          }
        } else if (this.rng.chance(0.15)) n.dir *= -1;
        break;
      }
    }
    this._ringPoint(r, n.ringS + n.dir * 1.5, _v);
    const dx = _v.x - n.pos.x, dz = _v.z - n.pos.z;
    n.yaw = dampAngle(n.yaw, Math.atan2(dx, dz), 5, dt);
    // drift back to the ring line
    n.speed = damp(n.speed, n.walkSpeed, 2, dt);
    // occasionally stop to chat with a nearby pedestrian
    if (this.rng.chance(dt * 0.03)) {
      for (const o of this.npcs) {
        if (o === n || !o.alive || o.era !== n.era || o.state !== 'walk' || o.role !== 'civ') continue;
        if (o.pos.distanceTo(n.pos) < 2.2) {
          this.setState(n, 'talk'); this.setState(o, 'talk');
          n.talkPartner = o; o.talkPartner = n;
          break;
        }
      }
    }
    // the player bumping / brandishing a weapon nearby
    const pl = G.player;
    const dpl = n.pos.distanceTo(pl.pos);
    if (dpl < 6 && pl.aiming && n.role === 'civ') {
      n.fear = Math.min(1.5, n.fear + dt * 0.8);
      n.fearPos.copy(pl.pos);
      if (n.fear > 0.6) { this.setState(n, this.rng.chance(0.5) ? 'cower' : 'flee'); n.witnessed = { pos: pl.pos.clone(), kind: 'brandish', t: G.time }; }
    }
  }

  _move(n, dt) {
    if (n.state === 'dead' || n.state === 'sit') return;
    const sp = n.speed;
    n.vel.set(Math.sin(n.yaw) * sp, 0, Math.cos(n.yaw) * sp);
    // separation from other NPCs and the player
    for (const o of this.npcs) {
      if (o === n || !o.alive || o.era !== n.era || o.state === 'dead') continue;
      const dx = n.pos.x - o.pos.x, dz = n.pos.z - o.pos.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < 0.64 && d2 > 1e-6) { const d = Math.sqrt(d2); n.vel.x += (dx / d) * (0.8 - d) * 4; n.vel.z += (dz / d) * (0.8 - d) * 4; }
    }
    const pl = G.player.pos;
    const dx = n.pos.x - pl.x, dz = n.pos.z - pl.z;
    const d2 = dx * dx + dz * dz;
    if (d2 < 0.7 && d2 > 1e-6 && !G.player.vehicle) { const d = Math.sqrt(d2); n.vel.x += (dx / d) * 3; n.vel.z += (dz / d) * 3; }
    n.pos.x += n.vel.x * dt;
    n.pos.z += n.vel.z * dt;
    const col = G.collision;
    const before = n.pos.x + n.pos.z;
    col.resolveCylinder(n.era, n.pos, 0.28, 1.7, 0.45);
    if (Math.abs(n.pos.x + n.pos.z - before) > 1e-3 && n.state === 'walk' && this.rng.chance(0.02)) n.dir *= -1;
    const g = col.ground(n.era, n.pos.x, n.pos.z, n.pos.y + 0.5, 0.2);
    if (g.y > -1e8) n.pos.y = damp(n.pos.y, g.y, 20, dt);
  }

  _animate(n, dt, dist) {
    // cheap LOD: far NPCs animate at lower rate
    if (dist > 60 && (G.frame + n.seed * 10 | 0) % 3 !== 0) return;
    const p = n.pose.clear();
    const t = G.time + n.seed * 10;
    n.phase += (n.speed / (n.speed > 3 ? 2.4 : 1.35)) * Math.PI * dt * (dist > 60 ? 3 : 1);
    const s = n.state;
    if (s === 'dead') poseDead(p, n.hitSide, n.deadT * 1.8 + 0.01);
    else if (s === 'cower') poseCower(p, t);
    else if (s === 'sit') poseSit(p, false);
    else if (n.speed > 0.25) {
      if (s === 'flee') posePanic(p, n.phase);
      else poseLocomotion(p, n.phase, n.speed > 3 ? 1 + (n.speed - 3) / 2 : n.speed / 1.5);
      if (n.state === 'phone') posePhone(p);
    } else {
      poseIdle(p, t, 1, 0.3);
      if (s === 'talk') poseTalk(p, t, n.seed);
      if (s === 'phone') posePhone(p);
    }
    if (n.ai && n.ai.pose) n.ai.pose(n, p, dt);
    if (n.hitT < 1) { n.hitT += dt * 3.5; poseHit(p, n.hitSide, n.hitT); }
  }

  _render() {
    const era = G.era;
    for (const R of this.renderers) {
      if (!R.group.visible) continue;
      let i = 0;
      for (const n of this.npcs) {
        if (!n.alive || n.era !== R.era) continue;
        _q.setFromAxisAngle(UP, n.yaw);
        _m.compose(n.pos, _q, _s.set(n.scale * n.width, n.scale, n.scale));
        solveSkeleton(n.pose, _m, this.joints);
        for (const part of R.parts) {
          if (i >= part.im.instanceMatrix.count) continue;
          if (part.opt && !n.opts[part.opt]) {
            part.im.setMatrixAt(i, _zero);
          } else {
            _l.makeTranslation(part.ox, part.oy, part.oz);
            _m.multiplyMatrices(this.joints[part.joint], _l);
            part.im.setMatrixAt(i, _m);
            const c = part.slot === 'acc' ? n.colors.acc : part.slot === 'glow' ? n.colors.glow : part.slot === 'gun' ? n.colors.gun : n.colors[part.slot] || n.colors.top;
            part.im.setColorAt(i, c);
          }
        }
        i++;
      }
      for (const part of R.parts) {
        part.im.count = i;
        part.im.instanceMatrix.needsUpdate = true;
        if (part.im.instanceColor) part.im.instanceColor.needsUpdate = true;
      }
    }
    void era;
  }

  // Query helpers for combat / vehicles
  nearest(pos, radius, filter) {
    let best = null, bd = radius;
    for (const n of this.npcs) {
      if (!n.alive || n.era !== G.era) continue;
      if (filter && !filter(n)) continue;
      const d = n.pos.distanceTo(pos);
      if (d < bd) { bd = d; best = n; }
    }
    return best;
  }
  // Ray vs NPC capsules: returns { npc, t, part }
  raycast(o, d, maxT) {
    let best = null, bt = maxT;
    for (const n of this.npcs) {
      if (!n.alive || n.era !== G.era || n.state === 'dead') continue;
      // segments: body (hips→head)
      const cx = n.pos.x, cz = n.pos.z;
      const ox = o.x - cx, oz = o.z - cz;
      // closest approach in XZ
      const a = d.x * d.x + d.z * d.z;
      if (a < 1e-8) continue;
      const tc = -(ox * d.x + oz * d.z) / a;
      if (tc < 0 || tc > bt) continue;
      const px = ox + d.x * tc, pz = oz + d.z * tc;
      const r = n.state === 'cower' ? 0.45 : 0.32;
      if (px * px + pz * pz > r * r) continue;
      const hy = o.y + d.y * tc - n.pos.y;
      const top = n.state === 'cower' ? 1.1 : 1.8 * n.scale;
      if (hy < 0 || hy > top) continue;
      bt = tc;
      best = { npc: n, t: tc, part: hy > top - 0.3 ? 'head' : hy > 0.9 ? 'body' : 'legs' };
    }
    return best;
  }
}
