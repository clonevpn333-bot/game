// ============================================================ SCENERY
var Props = { group: null, spheres: [], hash: {}, HCELL: 8, counts: {} };

function palmGeo(rng) {
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
function jungleTreeGeo(rng) {
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
function deadPineGeo() {
  return mergeParts([
    { g: new THREE.CylinderGeometry(0.12, 0.22, 4.4, 5), c: 0x5c5148, p: [0, 2.2, 0] },
    { g: new THREE.BoxGeometry(1.5, 0.1, 0.1), c: 0x5c5148, p: [0.4, 3.1, 0], r: [0, 0.4, 0.4] },
    { g: new THREE.BoxGeometry(1.2, 0.1, 0.1), c: 0x6a5e53, p: [-0.35, 2.4, 0.1], r: [0, -0.8, -0.3] },
  ]);
}
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
function obsidianGeo(rng) {
  return mergeParts([
    { g: new THREE.ConeGeometry(0.5, 2.4, 4), c: 0x1a141e, p: [0, 1.2, 0] },
    { g: new THREE.ConeGeometry(0.3, 1.4, 4), c: 0x241c28, p: [0.5, 0.7, 0.3], r: [0.2, 0.6, 0.2] },
  ]);
}
function driftGeo(rng) {
  return mergeParts([
    { g: new THREE.CylinderGeometry(0.22, 0.28, 2.6, 5), c: 0xc4b49a, r: [0, 0.3, 1.52], p: [0, 0.2, 0] },
    { g: new THREE.CylinderGeometry(0.14, 0.16, 1.2, 5), c: 0xb2a288, r: [0.4, 1.1, 1.3], p: [0.5, 0.3, 0.3] },
  ]);
}

Props.build = function (seed, detail) {
  var rng = makeRng(seed ^ 0x5bf03635);
  var g = Props.group = new THREE.Group();
  var palms = [], trees = [], ferns = [], thorns = [], pines = [], rocks = [], basalts = [], obs = [], drift = [];
  var tries = detail ? 34000 : 17000, i;
  Props.spheres = []; Props.hash = {};

  for (i = 0; i < tries; i++) {
    var x = rngRange(rng, -T.half + 4, T.half - 4);
    var z = rngRange(rng, -T.half + 4, T.half - 4);
    var h = T.hAt(x, z);
    if (h <= T.VOID || h < 0.9) continue;                 // nothing floats on the sea
    var n = T.normSmooth(x, z), ny = n.y;
    var zn = zoneAt(h), surf = T.surfAt(x, z);
    if (Props.nearCamp(x, z, 13)) continue;

    if (zn === Z.SHORE) {
      if (ny > 0.86 && rng() < 0.10) palms.push({ x: x, y: h, z: z, ry: rng() * 6.28, s: rngRange(rng, 0.8, 1.3) });
      else if (ny > 0.9 && rng() < 0.1) drift.push({ x: x, y: h + 0.1, z: z, ry: rng() * 6.28, s: rngRange(rng, 0.7, 1.2) });
      else if (ny > 0.6 && rng() < 0.1) pushRock(rng, rocks, x, h, z, 0x9a8f7e);
    } else if (zn === Z.JUNGLE) {
      if (ny > 0.82 && rng() < 0.62) trees.push({ x: x, y: h - 0.2, z: z, ry: rng() * 6.28, s: rngRange(rng, 0.75, 1.35) });
      else if (ny > 0.74 && rng() < 0.5) ferns.push({ x: x, y: h, z: z, ry: rng() * 6.28, s: rngRange(rng, 0.7, 1.4) });
      else if (surf === SF.THORN && ny > 0.6 && rng() < 0.5) thorns.push({ x: x, y: h + 0.15, z: z, ry: rng() * 6.28, s: rngRange(rng, 0.8, 1.5) });
      else if (ny > 0.6 && rng() < 0.1) pushRock(rng, rocks, x, h, z, 0x4a4030);
    } else if (zn === Z.SNOW) {
      if (ny > 0.82 && rng() < 0.42) pines.push({ x: x, y: h, z: z, ry: rng() * 6.28, s: rngRange(rng, 0.8, 1.4) });
      else if (ny > 0.6 && rng() < 0.2) pushRock(rng, rocks, x, h, z, 0xa9b6c2);
    } else if (zn === Z.VOLCANIC) {
      if (ny > 0.70 && rng() < 0.55) basalts.push({ x: x, y: h - 0.4, z: z, ry: rng() * 6.28, s: rngRange(rng, 0.7, 1.4) });
      else if (ny > 0.6 && rng() < 0.14) pushRock(rng, rocks, x, h, z, 0x3a3038);
    } else if (zn === Z.INTERIOR) {
      if (ny > 0.68 && rng() < 0.42) obs.push({ x: x, y: h, z: z, ry: rng() * 6.28, s: rngRange(rng, 0.7, 1.6) });
      else if (ny > 0.6 && rng() < 0.12) pushRock(rng, rocks, x, h, z, 0x241d26);
    } else {
      if (ny > 0.6 && rng() < 0.14) pushRock(rng, rocks, x, h, z, 0xb9c6d4);
    }
  }

  function pushRock(rng2, arr, x, h, z, col) {
    var rs = rngRange(rng2, 0.55, 1.7);
    arr.push({ x: x, y: h - rs * 0.35, z: z, ry: rng2() * 6.28, rx: rngRange(rng2, -0.2, 0.2), s: rs, col: col });
    Props.addSphere(x, h + rs * 0.26, z, rs * 0.9);
  }

  var rg = rockGeo(rng, 1, 0);
  g.add(scatter(palmGeo(rng), MAT.solid, palms, null, { shadow: true }));
  g.add(scatter(jungleTreeGeo(rng), MAT.solid, trees, null, { shadow: true }));
  g.add(scatter(fernGeo(), MAT.solidS, ferns, null));
  g.add(scatter(thornGeo(), MAT.solid, thorns, null));
  g.add(scatter(deadPineGeo(), MAT.solid, pines, null, { shadow: true }));
  g.add(scatter(basaltGeo(rng), MAT.solid, basalts, null, { shadow: true }));
  g.add(scatter(obsidianGeo(rng), MAT.shiny, obs, null));
  g.add(scatter(driftGeo(rng), MAT.solid, drift, null));
  g.add(scatter(rg, MAT.solid, rocks, function (it) {
    var o = [0, 0, 0]; hexLin(it.col, o, 0, 0.85 + Math.random() * 0.3); return o;
  }, { shadow: true, receive: true }));

  Props.counts = {
    palms: palms.length, trees: trees.length, ferns: ferns.length, thorns: thorns.length,
    pines: pines.length, rocks: rocks.length, basalt: basalts.length, obsidian: obs.length,
  };
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
