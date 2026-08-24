/* =========================================================================
 * BLOCK ENTITIES AND WORLD TICKING — chests, furnaces, brewing stands,
 * crop growth, grass spread, leaf decay, fire, and fluid flow.
 * ========================================================================= */

function beKey(x, y, z) { return x + ',' + y + ',' + z; }

function getBlockEntity(game, dim, x, y, z, kind, create) {
  var world = game.world;
  var c = world.chunkAt(dim, x >> 4, z >> 4);
  if (!c) return null;
  var k = beKey(x, y, z);
  var be = c.blockEntities[k];
  if (!be && create) {
    be = makeBlockEntity(kind, x, y, z);
    c.blockEntities[k] = be;
    game.activeBE.push(be);
  }
  return be || null;
}
function makeBlockEntity(kind, x, y, z) {
  var be = { kind: kind, x: x, y: y, z: z, dim: 0 };
  switch (kind) {
    case 'chest': be.items = new Array(27); be.name = 'Chest'; break;
    case 'barrel': be.items = new Array(27); be.name = 'Barrel'; break;
    case 'shulker': be.items = new Array(27); be.name = 'Shulker Box'; break;
    case 'hopper': be.items = new Array(5); be.name = 'Hopper'; break;
    case 'dispenser': be.items = new Array(9); be.name = 'Dispenser'; break;
    case 'furnace': case 'blast_furnace': case 'smoker':
      be.slots = [null, null, null];
      be.burn = 0; be.burnMax = 0; be.progress = 0; be.total = 10; be.xp = 0;
      be.speed = kind === 'furnace' ? 1 : 2;
      break;
    case 'brewing': be.slots = [null, null, null, null, null]; be.progress = 0; be.fuel = 0; break;
    case 'sign': be.lines = ['', '', '', '']; break;
    case 'spawner': be.mob = 'zombie'; be.delay = 20; break;
    case 'beacon': be.levels = 0; be.effect = null; break;
  }
  if (be.items) for (var i = 0; i < be.items.length; i++) be.items[i] = null;
  return be;
}
function openBlockEntity(game, hit, kind) {
  var be = getBlockEntity(game, game.player.dim, hit.x, hit.y, hit.z, kind, true);
  if (!be) return;
  be.dim = game.player.dim;
  UI.containerPos = { x: hit.x, y: hit.y, z: hit.z };
  var screen = kind;
  if (kind === 'chest') { be.name = BLOCKS[hit.id].disp; screen = 'chest'; }
  showScreen(game, screen, be);
  playSound(game, 'door', hit.x, hit.y, hit.z, 1.4, 0.5);
}

/* -------------------------------------------------------- furnace tick -- */
function tickFurnace(game, be, dt) {
  var input = be.slots[0], fuel = be.slots[1], out = be.slots[2];
  var recipe = input ? SMELTING[input.item] : null;
  if (recipe && be.kind !== 'furnace') {
    /* blast furnaces only take ores and metal, smokers only take food */
    var isOre = /ore|raw_|ancient_debris/.test(input.item) || /ingot|nugget/.test(recipe.out);
    var isFood = ITEMS[recipe.out] && ITEMS[recipe.out].food > 0;
    if (be.kind === 'blast_furnace' && !isOre) recipe = null;
    if (be.kind === 'smoker' && !isFood) recipe = null;
  }
  var canOutput = recipe && (!out || (out.item === recipe.out && out.count + recipe.count <= stackMax(out)));

  if (be.burn > 0) be.burn -= dt;
  if (be.burn <= 0 && recipe && canOutput && fuel) {
    var f = ITEMS[fuel.item];
    if (f && f.fuel > 0) {
      be.burn = be.burnMax = f.fuel;
      fuel.count--;
      if (fuel.count <= 0) be.slots[1] = (fuel.item === 'lava_bucket') ? makeStack('bucket', 1) : null;
      be.changed = true;
    }
  }
  if (be.burn > 0 && recipe && canOutput) {
    be.total = 10 / be.speed;
    be.progress += dt;
    if (be.progress >= be.total) {
      be.progress = 0;
      if (out) out.count += recipe.count;
      else be.slots[2] = makeStack(recipe.out, recipe.count);
      input.count--;
      if (input.count <= 0) be.slots[0] = null;
      be.xp = (be.xp || 0) + recipe.xp;
      be.changed = true;
      playSound(game, 'pop', be.x, be.y, be.z, 0.8, 0.4);
    }
  } else {
    be.progress = Math.max(0, be.progress - dt * 2);
  }
  /* lit state drives the texture */
  var id = game.world.getId(be.dim, be.x, be.y, be.z);
  if (id) {
    var lit = be.burn > 0;
    var wantName = lit ? be.kind + '_lit' : be.kind;
    var want = BID[wantName];
    if (want === undefined) want = BID[be.kind];
    if (want !== undefined && want !== id) game.world.setBlock(be.dim, be.x, be.y, be.z, want);
  }
}
function tickBrewing(game, be, dt) {
  var ing = be.slots[4];
  if (be.fuel <= 0 && be.slots[3] && be.slots[3].item === 'blaze_powder') {
    be.slots[3].count--; if (be.slots[3].count <= 0) be.slots[3] = null;
    be.fuel = 20;
  }
  if (!ing || be.fuel <= 0) { be.progress = Math.max(0, be.progress - dt * 4); return; }
  var any = false;
  for (var i = 0; i < 3; i++) {
    var b = be.slots[i];
    if (!b) continue;
    for (var r = 0; r < BREWING.length; r++) {
      if (BREWING[r].base === b.item && BREWING[r].ingredient === ing.item) { any = true; break; }
    }
    if (any) break;
  }
  if (!any) { be.progress = Math.max(0, be.progress - dt * 4); return; }
  be.progress += dt;
  if (be.progress >= 20) {
    be.progress = 0;
    be.fuel--;
    for (var j = 0; j < 3; j++) {
      var bj = be.slots[j];
      if (!bj) continue;
      for (var q = 0; q < BREWING.length; q++) {
        if (BREWING[q].base === bj.item && BREWING[q].ingredient === ing.item) {
          be.slots[j] = makeStack(BREWING[q].out, bj.count);
          break;
        }
      }
    }
    ing.count--;
    if (ing.count <= 0) be.slots[4] = null;
    playSound(game, 'splash', be.x, be.y, be.z, 1.5, 0.5);
    be.changed = true;
  }
}
function tickHopper(game, be, dt) {
  be.cool = (be.cool || 0) - dt;
  if (be.cool > 0) return;
  be.cool = 0.4;
  /* pull from the container above */
  var above = getBlockEntity(game, be.dim, be.x, be.y + 1, be.z, 'chest', false);
  if (above && above.items) {
    for (var i = 0; i < above.items.length; i++) {
      var s = above.items[i];
      if (!s) continue;
      if (hopperInsert(be, s)) { if (s.count <= 0) above.items[i] = null; break; }
    }
  }
  /* push into whatever is below */
  var faceBelow = getBlockEntity(game, be.dim, be.x, be.y - 1, be.z, 'chest', false);
  if (faceBelow && faceBelow.items) {
    for (var j = 0; j < be.items.length; j++) {
      var t = be.items[j];
      if (!t) continue;
      if (containerInsert(faceBelow.items, t)) { if (t.count <= 0) be.items[j] = null; break; }
    }
  }
}
function hopperInsert(be, s) { return containerInsert(be.items, s); }
function containerInsert(items, s) {
  for (var pass = 0; pass < 2; pass++) {
    for (var i = 0; i < items.length; i++) {
      if (pass === 0) {
        if (!items[i] || !sameStack(items[i], s)) continue;
        var room = stackMax(items[i]) - items[i].count;
        if (room <= 0) continue;
        items[i].count++; s.count--;
        return true;
      } else {
        if (items[i]) continue;
        items[i] = makeStack(s.item, 1, s.dur, s.ench);
        s.count--;
        return true;
      }
    }
  }
  return false;
}
function tickSpawner(game, be, dt) {
  var p = game.player;
  if (p.dim !== be.dim) return;
  var d2 = (p.x - be.x) * (p.x - be.x) + (p.y - be.y) * (p.y - be.y) + (p.z - be.z) * (p.z - be.z);
  if (d2 > 16 * 16) return;
  be.delay -= dt;
  if (Math.random() < dt * 8)
    spawnParticle(game, be.dim, be.x + 0.2 + Math.random() * 0.6, be.y + 0.2 + Math.random() * 0.6, be.z + 0.2 + Math.random() * 0.6,
      0, 0.3, 0, 0.9, 0.35, 0.1, 0.05, 0.8);
  if (be.delay > 0) return;
  be.delay = 8 + Math.random() * 8;
  var near = 0;
  for (var i = 0; i < game.entities.length; i++) {
    var e = game.entities[i];
    if (e.type === be.mob && Math.abs(e.x - be.x) < 8 && Math.abs(e.z - be.z) < 8) near++;
  }
  if (near >= 6) return;
  for (var n = 0; n < 3; n++) {
    var sx = be.x + 0.5 + (Math.random() - 0.5) * 7;
    var sz = be.z + 0.5 + (Math.random() - 0.5) * 7;
    var sy = be.y + (Math.random() * 3 | 0) - 1;
    if (isSolidAt(game.world, be.dim, Math.floor(sx), sy, Math.floor(sz))) continue;
    if (!isSolidAt(game.world, be.dim, Math.floor(sx), sy - 1, Math.floor(sz))) continue;
    game.entities.push(makeEntity(be.mob, be.dim, sx, sy, sz, {}));
  }
}
function tickBlockEntities(game, dt) {
  var list = game.activeBE;
  for (var i = list.length - 1; i >= 0; i--) {
    var be = list[i];
    switch (be.kind) {
      case 'furnace': case 'blast_furnace': case 'smoker': tickFurnace(game, be, dt); break;
      case 'brewing': tickBrewing(game, be, dt); break;
      case 'hopper': tickHopper(game, be, dt); break;
      case 'spawner': tickSpawner(game, be, dt); break;
    }
  }
}

/* ====================== RANDOM BLOCK TICKS ============================== */
/* Each loaded chunk section gets a few random ticks per second, exactly the
   way Minecraft drives crop growth and grass spread. */
function randomTicks(game, dt) {
  var world = game.world, p = game.player;
  game.rtAccum += dt;
  var ticks = Math.floor(game.rtAccum * 20);
  if (ticks <= 0) return;
  game.rtAccum -= ticks / 20;
  var dims = world.dims[p.dim];
  var keys = game.loadedKeys;
  if (!keys.length) return;
  var per = Math.min(700, ticks * 3 * keys.length);
  for (var i = 0; i < per; i++) {
    var key = keys[(Math.random() * keys.length) | 0];
    var c = dims[key];
    if (!c || !c.loaded) continue;
    var x = (c.cx << 4) + ((Math.random() * 16) | 0);
    var z = (c.cz << 4) + ((Math.random() * 16) | 0);
    var h = world.getHeight(p.dim, x, z);
    var y = clamp(h + ((Math.random() * 24) | 0) - 16, 1, CH_H - 2);
    randomTickBlock(game, x, y, z);
  }
}
function randomTickBlock(game, x, y, z) {
  var world = game.world, dim = game.player.dim;
  var raw = world.getRaw(dim, x, y, z);
  var id = raw & ID_MASK;
  if (id === 0) return;
  var st = (raw >>> ST_SHIFT) & 15;
  var b = BLOCKS[id];

  /* crops ripen when they have light */
  if (b.growth) {
    if (st >= b.growth) return;
    var light = world.getLight(dim, x, y + 1, z);
    var lv = Math.max((light >> 4) & 15, light & 15);
    if (lv < 9) return;
    var below = world.getId(dim, x, y - 1, z);
    var wet = below === BID.farmland_wet ? 1 : 0;
    if (Math.random() < 0.14 + wet * 0.18) world.setBlock(dim, x, y, z, bpack(id, st + 1));
    return;
  }
  /* grass creeps onto bare dirt and dies in the dark */
  if (id === BID.grass_block) {
    var above = world.getId(dim, x, y + 1, z);
    if (above !== 0 && BLOCKS[above].opaque) { world.setBlock(dim, x, y, z, BID.dirt); return; }
    for (var t = 0; t < 3; t++) {
      var dx = x + ((Math.random() * 3) | 0) - 1, dz = z + ((Math.random() * 3) | 0) - 1;
      var dy = y + ((Math.random() * 3) | 0) - 1;
      if (world.getId(dim, dx, dy, dz) !== BID.dirt) continue;
      var up = world.getId(dim, dx, dy + 1, dz);
      if (up !== 0 && BLOCKS[up].opaque) continue;
      var l2 = world.getLight(dim, dx, dy + 1, dz);
      if (Math.max((l2 >> 4) & 15, l2 & 15) < 5) continue;
      world.setBlock(dim, dx, dy, dz, BID.grass_block);
    }
    return;
  }
  if (id === BID.farmland || id === BID.farmland_wet) {
    var water = false;
    for (var wx = -4; wx <= 4 && !water; wx++) for (var wz = -4; wz <= 4; wz++)
      if (world.getId(dim, x + wx, y, z + wz) === BID.water) { water = true; break; }
    var want = water ? BID.farmland_wet : BID.farmland;
    if (want !== id) world.setBlock(dim, x, y, z, want);
    else if (!water && Math.random() < 0.12 && world.getId(dim, x, y + 1, z) === 0) world.setBlock(dim, x, y, z, BID.dirt);
    return;
  }
  /* leaves rot when their log is gone */
  if (b.group === 'nature' && b.name.indexOf('_leaves') > 0) {
    if (Math.random() > 0.12) return;
    var found = false;
    for (var lx = -4; lx <= 4 && !found; lx++) for (var ly = -4; ly <= 4 && !found; ly++) for (var lz = -4; lz <= 4; lz++) {
      var nid = world.getId(dim, x + lx, y + ly, z + lz);
      if (nid && BLOCKS[nid].name.indexOf('_log') > 0 || (nid && BLOCKS[nid].name.indexOf('_stem') > 0)) { found = true; break; }
    }
    if (!found) {
      world.setBlock(dim, x, y, z, 0);
      spawnBlockBreakParticles(game, dim, x, y, z, id);
      if (Math.random() < 0.05) dropItem(game, dim, x + 0.5, y + 0.5, z + 0.5, b.name.replace('_leaves', '_sapling'), 1, true);
      if (Math.random() < 0.02) dropItem(game, dim, x + 0.5, y + 0.5, z + 0.5, 'stick', 1, true);
    }
    return;
  }
  /* saplings become trees */
  if (b.name.indexOf('_sapling') > 0) {
    if (Math.random() > 0.06) return;
    var lig = world.getLight(dim, x, y + 1, z);
    if (Math.max((lig >> 4) & 15, lig & 15) < 9) return;
    game.growTree(dim, x, y, z, b.name.replace('_sapling', ''));
    return;
  }
  /* fire burns out and spreads to flammable neighbours */
  if (id === BID.fire) {
    if (st >= 15 || Math.random() < 0.25) {
      var under = world.getId(dim, x, y - 1, z);
      if (under === 0 || !BLOCKS[under].solid) { world.setBlock(dim, x, y, z, 0); return; }
      if (BLOCKS[under].name !== 'netherrack' && Math.random() < 0.4) { world.setBlock(dim, x, y, z, 0); return; }
    }
    world.setBlock(dim, x, y, z, bpack(id, Math.min(15, st + 1)));
    for (var f = 0; f < 4; f++) {
      var fx = x + ((Math.random() * 3) | 0) - 1, fy = y + ((Math.random() * 3) | 0) - 1, fz = z + ((Math.random() * 3) | 0) - 1;
      var fid = world.getId(dim, fx, fy, fz);
      if (fid && BLOCKS[fid].flam > 0 && Math.random() < 0.28) {
        world.setBlock(dim, fx, fy, fz, BID.fire);
      }
    }
    return;
  }
  /* ice and snow melt in the light */
  if (id === BID.ice || id === BID.snow) {
    var lig2 = world.getLight(dim, x, y + 1, z);
    if ((lig2 & 15) > 11) world.setBlock(dim, x, y, z, id === BID.ice ? BID.water : 0);
    return;
  }
  /* sugar cane, cactus and bamboo grow upward */
  if (id === BID.sugar_cane || id === BID.cactus || id === BID.bamboo) {
    var height = 1;
    while (world.getId(dim, x, y - height, z) === id) height++;
    if (height >= (id === BID.bamboo ? 12 : 3)) return;
    if (world.getId(dim, x, y + 1, z) !== 0) return;
    if (Math.random() < 0.14) world.setBlock(dim, x, y + 1, z, id);
    return;
  }
  /* copper slowly oxidises out in the weather */
  if (b.group === 'copper' && b.oxidizeTo && Math.random() < 0.008) {
    var to = BID[b.oxidizeTo];
    if (to !== undefined) world.setBlock(dim, x, y, z, bpack(to, st));
    return;
  }
}

/* ============================== FLUIDS ================================== */
/* Water and lava spread from sources with a level in the block state:
   0 = source, 1..7 = flowing, 8 = falling. */
function scheduleFluid(game, dim, x, y, z) {
  var k = dim + ':' + x + ',' + y + ',' + z;
  if (game.fluidSet[k]) return;
  game.fluidSet[k] = true;
  game.fluidQueue.push({ dim: dim, x: x, y: y, z: z, k: k });
}
function neighborFluidUpdate(game, dim, x, y, z) {
  scheduleFluid(game, dim, x, y, z);
  scheduleFluid(game, dim, x + 1, y, z); scheduleFluid(game, dim, x - 1, y, z);
  scheduleFluid(game, dim, x, y, z + 1); scheduleFluid(game, dim, x, y, z - 1);
  scheduleFluid(game, dim, x, y + 1, z); scheduleFluid(game, dim, x, y - 1, z);
}
function tickFluids(game, dt) {
  game.fluidAccum += dt;
  if (game.fluidAccum < 0.25) return;
  game.fluidAccum = 0;
  var world = game.world;
  var batch = game.fluidQueue;
  game.fluidQueue = [];
  var processed = 0;
  for (var i = 0; i < batch.length && processed < 3000; i++) {
    var q = batch[i];
    delete game.fluidSet[q.k];
    processed++;
    updateFluidAt(game, q.dim, q.x, q.y, q.z);
  }
  /* anything we could not get to this tick stays queued */
  for (var j = processed; j < batch.length; j++) game.fluidQueue.push(batch[j]);
}
function updateFluidAt(game, dim, x, y, z) {
  var world = game.world;
  var raw = world.getRaw(dim, x, y, z);
  var id = raw & ID_MASK;
  var st = (raw >>> ST_SHIFT) & 15;
  var b = BLOCKS[id];
  if (!b || !b.liquid) return;
  var isLava = b.liquid === 'lava';
  var maxSpread = isLava ? (dim === DIM_NETHER ? 7 : 3) : 7;
  var level = st & 7;
  var falling = (st & 8) !== 0;

  /* a non-source block dries up unless it is still fed */
  if (level > 0 || falling) {
    var best = 8;
    var above = world.getRaw(dim, x, y + 1, z);
    if ((above & ID_MASK) === id) best = -1;
    else {
      var nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (var i = 0; i < 4; i++) {
        var r2 = world.getRaw(dim, x + nb[i][0], y, z + nb[i][1]);
        if ((r2 & ID_MASK) !== id) continue;
        var l2 = ((r2 >>> ST_SHIFT) & 7);
        if (((r2 >>> ST_SHIFT) & 8) !== 0) continue;
        if (l2 < best) best = l2;
      }
    }
    var want = best === -1 ? 8 : best + 1;
    if (want > maxSpread || best === 8) { world.setBlock(dim, x, y, z, 0); neighborFluidUpdate(game, dim, x, y, z); return; }
    if ((want & 7) !== level || ((want & 8) !== 0) !== falling) {
      world.setBlock(dim, x, y, z, bpack(id, want));
      st = want; level = want & 7; falling = (want & 8) !== 0;
    }
  }

  /* flow down first */
  var belowRaw = world.getRaw(dim, x, y - 1, z);
  var belowId = belowRaw & ID_MASK;
  if (belowId === 0 || (BLOCKS[belowId].replaceable && !BLOCKS[belowId].liquid)) {
    world.setBlock(dim, x, y - 1, z, bpack(id, 8));
    neighborFluidUpdate(game, dim, x, y - 1, z);
    return;
  }
  if (belowId !== id && BLOCKS[belowId].liquid) { fluidMix(game, dim, x, y - 1, z, id, belowId); return; }
  if (belowId === 0) return;
  if (BLOCKS[belowId].liquid === b.liquid && ((belowRaw >>> ST_SHIFT) & 7) !== 0) {
    world.setBlock(dim, x, y - 1, z, bpack(id, 8));
    neighborFluidUpdate(game, dim, x, y - 1, z);
    return;
  }
  /* then sideways */
  if (level >= maxSpread) return;
  var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (var d = 0; d < 4; d++) {
    var nx = x + dirs[d][0], nz = z + dirs[d][1];
    var nr = world.getRaw(dim, nx, y, nz);
    var nid = nr & ID_MASK;
    if (nid === id) {
      var nl = (nr >>> ST_SHIFT) & 7;
      if (nl > level + 1 && ((nr >>> ST_SHIFT) & 8) === 0) {
        world.setBlock(dim, nx, y, nz, bpack(id, level + 1));
        neighborFluidUpdate(game, dim, nx, y, nz);
      }
      continue;
    }
    if (nid !== 0 && !BLOCKS[nid].replaceable) continue;
    if (nid !== 0 && BLOCKS[nid].liquid) { fluidMix(game, dim, nx, y, nz, id, nid); continue; }
    if (nid !== 0 && BLOCKS[nid].replaceable && ITEMS[BLOCKS[nid].name])
      dropItem(game, dim, nx + 0.5, y + 0.5, nz + 0.5, BLOCKS[nid].name, 1, true);
    world.setBlock(dim, nx, y, nz, bpack(id, level + 1));
    neighborFluidUpdate(game, dim, nx, y, nz);
  }
}
function fluidMix(game, dim, x, y, z, aId, bId) {
  var aLava = BLOCKS[aId].liquid === 'lava';
  var result = aLava ? BID.cobblestone : BID.obsidian;
  var other = aLava ? bId : aId;
  if (BLOCKS[other].liquid === BLOCKS[aId].liquid) return;
  game.world.setBlock(dim, x, y, z, result);
  playSound(game, 'splash', x, y, z, 0.6);
  for (var i = 0; i < 16; i++)
    spawnParticle(game, dim, x + Math.random(), y + 1, z + Math.random(), 0, 1.5, 0, 0.85, 0.85, 0.85, 0.1, 0.9);
}
