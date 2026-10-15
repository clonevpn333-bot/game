// Camera: god-view orbit (free / following), third-person chase cams for
// possession, and cinematic swoops between them.
import * as THREE from 'three';
import { clamp, lerp, damp, easeInOut, wrapAngle } from '../core/math.js';
import { C } from '../sim/config.js';

const v3 = new THREE.Vector3();

export class CameraRig {
  constructor(camera, input, world) {
    this.cam = camera;
    this.input = input;
    this.world = world;
    this.target = new THREE.Vector3(60, 0, 40);
    this.dist = 420; this.yaw = 0.6; this.pitch = 0.95;
    this.goal = { target: this.target.clone(), dist: this.dist, yaw: this.yaw, pitch: this.pitch };
    this.mode = 'observe';
    this.follow = null; // fn -> {x,y,z,h}
    this.third = { yaw: 0, pitch: 0.25, dist: 7, height: 1.6, lookY: 1.4 };
    this.trans = null;
    this.shake = 0;
    this.fov = 55;
    this.lookAt = new THREE.Vector3();
    this.userPitch = false;
  }

  // ------------------------------------------------ observe
  setFollow(fn) { this.follow = fn; if (fn) this.goal.dist = Math.min(this.goal.dist, 90); }
  flyTo(x, z, dist = 140) { this.follow = null; this.goal.target.set(x, 0, z); this.goal.dist = dist; }

  autoPitch(d) { return lerp(0.42, 1.12, clamp((d - 20) / 600, 0, 1)); }

  updateObserve(dt, allowInput) {
    const I = this.input, G = this.goal;
    if (allowInput) {
      const panSpeed = G.dist * 1.1 * (I.down('ShiftLeft') ? 2.5 : 1);
      // ground-plane forward/right relative to the view
      const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
      const rx = -fz, rz = fx;
      const mx = I.axis('KeyA', 'KeyD') + I.axis('ArrowLeft', 'ArrowRight');
      const mz = I.axis('KeyS', 'KeyW') + I.axis('ArrowDown', 'ArrowUp');
      if (mx || mz) {
        this.follow = null;
        G.target.x += (fx * mz + rx * mx) * panSpeed * dt;
        G.target.z += (fz * mz + rz * mx) * panSpeed * dt;
      }
      if (I.down('KeyQ')) G.yaw += dt * 1.4;
      if (I.down('KeyE')) G.yaw -= dt * 1.4;
      if (I.mouse.wheel) {
        G.dist = clamp(G.dist * Math.pow(1.13, I.mouse.wheel), 12, 1100);
        if (!this.userPitch) G.pitch = this.autoPitch(G.dist);
      }
      if (I.mouse.down[2] && I.mouse.dragging) {
        G.yaw -= I.mouse.dx * 0.005;
        G.pitch = clamp(G.pitch + I.mouse.dy * 0.004, 0.12, 1.45);
        this.userPitch = true;
      }
      if ((I.mouse.down[1] || I.mouse.down[0]) && I.mouse.dragging) {
        this.follow = null;
        const k = G.dist * 0.0016;
        const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
        const rx = -fz, rz = fx;
        G.target.x += (-rx * I.mouse.dx + fx * I.mouse.dy) * k;
        G.target.z += (-rz * I.mouse.dx + fz * I.mouse.dy) * k;
      }
    }
    if (this.follow) {
      const f = this.follow();
      if (f) G.target.set(f.x, f.y || 0, f.z); else this.follow = null;
    }
    const L = C.HALF + 260;
    G.target.x = clamp(G.target.x, -L, L); G.target.z = clamp(G.target.z, -L, L);
    if (!this.userPitch) G.pitch = lerp(G.pitch, this.autoPitch(G.dist), 1 - Math.exp(-dt * 3));
    const k = this.follow ? 6 : 8;
    this.target.x = damp(this.target.x, G.target.x, k, dt);
    this.target.y = damp(this.target.y, G.target.y, k, dt);
    this.target.z = damp(this.target.z, G.target.z, k, dt);
    this.dist = damp(this.dist, G.dist, 7, dt);
    this.yaw = this.yaw + wrapAngle(G.yaw - this.yaw) * (1 - Math.exp(-8 * dt));
    this.pitch = damp(this.pitch, G.pitch, 7, dt);
    const pos = this.observePose(this.target, this.dist, this.yaw, this.pitch, v3);
    this.cam.position.copy(pos);
    this.lookAt.copy(this.target);
    this.fov = damp(this.fov, 55, 3, dt);
  }

  observePose(t, d, yaw, pitch, out) {
    out.set(t.x + Math.sin(yaw) * Math.cos(pitch) * d, t.y + Math.sin(pitch) * d, t.z + Math.cos(yaw) * Math.cos(pitch) * d);
    if (out.y < 2) out.y = 2;
    return out;
  }

  // ------------------------------------------------ third person
  thirdPose(ent, out, look) {
    const T = this.third;
    const yaw = T.yaw, pitch = T.pitch;
    const cd = T.dist;
    const hx = ent.x - Math.sin(yaw) * Math.cos(pitch) * cd;
    const hz = ent.z - Math.cos(yaw) * Math.cos(pitch) * cd;
    const hy = (ent.y || 0) + T.height + Math.sin(pitch) * cd;
    out.set(hx, hy, hz);
    look.set(ent.x + Math.sin(yaw) * 2, (ent.y || 0) + T.lookY, ent.z + Math.cos(yaw) * 2);
    // keep the camera out of buildings
    const W = this.world;
    if (this.indoors) return out;
    const hit = W.collideBox(out.x, out.z, 0.6, out.y - 1);
    if (hit) {
      // pull the camera toward the subject until clear
      for (let s = 0.9; s > 0.2; s -= 0.1) {
        const px = ent.x + (out.x - ent.x) * s, pz = ent.z + (out.z - ent.z) * s;
        if (!W.collideBox(px, pz, 0.6, out.y - 1)) { out.x = px; out.z = pz; break; }
      }
    }
    const gh = W.groundHeight(out.x, out.z, out.y);
    if (out.y < gh + 0.6) out.y = gh + 0.6;
    return out;
  }

  updateThird(dt, ent, opts = {}) {
    const I = this.input, T = this.third;
    if (I.locked || I.mouse.down[2]) {
      T.yaw -= I.mouse.dx * 0.0032;
      T.pitch = clamp(T.pitch + I.mouse.dy * 0.0028, -0.25, 1.25);
    }
    if (I.mouse.wheel) T.dist = clamp(T.dist * Math.pow(1.12, I.mouse.wheel), opts.minDist || 2.5, opts.maxDist || 30);
    if (opts.autoYaw != null && !(I.mouse.down[2]) && Math.abs(I.mouse.dx) < 1) {
      // chase cam swings behind the vehicle when moving
      T.yaw += wrapAngle(opts.autoYaw - T.yaw) * (1 - Math.exp(-dt * (opts.autoK || 2.2)));
    }
    const pos = this.thirdPose(ent, v3, this.lookAt);
    this.cam.position.lerp(pos, this.trans ? 1 : 1 - Math.exp(-dt * 18));
    this.fov = damp(this.fov, opts.fov || 60, 3, dt);
  }

  // ------------------------------------------------ cinematic transition
  // start a swoop from the current camera pose to a live destination pose
  startTransition(destFn, duration = 1.8, onDone) {
    this.trans = { t: 0, dur: duration, from: this.cam.position.clone(), fromLook: this.lookAt.clone(), destFn, onDone, fromFov: this.fov };
  }

  updateTransition(dt) {
    const tr = this.trans;
    tr.t += dt;
    const u = clamp(tr.t / tr.dur, 0, 1);
    const e = easeInOut(u);
    const dest = tr.destFn();
    if (!dest) { this.trans = null; return; }
    const { pos, look, fov } = dest;
    // arc: lift through a control point above the midpoint
    const mid = new THREE.Vector3().addVectors(tr.from, pos).multiplyScalar(0.5);
    const span = tr.from.distanceTo(pos);
    mid.y = Math.max(tr.from.y, pos.y) + span * 0.18;
    const a = tr.from.clone().lerp(mid, e), b = mid.clone().lerp(pos, e);
    this.cam.position.copy(a.lerp(b, e));
    const le = easeInOut(clamp(u * 1.25, 0, 1));
    this.lookAt.copy(tr.fromLook).lerp(look, le);
    this.fov = lerp(tr.fromFov, fov, e) + Math.sin(u * Math.PI) * 10;
    if (u >= 1) { const cb = tr.onDone; this.trans = null; cb && cb(); }
  }

  apply(dt) {
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 2.5);
      const s = this.shake * this.shake * 0.5;
      this.cam.position.x += (Math.random() - 0.5) * s;
      this.cam.position.y += (Math.random() - 0.5) * s;
      this.cam.position.z += (Math.random() - 0.5) * s;
    }
    this.cam.lookAt(this.lookAt);
    if (Math.abs(this.cam.fov - this.fov) > 0.01) { this.cam.fov = this.fov; this.cam.updateProjectionMatrix(); }
  }
}
