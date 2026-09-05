// ============================================================ SCOUTS
// Big round head, two flat shapes for a face, oversized mittens so you can
// always see the grip, a scarf in the slot colour.  Everything is posed by
// hand each frame - no skinning, no clips.
var SKIN = [0xf0c9a0, 0xd9a173, 0xb07a4e, 0x8a5a38];

function Figure(slot, tone) {
  var gear = SLOT_COL[slot % SLOT_COL.length];
  var dark = shadeHex(gear, 0.6), mid = shadeHex(gear, 0.8);
  var pants = 0x3c4350, boot = 0x24282e, strap = 0x4a3f36, metal = 0xb8bec6;
  var skin = SKIN[(tone === undefined ? slot : tone) % SKIN.length];
  this.slot = slot;
  var G = THREE.Group;

  this.root = new G();
  this.body = new G(); this.root.add(this.body);
  this.hips = new G(); this.hips.position.y = 0.62; this.body.add(this.hips);

  // ---- torso: a jacket with a collar, a zip, a belt and a pack on the back,
  // rather than one box.  Layers are what read as "made" at any distance.
  var torso = new THREE.Mesh(mergeParts([
    { g: roundBox(0.58, 0.46, 0.40, 0.09, 3), c: gear, p: [0, 0.38, 0] },       // chest
    { g: roundBox(0.52, 0.22, 0.36, 0.08, 3), c: mid, p: [0, 0.15, 0] },        // waist
    { g: roundBox(0.545, 0.10, 0.385, 0.04, 2), c: 0x2e2b2e, p: [0, 0.09, 0] }, // belt
    { g: roundBox(0.05, 0.44, 0.03, 0.02, 1), c: dark, p: [0, 0.38, 0.196] },   // zip
    { g: new THREE.TorusGeometry(0.155, 0.062, 6, 12), c: dark, p: [0, 0.60, 0.01], r: [1.57, 0, 0] }, // collar
    { g: roundBox(0.20, 0.12, 0.30, 0.05, 2), c: mid, p: [0.24, 0.55, 0] },     // shoulder pads
    { g: roundBox(0.20, 0.12, 0.30, 0.05, 2), c: mid, p: [-0.24, 0.55, 0] },
    // the pack
    { g: roundBox(0.40, 0.44, 0.24, 0.08, 3), c: strap, p: [0, 0.38, -0.30] },
    { g: roundBox(0.34, 0.14, 0.20, 0.05, 2), c: shadeHex(strap, 1.25), p: [0, 0.17, -0.31] },
    { g: roundBox(0.09, 0.46, 0.05, 0.02, 1), c: shadeHex(strap, 0.8), p: [0.19, 0.42, 0.04], r: [0.16, 0, 0] },
    { g: roundBox(0.09, 0.46, 0.05, 0.02, 1), c: shadeHex(strap, 0.8), p: [-0.19, 0.42, 0.04], r: [0.16, 0, 0] },
    { g: new THREE.CylinderGeometry(0.035, 0.035, 0.16, 6), c: metal, p: [0.13, 0.20, -0.42], r: [0.4, 0, 0] },
  ]), MAT.solid);
  torso.castShadow = true;
  this.hips.add(torso);

  this.neck = new G(); this.neck.position.y = 0.64; this.hips.add(this.neck);
  // ---- head: a real round skull under a beanie with a brim and a bobble
  var head = new THREE.Mesh(mergeParts([
    { g: new THREE.IcosahedronGeometry(0.335, 2), c: skin, p: [0, 0.31, 0], s: [1, 1.04, 0.97] },
    { g: new THREE.IcosahedronGeometry(0.09, 1), c: skin, p: [0.30, 0.29, 0], s: [0.6, 1, 0.9] },  // ears
    { g: new THREE.IcosahedronGeometry(0.09, 1), c: skin, p: [-0.30, 0.29, 0], s: [0.6, 1, 0.9] },
    { g: new THREE.SphereGeometry(0.345, 14, 8, 0, 6.283, 0, 1.25), c: gear, p: [0, 0.33, 0] },    // beanie
    { g: new THREE.TorusGeometry(0.328, 0.052, 7, 18), c: dark, p: [0, 0.445, 0], r: [1.57, 0, 0] }, // brim
    { g: new THREE.IcosahedronGeometry(0.085, 1), c: dark, p: [0, 0.66, 0] },                      // bobble
  ]), MAT.solid);
  head.castShadow = true;
  // a face of a few flat shapes: eyes, brows, a mouth
  var eyes = new THREE.Mesh(mergeParts([
    { g: new THREE.CircleGeometry(0.055, 10), c: 0x231f26, p: [0.113, 0.305, 0.312] },
    { g: new THREE.CircleGeometry(0.055, 10), c: 0x231f26, p: [-0.113, 0.305, 0.312] },
    { g: new THREE.CircleGeometry(0.020, 6), c: 0xffffff, p: [0.130, 0.322, 0.318] },
    { g: new THREE.CircleGeometry(0.020, 6), c: 0xffffff, p: [-0.096, 0.322, 0.318] },
    { g: new THREE.PlaneGeometry(0.115, 0.026), c: 0x231f26, p: [0.115, 0.385, 0.303], r: [0, 0, -0.17] },
    { g: new THREE.PlaneGeometry(0.115, 0.026), c: 0x231f26, p: [-0.115, 0.385, 0.303], r: [0, 0, 0.17] },
    { g: new THREE.CircleGeometry(0.034, 8), c: 0x231f26, p: [0, 0.195, 0.318], s: [1.5, 0.62, 1] },
    { g: new THREE.CircleGeometry(0.048, 8), c: 0xe08a7a, p: [0.195, 0.238, 0.292], s: [1.1, 0.7, 1] },
    { g: new THREE.CircleGeometry(0.048, 8), c: 0xe08a7a, p: [-0.195, 0.238, 0.292], s: [1.1, 0.7, 1] },
  ]), MAT.solidS);
  this.neck.add(head, eyes);
  this.eyes = eyes;
  this.headY = 1.6;

  var UP = 0.32, LO = 0.3;
  this.L1 = UP; this.L2 = LO + 0.1;
  // ---- arms: a shoulder ball, an elbow ball, and a mitten with a thumb, so
  // nothing pulls apart at the joints when the springs swing them
  function arm(side) {
    var sh = new G();
    sh.position.set(side * 0.34, 0.52, 0);
    var up = new THREE.Mesh(mergeParts([
      { g: new THREE.IcosahedronGeometry(0.125, 1), c: mid, p: [0, 0, 0] },
      { g: roundBox(0.165, UP, 0.165, 0.06, 2), c: gear, p: [0, -UP / 2, 0] },
    ]), MAT.solid);
    up.castShadow = true;
    sh.add(up);
    var el = new G(); el.position.y = -UP; sh.add(el);
    var fo = new THREE.Mesh(mergeParts([
      { g: new THREE.IcosahedronGeometry(0.10, 1), c: dark, p: [0, 0, 0] },
      { g: roundBox(0.145, LO, 0.145, 0.05, 2), c: dark, p: [0, -LO / 2, 0] },
      { g: roundBox(0.10, 0.07, 0.16, 0.03, 1), c: shadeHex(gear, 1.2), p: [0, -LO + 0.05, 0] },
      { g: new THREE.IcosahedronGeometry(0.132, 1), c: gear, p: [0, -LO - 0.09, 0.01], s: [1, 1.18, 1.06] },
      { g: new THREE.IcosahedronGeometry(0.053, 1), c: gear, p: [side * 0.095, -LO - 0.06, 0.05] },
    ]), MAT.solid);
    fo.castShadow = true;
    el.add(fo);
    return { sh: sh, el: el };
  }
  this.aL = arm(1); this.aR = arm(-1);
  this.hips.add(this.aL.sh, this.aR.sh);

  // ---- legs: hip ball, knee ball, and a boot with a sole and a toe
  function leg(side) {
    var hp = new G();
    hp.position.set(side * 0.15, 0.02, 0);
    var th = new THREE.Mesh(mergeParts([
      { g: new THREE.IcosahedronGeometry(0.135, 1), c: pants, p: [0, 0, 0] },
      { g: roundBox(0.215, 0.32, 0.215, 0.07, 2), c: pants, p: [0, -0.16, 0] },
    ]), MAT.solid);
    th.castShadow = true;
    hp.add(th);
    var kn = new G(); kn.position.y = -0.32; hp.add(kn);
    var sh2 = new THREE.Mesh(mergeParts([
      { g: new THREE.IcosahedronGeometry(0.115, 1), c: shadeHex(pants, 0.85), p: [0, 0, 0] },
      { g: roundBox(0.19, 0.28, 0.19, 0.06, 2), c: shadeHex(pants, 0.85), p: [0, -0.14, 0] },
      { g: roundBox(0.225, 0.14, 0.30, 0.05, 2), c: boot, p: [0, -0.31, 0.045] },
      { g: roundBox(0.235, 0.05, 0.32, 0.02, 1), c: 0x15181c, p: [0, -0.375, 0.05] },
      { g: roundBox(0.20, 0.09, 0.09, 0.03, 1), c: shadeHex(boot, 1.5), p: [0, -0.30, 0.19] },
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
  this.rag = new Ragdoll();
}

// Go limp from wherever the body is, carrying the fall into the tumble.
Figure.prototype.limp = function (x, y, z, vx, vy, vz, yaw) {
  this.rag.start(x, y, z, vx || 0, vy || 0, vz || 0, yaw || 0);
};
Figure.prototype.standUp = function () {
  this.rag.on = false;
  this.root.rotation.set(0, 0, 0);
  this.hips.position.set(0, 0.62, 0);
  for (var i = 0; i < this.joints.length; i++) this.joints[i].init = false;
};

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

// ============================================================ RAGDOLL
// A verlet ragdoll: eleven points, sticks between them, gravity, and the
// ground.  Landfall's characters are physical all the time; ours are posed
// by hand while you are conscious and go limp the moment you are not, which
// is where a ragdoll actually earns its keep - the scout crumples over the
// rock they fell on instead of lying in a T-pose.
var _rdDown = new THREE.Vector3(0, -1, 0);
var _rdA = new THREE.Vector3(), _rdB = new THREE.Vector3(), _rdQ = new THREE.Quaternion();
var _rdP = new THREE.Quaternion();

function aimBone(obj, dx, dy, dz) {
  var l = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (l < 1e-5) return;
  _rdA.set(dx / l, dy / l, dz / l);
  obj.parent.getWorldQuaternion(_rdP);
  _rdQ.setFromUnitVectors(_rdDown, _rdA);
  obj.quaternion.copy(_rdP.invert()).multiply(_rdQ);
}

function Ragdoll() {
  this.p = [];
  for (var i = 0; i < 11; i++) this.p.push({ x: 0, y: 0, z: 0, px: 0, py: 0, pz: 0, r: 0.14 });
  // head chest hips  elL hdL  elR hdR  knL ftL  knR ftR
  this.st = [
    [0, 1, 0.34], [1, 2, 0.52], [0, 2, 0.84],
    [1, 3, 0.40], [3, 4, 0.40], [1, 5, 0.40], [5, 6, 0.40],
    [2, 7, 0.36], [7, 8, 0.38], [2, 9, 0.36], [9, 10, 0.38],
    [3, 5, 0.62], [7, 9, 0.32], [4, 6, 0.9], [8, 10, 0.5],
  ];
  this.on = false;
}

Ragdoll.prototype.start = function (x, y, z, vx, vy, vz, yaw) {
  var sy = Math.sin(yaw), cy = Math.cos(yaw);
  // roughly where the bones are when they go limp
  var lay = [
    [0, 1.62, 0], [0, 1.28, 0], [0, 0.78, 0],
    [0.36, 1.18, 0], [0.42, 0.82, 0], [-0.36, 1.18, 0], [-0.42, 0.82, 0],
    [0.16, 0.44, 0], [0.16, 0.06, 0], [-0.16, 0.44, 0], [-0.16, 0.06, 0],
  ];
  for (var i = 0; i < 11; i++) {
    var lx = lay[i][0], ly = lay[i][1], lz = lay[i][2];
    var wx = x + lx * cy + lz * sy, wz = z - lx * sy + lz * cy;
    var q = this.p[i];
    q.x = wx; q.y = y + ly; q.z = wz;
    // seed the velocity from the fall, with a little scatter so the limbs
    // do not all travel as one board
    var j = (i * 2654435761 % 1000) / 1000 - 0.5;
    q.px = wx - (vx + j * 1.4) * 0.016;
    q.py = q.y - (vy * 0.55 + j * 0.8) * 0.016;
    q.pz = wz - (vz + j * 1.4) * 0.016;
  }
  this.on = true;
};

Ragdoll.prototype.step = function (dt) {
  var h = Math.min(dt, 1 / 50), i, k, s, a, b;
  for (i = 0; i < 11; i++) {
    var q = this.p[i];
    var nx = q.x + (q.x - q.px) * 0.985, ny = q.y + (q.y - q.py) * 0.985 - K.GRAV * h * h;
    var nz = q.z + (q.z - q.pz) * 0.985;
    q.px = q.x; q.py = q.y; q.pz = q.z;
    q.x = nx; q.y = ny; q.z = nz;
  }
  for (k = 0; k < 6; k++) {
    for (i = 0; i < this.st.length; i++) {
      s = this.st[i]; a = this.p[s[0]]; b = this.p[s[1]];
      var dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
      var d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-5;
      // the long braces only stop the body folding through itself
      var want = s[2], f;
      if (i >= 11) { if (d >= want) continue; f = (want - d) / d * 0.25; }
      else f = (want - d) / d * 0.5;
      dx *= f; dy *= f; dz *= f;
      a.x -= dx; a.y -= dy; a.z -= dz;
      b.x += dx; b.y += dy; b.z += dz;
    }
    for (i = 0; i < 11; i++) {
      var c = this.p[i], g = groundH(c.x, c.z);
      if (g > T.VOID && c.y < g + c.r) {
        c.y = g + c.r;
        // friction against the rock, or a body slides forever
        c.px += (c.x - c.px) * 0.42;
        c.pz += (c.z - c.pz) * 0.42;
      }
    }
  }
};

// Drive the visible scout from the points.  Each limb aims down its own bone,
// so the model keeps its silhouette instead of being replaced by capsules.
Ragdoll.prototype.apply = function (f) {
  var p = this.p;
  f.root.position.set(p[2].x, p[2].y - 0.62, p[2].z);
  f.root.rotation.set(0, 0, 0);
  f.body.position.set(0, 0, 0);
  f.body.rotation.set(0, 0, 0);
  f.hips.position.set(0, 0.62, 0);
  f.root.updateMatrixWorld(true);
  // spine: hips up to chest, then chest up to head
  aimBone(f.hips, p[2].x - p[1].x, p[2].y - p[1].y, p[2].z - p[1].z);
  f.root.updateMatrixWorld(true);
  aimBone(f.neck, p[1].x - p[0].x, p[1].y - p[0].y, p[1].z - p[0].z);
  var pairs = [
    [f.aL.sh, 1, 3], [f.aL.el, 3, 4], [f.aR.sh, 1, 5], [f.aR.el, 5, 6],
    [f.lL.hp, 2, 7], [f.lL.kn, 7, 8], [f.lR.hp, 2, 9], [f.lR.kn, 9, 10],
  ];
  for (var i = 0; i < pairs.length; i++) {
    f.root.updateMatrixWorld(true);
    var q = pairs[i], u = p[q[1]], v = p[q[2]];
    aimBone(q[0], v.x - u.x, v.y - u.y, v.z - u.z);
  }
};

// state: ST.*; o carries the extras
Figure.prototype.pose = function (dt, o) {
  var t = o.t, sp = o.speed || 0, s = o.state;
  this.squash = Math.max(0, this.squash - dt * 3.4);
  if (this.rag && this.rag.on) {
    this.rag.step(dt);
    this.rag.apply(this);
    this.poseScarf(dt, o);
    return;
  }
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
