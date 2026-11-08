// CHAPTER 3 — ROOM 611. First-person survival horror.
import * as THREE from 'three';
import { buildHotel, LAYOUT } from './hotel.js';
import { Clerk, blocked } from './clerk.js';
import { buildCharacter, KAI } from '../../characters/cast.js';
import { Animator } from '../../characters/anim.js';
import { hdri, model } from '../../engine/assets.js';
import { NoiseLoop } from '../../audio/audio.js';
import { wait, el } from '../../engine/ui.js';
import { state, setFlag, addEvidence } from '../../game/state.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

const CHECKPOINTS = {
  start: { pos: V3(-3, 0, 0), yaw: -Math.PI / 2, flags: {} },
  phone: { pos: V3(14.6, 0, -2.4), yaw: Math.PI / 2, flags: { flashlight: true, phone: true } },
  power: { pos: V3(63.5, 0, 0.4), yaw: -Math.PI / 2, flags: { flashlight: true, phone: true, keycard: true, power: true } },
  door611: { pos: V3(40.5, 0, 0.2), yaw: Math.PI / 2, flags: { flashlight: true, phone: true, keycard: true, power: true, journal: true, open611: true } },
};

const NOTES = {
  journal: { title: 'DR. E. VENN — PERSONAL LOG (VERSION 12)', body: `<p>Tomas says I've stopped sleeping. He's right. ATLAS found her again tonight — a version where the fever broke. Lia, seven, laughing at something off-screen.</p><p>Every version I stabilise costs others. The committee calls them "unobserved branches." I call them what they are. I have stopped telling them that.</p><p>In the version where she lived, we had a room for her here. Room 611. In this one, the architect never drew it.</p>` },
  memo: { title: 'HALDEN GRAND — STAFF NOTICE', body: `<p>Guests on the sixth floor have reported a member of staff in an older uniform. <b>We do not employ him.</b></p><p>If approached: do not run. He hears running. Do not shine lights at him. Find a room and stay quiet until he passes.</p><p>— Management (night shift)</p>` },
};

export default class Chapter3 {
  constructor(game) { this.game = game; this.usesPointerLock = true; }

  async load(cp) {
    const g = this.game, R = g.renderer;
    const scene = this.scene = new THREE.Scene();
    scene.background = new THREE.Color(0x010101);
    scene.fog = new THREE.FogExp2(0x020202, 0.09);
    const env = await hdri(R, 'interior');
    scene.environment = env.env; scene.environmentIntensity = 0.05;
    scene.add(new THREE.HemisphereLight(0x302a28, 0x050404, 0.12));
    this.hotel = await buildHotel(scene);
    this.buildSigns();
    this.colliders = this.hotel.colliders;
    // Kai, first person (full-body awareness: look down and you see yourself)
    this.kai = await buildCharacter(KAI);
    // in first person the hand sits a foot from the lens, under the torch: a bare block of skin glares.
    // In this hotel Kai wears dark leather gloves, so the hand stays in the gloom with everything else.
    this.kai.traverse((o) => {
      if (!o.isSkinnedMesh) return;
      const geo = o.geometry, si = geo.attributes.skinIndex, col = geo.attributes.color, mat = geo.attributes.aMat, bones = o.skeleton.bones;
      if (!si || !col) return;
      for (let i = 0; i < si.count; i++) {
        const name = bones[si.getX(i)]?.name || '';
        if (/^(hand|thumb|index|middle|ring|pinky|finger)/i.test(name)) { const k = 0.6 + (i % 7) * 0.02; col.setXYZ(i, 0.035 * k, 0.03 * k, 0.028 * k); if (mat) mat.setX(i, 2); }
      }
      col.needsUpdate = true; if (mat) mat.needsUpdate = true;
    });
    this.kaiAnim = new Animator(this.kai);
    scene.add(this.kai);
    this.kai.anchor.light.distance = 3.5;
    this.flashlight = (await model('vintage_flashlight')).clone();
    this.flashlight.scale.setScalar(0.85);
    this.kai.bones.handR.add(this.flashlight);
    this.flashlight.position.set(-0.04, -0.07, 0.03); this.flashlight.rotation.set(0.4, 0, 0.3);
    this.flashlight.visible = false;
    this.flashlight.traverse((o) => { if (o.isMesh) o.castShadow = false; });
    this.torch = new THREE.SpotLight(0xfff0dc, 0, 22, 0.42, 0.55, 1.6);
    this.torch.castShadow = true; this.torch.shadow.mapSize.set(R.quality.shadows >= 2048 ? 1024 : 512, R.quality.shadows >= 2048 ? 1024 : 512); this.torch.shadow.bias = -0.0008; this.torch.shadow.camera.near = 0.2;
    scene.add(this.torch, this.torch.target);
    this.torchFill = new THREE.PointLight(0xfff0dc, 0, 3, 2); scene.add(this.torchFill);
    // the Clerk
    this.clerk = await new Clerk().load(scene, this.hotel, g.audio);
    this.clerk.walls = this.colliders;
    this.camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.06, 200);
    R.set(scene, this.camera);
    R.setGrade({ exposure: 1.25, bloom: [0.45, 0.4, 0.85], saturation: 0.82, contrast: 1.12, vignette: 0.62, lift: [0.01, 0.008, 0.012], gain: [1.02, 0.98, 0.94], grain: 0.025 });
    this.buildHud();
    this.ray = new THREE.Raycaster();
    this.reset(cp);
  }

  buildHud() {
    this.hud = this.game.ui.hud(`<div class="fp-dot"></div><div class="battery">${'<i></i>'.repeat(5)}</div><div class="hide-vignette"></div><div class="breath"><i></i></div><div class="inventory"></div><div class="pause-hint">ESC · PAUSE</div>`);
    const q = (s) => this.hud.querySelector(s);
    this.H = { dot: q('.fp-dot'), bat: [...this.hud.querySelectorAll('.battery i')], hide: q('.hide-vignette'), breath: q('.breath'), breathBar: q('.breath i'), inv: q('.inventory') };
  }

  reset(cp) {
    this.cp = cp;
    const c = CHECKPOINTS[cp] || CHECKPOINTS.start;
    this.pos = c.pos.clone(); this.vel = V3(); this.yaw = c.yaw; this.pitch = 0;
    this.f = { flashlight: false, phone: false, keycard: false, power: false, journal: false, open611: false, memo: false, ...c.flags };
    this.battery = 1; this.torchOn = !!this.f.flashlight; this.stamina = 1; this.breath = 1; this.holding = false;
    this.hidden = null; this.crouch = 0; this.grab = null; this.anchorCharge = this.f.power ? 1 : 0.15; this.rewriteT = 0;
    this.flashlight.visible = this.f.flashlight; this.hotel.flashlightProp.visible = !this.f.flashlight;
    this.hotel.keycard.visible = !this.f.keycard;
    this.hotel.hkDoor.locked = !this.f.keycard;
    this.hotel.lever.rotation.z = this.f.power ? 0.8 : -0.8;
    for (const d of this.hotel.doors) { d.angle = 0; d.vel = 0; d.update(0); }
    this.setPower(this.f.power);
    this.set611(this.f.open611);
    this.clerk.hide();
    // everything before the final chase is scripted: the Clerk only appears when the story puts it there
    this.sc = { glimpse: cp !== 'start', walkby: cp !== 'start' && cp !== 'phone' ? true : cp === 'phone', cart: !!this.f.keycard, behind: !!this.f.power, wardrobe: !!this.f.journal, stepsT: 30 };
    this.act = null; this.blackout = 0; this.shakeT = 0;
    if (cp === 'door611') { const d611 = this.hotel.roomInfo[611].door; d611.locked = true; d611.forcing = 0; this.startChase(); }
    this.phase = cp === 'start' ? 'wake' : 'explore';
    this.phoneRinging = false; this.said = new Set(); this.ending = false; this.caught = false;
    this.stepT = 0;
    this.morph = cp === 'start' ? 1 : 0;
    this.applyMorph(this.morph > 0);
    this.updateInventory();
  }

  setPower(on) {
    const h = this.hotel;
    h.sconces.forEach((s, i) => { s.on = on ? true : i % 5 === 0; s.shade.material.emissiveIntensity = s.on ? (on ? 2.2 : 0.8) : 0.05; });
    h.chandLight.intensity = on ? 3 : 0.4;
    this.power = on;
    // 602's bedside lamp survives the outage: a lure toward the flashlight
    for (const [num, rp] of Object.entries(h.roomProps)) { const keep = num === '602'; rp.lamp.intensity = on ? 1.2 : keep ? 0.7 : 0; rp.lampShade.material.emissiveIntensity = on ? 1.5 : keep ? 1.0 : 0; }
  }

  set611(open) {
    const h = this.hotel;
    h.hiddenWall.visible = !open; h.lia.visible = open; h.roomInfo[611].door.group.visible = open;
    h.hiddenCol.minX = open ? 1e6 : LAYOUT.rooms[611].x - LAYOUT.roomW / 2 + 0.8; h.hiddenCol.maxX = open ? 1e6 : h.hiddenCol.minX + 0.97;
    h.bigPainting.visible = !open;
    h.lia.userData.sun.intensity = open ? 30 : 0;
    this.clerk.ignore611 = open;
  }

  applyMorph(ship) {
    // the opening: the corridor is still the Meridian's passageway
    const h = this.hotel;
    for (const m of h.shell) {
      if (!m.userData.orig) m.userData.orig = m.material;
      if (!ship) { m.material = m.userData.orig; continue; }
      if (m.name === 'floor' || m.name === 'roomFloor' || m.name === 'lobbyFloor') m.material = h.mats.shipFloor;
      else if (m.name !== 'ceiling') m.material = h.mats.shipWall;
    }
    h.paintings.forEach((p) => (p.visible = !ship));
  }

  start(cp, opts = {}) {
    const g = this.game;
    g.audio.setReverb(1.8, 2.5); g.audio.setReverbMix(0.4); g.audio.setMuffle(20000, 0.2);
    this.startAudio();
    g.music.play('horror', { intensity: 0.05 });
    if (cp === 'start') this.intro(opts);
    else { g.ui.fadeColor('#000'); g.ui.fade(0, 1.2); this.phase = 'explore'; this.objectiveForState(); }
  }

  async restart(cp) { this.game.ui.subs.innerHTML = ''; this.game.ui.hideNote(); this.reset(cp); this.phase = 'explore'; this.objectiveForState(); }

  startAudio() {
    const a = this.game.audio; if (!a.ctx || this.hum) return;
    this.hum = new NoiseLoop(a, { type: 'bandpass', freq: 120, q: 8, dest: a.amb, buf: a.brown }); this.hum.set(0.2, 120);
    this.roomTone = new NoiseLoop(a, { type: 'lowpass', freq: 200, dest: a.amb }); this.roomTone.set(0.06, 200);
    this.water = new NoiseLoop(a, { type: 'lowpass', freq: 500, dest: a.amb, buf: a.pink }); this.water.set(0, 500);
  }

  line(id, lines) { if (this.said.has(id)) return; this.said.add(id); this.game.ui.conversation(lines, () => this.disposed); }

  async intro() {
    const g = this.game, ui = g.ui;
    this.phase = 'wake';
    ui.fadeColor('#000'); await ui.fade(1, 0.01);
    this.water?.set(0.35, 700);
    await wait(500);
    ui.fade(0, 2.2);
    this.line('w0', [['SERA', 'Kai — this way, there\'s a—', { duration: 1.6 }]]);
    await wait(1900);
    // the passageway forgets it was a ship
    for (let i = 0; i < 14 && !this.disposed; i++) { this.applyMorph(Math.random() < 0.5 - i * 0.03); g.audio.burst({ freq: 3000 + Math.random() * 4000, q: 10, dur: 0.04, vol: 0.05 }); await wait(80 + Math.random() * 220); }
    this.applyMorph(false); this.morph = 0;
    this.water?.set(0, 300, 1.2);
    await wait(900);
    g.audio.tone({ type: 'sine', freq: 1318, dur: 1.4, vol: 0.06, reverb: 0.8 }); g.audio.tone({ type: 'sine', freq: 988, dur: 1.6, vol: 0.05, at: 0.25, reverb: 0.8 });
    await wait(800);
    ui.chapterCard(3, 'ROOM 611', 'First-person survival horror', 3.2);
    await wait(3600);
    await ui.say('KAI', 'Sera?', { duration: 1.6, thought: false });
    await wait(1200);
    await ui.say('KAI', '…Sera?', { duration: 1.6 });
    await ui.say('ANCHOR', 'LOCAL VERSION: HALDEN GRAND HOTEL. COMPANION SIGNAL: ADJACENT. NOT HERE.', { duration: 3.5 });
    this.phase = 'explore';
    ui.hint('<kbd>WASD</kbd> move · mouse look · <kbd>E</kbd> interact · <kbd>Shift</kbd> run (it hears running) · <kbd>C</kbd> crouch · hold <kbd>LMB</kbd> on a door and move the mouse to swing it · click to capture the mouse', 11000);
    this.objectiveForState();
  }

  objectiveForState() {
    const ui = this.game.ui, f = this.f;
    if (!f.flashlight) ui.objective('Find a light', 'One of the rooms is open. The Anchor glows, faintly.');
    else if (!f.phone) ui.objective('Answer the phone', 'Something is ringing down the corridor');
    else if (!f.keycard) ui.objective('Find a master keycard', 'Housekeeping — the cart was left near 612');
    else if (!f.power) ui.objective('Restore the power', 'The breaker is in the housekeeping room at the end of the hall');
    else if (!f.open611) ui.objective('Find room 611', f.journal ? 'It should be between 609 and 613. Use the Anchor (hold Q) where it should be.' : 'There is no 611 on this floor. Room 609 might explain why.');
    else ui.objective('Get into 611', this.hotel.roomInfo[611].door.locked ? 'Hold E at its door to force it — he is coming' : 'Go through the door in Lia\'s room');
  }

  // ------------------------------------------------------------------ update
  update(dt, t) {
    this.t = t;
    if (this.caught) { this.updateCaught(dt, t); return; }
    if (this.ending) { this.updateEnding(dt, t); return; }
    this.control(dt, t);
    this.scripts(dt, t);
    this.blackout = Math.max(0, this.blackout - dt);
    if (this.shakeT > 0) { this.shakeT -= dt; const k = this.shakeT * 0.12; this.camera.position.add(V3((Math.random() - 0.5) * k, (Math.random() - 0.5) * k, (Math.random() - 0.5) * k)); }
    this.updateWorld(dt, t);
    const r = this.clerk.update(dt, t, this.playerState());
    if (r === 'caught' && this.f.open611) this.getCaught(); // only the final chase can end you
    this.updateTension(dt, t);
    this.updateMarker();
  }

  playerState() {
    return { pos: this.pos, hidden: this.hidden, hiddenSeen: this.hiddenSeen, flashlightOn: this.torchOn && this.battery > 0, crouched: this.crouch > 0.5, inLight: this.power && !this.hidden };
  }

  emitNoise(loud) { this.clerk.hear(this.pos.clone(), loud); }

  control(dt, t) {
    const g = this.game, inp = g.input, ui = g.ui;
    if (ui.noteOpen) { if (inp.hit('KeyE') || inp.mouse.pressed.has(0) || inp.hit('Escape')) ui.hideNote(); return; }
    let [lx, ly] = inp.lookDelta();
    // grabbing a door consumes the mouse
    if (this.grab) {
      const d = this.grab.door;
      const toHinge = d.hingeWorld().sub(this.pos); toHinge.y = 0;
      const n = V3(0, 0, 1).applyQuaternion(d.group.quaternion); // door normal (closed)
      const sideSign = Math.sign(toHinge.dot(n)) || 1;
      const push = -inp.mouse.dy * 0.0065 * sideSign + inp.mouse.dx * 0.002 * this.grab.handSign;
      d.vel += push * 60 * dt * 60 * 0.016;
      d.vel = clamp(d.vel, -7, 7);
      lx *= 0.1; ly *= 0.1;
      if (!inp.mouse.down.has(0)) this.grab = null;
    }
    if (!this.hidden) { this.yaw -= lx; this.pitch = clamp(this.pitch - ly, -1.35, 1.35); }
    else { this.yaw -= lx * 0.5; this.pitch = clamp(this.pitch - ly * 0.5, -0.5, 0.5); }
    if (inp.hit('KeyF') && this.f.flashlight) { this.torchOn = !this.torchOn; g.audio.tone({ type: 'square', freq: 2400, dur: 0.02, vol: 0.05, reverb: 0 }); }
    if (inp.hit('KeyC') || inp.hit('ControlLeft')) this.crouchWant = !this.crouchWant;
    this.crouch += ((this.crouchWant ? 1 : 0) - this.crouch) * Math.min(1, dt * 8);
    // hiding
    if (this.hidden) {
      const h = this.hidden;
      this.pos.lerp(h.inside.clone().setY(0), 1 - Math.exp(-dt * 8));
      this.holding = inp.down('Space') && this.breath > 0;
      this.breath = clamp(this.breath + (this.holding ? -dt * 0.16 : dt * 0.22), 0, 1);
      if (this.breath <= 0 && this.wasHolding) { g.audio.burst({ freq: 900, type: 'lowpass', dur: 0.6, vol: 0.25 }); this.emitNoise(0.5); }
      this.wasHolding = this.holding;
      // breathing gives you away if it's close and you aren't holding your breath
      const cd = this.clerk.pos.distanceTo(this.pos);
      if (!this.holding && cd < 2.5 && this.clerk.state !== 'dormant' && Math.random() < dt * 0.6) { this.hiddenSeen = true; this.emitNoise(0.3); }
      if (inp.hit('KeyE')) this.unhide();
      this.H.hide.classList.add('show'); this.H.breath.classList.toggle('show', cd < 6 || this.breath < 1); this.H.breathBar.style.width = this.breath * 100 + '%';
      this.placeCamera(dt, t, 0);
      ui.prompt(cd < 4 && this.clerk.state !== 'dormant' ? 'Hold <kbd>Space</kbd> — hold your breath' : '<kbd>E</kbd> Leave');
      return;
    }
    this.H.hide.classList.remove('show'); this.H.breath.classList.remove('show');
    // movement
    const run = inp.any('ShiftLeft', 'ShiftRight') && this.stamina > 0.05 && this.crouch < 0.5;
    const maxV = this.crouch > 0.5 ? 0.9 : run ? 4.4 : 1.7;
    const f = V3(Math.sin(this.yaw), 0, Math.cos(this.yaw)), r = V3(-Math.cos(this.yaw), 0, Math.sin(this.yaw));
    const wish = f.multiplyScalar(inp.moveY).add(r.multiplyScalar(inp.moveX));
    if (wish.lengthSq() > 1) wish.normalize();
    this.vel.lerp(wish.multiplyScalar(maxV), 1 - Math.exp(-dt * 9));
    this.pos.addScaledVector(this.vel, dt);
    this.stamina = clamp(this.stamina + (run && wish.lengthSq() > 0.1 ? -dt / 6 : dt / 8), 0, 1);
    // collisions (walls + closed doors)
    const rad = 0.3;
    const cols = this.colliders.concat(this.doorColliders());
    for (let k = 0; k < 2; k++) for (const b of cols) {
      const cx = clamp(this.pos.x, b.minX, b.maxX), cz = clamp(this.pos.z, b.minZ, b.maxZ);
      const dx = this.pos.x - cx, dz = this.pos.z - cz, d = Math.hypot(dx, dz);
      if (d < rad && d > 1e-5) { this.pos.x += (dx / d) * (rad - d); this.pos.z += (dz / d) * (rad - d); }
    }
    // footsteps → noise
    const sp = Math.hypot(this.vel.x, this.vel.z);
    if (sp > 0.3) {
      this.stepT -= dt * sp / (run ? 1.7 : 0.95);
      if (this.stepT < 0) {
        this.stepT = 0.6;
        const surf = this.pos.x < 0 ? 'tile' : Math.abs(this.pos.z) > 1.3 ? 'wood' : 'carpet';
        g.audio.footstep(surf, null, run ? 0.4 : this.crouch > 0.5 ? 0.08 : 0.2);
        this.emitNoise(run ? 1.0 : this.crouch > 0.5 ? 0.03 : 0.18);
      }
    }
    // body animation
    this.kai.position.copy(this.pos); this.kai.rotation.y = this.yaw;
    this.kaiAnim.mode = this.crouch > 0.5 ? 'crouch' : sp > 0.25 ? (sp > 3 ? 'run' : 'walk') : 'idle';
    this.kaiAnim.speed = sp;
    this.kaiAnim.mood = 'tense';
    this.placeCamera(dt, t, sp);
    this.interact(dt, t);
  }

  doorColliders() {
    const out = [];
    for (const d of this.hotel.doors) {
      if (!d.group.visible || d.angle > 0.9) continue;
      const a = d.group.localToWorld(V3(0, 0, 0)), b = d.group.localToWorld(V3(d.width, 0, 0));
      out.push({ minX: Math.min(a.x, b.x) - 0.05, maxX: Math.max(a.x, b.x) + 0.05, minZ: Math.min(a.z, b.z) - 0.05, maxZ: Math.max(a.z, b.z) + 0.05, door: d });
    }
    return out;
  }

  placeCamera(dt, t, sp) {
    const cam = this.camera, a = this.kaiAnim;
    // arms: right hand forward holding the torch, left hand raises the Anchor when scanning (Q)
    const camQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(this.pitch, this.yaw + Math.PI, 0, 'YXZ'));
    const fromCam = (x, y, z) => V3(x, y, z).applyQuaternion(camQ).add(cam.position);
    this.kai.updateMatrixWorld(true);
    if (this.f.flashlight && !this.hidden) { a.ik.handR = fromCam(-0.2, -0.24, -0.42); a.grip.R = 0.9; a.handPose('R', V3(-0.25, -0.1, 1), V3(-1, 0.2, 0)); }
    else { a.ik.handR = null; a.ik.handRotR = null; }
    if (this.scanning) { a.ik.handL = fromCam(0.16, -0.2, -0.36); a.grip.L = 0.3; }
    else { a.ik.handL = null; a.ik.handRotL = null; }
    a.lookTarget = fromCam(0, 0, -5);
    a.update(dt);
    // hide the head from the inside (the camera sits in it)
    this.kai.bones.head.scale.setScalar(0.001);
    // camera at the eyes, stabilised
    const head = this.kai.bones.neck.getWorldPosition(V3());
    const eye = this.hidden ? this.hidden.inside.clone() : head.add(V3(0, 0.2 - this.crouch * 0.05, 0)).add(V3(Math.sin(this.yaw), 0, Math.cos(this.yaw)).multiplyScalar(0.19));
    if (!this.eye) this.eye = eye.clone();
    this.eye.lerp(eye, 1 - Math.exp(-dt * 18));
    cam.position.copy(this.eye);
    cam.quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw + Math.PI, 0, 'YXZ'));
    // flashlight follows the view with a little lag
    const on = this.torchOn && this.battery > 0 && this.f.flashlight;
    const flick = this.battery < 0.2 ? (Math.random() < 0.1 ? 0.2 : 1) : 1;
    this.torch.intensity = on ? 38 * flick : 0; this.torchFill.intensity = on ? 0.6 : 0;
    // light origin just ahead of the lens so the hand and torch body don't shadow the beam
    const tp = (this.f.flashlight && !this.hidden ? this.flashlight.getWorldPosition(V3()) : cam.position.clone()).add(V3(0, 0, -0.35).applyQuaternion(cam.quaternion));
    this.torch.position.lerp(tp, 1 - Math.exp(-dt * 20));
    const aim = fromCam(0, 0, -6);
    this.torch.target.position.lerp(aim, 1 - Math.exp(-dt * 10));
    this.torchFill.position.copy(cam.position);
    if (on) this.battery = Math.max(0, this.battery - dt * 0.006);
    // the Anchor glows brighter as the Clerk approaches (proximity sense)
    const cd = this.clerk.state !== 'dormant' ? this.clerk.pos.distanceTo(this.pos) : 99;
    const near = clamp(1 - cd / 14, 0, 1);
    const pulse = 0.5 + 0.5 * Math.sin(t * (3 + near * 14));
    this.kai.anchor.light.intensity = 0.35 + near * pulse * 1.2 + (this.scanning ? 1.2 : 0);
    this.kai.anchor.glow.emissiveIntensity = 1.2 + near * pulse * 3 + (this.scanning ? 3 : 0);
  }

  // ------------------------------------------------------------------ interaction
  interact(dt, t) {
    const g = this.game, inp = g.input, ui = g.ui, h = this.hotel, f = this.f;
    const cam = this.camera;
    const look = V3(0, 0, -1).applyQuaternion(cam.quaternion);
    const near = (p, r) => p.distanceTo(V3(this.pos.x, p.y, this.pos.z)) < r;
    const aimAt = (p, r = 2.2, cone = 0.85) => { const d = p.clone().sub(cam.position); return d.length() < r && d.normalize().dot(look) > cone; };
    let prompt = null, active = false;
    this.scanning = inp.down('KeyQ');
    // doors (grab with LMB, or E to nudge)
    let bestDoor = null, bd = 2.0;
    for (const d of h.doors) {
      if (!d.group.visible) continue;
      const c = d.group.localToWorld(V3(d.width / 2, 1.1, 0));
      c.y = cam.position.y; // judge facing the door horizontally, so standing right at it still counts
      const dist = c.distanceTo(cam.position);
      if (dist < bd && c.clone().sub(cam.position).normalize().dot(look) > 0.75) { bd = dist; bestDoor = d; }
    }
    if (bestDoor && !this.grab) {
      const d = bestDoor;
      if (d.locked && d.number === 611 && f.open611) {
        prompt = `<b>Hold</b> <kbd>E</kbd> Force the door ${'▮'.repeat(Math.round((d.forcing || 0) / 2.2 * 8))}${'▯'.repeat(8 - Math.round((d.forcing || 0) / 2.2 * 8))}`;
        if (inp.down('KeyE')) { d.forcing = (d.forcing || 0) + dt; if (Math.random() < dt * 8) g.audio.metal({ pos: d.hingeWorld().add(V3(0, 1, 0)), base: 260 + Math.random() * 120, vol: 0.18, dur: 0.3 }); if (d.forcing > 2.2) { d.locked = false; d.vel = 3.2; g.audio.crash(d.hingeWorld(), 0.5); this.objectiveForState(); this.line('forced', [['SERA', 'You\'re through — the door, Kai, the light!']]); } }
        else d.forcing = Math.max(0, (d.forcing || 0) - dt * 0.5);
      } else if (d.locked) {
        if (d.keycard && f.keycard) { prompt = '<kbd>E</kbd> Swipe keycard'; if (inp.hit('KeyE')) { d.locked = false; d.led?.material.emissive.setHex(0x20ff40); g.audio.tone({ type: 'sine', freq: 1760, dur: 0.12, vol: 0.06 }); g.audio.tone({ type: 'sine', freq: 2349, dur: 0.18, vol: 0.06, at: 0.12 }); } }
        else { prompt = d.stair ? 'Chained shut' : d.keycard ? 'Keycard required' : 'Locked'; if (inp.hit('KeyE') || inp.mouse.pressed.has(0)) { g.audio.metal({ base: 400, vol: 0.12, dur: 0.25 }); this.emitNoise(0.3); if (d.number && !this.said.has('locked')) this.line('locked', [['KAI', 'Locked. Of course it\'s locked.', { duration: 1.6 }]]); } }
      } else {
        prompt = 'Hold <kbd>LMB</kbd> + move mouse · <kbd>E</kbd> push';
        active = true;
        if (inp.mouse.pressed.has(0)) { const local = d.group.worldToLocal(cam.position.clone()); this.grab = { door: d, handSign: local.z > 0 ? 1 : -1 }; }
        if (inp.hit('KeyE')) { d.vel = d.angle > 0.8 ? -2.2 : 2.4; }
      }
    }
    // pickups & objects
    if (!f.flashlight && aimAt(h.flashlightProp.getWorldPosition(V3()))) { prompt = '<kbd>E</kbd> Take flashlight'; active = true; if (inp.hit('KeyE')) { f.flashlight = true; h.flashlightProp.visible = false; this.flashlight.visible = true; this.torchOn = true; g.audio.tone({ type: 'square', freq: 2400, dur: 0.02, vol: 0.05 }); ui.hint('<kbd>F</kbd> flashlight — it shows you more, and shows <i>you</i> more', 6000); this.line('fl', [['KAI', 'Okay. Light. Light is good.']]); this.startPhone(); this.objectiveForState(); } }
    if (this.phoneRinging && aimAt(h.phone.getWorldPosition(V3()), 2.4, 0.7)) { prompt = '<kbd>E</kbd> Answer the phone'; active = true; if (inp.hit('KeyE')) this.answerPhone(); }
    if (f.phone && !f.keycard && aimAt(h.keycard.getWorldPosition(V3()), 2.2, 0.8)) { prompt = '<kbd>E</kbd> Take master keycard'; active = true; if (inp.hit('KeyE')) { f.keycard = true; h.keycard.visible = false; g.audio.tone({ type: 'triangle', freq: 1400, dur: 0.05, vol: 0.05 }); this.updateInventory(); this.objectiveForState(); } }
    if (!f.power && aimAt(h.panel.getWorldPosition(V3()), 2.2, 0.7)) { prompt = '<kbd>E</kbd> Throw the breaker'; active = true; if (inp.hit('KeyE')) this.restorePower(); }
    if (aimAt(h.journal.getWorldPosition(V3()), 2.2, 0.8)) { prompt = '<kbd>E</kbd> Read'; active = true; if (inp.hit('KeyE')) { ui.showNote(NOTES.journal.title, NOTES.journal.body); if (!f.journal) { f.journal = true; addEvidence('venn_lia'); setFlag('knows_lia'); this.line('j', [3, ['KAI', 'She had a daughter.', { thought: true }], ['KAI', 'Has. Had. Depends where you\'re standing.', { thought: true }]]); this.objectiveForState(); } } }
    if (aimAt(h.cart.localToWorld(V3(-0.25, 1.2, 0)), 2.2, 0.8) && !f.memo) { prompt = '<kbd>E</kbd> Read the notice'; active = true; if (inp.hit('KeyE')) { f.memo = true; ui.showNote(NOTES.memo.title, NOTES.memo.body); } }
    // hiding places
    for (const hd of h.hides) {
      if (hd.room === 611) continue;
      if (hd.pos.distanceTo(V3(this.pos.x, 0, this.pos.z)) < 1.0 && aimAt(hd.inside, 2.4, 0.4)) {
        prompt = hd.kind === 'wardrobe' ? '<kbd>E</kbd> Hide in the wardrobe' : '<kbd>E</kbd> Crawl under the bed'; active = true;
        if (inp.hit('KeyE')) this.hide(hd);
      }
    }
    // 611: the painting where a door should be
    const paint = V3(46.4, 1.4, LAYOUT.corridor.z1 - 0.3);
    if (!f.open611 && near(paint, 2.4)) {
      if (!this.scanning) { prompt = f.journal || f.power ? 'Hold <kbd>Q</kbd> — raise the Anchor' : 'A painting. Someone has hung it exactly where a door should be.'; active = true; }
      else if (this.anchorCharge < 0.5) { prompt = 'The Anchor flickers. Not enough power.'; this.line('weak', [['ANCHOR', 'CHARGE INSUFFICIENT TO HOLD AN ADJACENT VERSION.']]); }
      else {
        this.rewriteT += dt; prompt = 'Holding the version… ' + Math.round(Math.min(1, this.rewriteT / 3) * 100) + '%';
        g.renderer.grade.uniforms.uRewrite.value = this.rewriteT / 3 * 0.6;
        if (Math.random() < dt * 8) g.audio.burst({ freq: 2000 + Math.random() * 5000, q: 12, dur: 0.05, vol: 0.06 });
        if (this.rewriteT > 3) this.open611();
      }
    } else { this.rewriteT = Math.max(0, this.rewriteT - dt * 2); if (!this.ending) g.renderer.grade.uniforms.uRewrite.value = this.rewriteT / 3 * 0.6; }
    // the impossible doorway
    if (f.open611) {
      const portal = h.lia.userData.portal.getWorldPosition(V3()).add(V3(0, 1.3, 0));
      if (near(portal, 2.0)) { prompt = '<kbd>E</kbd> Go through'; active = true; if (inp.hit('KeyE')) this.goThrough(); }
    }
    ui.prompt(prompt);
    this.H.dot.classList.toggle('active', active);
  }

  hide(hd) {
    const g = this.game;
    this.hidden = hd; this.breath = 1; this.vel.set(0, 0, 0);
    // if it can see you right now, it saw you hide
    const cs = this.clerk;
    this.hiddenSeen = cs.state !== 'dormant' && !blocked(cs.pos, this.pos, this.colliders) && cs.pos.distanceTo(this.pos) < 12;
    g.audio.creakShort(null, 0.25);
    this.yaw = Math.atan2(hd.look.x - hd.inside.x, hd.look.z - hd.inside.z); this.pitch = 0;
    this.kai.visible = false;
  }
  unhide() {
    const hd = this.hidden; this.hidden = null; this.hiddenSeen = false;
    this.pos.copy(hd.pos); this.kai.visible = true; this.eye = null;
    this.game.audio.creakShort(null, 0.2);
  }
  updateInventory() {
    const items = [];
    if (this.f.flashlight) items.push('FLASHLIGHT');
    if (this.f.keycard) items.push('MASTER KEYCARD');
    if (this.f.journal) items.push('VENN\'S LOG');
    this.H.inv.innerHTML = items.map((i) => `<div>${i}</div>`).join('');
  }

  startPhone() {
    if (this.f.phone || this.phoneRinging) return;
    this.phoneRinging = true; this.ringT = 0;
  }

  async answerPhone() {
    const g = this.game, ui = g.ui;
    this.phoneRinging = false; this.f.phone = true;
    g.audio.tone({ type: 'square', freq: 400, dur: 0.05, vol: 0.05 });
    g.music.setIntensity(0.25);
    await ui.conversation([
      ['SERA', 'Kai? Kai, is that you? I can hear you through the walls — you\'re in the same building but it\'s… a different one.', { duration: 4.4 }],
      ['KAI', 'Where are you? You were right behind me.', { duration: 2.2 }],
      ['SERA', 'Same hotel. Different version. Listen to me. There\'s a man on your floor. The night clerk. He\'s what\'s left of a version that collapsed — he doesn\'t know he\'s gone.', { duration: 5.2 }],
      ['SERA', 'He hears running. He sees light. If he finds you, I don\'t know what happens. Don\'t find out.', { duration: 4 }],
      ['KAI', 'Great. How do I get to you?', { duration: 2 }],
      ['SERA', 'Room 611. It\'s the only room that exists in both our versions. Find it.', { duration: 3.6 }],
      ['KAI', 'Sera. There is no 611. I walked past it. It goes 609, 613.', { duration: 3.4 }],
      ['SERA', 'Then make it exist. Your Anchor can hold a version still for a few seconds — but it needs power. The breaker is in—', { duration: 4.6 }],
    ], () => this.disposed);
    g.audio.burst({ freq: 3000, q: 1, dur: 1.2, vol: 0.08 });
    await ui.say('NONE', '<i>The line fills with static. Somewhere down the hall, a door opens.</i>', { duration: 3 });
    this.game.checkpoint('phone');
    this.objectiveForState();
    this.playScene('walkby');
  }

  async restorePower() {
    const g = this.game, ui = g.ui;
    this.f.power = true;
    this.hotel.lever.rotation.z = 0.8;
    g.audio.metal({ base: 200, vol: 0.4, dur: 0.8 }); g.audio.tone({ freq: 50, dur: 1.5, vol: 0.4, type: 'sawtooth' });
    for (let i = 0; i < 6; i++) { setTimeout(() => this.setPower(i % 2 === 0), i * 130); }
    setTimeout(() => this.setPower(true), 900);
    this.anchorCharge = 1;
    this.emitNoise(1.4);
    g.music.setIntensity(0.4);
    this.line('pw', [1, ['ANCHOR', 'CHARGE RESTORED. ADJACENT VERSION ACCESSIBLE FOR 3 SECONDS.'], ['KAI', 'It\'s drinking the building.'], 2, ['KAI', '…and it definitely heard that.']]);
    g.checkpoint('power');
    this.objectiveForState();
    setTimeout(() => { if (!this.disposed && !this.f.open611) this.playScene('behind'); }, 2600);
  }

  open611() {
    const g = this.game;
    this.f.open611 = true;
    g.audio.rewrite(2); g.renderer.grade.uniforms.uFlash.value = 0.7; setTimeout(() => (g.renderer.grade.uniforms.uFlash.value = 0), 150);
    this.set611(true);
    this.rewriteT = 0; g.renderer.grade.uniforms.uRewrite.value = 0;
    this.emitNoise(2);
    // the only real chase: the new door is jammed shut by the rewrite, and it knows where you are
    const d611 = this.hotel.roomInfo[611].door; d611.locked = true; d611.forcing = 0;
    this.startChase();
    g.music.setIntensity(1);
    this.line('611', [['KAI', 'Six-eleven.'], ['SERA', 'It\'s jammed — FORCE it! He\'s coming, Kai, he can hear the room being made!']]);
    this.objectiveForState();
    g.checkpoint('door611');
  }

  async goThrough() {
    if (this.ending) return;
    const g = this.game, ui = g.ui;
    this.ending = { t: 0 };
    ui.prompt(null); ui.objective(null);
    setFlag('ch3_lia', this.f.journal);
    this.clerk.hide();
    g.audio.rewrite(3);
    g.music.stop(2);
    ui.fadeColor('#fff6e0'); await ui.fade(1, 1.8);
    await ui.say('NONE', '<i>Birdsong. Wind through long grass. The smell of smoke.</i>', { duration: 3.2 });
    ui.fadeColor('#000'); await ui.fade(1, 0.8);
    g.nextChapter();
  }

  getCaught() {
    if (this.caught) return;
    const g = this.game;
    this.caught = { t: 0 };
    this.hidden = null; this.kai.visible = true;
    g.audio.burst({ freq: 2500, freqEnd: 400, q: 2, dur: 1.4, vol: 0.9 }); g.audio.tone({ type: 'sawtooth', freq: 70, freqEnd: 30, dur: 1.4, vol: 0.8 }); g.music.hit(1.2);
    g.renderer.grade.uniforms.uRewrite.value = 0.9;
  }
  updateCaught(dt, t) {
    const c = this.caught; c.t += dt;
    // it fills the frame
    const head = this.clerk.ch.bones.head.getWorldPosition(V3());
    this.camera.position.lerp(head.clone().add(V3(Math.sin(this.clerk.yaw), 0.02, Math.cos(this.clerk.yaw)).multiplyScalar(0.45)), 1 - Math.exp(-dt * 10));
    this.camera.lookAt(head);
    this.clerk.anim.update(dt);
    if (c.t > 1.1 && !c.done) { c.done = true; this.game.renderer.grade.uniforms.uRewrite.value = 0; this.caught = null; this.game.fail('IT FOUND YOU'); }
  }
  updateEnding(dt) { this.ending.t += dt; this.kaiAnim.update(dt); }

  startChase() {
    const c = this.clerk, fwd = V3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    this.act = null;
    // it comes from down the corridor on the far side from 611, so the race is to the door, not into it
    const dx = this.hotel.roomInfo[611].door.group.localToWorld(V3(0.5, 0, 0)).x;
    const at = V3(clamp(dx + (this.pos.x >= dx ? 1 : -1) * 15, 2, 60), 0, 0);
    if (Math.abs(at.x - this.pos.x) < 11) at.x = clamp(this.pos.x + (this.pos.x >= dx ? 12 : -12), 2, 60);
    c.spawn(at, 'chase'); c.chaseSpeed = 3.55; c.alert = 1; c.lastSeen = this.pos.clone(); c.route(this.pos.clone());
    c.voice('spot');
  }

  // ------------------------------------------------------------------ scripted scares
  stinger(loud = 1) {
    const a = this.game.audio;
    a.burst({ freq: 2600, freqEnd: 380, q: 2, dur: 1.0, vol: 0.75 * loud }); a.tone({ type: 'sawtooth', freq: 82, freqEnd: 34, dur: 1.1, vol: 0.55 * loud });
    a.burst({ freq: 6000, q: 1, dur: 0.08, vol: 0.4 * loud });
    this.game.music.hit?.(1);
  }
  dread() { const a = this.game.audio; a.tone({ type: 'sawtooth', freq: 55, freqEnd: 52, dur: 3, vol: 0.18, attack: 1.2, reverb: 0.8 }); a.tone({ type: 'sine', freq: 2900, freqEnd: 3100, dur: 2.5, vol: 0.03, attack: 1, reverb: 0.9 }); }
  playScene(kind) {
    const c = this.clerk, p = this.pos, fwd = V3(Math.sin(this.yaw), 0, Math.cos(this.yaw)), g = this.game;
    this.sc[kind] = true;
    if (kind === 'glimpse') {
      // far down the corridor, under the one light that still works, facing you
      const x = clamp(p.x + 24, 28, 58); c.appear(V3(x, 0, 0.2), -Math.PI / 2); c.lookAtPlayer = true;
      this.dread(); this.act = { kind, t: 0 };
      this.line('glimpse', [2, ['KAI', '…Hello?', { thought: true }]]);
    }
    if (kind === 'walkby') {
      const x = clamp(p.x + 13, 16, 52); c.appear(V3(x, 0, -0.85), Math.PI / 2, [V3(x + 9, 0, -0.85)], 0.9); c.lookAtPlayer = false;
      this.dread(); this.act = { kind, t: 0 };
    }
    if (kind === 'cart') {
      // right in front of you, for half a second
      const at = p.clone().addScaledVector(fwd, 1.5); at.z = clamp(at.z, -1.0, 1.0);
      c.appear(at, Math.atan2(p.x - at.x, p.z - at.z)); c.lookAtPlayer = true;
      this.stinger(1); this.blackout = 0.15; this.shakeT = 0.5; g.renderer.grade.uniforms.uRewrite.value = 0.6;
      this.act = { kind, t: 0 };
    }
    if (kind === 'behind') {
      const at = p.clone().addScaledVector(fwd, -2.3); at.z = clamp(at.z, -1.0, 1.0);
      c.appear(at, Math.atan2(p.x - at.x, p.z - at.z)); c.lookAtPlayer = true;
      g.audio.burst({ pos: at.clone().setY(1.6), freq: 500, freqEnd: 300, q: 3, dur: 1.4, vol: 0.18, buf: g.audio.brown, reverb: 0.3 }); // breathing, right behind you
      this.act = { kind, t: 0 };
    }
    if (kind === 'wardrobe') {
      const h = this.hotel, jp = h.journal.getWorldPosition(V3());
      const hd = h.hides.slice().sort((a, b) => a.pos.distanceTo(jp) - b.pos.distanceTo(jp))[0];
      const at = hd ? hd.pos.clone().setY(1.2) : jp;
      for (let i = 0; i < 3; i++) g.audio.burst({ pos: at, freq: 320, type: 'lowpass', dur: 0.12, vol: 0.5, at: 1.2 + i * 0.42, buf: g.audio.brown, reverb: 0.5 });
      setTimeout(() => g.audio.creakShort(at, 0.5), 3600);
      this.line('wardrobe', [3, ['KAI', 'That came from inside the wardrobe.', { thought: true }], ['KAI', 'I am not opening the wardrobe.', { thought: true }]]);
    }
  }
  scripts(dt, t) {
    const S = this.sc, f = this.f, p = this.pos, c = this.clerk, g = this.game;
    if (f.open611 || this.caught || this.ending) return;
    // triggers
    if (f.flashlight && !S.glimpse && p.x > 3 && Math.abs(p.z) < 1.3 && !this.act) this.playScene('glimpse');
    if (f.keycard && !S.cart && !this.act) { S.cartT = (S.cartT ?? 1.1) - dt; if (S.cartT < 0) this.playScene('cart'); }
    if (f.journal && !S.wardrobe) this.playScene('wardrobe');
    // footsteps over the ceiling, following you, now and then
    if (f.flashlight && !this.act) { S.stepsT -= dt; if (S.stepsT < 0) { S.stepsT = 26 + Math.random() * 20; S.steps = { t: 0, x: p.x - 8 }; } }
    if (S.steps) { S.steps.t += dt; S.steps.x += dt * 1.1; if (Math.floor(S.steps.t / 0.85) !== Math.floor((S.steps.t - dt) / 0.85)) { const q = V3(S.steps.x, 3.4, 0); g.audio.burst({ pos: q, freq: 200, freqEnd: 60, type: 'lowpass', dur: 0.25, vol: 0.4, buf: g.audio.brown, reverb: 0.7 }); g.audio.tone({ pos: q, freq: 60, freqEnd: 40, dur: 0.2, vol: 0.25 }); } if (S.steps.t > 9) S.steps = null; }
    // running scene
    const sc = this.act; if (!sc) return;
    sc.t += dt;
    const toC = V3(c.pos.x - p.x, 0, c.pos.z - p.z), dist = toC.length();
    const fwd = V3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    const looking = fwd.dot(toC.clone().normalize()) > 0.72 && !blocked(p, c.pos, this.colliders);
    if (sc.kind === 'glimpse') {
      if (!sc.flick && (sc.t > 3.2 || dist < 12)) { sc.flick = true; this.blackout = 0.55; g.audio.burst({ freq: 120, type: 'lowpass', dur: 0.4, vol: 0.4, buf: g.audio.brown }); }
      if (sc.flick && this.blackout <= 0.3) { c.vanish(); this.act = null; }
    }
    if (sc.kind === 'walkby' && (!c.path.length || sc.t > 11)) { this.blackout = 0.3; c.vanish(); this.act = null; }
    if (sc.kind === 'cart' && sc.t > 0.55) { c.vanish(); g.renderer.grade.uniforms.uRewrite.value = 0; this.act = null; this.line('cart', [1, ['KAI', 'NO— no. Nothing. There\'s nothing there.', { thought: true }]]); }
    if (sc.kind === 'behind') {
      if (looking && !sc.seen) { sc.seen = sc.t; this.stinger(1); this.shakeT = 0.45; this.blackout = 0.12; }
      if (sc.seen !== undefined && sc.t - sc.seen > 0.4 || sc.t > 7) { if (!sc.seen) g.audio.burst({ pos: c.pos.clone().setY(1.6), freq: 900, freqEnd: 200, q: 4, dur: 0.6, vol: 0.2, reverb: 0.6 }); c.vanish(); this.act = null; this.blackout = 0.2; }
    }
  }

  /** Glowing room numbers over every door, with a red/green lamp, and a faint marker for the goal. */
  buildSigns() {
    this.doorSigns = [];
    const mk = (text) => { const cv = document.createElement('canvas'); cv.width = 256; cv.height = 96; const g2 = cv.getContext('2d'); g2.fillStyle = '#120c06'; g2.fillRect(0, 0, 256, 96); g2.strokeStyle = '#a8823a'; g2.lineWidth = 4; g2.strokeRect(4, 4, 248, 88); g2.fillStyle = '#ffd890'; g2.font = `bold ${text.length > 4 ? 30 : 56}px Georgia, serif`; g2.textAlign = 'center'; g2.fillText(text, 128, text.length > 4 ? 60 : 68); const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; return tx; };
    for (const d of this.hotel.doors) {
      const label = d.number ? String(d.number) : d.keycard ? 'STAFF' : null; if (!label) continue;
      const tx = mk(label);
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.16), new THREE.MeshStandardMaterial({ map: tx, emissiveMap: tx, emissive: 0xffffff, emissiveIntensity: 0.9 }));
      sign.position.set(d.width / 2, 2.42, -0.13); sign.rotation.y = Math.PI; d.group.add(sign);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff3020 })); lamp.position.set(d.width / 2 + 0.28, 2.42, -0.13); d.group.add(lamp);
      this.doorSigns.push({ d, sign, lamp });
    }
    this.marker = el('div', 'foot-marker', this.game.ui.hudRoot, '<div class="d">◆</div><div class="m"></div>');
    this.marker.style.opacity = '0.75';
  }
  objectiveTarget() {
    const h = this.hotel, f = this.f, w = (o) => o.getWorldPosition(V3());
    if (!f.flashlight) return w(h.flashlightProp);
    if (!f.phone) return w(h.phone);
    if (!f.keycard) return w(h.keycard);
    if (!f.power) return w(h.panel);
    if (!f.open611) return f.journal ? V3(LAYOUT.rooms[611].x, 1.4, 1.3) : w(h.journal);
    const d611 = h.roomInfo[611].door; if (d611.locked) return d611.group.localToWorld(V3(d611.width / 2, 1.2, 0));
    return w(h.lia.userData.portal).add(V3(0, 1.3, 0));
  }
  updateMarker() {
    for (const s of this.doorSigns) { const open = !s.d.locked; s.lamp.material.color.setHex(open ? 0x30ff60 : 0xff3020); s.sign.material.emissiveIntensity = this.power ? 1.8 : 1.5; }
    const show = !this.hidden && !this.caught && !this.ending && this.phase !== 'wake';
    this.marker.style.display = show ? 'block' : 'none'; if (!show) return;
    const tp = this.objectiveTarget(), q = tp.clone().project(this.camera);
    let x = (q.x * 0.5 + 0.5) * innerWidth, y = (-q.y * 0.5 + 0.5) * innerHeight;
    if (q.z > 1) { x = innerWidth - x; y = innerHeight - 60; }
    this.marker.style.transform = `translate(${clamp(x, 40, innerWidth - 40)}px, ${clamp(y, 60, innerHeight - 60)}px)`;
    this.marker.querySelector('.m').textContent = `${Math.round(tp.distanceTo(V3(this.pos.x, tp.y, this.pos.z)))} m`;
  }

  updateWorld(dt, t) {
    const g = this.game, h = this.hotel;
    // doors: physics + slam noise
    for (const d of h.doors) {
      const slam = d.update(dt);
      if (slam > 2.2) { g.audio.burst({ pos: d.hingeWorld().add(V3(0, 1, 0)), freq: 400, type: 'lowpass', dur: 0.3, vol: Math.min(0.8, slam * 0.15), buf: g.audio.brown }); g.audio.tone({ pos: d.hingeWorld(), freq: 80, freqEnd: 40, dur: 0.25, vol: 0.4 }); this.emitNoise(Math.min(1.5, slam * 0.3)); }
      else if (Math.abs(d.vel) > 0.6 && Math.random() < dt * 4) g.audio.creakShort(d.hingeWorld().add(V3(0, 2, 0)), Math.min(0.3, Math.abs(d.vel) * 0.08));
    }
    // sconces: flicker, nearest ones get real lights
    const lights = h.lights;
    const sorted = h.sconces.filter((s) => s.on).sort((a, b) => Math.hypot(a.x - this.pos.x, a.z - this.pos.z) - Math.hypot(b.x - this.pos.x, b.z - this.pos.z));
    lights.forEach((L, i) => {
      const s = sorted[i];
      if (!s) { L.intensity = 0; return; }
      L.position.set(s.x, 2.1, s.z * 0.85);
      let k = this.power ? 2.6 : 1.1;
      if (s.flicker && Math.random() < 0.08) k *= Math.random() * 0.3;
      // the Clerk drains the light around it
      const cd = Math.hypot(s.x - this.clerk.pos.x, s.z - this.clerk.pos.z);
      if (this.clerk.state !== 'dormant' && cd < 4) k *= 0.1 + Math.random() * 0.3;
      if (this.blackout > 0) k = 0;
      L.intensity = k;
      s.shade.material.emissiveIntensity = k * 0.9;
    });
    // phone ring
    if (this.phoneRinging) {
      this.ringT -= dt;
      if (this.ringT < 0) { this.ringT = 3.2; const p = h.phone.getWorldPosition(V3()); for (let i = 0; i < 2; i++) for (let k = 0; k < 12; k++) g.audio.tone({ pos: p, type: 'triangle', freq: k % 2 ? 1180 : 1420, dur: 0.04, vol: 0.12, at: i * 0.55 + k * 0.035, reverb: 0.5 }); }
    }
    // battery pickups are implied — the torch slowly dies; the Anchor recharges it while you hold still in light
    if (this.power && !this.torchOn) this.battery = Math.min(1, this.battery + dt * 0.01);
    this.H.bat.forEach((b, i) => b.classList.toggle('on', this.battery > i / 5));
    // portal light breathes
    if (this.f.open611) { const u = h.lia.userData; u.sun.intensity = 25 + Math.sin(t * 0.7) * 5; }
    // the ambient world: drips, distant knocks, the elevator
    this.ambT = (this.ambT ?? 5) - dt;
    if (this.ambT < 0) {
      this.ambT = 6 + Math.random() * 10;
      const r = Math.random(), p = V3(this.pos.x + (Math.random() - 0.5) * 30, 2, (Math.random() - 0.5) * 6);
      if (r < 0.35) g.audio.tone({ pos: p, type: 'sine', freq: 1800 + Math.random() * 600, freqEnd: 900, dur: 0.12, vol: 0.06, reverb: 0.9 });
      else if (r < 0.6) for (let i = 0; i < 3; i++) g.audio.burst({ pos: p, freq: 300, type: 'lowpass', dur: 0.12, vol: 0.18, at: i * 0.32, buf: g.audio.brown, reverb: 0.7 });
      else if (r < 0.75) g.audio.creakShort(p, 0.3);
      else if (r < 0.85) { g.audio.tone({ type: 'sine', freq: 1318, dur: 1.2, vol: 0.04, reverb: 0.9 }); }
    }
  }

  updateTension(dt, t) {
    const g = this.game, c = this.clerk;
    let tension = 0.05;
    if (c.state !== 'dormant') {
      const d = c.pos.distanceTo(this.pos);
      tension = Math.max(0.15, clamp(1 - d / 20, 0, 1) * 0.6);
      if (c.state === 'investigate' || c.state === 'search') tension = Math.max(tension, 0.55);
      if (c.state === 'chase') tension = 1;
      // heartbeat when it's close
      this.hbT = (this.hbT ?? 1) - dt;
      if (d < 9 && this.hbT < 0) { this.hbT = 0.45 + d * 0.06; g.audio.heartbeat(1.5, 0.12 + (1 - d / 9) * 0.35); }
    }
    this.tension = (this.tension ?? 0) + (tension - (this.tension ?? 0)) * Math.min(1, dt * 1.5);
    g.music.setIntensity(this.tension, 0.8);
    g.renderer.grade.uniforms.uCA.value = 0.0015 + this.tension * 0.003;
  }

  dispose() {
    this.disposed = true;
    for (const s of [this.hum, this.roomTone, this.water]) s?.stop();
    this.game.renderer.grade.uniforms.uRewrite.value = 0;
    this.scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    this.hud?.remove();
  }
}
