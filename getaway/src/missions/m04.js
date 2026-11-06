// GETAWAY! — Mission 04: DEEP END
// Off the back of Juno's boat in scuba gear -> down through the kelp to the trench -> take out Halcyon's sentries ->
// through the tunnel into their secret mining cavern -> grab the minerals, plant charges on the roof pylons while their
// divers hunt you -> BLOW IT -> 45 seconds to get out as the roof comes down -> into Juno's submarine -> police boats
// drop depth charges, Halcyon mini-subs fire torpedoes -> surface in the moon pool of the crew's offshore rig ->
// the rig gets raided: SWAT up the ladders, a police chopper, and Commander Hale -> shove a bomb down his throat.
import * as THREE from 'three';
import { G } from '../core/context.js';
import { clamp, rand, damp } from '../core/utils.js';
import { baseSetup } from './helpers.js';
import { warmNew } from '../core/warm.js';
import { Human, LOOKS } from '../characters/humanoid.js';
import { Gunship } from './air.js';
import { SeaWorld, Diver, EnemyDiver, Sub, PoliceBoat, MiniSub, DiveHUD, ride, unride, boatMesh, voice, SEA_Y, BOAT, MOUTH, TUNNEL, CH, CH_R, SUBDOCK, RIG, DECK_Y, POOL } from './sea.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
function setup(m, o = {}) { baseSetup(m, { hour: o.hour ?? 10.5, weather: 'clear', tier: 3, maxStars: 0, dmg: 0.55, acc: 0.55, weapons: o.weapons || ['smg', 'rifle', 'shotgun'] }); G.police.setStars(0); G.police.unitCap = 0; m.ents.offs.push(() => { G.police.unitCap = 0; }); }
// the sea world lives for the whole mission (rebuilt if you restart from a checkpoint)
function world(m) {
  let W = m.vars.W; if (W && !W.gone) return W;
  W = new SeaWorld(); m.vars.W = W; m.track({ dispose: () => { W.gone = true; W.dispose(); } }); warmNew();
  const up = m.r.flow.game.addUpdater((dt) => { if (G.mission !== m.r || G.paused || W.gone) return; W.update(dt); }); m.ents.offs.push(up);
  return W;
}
// Juno's dive boat bobbing on the surface, Juno on deck
function diveBoat(m) {
  const b = boatMesh(0xf4f1ea, 0xff7a1a); b.g.position.copy(BOAT); G.scene.add(b.g); const juno = new Human({ ...LOOKS.kit, hairStyle: 'long', jacket: 0x1f6f8f, shirt: 0x1f6f8f, hair: 0x2a1c14 }, { x: BOAT.x, y: BOAT.y + 1, z: BOAT.z - 2, yaw: 0 });
  (G.extraHumans || (G.extraHumans = [])).push(juno); let t = 0;
  const up = m.r.flow.game.addUpdater((dt) => { t += dt; b.g.position.y = BOAT.y + Math.sin(t * 1.4) * 0.15; b.g.rotation.set(Math.sin(t) * 0.03, 0.4, Math.sin(t * 0.8) * 0.04); juno.pos.y = b.g.position.y + 1; juno.state = 'idle'; juno.speed = 0; juno.lookAt = G.player.pos; juno.animate(dt); }); m.ents.offs.push(up);
  m.track({ dispose: () => { G.scene.remove(b.g); const L = G.extraHumans, i = L.indexOf(juno); if (i >= 0) L.splice(i, 1); } });
}
// the player in scuba gear (camera, controls, HUD); returns the diver
function startDive(m, W, pos, yaw) {
  const D = new Diver(W, pos, yaw); m.vars.D = D; W.player = D; ride(D, 'dive'); G.player.teleport(pos.x, pos.y, pos.z, yaw);
  const tgt = { team: 'player', r: 0.7, alive: () => G.player.alive && G.player.riding === D, center: () => D.pos, hit: (d, dir, p) => G.player.hit(d, dir, p, false, null, 'spear') }; W.targets.push(tgt);
  const up = m.r.flow.game.addUpdater((dt) => { if (G.mission !== m.r || G.paused || G.player.riding !== D) return; D.update(dt, m.r.cine || G.player.controlsLocked ? null : G.input); DiveHUD.update(D); }); m.ents.offs.push(up);
  m.track({ dispose: () => { const i = W.targets.indexOf(tgt); if (i >= 0) W.targets.splice(i, 1); D.dispose(); if (G.player.riding === D) unride(); } });
  return D;
}
function spawnDivers(m, W, list) { const out = []; for (const [p, a] of list) { const e = new EnemyDiver(W, p, a || p); W.targets.push(e); out.push(e); } m.track({ dispose: () => out.forEach((e) => e.dispose()) });
  const up = m.r.flow.game.addUpdater((dt) => { if (G.mission !== m.r || G.paused) return; const D = m.vars.D; for (const e of out) e.update(dt, D && G.player.riding === D ? D.pos : null); }); m.ents.offs.push(up); return out; }
const alive = (l) => l.filter((e) => e.alive).length;

// ---------------- 0: the dive ----------------
async function cp0(m) {
  setup(m); const W = world(m); diveBoat(m); m.music('whiteout', 1);
  const D = startDive(m, W, BOAT.clone().add(V(4, -1.2, 3)), 1.2); m.r.flow.showIntro(m.def); m.lock(true);
  await m.cine({ dur: 6, fov: 46, pos: (k) => BOAT.clone().add(V(Math.cos(k * 1.6) * 22, 6 - k * 4, Math.sin(k * 1.6) * 22)), look: () => BOAT.clone().add(V(0, -2, 0)) });
  m.r.flow.hideIntro(); m.lock(false);
  m.say('JUNO', 'Halcyon\'s been mining under this reef for a year. Whatever\'s down there pays for every cop in Port Sol. We take it. Then we bury the rest.', 7);
  await m.wait(1);
  m.say('DEZ', 'Mouse to look, W to swim, SPACE up, C down. The speargun\'s on the CLICK. And breathe — you have a tank, use it.', 6);
  const sentries = spawnDivers(m, W, [[MOUTH.clone().add(V(-14, 4, -6)), null], [MOUTH.clone().add(V(-10, 2, 9)), null], [MOUTH.clone().add(V(-20, 6, 2)), null]]); m.vars.sentries = sentries;
  m.objective('DIVE TO THE TRENCH', 'FOLLOW THE TRENCH TO THE ORANGE LIGHTS');
  const mk = m.marker(MOUTH.clone().add(V(-4, -2, 0)), { r: 3, h: 6, color: 0xff9a3c }); const b = m.blip(MOUTH, { color: '#ffd36b', size: 7, waypoint: true });
  await m.until(() => D.pos.distanceTo(MOUTH) < 34 || alive(sentries) < 3, { timeout: 300 });
  m.say('JUNO', 'Halcyon divers on the cave mouth. Spear them before they radio it in.', 4.5); m.objective('TAKE OUT THE SENTRIES', 'SPEARGUN — CLICK');
  const off = m.r.flow.game.addUpdater(() => G.hud.objective('TAKE OUT THE SENTRIES', `SPEARGUN — CLICK (${3 - alive(sentries)}/3)`)); m.ents.offs.push(off);
  await m.until(() => alive(sentries) === 0, { timeout: 240 }); off(); for (const e of sentries) if (e.alive) e.hit(999, V(0, 1, 0));
  m.objective('INTO THE CAVE', 'SWIM INTO THE TUNNEL'); await m.until(() => D.pos.distanceTo(MOUTH) < 6, { timeout: 200 }); m.unmark(mk); m.unblip(b);
}
// ---------------- 1: the cavern ----------------
async function cp1(m, fresh) {
  const W = world(m); let D = m.vars.D; if (fresh || !D || G.player.riding !== D) { setup(m); D = startDive(m, W, MOUTH.clone(), Math.PI / 2 + 0.2); m.music('whiteout', 2); }
  m.objective('THROUGH THE TUNNEL', 'FOLLOW THE ORANGE LIGHTS');
  await m.until(() => D.pos.distanceTo(CH) < CH_R + 1, { timeout: 200 });
  const alarm = G.audio && G.audio.createLoop('alarm', { ref: 30 }); if (alarm) { m.track({ dispose: () => alarm.dispose() }); const au = m.r.flow.game.addUpdater(() => alarm.update(CH.clone().add(V(0, 6, 0)), 0.35)); m.ents.offs.push(au); }
  m.say('GRAMPS', 'Would you look at that. A whole Halcyon mine in a cave. They\'ve got a DRILL down there.', 4); m.slowmo(1, 0.4);
  const guards = spawnDivers(m, W, [[CH.clone().add(V(8, 4, 6))], [CH.clone().add(V(-9, 6, -5))], [CH.clone().add(V(4, 10, -9))], [CH.clone().add(V(-6, 3, 10))], [CH.clone().add(V(11, 8, -2))]]); guards.forEach((e) => { e.alert = true; }); m.intensity(3);
  // the job: every crystal cluster, a charge on every pylon (any order, while they hunt you)
  const mins = W.minerals, chg = W.charges; const mb = mins.map((x) => m.blip(x.pos, { color: '#46f0ff', size: 4 })); const cb = chg.map((c) => m.blip(c.pos, { color: '#ff3b2f', size: 4 }));
  const beeps = []; let wave2 = false;
  const off = m.r.flow.game.addUpdater((dt) => {
    if (G.mission !== m.r) return; let prompt = null;
    mins.forEach((x, i) => { if (!x.got && (D.pos.distanceTo(x.pos) < 3 || D.pos.distanceTo(x.reach) < 2.2)) { x.got = true; m.unblip(mb[i]); W.bubbles.burst(x.pos, 20, 0.8); if (G.audio) G.audio.ui('pickup'); if (G.stunts) G.stunts.award('MINERALS', 250); } });
    chg.forEach((c, i) => { if (!c.planted && (D.pos.distanceTo(c.pos) < 3.2 || D.pos.distanceTo(c.reach) < 2.4)) { prompt = '<kbd>E</kbd> Plant charge'; if (G.input.pressed('interact')) { c.planted = true; m.unblip(cb[i]); const lt = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.3), new THREE.MeshStandardMaterial({ color: 0x220000, emissive: 0xff2020, emissiveIntensity: 2 })); lt.position.copy(c.pos); G.scene.add(lt); beeps.push(lt); if (G.audio) G.audio.click(c.pos, 2600, 0.5); } } });
    G.hud.promptOverride = prompt; const nm = mins.filter((x) => x.got).length, nc = chg.filter((c) => c.planted).length; for (const lt of beeps) lt.visible = (performance.now() % 600) < 300;
    G.hud.objective('LOOT IT, THEN BURY IT', `MINERALS ${nm}/${mins.length} · CHARGES ${nc}/${chg.length} · DIVERS ${alive(guards)}`);
    if (!wave2 && nc >= 2) { wave2 = true; m.say('JUNO', 'More divers coming in through the tunnel behind you!', 3.5); const w2 = spawnDivers(m, W, [[TUNNEL[2].clone()], [TUNNEL[3].clone()], [TUNNEL[1].clone()]]); w2.forEach((e) => { e.alert = true; guards.push(e); }); }
  }); m.ents.offs.push(off); m.track({ dispose: () => { beeps.forEach((b) => G.scene.remove(b)); G.hud.promptOverride = null; } });
  await m.until(() => mins.every((x) => x.got) && chg.every((c) => c.planted), { timeout: 600 }); off(); G.hud.promptOverride = null; mb.forEach((b) => m.unblip(b)); cb.forEach((b) => m.unblip(b));
  m.vars.beeps = beeps; m.vars.guards = guards;
}
// ---------------- 2: blow it, get out ----------------
async function cp2(m, fresh) {
  const W = world(m); let D = m.vars.D; if (fresh || !D || G.player.riding !== D) { setup(m); D = startDive(m, W, CH.clone().add(V(-6, 2, 0)), -Math.PI / 2); for (const c of W.charges) c.planted = true; }
  m.say('DEZ', 'Charges are live. When I say swim, you SWIM.', 3); await m.wait(1.5); m.say('DEZ', 'SWIM!', 1.5);
  // the blast: every charge goes, the roof starts coming down
  W.charges.forEach((c, i) => setTimeout(() => { if (!W.gone) W.blast(c.pos.clone(), 1.6); }, i * 280)); for (const b of m.vars.beeps || []) G.scene.remove(b); m.slowmo(1.2, 0.35);
  for (const e of m.vars.guards || []) if (e.alive) e.hit(999, V(0, 1, 0));
  m.timer(45, { failReason: 'BURIED ALIVE' }); m.intensity(4); m.objective('GET OUT', 'THE CAVE IS COLLAPSING — BACK THROUGH THE TUNNEL TO THE SUB');
  // falling roof: rocks of the dome drop, the cavern fills with silt and bubbles
  const fall = W.rockList.filter((r) => r.p.distanceTo(CH) < CH_R + 6 && r.p.y > CH.y).slice(0, 40).map((r) => ({ r, vy: 0, delay: rand(0, 25) })); let ft = 0;
  const rumble = setInterval(() => { if (W.gone || G.mission !== m.r) return clearInterval(rumble); G.cam.shake(0.35); if (G.audio) G.audio.rumble(CH, 1.5, 0.8); W.bubbles.burst(CH.clone().add(V(rand(-10, 10), rand(-4, 8), rand(-10, 10))), 25, 2); }, 1400); m.ents.offs.push(() => clearInterval(rumble));
  const fu = m.r.flow.game.addUpdater((dt) => { if (G.mission !== m.r || W.gone) return; ft += dt; const im = W.rockIM; let any = false; for (const f of fall) { if (ft < f.delay || f.done) continue; f.vy -= dt * 6; f.r.p.y += f.vy * dt; if (f.r.p.y < W.cavFloor + f.r.r * 0.5) { f.done = true; if (G.audio) G.audio.impact(f.r.p, 1, 'concrete'); W.bubbles.burst(f.r.p, 15, f.r.r); } const i = W.rockList.indexOf(f.r); if (i >= 0) { const s = f.r.s; const m4 = new THREE.Matrix4().compose(f.r.p, new THREE.Quaternion().setFromEuler(new THREE.Euler(...f.r.rot)), V(f.r.r * s[0], f.r.r * s[1], f.r.r * s[2])); im.setMatrixAt(i, m4); any = true; } if (D.pos.distanceTo(f.r.p) < f.r.r + 0.6 && f.vy < -2) { G.player.hit(18, V(0, -1, 0), D.pos.clone(), false, null, 'crush'); f.vy = 0; } } if (any) im.instanceMatrix.needsUpdate = true; }); m.ents.offs.push(fu);
  const sub = new Sub(W, SUBDOCK.clone(), Math.PI); m.vars.sub = sub; m.track({ dispose: () => sub.dispose() });
  const mk = m.marker(SUBDOCK.clone().add(V(0, -3, 0)), { r: 4, h: 7, color: 0x46f0ff }); const b = m.blip(SUBDOCK, { color: '#ffd36b', size: 7, waypoint: true });
  await m.until(() => { const near = D.pos.distanceTo(sub.pos) < 6.5; G.hud.promptOverride = near ? '<kbd>E</kbd> Get in the sub' : null; return near && G.input.pressed('interact'); }, { timeout: 60 });
  G.hud.promptOverride = null; m.stopTimer(); m.unmark(mk); m.unblip(b); fu();
  // the whole knuckle comes down behind you
  unride(); ride(sub, 'sub'); m.vars.D = null; m.lock(true);
  const p = m.cine({ dur: 5, fov: 50, pos: (k) => SUBDOCK.clone().add(V(-30 - k * 10, 6 + k * 6, 24)), look: () => CH.clone().add(V(-20, 0, 0)) });
  for (let i = 0; i < 6; i++) setTimeout(() => { if (!W.gone) W.blast(CH.clone().add(V(rand(-30, -10), rand(0, 14), rand(-12, 12))), 2.2); }, 300 + i * 600);
  for (const f of W.rockList) if (f.p.distanceTo(CH) < 30 && f.p.y > CH.y - 4) f.p.y -= rand(4, 10); { const im = W.rockIM; W.rockList.forEach((r, i) => { const s = r.s; im.setMatrixAt(i, new THREE.Matrix4().compose(r.p, new THREE.Quaternion().setFromEuler(new THREE.Euler(...r.rot)), V(r.r * s[0], r.r * s[1], r.r * s[2]))); }); im.instanceMatrix.needsUpdate = true; }
  await m.sayWait('GRAMPS', 'And THAT is what we call geology.', 2.6); await p; m.lock(false);
  if (G.stunts) G.stunts.award('CAVE-IN', 1500);
}
// ---------------- 3: the sub run ----------------
async function cp3(m, fresh) {
  const W = world(m); let sub = m.vars.sub; if (fresh || !sub || G.player.riding !== sub) { setup(m); sub = new Sub(W, SUBDOCK.clone().add(V(-6, 0, 0)), Math.PI); m.vars.sub = sub; m.track({ dispose: () => sub.dispose() }); ride(sub, 'sub'); }
  m.music('fivestar', 3); W.player = sub;
  const su = m.r.flow.game.addUpdater((dt) => { if (G.mission !== m.r || G.paused || G.player.riding !== sub) return; sub.update(dt, m.r.cine || G.player.controlsLocked ? null : G.input); DiveHUD.update(sub); W.dcharges.update(dt, sub); }); m.ents.offs.push(su);
  const ptgt = sub; W.torps.targets.push(ptgt); m.on('subDown', () => m.fail('THE SUB WENT DOWN'));
  m.say('JUNO', 'Port Sol PD boats on the surface — they\'re dropping DEPTH CHARGES. Stay deep, stay moving. Torpedoes on the CLICK.', 6);
  // pursuers: police boats on the surface, Halcyon mini-subs below
  const boats = [V(-930, 0, 860), V(-900, 0, 950), V(-850, 0, 900)].map((p) => new PoliceBoat(W, p)); const subs = [V(-1060, -20, 880), V(-1060, -22, 930)].map((p) => new MiniSub(W, p));
  for (const t of [...boats, ...subs]) W.torps.targets.push(t); m.track({ dispose: () => { boats.forEach((b) => b.dispose()); subs.forEach((s) => s.dispose()); } });
  let more = false; const eu = m.r.flow.game.addUpdater((dt) => { if (G.mission !== m.r || G.paused) return; for (const b of boats) b.update(dt, sub.pos); for (const s of subs) s.update(dt, sub.pos);
    if (!more && sub.pos.x > -760) { more = true; for (const p of [V(-640, 0, 870), V(-640, 0, 940)]) { const b = new PoliceBoat(W, p); boats.push(b); W.torps.targets.push(b); } const s2 = new MiniSub(W, V(-620, -18, 905)); subs.push(s2); W.torps.targets.push(s2); m.say('DEZ', 'More boats off the rig! They know where we\'re going!', 3.5); } }); m.ents.offs.push(eu);
  { // out of the trench and round the north side of the reef first
    const wp = V(-985, -14, 846); m.objective('OUT OF THE TRENCH', 'AROUND THE NORTH SIDE OF THE REEF · STAY DEEP'); const wm = m.marker(wp.clone(), { r: 6, h: 10, color: 0x46f0ff }); const wb = m.blip(wp, { color: '#ffd36b', size: 7, waypoint: true });
    await m.until(() => Math.hypot(sub.pos.x - wp.x, sub.pos.z - wp.z) < 18 || sub.pos.x > -900, { timeout: 240 }); m.unmark(wm); m.unblip(wb); }
  m.objective('GET TO THE RIG', 'HEAD EAST · STAY DEEP UNDER THE DEPTH CHARGES'); const target = V((POOL.x0 + POOL.x1) / 2, -10, (POOL.z0 + POOL.z1) / 2);
  const mk = m.marker(target.clone(), { r: 5, h: 8, color: 0x46f0ff }); const b = m.blip(target, { color: '#ffd36b', size: 8, waypoint: true });
  await m.until(() => Math.hypot(sub.pos.x - target.x, sub.pos.z - target.z) < 12, { timeout: 420 });
  m.objective('SURFACE IN THE MOON POOL', 'HOLD SPACE — COME UP INSIDE THE HANGAR'); sub.surfaceOK = true;
  W.extraCollide = (p) => { const inPool = p.x > POOL.x0 && p.x < POOL.x1 && p.z > POOL.z0 && p.z < POOL.z1; if (!inPool && p.y > SEA_Y - 2.5 && Math.hypot(p.x - RIG.x, p.z - RIG.z) < 30) p.y = SEA_Y - 2.5; }; // the deck is a roof except over the pool
  await m.until(() => sub.pos.y > SEA_Y - 1.8 && Math.hypot(sub.pos.x - target.x, sub.pos.z - target.z) < 6, { timeout: 120 }); m.unmark(mk); m.unblip(b); W.extraCollide = null;
  for (const s of subs) if (s.alive) s.hit(999); m.slowmo(1, 0.4); if (G.stunts) G.stunts.award('HOME FREE?', 800);
}
// ---------------- 4: the raid ----------------
async function cp4(m, fresh) {
  const W = world(m); setup(m, { hour: 17.3 }); G.sky.setTime(17.3);
  const sub = m.vars.sub; if (G.player.riding) unride(); if (sub && !sub.disposed) { sub.pos.set((POOL.x0 + POOL.x1) / 2, SEA_Y - 0.6, (POOL.z0 + POOL.z1) / 2); sub.g.position.copy(sub.pos); sub.g.rotation.set(0, Math.PI / 2, 0); }
  G.player.teleport(POOL.x1 + 2.5, DECK_Y + 0.2, (POOL.z0 + POOL.z1) / 2, Math.PI / 2); m.music('fivestar', 4); m.lock(true);
  const sirenBoats = [V(RIG.x + 40, 0, RIG.z - 30), V(RIG.x + 45, 0, RIG.z + 25), V(RIG.x - 40, 0, RIG.z + 32)].map((p) => new PoliceBoat(W, p)); m.track({ dispose: () => sirenBoats.forEach((b) => b.dispose()) });
  const bu = m.r.flow.game.addUpdater((dt) => { if (G.mission !== m.r || G.paused) return; for (const b of sirenBoats) { b.dropT = 99; b.update(dt, RIG.clone().add(V(0, 0, 0))); } }); m.ents.offs.push(bu);
  await m.cine({ dur: 5, fov: 48, pos: (k) => RIG.clone().add(V(60 - k * 20, 25 - k * 10, -50 + k * 20)), look: () => RIG.clone().add(V(0, DECK_Y, 0)) });
  m.lock(false); m.say('DEZ', 'Uh. Kit? We have company. A LOT of company. They followed the sub!', 4);
  m.say('JUNO', 'Ladders on every side. Hold the deck — Gramps is warming up the chopper.', 4.5);
  const edges = [[RIG.x + 24, RIG.z - 10], [RIG.x + 24, RIG.z + 10], [RIG.x - 24, RIG.z + 14], [RIG.x + 5, RIG.z - 19], [RIG.x + 5, RIG.z + 19], [RIG.x - 12, RIG.z - 19]];
  const wave = (n, kind = 'swat') => { const out = []; for (let i = 0; i < n; i++) { const [x, z] = edges[i % edges.length]; out.push(m.npc(kind, x + rand(-2, 2), DECK_Y + 0.2, z + rand(-1, 1), Math.atan2(RIG.x - x, RIG.z - z), { role: i % 2 ? 'flank' : 'hold', acc: 0.4 })); } return out; };
  for (const [n, msg] of [[5, 'HOLD THE DECK'], [6, 'SECOND WAVE'], [7, 'THEY JUST KEEP COMING']]) {
    const w = wave(n); const off = m.r.flow.game.addUpdater(() => G.hud.objective(msg, `SWAT ON DECK: ${w.filter((q) => q.alive).length}`)); m.ents.offs.push(off); m.objective(msg, '');
    await m.until(() => w.filter((q) => q.alive).length <= 1, { timeout: 240 }); off(); for (const q of w) if (q.alive) q.hit(999, V(0, 1, 0), q.pos, false, null, 'bullet');
    if (n === 6) { m.say('GRAMPS', 'Police chopper! Shoot it with something BIG.', 3.5); const gs = new Gunship(RIG.clone().add(V(-80, 45, 40)), { hp: 300, aggro: 0.8, team: 'police', color: 0x1d2c4f, accent: 0xffffff }); m.track({ dispose: () => gs.dispose() }); const gu = m.r.flow.game.addUpdater((dt) => { if (G.mission === m.r && !gs.gone) gs.update(dt, G.player.pos); }); m.ents.offs.push(gu); G.player.give('rpg', 6); G.player.setWeapon('rpg'); }
  }
  // Commander Hale drops onto the helipad
  m.lock(true); const hp = V(RIG.x + 17, DECK_Y + 0.2, RIG.z);
  const boss = m.npc('swat', hp.x, hp.y, hp.z, -Math.PI / 2, { hp: 1400, acc: 0.6, weapon: 'rifle', look: { ...LOOKS.swat(), scale: 1.3, build: 1.35, hatColor: 0x111111, shirt: 0x15171a, pants: 0x15171a } }); boss.calm = true; boss.noKnockdown = true; // a wall of armour: bullets don't put him on the floor
  await m.cine({ dur: 3.6, fov: 38, pos: () => hp.clone().add(V(-9, 2.2, 4)), look: () => hp.clone().add(V(0, 1.6, 0)) });
  await m.sayWait('HALE', 'Port Sol PD. Commander Hale. You blew up a cave, kid. I LIKED that cave.', 3.6); m.lock(false); boss.calm = false; m.intensity(5);
  let stagger = false; const orig = boss.hit.bind(boss);
  boss.hit = (dmg, ...a) => { if (stagger) return; const floor = boss.maxHp * 0.2; const d = Math.min(dmg * 0.6, Math.max(0, boss.hp - floor)); if (d > 0) orig(d, a[0], a[1], a[2], a[3], a[4], null); if (boss.hp <= floor + 1 || boss.hp < boss.maxHp * 0.22) { boss.hp = Math.max(boss.hp, 60); boss.alive = true; stagger = true; boss.calm = true; boss.calmPose = 'cower'; boss.human.aim = null; m.say('HALE', 'Ngh — okay — OKAY—', 2); voice(G.audio, boss.pos, 'shout', 0.75); } };
  const hb = m.r.flow.game.addUpdater(() => { if (!stagger) G.hud.objective('TAKE DOWN COMMANDER HALE', `HALE ${Math.round(boss.hp / boss.maxHp * 100)}%`); }); m.ents.offs.push(hb); m.objective('TAKE DOWN COMMANDER HALE', '');
  await m.until(() => stagger || !boss.alive, { timeout: 300 }); hb();
  if (!stagger) { stagger = true; boss.alive = true; boss.hp = 60; boss.calm = true; boss.calmPose = 'cower'; }
  m.objective('FINISH IT', 'GET CLOSE — PRESS E');
  await m.until(() => { const near = Math.hypot(G.player.pos.x - boss.pos.x, G.player.pos.z - boss.pos.z) < 3.6 && Math.abs(G.player.pos.y - boss.pos.y) < 2.5; G.hud.promptOverride = near ? '<kbd>E</kbd> Shove a grenade down his throat' : null; return near && G.input.pressed('interact'); }, { timeout: 120 });
  G.hud.promptOverride = null; m.lock(true); m.slowmo(2.4, 0.25);
  const mid = boss.pos.clone().add(V(0, 1.5, 0)); const side = V(boss.pos.x - G.player.pos.x, 0, boss.pos.z - G.player.pos.z).normalize();
  G.player.human.upper = { name: 'punch', dur: 0.5, right: true }; G.player.human.upperT = 0; if (G.audio) G.audio.punch(mid);
  const pc = m.cine({ dur: 4.2, fov: 34, pos: (k) => mid.clone().add(V(side.z * 5 - side.x * 2, 0.6 + k * 2, -side.x * 5 - side.z * 2)), look: (k) => mid.clone().addScaledVector(side, k * 12).add(V(0, k * 6, 0)) });
  await m.sayWait('KIT', 'Special delivery.', 1.6);
  boss.calm = false; orig(99999, side.clone(), mid, false, null, 'melee', side.clone().multiplyScalar(14).setY(9));
  setTimeout(() => { G.emit('explosion', boss.pos.clone().add(V(0, 1.2, 0)), 2.2, 'grenade', null); if (G.stunts) G.stunts.award('SPECIAL DELIVERY', 3000); }, 1100);
  await pc; m.lock(false);
  for (const n of G.npcs.list) if (n.alive && n.team === 'police') n.hit(999, V(0, 1, 0), n.pos, false, null, 'bullet');
  m.intensity(1); m.lock(true);
  const end = m.cine({ dur: 9, fov: 44, pos: (k) => RIG.clone().add(V(-70 + k * 30, 30 + k * 10, 70)), look: () => RIG.clone().add(V(0, DECK_Y, 0)) });
  await m.sayWait('JUNO', 'The minerals are in the sub. Halcyon\'s cave is a rock pile. And you just fed a police commander a grenade.', 4.6);
  await m.sayWait('GRAMPS', 'Best Tuesday I\'ve had in years.', 2.4); await end; m.lock(false);
}
export const M04 = {
  id: 'm04', num: 4, act: 0, title: 'DEEP END', music: 'whiteout', par: 900,
  desc: 'Scuba dive into Halcyon\'s secret underwater mine, loot it and blow it up, escape the cave-in in a submarine under a rain of depth charges — then hold your offshore rig against a full police raid.',
  unlocks: [{ track: 'whiteout' }], deathText: 'KIT WENT DOWN', checkpoints: [cp0, cp1, cp2, cp3, cp4],
};
