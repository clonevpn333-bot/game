// CHAPTER TWO — THE PEOPLE BELOW
// Before first bell Rook and Nia take the Mule down without leave. Callow Reach is alive: forty-four
// people, gardens, goats, a school, a flywheel that has never stopped. Imani Osei says the Stillness
// follows the Marchers; Nia believes her, Rook doesn't. Then Meridian walks — the wind dies, engines
// stall, and a harvest array comes down out of her belly. One charge: a family held in the greenhouse,
// or the generator that keeps the whole town through winter. Then the anchor, overloaded — and the
// starboard half of Meridian goes dark. Tomas is waiting in the bay.
import * as THREE from 'three';
import { show, hide } from './cast.js';
import { buildReach } from '../world/zone_reach.js';
import { Stillness } from '../world/stillness.js';
import { GROUND_Y } from '../world/city.js';
import { clamp, damp, dampAngle, lerp } from '../core/util.js';
import { groundMule } from './chapter1.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const worldOf = (o) => o.getWorldPosition(new THREE.Vector3());
export const CH2 = ['c2_title', 'c2_descent', 'c2_reach', 'c2_imani', 'c2_approach', 'c2_choice', 'c2_anchor', 'c2_tomas', 'c2_end'];
const ON_GROUND = new Set(['c2_descent', 'c2_reach', 'c2_imani', 'c2_approach', 'c2_choice', 'c2_anchor']);
const APPROACH = 650; // how far Meridian walks toward the Reach before the harvest

// ------------------------------------------------------------------ the world for chapter two
export function enterReach(s, beat) {
  const g = s.game;
  if (!g.stillness) g.stillness = new Stillness(g);
  if (s.zone && s.zone.name !== 'reach') { s.zone.dispose(); s.zone = null; }
  if (!s.zone) {
    g.city.walking = false; g.city.phase = 0.015; g.city.bob = 0; g.city.roll = 0; g.city.pitch = 0; g.city.update(0, 0);
    s.zone = buildReach(g);
  }
  g.killY = GROUND_Y - 60; g.surface = true;
  if (g.ground.settlement) g.ground.settlement.visible = false;
  // where Meridian stands for this beat: at the Gray Fork before the approach, over the Reach after it
  const after = ['c2_choice', 'c2_anchor'].includes(beat);
  approachMode(s, after || beat === 'c2_approach');
  if (after) { g.city.travel = s.zone.T0 + APPROACH; g.city.walking = false; g.city.phase = 0.015; }
  else if (beat !== 'c2_approach') g.city.travel = s.zone.T0;
}
// approach mode: the ground (and every zone on it) holds still in the physics frame while the city's
// visuals walk toward it; colliders up in the city are irrelevant while Rook is on the ground
export function approachMode(s, on) {
  const g = s.game, Z = s.zone;
  const roots = [g.exterior.root, ...Object.values(g.districts).map(d => d.root)];
  s.apOff?.(); s.apOff = null;
  if (on && Z) {
    g.ground.travelFix = Z.T0;
    s.apOff = g.add(() => {
      const d = g.city.travel - Z.T0;
      g.city.visOffZ = -d;
      g.engine.worldRoot.position.set(0, 0, Z.T0); g.engine.worldRoot.rotation.set(0, 0, 0);
      for (const r of roots) { r.position.z = -d; r.position.y = g.city.bob; }
    });
  } else {
    g.ground.travelFix = null; g.city.visOffZ = 0;
    for (const r of roots) r.position.set(0, 0, 0);
  }
}
export function c2Spawn(s, cp) {
  const Z = s.zone; if (!Z || Z.name !== 'reach') return null;
  const S = Z.spots;
  return { c2_reach: [S.gate, Math.PI], c2_imani: [S.square, Math.PI], c2_choice: [S.square.clone().add(V(6, 0, 4)), Math.PI / 2], c2_anchor: [S.square.clone().add(V(10, 0, 6)), Math.PI * 0.8],
    c2_tomas: [V(176, -38, -186), Math.PI / 2] }[cp] || null;
}
// the blackout: every lamp on the starboard grid goes out (the red emergency lamps stay)
function blackout(s, k) {
  const g = s.game, M = g.materials;
  if (!s.lampSave) { s.lampSave = {}; for (const n of ['lampWarm', 'lampCool', 'lampGreen', 'neonPink', 'neonCyan', 'neonAmber', 'engineGlow']) if (M[n]?.color) s.lampSave[n] = M[n].color.clone(); s.lampSave.gl = M.glassLit.emissiveIntensity; s.lampSave.glc = M.glassLitCool.emissiveIntensity; }
  for (const [n, c] of Object.entries(s.lampSave)) if (c.isColor) M[n].color.copy(c).multiplyScalar(lerp(1, 0.03, k));
  M.glassLit.emissiveIntensity = lerp(s.lampSave.gl, 0, k); M.glassLitCool.emissiveIntensity = lerp(s.lampSave.glc, 0, k);
  g.lightMul = lerp(1, 0.06, k);
}
export function restoreLights(s) { if (s.lampSave) { blackout(s, 0); s.lampSave = null; } }

function harvestArray(s) {
  // a ring of emitters on four cables, lowered out of the hull's belly beside Leg Two
  const g = s.game, grp = new THREE.Group(); grp.position.set(176, -96, -300); g.exterior.root.add(grp);
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2a2c, metalness: 0.7, roughness: 0.4 }), glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.55, 0.18).multiplyScalar(3) });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(9, 0.9, 8, 32), dark); ring.rotation.x = Math.PI / 2; grp.add(ring);
  const core = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 3.6, 4, 16), dark); grp.add(core);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(1.6, 16, 10), glow); eye.position.y = -2.4; grp.add(eye);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, e = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.4, 0.8), glow); e.position.set(Math.cos(a) * 9, -1.2, Math.sin(a) * 9); grp.add(e); }
  const cables = []; for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 1, 6), dark); grp.add(c); cables.push([c, i / 4 * Math.PI * 2 + Math.PI / 4]); }
  const A = { grp, eye, drop: 0, setDrop(d) { A.drop = d; grp.position.y = -96 - d; for (const [c, a] of cables) { c.scale.y = d + 4; c.position.set(Math.cos(a) * 9, (d + 4) / 2, Math.sin(a) * 9); } } };
  A.setDrop(0);
  A.dispose = () => { grp.removeFromParent(); grp.traverse(o => o.geometry?.dispose()); dark.dispose(); glow.dispose(); };
  return A;
}
function beam(s, from, to) {
  const g = s.game, mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.5, 0.15).multiplyScalar(2.4), transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending });
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.9, 1, 10, 1, true), mat); m.frustumCulled = false; g.engine.cityRoot.add(m);
  const B = { m, on: true, w: 1, update() { const a = from(), b = to(), d = b.clone().sub(a), L = d.length(); m.position.copy(a).addScaledVector(d, 0.5); m.scale.set(B.w * (1 + Math.sin(g.time * 30) * 0.15), L, B.w * (1 + Math.sin(g.time * 30) * 0.15)); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); mat.opacity = B.on ? 0.45 + Math.random() * 0.25 : 0; m.visible = B.on; } };
  B.dispose = () => { m.removeFromParent(); m.geometry.dispose(); mat.dispose(); };
  return B;
}
function spike(s, p) {
  // a harvest anchor: a dark spike with amber rings, driven into the ground
  const g = s.game, Z = s.zone, grp = new THREE.Group(); grp.position.copy(p); Z.root.add(grp);
  const dark = new THREE.MeshStandardMaterial({ color: 0x242426, metalness: 0.6, roughness: 0.45 }), glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.55, 0.18).multiplyScalar(3) });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 1.1, 10, 6), dark); body.position.y = 3.5; grp.add(body);
  for (let i = 0; i < 3; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.95 - i * 0.22, 0.09, 6, 16), glow); r.rotation.x = Math.PI / 2; r.position.y = 1.2 + i * 2.2; grp.add(r); }
  for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.4, 2.2), dark); f.rotation.y = i * Math.PI / 2; f.position.set(Math.sin(i * Math.PI / 2) * 1.0, 0.6, Math.cos(i * Math.PI / 2) * 1.0); grp.add(f); }
  grp.traverse(o => { if (o.isMesh) o.castShadow = true; });
  const K = { grp, glow, top: () => grp.position.clone().add(V(0, 8.5, 0)), mid: () => grp.position.clone().add(V(0, 3.2, 0)), col: null, hp: 2,
    land() { K.col = g.physics.addCylinder({ x: p.x, y: p.y + 3.5, z: p.z }, 5, 1.0, null, { surface: 'metal' }); Z.colliders.push(K.col); },
    dispose() { if (K.col) { try { g.physics.world.removeCollider(K.col, false); } catch { /* */ } Z.colliders = Z.colliders.filter(c => c !== K.col); K.col = null; } grp.removeFromParent(); grp.traverse(o => o.geometry?.dispose()); dark.dispose(); glow.dispose(); } };
  return K;
}

// a still-field made visible: a faint breathing dome (removed with the field)
function fieldDome(s, F) {
  const g = s.game, m = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.75, 0.82, 1), transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
  m.position.copy(F.pos); g.engine.cityRoot.add(m);
  const off = g.add(() => { if (!g.stillness.fields.includes(F)) { off(); m.removeFromParent(); m.geometry.dispose(); m.material.dispose(); return; } m.scale.setScalar(F.r); m.material.opacity = 0.03 + g.stillness.strength(F) * 0.09; });
  return m;
}

// ------------------------------------------------------------------ beats (mixed into the story runner)
export const Chapter2 = {
  c2Arrive(cp) {
    const g = this.game, P = g.player, sp = c2Spawn(this, cp); if (!sp) return false;
    if (P.pos.distanceTo(sp[0]) > 30 || this.retrying === cp) { P.teleport(sp[0].clone(), sp[1]); g.camera.snapBehind(sp[1], 0.05); g.hud.fade(0, 0.8); return true; }
    return false;
  },
  niaAt(p, yaw) { const C = this.cast; show(C.nia, p.clone().setY(this.groundAt(p.x, p.y, p.z)), yaw); C.nia.anim.setMode('loco'); C.nia.activity(null); C.nia.mount = null; C.nia.scripted = false; C.nia.frozen = false; return C.nia; },
  // the people of the Reach, at their work
  populateReach() {
    const g = this.game, Z = this.zone, S = Z.spots, cr = g.crowd; let seed = 900;
    const at = (x, z) => V(x, Z.gy(x, z), z);
    const barks = [['VILLAGER', 'Is that— is that the city?'], ['VILLAGER', 'They came down. Imani, they came down.'], ['VILLAGER', 'Mind the beds, Runner, those are beans.'], ['VILLAGER', 'You look like you\'ve never seen a goat.']];
    const spots = [
      [at(326, -1050), Math.PI, 'water'], [at(342, -1053), 0, 'water'], [at(312, -1060), Math.PI / 2, 'sweep'], [at(304, -984), -Math.PI / 2, 'hammer'],
      [at(318, -982), Math.PI / 2, 'talkIdle'], [at(319.2, -983.4), -Math.PI / 2, 'talkIdle'], [at(337, -996), Math.PI, 'sitGround'], [at(366, -952), Math.PI, 'watch'],
      [at(352, -969), 0, 'cook'], [at(372, -1000), -Math.PI / 2, 'sweep'], [at(380, -984), -Math.PI / 2, 'water'],
    ];
    this.reachPeople = spots.map(([p, yaw, act]) => cr.spawnSpot({ pos: p, yaw, activity: act }, seed++, { look: { outfit: seed % 3 ? 'casual' : 'worker' }, barks, cull: 120 }));
    this.reachKids = [at(340, -1006), at(345, -1004), at(348, -1007), at(358, -950)].map((p, i) => cr.spawnSpot({ pos: p, yaw: i * 1.7, activity: 'kidPlay' }, seed++, { look: { kid: true }, cull: 120 }));
    // the Okonjos are in the greenhouse
    this.okonjo = S.ghInside.map((p, i) => cr.spawnSpot({ pos: p, yaw: Math.PI / 2 + i, activity: i ? 'kidPlay' : 'water' }, 960 + i, { look: i ? { kid: true } : { outfit: 'casual' }, cull: 140 }));
    this.tobias = cr.spawnSpot({ pos: S.generator.clone().add(V(-0.8, 0, 1.6)), yaw: -Math.PI / 2, activity: 'console' }, 980, { look: { outfit: 'worker', hairStyle: 'shaved', beard: true, age: 1 }, cull: 140 });
  },
  freezeReach(on) {
    for (const a of [...(this.reachPeople || []), ...(this.reachKids || [])]) { if (on) { a.prevAct = a.anim.activity; a.activity(Math.random() < 0.5 ? 'cower' : 'watch'); } else a.activity(a.prevAct || 'talkIdle'); }
  },

  // ================================================================== CHAPTER CARD
  async beat_c2_title(id) {
    const g = this.game;
    this.enter(true);
    await g.hud.fade(1, 0.4);
    g.audio.music.stop(1);
    g.hud.chapterCard('CHAPTER TWO', 'THE PEOPLE BELOW', 'Before first bell.');
    await this.wait(0.3);
    enterReach(this, 'c2_title');
    if (g.sky.mood !== 'night') g.sky.setMood('night');
    await this.wait(5.2);
    g.hud.hideChapter();
    await this.wait(1.4);
    this.exit();
    g.state.chapter = 'chapter2'; g.state.checkpoint = 'c2_descent'; g.state.save(g);
  },

  // ================================================================== DOWN THE LINE, WITHOUT LEAVE
  async beat_c2_descent(id) {
    const g = this.game, P = g.player, C = this.cast, Z = this.zone;
    if (g.sky.mood !== 'night') g.sky.setMood('night');
    this.equip(true, true); g.lightMul = 0.75;
    const m = groundMule(this);
    const tip = Z.spots.boomTip, x = tip.x, z = tip.z - 2.25, y0 = tip.y - 5.6, y1 = Z.gy(x, z) + 0.3;
    m.position.set(x, y0, z); m.rotation.set(0, 0, 0); m.visible = true; m.updateMatrixWorld(true);
    P.setScripted(true); P.anim.speed = 0;
    show(C.nia, worldOf(m.userData.cab), 0); C.nia.mount = m.userData.cab; C.nia.mountYaw = 0; C.nia.anim.setMode('sit');
    const head = new THREE.PointLight(0xffe0b0, 0, 60, 1.5); head.position.set(0, 1.4, 4.2); m.add(head);
    const ride = g.add(() => { m.updateMatrixWorld(true); P.placeScripted(worldOf(m.userData.seatL), m.rotation.y + Math.PI * 0.9); Z.cableLine.foot.copy(worldOf(m.userData.drum)); });
    this.enter(true);
    g.audio.music.play('night', 2);
    const tween = (dur, f) => { const t0 = g.time; return this.waitFor(() => { const u = clamp((g.time - t0) / dur, 0, 1); f(u); return u >= 1; }); };
    g.director.shot({ pos: () => m.position.clone().add(V(5.2, 2.4, -3.6)), look: () => worldOf(m.userData.seatL).add(V(0, 1.2, 0)), fov: 42, cut: true });
    g.hud.fade(0, 1.4);
    const down = tween(10, u => { m.position.y = lerp(y0, y1, u * u * (3 - 2 * u)); });
    await this.say('NIA', 'If anyone asks, the winch ran itself.', { actor: C.nia, dur: 2.8 });
    await this.say('ROOK', 'Nobody\'s going to believe that.', { actor: { anim: P.anim, pos: P.pos }, dur: 2 });
    await this.say('NIA', 'Everybody believes the winch runs itself. That\'s the whole problem with the winch.', { actor: C.nia, dur: 3.8, emotion: 'amused' });
    await down; this.guard(id);
    ride(); Z.cableLine.foot.copy(Z.spots.cableFoot);
    // across the dark fields toward one light
    head.intensity = 30;
    const path = [V(x, 0, z), V(240, 0, -260), V(270, 0, -420), V(300, 0, -600), V(316, 0, -780), V(Z.spots.mulePark.x, 0, Z.spots.mulePark.z)].map(p => p.setY(Z.gy(p.x, p.z)));
    let seg = 0;
    const drive = g.add((dt) => {
      if (seg >= path.length - 1) return;
      const to = path[seg + 1], d = to.clone().sub(m.position).setY(0), L = d.length(); if (L < 3) { seg++; return; }
      d.normalize(); m.position.addScaledVector(d, 26 * dt); m.position.y = Z.gy(m.position.x, m.position.z) + 0.3;
      m.rotation.y = dampAngle(m.rotation.y, Math.atan2(d.x, d.z), 2.5, dt); for (const w of m.userData.wheels) w.rotation.x += 26 * dt / 0.62;
      m.updateMatrixWorld(true); P.placeScripted(worldOf(m.userData.seatL), m.rotation.y + Math.PI * 0.9);
    });
    g.director.shot({ pos: () => m.position.clone().add(new THREE.Vector3(-4, 2.4, -9).applyAxisAngle(V(0, 1, 0), m.rotation.y)), look: () => m.position.clone().add(new THREE.Vector3(0, 1, 30).applyAxisAngle(V(0, 1, 0), m.rotation.y)), fov: 50, cut: true });
    await this.say('NIA', '…You really think they\'re alive? All of them?', { actor: C.nia, dur: 2.8 });
    await this.say('ROOK', 'I think someone\'s been asking for help for nine days. That\'s enough.', { actor: { anim: P.anim, pos: P.pos }, dur: 3.4 });
    await this.wait(1); this.guard(id);
    g.director.shot({ pos: () => m.position.clone().add(V(-30, 18, 20)), look: () => m.position.clone(), fov: 34, cut: true });
    await this.say('NIA', 'Tomas is going to kill me.', { actor: C.nia, dur: 2 });
    await this.say('ROOK', 'He\'ll kill me first. You\'ll have time to run.', { actor: { anim: P.anim, pos: P.pos }, dur: 2.8 });
    await this.waitFor(() => seg >= path.length - 1 || m.position.distanceTo(path[path.length - 1]) < 5); this.guard(id);
    await g.hud.fade(1, 1.6); this.guard(id);
    drive(); m.remove(head);
    m.position.copy(Z.spots.mulePark).add(V(0, 0.3, 0)); m.rotation.y = Math.PI; m.updateMatrixWorld(true);
    // dawn
    g.sky.setMood('morning'); g.lightMul = 1;
    C.nia.mount = null; P.setScripted(false);
    g.state.checkpoint = 'c2_reach'; g.state.save(g);
    this.exit();
  },

  // ================================================================== CALLOW REACH, ALIVE
  async beat_c2_reach(id) {
    const g = this.game, P = g.player, Z = this.zone, C = this.cast, S = Z.spots;
    if (g.sky.mood !== 'morning') g.sky.setMood('morning');
    this.equip(true, true); P.relaxed = true; g.weapons.locked = true;
    const m = groundMule(this); if (m) { m.visible = true; m.position.copy(S.mulePark).add(V(0, 0.3, 0)); m.rotation.set(0, Math.PI, 0); }
    P.teleport(S.gate.clone(), Math.PI); g.camera.snapBehind(Math.PI, 0.05);
    this.niaAt(S.gate.clone().add(V(2, 0, 1.2)), Math.PI);
    g.crowd.clear(); this.populateReach();
    Z.setLights(true, 0.4); Z.gen.target = 2.6;
    g.hud.fade(0, 2.2);
    g.audio.music.play('reach', 4);
    g.hud.location('CALLOW REACH', 'GRID 41 · UNINHABITED FOR NINETEEN YEARS', 6);
    const offN = this.companion(C.nia);
    this.objective('Find Imani Osei', 'Someone will know where she is.', S.school);
    this.banter([2,
      ['NIA', 'Rook. …Washing. Somebody\'s hung out their washing.', { dur: 3.4, emotion: 'surprised' }], 1.4,
      ['ROOK', 'Uninhabited for nineteen years.', { dur: 2.2 }], 0.4,
      ['NIA', 'Very tidy ghosts.', { dur: 1.8, emotion: 'amused' }],
    ]);
    // people to meet on the way (optional)
    this.item({ getPos: () => this.tobias.pos, radius: 2.8, label: 'Talk to the old man', once: true, onUse: () => this.banter([
      ['TOBIAS', 'Flywheel. Wind turns her, she turns the pumps and the lights and the cold store.', { dur: 4, actor: this.tobias }],
      ['TOBIAS', 'Nineteen years and she\'s never stopped once. Not once. Mind your feet.', { dur: 3.6 }]]) });
    this.item({ getPos: () => this.reachKids[3].pos, radius: 2.6, label: 'Talk to the girl by the goats', once: true, onUse: () => this.banter([
      ['AMA', 'Are you from the walking city? Is it true you have a market with a whole bakery?', { dur: 4 }],
      ['ROOK', 'Two bakeries.', { dur: 1.4 }], ['AMA', '…Liar.', { dur: 1.4 }]]) });
    this.trigger(() => P.pos.z < -950, () => this.bark('VILLAGER', 'Imani\'s at the school. Everyone\'s always looking for Imani.', 3.4, this.reachPeople[4]));
    await this.waitFor(() => P.pos.distanceTo(S.school) < 7);
    this.guard(id);
    offN();
    g.state.checkpoint = 'c2_imani'; g.state.save(g);
  },

  // ================================================================== IMANI
  async beat_c2_imani(id) {
    const g = this.game, P = g.player, Z = this.zone, C = this.cast, S = Z.spots;
    if (this.c2Arrive('c2_imani') || !this.reachPeople) { g.crowd.clear(); this.populateReach(); }
    if (C.nia.hidden) this.niaAt(P.pos.clone().add(V(1.5, 0, 1)), P.yaw);
    this.equip(true, true); P.relaxed = true; g.weapons.locked = true;
    show(C.imani, S.schoolDoor.clone().setY(Z.gy(S.schoolDoor.x, S.schoolDoor.z)), 0); C.imani.activity(null);
    g.state.meet('Imani Osei', 'Teacher at Callow Reach. She kept calling for nine days.');
    this.enter(true);
    const stand = S.school.clone().add(V(0.6, 0, 2.4)).setY(Z.gy(S.school.x, S.school.z + 2.4));
    if (P.pos.distanceTo(stand) > 6) P.teleport(stand.clone().add(V(0, 0, 3)), Math.PI);
    C.imani.goTo(S.school.clone().setY(Z.gy(S.school.x, S.school.z)), 1.3);
    const door = S.schoolDoor.clone().add(V(0, 1.5, 0));
    g.director.shot({ pos: door.clone().add(V(-5.5, 0.4, 7.5)), look: door.clone().add(V(0.5, -0.2, 1.5)), fov: 40, cut: true });
    await this.rookWalk(stand, C.imani.pos);
    C.nia.place(S.school.clone().add(V(2.2, 0, 2.2)).setY(Z.gy(S.school.x + 2.2, S.school.z + 2.2)), Math.PI); C.nia.lookAt(() => C.imani.head);
    C.imani.face(P.pos.clone()); C.imani.lookAtPlayer();
    await this.convo(C.imani, [
      ['IMANI', 'You came down the line in the night. From that.', { emotion: 'neutral' }],
      ['ROOK', 'We heard you. On the Callow band.'],
      ['IMANI', 'Nine days I\'ve been talking to the dark. I\'d stopped believing anyone was listening.', { emotion: 'sad' }],
      ['NIA', 'Forty-three of you?'],
      ['IMANI', 'Forty-four since Tuesday. The Asante baby.', { emotion: 'happy' }],
      ['ROOK', 'Meridian\'s records say Callow Reach has been empty for nineteen years.'],
      ['IMANI', 'Nineteen years ago your city walked past us. The fields went still for a season. Half of us left. Some of us couldn\'t.', { emotion: 'sad' }],
      ['IMANI', 'Every time one of you walks by, it gets worse. The Stillness follows the Marchers like a wake follows a boat.'],
      ['NIA', '…Harvest service. That\'s what the plate said. They\'re not just walking past. They\'re taking something.', { emotion: 'worried' }],
    ]);
    this.guard(id);
    const v = await this.pick(C.imani, [
      { text: 'Meridian runs on stored momentum. It doesn\'t take anything.', tone: 'skeptical', value: 'momentum' },
      { text: 'That\'s a lot to believe from a voice on the radio.', tone: 'doubt', value: 'radio' },
      { text: 'Show me.', tone: 'plain', value: 'show' },
    ]);
    if (v === 'momentum') await this.convo(C.imani, [['IMANI', 'Stored from where, Runner?', { emotion: 'neutral' }], ['ROOK', '…'], ['IMANI', 'Hm.']]);
    if (v === 'radio') await this.convo(C.imani, [['IMANI', 'It is. And you came a long way to call me a liar to my face.', { emotion: 'amused' }]]);
    if (v === 'show') await this.convo(C.imani, [['IMANI', 'Wait for first bell. You won\'t need me to show you.', { emotion: 'sad' }]]);
    g.state.choice('c2_skeptic', v);
    await this.convo(C.nia, [['NIA', 'I believe her, Rook.', { emotion: 'worried' }], ['ROOK', 'I know you do.']]);
    g.state.adjust('nia', 'trust', v === 'show' ? 1 : 0); g.state.adjust('imani', 'trust', v === 'show' ? 1 : -1);
    // first bell, carried across the fields
    g.audio.music.stop(3);
    await this.wait(1.2);
    for (let i = 0; i < 2; i++) { g.audio.giantStep(V(150, -400, -300), 1.1, 700); await this.wait(1.8); }
    C.imani.lookAt(V(170, -150, -260));
    await this.say('IMANI', '…There it is.', { actor: C.imani, dur: 2 });
    await this.say('NIA', 'First bell. She\'s walking.', { actor: C.nia, dur: 2, emotion: 'worried' });
    this.exit();
    g.state.journal('Callow Reach is alive. Forty-four people. Imani Osei says the Stillness follows the Marchers "like a wake follows a boat". Nia believes her.');
    g.state.checkpoint = 'c2_approach'; g.state.save(g);
  },

  // ================================================================== MERIDIAN COMES
  async beat_c2_approach(id) {
    const g = this.game, P = g.player, Z = this.zone, C = this.cast, S = Z.spots, ST = g.stillness;
    if (!this.reachPeople) { g.crowd.clear(); this.populateReach(); }
    show(C.imani, S.school.clone().setY(Z.gy(S.school.x, S.school.z)), Math.PI);
    if (C.nia.hidden) this.niaAt(S.school.clone().add(V(2.2, 0, 2.2)), Math.PI);
    if (P.pos.distanceTo(S.school) > 12) { P.teleport(S.school.clone().add(V(0.6, 0, 2.4)), Math.PI); g.camera.snapBehind(Math.PI, 0.05); }
    approachMode(this, true);
    const T0 = Z.T0; g.city.travel = T0; g.city.walking = true; g.city.speedMul = 1;
    this.enter(true);
    g.hud.fade(0, 0.6);
    g.audio.music.play('harvest', 1);
    const sq = S.square.clone();
    // 1 · far off, she starts toward them
    g.director.shot({ pos: sq.clone().add(V(-8, 3, -6)), look: () => V(120, -150, -260 - (g.city.travel - T0)), fov: 30, cut: true, to: { fov: 26 }, dur: 6 });
    await this.wait(5); this.guard(id);
    // 2 · closer: the wind dies, the truck's engine coughs out
    g.city.travel = T0 + 300;
    g.windMul = 0.2; Z.truck.running = false;
    g.director.shot({ pos: Z.truck.pos.clone().add(V(-5, 1.6, -6)), look: () => V(150, -120, -260 - (g.city.travel - T0)), fov: 40, cut: true });
    g.audio.clank(Z.truck.pos, 0.5, 0.3);
    await this.say('TOBIAS', 'Truck\'s dead. Wind\'s dead. Everything\'s going quiet—', { dur: 3, actor: this.tobias });
    Z.gen.target = 1.0; Z.setLights(true, 0.25);
    await this.wait(1.2); this.guard(id);
    // 3 · she fills the sky; the harvest array comes down out of her belly
    g.city.travel = T0 + 540;
    const arr = this.harvest = harvestArray(this);
    g.director.shot({ pos: sq.clone().add(V(6, 2, 10)), look: () => worldOf(arr.grp).add(V(0, -20, 0)), fov: 46, cut: true, to: { fov: 40 }, dur: 9 });
    const t0 = g.time;
    await this.waitFor(() => { const u = clamp((g.time - t0) / 6, 0, 1); arr.setDrop(u * 70); if (g.city.travel > T0 + APPROACH) { g.city.travel = T0 + APPROACH; g.city.walking = false; } return u >= 1; });
    this.guard(id);
    g.city.walking = false; g.city.travel = T0 + APPROACH; g.city.phase = 0.015;
    await this.say('NIA', 'What is that? Rook — what IS that?', { actor: C.nia, dur: 2.4, emotion: 'surprised' });
    // 4 · three anchors fall into the fields, and the beams lock on
    this.anchors = S.anchors.map(p => spike(this, p.clone()));
    this.beams = [];
    for (let i = 0; i < 3; i++) {
      const K = this.anchors[i], land = K.grp.position.clone(); K.grp.position.y += 140;
      const fall = g.time;
      g.director.shot({ pos: land.clone().add(V(-16, 5, 14)), look: () => K.grp.position.clone().add(V(0, 4, 0)), fov: 40, cut: true });
      await this.waitFor(() => { const u = clamp((g.time - fall) / 1.1, 0, 1); K.grp.position.y = land.y + 140 * (1 - u * u); return u >= 1; });
      K.grp.position.copy(land); K.land();
      g.fx.explosion(land.clone().add(V(0, 0.5, 0)), 0.7); g.audio.explosion(land, 0.9); g.camera.shake(0.5);
      for (let k = 0; k < 16; k++) { const a = Math.random() * 6.28, sp = 3 + Math.random() * 5; g.fx.alpha.spawn({ x: land.x, y: land.y + 0.3, z: land.z, vx: Math.cos(a) * sp, vy: 1 + Math.random() * 2, vz: Math.sin(a) * sp, life: 4, s0: 1, s1: 5, c0: [0.5, 0.45, 0.38, 0.5], c1: [0.5, 0.45, 0.38, 0], drag: 0.9 }); }
      const B = beam(this, () => worldOf(arr.eye), () => K.top()); this.beams.push(B);
      await this.wait(0.5); this.guard(id);
    }
    this.beamTick = g.add(() => this.beams?.forEach(B => B.update()));
    // the field blooms over the town
    ST.clear();
    this.reachField = ST.add({ pos: sq.clone(), r: 20, base: 0.3, pulse: 0.25, period: 5, grow: 16, maxR: 95 }); fieldDome(this, this.reachField);
    this.ghField = ST.add({ pos: S.greenhouse.clone(), r: 7, base: 1, pulse: 0, period: 4 }); fieldDome(this, this.ghField);
    this.okonjo.forEach(a => { a.activity(null); a.anim.setMode('freeze'); });
    this.freezeReach(true);
    g.director.shot({ pos: sq.clone().add(V(-14, 9, 16)), look: sq.clone().add(V(4, 2, -4)), fov: 50, cut: true, to: { pos: sq.clone().add(V(-12, 7, 13)) }, dur: 5 });
    g.engine.grade.uniforms.uStill.value = 0.35;
    await this.say('IMANI', 'It\'s here. Everyone inside! Inside!', { actor: C.imani, dur: 2.4 });
    this.exit();
    g.state.checkpoint = 'c2_choice'; g.state.save(g);
  },

  // ================================================================== ONE CHARGE
  setupHarvest() {
    // a retry (or a direct start) lands here with the harvest already down
    const g = this.game, Z = this.zone, S = Z.spots, ST = g.stillness;
    if (!this.harvest) { this.harvest = harvestArray(this); this.harvest.setDrop(70); }
    if (!this.anchors) { this.anchors = S.anchors.map(p => { const K = spike(this, p.clone()); K.land(); return K; }); }
    if (!this.beams) { this.beams = this.anchors.map(K => beam(this, () => worldOf(this.harvest.eye), () => K.top())); }
    if (!this.beamTick) this.beamTick = g.add(() => this.beams?.forEach(B => B.update()));
    if (!this.reachPeople) { g.crowd.clear(); this.populateReach(); this.freezeReach(true); }
    if (!ST.fields.includes(this.reachField)) { ST.clear(); this.reachField = ST.add({ pos: S.square.clone(), r: 95, base: 0.3, pulse: 0.25, period: 5 }); fieldDome(this, this.reachField); this.ghField = null; }
    g.windMul = 0.2; Z.truck.running = false;
  },
  async beat_c2_choice(id) {
    const g = this.game, P = g.player, Z = this.zone, C = this.cast, S = Z.spots, ST = g.stillness;
    this.c2Arrive('c2_choice');
    this.setupHarvest();
    this.equip(true, true); P.relaxed = false; g.weapons.locked = false;
    const decided = g.state.flags['choice:c2_charge'];
    if (decided) return this.c2ApplyChoice(decided, true);
    if (!this.ghField) { this.ghField = ST.add({ pos: S.greenhouse.clone(), r: 7, base: 1, pulse: 0, period: 4 }); fieldDome(this, this.ghField); this.okonjo.forEach(a => { a.activity(null); a.anim.setMode('freeze'); }); }
    if (C.nia.hidden) this.niaAt(P.pos.clone().add(V(1.6, 0, 1)), P.yaw);
    show(C.imani, S.ghDoor.clone().setY(Z.gy(S.ghDoor.x, S.ghDoor.z)).add(V(-1.5, 0, 0)), -Math.PI / 2); C.imani.activity(null);
    Z.gen.target = 0.5; Z.setLights(true, 0.15);
    const offN = this.companion(C.nia);
    g.audio.music.play('harvest', 1);
    this.banter([
      ['IMANI', 'The Okonjos — they\'re in the greenhouse! The field\'s got them!', { dur: 3.2 }],
      ['TOBIAS', 'Flywheel\'s dying! If she stops, the pumps freeze and the cold store goes — the whole winter\'s food!', { dur: 4.2, actor: this.tobias }],
      ['NIA', 'Rook, that beam is pouring motion out of the ground. Take it — but you\'ll only get one throw before it closes on you.', { radio: true, dur: 4.8 }],
      ['NIA', 'One. Choose.', { radio: true, dur: 1.6 }],
    ]);
    const K = this.anchors[0];
    this.objective('One charge. Choose.', 'Capture the harvest beam [E]. Throw it into the greenhouse field to free the Okonjos — or into the flywheel to keep the Reach\'s power [Q].', () => g.tether.cells < 3 ? K.mid() : null);
    g.hud.hint('capture', true);
    let choice = null, full = false;
    const offBeam = g.tether.register({ kind: 'machine', label: 'Harvest beam', captureOnly: true, noLos: true, big: true, priority: 3, radius: 2.2, range: 70, enabled: () => !full && !choice,
      getPos: () => K.mid(), getVel: () => V(0, 12, 0), capture: (dt) => { if (g.tether.cells >= 3) full = true; return 1600 * dt; }, push: () => {} });
    const offGH = g.tether.register({ kind: 'special', label: 'Greenhouse field', releaseOnly: true, noLos: true, priority: 5, radius: 2.6, range: 60, enabled: () => !choice,
      getPos: () => S.greenhouse.clone().add(V(0, 1.6, 0)), getVel: () => V(), capture: () => 0, push: (imp, cells) => { if (cells >= 2 && !choice) choice = 'family'; } });
    const offGen = g.tether.register({ kind: 'special', label: 'Flywheel', releaseOnly: true, noLos: true, priority: 5, radius: 2.2, range: 60, enabled: () => !choice,
      getPos: () => Z.gen.pos.clone(), getVel: () => V(), capture: () => 0, push: (imp, cells) => { if (cells >= 2 && !choice) choice = 'generator'; } });
    this.trigger(() => g.tether.cells >= 3, () => { g.hud.hint('release', true); this.bark('NIA', 'That\'s it — the beam\'s closing. Throw it!', 2.6, C.nia); });
    // if the charge is wasted on nothing, the beam opens again
    const reopen = g.add(() => { if (full && g.tether.cells < 2 && !choice) full = false; });
    await this.waitFor(() => !!choice); this.guard(id);
    offBeam(); offGH(); offGen(); reopen(); offN();
    g.state.choice('c2_charge', choice);
    await this.c2ApplyChoice(choice, false);
    g.state.checkpoint = 'c2_anchor'; g.state.save(g);
  },
  async c2ApplyChoice(choice, quiet) {
    const g = this.game, P = g.player, Z = this.zone, C = this.cast, S = Z.spots, ST = g.stillness;
    if (choice === 'family') {
      if (!quiet) {
        g.fx.kineticBurst(S.greenhouse.clone().add(V(0, 1.6, 0)), 2); g.audio.explosion(S.greenhouse, 0.4); g.camera.shake(0.3);
        this.enter(true);
        g.director.shot({ pos: S.ghDoor.clone().add(V(-6, 2.2, 3)), look: S.greenhouse.clone().add(V(0, 1.2, 0)), fov: 40, cut: true });
      }
      if (this.ghField) { ST.remove(this.ghField); this.ghField = null; }
      this.okonjo.forEach((a, i) => { a.anim.setMode('loco'); a.goTo(S.square.clone().add(V(-2 + i * 1.5, 0, 3)).setY(Z.gy(S.square.x, S.square.z)), 3.2); });
      Z.gen.target = 0; Z.setLights(false);
      if (!quiet) {
        await this.wait(1.6);
        await this.say('TOBIAS', '…She\'s stopped. The flywheel\'s stopped.', { dur: 2.6, actor: this.tobias });
        await this.say('IMANI', 'Then we carry water. We\'ve carried water before.', { actor: C.imani, dur: 3, emotion: 'sad' });
        this.exit();
        g.state.journal('One charge. I threw it into the greenhouse and the Okonjos walked out. Callow Reach\'s flywheel stopped: no pumps, no lights, no cold store this winter.');
      }
    } else {
      if (!quiet) {
        g.fx.kineticBurst(Z.gen.pos, 1.6); g.audio.clank(Z.gen.pos, 2, 1); g.camera.shake(0.25);
        this.enter(true);
        g.director.shot({ pos: Z.gen.pos.clone().add(V(4, 1.2, 5)), look: Z.gen.pos, fov: 42, cut: true });
      }
      Z.gen.target = 4; Z.gen.spin = Math.max(Z.gen.spin, 3); Z.setLights(true, 1);
      if (!quiet) {
        await this.wait(1.4);
        await this.say('TOBIAS', 'HA! Listen to her go!', { dur: 2, actor: this.tobias, emotion: 'happy' });
        g.director.shot({ pos: S.ghDoor.clone().add(V(-4, 1.8, 2)), look: S.greenhouse.clone().add(V(0, 1.2, 0)), fov: 38, cut: true });
        await this.say('IMANI', 'The Okonjos are held. Not gone. When it passes, they wake.', { actor: C.imani, dur: 3.4, emotion: 'sad' });
        await this.say('IMANI', 'It\'s always been "when it passes."', { actor: C.imani, dur: 2.6, emotion: 'sad' });
        this.exit();
        g.state.journal('One charge. I threw it into the flywheel and kept Callow Reach\'s power on. The Okonjo family is still standing in the greenhouse, held.');
      }
    }
  },

  // ================================================================== THE ANCHOR
  async beat_c2_anchor(id) {
    const g = this.game, P = g.player, Z = this.zone, C = this.cast, S = Z.spots, ST = g.stillness;
    this.c2Arrive('c2_anchor');
    this.setupHarvest();
    const ch = g.state.flags['choice:c2_charge']; if (ch && !this.choiceApplied) { this.choiceApplied = true; await this.c2ApplyChoice(ch, true); }
    this.equip(true, true); P.relaxed = false; g.weapons.locked = false;
    if (C.nia.hidden) this.niaAt(P.pos.clone().add(V(1.6, 0, 1)), P.yaw);
    const offN = this.companion(C.nia);
    const K = this.anchors[0];
    g.audio.music.play('harvest', 1);
    await this.radio('NIA', 'The east spike — it\'s the one the others hang off. Fill up from the beam and dump everything into it. Twice, maybe. It\'ll blow.', { dur: 5 });
    // the array sends its drones down to guard the anchor
    for (const p of [V(10, 6, 4), V(-6, 7, 8), V(4, 8, -6)]) g.enemies.spawn('gnat', K.grp.position.clone().add(p), { alwaysAware: true });
    for (const p of [V(8, 0, 10), V(-10, 0, 4)]) g.enemies.spawn('leech', K.grp.position.clone().add(p).setY(Z.gy(K.grp.position.x + p.x, K.grp.position.z + p.z)), { alwaysAware: true });
    this.objective('Overload the harvest anchor', 'Capture the beam [E] — throw it all into the anchor [Q]. The drones will try to stop you.', () => g.tether.cells < 2 ? K.mid() : K.mid().add(V(0, -1.6, 0)));
    let hits = 0, lastHit = -9;
    const offBeam = g.tether.register({ kind: 'machine', label: 'Harvest beam', captureOnly: true, noLos: true, big: true, priority: 2, radius: 2.2, range: 70, getPos: () => K.mid().add(V(0, 3, 0)), getVel: () => V(0, 12, 0), capture: (dt) => 1300 * dt, push: () => {} });
    const offA = g.tether.register({ kind: 'special', label: 'Harvest anchor', releaseOnly: true, noLos: true, priority: 6, radius: 1.6, range: 60, getPos: () => K.mid().add(V(0, -1.6, 0)), getVel: () => V(), capture: () => 0,
      push: (imp, cells) => { if (cells < 2 || g.time - lastHit < 0.8) return; lastHit = g.time; hits++; g.fx.kineticBurst(K.mid(), 1.4); g.audio.metalStress(K.mid(), 1.2); g.camera.shake(0.35); K.glow.color.setRGB(4, 1.2 + hits, 0.4);
        this.bark('NIA', hits === 1 ? 'It\'s cracking! Again!' : 'That\'s it — get back!', 2.2, C.nia); } });
    await this.waitFor(() => hits >= 2); this.guard(id);
    offBeam(); offA(); offN(); this.objective(null);
    g.enemies.list.forEach(e => !e.dead && e.die?.(V(0, 1, 0)));
    P.invuln = 30;
    // the anchor blows; the beam whips back up into Meridian; and Meridian goes dark
    this.enter(true);
    const kp = K.mid();
    g.director.shot({ pos: kp.clone().add(V(-18, 4, 16)), look: kp, fov: 44, cut: true });
    for (let i = 0; i < 3; i++) { g.fx.explosion(kp.clone().add(V((Math.random() - 0.5) * 2, i * 2, 0)), 1.2); g.audio.explosion(kp, 1.2); await this.wait(0.3); }
    K.grp.visible = false; this.beams.forEach(B => { B.w = 3; });
    g.audio.music.stop(0.4);
    ST.clear(); this.reachField = null; this.ghField && (this.ghField = null);
    await this.wait(0.6); this.guard(id);
    // the surge runs up the beams
    g.director.shot({ pos: S.square.clone().add(V(-4, 2, 8)), look: () => worldOf(this.harvest.eye), fov: 38, cut: true, to: { fov: 30 }, dur: 6 });
    await this.wait(1); this.harvest.eye.material.color.setRGB(6, 6, 6); g.camera.shake(0.4);
    await this.wait(0.5); this.beams.forEach(B => { B.on = false; });
    const t0 = g.time;
    await this.waitFor(() => { const u = clamp((g.time - t0) / 3, 0, 1); blackout(this, u); this.harvest.eye.material.color.setRGB(6 * (1 - u), 2 * (1 - u), 0.5 * (1 - u)); return u >= 1; });
    this.guard(id);
    g.engine.grade.uniforms.uStill.value = 0; g.windMul = 1;
    this.freezeReach(false);
    if (ch !== 'generator') this.okonjo.forEach(a => a.anim.setMode('loco'));
    else { this.okonjo.forEach(a => { a.anim.setMode('loco'); a.goTo(S.square.clone().add(V(4, 0, 4)).setY(Z.gy(S.square.x, S.square.z)), 2); }); }
    // the wind comes back
    await this.wait(1);
    g.audio.duck(0.5, 1);
    await this.radio('OPS', '—lost the starboard grid — Decks One through Six — hospital on reserve power, repeat, hospital on—', { dur: 4.6 });
    await this.radio('HARROW', 'All stations, Meridian is holding. All stations—', { dur: 2.6 });
    g.director.shot({ ...g.director.twoShot(C.nia, { pos: P.pos }, { dist: 3.4, height: 1.55, fov: 38 }), cut: true });
    C.nia.lookAt(V(170, -100, -900));
    await this.say('NIA', 'Rook. …That\'s home. That\'s all of home.', { actor: C.nia, dur: 3.2, emotion: 'worried' });
    show(C.imani, P.pos.clone().add(V(-1.8, 0, 1.4)).setY(Z.gy(P.pos.x - 1.8, P.pos.z + 1.4)), Math.PI / 2); C.imani.lookAtPlayer();
    await this.say('IMANI', 'You stopped it.', { actor: C.imani, dur: 1.8 });
    await this.say('ROOK', 'I stopped my city.', { actor: { anim: P.anim, pos: P.pos }, dur: 2 });
    await this.say('IMANI', '…Yes. Both of those.', { actor: C.imani, dur: 2.4, emotion: 'sad' });
    g.state.flag('c2_blackout');
    g.state.journal('I overloaded a harvest anchor. The harvest stopped. So did the starboard grid: Decks One through Six went dark, the hospital on reserve power.');
    await g.hud.fade(1, 2); this.guard(id);
    g.audio.duck(1, 0.5);
    P.invuln = 0;
    this.exit();
    g.state.checkpoint = 'c2_tomas'; g.state.save(g);
  },

  // ================================================================== THE DARK
  async beat_c2_tomas(id) {
    const g = this.game, P = g.player, C = this.cast, L = g.districts.lower;
    // home: the frames line up again (the Reach is now under Meridian's bow)
    approachMode(this, false);
    this.harvestCleanup();
    blackout(this, 1);
    g.stillness?.clear(); g.crowd.clear(); hide(C.imani); hide(C.bram);
    if (g.sky.mood !== 'morning') g.sky.setMood('morning');
    this.equip(true, true); P.relaxed = true; g.weapons.locked = true;
    L.mule.visible = true; this.setBay(0); // the bay door is shut: no power to open it
    P.teleport(V(176, -38, -186), Math.PI / 2); g.camera.snapBehind(Math.PI / 2, 0.05);
    show(C.nia, V(181.2, -38, -183.4), -Math.PI / 2); C.nia.activity(null);
    show(C.tomas, V(185.6, -38, -188), -Math.PI / 2 - 0.3); C.tomas.activity(null); C.tomas.anim.armsCrossed = 0;
    // emergency power: the room goes dim and red
    this.c2Exposure = g.sky.exposureMul; g.sky.exposureMul = (g.sky.exposureMul || 1) * 0.5;
    this.c2Red = [V(188, -31, -182), V(172, -31, -192), V(180, -31, -176)].map(p => { const l = new THREE.PointLight(0xff2a14, 26, 22, 1.6); l.position.copy(p); g.engine.cityRoot.add(l); return l; });
    g.engine.grade.uniforms.uWarmth && (g.engine.grade.uniforms.uWarmth.value = 0.06);
    g.hud.fade(0, 2.4);
    g.audio.music.play('tension', 3);
    this.enter(true);
    g.director.shot({ pos: V(172.5, -36.6, -190.5), look: V(184, -37, -186.5), fov: 40, cut: true, to: { pos: V(173.2, -36.8, -190) }, dur: 6 });
    await this.wait(2);
    C.tomas.face(P.pos.clone());
    await this.rookWalk(V(182.6, -38, -187.2), C.tomas.pos);
    C.tomas.lookAtPlayer();
    await this.convo(C.tomas, [
      ['TOMAS', 'Six decks. The hospital on reserve. The water plant. Every lift on the starboard side stopped between floors.', { emotion: 'angry' }],
      ['TOMAS', 'Mrs. Okafor was in one of them for two hours.', { emotion: 'angry' }],
      ['ROOK', 'The harvest was killing them, Tomas. I watched it.'],
      ['TOMAS', 'Do you have any idea how many people you\'re responsible for up there?', { emotion: 'angry', wide: true }],
    ]);
    this.guard(id);
    const v = await this.pick(C.tomas, [
      { text: 'Ninety thousand. And forty-four down there.', tone: 'firm', value: 'both' },
      { text: 'Do you? You knew. You knew what the harvest was.', tone: 'accuse', value: 'accuse' },
      { text: '…', tone: 'silent', value: 'silent' },
    ]);
    if (v === 'both') await this.convo(C.tomas, [['TOMAS', 'Forty-four.', { emotion: 'tired' }], ['TOMAS', 'You always could count, Rook. It\'s the dividing you never learned.', { emotion: 'sad' }]]);
    if (v === 'accuse') await this.convo(C.tomas, [['TOMAS', '…', { emotion: 'sad' }], ['TOMAS', 'I know what keeps the lights on. Someone in this family has to.', { emotion: 'angry' }]]);
    if (v === 'silent') await this.convo(C.tomas, [['TOMAS', 'Nothing. Good. Sit with that.', { emotion: 'tired' }]]);
    g.state.choice('c2_tomas', v); g.state.adjust('tomas', 'trust', -1);
    await this.convo(C.nia, [['NIA', 'Tomas, it wasn\'t only Rook. I drove.', { emotion: 'worried' }], ['TOMAS', 'I know, Nia. I\'ll get to you.', { emotion: 'tired' }]]);
    C.tomas.goTo(V(160, -38, -186), 1.4).then(() => hide(C.tomas));
    await this.wait(2.4); this.guard(id);
    { const mid = C.nia.pos.clone().add(P.pos).multiplyScalar(0.5).add(V(0, 1.5, 0)), d = P.pos.clone().sub(C.nia.pos).setY(0).normalize(), perp = V(-d.z, 0, d.x).multiplyScalar(3.4);
      g.director.shot({ pos: g.director.frame(mid, [perp.clone().setY(0.1), perp.clone().negate().setY(0.1)]), look: mid, fov: 40, cut: true }); }
    await this.say('NIA', 'For the record? I\'d do it again.', { actor: C.nia, dur: 2.4 });
    await this.say('ROOK', 'So would I. That\'s what scares me.', { actor: { anim: P.anim, pos: P.pos }, dur: 2.8 });
    g.state.journal('Tomas: "Do you have any idea how many people you\'re responsible for up there?" For the first time, I put Meridian in danger to help someone outside it.');
    g.state.flag('c2Complete');
    await g.hud.fade(1, 2.2); this.guard(id);
    this.exit();
    g.state.checkpoint = 'c2_end'; g.state.save(g);
  },
  harvestCleanup() {
    const g = this.game;
    this.c2Red?.forEach(l => l.removeFromParent()); this.c2Red = null;
    if (this.c2Exposure !== undefined) { g.sky.exposureMul = this.c2Exposure; this.c2Exposure = undefined; }
    this.beamTick?.(); this.beamTick = null;
    this.beams?.forEach(B => B.dispose()); this.beams = null;
    this.anchors?.forEach(K => K.dispose()); this.anchors = null;
    this.harvest?.dispose(); this.harvest = null;
    this.reachPeople = null; this.reachKids = null; this.okonjo = null; this.tobias = null; this.choiceApplied = false;
  },

  // ================================================================== END OF THE SLICE
  async beat_c2_end(id) {
    const g = this.game;
    this.enter(true);
    g.audio.music.play('title', 1);
    g.hud.chapterCard('END OF CHAPTER TWO', 'MARCHLIGHT', 'Chapter Three — The Trade Road — is in development.');
    await this.wait(7);
    g.hud.hideChapter();
    await this.wait(2.4);
    const el = document.createElement('div'); el.className = 'endcard';
    const ch = g.state.flags['choice:c2_charge'];
    el.innerHTML = `<h2>CHAPTER TWO COMPLETE</h2>
      <p>${ch === 'family' ? 'The Okonjos walked out of the greenhouse. Callow Reach faces winter without its flywheel.' : ch === 'generator' ? 'Callow Reach kept its power. The Okonjo family is still held in the greenhouse.' : 'Callow Reach survived the harvest.'}<br>Decks One through Six of Meridian are dark.</p>
      <p style="color:#8f897c;font-size:14px">Next: <b>Chapter Three — The Trade Road</b>, in development. Your choices have been saved.</p>
      <div style="display:flex;gap:12px"><button class="btn" data-a="ch1">Replay Chapter One</button><button class="btn" data-a="ch2">Replay Chapter Two</button><button class="btn" data-a="title">Title screen</button></div>`;
    document.getElementById('ui').appendChild(el);
    g.input.unlock();
    el.onclick = (e) => { const a = e.target.dataset?.a; if (!a) return; if (a === 'title') location.href = location.pathname; if (a === 'ch1' || a === 'ch2') { el.remove(); location.href = location.pathname + '?beat=' + (a === 'ch1' ? 'c1_title' : 'c2_title'); } };
    await this.waitFor(() => false);
  },
};
export { ON_GROUND as C2_ON_GROUND };
