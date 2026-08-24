/* =========================================================================
 * FEATURES — trees, plants and the per-chunk decoration pass.
 *
 * Decoration runs over the 3x3 neighbourhood of chunks so that a tree rooted
 * in the next chunk over can still drop its leaves into this one, and the
 * result stays identical no matter which chunk generated first.
 * ========================================================================= */

/* Exact world-space density, evaluated on the same global 4x8x4 lattice the
   chunk filler uses, so features agree with the terrain they sit on. */
var _latCache = {}, _latCacheGen = 0;
function latticeHeight(lx, lz) {
  var k = lx + ',' + lz;
  var v = _latCache[k];
  if (v !== undefined) return v;
  var wx = lx * GX, wz = lz * GZ;
  var cl = climateAt(wx, wz);
  var h = heightAt(wx, wz, cl);
  var bi = pickBiome(wx, wz, h, cl);
  if (BIOMES[bi].heightBias) h += BIOMES[bi].heightBias;
  v = { h: h, e: WG.splEro.get(cl.ero) };
  _latCache[k] = v;
  return v;
}
function densityWorldAt(lx, gy, lz) {
  var lh = latticeHeight(lx, lz);
  var wx = lx * GX, wz = lz * GZ, wy = gy * GY;
  var amp = 2.0 + lh.e * 5.5;
  var n3 = WG.dens3.get3(wx, wy * 0.85, wz);
  var d = (lh.h - wy) * 0.30 + n3 * amp;
  if (wy > lh.h + 14) d -= (wy - lh.h - 14) * 0.30;
  if (wy < 14) d += (14 - wy) * 0.8;
  return d;
}
function densityWorld(wx, wy, wz) {
  var fx = wx / GX, fy = wy / GY, fz = wz / GZ;
  var x0 = Math.floor(fx), y0 = Math.floor(fy), z0 = Math.floor(fz);
  var tx = fx - x0, ty = fy - y0, tz = fz - z0;
  var c000 = densityWorldAt(x0, y0, z0), c100 = densityWorldAt(x0 + 1, y0, z0);
  var c010 = densityWorldAt(x0, y0 + 1, z0), c110 = densityWorldAt(x0 + 1, y0 + 1, z0);
  var c001 = densityWorldAt(x0, y0, z0 + 1), c101 = densityWorldAt(x0 + 1, y0, z0 + 1);
  var c011 = densityWorldAt(x0, y0 + 1, z0 + 1), c111 = densityWorldAt(x0 + 1, y0 + 1, z0 + 1);
  var c00 = c000 + (c100 - c000) * tx, c10 = c010 + (c110 - c010) * tx;
  var c01 = c001 + (c101 - c001) * tx, c11 = c011 + (c111 - c011) * tx;
  var c0 = c00 + (c10 - c00) * ty, c1 = c01 + (c11 - c01) * ty;
  return c0 + (c1 - c0) * tz;
}
function surfaceYAt(wx, wz) {
  var lh = latticeHeight(Math.floor(wx / GX), Math.floor(wz / GZ));
  var start = Math.min(CH_H - 2, Math.ceil(lh.h) + 26);
  for (var y = start; y >= 2; y--) {
    if (densityWorld(wx, y, wz) > 0 && caveField(wx, y, wz, lh.h) <= 0) return y;
  }
  return 2;
}

/* --------------------------------------------------------------- trees -- */
function leafBlob(put, x, y, z, rx, ry, leaf, rng, density) {
  density = density === undefined ? 1 : density;
  for (var dy = -ry; dy <= ry; dy++) for (var dz = -rx; dz <= rx; dz++) for (var dx = -rx; dx <= rx; dx++) {
    var d = (dx * dx + dz * dz) / (rx * rx) + (dy * dy) / (ry * ry);
    if (d > 1.05) continue;
    if (d > 0.55 && rng() > density * 0.72) continue;
    put(x + dx, y + dy, z + dz, leaf, true);
  }
}
var TREES = {};
TREES.oak = function (put, x, y, z, rng) {
  var h = 4 + ((rng() * 3) | 0), L = BID.oak_leaves, W = BID.oak_log;
  for (var i = 0; i < h; i++) put(x, y + i, z, bpack(W, 0));
  leafBlob(put, x, y + h, z, 2, 2, L, rng, 0.9);
  put(x, y + h, z, L, true);
  for (var k = 0; k < 2; k++) leafBlob(put, x + ((rng() * 3 | 0) - 1), y + h - 2 + k, z + ((rng() * 3 | 0) - 1), 2, 1, L, rng, 0.6);
};
TREES.oak_big = function (put, x, y, z, rng) {
  var h = 8 + ((rng() * 5) | 0), L = BID.oak_leaves, W = BID.oak_log;
  for (var i = 0; i < h; i++) put(x, y + i, z, bpack(W, 0));
  var branches = 3 + ((rng() * 3) | 0);
  for (var b = 0; b < branches; b++) {
    var ang = rng() * Math.PI * 2, len = 2 + rng() * 3;
    var by = y + h - 3 - ((rng() * 4) | 0);
    var ex = x, ez = z;
    for (var s = 0; s <= len; s++) {
      ex = Math.round(x + Math.cos(ang) * s); ez = Math.round(z + Math.sin(ang) * s);
      put(ex, by + Math.round(s * 0.55), ez, bpack(W, 0));
    }
    leafBlob(put, ex, by + Math.round(len * 0.55) + 1, ez, 3, 2, L, rng, 0.85);
  }
  leafBlob(put, x, y + h, z, 3, 3, L, rng, 0.9);
};
TREES.swamp_oak = function (put, x, y, z, rng) {
  var h = 5 + ((rng() * 3) | 0), L = BID.oak_leaves, W = BID.oak_log;
  for (var i = 0; i < h; i++) put(x, y + i, z, bpack(W, 0));
  leafBlob(put, x, y + h - 1, z, 3, 2, L, rng, 0.85);
  for (var dz = -3; dz <= 3; dz++) for (var dx = -3; dx <= 3; dx++) {
    if (rng() < 0.22) for (var v = 1; v < 1 + ((rng() * 5) | 0); v++) put(x + dx, y + h - 2 - v, z + dz, BID.vine, true);
  }
};
TREES.birch = function (put, x, y, z, rng) {
  var h = 5 + ((rng() * 3) | 0), L = BID.birch_leaves, W = BID.birch_log;
  for (var i = 0; i < h; i++) put(x, y + i, z, bpack(W, 0));
  leafBlob(put, x, y + h, z, 2, 2, L, rng, 0.9);
};
TREES.birch_tall = function (put, x, y, z, rng) {
  var h = 8 + ((rng() * 4) | 0), L = BID.birch_leaves, W = BID.birch_log;
  for (var i = 0; i < h; i++) put(x, y + i, z, bpack(W, 0));
  leafBlob(put, x, y + h, z, 2, 3, L, rng, 0.9);
};
TREES.spruce = function (put, x, y, z, rng) {
  var h = 7 + ((rng() * 5) | 0), L = BID.spruce_leaves, W = BID.spruce_log;
  for (var i = 0; i < h; i++) put(x, y + i, z, bpack(W, 0));
  var layers = 3 + ((rng() * 3) | 0);
  var yy = y + h - 1;
  for (var l = 0; l < layers; l++) {
    var r = 1 + (l % 2 === 0 ? 1 : 0) + Math.floor(l / 2);
    for (var dz = -r; dz <= r; dz++) for (var dx = -r; dx <= r; dx++) {
      if (Math.abs(dx) + Math.abs(dz) > r + (r > 1 ? 1 : 0)) continue;
      put(x + dx, yy, z + dz, L, true);
    }
    yy -= (l % 2 === 0) ? 1 : 2;
    if (yy < y + 2) break;
  }
  put(x, y + h, z, L, true); put(x, y + h + 1, z, L, true);
};
TREES.spruce_tall = TREES.spruce;
TREES.spruce_mega = function (put, x, y, z, rng) {
  var h = 14 + ((rng() * 8) | 0), L = BID.spruce_leaves, W = BID.spruce_log;
  for (var i = 0; i < h; i++) for (var dz = 0; dz < 2; dz++) for (var dx = 0; dx < 2; dx++)
    put(x + dx, y + i, z + dz, bpack(W, 0));
  var yy = y + h;
  for (var l = 0; l < 9; l++) {
    var r = 1 + (l % 3 === 0 ? 2 : 1) + Math.floor(l / 3);
    for (var dz2 = -r; dz2 <= r + 1; dz2++) for (var dx2 = -r; dx2 <= r + 1; dx2++) {
      if (dx2 * dx2 + dz2 * dz2 > (r + 1) * (r + 1)) continue;
      put(x + dx2, yy, z + dz2, L, true);
    }
    yy -= 2;
    if (yy < y + 5) break;
  }
};
TREES.pine_mega = function (put, x, y, z, rng) {
  var h = 16 + ((rng() * 8) | 0), L = BID.spruce_leaves, W = BID.spruce_log;
  for (var i = 0; i < h; i++) for (var dz = 0; dz < 2; dz++) for (var dx = 0; dx < 2; dx++)
    put(x + dx, y + i, z + dz, bpack(W, 0));
  for (var l = 0; l < 4; l++) {
    var yy = y + h - l * 2, r = 2 + l;
    for (var dz2 = -r; dz2 <= r + 1; dz2++) for (var dx2 = -r; dx2 <= r + 1; dx2++) {
      if (dx2 * dx2 + dz2 * dz2 > (r + 0.6) * (r + 0.6)) continue;
      put(x + dx2, yy, z + dz2, L, true);
    }
  }
};
TREES.jungle = function (put, x, y, z, rng) {
  var h = 8 + ((rng() * 6) | 0), L = BID.jungle_leaves, W = BID.jungle_log;
  for (var i = 0; i < h; i++) put(x, y + i, z, bpack(W, 0));
  leafBlob(put, x, y + h, z, 2, 2, L, rng, 0.9);
  for (var v = 0; v < 8; v++) {
    var vx = x + ((rng() * 5 | 0) - 2), vz = z + ((rng() * 5 | 0) - 2);
    var vl = 2 + ((rng() * 6) | 0);
    for (var k = 0; k < vl; k++) put(vx, y + h - 1 - k, vz, BID.vine, true);
  }
};
TREES.jungle_big = function (put, x, y, z, rng) {
  var h = 16 + ((rng() * 12) | 0), L = BID.jungle_leaves, W = BID.jungle_log;
  for (var i = 0; i < h; i++) for (var dz = 0; dz < 2; dz++) for (var dx = 0; dx < 2; dx++)
    put(x + dx, y + i, z + dz, bpack(W, 0));
  for (var b = 0; b < 4; b++) {
    var ang = b * 1.57 + rng(), len = 3 + rng() * 3;
    var by = y + h - 4 - ((rng() * 6) | 0), ex = x, ez = z;
    for (var s = 0; s <= len; s++) {
      ex = Math.round(x + Math.cos(ang) * s); ez = Math.round(z + Math.sin(ang) * s);
      put(ex, by + Math.round(s * 0.4), ez, bpack(W, 0));
    }
    leafBlob(put, ex, by + Math.round(len * 0.4), ez, 3, 2, L, rng, 0.8);
  }
  leafBlob(put, x, y + h, z, 4, 3, L, rng, 0.9);
  for (var v2 = 0; v2 < 24; v2++) {
    var vx2 = x + ((rng() * 9 | 0) - 4), vz2 = z + ((rng() * 9 | 0) - 4);
    var vl2 = 3 + ((rng() * 10) | 0), vy = y + h - ((rng() * 6) | 0);
    for (var k2 = 0; k2 < vl2; k2++) put(vx2, vy - k2, vz2, BID.vine, true);
  }
};
TREES.jungle_bush = function (put, x, y, z, rng) {
  put(x, y, z, bpack(BID.jungle_log, 0));
  leafBlob(put, x, y + 1, z, 2, 1, BID.jungle_leaves, rng, 0.9);
};
TREES.acacia = function (put, x, y, z, rng) {
  var h = 5 + ((rng() * 3) | 0), L = BID.acacia_leaves, W = BID.acacia_log;
  for (var i = 0; i < h; i++) put(x, y + i, z, bpack(W, 0));
  var ang = rng() * Math.PI * 2;
  var ex = x, ez = z, ey = y + h;
  for (var s = 1; s <= 3; s++) {
    ex = Math.round(x + Math.cos(ang) * s); ez = Math.round(z + Math.sin(ang) * s);
    ey = y + h + Math.round(s * 0.6);
    put(ex, ey, ez, bpack(W, 4));
  }
  for (var dz = -3; dz <= 3; dz++) for (var dx = -3; dx <= 3; dx++) {
    if (dx * dx + dz * dz > 9.4) continue;
    put(ex + dx, ey + 1, ez + dz, L, true);
    if (dx * dx + dz * dz < 5) put(ex + dx, ey + 2, ez + dz, L, true);
  }
  var ang2 = ang + 2.2 + rng();
  var fx = Math.round(x + Math.cos(ang2) * 2), fz = Math.round(z + Math.sin(ang2) * 2);
  put(fx, y + h, fz, bpack(W, 4));
  for (var dz2 = -2; dz2 <= 2; dz2++) for (var dx2 = -2; dx2 <= 2; dx2++)
    if (dx2 * dx2 + dz2 * dz2 <= 4.4) put(fx + dx2, y + h + 1, fz + dz2, L, true);
};
TREES.dark_oak = function (put, x, y, z, rng) {
  var h = 6 + ((rng() * 3) | 0), L = BID.dark_oak_leaves, W = BID.dark_oak_log;
  for (var i = 0; i < h; i++) for (var dz = 0; dz < 2; dz++) for (var dx = 0; dx < 2; dx++)
    put(x + dx, y + i, z + dz, bpack(W, 0));
  for (var l = 0; l < 2; l++) {
    var r = 3 - l;
    for (var dz2 = -r; dz2 <= r + 1; dz2++) for (var dx2 = -r; dx2 <= r + 1; dx2++) {
      if (dx2 * dx2 + dz2 * dz2 > (r + 1) * (r + 1)) continue;
      put(x + dx2, y + h - 1 + l, z + dz2, L, true);
    }
  }
};
TREES.pale_oak = function (put, x, y, z, rng) {
  var h = 7 + ((rng() * 4) | 0), L = BID.pale_oak_leaves, W = BID.pale_oak_log;
  for (var i = 0; i < h; i++) put(x, y + i, z, bpack(W, 0));
  leafBlob(put, x, y + h, z, 3, 2, L, rng, 0.85);
  for (var v = 0; v < 6; v++) {
    var vx = x + ((rng() * 7 | 0) - 3), vz = z + ((rng() * 7 | 0) - 3);
    for (var k = 0; k < 2 + ((rng() * 4) | 0); k++) put(vx, y + h - 2 - k, vz, BID.pale_moss_block, true);
  }
};
TREES.mangrove = function (put, x, y, z, rng) {
  var h = 6 + ((rng() * 4) | 0), L = BID.mangrove_leaves, W = BID.mangrove_log;
  for (var r = 0; r < 5; r++) {
    var ang = r * 1.25, rx = Math.round(Math.cos(ang) * 2), rz = Math.round(Math.sin(ang) * 2);
    for (var d = 0; d < 3; d++) put(x + Math.round(rx * (1 - d / 3)), y - 1 + d, z + Math.round(rz * (1 - d / 3)), bpack(W, 0));
  }
  for (var i = 0; i < h; i++) put(x, y + i, z, bpack(W, 0));
  leafBlob(put, x, y + h, z, 3, 2, L, rng, 0.85);
};
TREES.cherry = function (put, x, y, z, rng) {
  var h = 6 + ((rng() * 4) | 0), L = BID.cherry_leaves, W = BID.cherry_log;
  for (var i = 0; i < h; i++) put(x, y + i, z, bpack(W, 0));
  for (var b = 0; b < 3; b++) {
    var ang = b * 2.1 + rng(), len = 2 + rng() * 2, ex = x, ez = z;
    for (var s = 1; s <= len; s++) {
      ex = Math.round(x + Math.cos(ang) * s); ez = Math.round(z + Math.sin(ang) * s);
      put(ex, y + h - 2 + Math.round(s * 0.5), ez, bpack(W, 4));
    }
    leafBlob(put, ex, y + h + 1, ez, 3, 1, L, rng, 0.9);
  }
  leafBlob(put, x, y + h + 1, z, 3, 2, L, rng, 0.92);
};
TREES.mushroom_huge_red = function (put, x, y, z, rng) {
  var h = 5 + ((rng() * 4) | 0);
  for (var i = 0; i < h; i++) put(x, y + i, z, BID.mushroom_stem);
  for (var dz = -3; dz <= 3; dz++) for (var dx = -3; dx <= 3; dx++) {
    if (dx * dx + dz * dz > 10) continue;
    put(x + dx, y + h, z + dz, BID.red_mushroom_block, true);
    if (Math.abs(dx) === 3 || Math.abs(dz) === 3) put(x + dx, y + h - 1, z + dz, BID.red_mushroom_block, true);
  }
};
TREES.mushroom_huge_brown = function (put, x, y, z, rng) {
  var h = 4 + ((rng() * 3) | 0);
  for (var i = 0; i < h; i++) put(x, y + i, z, BID.mushroom_stem);
  for (var dz = -4; dz <= 4; dz++) for (var dx = -4; dx <= 4; dx++) {
    if (dx * dx + dz * dz > 17) continue;
    put(x + dx, y + h, z + dz, BID.brown_mushroom_block, true);
  }
};
TREES.mushroom_huge = function (put, x, y, z, rng) {
  return (rng() < 0.5 ? TREES.mushroom_huge_red : TREES.mushroom_huge_brown)(put, x, y, z, rng);
};
TREES.crimson_fungus_huge = function (put, x, y, z, rng) {
  var h = 4 + ((rng() * 6) | 0), W = BID.crimson_stem, L = BID.nether_wart_block;
  for (var i = 0; i < h; i++) put(x, y + i, z, bpack(W, 0));
  leafBlob(put, x, y + h, z, 3, 2, L, rng, 0.8);
  for (var k = 0; k < 5; k++) {
    var sx = x + ((rng() * 5 | 0) - 2), sz = z + ((rng() * 5 | 0) - 2);
    put(sx, y + h - 1, sz, BID.shroomlight, true);
  }
  for (var v = 0; v < 6; v++) {
    var vx = x + ((rng() * 5 | 0) - 2), vz = z + ((rng() * 5 | 0) - 2);
    for (var q = 0; q < 1 + ((rng() * 4) | 0); q++) put(vx, y + h - 2 - q, vz, BID.weeping_vines, true);
  }
};
TREES.warped_fungus_huge = function (put, x, y, z, rng) {
  var h = 4 + ((rng() * 7) | 0), W = BID.warped_stem, L = BID.warped_wart_block;
  for (var i = 0; i < h; i++) put(x, y + i, z, bpack(W, 0));
  leafBlob(put, x, y + h, z, 3, 2, L, rng, 0.8);
  for (var k = 0; k < 4; k++) put(x + ((rng() * 5 | 0) - 2), y + h - 1, z + ((rng() * 5 | 0) - 2), BID.shroomlight, true);
};

/* ---------------------------------------------------------- decoration -- */
function makePut(sections, cx, cz) {
  var bx = cx * CH_W, bz = cz * CH_W;
  return function (wx, wy, wz, v, soft) {
    var lx = wx - bx, lz = wz - bz;
    if (lx < 0 || lx > 15 || lz < 0 || lz > 15 || wy < 0 || wy >= CH_H) return;
    if (soft) {
      var cur = getBlockRaw(sections, lx, wy, lz) & ID_MASK;
      if (cur !== 0 && !BLOCKS[cur].replaceable) return;
    }
    setBlockRaw(sections, lx, wy, lz, v);
  };
}
function weightedPick(list, rng) {
  var tot = 0, i;
  for (i = 0; i < list.length; i++) tot += list[i][1];
  var r = rng() * tot;
  for (i = 0; i < list.length; i++) { r -= list[i][1]; if (r <= 0) return list[i][0]; }
  return list[0][0];
}

function decorate(cx, cz, sections, heights) {
  var put = makePut(sections, cx, cz);
  var ID = BID;
  /* --- trees from the 3x3 neighbourhood so canopies cross chunk borders -- */
  for (var ncz = cz - 1; ncz <= cz + 1; ncz++) {
    for (var ncx = cx - 1; ncx <= cx + 1; ncx++) {
      var own = (ncx === cx && ncz === cz);
      var rng = chunkRNG(ncx, ncz, 0x7433);
      var nbx = ncx * CH_W, nbz = ncz * CH_W;
      var cCl = climateAt(nbx + 8, nbz + 8);
      var cH = heightAt(nbx + 8, nbz + 8, cCl);
      var cBio = BIOMES[pickBiome(nbx + 8, nbz + 8, cH, cCl)];
      if (!cBio.trees || cBio.treeChance <= 0) continue;
      var count = Math.floor(cBio.treeChance) + (rng() < (cBio.treeChance % 1) ? 1 : 0);
      for (var t = 0; t < count; t++) {
        var tx = nbx + ((rng() * 16) | 0), tz = nbz + ((rng() * 16) | 0);
        var ty;
        if (own) ty = heights[(tz - nbz) * CH_W + (tx - nbx)] + 1;
        else ty = surfaceYAt(tx, tz) + 1;
        if (ty <= SEA || ty > CH_H - 24) continue;
        var lcl = climateAt(tx, tz);
        var lh = heightAt(tx, tz, lcl);
        var lbio = BIOMES[pickBiome(tx, tz, lh, lcl)];
        if (!lbio.trees) continue;
        var kind = weightedPick(lbio.trees, rng);
        var fn = TREES[kind];
        if (fn) fn(put, tx, ty, tz, rng);
      }
    }
  }

  /* ------------------------- own-chunk ground cover --------------------- */
  var rng2 = chunkRNG(cx, cz, 0x2f19);
  var bx = cx * CH_W, bz = cz * CH_W;
  for (var z = 0; z < CH_W; z++) for (var x = 0; x < CH_W; x++) {
    var ci = z * CH_W + x, wx = bx + x, wz = bz + z;
    var bio = BIOMES[_bioCol[ci]];
    var sy = heights[ci];
    if (sy <= 0 || sy >= CH_H - 2) continue;
    var ground = getBlockRaw(sections, x, sy, z) & ID_MASK;
    var above = getBlockRaw(sections, x, sy + 1, z) & ID_MASK;
    if (above !== 0 && above !== BID.snow) continue;

    var soil = (ground === ID.grass_block || ground === ID.dirt || ground === ID.podzol ||
      ground === ID.coarse_dirt || ground === ID.mycelium || ground === ID.moss_block);
    var sandy = (ground === ID.sand || ground === ID.red_sand);

    if (soil && rng2() < bio.grassDensity) {
      var gb = ID[bio.grassBlock] !== undefined ? ID[bio.grassBlock] : ID.short_grass;
      if (rng2() < 0.10 && ID.tall_grass !== undefined && sy + 2 < CH_H) {
        setBlockRaw(sections, x, sy + 1, z, bpack(ID.tall_grass, 0));
        setBlockRaw(sections, x, sy + 2, z, bpack(ID.tall_grass, 1));
      } else setBlockRaw(sections, x, sy + 1, z, gb);
    } else if (soil && rng2() < bio.flowerChance && bio.flowers) {
      var fn2 = bio.flowers[(rng2() * bio.flowers.length) | 0];
      var fid = ID[fn2];
      if (fid !== undefined) {
        if (BLOCKS[fid].render === 'tall' && sy + 2 < CH_H) {
          setBlockRaw(sections, x, sy + 1, z, bpack(fid, 0));
          setBlockRaw(sections, x, sy + 2, z, bpack(fid, 1));
        } else setBlockRaw(sections, x, sy + 1, z, fid);
      }
    }

    var feats = bio.features;
    if (feats) {
      for (var f = 0; f < feats.length; f++) {
        var ft = feats[f];
        if (ft === 'cactus' && sandy && rng2() < 0.018) {
          var ch2 = 1 + ((rng2() * 3) | 0);
          for (var k = 1; k <= ch2; k++) setBlockRaw(sections, x, sy + k, z, ID.cactus);
        } else if (ft === 'dead_bush' && sandy && rng2() < 0.03) {
          setBlockRaw(sections, x, sy + 1, z, ID.dead_bush);
        } else if (ft === 'sugar_cane' && rng2() < 0.05 && nearWater(sections, x, sy, z)) {
          var sh = 1 + ((rng2() * 3) | 0);
          for (var k2 = 1; k2 <= sh; k2++) setBlockRaw(sections, x, sy + k2, z, ID.sugar_cane);
        } else if (ft === 'bamboo' && soil && rng2() < 0.34) {
          var bh = 6 + ((rng2() * 10) | 0);
          for (var k3 = 1; k3 <= bh; k3++) setBlockRaw(sections, x, sy + k3, z, ID.bamboo);
        } else if (ft === 'lily_pad' && rng2() < 0.06 && sy < SEA &&
          (getBlockRaw(sections, x, SEA, z) & ID_MASK) === ID.water) {
          setBlockRaw(sections, x, SEA + 1, z, ID.lily_pad);
        } else if (ft === 'mushrooms' && soil && rng2() < 0.02) {
          setBlockRaw(sections, x, sy + 1, z, rng2() < 0.5 ? ID.brown_mushroom : ID.red_mushroom);
        } else if (ft === 'mushrooms_dense' && soil && rng2() < 0.10) {
          setBlockRaw(sections, x, sy + 1, z, rng2() < 0.5 ? ID.brown_mushroom : ID.red_mushroom);
        } else if (ft === 'fern' && soil && rng2() < 0.18) {
          setBlockRaw(sections, x, sy + 1, z, ID.fern);
        } else if (ft === 'sweet_berry' && soil && rng2() < 0.02) {
          setBlockRaw(sections, x, sy + 1, z, bpack(ID.sweet_berry_bush, 3));
        } else if (ft === 'podzol' && soil && rng2() < 0.5) {
          setBlockRaw(sections, x, sy, z, ID.podzol);
        } else if (ft === 'mud' && soil && rng2() < 0.35) {
          setBlockRaw(sections, x, sy, z, ID.mud);
        } else if (ft === 'clay' && sy < SEA && rng2() < 0.10) {
          setBlockRaw(sections, x, sy, z, ID.clay);
        } else if (ft === 'exposed_stone' && rng2() < 0.30) {
          setBlockRaw(sections, x, sy, z, ID.stone);
        } else if (ft === 'powder_snow' && rng2() < 0.06) {
          setBlockRaw(sections, x, sy + 1, z, ID.powder_snow);
        } else if (ft === 'calcite_veins' && rng2() < 0.12) {
          setBlockRaw(sections, x, sy, z, ID.calcite);
        } else if (ft === 'ice_spikes' && rng2() < 0.006) {
          iceSpike(sections, x, sy, z, rng2);
        } else if (ft === 'melon' && soil && rng2() < 0.01) {
          setBlockRaw(sections, x, sy + 1, z, ID.melon);
        }
      }
    }
    /* pumpkins scattered on grass everywhere */
    if (soil && above === 0 && rng2() < 0.0022) setBlockRaw(sections, x, sy + 1, z, ID.pumpkin);
  }
}
function nearWater(sections, x, y, z) {
  var ID = BID;
  for (var d = 0; d < 4; d++) {
    var dx = [1, -1, 0, 0][d], dz = [0, 0, 1, -1][d];
    var nx = x + dx, nz = z + dz;
    if (nx < 0 || nx > 15 || nz < 0 || nz > 15) continue;
    if ((getBlockRaw(sections, nx, y, nz) & ID_MASK) === ID.water) return true;
  }
  return false;
}
function iceSpike(sections, x, y, z, rng) {
  var h = 7 + ((rng() * 16) | 0), ID = BID;
  for (var i = 0; i < h; i++) {
    var r = Math.max(0, Math.round((1 - i / h) * 2.2));
    for (var dz = -r; dz <= r; dz++) for (var dx = -r; dx <= r; dx++) {
      if (dx * dx + dz * dz > r * r + 0.6) continue;
      var xx = x + dx, zz = z + dz;
      if (xx < 0 || xx > 15 || zz < 0 || zz > 15) continue;
      setBlockRaw(sections, xx, y + 1 + i, zz, ID.packed_ice);
    }
  }
}

/* =============================== NETHER ================================= */
var NETHER_ROOF = 128;
function genNether(cx, cz, sections, out) {
  var bx = cx * CH_W, bz = cz * CH_W, ID = BID;
  var heights = new Int16Array(CH_AREA);
  for (var z = 0; z < CH_W; z++) for (var x = 0; x < CH_W; x++) {
    var wx = bx + x, wz = bz + z, ci = z * CH_W + x;
    var bio = netherBiomeAt(wx, wz);
    _bioCol[ci] = bio.id;
    var top = 0;
    for (var y = 0; y < NETHER_ROOF; y++) {
      var v = 0;
      if (y === 0 || (y < 4 && rand3(wx, y, wz, 91) < 0.7 - y * 0.2)) v = ID.bedrock;
      else if (y >= NETHER_ROOF - 1 || (y > NETHER_ROOF - 5 && rand3(wx, y, wz, 92) < (y - NETHER_ROOF + 5) * 0.22)) v = ID.bedrock;
      else {
        var n = WG.netherN.get3(wx, y * 1.55, wz);
        /* pinch the field closed near floor and ceiling to leave a cavern */
        var g = 0;
        if (y < 26) g += (26 - y) * 0.045;
        if (y > 96) g += (y - 96) * 0.05;
        var d = n + g - 0.22;
        if (d > 0) v = bio.underId;
        else if (y <= 32) v = ID.lava;
      }
      if (v) { setBlockRaw(sections, x, y, z, v); if (v !== ID.lava) top = y; }
    }
    /* surface dressing */
    for (var y2 = NETHER_ROOF - 2; y2 > 4; y2--) {
      var cur = getBlockRaw(sections, x, y2, z) & ID_MASK;
      var up = getBlockRaw(sections, x, y2 + 1, z) & ID_MASK;
      if (cur === ID.netherrack && up === 0) {
        setBlockRaw(sections, x, y2, z, bio.topId);
        for (var q = 1; q <= 3; q++) {
          if ((getBlockRaw(sections, x, y2 - q, z) & ID_MASK) === ID.netherrack)
            setBlockRaw(sections, x, y2 - q, z, bio.fillerId);
        }
        heights[ci] = y2;
        break;
      }
    }
  }
  out.heights = heights;
  out.oceanFloor = heights;
  netherOres(cx, cz, sections);
  netherDecorate(cx, cz, sections, heights);
}
function netherBiomeAt(wx, wz) {
  var n = WG.netherBio.get2(wx, wz);
  var n2 = WG.netherBio.get2(wx + 7000, wz - 7000);
  if (n > 0.34) return BIOMES[BIOME_ID.crimson_forest];
  if (n < -0.34) return BIOMES[BIOME_ID.warped_forest];
  if (n2 > 0.40) return BIOMES[BIOME_ID.soul_sand_valley];
  if (n2 < -0.42) return BIOMES[BIOME_ID.basalt_deltas];
  return BIOMES[BIOME_ID.nether_wastes];
}
function netherOres(cx, cz, sections) {
  var rng = chunkRNG(cx, cz, 0x9ace), ID = BID;
  for (var t = 0; t < 16; t++) {
    var ox = rng() * 16, oz = rng() * 16, oy = 10 + rng() * 108;
    var id = rng() < 0.5 ? ID.nether_quartz_ore : ID.nether_gold_ore;
    for (var i = 0; i < 8; i++) {
      var xx = Math.round(ox + (rng() - 0.5) * 4), yy = Math.round(oy + (rng() - 0.5) * 4), zz = Math.round(oz + (rng() - 0.5) * 4);
      if (xx < 0 || xx > 15 || zz < 0 || zz > 15 || yy < 2 || yy >= NETHER_ROOF) continue;
      if ((getBlockRaw(sections, xx, yy, zz) & ID_MASK) === ID.netherrack) setBlockRaw(sections, xx, yy, zz, id);
    }
  }
  for (var g = 0; g < 3; g++) {
    var gx = rng() * 16, gz = rng() * 16, gy = 8 + rng() * 24;
    for (var i2 = 0; i2 < 6; i2++) {
      var xx2 = Math.round(gx + (rng() - 0.5) * 3), yy2 = Math.round(gy + (rng() - 0.5) * 3), zz2 = Math.round(gz + (rng() - 0.5) * 3);
      if (xx2 < 0 || xx2 > 15 || zz2 < 0 || zz2 > 15 || yy2 < 8 || yy2 >= 40) continue;
      if ((getBlockRaw(sections, xx2, yy2, zz2) & ID_MASK) === ID.netherrack) setBlockRaw(sections, xx2, yy2, zz2, ID.ancient_debris);
    }
  }
}
function netherDecorate(cx, cz, sections, heights) {
  var put = makePut(sections, cx, cz), ID = BID;
  var bx = cx * CH_W, bz = cz * CH_W;
  for (var ncz = cz - 1; ncz <= cz + 1; ncz++) for (var ncx = cx - 1; ncx <= cx + 1; ncx++) {
    var rng = chunkRNG(ncx, ncz, 0x5b71);
    var bio = netherBiomeAt(ncx * CH_W + 8, ncz * CH_W + 8);
    if (!bio.trees) continue;
    var count = Math.floor(bio.treeChance);
    for (var t = 0; t < count; t++) {
      var tx = ncx * CH_W + ((rng() * 16) | 0), tz = ncz * CH_W + ((rng() * 16) | 0);
      var ty = -1;
      if (ncx === cx && ncz === cz) ty = heights[(tz - bz) * CH_W + (tx - bx)] + 1;
      else ty = 40 + ((rng() * 30) | 0);
      if (ty < 6 || ty > NETHER_ROOF - 20) continue;
      var fn = TREES[weightedPick(bio.trees, rng)];
      if (fn) fn(put, tx, ty, tz, rng);
    }
  }
  var rng2 = chunkRNG(cx, cz, 0x1177);
  for (var z = 0; z < CH_W; z++) for (var x = 0; x < CH_W; x++) {
    var sy = heights[z * CH_W + x];
    if (sy < 4) continue;
    var bio2 = netherBiomeAt(bx + x, bz + z);
    var g = getBlockRaw(sections, x, sy, z) & ID_MASK;
    var up = getBlockRaw(sections, x, sy + 1, z) & ID_MASK;
    if (up !== 0) continue;
    if (bio2.name === 'crimson_forest') {
      if (rng2() < 0.16) setBlockRaw(sections, x, sy + 1, z, ID.crimson_roots);
      else if (rng2() < 0.03) setBlockRaw(sections, x, sy + 1, z, ID.crimson_fungus);
    } else if (bio2.name === 'warped_forest') {
      if (rng2() < 0.16) setBlockRaw(sections, x, sy + 1, z, ID.warped_roots);
      else if (rng2() < 0.06) setBlockRaw(sections, x, sy + 1, z, ID.nether_sprouts);
      else if (rng2() < 0.03) setBlockRaw(sections, x, sy + 1, z, ID.warped_fungus);
    } else if (bio2.name === 'soul_sand_valley') {
      if (rng2() < 0.02) setBlockRaw(sections, x, sy + 1, z, ID.soul_fire);
      if (rng2() < 0.004) bonePillar(sections, x, sy, z, rng2);
    } else if (bio2.name === 'basalt_deltas') {
      if (rng2() < 0.05) {
        var bh = 1 + ((rng2() * 6) | 0);
        for (var k = 1; k <= bh; k++) setBlockRaw(sections, x, sy + k, z, bpack(ID.basalt, 0));
      }
      if (rng2() < 0.02) setBlockRaw(sections, x, sy, z, ID.magma_block);
    } else {
      if (rng2() < 0.012) setBlockRaw(sections, x, sy + 1, z, ID.fire);
    }
  }
  /* glowstone clusters clinging to the ceiling */
  for (var q = 0; q < 12; q++) {
    var gx = (rng2() * 16) | 0, gz = (rng2() * 16) | 0;
    for (var gy = NETHER_ROOF - 6; gy > 30; gy--) {
      if ((getBlockRaw(sections, gx, gy, gz) & ID_MASK) !== 0 &&
        (getBlockRaw(sections, gx, gy - 1, gz) & ID_MASK) === 0) {
        if (rng2() < 0.30) {
          for (var d = 0; d < 6; d++) {
            var xx = gx + ((rng2() * 3 | 0) - 1), yy = gy - ((rng2() * 3) | 0), zz = gz + ((rng2() * 3 | 0) - 1);
            if (xx < 0 || xx > 15 || zz < 0 || zz > 15) continue;
            if ((getBlockRaw(sections, xx, yy, zz) & ID_MASK) === 0) setBlockRaw(sections, xx, yy, zz, ID.glowstone);
          }
        }
        break;
      }
    }
  }
}
function bonePillar(sections, x, y, z, rng) {
  var h = 5 + ((rng() * 12) | 0), ID = BID;
  for (var i = 0; i < h; i++) {
    var r = i < h * 0.6 ? 1 : 0;
    for (var dz = -r; dz <= r; dz++) for (var dx = -r; dx <= r; dx++) {
      var xx = x + dx, zz = z + dz;
      if (xx < 0 || xx > 15 || zz < 0 || zz > 15) continue;
      setBlockRaw(sections, xx, y + 1 + i, zz, bpack(ID.bone_block, 0));
    }
  }
}

/* ================================= END ================================== */
function genEnd(cx, cz, sections, out) {
  var bx = cx * CH_W, bz = cz * CH_W, ID = BID;
  var heights = new Int16Array(CH_AREA);
  for (var z = 0; z < CH_W; z++) for (var x = 0; x < CH_W; x++) {
    var wx = bx + x, wz = bz + z, ci = z * CH_W + x;
    var dc = Math.sqrt(wx * wx + wz * wz);
    var top = 0;
    if (dc < 190) {
      /* central island: a broad plateau that falls away at the rim */
      var edge = clamp((190 - dc) / 60, 0, 1);
      var hh = 96 + WG.endN.get2(wx, wz) * 9 * edge;
      var thick = 6 + 22 * smoothstep(edge);
      for (var y = Math.floor(hh - thick); y <= Math.floor(hh); y++) {
        if (y < 2) continue;
        setBlockRaw(sections, x, y, z, ID.end_stone); top = y;
      }
      _bioCol[ci] = BIOME_ID.the_end;
    } else {
      var isl = WG.endIsl.get2(wx, wz);
      var far = clamp((dc - 300) / 400, 0, 1);
      var thr = 0.30 - far * 0.12;
      if (isl > thr) {
        var amt = (isl - thr) / (1 - thr);
        var base = 96 + WG.endN.get2(wx * 1.4, wz * 1.4) * 26;
        var t2 = 4 + amt * 30;
        for (var y2 = Math.floor(base - t2); y2 <= Math.floor(base + t2 * 0.28); y2++) {
          if (y2 < 2 || y2 >= CH_H) continue;
          setBlockRaw(sections, x, y2, z, ID.end_stone); top = y2;
        }
        _bioCol[ci] = amt > 0.55 ? BIOME_ID.end_highlands : BIOME_ID.end_midlands;
      } else {
        _bioCol[ci] = dc < 1000 ? BIOME_ID.end_barrens : BIOME_ID.small_end_islands;
      }
    }
    heights[ci] = top;
  }
  out.heights = heights;
  out.oceanFloor = heights;
  /* chorus plants on the highlands */
  var rng = chunkRNG(cx, cz, 0x2ee1);
  for (var q = 0; q < 4; q++) {
    var px = (rng() * 16) | 0, pz = (rng() * 16) | 0;
    var py = heights[pz * CH_W + px];
    if (py < 10) continue;
    if (BIOMES[_bioCol[pz * CH_W + px]].name !== 'end_highlands') continue;
    if (rng() > 0.4) continue;
    chorusPlant(sections, px, py + 1, pz, rng);
  }
}
function chorusPlant(sections, x, y, z, rng) {
  var ID = BID, h = 3 + ((rng() * 6) | 0);
  var cx2 = x, cz2 = z;
  for (var i = 0; i < h; i++) {
    if (cx2 < 0 || cx2 > 15 || cz2 < 0 || cz2 > 15 || y + i >= CH_H) break;
    setBlockRaw(sections, cx2, y + i, cz2, ID.chorus_plant);
    if (i > 1 && rng() < 0.35) { cx2 += rng() < 0.5 ? 1 : -1; }
    if (i > 1 && rng() < 0.35) { cz2 += rng() < 0.5 ? 1 : -1; }
  }
  if (cx2 >= 0 && cx2 < 16 && cz2 >= 0 && cz2 < 16 && y + h < CH_H)
    setBlockRaw(sections, cx2, y + h, cz2, ID.chorus_flower);
}

/* ============================ ENTRY POINT =============================== */
/* Recompute the top solid block per column after structures have edited it. */
function rebuildHeights(sections, heights) {
  for (var z = 0; z < CH_W; z++) for (var x = 0; x < CH_W; x++) {
    var ci = z * CH_W + x;
    var start = Math.min(CH_H - 1, (heights[ci] || 0) + 40);
    var y = start;
    for (; y >= 0; y--) {
      var id = getBlockRaw(sections, x, y, z) & ID_MASK;
      if (id !== 0 && id !== BID.water) break;
    }
    heights[ci] = y < 0 ? 0 : y;
  }
}

WorldGen.generateColumn = function (dim, cx, cz) {
  _latCache = {};
  var sections = new Array(N_SECT);
  for (var i = 0; i < N_SECT; i++) sections[i] = null;
  var out = { structures: null };
  if (dim === DIM_NETHER) genNether(cx, cz, sections, out);
  else if (dim === DIM_END) genEnd(cx, cz, sections, out);
  else {
    genOverworld(cx, cz, sections, out);
    decorate(cx, cz, sections, out.heights);
  }
  if (WorldGen.structurePass) {
    WorldGen.structurePass(dim, cx, cz, sections, out);
    /* structures carve and build, so the surface map has to be redone */
    rebuildHeights(sections, out.heights);
  }

  var biomes = new Uint8Array(CH_AREA);
  biomes.set(_bioCol);
  var data = [], transfer = [], nonEmpty = 0;
  for (var s = 0; s < N_SECT; s++) {
    if (sections[s]) {
      var empty = true;
      for (var k = 0; k < 4096; k++) if (sections[s][k] !== 0) { empty = false; break; }
      if (empty) { data.push(null); continue; }
      data.push(sections[s]);
      transfer.push(sections[s].buffer);
      nonEmpty++;
    } else data.push(null);
  }
  transfer.push(out.heights.buffer, biomes.buffer);
  if (out.oceanFloor !== out.heights) transfer.push(out.oceanFloor.buffer);
  return {
    data: data, heights: out.heights, biomes: biomes, oceanFloor: out.oceanFloor,
    nonEmpty: nonEmpty, structures: out.structures, transfer: transfer
  };
};
