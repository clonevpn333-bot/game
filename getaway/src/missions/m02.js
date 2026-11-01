// GETAWAY! — Mission 02: BANKROLL
// Getaway driver at First Meridian -> alarm trips early, Kit goes in -> guards -> crack the vault -> cash ->
// SWAT at the front: out the back -> Saetta -> highway on-ramp -> roadblock on the deck -> lose the cops -> home.
import * as THREE from 'three';
import { G } from '../core/context.js';
import { PursuitAI } from '../police/police.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
function setup(m) {
  const P = G.player; P.revive(); P.health = 100; P.armor = 100; if (!P.inv.pistol) P.inv.pistol = { mag: 15, res: 0 }; P.inv.pistol.mag = 15; P.inv.pistol.res = Math.max(P.inv.pistol.res, 120);
  P.inv.smg = P.inv.smg || { mag: 32, res: 96 }; P.setWeapon('smg'); P.carrying = m.vars.cash >= 3 ? { bag: true, heavy: true } : null;
  G.dmgScale = 0.6; G.enemyAcc = 0.65; m.ents.offs.push(() => { G.dmgScale = 1; G.enemyAcc = 1; });
  G.sky.setWeather('clear', true); G.sky.dayScale = 0.2 / 60; if (!m.vars.hourSet) { G.sky.setTime(11.2); m.vars.hourSet = true; }
  G.police.reset(); G.police.setTier(1); G.police.maxStars = 3; G.police.tactics = { pit: true, roadblocks: true, heli: false };
  resetVault();
}
function resetVault() { const b = G.world.landmarks.bank; b.vaultDoor.rotation.y = 0; b.vaultBox.disabled = false; }
function playerIn(m, v) { G.player.teleport(v.pos.x, v.pos.y, v.pos.z, v.yaw); G.player.enterVehicle(v); G.cam.yaw = v.yaw; }

async function cp0(m) {
  setup(m); m.vars.cash = 0;
  const car = m.vehicle('sedan', { x: -50, y: 0, z: -5.25, yaw: -Math.PI / 2, color: 0x2f4f3f }); m.vars.crewCar = car; playerIn(m, car);
  G.traffic.populate(); G.peds.populate(); m.music('bankroll', 1);
  const bank = G.world.landmarks.bank;
  m.r.flow.showIntro(m.def);
  m.say('GRAMPS', 'Forty years in this business. Never once used the front door. Today\'s special.');
  await m.cine({ dur: 5.5, fov: 40, pos: (k) => V3(-50 + Math.sin(k * 1.2) * 30, 4 + k * 6, -2 + k * 4), look: () => V3(-50, 9, -40) });
  m.r.flow.hideIntro();
  m.say('DEZ', 'Kit, you\'re the wheel. Engine running, eyes open. Ninety seconds, tops.');
  m.objective('WAIT FOR THE CREW', 'KEEP THE ENGINE RUNNING');
  await m.wait(7);
  const alarm = G.audio.createLoop('alarm', { ref: 25, wet: 0.5 }); if (alarm) { alarm.update(V3(-50, 6, -45), 0.5); m.track({ dispose: () => alarm.dispose() }); }
  G.input.rumble(0.5, 0.5, 400); m.intensity(3);
  m.say('GRAMPS', 'Silent alarm my foot — it\'s SCREAMING. Kid, the vault\'s on a timer and Dez is pinned down. I need hands!');
  m.objective('GET INSIDE THE BANK', 'FRONT DOORS — UP THE STEPS');
  await m.goTo(V3(-50, 0.15, -44), null, '', { r: 3, onFoot: true });
}
async function cp1(m, fresh) {
  if (fresh) { setup(m); G.player.teleport(-50, 0.15, -44, Math.PI); m.music('bankroll', 3); G.traffic.populate(); G.peds.populate(); }
  // hostages + guards inside the hall
  for (const [x, z] of [[-70, -48], [-66, -45], [-34, -47], [-28, -50], [-40, -44]]) G.peds.spawnCivilian(x, 0.15, z, Math.random() * 6, 'cower');
  const guards = [[-62, -62, 'hold'], [-38, -63, 'flank'], [-55, -52, 'hold']].map(([x, z, role]) => m.npc('guard', x, 0.15, z, 0, { role }));
  m.say('KIT', 'Everybody stay down. Nobody\'s getting hurt today.');
  m.objective('DEAL WITH THE GUARDS', 'THEN GET TO THE VAULT AT THE BACK');
  const vault = V3(-50, 0.15, -67);
  const b = m.blip(vault, { color: '#ffd36b', size: 7 });
  await m.until(() => guards.every((g) => !g.alive) || (G.player.pos.z < -60 && Math.abs(G.player.pos.x + 50) < 10), { timeout: 240 });
  m.objective('GET TO THE VAULT', 'GRAMPS IS CRACKING IT'); const mk = m.marker(vault, { r: 2.2, h: 5 });
  await m.until(() => m.near(vault, 3, G.player.pos)); m.unblip(b); m.unmark(mk);
  // the vault swings open
  m.say('GRAMPS', 'Three… two… and THAT is why you don\'t retire.'); G.audio.creak(V3(-50, 2, -70), 2);
  const door = G.world.landmarks.bank.vaultDoor; G.world.landmarks.bank.vaultBox.disabled = true;
  await m.cine({ dur: 2.4, fov: 50, letterbox: false, pos: () => V3(-44, 2.4, -60), look: (k) => { door.rotation.y = -1.7 * Math.min(1, k * 1.3); return V3(-50, 1.6, -71); } });
  G.audio.impact(V3(-50, 2, -70), 1, 'metal'); G.cam.shake(0.3);
}
async function cp2(m, fresh) {
  const bank = G.world.landmarks.bank;
  if (fresh) { setup(m); bank.vaultDoor.rotation.y = -1.7; bank.vaultBox.disabled = true; G.player.teleport(-50, 0.15, -68, Math.PI); m.music('bankroll', 3); G.traffic.populate(); G.peds.populate(); }
  m.objective(`GRAB THE CASH (${m.vars.cash}/3)`, 'PRESS E AT EACH PALLET');
  const pallets = bank.cash.slice(0, 3);
  const marks = pallets.map((p) => m.marker(V3(p.x, 0.15, p.z), { r: 0.9, h: 2.5, color: 0x7bd88f }));
  while (m.vars.cash < 3) {
    await m.until(() => { const i = pallets.findIndex((p, k) => marks[k] && Math.hypot(G.player.pos.x - p.x, G.player.pos.z - p.z) < 1.8); G.hud.promptOverride = i >= 0 ? '<kbd>E</kbd> Bag the cash' : null; if (i >= 0 && G.input.pressed('interact')) { m.unmark(marks[i]); marks[i] = null; return true; } return false; });
    m.vars.cash++; G.player.money += 41000; G.audio.ui('cash'); G.stunts.award('CASH GRAB', 200, '$41,000');
    m.objective(`GRAB THE CASH (${m.vars.cash}/3)`, 'PRESS E AT EACH PALLET');
  }
  G.hud.promptOverride = null; G.player.carrying = { bag: true, heavy: true };
}
async function cp3(m, fresh) {
  if (fresh) { setup(m); m.vars.cash = 3; G.player.carrying = { bag: true, heavy: true }; G.player.money = Math.max(G.player.money, 123000); G.player.teleport(-50, 0.15, -72, 0); m.music('bankroll', 4); G.traffic.populate(); G.peds.populate(); }
  m.intensity(4); G.police.setStars(2);
  for (const [x, z] of [[-56, -30], [-50, -28], [-44, -30]]) m.npc('swat', x, 0.15, z, Math.PI, { role: 'hold', acc: 0.4 });
  for (const x of [-70, -30]) { const v = m.vehicle('police', { x, y: 0, z: -1.75, yaw: Math.PI / 2 }); v.siren = true; v.lightsOn = true; }
  m.say('DEZ', 'SWAT on the front steps! Back door — NOW! Gramps and I will meet you at the garage.');
  m.objective('OUT THE BACK DOOR', 'EAST END OF THE HALL — THE CASH SLOWS YOU DOWN');
  await m.goTo(V3(-30, 0.15, -84), null, '', { r: 3, onFoot: true });
}
async function cp4(m, fresh) {
  if (fresh) { setup(m); m.vars.cash = 3; G.player.carrying = { bag: true, heavy: true }; G.player.money = Math.max(G.player.money, 123000); G.player.teleport(-30, 0.15, -86, Math.PI); m.music('bankroll', 4); G.traffic.populate(); G.peds.populate(); G.police.setStars(2); }
  const saetta = m.vehicle('saetta', { x: -36, y: 0, z: -98.25, yaw: Math.PI / 2, color: 0xc0392b }); saetta.engineOn = true; m.vars.saetta = saetta;
  m.say('JUNO', 'Red Saetta at the curb. Keys in, tank full, I even cleaned the seats.');
  m.objective('GET IN THE RED SAETTA', '');
  const b = m.blip(() => saetta.pos, { color: '#ffd36b', size: 7 });
  await m.until(() => G.player.vehicle === saetta); m.unblip(b); G.player.carrying = null; G.stunts.award('GETAWAY!', 300);
  G.police.addHeat(1.2);
  m.say('DEZ', 'Bridges are already blocked. Take the HIGHWAY — on-ramp north of here, off Second Ave.');
  m.objective('GET ON THE HIGHWAY', 'ON-RAMP NORTH ON 2ND AVENUE');
  await m.goTo(V3(-60, 4, -568), null, '', { r: 9 });
}
async function cp5(m, fresh) {
  if (fresh) { setup(m); m.vars.cash = 3; const v = m.vehicle('saetta', { x: -60, y: 4, z: -568, yaw: Math.PI / 2, color: 0xc0392b }); m.vars.saetta = v; playerIn(m, v); m.music('bankroll', 4); G.traffic.populate(); G.peds.populate(); G.police.setStars(3); }
  // roadblock across the eastbound lanes of the deck
  const blockX = 260;
  for (const [z, yaw] of [[-548.5, 0.3], [-543.5, -0.4], [-538.6, 0.2]]) { const v = m.vehicle('police', { x: blockX, y: 12, z, yaw }); v.siren = true; v.lightsOn = true; const ai = new PursuitAI(v, G.police, 'roadblock'); ai.parked = true; G.police.units.push({ v, ai }); }
  for (const z of [-546, -541]) m.npc('police', blockX - 8, 12, z, -Math.PI / 2, { role: 'hold', acc: 0.35 });
  const onDeck = await m.until(() => G.player.focus.y > 10 && G.player.focus.x > blockX - 170, { timeout: 60 });
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
  const inside = V3(550, 0.15, 150); m.objective('PULL IN', ''); await m.goTo(inside, null, '', { r: 4, slow: true });
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
