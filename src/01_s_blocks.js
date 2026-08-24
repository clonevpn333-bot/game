/* =========================================================================
 * BLOCK REGISTRY  (shared with the terrain worker)
 *
 * A world voxel is a Uint16: low 12 bits = block id, high 4 bits = state.
 * State meaning is per-block (facing, half, level, age, axis ...); anything
 * that can be derived from neighbours (fence arms, wall shape, stair corner,
 * redstone dust routing) is computed at mesh time instead of being stored.
 *
 * Geometry is described with a generic box model in 0..16 texel units, the
 * same way the real game does it, so one mesher handles slabs, stairs,
 * fences, lanterns, anvils and brewing stands without special cases.
 * ========================================================================= */

var ID_MASK = 0xFFF, ST_SHIFT = 12;
function bid(v) { return v & ID_MASK; }
function bst(v) { return (v >>> ST_SHIFT) & 15; }
function bpack(id, st) { return (id & ID_MASK) | ((st & 15) << ST_SHIFT); }

var BLOCKS = [];    // id -> definition
var BID = {};       // name -> id
var BY_NAME = {};   // name -> definition

/* --- tile descriptors: tiny data objects the texture baker turns into
       16x16 pixel art.  Kept in the shared module so block defs stay in one
       place; the worker simply ignores them. ------------------------------ */
var T = {
  solid: function (c, v, s) { return { k: 'solid', c: c, v: v === undefined ? 0.06 : v, s: s || 0 }; },
  grain: function (c, v, dir) { return { k: 'grain', c: c, v: v || 0.08, d: dir || 'v' }; },
  planks: function (c, d) { return { k: 'planks', c: c, d: d }; },
  logside: function (c, d, k) { return { k: 'logside', c: c, d: d, r: k }; },
  logtop: function (c, d, r) { return { k: 'logtop', c: c, d: d, r: r }; },
  ore: function (base, gem, n, glow) { return { k: 'ore', b: base, g: gem, n: n || 5, l: glow || 0 }; },
  brick: function (c, m, sh) { return { k: 'brick', c: c, m: m, sh: sh || 0.1 }; },
  tiles: function (c, m, n) { return { k: 'tiles', c: c, m: m, n: n || 4 }; },
  cobble: function (c, d) { return { k: 'cobble', c: c, d: d }; },
  cracked: function (base, c) { return { k: 'cracked', b: base, c: c }; },
  mossy: function (base) { return { k: 'mossy', b: base }; },
  speck: function (c, c2, n, sz) { return { k: 'speck', c: c, c2: c2, n: n || 40, sz: sz || 1 }; },
  cross: function (c, c2, kind) { return { k: 'cross', c: c, c2: c2, t: kind || 'grass' }; },
  flower: function (stem, petal, centre, kind) { return { k: 'flower', s: stem, p: petal, c: centre, t: kind || 'simple' }; },
  leaves: function (c, d) { return { k: 'leaves', c: c, d: d }; },
  glass: function (c, a) { return { k: 'glass', c: c, a: a === undefined ? 0 : a }; },
  pane: function (c, a) { return { k: 'pane', c: c, a: a === undefined ? 0 : a }; },
  wool: function (c) { return { k: 'wool', c: c }; },
  concrete: function (c) { return { k: 'solid', c: c, v: 0.018, s: 7 }; },
  terra: function (c) { return { k: 'terra', c: c }; },
  glazed: function (c, c2, n) { return { k: 'glazed', c: c, c2: c2, n: n || 0 }; },
  frame: function (c, edge, inner) { return { k: 'frame', c: c, e: edge, i: inner }; },
  crop: function (c, stage) { return { k: 'crop', c: c, g: stage }; },
  liquid: function (c, c2) { return { k: 'liquid', c: c, c2: c2 }; },
  raw: function (c, d) { return { k: 'raw', c: c, d: d }; },
  metal: function (c, d) { return { k: 'metal', c: c, d: d }; },
  scuff: function (c, d, n) { return { k: 'scuff', c: c, d: d, n: n || 16 }; },
  rings: function (c, d) { return { k: 'rings', c: c, d: d }; },
  vein: function (c, c2) { return { k: 'vein', c: c, c2: c2 }; },
  sculk: function () { return { k: 'sculk' }; },
  custom: function (name, p) { var o = { k: 'x', n: name }; if (p) for (var q in p) o[q] = p[q]; return o; }
};

/* --------------------------------------------------------- box  helpers -- */
/* A box: {f:[x0,y0,z0], t:[x1,y1,z1], tex:{...}|null, cull:bool, tint:bool} */
function box(x0, y0, z0, x1, y1, z1, opts) {
  var b = { f: [x0, y0, z0], t: [x1, y1, z1], cull: false };
  if (opts) for (var k in opts) b[k] = opts[k];
  return b;
}
var FULL_BOX = [box(0, 0, 0, 16, 16, 16, { cull: true })];

/* ------------------------------------------------------------ registry -- */
function defBlock(name, o) {
  o = o || {};
  var d = {
    id: BLOCKS.length,
    name: name,
    disp: o.disp || titleCase(name),
    render: o.render || 'cube',
    tex: o.tex || null,
    solid: o.solid !== undefined ? o.solid : true,
    opaque: o.opaque !== undefined ? o.opaque : (o.render === undefined || o.render === 'cube'),
    /* light emitted 0..15 and light absorbed when translucent */
    light: o.light || 0,
    filter: o.filter || null,           // colour a translucent block tints light by
    absorb: o.absorb !== undefined ? o.absorb : null,
    hard: o.hard !== undefined ? o.hard : 1,
    blast: o.blast !== undefined ? o.blast : (o.hard !== undefined ? o.hard * 5 : 5),
    tool: o.tool || null,
    tier: o.tier || 0,
    drop: o.drop !== undefined ? o.drop : name,
    dropCount: o.dropCount || null,
    xp: o.xp || 0,
    tint: o.tint || null,               // 'grass' | 'foliage' | 'water' | 'dry'
    waving: o.waving || 0,              // 1 = plant, 2 = leaves, 3 = top vertices only
    flam: o.flam || 0,
    liquid: o.liquid || null,
    climb: o.climb || false,
    replaceable: o.replaceable || false,
    fall: o.fall || false,              // gravity affected
    collide: o.collide !== undefined ? o.collide : (o.solid !== undefined ? o.solid : true),
    boxes: o.boxes || null,             // static box model, or null => full cube
    modelFn: o.modelFn || null,         // dynamic model (neighbour aware)
    coll: o.coll || null,               // collision boxes, defaults to `boxes`
    group: o.group || 'misc',
    stack: o.stack === undefined ? 64 : o.stack,
    ui: o.ui || null,                   // container / screen opened on use
    sound: o.sound || 'stone',
    slip: o.slip || 0,
    speedMul: o.speedMul || 1,
    growth: o.growth || null,
    entityModel: o.entityModel || null,
    variantOf: o.variantOf || null,
    noItem: o.noItem || false,
    place: o.place || null              // 'facing'|'axis'|'facing6'|'slabhalf'|'stairs'|'door'|'trapdoor'|'rot16'
  };
  if (d.render !== 'cube' && o.opaque === undefined) d.opaque = false;
  if (d.render === 'cube' && d.boxes === null && !d.modelFn) d.boxes = null; // fast path
  BLOCKS.push(d);
  BID[name] = d.id;
  BY_NAME[name] = d;
  return d;
}
function titleCase(n) {
  return n.split('_').map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(' ');
}
function blk(name) { return BY_NAME[name]; }
function blockOf(v) { return BLOCKS[v & ID_MASK]; }

/* ============================ AIR & FLUIDS ============================== */
defBlock('air', { render: 'none', solid: false, opaque: false, collide: false, replaceable: true, hard: 0, drop: null, noItem: true });
defBlock('cave_air', { render: 'none', solid: false, opaque: false, collide: false, replaceable: true, hard: 0, drop: null, noItem: true });
defBlock('void_air', { render: 'none', solid: false, opaque: false, collide: false, replaceable: true, hard: 0, drop: null, noItem: true });

defBlock('water', {
  render: 'liquid', solid: false, opaque: false, collide: false, replaceable: true, hard: 100,
  tex: T.liquid('#3b6ecc', '#5588dd'), liquid: 'water', absorb: 1, tint: 'water',
  drop: null, sound: 'water', noItem: true
});
defBlock('flowing_water', {
  render: 'liquid', solid: false, opaque: false, collide: false, replaceable: true, hard: 100,
  tex: T.liquid('#3b6ecc', '#5588dd'), liquid: 'water', absorb: 1, tint: 'water',
  drop: null, sound: 'water', noItem: true, variantOf: 'water'
});
defBlock('lava', {
  render: 'liquid', solid: false, opaque: false, collide: false, replaceable: true, hard: 100, light: 15,
  tex: T.liquid('#d45a12', '#f5a623'), liquid: 'lava', drop: null, sound: 'lava', noItem: true
});
defBlock('flowing_lava', {
  render: 'liquid', solid: false, opaque: false, collide: false, replaceable: true, hard: 100, light: 15,
  tex: T.liquid('#d45a12', '#f5a623'), liquid: 'lava', drop: null, sound: 'lava', noItem: true, variantOf: 'lava'
});

/* ============================ SOIL & SAND ============================== */
defBlock('bedrock', { tex: T.cobble('#565656', '#2b2b2b'), hard: -1, blast: 1e7, drop: null, tool: 'pickaxe' });
defBlock('stone', { tex: T.solid('#7d7d7d', 0.075), hard: 1.5, tool: 'pickaxe', tier: 1, drop: 'cobblestone' });
defBlock('granite', { tex: T.speck('#9a6a5a', '#b08878', 46), hard: 1.5, tool: 'pickaxe', tier: 1 });
defBlock('diorite', { tex: T.speck('#cfcfd0', '#9a9a9c', 46), hard: 1.5, tool: 'pickaxe', tier: 1 });
defBlock('andesite', { tex: T.speck('#8d8d8d', '#767679', 46), hard: 1.5, tool: 'pickaxe', tier: 1 });
defBlock('deepslate', {
  tex: { all: T.grain('#585860', 0.07, 'v'), top: T.solid('#585860', 0.07), bottom: T.solid('#585860', 0.07) },
  hard: 3, tool: 'pickaxe', tier: 1, drop: 'cobbled_deepslate', place: 'axis', sound: 'deepslate'
});
defBlock('cobbled_deepslate', { tex: T.cobble('#4d4d55', '#333339'), hard: 3.5, tool: 'pickaxe', tier: 1, sound: 'deepslate' });
defBlock('tuff', { tex: T.speck('#6c6f65', '#585b52', 60), hard: 1.5, tool: 'pickaxe', tier: 1 });
defBlock('calcite', { tex: T.speck('#e0e0da', '#c9c9c2', 30), hard: 0.75, tool: 'pickaxe', tier: 1, sound: 'calcite' });
defBlock('dripstone_block', { tex: T.speck('#8a6a5a', '#6f5346', 55), hard: 1.5, tool: 'pickaxe', tier: 1 });
defBlock('smooth_basalt', { tex: T.grain('#48484e', 0.05, 'v'), hard: 1.25, tool: 'pickaxe', tier: 1 });
defBlock('basalt', {
  tex: { all: T.grain('#50505a', 0.12, 'v'), top: T.speck('#5a5a63', '#3c3c44', 60) },
  hard: 1.25, tool: 'pickaxe', tier: 1, place: 'axis'
});
defBlock('dirt', { tex: T.speck('#8a5f3c', '#6f4b2f', 70), hard: 0.5, tool: 'shovel', sound: 'gravel' });
defBlock('coarse_dirt', { tex: T.speck('#7d5636', '#5f4128', 90), hard: 0.5, tool: 'shovel', sound: 'gravel' });
defBlock('rooted_dirt', { tex: T.speck('#906a48', '#c9a06a', 60), hard: 0.5, tool: 'shovel', sound: 'gravel' });
defBlock('grass_block', {
  tex: {
    top: T.custom('grass_top'), bottom: T.speck('#8a5f3c', '#6f4b2f', 70),
    side: T.custom('grass_side')
  },
  hard: 0.6, tool: 'shovel', drop: 'dirt', tint: 'grasstop', sound: 'grass'
});
defBlock('podzol', {
  tex: { top: T.speck('#59401f', '#7a5c2c', 80), bottom: T.speck('#8a5f3c', '#6f4b2f', 70), side: T.custom('podzol_side') },
  hard: 0.5, tool: 'shovel', sound: 'grass'
});
defBlock('mycelium', {
  tex: { top: T.speck('#6f6265', '#8a7d80', 90), bottom: T.speck('#8a5f3c', '#6f4b2f', 70), side: T.custom('mycelium_side') },
  hard: 0.6, tool: 'shovel', drop: 'dirt', sound: 'grass'
});
defBlock('dirt_path', {
  render: 'box', boxes: [box(0, 0, 0, 16, 15, 16, { cull: true })],
  tex: { top: T.speck('#96793f', '#7b6132', 60), bottom: T.speck('#8a5f3c', '#6f4b2f', 70), side: T.custom('path_side') },
  hard: 0.65, tool: 'shovel', drop: 'dirt', sound: 'grass', opaque: false
});
defBlock('farmland', {
  render: 'box', boxes: [box(0, 0, 0, 16, 15, 16, { cull: true })],
  tex: { top: T.custom('farmland'), bottom: T.speck('#8a5f3c', '#6f4b2f', 70), side: T.speck('#8a5f3c', '#6f4b2f', 70) },
  hard: 0.6, tool: 'shovel', drop: 'dirt', sound: 'gravel', opaque: false
});
defBlock('mud', { tex: T.speck('#3d3a3f', '#4b474d', 60), hard: 0.5, tool: 'shovel', sound: 'mud' });
defBlock('muddy_mangrove_roots', {
  tex: { all: T.custom('muddy_roots'), top: T.speck('#3d3a3f', '#4b474d', 60) }, hard: 0.7, tool: 'shovel', place: 'axis', sound: 'mud'
});
defBlock('clay', { tex: T.speck('#a3a8b5', '#8f96a5', 40), hard: 0.6, tool: 'shovel', drop: 'clay_ball', dropCount: [4, 4], sound: 'gravel' });
defBlock('sand', { tex: T.speck('#dbcc8e', '#cbbc7c', 90, 1), hard: 0.5, tool: 'shovel', fall: true, sound: 'sand' });
defBlock('red_sand', { tex: T.speck('#bb6b31', '#a95f2a', 90, 1), hard: 0.5, tool: 'shovel', fall: true, sound: 'sand' });
defBlock('gravel', { tex: T.cobble('#8a8686', '#696666'), hard: 0.6, tool: 'shovel', fall: true, sound: 'gravel' });
defBlock('suspicious_sand', { tex: T.custom('suspicious_sand'), hard: 0.25, tool: 'shovel', fall: true, sound: 'sand', drop: 'sand' });
defBlock('suspicious_gravel', { tex: T.custom('suspicious_gravel'), hard: 0.25, tool: 'shovel', fall: true, sound: 'gravel', drop: 'gravel' });
defBlock('snow_block', { tex: T.solid('#f4fafa', 0.02), hard: 0.2, tool: 'shovel', drop: 'snowball', dropCount: [4, 4], sound: 'snow' });
defBlock('powder_snow', { tex: T.solid('#f8fdfd', 0.03), hard: 0.25, solid: false, collide: false, opaque: false, render: 'cube', sound: 'snow', drop: null });
defBlock('ice', { tex: T.custom('ice'), hard: 0.5, tool: 'pickaxe', opaque: false, filter: [0.75, 0.86, 1.0], absorb: 1, slip: 0.98, drop: null, sound: 'glass' });
defBlock('packed_ice', { tex: T.custom('packed_ice'), hard: 0.5, tool: 'pickaxe', slip: 0.98, drop: null, sound: 'glass' });
defBlock('blue_ice', { tex: T.custom('blue_ice'), hard: 2.8, tool: 'pickaxe', slip: 0.989, sound: 'glass' });
defBlock('magma_block', { tex: T.custom('magma'), hard: 0.5, tool: 'pickaxe', light: 3, sound: 'stone' });
defBlock('obsidian', { tex: T.speck('#100d1a', '#241d38', 26), hard: 50, blast: 1200, tool: 'pickaxe', tier: 4 });
defBlock('crying_obsidian', { tex: T.custom('crying_obsidian'), hard: 50, blast: 1200, tool: 'pickaxe', tier: 4, light: 10 });
defBlock('soul_sand', {
  render: 'box', boxes: [box(0, 0, 0, 16, 16, 16, { cull: true })], opaque: true,
  tex: T.custom('soul_sand'), hard: 0.5, tool: 'shovel', speedMul: 0.4, sound: 'sand'
});
defBlock('soul_soil', { tex: T.speck('#4c3a2c', '#3a2b20', 80), hard: 0.5, tool: 'shovel', sound: 'sand' });
defBlock('netherrack', { tex: T.speck('#6f3435', '#5b2a2b', 90), hard: 0.4, tool: 'pickaxe', tier: 1, sound: 'netherrack' });
defBlock('warped_nylium', {
  tex: { top: T.speck('#2b7267', '#1d564f', 80), bottom: T.speck('#6f3435', '#5b2a2b', 90), side: T.custom('warped_nylium_side') },
  hard: 0.4, tool: 'pickaxe', tier: 1, drop: 'netherrack', sound: 'netherrack'
});
defBlock('crimson_nylium', {
  tex: { top: T.speck('#853d3d', '#6c2f2f', 80), bottom: T.speck('#6f3435', '#5b2a2b', 90), side: T.custom('crimson_nylium_side') },
  hard: 0.4, tool: 'pickaxe', tier: 1, drop: 'netherrack', sound: 'netherrack'
});
defBlock('end_stone', { tex: T.speck('#dcdfa6', '#c4c78b', 50), hard: 3, tool: 'pickaxe', tier: 1 });

/* =========================== VARIANT GENERATORS ========================= */
/* Most decorative stone in the game exists as {block, slab, stairs, wall},
   and every wood exists as a big family; generating those from one call
   keeps the registry honest and complete instead of hand-typed and patchy. */

function copyTex(t) { return t; }

function addSlab(base, name, o) {
  defBlock(name, {
    render: 'slab', tex: o.tex, hard: o.hard, blast: o.blast, tool: o.tool, tier: o.tier,
    sound: o.sound, drop: name, opaque: false, solid: false, place: 'slabhalf',
    group: o.group, flam: o.flam, dropCount: null
  });
}
function addStairs(base, name, o) {
  defBlock(name, {
    render: 'stairs', tex: o.tex, hard: o.hard, blast: o.blast, tool: o.tool, tier: o.tier,
    sound: o.sound, drop: name, opaque: false, solid: false, place: 'stairs',
    group: o.group, flam: o.flam
  });
}
function addWall(base, name, o) {
  defBlock(name, {
    render: 'wall', tex: o.tex, hard: o.hard, blast: o.blast, tool: o.tool, tier: o.tier,
    sound: o.sound, drop: name, opaque: false, solid: false, group: o.group
  });
}

/* stoneVariant(name, tex, {...}, "sw" ) — letters: s=slab t=stairs w=wall */
function stoneVariant(name, tex, opts, kinds) {
  opts = opts || {};
  var o = {
    tex: tex, hard: opts.hard === undefined ? 1.5 : opts.hard,
    blast: opts.blast === undefined ? 6 : opts.blast,
    tool: opts.tool || 'pickaxe', tier: opts.tier === undefined ? 1 : opts.tier,
    sound: opts.sound || 'stone', group: opts.group || 'building', flam: opts.flam || 0
  };
  if (!BY_NAME[name]) {
    defBlock(name, {
      tex: tex, hard: o.hard, blast: o.blast, tool: o.tool, tier: o.tier, sound: o.sound,
      group: o.group, flam: o.flam, drop: opts.drop === undefined ? name : opts.drop,
      place: opts.place || null
    });
  }
  kinds = kinds === undefined ? 'stw' : kinds;
  var stem = name.replace(/_block$/, '');
  if (kinds.indexOf('s') >= 0) addSlab(name, stem + '_slab', o);
  if (kinds.indexOf('t') >= 0) addStairs(name, stem + '_stairs', o);
  if (kinds.indexOf('w') >= 0) addWall(name, stem + '_wall', o);
}

/* ================================= ORES ================================= */
var STONE_BG = T.solid('#7d7d7d', 0.075);
var DEEP_BG = T.solid('#585860', 0.07);
var NETHER_BG = T.speck('#6f3435', '#5b2a2b', 90);

function oreSet(name, gem, count, opts) {
  opts = opts || {};
  defBlock(name + '_ore', {
    tex: T.ore(STONE_BG, gem, count, opts.glow || 0), hard: opts.hard || 3, tool: 'pickaxe',
    tier: opts.tier || 1, drop: opts.drop || (name + '_raw_or_item'), xp: opts.xp || 0,
    group: 'ore', light: opts.light || 0, dropCount: opts.dropCount || null
  });
  defBlock('deepslate_' + name + '_ore', {
    tex: T.ore(DEEP_BG, gem, count, opts.glow || 0), hard: (opts.hard || 3) + 1.5, tool: 'pickaxe',
    tier: opts.tier || 1, drop: opts.drop || (name + '_raw_or_item'), xp: opts.xp || 0,
    group: 'ore', sound: 'deepslate', light: opts.light || 0, dropCount: opts.dropCount || null
  });
}
oreSet('coal', '#151515', 6, { drop: 'coal', xp: 1, tier: 1 });
oreSet('iron', '#d8af93', 6, { drop: 'raw_iron', tier: 2 });
oreSet('copper', '#d8703c', 8, { drop: 'raw_copper', tier: 2, dropCount: [2, 5] });
oreSet('gold', '#f6c542', 6, { drop: 'raw_gold', tier: 3 });
oreSet('redstone', '#c81b1b', 7, { drop: 'redstone', tier: 3, dropCount: [4, 5], light: 0, glow: 0.35 });
oreSet('lapis', '#2350b5', 6, { drop: 'lapis_lazuli', tier: 2, dropCount: [4, 9], xp: 3 });
oreSet('diamond', '#54e4d8', 5, { drop: 'diamond', tier: 3, xp: 4 });
oreSet('emerald', '#26cf4f', 4, { drop: 'emerald', tier: 3, xp: 4 });
defBlock('nether_gold_ore', { tex: T.ore(NETHER_BG, '#f6c542', 8), hard: 3, tool: 'pickaxe', tier: 1, drop: 'gold_nugget', dropCount: [2, 6], xp: 1, group: 'ore', sound: 'netherrack' });
defBlock('nether_quartz_ore', { tex: T.ore(NETHER_BG, '#e8e0d8', 6), hard: 3, tool: 'pickaxe', tier: 1, drop: 'quartz', xp: 2, group: 'ore', sound: 'netherrack' });
defBlock('ancient_debris', { tex: { all: T.custom('ancient_debris_side'), top: T.custom('ancient_debris_top') }, hard: 30, blast: 1200, tool: 'pickaxe', tier: 4, group: 'ore', sound: 'netherrack' });
defBlock('gilded_blackstone', { tex: T.ore(T.speck('#2b2529', '#1c181b', 60), '#f6c542', 6), hard: 1.5, tool: 'pickaxe', tier: 1, drop: 'gold_nugget', dropCount: [2, 5], group: 'ore' });

/* metal / mineral blocks */
defBlock('coal_block', { tex: T.speck('#191919', '#0d0d0d', 40), hard: 5, blast: 30, tool: 'pickaxe', tier: 1, group: 'building' });
defBlock('iron_block', { tex: T.metal('#dcdcdc', '#b6b6b6'), hard: 5, blast: 30, tool: 'pickaxe', tier: 2, group: 'building', sound: 'metal' });
defBlock('gold_block', { tex: T.metal('#f7d33f', '#d9ae23'), hard: 3, blast: 30, tool: 'pickaxe', tier: 3, group: 'building', sound: 'metal' });
defBlock('diamond_block', { tex: T.custom('diamond_block'), hard: 5, blast: 30, tool: 'pickaxe', tier: 3, group: 'building' });
defBlock('emerald_block', { tex: T.custom('emerald_block'), hard: 5, blast: 30, tool: 'pickaxe', tier: 3, group: 'building' });
defBlock('lapis_block', { tex: T.speck('#1f47a8', '#3763c9', 44), hard: 3, tool: 'pickaxe', tier: 2, group: 'building' });
defBlock('redstone_block', { tex: T.speck('#a71414', '#cd2020', 44), hard: 5, tool: 'pickaxe', tier: 1, group: 'redstone' });
defBlock('netherite_block', { tex: T.metal('#4a4247', '#332e31'), hard: 50, blast: 1200, tool: 'pickaxe', tier: 4, group: 'building', sound: 'metal' });
defBlock('raw_iron_block', { tex: T.raw('#b8785a', '#d8af93'), hard: 5, tool: 'pickaxe', tier: 2, group: 'building' });
defBlock('raw_copper_block', { tex: T.raw('#a5573a', '#d8703c'), hard: 5, tool: 'pickaxe', tier: 2, group: 'building' });
defBlock('raw_gold_block', { tex: T.raw('#d3a63c', '#f6c542'), hard: 5, tool: 'pickaxe', tier: 3, group: 'building' });
defBlock('quartz_block', { tex: { all: T.solid('#eae5dd', 0.03), top: T.solid('#f0ebe4', 0.03) }, hard: 0.8, tool: 'pickaxe', tier: 1, group: 'building' });
defBlock('amethyst_block', { tex: T.custom('amethyst_block'), hard: 1.5, tool: 'pickaxe', tier: 1, group: 'building', sound: 'amethyst' });
defBlock('budding_amethyst', { tex: T.custom('budding_amethyst'), hard: 1.5, tool: 'pickaxe', tier: 1, drop: null, group: 'building', sound: 'amethyst' });

/* ======================= COPPER + OXIDATION STAGES ====================== */
var COPPER_STAGES = [
  ['', '#c06a43', '#a75935'],
  ['exposed_', '#9c8163', '#87755c'],
  ['weathered_', '#6f9068', '#5d7d58'],
  ['oxidized_', '#4fa88b', '#43917a']
];
(function () {
  for (var i = 0; i < COPPER_STAGES.length; i++) {
    var st = COPPER_STAGES[i], pre = st[0], c = st[1], d = st[2];
    for (var w = 0; w < 2; w++) {
      var wax = w ? 'waxed_' : '';
      stoneVariant(wax + pre + 'copper_block', T.metal(c, d), { hard: 3, tier: 2, sound: 'copper', group: 'copper' }, '');
      stoneVariant(wax + pre + 'cut_copper', T.custom('cut_copper', { c: c, d: d }), { hard: 3, tier: 2, sound: 'copper', group: 'copper' }, 'st');
      defBlock(wax + pre + 'chiseled_copper', { tex: T.custom('chiseled_copper', { c: c, d: d }), hard: 3, tool: 'pickaxe', tier: 2, sound: 'copper', group: 'copper' });
      defBlock(wax + pre + 'copper_grate', { tex: T.custom('copper_grate', { c: c, d: d }), hard: 3, tool: 'pickaxe', tier: 2, sound: 'copper', group: 'copper', opaque: false });
      defBlock(wax + pre + 'copper_bulb', { tex: T.custom('copper_bulb', { c: c, d: d }), hard: 3, tool: 'pickaxe', tier: 2, sound: 'copper', group: 'copper', light: 15 });
      defBlock(wax + pre + 'copper_door', { render: 'door', tex: T.custom('copper_door', { c: c, d: d }), hard: 3, tool: 'pickaxe', tier: 2, sound: 'copper', group: 'copper', opaque: false, solid: false, place: 'door' });
      defBlock(wax + pre + 'copper_trapdoor', { render: 'trapdoor', tex: T.custom('copper_trapdoor', { c: c, d: d }), hard: 3, tool: 'pickaxe', tier: 2, sound: 'copper', group: 'copper', opaque: false, solid: false, place: 'trapdoor' });
    }
  }
})();

/* ============================ STONE VARIANTS ============================ */
stoneVariant('cobblestone', T.cobble('#8a8a8a', '#666666'), { hard: 2, drop: 'cobblestone' }, 'stw');
stoneVariant('mossy_cobblestone', T.mossy(T.cobble('#8a8a8a', '#666666')), { hard: 2 }, 'stw');
stoneVariant('smooth_stone', T.solid('#a0a0a0', 0.02), { hard: 2 }, 's');
stoneVariant('stone_bricks', T.brick('#7b7b7b', '#5f5f5f', 0.14), { hard: 1.5 }, 'stw');
stoneVariant('mossy_stone_bricks', T.mossy(T.brick('#7b7b7b', '#5f5f5f', 0.14)), { hard: 1.5 }, 'stw');
stoneVariant('cracked_stone_bricks', T.cracked(T.brick('#7b7b7b', '#5f5f5f', 0.14), '#4a4a4a'), { hard: 1.5 }, '');
defBlock('chiseled_stone_bricks', { tex: T.custom('chiseled_stone_bricks'), hard: 1.5, tool: 'pickaxe', tier: 1, group: 'building' });
stoneVariant('polished_granite', T.solid('#9c6c5c', 0.035), { hard: 1.5 }, 'st');
stoneVariant('polished_diorite', T.solid('#cdcdd0', 0.03), { hard: 1.5 }, 'st');
stoneVariant('polished_andesite', T.solid('#848487', 0.03), { hard: 1.5 }, 'st');
stoneVariant('granite', null, { hard: 1.5 }, 'stw');
stoneVariant('diorite', null, { hard: 1.5 }, 'stw');
stoneVariant('andesite', null, { hard: 1.5 }, 'stw');
stoneVariant('stone', null, { hard: 1.5 }, 'st');
stoneVariant('cobbled_deepslate', null, { hard: 3.5, sound: 'deepslate' }, 'stw');
stoneVariant('polished_deepslate', T.solid('#4b4b53', 0.035), { hard: 3.5, sound: 'deepslate' }, 'stw');
stoneVariant('deepslate_bricks', T.brick('#4a4a52', '#37373d', 0.14), { hard: 3.5, sound: 'deepslate' }, 'stw');
stoneVariant('deepslate_tiles', T.tiles('#39393f', '#2b2b31', 4), { hard: 3.5, sound: 'deepslate' }, 'stw');
stoneVariant('cracked_deepslate_bricks', T.cracked(T.brick('#4a4a52', '#37373d', 0.14), '#2c2c31'), { hard: 3.5, sound: 'deepslate' }, '');
stoneVariant('cracked_deepslate_tiles', T.cracked(T.tiles('#39393f', '#2b2b31', 4), '#232328'), { hard: 3.5, sound: 'deepslate' }, '');
defBlock('chiseled_deepslate', { tex: T.custom('chiseled_deepslate'), hard: 3.5, tool: 'pickaxe', tier: 1, sound: 'deepslate', group: 'building' });
defBlock('reinforced_deepslate', { tex: T.custom('reinforced_deepslate'), hard: 55, blast: 1200, tool: 'pickaxe', tier: 4, drop: null, sound: 'deepslate', group: 'building' });
stoneVariant('tuff', null, { hard: 1.5 }, 'stw');
stoneVariant('polished_tuff', T.solid('#63665d', 0.03), { hard: 1.5 }, 'stw');
stoneVariant('tuff_bricks', T.brick('#5e6157', '#4a4d45', 0.13), { hard: 1.5 }, 'stw');
stoneVariant('bricks', T.brick('#96604a', '#7b4d3c', 0.2), { hard: 2, blast: 30 }, 'stw');
stoneVariant('mud_bricks', T.brick('#8c6a51', '#725441', 0.16), { hard: 1.5 }, 'stw');
defBlock('packed_mud', { tex: T.speck('#8b6b4f', '#755840', 70), hard: 1, tool: 'pickaxe', tier: 1, group: 'building' });
stoneVariant('blackstone', T.speck('#2b2529', '#1c181b', 60), { hard: 1.5 }, 'stw');
stoneVariant('polished_blackstone', T.solid('#35303a', 0.03), { hard: 2 }, 'stw');
stoneVariant('polished_blackstone_bricks', T.brick('#312b34', '#221e26', 0.14), { hard: 1.5 }, 'stw');
stoneVariant('cracked_polished_blackstone_bricks', T.cracked(T.brick('#312b34', '#221e26', 0.14), '#18151b'), { hard: 1.5 }, '');
defBlock('chiseled_polished_blackstone', { tex: T.custom('chiseled_blackstone'), hard: 1.5, tool: 'pickaxe', tier: 1, group: 'building' });
stoneVariant('polished_basalt', T.grain('#5a5a63', 0.05, 'v'), { hard: 1.25 }, '');
stoneVariant('nether_bricks', T.brick('#2f181c', '#221114', 0.18), { hard: 2, sound: 'nether_bricks' }, 'stw');
stoneVariant('red_nether_bricks', T.brick('#4a0d10', '#2f0a0c', 0.18), { hard: 2, sound: 'nether_bricks' }, 'stw');
defBlock('cracked_nether_bricks', { tex: T.cracked(T.brick('#2f181c', '#221114', 0.18), '#170b0d'), hard: 2, tool: 'pickaxe', tier: 1, group: 'building' });
defBlock('chiseled_nether_bricks', { tex: T.custom('chiseled_nether_bricks'), hard: 2, tool: 'pickaxe', tier: 1, group: 'building' });
stoneVariant('end_stone_bricks', T.brick('#dbdfa4', '#c0c487', 0.13), { hard: 3 }, 'stw');
stoneVariant('purpur_block', T.speck('#a97fa9', '#96709a', 40), { hard: 1.5 }, 'st');
defBlock('purpur_pillar', { tex: { all: T.custom('purpur_pillar'), top: T.speck('#a97fa9', '#96709a', 40) }, hard: 1.5, tool: 'pickaxe', tier: 1, place: 'axis', group: 'building' });
stoneVariant('quartz_bricks', T.brick('#e6e0d6', '#cdc6ba', 0.09), { hard: 0.8 }, '');
stoneVariant('smooth_quartz', T.solid('#ece7e0', 0.02), { hard: 2 }, 'st');
defBlock('chiseled_quartz_block', { tex: { all: T.custom('chiseled_quartz'), top: T.solid('#ece7e0', 0.02) }, hard: 0.8, tool: 'pickaxe', tier: 1, group: 'building' });
defBlock('quartz_pillar', { tex: { all: T.custom('quartz_pillar'), top: T.custom('quartz_pillar_top') }, hard: 0.8, tool: 'pickaxe', tier: 1, place: 'axis', group: 'building' });
stoneVariant('quartz', null, { hard: 0.8, drop: 'quartz_block' }, '');
addSlab('quartz_block', 'quartz_slab', { tex: T.solid('#eae5dd', 0.03), hard: 0.8, tool: 'pickaxe', tier: 1, sound: 'stone', group: 'building' });
addStairs('quartz_block', 'quartz_stairs', { tex: T.solid('#eae5dd', 0.03), hard: 0.8, tool: 'pickaxe', tier: 1, sound: 'stone', group: 'building' });
stoneVariant('prismarine', T.custom('prismarine'), { hard: 1.5 }, 'stw');
stoneVariant('prismarine_bricks', T.custom('prismarine_bricks'), { hard: 1.5 }, 'st');
stoneVariant('dark_prismarine', T.custom('dark_prismarine'), { hard: 1.5 }, 'st');
defBlock('sea_lantern', { tex: T.custom('sea_lantern'), hard: 0.3, light: 15, group: 'building', drop: 'prismarine_crystals', dropCount: [2, 3] });
stoneVariant('sandstone', {
  all: T.custom('sandstone_side'), top: T.speck('#dfd3a1', '#cfc28c', 40), bottom: T.speck('#dfd3a1', '#cfc28c', 40)
}, { hard: 0.8 }, 'stw');
defBlock('chiseled_sandstone', { tex: { all: T.custom('chiseled_sandstone'), top: T.speck('#dfd3a1', '#cfc28c', 40) }, hard: 0.8, tool: 'pickaxe', tier: 1, group: 'building' });
stoneVariant('cut_sandstone', T.custom('cut_sandstone'), { hard: 0.8 }, 's');
stoneVariant('smooth_sandstone', T.speck('#e2d6a4', '#d6c996', 24), { hard: 2 }, 'st');
stoneVariant('red_sandstone', {
  all: T.custom('red_sandstone_side'), top: T.speck('#bf6b2c', '#a95f26', 40), bottom: T.speck('#bf6b2c', '#a95f26', 40)
}, { hard: 0.8 }, 'stw');
defBlock('chiseled_red_sandstone', { tex: { all: T.custom('chiseled_red_sandstone'), top: T.speck('#bf6b2c', '#a95f26', 40) }, hard: 0.8, tool: 'pickaxe', tier: 1, group: 'building' });
stoneVariant('cut_red_sandstone', T.custom('cut_red_sandstone'), { hard: 0.8 }, 's');
stoneVariant('smooth_red_sandstone', T.speck('#c0702f', '#b06729', 24), { hard: 2 }, 'st');

/* ============================== WOOD SETS =============================== */
/* name, planks, planksDark, bark, barkDark, logCore, leaf, leafDark, flags */
var WOODS = [
  { n: 'oak', p: '#b0904f', pd: '#98793f', b: '#6b542e', bd: '#4f3e21', c: '#b9945a', lf: '#4f8f2c', lfd: '#3d701f' },
  { n: 'spruce', p: '#7a5a36', pd: '#63482a', b: '#4a3721', bd: '#3a2a19', c: '#8b6a41', lf: '#5a8f5c', lfd: '#456f47', fixedLeaf: 1 },
  { n: 'birch', p: '#d0bb7c', pd: '#b8a468', b: '#dcdcd4', bd: '#b6b6ad', c: '#c8b077', lf: '#84b355', lfd: '#6d9945', fixedLeaf: 1 },
  { n: 'jungle', p: '#a2704b', pd: '#8a5e3d', b: '#57431f', bd: '#423317', c: '#9a7148', lf: '#3fa019', lfd: '#2f7d12' },
  { n: 'acacia', p: '#b46237', pd: '#99502c', b: '#6a5c40', bd: '#4f452f', c: '#a45c33', lf: '#6f9c34', lfd: '#5a802a' },
  { n: 'dark_oak', p: '#4b3418', pd: '#3a2812', b: '#3b2b16', bd: '#2c2010', c: '#503818', lf: '#3c6b25', lfd: '#2d521c' },
  { n: 'mangrove', p: '#763228', pd: '#5f281f', b: '#5a3d31', bd: '#452e25', c: '#7a3529', lf: '#5b9137', lfd: '#48732b' },
  { n: 'cherry', p: '#dcb2a2', pd: '#c39a8b', b: '#3b2a2c', bd: '#2c2021', c: '#dfb6a6', lf: '#eba0c0', lfd: '#d886aa', pinkLeaf: 1 },
  { n: 'pale_oak', p: '#e5e0d6', pd: '#cfc9be', b: '#5d5a52', bd: '#46433d', c: '#dedad0', lf: '#c6d0a4', lfd: '#a9b487', fixedLeaf: 1 },
  { n: 'crimson', p: '#6a344b', pd: '#54293b', b: '#5a2b3c', bd: '#452130', c: '#883f5b', lf: '#7b1f28', lfd: '#611820', nether: 1 },
  { n: 'warped', p: '#2b6a63', pd: '#22534e', b: '#38292f', bd: '#2a1f23', c: '#2c8177', lf: '#1a7573', lfd: '#145b59', nether: 1 }
];

function woodFamily(w) {
  var isN = !!w.nether;
  var logName = isN ? w.n + '_stem' : w.n + '_log';
  var woodName = isN ? w.n + '_hyphae' : w.n + '_wood';
  var sound = isN ? 'nether_wood' : 'wood';
  var barkTex = T.logside(w.b, w.bd, w.n);
  var topTex = T.logtop(w.c, w.bd, w.n);
  var stripB = T.logside(w.c, w.pd, w.n + '_s');
  var stripT = T.logtop(w.c, w.pd, w.n + '_s');

  defBlock(logName, { tex: { all: barkTex, top: topTex, bottom: topTex }, hard: 2, tool: 'axe', place: 'axis', flam: 5, sound: sound, group: 'wood' });
  defBlock('stripped_' + logName, { tex: { all: stripB, top: stripT, bottom: stripT }, hard: 2, tool: 'axe', place: 'axis', flam: 5, sound: sound, group: 'wood' });
  defBlock(woodName, { tex: barkTex, hard: 2, tool: 'axe', place: 'axis', flam: 5, sound: sound, group: 'wood' });
  defBlock('stripped_' + woodName, { tex: stripB, hard: 2, tool: 'axe', place: 'axis', flam: 5, sound: sound, group: 'wood' });

  var pt = T.planks(w.p, w.pd);
  var po = { tex: pt, hard: 2, blast: 15, tool: 'axe', tier: 0, sound: sound, group: 'wood', flam: isN ? 0 : 20 };
  defBlock(w.n + '_planks', { tex: pt, hard: 2, blast: 15, tool: 'axe', sound: sound, group: 'wood', flam: isN ? 0 : 20 });
  addSlab(null, w.n + '_slab', po);
  addStairs(null, w.n + '_stairs', po);
  defBlock(w.n + '_fence', { render: 'fence', tex: pt, hard: 2, tool: 'axe', sound: sound, opaque: false, solid: false, group: 'wood', flam: isN ? 0 : 20 });
  defBlock(w.n + '_fence_gate', { render: 'gate', tex: pt, hard: 2, tool: 'axe', sound: sound, opaque: false, solid: false, place: 'facing', group: 'wood', flam: isN ? 0 : 20 });
  defBlock(w.n + '_door', { render: 'door', tex: T.custom('door', { c: w.p, d: w.pd }), hard: 3, tool: 'axe', sound: sound, opaque: false, solid: false, place: 'door', group: 'wood', stack: 64 });
  defBlock(w.n + '_trapdoor', { render: 'trapdoor', tex: T.custom('trapdoor', { c: w.p, d: w.pd }), hard: 3, tool: 'axe', sound: sound, opaque: false, solid: false, place: 'trapdoor', group: 'wood' });
  defBlock(w.n + '_button', { render: 'button', tex: pt, hard: 0.5, tool: 'axe', sound: sound, opaque: false, solid: false, collide: false, place: 'facing6', group: 'redstone' });
  defBlock(w.n + '_pressure_plate', { render: 'plate', tex: pt, hard: 0.5, tool: 'axe', sound: sound, opaque: false, solid: false, collide: false, group: 'redstone' });
  defBlock(w.n + '_sign', { render: 'sign', tex: pt, hard: 1, tool: 'axe', sound: sound, opaque: false, solid: false, collide: false, place: 'rot16', group: 'deco', stack: 16 });

  if (isN) {
    /* nether "leaves" analogue */
  } else {
    defBlock(w.n + '_leaves', {
      tex: T.leaves(w.lf, w.lfd), hard: 0.2, tool: 'hoe', opaque: false, solid: true,
      tint: (w.pinkLeaf || w.fixedLeaf) ? null : 'foliage', waving: 2, absorb: 1, sound: 'grass',
      group: 'nature', flam: 30, drop: null, growth: 'leaves'
    });
    defBlock(w.n + '_sapling', {
      render: 'cross', tex: T.cross(w.lf, w.lfd, 'sapling'), hard: 0, solid: false, collide: false,
      opaque: false, waving: 1, sound: 'grass', group: 'nature', growth: 'sapling', flam: 60
    });
  }
}
for (var wi = 0; wi < WOODS.length; wi++) woodFamily(WOODS[wi]);

/* bamboo is its own little family */
defBlock('bamboo_block', { tex: { all: T.logside('#7b8b2e', '#63701f', 'bamboo'), top: T.logtop('#a2b23f', '#63701f', 'bamboo') }, hard: 2, tool: 'axe', place: 'axis', sound: 'bamboo', group: 'wood' });
defBlock('stripped_bamboo_block', { tex: { all: T.logside('#c2b04a', '#a1913a', 'bamboo_s'), top: T.logtop('#c2b04a', '#a1913a', 'bamboo_s') }, hard: 2, tool: 'axe', place: 'axis', sound: 'bamboo', group: 'wood' });
(function () {
  var po = { tex: T.planks('#c2b04a', '#a89740'), hard: 2, tool: 'axe', sound: 'bamboo', group: 'wood', flam: 20 };
  defBlock('bamboo_planks', { tex: po.tex, hard: 2, tool: 'axe', sound: 'bamboo', group: 'wood', flam: 20 });
  addSlab(null, 'bamboo_slab', po); addStairs(null, 'bamboo_stairs', po);
  var mo = { tex: T.custom('bamboo_mosaic'), hard: 2, tool: 'axe', sound: 'bamboo', group: 'wood', flam: 20 };
  defBlock('bamboo_mosaic', { tex: mo.tex, hard: 2, tool: 'axe', sound: 'bamboo', group: 'wood', flam: 20 });
  addSlab(null, 'bamboo_mosaic_slab', mo); addStairs(null, 'bamboo_mosaic_stairs', mo);
  defBlock('bamboo_fence', { render: 'fence', tex: po.tex, hard: 2, tool: 'axe', sound: 'bamboo', opaque: false, solid: false, group: 'wood' });
  defBlock('bamboo_fence_gate', { render: 'gate', tex: po.tex, hard: 2, tool: 'axe', sound: 'bamboo', opaque: false, solid: false, place: 'facing', group: 'wood' });
  defBlock('bamboo_door', { render: 'door', tex: T.custom('door', { c: '#c2b04a', d: '#a89740' }), hard: 3, tool: 'axe', sound: 'bamboo', opaque: false, solid: false, place: 'door', group: 'wood' });
  defBlock('bamboo_trapdoor', { render: 'trapdoor', tex: T.custom('trapdoor', { c: '#c2b04a', d: '#a89740' }), hard: 3, tool: 'axe', sound: 'bamboo', opaque: false, solid: false, place: 'trapdoor', group: 'wood' });
  defBlock('bamboo_button', { render: 'button', tex: po.tex, hard: 0.5, tool: 'axe', sound: 'bamboo', opaque: false, solid: false, collide: false, place: 'facing6', group: 'redstone' });
  defBlock('bamboo_pressure_plate', { render: 'plate', tex: po.tex, hard: 0.5, tool: 'axe', sound: 'bamboo', opaque: false, solid: false, collide: false, group: 'redstone' });
  defBlock('bamboo_sign', { render: 'sign', tex: po.tex, hard: 1, tool: 'axe', sound: 'bamboo', opaque: false, solid: false, collide: false, place: 'rot16', group: 'deco', stack: 16 });
})();
defBlock('bamboo', {
  render: 'bamboo', tex: T.custom('bamboo_stalk'), hard: 1, tool: 'axe', solid: false, collide: false,
  opaque: false, sound: 'bamboo', group: 'nature', growth: 'bamboo', waving: 1
});

/* nether wood extras */
defBlock('nether_wart_block', { tex: T.speck('#731a1c', '#8e2427', 90), hard: 1, tool: 'hoe', group: 'nature', sound: 'wart' });
defBlock('warped_wart_block', { tex: T.speck('#167b74', '#1f9c93', 90), hard: 1, tool: 'hoe', group: 'nature', sound: 'wart' });
defBlock('shroomlight', { tex: T.custom('shroomlight'), hard: 1, tool: 'hoe', light: 15, group: 'nature', sound: 'wart' });
defBlock('crimson_fungus', { render: 'cross', tex: T.custom('crimson_fungus'), hard: 0, solid: false, collide: false, opaque: false, waving: 1, group: 'nature', sound: 'grass' });
defBlock('warped_fungus', { render: 'cross', tex: T.custom('warped_fungus'), hard: 0, solid: false, collide: false, opaque: false, waving: 1, group: 'nature', sound: 'grass' });

/* ============================== DYE COLOURS ============================= */
var DYE_COLORS = [
  ['white', '#e9ecec', '#d5d8d8'], ['orange', '#f07613', '#d2620d'], ['magenta', '#bd44b3', '#a13a98'],
  ['light_blue', '#3aafd9', '#3094b9'], ['yellow', '#f8c627', '#dcae1e'], ['lime', '#70b919', '#5e9c15'],
  ['pink', '#ed8dac', '#d47a97'], ['gray', '#3e4447', '#2f3437'], ['light_gray', '#8e8e86', '#767670'],
  ['cyan', '#158991', '#11747b'], ['purple', '#792ab0', '#652395'], ['blue', '#35399d', '#2b2e84'],
  ['brown', '#724728', '#5d3a20'], ['green', '#546d1b', '#455b15'], ['red', '#a12722', '#87201c'],
  ['black', '#141519', '#0c0d10']
];
var TERRA_COLORS = {
  white: '#d1b1a1', orange: '#a15325', magenta: '#95576c', light_blue: '#706c8a', yellow: '#ba8523',
  lime: '#677535', pink: '#a24e4e', gray: '#392a24', light_gray: '#876b62', cyan: '#575b5b',
  purple: '#764656', blue: '#4a3b5b', brown: '#4d3323', green: '#4c532a', red: '#8e3c2e', black: '#251610'
};
(function () {
  for (var i = 0; i < DYE_COLORS.length; i++) {
    var c = DYE_COLORS[i], n = c[0], col = c[1], dark = c[2];
    defBlock(n + '_wool', { tex: T.wool(col), hard: 0.8, tool: 'shears', sound: 'wool', group: 'color', flam: 60 });
    defBlock(n + '_carpet', { render: 'carpet', tex: T.wool(col), hard: 0.1, opaque: false, solid: false, sound: 'wool', group: 'color', flam: 60 });
    defBlock(n + '_concrete', { tex: T.concrete(col), hard: 1.8, tool: 'pickaxe', tier: 1, group: 'color' });
    defBlock(n + '_concrete_powder', { tex: T.speck(col, dark, 60), hard: 0.5, tool: 'shovel', fall: true, sound: 'sand', group: 'color' });
    defBlock(n + '_terracotta', { tex: T.terra(TERRA_COLORS[n]), hard: 1.25, tool: 'pickaxe', tier: 1, group: 'color' });
    defBlock(n + '_glazed_terracotta', { tex: T.glazed(col, dark, i), hard: 1.4, tool: 'pickaxe', tier: 1, place: 'facing', group: 'color' });
    defBlock(n + '_stained_glass', {
      render: 'cube', tex: T.glass(col, 1), hard: 0.3, opaque: false, sound: 'glass', drop: null,
      filter: hexToLin(col), absorb: 1, group: 'color'
    });
    defBlock(n + '_stained_glass_pane', {
      render: 'pane', tex: T.pane(col, 1), hard: 0.3, opaque: false, solid: false, sound: 'glass', drop: null, group: 'color'
    });
    defBlock(n + '_bed', { render: 'bed', tex: T.wool(col), hard: 0.2, opaque: false, solid: false, sound: 'wool', place: 'facing', group: 'deco', stack: 1 });
    defBlock(n + '_candle', { render: 'candle', tex: T.wool(col), hard: 0.1, opaque: false, solid: false, collide: false, light: 3, group: 'deco' });
    defBlock(n + '_shulker_box', { tex: T.custom('shulker', { c: col, d: dark }), hard: 2, tool: 'pickaxe', ui: 'chest', group: 'storage', stack: 1 });
    defBlock(n + '_banner', { render: 'sign', tex: T.wool(col), hard: 1, tool: 'axe', opaque: false, solid: false, collide: false, place: 'rot16', group: 'deco', stack: 16 });
  }
})();
function hexToLin(h) {
  var r = parseInt(h.substr(1, 2), 16) / 255, g = parseInt(h.substr(3, 2), 16) / 255, b = parseInt(h.substr(5, 2), 16) / 255;
  return [r, g, b];
}
defBlock('terracotta', { tex: T.terra('#985e43'), hard: 1.25, tool: 'pickaxe', tier: 1, group: 'color' });
defBlock('glass', { render: 'cube', tex: T.glass('#ffffff', 0), hard: 0.3, opaque: false, sound: 'glass', drop: null, absorb: 0, group: 'building' });
defBlock('tinted_glass', { render: 'cube', tex: T.glass('#2c2530', 1), hard: 0.3, opaque: false, sound: 'glass', drop: null, absorb: 15, group: 'building' });
defBlock('glass_pane', { render: 'pane', tex: T.pane('#ffffff', 0), hard: 0.3, opaque: false, solid: false, sound: 'glass', drop: null, group: 'building' });

/* badlands terracotta banding uses these */
var BADLANDS_BANDS = ['terracotta', 'orange_terracotta', 'white_terracotta', 'light_gray_terracotta',
  'yellow_terracotta', 'brown_terracotta', 'red_terracotta'];

/* ============================== PLANT LIFE ============================== */
defBlock('short_grass', { render: 'cross', tex: T.cross('#79c05a', '#5e9c40', 'grass'), hard: 0, solid: false, collide: false, opaque: false, tint: 'grass', waving: 1, replaceable: true, drop: null, sound: 'grass', group: 'nature', flam: 100 });
defBlock('fern', { render: 'cross', tex: T.cross('#79c05a', '#5e9c40', 'fern'), hard: 0, solid: false, collide: false, opaque: false, tint: 'grass', waving: 1, replaceable: true, drop: null, sound: 'grass', group: 'nature', flam: 100 });
defBlock('dead_bush', { render: 'cross', tex: T.cross('#946428', '#7a5220', 'dead'), hard: 0, solid: false, collide: false, opaque: false, waving: 1, replaceable: true, drop: 'stick', sound: 'grass', group: 'nature', flam: 100 });
defBlock('tall_grass', { render: 'tall', tex: T.cross('#79c05a', '#5e9c40', 'tallgrass'), hard: 0, solid: false, collide: false, opaque: false, tint: 'grass', waving: 1, replaceable: true, drop: null, sound: 'grass', group: 'nature', flam: 100 });
defBlock('large_fern', { render: 'tall', tex: T.cross('#79c05a', '#5e9c40', 'largefern'), hard: 0, solid: false, collide: false, opaque: false, tint: 'grass', waving: 1, replaceable: true, drop: null, sound: 'grass', group: 'nature', flam: 100 });
defBlock('seagrass', { render: 'cross', tex: T.cross('#2d8a3a', '#22682c', 'seagrass'), hard: 0, solid: false, collide: false, opaque: false, waving: 1, replaceable: true, drop: null, sound: 'grass', group: 'nature' });
defBlock('kelp', { render: 'cross', tex: T.cross('#3d8f4a', '#2c6d37', 'kelp'), hard: 0, solid: false, collide: false, opaque: false, waving: 1, sound: 'grass', group: 'nature', growth: 'kelp' });

var FLOWERS = [
  ['dandelion', '#f7e83b', '#4f8f2c', 'simple'], ['poppy', '#e02f28', '#4f8f2c', 'simple'],
  ['blue_orchid', '#2ab7e0', '#4f8f2c', 'orchid'], ['allium', '#b45bd6', '#4f8f2c', 'allium'],
  ['azure_bluet', '#e9eae6', '#4f8f2c', 'bluet'], ['red_tulip', '#e33b2c', '#4f8f2c', 'tulip'],
  ['orange_tulip', '#e08b26', '#4f8f2c', 'tulip'], ['white_tulip', '#eceff0', '#4f8f2c', 'tulip'],
  ['pink_tulip', '#eaa8c8', '#4f8f2c', 'tulip'], ['oxeye_daisy', '#f2f4f0', '#4f8f2c', 'daisy'],
  ['cornflower', '#4a63d8', '#4f8f2c', 'simple'], ['lily_of_the_valley', '#eef2ee', '#4f8f2c', 'lily'],
  ['torchflower', '#e8752c', '#4f8f2c', 'daisy'], ['wither_rose', '#22201f', '#2e2b28', 'simple'],
  ['open_eyeblossom', '#e6e0c0', '#8a9c7a', 'daisy'], ['closed_eyeblossom', '#8a7f6a', '#6f7a60', 'simple']
];
for (var fi = 0; fi < FLOWERS.length; fi++) {
  (function (f) {
    defBlock(f[0], {
      render: 'cross', tex: T.flower(f[2], f[1], '#f4d76a', f[3]), hard: 0, solid: false, collide: false,
      opaque: false, waving: 1, replaceable: false, sound: 'grass', group: 'nature', flam: 100
    });
  })(FLOWERS[fi]);
}
var TALL_FLOWERS = [['sunflower', '#f2c02a'], ['lilac', '#c39ad8'], ['rose_bush', '#c8342c'], ['peony', '#eab6d8'], ['pitcher_plant', '#9a6fd0']];
for (var tf = 0; tf < TALL_FLOWERS.length; tf++) {
  defBlock(TALL_FLOWERS[tf][0], {
    render: 'tall', tex: T.flower('#4f8f2c', TALL_FLOWERS[tf][1], '#f4d76a', TALL_FLOWERS[tf][0]),
    hard: 0, solid: false, collide: false, opaque: false, waving: 1, sound: 'grass', group: 'nature', flam: 100
  });
}
defBlock('lily_pad', { render: 'flat', tex: T.custom('lily_pad'), hard: 0, solid: false, collide: false, opaque: false, tint: 'foliage', sound: 'grass', group: 'nature' });
defBlock('sugar_cane', { render: 'cross', tex: T.cross('#96c46b', '#7aa554', 'cane'), hard: 0, solid: false, collide: false, opaque: false, waving: 1, drop: 'sugar_cane', sound: 'grass', group: 'nature', growth: 'cane' });
defBlock('cactus', {
  render: 'cactus', tex: { all: T.custom('cactus_side'), top: T.custom('cactus_top'), bottom: T.custom('cactus_bottom') },
  hard: 0.4, opaque: false, sound: 'wool', group: 'nature', growth: 'cactus'
});
defBlock('vine', { render: 'vine', tex: T.custom('vine'), hard: 0.2, solid: false, collide: false, opaque: false, tint: 'foliage', waving: 1, climb: true, drop: null, sound: 'grass', group: 'nature', flam: 45, growth: 'vine' });
defBlock('glow_lichen', { render: 'vine', tex: T.custom('glow_lichen'), hard: 0.2, solid: false, collide: false, opaque: false, light: 7, drop: null, sound: 'grass', group: 'nature' });
defBlock('moss_block', { tex: T.speck('#5a7a29', '#476020', 80), hard: 0.1, tool: 'hoe', sound: 'moss', group: 'nature' });
defBlock('moss_carpet', { render: 'carpet', tex: T.speck('#5a7a29', '#476020', 80), hard: 0.1, opaque: false, solid: false, sound: 'moss', group: 'nature' });
defBlock('pale_moss_block', { tex: T.speck('#6b7565', '#565f52', 80), hard: 0.1, tool: 'hoe', sound: 'moss', group: 'nature' });
defBlock('azalea', { render: 'cross', tex: T.cross('#6f8f3a', '#54702c', 'azalea'), hard: 0, solid: false, collide: false, opaque: false, waving: 1, sound: 'grass', group: 'nature' });
defBlock('flowering_azalea', { render: 'cross', tex: T.cross('#6f8f3a', '#d88fb0', 'azalea_f'), hard: 0, solid: false, collide: false, opaque: false, waving: 1, sound: 'grass', group: 'nature' });
defBlock('azalea_leaves', { tex: T.leaves('#5f8a34', '#4a6e28'), hard: 0.2, tool: 'hoe', opaque: false, waving: 2, absorb: 1, sound: 'grass', group: 'nature', drop: null });
defBlock('flowering_azalea_leaves', { tex: T.custom('flowering_azalea_leaves'), hard: 0.2, tool: 'hoe', opaque: false, waving: 2, absorb: 1, sound: 'grass', group: 'nature', drop: null });
defBlock('big_dripleaf', { render: 'flat', tex: T.custom('dripleaf'), hard: 0.1, solid: false, opaque: false, tint: 'foliage', sound: 'grass', group: 'nature' });
defBlock('small_dripleaf', { render: 'cross', tex: T.cross('#4f8f2c', '#3d701f', 'dripleaf'), hard: 0, solid: false, collide: false, opaque: false, waving: 1, sound: 'grass', group: 'nature' });
defBlock('spore_blossom', { render: 'flat', tex: T.custom('spore_blossom'), hard: 0, solid: false, collide: false, opaque: false, sound: 'grass', group: 'nature' });
defBlock('hanging_roots', { render: 'cross', tex: T.cross('#c9a06a', '#a8834f', 'roots'), hard: 0, solid: false, collide: false, opaque: false, waving: 1, sound: 'grass', group: 'nature' });
defBlock('cave_vines', { render: 'cross', tex: T.cross('#5a7a29', '#476020', 'cavevine'), hard: 0, solid: false, collide: false, opaque: false, sound: 'grass', group: 'nature', growth: 'cavevine' });
defBlock('cave_vines_berries', { render: 'cross', tex: T.custom('cave_vines_berries'), hard: 0, solid: false, collide: false, opaque: false, light: 14, drop: 'glow_berries', sound: 'grass', group: 'nature' });
defBlock('sweet_berry_bush', { render: 'cross', tex: T.custom('sweet_berry_bush'), hard: 0, solid: false, collide: false, opaque: false, waving: 1, drop: 'sweet_berries', sound: 'grass', group: 'nature', growth: 'berry' });
defBlock('brown_mushroom', { render: 'cross', tex: T.custom('brown_mushroom'), hard: 0, solid: false, collide: false, opaque: false, light: 1, sound: 'grass', group: 'nature' });
defBlock('red_mushroom', { render: 'cross', tex: T.custom('red_mushroom'), hard: 0, solid: false, collide: false, opaque: false, sound: 'grass', group: 'nature' });
defBlock('brown_mushroom_block', { tex: T.speck('#977e6b', '#836a58', 30), hard: 0.2, tool: 'axe', sound: 'wood', group: 'nature' });
defBlock('red_mushroom_block', { tex: T.custom('red_mushroom_block'), hard: 0.2, tool: 'axe', sound: 'wood', group: 'nature' });
defBlock('mushroom_stem', { tex: T.speck('#cfc7b4', '#bab2a0', 30), hard: 0.2, tool: 'axe', sound: 'wood', group: 'nature' });
defBlock('crimson_roots', { render: 'cross', tex: T.cross('#951e2b', '#6f1620', 'roots'), hard: 0, solid: false, collide: false, opaque: false, waving: 1, sound: 'wart', group: 'nature' });
defBlock('warped_roots', { render: 'cross', tex: T.cross('#14b490', '#0e8a6d', 'roots'), hard: 0, solid: false, collide: false, opaque: false, waving: 1, sound: 'wart', group: 'nature' });
defBlock('nether_sprouts', { render: 'cross', tex: T.cross('#20b09a', '#178a78', 'sprouts'), hard: 0, solid: false, collide: false, opaque: false, waving: 1, sound: 'wart', group: 'nature' });
defBlock('weeping_vines', { render: 'cross', tex: T.cross('#a11d1d', '#7c1616', 'weeping'), hard: 0, solid: false, collide: false, opaque: false, climb: true, sound: 'wart', group: 'nature' });
defBlock('twisting_vines', { render: 'cross', tex: T.cross('#14a58c', '#0f7f6c', 'weeping'), hard: 0, solid: false, collide: false, opaque: false, climb: true, sound: 'wart', group: 'nature' });
defBlock('nether_wart', { render: 'crop', tex: T.crop('#a11d3a', 3), hard: 0, solid: false, collide: false, opaque: false, drop: 'nether_wart', sound: 'wart', group: 'nature', growth: 'netherwart' });
defBlock('chorus_plant', { render: 'chorus', tex: T.custom('chorus_plant'), hard: 0.4, tool: 'axe', opaque: false, solid: false, sound: 'wood', group: 'nature' });
defBlock('chorus_flower', { render: 'cube', tex: T.custom('chorus_flower'), hard: 0.4, opaque: false, sound: 'wood', group: 'nature', growth: 'chorus' });
defBlock('pumpkin', { tex: { all: T.custom('pumpkin_side'), top: T.custom('pumpkin_top'), bottom: T.custom('pumpkin_top') }, hard: 1, tool: 'axe', sound: 'wood', group: 'nature' });
defBlock('carved_pumpkin', { tex: { all: T.custom('pumpkin_side'), top: T.custom('pumpkin_top'), bottom: T.custom('pumpkin_top'), front: T.custom('pumpkin_face') }, hard: 1, tool: 'axe', place: 'facing', sound: 'wood', group: 'nature' });
defBlock('jack_o_lantern', { tex: { all: T.custom('pumpkin_side'), top: T.custom('pumpkin_top'), bottom: T.custom('pumpkin_top'), front: T.custom('jack_face') }, hard: 1, tool: 'axe', place: 'facing', light: 15, sound: 'wood', group: 'nature' });
defBlock('melon', { tex: { all: T.custom('melon_side'), top: T.custom('melon_top'), bottom: T.custom('melon_top') }, hard: 1, tool: 'axe', drop: 'melon_slice', dropCount: [3, 7], sound: 'wood', group: 'nature' });
defBlock('pumpkin_stem', { render: 'crop', tex: T.crop('#7fa03c', 3), hard: 0, solid: false, collide: false, opaque: false, drop: 'pumpkin_seeds', sound: 'grass', group: 'nature', growth: 'stem' });
defBlock('melon_stem', { render: 'crop', tex: T.crop('#7fa03c', 3), hard: 0, solid: false, collide: false, opaque: false, drop: 'melon_seeds', sound: 'grass', group: 'nature', growth: 'stem' });
defBlock('wheat', { render: 'crop', tex: T.crop('#d9c15a', 7), hard: 0, solid: false, collide: false, opaque: false, drop: 'wheat', sound: 'grass', group: 'nature', growth: 'wheat', waving: 1 });
defBlock('carrots', { render: 'crop', tex: T.crop('#3f8a2c', 7), hard: 0, solid: false, collide: false, opaque: false, drop: 'carrot', sound: 'grass', group: 'nature', growth: 'carrots', waving: 1 });
defBlock('potatoes', { render: 'crop', tex: T.crop('#4d9438', 7), hard: 0, solid: false, collide: false, opaque: false, drop: 'potato', sound: 'grass', group: 'nature', growth: 'potatoes', waving: 1 });
defBlock('beetroots', { render: 'crop', tex: T.crop('#2f6d2a', 3), hard: 0, solid: false, collide: false, opaque: false, drop: 'beetroot', sound: 'grass', group: 'nature', growth: 'beetroots', waving: 1 });
defBlock('torchflower_crop', { render: 'crop', tex: T.crop('#6f9a3a', 2), hard: 0, solid: false, collide: false, opaque: false, sound: 'grass', group: 'nature', growth: 'torchflower' });
defBlock('cocoa', { render: 'cocoa', tex: T.custom('cocoa'), hard: 0.2, tool: 'axe', solid: false, opaque: false, place: 'facing', drop: 'cocoa_beans', sound: 'wood', group: 'nature', growth: 'cocoa' });

/* ============================ UTILITY BLOCKS ============================ */
defBlock('crafting_table', {
  tex: { all: T.custom('crafting_side'), top: T.custom('crafting_top'), front: T.custom('crafting_front'), bottom: T.planks('#b0904f', '#98793f') },
  hard: 2.5, tool: 'axe', ui: 'crafting', sound: 'wood', group: 'util', flam: 20
});
defBlock('furnace', {
  tex: { all: T.solid('#787878', 0.06), top: T.custom('furnace_top'), front: T.custom('furnace_front') },
  hard: 3.5, tool: 'pickaxe', tier: 1, ui: 'furnace', place: 'facing', group: 'util'
});
defBlock('furnace_lit', {
  tex: { all: T.solid('#787878', 0.06), top: T.custom('furnace_top'), front: T.custom('furnace_front_lit') },
  hard: 3.5, tool: 'pickaxe', tier: 1, ui: 'furnace', place: 'facing', light: 13, drop: 'furnace', group: 'util', noItem: true, variantOf: 'furnace'
});
defBlock('blast_furnace', {
  tex: { all: T.custom('blast_side'), top: T.custom('blast_top'), front: T.custom('blast_front') },
  hard: 3.5, tool: 'pickaxe', tier: 1, ui: 'furnace', place: 'facing', group: 'util'
});
defBlock('blast_furnace_lit', {
  tex: { all: T.custom('blast_side'), top: T.custom('blast_top'), front: T.custom('blast_front_lit') },
  hard: 3.5, tool: 'pickaxe', tier: 1, ui: 'furnace', place: 'facing', light: 13, drop: 'blast_furnace', group: 'util', noItem: true, variantOf: 'blast_furnace'
});
defBlock('smoker', {
  tex: { all: T.custom('smoker_side'), top: T.custom('smoker_top'), front: T.custom('smoker_front'), bottom: T.planks('#7a5a36', '#63482a') },
  hard: 3.5, tool: 'pickaxe', tier: 1, ui: 'furnace', place: 'facing', group: 'util'
});
defBlock('smoker_lit', {
  tex: { all: T.custom('smoker_side'), top: T.custom('smoker_top'), front: T.custom('smoker_front_lit'), bottom: T.planks('#7a5a36', '#63482a') },
  hard: 3.5, tool: 'pickaxe', tier: 1, ui: 'furnace', place: 'facing', light: 13, drop: 'smoker', group: 'util', noItem: true, variantOf: 'smoker'
});
defBlock('chest', { render: 'chest', tex: T.custom('chest'), hard: 2.5, tool: 'axe', ui: 'chest', place: 'facing', opaque: false, solid: false, sound: 'wood', group: 'storage', flam: 20 });
defBlock('trapped_chest', { render: 'chest', tex: T.custom('chest'), hard: 2.5, tool: 'axe', ui: 'chest', place: 'facing', opaque: false, solid: false, sound: 'wood', group: 'storage' });
defBlock('ender_chest', { render: 'chest', tex: T.custom('ender_chest'), hard: 22.5, tool: 'pickaxe', tier: 1, ui: 'chest', place: 'facing', opaque: false, solid: false, light: 7, group: 'storage' });
defBlock('barrel', { tex: { all: T.custom('barrel_side'), top: T.custom('barrel_top'), bottom: T.custom('barrel_top') }, hard: 2.5, tool: 'axe', ui: 'chest', place: 'axis', sound: 'wood', group: 'storage' });
defBlock('enchanting_table', { render: 'enchanting', tex: { all: T.custom('ench_side'), top: T.custom('ench_top'), bottom: T.custom('obsidian_dark') }, hard: 5, blast: 1200, tool: 'pickaxe', tier: 1, ui: 'enchanting', opaque: false, solid: false, light: 7, group: 'util' });
defBlock('brewing_stand', { render: 'brewing', tex: T.custom('brewing_stand'), hard: 0.5, tool: 'pickaxe', tier: 1, ui: 'brewing', opaque: false, solid: false, light: 1, group: 'util' });
defBlock('anvil', { render: 'anvil', tex: T.custom('anvil'), hard: 5, blast: 1200, tool: 'pickaxe', tier: 1, ui: 'anvil', place: 'facing', opaque: false, solid: false, fall: true, sound: 'anvil', group: 'util' });
defBlock('chipped_anvil', { render: 'anvil', tex: T.custom('anvil_chipped'), hard: 5, tool: 'pickaxe', tier: 1, ui: 'anvil', place: 'facing', opaque: false, solid: false, fall: true, sound: 'anvil', group: 'util' });
defBlock('damaged_anvil', { render: 'anvil', tex: T.custom('anvil_damaged'), hard: 5, tool: 'pickaxe', tier: 1, ui: 'anvil', place: 'facing', opaque: false, solid: false, fall: true, sound: 'anvil', group: 'util' });
defBlock('smithing_table', { tex: { all: T.custom('smithing_side'), top: T.custom('smithing_top'), bottom: T.custom('smithing_bottom') }, hard: 2.5, tool: 'axe', ui: 'smithing', sound: 'wood', group: 'util' });
defBlock('grindstone', { render: 'grindstone', tex: T.custom('grindstone'), hard: 2, tool: 'pickaxe', tier: 1, ui: 'grindstone', place: 'facing', opaque: false, solid: false, group: 'util' });
defBlock('stonecutter', { render: 'stonecutter', tex: { all: T.custom('stonecutter_side'), top: T.custom('stonecutter_top') }, hard: 3.5, tool: 'pickaxe', tier: 1, ui: 'stonecutter', place: 'facing', opaque: false, solid: false, group: 'util' });
defBlock('cartography_table', { tex: { all: T.custom('carto_side'), top: T.custom('carto_top') }, hard: 2.5, tool: 'axe', sound: 'wood', group: 'util' });
defBlock('fletching_table', { tex: { all: T.custom('fletch_side'), top: T.custom('fletch_top') }, hard: 2.5, tool: 'axe', sound: 'wood', group: 'util' });
defBlock('loom', { tex: { all: T.custom('loom_side'), top: T.custom('loom_top'), front: T.custom('loom_front') }, hard: 2.5, tool: 'axe', place: 'facing', sound: 'wood', group: 'util' });
defBlock('composter', { render: 'composter', tex: T.custom('composter'), hard: 0.6, tool: 'axe', opaque: false, solid: false, sound: 'wood', group: 'util' });
defBlock('cauldron', { render: 'cauldron', tex: T.custom('cauldron'), hard: 2, tool: 'pickaxe', tier: 1, opaque: false, solid: false, sound: 'metal', group: 'util' });
defBlock('lectern', { render: 'lectern', tex: T.custom('lectern'), hard: 2.5, tool: 'axe', place: 'facing', opaque: false, solid: false, sound: 'wood', group: 'util' });
defBlock('bell', { render: 'bell', tex: T.custom('bell'), hard: 5, tool: 'pickaxe', tier: 1, place: 'facing', opaque: false, solid: false, sound: 'metal', group: 'util' });
defBlock('beacon', { render: 'beacon', tex: T.custom('beacon'), hard: 3, opaque: false, light: 15, group: 'util' });
defBlock('conduit', { render: 'conduit', tex: T.custom('conduit'), hard: 3, opaque: false, solid: false, light: 15, group: 'util' });
defBlock('respawn_anchor', { tex: { all: T.custom('anchor_side'), top: T.custom('anchor_top') }, hard: 50, blast: 1200, tool: 'pickaxe', tier: 4, light: 0, group: 'util' });
defBlock('lodestone', { tex: { all: T.custom('lodestone_side'), top: T.custom('lodestone_top') }, hard: 3.5, tool: 'pickaxe', tier: 2, group: 'util' });
defBlock('jukebox', { tex: { all: T.custom('jukebox_side'), top: T.custom('jukebox_top') }, hard: 2, tool: 'axe', sound: 'wood', group: 'util' });
defBlock('note_block', { tex: T.custom('note_block'), hard: 0.8, tool: 'axe', sound: 'wood', group: 'redstone' });
defBlock('bookshelf', { tex: { all: T.custom('bookshelf'), top: T.planks('#b0904f', '#98793f'), bottom: T.planks('#b0904f', '#98793f') }, hard: 1.5, tool: 'axe', drop: 'book', dropCount: [3, 3], sound: 'wood', group: 'deco', flam: 30 });
defBlock('chiseled_bookshelf', { tex: { all: T.custom('chiseled_bookshelf'), top: T.planks('#b0904f', '#98793f'), bottom: T.planks('#b0904f', '#98793f') }, hard: 1.5, tool: 'axe', place: 'facing', sound: 'wood', group: 'deco' });
defBlock('sponge', { tex: T.speck('#c7c452', '#b0ad42', 70), hard: 0.6, tool: 'hoe', group: 'util' });
defBlock('wet_sponge', { tex: T.speck('#a2a544', '#8b8e37', 70), hard: 0.6, tool: 'hoe', group: 'util' });
defBlock('hay_block', { tex: { all: T.custom('hay_side'), top: T.custom('hay_top') }, hard: 0.5, tool: 'hoe', place: 'axis', sound: 'grass', group: 'nature', flam: 60 });
defBlock('dried_kelp_block', { tex: { all: T.speck('#31392a', '#26301f', 60), top: T.speck('#3a4630', '#2c3625', 60) }, hard: 0.5, tool: 'hoe', group: 'nature' });
defBlock('bone_block', { tex: { all: T.custom('bone_side'), top: T.custom('bone_top') }, hard: 2, tool: 'pickaxe', tier: 1, place: 'axis', group: 'building' });
defBlock('honey_block', { render: 'cube', tex: T.custom('honey'), hard: 0, opaque: false, solid: true, slip: 0.4, speedMul: 0.4, sound: 'slime', group: 'util' });
defBlock('honeycomb_block', { tex: T.custom('honeycomb'), hard: 0.6, group: 'util' });
defBlock('slime_block', { render: 'cube', tex: T.custom('slime'), hard: 0, opaque: false, solid: true, sound: 'slime', group: 'util' });
defBlock('cobweb', { render: 'cross', tex: T.custom('cobweb'), hard: 4, tool: 'sword', solid: false, collide: false, opaque: false, speedMul: 0.12, drop: 'string', sound: 'wool', group: 'nature' });
defBlock('scaffolding', { render: 'scaffold', tex: T.custom('scaffolding'), hard: 0, tool: 'axe', opaque: false, solid: false, climb: true, sound: 'bamboo', group: 'building' });
defBlock('ladder', { render: 'ladder', tex: T.custom('ladder'), hard: 0.4, tool: 'axe', opaque: false, solid: false, collide: false, climb: true, place: 'facing', sound: 'ladder', group: 'building' });
defBlock('iron_bars', { render: 'pane', tex: T.custom('iron_bars'), hard: 5, blast: 30, tool: 'pickaxe', tier: 1, opaque: false, solid: false, sound: 'metal', group: 'building' });
defBlock('chain', { render: 'chain', tex: T.custom('chain'), hard: 5, tool: 'pickaxe', tier: 1, opaque: false, solid: false, place: 'axis', sound: 'chain', group: 'building' });
defBlock('iron_door', { render: 'door', tex: T.custom('iron_door'), hard: 5, tool: 'pickaxe', tier: 1, opaque: false, solid: false, place: 'door', sound: 'metal', group: 'building' });
defBlock('iron_trapdoor', { render: 'trapdoor', tex: T.custom('iron_trapdoor'), hard: 5, tool: 'pickaxe', tier: 1, opaque: false, solid: false, place: 'trapdoor', sound: 'metal', group: 'building' });
defBlock('torch', { render: 'torch', tex: T.custom('torch'), hard: 0, solid: false, collide: false, opaque: false, light: 14, place: 'facing6', sound: 'wood', group: 'deco' });
defBlock('soul_torch', { render: 'torch', tex: T.custom('soul_torch'), hard: 0, solid: false, collide: false, opaque: false, light: 10, place: 'facing6', sound: 'wood', group: 'deco' });
defBlock('lantern', { render: 'lantern', tex: T.custom('lantern'), hard: 3.5, tool: 'pickaxe', tier: 1, solid: false, opaque: false, light: 15, place: 'trapdoor', sound: 'metal', group: 'deco' });
defBlock('soul_lantern', { render: 'lantern', tex: T.custom('soul_lantern'), hard: 3.5, tool: 'pickaxe', tier: 1, solid: false, opaque: false, light: 10, place: 'trapdoor', sound: 'metal', group: 'deco' });
defBlock('end_rod', { render: 'endrod', tex: T.custom('end_rod'), hard: 0, solid: false, collide: false, opaque: false, light: 14, place: 'facing6', group: 'deco' });
defBlock('campfire', { render: 'campfire', tex: T.custom('campfire'), hard: 2, tool: 'axe', opaque: false, solid: false, light: 15, place: 'facing', sound: 'wood', group: 'deco' });
defBlock('soul_campfire', { render: 'campfire', tex: T.custom('soul_campfire'), hard: 2, tool: 'axe', opaque: false, solid: false, light: 10, place: 'facing', sound: 'wood', group: 'deco' });
defBlock('glowstone', { tex: T.custom('glowstone'), hard: 0.3, light: 15, drop: 'glowstone_dust', dropCount: [2, 4], group: 'deco', sound: 'glass' });
defBlock('flower_pot', { render: 'pot', tex: T.custom('flower_pot'), hard: 0, solid: false, opaque: false, group: 'deco' });
defBlock('tnt', { tex: { all: T.custom('tnt_side'), top: T.custom('tnt_top'), bottom: T.custom('tnt_bottom') }, hard: 0, group: 'redstone', flam: 15 });
defBlock('spawner', { render: 'cube', tex: T.custom('spawner'), hard: 5, tool: 'pickaxe', tier: 1, opaque: false, drop: null, xp: 15, sound: 'metal', group: 'util' });
defBlock('trial_spawner', { tex: { all: T.custom('trial_spawner_side'), top: T.custom('trial_spawner_top') }, hard: 50, tool: 'pickaxe', drop: null, light: 4, group: 'util' });
defBlock('vault', { tex: { all: T.custom('vault_side'), top: T.custom('vault_top'), front: T.custom('vault_front') }, hard: 50, tool: 'pickaxe', drop: null, light: 6, place: 'facing', group: 'util' });
defBlock('infested_stone', { tex: T.solid('#7d7d7d', 0.075), hard: 0.75, tool: 'pickaxe', drop: null, group: 'misc' });
defBlock('infested_deepslate', { tex: T.grain('#585860', 0.07, 'v'), hard: 0.75, tool: 'pickaxe', drop: null, group: 'misc' });
defBlock('barrier', { render: 'none', tex: null, solid: true, opaque: false, hard: -1, drop: null, group: 'misc', noItem: true });

/* --- sculk / deep dark --- */
defBlock('sculk', { tex: T.sculk(), hard: 0.2, tool: 'hoe', xp: 1, sound: 'sculk', group: 'nature' });
defBlock('sculk_vein', { render: 'vine', tex: T.custom('sculk_vein'), hard: 0.2, solid: false, collide: false, opaque: false, drop: null, sound: 'sculk', group: 'nature' });
defBlock('sculk_catalyst', { tex: { all: T.custom('sculk_catalyst_side'), top: T.custom('sculk_catalyst_top') }, hard: 3, tool: 'hoe', light: 6, xp: 5, sound: 'sculk', group: 'nature' });
defBlock('sculk_shrieker', { render: 'shrieker', tex: T.custom('sculk_shrieker'), hard: 3, tool: 'hoe', opaque: false, solid: false, sound: 'sculk', group: 'nature' });
defBlock('sculk_sensor', { render: 'sensor', tex: T.custom('sculk_sensor'), hard: 1.5, tool: 'hoe', opaque: false, solid: false, light: 1, sound: 'sculk', group: 'redstone' });
defBlock('calibrated_sculk_sensor', { render: 'sensor', tex: T.custom('sculk_sensor'), hard: 1.5, tool: 'hoe', opaque: false, solid: false, light: 1, place: 'facing', sound: 'sculk', group: 'redstone' });

/* --- amethyst geode extras --- */
defBlock('small_amethyst_bud', { render: 'cross', tex: T.custom('amethyst_bud1'), hard: 1.5, solid: false, collide: false, opaque: false, light: 1, place: 'facing6', sound: 'amethyst', group: 'nature' });
defBlock('medium_amethyst_bud', { render: 'cross', tex: T.custom('amethyst_bud2'), hard: 1.5, solid: false, collide: false, opaque: false, light: 2, place: 'facing6', sound: 'amethyst', group: 'nature' });
defBlock('large_amethyst_bud', { render: 'cross', tex: T.custom('amethyst_bud3'), hard: 1.5, solid: false, collide: false, opaque: false, light: 4, place: 'facing6', sound: 'amethyst', group: 'nature' });
defBlock('amethyst_cluster', { render: 'cross', tex: T.custom('amethyst_cluster'), hard: 1.5, solid: false, collide: false, opaque: false, light: 5, place: 'facing6', drop: 'amethyst_shard', dropCount: [4, 4], sound: 'amethyst', group: 'nature' });
defBlock('pointed_dripstone', { render: 'dripstone', tex: T.custom('pointed_dripstone'), hard: 1.5, tool: 'pickaxe', solid: false, opaque: false, place: 'facing6', group: 'nature' });

/* --- portals & end --- */
defBlock('nether_portal', { render: 'portal', tex: T.custom('nether_portal'), hard: -1, solid: false, collide: false, opaque: false, light: 11, drop: null, group: 'misc', noItem: true });
defBlock('end_portal', { render: 'endportal', tex: T.custom('end_portal'), hard: -1, solid: false, collide: false, opaque: false, light: 15, drop: null, group: 'misc', noItem: true });
defBlock('end_portal_frame', { render: 'frame', tex: { all: T.custom('end_frame_side'), top: T.custom('end_frame_top'), bottom: T.custom('end_frame_bottom') }, hard: -1, opaque: false, solid: false, light: 1, place: 'facing', drop: null, group: 'misc' });
defBlock('end_gateway', { render: 'endportal', tex: T.custom('end_portal'), hard: -1, solid: false, collide: false, opaque: false, light: 15, drop: null, group: 'misc', noItem: true });
defBlock('dragon_egg', { render: 'dragonegg', tex: T.custom('dragon_egg'), hard: 3, opaque: false, solid: false, light: 1, group: 'misc' });
defBlock('fire', { render: 'fire', tex: T.custom('fire'), hard: 0, solid: false, collide: false, opaque: false, light: 15, drop: null, replaceable: true, group: 'misc', noItem: true });
defBlock('soul_fire', { render: 'fire', tex: T.custom('soul_fire'), hard: 0, solid: false, collide: false, opaque: false, light: 10, drop: null, replaceable: true, group: 'misc', noItem: true });
defBlock('snow', { render: 'layer', tex: T.solid('#f4fafa', 0.02), hard: 0.1, tool: 'shovel', opaque: false, solid: false, replaceable: true, drop: 'snowball', sound: 'snow', group: 'nature' });

/* ============================== REDSTONE ================================ */
defBlock('redstone_wire', { render: 'wire', tex: T.custom('redstone_dust'), hard: 0, solid: false, collide: false, opaque: false, drop: 'redstone', group: 'redstone' });
defBlock('redstone_torch', { render: 'torch', tex: T.custom('redstone_torch'), hard: 0, solid: false, collide: false, opaque: false, light: 7, place: 'facing6', group: 'redstone' });
defBlock('repeater', { render: 'repeater', tex: T.custom('repeater'), hard: 0, solid: false, opaque: false, place: 'facing', group: 'redstone' });
defBlock('comparator', { render: 'repeater', tex: T.custom('comparator'), hard: 0, solid: false, opaque: false, place: 'facing', group: 'redstone' });
defBlock('lever', { render: 'lever', tex: T.custom('lever'), hard: 0.5, solid: false, collide: false, opaque: false, place: 'facing6', group: 'redstone' });
defBlock('stone_button', { render: 'button', tex: T.solid('#7d7d7d', 0.075), hard: 0.5, tool: 'pickaxe', solid: false, collide: false, opaque: false, place: 'facing6', group: 'redstone' });
defBlock('stone_pressure_plate', { render: 'plate', tex: T.solid('#7d7d7d', 0.075), hard: 0.5, tool: 'pickaxe', solid: false, collide: false, opaque: false, group: 'redstone' });
defBlock('light_weighted_pressure_plate', { render: 'plate', tex: T.metal('#f7d33f', '#d9ae23'), hard: 0.5, tool: 'pickaxe', solid: false, collide: false, opaque: false, group: 'redstone' });
defBlock('heavy_weighted_pressure_plate', { render: 'plate', tex: T.metal('#dcdcdc', '#b6b6b6'), hard: 0.5, tool: 'pickaxe', solid: false, collide: false, opaque: false, group: 'redstone' });
defBlock('observer', { tex: { all: T.custom('observer_side'), top: T.custom('observer_top'), front: T.custom('observer_front'), back: T.custom('observer_back') }, hard: 3, tool: 'pickaxe', place: 'facing6', group: 'redstone' });
defBlock('piston', { render: 'piston', tex: { all: T.custom('piston_side'), top: T.custom('piston_side'), front: T.custom('piston_front'), back: T.custom('piston_back') }, hard: 1.5, tool: 'pickaxe', place: 'facing6', opaque: false, group: 'redstone' });
defBlock('sticky_piston', { render: 'piston', tex: { all: T.custom('piston_side'), front: T.custom('piston_sticky'), back: T.custom('piston_back') }, hard: 1.5, tool: 'pickaxe', place: 'facing6', opaque: false, group: 'redstone' });
defBlock('dispenser', { tex: { all: T.solid('#787878', 0.06), top: T.custom('furnace_top'), front: T.custom('dispenser_front') }, hard: 3.5, tool: 'pickaxe', place: 'facing6', ui: 'chest', group: 'redstone' });
defBlock('dropper', { tex: { all: T.solid('#787878', 0.06), top: T.custom('furnace_top'), front: T.custom('dropper_front') }, hard: 3.5, tool: 'pickaxe', place: 'facing6', ui: 'chest', group: 'redstone' });
defBlock('hopper', { render: 'hopper', tex: T.custom('hopper'), hard: 3, tool: 'pickaxe', opaque: false, solid: false, ui: 'chest', place: 'facing6', group: 'redstone' });
defBlock('redstone_lamp', { tex: T.custom('redstone_lamp'), hard: 0.3, group: 'redstone', sound: 'glass' });
defBlock('redstone_lamp_lit', { tex: T.custom('redstone_lamp_lit'), hard: 0.3, light: 15, drop: 'redstone_lamp', group: 'redstone', noItem: true, variantOf: 'redstone_lamp', sound: 'glass' });
defBlock('target', { tex: { all: T.custom('target_side'), top: T.custom('target_top') }, hard: 0.5, tool: 'hoe', group: 'redstone' });
defBlock('daylight_detector', { render: 'plate', tex: { top: T.custom('daylight_top'), all: T.custom('daylight_side') }, hard: 0.2, tool: 'axe', opaque: false, solid: false, group: 'redstone' });
defBlock('tripwire_hook', { render: 'hook', tex: T.custom('tripwire_hook'), hard: 0, solid: false, collide: false, opaque: false, place: 'facing', group: 'redstone' });
defBlock('lightning_rod', { render: 'rod', tex: T.custom('lightning_rod'), hard: 3, tool: 'pickaxe', opaque: false, solid: false, place: 'facing6', sound: 'copper', group: 'redstone' });
defBlock('rail', { render: 'rail', tex: T.custom('rail'), hard: 0.7, tool: 'pickaxe', solid: false, collide: false, opaque: false, sound: 'metal', group: 'redstone' });
defBlock('powered_rail', { render: 'rail', tex: T.custom('powered_rail'), hard: 0.7, tool: 'pickaxe', solid: false, collide: false, opaque: false, sound: 'metal', group: 'redstone' });
defBlock('detector_rail', { render: 'rail', tex: T.custom('detector_rail'), hard: 0.7, tool: 'pickaxe', solid: false, collide: false, opaque: false, sound: 'metal', group: 'redstone' });
defBlock('activator_rail', { render: 'rail', tex: T.custom('activator_rail'), hard: 0.7, tool: 'pickaxe', solid: false, collide: false, opaque: false, sound: 'metal', group: 'redstone' });

/* ---- convenience id constants used all over worldgen & gameplay ---- */
var A = 0;
var B_STONE, B_DIRT, B_GRASS, B_WATER, B_LAVA, B_SAND, B_GRAVEL, B_BEDROCK, B_DEEPSLATE;
(function () {
  B_STONE = BID.stone; B_DIRT = BID.dirt; B_GRASS = BID.grass_block; B_WATER = BID.water;
  B_LAVA = BID.lava; B_SAND = BID.sand; B_GRAVEL = BID.gravel; B_BEDROCK = BID.bedrock;
  B_DEEPSLATE = BID.deepslate;
})();

/* Fast lookup tables the mesher and physics hammer every frame. */
var IS_OPAQUE = null, IS_SOLID = null, LIGHT_EMIT = null, IS_LIQUID = null, LIGHT_ABSORB = null;
/* --------------------------------------------------------------- heads -- */
(function () {
  var heads = [
    ['skeleton_skull', 'face_skeleton', 'Skeleton Skull'],
    ['wither_skeleton_skull', 'face_wither_skeleton', 'Wither Skeleton Skull'],
    ['zombie_head', 'face_zombie', 'Zombie Head'],
    ['creeper_head', 'face_creeper', 'Creeper Head'],
    ['player_head', 'face_player', 'Player Head'],
    ['piglin_head', 'face_piglin', 'Piglin Head'],
    ['dragon_head', 'face_dragon', 'Dragon Head']
  ];
  for (var i = 0; i < heads.length; i++) {
    defBlock(heads[i][0], {
      render: 'skull', tex: T.custom(heads[i][1]), disp: heads[i][2],
      hard: 1, solid: false, opaque: false, collide: true, place: 'rot16',
      group: 'deco', stack: 64, sound: 'stone'
    });
  }
})();

function buildBlockTables() {
  var n = BLOCKS.length;
  IS_OPAQUE = new Uint8Array(n); IS_SOLID = new Uint8Array(n);
  LIGHT_EMIT = new Uint8Array(n); IS_LIQUID = new Uint8Array(n); LIGHT_ABSORB = new Uint8Array(n);
  for (var i = 0; i < n; i++) {
    var b = BLOCKS[i];
    IS_OPAQUE[i] = b.opaque ? 1 : 0;
    IS_SOLID[i] = b.solid ? 1 : 0;
    LIGHT_EMIT[i] = b.light;
    IS_LIQUID[i] = b.liquid ? 1 : 0;
    LIGHT_ABSORB[i] = b.opaque ? 15 : (b.absorb === null ? 0 : b.absorb);
  }
}
buildBlockTables();
