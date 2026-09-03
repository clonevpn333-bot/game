// ============================================================ SCENERY
// Every biome brings its own furniture.  Which ones get built depends on
// what the run rolled into each slot.
var Props = { group: null, spheres: [], hash: {}, HCELL: 8, counts: {}, bounce: [] };

// ---- shore -----------------------------------------------------------
function palmGeo() {
  var parts = [{ g: new THREE.CylinderGeometry(0.16, 0.26, 5.2, 5), c: 0x8a6a44, p: [0.5, 2.6, 0], r: [0, 0, -0.16] }];
  for (var i = 0; i < 6; i++) {
    var a = i / 6 * 6.283;
    parts.push({
      g: new THREE.ConeGeometry(0.42, 3.0, 3), c: i % 2 ? 0x4fa63f : 0x3f8c3a,
      p: [1.0 + Math.cos(a) * 1.3, 5.3, Math.sin(a) * 1.3], r: [Math.cos(a) * 0.9, -a, 1.35 + Math.sin(a) * 0.3],
    });
  }
  parts.push({ g: new THREE.IcosahedronGeometry(0.28, 0), c: 0x8a6a44, p: [0.95, 5.0, 0] });
  return mergeParts(parts);
}
function driftGeo(rng) {
  return mergeParts([
    { g: new THREE.CylinderGeometry(0.22, 0.28, 2.6, 5), c: 0xc4b49a, r: [0, 0.3, 1.52], p: [0, 0.2, 0] },
    { g: new THREE.CylinderGeometry(0.14, 0.16, 1.2, 5), c: 0xb2a288, r: [0.4, 1.1, 1.3], p: [0.5, 0.3, 0.3] },
  ]);
}

// ---- tropics ---------------------------------------------------------
function jungleTreeGeo() {
  return mergeParts([
    { g: new THREE.CylinderGeometry(0.28, 0.44, 6.2, 6), c: 0x4a3a28, p: [0, 3.1, 0] },
    { g: new THREE.IcosahedronGeometry(2.5, 0), c: 0x2f6b33, p: [0, 6.9, 0], s: [1, 0.62, 1] },
    { g: new THREE.IcosahedronGeometry(1.9, 0), c: 0x3f8c3a, p: [1.2, 6.1, 0.7], s: [1, 0.6, 1] },
    { g: new THREE.IcosahedronGeometry(1.6, 0), c: 0x46993c, p: [-1.3, 6.4, -0.6], s: [1, 0.6, 1] },
  ]);
}
function fernGeo() {
  var parts = [];
  for (var i = 0; i < 5; i++) {
    var a = i / 5 * 6.283;
    parts.push({ g: new THREE.ConeGeometry(0.22, 1.5, 3), c: i % 2 ? 0x57a04a : 0x3f8c3a, p: [Math.cos(a) * 0.28, 0.7, Math.sin(a) * 0.28], r: [Math.cos(a) * 0.5, -a, Math.sin(a) * 0.5] });
  }
  return mergeParts(parts);
}
function thornGeo() {
  var parts = [{ g: new THREE.IcosahedronGeometry(0.7, 0), c: 0x4b3358, s: [1, 0.6, 1] }];
  for (var i = 0; i < 7; i++) {
    var a = i / 7 * 6.283;
    parts.push({ g: new THREE.ConeGeometry(0.09, 0.7, 3), c: 0xb06ad0, p: [Math.cos(a) * 0.42, 0.4, Math.sin(a) * 0.42], r: [Math.cos(a) * 0.7, 0, Math.sin(a) * 0.7] });
  }
  return mergeParts(parts);
}

// ---- roots -----------------------------------------------------------
function shroomGeo() {                       // the springy kind
  return mergeParts([
    { g: new THREE.CylinderGeometry(0.32, 0.46, 1.7, 7), c: 0xe4dcc8, p: [0, 0.85, 0] },
    { g: new THREE.SphereGeometry(1.5, 10, 6, 0, 6.283, 0, 1.45), c: 0xc44a8a, p: [0, 1.6, 0], s: [1, 0.66, 1] },
    { g: new THREE.SphereGeometry(1.2, 9, 5, 0, 6.283, 0, 1.45), c: 0xe06aa8, p: [0, 1.75, 0], s: [1, 0.5, 1] },
  ]);
}
function rootArchGeo() {
  return mergeParts([
    { g: new THREE.TorusGeometry(2.2, 0.34, 5, 9, 3.14), c: 0x4a3a26, p: [0, 0, 0] },
    { g: new THREE.CylinderGeometry(0.3, 0.42, 1.6, 5), c: 0x3e3020, p: [-2.2, -0.7, 0] },
    { g: new THREE.CylinderGeometry(0.3, 0.42, 1.6, 5), c: 0x3e3020, p: [2.2, -0.7, 0] },
    { g: new THREE.IcosahedronGeometry(0.5, 0), c: 0x6a5a3a, p: [0.7, 2.0, 0.3], s: [1, 0.6, 1] },
  ]);
}
function sporeVentGeo() {
  return mergeParts([
    { g: new THREE.CylinderGeometry(0.5, 0.8, 0.9, 7), c: 0x5a4a70, p: [0, 0.45, 0] },
    { g: new THREE.CylinderGeometry(0.42, 0.42, 0.14, 7), c: 0xb06ad8, p: [0, 0.92, 0] },
  ]);
}

// ---- alpine ----------------------------------------------------------
function deadPineGeo() {
  return mergeParts([
    { g: new THREE.CylinderGeometry(0.12, 0.22, 4.4, 5), c: 0x5c5148, p: [0, 2.2, 0] },
    { g: new THREE.BoxGeometry(1.5, 0.1, 0.1), c: 0x5c5148, p: [0.4, 3.1, 0], r: [0, 0.4, 0.4] },
    { g: new THREE.BoxGeometry(1.2, 0.1, 0.1), c: 0x6a5e53, p: [-0.35, 2.4, 0.1], r: [0, -0.8, -0.3] },
  ]);
}
function iceShardGeo() {
  return mergeParts([
    { g: new THREE.ConeGeometry(0.34, 2.2, 5), c: 0xbfe8f6, p: [0, 1.1, 0] },
    { g: new THREE.ConeGeometry(0.2, 1.3, 5), c: 0xd6f1fa, p: [0.4, 0.65, 0.2] },
  ]);
}

// ---- mesa ------------------------------------------------------------
function cactusGeo() {
  return mergeParts([
    { g: new THREE.CylinderGeometry(0.42, 0.5, 4.4, 8), c: 0x4a8a4a, p: [0, 2.2, 0] },
    { g: new THREE.SphereGeometry(0.42, 8, 6), c: 0x4a8a4a, p: [0, 4.4, 0] },
    { g: new THREE.CylinderGeometry(0.26, 0.3, 1.7, 7), c: 0x3f7d42, p: [0.85, 3.1, 0], r: [0, 0, -1.2] },
    { g: new THREE.CylinderGeometry(0.26, 0.26, 1.5, 7), c: 0x3f7d42, p: [1.25, 3.7, 0] },
    { g: new THREE.CylinderGeometry(0.24, 0.28, 1.4, 7), c: 0x448246, p: [-0.8, 2.4, 0], r: [0, 0, 1.2] },
    { g: new THREE.CylinderGeometry(0.24, 0.24, 1.2, 7), c: 0x448246, p: [-1.15, 2.95, 0] },
  ]);
}
function brushGeo(rng) {
  var parts = [];
  for (var i = 0; i < 6; i++) {
    var a = rngRange(rng, 0, 6.283);
    parts.push({ g: new THREE.CylinderGeometry(0.03, 0.05, 0.9, 3), c: i % 2 ? 0x8a7a4a : 0x6f6238, p: [Math.cos(a) * 0.2, 0.45, Math.sin(a) * 0.2], r: [Math.cos(a) * 0.5, a, Math.sin(a) * 0.5] });
  }
  return mergeParts(parts);
}
function tumbleGeo(rng) {
  var parts = [];
  for (var i = 0; i < 8; i++) {
    parts.push({
      g: new THREE.TorusGeometry(rngRange(rng, 0.3, 0.55), 0.04, 3, 7), c: 0x9a8450,
      r: [rngRange(rng, 0, 3), rngRange(rng, 0, 3), rngRange(rng, 0, 3)],
    });
  }
  return mergeParts(parts);
}

// ---- caldera / kiln --------------------------------------------------
function basaltGeo(rng) {
  var parts = [];
  for (var i = 0; i < 4; i++) {
    var a = rngRange(rng, 0, 6.283), d = rngRange(rng, 0, 0.5);
    parts.push({
      g: new THREE.CylinderGeometry(rngRange(rng, 0.35, 0.6), rngRange(rng, 0.4, 0.65), rngRange(rng, 1.6, 3.6), 6),
      c: i % 2 ? 0x342c3a : 0x271f2b, p: [Math.cos(a) * d, rngRange(rng, 0.6, 1.5), Math.sin(a) * d],
      r: [rngRange(rng, -0.1, 0.1), a, rngRange(rng, -0.1, 0.1)],
    });
  }
  return mergeParts(parts);
}
function obsidianGeo() {
  return mergeParts([
    { g: new THREE.ConeGeometry(0.5, 2.4, 4), c: 0x1a141e, p: [0, 1.2, 0] },
    { g: new THREE.ConeGeometry(0.3, 1.4, 4), c: 0x241c28, p: [0.5, 0.7, 0.3], r: [0.2, 0.6, 0.2] },
  ]);
}
function ventGeo() {
  return mergeParts([
    { g: new THREE.CylinderGeometry(0.75, 1.1, 1.0, 7), c: 0x241c26, p: [0, 0.5, 0] },
    { g: new THREE.CylinderGeometry(0.62, 0.62, 0.16, 7), c: 0xff5a1e, p: [0, 1.0, 0] },
  ]);
}

// ---- gloom -----------------------------------------------------------
function gloomTreeGeo() {
  return mergeParts([
    { g: new THREE.CylinderGeometry(0.7, 1.5, 11, 7), c: 0x241d2e, p: [0, 5.5, 0] },
    { g: new THREE.CylinderGeometry(0.2, 0.34, 4.0, 5), c: 0x2c2438, p: [1.6, 8.6, 0], r: [0, 0, -0.9] },
    { g: new THREE.CylinderGeometry(0.2, 0.34, 3.4, 5), c: 0x2c2438, p: [-1.5, 9.4, 0.4], r: [0, 0, 0.95] },
    { g: new THREE.IcosahedronGeometry(2.4, 0), c: 0x1e1a2e, p: [0, 11.6, 0], s: [1, 0.5, 1] },
  ]);
}
function bellGeo() {
  return mergeParts([
    { g: new THREE.CylinderGeometry(0.03, 0.03, 2.6, 4), c: 0x3a3348, p: [0, 1.3, 0] },
    { g: new THREE.CylinderGeometry(0.22, 0.44, 0.7, 8, 1, true), c: 0xa89a5a, p: [0, -0.3, 0] },
    { g: new THREE.SphereGeometry(0.12, 6, 5), c: 0xc8b86a, p: [0, -0.6, 0] },
  ]);
}
function wispGeo() {
  return mergeParts([
    { g: new THREE.IcosahedronGeometry(0.34, 0), c: 0xa8d8f0, p: [0, 0, 0] },
    { g: new THREE.IcosahedronGeometry(0.18, 0), c: 0xd8f0ff, p: [0.2, 0.3, 0.1] },
  ]);
}

// ---- citadel ---------------------------------------------------------
function pillarGeo() {
  return mergeParts([
    { g: new THREE.BoxGeometry(1.3, 0.4, 1.3), c: 0x7d7668, p: [0, 0.2, 0] },
    { g: new THREE.CylinderGeometry(0.46, 0.52, 5.2, 9), c: 0x9a9488, p: [0, 2.9, 0] },
    { g: new THREE.BoxGeometry(1.2, 0.4, 1.2), c: 0x7d7668, p: [0, 5.7, 0] },
  ]);
}
function ruinGeo(rng) {
  var parts = [], y = 0;
  for (var i = 0; i < 5; i++) {
    var w = rngRange(rng, 1.4, 2.6);
    parts.push({ g: new THREE.BoxGeometry(w, 0.7, 1.0), c: i % 2 ? 0x8e887c : 0x6e685e, p: [rngRange(rng, -0.4, 0.4), y + 0.35, rngRange(rng, -0.2, 0.2)], r: [0, rngRange(rng, -0.2, 0.2), 0] });
    y += 0.7;
  }
  return mergeParts(parts);
}
function bannerGeo() {
  return mergeParts([
    { g: new THREE.CylinderGeometry(0.07, 0.07, 4.6, 5), c: 0x4a4438, p: [0, 2.3, 0] },
    { g: new THREE.PlaneGeometry(1.2, 2.6), c: 0x9a3a4a, p: [0.6, 3.1, 0] },
  ]);
}

// ---- peak ------------------------------------------------------------
function cairnGeo(rng) {
  var parts = [], y = 0;
  for (var i = 0; i < 5; i++) {
    var r = 0.55 - i * 0.07;
    parts.push({ g: rockGeo(rng, r, 0), c: i % 2 ? 0x8d8891 : 0x6f6a72, p: [rngRange(rng, -0.05, 0.05), y + r * 0.5, rngRange(rng, -0.05, 0.05)], s: [1, 0.7, 1] });
    y += r * 0.8;
  }
  return mergeParts(parts);
}

Props.build = function (seed, detail) {
  var rng = makeRng(seed ^ 0x5bf03635);
  var g = Props.group = new THREE.Group();
  var L = {};                                  // one bucket list per prop kind
  function put(k, o) { (L[k] || (L[k] = [])).push(o); }
  var tries = detail ? 34000 : 17000, i;
  Props.spheres = []; Props.hash = {}; Props.bounce = [];

  function pushRock(arr, x, h, z, col) {
    var rs = rngRange(rng, 0.55, 1.7);
    put(arr, { x: x, y: h - rs * 0.35, z: z, ry: rng() * 6.28, rx: rngRange(rng, -0.2, 0.2), s: rs, col: col });
    Props.addSphere(x, h + rs * 0.26, z, rs * 0.9);
  }

  for (i = 0; i < tries; i++) {
    var x = rngRange(rng, -T.half + 4, T.half - 4);
    var z = rngRange(rng, -T.half + 4, T.half - 4);
    var h = T.hAt(x, z);
    if (h <= T.VOID || h < 0.9) continue;
    var n = T.normSmooth(x, z), ny = n.y;
    var id = Run.pick[zoneAt(h)], surf = T.surfAt(x, z);
    if (Props.nearCamp(x, z, 13)) continue;
    var ry = rng() * 6.28;

    if (id === 'shore') {
      if (ny > 0.86 && rng() < 0.10) put('palm', { x: x, y: h, z: z, ry: ry, s: rngRange(rng, 0.8, 1.3) });
      else if (ny > 0.9 && rng() < 0.1) put('drift', { x: x, y: h + 0.1, z: z, ry: ry, s: rngRange(rng, 0.7, 1.2) });
      else if (ny > 0.6 && rng() < 0.1) pushRock('rock', x, h, z, 0x9a8f7e);
    } else if (id === 'tropics') {
      if (ny > 0.82 && rng() < 0.62) put('tree', { x: x, y: h - 0.2, z: z, ry: ry, s: rngRange(rng, 0.75, 1.35) });
      else if (ny > 0.74 && rng() < 0.5) put('fern', { x: x, y: h, z: z, ry: ry, s: rngRange(rng, 0.7, 1.4) });
      else if (surf === SF.THORN && ny > 0.6 && rng() < 0.5) put('thorn', { x: x, y: h + 0.15, z: z, ry: ry, s: rngRange(rng, 0.8, 1.5) });
      else if (ny > 0.6 && rng() < 0.1) pushRock('rock', x, h, z, 0x4a4030);
    } else if (id === 'roots') {
      if (ny > 0.8 && rng() < 0.30) {
        var ms = rngRange(rng, 0.8, 1.7);
        put('shroom', { x: x, y: h, z: z, ry: ry, s: ms });
        // the caps are springy: land on one and it throws you
        Props.bounce.push({ x: x, y: h + 1.35 * ms, z: z, r: 1.4 * ms });
      } else if (ny > 0.7 && rng() < 0.22) put('arch', { x: x, y: h + 1.4, z: z, ry: ry, s: rngRange(rng, 0.8, 1.6) });
      else if (surf === SF.SPORE && ny > 0.7 && rng() < 0.4) put('vent', { x: x, y: h, z: z, ry: ry, s: rngRange(rng, 0.7, 1.4) });
      else if (ny > 0.6 && rng() < 0.14) pushRock('rock', x, h, z, 0x3a2f4a);
    } else if (id === 'alpine') {
      if (ny > 0.82 && rng() < 0.42) put('pine', { x: x, y: h, z: z, ry: ry, s: rngRange(rng, 0.8, 1.4) });
      else if (surf === SF.ICE && ny < 0.5 && rng() < 0.14) put('shard', { x: x, y: h + 0.2, z: z, ry: ry, s: rngRange(rng, 0.6, 1.3) });
      else if (ny > 0.6 && rng() < 0.2) pushRock('rock', x, h, z, 0xa9b6c2);
    } else if (id === 'mesa') {
      if (ny > 0.86 && rng() < 0.20) put('cactus', { x: x, y: h, z: z, ry: ry, s: rngRange(rng, 0.7, 1.4) });
      else if (ny > 0.8 && rng() < 0.34) put('brush', { x: x, y: h, z: z, ry: ry, s: rngRange(rng, 0.7, 1.5) });
      else if (ny > 0.9 && rng() < 0.06) put('tumble', { x: x, y: h + 0.5, z: z, ry: ry, s: rngRange(rng, 0.8, 1.3) });
      else if (ny > 0.6 && rng() < 0.2) pushRock('rock', x, h, z, 0xb0703a);
    } else if (id === 'caldera') {
      if (ny > 0.70 && rng() < 0.55) put('basalt', { x: x, y: h - 0.4, z: z, ry: ry, s: rngRange(rng, 0.7, 1.4) });
      else if (ny > 0.6 && rng() < 0.14) pushRock('rock', x, h, z, 0x3a3038);
    } else if (id === 'gloom') {
      if (ny > 0.8 && rng() < 0.20) put('gtree', { x: x, y: h - 0.3, z: z, ry: ry, s: rngRange(rng, 0.8, 1.5) });
      else if (ny > 0.7 && rng() < 0.10) put('bell', { x: x, y: h + 3.4, z: z, ry: ry, s: rngRange(rng, 0.8, 1.4) });
      else if (ny > 0.75 && rng() < 0.10) put('wisp', { x: x, y: h + 1.3, z: z, ry: ry, s: rngRange(rng, 0.7, 1.4) });
      else if (ny > 0.6 && rng() < 0.14) pushRock('rock', x, h, z, 0x2a2440);
    } else if (id === 'kiln') {
      if (ny > 0.68 && rng() < 0.42) put('obs', { x: x, y: h, z: z, ry: ry, s: rngRange(rng, 0.7, 1.6) });
      else if (surf === SF.EMBER && ny > 0.7 && rng() < 0.24) put('vent2', { x: x, y: h, z: z, ry: ry, s: rngRange(rng, 0.7, 1.5) });
      else if (ny > 0.6 && rng() < 0.12) pushRock('rock', x, h, z, 0x241d26);
    } else if (id === 'citadel') {
      if (ny > 0.86 && rng() < 0.16) put('pillar', { x: x, y: h, z: z, ry: ry, s: rngRange(rng, 0.8, 1.5) });
      else if (ny > 0.78 && rng() < 0.24) put('ruin', { x: x, y: h, z: z, ry: ry, s: rngRange(rng, 0.7, 1.4) });
      else if (ny > 0.86 && rng() < 0.05) put('banner', { x: x, y: h, z: z, ry: ry, s: rngRange(rng, 0.9, 1.3) });
      else if (ny > 0.6 && rng() < 0.14) pushRock('rock', x, h, z, 0x8a8478);
    } else {
      if (ny > 0.84 && rng() < 0.4) put('cairn', { x: x, y: h, z: z, ry: ry, s: rngRange(rng, 0.8, 1.3) });
      else if (ny > 0.6 && rng() < 0.14) pushRock('rock', x, h, z, 0xb9c6d4);
    }
  }

  // only build the geometry for kinds this island actually needs
  var MAKE = {
    palm: [palmGeo, MAT.solid, { shadow: true }],
    drift: [function () { return driftGeo(rng); }, MAT.solid, {}],
    tree: [jungleTreeGeo, MAT.solid, { shadow: true }],
    fern: [fernGeo, MAT.solidS, {}],
    thorn: [thornGeo, MAT.solid, {}],
    shroom: [shroomGeo, MAT.solid, { shadow: true }],
    arch: [rootArchGeo, MAT.solid, { shadow: true }],
    vent: [sporeVentGeo, MAT.solid, {}],
    pine: [deadPineGeo, MAT.solid, { shadow: true }],
    shard: [iceShardGeo, MAT.shiny, {}],
    cactus: [cactusGeo, MAT.solid, { shadow: true }],
    brush: [function () { return brushGeo(rng); }, MAT.solidS, {}],
    tumble: [function () { return tumbleGeo(rng); }, MAT.solidS, {}],
    basalt: [function () { return basaltGeo(rng); }, MAT.solid, { shadow: true }],
    obs: [obsidianGeo, MAT.shiny, {}],
    vent2: [ventGeo, MAT.solid, {}],
    gtree: [gloomTreeGeo, MAT.solid, { shadow: true }],
    bell: [bellGeo, MAT.solid, {}],
    wisp: [wispGeo, MAT.glow, {}],
    pillar: [pillarGeo, MAT.solid, { shadow: true }],
    ruin: [function () { return ruinGeo(rng); }, MAT.solid, { shadow: true }],
    banner: [bannerGeo, MAT.solidS, {}],
    cairn: [function () { return cairnGeo(rng); }, MAT.solid, { shadow: true }],
  };
  Props.counts = {};
  for (var k in L) {
    if (!MAKE[k] || !L[k].length) continue;
    var m = MAKE[k];
    g.add(scatter(m[0](), m[1], L[k], null, m[2]));
    Props.counts[k] = L[k].length;
  }
  if (L.rock && L.rock.length) {
    g.add(scatter(rockGeo(rng, 1, 0), MAT.solid, L.rock, function (it) {
      var o = [0, 0, 0]; hexLin(it.col, o, 0, 0.85 + Math.random() * 0.3); return o;
    }, { shadow: true, receive: true }));
    Props.counts.rock = L.rock.length;
  }
  return g;
};

Props.nearCamp = function (x, z, r) {
  for (var i = 0; i < T.camps.length; i++) {
    var c = T.camps[i], dx = c.x - x, dz = c.z - z;
    if (dx * dx + dz * dz < r * r) return true;
  }
  return false;
};

// ---- boulder collision: the walkable height is max(terrain, boulder cap) ----
Props.addSphere = function (x, y, z, r) {
  var s = { x: x, y: y, z: z, r: r };
  Props.spheres.push(s);
  var key = Math.floor(x / Props.HCELL) + ',' + Math.floor(z / Props.HCELL);
  (Props.hash[key] || (Props.hash[key] = [])).push(s);
};
Props.near = function (x, z, out) {
  out.length = 0;
  var cx = Math.floor(x / Props.HCELL), cz = Math.floor(z / Props.HCELL), i, j, a;
  for (j = -1; j <= 1; j++) for (i = -1; i <= 1; i++) {
    a = Props.hash[(cx + i) + ',' + (cz + j)];
    if (a) for (var k = 0; k < a.length; k++) out.push(a[k]);
  }
  return out;
};
var _pn = [];
Props.capHeight = function (x, z, base) {
  var list = Props.near(x, z, _pn), best = base;
  for (var i = 0; i < list.length; i++) {
    var s = list[i], dx = x - s.x, dz = z - s.z, d2 = dx * dx + dz * dz;
    if (d2 < s.r * s.r) {
      var top = s.y + Math.sqrt(s.r * s.r - d2);
      if (top > best) best = top;
    }
  }
  return best;
};

// a mushroom cap you have just landed on, if any
Props.bounceAt = function (x, y, z) {
  for (var i = 0; i < Props.bounce.length; i++) {
    var b = Props.bounce[i];
    if (Math.abs(b.y - y) > 1.4) continue;
    var dx = x - b.x, dz = z - b.z;
    if (dx * dx + dz * dz < b.r * b.r) return b;
  }
  return null;
};
