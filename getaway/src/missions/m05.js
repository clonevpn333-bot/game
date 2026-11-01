// GETAWAY! — Mission 05: THE SKYLINE JOB
// Dusk at the Halcyon Spire construction site. Slip past the guards -> ride the builders' hoist up the steel
// skeleton -> firefight on floor 10 -> restore power -> hoist to floor 13 -> hold the server while the download
// runs, waves pour up the stairwell -> Halcyon fires the demolition charges: sprint across the collapsing floor
// through falling beams -> grab the tower-crane hook and swing out as the crown comes down -> 4-star escape.
import * as THREE from 'three';
import { G } from '../core/context.js';
import { rand } from '../core/utils.js';
import { V3, baseSetup, playerIn, loseCops, hideoutEnding } from './helpers.js';

const FLOOR = (f) => 0.15 + f * 4; // floor f walking height
const HX0 = 158.5, HX1 = 161.5, HZ0 = -147.3, HZ1 = -144.3; // hoist cage footprint (north face, outside the scaffolding)
const SERVER = V3(165, FLOOR(13), -180), GEN = V3(178, FLOOR(10), -180), HOOK_AT = V3(150.8, FLOOR(13), -165), STAIR13 = V3(152, FLOOR(13), -172);

// ---------- hoist + gangways (built once, reused across retries) ----------
let H = null;
function hoist() {
  if (H) return H; const S = G.world.static; H = {};
  const yellow = new THREE.MeshStandardMaterial({ color: 0xe0a91c, metalness: 0.5, roughness: 0.5 }), steel = new THREE.MeshStandardMaterial({ color: 0x8a8f96, metalness: 0.7, roughness: 0.4 });
  const mast = new THREE.Group(); for (const [x, z] of [[HX0 - 0.3, HZ1 + 0.3], [HX1 + 0.3, HZ1 + 0.3]]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.25, 60, 0.25), steel); p.position.set(x, 30, z); mast.add(p); }
  for (let y = 2; y < 60; y += 3) { const r = new THREE.Mesh(new THREE.BoxGeometry(HX1 - HX0 + 0.6, 0.08, 0.08), steel); r.position.set((HX0 + HX1) / 2, y, HZ1 + 0.3); mast.add(r); }
  G.scene.add(mast);
  const cage = new THREE.Group(); const floor = new THREE.Mesh(new THREE.BoxGeometry(HX1 - HX0, 0.2, HZ1 - HZ0), yellow); floor.position.y = -0.1; cage.add(floor);
  for (const [x, z, w, d] of [[HX0, (HZ0 + HZ1) / 2, 0.08, HZ1 - HZ0], [HX1, (HZ0 + HZ1) / 2, 0.08, HZ1 - HZ0], [(HX0 + HX1) / 2, HZ1, HX1 - HX0, 0.08]]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(w, 1.1, d), yellow); rail.position.set(x - (HX0 + HX1) / 2, 0.55, z - (HZ0 + HZ1) / 2); cage.add(rail); }
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff8800, toneMapped: false })); lamp.position.set(0, 2.4, 1.2); cage.add(lamp); H.lamp = lamp;
  cage.position.set((HX0 + HX1) / 2, FLOOR(0), (HZ0 + HZ1) / 2); G.scene.add(cage);
  H.cage = cage; H.box = S.addBox(HX0, FLOOR(0) - 0.2, HZ0, HX1, FLOOR(0), HZ1, { mat: 'metal' });
  for (const f of [10, 13]) { const y = FLOOR(f); S.addBox(HX0, y - 0.3, -150, HX1, y, HZ0, { mat: 'metal' }); const g = new THREE.Mesh(new THREE.BoxGeometry(HX1 - HX0, 0.3, HZ0 + 150), steel); g.position.set((HX0 + HX1) / 2, y - 0.15, (-150 + HZ0) / 2); G.scene.add(g); }
  H.y = FLOOR(0); return H;
}
function setHoist(y) { const h = hoist(); h.y = y; h.cage.position.y = y; h.box.minY = y - 0.2; h.box.maxY = y; }
async function ride(m, toY, secs) {
  const h = hoist(); const from = h.y; m.lock(true); G.player.setWeapon(G.player.inv.smg ? 'smg' : 'pistol');
  const motor = G.audio && G.audio.createLoop('rotor', { ref: 10 }); if (motor) m.track({ dispose: () => motor.dispose() });
  let t = 0, lt = m.r.stats.time; await m.until(() => {
    t += m.r.stats.time - lt; lt = m.r.stats.time; const k = Math.min(1, t / secs); const e = k * k * (3 - 2 * k); const y = from + (toY - from) * e; setHoist(y);
    G.player.pos.set((HX0 + HX1) / 2, y, (HZ0 + HZ1) / 2 + 0.4); G.player.vel.set(0, 0, 0); G.player.vy = 0; if (motor) motor.update(h.cage.position, 0.4 + 0.4 * Math.sin(k * Math.PI));
    h.lamp.material.color.setHex(Math.floor(t * 4) % 2 ? 0xff8800 : 0x331a00); return k >= 1;
  });
  m.lock(false); G.audio && G.audio.impact(h.cage.position, 0.5, 'metal'); G.cam.shake(0.15);
}
function serverRack(m) {
  const g = new THREE.Group(); const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.1, 0.9), new THREE.MeshStandardMaterial({ color: 0x15171a, metalness: 0.6, roughness: 0.4 })); body.position.y = 1.05; g.add(body);
  const leds = []; for (let i = 0; i < 14; i++) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.03, 0.02), new THREE.MeshBasicMaterial({ color: 0x2aff8a, toneMapped: false })); l.position.set(0, 0.25 + i * 0.12, 0.46); g.add(l); leds.push(l); }
  const logo = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.02), new THREE.MeshBasicMaterial({ color: 0x8fd3ff, toneMapped: false })); logo.position.set(0, 1.95, 0.46); g.add(logo);
  g.position.copy(SERVER); g.rotation.y = 0; G.scene.add(g); m.track(g);
  const off = m.r.flow.game.addUpdater(() => { for (let i = 0; i < leds.length; i++) leds[i].visible = Math.sin(G.time * (3 + i * 0.7) + i) > (m.vars.dlProgress ? -0.6 : 0.3); }); m.ents.offs.push(off);
  G.world.static.addBox(SERVER.x - 0.6, SERVER.y, SERVER.z - 0.45, SERVER.x + 0.6, SERVER.y + 2.1, SERVER.z + 0.45, { mat: 'metal' });
  return g;
}
function setup(m) {
  baseSetup(m, { hour: 19.1, tier: 1, maxStars: 4, dmg: 0.5, acc: 0.55, heli: true, weapons: ['smg', 'rifle'] });
  G.player.setWeapon('pistol'); G.traffic.populate(); G.peds.populate();
  setHoist(FLOOR(0)); m.ents.offs.push(() => setHoist(FLOOR(0)));
  const c = G.world.landmarks.construction; c.crane.hook.position.set(c.crane.x + 30, 40, c.crane.z); c.crane.hook.visible = true;
}
const halcyon = (m, x, f, z, role = 'hold') => m.npc('halcyon', x, FLOOR(f), z, rand(-3, 3), { role, acc: 0.42 });
async function killAll(m, list, text, sub) {
  const blips = list.map((n) => m.blip(() => n.pos, { color: '#ff4d4d', size: 4 })); const total = list.length; let last = -1;
  await m.until(() => { const left = list.filter((n) => n.alive).length; if (left !== last) { last = left; m.objective(`${text} (${total - left}/${total})`, sub); list.forEach((n, i) => { if (!n.alive && blips[i]) { m.unblip(blips[i]); blips[i] = null; } }); } return left === 0; }, { timeout: 180 });
  for (const b of blips) if (b) m.unblip(b);
}
async function pressE(m, pos, r, prompt, objective, sub) {
  m.objective(objective, sub); const mk = m.marker(pos, { r: 1, h: 3, color: 0x7bd88f }); const b = m.blip(pos, { color: '#ffd36b', size: 7 });
  await m.until(() => { const ok = G.player.pos.distanceTo(pos) < r && Math.abs(G.player.pos.y - pos.y) < 2; G.hud.promptOverride = ok ? `<kbd>E</kbd> ${prompt}` : null; return ok && G.input.pressed('interact'); });
  G.hud.promptOverride = null; m.unmark(mk); m.unblip(b); G.audio && G.audio.ui('pickup');
}

// ---------------- checkpoints ----------------
async function cp0(m) {
  setup(m); m.vars.alarm = false; m.music('skyline', 1);
  const sv = m.vehicle('strada', { x: 100, y: 0, z: -128, yaw: Math.PI / 2, color: 0x23333d }); sv.engineOn = false; m.vars.sv = sv;
  G.player.teleport(104, 0.15, -133, Math.PI / 2); G.cam.yaw = Math.PI / 2;
  m.r.flow.showIntro(m.def);
  m.say('ADA', 'Halcyon\'s real servers aren\'t in a vault. They\'re on the thirteenth floor of a tower that doesn\'t officially exist yet.');
  await m.cine({ dur: 7, fov: 38, pos: (k) => V3(110 + k * 12, 6 + k * 40, -100 - k * 20), look: (k) => V3(166, 10 + k * 40, -167) });
  m.r.flow.hideIntro();
  m.say('DEZ', 'Three guards on the ground, more upstairs. The builders\' hoist runs up the north face. Quiet is good. Loud also works.');
  const guards = [[124, -150], [140, -140], [150, -142]].map(([x, z]) => { const n = m.npc('guard', x, 0.15, z, rand(-3, 3), { role: 'hold', calm: true }); return n; }); m.vars.guards = guards;
  m.objective('GET TO THE BUILDERS\' HOIST', 'NORTH FACE OF THE TOWER · AVOID THE GUARDS (OR DON\'T)');
  const start = V3((HX0 + HX1) / 2, FLOOR(0), (HZ0 + HZ1) / 2); const b = m.blip(start, { color: '#ffd36b', size: 7 }); const mk = m.marker(start, { r: 1.6, h: 4 });
  await m.until(() => { if (!m.vars.alarm && guards.some((g) => !g.calm || !g.alive)) { m.vars.alarm = true; m.say('JUNO', 'They made you. Alarm\'s up — expect company upstairs.'); m.intensity(3); } return m.near(start, 1.6, G.player.pos) && !G.player.vehicle; });
  m.unblip(b); m.unmark(mk);
  if (!m.vars.alarm) G.stunts.award('GHOST', 500, 'UNSEEN');
  m.say('KIT', 'Going up.');
  await ride(m, FLOOR(10) - 0.0, 9);
}
async function cp1(m, fresh) {
  if (fresh) { setup(m); setHoist(FLOOR(10)); G.player.teleport((HX0 + HX1) / 2, FLOOR(10), (HZ0 + HZ1) / 2, Math.PI); m.music('skyline', 3); }
  G.player.setWeapon('smg'); m.intensity(4);
  m.say('JUNO', 'Hoist just lost power — that\'s not me. Floor ten is crawling.');
  const pts = [[156, -158, 'hold'], [170, -156, 'flank'], [176, -170, 'hold'], [160, -176, 'flank'], [168, -182, 'hold']]; if (m.vars.alarm) pts.push([152, -168, 'flank'], [180, -160, 'hold']);
  const squad = pts.map(([x, z, r]) => halcyon(m, x, 10, z, r));
  await killAll(m, squad, 'CLEAR FLOOR 10', 'FORTY METRES UP · THE STEEL COLUMNS ARE YOUR COVER');
  G.stunts.award('HIGH GROUND', 400);
}
async function cp2(m, fresh) {
  if (fresh) { setup(m); setHoist(FLOOR(10)); G.player.teleport(166, FLOOR(10), -160, Math.PI); m.music('skyline', 3); }
  G.player.setWeapon('smg');
  m.say('DEZ', 'The hoist generator is in the south-east corner. Kick it back on.');
  await pressE(m, GEN, 1.8, 'Restart the generator', 'RESTORE POWER', 'GENERATOR · SOUTH-EAST CORNER OF FLOOR 10');
  G.audio && G.audio.impact(GEN, 0.6, 'metal'); G.fx && G.fx.smokePuff(V3(GEN.x, GEN.y + 1, GEN.z), { n: 6, size: 1, life: 2 });
  m.objective('BACK TO THE HOIST', 'RIDE UP TO FLOOR 13');
  const at = V3((HX0 + HX1) / 2, FLOOR(10), (HZ0 + HZ1) / 2); const b = m.blip(at, { color: '#ffd36b', size: 7 }); const mk = m.marker(at, { r: 1.6, h: 4 });
  await m.until(() => m.near(at, 1.6, G.player.pos)); m.unblip(b); m.unmark(mk);
  await ride(m, FLOOR(13), 6);
}
async function cp3(m, fresh) {
  if (fresh) { setup(m); setHoist(FLOOR(13)); G.player.teleport((HX0 + HX1) / 2, FLOOR(13), (HZ0 + HZ1) / 2, Math.PI); m.music('skyline', 4); }
  G.player.setWeapon('rifle'); serverRack(m); m.intensity(4);
  m.say('ADA', 'South-east corner. Plug in and don\'t let anyone pull it until it says one hundred.');
  await pressE(m, SERVER, 1.8, 'Start the download', 'REACH THE SERVER', 'FLOOR 13 · SOUTH-EAST CORNER');
  // hold out
  const DUR = 50; m.vars.dlProgress = 0.001; let t = 0; let wave = 0; const waves = [6, 20, 34];
  const all = [];
  let lt = m.r.stats.time; await m.until(() => {
    const dt = m.r.stats.time - lt; lt = m.r.stats.time; t += dt; const near = G.player.pos.distanceTo(SERVER) < 14;
    if (near) m.vars.dlProgress = Math.min(1, m.vars.dlProgress + dt / DUR);
    const pct = Math.floor(m.vars.dlProgress * 100);
    m.objective(`DOWNLOAD ${pct}%`, near ? 'HOLD THE FLOOR · THEY\'RE COMING UP THE STAIRWELL' : 'GET BACK TO THE SERVER — THE DOWNLOAD PAUSES WITHOUT YOU');
    if (wave < waves.length && t > waves[wave]) { wave++; for (let i = 0; i < 2 + wave; i++) { const n = halcyon(m, STAIR13.x + rand(-1, 1), 13, STAIR13.z + i * 1.2, i % 2 ? 'flank' : 'hold'); all.push(n); } m.say('JUNO', wave === 3 ? 'Last team. Big one.' : 'Stairwell — more of them!'); }
    return m.vars.dlProgress >= 1;
  });
  G.stunts.award('DATA HEIST', 700, '100%');
}
async function cp4(m, fresh) {
  if (fresh) { setup(m); setHoist(FLOOR(13)); serverRack(m); m.vars.dlProgress = 1; G.player.teleport(SERVER.x - 2, FLOOR(13), SERVER.z + 2, Math.PI); m.music('skyline', 4); G.player.setWeapon('rifle'); }
  const S = G.world.static;
  // twist: the demolition charges
  G.audio && G.audio.ui('beepUrgent');
  m.say('ADA', 'Oh no. They\'ve armed the demolition charges. They\'d rather drop the whole tower than let that data walk out.');
  await m.wait(1.2);
  m.say('DEZ', 'Crane hook — west edge! I\'m swinging it in. RUN!');
  m.timer(26, { failReason: 'THE TOWER CAME DOWN WITH YOU ON IT' }); m.slowmo(0.8, 0.5);
  const crane = G.world.landmarks.construction.crane; const hook = crane.hook;
  // swing the hook in to the west edge
  const h0 = hook.position.clone(); let ht = 0; const offH = m.r.flow.game.addUpdater((dt) => { if (G.paused) return; ht = Math.min(1, ht + dt / 6); const e = ht * ht * (3 - 2 * ht); hook.position.set(h0.x + (HOOK_AT.x - 1.6 - h0.x) * e, h0.y + (HOOK_AT.y + 2.2 - h0.y) * e, crane.z); hook.rotation.y = Math.sin(G.time * 1.3) * 0.1; }); m.ents.offs.push(offH);
  // the floor tears itself apart: charges, falling beams that become new obstacles, dust
  const beams = []; const steel = new THREE.MeshStandardMaterial({ color: 0x6d737a, metalness: 0.7, roughness: 0.45 });
  const blasts = [[164, -168], [158, -176], [160, -160], [154, -170], [166, -154]]; let bt = 0, bi = 0;
  const dropBeam = (x, z, yaw) => { const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 7), steel); mesh.position.set(x, FLOOR(13) + 14, z); mesh.rotation.y = yaw; mesh.castShadow = true; G.scene.add(mesh); m.track(mesh); beams.push({ mesh, x, z, yaw, vy: 0, landed: false }); };
  const offC = m.r.flow.game.addUpdater((dt) => {
    if (G.paused) return; bt += dt;
    if (bi < blasts.length && bt > 2.2 + bi * 3.4) { const [x, z] = blasts[bi++]; const p = V3(x, FLOOR(13) - 1.5, z); G.fx && G.fx.explosion(p, 0.9); G.audio && G.audio.explosion(p, 0.9); G.cam.shake(0.7); G.input.rumble(0.8, 0.8, 400); G.fx && G.fx.dust(V3(x, FLOOR(13) + 0.5, z), 14, 3.5); dropBeam(x + rand(-2, 2), z + rand(-2, 2), rand(0, Math.PI)); if (bi % 2) dropBeam(rand(151, 166), rand(-180, -152), rand(0, Math.PI)); }
    for (const b of beams) { if (b.landed) continue; b.vy -= 22 * dt; b.mesh.position.y += b.vy * dt; b.mesh.rotation.z += dt * 0.6; if (b.mesh.position.y <= FLOOR(13) + 0.3) { b.landed = true; b.mesh.position.y = FLOOR(13) + 0.3; b.mesh.rotation.z = 0; G.audio && G.audio.impact(b.mesh.position, 1, 'metal'); G.fx && G.fx.dust(b.mesh.position, 10, 2.5); G.cam.shake(0.3);
      const c = Math.abs(Math.cos(b.yaw)), s2 = Math.abs(Math.sin(b.yaw)); const hx = 0.25 * c + 3.5 * s2, hz = 0.25 * s2 + 3.5 * c; const box = S.addBox(b.x - hx, FLOOR(13), b.z - hz, b.x + hx, FLOOR(13) + 0.6, b.z + hz, { mat: 'metal' }); m.ents.offs.push(() => { box.disabled = true; });
      if (G.player.pos.distanceTo(b.mesh.position) < 2.5) G.player.hit(25, new THREE.Vector3(0, -1, 0), b.mesh.position.clone(), false, null, 'crush'); } }
  }); m.ents.offs.push(offC);
  m.objective('GET TO THE CRANE HOOK', 'WEST EDGE OF THE FLOOR · VAULT THE FALLING BEAMS');
  await pressE(m, HOOK_AT, 2.2, 'GRAB THE HOOK', 'GET TO THE CRANE HOOK', 'WEST EDGE OF THE FLOOR · VAULT THE FALLING BEAMS');
  m.stopTimer(); G.stunts.award('HOOKED', 900, 'OFF THE SKYLINE');
}
async function cp5(m, fresh) {
  const crane = G.world.landmarks.construction.crane; const hook = crane.hook;
  if (fresh) { setup(m); hook.position.set(HOOK_AT.x - 1.6, HOOK_AT.y + 2.2, crane.z); }
  // the swing-out + the crown of the tower coming down
  m.lock(true); m.intensity(4); G.player.setWeapon('pistol');
  const from = hook.position.clone(), to = V3(124, 4.6, crane.z); const debris = []; const conc = new THREE.MeshStandardMaterial({ color: 0x9a978f, roughness: 0.9 }), steel = new THREE.MeshStandardMaterial({ color: 0x6d737a, metalness: 0.7, roughness: 0.45 });
  for (let i = 0; i < 46; i++) { const big = i < 14; const mesh = new THREE.Mesh(new THREE.BoxGeometry(big ? rand(3, 7) : rand(0.4, 1.5), big ? 0.35 : rand(0.3, 1), big ? rand(3, 7) : rand(0.4, 2.5)), big || i % 3 ? conc : steel); mesh.position.set(rand(151, 181), FLOOR(rand(11, 15)), rand(-183, -151)); mesh.visible = false; mesh.castShadow = true; G.scene.add(mesh); m.track(mesh); debris.push({ mesh, vy: rand(-2, 3), vx: rand(-3, 3), vz: rand(-3, 3), rx: rand(-2, 2), rz: rand(-2, 2), t0: rand(0.5, 3.5) }); }
  let t = 0; const T = 8.5;
  const offS = m.r.flow.game.addUpdater((dt) => {
    if (G.paused) return; t += dt; const k = Math.min(1, t / T); const e = k * k * (3 - 2 * k); const sw = Math.sin(k * Math.PI) * 6;
    hook.position.set(from.x + (to.x - from.x) * e, from.y + (to.y - from.y) * e + sw * 0.4, crane.z + Math.sin(k * Math.PI * 2) * 2.5);
    G.player.pos.set(hook.position.x + 0.3, hook.position.y - 2.3, hook.position.z); G.player.vel.set(0, 0, 0); G.player.vy = 0; G.player.human.state = 'climb';
    for (const d of debris) { if (t < d.t0) continue; d.mesh.visible = true; d.vy -= 18 * dt; d.mesh.position.x += d.vx * dt; d.mesh.position.y += d.vy * dt; d.mesh.position.z += d.vz * dt; d.mesh.rotation.x += d.rx * dt; d.mesh.rotation.z += d.rz * dt; if (d.mesh.position.y < 0.4) { d.mesh.position.y = 0.4; d.vy = 0; d.vx *= 0.3; d.vz *= 0.3; d.rx = d.rz = 0; if (!d.hit) { d.hit = true; G.fx && G.fx.dust(d.mesh.position, 8, 4); } } }
    if (Math.floor(t * 3) !== Math.floor((t - dt) * 3) && t < 5.5) { const p = V3(rand(150, 182), FLOOR(Math.floor(rand(2, 14))), rand(-184, -150)); G.fx && G.fx.explosion(p, 0.8 + Math.random() * 0.6); G.audio && G.audio.explosion(p, 0.7); G.fx && G.fx.dust(p, 18, 6); }
  }); m.ents.offs.push(offS);
  G.cam.shake(1); m.slowmo(1.6, 0.35);
  await m.cine({ dur: T, fov: 52, letterbox: true, pos: (k) => V3(95 + k * 10, 18 + k * 6, -125 - k * 10), look: (k) => V3(150 - k * 20, 40 - k * 32, -165) });
  m.lock(false); G.player.human.state = 'idle'; G.player.teleport(to.x + 1, 0.15, to.z + 2, Math.PI / 2);
  m.say('KIT', 'Note to self: never again.');
}
async function cp6(m, fresh) {
  if (fresh) { setup(m); G.player.teleport(125, 0.15, -163, Math.PI / 2); }
  m.music('skyline', 4); m.intensity(4); G.police.setStars(4); G.police.minStars = 3;
  const sv = m.vars.sv && !m.vars.sv.removed ? m.vars.sv : m.vehicle('strada', { x: 100, y: 0, z: -128, yaw: Math.PI / 2, color: 0x23333d }); m.vars.sv = sv; sv.engineOn = true;
  m.say('DEZ', 'Half of Port Sol just watched a tower lose its hat. Strada\'s at the west gate — keys in.');
  m.objective('GET TO THE STRADA', 'WEST GATE'); const b = m.blip(() => sv.pos, { color: '#ffd36b', size: 7, waypoint: true });
  await m.until(() => G.player.vehicle === sv); m.unblip(b);
  await loseCops(m, 'LOSE THE COPS — FOUR STARS', 'THE CHOPPER\'S SEARCHLIGHT IS ON YOU · TUNNELS AND OVERPASSES BREAK ITS SIGHT');
  m.intensity(2);
  await hideoutEnding(m, [
    ['ADA', 'Decrypting… this isn\'t just Halcyon\'s books. It\'s the city. Every traffic light, every camera, every police dispatch.', 4.4],
    ['JUNO', 'They built a skeleton key for Port Sol. And they hid it in a building nobody would ever look inside.', 4],
    ['DEZ', 'And we just knocked the top off it.', 2.4],
    ['ADA', 'Which means they know we have it. They\'re going to come for all of us now.', 3.4],
    ['KIT', 'Good. I\'m done running.', 2.4],
  ], 17);
}
export const M05 = {
  id: 'm05', num: 5, act: 0, title: 'THE SKYLINE JOB', music: 'skyline', par: 660,
  desc: 'Climb an unfinished tower, steal Halcyon\'s server data on floor 13, and escape on a crane hook as the demolition charges bring the top down.',
  unlocks: [{ vehicle: 'strada' }, { track: 'skyline' }],
  deathText: 'KIT WENT DOWN', checkpoints: [cp0, cp1, cp2, cp3, cp4, cp5, cp6],
};
