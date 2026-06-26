// ============================================================================
//  Block registry
// ============================================================================
import { BLOCK, ITEM, TIER } from './ids.js';

export const RENDER = { AIR: 0, CUBE: 1, CROSS: 2, LIQUID: 3, TORCH: 4 };
export const TINT = { NONE: 0, GRASS: 1, FOLIAGE: 2, WATER: 3 };

// Expand a texture spec into {px,nx,py,ny,pz,nz} (east,west,top,bottom,south,north)
function tex(spec) {
  if (typeof spec === 'string') return { px: spec, nx: spec, py: spec, ny: spec, pz: spec, nz: spec };
  const side = spec.side || spec.px || spec.all;
  return {
    px: spec.east || spec.side || side,
    nx: spec.west || spec.side || side,
    py: spec.top || side,
    ny: spec.bottom || side,
    pz: spec.south || spec.front || spec.side || side,
    nz: spec.north || spec.side || side,
  };
}

const D = {}; // id -> definition
function def(id, opts) {
  const b = Object.assign({
    id,
    name: opts.name || 'Block',
    render: RENDER.CUBE,
    solid: true,        // collides
    opaque: true,       // culls neighbours + blocks light
    transparent: false, // needs alpha (glass, leaves cutout)
    liquid: false,
    light: 0,           // emitted light 0..15
    filterLight: 15,    // how much light it removes when passing through (opaque=15)
    tint: TINT.NONE,
    hardness: 1.0,
    tool: 'none',       // pickaxe|axe|shovel|shears|sword|none
    minTier: TIER.HAND, // min tool tier required to drop anything
    drops: null,        // {item,count} | array | fn | null(self)
    flammable: false,
    waves: false,
  }, opts);
  if (b.texture) b.tex = tex(b.texture);
  D[id] = b;
  return b;
}

// --- Definitions -------------------------------------------------------------
def(BLOCK.AIR, { name: 'Air', render: RENDER.AIR, solid: false, opaque: false, transparent: true, filterLight: 0 });

def(BLOCK.STONE, { name: 'Stone', texture: 'stone', hardness: 1.5, tool: 'pickaxe', minTier: TIER.WOOD, drops: { item: BLOCK.COBBLESTONE } });
def(BLOCK.GRASS, { name: 'Grass Block', texture: { top: 'grass_top', bottom: 'dirt', side: 'grass_side' }, tint: TINT.GRASS, hardness: 0.6, tool: 'shovel', drops: { item: BLOCK.DIRT } });
def(BLOCK.DIRT, { name: 'Dirt', texture: 'dirt', hardness: 0.5, tool: 'shovel' });
def(BLOCK.COBBLESTONE, { name: 'Cobblestone', texture: 'cobblestone', hardness: 2.0, tool: 'pickaxe', minTier: TIER.WOOD });
def(BLOCK.PLANKS_OAK, { name: 'Oak Planks', texture: 'planks_oak', hardness: 2.0, tool: 'axe', flammable: true });
def(BLOCK.BEDROCK, { name: 'Bedrock', texture: 'bedrock', hardness: -1, drops: { item: -1 } });
def(BLOCK.WATER, { name: 'Water', texture: 'water', render: RENDER.LIQUID, solid: false, opaque: false, transparent: true, liquid: true, filterLight: 2, tint: TINT.WATER, waves: true, drops: { item: -1 } });
def(BLOCK.LAVA, { name: 'Lava', texture: 'lava', render: RENDER.LIQUID, solid: false, opaque: false, transparent: true, liquid: true, light: 15, filterLight: 0, drops: { item: -1 } });
def(BLOCK.SAND, { name: 'Sand', texture: 'sand', hardness: 0.5, tool: 'shovel', gravity: true });
def(BLOCK.GRAVEL, { name: 'Gravel', texture: 'gravel', hardness: 0.6, tool: 'shovel', gravity: true, drops: { item: BLOCK.GRAVEL, flint: 0.1 } });
def(BLOCK.GOLD_ORE, { name: 'Gold Ore', texture: 'gold_ore', hardness: 3.0, tool: 'pickaxe', minTier: TIER.IRON });
def(BLOCK.IRON_ORE, { name: 'Iron Ore', texture: 'iron_ore', hardness: 3.0, tool: 'pickaxe', minTier: TIER.STONE });
def(BLOCK.COAL_ORE, { name: 'Coal Ore', texture: 'coal_ore', hardness: 3.0, tool: 'pickaxe', minTier: TIER.WOOD, drops: { item: ITEM.COAL, xp: 1 } });
def(BLOCK.LOG_OAK, { name: 'Oak Log', texture: { top: 'log_oak_top', bottom: 'log_oak_top', side: 'log_oak_side' }, hardness: 2.0, tool: 'axe', flammable: true });
def(BLOCK.LEAVES_OAK, { name: 'Oak Leaves', texture: 'leaves_oak', transparent: true, opaque: false, filterLight: 1, tint: TINT.FOLIAGE, hardness: 0.2, tool: 'shears', waves: true, flammable: true, drops: { item: -1, sapling: 0.05, apple: 0.005 } });
def(BLOCK.GLASS, { name: 'Glass', texture: 'glass', transparent: true, opaque: false, filterLight: 0, hardness: 0.3, drops: { item: -1 } });
def(BLOCK.DIAMOND_ORE, { name: 'Diamond Ore', texture: 'diamond_ore', hardness: 3.0, tool: 'pickaxe', minTier: TIER.IRON, drops: { item: ITEM.DIAMOND, xp: 4 } });
def(BLOCK.REDSTONE_ORE, { name: 'Redstone Ore', texture: 'redstone_ore', hardness: 3.0, tool: 'pickaxe', minTier: TIER.IRON, light: 6, drops: { item: ITEM.REDSTONE, count: 4, xp: 1 } });
def(BLOCK.LAPIS_ORE, { name: 'Lapis Ore', texture: 'lapis_ore', hardness: 3.0, tool: 'pickaxe', minTier: TIER.STONE, drops: { item: ITEM.LAPIS, count: 5, xp: 2 } });
def(BLOCK.EMERALD_ORE, { name: 'Emerald Ore', texture: 'emerald_ore', hardness: 3.0, tool: 'pickaxe', minTier: TIER.IRON, drops: { item: ITEM.EMERALD, xp: 5 } });
def(BLOCK.SNOW, { name: 'Snow Block', texture: 'snow', hardness: 0.2, tool: 'shovel' });
def(BLOCK.ICE, { name: 'Ice', texture: 'ice', transparent: true, opaque: false, filterLight: 2, hardness: 0.5, tool: 'pickaxe', slippery: true, drops: { item: -1 } });
def(BLOCK.CACTUS, { name: 'Cactus', texture: { top: 'cactus_top', bottom: 'cactus_top', side: 'cactus_side' }, transparent: true, opaque: false, hardness: 0.4, hurt: 1 });
def(BLOCK.CLAY, { name: 'Clay', texture: 'clay', hardness: 0.6, tool: 'shovel', drops: { item: ITEM.CLAY_BALL, count: 4 } });
def(BLOCK.PUMPKIN, { name: 'Pumpkin', texture: { top: 'pumpkin_top', bottom: 'pumpkin_top', front: 'pumpkin_front', side: 'pumpkin_side' }, hardness: 1.0, tool: 'axe' });
def(BLOCK.NETHERRACK, { name: 'Netherrack', texture: 'netherrack', hardness: 0.4, tool: 'pickaxe', minTier: TIER.WOOD });
def(BLOCK.SOUL_SAND, { name: 'Soul Sand', texture: 'soul_sand', hardness: 0.5, tool: 'shovel' });
def(BLOCK.GLOWSTONE, { name: 'Glowstone', texture: 'glowstone', light: 15, hardness: 0.3 });
def(BLOCK.OBSIDIAN, { name: 'Obsidian', texture: 'obsidian', hardness: 50, tool: 'pickaxe', minTier: TIER.DIAMOND });
def(BLOCK.CRAFTING_TABLE, { name: 'Crafting Table', texture: { top: 'crafting_table_top', bottom: 'planks_oak', front: 'crafting_table_front', side: 'crafting_table_side' }, hardness: 2.5, tool: 'axe', flammable: true });
def(BLOCK.FURNACE, { name: 'Furnace', texture: { top: 'furnace_top', bottom: 'furnace_top', front: 'furnace_front', side: 'furnace_side' }, hardness: 3.5, tool: 'pickaxe', minTier: TIER.WOOD });
def(BLOCK.FURNACE_LIT, { name: 'Furnace', texture: { top: 'furnace_top', bottom: 'furnace_top', front: 'furnace_front_lit', side: 'furnace_side' }, hardness: 3.5, tool: 'pickaxe', minTier: TIER.WOOD, light: 13, drops: { item: BLOCK.FURNACE } });
def(BLOCK.TORCH, { name: 'Torch', texture: 'torch', render: RENDER.TORCH, solid: false, opaque: false, transparent: true, light: 14, hardness: 0 });
def(BLOCK.LOG_BIRCH, { name: 'Birch Log', texture: { top: 'log_birch_top', bottom: 'log_birch_top', side: 'log_birch_side' }, hardness: 2.0, tool: 'axe', flammable: true });
def(BLOCK.LEAVES_BIRCH, { name: 'Birch Leaves', texture: 'leaves_birch', transparent: true, opaque: false, filterLight: 1, tint: TINT.FOLIAGE, hardness: 0.2, tool: 'shears', waves: true, flammable: true, drops: { item: -1, sapling: 0.05 } });
def(BLOCK.LOG_SPRUCE, { name: 'Spruce Log', texture: { top: 'log_spruce_top', bottom: 'log_spruce_top', side: 'log_spruce_side' }, hardness: 2.0, tool: 'axe', flammable: true });
def(BLOCK.LEAVES_SPRUCE, { name: 'Spruce Leaves', texture: 'leaves_spruce', transparent: true, opaque: false, filterLight: 1, tint: TINT.FOLIAGE, hardness: 0.2, tool: 'shears', waves: true, flammable: true, drops: { item: -1, sapling: 0.05 } });
def(BLOCK.LOG_JUNGLE, { name: 'Jungle Log', texture: { top: 'log_jungle_top', bottom: 'log_jungle_top', side: 'log_jungle_side' }, hardness: 2.0, tool: 'axe', flammable: true });
def(BLOCK.LEAVES_JUNGLE, { name: 'Jungle Leaves', texture: 'leaves_jungle', transparent: true, opaque: false, filterLight: 1, tint: TINT.FOLIAGE, hardness: 0.2, tool: 'shears', waves: true, flammable: true, drops: { item: -1, sapling: 0.025 } });
def(BLOCK.SANDSTONE, { name: 'Sandstone', texture: { top: 'sandstone_top', bottom: 'sandstone_bottom', side: 'sandstone_side' }, hardness: 0.8, tool: 'pickaxe', minTier: TIER.WOOD });
def(BLOCK.RED_SAND, { name: 'Red Sand', texture: 'red_sand', hardness: 0.5, tool: 'shovel', gravity: true });
def(BLOCK.TERRACOTTA, { name: 'Terracotta', texture: 'terracotta', hardness: 1.25, tool: 'pickaxe', minTier: TIER.WOOD });
def(BLOCK.MOSSY_COBBLE, { name: 'Mossy Cobblestone', texture: 'mossy_cobble', hardness: 2.0, tool: 'pickaxe', minTier: TIER.WOOD });
def(BLOCK.BRICKS, { name: 'Bricks', texture: 'bricks', hardness: 2.0, tool: 'pickaxe', minTier: TIER.WOOD });
def(BLOCK.STONE_BRICKS, { name: 'Stone Bricks', texture: 'stone_bricks', hardness: 1.5, tool: 'pickaxe', minTier: TIER.WOOD });
def(BLOCK.BOOKSHELF, { name: 'Bookshelf', texture: { top: 'planks_oak', bottom: 'planks_oak', side: 'bookshelf' }, hardness: 1.5, tool: 'axe', flammable: true, drops: { item: ITEM.BOOK, count: 3 } });
def(BLOCK.TALL_GRASS, { name: 'Grass', texture: 'tall_grass', render: RENDER.CROSS, solid: false, opaque: false, transparent: true, tint: TINT.GRASS, hardness: 0, tool: 'shears', waves: true, drops: { item: -1, seeds: 0.125 } });
def(BLOCK.FLOWER_POPPY, { name: 'Poppy', texture: 'poppy', render: RENDER.CROSS, solid: false, opaque: false, transparent: true, hardness: 0 });
def(BLOCK.FLOWER_DANDELION, { name: 'Dandelion', texture: 'dandelion', render: RENDER.CROSS, solid: false, opaque: false, transparent: true, hardness: 0 });
def(BLOCK.MUSHROOM_RED, { name: 'Red Mushroom', texture: 'mushroom_red', render: RENDER.CROSS, solid: false, opaque: false, transparent: true, hardness: 0 });
def(BLOCK.MUSHROOM_BROWN, { name: 'Brown Mushroom', texture: 'mushroom_brown', render: RENDER.CROSS, solid: false, opaque: false, transparent: true, light: 1, hardness: 0 });
def(BLOCK.END_STONE, { name: 'End Stone', texture: 'end_stone', hardness: 3.0, tool: 'pickaxe', minTier: TIER.WOOD });
def(BLOCK.DIAMOND_BLOCK, { name: 'Block of Diamond', texture: 'diamond_block', hardness: 5.0, tool: 'pickaxe', minTier: TIER.IRON });
def(BLOCK.IRON_BLOCK, { name: 'Block of Iron', texture: 'iron_block', hardness: 5.0, tool: 'pickaxe', minTier: TIER.STONE });
def(BLOCK.GOLD_BLOCK, { name: 'Block of Gold', texture: 'gold_block', hardness: 3.0, tool: 'pickaxe', minTier: TIER.IRON });
def(BLOCK.COAL_BLOCK, { name: 'Block of Coal', texture: 'coal_block', hardness: 5.0, tool: 'pickaxe', minTier: TIER.WOOD });
def(BLOCK.EMERALD_BLOCK, { name: 'Block of Emerald', texture: 'emerald_block', hardness: 5.0, tool: 'pickaxe', minTier: TIER.IRON });
def(BLOCK.LAPIS_BLOCK, { name: 'Lapis Block', texture: 'lapis_block', hardness: 3.0, tool: 'pickaxe', minTier: TIER.STONE });
def(BLOCK.PODZOL, { name: 'Podzol', texture: { top: 'podzol_top', bottom: 'dirt', side: 'podzol_side' }, hardness: 0.5, tool: 'shovel', drops: { item: BLOCK.DIRT } });
def(BLOCK.MYCELIUM, { name: 'Mycelium', texture: { top: 'mycelium_top', bottom: 'dirt', side: 'mycelium_side' }, hardness: 0.6, tool: 'shovel', drops: { item: BLOCK.DIRT } });
def(BLOCK.GRASS_BLOCK_SNOW, { name: 'Snowy Grass', texture: { top: 'snow', bottom: 'dirt', side: 'grass_snow_side' }, hardness: 0.6, tool: 'shovel', drops: { item: BLOCK.DIRT } });
def(BLOCK.PACKED_ICE, { name: 'Packed Ice', texture: 'packed_ice', hardness: 0.5, tool: 'pickaxe', slippery: true, drops: { item: -1 } });
def(BLOCK.CHEST, { name: 'Chest', texture: { top: 'chest_top', bottom: 'chest_top', front: 'chest_front', side: 'chest_side' }, transparent: true, opaque: false, hardness: 2.5, tool: 'axe', flammable: true, container: true });
def(BLOCK.NETHER_BRICK, { name: 'Nether Bricks', texture: 'nether_brick', hardness: 2.0, tool: 'pickaxe', minTier: TIER.WOOD });
def(BLOCK.PURPUR, { name: 'Purpur Block', texture: 'purpur', hardness: 1.5, tool: 'pickaxe', minTier: TIER.WOOD });
def(BLOCK.END_PORTAL_FRAME, { name: 'End Portal Frame', texture: { top: 'end_portal_frame_top', bottom: 'end_stone', side: 'end_portal_frame_side' }, hardness: -1, light: 1, drops: { item: -1 } });
def(BLOCK.SUGAR_CANE, { name: 'Sugar Cane', texture: 'sugar_cane', render: RENDER.CROSS, solid: false, opaque: false, transparent: true, tint: TINT.FOLIAGE, hardness: 0, drops: { item: BLOCK.SUGAR_CANE } });
def(BLOCK.DEAD_BUSH, { name: 'Dead Bush', texture: 'dead_bush', render: RENDER.CROSS, solid: false, opaque: false, transparent: true, hardness: 0, tool: 'shears', drops: { item: ITEM.STICK, count: 2 } });
def(BLOCK.COBWEB, { name: 'Cobweb', texture: 'cobweb', render: RENDER.CROSS, solid: false, opaque: false, transparent: true, hardness: 4, tool: 'shears', drops: { item: ITEM.STRING } });
def(BLOCK.NETHER_PORTAL, { name: 'Nether Portal', texture: 'nether_portal', render: RENDER.LIQUID, solid: false, opaque: false, transparent: true, light: 11, filterLight: 0, drops: { item: -1 }, portal: 'nether' });
def(BLOCK.END_PORTAL, { name: 'End Portal', texture: 'end_portal', solid: false, opaque: false, transparent: true, light: 15, filterLight: 0, drops: { item: -1 }, portal: 'end' });
def(BLOCK.WOOL_WHITE, { name: 'White Wool', texture: 'wool_white', hardness: 0.8, tool: 'shears', flammable: true });
def(BLOCK.WOOL_RED, { name: 'Red Wool', texture: 'wool_red', hardness: 0.8, tool: 'shears', flammable: true });
def(BLOCK.WOOL_BLUE, { name: 'Blue Wool', texture: 'wool_blue', hardness: 0.8, tool: 'shears', flammable: true });
def(BLOCK.WOOL_GREEN, { name: 'Green Wool', texture: 'wool_green', hardness: 0.8, tool: 'shears', flammable: true });
def(BLOCK.WOOL_YELLOW, { name: 'Yellow Wool', texture: 'wool_yellow', hardness: 0.8, tool: 'shears', flammable: true });
def(BLOCK.WOOL_BLACK, { name: 'Black Wool', texture: 'wool_black', hardness: 0.8, tool: 'shears', flammable: true });
def(BLOCK.GLASS_PANE, { name: 'Glass Pane', texture: 'glass', transparent: true, opaque: false, filterLight: 0, hardness: 0.3, drops: { item: -1 } });
def(BLOCK.LADDER, { name: 'Ladder', texture: 'ladder', render: RENDER.CROSS, solid: false, opaque: false, transparent: true, hardness: 0.4, climb: true });
def(BLOCK.SNOW_LAYER, { name: 'Snow', texture: 'snow', hardness: 0.1, tool: 'shovel' });
def(BLOCK.FARMLAND, { name: 'Farmland', texture: { top: 'farmland', bottom: 'dirt', side: 'dirt' }, hardness: 0.6, tool: 'shovel', drops: { item: BLOCK.DIRT } });
def(BLOCK.WHEAT_CROP, { name: 'Wheat', texture: 'wheat_stage', render: RENDER.CROSS, solid: false, opaque: false, transparent: true, hardness: 0, drops: { item: ITEM.WHEAT, seeds: 1 } });

export const BLOCKS = D;
export function getBlock(id) { return D[id] || D[BLOCK.AIR]; }
export function isSolid(id) { return getBlock(id).solid; }
export function isOpaque(id) { return getBlock(id).opaque; }
export function isLiquid(id) { return getBlock(id).liquid; }
export function isAir(id) { return id === BLOCK.AIR; }
export function lightOf(id) { return getBlock(id).light; }
export function filterOf(id) { const b = getBlock(id); return b.opaque ? 15 : b.filterLight; }

// Set of all texture tile names referenced by blocks (for atlas generation)
export function allTextureNames() {
  const set = new Set();
  for (const id in D) {
    const b = D[id];
    if (!b.tex) continue;
    for (const k of ['px','nx','py','ny','pz','nz']) if (b.tex[k]) set.add(b.tex[k]);
  }
  return [...set];
}
