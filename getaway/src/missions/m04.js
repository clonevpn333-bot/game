// GETAWAY! — Mission 04: ARMORED DELIVERY
// Rain. Tail Halcyon's armored truck through downtown in the Strada -> the Marrow crew ambushes the convoy ->
// wreck the Marrow cars + the last escort -> pull alongside and leap onto the moving truck -> drive the 9-ton
// truck through the police roadblock into the river tunnel -> kill-switch countdown to Dez's garage -> twist.
import * as THREE from 'three';
import { G } from '../core/context.js';
import { driveTo } from '../vehicles/traffic.js';
import { clamp } from '../core/utils.js';
import { V3, baseSetup, playerIn, RouteAI, roadRoute, tickAIs, loseCops } from './helpers.js';
import { Hunters, hunterSUV } from './m01.js';
import { PursuitAI } from '../police/police.js';

// convoy loop through downtown (street graph) -> later heads east to the tunnel
const LOOP = [[-100, -100], [100, -100], [100, 100], [-100, 100]];
function convoyRoute(sx, sz) { let pts = []; let [ax, az] = [sx, sz]; for (let lap = 0; lap < 3; lap++) for (const [bx, bz] of LOOP) { pts = pts.concat(roadRoute(ax, az, bx, bz)); ax = bx; az = bz; } return pts; }
class FollowAI { // escorts hold a slot ahead of / behind the truck
  constructor(v, lead, ahead) { this.v = v; this.lead = lead; this.ahead = ahead; v.ai = this; v.keep = true; v.hasDriver = true; this.kind = 'follow'; }
  update() {
    const v = this.v, L = this.lead; if (v.ai !== this || v.dead || v.mode !== 'drive') return;
    const s = Math.sin(L.yaw), c = Math.cos(L.yaw); const tx = L.pos.x + s * this.ahead, tz = L.pos.z + c * this.ahead; const d = Math.hypot(tx - v.pos.x, tz - v.pos.z);
    const fwd = (tx - v.pos.x) * Math.sin(v.yaw) + (tz - v.pos.z) * Math.cos(v.yaw);
    driveTo(v, this.ahead > 0 ? tx + s * 10 : tx, this.ahead > 0 ? tz + c * 10 : tz, Math.max(4, L.speed + clamp(fwd * 0.5, -8, 10)), { aggressive: true }); if (d < 3 && fwd < 0) { v.ctrl.throttle = 0; v.ctrl.brake = 0.6; }
  }
}
export class RamAI { // Marrow muscle cars: run at the truck's flank and ram it
  constructor(v, target) { this.v = v; this.t = target; v.ai = this; v.keep = true; v.hasDriver = true; this.kind = 'ram'; this.side = Math.random() < 0.5 ? -1 : 1; }
  update() {
    const v = this.v, T = this.t(); if (v.ai !== this || v.dead || v.mode !== 'drive' || !T) return;
    const s = Math.sin(T.yaw), c = Math.cos(T.yaw); const tx = T.pos.x + s * 4 + c * this.side * 1.5, tz = T.pos.z + c * 4 - s * this.side * 1.5;
    driveTo(v, tx, tz, (T.speed || 0) + 9, { aggressive: true });
  }
}
function setup(m) {
  baseSetup(m, { hour: 15.5, weather: 'rain', tier: 1, maxStars: 4, dmg: 0.55, acc: 0.55, heli: true, weapons: ['smg'] });
  m.vars.hunters = new Hunters(); const h = m.vars.hunters; const off = m.r.flow.game.addUpdater((dt) => { if (G.mission === m.r && !G.paused) h.update(dt); }); m.ents.offs.push(off);
  m.vars.ais = tickAIs(m, []); G.traffic.populate(); G.peds.populate();
}
function spawnConvoy(m, x, z, yaw, withEscorts = true) {
  const truck = m.vehicle('armored', { x, y: 0, z, yaw, color: 0x2f3640 }); truck.maxHp = truck.hp = 2600; truck.lightsOn = true; m.vars.truck = truck;
  const route = convoyRoute(x, z); const ai = new RouteAI(truck, route, { speed: () => m.vars.convoySpeed || 15, aggressive: false }); m.vars.ais.push(ai);
  m.vars.escorts = [];
  if (withEscorts) for (const [ahead, dz] of [[13, 13], [-13, -13]]) { const e = m.vehicle('suv', { x: x + Math.sin(yaw) * dz, y: 0, z: z + Math.cos(yaw) * dz, yaw, color: 0x0b0d10 }); e.lightsOn = true; const f = new FollowAI(e, truck, ahead); m.vars.ais.push(f); e.crewMembers = G.npcs.crewVehicle(e, 'halcyon', 2, { canExit: false, calm: true, acc: 0.4 }); for (const c of e.crewMembers) m.ents.npcs.push(c); m.vars.escorts.push(e); }
  return truck;
}
const truckLost = (m) => { const t = m.vars.truck; return !t || t.dead || t.drowned; };

async function cp0(m) {
  setup(m); m.vars.convoySpeed = 13;
  const sv = m.vehicle('strada', { x: -96, y: 0, z: 78, yaw: Math.PI, color: 0x23333d }); playerIn(sv); m.vars.sv = sv;
  const truck = spawnConvoy(m, -100, 30, Math.PI); m.music('armored', 1);
  m.r.flow.showIntro(m.def);
  m.say('JUNO', 'The drive from the ROSTR? It was a key. This is the lock: Halcyon is moving something out of the Meridian vault, in THAT.');
  await m.cine({ dur: 6.5, fov: 40, pos: (k) => V3(truck.pos.x + 14 - k * 6, 3 + k * 4, truck.pos.z - 18 + k * 6), look: () => truck.pos.clone().add(V3(0, 1.2, 0)) });
  m.r.flow.hideIntro();
  m.say('DEZ', 'Nice wheels, by the way. Don\'t scratch them. Tail it — close enough to see, far enough to stay invisible.');
  m.objective('TAIL THE ARMORED TRUCK', 'STAY 25–110 M BEHIND · DON\'T GET SPOTTED'); const b = m.blip(() => truck.pos, { color: '#ffd36b', size: 7, waypoint: true });
  let far = 0, close = 0, t = 0, lt = m.r.stats.time;
  await m.until(() => {
    const dt = m.r.stats.time - lt; lt = m.r.stats.time; t += dt; if (truckLost(m)) return true; const d = truck.pos.distanceTo(G.player.focus);
    if (d > 110) { far += dt; G.hud.warnOverride = `YOU'RE LOSING THEM — ${Math.max(0, 9 - far).toFixed(1)}`; if (far > 9) m.fail('YOU LOST THE CONVOY'); } else { far = 0; }
    if (d < 25) { close += dt; G.hud.warnOverride = `TOO CLOSE — BACK OFF ${Math.max(0, 4 - close).toFixed(1)}`; if (close > 4) { m.vars.spotted = true; return true; } } else close = Math.max(0, close - dt);
    if (d >= 25 && d <= 110) G.hud.warnOverride = null; return t > 40;
  });
  G.hud.warnOverride = null; m.unblip(b);
  if (truckLost(m)) return m.fail('THE TRUCK WAS DESTROYED');
}
async function cp1(m, fresh) {
  if (fresh) { setup(m); const sv = m.vehicle('strada', { x: -96, y: 0, z: 78, yaw: Math.PI, color: 0x23333d }); playerIn(sv); m.vars.sv = sv; spawnConvoy(m, -100, 20, Math.PI); m.music('armored', 3); }
  const truck = m.vars.truck; m.intensity(4); m.vars.convoySpeed = 21;
  if (m.vars.spotted) m.say('JUNO', 'They made you! Doesn\'t matter now — LOOK LEFT!'); else m.say('JUNO', 'Wait — three cars closing on the convoy. That\'s not us.');
  // the Marrow crew T-bones the convoy
  const marrow = []; const s = Math.sin(truck.yaw), c = Math.cos(truck.yaw);
  for (let i = 0; i < 3; i++) { const side = i % 2 ? 1 : -1; const x = truck.pos.x + s * (35 + i * 12) + c * side * 24, z = truck.pos.z + c * (35 + i * 12) - s * side * 24; const v = m.vehicle('muscle', { x, y: 0, z, yaw: truck.yaw + Math.PI + side * 0.9, color: [0x8e1b1b, 0xd35400, 0x111111][i] }); v.maxHp = v.hp = 140; const ai = new RamAI(v, () => m.vars.truck); m.vars.ais.push(ai); const crew = G.npcs.crewVehicle(v, 'thug', 2, { canExit: false, acc: 0.38 }); for (const cc of crew) m.ents.npcs.push(cc); marrow.push(v); }
  await m.wait(2.5);
  // first escort gets taken out in the crash
  const e0 = m.vars.escorts[0]; if (e0 && !e0.dead) { G.emit('explosion', e0.pos.clone(), 1.2, 'ambush'); if (e0.explode) e0.explode(); m.slowmo(1.2, 0.3); G.cam.shake(0.6); }
  m.say('DEZ', 'The MARROW crew! If they get that truck, we never see what\'s inside. Wreck them!');
  const bl = marrow.map((v) => m.blip(() => v.pos, { color: '#ff4d4d', size: 5 }));
  const alive = () => marrow.filter((v) => !v.dead && !v.drowned && v.mode === 'drive' && !v.flipped && v.hp > 25).length;
  m.objective(`WRECK THE MARROW CARS (0/3)`, 'RAM THEM · SHOOT THEM · KEEP THE TRUCK IN ONE PIECE'); let last = 3;
  await m.until(() => { if (truckLost(m)) return true; const a = alive(); if (a !== last) { last = a; m.objective(`WRECK THE MARROW CARS (${3 - a}/3)`, 'RAM THEM · SHOOT THEM · KEEP THE TRUCK IN ONE PIECE'); marrow.forEach((v, i) => { if ((v.dead || v.hp <= 25 || v.flipped) && bl[i]) { m.unblip(bl[i]); bl[i] = null; G.stunts.award('MARROW DOWN', 250); } }); } return a === 0; }, { timeout: 120 });
  for (const b of bl) if (b) m.unblip(b);
  if (truckLost(m)) return m.fail('THE TRUCK WAS DESTROYED');
}
async function cp2(m, fresh) {
  if (fresh) { setup(m); const sv = m.vehicle('strada', { x: -96, y: 0, z: 78, yaw: Math.PI, color: 0x23333d }); playerIn(sv); m.vars.sv = sv; spawnConvoy(m, -100, 20, Math.PI); m.vars.escorts[0].explode && m.vars.escorts[0].explode(); m.music('armored', 4); }
  const truck = m.vars.truck; m.vars.convoySpeed = 22; m.intensity(4);
  const esc = m.vars.escorts.find((e) => !e.dead);
  if (esc) {
    m.say('JUNO', 'One escort left and it\'s turning on you. Take it off the road.');
    if (esc.ai) esc.ai = null; const h = m.vars.hunters; const ai = h.add(esc, 'chase', 0, false); for (const c of (esc.crewMembers || [])) c.calm = false;
    m.objective('TAKE OUT THE LAST ESCORT', 'THE BLACK HALCYON SUV'); const b = m.blip(() => esc.pos, { color: '#ff4d4d', size: 6 });
    await m.until(() => truckLost(m) || esc.dead || esc.hp < 30 || esc.flipped || esc.mode !== 'drive', { timeout: 90 }); m.unblip(b); G.stunts.award('ESCORT DOWN', 300);
  }
  if (truckLost(m)) return m.fail('THE TRUCK WAS DESTROYED');
}
async function cp3(m, fresh) {
  if (fresh) { setup(m); const sv = m.vehicle('strada', { x: -96, y: 0, z: 78, yaw: Math.PI, color: 0x23333d }); playerIn(sv); m.vars.sv = sv; spawnConvoy(m, -100, 20, Math.PI, false); m.music('armored', 4); }
  const truck = m.vars.truck; m.vars.convoySpeed = 19;
  m.say('DEZ', 'Truck\'s alone. Pull up beside the driver door, match its speed — then JUMP.');
  m.objective('BOARD THE MOVING TRUCK', 'DRIVE ALONGSIDE · MATCH SPEED · PRESS E TO LEAP ACROSS');
  const b = m.blip(() => truck.pos, { color: '#ffd36b', size: 7, waypoint: true });
  await m.until(() => {
    if (truckLost(m)) return true; const pv = G.player.vehicle; let ok = false;
    if (pv && pv !== truck) { const d = pv.pos.distanceTo(truck.pos); const rel = Math.abs(pv.speed - truck.speed); const s = Math.sin(truck.yaw), c = Math.cos(truck.yaw); const lat = Math.abs((pv.pos.x - truck.pos.x) * c - (pv.pos.z - truck.pos.z) * s); ok = d < 8 && lat > 1.8 && rel < 8 && truck.speed > 4; G.hud.promptOverride = ok ? '<kbd>E</kbd> LEAP ACROSS' : d < 14 ? `GET ALONGSIDE — ${rel > 8 ? 'MATCH SPEED' : 'CLOSER'}` : null; }
    else if (!pv && G.player.pos.distanceTo(truck.pos) < 5) { ok = true; G.hud.promptOverride = '<kbd>E</kbd> CLIMB ABOARD'; }
    return ok && G.input.pressed('interact');
  });
  G.hud.promptOverride = null; m.unblip(b); if (truckLost(m)) return m.fail('THE TRUCK WAS DESTROYED');
  // the leap
  m.slowmo(1.6, 0.25); G.stunts.award('HIGHWAY LEAP', 900, 'CAR TO TRUCK');
  const from = G.player.vehicle; if (from) { G.player.leaveVehicleInstant(); from.ctrl.throttle = 0; from.ctrl.brake = 0.4; }
  const cine = m.cine({ dur: 1.8, fov: 50, letterbox: true, pos: () => truck.local(-6, -3).setY(truck.pos.y + 3.2), look: () => truck.pos.clone().add(V3(0, 1.5, 0)) });
  await cine; truck.ai = null; playerIn(truck); G.audio && G.audio.impact(truck.pos, 0.8, 'metal'); G.cam.shake(0.4);
  m.say('KIT', 'Driver\'s out. I\'ve got the wheel.');
}
async function cp4(m, fresh) {
  if (fresh) { setup(m); const t = m.vehicle('armored', { x: 100, y: 0, z: 100, yaw: Math.PI / 2, color: 0x2f3640 }); t.maxHp = t.hp = 2600; m.vars.truck = t; playerIn(t); m.music('armored', 4); }
  const truck = m.vars.truck; G.police.setStars(3); G.police.minStars = 2; m.intensity(4);
  m.say('JUNO', 'Every cop in Port Sol is on you. The river tunnel — east on Galleria Row. They can\'t fly the chopper down there.');
  // roadblock at the tunnel mouth
  const bx = 232; for (const [z, yaw] of [[296, 0.3], [300.5, -0.4], [305, 0.2]]) { const v = m.vehicle('police', { x: bx, y: 0, z, yaw: Math.PI / 2 + yaw }); v.siren = true; v.lightsOn = true; const ai = new PursuitAI(v, G.police, 'roadblock'); ai.parked = true; G.police.units.push({ v, ai }); }
  for (const z of [292, 309]) m.npc('police', bx - 6, 0.15, z, -Math.PI / 2, { role: 'hold', acc: 0.35 });
  m.objective('GET TO THE RIVER TUNNEL', 'EAST ON THE Z=300 ROAD · SMASH THE ROADBLOCK — YOU WEIGH NINE TONS');
  await m.goTo(V3(bx + 28, -1, 300), null, '', { r: 12 });
  if (G.player.vehicle !== truck) { /* still counts if they arrived on foot with the truck nearby */ }
  G.stunts.award('BATTERING RAM', 700, 'ROADBLOCK FLATTENED');
}
async function cp5(m, fresh) {
  if (fresh) { setup(m); const t = m.vehicle('armored', { x: 262, y: -2, z: 300, yaw: Math.PI / 2, color: 0x2f3640 }); t.maxHp = t.hp = 2600; m.vars.truck = t; playerIn(t); m.music('armored', 4); G.police.setStars(3); }
  const truck = m.vars.truck; m.intensity(4);
  // twist: the remote kill switch
  m.say('JUNO', 'Kit — Halcyon just pinged the truck. Remote kill switch. Ninety seconds and the engine locks for good.');
  await m.sayWait('DEZ', 'Then don\'t stop. Out the far end, my garage door is open.', 2.6);
  m.timer(90, { failReason: 'THE KILL SWITCH LOCKED THE TRUCK' });
  const h = G.world.landmarks.hideout; const front = V3(h.front.x, 0.15, h.front.z);
  m.objective('BEAT THE KILL SWITCH', 'THROUGH THE TUNNEL · INTO DEZ\'S GARAGE'); h.doorBox.disabled = true; h.door.position.y = 3.15 + 6;
  await m.goTo(front, null, '', { r: 8 });
  await m.goTo(V3(550, 0.15, 150), null, '', { r: 6 });
  m.stopTimer(); G.stunts.award('UNDER THE WIRE', 600);
}
async function cp6(m, fresh) {
  if (fresh) { setup(m); const t = m.vehicle('armored', { x: 550, y: 0.15, z: 150, yaw: 0, color: 0x2f3640 }); m.vars.truck = t; playerIn(t); }
  const h = G.world.landmarks.hideout; m.lock(true); G.police.reset(); m.intensity(1);
  for (let i = 30; i >= 0; i--) { h.door.position.y = 3.15 + i * 0.2; await m.wait(0.02); } h.doorBox.disabled = false;
  const truck = m.vars.truck; truck.engineOn = false;
  const p = m.cine({ dur: 15, fov: 42, pos: (k) => V3(546 - k * 3, 2.2 + k * 0.5, 140 - k * 3), look: () => truck.pos.clone().add(V3(0, 1.4, -2)) });
  await m.sayWait('DEZ', 'Nine tons of armor, two crews and half the PD. This better be gold bars.', 3.2);
  await m.sayWait('JUNO', 'Cutting the rear lock… now.', 2.2);
  G.audio && G.audio.creak(truck.pos, 1.5);
  await m.sayWait('KIT', '…It\'s not gold.', 2);
  await m.sayWait('KIT', 'It\'s a person. She\'s breathing.', 2.6);
  await m.sayWait('JUNO', 'That\'s Ada Voss. Halcyon\'s lead engineer. She\'s been missing for a year.', 3.6);
  await m.sayWait('DEZ', 'So the key, the server, the beacon… it was all about her.', 3);
  await p; m.lock(false);
}
export const M04 = {
  id: 'm04', num: 4, act: 0, title: 'ARMORED DELIVERY', music: 'armored', par: 600,
  desc: 'Tail an armored convoy in the rain, fend off a rival crew, leap onto the moving truck and drive it through a roadblock and the river tunnel.',
  unlocks: [{ vehicle: 'armored' }, { track: 'armored' }],
  deathText: 'KIT WENT DOWN', checkpoints: [cp0, cp1, cp2, cp3, cp4, cp5, cp6],
  onUpdate(m) { if (m.r.cpReached >= 0 && m.vars.truck && (m.vars.truck.dead || m.vars.truck.drowned) && !m.r.failed) m.fail('THE TRUCK WAS DESTROYED'); },
};
