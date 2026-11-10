// Chapter 1 level: one continuous run across the pixel district.
// rooftops → collapsing skybridge → wall-jump shaft → the 5:15 express →
// the foundry → GRIDLOCK's control hall.
import { T, TS, isSolid } from './tiles.js';
import { hash2 } from '../core/util.js';

export class Level {
  constructor(W, H) {
    this.W = W; this.H = H;
    this.tiles = new Uint8Array(W * H); this.back = new Uint8Array(W * H);
    this.theme = new Uint8Array(W);          // per column: 0 roof, 1 factory
    this.crumble = new Map();                // index -> {t, stage}
    this.spawns = []; this.checkpoints = []; this.signs = []; this.triggers = []; this.decor = [];
    this.hidden = null;                      // {x0}: columns >= x0 are not yet "arrived"
  }
  idx(x, y) { return y * this.W + x; }
  get(x, y) {
    if (x < 0 || x >= this.W) return T.SOLID;
    if (y < 0 || y >= this.H) return T.EMPTY;
    return this.tiles[y * this.W + x];
  }
  set(x, y, t) { if (x >= 0 && y >= 0 && x < this.W && y < this.H) this.tiles[y * this.W + x] = t; }
  fill(x, y, w, h, t = T.SOLID) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, t); }
  ground(x, yTop, w) { this.fill(x, yTop, w, this.H - yTop, T.SOLID); }
  plat(x, y, w, t = T.ONEWAY) { this.fill(x, y, w, 1, t); }
  bfill(x, y, w, h, k = 1) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const X = x + i, Y = y + j; if (X >= 0 && Y >= 0 && X < this.W && Y < this.H) this.back[Y * this.W + X] = k; } }
  themeRange(x0, x1, th) { for (let x = x0; x < x1; x++) this.theme[x] = th; }
  spawn(type, tx, ty, opts = {}) { this.spawns.push({ type, x: tx * TS + TS / 2, y: ty * TS, ...opts }); }
  checkpoint(id, tx, ty) { this.checkpoints.push({ id, x: tx * TS + 8, y: ty * TS }); }
  sign(tx, ty, text, color = 'c') { this.signs.push({ x: tx * TS, y: ty * TS, text, color }); }
  trigger(id, tx, ty = 0, w = 1, h = 99) { this.triggers.push({ id, x: tx * TS, y: ty * TS, w: w * TS, h: h * TS, fired: false }); }
  solidTile(x, y) { return isSolid(this.get(x, y)); }
  // exposure mask for autotiling
  mask(x, y) {
    const s = (a, b) => isSolid(this.get(a, b)) || (b >= this.H);
    return (s(x, y - 1) ? 0 : 1) | (s(x + 1, y) ? 0 : 2) | (s(x, y + 1) ? 0 : 4) | (s(x - 1, y) ? 0 : 8);
  }
  variant(x, y) { return Math.floor(hash2(x, y) * 20); }
}

export const TRAIN = { cars: [143, 157, 171, 185, 199], loco: 213, len: 12, roofY: 23, dockX: 226 };
export const BOSS_ROOM = { x0: 336, x1: 362, floorY: 23, ceilY: 13 };

export function buildLevel() {
  const L = new Level(366, 40);
  L.themeRange(0, 226, 0); L.themeRange(226, 366, 1);

  // ---------------------------------------------------------------- S1 rooftops
  L.ground(0, 30, 19);
  L.ground(22, 29, 19);
  L.ground(43, 26, 12);
  L.plat(57, 24, 4); L.plat(63, 22, 4);
  L.ground(69, 27, 3);
  L.checkpoint('start', 3, 30);
  L.sign(5, 25, 'A D  MOVE', 'c'); L.sign(13, 25, 'SPACE  JUMP', 'c');
  L.sign(24, 24, 'J  STRIKE X3', 'O'); L.sign(34, 24, 'L  FRAME SHOT', 'O');
  L.sign(44, 21, 'JUMP TWICE', 'c');
  L.spawn('crate', 27, 29); L.spawn('crate', 28, 29); L.spawn('crate', 28, 28);
  L.spawn('scrapper', 31, 29); L.spawn('scrapper', 37, 29);
  L.spawn('wasp', 50, 22); L.spawn('scrapper', 52, 26);
  L.spawn('barrel', 47, 26);
  L.decor.push({ k: 'ac', x: 8, y: 30 }, { k: 'antenna', x: 16, y: 30 }, { k: 'ac', x: 38, y: 29 }, { k: 'antenna', x: 23, y: 29 }, { k: 'tank', x: 53, y: 26 }, { k: 'antenna', x: 44, y: 26 });

  // ---------------------------------------------------------------- S2 collapse
  L.fill(72, 27, 28, 2, T.GIRDER);
  L.fill(81, 27, 3, 2, T.EMPTY); L.fill(91, 27, 3, 2, T.EMPTY);
  L.collapse = { x0: 72, x1: 100, y: 27, h: 2, started: false, x: 72, t: 0 };
  L.sign(70, 22, 'SHIFT  DASH', 'O');
  L.trigger('collapse', 73);
  L.spawn('wasp', 80, 21); L.spawn('wasp', 90, 20); L.spawn('wasp', 97, 21);
  L.ground(100, 27, 8);
  L.fill(103, 5, 1, 19, T.SOLID);                 // shaft left wall (opening rows 24-26)
  L.fill(108, 14, 24, 26, T.SOLID);               // high roof block (its left face is the shaft's right wall)
  L.plat(104, 20, 2);
  L.sign(104, 24, 'KICK OFF WALLS', 'c');
  L.checkpoint('shaft', 101, 27);
  L.checkpoint('highroof', 110, 14);
  L.trigger('vell1', 112);
  L.spawn('sentry', 119, 14, { face: -1 }); L.spawn('scrapper', 123, 14); L.spawn('scrapper', 127, 14); L.spawn('crate', 116, 14); L.spawn('barrel', 125, 14);
  L.sign(112, 9, 'UP + J  LAUNCHER', 'O');
  L.decor.push({ k: 'tank', x: 129, y: 14 }, { k: 'antenna', x: 109, y: 14 }, { k: 'ac', x: 121, y: 14 });

  // ---------------------------------------------------------------- S3 station + train
  L.ground(132, 24, 10);
  L.checkpoint('station', 134, 24);
  L.sign(133, 19, 'PLATFORM 9', 'm');
  L.decor.push({ k: 'bench', x: 136, y: 24 }, { k: 'lamp', x: 140, y: 24 });
  for (const c of [...TRAIN.cars, TRAIN.loco]) L.fill(c, TRAIN.roofY, TRAIN.len, 3, T.TRAIN);
  L.fill(TRAIN.loco + TRAIN.len, TRAIN.roofY, 1, 3, T.TRAIN);   // nose buffer, flush with the dock
  L.trigger('train', TRAIN.cars[0] + 2, 0, 3);

  // ---------------------------------------------------------------- S4 foundry
  L.hidden = { x0: TRAIN.dockX };
  const F0 = 226;
  L.fill(F0, 0, 140, 12, T.SOLID);                // roof mass
  L.ground(F0, 23, 8);                            // dock (level with the train roof)
  L.fill(F0, 12, 1, 7, T.SOLID);                  // facade above the dock door
  L.bfill(F0, 12, 140, 28, 1);
  L.checkpoint('dock', 229, 23);
  L.ground(234, 26, 58);                          // main floor
  // conveyor hall
  L.fill(238, 26, 9, 1, T.CONV_R); L.fill(248, 26, 7, 1, T.CONV_L);
  L.plat(250, 22, 4, T.ONEWAY);
  L.spawn('scrapper', 242, 26); L.spawn('scrapper', 252, 26); L.spawn('sentry', 252, 22, { face: -1 });
  L.spawn('barrel', 245, 26); L.spawn('crate', 240, 26);
  L.sign(236, 21, 'DOWN + SHIFT  SLIDE', 'O');
  // crusher gauntlet
  L.fill(258, 26, 16, 1, T.CONV_L);
  for (let i = 0; i < 4; i++) L.spawn('crusher', 259 + i * 4, 12, { phase: i * 0.55, bottom: 26 });
  // low duct (slide)
  L.fill(277, 12, 7, 13, T.SOLID);
  L.spawn('scrapper', 286, 26);
  // lift room
  L.fill(292, 17, 74, 23, T.SOLID);               // upper floor from x=292
  L.fill(288, 26, 3, 1, T.EMPTY);                 // lift well
  L.spawn('lift', 288, 26, { y0: 26, y1: 17, w: 3 });
  L.spawn('wasp', 289, 18); L.spawn('wasp', 295, 14); L.spawn('sentry', 299, 17, { face: -1 });
  L.checkpoint('lift', 294, 17);
  // bulwark arena (raised ceiling)
  L.fill(303, 6, 20, 6, T.EMPTY); L.bfill(303, 6, 20, 6, 1);
  L.trigger('arena', 306);
  L.plat(307, 13, 3); L.plat(316, 13, 3);
  L.sign(305, 10, 'HEAVY HITS BREAK GUARDS', 'O');
  // corridor to the control hall
  L.checkpoint('preboss', 327, 17);
  L.trigger('vell2', 325);
  L.spawn('crate', 330, 17); L.spawn('crate', 331, 17);
  // ---------------------------------------------------------------- S5 control hall
  const B = BOSS_ROOM;
  L.fill(334, 12, 2, 28, T.SOLID);                // dividing wall …
  L.fill(334, 13, 2, 4, T.EMPTY);                 // … with the entrance window
  L.fill(B.x0, B.ceilY, B.x1 - B.x0, B.floorY - B.ceilY, T.EMPTY);
  L.fill(B.x0, B.floorY, B.x1 - B.x0, L.H - B.floorY, T.SOLID);
  L.fill(B.x1, 0, 4, L.H, T.SOLID);
  L.fill(B.x0, 12, B.x1 - B.x0, 1, T.SOLID);
  L.bfill(B.x0, B.ceilY, B.x1 - B.x0, B.floorY - B.ceilY, 1);
  L.trigger('boss', B.x0 + 3);

  // back-wall dressing for the foundry (deterministic sprinkle)
  for (let y = 12; y < 38; y++) for (let x = F0; x < L.W; x++) {
    if (!L.back[L.idx(x, y)]) continue;
    const h = hash2(x * 3 + 1, y * 5 + 2);
    let k = 1;
    if (y % 6 === 2 && h < 0.8) k = 3; else if (x % 9 === 4 && h < 0.85) k = 4; else if (h < 0.035) k = 6; else if (h < 0.07) k = 2; else if (h < 0.085) k = 9; else if (y % 6 === 5 && x % 4 === 0) k = 5; else if (h > 0.985) k = 8;
    if (y === 13 && x % 6 === 3 && L.get(x, 12) === T.SOLID && x < 334) k = 7;
    L.back[L.idx(x, y)] = k;
  }
  return L;
}
