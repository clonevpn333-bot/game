/* =========================================================================
 * WORLD GENERATION — density terrain in the Caves & Cliffs style.
 *
 * Column height comes from a continentalness / erosion / peaks-and-valleys
 * spline stack; a coarse 3-D noise field (sampled every 4x8x4 and trilinearly
 * interpolated, the same trick the real game uses) turns that into cliffs and
 * overhangs.  Caves are carved from the same field: big "cheese" cavities,
 * intersecting "spaghetti" tunnels, and thin noodle caves, with aquifers
 * filling the low ones.
 *
 * Everything here is a pure function of (seed, x, z) so it can run in the
 * worker and stay stable across sessions.
 * ========================================================================= */

var WorldGen = {};
var WG = {};

/* section-local index */
function SIDX(x, y, z) { return ((y & 15) << 8) | (z << 4) | x; }

WorldGen.init = function (seed) {
  WG.seed = seed | 0;
  var s = WG.seed;
  WG.cont = new FBM(s + 101, 5, 1 / 1500, 0.5, 2.0);
  WG.ero = new FBM(s + 211, 4, 1 / 900, 0.5, 2.0);
  WG.pv = new FBM(s + 307, 4, 1 / 340, 0.5, 2.0);
  WG.weird = new FBM(s + 401, 3, 1 / 620, 0.5, 2.0);
  WG.temp = new FBM(s + 503, 3, 1 / 1900, 0.5, 2.0);
  WG.hum = new FBM(s + 601, 3, 1 / 1600, 0.5, 2.0);
  WG.river = new FBM(s + 709, 3, 1 / 1250, 0.5, 2.0);
  WG.detail = new FBM(s + 811, 4, 1 / 110, 0.5, 2.0);
  WG.dens3 = new FBM(s + 907, 4, 1 / 76, 0.5, 2.0);
  WG.cheese = new FBM(s + 1013, 3, 1 / 130, 0.55, 2.0);
  WG.spag1 = new FBM(s + 1109, 2, 1 / 92, 0.5, 2.0);
  WG.spag2 = new FBM(s + 1213, 2, 1 / 92, 0.5, 2.0);
  WG.noodle = new FBM(s + 1301, 2, 1 / 42, 0.5, 2.0);
  WG.aquifer = new FBM(s + 1409, 2, 1 / 210, 0.5, 2.0);
  WG.aqBarrier = new FBM(s + 1451, 2, 1 / 110, 0.5, 2.0);
  WG.oreN = new FBM(s + 1499, 2, 1 / 34, 0.5, 2.0);
  WG.caveBiome = new FBM(s + 1523, 2, 1 / 340, 0.5, 2.0);
  WG.surfN = new FBM(s + 1601, 3, 1 / 26, 0.5, 2.0);
  WG.bandN = new FBM(s + 1709, 2, 1 / 12, 0.5, 2.0);
  WG.netherN = new FBM(s + 1801, 4, 1 / 90, 0.5, 2.0);
  WG.netherBio = new FBM(s + 1901, 2, 1 / 420, 0.5, 2.0);
  WG.endN = new FBM(s + 2003, 4, 1 / 210, 0.5, 2.0);
  WG.endIsl = new FBM(s + 2111, 3, 1 / 620, 0.5, 2.0);
  WG.mush = new FBM(s + 2203, 2, 1 / 900, 0.5, 2.0);
  WG.ridge = new FBM(s + 2311, 4, 1 / 380, 0.5, 2.0);
  WG.jag = new FBM(s + 2411, 3, 1 / 120, 0.5, 2.0);

  /* --- shaping splines (x = noise value, y = blocks) --- */
  WG.splCont = new Spline([
    [-1.00, 34], [-0.65, 46], [-0.42, 62], [-0.28, 82], [-0.18, 94],
    [-0.10, 99], [-0.02, 104], [0.10, 110], [0.32, 118], [0.60, 126], [1.00, 134]
  ]);
  WG.splEro = new Spline([
    [-1.00, 1.00], [-0.80, 0.92], [-0.55, 0.72], [-0.30, 0.44],
    [-0.08, 0.24], [0.18, 0.12], [0.45, 0.06], [0.75, 0.035], [1.00, 0.02]
  ]);
  WG.splPV = new Spline([
    [0.00, 0.00], [0.22, 0.05], [0.45, 0.20], [0.62, 0.45], [0.80, 0.78], [1.00, 1.00]
  ]);
  WG.ready = true;
};

/* ------------------------------------------------------- climate probe -- */
/* fBm output is roughly gaussian and only spans about +-0.45, so every
   climate channel is stretched to fill [-1,1]; without this the extreme
   biomes (badlands, ice spikes, jungle) would essentially never appear. */
function spread(v, s) { v /= s; return v < -1 ? -1 : (v > 1 ? 1 : v); }
function climateAt(x, z) {
  var cont = spread(WG.cont.get2(x, z), 0.50);
  var ero = spread(WG.ero.get2(x + 9000, z - 4000), 0.40);
  var wei = spread(WG.weird.get2(x - 3000, z + 7000), 0.30);
  var pvRaw = WG.ridge.ridged2(x, z);
  var t = spread(WG.temp.get2(x + 21000, z + 5000), 0.40);
  var h = spread(WG.hum.get2(x - 17000, z - 11000), 0.40);
  return { cont: cont, ero: ero, weird: wei, pv: pvRaw, temp: t, hum: h };
}

/* Surface height for one column, in blocks (full resolution). */
function heightAt(x, z, cl) {
  return heightFrom(x, z, cl || climateAt(x, z));
}

/* -------------------------------------------------------- biome choice -- */
function pickBiome(x, z, h, cl) {
  var B = BIOME_ID;
  var oceanDepth = SEA - h;

  /* rare mushroom islands, out in deep water */
  if (h > SEA - 2 && cl.cont < -0.20 && spread(WG.mush.get2(x, z), 0.34) > 0.90) return B.mushroom_fields;

  if (h < SEA - 1) {
    var deep = oceanDepth > 30;
    var rv = Math.abs(WG.river.get2(x, z));
    if (rv < 0.05 && cl.cont > -0.16 && oceanDepth < 12) return cl.temp < -0.42 ? B.frozen_river : B.river;
    if (cl.temp < -0.5) return deep ? B.deep_frozen_ocean : B.frozen_ocean;
    if (cl.temp < -0.16) return deep ? B.deep_ocean : B.cold_ocean;
    if (cl.temp > 0.55) return B.warm_ocean;
    if (cl.temp > 0.2) return B.lukewarm_ocean;
    return deep ? B.deep_ocean : B.ocean;
  }

  /* shoreline */
  if (h < SEA + 2.5) {
    if (cl.temp < -0.42) return B.snowy_beach;
    if (cl.ero < -0.55) return B.stony_shore;
    return B.beach;
  }

  /* high ground overrides the climate table */
  if (h > SEA + 96) {
    if (cl.temp < -0.3) return WG.jag.get2(x, z) > 0.1 ? B.jagged_peaks : B.frozen_peaks;
    if (cl.temp < 0.25) return B.jagged_peaks;
    return B.stony_peaks;
  }
  if (h > SEA + 68) {
    if (cl.temp < -0.15) return B.snowy_slopes;
    if (cl.temp < 0.3) return B.grove;
    return B.windswept_hills;
  }
  if (h > SEA + 44 && cl.ero < -0.32) {
    if (cl.temp < -0.2) return B.snowy_slopes;
    if (cl.hum > 0.15) return B.windswept_forest;
    if (cl.ero < -0.62) return B.windswept_gravelly_hills;
    return B.windswept_hills;
  }

  var t = cl.temp, hm = cl.hum, w = cl.weird;

  /* ---- frozen ---- */
  if (t < -0.62) {
    if (hm < -0.45 && w > 0.35) return B.ice_spikes;
    if (hm > 0.10) return B.snowy_taiga;
    return B.snowy_plains;
  }
  /* ---- cold ---- */
  if (t < -0.25) {
    if (hm > 0.55) return w > 0 ? B.old_growth_spruce_taiga : B.old_growth_pine_taiga;
    if (hm > 0.05) return B.taiga;
    if (w > 0.55) return B.meadow;
    if (hm < -0.55) return B.snowy_plains;
    return B.plains;
  }
  /* ---- cool temperate ---- */
  if (t < 0.15) {
    if (hm > 0.6) return B.old_growth_pine_taiga;
    if (hm > 0.28) return B.taiga;
    if (w > 0.62) return B.cherry_grove;
    if (w < -0.62) return B.meadow;
    if (hm > -0.15) return w > 0.25 ? B.birch_forest : B.forest;
    return B.plains;
  }
  /* ---- warm temperate ---- */
  if (t < 0.50) {
    if (hm > 0.60) return w > 0.25 ? B.dark_forest : B.forest;
    if (hm > 0.20) return w < -0.45 ? B.old_growth_birch_forest : B.forest;
    if (hm > -0.20) {
      if (w > 0.60) return B.flower_forest;
      if (w < -0.60) return B.sunflower_plains;
      return B.plains;
    }
    if (w < -0.5) return B.pale_garden;
    return B.desert;
  }
  /* ---- warm ---- */
  if (t < 0.78) {
    if (hm > 0.55) return w > 0.35 ? B.mangrove_swamp : B.swamp;
    if (hm > 0.15) return w > 0.45 ? B.dark_forest : B.forest;
    if (hm > -0.30) return w > 0.55 ? B.windswept_savanna : (w < -0.55 ? B.savanna_plateau : B.savanna);
    return B.desert;
  }
  /* ---- hot ---- */
  if (hm > 0.45) return w > 0.4 ? B.bamboo_jungle : (w < -0.45 ? B.sparse_jungle : B.jungle);
  if (hm > 0.05) return B.jungle;
  if (hm > -0.30) return w > 0.5 ? B.savanna_plateau : B.savanna;
  if (w > 0.40) return B.wooded_badlands;
  if (w < -0.50) return B.eroded_badlands;
  if (hm < -0.60) return B.badlands;
  return B.desert;
}

/* ================================ CAVES ================================= */
/* All three cave families are thresholded against the *measured* spread of
   the noise (sigma ~ 0.17), which is what keeps them to a few percent of the
   rock volume instead of dissolving the whole world.
     cheese    - one-sided high threshold => isolated blobby caverns
     spaghetti - intersection of two thin sheets => winding tunnels
     noodle    - the same trick, thinner and deeper => tight worm caves      */
var CHEESE_T = 0.265, SPAG_T = 0.0335, NOODLE_T = 0.0250;

function caveField(x, y, z, surfaceH) {
  if (y < 4) return -1;
  var depth = surfaceH - y;
  if (depth < 5) return -1;
  /* soften the roof so caves rarely open straight onto the surface */
  var bias = depth < 16 ? (16 - depth) * 0.055 : 0;

  var c1 = WG.cheese.get3(x, y * 1.45, z);
  var cheese = (c1 - CHEESE_T - bias * 0.5) * 6.0;

  var s1 = WG.spag1.get3(x, y * 2.0, z);
  var s2 = WG.spag2.get3(x + 4000, y * 2.0, z - 4000);
  var st = SPAG_T - bias * 0.02;
  var sp = Math.min(st - Math.abs(s1), st - Math.abs(s2)) * 30;

  var nd = -1;
  if (y < surfaceH - 22 && y > 8) {
    var n1 = WG.noodle.get3(x, y * 1.15, z);
    var n2 = WG.noodle.get3(x - 9000, y * 1.15, z + 9000);
    nd = Math.min(NOODLE_T - Math.abs(n1), NOODLE_T - Math.abs(n2)) * 40;
  }
  return Math.max(cheese, sp, nd);
}

/* ============================== TERRAIN ================================= */
/* Climate is sampled on a 4-block lattice (5x5 per chunk) and interpolated,
   the way the real game keeps biomes at quarter resolution; the sharp
   channels - peaks-and-valleys, fine detail and rivers - stay full res. */
var GX = 4, GY = 8, GZ = 4;
var NGX = CH_W / GX + 1, NGY = CH_H / GY + 1, NGZ = CH_W / GZ + 1;
var CG = 4;
var NCX = CH_W / CG + 1, NCY = CH_H / CG + 1, NCZ = CH_W / CG + 1;
var _dbuf = new Float32Array(NGX * NGY * NGZ);
var _cbuf = new Float32Array(NCX * NCY * NCZ);
var _cbufTop = 0;
var _hCol = new Float32Array(CH_AREA);
var _eroCol = new Float32Array(CH_AREA);
var _bioCol = new Uint8Array(CH_AREA);
var _latH = new Float32Array(NGX * NGZ);
var _latE = new Float32Array(NGX * NGZ);
var _cc = [];      // coarse climate grid, 5x5

function gidx(gx, gy, gz) { return (gy * NGZ + gz) * NGX + gx; }
function cidx(gx, gy, gz) { return (gy * NCZ + gz) * NCX + gx; }

/* the slow, large-scale climate channels */
function coarseClimate(x, z) {
  return {
    cont: spread(WG.cont.get2(x, z), 0.50),
    ero: spread(WG.ero.get2(x + 9000, z - 4000), 0.40),
    weird: spread(WG.weird.get2(x - 3000, z + 7000), 0.30),
    temp: spread(WG.temp.get2(x + 21000, z + 5000), 0.40),
    hum: spread(WG.hum.get2(x - 17000, z - 11000), 0.40)
  };
}
/* height from an already-known climate sample, plus the full-res channels */
function heightFrom(x, z, cl) {
  var base = WG.splCont.get(cl.cont);
  var eroF = WG.splEro.get(cl.ero);
  var inland = clamp((cl.cont + 0.16) * 3.2, 0, 1);
  var peaks = WG.splPV.get(cl.pv) * eroF * 128 * inland;
  var jag = 0;
  if (eroF > 0.5 && peaks > 22) jag = Math.abs(WG.jag.get2(x, z)) * (eroF - 0.5) * 90;
  var detail = WG.detail.get2(x, z) * (14 + eroF * 48);
  var h = base + peaks + jag + detail * inland;
  var rv = Math.abs(WG.river.get2(x, z));
  if (rv < 0.024 && cl.cont > -0.16) {
    var t = 1 - rv / 0.024;
    var target = SEA - 3 - (1 - t) * 2;
    var cut = lerp(h, target, smoothstep(t) * clamp(1 - peaks / 60, 0.15, 1));
    if (cut < h) h = cut;
  }
  return h;
}

function buildDensity(cx, cz) {
  var bx = cx * CH_W, bz = cz * CH_W;
  var gx, gz, x, z, gy;

  /* 5x5 coarse climate */
  for (gz = 0; gz < NGZ; gz++) for (gx = 0; gx < NGX; gx++) {
    _cc[gz * NGX + gx] = coarseClimate(bx + gx * GX, bz + gz * GZ);
  }
  /* lattice heights (used by the density field) */
  for (gz = 0; gz < NGZ; gz++) for (gx = 0; gx < NGX; gx++) {
    var wx0 = bx + gx * GX, wz0 = bz + gz * GZ;
    var c0 = _cc[gz * NGX + gx];
    var cl0 = { cont: c0.cont, ero: c0.ero, weird: c0.weird, temp: c0.temp, hum: c0.hum, pv: WG.ridge.ridged2(wx0, wz0) };
    _latH[gz * NGX + gx] = heightFrom(wx0, wz0, cl0);
    _latE[gz * NGX + gx] = WG.splEro.get(c0.ero);
  }
  /* full-resolution per-column height, biome and erosion */
  for (z = 0; z < CH_W; z++) for (x = 0; x < CH_W; x++) {
    var fx = x / GX, fz = z / GZ;
    var i0 = fx | 0, k0 = fz | 0, tx = fx - i0, tz = fz - k0;
    var a = _cc[k0 * NGX + i0], b = _cc[k0 * NGX + i0 + 1];
    var c = _cc[(k0 + 1) * NGX + i0], d = _cc[(k0 + 1) * NGX + i0 + 1];
    var cl = {
      cont: lerp(lerp(a.cont, b.cont, tx), lerp(c.cont, d.cont, tx), tz),
      ero: lerp(lerp(a.ero, b.ero, tx), lerp(c.ero, d.ero, tx), tz),
      weird: lerp(lerp(a.weird, b.weird, tx), lerp(c.weird, d.weird, tx), tz),
      temp: lerp(lerp(a.temp, b.temp, tx), lerp(c.temp, d.temp, tx), tz),
      hum: lerp(lerp(a.hum, b.hum, tx), lerp(c.hum, d.hum, tx), tz),
      pv: 0
    };
    var wx = bx + x, wz = bz + z;
    cl.pv = WG.ridge.ridged2(wx, wz);
    var h = heightFrom(wx, wz, cl);
    var bi = pickBiome(wx, wz, h, cl);
    var bio = BIOMES[bi];
    if (bio.heightBias) h += bio.heightBias;
    var ci = z * CH_W + x;
    _hCol[ci] = h;
    _eroCol[ci] = WG.splEro.get(cl.ero);
    _bioCol[ci] = bi;
  }

  /* --- density lattice --- */
  var maxLat = 0;
  for (var q = 0; q < NGX * NGZ; q++) if (_latH[q] > maxLat) maxLat = _latH[q];
  var topGY = Math.min(NGY - 1, Math.ceil((maxLat + 40) / GY));
  for (gz = 0; gz < NGZ; gz++) for (gx = 0; gx < NGX; gx++) {
    var hh = _latH[gz * NGX + gx], eroF = _latE[gz * NGX + gx];
    var wxx = bx + gx * GX, wzz = bz + gz * GZ;
    var amp = 2.0 + eroF * 5.5;
    for (gy = 0; gy <= topGY; gy++) {
      var wy = gy * GY;
      var n3 = WG.dens3.get3(wxx, wy * 0.85, wzz);
      var dd = (hh - wy) * 0.30 + n3 * amp;
      if (wy > hh + 14) dd -= (wy - hh - 14) * 0.30;
      if (wy < 14) dd += (14 - wy) * 0.8;
      _dbuf[gidx(gx, gy, gz)] = dd;
    }
    for (gy = topGY + 1; gy < NGY; gy++) _dbuf[gidx(gx, gy, gz)] = -50;
  }

  /* --- cave lattice, finer in y so tunnels survive interpolation --- */
  var topCY = Math.min(NCY - 1, Math.ceil((maxLat + 6) / CG));
  _cbufTop = topCY;
  for (gz = 0; gz < NCZ; gz++) for (gx = 0; gx < NCX; gx++) {
    var lh = bilinLat(_latH, gx * CG / GX, gz * CG / GZ);
    var wxc = bx + gx * CG, wzc = bz + gz * CG;
    for (gy = 0; gy <= topCY; gy++) {
      _cbuf[cidx(gx, gy, gz)] = caveField(wxc, gy * CG, wzc, lh);
    }
  }
}
function bilinLat(buf, fx, fz) {
  var i0 = Math.min(NGX - 2, fx | 0), k0 = Math.min(NGZ - 2, fz | 0);
  var tx = fx - i0, tz = fz - k0;
  return lerp(lerp(buf[k0 * NGX + i0], buf[k0 * NGX + i0 + 1], tx),
    lerp(buf[(k0 + 1) * NGX + i0], buf[(k0 + 1) * NGX + i0 + 1], tx), tz);
}

function sampleDensity(x, y, z) {
  var fx = x / GX, fy = y / GY, fz = z / GZ;
  var x0 = fx | 0, y0 = fy | 0, z0 = fz | 0;
  var tx = fx - x0, ty = fy - y0, tz = fz - z0;
  var y1 = y0 + 1 < NGY ? y0 + 1 : y0;
  var b = _dbuf;
  var c000 = b[gidx(x0, y0, z0)], c100 = b[gidx(x0 + 1, y0, z0)];
  var c010 = b[gidx(x0, y1, z0)], c110 = b[gidx(x0 + 1, y1, z0)];
  var c001 = b[gidx(x0, y0, z0 + 1)], c101 = b[gidx(x0 + 1, y0, z0 + 1)];
  var c011 = b[gidx(x0, y1, z0 + 1)], c111 = b[gidx(x0 + 1, y1, z0 + 1)];
  var c00 = c000 + (c100 - c000) * tx, c10 = c010 + (c110 - c010) * tx;
  var c01 = c001 + (c101 - c001) * tx, c11 = c011 + (c111 - c011) * tx;
  var c0 = c00 + (c10 - c00) * ty, c1 = c01 + (c11 - c01) * ty;
  return c0 + (c1 - c0) * tz;
}

/* The lattice is sampled every 4 blocks horizontally, which on its own turns
   hillsides into rice terraces.  Correcting each column by the difference
   between its full-resolution height and the interpolated lattice height
   makes the surface follow the real height field for free. */
function densityAt(x, y, z, colH) {
  var lat = bilinLat(_latH, x / GX, z / GZ);
  return sampleDensity(x, y, z) + (colH - lat) * 0.30;
}
function sampleCave(x, y, z) {
  var fy = y / CG;
  var y0 = fy | 0;
  if (y0 >= _cbufTop) return -1;
  var fx = x / CG, fz = z / CG;
  var x0 = fx | 0, z0 = fz | 0;
  var tx = fx - x0, ty = fy - y0, tz = fz - z0;
  var y1 = y0 + 1;
  var b = _cbuf;
  var c000 = b[cidx(x0, y0, z0)], c100 = b[cidx(x0 + 1, y0, z0)];
  var c010 = b[cidx(x0, y1, z0)], c110 = b[cidx(x0 + 1, y1, z0)];
  var c001 = b[cidx(x0, y0, z0 + 1)], c101 = b[cidx(x0 + 1, y0, z0 + 1)];
  var c011 = b[cidx(x0, y1, z0 + 1)], c111 = b[cidx(x0 + 1, y1, z0 + 1)];
  var c00 = c000 + (c100 - c000) * tx, c10 = c010 + (c110 - c010) * tx;
  var c01 = c001 + (c101 - c001) * tx, c11 = c011 + (c111 - c011) * tx;
  var c0 = c00 + (c10 - c00) * ty, c1 = c01 + (c11 - c01) * ty;
  return c0 + (c1 - c0) * tz;
}

/* ------------------------------------------------------- chunk writer -- */
function Col(sections) { this.s = sections; }
function setBlockRaw(sections, x, y, z, v) {
  if (y < 0 || y >= CH_H) return;
  var si = y >> 4;
  var sec = sections[si];
  if (!sec) {
    if (v === 0) return;
    sec = sections[si] = new Uint16Array(4096);
  }
  sec[SIDX(x, y, z)] = v;
}
function getBlockRaw(sections, x, y, z) {
  if (y < 0 || y >= CH_H) return 0;
  var sec = sections[y >> 4];
  return sec ? sec[SIDX(x, y, z)] : 0;
}
WG.setBlockRaw = setBlockRaw;
WG.getBlockRaw = getBlockRaw;

/* ============================ OVERWORLD FILL ============================ */
function genOverworld(cx, cz, sections, out) {
  buildDensity(cx, cz);
  var bx = cx * CH_W, bz = cz * CH_W;
  var ID = BID;
  var idStone = ID.stone, idDeep = ID.deepslate, idWater = ID.water, idLava = ID.lava, idAir = 0;
  var maxH = 0;
  for (var i = 0; i < CH_AREA; i++) if (_hCol[i] > maxH) maxH = _hCol[i];
  var ceil = Math.min(CH_H - 1, Math.ceil(maxH) + 34);

  var heights = new Int16Array(CH_AREA);
  var oceanFloor = new Int16Array(CH_AREA);

  for (var z = 0; z < CH_W; z++) {
    for (var x = 0; x < CH_W; x++) {
      var ci = z * CH_W + x;
      var wx = bx + x, wz = bz + z;
      var colH = _hCol[ci];
      var top = -1, floor = -1;

      /* aquifer parameters for this column */
      var aqOn = WG.aqBarrier.get2(wx * 0.8, wz * 0.8) > 0.10;
      var aqLevel = aqOn ? (26 + (WG.aquifer.get2(wx, wz) * 0.5 + 0.5) * 56) : -1;
      var deepY = 42 + WG.surfN.get2(wx * 0.35, wz * 0.35) * 9;

      for (var y = ceil; y >= 0; y--) {
        var v = 0;
        if (y <= 2) {
          v = (y === 0 || rand3(wx, y, wz, 77) < (0.75 - y * 0.25)) ? ID.bedrock : idStone;
        } else {
          var d = densityAt(x, y, z, colH);
          if (d > 0) {
            var cavev = sampleCave(x, y, z);
            if (cavev > 0) {
              /* carved */
              if (y <= 9) v = idLava;
              else if (y < aqLevel) v = idWater;
              else v = idAir;
            } else {
              v = (y < deepY) ? idDeep : idStone;
              /* stone variety blobs */
              if (v === idStone) {
                var vn = WG.oreN.get3(wx * 0.45, y * 0.45, wz * 0.45);
                if (vn > 0.42) v = ID.granite;
                else if (vn < -0.44) v = ID.diorite;
                else {
                  var vn2 = WG.oreN.get3(wx * 0.4 + 500, y * 0.4, wz * 0.4 - 500);
                  if (vn2 > 0.46) v = ID.andesite;
                }
              } else {
                var tn = WG.oreN.get3(wx * 0.5 + 900, y * 0.5, wz * 0.5);
                if (tn > 0.48) v = ID.tuff;
              }
              if (top < 0) top = y;
            }
          } else {
            if (y <= SEA) v = idWater;
            else v = idAir;
          }
        }
        if (v !== 0) setBlockRaw(sections, x, y, z, v);
        if (floor < 0 && v !== 0 && v !== idWater) floor = y;
      }
      heights[ci] = top < 0 ? 0 : top;
      oceanFloor[ci] = floor < 0 ? 0 : floor;
    }
  }
  out.heights = heights;
  out.oceanFloor = oceanFloor;
  surfacePass(cx, cz, sections, heights);
  orePass(cx, cz, sections);
  caveBiomePass(cx, cz, sections);
}

/* ------------------------------------------------------ surface builder -- */
function surfacePass(cx, cz, sections, heights) {
  var bx = cx * CH_W, bz = cz * CH_W, ID = BID;
  for (var z = 0; z < CH_W; z++) for (var x = 0; x < CH_W; x++) {
    var ci = z * CH_W + x, wx = bx + x, wz = bz + z;
    var bio = BIOMES[_bioCol[ci]];
    var noiseD = 2 + Math.round((WG.surfN.get2(wx, wz) + 1) * 1.6);
    /* Only the topmost solid column gets dressed — cave floors keep their
       stone, and the heightmap records the real surface. */
    var surfY = -1, underwater = false;
    for (var sy = CH_H - 1; sy >= 1; sy--) {
      var sid = getBlockRaw(sections, x, sy, z) & ID_MASK;
      if (sid === 0 || sid === ID.water || sid === ID.lava) continue;
      surfY = sy;
      underwater = (getBlockRaw(sections, x, sy + 1, z) & ID_MASK) === ID.water;
      break;
    }
    if (surfY < 1) { heights[ci] = 0; continue; }
    heights[ci] = surfY;
    var depth = -1;
    for (var y = surfY; y >= 1 && y > surfY - (noiseD + 4); y--) {
      var v = getBlockRaw(sections, x, y, z);
      var id = v & ID_MASK;
      if (id === 0 || id === ID.water || id === ID.lava) break;
      if (id === ID.bedrock) break;
      depth++;
      if (depth > noiseD + 2) break;
      if (id !== ID.stone && id !== ID.deepslate && id !== ID.granite && id !== ID.diorite &&
        id !== ID.andesite && id !== ID.tuff) continue;

      var nv = 0;
      if (bio.name === 'badlands' || bio.name === 'eroded_badlands' || bio.name === 'wooded_badlands') {
        nv = badlandsBlock(wx, y, wz, depth, bio, underwater);
      } else if (underwater) {
        nv = depth === 0 ? bio.seafloorId : (depth < 3 ? bio.seafloorId : bio.underId);
        if (bio.name.indexOf('ocean') < 0 && bio.name.indexOf('river') < 0) nv = depth === 0 ? ID.dirt : ID.dirt;
        if (bio.top === 'sand') nv = ID.sand;
      } else if (depth === 0) {
        nv = bio.topId;
        if (y < SEA + 1 && bio.topId === ID.grass_block) nv = ID.dirt;
      } else if (depth <= noiseD) {
        nv = bio.fillerId;
      } else {
        nv = bio.underId;
        if (nv === ID.stone) continue;
      }
      if (nv && nv !== id) setBlockRaw(sections, x, y, z, nv);
      if (depth === 0) {
        /* snow blanket and ice sheets */
        if (bio.snow && !underwater && y + 1 < CH_H) {
          var above = getBlockRaw(sections, x, y + 1, z) & ID_MASK;
          if (above === 0) setBlockRaw(sections, x, y + 1, z, bpack(ID.snow, 0));
        }
        if (bio.snow && underwater && y < SEA) {
          var wtop = getBlockRaw(sections, x, SEA, z) & ID_MASK;
          if (wtop === ID.water) setBlockRaw(sections, x, SEA, z, ID.ice);
        }
        if (bio.snow && !underwater && y + 1 < CH_H &&
          (getBlockRaw(sections, x, y + 1, z) & ID_MASK) === ID.snow) heights[ci] = y + 1;
      }
    }
  }
}

function badlandsBlock(wx, y, wz, depth, bio, underwater) {
  var ID = BID;
  if (y > SEA + 6) {
    if (depth === 0 && y > SEA + 30) return ID.red_sand;
    var band = Math.floor((y + WG.bandN.get2(wx, wz) * 2.2) / 3.0);
    var pickN = hash3(0, band, 0, 991) % 7;
    var names = ['terracotta', 'orange_terracotta', 'terracotta', 'white_terracotta',
      'light_gray_terracotta', 'yellow_terracotta', 'brown_terracotta', 'red_terracotta'];
    if (depth === 0 && y < SEA + 12) return ID.red_sand;
    return ID[names[pickN]];
  }
  return depth === 0 ? ID.red_sand : ID.red_sandstone;
}

/* ----------------------------------------------------------------- ores -- */
var ORE_TABLE = [
  { name: 'coal', size: 14, tries: 22, min: 40, max: 200, sq: true },
  { name: 'iron', size: 9, tries: 16, min: 6, max: 130, sq: true },
  { name: 'iron', size: 5, tries: 8, min: 100, max: 190, sq: false },
  { name: 'copper', size: 12, tries: 14, min: 30, max: 130, sq: true },
  { name: 'gold', size: 8, tries: 5, min: 6, max: 60, sq: true },
  { name: 'redstone', size: 9, tries: 8, min: 4, max: 46, sq: true },
  { name: 'lapis', size: 7, tries: 3, min: 8, max: 64, sq: true },
  { name: 'diamond', size: 6, tries: 3, min: 3, max: 40, sq: true },
  { name: 'emerald', size: 3, tries: 2, min: 90, max: 180, sq: false, biome: 'windswept' }
];
function orePass(cx, cz, sections) {
  var rng = chunkRNG(cx, cz, 0x51ed);
  var bx = cx * CH_W, bz = cz * CH_W, ID = BID;
  for (var o = 0; o < ORE_TABLE.length; o++) {
    var e = ORE_TABLE[o];
    if (e.biome) {
      var bn = BIOMES[_bioCol[8 * CH_W + 8]].name;
      if (bn.indexOf(e.biome) < 0) continue;
    }
    var tries = e.tries;
    for (var t = 0; t < tries; t++) {
      var ox = rng() * CH_W, oz = rng() * CH_W;
      var oy = e.min + rng() * (e.max - e.min);
      placeOreVein(sections, ox, oy, oz, e.size, e.name, rng);
    }
  }
  /* rarer decorative pockets */
  var rng2 = chunkRNG(cx, cz, 0x77ab);
  for (var g = 0; g < 6; g++) {
    var gx = rng2() * CH_W, gz = rng2() * CH_W, gy = 8 + rng2() * 50;
    placeBlob(sections, gx, gy, gz, 4 + rng2() * 4, ID.gravel, rng2);
  }
  if (rng2() < 0.14) {
    /* amethyst geode */
    var ax = rng2() * CH_W, az = rng2() * CH_W, ay = 12 + rng2() * 42;
    geode(sections, ax, ay, az, rng2);
  }
  if (rng2() < 0.02) {
    var dx = rng2() * CH_W, dz = rng2() * CH_W, dy = 10 + rng2() * 30;
    placeBlob(sections, dx, dy, dz, 5, ID.clay, rng2);
  }
}
function placeOreVein(sections, ox, oy, oz, size, oreName, rng) {
  var ID = BID;
  var idStoneOre = ID[oreName + '_ore'], idDeepOre = ID['deepslate_' + oreName + '_ore'];
  var ang = rng() * Math.PI * 2;
  var len = size / 8 + 1;
  for (var i = 0; i < size; i++) {
    var t = i / size;
    var px = ox + Math.cos(ang) * (t - 0.5) * len * 2 + (rng() - 0.5) * 2;
    var pz = oz + Math.sin(ang) * (t - 0.5) * len * 2 + (rng() - 0.5) * 2;
    var py = oy + (rng() - 0.5) * 2.4;
    var r = 0.8 + rng() * 0.9;
    for (var dy = -2; dy <= 2; dy++) for (var dz = -2; dz <= 2; dz++) for (var dx = -2; dx <= 2; dx++) {
      var xx = Math.round(px) + dx, yy = Math.round(py) + dy, zz = Math.round(pz) + dz;
      if (xx < 0 || xx > 15 || zz < 0 || zz > 15 || yy < 1 || yy >= CH_H) continue;
      if (dx * dx + dy * dy + dz * dz > r * r * 2.2) continue;
      var cur = getBlockRaw(sections, xx, yy, zz) & ID_MASK;
      if (cur === ID.stone || cur === ID.granite || cur === ID.diorite || cur === ID.andesite || cur === ID.tuff)
        setBlockRaw(sections, xx, yy, zz, idStoneOre);
      else if (cur === ID.deepslate) setBlockRaw(sections, xx, yy, zz, idDeepOre);
    }
  }
}
function placeBlob(sections, ox, oy, oz, r, id, rng) {
  var ID = BID;
  for (var dy = -r; dy <= r; dy++) for (var dz = -r; dz <= r; dz++) for (var dx = -r; dx <= r; dx++) {
    if (dx * dx + dy * dy + dz * dz > r * r) continue;
    var xx = Math.round(ox + dx), yy = Math.round(oy + dy), zz = Math.round(oz + dz);
    if (xx < 0 || xx > 15 || zz < 0 || zz > 15 || yy < 1 || yy >= CH_H) continue;
    var cur = getBlockRaw(sections, xx, yy, zz) & ID_MASK;
    if (cur === ID.stone || cur === ID.deepslate || cur === ID.granite || cur === ID.diorite || cur === ID.andesite)
      setBlockRaw(sections, xx, yy, zz, id);
  }
}
function geode(sections, ox, oy, oz, rng) {
  var ID = BID, r = 4 + rng() * 2.5;
  for (var dy = -r - 2; dy <= r + 2; dy++) for (var dz = -r - 2; dz <= r + 2; dz++) for (var dx = -r - 2; dx <= r + 2; dx++) {
    var d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    var xx = Math.round(ox + dx), yy = Math.round(oy + dy), zz = Math.round(oz + dz);
    if (xx < 0 || xx > 15 || zz < 0 || zz > 15 || yy < 2 || yy >= CH_H) continue;
    var jitter = rand3(xx, yy, zz, 313) * 0.9;
    var dd = d + jitter;
    if (dd < r - 1.2) setBlockRaw(sections, xx, yy, zz, 0);
    else if (dd < r) setBlockRaw(sections, xx, yy, zz, rng() < 0.18 ? ID.budding_amethyst : ID.amethyst_block);
    else if (dd < r + 1) setBlockRaw(sections, xx, yy, zz, ID.calcite);
    else if (dd < r + 2) setBlockRaw(sections, xx, yy, zz, ID.smooth_basalt);
  }
}

/* -------------------------------------------------- cave biome dressing -- */
function caveBiomePass(cx, cz, sections) {
  var bx = cx * CH_W, bz = cz * CH_W, ID = BID;
  var rng = chunkRNG(cx, cz, 0x3d21);
  for (var z = 0; z < CH_W; z++) for (var x = 0; x < CH_W; x++) {
    var wx = bx + x, wz = bz + z;
    var cb = WG.caveBiome.get2(wx, wz);
    var lush = cb > 0.40, drip = cb < -0.40;
    var deepDark = Math.abs(WG.caveBiome.get2(wx * 0.4 + 5000, wz * 0.4 - 5000)) < 0.09;
    for (var y = 6; y < SEA + 6; y++) {
      var here = getBlockRaw(sections, x, y, z) & ID_MASK;
      if (here !== 0) continue;
      var below = getBlockRaw(sections, x, y - 1, z) & ID_MASK;
      var above = getBlockRaw(sections, x, y + 1, z) & ID_MASK;
      var solidBelow = below !== 0 && BLOCKS[below].solid && BLOCKS[below].opaque;
      var solidAbove = above !== 0 && BLOCKS[above].solid && BLOCKS[above].opaque;
      if (deepDark && y < 40) {
        if (solidBelow && rng() < 0.42) {
          setBlockRaw(sections, x, y - 1, z, ID.sculk);
          if (rng() < 0.035) setBlockRaw(sections, x, y, z, ID.sculk_sensor);
          else if (rng() < 0.018) setBlockRaw(sections, x, y, z, ID.sculk_shrieker);
          else if (rng() < 0.02) setBlockRaw(sections, x, y, z, ID.sculk_catalyst);
        }
        if (solidAbove && rng() < 0.18) setBlockRaw(sections, x, y + 1, z, ID.sculk);
        continue;
      }
      if (lush && y > 12 && y < SEA + 4) {
        if (solidBelow && rng() < 0.55) {
          setBlockRaw(sections, x, y - 1, z, ID.moss_block);
          var r = rng();
          if (r < 0.18) setBlockRaw(sections, x, y, z, ID.short_grass);
          else if (r < 0.24) setBlockRaw(sections, x, y, z, ID.moss_carpet);
          else if (r < 0.27) setBlockRaw(sections, x, y, z, ID.small_dripleaf);
          else if (r < 0.29) setBlockRaw(sections, x, y, z, ID.azalea);
        }
        if (solidAbove && rng() < 0.35) {
          setBlockRaw(sections, x, y + 1, z, ID.moss_block);
          if (rng() < 0.35) {
            var vl = 1 + ((rng() * 6) | 0);
            for (var k = 0; k < vl; k++) {
              if ((getBlockRaw(sections, x, y - k, z) & ID_MASK) !== 0) break;
              setBlockRaw(sections, x, y - k, z, (k === vl - 1 && rng() < 0.4) ? ID.cave_vines_berries : ID.cave_vines);
            }
          }
        }
      } else if (drip && y > 8) {
        if (solidBelow && rng() < 0.16) {
          setBlockRaw(sections, x, y - 1, z, ID.dripstone_block);
          if (rng() < 0.4) {
            var hgt = 1 + ((rng() * 4) | 0);
            for (var k2 = 0; k2 < hgt; k2++) {
              if ((getBlockRaw(sections, x, y + k2, z) & ID_MASK) !== 0) break;
              setBlockRaw(sections, x, y + k2, z, bpack(ID.pointed_dripstone, 2));
            }
          }
        }
        if (solidAbove && rng() < 0.20) {
          setBlockRaw(sections, x, y + 1, z, ID.dripstone_block);
          var hgt2 = 1 + ((rng() * 5) | 0);
          for (var k3 = 0; k3 < hgt2; k3++) {
            if ((getBlockRaw(sections, x, y - k3, z) & ID_MASK) !== 0) break;
            setBlockRaw(sections, x, y - k3, z, bpack(ID.pointed_dripstone, 3));
          }
        }
      } else {
        /* generic cave dressing: the occasional torch-lit glow lichen */
        if (solidBelow && rng() < 0.004) setBlockRaw(sections, x, y, z, ID.glow_lichen);
      }
    }
  }
}
