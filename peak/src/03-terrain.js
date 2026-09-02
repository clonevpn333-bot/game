// ============================================================ TERRAIN
// A heightfield mountain.  Terracing turns a smooth cone into stacked
// ledges and near-vertical risers, which is what makes it climbable
// instead of just steep.
var T = {
  N: K.GRID, CS: K.CELL,
  half: K.GRID * K.CELL * 0.5,
  H: null,          // (N+1)^2 vertex heights
  SURF: null,       // N^2 cell surface kinds
  BROKEN: null,     // N^2 crumble flags
  route: [],        // waypoint spine from base camp to summit
  camps: [],        // {x,y,z,band}
  seed: 1,
  noise: null,
};

T.ix = function (i, j) { return j * (T.N + 1) + i; };
T.wx = function (i) { return i * T.CS - T.half; };
T.wi = function (x) { return (x + T.half) / T.CS; };

// ---- smooth radial profile -------------------------------------------
var PROF_T = [1.00, 0.92, 0.84, 0.74, 0.64, 0.54, 0.44, 0.34, 0.24, 0.14, 0.06, 0.00];
var PROF_H = [0, 7, 20, 46, 78, 114, 152, 192, 230, 264, 290, 302];
function profile(t) {
  if (t >= 1) return 0;
  if (t <= 0) return K.SUMMIT_H;
  for (var i = 0; i < PROF_T.length - 1; i++) {
    if (t <= PROF_T[i] && t >= PROF_T[i + 1]) {
      var u = (PROF_T[i] - t) / (PROF_T[i] - PROF_T[i + 1]);
      return lerp(PROF_H[i], PROF_H[i + 1], smooth(u));
    }
  }
  return 0;
}

// ---- route spine ------------------------------------------------------
// A wandering line from the apron to the summit.  The seed rotates and
// bends it, so every run climbs a different face.
T.buildRoute = function (rng) {
  var a = rng() * Math.PI * 2, pts = [], i, t, r, y;
  var swirl = rngRange(rng, -1.15, 1.15);
  for (i = 0; i <= 22; i++) {
    t = 1 - i / 22;                       // 1 at base -> 0 at summit
    a += swirl * 0.085 + (rng() - 0.5) * 0.22;
    r = t * K.BASE_R * 0.985;
    y = profile(t);
    pts.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, y: y, t: t });
  }
  return pts;
};

// squared distance from (x,z) to the route polyline, in world units
T.routeDist = function (x, z) {
  var best = 1e9, p = T.route, i, ax, az, bx, bz, dx, dz, u, cx, cz, d;
  for (i = 0; i < p.length - 1; i++) {
    ax = p[i].x; az = p[i].z; bx = p[i + 1].x; bz = p[i + 1].z;
    dx = bx - ax; dz = bz - az;
    u = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1), 0, 1);
    cx = ax + dx * u - x; cz = az + dz * u - z;
    d = cx * cx + cz * cz;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
};

// ---- the height field -------------------------------------------------
T.rawHeight = function (x, z) {
  var n = T.noise;
  // domain warp so the terraces wander instead of ringing the cone
  var wx = x + n.fbm(x * 0.0041, z * 0.0041, 2) * 14;
  var wz = z + n.fbm(x * 0.0041 + 41.7, z * 0.0041 - 18.3, 2) * 14;
  var r = Math.sqrt(wx * wx + wz * wz);
  var ang = Math.atan2(wz, wx);

  // spurs and gullies: ridged noise sampled around a circle stays seamless
  var spur = n.ridge(Math.cos(ang) * 2.25 + 13.1, Math.sin(ang) * 2.25 - 6.7, 4);
  var rEff = r * (1 - 0.155 * spur + 0.075 * n.fbm(wx * 0.0062, wz * 0.0062, 3));
  var t = clamp(rEff / K.BASE_R, 0, 1);
  var h = profile(t);
  if (t >= 1) {
    // the plain: nearly flat with soft dunes so the horizon is not a disc
    return Math.max(0, n.fbm(x * 0.012, z * 0.012, 3) * 2.4 + 1.2);
  }

  var band = 1 - t;                      // 0 at the bottom, 1 at the top
  // Detail noise stays long-wavelength on purpose.  Anything finer adds
  // more slope than the mountain itself has, which crushes every terrace
  // shelf below the width of one grid cell and leaves a featureless ramp.
  h += n.fbm(wx * 0.0072, wz * 0.0072, 2) * (5 + 9 * band);
  h += (n.ridge(wx * 0.0068, wz * 0.0068, 2) - 0.5) * (4 + 10 * band);

  // Terracing turns the smooth cone into shelf / riser / shelf.  A period
  // is one step of height: the first LEDGE fraction of it is nearly flat
  // (somewhere to stand and breathe), the rest is the wall you climb.
  // Along the route the shelves get wider and the risers shorter, so the
  // seed always leaves a line that a tired group can actually follow.
  var rd = T.routeDist(x, z);
  var near = step01(10, 44, rd);        // 0 on the line, 1 far off it
  var strength;
  if (h < K.BAND_ROCK) strength = 0.55;
  else if (h < K.BAND_ALP) strength = 0.88;
  else if (h < K.BAND_TOP) strength = 0.80;
  else strength = 0.84;
  strength = lerp(0.93, strength, near);
  strength *= 0.86 + 0.14 * (n.fbm(wx * 0.0088 + 7, wz * 0.0088 + 3, 2) * 0.5 + 0.5);

  var stp = (12 + 8 * (n.fbm(wx * 0.0105 - 22, wz * 0.0105 + 15, 2) * 0.5 + 0.5)) * lerp(0.86, 1, near);
  var ledge = lerp(0.62, 0.46, near);   // fraction of the step spent flat
  var f = h / stp - Math.floor(h / stp);
  var s = smoother(clamp((f - ledge) / (0.86 - ledge), 0, 1));
  // Written as a bounded offset rather than (floor(k)+g)*step: with step
  // varying across the mountain the floor(k)*step form shears the whole
  // surface steeper, which quietly turned every shelf into more wall.
  h += (lerp(f, s, strength) - f) * stp;

  // a last shallow ripple so shelves are not glassy and riser lines wander
  h += n.fbm(wx * 0.038, wz * 0.038, 2) * 0.45;
  return h;
};

T.build = function (seed) {
  T.seed = seed >>> 0;
  T.noise = new Noise(T.seed);
  var rng = makeRng(T.seed ^ 0x9e3779b9);
  T.route = T.buildRoute(rng);

  // camps sit on the route at fixed altitude bands, flattened into shelves
  var wantY = [4, 62, 140, 214, 276];
  T.camps = [];
  var i, c;
  for (c = 0; c < wantY.length; c++) {
    var bestI = 0, bestD = 1e9;
    for (i = 0; i < T.route.length; i++) {
      var d = Math.abs(T.route[i].y - wantY[c]);
      if (d < bestD) { bestD = d; bestI = i; }
    }
    var p = T.route[bestI];
    T.camps.push({ x: p.x, z: p.z, y: 0, idx: c, lit: c === 0, ri: bestI });
  }

  var N = T.N, np = N + 1;
  var H = T.H = new Float32Array(np * np);
  var x, z, j;
  for (j = 0; j < np; j++) {
    z = T.wx(j);
    for (i = 0; i < np; i++) {
      x = T.wx(i);
      H[j * np + i] = T.rawHeight(x, z);
    }
  }

  // flatten a shelf under every camp so the group has somewhere to stand
  for (c = 0; c < T.camps.length; c++) {
    var cp = T.camps[c], rad = c === 0 ? 20 : 12.5;
    var ci = T.wi(cp.x), cj = T.wi(cp.z);
    var lo = Math.max(0, Math.floor(ci - rad / T.CS) - 2), hi = Math.min(N, Math.ceil(ci + rad / T.CS) + 2);
    var lo2 = Math.max(0, Math.floor(cj - rad / T.CS) - 2), hi2 = Math.min(N, Math.ceil(cj + rad / T.CS) + 2);
    var sum = 0, cnt = 0;
    for (j = lo2; j <= hi2; j++) for (i = lo; i <= hi; i++) {
      var dx = T.wx(i) - cp.x, dz = T.wx(j) - cp.z;
      if (dx * dx + dz * dz < rad * rad * 0.36) { sum += H[j * np + i]; cnt++; }
    }
    var target = cnt ? sum / cnt : cp.y;
    for (j = lo2; j <= hi2; j++) for (i = lo; i <= hi; i++) {
      dx = T.wx(i) - cp.x; dz = T.wx(j) - cp.z;
      var dd = Math.sqrt(dx * dx + dz * dz);
      var w = 1 - step01(rad * 0.5, rad, dd);
      if (w > 0) H[j * np + i] = lerp(H[j * np + i], target, w);
    }
    cp.y = target;
  }

  // summit dome: a clean crown, no terrace steps on the very top
  for (j = 0; j < np; j++) for (i = 0; i < np; i++) {
    x = T.wx(i); z = T.wx(j);
    var rr = Math.sqrt(x * x + z * z);
    if (rr < 26) {
      var w2 = 1 - step01(14, 26, rr);
      H[j * np + i] = lerp(H[j * np + i], K.SUMMIT_H - rr * 0.34, w2 * 0.85);
    }
  }

  T.classify(rng);
};
