// ============================================================ LANDMARKS
var Camps = { list: [], group: null };

function fireGeo() {
  var rng = makeRng(77), parts = [], i;
  for (i = 0; i < 7; i++) {
    var a = i / 7 * 6.283;
    parts.push({ g: rockGeo(rng, 0.3, 0), c: i % 2 ? 0x7d7972 : 0x67635e, p: [Math.cos(a) * 1.05, 0.06, Math.sin(a) * 1.05], s: [1, 0.75, 1] });
  }
  parts.push({ g: new THREE.CylinderGeometry(0.11, 0.13, 1.5, 5), c: 0x63472c, p: [0, 0.2, 0], r: [0, 0.4, 1.35] });
  parts.push({ g: new THREE.CylinderGeometry(0.1, 0.12, 1.4, 5), c: 0x74553a, p: [0, 0.22, 0], r: [0.5, 1.9, 1.3] });
  parts.push({ g: new THREE.CylinderGeometry(0.1, 0.12, 1.3, 5), c: 0x543a24, p: [0, 0.18, 0], r: [1.2, 0.6, 1.4] });
  return mergeParts(parts);
}
function wreckGeo() {
  return mergeParts([
    { g: new THREE.CylinderGeometry(1.5, 1.3, 7.5, 8), c: 0xdfe4ea, p: [0, 1.5, 0], r: [0.1, 0, 1.45] },
    { g: new THREE.CylinderGeometry(1.3, 0.5, 2.4, 8), c: 0xc8ced6, p: [4.4, 1.2, 0.3], r: [0.1, 0, 1.5] },
    { g: new THREE.BoxGeometry(6.5, 0.22, 1.7), c: 0xdfe4ea, p: [-0.6, 1.3, 2.3], r: [0.1, 0.15, -0.12] },
    { g: new THREE.BoxGeometry(4.5, 0.22, 1.5), c: 0xc8ced6, p: [-1.2, 0.9, -2.6], r: [-0.2, -0.2, 0.16] },
    { g: new THREE.BoxGeometry(0.25, 2.2, 1.6), c: 0xe86a3a, p: [-3.6, 2.4, 0], r: [0, 0, -0.2] },
    { g: new THREE.CylinderGeometry(0.55, 0.55, 0.3, 9), c: 0x3a3f47, p: [1.2, 2.9, 1.2], r: [1.57, 0, 0] },
  ]);
}
function tentGeo(col) {
  return mergeParts([
    { g: new THREE.ConeGeometry(1.5, 1.9, 4), c: col, p: [0, 0.95, 0], r: [0, Math.PI / 4, 0] },
    { g: new THREE.BoxGeometry(0.09, 0.09, 3.0), c: 0x4a3a28, p: [0, 1.86, 0] },
    { g: new THREE.ConeGeometry(0.55, 1.0, 3), c: 0x24282e, p: [0, 0.5, 1.0], r: [0, Math.PI / 4, 0] },
  ]);
}

// A flag is the one thing on the mountain that is always moving, so a flat
// quad reads as dead from any distance.  This is a pinned strip driven by two
// travelling waves, and it costs 48 triangles.
function makeFlag(col) {
  var g = new THREE.PlaneGeometry(1.5, 0.86, 10, 3).toNonIndexed();
  bakeColor(g, col);
  var m = new THREE.Mesh(g, MAT.solidS);
  m.castShadow = true;
  var pa = g.attributes.position;
  m.userData.base = new Float32Array(pa.array);
  m.userData.wave = function (t) {
    var a = pa.array, b = m.userData.base;
    for (var i = 0; i < a.length; i += 3) {
      var u = (b[i] + 0.75) / 1.5;                  // 0 at the mast, 1 at the fly
      var amp = u * u * 0.46;
      a[i + 2] = Math.sin(u * 7.4 - t * 5.2) * amp + Math.sin(u * 3.1 - t * 2.7) * amp * 0.5;
      a[i + 1] = b[i + 1] + Math.sin(u * 4.2 - t * 4.1) * amp * 0.24;
      a[i] = b[i] - u * amp * amp * 0.5;            // the cloth shortens as it curls
    }
    pa.needsUpdate = true;
    g.computeVertexNormals();
  };
  return m;
}

Camps.build = function () {
  var g = Camps.group = new THREE.Group();
  var fg = fireGeo(), wg = wreckGeo(), tg = tentGeo(0xd8763a), tg2 = tentGeo(0x3a8fa8);
  Camps.list = [];

  for (var i = 0; i < T.camps.length; i++) {
    var c = T.camps[i];
    var ground = T.hAt(c.x, c.z);
    var node = new THREE.Group();
    node.position.set(c.x, ground, c.z);

    var fire = new THREE.Mesh(fg, MAT.solid);
    fire.castShadow = true;
    node.add(fire);

    var f1 = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.5, 6), MAT.flame2); f1.position.y = 0.82;
    var f2 = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.95, 5), MAT.flame); f2.position.y = 0.62;
    node.add(f1, f2);

    var light = new THREE.PointLight(0xff9a3c, 0, 30, 2);
    light.position.y = 1.4;
    node.add(light);

    // something tall so the camp reads from a long way down the mountain
    var pole = new THREE.Mesh(mergeParts([
      { g: new THREE.CylinderGeometry(0.07, 0.09, 4.6, 5), c: 0x5a4630, p: [0, 2.3, 0] },
    ]), MAT.solid);
    // cloth, not a signboard: a strip that ripples away from the pole, pinned
    // at the mast edge so the wave grows toward the fly
    var flag = makeFlag(i === 0 ? 0xff8a3d : 0xffd646);
    flag.position.set(0.04, 3.95, 0);
    pole.add(flag);
    // every offset piece resolves its own ground; a marker pole hanging in
    // the air is exactly the sloppiness this is here to stop
    var pgY = T.hAt(c.x + 2.4, c.z - 1.5);
    pole.position.set(2.4, (pgY > T.VOID ? pgY : ground) - ground, -1.5);
    pole.castShadow = true;
    node.add(pole);

    if (i === 0) {
      var w = new THREE.Mesh(wg, MAT.solid);
      w.position.set(-5.5, 0.6, 1.5); w.rotation.y = 0.7; w.castShadow = true;
      var t1 = new THREE.Mesh(tg, MAT.solid); t1.position.set(4.4, 0, 3.0); t1.rotation.y = 0.5; t1.castShadow = true;
      var t2 = new THREE.Mesh(tg2, MAT.solid); t2.position.set(-1.5, 0, 4.6); t2.rotation.y = -0.8; t2.castShadow = true;
      node.add(w, t1, t2);
      [w, t1, t2].forEach(function (o) {
        var gy = T.hAt(c.x + o.position.x, c.z + o.position.z);
        o.position.y += (gy > T.VOID ? gy : ground) - ground;
      });
    }
    g.add(node);
    Camps.list.push({ x: c.x, y: ground, z: c.z, idx: i, lit: i === 0, node: node, f1: f1, f2: f2, light: light, flag: flag });
  }
  Camps.setLit(0, true);
  return g;
};

Camps.setLit = function (i, lit) {
  var c = Camps.list[i];
  if (!c) return;
  c.lit = lit;
  c.f1.visible = lit; c.f2.visible = lit;
  c.light.intensity = lit ? 2.6 : 0;
  if (lit && i > 0) Walls.open(i - 1);
};

Camps.tick = function (dt, t) {
  for (var i = 0; i < Camps.list.length; i++) {
    var c = Camps.list[i];
    if (c.flag) c.flag.userData.wave(t + i * 1.7);
    if (!c.lit) continue;
    var f = 0.82 + Math.sin(t * 11 + i) * 0.1 + Math.sin(t * 6.3 + i * 2) * 0.09;
    c.f1.scale.set(f, f * 1.15, f);
    c.f2.scale.set(f * 1.1, f * 0.9, f * 1.1);
    c.f1.rotation.y += dt * 2.2;
    c.light.intensity = 2.3 + f * 0.9;
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

// ============================================================ FOG WALLS
// One above each zone.  Light that zone's fire and it lifts.
var Walls = { list: [], group: null, mat: null };

function ringRadiusAt(y) {
  var lo = 0, hi = 1;
  for (var k = 0; k < 24; k++) {
    var m = (lo + hi) * 0.5;
    if (profile(m) > y) lo = m; else hi = m;
  }
  return ((lo + hi) * 0.5) * K.BASE_R;
}

// The wall above zone i is opened by the fire at the top of that zone, so it
// has to sit above that fire and below the next one.  Deriving it from where
// the camps actually landed - rather than the nominal zone altitude - is what
// keeps it from cutting through the ground somebody is standing on.
Walls.altitudes = function () {
  var ys = [], i;
  for (i = 0; i < 5; i++) {
    var below = Camps.list[i + 1] ? Camps.list[i + 1].y : ZONES[i].fire;
    var above = Camps.list[i + 2] ? Camps.list[i + 2].y : ZONES[i].top + 40;
    var y = Math.max(ZONES[i].top, below + 8);
    if (y > above - 8) y = (below + above) * 0.5;
    ys.push(y);
  }
  for (i = 1; i < 5; i++) if (ys[i] < ys[i - 1] + 10) ys[i] = ys[i - 1] + 10;
  return ys;
};

// a soft vertical gradient so the barrier reads as weather rather than a tube
function fogTexture() {
  var H = 64, cv = document.createElement('canvas');
  cv.width = 4; cv.height = H;
  var ctx = cv.getContext('2d'), img = ctx.createImageData(4, H);
  for (var j = 0; j < H; j++) {
    var t = j / (H - 1);
    var a = Math.sin(t * Math.PI);
    a = Math.pow(clamp(a, 0, 1), 0.7);
    for (var i = 0; i < 4; i++) {
      var o = (j * 4 + i) * 4;
      img.data[o] = 236; img.data[o + 1] = 240; img.data[o + 2] = 246;
      img.data[o + 3] = (a * 255) | 0;
    }
  }
  ctx.putImageData(img, 0, 0);
  var tex = new THREE.CanvasTexture(cv);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

Walls.build = function () {
  var g = Walls.group = new THREE.Group();
  Walls.list = [];
  Walls.tex = fogTexture();
  var ys = Walls.altitudes();
  for (var i = 0; i < 5; i++) {
    var y = ys[i];
    var r = Math.max(24, ringRadiusAt(y) + 12);
    var mat = new THREE.MeshBasicMaterial({
      map: Walls.tex, color: 0xdfe6ee, transparent: true, opacity: 0.55,
      side: THREE.DoubleSide, depthWrite: false,
    });
    var m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.10, 26, 44, 1, true), mat);
    m.position.y = y + 8;
    m.renderOrder = 3;
    g.add(m);
    Walls.list.push({ i: i, y: y, mesh: m, mat: mat, open: false, r: r });
  }
  return g;
};

Walls.open = function (i) {
  var w = Walls.list[i];
  if (!w || w.open) return;
  w.open = true;
  HUD.toast('the fog lifts — ' + ZONES[i + 1].name + ' is open', '#ffd646');
};

// the lowest wall still up; you cannot climb past it
Walls.ceiling = function () {
  for (var i = 0; i < Walls.list.length; i++) if (!Walls.list[i].open) return Walls.list[i];
  return null;
};

Walls.tick = function (dt, t) {
  for (var i = 0; i < Walls.list.length; i++) {
    var w = Walls.list[i];
    var want = w.open ? 0 : 0.55;
    w.mat.opacity = damp(w.mat.opacity, want, 1.6, dt);
    w.mesh.visible = w.mat.opacity > 0.02;
    w.mesh.rotation.y += dt * 0.03;
    w.mat.map.offset.x = t * 0.012;
    w.mesh.position.y = w.y + 8 + Math.sin(t * 0.5 + i) * 1.1;
  }
};

// ---- the citadel: a tower standing in the slot it was rolled into ------
var Tower = { group: null };
Tower.build = function () {
  var g = Tower.group = new THREE.Group();
  if (Run.pick[Z.INNER] !== 'citadel') return g;
  var c = Camps.list[Z.INNER + 1];
  if (!c) return g;
  var rng = makeRng(0x71c1de1);
  var base = T.hAt(c.x, c.z);
  g.position.set(c.x, base, c.z);

  var parts = [], i, a;
  for (i = 0; i < 5; i++) {                       // stacked drums, tapering
    var r = 7.5 - i * 1.0, hgt = 7;
    parts.push({ g: new THREE.CylinderGeometry(r, r + 0.5, hgt, 12, 1, true), c: i % 2 ? 0x9a9488 : 0x827c72, p: [0, 3 + i * hgt, 0] });
    parts.push({ g: new THREE.CylinderGeometry(r + 0.7, r + 0.7, 0.6, 12), c: 0x6e685e, p: [0, 3 + i * hgt + hgt / 2, 0] });
  }
  for (i = 0; i < 8; i++) {                       // crenellations on the crown
    a = i / 8 * 6.283;
    parts.push({ g: new THREE.BoxGeometry(1.1, 1.4, 0.8), c: 0xb0a894, p: [Math.cos(a) * 2.8, 39, Math.sin(a) * 2.8], r: [0, -a, 0] });
  }
  parts.push({ g: new THREE.BoxGeometry(3.0, 4.4, 0.6), c: 0x4a4438, p: [0, 5.2, 7.6] });
  var tower = new THREE.Mesh(mergeParts(parts), MAT.solidS);
  tower.castShadow = true; tower.receiveShadow = true;
  g.add(tower);

  var l = new THREE.PointLight(0xffd08a, 2.2, 44, 2);
  l.position.set(0, 40, 0);
  g.add(l);
  return g;
};

// ---- the summit -------------------------------------------------------
var Summit = { pos: null, group: null, flare: null, light: null, fired: false };
Summit.build = function () {
  var g = Summit.group = new THREE.Group();
  var rng = makeRng(9091);
  var y = T.hAt(0, 0);
  Summit.pos = new THREE.Vector3(0, y, 0);
  g.position.set(0, y, 0);
  Summit.fired = false;

  var parts = [], yy = 0;
  for (var i = 0; i < 7; i++) {
    var r = 1.5 * (0.55 - i * 0.055);
    parts.push({ g: rockGeo(rng, r, 0), c: i % 2 ? 0x8d8891 : 0x6f6a72, p: [rngRange(rng, -0.06, 0.06), yy + r * 0.5, rngRange(rng, -0.06, 0.06)], s: [1, 0.7, 1] });
    yy += r * 0.8;
  }
  var cairn = new THREE.Mesh(mergeParts(parts), MAT.solid);
  cairn.castShadow = true; cairn.receiveShadow = true;
  g.add(cairn);

  // the flare stand: reach it, fire it, go home
  var stand = new THREE.Mesh(mergeParts([
    { g: new THREE.CylinderGeometry(0.11, 0.15, 2.6, 6), c: 0x9aa2ab, p: [0, 1.3, 0] },
    { g: new THREE.BoxGeometry(0.5, 0.5, 0.5), c: 0xe8452f, p: [0, 2.75, 0] },
    { g: new THREE.ConeGeometry(0.2, 0.5, 6), c: 0xffd646, p: [0, 3.2, 0] },
  ]), MAT.solid);
  stand.position.y = 2.2;
  stand.castShadow = true;
  g.add(stand);

  var l = new THREE.PointLight(0xff5a3a, 0, 60, 2);
  l.position.set(0, 6, 0);
  Summit.light = l;
  g.add(l);
  return g;
};
Summit.tick = function (dt, t) {
  if (Summit.light) Summit.light.intensity = Summit.fired ? 6 + Math.sin(t * 12) * 2.5 : 0;
};
