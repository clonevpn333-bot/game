// Authority response: witnesses report crimes, heat escalates, and units
// physically travel to the scene, investigate, search and give up. Each era
// has a different authority — and the Chronicle can change who that is.
import * as THREE from 'three';
import { G } from '../core/state.js';
import { clamp, wrapAngle, RNG } from '../core/mathx.js';
import { chunkCoord } from '../world/layout.js';

const CRIME_HEAT = { gunshot: 0.6, assault: 0.4, murder: 1.6, carjack: 0.9, explosion: 1.5, brandish: 0.25, vehicular: 1.0, trespass: 0.5, crash: 0.1 };

export class Authority {
  constructor() {
    this.heat = [0, 0, 0];
    this.lastKnown = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
    this.seenAt = [-99, -99, -99];
    this.lastCrime = [-99, -99, -99];
    this.units = [];      // { kind: 'car'|'officer'|'drone', ref, era }
    this.dispatchT = 0;
    this.rng = new RNG(321);
    this.pendingCam = [];
    G.events.on('crime', (c) => this.onCrime(c));
  }

  label(era) {
    if (era === 0) return 'METRO POLICE';
    if (era === 1) return G.chronicle.has('aegis.gone', 1) ? 'CIVIC POLICE' : 'AEGIS SECURITY';
    return 'THE WARDENS';
  }
  level(era) { return Math.ceil(this.heat[era] - 0.05); }
  seen(era) { return G.time - this.seenAt[era] < 1.5; }

  onCrime(c) {
    const era = G.era;
    this.lastCrime[era] = G.time;
    // officers / drones that see it react instantly
    for (const u of this.units) {
      if (u.era !== era || u.kind === 'car') continue;
      const pos = u.ref.pos;
      if (pos.distanceTo(c.pos) < 35) { this.raise(era, (CRIME_HEAT[c.kind] || 0.4) + 0.5, c.pos); return; }
    }
    // 2047: surveillance cameras are witnesses (AEGIS only)
    if (era === 1 && !G.chronicle.has('aegis.gone', 1) && (CRIME_HEAT[c.kind] || 0) >= 0.4) {
      this.pendingCam.push({ t: G.time + 2.5, pos: c.pos.clone(), kind: c.kind });
    }
  }

  // civilian witness phoned it in
  report(pos, kind, witness) {
    const era = witness ? witness.era : G.era;
    if (era === 2 && kind !== 'murder' && kind !== 'explosion') return; // the ruins don't care much
    const h = CRIME_HEAT[kind] || 0.4;
    this.raise(era, h + 0.3, pos);
    if (era === G.era) G.hud.toast(`${this.label(era)}: a witness reported ${kind === 'brandish' ? 'an armed person' : 'a ' + kind}`, 'warn', 2.5);
  }

  raise(era, n, pos) {
    const before = this.level(era);
    this.heat[era] = clamp(this.heat[era] + n, 0, 5);
    if (pos) this.lastKnown[era].copy(pos);
    if (this.level(era) > before) this.dispatchT = 0;
  }

  spotted(era, pos) {
    if (this.heat[era] <= 0) return;
    this.seenAt[era] = G.time;
    this.lastKnown[era].copy(pos);
  }

  clear(era) { this.heat[era] = 0; }

  update(dt) {
    const era = G.era;
    for (const c of this.pendingCam.slice()) {
      if (G.time >= c.t) { this.pendingCam.splice(this.pendingCam.indexOf(c), 1); this.raise(1, (CRIME_HEAT[c.kind] || 0.4), c.pos); G.hud.toast('AEGIS surveillance flagged you', 'warn', 2); }
    }
    // heat decays once unseen for a while
    for (let e = 0; e < 3; e++) {
      if (this.heat[e] <= 0) continue;
      const unseen = G.time - Math.max(this.seenAt[e], this.lastCrime[e]);
      if (e !== era) continue; // other eras keep their memory while you're away
      if (unseen > 25) this.heat[e] = Math.max(0, this.heat[e] - dt / 14);
    }
    // clean up units
    this.units = this.units.filter((u) => {
      const alive = u.kind === 'drone' ? !u.ref.dead && !u.ref.removeMe : u.kind === 'car' ? G.vehicles.list.includes(u.ref) : u.ref.alive && u.ref.state !== 'dead';
      if (!alive) return false;
      if (u.era !== era && !G.shift.active) { this._despawn(u); return false; }
      if (this.heat[era] <= 0 && u.ref.pos.distanceTo(G.player.pos) > 70) { this._despawn(u); return false; }
      return true;
    });
    const lvl = this.level(era);
    if (lvl <= 0) return;
    // dispatch more units as the level rises
    this.dispatchT -= dt;
    const onFoot = this.units.filter((u) => u.era === era && u.kind !== 'car').length;
    const cars = this.units.filter((u) => u.era === era && u.kind === 'car').length;
    const want = lvl * 2 + (lvl >= 3 ? 2 : 0);
    if (this.dispatchT <= 0 && onFoot + cars * 2 < want) {
      this.dispatchT = 6 - lvl * 0.6;
      this.dispatch(era);
    }
  }

  _despawn(u) {
    if (u.kind === 'car') G.vehicles.remove(u.ref);
    else if (u.kind === 'drone') u.ref.removeMe = true;
    else u.ref.alive = false;
  }

  // Spawn a response unit far away and send it to the last known position
  dispatch(era) {
    const target = this.lastKnown[era];
    const p = G.player.pos;
    const lvl = this.level(era);
    if (era === 1 && !G.chronicle.has('aegis.gone', 1) && this.rng.chance(0.55)) {
      // AEGIS drones arrive from the sky
      const a = this.rng.range(0, Math.PI * 2);
      const d = G.combat.spawnDrone(target.x + Math.cos(a) * 110, 45, target.z + Math.sin(a) * 110, era, { onlyWhenWanted: true, health: 50 });
      d.state = 'combat';
      d.lastKnown.copy(target);
      this.units.push({ kind: 'drone', ref: d, era });
      return;
    }
    // find a lane ~120-170 m from the target, not on screen
    let spot = null;
    for (let tries = 0; tries < 30 && !spot; tries++) {
      const a = this.rng.range(0, Math.PI * 2), r = this.rng.range(110, 160);
      const x = target.x + Math.cos(a) * r, z = target.z + Math.sin(a) * r;
      const cc = chunkCoord(x, z);
      const ec = G.chunks.eraChunk(cc.ci, cc.cj, era);
      if (!ec || !ec.lanes.length) continue;
      const lane = ec.lanes[Math.floor(this.rng.next() * ec.lanes.length)];
      if (lane.deck) continue;
      const sx = (lane.ax + lane.bx) / 2, sz = (lane.az + lane.bz) / 2;
      const fwd = new THREE.Vector3(); G.camera.getWorldDirection(fwd);
      const tc = new THREE.Vector3(sx - G.camera.position.x, 0, sz - G.camera.position.z);
      if (tc.dot(fwd) > 0 && tc.length() < 120) continue;
      spot = { x: sx, z: sz };
    }
    if (!spot) {
      // on foot from out of sight
      const a = this.rng.range(0, Math.PI * 2);
      this._officer(era, p.x + Math.cos(a) * 70, p.z + Math.sin(a) * 70);
      return;
    }
    const type = era === 0 ? 'cop' : era === 1 ? 'interceptor' : this.rng.chance(0.5) ? 'buggy' : 'rattruck';
    const v = G.vehicles.add(type, spot.x, spot.z, Math.atan2(target.x - spot.x, target.z - spot.z), { driver: 'ai' });
    v.siren = era < 2;
    v.crew = lvl >= 4 ? 3 : 2;
    v.ai = {
      pursuit: true,
      stuck: 0,
      custom: (veh, dt) => this._driveUnit(veh, dt, era),
    };
    this.units.push({ kind: 'car', ref: v, era });
  }

  _driveUnit(v, dt, era) {
    const pl = G.player;
    const chasing = pl.vehicle && this.seen(era);
    const tgt = chasing ? pl.vehicle.pos : this.lastKnown[era];
    const dx = tgt.x - v.pos.x, dz = tgt.z - v.pos.z;
    const dist = Math.hypot(dx, dz);
    const err = wrapAngle(Math.atan2(dx, dz) - v.yaw);
    v.steer = clamp(err * 1.6, -0.6, 0.6) * (v.speed < 0 ? -1 : 1);
    let want = chasing ? Math.min(v.t.top, 12 + dist * 0.6) : dist > 40 ? 20 : Math.max(0, dist - 10) * 0.8;
    if (Math.abs(err) > 1.2 && dist > 10) want = Math.min(want, 8);
    v.speed += (want > v.speed ? v.t.power * 0.8 : -16) * dt;
    if (v.speed > want + 1) v.speed = Math.max(want, v.speed - 16 * dt);
    // unstick: reverse briefly
    if (Math.abs(v.speed) < 1 && want > 3) {
      v.ai.stuck += dt;
      if (v.ai.stuck > 2.5) { v.speed = -6; v.ai.stuck = -1.2; }
    }
    // arrived (or the chase ended): crew bails out and searches on foot
    if ((!chasing && dist < 16) || (chasing && dist < 8 && v.speed < 3) || v.ai.stuck > 8) {
      v.ai = null;
      v.driver = null;
      v.siren = false;
      const n = v.crew || 2;
      for (let i = 0; i < n; i++) {
        const side = i % 2 ? 1 : -1;
        this._officer(era, v.pos.x + Math.cos(v.yaw) * side * 2, v.pos.z - Math.sin(v.yaw) * side * 2, this.lastKnown[era]);
      }
    }
  }

  _officer(era, x, z, know = null) {
    const lvl = this.level(era);
    const arch = era === 0 ? (lvl >= 4 ? 'swat' : this.rng.chance(0.3) ? 'swat' : 'cop') : era === 1 ? 'enforcer' : this.rng.chance(0.5) ? 'raider' : 'scav';
    const n = G.combat.spawnEnemy(x, z, era, arch, { onlyWhenWanted: true, role: era === 2 ? 'enemy' : 'cop' });
    if (!n) return;
    n.ai.state = 'investigate';
    n.ai.lastKnown.copy(know || this.lastKnown[era]);
    n.ai.alert = 0.6;
    this.units.push({ kind: 'officer', ref: n, era });
  }
}
