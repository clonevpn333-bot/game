// Systemic world events and weather: the city keeps living without the player.
import * as THREE from 'three';
import { G } from '../core/state.js';
import { RNG, clamp, damp } from '../core/mathx.js';
import { chunkCoord, BRIDGES } from '../world/layout.js';
import { GU } from '../world/materials.js';
import { ERA_DEF } from '../world/eras.js';

export class Weather {
  constructor(scene) {
    this.rain = 0; this.target = 0; this.storm = 0; this.timer = 30;
    this.wet = false;
    const N = 4000;
    const pos = new Float32Array(N * 6);
    for (let i = 0; i < N; i++) {
      const x = (Math.random() - 0.5) * 60, y = Math.random() * 30, z = (Math.random() - 0.5) * 60;
      pos.set([x, y, z, x, y - 0.6, z], i * 6);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.mat = new THREE.LineBasicMaterial({ color: 0x9ab0c8, transparent: true, opacity: 0, depthWrite: false });
    this.lines = new THREE.LineSegments(g, this.mat);
    this.lines.frustumCulled = false;
    scene.add(this.lines);
    this.pos = pos;
    this.lightT = 5;
  }
  update(dt) {
    this.timer -= dt;
    if (this.timer <= 0) {
      const w = ERA_DEF[G.era].weather;
      const r = Math.random();
      this.target = r < w.storm ? 1 : r < w.rain ? 0.6 : 0;
      this.timer = 60 + Math.random() * 120;
    }
    this.rain = damp(this.rain, this.target, 0.25, dt);
    this.storm = this.target > 0.9 ? damp(this.storm, 1, 0.3, dt) : damp(this.storm, 0, 0.3, dt);
    GU.uWet.value = damp(GU.uWet.value, this.rain > 0.15 ? 1 : 0, this.rain > 0.15 ? 0.15 : 0.05, dt);
    this.wet = GU.uWet.value > 0.4;
    G.sky.weatherRain = this.rain;
    G.sky.weatherCloud = 0.35 + this.rain * 0.6;
    G.sky.storm = this.storm * 0.8;
    // rain streaks around the camera
    this.mat.opacity = this.rain * 0.35;
    this.lines.visible = this.rain > 0.02;
    if (this.lines.visible) {
      const c = G.camera.position;
      this.lines.position.set(Math.floor(c.x / 60) * 60, c.y - 12, Math.floor(c.z / 60) * 60);
      const p = this.pos;
      const fall = dt * 28;
      for (let i = 0; i < p.length; i += 6) {
        p[i + 1] -= fall; p[i + 4] -= fall;
        if (p[i + 1] < 0) { p[i + 1] += 30; p[i + 4] += 30; }
        // keep the column around the camera (wrap in a 60 m box)
        const wx = ((p[i] + c.x - this.lines.position.x) % 60 + 60) % 60 - 30;
        void wx;
      }
      this.lines.geometry.attributes.position.needsUpdate = true;
      this.lines.position.x = c.x; this.lines.position.z = c.z;
    }
    // lightning
    if (this.storm > 0.5) {
      this.lightT -= dt;
      if (this.lightT <= 0) {
        this.lightT = 4 + Math.random() * 10;
        G.sky.lightning = 1;
        setTimeout(() => G.audio.play('explosion', { x: G.camera.position.x + 200, y: 50, z: G.camera.position.z }), 600 + Math.random() * 1500);
      }
    }
    G.sky.lightning = Math.max(0, G.sky.lightning - dt * 5);
  }
}

export class WorldEvents {
  constructor() {
    this.t = 25;
    this.rng = new RNG(4321);
    this.active = [];
    this.bridgeKings = null;
  }

  update(dt) {
    this.t -= dt;
    if (this.t <= 0) {
      this.t = 35 + this.rng.next() * 50;
      this.trigger();
    }
    for (const e of this.active.slice()) {
      e.t += dt;
      if (e.update && e.update(dt)) this.active.splice(this.active.indexOf(e), 1);
      else if (e.t > 120) this.active.splice(this.active.indexOf(e), 1);
    }
    this._bridgeKings();
  }

  _spot(minR = 35, maxR = 80) {
    const p = G.player.pos;
    for (let i = 0; i < 20; i++) {
      const a = this.rng.range(0, Math.PI * 2), r = this.rng.range(minR, maxR);
      const x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r;
      const cc = chunkCoord(x, z);
      const ec = G.chunks.eraChunk(cc.ci, cc.cj, G.era);
      if (!ec || !ec.spawns.length) continue;
      const s = ec.spawns[Math.floor(this.rng.next() * ec.spawns.length)];
      return { x: s.x, z: s.z, ec };
    }
    return null;
  }

  trigger(kind = null) {
    const era = G.era;
    const pool = era === 0 ? ['argument', 'mugging', 'chase', 'breakdown', 'fight']
      : era === 1 ? ['chase', 'argument', 'raid', 'breakdown', 'drones']
        : ['machines', 'ambush', 'argument', 'machines'];
    kind = kind || this.rng.pick(pool);
    const s = this._spot();
    if (!s) return;
    const C = G.crowd;
    if (kind === 'argument' || kind === 'fight') {
      const a = C.spawn(s.x, s.z, era, { noRing: true, state: 'talk' });
      const b = C.spawn(s.x + 1.2, s.z + 0.4, era, { noRing: true, state: 'talk' });
      if (!a || !b) return;
      a.talkPartner = b; b.talkPartner = a;
      this.active.push({ t: 0, update: () => {
        if (this.active.t > 0) return false;
        if (a.stateT > 8 && a.state === 'talk') {
          // escalate: one shoves the other, both flee in opposite directions
          G.audio.play('punch', a.pos);
          G.crowd.damage(b, kind === 'fight' ? 20 : 2, a.pos, 'melee');
          G.events.emit('noise', a.pos, 20, 'assault');
          a.fear = 1; a.fearPos.copy(b.pos); C.setState(a, 'flee');
          return true;
        }
        return false;
      } });
    } else if (kind === 'mugging') {
      const v = C.spawn(s.x, s.z, era, { noRing: true, state: 'flee' });
      const m = G.combat.spawnEnemy(s.x - 4, s.z - 2, era, 'thug', { hostile: false });
      if (!v || !m) return;
      v.fear = 1.5; v.fearPos.copy(m.pos);
      G.audio.play('scream', v.pos);
      G.events.emit('noise', v.pos, 30, 'assault');
      this.active.push({ t: 0, update: () => {
        if (!m.alive || m.state === 'dead') { G.progress.addXP(15); return true; }
        // the mugger chases the victim; turns on the player if attacked
        if (!m.ai.hostile) { m.ai.state = 'idle'; m.yaw = Math.atan2(v.pos.x - m.pos.x, v.pos.z - m.pos.z); m.speed = 4.6; }
        return v.pos.distanceTo(G.player.pos) > 140;
      } });
    } else if (kind === 'chase') {
      const lane = s.ec.lanes[0];
      if (!lane) return;
      const runner = G.vehicles.add(era === 0 ? 'sedan' : 'sport', lane.ax, lane.az, Math.atan2(lane.bx - lane.ax, lane.bz - lane.az), { driver: 'ai' });
      runner.ai = { lane, target: 24, wait: 0, panic: 99 };
      const cop = G.vehicles.add(era === 0 ? 'cop' : 'interceptor', lane.ax - Math.sin(runner.yaw) * 14, lane.az - Math.cos(runner.yaw) * 14, runner.yaw, { driver: 'ai' });
      cop.siren = true;
      cop.ai = { stuck: 0, custom: (v, dt) => {
        const dx = runner.pos.x - v.pos.x, dz = runner.pos.z - v.pos.z;
        const err = Math.atan2(dx, dz) - v.yaw;
        v.steer = clamp(Math.atan2(Math.sin(err), Math.cos(err)) * 1.6, -0.6, 0.6);
        v.speed += (Math.hypot(dx, dz) > 8 ? v.t.power : -10) * dt;
        v.speed = Math.min(v.speed, 26);
      } };
      G.hud.toast(era === 0 ? 'Police chase nearby' : 'AEGIS pursuit in progress', 'info', 2);
    } else if (kind === 'breakdown') {
      const lane = s.ec.lanes[0];
      if (!lane) return;
      const v = G.vehicles.add(this.rng.pick(era === 0 ? ['sedan', 'van', 'pickup'] : ['pod', 'sport']), (lane.ax + lane.bx) / 2, (lane.az + lane.bz) / 2, Math.atan2(lane.bx - lane.ax, lane.bz - lane.az), { parked: true });
      v.health = 20;
      const d = C.spawn(v.pos.x + 2, v.pos.z + 1, era, { noRing: true, state: 'idle' });
      if (d) d.home = { x: d.pos.x, z: d.pos.z };
    } else if (kind === 'raid' || kind === 'drones') {
      for (let i = 0; i < 2; i++) {
        const d = G.combat.spawnDrone(s.x + i * 4, 18, s.z, era, { onlyWhenWanted: true });
        d.home.set(s.x, 14, s.z);
      }
      if (kind === 'raid') for (let i = 0; i < 2; i++) G.combat.spawnEnemy(s.x + i * 2, s.z + 2, era, 'enforcer', { onlyWhenWanted: true, role: 'cop' });
    } else if (kind === 'machines') {
      // machine sentinels hunting survivors
      for (let i = 0; i < 2; i++) G.combat.spawnDrone(s.x + i * 5, 10, s.z, 2, { health: 70 });
      for (let i = 0; i < 3; i++) { const n = C.spawn(s.x + 6 + i, s.z + 4, 2, { noRing: true, state: 'flee' }); if (n) { n.fear = 1.5; n.fearPos.set(s.x, 0, s.z); } }
      G.hud.toast('Machine sentinels are hunting nearby', 'warn', 2.5);
    } else if (kind === 'ambush') {
      for (let i = 0; i < 3; i++) G.combat.spawnEnemy(s.x + i * 3, s.z + this.rng.range(-3, 3), 2, i === 0 ? 'raider' : 'scav', {});
    }
  }

  // The Bridge Kings camp on Kessler Bridge — only if the bridge still stands
  _bridgeKings() {
    if (G.era !== 2) { this.bridgeKings = null; return; }
    if (G.chronicle.has('kessler_bridge.destroyed', 2)) return;
    const z = BRIDGES.kessler.z;
    const d = Math.hypot(G.player.pos.x - 480, G.player.pos.z - z);
    if (d < 110 && !this.bridgeKings) {
      this.bridgeKings = [];
      for (let i = 0; i < 5; i++) {
        const n = G.combat.spawnEnemy(430 + i * 25, z + 3, 2, i % 2 ? 'raider' : 'scav', { colors: { top: new THREE.Color('#6a1a1a') } });
        if (n) this.bridgeKings.push(n);
      }
      G.hud.toast('BRIDGE KINGS territory — pay the toll or bleed', 'warn', 3);
    }
  }
}
