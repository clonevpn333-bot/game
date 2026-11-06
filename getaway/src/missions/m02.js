// GETAWAY! — Mission 02: BANKROLL
// Getaway driver at First Meridian -> alarm trips early, Kit goes in -> guards -> crack the vault -> cash ->
// SWAT at the front: out the back -> Saetta -> highway on-ramp -> roadblock on the deck -> lose the cops -> home.
import * as THREE from 'three';
import { G } from '../core/context.js';
import { PursuitAI } from '../police/police.js';
import { clamp } from '../core/utils.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
function setup(m) {
  const P = G.player; P.revive(); P.health = 100; P.armor = 100; if (!P.inv.pistol) P.inv.pistol = { mag: 15, res: 0 }; P.inv.pistol.mag = 15; P.inv.pistol.res = Math.max(P.inv.pistol.res, 120);
  P.inv.smg = P.inv.smg || { mag: 32, res: 96 }; P.setWeapon('smg'); P.carrying = m.vars.cash >= 3 ? { bag: true, heavy: true } : null;
  G.dmgScale = 0.6; G.enemyAcc = 0.65; m.ents.offs.push(() => { G.dmgScale = 1; G.enemyAcc = 1; });
  G.sky.setWeather('clear', true); G.sky.dayScale = 0.2 / 60; if (!m.vars.hourSet) { G.sky.setTime(11.2); m.vars.hourSet = true; }
  G.police.reset(); G.police.setTier(1); G.police.maxStars = 3; G.police.tactics = { pit: true, roadblocks: true, heli: false };
  // lighter chase: at most 4 cruisers at once, a bit less traffic and fewer pedestrians (smooth on modest PCs)
  G.police.unitCap = 4; G.traffic.density = Math.min(G.settings.trafficDensity, 0.75); G.peds.setDensity(Math.min(G.settings.pedDensity, 0.6));
  if (!m.ents.restoreSet) { m.ents.restoreSet = true; m.ents.offs.push(() => { G.police.unitCap = 0; G.traffic.density = G.settings.trafficDensity; G.peds.setDensity(G.settings.pedDensity); }); }
  resetVault();
}
function resetVault() { const b = G.world.landmarks.bank; b.vaultDoor.rotation.y = 0; b.vaultBox.disabled = false; }
function playerIn(m, v) { G.player.teleport(v.pos.x, v.pos.y, v.pos.z, v.yaw); G.player.enterVehicle(v); G.cam.yaw = v.yaw; }

// money bursting out of a pallet / the vault: green paper flutter + gold glints
function moneyBurst(p, n = 40) { const fx = G.fx; if (!fx) return; for (let i = 0; i < n; i++) fx.smoke.emit(p.x, p.y + 0.6, p.z, (Math.random() - 0.5) * 6, 2 + Math.random() * 4, (Math.random() - 0.5) * 6, { life: 2.5 + Math.random() * 2, size: 0.12, grow: 0, r: 0.35, g: 0.62, b: 0.32, a: 1, drag: 1.6, grav: 2.2, spin: 6, fade: 1 }); fx.spark(p, V3(0, 1, 0), 10, 4); }
async function cp0(m) {
  setup(m); m.vars.cash = 0; m.vars.drill = 0;
  const car = m.vehicle('sedan', { x: -50, y: 0, z: -5.25, yaw: -Math.PI / 2, color: 0x2f4f3f }); m.vars.crewCar = car;
  G.player.teleport(-46, 0.15, -30, Math.PI); G.traffic.populate(); G.peds.populate(); m.music('bankroll', 2);
  m.r.flow.showIntro(m.def);
  m.say('GRAMPS', 'Forty years in this business. Never once used the front door. Today\'s special.');
  await m.cine({ dur: 5, fov: 40, pos: (k) => V3(-50 + Math.sin(k * 1.2) * 30, 4 + k * 6, -2 + k * 4), look: () => V3(-50, 6, -40) });
  m.r.flow.hideIntro();
  // the front door goes in — LOUD
  m.say('GRAMPS', 'Fire in the hole!'); await m.wait(1.2);
  const door = V3(-50, 2, -41); G.emit('explosion', door, 1.6, 'breach', null); G.emit('explosion', door.clone().add(V3(4, 0, 0)), 0.9, 'breach', null); m.slowmo(1.1, 0.3); G.cam.shake(1);
  if (G.fx) G.fx.debris(door, 50, 0xd8d2c4, 10, 0.3);
  const alarm = G.audio.createLoop('alarm', { ref: 25, wet: 0.5 }); if (alarm) { alarm.update(V3(-50, 6, -45), 0.5); m.track({ dispose: () => alarm.dispose() }); }
  G.input.rumble(1, 1, 500); m.intensity(4); m.music('bankroll', 4);
  for (const [x, z] of [[-70, -48], [-66, -45], [-34, -47], [-28, -50], [-40, -44], [-58, -50], [-44, -55]]) G.peds.spawnCivilian(x, 0.15, z, Math.random() * 6, 'cower');
  const guards = [[-62, -62, 'hold'], [-38, -63, 'flank'], [-55, -52, 'hold'], [-30, -56, 'flank'], [-68, -56, 'hold'], [-46, -66, 'hold']].map(([x, z, role]) => m.npc('guard', x, 0.15, z, 0, { role, acc: 0.35 }));
  m.say('DEZ', 'GO GO GO! Security\'s armed — drop them before they lock the vault!');
  const off = m.r.flow.game.addUpdater(() => { const n = guards.filter((g) => !g.alive).length; G.hud.objective('STORM THE BANK', `TAKE DOWN SECURITY (${n}/6)`); }); m.ents.offs.push(off);
  m.objective('STORM THE BANK', 'TAKE DOWN SECURITY (0/6)');
  await m.until(() => guards.every((g) => !g.alive), { timeout: 240 }); off();
}
async function cp1(m, fresh) {
  if (fresh) { setup(m); G.player.teleport(-50, 0.15, -52, Math.PI); m.music('bankroll', 4); G.traffic.populate(); G.peds.populate(); }
  // Gramps drills the vault while the cops pour in through the blown front door: hold the lobby
  m.say('GRAMPS', 'Drill\'s on. Thirty-five seconds. Keep them OFF me!'); m.intensity(4);
  const drillP = V3(-50, 1.2, -69.5); const spark = m.r.flow.game.addUpdater(() => { if (G.fx && Math.random() < 0.6) G.fx.spark(drillP, V3(0, 0.3, 1), 3, 3); }); m.ents.offs.push(spark);
  m.timer(35, { failReason: null }); // a countdown, not a failure
  m.objective('HOLD THE LOBBY', 'POLICE ARE COMING THROUGH THE FRONT DOOR');
  G.police.setStars(2);
  const waves = [[-52, -38, 'police'], [-46, -38, 'police'], [-56, -36, 'police'], [-44, -36, 'swat'], [-50, -36, 'police'], [-54, -37, 'swat'], [-48, -35, 'police'], [-42, -37, 'police']];
  let wi = 0; const spawn = m.r.flow.game.addUpdater(() => { const t = 35 - (m.r.timerLeft ?? 0); while (wi < waves.length && t > 2 + wi * 3.8) { const [x, z, k] = waves[wi++]; m.npc(k, x, 0.15, z, Math.PI, { role: wi % 2 ? 'flank' : 'hold', acc: 0.38 }); } }); m.ents.offs.push(spawn);
  await m.until(() => (m.r.timerLeft ?? 0) <= 0.05); spawn(); spark(); m.stopTimer();
  // the vault blows open
  m.say('GRAMPS', 'Three… two… and THAT is why you don\'t retire.'); G.audio.creak(V3(-50, 2, -70), 2);
  const door = G.world.landmarks.bank.vaultDoor; G.world.landmarks.bank.vaultBox.disabled = true; G.emit('explosion', V3(-50, 1.6, -70), 0.8, 'vault', null);
  await m.cine({ dur: 2.4, fov: 50, letterbox: false, pos: () => V3(-44, 2.4, -60), look: (k) => { door.rotation.y = -1.7 * Math.min(1, k * 2); return V3(-50, 1.6, -71); } });
  moneyBurst(V3(-50, 1, -72), 60); G.audio.impact(V3(-50, 2, -70), 1, 'metal'); G.cam.shake(0.5);
}
async function cp2(m, fresh) {
  const bank = G.world.landmarks.bank;
  if (fresh) { setup(m); bank.vaultDoor.rotation.y = -1.7; bank.vaultBox.disabled = true; G.player.teleport(-50, 0.15, -68, Math.PI); m.music('bankroll', 3); G.traffic.populate(); G.peds.populate(); }
  m.objective(`GRAB THE CASH (${m.vars.cash}/3)`, 'PRESS E AT EACH PALLET');
  const pallets = bank.cash.slice(0, 3);
  const marks = pallets.map((p) => m.marker(V3(p.x, 0.15, p.z), { r: 0.9, h: 2.5, color: 0x7bd88f }));
  while (m.vars.cash < 3) {
    await m.until(() => { const i = pallets.findIndex((p, k) => marks[k] && Math.hypot(G.player.pos.x - p.x, G.player.pos.z - p.z) < 1.8); G.hud.promptOverride = i >= 0 ? '<kbd>E</kbd> Bag the cash' : null; if (i >= 0 && G.input.pressed('interact')) { m.unmark(marks[i]); marks[i] = null; return true; } return false; });
    m.vars.cash++; G.player.money += 41000; G.audio.ui('cash'); G.stunts.award('CASH GRAB', 200, '$41,000'); { const pp = pallets[m.vars.cash - 1] || pallets[0]; moneyBurst(V3(pp.x, 0.2, pp.z), 35); }
    m.objective(`GRAB THE CASH (${m.vars.cash}/3)`, 'PRESS E AT EACH PALLET');
  }
  G.hud.promptOverride = null; G.player.carrying = { bag: true, heavy: true };
}
async function cp3(m, fresh) {
  if (fresh) { setup(m); m.vars.cash = 3; G.player.carrying = { bag: true, heavy: true }; G.player.money = Math.max(G.player.money, 123000); G.player.teleport(-50, 0.15, -72, 0); m.music('bankroll', 4); G.traffic.populate(); G.peds.populate(); }
  m.intensity(4); G.police.setStars(2);
  // SWAT breach: flashbang through the front, a stack pours into the hall
  m.say('JUNO', 'SWAT stack at the front door — FLASHBANG, cover your eyes!'); await m.wait(1.2);
  m.r.flow.game.flash = 1.6; G.cam.shake(0.6); if (G.audio) G.audio.explosion(V3(-50, 2, -44), 0.5); if (G.fx) G.fx.smokePuff(V3(-50, 1.5, -46), { n: 12, size: 3, life: 4, color: 0.9, alpha: 0.5, spread: 3 });
  for (const [x, z] of [[-56, -46], [-50, -44], [-44, -46], [-53, -49], [-47, -49]]) m.npc('swat', x, 0.15, z, Math.PI, { role: 'flank', acc: 0.4 });
  for (const [x, z] of [[-56, -30], [-50, -28], [-44, -30]]) m.npc('swat', x, 0.15, z, Math.PI, { role: 'hold', acc: 0.4 });
  for (const x of [-70, -30]) { const v = m.vehicle('police', { x, y: 0, z: -1.75, yaw: Math.PI / 2 }); v.siren = true; v.lightsOn = true; }
  m.say('DEZ', 'SWAT on the front steps! Back door — NOW! Gramps and I will meet you at the garage.');
  m.objective('OUT THE BACK DOOR', 'EAST END OF THE HALL — THE CASH SLOWS YOU DOWN');
  await m.goTo(V3(-30, 0.15, -84), null, '', { r: 3, onFoot: true });
}
async function cp4(m, fresh) {
  if (fresh) { setup(m); m.vars.cash = 3; G.player.carrying = { bag: true, heavy: true }; G.player.money = Math.max(G.player.money, 123000); G.player.teleport(-30, 0.15, -86, Math.PI); m.music('bankroll', 4); G.traffic.populate(); G.peds.populate(); G.police.setStars(2); }
  const saetta = m.vehicle('saetta', { x: -36, y: 0, z: -98.25, yaw: Math.PI / 2, color: 0xc0392b }); saetta.engineOn = true; m.vars.saetta = saetta;
  m.say('JUNO', 'Red Saetta at the curb. Keys in, tank full, I even cleaned the seats. …There are also two police cars parked across the street. Ram them.');
  for (const [x, yaw] of [[-8, 0.4], [-8, -0.5]]) { const v = m.vehicle('police', { x, z: -98 + (yaw > 0 ? 3 : -3), yaw }); v.siren = true; v.lightsOn = true; v.hp = v.maxHp * 0.35; }
  for (const z of [-104, -92]) m.npc('police', -4, 0.15, z, -Math.PI / 2, { role: 'hold', acc: 0.3 });
  G.police.tactics = { pit: true, roadblocks: true, heli: true }; // air support joins the chase this time
  m.objective('GET IN THE RED SAETTA', '');
  const b = m.blip(() => saetta.pos, { color: '#ffd36b', size: 7 });
  await m.until(() => G.player.vehicle === saetta); m.unblip(b); G.player.carrying = null; G.stunts.award('GETAWAY!', 300);
  G.police.addHeat(1.2);
  m.say('DEZ', 'Bridges are already blocked. Take the HIGHWAY — on-ramp north of here, off Second Ave.');
  m.objective('GET ON THE HIGHWAY', 'FOLLOW THE ARROWS TO THE ON-RAMP');
  await m.goTo(V3(-106, 0.15, -568), null, '', { r: 10 }); // the foot of the 2nd Ave on-ramp (the old mid-ramp target pulled the GPS line through a wall)
}
async function cp5(m, fresh) {
  if (fresh) { setup(m); m.vars.cash = 3; const v = m.vehicle('saetta', { x: -60, y: 4, z: -568, yaw: Math.PI / 2, color: 0xc0392b }); m.vars.saetta = v; playerIn(m, v); m.music('bankroll', 4); G.traffic.populate(); G.peds.populate(); G.police.setStars(3); }
  // roadblock across the eastbound lanes of the deck
  const blockX = 260;
  for (const [z, yaw] of [[-548.5, 0.3], [-543.5, -0.4], [-538.6, 0.2]]) { const v = m.vehicle('police', { x: blockX, y: 12, z, yaw }); v.siren = true; v.lightsOn = true; const ai = new PursuitAI(v, G.police, 'roadblock'); ai.parked = true; G.police.units.push({ v, ai }); }
  for (const z of [-546, -541]) m.npc('police', blockX - 8, 12, z, -Math.PI / 2, { role: 'hold', acc: 0.35 });
  // guide up the ramp: the waypoint rides ahead of you along it until you're on the deck
  m.objective('UP THE RAMP', 'ONTO THE HIGHWAY — HEAD EAST');
  const S = G.world.static; const rampH = (x) => clamp((x + 92) / 102, 0, 1) * 12; // slope -92..10, then the merge lane at deck height to x=50
  const onRamp = () => { const f = G.player.focus; return f.x > -92 && f.x < 50 && Math.abs(f.z + 568) < 5.5 && f.y > rampH(f.x) - 1.2; };
  // not on the ramp yet → lead to its mouth (west end, facing east); on it → a point riding 32 m ahead up the slope
  const ahead = () => { const f = G.player.focus; if (!onRamp()) return Math.hypot(f.x + 104, f.z + 568) < 16 ? (Math.abs(f.z + 568) < 2.5 ? V3(-72, rampH(-72), -568) : V3(Math.min(f.x + 6, -96), 0.15, -568)) : V3(-104, 0.15, -568); const x = clamp(G.player.focus.x + 32, -80, 70); const z = x > 22 ? -556 : -568; return V3(x, S.groundAt(x, z, 14, 0).h, z); };
  const up = m.blip(ahead, { color: '#ffd36b', size: 7 });
  await m.until(() => G.player.focus.y > 10 && G.player.focus.x > 30); m.unblip(up);
  m.objective('HEAD EAST ON THE HIGHWAY', 'JUNO SAYS THE DECK IS CLEAR… FOR NOW');
  const east = m.blip(V3(blockX - 40, 12, -546), { color: '#ffd36b', size: 7 });
  const onDeck = await m.until(() => G.player.focus.y > 10 && G.player.focus.x > blockX - 170, { timeout: 90 }); m.unblip(east);
  if (!onDeck) return;
  m.say('JUNO', 'Roadblock on the deck! Ram the gap between the cruisers — aim for the TRUNKS, they spin!'); m.slowmo(0.8, 0.4);
  m.objective('BREAK THROUGH THE ROADBLOCK', 'HIT THE GAP AT FULL SPEED — HOLD SHIFT');
  const rb = m.blip(V3(blockX + 40, 12, -544), { color: '#ffd36b', size: 7 });
  await m.until(() => G.player.focus.x > blockX + 15 || (G.player.focus.y < 6 && G.player.focus.x > blockX - 100), { timeout: 60 });
  m.unblip(rb); G.stunts.award('ROADBLOCK BUSTER', 600);
  m.say('GRAMPS', 'Ha! They\'ll be picking cruiser out of their teeth for a week.');
}
async function cp6(m, fresh) {
  if (fresh) { setup(m); m.vars.cash = 3; const v = m.vehicle('saetta', { x: 300, y: 12, z: -544, yaw: Math.PI / 2, color: 0xc0392b }); m.vars.saetta = v; playerIn(m, v); m.music('bankroll', 4); G.traffic.populate(); G.peds.populate(); G.police.setStars(3); }
  G.police.minStars = 0;
  m.objective('LOSE THE COPS', 'BREAK LINE OF SIGHT · GET OUT OF THE SEARCH ZONE');
  m.say('DEZ', 'Highway comes down into Ironside. Lose them in the container yards, then come home.');
  let escaped = false; m.on('escaped', () => { escaped = true; });
  await m.until(() => escaped || G.police.stars === 0); m.intensity(2);
  m.objective('GET TO DEZ\'S GARAGE', 'IRONSIDE DOCKS');
  const h = G.world.landmarks.hideout; const front = V3(h.front.x, 0.15, h.front.z);
  await m.goTo(front, null, '', { r: 6, slow: true });
  h.doorBox.disabled = true; for (let i = 0; i <= 30; i++) { h.door.position.y = 3.15 + i * 0.2; await m.wait(0.03); }
  const inside = V3(550, 0.15, 150); m.objective('PULL IN', ''); await m.goTo(inside, null, '', { r: 6, slow: true });
  m.lock(true); h.doorBox.disabled = false; for (let i = 30; i >= 0; i--) { h.door.position.y = 3.15 + i * 0.2; await m.wait(0.02); }
  G.police.reset(); m.intensity(1);
  const p = m.cine({ dur: 14, fov: 45, pos: (k) => V3(540 + k * 4, 2.6, 166 - k * 2), look: () => V3(550, 1.0, 150) });
  await m.sayWait('GRAMPS', 'One hundred and twenty-three thousand. Not bad for a Tuesday.', 3.2);
  await m.sayWait('JUNO', 'Uh, guys? These bands. Every stack has a Halcyon serial strip on it.', 3.6);
  await m.sayWait('DEZ', 'That wasn\'t a bank vault. That was Halcyon\'s petty-cash drawer.', 3.4);
  await m.sayWait('JUNO', 'And the drive from the ROSTR just ticked down again. Sixty-two hours left.', 3.6);
  await m.sayWait('KIT', 'Then we spend it fast.', 2.4);
  await p; m.lock(false);
}
export const M02 = {
  id: 'm02', num: 2, act: 0, title: 'BANKROLL', music: 'bankroll', par: 480,
  desc: 'Walk into First Meridian, crack the vault, and escape through the back as SWAT storms the front.',
  unlocks: [{ vehicle: 'saetta' }, { vehicle: 'pickup' }, { track: 'bankroll' }],
  deathText: 'KIT WENT DOWN', checkpoints: [cp0, cp1, cp2, cp3, cp4, cp5, cp6],
};
