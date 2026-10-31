// CHAPTER THREE — THE TRADE ROAD
// Six days later Rook, Nia and Bram ride with the Long Road: a convoy that is also a town. A night of
// firelight, a shared meal, a can fence, a trader, a storyteller who has heard of Stillwater — and Nia,
// sitting outside the ring, who admits she used to live on the ground. In the morning raiders hit the
// convoy at speed: fight from the flatbed, wreck buggies with their own momentum, board the harpoon rig.
// Its map case holds a map with one word circled: STILLWATER.
//
// The chase is a treadmill: the convoy stays put in the physics frame and the ground (and everything on
// it) rushes past, so every truck is a solid platform you can stand, fight and jump on.
import * as THREE from 'three';
import { show, hide } from './cast.js';
import { buildConvoyCamp, CAMP } from '../world/zone_convoy.js';
import { vehicle } from '../world/vehicles.js';
import { GROUND_Y } from '../world/city.js';
import { groundMule } from './chapter1.js';
import { clamp, damp, dampAngle, lerp } from '../core/util.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const worldOf = (o) => o.getWorldPosition(new THREE.Vector3());
export const CH3 = ['c3_title', 'c3_camp', 'c3_nia', 'c3_morning', 'c3_chase', 'c3_map'];

// ------------------------------------------------------------------ the world for chapter three
export function enterConvoy(s, beat) {
  const g = s.game;
  g.cityHidden = true; g.city.walking = false; g.surface = true; g.killY = GROUND_Y - 60;
  if (g.ground.settlement) g.ground.settlement.visible = false;
  const camp = ['c3_camp', 'c3_nia'].includes(beat);
  if (camp && (!s.zone || s.zone.name !== 'convoy')) { s.zone?.dispose(); s.zone = buildConvoyCamp(g); }
  if (!camp && s.zone) { s.zone.dispose(); s.zone = null; }
}
export function c3Spawn(s, cp) {
  const Z = s.zone;
  if (cp === 'c3_camp' && Z?.name === 'convoy') return [Z.spots.arrive.clone().add(V(4, 0, -4)), Math.PI * 0.8];
  if (cp === 'c3_nia' && Z?.name === 'convoy') return [Z.spots.fire.clone().add(V(0, 0, 8)), Math.PI];
  return null;
}

// ------------------------------------------------------------------ the convoy on the move
function makeChase(s) {
  const g = s.game, CH = { speed: 0, target: 22, list: [], buggies: [], t: 0 };
  const ground = (x, z) => GROUND_Y + g.ground.heightAt(x, z - g.city.travel);
  const add = (kind, x, z, o = {}) => {
    const v = vehicle(g, kind, o); g.engine.cityRoot.add(v.group); v.base = V(x, 0, z); v.goal = null; v.phase = Math.random() * 6; v.weave = o.weave ?? 0.5; v.rel = 0;
    v.group.position.set(x, ground(x, z), z); v.group.updateMatrixWorld(true);
    if (o.kin !== false) v.kin = g.physics.addKinematic(v.group, v.cols);
    CH.list.push(v); return v;
  };
  CH.add = add;
  CH.hauler = add('hauler', 30, 0, { color: 0x6f7d50, weave: 0.25 });
  CH.lead = add('trailer', 30.5, -36, { color: 0x3a6a8a, awning: 0xd8a040 });
  CH.van = add('van', 29, -18, { color: 0x5a5a4a });
  CH.tail = add('trailer', 30, 19, { color: 0x8a3a2a, awning: 0xe8e0d0 });
  // the Mule rides with them, Nia at the wheel
  const m = groundMule(s); m.visible = true; CH.mule = { group: m, base: V(23.5, 0, 6), phase: 2, weave: 0.6, wheels: m.userData.wheels, spin: (d) => m.userData.wheels.forEach(w => (w.rotation.x += d / 0.62)), front: 1, lift: 0.3 };
  CH.update = (dt) => {
    CH.t += dt;
    CH.speed = damp(CH.speed, CH.target, 0.8, dt);
    g.city.travel += CH.speed * dt; g.chaseSpeed = CH.speed;
    const t = g.time;
    for (const v of [...CH.list, CH.mule]) {
      if (v.dead) continue;
      if (v.crashed) { v.crashT += dt; v.base.z += CH.speed * dt * Math.min(1, v.crashT); v.group.rotation.z += v.rollV * dt; v.rollV *= Math.exp(-dt * 0.8); v.group.position.set(v.base.x, ground(v.base.x, v.base.z) + 0.6 + Math.max(0, Math.sin(Math.min(Math.PI, v.crashT * 2.4))) * 2.5, v.base.z); if (v.base.z > 220) { v.dead = true; if (v.kin) g.physics.removeKinematic(v.kin); v.dispose(); } continue; }
      if (v.goal) { v.base.x = damp(v.base.x, v.goal.x, v.goalRate ?? 0.6, dt); v.base.z = damp(v.base.z, v.goal.z, v.goalRate ?? 0.6, dt); }
      const x = v.base.x + Math.sin(t * 0.35 + v.phase) * v.weave, z = v.base.z;
      const yf = ground(x, z - 3), yb = ground(x, z + 3);
      const bump = Math.sin(t * 7 + v.phase) * 0.03 + Math.sin(t * 2.3 + v.phase) * 0.04;
      v.group.position.set(x, (yf + yb) / 2 + bump + (v.lift || 0), z);
      v.group.rotation.set(Math.atan2(yf - yb, 6) * (v.front ? -1 : 1), (v.front ? Math.PI : 0) - Math.cos(t * 0.35 + v.phase) * v.weave * 0.04, Math.sin(t * 1.7 + v.phase) * 0.012);
      v.spin(CH.speed * dt * (v.front ? -1 : 1));
      if (v.dust !== false && Math.random() < 0.4) g.fx.alpha.spawn({ x: x + (Math.random() - 0.5) * 2, y: v.group.position.y + 0.2, z: z + 3.5, vx: (Math.random() - 0.5), vy: 0.8, vz: CH.speed * 0.6, life: 1.8, s0: 0.6, s1: 3.2, c0: [0.66, 0.6, 0.5, 0.35], c1: [0.66, 0.6, 0.5, 0], drag: 1.2 });
    }
    if (CH.cable) CH.cable.update();
  };
  CH.crash = (v, hard) => {
    if (v.crashed) return; v.crashed = true; v.crashT = 0; v.rollV = (Math.random() < 0.5 ? -1 : 1) * (hard ? 9 : 5);
    const p = worldOf(v.group).add(V(0, 1, 0)); g.fx.explosion(p, hard ? 1.2 : 0.8); g.audio.explosion(p, hard ? 1 : 0.7); g.camera.shake(0.25);
    for (const r of v.riders || []) if (!r.dead) r.damage(999, p, V(0, 1, 0));
    v.untether?.();
  };
  // roadside: rocks, scrub and fence posts streaming past (instanced, recycled) — the speed you can see
  {
    const kinds = [[new THREE.IcosahedronGeometry(0.7, 0), new THREE.MeshStandardMaterial({ color: 0x6a645a, roughness: 1, flatShading: true }), 60, [5, 70]],
      [new THREE.SphereGeometry(0.8, 7, 5), new THREE.MeshStandardMaterial({ color: 0x5a6a34, roughness: 1 }), 90, [6, 80]],
      [new THREE.BoxGeometry(0.14, 1.2, 0.14), new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 1 }), 50, [12, 12]]];
    CH.road = kinds.map(([geo, mat, n, [d0, d1]], ki) => {
      const im = new THREE.InstancedMesh(geo, mat, n); im.frustumCulled = false; g.engine.cityRoot.add(im);
      const items = [...Array(n)].map((_, i) => ({ x: ki === 2 ? 30 - 12 : 30 + (Math.random() < 0.5 ? -1 : 1) * (d0 + Math.random() * (d1 - d0)), z: -200 + (ki === 2 ? i * (320 / n) : Math.random() * 320), s: ki === 2 ? 1 : 0.5 + Math.random() * 1.4 }));
      return { im, items, ki };
    });
    const mtx = new THREE.Matrix4(), q = new THREE.Quaternion();
    CH.roadTick = (dt) => { for (const R of CH.road) { R.items.forEach((it, i) => { it.z += CH.speed * dt; if (it.z > 120) it.z -= 320; const y = ground(it.x, it.z); mtx.compose(V(it.x, y + (R.ki === 2 ? 0.6 : R.ki === 1 ? 0.3 * it.s : 0.2 * it.s), it.z), q, V(it.s, R.ki === 1 ? it.s * 0.7 : it.s, it.s)); R.im.setMatrixAt(i, mtx); }); R.im.instanceMatrix.needsUpdate = true; } };
  }
  CH.off = g.add((dt) => { CH.update(dt); CH.roadTick(dt); });
  CH.dispose = () => {
    CH.off(); g.chaseSpeed = 0;
    for (const v of CH.list) { if (!v.dead) { if (v.kin) g.physics.removeKinematic(v.kin); v.untether?.(); v.dispose(); } }
    CH.cable?.dispose(); CH.list = [];
    CH.road.forEach(R => { R.im.removeFromParent(); R.im.geometry.dispose(); R.im.material.dispose(); R.im.dispose(); });
    m.visible = false;
  };
  return CH;
}
// a raider buggy with its gunner, coming up from behind to a station beside the convoy
function buggy(s, CH, x, z, station, o = {}) {
  const g = s.game, v = CH.add('buggy', x, z, { color: o.color, weave: 0.9 });
  v.goal = station.clone(); v.goalRate = 0.5; v.stall = 0;
  v.riders = [g.enemies.spawn('raider', worldOf(v.group), { mount: v.group, local: v.spots.gunner, alwaysAware: true, range: 55, spread: 2.2, dmg: 6, cooldown: 2.8, seed: Math.floor(Math.random() * 999) })];
  v.untether = g.tether.register({ kind: 'machine', label: 'Buggy', big: true, priority: 2, radius: 1.8, range: 60, enabled: () => !v.crashed,
    getPos: () => v.group.localToWorld(v.spots.core.clone()), getVel: () => V(0, 0, -CH.speed),
    capture: (dt) => { v.stall += dt; v.goal.z += dt * 10; if (v.stall > 1.1) CH.crash(v, false); return 950 * dt; },
    push: (imp, cells) => { if (cells >= 1) CH.crash(v, true); } });
  CH.buggies.push(v);
  return v;
}

// ------------------------------------------------------------------ beats (mixed into the story runner)
export const Chapter3 = {
  c3People() {
    // the convoy, at its evening
    const g = this.game, Z = this.zone, S = Z.spots, cr = g.crowd; let seed = 1300;
    const fire = S.fireSeats;
    [1, 2, 4, 5, 6].forEach((k, i) => cr.spawnSpot({ pos: fire[k].pos, yaw: fire[k].yaw, activity: ['sitGround', 'drink', 'sitGround', 'eat', 'sitGround'][i] }, seed++, { look: { outfit: i % 2 ? 'casual' : 'worker' }, cull: 120 }));
    cr.spawnSpot({ pos: fire[3].pos.clone().add(V(0.4, 0, 0)), yaw: fire[3].yaw, activity: 'busk' }, seed++, { look: { outfit: 'casual', primary: '#8a3a6a', hat: true }, cull: 120 });
    cr.spawnSpot({ pos: fire[7].pos.clone().add(V(-0.4, 0, 0)), yaw: fire[7].yaw, activity: 'busk' }, seed++, { look: { outfit: 'casual', primary: '#3a6a5a' }, cull: 120 });
    S.stalls.forEach((st, i) => cr.spawnSpot({ pos: st.pos.clone().addScaledVector(V(Math.sin(st.yaw), 0, Math.cos(st.yaw)), -1.6), yaw: st.yaw + Math.PI, activity: i === 0 ? null : 'talkIdle' }, seed++, { look: { outfit: 'vendor' }, cull: 120, barks: [['TRADER', 'Seeds from the south! Good for any dirt that isn\'t still.'], ['TRADER', 'Batteries, rebuilt, guaranteed till next week!'], ['TRADER', 'Runner! You look like someone who needs a better hat.']] }));
    for (let k = 0; k < 4; k++) cr.spawnSpot({ pos: S.fire.clone().add(V(-8 + k * 2.2, 0, 7 + (k % 2))), yaw: k, activity: 'kidPlay' }, seed++, { look: { kid: true }, cull: 120 });
    for (let k = 0; k < 5; k++) cr.spawnSpot({ pos: S.fire.clone().add(V(10 + (k % 3) * 1.4, 0, 4 + Math.floor(k / 3) * 1.5)), yaw: k * 1.3, activity: 'talkIdle' }, seed++, { look: { outfit: k % 2 ? 'casual' : 'worker' }, cull: 120, barks: [['TRADER', 'Meridian folk! Do you really sleep in the sky?'], ['TRADER', 'Mind the stew, it bites back.']] });
  },

  // ================================================================== CHAPTER CARD
  async beat_c3_title(id) {
    const g = this.game;
    this.enter(true);
    await g.hud.fade(1, 0.4);
    g.audio.music.stop(1);
    restoreCity(this);
    g.hud.chapterCard('CHAPTER THREE', 'THE TRADE ROAD', 'Six days later. Four hundred kilometres from Meridian.');
    await this.wait(0.3);
    enterConvoy(this, 'c3_camp');
    if (g.sky.mood !== 'dusk') g.sky.setMood('dusk');
    await this.wait(5.2);
    g.hud.hideChapter(); await this.wait(1.6);
    this.exit();
    g.state.chapter = 'chapter3'; g.state.checkpoint = 'c3_camp'; g.state.save(g);
  },

  // ================================================================== THE CAMP
  async beat_c3_camp(id) {
    const g = this.game, P = g.player, Z = this.zone, S = Z.spots, C = this.cast;
    if (g.sky.mood !== 'dusk') g.sky.setMood('dusk');
    this.equip(true, true); P.relaxed = true; g.weapons.locked = true;
    g.crowd.clear(); this.c3People();
    const m = groundMule(this); m.visible = true; m.position.copy(S.mulePark).add(V(0, 0.3, 0)); m.rotation.set(0, Math.PI * 0.75, 0);
    P.teleport(S.arrive.clone().add(V(4, 0, -4)), Math.PI * 0.8); g.camera.snapBehind(Math.PI * 0.8, 0.05);
    this.niaAt(S.arrive.clone().add(V(5.6, 0, -2.6)), Math.PI * 0.8); this.bramAt(S.arrive.clone().add(V(2.4, 0, -2.4)), Math.PI * 0.8);
    show(C.maren, S.fire.clone().add(V(-4, 0, 9)).setY(Z.gy(S.fire.x - 4, S.fire.z + 9)), Math.PI * 1.8); C.maren.activity(null);
    g.audio.music.play('caravan', 3);
    g.hud.fade(0, 1.6);
    this.enter(true);
    const look = S.fire.clone().add(V(0, 2, 0));
    g.director.shot({ pos: S.arrive.clone().add(V(-6, 3.4, 10)), look, fov: 46, cut: true, to: { pos: S.arrive.clone().add(V(-4, 2.6, 6)), fov: 40 }, dur: 7 });
    g.hud.location('THE LONG ROAD', 'A CONVOY THAT IS ALSO A TOWN', 6);
    await this.wait(2.5); this.guard(id);
    C.maren.goTo(S.arrive.clone().add(V(4.6, 0, -7.6)).setY(Z.gy(S.arrive.x + 4.6, S.arrive.z - 7.6)), 1.5);
    await this.wait(3.4); this.guard(id);
    C.maren.face(P.pos.clone()); C.maren.lookAtPlayer();
    await this.convo(C.maren, [
      ['MAREN', 'So these are Imani\'s Runners. You\'re late. The stew isn\'t.', { emotion: 'amused' }],
      ['BRAM', 'Maren Sole. Thirty years and she still hasn\'t learned to say hello.', { emotion: 'happy' }],
      ['MAREN', 'Hello, Bram. You\'ve gone grey.', { emotion: 'happy' }],
      ['BRAM', 'I went grey twenty years ago. You just stopped visiting.'],
      ['MAREN', 'Eat first. Questions after. That\'s the Long Road\'s only law.'],
    ]);
    this.guard(id);
    this.exit();
    C.maren.goTo(S.table.clone().add(V(-4.4, 0, 0)).setY(Z.gy(S.table.x - 4.4, S.table.z)), 1.4);
    const offN = this.companion(C.nia), offB = this.companion(C.bram, { far: 40 });
    this.objective('Join the convoy for supper', 'The long table by the fire.', S.table);
    g.hud.hint('move');
    await this.waitFor(() => P.pos.distanceTo(S.table) < 6); this.guard(id);
    offN(); offB();
    // ---------------------------------------------------------------- the shared meal
    this.enter(true);
    await g.hud.fade(1, 0.6); this.guard(id);
    const seats = S.tableSeats, seat = (a, k) => { show(a, seats[k].pos.clone(), seats[k].yaw); a.activity(null); a.pose('sit'); a.anim.activity = 'eat'; a.anim.setMode('activity'); a.pose('sit'); };
    seat(C.maren, 0); seat(C.nia, 1); seat(C.bram, 5); show(C.kofi, seats[6].pos.clone(), seats[6].yaw); C.kofi.pose('sit'); show(C.wren, seats[3].pos.clone(), seats[3].yaw); C.wren.pose('sit'); show(C.pip, seats[7].pos.clone().add(V(0.4, 0, 0)), seats[7].yaw); C.pip.pose('sit');
    P.setScripted(true); P.placeScripted(seats[4].pos.clone(), seats[4].yaw); P.anim.setMode('sit');
    const T = S.table.clone().add(V(0, 1.1, 0));
    g.director.shot({ pos: T.clone().add(V(-7.5, 1.6, 3.2)), look: T, fov: 40, cut: true, to: { pos: T.clone().add(V(-6.8, 1.4, 2.6)) }, dur: 8 });
    g.hud.fade(0, 0.8);
    // close on a face wherever it really is (seated heads sit lower than the director's standing default)
    const at = (a) => { const h = a.char.bones.head.getWorldPosition(new THREE.Vector3()), f = V(Math.sin(a.yaw), 0, Math.cos(a.yaw)), r = V(-f.z, 0, f.x);
      return { pos: h.clone().addScaledVector(f, 1.35).addScaledVector(r, 0.35).add(V(0, 0.08, 0)), look: h.clone().add(V(0, -0.02, 0)), fov: 34, cut: true }; };
    await this.say('MAREN', 'Imani says you want to know if there\'s another way. To keep the lights on without taking from the ground.', { actor: C.maren, dur: 4.6 });
    g.director.shot(at(C.maren));
    await this.say('MAREN', 'There\'s a place four days east. Sailhaven. Kites the size of fields, a tide engine in an old reservoir. Two thousand people.', { actor: C.maren, dur: 5.2 });
    await this.say('MAREN', 'They take nothing from the ground. The ground around them is green.', { actor: C.maren, dur: 3.4 });
    g.director.shot(at(C.nia));
    await this.say('NIA', 'Then why haven\'t the Marchers copied it?', { actor: C.nia, dur: 2.4 });
    g.director.shot(at(C.kofi));
    await this.say('KOFI', 'Because it doesn\'t move, sweetheart. Your cities have to keep walking or fall over.', { actor: C.kofi, dur: 3.8, emotion: 'amused' });
    g.director.shot(at(C.wren));
    await this.say('WREN', 'Or they walk because they\'ve always walked, and nobody up top remembers why.', { actor: C.wren, dur: 3.6 });
    g.director.shot(at(C.bram));
    await this.say('BRAM', 'Wren. Not tonight.', { actor: C.bram, dur: 1.8, emotion: 'tired' });
    g.director.shot({ pos: T.clone().add(V(5.5, 1.4, -2.6)), look: T, fov: 42, cut: true });
    await this.say('MAREN', 'Four days. You ride with us, you work with us. Tonight you\'re guests.', { actor: C.maren, dur: 3.4 });
    g.state.journal('The Long Road convoy will take us to Sailhaven, four days east: a town that makes its power from wind and tide, and takes nothing from the ground.');
    await g.hud.fade(1, 1.2); this.guard(id);
    // night falls
    g.sky.setMood('night'); g.windMul = 0.4;
    P.setScripted(false); P.teleport(S.fire.clone().add(V(0, 0, 8)), Math.PI); g.camera.snapBehind(Math.PI, 0.05);
    for (const a of [C.maren, C.kofi, C.wren, C.pip, C.nia, C.bram]) { a.anim.setMode('loco'); a.activity(null); }
    this.exit();
    g.state.checkpoint = 'c3_nia'; g.state.save(g);
  },

  // ================================================================== THE NIGHT, AND NIA
  async beat_c3_nia(id) {
    const g = this.game, P = g.player, Z = this.zone, S = Z.spots, C = this.cast;
    if (g.sky.mood !== 'night') g.sky.setMood('night');
    this.equip(true, true); P.relaxed = true; g.weapons.locked = true;
    if (!g.crowd.actors.length) this.c3People();
    if (this.retrying === 'c3_nia' || P.pos.distanceTo(S.fire) > 30) { P.teleport(S.fire.clone().add(V(0, 0, 8)), Math.PI); g.camera.snapBehind(Math.PI, 0.05); }
    g.hud.fade(0, 1.2);
    g.audio.music.play('caravan', 2);
    const at = (p, dx, dz) => p.clone().add(V(dx, 0, dz)).setY(Z.gy(p.x + dx, p.z + dz));
    show(C.maren, at(S.fire, -3.2, -1.8), 0.9); C.maren.activity('talkIdle');
    show(C.kofi, S.stalls[0].pos.clone().addScaledVector(V(Math.sin(S.stalls[0].yaw), 0, Math.cos(S.stalls[0].yaw)), -1.6), S.stalls[0].yaw + Math.PI); C.kofi.activity(null);
    show(C.wren, S.fireSeats[0].pos.clone(), S.fireSeats[0].yaw); C.wren.pose('sitGround');
    show(C.pip, S.cansStand.clone().add(V(1.6, 0, 0)), Math.PI); C.pip.activity(null);
    show(C.bram, S.fireSeats[2].pos.clone().add(V(0.3, 0, 0.3)), S.fireSeats[2].yaw); C.bram.pose('sitGround');
    show(C.nia, S.edge.clone(), Math.PI * 0.1); C.nia.pose('sitGround');
    this.objective('The night is yours', 'Talk to the convoy, try the can fence, trade — or find Nia when you\'re ready. She\'s outside the ring.', () => C.nia.pos);
    // ---- the can fence
    let cans = 0, cansWon = g.state.has('c3_cans');
    Z.onCan = () => { cans++; if (cans === 6) { cansWon = true; g.state.flag('c3_cans'); this.bark('PIP', 'ALL SIX! Nobody does all six! Maren owes you a favour now — that\'s the rule!', 4, C.pip); g.audio.ui('objective'); } };
    this.item({ getPos: () => C.pip.pos, radius: 2.6, label: () => cansWon ? 'Talk to Pip' : 'Try the can fence', onUse: () => {
      if (cansWon) { this.bark('PIP', 'You\'re a legend now. I\'m telling everyone. I\'ve already told everyone.', 3.4, C.pip); return; }
      Z.resetCans(); cans = 0; g.weapons.locked = false; P.relaxed = false;
      this.bark('PIP', 'Six cans, six shots. Knock \'em all off and the Long Road owes you one. Aim with the right mouse!', 4, C.pip);
      g.hud.hint('shoot', true);
    } });
    // ---- Kofi the trader
    this.item({ getPos: () => C.kofi.pos, radius: 2.6, label: 'Trade with Kofi', once: true, onUse: async () => {
      await this.banter([['KOFI', 'Runner! For the girl with the goggles, eh? I see you looking. Everyone sees you looking.', { dur: 3.8, actor: C.kofi }]]);
      const v = await this.choose([{ text: 'The brass compass.', tone: 'gift', value: 'compass' }, { text: 'The seed packet from the south.', tone: 'gift', value: 'seeds' }, { text: 'I\'m not looking.', tone: 'deflect', value: 'none' }]);
      if (v === 'none') this.bark('KOFI', 'Of course not. Nobody ever is.', 2.6, C.kofi);
      else { g.state.flag('c3_gift', v); this.bark('KOFI', v === 'compass' ? 'Points home. Wherever that turns out to be.' : 'Seeds for a garden that stays put. Good choice.', 3.4, C.kofi); g.state.journal(v === 'compass' ? 'Bought a brass compass from Kofi. For Nia, maybe.' : 'Bought seeds from the south from Kofi. For Nia, maybe.'); }
    } });
    // ---- Wren's story (foreshadowing Stillwater)
    this.item({ getPos: () => C.wren.pos, radius: 2.6, label: 'Listen to Wren', once: true, onUse: () => this.banter([
      ['WREN', 'Sit, Runner. I\'ll tell you one the children aren\'t allowed.', { dur: 3, actor: C.wren }],
      ['WREN', 'There\'s a city east of here called Stillwater. It rained the day it stopped, and the rain never landed.', { dur: 5, actor: C.wren }],
      ['WREN', 'People still stand in its streets. If you watch long enough, one of them blinks.', { dur: 4, actor: C.wren }],
      ['ROOK', 'That\'s a story.', { dur: 1.6 }],
      ['WREN', 'Everything\'s a story, until you\'re in it.', { dur: 2.8, actor: C.wren }],
    ]).then(() => g.state.flag('c3_wren')) });
    // ---- Maren
    this.item({ getPos: () => C.maren.pos, radius: 2.6, label: 'Talk to Maren', once: true, onUse: () => this.banter([
      ['MAREN', 'Bram and I ran the Gray Fork together when we were your age. Before he went up and stayed up.', { dur: 4.4, actor: C.maren }],
      ['ROOK', 'Why did he stay?', { dur: 1.6 }],
      ['MAREN', 'Ask him. And when he says it was the pay, ask him again.', { dur: 3.6, actor: C.maren }],
    ]) });
    // ---- Bram
    this.item({ getPos: () => C.bram.pos, radius: 2.6, label: 'Sit with Bram', once: true, onUse: () => this.banter([
      ['BRAM', 'Good stew. Don\'t tell Odile I said it was better than mine.', { dur: 3, actor: C.bram }],
      ['ROOK', 'Wren mentioned Stillwater.', { dur: 1.8 }],
      ['BRAM', '…Wren mentions a lot of things. Get some sleep, kid.', { dur: 3, actor: C.bram, emotion: 'worried' }],
    ]).then(() => g.state.flag('c3_bramDodged')) });
    // ---- Nia, at the edge of the light
    await this.useOnce({ getPos: () => C.nia.pos, radius: 2.8, label: 'Go to Nia' }); this.guard(id);
    this.objective(null); g.weapons.locked = true; P.relaxed = true;
    this.enter(true);
    const edge = C.nia.pos.clone();
    g.director.shot({ pos: edge.clone().add(V(-3.6, 1.4, -3.0)), look: edge.clone().add(V(0, 0.9, 0)), fov: 40, cut: true });
    await this.say('NIA', 'Too many people. I like them. I just like them from here.', { actor: C.nia, dur: 3.4 });
    const v = await this.pick(C.nia, [{ text: 'Mind if I sit?', tone: 'warm', value: 'sit' }, { text: 'I\'ll leave you to it.', tone: 'respect', value: 'leave' }]);
    if (v === 'leave') {
      await this.say('NIA', '…Goodnight, Rook.', { actor: C.nia, dur: 1.8 });
      g.state.choice('c3_nia', 'leave');
    } else {
      g.state.choice('c3_nia', 'sit'); g.state.flag('c3_satWithNia');
      P.setScripted(true); const sp = edge.clone().add(V(1.0, 0, 0.2)); P.placeScripted(sp, Math.PI * 0.1); P.anim.setMode('sitGround');
      const mid = edge.clone().add(V(0.5, 0.8, 0.1));
      g.director.shot({ pos: mid.clone().add(V(0.4, 0.5, 3.4)), look: mid, fov: 36, cut: true, to: { pos: mid.clone().add(V(0.2, 0.4, 2.8)) }, dur: 30 });
      const L = (who, text, o = {}) => this.say(who, text, { actor: who === 'ROOK' ? { anim: P.anim, pos: P.pos } : C.nia, dur: o.dur ?? Math.max(2, text.length * 0.055), emotion: o.emotion });
      await L('NIA', 'You can see the stars down here. Up top the lamps eat them.');
      await L('ROOK', 'You\'re good at the ground. The Mule, the fields, the way you read the convoy. Better than any of us.');
      await L('NIA', '…I used to live down here.', { emotion: 'sad' });
      await L('NIA', 'Before Meridian. A place with a well and a lot of dogs. I don\'t talk about it.', { emotion: 'sad' });
      const v2 = await this.choose([{ text: 'You don\'t have to now.', tone: 'gentle', value: 'gentle' }, { text: 'What happened to it?', tone: 'curious', value: 'ask' }, { text: 'I\'m glad you told me.', tone: 'warm', value: 'glad' }]);
      if (v2 === 'ask') { await L('NIA', 'Something walked past it.', { emotion: 'sad' }); await L('NIA', 'Ask me again some other night. Not this one.'); g.state.adjust('nia', 'trust', 0); }
      if (v2 === 'gentle') { await L('NIA', 'I know. That\'s why I did.', { emotion: 'happy' }); g.state.adjust('nia', 'trust', 1); g.state.adjust('nia', 'warmth', 1); }
      if (v2 === 'glad') { await L('NIA', 'Don\'t make it a thing, Runner.', { emotion: 'amused' }); await L('NIA', '…I\'m glad too.', { emotion: 'happy' }); g.state.adjust('nia', 'warmth', 1); g.state.adjust('nia', 'spark', 1); }
      const gift = g.state.flags.c3_gift;
      if (gift) {
        await L('ROOK', gift === 'compass' ? 'Here. Kofi said it points home.' : 'Here. Kofi said they grow in ground that stays put.');
        await L('NIA', gift === 'compass' ? '…Which home?' : '…You don\'t know what you just did, do you.', { emotion: 'surprised' });
        await L('NIA', 'Thank you.', { emotion: 'happy' });
        g.state.adjust('nia', 'spark', 1); g.state.flag('c3_gaveGift');
      }
      await this.wait(1.2);
      await L('NIA', 'Stay a bit. Don\'t talk.', { emotion: 'happy' });
      g.audio.music.play('night', 3);
      await this.wait(4);
      g.state.adjust('nia', 'spark', 1);
      g.state.journal('Nia used to live on the ground, before Meridian. "Something walked past it." We sat outside the convoy\'s ring until the fire went down.');
      P.setScripted(false);
    }
    await g.hud.fade(1, 2); this.guard(id);
    Z.onCan = null;
    this.exit();
    g.state.checkpoint = 'c3_morning'; g.state.save(g);
  },

  // ================================================================== MORNING: ON THE ROAD
  async beat_c3_morning(id) {
    const g = this.game, P = g.player, C = this.cast;
    if (g.sky.mood !== 'morning') g.sky.setMood('morning'); g.windMul = 1.2;
    g.crowd.clear(); [C.maren, C.kofi, C.wren, C.pip].forEach(hide);
    this.equip(true, true); P.relaxed = false; g.weapons.locked = false;
    const CH = this.chase = this.chase || makeChase(this);
    CH.speed = CH.target = 18;
    const H = CH.hauler;
    for (let i = 0; i < 40; i++) CH.update(1 / 30);
    P.teleport(H.group.localToWorld(H.spots.deck.clone()), Math.PI); g.camera.snapBehind(Math.PI, 0.05);
    show(C.bram, worldOf(H.group), 0); C.bram.mount = new THREE.Object3D(); C.bram.mount.position.set(-0.5, 1.2, -3.0); H.group.add(C.bram.mount); C.bram.mountYaw = Math.PI; C.bram.anim.setMode('sit');
    show(C.nia, worldOf(CH.mule.group), 0); C.nia.mount = CH.mule.group.userData.cab; C.nia.mountYaw = 0; C.nia.anim.setMode('sit');
    this.enter(true);
    g.hud.fade(0, 1.6);
    g.audio.music.play('caravan', 2);
    g.director.shot({ pos: () => H.group.position.clone().add(V(-22, 7, -30)), look: () => H.group.position.clone().add(V(0, 1, 6)), fov: 40, cut: true });
    g.hud.location('THE LONG ROAD', 'DAY ONE OF FOUR · EAST TO SAILHAVEN', 5);
    await this.wait(4); this.guard(id);
    g.director.shot({ pos: () => H.group.localToWorld(V(1.8, 2.8, 4.6)), look: () => H.group.localToWorld(V(-0.5, 2, -3)), fov: 46, cut: true });
    await this.radio('BRAM', 'Four days of this. I could get used to a floor that moves forward instead of up and down.', { dur: 3.8 });
    await this.radio('NIA', 'You hate everything that isn\'t Meridian.', { dur: 2.2 });
    await this.radio('BRAM', 'I hate everything. Meridian just has better stew.', { dur: 2.6 });
    await this.wait(0.6); this.guard(id);
    // dust on the horizon behind them
    g.director.shot({ pos: () => H.group.localToWorld(V(1.9, 3.5, 4.6)), look: () => H.group.localToWorld(V(10, 0, 160)), fov: 30, cut: true, to: { fov: 22 }, dur: 4 });
    for (let i = 0; i < 40; i++) setTimeout(() => g.fx.alpha.spawn({ x: 30 + (Math.random() - 0.5) * 60, y: GROUND_Y + 2, z: 150 + Math.random() * 40, vx: 0, vy: 1, vz: 4, life: 6, s0: 4, s1: 14, c0: [0.66, 0.6, 0.5, 0.5], c1: [0.66, 0.6, 0.5, 0], drag: 0.3 }), i * 80);
    await this.wait(1.6);
    await this.radio('MAREN', 'Dust on the back road. Three — no, five. Raiders! Everyone tight, keep rolling!', { dur: 4 });
    g.audio.music.play('combat', 0.5); g.audio.music.sting?.('danger');
    await this.radio('BRAM', 'Rook, you\'re on the flatbed — you\'re our back door!', { dur: 2.6 });
    this.exit();
    g.state.checkpoint = 'c3_chase'; g.state.save(g);
  },

  // ================================================================== THE CHASE
  async beat_c3_chase(id) {
    const g = this.game, P = g.player, C = this.cast;
    if (g.sky.mood !== 'morning') g.sky.setMood('morning');
    this.equip(true, true); P.relaxed = false; g.weapons.locked = false;
    const fresh = !this.chase;
    const CH = this.chase = this.chase || makeChase(this);
    CH.target = 22; if (fresh) { CH.speed = 22; for (let i = 0; i < 40; i++) CH.update(1 / 30); }
    const H = CH.hauler;
    if (fresh || this.retrying === 'c3_chase') {
      P.teleport(H.group.localToWorld(H.spots.deck.clone()), Math.PI); g.camera.snapBehind(Math.PI, 0.05); g.hud.fade(0, 0.8);
      if (!C.bram.mount) { show(C.bram, worldOf(H.group), 0); C.bram.mount = new THREE.Object3D(); C.bram.mount.position.set(-0.5, 1.2, -3.0); H.group.add(C.bram.mount); C.bram.mountYaw = Math.PI; C.bram.anim.setMode('sit'); }
      if (!C.nia.mount) { show(C.nia, worldOf(CH.mule.group), 0); C.nia.mount = CH.mule.group.userData.cab; C.nia.mountYaw = 0; C.nia.anim.setMode('sit'); }
    }
    if (g.audio.music.cue !== 'combat') g.audio.music.play('combat', 0.6);
    // falling off at this speed: the road takes you
    const fallCheck = g.add(() => { if (!P.dead && P.state !== 'scripted' && P.pos.y < H.group.position.y - 3.5) { fallCheck(); this.failState('Left behind.'); } });
    this.c3FallCheck = fallCheck;
    // ---------------------------------------------------------------- wave one: buggies
    if (!g.state.has('c3_wave1')) {
      this.objective('Defend the convoy', 'Shoot the raiders — or capture a buggy\'s momentum [E] and throw it into another [Q].', () => { const b = CH.buggies.find(b => !b.crashed && !b.dead); return b ? worldOf(b.group).add(V(0, 2, 0)) : null; });
      g.hud.hint('capture', true);
      const plan = [[40, 70, V(37, 0, 7)], [18, 80, V(22.5, 0, -2)], [42, 95, V(37.5, 0, 18)], [20, 120, V(23, 0, 14)], [38, 140, V(36.5, 0, -6)]];
      let spawned = 0;
      const spawnNext = () => { const [x, z, st] = plan[spawned++]; buggy(this, CH, x, z, st, { color: [0x8a4a2a, 0x5a5a3a, 0x7a3a3a][spawned % 3] }); };
      spawnNext(); spawnNext();
      await this.waitFor(() => {
        // a buggy whose gunner is down peels off; send the next one in
        for (const b of CH.buggies) if (!b.crashed && !b.left && b.riders.every(r => r.dead)) { b.left = true; b.goal = V(b.base.x + (b.base.x > 30 ? 30 : -30), 0, 260); b.goalRate = 0.25; b.untether?.(); }
        for (const b of CH.buggies) if (b.left && b.base.z > 200 && !b.dead) { b.dead = true; if (b.kin) g.physics.removeKinematic(b.kin); b.dispose(); }
        const active = CH.buggies.filter(b => !b.crashed && !b.left).length;
        if (active < 2 && spawned < plan.length) spawnNext();
        return spawned >= plan.length && active === 0;
      });
      this.guard(id);
      g.state.flag('c3_wave1'); g.state.save(g);
      await this.radio('MAREN', 'That\'s the buggies! Don\'t cheer — look what\'s behind them.', { dur: 3 });
    }
    // ---------------------------------------------------------------- wave two: the harpoon rig
    const R = CH.rig = CH.add('rig', 44, 90, { color: 0x6a4a32, weave: 0.3 });
    R.goal = V(36.2, 0, 16); R.goalRate = 0.35;
    R.riders = R.spots.raiders.map((p, i) => g.enemies.spawn('raider', worldOf(R.group), { mount: R.group, local: p, alwaysAware: true, range: 50, spread: 2.0, dmg: 6, cooldown: 3 + i * 0.4, seed: 77 + i }));
    this.objective('The harpoon rig', 'It\'s coming for the tail trailer.', () => worldOf(R.group).add(V(0, 3, 0)));
    await this.waitFor(() => R.base.distanceTo(R.goal) < 3); this.guard(id);
    // the harpoon: fired into the tail trailer, and the rig starts to haul it off the road
    const T = CH.tail;
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(), V()]), new THREE.LineBasicMaterial({ color: 0x1a1a1a })); line.frustumCulled = false; g.engine.cityRoot.add(line);
    CH.cable = { update() { const a = R.group.localToWorld(R.spots.harpoon.clone()), b = T.group.localToWorld(V(1.3, 2.2, 2)); line.geometry.setFromPoints([a, b]); }, dispose() { line.removeFromParent(); line.geometry.dispose(); line.material.dispose(); } };
    g.audio.clank(worldOf(T.group), 2, 0.6); g.camera.shake(0.3);
    T.goal = V(33, 0, 21); T.goalRate = 0.15;
    await this.radio('MAREN', 'They\'ve harpooned the tail! That\'s the children\'s trailer — Runner, get over there!', { dur: 3.6 });
    // it pulls alongside the flatbed to cover the cable: that's the way across
    R.goal = V(36.2, 0, 2); R.goalRate = 0.4;
    this.objective('Board the harpoon rig', 'Jump across from the flatbed when it\'s alongside — or latch onto it [F].', () => R.group.localToWorld(R.spots.deck.clone()));
    const offA = g.tether.registerAnchor({ label: 'Rig', getPoint: () => R.group.localToWorld(V(0, 3.0, 1.6)), getVelocity: () => V() });
    const onRig = () => { const l = R.group.worldToLocal(P.pos.clone()); return Math.abs(l.x) < 1.6 && l.z > -2.4 && l.z < 4.8 && l.y > 1.2 && l.y < 3.5; };
    await this.waitFor(() => onRig()); this.guard(id);
    offA(); if (P.state === 'latch') P.endLatch(false);
    this.objective('Clear the rig', 'Three raiders on the bed.', () => { const r = R.riders.find(r => !r.dead); return r ? r.pos.clone().add(V(0, 2, 0)) : null; });
    R.riders.forEach(r => { r.opts.spread = 1.2; r.opts.cooldown = 2.2; });
    await this.waitFor(() => R.riders.every(r => r.dead)); this.guard(id);
    // the map case
    this.objective('Search the rig', 'There\'s a case by the tailboard.', () => R.group.localToWorld(R.spots.mapCase.clone()));
    await this.useOnce({ getPos: () => R.group.localToWorld(R.spots.mapCase.clone()), radius: 2.2, label: 'Take the map case' }); this.guard(id);
    g.state.flag('c3_map'); g.audio.ui('objective');
    // break the winch: its own engine's momentum, thrown into the drum
    let broken = false;
    this.objective('Break the harpoon winch', 'Capture the rig\'s engine [E] — throw it into the winch drum [Q].', () => g.tether.cells > 0 ? R.group.localToWorld(R.spots.winch.clone()) : R.group.localToWorld(V(0, 2.2, -4.2)));
    const offE = g.tether.register({ kind: 'machine', label: 'Rig engine', captureOnly: true, noLos: true, big: true, priority: 3, radius: 1.4, range: 30, getPos: () => R.group.localToWorld(V(0, 2.2, -4.2)), getVel: () => V(0, 0, -CH.speed), capture: (dt) => 900 * dt, push: () => {} });
    const offW = g.tether.register({ kind: 'special', label: 'Harpoon winch', releaseOnly: true, noLos: true, priority: 5, radius: 1.0, range: 30, getPos: () => R.group.localToWorld(R.spots.winch.clone()), getVel: () => V(), capture: () => 0, push: (imp, cells) => { if (cells >= 1) broken = true; } });
    await this.waitFor(() => broken); this.guard(id);
    offE(); offW();
    // the drum explodes, the cable whips free, the rig slews away — and Rook jumps for the flatbed
    this.enter(true);
    const wp = R.group.localToWorld(R.spots.winch.clone());
    g.fx.explosion(wp, 1); g.audio.explosion(wp, 1); g.camera.shake(0.5);
    CH.cable.dispose(); CH.cable = null; this.whipCable(wp);
    T.goal = V(30, 0, 19);
    g.director.shot({ pos: () => H.group.localToWorld(V(-5, 4.5, -8)), look: () => R.group.position.clone().add(V(0, 1.5, 0)), fov: 44, cut: true });
    P.setScripted(true);
    const from = P.pos.clone(), to = H.group.localToWorld(H.spots.deck.clone()), t0 = g.time;
    P.anim.setMode('loco');
    await this.waitFor(() => { const u = clamp((g.time - t0) / 0.9, 0, 1); const p = from.clone().lerp(H.group.localToWorld(H.spots.deck.clone()), u); p.y += Math.sin(u * Math.PI) * 2.2; P.placeScripted(p, Math.PI); return u >= 1; });
    P.setScripted(false);
    R.goal = V(70, 0, 40); R.goalRate = 0.5;
    await this.wait(0.8); CH.crash(R, true);
    await this.wait(1.6); this.guard(id);
    await this.radio('MAREN', 'They\'re breaking off! They\'re breaking off — ha! Long Road, you beautiful idiots!', { dur: 3.6 });
    this.exit();
    this.objective(null);
    fallCheck(); this.c3FallCheck = null;
    g.state.checkpoint = 'c3_map'; g.state.save(g);
  },

  // ================================================================== THE MAP
  async beat_c3_map(id) {
    const g = this.game, P = g.player, C = this.cast;
    const CH = this.chase = this.chase || makeChase(this);
    if (g.sky.mood !== 'morning') g.sky.setMood('morning');
    CH.target = 7;
    for (let i = 0; i < 20; i++) CH.update(1 / 30);
    const H = CH.hauler;
    this.equip(true, true); P.relaxed = true; g.weapons.locked = true;
    P.setScripted(true); P.placeScripted(H.group.localToWorld(V(0.4, 1.55, 1.4)), Math.PI);
    const stand = (a, x, z, yaw) => { show(a, worldOf(H.group), 0); const o = new THREE.Object3D(); o.position.set(x, 1.55, z); H.group.add(o); a.mount = o; a.mountYaw = yaw; a.anim.setMode('loco'); a.activity(null); };
    stand(C.bram, -0.7, 0.4, Math.PI * 0.75); stand(C.maren, 0.9, -0.2, -Math.PI * 0.7); stand(C.nia, -0.6, 2.6, Math.PI * 0.15);
    g.audio.music.play('tension', 3);
    this.enter(true);
    g.hud.fade(0, 1);
    // the map
    const tex = mapTexture();
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.85), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 })); sheet.rotation.x = -Math.PI / 2; sheet.position.set(0.1, 2.35, 1.0); H.group.add(sheet);
    g.director.shot({ pos: () => H.group.localToWorld(V(-1.6, 3.4, -0.6)), look: () => H.group.localToWorld(V(0.1, 2.0, 1.2)), fov: 44, cut: true });
    await this.say('MAREN', 'Raider maps. Water, fuel, who\'s soft. …They\'ve marked us. Every stop for a month.', { actor: C.maren, dur: 4.2, emotion: 'angry' });
    g.director.shot({ pos: () => H.group.localToWorld(V(0.1, 3.3, 1.0)), look: () => H.group.localToWorld(V(0.1, 2.35, 1.0)), fov: 36, cut: true, to: { fov: 26 }, dur: 5 });
    await this.say('ROOK', 'And this. One word, circled three times.', { actor: { anim: P.anim, pos: P.pos }, dur: 2.8 });
    await this.say('NIA', '"Stillwater."', { actor: C.nia, dur: 1.8 });
    g.director.shot({ pos: () => H.group.localToWorld(V(2.2, 3.0, 3.2)), look: () => H.group.localToWorld(V(-0.4, 2.6, 0.6)), fov: 38, cut: true });
    await this.say('MAREN', 'Nobody goes to Stillwater. Not raiders. Not us. Not anyone who wants to come back the same.', { actor: C.maren, dur: 4.4 });
    await this.say('NIA', 'Then why are raiders drawing circles round it?', { actor: C.nia, dur: 2.6 });
    await this.say('ROOK', 'Because there\'s something there worth stealing. Or someone.', { actor: { anim: P.anim, pos: P.pos }, dur: 3 });
    g.director.shot({ ...g.director.closeUp(C.bram, { dist: 1.3, fov: 32 }), cut: true });
    await this.say('BRAM', '…Leave it, kid.', { actor: C.bram, dur: 2, emotion: 'worried' });
    await this.say('ROOK', 'You know something.', { actor: { anim: P.anim, pos: P.pos }, dur: 1.8 });
    await this.say('BRAM', 'I know Stillwater\'s a bad word in every settlement on this road. That\'s all I know.', { actor: C.bram, dur: 3.8, emotion: 'worried' });
    g.director.shot({ pos: () => H.group.localToWorld(V(-1.6, 3.4, -0.6)), look: () => H.group.localToWorld(V(0.1, 2.0, 1.2)), fov: 44, cut: true });
    const v = await this.choose([{ text: 'We\'re going to Stillwater.', tone: 'resolve', value: 'go' }, { text: 'Sailhaven first. Then Stillwater.', tone: 'measured', value: 'later' }]);
    if (v === 'go') await this.say('NIA', 'Then I\'m driving.', { actor: C.nia, dur: 1.8, emotion: 'happy' });
    else await this.say('MAREN', 'Stillwater\'s on the way to Sailhaven, Runner. Everything bad is on the way to something good.', { actor: C.maren, dur: 4 });
    await this.say('MAREN', 'Take the Mule. We\'ll wait for you at the reservoir crossing — two days. Then we go on.', { actor: C.maren, dur: 3.8 });
    g.state.choice('c3_stillwater', v); g.state.flag('c3Complete');
    g.state.journal('The raiders\' map had one place circled three times: STILLWATER. Bram told me to leave it. He knows something.');
    await g.hud.fade(1, 2); this.guard(id);
    sheet.removeFromParent(); sheet.geometry.dispose(); sheet.material.dispose(); tex.dispose();
    for (const a of [C.bram, C.maren, C.nia]) { a.mount = null; hide(a); }
    P.setScripted(false);
    this.exit();
    g.state.checkpoint = 'c4_title'; g.state.save(g);
  },
  c3Cleanup() {
    this.c3FallCheck?.(); this.c3FallCheck = null;
    this.chase?.dispose(); this.chase = null;
  },
};
// the raiders' map, painted on a canvas: roads, water, the convoy's stops in red, and one word circled
function mapTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 360; const x = c.getContext('2d');
  x.fillStyle = '#d8cbab'; x.fillRect(0, 0, 512, 360);
  for (let i = 0; i < 3000; i++) { x.fillStyle = `rgba(90,70,40,${Math.random() * 0.08})`; x.fillRect(Math.random() * 512, Math.random() * 360, 2, 2); }
  x.strokeStyle = '#6a5a40'; x.lineWidth = 2; x.beginPath(); x.moveTo(20, 300); x.bezierCurveTo(150, 260, 220, 200, 330, 180); x.bezierCurveTo(400, 170, 450, 120, 500, 60); x.stroke();
  x.strokeStyle = '#4a6a8a'; x.lineWidth = 6; x.beginPath(); x.moveTo(380, 360); x.bezierCurveTo(360, 280, 420, 240, 400, 200); x.stroke();
  x.fillStyle = '#a8322a'; for (const [px, py] of [[60, 290], [130, 270], [200, 230], [260, 200]]) { x.beginPath(); x.arc(px, py, 5, 0, 7); x.fill(); }
  x.fillStyle = '#2a2622'; x.font = '700 28px "Barlow Condensed", sans-serif'; x.fillText('STILLWATER', 360, 110);
  x.strokeStyle = '#a8322a'; x.lineWidth = 3; for (let k = 0; k < 3; k++) { x.beginPath(); x.ellipse(425, 100, 80 + k * 6, 30 + k * 4, -0.1 + k * 0.05, 0, 7); x.stroke(); }
  x.font = '600 16px "Barlow Condensed", sans-serif'; x.fillText('LONG ROAD', 40, 320); x.fillText('SAILHAVEN →', 430, 40);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// Meridian in view again (every chapter that isn't away from her)
export function restoreCity(s) { s.game.cityHidden = false; }
