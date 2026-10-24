// Cinematic director: authored camera shots, letterboxing, fades and helpers
// for staging actors. All methods are async so story scripts read top-to-bottom.
import * as THREE from 'three';
import { ease, lerp, sleep } from '../core/util.js';
import { G } from '../core/physics.js';

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

  // Camera position near `look` from preferred offsets, rejecting any blocked by geometry; falls back
  // to the least-blocked offset pulled in to its first hit.
  frame(look, offsets, { min = 0.8 } = {}) {
    const occ = this.occluders(), rc = this._rc || (this._rc = new THREE.Raycaster()); let best = null, bestD = -1;
    for (const o of offsets) {
      const want = look.clone().add(o), dir = want.clone().sub(look); const len = dir.length(); dir.divideScalar(len || 1);
      rc.set(look, dir); rc.near = 0.2; rc.far = len + 0.3;
      const hit = rc.intersectObjects(occ, false)[0];
      if (!hit) return want;
      const d = hit.distance - 0.3; if (d > bestD) { bestD = d; best = look.clone().addScaledVector(dir, Math.max(min, d)); }
    }
    return best;
  }
  // A camera riding along with a moving target at one of several offsets; it re-checks its view
  // every few frames and cuts to the next clear offset when geometry gets in the way.
  follow(target, offsets) {
    let i = 0, n = 0;
    const occ = this.occluders(), rc = this._rc || (this._rc = new THREE.Raycaster());
    const blocked = (t, o) => { const d = o.clone(), len = d.length(); rc.set(t, d.divideScalar(len)); rc.near = 0.5; rc.far = len; return rc.intersectObjects(occ, false).length > 0; };
    return () => {
      const t = resolveV(target);
      if (n++ % 6 === 0 && blocked(t, offsets[i])) { for (let k = 1; k <= offsets.length; k++) { const j = (i + k) % offsets.length; if (!blocked(t, offsets[j])) { i = j; break; } } }
      return t.clone().add(offsets[i]);
    };
  }
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
  // Conversation coverage for `a` speaking to `b`: candidate setups in order of preference for the
  // style ('ots' | 'close' | 'wide'), rejecting any whose view of the speaker's face is blocked by
  // a wall or by another person. Heights follow the actors (kids are framed at kid height).
  cover(a, b, { style = 'ots', side = 1, others = [] } = {}) {
    const eye = (o) => o.pos.y + 1.6 * (o.char?.group.scale.y ?? 1);
    const pa = a.pos.clone(), pb = b.pos.clone(), hA = eye(a), hB = eye(b);
    const dir = pa.clone().sub(pb).setY(0); if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1); dir.normalize();
    const right = new THREE.Vector3(-dir.z, 0, dir.x), look = pa.clone().setY(hA - 0.03);
    // over the listener's shoulder; a short listener (a kid) gets the camera lifted and moved wider
    const lift = Math.max(0, hA - hB);
    const ots = (s, d) => ({ pos: pb.clone().addScaledVector(dir, -d).addScaledVector(right, (0.42 + lift * 0.6) * s).setY(hB + 0.05 + lift * 0.7), look: look.clone(), fov: d > 1.3 ? 38 : 34 });
    const close = (s) => ({ pos: pa.clone().addScaledVector(dir, -0.95).addScaledVector(right, 0.32 * s).setY(hA + 0.02), look: look.clone(), fov: 30 });
    const wide = (s) => { const mid = pa.clone().add(pb).multiplyScalar(0.5); return { pos: mid.clone().addScaledVector(right, 3.0 * s).setY(Math.max(hA, hB) - 0.05), look: mid.setY((hA + hB) / 2 - 0.2), fov: 40 }; };
    const order = style === 'close' ? [close(side), close(-side), ots(side, 1.15), ots(-side, 1.15), wide(side), wide(-side)]
      : style === 'wide' ? [wide(side), wide(-side), ots(side, 1.15), ots(-side, 1.15), close(side)]
      : [ots(side, 1.15), ots(-side, 1.15), ots(side, 1.6), close(side), close(-side), wide(side), wide(-side)];
    const occ = this.occluders(), rc = this._rc || (this._rc = new THREE.Raycaster());
    let room = null, roomD = -1; // fallback: the setup with the most clear room, pulled in before the wall
    const clear = (c) => {
      const d = c.pos.clone().sub(c.look), len = d.length(); d.divideScalar(len);
      rc.set(c.look, d); rc.far = len + 0.25; rc.near = 0.3;
      const hit = rc.intersectObjects(occ, false)[0];
      if (hit) { const free = hit.distance - 0.25; if (free > roomD) { roomD = free; room = { ...c, pos: c.look.clone().addScaledVector(d, Math.max(0.55, free)) }; } return false; } // a wall
      for (const o of others) {
        if (o === a || o === b || !o.pos) continue;
        const top = eye(o) + 0.15;
        for (let t = 0.08; t < 0.97; t += 0.06) {
          const q = c.pos.clone().lerp(c.look, t);
          if (q.y > o.pos.y + 0.1 && q.y < top && Math.hypot(q.x - o.pos.x, q.z - o.pos.z) < 0.3) return false; // a person in the way
        }
      }
      return true;
    };
    return order.find(clear) || room || order[0];
  }
  // visible, opaque world meshes that can block a shot (characters, glass and particles don't)
  occluders() {
    const out = [], sky = this.game.sky?.sky;
    this.game.engine.scene.traverse(o => {
      if (!o.isMesh || o.isSkinnedMesh || o === sky) return;
      for (let p = o; p; p = p.parent) if (!p.visible) return;
      const m = Array.isArray(o.material) ? o.material[0] : o.material;
      if (m && (m.transparent || m.opacity < 1 || m.depthWrite === false)) return;
      out.push(o);
    });
    return out;
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
