// ============================================================================
//  Item registry — non-block items plus block-item helpers
// ============================================================================
import { BLOCK, ITEM, TIER } from './ids.js';
import { getBlock } from './blocks.js';

const I = {}; // id -> def
function it(id, opts) { I[id] = Object.assign({ id, stack: 64 }, opts); return I[id]; }

// materials
it(ITEM.STICK, { name: 'Stick', icon: 'item_stick' });
it(ITEM.COAL, { name: 'Coal', icon: 'item_coal', fuel: 80 });
it(ITEM.CHARCOAL, { name: 'Charcoal', icon: 'item_charcoal', fuel: 80 });
it(ITEM.IRON_INGOT, { name: 'Iron Ingot', icon: 'item_iron_ingot' });
it(ITEM.GOLD_INGOT, { name: 'Gold Ingot', icon: 'item_gold_ingot' });
it(ITEM.DIAMOND, { name: 'Diamond', icon: 'item_diamond' });
it(ITEM.EMERALD, { name: 'Emerald', icon: 'item_emerald' });
it(ITEM.LAPIS, { name: 'Lapis Lazuli', icon: 'item_lapis' });
it(ITEM.REDSTONE, { name: 'Redstone Dust', icon: 'item_redstone' });
it(ITEM.FLINT, { name: 'Flint', icon: 'item_flint' });
it(ITEM.CLAY_BALL, { name: 'Clay Ball', icon: 'item_clay_ball' });
it(ITEM.BRICK, { name: 'Brick', icon: 'item_brick' });
it(ITEM.LEATHER, { name: 'Leather', icon: 'item_leather' });
it(ITEM.FEATHER, { name: 'Feather', icon: 'item_feather' });
it(ITEM.BONE, { name: 'Bone', icon: 'item_bone' });
it(ITEM.STRING, { name: 'String', icon: 'item_string' });
it(ITEM.GUNPOWDER, { name: 'Gunpowder', icon: 'item_gunpowder' });
it(ITEM.ARROW, { name: 'Arrow', icon: 'item_arrow' });
it(ITEM.SUGAR, { name: 'Sugar', icon: 'item_sugar' });
it(ITEM.PAPER, { name: 'Paper', icon: 'item_paper' });
it(ITEM.BOOK, { name: 'Book', icon: 'item_book' });
it(ITEM.BOWL, { name: 'Bowl', icon: 'item_bowl' });
it(ITEM.SEEDS, { name: 'Wheat Seeds', icon: 'item_seeds', plantable: BLOCK.WHEAT_CROP });
it(ITEM.WHEAT, { name: 'Wheat', icon: 'item_wheat' });

// food
it(ITEM.APPLE, { name: 'Apple', icon: 'item_apple', food: 4, sat: 2.4 });
it(ITEM.BREAD, { name: 'Bread', icon: 'item_bread', food: 5, sat: 6 });
it(ITEM.PORKCHOP_RAW, { name: 'Raw Porkchop', icon: 'item_porkchop_raw', food: 3, sat: 1.8 });
it(ITEM.PORKCHOP_COOKED, { name: 'Cooked Porkchop', icon: 'item_porkchop_cooked', food: 8, sat: 12.8 });
it(ITEM.BEEF_RAW, { name: 'Raw Beef', icon: 'item_beef_raw', food: 3, sat: 1.8 });
it(ITEM.BEEF_COOKED, { name: 'Steak', icon: 'item_beef_cooked', food: 8, sat: 12.8 });
it(ITEM.CHICKEN_RAW, { name: 'Raw Chicken', icon: 'item_chicken_raw', food: 2, sat: 1.2 });
it(ITEM.CHICKEN_COOKED, { name: 'Cooked Chicken', icon: 'item_chicken_cooked', food: 6, sat: 7.2 });
it(ITEM.MUTTON_RAW, { name: 'Raw Mutton', icon: 'item_mutton_raw', food: 2, sat: 1.2 });
it(ITEM.MUTTON_COOKED, { name: 'Cooked Mutton', icon: 'item_mutton_cooked', food: 6, sat: 9.6 });
it(ITEM.MUSHROOM_STEW, { name: 'Mushroom Stew', icon: 'item_mushroom_stew', food: 6, sat: 7.2, stack: 1, container: ITEM.BOWL });

// special tools
it(ITEM.BOW, { name: 'Bow', icon: 'item_bow', stack: 1, durability: 384 });
it(ITEM.FLINT_AND_STEEL, { name: 'Flint and Steel', icon: 'item_flint_and_steel', stack: 1, durability: 64, igniter: true });
it(ITEM.SHEARS, { name: 'Shears', icon: 'item_shears', stack: 1, durability: 238, tool: 'shears', tier: TIER.WOOD, speed: 5 });
it(ITEM.BUCKET, { name: 'Bucket', icon: 'item_bucket', stack: 16 });
it(ITEM.WATER_BUCKET, { name: 'Water Bucket', icon: 'item_water_bucket', stack: 1, placeFluid: BLOCK.WATER, empties: ITEM.BUCKET });
it(ITEM.LAVA_BUCKET, { name: 'Lava Bucket', icon: 'item_lava_bucket', stack: 1, placeFluid: BLOCK.LAVA, empties: ITEM.BUCKET, fuel: 1000 });

// generated tools
const TOOL_SPEED = { wood: 2, stone: 4, iron: 6, gold: 12, diamond: 8 };
const TOOL_DUR = { wood: 59, stone: 131, iron: 250, gold: 32, diamond: 1561 };
const SWORD_DMG = { wood: 4, stone: 5, iron: 6, gold: 4, diamond: 7 };
const matTier = { wood: TIER.WOOD, stone: TIER.STONE, iron: TIER.IRON, gold: TIER.GOLD, diamond: TIER.DIAMOND };
const toolIds = {
  wood: { pickaxe: ITEM.WOOD_PICKAXE, axe: ITEM.WOOD_AXE, shovel: ITEM.WOOD_SHOVEL, sword: ITEM.WOOD_SWORD, hoe: ITEM.WOOD_HOE },
  stone: { pickaxe: ITEM.STONE_PICKAXE, axe: ITEM.STONE_AXE, shovel: ITEM.STONE_SHOVEL, sword: ITEM.STONE_SWORD, hoe: ITEM.STONE_HOE },
  iron: { pickaxe: ITEM.IRON_PICKAXE, axe: ITEM.IRON_AXE, shovel: ITEM.IRON_SHOVEL, sword: ITEM.IRON_SWORD, hoe: ITEM.IRON_HOE },
  gold: { pickaxe: ITEM.GOLD_PICKAXE, axe: ITEM.GOLD_AXE, shovel: ITEM.GOLD_SHOVEL, sword: ITEM.GOLD_SWORD, hoe: ITEM.GOLD_HOE },
  diamond: { pickaxe: ITEM.DIAMOND_PICKAXE, axe: ITEM.DIAMOND_AXE, shovel: ITEM.DIAMOND_SHOVEL, sword: ITEM.DIAMOND_SWORD, hoe: ITEM.DIAMOND_HOE },
};
const toolNames = { pickaxe: 'Pickaxe', axe: 'Axe', shovel: 'Shovel', sword: 'Sword', hoe: 'Hoe' };
const matNames = { wood: 'Wooden', stone: 'Stone', iron: 'Iron', gold: 'Golden', diamond: 'Diamond' };
for (const m in toolIds) for (const k in toolIds[m]) {
  const dmg = k === 'sword' ? SWORD_DMG[m] : (k === 'axe' ? SWORD_DMG[m] - 1 : 2);
  it(toolIds[m][k], {
    name: `${matNames[m]} ${toolNames[k]}`, icon: `item_${m}_${k}`, stack: 1,
    tool: k, tier: matTier[m], speed: TOOL_SPEED[m], durability: TOOL_DUR[m], damage: dmg,
  });
}

// armor
const ARMOR_DEF = { leather: 1, iron: 2, diamond: 3 };
const armorIds = {
  leather: { helmet: ITEM.LEATHER_HELMET, chest: ITEM.LEATHER_CHEST, legs: ITEM.LEATHER_LEGS, boots: ITEM.LEATHER_BOOTS },
  iron: { helmet: ITEM.IRON_HELMET, chest: ITEM.IRON_CHEST, legs: ITEM.IRON_LEGS, boots: ITEM.IRON_BOOTS },
  diamond: { helmet: ITEM.DIAMOND_HELMET, chest: ITEM.DIAMOND_CHEST, legs: ITEM.DIAMOND_LEGS, boots: ITEM.DIAMOND_BOOTS },
};
const armorPts = { helmet: 2, chest: 6, legs: 5, boots: 2 };
const armorSlot = { helmet: 0, chest: 1, legs: 2, boots: 3 };
const armorMatName = { leather: 'Leather', iron: 'Iron', diamond: 'Diamond' };
const armorPieceName = { helmet: 'Helmet', chest: 'Chestplate', legs: 'Leggings', boots: 'Boots' };
for (const m in armorIds) for (const k in armorIds[m]) {
  it(armorIds[m][k], {
    name: `${armorMatName[m]} ${armorPieceName[k]}`, icon: `item_${m}_${k}`, stack: 1,
    armor: armorPts[k] * (ARMOR_DEF[m]), armorSlot: armorSlot[k],
  });
}

export const ITEMS = I;

// Resolve any id (block or item) to a uniform descriptor
export function itemDef(id) {
  if (id == null || id < 0) return null;
  if (id < 256) {
    const b = getBlock(id);
    return { id, name: b.name, isBlock: true, blockId: id, stack: 64, icon: b.tex ? b.tex.pz : null, block: b };
  }
  return I[id] || { id, name: 'Item ' + id, icon: null, stack: 64 };
}

export function itemName(id) { const d = itemDef(id); return d ? d.name : 'Unknown'; }
export function maxStack(id) { const d = itemDef(id); return d ? (d.stack || 64) : 64; }
