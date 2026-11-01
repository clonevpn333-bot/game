// GETAWAY! — Mission 03: SHOPPING SPREE
// Night at the Galleria: walk in -> lift the Halcyon key from LUXE JEWELS -> lockdown, shutters drop, Halcyon
// rappels through the skylight -> firefight between the kiosks -> steal the Vortice off the showroom podium ->
// drive it down the promenade and under the closing shutter -> street chase with Halcyon SUVs + police heli ->
// twist: the key is a beacon -> launch the car off the end of the pier into the bay -> swim to Juno's boat.
import * as THREE from 'three';
import { G } from '../core/context.js';
import { V3, baseSetup, playerIn } from './helpers.js';
import { Hunters, spawnHunters } from './m01.js';

const MX0 = -160, MX1 = -140, MZ0 = 312, MZ1 = 488, FLOOR = 0.15;
const CAR_POS = V3(-145.6, FLOOR, 394); // east aisle: clear run past the centre kiosks + planters to the north doors
const COUNTER = V3(-142.2, FLOOR, 405.5);
const PIER = G => G.world.landmarks.pier;

// shutters are built once and reused across retries (no static-box leak)
let SH = null;
function shutters() {
  if (SH) return SH; const S = G.world.static; SH = {};
  for (const [k, z] of [['s', MZ0 + 0.9], ['n', MZ1 - 0.9]]) {
    const g = new THREE.Group(); const mat = new THREE.MeshStandardMaterial({ color: 0x8e959c, metalness: 0.75, roughness: 0.42 });
    const slats = new THREE.Mesh(new THREE.BoxGeometry(MX1 - MX0, 4.4, 0.12), mat); slats.position.y = 2.2; g.add(slats);
    for (let i = 0; i < 22; i++) { const r = new THREE.Mesh(new THREE.BoxGeometry(MX1 - MX0, 0.04, 0.16), new THREE.MeshStandardMaterial({ color: 0x5d636a, metalness: 0.7, roughness: 0.5 })); r.position.y = 0.1 + i * 0.2; g.add(r); }
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(MX1 - MX0, 0.18, 0.18), new THREE.MeshBasicMaterial({ color: 0xffb000, toneMapped: false })); stripe.position.y = 0.09; g.add(stripe);
    g.position.set((MX0 + MX1) / 2, 0, z); G.scene.add(g);
    const box = S.addBox(MX0, 0, z - 0.15, MX1, 9, z + 0.15, { mat: 'metal', surface: false }); box.disabled = true;
    SH[k] = { g, box, z, low: 4.6 }; set(SH[k], 4.6);
  }
  return SH;
}
function set(sh, bottom) { sh.low = bottom; sh.g.position.y = bottom; sh.g.visible = bottom < 4.55; sh.box.minY = bottom; sh.box.disabled = bottom >= 4.55; }
function resetMall(m) {
  const sh = shutters(); set(sh.s, 4.6); set(sh.n, 4.6);
  G.props.restoreGlass(MX0 - 1, MZ0 - 1, MX1 + 1, MZ0 + 1); G.props.restoreGlass(MX0 - 1, MZ1 - 1, MX1 + 1, MZ1 + 1);
  G.props.openGlass(-153, MZ0 - 1, -147, MZ0 + 1); // automatic doors at the south entrance stand open
  m.ents.offs.push(() => { set(sh.s, 4.6); set(sh.n, 4.6); });
}
// showroom podium + the display car (Vortice V12, keys in it for the promo)
function showroom(m) {
  const g = new THREE.Group(); g.position.set(CAR_POS.x, FLOOR, CAR_POS.z);
  const disk = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.8, 0.06, 48), new THREE.MeshStandardMaterial({ color: 0x15171a, metalness: 0.8, roughness: 0.2 })); disk.position.y = 0.03; g.add(disk);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.7, 0.05, 6, 64), new THREE.MeshBasicMaterial({ color: 0x8fd3ff, toneMapped: false })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.07; g.add(ring);
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.2), new THREE.MeshBasicMaterial({ color: 0xffffff, map: bannerTex(), transparent: true, toneMapped: false })); banner.position.set(0, 6.2, 0); g.add(banner);
  G.scene.add(g); m.track(g); m.vars.podium = g;
  const v = m.vehicle('super', { x: CAR_POS.x, y: FLOOR, z: CAR_POS.z, yaw: 0, color: 0xff6b00, parked: true }); v.engineOn = false; v.lightsOn = false; m.vars.vortice = v;
  return v;
}
function bannerTex() { const c = document.createElement('canvas'); c.width = 512; c.height = 102; const x = c.getContext('2d'); x.fillStyle = 'rgba(10,12,16,0.85)'; x.fillRect(0, 0, 512, 102); x.fillStyle = '#ff6b00'; x.font = 'bold 54px sans-serif'; x.textAlign = 'center'; x.fillText('VORTICE V12', 256, 62); x.fillStyle = '#9fb4c8'; x.font = '20px sans-serif'; x.fillText('WIN ME · GALLERIA GRAND PRIZE', 256, 90); return new THREE.CanvasTexture(c); }

function setup(m, { inside = false } = {}) {
  baseSetup(m, { hour: 21.4, tier: 1, maxStars: 4, dmg: 0.55, acc: 0.6, heli: true, weapons: ['smg'] });
  m.vars.hunters = new Hunters(); const h = m.vars.hunters; const off = m.r.flow.game.addUpdater((dt) => { if (G.mission === m.r && !G.paused) h.update(dt); }); m.ents.offs.push(off);
  resetMall(m); G.traffic.populate(); G.peds.populate();
  if (inside) G.player.setWeapon('smg'); else G.player.setWeapon('fists');
}
const hostile = (m) => m.vars.squad ? m.vars.squad.filter((n) => n.alive) : [];

async function cp0(m) {
  setup(m); m.vars.key = false; showroom(m);
  G.player.teleport(-150, FLOOR, 304.5, 0); G.cam.yaw = 0; m.music('mall', 1);
  m.r.flow.showIntro(m.def);
  m.say('JUNO', 'The drive from the ROSTR is encrypted. Halcyon\'s fixer keeps the key somewhere you\'d never look twice.');
  await m.cine({ dur: 6, fov: 42, pos: (k) => V3(-150 + Math.sin(k * 1.4) * 22, 2 + k * 12, 290 + k * 6), look: () => V3(-150, 6, 330) });
  m.r.flow.hideIntro();
  m.say('DEZ', 'Inside a jewellery store. Inside a necklace. Inside the Galleria. On a Friday night. Walk, don\'t run.');
  m.objective('WALK INTO THE GALLERIA', 'SOUTH ENTRANCE — BLEND IN');
  await m.goTo(V3(-150, FLOOR, 320), null, '', { r: 3, onFoot: true });
}
async function cp1(m, fresh) {
  if (fresh) { setup(m); m.vars.key = false; showroom(m); G.player.teleport(-150, FLOOR, 321, 0); m.music('mall', 1); }
  else m.intensity(1);
  // the fixer, minding the counter
  const fixer = m.npc('thug', COUNTER.x + 0.6, FLOOR, COUNTER.z + 1.6, -Math.PI / 2, { calm: true, role: 'hold' }); fixer.passive = true; m.vars.fixer = fixer;
  m.say('JUNO', 'LUXE JEWELS, east side, halfway down. The fixer is Varga — grey suit, nervous hands.');
  m.objective('FIND LUXE JEWELS', 'EAST SIDE OF THE PROMENADE — PAST THE ORANGE CAR ON THE PODIUM');
  await m.goTo(V3(-143.5, FLOOR, 404), null, '', { r: 3.2, onFoot: true });
  m.say('KIT', 'Evening. I\'m here about the Meridian Star.');
  await m.sayWait('VARGA', '…You\'re not who they said was coming.', 2.6);
  m.objective('GRAB THE NECKLACE', 'PRESS E AT THE DISPLAY CASE');
  const mk = m.marker(COUNTER, { r: 0.8, h: 2.6, color: 0x7bd88f }); const b = m.blip(COUNTER, { color: '#ffd36b', size: 7 });
  await m.until(() => { const ok = m.near(COUNTER, 1.9, G.player.pos); G.hud.promptOverride = ok ? '<kbd>E</kbd> Smash the case' : null; return ok && G.input.pressed('interact'); });
  G.hud.promptOverride = null; m.unmark(mk); m.unblip(b);
  if (G.fx) G.fx.glass(V3(COUNTER.x, 1.2, COUNTER.z), 30, V3(0, 1, 0), 3); if (G.audio) G.audio.glass(COUNTER, 1);
  m.vars.key = true; G.stunts.award('MERIDIAN STAR', 300, 'KEY ACQUIRED');
  fixer.passive = false; fixer.calm = false; fixer.alert();
}
async function cp2(m, fresh) {
  if (fresh) { setup(m, { inside: true }); m.vars.key = true; showroom(m); G.player.teleport(-144, FLOOR, 404, Math.PI); m.music('mall', 3); }
  G.player.setWeapon('smg');
  const sh = shutters(); m.intensity(4); G.input.rumble(0.6, 0.6, 500);
  const alarm = G.audio && G.audio.createLoop('alarm', { ref: 30, wet: 0.7 }); if (alarm) { alarm.update(V3(-150, 6, 400), 0.6); m.track({ dispose: () => alarm.dispose() }); }
  m.say('JUNO', 'LOCKDOWN! Shutters are dropping on both ends — and something just landed on the roof.');
  // the shutters roll down (south closes fully; north jams half way — remember that)
  const lower = (s, to, secs) => { const from = s.low; let t = 0; const off = m.r.flow.game.addUpdater((dt) => { if (G.paused) return; t += dt; const k = Math.min(1, t / secs); set(s, from + (to - from) * k); if (k >= 1) off(); }); m.ents.offs.push(off); };
  lower(sh.s, 0, 6); lower(sh.n, 2.2, 7);
  // Halcyon rappels through the skylight
  await m.wait(1.6);
  const drops = [[-152, 430], [-146, 436], [-155, 372], [-145, 366], [-150, 452]];
  for (const [x, z] of drops) { if (G.fx) G.fx.glass(V3(x, 9, z), 22, V3(0, -1, 0), 4); }
  if (G.audio) G.audio.glass(V3(-150, 9, 400), 1);
  const ropes = new THREE.Group(); for (const [x, z] of drops) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 8.8, 4), new THREE.MeshBasicMaterial({ color: 0x111111 })); r.position.set(x, 4.6, z); ropes.add(r); } G.scene.add(ropes); m.track(ropes);
  m.slowmo(1.1, 0.35);
  const squad = drops.map(([x, z], i) => m.npc('halcyon', x, FLOOR, z, z > 400 ? Math.PI : 0, { role: i % 2 ? 'flank' : 'hold', acc: 0.4 }));
  const guards = [[-158, 340], [-142, 470]].map(([x, z]) => m.npc('guard', x, FLOOR, z, 0, { role: 'hold' }));
  m.vars.squad = [...squad, ...guards, m.vars.fixer].filter(Boolean);
  for (const p of G.peds.list) { const hp = p.human && p.human.pos; if (hp && hp.x > MX0 && hp.x < MX1 && hp.z > MZ0 && hp.z < MZ1 && p.flee) p.flee(V3(-150, 1, 400)); }
  m.say('DEZ', 'Halcyon tactical! Use the kiosks for cover, Kit. Keep moving.');
  const blips = squad.map((n) => m.blip(() => n.pos, { color: '#ff4d4d', size: 4 }));
  const left = () => squad.filter((n) => n.alive).length;
  m.objective(`TAKE DOWN THE HALCYON TEAM (${squad.length - left()}/${squad.length})`, 'USE THE KIOSKS AND PLANTERS FOR COVER');
  let last = left();
  await m.until(() => { const l = left(); if (l !== last) { last = l; m.objective(`TAKE DOWN THE HALCYON TEAM (${squad.length - l}/${squad.length})`, 'USE THE KIOSKS AND PLANTERS FOR COVER'); squad.forEach((n, i) => { if (!n.alive && blips[i]) { m.unblip(blips[i]); blips[i] = null; } }); } return l === 0; }, { timeout: 150 });
  for (const b of blips) if (b) m.unblip(b);
}
async function cp3(m, fresh) {
  const sh = shutters();
  if (fresh) { setup(m, { inside: true }); m.vars.key = true; showroom(m); set(sh.s, 0); set(sh.n, 2.2); G.player.teleport(-150, FLOOR, 380, 0); m.music('mall', 4); }
  const v = m.vars.vortice; m.intensity(4);
  m.say('JUNO', 'South shutter\'s sealed. North one jammed halfway, but it\'s still creeping down.');
  await m.sayWait('KIT', 'Then I\'m not walking out.', 1.8);
  m.say('DEZ', 'The grand prize car. On the podium. Promo cars always have the keys in — GO!');
  m.objective('STEAL THE VORTICE', 'THE ORANGE CAR ON THE SHOWROOM PODIUM');
  const b = m.blip(() => v.pos, { color: '#ffd36b', size: 7 }); const mk = m.marker(V3(v.pos.x, FLOOR, v.pos.z), { r: 3.4, h: 6 });
  await m.until(() => G.player.vehicle === v); m.unblip(b); m.unmark(mk); v.engineOn = true; v.lightsOn = true;
  if (G.audio) G.audio.ui('pickup'); G.stunts.award('GRAND PRIZE', 400, 'YOU WIN!');
  // north shutter creeps down to 1.3 m: the Vortice (1.15 m) only just fits
  const from = sh.n.low; let t = 0; const off = m.r.flow.game.addUpdater((dt) => { if (G.paused) return; t += dt; set(sh.n, Math.max(1.3, from - t * 0.11)); }); m.ents.offs.push(off);
  m.say('JUNO', 'Down the promenade, under the shutter, through the doors. Duck!');
  m.objective('DRIVE OUT THE NORTH END', 'FLOOR IT DOWN THE PROMENADE — UNDER THE SHUTTER');
  const exit = V3(-150, FLOOR, MZ1 + 12); const xb = m.blip(exit, { color: '#ffd36b', size: 7 }); const xm = m.marker(V3(-150, FLOOR, MZ1 - 3), { r: 4, h: 3 });
  let slowed = false;
  await m.until(() => { const p = G.player.focus; if (!slowed && G.player.vehicle && p.z > MZ1 - 10 && G.player.vehicle.speed > 9) { slowed = true; m.slowmo(1.0, 0.3); G.cam.shake(0.25); } return p.z > MZ1 + 4 && p.x > MX0 - 4 && p.x < MX1 + 4; });
  m.unblip(xb); m.unmark(xm); G.stunts.award('LIMBO!', 700, 'UNDER THE SHUTTER');
}
async function cp4(m, fresh) {
  if (fresh) { setup(m, { inside: true }); m.vars.key = true; const v = m.vehicle('super', { x: -150, z: 500, yaw: Math.PI / 2, color: 0xff6b00 }); m.vars.vortice = v; playerIn(v); m.music('mall', 4); }
  m.intensity(4); G.police.setStars(3); G.police.minStars = 2;
  spawnHunters(m, 3, 2, false, 90, 170);
  m.say('DEZ', 'Black SUVs coming in from every side — that\'s Halcyon, and the cops are right behind them.');
  m.objective('SHAKE THE CONVOY', 'HEAD NORTH-EAST TOWARD THE BEACH');
  await m.wait(10);
  m.say('JUNO', 'Kit… the key is pinging. It\'s a BEACON. They\'re not chasing you — they\'re following it.');
  await m.sayWait('KIT', 'So I ditch it?', 1.6);
  m.say('JUNO', 'Salt water fries it. Sunstrip Pier. Drive it off the end — I\'ll be waiting with the boat.');
  m.objective('GET TO SUNSTRIP PIER', 'ALL THE WAY NORTH — WHERE THE FERRIS WHEEL IS');
  const pier = PIER(G); await m.goTo(V3(pier.x, 0.6, 640), null, '', { r: 9 });
}
async function cp5(m, fresh) {
  const pier = PIER(G);
  if (fresh) { setup(m, { inside: true }); m.vars.key = true; const v = m.vehicle('super', { x: pier.x, y: 0.6, z: 640, yaw: 0, color: 0xff6b00 }); m.vars.vortice = v; playerIn(v); m.music('mall', 4); G.police.setStars(3); spawnHunters(m, 2, 2, false, 90, 150); }
  G.police.minStars = 2; m.intensity(4);
  m.say('JUNO', 'Straight down the boards. Don\'t lift. Don\'t brake. Trust me.');
  m.objective('DRIVE OFF THE END OF THE PIER', 'FULL SPEED — UNDER THE FERRIS WHEEL');
  const end = V3(pier.x, 0.6, pier.z1 - 4); const b = m.blip(end, { color: '#ffd36b', size: 7 }); const mk = m.marker(end, { r: 6, h: 14 });
  await m.until(() => G.player.vehicle && G.player.focus.z > pier.z1 + 0.5 && Math.abs(G.player.focus.x - pier.x) < 12);
  m.unblip(b); m.unmark(mk);
  const v = G.player.vehicle; if (v) { v.vel.y = Math.max(v.vel.y, 4.5); v.vel.multiplyScalar(1.12); }
  G.stunts.award('LEAP OF FAITH', 900, 'OFF THE PIER'); m.slowmo(2.2, 0.25);
  await m.cine({ dur: 2.6, fov: 50, letterbox: true, pos: () => V3(pier.x + 14, 4, pier.z1 + 8), look: () => (v ? v.pos.clone() : V3(pier.x, 0, pier.z1 + 15)) });
}
async function cp6(m, fresh) {
  const pier = PIER(G);
  if (fresh) { setup(m, { inside: true }); m.vars.key = true; G.player.teleport(pier.x, -1.4, pier.z1 + 18, 0); }
  G.police.minStars = 0; G.police.setStars(0); m.vars.hunters.units.length = 0; m.intensity(2);
  // bail out of the sinking car
  await m.until(() => !G.player.vehicle || (G.player.vehicle.drowned && G.player.vehicle.pos.y < 0), { timeout: 4 });
  if (G.player.vehicle) { const p = G.player.vehicle.pos.clone(); G.player.leaveVehicleInstant(); G.player.teleport(p.x + 1.5, -1.4, p.z, 0); }
  G.player.carrying = null;
  m.say('KIT', '(gasping) …Beacon\'s dead.');
  // Juno's boat bobbing off the end of the pier
  const boat = new THREE.Group(); const hull = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.0, 7), new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.4 })); hull.position.y = 0.2; boat.add(hull);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.1, 6), new THREE.MeshStandardMaterial({ color: 0x8a6a48 })); deck.position.y = 0.75; boat.add(deck);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.0, 1.8), new THREE.MeshStandardMaterial({ color: 0x1c2b4a })); cab.position.set(0, 1.3, -0.6); boat.add(cab);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshBasicMaterial({ color: 0x7bd88f, toneMapped: false })); lamp.position.set(0, 2.0, -0.6); boat.add(lamp);
  const bp = V3(pier.x + 12, -0.8, pier.z1 + 26); boat.position.copy(bp); G.scene.add(boat); m.track(boat);
  const bob = m.r.flow.game.addUpdater(() => { boat.position.y = bp.y + Math.sin(G.time * 1.6) * 0.12; boat.rotation.z = Math.sin(G.time * 1.1) * 0.05; }); m.ents.offs.push(bob);
  m.objective('SWIM TO JUNO\'S BOAT', 'THE GREEN LIGHT OFF THE END OF THE PIER');
  await m.goTo(V3(bp.x, -0.8, bp.z), null, '', { r: 4 });
  m.lock(true); G.player.human.visible = false; m.intensity(1);
  const p = m.cine({ dur: 13, fov: 44, pos: (k) => V3(bp.x - 18 + k * 10, 6 + k * 4, bp.z - 20 - k * 12), look: () => boat.position.clone().add(V3(0, 1, 0)) });
  const sail = m.r.flow.game.addUpdater((dt) => { if (!G.paused) boat.position.x += dt * 6; }); m.ents.offs.push(sail);
  await m.sayWait('JUNO', 'You drove a two-million-dollar car into the ocean.', 3);
  await m.sayWait('KIT', 'It was a raffle prize. Technically nobody owned it yet.', 3.2);
  await m.sayWait('JUNO', 'The necklace. Hand it over.', 2.4);
  await m.sayWait('JUNO', '…Oh no. The beacon wasn\'t IN the key. The key was in the beacon. It\'s a backup of the whole drive.', 4.2);
  await m.sayWait('DEZ', 'So Halcyon just handed us the other half.', 2.8);
  await m.sayWait('JUNO', 'Or they wanted us to think so. Fifty-nine hours.', 3);
  await p; m.lock(false); G.player.human.visible = true;
}
export const M03 = {
  id: 'm03', num: 3, act: 0, title: 'SHOPPING SPREE', music: 'mall', par: 540,
  desc: 'Lift a Halcyon key from the Galleria, fight through a lockdown, steal the grand-prize car and drive it into the sea.',
  unlocks: [{ vehicle: 'super' }, { track: 'mall' }],
  deathText: 'KIT WENT DOWN', checkpoints: [cp0, cp1, cp2, cp3, cp4, cp5, cp6],
};
