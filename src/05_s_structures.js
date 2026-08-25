/* =========================================================================
 * STRUCTURES
 *
 * Every structure is placed on its own sparse grid: the world is cut into
 * regions of N chunks, one candidate chunk is drawn deterministically from
 * each region, and a structure exists there if the biome and terrain agree.
 * Generation is then done per chunk — a builder clips every write to the
 * chunk currently being generated — so a structure spanning many chunks
 * comes out identical no matter which chunk is generated first.
 * ========================================================================= */

var SB = {                       /* the clipping builder */
  sections: null, cx: 0, cz: 0, bx: 0, bz: 0, out: null, rng: null
};
function sbBegin(sections, cx, cz, out) {
  SB.sections = sections; SB.cx = cx; SB.cz = cz;
  SB.bx = cx * CH_W; SB.bz = cz * CH_W; SB.out = out;
}
function sbSet(wx, wy, wz, v) {
  if (wy < 1 || wy >= CH_H) return;
  var lx = wx - SB.bx, lz = wz - SB.bz;
  if (lx < 0 || lx > 15 || lz < 0 || lz > 15) return;
  setBlockRaw(SB.sections, lx, wy, lz, v);
}
function sbGet(wx, wy, wz) {
  if (wy < 0 || wy >= CH_H) return 0;
  var lx = wx - SB.bx, lz = wz - SB.bz;
  if (lx < 0 || lx > 15 || lz < 0 || lz > 15) return -1;   /* outside: unknown */
  return getBlockRaw(SB.sections, lx, wy, lz) & ID_MASK;
}
function sbFill(x0, y0, z0, x1, y1, z1, v) {
  if (x0 > x1) { var t = x0; x0 = x1; x1 = t; }
  if (y0 > y1) { var t2 = y0; y0 = y1; y1 = t2; }
  if (z0 > z1) { var t3 = z0; z0 = z1; z1 = t3; }
  /* clip to the chunk before looping, so a 60-block hall costs nothing in
     the 55 chunks it does not touch */
  var lx0 = Math.max(x0, SB.bx), lx1 = Math.min(x1, SB.bx + 15);
  var lz0 = Math.max(z0, SB.bz), lz1 = Math.min(z1, SB.bz + 15);
  if (lx0 > lx1 || lz0 > lz1) return;
  var ly0 = Math.max(1, y0), ly1 = Math.min(CH_H - 1, y1);
  for (var y = ly0; y <= ly1; y++)
    for (var z = lz0; z <= lz1; z++)
      for (var x = lx0; x <= lx1; x++)
        setBlockRaw(SB.sections, x - SB.bx, y, z - SB.bz, v);
}
/* hollow box: walls of `wall`, interior of `inner` (0 = air) */
function sbBox(x0, y0, z0, x1, y1, z1, wall, inner) {
  sbFill(x0, y0, z0, x1, y1, z1, wall);
  if (x1 - x0 > 1 && y1 - y0 > 1 && z1 - z0 > 1)
    sbFill(x0 + 1, y0 + 1, z0 + 1, x1 - 1, y1 - 1, z1 - 1, inner || 0);
}
function sbFrame(x0, y0, z0, x1, y1, z1, v) {   /* walls only, open top/bottom */
  sbFill(x0, y0, z0, x1, y1, z0, v);
  sbFill(x0, y0, z1, x1, y1, z1, v);
  sbFill(x0, y0, z0, x0, y1, z1, v);
  sbFill(x1, y0, z0, x1, y1, z1, v);
}
function sbChest(wx, wy, wz, loot, facing) {
  sbSet(wx, wy, wz, bpack(BID.chest, facing === undefined ? 0 : facing));
  var lx = wx - SB.bx, lz = wz - SB.bz;
  if (lx < 0 || lx > 15 || lz < 0 || lz > 15) return;
  SB.out.structures = SB.out.structures || [];
  SB.out.structures.push({ t: 'chest', x: wx, y: wy, z: wz, loot: loot });
}
function sbSpawner(wx, wy, wz, mob) {
  sbSet(wx, wy, wz, BID.spawner);
  var lx = wx - SB.bx, lz = wz - SB.bz;
  if (lx < 0 || lx > 15 || lz < 0 || lz > 15) return;
  SB.out.structures = SB.out.structures || [];
  SB.out.structures.push({ t: 'spawner', x: wx, y: wy, z: wz, mob: mob });
}
function sbMob(wx, wy, wz, mob) {
  var lx = wx - SB.bx, lz = wz - SB.bz;
  if (lx < 0 || lx > 15 || lz < 0 || lz > 15) return;
  SB.out.structures = SB.out.structures || [];
  SB.out.structures.push({ t: 'mob', x: wx, y: wy, z: wz, mob: mob });
}
function sbMark(wx, wz, name) {
  var lx = wx - SB.bx, lz = wz - SB.bz;
  if (lx < 0 || lx > 15 || lz < 0 || lz > 15) return;
  SB.out.structures = SB.out.structures || [];
  SB.out.structures.push({ t: 'mark', x: wx, z: wz, name: name });
}

/* ------------------------------------------------------- placement ---- */
var STRUCT_DEFS = [];
function defStruct(o) { STRUCT_DEFS.push(o); return o; }

function structRegionPos(def, rx, rz, salt) {
  var rng = makeRNG(hash2(rx, rz, (def.salt + salt) >>> 0) >>> 0);
  var span = def.spacing - def.separation;
  var cx = rx * def.spacing + Math.floor(rng() * span);
  var cz = rz * def.spacing + Math.floor(rng() * span);
  return { cx: cx, cz: cz, rng: rng };
}

/* Does this structure exist at that candidate chunk?  Biome and terrain are
   sampled at the centre only, which is how the real game does it too. */
function structValid(def, pos) {
  var wx = pos.cx * 16 + 8, wz = pos.cz * 16 + 8;
  if (def.dim === undefined || def.dim === DIM_OVERWORLD) {
    var cl = climateAt(wx, wz);
    var h = heightFrom(wx, wz, cl);
    var bio = BIOMES[pickBiome(wx, wz, h, cl)];
    if (def.biomes && def.biomes.indexOf(bio.name) < 0) return false;
    if (def.notBiomes && def.notBiomes.indexOf(bio.name) >= 0) return false;
    if (def.ocean) { if (h > SEA - 12) return false; }
    else if (def.needLand !== false && h < SEA + 1) return false;
    if (def.maxSlope !== undefined) {
      var h2 = heightFrom(wx + 12, wz + 12, climateAt(wx + 12, wz + 12));
      var h3 = heightFrom(wx - 12, wz - 12, climateAt(wx - 12, wz - 12));
      if (Math.abs(h2 - h) > def.maxSlope || Math.abs(h3 - h) > def.maxSlope) return false;
    }
    pos.y = Math.round(h);
    pos.biome = bio;
  } else {
    pos.y = def.y || 64;
  }
  if (def.chance !== undefined && pos.rng() > def.chance) return false;
  return true;
}

WorldGen.structurePass = function (dim, cx, cz, sections, out) {
  sbBegin(sections, cx, cz, out);
  for (var i = 0; i < STRUCT_DEFS.length; i++) {
    var def = STRUCT_DEFS[i];
    if ((def.dim === undefined ? DIM_OVERWORLD : def.dim) !== dim) continue;
    var reach = Math.ceil(def.radius / 16) + 1;
    var r0x = Math.floor((cx - reach) / def.spacing), r1x = Math.floor((cx + reach) / def.spacing);
    var r0z = Math.floor((cz - reach) / def.spacing), r1z = Math.floor((cz + reach) / def.spacing);
    for (var rx = r0x; rx <= r1x; rx++) for (var rz = r0z; rz <= r1z; rz++) {
      var pos = structRegionPos(def, rx, rz, 0);
      if (Math.abs(pos.cx - cx) > reach || Math.abs(pos.cz - cz) > reach) continue;
      if (!structValid(def, pos)) continue;
      SB.rng = makeRNG(hash2(pos.cx, pos.cz, (def.salt ^ 0x9e37) >>> 0) >>> 0);
      def.build(pos.cx * 16 + 8, pos.y, pos.cz * 16 + 8, SB.rng, pos);
    }
  }
};

/* small deterministic helpers used by the builders */
function pickR(rng, arr) { return arr[Math.floor(rng() * arr.length) % arr.length]; }
function chanceR(rng, p) { return rng() < p; }

/* ====================== VILLAGE ========================================= */
var VILLAGE_STYLES = {
  plains: { planks: 'oak_planks', log: 'oak_log', stairs: 'oak_stairs', slab: 'oak_slab',
    wall: 'cobblestone', path: 'dirt_path', door: 'oak_door', fence: 'oak_fence',
    roof: 'oak_stairs', light: 'torch', glass: 'glass_pane' },
  desert: { planks: 'smooth_sandstone', log: 'cut_sandstone', stairs: 'sandstone_stairs', slab: 'sandstone_slab',
    wall: 'sandstone', path: 'smooth_sandstone', door: 'acacia_door', fence: 'acacia_fence',
    roof: 'smooth_sandstone', light: 'torch', glass: 'glass_pane' },
  savanna: { planks: 'acacia_planks', log: 'acacia_log', stairs: 'acacia_stairs', slab: 'acacia_slab',
    wall: 'cobblestone', path: 'dirt_path', door: 'acacia_door', fence: 'acacia_fence',
    roof: 'acacia_stairs', light: 'torch', glass: 'glass_pane' },
  taiga: { planks: 'spruce_planks', log: 'spruce_log', stairs: 'spruce_stairs', slab: 'spruce_slab',
    wall: 'cobblestone', path: 'dirt_path', door: 'spruce_door', fence: 'spruce_fence',
    roof: 'spruce_stairs', light: 'torch', glass: 'glass_pane' },
  snowy: { planks: 'spruce_planks', log: 'spruce_log', stairs: 'spruce_stairs', slab: 'spruce_slab',
    wall: 'cobblestone', path: 'dirt_path', door: 'spruce_door', fence: 'spruce_fence',
    roof: 'spruce_stairs', light: 'torch', glass: 'glass_pane' }
};
function styleIds(st) {
  var o = {};
  for (var k in st) o[k] = BID[st[k]] === undefined ? BID.oak_planks : BID[st[k]];
  return o;
}
function villageStyleFor(bio) {
  var n = bio ? bio.name : 'plains';
  if (n.indexOf('desert') >= 0) return VILLAGE_STYLES.desert;
  if (n.indexOf('savanna') >= 0) return VILLAGE_STYLES.savanna;
  if (n.indexOf('snow') >= 0 || n.indexOf('frozen') >= 0 || n === 'grove') return VILLAGE_STYLES.snowy;
  if (n.indexOf('taiga') >= 0) return VILLAGE_STYLES.taiga;
  return VILLAGE_STYLES.plains;
}

function clearAbove(x0, z0, x1, z1, y, h) {
  sbFill(x0, y, z0, x1, y + h, z1, 0);
}
/* drop a foundation down to whatever ground is under the building */
function foundation(x0, z0, x1, z1, y, mat) {
  for (var x = Math.max(x0, SB.bx); x <= Math.min(x1, SB.bx + 15); x++)
    for (var z = Math.max(z0, SB.bz); z <= Math.min(z1, SB.bz + 15); z++) {
      for (var d = 0; d < 8; d++) {
        var id = sbGet(x, y - 1 - d, z);
        if (id !== 0 && id !== BID.water && !BLOCKS[id].liquid) break;
        sbSet(x, y - 1 - d, z, mat);
      }
    }
}

function buildHouse(x, y, z, w, d, rng, S, kind) {
  var ids = styleIds(S);
  var x0 = x - (w >> 1), z0 = z - (d >> 1), x1 = x0 + w - 1, z1 = z0 + d - 1;
  var wallH = kind === 'tall' ? 5 : 3;
  clearAbove(x0 - 1, z0 - 1, x1 + 1, z1 + 1, y + 1, wallH + 5);
  foundation(x0, z0, x1, z1, y, ids.wall);
  sbFill(x0, y, z0, x1, y, z1, ids.planks);
  /* walls with corner posts */
  sbFrame(x0, y + 1, z0, x1, y + wallH, z1, ids.planks);
  sbFill(x0, y + 1, z0, x0, y + wallH, z0, ids.log);
  sbFill(x1, y + 1, z0, x1, y + wallH, z0, ids.log);
  sbFill(x0, y + 1, z1, x0, y + wallH, z1, ids.log);
  sbFill(x1, y + 1, z1, x1, y + wallH, z1, ids.log);
  sbFill(x0 + 1, y + 1, z0 + 1, x1 - 1, y + wallH, z1 - 1, 0);

  /* windows */
  for (var wx2 = x0 + 2; wx2 <= x1 - 2; wx2 += 2) {
    sbSet(wx2, y + 2, z0, ids.glass);
    sbSet(wx2, y + 2, z1, ids.glass);
  }
  for (var wz2 = z0 + 2; wz2 <= z1 - 2; wz2 += 2) {
    sbSet(x0, y + 2, wz2, ids.glass);
    sbSet(x1, y + 2, wz2, ids.glass);
  }
  /* door on the -Z wall */
  var dx = x0 + ((w >> 1));
  sbSet(dx, y + 1, z0, bpack(ids.door, 0));
  sbSet(dx, y + 2, z0, bpack(ids.door, 8));
  sbSet(dx, y, z0 - 1, BID[S.path] === undefined ? BID.dirt_path : BID[S.path]);

  /* pitched roof out of stairs */
  var span = Math.min(w, d);
  var layers = Math.ceil(span / 2);
  for (var r = 0; r < layers; r++) {
    var ry = y + wallH + 1 + r;
    var ax0 = x0 - 1 + r, ax1 = x1 + 1 - r, az0 = z0 - 1 + r, az1 = z1 + 1 - r;
    if (ax0 > ax1 || az0 > az1) break;
    if (w >= d) {
      sbFill(ax0, ry, az0, ax1, ry, az0, bpack(ids.roof, 2));       /* facing +Z */
      sbFill(ax0, ry, az1, ax1, ry, az1, bpack(ids.roof, 0));
      sbFill(ax0, ry, az0 + 1, ax0, ry, az1 - 1, ids.slab);
      sbFill(ax1, ry, az0 + 1, ax1, ry, az1 - 1, ids.slab);
      if (r === layers - 1) sbFill(ax0, ry, az0, ax1, ry, az1, ids.slab);
      else sbFill(ax0 + 1, ry, az0 + 1, ax1 - 1, ry, az1 - 1, 0);
    } else {
      sbFill(ax0, ry, az0, ax0, ry, az1, bpack(ids.roof, 1));
      sbFill(ax1, ry, az0, ax1, ry, az1, bpack(ids.roof, 3));
      if (r === layers - 1) sbFill(ax0, ry, az0, ax1, ry, az1, ids.slab);
      else sbFill(ax0 + 1, ry, az0 + 1, ax1 - 1, ry, az1 - 1, 0);
    }
  }

  /* furnishings */
  var lightId = BID[S.light] === undefined ? BID.torch : BID[S.light];
  sbSet(x0 + 1, y + 3, z0 + 1, lightId);
  sbSet(x1 - 1, y + 3, z1 - 1, lightId);
  if (kind === 'house' || kind === 'tall') {
    sbSet(x0 + 1, y + 1, z1 - 1, BID.red_bed === undefined ? BID.white_wool : BID.red_bed);
    sbSet(x0 + 2, y + 1, z1 - 1, BID.white_wool);
    sbChest(x1 - 1, y + 1, z0 + 1, 'village_house', 0);
    sbSet(x1 - 1, y + 1, z1 - 2, BID.crafting_table);
  }
  if (kind === 'smith') {
    sbSet(x0 + 1, y + 1, z1 - 1, BID.furnace);
    sbSet(x0 + 2, y + 1, z1 - 1, BID.blast_furnace);
    sbSet(x0 + 1, y + 1, z1 - 2, BID.smithing_table);
    sbSet(x1 - 1, y + 1, z1 - 1, BID.anvil);
    sbChest(x1 - 1, y + 1, z0 + 1, 'village_smith', 0);
    sbFill(x0 + 2, y + 1, z0 + 1, x0 + 2, y + 1, z0 + 1, BID.lava);
    sbFill(x0 + 1, y, z0 + 1, x0 + 3, y, z0 + 2, BID.stone_bricks);
  }
  if (kind === 'library') {
    sbFill(x0 + 1, y + 1, z1 - 1, x1 - 1, y + 3, z1 - 1, BID.bookshelf);
    sbSet(x0 + 1, y + 1, z0 + 1, BID.lectern);
    sbSet(x1 - 1, y + 1, z0 + 1, BID.cartography_table);
  }
  sbMob(x, y + 1, z, 'villager');
  if (kind === 'house' || kind === 'tall') sbMob(x + 1, y + 1, z, 'villager');
}

function buildFarm(x, y, z, w, d, rng, S) {
  var ids = styleIds(S);
  var x0 = x - (w >> 1), z0 = z - (d >> 1), x1 = x0 + w - 1, z1 = z0 + d - 1;
  clearAbove(x0, z0, x1, z1, y + 1, 4);
  foundation(x0, z0, x1, z1, y, BID.dirt);
  sbFrame(x0, y, z0, x1, y, z1, BID.oak_log);
  sbFrame(x0, y + 1, z0, x1, y + 1, z1, ids.fence);
  sbFill(x0 + 1, y, z0 + 1, x1 - 1, y, z1 - 1, BID.farmland);
  /* an irrigation channel down the middle */
  var mz = (z0 + z1) >> 1;
  sbFill(x0 + 1, y, mz, x1 - 1, y, mz, BID.water);
  var crops = [BID.wheat, BID.carrots, BID.potatoes, BID.beetroots];
  var crop = crops[Math.floor(rng() * crops.length) % crops.length];
  if (crop === undefined) crop = BID.wheat;
  for (var cx2 = x0 + 1; cx2 <= x1 - 1; cx2++)
    for (var cz2 = z0 + 1; cz2 <= z1 - 1; cz2++) {
      if (cz2 === mz) continue;
      sbSet(cx2, y + 1, cz2, bpack(crop, Math.floor(rng() * 8)));
    }
  sbSet(x0, y + 2, z0, BID.torch);
  sbSet(x1, y + 2, z1, BID.torch);
}

function buildWell(x, y, z, rng, S) {
  var ids = styleIds(S);
  clearAbove(x - 3, z - 3, x + 3, z + 3, y + 1, 8);
  sbFill(x - 2, y, z - 2, x + 2, y, z + 2, ids.wall);
  sbFill(x - 1, y - 4, z - 1, x + 1, y, z + 1, BID.water);
  sbFrame(x - 2, y + 1, z - 2, x + 2, y + 1, z + 2, ids.wall);
  sbFill(x - 1, y + 1, z - 1, x + 1, y + 1, z + 1, BID.water);
  var posts = [[x - 2, z - 2], [x + 2, z - 2], [x - 2, z + 2], [x + 2, z + 2]];
  for (var i = 0; i < 4; i++) sbFill(posts[i][0], y + 2, posts[i][1], posts[i][0], y + 4, posts[i][1], ids.log);
  sbFill(x - 2, y + 5, z - 2, x + 2, y + 5, z + 2, ids.slab);
  sbSet(x, y + 5, z, ids.planks);
  sbMob(x + 3, y + 1, z, 'villager');
  sbMob(x - 3, y + 1, z, 'iron_golem');
}

defStruct({
  name: 'village', salt: 0x51a3, spacing: 22, separation: 7, radius: 56, chance: 0.62,
  maxSlope: 10,
  biomes: ['plains', 'sunflower_plains', 'meadow', 'savanna', 'savanna_plateau', 'desert',
    'taiga', 'snowy_plains', 'snowy_taiga', 'old_growth_pine_taiga'],
  build: function (x, y, z, rng, pos) {
    var S = villageStyleFor(pos.biome);
    var ids = styleIds(S);
    sbMark(x, z, 'Village');
    buildWell(x, y, z, rng, S);
    /* roads radiate from the well; buildings sit along them */
    var arms = 4;
    for (var a = 0; a < arms; a++) {
      var ang = a * Math.PI / 2;
      var dx = Math.round(Math.cos(ang)), dz = Math.round(Math.sin(ang));
      var len = 16 + Math.floor(rng() * 14);
      for (var t = 3; t <= len; t++) {
        var rxp = x + dx * t, rzp = z + dz * t;
        for (var w2 = -1; w2 <= 1; w2++) {
          var px = rxp + (dz ? w2 : 0), pz = rzp + (dx ? w2 : 0);
          var gy = y;
          sbSet(px, gy, pz, BID[S.path] === undefined ? BID.dirt_path : BID[S.path]);
          sbFill(px, gy + 1, pz, px, gy + 3, pz, 0);
        }
        if (t % 6 === 0 && rng() < 0.8) {
          var side = rng() < 0.5 ? 1 : -1;
          var ox = rxp + (dz ? 0 : side * 5), oz = rzp + (dx ? 0 : side * 5);
          if (!dz) { ox = rxp; oz = rzp + side * 5; }
          else { ox = rxp + side * 5; oz = rzp; }
          var roll = rng();
          if (roll < 0.16) buildFarm(ox, y, oz, 7 + (rng() * 3 | 0) * 2, 7, rng, S);
          else if (roll < 0.28) buildHouse(ox, y, oz, 7, 7, rng, S, 'smith');
          else if (roll < 0.40) buildHouse(ox, y, oz, 7, 7, rng, S, 'library');
          else if (roll < 0.62) buildHouse(ox, y, oz, 7, 9, rng, S, 'tall');
          else buildHouse(ox, y, oz, 7, 7, rng, S, 'house');
        }
        if (t % 5 === 2 && rng() < 0.4) {
          var lx = rxp + (dz ? 2 : 0), lz = rzp + (dx ? 2 : 0);
          sbFill(lx, y + 1, lz, lx, y + 3, lz, BID.oak_fence);
          sbSet(lx, y + 4, lz, BID.lantern);
        }
      }
    }
  }
});

/* ====================== DESERT AND JUNGLE TEMPLES ======================= */
defStruct({
  name: 'desert_pyramid', salt: 0x2f71, spacing: 20, separation: 6, radius: 24, chance: 0.75,
  biomes: ['desert'], maxSlope: 6,
  build: function (x, y, z, rng) {
    sbMark(x, z, 'Desert Pyramid');
    var SS = BID.sandstone, CS = BID.cut_sandstone, CH = BID.chiseled_sandstone;
    var base = y - 1;
    clearAbove(x - 11, z - 11, x + 11, z + 11, base + 1, 16);
    for (var lvl = 0; lvl < 10; lvl++) {
      var r = 10 - lvl;
      if (r < 1) break;
      sbFill(x - r, base + lvl, z - r, x + r, base + lvl, z + r, lvl % 3 === 0 ? CS : SS);
    }
    /* two towers */
    for (var s = -1; s <= 1; s += 2) {
      sbFill(x + s * 9, base, z - 9, x + s * 9, base + 10, z - 9, SS);
      sbFill(x + s * 9 - 1, base + 10, z - 10, x + s * 9 + 1, base + 12, z - 8, SS);
      sbFill(x + s * 9, base + 11, z - 9, x + s * 9, base + 12, z - 9, 0);
      sbSet(x + s * 9, base + 13, z - 9, CH);
    }
    /* entrance hall */
    sbFill(x - 2, base + 1, z - 10, x + 2, base + 4, z + 2, 0);
    sbFill(x - 2, base, z - 10, x + 2, base, z + 2, SS);
    sbFill(x - 1, base + 1, z + 1, x + 1, base + 3, z + 1, CH);
    /* hidden treasure room below the floor */
    var ty = base - 12;
    sbBox(x - 5, ty, z - 5, x + 5, ty + 5, z + 5, SS, 0);
    sbFill(x - 1, ty + 1, z - 1, x + 1, ty + 1, z + 1, BID.blue_terracotta);
    sbSet(x, ty + 1, z, BID.tnt);
    sbFill(x, ty + 1, z, x, ty + 1, z, BID.tnt);
    sbSet(x, ty + 2, z, BID.stone_pressure_plate);
    sbChest(x - 4, ty + 1, z - 4, 'desert_temple', 0);
    sbChest(x + 4, ty + 1, z - 4, 'desert_temple', 0);
    sbChest(x - 4, ty + 1, z + 4, 'desert_temple', 0);
    sbChest(x + 4, ty + 1, z + 4, 'desert_temple', 0);
    /* shaft down from the hall */
    sbFill(x, ty + 5, z, x, base, z, 0);
    /* decorative orange/blue motif on the face */
    for (var m = -1; m <= 1; m++) sbFill(x + m, base + 5, z - 10, x + m, base + 7, z - 10, m === 0 ? BID.orange_terracotta : BID.blue_terracotta);
  }
});

defStruct({
  name: 'jungle_temple', salt: 0x77c1, spacing: 20, separation: 6, radius: 18, chance: 0.6,
  biomes: ['jungle', 'sparse_jungle', 'bamboo_jungle'], maxSlope: 7,
  build: function (x, y, z, rng) {
    sbMark(x, z, 'Jungle Temple');
    var C = BID.mossy_cobblestone, CB = BID.cobblestone, CS = BID.chiseled_stone_bricks;
    var base = y - 1;
    clearAbove(x - 7, z - 8, x + 7, z + 8, base + 1, 14);
    sbBox(x - 6, base, z - 7, x + 6, base + 9, z + 7, rng() < 0.5 ? C : CB, 0);
    /* stepped entrance */
    sbFill(x - 2, base + 1, z - 7, x + 2, base + 4, z - 7, 0);
    sbFill(x - 2, base + 1, z - 8, x + 2, base + 1, z - 8, C);
    /* upper floor and roof crenellations */
    sbFill(x - 5, base + 5, z - 6, x + 5, base + 5, z + 6, CB);
    for (var i = -6; i <= 6; i += 2) { sbSet(x + i, base + 10, z - 7, C); sbSet(x + i, base + 10, z + 7, C); }
    for (var j = -7; j <= 7; j += 2) { sbSet(x - 6, base + 10, z + j, C); sbSet(x + 6, base + 10, z + j, C); }
    /* trapped corridor with the classic tripwire and dispensers */
    sbFill(x - 4, base + 1, z - 5, x + 4, base + 4, z + 5, 0);
    sbFill(x - 1, base + 1, z + 3, x + 1, base + 1, z + 5, CB);
    sbSet(x - 2, base + 2, z + 4, BID.dispenser);
    sbSet(x + 2, base + 2, z + 4, BID.dispenser);
    sbFill(x - 1, base + 2, z + 4, x + 1, base + 2, z + 4, BID.tripwire_hook);
    sbChest(x, base + 1, z + 5, 'jungle_temple', 0);
    /* puzzle levers */
    sbFill(x - 4, base + 1, z - 4, x - 2, base + 3, z - 4, CS);
    for (var l = 0; l < 3; l++) sbSet(x - 4 + l, base + 2, z - 3, bpack(BID.lever, 0));
    sbChest(x - 4, base + 6, z + 4, 'jungle_temple', 0);
    /* vines creeping over the stone */
    for (var v = 0; v < 60; v++) {
      var vx = x - 6 + Math.floor(rng() * 13), vz = z - 7 + Math.floor(rng() * 15);
      var vy = base + 1 + Math.floor(rng() * 9);
      if (sbGet(vx, vy, vz) === 0 && BID.vine !== undefined) sbSet(vx, vy, vz, BID.vine);
    }
  }
});

/* ====================== WITCH HUT / IGLOO / DESERT WELL ================= */
defStruct({
  name: 'swamp_hut', salt: 0x3311, spacing: 18, separation: 6, radius: 12, chance: 0.5,
  biomes: ['swamp', 'mangrove_swamp'], needLand: false,
  build: function (x, y, z, rng) {
    var base = Math.max(y, SEA) + 3;
    sbMark(x, z, "Witch's Hut");
    clearAbove(x - 4, z - 5, x + 4, z + 5, base, 8);
    for (var px = -3; px <= 3; px += 6) for (var pz = -4; pz <= 4; pz += 8)
      sbFill(x + px, base - 6, z + pz, x + px, base - 1, z + pz, BID.spruce_log);
    sbFill(x - 3, base - 1, z - 4, x + 3, base - 1, z + 4, BID.spruce_planks);
    sbFrame(x - 3, base, z - 4, x + 3, base + 3, z + 4, BID.spruce_planks);
    sbFill(x - 4, base + 4, z - 5, x + 4, base + 4, z + 5, BID.spruce_slab);
    sbFill(x, base, z - 4, x, base + 1, z - 4, 0);
    sbSet(x - 2, base, z + 3, BID.cauldron);
    sbSet(x + 2, base, z + 3, BID.crafting_table);
    sbSet(x + 2, base, z - 3, BID.brewing_stand === undefined ? BID.crafting_table : BID.brewing_stand);
    sbFill(x - 1, base, z, x + 1, base, z, 0);
    sbSet(x - 2, base + 2, z, BID.torch);
    sbMob(x, base + 1, z, 'witch');
    sbMob(x + 1, base + 1, z + 1, 'cat');
  }
});
defStruct({
  name: 'igloo', salt: 0x6a2d, spacing: 18, separation: 6, radius: 8, chance: 0.5,
  biomes: ['snowy_plains', 'snowy_taiga', 'snowy_slopes', 'frozen_peaks', 'ice_spikes'],
  build: function (x, y, z, rng) {
    sbMark(x, z, 'Igloo');
    var S = BID.snow_block, base = y;
    clearAbove(x - 5, z - 5, x + 5, z + 5, base + 1, 8);
    for (var dy = 0; dy <= 4; dy++) {
      var r = Math.round(Math.sqrt(Math.max(0, 16 - dy * dy)));
      for (var dx = -r; dx <= r; dx++) for (var dz = -r; dz <= r; dz++) {
        if (dx * dx + dz * dz > r * r) continue;
        var shell = dx * dx + dz * dz > (r - 1) * (r - 1) || dy === 4;
        sbSet(x + dx, base + dy, z + dz, shell ? S : 0);
      }
    }
    sbFill(x - 1, base + 1, z + 3, x + 1, base + 2, z + 5, 0);
    sbFill(x - 1, base, z + 3, x + 1, base, z + 5, S);
    sbSet(x - 2, base + 1, z - 2, BID.red_bed === undefined ? BID.white_wool : BID.red_bed);
    sbSet(x + 2, base + 1, z - 2, BID.crafting_table);
    sbSet(x + 2, base + 1, z + 1, BID.furnace);
    sbSet(x, base + 3, z, BID.redstone_torch);
    sbSet(x - 2, base + 1, z + 1, BID.oak_trapdoor);
    /* the cellar under the carpet */
    if (rng() < 0.5) {
      var cy = base - 10;
      sbBox(x - 3, cy, z - 3, x + 3, cy + 4, z + 3, BID.stone_bricks, 0);
      sbFill(x, cy + 4, z, x, base, z, BID.ladder);
      sbChest(x - 2, cy + 1, z - 2, 'igloo', 0);
      sbSet(x + 1, cy + 1, z + 1, BID.brewing_stand === undefined ? BID.crafting_table : BID.brewing_stand);
      sbMob(x + 2, cy + 1, z + 2, 'zombie_villager');
      sbMob(x - 2, cy + 1, z + 2, 'villager');
    }
  }
});
defStruct({
  name: 'desert_well', salt: 0x18b7, spacing: 14, separation: 5, radius: 5, chance: 0.10,
  biomes: ['desert'],
  build: function (x, y, z, rng) {
    var SS = BID.sandstone, SL = BID.sandstone_slab;
    sbFill(x - 2, y, z - 2, x + 2, y, z + 2, SS);
    sbFill(x - 1, y - 3, z - 1, x + 1, y, z + 1, BID.water);
    for (var i = -1; i <= 1; i += 2) for (var j = -1; j <= 1; j += 2)
      sbFill(x + i * 2, y + 1, z + j * 2, x + i * 2, y + 3, z + j * 2, SS);
    sbFill(x - 2, y + 4, z - 2, x + 2, y + 4, z + 2, SL);
  }
});

/* ====================== RUINED PORTAL =================================== */
defStruct({
  name: 'ruined_portal', salt: 0x44e9, spacing: 14, separation: 4, radius: 10, chance: 0.34,
  build: function (x, y, z, rng) {
    var O = BID.obsidian, CO = BID.crying_obsidian;
    var w = 3 + Math.floor(rng() * 2), h = 4 + Math.floor(rng() * 2);
    var vertical = rng() < 0.5;
    clearAbove(x - w - 2, z - w - 2, x + w + 2, z + w + 2, y + 1, h + 3);
    for (var a = -1; a <= w; a++) for (var b = 0; b <= h; b++) {
      var edge = (a === -1 || a === w || b === 0 || b === h);
      if (!edge) continue;
      if (rng() < 0.28) continue;                 /* ruined: bits are missing */
      var bx = vertical ? x + a : x, bz = vertical ? z : z + a;
      sbSet(bx, y + b, bz, rng() < 0.2 ? CO : O);
    }
    /* scorched ground and rubble */
    for (var i = 0; i < 90; i++) {
      var rx = x + Math.floor(rng() * 13) - 6, rz = z + Math.floor(rng() * 13) - 6;
      var ry = y + Math.floor(rng() * 3) - 1;
      if (rng() < 0.5) sbSet(rx, ry, rz, BID.netherrack);
      else if (rng() < 0.25) sbSet(rx, ry, rz, BID.magma_block);
      else if (rng() < 0.1) sbSet(rx, ry + 1, rz, BID.fire);
      else if (rng() < 0.2) sbSet(rx, ry, rz, BID.blackstone);
      else if (rng() < 0.1) sbSet(rx, ry, rz, BID.gold_block);
    }
    sbChest(x + 2, y + 1, z + 2, 'ruined_portal', 0);
  }
});

/* ====================== PILLAGER OUTPOST ================================ */
defStruct({
  name: 'pillager_outpost', salt: 0x9a13, spacing: 24, separation: 8, radius: 14, chance: 0.35,
  maxSlope: 8,
  notBiomes: ['ocean', 'deep_ocean', 'frozen_ocean', 'warm_ocean', 'lukewarm_ocean', 'cold_ocean',
    'deep_frozen_ocean', 'deep_cold_ocean', 'deep_lukewarm_ocean', 'mushroom_fields'],
  build: function (x, y, z, rng) {
    sbMark(x, z, 'Pillager Outpost');
    var L = BID.dark_oak_log, P = BID.dark_oak_planks, F = BID.dark_oak_fence, S = BID.dark_oak_slab;
    clearAbove(x - 5, z - 5, x + 5, z + 5, y + 1, 20);
    foundation(x - 4, z - 4, x + 4, z + 4, y, BID.cobblestone);
    /* four legs and the tower shaft */
    for (var i = -3; i <= 3; i += 6) for (var j = -3; j <= 3; j += 6)
      sbFill(x + i, y, z + j, x + i, y + 9, z + j, L);
    for (var lvl = 0; lvl < 3; lvl++) {
      var fy = y + 3 + lvl * 4;
      sbFill(x - 3, fy, z - 3, x + 3, fy, z + 3, P);
      sbFrame(x - 3, fy + 1, z - 3, x + 3, fy + 2, z + 3, lvl === 2 ? P : F);
      sbFill(x - 2, fy + 1, z - 2, x + 2, fy + 2, z + 2, 0);
    }
    var ty = y + 11;
    sbFill(x - 4, ty, z - 4, x + 4, ty, z + 4, P);
    sbFrame(x - 4, ty + 1, z - 4, x + 4, ty + 2, z + 4, F);
    sbFill(x - 4, ty + 4, z - 4, x + 4, ty + 4, z + 4, S);
    for (var c = -4; c <= 4; c += 8) for (var d = -4; d <= 4; d += 8)
      sbFill(x + c, ty + 1, z + d, x + c, ty + 3, z + d, L);
    /* ladder up the middle */
    sbFill(x, y + 1, z, x, ty, z, 0);
    sbFill(x, y + 1, z + 1, x, ty, z + 1, BID.ladder);
    sbChest(x + 2, ty + 1, z + 2, 'outpost', 0);
    /* banner post out front */
    sbFill(x + 5, y + 1, z, x + 5, y + 4, z, L);
    sbSet(x + 5, y + 5, z, BID.white_wool);
    sbMob(x, ty + 1, z, 'pillager');
    sbMob(x + 1, ty + 1, z + 1, 'pillager');
    sbMob(x - 2, y + 1, z - 2, 'pillager');
    sbMob(x + 2, y + 1, z + 3, 'pillager');
  }
});

/* ====================== SHIPWRECK / BURIED TREASURE ===================== */
defStruct({
  name: 'shipwreck', salt: 0x2b8f, spacing: 16, separation: 5, radius: 14, chance: 0.35,
  ocean: true, needLand: false,
  build: function (x, y, z, rng) {
    sbMark(x, z, 'Shipwreck');
    var P = BID.oak_planks, L = BID.oak_log, S = BID.oak_stairs, F = BID.oak_fence;
    var base = Math.max(4, y + 1);
    var tilt = rng() < 0.5 ? 1 : 0;
    /* hull: 18 long, 6 wide, tapering at both ends */
    for (var i = -9; i <= 9; i++) {
      var half = Math.max(1, 3 - Math.floor(Math.abs(i) / 4));
      var yy = base + (tilt ? Math.floor((i + 9) / 6) : 0);
      sbFill(x - half, yy, z + i, x + half, yy, z + i, P);
      sbFill(x - half, yy + 1, z + i, x - half, yy + 3, z + i, P);
      sbFill(x + half, yy + 1, z + i, x + half, yy + 3, z + i, P);
      if ((i + 9) % 5 === 0) {
        sbFill(x - half, yy + 1, z + i, x + half, yy + 1, z + i, L);
      }
      if (rng() < 0.22) sbSet(x - half, yy + 3, z + i, 0);
      if (rng() < 0.22) sbSet(x + half, yy + 2, z + i, 0);
    }
    /* deck and masts */
    sbFill(x - 3, base + 4, z - 6, x + 3, base + 4, z + 6, P);
    for (var m = -4; m <= 4; m += 8) sbFill(x, base + 5, z + m, x, base + 11, z + m, L);
    sbFill(x - 2, base + 8, z - 4, x + 2, base + 10, z - 4, BID.white_wool);
    /* three cargo holds */
    sbChest(x, base + 1, z - 7, 'shipwreck_treasure', 0);
    sbChest(x, base + 1, z + 7, 'shipwreck_supply', 0);
    sbChest(x + 1, base + 5, z + 5, 'shipwreck_map', 0);
    for (var g = 0; g < 24; g++) {
      var gx = x - 3 + Math.floor(rng() * 7), gz = z - 9 + Math.floor(rng() * 19);
      if (sbGet(gx, base + 1, gz) === 0 && rng() < 0.4) sbSet(gx, base + 1, gz, BID.seagrass === undefined ? 0 : BID.seagrass);
    }
  }
});
defStruct({
  name: 'buried_treasure', salt: 0x7f21, spacing: 12, separation: 4, radius: 3, chance: 0.06,
  biomes: ['beach', 'snowy_beach', 'stony_shore'],
  build: function (x, y, z, rng) {
    sbChest(x, y - 3, z, 'buried_treasure', 0);
    sbFill(x - 1, y - 4, z - 1, x + 1, y - 2, z + 1, BID.sand);
    sbSet(x, y - 3, z, bpack(BID.chest, 0));
  }
});

/* ====================== OCEAN MONUMENT ================================== */
defStruct({
  name: 'ocean_monument', salt: 0x5d02, spacing: 30, separation: 10, radius: 34, chance: 0.55,
  ocean: true, needLand: false,
  biomes: ['deep_ocean', 'deep_cold_ocean', 'deep_lukewarm_ocean', 'deep_frozen_ocean', 'ocean', 'cold_ocean', 'lukewarm_ocean'],
  build: function (x, y, z, rng) {
    sbMark(x, z, 'Ocean Monument');
    var P = BID.prismarine, B = BID.prismarine_bricks, D = BID.dark_prismarine, S = BID.sea_lantern;
    var base = Math.max(6, Math.min(y + 1, SEA - 22));
    /* foundation plinth */
    sbFill(x - 28, base - 1, z - 28, x + 28, base - 1, z + 28, B);
    /* outer wall */
    sbFrame(x - 28, base, z - 28, x + 28, base + 22, z + 28, P);
    /* main hall */
    sbBox(x - 12, base, z - 12, x + 12, base + 16, z + 12, B, 0);
    sbFill(x - 10, base + 1, z - 10, x + 10, base + 1, z + 10, D);
    for (var i = -8; i <= 8; i += 8) for (var j = -8; j <= 8; j += 8) {
      sbFill(x + i, base + 1, z + j, x + i, base + 15, z + j, P);
      sbSet(x + i, base + 8, z + j, S);
    }
    /* wings */
    for (var a = -1; a <= 1; a += 2) for (var b = -1; b <= 1; b += 2) {
      var wx = x + a * 20, wz = z + b * 20;
      sbBox(wx - 6, base, wz - 6, wx + 6, base + 10, wz + 6, P, 0);
      sbSet(wx, base + 5, wz, S);
      sbFill(wx - 1, base + 1, wz - 1, wx + 1, base + 1, wz + 1, D);
      sbMob(wx, base + 3, wz, 'guardian');
    }
    /* the treasure core */
    sbBox(x - 4, base + 4, z - 4, x + 4, base + 10, z + 4, D, 0);
    sbFill(x - 1, base + 5, z - 1, x + 1, base + 7, z + 1, BID.gold_block);
    /* lantern grid on the roof */
    for (var lx = -24; lx <= 24; lx += 8) for (var lz = -24; lz <= 24; lz += 8)
      sbSet(x + lx, base + 22, z + lz, S);
    sbMob(x, base + 12, z, 'elder_guardian');
    sbMob(x + 14, base + 6, z, 'elder_guardian');
    sbMob(x - 14, base + 6, z, 'elder_guardian');
    for (var g = 0; g < 10; g++) sbMob(x + Math.floor(rng() * 40) - 20, base + 4 + Math.floor(rng() * 10), z + Math.floor(rng() * 40) - 20, 'guardian');
  }
});

/* ====================== WOODLAND MANSION ================================ */
defStruct({
  name: 'woodland_mansion', salt: 0x8e44, spacing: 46, separation: 14, radius: 34, chance: 0.85,
  biomes: ['dark_forest', 'pale_garden'], maxSlope: 8,
  build: function (x, y, z, rng) {
    sbMark(x, z, 'Woodland Mansion');
    var P = BID.dark_oak_planks, L = BID.dark_oak_log, C = BID.cobblestone;
    var W = 27, D = 21;
    var x0 = x - (W >> 1), z0 = z - (D >> 1), x1 = x0 + W, z1 = z0 + D;
    clearAbove(x0 - 2, z0 - 2, x1 + 2, z1 + 2, y + 1, 26);
    foundation(x0, z0, x1, z1, y, C);
    sbFill(x0, y, z0, x1, y, z1, C);
    for (var floor = 0; floor < 3; floor++) {
      var fy = y + 1 + floor * 6;
      sbFill(x0, fy - 1, z0, x1, fy - 1, z1, P);
      sbFrame(x0, fy, z0, x1, fy + 4, z1, P);
      /* corner and mid posts */
      for (var px = x0; px <= x1; px += 6) {
        sbFill(px, fy, z0, px, fy + 4, z0, L);
        sbFill(px, fy, z1, px, fy + 4, z1, L);
      }
      for (var pz = z0; pz <= z1; pz += 5) {
        sbFill(x0, fy, pz, x0, fy + 4, pz, L);
        sbFill(x1, fy, pz, x1, fy + 4, pz, L);
      }
      /* windows */
      for (var wx = x0 + 2; wx < x1; wx += 3) {
        sbFill(wx, fy + 1, z0, wx, fy + 2, z0, BID.glass_pane);
        sbFill(wx, fy + 1, z1, wx, fy + 2, z1, BID.glass_pane);
      }
      for (var wz = z0 + 2; wz < z1; wz += 3) {
        sbFill(x0, fy + 1, wz, x0, fy + 2, wz, BID.glass_pane);
        sbFill(x1, fy + 1, wz, x1, fy + 2, wz, BID.glass_pane);
      }
      /* interior rooms on a 6x5 grid */
      for (var rxi = 0; rxi < 4; rxi++) for (var rzi = 0; rzi < 4; rzi++) {
        var rx0 = x0 + 1 + rxi * 6, rz0 = z0 + 1 + rzi * 5;
        var rx1 = Math.min(x1 - 1, rx0 + 5), rz1 = Math.min(z1 - 1, rz0 + 4);
        sbFill(rx0, fy, rz0, rx1, fy + 4, rz1, 0);
        sbFrame(rx0, fy, rz0, rx1, fy + 4, rz1, P);
        /* a doorway per room */
        sbFill(rx0 + 2, fy, rz0, rx0 + 3, fy + 1, rz0, 0);
        var roll = rng();
        if (roll < 0.18) {           /* bedroom */
          sbSet(rx0 + 1, fy, rz1 - 1, BID.red_bed === undefined ? BID.red_wool : BID.red_bed);
          sbSet(rx0 + 2, fy, rz1 - 1, BID.red_wool);
          sbChest(rx1 - 1, fy, rz0 + 1, 'mansion', 0);
        } else if (roll < 0.30) {    /* library */
          sbFill(rx0 + 1, fy, rz1 - 1, rx1 - 1, fy + 2, rz1 - 1, BID.bookshelf);
          sbSet(rx0 + 1, fy, rz0 + 1, BID.lectern);
        } else if (roll < 0.40) {    /* altar */
          sbFill(rx0 + 2, fy, rz0 + 2, rx0 + 3, fy, rz0 + 2, BID.red_carpet === undefined ? BID.red_wool : BID.red_carpet);
          sbSet(rx0 + 2, fy, rz0 + 3, BID.dark_oak_stairs);
        } else if (roll < 0.5) {     /* storage */
          sbChest(rx0 + 1, fy, rz0 + 1, 'mansion', 0);
          sbSet(rx0 + 2, fy, rz0 + 1, BID.barrel);
        }
        sbSet(rx0 + 1, fy + 3, rz0 + 1, BID.torch);
        if (rng() < 0.35) sbMob(rx0 + 2, fy + 1, rz0 + 2, rng() < 0.5 ? 'vindicator' : 'evoker');
      }
      /* stairwell */
      sbFill(x + 1, fy, z, x + 3, fy + 4, z + 2, 0);
      sbFill(x + 1, fy, z, x + 1, fy + 5, z, BID.ladder);
    }
    /* grand entrance and roof */
    sbFill(x - 1, y + 1, z0, x + 1, y + 3, z0, 0);
    sbFill(x - 2, y + 1, z0 - 2, x + 2, y + 1, z0 - 1, BID.cobblestone_slab);
    var ry = y + 19;
    sbFill(x0 - 1, ry, z0 - 1, x1 + 1, ry, z1 + 1, P);
    sbFrame(x0 - 1, ry + 1, z0 - 1, x1 + 1, ry + 2, z1 + 1, BID.dark_oak_fence);
    for (var t = x0; t <= x1; t += 6) { sbFill(t, ry + 1, z0 - 1, t, ry + 3, z0 - 1, L); sbFill(t, ry + 1, z1 + 1, t, ry + 3, z1 + 1, L); }
    sbMob(x, y + 2, z + 2, 'vindicator');
    sbMob(x + 3, y + 2, z + 2, 'evoker');
  }
});

/* ====================== MINESHAFT ======================================= */
defStruct({
  name: 'mineshaft', salt: 0x1f3c, spacing: 16, separation: 5, radius: 40, chance: 0.5,
  needLand: false,
  build: function (x, y, z, rng, pos) {
    var top = Math.min(pos.y - 8, SEA - 4);
    var by = clamp(14 + Math.floor(rng() * 34), 12, Math.max(14, top));
    var P = BID.oak_planks, F = BID.oak_fence, L = BID.oak_log, R = BID.rail;
    /* a few long corridors radiating from the hub, each with side branches */
    var arms = 3 + Math.floor(rng() * 3);
    for (var a = 0; a < arms; a++) {
      var ang = rng() * Math.PI * 2;
      var dx = Math.abs(Math.cos(ang)) > Math.abs(Math.sin(ang)) ? (Math.cos(ang) > 0 ? 1 : -1) : 0;
      var dz = dx === 0 ? (Math.sin(ang) > 0 ? 1 : -1) : 0;
      var len = 24 + Math.floor(rng() * 34);
      var cy = by;
      for (var t = 0; t < len; t++) {
        var px = x + dx * t, pz = z + dz * t;
        if (t % 14 === 13) cy += rng() < 0.5 ? -1 : 1;
        sbFill(px - (dz ? 1 : 0), cy, pz - (dx ? 1 : 0), px + (dz ? 1 : 0), cy + 2, pz + (dx ? 1 : 0), 0);
        sbFill(px - (dz ? 1 : 0), cy - 1, pz - (dx ? 1 : 0), px + (dz ? 1 : 0), cy - 1, pz + (dx ? 1 : 0), BID.oak_planks);
        if (t % 5 === 0) {
          /* support frame */
          sbFill(px - (dz ? 1 : 0), cy, pz - (dx ? 1 : 0), px - (dz ? 1 : 0), cy + 1, pz - (dx ? 1 : 0), F);
          sbFill(px + (dz ? 1 : 0), cy, pz + (dx ? 1 : 0), px + (dz ? 1 : 0), cy + 1, pz + (dx ? 1 : 0), F);
          sbFill(px - (dz ? 1 : 0), cy + 2, pz - (dx ? 1 : 0), px + (dz ? 1 : 0), cy + 2, pz + (dx ? 1 : 0), L);
          if (rng() < 0.35) sbSet(px, cy + 2, pz, BID.torch);
        }
        if (rng() < 0.6) sbSet(px, cy, pz, R);
        if (rng() < 0.05) sbSet(px, cy, pz, BID.cobweb === undefined ? 0 : BID.cobweb);
        if (rng() < 0.035) { sbSpawner(px, cy, pz, 'cave_spider'); sbFill(px - 2, cy - 1, pz - 2, px + 2, cy + 2, pz + 2, 0); }
        if (rng() < 0.03) sbChest(px + (dz ? 1 : 0), cy, pz + (dx ? 1 : 0), 'mineshaft', 0);
        /* side branch */
        if (t > 6 && rng() < 0.06) {
          var sdx = dz, sdz = dx, sl = 6 + Math.floor(rng() * 12), sgn = rng() < 0.5 ? 1 : -1;
          for (var s = 1; s < sl; s++) {
            var sx = px + sdx * s * sgn, sz = pz + sdz * s * sgn;
            sbFill(sx - (sdz ? 1 : 0), cy, sz - (sdx ? 1 : 0), sx + (sdz ? 1 : 0), cy + 2, sz + (sdx ? 1 : 0), 0);
            if (s % 5 === 0) sbFill(sx, cy + 2, sz, sx, cy + 2, sz, L);
            if (rng() < 0.04) sbChest(sx, cy, sz, 'mineshaft', 0);
          }
        }
      }
    }
    /* the hub room */
    sbFill(x - 3, by, z - 3, x + 3, by + 3, z + 3, 0);
    sbFill(x - 3, by - 1, z - 3, x + 3, by - 1, z + 3, P);
    sbFill(x - 3, by, z - 3, x - 3, by + 2, z - 3, L);
    sbFill(x + 3, by, z + 3, x + 3, by + 2, z + 3, L);
    sbSet(x, by + 3, z, BID.torch);
    sbChest(x + 2, by, z + 2, 'mineshaft', 0);
  }
});

/* ====================== DUNGEON ========================================= */
defStruct({
  name: 'dungeon', salt: 0x3c7b, spacing: 8, separation: 3, radius: 6, chance: 0.14,
  needLand: false,
  build: function (x, y, z, rng, pos) {
    var by = 8 + Math.floor(rng() * Math.max(8, Math.min(70, pos.y - 12)));
    var w = 3 + Math.floor(rng() * 2), d = 3 + Math.floor(rng() * 2);
    sbFill(x - w, by, z - d, x + w, by + 3, z + d, 0);
    for (var fx = -w; fx <= w; fx++) for (var fz = -d; fz <= d; fz++) {
      sbSet(x + fx, by - 1, z + fz, rng() < 0.35 ? BID.mossy_cobblestone : BID.cobblestone);
    }
    sbFrame(x - w, by, z - d, x + w, by + 3, z + d, BID.cobblestone);
    sbFill(x - w, by + 4, z - d, x + w, by + 4, z + d, BID.cobblestone);
    var mobs = ['zombie', 'skeleton', 'spider'];
    sbSpawner(x, by, z, mobs[Math.floor(rng() * 3) % 3]);
    sbChest(x - w + 1, by, z - d + 1, 'dungeon', 0);
    if (rng() < 0.5) sbChest(x + w - 1, by, z + d - 1, 'dungeon', 0);
  }
});

/* ====================== STRONGHOLD ====================================== */
defStruct({
  name: 'stronghold', salt: 0xa17e, spacing: 56, separation: 18, radius: 46, chance: 0.6,
  needLand: false,
  build: function (x, y, z, rng, pos) {
    var by = clamp(12 + Math.floor(rng() * 22), 10, Math.max(14, pos.y - 24));
    var SB2 = BID.stone_bricks, MO = BID.mossy_stone_bricks, CR = BID.cracked_stone_bricks;
    function brick() { var r = rng(); return r < 0.18 ? MO : (r < 0.32 ? CR : SB2); }
    sbMark(x, z, 'Stronghold');
    /* central spiral staircase room */
    sbBox(x - 5, by, z - 5, x + 5, by + 10, z + 5, SB2, 0);
    for (var s = 0; s < 20; s++) {
      var ang = s * 0.6, r = 3;
      sbSet(Math.round(x + Math.cos(ang) * r), by + Math.floor(s / 2), Math.round(z + Math.sin(ang) * r), SB2);
    }
    /* corridors to five rooms */
    var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (var a = 0; a < 4; a++) {
      var dx = dirs[a][0], dz = dirs[a][1];
      var len = 18 + Math.floor(rng() * 20);
      for (var t = 5; t < len; t++) {
        var px = x + dx * t, pz = z + dz * t;
        sbFill(px - (dz ? 1 : 0), by, pz - (dx ? 1 : 0), px + (dz ? 1 : 0), by + 3, pz + (dx ? 1 : 0), 0);
        sbFill(px - (dz ? 2 : 0), by - 1, pz - (dx ? 2 : 0), px + (dz ? 2 : 0), by - 1, pz + (dx ? 2 : 0), brick());
        sbFill(px - (dz ? 2 : 0), by + 4, pz - (dx ? 2 : 0), px + (dz ? 2 : 0), by + 4, pz + (dx ? 2 : 0), brick());
        sbFill(px - (dz ? 2 : 0), by, pz - (dx ? 2 : 0), px - (dz ? 2 : 0), by + 3, pz - (dx ? 2 : 0), brick());
        sbFill(px + (dz ? 2 : 0), by, pz + (dx ? 2 : 0), px + (dz ? 2 : 0), by + 3, pz + (dx ? 2 : 0), brick());
        if (t % 7 === 0) sbSet(px, by + 3, pz, BID.torch);
        if (rng() < 0.02) sbSpawner(px, by, pz, 'silverfish');
      }
      var rx = x + dx * len, rz = z + dz * len;
      var roll = rng();
      if (a === 0) {
        /* the portal room */
        sbBox(rx - 6, by - 1, rz - 6, rx + 6, by + 8, rz + 6, SB2, 0);
        sbFill(rx - 5, by, rz - 5, rx + 5, by, rz + 5, brick());
        sbFill(rx - 2, by - 1, rz - 2, rx + 2, by - 1, rz + 2, BID.lava);
        for (var i = -2; i <= 2; i++) {
          sbSet(rx + i, by, rz - 2, bpack(BID.end_portal_frame, 0));
          sbSet(rx + i, by, rz + 2, bpack(BID.end_portal_frame, 2));
          sbSet(rx - 2, by, rz + i, bpack(BID.end_portal_frame, 1));
          sbSet(rx + 2, by, rz + i, bpack(BID.end_portal_frame, 3));
        }
        sbFill(rx - 1, by, rz - 1, rx + 1, by, rz + 1, 0);
        sbFill(rx - 4, by + 1, rz - 4, rx - 4, by + 3, rz - 4, BID.stone_bricks_stairs);
        sbSpawner(rx + 4, by + 1, rz + 4, 'silverfish');
        sbMark(rx, rz, 'End Portal');
      } else if (roll < 0.4) {
        /* library */
        sbBox(rx - 6, by - 1, rz - 6, rx + 6, by + 9, rz + 6, SB2, 0);
        for (var sh = -4; sh <= 4; sh += 4) {
          sbFill(rx + sh, by, rz - 5, rx + sh, by + 3, rz + 5, BID.bookshelf);
        }
        sbFill(rx - 5, by + 5, rz - 5, rx + 5, by + 5, rz + 5, BID.oak_planks);
        sbFill(rx - 1, by + 5, rz - 1, rx + 1, by + 5, rz + 1, 0);
        sbChest(rx + 5, by, rz + 5, 'stronghold_library', 0);
        sbChest(rx - 5, by + 6, rz - 5, 'stronghold_library', 0);
        sbSet(rx, by + 4, rz, BID.torch);
      } else if (roll < 0.7) {
        /* storeroom */
        sbBox(rx - 4, by - 1, rz - 4, rx + 4, by + 5, rz + 4, SB2, 0);
        sbChest(rx, by, rz, 'stronghold_corridor', 0);
        sbFill(rx - 3, by, rz - 3, rx - 3, by + 2, rz - 3, BID.iron_bars);
      } else {
        /* prison cells */
        sbBox(rx - 5, by - 1, rz - 4, rx + 5, by + 5, rz + 4, SB2, 0);
        for (var c = -4; c <= 4; c += 4) {
          sbFill(rx + c, by, rz - 3, rx + c, by + 3, rz + 3, BID.iron_bars);
          sbFill(rx + c, by + 1, rz, rx + c, by + 2, rz, 0);
        }
        sbSpawner(rx, by, rz + 3, 'zombie');
      }
    }
  }
});

/* ====================== ANCIENT CITY ==================================== */
defStruct({
  name: 'ancient_city', salt: 0xcc19, spacing: 80, separation: 26, radius: 40, chance: 0.5,
  needLand: false,
  build: function (x, y, z, rng) {
    var by = 10;
    var D = BID.deepslate_bricks, T = BID.deepslate_tiles, P = BID.polished_deepslate;
    var S = BID.sculk, SC = BID.sculk_catalyst, SS = BID.sculk_sensor, SH = BID.sculk_shrieker;
    sbMark(x, z, 'Ancient City');
    /* clear the cavern */
    for (var cx2 = -32; cx2 <= 32; cx2 += 1) {
      var lx = x + cx2;
      if (lx < SB.bx - 1 || lx > SB.bx + 16) continue;
      for (var cz2 = -32; cz2 <= 32; cz2++) {
        var lz = z + cz2;
        var d = Math.sqrt(cx2 * cx2 + cz2 * cz2);
        if (d > 32) continue;
        var h = Math.round(18 - d * 0.28);
        sbFill(lx, by, lz, lx, by + h, lz, 0);
        sbSet(lx, by - 1, lz, d < 26 ? (rng() < 0.5 ? D : T) : BID.deepslate);
        if (rng() < 0.10) sbSet(lx, by, lz, S);
      }
    }
    /* the central sanctuary */
    sbFill(x - 10, by, z - 10, x + 10, by, z + 10, T);
    sbBox(x - 8, by, z - 8, x + 8, by + 10, z + 8, D, 0);
    for (var i = -8; i <= 8; i += 4) {
      sbFill(x + i, by + 1, z - 8, x + i, by + 9, z - 8, P);
      sbFill(x + i, by + 1, z + 8, x + i, by + 9, z + 8, P);
    }
    sbFill(x - 2, by + 1, z - 2, x + 2, by + 3, z + 2, 0);
    sbFill(x - 1, by + 1, z - 1, x + 1, by + 1, z + 1, BID.reinforced_deepslate === undefined ? P : BID.reinforced_deepslate);
    sbSet(x, by + 1, z, SC);
    /* the frame that once held something */
    for (var f = -3; f <= 3; f++) { sbSet(x + f, by + 6, z, D); sbSet(x, by + 6, z + f, D); }
    /* outlying structures and the redstone-lit ruins */
    for (var b = 0; b < 12; b++) {
      var ang = rng() * Math.PI * 2, r = 12 + rng() * 18;
      var bx2 = Math.round(x + Math.cos(ang) * r), bz2 = Math.round(z + Math.sin(ang) * r);
      var w = 3 + Math.floor(rng() * 4), h2 = 4 + Math.floor(rng() * 6);
      sbBox(bx2 - w, by, bz2 - w, bx2 + w, by + h2, bz2 + w, rng() < 0.5 ? D : T, 0);
      sbFill(bx2 - w + 1, by + 1, bz2 - w, bx2 - w + 1, by + 2, bz2 - w, 0);
      if (rng() < 0.6) sbChest(bx2, by + 1, bz2, 'ancient_city', 0);
      sbSet(bx2 + 1, by + 1, bz2 + 1, SS);
      if (rng() < 0.5) sbSet(bx2 - 1, by + 1, bz2 - 1, SH);
      sbSet(bx2, by + h2 - 1, bz2, BID.soul_lantern);
    }
    /* sculk veins and shriekers scattered through the floor */
    for (var s2 = 0; s2 < 220; s2++) {
      var sx = x + Math.floor(rng() * 60) - 30, sz = z + Math.floor(rng() * 60) - 30;
      var roll = rng();
      if (roll < 0.6) sbSet(sx, by, sz, S);
      else if (roll < 0.75) sbSet(sx, by, sz, SS);
      else if (roll < 0.85) sbSet(sx, by, sz, SH);
      else sbSet(sx, by, sz, SC);
    }
    sbMob(x, by + 2, z, 'warden');
  }
});

/* ====================== NETHER FORTRESS ================================= */
defStruct({
  name: 'nether_fortress', salt: 0x4d81, spacing: 24, separation: 8, radius: 44, chance: 0.7,
  dim: DIM_NETHER, y: 60,
  build: function (x, y, z, rng) {
    var NB = BID.nether_bricks, NF = BID.nether_bricks_wall, NS = BID.nether_bricks_stairs;
    var by = 42 + Math.floor(rng() * 24);
    sbMark(x, z, 'Nether Fortress');
    /* bridges */
    for (var a = 0; a < 4; a++) {
      var dx = a < 2 ? (a === 0 ? 1 : -1) : 0, dz = a < 2 ? 0 : (a === 2 ? 1 : -1);
      var len = 30 + Math.floor(rng() * 24);
      for (var t = 0; t < len; t++) {
        var px = x + dx * t, pz = z + dz * t;
        sbFill(px - (dz ? 2 : 0), by, pz - (dx ? 2 : 0), px + (dz ? 2 : 0), by, pz + (dx ? 2 : 0), NB);
        sbFill(px - (dz ? 2 : 0), by + 1, pz - (dx ? 2 : 0), px - (dz ? 2 : 0), by + 1, pz - (dx ? 2 : 0), NF);
        sbFill(px + (dz ? 2 : 0), by + 1, pz + (dx ? 2 : 0), px + (dz ? 2 : 0), by + 1, pz + (dx ? 2 : 0), NF);
        sbFill(px - (dz ? 1 : 0), by + 1, pz - (dx ? 1 : 0), px + (dz ? 1 : 0), by + 4, pz + (dx ? 1 : 0), 0);
        if (t % 8 === 4) {
          sbFill(px - (dz ? 2 : 0), by - 1, pz - (dx ? 2 : 0), px - (dz ? 2 : 0), by - 8, pz - (dx ? 2 : 0), NB);
          sbFill(px + (dz ? 2 : 0), by - 1, pz + (dx ? 2 : 0), px + (dz ? 2 : 0), by - 8, pz + (dx ? 2 : 0), NB);
        }
        if (rng() < 0.03) sbMob(px, by + 1, pz, 'blaze');
        if (rng() < 0.04) sbMob(px, by + 1, pz, 'wither_skeleton');
      }
      /* a tower where the bridge ends */
      var ex = x + dx * len, ez = z + dz * len;
      sbBox(ex - 4, by, ez - 4, ex + 4, by + 12, ez + 4, NB, 0);
      sbFill(ex - 3, by + 1, ez - 3, ex + 3, by + 11, ez + 3, 0);
      sbFrame(ex - 4, by + 13, ez - 4, ex + 4, by + 14, ez + 4, NF);
      sbSet(ex, by + 1, ez, BID.nether_wart);
      sbFill(ex - 1, by, ez - 1, ex + 1, by, ez + 1, BID.soul_sand);
      sbFill(ex - 1, by + 1, ez - 1, ex + 1, by + 1, ez + 1, BID.nether_wart);
      sbChest(ex + 3, by + 1, ez + 3, 'nether_fortress', 0);
      if (rng() < 0.6) { sbSpawner(ex, by + 5, ez, 'blaze'); sbFill(ex - 2, by + 4, ez - 2, ex + 2, by + 7, ez + 2, 0); }
    }
    /* the central keep */
    sbBox(x - 6, by - 1, z - 6, x + 6, by + 10, z + 6, NB, 0);
    sbFill(x - 5, by, z - 5, x + 5, by + 9, z + 5, 0);
    sbFill(x - 5, by - 1, z - 5, x + 5, by - 1, z + 5, NB);
    for (var q = -5; q <= 5; q += 5) {
      sbFill(x + q, by, z - 5, x + q, by + 9, z - 5, BID.red_nether_bricks);
      sbFill(x + q, by, z + 5, x + q, by + 9, z + 5, BID.red_nether_bricks);
    }
    sbFill(x - 2, by, z - 2, x + 2, by, z + 2, BID.soul_sand);
    sbFill(x - 2, by + 1, z - 2, x + 2, by + 1, z + 2, BID.nether_wart);
    sbChest(x, by + 1, z + 4, 'nether_fortress', 0);
    sbMob(x, by + 1, z, 'wither_skeleton');
    sbMob(x + 2, by + 1, z + 2, 'wither_skeleton');
    sbMob(x - 2, by + 1, z - 2, 'blaze');
  }
});

/* ====================== BASTION ========================================= */
defStruct({
  name: 'bastion', salt: 0x7b2e, spacing: 30, separation: 12, radius: 26, chance: 0.5,
  dim: DIM_NETHER, y: 60,
  build: function (x, y, z, rng) {
    var B = BID.blackstone, PB = BID.polished_blackstone, BB = BID.polished_blackstone_bricks;
    var G = BID.gilded_blackstone === undefined ? BID.gold_block : BID.gilded_blackstone;
    var by = 48 + Math.floor(rng() * 18);
    sbMark(x, z, 'Bastion Remnant');
    /* massive plinth */
    sbFill(x - 20, by - 6, z - 20, x + 20, by, z + 20, B);
    sbFill(x - 17, by + 1, z - 17, x + 17, by + 1, z + 17, BB);
    /* four corner towers */
    for (var a = -1; a <= 1; a += 2) for (var b = -1; b <= 1; b += 2) {
      var tx = x + a * 14, tz = z + b * 14;
      sbBox(tx - 5, by + 1, tz - 5, tx + 5, by + 18, tz + 5, BB, 0);
      sbFill(tx - 4, by + 2, tz - 4, tx + 4, by + 17, tz + 4, 0);
      sbFrame(tx - 6, by + 19, tz - 6, tx + 6, by + 20, tz + 6, PB);
      sbChest(tx, by + 2, tz, 'bastion', 0);
      sbSet(tx + 2, by + 2, tz + 2, G);
      sbMob(tx, by + 3, tz, 'piglin_brute');
      sbMob(tx + 2, by + 3, tz, 'piglin');
    }
    /* the central bridge and treasure */
    sbFill(x - 3, by + 8, z - 17, x + 3, by + 8, z + 17, BB);
    sbFrame(x - 3, by + 9, z - 17, x + 3, by + 10, z + 17, PB);
    sbBox(x - 6, by + 8, z - 6, x + 6, by + 16, z + 6, BB, 0);
    sbFill(x - 5, by + 9, z - 5, x + 5, by + 15, z + 5, 0);
    sbFill(x - 2, by + 9, z - 2, x + 2, by + 9, z + 2, G);
    sbChest(x, by + 10, z, 'bastion_treasure', 0);
    /* lava moat and ruined edges */
    for (var i = 0; i < 200; i++) {
      var rx = x + Math.floor(rng() * 44) - 22, rz = z + Math.floor(rng() * 44) - 22;
      var ry = by + Math.floor(rng() * 20);
      if (rng() < 0.3) sbSet(rx, ry, rz, 0);
      else if (rng() < 0.2) sbSet(rx, ry, rz, B);
      else if (rng() < 0.05) sbSet(rx, ry, rz, BID.magma_block);
    }
    sbMob(x, by + 10, z + 3, 'piglin');
    sbMob(x + 2, by + 10, z - 3, 'hoglin');
  }
});

/* ====================== END CITY ======================================== */
defStruct({
  name: 'end_city', salt: 0x2ad4, spacing: 20, separation: 8, radius: 26, chance: 0.5,
  dim: DIM_END, y: 60,
  build: function (x, y, z, rng) {
    /* only out on the far islands */
    var d = Math.sqrt(x * x + z * z);
    if (d < 900) return;
    var by = 0;
    for (var probe = 90; probe > 20; probe--) {
      var id = sbGet(x, probe, z);
      if (id > 0) { by = probe + 1; break; }
      if (id === -1) { by = 62; break; }
    }
    if (!by) return;
    sbMark(x, z, 'End City');
    var P = BID.purpur_block, PP = BID.purpur_pillar, ES = BID.end_stone_bricks, PS = BID.purpur_stairs;
    var levels = 3 + Math.floor(rng() * 4);
    var cy = by;
    for (var l = 0; l < levels; l++) {
      var r = 6 - Math.floor(l / 2);
      sbFill(x - r, cy, z - r, x + r, cy, z + r, ES);
      sbBox(x - r, cy, z - r, x + r, cy + 7, z + r, P, 0);
      sbFill(x - r + 1, cy + 1, z - r + 1, x + r - 1, cy + 6, z + r - 1, 0);
      for (var c = -r; c <= r; c += r * 2) for (var e = -r; e <= r; e += r * 2)
        sbFill(x + c, cy + 1, z + e, x + c, cy + 6, z + e, PP);
      /* windows */
      for (var w = -r + 2; w <= r - 2; w += 2) {
        sbSet(x + w, cy + 3, z - r, BID.purple_stained_glass === undefined ? 0 : BID.purple_stained_glass);
        sbSet(x + w, cy + 3, z + r, BID.purple_stained_glass === undefined ? 0 : BID.purple_stained_glass);
      }
      if (rng() < 0.6) sbChest(x + r - 1, cy + 1, z + r - 1, 'end_city', 0);
      sbSet(x, cy + 6, z, BID.end_rod);
      sbMob(x + 1, cy + 1, z + 1, 'shulker');
      if (rng() < 0.5) sbMob(x - 2, cy + 1, z - 2, 'shulker');
      cy += 8;
    }
    /* the ship, moored alongside */
    if (rng() < 0.4) {
      var sx = x + 16, sz = z, sy = by + 12;
      for (var i = -10; i <= 10; i++) {
        var half = Math.max(1, 3 - Math.floor(Math.abs(i) / 4));
        sbFill(sx - half, sy, sz + i, sx + half, sy, sz + i, P);
        sbFill(sx - half, sy + 1, sz + i, sx - half, sy + 4, sz + i, P);
        sbFill(sx + half, sy + 1, sz + i, sx + half, sy + 4, sz + i, P);
      }
      sbFill(sx - 2, sy + 5, sz - 6, sx + 2, sy + 5, sz + 6, P);
      sbFill(sx, sy + 6, sz - 2, sx, sy + 14, sz - 2, PP);
      sbChest(sx, sy + 1, sz - 8, 'end_ship', 0);
      sbChest(sx, sy + 1, sz + 8, 'end_ship', 0);
      sbSet(sx, sy + 6, sz + 8, PP);
      sbMob(sx, sy + 2, sz, 'shulker');
      sbMob(sx + 2, sy + 6, sz + 4, 'shulker');
    }
  }
});

/* ====================== FOSSILS ========================================= */
defStruct({
  name: 'fossil', salt: 0x5511, spacing: 16, separation: 6, radius: 8, chance: 0.10,
  needLand: false,
  biomes: ['desert', 'swamp', 'badlands', 'wooded_badlands', 'eroded_badlands', 'mangrove_swamp'],
  build: function (x, y, z, rng, pos) {
    var by = clamp(28 + Math.floor(rng() * 32), 20, Math.max(24, pos.y - 8));
    var B = rng() < 0.75 ? BID.bone_block : BID.coal_ore;
    /* a spine with ribs */
    var len = 9 + Math.floor(rng() * 6);
    var horiz = rng() < 0.5;
    for (var t = 0; t < len; t++) {
      var px = horiz ? x + t : x, pz = horiz ? z : z + t;
      sbSet(px, by, pz, B);
      if (t % 2 === 0 && t > 1 && t < len - 1) {
        for (var r = 1; r <= 3; r++) {
          if (horiz) { sbSet(px, by + r, pz - r); sbSet(px, by + r, pz + r); }
          else { sbSet(px - r, by + r, pz); sbSet(px + r, by + r, pz); }
        }
      }
    }
    /* skull */
    sbFill(horiz ? x - 2 : x - 1, by, horiz ? z - 1 : z - 2, horiz ? x : x + 1, by + 2, horiz ? z + 1 : z, B);
  }
});
