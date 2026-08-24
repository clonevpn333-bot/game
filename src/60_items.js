/* =========================================================================
 * ITEM REGISTRY — every block is also an item, plus tools, armour, food and
 * materials with the real durabilities, mining tiers and nutrition values.
 * ========================================================================= */

var ITEMS = {};
var ITEM_LIST = [];
function defItem(name, o) {
  o = o || {};
  var it = {
    name: name, disp: o.disp || titleCase(name),
    stack: o.stack === undefined ? 64 : o.stack,
    block: o.block || null,          // block name this places
    tool: o.tool || null,            // pickaxe/axe/shovel/hoe/sword/shears
    tier: o.tier || 0,               // mining tier
    durability: o.durability || 0,
    speed: o.speed || 1,             // mining speed multiplier
    dmg: o.dmg || 1,                 // attack damage
    armor: o.armor || 0,             // armour points
    toughness: o.toughness || 0,
    slot: o.slot || null,            // head/chest/legs/feet
    food: o.food || 0,               // hunger restored
    sat: o.sat || 0,                 // saturation
    eatTime: o.eatTime || 1.6,
    effect: o.effect || null,
    fuel: o.fuel || 0,               // seconds of furnace burn
    group: o.group || 'misc',
    icon: o.icon || null,            // custom sprite painter name
    color: o.color || null,
    color2: o.color2 || null,
    enchantable: o.enchantable || false,
    rarity: o.rarity || 0,
    use: o.use || null
  };
  ITEMS[name] = it;
  ITEM_LIST.push(it);
  return it;
}

/* ------------------------------------------ items for every block --- */
function buildBlockItems() {
  for (var i = 1; i < BLOCKS.length; i++) {
    var b = BLOCKS[i];
    if (b.noItem || b.variantOf) continue;
    if (ITEMS[b.name]) continue;
    defItem(b.name, {
      block: b.name, disp: b.disp, stack: b.stack,
      group: b.group, fuel: b.flam > 0 && b.group === 'wood' ? 15 : 0
    });
  }
  /* a handful of blocks burn well in a furnace */
  var fuels = { coal_block: 800, oak_planks: 15, crafting_table: 15, bookshelf: 15, ladder: 15, bamboo: 2.5, dried_kelp_block: 200 };
  for (var k in fuels) if (ITEMS[k]) ITEMS[k].fuel = fuels[k];
  for (var w = 0; w < WOODS.length; w++) {
    var nm = WOODS[w].n;
    ['planks', 'log', 'stem', 'wood', 'hyphae', 'slab', 'stairs', 'fence', 'fence_gate', 'door', 'trapdoor', 'sapling'].forEach(function (s) {
      var id = nm + '_' + s;
      if (ITEMS[id] && !WOODS[w].nether) ITEMS[id].fuel = s === 'slab' ? 7.5 : 15;
    });
  }
}

/* ------------------------------------------------------------ tools -- */
var TOOL_TIERS = [
  { n: 'wooden', tier: 1, dur: 59, speed: 2, dmg: 0, mat: 'oak_planks', col: '#b0904f' },
  { n: 'stone', tier: 2, dur: 131, speed: 4, dmg: 1, mat: 'cobblestone', col: '#8a8a8a' },
  { n: 'iron', tier: 3, dur: 250, speed: 6, dmg: 2, mat: 'iron_ingot', col: '#e0e0e0' },
  { n: 'golden', tier: 2, dur: 32, speed: 12, dmg: 0, mat: 'gold_ingot', col: '#f7d33f' },
  { n: 'diamond', tier: 4, dur: 1561, speed: 8, dmg: 3, mat: 'diamond', col: '#4fc4c0' },
  { n: 'netherite', tier: 5, dur: 2031, speed: 9, dmg: 4, mat: 'netherite_ingot', col: '#5a5055' }
];
var TOOL_KINDS = [
  { n: 'sword', dmg: 4, speed: 1.5, icon: 'sword' },
  { n: 'pickaxe', dmg: 2, icon: 'pickaxe' },
  { n: 'axe', dmg: 6, speed: 1, icon: 'axe' },
  { n: 'shovel', dmg: 2.5, icon: 'shovel' },
  { n: 'hoe', dmg: 1, icon: 'hoe' }
];
(function () {
  for (var t = 0; t < TOOL_TIERS.length; t++) {
    var T = TOOL_TIERS[t];
    for (var k = 0; k < TOOL_KINDS.length; k++) {
      var K = TOOL_KINDS[k];
      defItem(T.n + '_' + K.n, {
        stack: 1, tool: K.n, tier: T.tier, durability: T.dur * (K.n === 'sword' ? 1 : 1),
        speed: T.speed, dmg: K.dmg + T.dmg, group: 'tools', icon: K.icon, color: T.col,
        enchantable: true, fuel: T.n === 'wooden' ? 10 : 0
      });
    }
  }
})();
defItem('shears', { stack: 1, tool: 'shears', tier: 1, durability: 238, speed: 5, dmg: 1, group: 'tools', icon: 'shears', color: '#d0d0d0' });
defItem('flint_and_steel', { stack: 1, durability: 64, group: 'tools', icon: 'flint_steel', color: '#c8c8c8', use: 'ignite' });
defItem('bow', { stack: 1, durability: 384, group: 'combat', icon: 'bow', color: '#8a6a3a', enchantable: true, use: 'bow' });
defItem('crossbow', { stack: 1, durability: 465, group: 'combat', icon: 'crossbow', color: '#8a6a3a', enchantable: true, use: 'bow' });
defItem('arrow', { group: 'combat', icon: 'arrow', color: '#8a6a3a' });
defItem('spectral_arrow', { group: 'combat', icon: 'arrow', color: '#e8c04a' });
defItem('trident', { stack: 1, durability: 250, dmg: 9, group: 'combat', icon: 'trident', color: '#3f7a7a', enchantable: true });
defItem('shield', { stack: 1, durability: 336, group: 'combat', icon: 'shield', color: '#8a6a3a', enchantable: true, use: 'shield' });
defItem('fishing_rod', { stack: 1, durability: 64, group: 'tools', icon: 'rod', color: '#8a6a3a', use: 'fish' });
defItem('carrot_on_a_stick', { stack: 1, durability: 25, group: 'tools', icon: 'rod', color: '#e08b26' });
defItem('compass', { stack: 1, group: 'tools', icon: 'compass', color: '#c8c8c8' });
defItem('clock', { stack: 1, group: 'tools', icon: 'clock', color: '#f7d33f' });
defItem('spyglass', { stack: 1, group: 'tools', icon: 'spyglass', color: '#8a8a8a', use: 'zoom' });
defItem('brush', { stack: 1, durability: 64, group: 'tools', icon: 'brush', color: '#c8b090' });
defItem('map', { stack: 1, group: 'tools', icon: 'map', color: '#e0d8b8' });
defItem('name_tag', { stack: 1, group: 'tools', icon: 'tag', color: '#d8d0b8' });
defItem('lead', { group: 'tools', icon: 'lead', color: '#b8a878' });
defItem('saddle', { stack: 1, group: 'tools', icon: 'saddle', color: '#8a5a3a' });
defItem('elytra', { stack: 1, durability: 432, slot: 'chest', group: 'combat', icon: 'elytra', color: '#8a8298' });
defItem('bucket', { stack: 16, group: 'tools', icon: 'bucket', color: '#c8c8c8', use: 'bucket' });
defItem('water_bucket', { stack: 1, group: 'tools', icon: 'bucket', color: '#3b6ecc', use: 'place_water' });
defItem('lava_bucket', { stack: 1, group: 'tools', icon: 'bucket', color: '#d45a12', use: 'place_lava', fuel: 1000 });
defItem('milk_bucket', { stack: 1, group: 'food', icon: 'bucket', color: '#f0f0f0', food: 0, use: 'milk' });
defItem('powder_snow_bucket', { stack: 1, group: 'tools', icon: 'bucket', color: '#f0f8ff' });
defItem('cod_bucket', { stack: 1, group: 'tools', icon: 'bucket', color: '#8f6a3a' });
defItem('axolotl_bucket', { stack: 1, group: 'tools', icon: 'bucket', color: '#f5b8d0' });
defItem('glass_bottle', { stack: 16, group: 'brewing', icon: 'bottle', color: '#c8d8e0' });
defItem('firework_rocket', { group: 'misc', icon: 'rocket', color: '#d8d8d8' });

/* ------------------------------------------------------------ armour -- */
var ARMOR_MATS = [
  { n: 'leather', dur: [55, 80, 75, 65], prot: [1, 3, 2, 1], mat: 'leather', col: '#8a5a3a', tough: 0 },
  { n: 'chainmail', dur: [165, 240, 225, 195], prot: [2, 5, 4, 1], mat: 'iron_ingot', col: '#9a9a9a', tough: 0 },
  { n: 'iron', dur: [165, 240, 225, 195], prot: [2, 6, 5, 2], mat: 'iron_ingot', col: '#e0e0e0', tough: 0 },
  { n: 'golden', dur: [77, 112, 105, 91], prot: [2, 5, 3, 1], mat: 'gold_ingot', col: '#f7d33f', tough: 0 },
  { n: 'diamond', dur: [363, 528, 495, 429], prot: [3, 8, 6, 3], mat: 'diamond', col: '#4fc4c0', tough: 2 },
  { n: 'netherite', dur: [407, 592, 555, 481], prot: [3, 8, 6, 3], mat: 'netherite_ingot', col: '#5a5055', tough: 3 }
];
var ARMOR_SLOTS = ['helmet', 'chestplate', 'leggings', 'boots'];
var ARMOR_SLOTKEY = ['head', 'chest', 'legs', 'feet'];
(function () {
  for (var m = 0; m < ARMOR_MATS.length; m++) {
    var A = ARMOR_MATS[m];
    for (var s = 0; s < 4; s++) {
      defItem(A.n + '_' + ARMOR_SLOTS[s], {
        stack: 1, durability: A.dur[s], armor: A.prot[s], toughness: A.tough,
        slot: ARMOR_SLOTKEY[s], group: 'combat', icon: 'armor_' + ARMOR_SLOTS[s], color: A.col, enchantable: true
      });
    }
  }
})();
defItem('turtle_helmet', { stack: 1, durability: 275, armor: 2, slot: 'head', group: 'combat', icon: 'armor_helmet', color: '#5a8f4a', enchantable: true });

/* -------------------------------------------------------------- food -- */
var FOODS = [
  ['apple', 4, 2.4, '#c83a2a', 'apple'], ['golden_apple', 4, 9.6, '#f7d33f', 'apple'],
  ['enchanted_golden_apple', 4, 9.6, '#f7e07a', 'apple'],
  ['bread', 5, 6, '#c8a05a', 'bread'], ['cookie', 2, 0.4, '#a06a3a', 'cookie'],
  ['porkchop', 3, 1.8, '#e8a09a', 'meat'], ['cooked_porkchop', 8, 12.8, '#c07a48', 'meat'],
  ['beef', 3, 1.8, '#c04a4a', 'meat'], ['cooked_beef', 8, 12.8, '#8a5030', 'meat'],
  ['chicken', 2, 1.2, '#e0b090', 'meat'], ['cooked_chicken', 6, 7.2, '#c08a50', 'meat'],
  ['mutton', 2, 1.2, '#d06a6a', 'meat'], ['cooked_mutton', 6, 9.6, '#a05a3a', 'meat'],
  ['rabbit', 3, 1.8, '#d08080', 'meat'], ['cooked_rabbit', 5, 6, '#a86a48', 'meat'],
  ['cod', 2, 0.4, '#c8a45a', 'fish'], ['cooked_cod', 5, 6, '#c88a4a', 'fish'],
  ['salmon', 2, 0.4, '#d06a4a', 'fish'], ['cooked_salmon', 6, 9.6, '#b8603a', 'fish'],
  ['tropical_fish', 1, 0.2, '#e8a020', 'fish'], ['pufferfish', 1, 0.2, '#e8c020', 'fish'],
  ['carrot', 3, 3.6, '#e08b26', 'carrot'], ['golden_carrot', 6, 14.4, '#f7d33f', 'carrot'],
  ['potato', 1, 0.6, '#d8b060', 'potato'], ['baked_potato', 5, 6, '#c89040', 'potato'],
  ['poisonous_potato', 2, 1.2, '#8aa050', 'potato'],
  ['beetroot', 1, 1.2, '#a02a3a', 'beet'], ['beetroot_soup', 6, 7.2, '#8a2030', 'soup'],
  ['mushroom_stew', 6, 7.2, '#a08050', 'soup'], ['rabbit_stew', 10, 12, '#a06a4a', 'soup'],
  ['suspicious_stew', 6, 7.2, '#8a9a50', 'soup'],
  ['melon_slice', 2, 1.2, '#c83a3a', 'melon'], ['sweet_berries', 2, 0.4, '#b52a2a', 'berry'],
  ['glow_berries', 2, 0.4, '#f0a828', 'berry'], ['dried_kelp', 1, 0.6, '#3a4630', 'kelp'],
  ['pumpkin_pie', 8, 4.8, '#d8a040', 'pie'], ['honey_bottle', 6, 1.2, '#e09a20', 'bottle'],
  ['chorus_fruit', 4, 2.4, '#a97fa9', 'berry'], ['rotten_flesh', 4, 0.8, '#7a5a3a', 'meat'],
  ['spider_eye', 2, 3.2, '#8a2a2a', 'eye'], ['cake', 2, 0.4, '#e8e0d0', 'cake']
];
(function () {
  for (var i = 0; i < FOODS.length; i++) {
    var f = FOODS[i];
    if (ITEMS[f[0]]) { ITEMS[f[0]].food = f[1]; ITEMS[f[0]].sat = f[2]; continue; }
    defItem(f[0], { food: f[1], sat: f[2], group: 'food', color: f[3], icon: f[4],
      stack: (f[4] === 'soup' || f[0] === 'cake') ? 1 : 64,
      rarity: f[0].indexOf('golden') >= 0 ? 1 : 0 });
  }
  ITEMS.golden_apple.effect = 'regen';
  ITEMS.enchanted_golden_apple.effect = 'regen2';
  ITEMS.rotten_flesh.effect = 'hunger';
  ITEMS.poisonous_potato.effect = 'poison';
  ITEMS.pufferfish.effect = 'poison';
  ITEMS.chorus_fruit.effect = 'teleport';
})();

/* --------------------------------------------------------- materials -- */
var MATERIALS = [
  ['stick', '#8a6a3a', 'stick', 5], ['coal', '#151515', 'gem', 80], ['charcoal', '#2a2a2a', 'gem', 80],
  ['iron_ingot', '#dcdcdc', 'ingot', 0], ['gold_ingot', '#f7d33f', 'ingot', 0], ['copper_ingot', '#c06a43', 'ingot', 0],
  ['netherite_ingot', '#5a5055', 'ingot', 0], ['netherite_scrap', '#7a5a4a', 'nugget', 0],
  ['diamond', '#4fc4c0', 'gem', 0], ['emerald', '#26cf4f', 'gem', 0], ['lapis_lazuli', '#2350b5', 'gem', 0],
  ['redstone', '#c81b1b', 'dust', 0], ['quartz', '#e8e0d8', 'gem', 0], ['amethyst_shard', '#9b70d8', 'shard', 0],
  ['echo_shard', '#2ac0cc', 'shard', 0], ['raw_iron', '#d8af93', 'raw', 0], ['raw_gold', '#f6c542', 'raw', 0],
  ['raw_copper', '#d8703c', 'raw', 0], ['iron_nugget', '#dcdcdc', 'nugget', 0], ['gold_nugget', '#f7d33f', 'nugget', 0],
  ['flint', '#4a4a4a', 'shard', 0], ['feather', '#f0f0f0', 'feather', 0], ['leather', '#8a5a3a', 'leather', 0],
  ['rabbit_hide', '#c8a878', 'leather', 0], ['rabbit_foot', '#c8a878', 'nugget', 0],
  ['string', '#e8e8e8', 'string', 0], ['gunpowder', '#5a5a5a', 'dust', 0],
  ['blaze_rod', '#f0c040', 'rod', 60], ['blaze_powder', '#f0a020', 'dust', 0],
  ['ghast_tear', '#e8f0f0', 'tear', 0], ['magma_cream', '#e08030', 'ball', 0],
  ['ender_pearl', '#1f9a7a', 'ball', 0], ['ender_eye', '#3fa88a', 'eye', 0],
  ['nether_star', '#f0f0e0', 'star', 0], ['slime_ball', '#8ad07a', 'ball', 0],
  ['clay_ball', '#a3a8b5', 'ball', 0], ['brick', '#96604a', 'ingot', 0], ['nether_brick', '#2f181c', 'ingot', 0],
  ['paper', '#f0f0e8', 'paper', 0], ['book', '#a06a3a', 'book', 0], ['writable_book', '#c0a060', 'book', 0],
  ['enchanted_book', '#c8a860', 'book', 0], ['sugar', '#f0f0f0', 'dust', 0], ['wheat', '#d9c15a', 'wheat', 0],
  ['bone', '#e0dcc8', 'bone', 0], ['bone_meal', '#e0dcc8', 'dust', 0],
  ['ink_sac', '#1a1a20', 'ball', 0], ['glow_ink_sac', '#2ac0cc', 'ball', 0],
  ['honeycomb', '#e0a020', 'comb', 0], ['shulker_shell', '#986a98', 'shell', 0],
  ['phantom_membrane', '#4a5a6a', 'leather', 0], ['prismarine_shard', '#8fd8c8', 'shard', 0],
  ['prismarine_crystals', '#d0e8d8', 'shard', 0], ['scute', '#5a8f4a', 'shard', 0],
  ['heart_of_the_sea', '#4a8f8a', 'heart', 0], ['nautilus_shell', '#e0d0b0', 'shell', 0],
  ['totem_of_undying', '#e0c040', 'totem', 0], ['wither_skeleton_skull', '#2e2e2e', 'skull', 0],
  ['dragon_breath', '#c83ad8', 'bottle', 0], ['experience_bottle', '#7ad86a', 'bottle', 0],
  ['wheat_seeds', '#8aa050', 'seeds', 0], ['pumpkin_seeds', '#e0d8a0', 'seeds', 0],
  ['melon_seeds', '#d8d8a0', 'seeds', 0], ['beetroot_seeds', '#a05a5a', 'seeds', 0],
  ['torchflower_seeds', '#e8752c', 'seeds', 0], ['pitcher_pod', '#9a6fd0', 'seeds', 0],
  ['cocoa_beans', '#8f5a1c', 'ball', 0], ['nether_wart', '#a11d3a', 'wart', 0],
  ['blaze_rod_used', '#f0c040', 'rod', 0], ['sugar_cane_item', '#96c46b', 'cane', 0],
  ['music_disc_13', '#3a3a3a', 'disc', 0], ['music_disc_cat', '#3a5a3a', 'disc', 0],
  ['disc_fragment_5', '#8a8a8a', 'shard', 0], ['armadillo_scute', '#8a6a52', 'shard', 0]
];
(function () {
  for (var i = 0; i < MATERIALS.length; i++) {
    var m = MATERIALS[i];
    if (ITEMS[m[0]]) continue;
    defItem(m[0], { color: m[1], icon: m[2], fuel: m[3], group: 'materials',
      stack: m[2] === 'disc' || m[0] === 'totem_of_undying' ? 1 : 64,
      rarity: (m[0] === 'nether_star' || m[0] === 'totem_of_undying' || m[0] === 'heart_of_the_sea') ? 2 : 0 });
  }
})();
/* dyes */
(function () {
  for (var i = 0; i < DYE_COLORS.length; i++) {
    defItem(DYE_COLORS[i][0] + '_dye', { color: DYE_COLORS[i][1], icon: 'dust', group: 'materials' });
  }
})();

defItem('netherite_upgrade_smithing_template', { group: 'materials', icon: 'paper', color: '#c8c0b0', rarity: 1, disp: 'Netherite Upgrade' });
defItem('bowl', { group: 'materials', icon: 'soup', color: '#96543a', fuel: 5 });
defItem('popped_chorus_fruit', { group: 'materials', icon: 'ball', color: '#9a6a9a' });
defItem('glowstone_dust', { group: 'materials', icon: 'dust', color: '#f0d090' });
defItem('snowball', { stack: 16, group: 'materials', icon: 'ball', color: '#f0f8ff' });
defItem('end_crystal', { stack: 1, group: 'misc', icon: 'gem', color: '#d060e0', rarity: 1 });
defItem('minecart', { stack: 1, group: 'tools', icon: 'saddle', color: '#8a8a8a' });
defItem('glistering_melon_slice', { group: 'materials', icon: 'melon', color: '#f7d33f' });
defItem('fermented_spider_eye', { group: 'brewing', icon: 'eye', color: '#7a5a8a' });
defItem('sea_pickle', { group: 'nature', icon: 'ball', color: '#6a8f3a' });

/* ------------------------------------------------------------ potions -- */
var POTION_TYPES = [
  ['water', '#3f76e4', null, 0], ['awkward', '#5a5a8a', null, 0],
  ['healing', '#f82423', 'heal', 0], ['strong_healing', '#f82423', 'heal2', 0],
  ['regeneration', '#cd5cab', 'regen', 45], ['strength', '#932423', 'strength', 180],
  ['swiftness', '#7cafc6', 'speed', 180], ['leaping', '#22ff4c', 'jump', 180],
  ['fire_resistance', '#e49a3a', 'fireres', 180], ['water_breathing', '#2e5299', 'waterbreath', 180],
  ['night_vision', '#1f1fa1', 'nightvision', 180], ['invisibility', '#7f8392', 'invis', 180],
  ['poison', '#4e9331', 'poison', 45], ['harming', '#430a09', 'harm', 0],
  ['slowness', '#5a6c81', 'slow', 90], ['weakness', '#484d48', 'weakness', 90],
  ['turtle_master', '#4c6e85', 'turtle', 20], ['slow_falling', '#f7f8e0', 'slowfall', 90]
];
(function () {
  for (var i = 0; i < POTION_TYPES.length; i++) {
    var p = POTION_TYPES[i];
    defItem('potion_' + p[0], { stack: 1, group: 'brewing', icon: 'potion', color: p[1], disp: 'Potion of ' + titleCase(p[0]), potion: p[2], potionDur: p[3], use: 'drink' });
    defItem('splash_potion_' + p[0], { stack: 1, group: 'brewing', icon: 'potion', color: p[1], disp: 'Splash Potion of ' + titleCase(p[0]), potion: p[2], potionDur: p[3], splash: true });
  }
})();

/* Spawn eggs take their two colours from the mob's own model parts. */
function eggColorsFor(def) {
  if (!def || !def.model || !def.model.parts) return ['#9a9a9a', '#5a5a5a'];
  var seen = [];
  for (var i = 0; i < def.model.parts.length; i++) {
    var c = def.model.parts[i].col;
    if (typeof c === 'string' && c.charAt(0) === '#' && seen.indexOf(c) < 0) seen.push(c);
  }
  if (!seen.length) return ['#9a9a9a', '#5a5a5a'];
  return [seen[0], seen.length > 1 ? seen[1] : shade(seen[0], 0.62)];
}

/* --------------------------------------------------------- spawn eggs -- */
(function () {
  var eggs = ['cow', 'pig', 'sheep', 'chicken', 'wolf', 'creeper', 'zombie', 'skeleton', 'spider',
    'enderman', 'villager', 'slime', 'bee', 'fox', 'panda', 'axolotl', 'goat', 'llama', 'horse',
    'blaze', 'ghast', 'piglin', 'hoglin', 'witch', 'pillager', 'ravager', 'dolphin', 'turtle',
    'polar_bear', 'rabbit', 'cat', 'parrot', 'squid', 'phantom', 'guardian', 'shulker', 'allay',
    'frog', 'strider', 'warden', 'camel', 'zombified_piglin', 'wither_skeleton', 'magma_cube',
    'cave_spider', 'husk', 'stray', 'drowned', 'vindicator', 'evoker', 'vex', 'iron_golem'];
  for (var i = 0; i < eggs.length; i++) {
    var t = eggs[i];
    var def = MOBS[t];
    var cols = eggColorsFor(def);
    defItem(t + '_spawn_egg', {
      stack: 64, group: 'spawneggs', icon: 'egg', color: cols[0], color2: cols[1],
      disp: (def ? def.disp : titleCase(t)) + ' Spawn Egg', spawnMob: t
    });
  }
})();
defItem('egg', { stack: 16, group: 'materials', icon: 'egg', color: '#e8e0d0' });

buildBlockItems();

/* ------------------------------------------------------------ helpers -- */
function itemDef(name) { return ITEMS[name] || null; }
function isBlockItem(name) { var i = ITEMS[name]; return i && i.block && BID[i.block] !== undefined; }
function resolveDrop(blockDef) {
  var d = blockDef.drop;
  if (d === null) return null;
  if (d === blockDef.name) return blockDef.name;
  if (d && d.indexOf('_raw_or_item') > 0) return d.replace('_raw_or_item', '');
  return d;
}
/* what tier the block needs, and whether the tool is the right kind */
function canHarvest(blockDef, heldItem) {
  if (blockDef.tier === 0 || !blockDef.tool) return true;
  if (!heldItem) return false;
  var it = ITEMS[heldItem];
  if (!it || it.tool !== blockDef.tool) return false;
  return it.tier >= blockDef.tier;
}
function miningSpeed(blockDef, heldItem) {
  /* Only the right kind of tool speeds a block up; the penalty for lacking
     the tier lives in breakTimeFor, so it must not be applied twice here. */
  var base = 1;
  if (heldItem) {
    var it = ITEMS[heldItem];
    if (it && it.tool === blockDef.tool) base = it.speed;
    else if (it && it.tool === 'sword' && blockDef.name === 'cobweb') base = 15;
    else if (it && it.tool === 'shears' && (blockDef.name === 'cobweb' || /leaves|wool/.test(blockDef.name))) base = 5;
  }
  return base;
}
function breakTimeFor(blockDef, heldItem, onGround, inWater) {
  if (blockDef.hard < 0) return Infinity;
  if (blockDef.hard === 0) return 0.02;
  var speed = miningSpeed(blockDef, heldItem);
  var t = blockDef.hard * (canHarvest(blockDef, heldItem) ? 1.5 : 5) / speed;
  if (!onGround) t *= 5;
  if (inWater) t *= 5;
  return Math.max(0.03, t);
}
