/* =========================================================================
 * LOOT TABLES — what you find in the chests structures leave behind.
 * Each entry is [item, minCount, maxCount, weight].
 * ========================================================================= */

var LOOT = {
  village_house: [['bread', 1, 4, 8], ['wheat_seeds', 1, 3, 6], ['apple', 1, 3, 5], ['emerald', 1, 2, 3],
    ['iron_ingot', 1, 2, 3], ['oak_sapling', 1, 2, 4], ['stick', 1, 5, 6], ['coal', 1, 4, 5],
    ['potato', 1, 4, 4], ['carrot', 1, 4, 4], ['iron_pickaxe', 1, 1, 1], ['book', 1, 1, 2]],
  village_smith: [['iron_ingot', 1, 5, 8], ['gold_ingot', 1, 3, 4], ['diamond', 1, 2, 2],
    ['iron_pickaxe', 1, 1, 3], ['iron_sword', 1, 1, 3], ['iron_chestplate', 1, 1, 2],
    ['obsidian', 1, 3, 3], ['coal', 2, 6, 6], ['bread', 1, 3, 4], ['apple', 1, 3, 4]],
  desert_temple: [['diamond', 1, 3, 3], ['gold_ingot', 2, 7, 8], ['iron_ingot', 1, 5, 8],
    ['emerald', 1, 3, 4], ['bone', 4, 6, 8], ['rotten_flesh', 3, 7, 8], ['saddle', 1, 1, 3],
    ['golden_apple', 1, 1, 2], ['enchanted_golden_apple', 1, 1, 1], ['horse_armor_gold', 1, 1, 1],
    ['gunpowder', 1, 8, 6], ['sand', 4, 8, 4]],
  jungle_temple: [['diamond', 1, 3, 2], ['gold_ingot', 2, 7, 6], ['iron_ingot', 1, 5, 8],
    ['emerald', 1, 3, 4], ['bamboo', 1, 3, 5], ['bone', 4, 6, 8], ['rotten_flesh', 3, 7, 8],
    ['saddle', 1, 1, 3], ['book', 1, 1, 4], ['cocoa_beans', 1, 3, 5]],
  igloo: [['apple', 1, 3, 6], ['coal', 1, 4, 8], ['gold_nugget', 1, 3, 4], ['stone_axe', 1, 1, 2],
    ['emerald', 1, 1, 2], ['wheat', 2, 3, 6], ['golden_apple', 1, 1, 1]],
  mineshaft: [['iron_ingot', 1, 5, 10], ['gold_ingot', 1, 3, 5], ['diamond', 1, 2, 3],
    ['coal', 3, 8, 10], ['bread', 1, 3, 15], ['redstone', 4, 9, 5], ['lapis_lazuli', 2, 6, 5],
    ['rail', 4, 8, 20], ['powered_rail', 1, 4, 5], ['torch', 1, 16, 15], ['name_tag', 1, 1, 1],
    ['melon_seeds', 2, 4, 5], ['pumpkin_seeds', 2, 4, 5], ['beetroot_seeds', 2, 4, 5]],
  dungeon: [['saddle', 1, 1, 20], ['golden_apple', 1, 1, 15], ['enchanted_golden_apple', 1, 1, 2],
    ['bread', 1, 1, 20], ['wheat', 1, 4, 20], ['bucket', 1, 1, 10], ['redstone', 1, 4, 15],
    ['iron_ingot', 1, 4, 10], ['name_tag', 1, 1, 10], ['gold_ingot', 1, 4, 5],
    ['bone', 1, 8, 10], ['gunpowder', 1, 8, 10], ['string', 1, 8, 10], ['music_disc_13', 1, 1, 4]],
  stronghold_library: [['book', 1, 3, 20], ['paper', 2, 7, 20], ['enchanted_book', 1, 1, 10],
    ['emerald', 1, 3, 5], ['iron_ingot', 1, 5, 10], ['bread', 1, 3, 15], ['map', 1, 1, 5],
    ['compass', 1, 1, 5]],
  stronghold_corridor: [['iron_ingot', 1, 5, 10], ['gold_ingot', 1, 3, 5], ['redstone', 4, 9, 5],
    ['bread', 1, 3, 15], ['apple', 1, 3, 15], ['iron_pickaxe', 1, 1, 5], ['iron_sword', 1, 1, 5],
    ['iron_chestplate', 1, 1, 5], ['iron_boots', 1, 1, 5], ['golden_apple', 1, 1, 5],
    ['ender_pearl', 1, 1, 10]],
  ancient_city: [['echo_shard', 1, 3, 8], ['disc_fragment_5', 1, 1, 4], ['diamond', 1, 3, 6],
    ['iron_ingot', 1, 5, 8], ['book', 1, 1, 10], ['enchanted_book', 1, 1, 6],
    ['sculk', 4, 10, 8], ['soul_torch', 1, 4, 8], ['candle', 1, 4, 4], ['bone', 1, 6, 8],
    ['amethyst_shard', 1, 4, 5], ['golden_apple', 1, 1, 3], ['name_tag', 1, 1, 3]],
  nether_fortress: [['diamond', 1, 3, 5], ['gold_ingot', 1, 5, 15], ['iron_ingot', 1, 5, 15],
    ['golden_sword', 1, 1, 5], ['golden_chestplate', 1, 1, 5], ['flint_and_steel', 1, 1, 5],
    ['nether_wart', 3, 7, 10], ['saddle', 1, 1, 10], ['obsidian', 2, 4, 5], ['gold_nugget', 4, 12, 10]],
  bastion: [['gold_ingot', 2, 8, 20], ['gold_nugget', 4, 12, 20], ['golden_apple', 1, 1, 8],
    ['iron_ingot', 1, 5, 10], ['crying_obsidian', 1, 3, 8], ['magma_cream', 1, 3, 8],
    ['golden_sword', 1, 1, 5], ['spectral_arrow', 4, 12, 8], ['string', 2, 6, 8]],
  bastion_treasure: [['netherite_ingot', 1, 1, 3], ['netherite_upgrade_smithing_template', 1, 1, 4],
    ['ancient_debris', 1, 2, 4], ['diamond', 2, 6, 8], ['gold_block', 1, 3, 8],
    ['enchanted_golden_apple', 1, 1, 4], ['golden_apple', 1, 2, 8], ['gold_ingot', 4, 12, 15]],
  outpost: [['dark_oak_log', 1, 4, 10], ['crossbow', 1, 1, 5], ['arrow', 2, 6, 15],
    ['iron_ingot', 1, 3, 8], ['bread', 1, 4, 12], ['potato', 2, 5, 10], ['wheat', 2, 5, 10],
    ['emerald', 1, 2, 5], ['tripwire_hook', 1, 2, 5]],
  mansion: [['diamond', 1, 3, 4], ['gold_ingot', 1, 4, 8], ['iron_ingot', 1, 5, 10],
    ['emerald', 1, 3, 6], ['book', 1, 1, 10], ['enchanted_book', 1, 1, 5],
    ['lead', 1, 2, 5], ['golden_apple', 1, 1, 5], ['totem_of_undying', 1, 1, 2],
    ['bread', 1, 4, 10], ['redstone', 2, 6, 6]],
  shipwreck_treasure: [['emerald', 1, 5, 15], ['iron_ingot', 1, 5, 15], ['gold_ingot', 1, 5, 10],
    ['diamond', 1, 2, 4], ['lapis_lazuli', 1, 6, 10], ['gold_nugget', 1, 10, 10],
    ['heart_of_the_sea', 1, 1, 2], ['nautilus_shell', 1, 2, 4]],
  shipwreck_supply: [['bread', 1, 5, 15], ['cooked_cod', 1, 4, 10], ['cooked_salmon', 1, 4, 10],
    ['potato', 2, 6, 10], ['carrot', 4, 8, 10], ['wheat', 8, 21, 10], ['coal', 2, 8, 8],
    ['leather_chestplate', 1, 1, 5], ['tnt', 1, 2, 3], ['bamboo', 1, 3, 5], ['paper', 1, 12, 8]],
  shipwreck_map: [['map', 1, 1, 12], ['compass', 1, 1, 8], ['paper', 1, 10, 10],
    ['book', 1, 5, 10], ['feather', 1, 5, 10], ['clock', 1, 1, 5]],
  buried_treasure: [['heart_of_the_sea', 1, 1, 100], ['iron_ingot', 1, 4, 30], ['gold_ingot', 1, 4, 20],
    ['diamond', 1, 2, 12], ['emerald', 4, 8, 12], ['prismarine_crystals', 1, 5, 10],
    ['cooked_cod', 2, 4, 10], ['tnt', 1, 2, 6]],
  ruined_portal: [['obsidian', 1, 2, 20], ['flint_and_steel', 1, 1, 8], ['gold_nugget', 4, 24, 20],
    ['gold_ingot', 2, 8, 15], ['golden_apple', 1, 1, 8], ['golden_helmet', 1, 1, 5],
    ['golden_sword', 1, 1, 5], ['fire_charge', 1, 1, 5], ['bell', 1, 1, 3], ['glistering_melon_slice', 4, 12, 8]],
  end_city: [['diamond', 2, 7, 10], ['emerald', 2, 6, 10], ['iron_ingot', 4, 8, 10],
    ['gold_ingot', 2, 7, 10], ['beetroot_seeds', 1, 10, 5], ['saddle', 1, 1, 3],
    ['diamond_sword', 1, 1, 3], ['diamond_chestplate', 1, 1, 3], ['diamond_pickaxe', 1, 1, 3]],
  end_ship: [['elytra', 1, 1, 100], ['diamond', 2, 7, 12], ['gold_ingot', 2, 7, 12],
    ['iron_ingot', 4, 8, 12], ['emerald', 2, 6, 12], ['diamond_chestplate', 1, 1, 6],
    ['dragon_breath', 1, 1, 6], ['enchanted_golden_apple', 1, 1, 4]]
};

function rollLoot(name, rng) {
  var table = LOOT[name] || LOOT.dungeon;
  var total = 0;
  for (var i = 0; i < table.length; i++) total += table[i][3];
  var rolls = 3 + Math.floor(rng() * 5);
  var items = [];
  for (var r = 0; r < rolls; r++) {
    var pick = rng() * total, acc = 0, chosen = table[0];
    for (var j = 0; j < table.length; j++) {
      acc += table[j][3];
      if (pick <= acc) { chosen = table[j]; break; }
    }
    var item = chosen[0];
    if (!ITEMS[item]) continue;
    var n = chosen[1] + Math.floor(rng() * (chosen[2] - chosen[1] + 1));
    if (n <= 0) continue;
    items.push(makeStack(item, Math.min(n, ITEMS[item].stack)));
  }
  return items;
}
