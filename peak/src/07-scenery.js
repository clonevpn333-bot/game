// ============================================================ SCENERY
var Props = { group: null, spheres: [], hash: {}, HCELL: 8 };

function pineGeo(rng) {
  return mergeParts([
    { g: new THREE.CylinderGeometry(0.13, 0.21, 1.5, 5), c: 0x5b4128, p: [0, 0.75, 0] },
    { g: new THREE.ConeGeometry(1.18, 2.0, 6), c: 0x2f6b33, p: [0, 2.05, 0] },
    { g: new THREE.ConeGeometry(0.92, 1.8, 6), c: 0x357638, p: [0, 3.05, 0] },
    { g: new THREE.ConeGeometry(0.6, 1.5, 6), c: 0x3d8340, p: [0, 4.0, 0] },
  ]);
}
function vineGeo() {
  return mergeParts([
    { g: new THREE.BoxGeometry(0.09, 2.4, 0.09), c: 0x4c7f2e, p: [0, -1.2, 0] },
    { g: new THREE.BoxGeometry(0.07, 1.6, 0.07), c: 0x578f36, p: [0.16, -0.8, 0.1], r: [0, 0, 0.2] },
    { g: new THREE.IcosahedronGeometry(0.3, 0), c: 0x5f9a38, p: [0.05, -0.35, 0], s: [1, 0.5, 1] },
    { g: new THREE.IcosahedronGeometry(0.26, 0), c: 0x51893a, p: [-0.1, -1.7, 0.05], s: [1, 0.55, 1] },
  ]);
}
function icicleGeo() {
  return mergeParts([
    { g: new THREE.ConeGeometry(0.16, 1.5, 4), c: 0xbfe8f6, p: [0, -0.75, 0], r: [Math.PI, 0, 0] },
    { g: new THREE.ConeGeometry(0.1, 0.9, 4), c: 0xd6f1fa, p: [0.22, -0.45, 0.08], r: [Math.PI, 0, 0] },
  ]);
}
function pitonGeo() {
  return mergeParts([
    { g: new THREE.CylinderGeometry(0.05, 0.035, 0.62, 5), c: 0xb9c0c8, p: [0, 0, 0.16], r: [Math.PI / 2, 0, 0] },
    { g: new THREE.TorusGeometry(0.15, 0.042, 4, 8), c: 0xe0a53c, p: [0, -0.02, 0.42] },
    { g: new THREE.BoxGeometry(0.34, 0.1, 0.1), c: 0xd8452f, p: [0, 0.16, 0.3] },
  ]);
}
function screeGeo(rng) {
  return mergeParts([
    { g: rockGeo(rng, 0.34, 0), c: 0x9b9089, p: [0, 0, 0], s: [1, 0.55, 1] },
    { g: rockGeo(rng, 0.26, 0), c: 0x87807a, p: [0.42, -0.04, 0.18], s: [1, 0.5, 1] },
    { g: rockGeo(rng, 0.2, 0), c: 0xa2968c, p: [-0.3, -0.05, 0.3], s: [1, 0.5, 1] },
  ]);
}

Props.build = function (seed, detail) {
  var rng = makeRng(seed ^ 0x5bf03635);
  var g = Props.group = new THREE.Group();
  var pines = [], rocks = [], vines = [], ices = [], screes = [], pit = [];
  var tries = detail ? 24000 : 13000, i;
  Props.spheres = []; Props.hash = {};

  for (i = 0; i < tries; i++) {
    var x = rngRange(rng, -T.half + 4, T.half - 4);
    var z = rngRange(rng, -T.half + 4, T.half - 4);
    var h = T.hAt(x, z);
    if (h <= T.VOID) continue;
    var n = T.normSmooth(x, z), ny = n.y;
    var surf = T.surfAt(x, z);
    var camp = Props.nearCamp(x, z, 13);

    if (h < K.BAND_ROCK - 6 && ny > 0.82 && !camp && rng() < 0.42) {
      if (h > 2.0 || rng() < 0.35) {
        pines.push({ x: x, y: h - 0.25, z: z, ry: rng() * 6.28, s: rngRange(rng, 0.72, 1.55) });
      }
    } else if (ny > 0.62 && !camp && rng() < 0.24) {
      var rs = rngRange(rng, 0.55, 1.75);
      rocks.push({ x: x, y: h - rs * 0.35, z: z, ry: rng() * 6.28, rx: rngRange(rng, -0.2, 0.2), s: rs, band: h });
      Props.addSphere(x, h + rs * 0.28, z, rs * 0.92);
    } else if (surf === SF.VINE && ny < 0.46 && rng() < 0.26) {
      vines.push({ x: x, y: h + 0.5, z: z, ry: Math.atan2(n.x, n.z) + rngRange(rng, -0.3, 0.3), s: rngRange(rng, 0.8, 1.5) });
    } else if (surf === SF.ICE && ny < 0.40 && rng() < 0.05) {
      ices.push({ x: x, y: h + 0.2, z: z, ry: rng() * 6.28, s: rngRange(rng, 0.55, 1.15) });
    } else if (ny > 0.78 && (surf === SF.LOOSE || h > K.BAND_ROCK) && rng() < 0.06) {
      screes.push({ x: x, y: h + 0.05, z: z, ry: rng() * 6.28, s: rngRange(rng, 0.7, 1.5) });
    }
  }

  for (i = 0; i < T.rests.length; i++) {
    var r = T.rests[i];
    var nn = T.normSmooth(r.x, r.z);
    var yaw = Math.atan2(nn.x, nn.z);
    pit.push({ x: r.x + nn.x * 0.34, y: r.y + 0.16, z: r.z + nn.z * 0.34, ry: yaw, s: 0.92 });
  }

  var pg = pineGeo(rng);
  var rg = rockGeo(rng, 1, 0);
  var mkPine = scatter(pg, MAT.solid, pines, function (it) {
    return [0.86 + Math.random() * 0.3, 0.9 + Math.random() * 0.22, 0.86 + Math.random() * 0.2];
  }, { shadow: true });
  var mkRock = scatter(rg, MAT.solid, rocks, function (it) {
    var c = it.band > K.BAND_TOP ? 0x413b48 : it.band > K.BAND_ALP ? 0xa9b6c2 : it.band > K.BAND_ROCK ? 0x8d8891 : 0x8a7d6c;
    var o = [0, 0, 0]; hexLin(c, o, 0, 0.85 + Math.random() * 0.3); return o;
  }, { shadow: true, receive: true });
  var mkVine = scatter(vineGeo(), MAT.solidS, vines, null);
  var mkIce = scatter(icicleGeo(), MAT.shiny, ices, null);
  var mkScree = scatter(screeGeo(rng), MAT.solid, screes, null);
  var mkPit = scatter(pitonGeo(), MAT.solid, pit, null);

  g.add(mkPine, mkRock, mkVine, mkIce, mkScree, mkPit);
  Props.counts = { pines: pines.length, rocks: rocks.length, vines: vines.length, ice: ices.length, scree: screes.length, pitons: pit.length };
  return g;
};

Props.nearCamp = function (x, z, r) {
  for (var i = 0; i < T.camps.length; i++) {
    var c = T.camps[i], dx = c.x - x, dz = c.z - z;
    if (dx * dx + dz * dz < r * r) return true;
  }
  return false;
};

// ---- boulder collision: the field height is max(terrain, boulder cap) ----
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
// height of the walkable surface including boulders
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
