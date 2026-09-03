// ---- surface classification ------------------------------------------
// Cosmetic and hazard only.  Nothing here decides whether you can climb -
// every face on the mountain is climbable.
T.classify = function () {
  var N = T.N, n = T.noise;
  var S = T.SURF = new Uint8Array(N * N);
  var i, j;
  for (j = 0; j < N; j++) {
    for (i = 0; i < N; i++) {
      var x = T.wx(i) + T.CS * 0.5, z = T.wx(j) + T.CS * 0.5;
      var n2 = T.normAt(x, z);
      var h = T.hAt(x, z), ny = n2.y;
      var flat = ny > 0.70, steep = ny < 0.46;
      var v = n.fbm(x * 0.035, z * 0.035, 3);
      var w = n.fbm(x * 0.017 + 60, z * 0.017 - 30, 2);
      var s, id = Run.pick[zoneAt(h)];

      if (id === 'shore') {
        s = flat ? (h < 6 ? SF.SAND : (v > 0.05 ? SF.GRASS : SF.SAND)) : SF.ROCK;
      } else if (id === 'tropics') {
        s = flat ? (v > -0.1 ? SF.GRASS : SF.LEAF) : SF.MUD;
        if (w > 0.42) s = SF.THORN;
      } else if (id === 'roots') {
        s = flat ? SF.GRASS : SF.MUD;
        if (v > 0.22) s = SF.SPORE;                    // spore mist pools here
      } else if (id === 'alpine') {
        s = flat ? SF.SNOW : SF.ROCK;
        if (steep && w > 0.05) s = SF.ICE;
      } else if (id === 'mesa') {
        s = flat ? (v > 0.1 ? SF.SAND : SF.CLAY) : SF.CLAY;
        // the sun only misses the faces turned away from it
        if (n2.x < -0.25 || ny < 0.3) s = SF.SHADE;
      } else if (id === 'caldera') {
        s = SF.BASALT;
        if (v > 0.36) s = SF.EMBER;
      } else if (id === 'gloom') {
        s = flat ? SF.MURK : SF.MUD;
        if (steep && w > 0.3) s = SF.ROCK;
      } else if (id === 'kiln') {
        s = SF.BASALT;
        if (v > 0.34) s = SF.EMBER;
      } else if (id === 'citadel') {
        s = flat ? SF.BRICK : SF.ROCK;
        if (w > 0.35) s = SF.BRICK;
      } else {
        s = flat ? SF.SNOW : SF.ROCK;
      }
      S[j * N + i] = s;
    }
  }
};

// ---- queries ----------------------------------------------------------
var _nrm = { x: 0, y: 1, z: 0 };
T.VOID = -600;

T.hAt = function (x, z) {
  var fi = (x + T.half) / T.CS, fj = (z + T.half) / T.CS;
  if (fi < 0 || fj < 0 || fi >= T.N || fj >= T.N) return T.VOID;
  var i = fi | 0, j = fj | 0, u = fi - i, v = fj - j, np = T.N + 1, H = T.H;
  var h00 = H[j * np + i], h10 = H[j * np + i + 1], h01 = H[(j + 1) * np + i], h11 = H[(j + 1) * np + i + 1];
  if (u + v < 1) return h00 + (h10 - h00) * u + (h01 - h00) * v;
  return h11 + (h10 - h11) * (1 - v) + (h01 - h11) * (1 - u);
};

T.normAt = function (x, z) {
  var fi = (x + T.half) / T.CS, fj = (z + T.half) / T.CS;
  if (fi < 0 || fj < 0 || fi >= T.N || fj >= T.N) { _nrm.x = 0; _nrm.y = 1; _nrm.z = 0; return _nrm; }
  var i = fi | 0, j = fj | 0, u = fi - i, v = fj - j, np = T.N + 1, H = T.H;
  var h00 = H[j * np + i], h10 = H[j * np + i + 1], h01 = H[(j + 1) * np + i], h11 = H[(j + 1) * np + i + 1];
  var dx, dz;
  if (u + v < 1) { dx = (h10 - h00) / T.CS; dz = (h01 - h00) / T.CS; }
  else { dx = (h11 - h01) / T.CS; dz = (h11 - h10) / T.CS; }
  var l = Math.sqrt(dx * dx + dz * dz + 1);
  _nrm.x = -dx / l; _nrm.y = 1 / l; _nrm.z = -dz / l;
  return _nrm;
};

var _snrm = { x: 0, y: 1, z: 0 };
T.normSmooth = function (x, z, rad) {
  var d = rad || 1.15;
  var hl = T.hAt(x - d, z), hr = T.hAt(x + d, z);
  var hb = T.hAt(x, z - d), hf = T.hAt(x, z + d);
  if (hl <= T.VOID || hr <= T.VOID || hb <= T.VOID || hf <= T.VOID) { _snrm.x = 0; _snrm.y = 1; _snrm.z = 0; return _snrm; }
  var dx = (hr - hl) / (2 * d), dz = (hf - hb) / (2 * d);
  var l = Math.sqrt(dx * dx + dz * dz + 1);
  _snrm.x = -dx / l; _snrm.y = 1 / l; _snrm.z = -dz / l;
  return _snrm;
};

T.surfAt = function (x, z) {
  var i = ((x + T.half) / T.CS) | 0, j = ((z + T.half) / T.CS) | 0;
  if (i < 0 || j < 0 || i >= T.N || j >= T.N) return SF.ROCK;
  return T.SURF[j * T.N + i];
};

T.cellOf = function (x, z) {
  var i = ((x + T.half) / T.CS) | 0, j = ((z + T.half) / T.CS) | 0;
  if (i < 0 || j < 0 || i >= T.N || j >= T.N) return -1;
  return j * T.N + i;
};

T.ray = function (ox, oy, oz, dx, dy, dz, maxD, step, out) {
  var t = 0.35, s = step || 0.7, px, py, pz, h, pt = 0;
  while (t < maxD) {
    px = ox + dx * t; py = oy + dy * t; pz = oz + dz * t;
    h = T.hAt(px, pz);
    if (h > T.VOID && py <= h) {
      var a = pt, b = t, m;
      for (var k = 0; k < 12; k++) {
        m = (a + b) * 0.5;
        if (oy + dy * m <= T.hAt(ox + dx * m, oz + dz * m)) b = m; else a = m;
      }
      out.x = ox + dx * a; out.y = oy + dy * a; out.z = oz + dz * a; out.d = a; out.hit = true;
      return out;
    }
    pt = t;
    t += s + Math.max(0, (py - h) * 0.35);
  }
  out.hit = false; out.d = maxD;
  out.x = ox + dx * maxD; out.y = oy + dy * maxD; out.z = oz + dz * maxD;
  return out;
};

// ---- spawn and placement safety --------------------------------------
// Nothing is ever dropped into the world at a guessed height.  Every spawn
// point, item and prop resolves its own ground first and is rejected if the
// ground is not somewhere a body could actually stand.
T.standable = function (x, z, minY) {
  var h = T.hAt(x, z);
  if (h <= T.VOID) return null;
  if (h < (minY === undefined ? 0.6 : minY)) return null;      // in the sea
  if (T.normSmooth(x, z, 1.0).y < K.WALK_COS + 0.06) return null;
  // a boulder sits here, so the collision surface is not the terrain height:
  // anything dropped at h would end up buried in the rock
  if (typeof Props !== 'undefined' && Props.hash && Props.capHeight(x, z, h) - h > 0.3) return null;
  return h;
};

// find solid, walkable ground near (x,z); returns {x,y,z} or null
T.findGround = function (x, z, rad, minY) {
  var h = T.standable(x, z, minY);
  if (h !== null) return { x: x, y: h, z: z };
  var rings = [rad * 0.35, rad * 0.7, rad];
  for (var ri = 0; ri < rings.length; ri++) {
    for (var k = 0; k < 12; k++) {
      var a = k / 12 * 6.283, px = x + Math.cos(a) * rings[ri], pz = z + Math.sin(a) * rings[ri];
      h = T.standable(px, pz, minY);
      if (h !== null) return { x: px, y: h, z: pz };
    }
  }
  return null;
};
