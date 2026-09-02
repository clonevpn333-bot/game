// ---------------------------------------------------------------- constants
var K = {
  GRID: 268,            // heightfield cells per side
  CELL: 1.9,            // world units per cell
  SUMMIT_H: 302,        // summit altitude
  BASE_R: 215,          // radius where the mountain meets the plain

  BAND_ROCK: 56,        // grass -> rock
  BAND_ALP: 152,        // rock -> alpine
  BAND_TOP: 244,        // alpine -> volcanic summit

  GRAV: 26,
  WALK: 5.15, SPRINT: 8.5, CROUCH: 2.4,
  ACC_G: 46, ACC_A: 11, FRIC: 13.5,
  JUMP_V: 8.35,
  WALK_COS: 0.667,      // cos(48deg): steeper than this must be climbed
  SLIDE_COS: 0.54,      // steeper than this and you slide while standing

  CLIMB_UP: 2.15, CLIMB_SIDE: 2.6, CLIMB_DOWN: 3.1,
  GRAB_DIST: 0.95,      // how far ahead a wall can be and still be grabbed
  WALL_OFF: 0.42,       // how far the body floats off the wall face

  ST_MAX: 100,
  ST_CLIMB: 7.1,        // per second, base
  ST_SPRINT: 8.4,
  ST_JUMP: 11, ST_LEAP: 26,
  ST_REGEN_FLAT: 17.5, ST_REGEN_LEDGE: 9.5,

  HP_MAX: 100,
  FALL_SAFE: 4.6,       // metres of free fall that cost nothing
  FALL_DMG: 4.25,       // hp per metre beyond that
  INJ_DMG: 17,          // damage in one hit that leaves an injury

  HU_MAX: 100, HU_RATE: 0.30, HU_CHOKE: 36,
  TP_MAX: 100, TP_FREEZE: 22,

  ROPE_LEN: 15.5,
  REVIVE_T: 4.0,
  DOWN_T: 34,           // seconds downed before respawning at the last fire
  CARRY_MUL: 0.56,

  EYE: 1.44,            // eye height above feet
  R_BODY: 0.42,
  H_BODY: 1.72,

  NET_HZ: 15,
  MAX_SLOT: 4,
};

var SLOT_COL = [0xff8a3d, 0x31c6c0, 0xffd646, 0xa274ff];
var SLOT_HEX = ['#ff8a3d', '#31c6c0', '#ffd646', '#a274ff'];
var SLOT_NAME = ['orange', 'teal', 'yellow', 'purple'];

// surface kinds written into the terrain grid
var SF = { ROCK: 0, ICE: 1, LOOSE: 2, VINE: 3, SNOW: 4, GRASS: 5, DIRT: 6, EMBER: 7 };

// player states
var ST = { GROUND: 0, AIR: 1, CLIMB: 2, DOWN: 3, CARRIED: 4 };

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
function sign(v) { return v < 0 ? -1 : v > 0 ? 1 : 0; }

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
function rngPick(r, arr) { return arr[(r() * arr.length) | 0]; }

// short shareable room codes, no ambiguous glyphs
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

// ---------------------------------------------------------------- misc
function fmtTime(s) {
  var m = (s / 60) | 0;
  return m + ':' + String((s % 60) | 0).padStart(2, '0');
}
function now() { return performance.now() / 1000; }
