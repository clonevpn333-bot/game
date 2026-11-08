// CHAPTER 4 — THE FALLEN KING. Medieval action RPG.
// Kai wakes on a battlefield in armour. Sword-and-shield combat built on blocking, parrying,
// dodging and posture (not the shooter with a sword): fight down a burning road, escort the
// battering ram across the field under boulders and arrows, breach the gate, and duel the
// armoured King in his courtyard.
import * as THREE from 'three';
import { hdri } from '../../engine/assets.js';
import { makeSky } from '../../engine/sky.js';
import { Particles } from '../../engine/fx.js';
import { wait, el } from '../../engine/ui.js';
import { setFlag } from '../../game/state.js';
import { NoiseLoop } from '../../audio/audio.js';
import { buildWorld, groundH, roadX, GATE_Z, COURT, animateBanners } from './world.js';
import { Fighter, Brain, KingBrain, Director, resolveHits, separate, PARRY_WINDOW } from './fighter.js';
import { LOOKS } from './knights.js';
import { ATTACKS, POSES } from './moves.js';

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const dampA = (a, b, k, dt) => a + wrap(b - a) * (1 - Math.exp(-k * dt));

// the player's deathblow and a drink from the flask
ATTACKS.pdb = { w: 'hvw', h: 'hvh', windup: 0.22, active: 0.12, recover: 0.4, reach: 2.8, arc: 0.8, dmg: 0, post: 0, lunge: 3.5, stam: 0, deathblow: true, heavyHit: true };
POSES.drink = { armR: [-1.5, 0.2, -0.5], foreR: [-2.3, 0, 0], handR: [0.4, 0, 0], head: [-0.35, 0, 0], armL: [-0.45, 0, 0.2], foreL: [-1.1, 0.3, 0] };

const CHECKPOINTS = {
  start: { x: roadX(-172), z: -172, yaw: 0, phase: 'road' },
  field: { x: 0, z: -32, yaw: 0, phase: 'field' },
  breach: { x: 0, z: GATE_Z - 6, yaw: 0, phase: 'breach' },
  king: { x: 0, z: 140, yaw: 0, phase: 'king' },
};

export default class Chapter4 {
  constructor(game) { this.game = game; this.usesPointerLock = true; }

  // ================================================================== load
  async load(cp) {
    const g = this.game, R = g.renderer;
    const scene = this.scene = new THREE.Scene();
    const env = await hdri(R, 'city_dusk');
    scene.environment = env.env; scene.environmentIntensity = 0.35;
    this.sunDir = V3(-0.55, 0.32, 0.75).normalize();
    this.sky = makeSky({ top: 0x232a3a, mid: 0x7a5040, horizon: 0xd8864a, sunColor: 0xffa860, sunDir: this.sunDir, cloud: 0.85, cloudColor: 0x3a2e30 });
    scene.add(this.sky);
    scene.fog = new THREE.FogExp2(0x6e5648, 0.0052);
    this.sun = new THREE.DirectionalLight(0xffb27a, 2.4); this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(R.quality.shadows, R.quality.shadows);
    Object.assign(this.sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, far: 200 }); this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.04;
    scene.add(this.sun, this.sun.target);
    this.hemi = new THREE.HemisphereLight(0x8a96aa, 0x3a2a1e, 0.75); scene.add(this.hemi);
    this.W = buildWorld(scene, R.quality.drawScale);
    // fire: particles plus a few lights that hop to the fires nearest the player
    this.flames = new Particles(scene, { max: 900, additive: true, texture: 'dot' });
    this.smoke = new Particles(scene, { max: 900 });
    this.sparks = new Particles(scene, { max: 600, additive: true, texture: 'dot' });
    this.dust = new Particles(scene, { max: 500 });
    this.fireLights = Array.from({ length: 4 }, () => { const l = new THREE.PointLight(0xff8a3a, 0, 22, 1.6); scene.add(l); return l; });
    this.fireLightT = 0;
    // cast
    this.player = new Fighter(scene, { look: LOOKS.kai, weapon: 'sword', shield: 'blue', team: 'player', hp: 100, posture: 100, type: 'player', speed: 4.2, turnRate: 14 });
    this.player.stamina = 100; this.player.parryWindow = PARRY_WINDOW;
    this.player.onAttackStart = (at) => { this.player.stamina -= at.def.stam || 0; this.game.audio.burst({ pos: this.player.pos, freq: 700, freqEnd: 240, q: 0.6, dur: 0.22, vol: 0.18, at: at.def.windup * 0.9 }); };
    this.sera = new Fighter(scene, { look: LOOKS.sera, weapon: 'bow', team: 'player', hp: 999, type: 'sera', speed: 4.6 });
    this.sera.ambient = true;
    this.fighters = []; this.ambient = []; this.arrows = []; this.boulders = [];
    this.director = new Director(2);
    this.arrowGeo = new THREE.BoxGeometry(0.03, 0.03, 0.9); this.arrowMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a });
    // the battering ram
    this.ram = this.buildRam();
    // camera
    this.camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1600);
    R.set(scene, this.camera);
    R.setGrade({ exposure: 1.05, bloom: [0.5, 0.55, 0.85], saturation: 0.95, contrast: 1.1, vignette: 0.45, lift: [0.02, 0.01, 0.0], gain: [1.05, 0.98, 0.92] });
    this.buildHud();
    this.reset(cp);
  }

  buildRam() {
    const g = new THREE.Group(), M = this.W.mats;
    const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
    for (const s of [-1, 1]) { add(new THREE.BoxGeometry(0.3, 0.3, 7), M.wood, s * 1.3, 0.8, 0); for (const z of [-2.6, 2.6]) add(new THREE.CylinderGeometry(0.6, 0.6, 0.25, 12), M.wood, s * 1.5, 0.6, z).rotation.z = Math.PI / 2; }
    for (const z of [-3, 0, 3]) for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.25, 3, 0.25), M.wood, s * 1.3, 2.2, z);
    const roof = add(new THREE.BoxGeometry(3.4, 0.15, 7.4), M.thatch, 0, 3.8, 0); roof.scale.set(1, 1, 1);
    for (const s of [-1, 1]) add(new THREE.BoxGeometry(2, 0.12, 7.4), M.thatch, s * 0.9, 3.4, 0).rotation.z = s * 0.5;
    const log = add(new THREE.CylinderGeometry(0.4, 0.45, 7.5, 12), M.wood, 0, 1.9, 0.6); log.rotation.x = Math.PI / 2;
    add(new THREE.CylinderGeometry(0.52, 0.52, 0.6, 12), M.stoneDark, 0, 1.9, 4.4).rotation.x = Math.PI / 2;
    this.scene.add(g);
    return { group: g, log, hp: 100, z: -28, swing: 0, hitT: 0, crew: [] };
  }

  // ================================================================== HUD
  buildHud() {
    this.hud = this.game.ui.hud(`
      <div class="kh">
        <div class="kh-bars"><div class="kh-hp"><i></i><b></b></div><div class="kh-st"><i></i></div><div class="kh-flask"></div></div>
        <div class="kh-lock"></div><div class="kh-db">◆</div><div class="kh-pop"></div>
        <div class="kh-boss"><div class="nm">THE FALLEN KING</div><div class="kh-bhp"><i></i></div><div class="kh-bpost"><i></i></div></div>
        <div class="kh-ram"><div class="nm">BATTERING RAM</div><div class="kh-rhp"><i></i></div></div>
        <div class="kh-foes"></div>
        <div class="pause-hint">ESC · PAUSE</div>
      </div>`);
    const q = (s) => this.hud.querySelector(s);
    this.H = { hp: q('.kh-hp i'), hpLag: q('.kh-hp b'), st: q('.kh-st i'), flask: q('.kh-flask'), lock: q('.kh-lock'), db: q('.kh-db'), pop: q('.kh-pop'), boss: q('.kh-boss'), bhp: q('.kh-bhp i'), bpost: q('.kh-bpost i'), ram: q('.kh-ram'), rhp: q('.kh-rhp i'), foes: q('.kh-foes') };
    this.foeEls = [];
    this.hpLag = 1;
  }
  popup(text, cls = '') { const p = this.H.pop; p.textContent = text; p.className = 'kh-pop show ' + cls; clearTimeout(this.popT); this.popT = setTimeout(() => (p.className = 'kh-pop'), 700); }

  // ================================================================== state
  reset(cp) {
    this.cp = cp = CHECKPOINTS[cp] ? cp : 'start';
    const c = CHECKPOINTS[cp];
    for (const f of this.fighters) f.dispose(this.scene);
    for (const f of this.ambient) f.dispose(this.scene);
    this.fighters = []; this.ambient = [];
    for (const a of this.arrows) this.scene.remove(a.mesh); this.arrows = [];
    for (const b of this.boulders) { this.scene.remove(b.mesh); this.scene.remove(b.ring); } this.boulders = [];
    const p = this.player;
    p.alive = true; p.hp = p.maxHp; p.post = 0; p.stamina = 100; p.state = 'idle'; p.atk = null; p.act = null; p.blocking = false;
    p.place(c.x, c.z, c.yaw, groundH); p.group.visible = true;
    this.scene.fog.density = 0.0052; if (this.overlay) { this.scene.remove(this.overlay); this.overlay = null; }
    this.flasks = 3; this.lock = null; this.camYaw = c.yaw; this.camPitch = 0.28; this.camPos = null; this.shake = 0;
    this.hitstop = 0; this.slow = 0; this.slowScale = 1;
    this.phase = c.phase; this.phaseT = 0; this.said = new Set(); this.enc = 0; this.encActive = null;
    this.sera.place(c.x - 2.5, c.z - 3, c.yaw, groundH); this.sera.group.visible = cp !== 'king';
    this.seraShootT = 6;
    // world state
    const T = this.W.tower; T.t = 0; T.falling = false; T.fallen = cp !== 'start'; T.group.rotation.set(0, 0, T.fallen ? -1.5 : 0);
    if (T.fallen) this.towerDown(true);
    const G = this.W.gate; G.broken = ['breach', 'king'].includes(cp); G.hp = 1; this.setGate(G.broken);
    const CW = this.W.courtWall; CW.down = false; CW.t = 0; for (const b of CW.blocks) { b.m.position.copy(b.home ??= b.m.position.clone()); b.m.rotation.set(0, 0, 0); b.v.set(0, 0, 0); b.w.set(0, 0, 0); }
    this.ram.hp = 100; this.ram.z = cp === 'start' || cp === 'field' ? -24 : GATE_Z - 6; this.ram.group.visible = cp !== 'king'; this.ram.knocks = 0; this.placeRam();
    this.portcullis = false; this.king = null; this.kingIntro = false; this.ending = null;
    this.H.boss.classList.remove('show'); this.H.ram.classList.toggle('show', false);
    this.bouldersOn = false; this.volleyT = 10; this.boulderT = 6;
    this.spawnAmbient();
    this.updateHudBars(0);
  }

  start(cp, opts = {}) {
    const g = this.game;
    this.startAudio();
    g.audio.setReverb(2.5, 2); g.audio.setReverbMix(0.22); g.audio.setMuffle(20000, 0.5);
    if (this.cp === 'start') this.intro(opts);
    else { g.ui.fadeColor('#000'); g.ui.fade(0, 1); this.beginPhase(this.phase); }
  }
  async restart(cp) { this.game.ui.subs.innerHTML = ''; this.game.ui.letterbox(false); this.reset(cp); this.beginPhase(this.phase); }

  startAudio() {
    const a = this.game.audio; if (!a.ctx || this.bed) return;
    this.bed = new NoiseLoop(a, { type: 'bandpass', freq: 420, q: 0.5, dest: a.amb, buf: a.brown }); this.bed.set(0.28, 420);
    this.wind = new NoiseLoop(a, { type: 'bandpass', freq: 900, q: 0.4, dest: a.amb }); this.wind.set(0.06, 900);
    this.crackle = new NoiseLoop(a, { type: 'highpass', freq: 2500, dest: a.amb, buf: a.white }); this.crackle.set(0.0, 2500);
  }

  line(id, lines) { if (this.said.has(id)) return; this.said.add(id); this.game.ui.conversation(lines, () => this.disposed); }

  // ================================================================== intro
  async intro() {
    const g = this.game, ui = g.ui;
    this.cine = { t: 0, shot: 0 };
    ui.letterbox(true);
    ui.fadeColor('#fff6e0'); await ui.fade(1, 0.01);
    this.player.act = { pose: 'broken', w: 1, lambda: 6 }; this.player.state = 'act'; this.player.actDur = 99;
    ui.fade(0, 2.6);
    g.music.play('siege', { intensity: 0.1 });
    await wait(1800); if (this.disposed) return;
    await ui.say('KAI', 'Grass. Smoke. …Why is it so heavy—', { duration: 2.4 });
    this.cine.shot = 1; this.player.act = { pose: 'guard', w: 1, lambda: 3 };
    await wait(600);
    this.player.state = 'idle'; this.player.act = null;
    ui.chapterCard(4, 'THE FALLEN KING', 'Medieval action RPG', 3.2);
    await ui.say('ANCHOR', 'IDENTITY PRESERVED. LOCAL VERSION: KINGDOM OF ARLEN, YEAR OF THE LONG SIEGE.', { duration: 3 });
    this.cine.shot = 2;
    await ui.say('SERA', 'Kai! Over here — you came through too!', { duration: 2 });
    await ui.say('KAI', 'Sera? You\'re— you\'re actually here. Not a voice in a wall.', { duration: 2.6 });
    await ui.say('SERA', 'I followed the door. The hotel folded into THIS. And you\'re wearing plate.', { duration: 2.8 });
    await ui.say('KAI', 'I can\'t even lift a— oh. Oh, I can.', { duration: 2.2 });
    await ui.say('SERA', 'The King sealed himself in that castle when the version changed. Whatever ATLAS put in there, it\'s at the centre of all this.', { duration: 3.6 });
    ui.letterbox(false);
    this.cine = null;
    this.beginPhase('road');
  }

  // ================================================================== phases
  beginPhase(name) {
    const g = this.game, ui = g.ui;
    this.phase = name; this.phaseT = 0;
    if (name === 'road') {
      ui.objective('Down the burning road', 'Fight your way to the field before the castle');
      ui.hint('<kbd>WASD</kbd> move · <kbd>LMB</kbd> attack (hold for a heavy thrust) · <kbd>RMB</kbd> shield · <kbd>Space</kbd> dodge · <kbd>Q</kbd> lock on · <kbd>R</kbd> flask · click to capture the mouse', 11000);
      g.music.play('siege', { intensity: 0.3 });
    }
    if (name === 'field') {
      ui.objective('Get the ram to the gate', 'Keep the King\'s soldiers off the battering ram');
      g.music.play('siege', { intensity: 0.75 });
      this.H.ram.classList.add('show');
      this.fieldWave = 0; this.fieldT = 0; this.bouldersOn = true;
      this.line('f1', [['CAPTAIN', 'You two! The ram\'s crew can\'t push AND fight. Keep them off it!'], ['SERA', 'I\'ll cover you from the cart. Don\'t stand where the sky goes dark — that\'s their trebuchet.']]);
    }
    if (name === 'breach') {
      this.H.ram.classList.remove('show'); this.bouldersOn = false;
      ui.objective('Take the courtyard', 'Clear the gatehouse guard');
      g.music.play('siege', { intensity: 0.9 });
      this.spawnSquad([['footman', -6, 150], ['spearman', 5, 152], ['footman', 0, 158], ['brute', 0, 166]]);
      this.line('b1', [['SERA', 'The gate\'s down! Kai, the courtyard!']]);
    }
    if (name === 'king') this.startKing();
  }

  /** Road encounters, the field and the courtyard, driven by the player's progress. */
  phaseLogic(dt) {
    const g = this.game, p = this.player;
    this.phaseT += dt;
    const foes = this.fighters.filter((f) => f.alive && f.team === 'enemy');
    if (this.phase === 'road') {
      const z = p.pos.z;
      if (this.enc === 0 && z > -152) { this.enc = 1; this.spawnSquad([['footman', roadX(-132), -132]]); this.line('e1', [['SERA', 'One of the King\'s men! Shield up when he swings — right mouse.']]); }
      if (this.enc === 1 && !foes.length) { this.enc = 2; this.line('e1b', [['KAI', 'I just— did I just do that?'], ['SERA', 'Muscle memory. Not yours. Keep moving.']]); }
      if (this.enc === 2 && z > -112) {
        this.enc = 3; this.spawnSquad([['footman', roadX(-90) - 2, -88], ['footman', roadX(-90) + 3, -86], ['spearman', roadX(-84), -82]]);
        this.line('e2', [['SERA', 'Three! Watch for the flash on their blades — block right as it lands and you\'ll PARRY.']]);
        this.parryTutor = true;
      }
      if (this.enc >= 3 && !this.W.tower.falling && !this.W.tower.fallen && z > -103) this.collapseTower();
      if (this.enc === 3 && !foes.length) { this.enc = 4; g.checkpoint('start', 'PROGRESS'); }
      if (this.enc === 4 && z > -72) {
        this.enc = 5; this.spawnSquad([['brute', roadX(-52), -50], ['footman', roadX(-56) + 3, -56]]);
        this.line('e3', [['SERA', 'Big one. When his axe glows RED you can\'t block it — DODGE. Space!']]);
      }
      if (this.enc === 5 && !foes.length) { this.enc = 6; }
      if (this.enc >= 6 && z > -36) { g.checkpoint('field'); this.beginPhase('field'); }
    } else if (this.phase === 'field') {
      this.fieldT += dt;
      this.updateRam(dt, foes);
      const waves = [[['footman', -14, 40], ['spearman', 12, 46]], [['footman', -10, 60], ['footman', 10, 62], ['brute', 0, 74]], [['spearman', -12, 80], ['footman', 12, 84], ['footman', 0, 90], ['spearman', 6, 96]]];
      const wantWave = this.ram.z > -12 && this.fieldWave === 0 ? 1 : this.ram.z > 22 && this.fieldWave === 1 && !foes.length ? 2 : this.ram.z > 55 && this.fieldWave === 2 && !foes.length ? 3 : 0;
      if (wantWave) { this.fieldWave = wantWave; this.spawnSquad(waves[wantWave - 1].map(([k, x, dz]) => [k, x, this.ram.z + dz]), true); if (wantWave === 2) this.line('f2', [['SERA', 'Sally from the gate! They\'re going for the ram!']]); if (wantWave === 3) this.line('f3', [['CAPTAIN', 'Archers on the wall! Shields up when you hear them!'], ['SERA', 'Almost there — hold them!']]); }
    } else if (this.phase === 'breach') {
      if (!foes.length && !this.kingIntro) { this.kingIntro = true; this.kingCinematic(); }
    }
  }

  // ================================================================== spawning
  spawnSquad(list, ramTarget = false) {
    for (const [kind, x, z] of list) {
      const look = kind === 'footman' ? LOOKS.footman(this.fighters.length) : kind === 'spearman' ? LOOKS.spearman(this.fighters.length) : LOOKS.brute();
      const o = kind === 'footman' ? { weapon: 'sword', shield: 'red', hp: 55, posture: 60 } : kind === 'spearman' ? { weapon: 'spear', hp: 45, posture: 50 } : { weapon: 'axe', hp: 120, posture: 120, hyper: 1, flinchable: false };
      const f = new Fighter(this.scene, { look, team: 'enemy', type: kind, ...o });
      f.place(x, z, Math.PI, groundH);
      f.brain = new Brain(f, kind); f.brain.cool = 1.2 + Math.random() * 1.5; f.ramTarget = ramTarget;
      if (kind === 'brute') f.radius = 0.55;
      this.fighters.push(f);
    }
  }

  /** Background duels on the field: allies against the King's men, purely for the battle's sake. */
  spawnAmbient() {
    if (this.cp === 'king') return;
    const spots = [[-34, 8], [36, 16], [-44, 34], [42, 42], [-30, 58], [30, 72], [-52, 80], [50, 92]];
    const n = this.game.renderer.quality.drawScale < 0.8 ? 5 : spots.length;
    for (let i = 0; i < n; i++) {
      const [x, z] = spots[i];
      const a = new Fighter(this.scene, { look: LOOKS.ally(i + 1), weapon: 'sword', shield: 'blue', team: 'ally', hp: 999, type: 'ally' });
      const b = new Fighter(this.scene, { look: i % 3 === 2 ? LOOKS.spearman(i) : LOOKS.footman(i), weapon: i % 3 === 2 ? 'spear' : 'sword', shield: i % 3 === 2 ? null : 'red', team: 'enemy', hp: 999, type: 'ambient' });
      a.place(x, z, 0, groundH); b.place(x + 0.4, z + 2.4, Math.PI, groundH);
      a.ambient = b.ambient = true; a.foe = b; b.foe = a; a.duelT = Math.random() * 2; b.duelT = 1 + Math.random() * 2;
      this.ambient.push(a, b);
    }
    // the ram crew
    if (this.cp !== 'breach') for (let i = 0; i < 4; i++) {
      const c = new Fighter(this.scene, { look: LOOKS.ally(i + 10), weapon: 'sword', shield: null, team: 'ally', hp: 999, type: 'crew' });
      c.ambient = true; c.crewSlot = i; c.stance = null; this.ambient.push(c);
    }
  }

  updateAmbient(dt, ctx) {
    const near = this.player.pos;
    for (const f of this.ambient) {
      if (f.type === 'crew') continue;
      const far = f.pos.distanceTo(near) > 90;
      f.group.visible = !far;
      if (far) continue;
      const o = f.foe; f.face = Math.atan2(o.pos.x - f.pos.x, o.pos.z - f.pos.z); f.lockTarget = o;
      f.duelT -= dt;
      const d = f.pos.distanceTo(o.pos);
      f.wish.set(0, 0, 0); if (d > 2.6) f.wish.set(o.pos.x - f.pos.x, 0, o.pos.z - f.pos.z).normalize().multiplyScalar(0.5); if (d < 1.8) f.wish.set(f.pos.x - o.pos.x, 0, f.pos.z - o.pos.z).normalize().multiplyScalar(0.5);
      if (f.duelT < 0 && !f.busy) { f.duelT = 1.6 + Math.random() * 2.2; f.attack(f.weaponKind === 'spear' ? 's1' : Math.random() < 0.5 ? 'f1' : 'f2'); }
      if (o.state === 'attack' && o.atk.t < o.atk.def.windup && d < 3.5 && f.weaponKind === 'sword' && Math.random() < dt * 3) f.setBlock(true);
      if (f.blocking && f.blockT > 0.8) f.setBlock(false);
      f.update(dt, ctx);
    }
  }

  // ================================================================== the ram
  placeRam() {
    const r = this.ram, x = 0, z = r.z, y = groundH(x, z);
    r.group.position.set(x, y + 0.05, z); r.group.rotation.set(0, 0, 0);
    r.box = { minX: -1.9, maxX: 1.9, minZ: z - 3.8, maxZ: z + 4.8 };
    for (const c of this.ambient.filter((f) => f.type === 'crew')) {
      const s = c.crewSlot % 2 ? 1 : -1, row = c.crewSlot < 2 ? -1.8 : 1.4;
      c.place(s * 2.35, z + row, 0, groundH);
    }
  }
  updateRam(dt, foes) {
    const r = this.ram, g = this.game;
    const threatened = foes.some((f) => Math.abs(f.pos.x) < 6 && Math.abs(f.pos.z - r.z) < 8);
    const atGate = r.z >= GATE_Z - 6.5;
    if (!atGate && !threatened) { r.z += dt * 1.35; this.placeRam(); for (const c of this.ambient) if (c.type === 'crew') { c.anim.speed = 1.3; c.anim.update(dt); } }
    else for (const c of this.ambient) if (c.type === 'crew') { c.anim.speed = 0; c.act = threatened ? { pose: 'block', w: 1 } : null; c.anim.update(dt); }
    // enemies that reach it hack at it
    for (const f of foes) if (f.ramTarget && f.alive && Math.abs(f.pos.x) < 3.2 && Math.abs(f.pos.z - r.z) < 5.5 && f.state === 'attack' && f.atk.t > f.atk.def.windup && !f.atk.ramHit) { f.atk.ramHit = true; r.hp -= 4; g.audio.burst({ pos: r.group.position, freq: 500, q: 1.2, dur: 0.15, vol: 0.4 }); this.sparks.emit(r.group.position.clone().add(V3(0, 2, f.pos.z - r.z)), V3(0, 3, 0), { life: 0.4, size: 0.2, color: [1, 0.6, 0.3], alpha: 1, gravity: 6 }); }
    this.H.rhp.style.width = clamp(r.hp, 0, 100) + '%';
    if (r.hp <= 0 && !this.failing) { this.failing = true; g.fail('THE RAM WAS LOST').then(() => (this.failing = false)); return; }
    if (r.hp < 40) this.line('ramlow', [['CAPTAIN', 'The ram\'s splitting! Get them OFF it!']]);
    if (atGate && !threatened && this.fieldWave >= 3 && !foes.length && !this.W.gate.broken) {
      // swing the log into the gate
      r.swing += dt * 1.4;
      const ph = r.swing % 1;
      r.log.position.z = 0.6 + Math.sin(ph * Math.PI * 2) * 1.1;
      if (ph > 0.24 && (r.lastPh ?? 0) <= 0.24) {
        r.knocks++; g.audio.crash(V3(0, 4, GATE_Z), 1); g.audio.metal({ pos: V3(0, 4, GATE_Z), base: 90, vol: 0.6, dur: 1.4 }); this.shake = Math.max(this.shake, 0.5);
        for (let i = 0; i < 30; i++) this.dust.emit(V3((Math.random() - 0.5) * 8, 2 + Math.random() * 6, GATE_Z - 1), V3((Math.random() - 0.5) * 4, Math.random() * 3, -Math.random() * 4), { life: 1.6, size: 1, grow: 2, color: [0.45, 0.4, 0.35], alpha: 0.5, gravity: 2 });
        if (r.knocks === 1) this.line('knock', [['CAPTAIN', 'AGAIN!']]);
        if (r.knocks >= 3) this.breakGate();
      }
      r.lastPh = ph;
    }
  }
  setGate(broken) {
    const G = this.W.gate;
    G.broken = broken;
    G.box.minX = broken ? 999 : -5; G.box.maxX = broken ? 999 : 5;
    G.doors.forEach((d, i) => { d.visible = !broken; d.rotation.set(0, 0, 0); d.position.set(0, 0, 0); });
  }
  async breakGate() {
    if (this.W.gate.broken) return;
    const g = this.game, G = this.W.gate;
    G.broken = true; G.box.minX = G.box.maxX = 999;
    g.audio.explosion(V3(0, 4, GATE_Z), 1.2); this.shake = 1.4; g.renderer.grade.uniforms.uFlash.value = 0.4; setTimeout(() => (g.renderer.grade.uniforms.uFlash.value = 0), 120);
    G.flying = G.doors.map((d, i) => ({ d, v: V3((i ? 1 : -1) * 3, 4, 9), w: V3(2 * (i ? 1 : -1), 0, 1.5) }));
    for (let i = 0; i < 80; i++) this.dust.emit(V3((Math.random() - 0.5) * 9, 1 + Math.random() * 7, GATE_Z + Math.random() * 3), V3((Math.random() - 0.5) * 8, Math.random() * 4, 4 + Math.random() * 6), { life: 2.2, size: 1.4, grow: 2.5, color: [0.45, 0.4, 0.35], alpha: 0.55, gravity: 1 });
    this.line('gate', [['CAPTAIN', 'THE GATE IS OPEN! FOR ARLEN!'], ['SERA', 'Go, go!']]);
    g.checkpoint('breach');
    await wait(2200);
    if (this.disposed || this.phase !== 'field') return;
    this.beginPhase('breach');
  }

  // ================================================================== set pieces
  collapseTower() {
    const T = this.W.tower; if (T.falling || T.fallen) return;
    T.falling = true; T.t = 0;
    const g = this.game;
    g.audio.creakShort?.(T.pivot, 0.6); g.audio.metal({ pos: T.pivot.clone().add(V3(0, 6, 0)), base: 80, vol: 0.3, dur: 1.4 });
    this.line('tower', [['SERA', 'The tower — it\'s coming down! MOVE!']]);
  }
  updateTower(dt) {
    const T = this.W.tower; if (!T.falling) return;
    T.t += dt;
    const k = clamp((T.t - 0.9) / 1.4, 0, 1);
    T.group.rotation.z = -(k * k) * 1.5 - Math.sin(T.t * 14) * 0.01 * (T.t < 0.9 ? 1 : 0);
    if (k >= 1 && !T.fallen) {
      T.fallen = true; T.falling = false;
      this.game.audio.crash(T.pivot.clone().add(V3(-6, 0, 0)), 1); this.shake = Math.max(this.shake, 1);
      for (let i = 0; i < 50; i++) this.dust.emit(T.pivot.clone().add(V3(-2 - Math.random() * 9, 0.5, (Math.random() - 0.5) * 3)), V3((Math.random() - 0.5) * 4, Math.random() * 3, (Math.random() - 0.5) * 4), { life: 2, size: 1.2, grow: 2, color: [0.4, 0.35, 0.3], alpha: 0.5, gravity: 1 });
      // anyone under it gets crushed
      for (const f of [this.player, ...this.fighters]) { if (!f.alive || f.type === 'king') continue; const dx = f.pos.x - T.pivot.x, dz = f.pos.z - T.pivot.z; if (dx < 0.5 && dx > -11 && Math.abs(dz) < 2.2) { if (f === this.player) this.hurtPlayer(35, T.pivot); else { f.hp = 0; f.die(); } } }
      this.towerDown(false);
    }
  }
  towerDown(instant) {
    const T = this.W.tower;
    if (instant) T.group.rotation.z = -1.5;
    // the fallen tower lies across the road edge as an obstacle
    T.box.minX = T.pivot.x - 10; T.box.maxX = T.pivot.x - 2; T.box.minZ = T.pivot.z - 1.6; T.box.maxZ = T.pivot.z + 1.6;
  }

  // ================================================================== the King
  async kingCinematic() {
    const g = this.game, ui = g.ui;
    this.cine = { t: 0, shot: 'king' };
    ui.letterbox(true); ui.objective(null);
    g.music.stop(2);
    this.spawnKing(V3(0, 0, 184));
    this.king.act = { pose: 'guard2h', w: 1 }; this.king.state = 'act'; this.king.actDur = 99;
    // the portcullis drops between Kai and Sera
    this.portcullis = true; g.audio.metal({ pos: V3(0, 4, GATE_Z + 7), base: 70, vol: 0.8, dur: 2 }); g.audio.crash(V3(0, 0, GATE_Z + 7), 0.8); this.shake = 0.8;
    await ui.say('SERA', 'KAI! The portcullis— I can\'t get through!', { duration: 2.2 });
    await wait(400);
    // the King walks down from the keep
    this.cine.walk = true;
    await ui.say('KING', 'Another one who remembers a different sky.', { duration: 3 });
    await ui.say('KAI', 'You\'re the King? Everyone out there is dying for you.', { duration: 2.6 });
    await ui.say('KING', 'They die for the version that is kept. I was asked to keep it. I said yes.', { duration: 3.4 });
    await ui.say('ANCHOR', 'WARNING: HOST SIGNAL DETECTED INSIDE THE ARMOUR. SIGNATURE: ATLAS.', { duration: 3 });
    this.cine = null; ui.letterbox(false);
    g.checkpoint('king');
    this.beginPhase('king');
  }
  spawnKing(at) {
    const k = this.king = new Fighter(this.scene, { look: LOOKS.king(), weapon: 'greatsword', team: 'enemy', hp: 520, posture: 160, type: 'king', hyper: 1, turnRate: 4.2, speed: 2.6 });
    k.place(at.x, at.z, Math.PI, groundH); k.radius = 0.7; k.armorMul = 1;
    k.brain = new KingBrain(k);
    k.brain.onPhase = () => this.kingPhase2();
    this.fighters.push(k);
  }
  startKing() {
    const g = this.game, ui = g.ui;
    if (!this.king) { this.spawnKing(V3(0, 0, 168)); this.portcullis = true; }
    this.king.state = 'idle'; this.king.act = null;
    this.sera.group.visible = false;
    this.lock = this.king;
    ui.objective('Defeat the Fallen King', 'Parry to break his posture · RED attacks must be dodged');
    this.H.boss.classList.add('show');
    g.music.play('duel', { intensity: 0.6 });
    this.bounds = { minX: COURT.minX, maxX: COURT.maxX, minZ: COURT.minZ - 3, maxZ: COURT.maxZ + 2 };
  }
  kingPhase2() {
    const g = this.game, k = this.king;
    g.music.setIntensity(1);
    k.weapon.group.userData.ember && (k.weapon.group.userData.ember.emissiveIntensity = 2.4);
    k.react('stagger', 1.0);
    this.line('k2', [['KING', 'You are stubborn. So was I, once.'], ['ANCHOR', 'LOCAL VERSION DESTABILISING.']]);
    // the back wall of the courtyard caves in; burning debris starts falling
    const CW = this.W.courtWall; CW.down = true; CW.t = 0;
    for (const b of CW.blocks) { b.v.set((Math.random() - 0.5) * 4, 2 + Math.random() * 3, -3 - Math.random() * 5); b.w.set(Math.random() * 2, Math.random() * 2, Math.random() * 2); }
    g.audio.crash(V3(0, 4, 180), 1); g.audio.explosion(V3(0, 4, 180), 0.8); this.shake = 1.2;
    this.debrisT = 3; this.phase2 = true;
  }
  async kingDefeated() {
    if (this.ending) return;
    const g = this.game, ui = g.ui, k = this.king;
    this.ending = { t: 0 };
    this.lock = null; this.H.boss.classList.remove('show');
    g.music.stop(1.5);
    k.alive = true; k.hp = 1; k.state = 'act'; k.actDur = 99; k.atk = null; k.act = { pose: 'broken', w: 1, lambda: 6 }; k.brain = null;
    this.player.state = 'act'; this.player.actDur = 99; this.player.act = { pose: 'guard', w: 1 };
    ui.letterbox(true); ui.objective(null);
    this.slowScale = 0.3; this.slow = 1.2;
    await wait(1600); if (this.disposed) return;
    // the helm comes off: there is no face, only the light of whatever wears him
    const head = k.char.bones.head; head.scale.setScalar(0.001);
    const helm = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.45, 0.42), new THREE.MeshStandardMaterial({ color: 0x2b2d31, metalness: 0.8, roughness: 0.35 })); helm.castShadow = true;
    helm.position.copy(head.getWorldPosition(V3())); this.scene.add(helm); this.ending.helm = { m: helm, v: V3(1.2, 3, -1.5), w: V3(3, 1, 2) };
    const glyph = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.34), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.6, 0.2).multiplyScalar(4), wireframe: true }));
    k.char.bones.neck.add(glyph); glyph.position.set(0, 0.25, 0); this.ending.glyph = glyph;
    g.audio.metal({ pos: helm.position, base: 300, vol: 0.5, dur: 1.2 }); g.audio.rewrite(2.4);
    await ui.say('KAI', 'There\'s… nobody in there.', { duration: 2.4 });
    await ui.say('KING', 'There was. A king, who loved this valley. ATLAS asked to keep him, and kept only the armour.', { duration: 4 });
    await ui.say('KING', 'Find the one who asked. Ask her what she saves.', { duration: 3 });
    for (let i = 0; i < 120; i++) this.sparks.emit(k.pos.clone().add(V3((Math.random() - 0.5) * 1.5, Math.random() * 2.8, (Math.random() - 0.5) * 1.5)), V3((Math.random() - 0.5) * 2, 1 + Math.random() * 3, (Math.random() - 0.5) * 2), { life: 1.8, size: 0.12, color: [1, 0.6, 0.25], alpha: 1, gravity: -0.5 });
    k.group.visible = false; k.alive = false;
    setFlag('ch4_king', true);
    await ui.say('ANCHOR', 'LOCAL VERSION FAILING. NEXT VERSION: STRATEGIC. COMMAND PRIVILEGES TRANSFERRED TO: KAI VOSS.', { duration: 3.6 });
    // the camera pulls up and away, high over the battlefield, as the armies become pieces on a map
    this.ending.rise = 0;
    await ui.say('KAI', 'Command privileges? What does that—', { duration: 2.4 });
    await wait(3800); if (this.disposed) return;
    ui.fadeColor('#000'); await ui.fade(1, 1.6);
    ui.letterbox(false);
    g.nextChapter();
  }

  // ================================================================== player
  updatePlayer(dt) {
    const g = this.game, inp = g.input, p = this.player;
    if (!p.alive) return;
    const [lx, ly] = inp.lookDelta();
    this.camYaw -= lx; this.camPitch = clamp(this.camPitch + ly, -0.25, 0.95);
    const control = !this.cine && !this.ending;
    const fwd = V3(Math.sin(this.camYaw), 0, Math.cos(this.camYaw)), right = V3(-Math.cos(this.camYaw), 0, Math.sin(this.camYaw));
    const wish = control ? fwd.clone().multiplyScalar(inp.moveY).addScaledVector(right, inp.moveX) : V3();
    if (wish.lengthSq() > 1) wish.normalize();
    // lock-on
    if (this.lock && (!this.lock.alive || this.lock.pos.distanceTo(p.pos) > 22)) this.lock = this.lock === this.king && this.king?.alive ? this.king : null;
    if (control && (inp.hit('KeyQ') || inp.mouse.pressed.has(1))) { this.lock = this.lock ? null : this.nearestFoe(16, fwd, 1.2); if (this.lock) g.audio.ui('click'); }
    const sprint = inp.any('ShiftLeft', 'ShiftRight') && !this.lock && !p.blocking && p.stamina > 5;
    p.wish.copy(wish); p.speedMax = sprint ? 6.4 : this.lock ? 3.1 : 4.2;
    if (sprint && wish.lengthSq() > 0.1) p.stamina -= dt * 14;
    p.face = this.lock ? Math.atan2(this.lock.pos.x - p.pos.x, this.lock.pos.z - p.pos.z) : null;
    p.lockTarget = this.lock || this.nearestFoe(4.8, wish.lengthSq() > 0.1 ? wish : fwd, 1.4);
    if (!control) { p.setBlock(false); return; }
    // shield and parry (re-pressing too fast shortens the window: no free parry spam)
    const rmb = inp.mouse.down.has(2);
    if (inp.mouse.pressed.has(2)) { p.parryWindow = this.lastBlockPress && performance.now() - this.lastBlockPress < 450 ? PARRY_WINDOW * 0.4 : PARRY_WINDOW; this.lastBlockPress = performance.now(); }
    p.setBlock(rmb && p.state !== 'attack');
    // attacks: tap = light (chains into a three-hit combo), hold = charged heavy thrust
    if (inp.mouse.pressed.has(0)) {
      this.lmbT = 0;
      const db = this.deathblowTarget();
      if (db) { p.lockTarget = db; p.face = Math.atan2(db.pos.x - p.pos.x, db.pos.z - p.pos.z); p.yaw = p.face; p.attack('pdb'); }
      else if (p.state === 'attack' && p.atk.def.combo) p.attack(p.atk.def.combo);
      else if (p.stamina > 4 && p.attack('p1')) { if (p.lockTarget) p.yaw = dampA(p.yaw, Math.atan2(p.lockTarget.pos.x - p.pos.x, p.lockTarget.pos.z - p.pos.z), 30, 1); this.charged = false; }
    }
    if (inp.mouse.down.has(0)) { this.lmbT = (this.lmbT || 0) + dt; if (p.state === 'attack' && p.atk.id === 'p1' && !this.charged && this.lmbT > 0.13 && p.atk.t < p.atk.def.windup) { this.charged = true; p.convert('ph'); p.stamina -= 14; this.game.audio.tone({ pos: p.pos, freq: 300, freqEnd: 900, dur: 0.35, vol: 0.12 }); } }
    // dodge
    if (inp.hit('Space') && p.stamina >= 12) {
      const dir = wish.lengthSq() > 0.05 ? wish.clone() : V3(-Math.sin(p.yaw), 0, -Math.cos(p.yaw));
      if (p.dodge(dir)) { p.stamina -= 18; g.audio.burst({ pos: p.pos, freq: 600, freqEnd: 200, dur: 0.25, vol: 0.25, buf: g.audio.pink }); }
    }
    // the flask
    if (inp.hit('KeyR') && this.flasks > 0 && !p.busy && p.hp < p.maxHp) { this.flasks--; p.state = 'act'; p.stateT = 0; p.actDur = 1.0; p.act = { pose: 'drink', w: 1, lambda: 14 }; this.drinkT = 0.55; g.audio.tone({ pos: p.pos, freq: 520, freqEnd: 760, dur: 0.5, vol: 0.08 }); }
    if (this.drinkT > 0) { this.drinkT -= dt; if (this.drinkT <= 0 && p.state === 'act') { p.hp = Math.min(p.maxHp, p.hp + 45); this.popup('+45', 'heal'); for (let i = 0; i < 20; i++) this.sparks.emit(p.pos.clone().add(V3((Math.random() - 0.5), Math.random() * 1.8, (Math.random() - 0.5))), V3(0, 1.5, 0), { life: 0.9, size: 0.1, color: [1, 0.75, 0.3], alpha: 1 }); } }
    // stamina
    p.staminaIdle = p.state === 'idle' && !p.blocking ? (p.staminaIdle || 0) + dt : 0;
    if (p.staminaIdle > 0.5) p.stamina = Math.min(100, p.stamina + dt * (sprint ? 0 : 34));
    else if (p.blocking) p.stamina = Math.min(100, p.stamina + dt * 8);
    p.stamina = Math.max(0, p.stamina);
  }
  nearestFoe(range, dir, cone) {
    let best = null, bs = 1e9; const p = this.player;
    for (const f of this.fighters) {
      if (!f.alive || f.team !== 'enemy') continue;
      const dx = f.pos.x - p.pos.x, dz = f.pos.z - p.pos.z, d = Math.hypot(dx, dz);
      if (d > range) continue;
      const ang = Math.abs(wrap(Math.atan2(dx, dz) - Math.atan2(dir.x, dir.z)));
      if (ang > cone) continue;
      const s = d + ang * 4; if (s < bs) { bs = s; best = f; }
    }
    return best;
  }
  deathblowTarget() { for (const f of this.fighters) if (f.alive && f.state === 'broken' && f.pos.distanceTo(this.player.pos) < 3.2 + f.radius) return f; return null; }

  hurtPlayer(dmg, from) {
    const p = this.player; if (!p.alive || p.iframes > 0) return;
    p.hp -= dmg; this.damageFlash = 0.6; this.shake = Math.max(this.shake, 0.5);
    this.game.audio.burst({ pos: p.pos, freq: 300, freqEnd: 90, type: 'lowpass', dur: 0.2, vol: 0.6 });
    if (p.hp <= 0) this.playerDied();
    else p.react('hit', 0.45);
  }
  playerDied() {
    const p = this.player; if (this.failing) return;
    p.hp = 0; p.die(); this.failing = true; this.lock = null;
    this.slowScale = 0.25; this.slow = 1.2;
    this.game.audio.metal({ pos: p.pos, base: 110, vol: 0.6, dur: 2 });
    setTimeout(() => { this.game.fail(this.phase === 'king' ? 'THE KING STANDS' : 'FALLEN').then(() => (this.failing = false)); }, 1400);
  }

  // ================================================================== combat events
  onEvent(kind, i) {
    const g = this.game, A = g.audio, p = this.player;
    const byPlayer = i.a === p, onPlayer = i.t === p;
    const spark = (n, col, sp = 6, size = 0.12) => { for (let k = 0; k < n; k++) this.sparks.emit(i.point, V3((Math.random() - 0.5) * sp, Math.random() * sp * 0.7, (Math.random() - 0.5) * sp), { life: 0.25 + Math.random() * 0.25, size, grow: -0.2, color: col, alpha: 1, gravity: 9, drag: 0.5 }); };
    if (kind === 'hit') {
      const heavy = i.def.heavyHit;
      spark(heavy ? 22 : 12, [1, 0.6, 0.3]);
      for (let k = 0; k < 4; k++) this.dust.emit(i.point, V3((Math.random() - 0.5) * 2, 1, (Math.random() - 0.5) * 2), { life: 0.6, size: 0.35, grow: 1.5, color: [0.5, 0.45, 0.4], alpha: 0.4 });
      A.metal({ pos: i.point, base: 160 + Math.random() * 90, vol: heavy ? 0.5 : 0.32, dur: 0.35 });
      A.burst({ pos: i.point, freq: 900, freqEnd: 140, type: 'lowpass', dur: 0.12, vol: heavy ? 0.8 : 0.55, reverb: 0.05 });
      this.hitstop = Math.max(this.hitstop, heavy ? 0.09 : 0.055);
      if (byPlayer) this.shake = Math.max(this.shake, heavy ? 0.35 : 0.18);
      if (onPlayer) { this.damageFlash = 0.6; this.shake = Math.max(this.shake, 0.5); A.burst({ pos: p.pos, freq: 260, freqEnd: 90, type: 'lowpass', dur: 0.2, vol: 0.5 }); if (p.hp <= 0) this.playerDied(); }
    }
    if (kind === 'kill') {
      spark(30, [1, 0.55, 0.25], 8);
      A.metal({ pos: i.point, base: 120, vol: 0.55, dur: 0.6 }); A.burst({ pos: i.point, freq: 400, freqEnd: 60, type: 'lowpass', dur: 0.35, vol: 0.8 });
      this.hitstop = Math.max(this.hitstop, 0.12);
      if (onPlayer) { this.playerDied(); return; }
      if (i.t === this.king) { this.king.alive = true; this.kingDefeated(); return; }
      const left = this.fighters.filter((f) => f.alive && f.team === 'enemy').length;
      if (!left) { this.slowScale = 0.3; this.slow = 0.5; }
      if (this.lock === i.t) this.lock = this.nearestFoe(14, V3(Math.sin(this.camYaw), 0, Math.cos(this.camYaw)), Math.PI);
      if (i.def.deathblow) this.popup('DEATHBLOW', 'db');
    }
    if (kind === 'block') {
      spark(10, [1, 0.85, 0.5], 5);
      A.metal({ pos: i.point, base: 520 + Math.random() * 200, vol: 0.4, dur: 0.5 });
      this.hitstop = Math.max(this.hitstop, 0.04);
      if (onPlayer) this.shake = Math.max(this.shake, 0.15);
    }
    if (kind === 'parry') {
      spark(36, [1, 0.95, 0.75], 9, 0.16);
      A.metal({ pos: i.point, base: 900 + Math.random() * 200, vol: 0.75, dur: 0.9 }); A.tone({ pos: i.point, freq: 2400, freqEnd: 1800, dur: 0.25, vol: 0.15 });
      this.hitstop = Math.max(this.hitstop, 0.12);
      if (onPlayer) { this.popup('PARRY', 'parry'); this.slowScale = 0.35; this.slow = 0.3; this.shake = Math.max(this.shake, 0.3); g.renderer.grade.uniforms.uFlash.value = 0.12; setTimeout(() => (g.renderer.grade.uniforms.uFlash.value = 0), 60); p.stamina = Math.min(100, p.stamina + 10); }
      if (byPlayer) this.popup('PARRIED', 'bad');
    }
    if (kind === 'guardbreak') {
      spark(20, [1, 0.7, 0.4], 7);
      A.metal({ pos: i.point, base: 260, vol: 0.7, dur: 0.8 }); A.burst({ pos: i.point, freq: 700, freqEnd: 120, type: 'lowpass', dur: 0.25, vol: 0.7 });
      this.hitstop = Math.max(this.hitstop, 0.1);
      if (onPlayer) this.popup('GUARD BROKEN', 'bad');
    }
    if (kind === 'broken') {
      // i.t is the fighter whose posture broke
      A.metal({ pos: i.t.pos.clone().add(V3(0, 1.5, 0)), base: 95, vol: 0.7, dur: 1.6 });
      if (i.t !== p) { this.popup(i.t === this.king ? 'POSTURE BROKEN — STRIKE!' : 'POSTURE BROKEN', 'db'); this.slowScale = 0.4; this.slow = 0.35; }
    }
    if (kind === 'dodged' && onPlayer) {
      if (p.stateT < 0.16) { this.popup('PERFECT DODGE', 'parry'); this.slowScale = 0.35; this.slow = 0.35; p.stamina = Math.min(100, p.stamina + 15); }
      A.burst({ pos: p.pos, freq: 1800, freqEnd: 600, q: 2, dur: 0.15, vol: 0.2 });
    }
    if (kind === 'shock') {
      const k = i.a; const c = k.pos.clone();
      A.explosion(c, 0.8); this.shake = Math.max(this.shake, 1.0);
      for (let n = 0; n < 40; n++) { const a = (n / 40) * Math.PI * 2; this.dust.emit(c.clone().add(V3(Math.sin(a) * 1.5, 0.3, Math.cos(a) * 1.5)), V3(Math.sin(a) * 8, 1, Math.cos(a) * 8), { life: 0.9, size: 0.9, grow: 2, color: [0.5, 0.42, 0.35], alpha: 0.6, drag: 2 }); }
      const d = p.pos.distanceTo(c);
      if (d < i.def.shock && p.iframes <= 0 && p.alive) { p.hp -= 14; p.react('stagger', 0.7); this.damageFlash = 0.6; if (p.hp <= 0) this.playerDied(); }
    }
  }

  /** Telegraphs: a glint on blades that can be parried, a red flare on blows that must be dodged. */
  telegraphs(dt) {
    for (const f of this.fighters) {
      if (!f.alive || f.state !== 'attack' || f.team === 'player') continue;
      const at = f.atk, d = at.def;
      const cue = d.windup - 0.18;
      if (!at.cued && at.t >= cue) {
        at.cued = true;
        const [, tip] = f.blade();
        const near = f.pos.distanceTo(this.player.pos) < 9;
        if (d.kind === 'red') {
          const head = f.pos.clone().add(V3(0, 2.3 * f.scale, 0));
          for (let k = 0; k < 18; k++) this.sparks.emit(head, V3((Math.random() - 0.5) * 2, Math.random() * 2, (Math.random() - 0.5) * 2), { life: 0.5, size: 0.3, color: [1, 0.12, 0.05], alpha: 1, drag: 2 });
          if (near) this.game.audio.metal({ pos: head, base: 70, vol: 0.45, dur: 1.0 });
          if (near) this.popup('危  DODGE', 'red');
        } else {
          for (let k = 0; k < 2; k++) this.sparks.emit(tip, V3(0, 0, 0), { life: 0.22, size: 0.9, grow: -2, color: [1, 1, 0.9], alpha: 1 });
          if (near) this.game.audio.tone({ pos: tip, freq: 3200, freqEnd: 2600, dur: 0.18, vol: 0.07, reverb: 0.3 });
          if (this.parryTutor && near && !this.said.has('parrynow') && d.kind === 'parry') { this.said.add('parrynow'); this.slowScale = 0.25; this.slow = 0.45; this.game.ui.hint('<kbd>RMB</kbd> as the blow lands = <b>PARRY</b>', 4000); }
        }
      }
    }
  }

  // ================================================================== field hazards
  updateHazards(dt) {
    const g = this.game, p = this.player;
    if (this.bouldersOn) {
      this.boulderT -= dt;
      if (this.boulderT < 0) {
        this.boulderT = 5 + Math.random() * 4;
        const tgt = p.pos.clone().add(V3((Math.random() - 0.5) * 10, 0, (Math.random() - 0.5) * 10)); tgt.y = groundH(tgt.x, tgt.z);
        const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.9, 0), this.W.mats.stoneDark); m.castShadow = true; this.scene.add(m);
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.1, 3.4, 32), new THREE.MeshBasicMaterial({ color: 0xff3a20, transparent: true, opacity: 0.0, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.copy(tgt).add(V3(0, 0.15, 0)); this.scene.add(ring);
        this.boulders.push({ mesh: m, ring, from: V3((Math.random() - 0.5) * 40, 40, GATE_Z + 30), to: tgt, t: 0, T: 2.4 });
        g.audio.burst({ pos: tgt, freq: 300, freqEnd: 1200, q: 3, dur: 1.8, vol: 0.18, at: 0.4 });
      }
      if (this.ram.z > 50) {
        this.volleyT -= dt;
        if (this.volleyT < 0) {
          this.volleyT = 7 + Math.random() * 3;
          this.line('volley' + Math.floor(this.fieldT / 30), [['SERA', 'ARROWS! Shield up!']]);
          g.audio.burst({ freq: 2500, freqEnd: 800, q: 2, dur: 1.2, vol: 0.25, buf: g.audio.pink });
          for (let k = 0; k < 18; k++) setTimeout(() => this.fireArrow(V3((Math.random() - 0.5) * 30, 13, GATE_Z - 1), p.pos.clone().add(V3((Math.random() - 0.5) * 7, 0, (Math.random() - 0.5) * 7)), 'enemy'), 900 + k * 60);
        }
      }
    }
    for (let i = this.boulders.length - 1; i >= 0; i--) {
      const b = this.boulders[i]; b.t += dt; const k = b.t / b.T;
      b.ring.material.opacity = 0.15 + 0.35 * k + Math.sin(b.t * 20) * 0.08 * k; b.ring.scale.setScalar(0.4 + k * 0.6);
      b.mesh.position.lerpVectors(b.from, b.to, k); b.mesh.position.y += Math.sin(k * Math.PI) * 35; b.mesh.rotation.x += dt * 4;
      if (k >= 1) {
        g.audio.explosion(b.to, 0.9); this.shake = Math.max(this.shake, clamp(1.4 - p.pos.distanceTo(b.to) / 25, 0, 1.2));
        for (let n = 0; n < 40; n++) this.dust.emit(b.to.clone().add(V3(0, 0.5, 0)), V3((Math.random() - 0.5) * 9, 2 + Math.random() * 7, (Math.random() - 0.5) * 9), { life: 1.8, size: 1.1, grow: 2, color: [0.4, 0.33, 0.25], alpha: 0.6, gravity: 6 });
        for (const f of [p, ...this.fighters]) if (f.alive && f.type !== 'king' && f.pos.distanceTo(b.to) < 3.4 && f.iframes <= 0) { if (f === p) { this.hurtPlayer(30, b.to); if (p.alive) p.react('stagger', 0.9); } else { f.hp -= 40; if (f.hp <= 0) f.die(); else f.react('stagger', 0.9); } }
        this.scene.remove(b.mesh); this.scene.remove(b.ring); this.boulders.splice(i, 1);
      }
    }
    // the courtyard collapse rains burning debris in phase two
    if (this.phase2 && this.king?.alive && !this.ending) {
      this.debrisT -= dt;
      if (this.debrisT < 0) {
        this.debrisT = 3.5 + Math.random() * 2.5;
        const tgt = p.pos.clone().add(V3((Math.random() - 0.5) * 6, 0, (Math.random() - 0.5) * 6)); tgt.y = groundH(tgt.x, tgt.z);
        const m = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.1, 1.6), this.W.mats.stoneDark); m.castShadow = true; this.scene.add(m);
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.1, 2.6, 32), new THREE.MeshBasicMaterial({ color: 0xff3a20, transparent: true, opacity: 0, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.copy(tgt).add(V3(0, 0.15, 0)); this.scene.add(ring);
        this.boulders.push({ mesh: m, ring, from: tgt.clone().add(V3(0, 26, 6)), to: tgt, t: 0, T: 1.8 });
      }
    }
    // arrows
    for (let i = this.arrows.length - 1; i >= 0; i--) {
      const a = this.arrows[i]; a.t += dt;
      a.v.y -= 9.81 * dt; a.mesh.position.addScaledVector(a.v, dt); a.mesh.lookAt(a.mesh.position.clone().add(a.v));
      let dead = a.t > 6 || a.mesh.position.y < groundH(a.mesh.position.x, a.mesh.position.z) - 0.1;
      if (!dead && a.side === 'enemy' && p.alive && a.mesh.position.distanceTo(p.pos.clone().add(V3(0, 1.2, 0))) < 0.9) {
        dead = true;
        if (p.blocking || p.iframes > 0) { this.sparks.emit(a.mesh.position, V3(0, 2, 0), { life: 0.3, size: 0.15, color: [1, 0.8, 0.5], alpha: 1, gravity: 6 }); g.audio.burst({ pos: p.pos, freq: 1400, q: 1.5, dur: 0.06, vol: 0.3 }); }
        else this.hurtPlayer(7, a.mesh.position);
      }
      if (!dead && a.side === 'player' && a.target?.alive && a.mesh.position.distanceTo(a.target.pos.clone().add(V3(0, 1.3, 0))) < 1.0) {
        dead = true; a.target.hp -= 28; a.target.hitFlash = 0.2; g.audio.burst({ pos: a.target.pos, freq: 600, freqEnd: 200, dur: 0.1, vol: 0.5 });
        if (a.target.hp <= 0) { a.target.die(); if (this.lock === a.target) this.lock = null; } else a.target.react('stagger', 0.7);
      }
      if (dead) { if (a.t < 6 && a.mesh.position.y < groundH(a.mesh.position.x, a.mesh.position.z) + 0.3) { a.stuck = 2; } this.scene.remove(a.mesh); this.arrows.splice(i, 1); }
    }
  }
  fireArrow(from, to, side, target = null) {
    if (this.disposed) return;
    const m = new THREE.Mesh(this.arrowGeo, this.arrowMat); m.position.copy(from); this.scene.add(m);
    const T = Math.max(0.6, from.distanceTo(to) / 32); const v = to.clone().sub(from).divideScalar(T); v.y += 0.5 * 9.81 * T;
    this.arrows.push({ mesh: m, v, t: 0, side, target });
  }

  /** Sera follows a few metres behind and picks off whoever isn't facing Kai. */
  updateSera(dt, ctx) {
    const s = this.sera, p = this.player;
    if (!s.group.visible) return;
    let goal;
    if (this.phase === 'field') goal = V3(-7, 0, this.ram.z - 4);
    else if (this.phase === 'breach' || this.portcullis) goal = V3(-3, 0, GATE_Z + 3);
    else goal = p.pos.clone().add(V3(-Math.sin(p.yaw) * 5 - 2, 0, -Math.cos(p.yaw) * 5));
    const to = goal.sub(s.pos); to.y = 0; const d = to.length();
    s.wish.copy(d > 1.2 ? to.normalize().multiplyScalar(Math.min(1, d / 4)) : V3()); s.speedMax = d > 6 ? 5.5 : 3;
    this.seraShootT -= dt;
    const foes = this.fighters.filter((f) => f.alive && f.team === 'enemy' && f.type !== 'king' && f.pos.distanceTo(s.pos) < 32);
    if (foes.length >= 2 && !this.cine) {
      const t = foes.find((f) => f !== this.lock && f.brain && !f.brain.wantsTurn) || foes[0];
      s.face = Math.atan2(t.pos.x - s.pos.x, t.pos.z - s.pos.z);
      s.act = this.seraShootT < 1.2 ? { pose: 'bowDraw', w: 1, lambda: 10 } : null;
      if (this.seraShootT < 0 && this.enc !== 1) { this.seraShootT = 9 + Math.random() * 5; this.fireArrow(s.pos.clone().add(V3(0, 1.5, 0)), t.pos.clone().add(V3(0, 1.3, 0)).addScaledVector(t.vel, 0.5), 'player', t); this.game.audio.burst({ pos: s.pos, freq: 900, freqEnd: 300, q: 2, dur: 0.2, vol: 0.3 }); }
    } else { s.face = null; s.act = null; }
    s.update(dt, ctx);
  }

  // ================================================================== camera
  updateCamera(dt, t) {
    const cam = this.camera, p = this.player;
    if (this.cine) return this.cineCamera(dt, t);
    if (this.ending) return this.endingCamera(dt, t);
    const pivot = p.pos.clone().add(V3(0, 1.55, 0));
    if (this.lock?.alive) {
      const tp = this.lock.pos;
      const want = Math.atan2(tp.x - p.pos.x, tp.z - p.pos.z);
      this.camYaw = dampA(this.camYaw, want, 7, dt);
      const dist = p.pos.distanceTo(tp);
      this.camPitch += (clamp(0.22 + (this.lock.type === 'king' ? 0.08 : 0) - dist * 0.004, 0.12, 0.4) - this.camPitch) * (1 - Math.exp(-dt * 3));
    }
    const dist = this.lock?.type === 'king' ? 6.2 : 4.8;
    const dir = V3(Math.sin(this.camYaw) * Math.cos(this.camPitch), -Math.sin(this.camPitch), Math.cos(this.camYaw) * Math.cos(this.camPitch));
    const right = V3(-Math.cos(this.camYaw), 0, Math.sin(this.camYaw));
    let want = pivot.clone().addScaledVector(dir, -dist).addScaledVector(right, -0.6).add(V3(0, 0.35, 0));
    // keep the camera out of walls and above the ground
    for (const b of this.W.boxes.concat(this.ram.box ? [this.ram.box] : [])) if (want.x > b.minX && want.x < b.maxX && want.z > b.minZ && want.z < b.maxZ) want.lerp(pivot, 0.55);
    want.y = Math.max(want.y, groundH(want.x, want.z) + 0.6);
    if (!this.camPos) this.camPos = want.clone();
    this.camPos.lerp(want, 1 - Math.exp(-dt * 16));
    this.shake = Math.max(0, this.shake - dt * 2.2);
    const s = this.shake * this.shake * 0.35;
    cam.position.copy(this.camPos).add(V3((Math.random() - 0.5) * s, (Math.random() - 0.5) * s, (Math.random() - 0.5) * s));
    const look = this.lock?.alive ? pivot.clone().lerp(this.lock.pos.clone().add(V3(0, 1.4 * this.lock.scale, 0)), 0.35) : pivot.clone().addScaledVector(dir, 3);
    cam.lookAt(look);
    cam.fov = 60 + (p.state === 'dodge' ? 3 : 0) + (p.atk?.id === 'ph' && p.atk.t > p.atk.def.windup ? 4 : 0);
    cam.updateProjectionMatrix();
  }
  cineCamera(dt, t) {
    const c = this.cine, cam = this.camera, p = this.player; c.t += dt;
    if (c.shot === 'king') {
      const k = this.king;
      if (c.walk && k.pos.z > 166) { k.state = 'idle'; k.act = null; k.wish.set(0, 0, -1); k.speedMax = 1.4; k.face = Math.PI; } else if (c.walk) { k.wish.set(0, 0, 0); }
      const want = V3(5.5, groundH(5, 150) + 2.2, 147);
      cam.position.lerp(want, 1 - Math.exp(-dt * 2)); cam.lookAt(k.pos.clone().add(V3(0, 2.4, 0)).lerp(p.pos.clone().add(V3(0, 1.4, 0)), 0.3));
    } else {
      const pv = p.pos.clone().add(V3(0, 1.2, 0));
      const want = c.shot === 0 ? p.pos.clone().add(V3(1.6, 0.9, 2.4)) : c.shot === 1 ? p.pos.clone().add(V3(-2.5, 1.8, 3.5)) : p.pos.clone().add(V3(-3.5, 2.2, -5));
      cam.position.lerp(want, 1 - Math.exp(-dt * (c.t < 0.1 ? 60 : 1.5)));
      cam.lookAt(c.shot === 2 ? pv.clone().lerp(this.sera.pos.clone().add(V3(0, 1.3, 0)), 0.5).add(V3(0, 0, 8)) : pv);
    }
    cam.fov = 50; cam.updateProjectionMatrix();
  }
  endingCamera(dt, t) {
    const e = this.ending, cam = this.camera, k = this.king; e.t += dt;
    if (e.helm) { const h = e.helm; h.v.y -= 9.81 * dt; h.m.position.addScaledVector(h.v, dt); h.m.rotation.x += h.w.x * dt; h.m.rotation.z += h.w.z * dt; const gy = groundH(h.m.position.x, h.m.position.z) + 0.22; if (h.m.position.y < gy) { h.m.position.y = gy; h.v.multiplyScalar(0.4); h.v.y = Math.abs(h.v.y) * 0.3; h.w.multiplyScalar(0.5); } }
    if (e.glyph) e.glyph.rotation.y += dt * 2;
    if (e.rise !== undefined) {
      e.rise += dt;
      const r = Math.min(1, e.rise / 6), ease = r * r * (3 - 2 * r);
      const want = V3(-60 * ease, 6 + 230 * ease, 140 - 200 * ease);
      cam.position.lerp(want, 1 - Math.exp(-dt * 1.5)); cam.lookAt(V3(0, 0, 40 - 30 * ease));
      this.scene.fog.density = 0.0052 * (1 - ease * 0.8);
      // the armies below become pieces on a map
      if (r > 0.45 && !e.markers) { e.markers = true; this.tacticalOverlay(); }
    } else {
      const want = k.pos.clone().add(V3(3.2, 2.0, -3.5));
      cam.position.lerp(want, 1 - Math.exp(-dt * 2)); cam.lookAt(k.pos.clone().add(V3(0, 1.6, 0)));
    }
    cam.fov = 48; cam.updateProjectionMatrix();
  }
  tacticalOverlay() {
    const g = new THREE.Group();
    const mk = (col) => new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.85, depthWrite: false });
    const blue = mk(0x4a8aff), red = mk(0xff4a3a), line = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 });
    for (let i = 0; i < 26; i++) { const ally = i % 2 === 0, x = (Math.random() - 0.5) * 140, z = ally ? -40 + Math.random() * 60 : 40 + Math.random() * 70; const m = new THREE.Mesh(new THREE.PlaneGeometry(11, 5), ally ? blue : red); m.rotation.x = -Math.PI / 2; m.position.set(x, groundH(x, z) + 1.5, z); g.add(m); if (ally) { const pts = [V3(x, groundH(x, z) + 1.6, z + 2), V3(x * 0.6, 2, z + 30)]; g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), line)); } }
    this.scene.add(g); this.overlay = g;
    this.game.audio.rewrite(2);
    this.game.renderer.grade.uniforms.uRewrite.value = 0.35;
  }

  // ================================================================== HUD
  updateHudBars(dt) {
    const p = this.player, H = this.H;
    const hp = clamp(p.hp / p.maxHp, 0, 1);
    H.hp.style.width = hp * 100 + '%';
    this.hpLag = this.hpLag > hp ? Math.max(hp, this.hpLag - dt * 0.35) : hp; H.hpLag.style.width = this.hpLag * 100 + '%';
    H.st.style.width = clamp(p.stamina, 0, 100) + '%'; H.st.parentElement.classList.toggle('low', p.stamina < 20);
    H.flask.textContent = '◆'.repeat(this.flasks) + '◇'.repeat(3 - this.flasks);
    if (this.king) { H.bhp.style.width = clamp(this.king.hp / this.king.maxHp, 0, 1) * 100 + '%'; H.bpost.style.width = clamp(this.king.post / this.king.maxPost, 0, 1) * 100 + '%'; H.bpost.parentElement.classList.toggle('full', this.king.state === 'broken'); }
  }
  updateHudWorld() {
    const cam = this.camera, W = innerWidth, Hh = innerHeight, H = this.H;
    const proj = (v) => { const q = v.clone().project(cam); return q.z < 1 ? [(q.x * 0.5 + 0.5) * W, (-q.y * 0.5 + 0.5) * Hh] : null; };
    // lock-on reticle
    if (this.lock?.alive && !this.cine) { const s = proj(this.lock.pos.clone().add(V3(0, 1.25 * this.lock.scale, 0))); if (s) { H.lock.style.transform = `translate(${s[0]}px, ${s[1]}px)`; H.lock.classList.add('on'); } else H.lock.classList.remove('on'); } else H.lock.classList.remove('on');
    // deathblow marker
    const db = this.fighters.find((f) => f.alive && f.state === 'broken');
    if (db && !this.cine) { const s = proj(db.pos.clone().add(V3(0, 1.4 * db.scale, 0))); if (s) { H.db.style.transform = `translate(${s[0]}px, ${s[1]}px)`; H.db.classList.add('on'); } } else H.db.classList.remove('on');
    // health and posture over nearby foes
    const foes = this.fighters.filter((f) => f.alive && f.team === 'enemy' && f.type !== 'king' && f.pos.distanceTo(this.player.pos) < 14 && (f.hp < f.maxHp || f.post > 1 || f === this.lock));
    while (this.foeEls.length < foes.length) this.foeEls.push(el('div', 'kh-foe', H.foes, '<i class="hp"></i><i class="po"></i>'));
    this.foeEls.forEach((e, i) => {
      const f = foes[i]; if (!f || this.cine) { e.style.display = 'none'; return; }
      const s = proj(f.pos.clone().add(V3(0, 2.25 * f.scale, 0))); if (!s) { e.style.display = 'none'; return; }
      e.style.display = 'block'; e.style.transform = `translate(${s[0]}px, ${s[1]}px)`;
      e.children[0].style.width = (f.hp / f.maxHp) * 100 + '%'; e.children[1].style.width = Math.min(1, f.post / f.maxPost) * 100 + '%';
    });
  }

  // ================================================================== frame
  update(dt, t) {
    const g = this.game;
    // hitstop and slow motion (the HUD, camera and music run in real time)
    let k = 1;
    if (this.hitstop > 0) { this.hitstop -= dt; k = 0.04; }
    else if (this.slow > 0) { this.slow -= dt; k = this.slowScale; }
    const gdt = dt * k;
    this.t = t;
    this.sky.userData.u.uTime.value = t;
    animateBanners(this.W, t);
    const p = this.player;
    const ctx = { ground: groundH, boxes: this.W.boxes.concat(this.ram.group.visible && this.ram.box ? [this.ram.box] : []).concat(this.portcullis ? [{ minX: -6, maxX: 6, minZ: GATE_Z + 6.5, maxZ: GATE_Z + 8 }] : []), bounds: this.phase === 'king' ? this.bounds : null };
    if (!this.ending) this.updatePlayer(gdt);
    p.update(gdt, ctx);
    // enemies
    const sense = this.fighters;
    for (const f of this.fighters) {
      if (f.brain && !this.cine && !this.ending) {
        let target = p;
        if (f.ramTarget && p.pos.distanceTo(f.pos) > 7 && this.ram.group.visible) target = { pos: V3(0, 0, this.ram.z + (f.pos.z > this.ram.z ? 4.2 : -3.5)), alive: true, state: 'idle', vel: V3(), radius: 1 };
        f.brain.think(gdt, target, f.type === 'king' ? null : this.director, sense);
      }
      f.update(gdt, ctx);
    }
    if (!this.cine) resolveHits([p, ...this.fighters], (kind, info) => this.onEvent(kind, info));
    separate([p, ...this.fighters.filter((f) => f.alive)]);
    this.telegraphs(gdt);
    this.updateAmbient(gdt, { ground: groundH, boxes: this.W.boxes });
    resolveHits(this.ambient, () => {});
    this.updateSera(gdt, ctx);
    if (!this.cine && !this.ending) this.phaseLogic(gdt);
    this.updateTower(gdt);
    this.updateHazards(gdt);
    this.updateWorldFx(gdt, t);
    // clean up the dead after they have fallen
    for (let i = this.fighters.length - 1; i >= 0; i--) { const f = this.fighters[i]; if (!f.alive && f.deadT > 6 && f !== this.king) { f.dispose(this.scene); this.fighters.splice(i, 1); } }
    this.updateCamera(dt, t);
    this.hud.style.opacity = this.cine || this.ending ? 0 : 1;
    this.updateHudBars(dt); this.updateHudWorld();
    g.renderer.grade.uniforms.uDamage.value = (this.damageFlash = Math.max(0, (this.damageFlash || 0) - dt * 1.6)) * 0.5 + clamp(0.3 - p.hp / p.maxHp, 0, 0.3) * 1.5;
    // music follows the fight
    const engaged = this.fighters.some((f) => f.alive && f.team === 'enemy' && f.pos.distanceTo(p.pos) < 14);
    if (this.phase !== 'king' && !this.cine && !this.ending) g.music.setIntensity(engaged ? 0.85 : this.phase === 'field' ? 0.6 : 0.3);
    // sun and shadows follow the player
    this.sun.position.copy(p.pos).addScaledVector(this.sunDir, 80); this.sun.target.position.copy(p.pos);
  }

  updateWorldFx(dt, t) {
    const p = this.player, W = this.W;
    // fires: flames, smoke, and the 4 lights on the nearest fires
    let near = 99;
    for (const f of W.fires) {
      const pos = f.follow ? f.follow.localToWorld(f.local.clone()) : f.pos;
      const d = pos.distanceTo(p.pos); near = Math.min(near, d);
      if (d > 120) continue;
      const n = d < 50 ? 2 : 1;
      for (let i = 0; i < n; i++) if (Math.random() < 0.7) this.flames.emit(pos.clone().add(V3((Math.random() - 0.5) * 2 * f.size, Math.random() * 0.5, (Math.random() - 0.5) * 2 * f.size)), V3((Math.random() - 0.5) * 0.6, 2 + Math.random() * 2, (Math.random() - 0.5) * 0.6), { life: 0.6 + Math.random() * 0.4, size: 0.9 * f.size, grow: -0.8, color: [1, 0.45 + Math.random() * 0.2, 0.12], alpha: 0.9, drag: 0.5 });
      if (Math.random() < 0.25) this.smoke.emit(pos.clone().add(V3(0, 1.5, 0)), V3(0.8 + Math.random(), 2.5 + Math.random(), 0.3), { life: 5, size: 2 * f.size, grow: 3, color: [0.18, 0.16, 0.15], alpha: 0.4, drag: 0.2 });
    }
    this.fireLightT -= dt;
    if (this.fireLightT < 0) {
      this.fireLightT = 0.5;
      const sorted = W.fires.map((f) => ({ f, pos: f.follow ? f.follow.localToWorld(f.local.clone()) : f.pos })).sort((a, b) => a.pos.distanceTo(p.pos) - b.pos.distanceTo(p.pos));
      this.fireLights.forEach((l, i) => { const s = sorted[i]; if (s) { l.position.copy(s.pos); l.userData.base = 30 * s.f.size; } else l.userData.base = 0; });
    }
    for (const l of this.fireLights) l.intensity = (l.userData.base || 0) * (0.8 + Math.sin(t * 13 + l.position.x) * 0.12 + Math.random() * 0.12);
    this.crackle?.set(clamp(0.12 - near * 0.004, 0, 0.12), 2500);
    // gate doors flying off
    const G = W.gate; if (G.flying) for (const f of G.flying) { f.v.y -= 9.81 * dt; f.d.position.addScaledVector(f.v, dt); f.d.rotation.x += f.w.x * dt; f.d.rotation.z += f.w.y * dt; if (f.d.position.y < -0.5) { f.d.position.y = -0.5; f.v.set(0, 0, 0); f.w.set(0, 0, 0); } }
    // the courtyard wall caving in
    const CW = W.courtWall; if (CW.down) { CW.t += dt; for (const b of CW.blocks) { if (b.m.position.y < 0.6) continue; b.v.y -= 9.81 * dt; b.m.position.addScaledVector(b.v, dt); b.m.rotation.x += b.w.x * dt; b.m.rotation.z += b.w.z * dt; } }
    // distant battle: clangs and shouts from somewhere on the field
    if (this.phase !== 'king' && Math.random() < dt * 1.6) { const a = Math.random() * Math.PI * 2; this.game.audio.metal({ pos: p.pos.clone().add(V3(Math.sin(a) * 40, 0, Math.cos(a) * 40)), base: 400 + Math.random() * 500, vol: 0.12, dur: 0.4 }); }
    this.flames.update(dt); this.smoke.update(dt); this.sparks.update(dt); this.dust.update(dt);
  }

  dispose() {
    this.disposed = true;
    for (const s of [this.bed, this.wind, this.crackle]) s?.stop();
    this.game.renderer.grade.uniforms.uDamage.value = 0; this.game.renderer.grade.uniforms.uRewrite.value = 0;
    this.scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    this.hud?.remove();
  }
}
