// ============================================================ LANDMARKS
var Camps = { list: [], group: null };

function fireGeo() {
  var rng = makeRng(77);
  var parts = [], i;
  for (i = 0; i < 7; i++) {
    var a = i / 7 * 6.283;
    parts.push({ g: rockGeo(rng, 0.3, 0), c: i % 2 ? 0x7d7972 : 0x67635e, p: [Math.cos(a) * 1.05, 0.06, Math.sin(a) * 1.05], s: [1, 0.75, 1] });
  }
  parts.push({ g: new THREE.CylinderGeometry(0.11, 0.13, 1.5, 5), c: 0x63472c, p: [0, 0.2, 0], r: [0, 0.4, 1.35] });
  parts.push({ g: new THREE.CylinderGeometry(0.1, 0.12, 1.4, 5), c: 0x74553a, p: [0, 0.22, 0], r: [0.5, 1.9, 1.3] });
  parts.push({ g: new THREE.CylinderGeometry(0.1, 0.12, 1.3, 5), c: 0x543a24, p: [0, 0.18, 0], r: [1.2, 0.6, 1.4] });
  return mergeParts(parts);
}
function tentGeo(col) {
  return mergeParts([
    { g: new THREE.ConeGeometry(1.5, 1.9, 4), c: col, p: [0, 0.95, 0], r: [0, Math.PI / 4, 0] },
    { g: new THREE.BoxGeometry(0.09, 0.09, 3.0), c: 0x4a3a28, p: [0, 1.86, 0] },
    { g: new THREE.ConeGeometry(0.55, 1.0, 3), c: 0x24282e, p: [0, 0.5, 1.0], r: [0, Math.PI / 4, 0] },
  ]);
}
function crateGeo() {
  return mergeParts([
    { g: new THREE.BoxGeometry(0.9, 0.8, 0.9), c: 0x8a6136 },
    { g: new THREE.BoxGeometry(0.94, 0.1, 0.94), c: 0x6d4a28, p: [0, 0.28, 0] },
    { g: new THREE.BoxGeometry(0.94, 0.1, 0.94), c: 0x6d4a28, p: [0, -0.28, 0] },
  ]);
}
function cairnGeo(rng, n, scale) {
  var parts = [], y = 0;
  for (var i = 0; i < n; i++) {
    var r = scale * (0.55 - i * 0.055);
    parts.push({ g: rockGeo(rng, r, 0), c: i % 2 ? 0x8d8891 : 0x6f6a72, p: [rngRange(rng, -0.06, 0.06), y + r * 0.5, rngRange(rng, -0.06, 0.06)], s: [1, 0.7, 1] });
    y += r * 0.8;
  }
  return mergeParts(parts);
}

Camps.build = function () {
  var g = Camps.group = new THREE.Group();
  var fg = fireGeo(), tg = tentGeo(0xd8763a), tg2 = tentGeo(0x3a8fa8), cg = crateGeo();
  var rng = makeRng(4242);
  Camps.list = [];

  for (var i = 0; i < T.camps.length; i++) {
    var c = T.camps[i];
    var node = new THREE.Group();
    node.position.set(c.x, T.hAt(c.x, c.z), c.z);

    var fire = new THREE.Mesh(fg, MAT.solid);
    fire.castShadow = true;
    node.add(fire);

    var f1 = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.5, 6), MAT.flame2);
    f1.position.y = 0.82;
    var f2 = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.95, 5), MAT.flame);
    f2.position.y = 0.62;
    node.add(f1, f2);

    var light = new THREE.PointLight(0xff9a3c, 0, 26, 2);
    light.position.y = 1.3;
    node.add(light);

    // a marker pole so the camp reads from a long way off
    var pole = mergeParts([
      { g: new THREE.CylinderGeometry(0.07, 0.09, 4.4, 5), c: 0x5a4630, p: [0, 2.2, 0] },
      { g: new THREE.BoxGeometry(1.5, 0.9, 0.06), c: i === 0 ? 0xff8a3d : 0xffd646, p: [0.78, 3.85, 0] },
    ]);
    var pm = new THREE.Mesh(pole, MAT.solid);
    pm.position.set(2.3, 0, -1.4);
    pm.castShadow = true;
    node.add(pm);

    if (i === 0) {
      var t1 = new THREE.Mesh(tg, MAT.solid); t1.position.set(-4.2, 0, 2.6); t1.rotation.y = 0.5; t1.castShadow = true;
      var t2 = new THREE.Mesh(tg2, MAT.solid); t2.position.set(4.6, 0, 3.4); t2.rotation.y = -0.8; t2.castShadow = true;
      var c1 = new THREE.Mesh(cg, MAT.solid); c1.position.set(-2.6, 0.4, -3.2); c1.rotation.y = 0.3; c1.castShadow = true;
      var c2 = new THREE.Mesh(cg, MAT.solid); c2.position.set(-1.7, 0.4, -4.0); c2.rotation.y = -0.6; c2.castShadow = true;
      var c3 = new THREE.Mesh(cg, MAT.solid); c3.position.set(-2.2, 1.2, -3.5); c3.rotation.y = 0.9; c3.castShadow = true;
      node.add(t1, t2, c1, c2, c3);
      // ground the tents on the actual shelf
      [t1, t2, c1, c2, c3].forEach(function (o) {
        o.position.y += T.hAt(c.x + o.position.x, c.z + o.position.z) - node.position.y;
      });
    }
    g.add(node);
    Camps.list.push({ x: c.x, y: node.position.y, z: c.z, idx: i, lit: i === 0, node: node, f1: f1, f2: f2, light: light });
  }

  // small trail cairns: a quiet hint at the line without a minimap
  var cg2 = cairnGeo(rng, 4, 0.85);
  var cairns = [];
  for (i = 1; i < T.route.length - 1; i++) {
    var p = T.route[i];
    for (var k = 0; k < 2; k++) {
      var a = rng() * 6.283, d = rngRange(rng, 3, 11);
      var x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d;
      var y = T.hAt(x, z);
      if (y > T.VOID && T.normSmooth(x, z).y > 0.83) cairns.push({ x: x, y: y, z: z, ry: rng() * 6.28, s: rngRange(rng, 0.8, 1.2) });
    }
  }
  g.add(scatter(cg2, MAT.solid, cairns, null));

  Camps.setLit(0, true);
  return g;
};

Camps.setLit = function (i, lit) {
  var c = Camps.list[i];
  if (!c) return;
  c.lit = lit;
  c.f1.visible = lit; c.f2.visible = lit;
  c.light.intensity = lit ? 2.4 : 0;
};

Camps.tick = function (dt, t) {
  for (var i = 0; i < Camps.list.length; i++) {
    var c = Camps.list[i];
    if (!c.lit) continue;
    var f = 0.82 + Math.sin(t * 11 + i) * 0.1 + Math.sin(t * 6.3 + i * 2) * 0.09;
    c.f1.scale.set(f, f * 1.15, f);
    c.f2.scale.set(f * 1.1, f * 0.9, f * 1.1);
    c.f1.rotation.y += dt * 2.2;
    c.light.intensity = 2.1 + f * 0.8;
  }
};

Camps.nearest = function (x, y, z, rad) {
  var best = null, bd = rad * rad;
  for (var i = 0; i < Camps.list.length; i++) {
    var c = Camps.list[i], dx = c.x - x, dy = c.y - y, dz = c.z - z;
    var d = dx * dx + dy * dy + dz * dz;
    if (d < bd) { bd = d; best = c; }
  }
  return best;
};

// ---- the summit -------------------------------------------------------
var Summit = { pos: null, group: null, flag: null, light: null };
Summit.build = function () {
  var g = Summit.group = new THREE.Group();
  var rng = makeRng(9091);
  var y = T.hAt(0, 0);
  Summit.pos = new THREE.Vector3(0, y, 0);
  g.position.set(0, y, 0);

  var cairn = new THREE.Mesh(cairnGeo(rng, 7, 1.5), MAT.solid);
  cairn.castShadow = true; cairn.receiveShadow = true;
  g.add(cairn);

  var pole = new THREE.Mesh(mergeParts([
    { g: new THREE.CylinderGeometry(0.09, 0.12, 7.5, 6), c: 0x9aa2ab, p: [0, 3.75, 0] },
  ]), MAT.solid);
  pole.position.y = 3.0;
  pole.castShadow = true;
  g.add(pole);

  var flag = new THREE.Mesh(mergeParts([
    { g: new THREE.PlaneGeometry(2.6, 1.6), c: 0xff8a3d, p: [1.3, 0, 0] },
  ]), MAT.solidS);
  flag.position.set(0, 9.4, 0);
  Summit.flag = flag;
  g.add(flag);

  var brazier = new THREE.Mesh(mergeParts([
    { g: new THREE.CylinderGeometry(0.7, 0.45, 0.7, 7), c: 0x4a444e, p: [0, 0.35, 0] },
    { g: new THREE.CylinderGeometry(0.62, 0.62, 0.2, 7), c: 0xff5a1e, p: [0, 0.72, 0] },
  ]), MAT.solid);
  brazier.position.set(2.6, 0, 1.8);
  brazier.position.y = T.hAt(2.6, 1.8) - y;
  g.add(brazier);

  var l = new THREE.PointLight(0xff7a2a, 3.2, 40, 2);
  l.position.set(2.6, brazier.position.y + 1.4, 1.8);
  Summit.light = l;
  g.add(l);
  return g;
};
Summit.tick = function (dt, t) {
  if (Summit.flag) {
    Summit.flag.rotation.y = Math.sin(t * 0.7) * 0.5 + 1.2;
    Summit.flag.scale.x = 1 + Math.sin(t * 3.1) * 0.06;
  }
  if (Summit.light) Summit.light.intensity = 2.9 + Math.sin(t * 9) * 0.5;
};
