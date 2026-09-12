/* =============================================================
 * BREACHPOINT — global configuration & tunables
 * ============================================================= */
(function (root) {
  'use strict';
  var CS = (root.CS = root.CS || {});

  var C = {};

  C.NAME = 'BREACHPOINT';
  C.VERSION = '1.0.0';
  C.PROTOCOL = 7;            // bumped on netcode changes; peers must match

  /* ---- Simulation ---- */
  C.TICK_RATE = 64;
  C.TICK_DT = 1 / 64;
  C.SNAPSHOT_RATE = 22;      // host -> clients
  C.CMD_RATE = 64;           // client -> host
  C.INTERP_DELAY = 0.09;     // s of entity interpolation buffer
  C.LAGCOMP_MAX = 0.25;      // max rewind seconds
  C.HISTORY_SECONDS = 1.0;

  /* ---- Player dimensions (meters) ---- */
  C.PLAYER_RADIUS = 0.40;    // half-width of the AABB (CS: 32u wide)
  C.STAND_HEIGHT = 1.83;     // 72u
  C.CROUCH_HEIGHT = 1.37;    // 54u
  C.EYE_STAND = 1.63;        // 64u
  C.EYE_CROUCH = 1.17;       // 46u
  C.STEP_HEIGHT = 0.46;      // 18u
  C.DUCK_TIME = 0.28;        // s to fully crouch

  /* ---- Movement (Source-derived, converted from units to meters) ---- */
  C.GRAVITY = 20.32;         // 800 u/s^2
  C.JUMP_SPEED = 7.65;       // 301 u/s
  C.MAX_SPEED = 6.35;        // 250 u/s — scaled per weapon
  C.WALK_SCALE = 0.52;       // shift-walk
  C.CROUCH_SCALE = 0.34;
  C.FRICTION = 5.2;
  C.STOP_SPEED = 2.03;       // 80 u/s
  C.ACCELERATE = 5.5;
  C.AIR_ACCELERATE = 12.0;
  C.AIR_WISH_CAP = 0.76;     // 30 u/s — enables strafe-jumping, caps bunnyhop gain
  C.MAX_AIR_SPEED = 8.9;     // hard clamp so bhop cannot run away
  C.LADDER_SPEED = 3.5;
  C.FALL_DAMAGE_START = 6.9; // m/s vertical at impact before damage begins
  C.FALL_DAMAGE_SCALE = 13.0;
  C.JUMP_COOLDOWN = 0.20;    // anti-autobhop-spam

  /* ---- Combat ---- */
  C.MAX_HEALTH = 100;
  C.MAX_ARMOR = 100;
  C.HITGROUP = { HEAD: 0, CHEST: 1, STOMACH: 2, ARM: 3, LEG: 4 };
  C.HITGROUP_MULT = [4.0, 1.0, 1.25, 0.75, 0.75];
  C.HITGROUP_NAME = ['head', 'chest', 'stomach', 'arm', 'leg'];
  C.ARMOR_RATIO_DEFAULT = 0.5;

  /* ---- Round flow ---- */
  C.PHASE = {
    WARMUP: 'warmup',
    FREEZE: 'freeze',     // buy time, players frozen
    LIVE: 'live',
    ENDED: 'ended',       // round-end banner
    HALFTIME: 'halftime',
    MATCH_END: 'matchend'
  };

  C.DEFAULT_RULES = {
    mode: 'competitive',
    maxRounds: 24,          // MR12 -> first to 13
    winRounds: 13,
    halftimeAt: 12,
    overtime: true,
    otMaxRounds: 6,         // MR3
    otStartMoney: 10000,
    roundTime: 115,         // 1:55
    freezeTime: 15,
    buyTime: 20,
    bombTime: 40,
    defuseTime: 10,
    defuseTimeKit: 5,
    plantTime: 3.2,
    startMoney: 800,
    maxMoney: 16000,
    friendlyFire: false,
    friendlyFireScale: 0.33,
    teamBalance: true,
    afkKickSeconds: 120,
    botDifficulty: 'normal',
    botFill: true,
    teamSize: 5
  };

  C.MODE_PRESETS = {
    competitive: {
      label: 'Competitive', desc: '5v5 · MR12 · Bomb defusal · Full economy',
      rules: {}
    },
    casual: {
      label: 'Casual', desc: 'Relaxed rules · Free armor · First to 9',
      rules: {
        maxRounds: 16, winRounds: 9, halftimeAt: 8, overtime: false,
        startMoney: 1200, freezeTime: 12, roundTime: 135, freeArmor: true,
        lossBonusFloor: 1900
      }
    },
    deathmatch: {
      label: 'Deathmatch', desc: 'Respawn · Free weapons · 10 minutes',
      rules: {
        maxRounds: 1, winRounds: 1, overtime: false, roundTime: 600,
        freezeTime: 5, respawn: true, respawnDelay: 2.5, startMoney: 16000,
        dmScoreLimit: 100
      }
    },
    practice: {
      label: 'Practice', desc: 'Bots · Infinite money · Instant respawn',
      rules: {
        maxRounds: 99, winRounds: 99, overtime: false, freezeTime: 6,
        infiniteMoney: true, startMoney: 16000, roundTime: 180
      }
    },
    aim: {
      label: 'Aim Training', desc: 'Pop-up targets · Accuracy & reaction stats',
      rules: { maxRounds: 1, winRounds: 1, roundTime: 120, freezeTime: 3, startMoney: 16000 }
    }
  };

  /* ---- Economy ---- */
  C.ECON = {
    winElim: 3250,
    winBomb: 3500,          // T win by detonation
    winDefuse: 3500,
    winTimeCT: 3250,
    lossLadder: [1400, 1900, 2400, 2900, 3400],
    plantBonusT: 800,       // paid to whole T side on a loss after plant
    plantReward: 300,       // to planter
    defuseReward: 300,      // to defuser
    bombPickup: 0,
    survivorPistol: 0
  };

  /* ---- Teams ---- */
  C.TEAM = { NONE: 0, ATT: 1, DEF: 2, SPEC: 3 };   // ATT = attackers (bomb carriers)
  C.TEAM_INFO = {
    1: { id: 1, key: 'ATT', name: 'Syndicate',   short: 'SYN', color: '#e0a53a', colorDim: '#8a6320', accent: '#ffcf6b' },
    2: { id: 2, key: 'DEF', name: 'Vanguard',    short: 'VAN', color: '#4aa8ff', colorDim: '#1e5f99', accent: '#8fd0ff' },
    3: { id: 3, key: 'SPEC', name: 'Spectators', short: 'SPEC', color: '#9aa4b2', colorDim: '#5a6472', accent: '#c9d2dd' }
  };

  /* ---- Surfaces: name -> footstep tone, bullet-impact look, penetration ---- */
  C.SURF = {
    concrete: { step: 0.9,  pen: 0.55, dust: '#b9b2a4', hard: 1.0 },
    metal:    { step: 1.5,  pen: 0.35, dust: '#d8e2ea', hard: 1.2 },
    wood:     { step: 0.75, pen: 0.85, dust: '#c49a63', hard: 0.7 },
    sand:     { step: 0.45, pen: 0.70, dust: '#d9c79a', hard: 0.4 },
    tile:     { step: 1.15, pen: 0.50, dust: '#cfd4d8', hard: 1.0 },
    grass:    { step: 0.35, pen: 0.90, dust: '#8aa06a', hard: 0.3 },
    water:    { step: 0.30, pen: 0.95, dust: '#9ec9df', hard: 0.2 },
    glass:    { step: 1.3,  pen: 1.00, dust: '#cfeaf5', hard: 1.1, breakable: true },
    crate:    { step: 0.8,  pen: 0.88, dust: '#c9a06a', hard: 0.7 },
    steel:    { step: 1.5,  pen: 0.10, dust: '#e2e8ee', hard: 1.3 }
  };

  /* ---- Default user settings (persisted) ---- */
  C.DEFAULT_SETTINGS = {
    name: '',
    sensitivity: 2.2,
    zoomSensRatio: 1.0,
    invertY: false,
    rawInput: true,
    fov: 90,
    viewmodelFov: 68,
    viewmodelSide: 1,        // 1 = right handed, -1 = left
    viewmodelBob: true,
    quality: 'high',         // low | medium | high | ultra
    resolutionScale: 1.0,
    shadows: true,
    fpsCap: 0,               // 0 = uncapped (rAF)
    showFps: true,
    showNetGraph: false,
    masterVolume: 0.85,
    sfxVolume: 1.0,
    musicVolume: 0.35,
    voiceVolume: 1.0,
    voiceEnabled: true,
    pushToTalk: true,
    voiceTeamOnly: true,
    micGain: 1.0,
    crosshair: {
      style: 'classic',      // classic | dynamic | dot | cross
      size: 4.0,
      thickness: 1.4,
      gap: 3.0,
      outline: 1.0,
      dot: false,
      tStyle: false,
      color: '#39ff6a',
      alpha: 1.0,
      dynamicScale: 1.0
    },
    hud: { killfeed: true, radar: true, radarScale: 1.0, damageNumbers: true, hitmarker: true },
    keys: {
      forward: 'KeyW', back: 'KeyS', left: 'KeyA', right: 'KeyD',
      jump: 'Space', duck: 'ControlLeft', walk: 'ShiftLeft',
      use: 'KeyE', reload: 'KeyR', drop: 'KeyG', inspect: 'KeyF',
      buy: 'KeyB', scoreboard: 'Tab', voice: 'KeyV',
      chatAll: 'KeyY', chatTeam: 'KeyU',
      slot1: 'Digit1', slot2: 'Digit2', slot3: 'Digit3', slot4: 'Digit4', slot5: 'Digit5',
      lastWeapon: 'KeyQ', radio: 'KeyZ', spray: 'KeyT', score: 'Tab'
    },
    loadout: { ATT: 'ak', DEF: 'm4' },
    skins: {},     // weaponId -> skinId
    glove: 'default',
    charATT: 'syn_default',
    charDEF: 'van_default'
  };

  C.QUALITY_PRESETS = {
    low:    { shadows: false, shadowSize: 512,  aa: false, resScale: 0.72, particles: 0.35, decals: 40,  smokeSegments: 14, fogDensity: 0.9,  anisotropy: 1, viewDistance: 120 },
    medium: { shadows: true,  shadowSize: 1024, aa: false, resScale: 0.88, particles: 0.6,  decals: 90,  smokeSegments: 22, fogDensity: 1.0,  anisotropy: 2, viewDistance: 160 },
    high:   { shadows: true,  shadowSize: 2048, aa: true,  resScale: 1.0,  particles: 1.0,  decals: 160, smokeSegments: 30, fogDensity: 1.0,  anisotropy: 4, viewDistance: 220 },
    ultra:  { shadows: true,  shadowSize: 4096, aa: true,  resScale: 1.0,  particles: 1.4,  decals: 260, smokeSegments: 40, fogDensity: 1.0,  anisotropy: 8, viewDistance: 300 }
  };

  /* ---- Persistence ---- */
  var LS_KEY = 'breachpoint.settings.v1';

  function deepMerge(dst, src) {
    for (var k in src) {
      if (!Object.prototype.hasOwnProperty.call(src, k)) continue;
      var sv = src[k];
      if (sv && typeof sv === 'object' && !Array.isArray(sv)) {
        if (!dst[k] || typeof dst[k] !== 'object') dst[k] = {};
        deepMerge(dst[k], sv);
      } else {
        dst[k] = sv;
      }
    }
    return dst;
  }
  C.deepMerge = deepMerge;
  C.deepClone = function (o) { return JSON.parse(JSON.stringify(o)); };

  C.loadSettings = function () {
    var s = C.deepClone(C.DEFAULT_SETTINGS);
    try {
      var raw = root.localStorage && root.localStorage.getItem(LS_KEY);
      if (raw) deepMerge(s, JSON.parse(raw));
    } catch (e) { /* private mode / corrupt json — defaults are fine */ }
    if (!s.name) s.name = C.randomName();
    return s;
  };
  C.saveSettings = function (s) {
    try { root.localStorage && root.localStorage.setItem(LS_KEY, JSON.stringify(s)); }
    catch (e) { /* ignore quota / disabled storage */ }
  };
  C.resetSettings = function () {
    try { root.localStorage && root.localStorage.removeItem(LS_KEY); } catch (e) {}
    return C.deepClone(C.DEFAULT_SETTINGS);
  };

  var ADJ = ['Swift', 'Silent', 'Iron', 'Rapid', 'Ghost', 'Cold', 'Sharp', 'Night', 'Stray', 'Ace'];
  var NOUN = ['Falcon', 'Viper', 'Wolf', 'Ranger', 'Spectre', 'Echo', 'Nomad', 'Raven', 'Comet', 'Onyx'];
  C.randomName = function () {
    return ADJ[(Math.random() * ADJ.length) | 0] + NOUN[(Math.random() * NOUN.length) | 0] +
           ((Math.random() * 90 + 10) | 0);
  };

  /* Short, unambiguous room codes (no 0/O/1/I) */
  C.CODE_ALPHABET = 'ACDEFGHJKLMNPQRSTUVWXYZ23456789';
  C.makeRoomCode = function (len) {
    len = len || 5;
    var s = '';
    for (var i = 0; i < len; i++) s += C.CODE_ALPHABET[(Math.random() * C.CODE_ALPHABET.length) | 0];
    return s;
  };
  C.normalizeCode = function (code) {
    return String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
      .replace(/O/g, '0').replace(/0/g, 'Q').replace(/I/g, 'J').replace(/1/g, 'L');
  };
  /* PeerJS namespace so room codes cannot collide with other apps on the broker */
  C.PEER_PREFIX = 'brchpt-v7-';

  CS.C = C;
})(typeof window !== 'undefined' ? window : globalThis);
