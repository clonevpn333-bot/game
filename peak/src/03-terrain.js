// ============================================================ TERRAIN
// One island: a shore ring, a cone through four bands of rock, a caldera
// moat below the summit, and the spire itself.  Terracing breaks the cone
// into shelves and risers - shelves are where you get your breath back.
var T = {
  N: K.GRID, CS: K.CELL,
  half: K.GRID * K.CELL * 0.5,
  H: null,          // (N+1)^2 vertex heights
  SURF: null,       // N^2 cell surface kinds
  spine: [],        // waypoints used to place camps, not to shape the rock
  camps: [],
  seed: 1,
  noise: null,
};

T.wx = function (i) { return i * T.CS - T.half; };
T.wi = function (x) { return (x + T.half) / T.CS; };

// ---- smooth radial profile -------------------------------------------
var PROF_T = [1.00, 0.94, 0.88, 0.80, 0.70, 0.60, 0.50, 0.40, 0.30, 0.22, 0.14];
var PROF_H = [0, 5, 14, 34, 72, 112, 152, 192, 226, 250, 262];
function profile(t) {
  if (t >= 1) return 0;
  if (t <= PROF_T[PROF_T.length - 1]) return PROF_H[PROF_H.length - 1];
  for (var i = 0; i < PROF_T.length - 1; i++) {
    if (t <= PROF_T[i] && t >= PROF_T[i + 1]) {
      var u = (PROF_T[i] - t) / (PROF_T[i] - PROF_T[i + 1]);
      return lerp(PROF_H[i], PROF_H[i + 1], smooth(u));
    }
  }
  return 0;
}

// The crown: a rim, a moat you drop into, and the spire you climb out on.
var CROWN_R = [0, 15, 23, 30, 40, 47, 55, 64, 74];
var CROWN_H = [302, 289, 264, 241, 236, 246, 262, 258, 250];
function crown(r) {
  if (r >= CROWN_R[CROWN_R.length - 1]) return null;
  for (var i = 0; i < CROWN_R.length - 1; i++) {
    if (r >= CROWN_R[i] && r <= CROWN_R[i + 1]) {
      var u = (r - CROWN_R[i]) / (CROWN_R[i + 1] - CROWN_R[i]);
      return lerp(CROWN_H[i], CROWN_H[i + 1], smooth(u));
    }
  }
  return null;
}

// ---- camp spine -------------------------------------------------------
T.buildSpine = function (rng) {
  var a = rng() * Math.PI * 2, pts = [], i, t, r;
  var swirl = rngRange(rng, -1.0, 1.0);
  for (i = 0; i <= 24; i++) {
    t = 1 - i / 24;
    a += swirl * 0.08 + (rng() - 0.5) * 0.18;
    r = Math.max(30, t * K.BASE_R * 0.97);
    pts.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, y: profile(t), t: t });
  }
  return pts;
};

// ---- the height field -------------------------------------------------
T.rawHeight = function (x, z) {
  var n = T.noise;
  var wx = x + n.fbm(x * 0.0041, z * 0.0041, 2) * 14;
  var wz = z + n.fbm(x * 0.0041 + 41.7, z * 0.0041 - 18.3, 2) * 14;
  var r = Math.sqrt(wx * wx + wz * wz);
  var ang = Math.atan2(wz, wx);

  var spur = n.ridge(Math.cos(ang) * 2.25 + 13.1, Math.sin(ang) * 2.25 - 6.7, 4);
  var rEff = r * (1 - 0.15 * spur + 0.07 * n.fbm(wx * 0.0062, wz * 0.0062, 3));
  var t = clamp(rEff / K.BASE_R, 0, 1);

  if (t >= 1) {
    // the shore shelf and the sea floor beyond it
    var d = rEff - K.BASE_R;
    return Math.max(-6, 2.2 - d * 0.16 + n.fbm(x * 0.02, z * 0.02, 2) * 1.1);
  }

  var h = profile(t);
  var band = 1 - t;
  h += n.fbm(wx * 0.0072, wz * 0.0072, 2) * (4 + 8 * band);
  h += (n.ridge(wx * 0.0068, wz * 0.0068, 2) - 0.5) * (4 + 9 * band);

  // Terracing: most of each step of height is spent on a near-flat shelf,
  // the rest on a short riser.  Uniform across the mountain - there is no
  // marked line, every face is fair game.
  var strength = h < 24 ? 0.42 : 0.86;
  strength *= 0.86 + 0.14 * (n.fbm(wx * 0.0088 + 7, wz * 0.0088 + 3, 2) * 0.5 + 0.5);
  var stp = 8.5 + 8.5 * (n.fbm(wx * 0.0105 - 22, wz * 0.0105 + 15, 2) * 0.5 + 0.5);
  var ledge = 0.55;
  var f = h / stp - Math.floor(h / stp);
  var s = smoother(clamp((f - ledge) / (0.86 - ledge), 0, 1));
  h += (lerp(f, s, strength) - f) * stp;
  h += n.fbm(wx * 0.038, wz * 0.038, 2) * 0.45;

  // the crown overrides the cone near the axis
  var cr = Math.sqrt(x * x + z * z);
  var cw = crown(cr);
  if (cw !== null) {
    var blend = 1 - step01(56, 74, cr);
    var wob = n.fbm(x * 0.028, z * 0.028, 2) * 2.6;
    h = lerp(h, cw + wob, blend);
  }
  return h;
};

T.build = function (seed) {
  T.seed = seed >>> 0;
  T.noise = new Noise(T.seed);
  var rng = makeRng(T.seed ^ 0x9e3779b9);
  T.spine = T.buildSpine(rng);

  var N = T.N, np = N + 1;
  var H = T.H = new Float32Array(np * np);
  var x, z, i, j, c;
  for (j = 0; j < np; j++) {
    z = T.wx(j);
    for (i = 0; i < np; i++) H[j * np + i] = T.rawHeight(T.wx(i), z);
  }

  // Camps: the crash site down on the shore, then one below each fog wall.
  // Chosen against the height field that actually exists, walking outward to
  // inward so they always come in order - picking them off the smooth profile
  // put them metres away from the real ground and sometimes out of sequence.
  var wantY = [7, ZONES[0].fire, ZONES[1].fire, ZONES[2].fire, ZONES[3].fire, ZONES[4].fire];
  var cand = [];
  for (i = 0; i <= 260; i++) {
    var u = i / 260 * (T.spine.length - 1);
    var i0 = Math.floor(u), fr = u - i0, a0 = T.spine[i0], a1 = T.spine[Math.min(i0 + 1, T.spine.length - 1)];
    var sx = lerp(a0.x, a1.x, fr), sz = lerp(a0.z, a1.z, fr);
    // let the outermost samples reach past the spine, out onto the beach
    var scale = i < 26 ? lerp(1.16, 1.0, i / 26) : 1;
    sx *= scale; sz *= scale;
    var sh = T.hAt(sx, sz);
    if (sh <= T.VOID) continue;
    if (T.normSmooth(sx, sz, 1.4).y < K.WALK_COS + 0.10) continue;   // must be standable
    cand.push({ x: sx, z: sz, y: sh, u: u });
  }
  T.camps = [];
  var from = 0;
  for (c = 0; c < wantY.length; c++) {
    var bestI = -1, bd = 1e9;
    for (i = from; i < cand.length; i++) {
      var dd = Math.abs(cand[i].y - wantY[c]);
      if (dd < bd) { bd = dd; bestI = i; }
    }
    if (bestI < 0) bestI = Math.min(from, cand.length - 1);
    var cc = cand[bestI];
    T.camps.push({ x: cc.x, z: cc.z, y: cc.y, idx: c });
    from = Math.min(bestI + 8, cand.length - 1);
  }

  // flatten a shelf under each camp so there is somewhere solid to stand
  for (c = 0; c < T.camps.length; c++) {
    var cp = T.camps[c], rad = c === 0 ? 20 : 13;
    var ci = T.wi(cp.x), cj = T.wi(cp.z);
    var lo = Math.max(0, Math.floor(ci - rad / T.CS) - 2), hi = Math.min(N, Math.ceil(ci + rad / T.CS) + 2);
    var lo2 = Math.max(0, Math.floor(cj - rad / T.CS) - 2), hi2 = Math.min(N, Math.ceil(cj + rad / T.CS) + 2);
    var sum = 0, cnt = 0, dx, dz;
    for (j = lo2; j <= hi2; j++) for (i = lo; i <= hi; i++) {
      dx = T.wx(i) - cp.x; dz = T.wx(j) - cp.z;
      if (dx * dx + dz * dz < rad * rad * 0.34) { sum += H[j * np + i]; cnt++; }
    }
    var target = cnt ? sum / cnt : 0;
    for (j = lo2; j <= hi2; j++) for (i = lo; i <= hi; i++) {
      dx = T.wx(i) - cp.x; dz = T.wx(j) - cp.z;
      var w = 1 - step01(rad * 0.45, rad, Math.sqrt(dx * dx + dz * dz));
      if (w > 0) H[j * np + i] = lerp(H[j * np + i], target, w);
    }
    cp.y = target;
  }

  T.classify();
};
