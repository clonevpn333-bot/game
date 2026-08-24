/* =========================================================================
 * CORE — constants, deterministic RNG, noise fields, small math helpers.
 * SHARED: this module is loaded both on the main thread and inside the
 * terrain worker, so it must never touch the DOM.
 * ========================================================================= */

var CH_W = 16;          // chunk width / depth in blocks
var CH_H = 256;         // world height (internal y, 0 = bedrock)
var SECT = 16;          // section height
var N_SECT = CH_H / SECT;
var CH_AREA = CH_W * CH_W;
var CH_VOL = CH_W * CH_W * CH_H;
var SEA = 100;          // sea level (internal y)
var DEEPSLATE_Y = 48;   // deepslate transition band centre
var CLOUD_Y = 192;

var DIM_OVERWORLD = 0, DIM_NETHER = 1, DIM_END = 2;

/* ---------------------------------------------------------------- maths -- */
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function lerp(a, b, t) { return a + (b - a) * t; }
function smoothstep(t) { return t * t * (3 - 2 * t); }
function smootherstep(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
function invLerp(a, b, v) { return b === a ? 0 : (v - a) / (b - a); }
function sign(v) { return v < 0 ? -1 : (v > 0 ? 1 : 0); }
function fract(v) { return v - Math.floor(v); }
function mod(a, n) { return ((a % n) + n) % n; }
function dist2(x, z) { return Math.sqrt(x * x + z * z); }
function dist3(x, y, z) { return Math.sqrt(x * x + y * y + z * z); }
function approach(cur, target, rate) {
  if (cur < target) return Math.min(target, cur + rate);
  return Math.max(target, cur - rate);
}
function angleLerp(a, b, t) {
  var d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  return a + d * t;
}
function angleDiff(a, b) {
  return ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
}

/* --------------------------------------------------------------- random -- */
/* mulberry32: tiny, fast, good enough for worldgen decoration. */
function makeRNG(seed) {
  var a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/* Deterministic integer hash of a coordinate triple + salt. */
function hash3(x, y, z, salt) {
  var h = (x | 0) * 374761393 + (y | 0) * 668265263 + (z | 0) * 2147483647 + (salt | 0) * 1274126177;
  h = (h ^ (h >>> 13)) | 0;
  h = Math.imul(h, 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}
function hash2(x, z, salt) { return hash3(x, 0, z, salt); }
function rand3(x, y, z, salt) { return hash3(x, y, z, salt) / 4294967296; }
function rand2(x, z, salt) { return hash3(x, 0, z, salt) / 4294967296; }
/* An RNG seeded reproducibly from a chunk coordinate. */
function chunkRNG(cx, cz, salt) { return makeRNG(hash2(cx, cz, salt)); }

function pick(rng, arr) { return arr[(rng() * arr.length) | 0]; }
function randInt(rng, a, b) { return a + ((rng() * (b - a + 1)) | 0); }
function randRange(rng, a, b) { return a + rng() * (b - a); }

/* ---------------------------------------------------------------- noise -- */
/* Classic improved-Perlin with a seeded permutation table. */
function Perlin(seed) {
  var p = new Uint8Array(512);
  var perm = new Uint8Array(256);
  var i;
  for (i = 0; i < 256; i++) perm[i] = i;
  var rng = makeRNG(seed);
  for (i = 255; i > 0; i--) {
    var j = (rng() * (i + 1)) | 0;
    var t = perm[i]; perm[i] = perm[j]; perm[j] = t;
  }
  for (i = 0; i < 512; i++) p[i] = perm[i & 255];
  this.p = p;
}
Perlin.prototype.grad3 = function (h, x, y, z) {
  switch (h & 15) {
    case 0: return x + y;   case 1: return -x + y;  case 2: return x - y;   case 3: return -x - y;
    case 4: return x + z;   case 5: return -x + z;  case 6: return x - z;   case 7: return -x - z;
    case 8: return y + z;   case 9: return -y + z;  case 10: return y - z;  case 11: return -y - z;
    case 12: return x + y;  case 13: return -y + z; case 14: return -x + y; default: return -y - z;
  }
};
Perlin.prototype.noise3 = function (x, y, z) {
  var p = this.p;
  var X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
  x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
  var u = smootherstep(x), v = smootherstep(y), w = smootherstep(z);
  var A = p[X] + Y, AA = p[A] + Z, AB = p[A + 1] + Z;
  var B = p[X + 1] + Y, BA = p[B] + Z, BB = p[B + 1] + Z;
  var g = this.grad3;
  return lerp(
    lerp(lerp(g(p[AA], x, y, z), g(p[BA], x - 1, y, z), u),
         lerp(g(p[AB], x, y - 1, z), g(p[BB], x - 1, y - 1, z), u), v),
    lerp(lerp(g(p[AA + 1], x, y, z - 1), g(p[BA + 1], x - 1, y, z - 1), u),
         lerp(g(p[AB + 1], x, y - 1, z - 1), g(p[BB + 1], x - 1, y - 1, z - 1), u), v), w);
};
Perlin.prototype.noise2 = function (x, z) { return this.noise3(x, 0.5, z); };

/* Fractal browninan motion wrapper with configurable octaves/lacunarity/gain */
function FBM(seed, octaves, freq, gain, lacunarity) {
  this.n = [];
  this.oct = octaves;
  this.freq = freq;
  this.gain = gain === undefined ? 0.5 : gain;
  this.lac = lacunarity === undefined ? 2.0 : lacunarity;
  var norm = 0, amp = 1;
  for (var i = 0; i < octaves; i++) { this.n.push(new Perlin(seed + i * 7919)); norm += amp; amp *= this.gain; }
  this.norm = norm;
}
FBM.prototype.get2 = function (x, z) {
  var f = this.freq, a = 1, s = 0;
  for (var i = 0; i < this.oct; i++) { s += this.n[i].noise2(x * f, z * f) * a; f *= this.lac; a *= this.gain; }
  return s / this.norm;
};
FBM.prototype.get3 = function (x, y, z) {
  var f = this.freq, a = 1, s = 0;
  for (var i = 0; i < this.oct; i++) { s += this.n[i].noise3(x * f, y * f, z * f) * a; f *= this.lac; a *= this.gain; }
  return s / this.norm;
};
/* ridged variant — sharp crests, used for mountain spines */
FBM.prototype.ridged2 = function (x, z) {
  var f = this.freq, a = 1, s = 0;
  for (var i = 0; i < this.oct; i++) {
    var v = 1 - Math.abs(this.n[i].noise2(x * f, z * f)) * 2;
    s += v * v * a; f *= this.lac; a *= this.gain;
  }
  return s / this.norm;
};

/* A piecewise-linear spline: pts = [[x0,y0],[x1,y1],...] sorted by x. */
function Spline(pts) { this.pts = pts; }
Spline.prototype.get = function (x) {
  var p = this.pts, n = p.length;
  if (x <= p[0][0]) return p[0][1];
  if (x >= p[n - 1][0]) return p[n - 1][1];
  for (var i = 1; i < n; i++) {
    if (x <= p[i][0]) {
      var t = invLerp(p[i - 1][0], p[i][0], x);
      return lerp(p[i - 1][1], p[i][1], smoothstep(t));
    }
  }
  return p[n - 1][1];
};

/* Voronoi-ish cell lookup — returns {id, dist, cx, cz} of nearest feature
   point on a jittered grid.  Used for biome region shaping and structures. */
function cellPoint(gx, gz, cell, salt) {
  var jx = rand2(gx, gz, salt) - 0.5;
  var jz = rand2(gx, gz, salt + 1) - 0.5;
  return [(gx + 0.5 + jx * 0.85) * cell, (gz + 0.5 + jz * 0.85) * cell];
}
function nearestCell(x, z, cell, salt) {
  var gx = Math.floor(x / cell), gz = Math.floor(z / cell);
  var best = 1e9, bx = 0, bz = 0, bgx = 0, bgz = 0, second = 1e9;
  for (var dz = -1; dz <= 1; dz++) for (var dx = -1; dx <= 1; dx++) {
    var pt = cellPoint(gx + dx, gz + dz, cell, salt);
    var d = (pt[0] - x) * (pt[0] - x) + (pt[1] - z) * (pt[1] - z);
    if (d < best) { second = best; best = d; bx = pt[0]; bz = pt[1]; bgx = gx + dx; bgz = gz + dz; }
    else if (d < second) second = d;
  }
  return { d: Math.sqrt(best), d2: Math.sqrt(second), x: bx, z: bz, gx: bgx, gz: bgz };
}

/* ------------------------------------------------------------ misc util -- */
function chunkKey(cx, cz) { return cx + ',' + cz; }
function fmtTime(ticks) {
  var t = (ticks + 6000) % 24000;
  var h = Math.floor(t / 1000), m = Math.floor((t % 1000) / 1000 * 60);
  return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
}
