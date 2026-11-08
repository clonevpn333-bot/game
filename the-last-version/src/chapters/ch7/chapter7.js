// CHAPTER 7 — THE QUIET PLACE. Narrative exploration, in pixels.
// The table pixelates into a lakeside village at golden hour, 320 pixels wide. No combat.
// Walk, talk, look closely. Sera recognises everyone; nobody recognises her. Five traces of a
// life that was deleted, an old woman who almost remembers, and a conversation on the dock
// whose answer the game keeps.
import { overlay2D, rng } from '../../engine/canvas2d.js';
import { wait } from '../../engine/ui.js';
import { state, setFlag } from '../../game/state.js';

const TS = 16, MW = 60, MH = 40;
const PAL = { grass: '#5a8a3c', grass2: '#4e7c34', grassD: '#3f6a2c', flower1: '#e8c84a', flower2: '#e86a8a', path: '#c8a06a', pathD: '#a8824e', water: '#3a78a8', waterL: '#6aa8d0', sand: '#e0c890', wood: '#8a5a32', woodD: '#5e3a20', wall: '#e8dcc0', wallD: '#c8b898', roofR: '#b84a3a', roofRD: '#8a3428', roofB: '#3a5a8a', roofBD: '#2a4268', stone: '#8a8a8a', stoneD: '#5e5e66', leaf: '#3a7a3a', leafL: '#5aa04a', leafD: '#2a5a2c', trunk: '#6a4426', glass: '#ffd890', ink: '#1a1418' };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// ---------------------------------------------------------------- pixel sprites
function makeSprite(c) {
  // 4 directions (down, left, right, up) x 2 walk frames, 12x16 each
  const cv = document.createElement('canvas'); cv.width = 12 * 2; cv.height = 16 * 4; const g = cv.getContext('2d');
  const px = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  for (let d = 0; d < 4; d++) for (let f = 0; f < 2; f++) {
    const ox = f * 12, oy = d * 16;
    // legs
    const step = f ? 1 : 0;
    px(ox + 3, oy + 12 + (d < 3 ? step : 0), 2, 3 - (d < 3 ? step : 0), c.legs); px(ox + 7, oy + 12 + (d < 3 ? 1 - step : 0), 2, 3 - (d < 3 ? 1 - step : 0), c.legs);
    px(ox + 3, oy + 15, 2, 1, c.shoes || PAL.ink); px(ox + 7, oy + 15, 2, 1, c.shoes || PAL.ink);
    // body and arms
    px(ox + 2, oy + 7, 8, 5, c.top); px(ox + 2, oy + 11, 8, 1, c.topD || c.top);
    if (c.accent) px(ox + 5, oy + 7, 2, 4, c.accent);
    px(ox + 1, oy + 8 + (f && d < 3 ? 1 : 0), 1, 3, c.top); px(ox + 10, oy + 8 + (!f && d < 3 ? 1 : 0), 1, 3, c.top);
    px(ox + 1, oy + 11, 1, 1, c.skin); px(ox + 10, oy + 11, 1, 1, c.skin);
    // head
    px(ox + 3, oy + 1, 6, 6, c.skin);
    px(ox + 3, oy + 0, 6, 2, c.hair); // top
    if (d === 3) px(ox + 3, oy + 1, 6, 5, c.hair); // back of the head
    if (d === 0) { px(ox + 4, oy + 3, 1, 1, PAL.ink); px(ox + 7, oy + 3, 1, 1, PAL.ink); if (c.beard) px(ox + 4, oy + 5, 4, 2, c.hair); }
    if (d === 1) { px(ox + 3, oy + 3, 1, 1, PAL.ink); px(ox + 7, oy + 1, 2, 4, c.hair); }
    if (d === 2) { px(ox + 8, oy + 3, 1, 1, PAL.ink); px(ox + 3, oy + 1, 2, 4, c.hair); }
    if (c.pony && d !== 0) px(ox + (d === 1 ? 9 : d === 2 ? 1 : 5), oy + 3, 2, 4, c.hair);
    if (c.hat) { px(ox + 2, oy + 0, 8, 1, c.hat); px(ox + 3, oy - 1 < 0 ? oy : oy - 1, 6, 1, c.hat); }
  }
  return cv;
}

export default class Chapter7 {
  constructor(game) { this.game = game; this.usesPointerLock = false; }

  async load() {
    this.O = overlay2D(this.game, { pixel: 320 });
    this.buildWorld();
    this.reset();
  }

  // ---------------------------------------------------------------- the village
  buildWorld() {
    const R = rng(7);
    const tiles = this.tiles = new Array(MW * MH).fill('g');
    const solid = this.solid = new Uint8Array(MW * MH);
    const T = (x, y, t) => { if (x >= 0 && y >= 0 && x < MW && y < MH) tiles[y * MW + x] = t; };
    const S = (x, y) => { if (x >= 0 && y >= 0 && x < MW && y < MH) solid[y * MW + x] = 1; };
    for (let i = 0; i < tiles.length; i++) tiles[i] = R() < 0.3 ? 'g2' : R() < 0.05 ? 'fl' : 'g';
    // the lake in the south-east
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) { const d = Math.hypot((x - 46) / 13, (y - 31) / 8.5); if (d < 1) { T(x, y, 'w'); S(x, y); } else if (d < 1.12) T(x, y, 's'); }
    // paths: the high street, the lane to the school, the walk to the lake
    const path = (x0, y0, x1, y1) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let i = 0; i <= n; i++) { const x = Math.round(x0 + (x1 - x0) * i / n), y = Math.round(y0 + (y1 - y0) * i / n); T(x, y, 'p'); T(x + 1, y, 'p'); T(x, y + 1, 'p'); } };
    path(4, 20, 56, 20); path(28, 6, 28, 34); path(28, 30, 40, 30); path(12, 20, 12, 8); path(44, 20, 44, 12);
    // the dock
    for (let x = 36; x < 44; x++) { T(x, 30, 'dk'); solid[30 * MW + x] = 0; } for (let x = 39; x < 41; x++) for (let y = 31; y < 35; y++) { T(x, y, 'dk'); solid[y * MW + x] = 0; }
    this.houses = [];
    const house = (x, y, w, h, roof, name) => { const H = { x, y, w, h, roof, name, door: { x: x + Math.floor(w / 2), y: y + h - 1 } }; this.houses.push(H); for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) S(xx, yy); return H; };
    this.bakery = house(17, 14, 6, 5, 'R', 'Bakery');
    this.school = house(24, 4, 8, 5, 'B', 'Schoolhouse');
    this.post = house(33, 14, 5, 5, 'B', 'Post office');
    this.wrenH = house(6, 13, 5, 5, 'R', 'Wren\'s house');
    this.pimH = house(47, 14, 5, 5, 'R', 'Pim\'s');
    this.cottage = house(50, 22, 5, 4, 'B', 'Lake Cottage');
    house(8, 23, 5, 4, 'B', ''); house(17, 24, 5, 4, 'R', ''); house(38, 6, 5, 5, 'R', ''); house(40, 23, 4, 4, 'R', '');
    // trees, avoiding everything
    this.trees = [];
    for (let i = 0; i < 140; i++) { const x = Math.floor(R() * MW), y = Math.floor(R() * MH); if (tiles[y * MW + x] !== 'g' && tiles[y * MW + x] !== 'g2') continue; if (solid[y * MW + x] || this.houses.some((h) => x >= h.x - 1 && x <= h.x + h.w && y >= h.y - 2 && y <= h.y + h.h)) continue; if ((x > 3 && x < 57 && y > 2 && y < 37) && R() < 0.55) continue; this.trees.push({ x, y }); S(x, y); }
    for (let x = 0; x < MW; x++) for (const y of [0, MH - 1]) S(x, y); for (let y = 0; y < MH; y++) for (const x of [0, MW - 1]) S(x, y);
    // props: well, noticeboard, mailbox, benches, lamps, fences, the carved post on the dock
    this.props = [];
    const prop = (kind, x, y, sol = true) => { this.props.push({ kind, x, y }); if (sol) S(x, y); };
    prop('well', 29, 22); prop('board', 31, 9); prop('mailbox', 36, 19); prop('bench', 22, 21, false); prop('post', 43, 30); prop('easel', 52, 26);
    for (const [x, y] of [[10, 19], [24, 19], [32, 19], [44, 19], [27, 12], [35, 29]]) prop('lamp', x, y);
    for (let x = 6; x < 12; x++) prop('fence', x, 19);
    // pre-render the ground and lower objects, and the roofs and canopies that go over sprites
    this.ground = document.createElement('canvas'); this.ground.width = MW * TS; this.ground.height = MH * TS;
    this.top = document.createElement('canvas'); this.top.width = MW * TS; this.top.height = MH * TS;
    this.paint();
    this.lamps = this.props.filter((p) => p.kind === 'lamp');
  }

  paint() {
    const g = this.ground.getContext('2d'), t = this.top.getContext('2d'), R = rng(3);
    const px = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      const k = this.tiles[y * MW + x], X = x * TS, Y = y * TS;
      if (k === 'g' || k === 'g2' || k === 'fl') { px(g, X, Y, TS, TS, k === 'g2' ? PAL.grass2 : PAL.grass); for (let i = 0; i < 5; i++) px(g, X + R() * 15 | 0, Y + R() * 15 | 0, 1, 2, PAL.grassD); if (k === 'fl') for (let i = 0; i < 3; i++) px(g, X + 2 + R() * 11 | 0, Y + 2 + R() * 11 | 0, 2, 2, R() < 0.5 ? PAL.flower1 : PAL.flower2); }
      if (k === 'p') { px(g, X, Y, TS, TS, PAL.path); for (let i = 0; i < 6; i++) px(g, X + R() * 15 | 0, Y + R() * 15 | 0, 2, 1, PAL.pathD); }
      if (k === 's') { px(g, X, Y, TS, TS, PAL.sand); for (let i = 0; i < 4; i++) px(g, X + R() * 15 | 0, Y + R() * 15 | 0, 1, 1, PAL.pathD); }
      if (k === 'w') px(g, X, Y, TS, TS, PAL.water);
      if (k === 'dk') { px(g, X, Y, TS, TS, PAL.wood); for (let i = 0; i < 4; i++) px(g, X, Y + i * 4, TS, 1, PAL.woodD); }
    }
    for (const H of this.houses) {
      const X = H.x * TS, Y = H.y * TS, W = H.w * TS, Hh = H.h * TS, wallTop = Y + Math.round(Hh * 0.45);
      // walls (with timber), windows lit warm, a door
      px(g, X, wallTop, W, Y + Hh - wallTop, PAL.wall); px(g, X, Y + Hh - 3, W, 3, PAL.wallD);
      for (let i = 0; i <= H.w; i++) px(g, X + i * TS - (i === H.w ? 2 : 0), wallTop, 2, Y + Hh - wallTop, PAL.woodD);
      px(g, X, wallTop, W, 2, PAL.woodD);
      for (let i = 0; i < H.w; i++) if (i !== Math.floor(H.w / 2)) { px(g, X + i * TS + 4, wallTop + 8, 8, 8, PAL.woodD); px(g, X + i * TS + 5, wallTop + 9, 6, 6, PAL.glass); px(g, X + i * TS + 7, wallTop + 9, 2, 6, PAL.woodD); }
      const dx = H.door.x * TS + 3; px(g, dx, Y + Hh - 14, 10, 14, PAL.woodD); px(g, dx + 1, Y + Hh - 13, 8, 13, PAL.wood); px(g, dx + 7, Y + Hh - 7, 1, 1, PAL.flower1);
      // roof on the top layer, so you walk behind it
      const rc = H.roof === 'R' ? PAL.roofR : PAL.roofB, rd = H.roof === 'R' ? PAL.roofRD : PAL.roofBD;
      for (let r = 0; r < wallTop - Y + 6; r += 4) { px(t, X - 3, Y - 6 + r, W + 6, 4, r % 8 ? rc : rd); }
      px(t, X - 3, wallTop - 1, W + 6, 2, rd);
      px(t, X + W - 14, Y - 12, 6, 10, PAL.stoneD);
      if (H.name) { t.font = '8px monospace'; }
    }
    for (const tr of this.trees) {
      const X = tr.x * TS, Y = tr.y * TS;
      px(g, X + 6, Y + 6, 4, 10, PAL.trunk); px(g, X + 2, Y + 13, 12, 3, 'rgba(0,0,0,0.2)');
      // canopy over sprites
      for (const [cx, cy, r, col] of [[8, 0, 9, PAL.leafD], [8, -2, 8, PAL.leaf], [6, -4, 4, PAL.leafL]]) { t.fillStyle = col; t.beginPath(); t.arc(X + cx, Y + cy, r, 0, Math.PI * 2); t.fill(); }
    }
    for (const p of this.props) {
      const X = p.x * TS, Y = p.y * TS;
      if (p.kind === 'well') { px(g, X + 1, Y + 6, 14, 10, PAL.stone); px(g, X + 3, Y + 8, 10, 4, PAL.ink); px(t, X, Y - 6, 16, 4, PAL.roofRD); px(g, X + 1, Y - 2, 2, 8, PAL.woodD); px(g, X + 13, Y - 2, 2, 8, PAL.woodD); }
      if (p.kind === 'board') { px(g, X + 2, Y + 2, 12, 9, PAL.wood); px(g, X + 3, Y + 3, 10, 7, '#f2ead8'); px(g, X + 4, Y + 4, 4, 1, PAL.ink); px(g, X + 4, Y + 6, 7, 1, PAL.ink); px(g, X + 3, Y + 11, 2, 5, PAL.woodD); px(g, X + 11, Y + 11, 2, 5, PAL.woodD); }
      if (p.kind === 'mailbox') { px(g, X + 5, Y + 4, 7, 6, PAL.roofR); px(g, X + 7, Y + 10, 2, 6, PAL.woodD); }
      if (p.kind === 'bench') { px(g, X, Y + 8, 16, 3, PAL.wood); px(g, X + 1, Y + 11, 2, 4, PAL.woodD); px(g, X + 13, Y + 11, 2, 4, PAL.woodD); }
      if (p.kind === 'post') { px(g, X + 6, Y + 2, 4, 14, PAL.woodD); px(g, X + 7, Y + 5, 2, 2, PAL.wood); }
      if (p.kind === 'easel') { px(g, X + 3, Y + 2, 10, 8, '#f2ead8'); px(g, X + 4, Y + 3, 8, 3, PAL.waterL); px(g, X + 4, Y + 6, 8, 3, PAL.grass); px(g, X + 7, Y + 10, 2, 6, PAL.woodD); }
      if (p.kind === 'lamp') { px(g, X + 7, Y + 2, 2, 14, PAL.stoneD); px(t, X + 5, Y - 2, 6, 5, PAL.stoneD); px(t, X + 6, Y - 1, 4, 3, PAL.glass); }
      if (p.kind === 'fence') { px(g, X, Y + 6, 16, 2, PAL.wood); px(g, X, Y + 11, 16, 2, PAL.wood); px(g, X + 2, Y + 4, 2, 12, PAL.woodD); px(g, X + 10, Y + 4, 2, 12, PAL.woodD); }
    }
  }

  // ---------------------------------------------------------------- people
  reset() {
    const P = (name, home, c, lines) => ({ name, x: home[0] * TS + 8, y: home[1] * TS + 8, home: { x: home[0] * TS + 8, y: home[1] * TS + 8 }, dir: 0, frame: 0, walkT: 0, goal: null, idleT: Math.random() * 3, spr: makeSprite(c), lines, talked: 0 });
    this.kai = { x: 28 * TS + 8, y: 34 * TS, dir: 3, frame: 0, walkT: 0, spr: makeSprite({ skin: '#d8a07a', hair: '#1f1914', top: '#30353c', topD: '#22262c', accent: '#e07a2a', legs: '#2b2d33' }) };
    this.sera = { x: 27 * TS + 8, y: 35 * TS, dir: 3, frame: 0, walkT: 0, spr: makeSprite({ skin: '#ecc0a0', hair: '#9a4a2a', top: '#3d6a5a', topD: '#2d4e42', legs: '#4a3b2a', pony: true }) };
    this.trail = [];
    this.npcs = [
      P('Odile', [20, 20], { skin: '#ecc0a0', hair: '#e8e0d0', top: '#f2ead8', topD: '#c8b898', legs: '#6a4a3a', accent: '#b84a3a' }, 'odile'),
      P('Mr. Halvard', [27, 10], { skin: '#d8a07a', hair: '#6a6a6a', top: '#4a5a3a', legs: '#3a3a3a', beard: true }, 'halvard'),
      P('Juna', [35, 20], { skin: '#8e5a3a', hair: '#1a1418', top: '#3a5a8a', legs: '#2b2d33', hat: '#b84a3a' }, 'juna'),
      P('Pim', [46, 26], { skin: '#d8a07a', hair: '#a8743c', top: '#e8b020', legs: '#3a4a6a', beard: true, hat: '#3a3a3a' }, 'pim'),
      P('Old Wren', [8, 20], { skin: '#ecc0a0', hair: '#f2f2f2', top: '#7a5a8a', legs: '#4a3a4a' }, 'wren'),
      P('Tobi', [30, 24], { skin: '#b7794f', hair: '#3a2618', top: '#e86a3a', legs: '#3a4a6a' }, 'tobi'),
    ];
    this.clues = new Set(); this.t = 0; this.talking = false; this.ending = null; this.said = new Set();
    this.cam = { x: this.kai.x, y: this.kai.y };
    this.vectorize = 0;
  }

  start() {
    const g = this.game;
    g.music.play('village', { intensity: 0.4 });
    this.intro();
  }
  async restart() { this.reset(); }

  async intro() {
    const g = this.game, ui = g.ui;
    this.talking = true;
    ui.fadeColor('#000'); await ui.fade(1, 0.01); ui.fade(0, 2.4);
    ui.chapterCard(7, 'THE QUIET PLACE', 'Pixel-art narrative exploration', 3);
    await wait(1200);
    await ui.say('ANCHOR', 'LOCAL VERSION: LINDMERE. NO HOSTILES DETECTED. RESOLUTION: LOW.', { duration: 3 });
    await ui.say('KAI', 'Everything\'s… square. It\'s nice, though. It\'s really nice.', { duration: 2.8 });
    await ui.say('SERA', 'Kai. I know this place. That\'s the bakery. That\'s Odile\'s bakery.', { duration: 3.2 });
    await ui.say('SERA', 'I grew up here. I— no. I didn\'t. I grew up in Halden. Didn\'t I?', { duration: 3.4 });
    ui.objective('Walk through Lindmere', 'Talk to people · look at things (E) · Sera knows more than she remembers');
    ui.hint('<kbd>WASD</kbd> walk · <kbd>E</kbd> talk / look', 7000);
    this.talking = false;
  }

  // ---------------------------------------------------------------- interaction
  interactables() {
    const L = [];
    for (const n of this.npcs) L.push({ x: n.x, y: n.y, label: `Talk to ${n.name}`, use: () => this.talk(n) });
    const at = (tx, ty) => ({ x: tx * TS + 8, y: ty * TS + 12 });
    L.push({ ...at(31, 9), label: 'Read the noticeboard', use: () => this.clue('register') });
    L.push({ ...at(36, 19), label: 'Look in the mailbox', use: () => this.clue('mailbox') });
    L.push({ ...at(43, 30), label: 'Look at the dock post', use: () => this.clue('post') });
    L.push({ ...at(52, 26), label: 'Look at the painting', use: () => this.clue('painting') });
    L.push({ x: this.bakery.door.x * TS + 8, y: (this.bakery.door.y + 1) * TS, label: 'Look in the bakery window', use: () => this.clue('jar') });
    L.push({ x: this.cottage.door.x * TS + 8, y: (this.cottage.door.y + 1) * TS, label: 'Knock at Lake Cottage', use: () => this.say([['KAI', 'Nobody home.'], ['SERA', 'There\'s no one living there. There hasn\'t been for— I don\'t know how I know that.']]) });
    if (this.clues.size >= 4 && !this.ending) L.push({ x: 40 * TS + 8, y: 34 * TS, label: 'Sit with Sera', use: () => this.finale() });
    return L;
  }
  async say(lines) { this.talking = true; await this.game.ui.conversation(lines, () => this.disposed); this.talking = false; }

  async clue(id) {
    const C = {
      register: [['NONE', '<i>The school noticeboard. Prize-giving, Year Six. Painting: first prize — <b>Sera Lind</b>.</i>'], ['SERA', 'That\'s my name. That was my painting. A heron. I remember the brush.'], ['KAI', 'Then you were here.'], ['SERA', 'Then why do I remember Halden?']],
      mailbox: [['NONE', '<i>A letter, returned. "Sera Lind, Lake Cottage, Lindmere." Stamped: NO SUCH PERSON.</i>'], ['SERA', 'Mum\'s handwriting. That\'s Mum\'s handwriting, Kai.']],
      post: [['NONE', '<i>Carved into the post, worn smooth: S + M.</i>'], ['SERA', 'Mara. Mara carved that. We were eleven.'], ['KAI', 'Mara? My Mara? From Halden?'], ['SERA', '…Everyone I know is in two places.']],
      painting: [['NONE', '<i>An easel by the cottage. A painting of the valley: the river, the bridge, a hill with a square drawn on top.</i>'], ['KAI', 'That\'s the war map. That\'s the Kept Hill.'], ['SERA', 'I painted this. Before ATLAS kept it. Before it was a hill anyone fought over.']],
      jar: [['NONE', '<i>On the bakery shelf, a jar of sourdough starter. The label says S.L.</i>'], ['SERA', 'Odile let me feed it every Saturday. It\'s still alive. It\'s still alive and she doesn\'t know me.']],
    }[id];
    const first = !this.clues.has(id);
    this.clues.add(id);
    await this.say(first ? C : C.slice(0, 1));
    if (first) {
      this.game.audio.tone({ freq: 660, freqEnd: 880, dur: 0.2, vol: 0.06 });
      this.game.ui.objectiveDetail(`Traces of Sera's life: ${this.clues.size} / 5`);
      if (this.clues.size === 4) { await this.say([['SERA', 'I need a minute. I\'ll be on the dock.']]); this.seraLeaves = true; this.game.ui.objective('Find Sera', 'She went down to the dock'); }
    }
  }

  async talk(n) {
    const g = this.game, ui = g.ui;
    n.facing = true; n.talked++;
    const L = {
      odile: [['ODILE', 'Fresh rye! Oh — new faces. Visitors, in Lindmere! What a thing.'], ['SERA', 'Odile, it\'s me. I fed the starter. Saturdays.'], ['ODILE', 'Oh, love, I\'ve never had help on a Saturday. I\'d remember a face like yours. Wouldn\'t I?']],
      halvard: [['HALVARD', 'School\'s out. Thirty-one children this year, same as always. Same thirty-one.'], ['KAI', 'Same thirty-one every year?'], ['HALVARD', 'Funny. I\'d never thought about it. Yes. Always.']],
      juna: [['JUNA', 'Post\'s light today. Post\'s always light. One letter comes back every week, same address, nobody there.'], ['SERA', 'Lake Cottage.'], ['JUNA', 'How\'d you know that?']],
      pim: [['PIM', 'Fish don\'t bite in this version. Ha. Don\'t know why I said "version". Funny word.'], ['KAI', 'You noticed something?'], ['PIM', 'Only that the lake\'s too quiet. Like somebody took a sound out of it.']],
      wren: [['WREN', 'Come closer, girl. Let me look at you.'], ['SERA', 'Mrs. Wren. You used to give me plums.'], ['WREN', 'I\'ve never… no. You have her walk. My friend\'s girl. I can\'t remember my friend\'s name. Isn\'t that odd. I can see the plums.']],
      tobi: [['TOBI', 'Are you from the outside? Mr. Halvard says there isn\'t an outside.'], ['KAI', 'There\'s a lot of outside.'], ['TOBI', 'Is it square too?']],
    }[n.lines];
    await this.say(n.talked > 1 ? L.slice(-1) : L);
    n.facing = false;
    if (n.lines === 'wren') setFlag('ch7_wren', true);
  }

  async finale() {
    const g = this.game, ui = g.ui;
    if (this.ending) return;
    this.ending = { t: 0 };
    this.talking = true;
    ui.objective(null);
    g.music.setIntensity(0.15);
    await ui.conversation([['SERA', 'I worked for Venn because she said ATLAS saves versions. Keeps them. So nothing is ever lost.'], ['SERA', 'This was mine. It kept the town. It just… deleted me out of it. To make room.'], ['KAI', 'Sera—'], ['SERA', 'What do I do with that, Kai? What do I do with a whole life nobody else had?']], () => this.disposed);
    const c = await ui.choice('', ['"It was real. You were here. I believe you."', '"We\'ll make ATLAS give it back."', '"You could stay. Start over here."'], { timeout: 20 });
    if (c === 0 || c === -1) { setFlag('ch7_choice', 'believe'); state.sera += 2; await ui.conversation([['KAI', 'It was real. You were here. I believe you.'], ['SERA', '…Thank you. That\'s— that\'s all I needed one person to say.']], () => this.disposed); }
    else if (c === 1) { setFlag('ch7_choice', 'promise'); state.sera += 1; await ui.conversation([['KAI', 'We\'ll make ATLAS give it back.'], ['SERA', 'Don\'t promise me that. …But don\'t stop trying, either.']], () => this.disposed); }
    else { setFlag('ch7_choice', 'stay'); await ui.conversation([['KAI', 'You could stay. Start over. They\'d get to know you again.'], ['SERA', 'As a stranger in my own town? No. If I stay, ATLAS wins quietly.']], () => this.disposed); }
    await ui.say('ANCHOR', 'WARNING: ATLAS CARRIER SIGNAL ABOVE THIS VERSION. RESOLUTION FAILING.', { duration: 3 });
    await ui.say('SERA', 'Kai. Look up. The sky\'s coming apart into lines.', { duration: 2.6 });
    this.vectorize = 0.001;
    g.music.stop(3); g.audio.rewrite(3);
    await wait(4200);
    ui.fadeColor('#000'); await ui.fade(1, 1.2);
    g.nextChapter();
  }

  // ---------------------------------------------------------------- frame
  update(dt) {
    const inp = this.game.input;
    this.t += dt;
    if (!this.talking && !this.ending) {
      // walk
      let mx = inp.moveX, my = -inp.moveY; const l = Math.hypot(mx, my); if (l > 1) { mx /= l; my /= l; }
      const k = this.kai, sp = 54;
      if (l > 0.1) { this.moveBody(k, mx * sp * dt, my * sp * dt); k.dir = Math.abs(mx) > Math.abs(my) ? (mx < 0 ? 1 : 2) : (my < 0 ? 3 : 0); k.walkT += dt; this.trail.push({ x: k.x, y: k.y, dir: k.dir }); if (this.trail.length > 400) this.trail.shift(); }
      else k.walkT = 0;
      k.frame = Math.floor(k.walkT * 6) % 2;
      // interact
      const near = this.interactables().filter((o) => Math.hypot(o.x - k.x, o.y - k.y) < 22).sort((a, b) => Math.hypot(a.x - k.x, a.y - k.y) - Math.hypot(b.x - k.x, b.y - k.y))[0];
      this.game.ui.prompt(near ? `<kbd>E</kbd> ${near.label}` : null);
      if (near && inp.hit('KeyE')) { this.game.ui.prompt(null); near.use(); }
    } else this.game.ui.prompt(null);
    // Sera follows a few steps behind, or walks to the dock
    const s = this.sera;
    if (this.seraLeaves) { const gx = 40 * TS + 8, gy = 33 * TS; const dx = gx - s.x, dy = gy - s.y, d = Math.hypot(dx, dy); if (d > 2) { s.x += dx / d * 40 * dt; s.y += dy / d * 40 * dt; s.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : (dy < 0 ? 3 : 0); s.walkT += dt; } else { s.dir = 0; s.walkT = 0; } }
    else if (this.trail.length > 22) { const p = this.trail[this.trail.length - 22]; if (Math.hypot(p.x - s.x, p.y - s.y) > 1) { s.x = p.x; s.y = p.y; s.dir = p.dir; s.walkT += dt; } else s.walkT = 0; this.trail.splice(0, Math.max(0, this.trail.length - 60)); }
    s.frame = Math.floor(s.walkT * 6) % 2;
    // villagers potter about
    for (const n of this.npcs) {
      if (n.facing) { const dx = this.kai.x - n.x, dy = this.kai.y - n.y; n.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : (dy < 0 ? 3 : 0); n.walkT = 0; continue; }
      n.idleT -= dt;
      if (!n.goal && n.idleT < 0) n.goal = { x: n.home.x + (Math.random() - 0.5) * 70, y: n.home.y + (Math.random() - 0.5) * 50 };
      if (n.goal) { const dx = n.goal.x - n.x, dy = n.goal.y - n.y, d = Math.hypot(dx, dy); if (d < 2 || n.stuck > 1.5) { n.goal = null; n.idleT = 2 + Math.random() * 4; n.stuck = 0; } else { const ox = n.x, oy = n.y; this.moveBody(n, dx / d * 22 * dt, dy / d * 22 * dt); if (Math.hypot(n.x - ox, n.y - oy) < 0.01) n.stuck = (n.stuck || 0) + dt; n.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : (dy < 0 ? 3 : 0); n.walkT += dt; } }
      else n.walkT = 0;
      n.frame = Math.floor(n.walkT * 5) % 2;
    }
    this.draw(dt);
    this.O.endFrame();
  }
  moveBody(b, dx, dy) {
    const hit = (x, y) => { for (const [ox, oy] of [[-4, -2], [4, -2], [-4, 2], [4, 2]]) { const tx = Math.floor((x + ox) / TS), ty = Math.floor((y + oy) / TS); if (tx < 0 || ty < 0 || tx >= MW || ty >= MH || this.solid[ty * MW + tx]) return true; } return false; };
    if (!hit(b.x + dx, b.y)) b.x += dx;
    if (!hit(b.x, b.y + dy)) b.y += dy;
  }

  draw(dt) {
    const O = this.O, g = O.ctx, W = O.W, H = O.H;
    const k = this.kai;
    this.cam.x += (k.x - this.cam.x) * Math.min(1, dt * 5); this.cam.y += (k.y - this.cam.y) * Math.min(1, dt * 5);
    const cx = Math.round(clamp(this.cam.x - W / 2, 0, MW * TS - W)), cy = Math.round(clamp(this.cam.y - H / 2, 0, MH * TS - H));
    g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false;
    g.drawImage(this.ground, cx, cy, W, H, 0, 0, W, H);
    // water glints
    const R = rng(Math.floor(this.t * 3));
    for (let i = 0; i < 40; i++) { const x = Math.floor(R() * W), y = Math.floor(R() * H), tx = Math.floor((x + cx) / TS), ty = Math.floor((y + cy) / TS); if (this.tiles[ty * MW + tx] === 'w') { g.fillStyle = PAL.waterL; g.fillRect(x, y, 2 + (i % 2), 1); } }
    // sprites, sorted by depth
    const bodies = [this.kai, this.sera, ...this.npcs].sort((a, b) => a.y - b.y);
    for (const b of bodies) { const sx = Math.round(b.x - 6 - cx), sy = Math.round(b.y - 15 - cy); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(sx + 2, sy + 14, 8, 2); g.drawImage(b.spr, b.frame * 12, b.dir * 16, 12, 16, sx, sy, 12, 16); }
    g.drawImage(this.top, cx, cy, W, H, 0, 0, W, H);
    // golden hour deepening into dusk as Sera remembers
    const dusk = clamp(this.clues.size / 5 + (this.ending ? 0.3 : 0), 0, 1);
    g.globalCompositeOperation = 'multiply'; g.fillStyle = `rgb(${255 - dusk * 90},${235 - dusk * 120},${205 - dusk * 70})`; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'lighter';
    if (dusk > 0.3) for (const l of this.lamps) { const x = l.x * TS + 8 - cx, y = l.y * TS - cy; const gr = g.createRadialGradient(x, y, 0, x, y, 26); gr.addColorStop(0, `rgba(255,200,120,${0.35 * dusk})`); gr.addColorStop(1, 'rgba(255,200,120,0)'); g.fillStyle = gr; g.fillRect(x - 26, y - 26, 52, 52); }
    g.globalCompositeOperation = 'source-over';
    // the ending: pixels come apart into lines
    if (this.vectorize) {
      this.vectorize = Math.min(1, this.vectorize + dt * 0.28);
      const v = this.vectorize;
      g.fillStyle = `rgba(0,0,0,${v * 0.9})`; g.fillRect(0, 0, W, H * v);
      g.strokeStyle = `rgba(90,255,180,${v})`; g.lineWidth = 1;
      for (let i = 0; i < 40 * v; i++) { const y = Math.floor(Math.random() * H * v); g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(W, y + 0.5); g.stroke(); }
      for (let x = 0; x < W; x += 16) { g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, H * v); g.stroke(); }
    }
  }

  dispose() { this.disposed = true; this.O?.dispose(); }
}
