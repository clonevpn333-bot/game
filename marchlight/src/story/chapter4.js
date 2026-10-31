// CHAPTER FOUR — STILLWATER
// The city Wren told stories about. It stopped in the rain and never started again: people caught
// reaching for doors, a dog mid-leap, rain hanging in the air. Some of them are still alive — they move
// in short, irregular bursts, and so does everything else. The silence is the danger; the bursts are the
// scare. Three records tell what happened: Stillwater was Harvest Trial 7, run by Meridian Engineering,
// signed by its chief engineer — T. Harrow. The city exhales and they run. That night Bram admits he
// suspected it for years and said nothing.
import * as THREE from 'three';
import { show, hide } from './cast.js';
import { buildStillwater, SW } from '../world/zone_stillwater.js';
import { Stillness } from '../world/stillness.js';
import { GROUND_Y } from '../world/city.js';
import { groundMule } from './chapter1.js';
import { clamp, damp, lerp } from '../core/util.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const CH4 = ['c4_title', 'c4_arrive', 'c4_square', 'c4_works', 'c4_escape', 'c4_bram'];

export function enterStillwater(s, beat) {
  const g = s.game;
  g.cityHidden = true; g.city.walking = false; g.surface = true; g.killY = GROUND_Y - 60;
  if (!g.stillness) g.stillness = new Stillness(g);
  if (!s.zone || s.zone.name !== 'stillwater') { s.zone?.dispose(); s.zone = buildStillwater(g); }
  const at = g.engine.atmosphere?.uniforms; if (at && s.fogSave === undefined) { s.fogSave = at.uDensity.value; at.uDensity.value *= 5; }
  if (!s.lamp) { // the visor lamp: the only light in the city
    const l = new THREE.SpotLight(0xdfe8ff, 70, 42, 0.42, 0.55, 1.4); g.engine.cityRoot.add(l, l.target);
    s.lamp = l; s.lampOff = g.add(() => { const cam = g.engine.camera, d = cam.getWorldDirection(new THREE.Vector3()); l.position.copy(cam.position).add(V(0, -0.2, 0)); l.target.position.copy(cam.position).addScaledVector(d, 12); });
  }
}
export function leaveStillwater(s) {
  const g = s.game;
  if (s.fogSave !== undefined) { g.engine.atmosphere.uniforms.uDensity.value = s.fogSave; s.fogSave = undefined; }
  s.lampOff?.(); s.lampOff = null; if (s.lamp) { s.lamp.removeFromParent(); s.lamp.target.removeFromParent(); s.lamp.dispose?.(); s.lamp = null; }
  s.bursts?.off(); s.bursts = null;
}
export function c4Spawn(s, cp) {
  const Z = s.zone; if (!Z || Z.name !== 'stillwater') return null;
  return { c4_arrive: [Z.spots.edge, Math.PI], c4_square: [Z.spots.square.clone().add(V(0, 0, 16)), Math.PI], c4_works: [Z.spots.worksDoor.clone().add(V(0, 0, 4)), Math.PI],
    c4_escape: [Z.spots.office.clone().add(V(-3.6, 0, 7)), 0] }[cp] || null;
}

// ------------------------------------------------------------------ bursts: the held city twitching
function burstSystem(s) {
  const g = s.game, B = { items: [], intensity: 1 };
  B.add = (o) => { const it = { next: g.time + (o.first ?? (1 + Math.random() * 4)), active: false, min: 1.6, max: 5, dur: [0.3, 0.8], ...o }; B.items.push(it); return it; };
  B.off = g.add((dt) => {
    const P = g.player;
    let near = false;
    for (const it of B.items) {
      if (it.dead) continue;
      if (!it.active && g.time >= it.next) { it.active = true; it.until = g.time + lerp(it.dur[0], it.dur[1], Math.random()) * B.intensity; it.start?.(it); if (it.pos && it.pos().distanceTo(P.pos) < 16) near = true; }
      if (it.active) { it.tick?.(it, dt); if (g.time >= it.until) { it.active = false; it.next = g.time + lerp(it.min, it.max, Math.random()) / B.intensity; it.end?.(it); } }
    }
    // the silence breaks with each burst close by
    if (near) { g.audio.duck(1, 0.05); clearTimeout(B.dt); B.dt = setTimeout(() => g.audio.duck(0.3, 0.6), 500); if (Math.random() < 0.6) g.audio.creak(P.pos.clone().add(V((Math.random() - 0.5) * 8, 1, (Math.random() - 0.5) * 8)), 0.5); }
  });
  return B;
}
// a document read on screen (records found in the city)
function readDoc(s, title, lines) {
  const g = s.game, el = document.createElement('div'); el.className = 'doc';
  el.innerHTML = `<h3>${title}</h3>${lines.map(l => `<p>${l}</p>`).join('')}<div class="k">[F] close</div>`;
  document.getElementById('ui').appendChild(el);
  const t0 = g.rtime;
  return s.waitFor(() => g.rtime - t0 > 2.5 && (g.input.pressed('use') || g.rtime - t0 > 14 || g.skipAll)).then(() => el.remove(), (e) => { el.remove(); throw e; });
}

export const Chapter4 = {
  // the people of Stillwater: caught mid-gesture; some of them still move, a little, now and then
  c4People() {
    const g = this.game, Z = this.zone, S = Z.spots, cr = g.crowd, B = this.bursts;
    const freezeAs = (a, act, speed = 0) => { if (act) a.activity(act); a.anim.speed = speed; a.anim.update(0.6); a.anim.setMode('freeze'); a.frozenAct = act; };
    const at = (x, z, dy = 0) => V(x, Z.gy(x, z) + dy, z);
    let seed = 4000; const list = [];
    const person = (p, yaw, act, speed, o = {}) => { const a = cr.spawnSpot({ pos: p, yaw }, seed++, { look: { outfit: Math.random() < 0.5 ? 'casual' : 'worker', ...(o.look || {}) }, cull: 70 }); freezeAs(a, act, speed); list.push(a); return a; };
    // the street: walkers mid-step, a woman at a door, a man with a newspaper over his head, a kid mid-jump
    const X = SW.x;
    for (let i = 0; i < 16; i++) { const sx = i % 2 ? 1 : -1, z = 44 - i * 7 - Math.random() * 3; person(at(X + sx * (8 + Math.random()), z), sx > 0 ? Math.PI : 0, null, 1.3); }
    Z.doors.slice(0, 6).forEach((d, i) => person(d.pos.clone().setY(Z.gy(d.pos.x, d.pos.z)), d.yaw, i % 2 ? 'phone' : null, 0));
    for (const [x, z] of [[X - 1, 22], [X + 2, -8], [X - 4, -44]]) person(at(x, z), Math.random() * 6, null, 2.6);
    person(at(X + 5, 16, 0.45), 0.4, 'kidPlay', 0, { look: { kid: true } });
    person(at(X - 6, 8, 0.4), 2.2, 'kidPlay', 0, { look: { kid: true } });
    // the square
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, rr = 7 + Math.random() * 6; person(at(S.square.x + Math.cos(a) * rr, S.square.z + Math.sin(a) * rr), Math.random() * 6, ['phone', null, 'watch', null][i % 4], i % 3 ? 1.2 : 0); }
    // some are still alive: they move in bursts, a step at a time, and turn toward the light
    list.forEach((a, i) => { if (i % 3) return;
      B.add({ pos: () => a.pos, min: 2.5, max: 7, dur: [0.25, 0.6], start: () => { a.anim.setMode('loco'); if (a.frozenAct) a.activity(a.frozenAct); const P = g.player; const d = P.pos.clone().sub(a.pos).setY(0); if (d.length() < 30) { d.setLength(0.7); a.goTo(a.pos.clone().add(d), 2.2); } a.face(P.pos.clone()); },
        end: () => { a.stop(); a.anim.setMode('freeze'); } }); });
    this.c4List = list;
    return list;
  },

  // ================================================================== CHAPTER CARD
  async beat_c4_title(id) {
    const g = this.game;
    this.enter(true);
    await g.hud.fade(1, 0.4);
    g.audio.music.stop(1.5);
    g.hud.chapterCard('CHAPTER FOUR', 'STILLWATER', 'It rained the day it stopped.');
    await this.wait(0.3);
    enterStillwater(this, 'c4_arrive');
    if (g.sky.mood !== 'night') g.sky.setMood('night');
    await this.wait(5.2);
    g.hud.hideChapter(); await this.wait(1.6);
    this.exit();
    g.state.chapter = 'chapter4'; g.state.checkpoint = 'c4_arrive'; g.state.save(g);
  },
  c4Setup() {
    const g = this.game, ST = g.stillness, Z = this.zone, S = Z.spots;
    if (!this.bursts) this.bursts = burstSystem(this);
    if (!this.c4List) this.c4People();
    ST.clear();
    // the whole city is held, gently; in places, hard
    this.c4Field = ST.add({ pos: V(SW.x, Z.gy(SW.x, -60), -60), r: 140, base: 0.18, pulse: 0.1, period: 9 });
    ST.add({ pos: S.square.clone(), r: 7, base: 0.75, pulse: 0.25, period: 6 });
    ST.add({ pos: S.tram.clone(), r: 5, base: 0.7, pulse: 0.3, period: 5 });
    g.windMul = 0; g.audio.duck(0.3, 2);
    const m = groundMule(this); m.visible = true; m.position.copy(S.mule).add(V(0, 0.3, 0)); m.rotation.set(0, Math.PI, 0);
  },

  // ================================================================== INTO THE CITY
  async beat_c4_arrive(id) {
    const g = this.game, P = g.player, Z = this.zone, S = Z.spots, C = this.cast;
    if (g.sky.mood !== 'night') g.sky.setMood('night');
    this.equip(true, true); P.relaxed = false; g.weapons.locked = false;
    this.c4Setup();
    P.teleport(S.edge.clone(), Math.PI); g.camera.snapBehind(Math.PI, 0.05);
    this.bramAt(S.edge.clone().add(V(-1.8, 0, 1)), Math.PI);
    show(C.nia, S.mule.clone().add(V(2.2, 0, 0)).setY(Z.gy(S.mule.x + 2.2, S.mule.z)), Math.PI); C.nia.activity(null);
    g.audio.music.play('stillwater', 3);
    g.hud.fade(0, 2.4);
    this.enter(true);
    // the rain that never landed, in the visor lamp
    g.director.shot({ pos: S.edge.clone().add(V(1.5, 1.7, 3)), look: S.edge.clone().add(V(0, 1.6, -30)), fov: 50, cut: true, to: { pos: S.edge.clone().add(V(0.8, 1.6, -4)), fov: 44 }, dur: 9 });
    g.hud.location('STILLWATER', 'THE CITY OF RAIN', 6);
    await this.wait(3.2); this.guard(id);
    await this.say('NIA', 'The rain. Rook, it\'s… it\'s just hanging there.', { actor: C.nia, dur: 3, emotion: 'surprised' });
    await this.say('BRAM', 'Don\'t touch it. Don\'t touch anything.', { actor: C.bram, dur: 2.2, emotion: 'worried' });
    await this.say('NIA', 'I\'ll keep the Mule warm. Someone has to keep the Mule warm. I\'m not scared, I\'m— keeping the Mule warm.', { actor: C.nia, dur: 4.6, emotion: 'worried' });
    this.exit();
    const offB = this.companion(C.bram);
    this.objective('Walk into Stillwater', 'Keep moving. The whole city is held — gently here, hard in places.', S.square.clone().add(V(0, 0, 14)));
    g.hud.hint('still', true);
    // the first one moves
    let scared = false;
    this.trigger(() => P.pos.z < 30, () => {
      const a = this.c4List.find(a => Math.abs(a.pos.z - P.pos.z + 5) < 6 && a.pos.distanceTo(P.pos) < 10) || this.c4List[2];
      a.anim.setMode('loco'); a.face(P.pos.clone()); const d = P.pos.clone().sub(a.pos).setY(0).setLength(0.8); a.goTo(a.pos.clone().add(d), 3);
      g.audio.duck(1, 0.02); g.audio.music.sting?.('danger'); g.camera.shake(0.12);
      setTimeout(() => { a.stop(); a.anim.setMode('freeze'); g.audio.duck(0.3, 0.8); }, 450);
      scared = true;
      setTimeout(() => this.banter([['BRAM', 'Did— did that one just—', { dur: 2, emotion: 'surprised' }], ['ROOK', 'Keep moving.', { dur: 1.4 }], ['BRAM', 'They\'re alive. Gods, Rook, they\'re alive in there.', { dur: 3, emotion: 'worried' }]]), 900);
    });
    this.trigger(() => P.pos.z < 0, () => this.banter([['NIA', 'Talk to me. What do you see?', { radio: true, dur: 2 }], ['ROOK', 'A woman with her hand on a door. For thirty years.', { radio: true, dur: 3 }], ['NIA', '…Keep talking.', { radio: true, dur: 1.6 }]]));
    await this.waitFor(() => P.pos.z < SW.square + 18); this.guard(id);
    // the plaque
    this.objective('Read the plaque', 'On the edge of the square.', S.plaque.clone().add(V(0, 1, 0)));
    await this.useOnce({ getPos: () => S.plaque.clone().add(V(0, 1, 0)), radius: 2.6, label: 'Read the plaque' }); this.guard(id);
    await readDoc(this, 'WELCOME TO STILLWATER', ['City of Rain · population 118,000', 'Founded on the old reservoir in the eighty-first year after the Fall.', '"Where the water stays, the people stay."']); this.guard(id);
    await this.say('BRAM', 'A hundred and eighteen thousand.', { actor: C.bram, dur: 2.4, emotion: 'sad' });
    offB();
    g.state.journal('Stillwater: a city of 118,000, stopped in the rain. Some of them are still alive. They move, a little, now and then.');
    g.state.checkpoint = 'c4_square'; g.state.save(g);
  },

  // ================================================================== THE SQUARE, AND THE ARCHIVE
  async beat_c4_square(id) {
    const g = this.game, P = g.player, Z = this.zone, S = Z.spots, C = this.cast;
    if (!this.bursts || this.retrying === 'c4_square') { this.c4Setup(); }
    if (this.c4Arrive?.('c4_square') || C.bram.hidden) this.bramAt(P.pos.clone().add(V(1.6, 0, 1)), P.yaw);
    this.equip(true, true); P.relaxed = false; g.weapons.locked = false;
    if (g.audio.music.cue !== 'stillwater') g.audio.music.play('stillwater', 2);
    const offB = this.companion(C.bram);
    // the square's machines: drones and leeches held mid-swarm, moving in bursts
    const foes = [];
    for (const [dx, dz, k] of [[-10, -6, 'leech'], [9, -10, 'leech'], [-6, 8, 'gnat'], [7, 4, 'gnat'], [0, -14, 'leech']]) {
      const p = S.square.clone().add(V(dx, k === 'gnat' ? 3 : 0, dz)); p.y = Z.gy(p.x, p.z) + (k === 'gnat' ? 3 : 0);
      const e = g.enemies.spawn(k, p, { alwaysAware: true }); e.timeScale = 0; foes.push(e);
      this.bursts.add({ pos: () => e.pos, min: 1.2, max: 3.2, dur: [0.5, 1.1], start: () => { e.timeScale = 2.2; }, end: () => { e.timeScale = 0; }, tick: () => { if (e.dead) e.timeScale = 1; } });
    }
    this.objective('Get to the town hall', 'The machines here move only in bursts. Shoot them while they\'re still.', S.hall.clone().add(V(0, 1.5, 2)));
    await this.say('BRAM', 'Scavs. Stuck like everything else. When they move, they move fast — hit them while they\'re frozen!', { actor: C.bram, dur: 4, wait: false });
    await this.waitFor(() => foes.every(e => e.dead) || P.pos.distanceTo(S.hall) < 6); this.guard(id);
    foes.forEach(e => { if (!e.dead) e.timeScale = 1; });
    await this.waitFor(() => foes.every(e => e.dead)); this.guard(id);
    // the archive
    this.objective('Search the archive', 'Inside the town hall.', S.terminal.clone().add(V(0, Z.gy(S.terminal.x, S.terminal.z), 0)));
    const term = S.terminal.clone(); term.y += Z.gy(term.x, term.z);
    await this.useOnce({ getPos: () => term, radius: 2.4, label: 'Wake the terminal' }); this.guard(id);
    Z.screen.material.color.setRGB(0.3, 1.6, 0.6); g.audio.ui('radio');
    await readDoc(this, 'MUNICIPAL RECORD 41-C', [
      'AGREEMENT between the City of Stillwater and the MARCHER AUTHORITY.',
      'In exchange for twenty years of supply contracts the City consents to a "kinetic survey" of the reservoir district during the Marcher\'s passage, Year 31 of the Walk.',
      'Residents need not be informed. Disruption is expected to be minimal.',
      '— signed, Mayor A. Hollis · witnessed, Meridian Engineering']);
    this.guard(id);
    await this.say('ROOK', '"Disruption is expected to be minimal."', { actor: { anim: P.anim, pos: P.pos }, dur: 2.6 });
    await this.say('BRAM', '…Year thirty-one. I was nineteen.', { actor: C.bram, dur: 2.4, emotion: 'worried' });
    offB();
    g.state.flag('c4_record2');
    g.state.checkpoint = 'c4_works'; g.state.save(g);
  },
  c4Arrive(cp) {
    const g = this.game, P = g.player, sp = c4Spawn(this, cp); if (!sp) return false;
    if (P.pos.distanceTo(sp[0]) > 30 || this.retrying === cp) { P.teleport(sp[0].clone(), sp[1]); g.camera.snapBehind(sp[1], 0.05); g.hud.fade(0, 0.8); return true; }
    return false;
  },

  // ================================================================== THE WORKS
  async beat_c4_works(id) {
    const g = this.game, P = g.player, Z = this.zone, S = Z.spots, C = this.cast;
    if (!this.bursts || this.retrying === 'c4_works') this.c4Setup();
    if (this.c4Arrive('c4_works') || C.bram.hidden) this.bramAt(P.pos.clone().add(V(1.6, 0, 1)), P.yaw);
    this.equip(true, true); P.relaxed = false; g.weapons.locked = false;
    if (g.audio.music.cue !== 'stillwater') g.audio.music.play('stillwater', 2);
    const offB = this.companion(C.bram);
    // the presses: each slams at its own unpredictable moment
    for (const pr of Z.presses) {
      this.bursts.add({ pos: () => pr.ram.position, min: 1.8, max: 4.6, dur: [0.9, 0.9], first: 0.5 + Math.random() * 3,
        start: () => { pr.t = 0; g.audio.metalStress(pr.ram.position, 0.6); },
        tick: (it, dt) => { pr.t += dt; const u = pr.t < 0.18 ? pr.t / 0.18 : Math.max(0, 1 - (pr.t - 0.3) / 0.6); pr.ram.position.y = lerp(pr.up, pr.down, u * u);
          if (pr.t > 0.17 && !pr.hit) { pr.hit = true; g.audio.clank(pr.ram.position, 2.4, 0.4); if (pr.ram.position.distanceTo(P.pos) < 18) g.camera.shake(0.2); }
          const under = Math.abs(P.pos.x - pr.ram.position.x) < 2.3 && Math.abs(P.pos.z - pr.pz) < 1.5 && P.pos.y < pr.ram.position.y - 0.4;
          if (under && pr.t < 0.2 && !pr.hurt) { pr.hurt = true; P.damage(45, pr.ram.position); P.vel.x += (P.pos.x > pr.ram.position.x ? 1 : -1) * 8; } },
        end: () => { pr.hit = false; pr.hurt = false; pr.ram.position.y = pr.up; } });
    }
    this.objective('Search the works office', 'Through the press hall. Move between the slams.', () => P.pos.z > SW.works + 23 ? S.worksDoor : P.pos.y < Z.gy(S.office.x, S.office.z) + 2 && P.pos.distanceTo(S.office) > 5 ? S.office.clone().add(V(-3.6, 0, 6.5)) : S.logbookW);
    this.trigger(() => P.pos.z < SW.works + 22, () => this.banter([['BRAM', 'Wait for it… wait… there\'s no rhythm to them. There\'s no rhythm!', { dur: 3.4, emotion: 'worried' }]]));
    await this.useOnce({ getPos: () => S.logbookW, radius: 2.2, label: 'Read the logbook' }); this.guard(id);
    offB();
    await readDoc(this, 'HARVEST TRIAL 7 · MERIDIAN ENGINEERING', [
      'DAY 1. Array deployed beside Leg Two over the reservoir district. H-1 through H-9 standing by for maintenance.',
      'DAY 3. Yield exceeds every projection. Stillwater gave us eleven years of stride in four days.',
      'DAY 4. The field will not release. Population status: HELD.',
      'Recommend the site be closed, the units left on site, and the trial classified at the highest level.',
      '— T. Harrow, Chief Engineer']);
    this.guard(id);
    g.state.flag('c4_harrow');
    this.enter(true);
    const lk = P.pos.clone().add(V(0, 1.55, 0));
    g.director.shot({ pos: g.director.frame(lk, [V(1.6, 0.2, 1.4), V(-1.6, 0.2, 1.4), V(1.4, 0.2, -1.6)]), look: lk, fov: 34, cut: true });
    P.anim.setEmotion('angry');
    await this.say('ROOK', 'T. Harrow. Chief Engineer.', { actor: { anim: P.anim, pos: P.pos }, dur: 2.2 });
    await this.say('ROOK', 'Commander Harrow did this. Meridian did this. H-1 through H-9 — the Shearer was one of ours, left here to guard it.', { actor: { anim: P.anim, pos: P.pos }, dur: 5 });
    show(C.bram, P.pos.clone().add(V(-1.4, 0, 1.2)), 0); C.bram.face(P.pos.clone());
    g.director.shot({ ...g.director.closeUp(C.bram, { dist: 1.3, fov: 32 }), cut: true });
    await this.say('BRAM', '…', { actor: C.bram, dur: 1.6, emotion: 'sad' });
    g.state.journal('Stillwater was Harvest Trial 7: Meridian Engineering took eleven years of stride from it in four days, and the city never woke. The logbook is signed "T. Harrow, Chief Engineer".');
    this.exit();
    g.state.checkpoint = 'c4_escape'; g.state.save(g);
  },

  // ================================================================== THE CITY EXHALES
  async beat_c4_escape(id) {
    const g = this.game, P = g.player, Z = this.zone, S = Z.spots, C = this.cast, ST = g.stillness;
    if (!this.bursts || this.retrying === 'c4_escape') this.c4Setup();
    this.c4Arrive('c4_escape');
    this.equip(true, true); P.relaxed = false; g.weapons.locked = false;
    if (C.bram.hidden) this.bramAt(P.pos.clone().add(V(1.4, 0, 1)), P.yaw);
    // everything moves at once, and keeps moving; the held field tightens behind them
    this.enter(true);
    g.director.shot({ pos: S.worksDoor.clone().add(V(-6, 3, 10)), look: S.works.clone().add(V(0, 3, 0)), fov: 46, cut: true });
    g.audio.duck(1, 0.1); g.camera.shake(0.6); g.audio.explosion(S.works, 0.8);
    this.bursts.intensity = 2.6;
    this.bursts.items.forEach(it => { it.next = g.time + Math.random() * 0.6; });
    g.audio.music.play('rescue', 0.6);
    await this.radio('NIA', 'Rook! Everything just moved — everything, the whole street! I\'m bringing the Mule in — get to the square!', { dur: 4.4 });
    this.exit();
    const offB = this.companion(C.bram, { far: 30 });
    const grow = ST.add({ pos: S.works.clone(), r: 12, base: 0.9, pulse: 0.05, period: 3, grow: 4.2, maxR: 130 });
    const m = groundMule(this); m.visible = true; const pick = S.square.clone().add(V(0, 0, 14)); m.position.copy(pick).add(V(3, 0.3, 0)); m.rotation.set(0, Math.PI, 0);
    show(C.nia, m.position.clone(), Math.PI); C.nia.mount = m.userData.cab; C.nia.mountYaw = 0; C.nia.anim.setMode('sit');
    this.objective('Get out', 'Back to the square — Nia\'s bringing the Mule. Don\'t stop moving.', pick);
    await this.waitFor(() => P.pos.distanceTo(pick) < 7); this.guard(id);
    offB();
    this.enter(true);
    P.setScripted(true);
    g.director.shot({ pos: pick.clone().add(V(-9, 3, 12)), look: m.position.clone().add(V(0, 1.4, 0)), fov: 42, cut: true });
    await this.say('NIA', 'GET IN!', { actor: C.nia, dur: 1.2 });
    await g.hud.fade(1, 0.7); this.guard(id);
    ST.remove(grow);
    P.setScripted(false);
    this.exit();
    g.state.checkpoint = 'c4_bram'; g.state.save(g);
  },

  // ================================================================== BRAM
  async beat_c4_bram(id) {
    const g = this.game, P = g.player, Z = this.zone, S = Z.spots, C = this.cast;
    if (!Z || Z.name !== 'stillwater') return;
    this.bursts?.off(); this.bursts = null; g.stillness?.clear(); g.audio.duck(1, 1);
    this.equip(true, true); P.relaxed = true; g.weapons.locked = true;
    // a rise outside the city: the Mule, the three of them, the hanging rain glowing faintly behind
    const camp = S.edge.clone().add(V(-6, 0, 30)); camp.y = Z.gy(camp.x, camp.z);
    const m = groundMule(this); m.visible = true; m.position.copy(camp).add(V(4, 0.3, -1)); m.rotation.set(0, 0.6, 0);
    P.teleport(camp.clone(), Math.PI * 0.2); g.camera.snapBehind(Math.PI * 0.2, 0.05);
    show(C.bram, camp.clone().add(V(-2.2, 0, -1.6)), 0.6); C.bram.activity(null); C.bram.anim.setMode('loco'); C.bram.pose('sitGround');
    show(C.nia, m.position.clone().add(V(-1.6, -0.3, 1.8)), Math.PI); C.nia.mount = null; C.nia.activity('lean');
    g.audio.music.play('night', 3);
    g.hud.fade(0, 2);
    this.enter(true);
    g.director.shot({ pos: camp.clone().add(V(4, 2.2, 6)), look: camp.clone().add(V(-2, 1, -8)), fov: 40, cut: true });
    await this.wait(2.5); this.guard(id);
    C.bram.lookAtPlayer();
    await this.convo(C.bram, [
      ['ROOK', 'You knew.', { emotion: 'angry' }],
      ['BRAM', '…I suspected. For years. There were things you hear in the Lower Decks if you\'re there long enough. Units that went down and didn\'t come back. Telemetry nobody would let me see.', { emotion: 'sad' }],
      ['BRAM', 'And every time we crossed something on the old maps that said "closed" in red, I looked the other way.', { emotion: 'sad' }],
      ['ROOK', 'Why?', { emotion: 'angry' }],
      ['BRAM', 'Because ninety thousand people sleep in that city, kid. Because if this came out, there\'d be riots in the market by morning and Harrow\'s Security on every deck by noon. Because I was scared.', { emotion: 'worried' }],
      ['BRAM', 'I\'m sixty-one. I told you. Everything scares me.', { emotion: 'sad' }],
    ]);
    this.guard(id);
    const v = await this.pick(C.bram, [
      { text: 'You let me ride the Mule down to Callow Reach knowing what we\'d find.', tone: 'angry', value: 'angry' },
      { text: 'I understand why. I don\'t forgive it.', tone: 'hard', value: 'understand' },
      { text: '…', tone: 'silent', value: 'silent' },
    ]);
    if (v === 'angry') { await this.convo(C.bram, [['BRAM', 'I let you go because I hoped you\'d find something I was too frightened to look for.', { emotion: 'sad' }], ['ROOK', 'That\'s worse, Bram.']]); g.state.adjust('bram', 'trust', -3); }
    if (v === 'understand') { await this.convo(C.bram, [['BRAM', '…That\'s fair. That\'s more than fair.', { emotion: 'sad' }]]); g.state.adjust('bram', 'trust', -1); }
    if (v === 'silent') { await this.convo(C.bram, [['BRAM', 'Say something, kid. Anything.', { emotion: 'sad' }]]); P.anim.setEmotion('angry'); g.state.adjust('bram', 'trust', -2); }
    g.state.choice('c4_bram', v); g.state.flag('c4Complete');
    await this.convo(C.nia, [['NIA', 'We have proof now. Harrow\'s name. What do we do with it?', { emotion: 'worried' }], ['ROOK', 'We find out who else knew.']]);
    g.state.journal('Bram suspected for years. He kept quiet because he was afraid of what the truth would do to Meridian. I don\'t know how to trust him now.');
    await g.hud.fade(1, 2.2); this.guard(id);
    hide(C.bram); hide(C.nia);
    this.exit();
    g.state.checkpoint = 'c5_title'; g.state.save(g);
  },
  c4Cleanup() { leaveStillwater(this); this.c4List = null; },
};
