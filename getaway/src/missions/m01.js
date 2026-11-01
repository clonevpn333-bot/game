// GETAWAY! — Mission 01: WRONG CAR
// Steal a "simple" pickup -> it's Halcyon's prototype -> armed SUVs -> construction-site jump & crane drop ->
// remote engine kill -> grab the case, fight on foot -> fire escape & rooftops under a helicopter ->
// skybridge -> loaner muscle car down a 4-level garage -> lose the cops -> Dez's garage.
import * as THREE from 'three';
import { G } from '../core/context.js';
import { rand, clamp } from '../core/utils.js';
import { PursuitAI, Helicopter } from '../police/police.js';
import { RigidBody } from '../fx/rigid.js';
import { LANDMARKS } from '../world/layout.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const PEARL = 0xe8e4da;

// Halcyon hunter squad controller (same interface PursuitAI expects from Police)
class Hunters {
  constructor() { this.state = 'pursuit'; this.losUnits = new Set(); this.speedMul = 0.97; this.tactics = { pit: true }; this.graph = G.world.graph; this.tier = 0; this.officers = []; this.units = []; }
  searchPoint() { return G.player.focus; }
  add(v, role, crewN, canExit = false) {
    const ai = new HunterAI(v, this, role); this.units.push({ v, ai }); v.hasDriver = true; v.color = 0x0b0d10;
    ai.crew = G.npcs.crewVehicle(v, 'halcyon', crewN, { canExit, calm: false, acc: 0.42 }); return ai;
  }
  update(dt) {
    this.losUnits.clear(); const tp = G.player.focus;
    for (const u of this.units) { if (u.v.removed || u.v.dead) continue; if (u.v.pos.distanceTo(tp) < 90 && G.world.static.lineOfSight(u.v.pos.x, u.v.pos.y + 1.4, u.v.pos.z, tp.x, tp.y + 1, tp.z)) this.losUnits.add(u.ai); u.ai.update(dt); }
  }
  alive() { return this.units.filter((u) => !u.v.dead && !u.v.removed && u.v.mode === 'drive' && !u.v.flipped && u.v.hp > 0); }
}
class HunterAI extends PursuitAI {
  constructor(v, h, role) { super(v, h, role); this.kind = 'hunter'; v.siren = false; v.lightsOn = true; }
  dismount() { if (this.dismounted) return; this.dismounted = true; for (const c of (this.v.crew || []).slice()) if (c.alive) { c.seat.canExit = true; c.leaveVehicle(); } }
}

function setup(m) {
  const P = G.player; P.revive(); P.health = 100; P.armor = 50; if (!P.inv.pistol) P.inv.pistol = { mag: 15, res: 0 }; P.inv.pistol.mag = 15; P.inv.pistol.res = Math.max(P.inv.pistol.res, 90); P.setWeapon('pistol'); P.carrying = m.vars.case ? { bag: true } : null;
  G.dmgScale = 0.55; G.enemyAcc = 0.6; m.ents.offs.push(() => { G.dmgScale = 1; G.enemyAcc = 1; });
  G.sky.setWeather('clear', true); G.sky.dayScale = 0.25 / 60; if (!m.vars.hourSet) { G.sky.setTime(17.15); m.vars.hourSet = true; }
  G.police.reset(); G.police.setTier(0); G.police.maxStars = 3; G.police.tactics = { pit: true, roadblocks: true, heli: false };
  m.vars.hunters = new Hunters(); m.track({ dispose: () => {} });
  const h = m.vars.hunters; m.r.flow.game.addUpdater && (m.vars.offU = m.r.flow.game.addUpdater((dt) => { if (G.mission === m.r && !G.paused) h.update(dt); })); m.ents.offs.push(() => m.vars.offU && m.vars.offU());
}
function spawnRostr(m, x, z, yaw, opts = {}) { const v = m.vehicle('rostr', { x, y: 0, z, yaw, color: PEARL, parked: !!opts.parked }); v.engineOn = !opts.parked; m.vars.car = v; v.lightsOn = true; m.on('vehicleRemoved', () => {}); return v; }
function hunterSUV(m, x, z, yaw, role, crew = 2, canExit = false) { const v = m.vehicle('suv', { x, y: 0, z, yaw, color: 0x0b0d10 }); v.vel.set(Math.sin(yaw), 0, Math.cos(yaw)).multiplyScalar(18); const ai = m.vars.hunters.add(v, role, crew, canExit); for (const c of ai.crew) m.ents.npcs.push(c); return v; }
function spawnHunters(m, n, crew, canExit = false, minD = 150, maxD = 230) {
  const tp = G.player.focus; const cd = G.camera.getWorldDirection(new THREE.Vector3()); const cp = G.camera.position; const roles = ['chase', 'flank', 'block'];
  const nodes = G.world.graph.nodes.filter((nd) => { if (nd.kind !== 'isect' || !nd.out.length) return false; const d = Math.hypot(nd.x - tp.x, nd.z - tp.z); if (d < minD || d > maxD) return false; const dx = nd.x - cp.x, dz = nd.z - cp.z; return (dx * cd.x + dz * cd.z) / Math.hypot(dx, dz) < 0.6; }).sort(() => Math.random() - 0.5);
  const out = []; for (let i = 0; i < n && i < nodes.length; i++) { const nd = nodes[i]; const yaw = Math.atan2(tp.x - nd.x, tp.z - nd.z); out.push(hunterSUV(m, nd.x + Math.cos(yaw) * 3.5, nd.z - Math.sin(yaw) * 3.5, yaw, roles[i % 3], crew, canExit)); }
  return out;
}
function putPlayerIn(m, v) { G.player.teleport(v.pos.x, v.pos.y, v.pos.z, v.yaw); G.player.enterVehicle(v); G.cam.yaw = v.yaw; }

// ---------------------------------------------------------------- checkpoints
async function cp0(m) {
  setup(m); m.vars.case = false;
  G.player.teleport(-82, 16.15, 122, Math.PI / 2);
  const car = spawnRostr(m, 5.25, 121, Math.PI, { parked: true });
  G.traffic.populate(); G.peds.populate();
  m.music('wrongcar', 1);
  m.r.flow.showIntro(m.def);
  m.say('DEZ', 'Pearl-white coupé, double-parked on Halsey. Keys are in it. Owner\'s at dinner.');
  await m.cine({ dur: 4.5, fov: 42, pos: (k) => { const a = -0.6 + k * 1.4; return V3(car.pos.x + Math.cos(a) * 8.5, 1.2 + k * 1.4, car.pos.z + Math.sin(a) * 8.5); }, look: () => V3(car.pos.x, 0.7, car.pos.z) });
  await m.cine({ dur: 2.6, fov: 55, pos: (k) => V3(-90 + k * 2, 18.5 - k * 0.6, 125), look: () => V3(-30, 9, 122) });
  m.r.flow.hideIntro();
  m.say('DEZ', 'You\'re on the roof across the street. Fastest way down is the fun way.');
  // parkour descent: crate stack -> R3 -> R2 -> R1 -> fire escape -> street
  const steps = [
    [V3(-63.8, 13.75, 120.2), 'DROP ONTO THE CRATES', 'SPRINT + SPACE TO LEAP'],
    [V3(-56, 10.15, 123), 'GET DOWN TO THE NEXT ROOF', 'LAND MOVING TO ROLL'],
    [V3(-40, 10.15, 123), 'LEAP THE ALLEY', 'SPRINT (SHIFT) + JUMP (SPACE)'],
    [V3(-22, 8.15, 123), 'LEAP THE NEXT GAP', 'KEEP YOUR SPEED UP'],
    [V3(-13.2, 8.15, 115), 'FIRE ESCAPE', 'EAST EDGE OF THE ROOF'],
    [V3(-13.2, 0.15, 117), 'DOWN TO THE STREET', 'RUN DOWN THE STAIRS'],
  ];
  for (let i = 0; i < steps.length; i++) {
    const [p, t, sub] = steps[i];
    if (i === 1) m.say('JUNO', 'Hit the ground running and you\'ll roll right out of it. Parkour, baby.');
    if (i === 3) m.say('DEZ', 'Show-off.');
    await m.goTo(p, 'PARKOUR: ' + t, sub, { r: i === 0 ? 2.2 : 3, onFoot: true });
    G.stunts.award(i === steps.length - 1 ? 'STREET LEVEL' : 'PARKOUR', 120);
  }
  m.say('DEZ', 'In and out, Kit. Easiest two grand you\'ll ever make.');
  m.objective('STEAL THE PEARL ROADSTER', 'ACROSS THE STREET — PRESS F');
  const b = m.blip(() => car.pos, { color: '#ffd36b', size: 7 });
  await m.until(() => G.player.vehicle === car);
  m.unblip(b); G.peds.alarm(car.pos, 25, null);
  m.intensity(2);
  await m.sayWait('JUNO', 'Ooh. Wait. That\'s not a Saetta. That\'s a ROSTR — those don\'t exist yet.');
  m.say('KIT', 'It exists now. It\'s mine.');
}
async function cp1(m, fresh) {
  if (fresh) { setup(m); const car = spawnRostr(m, 1.75, 60, Math.PI); putPlayerIn(m, car); m.music('wrongcar', 2); G.traffic.populate(); G.peds.populate(); }
  const car = m.vars.car; m.vars.failOnWreck = true;
  m.objective('DRIVE TO DEZ\'S GARAGE', 'IRONSIDE DOCKS — ACROSS THE RIVER');
  const dest = m.blip(V3(550, 0, 104), { color: '#ffd36b', size: 7 });
  m.say('DEZ', 'Take your time. Don\'t scratch it. Hold SHIFT if you want to see something stupid.');
  const start = car.pos.clone(); await m.until(() => car.pos.distanceTo(start) > 140 || G.player.vehicle !== car, { timeout: 14 });
  // TWIST
  m.unblip(dest); G.input.rumble(0.4, 0.4, 300);
  m.say('DEZ', 'Kit… why is your car broadcasting a Halcyon Security tracker?');
  m.vars.hunters.state = 'pursuit';
  spawnHunters(m, 3, 1, false, 170, 260);
  // reroute instantly — never leave the player without a direction
  m.objective('LOSE THE SUVs — CUT THROUGH THE CONSTRUCTION SITE', 'FOLLOW THE ARROWS · DIRT RAMP AT THE WEST GATE'); m.intensity(3);
  const gp = V3(108, 0.15, -133); const bg = m.blip(gp, { color: '#ffd36b', size: 7 }); const mk = m.marker(gp, { r: 6 });
  await m.wait(2.2); m.say('KIT', '…because it\'s THEIR car.'); await m.wait(2.0);
  m.say('JUNO', 'Three black SUVs converging. They are NOT here to ask nicely.');
  for (const u of m.vars.hunters.units) m.blip(() => (u.v.dead ? null : u.v.pos), { color: '#ff4a3a', size: 5 });
  G.police.maxStars = 3;
  m.vars.copsT = setTimeout(() => { if (m.aborted) return; G.police.addHeat(1.2); m.say('DISPATCH', 'All units: shots fired near Meridian and Fifth. Multiple vehicles.'); }, 18000);
  m.ents.offs.push(() => clearTimeout(m.vars.copsT));
  await m.wait(2.5);
  m.say('DEZ', 'Construction site on Fifth — dirt ramp at the west gate. Hit it fast and hard LEFT off the avenue!');
  const inSite = () => { const p = G.player.focus; return p.x > 112 && p.x < 188 && p.z > -188 && p.z < -112; };
  const res = await m.until(() => (inSite() && G.player.vehicle && G.player.vehicle.airborne) || (inSite() && G.player.focus.x > 140) || m.vars.hunters.alive().length === 0, { timeout: 120 });
  m.unblip(bg); m.unmark(mk);
  if (inSite()) await cranePiece(m);
  m.say('JUNO', 'Ha! Whoever\'s left is eating dust.');
}
async function cranePiece(m) {
  const v = G.player.vehicle; m.slowmo(1.6, 0.28); m.intensity(4);
  // trackside cinematic glance while airborne (player keeps control)
  const c = G.world.landmarks.construction; const beamMesh = c.crane.beam; const hook = c.crane.hook;
  await m.wait(0.35);
  G.audio && G.audio.creak(V3(160, 30, -140), 2.5);
  m.say('JUNO', 'Crane\'s swinging — oh no. Oh YES.');
  // the steel beam lets go and drops onto the path behind you
  const wp = new THREE.Vector3(); beamMesh.getWorldPosition(wp); hook.visible = false;
  const beam = new THREE.Mesh(beamMesh.geometry, beamMesh.material); beam.castShadow = true; G.scene.add(beam); m.track(beam);
  const body = new RigidBody({ half: V3(5, 0.25, 0.25), mass: 2500, pos: V3(150, 22, -133), quat: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.2, 0.3)), vel: V3(0, -4, 0), angVel: V3(0, 0.3, 1.2), mesh: beam, life: 0, restitution: 0.1 });
  body.onImpact = (b, imp) => { if (imp > 6) { G.fx.dust(b.pos, 14, 3); G.audio.impact(b.pos, 1.6, 'metal'); G.cam.shake(0.5); } };
  G.rigid.add(body); m.ents.meshes.push({ dispose: () => G.rigid.remove(body) });
  // flatten the closest pursuer
  const target = m.vars.hunters.alive().sort((a, b) => a.v.pos.distanceTo(V3(150, 0, -133)) - b.v.pos.distanceTo(V3(150, 0, -133)))[0];
  await m.wait(0.9);
  if (target && target.v.pos.distanceTo(V3(150, 0, -133)) < 90) { body.pos.set(target.v.pos.x, target.v.pos.y + 6, target.v.pos.z); body.vel.set(0, -14, 0); await m.wait(0.35); target.v.damage(500, target.v.pos.clone().setY(target.v.pos.y + 1.5), V3(0, -1, 0)); target.v.explode(); G.stunts.award('CRANE DROP!', 750); }
  await m.wait(1.0); m.intensity(3);
}
async function cp2(m, fresh) {
  if (fresh) { setup(m); const car = spawnRostr(m, 198.25, -100, 0); putPlayerIn(m, car); m.music('wrongcar', 3); G.traffic.populate(); G.peds.populate(); hunterSUV(m, 198.25, -260, 0, 'chase', 2); G.police.addHeat(1.2); }
  const car = m.vars.car;
  m.say('DEZ', 'Bridges are swarming with Halcyon. Go south — the Galleria parking garage. Juno stashed a spare up top.');
  m.objective('HEAD FOR THE GALLERIA GARAGE', 'SOUTH, THEN WEST ON 1ST STREET');
  const gb = m.blip(V3(-150, 0, 105), { color: '#ffd36b', size: 7 });
  await m.until(() => car.pos.distanceTo(V3(-40, 0, 125)) < 120 || G.player.vehicle !== car || car.dead);
  // TWIST: remote kill switch
  m.say('JUNO', 'Uh-oh. Someone\'s inside the car\'s firmware. They\'re killing it REMOTELY!'); G.hud.warnOverride = 'REMOTE ENGINE SHUTDOWN IN 3'; G.audio.ui('beepUrgent');
  for (let i = 2; i >= 1; i--) { await m.wait(1); G.hud.warnOverride = 'REMOTE ENGINE SHUTDOWN IN ' + i; G.audio.ui('beepUrgent'); }
  await m.wait(1); G.hud.warnOverride = null;
  car.engineOn = false; car.killed = true; car.model.lightU.fill(0); m.vars.failOnWreck = false; G.audio.ui('fail'); G.cam.shake(0.2);
  m.say('KIT', '…Of course they are.');
  m.objective('BAIL OUT', 'THE CAR IS DEAD — GET OUT'); m.unblip(gb);
  await m.until(() => G.player.vehicle !== car || car.speed < 1.5);
  if (G.player.vehicle === car) await m.until(() => G.player.vehicle !== car);
  car.noEnter = true;
}
async function cp3(m, fresh) {
  let car = m.vars.car;
  if (fresh) { setup(m); car = spawnRostr(m, -2, 98.25, -Math.PI / 2); car.engineOn = false; car.killed = true; car.noEnter = true; G.player.teleport(-2, 0.15, 103.5, -Math.PI / 2); m.music('wrongcar', 3); G.traffic.populate(); G.peds.populate(); G.police.addHeat(1.2); }
  if (!m.vars.case) {
    m.say('DEZ', 'Whatever they want is in that trunk. Grab it!');
    m.objective('GRAB THE CASE FROM THE TRUNK', '');
    const trunk = () => car.local(0, -car.spec.L / 2 - 0.9).setY(car.pos.y);
    const mk = m.marker(trunk(), { r: 1.4, h: 4 });
    await m.until(() => { mk.g.position.copy(trunk()); const near = G.player.pos.distanceTo(trunk()) < 2.2 && !G.player.vehicle; G.hud.promptOverride = near ? '<kbd>E</kbd> Grab the case' : null; return near && G.input.pressed('interact'); });
    G.hud.promptOverride = null; m.unmark(mk); m.vars.case = true; G.player.carrying = { bag: true }; G.player.armor = 100; G.audio.ui('pickup'); G.stunts.award('GOT THE CASE', 200); G.hud.notify('Body armor was in the trunk too', 'pickup');
  }
  // ambush on foot
  m.intensity(4);
  const fe = V3(-13.2, 0.15, 116.5);
  m.objective('RUN FOR THE FIRE ESCAPE', 'FOLLOW THE MARKER — GO UP');
  const b = m.blip(fe, { color: '#ffd36b', size: 7 }); const mk = m.marker(fe, { r: 1.6, h: 10 });
  spawnHunters(m, 1, 2, true, 200, 280);
  m.npc('halcyon', G.player.pos.x + 70, 0.15, G.player.pos.z - 10, -Math.PI / 2, { role: 'hold' });
  G.police.addHeat(0.8);
  m.say('JUNO', 'Another SUV inbound! Don\'t stick around!');
  await m.wait(2);
  m.say('DEZ', 'Same fire escape you came down — go UP. They can\'t follow you up there.');
  await m.until(() => G.player.pos.y > 3.5 && Math.abs(G.player.pos.x + 13.2) < 2.5 && G.player.pos.z > 112 && G.player.pos.z < 134);
  m.unblip(b); m.unmark(mk);
  m.objective('CLIMB!', '');
  await m.until(() => G.player.pos.y > 7.6 && G.player.pos.x < -12 && G.player.pos.z > 112 && G.player.pos.z < 134);
}
async function cp4(m, fresh) {
  if (fresh) { setup(m); m.vars.case = true; G.player.carrying = { bag: true }; G.player.teleport(-20, 8.15, 123, -Math.PI / 2); m.music('wrongcar', 4); G.traffic.populate(); G.peds.populate(); G.police.addHeat(2.2); }
  m.intensity(3);
  G.police.maxStars = 3; G.police.addHeat(Math.max(0, 2.2 - G.police.heat));
  // helicopter
  const heli = new Helicopter(G.police, V3(80, 90, 40)); G.police.heli = heli; m.track({ dispose: () => { if (G.police.heli === heli) G.police.heli = null; heli.dispose(); } });
  m.say('GRAMPS', 'Kid, you\'re on the six o\'clock news. And the police scanner. And probably the moon.');
  // sniper on the garage roof
  m.npc('halcyon', -150, 16.15, 150, Math.PI / 2, { weapon: 'rifle', role: 'hold', acc: 0.3 });
  const route = [V3(-39, 10.15, 123), V3(-56, 10.15, 123), V3(-77, 16.15, 120)];
  const hints = ['JUMP THE GAP', 'KEEP RUNNING', 'CLIMB THE CRATES TO THE TALL ROOF'];
  for (let i = 0; i < route.length; i++) {
    m.objective('CROSS THE ROOFTOPS', hints[i]);
    if (i === 1) m.say('JUNO', 'Sprint and jump — SPACE near a ledge to climb.');
    if (i === 2) m.say('DEZ', 'Stack of crates on that roof. Up and over.');
    await m.goTo(route[i], null, '', { r: 3.2 });
  }
  m.objective('CROSS THE SKYBRIDGE', 'TO THE GARAGE ROOF');
  const end = V3(-117, 16.15, 119); const b = m.blip(end, { color: '#ffd36b', size: 7 }); const mk = m.marker(end, { r: 2.5, h: 8 });
  // bullets rake the skybridge glass as you run
  const panes = G.props.glassList.filter((g) => Math.abs(g.cy - 17.7) < 1.2 && g.cx < -88 && g.cx > -115);
  await m.until(() => G.player.pos.x < -86);
  m.say('JUNO', 'SNIPER! Keep moving!'); m.slowmo(1.0, 0.45);
  let k = 0; const iv = setInterval(() => { if (m.aborted || k >= panes.length) return clearInterval(iv); const g = panes[k++]; G.props.breakGlass(g, V3(0, 0, g.normal.z * -4)); G.audio.gunshot(V3(-150, 18, 150), 'rifle'); }, 120); m.ents.offs.push(() => clearInterval(iv));
  await m.until(() => m.near(end, 3, G.player.pos)); m.unblip(b); m.unmark(mk);
}
async function cp5(m, fresh) {
  if (fresh) { setup(m); m.vars.case = true; G.player.carrying = { bag: true }; G.player.teleport(-120, 16.15, 119, -Math.PI / 2); m.music('wrongcar', 3); G.traffic.populate(); G.peds.populate(); G.police.addHeat(2.2); }
  const g = G.world.landmarks.garage;
  const loaner = m.vehicle('muscle', { x: g.roofSpot.x, y: g.roofSpot.y, z: g.roofSpot.z + 2, yaw: Math.PI / 2, color: 0xf39c12 }); loaner.engineOn = false; loaner.parked = true; m.vars.loaner = loaner;
  m.say('JUNO', 'Orange Bruiser, roof level. Full tank, no questions. You\'re welcome.');
  m.objective('GET IN THE BRUISER', 'ROOF LEVEL');
  const b = m.blip(() => loaner.pos, { color: '#ffd36b', size: 7 });
  await m.until(() => G.player.vehicle === loaner); m.unblip(b); G.player.carrying = null; m.vars.case = true;
  m.say('KIT', 'Case is riding shotgun. Hold on, case.');
  m.objective('GET OUT OF THE GARAGE', 'RAMPS ON THE EAST SIDE — FOUR LEVELS DOWN'); m.intensity(4);
  await m.until(() => G.player.focus.y < 1 && (G.player.focus.z < g.z0 - 1 || G.player.focus.x < g.x0 - 1 || G.player.focus.x > g.x1 + 1 || G.player.focus.z > g.z1 + 1));
  G.police.addHeat(1.0); G.stunts.award('GARAGE RUN', 300);
  m.say('DISPATCH', 'Suspect exiting the Galleria structure in an orange muscle car. All units!');
}
async function cp6(m, fresh) {
  if (fresh) { setup(m); m.vars.case = true; const v = m.vehicle('muscle', { x: -146, y: 0, z: 98.25, yaw: Math.PI / 2, color: 0xf39c12 }); m.vars.loaner = v; putPlayerIn(m, v); m.music('wrongcar', 4); G.traffic.populate(); G.peds.populate(); G.police.setStars(3); }
  G.police.minStars = 0;
  m.objective('LOSE THE COPS', 'BREAK LINE OF SIGHT · STAY OUT OF THE SEARCH ZONE');
  m.say('DEZ', 'Bayside tunnel runs under the river on Bay Street. Cops hate it. Lose them, THEN come home.');
  let escaped = false; m.on('escaped', () => { escaped = true; });
  await m.until(() => escaped || G.police.stars === 0);
  m.intensity(2);
  m.say('GRAMPS', 'Scanner\'s gone quiet. Nice driving, kid.');
  m.objective('GET TO DEZ\'S GARAGE', 'IRONSIDE DOCKS');
  const h = G.world.landmarks.hideout; const front = V3(h.front.x, 0.15, h.front.z);
  const b = m.blip(front, { color: '#ffd36b', size: 7 }); const mk = m.marker(front, { r: 5 });
  await m.until(() => m.near(front, 6) && (!G.player.vehicle || G.player.vehicle.speed < 9) && G.police.stars === 0);
  m.unblip(b); m.unmark(mk);
  // roll-up door
  m.say('DEZ', 'Door\'s opening. Get in before somebody films you.');
  h.doorBox.disabled = true; for (let i = 0; i <= 30; i++) { h.door.position.y = 3.15 + i * 0.2; await m.wait(0.03); }
  const inside = V3(550, 0.15, 150); const mk2 = m.marker(inside, { r: 3.5, h: 6 }); m.objective('PULL IN', '');
  await m.until(() => m.near(inside, 4) && (!G.player.vehicle || G.player.vehicle.speed < 4)); m.unmark(mk2);
  m.lock(true); h.doorBox.disabled = false;
  for (let i = 30; i >= 0; i--) { h.door.position.y = 3.15 + i * 0.2; await m.wait(0.02); }
  G.audio.impact(V3(550, 2, 120), 0.6, 'metal'); G.police.reset(); m.intensity(1);
  // ending scene
  const cam = { dur: 15, fov: 45, pos: (k) => V3(538 - k * 2, 3.2 - k * 0.6, 167 - k * 2), look: () => V3(550, 1.0, 150) };
  const p = m.cine(cam);
  await m.sayWait('DEZ', 'So. Whose car was that?', 2.6);
  await m.sayWait('KIT', 'Halcyon\'s.', 2);
  await m.sayWait('GRAMPS', 'Halcyon. As in the people who own half the police department.', 3.4);
  await m.sayWait('JUNO', 'Guys… it\'s not cash. It\'s a drive. Encrypted. And it\'s… counting down?', 3.8);
  await m.sayWait('KIT', 'Then we\'d better be faster than everyone.', 3);
  await p; m.lock(false);
}

export const M01 = {
  id: 'm01', num: 1, act: 0, title: 'WRONG CAR', music: 'wrongcar', par: 540,
  desc: 'A simple vehicle pickup becomes a high-speed pursuit through downtown.',
  unlocks: [{ vehicle: 'rostr' }, { vehicle: 'suv' }, { track: 'wrongcar' }, { track: 'main' }],
  deathText: 'KIT WENT DOWN',
  checkpoints: [cp0, cp1, cp2, cp3, cp4, cp5, cp6],
  onUpdate(m) { const c = m.vars.car; if (m.vars.failOnWreck && c && (c.dead || c.drowned)) m.fail('YOU WRECKED THE PROTOTYPE'); },
};
