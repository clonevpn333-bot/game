// GETAWAY! — Mission 09: NO PASSPORT
// Night, lightning storm, a stolen cargo jet and Halcyon's fighters. Drop under their radar by threading a ring
// course low through the city — down the highway, round the tower, over the river — then turn and fight them,
// take a hit in the engine, and bring a burning jet down on Sunstrip Beach. Nobody said anything about a runway.
import * as THREE from 'three';
import { G } from '../core/context.js';
import { clamp, rand } from '../core/utils.js';
import { V3, baseSetup } from './helpers.js';
import { Aircraft, EnemyJet, Gunship, board, unboard, FlightHUD } from './air.js';

// ring course (x, y above ground, z): highway corridor -> downtown -> river run -> docks
const RINGS = [[-900, 40, -550], [-500, 30, -550], [-100, 30, -550], [250, 34, -500], [300, 60, -250], [150, 70, -60], [-60, 60, 120], [200, 45, 300], [400, 26, 420], [400, 24, 150], [620, 40, 0]];
let RING_MAT = null;
function ringMesh() { if (!RING_MAT) RING_MAT = new THREE.MeshBasicMaterial({ color: 0x46f0ff, toneMapped: false }); const m = new THREE.Mesh(new THREE.TorusGeometry(13, 0.5, 8, 48), RING_MAT); return m; }

function setup(m) {
  baseSetup(m, { hour: 1.0, weather: 'storm', tier: 1, maxStars: 0, dmg: 0.6, acc: 0.6 });
  G.police.enabled = false; m.ents.offs.push(() => { G.police.enabled = true; }); G.traffic.populate();
}
function jet(m, pos, yaw) {
  const pl = new Aircraft('plane', { pos, yaw, color: 0x1b1f24, accent: 0xd4a017 }); pl.grounded = false; pl.throttle = 0.75; pl.speed = 70; board(pl); m.vars.pl = pl;
  m.track({ dispose: () => { pl.dispose(); if (G.player.riding === pl) unboard(); } });
  const enemies = m.vars.enemies = [];
  const up = m.r.flow.game.addUpdater((dt) => { if (G.mission !== m.r || G.paused) return; pl.update(dt, m.r.cine ? null : G.input); for (const e of enemies) if (!e.gone) e.update(dt, pl.pos); FlightHUD.update(); });
  m.ents.offs.push(up); m.track({ dispose: () => { for (const e of enemies) if (!e.gone) e.dispose(); } }); m.on('aircraftDown', () => m.fail('THE JET WENT DOWN IN THE STORM')); return pl;
}
async function cp0(m) {
  setup(m); const pl = jet(m, V3(-1350, 180, -560), Math.PI / 2); m.music('skyline', 3);
  m.r.flow.showIntro(m.def); m.lock(true);
  await m.cine({ dur: 5, fov: 46, pos: (k) => pl.pos.clone().add(V3(30 - k * 50, 8, 40 - k * 20)), look: () => pl.pos.clone() }); m.r.flow.hideIntro(); m.lock(false);
  m.say('JUNO', 'Three Halcyon fighters on radar and they\'ve got us. Get LOW — under sixty metres they lose you in the ground clutter.');
  const jets = m.vars.enemies; for (let i = 0; i < 3; i++) jets.push(new EnemyJet(pl.pos.clone().add(V3(-500 - i * 80, 60, rand(-200, 200))), { hp: 280, aggro: 0.8 }));
  m.objective('FLY THE RING COURSE', `STAY LOW THROUGH THE CITY (0/${RINGS.length}) · W/S THROTTLE · SPACE/C PITCH · A/D BANK`);
  const S = G.world.static; let i = 0; let mesh = null, blip = null;
  const place = () => { if (mesh) G.scene.remove(mesh); if (blip) m.unblip(blip); if (i >= RINGS.length) return; const [x, h, z] = RINGS[i]; const gy = S.groundAt(x, z, 600, 0).h; const p = V3(x, Math.max(gy, 0) + h, z); const nx = RINGS[Math.min(i + 1, RINGS.length - 1)];
    mesh = ringMesh(); mesh.position.copy(p); mesh.lookAt(nx[0], p.y, nx[2]); if (i === RINGS.length - 1) mesh.rotation.y += Math.PI / 2; G.scene.add(mesh); blip = m.blip(p, { color: '#ffd36b', size: 7, waypoint: true }); m.vars.ringP = p; };
  m.track({ dispose: () => { if (mesh) G.scene.remove(mesh); } }); place();
  await m.until(() => { const p = m.vars.ringP; if (p && pl.pos.distanceTo(p) < 16) { i++; if (G.audio) G.audio.ui('pickup'); if (G.stunts) G.stunts.award('THREADED IT', 150); G.hud.objective('FLY THE RING COURSE', `STAY LOW THROUGH THE CITY (${i}/${RINGS.length})`); place(); } return i >= RINGS.length; });
  m.say('DEZ', 'They lost you in the clutter! …and now they\'ve found you again. Turn and FIGHT.');
}
async function cp1(m, fresh) {
  let pl = m.vars.pl; if (fresh || !pl || pl.disposed) { setup(m); pl = jet(m, V3(620, 120, 0), Math.PI); m.music('skyline', 4); }
  m.intensity(4); const jets = m.vars.enemies; while (jets.filter((j) => j.alive).length < 3) jets.push(new EnemyJet(pl.pos.clone().add(V3(rand(-400, 400), 80, rand(-400, 400))), { hp: 280, aggro: 1 }));
  jets.push(new Gunship(pl.pos.clone().add(V3(200, 20, -150)), { hp: 380, aggro: 1 }));
  const bl = jets.map((j) => m.blip(() => (j.alive ? j.pos : null), { color: '#ff3b2f', size: 6 })); pl.ammo = Math.max(pl.ammo, 30);
  m.objective('DOGFIGHT', 'SHOOT DOWN EVERYTHING — CLICK GUNS · RIGHT-CLICK HOMING ROCKETS');
  await m.until(() => jets.every((j) => !j.alive), { timeout: 360 }); bl.forEach((b) => m.unblip(b)); m.slowmo(1.6, 0.3);
}
async function cp2(m, fresh) {
  let pl = m.vars.pl; if (fresh || !pl || pl.disposed) { setup(m); pl = jet(m, V3(300, 160, -100), Math.PI); m.music('skyline', 4); }
  // a last burst rakes the left engine: fire, power fading, and the only flat ground in reach is the beach
  G.emit('explosion', pl.pos.clone().add(V3(4, -1, 0)), 0.7, 'engine', null); pl.hp = Math.min(pl.hp, pl.maxHp * 0.4); pl.invuln = true; m.slowmo(1.2, 0.35); // scripted crash landing: you always walk away
  m.say('JUNO', 'Engine two is ON FIRE. We are not making Italy. We are barely making the beach.');
  const burn = m.r.flow.game.addUpdater((dt) => { if (G.mission !== m.r || !pl.alive) return; if (G.fx) { G.fx.fire(pl.pos.clone().add(V3(Math.cos(pl.yaw) * -4, -0.6, -Math.sin(pl.yaw) * -4)), 1.2); G.fx.smokePuff(pl.pos, { size: 3, life: 3, color: 0.12, alpha: 0.4 }); } pl.throttle = Math.min(pl.throttle, 0.45); pl.hp = Math.max(pl.hp, 30); }); m.ents.offs.push(burn);
  const beach = V3(150, 1.5, 680); const mk = m.marker(beach, { r: 30, h: 60 }); const bl = m.blip(beach, { color: '#ffd36b', size: 8, waypoint: true });
  m.objective('CRASH-LAND ON THE BEACH', 'COME IN LOW AND LEVEL OVER THE SAND · THROTTLE DOWN (S)');
  await m.until(() => ((pl.grounded || pl.pos.y < 4.5) && pl.pos.z > 600) || !pl.alive, { timeout: 240 }); m.unmark(mk); m.unblip(bl);
  if (!pl.alive) return; burn();
  // belly-slide across the sand, then the fire catches up
  G.cam.shake(1); for (let i = 0; i < 40; i++) { pl.speed *= 0.92; if (G.fx) G.fx.dust(pl.pos, 6, 4, 0.75); await m.wait(0.05); }
  m.lock(true); G.emit('explosion', pl.pos.clone(), 2.8, 'jet', null);
  unboard(pl.pos.clone().add(V3(25, 0.5, 18))); const p = m.cine({ dur: 12, fov: 44, pos: (k) => pl.pos.clone().add(V3(40 - k * 10, 6 + k * 4, 50 - k * 20)), look: () => pl.pos.clone() });
  await m.sayWait('GRAMPS', 'Everybody still got all their limbs? Good. I\'m never flying again.', 3.2);
  await m.sayWait('DEZ', 'The invoice. That jet was carrying Halcyon\'s ledger to Italy. And now it\'s on fire on a beach.', 3.8);
  await m.sayWait('JUNO', 'So we go to Italy ourselves. On a ferry. Like normal criminals.', 3.2);
  await p; m.lock(false);
}
export const M09 = {
  id: 'm09', num: 9, act: 1, title: 'NO PASSPORT', music: 'skyline', par: 600,
  desc: 'Night storm, stolen cargo jet, three Halcyon fighters. Thread a ring course through the city, win the dogfight, then crash-land on the beach.',
  unlocks: [{ track: 'skyline' }], deathText: 'THE JET WENT DOWN', checkpoints: [cp0, cp1, cp2],
};
