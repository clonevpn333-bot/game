// ============================================================ ITEMS
// Everything you carry has weight, and weight eats the right-hand end of
// your stamina bar.  Looting is a decision, not free.
var ITEM = {
  berry:    { nm: 'berries',     ic: '🫐', kind: 'eat',   hunger: 26, wt: 2,  col: 0x6a5ad8 },
  banana:   { nm: 'banana',      ic: '🍌', kind: 'eat',   hunger: 34, wt: 3,  col: 0xf0c93a },
  mushroom: { nm: 'mushroom',    ic: '🍄', kind: 'eat',   hunger: 20, drowsy: 14, wt: 2, col: 0xd05a4a },
  jerky:    { nm: 'jerky',       ic: '🥩', kind: 'eat',   hunger: 48, wt: 4,  col: 0x8c4a2a },
  energy:   { nm: 'energy gel',  ic: '🧃', kind: 'eat',   extra: 45, wt: 3,  col: 0x4ad07a },
  lollipop: { nm: 'lollipop',    ic: '🍭', kind: 'lolly', wt: 2,  col: 0xf05a9a },
  milk:     { nm: 'milk',        ic: '🥛', kind: 'milk',  wt: 5,  col: 0xf2f2ea },
  bandage:  { nm: 'bandage',     ic: '🩹', kind: 'cure',  clears: 'injury', hp: 22, wt: 3, col: 0xf0f0e4 },
  antidote: { nm: 'antidote',    ic: '💊', kind: 'cure',  clears: 'poison', wt: 3, col: 0x8fe04a },
  piton:    { nm: 'piton',       ic: '⚙️', kind: 'piton', wt: 6,  col: 0xc9d2da },
  spool:    { nm: 'rope spool',  ic: '🧶', kind: 'spool', wt: 12, col: 0xd9b06a },
  cannon:   { nm: 'rope cannon', ic: '🔫', kind: 'cannon', wt: 14, col: 0x9aa2ab },
  torch:    { nm: 'torch',       ic: '🔦', kind: 'torch', wt: 4,  col: 0xff8a2a },
};
var ITEM_KEYS = Object.keys(ITEM);

function itemGeo(id) {
  switch (id) {
    case 'berry': return mergeParts([
      { g: new THREE.IcosahedronGeometry(0.14, 0), c: 0x6a5ad8, p: [0.1, 0, 0] },
      { g: new THREE.IcosahedronGeometry(0.12, 0), c: 0x5548b8, p: [-0.09, 0.04, 0.06] },
      { g: new THREE.IcosahedronGeometry(0.11, 0), c: 0x7a6ae8, p: [0, -0.02, -0.11] }]);
    case 'banana': return mergeParts([
      { g: new THREE.TorusGeometry(0.22, 0.07, 4, 8, 2.1), c: 0xf0c93a, r: [1.57, 0, 0.4] },
      { g: new THREE.BoxGeometry(0.07, 0.07, 0.07), c: 0x6a5a28, p: [0.2, 0.08, 0] }]);
    case 'mushroom': return mergeParts([
      { g: new THREE.CylinderGeometry(0.07, 0.09, 0.24, 6), c: 0xe8dcc0, p: [0, 0.1, 0] },
      { g: new THREE.SphereGeometry(0.19, 7, 4, 0, 6.283, 0, 1.57), c: 0xd05a4a, p: [0, 0.22, 0] }]);
    case 'jerky': return mergeParts([
      { g: new THREE.BoxGeometry(0.34, 0.09, 0.2), c: 0x8c4a2a },
      { g: new THREE.BoxGeometry(0.3, 0.05, 0.16), c: 0xa8603a, p: [0, 0.06, 0] }]);
    case 'energy': return mergeParts([
      { g: new THREE.CylinderGeometry(0.09, 0.09, 0.34, 6), c: 0x4ad07a, p: [0, 0.17, 0] },
      { g: new THREE.CylinderGeometry(0.05, 0.05, 0.1, 6), c: 0x2a8a4a, p: [0, 0.38, 0] }]);
    case 'lollipop': return mergeParts([
      { g: new THREE.CylinderGeometry(0.02, 0.02, 0.4, 4), c: 0xf0f0e4, p: [0, 0.2, 0] },
      { g: new THREE.SphereGeometry(0.15, 7, 5), c: 0xf05a9a, p: [0, 0.46, 0], s: [1, 1, 0.5] }]);
    case 'milk': return mergeParts([
      { g: new THREE.BoxGeometry(0.2, 0.34, 0.2), c: 0xf2f2ea, p: [0, 0.17, 0] },
      { g: new THREE.ConeGeometry(0.15, 0.14, 4), c: 0xdfe6f0, p: [0, 0.4, 0] },
      { g: new THREE.BoxGeometry(0.21, 0.1, 0.21), c: 0x4a8fd0, p: [0, 0.2, 0] }]);
    case 'bandage': return mergeParts([
      { g: new THREE.CylinderGeometry(0.14, 0.14, 0.16, 8), c: 0xf0f0e4, r: [1.57, 0, 0] },
      { g: new THREE.BoxGeometry(0.3, 0.06, 0.06), c: 0xd8452f },
      { g: new THREE.BoxGeometry(0.06, 0.06, 0.3), c: 0xd8452f }]);
    case 'antidote': return mergeParts([
      { g: new THREE.CylinderGeometry(0.08, 0.08, 0.26, 6), c: 0x8fe04a, p: [0, 0.13, 0] },
      { g: new THREE.CylinderGeometry(0.05, 0.05, 0.08, 6), c: 0x3a3a3a, p: [0, 0.3, 0] }]);
    case 'piton': return mergeParts([
      { g: new THREE.CylinderGeometry(0.04, 0.02, 0.44, 5), c: 0xc9d2da, r: [0, 0, 1.57] },
      { g: new THREE.TorusGeometry(0.09, 0.03, 4, 8), c: 0xe0a53c, p: [-0.21, 0, 0], r: [0, 1.57, 0] }]);
    case 'spool': return mergeParts([
      { g: new THREE.CylinderGeometry(0.22, 0.22, 0.26, 9), c: 0xd9b06a, r: [1.57, 0, 0] },
      { g: new THREE.CylinderGeometry(0.1, 0.1, 0.3, 6), c: 0x8a6a3a, r: [1.57, 0, 0] }]);
    case 'cannon': return mergeParts([
      { g: new THREE.CylinderGeometry(0.11, 0.13, 0.6, 7), c: 0x9aa2ab, r: [1.57, 0, 0], p: [0, 0.1, 0.1] },
      { g: new THREE.BoxGeometry(0.12, 0.24, 0.14), c: 0x4a4a52, p: [0, -0.05, -0.18] },
      { g: new THREE.TorusGeometry(0.09, 0.03, 4, 8), c: 0xd9b06a, p: [0, 0.1, 0.42] }]);
    case 'torch': return mergeParts([
      { g: new THREE.CylinderGeometry(0.05, 0.06, 0.55, 6), c: 0x6b4a2a },
      { g: new THREE.BoxGeometry(0.14, 0.14, 0.14), c: 0x3a2a1a, p: [0, 0.3, 0] },
      { g: new THREE.ConeGeometry(0.11, 0.26, 6), c: 0xff8a2a, p: [0, 0.46, 0] }]);
  }
  return new THREE.BoxGeometry(0.2, 0.2, 0.2);
}

function caseGeo() {
  return mergeParts([
    { g: new THREE.BoxGeometry(0.86, 0.56, 0.3), c: 0x9a4a3a, p: [0, 0.28, 0] },
    { g: new THREE.BoxGeometry(0.9, 0.08, 0.34), c: 0x6a3226, p: [0, 0.3, 0] },
    { g: new THREE.BoxGeometry(0.14, 0.08, 0.36), c: 0xd9b06a, p: [-0.26, 0.16, 0] },
    { g: new THREE.BoxGeometry(0.14, 0.08, 0.36), c: 0xd9b06a, p: [0.26, 0.16, 0] },
    { g: new THREE.TorusGeometry(0.13, 0.035, 4, 8, 3.14), c: 0x3a2a22, p: [0, 0.56, 0] },
  ]);
}

// what turns up where
var LOOT = [
  ['berry', 'banana', 'jerky', 'piton', 'bandage', 'spool', 'torch'],                   // shore
  ['banana', 'mushroom', 'berry', 'antidote', 'piton', 'spool', 'energy', 'bandage'],   // jungle
  ['jerky', 'energy', 'piton', 'bandage', 'spool', 'cannon', 'milk'],                   // snow
  ['energy', 'milk', 'piton', 'cannon', 'bandage', 'jerky', 'lollipop'],                // volcanic
  ['energy', 'milk', 'lollipop', 'piton', 'cannon', 'bandage'],                         // caldera
  ['energy', 'milk', 'lollipop'],                                                       // peak
];

var WI = { list: [], cases: [], group: null, geos: {}, ringGeo: null, caseGeo: null, thrown: [], nextId: 1 };

WI.init = function () {
  WI.group = new THREE.Group();
  for (var i = 0; i < ITEM_KEYS.length; i++) WI.geos[ITEM_KEYS[i]] = itemGeo(ITEM_KEYS[i]);
  WI.ringGeo = new THREE.RingGeometry(0.34, 0.44, 14);
  WI.caseGeo = caseGeo();
  WI.list = []; WI.cases = []; WI.thrown = []; WI.nextId = 1;
  return WI.group;
};

// Suitcases and loose food reroll every run, so the mountain is the same
// but what is on it is not.  Every one resolves real ground before landing.
WI.spawnAll = function (seed) {
  var rng = makeRng(seed ^ 0x2f9c1d77), tries = 0, placed = [];
  var wantCases = 26, wantLoose = 34;
  function far(x, z, y) {
    for (var i = 0; i < placed.length; i++) {
      var dx = placed[i].x - x, dz = placed[i].z - z, dy = placed[i].y - y;
      if (dx * dx + dz * dz + dy * dy < 150) return false;
    }
    return true;
  }
  function findSpot() {
    for (var k = 0; k < 60; k++) {
      tries++;
      var seg = T.spine[(rng() * T.spine.length) | 0];
      var a = rng() * 6.283, d = rngRange(rng, 5, 40);
      var g = T.findGround(seg.x + Math.cos(a) * d, seg.z + Math.sin(a) * d, 5, 1.2);
      if (g && far(g.x, g.z, g.y)) { placed.push(g); return g; }
    }
    return null;
  }
  var i, g;
  for (i = 0; i < wantCases && tries < 9000; i++) {
    g = findSpot();
    if (g) WI.addCase(g.x, g.y, g.z, zoneAt(g.y), rng);
  }
  for (i = 0; i < wantLoose && tries < 14000; i++) {
    g = findSpot();
    if (!g) continue;
    var pool = LOOT[zoneAt(g.y)];
    var edible = pool.filter(function (k) { return ITEM[k].kind === 'eat'; });
    WI.add({ x: g.x, y: g.y, z: g.z, k: edible.length ? edible[(rng() * edible.length) | 0] : 'berry', id: WI.nextId++ });
  }
};

WI.addCase = function (x, y, z, zone, rng) {
  var m = new THREE.Mesh(WI.caseGeo, MAT.solid);
  m.position.set(x, y, z);
  m.rotation.y = rng() * 6.283;
  m.castShadow = true;
  WI.group.add(m);
  var pool = LOOT[zone], n = 1 + ((rng() * 2.4) | 0), loot = [];
  for (var i = 0; i < n; i++) loot.push(pool[(rng() * pool.length) | 0]);
  WI.cases.push({ id: WI.nextId++, x: x, y: y, z: z, mesh: m, loot: loot, open: false });
};

WI.openCase = function (id, quiet) {
  for (var i = 0; i < WI.cases.length; i++) {
    var c = WI.cases[i];
    if (c.id !== id || c.open) continue;
    c.open = true;
    c.mesh.rotation.x = -0.5;
    c.mesh.position.y += 0.05;
    for (var k = 0; k < c.loot.length; k++) {
      var a = k / c.loot.length * 6.283;
      var g = T.findGround(c.x + Math.cos(a) * 1.0, c.z + Math.sin(a) * 1.0, 1.6, 0.4);
      WI.add({ x: g ? g.x : c.x, y: g ? g.y : c.y, z: g ? g.z : c.z, k: c.loot[k], id: WI.nextId++ });
    }
    return c;
  }
  return null;
};

WI.add = function (p) {
  var mesh = new THREE.Mesh(WI.geos[p.k], MAT.solid);
  mesh.position.set(p.x, p.y + 0.34, p.z);
  mesh.castShadow = true;
  var ring = new THREE.Mesh(WI.ringGeo, new THREE.MeshBasicMaterial({
    color: ITEM[p.k].col, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false,
  }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(p.x, p.y + 0.05, p.z);
  WI.group.add(mesh, ring);
  WI.list.push({ id: p.id, k: p.k, x: p.x, y: p.y, z: p.z, mesh: mesh, ring: ring, taken: false, ph: Math.random() * 6.28 });
  if (p.id >= WI.nextId) WI.nextId = p.id + 1;
};

WI.take = function (id) {
  for (var i = 0; i < WI.list.length; i++) {
    var it = WI.list[i];
    if (it.id === id && !it.taken) {
      it.taken = true;
      WI.group.remove(it.mesh); WI.group.remove(it.ring);
      it.ring.material.dispose();
      return it;
    }
  }
  return null;
};

WI.nearest = function (x, y, z, rad) {
  var best = null, bd = rad * rad;
  for (var i = 0; i < WI.list.length; i++) {
    var it = WI.list[i];
    if (it.taken) continue;
    var dx = it.x - x, dy = it.y + 0.4 - y, dz = it.z - z, d = dx * dx + dy * dy + dz * dz;
    if (d < bd) { bd = d; best = it; }
  }
  return best;
};
WI.nearestCase = function (x, y, z, rad) {
  var best = null, bd = rad * rad;
  for (var i = 0; i < WI.cases.length; i++) {
    var c = WI.cases[i];
    if (c.open) continue;
    var dx = c.x - x, dy = c.y + 0.3 - y, dz = c.z - z, d = dx * dx + dy * dy + dz * dz;
    if (d < bd) { bd = d; best = c; }
  }
  return best;
};

WI.dropAt = function (kind, x, y, z) {
  var g = T.findGround(x, z, 2.2, 0.2);
  var id = WI.nextId++;
  WI.add({ x: g ? g.x : x, y: g ? g.y : y, z: g ? g.z : z, k: kind, id: id });
  return id;
};

WI.tick = function (dt, t) {
  for (var i = 0; i < WI.list.length; i++) {
    var it = WI.list[i];
    if (it.taken) continue;
    it.mesh.position.y = it.y + 0.34 + Math.sin(t * 1.9 + it.ph) * 0.08;
    it.mesh.rotation.y += dt * 0.9;
    it.ring.material.opacity = 0.22 + Math.sin(t * 2.2 + it.ph) * 0.1;
  }
  for (i = WI.thrown.length - 1; i >= 0; i--) {
    var th = WI.thrown[i];
    th.t += dt;
    th.vy -= 19 * dt;
    th.mesh.position.x += th.vx * dt;
    th.mesh.position.y += th.vy * dt;
    th.mesh.position.z += th.vz * dt;
    th.mesh.rotation.x += dt * 7; th.mesh.rotation.z += dt * 5;
    if (th.t > th.life) {
      WI.group.remove(th.mesh);
      WI.thrown.splice(i, 1);
      if (th.onLand) th.onLand(th);
    }
  }
};

WI.toss = function (kind, from, to, onLand) {
  var mesh = new THREE.Mesh(WI.geos[kind], MAT.solid);
  mesh.position.copy(from);
  WI.group.add(mesh);
  var dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z;
  var dist = Math.sqrt(dx * dx + dz * dz);
  var life = clamp(dist / 9, 0.42, 1.25);
  WI.thrown.push({
    mesh: mesh, t: 0, life: life, onLand: onLand,
    vx: dx / life, vz: dz / life, vy: dy / life + 0.5 * 19 * life,
  });
};
