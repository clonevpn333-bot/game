// Cutscene engine: scripted camera moves, letterbox, fades, dialogue and
// animated actors (procedural rig). Space/Enter skips a line, Esc skips all.
import * as THREE from 'three';
import { G } from '../core/state.js';
import { clamp, damp, lerp, smoothstep } from '../core/mathx.js';
import { Avatar } from '../actors/avatar.js';
import { Pose, poseIdle, poseTalk, poseLocomotion, poseSit, poseCower, poseDead, poseBlock, poseAim, posePhone, J } from '../actors/rig.js';

export const LOOKS = {
  ash: null, // the player avatar
  archivist: { skin: '#b89878', hair: '#ddd', top: '#16201a', sleeve: '#16201a', forearm: '#16201a', legs: '#121612', shoes: '#0a0a0a', coat: '#16201a', hairStyle: 'long', helmet: true, helmetColor: '#121612', visor: true, visorColor: '#9dff6a', harness: true, accent: '#9dff6a' },
  tommy: { skin: '#b88060', hair: '#1a1410', top: '#c83a2a', legs: '#2e4a78', shoes: '#f0f0f0', hairStyle: 'hair', cap: true, capColor: '#2a4a8a' },
  oldtom: { skin: '#a87858', hair: '#c8c8c4', top: '#3a2a22', sleeve: '#e8e0d0', forearm: '#a87858', legs: '#2a2a2e', shoes: '#2a2018', hairStyle: 'hair', coat: '#3a2a22' },
  mara: { skin: '#e0b090', hair: '#6a3a1a', top: '#d8e0e8', sleeve: '#2a4a8a', legs: '#2a3a5a', shoes: '#1a1a1a', hairStyle: 'long', backpack: true, packColor: '#c02020' },
  victor: { skin: '#e8c0a0', hair: '#2a2420', top: '#1a1a22', sleeve: '#1a1a22', forearm: '#1a1a22', legs: '#1a1a22', shoes: '#0a0a0a', hairStyle: 'hair', scarf: '#8a1a1a' },
  victorOld: { skin: '#d8b8a0', hair: '#e8e8e8', top: '#e8ecf0', sleeve: '#e8ecf0', forearm: '#e8ecf0', legs: '#1a1a22', shoes: '#0a0a0a', hairStyle: 'hair', visor: true, visorColor: '#ff3a3a', harness: true, accent: '#ff3a3a' },
  dutch: { skin: '#d8a888', hair: '#1a1410', top: '#6a1010', sleeve: '#2a1a14', forearm: '#d8a888', legs: '#1a1a1e', shoes: '#2a2018', hairStyle: 'none', scarf: '#1a1a1a' },
  ruth: { skin: '#6a4030', hair: '#2a1a10', top: '#3a7a4a', legs: '#4a3a2a', shoes: '#2a2018', hairStyle: 'long' },
  ilse: { skin: '#e0b090', hair: '#8a4a2a', top: '#f2f4f6', sleeve: '#f2f4f6', legs: '#e8ecf0', shoes: '#f4f4f4', hairStyle: 'long', visor: true, visorColor: '#4affb0' },
  enforcer: { skin: '#d8a888', hair: '#111', top: '#10141a', sleeve: '#10141a', forearm: '#10141a', legs: '#10141a', shoes: '#000', hairStyle: 'none', helmet: true, visor: true, visorColor: '#ff2030' },
};

class Actor {
  constructor(look, x, y, z, yaw) {
    this.avatar = look ? new Avatar(look, -1, { scale: look.scale || 1 }) : null;
    if (this.avatar) G.scene.add(this.avatar.group);
    this.pos = new THREE.Vector3(x, y, z);
    this.yaw = yaw;
    this.anim = 'idle';
    this.pose = new Pose();
    this.phase = 0;
    this.target = null;
    this.speed = 1.5;
    this.talk = 0;
    this.seed = Math.random();
    this.t = 0;
  }
  update(dt) {
    this.t += dt;
    let moving = false;
    if (this.target) {
      const dx = this.target.x - this.pos.x, dz = this.target.z - this.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.1) this.target = null;
      else {
        moving = true;
        this.yaw = Math.atan2(dx, dz);
        const st = Math.min(d, this.speed * dt);
        this.pos.x += (dx / d) * st; this.pos.z += (dz / d) * st;
        this.phase += (this.speed / (this.speed > 3 ? 2.4 : 1.4)) * Math.PI * dt;
      }
    }
    const p = this.pose.clear();
    if (moving) poseLocomotion(p, this.phase, this.speed > 3 ? 1.8 : 0.9);
    else if (this.anim === 'sit') poseSit(p, false);
    else if (this.anim === 'cower') poseCower(p, this.t);
    else if (this.anim === 'dead') poseDead(p, 1, 1);
    else if (this.anim === 'kneel') { poseIdle(p, this.t); p.set(J.thL, -1.4, 0, 0.1); p.set(J.knL, 1.6); p.set(J.thR, 0.1); p.set(J.knR, 2.2); p.rootY = -0.45; }
    else {
      poseIdle(p, this.t, 1, 0.3);
      if (this.anim === 'aim') poseAim(p, 0, false, 0);
      if (this.anim === 'phone') posePhone(p);
      if (this.anim === 'guard') poseBlock(p);
      if (this.anim === 'point') { p.set(J.shR, -1.5, 0, -0.1); p.set(J.elR, -0.1); }
      if (this.anim === 'arms') { p.set(J.shL, -0.6, 0, 0.9); p.set(J.shR, -0.6, 0, -0.9); p.set(J.elL, -1.8); p.set(J.elR, -1.8); }
    }
    if (this.talk > 0) { this.talk -= dt; poseTalk(p, this.t * 1.2, this.seed); }
    if (this.avatar) this.avatar.update(p, this.pos.x, this.pos.y, this.pos.z, this.yaw, dt);
  }
  dispose() { if (this.avatar) G.scene.remove(this.avatar.group); }
}

export class Cutscenes {
  constructor() {
    this.active = null;
    this.actors = {};
    this.persistent = {};
    this.camPos = new THREE.Vector3();
    this.camLook = new THREE.Vector3();
    this.camMove = null;
    this.fade = 0;
    this.fadeTarget = 0;
    this.fadeSpeed = 2;
    this.box = document.createElement('div');
    this.box.className = 'cine';
    document.body.appendChild(this.box);
    this.skipHint = document.createElement('div');
    this.skipHint.className = 'cine-skip';
    this.skipHint.textContent = 'SPACE next line · ESC skip scene';
    document.body.appendChild(this.skipHint);
  }

  get playing() { return !!this.active; }

  // script: array of steps; base: {x,y,z} offset for positions
  play(script, base = { x: 0, y: 0, z: 0 }, onDone = null) {
    if (this.active) this.finish(true);
    this.active = { script, i: -1, wait: 0, base, onDone, waitLine: false };
    G.player.aiming = false;
    G.player.vel.set(0, 0, 0);
    G.engine.final.uLetterbox.value = 0;
    G.hud.subtitle.classList.remove('on');
    G.hud.subT = 0;
    this.camPos.copy(G.camera.position);
    const d = new THREE.Vector3(); G.camera.getWorldDirection(d);
    this.camLook.copy(G.camera.position).addScaledVector(d, 10);
    this.skipHint.classList.add('on');
    this.next();
  }

  B(v) {
    const b = this.active.base;
    return new THREE.Vector3(v[0] + (b.x || 0), v[1] + (b.y || 0), v[2] + (b.z || 0));
  }

  next() {
    const a = this.active;
    if (!a) return;
    a.i++;
    if (a.i >= a.script.length) { this.finish(false); return; }
    const s = a.script[a.i];
    a.wait = s.dur !== undefined ? s.dur : 0;
    a.waitLine = false;
    if (s.fade !== undefined) { this.fadeTarget = s.fade; this.fadeSpeed = 1 / Math.max(0.05, s.dur || 0.8); }
    if (s.actor) {
      const [id, look, at, yaw] = s.actor;
      if (this.actors[id]) this.actors[id].dispose();
      const p = this.B(at);
      this.actors[id] = new Actor(LOOKS[look] || look, p.x, p.y, p.z, yaw || 0);
      if (s.scale) this.actors[id].avatar.scale = s.scale;
    }
    if (s.remove) { const ac = this.actors[s.remove]; if (ac) { ac.dispose(); delete this.actors[s.remove]; } }
    if (s.anim) for (const [id, an] of Object.entries(s.anim)) if (this.actors[id]) this.actors[id].anim = an;
    if (s.move) for (const [id, m] of Object.entries(s.move)) {
      const ac = id === 'ash' ? null : this.actors[id];
      const p = this.B([m[0], 0, m[1]]);
      if (ac) { ac.target = p; ac.speed = m[2] || 1.4; }
    }
    if (s.face) for (const [id, yaw] of Object.entries(s.face)) if (this.actors[id]) this.actors[id].yaw = yaw;
    if (s.player) {
      const p = this.B(s.player);
      G.player.teleport(p.x, p.y, p.z, s.player[3] !== undefined ? s.player[3] : G.player.yaw);
    }
    if (s.cam) {
      const c = s.cam;
      const from = c.from ? this.B(c.from) : this.camPos.clone();
      const to = c.to ? this.B(c.to) : from.clone();
      const lf = c.look ? this.B(c.look) : this.camLook.clone();
      const lt = c.lookTo ? this.B(c.lookTo) : lf.clone();
      this.camMove = { from, to, lf, lt, t: 0, dur: c.time || s.dur || 3 };
      if (!c.time && s.dur === undefined) a.wait = 0;
    }
    if (s.era !== undefined) {
      if (s.wave) { G.shift.charge = 1; G.shift.cooldown = 0; G.shift.start(s.era); }
      else if (G.era !== s.era) { G.shift.start(s.era); G.shift.t = 99; }
    }
    if (s.time !== undefined && s.cam === undefined) G.dayTime = s.time;
    if (s.say) {
      const [who, text] = s.say;
      this.box.innerHTML = `${who ? `<span class="who">${who}</span>` : ''}<span class="tx">${text}</span>`;
      this.box.classList.add('on');
      a.wait = s.dur || Math.max(2.6, text.length * 0.06);
      a.waitLine = true;
      const sp = s.talk || null;
      if (sp && this.actors[sp]) this.actors[sp].talk = a.wait;
      G.audio && G.audio.play('ui');
    } else if (s.clear) this.box.classList.remove('on');
    if (s.title) G.hud.showBanner(s.title[0], s.title[1] || '', s.dur || 4, s.title[2]);
    if (s.sfx) G.audio.play(s.sfx[0], s.sfx[1] ? this.B(s.sfx[1]) : null);
    if (s.fx) s.fx(this.B.bind(this));
    if (s.fn) s.fn(this);
    if (a.wait <= 0 && !s.cam) this.next();
    else if (a.wait <= 0 && s.cam && !s.dur) this.next();
  }

  finish(aborted) {
    const a = this.active;
    if (!a) return;
    // run remaining fn steps so state stays consistent when skipping
    if (aborted) for (let i = a.i + 1; i < a.script.length; i++) { const s = a.script[i]; if (s.fn && s.always) s.fn(this); if (s.player) { const p = this.B(s.player); G.player.teleport(p.x, p.y, p.z, s.player[3] ?? G.player.yaw); } }
    this.active = null;
    for (const [id, ac] of Object.entries(this.actors)) if (!this.persistent[id]) { ac.dispose(); delete this.actors[id]; }
    this.box.classList.remove('on');
    this.skipHint.classList.remove('on');
    this.fadeTarget = 0;
    this.fadeSpeed = 1.5;
    this.camMove = null;
    G.cam.initialized = false;
    if (a.onDone) a.onDone();
  }

  update(dt, input) {
    const fin = G.engine.final;
    this.fade = this.fade < this.fadeTarget ? Math.min(this.fadeTarget, this.fade + dt * this.fadeSpeed) : Math.max(this.fadeTarget, this.fade - dt * this.fadeSpeed);
    fin.uFade.value = this.fade;
    fin.uLetterbox.value = damp(fin.uLetterbox.value, this.active ? 1 : 0, 4, dt);
    for (const ac of Object.values(this.actors)) ac.update(dt);
    if (!this.active) return;
    const a = this.active;
    if (input.keyPressed('Escape')) { this.finish(true); return; }
    if (this.camMove) {
      const m = this.camMove;
      m.t += dt;
      const k = smoothstep(0, 1, clamp(m.t / m.dur, 0, 1));
      this.camPos.lerpVectors(m.from, m.to, k);
      this.camLook.lerpVectors(m.lf, m.lt, k);
    }
    G.camera.position.copy(this.camPos);
    G.camera.lookAt(this.camLook);
    if (Math.abs(G.camera.fov - 50) > 0.1) { G.camera.fov = damp(G.camera.fov, 50, 3, dt); G.camera.updateProjectionMatrix(); }
    if (a.waitLine && (input.keyPressed('Space') || input.keyPressed('Enter') || input.btnPressed(0))) a.wait = 0;
    a.wait -= dt;
    if (a.wait <= 0) this.next();
  }
}
