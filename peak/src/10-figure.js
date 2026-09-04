// ============================================================ SCOUTS
// Big round head, two flat shapes for a face, oversized mittens so you can
// always see the grip, a scarf in the slot colour.  Everything is posed by
// hand each frame - no skinning, no clips.
var SKIN = [0xf0c9a0, 0xd9a173, 0xb07a4e, 0x8a5a38];

function Figure(slot, tone) {
  var gear = SLOT_COL[slot % SLOT_COL.length];
  var dark = shadeHex(gear, 0.6), pants = 0x3c4350, boot = 0x24282e;
  var skin = SKIN[(tone === undefined ? slot : tone) % SKIN.length];
  this.slot = slot;
  var G = THREE.Group;

  this.root = new G();
  this.body = new G(); this.root.add(this.body);
  this.hips = new G(); this.hips.position.y = 0.62; this.body.add(this.hips);

  var torso = new THREE.Mesh(mergeParts([
    { g: roundBox(0.56, 0.6, 0.38), c: gear, p: [0, 0.3, 0] },
    { g: roundBox(0.58, 0.14, 0.4), c: dark, p: [0, 0.1, 0] },
    { g: roundBox(0.42, 0.4, 0.24), c: shadeHex(gear, 0.42), p: [0, 0.36, -0.29] },
    { g: roundBox(0.3, 0.1, 0.1), c: 0xd9b06a, p: [0, 0.48, -0.42] },
  ]), MAT.solid);
  torso.castShadow = true;
  this.hips.add(torso);

  this.neck = new G(); this.neck.position.y = 0.64; this.hips.add(this.neck);
  var head = new THREE.Mesh(mergeParts([
    { g: new THREE.IcosahedronGeometry(0.36, 1), c: skin, p: [0, 0.3, 0] },
    { g: new THREE.TorusGeometry(0.25, 0.09, 5, 10), c: gear, p: [0, 0.03, 0], r: [1.57, 0, 0] },
    { g: roundBox(0.16, 0.32, 0.1), c: gear, p: [0.12, -0.05, -0.22], r: [0.3, 0, 0.2] },
    { g: new THREE.SphereGeometry(0.29, 8, 5, 0, 6.283, 0, 1.1), c: dark, p: [0, 0.36, 0] },
  ]), MAT.solid);
  head.castShadow = true;
  // a couple of flat shapes is the whole face
  var eyes = new THREE.Mesh(mergeParts([
    { g: new THREE.CircleGeometry(0.062, 8), c: 0x231f26, p: [0.13, 0.32, 0.335] },
    { g: new THREE.CircleGeometry(0.062, 8), c: 0x231f26, p: [-0.13, 0.32, 0.335] },
    { g: new THREE.CircleGeometry(0.035, 7), c: 0x231f26, p: [0, 0.19, 0.345], s: [1.6, 0.5, 1] },
  ]), MAT.solidS);
  this.neck.add(head, eyes);
  this.eyes = eyes;
  this.headY = 1.6;

  var UP = 0.32, LO = 0.3;
  this.L1 = UP; this.L2 = LO + 0.1;
  function arm(side) {
    var sh = new G();
    sh.position.set(side * 0.34, 0.52, 0);
    var up = new THREE.Mesh(mergeParts([
      { g: roundBox(0.17, UP, 0.17), c: gear, p: [0, -UP / 2, 0] },
    ]), MAT.solid);
    up.castShadow = true;
    sh.add(up);
    var el = new G(); el.position.y = -UP; sh.add(el);
    var fo = new THREE.Mesh(mergeParts([
      { g: roundBox(0.15, LO, 0.15), c: dark, p: [0, -LO / 2, 0] },
      { g: new THREE.IcosahedronGeometry(0.21, 0), c: gear, p: [0, -LO - 0.12, 0.02] },
    ]), MAT.solid);
    fo.castShadow = true;
    el.add(fo);
    return { sh: sh, el: el };
  }
  this.aL = arm(1); this.aR = arm(-1);
  this.hips.add(this.aL.sh, this.aR.sh);

  function leg(side) {
    var hp = new G();
    hp.position.set(side * 0.15, 0.02, 0);
    var th = new THREE.Mesh(mergeParts([{ g: roundBox(0.21, 0.32, 0.21), c: pants, p: [0, -0.16, 0] }]), MAT.solid);
    th.castShadow = true;
    hp.add(th);
    var kn = new G(); kn.position.y = -0.32; hp.add(kn);
    var sh2 = new THREE.Mesh(mergeParts([
      { g: roundBox(0.19, 0.28, 0.19), c: shadeHex(pants, 0.85), p: [0, -0.14, 0] },
      { g: roundBox(0.23, 0.14, 0.3), c: boot, p: [0, -0.32, 0.04] },
    ]), MAT.solid);
    sh2.castShadow = true;
    kn.add(sh2);
    return { hp: hp, kn: kn };
  }
  this.lL = leg(1); this.lR = leg(-1);
  this.hips.add(this.lL.hp, this.lR.hp);

  // A scarf in the slot colour, three segments long, each lagging the one
  // above it.  It costs almost nothing and it is the only thing on a scout
  // that keeps moving after they stop, which is what sells the weight.
  this.scarf = [];
  var par = this.neck, len = [0.26, 0.23, 0.19], wd = [0.19, 0.165, 0.13];
  for (var si = 0; si < 3; si++) {
    var seg = new G();
    seg.position.set(0, si === 0 ? 0.02 : -len[si - 1], si === 0 ? -0.16 : 0);
    var m = new THREE.Mesh(mergeParts([
      { g: roundBox(wd[si], len[si], 0.075, 0.03), c: si & 1 ? dark : gear, p: [0, -len[si] / 2, 0] },
    ]), MAT.solid);
    m.castShadow = true;
    seg.add(m);
    par.add(seg);
    par = seg;
    this.scarf.push(seg);
  }
  this.scarfV = [0, 0, 0];
  this.scarfA = [0, 0, 0];

  // Every joint the pose writes to, so the spring pass can pick them up.
  // PEAK's scouts are active ragdolls - Landfall drive their characters with
  // physics forces rather than keyframes, which is why the limbs lag, wobble
  // and settle instead of snapping between poses.  There is no physics engine
  // here, so each joint gets an angular spring toward the pose the animation
  // asks for.  Same result: nothing arrives instantly, and everything
  // overshoots a little and settles.
  this.joints = [];
  var self = this;
  function spring(o, k) {
    self.joints.push({ o: o, k: k, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, init: false });
  }
  spring(this.body, 150); spring(this.hips, 190); spring(this.neck, 120);
  spring(this.lL.hp, 240); spring(this.lR.hp, 240);
  spring(this.lL.kn, 260); spring(this.lR.kn, 260);
  this.armQ = [
    { o: this.aL.sh, q: new THREE.Quaternion(), rate: 17 },
    { o: this.aR.sh, q: new THREE.Quaternion(), rate: 17 },
    { o: this.aL.el, q: new THREE.Quaternion(), rate: 20 },
    { o: this.aR.el, q: new THREE.Quaternion(), rate: 20 },
  ];
  this.hipY = 0.62; this.hipVY = 0;

  this.torchLight = null;
  this.held = null;
  this.phase = 0;
  this.reach = 0;
  this.squash = 0;
  this.lean = 0;
}

// Called when the scout hits the ground.  Knees and torso absorb it over the
// next few tenths of a second instead of the body snapping to standing.
Figure.prototype.land = function (force) {
  this.squash = Math.max(this.squash, clamp(force, 0, 1));
};

Figure.prototype.setHeld = function (kind) {
  if (this.heldKind === kind) return;
  this.heldKind = kind;
  if (this.held) { this.aR.el.remove(this.held); this.held = null; }
  if (this.torchLight) { this.root.remove(this.torchLight); this.torchLight = null; }
  if (!kind) return;
  var m = new THREE.Mesh(WI.geos[kind], MAT.solid);
  m.position.set(0, -0.46, 0.12);
  m.scale.setScalar(0.95);
  this.aR.el.add(m);
  this.held = m;
  if (kind === 'torch') {
    this.torchLight = new THREE.PointLight(0xff9a4a, 1.8, 18, 2);
    this.torchLight.position.set(0, 1.15, 0.4);
    this.root.add(this.torchLight);
  }
};

// ---- two-bone reach so a mitten lands where it is told -----------------
var _ikV = new THREE.Vector3(), _ikQ = new THREE.Quaternion(), _ikDown = new THREE.Vector3(0, -1, 0);
Figure.prototype.aimArm = function (arm, worldTarget) {
  this.hips.updateMatrixWorld();
  _ikV.copy(worldTarget);
  this.hips.worldToLocal(_ikV);
  _ikV.sub(arm.sh.position);
  var d = _ikV.length();
  var L1 = this.L1, L2 = this.L2, reach = L1 + L2;
  if (d < 1e-4) return;
  var dc = clamp(d, Math.abs(L1 - L2) + 0.02, reach * 0.985);
  _ikV.normalize();
  _ikQ.setFromUnitVectors(_ikDown, _ikV);
  arm.sh.quaternion.copy(_ikQ);
  var cosA = clamp((L1 * L1 + dc * dc - L2 * L2) / (2 * L1 * dc), -1, 1);
  var cosB = clamp((L1 * L1 + L2 * L2 - dc * dc) / (2 * L1 * L2), -1, 1);
  arm.sh.rotateX(-Math.acos(cosA));
  arm.el.rotation.set(Math.PI - Math.acos(cosB), 0, 0);
};

// state: ST.*; o carries the extras
Figure.prototype.pose = function (dt, o) {
  var t = o.t, sp = o.speed || 0, s = o.state;
  this.squash = Math.max(0, this.squash - dt * 3.4);
  this.poseCore(dt, o);
  this.settle(dt, o);
  this.poseScarf(dt, o);
};

// The animation writes where each joint WANTS to be; this drags the joint
// there over time.  Slightly under-damped, so a limb swings a touch past its
// mark and comes back - the single biggest difference between a pose that
// reads as animated and one that reads as physical.
Figure.prototype.settle = function (dt, o) {
  var h = Math.min(dt, 1 / 45), J = this.joints, i, j, d;
  for (i = 0; i < J.length; i++) {
    j = J[i];
    var tx = j.o.rotation.x, ty = j.o.rotation.y, tz = j.o.rotation.z;
    if (!j.init) { j.init = true; j.x = tx; j.y = ty; j.z = tz; }
    d = 2 * Math.sqrt(j.k) * 0.62;                 // under-damped on purpose
    j.vx += ((tx - j.x) * j.k - j.vx * d) * h;
    j.vy += ((ty - j.y) * j.k - j.vy * d) * h;
    j.vz += ((tz - j.z) * j.k - j.vz * d) * h;
    j.x += j.vx * h; j.y += j.vy * h; j.z += j.vz * h;
    j.o.rotation.set(j.x, j.y, j.z);
  }
  // arms carry IK targets, so they follow by slerp rather than by spring:
  // overshooting a hand that is supposed to be ON a hold looks broken
  for (i = 0; i < this.armQ.length; i++) {
    var a = this.armQ[i], t = 1 - Math.exp(-a.rate * h);
    a.q.slerp(a.o.quaternion, t);
    a.o.quaternion.copy(a.q);
  }
  // the hips ride their own spring so a landing compresses and rebounds
  var ty2 = this.hips.position.y;
  this.hipVY += ((ty2 - this.hipY) * 300 - this.hipVY * 2 * Math.sqrt(300) * 0.58) * h;
  this.hipY += this.hipVY * h;
  this.hips.position.y = this.hipY;
  // and the whole body leans into what it is doing, the way a balance script
  // pulls a ragdoll's torso around
  var sp = o.speed || 0;
  this.leanZ = damp(this.leanZ || 0, clamp((o.turn || 0) * 0.5, -0.3, 0.3), 6, dt);
  this.body.rotation.z += this.leanZ * (0.4 + clamp(sp / K.WALK, 0, 1) * 0.6);
};

// The scarf is a chain of three damped springs.  Each segment is pulled by
// how fast the one above it turned, so a change of direction runs down the
// scarf instead of the whole thing rotating as one board.
Figure.prototype.poseScarf = function (dt, o) {
  var sp = o.speed || 0, gust = Math.sin(o.t * 2.3) * 0.09 + Math.sin(o.t * 5.1) * 0.04;
  var drive = clamp(sp / K.WALK, 0, 1.6) * 0.42 + gust + (o.state === ST.AIR ? 0.5 : 0);
  var h = Math.min(dt, 0.05);
  for (var i = 0; i < 3; i++) {
    var tgt = drive * (0.5 + i * 0.28) + (i === 0 ? 0.22 : 0.1);
    this.scarfA[i] += (tgt - this.scarfV[i]) * 44 * h;
    this.scarfA[i] *= Math.exp(-9 * h);
    this.scarfV[i] += this.scarfA[i] * h;
    this.scarf[i].rotation.x = clamp(this.scarfV[i], -1.1, 1.3);
    this.scarf[i].rotation.z = Math.sin(o.t * (1.7 + i * 0.5) + i) * 0.13 * (0.4 + drive);
  }
};

Figure.prototype.poseCore = function (dt, o) {
  var t = o.t, sp = o.speed || 0, s = o.state;
  var aL = this.aL, aR = this.aR, lL = this.lL, lR = this.lR;
  var b = this.body, hp = this.hips, nk = this.neck;
  var k;

  if (s === ST.OUT) {
    b.rotation.set(-Math.PI / 2 + 0.12, 0, 0);
    b.position.set(0, 0.3, 0);
    hp.rotation.set(0, 0, 0);
    aL.sh.quaternion.identity(); aR.sh.quaternion.identity();
    aL.sh.rotation.set(0.2, 0, 1.5); aR.sh.rotation.set(0.2, 0, -1.5);
    aL.el.rotation.set(-0.5, 0, 0); aR.el.rotation.set(-0.5, 0, 0);
    lL.hp.rotation.set(0.35, 0, 0.1); lR.hp.rotation.set(0.15, 0, -0.1);
    lL.kn.rotation.set(-0.4, 0, 0); lR.kn.rotation.set(-0.2, 0, 0);
    nk.rotation.set(0.5 + Math.sin(t * 1.3) * 0.06, 0, 0);
    return;
  }

  b.position.set(0, 0, 0);
  b.rotation.set(0, 0, 0);

  if (s === ST.CLIMB || s === ST.SLIP) {
    // The body hangs off two planted hands and the feet paw at the rock.
    this.phase += dt * (o.climbing ? 3.0 : 0.7);
    k = this.phase;
    var sw = Math.sin(k);
    var slab = clamp((o.wallNy || 0) / 0.82, 0, 1);
    b.rotation.x = -0.14 - slab * 0.62;
    hp.rotation.set(0.08, 0, 0);
    hp.position.y = 0.62 - 0.05 + Math.sin(k * 2) * 0.03 - slab * 0.1;

    if (o.handL && o.handR) {
      this.aimArm(aL, o.handL);
      this.aimArm(aR, o.handR);
    } else {
      aL.sh.quaternion.identity(); aR.sh.quaternion.identity();
      aL.sh.rotation.set(-2.5 - sw * 0.5, 0, 0.18);
      aR.sh.rotation.set(-2.5 + sw * 0.5, 0, -0.18);
      aL.el.rotation.set(-0.28, 0, 0); aR.el.rotation.set(-0.28, 0, 0);
    }
    var cw = Math.cos(k);
    // the body hangs off whichever hand is planted and swings to the other
    this.lean = damp(this.lean, (o.grip || 0) * 0.5, 7, dt);
    b.rotation.z = this.lean * 0.17;
    hp.rotation.y = this.lean * 0.2;
    hp.position.x = this.lean * 0.07;
    // feet push in opposition to the hands, and the loaded leg straightens
    lL.hp.rotation.set(-0.5 + cw * 0.42, 0, 0.16 + this.lean * 0.06);
    lR.hp.rotation.set(-0.5 - cw * 0.42, 0, -0.16 + this.lean * 0.06);
    lL.kn.rotation.set(clamp(0.72 - cw * 0.42, 0.05, 1.5), 0, 0);
    lR.kn.rotation.set(clamp(0.72 + cw * 0.42, 0.05, 1.5), 0, 0);
    nk.rotation.set(-0.26 + Math.sin(k * 2) * 0.05, this.lean * -0.22, 0);
    if (s === ST.SLIP) { b.rotation.x = 0.1; nk.rotation.x = 0.2; }
    if (o.tired) { hp.position.y += Math.sin(t * 21) * 0.012; }
    return;
  }

  aL.sh.quaternion.identity(); aR.sh.quaternion.identity();

  if (s === ST.AIR) {
    var fall = clamp(-(o.vy || 0) / 14, 0, 1);
    b.rotation.x = 0.1 - fall * 0.26;
    aL.sh.rotation.set(-1.5 - fall * 1.2, 0, 0.7 + Math.sin(t * 13) * 0.16);
    aR.sh.rotation.set(-1.5 - fall * 1.2, 0, -0.7 - Math.sin(t * 13 + 1) * 0.16);
    aL.el.rotation.set(-0.6, 0, 0); aR.el.rotation.set(-0.6, 0, 0);
    lL.hp.rotation.set(-0.35 + Math.sin(t * 11) * 0.3, 0, 0.1);
    lR.hp.rotation.set(0.25 - Math.sin(t * 11) * 0.3, 0, -0.1);
    lL.kn.rotation.set(0.7, 0, 0); lR.kn.rotation.set(0.35, 0, 0);
    nk.rotation.set(0.12, 0, 0);
    return;
  }

  if (o.hand) {                      // reaching out to a mate
    hp.rotation.set(0, 0, 0);
    hp.position.y = 0.62;
    aR.sh.rotation.set(-1.62, 0, -0.12);
    aR.el.rotation.set(-0.12, 0, 0);
    aL.sh.rotation.set(0.2, 0, 0.3); aL.el.rotation.set(-0.5, 0, 0);
    lL.hp.rotation.set(0, 0, 0.05); lR.hp.rotation.set(0, 0, -0.05);
    lL.kn.rotation.set(0.1, 0, 0); lR.kn.rotation.set(0.1, 0, 0);
    nk.rotation.set(0, 0, 0);
    return;
  }

  var run = clamp(sp / K.SPRINT, 0, 1.25);
  this.phase += dt * (2.6 + run * 7.4) * (sp > 0.25 ? 1 : 0);
  k = this.phase;
  var stride = clamp(sp / K.WALK, 0, 1.5);
  var s1 = Math.sin(k) * stride;
  var bob = Math.abs(Math.sin(k)) * 0.05 * stride;

  var sq = this.squash * this.squash;
  hp.position.y = 0.62 + bob - (o.crouch ? 0.26 : 0) - sq * 0.34;
  b.rotation.x = run * 0.18 + (o.carrying ? 0.14 : 0) + sq * 0.3;
  // a walk is a twist, not a slide: the hips lead, the shoulders answer, and
  // the weight rolls onto whichever foot is down
  var tw = Math.sin(k) * stride;
  hp.rotation.set(0, tw * 0.17, Math.cos(k) * stride * 0.05);
  hp.position.x = -Math.cos(k) * stride * 0.035;
  b.rotation.y = -tw * 0.09;

  lL.hp.rotation.set(s1 * 0.86, 0, 0.05);
  lR.hp.rotation.set(-s1 * 0.86, 0, -0.05);
  lL.kn.rotation.set(clamp(-s1 * 0.8 + 0.28 + sq * 1.1, 0, 1.6), 0, 0);
  lR.kn.rotation.set(clamp(s1 * 0.8 + 0.28 + sq * 1.1, 0, 1.6), 0, 0);

  if (o.carrying) {
    aL.sh.rotation.set(-2.6, 0, 0.4); aR.sh.rotation.set(-2.6, 0, -0.4);
    aL.el.rotation.set(-0.3, 0, 0); aR.el.rotation.set(-0.3, 0, 0);
  } else {
    var idle = Math.sin(t * 1.7) * 0.05 * (1 - stride);
    aL.sh.rotation.set(-s1 * 0.6 + idle, 0, 0.16 + (1 - stride) * 0.06);
    aR.sh.rotation.set(s1 * 0.6 + idle, 0, -0.16 - (1 - stride) * 0.06);
    aL.el.rotation.set(-0.28 - Math.max(0, s1) * 0.4, 0, 0);
    aR.el.rotation.set(-0.28 - Math.max(0, -s1) * 0.4, 0, 0);
  }
  // the head holds its own line while the body works underneath it
  nk.rotation.set(-run * 0.1 - b.rotation.x * 0.55 + Math.sin(t * 1.1) * 0.03,
                  -b.rotation.y * 0.6, -hp.rotation.z * 0.5);
  b.rotation.z = o.cold ? Math.sin(t * 19) * 0.02 : 0;
};
