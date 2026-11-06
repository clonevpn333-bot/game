// GETAWAY! — Mission 10: ALL IN
// Halcyon found Dez's garage. Hold it: the crew is inside pulling the ledger off the drive and every merc in the
// city is coming down the street. Fight in the yard, man the roof minigun, stop the armored ram truck, swat two
// gunships — then the garage is lost, so you wire it to blow and run for the bike while the docks go up behind you.
import * as THREE from 'three';
import { G } from '../core/context.js';
import { clamp, rand } from '../core/utils.js';
import { V3, baseSetup, playerIn, RouteAI, roadRoute, tickAIs } from './helpers.js';
import { GunnerSeat, Gunship, Rockets, FlightHUD } from './air.js';

const DOOR = V3(550, 0.2, 121), ROOF = V3(550, 11.6, 124);
function setup(m) {
  baseSetup(m, { hour: 22.5, weather: 'cloudy', tier: 1, maxStars: 0, dmg: 0.5, acc: 0.5, weapons: ['shotgun', 'rifle', 'heavy'] });
  const P = G.player; P.inv.rpg = { mag: 1, res: 8 }; P.inv.heavy.res = 16; P.inv.rifle.res = 300; P.setWeapon('rifle');
  G.police.enabled = false; m.ents.offs.push(() => { G.police.enabled = true; }); G.traffic.enabled = false; G.traffic.clear(); m.ents.offs.push(() => { G.traffic.enabled = true; });
  const h = G.world.landmarks.hideout; h.doorBox.disabled = false; h.door.position.y = 3.15;
  m.vars.door = 100;
  // the door's health: mercs with a line on it chip it, the ram truck smashes it
  const off = m.r.flow.game.addUpdater((dt) => { if (G.mission !== m.r || G.paused) return; let n = 0; for (const e of G.npcs.list) if (e.alive && e.team === 'halcyon' && e.pos.distanceTo(DOOR) < 45) n++;
    m.vars.door = Math.max(0, m.vars.door - n * dt * 0.35); G.hud.warnOverride = m.vars.siege ? `GARAGE DOOR ${'█'.repeat(Math.ceil(m.vars.door / 5))}${'░'.repeat(20 - Math.ceil(m.vars.door / 5))}` : null; if (m.vars.door <= 0 && m.vars.siege) m.fail('THEY BREACHED THE GARAGE'); });
  m.ents.offs.push(off); m.ents.offs.push(() => { G.hud.warnOverride = null; });
  turret(m);
}
// roof minigun: E at the ladder to man it, F to get off
function turret(m) {
  const T = { pos: ROOF.clone(), yaw: Math.PI, rockets: new Rockets(), shooter: { isPlayer: true, team: 'player', human: G.player.human, target: G.player.target, aiming: true } };
  const seat = new GunnerSeat(T); seat.ammo = 14; seat.pitch = -0.35; const ladder = V3(584, 0.2, 118); const mk = m.marker(ladder, { r: 1.4, h: 3, color: 0x46f0ff });
  m.vars.seat = seat; let on = false;
  const mount = () => { on = true; const P = G.player; P.riding = T; T.seat = () => ROOF; P.human.visible = false; G.cam.custom = () => seat.camShot(); FlightHUD.show({ pos: T.pos, hp: m.vars.door, maxHp: 100, kind: 'turret', heat: 0 }, seat); };
  const dismount = () => { on = false; const P = G.player; P.riding = null; P.human.visible = true; G.cam.custom = null; FlightHUD.hide(); P.teleport(ladder.x - 2, 0.2, ladder.z - 2, Math.PI); };
  const off = m.r.flow.game.addUpdater((dt) => { if (G.mission !== m.r || G.paused) return; T.rockets.update(dt);
    if (on) { seat.update(dt, G.input); FlightHUD.craft.hp = m.vars.door; FlightHUD.update(); if (G.input.pressed('enter')) dismount(); return; }
    const near = Math.hypot(G.player.pos.x - ladder.x, G.player.pos.z - ladder.z) < 2.2 && !G.player.vehicle; if (near) G.hud.promptOverride = '<kbd>E</kbd> Man the roof minigun'; else if (G.hud.promptOverride && G.hud.promptOverride.includes('minigun')) G.hud.promptOverride = null;
    if (near && G.input.pressed('interact')) { G.hud.promptOverride = null; mount(); } });
  m.ents.offs.push(off); m.track({ dispose: () => { T.rockets.clear(); m.unmark(mk); if (on) dismount(); } });
}
// a Halcyon SUV races in, brakes, and its mercs pile out
async function squad(m, from, stop, n = 3, kind = 'halcyon') {
  const v = m.vehicle('suv', { x: from[0], z: from[1], yaw: 0, color: 0x15171b }); v.lightsOn = true;
  const ai = new RouteAI(v, roadRoute(from[0], from[1], stop[0], stop[1]).concat([V3(stop[0], 0, stop[1])]), { speed: 22 }); ai.hostile = true; tickAIs(m, [ai]);
  await m.until(() => ai.done || v.dead || v.pos.distanceTo(V3(stop[0], 0, stop[1])) < 8, { timeout: 40 });
  const out = []; for (let i = 0; i < n; i++) { const s = i % 2 ? 1 : -1; out.push(m.npc(kind, v.pos.x + Math.cos(v.yaw) * 2.2 * s + rand(-1, 1), 0.2, v.pos.z - Math.sin(v.yaw) * 2.2 * s + rand(-1, 1), v.yaw, { role: i % 2 ? 'flank' : 'hold', acc: 0.42 })); }
  v.ai = { kind: 'parked', hostile: true, update() {} }; return out;
}
const alive = (list) => list.filter((e) => e.alive).length;

async function cp0(m) {
  setup(m); G.player.teleport(550, 0.2, 112, 0); m.music('bankroll', 2);
  m.r.flow.showIntro(m.def); m.lock(true);
  await m.cine({ dur: 6, fov: 46, pos: (k) => V3(520 + k * 50, 20 - k * 8, 60 + k * 20), look: () => V3(550, 4, 120) });
  m.r.flow.hideIntro(); m.lock(false);
  m.say('DEZ', 'Headlights. Lots of them. Kit — I need ten minutes on this drive. Keep them OUT of my garage.');
  m.vars.siege = true; m.intensity(4); m.music('bankroll', 4);
  m.objective('HOLD THE GARAGE', 'WAVE 1 · ROOF MINIGUN: E AT THE CYAN LADDER · F TO GET OFF');
  const a = await Promise.all([squad(m, [700, 100], [585, 88]), squad(m, [500, 0], [520, 86])]); const wave = a.flat();
  await m.until(() => alive(wave) === 0, { timeout: 240 }); if (G.stunts) G.stunts.award('WAVE CLEARED', 500);
}
async function cp1(m, fresh) {
  if (fresh) { setup(m); G.player.teleport(550, 0.2, 112, 0); m.vars.siege = true; m.music('bankroll', 4); }
  m.say('GRAMPS', 'Big one coming. ARMORED. They\'re going to ram the door — rockets, kid!');
  const ram = m.vehicle('armored', { x: 700, z: 0, yaw: -Math.PI / 2, color: 0x15171b }); ram.lightsOn = true; ram.armor = 3;
  const rai = new RouteAI(ram, roadRoute(700, 0, 600, 100).concat([V3(560, 0, 100), V3(550, 0, 116)]), { speed: 16 }); rai.hostile = true; tickAIs(m, [rai]);
  const rb = m.blip(() => (ram.dead ? null : ram.pos), { color: '#ff3b2f', size: 8 });
  const hit = m.r.flow.game.addUpdater(() => { if (!ram.dead && ram.pos.distanceTo(DOOR) < 7) { m.vars.door -= 45; G.emit('explosion', DOOR.clone().setY(2), 1.6, 'ram', null); ram.explode(); } }); m.ents.offs.push(hit);
  m.objective('STOP THE RAM TRUCK', 'RPG (6) · GRENADES (4) · ROOF MINIGUN ROCKETS (RIGHT-CLICK)');
  const wave = (await Promise.all([squad(m, [600, 200], [592, 150], 3), squad(m, [500, 200], [508, 150], 3)])).flat();
  await m.until(() => ram.dead || ram.hp <= 0, { timeout: 200 }); m.unblip(rb); m.slowmo(1.2, 0.3);
  m.objective('HOLD THE GARAGE', 'WAVE 2 · FINISH THE FLANKERS');
  await m.until(() => alive(wave) === 0, { timeout: 200 });
}
async function cp2(m, fresh) {
  if (fresh) { setup(m); G.player.teleport(550, 0.2, 112, 0); m.vars.siege = true; m.music('bankroll', 4); }
  m.say('JUNO', 'Two gunships over the cranes. Get on that roof gun — NOW.'); if (m.vars.seat) m.vars.seat.ammo += 10;
  const ships = [new Gunship(V3(700, 50, 300), { hp: 420, aggro: 1 }), new Gunship(V3(400, 50, -60), { hp: 420, aggro: 1 })];
  const up = m.r.flow.game.addUpdater((dt) => { if (G.mission === m.r && !G.paused) for (const s of ships) if (!s.gone) s.update(dt, G.player.riding ? ROOF : G.player.pos); }); m.ents.offs.push(up); m.track({ dispose: () => ships.forEach((s) => s.dispose()) });
  const bl = ships.map((s) => m.blip(() => (s.alive ? s.pos : null), { color: '#ff3b2f', size: 7 }));
  const wave = (await Promise.all([squad(m, [700, 200], [600, 104], 4), squad(m, [500, 100], [505, 104], 4)])).flat();
  m.objective('LAST STAND', 'TWO GUNSHIPS + A FULL SQUAD');
  await m.until(() => ships.every((s) => !s.alive) && alive(wave) <= 1, { timeout: 300 }); bl.forEach((b) => m.unblip(b));
}
async function cp3(m, fresh) {
  if (fresh) { setup(m); G.player.teleport(550, 0.2, 112, 0); m.music('bankroll', 4); }
  if (G.player.riding) { G.player.riding = null; G.player.human.visible = true; G.cam.custom = null; FlightHUD.hide(); G.player.teleport(560, 0.2, 110, 0); }
  m.vars.siege = false; G.hud.warnOverride = null;
  m.say('DEZ', 'Got it! Ledger\'s copied. And there\'s a convoy of forty more of them coming. We leave nothing — I\'m lighting the fuel tanks. GO!');
  m.timer(30, { failReason: 'THE GARAGE WENT UP WITH YOU IN IT' });
  const bike = m.vehicle('moto', { x: 596, z: 104, yaw: Math.PI / 2, color: 0xc0392b }); m.objective('GET TO THE BIKE', 'TIMER: THE GARAGE BLOWS');
  await m.until(() => G.player.vehicle === bike);
  // the docks go up behind you: parked trucks and fuel drums detonate as you pass
  const path = [V3(700, 0, 100), V3(700, 0, 300), V3(740, 0, 420)]; const traps = [];
  for (let i = 0; i < 9; i++) { const a = path[Math.min(2, i >> 2)], b = path[Math.min(2, (i >> 2) + 1)]; const p = a.clone().lerp(b, (i % 4) / 4); traps.push(m.vehicle(i % 3 ? 'truck' : 'van', { x: p.x + (i % 2 ? 9 : -9), z: p.z, yaw: rand(0, 6) })); }
  const boom = m.r.flow.game.addUpdater(() => { const pv = G.player.vehicle; if (!pv) return; for (const t of traps) if (!t._lit && t.pos.distanceTo(pv.pos) < 22) { t._lit = true; t.burnT = 0.25; t.hp = 0.1; } }); m.ents.offs.push(boom);
  m.objective('GET OUT OF IRONSIDE', 'TO THE QUAY — DON\'T STOP'); const end = V3(740, 0.2, 430);
  await m.goTo(end, null, '', { r: 12 }); m.stopTimer(); boom();
  // the garage goes up — all of it
  m.lock(true); const h = G.world.landmarks.hideout; const c = V3((h.x0 + h.x1) / 2, 4, (h.z0 + h.z1) / 2);
  const p = m.cine({ dur: 12, fov: 50, pos: (k) => V3(760 - k * 30, 14 + k * 12, 380 - k * 60), look: () => c });
  for (let i = 0; i < 7; i++) { G.emit('explosion', c.clone().add(V3(rand(-25, 25), rand(0, 8), rand(-25, 25))), 2.6, 'garage', null); await m.wait(0.35); }
  await m.sayWait('GRAMPS', 'Forty years of tools in there. Forty years.', 2.8);
  await m.sayWait('DEZ', 'And Halcyon\'s entire strike team. Worth it. We\'ve got the ledger, and the ledger has names.', 3.6);
  await m.sayWait('JUNO', 'Names, and one address. A villa on the Italian coast.', 3.0);
  await p; m.lock(false);
}
export const M10 = {
  id: 'm10', num: 10, act: 1, title: 'ALL IN', music: 'bankroll', par: 720,
  desc: 'Siege at Dez\'s garage: hold the yard, man the roof minigun, stop the armored ram, swat two gunships — then blow it all and run.',
  unlocks: [{ vehicle: 'moto' }], deathText: 'KIT FELL DEFENDING THE GARAGE', checkpoints: [cp0, cp1, cp2, cp3],
};
