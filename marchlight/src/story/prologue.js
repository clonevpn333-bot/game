// PROLOGUE — THE CITY THAT NEVER SLEEPS
// Morning in Meridian → the market → the tram → the Lower Decks → the Runner Bay →
// the range → the Spine → the scavs → Pylon 7 → the falling tram → Callow Reach → MARCHLIGHT.
import * as THREE from 'three';
import { makeCast, show, hide } from './cast.js';
import { runRescue, WorkTram, tramOnLine } from './rescue.js';
import { SP } from '../world/district_spine.js';
import { LD } from '../world/district_lower.js';
import { clamp, damp, dampAngle, ease, lerp, sleep, rng } from '../core/util.js';
import { defaultLook } from '../characters/rig.js';
import { Chapter1, CH1, enterSurface, leaveSurface, c1Spawn } from './chapter1.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const PROLOGUE = ['wake', 'terraces', 'market', 'tram', 'lower', 'hangar', 'range', 'spine', 'galleryB', 'relay', 'shearer', 'rescue', 'rescueC', 'title'];
const CH2 = [];
const ORDER = [...PROLOGUE, ...CH1, ...CH2];
const chapterOf = (b) => CH1.includes(b) ? 'chapter1' : CH2.includes(b) ? 'chapter2' : 'prologue';
const _w = new THREE.Vector3();
class Abort extends Error {}

export class Prologue {
  constructor(game) {
    this.game = game; this.runId = 0;
    this.cast = makeCast(game);
    this.items = [];
    this.waiters = new Set();
    game.add((dt) => { for (const w of [...this.waiters]) { if (w.id !== this.runId) { this.waiters.delete(w); w.reject(new Abort()); continue; } try { if (w.pred(dt)) { this.waiters.delete(w); w.resolve(); } } catch (e) { this.waiters.delete(w); w.reject(e); } } });
    game.onPlayerDeath = (kind) => this.failState(kind === 'fall' ? 'You fell.' : kind === 'still' ? 'The Stillness held you.' : 'Rook went down.');
    game.onPlayerFell = () => this.failState('You fell.');
    this.ambient = [];
  }

  // ------------------------------------------------------------------ helpers
  guard(id) { if (id !== this.runId) throw new Abort(); }
  waitFor(pred) { const id = this.runId; return new Promise((resolve, reject) => this.waiters.add({ id, pred, resolve, reject })); }
  wait(s) { const t0 = this.game.rtime; return this.waitFor(() => this.game.rtime - t0 >= s); }
  waitGame(s) { const t0 = this.game.time; return this.waitFor(() => this.game.time - t0 >= s); }
  near(p, r = 2) { return this.waitFor(() => this.game.player.pos.distanceTo(p) < r); }
  objective(t, s = '', target = null) { this.game.hud.setObjective(t, s, target); } // target: waypoint (Vector3 or fn)
  say(...a) { return this.game.dialogue.say(...a); }
  radio(name, text, o = {}) { return this.game.dialogue.radio(name, text, o); }
  bark(name, text, d = 3, a) { this.game.dialogue.bark(name, text, d, a); }
  choose(opts) { return this.game.dialogue.choose(opts); }
  item(o) { const it = this.game.interact.add(o); this.items.push(it); return it; }
  useOnce(o) { return new Promise(res => { const it = this.item({ ...o, once: true, onUse: () => res(it) }); }); }
  trigger(test, fn) { const id = this.runId; const off = this.game.add(() => { if (id !== this.runId) { off(); return; } if (test()) { off(); fn(); } }); return off; }
  checkpoint(name) { const g = this.game; g.state.checkpoint = name; g.state.save(g); g.hud.notify('CHECKPOINT', 2); }
  canCustomize() { const p = this.game.player.pos; return p.y > 13 && p.x > 182 && p.x < 192 && p.z < -16 && p.z > -26; }
  actorsLook(a, b) { a.lookAt(() => b.head || b.headPos); }
  lookAtPlayer(a) { a.lookAtPlayer(); }
  enter(cine = true) { const g = this.game; g.director.begin({ letterbox: cine, hideHud: true }); g.player.controlsLocked = true; }
  exit() { const g = this.game; g.director.end(); g.player.controlsLocked = false; }
  // Rook walks to a mark during a cutscene (instead of popping there), then turns to face `face`.
  async rookWalk(to, face = null, speed = 1.3) {
    const P = this.game.player; P.setScripted(true); P.vel.set(0, 0, 0);
    await this.waitFor((dt) => {
      const d = _w.copy(to).sub(P.pos).setY(0), L = d.length();
      if (L < 0.04) { P.anim.speed = 0; return true; }
      P.yaw = dampAngle(P.yaw, Math.atan2(d.x, d.z), 9, dt);
      const sp = Math.min(speed, L * 4 + 0.3); P.anim.speed = sp;
      P.placeScripted(P.pos.clone().addScaledVector(d.normalize(), Math.min(L, sp * dt)), P.yaw);
      return false;
    });
    if (face) {
      const yaw = Math.atan2(face.x - P.pos.x, face.z - P.pos.z);
      await this.waitFor((dt) => { P.yaw = dampAngle(P.yaw, yaw, 7, dt); P.placeScripted(P.pos, P.yaw); return Math.abs(Math.atan2(Math.sin(yaw - P.yaw), Math.cos(yaw - P.yaw))) < 0.03; });
    }
    P.setScripted(false); P.controlsLocked = true; P.targetYaw = P.yaw;
  }
  playerFace(target) { const p = this.game.player; const d = target.clone().sub(p.pos); p.yaw = p.targetYaw = Math.atan2(d.x, d.z); }

  // dialogue staging: two-shot alternating over-the-shoulder cameras
  async convo(npc, lines) {
    const g = this.game, P = g.player;
    this.enter(true);
    P.vel.set(0, 0, 0); P.anim.speed = 0;
    npc.face(P.pos.clone()); npc.lookAtPlayer();
    this.playerFace(npc.pos);
    const rookActor = { pos: P.pos, yaw: P.yaw, char: P.char };
    const others = () => [...g.actors, ...g.crowd.actors].filter(o => o.visible !== false && !o.hidden && o.pos.distanceTo(P.pos) < 9);
    const EMOTIVE = new Set(['sad', 'worried', 'angry', 'surprised', 'shy', 'tired']);
    let prevWho = null, run = 0, n = 0, prevKey = '';
    for (const L of lines) {
      if (typeof L === 'function') { const r = await L(); if (r === 'break') break; continue; }
      const [who, text, opt = {}] = L;
      const radio = !!opt.radio;
      const speaker = radio ? (who === 'ROOK' ? rookActor : npc) : who === 'ROOK' ? rookActor : (g.cast[who.toLowerCase()] || npc);
      const listener = speaker === rookActor ? npc : rookActor;
      // coverage: over the shoulder by default; close on emotional lines and on a speaker's
      // second line in a row; a wide two-shot now and then to re-establish the room
      run = who === prevWho ? run + 1 : 0; prevWho = who; n++;
      const style = opt.wide ? 'wide' : (opt.emotion && EMOTIVE.has(opt.emotion)) || run % 2 === 1 ? 'close' : n % 6 === 0 ? 'wide' : 'ots';
      const side = speaker === rookActor ? -1 : 1, key = who + style;
      if (key !== prevKey) g.director.shot({ ...g.director.cover(speaker, listener, { style, side, others: others() }), handheld: 0.6 });
      prevKey = key;
      if (who === 'ROOK') { P.anim.talking = true; P.anim.lookTarget = npc.head; }
      await this.say(who, text, { ...opt, actor: who === 'ROOK' ? { anim: P.anim, pos: P.pos } : speaker });
      P.anim.talking = false;
    }
  }
  // a choice inside a conversation: frames Rook, returns value
  async pick(npc, options) {
    const g = this.game, P = g.player;
    const others = [...g.actors, ...g.crowd.actors].filter(o => o.visible !== false && !o.hidden && o.pos.distanceTo(P.pos) < 9);
    g.director.shot({ ...g.director.cover({ pos: P.pos, char: P.char }, npc, { style: 'ots', side: -1, others }), handheld: 0.4 });
    return this.choose(options);
  }

  // a snapped cable whipping through the air
  whipCable(origin) {
    const g = this.game;
    const N = 24, pts = []; for (let i = 0; i < N; i++) pts.push(origin.clone());
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x1a1a1a }));
    line.frustumCulled = false; g.engine.cityRoot.add(line);
    const dir = new THREE.Vector3(Math.random() - 0.5, 0.6, Math.random() - 0.5).normalize();
    g.fx.meshes.push({ m: line, t: 0, life: 2.2, update: (e, k) => {
      const P = geo.attributes.position;
      for (let i = 0; i < N; i++) { const u = i / (N - 1); const w = Math.sin(u * 9 - k * 30) * (1 - k) * 3 * u; P.setXYZ(i, origin.x + dir.x * u * 22 + w, origin.y + dir.y * u * 18 * (1 - k * 1.6) - k * k * 30 * u, origin.z + dir.z * u * 22 + w * 0.6); }
      P.needsUpdate = true;
    } });
  }

  async failState(why) {
    const g = this.game;
    if (this.failing) return; this.failing = true;
    const id = ++this.runId;
    this.rescueCleanup?.();
    g.slowmo = 1; g.audio.duck(0.3, 0.5);
    await g.hud.fade(1, 0.8);
    g.hud.notify(why.toUpperCase(), 3);
    await this.wait(1.4);
    g.audio.duck(1, 0.5);
    this.failing = false;
    const P = g.player, cp = g.state.checkpoint || 'wake';
    P.revive();
    // put Rook somewhere safe for this checkpoint first: the beats only reposition him when he's arriving
    // from elsewhere, so after a long fall he'd otherwise stay below the course and keep falling
    const S = g.districts.spine, spawn = {
      spine: [V(184, LD.floor, -190), Math.PI / 2], galleryB: [S.spots.vantage, Math.PI], relay: [S.spots.deckArrive, 0], shearer: [S.spots.deckArrive, 0],
      rescue: [S.spots.deckCenter.clone().add(V(-6, 0, 0)), -Math.PI / 2], rescueC: [V(199, SP.deck, -292), -Math.PI / 2],
    }[cp] || c1Spawn(this, cp);
    if (spawn) { P.teleport(spawn[0].clone(), spawn[1]); g.camera.snapBehind(spawn[1], 0.1); }
    else if (P.pos.y < g.killY + 20 && P.safe?.length) { const s0 = P.safe.find(e => g.time - e.t > 3) || P.safe[0]; P.teleport(s0.p.clone(), P.yaw); } // fell elsewhere: last solid footing
    this.retrying = cp;
    const next = this.runId + 1; // start() takes the next run id
    this.start(cp);
    // whatever the beat does, bring the picture back once it has had a moment to set up
    const t0 = g.rtime, off = g.add(() => { if (g.rtime - t0 > 1.2) { off(); if (this.runId === next) g.hud.fade(0, 0.8); } });
  }
  restartCheckpoint() { this.start(this.game.state.checkpoint || 'wake'); }

  // ------------------------------------------------------------------ setup & dispatch
  resetWorld() {
    const g = this.game, C = this.cast;
    this.items.forEach(it => g.interact.remove(it)); this.items = [];
    this.ambient.forEach(a => g.removeActor(a)); this.ambient = [];
    g.crowd.clear(); g.enemies.clear();
    for (const a of Object.values(C)) { hide(a); a.stop(); a.activity(null); a.lookAt(null); a.face(null); a.mount = null; a.anim.talking = false; a.anim.armsCrossed = 0; a.anim.handsHips = 0; }
    g.director.end(); g.player.controlsLocked = false; g.player.setScripted(false); g.player.char.group.visible = true;
    g.hud.setObjective(null); g.slowmo = 1; g.timeScale = 1; g.engine.grade.uniforms.uFocus.value = 0; g.engine.grade.uniforms.uStill.value = 0;
    g.audio.duck(1, 0.3); g.camera.zoomFov = null; g.windMul = 1;
    if (this.workTram) { this.workTram.group.visible = false; this.workTram.crew.forEach(a => g.removeActor(a)); this.workTram.crew = []; this.workTram.state = 'idle'; if (this.workTram.kin) { g.physics.world.removeRigidBody(this.workTram.kin.body); g.physics.kinematics = g.physics.kinematics.filter(k => k !== this.workTram.kin); this.workTram.kin = null; } }
    const S = g.districts.spine; if (S.boom.userData.finalYaw !== undefined) S.boom.rotation.y = S.boom.userData.finalYaw;
    S.couplings.forEach(c => { c.seated = false; c.arm.rotation.x = -0.9; c.lamp.material.color.setRGB(4, 0.5, 0.15); });
    S.relayLight.material.color.setRGB(4, 0.6, 0.2);
    g.districts.lower.benchTether.visible = true;
    this.setBay(0);
    g.tether.locked = false; g.tether.latchLocked = false; g.tether.cells = 0; g.tether.charge = 0;
    g.weapons.locked = false;
    // chapter state that outlives a beat
    g.stillness?.clear(); g.lightMul = 1; g.windMul = 1;
    if (this.c1Glow) { this.c1Glow.removeFromParent(); this.c1Glow = null; }
    this.c1StillCleanup?.(); this.c1StillCleanup = null;
    for (const a of Object.values(C)) { a.frozen = false; a.scripted = false; }
    g.districts.lower.mule.visible = true;
    if (this.groundMule) this.groundMule.visible = false;
  }
  setBay(k) { const L = this.game.districts.lower; L.openBay(k); if (k > 0.5 && L.bayDoorCol) { this.game.physics.world.removeCollider(L.bayDoorCol, true); L.bayDoorCol = null; } else if (k < 0.5 && !L.bayDoorCol) { L.bayDoorCol = this.game.physics.addBox({ x: LD.x1 + 0.3, y: LD.floor + 7, z: -190 }, { x: 0.3, y: 7, z: 11 }, null, {}); } }
  equip(hasTether, weapons) {
    const g = this.game, P = g.player;
    const look = { ...(g.state.look || defaultLook()), tetherArm: hasTether };
    if (!P.look || P.look.tetherArm !== hasTether || P.look !== look) P.setLook(look);
    g.tether.locked = !hasTether; g.tether.latchLocked = !hasTether;
    if (weapons) { if (!g.weapons.owned.pistol) g.weapons.give('pistol'); if (!g.weapons.owned.carbine) g.weapons.give('carbine'); }
  }

  async start(beat) {
    const g = this.game;
    this.runId++;
    const id = this.runId;
    this.resetWorld();
    const order = ORDER;
    let i = Math.max(0, order.indexOf(beat));
    try {
      await g.hud.fade(1, 0.01);
      for (; i < order.length; i++) {
        this.guard(id);
        this.setChapter(chapterOf(order[i]), order[i]);
        await this['beat_' + order[i]](id);
      }
    } catch (e) {
      if (!(e instanceof Abort)) { console.error(e); }
    }
  }
  // the world each chapter needs: the prologue walks; chapter one rests on the ground at the Gray Fork
  setChapter(ch, beat) {
    const g = this.game;
    g.state.chapter = ch;
    const mood = (m) => { if ((g.sky.mood || 'morning') !== m) g.sky.setMood(m); };
    if (ch === 'prologue') { if (this.zone) leaveSurface(this); mood('morning'); }
    else if (ch === 'chapter1') { if (beat !== 'c1_title') enterSurface(this); if (beat !== 'c1_title') mood(beat === 'c1_night' ? 'night' : 'day'); }
  }
  // populate ambient life for the city part (persistent through the morning)
  populateCity() {
    const g = this.game, D = g.districts.city, cr = g.crowd;
    const barksM = [['VENDOR', 'Honey knots! Still warm!'], ['VENDOR', 'Morning, Runner.'], ['VENDOR', 'Valves, fittings, half-price — mostly whole!'], ['VENDOR', 'Tea for the climb?'], ['VENDOR', 'Mind the step, she\'s walking rough today.']];
    let seed = 10;
    for (let i = 0; i < 14; i++) cr.spawnWalker(D.lanes.market, seed++, { width: 8, barks: i % 3 === 0 ? barksM : null });
    for (let i = 0; i < 4; i++) cr.spawnWalker(D.lanes.edge, seed++, { width: 4 });
    for (let i = 0; i < 4; i++) cr.spawnWalker(D.lanes.court, seed++, { width: 3 });
    for (let i = 0; i < 2; i++) cr.spawnWalker(D.lanes.alley, seed++, { width: 2 });
    // shopkeepers behind counters
    let k = 0;
    for (const [key, sp] of Object.entries(D.spots)) if (key.startsWith('shopW')) cr.spawnSpot({ pos: sp.pos, yaw: sp.yaw, activity: ['talkIdle', 'cook', 'type', 'watch'][k++ % 4] }, seed++, { look: { outfit: 'vendor', apron: '#e8e0d0' }, barks: barksM });
    // people at Odile's tables and leaning on the edge rail
    cr.spawnSpot({ pos: V(163.2, 0, -60.5), yaw: Math.PI / 2, mode: 'sit' }, seed++).anim.activity = 'eat';
    cr.spawnSpot({ pos: V(164.8, 0, -60.5), yaw: -Math.PI / 2, mode: 'sit' }, seed++);
    cr.spawnSpot({ pos: V(163.2, 0, -69), yaw: Math.PI / 2, mode: 'sit' }, seed++);
    cr.spawnSpot({ pos: V(157.0, 0, -64), yaw: Math.PI / 2, mode: 'sit' }, seed++);
    for (const z of [-58, -71, -96, -108]) cr.spawnSpot({ pos: V(198.6, 0, z), yaw: Math.PI / 2, activity: 'lean' }, seed++, { barks: [['WORKER', 'Can\'t get used to it. All that ground, just… passing.'], ['WORKER', 'You can see the Sallow from here. Nothing grows right on it any more.']] });
    cr.spawnSpot({ pos: V(158.5, 7, -24), yaw: 0, activity: 'talkIdle' }, seed++); cr.spawnSpot({ pos: V(159.2, 7, -23.2), yaw: Math.PI, activity: 'talkIdle' }, seed++);
    cr.spawnSpot({ pos: V(170.5, 7, -22), yaw: -Math.PI / 2, mode: 'sit' }, seed++);
    cr.spawnSpot({ pos: V(155, 5.55, -123), yaw: Math.PI, activity: 'phone' }, seed++);
  }
  populateLower() {
    const g = this.game, L = g.districts.lower, cr = g.crowd; let seed = 200;
    const barks = [['WORKER', 'Morning, Runner.'], ['WORKER', 'Tell your brother to sleep. He\'s scaring the interns.'], ['WORKER', 'Leg Two\'s singing again. Hear it?'], ['WORKER', 'Mind the conduits. They bite.']];
    for (let i = 0; i < 6; i++) cr.spawnWalker(L.lanes.aisle, seed++, { width: 3, look: { outfit: 'worker' }, barks });
    for (let i = 0; i < 3; i++) cr.spawnWalker(L.lanes.north, seed++, { width: 3, look: { outfit: 'engineer' } });
    cr.spawnSpot({ pos: V(40.8, LD.floor, -200), yaw: -Math.PI / 2, activity: 'hammer' }, seed++, { look: { outfit: 'worker' } });
    cr.spawnSpot({ pos: V(40.8, LD.floor, -220), yaw: -Math.PI / 2, activity: 'weld' }, seed++, { look: { outfit: 'worker' } });
    cr.spawnSpot({ pos: V(100, LD.floor, -213.2), yaw: Math.PI, activity: 'console' }, seed++, { look: { outfit: 'engineer' }, barks });
    cr.spawnSpot({ pos: V(145, LD.floor, -213.2), yaw: Math.PI, activity: 'console' }, seed++, { look: { outfit: 'engineer' } });
    cr.spawnSpot({ pos: V(70, LD.floor, -173), yaw: Math.PI, activity: 'lean' }, seed++, { look: { outfit: 'worker' } });
    cr.spawnSpot({ pos: V(186, LD.floor, -160.5), yaw: 0, activity: 'crate' }, seed++, { look: { outfit: 'worker' } });
    // welding sparks emitter at the bench
    g.fx.emitter({ pos: V(41.6, LD.floor + 1.0, -219.5), rate: 14, range: 40, spawn: fx => fx.add.spawn({ x: 41.6, y: LD.floor + 1.0, z: -219.5, vx: (Math.random() - 0.5) * 3, vy: Math.random() * 3, vz: (Math.random() - 0.5) * 3, life: 0.4, s0: 0.05, s1: 0.01, c0: [3, 2.4, 1.4, 1], c1: [1, 0.3, 0, 0], g: 9 }) });
  }

  // ================================================================== BEATS
  async beat_wake(id) {
    const g = this.game, P = g.player, C = this.cast;
    g.state.checkpoint = 'wake';
    this.populateCity();
    this.setupCityCast('morning');
    // Rook in bed, in sleep clothes (casual) until the gear rack
    const look = { ...(g.state.look || defaultLook()) };
    P.setLook({ ...look, outfit: 'casual', primary: '#8a8a82', secondary: '#5a5a54', pants: '#5c5f66', boots: '#cfcac0', socks: true, backpack: false, tetherArm: false });
    if (P.char.sockets.tetherRing) P.char.sockets.tetherRing.visible = false;
    g.tether.locked = true; g.tether.latchLocked = true; g.weapons.locked = true;
    P.relaxed = true;
    // Rook asleep under the blanket, head on the pillow. One continuous getUp motion (see anim.js):
    // the actor stands at the bedside spot the whole time and the pose carries the body from the
    // pillow to the floor, so nothing pops.
    const stand = V(189.9, 14.0, -23.22), blanket = g.districts.city.blanket;
    P.teleport(stand, 0); P.setScripted(true); P.placeScripted(stand, 0);
    P.anim.setMode('getUp', 0); P.anim.stir = 0;
    for (let i = 0; i < 30; i++) P.anim.update(1 / 30); // settle the pose before the first frame
    blanket.set(1, 1);
    // drive u (and the blanket with it) smoothly over game time
    const getUp = (to, dur) => new Promise(res => {
      const from = P.anim.modeParam; let t = 0;
      const stop = g.add((dt) => {
        t = Math.min(dur, t + dt); const k = t / dur, e = k * k * (3 - 2 * k);
        P.anim.modeParam = from + (to - from) * e;
        const u = P.anim.modeParam;
        blanket.set(1 - Math.min(1, Math.max(0, u)), 1 - Math.min(1, Math.max(0, u - 1)));
        if (t >= dur) { stop(); res(); }
      });
    });
    const face = V(189.05, 14.82, -24.32); // where Rook's face is on the pillow
    this.enter(true);
    g.director.shot({ pos: V(190.35, 15.55, -23.2), look: face.clone().add(V(0.25, -0.05, 0)), fov: 40, to: { pos: V(190.05, 15.4, -23.45), look: face }, dur: 9 });
    g.hud.letterbox(true);
    g.audio.music.stop(0.5);
    g.hud.fade(0, 2.5);
    await this.wait(0.6);
    // the city's step in the dark
    g.audio.giantStep(V(174, -400, -228), 1.2, 200);
    await this.wait(2.2);
    g.audio.giantStep(V(-174, -400, 228), 0.9, 400);
    await this.wait(1.2);
    g.director.shot({ pos: V(188.15, 14.95, -25.15), look: V(188.1, 14.75, -25.5), fov: 32 }); // the glass of water
    // the water ripples as the next step lands
    const glass = new THREE.Mesh(new THREE.CircleGeometry(0.032, 20), new THREE.MeshStandardMaterial({ color: 0x9ab4c8, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.75 }));
    glass.rotation.x = -Math.PI / 2; glass.position.set(188.1, 14.72, -25.5); g.engine.cityRoot.add(glass);
    const ripple = g.add((dt) => { const s = g.city.shakeAmount; glass.position.y = 14.72 + Math.sin(g.time * 40) * 0.002 * s; glass.scale.setScalar(1 + Math.sin(g.time * 30) * 0.03 * s); });
    await this.wait(0.8);
    g.city.shakeAmount = 0.8; g.audio.rattle(V(188.1, 14.7, -25.5), 1.2); g.audio.giantStep(V(174, -400, -228), 1, 300);
    await this.wait(1.6);
    // radio clicks on; Rook stirs
    g.audio.ui('radio');
    g.director.shot({ pos: V(191.55, 15.55, -22.9), look: V(189.4, 14.75, -24.3), fov: 46, to: { pos: V(191.4, 15.5, -22.75) }, dur: 8 });
    const stirOn = g.add((dt) => { P.anim.stir = Math.min(1, P.anim.stir + dt * 0.5); });
    await this.say('RADIO', '—good morning, Meridian. Day two hundred fourteen of the March.', { radio: true, dur: 3.4 });
    g.audio.music.play('morning', 4);
    // sits up, pushing the blanket down, while the radio talks
    const up = getUp(1, 2.0);
    await this.say('RADIO', 'Crossing the Sallow Plains today. Steady pace, clear skies east.', { radio: true, dur: 3.2 });
    await up; stirOn();
    // swings the legs out and stands
    g.director.shot({ pos: V(191.3, 15.45, -21.4), look: V(189.8, 14.95, -23.6), fov: 46, to: { pos: V(191.0, 15.5, -21.2), look: V(189.8, 15.2, -23.3) }, dur: 6 });
    const out = getUp(2, 1.6).then(() => getUp(3, 1.4));
    await this.say('RADIO', 'And to whoever keeps feeding the gulls on the Crown deck — they know where you live now.', { radio: true, dur: 4 });
    await out;
    // stretch where Rook stands (the getUp end pose is the standing pose at the same spot)
    P.anim.setMode('activity'); P.anim.activity = 'stretch';
    await this.wait(2.2);
    ripple(); glass.removeFromParent();
    P.anim.activity = null; P.anim.setMode('loco');
    P.setScripted(false); P.teleport(stand, 0); g.camera.snapBehind(0, 0.1);
    this.exit();
    g.hud.location('RESIDENTIAL TERRACES', 'MERIDIAN · 3-C', 6);
    this.objective('Get ready for your shift', 'Tomas left a note. Your gear is on the rack.', V(189.5, 14, -16.6));
    g.hud.hint('move'); setTimeout(() => g.hud.hint('interact'), 6000); setTimeout(() => g.hud.hint('journal'), 30000);
    g.state.journal('Day 214 of the March. Meridian is crossing the Sallow Plains.');
    // ---- apartment interactions
    const said = {};
    this.item({ pos: V(191.4, 14, -21), radius: 2.0, label: 'Look outside', onUse: async () => {
      this.enter(false); g.director.shot({ pos: V(190.6, 15.7, -20.6), look: V(260, 5, -60), fov: 55, to: { pos: V(191.2, 15.65, -21.0), look: V(400, -40, -120) }, dur: 7 });
      await this.say('ROOK', 'The Sallow. Nothing out there for a hundred kilometers.', { dur: 3.4 });
      await this.say('ROOK', 'Nothing we\'d stop for, anyway.', { dur: 2.6 }); this.exit(); said.window = true; } });
    this.item({ pos: V(183.05, 14, -25.25), radius: 1.6, label: 'Read the note on the fridge', onUse: async () => {
      g.hud.notify('"Ate your noodles. Sorry. Shift starts at nine. Don\'t be late — Bram won\'t cover for you again. — T."', 6);
      await this.wait(1.6); await this.say('ROOK', 'He ate my noodles. Again.', { wait: false, dur: 2.4 }); } });
    this.item({ pos: V(182.3, 14, -23.2), radius: 1.5, label: 'Look at the photo', onUse: async () => {
      await this.say('ROOK', 'Migration of \'79. Mama made us wave at the cameras. Tomas wouldn\'t smile.', { wait: false, dur: 4 });
      await this.wait(4.1); this.say('ROOK', '…He hasn\'t really, since.', { wait: false, dur: 2.6 });
      g.state.meet('Tomas', 'My brother. Senior engineer. Raised me after the Migration of \'79 took our parents. Hasn\'t slept since Leg Two started drifting.'); } });
    this.item({ pos: V(182.3, 14, -24.4), radius: 1.5, label: 'Look at the crew photo', onUse: () => {
      this.say('ROOK', 'Crew Four. Bram still tells people the scar is from a Shearer. It was a can opener.', { wait: false, dur: 4.2 });
      g.state.meet('Bram Holt', 'Veteran Runner. Loud, warm, occasionally reckless. Half the city knows him; the other half has heard him.'); } });
    this.item({ pos: V(183.4, 14, -25.4), radius: 1.5, label: 'Make tea', enabled: () => !said.tea, onUse: () => { said.tea = true; g.audio.kettle(V(183.4, 15, -25.45)); g.state.flag('tea'); this.say('ROOK', 'Smoky. Awful. Perfect.', { wait: false, dur: 2.4 }); } });
    this.item({ pos: V(185.8, 14, -25.4), radius: 1.5, label: 'Turn on the radio', onUse: async () => {
      g.audio.ui('radio');
      await this.say('RADIO', 'Stillness advisory: fields reported along the western ridge. Grid Forty-One remains classified uninhabited.', { radio: true, wait: false, dur: 5 });
      await this.wait(5.2);
      this.say('RADIO', 'Runners: keep your visors on the horizon. And keep moving. Meridian always does.', { radio: true, wait: false, dur: 4.4 }); } });
    this.item({ pos: V(182.4, 14, -17.6), radius: 1.5, label: 'Mirror', onUse: () => { g.menu.customize(false, () => { this.equip(false); P.setLook({ ...(g.state.look), tetherArm: false, ...(said.geared ? {} : { outfit: 'casual', primary: '#8a8a82', secondary: '#5a5a54', pants: '#5c5f66', boots: '#cfcac0', socks: true }) }); }); } });
    this.item({ pos: V(189.5, 14, -16.6), radius: 1.6, label: () => said.geared ? 'Runner kit (worn)' : 'Gear up', enabled: () => !said.geared, onUse: async () => {
      said.geared = true; g.hud.fade(1, 0.35); await this.wait(0.4);
      P.setLook({ ...(g.state.look || defaultLook()), tetherArm: false }); g.audio.reloadPart('rack'); g.hud.fade(0, 0.5);
      this.objective('Head to the Market', 'Leave through the front door.', V(182.3, 14, -21)); } });
    // the door
    await this.useOnce({ pos: V(182.3, 14, -21), radius: 1.6, label: () => said.geared ? 'Leave the apartment' : 'Leave the apartment (not geared up)', onUse: () => {} });
    if (!said.geared) { P.setLook({ ...(g.state.look || defaultLook()), tetherArm: false }); this.say('ROOK', 'Boots. Jacket. Right.', { wait: false, dur: 2 }); }
    g.audio.doorSlide(V(182, 15, -21));
    P.teleport(V(179.0, 14, -21), -Math.PI / 2); g.camera.snapBehind(-Math.PI / 2 + 0.3, 0.05);
    g.state.checkpoint = 'terraces'; g.state.save(g);
  }

  setupCityCast(phase) {
    const g = this.game, C = this.cast, D = g.districts.city;
    show(C.okafor, V(171.5, 7, -37.6), Math.PI); C.okafor.activity('water');
    show(C.pell, V(162, 7, -14), 0); show(C.juno, V(164, 7, -18), Math.PI);
    C.pell.activity('kidPlay'); C.juno.activity('kidPlay');
    show(C.sefa, D.spots.sefa.pos.clone(), D.spots.sefa.yaw); C.sefa.pose('sit'); C.sefa.anim.setMode('activity'); C.sefa.anim.activity = 'busk'; C.sefa.pos.y = 0.13;
    show(C.odile, D.spots.odile.pos.clone(), D.spots.odile.yaw); C.odile.activity('cook');
    if (phase === 'morning') { show(C.bram, D.spots.bramSeat.pos.clone(), D.spots.bramSeat.yaw); C.bram.pose('sit'); C.bram.anim.activity = 'eat'; C.bram.anim.setMode('activity'); C.bram.pose('sit'); }
    // the kids' ball (real physics)
    if (!this.ball) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12), new THREE.MeshStandardMaterial({ color: 0xd8502a, roughness: 0.6 }));
      m.castShadow = true; m.position.set(163, 7.5, -16); g.engine.cityRoot.add(m);
      const body = g.physics.addDynamic(m, { type: 'ball', r: 0.18 }, { density: 40, restitution: 0.6, friction: 0.8, linDamp: 0.5, angDamp: 0.5, surface: 'rubber' });
      g.tether.registerBody(m, body, { label: 'Ball' });
      this.ball = { m, body };
      // kids chase and kick it around
      let kickT = 0;
      g.add((dt) => {
        if (C.pell.hidden) return;
        kickT -= dt;
        const bp = m.position;
        if (bp.y < 5 || bp.distanceTo(V(165, 7, -20)) > 18) { body.setTranslation({ x: 163, y: 7.6, z: -16 }, true); body.setLinvel({ x: 0, y: 0, z: 0 }, true); }
        for (const kid of [C.pell, C.juno]) {
          if (kid.pos.distanceTo(bp) < 0.6 && kickT <= 0) {
            kickT = 0.8; const to = (kid === C.pell ? C.juno : C.pell).pos.clone().sub(bp).setY(0).normalize();
            body.applyImpulse({ x: to.x * 4 + (Math.random() - 0.5), y: 1.2, z: to.z * 4 + (Math.random() - 0.5) }, true); g.audio.footstep(bp, 'rubber', 0.6);
          }
        }
        // the kid nearer the ball chases it
        const near = C.pell.pos.distanceTo(bp) < C.juno.pos.distanceTo(bp) ? C.pell : C.juno, other = near === C.pell ? C.juno : C.pell;
        if (bp.distanceTo(near.pos) > 0.5 && Math.hypot(body.linvel().x, body.linvel().z) < 3) { if (!near.target || near.target.distanceTo(bp) > 0.5) { near.activity(null); near.goTo(V(bp.x, 7, bp.z), 3.2); } }
        if (!other.target && other.anim.mode !== 'activity') other.activity('kidPlay');
        // Rook can kick it too
        const pp = g.player.pos;
        if (pp.distanceTo(bp) < 0.65 && Math.hypot(g.player.vel.x, g.player.vel.z) > 1 && kickT <= 0) { kickT = 0.5; const f = g.player.forward(); body.applyImpulse({ x: f.x * 5, y: 1.6, z: f.z * 5 }, true); g.audio.footstep(bp, 'rubber', 0.8); g.state.flag('kickedBall'); }
      });
    }
  }

  async beat_terraces(id) {
    const g = this.game, P = g.player, C = this.cast;
    if (!this.cast.okafor.hidden === false || g.crowd.actors.length === 0) { this.populateCity(); this.setupCityCast('morning'); }
    this.equip(false); P.relaxed = true;
    if (P.pos.distanceTo(V(179, 14, -21)) > 3) { P.teleport(V(179.0, 14, -21), -Math.PI / 2); g.camera.snapBehind(-Math.PI / 2 + 0.3, 0.05); }
    g.hud.fade(0, 0.8);
    this.objective('Head to the Market', 'Bram\'s at Odile\'s Kitchen.', V(168.2, 0, -64));
    g.weapons.locked = true;
    await this.wait(1.5);
    await this.radio('BRAM', 'Kid. You up? Odile\'s. I\'m buying.', { wait: false, dur: 2.6 });
    await this.wait(2.7);
    await this.radio('BRAM', '…Well. Odile\'s buying. She doesn\'t know yet.', { wait: false, dur: 3 });
    await this.wait(3);
    this.radio('ROOK', 'On my way.', { wait: false, dur: 1.6 });
    // Mrs. Okafor (optional)
    this.item({ getPos: () => C.okafor.pos, radius: 2.2, label: 'Talk to Mrs. Okafor', once: true, onUse: async () => {
      C.okafor.activity(null);
      await this.convo(C.okafor, [
        ['MRS. OKAFOR', 'Rook! There you are. Tell your brother he still owes me a pressure valve.', { emotion: 'happy' }],
        ['MRS. OKAFOR', 'And tell him to eat something that isn\'t coffee. He was grey on Tuesday. Grey!'],
      ]);
      const v = await this.pick(C.okafor, [{ text: 'I\'ll tell him.', tone: 'promise', value: 'promise' }, { text: 'I\'ll tell him you said he\'s wasting away.', tone: 'joke', value: 'joke' }]);
      if (v === 'joke') { await this.convo(C.okafor, [['MRS. OKAFOR', 'Ha! You tell him exactly that. In my voice.', { emotion: 'amused' }]]); g.state.flag('okaforJoke'); }
      else await this.convo(C.okafor, [['MRS. OKAFOR', 'Good child. Go on, go — you\'ll be late and Bram will make a speech about it.', { emotion: 'happy' }]]);
      this.exit(); C.okafor.activity('water'); C.okafor.lookAt(null);
      g.state.meet('Mrs. Okafor', 'Our neighbour on the Terraces. Grows tomatoes in a city that walks. Thinks Tomas doesn\'t eat. She\'s right.');
    } });
    // the kids
    this.item({ getPos: () => C.pell.pos, radius: 2.4, label: 'Talk to Pell and Juno', once: true, onUse: async () => {
      C.pell.stop(); C.juno.stop(); C.juno.goTo(C.pell.pos.clone().add(V(0.9, 0, 0.3)), 2.2).then(() => C.juno.face(g.player.pos.clone())); // runs over
      C.pell.activity(null); C.juno.activity(null);
      C.juno.lookAtPlayer();
      await this.convo(C.pell, [
        ['PELL', 'Rook! Rook — is it true you go all the way down to the ground?', { emotion: 'surprised' }],
        ['ROOK', 'Most weeks.'],
        ['JUNO', 'Did you see a Stillman?', { emotion: 'worried' }],
        ['ROOK', 'There\'s no such thing as Stillmen.'],
        ['JUNO', 'My cousin says they stand in the fields, and they only move when you\'re not looking.'],
        ['PELL', 'Your cousin also said the Crown was made of cake.'],
        ['JUNO', 'Parts of it!', { emotion: 'angry' }],
      ]);
      this.exit(); C.juno.lookAt(null);
      g.state.flag('heardStillmen');
      g.state.journal('Juno says the "Stillmen" stand in the fields and only move when nobody is looking. Kids\' stories.');
    } });
    // reaching the market
    await this.waitFor(() => P.pos.y < 1 && P.pos.z < -50);
    g.state.checkpoint = 'market'; g.state.save(g);
  }

  async beat_market(id) {
    const g = this.game, P = g.player, C = this.cast, D = g.districts.city;
    if (g.crowd.actors.length === 0) { this.populateCity(); this.setupCityCast('morning'); this.equip(false); P.teleport(V(155, 0, -54), Math.PI); g.camera.snapBehind(Math.PI, 0.05); g.hud.fade(0, 0.8); }
    P.relaxed = true; g.weapons.locked = true;
    g.hud.location('THE MARKET', 'MERIDIAN · DECK ONE', 5);
    g.audio.music.stop(4);
    this.objective('Meet Bram at Odile\'s Kitchen', '', () => C.bram.pos);
    g.state.meet('Odile Varga', 'Runs Odile\'s Kitchen. Has fed Runner Crew Four for twelve years and still calls Bram "that man".');
    // Sun Loaf: buy a honey knot (for Nia, if you think of it)
    const bakery = D.spots.shopW0;
    this.item({ pos: bakery.pos.clone().add(V(1.5, 0, 0)), radius: 2.4, label: 'Buy a honey knot (Sun Loaf)', once: true, onUse: () => { g.state.flag('honeyKnot'); g.hud.notify('HONEY KNOT — still warm. Nia likes these.', 3); this.bark('VENDOR', 'Two marks. Don\'t squash it.', 2.4); } });
    this.item({ getPos: () => C.sefa.pos, radius: 2.4, label: 'Tip Sefa', once: true, onUse: () => { g.state.flag('tippedSefa'); this.bark('SEFA', 'Bless you, Runner. This one\'s called "Leg Four Has a Limp".', 3.6, C.sefa); g.state.meet('Sefa', 'Plays the market every morning. Writes songs about the city\'s legs. Leg Four, apparently, has a limp.'); } });
    this.item({ pos: D.spots.telescope.pos, radius: 1.8, label: 'Use the telescope', onUse: async () => {
      this.enter(false); g.camera.zoomFov = null;
      g.director.shot({ pos: V(198.8, 1.5, -78), look: V(900, -400, -500), fov: 8, to: { look: V(900, -400, -300) }, dur: 6 });
      await this.say('ROOK', 'Old highway. Pylons. A town, maybe, once.', { dur: 3.2 });
      await this.wait(2); this.exit(); } });
    // conversation with Bram
    await this.useOnce({ getPos: () => C.bram.pos, radius: 2.6, label: 'Talk to Bram' });
    // Bram gets up off his stool (instead of popping to his feet); Odile talks from her counter
    this.enter(true);
    g.director.shot({ ...g.director.twoShot(C.bram, { pos: P.pos }, { dist: 3.0, height: 1.35, fov: 38 }) });
    C.bram.anim.activity = null; C.bram.lookAtPlayer();
    await C.bram.standUp(1.1);
    C.bram.face(P.pos.clone());
    C.odile.activity(null); C.odile.lookAtPlayer();
    await this.wait(0.4);
    await this.convo(C.bram, [['BRAM', 'There they are. Sun\'s been up an hour, Rook. The sun has a longer commute than you.', { emotion: 'amused', gesture: 0.9 }]]);
    const v1 = await this.pick(C.bram, [
      { text: 'The sun doesn\'t have to climb down a leg to get to work.', tone: 'tease', value: 'tease' },
      { text: 'Couldn\'t sleep. The steps were loud last night.', tone: 'honest', value: 'honest' },
      { text: 'Are you eating my breakfast?', tone: 'deflect', value: 'deflect' },
    ]);
    if (v1 === 'tease') { await this.convo(C.bram, [['BRAM', 'Ha! Fair. Fair.', { emotion: 'happy' }]]); }
    if (v1 === 'honest') { await this.convo(C.bram, [['BRAM', 'Leg Two\'s been grinding. Your brother\'s been up all night with it, I\'d bet.', { emotion: 'worried' }]]); g.state.adjust('bram', 'trust', 1); }
    if (v1 === 'deflect') { await this.convo(C.bram, [['BRAM', 'I\'m guarding it. From me. It\'s going badly.', { emotion: 'amused' }]]); }
    await this.convo(C.bram, [
      ['ODILE', 'He\'s on his third bowl, Rook. Third.', { emotion: 'amused' }],
      ['BRAM', 'Second. The first one doesn\'t count, it was a warm-up.'],
      ['BRAM', 'Listen. Tonight. Eight bells, my place. I\'m making the stew.', { emotion: 'happy', gesture: 1 }],
      ['ROOK', 'The stew.'],
      ['BRAM', 'Yes, the stew. Bring Nia. Bring your brother — drag him if you have to. That man\'s turned the colour of an engine manual.'],
      ['ODILE', 'Bram\'s stew. I\'ll send something edible along.'],
      ['BRAM', 'Woman, I have fed this crew for twelve years.', { emotion: 'angry' }],
      ['ODILE', 'And they\'re all still so thin.', { emotion: 'amused' }],
    ]);
    const v2 = await this.pick(C.bram, [{ text: 'We\'ll be there.', tone: 'accept', value: 'yes' }, { text: 'Tomas won\'t come.', tone: 'doubt', value: 'doubt' }]);
    if (v2 === 'doubt') await this.convo(C.bram, [['BRAM', 'Then you bring me his excuse, and I eat his share. Everybody wins.', { emotion: 'amused' }]]);
    else { await this.convo(C.bram, [['BRAM', 'Good. Eight bells. Don\'t make me come find you.', { emotion: 'happy' }]]); g.state.adjust('bram', 'warmth', 1); }
    await this.convo(C.bram, [
      ['BRAM', 'Now. Pylon Seven\'s been throwing faults since midnight. Tomas wants a Runner on it, and you\'re the Runner.', { gesture: 0.8 }],
      ['BRAM', 'Tram to the Lower Decks. Go see your brother first — he\'ll want to give you the speech. I\'ll meet you at the bay.'],
      ['BRAM', 'I\'ve got to see a man about a boot.'],
    ]);
    // Bram presses the note into Rook's hand
    { const to = P.pos.clone().add(C.bram.pos.clone().sub(P.pos).setY(0).normalize().multiplyScalar(0.72));
      g.director.shot({ ...g.director.twoShot(C.bram, { pos: P.pos }, { dist: 2.6, height: 1.3, fov: 36 }) });
      C.bram.goTo(to, 0.9); await this.waitFor(() => !C.bram.target);
      C.bram.face(P.pos.clone()); await this.wait(0.3);
      C.bram.anim.point = 0.55; await this.wait(1.1); C.bram.anim.point = 0; }
    g.hud.notify('BRAM\'S NOTE: "Eight bells. Stew. No excuses. — B."', 5);
    g.state.flag('dinnerInvite'); g.state.journal('Bram invited the crew to dinner. Eight bells, his place. "The stew."');
    this.exit();
    C.bram.lookAt(null); C.bram.faceTarget = null; C.odile.lookAt(null); C.odile.activity('cook');
    C.bram.goTo(V(155, 0, -66), 1.5).then(() => C.bram.goTo(V(156, 0, -90), 1.6)).then(() => C.bram.goTo(V(140, 0, -100), 1.6)).then(() => hide(C.bram));
    this.objective('Take the tram to the Lower Decks', 'Market Station, south end of the street.', V(155, 5.55, -124.6));
    g.state.checkpoint = 'tram'; g.state.save(g);
  }

  async beat_tram(id) {
    const g = this.game, P = g.player, C = this.cast, D = g.districts.city;
    if (g.crowd.actors.length === 0) { this.populateCity(); this.setupCityCast('later'); this.equip(false); P.teleport(V(155, 0, -110), Math.PI); g.camera.snapBehind(Math.PI, 0.05); g.hud.fade(0, 0.8); }
    P.relaxed = true; g.weapons.locked = true;
    this.objective('Take the tram to the Lower Decks', 'Market Station, south end of the street.', V(155, 5.55, -124.6));
    // tram waits at Market Station
    const tram = g.tram; tram.s = 0; tram.state = 'docked'; tram.doorOpen = 1;
    // passengers
    const pass = [];
    for (let i = 0; i < 3; i++) { const a = g.crowd.spawnSpot({ pos: V(0, -900, 0), yaw: 0, mode: 'sit' }, 300 + i, {}); a.mount = tram.seats[i + 1]; a.mountYaw = 0; pass.push(a); }
    this.passengers = pass;
    await this.useOnce({ pos: V(155, 5.55, -124.6), radius: 3.5, label: 'Board the tram' });
    P.sit({ obj: tram.seats[0], pose: 'sit' });
    // the ride is shot from inside the car: the shots ride along with it
    const cp = (x, y, z) => () => g.engine.cityRoot.worldToLocal(tram.car.localToWorld(V(x, y, z)));
    this.enter(true);
    this.objective(null);
    g.director.shot({ pos: cp(-0.55, 1.8, 4.9), look: cp(0.7, 1.05, -2.6), fov: 52, to: { pos: cp(-0.5, 1.75, 4.2) }, dur: 7 });
    await this.wait(0.8);
    const ride = tram.depart();
    tram.riding = true;
    await this.wait(2.5);
    this.bark('WORKER', '—they say Vesper\'s three days north of us.', 3.2, pass[0]);
    await this.wait(3.6);
    // past Rook's shoulder, out through the far windows as the city slides by
    g.director.shot({ pos: cp(1.25, 1.6, -2.55), look: cp(-2.6, 1.05, -3.6), fov: 50, to: { pos: cp(1.25, 1.58, -2.75), look: cp(-2.6, 1.0, -4.2) }, dur: 8 }); // over Rook's shoulder (seated head ~1.25)
    this.bark('WORKER', 'Vesper. All glass and greenhouses. I heard they grow real oranges.', 3.6, pass[1]);
    await this.wait(4);
    this.bark('WORKER', 'I heard they ration the air.', 2.6, pass[0]);
    await this.wait(3);
    // Rook, watching the drop
    P.anim.lookTarget = tram.car.localToWorld(V(-6, 0.6, 2));
    { const root = g.engine.cityRoot, q = new THREE.Quaternion();
      const head = () => root.worldToLocal(P.char.bones.head.getWorldPosition(V(0, 0, 0))).add(V(0, 0.12, 0));
      const fwd = () => { P.char.group.getWorldQuaternion(q); const f = V(0, 0, 1).applyQuaternion(q); f.y = 0; return f.normalize(); };
      const side = () => { const f = fwd(); return V(f.z, 0, -f.x); };
      // framed from Rook's own head and facing (he stays upright while the car pitches on the descent)
      g.director.shot({ pos: () => head().addScaledVector(fwd(), 1.05).addScaledVector(side(), 0.3).add(V(0, 0.04, 0)), look: head, fov: 38 }); }
    g.audio.chime(tram.car.position.clone());
    this.say('PA', 'Next stop: Engineering. Please mind the gap. The gap is three hundred meters.', { radio: true, wait: false, dur: 4.4 });
    await this.waitFor(() => tram.s > tram.len * 0.62);
    g.hud.location('THE LOWER DECKS', 'MERIDIAN · ENGINEERING', 5);
    this.populateLower();
    await ride;
    tram.riding = false; P.anim.lookTarget = null;
    P.stand(V(128, LD.floor + 1.1, -232.2)); P.yaw = 0; g.camera.snapBehind(0.3, 0.1);
    this.exit();
    pass.forEach(a => { a.mount = null; a.place(V(118 + Math.random() * 10, LD.floor + 1.1, -232.6)); a.pose('loco'); a.walker = false; a.goTo(V(150 + Math.random() * 20, LD.floor, -222), 1.3); });
    g.state.checkpoint = 'lower'; g.state.save(g);
  }

  async beat_lower(id) {
    const g = this.game, P = g.player, C = this.cast, L = g.districts.lower;
    if (!g.crowd.actors.some(a => a.pos.y < -20)) { this.populateLower(); this.equip(false); P.teleport(V(128, LD.floor + 1.1, -232.2), 0); g.camera.snapBehind(0.3, 0.1); g.hud.fade(0, 0.8); }
    P.relaxed = true; g.weapons.locked = true;
    g.tram.s = g.tram.len - 0.01; g.tram.state = 'docked';
    this.objective('See Tomas in Engine Control', 'The glass gallery above the Underwell.', () => C.tomas.pos);
    show(C.tomas, L.spots.tomas.pos.clone(), L.spots.tomas.yaw); C.tomas.activity('console');
    // optional: look into the Underwell
    this.trigger(() => P.pos.distanceTo(V(75, LD.floor, -190)) < 19, () => { this.say('ROOK', 'Every time. Every single time it makes my stomach drop.', { wait: false, dur: 3 }); });
    await this.useOnce({ getPos: () => C.tomas.pos, radius: 2.6, label: 'Talk to Tomas' });
    C.tomas.activity(null);
    await this.convo(C.tomas, [['TOMAS', 'You\'re late.', { emotion: 'tired', gesture: 0.2 }]]);
    const v1 = await this.pick(C.tomas, [
      { text: 'You ate my noodles.', tone: 'sharp', value: 'sharp' },
      { text: 'Did you sleep at all?', tone: 'warm', value: 'warm' },
      { text: 'Bram said Pylon Seven.', tone: 'professional', value: 'pro' },
    ]);
    if (v1 === 'sharp') await this.convo(C.tomas, [['TOMAS', '…They were going to waste. You eat like a bird.', { emotion: 'tired' }], ['ROOK', 'Birds eat constantly.'], ['TOMAS', 'Then you eat like a Runner. Late, and standing up.', { emotion: 'amused' }]]);
    if (v1 === 'warm') { await this.convo(C.tomas, [['TOMAS', 'I slept.', { emotion: 'tired' }], ['ROOK', 'Where?'], ['TOMAS', '…Here. Briefly. Leg Two doesn\'t sleep, so I don\'t.', { emotion: 'sad' }]]); g.state.adjust('tomas', 'warmth', 1); }
    if (v1 === 'pro') await this.convo(C.tomas, [['TOMAS', 'Good. Someone\'s listening.', { emotion: 'neutral' }]]);
    await this.convo(C.tomas, [
      ['TOMAS', 'Leg Two is drifting. Harmonic drift in the hip stride — four hundredths of a degree.', { emotion: 'focused', gesture: 0.7 }],
      ['ROOK', 'That sounds like nothing.'],
      ['TOMAS', 'Four hundredths at the hip is two meters at the foot. Two meters, every step. A thousand steps and she starts to limp.'],
      ['TOMAS', 'And a limping city—'],
      ['ROOK', '—falls over. I know.'],
      ['TOMAS', 'Then you know why I don\'t sleep.', { emotion: 'tired' }],
      ['TOMAS', 'The stabilizer relay at Pylon Seven is throwing faults. The couplings have shaken loose. Re-seat them, come home. Routine.'],
      ['ROOK', 'You always say routine.'],
      ['TOMAS', 'And you always come back. Let\'s keep that streak.', { emotion: 'neutral' }],
      ['TOMAS', '…Bram invited you to his stew?', { emotion: 'amused' }],
      ['ROOK', 'Eight bells. He said to drag you.'],
      ['TOMAS', 'I\'ll try.', { emotion: 'tired' }],
    ]);
    const v2 = await this.pick(C.tomas, [{ text: 'Don\'t try. Come.', tone: 'push', value: 'push' }, { text: 'Sure.', tone: 'let it go', value: 'let' }]);
    if (v2 === 'push') { await this.convo(C.tomas, [['TOMAS', '…All right. Eight bells.', { emotion: 'sad' }]]); g.state.flag('tomasPromisedDinner'); g.state.adjust('tomas', 'trust', 1); }
    else await this.convo(C.tomas, [['TOMAS', 'Rook—', { emotion: 'worried' }], ['TOMAS', '…be careful out there.', { emotion: 'sad' }]]);
    // Harrow on the console
    g.audio.ui('radio');
    await this.convo(C.tomas, [
      ['HARROW', 'Engineering, this is Commander Harrow. As of this morning, stride telemetry from Leg Two is to be logged with my office.', { radio: true }],
      ['HARROW', 'Any irregularities come to me first. Before Council. Before anyone.', { radio: true }],
      ['TOMAS', 'Understood, Commander.', { emotion: 'angry', gesture: 0.1 }],
      ['ROOK', 'Since when does Security read stride telemetry?'],
      ['TOMAS', 'Since Harrow decided it should.', { emotion: 'tired' }],
    ]);
    this.exit();
    C.tomas.activity('console'); C.tomas.lookAt(null);
    g.state.meet('Commander Harrow', 'Head of Meridian Security. A voice on the radio this morning, asking for Leg Two\'s telemetry before Council sees it.');
    g.state.journal('Tomas says Leg Two is drifting — two meters at the foot, every step. I\'m to re-seat the couplings at Pylon Seven.');
    g.state.journal('Commander Harrow has ordered Leg Two\'s telemetry routed to Security first.');
    this.objective('Get your tether from Nia', 'Runner Bay, east end of the Lower Decks.', () => C.nia.pos);
    g.state.checkpoint = 'hangar'; g.state.save(g);
  }

  async beat_hangar(id) {
    const g = this.game, P = g.player, C = this.cast, L = g.districts.lower;
    if (!g.crowd.actors.some(a => a.pos.y < -20)) { this.populateLower(); this.equip(false); P.teleport(V(150, LD.floor, -200), Math.PI / 2); g.camera.snapBehind(Math.PI / 2, 0.1); g.hud.fade(0, 0.8); show(C.tomas, L.spots.tomas.pos.clone(), L.spots.tomas.yaw); C.tomas.activity('console'); }
    P.relaxed = true; g.weapons.locked = true;
    this.objective('Get your tether from Nia', 'Runner Bay, east end of the Lower Decks.', () => C.nia.pos);
    show(C.nia, L.spots.niaTinker.pos.clone(), L.spots.niaTinker.yaw); C.nia.pose('tinker');
    // tools clank from under the Mule
    const clankT = g.add(() => { if (Math.random() < 0.01) g.audio.clank(V(180, LD.floor + 0.5, -176), 0.3, 1.4); });
    this.trigger(() => P.pos.distanceTo(C.nia.pos) < 9, () => this.bark('NIA', 'If that\'s Bram — I already told you, the winch doesn\'t need "more grease", it needs a new winch.', 4.5, C.nia));
    await this.useOnce({ getPos: () => C.nia.pos.clone().add(V(-1.0, 0, -0.6)), radius: 2.8, label: 'Talk to Nia' });
    clankT();
    // she rolls out from under the Mule
    this.enter(true);
    g.director.shot({ pos: V(175.2, LD.floor + 1.25, -179.2), look: V(178.1, LD.floor + 0.55, -176.8), fov: 42, to: { pos: V(175.0, LD.floor + 1.55, -179.5), look: V(177.8, LD.floor + 1.1, -176.8) }, dur: 4.5 });
    // Rook steps up to the lift deck while she slides out on the creeper, sits up and stands
    const rook = this.rookWalk(V(176.3, LD.floor, -177.7), V(177.8, LD.floor, -176.8));
    await C.nia.rollOut(0.8, 0.55);
    await rook;
    C.nia.face(P.pos.clone());
    const options = [
      { text: 'It\'s me. I need more grease.', tone: 'tease', value: 'tease' },
      { text: 'It\'s Rook.', tone: 'plain', value: 'plain' },
    ];
    if (g.state.has('honeyKnot')) options.push({ text: 'I brought you a honey knot.', tone: 'gift', value: 'gift' });
    const v1 = await this.pick(C.nia, options);
    C.nia.lookAtPlayer();
    if (v1 === 'tease') { await this.convo(C.nia, [['NIA', 'Everyone\'s a comedian before nine.', { emotion: 'neutral' }]]); }
    if (v1 === 'plain') { await this.convo(C.nia, [['NIA', 'Oh, good. Someone who\'ll hand me things.', { emotion: 'amused' }]]); }
    if (v1 === 'gift') { await this.convo(C.nia, [['NIA', '…From Sun Loaf?', { emotion: 'surprised' }], ['ROOK', 'From Sun Loaf.'], ['NIA', 'You\'re forgiven for whatever you did to your tether.', { emotion: 'happy' }]]); g.state.adjust('nia', 'warmth', 1); g.state.adjust('nia', 'spark', 1); g.state.flag('gaveHoneyKnot'); }
    if (g.state.has('tea')) await this.convo(C.nia, [['NIA', 'And you smell like that awful smoky tea.', { emotion: 'amused' }], ['ROOK', 'You love that tea.'], ['NIA', 'I tolerate that tea.']]);
    // the tether
    C.nia.goTo(V(171.6, LD.floor, -183.2), 1.4);
    g.director.shot({ pos: V(173.6, LD.floor + 1.7, -180.6), look: V(171.4, LD.floor + 1.0, -184), fov: 42 });
    await this.rookWalk(V(172.6, LD.floor, -182.2), V(171.6, LD.floor, -183.2));
    await this.waitFor(() => !C.nia.target);
    C.nia.face(P.pos.clone());
    L.benchTether.visible = false;
    await this.convo(C.nia, [
      ['NIA', 'Speaking of. Your tether.', { gesture: 0.6 }],
      ['NIA', 'What did you do to it this time? The coil was cooked. Not warm, Rook. *Cooked.* Did you punch a train?', { emotion: 'angry', gesture: 1 }],
    ]);
    const v2 = await this.pick(C.nia, [
      { text: 'In my defense, the train started it.', tone: 'joke', value: 'joke' },
      { text: 'Caught a falling cargo pod. It was bigger than I thought.', tone: 'honest', value: 'honest' },
      { text: 'Your calibration\'s off. It runs hot.', tone: 'blame', value: 'blame' },
    ]);
    if (v2 === 'joke') { await this.convo(C.nia, [['NIA', 'Of course it did.', { emotion: 'amused' }]]); g.state.adjust('nia', 'warmth', 1); }
    if (v2 === 'honest') {
      await this.convo(C.nia, [['NIA', '…You caught a cargo pod. With your arm.', { emotion: 'surprised' }], ['ROOK', 'With the tether.'], ['NIA', 'Attached to your arm.', { emotion: 'worried' }]]);
      // she checks Rook's wrist
      g.director.shot({ pos: V(173.4, LD.floor + 1.3, -181.0), look: V(172.2, LD.floor + 1.0, -182.7), fov: 30 });
      C.nia.anim.point = 0.6; await this.wait(1.2); C.nia.anim.point = 0;
      await this.convo(C.nia, [['NIA', 'Don\'t do that again.', { emotion: 'sad' }], ['NIA', '…Or do it, but warn me, so I can be impressed in advance.', { emotion: 'shy' }]]);
      g.state.adjust('nia', 'trust', 1); g.state.adjust('nia', 'spark', 1);
    }
    if (v2 === 'blame') {
      await this.convo(C.nia, [
        ['NIA', 'My calibration.', { emotion: 'angry' }],
        ['NIA', 'My calibration has kept your arm attached to your shoulder for three years. You run it into overload because you think the warning tone is a suggestion.', { emotion: 'angry', gesture: 1 }],
        ['ROOK', 'It is a suggestion.'],
        ['NIA', 'It\'s a *scream*, Rook.', { emotion: 'angry' }],
      ]);
      g.state.flag('arguedWithNia'); g.state.adjust('nia', 'warmth', -1);
    }
    // she clips it on
    g.director.shot({ pos: V(173.0, LD.floor + 1.25, -181.3), look: V(172.5, LD.floor + 1.0, -182.3), fov: 28, to: { pos: V(172.9, LD.floor + 1.2, -181.5) }, dur: 2.5 });
    this.equip(true);
    g.audio.reloadPart('in'); g.audio.cellChime(1);
    g.tether.cells = 0;
    await this.wait(0.9);
    await this.convo(C.nia, [
      ['NIA', 'Three cells, rewound. Capture, release. Try not to fill it from anything bigger than you.', { emotion: 'neutral' }],
      ['ROOK', 'Everything\'s bigger than me.'],
      ['NIA', 'Then try harder.', { emotion: 'amused' }],
    ]);
    // Bram arrives
    show(C.bram, V(166, LD.floor, -170), Math.PI);
    C.bram.goTo(V(170.6, LD.floor, -180.4), 1.7);
    await this.waitFor(() => !C.bram.target);
    C.bram.face(P.pos.clone()); C.bram.lookAtPlayer(); C.nia.lookAt(() => C.bram.head);
    await this.convo(C.bram, [
      ['BRAM', 'Ah, good, she hasn\'t killed you. Nia — eight bells, tonight, my stew.', { emotion: 'happy', gesture: 1 }],
      ['NIA', 'Is it the stew?', { emotion: 'worried' }],
      ['BRAM', 'Why does everybody say it like that?', { emotion: 'angry' }],
      ['NIA', 'I\'ll bring bread. Real bread. As a precaution.', { emotion: 'amused' }],
      ['BRAM', 'Range, Rook. Council says every Runner recerts every season, and you\'re two days over. Ten minutes. Then you\'re on the Spine.', { gesture: 0.8 }],
    ]);
    g.state.meet('Nia Rell', 'Mechanic, pilot, occasional Runner. Grew up between settlements. Fixed my tether. Again.');
    g.state.journal('Nia rewound my tether. Bram\'s invited her to the stew too. She\'s bringing bread. As a precaution.');
    this.exit();
    C.nia.lookAt(null); C.bram.lookAt(null);
    // she walks back to the Mule and rolls back under it
    { const T = L.spots.niaTinker, out = T.pos.clone().add(V(Math.sin(T.yaw) * 0.8, 0, Math.cos(T.yaw) * 0.8));
      C.nia.goTo(out, 1.2).then(() => { C.nia.face(out.clone().add(V(Math.sin(T.yaw), 0, Math.cos(T.yaw)))); return this.waitGame(0.8); }).then(() => { C.nia.faceTarget = null; C.nia.yaw = T.yaw; return C.nia.rollIn(0.8, 0.55); }); }
    C.bram.goTo(V(160, LD.floor, -228), 1.6);
    this.objective('Recertify at the range', 'South corridor, past the lockers.', V(158, LD.floor, -240));
    g.state.checkpoint = 'range'; g.state.save(g);
  }

  // wait for every plate to drop; if one stays up long after the others (stuck, unreachable), Bram
  // waves it off and the drill moves on, so the range can never soft-lock the game
  async platesDown(targets) {
    const g = this.game; let lastDown = g.time, down = 0;
    await this.waitFor(() => {
      const n = targets.filter(t => !t.up).length; if (n !== down) { down = n; lastDown = g.time; }
      return n === targets.length || (n > 0 && g.time - lastDown > 30);
    });
    if (targets.some(t => t.up)) { targets.forEach(t => { t.up = false; }); await this.radio('BRAM', 'Close enough. That one\'s been sticking for a year.', { wait: false, dur: 2.6 }); await this.wait(2.7); }
  }

  async beat_range(id) {
    const g = this.game, P = g.player, C = this.cast, L = g.districts.lower;
    if (C.nia.hidden) { this.populateLower(); show(C.nia, L.spots.niaTinker.pos.clone(), L.spots.niaTinker.yaw); C.nia.pose('tinker'); P.teleport(V(163, LD.floor, -212), Math.PI); g.camera.snapBehind(Math.PI, 0.1); g.hud.fade(0, 0.8); L.benchTether.visible = false; }
    this.equip(true); P.relaxed = true; g.weapons.locked = true;
    this.objective('Recertify at the range', 'South corridor, past the lockers.', V(158, LD.floor, -240));
    show(C.bram, V(159.4, LD.floor, -238.5), -Math.PI / 2 - 0.6); C.bram.anim.armsCrossed = 1; C.bram.lookAtPlayer();
    await this.near(V(158, LD.floor, -240), 4);
    g.weapons.locked = false; g.weapons.give('pistol'); g.weapons.give('carbine'); g.weapons.select('pistol');
    P.relaxed = false;
    await this.radio('BRAM', 'Kestrel first. Five plates. Breathe out. Squeeze. Don\'t yank it like it owes you money.', { wait: false, dur: 4.4 });
    g.hud.hint('shoot', true);
    // --- pop-up plates
    const R = L.range, targets = [];
    const mkPlate = (x, y, z, moving = false) => {
      const grp = new THREE.Group(); grp.position.set(x, y, z); g.engine.cityRoot.add(grp);
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.05, 20), new THREE.MeshStandardMaterial({ color: 0xd8d0c0, roughness: 0.5, metalness: 0.4 }));
      plate.rotation.z = Math.PI / 2; plate.position.y = 0.9; grp.add(plate);
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.2, 20), new THREE.MeshBasicMaterial({ color: 0xc8392a, side: THREE.DoubleSide })); ring.rotation.y = Math.PI / 2; ring.position.set(0.03, 0.9, 0); grp.add(ring);
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.08), new THREE.MeshStandardMaterial({ color: 0x3a3a3a })); post.position.y = 0.45; grp.add(post);
      const t = { grp, up: true, moving, x0: z, amp: moving ? 1.0 : 0 };
      const kin = g.physics.addKinematic(grp, [{ type: 'box', hx: 0.06, hy: 0.4, hz: 0.4, pos: { x: 0, y: 0.9, z: 0 }, meta: { onShot: () => { if (!t.up) return; t.up = false; g.audio.clank(grp.position.clone().add(V(0, 0.9, 0)), 0.8, 1.6); g.hud.hitmarker(true); } } }]);
      t.kin = kin; targets.push(t); return t;
    };
    this.rangeCleanup?.();
    // one row at one depth (so no plate can hide another from the firing line), south of the leap platform (z > -239.7)
    for (let i = 0; i < 5; i++) mkPlate(138.8, LD.floor, -247.2 + i * 1.5);
    const nextPlate = () => { const t = targets.find(t => t.up); return t ? t.grp.position.clone().add(V(0, 0.9, 0)) : null; };
    this.objective('Recertify: Kestrel', 'Drop all five plates. RMB to aim, LMB to fire.', nextPlate);
    const anim = g.add((dt) => { for (const t of targets) { t.grp.rotation.z = damp(t.grp.rotation.z, t.up ? 0 : Math.PI / 2, 10, dt); if (t.moving && t.up) t.grp.position.z = t.x0 + Math.sin(g.time * 1.4 + t.x0) * t.amp; } });
    await this.platesDown(targets);
    await this.radio('BRAM', 'Good. Halyard next. Short bursts — she climbs.', { wait: false, dur: 3 });
    g.weapons.select('carbine');
    this.objective('Recertify: Halyard', 'Drop the three moving plates. Short bursts.', nextPlate);
    targets.forEach(t => { t.grp.removeFromParent(); g.physics.removeKinematic(t.kin); });
    targets.length = 0;
    for (let i = 0; i < 3; i++) mkPlate(145.5, LD.floor, -245.5 + i * 2.5, true); // a row east of the platform, each swinging ±1 m
    await this.platesDown(targets);
    // --- tether drill: a swinging weight and a target plate
    await this.radio('BRAM', 'Now the tether. See the weight? It\'s swinging. Hold on it — feel the cells fill.', { wait: false, dur: 4.2 });
    g.hud.hint('capture', true);
    this.objective('Recertify: Tether', 'Hold the tether on the swinging weight to fill a cell.', () => V(150, -35.3, -238.6));
    // the weight hangs north of the line to the berm plate, so it never sits between Rook and the plate
    const pend = new THREE.Group(); pend.position.set(150, -29, -238.6); g.engine.cityRoot.add(pend);
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 6, 6), g.materials.cable); rope.position.y = -3; pend.add(rope);
    const bob = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 12), new THREE.MeshStandardMaterial({ color: 0x8a6a4a, metalness: 0.7, roughness: 0.4 })); bob.position.y = -6.3; pend.add(bob);
    let ang = 0.42, angV = 0, drainedNow = false;
    // a motor keeps it swinging (between ~0.3 and 0.45 rad) so there is always momentum to take
    const pendTick = g.add((dt) => {
      angV += -9.8 / 6.3 * Math.sin(ang) * dt;
      const E = 0.5 * (angV * 6.3) ** 2 + 9.8 * 6.3 * (1 - Math.cos(ang)), Emin = 9.8 * 6.3 * (1 - Math.cos(0.3)), Emax = 9.8 * 6.3 * (1 - Math.cos(0.45));
      if (!drainedNow && E < Emin) angV += (angV >= 0 ? 1 : -1) * 0.9 * dt;
      if (E > Emax) angV *= 1 - 0.8 * dt;
      ang += angV * dt; pend.rotation.x = ang; drainedNow = false;
    });
    let drained = 0;
    const offP = g.tether.register({ kind: 'machine', label: 'Weight', captureOnly: true, getPos: () => bob.getWorldPosition(new THREE.Vector3()), getVel: () => V(0, 0, angV * 6.3), radius: 0.6,
      capture: (dt) => { drainedNow = true; const sp = Math.abs(angV) * 6.3; const take = Math.min(sp, 8 * dt); angV *= sp > 0.01 ? (sp - take) / sp : 0; drained += dt; return 300 * take + 260 * dt; }, push: () => {} });
    await this.waitFor(() => g.tether.cells >= 1);
    await this.radio('BRAM', 'There. Now throw it — release into the plate on the berm.', { wait: false, dur: 3.2 });
    g.hud.hint('release', true);
    this.objective('Recertify: Tether', 'Release the stored momentum into the plate on the berm.', () => V(138.45, LD.floor + 3.2, -245.5));
    // big hinged plate
    const big = new THREE.Group(); big.position.set(138.45, LD.floor + 2, -245.5); g.engine.cityRoot.add(big); // in front of the berm face (x 138)
    const bp = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.4, 2.4), new THREE.MeshStandardMaterial({ color: 0xc8a030, metalness: 0.5, roughness: 0.5 })); bp.position.y = 1.2; big.add(bp);
    let bigHit = false;
    const offB = g.tether.register({ kind: 'special', label: 'Target plate', releaseOnly: true, getPos: () => big.position.clone().add(V(0, 1.2, 0)), getVel: () => V(), radius: 1.2, capture: () => 0, push: (imp, cells) => { bigHit = true; g.audio.clank(big.position, 2, 0.6); g.camera.shake(0.2); } });
    let bigRot = 0;
    const bigTick = g.add((dt) => { bigRot = damp(bigRot, bigHit ? -1.3 : 0, 6, dt); big.rotation.z = bigRot; });
    await this.waitFor(() => bigHit);
    await this.wait(0.8);
    await this.radio('BRAM', 'Lovely. Last one. Jump off the floor, and in the air — spend a cell. Leap for the high platform.', { wait: false, dur: 4.4 });
    g.hud.hint('leap', true);
    this.objective('Recertify: Kinetic leap', 'Jump, then spend a cell in the air to reach the high platform.', () => V(141, LD.floor + 3.2, -238.2));
    // a cell is always there to take: the weight's motor keeps it swinging
    await this.waitFor(() => P.pos.y > LD.floor + 2.9 && P.pos.distanceTo(V(141, LD.floor + 3.2, -238.2)) < 3);
    pendTick(); bigTick(); anim(); offP(); offB();
    [pend, big].forEach(o => o.removeFromParent());
    this.rangeCleanup = () => targets.forEach(t => { t.grp.removeFromParent(); g.physics.removeKinematic(t.kin); });
    this.rangeCleanup();
    await this.radio('BRAM', 'Good. You\'re now certified to do something stupid in a professional capacity.', { wait: false, dur: 4 });
    g.state.flag('recertified');
    await this.wait(2);
    C.bram.anim.armsCrossed = 0; C.bram.lookAt(null);
    await this.radio('BRAM', 'Spine\'s through the bay doors. I\'ll be on comms. Nia too, whether she admits it or not.', { wait: false, dur: 4.2 });
    this.objective('Head out onto the Spine', 'Through the bay doors. Pylon Seven, Leg Two.', V(195, LD.floor, -190));
    g.weapons.holster();
    // open the bay doors as Rook approaches
    hide(C.bram);
    await this.near(V(185, LD.floor, -190), 9);
    g.state.checkpoint = 'spine'; g.state.save(g);
  }

  async beat_spine(id) {
    const g = this.game, P = g.player, C = this.cast, L = g.districts.lower, S = g.districts.spine;
    if (P.pos.distanceTo(V(185, LD.floor, -190)) > 12) { this.equip(true, true); this.populateLower(); show(C.nia, L.spots.niaTinker.pos.clone(), L.spots.niaTinker.yaw); C.nia.pose('tinker'); P.teleport(V(184, LD.floor, -190), Math.PI / 2); g.camera.snapBehind(Math.PI / 2, 0.05); L.benchTether.visible = false; g.hud.fade(0, 0.6); }
    this.equip(true, true); P.relaxed = false; g.weapons.locked = false;
    const retry = this.retrying === 'spine'; this.retrying = null;
    if (retry) { // after a fall on the course: back at the start of the walkway, doors already open, no replay
      this.setBay(1); P.teleport(V(202.6, SP.A, -204), Math.PI); g.camera.snapBehind(Math.PI, 0.15); g.audio.music.play('exterior', 2);
    } else {
      // ---- the doors open: wind, light, the world
      this.enter(true);
      g.audio.metalStress(V(196, -32, -190), 3);
      g.audio.music.play('exterior', 3);
      const t0 = g.time;
      const doors = g.add(() => { const k = clamp((g.time - t0) / 5, 0, 1); this.setBay(ease.inOutCubic(k)); g.windMul = 1 + k * 3; });
      g.director.shot({ pos: V(186, LD.floor + 2.2, -186), look: V(196, LD.floor + 3, -190), fov: 50, to: { pos: V(189, LD.floor + 2.0, -188), look: V(200, LD.floor + 1, -191) }, dur: 5 });
      const toDoor = this.rookWalk(V(188, LD.floor, -190), V(196, LD.floor, -190), 1.2); // walks up as they open
      await this.wait(5); doors(); g.windMul = 1;
      await toDoor;
      // the reveal: step out past the hull and the world opens below
      g.audio.music.sting('reveal');
      P.setScripted(true);
      const walk = g.add((dt) => { if (P.pos.x < 205) { P.pos.x += dt * 1.4; P.anim.speed = 1.4; P.placeScripted(P.pos, Math.PI / 2 - 0.25); } else P.anim.speed = 0; });
      // push out past Rook as he steps onto the apron, toward the open horizon
      // follow Rook out through the tunnel, then rise past him as he reaches the apron
      g.director.shot({ pos: () => P.pos.clone().add(V(-3.2, 1.9, 0.9)), look: () => P.pos.clone().add(V(6, 1.2, -0.4)), fov: 52 });
      await this.wait(4.2);
      g.director.shot({ pos: P.pos.clone().add(V(-3.2, 1.9, 0.9)), look: P.pos.clone().add(V(6, 1.2, -0.4)), fov: 52, to: { pos: V(215.5, LD.floor + 3.2, -185.5), look: V(420, LD.floor - 95, -215), fov: 60 }, dur: 7, ease: ease.inOutSine, cut: false });
      g.hud.location('THE SPINE', 'MERIDIAN · EXTERIOR, STARBOARD', 6);
      await this.wait(4.8);
      // then a long crane-out over the drop: the whole flank, and Leg Two mid-stride
      g.director.shot({ pos: V(215.5, LD.floor + 3.2, -185.5), look: V(420, LD.floor - 95, -215), fov: 60, to: { pos: V(318, LD.floor + 22, -112), look: V(178, LD.floor - 175, -236), fov: 50 }, dur: 9, ease: ease.inOutSine, cut: false });
      await this.radio('NIA', 'Comms check. You hear me?', { dur: 2.2 });
      await this.radio('ROOK', 'Loud and clear.', { dur: 1.6 });
      await this.radio('NIA', 'Good. Your vitals look disgustingly calm.', { dur: 2.6 });
      await this.radio('BRAM', 'That\'s my Runner.', { dur: 1.8 });
      walk(); P.setScripted(false); P.teleport(P.pos.clone(), Math.PI); g.camera.snapBehind(Math.PI, 0.15); // (cut from the crane shot)
    }
    this.exit();
    g.state.journal('Out on the Spine. From up here you can see the whole Sallow — and the trail of our own footprints behind us.');
    this.objective('Reach Pylon Seven', 'Follow the Spine walkway forward, toward Leg Two.', S.spots.vantage);
    g.hud.hint('jump', true);
    // traversal chatter
    this.trigger(() => P.pos.z < -207 && P.pos.y > -40, () => this.radio('NIA', 'Walkway\'s broken just ahead — little hop, take a run at it. Or hang off the amber rail on the hull, if you like heights.', { wait: false, dur: 4.8 }).then(() => this.radio('ROOK', 'Why would you *say* that?', { wait: false, dur: 2 })));
    this.trigger(() => P.state === 'hang', () => this.radio('BRAM', 'Hands like a crane, kid.', { wait: false, dur: 2 }));
    this.trigger(() => P.pos.z < -228 && P.pos.y > -40, () => { this.radio('BRAM', 'Maintenance cradle\'s on auto. Ride it, or latch the anchor above the far side. Or steal its swing and jump — Nia hates that one.', { wait: false, dur: 5.5 }).then(() => this.radio('NIA', 'I hate all of them.', { wait: false, dur: 1.8 })); g.hud.hint('latch'); g.hud.hint('leap'); });
    this.trigger(() => P.pos.z < -258 && P.pos.y > -40, () => g.hud.hint('climb'));
    this.trigger(() => P.pos.z < -276 && P.pos.y < -38, () => {});
    // fail-safe for falls on the course: respawn at the last stable spot instead of reloading
    await this.waitFor(() => P.pos.distanceTo(S.spots.vantage) < 3.5 || (P.pos.y < -45 && P.pos.z < -262));
    g.state.checkpoint = 'galleryB'; g.state.save(g);
  }

  async beat_galleryB(id) {
    const g = this.game, P = g.player, S = g.districts.spine;
    if (P.pos.distanceTo(S.spots.vantage) > 8 && P.pos.y > -45) { this.equip(true, true); P.teleport(S.spots.vantage.clone(), Math.PI); g.camera.snapBehind(Math.PI, 0.25); g.hud.fade(0, 0.6); }
    this.equip(true, true); P.relaxed = false; g.weapons.locked = false;
    // the scavs
    const E = g.enemies;
    const l1 = E.spawn('leech', S.spots.leech1, { yaw: -Math.PI / 2 }); const l2 = E.spawn('leech', S.spots.leech2, { yaw: -Math.PI / 2 });
    const g1 = E.spawn('gnat', S.spots.gnat1, {}); const g2 = E.spawn('gnat', S.spots.gnat2, {}); const g3 = E.spawn('gnat', S.spots.gnat3, {});
    [g1, g2, g3].forEach(e => (e.prefDist = 8 + Math.random() * 4));
    await this.wait(0.5);
    await this.radio('NIA', 'Rook. Movement on the cable trunks. Scav drones — leeches and gnats. They\'re cutting copper.', { wait: false, dur: 4.6 });
    await this.wait(4.7);
    await this.radio('BRAM', 'Bold little things. Clear them off. The leeches haven\'t seen you — come in quiet if you want.', { wait: false, dur: 4.6 });
    g.hud.hint('crouch');
    this.objective('Clear the scavs off the cable trunks', 'Leeches are armored in front — hit the canister, or throw them off the edge.', () => g.enemies.alive.sort((a, b) => a.pos.distanceTo(P.pos) - b.pos.distanceTo(P.pos))[0]?.pos);
    let combatStarted = false;
    const music = g.add(() => { if (!combatStarted && E.anyAware) { combatStarted = true; g.audio.music.play('combat', 1); } });
    let killLine = 0;
    const offK = g.events.on('enemy:killed', (e) => {
      const lines = [['NIA', 'One down.'], ['BRAM', 'Ha! That\'s the stuff.'], ['NIA', 'Watch the gnats — they telegraph before they fire.'], ['BRAM', 'Off the edge! Beautiful.']];
      if (e.pos.y < -60) { this.radio('BRAM', 'Off the edge! Beautiful.', { wait: false, dur: 2 }); return; }
      const l = lines[killLine++ % 3]; this.radio(l[0], l[1], { wait: false, dur: 2.4 });
    });
    await this.waitFor(() => E.alive.length === 0);
    music(); offK();
    g.audio.music.play('exterior', 3);
    await this.wait(0.8);
    await this.radio('BRAM', 'Clean. Maybe you\'ll make dinner after all.', { wait: false, dur: 3 });
    g.state.journal('Scav drones were stripping the cable trunks on Gallery B. Not any more.');
    this.objective('Take the cargo lift down to Pylon Seven', 'South end of the gallery.', S.spots.liftPanel);
    // the lift
    await this.useOnce({ pos: S.spots.liftPanel, radius: 2.2, label: 'Operate the cargo lift' });
    if (P.pos.distanceTo(S.lift.position) > 2.8) P.teleport(S.lift.position.clone().add(V(0.6, 0.2, 0.6)), Math.PI);
    g.audio.clank(S.lift.position, 1.2, 0.8); g.audio.setBed('lift', 'machinery', 0.4, 0.5);
    const top = S.liftTop, bot = S.liftBottom, t0 = g.time, dur = 16;
    const lift = g.add(() => { const k = clamp((g.time - t0) / dur, 0, 1); S.lift.position.y = lerp(top, bot, ease.inOutSine(k)); });
    await this.wait(3.5);
    await this.radio('NIA', 'There she is. Leg Two.', { wait: false, dur: 2.2 });
    await this.wait(2.6);
    await this.radio('ROOK', 'She sounds wrong.', { wait: false, dur: 1.8 });
    await this.wait(2.2);
    await this.radio('NIA', 'She sounds like she\'s carrying the whole city on one bad knee. Which she is.', { wait: false, dur: 4 });
    await this.waitFor(() => g.time - t0 > dur);
    lift(); g.audio.setBed('lift', 'machinery', 0, 0.5); g.audio.clank(S.lift.position, 1.5, 0.6);
    g.state.checkpoint = 'relay'; g.state.save(g);
  }

  async beat_relay(id) {
    const g = this.game, P = g.player, S = g.districts.spine;
    S.lift.position.y = S.liftBottom;
    if (P.pos.y > -80) { this.equip(true, true); P.teleport(S.spots.deckArrive.clone(), 0); g.camera.snapBehind(0.3, 0.1); g.hud.fade(0, 0.6); }
    this.equip(true, true); P.relaxed = false; g.weapons.locked = false;
    g.audio.music.play('exterior', 2);
    this.objective('Re-seat the three couplings on Pylon Seven', 'Capture momentum from Leg Two\'s hip flywheel, release into each coupling.', () => { const c = S.couplings.find(c => !c.seated); return c ? g.engine.cityRoot.worldToLocal(c.lamp.getWorldPosition(V(0, 0, 0))) : null; });
    await this.radio('TOMAS', 'You\'re at Pylon Seven. Three couplings — they need a jolt to seat. Your tether can give them one.', { wait: false, dur: 4.6 });
    await this.wait(4.7);
    await this.radio('TOMAS', 'Take it from the hip flywheel. There\'s plenty to spare.', { wait: false, dur: 3 });
    // flywheel target
    const fly = S.flywheel;
    const offF = g.tether.register({ kind: 'machine', label: 'Hip flywheel', captureOnly: true, noLos: true, big: true, priority: 1, radius: 8, range: 95, getPos: () => fly.position.clone().add(V(2, 0, 0)), getVel: () => V(0, 3, 0),
      capture: (dt) => { g.city.shakeAmount = Math.max(g.city.shakeAmount, 0.15); return 1500 * dt; }, push: () => {} });
    const offs = S.couplings.map((c, i) => g.tether.register({ kind: 'special', label: 'Coupling', releaseOnly: true, priority: 3, radius: 0.6,
      enabled: () => !c.seated, getPos: () => c.g.position.clone().add(V(0, 0.9, 0)), getVel: () => V(), capture: () => 0,
      push: () => { c.seated = true; g.audio.clank(c.g.position, 2, 0.9); g.fx.sparks(c.g.position.clone().add(V(0, 1, 0)), V(0, 1, 0), 20, 5); g.camera.shake(0.15); c.lamp.material.color.setRGB(0.4, 4, 0.8); } }));
    const armTick = g.add((dt) => S.couplings.forEach(c => (c.arm.rotation.x = damp(c.arm.rotation.x, c.seated ? 0 : -0.9, 12, dt))));
    let seated = 0;
    await this.waitFor(() => { const n = S.couplings.filter(c => c.seated).length; if (n !== seated) { seated = n; if (n < 3) this.radio('TOMAS', n === 1 ? 'One seated. Two to go.' : 'Two. Last one.', { wait: false, dur: 2 }); } return n >= 3; });
    S.relayLight.material.color.setRGB(0.4, 4, 0.8);
    g.audio.ui('objective');
    await this.wait(0.6);
    await this.radio('TOMAS', 'Pylon Seven reading green. Drift is— drift is down. Thank you.', { wait: false, dur: 3.6 });
    await this.wait(3.7);
    await this.radio('ROOK', 'Was that so hard?', { wait: false, dur: 1.6 });
    await this.wait(1.8);
    await this.radio('TOMAS', 'Yes.', { wait: false, dur: 1.2 });
    armTick(); offs.forEach(f => f()); offF();
    await this.wait(2);
    g.state.checkpoint = 'shearer'; g.state.save(g);
  }

  // ------------------------------------------------------------------ THE SHEARER (prologue boss)
  // A harvest-line service unit, gone feral, drawn up Leg Two by motion. Three phases:
  //  1 ARMOUR  — bullets glance off; stall its charge with the tether, then hit the opened core.
  //  2 FEEDING — it clamps onto Pylon Seven and drains it (Meridian's stride falters). Shielded. Capture
  //              the stolen power flowing into it and throw it back into its clamps.
  //  3 OVERDRIVE — shells gone, burning with stolen motion: chained charges and deck-wide slams.
  // Then the false victory: it rises one last time and throws itself at the moving haul cable —
  // which is how the work tram comes to fall.
  async beat_shearer(id) {
    const g = this.game, P = g.player, S = g.districts.spine, DK = SP.deck, D = g.dialogue;
    if (P.pos.y > -80 || P.pos.distanceTo(S.spots.deckCenter) > 30) { this.equip(true, true); P.teleport(S.spots.deckArrive.clone(), 0); g.camera.snapBehind(0.3, 0.1); }
    g.hud.fade(0, 0.6);
    this.equip(true, true); P.relaxed = false; g.weapons.locked = false;
    S.relayLight.material.color.setRGB(0.4, 4, 0.8); S.couplings.forEach(c => { c.seated = true; c.arm.rotation.x = 0; c.lamp.material.color.setRGB(0.4, 4, 0.8); });
    const arena = { x0: 196.4, x1: 221.7, z0: -299.6, z1: -266.4, y: DK };
    const offs = [];
    const say = (who, text, dur = 2.6) => this.radio(who, text, { wait: false, dur });

    // ---- arrival: something heavy climbing Leg Two
    g.audio.music.play('shearer', 0.5);
    g.audio.metalStress(V(222, DK - 6, -278), 2.5); g.camera.shake(0.3);
    await say('TOMAS', 'Hold on. Something just tripped the hip sensors on Leg Two. Something heavy.', 3.2);
    await this.wait(2.2);
    await say('NIA', 'Rook, east rail. It\'s coming up the leg.', 2.2);
    await this.wait(1.2);
    const sh = g.enemies.spawn('shearer', V(224.5, DK - 3.6, -278.5), { yaw: -Math.PI / 2, alwaysAware: true, boss: true, intro: true, arena });
    this.boss = sh;
    this.enter(true);
    const edge = V(219.6, DK, -278.5);
    // claws over the rail, then the whole machine hauls itself onto the deck
    g.director.shot({ pos: V(214, DK + 1.2, -273.5), look: V(221.5, DK + 1.2, -278.5), fov: 48, cut: true, handheld: 0.5 });
    const climb = g.add((dt) => {
      if (sh.mode !== 'intro') return;
      sh.introT = (sh.introT || 0) + dt; const k = clamp(sh.introT / 2.4, 0, 1), e = k * k * (3 - 2 * k);
      sh.pos.lerpVectors(V(224.5, DK - 3.6, -278.5), edge, e); sh.pose.climb = Math.sin(k * Math.PI) * (k < 0.85 ? 1 : 0.4); sh.gait += dt * 2;
      if (Math.random() < dt * 8 && k < 0.7) g.fx.sparks(V(221.9, DK + 0.9, -278.5 + (Math.random() - 0.5) * 2), V(-1, 0.5, 0), 6, 5);
    });
    await this.wait(1.4);
    g.audio.clank(V(221.9, DK + 1, -278), 2, 0.6);
    await this.wait(1.1);
    climb(); sh.pose.climb = 0; sh.pos.copy(edge);
    // it lands: a low hero angle, the roar, and a glimpse of the plate on its flank
    g.camera.shake(0.7); g.audio.explosion(edge, 0.5); g.fx.dust(edge, 2.5); g.audio.music.sting('danger');
    g.director.shot({ pos: V(212.5, DK + 0.5, -281.5), look: V(219.5, DK + 2.6, -278.5), fov: 40, cut: true, to: { fov: 34 }, dur: 2.4 });
    g.hud.location('SHEARER', 'HARVEST-LINE SERVICE UNIT · H-7', 3.2);
    await this.wait(2.2);
    g.director.shot({ pos: V(219.6, DK + 2.4, -282.6), look: V(219.95, DK + 2.15, -279.6), fov: 26, cut: true }); // the flank, the serial plate
    await this.wait(1.2);
    this.exit();
    sh.mode = 'hunt'; sh.chargeT = 2.2;
    g.audio.music.section('march');
    say('NIA', 'That\'s a Shearer! It\'s armoured, Rook, your rounds won\'t—', 2.6);
    this.wait(2.8).then(() => say('BRAM', 'When it charges, take it! Steal the charge, then hit what\'s under the shell!', 3.4)).catch(() => {});
    g.hud.hint('shearer', true);
    this.objective('Stop the Shearer', 'Bullets glance off its armour. Hold [E] on it while it charges — then hit the core.', () => sh.pos.clone().add(V(0, 2.5, 0)));
    g.hud.boss({ name: 'SHEARER', health: () => sh.hp / sh.maxHp, status: () => sh.mode === 'feed' ? (sh.clamped ? 'feeding · shielded' : 'going for the pylon') : sh.exposed ? 'core exposed' : sh.phase === 3 ? 'overdrive' : sh.charging > 0 || sh.windup > 0 ? 'charging' : 'armoured' });

    // the counterweight swings on its crane: capture it, or let it clout the Shearer
    const cw = S.counterweight; let cwA = 0.5, cwV = 0, cwHitT = 0;
    const bob = () => new THREE.Vector3(0, -7.5, 0).applyMatrix4(cw.matrixWorld);
    offs.push(g.add((dt) => {
      cwV += -9.8 / 7.5 * Math.sin(cwA) * dt; cwA += cwV * dt; cw.rotation.x = cwA; cwHitT -= dt;
      const sp = Math.abs(cwV) * 7.5, bp = bob();
      if (cwHitT < 0 && sp > 2.5 && bp.distanceTo(sh.pos.clone().add(V(0, 2, 0))) < 2.6 && sh.mode === 'hunt') {
        cwHitT = 1.5; sh.damage(80, bp, V(0, 0, Math.sign(cwV)), 'tether', true); sh.stun = Math.max(sh.stun, 1.6);
        g.audio.clank(bp, 2.5, 0.5); g.camera.shake(0.4); g.fx.sparks(bp, V(0, 1, 0), 30, 8); cwV *= -0.4;
      }
    }));
    offs.push(g.tether.register({ kind: 'machine', label: 'Counterweight', captureOnly: false, radius: 1.2, getPos: bob, getVel: () => V(0, 0, cwV * 7.5),
      capture: (dt) => { const sp = Math.abs(cwV) * 7.5; const take = Math.min(sp, 6 * dt); cwV *= sp > 0.01 ? (sp - take) / sp : 0; return 1800 * take + 120 * dt; },
      push: (imp) => { cwV += Math.sign(imp.z || 1) * 1.6; } }));
    // keep it swinging gently so it's always worth a look
    offs.push(g.add(() => { const E = 0.5 * (cwV * 7.5) ** 2 + 9.8 * 7.5 * (1 - Math.cos(cwA)); if (E < 9.8 * 7.5 * (1 - Math.cos(0.25))) cwV += (cwV >= 0 ? 1 : -1) * 0.004; }));

    // banter that teaches
    let deflectSaid = false, stallN = 0;
    offs.push(g.events.on('shearer:deflect', () => { if (!deflectSaid && sh.deflects > 8) { deflectSaid = true; say('BRAM', 'Your rounds are bouncing off! Make it charge, kid!', 2.6); } }));
    offs.push(g.events.on('shearer:charge', () => { if (stallN < 2) g.dialogue.bark('NIA', 'It\'s charging — NOW!', 1.4); }));
    offs.push(g.events.on('shearer:stalled', () => { stallN++; if (stallN === 1) say('BRAM', 'You stopped it dead! Shell\'s open — hit the core! Or give it its momentum back!', 3.4); else if (stallN % 2 === 0) g.dialogue.bark('BRAM', ['Core\'s open!', 'Now, now, now!', 'Hit it!'][stallN % 3], 1.4); }));
    offs.push(g.events.on('shearer:edge', () => g.dialogue.bark(['NIA', 'BRAM'][Math.floor(Math.random() * 2)], ['It\'s climbing back up!', 'Over it goes — and back it comes. Stubborn thing.'][Math.floor(Math.random() * 2)], 2.4)));
    offs.push(g.events.on('shearer:shielded', () => g.dialogue.bark('NIA', 'It\'s shielded while it feeds — hit the clamps!', 2.2)));

    // ---- phase 2: it goes for the pylon
    await this.waitFor(() => sh.phase >= 2);
    g.audio.music.section('push');
    // it feeds from whichever side of the pylon it reaches first
    const sides = [[V(207.2, DK, -284), Math.PI / 2], [V(216.8, DK, -284), -Math.PI / 2], [V(212, DK, -279.2), Math.PI], [V(212, DK, -288.8), 0]];
    const near = sides.sort((a, b) => a[0].distanceTo(sh.pos) - b[0].distanceTo(sh.pos))[0];
    sh.mode = 'feed'; sh.clamped = false; sh.feedSpot = { pos: near[0], yaw: near[1] };
    g.audio.metalStress(sh.pos, 2);
    await say('NIA', 'It\'s breaking off— it\'s going for the pylon!', 2.2);
    await this.waitFor(() => sh.clamped);
    // the feed: a beam of stolen motion from the relay into its core; Meridian's stride falters
    const beamMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.6, 0.5), transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.2, 1, 8, 1, true), beamMat); g.engine.cityRoot.add(beam);
    const relayPt = V(212, DK + 7.2, -284), coreW = () => sh.model.userData.core.getWorldPosition(new THREE.Vector3());
    let tapped = 0;
    const feedTick = g.add((dt) => {
      const a = relayPt, b2 = g.engine.cityRoot.worldToLocal(coreW()), mid = a.clone().add(b2).multiplyScalar(0.5), len = a.distanceTo(b2);
      beam.position.copy(mid); beam.scale.set(1 + Math.sin(g.time * 30) * 0.2, len, 1 + Math.sin(g.time * 30) * 0.2); beam.quaternion.setFromUnitVectors(V(0, 1, 0), b2.clone().sub(a).normalize());
      tapped = Math.max(0, tapped - dt); beamMat.opacity = tapped > 0 ? 0.25 + Math.random() * 0.3 : 0.75 + Math.sin(g.time * 18) * 0.15;
      g.city.speedMul = damp(g.city.speedMul, 0.55, 1, dt); g.lightMul = 0.55 + Math.random() * 0.45 * (Math.random() < 0.9 ? 1 : 0);
      g.city.shakeAmount = Math.max(g.city.shakeAmount, 0.12 + (Math.sin(g.time * 2.3) > 0.95 ? 0.4 : 0));
      S.relayLight.material.color.setRGB(Math.random() < 0.5 ? 4 : 0.6, 0.6, 0.2);
    });
    const offFeed = g.tether.register({ kind: 'machine', label: 'Stolen power', captureOnly: true, big: true, priority: 3, radius: 1.6, enabled: () => sh.clamped && sh.mode === 'feed',
      getPos: () => g.engine.cityRoot.worldToLocal(coreW()).lerp(relayPt, 0.45), getVel: () => V(0, -6, 0),
      capture: (dt) => { tapped = 0.2; sh.shieldFlash = 0.3; return 1000 * dt; }, push: () => {} });
    const clampPos = (i) => g.engine.cityRoot.worldToLocal(sh.model.userData.claws[i].hand.getWorldPosition(new THREE.Vector3()));
    const offClamps = [0, 1].map(i => g.tether.register({ kind: 'special', label: 'Clamp', releaseOnly: true, priority: 5, radius: 0.9, enabled: () => sh.mode === 'feed' && sh.clamped && sh.clamps[i],
      getPos: () => clampPos(i), getVel: () => V(), capture: () => 0,
      push: (imp, cells) => {
        if (cells < 1 || g.time - (sh.lastBreak ?? -9) < 0.6) return; // one clamp per throw
        sh.lastBreak = g.time;
        const p = clampPos(i); sh.breakClamp(i); g.audio.explosion(p, 0.5); g.audio.metalStress(p, 1.2); g.camera.shake(0.5); g.fx.kineticBurst(p, 1.2);
        g.events.emit('shearer:clampBroken', i);
      } }));
    this.objective('Break its grip on the pylon', 'It\'s shielded while it feeds. Capture the stolen power [E] — throw it into a clamp [Q].', () => { const i = sh.clamps[0] ? 0 : 1; return sh.clamps[i] ? clampPos(i) : null; });
    await say('TOMAS', 'Drift is spiking— Rook, it\'s on Pylon Seven. It\'s feeding off my relay!', 3.2);
    await this.wait(3.3);
    await say('NIA', 'It\'s drinking the motion straight out of the leg. Steal it back, Rook — the stream, right there!', 3.6);
    // drones come for the commotion
    for (const p of [V(226, DK + 5, -272), V(227, DK + 6, -292)]) g.enemies.spawn('gnat', p, { alwaysAware: true });
    // Tomas recognises it (told alongside the fight, never holding it up)
    (async () => {
      await this.wait(3.8); if (sh.phase >= 3) return;
      await say('TOMAS', 'That isn\'t a scav rig. That plate— that\'s one of ours. Harvest service. They were all decommissioned before—', 4.2);
      await this.wait(4.3);
      await say('TOMAS', '…Never mind. Just get it off my pylon.', 2.4);
      await this.wait(2.5);
      say('NIA', '"Never mind"? Tomas, what\'s a harvest unit?', 2.4);
      await this.wait(2.6); say('TOMAS', 'Later, Nia.', 1.4);
    })().catch(() => {});
    await this.waitFor(() => !sh.clamps[0] || !sh.clamps[1]);
    g.enemies.spawn('gnat', V(225, DK + 6, -284), { alwaysAware: true });
    g.dialogue.bark('BRAM', 'One down! Do it again!', 1.8);

    // ---- phase 3: torn loose, burning with what it stole
    await this.waitFor(() => sh.phase >= 3);
    feedTick(); offFeed(); offClamps.forEach(f => f()); beam.removeFromParent(); beam.geometry.dispose(); beamMat.dispose();
    g.audio.music.section('heaven');
    const restore = g.add((dt) => { g.city.speedMul = damp(g.city.speedMul, 1, 0.6, dt); g.lightMul = damp(g.lightMul ?? 1, 1, 2, dt); if (Math.abs(g.city.speedMul - 1) < 0.01) { g.city.speedMul = 1; g.lightMul = 1; restore(); } });
    S.relayLight.material.color.setRGB(0.4, 4, 0.8);
    g.camera.shake(0.8); g.audio.explosion(sh.pos, 0.8);
    await say('BRAM', 'It\'s off! No shell left — and it\'s burning hot. Finish it!', 3);
    this.objective('Finish the Shearer', 'No armour now. Stall its charges — and jump the shockwaves.', () => sh.pos.clone().add(V(0, 2.5, 0)));
    let slamSaid = false; offs.push(g.events.on('shearer:slam', () => { if (!slamSaid) { slamSaid = true; say('NIA', 'Shockwave — jump it!', 1.6); } }));
    // the shift change goes on the line meanwhile (held near the top until the deck is clear)
    const ph3hp = sh.hp;
    await this.waitFor(() => sh.hp < ph3hp * 0.55 || sh.mode === 'dying');
    if (sh.mode !== 'dying') {
      const tram = tramOnLine(this);
      await say('OPS', 'Undercroft shift change is on the line. Holding the tram at the top until Pylon Seven is clear.', 3.8);
      await this.wait(3.9);
      say('NIA', 'There\'s a full tram on that line, Rook. Keep that thing off the west side!', 3.2);
    }

    // ---- the false victory
    await this.waitFor(() => sh.mode === 'dying');
    offs.forEach(f => f()); g.hud.boss(null); this.objective(null);
    for (const e of g.enemies.alive) if (e !== sh) e.damage(9999, e.pos, V(0, 1, 0)); // its drones burn out with it
    P.invuln = 60; // nothing touches Rook while the finish plays
    g.audio.music.stop(0.3); g.audio.music.sting('victory');
    this.enter(true);
    g.slowmo = 0.45;
    const down = sh.pos.clone();
    g.director.shot({ pos: down.clone().add(V(-7.5, 3.2, 6.5)), look: down.clone().add(V(0, 2.2, 0)), fov: 40, cut: true, to: { pos: down.clone().add(V(-6.4, 2.8, 5.4)) }, dur: 3 });
    const slump = g.add((dt) => { sh.pose.clamp = damp(sh.pose.clamp, -0.6, 3, dt); sh.sawSpin = damp(sh.sawSpin, 0, 2, dt); if (Math.random() < dt * 10) g.fx.sparks(sh.pos.clone().add(V(0, 2.6, 0)), V(0, 1, 0), 5, 4, [1, 0.6, 0.2, 1]); });
    await say('BRAM', 'Ha! That\'s it — down it goes!', 2);
    await this.wait(2.0);
    g.slowmo = 1;
    // the core climbs again; it isn't looking at Rook any more
    sh.model.userData.core.material.color.setRGB(10, 5, 1.6);
    g.audio.metalStress(sh.pos, 2);
    await say('TOMAS', 'Rook— its core\'s still climbing. It\'s not finished, it\'s turning. Toward the line.', 3.2);
    slump(); sh.pose.clamp = 0;
    const gap = V(196.9, DK, -284), H = SP.lineU.clone().lerp(SP.lineL, 0.645).add(V(0, 0.6, 0)); // where the haul cable passes the deck
    g.director.shot({ pos: () => sh.pos.clone().add(V(6, 3.2, 5)), look: () => sh.pos.clone().add(V(-3, 1.5, 0)), fov: 50, cut: true });
    await this.wait(0.6);
    say('NIA', 'The tram— it\'s going for the moving cable!', 2);
    // it scrambles for the west gap…
    const from = sh.pos.clone(); let t0 = g.time;
    const run = g.add((dt) => { const k = clamp((g.time - t0) / 1.6, 0, 1); sh.pos.lerpVectors(from, gap, k); sh.yaw = dampAngle(sh.yaw, Math.atan2(gap.x - from.x, gap.z - from.z), 8, dt); sh.gait += dt * 9; sh.sawSpin = 40; if (Math.random() < dt * 12) g.fx.dust(sh.pos, 0.8); });
    await this.waitGame(1.6); run();
    // …and leaps
    g.slowmo = 0.35;
    // ride just behind and above it as it leaps, looking at the cable it's going for
    // from the deck behind the gap: it leaps away from us, out over the void, at the cable
    g.director.shot({ pos: V(203.5, DK + 2.4, -286.5), look: H.clone().add(V(0, -0.5, 0)), fov: 50, cut: true, to: { fov: 40 }, dur: 1.4 });
    const L0 = sh.pos.clone(); t0 = g.time;
    const leap = g.add((dt) => { const k = clamp((g.time - t0) / 1.1, 0, 1); sh.pos.lerpVectors(L0, H.clone().add(V(0, -1.6, 0)), k); sh.pos.y += Math.sin(k * Math.PI) * 3; sh.pose.climb = 0.8; sh.yaw = Math.atan2(H.x - L0.x, H.z - L0.z); });
    await this.waitGame(1.1); leap();
    // it saws into the haul cable — the cable parts
    g.audio.cableSnap(H); g.fx.sparks(H, V(0, 1, 0), 80, 12); g.camera.shake(0.7); this.whipCable(H.clone());
    g.events.emit('line:cut');
    await this.waitGame(0.25);
    // it falls away into the haze
    g.slowmo = 0.6; const fv = V(-2, 0, -1); t0 = g.time;
    const fall = g.add((dt) => { fv.y -= 18 * dt; sh.pos.addScaledVector(fv, dt); sh.tumble = (sh.tumble || 0) + dt * 1.8; });
    g.director.shot({ pos: V(197.6, DK + 2.2, -285.5), look: () => sh.pos.clone(), fov: 50, cut: true }); // at the edge, looking down after it
    await this.waitGame(1.6);
    fall(); const boom = sh.pos.clone(); g.audio.explosion(boom, 1.2); g.fx.explosion(boom, 2);
    sh.die(); this.boss = null;
    P.invuln = 0;
    g.state.journal('The Shearer had a Meridian Engineering plate: HARVEST SERVICE · H-7. Tomas said "one of ours," then stopped talking.');
    g.state.flag('shearer_h7');
    // straight into the emergency: the tram is moving
    const tram = this.workTram;
    if (tram) g.director.shot({ pos: () => tram.group.position.clone().add(V(14, 4, 12)), look: () => tram.group.position, fov: 45, cut: true });
    g.slowmo = 1;
    this.snapFromShearer = true;
    g.state.checkpoint = 'rescue'; g.state.save(g);
    await this.wait(1.0);
    this.exit();
  }

  async beat_rescue(id) {
    const g = this.game, P = g.player, S = g.districts.spine;
    if (P.pos.y > -80) { this.equip(true, true); P.teleport(S.spots.deckCenter.clone().add(V(-6, 0, 0)), -Math.PI / 2); g.camera.snapBehind(-Math.PI / 2 - 0.2, -0.1); g.hud.fade(0, 0.6); }
    this.equip(true, true); P.relaxed = false; g.weapons.locked = false;
    S.relayLight.material.color.setRGB(0.4, 4, 0.8); S.couplings.forEach(c => { c.seated = true; c.arm.rotation.x = 0; c.lamp.material.color.setRGB(0.4, 4, 0.8); });
    this.spawnUndercroftCrowd();
    if (!this.snapFromShearer) g.hud.setObjective('Watch the line', 'The Undercroft shift change is coming down.', SP.lineU);
    const ok = await runRescue(this, 'A');
    this.guard(id);
    if (ok) await this.afterRescue(id);
  }
  async beat_rescueC(id) {
    const g = this.game, P = g.player, S = g.districts.spine;
    if (g.state.checkpoint !== 'rescueC') return;
    this.equip(true, true); P.relaxed = false; g.weapons.locked = false;
    S.relayLight.material.color.setRGB(0.4, 4, 0.8); S.couplings.forEach(c => { c.seated = true; c.arm.rotation.x = 0; c.lamp.material.color.setRGB(0.4, 4, 0.8); });
    if (P.pos.y > -80 || P.pos.x < 180) { P.teleport(V(199, SP.deck, -292), -Math.PI / 2); g.camera.snapBehind(-Math.PI / 2 - 0.3, 0.05); }
    g.hud.fade(0, 0.6);
    this.spawnUndercroftCrowd();
    const tram = this.workTram || (this.workTram = new WorkTram(g));
    if (!tram.crew.length) tram.spawnCrew();
    const ok = await runRescue(this, 'C');
    this.guard(id);
    if (ok) await this.afterRescue(id);
  }
  spawnUndercroftCrowd() {
    const g = this.game, S = g.districts.spine;
    S.spots.crowd.forEach((p, i) => { const a = g.crowd.spawnSpot({ pos: p, yaw: Math.random() * 6.28, activity: i % 3 === 0 ? 'talkIdle' : i % 3 === 1 ? 'watch' : 'phone' }, 700 + i, { look: { outfit: 'worker' }, cull: 300 }); this.ambient.push(a); g.crowd.actors.splice(g.crowd.actors.indexOf(a), 1); g.addActor(a); });
  }

  // ---------------------------------------------------------------- the fall, Callow Reach, and the title
  async afterRescue(id) {
    const g = this.game, P = g.player, tram = this.workTram, S = g.districts.spine;
    // place Callow Reach so the falling tram leads the eye to it
    // Out to starboard and a little ahead, so that by the time Rook raises the visor the city's
    // stride has carried it abeam, well clear of the hull and the legs.
    // Rook will watch from the relay deck's east railing; the city's stride carries the town abeam
    const watchSpot = V(221.2, -96, -283); // on the relay deck (SP.deck), at the east railing
    g.ground.placeSettlement(watchSpot.x + 560, watchSpot.z - 90);
    // follow the tram down
    this.enter(true);
    g.slowmo = 0.6;
    // a witness camera hanging below the deck as the cabin drops past it
    const from = g.director.frame(tram.group.position.clone(), [V(35, -8, 30), V(-35, -8, 30), V(30, -8, -35), V(-30, -8, -35)]);
    g.director.shot({ pos: from, look: () => tram.group.position, fov: 50, to: { pos: from.clone().add(V(2, -2, 3)), fov: 35 }, dur: 3 });
    await this.waitGame(2.2);
    const chase = g.director.follow(() => tram.group.position, [V(24, 14, 26), V(-24, 14, 26), V(26, 14, -24), V(-26, 14, -24), V(0, 30, 30)]);
    g.director.shot({ pos: () => { const p = chase(); p.y = Math.min(p.y, -135); return p; }, look: () => tram.group.position, fov: 45, cut: true });
    await this.waitFor(() => tram.pos.y < -392);
    g.slowmo = 1;
    // impact
    const ip = tram.pos.clone(); ip.y = -398;
    g.fx.explosion(ip, 3); g.audio.explosion(ip, 1.2);
    for (let i = 0; i < 30; i++) { const a = Math.random() * 6.28, s = 4 + Math.random() * 10; g.fx.alpha.spawn({ x: ip.x, y: ip.y, z: ip.z, vx: Math.cos(a) * s, vy: 2 + Math.random() * 4, vz: Math.sin(a) * s + g.city.speed, life: 7, s0: 6, s1: 22, c0: [0.6, 0.55, 0.47, 0.7], c1: [0.6, 0.55, 0.47, 0], drag: 0.4 }); }
    tram.group.visible = false; tram.state = 'gone';
    const impOff = g.director.frame(ip.clone(), [V(-40, 60, 60), V(40, 60, 60), V(-60, 60, -40), V(60, 60, -40)]).sub(ip);
    g.director.shot({ pos: () => ip.clone().add(impOff).add(V(0, 0, g.city.travel - this.tTravel0)), look: () => ip.clone().add(V(0, 0, g.city.travel - this.tTravel0)), fov: 40, cut: true });
    this.tTravel0 = g.city.travel;
    await this.wait(2.4);
    // the dust settles… and there is a town, and there are people in its streets
    const sp = () => g.ground.settlementCityPos();
    g.director.shot({ pos: () => ip.clone().add(impOff), look: () => sp(), fov: 40, to: { pos: () => sp().clone().add(V(-60, 70, 90)), look: () => sp(), fov: 22 }, dur: 6, cut: false });
    g.audio.music.play('stillness', 4);
    g.audio.duck(0.25, 4); g.windMul = 0.2;
    g.engine.grade.uniforms.uStill.value = 0;
    const stillUp = g.add((dt) => { g.engine.grade.uniforms.uStill.value = damp(g.engine.grade.uniforms.uStill.value, 0.45, 0.5, dt); });
    await this.wait(5.5);
    // back to Rook, at the railing: player looks for themself, visor zoom
    if (P.state !== 'hang' && P.state !== 'climb') { P.teleport(watchSpot, Math.PI / 2); g.camera.snapBehind(Math.PI / 2, 0.2); }
    { const lk = P.pos.clone().add(V(0, 1.4, 0)); g.director.shot({ pos: g.director.frame(lk, [V(2.6, 0.6, 2.2), V(-2.2, 0.6, 2.6), V(2.4, 0.5, -2.4), V(-2.6, 0.5, -2.2)]), look: lk, fov: 40, cut: true }); }
    await this.wait(1.8);
    this.exit();
    g.director.freeLook = false;
    const toS = sp().clone().sub(P.pos); g.camera.yaw = Math.atan2(toS.x, toS.z); g.camera.pitch = Math.atan2(-toS.y, Math.hypot(toS.x, toS.z));
    this.objective('Look closer', 'Hold Z to zoom your visor on the town below.', () => sp());
    g.hud.hint('zoom', true);
    const zoomTick = g.add((dt) => { g.camera.zoomFov = g.input.down('zoom') || g.input.down('aim') ? 5 : null; });
    // wait until Rook's visor rests on the town
    let watch = 0;
    await this.waitFor((dt) => {
      const cam = g.engine.camera; const d = sp().clone().sub(cam.position).normalize(); const f = cam.getWorldDirection(new THREE.Vector3());
      if (g.camera.zoomFov && d.dot(f) > 0.996) watch += dt; return watch > 2.5;
    });
    this.objective(null);
    await this.radio('NIA', 'Rook? Rook, talk to me. Your heart rate just—', { wait: false, dur: 3 });
    await this.wait(2.8);
    await this.say('ROOK', 'There are people down there.', { dur: 2.4 });
    await this.radio('NIA', 'Where?', { dur: 1.2 });
    await this.say('ROOK', 'Under Leg Two. A town. They\'re… standing in the street.', { dur: 3.2 });
    // one of them moves
    await this.wait(0.8);
    const mover = g.ground.stillPeople[0];
    const head = () => g.engine.camera.position.clone();
    mover.anim.setMode('loco');
    for (let k = 0; k < 3; k++) {
      mover.anim.speed = 1.2; mover.anim.lookTarget = new THREE.Vector3(0, 400, 0);
      const step = g.add((dt) => { mover.pos.x += dt * 1.6; mover.anim.update(dt * 2); });
      await this.wait(0.26); step(); mover.anim.setMode('freeze');
      g.audio.ui('heart');
      await this.wait((700 + k * 300) / 1000);
      mover.anim.setMode('loco');
    }
    mover.anim.setMode('freeze');
    g.audio.duck(0.05, 1.5);
    await this.wait(1.6);
    await this.say('ROOK', '…One of them moved.', { dur: 2.6 });
    g.audio.duck(0.35, 2);
    await this.radio('HARROW', 'Runner, this is Commander Harrow. That\'s Callow Reach. Grid Forty-One.', { dur: 3.6 });
    await this.radio('HARROW', 'It has been uninhabited for nineteen years.', { dur: 2.8 });
    await this.say('ROOK', 'I\'m looking at them, Commander.', { dur: 2.2 });
    await this.radio('HARROW', 'You\'re looking at heat shimmer off dead fields, at the end of a long morning. Come home, Runner. That is not a request.', { dur: 5.4 });
    await this.wait(1.2);
    await this.radio('TOMAS', 'Rook. …Come home.', { dur: 2.6 });
    zoomTick(); g.camera.zoomFov = null;
    g.state.flag('sawCallowReach');
    g.state.journal('I saw people standing still in the streets of Callow Reach, under Leg Two. One of them moved. Harrow says the town has been empty for nineteen years.');
    g.state.journal('He\'s lying. I don\'t know why yet.');
    // final beat: Rook looks down once more
    this.enter(true);
    { const lk = P.pos.clone().add(V(0, 1.6, 0)), toS = sp().clone().sub(P.pos).setY(0).normalize(), side = V(-toS.z, 0, toS.x);
      const cp = g.director.frame(lk, [toS.clone().multiplyScalar(1.3).addScaledVector(side, 0.6).setY(0.12), toS.clone().multiplyScalar(1.3).addScaledVector(side, -0.6).setY(0.12), side.clone().multiplyScalar(1.4).setY(0.1)]);
      g.director.shot({ pos: cp, look: lk, fov: 32, to: { pos: cp.clone().lerp(lk, 0.15) }, dur: 4, cut: true }); } // cut: the visor camera was inside Rook's head
    P.anim.setEmotion('worried'); P.anim.lookTarget = sp();
    await this.wait(1.8);
    await this.say('ROOK', '…They moved.', { dur: 2.8 });
    stillUp();
    g.state.checkpoint = 'title'; g.state.save(g); // the title beat follows (and rescueC is skipped)
  }

  async beat_title() { await this.title(); }

  async title() {
    const g = this.game;
    this.enter(true);
    g.audio.music.stop(1.5);
    await g.hud.fade(1, 2.5);
    g.audio.duck(1, 0.5);
    g.engine.grade.uniforms.uStill.value = 0;
    // the city's footsteps in the dark
    for (let i = 0; i < 2; i++) { g.audio.giantStep(V(0, -400, 0), 1.3, 120); await this.wait(2.6); }
    g.audio.music.play('title', 0.1);
    g.hud.showTitle('MARCHLIGHT');
    await this.wait(11);
    g.hud.hideTitle();
    await this.wait(2.5);
    g.state.flag('prologueComplete'); g.state.checkpoint = 'c1_title'; g.state.save(g);
    g.audio.music.stop(2);
    this.exit();
  }
}
Object.assign(Prologue.prototype, Chapter1);
