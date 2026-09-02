// ---- surface classification ------------------------------------------
T.classify = function (rng) {
  var N = T.N, n = T.noise;
  var S = T.SURF = new Uint8Array(N * N);
  T.BROKEN = new Uint8Array(N * N);
  T.rests = [];
  var restGrid = {}, i, j;

  for (j = 0; j < N; j++) {
    for (i = 0; i < N; i++) {
      var x = T.wx(i) + T.CS * 0.5, z = T.wx(j) + T.CS * 0.5;
      var h = T.hAt(x, z), ny = T.normAt(x, z).y;
      var flat = ny > 0.72, steep = ny < 0.5;
      var rd = T.routeDist(x, z);
      var v = n.fbm(x * 0.035, z * 0.035, 3);
      var w = n.fbm(x * 0.017 + 60, z * 0.017 - 30, 2);
      var s;

      if (h >= K.BAND_TOP - 8) {
        s = SF.ROCK;
        if (steep && v > 0.34) s = SF.EMBER;
      } else if (h >= K.BAND_ALP - 6) {
        s = flat ? SF.SNOW : SF.ROCK;
        if (steep && w > -0.1) s = SF.ICE;
        else if (!flat && v > 0.42) s = SF.ICE;
      } else if (h >= K.BAND_ROCK - 4) {
        s = flat ? SF.ROCK : SF.ROCK;
        if (steep && v < -0.36 && rd > 16) s = SF.LOOSE;
        else if (steep && h < K.BAND_ROCK + 46 && w > 0.30) s = SF.VINE;
      } else {
        s = flat ? SF.GRASS : SF.DIRT;
        if (steep && v > 0.06) s = SF.VINE;
      }
      S[j * N + i] = s;

      // Rest points: pitons hammered into steep rock near the line.  The
      // spacing grid is three-dimensional, so a tall wall gets a place to
      // hang every dozen metres of height rather than one for the whole face.
      if (steep && h > 26 && rd < 32 && n.cell(i * 1.9, j * 1.9) > 0.42) {
        var key = Math.round(x / 13) + ':' + Math.round(h / 13) + ':' + Math.round(z / 13);
        if (!restGrid[key]) {
          restGrid[key] = 1;
          T.rests.push({ x: x, y: h, z: z });
        }
      }
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

// exact facet normal, matching the triangle you can see
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

// averaged normal over a wider stencil: stable enough to drive movement
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
  if (T.BROKEN[j * T.N + i]) return SF.ROCK;
  return T.SURF[j * T.N + i];
};

T.cellOf = function (x, z) {
  var i = ((x + T.half) / T.CS) | 0, j = ((z + T.half) / T.CS) | 0;
  if (i < 0 || j < 0 || i >= T.N || j >= T.N) return -1;
  return j * T.N + i;
};

// march a ray against the field; used for pings and camera pull-in
T.ray = function (ox, oy, oz, dx, dy, dz, maxD, step, out) {
  var t = 0.4, s = step || 0.7, px, py, pz, h, pt = 0, ph = 0;
  while (t < maxD) {
    px = ox + dx * t; py = oy + dy * t; pz = oz + dz * t;
    h = T.hAt(px, pz);
    if (h > T.VOID && py <= h) {
      // bisect between the last miss and this hit
      var a = pt, b = t, m;
      for (var k = 0; k < 12; k++) {
        m = (a + b) * 0.5;
        if (oy + dy * m <= T.hAt(ox + dx * m, oz + dz * m)) b = m; else a = m;
      }
      out.x = ox + dx * a; out.y = oy + dy * a; out.z = oz + dz * a; out.d = a; out.hit = true;
      return out;
    }
    pt = t; ph = h;
    t += s + Math.max(0, (py - h) * 0.35);
  }
  out.hit = false; out.d = maxD;
  out.x = ox + dx * maxD; out.y = oy + dy * maxD; out.z = oz + dz * maxD;
  return out;
};

// horizontal direction pointing away from the slope (out of the wall)
T.outward = function (x, z, out, rad) {
  var n = T.normSmooth(x, z, rad || 1.6);
  var l = Math.sqrt(n.x * n.x + n.z * n.z);
  if (l < 1e-4) { out.x = 0; out.z = 1; return false; }
  out.x = n.x / l; out.z = n.z / l;
  return true;
};

// is this spot somewhere a body can rest and breathe?
T.isRestable = function (x, z) { return T.normSmooth(x, z).y > 0.80; };
