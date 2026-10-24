// THE FALLING TRAM — the prologue's playable emergency.
//  A: the haul cable snaps; the tram slides down the work line toward the Undercroft.
//     Capture its momentum to slow it, release into each tower's brake clamp.
//  B: the track cable fails; the tram falls. Capture the fall, redirect the stored
//     momentum into the Undercroft crane — it swings round and catches the cabin.
//  C: get to the hanging tram, blow the jammed hatch, get the crew out, catch whoever slips.
import * as THREE from 'three';
import { tween } from '../characters/npc.js';
import { Builder } from '../world/builder.js';
import { SP } from '../world/district_spine.js';
import { Actor } from '../characters/npc.js';
import { randomLook } from '../characters/rig.js';
import { clamp, damp, ease, lerp, sleep } from '../core/util.js';

const _v = new THREE.Vector3();
export const TOWER_T = [0.4, 0.78];

export class WorkTram {
  constructor(game) {
    this.game = game;
    const S = game.districts.spine;
    this.line = S.line; this.L = SP.lineU.distanceTo(SP.lineL);
    this.dir = SP.lineL.clone().sub(SP.lineU).normalize();
    this.s = 0; this.v = 0; this.state = 'idle'; this.t = 0;
    this.group = new THREE.Group(); game.engine.cityRoot.add(this.group);
    this.cabin = new THREE.Group(); this.group.add(this.cabin);
    this.build();
    this.swing = new THREE.Vector2(); this.swingV = new THREE.Vector2();
    this.pos = new THREE.Vector3(); this.vel = new THREE.Vector3();
    this.crew = [];
    this.group.visible = false;
  }
  build() {
    const g = this.game;
    // carriage on the line
    const cb = new Builder(g, this.group, { cell: 1000 });
    cb.box('darkSteel', [0, 0.3, 0], [1.4, 1.2, 3.2], { color: 0x3a3a3a, collide: false });
    cb.cyl('steel', [0, 0.9, -1.0], 0.35, 0.4, { rz: Math.PI / 2, color: 0x9a9a9a, seg: 10 }); cb.cyl('steel', [0, 0.9, 1.0], 0.35, 0.4, { rz: Math.PI / 2, color: 0x9a9a9a, seg: 10 });
    cb.tube('darkSteel', [0, -0.2, 0], [0, -2.4, 0], 0.18, { color: 0x3a3a3a });
    cb.finalize();
    // cabin hangs below the carriage
    this.cabin.position.set(0, -4.1, 0);
    const b = new Builder(g, this.cabin, { cell: 1000 });
    const L = 7.6, W = 2.6, H = 2.6;
    b.box('paint', [0, 0, 0], [W, 0.2, L], { color: 0x5a5852, collide: false });
    b.box('paint', [0, H, 0], [W + 0.2, 0.25, L + 0.2], { color: 0xd8a030, collide: false, ao: false });
    for (const sz of [-1, 1]) { b.box('paint', [0, H / 2, sz * L / 2], [W, H, 0.12], { color: 0xd8a030, collide: false, ao: false }); b.box('glass', [0, H * 0.6, sz * (L / 2 + 0.07)], [W - 0.5, 1, 0.04], { collide: false }); }
    for (const sx of [-1, 1]) { b.box('paint', [sx * W / 2, 0.55, 0], [0.1, 1.0, L], { color: 0xd8a030, collide: false, ao: false }); for (let z = -L / 2 + 0.2; z <= L / 2; z += 1.9) b.box('paint', [sx * W / 2, H * 0.62, z], [0.1, H * 0.76, 0.12], { color: 0x3a3a3a, collide: false }); b.box('glass', [sx * W / 2, 1.75, 0], [0.04, 1.2, L - 0.3], { collide: false }); }
    b.box('hazard', [0, 0.2, 0], [W + 0.1, 0.25, L + 0.1], { collide: false, tex: 1 });
    // roof hatch
    b.box('darkSteel', [0, H + 0.18, 1.2], [1.0, 0.1, 1.0], { color: 0x2a2a2a, collide: false });
    b.box('lampRed', [0.9, H + 0.2, -3.2], [0.2, 0.15, 0.2], { collide: false, ao: false });
    b.finalize();
    this.hatch = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.08, 1.05), new THREE.MeshStandardMaterial({ color: 0x8a8a7a, metalness: 0.6, roughness: 0.4 }));
    this.hatch.position.set(0, H + 0.26, 1.2); this.cabin.add(this.hatch);
    this.light = new THREE.PointLight(0xffd8a0, 20, 7, 2); this.light.position.set(0, 2.2, 0); this.cabin.add(this.light);
    this.seats = [[-0.8, -2.4], [0.8, -1.0], [-0.8, 0.6], [0.8, 2.6]].map(([x, z]) => { const s = new THREE.Object3D(); s.position.set(x, 0.1, z); s.rotation.y = x > 0 ? -Math.PI / 2 : Math.PI / 2; this.cabin.add(s); return s; });
  }
  makeKinematic() {
    if (this.kin) return;
    this.kin = this.game.physics.addKinematic(this.cabin, [{ type: 'box', hx: 1.4, hy: 0.15, hz: 3.9, pos: { x: 0, y: 2.7, z: 0 } }, { type: 'box', hx: 1.3, hy: 1.3, hz: 3.8, pos: { x: 0, y: 1.3, z: 0 } }]);
  }
  spawnCrew() {
    const names = ['IVO', 'DACE', null, null];
    this.crew = this.seats.map((s, i) => {
      const a = new Actor(this.game, { name: names[i], look: randomLook(900 + i, { outfit: 'worker', primary: ['#d87a30', '#5a6a7a', '#7a5a3a', '#4a6a4a'][i] }) });
      a.mount = s; a.pose('sit'); a.cull = 400; this.game.addActor(a); return a;
    });
    this.ivo = this.crew[0]; this.dace = this.crew[1];
  }
  placeOnLine(s) {
    const p = SP.lineU.clone().addScaledVector(this.dir, s);
    this.group.position.copy(p);
    const yaw = Math.atan2(this.dir.x, this.dir.z);
    this.group.rotation.set(0, yaw, 0);
  }
  cabinWorld() { this.cabin.updateMatrixWorld(true); return new THREE.Vector3(0, 1.3, 0).applyMatrix4(this.cabin.matrixWorld); }
  update(dt) {
    this.t += dt;
    const g = this.game;
    if (this.state === 'descend' || this.state === 'slide' || this.state === 'braked') {
      if (this.state === 'descend') { this.v = damp(this.v, 2.2, 1, dt); }
      if (this.state === 'slide') { this.v += 4.6 * dt; }
      if (this.state === 'braked') { this.v = damp(this.v, 0, 6, dt); }
      this.s += this.v * dt;
      this.placeOnLine(this.s);
      // sway of the cabin under the carriage
      const acc = this.state === 'slide' ? 1 : 0.15;
      this.swingV.x += (-this.swing.x * 3 - this.swingV.x * 0.6 + (this.state === 'slide' ? -0.6 : 0) * acc) * dt;
      this.swing.x += this.swingV.x * dt;
      this.cabin.rotation.x = this.swing.x * 0.3;
    } else if (this.state === 'fall') {
      this.vel.y -= 15 * dt; this.pos.addScaledVector(this.vel, dt);
      this.group.position.copy(this.pos);
      this.group.rotation.z += dt * 0.25; this.group.rotation.x += dt * 0.15;
    } else if (this.state === 'hang') {
      // pendulum under the crane catch
      this.swingV.x += (-this.swing.x * 1.4 - this.swingV.x * 0.12) * dt; this.swing.x += this.swingV.x * dt;
      this.swingV.y += (-this.swing.y * 1.4 - this.swingV.y * 0.12) * dt; this.swing.y += this.swingV.y * dt;
      this.group.position.copy(this.hangPos);
      this.group.rotation.set(this.swing.x * 0.25, this.hangYaw, this.swing.y * 0.25 + this.tilt);
    } else if (this.state === 'drop') {
      this.vel.y -= 15 * dt; this.pos.addScaledVector(this.vel, dt); this.group.position.copy(this.pos);
      this.group.rotation.x += dt * 0.4; this.group.rotation.z += dt * 0.3;
    }
    // sparks while sliding fast on the cable
    if (this.state === 'slide' && this.v > 5 && Math.random() < 0.6) g.fx.sparks(this.group.position.clone().add(new THREE.Vector3(0, 0.8, 0)), new THREE.Vector3(0, 1, 0), 3, 4);
  }
}

// --------------------------------------------------------------------------- the sequence
// A crew member climbs up out of the cabin hatch (from inside) and hand over hand up the line to
// the boom (`top`), or just out onto the roof when `top` is null.
async function climbOut(a, hatch, top) {
  const g = a.game, inside = hatch.clone().add(new THREE.Vector3(0, -1.1, 0)), roof = hatch.clone().add(new THREE.Vector3(0, 0.15, 0));
  a.anim.setMode('ladder'); a.anim.grounded = true; a.place(inside, a.yaw);
  await tween(g, 0.7, k => { a.pos.lerpVectors(inside, roof, k); a.anim.climbPhase = k * 6; });
  if (!top) return;
  const d = top.clone().sub(roof); a.yaw = Math.atan2(d.x, d.z);
  await tween(g, Math.max(0.8, d.length() / 2.2), k => { a.pos.lerpVectors(roof, top, k); a.anim.climbPhase = 6 + k * 14; });
  a.pose('loco');
}

export async function runRescue(story, startStage = 'A') {
  const g = story.game, S = g.districts.spine, P = g.player, T = g.tether, D = g.dialogue;
  const tram = story.workTram || (story.workTram = new WorkTram(g));
  const off = [];
  g.add(dt => tram.update(dt));
  const stage = { failed: false };
  const fail = async (why) => { if (stage.failed) return; stage.failed = true; await story.failState(why); };

  // crane starts swung away from the line
  const finalYaw = () => S.boom.userData.finalYaw;
  const towerPos = (i) => SP.lineU.clone().lerp(SP.lineL, TOWER_T[i]);

  // ---------------- tether targets
  const tramTarget = {
    kind: 'tram', label: 'Work tram', big: true, priority: 3, radius: 2.5,
    enabled: () => ['slide', 'fall', 'hang', 'braked'].includes(tram.state),
    getPos: () => tram.cabinWorld(), getVel: () => tram.state === 'slide' ? tram.dir.clone().multiplyScalar(tram.v) : tram.vel,
    capture: (dt) => {
      if (tram.state === 'slide') { tram.v = Math.max(0.6, tram.v - 8.5 * dt); return 2400 * dt; }
      if (tram.state === 'fall') { tram.vel.y = damp(tram.vel.y, 0.6, 9, dt); tram.vel.x *= 0.9; tram.vel.z *= 0.9; return 3200 * dt; }
      if (tram.state === 'hang') { tram.swingV.multiplyScalar(0.95); return 700 * dt; }
      return 0;
    },
    push: () => { g.hud.notify('The tram has nowhere to go — use the machinery'); },
  };
  off.push(T.register(tramTarget));
  const clampTargets = [0, 1].map(i => ({
    kind: 'special', label: 'Brake clamp', priority: 4, radius: 1.5, range: 70,
    enabled: () => (tram.state === 'slide' || tram.state === 'descend') && !S.towers[i].engaged,
    getPos: () => S.towers[i].clamp.position.clone().add(new THREE.Vector3(0, 1.2, 0)),
    getVel: () => new THREE.Vector3(), capture: () => 0,
    push: (imp, cells) => {
      const tw = S.towers[i]; const ts = TOWER_T[i] * tram.L;
      g.audio.clank(tw.clamp.position, 2, 0.7); g.fx.sparks(tw.clamp.position.clone().add(new THREE.Vector3(0, 1, 0)), new THREE.Vector3(0, 1, 0), 30, 7);
      tw.engaged = true; tw.lever.rotation.z = 0.5; tw.lamp.material.color.setRGB(0.4, 4, 0.6);
      if (tram.s < ts - 0.5) { tw.armed = true; g.events.emit('clamp:armed', i); }
      else { g.dialogue.bark('NIA', 'It\'s already past that one!', 2); tw.wasted = true; }
    },
  }));
  clampTargets.forEach(t => off.push(T.register(t)));
  const craneTarget = {
    kind: 'special', label: 'Undercroft crane', priority: 5, radius: 3, big: true, range: 80,
    enabled: () => tram.state === 'fall' && !stage.caught,
    getPos: () => S.crane.position.clone().add(new THREE.Vector3(0, -5, 0)),
    getVel: () => new THREE.Vector3(), capture: () => 0,
    push: (imp, cells) => { if (cells >= 2) stage.caught = true; else { g.dialogue.bark('BRAM', 'Not enough! Fill the cells, kid!', 2.4); g.audio.metalStress(S.crane.position, 0.8); S.boom.rotation.y += 0.15; } },
  };
  off.push(T.register(craneTarget));
  const hatchTarget = {
    kind: 'special', label: 'Jammed hatch', priority: 4, radius: 1.2, range: 30,
    enabled: () => tram.state === 'hang' && !stage.hatchOpen,
    getPos: () => { tram.cabin.updateMatrixWorld(true); return tram.hatch.getWorldPosition(new THREE.Vector3()); },
    getVel: () => new THREE.Vector3(), capture: () => 0,
    push: () => { stage.hatchOpen = true; },
  };
  off.push(T.register(hatchTarget));
  const ivoTarget = {
    kind: 'special', label: 'Ivo', priority: 6, radius: 1, range: 45,
    enabled: () => stage.ivoFalling && !stage.ivoCaught,
    getPos: () => tram.ivo.pos.clone().add(new THREE.Vector3(0, 1, 0)), getVel: () => new THREE.Vector3(0, -8, 0),
    capture: (dt) => { stage.ivoHeld = (stage.ivoHeld || 0) + dt; return 400 * dt; },
    push: () => {},
  };
  off.push(T.register(ivoTarget));
  const cleanup = () => { off.forEach(f => f()); g.slowmo = 1; g.engine.grade.uniforms.uFocus.value = 0; };
  story.rescueCleanup = cleanup;

  // ---------------- setup
  tram.group.visible = true;
  if (!tram.crew.length) tram.spawnCrew();
  tram.crew.forEach(a => { a.mount = tram.seats[tram.crew.indexOf(a)]; a.pose('sit'); a.hidden = false; });
  S.towers.forEach(tw => { tw.engaged = false; tw.armed = false; tw.wasted = false; tw.lever.rotation.z = -0.9; tw.lamp.material.color.setRGB(4, 0.4, 0.1); });
  // crane parked swung away
  if (S.boom.userData.finalYaw === undefined) S.boom.userData.finalYaw = S.boom.rotation.y;
  S.boom.rotation.y = finalYaw() + 1.35;
  S.craneAnchorOn = false;

  if (startStage === 'A') {
    tram.state = 'descend'; tram.s = 0; tram.v = 0; tram.placeOnLine(0);
    g.audio.music.play('exterior', 2);
    await D.radio('OPS', 'All crews, Undercroft shift change. Work tram descending from E-4.', { wait: false });
    await story.wait(2.6);
    D.radio('DACE', 'Morning, Runner! Saw the show with the Shearer. Remind me never to owe you money.', { wait: false });
    await story.waitFor(() => tram.s > 10.5);
    // the snap
    g.audio.cableSnap(tram.group.position.clone().add(new THREE.Vector3(0, 2, 0)));
    g.fx.sparks(tram.group.position.clone().add(new THREE.Vector3(0, 1.4, 0)), new THREE.Vector3(0, 1, 0), 40, 9);
    g.camera.shake(0.4);
    story.whipCable(tram.group.position.clone());
    tram.state = 'slide'; tram.v = 2.5;
    g.audio.music.play('rescue', 0.5);
    g.slowmo = 0.7;
    D.radio('NIA', 'The haul cable — it\'s gone! The scavs cut it halfway through!', { wait: false, dur: 2.6 });
    g.hud.setObjective('Stop the tram', 'Capture its momentum [E] · Release it into the brake clamps [Q]', () => tram.group.position);
    g.hud.hint('capture', true); story.wait(3.5).then(() => g.hud.hint('release', true)).catch(() => {});
    await story.wait(2.6);
    D.radio('BRAM', 'Slow it down, kid! Throw it into the clamps on the towers!', { wait: false, dur: 3 });
    // stage A loop: two towers
    for (let i = 0; i < 2; i++) {
      const ts = TOWER_T[i] * tram.L;
      await story.waitFor(() => stage.failed || (tram.s >= ts - 1.5 && S.towers[i].armed) || (tram.s > ts + 1));
      if (stage.failed) break;
      if (S.towers[i].armed) {
        tram.state = 'braked'; tram.s = Math.min(tram.s, ts);
        g.audio.metalStress(S.towers[i].clamp.position, 2.2);
        g.fx.sparks(S.towers[i].clamp.position.clone(), new THREE.Vector3(0, 1, 0), 50, 8);
        g.camera.shake(0.3);
        if (i === 0) { D.radio('NIA', 'It caught! It— no, the clamp won\'t hold that weight!', { wait: false, dur: 2.6 }); await story.wait(2.6); g.audio.clank(S.towers[i].clamp.position, 2, 0.5); g.fx.sparks(S.towers[i].clamp.position.clone(), new THREE.Vector3(0, 1, 0), 40, 9); tram.state = 'slide'; tram.v = 1.2; S.towers[i].lever.rotation.z = 1.4; }
      } else {
        // missed the clamp: if it was the last one, the tram crashes into the station
        if (i === 1 || tram.v > 9) { await story.waitFor(() => tram.s > tram.L - 8); return fail('The tram slammed into the Undercroft station.'); }
      }
    }
    if (stage.failed) return;
    // braked at tower 2 — then the track cable gives
    await story.wait(1.6);
    D.radio('IVO', 'We\'re stopped— we\'re stopped! Oh gods, thank—', { wait: false, dur: 2 });
    await story.wait(1.8);
    startStage = 'B';
  }
  if (startStage === 'B') {
    if (tram.state !== 'braked') { tram.state = 'braked'; tram.s = TOWER_T[1] * tram.L; tram.placeOnLine(tram.s); }
    g.audio.cableSnap(SP.lineU.clone()); g.audio.metalStress(towerPos(1), 2);
    story.whipCable(SP.lineU.clone());
    g.camera.shake(0.6);
    tram.pos.copy(tram.group.position); tram.vel.set(0, -1, 0); tram.state = 'fall';
    tram.makeKinematic();
    g.hud.setObjective('Catch the tram', 'Capture the fall [E], then release the momentum into the crane [Q]', () => tram.group.position);
    D.radio('NIA', 'The whole line\'s down — it\'s falling onto the platform!', { wait: false, dur: 2.4 });
    // kinetic focus: time slows hard while you work the tether
    const focus = g.add((dt, dtr) => {
      const want = (T.capturing || (T.target === tramTarget) || T.target === craneTarget) && tram.state === 'fall' ? 0.28 : (tram.state === 'fall' ? 0.55 : 1);
      g.slowmo = damp(g.slowmo, want, 6, dtr);
      g.engine.grade.uniforms.uFocus.value = damp(g.engine.grade.uniforms.uFocus.value, tram.state === 'fall' ? 1 : 0, 4, dtr);
      if (tram.state === 'fall' && T.cells >= 2 && !stage.promptShown) { stage.promptShown = true; g.hud.setObjective('REDIRECT', 'Aim at the Undercroft crane and RELEASE [Q]', S.crane.position); g.dialogue.bark('BRAM', 'You\'ve got it! The crane — throw it into the crane!', 3); }
    });
    await story.waitFor(() => stage.caught || tram.pos.y < SP.under + 3.2);
    focus();
    if (!stage.caught) {
      g.fx.explosion(tram.pos.clone(), 1.2); g.audio.explosion(tram.pos.clone(), 1.5);
      return fail('The tram came down on the Undercroft.');
    }
    // the crane swings round and catches the cabin
    g.slowmo = 0.45;
    g.audio.metalStress(S.crane.position, 2.5); g.audio.clank(S.crane.position, 2.5, 0.4);
    const y0 = S.boom.rotation.y, y1 = finalYaw();
    const from = tram.pos.clone();
    const hang = SP.hook.clone().add(new THREE.Vector3(0, -2.6, 0)); // carriage hangs under the catch frame
    tram.state = 'catching';
    const t0 = g.time;
    await story.waitFor(() => {
      const k = clamp((g.time - t0) / 1.1, 0, 1);
      S.boom.rotation.y = lerp(y0, y1, ease.outBack(k));
      tram.group.position.lerpVectors(from, hang, ease.outCubic(k));
      return k >= 1;
    });
    g.fx.sparks(SP.hook.clone(), new THREE.Vector3(0, 1, 0), 60, 9); g.camera.shake(0.5);
    tram.hangPos = hang; tram.hangYaw = tram.group.rotation.y; tram.tilt = 0.12; tram.swing.set(0.4, 0.2); tram.swingV.set(0, 0); tram.group.rotation.x = 0; tram.group.rotation.z = 0;
    tram.state = 'hang';
    g.slowmo = 1; g.engine.grade.uniforms.uFocus.value = 0;
    g.events.emit('rescue:caught');
    await story.wait(0.8);
    D.radio('BRAM', '...HA! Did you— did you just throw a tram into a crane?', { wait: false, dur: 2.8 });
    await story.wait(2.9);
    D.radio('NIA', 'Don\'t celebrate. That catch frame wasn\'t built for this. Get them out of there, Rook.', { wait: false, dur: 3.2 });
    startStage = 'C';
    story.checkpoint('rescueC');
  }
  if (startStage === 'C') {
    if (tram.state !== 'hang') {
      S.boom.rotation.y = finalYaw();
      tram.hangPos = SP.hook.clone().add(new THREE.Vector3(0, -2.6, 0)); tram.hangYaw = Math.atan2(tram.dir.x, tram.dir.z); tram.tilt = 0.12; tram.state = 'hang'; tram.swing.set(0.2, 0.1); tram.makeKinematic();
      tram.group.visible = true;
    }
    S.craneAnchorOn = true;
    g.audio.music.play('tension', 2);
    g.hud.setObjective('Get the crew out', 'Latch to the crane [F] or cross its boom, then blow the jammed hatch [Q]', () => g.engine.cityRoot.worldToLocal(tram.hatch.getWorldPosition(new THREE.Vector3())));
    g.hud.hint('latch', true);
    // hatch
    await story.waitFor(() => stage.hatchOpen || P.pos.y < g.killY + 5);
    tram.hatch.visible = false;
    const hp = tram.hatch.getWorldPosition(new THREE.Vector3());
    g.fx.kineticBurst(hp, 1); g.audio.clank(hp, 1.5, 1.2);
    const lid = tram.hatch.clone(); lid.visible = true; lid.position.copy(hp); g.engine.cityRoot.add(lid);
    const lv = new THREE.Vector3(1, 6, -2);
    g.fx.meshes.push({ m: lid, t: 0, life: 8, update: (e, k, dt) => { lv.y -= 15 * dt; e.m.position.addScaledVector(lv, dt); e.m.rotation.x += dt * 6; } });
    D.radio('DACE', 'Light! There\'s light! Ivo, go— go, up the cable!', { wait: false, dur: 2.6 });
    g.hud.setObjective('Get the crew out', 'Hold position — help them climb');
    // the crew climb out one by one to the boom catwalk
    const tip = S.spots.boomTip.clone();
    const climbers = [tram.crew[3], tram.crew[2], tram.crew[1]];
    for (const [k, a] of climbers.entries()) {
      a.mount = null;
      const top = tip.clone().add(new THREE.Vector3(-0.4 * k, 0.05, 0.6 * k));
      climbOut(a, hp, top).then(() => { a.activity('watch'); a.goTo(S.boomCatwalk.start.clone().add(new THREE.Vector3(1 + k, 0, 2 + k * 0.8)), 1.6); g.audio.footstep(top, 'metal', 0.6); });
      await story.wait(1.3); // the next one follows up the line
    }
    // Ivo slips
    const ivo = tram.ivo; ivo.mount = null;
    await climbOut(ivo, hp, null); // up through the hatch, reaching for the line...
    ivo.pose('loco');
    D.radio('IVO', 'I— my hand, I can\'t—', { wait: false, dur: 1.4 });
    g.audio.whoosh(1);
    stage.ivoFalling = true;
    const ivoV = new THREE.Vector3(0.6, 1.5, 0.4);
    g.slowmo = 0.3; g.engine.grade.uniforms.uFocus.value = 1;
    g.hud.setObjective('CATCH HIM', 'Hold [E] on Ivo', () => tram.ivo.pos);
    const t1 = g.time;
    const fallTick = g.add((dt) => {
      if (stage.ivoCaught) return;
      if ((stage.ivoHeld || 0) > 0.35) { stage.ivoCaught = true; return; }
      if (T.capturing && T.target === ivoTarget) { ivoV.multiplyScalar(Math.pow(0.02, dt)); }
      else ivoV.y -= 15 * dt;
      ivo.pos.addScaledVector(ivoV, dt); ivo.anim.vy = ivoV.y; ivo.anim.grounded = false; ivo.anim.speed = 0;
    });
    await story.waitFor(() => stage.ivoCaught || g.time - t1 > 2.6);
    fallTick();
    g.slowmo = 1; g.engine.grade.uniforms.uFocus.value = 0;
    if (stage.ivoCaught) {
      g.state.flag('ivoCaughtByRook');
      g.state.adjust('nia', 'trust', 1);
      // the beam carries him down to the Undercroft
      const from2 = ivo.pos.clone(), to2 = S.spots.underCenter.clone().add(new THREE.Vector3(14, 0, 4));
      const t2 = g.time;
      const carry = g.add(() => { const k = clamp((g.time - t2) / 2.2, 0, 1); ivo.pos.lerpVectors(from2, to2, ease.inOutCubic(k)); ivo.pos.y += Math.sin(k * Math.PI) * 3; T.beamTarget = ivo.pos.clone().add(new THREE.Vector3(0, 1, 0)); });
      g.audio.tetherHum()?.set(0.4);
      await story.wait(2.3); carry(); g.audio.stopLoop('tetherHum');
      ivo.anim.grounded = true; ivo.pose('kneel');
      D.radio('IVO', '...I\'m down. I\'m down. Runner— thank you. Thank you.', { wait: false, dur: 3 });
    } else {
      // Dace grabs him — saved, but not by Rook
      // Dace catches his wrist; he hangs, then is hauled up onto the catwalk
      const caught = ivo.pos.clone(), below = tip.clone().add(new THREE.Vector3(0, -1.6, 0)), onTop = tip.clone().add(new THREE.Vector3(0.5, 0.05, 1));
      ivo.anim.setMode('hang'); ivo.anim.grounded = true;
      await tween(g, 0.4, k => ivo.pos.lerpVectors(caught, below, k));
      D.radio('DACE', "I've got him— I've GOT him! Pull, Ivo, pull!", { wait: false, dur: 2.6 });
      await story.wait(0.8);
      await tween(g, 1.0, k => ivo.pos.lerpVectors(below, onTop, k));
      ivo.pose('kneel');
      g.state.flag('ivoCaughtByDace');
    }
    stage.crewOut = true;
    // the catch frame is failing
    await story.wait(1.5);
    g.audio.metalStress(SP.hook.clone(), 3);
    g.fx.sparks(SP.hook.clone(), new THREE.Vector3(0, -1, 0), 40, 6);
    g.camera.shake(0.3);
    tram.tilt = 0.35;
    D.radio('BRAM', 'That hook\'s going! Rook, get OFF it!', { wait: false, dur: 2.4 });
    g.hud.setObjective('Get clear!', 'The catch frame is failing', new THREE.Vector3(205, SP.deck, -292));
    await story.wait(4.2);
    // the drop
    const onTram = P.groundCollider && tram.kin && tram.kin.cols.some(c => c.handle === P.groundCollider.handle);
    tram.state = 'drop'; tram.pos.copy(tram.group.position); tram.vel.set(0.5, -2, 0.3);
    g.audio.cableSnap(SP.hook.clone()); g.fx.sparks(SP.hook.clone(), new THREE.Vector3(0, -1, 0), 50, 10);
    if (tram.kin) { g.physics.world.removeRigidBody(tram.kin.body); g.physics.kinematics = g.physics.kinematics.filter(k => k !== tram.kin); tram.kin = null; }
    if (onTram) { await story.wait(1.2); return fail('You went down with the tram.'); }
  }
  cleanup();
  return true;
}
