// ============================================================================
//  Procedural pixel-art texture atlas (blocks + item icons), generated on a
//  canvas at runtime so the game needs no external image assets.
// ============================================================================
import { mulberry32, hashSeed } from './noise.js';

const TILE = 16;        // logical pixels per tile
const COLS = 16;        // tiles per row
export const ATLAS_TILE = TILE;

// ---- per-tile drawing helpers ----------------------------------------------
class Tile {
  constructor(seed) {
    this.d = new Uint8ClampedArray(TILE * TILE * 4);
    this.rng = mulberry32(seed);
  }
  set(x, y, r, g, b, a = 255) {
    if (x < 0 || y < 0 || x >= TILE || y >= TILE) return;
    const i = (y * TILE + x) * 4;
    this.d[i] = r; this.d[i + 1] = g; this.d[i + 2] = b; this.d[i + 3] = a;
  }
  fill(r, g, b, a = 255) {
    for (let i = 0; i < this.d.length; i += 4) { this.d[i]=r; this.d[i+1]=g; this.d[i+2]=b; this.d[i+3]=a; }
  }
  // fill with base color + random per-pixel brightness variation
  noiseFill(r, g, b, amt = 18, a = 255) {
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
      const v = (this.rng() - 0.5) * 2 * amt;
      this.set(x, y, r + v, g + v, b + v, a);
    }
  }
  rect(x0, y0, w, h, r, g, b, a = 255) {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.set(x, y, r, g, b, a);
  }
}

function shade(c, d) { return [c[0] + d, c[1] + d, c[2] + d]; }

// ---- generic palette --------------------------------------------------------
// Colors tuned toward vanilla Minecraft default texture pack: muted, slightly
// desaturated, natural. Kept low-saturation so a shader pack reads cleanly.
const PAL = {
  stone: [127, 127, 127], dirt: [121, 95, 69], grass_top: [106, 138, 70],
  grass_side_top: [106, 138, 70], cobble: [122, 122, 122], planks_oak: [160, 127, 80],
  sand: [219, 207, 163], gravel: [126, 121, 118], bedrock: [85, 85, 85],
  snow: [239, 247, 247], ice: [151, 184, 233], clay: [161, 167, 181],
  netherrack: [97, 38, 38], soul_sand: [85, 67, 56], glowstone: [171, 131, 78],
  obsidian: [21, 18, 30], sandstone: [217, 206, 160], red_sand: [169, 96, 48],
  terracotta: [150, 95, 68], bricks: [150, 97, 83], stone_bricks: [122, 122, 122],
  end_stone: [219, 222, 158], nether_brick: [44, 22, 26], purpur: [169, 125, 169],
  log_oak: [102, 81, 48], log_birch: [197, 196, 188], log_spruce: [58, 42, 25],
  log_jungle: [105, 78, 51], leaves_oak: [58, 92, 38], leaves_birch: [100, 130, 67],
  leaves_spruce: [49, 74, 49], leaves_jungle: [55, 96, 36], cactus: [85, 122, 60],
  diamond: [108, 219, 214], iron: [216, 216, 216], gold: [231, 198, 91],
  coal: [40, 40, 40], emerald: [82, 196, 116], lapis: [38, 67, 137], redstone: [171, 32, 32],
};

// ---- specialized tile painters ---------------------------------------------
function paintOre(t, base, ore) {
  t.noiseFill(base[0], base[1], base[2], 10);
  const spots = 4 + (t.rng() * 3 | 0);
  for (let s = 0; s < spots; s++) {
    const cx = 2 + (t.rng() * 12 | 0), cy = 2 + (t.rng() * 12 | 0);
    const r = 1 + (t.rng() * 1.4 | 0);
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      if (x*x + y*y <= r*r + 0.5) {
        const v = (t.rng() - 0.5) * 22;
        t.set(cx + x, cy + y, ore[0]+v, ore[1]+v, ore[2]+v);
      }
    }
    // subtle dark outline at edge so the speck reads as a nugget
    t.set(cx, cy + r + 1, ore[0]-30, ore[1]-30, ore[2]-30);
  }
}
function paintPlanks(t, c) {
  t.noiseFill(c[0], c[1], c[2], 7);
  const dark = shade(c, -28), light = shade(c, 14);
  // clean horizontal plank seams with a faint highlight under each
  for (let y = 0; y < TILE; y += 4) {
    t.rect(0, y, TILE, 1, dark[0], dark[1], dark[2]);
    if (y + 1 < TILE) t.rect(0, y + 1, TILE, 1, light[0], light[1], light[2]);
  }
  // sparse vertical grain ticks
  for (let i = 0; i < 12; i++) {
    const x = t.rng() * TILE | 0, y = t.rng() * TILE | 0;
    t.set(x, y, c[0]-14, c[1]-14, c[2]-14);
  }
}
function paintLogSide(t, c) {
  t.noiseFill(c[0], c[1], c[2], 8);
  const dark = shade(c, -22), light = shade(c, 12);
  // vertical bark grooves, gentler than before
  for (let x = 0; x < TILE; x++) {
    if (x % 6 === 0) for (let y = 0; y < TILE; y++) { const v=(t.rng()-0.5)*8; t.set(x, y, dark[0]+v, dark[1]+v, dark[2]+v); }
    if (x % 6 === 3) for (let y = 0; y < TILE; y++) { const v=(t.rng()-0.5)*8; t.set(x, y, light[0]+v, light[1]+v, light[2]+v); }
  }
}
function paintLogTop(t, c) {
  const bark = shade(c, -20);
  t.fill(c[0], c[1], c[2]);
  const cx = 7.5, cy = 7.5;
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
    const d = Math.sqrt((x-cx)**2 + (y-cy)**2);
    const ring = Math.sin(d * 1.6) * 0.5 + 0.5;
    const v = ring * 16 - 8;
    t.set(x, y, c[0]+v, c[1]+v, c[2]+v);
  }
  // bark border
  for (let i = 0; i < TILE; i++) { t.set(i,0,bark[0],bark[1],bark[2]); t.set(i,15,bark[0],bark[1],bark[2]); t.set(0,i,bark[0],bark[1],bark[2]); t.set(15,i,bark[0],bark[1],bark[2]); }
}
function paintLeaves(t, c) {
  t.fill(0,0,0,0);
  const dk = shade(c, -22), lt = shade(c, 16);
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
    if (t.rng() < 0.08) continue; // holes for cutout look
    const r = t.rng();
    // cluster into a few tones for depth instead of high-amplitude noise
    let base = c;
    if (r < 0.28) base = dk;
    else if (r > 0.80) base = lt;
    const v = (t.rng() - 0.5) * 16;
    t.set(x, y, base[0]+v, base[1]+v, base[2]+v, 255);
  }
}
function paintCobble(t, c) {
  t.noiseFill(c[0]-4, c[1]-4, c[2]-4, 6);
  const stones = [[1,1,5,5],[7,1,7,4],[1,7,4,6],[6,6,4,4],[11,8,4,6],[2,12,6,3]];
  for (const [x,y,w,h] of stones) {
    const v = (t.rng()-0.5)*18;
    t.rect(x,y,w,h, c[0]+v, c[1]+v, c[2]+v);
    t.rect(x,y,w,1, c[0]+v+16, c[1]+v+16, c[2]+v+16); // top highlight
    t.rect(x,y+h-1,w,1, c[0]+v-16, c[1]+v-16, c[2]+v-16); // bottom shadow
  }
}
function paintBricks(t, c) {
  const mortar = shade(c, -42);
  t.fill(mortar[0], mortar[1], mortar[2]);
  for (let row = 0; row < 4; row++) {
    const off = (row % 2) * 4;
    for (let col = -1; col < 4; col++) {
      const x = col * 8 + off + 1, y = row * 4 + 1;
      const v = (t.rng()-0.5)*12;
      t.rect(x, y, 6, 3, c[0]+v, c[1]+v, c[2]+v);
      t.rect(x, y, 6, 1, c[0]+v+12, c[1]+v+12, c[2]+v+12); // faint top highlight
    }
  }
}
function paintStoneBricks(t, c) {
  const mortar = shade(c, -28);
  t.noiseFill(c[0], c[1], c[2], 7);
  for (let i = 0; i < TILE; i++) { t.set(i,7,mortar[0],mortar[1],mortar[2]); t.set(i,15,mortar[0],mortar[1],mortar[2]); }
  for (let y = 0; y < 8; y++) t.set(7, y, mortar[0],mortar[1],mortar[2]);
  for (let y = 8; y < 16; y++) t.set(3, y, mortar[0],mortar[1],mortar[2]);
  for (let y = 8; y < 16; y++) t.set(12, y, mortar[0],mortar[1],mortar[2]);
}
function paintGlass(t) {
  t.fill(0, 0, 0, 0);
  // clean pane: thin lighter frame, mostly transparent interior
  for (let i = 0; i < TILE; i++) { t.set(i,0,255,255,255,150); t.set(i,15,205,222,232,110); t.set(0,i,255,255,255,130); t.set(15,i,205,222,232,110); }
  t.set(2,2,255,255,255,170); t.set(3,2,255,255,255,120); t.set(2,3,255,255,255,120);
  t.set(11,10,255,255,255,140);
}
function paintLiquid(t, c, a) {
  t.noiseFill(c[0], c[1], c[2], 10, a);
  for (let x = 0; x < TILE; x++) {
    const y = (Math.sin(x*0.9)*1.5 + 4) | 0;
    t.set(x, y, c[0]+22, c[1]+22, c[2]+22, a);
  }
}
function paintCross(t, draw) { t.fill(0,0,0,0); draw(t); }

function makePainters() {
  return {
    stone: t => t.noiseFill(...PAL.stone, 9),
    dirt: t => { t.noiseFill(...PAL.dirt, 11); for(let i=0;i<10;i++){const x=t.rng()*16|0,y=t.rng()*16|0;t.set(x,y,PAL.dirt[0]-14,PAL.dirt[1]-14,PAL.dirt[2]-14);} },
    grass_top: t => { t.noiseFill(...PAL.grass_top, 9); for (let i=0;i<18;i++){const x=t.rng()*16|0,y=t.rng()*16|0;t.set(x,y,95,127,62);} for (let i=0;i<8;i++){const x=t.rng()*16|0,y=t.rng()*16|0;t.set(x,y,118,150,80);} },
    grass_side: t => {
      t.noiseFill(...PAL.dirt, 11);
      // thin natural-green top strip with a few drips
      for (let x = 0; x < TILE; x++) {
        const h = 3 + ((Math.sin(x*1.3)*1.2 + (t.rng()<0.3?1:0)) | 0);
        for (let y = 0; y < h; y++) { const v=(t.rng()-0.5)*14; t.set(x,y,PAL.grass_top[0]+v,PAL.grass_top[1]+v,PAL.grass_top[2]+v); }
      }
    },
    grass_snow_side: t => { t.noiseFill(...PAL.dirt, 11); for (let x=0;x<TILE;x++){const h=4+(t.rng()<0.4?1:0);for(let y=0;y<h;y++){const v=(t.rng()-0.5)*8;t.set(x,y,PAL.snow[0]+v,PAL.snow[1]+v,PAL.snow[2]+v);}} },
    cobblestone: t => paintCobble(t, PAL.cobble),
    mossy_cobble: t => { paintCobble(t, PAL.cobble); for (let i=0;i<34;i++){const x=t.rng()*16|0,y=t.rng()*16|0;if(t.rng()<0.5)t.set(x,y,76,102,56);} },
    planks_oak: t => paintPlanks(t, PAL.planks_oak),
    bedrock: t => { t.noiseFill(...PAL.bedrock, 18); for(let i=0;i<12;i++){const x=t.rng()*16|0,y=t.rng()*16|0;t.set(x,y,48,48,48);} for(let i=0;i<8;i++){const x=t.rng()*16|0,y=t.rng()*16|0;t.set(x,y,112,112,112);} },
    sand: t => t.noiseFill(...PAL.sand, 8),
    red_sand: t => t.noiseFill(...PAL.red_sand, 9),
    gravel: t => { t.noiseFill(...PAL.gravel, 13); for(let i=0;i<20;i++){const x=t.rng()*16|0,y=t.rng()*16|0,v=(t.rng()-0.5)*36;t.set(x,y,PAL.gravel[0]+v,PAL.gravel[1]+v,PAL.gravel[2]+v);} },
    snow: t => t.noiseFill(...PAL.snow, 5),
    ice: t => { t.noiseFill(...PAL.ice, 10, 210); for(let i=0;i<5;i++){const x=t.rng()*16|0;for(let y=0;y<16;y++)t.set(x,y,170,200,238,210);} },
    packed_ice: t => t.noiseFill(140, 174, 218, 8),
    clay: t => t.noiseFill(...PAL.clay, 7),
    netherrack: t => { t.noiseFill(...PAL.netherrack, 14); for(let i=0;i<18;i++){const x=t.rng()*16|0,y=t.rng()*16|0;t.set(x,y,70,28,28);} for(let i=0;i<8;i++){const x=t.rng()*16|0,y=t.rng()*16|0;t.set(x,y,120,52,52);} },
    soul_sand: t => { t.noiseFill(...PAL.soul_sand, 9); for(let i=0;i<3;i++){const x=2+(t.rng()*11|0),y=2+(t.rng()*11|0);t.rect(x,y,2,2,54,42,34);} },
    glowstone: t => { t.noiseFill(...PAL.glowstone, 16); for(let i=0;i<8;i++){const x=t.rng()*16|0,y=t.rng()*16|0;t.set(x,y,236,206,140);} },
    obsidian: t => { t.noiseFill(...PAL.obsidian, 8); for(let i=0;i<10;i++){const x=t.rng()*16|0,y=t.rng()*16|0;t.set(x,y,46,34,68);} },
    sandstone_top: t => { t.noiseFill(...PAL.sandstone, 5); for(let i=0;i<16;i++)t.set(i,0,202,190,148); },
    sandstone_side: t => { t.noiseFill(...PAL.sandstone, 5); t.rect(0,0,16,2,202,190,148); t.rect(0,13,16,3,200,188,146); },
    sandstone_bottom: t => t.noiseFill(...shade(PAL.sandstone,-10), 5),
    terracotta: t => t.noiseFill(...PAL.terracotta, 9),
    bricks: t => paintBricks(t, PAL.bricks),
    stone_bricks: t => paintStoneBricks(t, PAL.stone_bricks),
    nether_brick: t => paintBricks(t, PAL.nether_brick),
    end_stone: t => { t.noiseFill(...PAL.end_stone, 8); for(let i=0;i<12;i++){const x=t.rng()*16|0,y=t.rng()*16|0;t.set(x,y,202,206,144);} },
    purpur: t => { t.noiseFill(...PAL.purpur, 9); for(let i=0;i<10;i++){const x=t.rng()*16|0,y=t.rng()*16|0;t.set(x,y,186,150,186);} },
    log_oak_side: t => paintLogSide(t, PAL.log_oak),
    log_oak_top: t => paintLogTop(t, [143,115,72]),
    log_birch_side: t => { paintLogSide(t, PAL.log_birch); for(let i=0;i<6;i++){const y=t.rng()*16|0;t.rect(t.rng()*12|0,y,2,1,55,55,55);} },
    log_birch_top: t => paintLogTop(t, [205,202,188]),
    log_spruce_side: t => paintLogSide(t, PAL.log_spruce),
    log_spruce_top: t => paintLogTop(t, [82,60,36]),
    log_jungle_side: t => paintLogSide(t, PAL.log_jungle),
    log_jungle_top: t => paintLogTop(t, [127,100,64]),
    leaves_oak: t => paintLeaves(t, PAL.leaves_oak),
    leaves_birch: t => paintLeaves(t, PAL.leaves_birch),
    leaves_spruce: t => paintLeaves(t, PAL.leaves_spruce),
    leaves_jungle: t => paintLeaves(t, PAL.leaves_jungle),
    cactus_side: t => { t.noiseFill(...PAL.cactus, 8); for(let y=0;y<16;y++){t.set(0,y,52,82,44);t.set(15,y,52,82,44);} for(let i=0;i<6;i++){const x=2+(t.rng()*12|0),y=t.rng()*16|0;t.set(x,y,180,184,140);} },
    cactus_top: t => { t.noiseFill(...shade(PAL.cactus,8), 7); t.rect(5,5,6,6,66,98,52); },
    gold_ore: t => paintOre(t, PAL.stone, PAL.gold),
    iron_ore: t => paintOre(t, PAL.stone, [184,150,124]),
    coal_ore: t => paintOre(t, PAL.stone, PAL.coal),
    diamond_ore: t => paintOre(t, PAL.stone, PAL.diamond),
    redstone_ore: t => paintOre(t, PAL.stone, PAL.redstone),
    lapis_ore: t => paintOre(t, PAL.stone, PAL.lapis),
    emerald_ore: t => paintOre(t, PAL.stone, PAL.emerald),
    diamond_block: t => { t.noiseFill(...shade(PAL.diamond,-26),6); t.rect(2,2,12,12,...PAL.diamond); t.rect(3,3,3,3,190,240,238); },
    iron_block: t => { t.noiseFill(...PAL.iron,5); t.rect(3,3,3,3,245,245,245); },
    gold_block: t => { t.noiseFill(...PAL.gold,6); t.rect(3,3,3,3,250,232,150); },
    emerald_block: t => { t.noiseFill(...shade(PAL.emerald,-18),6); t.rect(2,2,12,12,...PAL.emerald); t.rect(3,3,3,3,150,228,182); },
    coal_block: t => t.noiseFill(...PAL.coal, 6),
    lapis_block: t => t.noiseFill(...PAL.lapis, 12),
    glass: t => paintGlass(t),
    water: t => paintLiquid(t, [55,90,178], 165),
    lava: t => paintLiquid(t, [207,103,28], 255),
    nether_portal: t => paintLiquid(t, [108,46,168], 170),
    end_portal: t => { t.fill(10,10,26,235); for(let i=0;i<40;i++){const x=t.rng()*16|0,y=t.rng()*16|0;t.set(x,y,170,206,238,255);} },
    crafting_table_top: t => { paintPlanks(t, PAL.planks_oak); t.rect(1,1,14,14,124,94,54); for(let y=2;y<14;y+=3)t.rect(2,y,12,1,94,66,36); t.rect(7,2,1,12,94,66,36); },
    crafting_table_side: t => { paintPlanks(t, PAL.planks_oak); t.rect(1,8,14,1,94,66,36); t.rect(7,8,1,8,94,66,36); },
    crafting_table_front: t => { paintPlanks(t, PAL.planks_oak); t.rect(2,2,5,5,94,66,36); t.rect(9,2,5,5,94,66,36); t.rect(2,9,12,5,114,84,50); },
    furnace_top: t => { paintCobble(t, [108,108,108]); t.rect(5,5,6,6,64,64,64); },
    furnace_side: t => paintCobble(t, [108,108,108]),
    furnace_front: t => { paintCobble(t, [108,108,108]); t.rect(4,7,8,6,44,44,44); t.rect(5,8,6,1,64,64,64); },
    furnace_front_lit: t => { paintCobble(t, [108,108,108]); t.rect(4,7,8,6,32,22,18); for(let i=0;i<14;i++){const x=4+(t.rng()*8|0),y=8+(t.rng()*4|0);t.set(x,y,232,140+(t.rng()*70|0),44);} },
    chest_top: t => { paintPlanks(t, [150,112,64]); t.rect(1,1,14,14,166,124,74); t.rect(6,1,4,2,66,52,32); },
    chest_side: t => { paintPlanks(t, [150,112,64]); t.rect(1,4,14,1,94,66,36); },
    chest_front: t => { paintPlanks(t, [150,112,64]); t.rect(1,4,14,1,94,66,36); t.rect(7,6,2,3,224,196,92); },
    bookshelf: t => { paintPlanks(t, PAL.planks_oak); const cols=[[166,66,60],[66,104,160],[88,150,90],[188,168,82],[150,92,168]]; for(let s=0;s<2;s++){const y=s*7+1;t.rect(1,y,14,5,84,58,32);for(let x=1;x<15;x+=2){const c=cols[t.rng()*cols.length|0];t.rect(x,y,1,5,c[0],c[1],c[2]);}} },
    podzol_top: t => { t.noiseFill(106,76,42,11); for(let i=0;i<20;i++){const x=t.rng()*16|0,y=t.rng()*16|0;t.set(x,y,82,58,32);} },
    podzol_side: t => { t.noiseFill(...PAL.dirt,10); t.rect(0,0,16,4,106,76,42); },
    mycelium_top: t => { t.noiseFill(118,106,120,10); for(let i=0;i<26;i++){const x=t.rng()*16|0,y=t.rng()*16|0;t.set(x,y,142,124,150);} },
    mycelium_side: t => { t.noiseFill(...PAL.dirt,10); t.rect(0,0,16,4,118,106,120); },
    pumpkin_top: t => { t.noiseFill(196,138,42,8); t.rect(6,1,4,2,122,92,34); },
    pumpkin_side: t => { t.noiseFill(202,138,40,8); for(let x=2;x<16;x+=4)for(let y=0;y<16;y++)t.set(x,y,166,110,30); },
    pumpkin_front: t => { t.noiseFill(202,138,40,8); t.rect(3,4,3,3,66,44,18); t.rect(10,4,3,3,66,44,18); t.rect(5,9,6,3,66,44,18); },
    end_portal_frame_top: t => { t.noiseFill(...PAL.end_stone,6); t.rect(3,3,10,10,52,148,132); },
    end_portal_frame_side: t => { t.noiseFill(...PAL.end_stone,6); t.rect(0,0,16,5,160,160,120); },
    farmland: t => { t.noiseFill(94,64,40,8); for(let x=2;x<16;x+=5)for(let y=0;y<16;y++)t.set(x,y,64,44,26); },
    wool_white: t => t.noiseFill(228,228,228,7),
    wool_red: t => t.noiseFill(160,62,58,8),
    wool_blue: t => t.noiseFill(60,76,148,8),
    wool_green: t => t.noiseFill(86,128,60,8),
    wool_yellow: t => t.noiseFill(190,176,72,8),
    wool_black: t => t.noiseFill(40,40,44,7),
    ladder: t => paintCross(t, t2 => { for(let y=0;y<16;y++){t2.set(2,y,150,114,66);t2.set(13,y,150,114,66);} for(let y=2;y<16;y+=4)for(let x=2;x<14;x++)t2.set(x,y,166,128,74); }),
    // crosses / plants
    tall_grass: t => paintCross(t, t2 => { for(let x=3;x<13;x++){const h=6+(t2.rng()*7|0);for(let y=15;y>15-h;y--){const v=(t2.rng()-0.5)*20;t2.set(x,y,96+v,134+v,62+v);}} }),
    dead_bush: t => paintCross(t, t2 => { for(let i=0;i<5;i++){let x=8,y=15;for(let s=0;s<8;s++){t2.set(x,y,120,90,50);x+=(t2.rng()*3|0)-1;y--;}} }),
    sugar_cane: t => paintCross(t, t2 => { for(let y=15;y>=0;y--){const v=(t2.rng()-0.5)*14;t2.set(7,y,104+v,150+v,86+v);t2.set(8,y,104+v,150+v,86+v);} }),
    wheat_stage: t => paintCross(t, t2 => { for(let x=2;x<15;x+=4)for(let y=15;y>4;y--){t2.set(x,y,196,176,72);} }),
    cobweb: t => paintCross(t, t2 => { for(let i=0;i<16;i++){t2.set(i,i,230,230,235,200);t2.set(15-i,i,230,230,235,200);t2.set(8,i,220,220,225,160);t2.set(i,8,220,220,225,160);} }),
    poppy: t => paintCross(t, t2 => { for(let y=6;y<16;y++)t2.set(8,y,56,108,48); t2.rect(6,3,4,4,196,52,48); t2.set(7,4,232,206,72); }),
    dandelion: t => paintCross(t, t2 => { for(let y=6;y<16;y++)t2.set(8,y,56,108,48); t2.rect(6,3,4,3,228,204,68); }),
    mushroom_red: t => paintCross(t, t2 => { t2.rect(7,9,2,5,216,206,196); t2.rect(5,5,6,4,184,52,48); for(let i=0;i<4;i++)t2.set(5+(t2.rng()*6|0),5+(t2.rng()*3|0),236,236,236); }),
    mushroom_brown: t => paintCross(t, t2 => { t2.rect(7,9,2,5,206,196,186); t2.rect(5,6,6,3,150,112,82); }),
    torch: t => paintCross(t, t2 => { for(let y=6;y<16;y++){t2.set(7,y,150,114,66);t2.set(8,y,130,98,54);} t2.rect(7,3,2,3,248,222,118); t2.set(7,2,255,248,176); t2.set(8,2,250,198,84); }),
  };
}

// ---- item icon painters (16x16, transparent background) --------------------
function makeItemPainters() {
  const cross = (t, draw) => { t.fill(0,0,0,0); draw(t); };
  const handle = (t, c) => { for (let i = 0; i < 7; i++) t.set(11 - i, 4 + i, c[0], c[1], c[2]); for (let i = 0; i < 7; i++) t.set(12 - i, 4 + i, c[0]-20, c[1]-20, c[2]-20); };
  return {
    item_stick: t => cross(t, t2 => handle(t2, [150,110,60])),
    item_coal: t => cross(t, t2 => t2.rect(4,4,8,8, 40,40,44)),
    item_charcoal: t => cross(t, t2 => t2.rect(4,4,8,8, 60,52,48)),
    item_iron_ingot: t => cross(t, t2 => { t2.rect(3,6,10,4,210,210,210); t2.rect(3,6,10,1,240,240,240); }),
    item_gold_ingot: t => cross(t, t2 => { t2.rect(3,6,10,4,...PAL.gold); t2.rect(3,6,10,1,255,245,180); }),
    item_diamond: t => cross(t, t2 => { for(let y=0;y<8;y++){const w=y<4?y+1:8-y;t2.rect(8-w,4+y,w*2,1,...PAL.diamond);} t2.set(6,6,220,255,255); }),
    item_emerald: t => cross(t, t2 => { t2.rect(5,4,6,8,...PAL.emerald); t2.set(6,5,180,255,210); }),
    item_lapis: t => cross(t, t2 => { for(let i=0;i<7;i++){const x=4+(t2.rng()*8|0),y=4+(t2.rng()*8|0);t2.rect(x,y,2,2,...PAL.lapis);} }),
    item_redstone: t => cross(t, t2 => { for(let i=0;i<7;i++){const x=4+(t2.rng()*8|0),y=4+(t2.rng()*8|0);t2.set(x,y,...PAL.redstone);} }),
    item_flint: t => cross(t, t2 => { t2.rect(4,6,8,5,50,50,54); t2.set(4,6,80,80,84); }),
    item_clay_ball: t => cross(t, t2 => t2.rect(5,6,6,5,...PAL.clay)),
    item_brick: t => cross(t, t2 => t2.rect(4,6,8,4,...PAL.bricks)),
    item_apple: t => cross(t, t2 => { t2.rect(5,5,6,7,196,52,48); t2.set(8,4,90,138,52); t2.set(6,6,232,140,140); }),
    item_wheat: t => cross(t, t2 => { for(let x=5;x<11;x+=2)for(let y=3;y<14;y++)t2.set(x,y,220,190,70); }),
    item_seeds: t => cross(t, t2 => { for(let i=0;i<6;i++)t2.set(4+(t2.rng()*8|0),6+(t2.rng()*5|0),120,170,70); }),
    item_bread: t => cross(t, t2 => { t2.rect(3,6,10,5,190,140,70); t2.rect(3,6,10,1,220,170,100); }),
    item_porkchop_raw: t => cross(t, t2 => t2.rect(4,5,8,6,230,150,150)),
    item_porkchop_cooked: t => cross(t, t2 => t2.rect(4,5,8,6,180,110,70)),
    item_beef_raw: t => cross(t, t2 => t2.rect(4,5,8,6,200,80,90)),
    item_beef_cooked: t => cross(t, t2 => t2.rect(4,5,8,6,120,80,55)),
    item_chicken_raw: t => cross(t, t2 => t2.rect(4,5,8,6,240,200,180)),
    item_chicken_cooked: t => cross(t, t2 => t2.rect(4,5,8,6,200,150,90)),
    item_mutton_raw: t => cross(t, t2 => t2.rect(4,5,8,6,220,120,120)),
    item_mutton_cooked: t => cross(t, t2 => t2.rect(4,5,8,6,160,100,70)),
    item_leather: t => cross(t, t2 => t2.rect(4,5,8,6,150,100,60)),
    item_feather: t => cross(t, t2 => { for(let i=0;i<10;i++)t2.set(10-i,4+i,240,240,245); }),
    item_bone: t => cross(t, t2 => { for(let i=0;i<8;i++)t2.set(4+i,11-i,235,235,225); t2.rect(3,3,2,2,235,235,225); t2.rect(11,9,2,2,235,235,225); }),
    item_string: t => cross(t, t2 => { for(let i=0;i<12;i++)t2.set(3+(i%6),3+i*1%12,235,235,235); }),
    item_gunpowder: t => cross(t, t2 => { for(let i=0;i<10;i++)t2.set(4+(t2.rng()*8|0),5+(t2.rng()*7|0),70,70,74); }),
    item_arrow: t => cross(t, t2 => { for(let i=0;i<12;i++)t2.set(3+i,12-i,180,180,180); t2.set(2,13,120,120,120); t2.rect(12,1,2,2,200,200,200); }),
    item_sugar: t => cross(t, t2 => t2.rect(4,6,8,5,245,245,250)),
    item_paper: t => cross(t, t2 => t2.rect(3,4,10,9,245,245,235)),
    item_book: t => cross(t, t2 => { t2.rect(3,3,10,11,150,60,50); t2.rect(5,3,6,11,235,235,225); }),
    item_bowl: t => cross(t, t2 => { t2.rect(3,8,10,3,150,110,70); t2.rect(4,7,8,1,180,140,90); }),
    item_mushroom_stew: t => cross(t, t2 => { t2.rect(3,8,10,3,150,110,70); t2.rect(4,6,8,2,180,120,90); }),
    item_bow: t => cross(t, t2 => { for(let i=0;i<12;i++){const a=i/11*Math.PI;t2.set(4+(Math.sin(a)*6)|0,2+i,150,110,60);} for(let y=2;y<14;y++)t2.set(4,y,235,235,235); }),
    item_flint_and_steel: t => cross(t, t2 => { t2.rect(4,4,5,3,180,180,180); handle(t2,[120,90,50]); }),
    item_shears: t => cross(t, t2 => { t2.rect(4,3,2,6,200,200,200); t2.rect(8,3,2,6,200,200,200); t2.rect(5,9,4,2,160,160,160); }),
    item_bucket: t => cross(t, t2 => { t2.rect(4,5,8,8,200,200,205); t2.rect(4,5,8,1,230,230,235); }),
    item_water_bucket: t => cross(t, t2 => { t2.rect(4,5,8,8,200,200,205); t2.rect(5,6,6,3,60,110,210); }),
    item_lava_bucket: t => cross(t, t2 => { t2.rect(4,5,8,8,200,200,205); t2.rect(5,6,6,3,220,110,30); }),
  };
}

// tool icon: head color by material, shape by tool kind
function toolPainter(matColor, kind) {
  return t => {
    t.fill(0,0,0,0);
    // handle
    for (let i = 0; i < 8; i++) { t.set(10 - i, 5 + i, 140, 100, 55); t.set(11 - i, 5 + i, 110, 78, 44); }
    const c = matColor;
    if (kind === 'pickaxe') { t.rect(3,2,10,2,c[0],c[1],c[2]); t.set(3,4,c[0],c[1],c[2]); t.set(12,4,c[0],c[1],c[2]); }
    else if (kind === 'axe') { t.rect(9,2,4,5,c[0],c[1],c[2]); t.set(8,3,c[0],c[1],c[2]); t.set(8,5,c[0],c[1],c[2]); }
    else if (kind === 'shovel') { t.rect(9,2,4,4,c[0],c[1],c[2]); }
    else if (kind === 'sword') { for(let i=0;i<8;i++)t.set(10-i,5+i,c[0],c[1],c[2]); for(let i=0;i<9;i++)t.set(11-i,5+i,c[0]-20,c[1]-20,c[2]-20); t.rect(9,9,4,2,120,90,50); }
    else if (kind === 'hoe') { t.rect(9,2,4,2,c[0],c[1],c[2]); t.set(9,4,c[0],c[1],c[2]); }
  };
}

// ---- atlas assembly ---------------------------------------------------------
export function buildAtlas(extraNames = []) {
  const painters = Object.assign({}, makePainters(), makeItemPainters());
  // tools
  const mats = { wood:[150,114,66], stone:[127,127,127], iron:[210,210,210], gold:[231,198,91], diamond:[108,219,214] };
  for (const m in mats) for (const k of ['pickaxe','axe','shovel','sword','hoe'])
    painters[`item_${m}_${k}`] = toolPainter(mats[m], k);
  // armor icons (simple)
  const armorColor = { leather:[150,104,64], iron:[210,210,210], diamond:[108,219,214] };
  for (const m in armorColor) {
    const c = armorColor[m];
    painters[`item_${m}_helmet`] = t => { t.fill(0,0,0,0); t.rect(4,3,8,4,c[0],c[1],c[2]); t.rect(4,7,8,2,c[0]-20,c[1]-20,c[2]-20); };
    painters[`item_${m}_chest`] = t => { t.fill(0,0,0,0); t.rect(3,3,10,9,c[0],c[1],c[2]); t.rect(6,3,4,3,c[0]-25,c[1]-25,c[2]-25); };
    painters[`item_${m}_legs`] = t => { t.fill(0,0,0,0); t.rect(4,3,8,4,c[0],c[1],c[2]); t.rect(4,7,3,6,c[0],c[1],c[2]); t.rect(9,7,3,6,c[0],c[1],c[2]); };
    painters[`item_${m}_boots`] = t => { t.fill(0,0,0,0); t.rect(3,8,4,5,c[0],c[1],c[2]); t.rect(9,8,4,5,c[0],c[1],c[2]); };
  }

  const names = Object.keys(painters);
  for (const n of extraNames) if (!names.includes(n)) names.push(n);

  const total = names.length;
  const rows = Math.ceil(total / COLS);
  const size = COLS * TILE;
  const canvas = (typeof document !== 'undefined')
    ? document.createElement('canvas')
    : { width: 0, height: 0, getContext: () => null };
  canvas.width = size;
  canvas.height = Math.max(size, rows * TILE);
  const ctx = canvas.getContext('2d');

  const uvs = new Map();
  for (let i = 0; i < total; i++) {
    const name = names[i];
    const col = i % COLS, row = (i / COLS) | 0;
    const tile = new Tile(hashSeed(name) ^ 0x9e3779b9);
    const fn = painters[name];
    if (fn) fn(tile); else tile.fill(255, 0, 255); // missing -> magenta
    const img = new ImageData(tile.d, TILE, TILE);
    ctx.putImageData(img, col * TILE, row * TILE);
    const u0 = (col * TILE) / canvas.width;
    const v0 = (row * TILE) / canvas.height;
    const u1 = ((col + 1) * TILE) / canvas.width;
    const v1 = ((row + 1) * TILE) / canvas.height;
    uvs.set(name, [u0, v0, u1, v1]);
  }
  return { canvas, uvs, tile: TILE, size: canvas.width };
}
