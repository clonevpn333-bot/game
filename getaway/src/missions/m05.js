// GETAWAY! — Mission 05: SKYFALL
// Gramps drops Kit by helicopter on the roof of the tallest tower downtown -> clear Halcyon's rooftop team -> ride a
// zipline 100 m down onto the next tower -> fight into Halcyon's glass penthouse and crack the wall safe (bearer
// bonds + the route of Halcyon's cash truck) -> SWAT and a police chopper hit the roof -> BASE-JUMP off the tower,
// freefall, pop the chute and steer onto the roof of the armored truck circling below -> take the truck, lose the
// cops, bring it home.
import * as THREE from 'three';
import { G } from '../core/context.js';
import { clamp, rand } from '../core/utils.js';
import { V3, baseSetup, playerIn, RouteAI, tickAIs, loseCops, roadRoute } from './helpers.js';
import { heliMesh, Gunship } from './air.js';
import { warmNew } from '../core/warm.js';
import { ride, unride } from './sea.js';
import { Zipline, ZipRider, Skydiver, penthouse, SafeCrack } from './sky.js';

const A = { x: -70, z: 70 }, B = { x: -130, z: 30 }; // the two towers (roof centres)
const LOOP = [V3(-100, 0, 0), V3(-100, 0, 100), V3(-200, 0, 100), V3(-200, 0, 0)]; // the cash truck circles tower B's block
const roofY = (t) => G.world.static.groundAt(t.x, t.z, 600, 0).h;
function setup(m, hour = 16.5) { baseSetup(m, { hour, weather: 'clear', tier: 2, maxStars: 4, dmg: 0.55, acc: 0.5, weapons: ['smg', 'rifle', 'shotgun'] }); G.traffic.populate(); G.peds.populate(); G.police.unitCap = 6; m.ents.offs.push(() => { G.police.unitCap = 0; }); }
function geom(m) { // zipline + penthouse (rebuilt per checkpoint start)
  if (m.vars.zip && !m.vars.zip.gone) return m.vars; const ya = roofY(A), yb = roofY(B); const d = V3(B.x - A.x, 0, B.z - A.z).normalize();
  const zip = new Zipline(V3(A.x + d.x * 6.5, ya + 2.7, A.z + d.z * 6.5), V3(B.x - d.x * 6.5, yb + 2.7, B.z - d.z * 6.5)); m.track({ dispose: () => { zip.gone = true; zip.dispose(); } });
  const ph = penthouse(V3(B.x + d.x * 2, 0, B.z + d.z * 2), yb, V3(-d.x, 0, -d.z)); m.track({ dispose: () => ph.dispose() }); warmNew();
  Object.assign(m.vars, { zip, ph, ya, yb, d }); return m.vars;
}
const alive = (l) => l.filter((q) => q.alive).length;
function squad(m, kind, pts, y, opts = {}) { return pts.map(([x, z]) => m.npc(kind, x, y + 0.2, z, rand(0, 6), { role: 'hold', acc: 0.42, ...opts })); }

// ---------------- 0: the drop ----------------
async function cp0(m) {
  setup(m); const g = geom(m); G.player.teleport(A.x - 3, g.ya + 0.2, A.z + 3, Math.PI); m.music('skyline', 2);
  const heli = heliMesh(0x2c3e50, 0xf1c40f); G.scene.add(heli.g); m.track({ dispose: () => G.scene.remove(heli.g) });
  m.r.flow.showIntro(m.def); m.lock(true); G.player.human.visible = false;
  const hp = (k) => V3(A.x + 60 - k * 60, g.ya + 40 - k * 36, A.z - 50 + k * 53); let t = 0;
  const hu = m.r.flow.game.addUpdater((dt) => { t += dt; const k = clamp(t / 5, 0, 1); heli.g.position.copy(t < 6.5 ? hp(k) : hp(1).add(V3((t - 6.5) * 22, (t - 6.5) * 9, -(t - 6.5) * 14))); heli.g.rotation.set(0.1, -0.9 + (t > 6.5 ? 0.6 : 0), 0.05); heli.rotor.rotation.y += dt * 40; heli.tr.rotation.x += dt * 50; if (t > 5.3) G.player.human.visible = true; }); m.ents.offs.push(hu);
  await m.cine({ dur: 6.5, fov: 48, pos: (k) => V3(A.x + 30 - k * 10, g.ya + 14 - k * 6, A.z + 34 - k * 16), look: () => V3(A.x, g.ya + 3, A.z) });
  m.r.flow.hideIntro(); m.lock(false);
  m.say('GRAMPS', 'Last stop, the top of the world. Mind the gap. It\'s about a hundred and seventy metres.', 4.6);
  const guards = squad(m, 'halcyon', [[A.x + 6, A.z - 6], [A.x - 6, A.z - 5], [A.x + 5, A.z + 6]], g.ya); G.police.setStars(0);
  const off = m.r.flow.game.addUpdater(() => G.hud.objective('CLEAR THE ROOF', `HALCYON ON THE ROOF: ${alive(guards)}`)); m.ents.offs.push(off); m.objective('CLEAR THE ROOF', '');
  await m.until(() => alive(guards) === 0, { timeout: 200 }); off(); for (const q of guards) if (q.alive) q.die(V3(0, 0, 1));
  m.say('JUNO', 'Penthouse is on the next tower down. Halcyon strung a zipline for deliveries. Be the delivery.', 4.5);
}
// ---------------- 1: the zipline ----------------
async function cp1(m, fresh) {
  if (fresh) { setup(m); const g0 = geom(m); G.player.teleport(A.x, g0.ya + 0.2, A.z, Math.PI); m.music('skyline', 3); }
  const g = geom(m); const z = g.zip; const st = z.a.clone().add(V3(0, -2.6, 0));
  const mk = m.marker(st, { r: 1.6, h: 3, color: 0x46f0ff }); const bl = m.blip(st, { color: '#ffd36b', size: 6, waypoint: true }); m.objective('RIDE THE ZIPLINE', 'PRESS E AT THE CABLE');
  await m.until(() => { const near = Math.hypot(G.player.pos.x - st.x, G.player.pos.z - st.z) < 2.6 && Math.abs(G.player.pos.y - st.y) < 2; G.hud.promptOverride = near ? '<kbd>E</kbd> Clip on' : null; return near && G.input.pressed('interact'); }, { timeout: 240 });
  G.hud.promptOverride = null; m.unmark(mk); m.unblip(bl);
  // B's rooftop team sees you coming
  const welcome = squad(m, 'halcyon', [[B.x - g.d.x * 4 + 5, B.z - g.d.z * 4 - 4], [B.x - g.d.x * 4 - 5, B.z - g.d.z * 4 + 4], [B.x + 7, B.z - 7], [B.x - 7, B.z + 7]], g.yb); m.vars.welcome = welcome;
  const rider = new ZipRider(z); ride(rider, null); m.slowmo(1.2, 0.45); if (G.audio) G.audio.whoosh(G.player.pos, 0.8, 1);
  const up = m.r.flow.game.addUpdater((dt) => { if (G.mission === m.r && !G.paused && G.player.riding === rider) rider.update(dt); }); m.ents.offs.push(up);
  m.say('KIT', 'Wheeeeeee—', 1.4); await m.until(() => rider.done, { timeout: 30 }); up(); rider.dispose(); unride();
  const land = z.b.clone().add(V3(-g.d.x * 0.5, -2.6 + 0.2, -g.d.z * 0.5)); G.player.teleport(land.x, g.yb + 0.2, land.z, z.yaw); G.player.startAction && G.player.startAction('roll', 0.55, { dir: g.d.clone(), sp: 5 });
  if (G.stunts) G.stunts.award('ZIPLINE', 400);
}
// ---------------- 2: the penthouse + the safe ----------------
async function cp2(m, fresh) {
  if (fresh) { setup(m); const g0 = geom(m); G.player.teleport(g0.zip.b.x, g0.yb + 0.2, g0.zip.b.z, Math.PI); m.music('skyline', 3); m.vars.welcome = squad(m, 'halcyon', [[B.x + 6, B.z - 6], [B.x - 6, B.z + 6], [B.x + 7, B.z + 5]], g0.yb); }
  const g = geom(m); const welcome = m.vars.welcome || [];
  const off = m.r.flow.game.addUpdater(() => G.hud.objective('TAKE THE ROOF', `HALCYON: ${alive(welcome)}`)); m.ents.offs.push(off); m.objective('TAKE THE ROOF', '');
  await m.until(() => alive(welcome) === 0, { timeout: 200 }); off(); for (const q of welcome) if (q.alive) q.die(V3(0, 0, 1));
  const sp = g.ph.safePos; const mk = m.marker(sp, { r: 1.2, h: 2.5 }); m.objective('CRACK THE SAFE', 'INSIDE THE PENTHOUSE');
  await m.until(() => { const near = Math.hypot(G.player.pos.x - sp.x, G.player.pos.z - sp.z) < 1.8; G.hud.promptOverride = near ? '<kbd>E</kbd> Crack the safe' : null; return near && G.input.pressed('interact'); }, { timeout: 240 });
  G.hud.promptOverride = null; m.unmark(mk); m.lock(true);
  const sc = new SafeCrack(g.ph.dial); m.vars.sc = sc; m.track({ dispose: () => sc.dispose() }); let skip = 0;
  sc.onMiss = (n) => { if (G.audio) G.audio.ui('error'); if (n === 2) m.say('JUNO', 'Easy... feel the tumblers. Don\'t force it.', 3); };
  const su = m.r.flow.game.addUpdater((dt) => { if (G.mission === m.r && !G.paused) { sc.update(dt, G.input); skip += dt; } }); m.ents.offs.push(su);
  await m.until(() => sc.done || skip > 60, { timeout: 70 }); su(); sc.dispose(); m.lock(false);
  if (G.audio) { G.audio.door(sp, true); G.audio.ui('pickup'); } G.player.carrying = { bag: true }; if (G.stunts) G.stunts.award('SAFECRACKER', sc.misses ? 500 : 1200);
  await m.sayWait('JUNO', 'Bearer bonds. And... Halcyon\'s cash truck schedule. It\'s circling YOUR block. Right now.', 4.2);
  m.say('DEZ', 'Sirens. LOTS of sirens. They\'re coming up the stairs AND by air!', 3.6);
}
// ---------------- 3: the raid on the roof ----------------
async function cp3(m, fresh) {
  if (fresh) { setup(m); const g0 = geom(m); G.player.teleport(g0.ph.safePos.x, g0.yb + 0.2, g0.ph.safePos.z, 0); G.player.carrying = { bag: true }; m.music('skyline', 4); }
  const g = geom(m); G.police.setStars(3); G.police.minStars = 3; m.intensity(4);
  const gs = new Gunship(V3(B.x + 120, g.yb + 40, B.z - 60), { hp: 300, aggro: 0.7, team: 'police', color: 0x1d2c4f, accent: 0xffffff }); m.track({ dispose: () => gs.dispose() });
  const gu = m.r.flow.game.addUpdater((dt) => { if (G.mission === m.r && !gs.gone) gs.update(dt, G.player.pos); }); m.ents.offs.push(gu);
  const edge = (a) => [B.x + Math.cos(a) * 8, B.z + Math.sin(a) * 8];
  for (const [n, msg] of [[4, 'SWAT ON THE ROOF'], [5, 'MORE OF THEM']]) {
    const w = squad(m, 'swat', Array.from({ length: n }, (_, i) => edge(i / n * Math.PI * 2 + rand(-0.3, 0.3))), g.yb, { acc: 0.38 });
    const off = m.r.flow.game.addUpdater(() => G.hud.objective(msg, `SWAT: ${alive(w)}`)); m.ents.offs.push(off); m.objective(msg, '');
    await m.until(() => alive(w) <= 1, { timeout: 200 }); off(); for (const q of w) if (q.alive) q.die(V3(0, 0, 1));
  }
  m.say('JUNO', 'Truck\'s coming round the corner below. There\'s a parachute rig on the roof — JUMP. Pop it with SPACE, steer with W A S D.', 6);
}
// ---------------- 4: base jump onto the truck ----------------
async function cp4(m, fresh) {
  if (fresh) { setup(m); geom(m); G.police.setStars(3); m.music('skyline', 4); }
  const g = geom(m); if (fresh) G.player.teleport(B.x, g.yb + 0.2, B.z, 0); G.player.carrying = { bag: true }; G.police.minStars = 0;
  // the armored cash truck circling the block
  let truck = m.vars.truck; if (!truck || truck.dead || truck.removed) { truck = m.vehicle('armored', { x: LOOP[0].x - 4, z: LOOP[0].z + 30, yaw: 0, color: 0x2c3e50 }); m.vars.truck = truck; truck.armor = 3; const ai = new RouteAI(truck, LOOP.map((p) => p.clone()), { speed: 11, loop: true, aggressive: false }); truck.hasDriver = true; tickAIs(m, [ai]); }
  const tb = m.blip(() => truck.pos, { color: '#ff3b2f', size: 8, waypoint: true }); m.objective('BASE JUMP ONTO THE TRUCK', 'RUN OFF THE EDGE · SPACE OPENS THE CHUTE');
  let sky = null; const top = () => truck.pos.y + (truck.spec.H || 2.6);
  const su = m.r.flow.game.addUpdater((dt) => { if (G.mission !== m.r || G.paused) return; const P = G.player;
    if (!sky && !P.riding && !P.vehicle && P.pos.y < g.yb - 1.2 && P.pos.y > 20 && Math.hypot(P.pos.x - B.x, P.pos.z - B.z) < 30) { sky = new Skydiver(P.pos.clone(), V3(P.vel.x, Math.min(-1, P.vy || -1), P.vel.z), P.human.yaw); m.vars.sky = sky; ride(sky, null); m.slowmo(1, 0.5); if (G.audio) G.audio.whoosh(P.pos, 1, 1); }
    if (sky && P.riding === sky) { sky.update(dt, m.r.cine ? null : G.input); G.hud.objective(sky.state === 'free' ? 'FREEFALL' : 'STEER ONTO THE TRUCK', sky.state === 'free' ? 'SPACE — OPEN THE CHUTE' : `${Math.max(0, sky.pos.y - top()).toFixed(0)} M ABOVE THE TRUCK · W DIVE · S FLARE`); } });
  m.ents.offs.push(su); m.track({ dispose: () => { if (sky) { sky.dispose(); if (G.player.riding === sky) unride(); } } });
  const r = await m.race([() => sky && G.player.riding === sky && sky.state === 'chute' && Math.hypot(sky.pos.x - truck.pos.x, sky.pos.z - truck.pos.z) < 3.4 && sky.pos.y < top() + 2.2 && sky.pos.y > top() - 1.2, () => sky && sky.landed, () => G.player.vehicle === truck]);
  m.unblip(tb);
  if (r === 1 && sky.splat) { unride(); G.player.die('fall'); return; }
  if (r === 0) { // stuck the landing on the roof -> through the hatch, driver out, wheel's ours
    unride(); sky.dispose(); G.player.teleport(truck.pos.x, top(), truck.pos.z, truck.yaw); m.slowmo(1.6, 0.3); if (G.stunts) G.stunts.award('TRUCK DROP', 2500); if (G.audio) G.audio.thud(truck.pos, 1.2);
    await m.wait(0.6); if (G.peds && G.peds.ejectDriver) G.peds.ejectDriver(truck, G.player); playerIn(truck); }
  else if (r === 1) { unride(); sky.dispose(); G.player.teleport(sky.pos.x, sky.pos.y + 0.1, sky.pos.z, sky.yaw); m.say('JUNO', 'You missed it! Grab a car and get on that truck!', 3.5); const tb2 = m.blip(() => truck.pos, { color: '#ff3b2f', size: 8, waypoint: true }); m.objective('CATCH THE TRUCK', 'STEAL A CAR · OR JUST RUN AT IT AND PRESS F'); await m.until(() => G.player.vehicle === truck, { timeout: 400 }); m.unblip(tb2); }
  G.player.carrying = null; G.police.setStars(3); m.intensity(4);
  m.say('GRAMPS', 'You\'re driving a bank vault. Every cop in the city just looked up.', 3.6);
  await loseCops(m);
  // no garage this time: Gramps is on the highway in a big rig with the back ramp down. Match speed and drive INTO it.
  m.say('GRAMPS', 'Look for the big rig doing seventy with its mouth open. That\'s me. Drive in. Don\'t scratch my trailer.', 5);
  const P = G.player; const route = roadRoute(P.pos.x, P.pos.z, P.pos.x > -300 ? -900 : 400, P.pos.z > 0 ? -600 : 600); const start = route[Math.min(route.length - 1, 3)] || route[0];
  const rig = m.vehicle('truck', { x: start.x, z: start.z, yaw: Math.atan2((route[4] || start).x - start.x, (route[4] || start).z - start.z), color: 0x8a3b2f }); rig.armor = 5;
  const ramp = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.12, 3.2), new THREE.MeshStandardMaterial({ color: 0x5a5f66, metalness: 0.6, roughness: 0.4 })); ramp.position.set(0, 0.75, -rig.spec.L / 2 - 1.4); ramp.rotation.x = -0.32; ramp.castShadow = true; rig.root.add(ramp);
  const ai = new RouteAI(rig, route.slice(4), { speed: () => (Math.hypot(P.pos.x - rig.pos.x, P.pos.z - rig.pos.z) < 60 ? 20 : 12), aggressive: false }); tickAIs(m, [ai]);
  const rb = m.blip(() => rig.pos, { color: '#ffd36b', size: 8, waypoint: true }); m.objective('DRIVE INTO GRAMPS\'S TRUCK', 'COME UP BEHIND IT · MATCH ITS SPEED');
  let held = 0; await m.until(() => { const v = P.vehicle; if (v !== truck) return false; const back = V3(rig.pos.x - Math.sin(rig.yaw) * (rig.spec.L / 2 + 4), 0, rig.pos.z - Math.cos(rig.yaw) * (rig.spec.L / 2 + 4)); const d = Math.hypot(v.pos.x - back.x, v.pos.z - back.z); const rel = Math.abs(v.speed - rig.speed);
    held = d < 9 && rel < 7 ? held + 1 / 60 : 0; G.hud.warnOverride = d < 20 ? (d < 9 ? (rel < 7 ? 'HOLD IT...' : 'MATCH HIS SPEED') : 'CLOSER') : null; return held > 0.6 || (d < 5 && rel < 10); }, { timeout: 400 });
  G.hud.warnOverride = null; m.unblip(rb); m.lock(true); m.slowmo(1.8, 0.35); if (G.stunts) G.stunts.award('TROJAN TRUCK', 2500);
  // the cash truck rolls up the ramp and the doors swing shut
  const sync = m.r.flow.game.addUpdater((dt) => { const k = clamp((sync.t = (sync.t || 0) + dt) / 1.6, 0, 1); const back = V3(rig.pos.x - Math.sin(rig.yaw) * (rig.spec.L / 2 + 4 - k * 9), rig.pos.y + k * 1.1, rig.pos.z - Math.cos(rig.yaw) * (rig.spec.L / 2 + 4 - k * 9)); truck.pos.copy(back); truck.yaw = rig.yaw; truck.vel.set(rig.vel.x, 0, rig.vel.z); if (k >= 1) truck.root.visible = false; }); m.ents.offs.push(sync);
  const p = m.cine({ dur: 9, fov: 46, pos: (k) => rig.pos.clone().add(V3(Math.cos(rig.yaw) * 12 - Math.sin(rig.yaw) * (14 - k * 20), 4 + k * 3, -Math.sin(rig.yaw) * 12 - Math.cos(rig.yaw) * (14 - k * 20))), look: () => rig.pos.clone().add(V3(0, 1.5, 0)) });
  if (G.audio) G.audio.impact(truck.pos, 0.8, 'metal'); await m.wait(1.8); ramp.rotation.x = 0.0; ramp.position.y = 1.6;
  G.police.reset(); m.intensity(1);
  await m.sayWait('JUNO', 'Bearer bonds, a cash truck, and you jumped off a skyscraper to get it.', 3.4);
  await m.sayWait('DEZ', 'Next time can we do something normal? Like a bank?', 2.6);
  await m.sayWait('GRAMPS', 'We did a bank. You hated it.', 2.4); await p; m.lock(false);
}
export const M05 = {
  id: 'm05', num: 5, act: 0, title: 'SKYFALL', music: 'skyline', par: 780,
  desc: 'Helicopter drop on the tallest tower, zipline to the next one, crack Halcyon\'s penthouse safe, fight off a rooftop raid — then base-jump and parachute onto a moving cash truck.',
  unlocks: [{ vehicle: 'armored' }], deathText: 'KIT WENT DOWN', checkpoints: [cp0, cp1, cp2, cp3, cp4],
};
