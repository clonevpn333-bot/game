// CHAPTER ONE — UNDERFOOT
// Meridian holds at the edge of the Gray Fork for repairs. Bram and Rook ride the Mule down its line to
// salvage a drive coupler; the ground is beautiful and wrong. A still-field takes Bram; the tether gets
// him out. A dead harvest unit wears the same maker's plate as the Shearer. Rook climbs the old relay,
// spins its mast up, and hears Callow Reach. The hollow breathes out and they run for it. At home Tomas
// orders them not to interfere. That night Rook decides to go back, and Nia decides to drive.
import * as THREE from 'three';
import { show, hide } from './cast.js';
import { buildUnderfoot } from '../world/zone_underfoot.js';
import { Stillness } from '../world/stillness.js';
import { GROUND_Y } from '../world/city.js';
import { G } from '../core/physics.js';
import { clamp, damp, dampAngle, lerp } from '../core/util.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const CH1 = ['c1_title', 'c1_descent', 'c1_fields', 'c1_highway', 'c1_still', 'c1_yard', 'c1_relay', 'c1_escape', 'c1_home', 'c1_night'];

// ------------------------------------------------------------------ the ground, as a place you stand on
export function enterSurface(s) {
  const g = s.game;
  if (!g.stillness) g.stillness = new Stillness(g);
  if (!s.zone) {
    // the city stops with all four feet planted (no leg hanging mid-swing while she rests)
    g.city.walking = false; g.city.phase = 0.015; g.city.speedMul = 1; g.city.bob = 0; g.city.roll = 0; g.city.pitch = 0;
    g.city.update(0, 0);
    s.zone = buildUnderfoot(g);
    s.zone.offs.push(g.ground.addMask(180, 700, -760, -150));
  }
  g.killY = GROUND_Y - 60;
  if (g.ground.settlement) g.ground.settlement.visible = false;
  g.surface = true;
}
export function leaveSurface(s) {
  const g = s.game;
  s.zone?.dispose(); s.zone = null;
  g.stillness?.clear();
  g.city.walking = true; g.killY = -380; g.surface = false;
  if (s.groundMule) { s.groundMule.removeFromParent(); s.groundMule = null; }
}
// where a retry puts Rook for each chapter-one checkpoint
export function c1Spawn(s, cp) {
  const Z = s.zone; if (!Z) return null;
  const S = Z.spots;
  return {
    c1_descent: [V(165, -38, -185), Math.PI / 2], c1_fields: [S.landing, Math.PI * 0.85], c1_highway: [Z.v(308, 0, -338), Math.PI],
    c1_still: [s.game.state.has('c1_bramFreed') ? Z.v(328, 0, -522) : Z.v(318, 0, -514), 2.2], c1_yard: [Z.v(412, 0, -592), 2.1], c1_relay: [Z.v(486, 0, -628), 2.0],
    c1_escape: [S.roof, Math.PI / 2], c1_home: [V(176, -38, -186), Math.PI / 2], c1_night: [V(190, -38, -190), Math.PI / 2],
  }[cp] || null;
}

// the Mule outside the city: a copy of Nia's crawler (the original stays parked on its lift in the bay)
function groundMule(s) {
  if (s.groundMule) return s.groundMule;
  const g = s.game, m = g.districts.lower.mule.clone(true);
  m.name = 'mule:ground'; g.engine.cityRoot.add(m);
  const lift = []; m.traverse(o => { if (o.isMesh && o.material === g.materials.hazard) lift.push(o); }); lift.forEach(o => o.removeFromParent()); // the bay's lift deck stays in the bay
  m.userData.wheels = m.children.filter(c => c.isGroup && Math.abs(c.position.y - 0.32) < 1e-3);
  const seat = (x, z) => { const o = new THREE.Object3D(); o.position.set(x, 1.82, z); m.add(o); return o; };
  m.userData.seatL = seat(-0.55, 1.12); m.userData.seatR = seat(0.6, 1.12); m.userData.cab = seat(-0.45, 0.9);
  m.userData.cab.position.set(-0.45, 1.25, -1.2);
  m.userData.drum = new THREE.Object3D(); m.userData.drum.position.set(0, 2.35, 2.25); m.add(m.userData.drum);
  s.groundMule = m; return m;
}
const worldOf = (o) => o.getWorldPosition(new THREE.Vector3());

// ------------------------------------------------------------------ beats (mixed into the story runner)
export const Chapter1 = {
  // ground height under a point for walking actors (static colliders only)
  groundAt(x, y, z) {
    const hit = this.game.physics.raycast(V(x, y + 1.4, z), V(0, -1, 0), 8, G.STATIC);
    return hit ? hit.point.y : (this.zone ? this.zone.gy(x, z) : y);
  },
  // Bram keeps up with Rook: walks when close, runs when left behind, catches up out of sight if lost
  companion(a, o = {}) {
    const g = this.game, P = g.player, id = this.runId;
    a.frozen = false;
    const off = g.add((dt) => {
      if (id !== this.runId) { off(); return; }
      if (a.frozen || a.mount || a.scripted || g.director.active) return;
      const d = a.pos.distanceTo(P.pos);
      if (d > (o.far ?? 55) && P.state === 'ground') {
        const back = P.pos.clone().addScaledVector(P.forward(), -6); back.y = this.groundAt(back.x, P.pos.y, back.z);
        a.place(back, P.yaw); return;
      }
      if (d > 3.4 || (a.target && d > 2.4)) {
        const dir = a.pos.clone().sub(P.pos).setY(0); if (dir.lengthSq() < 0.01) dir.set(1, 0, 0); dir.normalize();
        const goal = P.pos.clone().addScaledVector(dir, 2.2).add(V(-dir.z, 0, dir.x).multiplyScalar(0.8));
        goal.y = this.groundAt(goal.x, Math.max(a.pos.y, P.pos.y), goal.z);
        a.target = goal; a.speed = d > 12 ? 5.4 : d > 6 ? 3.6 : 1.7;
      } else if (a.target) { a.target = null; a.vel.set(0, 0, 0); }
      if (!a.target) { a.pos.y = damp(a.pos.y, this.groundAt(a.pos.x, a.pos.y, a.pos.z), 8, dt); a.face(P.pos); }
    });
    return off;
  },
  // walking conversation: lines said by whoever, while play goes on; stops if the run changes
  async banter(lines) {
    const id = this.runId;
    for (const L of lines) {
      if (id !== this.runId) return;
      if (typeof L === 'number') { await this.wait(L); continue; }
      const [who, text, opt = {}] = L;
      const a = who === 'ROOK' ? { anim: this.game.player.anim, pos: this.game.player.pos } : this.cast[who.toLowerCase()];
      await this.say(who, text, { ...opt, actor: opt.radio ? null : a });
    }
  },
  c1Arrive(cp, fade = true) {
    const g = this.game, P = g.player, sp = c1Spawn(this, cp);
    if (!sp) return false;
    if (P.pos.distanceTo(sp[0]) > 30 || this.retrying === cp) {
      P.teleport(sp[0].clone(), sp[1]); g.camera.snapBehind(sp[1], 0.05);
      if (fade) g.hud.fade(0, 0.8);
      return true;
    }
    return false;
  },
  bramAt(p, yaw) { const C = this.cast; show(C.bram, p.clone().setY(this.groundAt(p.x, p.y, p.z)), yaw); C.bram.anim.setMode('loco'); C.bram.frozen = false; C.bram.mount = null; C.bram.scripted = false; return C.bram; },

  // ================================================================== CHAPTER CARD
  async beat_c1_title(id) {
    const g = this.game;
    this.enter(true);
    await g.hud.fade(1, 0.4);
    g.audio.music.stop(1);
    g.hud.chapterCard('CHAPTER ONE', 'UNDERFOOT', 'Day two hundred and fifteen. Meridian holds at the edge of the Gray Fork.');
    await this.wait(0.3);
    enterSurface(this);               // build the ground while the card is up
    if (g.sky.mood !== 'day') g.sky.setMood('day');
    await this.wait(5.2);
    g.hud.hideChapter();
    await this.wait(1.6);
    this.exit();
    g.state.chapter = 'chapter1'; g.state.checkpoint = 'c1_descent'; g.state.save(g);
  },

  // ================================================================== THE RUNNER BAY → DOWN THE LINE
  async beat_c1_descent(id) {
    const g = this.game, P = g.player, C = this.cast, L = g.districts.lower, Z = this.zone;
    this.equip(true, true); P.relaxed = true; g.weapons.locked = true;
    this.populateLower();
    this.setBay(1);
    L.mule.visible = true;
    P.teleport(V(165, -38, -185), Math.PI / 2); g.camera.snapBehind(Math.PI / 2, 0.05);
    show(C.bram, V(176.6, -38, -173.2), Math.PI); C.bram.activity('watch');
    show(C.nia, V(183.6, -38, -180.6), -Math.PI / 2); C.nia.activity('type');
    g.hud.fade(0, 1.0);
    g.audio.music.play('morning', 3);
    this.objective('Meet Bram and Nia at the Mule', 'The Runner Bay. The job: one drive coupler from the Grid Forty salvage yard.', () => C.bram.pos);
    await this.radio('TOMAS', 'Runners, Engineering. Harrow\'s given you six hours on the ground. One drive coupler for Leg Two, from the Grid Forty yard. In and out.', { wait: false, dur: 6 });
    await this.useOnce({ getPos: () => C.bram.pos, radius: 2.8, label: 'Talk to Bram' });
    this.guard(id);
    C.bram.activity(null); C.nia.activity(null);
    await this.convo(C.bram, [
      ['BRAM', 'There they are. Ready to see where the floor goes?', { emotion: 'happy', gesture: 0.8 }],
      ['NIA', 'Mule\'s checked. Winch is checked. Winch is… mostly checked.', { emotion: 'neutral' }],
      ['BRAM', 'Mostly.'],
      ['NIA', 'It\'s a three-hundred-metre drop, Bram, "mostly" is a lot of checked.', { emotion: 'amused' }],
    ]);
    const v = await this.pick(C.nia, [
      { text: 'The old relay at Grid Forty — could it still hear the ground band?', tone: 'curious', value: 'relay' },
      { text: 'Let\'s go.', tone: 'plain', value: 'go' },
    ]);
    if (v === 'relay') {
      await this.convo(C.nia, [
        ['NIA', 'If you put power in it. Why?', { emotion: 'surprised' }],
        ['ROOK', 'No reason.'],
        ['NIA', '…That\'s your "there\'s a reason" voice.', { emotion: 'amused' }],
        ['BRAM', 'I didn\'t hear any of that. I\'m old. My ears are mostly checked.'],
      ]);
      g.state.flag('askedRelay'); g.state.adjust('nia', 'trust', 1);
    }
    this.guard(id);
    // board: down the line
    await g.hud.fade(1, 0.8);
    this.guard(id);
    L.mule.visible = false;
    C.nia.place(V(195.5, -38, -187.5), Math.PI / 2); C.nia.activity('watch');
    await this.c1Ride(id);
    g.state.checkpoint = 'c1_fields'; g.state.save(g);
  },
  // the ride down (also used by the retry of the fields beat? no: it always plays from the bay)
  async c1Ride(id) {
    const g = this.game, P = g.player, C = this.cast, Z = this.zone, m = groundMule(this);
    const tip = Z.spots.boomTip, x = tip.x, z = tip.z - 2.25, y0 = tip.y - 5.6, y1 = Z.gy(x, z) + 0.3;
    m.position.set(x, y0, z); m.rotation.set(0, 0, 0); m.visible = true;
    Z.cableLine.sway = 0.2;
    P.setScripted(true); P.anim.speed = 0;
    show(C.bram, worldOf(m.userData.seatR), Math.PI); C.bram.mount = m.userData.seatR; C.bram.mountYaw = Math.PI; C.bram.anim.setMode('loco');
    let k = 0;
    const ride = g.add((dt) => {
      m.updateMatrixWorld(true);
      P.placeScripted(worldOf(m.userData.seatL), Math.PI * 0.9 + Math.sin(g.time * 0.3) * 0.2);
      Z.cableLine.foot.copy(worldOf(m.userData.drum));
      m.rotation.z = Math.sin(g.time * 0.7) * 0.012; m.rotation.x = Math.sin(g.time * 0.5) * 0.01;
    });
    this.enter(true);
    g.director.freeLook = false;
    g.audio.music.play('exterior', 1.5);
    g.windMul = 1.4;
    const tween = (dur, f) => { const t0 = g.time; return this.waitFor(() => { const u = clamp((g.time - t0) / dur, 0, 1); f(u); return u >= 1; }); };
    // 1 · off the boom, Runner Bay behind
    const seatLook = () => worldOf(m.userData.seatL).add(V(0.4, 1.4, 0));
    g.director.shot({ pos: () => m.position.clone().add(V(4.6, 2.2, -3.4)), look: seatLook, fov: 40, cut: true, handheld: 0.5 });
    g.hud.fade(0, 1.0);
    const fall = (u0, u1, dur) => tween(dur, u => { k = lerp(u0, u1, u); m.position.y = lerp(y0, y1, k * k * (3 - 2 * k)); });
    const p1 = fall(0, 0.18, 9);
    await this.say('BRAM', 'Forty years I\'ve looked down at it from the rail. Never once stood on it.', { actor: C.bram, dur: 3.8 });
    await this.say('ROOK', 'Scared?', { actor: { anim: P.anim, pos: P.pos }, dur: 1.4 });
    await this.say('BRAM', 'I\'m sixty-one. Everything scares me. You do it anyway — that\'s the whole trick.', { actor: C.bram, emotion: 'amused', dur: 4 });
    await p1; this.guard(id);
    // 2 · the long way down: the hull face and Leg Two, the Mule a speck on its line
    g.director.shot({ pos: V(330, -215, -128), look: () => m.position.clone().add(V(0, -12, 0)), fov: 32, cut: true, to: { fov: 26 }, dur: 8 });
    const p2 = fall(0.18, 0.62, 8);
    await this.radio('NIA', 'Line\'s paying out clean. You\'re through two hundred. Bram — you promised me a souvenir.', { dur: 4.2 });
    await this.say('BRAM', 'A rock. I\'ll bring you a rock.', { actor: C.bram, dur: 2.2 });
    await this.radio('NIA', 'A good rock.', { dur: 1.4 });
    await p2; this.guard(id);
    // 3 · looking down past the bed at the fields coming up
    g.director.shot({ pos: () => m.position.clone().add(V(-1.4, 4.6, 4.2)), look: () => m.position.clone().add(V(10, -44, -16)), fov: 54, cut: true });
    const p3 = fall(0.62, 0.93, 5.5);
    await this.wait(1.2);
    await this.say('ROOK', '…It\'s green.', { actor: { anim: P.anim, pos: P.pos }, dur: 2 });
    await this.say('BRAM', 'Nobody told us it was green.', { actor: C.bram, dur: 2.4 });
    await p3; this.guard(id);
    // 4 · touchdown, from the grass
    const gp = Z.v(236, 1.4, -172);
    g.director.shot({ pos: gp, look: () => m.position.clone().add(V(0, 1.5, 0)), fov: 38, cut: true });
    await fall(0.93, 1, 2.2); this.guard(id);
    g.audio.clank(m.position, 1.4, 0.5); g.camera.shake(0.2);
    for (let i = 0; i < 18; i++) { const a = Math.random() * 6.28, sp = 2 + Math.random() * 3; g.fx.alpha.spawn({ x: m.position.x + Math.cos(a) * 2, y: m.position.y, z: m.position.z + Math.sin(a) * 3, vx: Math.cos(a) * sp, vy: 0.4 + Math.random(), vz: Math.sin(a) * sp, life: 3, s0: 0.6, s1: 3, c0: [0.62, 0.58, 0.48, 0.45], c1: [0.62, 0.58, 0.48, 0], drag: 1.2 }); }
    await this.wait(1.4);
    // the line goes slack; they step down
    ride();
    Z.cableLine.foot.copy(Z.spots.cableFoot); Z.cableLine.sway = 0.6;
    await g.hud.fade(1, 0.5); this.guard(id);
    C.bram.mount = null;
    const L = Z.spots.landing;
    P.setScripted(false); P.teleport(L.clone(), Math.PI * 0.85); g.camera.snapBehind(Math.PI * 0.85, 0.02);
    this.bramAt(L.clone().add(V(2.2, 0, 0.6)), Math.PI * 0.8);
    g.windMul = 0.5;
    this.exit();
    g.hud.fade(0, 1.2);
    g.audio.music.play('ruins', 3);
    g.hud.location('UNDERFOOT', 'GRID 40 · BELOW LEG TWO', 5);
    g.state.journal('Day 215. Meridian is holding at the edge of the Gray Fork. Bram and I rode the Mule down for a drive coupler. The ground is green. Nobody told us.');
  },

  // ================================================================== THE FIELDS
  async beat_c1_fields(id) {
    const g = this.game, P = g.player, Z = this.zone, C = this.cast;
    this.c1Arrive('c1_fields');
    this.equip(true, true); P.relaxed = true; g.weapons.locked = false;
    if (C.bram.hidden || C.bram.pos.distanceTo(P.pos) > 20) this.bramAt(P.pos.clone().add(V(2, 0, 1)), P.yaw);
    const m = groundMule(this); m.position.copy(Z.spots.mulePark).add(V(0, 0.3, 0)); m.rotation.set(0, 0.4, 0); m.visible = true;
    if (!g.audio.music.cue || g.audio.music.cue !== 'ruins') g.audio.music.play('ruins', 3);
    const offB = this.companion(C.bram);
    const ramp = Z.v(308, 0, -338);
    this.objective('Head for the old highway', 'The salvage yard is past it, to the south-east.', ramp);
    g.hud.hint('move');
    this.banter([2.5,
      ['BRAM', 'Look at that. It doesn\'t move. The floor just… stays.', { dur: 3.4 }], 0.6,
      ['ROOK', 'You\'ll get used to it.', { dur: 1.8 }], 0.4,
      ['BRAM', 'I hope not.', { dur: 1.6, emotion: 'happy' }],
    ]);
    this.trigger(() => P.pos.distanceTo(Z.v(285, 0, -262)) < 16, () => this.banter([
      ['BRAM', 'Somebody\'s tractor. Somebody\'s field. They left the gate open.', { dur: 3.6 }], 0.8,
      ['BRAM', 'Like they were coming back after lunch.', { dur: 2.6, emotion: 'sad' }],
    ]));
    this.trigger(() => P.pos.z < -290, () => this.banter([
      ['NIA', 'How\'s the ground?', { radio: true, dur: 1.6 }],
      ['ROOK', 'Quiet.', { radio: true, dur: 1.2 }],
      ['NIA', 'I don\'t like that word down there.', { radio: true, dur: 2.4 }],
    ]));
    await this.waitFor(() => P.pos.distanceTo(ramp) < 9 || P.pos.z < -345);
    this.guard(id);
    offB();
    g.state.checkpoint = 'c1_highway'; g.state.save(g);
  },

  // ================================================================== THE HIGHWAY (the last traffic jam)
  async beat_c1_highway(id) {
    const g = this.game, P = g.player, Z = this.zone, C = this.cast, HW = Z.HW;
    if (this.c1Arrive('c1_highway')) this.bramAt(P.pos.clone().add(V(2, 0, 2)), P.yaw);
    if (C.bram.hidden) this.bramAt(P.pos.clone().add(V(2, 0, 2)), P.yaw);
    this.equip(true, true); P.relaxed = false; g.weapons.locked = false;
    groundMule(this).visible = true;
    const offB = this.companion(C.bram);
    const deckY = (z) => Z.gy(HW.x, z) + HW.y;
    this.objective('Follow the highway south', 'Up the ramp. The yard is past the far end.', () => P.pos.z > -380 ? V(HW.x, deckY(-382), -382) : V(HW.x - 2, deckY(-450), -450));
    this.trigger(() => P.pos.z < -390, () => this.banter([
      ['BRAM', 'Everybody left at once. Look at them. All facing the same way.', { dur: 3.6 }], 1,
      ['ROOK', 'Away from something.', { dur: 1.8 }],
    ]));
    this.trigger(() => P.pos.z < -420, () => this.bark('BRAM', 'Mind the gap. …I mean it. I\'m not carrying you home.', 3.4, C.bram));
    await this.waitFor(() => P.pos.z < -442);
    this.guard(id);
    // gnats nesting in the bus
    this.objective('Gnats', 'Shoot them down. Stay off the open deck.', null);
    g.audio.music.play('combat', 1.2);
    const nest = V(HW.x + 4, deckY(-462) + 3, -462);
    for (const d of [V(-2, 2, 0), V(2, 3, -3), V(0, 4, 3)]) g.enemies.spawn('gnat', nest.clone().add(d), { alwaysAware: true });
    this.bark('BRAM', 'Gnats! In the bus — get down!', 2.6, C.bram);
    g.hud.hint('shoot');
    C.bram.scripted = true; C.bram.goTo(V(HW.x - 5.5, deckY(-446), -446), 4.2);
    await this.waitFor(() => g.enemies.alive.length === 0);
    this.guard(id);
    C.bram.scripted = false;
    g.audio.music.play('ruins', 4);
    await this.wait(1.2);
    this.banter([['BRAM', 'They nest in anything with a roof. That bus has been their house longer than you\'ve been alive.', { dur: 4.6 }]]);
    this.objective('Follow the highway south', 'Down the broken end into the hollow.', Z.v(HW.x, 0, -524));
    await this.waitFor(() => P.pos.z < -512 && P.pos.y < deckY(-500) - 3);
    this.guard(id);
    offB();
    g.state.checkpoint = 'c1_still'; g.state.save(g);
  },

  // ================================================================== THE HOLLOW (a still-field)
  async beat_c1_still(id) {
    const g = this.game, P = g.player, Z = this.zone, C = this.cast, ST = g.stillness;
    const C0 = V(326, 0, -528), C1 = V(404, 0, -588), dir = C1.clone().sub(C0).normalize(), along = (t) => Z.v(C0.x + dir.x * t, 0, C0.z + dir.z * t);
    const tOf = (p) => p.clone().sub(C0).dot(dir);
    this.c1Arrive('c1_still');
    this.equip(true, true); P.relaxed = false; g.weapons.locked = false;
    ST.clear();
    const F = ST.add({ pos: Z.spots.stillCentre.clone(), r: Z.stillR, base: 0.45, pulse: 0.47, period: 7 });
    const domeTick = g.add(() => { const k = ST.strength(F); Z.dome.scale.setScalar(F.r); Z.dome.material.opacity = 0.03 + k * 0.1; });
    const cleanup = () => { domeTick(); };
    this.c1StillCleanup = cleanup;
    const freed = g.state.has('c1_bramFreed');
    if (!freed) {
      if (C.bram.hidden || C.bram.pos.distanceTo(P.pos) > 25) this.bramAt(P.pos.clone().add(V(2, 0, 2)), P.yaw);
      // Bram walks in ahead, curious
      this.objective('Follow Bram', '', () => C.bram.pos);
      g.audio.music.play('stillness', 3);
      C.bram.scripted = true; C.bram.stop();
      await C.bram.goTo(along(6), 1.5); this.guard(id);
      await this.say('BRAM', 'Huh. Look at the dust. It\'s not falling.', { actor: C.bram, dur: 2.8 });
      await this.say('ROOK', 'Bram. Wait—', { actor: { anim: P.anim, pos: P.pos }, dur: 1.4, wait: false });
      // he walks on until the field breathes in around him
      const stopAt = along(29);
      C.bram.goTo(stopAt, 1.2);
      await this.waitFor(() => C.bram.pos.distanceTo(stopAt) < 0.5 || (tOf(C.bram.pos) > 25 && ST.strength(F) > 0.75));
      this.guard(id);
      C.bram.stop(); C.bram.frozen = true; C.bram.anim.setMode('freeze');
      g.audio.duck(0.15, 0.6);
      this.enter(true);
      const bp = C.bram.pos.clone().add(V(0, 1.4, 0));
      g.director.shot({ pos: g.director.frame(bp, [V(3.4, 0.6, 2.6), V(-3.4, 0.6, 2.6), V(2.6, 0.5, -3.4)]), look: bp, fov: 36, cut: true, to: { fov: 30 }, dur: 3 });
      await this.wait(2.6); this.guard(id);
      await this.say('ROOK', 'Bram? …Bram!', { actor: { anim: P.anim, pos: P.pos }, dur: 2 });
      this.exit();
      g.audio.duck(1, 1);
      // get him out: there's a wind pump at the mouth of the hollow, still turning
      const W = Z.windmill;
      this.objective('Get Bram out of the Stillness', 'Take the wind pump\'s spin [E], then throw it into Bram [Q]. Momentum is the one thing the field can\'t hold.', () => g.tether.cells > 0 ? C.bram.pos.clone().add(V(0, 1.2, 0)) : W.pos);
      g.hud.hint('capture', true);
      const offW = g.tether.register({ kind: 'machine', label: 'Wind pump', captureOnly: true, noLos: true, big: true, radius: 2, range: 60, getPos: () => W.pos.clone(), getVel: () => V(0, W.spin * 2, 0),
        capture: (dt) => { W.spin = Math.max(0.05, W.spin - dt * 1.2); return 700 * dt * clamp(W.spin, 0.2, 2.2); }, push: () => {} });
      let pushed = false;
      const offBram = g.tether.register({ kind: 'special', label: 'Bram', releaseOnly: true, noLos: true, priority: 4, radius: 0.9, range: 60, enabled: () => C.bram.frozen,
        getPos: () => C.bram.pos.clone().add(V(0, 1.1, 0)), getVel: () => V(), capture: () => 0, push: (imp, cells) => { if (cells >= 1) pushed = true; } });
      this.trigger(() => g.tether.cells > 0, () => { g.hud.hint('release', true); this.bark('ROOK', 'Hang on, Bram.', 2); });
      await this.waitFor(() => pushed); this.guard(id);
      offW(); offBram();
      // the shove carries him clean through — momentum is the one thing it can't take
      g.fx.kineticBurst(C.bram.pos.clone().add(V(0, 1, 0)), 1.2); g.audio.clank(C.bram.pos, 1, 0.4);
      this.enter(true);
      const out = along(84), from = C.bram.pos.clone();
      g.director.shot({ pos: g.director.frame(SCmid(Z), [V(0, 12, 26).applyAxisAngle(V(0, 1, 0), Math.atan2(dir.x, dir.z) + Math.PI / 2), V(0, 12, -26).applyAxisAngle(V(0, 1, 0), Math.atan2(dir.x, dir.z) + Math.PI / 2)]), look: () => C.bram.pos.clone().add(V(0, 1, 0)), fov: 42, cut: true });
      const t0 = g.time;
      await this.waitFor(() => { const u = clamp((g.time - t0) / 2.6, 0, 1), e = 1 - (1 - u) * (1 - u); const p = from.clone().lerp(out, e); p.y = this.groundAt(p.x, p.y + 1, p.z); C.bram.place(p, C.bram.yaw); return u >= 1; });
      this.guard(id);
      C.bram.frozen = false; C.bram.anim.setMode('loco'); C.bram.anim.setEmotion('surprised');
      g.state.flag('c1_bramFreed'); g.state.save(g);
      await this.wait(0.6);
      g.director.shot({ ...g.director.twoShot(C.bram, { pos: C.bram.pos.clone().addScaledVector(dir, -3) }, { dist: 3.4, height: 1.5, fov: 36 }), cut: true });
      await this.say('BRAM', '…How long was I—', { actor: C.bram, dur: 2, emotion: 'surprised' });
      await this.radio('ROOK', 'Too long.', { dur: 1.4 });
      await this.say('BRAM', 'It felt like a word I couldn\'t finish.', { actor: C.bram, dur: 3, emotion: 'sad' });
      this.exit();
      g.state.journal('There was a still-field in the hollow at Grid Forty. It took Bram mid-step. The tether got him out: momentum is the one thing it can\'t hold.');
    } else {
      this.bramAt(along(84), Math.atan2(-dir.x, -dir.z));
      g.audio.music.play('stillness', 2);
    }
    // now Rook crosses
    C.bram.scripted = true; C.bram.face(P.pos);
    this.objective('Cross the hollow', 'Keep moving. Go when the field breathes out — and a kinetic leap [Space in the air] always fires.', () => C.bram.pos);
    g.hud.hint('still', true);
    let wasStrong = ST.strength(F) > 0.6, lastCall = -9;
    const caller = g.add(() => {
      const k = ST.strength(F), strong = k > 0.6, inside = tOf(P.pos) > 18 && tOf(P.pos) < 80;
      if (strong !== wasStrong && g.time - lastCall > 2.5 && (inside || tOf(P.pos) < 18)) { lastCall = g.time; this.bark('BRAM', strong ? (inside ? 'Hold on — keep moving, keep moving!' : 'Wait… wait for it…') : 'Now! It\'s breathing out — go!', 2.2, C.bram); }
      wasStrong = strong;
    });
    await this.waitFor(() => tOf(P.pos) > 78 && !P.dead);
    this.guard(id);
    caller();
    C.bram.scripted = false;
    await this.say('BRAM', 'There. See? You just have to not stop.', { actor: C.bram, dur: 2.6, emotion: 'happy' });
    g.audio.music.play('ruins', 4);
    g.state.checkpoint = 'c1_yard'; g.state.save(g);
  },

  // ================================================================== THE SALVAGE YARD
  async beat_c1_yard(id) {
    const g = this.game, P = g.player, Z = this.zone, C = this.cast;
    if (this.c1Arrive('c1_yard') || C.bram.hidden) this.bramAt(P.pos.clone().add(V(2, 0, 2)), P.yaw);
    this.equip(true, true); P.relaxed = false; g.weapons.locked = false;
    this.c1StillCleanup?.(); g.stillness.clear();
    Z.dome.material.opacity = 0.05;
    const offB = this.companion(C.bram);
    this.objective('Reach the salvage yard', 'A harvester carcass, somewhere among the containers.', Z.spots.yard);
    await this.waitFor(() => P.pos.distanceTo(Z.spots.yard) < 38);
    this.guard(id);
    // the yard's tenants
    const E = Z.spots.yardEnemies;
    g.enemies.spawn('leech', E[0], { alwaysAware: true }); g.enemies.spawn('leech', E[1], { alwaysAware: true });
    for (const p of E.slice(2)) g.enemies.spawn('gnat', p.clone().add(V(0, 3, 0)), { alwaysAware: true });
    g.audio.music.play('combat', 1);
    this.objective('Clear the salvage yard', 'Leeches lunge — keep your distance, or throw them away with the tether [Q].', null);
    this.bark('BRAM', 'Leeches! Don\'t let them latch on!', 2.6, C.bram);
    offB(); C.bram.scripted = true; C.bram.goTo(V(434, this.groundAt(434, Z.gy(434, -604), -604), -604), 4.2);
    await this.waitFor(() => g.enemies.alive.length === 0);
    this.guard(id);
    C.bram.scripted = false;
    const offB2 = this.companion(C.bram);
    g.audio.music.play('ruins', 4);
    await this.wait(1);
    // the harvester carcass
    const H = Z.spots.husk;
    this.objective('Salvage the drive coupler', 'From the harvester carcass.', H.clone().add(V(0, 1.4, 0)));
    await this.useOnce({ getPos: () => H.clone().add(V(0, 1.2, 0)), radius: 3.6, label: 'Salvage the coupler' });
    this.guard(id);
    offB2();
    this.enter(true);
    const look = H.clone().add(V(0, 1.4, 0));
    const fromP = g.director.frame(look, [V(3.6, 1.2, 2.4), V(-3.6, 1.2, 2.4), V(2.4, 1.2, -3.6)]);
    g.director.shot({ pos: fromP, look, fov: 40, cut: true });
    this.playerFace(H);
    g.audio.metalStress(H, 0.8); await this.wait(0.8); g.audio.clank(H, 1.4, 0.7); g.fx.sparks(look, V(0, 1, 0), 18, 4);
    await this.wait(0.9);
    // the plate
    const plate = findPlate(Z.husk);
    if (plate) { const pp = worldOf(plate), n = V(0, 0, 1).applyQuaternion(plate.getWorldQuaternion(new THREE.Quaternion())); g.director.shot({ pos: pp.clone().addScaledVector(n, 1.1).add(V(0, 0.15, 0)), look: pp, fov: 30, cut: true, to: { pos: pp.clone().addScaledVector(n, 0.8) }, dur: 4 }); }
    await this.say('ROOK', '"Meridian Engineering. Harvest Service. H-3."', { actor: { anim: P.anim, pos: P.pos }, dur: 3.4 });
    show(C.bram, P.pos.clone().add(V(-1.6, 0, 1.2)).setY(this.groundAt(P.pos.x - 1.6, P.pos.y, P.pos.z + 1.2)), 0); C.bram.face(H);
    g.director.shot({ ...g.director.twoShot({ pos: P.pos, char: P.char }, C.bram, { dist: 3.2, height: 1.5, fov: 38 }), cut: true });
    await this.say('BRAM', 'H-… That\'s the same as yesterday. The thing on Pylon Seven.', { actor: C.bram, dur: 3.4, emotion: 'worried' });
    await this.say('ROOK', 'That one was H-7.', { actor: { anim: P.anim, pos: P.pos }, dur: 1.8 });
    await this.say('BRAM', 'We built those? We put those on the ground?', { actor: C.bram, dur: 2.8, emotion: 'surprised' });
    await this.say('ROOK', 'Or someone wants us to think we did.', { actor: { anim: P.anim, pos: P.pos }, dur: 2.4 });
    g.state.flag('sawH3');
    g.state.journal('The drive coupler came out of a dead harvest unit in the Grid Forty yard. Its plate: MERIDIAN ENGINEERING · HARVEST SERVICE · H-3. The Shearer was H-7.');
    // the relay
    const B = Z.B, top = V(B.x + 3, Z.relay.top + 22, B.z - 3);
    g.director.shot({ pos: P.pos.clone().add(V(-2.2, 1.7, 2.6)), look: top, fov: 40, cut: true, to: { fov: 34 }, dur: 4 });
    await this.say('ROOK', 'That\'s the old Grid Forty relay. If the mast still has a receiver, it can hear the Callow band.', { actor: { anim: P.anim, pos: P.pos }, dur: 4.2 });
    await this.say('BRAM', 'Harrow said in and out.', { actor: C.bram, dur: 1.8 });
    const v = await this.pick(C.bram, [
      { text: 'I need to know, Bram.', tone: 'honest', value: 'need' },
      { text: 'Ten minutes. That\'s all.', tone: 'bargain', value: 'ten' },
    ]);
    if (v === 'need') { await this.convo(C.bram, [['BRAM', '…Yeah. I know you do.', { emotion: 'sad' }]]); g.state.adjust('bram', 'trust', 1); }
    else await this.convo(C.bram, [['BRAM', 'You said that about the honey knots.', { emotion: 'amused' }]]);
    await this.convo(C.bram, [
      ['BRAM', 'My knees and that tower are not going to be friends. Go. I\'ll walk back for the Mule and bring her round by the old road.'],
      ['BRAM', 'East side. Twenty minutes. Don\'t make me come up there.', { emotion: 'happy' }],
    ]);
    this.exit();
    C.bram.scripted = true; C.bram.goTo(V(430, this.groundAt(430, Z.gy(430, -580), -580), -580), 1.6).then(() => { if (C.bram.pos.distanceTo(g.player.pos) > 30) hide(C.bram); });
    g.state.checkpoint = 'c1_relay'; g.state.save(g);
  },

  // ================================================================== THE RELAY
  async beat_c1_relay(id) {
    const g = this.game, P = g.player, Z = this.zone, C = this.cast, B = Z.B;
    this.c1Arrive('c1_relay');
    this.equip(true, true); P.relaxed = false; g.weapons.locked = false;
    if (C.bram.pos.distanceTo(P.pos) < 30 && !C.bram.hidden) C.bram.goTo(V(430, Z.gy(430, -580), -580), 1.6).then(() => hide(C.bram)); else hide(C.bram);
    Z.mastLamp.material.color.setRGB(0.3, 0.05, 0.03); Z.dynLamp.material.color.setRGB(0.4, 0.05, 0.03);
    const foot = Z.spots.towerFoot, f2 = V(B.x - B.w / 2 + 3, Z.relay.levels[2], -660);
    // waypoints: the tower's foot, up its back to the second floor, then flight by flight to the roof
    const R = Z.relay, inB = () => Math.abs(P.pos.x - B.x) < B.w / 2 && Math.abs(P.pos.z - B.z) < B.d / 2;
    const climbTo = () => {
      if (!inB() || P.pos.y < R.levels[2] - 1) return P.pos.y < foot.y + 1.2 && P.pos.distanceTo(foot) > 10 ? foot : f2;
      const f = clamp(Math.floor((P.pos.y - R.levels[0] + 0.3) / R.FH), 2, R.levels.length - 2), fl = R.flight(f), lv = R.levels[f];
      const start = V(fl.x, lv, fl.from);
      return P.pos.y < lv + 0.4 && Math.hypot(P.pos.x - start.x, P.pos.z - start.z) > 1.4 ? start : V(fl.x, R.levels[f + 1], fl.to);
    };
    this.objective('Climb to the relay mast', 'Up the fallen tower and in at the second floor, then the stairs to the roof.', climbTo);
    this.banter([3,
      ['NIA', 'Bram says you\'re climbing a building that fell over.', { radio: true, dur: 3 }],
      ['ROOK', 'Half of one.', { radio: true, dur: 1.4 }],
      ['NIA', 'Which half?', { radio: true, dur: 1.4 }], 0.5,
      ['ROOK', 'The half that\'s still up.', { radio: true, dur: 2 }],
    ]);
    await this.waitFor(() => P.pos.y > Z.relay.top - 0.6 && Math.abs(P.pos.x - B.x) < B.w / 2 && Math.abs(P.pos.z - B.z) < B.d / 2);
    this.guard(id);
    g.state.checkpoint = 'c1_relay'; g.state.save(g);
    // dead dynamo; a turbine next door is still turning
    const T = Z.turbine;
    await this.radio('NIA', 'Okay. The mast\'s dynamo is dead — it needs a spin to wake. Find something turning.', { wait: false, dur: 4.2 });
    this.objective('Power the relay mast', 'Take the wind turbine\'s spin [E], then throw it into the mast\'s dynamo [Q].', () => g.tether.cells > 0 ? Z.dynamo : T.pos);
    let lit = false;
    const offT = g.tether.register({ kind: 'machine', label: 'Wind turbine', captureOnly: true, noLos: true, big: true, radius: 3, range: 70, getPos: () => T.pos.clone(), getVel: () => V(0, T.spin * 3, 0),
      capture: (dt) => { T.spin = Math.max(0.05, T.spin - dt * 0.9); return 800 * dt * clamp(T.spin, 0.25, 1.6); }, push: () => {} });
    const offD = g.tether.register({ kind: 'special', label: 'Dynamo', releaseOnly: true, noLos: true, priority: 4, radius: 0.8, getPos: () => Z.dynamo.clone(), getVel: () => V(), capture: () => 0, enabled: () => !lit,
      push: (imp, cells) => { if (cells < 1) return; lit = true; g.audio.clank(Z.dynamo, 2, 0.8); g.fx.sparks(Z.dynamo, V(0, 1, 0), 26, 5); g.fx.kineticBurst(Z.dynamo, 1); g.camera.shake(0.2); } });
    await this.waitFor(() => lit); this.guard(id);
    offT(); offD();
    Z.dynLamp.material.color.setRGB(0.4, 4, 0.8);
    // the mast wakes, light climbs it, and the receiver finds the band
    this.enter(true);
    const mast = V(B.x + 3, Z.relay.top, B.z - 3);
    g.director.shot({ pos: mast.clone().add(V(-14, 4, 12)), look: mast.clone().add(V(0, 12, 0)), fov: 40, cut: true, to: { look: mast.clone().add(V(0, 22, 0)), fov: 34 }, dur: 4.5 });
    g.audio.music.stop(2);
    for (let i = 0; i < 6; i++) { await this.wait(0.35); g.audio.ui('tick'); }
    Z.mastLamp.material.color.setRGB(0.4, 4, 0.8);
    g.audio.ui('radio'); await this.wait(1.4); this.guard(id);
    // Rook listens: close on Rook, the mast behind
    P.anim.lookTarget = mast.clone().add(V(0, 20, 0));
    const lk = P.pos.clone().add(V(0, 1.55, 0));
    g.director.shot({ pos: g.director.frame(lk, [V(1.8, 0.2, 1.6), V(-1.8, 0.2, 1.6), V(1.6, 0.2, -1.8)]), look: lk, fov: 34, cut: true, to: { fov: 28 }, dur: 20 });
    g.audio.music.play('signal', 4);
    const T0 = 'CALLOW REACH';
    await this.radio(T0, '—any Marcher. Any city on this band. This is Callow Reach, Grid Forty-One.', { dur: 4.4 });
    await this.radio(T0, 'There are forty-three of us. Eleven children. We have water. We have food. We have no way out.', { dur: 5.2 });
    await this.radio(T0, 'The fields are going still again. It\'s worse every time one of you walks past.', { dur: 4.4 });
    await this.radio(T0, 'If you can hear this — please. Don\'t come closer. Or come and get us. I don\'t know which to ask for any more.', { dur: 6 });
    await this.radio(T0, 'This is Imani Osei, Callow Reach. Repeating.', { dur: 3.4 });
    this.guard(id);
    P.anim.setEmotion('worried');
    await this.radio('ROOK', 'Nia. Are you getting this?', { dur: 2 });
    await this.radio('NIA', '…It\'s on a loop. The timestamp says it was recorded nine days ago.', { dur: 3.6 });
    await this.radio('ROOK', 'Nineteen years empty.', { dur: 2 });
    g.state.flag('heardImani'); g.state.meet('Imani Osei', 'Her voice, on a loop from Callow Reach: forty-three people, eleven children, no way out.');
    g.state.journal('The Grid Forty relay still hears the Callow band. A woman called Imani Osei: forty-three people, eleven children. "It\'s worse every time one of you walks past." Recorded nine days ago.');
    this.exit();
    g.state.checkpoint = 'c1_escape'; g.state.save(g);
  },

  // ================================================================== THE HOLLOW BREATHES OUT
  async beat_c1_escape(id) {
    const g = this.game, P = g.player, Z = this.zone, C = this.cast, ST = g.stillness;
    this.c1Arrive('c1_escape');
    this.equip(true, true); P.relaxed = false; g.weapons.locked = false;
    Z.mastLamp.material.color.setRGB(0.4, 4, 0.8); Z.dynLamp.material.color.setRGB(0.4, 4, 0.8);
    ST.clear();
    // the Mule, waiting under the east face with its winch line out
    const m = groundMule(this), mp = Z.spots.pickup;
    m.position.copy(mp).add(V(0, 0.3, 0)); m.rotation.set(0, Math.PI * 0.95, 0); m.visible = true; m.updateMatrixWorld(true);
    show(C.bram, worldOf(m.userData.cab), Math.PI * 0.95); C.bram.mount = m.userData.cab; C.bram.mountYaw = 0; C.bram.anim.setMode('sit'); C.bram.scripted = true;
    // the field wakes and grows
    const F = ST.add({ pos: Z.spots.stillCentre.clone(), r: Z.stillR, base: 0.86, pulse: 0.1, period: 3, grow: 0, maxR: 300 });
    const domeTick = g.add(() => { Z.dome.scale.setScalar(F.r); Z.dome.material.opacity = 0.05 + ST.strength(F) * 0.06; });
    this.enter(true);
    const SC = Z.spots.stillCentre;
    g.director.shot({ pos: P.pos.clone().add(V(2, 3.2, 3)), look: SC.clone().add(V(0, 10, 0)), fov: 36, cut: true, to: { fov: 30 }, dur: 5 });
    g.audio.duck(0.4, 1);
    await this.radio('BRAM', 'Rook! The hollow — it\'s coming this way!', { dur: 2.6 });
    F.grow = 9;
    g.audio.music.play('rescue', 1);
    await this.wait(1.6); this.guard(id);
    g.director.shot({ pos: g.director.frame(m.position.clone().add(V(0, 2, 0)), [V(-8, 4, -8), V(8, 4, -8)]), look: () => m.position.clone().add(V(0, 1.5, 0)), fov: 42, cut: true });
    await this.radio('BRAM', 'I\'m under you, east side! Get on the line — I\'m not leaving without you!', { dur: 3.2 });
    this.exit();
    g.audio.duck(1, 1);
    const offA = g.tether.registerAnchor({ label: 'Mule winch', getPoint: () => worldOf(m.userData.drum).add(V(0, 0.8, 0)), getVelocity: () => V() });
    this.objective('Get to the Mule', 'Latch onto its winch line [F] — or run for it. Don\'t let the field catch you.', () => worldOf(m.userData.drum));
    g.hud.hint('latch', true);
    await this.waitFor(() => P.pos.distanceTo(worldOf(m.userData.drum)) < 4.2 || (P.state === 'latch' && P.pos.distanceTo(worldOf(m.userData.drum)) < 6));
    this.guard(id);
    offA(); if (P.state === 'latch') P.endLatch(false);
    // on the bed, and away
    this.enter(true);
    P.setScripted(true);
    const ride = g.add(() => { m.updateMatrixWorld(true); P.placeScripted(worldOf(m.userData.seatL), m.rotation.y + Math.PI); });
    C.bram.anim.setMode('sit');
    const path = [mp, Z.v(560, 0, -600), Z.v(480, 0, -560), Z.v(420, 0, -470), Z.v(360, 0, -380), Z.v(300, 0, -300), Z.v(250, 0, -232), Z.v(Z.spots.boomTip.x, 0, Z.spots.boomTip.z - 2.25)];
    let seg = 0, sp = 0;
    const drive = g.add((dt) => {
      if (seg >= path.length - 1) return;
      sp = Math.min(19, sp + dt * 8);
      const to = path[seg + 1], d = to.clone().sub(m.position).setY(0), L = d.length();
      if (L < 3) { seg++; return; }
      d.normalize(); m.position.addScaledVector(d, sp * dt); m.position.y = damp(m.position.y, Z.gy(m.position.x, m.position.z) + 0.3, 10, dt);
      m.rotation.y = dampAngle(m.rotation.y, Math.atan2(d.x, d.z), 3, dt); m.rotation.z = Math.sin(g.time * 9) * 0.02;
      for (const w of m.userData.wheels) w.rotation.x += sp * dt / 0.62;
      if (Math.random() < 0.5) g.fx.alpha.spawn({ x: m.position.x, y: m.position.y + 0.2, z: m.position.z, vx: (Math.random() - 0.5) * 2, vy: 0.6, vz: (Math.random() - 0.5) * 2, life: 2, s0: 0.5, s1: 2.4, c0: [0.62, 0.58, 0.48, 0.35], c1: [0.62, 0.58, 0.48, 0], drag: 1 });
    });
    F.grow = 12;
    g.director.shot({ pos: () => m.position.clone().add(V(0, 0, 0)).add(new THREE.Vector3(-7, 3.2, -9).applyAxisAngle(V(0, 1, 0), m.rotation.y)), look: () => m.position.clone().add(V(0, 1.4, 0)), fov: 46, cut: true });
    await this.say('BRAM', 'Hold onto something!', { actor: C.bram, dur: 1.8 });
    await this.wait(2.5); this.guard(id);
    // the field rolling over the land behind them
    g.director.shot({ pos: () => m.position.clone().add(V(0, 26, 0)).add(new THREE.Vector3(0, 0, 30).applyAxisAngle(V(0, 1, 0), m.rotation.y)), look: () => m.position.clone().lerp(SC, 0.35), fov: 50, cut: true });
    await this.radio('NIA', 'I\'ve got you on the line — Bram, hook on, I\'ll pull you the second you\'re clipped!', { dur: 3.6 });
    await this.wait(2.5); this.guard(id);
    await this.waitFor(() => seg >= path.length - 1 || m.position.distanceTo(path[path.length - 1]) < 4); this.guard(id);
    drive();
    // clip on, and up
    Z.cableLine.foot.copy(worldOf(m.userData.drum)); Z.cableLine.sway = 0.15;
    g.audio.clank(m.position, 1.6, 0.6);
    const y0 = m.position.y, t0 = g.time;
    const lift = g.add(() => { const u = clamp((g.time - t0) / 14, 0, 1); m.position.y = y0 + 80 * u * u; m.updateMatrixWorld(true); Z.cableLine.foot.copy(worldOf(m.userData.drum)); });
    g.director.shot({ pos: Z.v(258, 3, -150), look: () => m.position.clone().add(V(0, 2, 0)), fov: 30, cut: true, to: { fov: 24 }, dur: 8 });
    await this.wait(2.4);
    F.grow = 30;
    await this.wait(3.4); this.guard(id);
    g.director.shot({ pos: () => m.position.clone().add(V(6, 3.5, -5)), look: () => m.position.clone().add(V(40, -30, -60)), fov: 48, cut: true });
    await this.say('BRAM', '…Look at it. It just stops. At the edge of the grass.', { actor: C.bram, dur: 3.4, emotion: 'worried' });
    await this.say('ROOK', 'It stopped because we stopped walking.', { actor: { anim: P.anim, pos: P.pos }, dur: 2.8 });
    await this.say('BRAM', 'You don\'t know that.', { actor: C.bram, dur: 1.8 });
    await this.say('ROOK', 'She did. "It\'s worse every time one of you walks past."', { actor: { anim: P.anim, pos: P.pos }, dur: 3.6 });
    await g.hud.fade(1, 1.4); this.guard(id);
    lift(); ride(); domeTick();
    P.setScripted(false);
    F.grow = 0; ST.clear();
    C.bram.mount = null; C.bram.scripted = false;
    m.visible = false;
    g.audio.music.stop(2);
    this.exit();
    g.state.checkpoint = 'c1_home'; g.state.save(g);
  },

  // ================================================================== HOME: TOMAS
  async beat_c1_home(id) {
    const g = this.game, P = g.player, C = this.cast, L = g.districts.lower;
    this.equip(true, true); P.relaxed = true; g.weapons.locked = true;
    g.stillness.clear(); g.hud.setObjective(null);
    L.mule.visible = true; this.setBay(1);
    g.crowd.clear(); this.populateLower();
    P.teleport(V(176, -38, -186), Math.PI / 2); g.camera.snapBehind(Math.PI / 2, 0.05);
    show(C.bram, V(181.2, -38, -184), -Math.PI / 2); C.bram.activity(null); C.bram.anim.setMode('loco'); C.bram.mount = null; C.bram.scripted = false;
    show(C.nia, V(183.6, -38, -180.6), -Math.PI / 2); C.nia.activity(null);
    show(C.tomas, V(186.5, -38, -188.2), -Math.PI / 2 - 0.3); C.tomas.activity(null); C.tomas.anim.armsCrossed = 1;
    g.audio.music.play('tension', 2);
    g.hud.fade(0, 1.4);
    this.enter(true);
    g.director.shot({ pos: V(173, -36.4, -191), look: V(184, -37, -186), fov: 40, cut: true, to: { pos: V(174, -36.6, -190) }, dur: 5 });
    C.tomas.face(P.pos.clone());
    await this.rookWalk(V(183.4, -38, -187.4), C.tomas.pos);
    C.tomas.lookAtPlayer();
    const sawH3 = g.state.has('sawH3');
    await this.convo(C.tomas, [
      ['TOMAS', 'Six hours, I said. In and out. Harrow\'s had Security on this bay door for forty minutes.', { emotion: 'angry' }],
      ['ROOK', 'There are people down there, Tomas. Callow Reach. I heard them.'],
      ['NIA', 'It\'s real. It\'s on the Mule\'s drive. Nine days old.'],
      ['TOMAS', '…I\'ve heard it.', { emotion: 'tired' }],
      ['ROOK', 'You\'ve— what?', { emotion: 'surprised' }],
      ['TOMAS', 'Engineering logs the ground band. We\'ve had it for a week.'],
      ['ROOK', 'And you did nothing.', { emotion: 'angry' }],
      ['TOMAS', 'We cross the Gray Fork at first bell. Leg Two can\'t take a detour and the relays can\'t take another stop. The Commander has decided.'],
      ['TOMAS', 'No contact. No interference. That\'s an order, Runner. From both of us.', { emotion: 'angry' }],
    ]);
    this.guard(id);
    const opts = [{ text: 'She said it gets worse every time a Marcher walks past.', tone: 'press', value: 'press' }];
    if (sawH3) opts.push({ text: 'Then what was an H-3 doing in the Grid Forty yard?', tone: 'accuse', value: 'h3' });
    opts.push({ text: '…Understood.', tone: 'yield', value: 'yield' });
    const v = await this.pick(C.tomas, opts);
    if (v === 'press') { await this.convo(C.tomas, [['TOMAS', 'People say a lot of things on the ground band.', { emotion: 'tired' }], ['ROOK', 'Do they say it with eleven children behind them?']]); g.state.adjust('tomas', 'trust', -1); }
    if (v === 'h3') {
      await this.convo(C.tomas, [
        ['ROOK', 'The thing on Pylon Seven was H-7. There\'s an H-3 rusting under Grid Forty. Meridian Engineering, on the plate.'],
        ['TOMAS', 'Old harvest-line units. Scrapped before we were born.', { emotion: 'neutral' }],
        ['TOMAS', 'Security\'s dealing with the wreck.'],
        ['ROOK', 'That\'s not an answer.'],
        ['TOMAS', 'It\'s the one I\'ve got.', { emotion: 'sad' }],
      ]);
      g.state.flag('askedTomasH'); g.state.adjust('tomas', 'trust', -1);
    }
    if (v === 'yield') { await this.convo(C.tomas, [['TOMAS', '…Thank you.', { emotion: 'tired' }]]); g.state.flag('yieldedToTomas'); }
    this.guard(id);
    await this.convo(C.tomas, [
      ['BRAM', 'Tomas. Forty-three people.', { emotion: 'sad' }],
      ['TOMAS', 'Forty-three people chose to live in the Stillness, Bram. Ninety thousand people chose Meridian.', { emotion: 'angry' }],
      ['TOMAS', 'Get some sleep. All of you.'],
    ]);
    C.tomas.anim.armsCrossed = 0; C.tomas.goTo(V(160, -38, -186), 1.5).then(() => hide(C.tomas));
    await this.wait(2);
    this.guard(id);
    C.bram.lookAtPlayer();
    await this.convo(C.bram, [['BRAM', 'He\'s frightened, kid. Don\'t hold it against him tonight.', { emotion: 'sad' }], ['BRAM', '…Tomorrow, maybe.', { emotion: 'amused' }]]);
    g.state.journal('Tomas already knew. Engineering has had the Callow Reach transmission for a week. Orders: no contact, no interference. We cross the Gray Fork at first bell.');
    if (v === 'h3') g.state.journal('I asked him about H-3. "Old harvest-line units. Scrapped before we were born." He didn\'t look at me when he said it.');
    await g.hud.fade(1, 1.6); this.guard(id);
    this.exit();
    hide(C.tomas); hide(C.bram);
    g.state.checkpoint = 'c1_night'; g.state.save(g);
  },

  // ================================================================== NIGHT: REFUSAL
  async beat_c1_night(id) {
    const g = this.game, P = g.player, C = this.cast, L = g.districts.lower;
    this.equip(true, true); P.relaxed = true; g.weapons.locked = true;
    if (g.sky.mood !== 'night') g.sky.setMood('night'); g.lightMul = 0.75;
    g.crowd.clear(); hide(C.tomas); hide(C.bram);
    L.mule.visible = true; this.setBay(1);
    P.teleport(V(190, -38, -190), Math.PI / 2); g.camera.snapBehind(Math.PI / 2, 0.05);
    show(C.nia, V(181.6, -38, -183), Math.PI / 2); C.nia.activity(null);
    g.audio.music.play('night', 3);
    g.windMul = 0.7;
    // far below in the dark, one warm light
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: g.materials.glowSprite, color: new THREE.Color(1, 0.6, 0.25).multiplyScalar(3), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.position.set(560, GROUND_Y + 6, -1180); glow.scale.setScalar(26); g.engine.cityRoot.add(glow);
    this.c1Glow = glow;
    g.hud.fade(0, 2);
    this.enter(true);
    const lk = V(560, GROUND_Y, -1180);
    g.director.shot({ pos: V(193.6, -36.2, -188.2), look: lk, fov: 34, cut: true, to: { fov: 26 }, dur: 8 });
    P.anim.lookTarget = lk;
    await this.wait(4);
    this.exit();
    this.objective('Couldn\'t sleep', 'Somebody\'s at the Mule.', () => C.nia.pos);
    await this.useOnce({ getPos: () => C.nia.pos, radius: 2.6, label: 'Talk to Nia' });
    this.guard(id);
    C.nia.face(P.pos.clone()); C.nia.lookAtPlayer();
    await this.convo(C.nia, [
      ['NIA', 'Couldn\'t sleep either?', { emotion: 'tired' }],
      ['ROOK', 'Nine days. She\'s been asking for nine days, and we just… walked past.', { emotion: 'sad' }],
      ['NIA', 'We haven\'t walked past yet.'],
    ]);
    const v = await this.pick(C.nia, [
      { text: 'I\'m going back down.', tone: 'resolve', value: 'go' },
      { text: 'Tell me I\'m wrong.', tone: 'doubt', value: 'wrong' },
    ]);
    if (v === 'wrong') await this.convo(C.nia, [['NIA', 'You\'re not wrong. You\'re just early.', { emotion: 'amused' }], ['ROOK', 'I\'m going back down.']]);
    await this.convo(C.nia, [
      ['NIA', 'I know. I put fuel in the Mule an hour ago.', { emotion: 'happy' }],
      ['ROOK', 'Tomas will—'],
      ['NIA', 'Tomas will be furious. At me, mostly. Because I\'m driving.'],
      ['ROOK', 'Nia—'],
      ['NIA', 'You\'re a Runner. I\'m the one who knows which end of the Mule is the front. Get in.', { emotion: 'happy', gesture: 0.8 }],
    ]);
    g.state.adjust('nia', 'trust', 1); g.state.adjust('nia', 'warmth', 1);
    g.state.flag('c1Complete'); g.state.choice('c1_refusal', v);
    g.state.journal('I\'m going back down. Nia is driving. Tomas will find out at first bell, when the Mule\'s lift is empty.');
    await g.hud.fade(1, 2); this.guard(id);
    glow.removeFromParent(); glow.material.dispose(); this.c1Glow = null;
    hide(C.nia);
    g.state.checkpoint = 'c2_title'; g.state.save(g);
  },
};

function SCmid(Z) { return Z.spots.stillCentre.clone().add(V(0, 1.5, 0)); }
function findPlate(root) { let best = null; root.traverse(o => { if (o.isMesh && o.material?.map && o.geometry?.type === 'PlaneGeometry') best = o; }); return best; }
