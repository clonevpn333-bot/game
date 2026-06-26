// ============================================================================
//  Crafting (shaped + shapeless) and furnace smelting recipes
// ============================================================================
import { BLOCK, ITEM } from './ids.js';

const shaped = [];     // {grid:[[id|null,...],...], w,h, result:{id,count}}
const shapeless = [];  // {ids:[...], result:{id,count}}

function addShaped(result, count, rows) {
  // rows: array of arrays of ids or null; trimmed already
  shaped.push({ grid: rows, w: rows[0].length, h: rows.length, result: { id: result, count } });
}
function addShapeless(result, count, ids) { shapeless.push({ ids: ids.slice().sort((a, b) => a - b), result: { id: result, count } }); }

const LOGS = [BLOCK.LOG_OAK, BLOCK.LOG_BIRCH, BLOCK.LOG_SPRUCE, BLOCK.LOG_JUNGLE];
const P = BLOCK.PLANKS_OAK, S = ITEM.STICK, C = BLOCK.COBBLESTONE;

// basics
for (const log of LOGS) addShapeless(P, 4, [log]);
addShaped(S, 4, [[P], [P]]);
addShaped(BLOCK.CRAFTING_TABLE, 1, [[P, P], [P, P]]);
addShaped(BLOCK.CHEST, 1, [[P, P, P], [P, null, P], [P, P, P]]);
addShaped(BLOCK.FURNACE, 1, [[C, C, C], [C, null, C], [C, C, C]]);
addShaped(BLOCK.TORCH, 4, [[ITEM.COAL], [S]]);
addShaped(BLOCK.TORCH, 4, [[ITEM.CHARCOAL], [S]]);
addShaped(BLOCK.LADDER, 3, [[S, null, S], [S, S, S], [S, null, S]]);
addShaped(BLOCK.BOOKSHELF, 1, [[P, P, P], [ITEM.BOOK, ITEM.BOOK, ITEM.BOOK], [P, P, P]]);
addShaped(BLOCK.STONE_BRICKS, 4, [[BLOCK.STONE, BLOCK.STONE], [BLOCK.STONE, BLOCK.STONE]]);
addShaped(BLOCK.BRICKS, 1, [[ITEM.BRICK, ITEM.BRICK], [ITEM.BRICK, ITEM.BRICK]]);
addShaped(BLOCK.GLASS_PANE, 16, [[BLOCK.GLASS, BLOCK.GLASS, BLOCK.GLASS], [BLOCK.GLASS, BLOCK.GLASS, BLOCK.GLASS]]);
addShaped(BLOCK.SANDSTONE, 1, [[BLOCK.SAND, BLOCK.SAND], [BLOCK.SAND, BLOCK.SAND]]);

// food
addShaped(ITEM.BREAD, 1, [[ITEM.WHEAT, ITEM.WHEAT, ITEM.WHEAT]]);
addShaped(ITEM.BOWL, 4, [[P, null, P], [null, P, null]]);
addShapeless(ITEM.MUSHROOM_STEW, 1, [ITEM.BOWL, BLOCK.MUSHROOM_RED, BLOCK.MUSHROOM_BROWN]);
addShaped(ITEM.PAPER, 3, [[BLOCK.SUGAR_CANE, BLOCK.SUGAR_CANE, BLOCK.SUGAR_CANE]]);
addShapeless(ITEM.SUGAR, 1, [BLOCK.SUGAR_CANE]);
addShaped(ITEM.BOOK, 1, [[ITEM.PAPER, ITEM.PAPER], [ITEM.PAPER, ITEM.LEATHER]]);

// compress / decompress
const blocks9 = [[ITEM.COAL, BLOCK.COAL_BLOCK], [ITEM.IRON_INGOT, BLOCK.IRON_BLOCK], [ITEM.GOLD_INGOT, BLOCK.GOLD_BLOCK],
  [ITEM.DIAMOND, BLOCK.DIAMOND_BLOCK], [ITEM.EMERALD, BLOCK.EMERALD_BLOCK], [ITEM.LAPIS, BLOCK.LAPIS_BLOCK]];
for (const [item, block] of blocks9) {
  addShaped(block, 1, [[item, item, item], [item, item, item], [item, item, item]]);
  addShapeless(item, 9, [block]);
}

// tools & gear
const MATS = { wood: P, stone: C, iron: ITEM.IRON_INGOT, gold: ITEM.GOLD_INGOT, diamond: ITEM.DIAMOND };
const TOOLIDS = {
  pickaxe: { wood: ITEM.WOOD_PICKAXE, stone: ITEM.STONE_PICKAXE, iron: ITEM.IRON_PICKAXE, gold: ITEM.GOLD_PICKAXE, diamond: ITEM.DIAMOND_PICKAXE },
  axe: { wood: ITEM.WOOD_AXE, stone: ITEM.STONE_AXE, iron: ITEM.IRON_AXE, gold: ITEM.GOLD_AXE, diamond: ITEM.DIAMOND_AXE },
  shovel: { wood: ITEM.WOOD_SHOVEL, stone: ITEM.STONE_SHOVEL, iron: ITEM.IRON_SHOVEL, gold: ITEM.GOLD_SHOVEL, diamond: ITEM.DIAMOND_SHOVEL },
  sword: { wood: ITEM.WOOD_SWORD, stone: ITEM.STONE_SWORD, iron: ITEM.IRON_SWORD, gold: ITEM.GOLD_SWORD, diamond: ITEM.DIAMOND_SWORD },
  hoe: { wood: ITEM.WOOD_HOE, stone: ITEM.STONE_HOE, iron: ITEM.IRON_HOE, gold: ITEM.GOLD_HOE, diamond: ITEM.DIAMOND_HOE },
};
for (const m in MATS) {
  const x = MATS[m];
  addShaped(TOOLIDS.pickaxe[m], 1, [[x, x, x], [null, S, null], [null, S, null]]);
  addShaped(TOOLIDS.axe[m], 1, [[x, x], [x, S], [null, S]]);
  addShaped(TOOLIDS.shovel[m], 1, [[x], [S], [S]]);
  addShaped(TOOLIDS.sword[m], 1, [[x], [x], [S]]);
  addShaped(TOOLIDS.hoe[m], 1, [[x, x], [null, S], [null, S]]);
}
// utility tools
addShaped(ITEM.SHEARS, 1, [[ITEM.IRON_INGOT, null], [null, ITEM.IRON_INGOT]]);
addShaped(ITEM.FLINT_AND_STEEL, 1, [[ITEM.IRON_INGOT, null], [null, ITEM.FLINT]]);
addShaped(ITEM.BUCKET, 1, [[ITEM.IRON_INGOT, null, ITEM.IRON_INGOT], [null, ITEM.IRON_INGOT, null]]);
addShaped(ITEM.BOW, 1, [[null, S, ITEM.STRING], [S, null, ITEM.STRING], [null, S, ITEM.STRING]]);
addShaped(ITEM.ARROW, 4, [[ITEM.FLINT], [S], [ITEM.FEATHER]]);

// armor
const ARMOR = {
  leather: { mat: ITEM.LEATHER, h: ITEM.LEATHER_HELMET, c: ITEM.LEATHER_CHEST, l: ITEM.LEATHER_LEGS, b: ITEM.LEATHER_BOOTS },
  iron: { mat: ITEM.IRON_INGOT, h: ITEM.IRON_HELMET, c: ITEM.IRON_CHEST, l: ITEM.IRON_LEGS, b: ITEM.IRON_BOOTS },
  diamond: { mat: ITEM.DIAMOND, h: ITEM.DIAMOND_HELMET, c: ITEM.DIAMOND_CHEST, l: ITEM.DIAMOND_LEGS, b: ITEM.DIAMOND_BOOTS },
};
for (const m in ARMOR) {
  const a = ARMOR[m], x = a.mat;
  addShaped(a.h, 1, [[x, x, x], [x, null, x]]);
  addShaped(a.c, 1, [[x, null, x], [x, x, x], [x, x, x]]);
  addShaped(a.l, 1, [[x, x, x], [x, null, x], [x, null, x]]);
  addShaped(a.b, 1, [[x, null, x], [x, null, x]]);
}

// ---- matching ----
function trimGrid(ids, size) {
  // ids: flat array length size*size of id or 0/null
  let minR = size, maxR = -1, minC = size, maxC = -1;
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
    const v = ids[r * size + c];
    if (v) { minR = Math.min(minR, r); maxR = Math.max(maxR, r); minC = Math.min(minC, c); maxC = Math.max(maxC, c); }
  }
  if (maxR < 0) return null;
  const out = [];
  for (let r = minR; r <= maxR; r++) { const row = []; for (let c = minC; c <= maxC; c++) row.push(ids[r * size + c] || null); out.push(row); }
  return out;
}

function gridEq(a, b) {
  if (a.length !== b.length || a[0].length !== b[0].length) return false;
  for (let r = 0; r < a.length; r++) for (let c = 0; c < a[0].length; c++) if ((a[r][c] || null) !== (b[r][c] || null)) return false;
  return true;
}

// grid: flat array of slot {id} or null, length size*size (size 2 or 3)
export function craftResult(grid, size) {
  const ids = grid.map(s => s ? s.id : 0);
  const present = ids.filter(v => v).length;
  if (present === 0) return null;
  const trimmed = trimGrid(ids, size);
  // shaped
  for (const r of shaped) {
    if (r.w <= size && r.h <= size && gridEq(trimmed, r.grid)) return r.result;
  }
  // shapeless
  const sortedIds = ids.filter(v => v).sort((a, b) => a - b);
  for (const r of shapeless) {
    if (r.ids.length === sortedIds.length && r.ids.every((v, i) => v === sortedIds[i])) return r.result;
  }
  return null;
}

// ---- smelting ----
export const SMELT = {
  [BLOCK.IRON_ORE]: ITEM.IRON_INGOT,
  [BLOCK.GOLD_ORE]: ITEM.GOLD_INGOT,
  [BLOCK.SAND]: BLOCK.GLASS,
  [BLOCK.RED_SAND]: BLOCK.GLASS,
  [BLOCK.COBBLESTONE]: BLOCK.STONE,
  [BLOCK.CLAY]: BLOCK.TERRACOTTA,
  [ITEM.CLAY_BALL]: ITEM.BRICK,
  [BLOCK.NETHERRACK]: BLOCK.NETHER_BRICK,
  [BLOCK.LOG_OAK]: ITEM.CHARCOAL,
  [BLOCK.LOG_BIRCH]: ITEM.CHARCOAL,
  [BLOCK.LOG_SPRUCE]: ITEM.CHARCOAL,
  [BLOCK.LOG_JUNGLE]: ITEM.CHARCOAL,
  [ITEM.PORKCHOP_RAW]: ITEM.PORKCHOP_COOKED,
  [ITEM.BEEF_RAW]: ITEM.BEEF_COOKED,
  [ITEM.CHICKEN_RAW]: ITEM.CHICKEN_COOKED,
  [ITEM.MUTTON_RAW]: ITEM.MUTTON_COOKED,
};

export function smeltResult(id) { return SMELT[id] != null ? SMELT[id] : null; }

// fuel burn time (seconds)
export function fuelTime(id) {
  if (id === ITEM.COAL || id === ITEM.CHARCOAL) return 80;
  if (id === BLOCK.COAL_BLOCK) return 800;
  if (id === ITEM.LAVA_BUCKET) return 1000;
  if (id === BLOCK.PLANKS_OAK || id === BLOCK.CRAFTING_TABLE || id === BLOCK.BOOKSHELF || id === BLOCK.CHEST) return 15;
  if (id === ITEM.STICK) return 5;
  if (LOGS.includes(id)) return 15;
  return 0;
}
