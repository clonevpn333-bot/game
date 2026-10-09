'use strict';
// First-person controller.

const Player = {
  pos: new THREE.Vector3(),
  vel: new THREE.Vector3(),
  yaw: 0, pitch: 0,
  eye: 1.62, eyeCur: 1.62,
  radius: 0.28,
  crouching: false,
  canRun: true,
  canMove: true,
  canLook: true,
  stamina: 1,
  bobT: 0, bobAmt: 0, stepAcc: 0,
  hasFlashlight: false,
  flashOn: false,
  held: null, heldName: null,
  override: null,      // {pos, target, t, dur, from}
  lookLimit: null,     // {yaw, pitch, yawR, pitchR}
  speedMul: 1,
  hidden: false,
  breathless: 0,
  lastNoise: 0,
  autoLook: null,

  init() {
    const cam = G.camera;
    // flashlight
    const fl = this.flash = new THREE.SpotLight(0xfff1d6, 0, 26, 0.48, 0.45, 1.3);
    fl.castShadow = true; fl.shadow.mapSize.set(512, 512); fl.shadow.bias = -0.0015; fl.shadow.camera.near = 0.1; fl.shadow.camera.far = 26;
    this.flashRig = new THREE.Group(); cam.add(this.flashRig);
    fl.position.set(0.18, -0.15, 0.1); this.flashRig.add(fl);
    fl.target.position.set(0.1, -0.1, -5); this.flashRig.add(fl.target);
    this.flashFill = new THREE.PointLight(0xfff1d6, 0, 3.5, 2); this.flashFill.position.set(0, 0, -0.5); this.flashRig.add(this.flashFill);
    // hand anchor for held items
    this.hand = new THREE.Group(); this.hand.position.set(0.24, -0.24, -0.45); cam.add(this.hand);
  },

  place(x, z, yaw = 0, pitch = 0) {
    this.pos.set(x, G.level ? G.level.groundAt(x, z) : 0, z); this.yaw = yaw; this.pitch = pitch; this.vel.set(0, 0, 0);
    this.override = null; this.lookLimit = null; this.hidden = false; this.crouching = false; this.eyeCur = this.eye;
    this.syncCamera(0);
  },
  setFlashlight(on, silent) {
    if (!this.hasFlashlight && on) return;
    this.flashOn = on;
    this.flash.intensity = on ? 38 : 0; this.flashFill.intensity = on ? 0.6 : 0;
    if (!silent) SND.sfx('click', { f: 2600, v: 0.8 });
  },
  hold(obj, name) { this.drop(); if (obj) { this.hand.add(obj); obj.position.set(0, 0, 0); obj.rotation.set(0, 0, 0); } this.held = obj; this.heldName = name || null; },
  drop() { if (this.held) { this.hand.remove(this.held); } const h = this.held; this.held = null; this.heldName = null; return h; },
  holding(name) { return this.heldName === name; },

  lookAtPoint(v, dur = 0.8) {
    const cam = G.camera.position;
    const dx = v.x - cam.x, dz = v.z - cam.z, dy = v.y - cam.y;
    const yaw = Math.atan2(-dx, -dz), pitch = Math.atan2(dy, Math.hypot(dx, dz));
    this.autoLook = { fy: this.yaw, fp: this.pitch, ty: this.yaw + U.angDiff(this.yaw, yaw), tp: pitch, t: 0, dur };
    return Story.wait(dur);
  },
  // move camera to a fixed viewpoint (e.g. sitting at the board); null to return
  camTo(pos, target, dur = 0.8) {
    if (!pos) { if (this.override) { this.override.returning = true; this.override.t = 0; } return Story.wait(dur); }
    const cam = G.camera;
    this.override = { from: cam.position.clone(), fromQ: cam.quaternion.clone(), pos: pos.clone(), target: target.clone(), t: 0, dur };
    return Story.wait(dur);
  },
  forward() { return new THREE.Vector3(-Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch)); },
  // is the camera facing toward a world point (within angle)
  facing(v, ang = 0.5) {
    const cam = G.camera; const f = cam.getWorldDirection(new THREE.Vector3());
    const d = v.clone().sub(cam.getWorldPosition(new THREE.Vector3())).normalize();
    return f.dot(d) > Math.cos(ang);
  },
  zone() { return G.level ? G.level.zoneAt(this.pos.x, this.pos.z) : null; },

  update(dt) {
    if (G.mode === 'car') return;
    const S = G.settings;
    // look
    if (this.autoLook) {
      const a = this.autoLook; a.t += dt; const k = U.smooth(Math.min(1, a.t / a.dur));
      this.yaw = U.lerp(a.fy, a.ty, k); this.pitch = U.lerp(a.fp, a.tp, k);
      if (a.t >= a.dur) this.autoLook = null;
    } else if (this.canLook && G.mode !== 'ui' && Input.locked) {
      const sens = 0.0022 * S.sens;
      this.yaw -= Input.mdx * sens;
      this.pitch -= Input.mdy * sens * (S.invertY ? -1 : 1);
      this.pitch = U.clamp(this.pitch, -1.45, 1.45);
      if (this.lookLimit) {
        const L = this.lookLimit;
        const dy = U.angDiff(L.yaw, this.yaw); this.yaw = L.yaw + U.clamp(dy, -L.yawR, L.yawR);
        this.pitch = U.clamp(this.pitch, L.pitch - L.pitchR, L.pitch + L.pitchR);
      }
    }
    // move
    let moving = false, running = false;
    if (this.canMove && G.mode === 'walk' && !this.override && !Phone.open && !UI.blocking()) {
      const f = Input.axis('KeyS', 'KeyW'), s = Input.axis('KeyA', 'KeyD');
      if (Input.pressed('KeyC') || Input.pressed('ControlLeft')) this.crouching = !this.crouching;
      if (this.crouching && Phys.blocked(this.pos.x, this.pos.z, 0.2, this.pos.y + 1.0, this.pos.y + 1.7)) { /* can't stand */ }
      running = Input.held('ShiftLeft') && this.canRun && !this.crouching && f > 0 && this.stamina > 0.05;
      let spd = this.crouching ? 1.15 : (running ? 4.4 : 2.05);
      spd *= this.speedMul;
      const len = Math.hypot(f, s);
      const wx = len ? (-Math.sin(this.yaw) * f + Math.cos(this.yaw) * s) / len : 0;
      const wz = len ? (-Math.cos(this.yaw) * f - Math.sin(this.yaw) * s) / len : 0;
      const acc = len ? 12 : 10;
      this.vel.x = U.damp(this.vel.x, wx * spd, acc, dt);
      this.vel.z = U.damp(this.vel.z, wz * spd, acc, dt);
      moving = len > 0;
    } else { this.vel.x = U.damp(this.vel.x, 0, 12, dt); this.vel.z = U.damp(this.vel.z, 0, 12, dt); }
    // stamina
    if (running) { this.stamina = Math.max(0, this.stamina - dt / 7); if (this.stamina < 0.05) this.breathless = 4; }
    else this.stamina = Math.min(1, this.stamina + dt / (this.breathless > 0 ? 9 : 5));
    if (this.breathless > 0) this.breathless -= dt;

    const ox = this.pos.x, oz = this.pos.z;
    this.pos.x += this.vel.x * dt; this.pos.z += this.vel.z * dt;
    const h = this.crouching ? 1.0 : 1.7;
    if (G.mode !== 'hide') Phys.resolve(this.pos, this.radius, this.pos.y, this.pos.y + h, 'player');
    const moved = Math.hypot(this.pos.x - ox, this.pos.z - oz);
    // ground
    const gy = G.level ? G.level.groundAt(this.pos.x, this.pos.z) : 0;
    this.pos.y = U.damp(this.pos.y, gy, 18, dt);

    // footsteps + bob
    const sp = moved / Math.max(dt, 1e-4);
    this.bobAmt = U.damp(this.bobAmt, sp > 0.3 ? Math.min(1, sp / 3) : 0, 8, dt);
    if (sp > 0.3) {
      this.bobT += moved * (running ? 1.9 : 2.4);
      this.stepAcc += moved;
      const stride = running ? 0.95 : (this.crouching ? 0.55 : 0.68);
      if (this.stepAcc > stride) {
        this.stepAcc = 0;
        const surf = G.level ? G.level.surfaceAt(this.pos.x, this.pos.z) : 'tile';
        SND.sfx('step', { surface: surf, v: running ? 1.1 : (this.crouching ? 0.35 : 0.7), vol: 0.9 });
        const r = running ? 13 : (this.crouching ? 0 : 4.5);
        if (r > 0) Bus.emit('noise', this.pos.x, this.pos.z, r, 'step');
      }
    }
    this.eyeCur = U.damp(this.eyeCur, this.crouching ? 1.0 : this.eye, 10, dt);
    this.syncCamera(dt);
  },

  syncCamera(dt) {
    const cam = G.camera;
    if (this.override) {
      const o = this.override; o.t += dt; const k = U.smooth(Math.min(1, o.t / o.dur));
      if (!o.returning) {
        cam.position.lerpVectors(o.from, o.pos, k);
        const m = new THREE.Matrix4().lookAt(o.pos, o.target, new THREE.Vector3(0, 1, 0));
        const q = new THREE.Quaternion().setFromRotationMatrix(m);
        cam.quaternion.slerpQuaternions(o.fromQ, q, k);
      } else {
        const home = this.homeCam();
        cam.position.lerpVectors(o.pos, home.p, k);
        cam.quaternion.slerpQuaternions(new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(o.pos, o.target, new THREE.Vector3(0, 1, 0))), home.q, k);
        if (k >= 1) this.override = null;
      }
      return;
    }
    const home = this.homeCam();
    cam.position.copy(home.p); cam.quaternion.copy(home.q);
    // flashlight sway
    if (this.flashRig) { this.flashRig.rotation.y = U.damp(this.flashRig.rotation.y, (Input.mdx || 0) * -0.002, 6, dt || 0.016); this.flashRig.rotation.x = U.damp(this.flashRig.rotation.x, (Input.mdy || 0) * -0.002, 6, dt || 0.016); }
  },
  homeCam() {
    const bob = Math.sin(this.bobT * Math.PI) * 0.04 * this.bobAmt;
    const sway = Math.cos(this.bobT * Math.PI * 0.5) * 0.025 * this.bobAmt;
    const breath = Math.sin(G.time * (this.breathless > 0 ? 4 : 1.2)) * (this.breathless > 0 ? 0.012 : 0.004);
    const p = new THREE.Vector3(this.pos.x + Math.cos(this.yaw) * sway, this.pos.y + this.eyeCur + bob + breath, this.pos.z - Math.sin(this.yaw) * sway);
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(this.pitch, this.yaw, Math.sin(this.bobT * Math.PI * 0.5) * 0.004 * this.bobAmt, 'YXZ'));
    return { p, q };
  },
};
