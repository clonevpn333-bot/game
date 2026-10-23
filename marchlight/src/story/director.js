// Cinematic director: authored camera shots, letterboxing, fades and helpers
// for staging actors. All methods are async so story scripts read top-to-bottom.
import * as THREE from 'three';
import { ease, lerp, sleep } from '../core/util.js';

const resolveV = v => (typeof v === 'function' ? v() : v);

export class Director {
  constructor(game) {
    this.game = game;
    this.active = false; this.cam = false; this.freeLook = false; this.cut = false;
    this.blendSpeed = 3.5;
    this.shotT = 0; this.shotData = null;
    this.skipRequested = false;
  }
  begin({ letterbox = true, camera = true, freeLook = false, hideHud = true, blend = 3.5 } = {}) {
    this.active = true; this.cam = camera; this.freeLook = freeLook; this.blendSpeed = blend;
    if (letterbox) this.game.hud.letterbox(true);
    this.game.hud.setVisible(!hideHud);
    this.game.input.enabled = true;
  }
  end({ blend = 2.5 } = {}) {
    this.active = false; this.cam = false; this.shotData = null; this.blendSpeed = blend;
    this.game.hud.letterbox(false); this.game.hud.setVisible(true);
    // hand camera back behind the player smoothly
  }
  // Camera shot: { pos, look, fov, roll, dur, to: {pos, look, fov, roll}, ease, cut, shake }
  shot(o) {
    const c = this.game.camera.cine;
    this.shotData = { ...o, t: 0 };
    if (o.cut !== false) this.cut = true;
    this.applyShot(0);
    if (!o.dur) return Promise.resolve();
    return new Promise(res => { this.shotData.res = res; });
  }
  applyShot(dt) {
    const s = this.shotData; if (!s) return;
    s.t += dt;
    const k = s.dur ? Math.min(1, s.t / s.dur) : 1;
    const e = (s.ease || ease.inOut)(k);
    const c = this.game.camera.cine;
    const p0 = resolveV(s.pos), l0 = resolveV(s.look);
    if (s.to) {
      const p1 = resolveV(s.to.pos ?? s.pos), l1 = resolveV(s.to.look ?? s.look);
      c.pos.lerpVectors(p0, p1, e); c.look.lerpVectors(l0, l1, e);
      c.fov = lerp(s.fov ?? 45, s.to.fov ?? s.fov ?? 45, e); c.roll = lerp(s.roll ?? 0, s.to.roll ?? s.roll ?? 0, e);
    } else { c.pos.copy(p0); c.look.copy(l0); c.fov = s.fov ?? 45; c.roll = s.roll ?? 0; }
    if (s.handheld) { const t = performance.now() / 1000; c.pos.x += Math.sin(t * 1.1) * 0.02 * s.handheld; c.pos.y += Math.sin(t * 1.7) * 0.015 * s.handheld; c.look.x += Math.sin(t * 0.7) * 0.03 * s.handheld; }
    if (s.dur && k >= 1 && s.res) { const r = s.res; s.res = null; r(); }
  }
  update(dt) { if (this.shotData) this.applyShot(dt); }

  async fade(out, dur = 1) { return this.game.hud.fade(out ? 1 : 0, dur); }
  wait(s) { return sleep(s * 1000); }

  // Over-the-shoulder conversation framing between two actors (A speaks to B)
  ots(a, b, { side = 1, dist = 1.15, height = 1.62, fov = 34, lookH = 1.58 } = {}) {
    const pa = a.pos ? a.pos.clone() : a.clone(), pb = b.pos ? b.pos.clone() : b.clone();
    const dir = pa.clone().sub(pb).setY(0).normalize(); const right = new THREE.Vector3(-dir.z, 0, dir.x);
    const camPos = pb.clone().addScaledVector(dir, -dist).addScaledVector(right, 0.42 * side); camPos.y = pb.y + height;
    const look = pa.clone(); look.y += lookH;
    return { pos: camPos, look, fov };
  }
  // Wide two-shot from the side
  twoShot(a, b, { dist = 3.2, height = 1.5, fov = 40, side = 1 } = {}) {
    const pa = a.pos.clone(), pb = b.pos.clone(); const mid = pa.clone().add(pb).multiplyScalar(0.5);
    const dir = pa.clone().sub(pb).setY(0).normalize(); const right = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(side);
    const pos = mid.clone().addScaledVector(right, dist); pos.y += height;
    const look = mid.clone(); look.y += 1.35;
    return { pos, look, fov };
  }
  // Close-up on an actor's face from in front
  closeUp(a, { dist = 0.85, fov = 30, side = 0.25, h = 1.6 } = {}) {
    const f = new THREE.Vector3(Math.sin(a.yaw ?? a.char.group.rotation.y), 0, Math.cos(a.yaw ?? a.char.group.rotation.y));
    const r = new THREE.Vector3(-f.z, 0, f.x);
    const s = a.char.group.scale.y;
    const pos = a.pos.clone().addScaledVector(f, dist).addScaledVector(r, side); pos.y += h * s;
    const look = a.pos.clone(); look.y += (h - 0.04) * s;
    return { pos, look, fov };
  }
}
