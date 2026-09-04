// ---------------------------------------------------------------- constants
var K = {
  GRID: 268,            // heightfield cells per side
  CELL: 1.9,            // world units per cell
  SUMMIT_H: 302,        // summit altitude
  BASE_R: 215,          // radius where the mountain meets the sea

  GRAV: 26,
  WALK: 5.0, SPRINT: 8.4, CROUCH: 2.3,
  ACC_G: 46, ACC_A: 11, FRIC: 13.5,
  JUMP_V: 8.2,
  WALK_COS: 0.60,       // steeper than ~53 deg and boots stop holding

  // Climbing: you hold on, you move, and it costs you the whole time.
  CLIMB_UP: 2.25, CLIMB_SIDE: 2.7, CLIMB_DOWN: 3.2,
  GRAB_REACH: 1.15,     // how far in front a wall can be and still be grabbed
  WALL_OFF: 0.44,       // how far the body hangs off the face
  SLIP_ACC: 11,         // downward acceleration once the grip fails
  SLIP_MAX: 13,

  ST_MAX: 100,          // the bar is always 100 wide; statuses eat into it
  ST_CLIMB: 6.4,        // per second on the wall: a full bar is ~15s of climbing
  ST_HANG: 2.2,         // per second just holding on - cheap enough to stop and look
  ST_SPRINT: 9.0,
  ST_JUMP: 9, ST_LUNGE: 17,
  ST_REGEN: 26,         // on the ground, once you have stood still a moment
  ST_REGEN_PITON: 14,
  ST_REGEN_DELAY: 0.45,
  GRIP_GRACE: 1.1,      // seconds of scrabbling before the grip actually goes
  EXTRA_MAX: 100,       // bonus stamina: climb-only, never regenerates

  HP_MAX: 100,
  FALL_SAFE: 4.6,
  FALL_DMG: 4.4,
  INJ_DMG: 18,

  HUNGER_RATE: 0.42,    // hunger status creeps up over a run
  OUT_T_SOLO: 22,       // seconds unconscious before you die, alone
  OUT_T_TEAM: 75,       // much longer with mates around to help

  ROPE_LEN: 26,
  HAND_REACH: 6.5,      // how far a helping hand extends
  REVIVE_T: 3.4,
  CARRY_MUL: 0.56,

  EYE: 1.5,
  R_BODY: 0.42,
  H_BODY: 1.78,

  NET_HZ: 15,
  FOG_RISE_START: 150,  // seconds of grace before the fog starts climbing
  FOG_RISE_RATE: 0.55,  // metres per second after that
};

var SLOT_COL = [0xff8a3d, 0x31c6c0, 0xffd646, 0xa274ff];
var SLOT_HEX = ['#ff8a3d', '#31c6c0', '#ffd646', '#a274ff'];
var SLOT_NAME = ['orange', 'teal', 'yellow', 'purple'];

// ---------------------------------------------------------------- zones
// Six slots, bottom to top, in fixed order.  Which biome fills the middle
// four is rolled per island, the way PEAK swaps its variant biomes in and
// out - so the shape of a run is constant but the places are not.
var Z = { SHORE: 0, LOWER: 1, MIDDLE: 2, UPPER: 3, INNER: 4, PEAK: 5 };
var ZONES = [
  { id: 0, top: 27, fire: 20 },
  { id: 1, top: 96, fire: 89 },
  { id: 2, top: 166, fire: 159 },
  { id: 3, top: 229, fire: 222 },
  { id: 4, top: 278, fire: 271 },
  { id: 5, top: 9999, fire: -1 },
];
function zoneAt(y) {
  for (var i = 0; i < ZONES.length; i++) if (y < ZONES[i].top) return i;
  return ZONES.length - 1;
}

// Ten biomes.  Each carries its own palette, sky, weather and hazard; the
// terrain underneath is the same height field either way.
var BIOMES = {
  shore: {
    nm: 'the shore', props: 'shore', weather: 'clear', haz: 'none',
    pal: { top: 0xe8d49a, top2: 0x8cc456, cliff: 0xb2a081, alt: 0xd6c08c },
    sky: { low: 0xffe0b0, mid: 0x8fc8ee, high: 0x3f86d8, sun: 0xfff0c8, fog: 0xf0dcb8, dens: 0.0036, el: 0.20, amb: 0.92, sunI: 1.10 },
  },
  tropics: {
    nm: 'the tropics', props: 'tropics', weather: 'rain', haz: 'poison',
    pal: { top: 0x3b8a38, top2: 0x27612e, cliff: 0x4a3826, alt: 0x54a03e },
    sky: { low: 0xdfd9a8, mid: 0x86bfe2, high: 0x3f7fcc, sun: 0xfff0cc, fog: 0xd8dcb8, dens: 0.0042, el: 0.28, amb: 0.95, sunI: 1.05 },
  },
  roots: {
    nm: 'the roots', props: 'roots', weather: 'spore', haz: 'spore',
    pal: { top: 0x5c4a7a, top2: 0x3f3358, cliff: 0x3a2c22, alt: 0x7a5aa0 },
    sky: { low: 0xc8a8e0, mid: 0x6a5a96, high: 0x2a2246, sun: 0xe8c8ff, fog: 0x6a5a86, dens: 0.0060, el: 0.24, amb: 0.78, sunI: 0.85 },
  },
  alpine: {
    nm: 'the alpine', props: 'alpine', weather: 'snow', haz: 'cold',
    pal: { top: 0xeef4fa, top2: 0xdbe6f2, cliff: 0x79828f, alt: 0xa8dcef },
    sky: { low: 0xe6eef6, mid: 0x93c4ea, high: 0x2f6ec2, sun: 0xfff4e2, fog: 0xdae6f2, dens: 0.0030, el: 0.44, amb: 0.96, sunI: 1.30 },
  },
  mesa: {
    nm: 'the mesa', props: 'mesa', weather: 'dust', haz: 'sun',
    pal: { top: 0xd88f4a, top2: 0xc4763a, cliff: 0x8f4e2c, alt: 0xe8b06a },
    sky: { low: 0xffd08a, mid: 0x8fc0e0, high: 0x3f7fbc, sun: 0xfff2c0, fog: 0xe8c095, dens: 0.0040, el: 0.52, amb: 1.02, sunI: 1.45 },
  },
  caldera: {
    nm: 'the caldera', props: 'caldera', weather: 'ash', haz: 'heat',
    pal: { top: 0x4a3f48, top2: 0x3a3038, cliff: 0x2f2830, alt: 0x5c4a44 },
    sky: { low: 0xffab68, mid: 0x7a9fc8, high: 0x2a4f96, sun: 0xffc07a, fog: 0xc9b2a4, dens: 0.0028, el: 0.34, amb: 0.72, sunI: 1.15 },
  },
  gloom: {
    nm: 'the gloom', props: 'gloom', weather: 'murk', haz: 'drowsy',
    pal: { top: 0x3a2f4e, top2: 0x2a2138, cliff: 0x241d2e, alt: 0x4a3a62 },
    sky: { low: 0x6a4a8a, mid: 0x3a2f52, high: 0x160f24, sun: 0x9a7ac0, fog: 0x4a3868, dens: 0.0090, el: 0.18, amb: 0.55, sunI: 0.45 },
  },
  kiln: {
    nm: 'the kiln', props: 'kiln', weather: 'ash', haz: 'kiln',
    pal: { top: 0x2c2430, top2: 0x241d26, cliff: 0x1d1721, alt: 0x3a2c2e },
    sky: { low: 0x8a3a18, mid: 0x3f3a4c, high: 0x1a1826, sun: 0xff8a3a, fog: 0x2e2630, dens: 0.0036, el: 0.22, amb: 0.50, sunI: 0.75 },
  },
  citadel: {
    nm: 'the citadel', props: 'citadel', weather: 'wind', haz: 'wind',
    pal: { top: 0x9a9488, top2: 0x827c72, cliff: 0x5e594f, alt: 0xb0a894 },
    sky: { low: 0xd8c8b0, mid: 0x6a7f9e, high: 0x223250, sun: 0xffe0b0, fog: 0x8a8a96, dens: 0.0050, el: 0.30, amb: 0.72, sunI: 0.95 },
  },
  peak: {
    nm: 'the peak', props: 'peak', weather: 'snow', haz: 'cold',
    pal: { top: 0xf2f7fc, top2: 0xe2ecf6, cliff: 0x8b93a0, alt: 0xb9c6d4 },
    sky: { low: 0xffc78a, mid: 0x63a6e4, high: 0x123a86, sun: 0xfff0d0, fog: 0xc6d6e8, dens: 0.0016, el: 0.62, amb: 0.92, sunI: 1.55 },
  },
};

// which biomes can fill each slot
var SLOT_POOL = [
  ['shore'],
  ['tropics', 'roots'],
  ['alpine', 'mesa'],
  ['caldera', 'gloom'],
  ['kiln', 'citadel'],
  ['peak'],
];

// the island as rolled for this run
var Run = { pick: ['shore', 'tropics', 'alpine', 'caldera', 'kiln', 'peak'] };
Run.roll = function (seed) {
  var r = makeRng(seed ^ 0x1a2b3c4d);
  Run.pick = SLOT_POOL.map(function (pool) { return pool[(r() * pool.length) | 0]; });
  return Run.pick;
};
Run.at = function (slot) { return BIOMES[Run.pick[slot]]; };
function biomeAt(y) { return Run.at(zoneAt(y)); }
function biomeIs(y, id) { return Run.pick[zoneAt(y)] === id; }

// surface kinds - cosmetic and hazard only.  Every one of them is climbable.
var SF = { ROCK: 0, SAND: 1, GRASS: 2, LEAF: 3, MUD: 4, SNOW: 5, ICE: 6, BASALT: 7, EMBER: 8, THORN: 9,
           SPORE: 10, CLAY: 11, MURK: 12, BRICK: 13, SHADE: 14 };

// player states
var ST = { GROUND: 0, AIR: 1, CLIMB: 2, SLIP: 3, OUT: 4, CARRIED: 5 };

// ---------------------------------------------------------------- statuses
// Each one eats a slice off the right-hand end of the stamina bar.
var STATUS = [
  { k: 'weight', nm: 'weight', col: '#c9a06a', ic: '⚖' },
  { k: 'hunger', nm: 'hunger', col: '#e0873a', ic: '◔' },
  { k: 'injury', nm: 'injury', col: '#d94a3d', ic: '✚' },
  { k: 'poison', nm: 'poison', col: '#7fc23a', ic: '☠' },
  { k: 'cold', nm: 'cold', col: '#6fc4ee', ic: '❄' },
  { k: 'heat', nm: 'heat', col: '#ff7a2a', ic: '▲' },
  { k: 'thorns', nm: 'thorns', col: '#b06ad0', ic: '✦' },
  { k: 'drowsy', nm: 'drowsy', col: '#8a8fb0', ic: '☾' },
  { k: 'curse', nm: 'curse', col: '#6a3f8f', ic: '✧' },
];

// ---------------------------------------------------------------- math bits
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, t) { return a + (b - a) * t; }
function smooth(t) { return t * t * (3 - 2 * t); }
function smoother(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
function invl(a, b, v) { return b === a ? 0 : clamp((v - a) / (b - a), 0, 1); }
function step01(e0, e1, x) { return smooth(invl(e0, e1, x)); }
function damp(cur, tgt, rate, dt) { return lerp(cur, tgt, 1 - Math.exp(-rate * dt)); }
function angWrap(a) { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; }
function angLerp(a, b, t) { return a + angWrap(b - a) * t; }

// ---------------------------------------------------------------- rng
function makeRng(seed) {
  var s = seed >>> 0 || 1;
  return function () {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}
function rngRange(r, a, b) { return a + r() * (b - a); }

var CODE_ABC = 'ACDEFGHJKLMNPQRTUVWXY34679';
function makeCode() {
  var s = '';
  for (var i = 0; i < 4; i++) s += CODE_ABC[(Math.random() * CODE_ABC.length) | 0];
  return s;
}
function codeToSeed(code) {
  var h = 2166136261;
  for (var i = 0; i < code.length; i++) { h ^= code.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
// The mountain itself rerolls on a daily schedule, so everyone climbing the
// same day gets the same rock; loot rerolls every run.
function dailySeed() {
  var d = new Date();
  return codeToSeed('' + d.getUTCFullYear() + '-' + (d.getUTCMonth() + 1) + '-' + d.getUTCDate());
}

// ---------------------------------------------------------------- colours
function mixHex(a, b, t) {
  var ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  var br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (((ar + (br - ar) * t) | 0) << 16) | (((ag + (bg - ag) * t) | 0) << 8) | ((ab + (bb - ab) * t) | 0);
}
function shadeHex(c, m) {
  var r = clamp(((c >> 16) & 255) * m, 0, 255) | 0;
  var g = clamp(((c >> 8) & 255) * m, 0, 255) | 0;
  var b = clamp((c & 255) * m, 0, 255) | 0;
  return (r << 16) | (g << 8) | b;
}

function fmtTime(s) {
  var m = (s / 60) | 0;
  return m + ':' + String((s % 60) | 0).padStart(2, '0');
}
function now() { return performance.now() / 1000; }
