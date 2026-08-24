/* =========================================================================
 * RECIPES — shaped and shapeless crafting, smelting, brewing, smithing and
 * villager trades.  Ingredient tags ("#planks") keep the table compact.
 * ========================================================================= */

var TAGS = {};
function tag(name, list) { TAGS[name] = list; return '#' + name; }
function tagMatch(t, item) {
  var l = TAGS[t];
  return l ? l.indexOf(item) >= 0 : false;
}
function ingMatch(ing, item) {
  if (!ing) return !item;
  if (!item) return false;
  if (ing.charAt(0) === '#') return tagMatch(ing.substr(1), item);
  return ing === item;
}

(function buildTags() {
  var planks = [], logs = [], saplings = [], slabs = [], woodSlabs = [], stems = [];
  for (var i = 0; i < WOODS.length; i++) {
    var w = WOODS[i], n = w.n;
    if (ITEMS[n + '_planks']) planks.push(n + '_planks');
    if (ITEMS[n + '_log']) logs.push(n + '_log');
    if (ITEMS[n + '_stem']) logs.push(n + '_stem');
    if (ITEMS[n + '_wood']) logs.push(n + '_wood');
    if (ITEMS[n + '_hyphae']) logs.push(n + '_hyphae');
    if (ITEMS[n + '_sapling']) saplings.push(n + '_sapling');
    if (ITEMS[n + '_slab']) woodSlabs.push(n + '_slab');
  }
  tag('planks', planks);
  tag('logs', logs);
  tag('saplings', saplings);
  tag('wooden_slabs', woodSlabs);
  var wool = [], carpet = [], dyes = [], terracotta = [], concrete = [], glass = [], glasspane = [];
  for (var d = 0; d < DYE_COLORS.length; d++) {
    var c = DYE_COLORS[d][0];
    wool.push(c + '_wool'); carpet.push(c + '_carpet'); dyes.push(c + '_dye');
    terracotta.push(c + '_terracotta'); concrete.push(c + '_concrete');
    glass.push(c + '_stained_glass'); glasspane.push(c + '_stained_glass_pane');
  }
  tag('wool', wool); tag('carpets', carpet); tag('dyes', dyes);
  tag('terracotta', terracotta); tag('concrete', concrete);
  tag('stained_glass', glass);
  tag('coals', ['coal', 'charcoal']);
  tag('stone_tool_materials', ['cobblestone', 'blackstone', 'cobbled_deepslate']);
  tag('stone_crafting', ['stone', 'cobblestone', 'granite', 'diorite', 'andesite', 'deepslate', 'cobbled_deepslate', 'blackstone', 'tuff', 'calcite']);
  tag('sand', ['sand', 'red_sand']);
  tag('fish', ['cod', 'salmon', 'tropical_fish', 'pufferfish']);
  tag('meat', ['beef', 'porkchop', 'chicken', 'mutton', 'rabbit']);
  tag('flowers', ['dandelion', 'poppy', 'blue_orchid', 'allium', 'azure_bluet', 'red_tulip', 'orange_tulip',
    'white_tulip', 'pink_tulip', 'oxeye_daisy', 'cornflower', 'lily_of_the_valley', 'torchflower']);
  tag('gold_ores', ['gold_ore', 'deepslate_gold_ore', 'nether_gold_ore', 'raw_gold']);
})();

/* ------------------------------------------------------------ storage -- */
var RECIPES = [];      /* crafting */
var SMELTING = {};     /* input -> {out, count, xp, time} */
var BREWING = [];      /* {base, ingredient, out} */
var SMITHING = [];     /* {template, base, addition, out} */
var STONECUT = {};     /* input -> [{out,count}] */

function shaped(out, count, rows, key, w) {
  RECIPES.push({ shaped: true, out: out, count: count || 1, rows: rows, key: key, width: w || 0 });
}
function shapeless(out, count, ings) {
  RECIPES.push({ shaped: false, out: out, count: count || 1, ings: ings });
}
function smelt(input, out, count, xp, time) {
  SMELTING[input] = { out: out, count: count || 1, xp: xp || 0.1, time: time || 10 };
}
function cut(input, list) { STONECUT[input] = list; }

/* ============================ CRAFTING ================================== */
/* --- wood families ------------------------------------------------------ */
(function () {
  for (var i = 0; i < WOODS.length; i++) {
    var w = WOODS[i], n = w.n;
    var plank = n + '_planks';
    if (!ITEMS[plank]) continue;
    var logName = ITEMS[n + '_log'] ? n + '_log' : (ITEMS[n + '_stem'] ? n + '_stem' : null);
    var woodName = ITEMS[n + '_wood'] ? n + '_wood' : (ITEMS[n + '_hyphae'] ? n + '_hyphae' : null);
    var strip = ITEMS['stripped_' + n + '_log'] ? 'stripped_' + n + '_log' : (ITEMS['stripped_' + n + '_stem'] ? 'stripped_' + n + '_stem' : null);
    if (logName) shapeless(plank, 4, [logName]);
    if (woodName) { shapeless(plank, 4, [woodName]); shaped(woodName, 3, ['XX', 'XX'], { X: logName }); }
    if (strip) shapeless(plank, 4, [strip]);
    if (ITEMS[n + '_slab']) shaped(n + '_slab', 6, ['XXX'], { X: plank });
    if (ITEMS[n + '_stairs']) shaped(n + '_stairs', 4, ['X  ', 'XX ', 'XXX'], { X: plank });
    if (ITEMS[n + '_fence']) shaped(n + '_fence', 3, ['XSX', 'XSX'], { X: plank, S: 'stick' });
    if (ITEMS[n + '_fence_gate']) shaped(n + '_fence_gate', 1, ['SXS', 'SXS'], { X: plank, S: 'stick' });
    if (ITEMS[n + '_door']) shaped(n + '_door', 3, ['XX', 'XX', 'XX'], { X: plank });
    if (ITEMS[n + '_trapdoor']) shaped(n + '_trapdoor', 2, ['XXX', 'XXX'], { X: plank });
    if (ITEMS[n + '_pressure_plate']) shaped(n + '_pressure_plate', 1, ['XX'], { X: plank });
    if (ITEMS[n + '_button']) shapeless(n + '_button', 1, [plank]);
    if (ITEMS[n + '_sign']) shaped(n + '_sign', 3, ['XXX', 'XXX', ' S '], { X: plank, S: 'stick' });
    if (ITEMS[n + '_boat']) shaped(n + '_boat', 1, ['X X', 'XXX'], { X: plank });
  }
})();
shaped('stick', 4, ['X', 'X'], { X: '#planks' });
shaped('crafting_table', 1, ['XX', 'XX'], { X: '#planks' });
shaped('chest', 1, ['XXX', 'X X', 'XXX'], { X: '#planks' });
shaped('trapped_chest', 1, ['XT'], { X: 'chest', T: 'tripwire_hook' });
shaped('barrel', 1, ['XSX', 'X X', 'XSX'], { X: '#planks', S: '#wooden_slabs' });
shaped('ladder', 3, ['S S', 'SSS', 'S S'], { S: 'stick' });
shaped('bowl', 4, ['X X', ' X '], { X: '#planks' });
shaped('bookshelf', 1, ['XXX', 'BBB', 'XXX'], { X: '#planks', B: 'book' });
shaped('lectern', 1, ['SSS', ' B ', ' S '], { S: '#wooden_slabs', B: 'bookshelf' });
shaped('crafting_table', 1, ['XX', 'XX'], { X: '#planks' });
shaped('note_block', 1, ['XXX', 'XRX', 'XXX'], { X: '#planks', R: 'redstone' });
shaped('jukebox', 1, ['XXX', 'XDX', 'XXX'], { X: '#planks', D: 'diamond' });
shaped('torch', 4, ['C', 'S'], { C: '#coals', S: 'stick' });
shaped('soul_torch', 4, ['C', 'S', 'D'], { C: '#coals', S: 'stick', D: 'soul_sand' });
shaped('lantern', 1, ['NNN', 'NTN', 'NNN'], { N: 'iron_nugget', T: 'torch' });
shaped('soul_lantern', 1, ['NNN', 'NTN', 'NNN'], { N: 'iron_nugget', T: 'soul_torch' });
shaped('furnace', 1, ['XXX', 'X X', 'XXX'], { X: '#stone_crafting' });
shaped('blast_furnace', 1, ['III', 'IFI', 'SSS'], { I: 'iron_ingot', F: 'furnace', S: 'smooth_stone' });
shaped('smoker', 1, [' L ', 'LFL', ' L '], { L: '#logs', F: 'furnace' });
shaped('campfire', 1, [' S ', 'SCS', 'LLL'], { S: 'stick', C: '#coals', L: '#logs' });
shaped('soul_campfire', 1, [' S ', 'SCS', 'LLL'], { S: 'stick', C: 'soul_sand', L: '#logs' });

/* --- tools and armour --------------------------------------------------- */
(function () {
  var mats = {
    wooden: '#planks', stone: '#stone_tool_materials', iron: 'iron_ingot',
    golden: 'gold_ingot', diamond: 'diamond', netherite: null
  };
  for (var m in mats) {
    var X = mats[m];
    if (!X) continue;
    shaped(m + '_sword', 1, ['X', 'X', 'S'], { X: X, S: 'stick' });
    shaped(m + '_pickaxe', 1, ['XXX', ' S ', ' S '], { X: X, S: 'stick' });
    shaped(m + '_axe', 1, ['XX', 'XS', ' S'], { X: X, S: 'stick' });
    shaped(m + '_shovel', 1, ['X', 'S', 'S'], { X: X, S: 'stick' });
    shaped(m + '_hoe', 1, ['XX', ' S', ' S'], { X: X, S: 'stick' });
  }
  var amats = { leather: 'leather', chainmail: 'iron_nugget', iron: 'iron_ingot', golden: 'gold_ingot', diamond: 'diamond' };
  for (var a in amats) {
    var Y = amats[a];
    shaped(a + '_helmet', 1, ['XXX', 'X X'], { X: Y });
    shaped(a + '_chestplate', 1, ['X X', 'XXX', 'XXX'], { X: Y });
    shaped(a + '_leggings', 1, ['XXX', 'X X', 'X X'], { X: Y });
    shaped(a + '_boots', 1, ['X X', 'X X'], { X: Y });
  }
  shaped('turtle_helmet', 1, ['XXX', 'X X'], { X: 'scute' });
  /* netherite gear comes from the smithing table, not the crafting grid */
  var kinds = ['sword', 'pickaxe', 'axe', 'shovel', 'hoe', 'helmet', 'chestplate', 'leggings', 'boots'];
  for (var k = 0; k < kinds.length; k++) {
    var d = (k < 5 ? 'diamond_' : 'diamond_') + kinds[k];
    if (ITEMS['netherite_' + kinds[k]])
      SMITHING.push({ template: 'netherite_upgrade_smithing_template', base: d, addition: 'netherite_ingot', out: 'netherite_' + kinds[k] });
  }
})();
shaped('shears', 1, [' I', 'I '], { I: 'iron_ingot' });
shaped('flint_and_steel', 1, ['I ', ' F'], { I: 'iron_ingot', F: 'flint' });
shaped('bow', 1, [' SX', 'S X', ' SX'], { S: 'stick', X: 'string' });
shaped('crossbow', 1, ['SIS', 'XTX', ' S '], { S: 'stick', I: 'iron_ingot', X: 'string', T: 'tripwire_hook' });
shaped('arrow', 4, ['F', 'S', 'E'], { F: 'flint', S: 'stick', E: 'feather' });
shaped('shield', 1, ['XIX', 'XXX', ' X '], { X: '#planks', I: 'iron_ingot' });
shaped('fishing_rod', 1, ['  S', ' SX', 'S X'], { S: 'stick', X: 'string' });
shaped('carrot_on_a_stick', 1, ['S ', ' C'], { S: 'fishing_rod', C: 'carrot' });
shaped('compass', 1, [' I ', 'IRI', ' I '], { I: 'iron_ingot', R: 'redstone' });
shaped('clock', 1, [' G ', 'GRG', ' G '], { G: 'gold_ingot', R: 'redstone' });
shaped('spyglass', 1, ['A', 'C', 'C'], { A: 'amethyst_shard', C: 'copper_ingot' });
shaped('brush', 1, ['F', 'C', 'S'], { F: 'feather', C: 'copper_ingot', S: 'stick' });
shaped('bucket', 1, ['I I', ' I '], { I: 'iron_ingot' });
shaped('glass_bottle', 3, ['G G', ' G '], { G: 'glass' });
shaped('lead', 2, ['SS ', 'SB ', '  S'], { S: 'string', B: 'slime_ball' });
shaped('name_tag', 1, ['P', 'S'], { P: 'paper', S: 'string' });

/* --- stone and building ------------------------------------------------- */
(function () {
  var fams = [
    ['stone', 'stone'], ['cobblestone', 'cobblestone'], ['stone_bricks', 'stone_bricks'],
    ['mossy_cobblestone', 'mossy_cobblestone'], ['mossy_stone_bricks', 'mossy_stone_bricks'],
    ['granite', 'granite'], ['polished_granite', 'polished_granite'], ['diorite', 'diorite'],
    ['polished_diorite', 'polished_diorite'], ['andesite', 'andesite'], ['polished_andesite', 'polished_andesite'],
    ['deepslate', 'cobbled_deepslate'], ['polished_deepslate', 'polished_deepslate'],
    ['deepslate_bricks', 'deepslate_bricks'], ['deepslate_tiles', 'deepslate_tiles'],
    ['tuff', 'tuff'], ['bricks', 'bricks'], ['sandstone', 'sandstone'], ['red_sandstone', 'red_sandstone'],
    ['smooth_sandstone', 'smooth_sandstone'], ['prismarine', 'prismarine'], ['prismarine_bricks', 'prismarine_bricks'],
    ['dark_prismarine', 'dark_prismarine'], ['nether_bricks', 'nether_bricks'], ['red_nether_bricks', 'red_nether_bricks'],
    ['blackstone', 'blackstone'], ['polished_blackstone', 'polished_blackstone'],
    ['polished_blackstone_bricks', 'polished_blackstone_bricks'], ['end_stone_bricks', 'end_stone_bricks'],
    ['purpur_block', 'purpur_block'], ['quartz_block', 'quartz_block'], ['smooth_quartz', 'smooth_quartz'],
    ['mud_bricks', 'mud_bricks'], ['cut_copper', 'cut_copper'], ['exposed_cut_copper', 'exposed_cut_copper'],
    ['weathered_cut_copper', 'weathered_cut_copper'], ['oxidized_cut_copper', 'oxidized_cut_copper']
  ];
  for (var i = 0; i < fams.length; i++) {
    var base = fams[i][1], name = fams[i][0];
    if (!ITEMS[base]) continue;
    var cuts = [];
    if (ITEMS[name + '_slab']) { shaped(name + '_slab', 6, ['XXX'], { X: base }); cuts.push({ out: name + '_slab', count: 2 }); }
    if (ITEMS[name + '_stairs']) { shaped(name + '_stairs', 4, ['X  ', 'XX ', 'XXX'], { X: base }); cuts.push({ out: name + '_stairs', count: 1 }); }
    if (ITEMS[name + '_wall']) { shaped(name + '_wall', 6, ['XXX', 'XXX'], { X: base }); cuts.push({ out: name + '_wall', count: 1 }); }
    if (cuts.length) cut(base, cuts);
  }
})();
shaped('stone_bricks', 4, ['XX', 'XX'], { X: 'stone' });
shaped('polished_granite', 4, ['XX', 'XX'], { X: 'granite' });
shaped('polished_diorite', 4, ['XX', 'XX'], { X: 'diorite' });
shaped('polished_andesite', 4, ['XX', 'XX'], { X: 'andesite' });
shaped('polished_deepslate', 4, ['XX', 'XX'], { X: 'cobbled_deepslate' });
shaped('deepslate_bricks', 4, ['XX', 'XX'], { X: 'polished_deepslate' });
shaped('deepslate_tiles', 4, ['XX', 'XX'], { X: 'deepslate_bricks' });
shaped('polished_blackstone', 4, ['XX', 'XX'], { X: 'blackstone' });
shaped('polished_blackstone_bricks', 4, ['XX', 'XX'], { X: 'polished_blackstone' });
shaped('sandstone', 1, ['XX', 'XX'], { X: 'sand' });
shaped('red_sandstone', 1, ['XX', 'XX'], { X: 'red_sand' });
shaped('bricks', 1, ['XX', 'XX'], { X: 'brick' });
shaped('nether_bricks', 1, ['XX', 'XX'], { X: 'nether_brick' });
shaped('quartz_block', 1, ['XX', 'XX'], { X: 'quartz' });
shaped('end_stone_bricks', 4, ['XX', 'XX'], { X: 'end_stone' });
shaped('purpur_block', 4, ['XX', 'XX'], { X: 'popped_chorus_fruit' });
shaped('mud_bricks', 4, ['XX', 'XX'], { X: 'packed_mud' });
shaped('prismarine', 1, ['XX', 'XX'], { X: 'prismarine_shard' });
shaped('prismarine_bricks', 1, ['XXX', 'XXX', 'XXX'], { X: 'prismarine_shard' });
shapeless('packed_mud', 1, ['mud', 'wheat']);
shaped('glowstone', 1, ['XX', 'XX'], { X: 'glowstone_dust' });
shaped('sea_lantern', 1, ['SPS', 'PPP', 'SPS'], { S: 'prismarine_shard', P: 'prismarine_crystals' });
shaped('magma_block', 1, ['XX', 'XX'], { X: 'magma_cream' });
shaped('slime_block', 1, ['XXX', 'XXX', 'XXX'], { X: 'slime_ball' });
shaped('honey_block', 1, ['XX', 'XX'], { X: 'honey_bottle' });
shaped('honeycomb_block', 1, ['XX', 'XX'], { X: 'honeycomb' });
shaped('hay_block', 1, ['XXX', 'XXX', 'XXX'], { X: 'wheat' });
shaped('bone_block', 1, ['XXX', 'XXX', 'XXX'], { X: 'bone_meal' });
shaped('dried_kelp_block', 1, ['XXX', 'XXX', 'XXX'], { X: 'dried_kelp' });
shaped('nether_wart_block', 1, ['XXX', 'XXX', 'XXX'], { X: 'nether_wart' });
shaped('clay', 1, ['XX', 'XX'], { X: 'clay_ball' });
shaped('snow_block', 1, ['XX', 'XX'], { X: 'snowball' });
shaped('snow', 6, ['XXX'], { X: 'snow_block' });
shaped('glass_pane', 16, ['XXX', 'XXX'], { X: 'glass' });
shaped('iron_bars', 16, ['XXX', 'XXX'], { X: 'iron_ingot' });
shaped('chain', 1, ['N', 'I', 'N'], { N: 'iron_nugget', I: 'iron_ingot' });
shaped('scaffolding', 6, ['BSB', 'B B', 'B B'], { B: 'bamboo', S: 'string' });
shaped('flower_pot', 1, ['B B', ' B '], { B: 'brick' });
shaped('paper', 3, ['XXX'], { X: 'sugar_cane' });
shaped('book', 1, ['PP', 'PL'], { P: 'paper', L: 'leather' });
shapeless('book', 1, ['paper', 'paper', 'paper', 'leather']);
shaped('anvil', 1, ['BBB', ' I ', 'III'], { B: 'iron_block', I: 'iron_ingot' });
shaped('enchanting_table', 1, [' B ', 'DOD', 'OOO'], { B: 'book', D: 'diamond', O: 'obsidian' });
shaped('brewing_stand', 1, [' R ', 'CCC'], { R: 'blaze_rod', C: '#stone_crafting' });
shaped('cauldron', 1, ['I I', 'I I', 'III'], { I: 'iron_ingot' });
shaped('hopper', 1, ['I I', 'ICI', ' I '], { I: 'iron_ingot', C: 'chest' });
shaped('grindstone', 1, ['SPS', 'X X'], { S: 'stick', P: 'stone_slab', X: '#planks' });
shaped('stonecutter', 1, [' I ', 'SSS'], { I: 'iron_ingot', S: 'stone' });
shaped('smithing_table', 1, ['II', 'XX', 'XX'], { I: 'iron_ingot', X: '#planks' });
shaped('cartography_table', 1, ['PP', 'XX', 'XX'], { P: 'paper', X: '#planks' });
shaped('fletching_table', 1, ['FF', 'XX', 'XX'], { F: 'flint', X: '#planks' });
shaped('loom', 1, ['SS', 'XX'], { S: 'string', X: '#planks' });
shaped('composter', 1, ['X X', 'X X', 'XXX'], { X: '#wooden_slabs' });
shaped('beacon', 1, ['GGG', 'GNG', 'OOO'], { G: 'glass', N: 'nether_star', O: 'obsidian' });
shaped('conduit', 1, ['SSS', 'SHS', 'SSS'], { S: 'nautilus_shell', H: 'heart_of_the_sea' });
shaped('respawn_anchor', 1, ['CCC', 'GGG', 'CCC'], { C: 'crying_obsidian', G: 'glowstone' });
shaped('lodestone', 1, ['SSS', 'SNS', 'SSS'], { S: 'chiseled_stone_bricks', N: 'netherite_ingot' });
shaped('end_crystal', 1, ['GGG', 'GEG', 'GTG'], { G: 'glass', E: 'ender_eye', T: 'ghast_tear' });
shaped('tnt', 1, ['GSG', 'SGS', 'GSG'], { G: 'gunpowder', S: '#sand' });
shaped('target', 1, [' R ', 'RHR', ' R '], { R: 'redstone', H: 'hay_block' });

/* --- storage-block compaction ------------------------------------------- */
(function () {
  var nine = [['coal', 'coal_block'], ['iron_ingot', 'iron_block'], ['gold_ingot', 'gold_block'],
  ['diamond', 'diamond_block'], ['emerald', 'emerald_block'], ['lapis_lazuli', 'lapis_block'],
  ['redstone', 'redstone_block'], ['copper_ingot', 'copper_block'], ['netherite_ingot', 'netherite_block'],
  ['raw_iron', 'raw_iron_block'], ['raw_gold', 'raw_gold_block'], ['raw_copper', 'raw_copper_block'],
  ['amethyst_shard', 'amethyst_block'], ['slime_ball', 'slime_block'], ['wheat', 'hay_block'],
  ['quartz', 'quartz_block'], ['iron_nugget', 'iron_ingot'], ['gold_nugget', 'gold_ingot']];
  for (var i = 0; i < nine.length; i++) {
    var a = nine[i][0], b = nine[i][1];
    if (!ITEMS[a] || !ITEMS[b]) continue;
    shaped(b, 1, ['XXX', 'XXX', 'XXX'], { X: a });
    shapeless(a, 9, [b]);
  }
  shapeless('iron_nugget', 9, ['iron_ingot']);
  shapeless('gold_nugget', 9, ['gold_ingot']);
})();

/* --- dyed families ------------------------------------------------------ */
(function () {
  for (var d = 0; d < DYE_COLORS.length; d++) {
    var c = DYE_COLORS[d][0], dye = c + '_dye';
    if (ITEMS[c + '_wool']) {
      shapeless(c + '_wool', 1, ['white_wool', dye]);
      shaped(c + '_carpet', 3, ['XX'], { X: c + '_wool' });
      shaped(c + '_bed', 1, ['WWW', 'PPP'], { W: c + '_wool', P: '#planks' });
      shaped(c + '_banner', 1, ['WWW', 'WWW', ' S '], { W: c + '_wool', S: 'stick' });
    }
    if (ITEMS[c + '_stained_glass']) {
      shaped(c + '_stained_glass', 8, ['GGG', 'GDG', 'GGG'], { G: 'glass', D: dye });
      shaped(c + '_stained_glass_pane', 16, ['XXX', 'XXX'], { X: c + '_stained_glass' });
    }
    if (ITEMS[c + '_terracotta']) shaped(c + '_terracotta', 8, ['TTT', 'TDT', 'TTT'], { T: 'terracotta', D: dye });
    if (ITEMS[c + '_concrete_powder']) shapeless(c + '_concrete_powder', 8, ['sand', 'sand', 'sand', 'sand', 'gravel', 'gravel', 'gravel', 'gravel', dye]);
    if (ITEMS[c + '_candle'] && c !== 'white') shapeless(c + '_candle', 1, ['white_candle', dye]);
    if (ITEMS[c + '_shulker_box']) shaped(c + '_shulker_box', 1, ['S', 'C', 'S'], { S: 'shulker_shell', C: 'chest' });
  }
  shaped('white_wool', 1, ['SS', 'SS'], { S: 'string' });
  shaped('white_candle', 1, ['S', 'H'], { S: 'string', H: 'honeycomb' });
  /* dye sources */
  var src = {
    white_dye: 'bone_meal', black_dye: 'ink_sac', blue_dye: 'lapis_lazuli', brown_dye: 'cocoa_beans',
    red_dye: 'poppy', yellow_dye: 'dandelion', green_dye: null, orange_dye: 'orange_tulip',
    light_blue_dye: 'blue_orchid', magenta_dye: 'allium', pink_dye: 'pink_tulip',
    light_gray_dye: 'oxeye_daisy', cyan_dye: null, purple_dye: null, gray_dye: null, lime_dye: null
  };
  for (var k in src) if (src[k] && ITEMS[src[k]]) shapeless(k, 1, [src[k]]);
  shapeless('cyan_dye', 2, ['blue_dye', 'green_dye']);
  shapeless('purple_dye', 2, ['blue_dye', 'red_dye']);
  shapeless('magenta_dye', 2, ['purple_dye', 'pink_dye']);
  shapeless('gray_dye', 2, ['black_dye', 'white_dye']);
  shapeless('light_gray_dye', 2, ['gray_dye', 'white_dye']);
  shapeless('lime_dye', 2, ['green_dye', 'white_dye']);
  shapeless('orange_dye', 2, ['red_dye', 'yellow_dye']);
  shapeless('pink_dye', 2, ['red_dye', 'white_dye']);
  shapeless('light_blue_dye', 2, ['blue_dye', 'white_dye']);
  shapeless('bone_meal', 3, ['bone']);
})();

/* --- redstone ----------------------------------------------------------- */
shaped('redstone_torch', 1, ['R', 'S'], { R: 'redstone', S: 'stick' });
shaped('repeater', 1, ['TRT', 'SSS'], { T: 'redstone_torch', R: 'redstone', S: 'stone' });
shaped('comparator', 1, [' T ', 'TQT', 'SSS'], { T: 'redstone_torch', Q: 'quartz', S: 'stone' });
shaped('piston', 1, ['XXX', 'CIC', 'CRC'], { X: '#planks', C: 'cobblestone', I: 'iron_ingot', R: 'redstone' });
shaped('sticky_piston', 1, ['S', 'P'], { S: 'slime_ball', P: 'piston' });
shaped('observer', 1, ['CCC', 'RRQ', 'CCC'], { C: 'cobblestone', R: 'redstone', Q: 'quartz' });
shaped('dispenser', 1, ['CCC', 'CBC', 'CRC'], { C: 'cobblestone', B: 'bow', R: 'redstone' });
shaped('dropper', 1, ['CCC', 'C C', 'CRC'], { C: 'cobblestone', R: 'redstone' });
shaped('lever', 1, ['S', 'C'], { S: 'stick', C: 'cobblestone' });
shaped('stone_button', 1, ['S'], { S: 'stone' });
shaped('stone_pressure_plate', 1, ['SS'], { S: 'stone' });
shaped('light_weighted_pressure_plate', 1, ['GG'], { G: 'gold_ingot' });
shaped('heavy_weighted_pressure_plate', 1, ['II'], { I: 'iron_ingot' });
shaped('tripwire_hook', 2, ['I', 'S', 'X'], { I: 'iron_ingot', S: 'stick', X: '#planks' });
shaped('daylight_detector', 1, ['GGG', 'QQQ', 'SSS'], { G: 'glass', Q: 'quartz', S: '#wooden_slabs' });
shaped('redstone_lamp', 1, [' R ', 'RGR', ' R '], { R: 'redstone', G: 'glowstone' });
shaped('rail', 16, ['I I', 'ISI', 'I I'], { I: 'iron_ingot', S: 'stick' });
shaped('powered_rail', 6, ['G G', 'GSG', 'GRG'], { G: 'gold_ingot', S: 'stick', R: 'redstone' });
shaped('detector_rail', 6, ['I I', 'IPI', 'IRI'], { I: 'iron_ingot', P: 'stone_pressure_plate', R: 'redstone' });
shaped('activator_rail', 6, ['I I', 'ITI', 'IRI'], { I: 'iron_ingot', T: 'redstone_torch', R: 'redstone' });
shaped('minecart', 1, ['I I', 'III'], { I: 'iron_ingot' });
shaped('iron_door', 3, ['II', 'II', 'II'], { I: 'iron_ingot' });
shaped('iron_trapdoor', 1, ['II', 'II'], { I: 'iron_ingot' });

/* --- food --------------------------------------------------------------- */
shaped('bread', 1, ['WWW'], { W: 'wheat' });
shaped('cookie', 8, ['WCW'], { W: 'wheat', C: 'cocoa_beans' });
shaped('cake', 1, ['MMM', 'SES', 'WWW'], { M: 'milk_bucket', S: 'sugar', E: 'egg', W: 'wheat' });
shaped('pumpkin_pie', 1, ['PSE'], { P: 'pumpkin', S: 'sugar', E: 'egg' });
shapeless('mushroom_stew', 1, ['brown_mushroom', 'red_mushroom', 'bowl']);
shapeless('beetroot_soup', 1, ['beetroot', 'beetroot', 'beetroot', 'beetroot', 'beetroot', 'beetroot', 'bowl']);
shapeless('rabbit_stew', 1, ['cooked_rabbit', 'baked_potato', 'carrot', 'brown_mushroom', 'bowl']);
shapeless('suspicious_stew', 1, ['brown_mushroom', 'red_mushroom', 'bowl', '#flowers']);
shapeless('golden_apple', 1, ['apple', 'gold_ingot', 'gold_ingot', 'gold_ingot', 'gold_ingot', 'gold_ingot', 'gold_ingot', 'gold_ingot', 'gold_ingot']);
shaped('golden_apple', 1, ['GGG', 'GAG', 'GGG'], { G: 'gold_ingot', A: 'apple' });
shaped('golden_carrot', 1, ['NNN', 'NCN', 'NNN'], { N: 'gold_nugget', C: 'carrot' });
shaped('glistering_melon_slice', 1, ['NNN', 'NMN', 'NNN'], { N: 'gold_nugget', M: 'melon_slice' });
shaped('sugar', 1, ['C'], { C: 'sugar_cane' });
shaped('melon', 1, ['MMM', 'MMM', 'MMM'], { M: 'melon_slice' });
shapeless('melon_seeds', 1, ['melon_slice']);
shapeless('pumpkin_seeds', 4, ['pumpkin']);
shaped('jack_o_lantern', 1, ['P', 'T'], { P: 'carved_pumpkin', T: 'torch' });
shaped('carved_pumpkin', 1, ['P'], { P: 'pumpkin' });

/* ============================ SMELTING ================================== */
(function () {
  smelt('raw_iron', 'iron_ingot', 1, 0.7, 10); smelt('iron_ore', 'iron_ingot', 1, 0.7, 10);
  smelt('deepslate_iron_ore', 'iron_ingot', 1, 0.7, 10);
  smelt('raw_gold', 'gold_ingot', 1, 1.0, 10); smelt('gold_ore', 'gold_ingot', 1, 1.0, 10);
  smelt('deepslate_gold_ore', 'gold_ingot', 1, 1.0, 10); smelt('nether_gold_ore', 'gold_ingot', 1, 1.0, 10);
  smelt('raw_copper', 'copper_ingot', 1, 0.7, 10); smelt('copper_ore', 'copper_ingot', 1, 0.7, 10);
  smelt('deepslate_copper_ore', 'copper_ingot', 1, 0.7, 10);
  smelt('ancient_debris', 'netherite_scrap', 1, 2.0, 10);
  smelt('sand', 'glass', 1, 0.1, 10); smelt('red_sand', 'glass', 1, 0.1, 10);
  smelt('cobblestone', 'stone', 1, 0.1, 10); smelt('stone', 'smooth_stone', 1, 0.1, 10);
  smelt('cobbled_deepslate', 'deepslate', 1, 0.1, 10);
  smelt('sandstone', 'smooth_sandstone', 1, 0.1, 10); smelt('red_sandstone', 'smooth_red_sandstone', 1, 0.1, 10);
  smelt('quartz_block', 'smooth_quartz', 1, 0.1, 10);
  smelt('stone_bricks', 'cracked_stone_bricks', 1, 0.1, 10);
  smelt('deepslate_bricks', 'cracked_deepslate_bricks', 1, 0.1, 10);
  smelt('nether_bricks', 'cracked_nether_bricks', 1, 0.1, 10);
  smelt('polished_blackstone_bricks', 'cracked_polished_blackstone_bricks', 1, 0.1, 10);
  smelt('clay_ball', 'brick', 1, 0.3, 10); smelt('clay', 'terracotta', 1, 0.35, 10);
  smelt('netherrack', 'nether_brick', 1, 0.1, 10);
  smelt('cactus', 'green_dye', 1, 1.0, 10);
  smelt('sea_pickle', 'lime_dye', 1, 0.1, 10);
  smelt('wet_sponge', 'sponge', 1, 0.15, 10);
  smelt('kelp', 'dried_kelp', 1, 0.1, 10);
  smelt('chorus_fruit', 'popped_chorus_fruit', 1, 0.1, 10);
  smelt('porkchop', 'cooked_porkchop', 1, 0.35, 10);
  smelt('beef', 'cooked_beef', 1, 0.35, 10);
  smelt('chicken', 'cooked_chicken', 1, 0.35, 10);
  smelt('mutton', 'cooked_mutton', 1, 0.35, 10);
  smelt('rabbit', 'cooked_rabbit', 1, 0.35, 10);
  smelt('cod', 'cooked_cod', 1, 0.35, 10);
  smelt('salmon', 'cooked_salmon', 1, 0.35, 10);
  smelt('potato', 'baked_potato', 1, 0.35, 10);
  for (var i = 0; i < WOODS.length; i++) {
    var n = WOODS[i].n;
    if (WOODS[i].nether) continue;
    if (ITEMS[n + '_log']) smelt(n + '_log', 'charcoal', 1, 0.15, 10);
    if (ITEMS[n + '_wood']) smelt(n + '_wood', 'charcoal', 1, 0.15, 10);
  }
})();

/* ============================ BREWING =================================== */
(function () {
  function brew(base, ing, out) { BREWING.push({ base: base, ingredient: ing, out: out }); }
  brew('potion_water', 'nether_wart', 'potion_awkward');
  brew('potion_awkward', 'glistering_melon_slice', 'potion_healing');
  brew('potion_awkward', 'ghast_tear', 'potion_regeneration');
  brew('potion_awkward', 'blaze_powder', 'potion_strength');
  brew('potion_awkward', 'sugar', 'potion_swiftness');
  brew('potion_awkward', 'rabbit_foot', 'potion_leaping');
  brew('potion_awkward', 'magma_cream', 'potion_fire_resistance');
  brew('potion_awkward', 'pufferfish', 'potion_water_breathing');
  brew('potion_awkward', 'golden_carrot', 'potion_night_vision');
  brew('potion_awkward', 'spider_eye', 'potion_poison');
  brew('potion_awkward', 'turtle_helmet', 'potion_turtle_master');
  brew('potion_awkward', 'phantom_membrane', 'potion_slow_falling');
  brew('potion_night_vision', 'fermented_spider_eye', 'potion_invisibility');
  brew('potion_healing', 'fermented_spider_eye', 'potion_harming');
  brew('potion_poison', 'fermented_spider_eye', 'potion_harming');
  brew('potion_swiftness', 'fermented_spider_eye', 'potion_slowness');
  brew('potion_leaping', 'fermented_spider_eye', 'potion_slowness');
  brew('potion_healing', 'glowstone_dust', 'potion_strong_healing');
  var all = POTION_TYPES;
  for (var i = 0; i < all.length; i++) brew('potion_' + all[i][0], 'gunpowder', 'splash_potion_' + all[i][0]);
  shapeless('fermented_spider_eye', 1, ['spider_eye', 'brown_mushroom', 'sugar']);
})();

/* ============================ ENCHANTING ================================ */
var ENCHANTS = [
  { id: 'protection', disp: 'Protection', max: 4, applies: ['head', 'chest', 'legs', 'feet'] },
  { id: 'fire_protection', disp: 'Fire Protection', max: 4, applies: ['head', 'chest', 'legs', 'feet'] },
  { id: 'blast_protection', disp: 'Blast Protection', max: 4, applies: ['head', 'chest', 'legs', 'feet'] },
  { id: 'projectile_protection', disp: 'Projectile Protection', max: 4, applies: ['head', 'chest', 'legs', 'feet'] },
  { id: 'feather_falling', disp: 'Feather Falling', max: 4, applies: ['feet'] },
  { id: 'respiration', disp: 'Respiration', max: 3, applies: ['head'] },
  { id: 'aqua_affinity', disp: 'Aqua Affinity', max: 1, applies: ['head'] },
  { id: 'thorns', disp: 'Thorns', max: 3, applies: ['chest'] },
  { id: 'depth_strider', disp: 'Depth Strider', max: 3, applies: ['feet'] },
  { id: 'sharpness', disp: 'Sharpness', max: 5, applies: ['sword', 'axe'] },
  { id: 'smite', disp: 'Smite', max: 5, applies: ['sword', 'axe'] },
  { id: 'bane_of_arthropods', disp: 'Bane of Arthropods', max: 5, applies: ['sword', 'axe'] },
  { id: 'knockback', disp: 'Knockback', max: 2, applies: ['sword'] },
  { id: 'fire_aspect', disp: 'Fire Aspect', max: 2, applies: ['sword'] },
  { id: 'looting', disp: 'Looting', max: 3, applies: ['sword'] },
  { id: 'sweeping_edge', disp: 'Sweeping Edge', max: 3, applies: ['sword'] },
  { id: 'efficiency', disp: 'Efficiency', max: 5, applies: ['pickaxe', 'axe', 'shovel', 'hoe', 'shears'] },
  { id: 'silk_touch', disp: 'Silk Touch', max: 1, applies: ['pickaxe', 'axe', 'shovel', 'hoe'] },
  { id: 'unbreaking', disp: 'Unbreaking', max: 3, applies: ['*'] },
  { id: 'fortune', disp: 'Fortune', max: 3, applies: ['pickaxe', 'axe', 'shovel', 'hoe'] },
  { id: 'power', disp: 'Power', max: 5, applies: ['bow'] },
  { id: 'punch', disp: 'Punch', max: 2, applies: ['bow'] },
  { id: 'flame', disp: 'Flame', max: 1, applies: ['bow'] },
  { id: 'infinity', disp: 'Infinity', max: 1, applies: ['bow'] },
  { id: 'luck_of_the_sea', disp: 'Luck of the Sea', max: 3, applies: ['fishing_rod'] },
  { id: 'lure', disp: 'Lure', max: 3, applies: ['fishing_rod'] },
  { id: 'mending', disp: 'Mending', max: 1, applies: ['*'] }
];
var ENCH_BY_ID = {};
for (var _e = 0; _e < ENCHANTS.length; _e++) ENCH_BY_ID[ENCHANTS[_e].id] = ENCHANTS[_e];
var ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];

function enchantsFor(itemName) {
  var it = ITEMS[itemName];
  if (!it) return [];
  var out = [];
  for (var i = 0; i < ENCHANTS.length; i++) {
    var e = ENCHANTS[i];
    for (var j = 0; j < e.applies.length; j++) {
      var a = e.applies[j];
      if (a === '*' && (it.tool || it.slot || it.durability)) { out.push(e); break; }
      if (a === it.tool) { out.push(e); break; }
      if (a === it.slot) { out.push(e); break; }
      if (a === itemName) { out.push(e); break; }
    }
  }
  return out;
}
/* three offers, exactly like the table: cheap/medium/expensive by shelf count */
function rollEnchantOffers(itemName, shelves, seedVal) {
  var pool = enchantsFor(itemName);
  if (!pool.length) return null;
  var rng = makeRNG(seedVal >>> 0);
  var base = 1 + Math.floor(rng() * 8) + Math.floor(shelves * 0.75) + Math.floor(rng() * (shelves + 1));
  var offers = [];
  for (var slot = 0; slot < 3; slot++) {
    var lvl = Math.max(1, Math.floor(base * (slot + 1) / 3));
    var n = 1 + (lvl > 20 ? 1 : 0) + (lvl > 28 && rng() < 0.5 ? 1 : 0);
    var chosen = [], used = {};
    for (var k = 0; k < n; k++) {
      var pickE = pool[Math.floor(rng() * pool.length)];
      if (used[pickE.id]) continue;
      used[pickE.id] = 1;
      var elvl = clamp(1 + Math.floor(rng() * pickE.max * (lvl / 30) + 0.5), 1, pickE.max);
      chosen.push({ id: pickE.id, lvl: elvl });
    }
    if (!chosen.length) chosen.push({ id: pool[0].id, lvl: 1 });
    offers.push({ cost: Math.max(1, Math.min(30, lvl)), levelReq: slot + 1, ench: chosen });
  }
  return offers;
}

/* ============================ TRADING =================================== */
var VILLAGER_PROFESSIONS = [
  { id: 'farmer', disp: 'Farmer', block: 'composter', trades: [
    { give: [['wheat', 20]], get: ['emerald', 1] }, { give: [['potato', 26]], get: ['emerald', 1] },
    { give: [['carrot', 22]], get: ['emerald', 1] }, { give: [['emerald', 1]], get: ['bread', 6] },
    { give: [['emerald', 1]], get: ['pumpkin_pie', 4] }, { give: [['emerald', 3]], get: ['golden_carrot', 3] },
    { give: [['emerald', 3]], get: ['cake', 1] }] },
  { id: 'librarian', disp: 'Librarian', block: 'lectern', trades: [
    { give: [['paper', 24]], get: ['emerald', 1] }, { give: [['book', 4]], get: ['emerald', 1] },
    { give: [['emerald', 9], ['book', 1]], get: ['enchanted_book', 1] },
    { give: [['emerald', 5]], get: ['bookshelf', 3] }, { give: [['emerald', 1]], get: ['glass', 4] },
    { give: [['emerald', 4]], get: ['lantern', 1] }, { give: [['emerald', 20]], get: ['name_tag', 1] }] },
  { id: 'armorer', disp: 'Armorer', block: 'blast_furnace', trades: [
    { give: [['coal', 15]], get: ['emerald', 1] }, { give: [['iron_ingot', 4]], get: ['emerald', 1] },
    { give: [['emerald', 7]], get: ['iron_helmet', 1] }, { give: [['emerald', 9]], get: ['iron_chestplate', 1] },
    { give: [['emerald', 19]], get: ['diamond_leggings', 1] }, { give: [['emerald', 13]], get: ['diamond_boots', 1] },
    { give: [['emerald', 5]], get: ['shield', 1] }] },
  { id: 'toolsmith', disp: 'Toolsmith', block: 'smithing_table', trades: [
    { give: [['coal', 15]], get: ['emerald', 1] }, { give: [['iron_ingot', 4]], get: ['emerald', 1] },
    { give: [['emerald', 6]], get: ['iron_pickaxe', 1] }, { give: [['emerald', 8]], get: ['iron_axe', 1] },
    { give: [['emerald', 18]], get: ['diamond_pickaxe', 1] }, { give: [['emerald', 14]], get: ['diamond_axe', 1] },
    { give: [['diamond', 1]], get: ['emerald', 1] }] },
  { id: 'weaponsmith', disp: 'Weaponsmith', block: 'grindstone', trades: [
    { give: [['coal', 15]], get: ['emerald', 1] }, { give: [['iron_ingot', 4]], get: ['emerald', 1] },
    { give: [['emerald', 7]], get: ['iron_sword', 1] }, { give: [['emerald', 12]], get: ['diamond_sword', 1] },
    { give: [['emerald', 5]], get: ['bell', 1] }] },
  { id: 'cleric', disp: 'Cleric', block: 'brewing_stand', trades: [
    { give: [['rotten_flesh', 32]], get: ['emerald', 1] }, { give: [['gold_ingot', 3]], get: ['emerald', 1] },
    { give: [['emerald', 1]], get: ['redstone', 2] }, { give: [['emerald', 4]], get: ['lapis_lazuli', 1] },
    { give: [['emerald', 5]], get: ['glowstone', 1] }, { give: [['emerald', 7]], get: ['ender_pearl', 1] }] },
  { id: 'fletcher', disp: 'Fletcher', block: 'fletching_table', trades: [
    { give: [['stick', 32]], get: ['emerald', 1] }, { give: [['emerald', 1]], get: ['arrow', 16] },
    { give: [['emerald', 2]], get: ['bow', 1] }, { give: [['emerald', 3]], get: ['crossbow', 1] },
    { give: [['feather', 24]], get: ['emerald', 1] }] },
  { id: 'butcher', disp: 'Butcher', block: 'smoker', trades: [
    { give: [['porkchop', 14]], get: ['emerald', 1] }, { give: [['chicken', 14]], get: ['emerald', 1] },
    { give: [['emerald', 1]], get: ['cooked_porkchop', 5] }, { give: [['emerald', 1]], get: ['cooked_beef', 5] },
    { give: [['sweet_berries', 10]], get: ['emerald', 1] }] },
  { id: 'cartographer', disp: 'Cartographer', block: 'cartography_table', trades: [
    { give: [['paper', 24]], get: ['emerald', 1] }, { give: [['emerald', 7]], get: ['map', 1] },
    { give: [['emerald', 1]], get: ['glass_pane', 11] }] },
  { id: 'leatherworker', disp: 'Leatherworker', block: 'cauldron', trades: [
    { give: [['leather', 6]], get: ['emerald', 1] }, { give: [['emerald', 3]], get: ['leather_chestplate', 1] },
    { give: [['emerald', 6]], get: ['saddle', 1] }] },
  { id: 'mason', disp: 'Mason', block: 'stonecutter', trades: [
    { give: [['clay_ball', 10]], get: ['emerald', 1] }, { give: [['emerald', 1]], get: ['bricks', 10] },
    { give: [['emerald', 1]], get: ['terracotta', 4] }, { give: [['emerald', 1]], get: ['quartz', 4] }] },
  { id: 'shepherd', disp: 'Shepherd', block: 'loom', trades: [
    { give: [['white_wool', 18]], get: ['emerald', 1] }, { give: [['emerald', 3]], get: ['white_wool', 4] },
    { give: [['emerald', 2]], get: ['shears', 1] }, { give: [['emerald', 3]], get: ['white_bed', 1] }] },
  { id: 'fisherman', disp: 'Fisherman', block: 'barrel', trades: [
    { give: [['string', 20]], get: ['emerald', 1] }, { give: [['cod', 6]], get: ['emerald', 1] },
    { give: [['emerald', 1]], get: ['cooked_cod', 6] }, { give: [['emerald', 8]], get: ['fishing_rod', 1] }] },
  { id: 'nitwit', disp: 'Nitwit', block: null, trades: [] }
];

/* ---------------------------------------------------- recipe matching -- */
/* Grid is a flat array of item names (or null) with a known width. */
function normalizeGrid(grid, w, h) {
  var minX = w, maxX = -1, minY = h, maxY = -1;
  for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
    if (grid[y * w + x]) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return null;
  var nw = maxX - minX + 1, nh = maxY - minY + 1, out = [];
  for (var j = 0; j < nh; j++) for (var i = 0; i < nw; i++) out.push(grid[(minY + j) * w + (minX + i)]);
  return { w: nw, h: nh, cells: out };
}
function matchShaped(r, n) {
  var rw = r.rows[0].length, rh = r.rows.length;
  if (rw !== n.w || rh !== n.h) return false;
  for (var y = 0; y < rh; y++) for (var x = 0; x < rw; x++) {
    var ch = r.rows[y].charAt(x);
    var ing = ch === ' ' ? null : r.key[ch];
    if (!ingMatch(ing, n.cells[y * rw + x])) return false;
  }
  return true;
}
function matchShapeless(r, items) {
  if (r.ings.length !== items.length) return false;
  var pool = items.slice();
  for (var i = 0; i < r.ings.length; i++) {
    var found = -1;
    for (var j = 0; j < pool.length; j++) if (ingMatch(r.ings[i], pool[j])) { found = j; break; }
    if (found < 0) return false;
    pool.splice(found, 1);
  }
  return true;
}
function findRecipe(grid, w, h) {
  var n = normalizeGrid(grid, w, h);
  if (!n) return null;
  var flat = [];
  for (var i = 0; i < grid.length; i++) if (grid[i]) flat.push(grid[i]);
  for (var r = 0; r < RECIPES.length; r++) {
    var rec = RECIPES[r];
    if (!ITEMS[rec.out]) continue;
    if (rec.shaped ? matchShaped(rec, n) : matchShapeless(rec, flat)) return rec;
  }
  return null;
}
