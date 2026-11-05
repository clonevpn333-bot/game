// GETAWAY! — Mission 06: GUNSHIP
// You don't drive. You're on the door minigun of Juno's chopper while Dez and Gramps run a five-star gauntlet
// across the city below: shred the cruisers, blow the roadblock on the bridge before they hit it, swat two
// Halcyon gunships out of the sky, and take down the Warbird over the docks. Ends at the pier at sunset.
import * as THREE from 'three';
import { G } from '../core/context.js';
import { clamp, damp, dampAngle, rand } from '../core/utils.js';
import { V3, baseSetup, RouteAI, roadRoute, tickAIs } from './helpers.js';
import { Aircraft, GunnerSeat, Gunship, FlightHUD } from './air.js';

const START = [-150, -200];
export const DOCKS = [700, 200];
let ROUTE = null; // downtown -> the river bridge at z=0 -> Ironside docks
function route() { if (!ROUTE) { const segs = [[START, [300, 0]], [[300, 0], [520, 0]], [[520, 0], DOCKS]]; ROUTE = []; for (const [a, b] of segs) for (const p of roadRoute(a[0], a[1], b[0], b[1])) { const l = ROUTE[ROUTE.length - 1]; if (!l || Math.hypot(l.x - p.x, l.z - p.z) > 2) ROUTE.push(p); } } return ROUTE; }

// build the whole rig (crew car + Juno's chopper + door gun) at route index i
function rig(m, i) {
  const pts = route(); i = Math.min(i, pts.length - 2); const a = pts[i], b = pts[i + 1]; const yaw = Math.atan2(b.x - a.x, b.z - a.z);
  const car = m.vehicle('interceptor', { x: a.x, y: 0, z: a.z, yaw, color: 0x1b1d22 }); car.armor = 4; car.siren = false; car.lightsOn = true;
  const dmg = car.damage.bind(car); car.damage = (amt, p, d, src) => { if (src === G.player.human) return; dmg(amt * 0.55, p, d, src); }; // your rounds never hurt the crew
  const R = { pts, car, stopAt: null, speed: 25 }; const ai = new RouteAI(car, pts.slice(i + 1), { speed: () => (R.stopAt && car.pos.distanceTo(R.stopAt) < 115 ? 0 : R.speed) });
  const heli = new Aircraft('heli', { pos: V3(a.x - 20, 40, a.z - 20), yaw, color: 0x2c3e50, accent: 0xf1c40f }); heli.maxHp = heli.hp = 900;
  heli.sphere.hit = (d, p) => heli.damage(d * 0.3, p); const gun = new GunnerSeat(heli); gun.ammo = 30; R.heli = heli; R.gun = gun; R.ai = ai; R.gunships = [];
  const P = G.player; P.riding = heli; P.human.visible = false; G.cam.custom = () => gun.camShot(); FlightHUD.show(heli, gun);
  R.off = m.r.flow.game.addUpdater((dt) => {
    if (G.mission !== m.r || G.paused || !heli.alive) return; const t = G.time;
    // Juno flies a lazy orbit off the car's flank, above the rooftops
    const c = car.pos; const side = Math.sin(t * 0.25) > 0 ? 1 : -1; const f = V3(Math.sin(car.yaw), 0, Math.cos(car.yaw));
    const want = c.clone().addScaledVector(f, -14).add(V3(-f.z * 22 * side, 0, f.x * 22 * side)); const roof = G.world.static.groundAt(want.x, want.z, 400, 0).h; want.y = Math.max(c.y + 26, roof + 16);
    heli.pos.x = damp(heli.pos.x, want.x, 0.9, dt); heli.pos.z = damp(heli.pos.z, want.z, 0.9, dt); heli.pos.y = damp(heli.pos.y, want.y, 1.2, dt);
    heli.yaw = dampAngle(heli.yaw, Math.atan2(c.x - heli.pos.x, c.z - heli.pos.z) + Math.PI / 2 * side, 1.2, dt); heli.roll = Math.sin(t * 0.7) * 0.08; heli.pitch = 0.05; heli.vel.set(0, 0, 0);
    heli.hp = Math.min(heli.maxHp, heli.hp + dt * 4); car.hp = Math.min(car.maxHp, car.hp + dt * 1.5); if (car.hp > car.maxHp * 0.3) car.smoking = 0; heli.update(dt, null); heli.rockets.update(dt); gun.update(dt, G.input);
    for (const s of R.gunships) if (!s.gone) s.update(dt, heli.pos);
    FlightHUD.extra = `CREW CAR <b style="color:${car.hp / car.maxHp > 0.4 ? '#7bd88f' : '#ff3b2f'}">${Math.max(0, car.hp / car.maxHp * 100).toFixed(0)}%</b>`; FlightHUD.update();
    for (const u of G.police.units) if (u.ai) u.ai.hostile = true;
  });
  m.ents.offs.push(R.off); tickAIs(m, [ai]);
  m.track({ dispose: () => { heli.dispose(); for (const s of R.gunships) s.dispose(); FlightHUD.hide(); FlightHUD.extra = ''; P.riding = null; P.human.visible = true; G.cam.custom = null; } });
  m.on('aircraftDown', () => m.fail('JUNO\'S CHOPPER WENT DOWN'));
  const lost = m.r.flow.game.addUpdater(() => { if (G.mission === m.r && (car.dead || car.hp <= 0)) m.fail('THE CREW DIDN\'T MAKE IT'); }); m.ents.offs.push(lost);
  m.vars.R = R; return R;
}
function setup(m) {
  baseSetup(m, { hour: 18.6, weather: 'clear', tier: 3, maxStars: 5, dmg: 0.5, acc: 0.6, weapons: ['rifle'] });
  G.police.unitCap = 5; m.ents.offs.push(() => { G.police.unitCap = 0; });
  G.traffic.populate(); G.peds.populate();
}
const idxNear = (pts, test) => { for (let i = 0; i < pts.length; i++) if (test(pts[i])) return i; return 0; };
async function waitCar(m, R, pred) { await m.until(() => pred(R.car.pos)); }

async function cp0(m) {
  setup(m); const R = rig(m, 0); m.music('fivestar', 4);
  m.r.flow.showIntro(m.def); m.lock(true);
  await m.cine({ dur: 5, fov: 50, pos: (k) => R.heli.pos.clone().add(V3(Math.cos(k * 2) * 18, 4 - k * 2, Math.sin(k * 2) * 18)), look: () => R.heli.pos.clone() });
  m.r.flow.hideIntro(); m.lock(false);
  m.say('JUNO', 'Strapped in back there? Good. You\'re on the minigun. Mouse aims, CLICK shoots, RIGHT-CLICK fires rockets.');
  G.police.setStars(5); G.police.minStars = 5;
  let kills = 0; const seen = new Set(); m.objective('COVER THE CREW', 'DESTROY POLICE CRUISERS (0/8)');
  const off = m.r.flow.game.addUpdater(() => { for (const u of G.police.units) if (u.v.dead && !seen.has(u.v)) { seen.add(u.v); kills++; m.objective('COVER THE CREW', `DESTROY POLICE CRUISERS (${Math.min(8, kills)}/8)`); if (G.stunts) G.stunts.award('CRUISER DOWN', 250); } }); m.ents.offs.push(off);
  await m.wait(4); m.say('DEZ', 'They\'re all over us! Light them UP!');
  await m.until(() => kills >= 8 || R.car.pos.x > 240, { timeout: 200 }); off(); // the kill count keeps running into the bridge fight
}
async function cp1(m, fresh) {
  let R = m.vars.R; if (fresh || !R || R.heli.disposed) { setup(m); R = rig(m, idxNear(route(), (p) => p.x > 250)); m.music('fivestar', 4); G.police.setStars(5); G.police.minStars = 5; }
  // roadblock on the bridge the route crosses
  const bi = idxNear(R.pts, (p) => p.x > 362 && p.x < 438); const bp = R.pts[bi]; const nx = R.pts[Math.min(bi + 1, R.pts.length - 1)]; const yaw = Math.atan2(nx.x - bp.x, nx.z - bp.z) + Math.PI / 2;
  const block = []; for (let k = -2; k <= 2; k++) { const v = m.vehicle(k === 0 ? 'armored' : 'police', { x: bp.x + Math.sin(yaw) * k * 4.2, z: bp.z + Math.cos(yaw) * k * 4.2, yaw }); v.siren = true; v.lightsOn = true; v.ai = { kind: 'pursuit', hostile: true, update() {} }; block.push(v); }
  for (let k = 0; k < 4; k++) m.npc('swat', bp.x + rand(-8, 8), (bp.y || 0) + 0.2, bp.z + rand(-8, 8), 0, { role: 'hold', acc: 0.4 });
  R.stopAt = bp.clone();
  m.say('GRAMPS', 'Roadblock on the bridge! I am NOT ramming an armored truck at my age!');
  m.objective('BLOW THE BRIDGE ROADBLOCK', 'ROCKETS ON THE ARMORED TRUCK — THEY\'RE WAITING FOR YOU');
  const blip = m.blip(bp, { color: '#ff3b2f', size: 7, waypoint: true });
  const cleared = () => block.every((v) => v.dead || v.hp <= 0 || v.removed || v.pos.distanceTo(bp) > 12 || v.mode === 'rigid');
  const ok = await m.until(cleared, { timeout: 90 }); m.unblip(blip);
  if (!ok) { m.say('DEZ', 'Screw it — HOLD ON TO SOMETHING!'); for (const v of block) if (!v.dead && !v.removed) { v.toRigid(V3(rand(-2, 2), rand(1, 3), rand(-2, 2))); v.rigid.vel.y += 6; G.emit('explosion', v.pos.clone(), 0.9, 'ram', null); } } // never a soft-lock
  m.slowmo(1.0, 0.35); m.say('DEZ', 'HA! Bridge is OPEN!'); R.stopAt = null; R.speed = 28; if (G.stunts) G.stunts.award('ROADBLOCK OBLITERATED', 900);
  await m.until(() => R.car.pos.x > 450, { timeout: 60 });
}
async function cp2(m, fresh) {
  let R = m.vars.R; if (fresh || !R || R.heli.disposed) { setup(m); R = rig(m, idxNear(route(), (p) => p.x > 460)); m.music('fivestar', 4); G.police.setStars(4); G.police.minStars = 3; }
  m.say('JUNO', 'Contacts, two o\'clock — black choppers, no markings. Halcyon. They\'re coming for ME.');
  const hp = R.heli.pos; for (let k = 0; k < 2; k++) R.gunships.push(new Gunship(hp.clone().add(V3(150 + k * 60, 30, -120 + k * 200)), { hp: 420, aggro: 1 }));
  m.objective('SHOOT DOWN THE GUNSHIPS', 'ROCKETS LOCK ON — CLICK TO SHRED, RIGHT-CLICK TO FINISH');
  const bl = R.gunships.map((s) => m.blip(() => (s.alive ? s.pos : null), { color: '#ff3b2f', size: 6 }));
  await m.until(() => R.gunships.every((s) => !s.alive), { timeout: 240 }); bl.forEach((b) => m.unblip(b)); R.gun.ammo += 12;
  m.say('GRAMPS', 'Two for two! Somebody give that kid a raise!');
}
async function cp3(m, fresh) {
  let R = m.vars.R; if (fresh || !R || R.heli.disposed) { setup(m); R = rig(m, idxNear(route(), (p) => p.x > 470 && p.z > 80)); m.music('fivestar', 4); G.police.setStars(3); }
  G.police.minStars = 0; m.intensity(4);
  m.say('JUNO', 'Oh no. That one\'s not a chopper, that\'s a FLYING TANK.');
  const boss = new Gunship(R.heli.pos.clone().add(V3(-160, 40, 120)), { hp: 1700, aggro: 1.5, accent: 0xff2a2a, bulletMul: 0.05, rocketMul: 0.55 }); boss.g.scale.setScalar(1.7); boss.sphere.r = 7; boss.rad = 55; R.gunships.push(boss);
  const bb = m.blip(() => (boss.alive ? boss.pos : null), { color: '#ff3b2f', size: 9 });
  const bar = m.r.flow.game.addUpdater(() => { G.hud.warnOverride = boss.alive ? `HALCYON WARBIRD ${'█'.repeat(Math.ceil(boss.hp / boss.maxHp * 20))}` : null; }); m.ents.offs.push(bar);
  m.objective('TAKE DOWN THE WARBIRD', 'IT ONLY GOES DOWN TO ROCKETS + SUSTAINED FIRE');
  await m.until(() => !boss.alive, { timeout: 300 }); bar(); G.hud.warnOverride = null; m.unblip(bb); m.slowmo(2, 0.25);
  m.say('DEZ', 'IT\'S GOING DOWN — RIGHT INTO THE CONTAINERS!'); if (G.stunts) G.stunts.award('WARBIRD DESTROYED', 2500);
  await m.wait(3);
  // the crew reach the docks: a container ship with its doors open; Juno sets down on the quay at sunset
  R.speed = 22; m.objective('GET THE CREW TO THE DOCKS', 'CONTAINER 4417 IS WAITING');
  const dk = V3(DOCKS[0], 0, DOCKS[1]); const db = m.blip(dk, { color: '#ffd36b', size: 7 });
  await m.until(() => R.car.pos.distanceTo(dk) < 25 || R.ai.done, { timeout: 120 }); m.unblip(db);
  G.police.reset(); m.intensity(1); m.lock(true); const end = V3(DOCKS[0] + 30, 6, DOCKS[1] + 10);
  const p = m.cine({ dur: 12, fov: 45, pos: (k) => V3(DOCKS[0] - 30 + k * 20, 10 + k * 8, DOCKS[1] - 40 + k * 15), look: () => R.heli.pos.clone().lerp(R.car.pos, 0.5) });
  const glide = m.r.flow.game.addUpdater((dt) => { R.heli.pos.lerp(end, dt * 0.4); }); m.ents.offs.push(glide);
  await m.sayWait('JUNO', 'Container\'s sealed, ship sails at nine. Port Sol\'s finest are still looking for us downtown.', 3.6);
  await m.sayWait('GRAMPS', 'Forty years. Never once had air support. I could get used to it.', 3.4);
  await m.sayWait('DEZ', 'Don\'t. Halcyon just lost three gunships. They\'re going to send something worse.', 3.6);
  await p; glide(); m.lock(false);
}
export const M06 = {
  id: 'm06', num: 6, act: 0, title: 'GUNSHIP', music: 'fivestar', par: 600,
  desc: 'You\'re the door gunner. Five stars, a roadblock on the bridge, Halcyon gunships, and a flying tank over the docks.',
  unlocks: [{ vehicle: 'interceptor' }], deathText: 'THE CHOPPER WENT DOWN', checkpoints: [cp0, cp1, cp2, cp3],
};
