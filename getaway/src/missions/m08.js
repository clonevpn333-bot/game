// GETAWAY! — Mission 08: AIRPORT CHAOS
// Gramps' invoice points at a Halcyon cargo jet leaving Port Sol International tonight. Crash the perimeter in a
// supercar, tear across the apron dodging taxiing airliners and security trucks, chain-blow the fuel bowsers, board
// the jet on the move — then YOU fly it: taxi, outrun the trucks blocking the runway, take off, shake the gunship.
import * as THREE from 'three';
import { G } from '../core/context.js';
import { clamp, rand, damp } from '../core/utils.js';
import { V3, baseSetup, playerIn, tickAIs } from './helpers.js';
import { Aircraft, Gunship, board, unboard, planeMesh, FlightHUD } from './air.js';
import { RamAI } from './helpers.js';
import { driveTo } from '../vehicles/traffic.js';

const JET = V3(-1640, 0, -200), RW = { x0: -2180, x1: -1180, z: -320 };
function setup(m) {
  baseSetup(m, { hour: 20.4, weather: 'clear', tier: 2, maxStars: 3, dmg: 0.6, acc: 0.6, weapons: ['smg'] });
  G.traffic.populate(); G.peds.populate();
}
// airliners taxiing across the apron: huge, slow, and they flatten anything in their way
function taxiers(m) {
  const list = []; for (const [z, x0, x1, sp] of [[-250, -1300, -2050, 9], [-140, -2000, -1300, 7]]) { const pm = planeMesh(0xf4f6f8, 0x2e86de); pm.g.scale.setScalar(1.6); G.scene.add(pm.g); list.push({ g: pm.g, z, x0, x1, sp, t: rand(0, 1) }); }
  m.track({ dispose: () => { for (const p of list) G.scene.remove(p.g); } });
  const off = m.r.flow.game.addUpdater((dt) => { if (G.mission !== m.r) return; for (const p of list) { p.t = (p.t + dt * p.sp / Math.abs(p.x1 - p.x0)) % 1; const x = p.x0 + (p.x1 - p.x0) * p.t; p.g.position.set(x, 3.6, p.z); p.g.rotation.y = p.x1 > p.x0 ? Math.PI / 2 : -Math.PI / 2;
      for (const v of G.vehicles.list) if (!v.dead && Math.abs(v.pos.x - x) < 14 && Math.abs(v.pos.z - p.z) < 12 && v.mode === 'drive') { v.damage(80, v.pos.clone(), V3(0, 0, Math.sign(v.pos.z - p.z) || 1)); v.vel.z += Math.sign(v.pos.z - p.z) * 14; v.vel.y += 4; G.emit('explosion', v.pos.clone(), 0.6, 'jet', null); } } });
  m.ents.offs.push(off); return list;
}
function bowsers(m, at) { const out = []; for (let i = 0; i < 6; i++) { const v = m.vehicle('truck', { x: at.x + (i % 3) * 9 - 9, z: at.z + 22 + (i > 2 ? 9 : 0), yaw: Math.PI / 2, color: 0xe5e5e5 }); out.push(v); } return out; }

async function cp0(m) {
  setup(m); const car = m.vehicle('super', { x: -905, z: -300, yaw: -Math.PI / 2, color: 0xffb400 }); playerIn(car); m.music('fivestar', 3);
  m.r.flow.showIntro(m.def); m.lock(true);
  await m.cine({ dur: 5.5, fov: 44, pos: (k) => V3(-1500 - k * 200, 60 - k * 20, -80 + k * 40), look: () => JET.clone().setY(4) });
  m.r.flow.hideIntro(); m.lock(false);
  m.say('JUNO', 'Halcyon cargo jet, stand 14. Wheels up in five minutes. You\'re not stopping at the gate, are you?');
  m.objective('CRASH THE AIRPORT', 'THROUGH THE GATE · ACROSS THE APRON TO STAND 14');
  await m.goTo(V3(-1150, 0.15, -300), null, '', { r: 12 });
  G.police.setStars(2); m.intensity(4); m.say('GRAMPS', 'Security\'s scrambling. Mind the airliners, they don\'t brake for anybody.');
}
async function cp1(m, fresh) {
  if (fresh) { setup(m); const car = m.vehicle('super', { x: -1160, z: -300, yaw: -Math.PI / 2, color: 0xffb400 }); playerIn(car); m.music('fivestar', 4); G.police.setStars(2); }
  taxiers(m); const fuel = bowsers(m, JET);
  const sec = []; for (let i = 0; i < 4; i++) { const v = m.vehicle('suv', { x: -1250 - i * 70, z: -380 + (i % 2) * 220, yaw: Math.PI / 2, color: 0xe8e8e8 }); v.siren = true; v.lightsOn = true; sec.push(new RamAI(v, () => G.player.vehicle)); v.ai.hostile = true; }
  tickAIs(m, sec);
  m.objective('GET TO STAND 14', 'THE HALCYON JET — SECURITY WILL RAM YOU');
  await m.goTo(JET.clone().add(V3(14, 0.15, 10)), null, '', { r: 10 });
  m.say('DEZ', 'Fuel bowsers lined up behind the jet. Pop one and the whole row goes — they\'ll never get trucks in front of you.');
  m.objective('BLOW THE FUEL BOWSERS', 'SHOOT ONE — WATCH THE CHAIN (KEEP YOUR DISTANCE)'); m.vars.fuel = fuel;
  const chain = m.r.flow.game.addUpdater(() => { for (const f of fuel) if (f.dead && !f._chained) { f._chained = true; G.emit('explosion', f.pos.clone().setY(1.5), 2.4, 'fuel', null); for (const o of fuel) if (!o.dead && o.pos.distanceTo(f.pos) < 14) { o.burnT = 0.35 + Math.random() * 0.4; o.hp = 0.1; } } }); m.ents.offs.push(chain);
  await m.until(() => fuel.filter((f) => f.dead).length >= 4, { timeout: 90 }); if (G.stunts) G.stunts.award('FUEL FIREWORKS', 1200); m.slowmo(1.2, 0.3);
}
async function cp2(m, fresh) {
  if (fresh) { setup(m); G.player.teleport(JET.x + 12, 0.2, JET.z + 6, 0); m.music('fivestar', 4); G.police.setStars(2); }
  // board the jet
  const pl = new Aircraft('plane', { pos: JET.clone().setY(2.2), yaw: -Math.PI / 2, color: 0x1b1f24, accent: 0xd4a017 }); m.track({ dispose: () => pl.dispose() }); m.vars.pl = pl;
  const door = JET.clone().add(V3(0, 0.15, -2.5)); m.objective('BOARD THE JET', 'GET OUT · PRESS E AT THE DOOR'); const mk = m.marker(door, { r: 2, h: 4 });
  await m.until(() => { const P = G.player; const near = !P.vehicle && Math.hypot(P.pos.x - door.x, P.pos.z - door.z) < 4; G.hud.promptOverride = near ? '<kbd>E</kbd> Board the jet' : null; return near && G.input.pressed('interact'); });
  G.hud.promptOverride = null; m.unmark(mk); board(pl); G.police.reset();
  const up = m.r.flow.game.addUpdater((dt) => { if (G.mission === m.r && !G.paused) { pl.update(dt, m.r.cine ? null : G.input); FlightHUD.update(); } }); m.ents.offs.push(up);
  m.track({ dispose: () => { if (G.player.riding === pl) unboard(); } }); m.on('aircraftDown', () => m.fail('THE JET WENT UP IN FLAMES'));
  m.say('JUNO', 'W throttle up, A/D steer on the ground, SPACE to pull up once you\'re past 120. CLICK guns, RIGHT-CLICK rockets. Go go go!');
  m.objective('TAXI TO THE RUNWAY', 'WEST END — LINE UP');
  const thr = V3(RW.x0 + 110, 0.2, RW.z); await m.goTo(thr, null, '', { r: 22 });
}
async function cp3(m, fresh) {
  let pl = m.vars.pl; if (fresh || !pl || pl.disposed) { setup(m); pl = new Aircraft('plane', { pos: V3(RW.x0 + 110, 2.2, RW.z), yaw: Math.PI / 2, color: 0x1b1f24, accent: 0xd4a017 }); m.vars.pl = pl; m.track({ dispose: () => { pl.dispose(); if (G.player.riding === pl) unboard(); } }); board(pl);
    const up = m.r.flow.game.addUpdater((dt) => { if (G.mission === m.r && !G.paused) { pl.update(dt, G.input); FlightHUD.update(); } }); m.ents.offs.push(up); m.on('aircraftDown', () => m.fail('THE JET WENT UP IN FLAMES')); m.music('fivestar', 4); }
  m.intensity(4); m.say('DEZ', 'Trucks rolling onto the runway — they want to box you in! Shoot through them or lift off before them!');
  // blockers drive out across the runway ahead of you
  const blk = []; for (let i = 0; i < 4; i++) { const x = RW.x0 + 420 + i * 140; const v = m.vehicle(i % 2 ? 'truck' : 'suv', { x, z: RW.z + 60, yaw: Math.PI, color: 0xe8e8e8 }); v.ai = { kind: 'block', hostile: true, update: () => { if (v.dead || v.mode !== 'drive') return; driveTo(v, x + rand(-2, 2), RW.z - 4 * (i % 2 ? 1 : -1), 14, { aggressive: true }); } }; blk.push(v); }
  tickAIs(m, blk.map((v) => v.ai));
  const crash = m.r.flow.game.addUpdater(() => { for (const v of blk) if (!v.dead && pl.grounded && v.pos.distanceTo(pl.pos) < 7) { pl.damage(70, v.pos.clone()); v.explode(); } }); m.ents.offs.push(crash);
  m.objective('TAKE OFF', 'FULL THROTTLE (W) · PULL UP (SPACE) PAST 120 KM/H');
  await m.until(() => !pl.grounded && pl.pos.y > 25);
  if (G.stunts) G.stunts.award('WHEELS UP!', 600); m.slowmo(1.0, 0.4);
  m.say('JUNO', 'You\'re flying a stolen jet. I\'m so proud. Also: gunship, six o\'clock.');
  const gs = new Gunship(pl.pos.clone().add(V3(-300, 30, 80)), { hp: 420, aggro: 1.2 }); m.track({ dispose: () => gs.dispose() });
  const gu = m.r.flow.game.addUpdater((dt) => { if (G.mission === m.r && !gs.gone) gs.update(dt, pl.pos); }); m.ents.offs.push(gu);
  const gb = m.blip(() => (gs.alive ? gs.pos : null), { color: '#ff3b2f', size: 7 });
  m.objective('SHAKE THE GUNSHIP', 'CLIMB ABOVE 220 M — OR SHOOT IT DOWN');
  await m.until(() => !gs.alive || pl.pos.y > 220, { timeout: 150 }); m.unblip(gb);
  if (!gs.alive) m.say('GRAMPS', 'You shot down a helicopter WITH A CARGO PLANE. I\'ve seen everything now.'); else m.say('JUNO', 'It can\'t climb that high. You\'re clear. Next stop: international airspace.');
  m.lock(true); const p = m.cine({ dur: 8, fov: 48, pos: (k) => pl.pos.clone().add(V3(-40 + k * 60, 10 - k * 5, 30)), look: () => pl.pos.clone() });
  await m.sayWait('DEZ', 'Storm front over the coast. Halcyon\'s fighters will be waiting in it.', 3.4); await p; m.lock(false);
}
export const M08 = {
  id: 'm08', num: 8, act: 1, title: 'AIRPORT CHAOS', music: 'fivestar', par: 540,
  desc: 'Crash the airport in a supercar, dodge taxiing airliners, chain-blow the fuel bowsers, board a cargo jet and fly it off the runway.',
  unlocks: [{ vehicle: 'super' }], deathText: 'KIT WENT DOWN AT THE AIRPORT', checkpoints: [cp0, cp1, cp2, cp3],
};
