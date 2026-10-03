// Combat: era weapons, player attacks (melee combos / hitscan / special),
// hostile AI with perception, cover, flanking and searching, and drones.
import * as THREE from 'three';
import { G, ERA_YEARS } from '../core/state.js';
import { clamp, damp, dampAngle, wrapAngle, lerp, RNG } from '../core/mathx.js';
import { CF } from '../world/collision.js';
import { poseAim, poseMelee, poseCrouch, poseBlock, J } from '../actors/rig.js';
import { patchActorMaterial } from '../world/materials.js';

export const WEAPONS = {
  fists: { name: 'Fists', melee: true, dmg: 14, range: 1.6, combo: [0, 1, 2], rate: 0.42, era: -1 },
  bat: { name: 'Baseball Bat', melee: true, dmg: 34, range: 2.1, combo: [3, 3], rate: 0.7, era: 0, heavy: true },
  pistol: { name: '9mm Pistol', dmg: 24, rate: 0.22, mag: 12, reserve: 60, spread: 0.012, recoil: 0.35, sound: 'pistol', era: 0, reload: 1.2, range: 120 },
  shotgun: { name: 'Pump Shotgun', dmg: 13, pellets: 8, rate: 0.85, mag: 6, reserve: 24, spread: 0.07, recoil: 1.0, sound: 'shotgun', era: 0, reload: 2.4, twoHand: true, range: 45 },
  smg: { name: 'SMG', dmg: 15, rate: 0.075, mag: 30, reserve: 120, spread: 0.03, recoil: 0.18, sound: 'smg', era: 0, auto: true, reload: 1.6, twoHand: true, range: 90 },
  blade: { name: 'Mono-Blade', melee: true, dmg: 30, range: 2.0, combo: [3, 2, 3], rate: 0.38, era: 1 },
  smart: { name: 'Smart Pistol', dmg: 20, rate: 0.16, mag: 18, reserve: 90, spread: 0.005, recoil: 0.2, sound: 'smart', era: 1, homing: true, reload: 1.0, tracer: [0.5, 2.5, 4], range: 110 },
  pulse: { name: 'Pulse Rifle', dmg: 22, rate: 0.11, mag: 36, reserve: 144, spread: 0.014, recoil: 0.22, sound: 'pulse', era: 1, auto: true, reload: 1.8, twoHand: true, tracer: [0.6, 2.2, 5], range: 140 },
  pipe: { name: 'Rebar Club', melee: true, dmg: 40, range: 2.1, combo: [3, 3], rate: 0.8, era: 2, heavy: true },
  scrap: { name: 'Scrap Rifle', dmg: 75, rate: 1.1, mag: 5, reserve: 25, spread: 0.004, recoil: 1.3, sound: 'scrap', era: 2, reload: 2.6, twoHand: true, range: 200 },
  arc: { name: 'Arc Thrower', dmg: 30, rate: 0.6, mag: 8, reserve: 32, spread: 0, recoil: 0.4, sound: 'arc', era: 2, arc: true, reload: 2, twoHand: true, range: 22 },
  displacer: { name: 'Chrono-Displacer', dmg: 0, rate: 1.6, mag: 3, reserve: 9, spread: 0, recoil: 0.6, sound: 'displacer', era: 2, displace: true, reload: 3, twoHand: true, range: 60 },
};

const _o = new THREE.Vector3();
const _d = new THREE.Vector3();
const _v = new THREE.Vector3();

export class Combat {
  constructor() {
    this.owned = ['fists'];
    this.state = {}; // per weapon ammo
    this.index = 0;
    this.cool = 0;
    this.reloading = 0;
    this.spread = 0;
    this.comboStep = 0;
    this.comboTimer = 0;
    this.queued = false;
    this.give('fists');
    this.drones = [];
    this.droneGroup = new THREE.Group();
    G.scene.add(this.droneGroup);
    this.rng = new RNG(99);
  }

  give(id, ammo = 0) {
    const d = WEAPONS[id];
    if (!this.owned.includes(id)) {
      this.owned.push(id);
      this.state[id] = { mag: d.mag || 0, reserve: d.reserve || 0 };
      if (G.hud && id !== 'fists') G.hud.toast(`Acquired: ${d.name}`, 'good');
    } else if (d.mag) {
      this.state[id].reserve += ammo || d.mag * 2;
    }
  }

  current() {
    const id = this.owned[this.index] || 'fists';
    const d = WEAPONS[id];
    const s = this.state[id] || {};
    return { id, def: d, name: d.name, mag: s.mag, reserve: s.reserve };
  }

  // ------------------------------------------------------------- player --
  update(dt, input) {
    const p = G.player;
    this.cool -= dt;
    this.comboTimer -= dt;
    this.spread = damp(this.spread, 0, 6, dt);
    const w = this.current();
    const d = w.def;
    if (p.vehicle || p.dead) { p.aiming = false; p.blocking = false; this._updateDrones(dt); return; }
    if (input.wheel && !G.shift.peekHeld && !p.aiming) {
      this.index = (this.index + (input.wheel > 0 ? 1 : this.owned.length - 1)) % this.owned.length;
      G.audio.play('click');
    }
    if (input.keyPressed('KeyX')) this.index = 0;
    p.weaponTwoHanded = !!d.twoHand;
    const busy = p.action || p.state === 'climb' || p.state === 'hang' || p.state === 'swim';
    p.aiming = !d.melee && input.btn(2) && !busy;
    p.blocking = !!d.melee && input.btn(2) && !busy && p.state === 'ground';
    p.aimPitch = G.cam.pitch;

    // reload
    if (this.reloading > 0) {
      this.reloading -= dt;
      if (this.reloading <= 0) {
        const s = this.state[w.id];
        const need = d.mag - s.mag;
        const take = Math.min(need, s.reserve);
        s.mag += take; s.reserve -= take;
      }
    } else if (!d.melee && (input.keyPressed('KeyR') || (this.state[w.id].mag === 0 && input.btnPressed(0) && this.state[w.id].reserve > 0))) {
      const s = this.state[w.id];
      if (s.mag < d.mag && s.reserve > 0) { this.reloading = d.reload; G.audio.play('reload', p.pos); }
    }

    // melee
    if (p.melee) {
      p.melee.t += dt;
      const k = p.melee.t / p.melee.dur;
      if (!p.melee.hit && k > 0.38) { p.melee.hit = true; this._meleeHit(p, d); }
      if (input.btnPressed(0)) this.queued = true;
      if (k >= 1) {
        p.melee = null;
        if (this.queued && this.comboStep < d.combo.length) { this.queued = false; this._startMelee(p, d); }
        else { this.comboStep = 0; this.queued = false; }
      }
    } else if (d.melee && input.btnPressed(0) && !busy && !p.blocking) {
      if (this.comboTimer <= 0) this.comboStep = 0;
      this._startMelee(p, d);
    }
    if (!d.melee && !busy && this.reloading <= 0) {
      const trig = d.auto ? input.btn(0) : input.btnPressed(0);
      if (trig && this.cool <= 0) {
        const s = this.state[w.id];
        if (s.mag > 0) { this._fire(p, d, w.id); s.mag--; this.cool = d.rate; }
        else { G.audio.play('click', p.pos); this.cool = 0.25; }
      }
    }
    // crosshair prompt
    this._updateDrones(dt);
  }

  _startMelee(p, d) {
    const kind = d.combo[this.comboStep % d.combo.length];
    this.comboStep++;
    this.comboTimer = 0.9;
    p.melee = { kind, t: 0, dur: d.rate + (kind === 3 ? 0.15 : 0), hit: false };
    p.yaw = G.cam.yaw;
    // small lunge
    p.vel.x += Math.sin(p.yaw) * 2.5; p.vel.z += Math.cos(p.yaw) * 2.5;
    G.audio.play('whoosh', p.pos);
  }

  _meleeHit(p, d) {
    const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw);
    let any = false;
    const dmg = d.dmg * (this.comboStep >= d.combo.length ? 1.4 : 1);
    for (const n of G.crowd.npcs) {
      if (!n.alive || n.era !== G.era || n.state === 'dead') continue;
      const dx = n.pos.x - p.pos.x, dz = n.pos.z - p.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist > d.range + 0.3) continue;
      if ((dx * fx + dz * fz) / (dist || 1) < 0.4) continue;
      if (Math.abs(n.pos.y - p.pos.y) > 1.2) continue;
      const blocked = n.ai && n.ai.blocking && wrapAngle(Math.atan2(-dx, -dz) - n.yaw) < 1;
      this.hitNPC(n, blocked ? dmg * 0.25 : dmg, p.pos, 'melee');
      n.pos.x += (dx / (dist || 1)) * (d.heavy ? 0.9 : 0.4);
      n.pos.z += (dz / (dist || 1)) * (d.heavy ? 0.9 : 0.4);
      if (n.ai) n.ai.stagger = d.heavy ? 0.9 : 0.45;
      G.audio.play(d.id === 'blade' ? 'hit' : 'punch', n.pos);
      G.fx.impact(_v.set(n.pos.x, n.pos.y + 1.3, n.pos.z), _d.set(-fx, 0.3, -fz), 'flesh');
      any = true;
    }
    for (const dr of this.drones) {
      if (dr.dead || dr.era !== G.era) continue;
      if (dr.pos.distanceTo(p.pos) < d.range + 1 && dr.pos.y - p.pos.y < 2.4) { dr.damage(d.dmg, p.pos); any = true; }
    }
    if (any) { G.cam.shake(0.12); G.hud.hitMarker(); this._hitstop = 0.05; }
    G.events.emit('noise', p.pos, 12, 'assault');
    if (any) G.events.emit('crime', { kind: 'assault', pos: p.pos.clone() });
  }

  _fire(p, d, id) {
    // camera ray → aim point
    G.camera.getWorldPosition(_o);
    G.camera.getWorldDirection(_d);
    const hand = p.avatar.handWorld(true, new THREE.Vector3());
    const aimDist = d.range || 120;
    const camHit = this._trace(_o, _d, aimDist, true);
    const target = camHit ? camHit.point : _o.clone().addScaledVector(_d, aimDist);
    const pellets = d.pellets || 1;
    const baseSpread = d.spread + this.spread + (p.moveSpeed > 3 ? 0.02 : 0) + (p.aiming ? 0 : 0.03);
    G.audio.gunshot(d.sound, p.pos);
    G.events.emit('noise', p.pos, d.sound === 'smart' || d.sound === 'arc' ? 50 : 85, 'gunshot');
    G.events.emit('crime', { kind: 'gunshot', pos: p.pos.clone() });
    const dir0 = target.clone().sub(hand).normalize();
    G.fx.muzzle(hand.clone().addScaledVector(dir0, 0.35), dir0, d.tracer ? d.tracer.map((c) => c * 1.2) : [3, 2, 0.8]);
    p.recoil = Math.min(1.5, p.recoil + d.recoil);
    G.cam.pitch -= d.recoil * 0.035;
    G.cam.yaw += (Math.random() - 0.5) * d.recoil * 0.02;
    G.cam.shake(d.recoil * 0.12);
    this.spread = Math.min(0.12, this.spread + d.recoil * 0.02);

    if (d.arc) { this._arc(hand, dir0, d); return; }
    if (d.displace) { this._displace(hand, dir0, d); return; }

    for (let k = 0; k < pellets; k++) {
      const dir = dir0.clone();
      dir.x += (Math.random() - 0.5) * baseSpread * 2;
      dir.y += (Math.random() - 0.5) * baseSpread * 2;
      dir.z += (Math.random() - 0.5) * baseSpread * 2;
      dir.normalize();
      // smart pistol: curve toward nearest target in cone
      if (d.homing) {
        let best = null, bs = 0.97;
        for (const n of G.crowd.npcs) {
          if (!n.alive || n.era !== G.era || n.state === 'dead' || !(n.ai && n.ai.hostile)) continue;
          _v.set(n.pos.x, n.pos.y + 1.3, n.pos.z).sub(hand).normalize();
          const s = _v.dot(dir0);
          if (s > bs) { bs = s; best = n; }
        }
        if (best) dir.set(best.pos.x, best.pos.y + 1.35, best.pos.z).sub(hand).normalize();
      }
      const hit = this._trace(hand, dir, d.range || 120, false);
      const end = hit ? hit.point : hand.clone().addScaledVector(dir, d.range || 120);
      G.fx.tracer(hand, end, d.tracer || [3, 2.2, 1.2]);
      if (!hit) continue;
      if (hit.npc) {
        const mult = hit.part === 'head' ? 2.2 : hit.part === 'legs' ? 0.7 : 1;
        const killed = this.hitNPC(hit.npc, d.dmg * mult, p.pos, 'bullet', hit.part);
        G.fx.impact(hit.point, _v.copy(dir).negate(), 'flesh');
        G.hud.hitMarker(killed);
      } else if (hit.drone) {
        hit.drone.damage(d.dmg, p.pos);
        G.fx.impact(hit.point, _v.copy(dir).negate(), 'metal');
        G.hud.hitMarker(hit.drone.dead);
      } else if (hit.vehicle) {
        hit.vehicle.damage(d.dmg * 0.4);
        G.fx.impact(hit.point, _v.copy(dir).negate(), 'metal');
        if (hit.vehicle.ai) hit.vehicle.ai.panic = 4;
      } else {
        G.fx.impact(hit.point, hit.normal, hit.metal ? 'metal' : 'concrete');
        if (hit.collider && hit.collider.data && hit.collider.data.onShot) hit.collider.data.onShot(hit);
      }
    }
  }

  _arc(hand, dir, d) {
    // chain lightning: hits up to 4 targets near the aim line
    let from = hand.clone();
    const hit = new Set();
    let pos = hand.clone().addScaledVector(dir, 3);
    for (let k = 0; k < 4; k++) {
      let best = null, bd = k === 0 ? d.range : 9;
      for (const n of G.crowd.npcs) {
        if (!n.alive || n.era !== G.era || n.state === 'dead' || hit.has(n) || n === null) continue;
        if (n.role === 'civ' && k === 0 && !(n.ai && n.ai.hostile)) continue;
        _v.set(n.pos.x, n.pos.y + 1.2, n.pos.z);
        const dd = k === 0 ? _v.clone().sub(hand).normalize().dot(dir) > 0.93 ? _v.distanceTo(hand) : 1e9 : _v.distanceTo(pos);
        if (dd < bd) { bd = dd; best = n; }
      }
      if (!best) break;
      hit.add(best);
      const to = new THREE.Vector3(best.pos.x, best.pos.y + 1.2, best.pos.z);
      G.fx.arc(from, to);
      this.hitNPC(best, d.dmg * (1 - k * 0.15), G.player.pos, 'arc');
      if (best.ai) best.ai.stagger = 1.2;
      from = to; pos = to;
    }
    for (const dr of this.drones) if (!dr.dead && dr.era === G.era && dr.pos.distanceTo(hand) < d.range && _v.copy(dr.pos).sub(hand).normalize().dot(dir) > 0.9) { G.fx.arc(hand, dr.pos); dr.damage(d.dmg * 2, hand); }
    if (!hit.size) G.fx.arc(hand, hand.clone().addScaledVector(dir, 8));
  }

  // The Chrono-Displacer: hurls a target into another era. It vanishes here
  // — and the Chronicle remembers where it landed.
  _displace(hand, dir, d) {
    const hit = this._trace(hand, dir, d.range, false);
    const end = hit ? hit.point : hand.clone().addScaledVector(dir, d.range);
    G.fx.tracer(hand, end, [2, 4, 1.5], 0.3);
    if (hit && hit.npc) {
      const n = hit.npc;
      const toEra = G.era === 0 ? 1 : 0;
      G.fx.shiftMotes(new THREE.Vector3(n.pos.x, n.pos.y + 1, n.pos.z), new THREE.Color(0.6, 1, 0.4));
      G.audio.play('consequence', n.pos);
      n.alive = false;
      G.events.emit('npc:displaced', n, toEra);
      G.hud.toast(`Target displaced to ${ERA_YEARS[toEra]}`, 'good');
      G.hud.hitMarker(true);
      const key = 'displaced:' + Math.round(n.pos.x) + ',' + Math.round(n.pos.z);
      G.chronicle.set(key, { x: n.pos.x, z: n.pos.z, role: n.role }, toEra);
    } else if (hit && hit.drone) {
      hit.drone.dead = true;
      hit.drone.mesh.visible = false;
      G.fx.shiftMotes(hit.drone.pos, new THREE.Color(0.6, 1, 0.4));
    }
  }

  // Ray against world, NPCs, drones, vehicles. camRay: ignore the player capsule region
  _trace(o, d, max, camRay) {
    const wh = G.collision.raycast(G.era, o.x, o.y, o.z, d.x, d.y, d.z, max, CF.NOBULLET);
    let best = wh ? { t: wh.t, point: new THREE.Vector3(wh.x, wh.y, wh.z), normal: new THREE.Vector3(wh.nx, wh.ny, wh.nz), collider: wh.collider, metal: wh.collider && wh.collider.surf === 2 } : null;
    const minT = camRay ? G.cam.curDist + 0.6 : 0.3;
    const nh = G.crowd.raycast(o, d, best ? best.t : max);
    if (nh && nh.t > minT) best = { t: nh.t, point: o.clone().addScaledVector(d, nh.t), npc: nh.npc, part: nh.part };
    for (const dr of this.drones) {
      if (dr.dead || dr.era !== G.era) continue;
      _v.copy(dr.pos).sub(o);
      const tc = _v.dot(d);
      if (tc < minT || (best && tc > best.t)) continue;
      const dist2 = _v.lengthSq() - tc * tc;
      if (dist2 < dr.radius * dr.radius) best = { t: tc, point: o.clone().addScaledVector(d, tc), drone: dr };
    }
    if (G.vehicles) {
      for (const v of G.vehicles.list) {
        if (v.era !== G.era || v === G.player.vehicle) continue;
        _v.set(v.pos.x, v.pos.y + 0.8, v.pos.z).sub(o);
        const tc = _v.dot(d);
        if (tc < minT || (best && tc > best.t)) continue;
        const dist2 = _v.lengthSq() - tc * tc;
        if (dist2 < (v.halfW + 0.3) ** 2) best = { t: tc, point: o.clone().addScaledVector(d, tc), vehicle: v };
      }
    }
    return best;
  }

  hitNPC(n, dmg, from, kind, part) {
    const killed = G.crowd.damage(n, dmg, from, kind);
    if (n.role !== 'enemy' || !(n.ai && n.ai.hostile)) {
      G.events.emit('crime', { kind: killed ? 'murder' : 'assault', pos: n.pos.clone(), victim: n });
    }
    if (killed) {
      G.events.emit('kill', n, kind);
      if (G.progress) G.progress.addXP(n.ai && n.ai.hostile ? 20 : 2);
    }
    return killed;
  }

  radialDamage(pos, radius, dmg, source) {
    for (const n of G.crowd.npcs) {
      if (!n.alive || n.era !== G.era || n.state === 'dead') continue;
      const d = n.pos.distanceTo(pos);
      if (d < radius) this.hitNPC(n, dmg * (1 - d / radius), pos, 'explosion');
    }
    const p = G.player;
    if (!p.vehicle || p.vehicle !== source) {
      const d = p.pos.distanceTo(pos);
      if (d < radius) p.damage(dmg * 0.6 * (1 - d / radius), pos, 'explosion');
    }
    for (const v of G.vehicles.list) if (v !== source && v.era === G.era && v.pos.distanceTo(pos) < radius) v.damage(dmg * 0.5);
    for (const dr of this.drones) if (!dr.dead && dr.pos.distanceTo(pos) < radius) dr.damage(dmg, pos);
  }

  // ------------------------------------------------------------- spawning --
  spawnEnemy(x, z, era, archetype, opts = {}) {
    const role = opts.role || (archetype === 'cop' || archetype === 'enforcer' ? 'cop' : 'enemy');
    const n = G.crowd.spawn(x, z, era, { role, health: ARCH[archetype].health, persistent: opts.persistent, state: 'idle', noRing: true, name: opts.name, onDeath: opts.onDeath });
    if (!n) return null;
    n.ai = new CombatAI(n, archetype, opts);
    n.opts.gun = !ARCH[archetype].melee;
    if (opts.colors) Object.assign(n.colors, opts.colors);
    return n;
  }

  spawnDrone(x, y, z, era, opts = {}) {
    const d = new Drone(x, y, z, era, opts);
    this.drones.push(d);
    this.droneGroup.add(d.mesh);
    return d;
  }

  _updateDrones(dt) {
    for (const d of this.drones) d.update(dt);
    this.drones = this.drones.filter((d) => {
      if (d.removeMe) { this.droneGroup.remove(d.mesh); return false; }
      return true;
    });
  }
}

// ---------------------------------------------------------------------------
// Enemy archetypes
export const ARCH = {
  thug: { health: 55, melee: true, dmg: 12, speed: 4.6, skill: 0.4, label: 'Street thug' },
  gunman: { health: 60, weapon: 'pistol', dmg: 9, speed: 4.2, skill: 0.45, range: 22, burst: 2 },
  cop: { health: 80, weapon: 'pistol', dmg: 10, speed: 4.6, skill: 0.55, range: 26, burst: 3, cover: true },
  swat: { health: 140, weapon: 'smg', dmg: 8, speed: 4.4, skill: 0.65, range: 30, burst: 5, cover: true, armor: true },
  enforcer: { health: 120, weapon: 'pulse', dmg: 10, speed: 5, skill: 0.7, range: 34, burst: 4, cover: true, tracer: [3, 0.4, 0.6] },
  ninja: { health: 70, melee: true, dmg: 22, speed: 7, skill: 0.75, dash: true },
  scav: { health: 50, melee: true, dmg: 15, speed: 5, skill: 0.45 },
  raider: { health: 75, weapon: 'scrap', dmg: 22, speed: 4.4, skill: 0.5, range: 40, burst: 1, cover: true },
};

class CombatAI {
  constructor(n, arch, opts) {
    this.n = n;
    this.arch = arch;
    this.A = ARCH[arch];
    this.hostile = opts.hostile !== false;
    this.state = opts.patrol ? 'patrol' : 'idle';
    this.home = new THREE.Vector3(n.pos.x, n.pos.y, n.pos.z);
    this.patrol = opts.patrol || null;
    this.patrolI = 0;
    this.lastKnown = new THREE.Vector3();
    this.alert = 0;          // 0..1 suspicion meter
    this.seeT = 0;
    this.lostT = 0;
    this.goal = null;
    this.shootT = 1 + Math.random();
    this.burst = 0;
    this.stagger = 0;
    this.crouch = false;
    this.blocking = false;
    this.attackT = 0;
    this.melee = null;
    this.flankSide = Math.random() < 0.5 ? -1 : 1;
    this.repath = 0;
    this.aware = !!opts.aware;
    this.onlyWhenWanted = !!opts.onlyWhenWanted;
    this.searchT = 0;
    this.faction = opts.faction || null;
    this.group = opts.group || null;
    if (this.aware) { this.state = 'combat'; this.lastKnown.copy(G.player.pos); }
    this.unsub = G.events.on('noise', (pos, radius, kind) => this.hear(pos, radius, kind));
  }

  isHostileNow() {
    if (!this.hostile) return false;
    if (this.onlyWhenWanted) return G.authority && G.authority.level(this.n.era) > 0;
    return true;
  }

  hear(pos, radius, kind) {
    const n = this.n;
    if (!n.alive || n.state === 'dead' || n.era !== G.era) return;
    const d = n.pos.distanceTo(pos);
    if (d > radius * 0.9) return;
    if (this.state === 'combat') return;
    if (!this.isHostileNow() && kind !== 'gunshot') return;
    this.lastKnown.copy(pos);
    this.alert = Math.min(1, this.alert + (kind === 'gunshot' ? 0.8 : 0.4));
    this.state = this.alert > 0.7 && this.isHostileNow() ? 'combat' : 'investigate';
    if (this.state === 'combat') this.aware = true;
  }

  onHurt(n, from) {
    if (!this.hostile) this.hostile = true;
    if (this.onlyWhenWanted && G.authority) G.authority.raise(n.era, 1, n.pos);
    this.state = 'combat';
    this.aware = true;
    if (from) this.lastKnown.set(from.x, from.y || 0, from.z);
    this.alert = 1;
  }

  canSee() {
    const n = this.n;
    const p = G.player;
    const tgt = p.vehicle ? p.vehicle.pos : p.pos;
    const dx = tgt.x - n.pos.x, dz = tgt.z - n.pos.z;
    const d = Math.hypot(dx, dz);
    const night = G.sky.night;
    let range = (this.state === 'combat' ? 55 : 32) * (1 - night * 0.35) * (p.crouch ? 0.6 : 1);
    if (d > range) return false;
    const rel = Math.abs(wrapAngle(Math.atan2(dx, dz) - n.yaw));
    if (rel > (this.state === 'combat' ? 1.9 : 1.0) && d > 3) return false;
    const ey = n.pos.y + (this.crouch ? 1.0 : 1.6);
    const ty = tgt.y + (p.crouch ? 0.9 : 1.4);
    const dy = ty - ey;
    const L = Math.hypot(dx, dy, dz);
    const hit = G.collision.raycast(n.era, n.pos.x, ey, n.pos.z, dx / L, dy / L, dz / L, L - 0.5, CF.NOBULLET);
    return !hit;
  }

  update(n, dt) {
    if (n.state === 'dead') { n.deadT += dt; n.speed = 0; if (this.unsub) { this.unsub(); this.unsub = null; } if (n.deadT > 45 && !n.persistent) n.alive = false; return; }
    const p = G.player;
    const tgt = p.vehicle ? p.vehicle.pos : p.pos;
    this.stagger = Math.max(0, this.stagger - dt);
    if (this.stagger > 0) { n.speed = damp(n.speed, 0, 10, dt); return; }
    const hostileNow = this.isHostileNow();
    const sees = hostileNow && !p.dead && this.canSee();
    if (sees) {
      this.lastKnown.copy(tgt);
      this.lostT = 0;
      this.alert = Math.min(1, this.alert + dt * (this.aware ? 3 : 1.4));
      if (this.alert >= 1) { this.state = 'combat'; this.aware = true; }
      else if (this.state !== 'combat') this.state = 'suspicious';
      if (G.authority && this.onlyWhenWanted) G.authority.spotted(n.era, tgt);
    } else if (this.state === 'combat') {
      this.lostT += dt;
      if (this.lostT > 4) { this.state = 'search'; this.searchT = 0; this.goal = null; }
    }
    if (!hostileNow && (this.state === 'combat' || this.state === 'search')) this.state = 'idle';

    switch (this.state) {
      case 'idle': this._idle(n, dt); break;
      case 'patrol': this._patrol(n, dt); break;
      case 'suspicious': this._suspicious(n, dt); break;
      case 'investigate': this._goTo(n, this.lastKnown, 2.2, dt, () => { this.state = 'search'; this.searchT = 0; }); break;
      case 'search': this._search(n, dt); break;
      case 'combat': this._combat(n, dt, sees, tgt); break;
      default: break;
    }
  }

  _idle(n, dt) {
    n.speed = damp(n.speed, 0, 5, dt);
    this.crouch = false;
    if (this.patrol) this.state = 'patrol';
  }

  _patrol(n, dt) {
    const pt = this.patrol[this.patrolI];
    this._goTo(n, pt, 1.4, dt, () => { this.patrolI = (this.patrolI + 1) % this.patrol.length; });
  }

  _suspicious(n, dt) {
    n.speed = damp(n.speed, 0, 5, dt);
    n.yaw = dampAngle(n.yaw, Math.atan2(this.lastKnown.x - n.pos.x, this.lastKnown.z - n.pos.z), 3, dt);
    this.alert -= dt * 0.15;
    if (this.alert <= 0) this.state = this.patrol ? 'patrol' : 'idle';
  }

  _search(n, dt) {
    this.searchT += dt;
    this.crouch = false;
    if (!this.goal || n.pos.distanceTo(this.goal) < 1.5) {
      const a = Math.random() * Math.PI * 2, r = 4 + Math.random() * 10;
      this.goal = new THREE.Vector3(this.lastKnown.x + Math.cos(a) * r, 0, this.lastKnown.z + Math.sin(a) * r);
    }
    this._goTo(n, this.goal, 2.0, dt);
    if (this.searchT > 18) { this.state = this.patrol ? 'patrol' : 'idle'; this.alert = 0; this.aware = false; }
  }

  _goTo(n, goal, speed, dt, onArrive) {
    const dx = goal.x - n.pos.x, dz = goal.z - n.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < 1.0) { n.speed = damp(n.speed, 0, 6, dt); if (onArrive) onArrive(); return true; }
    let yaw = Math.atan2(dx, dz);
    // simple obstacle steering: probe ahead and veer
    const probe = G.collision.pointSolid(n.era, n.pos.x + Math.sin(yaw) * 1.4, n.pos.y + 0.9, n.pos.z + Math.cos(yaw) * 1.4);
    if (probe) yaw += this.flankSide * 1.1;
    n.yaw = dampAngle(n.yaw, yaw, 7, dt);
    n.speed = damp(n.speed, speed, 5, dt);
    return false;
  }

  _combat(n, dt, sees, tgt) {
    const A = this.A;
    const dx = tgt.x - n.pos.x, dz = tgt.z - n.pos.z;
    const dist = Math.hypot(dx, dz);
    const face = Math.atan2(dx, dz);
    this.repath -= dt;
    if (A.melee) {
      this.crouch = false;
      // circle in, then attack with a telegraphed windup
      if (this.melee) {
        this.melee.t += dt;
        n.speed = damp(n.speed, 0.5, 6, dt);
        n.yaw = dampAngle(n.yaw, face, 8, dt);
        const k = this.melee.t / this.melee.dur;
        if (!this.melee.hit && k > 0.45) {
          this.melee.hit = true;
          if (dist < 2.3 && !G.player.vehicle) {
            const p = G.player;
            const blocked = p.blocking && Math.abs(wrapAngle(Math.atan2(-dx, -dz) - p.yaw)) < 1.2;
            p.damage(blocked ? A.dmg * 0.2 : A.dmg, n.pos, 'melee');
            G.audio.play('punch', p.pos);
            if (blocked) { this.stagger = 0.8; G.audio.play('hit', p.pos); }
          }
        }
        if (k >= 1) this.melee = null;
        return;
      }
      const want = dist > 2.0;
      if (want) {
        // approach with a slight arc for flanking
        const arc = dist > 5 ? this.flankSide * 0.5 : 0;
        n.yaw = dampAngle(n.yaw, face + arc, 7, dt);
        n.speed = damp(n.speed, A.speed * (A.dash && dist < 9 && dist > 4 ? 1.8 : 1), 5, dt);
      } else {
        n.speed = damp(n.speed, 0, 8, dt);
        n.yaw = dampAngle(n.yaw, face, 8, dt);
        this.attackT -= dt;
        if (this.attackT <= 0) {
          this.melee = { t: 0, dur: 0.75 - A.skill * 0.25, kind: Math.random() < 0.5 ? 1 : 3, hit: false };
          this.attackT = 1.1 - A.skill * 0.5 + Math.random() * 0.5;
          G.audio.play('whoosh', n.pos);
        }
      }
      this.blocking = !this.melee && dist < 3 && G.player.melee && Math.random() < A.skill * 0.05 + 0.02;
      return;
    }
    // ranged: hold preferred distance, use cover, flank, burst fire
    const pref = A.range * 0.6;
    if (this.repath <= 0) {
      this.repath = 2.5 + Math.random() * 2;
      this.goal = this._pickPosition(n, tgt, pref);
    }
    const arrived = this.goal ? this._goTo(n, this.goal, A.speed * (dist > A.range ? 1.1 : 0.8), dt) : true;
    if (arrived) {
      n.speed = damp(n.speed, 0, 6, dt);
      this.crouch = A.cover && this.goalIsCover && this.burst <= 0;
    } else this.crouch = false;
    if (sees || dist < 6) n.yaw = dampAngle(n.yaw, face, n.speed > 1 ? 4 : 10, dt);
    // shooting
    this.shootT -= dt;
    if (sees && dist < A.range * 1.3) {
      if (this.shootT <= 0 && this.burst <= 0) { this.burst = A.burst || 1; this.shootT = 0; }
      if (this.burst > 0 && this.shootT <= 0) {
        this.crouch = false;
        this._shoot(n, tgt, dist);
        this.burst--;
        this.shootT = this.burst > 0 ? 0.14 : 1.2 + Math.random() * 1.4 - A.skill;
      }
    } else if (!sees && this.lostT > 1.5 && this.repath > 1) {
      // push toward last known position
      this.goal = this.lastKnown.clone();
      this.goalIsCover = false;
    }
  }

  _pickPosition(n, tgt, pref) {
    // sample around the target: prefer spots near cover (solid between spot and target) and on our flank side
    let best = null, bs = -1e9;
    const base = Math.atan2(n.pos.x - tgt.x, n.pos.z - tgt.z);
    for (let i = 0; i < 10; i++) {
      const a = base + this.flankSide * (i / 10) * 1.6 + (Math.random() - 0.5) * 0.5;
      const r = pref * (0.7 + Math.random() * 0.6);
      const x = tgt.x + Math.sin(a) * r, z = tgt.z + Math.cos(a) * r;
      if (!G.collision.bodyFree(n.era, x, n.pos.y, z, 0.3, 1.6)) continue;
      // cover check: low ray blocked, high ray clear
      const ddx = tgt.x - x, ddz = tgt.z - z, dl = Math.hypot(ddx, ddz);
      const low = G.collision.raycast(n.era, x, n.pos.y + 0.9, z, ddx / dl, 0, ddz / dl, Math.min(3, dl), CF.NOBULLET);
      const cover = !!low;
      let s = (cover ? 6 : 0) - Math.abs(r - pref) * 0.2 - Math.hypot(x - n.pos.x, z - n.pos.z) * 0.15 + (i > 3 ? 1.5 : 0);
      // avoid crowding with allies
      for (const o of G.crowd.npcs) if (o !== n && o.alive && o.ai && o.ai.goal && Math.hypot(o.ai.goal.x - x, o.ai.goal.z - z) < 3) s -= 4;
      if (s > bs) { bs = s; best = new THREE.Vector3(x, n.pos.y, z); this.goalIsCover = cover; }
    }
    return best;
  }

  _shoot(n, tgt, dist) {
    const A = this.A;
    const p = G.player;
    const from = new THREE.Vector3(n.pos.x + Math.sin(n.yaw) * 0.4, n.pos.y + 1.45, n.pos.z + Math.cos(n.yaw) * 0.4);
    const aim = new THREE.Vector3(tgt.x, tgt.y + (p.crouch ? 0.8 : 1.3), tgt.z);
    // accuracy drops with distance, target speed, and when the player just dodged
    let miss = 0.4 + dist * 0.02 + (p.moveSpeed > 5 ? 0.35 : 0) + (p.action && p.action.type === 'dodge' ? 1 : 0) - A.skill * 0.5;
    if (G.sky.night > 0.5) miss += 0.15;
    const hitRoll = Math.random() > clamp(miss, 0.05, 0.92);
    const dir = aim.clone().sub(from).normalize();
    if (!hitRoll) { dir.x += (Math.random() - 0.5) * 0.12; dir.y += (Math.random() - 0.5) * 0.08; dir.z += (Math.random() - 0.5) * 0.12; dir.normalize(); }
    const wh = G.collision.raycast(n.era, from.x, from.y, from.z, dir.x, dir.y, dir.z, A.range * 1.5, CF.NOBULLET);
    const playerT = aim.distanceTo(from);
    let end;
    if (hitRoll && (!wh || wh.t > playerT - 0.5)) {
      end = aim;
      if (p.vehicle) p.vehicle.damage(A.dmg * 0.6);
      else p.damage(A.dmg, n.pos, 'bullet');
    } else {
      end = wh ? new THREE.Vector3(wh.x, wh.y, wh.z) : from.clone().addScaledVector(dir, A.range);
      if (wh) G.fx.impact(end, new THREE.Vector3(wh.nx, wh.ny, wh.nz), 'concrete');
      // near-miss whizz
      if (Math.random() < 0.4) G.audio.play('whoosh', p.pos);
    }
    G.fx.tracer(from, end, A.tracer || [3, 2.2, 1.2]);
    G.fx.muzzle(from, dir, A.tracer || [3, 2, 0.8]);
    G.audio.gunshot(WEAPONS[A.weapon] ? WEAPONS[A.weapon].sound : 'pistol', from);
    G.events.emit('noise', from, 70, 'gunshot_ai');
    this.aimPulse = 0.15;
  }

  pose(n, p, dt) {
    const A = this.A;
    const armed = !A.melee && n.state !== 'dead';
    if (this.crouch && n.speed < 0.5) { p.clear(); poseCrouch(p, 0, 0); }
    if (armed && this.state === 'combat') {
      n.aimW = damp(n.aimW, 1, 10, dt);
      const tmp = n.tmp.clear();
      poseAim(tmp, 0, A.weapon !== 'pistol', this.aimPulse || 0);
      p.blendUpper(tmp, n.aimW);
      this.aimPulse = Math.max(0, (this.aimPulse || 0) - dt);
    } else n.aimW = damp(n.aimW, 0, 6, dt);
    if (this.melee) {
      const tmp = n.tmp.clear();
      poseMelee(tmp, this.melee.kind, this.melee.t / this.melee.dur);
      p.blendUpper(tmp, 1);
    } else if (this.blocking) {
      const tmp = n.tmp.clear();
      poseBlock(tmp);
      p.blendUpper(tmp, 1);
    }
  }
}

// ---------------------------------------------------------------------------
// Drones: AEGIS security drones (2047) and machine sentinels (2189)
const droneGeo = {};
export class Drone {
  constructor(x, y, z, era, opts = {}) {
    this.pos = new THREE.Vector3(x, y, z);
    this.vel = new THREE.Vector3();
    this.era = era;
    this.health = opts.health || 60;
    this.radius = 0.6;
    this.dead = false;
    this.state = opts.aware ? 'combat' : 'patrol';
    this.home = this.pos.clone();
    this.patrolT = Math.random() * 10;
    this.shootT = 1.5;
    this.lastKnown = new THREE.Vector3();
    this.onlyWhenWanted = !!opts.onlyWhenWanted;
    this.machine = era === 2;
    this.onDeath = opts.onDeath || null;
    const g = new THREE.Group();
    const bodyM = new THREE.MeshStandardMaterial({ color: this.machine ? 0x5a4a3a : 0xe8ecf0, roughness: this.machine ? 0.7 : 0.3, metalness: 0.7 });
    const eyeM = new THREE.MeshStandardMaterial({ color: 0, emissive: new THREE.Color(this.machine ? '#ff6a10' : '#ff2030'), emissiveIntensity: 5 });
    patchActorMaterial(bodyM, era); patchActorMaterial(eyeM, era);
    const core = new THREE.Mesh(this.machine ? new THREE.DodecahedronGeometry(0.5, 0) : new THREE.SphereGeometry(0.45, 16, 12), bodyM);
    core.castShadow = true;
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), eyeM);
    eye.position.z = 0.42;
    g.add(core, eye);
    this.rotors = [];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.6), bodyM);
      arm.position.set(Math.cos(a) * 0.45, 0.1, Math.sin(a) * 0.45);
      arm.rotation.y = -a + Math.PI / 2;
      const rot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.02, 12), new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.4 }));
      rot.position.set(Math.cos(a) * 0.7, 0.15, Math.sin(a) * 0.7);
      g.add(arm, rot);
      this.rotors.push(rot);
    }
    if (!this.machine) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.03, 6, 24), eyeM);
      ring.rotation.x = Math.PI / 2;
      g.add(ring);
      // searchlight cone
      const cone = new THREE.Mesh(new THREE.ConeGeometry(2.2, 9, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      cone.position.set(0, -4.5, 0.5);
      g.add(cone);
      this.cone = cone;
    }
    this.mesh = g;
    g.position.copy(this.pos);
    void droneGeo;
  }

  damage(n, from) {
    if (this.dead) return;
    this.health -= n;
    this.state = 'combat';
    if (from) this.lastKnown.set(from.x, from.y || 0, from.z);
    if (this.health <= 0) {
      this.dead = true;
      G.fx.explosion(this.pos.clone(), 0.4);
      G.audio.play('explosion', this.pos);
      this.vel.set((Math.random() - 0.5) * 3, 2, (Math.random() - 0.5) * 3);
      if (this.onDeath) this.onDeath(this);
      G.events.emit('kill', this, 'drone');
      if (G.progress) G.progress.addXP(25);
    }
  }

  update(dt) {
    const g = this.mesh;
    g.visible = this.era === G.era || G.shift.active;
    if (this.era !== G.era) return;
    if (this.dead) {
      this.vel.y -= 15 * dt;
      this.pos.addScaledVector(this.vel, dt);
      const gy = G.collision.ground(this.era, this.pos.x, this.pos.z, this.pos.y + 1).y;
      if (this.pos.y < gy + 0.3) { this.pos.y = gy + 0.3; this.vel.set(0, 0, 0); this.deadT = (this.deadT || 0) + dt; if (this.deadT > 20) this.removeMe = true; }
      g.position.copy(this.pos);
      g.rotation.x += dt * 2;
      return;
    }
    for (const r of this.rotors) r.rotation.y += dt * 40;
    const p = G.player;
    const tgt = p.vehicle ? p.vehicle.pos : p.pos;
    const hostile = !this.onlyWhenWanted || (G.authority && G.authority.level(this.era) > 0);
    const toP = new THREE.Vector3(tgt.x - this.pos.x, tgt.y + 1.3 - this.pos.y, tgt.z - this.pos.z);
    const dist = toP.length();
    let sees = false;
    if (hostile && dist < 45 && !p.dead) {
      const h = G.collision.raycast(this.era, this.pos.x, this.pos.y, this.pos.z, toP.x / dist, toP.y / dist, toP.z / dist, dist - 0.6, CF.NOBULLET);
      sees = !h;
    }
    if (sees) { this.state = 'combat'; this.lastKnown.copy(tgt); this.lostT = 0; if (this.onlyWhenWanted && G.authority) G.authority.spotted(this.era, tgt); }
    let goal;
    if (this.state === 'combat') {
      this.lostT = (this.lostT || 0) + (sees ? 0 : dt);
      if (this.lostT > 8) this.state = 'patrol';
      // orbit the target at ~12 m, 6 m up
      const a = Math.atan2(this.pos.x - this.lastKnown.x, this.pos.z - this.lastKnown.z) + dt * 0.4;
      goal = new THREE.Vector3(this.lastKnown.x + Math.sin(a) * 12, this.lastKnown.y + 6, this.lastKnown.z + Math.cos(a) * 12);
      this.shootT -= dt;
      if (sees && this.shootT <= 0) {
        this.shootT = this.machine ? 1.4 : 0.9 + Math.random() * 0.6;
        const dir = toP.clone().normalize();
        const miss = Math.random() < 0.45 + dist * 0.008 + (p.moveSpeed > 5 ? 0.25 : 0);
        if (miss) { dir.x += (Math.random() - 0.5) * 0.15; dir.y += (Math.random() - 0.5) * 0.1; dir.normalize(); }
        const end = this.pos.clone().addScaledVector(dir, miss ? dist + 10 : dist);
        G.fx.tracer(this.pos, end, this.machine ? [4, 1.4, 0.3] : [4, 0.4, 0.5], 0.12);
        G.audio.gunshot('pulse', this.pos);
        if (!miss) { if (p.vehicle) p.vehicle.damage(6); else p.damage(this.machine ? 12 : 8, this.pos, 'laser'); }
      }
    } else {
      this.patrolT += dt * 0.3;
      goal = new THREE.Vector3(this.home.x + Math.sin(this.patrolT) * 14, this.home.y + Math.sin(this.patrolT * 2.3) * 1.5, this.home.z + Math.cos(this.patrolT * 0.7) * 14);
    }
    // keep above ground
    const gy = G.collision.ground(this.era, goal.x, goal.z, goal.y + 20).y;
    goal.y = Math.max(goal.y, gy + 3.5);
    const acc = goal.sub(this.pos).multiplyScalar(1.6);
    this.vel.addScaledVector(acc, dt);
    this.vel.multiplyScalar(Math.exp(-1.8 * dt));
    this.pos.addScaledVector(this.vel, dt);
    g.position.copy(this.pos);
    const face = this.state === 'combat' ? Math.atan2(toP.x, toP.z) : Math.atan2(this.vel.x, this.vel.z);
    g.rotation.y = dampAngle(g.rotation.y, face, 5, dt);
    g.rotation.z = -this.vel.x * 0.03;
    if (this.cone) this.cone.visible = G.sky.night > 0.3;
  }
}
