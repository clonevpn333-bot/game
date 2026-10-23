// THE KINETIC TETHER
// Rules (kept deliberately simple and consistent):
//  * Targets with a kinetic signature are highlighted when aimed at within range.
//  * CAPTURE (hold E): drain a target's momentum into the tether's 3 cells.
//      - loose objects / drones slow to a stop; heavy machinery is siphoned
//        (it shudders, never fully stops) and fills cells fast.
//  * RELEASE (Q): spend stored cells as an impulse into the aimed target,
//      along your aim. No target = a short kinetic blast cone.
//  * KINETIC LEAP (Space while airborne): spend one cell to launch yourself.
//  * LATCH (F on an anchor or moving machinery): fire a line; you're reeled in
//      and carried by whatever you latched onto (moving things fling you).
import * as THREE from 'three';
import { G } from '../core/physics.js';
import { clamp, damp, lerp } from '../core/util.js';

const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3();
export const CELL_MOMENTUM = 900; // kg·m/s per cell
const RANGE = 45, LATCH_RANGE = 38;

export class Tether {
  constructor(game) {
    this.game = game;
    this.targets = new Set();     // registered kinetic targets
    this.anchors = new Set();     // latch points
    this.cells = 0; this.max = 3; this.charge = 0; // charge: fractional momentum being accumulated into next cell
    this.target = null; this.anchor = null;
    this.capturing = false; this.aiming = false; this.locked = false; this.latchLocked = false;
    this.overload = 0; this.heat = 0; this.damaged = false;
    this.beamT = 0; this.focus = 0;
    this.tutorialSeen = new Set();
    this.lastRelease = 0;
    this._buildVisuals();
  }

  attach(player) {
    this.player = player;
    this.ring = player.char.sockets.tetherRing;
  }

  // ---------------------------------------------------------------- registration
  // target: { obj, kind: 'prop'|'enemy'|'machine'|'tram'|'special', getPos(), getVel(), mass, capture(dt, rate)->momentumDrained, push(impulseVec, cells), label, enabled() }
  register(t) { this.targets.add(t); return () => this.targets.delete(t); }
  registerAnchor(a) { this.anchors.add(a); return () => this.anchors.delete(a); }
  // Helper to make a dynamic-body prop a tether target
  registerBody(mesh, body, opts = {}) {
    const t = {
      kind: 'prop', obj: mesh, label: opts.label || 'Object', body,
      getPos: () => mesh.getWorldPosition(new THREE.Vector3()),
      getVel: () => { const v = body.linvel(); return new THREE.Vector3(v.x, v.y, v.z); },
      mass: body.mass(),
      enabled: () => body.isValid?.() !== false && !opts.disabled?.(),
      capture: (dt) => {
        // Only real motion can be taken: drain velocity, bank mass × speed removed.
        const v = body.linvel(); const sp = Math.hypot(v.x, v.y, v.z);
        const m = body.mass(); const drain = Math.min(sp, Math.max(2, sp * 4) * dt);
        const k = sp > 1e-3 ? (sp - drain) / sp : 0;
        // captured objects are also held against gravity so they hang in the beam
        body.setLinvel({ x: v.x * k, y: v.y * k + 15 * dt * 0.95, z: v.z * k }, true);
        const av = body.angvel(); body.setAngvel({ x: av.x * 0.92, y: av.y * 0.92, z: av.z * 0.92 }, true);
        return drain * m;
      },
      push: (imp) => { body.applyImpulse({ x: imp.x, y: imp.y, z: imp.z }, true); body.applyTorqueImpulse({ x: (Math.random() - 0.5) * imp.length() * 0.3, y: 0, z: (Math.random() - 0.5) * imp.length() * 0.3 }, true); opts.onPush?.(imp); },
      ...opts.extra,
    };
    return this.register(t);
  }

  // ---------------------------------------------------------------- cells
  addMomentum(m) {
    if (this.cells >= this.max) { this.overload = Math.min(1, this.overload + m / (CELL_MOMENTUM * 2)); return; }
    this.charge += m;
    while (this.charge >= CELL_MOMENTUM && this.cells < this.max) {
      this.charge -= CELL_MOMENTUM; this.cells++;
      this.game.audio.cellChime(this.cells); this.game.hud.pulseCells(this.cells);
    }
    if (this.cells >= this.max) this.charge = 0;
  }
  spend(n, why) { const s = Math.min(this.cells, n); this.cells -= s; if (s > 0) this.game.hud.pulseCells(this.cells); this.overload = 0; return s; }
  get fill() { return this.cells + (this.cells < this.max ? this.charge / CELL_MOMENTUM : 0); }

  // ---------------------------------------------------------------- targeting
  pickTarget(list, range, dirTol = 0.965) {
    const cam = this.game.engine.camera;
    const origin = cam.position, fwd = cam.getWorldDirection(_v2);
    let best = null, bestScore = Infinity;
    for (const t of list) {
      if (t.enabled && !t.enabled()) continue;
      const p = t.getPoint ? t.getPoint() : t.getPos();
      const to = _v.copy(p).sub(origin); const d = to.length();
      const fromPlayer = p.distanceTo(this.player.pos);
      if (fromPlayer > (t.range || range)) continue;
      to.divideScalar(d);
      const dot = to.dot(fwd);
      const tol = t.big ? Math.min(dirTol, 0.9) : dirTol;
      if (dot < tol - (t.radius || 0) / Math.max(d, 1)) continue;
      // line of sight (ignore the target's own colliders)
      const los = this.game.physics.raycastFilter(origin, to, d - 0.6, G.STATIC, (c, m) => !m?.nocam && !(t.colliders && t.colliders.includes(c)));
      if (los) continue;
      const score = (1 - dot) * 40 + d * 0.02 - (t.priority || 0);
      if (score < bestScore) { bestScore = score; best = t; }
    }
    return best;
  }

  update(dt) {
    const g = this.game, inp = g.input, p = this.player;
    if (!p) return;
    const canUse = !g.director.active && !p.dead && !this.locked && (p.state !== 'seated') && (p.state !== 'scripted');
    const fwdTargets = canUse ? this.pickTarget(this.targets, RANGE) : null;
    this.target = fwdTargets;
    this.anchor = canUse && !this.latchLocked ? this.pickTarget(this.anchors, LATCH_RANGE, 0.975) : null;

    // CAPTURE
    const wantCapture = canUse && inp.down('capture') && this.target;
    if (wantCapture) {
      if (!this.capturing) { g.audio.tetherFire(); this.capturing = true; this.beamT = 0; g.hud.hint('capture'); }
      const t = this.target;
      const rate = t.kind === 'machine' || t.kind === 'tram' ? 2.5 : 1.0;
      const m = t.capture(dt, rate, this);
      this.addMomentum(m);
      this.beamT += dt;
      const hum = g.audio.tetherHum(); hum?.set(clamp(this.fill / 3, 0, 1));
      this.heat = Math.min(1, this.heat + dt * 0.2);
    } else if (this.capturing) {
      this.capturing = false; g.audio.stopLoop('tetherHum', 0.25); this.target?.onCaptureEnd?.();
    }
    this.aiming = !!wantCapture || (inp.down('release') && this.cells > 0);

    // RELEASE
    if (canUse && inp.pressed('release') && performance.now() - this.lastRelease > 250) {
      if (this.cells > 0) this.release();
      else { g.hud.flashCells(); g.audio.dryFire(); }
    }

    // LATCH (F) — interaction prompts take priority (handled by Interact)
    if (canUse && this.anchor && !g.interact.current && inp.pressed('use') && p.state !== 'latch') {
      this.fireLatch(this.anchor);
    }
    if (p.state === 'latch' && p.latch) this.beamTarget = p.latch.anchor.getPoint();
    else if (this.capturing && this.target) this.beamTarget = (this.target.getPoint ? this.target.getPoint() : this.target.getPos());
    else this.beamTarget = null;

    this.overload = Math.max(0, this.overload - dt * 0.4);
    this.heat = Math.max(0, this.heat - dt * 0.1);
    // anim
    const a = p.anim;
    const tetherActive = this.capturing || p.state === 'latch' || this.flashArm > 0;
    a.tether = damp(a.tether, tetherActive ? 1 : 0, 14, dt);
    a.tetherStrain = this.capturing ? clamp(0.3 + this.overload, 0, 1) : 0;
    if (this.beamTarget) {
      const hp = _v.copy(p.pos); hp.y += 1.35;
      const d = _v3.copy(this.beamTarget).sub(hp);
      a.tetherPitch = -Math.atan2(d.y, Math.hypot(d.x, d.z));
      const yawTo = Math.atan2(d.x, d.z); let dy = yawTo - p.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); a.tetherYaw = clamp(dy, -1, 1);
      if (this.capturing) p.targetYaw = yawTo;
    } else if (this.flashArm > 0) { a.tetherPitch = g.camera.pitch * -1 + 0.0; a.tetherYaw = 0; }
    this.flashArm = Math.max(0, (this.flashArm || 0) - dt);
    this.updateVisuals(dt);
  }

  release() {
    const g = this.game, p = this.player;
    const t = this.target;
    const cam = g.engine.camera; const fwd = cam.getWorldDirection(new THREE.Vector3());
    const n = this.cells; // dump everything
    const momentum = n * CELL_MOMENTUM;
    this.lastRelease = performance.now();
    this.flashArm = 0.35;
    p.targetYaw = g.camera.yaw;
    if (t) {
      const tp = t.getPoint ? t.getPoint() : t.getPos();
      // direction: along the aim, slightly lifted so things arc
      const dir = fwd.clone(); dir.y = Math.max(dir.y, -0.2) + 0.12; dir.normalize();
      if (t.releaseDir) t.releaseDir(dir, p);
      t.push(dir.clone().multiplyScalar(momentum), n, this);
      g.fx.tetherBeam(this.handPos(), tp, 0.25, true);
      g.fx.kineticBurst(tp, 0.6 + n * 0.3);
    } else {
      // kinetic blast: cone in front of the player
      const origin = this.handPos();
      g.fx.kineticCone(origin, fwd, n);
      for (const tt of this.targets) {
        if (tt.enabled && !tt.enabled()) continue;
        const tp = tt.getPos(); const d = tp.distanceTo(origin); if (d > 7 + n * 2) continue;
        const to = tp.clone().sub(origin).normalize(); if (to.dot(fwd) < 0.6) continue;
        tt.push(to.clone().setY(to.y + 0.25).normalize().multiplyScalar(momentum * (1 - d / (9 + n * 2))), n * 0.5, this);
      }
    }
    g.audio.tetherRelease(n / 3);
    g.camera.shake(0.12 + n * 0.08); g.camera.kick(-0.02 * n);
    this.spend(n, 'release');
    g.events.emit('tether:release', { target: t, cells: n });
  }

  fireLatch(anchor) {
    const g = this.game, p = this.player;
    g.audio.tetherFire();
    g.fx.tetherBeam(this.handPos(), anchor.getPoint(), 0.15, false);
    this.flashArm = 0.3;
    p.startLatch(anchor);
    anchor.onLatch?.(p);
    g.events.emit('tether:latch', anchor);
  }

  handPos() {
    const r = this.player.char.sockets.tether; r.updateMatrixWorld(true);
    return new THREE.Vector3().setFromMatrixPosition(r.matrixWorld);
  }

  // ---------------------------------------------------------------- visuals
  _buildVisuals() {
    const g = this.game;
    // beam: a ribbon of points we rebuild each frame (wobbling energy line)
    const N = 32;
    this.beamGeo = new THREE.BufferGeometry();
    this.beamPos = new Float32Array(N * 3);
    this.beamGeo.setAttribute('position', new THREE.BufferAttribute(this.beamPos, 3));
    this.beamMat = new THREE.LineBasicMaterial({ color: new THREE.Color(1, 0.6, 0.25).multiplyScalar(4), transparent: true, opacity: 0.95 });
    this.beam = new THREE.Line(this.beamGeo, this.beamMat); this.beam.frustumCulled = false; this.beam.visible = false;
    this.beam2 = new THREE.Line(this.beamGeo, new THREE.LineBasicMaterial({ color: new THREE.Color(1, 0.85, 0.6).multiplyScalar(2), transparent: true, opacity: 0.35 }));
    this.beam2.frustumCulled = false; this.beam2.visible = false;
    g.engine.cityRoot.add(this.beam, this.beam2);
    // target marker: billboard ring
    const ringTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.strokeStyle = '#fff'; x.lineWidth = 6; x.beginPath(); x.arc(64, 64, 52, 0, Math.PI * 2); x.stroke(); x.lineWidth = 3; for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; x.beginPath(); x.moveTo(64 + Math.cos(a) * 40, 64 + Math.sin(a) * 40); x.lineTo(64 + Math.cos(a) * 60, 64 + Math.sin(a) * 60); x.stroke(); } const t = new THREE.CanvasTexture(c); return t; })();
    this.marker = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringTex, color: new THREE.Color(1, 0.6, 0.25).multiplyScalar(2.5), depthTest: false, transparent: true, sizeAttenuation: false }));
    this.marker.scale.setScalar(0.05); this.marker.renderOrder = 999; this.marker.visible = false;
    this.anchorMarker = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringTex, color: new THREE.Color(0.4, 0.85, 1).multiplyScalar(2.5), depthTest: false, transparent: true, sizeAttenuation: false }));
    this.anchorMarker.scale.setScalar(0.04); this.anchorMarker.renderOrder = 999; this.anchorMarker.visible = false;
    g.engine.cityRoot.add(this.marker, this.anchorMarker);
    this.light = new THREE.PointLight(0xffa050, 0, 6, 2); g.engine.cityRoot.add(this.light);
  }
  updateVisuals(dt) {
    const t = performance.now() / 1000;
    // markers
    if (this.target) {
      this.marker.visible = true; this.marker.position.copy(this.target.getPoint ? this.target.getPoint() : this.target.getPos());
      const pulse = 1 + Math.sin(t * 8) * 0.08 + (this.capturing ? 0.25 : 0);
      this.marker.scale.setScalar(0.045 * pulse * (this.target.big ? 1.6 : 1));
      this.marker.material.rotation = t * (this.capturing ? 4 : 0.8);
    } else this.marker.visible = false;
    if (this.anchor && this.player.state !== 'latch') {
      this.anchorMarker.visible = true; this.anchorMarker.position.copy(this.anchor.getPoint());
      this.anchorMarker.scale.setScalar(0.035 + Math.sin(t * 6) * 0.004); this.anchorMarker.material.rotation = -t;
    } else this.anchorMarker.visible = false;
    // beam
    const show = !!this.beamTarget;
    this.beam.visible = this.beam2.visible = show;
    const hand = this.handPos();
    if (show) {
      const end = this.beamTarget;
      const N = this.beamPos.length / 3;
      const dir = _v.copy(end).sub(hand); const L = dir.length();
      const perp = _v2.set(-dir.z, 0, dir.x).normalize(); const up = _v3.crossVectors(dir, perp).normalize();
      for (let i = 0; i < N; i++) {
        const s = i / (N - 1);
        const env = Math.sin(s * Math.PI);
        const amp = (this.capturing ? 0.12 + this.overload * 0.3 : 0.05) * env;
        const w1 = Math.sin(s * 22 - t * 30) * amp, w2 = Math.cos(s * 17 + t * 24) * amp;
        this.beamPos[i * 3] = hand.x + dir.x * s + perp.x * w1 + up.x * w2;
        this.beamPos[i * 3 + 1] = hand.y + dir.y * s + perp.y * w1 + up.y * w2 - (this.player.state === 'latch' ? 0 : env * L * 0.0);
        this.beamPos[i * 3 + 2] = hand.z + dir.z * s + perp.z * w1 + up.z * w2;
      }
      this.beamGeo.attributes.position.needsUpdate = true;
      const col = this.player.state === 'latch' ? [0.4, 0.85, 1] : [1, 0.6, 0.25];
      this.beamMat.color.setRGB(col[0] * 4, col[1] * 4, col[2] * 4);
    }
    // gauntlet glow follows fill
    const f = this.fill / this.max;
    if (this.ring) {
      const c = this.overload > 0.3 ? [1, 1, 1] : this.damaged ? [0.5, 0.2, 0.1] : [1, 0.5 + f * 0.2, 0.15 + f * 0.1];
      const inten = 0.6 + f * 3 + (this.capturing ? 2 : 0) + this.overload * 4;
      this.ring.material.color.setRGB(c[0] * inten, c[1] * inten, c[2] * inten);
    }
    this.light.position.copy(hand);
    this.light.intensity = damp(this.light.intensity, (this.capturing || this.flashArm > 0 ? 6 : 0.4 + f * 1.5), 12, dt);
    this.light.color.setRGB(1, 0.62, 0.3);
  }
}
