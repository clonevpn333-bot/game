// CHAPTER FIVE — VESPER
// Meridian meets the other walking city. Rook and Nia cross by gondola as part of the advance delegation:
// a boulevard, cafés, a tram, greenhouses, a festival; a poet who needs one word, a girl who lost her
// lantern, an old engineer who knows Nia's mother's name. Nia lived here. She ran after Vesper rolled past
// a ground town she loved. That night, on a rooftop over both cities, the question: does either deserve to
// keep walking at the world's expense? (And, if she trusts Rook enough: she has imagined leaving.) Then
// Tomas arrives with Harrow, and the archive off the embassy hall shows how much both cities have always
// known about the Stillness.
import * as THREE from 'three';
import { show, hide } from './cast.js';
import { buildVesper, VS } from '../world/district_vesper.js';
import { clamp, damp, lerp } from '../core/util.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const CH5 = ['c5_title', 'c5_crossing', 'c5_vesper', 'c5_festival', 'c5_rooftop', 'c5_reception', 'c5_end'];

export function enterVesper(s) {
  const g = s.game;
  g.cityHidden = false; g.surface = false; g.killY = -380; g.city.walking = true; g.city.speedMul = 1;
  if (s.zone) { s.zone.dispose(); s.zone = null; }
  if (!s.vesper) s.vesper = buildVesper(g);
}
export function leaveVesper(s) { s.vesper?.dispose(); s.vesper = null; }
export function c5Spawn(s, cp) {
  const Vx = s.vesper; if (!Vx) return null; const S = Vx.spots;
  return { c5_vesper: [S.station, Math.PI / 2], c5_festival: [S.plaza.clone().add(V(-10, 0, 14)), Math.PI * 0.8], c5_rooftop: [S.roofTop, -Math.PI / 2], c5_reception: [S.steps, Math.PI] }[cp] || null;
}

export const Chapter5 = {
  c5Arrive(cp) {
    const g = this.game, P = g.player, sp = c5Spawn(this, cp); if (!sp) return false;
    if (P.pos.distanceTo(sp[0]) > 30 || this.retrying === cp) { P.teleport(sp[0].clone(), sp[1]); g.camera.snapBehind(sp[1], 0.05); g.hud.fade(0, 0.8); return true; }
    return false;
  },
  // Vesper's people: strolling the boulevard and the promenade, at the café tables, at the festival
  c5People(festival = false) {
    const g = this.game, S = this.vesper.spots, cr = g.crowd; let seed = 5100;
    const fancy = () => ({ outfit: Math.random() < 0.6 ? 'casual' : 'vendor', primary: ['#e8e0d0', '#2a4a6a', '#8a2a3a', '#c8a040', '#3a5a4a'][Math.floor(Math.random() * 5)] });
    const barks = [['VESPERINE', 'Meridian people! Look at their boots.'], ['VESPERINE', 'Have you tried the plums? They\'re from the third greenhouse.'], ['VESPERINE', 'Is it true your city has legs? How dreadful.'], ['VESPERINE', 'Mind the tram, darling.']];
    for (let i = 0; i < 12; i++) cr.spawnWalker(S.lanes.boulevardW, seed++, { width: 5, look: fancy(), barks: i % 3 ? null : barks, cull: 90 });
    for (let i = 0; i < 12; i++) cr.spawnWalker(S.lanes.boulevardE, seed++, { width: 5, look: fancy(), barks: i % 4 ? null : barks, cull: 90 });
    for (let i = 0; i < 6; i++) cr.spawnWalker(S.lanes.promenade, seed++, { width: 3, look: fancy(), cull: 90 });
    for (let i = 0; i < 6; i++) cr.spawnWalker(S.lanes.station, seed++, { width: 4, look: fancy(), cull: 90 });
    S.cafes.forEach((c, i) => { if (i % 3 === 2) return; const a = cr.spawnSpot({ pos: c.pos, yaw: c.yaw, mode: 'sit' }, seed++, { look: fancy(), cull: 80 }); if (i % 2) { a.anim.activity = 'drink'; } });
    if (festival) {
      for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2, rr = 6 + Math.random() * 9; cr.spawnSpot({ pos: S.plaza.clone().add(V(Math.cos(a) * rr, 0, Math.sin(a) * rr)), yaw: Math.atan2(S.stage.x - S.plaza.x - Math.cos(a) * rr, -Math.sin(a) * rr), activity: ['watch', 'drink', 'talkIdle', 'kidPlay'][i % 4] }, seed++, { look: i % 4 === 3 ? { kid: true } : fancy(), cull: 90 }); }
      for (let i = 0; i < 3; i++) cr.spawnSpot({ pos: S.stage.clone().add(V(-0.5, 0, -2 + i * 2)), yaw: -Math.PI / 2, activity: 'busk' }, seed++, { look: { outfit: 'casual', primary: ['#8a2a3a', '#2a4a6a', '#c8a040'][i] }, cull: 90 });
    }
  },

  // ================================================================== CHAPTER CARD
  async beat_c5_title(id) {
    const g = this.game;
    this.enter(true);
    await g.hud.fade(1, 0.4);
    g.audio.music.stop(1);
    g.hud.chapterCard('CHAPTER FIVE', 'VESPER', 'Two cities, walking side by side.');
    await this.wait(0.3);
    enterVesper(this);
    if (g.sky.mood !== 'day') g.sky.setMood('day');
    await this.wait(5.2);
    g.hud.hideChapter(); await this.wait(1.6);
    this.exit();
    g.state.chapter = 'chapter5'; g.state.checkpoint = 'c5_crossing'; g.state.save(g);
  },

  // ================================================================== THE CROSSING
  async beat_c5_crossing(id) {
    const g = this.game, P = g.player, C = this.cast, Vx = this.vesper, S = Vx.spots;
    if (g.sky.mood !== 'day') g.sky.setMood('day');
    this.equip(true, true); P.relaxed = true; g.weapons.locked = true;
    // the gondola line from Meridian's starboard rail to Vesper's station
    const A = V(199, 3, -40), B = S.cableEnd.clone();
    const line = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 6), g.materials.cableSteel); const mid = A.clone().lerp(B, 0.5), len = A.distanceTo(B);
    line.position.copy(mid).add(V(0, 3, 0)); line.scale.y = len; line.quaternion.setFromUnitVectors(V(0, 1, 0), B.clone().sub(A).normalize()); g.engine.cityRoot.add(line);
    const cab = new THREE.Group(); g.engine.cityRoot.add(cab);
    { const m = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.6, 2.4), new THREE.MeshStandardMaterial({ color: 0xc8a040, metalness: 0.5, roughness: 0.4 })); m.position.y = -2; cab.add(m);
      const w = new THREE.Mesh(new THREE.BoxGeometry(3.24, 1.1, 2.44), g.materials.glassDark); w.position.y = -1.6; cab.add(w);
      const h = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.4), m.material); h.position.y = -0.2; cab.add(h); }
    this.c5Gondola = () => { line.removeFromParent(); line.geometry.dispose(); cab.traverse(o => o.geometry?.dispose()); cab.removeFromParent(); };
    const seatR = new THREE.Object3D(); seatR.position.set(-0.6, -3.3, 0.4); cab.add(seatR); const seatN = new THREE.Object3D(); seatN.position.set(0.7, -3.3, -0.3); cab.add(seatN);
    let u = 0;
    const ride = g.add(() => { const p = A.clone().lerp(B, u); p.y += 3 - Math.sin(u * Math.PI) * 8; cab.position.copy(p); cab.rotation.y = Math.PI / 2; cab.updateMatrixWorld(true); P.placeScripted(seatR.getWorldPosition(V(0, 0, 0)), Math.PI / 2 + 0.6); });
    P.setScripted(true);
    show(C.nia, V(0, 0, 0), 0); C.nia.mount = seatN; C.nia.mountYaw = Math.PI * 0.4; C.nia.activity(null); C.nia.anim.setMode('loco');
    this.enter(true);
    g.hud.fade(0, 1.6);
    g.audio.music.play('vesper', 3);
    // the two cities, walking together
    g.director.shot({ pos: V(380, -170, -760), look: V(470, -140, -60), fov: 42, cut: true, to: { pos: V(400, -150, -700), fov: 38 }, dur: 9 });
    g.hud.location('VESPER', 'THE ROLLING CITY · POP. 140,000', 6);
    await this.wait(5.5); this.guard(id);
    const t0 = g.time;
    const go = g.add(() => { u = clamp((g.time - t0) / 22, 0, 1); });
    g.director.shot({ pos: () => cab.position.clone().add(V(-6, -1.5, 16)), look: () => cab.position.clone().add(V(14, -3, -2)), fov: 46, cut: true });
    await this.say('NIA', 'They used to say you could tell a Vesperine by the way they look at Meridian. Like it\'s a big dog that might bite.', { actor: C.nia, dur: 5 });
    await this.say('ROOK', 'You sound like you know.', { actor: { anim: P.anim, pos: P.pos }, dur: 2 });
    await this.say('NIA', '…Mm.', { actor: C.nia, dur: 1.4 });
    g.director.shot({ pos: () => cab.position.clone().add(V(4, -2.0, -9)), look: () => cab.position.clone().add(V(0, -2.2, 0)), fov: 40, cut: true });
    await this.radio('TOMAS', 'Runners, you\'re the advance party. Smile, carry the bags, don\'t start anything. The Commander and I come over tonight.', { dur: 4.8 });
    await this.radio('TOMAS', '…Rook. Please don\'t start anything.', { dur: 2.4 });
    g.director.shot({ pos: () => cab.position.clone().add(V(10, 2, -8)), look: () => cab.position.clone().add(V(0, -2, 0)), fov: 44, cut: true });
    await this.waitFor(() => u >= 1); this.guard(id);
    go(); ride();
    await g.hud.fade(1, 0.6); this.guard(id);
    C.nia.mount = null;
    P.setScripted(false); P.teleport(S.station.clone(), Math.PI / 2); g.camera.snapBehind(Math.PI / 2, 0.05);
    this.niaAt(S.station.clone().add(V(0, 0, 2)), Math.PI / 2);
    this.exit();
    g.state.checkpoint = 'c5_vesper'; g.state.save(g);
  },

  // ================================================================== VESPER BY DAY
  async beat_c5_vesper(id) {
    const g = this.game, P = g.player, C = this.cast, Vx = this.vesper, S = Vx.spots;
    if (g.sky.mood !== 'day') g.sky.setMood('day');
    this.c5Gondola?.(); this.c5Gondola = null;
    this.equip(true, true); P.relaxed = true; g.weapons.locked = true;
    if (this.c5Arrive('c5_vesper') || C.nia.hidden) this.niaAt(P.pos.clone().add(V(0, 0, 2)), P.yaw);
    g.crowd.clear(); this.c5People();
    g.hud.fade(0, 1);
    if (g.audio.music.cue !== 'vesper') g.audio.music.play('vesper', 2);
    const offN = this.companion(C.nia);
    this.objective('Report to the Embassy', 'North end of the grand boulevard. Take your time — Vesper is worth looking at.', () => Math.abs(P.pos.x - VS.x) > 10 && P.pos.z > -150 ? V(VS.x - 6, VS.y, clamp(P.pos.z, -140, -30)) : S.steps);
    this.banter([2, ['NIA', 'Don\'t stare at the tram. Everybody stares at the tram.', { dur: 2.8 }], 0.6, ['ROOK', 'It\'s on the roof of a city.', { dur: 1.8 }], ['NIA', 'So is everything you own.', { dur: 2.2, emotion: 'amused' }]]);
    // ---- Orel, the poet at the café, who needs one word
    const cafe = S.cafes[5].pos.clone();
    show(C.orel, cafe.clone().add(V(0, 0, 1.6)), Math.PI); C.orel.activity('talkIdle');
    this.item({ getPos: () => C.orel.pos, radius: 2.6, label: 'Talk to the poet', once: true, onUse: async () => {
      await this.banter([['OREL', 'You! Meridian! You\'ll do. I need one word to end a poem about our two cities.', { dur: 4, actor: C.orel }], ['OREL', '"Two giants walk the dying land, and neither one will—" what?', { dur: 4, actor: C.orel }]]);
      const w = await this.choose([{ text: '"…stop."', tone: 'blunt', value: 'stop' }, { text: '"…look down."', tone: 'pointed', value: 'look' }, { text: '"…take my hand."', tone: 'warm', value: 'hand' }]);
      g.state.flag('c5_poem', w);
      this.bark('OREL', { stop: '"…stop." Hm. Brutal. True. I hate it. I\'m keeping it.', look: '"…look down." Oh, that\'s cruel. That\'s wonderful.', hand: '"…take my hand." Ha! A romantic. On a Runner. Who knew.' }[w], 4, C.orel);
    } });
    // ---- Lumi and her lantern (stuck on a café awning; the tether can bring it down)
    const awn = S.cafes[1].pos.clone().add(V(1.5, 3.9, -2.6));
    const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.6, 0.3).multiplyScalar(2.5) })); lantern.position.copy(awn); g.engine.cityRoot.add(lantern);
    show(C.lumi, awn.clone().setY(VS.y).add(V(0, 0, 3)), Math.PI); C.lumi.activity(null); C.lumi.lookAt(awn);
    let gotLantern = false;
    const offL = g.tether.register({ kind: 'special', label: 'Lantern', captureOnly: true, priority: 3, radius: 0.5, range: 30, enabled: () => !gotLantern, getPos: () => lantern.position.clone(), getVel: () => V(), capture: () => { if (!gotLantern) { gotLantern = true; this.lanternFly = true; } return 0; }, push: () => {} });
    this.item({ getPos: () => C.lumi.pos, radius: 2.6, label: () => gotLantern ? 'Give Lumi her lantern' : 'Talk to the girl', onUse: async (it) => {
      if (!gotLantern) { await this.banter([['LUMI', 'My lantern\'s stuck. It\'s for the festival. It has my wish in it and now the wish is on a roof.', { dur: 4.4, actor: C.lumi }], ['NIA', 'Your tether can reach that, Runner. Hold [E] on it.', { dur: 3 }]]); g.hud.hint('capture', true); return; }
      g.interact.remove(it); lantern.removeFromParent(); g.state.flag('c5_lantern'); g.state.adjust('nia', 'warmth', 1);
      await this.banter([['LUMI', 'You got it! Do you want to know my wish? You can\'t, it\'s secret. It\'s about a dog.', { dur: 4, actor: C.lumi, emotion: 'happy' }], ['NIA', '…Good wish.', { dur: 1.6, emotion: 'happy' }]]);
    } });
    const fly = g.add((dt) => { if (this.lanternFly && lantern.parent) { const to = P.pos.clone().add(V(0, 1.4, 0)); lantern.position.lerp(to, 1 - Math.exp(-dt * 4)); } });
    // ---- Sable, the old greenhouse engineer, who knows Nia
    const gh = S.greenhouses[0].clone();
    show(C.sable, gh.clone().add(V(-2, 0, 2)), -Math.PI / 2); C.sable.activity('water');
    let sableMet = false;
    this.item({ getPos: () => C.sable.pos, radius: 2.8, label: 'Talk to the gardener', once: true, onUse: async () => {
      sableMet = true;
      await this.banter([['SABLE', 'Mind the beds, they\'re older than— hold on. Hold on. Turn your head, girl.', { dur: 4, actor: C.sable }],
        ['SABLE', 'You\'re Ama Okoye\'s daughter. Little Nia. You used to steal my figs.', { dur: 4, actor: C.sable, emotion: 'happy' }],
        ['NIA', '…Hello, Sable.', { dur: 1.8, emotion: 'sad' }],
        ['SABLE', 'Your mother looked for you for a year. After Sedge Hollow. Everybody said you\'d gone over the side.', { dur: 4.6, actor: C.sable, emotion: 'sad' }],
        ['NIA', 'I did go over the side. Just not the way they meant.', { dur: 3 }]]);
      g.state.flag('c5_sable');
    } });
    // ---- the embassy steps: Nia tells it
    await this.waitFor(() => P.pos.distanceTo(S.steps) < 7); this.guard(id);
    offN(); offL(); fly();
    this.enter(true);
    this.niaAt(S.steps.clone().add(V(1.6, 0, 0.6)), Math.PI);
    const lk = S.steps.clone().add(V(0.8, 1.5, 0));
    g.director.shot({ pos: lk.clone().add(V(-3.4, 0.2, 3.2)), look: lk, fov: 38, cut: true });
    this.playerFace(C.nia.pos); C.nia.face(P.pos.clone()); C.nia.lookAtPlayer();
    await this.convo(C.nia, [
      sableMet ? ['ROOK', 'Sedge Hollow.'] : ['ROOK', 'You know this city. Every street.'],
      ['NIA', 'I lived here. Until I was sixteen. My mother kept the third greenhouse.', { emotion: 'sad' }],
      ['NIA', 'We traded with a ground town called Sedge Hollow. A well, too many dogs, a boy who taught me to drive a tractor before I could reach the pedals.', { emotion: 'sad' }],
      ['NIA', 'The dry year, Vesper rolled past it. Close. I watched from the promenade. The dogs stopped barking first.', { emotion: 'sad' }],
      ['NIA', 'I went over the side the same week. Walked till Meridian came by. Told them I was from nowhere.', { emotion: 'tired' }],
      ['NIA', 'That\'s why I\'ve never trusted the Marchers, Rook. Any of them. Including the one I live on.'],
    ]);
    this.guard(id);
    const v = await this.pick(C.nia, [{ text: 'Thank you for telling me.', tone: 'warm', value: 'thanks' }, { text: 'You could have told me sooner.', tone: 'hurt', value: 'sooner' }, { text: 'Is that why you came down with me?', tone: 'curious', value: 'why' }]);
    if (v === 'thanks') { await this.convo(C.nia, [['NIA', 'Don\'t thank me. Buy me a plum.', { emotion: 'happy' }]]); g.state.adjust('nia', 'trust', 1); }
    if (v === 'sooner') { await this.convo(C.nia, [['NIA', 'I couldn\'t. Not until I\'d stood here again.', { emotion: 'sad' }]]); }
    if (v === 'why') { await this.convo(C.nia, [['NIA', 'I came down with you because you didn\'t look away. That\'s rare up here.', { emotion: 'neutral' }]]); g.state.adjust('nia', 'warmth', 1); g.state.adjust('nia', 'spark', 1); }
    g.state.journal('Nia grew up in Vesper. When Vesper rolled past Sedge Hollow, the ground town she loved, she watched it go still from the promenade — and ran. That\'s why she has never trusted the Marchers.');
    // the Archon welcomes them
    show(C.ferrand, S.steps.clone().add(V(0, 0, -5)), 0); C.ferrand.goTo(S.steps.clone().add(V(0, 0, -2.2)), 1.2);
    await this.wait(1.6); C.ferrand.lookAtPlayer();
    await this.convo(C.ferrand, [
      ['FERRAND', 'The Runners from Meridian. I am Lys Ferrand, Archon of Vesper. Your delegation arrives tonight.', { emotion: 'neutral' }],
      ['FERRAND', 'Until then — the festival. Vesper celebrates every crossing. We have so few neighbours.', { emotion: 'happy' }],
    ]);
    this.exit();
    hide(C.orel); hide(C.lumi); hide(C.sable);
    g.state.checkpoint = 'c5_festival'; g.state.save(g);
  },

  // ================================================================== THE FESTIVAL
  async beat_c5_festival(id) {
    const g = this.game, P = g.player, C = this.cast, Vx = this.vesper, S = Vx.spots;
    await g.hud.fade(1, 0.8); this.guard(id);
    if (g.sky.mood !== 'dusk') g.sky.setMood('dusk');
    hide(C.ferrand);
    this.equip(true, true); P.relaxed = true; g.weapons.locked = true;
    g.crowd.clear(); this.c5People(true);
    P.teleport(S.plaza.clone().add(V(-10, 0, 14)), Math.PI * 0.8); g.camera.snapBehind(Math.PI * 0.8, 0.05);
    this.niaAt(S.plaza.clone().add(V(-8.6, 0, 15)), Math.PI * 0.8);
    g.hud.fade(0, 1.4);
    g.audio.music.play('vesper', 2);
    g.hud.location('THE CROSSING FESTIVAL', 'VESPER · DUSK', 5);
    const offN = this.companion(C.nia);
    this.objective('Enjoy the festival', 'Find Nia by the lantern stall when you\'re ready.', () => C.nia.pos);
    await this.wait(3); this.guard(id);
    offN();
    const stall = S.plaza.clone().add(V(-14, 0, -6)); C.nia.goTo(stall, 1.4);
    this.objective('The lantern stall', 'Nia\'s waiting.', stall);
    await this.useOnce({ getPos: () => C.nia.pos, radius: 2.8, label: 'Light a lantern with Nia' }); this.guard(id);
    this.enter(true);
    C.nia.face(P.pos.clone());
    this.playerFace(C.nia.pos);
    const lk = C.nia.pos.clone().add(P.pos).multiplyScalar(0.5).add(V(0, 1.45, 0)), dn = P.pos.clone().sub(C.nia.pos).setY(0).normalize(), side = V(-dn.z, 0, dn.x);
    g.director.shot({ pos: g.director.frame(lk, [side.clone().multiplyScalar(3.2).setY(0.2), side.clone().multiplyScalar(-3.2).setY(0.2)]), look: lk, fov: 40, cut: true });
    await this.say('NIA', 'You write a wish on it and let it go. If it clears the edge of the city, it comes true. That\'s the rule.', { actor: C.nia, dur: 4.6 });
    const v = await this.choose([{ text: '"That Callow Reach makes it through the winter."', tone: 'hope', value: 'reach' }, { text: '"That Tomas forgives me."', tone: 'family', value: 'tomas' }, { text: '"That you stay."', tone: 'warm', value: 'stay' }]);
    g.state.choice('c5_wish', v);
    if (v === 'stay') { await this.say('NIA', '…You\'re not supposed to say it out loud, idiot.', { actor: C.nia, dur: 2.8, emotion: 'happy' }); g.state.adjust('nia', 'spark', 1); }
    else await this.say('NIA', 'Good wish.', { actor: C.nia, dur: 1.6, emotion: 'happy' });
    // two lanterns rise over the edge
    const lan = [0, 1].map(i => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.6, 0.3).multiplyScalar(2.5) })); m.position.copy(C.nia.pos).add(V(i * 0.8, 1.6, 0)); g.engine.cityRoot.add(m); return m; });
    const rise = g.add((dt) => lan.forEach((m, i) => { m.position.y += dt * (1.6 + i * 0.2); m.position.x -= dt * (2.2 + i * 0.4); }));
    g.director.shot({ pos: lk.clone().addScaledVector(side, 5).add(V(0, -0.3, 0)), look: () => lan[0].position, fov: 46, cut: true });
    await this.wait(4.5); this.guard(id);
    await this.say('NIA', 'Come on. I want to show you something.', { actor: C.nia, dur: 2.4 });
    rise(); lan.forEach(m => { m.removeFromParent(); m.geometry.dispose(); m.material.dispose(); });
    this.exit();
    const offN2 = this.companion(C.nia);
    this.objective('Follow Nia', 'The tower by the west promenade. Its lift goes to the roof.', S.roofLift);
    await this.useOnce({ getPos: () => S.roofLift, radius: 2.8, label: 'Take the lift to the roof' }); this.guard(id);
    offN2();
    await g.hud.fade(1, 0.8); this.guard(id);
    g.state.checkpoint = 'c5_rooftop'; g.state.save(g);
  },

  // ================================================================== THE ROOFTOP
  async beat_c5_rooftop(id) {
    const g = this.game, P = g.player, C = this.cast, Vx = this.vesper, S = Vx.spots;
    g.sky.setMood('night');
    g.crowd.clear(); this.c5People(true);
    this.equip(true, true); P.relaxed = true; g.weapons.locked = true;
    P.setScripted(true); P.placeScripted(S.roofBench.clone().add(V(0, 0, 0.6)), -Math.PI / 2); P.anim.setMode('sit');
    show(C.nia, S.roofBench.clone().add(V(0, 0, -0.6)), -Math.PI / 2); C.nia.activity(null); C.nia.pose('sit');
    g.audio.music.play('night', 3);
    g.hud.fade(0, 2);
    this.enter(true);
    const mid = S.roofBench.clone().add(V(0, 1.1, 0));
    // the view first: Meridian's lights across the dark, walking
    g.director.shot({ pos: mid.clone().add(V(4, 0.8, 0)), look: S.roofLook, fov: 40, cut: true, to: { fov: 34 }, dur: 9 });
    await this.wait(4.5); this.guard(id);
    g.director.shot({ pos: mid.clone().add(V(-3.4, 0.2, 0.4)), look: mid, fov: 36, cut: true, to: { pos: mid.clone().add(V(-2.8, 0.15, 0.3)) }, dur: 40 });
    const L = (who, text, o = {}) => this.say(who, text, { actor: who === 'ROOK' ? { anim: P.anim, pos: P.pos } : C.nia, dur: o.dur ?? Math.max(2, text.length * 0.055), emotion: o.emotion });
    await L('NIA', 'There she is. All of home. From here she looks like a lantern somebody forgot to let go of.');
    await L('ROOK', 'Callow Reach. Stillwater. Sedge Hollow. How many more, do you think?');
    await L('NIA', 'However many it takes to keep two hundred thousand people walking.', { emotion: 'sad' });
    await L('NIA', 'Does either of them deserve it? To keep going, if that\'s the price?');
    const v = await this.choose([{ text: 'No. Not like this.', tone: 'conviction', value: 'no' }, { text: 'I don\'t know. Everyone I love lives on one.', tone: 'torn', value: 'torn' }, { text: 'They deserve the chance to find another way.', tone: 'hope', value: 'chance' }]);
    g.state.choice('c5_deserve', v);
    if (v === 'no') await L('NIA', 'No. I didn\'t think so either.', { emotion: 'sad' });
    if (v === 'torn') await L('NIA', 'That\'s the trap, isn\'t it. Everyone loves somebody up there.', { emotion: 'sad' });
    if (v === 'chance') await L('NIA', 'Sailhaven. Maren\'s kites. Maybe.', { emotion: 'neutral' });
    const R = g.state.rel.nia || {}, trust = (R.trust || 0) + (R.warmth || 0) + (R.spark || 0);
    let kissed = false;
    if (trust >= 4) {
      await this.wait(1);
      await L('NIA', 'Can I tell you something I\'ve never said out loud?');
      await L('NIA', 'Sometimes I imagine just… not going back. Taking the Mule and driving until there\'s no city on the horizon at all. Living somewhere that stays put.', { emotion: 'sad' });
      await L('NIA', 'I always imagined doing it alone. Lately I don\'t.', { emotion: 'neutral' });
      const k = await this.choose([{ text: '(Kiss her.)', tone: 'romance', value: 'kiss' }, { text: '(Take her hand.) I\'m here. Whatever you decide.', tone: 'friendship', value: 'friend' }]);
      g.state.choice('c5_rooftop', k);
      if (k === 'kiss') {
        kissed = true; g.state.flag('kissedNia'); g.state.adjust('nia', 'spark', 2);
        C.nia.lookAt(() => P.char.bones.head.getWorldPosition(V(0, 0, 0))); P.anim.lookTarget = C.nia.head;
        g.director.shot({ pos: mid.clone().add(V(-1.7, 0.15, 0)), look: mid.clone().add(V(0, 0.25, 0)), fov: 30, cut: true });
        await this.wait(1.4);
        g.director.shot({ pos: mid.clone().add(V(6, 2.2, 5)), look: mid, fov: 34, cut: true, to: { pos: mid.clone().add(V(9, 3.2, 8)), fov: 30 }, dur: 8 });
        g.audio.music.play('title', 2);
        await this.wait(4.5);
        await L('NIA', '…Well. That\'s complicated now.', { emotion: 'happy' });
        await L('ROOK', 'Everything\'s complicated now.');
      } else {
        g.state.flag('niaFriend'); g.state.adjust('nia', 'trust', 1);
        await L('NIA', '…Thank you. Really.', { emotion: 'happy' });
      }
    } else {
      await L('NIA', 'I\'m glad it\'s you up here, Runner. Of everyone.', { emotion: 'neutral' });
      g.state.flag('niaFriend');
    }
    g.state.journal(kissed ? 'On a rooftop in Vesper, with Meridian\'s lights across the dark, Nia told me she\'s imagined leaving the Marchers for good. I kissed her.' : 'On a rooftop in Vesper, Nia and I talked about whether either city deserves to keep walking. I don\'t have an answer.');
    await this.radio('TOMAS', 'Rook. We\'re at the embassy. Come down — and bring your manners.', { dur: 3.4 });
    await g.hud.fade(1, 1.6); this.guard(id);
    P.setScripted(false);
    this.exit();
    g.state.checkpoint = 'c5_reception'; g.state.save(g);
  },

  // ================================================================== THE RECEPTION, AND THE ARCHIVE
  async beat_c5_reception(id) {
    const g = this.game, P = g.player, C = this.cast, Vx = this.vesper, S = Vx.spots;
    if (g.sky.mood !== 'night') g.sky.setMood('night');
    this.equip(true, true); P.relaxed = true; g.weapons.locked = true;
    g.crowd.clear();
    // the hall: guests from both cities
    const E = S.embassy, cr = g.crowd; let seed = 5600;
    for (let i = 0; i < 12; i++) cr.spawnSpot({ pos: E.clone().add(V(-12 + (i % 6) * 3.4, 0, -6 + Math.floor(i / 6) * 8 + (Math.random() - 0.5))), yaw: Math.random() * 6, activity: ['talkIdle', 'drink', 'talkIdle'][i % 3] }, seed++, { look: { outfit: i % 2 ? 'engineer' : 'casual', primary: i % 2 ? '#3a3e46' : '#e8e0d0' }, cull: 80 });
    P.teleport(S.hallIn.clone().add(V(0, 0, 4)), Math.PI); g.camera.snapBehind(Math.PI, 0.05);
    this.niaAt(S.hallIn.clone().add(V(1.8, 0, 4.4)), Math.PI);
    show(C.tomas, S.hallIn.clone().add(V(-1.2, 0, -1.6)), 0); C.tomas.activity(null);
    show(C.harrow, E.clone().add(V(-6, 0, -8)), Math.PI / 2); C.harrow.activity('talkIdle');
    show(C.ferrand, E.clone().add(V(-4, 0, -8)), -Math.PI / 2); C.ferrand.activity('talkIdle');
    g.audio.music.play('tension', 3);
    g.hud.fade(0, 1.4);
    this.enter(true);
    C.tomas.lookAtPlayer(); C.tomas.face(P.pos.clone());
    await this.convo(C.tomas, [
      ['TOMAS', 'You came. Good. Stand there, look grateful, say nothing about anything.', { emotion: 'tired' }],
      ['ROOK', 'Tomas. Stillwater. I read the logbook. Harrow\'s name is on it.'],
      ['TOMAS', '…Not here.', { emotion: 'worried' }],
      ['ROOK', 'Did you know?'],
      ['TOMAS', 'I said not here, Rook.', { emotion: 'angry' }],
    ]);
    this.guard(id);
    C.tomas.goTo(E.clone().add(V(-5, 0, -6)), 1.2);
    this.exit();
    const inside = V(S.embassy.x + 12, VS.y, S.embassy.z + 6);
    this.objective('Find out what they\'re really negotiating', 'The archive room off the east side of the hall. Nobody\'s watching the door.', () => P.pos.x < S.embassy.x + 10.4 ? (Math.hypot(P.pos.x - S.archiveDoor.x, P.pos.z - S.archiveDoor.z) > 1.2 && P.pos.x < S.archiveDoor.x ? S.archiveDoor : inside) : S.caseW);
    this.trigger(() => P.pos.distanceTo(S.archiveDoor) < 4, () => this.bark('NIA', 'I\'ll keep them busy. Go.', 2.4, C.nia));
    await this.useOnce({ getPos: () => S.caseW, radius: 2.2, label: 'Open the document case' }); this.guard(id);
    g.audio.ui('radio');
    await this.c5Doc('JOINT STILLNESS PROJECTIONS · MERIDIAN / VESPER · EYES ONLY', [
      'Regional yields, next forty years. Proposed: a shared harvest corridor along the Gray Fork, both cities walking it in turn.',
      'Settlements inside the corridor (Callow Reach, Sedge Hollow II, Tamber, eleven others) to be classified "held".',
      'Stillwater (Trial 7) to serve as the baseline for yield and duration.',
      'Public statements will continue to describe the Stillness as a natural phenomenon of unknown cause.',
      '— initialled: T.H. (Meridian) · L.F. (Vesper)']);
    this.guard(id);
    // and through the doorway, the two of them
    this.enter(true);
    C.harrow.place(S.archiveDoor.clone().add(V(-4, 0, -1)), Math.PI / 2 - 0.3); C.ferrand.place(S.archiveDoor.clone().add(V(-2.6, 0, -2)), -Math.PI / 2 + 0.3);
    C.tomas.place(S.archiveDoor.clone().add(V(-5.5, 0, 1.5)), Math.PI / 2);
    const door = S.archiveDoor.clone().add(V(0.6, 1.6, 0));
    g.director.shot({ pos: door.clone().add(V(2.5, 0.1, -0.6)), look: door.clone().add(V(-4, -0.1, -0.5)), fov: 34, cut: true });
    await this.say('HARROW', '…and the ground people must not learn what the fields are for. Not this decade.', { actor: C.harrow, dur: 4 });
    await this.say('FERRAND', 'Vesper has known for forty years, Commander. We simply never needed to say it aloud.', { actor: C.ferrand, dur: 4.4 });
    await this.say('HARROW', 'Then let\'s keep it that way. Your corridor, my schedule.', { actor: C.harrow, dur: 3 });
    g.director.shot({ ...g.director.closeUp(C.tomas, { dist: 1.4, fov: 32 }), cut: true });
    C.tomas.lookAtPlayer();
    await this.wait(2.2);
    await this.say('TOMAS', '…', { actor: C.tomas, dur: 1.6, emotion: 'sad' });
    g.state.flag('c5Complete'); g.state.flag('sawCorridor');
    g.state.journal('The leaders of both cities have known for decades. A shared "harvest corridor" along the Gray Fork; Callow Reach and eleven other settlements classified "held". Initialled T.H. and L.F. Tomas saw me in the doorway.');
    await g.hud.fade(1, 2); this.guard(id);
    this.exit();
    g.state.checkpoint = 'c5_end'; g.state.save(g);
  },
  c5Doc(title, lines) {
    const g = this.game, el = document.createElement('div'); el.className = 'doc';
    el.innerHTML = `<h3>${title}</h3>${lines.map(l => `<p>${l}</p>`).join('')}<div class="k">[F] close</div>`;
    document.getElementById('ui').appendChild(el);
    const t0 = g.rtime;
    return this.waitFor(() => g.rtime - t0 > 2.5 && (g.input.pressed('use') || g.rtime - t0 > 14 || g.skipAll)).then(() => el.remove(), (e) => { el.remove(); throw e; });
  },

  // ================================================================== END OF THE SLICE
  async beat_c5_end(id) {
    const g = this.game, st = g.state;
    this.enter(true);
    g.audio.music.play('title', 1);
    g.hud.chapterCard('END OF CHAPTER FIVE', 'MARCHLIGHT', 'Chapter Six — The Broken Span — is in development.');
    await this.wait(7); g.hud.hideChapter(); await this.wait(2.4);
    const ch2 = st.flags['choice:c2_charge'], bram = st.rel.bram?.trust ?? 0;
    const lines = [
      ch2 === 'family' ? 'The Okonjos walked out of the greenhouse; Callow Reach faces winter without its flywheel.' : ch2 === 'generator' ? 'Callow Reach kept its power; the Okonjo family is still held.' : null,
      st.has('kissedNia') ? 'On a rooftop in Vesper, you kissed Nia.' : 'You and Nia are closer than you were.',
      bram < 1 ? 'You don\'t trust Bram the way you used to.' : 'Bram still has your trust — just.',
      'You know what the Stillness is. So do the people who run both cities.'].filter(Boolean);
    const el = document.createElement('div'); el.className = 'endcard';
    el.innerHTML = `<h2>CHAPTER FIVE COMPLETE</h2><p>${lines.join('<br>')}</p>
      <p style="color:#8f897c;font-size:14px">Next: <b>Chapter Six — The Broken Span</b>, in development. Your choices have been saved.</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center">${[['c1_title', 'Chapter One'], ['c3_title', 'Chapter Three'], ['c5_title', 'Chapter Five']].map(([b, n]) => `<button class="btn" data-b="${b}">Replay ${n}</button>`).join('')}<button class="btn" data-a="title">Title screen</button></div>`;
    document.getElementById('ui').appendChild(el);
    g.input.unlock();
    el.onclick = (e) => { const d = e.target.dataset || {}; if (d.a === 'title') location.href = location.pathname; if (d.b) location.href = location.pathname + '?beat=' + d.b; };
    await this.waitFor(() => false);
  },
  c5Cleanup() { this.c5Gondola?.(); this.c5Gondola = null; this.lanternFly = false; },
};
