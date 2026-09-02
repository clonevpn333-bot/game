// ============================================================ ITEMS
var ITEM = {
  berries: { nm: 'berries', ic: '🍒', kind: 'food', food: 24, max: 3, col: 0xd8425e },
  jerky: { nm: 'jerky', ic: '🥩', kind: 'food', food: 46, max: 2, col: 0x8c4a2a },
  bar: { nm: 'energy bar', ic: '🍫', kind: 'food', food: 30, stam: 40, max: 2, col: 0x6b4326 },
  bandage: { nm: 'bandage', ic: '🩹', kind: 'heal', hp: 30, cure: true, max: 2, col: 0xf0f0e4 },
  rope: { nm: 'rope', ic: '🧶', kind: 'rope', max: 1, col: 0xd9b06a },
  torch: { nm: 'torch', ic: '🔥', kind: 'torch', max: 1, col: 0xff8a2a },
  piton: { nm: 'piton', ic: '⚙️', kind: 'piton', max: 4, col: 0xc9d2da },
  parka: { nm: 'parka', ic: '🧥', kind: 'wear', max: 1, col: 0x3f7fd0 },
};
var ITEM_KEYS = Object.keys(ITEM);

function itemGeo(id) {
  switch (id) {
    case 'berries': return mergeParts([
      { g: new THREE.IcosahedronGeometry(0.15, 0), c: 0xd8425e, p: [0.1, 0, 0] },
      { g: new THREE.IcosahedronGeometry(0.13, 0), c: 0xb8324e, p: [-0.09, 0.04, 0.06] },
      { g: new THREE.IcosahedronGeometry(0.12, 0), c: 0xe0566e, p: [0, -0.02, -0.11] },
      { g: new THREE.BoxGeometry(0.04, 0.16, 0.04), c: 0x4c7f2e, p: [0.1, 0.16, 0] }]);
    case 'jerky': return mergeParts([
      { g: new THREE.BoxGeometry(0.34, 0.09, 0.2), c: 0x8c4a2a },
      { g: new THREE.BoxGeometry(0.3, 0.05, 0.16), c: 0xa8603a, p: [0, 0.06, 0] }]);
    case 'bar': return mergeParts([
      { g: new THREE.BoxGeometry(0.4, 0.1, 0.16), c: 0x6b4326 },
      { g: new THREE.BoxGeometry(0.42, 0.04, 0.18), c: 0xe8c14a, p: [0, 0.02, 0] }]);
    case 'bandage': return mergeParts([
      { g: new THREE.CylinderGeometry(0.14, 0.14, 0.16, 8), c: 0xf0f0e4, r: [Math.PI / 2, 0, 0] },
      { g: new THREE.BoxGeometry(0.3, 0.06, 0.06), c: 0xd8452f },
      { g: new THREE.BoxGeometry(0.06, 0.06, 0.3), c: 0xd8452f }]);
    case 'rope': return mergeParts([
      { g: new THREE.TorusGeometry(0.2, 0.055, 5, 10), c: 0xd9b06a, r: [Math.PI / 2, 0, 0] },
      { g: new THREE.TorusGeometry(0.16, 0.05, 5, 10), c: 0xc59a56, r: [Math.PI / 2, 0.4, 0], p: [0, 0.07, 0] }]);
    case 'torch': return mergeParts([
      { g: new THREE.CylinderGeometry(0.05, 0.06, 0.55, 6), c: 0x6b4a2a },
      { g: new THREE.BoxGeometry(0.14, 0.14, 0.14), c: 0x3a2a1a, p: [0, 0.3, 0] },
      { g: new THREE.ConeGeometry(0.11, 0.26, 6), c: 0xff8a2a, p: [0, 0.46, 0] }]);
    case 'piton': return mergeParts([
      { g: new THREE.CylinderGeometry(0.04, 0.02, 0.42, 5), c: 0xc9d2da, r: [0, 0, Math.PI / 2] },
      { g: new THREE.TorusGeometry(0.09, 0.03, 4, 8), c: 0xe0a53c, p: [-0.2, 0, 0], r: [0, Math.PI / 2, 0] }]);
    case 'parka': return mergeParts([
      { g: new THREE.BoxGeometry(0.34, 0.3, 0.18), c: 0x3f7fd0 },
      { g: new THREE.BoxGeometry(0.36, 0.08, 0.2), c: 0xf0f0e4, p: [0, 0.14, 0] },
      { g: new THREE.BoxGeometry(0.1, 0.2, 0.16), c: 0x2f63a8, p: [0.2, -0.02, 0], r: [0, 0, 0.3] },
      { g: new THREE.BoxGeometry(0.1, 0.2, 0.16), c: 0x2f63a8, p: [-0.2, -0.02, 0], r: [0, 0, -0.3] }]);
  }
  return new THREE.BoxGeometry(0.2, 0.2, 0.2);
}

var WI = { list: [], group: null, geos: {}, ringGeo: null, thrown: [] };

WI.init = function () {
  WI.group = new THREE.Group();
  for (var i = 0; i < ITEM_KEYS.length; i++) WI.geos[ITEM_KEYS[i]] = itemGeo(ITEM_KEYS[i]);
  WI.ringGeo = new THREE.RingGeometry(0.34, 0.44, 14);
  return WI.group;
};

// deterministic scatter: the same seed puts the same tin of jerky on the
// same ledge for every player in the room
WI.spawnAll = function (seed) {
  var rng = makeRng(seed ^ 0x2f9c1d77), id = 0, i, tries = 0;
  var wanted = 62, placed = [];
  while (placed.length < wanted && tries < 9000) {
    tries++;
    var pick = rng();
    var x, z, y;
    if (pick < 0.45 && T.rests.length) {
      var rp = T.rests[(rng() * T.rests.length) | 0];
      var nn = T.normSmooth(rp.x, rp.z);
      x = rp.x + nn.x * 1.1; z = rp.z + nn.z * 1.1;
      y = T.hAt(x, z);
      if (y <= T.VOID) continue;
      if (T.normSmooth(x, z).y < 0.7) continue;
    } else {
      var seg = T.route[(rng() * (T.route.length - 1)) | 0];
      var a = rng() * 6.283, d = rngRange(rng, 4, 34);
      x = seg.x + Math.cos(a) * d; z = seg.z + Math.sin(a) * d;
      y = T.hAt(x, z);
      if (y <= T.VOID) continue;
      if (T.normSmooth(x, z).y < 0.74) continue;
    }
    var ok = true;
    for (i = 0; i < placed.length; i++) {
      var dx = placed[i].x - x, dz = placed[i].z - z, dy = placed[i].y - y;
      if (dx * dx + dz * dz + dy * dy < 110) { ok = false; break; }
    }
    if (!ok) continue;

    // what you find depends on how high it is
    var kind;
    var r = rng();
    if (y > K.BAND_ALP) kind = r < 0.32 ? 'jerky' : r < 0.48 ? 'bar' : r < 0.63 ? 'bandage' : r < 0.76 ? 'rope' : r < 0.88 ? 'piton' : 'parka';
    else if (y > K.BAND_ROCK) kind = r < 0.24 ? 'berries' : r < 0.42 ? 'jerky' : r < 0.55 ? 'bar' : r < 0.7 ? 'bandage' : r < 0.84 ? 'rope' : r < 0.93 ? 'piton' : 'torch';
    else kind = r < 0.4 ? 'berries' : r < 0.55 ? 'bar' : r < 0.7 ? 'rope' : r < 0.84 ? 'bandage' : r < 0.94 ? 'torch' : 'parka';
    placed.push({ x: x, y: y, z: z, k: kind, id: id++ });
  }
  for (i = 0; i < placed.length; i++) WI.add(placed[i]);
};

WI.add = function (p) {
  var mesh = new THREE.Mesh(WI.geos[p.k], MAT.solid);
  mesh.position.set(p.x, p.y + 0.42, p.z);
  mesh.castShadow = true;
  var ring = new THREE.Mesh(WI.ringGeo, new THREE.MeshBasicMaterial({
    color: ITEM[p.k].col, transparent: true, opacity: 0.34, side: THREE.DoubleSide, depthWrite: false,
  }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(p.x, p.y + 0.06, p.z);
  WI.group.add(mesh, ring);
  WI.list.push({ id: p.id, k: p.k, x: p.x, y: p.y, z: p.z, mesh: mesh, ring: ring, taken: false, ph: Math.random() * 6.28 });
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

WI.dropAt = function (kind, x, y, z) {
  var id = 100000 + ((Math.random() * 800000) | 0);
  WI.add({ x: x, y: y, z: z, k: kind, id: id });
  return id;
};

WI.tick = function (dt, t) {
  for (var i = 0; i < WI.list.length; i++) {
    var it = WI.list[i];
    if (it.taken) continue;
    it.mesh.position.y = it.y + 0.42 + Math.sin(t * 1.9 + it.ph) * 0.09;
    it.mesh.rotation.y += dt * 0.9;
    it.ring.material.opacity = 0.24 + Math.sin(t * 2.2 + it.ph) * 0.1;
  }
  // items in flight between climbers
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
