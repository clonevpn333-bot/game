// GETAWAY! — shared mission building blocks
import * as THREE from 'three';
import { G } from '../core/context.js';
import { driveTo } from '../vehicles/traffic.js';
import { nearestNode, astar } from '../police/police.js';

export const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

// follows a list of waypoints at a target speed (getaway drivers, convoys, couriers)
export class RouteAI {
  constructor(v, pts, { speed = 24, loop = false, aggressive = true, onDone = null } = {}) { this.v = v; this.pts = pts; this.i = 0; this.speed = speed; this.loop = loop; this.aggr = aggressive; this.onDone = onDone; this.kind = 'route'; this.done = false; v.ai = this; v.keep = true; v.hasDriver = true; }
  update(dt) {
    const v = this.v; if (v.ai !== this) return; // player (or someone else) took the wheel
    if (v.dead || v.mode !== 'drive' || this.done) { v.ctrl.throttle = 0; v.ctrl.brake = 1; return; }
    let p = this.pts[this.i]; if (!p) return;
    if (Math.hypot(p.x - v.pos.x, p.z - v.pos.z) < (this.speed > 20 ? 12 : 7)) { this.i++; if (this.i >= this.pts.length) { if (this.loop) this.i = 0; else { this.done = true; if (this.onDone) this.onDone(); return; } } p = this.pts[this.i]; }
    driveTo(v, p.x, p.z, typeof this.speed === 'function' ? this.speed() : this.speed, { aggressive: this.aggr, reverseOk: true });
    if (v.speed < 1 && v.ctrl.throttle > 0.5) { this.stuck = (this.stuck || 0) + dt; if (this.stuck > 1.5) { v.ctrl.throttle = 0; v.ctrl.brake = 1; v.ctrl.steer = 1; if (this.stuck > 2.6) this.stuck = 0; } } else this.stuck = 0;
  }
}
// road route between two points as world-space waypoints (follows the street graph)
export function roadRoute(ax, az, bx, bz) {
  const g = G.world.graph; const path = astar(g, nearestNode(g, ax, az), nearestNode(g, bx, bz)) || [];
  const pts = []; for (let i = 0; i < path.length; i++) { const n = path[i]; if (i > 0) { const prev = path[i - 1]; const e = prev.out.map((id) => g.edges[id]).find((e2) => e2.b === n.id); if (e && e.pts.length > 2) for (let k = 1; k < e.pts.length - 1; k++) pts.push(V3(e.pts[k].x, e.pts[k].y, e.pts[k].z)); } pts.push(V3(n.x, n.y, n.z)); }
  pts.push(V3(bx, 0, bz)); return pts;
}
// installs an updater that ticks AIs owned by the mission
export function tickAIs(m, list) { const off = m.r.flow.game.addUpdater((dt) => { if (G.mission === m.r && !G.paused) for (const a of list) a.update(dt); }); m.ents.offs.push(off); return list; }

export function baseSetup(m, { hour = 12, weather = 'clear', tier = 1, maxStars = 4, dmg = 0.6, acc = 0.65, heli = false, weapons = ['pistol'] } = {}) {
  const P = G.player; P.revive(); P.health = 100; P.armor = 100;
  for (const w of ['pistol', ...weapons]) { if (!P.inv[w]) P.inv[w] = { mag: 0, res: 0 }; const W = { pistol: 15, smg: 32, shotgun: 6, rifle: 30, heavy: 4 }[w]; P.inv[w].mag = W; P.inv[w].res = Math.max(P.inv[w].res, W * 4); }
  P.setWeapon(weapons[weapons.length - 1] || 'pistol');
  G.dmgScale = dmg; G.enemyAcc = acc; m.ents.offs.push(() => { G.dmgScale = 1; G.enemyAcc = 1; });
  G.sky.setWeather(weather, true); G.sky.dayScale = 0.2 / 60; if (!m.vars.hourSet) { G.sky.setTime(hour); m.vars.hourSet = true; }
  G.police.reset(); G.police.setTier(tier); G.police.maxStars = maxStars; G.police.tactics = { pit: true, roadblocks: true, heli };
}
export function playerIn(v) { G.player.teleport(v.pos.x, v.pos.y, v.pos.z, v.yaw); G.player.enterVehicle(v); G.cam.yaw = v.yaw; }

export async function loseCops(m, text = 'LOSE THE COPS', sub = 'BREAK LINE OF SIGHT · GET OUT OF THE SEARCH ZONE') {
  G.police.minStars = 0; if (G.police.stars === 0) return; m.objective(text, sub);
  let escaped = false; m.on('escaped', () => { escaped = true; }); await m.until(() => escaped || G.police.stars === 0);
}
export async function hideoutEnding(m, lines, cineDur = 14) {
  const h = G.world.landmarks.hideout; const front = V3(h.front.x, 0.15, h.front.z);
  m.objective('GET TO DEZ\'S GARAGE', 'IRONSIDE DOCKS'); await m.goTo(front, null, '', { r: 6, slow: true });
  h.doorBox.disabled = true; for (let i = 0; i <= 30; i++) { h.door.position.y = 3.15 + i * 0.2; await m.wait(0.03); }
  m.objective('PULL IN', ''); await m.goTo(V3(550, 0.15, 150), null, '', { r: 4.5, slow: true });
  m.lock(true); h.doorBox.disabled = false; for (let i = 30; i >= 0; i--) { h.door.position.y = 3.15 + i * 0.2; await m.wait(0.02); }
  G.police.reset(); m.intensity(1);
  const p = m.cine({ dur: cineDur, fov: 45, pos: (k) => V3(540 + k * 4, 2.6, 166 - k * 2), look: () => V3(550, 1.0, 150) });
  for (const [who, text, d] of lines) await m.sayWait(who, text, d);
  await p; m.lock(false);
}
// hard fail if a target gets away
export function watchDistance(m, getTarget, maxD, secs, reason) {
  let t = 0; const off = m.r.flow.game.addUpdater((dt) => { if (G.mission !== m.r || G.paused) return; const tg = getTarget(); if (!tg) return; const d = tg.distanceTo(G.player.focus); if (d > maxD) { t += dt; G.hud.warnOverride = `TARGET GETTING AWAY! ${Math.max(0, secs - t).toFixed(1)}`; if (t > secs) m.fail(reason); } else { if (t > 0) G.hud.warnOverride = null; t = 0; } });
  m.ents.offs.push(off); return () => { off(); G.hud.warnOverride = null; };
}
