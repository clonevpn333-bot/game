// GETAWAY! — mission runtime. Missions are async scripts split into checkpoints; every wait/until is
// cancellable so a retry can restart instantly from the last checkpoint with its own state setup.
import * as THREE from 'three';
import { G } from '../core/context.js';
import { warmNew } from '../core/warm.js';
import { clamp, fmtTime } from '../core/utils.js';

class Abort extends Error {}
export function makeMarkerMesh(r = 4, color = 0xffd36b, h = 30) {
  const g = new THREE.Group(); const beam = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 32, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); beam.position.y = h / 2; g.add(beam);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.12, 6, 48), new THREE.MeshBasicMaterial({ color, toneMapped: false })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.2; g.add(ring); return { g, ring };
}
export class MissionContext {
  constructor(runner, def) { this.r = runner; this.def = def; this.waiters = []; this.blips = []; this.markers = []; this.ents = { vehicles: [], npcs: [], meshes: [], timers: [], offs: [] }; this.vars = runner.vars; this.aborted = false; }
  _check() { if (this.aborted) throw new Abort(); }
  wait(sec) { this._check(); return new Promise((res, rej) => this.waiters.push({ t: sec, res, rej })); }
  until(fn, { timeout = Infinity, poll = 0 } = {}) { this._check(); if (fn()) return Promise.resolve(true); return new Promise((res, rej) => this.waiters.push({ fn, res, rej, timeout })); }
  race(fns) { return this.until(() => fns.findIndex((f) => f()) >= 0).then(() => fns.findIndex((f) => f())); }
  say(who, text, dur) { G.hud.say(who, text, dur); }
  async sayWait(who, text, dur) { const d = dur || clamp(1.6 + text.length * 0.055, 2, 6.5); this.say(who, text, d); await this.wait(d * 0.85); }
  objective(text, sub = '') { G.hud.objective(text, sub); this.r.stats.objectives++; if (G.music) G.music.stinger('objective'); }
  blip(pos, opts = {}) { const b = G.hud.addBlip({ pos, ...opts }); this.blips.push(b); if (opts.color === '#ffd36b' || opts.waypoint) G.hud.setWaypoint(pos, b); return b; }
  unblip(b) { G.hud.clearWaypoint(b); G.hud.removeBlip(b); const i = this.blips.indexOf(b); if (i >= 0) this.blips.splice(i, 1); }
  marker(pos, { r = 4, color = 0xffd36b, h = 30 } = {}) {
    const { g, ring } = makeMarkerMesh(r, color, h);
    g.position.copy(pos); G.scene.add(g); const m = { g, pos: pos.clone(), r, ring }; this.markers.push(m); return m;
  }
  unmark(m) { if (!m) return; G.scene.remove(m.g); const i = this.markers.indexOf(m); if (i >= 0) this.markers.splice(i, 1); }
  near(pos, r, who = null) { const p = who || G.player.focus; return Math.hypot(p.x - pos.x, p.z - pos.z) < r && Math.abs(p.y - pos.y) < Math.max(4, r); }
  async goTo(pos, text, sub = '', { r = 5, slow = false, onFoot = null } = {}) {
    if (text) this.objective(text, sub); const b = this.blip(pos, { color: '#ffd36b', size: 7 }); const m = this.marker(pos, { r });
    await this.until(() => this.near(pos, r) && (!slow || !G.player.vehicle || G.player.vehicle.speed < 8) && (onFoot === null || onFoot === !G.player.vehicle));
    this.unblip(b); this.unmark(m); if (G.audio) G.audio.ui('pickup');
  }
  vehicle(type, opts) { const v = G.vehicles.spawn(type, opts); v.keep = true; this.ents.vehicles.push(v); if (opts && opts.y === undefined) v.pos.y = G.world.static.groundAt(v.pos.x, v.pos.z, 50, 0).h; return v; }
  npc(kind, x, y, z, yaw, opts) { const n = G.npcs.spawn(kind, x, y, z, yaw, opts); n.keep = true; this.ents.npcs.push(n); return n; }
  track(obj) { this.ents.meshes.push(obj); return obj; }
  on(ev, fn) { const off = G.on(ev, fn); this.ents.offs.push(off); return off; }
  timer(sec, { label = '', failReason = 'Out of time' } = {}) { this.r.timerLeft = sec; this.r.timerFail = failReason; G.hud.setTimer(sec); }
  stopTimer() { this.r.timerLeft = null; G.hud.setTimer(null); }
  fail(reason) { this.r.fail(reason); }
  checkpoint(i) { this.r.cpReached = Math.max(this.r.cpReached, i); }
  music(id, intensity) { if (id) G.music.play(id, { intensity }); this.r.musicOverride = intensity ?? null; }
  intensity(i) { this.r.musicOverride = i; if (i !== null) G.music.setIntensity(i); }
  slowmo(d = 1.2, s = 0.3) { G.emit('slowmo', d, s); }
  cine(shot) { return new Promise((res) => { G.cam.play({ ...shot, onEnd: res }); this.r.cine = true; }).then(() => { this.r.cine = false; }); }
  lock(on) { G.player.controlsLocked = on; }
  cleanup() {
    for (const w of this.waiters) w.rej(new Abort()); this.waiters = [];
    for (const b of this.blips) G.hud.removeBlip(b); this.blips = []; G.hud.clearWaypoint(); for (const m of [...this.markers]) this.unmark(m);
    for (const v of this.ents.vehicles) if (!v.removed && v !== G.player.vehicle) G.vehicles.remove(v);
    for (const n of this.ents.npcs) { n.dispose(); const i = G.npcs.list.indexOf(n); if (i >= 0) G.npcs.list.splice(i, 1); }
    for (const o of this.ents.meshes) { if (o.dispose) o.dispose(); else if (o.parent) o.parent.remove(o); }
    for (const off of this.ents.offs) off();
    G.hud.setTimer(null); G.hud.clearObjective(); G.hud.promptOverride = null; G.hud.warnOverride = null; G.player.controlsLocked = false; G.cam.cine = null;
  }
  update(dt) {
    for (let i = this.waiters.length - 1; i >= 0; i--) {
      const w = this.waiters[i];
      if (w.fn) { let ok = false; try { ok = w.fn(); } catch (e) { console.error(e); } w.timeout -= dt; if (ok || w.timeout <= 0) { this.waiters.splice(i, 1); w.res(ok); } }
      else { w.t -= dt; if (w.t <= 0) { this.waiters.splice(i, 1); w.res(); } }
    }
    for (const m of this.markers) { m.ring.scale.setScalar(1 + Math.sin(G.time * 4) * 0.06); m.g.rotation.y += dt; }
  }
}

export class MissionRunner {
  constructor(flow) { this.flow = flow; this.ctx = null; this.def = null; this.active = false; this.vars = {}; }
  start(def, cp = 0) {
    if (this.ctx) this.abort(); this.def = def; this.active = true; this.failed = false; this.done = false; this.cpReached = cp; this.timerLeft = null; this.musicOverride = null;
    if (cp === 0 || !this.stats) { this.vars = cp === 0 ? {} : (this.vars || {}); this.stats = { time: 0, objectives: 0, kills: 0, shots: 0, hits: 0, damage: 0, retries: 0, startScore: 0 }; G.stunts.reset(); if (cp > 0) this.stats.retries++; } else this.stats.retries++;
    if (cp === 0) this.autoRetries = 0; const ctx = this.ctx = new MissionContext(this, def); ctx.vars = this.vars; G.mission = this;
    this._offs = [G.on('playerDied', () => this.fail(def.deathText || 'YOU WENT DOWN')), G.on('busted', () => this.fail('BUSTED')), G.on('npcDied', (n) => { if (n.team !== 'player') this.stats.kills++; }), G.on('playerDamaged', (d) => { this.stats.damage += d; })];
    const run = async () => {
      try {
        for (let i = cp; i < def.checkpoints.length; i++) { this.cpReached = Math.max(this.cpReached, i); const run = def.checkpoints[i](ctx, i === cp && cp > 0, i === cp); warmNew(); await run; }
        this.complete();
      } catch (e) { if (!(e instanceof Abort)) { console.error('mission error', e); // never leave the player stuck: restart this checkpoint (a few times)
          this.autoRetries = (this.autoRetries || 0) + 1; if (this.autoRetries <= 3 && this.active && this.ctx === ctx) { if (G.perf) G.perf.banner('Mission hiccup — restarting checkpoint', 2500); setTimeout(() => { if (this.ctx === ctx) this.retry(); }, 600); } } }
    };
    run();
  }
  update(dt) {
    if (!this.active || !this.ctx) return; this.stats.time += dt; this.ctx.update(dt); if (this.def.onUpdate) this.def.onUpdate(this.ctx);
    if (this.timerLeft !== null && this.timerLeft !== undefined) { this.timerLeft -= dt; G.hud.setTimer(Math.max(0, this.timerLeft)); if (this.timerLeft <= 10 && Math.floor(this.timerLeft) !== Math.floor(this.timerLeft + dt) && G.audio) G.audio.ui('beepUrgent'); if (this.timerLeft <= 0) { if (this.timerFail) { this.timerLeft = null; this.fail(this.timerFail); } else this.timerLeft = 0; } } // failReason null = a plain countdown
    // adaptive music
    if (this.musicOverride === null || this.musicOverride === undefined) { const s = G.police ? G.police.stars : 0; G.music.setIntensity(s >= 3 ? 4 : s >= 1 ? 3 : 2); }
    else G.music.setIntensity(this.musicOverride);
  }
  fail(reason) {
    if (!this.active || this.failed || this.done) return; this.failed = true; this.active = false; if (G.audio) G.audio.ui('fail'); if (G.music) G.music.stinger('fail');
    G.emit('slowmo', 1.5, 0.25); setTimeout(() => this.flow.missionFailed(reason), 1300);
  }
  complete() {
    if (this.done) return; this.done = true; this.active = false; const s = this.stats; const def = this.def;
    const style = G.stunts.score; const par = def.par || 480; const timeScore = clamp(1 - (s.time - par) / par, 0, 1.3);
    const score = Math.round(style + timeScore * 3000 + s.kills * 50 - s.retries * 250 + Math.max(0, 1000 - s.damage * 3));
    const grade = score > 6500 ? 'S' : score > 4800 ? 'A' : score > 3200 ? 'B' : score > 1800 ? 'C' : 'D';
    const rec = G.save.completed[def.id] || { plays: 0 }; const newBest = !rec.bestScore || score > rec.bestScore; const newTime = !rec.bestTime || s.time < rec.bestTime;
    G.save.completed[def.id] = { plays: (rec.plays || 0) + 1, bestScore: Math.max(score, rec.bestScore || 0), bestTime: Math.min(s.time, rec.bestTime || 1e9), grade: newBest ? grade : rec.grade || grade };
    if (def.unlocks) for (const u of def.unlocks) { if (u.vehicle && !G.save.unlockedVehicles.includes(u.vehicle)) G.save.unlockedVehicles.push(u.vehicle); if (u.track && !G.save.tracks.includes(u.track)) G.save.tracks.push(u.track); }
    G.save.lastMission = Math.max(G.save.lastMission, def.num); G.game.saveNow();
    if (G.music) G.music.stinger('complete');
    this.flow.missionComplete({ def, time: s.time, timeStr: fmtTime(s.time), score, style, grade, kills: s.kills, retries: s.retries, newBest, newTime, nearMiss: G.stunts.session.nearMiss, air: G.stunts.session.air, takedowns: G.stunts.session.takedowns });
  }
  abort() { if (this.ctx) { this.ctx.aborted = true; this.ctx.cleanup(); } this.ctx = null; this.active = false; if (this._offs) this._offs.forEach((f) => f()); G.mission = null; }
  retry() { const def = this.def, cp = this.cpReached; this.abort(); this.flow.prepareWorld(); this.start(def, cp); }
  restart() { const def = this.def; this.abort(); this.flow.prepareWorld(); this.start(def, 0); }
}
