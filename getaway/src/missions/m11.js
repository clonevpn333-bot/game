// GETAWAY! — Mission 11: HELICOPTER PROBLEM
// The ledger names a courier carrying Halcyon's backup drive. Ambush him downtown, chase his SUV to the park
// helipad, watch him lift off — then steal the second chopper and hunt him through the towers past his escorts.
// Shoot him down, set down at the wreck, grab the case under fire, and fly it to the hills before Port Sol PD
// and one more gunship take it back.
import * as THREE from 'three';
import { G } from '../core/context.js';
import { clamp, rand, damp, dampAngle } from '../core/utils.js';
import { V3, baseSetup, playerIn, RouteAI, roadRoute, tickAIs, watchDistance } from './helpers.js';
import { Aircraft, Gunship, heliMesh, board, unboard, FlightHUD } from './air.js';
import { nearestNode } from '../police/police.js';

const PAD = V3(60, 0, -200), HILLS = V3(0, 0, -950);
const FLEE = [[60, 70, -330], [180, 80, -160], [260, 60, 40], [120, 90, 160], [-120, 70, 120], [-220, 60, -60], [-120, 80, -260], [60, 70, -330]];
class Courier { // fleeing chopper: follows a loop through the towers, faster when you're close
  constructor(pos) { const m = heliMesh(0xe8e8e8, 0x15171b); this.m = m; this.g = m.g; G.scene.add(this.g); this.pos = pos.clone(); this.vel = V3(0, 0, 0); this.yaw = 0; this.i = 0; this.hp = this.maxHp = 520; this.alive = true;
    this.sphere = G.combat.addSphere({ pos: this.pos, r: 4, team: 'halcyon', alive: () => this.alive, hit: (d, p, s, k) => this.damage(k === 'rocket' ? d : d * 0.3, p) }); this.snd = G.audio && G.audio.createLoop('rotor', { ref: 50, wet: 0.3 }); }
  damage(d, p) { if (!this.alive) return; this.hp -= d; if (G.fx && p) G.fx.spark(p, V3(0, 1, 0), 5, 6); if (this.hp <= 0) { this.alive = false; G.emit('explosion', this.pos.clone(), 1, 'heli', null); if (G.stunts) G.stunts.award('COURIER DOWN', 1200); } }
  update(dt, chaser) {
    if (!this.alive) { if (!this.fallTo) { const n = nearestNode(G.world.graph, this.pos.x, this.pos.z); this.fallTo = n ? V3(n.x, 0, n.z) : this.pos.clone(); } // spiral down onto the street, never onto a tower roof
      this.vel.x = damp(this.vel.x, (this.fallTo.x - this.pos.x) * 0.6, 2, dt); this.vel.z = damp(this.vel.z, (this.fallTo.z - this.pos.z) * 0.6, 2, dt); this.vel.y -= 12 * dt; this.pos.addScaledVector(this.vel, dt); this.yaw += dt * 5; if (G.fx) { G.fx.fire(this.pos, 1.3); G.fx.smokePuff(this.pos, { size: 2, life: 2.5, color: 0.15, alpha: 0.5 }); }
      const g = G.world.static.groundAt(this.pos.x, this.pos.z, this.pos.y + 1, 0).h; if (this.pos.y < g + 1.2) { this.pos.y = g + 0.4; if (!this.down) { this.down = true; G.emit('explosion', this.pos.clone(), 2, 'heli', null); } } this.sync(dt); return; }
    const [x, h, z] = FLEE[this.i]; const gy = G.world.static.groundAt(x, z, 600, 0).h; const tgt = V3(x, Math.max(gy, 0) + h * 0.6 + 20, z);
    if (this.pos.distanceTo(tgt) < 25) this.i = (this.i + 1) % FLEE.length;
    const sp = chaser && chaser.distanceTo(this.pos) < 90 ? 34 : 24; const want = tgt.sub(this.pos).setLength(sp);
    this.vel.lerp(want, clamp(dt * 1.2, 0, 1)); this.pos.addScaledVector(this.vel, dt); this.yaw = dampAngle(this.yaw, Math.atan2(this.vel.x, this.vel.z), 2, dt); this.sync(dt);
  }
  sync(dt) { this.g.position.copy(this.pos); this.g.rotation.set(this.alive ? 0.12 : 0.5, this.yaw, this.alive ? 0 : 0.6, 'YXZ'); this.m.rotor.rotation.y += dt * 40; this.m.tr.rotation.x += dt * 50; if (this.snd) this.snd.update(this.pos, this.alive ? 0.9 : 0.4, 17); }
  dispose() { G.scene.remove(this.g); G.combat.removeSphere(this.sphere); if (this.snd) this.snd.dispose(); }
}
function setup(m) {
  baseSetup(m, { hour: 16.8, weather: 'clear', tier: 2, maxStars: 4, dmg: 0.55, acc: 0.55, weapons: ['smg', 'rifle'] });
  G.police.unitCap = 5; m.ents.offs.push(() => { G.police.unitCap = 0; }); G.traffic.populate(); G.peds.populate();
}
// the getaway chopper you'll steal: parked on the park lawn until boarded
function parkedHeli(m) {
  const pl = new Aircraft('heli', { pos: PAD.clone().add(V3(-14, 0, 6)), yaw: 0, color: 0x2c3e50, accent: 0xf1c40f }); pl.pos.y = G.world.static.groundAt(pl.pos.x, pl.pos.z, 50, 0).h + pl.gear; pl.sync();
  m.vars.heli = pl; m.track({ dispose: () => { pl.dispose(); if (G.player.riding === pl) unboard(); } });
  const up = m.r.flow.game.addUpdater((dt) => { if (G.mission !== m.r || G.paused) return; const mine = G.player.riding === pl; pl.update(dt, mine && !m.r.cine ? G.input : null); if (mine) FlightHUD.update(); }); m.ents.offs.push(up);
  m.on('aircraftDown', () => m.fail('THE CHOPPER WENT DOWN')); return pl;
}
async function boardWhenNear(m, pl, text) {
  const mk = m.marker(pl.pos.clone().setY(pl.pos.y - pl.gear), { r: 3, h: 6, color: 0x46f0ff }); m.objective(text, 'PRESS E AT THE CHOPPER');
  await m.until(() => { const P = G.player; const near = !P.riding && !P.vehicle && Math.hypot(P.pos.x - pl.pos.x, P.pos.z - pl.pos.z) < 5; G.hud.promptOverride = near ? '<kbd>E</kbd> Take the chopper' : null; return near && G.input.pressed('interact'); });
  G.hud.promptOverride = null; m.unmark(mk); board(pl);
}

async function cp0(m) {
  setup(m); G.player.teleport(-60, 0.2, -110, Math.PI); m.music('skyline', 3);
  m.r.flow.showIntro(m.def); m.lock(true);
  await m.cine({ dur: 5, fov: 44, pos: (k) => V3(-90 + k * 50, 30 - k * 20, -60 - k * 30), look: () => V3(-50, 1, -150) });
  m.r.flow.hideIntro(); m.lock(false);
  m.say('JUNO', 'Courier\'s convoy turns onto your street in ten seconds. White SUV in the middle. Everybody else is a problem.');
  const suv = m.vehicle('suv', { x: -100, z: -205, yaw: Math.PI / 2, color: 0xf2f2f2 }); m.vars.suv = suv; suv.armor = 3;
  const guards = []; for (const [x, z] of [[-70, -200], [-60, -193], [-40, -207], [-30, -195], [-50, -212]]) guards.push(m.npc('halcyon', x, 0.2, z, Math.PI, { role: rand(0, 1) < 0.5 ? 'flank' : 'hold', acc: 0.45 }));
  m.objective('AMBUSH THE CONVOY', 'TAKE OUT THE COURIER\'S GUARDS (0/5)');
  const off = m.r.flow.game.addUpdater(() => { const n = guards.filter((q) => !q.alive).length; G.hud.objective('AMBUSH THE CONVOY', `TAKE OUT THE COURIER'S GUARDS (${n}/5)`); }); m.ents.offs.push(off);
  await m.until(() => guards.filter((q) => !q.alive).length >= 4, { timeout: 180 }); off();
  m.say('DEZ', 'The SUV\'s bolting — he\'s heading for the park. There\'s a muscle car right behind you, TAKE IT.');
}
async function cp1(m, fresh) {
  if (fresh) { setup(m); G.player.teleport(-55, 0.2, -190, Math.PI); m.music('skyline', 4); }
  const car = m.vehicle('muscle', { x: G.player.pos.x + 3, z: G.player.pos.z, yaw: Math.PI / 2, color: 0x27ae60 });
  const suv = m.vars.suv && !m.vars.suv.removed ? m.vars.suv : m.vehicle('suv', { x: -60, z: -205, yaw: Math.PI / 2, color: 0xf2f2f2 });
  const ai = new RouteAI(suv, roadRoute(suv.pos.x, suv.pos.z, PAD.x, PAD.z).concat([PAD.clone()]), { speed: () => (G.player.vehicle ? 26 : 9) }); ai.hostile = true; tickAIs(m, [ai]); G.police.setStars(2);
  m.objective('CHASE THE COURIER', 'DON\'T LOSE THE WHITE SUV'); const b = m.blip(() => suv.pos, { color: '#ff3b2f', size: 7, waypoint: true });
  const stop = watchDistance(m, () => (G.player.vehicle ? suv.pos : null), 230, 12, 'THE COURIER GOT AWAY');
  await m.until(() => ai.done || suv.pos.distanceTo(PAD) < 40, { timeout: 200 }); stop(); m.unblip(b);
}
async function cp2(m, fresh) {
  if (fresh) { setup(m); const c = m.vehicle('muscle', { x: PAD.x - 40, z: PAD.z - 40, yaw: 0.6, color: 0x27ae60 }); playerIn(c); m.music('skyline', 4); G.police.setStars(2); }
  // he lifts off from the lawn; the second chopper is yours
  const cour = new Courier(PAD.clone().add(V3(10, 6, 0))); m.vars.cour = cour; m.track({ dispose: () => cour.dispose() });
  const pl = parkedHeli(m); const escorts = [new Gunship(V3(200, 60, -60), { hp: 360, aggro: 0.9 }), new Gunship(V3(-200, 60, -300), { hp: 360, aggro: 0.9 })]; m.vars.escorts = escorts; m.track({ dispose: () => escorts.forEach((e) => e.dispose()) });
  let armed = false; const up = m.r.flow.game.addUpdater((dt) => { if (G.mission !== m.r || G.paused) return; cour.update(dt, pl.pos); if (armed) for (const e of escorts) if (!e.gone) e.update(dt, G.player.riding ? pl.pos : G.player.pos); }); m.ents.offs.push(up);
  m.say('GRAMPS', 'He\'s got a CHOPPER. …So do we, apparently. Is that thing just parked there?');
  await boardWhenNear(m, pl, 'STEAL THE CHOPPER'); G.police.setStars(3); armed = true;
  m.say('JUNO', 'W/S forward-back, A/D turn, SPACE climb, C descend, SHIFT for speed. CLICK guns, RIGHT-CLICK rockets. Don\'t hit a building.');
  m.objective('SHOOT DOWN THE COURIER', 'HE\'S RUNNING THROUGH THE TOWERS — ESCORTS INBOUND');
  const b = m.blip(() => (cour.alive ? cour.pos : null), { color: '#ff3b2f', size: 8, waypoint: true }); const eb = escorts.map((e) => m.blip(() => (e.alive ? e.pos : null), { color: '#ff7b5a', size: 5 }));
  await m.until(() => !cour.alive, { timeout: 360 }); if (cour.alive) cour.damage(1e6, cour.pos.clone()); m.unblip(b); // never stalls eb.forEach((x) => m.unblip(x)); m.slowmo(1.5, 0.3);
  if (!cour.alive) m.say('DEZ', 'He\'s down! The case survived the crash — land next to the wreck and GRAB IT.');
}
async function cp3(m, fresh) {
  let pl = m.vars.heli, cour = m.vars.cour;
  if (fresh || !pl || pl.disposed) { setup(m); pl = parkedHeli(m); cour = new Courier(V3(120, 3, -120)); cour.alive = false; cour.down = true; cour.pos.y = G.world.static.groundAt(120, -120, 50, 0).h + 0.4; cour.sync(0); m.vars.cour = cour; m.track({ dispose: () => cour.dispose() }); board(pl); pl.pos.set(80, 40, -140); pl.grounded = false; m.music('skyline', 4); }
  await m.until(() => cour.down, { timeout: 15 }); // wait for the wreck to hit the ground
  const wreck = cour.pos.clone(); const gy = G.world.static.groundAt(wreck.x, wreck.z, wreck.y + 2, 0).h;
  const caseP = V3(wreck.x + 4, gy + 0.2, wreck.z + 3); m.vars.caseP = caseP; const mk = m.marker(caseP, { r: 2, h: 5 }); const bl = m.blip(caseP, { color: '#ffd36b', size: 7, waypoint: true });
  m.objective('LAND AT THE WRECK', 'SET DOWN NEAR IT (C TO DESCEND) · F TO GET OUT');
  const exitOff = m.r.flow.game.addUpdater(() => { const P = G.player; if (P.riding === pl && pl.grounded && G.input.pressed('enter')) unboard(pl.pos.clone().add(V3(Math.cos(pl.yaw) * 3, -pl.gear + 0.3, -Math.sin(pl.yaw) * 3))); }); m.ents.offs.push(exitOff);
  await m.until(() => !G.player.riding && Math.hypot(G.player.pos.x - caseP.x, G.player.pos.z - caseP.z) < 40);
  m.objective('GRAB THE CASE', 'PRESS E AT THE CASE — COPS INCOMING'); G.police.setStars(3); G.police.minStars = 3;
  await m.until(() => { const near = Math.hypot(G.player.pos.x - caseP.x, G.player.pos.z - caseP.z) < 2.5 && !G.player.riding; G.hud.promptOverride = near ? '<kbd>E</kbd> Grab the case' : null; return near && G.input.pressed('interact'); });
  G.hud.promptOverride = null; m.unmark(mk); m.unblip(bl); G.player.carrying = { bag: true }; if (G.stunts) G.stunts.award('GOT THE DRIVE', 800);
  m.say('JUNO', 'Gunship on approach, police converging. Back in the chopper and get to the hills!');
  const gs = new Gunship(V3(-200, 70, -400), { hp: 420, aggro: 1.2 }); m.track({ dispose: () => gs.dispose() });
  const gu = m.r.flow.game.addUpdater((dt) => { if (G.mission === m.r && !gs.gone) gs.update(dt, G.player.riding ? pl.pos : G.player.pos); }); m.ents.offs.push(gu);
  const mk2 = m.marker(pl.pos.clone().setY(pl.pos.y - pl.gear), { r: 3, h: 6, color: 0x46f0ff });
  await m.until(() => { const P = G.player; const near = !P.riding && Math.hypot(P.pos.x - pl.pos.x, P.pos.z - pl.pos.z) < 5; G.hud.promptOverride = near ? '<kbd>E</kbd> Back in the chopper' : null; if (near && G.input.pressed('interact')) { G.hud.promptOverride = null; board(pl); } return P.riding === pl; });
  m.unmark(mk2); G.police.minStars = 0;
  const hy = G.world.static.groundAt(HILLS.x, HILLS.z, 600, 0).h; const pad = V3(HILLS.x, hy, HILLS.z);
  m.objective('FLY TO THE HILLS', 'LAND ON THE RIDGE · THE GUNSHIP WON\'T FOLLOW PAST THE CITY'); const pm = m.marker(pad, { r: 10, h: 40 }); const pb = m.blip(pad, { color: '#ffd36b', size: 8, waypoint: true });
  await m.until(() => Math.hypot(pl.pos.x - pad.x, pl.pos.z - pad.z) < 22 && pl.pos.y - pad.y < 6); m.unmark(pm); m.unblip(pb);
  G.police.reset(); m.intensity(1); m.lock(true);
  const p = m.cine({ dur: 12, fov: 42, pos: (k) => pad.clone().add(V3(40 - k * 25, 12 + k * 4, 30 + k * 10)), look: () => V3(0, 30, -200) });
  await m.sayWait('GRAMPS', 'Look at that. Whole city on fire, and none of it\'s our fault for once.', 3.4);
  await m.sayWait('DEZ', 'The drive is Halcyon\'s backup. Every deal, every bribe. Their villa in Italy is the only other copy.', 3.8);
  await m.sayWait('JUNO', 'Then we go to Italy. I\'m booking a ferry. Nobody is flying anything.', 3.0);
  await p; m.lock(false);
}
export const M11 = {
  id: 'm11', num: 11, act: 1, title: 'HELICOPTER PROBLEM', music: 'skyline', par: 720,
  desc: 'Street ambush, car chase to a helipad, steal a chopper, hunt the courier through the towers, land at the wreck under fire, fly to the hills.',
  unlocks: [{ vehicle: 'muscle' }], deathText: 'KIT WENT DOWN', checkpoints: [cp0, cp1, cp2, cp3],
};
