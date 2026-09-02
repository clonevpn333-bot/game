// ============================================================ CLIMBERS
// Stubby, faceless, big mittens.  Everything is posed by hand each frame -
// no skinning, no animation clips, just joints and sine waves.
function Figure(slot) {
  var gear = SLOT_COL[slot % SLOT_COL.length];
  var dark = shadeHex(gear, 0.62), pants = 0x39404a, boot = 0x24282e, skin = 0xe8c49c;
  this.slot = slot;
  var G = THREE.Group;

  this.root = new G();
  this.body = new G(); this.root.add(this.body);
  this.hips = new G(); this.hips.position.y = 0.66; this.body.add(this.hips);

  var torso = new THREE.Mesh(mergeParts([
    { g: new THREE.BoxGeometry(0.6, 0.66, 0.42), c: gear, p: [0, 0.33, 0] },
    { g: new THREE.BoxGeometry(0.62, 0.16, 0.44), c: dark, p: [0, 0.1, 0] },
    { g: new THREE.BoxGeometry(0.44, 0.42, 0.24), c: shadeHex(gear, 0.45), p: [0, 0.38, -0.31] },
    { g: new THREE.BoxGeometry(0.3, 0.1, 0.1), c: 0xd9b06a, p: [0, 0.5, -0.44] },
  ]), MAT.solid);
  torso.castShadow = true;
  this.hips.add(torso);

  this.neck = new G(); this.neck.position.y = 0.68; this.hips.add(this.neck);
  var head = new THREE.Mesh(mergeParts([
    { g: new THREE.BoxGeometry(0.4, 0.36, 0.36), c: skin, p: [0, 0.18, 0] },
    { g: new THREE.BoxGeometry(0.44, 0.2, 0.4), c: gear, p: [0, 0.34, 0] },
    { g: new THREE.BoxGeometry(0.46, 0.08, 0.42), c: dark, p: [0, 0.22, 0] },
    { g: new THREE.SphereGeometry(0.07, 5, 4), c: gear, p: [0, 0.47, 0] },
    { g: new THREE.BoxGeometry(0.42, 0.14, 0.38), c: 0xb04a2e, p: [0, 0.03, 0] },
  ]), MAT.solid);
  head.castShadow = true;
  this.neck.add(head);
  this.headY = 1.55;

  function arm(side) {
    var sh = new G();
    sh.position.set(side * 0.36, 0.55, 0);
    var up = new THREE.Mesh(mergeParts([
      { g: new THREE.BoxGeometry(0.19, 0.34, 0.19), c: gear, p: [0, -0.17, 0] },
    ]), MAT.solid);
    up.castShadow = true;
    sh.add(up);
    var el = new G(); el.position.y = -0.34; sh.add(el);
    var fo = new THREE.Mesh(mergeParts([
      { g: new THREE.BoxGeometry(0.17, 0.3, 0.17), c: dark, p: [0, -0.15, 0] },
      { g: new THREE.IcosahedronGeometry(0.17, 0), c: gear, p: [0, -0.36, 0.01] },
    ]), MAT.solid);
    fo.castShadow = true;
    el.add(fo);
    return { sh: sh, el: el };
  }
  this.aL = arm(1); this.aR = arm(-1);
  this.hips.add(this.aL.sh, this.aR.sh);

  function leg(side) {
    var hp = new G();
    hp.position.set(side * 0.16, 0.02, 0);
    var th = new THREE.Mesh(mergeParts([
      { g: new THREE.BoxGeometry(0.22, 0.36, 0.22), c: pants, p: [0, -0.18, 0] },
    ]), MAT.solid);
    th.castShadow = true;
    hp.add(th);
    var kn = new G(); kn.position.y = -0.36; hp.add(kn);
    var sh2 = new THREE.Mesh(mergeParts([
      { g: new THREE.BoxGeometry(0.2, 0.3, 0.2), c: shadeHex(pants, 0.85), p: [0, -0.15, 0] },
      { g: new THREE.BoxGeometry(0.24, 0.14, 0.32), c: boot, p: [0, -0.34, 0.04] },
    ]), MAT.solid);
    sh2.castShadow = true;
    kn.add(sh2);
    return { hp: hp, kn: kn };
  }
  this.lL = leg(1); this.lR = leg(-1);
  this.hips.add(this.lL.hp, this.lR.hp);

  this.torchLight = null;
  this.held = null;
  this.phase = 0;
}

Figure.prototype.setHeld = function (kind) {
  if (this.heldKind === kind) return;
  this.heldKind = kind;
  if (this.held) { this.aR.el.remove(this.held); this.held = null; }
  if (this.torchLight) { this.root.remove(this.torchLight); this.torchLight = null; }
  if (!kind) return;
  var m = new THREE.Mesh(WI.geos[kind], MAT.solid);
  m.position.set(0, -0.44, 0.12);
  m.scale.setScalar(0.9);
  this.aR.el.add(m);
  this.held = m;
  if (kind === 'torch') {
    this.torchLight = new THREE.PointLight(0xff9a4a, 1.7, 15, 2);
    this.torchLight.position.set(0, 1.1, 0.4);
    this.root.add(this.torchLight);
  }
};

Figure.prototype.setParka = function (on) {
  if (this.parkaOn === on) return;
  this.parkaOn = on;
  if (!this.parka) {
    this.parka = new THREE.Mesh(mergeParts([
      { g: new THREE.BoxGeometry(0.7, 0.72, 0.52), c: 0x3f7fd0, p: [0, 0.34, 0] },
      { g: new THREE.BoxGeometry(0.74, 0.14, 0.56), c: 0xf0f0e4, p: [0, 0.66, 0] },
    ]), MAT.solid);
    this.parka.castShadow = true;
  }
  if (on) this.hips.add(this.parka); else this.hips.remove(this.parka);
};

// state: 0 ground 1 air 2 climb 3 down 4 carried; extra flags in o
Figure.prototype.pose = function (dt, o) {
  var t = o.t, sp = o.speed || 0, s = o.state;
  var aL = this.aL, aR = this.aR, lL = this.lL, lR = this.lR;
  var b = this.body, hp = this.hips, nk = this.neck;
  var k;

  if (s === ST.DOWN) {
    b.rotation.set(-Math.PI / 2 + 0.12, 0, 0);
    b.position.set(0, 0.28, 0);
    hp.rotation.set(0, 0, 0);
    aL.sh.rotation.set(0.2, 0, 1.5); aR.sh.rotation.set(0.2, 0, -1.5);
    aL.el.rotation.set(-0.5, 0, 0); aR.el.rotation.set(-0.5, 0, 0);
    lL.hp.rotation.set(0.35, 0, 0.1); lR.hp.rotation.set(0.15, 0, -0.1);
    lL.kn.rotation.set(-0.4, 0, 0); lR.kn.rotation.set(-0.2, 0, 0);
    nk.rotation.set(0.5 + Math.sin(t * 1.3) * 0.06, 0, 0);
    return;
  }

  b.position.set(0, o.crouch ? -0.3 : 0, 0);
  b.rotation.set(0, 0, 0);

  if (s === ST.CLIMB) {
    this.phase += dt * (o.climbing ? 3.1 : 0.5);
    k = this.phase;
    var sw = Math.sin(k), cw = Math.cos(k * 1.0);
    b.rotation.x = -0.16;
    hp.rotation.set(0.1, 0, 0);
    // reach: one mitten high, the other low, legs mirrored
    aL.sh.rotation.set(-2.5 - sw * 0.55, 0, 0.18);
    aR.sh.rotation.set(-2.5 + sw * 0.55, 0, -0.18);
    aL.el.rotation.set(-0.28 + sw * 0.2, 0, 0);
    aR.el.rotation.set(-0.28 - sw * 0.2, 0, 0);
    lL.hp.rotation.set(-0.55 + cw * 0.4, 0, 0.16);
    lR.hp.rotation.set(-0.55 - cw * 0.4, 0, -0.16);
    lL.kn.rotation.set(0.75 - cw * 0.3, 0, 0);
    lR.kn.rotation.set(0.75 + cw * 0.3, 0, 0);
    nk.rotation.set(-0.32, 0, 0);
    if (o.tired) { aL.sh.rotation.x += Math.sin(t * 22) * 0.05; aR.sh.rotation.x += Math.sin(t * 22 + 1) * 0.05; }
    return;
  }

  if (s === ST.AIR) {
    var fall = clamp(-(o.vy || 0) / 14, 0, 1);
    b.rotation.x = 0.1 - fall * 0.28;
    aL.sh.rotation.set(-1.5 - fall * 1.2, 0, 0.7 + Math.sin(t * 13) * 0.16);
    aR.sh.rotation.set(-1.5 - fall * 1.2, 0, -0.7 - Math.sin(t * 13 + 1) * 0.16);
    aL.el.rotation.set(-0.6, 0, 0); aR.el.rotation.set(-0.6, 0, 0);
    lL.hp.rotation.set(-0.35 + Math.sin(t * 11) * 0.3, 0, 0.1);
    lR.hp.rotation.set(0.25 - Math.sin(t * 11) * 0.3, 0, -0.1);
    lL.kn.rotation.set(0.7, 0, 0); lR.kn.rotation.set(0.35, 0, 0);
    nk.rotation.set(0.12, 0, 0);
    return;
  }

  // on foot
  if (o.brace) {
    b.position.y = -0.42;
    hp.rotation.set(0.22, 0, 0);
    aL.sh.rotation.set(-2.75, 0, 0.32); aR.sh.rotation.set(-2.75, 0, -0.32);
    aL.el.rotation.set(-0.15, 0, 0); aR.el.rotation.set(-0.15, 0, 0);
    lL.hp.rotation.set(-1.15, 0, 0.22); lR.hp.rotation.set(-1.15, 0, -0.22);
    lL.kn.rotation.set(1.6, 0, 0); lR.kn.rotation.set(1.6, 0, 0);
    nk.rotation.set(-0.2, 0, 0);
    return;
  }

  var run = clamp(sp / K.SPRINT, 0, 1.25);
  this.phase += dt * (2.6 + run * 7.4) * (sp > 0.25 ? 1 : 0);
  k = this.phase;
  var stride = clamp(sp / K.WALK, 0, 1.5);
  var s1 = Math.sin(k) * stride, c1 = Math.cos(k) * stride;
  var bob = Math.abs(Math.sin(k)) * 0.055 * stride;

  b.position.y += bob + (o.crouch ? 0 : 0);
  b.rotation.x = run * 0.2 + (o.carrying ? 0.14 : 0);
  hp.rotation.set(0, 0, 0);
  hp.position.y = 0.66;

  lL.hp.rotation.set(s1 * 0.85, 0, 0.05);
  lR.hp.rotation.set(-s1 * 0.85, 0, -0.05);
  lL.kn.rotation.set(clamp(-s1 * 0.7 + 0.35, 0, 1.5), 0, 0);
  lR.kn.rotation.set(clamp(s1 * 0.7 + 0.35, 0, 1.5), 0, 0);

  if (o.carrying) {
    aL.sh.rotation.set(-2.6, 0, 0.4); aR.sh.rotation.set(-2.6, 0, -0.4);
    aL.el.rotation.set(-0.3, 0, 0); aR.el.rotation.set(-0.3, 0, 0);
  } else {
    var idle = Math.sin(t * 1.7) * 0.05 * (1 - stride);
    aL.sh.rotation.set(-s1 * 0.62 + idle, 0, 0.14 + (1 - stride) * 0.06);
    aR.sh.rotation.set(s1 * 0.62 + idle, 0, -0.14 - (1 - stride) * 0.06);
    aL.el.rotation.set(-0.3 - Math.max(0, s1) * 0.4, 0, 0);
    aR.el.rotation.set(-0.3 - Math.max(0, -s1) * 0.4, 0, 0);
  }
  nk.rotation.set(-run * 0.12 + Math.sin(t * 1.1) * 0.03, 0, 0);
  if (o.cold) { b.rotation.z = Math.sin(t * 19) * 0.018; nk.rotation.x -= 0.12; }
  else b.rotation.z = 0;
};
