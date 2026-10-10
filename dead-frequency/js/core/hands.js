'use strict';
// Evan's first-person hands: two forearms with articulated fingers, built from three.js geometry and driven by
// critically-damped springs. Every interaction plays a reach / press / grab / push / pull / pour gesture,
// the flashlight sits in the right hand, held items in the left, and the hands sway with walking and looking.

const HAND_POSES = {
  //            index middle ring pinky thumb  spread
  relaxed: [0.32, 0.38, 0.42, 0.46, 0.2, 0.05],
  open:    [0.05, 0.05, 0.06, 0.08, 0.0, 0.12],
  flat:    [0.0, 0.0, 0.0, 0.02, -0.1, 0.02],
  grip:    [0.82, 0.86, 0.88, 0.9, 0.55, 0.0],
  fist:    [1.0, 1.0, 1.0, 1.0, 0.75, 0.0],
  pinch:   [0.55, 0.62, 0.78, 0.85, 0.62, 0.0],
  point:   [0.0, 0.95, 1.0, 1.0, 0.6, 0.0],
  handle:  [0.7, 0.72, 0.75, 0.78, 0.35, 0.0],
};

class FPHand {
  constructor(parent, side, skin, sleeve) {
    this.side = side;               // 1 = right, -1 = left
    this.root = new THREE.Group(); parent.add(this.root);
    // forearm + sleeve run from the wrist back toward an off-screen elbow
    this.arm = new THREE.Group(); parent.add(this.arm);
    const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.031, 1, 12, 1, true), skin); fore.position.y = 0.5; this.arm.add(fore);
    const slv = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.054, 1, 14, 1, true), sleeve); slv.position.y = 0.5; slv.scale.y = 0.999;
    this.sleeveMesh = slv; this.arm.add(slv);
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.043, 0.011, 6, 16), sleeve); cuff.rotation.x = Math.PI / 2; this.cuff = cuff; this.arm.add(cuff);
    this.upper = new THREE.Group(); parent.add(this.upper);
    const up = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.058, 1, 14, 1, true), sleeve); up.position.y = 0.5; this.upperMesh = up; this.upper.add(up);
    const elb = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 8), sleeve); this.upper.add(elb);
    this.shoulder = new THREE.Vector3(side * 0.25, -0.3, 0.3);
    this.fore = fore;
    // hand: built for a right hand (palm down, fingers toward -z, thumb toward -x); mirrored for the left
    const h = this.hand = new THREE.Group(); this.root.add(h);
    if (side < 0) h.scale.x = -1;
    const palm = new THREE.Mesh(new XT.RoundedBoxGeometry(0.078, 0.03, 0.088, 3, 0.012), skin); palm.position.set(0, 0, -0.04); h.add(palm);
    const heel = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), skin); heel.scale.set(1.25, 0.6, 1); heel.position.set(0.004, -0.004, -0.004); h.add(heel);
    const knuck = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.055, 3, 8), skin); knuck.rotation.z = Math.PI / 2; knuck.position.set(0, 0.004, -0.083); h.add(knuck);
    this.fingers = [];
    const F = [[-0.027, 0.95, 0.0085], [-0.009, 1.0, 0.0088], [0.009, 0.95, 0.0084], [0.026, 0.78, 0.0076]];
    for (const [fx, len, rad] of F) {
      const segs = [];
      let par = new THREE.Group(); par.position.set(fx, 0.002, -0.086); h.add(par);
      const L = [0.042, 0.027, 0.022].map(l => l * len);
      for (let k = 0; k < 3; k++) {
        const j = k === 0 ? par : new THREE.Group();
        if (k > 0) { j.position.z = -L[k - 1]; par.add(j); }
        const m = new THREE.Mesh(new THREE.CapsuleGeometry(rad * (1 - k * 0.08), L[k] - rad, 3, 8), skin);
        m.rotation.x = Math.PI / 2; m.position.z = -L[k] / 2; j.add(m);
        if (k === 2) { const nail = new THREE.Mesh(new THREE.BoxGeometry(rad * 1.5, 0.001, L[k] * 0.55), skin.userData.nail); nail.position.set(0, rad * 0.85, -L[k] * 0.6); j.add(nail); }
        segs.push(j); par = j;
      }
      this.fingers.push(segs);
    }
    // thumb: base joint on the side of the palm, angled forward and under
    const tb = new THREE.Group(); tb.position.set(-0.034, -0.01, -0.025); tb.rotation.set(-0.3, 0.75, -0.55); h.add(tb);
    const tm = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.03, 3, 8), skin); tm.rotation.x = Math.PI / 2; tm.position.z = -0.02; tb.add(tm);
    const t2 = new THREE.Group(); t2.position.z = -0.038; tb.add(t2);
    const tm2 = new THREE.Mesh(new THREE.CapsuleGeometry(0.0095, 0.022, 3, 8), skin); tm2.rotation.x = Math.PI / 2; tm2.position.z = -0.014; t2.add(tm2);
    const tn = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.001, 0.012), skin.userData.nail); tn.position.set(0, 0.009, -0.02); t2.add(tn);
    this.thumb = [tb, t2];
    // socket for held items (in the curl of the fingers)
    this.socket = new THREE.Group(); this.socket.position.set(0, -0.035, -0.07); this.root.add(this.socket);
    this.root.traverse(o => { if (o.isMesh) { o.castShadow = false; o.renderOrder = 2; } });
    this.arm.traverse(o => { if (o.isMesh) { o.castShadow = false; o.renderOrder = 2; } });
    // spring state
    this.pos = new THREE.Vector3(side * 0.3, -0.6, -0.2); this.vel = new THREE.Vector3();
    this.tPos = this.pos.clone(); this.q = new THREE.Quaternion(); this.tQ = new THREE.Quaternion();
    this.curl = HAND_POSES.relaxed.slice(); this.tCurl = HAND_POSES.relaxed.slice();
    this.elbow = new THREE.Vector3(side * 0.24, -0.42, 0.12);
  }
  update(dt, stiff = 170, damp = 2 * Math.sqrt(stiff)) {
    // critically damped spring toward the target position (slight lag = weight)
    if (this.resting) {   // hanging at the side: follow the body closely, no spring overshoot
      const k = 1 - Math.exp(-22 * dt); this.pos.lerp(this.tPos, k); this.vel.set(0, 0, 0);
    } else {
    const ax = (this.tPos.x - this.pos.x) * stiff - this.vel.x * damp, ay = (this.tPos.y - this.pos.y) * stiff - this.vel.y * damp, az = (this.tPos.z - this.pos.z) * stiff - this.vel.z * damp;
    this.vel.x += ax * dt; this.vel.y += ay * dt; this.vel.z += az * dt;
    this.pos.addScaledVector(this.vel, dt);
    }
    this.q.slerp(this.tQ, 1 - Math.exp(-(this.resting ? 22 : 14) * dt));
    for (let i = 0; i < 6; i++) this.curl[i] = U.damp(this.curl[i], this.tCurl[i], 16, dt);
    this.root.position.copy(this.pos); this.root.quaternion.copy(this.q);
    // fingers
    for (let f = 0; f < 4; f++) {
      const c = this.curl[f], s = this.fingers[f];
      s[0].rotation.x = -c * 1.35; s[1].rotation.x = -c * 1.55; s[2].rotation.x = -c * 1.05;
      s[0].rotation.y = (f - 1.5) * this.curl[5] * -0.12;
    }
    this.thumb[0].rotation.x = -0.3 - this.curl[4] * 0.55; this.thumb[0].rotation.y = 0.75 - this.curl[4] * 0.45; this.thumb[1].rotation.x = -this.curl[4] * 0.9;
    // forearm: from the wrist back to the elbow anchor
    const wrist = this.root.localToWorld(new THREE.Vector3(0, 0, 0.012)), wl = this.arm.parent.worldToLocal(wrist);
    const dir = this.elbow.clone().sub(wl), len = dir.length();
    this.arm.position.copy(wl); this.arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    this.fore.scale.set(1, len, 1); this.sleeveMesh.position.y = 0.13 + len * 0.5; this.sleeveMesh.scale.set(1, Math.max(0.01, len - 0.1), 1);
    this.cuff.position.y = 0.13;
    // upper arm: elbow -> shoulder
    const ud = this.shoulder.clone().sub(this.elbow), ul = ud.length();
    this.upper.position.copy(this.elbow); this.upper.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), ud.normalize());
    this.upperMesh.scale.set(1, ul, 1);
  }
  pose(name) { const p = HAND_POSES[name] || HAND_POSES.relaxed; for (let i = 0; i < 6; i++) this.tCurl[i] = p[i]; }
  aim(pos, rx = 0, ry = 0, rz = 0) { this.tPos.copy(pos); this.tQ.setFromEuler(new THREE.Euler(rx, ry * this.side, rz * this.side, 'YXZ')); }
}

const Hands = {
  active: [],      // running gestures
  init(cam) {
    this.cam = cam;
    this.rig = new THREE.Group(); cam.add(this.rig);
    const skin = new THREE.MeshStandardMaterial({ color: 0xd9a98c, roughness: 0.62, envMapIntensity: 0.2 });
    skin.userData.nail = new THREE.MeshStandardMaterial({ color: 0xe8c4b4, roughness: 0.35 });
    const sleeve = new THREE.MeshStandardMaterial({ color: 0x2b3547, roughness: 0.95, side: THREE.DoubleSide });
    this.R = new FPHand(this.rig, 1, skin, sleeve);
    this.L = new FPHand(this.rig, -1, skin, sleeve);
    // flashlight in the right hand
    const fl = this.flashlight = new THREE.Group();
    const metal = new THREE.MeshStandardMaterial({ color: 0x18181a, roughness: 0.35, metalness: 0.6 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.17, 14), metal); body.rotation.x = Math.PI / 2; fl.add(body);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.019, 0.05, 16), metal); head.rotation.x = Math.PI / 2; head.position.z = -0.1; fl.add(head);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.022, 16), new THREE.MeshBasicMaterial({ color: 0xfff4da })); lens.position.z = -0.1255; lens.rotation.y = Math.PI; fl.add(lens);
    this.lensMat = lens.material;
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.0185, 0.0185, 0.07, 14), new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.9 })); grip.rotation.x = Math.PI / 2; grip.position.z = 0.03; fl.add(grip);
    fl.position.set(0, 0.0, 0.005); fl.traverse(o => { if (o.isMesh) o.renderOrder = 2; });
    this.R.socket.add(fl); this.R.socket.position.set(0, -0.042, -0.055); this.R.socket.rotation.set(0, 0, 1.2);
    this.sway = new THREE.Vector2(); this.swayV = new THREE.Vector2();
    this.handset = this.makeHandset();
  },
  makeHandset() {
    const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: 0x2b2a28, roughness: 0.5 });
    const bar = new THREE.Mesh(new XT.RoundedBoxGeometry(0.045, 0.03, 0.2, 2, 0.012), m); g.add(bar);
    for (const z of [-0.09, 0.09]) { const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.024, 0.035, 14), m); cup.position.set(0, -0.022, z); g.add(cup); }
    g.traverse(o => { if (o.isMesh) o.renderOrder = 2; }); g.visible = false;
    return g;
  },
  // a point / orientation given in body space (x right, y up from the feet, z forward) -> rig space
  bodyPoint(x, y, z) {
    const P = Player, c = Math.cos(P.yaw), s = Math.sin(P.yaw);
    const w = new THREE.Vector3(P.pos.x + c * x - s * z, P.pos.y + y, P.pos.z - s * x - c * z);
    return this.rig.worldToLocal(w);
  },
  bodyQuat(rx, ry, rz) {
    const wq = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, Player.yaw + ry, rz, 'YXZ'));
    return this.rig.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(wq);
  },
  // arms hanging at the sides, swinging with each step (seen when looking down)
  rest(H, swing, b) {
    const s = H.side, sw = swing * s * -1;
    H.tPos.copy(this.bodyPoint(s * 0.235, 0.86 + Math.abs(sw) * 0.03 * b, 0.07 + sw * 0.17 * b));
    H.tQ.copy(this.bodyQuat(-1.42 - sw * 0.35 * b, 0, -1.57 * s));
    H.pose('relaxed');
    H.elbow.lerp(this.bodyPoint(s * 0.215, 1.13, -0.01 + sw * 0.07 * b), 0.5);
    H.shoulder.copy(this.bodyPoint(s * 0.2, 1.43, -0.03));
    H.resting = true;
  },
  // which hand is free to do something
  free() { if (!Player.held && !(Player.flashOn)) return this.R; if (!Player.held) return this.L; return Player.flashOn ? this.R : this.L; },

  // a gesture toward a world point. kind: reach | press | grab | push | pull | pour | knock
  gesture(kind, point, o = {}) {
    if (!this.R) return;
    const hand = o.hand || (kind === 'pour' ? this.L : this.free());
    // remove gestures already running on this hand
    this.active = this.active.filter(g => g.hand !== hand);
    const g = { kind, hand, t: 0, dur: o.dur || ({ press: 0.42, push: 0.55, grab: 0.5, reach: 0.48, pull: 0.6, pour: 1.6, knock: 0.9 }[kind] || 0.5), hold: !!o.hold, point: point ? point.clone() : null, onContact: o.onContact, contacted: false };
    this.active.push(g);
    return g;
  },
  release() { for (const g of this.active) g.hold = false; },
  // target for a world point, in camera space, clamped to arm's reach
  reachTarget(world, side) {
    const p = this.rig.worldToLocal(world.clone());
    p.x += side * 0.03; p.y -= 0.03;
    const d = p.length(), maxR = 0.62, minR = 0.28;
    if (d > maxR) p.multiplyScalar(maxR / d); else if (d < minR) p.multiplyScalar(minR / Math.max(0.01, d));
    return p;
  },

  update(dt) {
    if (!this.R) return;
    const inCar = G.mode === 'car', P = Player;
    this.rig.visible = !inCar && G.mode !== 'cutscene' && !P.override && !P.hidden;
    if (!this.rig.visible) return;
    // look sway (hands lag behind mouse motion) and walk bob
    this.swayV.x += ((Input.mdx || 0) * -0.0009 - this.sway.x) * 60 * dt; this.swayV.y += ((Input.mdy || 0) * -0.0009 - this.sway.y) * 60 * dt;
    this.swayV.multiplyScalar(Math.exp(-11 * dt)); this.sway.addScaledVector(this.swayV, dt * 9);
    this.sway.x = U.clamp(this.sway.x, -0.06, 0.06); this.sway.y = U.clamp(this.sway.y, -0.05, 0.05);
    const b = P.bobAmt, bt = P.bobT * Math.PI;
    const bob = new THREE.Vector3(Math.cos(bt * 0.5) * 0.012 * b + this.sway.x, -Math.abs(Math.sin(bt)) * 0.016 * b + this.sway.y + Math.sin(G.time * 1.3) * 0.002, Math.sin(bt) * 0.004 * b);
    const run = Input.held('ShiftLeft') && b > 0.6 ? 1 : 0;
    // ---- resting poses ----
    const R = this.R, L = this.L;
    const swing = Math.sin(P.bobT * Math.PI * 0.5);
    for (const H of [R, L]) { H.resting = false; H.elbow.lerp(new THREE.Vector3(H.side * 0.24, -0.42, 0.12), 0.25); H.shoulder.set(H.side * 0.25, -0.3, 0.3); }
    const onPhone = !!(window.StationPhone && StationPhone.inCall);
    // right: flashlight / phone handset / lowered
    if (onPhone) { R.aim(new THREE.Vector3(0.15, -0.07, -0.13).add(bob), -0.2, 1.3, 0.6); R.pose('grip'); this.handset.visible = true; if (this.handset.parent !== R.socket) { R.socket.add(this.handset); this.handset.position.set(0, -0.005, 0.0); this.handset.rotation.set(0.25, 0, 0.15); } }
    else { this.handset.visible = false; if (Phone.open) { R.aim(new THREE.Vector3(0.2, -0.3, -0.34).add(bob), 0.9, 0.2, -0.2); R.pose('grip'); }
    else if (P.flashOn) { R.aim(new THREE.Vector3(0.16, -0.15 - run * 0.05, -0.31).add(bob), 0.1, -0.12, -1.2); R.pose('grip'); }
    else { this.rest(R, swing, b); } }
    this.flashlight.visible = P.hasFlashlight && P.flashOn && !onPhone;
    this.lensMat.color.setHex(P.flashOn ? 0xfff4da : 0x333333);
    // left: held item / lowered
    if (P.held) {   // palm turned in, wrapped around the item, which stays upright
      const roll = 1.2;   // palm turned toward the middle of the screen
      L.aim(new THREE.Vector3(-0.16, -0.14 - run * 0.04, -0.32).add(bob), 0.05, -0.2, -roll); L.pose(P.heldName === 'filter' || P.heldName === 'paper' ? 'pinch' : 'grip');
      L.socket.position.set(0, -0.045, -0.06); L.socket.rotation.set(0, 0, -roll);
    }
    else { this.rest(L, swing, b); L.socket.rotation.set(0, 0, 0); }
    // ---- gestures override the resting pose ----
    for (const g of this.active.slice()) {
      g.t += dt; const k = g.t / g.dur, H = g.hand;
      const tgt = g.point ? this.reachTarget(g.point, H.side) : new THREE.Vector3(H.side * 0.12, -0.12, -0.5);
      const ease = x => 1 - Math.pow(1 - U.clamp(x, 0, 1), 3);
      const rest = H.tPos.clone();
      let out = 0, poseName = 'open';
      if (g.kind === 'pour') {
        out = U.smooth(U.clamp(k / 0.25, 0, 1)) * (1 - U.smooth(U.clamp((k - 0.8) / 0.2, 0, 1)));
        H.tPos.lerp(new THREE.Vector3(-0.1, -0.16, -0.42), out);
        H.tQ.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -1.05 * out)));
        poseName = 'grip';
      } else if (g.kind === 'knock') {
        out = k < 0.15 ? ease(k / 0.15) : (k > 0.85 ? 1 - ease((k - 0.85) / 0.15) : 1);
        const tap = Math.max(0, Math.sin((k - 0.15) / 0.7 * Math.PI * 3)) * 0.05 * (k > 0.15 && k < 0.85 ? 1 : 0);
        H.tPos.lerp(tgt.clone().multiplyScalar(0.9 - tap * 2), out); poseName = 'fist';
      } else {
        // reach out (fast attack), touch, return (slower release)
        const a = 0.42, rel = g.hold ? 1 : (k < a ? ease(k / a) : 1 - U.smooth((k - a) / (1 - a)));
        out = rel;
        const pt = tgt.clone();
        if (g.kind === 'press') pt.multiplyScalar(1 + Math.sin(U.clamp((k - a * 0.8) / 0.25, 0, 1) * Math.PI) * 0.06);
        if (g.kind === 'pull' && g.hold) pt.add(new THREE.Vector3(0, -0.05, 0.16).multiplyScalar(0.5 + 0.5 * Math.sin(g.t * 5)));
        if (g.kind === 'pull' && !g.hold) pt.add(new THREE.Vector3(0, -0.04, 0.12).multiplyScalar(U.smooth(U.clamp((k - a) / 0.3, 0, 1))));
        H.tPos.lerp(pt, out);
        const roll = g.kind === 'push' ? new THREE.Euler(-0.9, 0, 0.1) : (g.kind === 'press' ? new THREE.Euler(-0.15, 0, 0.35) : new THREE.Euler(-0.25, 0, 0.5));
        H.tQ.slerp(new THREE.Quaternion().setFromEuler(new THREE.Euler(roll.x, roll.y * H.side, roll.z * H.side)), out);
        poseName = g.kind === 'press' ? 'point' : g.kind === 'push' ? 'flat' : (k > a * 0.85 ? 'grip' : 'open');
        if (g.kind === 'reach') poseName = k > a * 0.85 ? 'pinch' : 'open';
        if (!g.contacted && k >= a * 0.9) { g.contacted = true; if (g.onContact) g.onContact(); }
      }
      if (out > 0.05) { H.pose(poseName); H.resting = false; H.elbow.lerp(new THREE.Vector3(H.side * 0.24, -0.42, 0.12), out); H.shoulder.set(H.side * 0.25, -0.3, 0.3); }
      if (k >= 1 && !g.hold) this.active.splice(this.active.indexOf(g), 1);
    }
    R.update(dt); L.update(dt);
    // the beam comes out of the flashlight in the hand
    if (P.flash && P.flashOn && P.flash.parent) {
      const lp = P.flash.parent.worldToLocal(this.flashlight.localToWorld(new THREE.Vector3(0, 0, -0.13)));
      const lt = P.flash.parent.worldToLocal(this.flashlight.localToWorld(new THREE.Vector3(0, 0.06, -5)));
      P.flash.position.copy(lp); P.flash.target.position.lerp(lt, 0.5);
    }
  },
  // map an interaction prompt to a gesture
  forPrompt(text) {
    const t = (text || '').toLowerCase();
    if (/^(read|look|watch|listen|check|browse|search|wait|follow|warming|hands full)/.test(t) || /security monitor|tape …|brewing/.test(t)) return /browse|search|read note|notebook|shoebox|glovebox|visor|floor mat|tarp/.test(t) ? 'reach' : null;
    if (/pour|dump|fill/.test(t)) return 'pour';
    if (/knock/.test(t)) return 'knock';
    if (/door|gate|push|shove/.test(t) && !/unlock|lock|deadbolt|padlock/.test(t)) return 'push';
    if (/press|button|brew|dial|switch|flip|breaker|key the mic|open the mic|turn on|turn off|power|light|filament|plate|eject|rewind|play|record|lockbox|enter|keypad|lamp/.test(t)) return 'press';
    if (/pull|cord|starter|pump|tug/.test(t)) return 'pull';
    if (/take|pick|grab|lift|answer|use the phone|put|load|give|pay|buy|scoop|free|cut|unlock|lock|deadbolt|open|close|hang/.test(t)) return 'grab';
    return 'reach';
  },
};
