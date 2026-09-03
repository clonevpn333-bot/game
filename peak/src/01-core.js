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
  ST_CLIMB: 8.6,        // per second on the wall
  ST_HANG: 3.4,         // per second just holding on
  ST_SPRINT: 9.0,
  ST_JUMP: 9, ST_LUNGE: 17,
  ST_REGEN: 26,         // on the ground, once you have stood still a moment
  ST_REGEN_PITON: 14,
  ST_REGEN_DELAY: 0.45,
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
// Six slots, bottom to top, in fixed order.  Each one asks something
// different of you and looks nothing like its neighbours.
var Z = { SHORE: 0, JUNGLE: 1, SNOW: 2, VOLCANIC: 3, INTERIOR: 4, PEAK: 5 };
var ZONES = [
  { id: 0, name: 'the shore', top: 27, fire: 20 },
  { id: 1, name: 'the jungle', top: 96, fire: 89 },
  { id: 2, name: 'the snow face', top: 166, fire: 159 },
  { id: 3, name: 'the volcanic rock', top: 229, fire: 222 },
  { id: 4, name: 'the caldera', top: 278, fire: 271 },
  { id: 5, name: 'the peak', top: 9999, fire: -1 },
];
function zoneAt(y) {
  for (var i = 0; i < ZONES.length; i++) if (y < ZONES[i].top) return i;
  return ZONES.length - 1;
}

// surface kinds - cosmetic and hazard only.  Every one of them is climbable.
var SF = { ROCK: 0, SAND: 1, GRASS: 2, LEAF: 3, MUD: 4, SNOW: 5, ICE: 6, BASALT: 7, EMBER: 8, THORN: 9 };

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
