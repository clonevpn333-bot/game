/* =========================================================================
 * MOB REGISTRY — models, proportions, stats, drops, spawn rules and the
 * per-type animation functions.
 * ========================================================================= */

var MOBS = {};
function defMob(type, o) {
  o.type = type;
  o.w = o.w || 0.6; o.h = o.h || 1.8;
  o.hp = o.hp || 10; o.dmg = o.dmg === undefined ? 0 : o.dmg;
  o.speed = o.speed || 0.10;
  o.hostile = !!o.hostile;
  o.xp = o.xp === undefined ? (o.hostile ? 5 : 1) : o.xp;
  o.drops = o.drops || [];
  o.disp = o.disp || titleCase(type);
  MOBS[type] = o;
  return o;
}

/* ------------------------------------------------------- shared anims -- */
function animBiped(e, pose, t) {
  var sw = e.walkPhase * 1.6;
  var amp = 0.9 * e.walkAmt;
  poseWalk(pose, e, sw, amp);
  pose.head = { rx: e.headPitch, ry: e.headYaw };
  if (e.attackTime > 0) {
    var a = 1 - e.attackTime / 0.35;
    var s = Math.sin(a * Math.PI);
    pose.armR = { rx: -s * 1.9, rz: -s * 0.3 };
    pose.armL = { rx: -s * 0.5 };
  }
  if (e.armsUp) {
    pose.armR = { rx: -1.55 + Math.sin(t * 2 + 1) * 0.06, rz: -0.05 };
    pose.armL = { rx: -1.55 + Math.sin(t * 2) * 0.06, rz: 0.05 };
  }
  if (e.sitting) { pose.legL = { rx: -1.4, tz: 2 }; pose.legR = { rx: -1.4, tz: 2 }; }
}
function animQuad(e, pose, t) {
  poseQuadWalk(pose, e.walkPhase * 2.0, 0.85 * e.walkAmt);
  pose.head = { rx: e.headPitch * 0.5, ry: e.headYaw * 0.6 };
  if (e.eating > 0) pose.head.rx = 0.9;
}
function animBird(e, pose, t) {
  var f = Math.sin(t * 14) * (e.onGround ? 0.15 : 1.1);
  pose.wingL = { rz: -f - 0.15 };
  pose.wingR = { rz: f + 0.15 };
  poseQuadWalk(pose, e.walkPhase * 2.4, 0.8 * e.walkAmt);
  pose.legL = { rx: Math.sin(e.walkPhase * 2.4) * 0.8 * e.walkAmt };
  pose.legR = { rx: Math.sin(e.walkPhase * 2.4 + Math.PI) * 0.8 * e.walkAmt };
  pose.head = { rx: e.headPitch * 0.4, ry: e.headYaw * 0.7 };
}
function animFloat(e, pose, t) {
  pose.body = { ty: Math.sin(t * 1.6 + e.seed) * 0.9 };
}

/* ============================== PASSIVE ================================= */
defMob('cow', {
  model: quadModel({ body: '#4a3225', head: '#4a3225', headTex: 'face_cow', bodyY: 12, bodyLen: 16, bodyW: 8, bodyH: 10, legH: 12, headSize: 8, headY: 6,
    extra: [P('hornL', [4, 24, -9], [0, 0, 0, 1, 3, 1], '#e0d8c0'), P('hornR', [-4, 24, -9], [-1, 0, 0, 1, 3, 1], '#e0d8c0')] }),
  w: 0.9, h: 1.4, hp: 10, speed: 0.09, anim: animQuad, babyScale: 0.55, babyHeadScale: 1.35,
  drops: [{ item: 'beef', min: 1, max: 3 }, { item: 'leather', min: 0, max: 2 }],
  spawn: { biomes: ['plains', 'forest', 'meadow', 'savanna', 'sunflower_plains', 'taiga', 'flower_forest'], light: 9, group: [2, 4], surface: true }
});
defMob('mooshroom', {
  model: quadModel({ body: '#a02a2a', head: '#a02a2a', headTex: 'face_cow', bodyY: 12, bodyLen: 16, bodyW: 8, bodyH: 10, legH: 12, headSize: 8, headY: 6,
    extra: [P('m1', [3, 22, 2], [0, 0, 0, 3, 1, 3], '#b52a24'), P('m2', [-3, 22, -3], [0, 0, 0, 3, 1, 3], '#b52a24')] }),
  w: 0.9, h: 1.4, hp: 10, speed: 0.09, anim: animQuad, babyScale: 0.55,
  drops: [{ item: 'beef', min: 1, max: 3 }, { item: 'leather', min: 0, max: 2 }],
  spawn: { biomes: ['mushroom_fields'], light: 9, group: [2, 4], surface: true }
});
defMob('pig', {
  model: quadModel({ body: '#e39699', headTex: 'face_pig', bodyY: 10, bodyLen: 16, bodyW: 8, bodyH: 8, legH: 10, headSize: 8, headY: 4 }),
  w: 0.9, h: 1.0, hp: 10, speed: 0.09, anim: animQuad, babyScale: 0.55, babyHeadScale: 1.35,
  drops: [{ item: 'porkchop', min: 1, max: 3 }],
  spawn: { biomes: ['plains', 'forest', 'meadow', 'sunflower_plains', 'taiga', 'jungle'], light: 9, group: [2, 4], surface: true }
});
defMob('sheep', {
  model: quadModel({ body: '#e9ecec', bodyTex: 'wool_fluff', head: '#d8c8b8', headTex: 'face_sheep',
    bodyY: 12, bodyLen: 16, bodyW: 9, bodyH: 10, legH: 12, headSize: 7, headY: 5 }),
  w: 0.9, h: 1.3, hp: 8, speed: 0.09, anim: animQuad, babyScale: 0.55, babyHeadScale: 1.3, woolColour: true,
  drops: [{ item: 'mutton', min: 1, max: 2 }, { item: 'white_wool', min: 1, max: 1 }],
  spawn: { biomes: ['plains', 'forest', 'meadow', 'sunflower_plains', 'taiga', 'snowy_plains', 'flower_forest', 'windswept_hills'], light: 9, group: [2, 4], surface: true }
});
defMob('chicken', {
  model: {
    parts: [
      P('head', [0, 9, -4], [-2, 0, -3, 4, 4, 3], '#e8e8e8', { tex: 'face_chicken' }),
      P('body', [0, 6, 0], [-3, 0, -4, 6, 6, 8], '#e8e8e8'),
      P('wingL', [3, 10, -2], [0, -4, -3, 1, 5, 6], '#dcdcdc'),
      P('wingR', [-3, 10, -2], [-1, -4, -3, 1, 5, 6], '#dcdcdc'),
      P('legL', [2, 5, 1], [-1, -5, -2, 2, 5, 4], '#e0a020'),
      P('legR', [-2, 5, 1], [-1, -5, -2, 2, 5, 4], '#e0a020')
    ], eye: 0.65
  },
  w: 0.4, h: 0.7, hp: 4, speed: 0.09, anim: animBird, babyScale: 0.5,
  drops: [{ item: 'chicken', min: 1, max: 1 }, { item: 'feather', min: 0, max: 2 }],
  spawn: { biomes: ['plains', 'forest', 'jungle', 'sunflower_plains', 'swamp'], light: 9, group: [3, 4], surface: true }
});
defMob('rabbit', {
  model: {
    parts: [
      P('head', [0, 6, -3], [-2.5, 0, -3, 5, 4, 4], '#a08060', { tex: 'face_rabbit' }),
      P('body', [0, 3, 0], [-3, 0, -3, 6, 5, 8], '#a08060'),
      P('earL', [1.5, 10, -3], [0, 0, -0.5, 1, 5, 1], '#8f7050'),
      P('earR', [-1.5, 10, -3], [-1, 0, -0.5, 1, 5, 1], '#8f7050'),
      P('legFL', [2, 2, -2], [-1, -2, -1.5, 2, 2, 3], '#96764f'),
      P('legFR', [-2, 2, -2], [-1, -2, -1.5, 2, 2, 3], '#96764f'),
      P('legBL', [2.5, 3, 3], [-1.5, -3, -2, 3, 3, 4], '#96764f'),
      P('legBR', [-2.5, 3, 3], [-1.5, -3, -2, 3, 3, 4], '#96764f')
    ], eye: 0.4
  },
  w: 0.4, h: 0.5, hp: 3, speed: 0.13, anim: function (e, pose, t) {
    var hop = Math.max(0, Math.sin(e.walkPhase * 3)) * e.walkAmt;
    pose.legBL = { rx: -hop * 1.2 }; pose.legBR = { rx: -hop * 1.2 };
    pose.legFL = { rx: hop * 0.8 }; pose.legFR = { rx: hop * 0.8 };
    pose.body = { ty: hop * 1.5 };
    pose.head = { ry: e.headYaw * 0.6 };
    pose.earL = { rz: -0.1 - hop * 0.3 }; pose.earR = { rz: 0.1 + hop * 0.3 };
  },
  drops: [{ item: 'rabbit', min: 0, max: 1 }, { item: 'rabbit_hide', min: 0, max: 1 }],
  spawn: { biomes: ['desert', 'snowy_plains', 'meadow', 'taiga', 'flower_forest'], light: 9, group: [2, 3], surface: true }
});
defMob('wolf', {
  model: quadModel({ body: '#cfcac4', head: '#cfcac4', headTex: 'face_wolf', bodyY: 10, bodyLen: 14, bodyW: 6, bodyH: 6, legH: 10, headSize: 6, headY: 3,
    extra: [P('tail', [0, 14, 7], [-1, -1, 0, 2, 8, 2], '#bab5b0', { }),
      P('earL', [2, 19, -8], [0, 0, 0, 2, 2, 1], '#a8a29c'), P('earR', [-2, 19, -8], [-2, 0, 0, 2, 2, 1], '#a8a29c')] }),
  w: 0.6, h: 0.85, hp: 8, dmg: 4, speed: 0.14, tameable: true, anim: function (e, pose, t) {
    animQuad(e, pose, t);
    pose.tail = { rx: 0.6 + Math.sin(t * 6) * (e.tamed ? 0.5 : 0.15) };
    if (e.sitting) { pose.body = { rx: -0.3, ty: -3 }; pose.legBL = { rx: -1.4 }; pose.legBR = { rx: -1.4 }; }
  },
  spawn: { biomes: ['forest', 'taiga', 'old_growth_pine_taiga', 'snowy_taiga', 'dark_forest', 'windswept_forest'], light: 9, group: [2, 4], surface: true }
});
defMob('fox', {
  model: quadModel({ body: '#d9863f', head: '#d9863f', headTex: 'face_fox', bodyY: 8, bodyLen: 14, bodyW: 6, bodyH: 6, legH: 8, headSize: 6, headY: 3,
    extra: [P('tail', [0, 12, 7], [-2, -2, 0, 4, 4, 9], '#efe0d0'),
      P('earL', [2, 17, -7], [0, 0, 0, 2, 3, 1], '#c0702f'), P('earR', [-2, 17, -7], [-2, 0, 0, 2, 3, 1], '#c0702f')] }),
  w: 0.6, h: 0.7, hp: 10, dmg: 2, speed: 0.15, anim: function (e, pose, t) { animQuad(e, pose, t); pose.tail = { rx: 0.5 + Math.sin(t * 3) * 0.15 }; },
  drops: [], spawn: { biomes: ['taiga', 'snowy_taiga', 'old_growth_pine_taiga', 'forest'], light: 9, group: [2, 4], surface: true }
});
defMob('cat', {
  model: quadModel({ body: '#8a6a4a', head: '#8a6a4a', headTex: 'face_cat', bodyY: 8, bodyLen: 12, bodyW: 5, bodyH: 5, legH: 8, headSize: 5, headY: 3,
    extra: [P('tail', [0, 11, 6], [-1, -1, 0, 2, 2, 8], '#7a5a3a'),
      P('earL', [1.5, 15, -6], [0, 0, 0, 2, 2, 1], '#6f4f30'), P('earR', [-1.5, 15, -6], [-2, 0, 0, 2, 2, 1], '#6f4f30')] }),
  w: 0.6, h: 0.7, hp: 10, speed: 0.14, tameable: true,
  anim: function (e, pose, t) { animQuad(e, pose, t); pose.tail = { rz: Math.sin(t * 2.2) * 0.35, rx: -0.6 }; },
  spawn: { biomes: [], light: 9, group: [1, 1] }
});
defMob('ocelot', {
  model: quadModel({ body: '#e0b45a', head: '#e0b45a', headTex: 'face_cat', bodyY: 8, bodyLen: 12, bodyW: 5, bodyH: 5, legH: 8, headSize: 5, headY: 3,
    extra: [P('tail', [0, 11, 6], [-1, -1, 0, 2, 2, 8], '#c89a44')] }),
  w: 0.6, h: 0.7, hp: 10, speed: 0.15, anim: animQuad,
  spawn: { biomes: ['jungle', 'sparse_jungle', 'bamboo_jungle'], light: 9, group: [1, 2], surface: true }
});
defMob('panda', {
  model: quadModel({ body: '#e8e4dc', head: '#e8e4dc', headTex: 'face_panda', bodyY: 12, bodyLen: 20, bodyW: 12, bodyH: 12, legH: 12, headSize: 10, headY: 6,
    extra: [P('earL', [4, 27, -13], [0, 0, 0, 3, 3, 1], '#1a1a1a'), P('earR', [-4, 27, -13], [-3, 0, 0, 3, 3, 1], '#1a1a1a')] }),
  w: 1.3, h: 1.25, hp: 20, speed: 0.08, anim: animQuad, babyScale: 0.5,
  spawn: { biomes: ['bamboo_jungle'], light: 9, group: [1, 2], surface: true }
});
defMob('polar_bear', {
  model: quadModel({ body: '#f0eee8', head: '#f0eee8', headTex: 'face_polar_bear', bodyY: 14, bodyLen: 20, bodyW: 12, bodyH: 12, legH: 14, headSize: 9, headY: 6 }),
  w: 1.3, h: 1.4, hp: 30, dmg: 6, speed: 0.1, anim: animQuad, babyScale: 0.5,
  spawn: { biomes: ['snowy_plains', 'frozen_ocean', 'ice_spikes', 'snowy_slopes'], light: 9, group: [1, 2], surface: true }
});
defMob('goat', {
  model: quadModel({ body: '#d8d0c4', head: '#d8d0c4', headTex: 'face_goat', bodyY: 12, bodyLen: 14, bodyW: 7, bodyH: 8, legH: 12, headSize: 6, headY: 5,
    extra: [P('hornL', [2, 24, -7], [0, 0, 0, 1, 4, 1], '#b0a898'), P('hornR', [-2, 24, -7], [-1, 0, 0, 1, 4, 1], '#b0a898')] }),
  w: 0.9, h: 1.3, hp: 10, dmg: 2, speed: 0.12, anim: animQuad, babyScale: 0.55,
  spawn: { biomes: ['snowy_slopes', 'jagged_peaks', 'frozen_peaks', 'stony_peaks', 'windswept_hills'], light: 9, group: [1, 3], surface: true }
});
defMob('llama', {
  model: quadModel({ body: '#c8b898', head: '#c8b898', headTex: 'face_llama', bodyY: 16, bodyLen: 16, bodyW: 8, bodyH: 10, legH: 16, headSize: 6, headY: 10, headZ: -2,
    extra: [P('earL', [2, 34, -12], [0, 0, 0, 1, 3, 1], '#b0a288'), P('earR', [-2, 34, -12], [-1, 0, 0, 1, 3, 1], '#b0a288')] }),
  w: 0.9, h: 1.87, hp: 20, dmg: 1, speed: 0.1, anim: animQuad, babyScale: 0.5,
  spawn: { biomes: ['savanna', 'windswept_hills', 'windswept_forest', 'savanna_plateau'], light: 9, group: [2, 4], surface: true }
});
defMob('horse', {
  model: quadModel({ body: '#a0714a', head: '#a0714a', headTex: 'face_horse', bodyY: 14, bodyLen: 18, bodyW: 8, bodyH: 10, legH: 14, headSize: 7, headY: 10, headZ: -2,
    extra: [P('mane', [0, 30, -6], [-1, -2, 0, 2, 6, 8], '#5f4028'), P('tail', [0, 22, 9], [-1.5, -2, 0, 3, 10, 3], '#5f4028')] }),
  w: 1.3, h: 1.6, hp: 22, speed: 0.16, anim: animQuad, babyScale: 0.5, rideable: true,
  spawn: { biomes: ['plains', 'savanna', 'sunflower_plains', 'savanna_plateau'], light: 9, group: [2, 5], surface: true }
});
defMob('donkey', {
  model: quadModel({ body: '#6f5a4a', head: '#6f5a4a', headTex: 'face_horse', bodyY: 13, bodyLen: 16, bodyW: 8, bodyH: 9, legH: 13, headSize: 7, headY: 9, headZ: -2,
    extra: [P('earL', [2, 30, -8], [0, 0, 0, 1.5, 5, 1], '#5f4c3e'), P('earR', [-2, 30, -8], [-1.5, 0, 0, 1.5, 5, 1], '#5f4c3e')] }),
  w: 1.3, h: 1.5, hp: 20, speed: 0.14, anim: animQuad, rideable: true,
  spawn: { biomes: ['plains', 'savanna', 'meadow'], light: 9, group: [1, 3], surface: true }
});
defMob('mule', {
  model: quadModel({ body: '#5a4436', head: '#5a4436', headTex: 'face_horse', bodyY: 13, bodyLen: 16, bodyW: 8, bodyH: 9, legH: 13, headSize: 7, headY: 9, headZ: -2 }),
  w: 1.3, h: 1.5, hp: 20, speed: 0.14, anim: animQuad, rideable: true, spawn: null
});
defMob('camel', {
  model: quadModel({ body: '#d8b070', head: '#d8b070', headTex: 'face_camel', bodyY: 20, bodyLen: 20, bodyW: 10, bodyH: 12, legH: 20, headSize: 7, headY: 14, headZ: -3,
    extra: [P('hump', [0, 32, 0], [-4, 0, -4, 8, 5, 8], '#c09a5a')] }),
  w: 1.7, h: 2.2, hp: 32, speed: 0.09, anim: animQuad, rideable: true,
  spawn: { biomes: ['desert'], light: 9, group: [1, 2], surface: true }
});
defMob('bee', {
  model: {
    parts: [
      P('body', [0, 6, 0], [-3.5, 0, -4, 7, 7, 8], '#e8b83a', { tex: 'bee_body' }),
      P('head', [0, 9, -4], [-3.5, -3.5, -4, 7, 7, 4], '#e8b83a', { tex: 'face_bee' }),
      P('wingL', [1.5, 13, -1], [0, 0, -2, 9, 0.5, 6], '#e8f0ff'),
      P('wingR', [-1.5, 13, -1], [-9, 0, -2, 9, 0.5, 6], '#e8f0ff'),
      P('stinger', [0, 8, 4], [-0.5, 0, 0, 1, 1, 3], '#3a2a14')
    ], eye: 0.55
  },
  w: 0.7, h: 0.6, hp: 10, dmg: 2, speed: 0.14, fly: true,
  anim: function (e, pose, t) {
    var f = Math.sin(t * 42) * 0.5;
    pose.wingL = { rz: -0.2 - f }; pose.wingR = { rz: 0.2 + f };
    pose.body = { ty: Math.sin(t * 3 + e.seed) * 0.4 };
  },
  spawn: { biomes: ['plains', 'flower_forest', 'meadow', 'sunflower_plains', 'cherry_grove'], light: 9, group: [1, 3], surface: true }
});
defMob('turtle', {
  model: quadModel({ body: '#5a8f4a', bodyTex: 'turtle_shell', head: '#68a25a', headTex: 'face_turtle', bodyY: 4, bodyLen: 20, bodyW: 16, bodyH: 6, legH: 4, headSize: 6, headY: 2 }),
  w: 1.2, h: 0.4, hp: 30, speed: 0.06, anim: animQuad, water: 'amphibious',
  drops: [{ item: 'seagrass', min: 0, max: 2 }],
  spawn: { biomes: ['beach'], light: 9, group: [2, 5], surface: true }
});
defMob('frog', {
  model: {
    parts: [
      P('body', [0, 3, 0], [-4, 0, -5, 8, 5, 10], '#88a24a'),
      P('head', [0, 6, -4], [-4, -2, -5, 8, 5, 6], '#88a24a', { tex: 'face_frog' }),
      P('legBL', [3, 3, 4], [-1.5, -3, -1.5, 3, 5, 3], '#6f8a3a'),
      P('legBR', [-3, 3, 4], [-1.5, -3, -1.5, 3, 5, 3], '#6f8a3a'),
      P('legFL', [3, 2, -3], [-1, -2, -1, 2, 3, 2], '#6f8a3a'),
      P('legFR', [-3, 2, -3], [-1, -2, -1, 2, 3, 2], '#6f8a3a')
    ], eye: 0.4
  },
  w: 0.5, h: 0.5, hp: 10, speed: 0.1, water: 'amphibious',
  anim: function (e, pose, t) {
    var hop = Math.max(0, Math.sin(e.walkPhase * 3)) * e.walkAmt;
    pose.body = { ty: hop * 2 }; pose.legBL = { rx: -hop }; pose.legBR = { rx: -hop };
  },
  spawn: { biomes: ['swamp', 'mangrove_swamp'], light: 9, group: [2, 4], surface: true }
});
defMob('axolotl', {
  model: {
    parts: [
      P('body', [0, 3, 0], [-2, 0, -4, 4, 4, 10], '#f5b8d0'),
      P('head', [0, 4, -4], [-2.5, -2, -4, 5, 5, 5], '#f5b8d0', { tex: 'face_axolotl' }),
      P('gillL', [2.5, 6, -5], [0, 0, -1, 4, 1, 4], '#e88ab0'),
      P('gillR', [-2.5, 6, -5], [-4, 0, -1, 4, 1, 4], '#e88ab0'),
      P('tail', [0, 4, 6], [-0.5, -2.5, 0, 1, 5, 8], '#f0a8c4')
    ], eye: 0.3
  },
  w: 0.75, h: 0.45, hp: 14, dmg: 2, speed: 0.12, water: true,
  anim: function (e, pose, t) { pose.tail = { ry: Math.sin(t * 6 + e.seed) * 0.6 }; pose.gillL = { ry: Math.sin(t * 4) * 0.2 }; },
  spawn: { biomes: ['lush_caves'], light: 15, group: [2, 4] }
});
defMob('squid', {
  model: {
    parts: [
      P('body', [0, 8, 0], [-6, -6, -6, 12, 12, 12], '#2a3a72', { tex: 'face_squid' }),
      P('t1', [3, 2, 3], [-1, -8, -1, 2, 9, 2], '#22305e'),
      P('t2', [-3, 2, 3], [-1, -8, -1, 2, 9, 2], '#22305e'),
      P('t3', [3, 2, -3], [-1, -8, -1, 2, 9, 2], '#22305e'),
      P('t4', [-3, 2, -3], [-1, -8, -1, 2, 9, 2], '#22305e')
    ], eye: 0.5
  },
  w: 0.8, h: 0.8, hp: 10, speed: 0.08, water: true,
  anim: function (e, pose, t) {
    var s = Math.sin(t * 2 + e.seed) * 0.35;
    pose.t1 = { rx: s }; pose.t2 = { rx: s }; pose.t3 = { rx: -s }; pose.t4 = { rx: -s };
  },
  drops: [{ item: 'ink_sac', min: 1, max: 3 }],
  spawn: { biomes: ['ocean', 'deep_ocean', 'river', 'lukewarm_ocean', 'cold_ocean'], light: 15, group: [2, 4], water: true }
});
defMob('glow_squid', {
  model: {
    parts: [
      P('body', [0, 8, 0], [-6, -6, -6, 12, 12, 12], '#1a4a52', { tex: 'face_glow_squid' }),
      P('t1', [3, 2, 3], [-1, -8, -1, 2, 9, 2], '#164047'),
      P('t2', [-3, 2, 3], [-1, -8, -1, 2, 9, 2], '#164047'),
      P('t3', [3, 2, -3], [-1, -8, -1, 2, 9, 2], '#164047'),
      P('t4', [-3, 2, -3], [-1, -8, -1, 2, 9, 2], '#164047')
    ], eye: 0.5
  },
  w: 0.8, h: 0.8, hp: 10, speed: 0.08, water: true, glow: true,
  anim: function (e, pose, t) { var s = Math.sin(t * 2 + e.seed) * 0.35; pose.t1 = { rx: s }; pose.t2 = { rx: s }; pose.t3 = { rx: -s }; pose.t4 = { rx: -s }; },
  drops: [{ item: 'glow_ink_sac', min: 1, max: 3 }],
  spawn: { biomes: ['deep_ocean', 'ocean'], light: 15, group: [2, 4], water: true }
});
function fishModel(tex, col2) {
  return {
    parts: [
      P('body', [0, 3, 0], [-1.5, -1.5, -4, 3, 4, 8], col2, { tex: tex }),
      P('tail', [0, 3, 4], [-0.5, -2, 0, 1, 4, 4], col2),
      P('finT', [0, 5, 0], [-0.5, 0, -2, 1, 2, 4], col2)
    ], eye: 0.25
  };
}
defMob('cod', { model: fishModel('fish_body', '#8f6a3a'), w: 0.5, h: 0.3, hp: 3, speed: 0.1, water: true, anim: function (e, pose, t) { pose.tail = { ry: Math.sin(t * 9 + e.seed) * 0.7 }; }, drops: [{ item: 'cod', min: 1, max: 1 }], spawn: { biomes: ['ocean', 'cold_ocean', 'deep_ocean', 'lukewarm_ocean'], light: 15, group: [3, 6], water: true } });
defMob('salmon', { model: fishModel('fish_body', '#a04a3a'), w: 0.5, h: 0.4, hp: 3, speed: 0.11, water: true, anim: function (e, pose, t) { pose.tail = { ry: Math.sin(t * 9 + e.seed) * 0.7 }; }, drops: [{ item: 'salmon', min: 1, max: 1 }], spawn: { biomes: ['river', 'cold_ocean', 'frozen_river'], light: 15, group: [3, 6], water: true } });
defMob('tropical_fish', { model: fishModel('tropical_body', '#e8a020'), w: 0.5, h: 0.4, hp: 3, speed: 0.12, water: true, anim: function (e, pose, t) { pose.tail = { ry: Math.sin(t * 11 + e.seed) * 0.8 }; }, drops: [{ item: 'tropical_fish', min: 1, max: 1 }], spawn: { biomes: ['warm_ocean', 'lukewarm_ocean'], light: 15, group: [3, 6], water: true } });
defMob('pufferfish', {
  model: { parts: [P('body', [0, 4, 0], [-3, -3, -3, 6, 6, 6], '#e8c020'), P('tail', [0, 4, 3], [-0.5, -2, 0, 1, 4, 3], '#e8c020')], eye: 0.3 },
  w: 0.5, h: 0.5, hp: 3, dmg: 2, speed: 0.09, water: true,
  anim: function (e, pose, t) { pose.body = { s: 1 + Math.sin(t * 1.4 + e.seed) * 0.12 }; },
  drops: [{ item: 'pufferfish', min: 1, max: 1 }], spawn: { biomes: ['warm_ocean'], light: 15, group: [1, 3], water: true }
});
defMob('dolphin', {
  model: {
    parts: [
      P('body', [0, 6, 0], [-4, -3, -8, 8, 7, 16], '#8fa8c0'),
      P('head', [0, 6, -8], [-3, -2.5, -6, 6, 5, 6], '#8fa8c0', { tex: 'face_dolphin' }),
      P('tail', [0, 6, 8], [-1, -1.5, 0, 2, 3, 6], '#7f96ac'),
      P('fin', [0, 10, -1], [-0.5, 0, -2, 1, 4, 5], '#7f96ac')
    ], eye: 0.5
  },
  w: 0.9, h: 0.6, hp: 10, dmg: 3, speed: 0.2, water: true,
  anim: function (e, pose, t) { pose.tail = { rx: Math.sin(t * 6 + e.seed) * 0.5 }; },
  spawn: { biomes: ['ocean', 'warm_ocean', 'lukewarm_ocean'], light: 15, group: [2, 4], water: true }
});
defMob('bat', {
  model: {
    parts: [
      P('body', [0, 6, 0], [-2.5, -4, -2, 5, 7, 4], '#4a3a30'),
      P('head', [0, 10, 0], [-3, -1, -3, 6, 6, 6], '#4a3a30', { tex: 'face_bat' }),
      P('wingL', [2.5, 8, 0], [0, -4, -1, 10, 8, 1], '#3a2c24'),
      P('wingR', [-2.5, 8, 0], [-10, -4, -1, 10, 8, 1], '#3a2c24')
    ], eye: 0.5
  },
  w: 0.5, h: 0.9, hp: 6, speed: 0.14, fly: true,
  anim: function (e, pose, t) { var f = Math.sin(t * 18) * 0.9; pose.wingL = { ry: -f }; pose.wingR = { ry: f }; },
  spawn: { biomes: [], light: 4, group: [1, 3], cave: true }
});
defMob('parrot', {
  model: {
    parts: [
      P('body', [0, 5, 0], [-1.5, 0, -1.5, 3, 6, 3], '#c02a2a'),
      P('head', [0, 11, 0], [-2, 0, -2.5, 4, 4, 4], '#c02a2a', { tex: 'face_parrot' }),
      P('wingL', [1.5, 10, 0], [0, -6, -1.5, 1, 6, 3], '#2a5ac0'),
      P('wingR', [-1.5, 10, 0], [-1, -6, -1.5, 1, 6, 3], '#2a5ac0'),
      P('tail', [0, 5, 1.5], [-1, -1, 0, 2, 1, 5], '#e0c020'),
      P('legL', [1, 0, 0], [-0.5, 0, -0.5, 1, 2, 1], '#e0a020'),
      P('legR', [-1, 0, 0], [-0.5, 0, -0.5, 1, 2, 1], '#e0a020')
    ], eye: 0.6
  },
  w: 0.5, h: 0.9, hp: 6, speed: 0.16, fly: true,
  anim: function (e, pose, t) { var f = Math.sin(t * 16) * (e.onGround ? 0.1 : 1.0); pose.wingL = { rz: -f - 0.1 }; pose.wingR = { rz: f + 0.1 }; },
  spawn: { biomes: ['jungle', 'bamboo_jungle', 'sparse_jungle'], light: 9, group: [1, 2], surface: true }
});
defMob('strider', {
  model: quadModel({ body: '#9c3a3a', head: '#9c3a3a', headTex: 'face_strider', bodyY: 10, bodyLen: 16, bodyW: 12, bodyH: 12, legH: 10, headSize: 8, headY: 8 }),
  w: 0.9, h: 1.7, hp: 20, speed: 0.1, anim: animQuad, fireproof: true, lavaWalker: true,
  spawn: { biomes: ['nether_wastes', 'basalt_deltas', 'crimson_forest'], light: 15, group: [1, 3], dim: DIM_NETHER }
});
defMob('allay', {
  model: {
    parts: [
      P('body', [0, 6, 0], [-1.5, 0, -1, 3, 4, 2], '#4fa8e0'),
      P('head', [0, 10, 0], [-2.5, 0, -2.5, 5, 5, 5], '#4fa8e0', { tex: 'face_allay' }),
      P('armL', [1.5, 9, 0], [0, -4, -1, 1, 4, 2], '#3f92c8'),
      P('armR', [-1.5, 9, 0], [-1, -4, -1, 1, 4, 2], '#3f92c8'),
      P('wingL', [1, 9, 1], [0, -4, 0, 1, 5, 3], '#bfe8ff'),
      P('wingR', [-1, 9, 1], [-1, -4, 0, 1, 5, 3], '#bfe8ff')
    ], eye: 0.55
  },
  w: 0.35, h: 0.6, hp: 20, speed: 0.16, fly: true, glow: true,
  anim: function (e, pose, t) { var f = Math.sin(t * 20) * 0.7; pose.wingL = { ry: -f }; pose.wingR = { ry: f }; pose.body = { ty: Math.sin(t * 3) * 0.4 }; },
  spawn: null
});

/* ============================== VILLAGERS =============================== */
defMob('villager', {
  model: bipedModel({ skin: '#c39774', shirt: '#8a6a4a', pants: '#6f4f38', headTex: 'face_villager', armW: 4,
    extra: [P('nose', [0, 26, -4], [-1, 0, -1, 2, 2, 1], '#a87e5c')] }),
  w: 0.6, h: 1.95, hp: 20, speed: 0.09, anim: function (e, pose, t) {
    animBiped(e, pose, t);
    pose.armL = { rx: -0.6, rz: 0.1 }; pose.armR = { rx: -0.6, rz: -0.1 };
  },
  trades: true, babyScale: 0.5,
  spawn: null
});
defMob('wandering_trader', {
  model: bipedModel({ skin: '#c39774', shirt: '#2f4f8a', pants: '#3a3a5a', headTex: 'face_villager' }),
  w: 0.6, h: 1.95, hp: 20, speed: 0.10, anim: animBiped, trades: true, spawn: null
});
defMob('iron_golem', {
  model: bipedModel({ skin: '#c8c0b0', shirt: '#b8b0a0', pants: '#a89c88', headTex: 'golem_face',
    headW: 8, headH: 10, bodyY: 22, legH: 22, armH: 22, armW: 6 }),
  w: 1.4, h: 2.7, hp: 100, dmg: 12, speed: 0.09, scale: 1.35, defender: true,
  anim: function (e, pose, t) {
    poseWalk(pose, e, e.walkPhase * 1.1, 0.55 * e.walkAmt, 0.6);
    pose.head = { ry: e.headYaw * 0.5 };
    if (e.attackTime > 0) { var a = 1 - e.attackTime / 0.5, s = Math.sin(a * Math.PI); pose.armL = { rx: -s * 2.0 }; pose.armR = { rx: -s * 2.0 }; }
  },
  drops: [{ item: 'iron_ingot', min: 3, max: 5 }, { item: 'poppy', min: 0, max: 2 }], spawn: null
});
defMob('snow_golem', {
  model: {
    parts: [
      P('base', [0, 0, 0], [-5, 0, -5, 10, 10, 10], '#f0f6f8'),
      P('mid', [0, 10, 0], [-4, 0, -4, 8, 8, 8], '#f0f6f8'),
      P('head', [0, 18, 0], [-4, 0, -4, 8, 8, 8], '#f0f6f8', { tex: 'snow_golem_face' }),
      P('armL', [4, 20, 0], [0, -1, -1, 10, 2, 2], '#7a5a3a'),
      P('armR', [-4, 20, 0], [-10, -1, -1, 10, 2, 2], '#7a5a3a')
    ], eye: 1.4
  },
  w: 0.7, h: 1.9, hp: 4, dmg: 0, speed: 0.1, ranged: 'snowball', defender: true,
  anim: function (e, pose, t) { pose.head = { ry: e.headYaw }; }, spawn: null
});

/* =============================== HOSTILE ================================ */
defMob('zombie', {
  model: bipedModel({ skin: '#4a7a3c', shirt: '#3f5a8a', pants: '#3a3a5f', headTex: 'face_zombie' }),
  w: 0.6, h: 1.95, hp: 20, dmg: 3, speed: 0.10, hostile: true, burnsInSun: true,
  anim: function (e, pose, t) { e.armsUp = true; animBiped(e, pose, t); },
  drops: [{ item: 'rotten_flesh', min: 0, max: 2 }, { item: 'iron_ingot', min: 0, max: 1, chance: 0.025 }],
  babyScale: 0.5, spawn: { biomes: null, light: 7, group: [2, 4], hostile: true }
});
defMob('husk', {
  model: bipedModel({ skin: '#a08b62', shirt: '#7a6a4a', pants: '#5f5238', headTex: 'face_husk' }),
  w: 0.6, h: 1.95, hp: 20, dmg: 3, speed: 0.10, hostile: true,
  anim: function (e, pose, t) { e.armsUp = true; animBiped(e, pose, t); },
  drops: [{ item: 'rotten_flesh', min: 0, max: 2 }],
  spawn: { biomes: ['desert', 'badlands', 'eroded_badlands'], light: 7, group: [2, 4], hostile: true }
});
defMob('drowned', {
  model: bipedModel({ skin: '#3f6d68', shirt: '#2f5a58', pants: '#26494a', headTex: 'face_drowned' }),
  w: 0.6, h: 1.95, hp: 20, dmg: 3, speed: 0.10, hostile: true, water: 'amphibious',
  anim: function (e, pose, t) { e.armsUp = true; animBiped(e, pose, t); },
  drops: [{ item: 'rotten_flesh', min: 0, max: 2 }],
  spawn: { biomes: ['ocean', 'deep_ocean', 'river', 'cold_ocean'], light: 7, group: [2, 3], hostile: true, water: true }
});
defMob('zombie_villager', {
  model: bipedModel({ skin: '#4a7a3c', shirt: '#5a6a4a', pants: '#3f4a38', headTex: 'face_villager_zombie',
    extra: [P('nose', [0, 26, -4], [-1, 0, -1, 2, 2, 1], '#3f6a32')] }),
  w: 0.6, h: 1.95, hp: 20, dmg: 3, speed: 0.10, hostile: true, burnsInSun: true,
  anim: function (e, pose, t) { e.armsUp = true; animBiped(e, pose, t); },
  drops: [{ item: 'rotten_flesh', min: 0, max: 2 }], spawn: null
});
defMob('skeleton', {
  model: bipedModel({ skin: '#c8c8c8', headTex: 'face_skeleton', armW: 2, arm: '#c0c0c0' }),
  w: 0.6, h: 1.95, hp: 20, dmg: 2, speed: 0.10, hostile: true, burnsInSun: true, ranged: 'arrow', shootRange: 15,
  anim: function (e, pose, t) {
    animBiped(e, pose, t);
    if (e.aiming > 0) { pose.armR = { rx: -1.6, ry: -0.2 }; pose.armL = { rx: -1.5, ry: 0.35 }; }
  },
  drops: [{ item: 'bone', min: 0, max: 2 }, { item: 'arrow', min: 0, max: 2 }],
  spawn: { biomes: null, light: 7, group: [1, 3], hostile: true }
});
defMob('stray', {
  model: bipedModel({ skin: '#d8e4e8', headTex: 'face_skeleton', armW: 2, shirt: '#6f8f9c', pants: '#5f7a86' }),
  w: 0.6, h: 1.95, hp: 20, dmg: 2, speed: 0.10, hostile: true, ranged: 'arrow', shootRange: 15,
  anim: function (e, pose, t) { animBiped(e, pose, t); if (e.aiming > 0) { pose.armR = { rx: -1.6 }; pose.armL = { rx: -1.5, ry: 0.35 }; } },
  drops: [{ item: 'bone', min: 0, max: 2 }, { item: 'arrow', min: 0, max: 2 }],
  spawn: { biomes: ['snowy_plains', 'ice_spikes', 'snowy_slopes', 'frozen_peaks'], light: 7, group: [1, 3], hostile: true }
});
defMob('bogged', {
  model: bipedModel({ skin: '#7f8f6a', headTex: 'face_skeleton', armW: 2,
    extra: [P('shroom', [2, 33, 0], [0, 0, -1, 3, 1, 3], '#b52a24')] }),
  w: 0.6, h: 1.95, hp: 16, dmg: 2, speed: 0.10, hostile: true, ranged: 'arrow', shootRange: 15,
  anim: animBiped, drops: [{ item: 'bone', min: 0, max: 2 }, { item: 'arrow', min: 0, max: 2 }],
  spawn: { biomes: ['swamp', 'mangrove_swamp'], light: 7, group: [1, 2], hostile: true }
});
defMob('wither_skeleton', {
  model: bipedModel({ skin: '#2e2e2e', headTex: 'face_wither_skeleton', armW: 2 }),
  w: 0.7, h: 2.4, hp: 20, dmg: 8, speed: 0.11, hostile: true, scale: 1.2, fireproof: true,
  anim: animBiped, drops: [{ item: 'coal', min: 0, max: 1 }, { item: 'bone', min: 0, max: 2 }, { item: 'wither_skeleton_skull', min: 0, max: 1, chance: 0.025 }],
  spawn: { biomes: ['nether_wastes', 'soul_sand_valley'], light: 11, group: [2, 4], hostile: true, dim: DIM_NETHER }
});
defMob('creeper', {
  model: {
    parts: [
      P('head', [0, 18, 0], [-4, 0, -4, 8, 8, 8], '#5fa04e', { tex: 'face_creeper' }),
      P('body', [0, 6, 0], [-4, 0, -2, 8, 12, 4], '#5fa04e'),
      P('legFL', [2, 6, -2], [-2, -6, -2, 4, 6, 4], '#4f8c40'),
      P('legFR', [-2, 6, -2], [-2, -6, -2, 4, 6, 4], '#4f8c40'),
      P('legBL', [2, 6, 2], [-2, -6, -2, 4, 6, 4], '#4f8c40'),
      P('legBR', [-2, 6, 2], [-2, -6, -2, 4, 6, 4], '#4f8c40')
    ], eye: 1.45
  },
  w: 0.6, h: 1.7, hp: 20, dmg: 0, speed: 0.10, hostile: true, explodes: true, fuse: 1.5, blastRadius: 3.2,
  anim: function (e, pose, t) {
    poseQuadWalk(pose, e.walkPhase * 1.7, 0.85 * e.walkAmt);
    pose.head = { rx: e.headPitch, ry: e.headYaw };
    if (e.fuseTime > 0) {
      var f = e.fuseTime / (MOBS.creeper.fuse);
      var s = 1 + Math.sin(e.fuseTime * 34) * 0.10 * (1 - f);
      pose.body = { s: s }; pose.head = { rx: e.headPitch, ry: e.headYaw, s: s };
      e.tint = [1 + (1 - f) * 1.4, 1, 1];
    } else e.tint = null;
  },
  drops: [{ item: 'gunpowder', min: 0, max: 2 }],
  spawn: { biomes: null, light: 7, group: [1, 2], hostile: true }
});
defMob('spider', {
  model: {
    parts: [
      P('head', [0, 9, -3], [-4, -4, -8, 8, 8, 8], '#2b1a12', { tex: 'face_spider' }),
      P('body', [0, 9, 0], [-5, -5, -3, 10, 8, 10], '#2b1a12'),
      P('l1', [4, 9, -4], [0, -1.5, -1.5, 13, 3, 3], '#2a1a12'),
      P('l2', [-4, 9, -4], [-13, -1.5, -1.5, 13, 3, 3], '#2a1a12'),
      P('l3', [4, 9, -1], [0, -1.5, -1.5, 13, 3, 3], '#2a1a12'),
      P('l4', [-4, 9, -1], [-13, -1.5, -1.5, 13, 3, 3], '#2a1a12'),
      P('l5', [4, 9, 2], [0, -1.5, -1.5, 13, 3, 3], '#2a1a12'),
      P('l6', [-4, 9, 2], [-13, -1.5, -1.5, 13, 3, 3], '#2a1a12'),
      P('l7', [4, 9, 5], [0, -1.5, -1.5, 13, 3, 3], '#2a1a12'),
      P('l8', [-4, 9, 5], [-13, -1.5, -1.5, 13, 3, 3], '#2a1a12')
    ], eye: 0.65
  },
  w: 1.4, h: 0.9, hp: 16, dmg: 2, speed: 0.14, hostile: true, climber: true, neutralInLight: true,
  anim: function (e, pose, t) {
    var sw = e.walkPhase * 3.2, a = 0.45 * e.walkAmt + 0.05;
    for (var i = 1; i <= 8; i++) {
      var ph = sw + i * 0.8;
      pose['l' + i] = { rz: (i % 2 ? 1 : -1) * (0.35 + Math.sin(ph) * a), ry: Math.cos(ph) * a * 0.7 };
    }
    pose.head = { ry: e.headYaw * 0.4 };
  },
  drops: [{ item: 'string', min: 0, max: 2 }, { item: 'spider_eye', min: 0, max: 1, chance: 0.3 }],
  spawn: { biomes: null, light: 7, group: [1, 2], hostile: true }
});
defMob('cave_spider', {
  model: MOBS.spider ? null : null, w: 0.7, h: 0.5, hp: 12, dmg: 2, speed: 0.16, hostile: true, climber: true, scale: 0.7,
  anim: MOBS.spider.anim, drops: [{ item: 'string', min: 0, max: 2 }],
  spawn: { biomes: null, light: 7, group: [1, 2], hostile: true, cave: true }
});
MOBS.cave_spider.model = {
  parts: MOBS.spider.model.parts.map(function (p) {
    var q = P(p.n, p.piv.slice(), p.box.slice(), p.n === 'head' ? '#12303a' : '#0f2630');
    if (p.n === 'head') { q.tex = 'face_cave_spider'; }
    return q;
  }), eye: 0.4
};
defMob('enderman', {
  model: bipedModel({ skin: '#0f0f14', headTex: 'face_enderman', headH: 8, headW: 8,
    bodyY: 26, legH: 26, armH: 26, armW: 2, arm: '#0d0d12', pants: '#0d0d12' }),
  w: 0.6, h: 2.9, hp: 40, dmg: 7, speed: 0.14, hostile: true, neutral: true, teleports: true, hurtByWater: true,
  anim: function (e, pose, t) {
    poseWalk(pose, e, e.walkPhase * 1.4, 0.7 * e.walkAmt, 0.7);
    pose.head = { rx: e.headPitch, ry: e.headYaw };
    if (e.angry) { pose.armL = { rx: -0.9, rz: 0.2 }; pose.armR = { rx: -0.9, rz: -0.2 }; pose.head.rx = -0.15; }
  },
  drops: [{ item: 'ender_pearl', min: 0, max: 1, chance: 0.5 }],
  spawn: { biomes: null, light: 7, group: [1, 2], hostile: true }
});
defMob('endermite', {
  model: { parts: [P('body', [0, 2, 0], [-2, 0, -3, 4, 4, 6], '#2a1f38', { tex: 'face_endermite' })], eye: 0.2 },
  w: 0.4, h: 0.3, hp: 8, dmg: 2, speed: 0.14, hostile: true,
  anim: function (e, pose, t) { pose.body = { ry: Math.sin(t * 12) * 0.2 * e.walkAmt }; }, spawn: null
});
defMob('silverfish', {
  model: { parts: [P('body', [0, 2, 0], [-2, 0, -4, 4, 3, 8], '#6a6a6a', { tex: 'face_silverfish' })], eye: 0.2 },
  w: 0.4, h: 0.3, hp: 8, dmg: 1, speed: 0.14, hostile: true,
  anim: function (e, pose, t) { pose.body = { ry: Math.sin(t * 14) * 0.25 * e.walkAmt }; },
  spawn: null
});
defMob('slime', {
  model: {
    parts: [
      P('body', [0, 0, 0], [-6, 0, -6, 12, 12, 12], '#6ec06a', { tex: 'face_slime' }),
      P('inner', [0, 3, 0], [-3, 0, -3, 6, 6, 6], '#4f9c4c')
    ], eye: 0.7
  },
  w: 1.0, h: 1.0, hp: 16, dmg: 3, speed: 0.08, hostile: true, splits: true,
  anim: function (e, pose, t) {
    var sq = Math.sin(e.walkPhase * 3) * 0.14 * (0.3 + e.walkAmt);
    pose.body = { s: 1 + sq, ty: -sq * 6 };
  },
  drops: [{ item: 'slime_ball', min: 0, max: 2 }],
  spawn: { biomes: ['swamp', 'mangrove_swamp'], light: 7, group: [1, 3], hostile: true }
});
defMob('magma_cube', {
  model: {
    parts: [
      P('body', [0, 0, 0], [-6, 0, -6, 12, 12, 12], '#8e3a10', { tex: 'face_magma_cube' }),
      P('inner', [0, 3, 0], [-3, 0, -3, 6, 6, 6], '#f08020')
    ], eye: 0.7
  },
  w: 1.0, h: 1.0, hp: 16, dmg: 4, speed: 0.10, hostile: true, splits: true, fireproof: true,
  anim: function (e, pose, t) { var sq = Math.sin(e.walkPhase * 3) * 0.22 * (0.3 + e.walkAmt); pose.body = { s: 1 + sq, ty: -sq * 6 }; },
  drops: [{ item: 'magma_cream', min: 0, max: 1 }],
  spawn: { biomes: ['nether_wastes', 'basalt_deltas'], light: 15, group: [1, 3], hostile: true, dim: DIM_NETHER }
});
defMob('witch', {
  model: bipedModel({ skin: '#3f6d68', shirt: '#3a2a5a', pants: '#2f2148', headTex: 'face_witch',
    extra: [P('hat', [0, 32, 0], [-5, 0, -5, 10, 2, 10], '#2f2148'),
      P('hat2', [0, 34, 0], [-3, 0, -3, 6, 3, 6], '#2f2148'),
      P('hat3', [1, 37, 1], [-2, 0, -2, 4, 4, 4], '#2f2148'),
      P('nose', [0, 26, -4], [-1, 0, -2, 2, 2, 2], '#2f5a56')] }),
  w: 0.6, h: 1.95, hp: 26, dmg: 0, speed: 0.10, hostile: true, ranged: 'potion', shootRange: 10,
  anim: animBiped, drops: [{ item: 'glass_bottle', min: 0, max: 2 }, { item: 'redstone', min: 0, max: 3 }],
  spawn: { biomes: null, light: 7, group: [1, 1], hostile: true }
});
defMob('phantom', {
  model: {
    parts: [
      P('body', [0, 6, 0], [-3, 0, -8, 6, 4, 16], '#3f4a6a'),
      P('head', [0, 8, -8], [-3, -2, -6, 6, 4, 6], '#3f4a6a', { tex: 'face_phantom' }),
      P('wingL', [3, 8, -2], [0, 0, -3, 14, 1, 8], '#354061'),
      P('wingR', [-3, 8, -2], [-14, 0, -3, 14, 1, 8], '#354061'),
      P('tail', [0, 7, 8], [-1, 0, 0, 2, 2, 8], '#354061')
    ], eye: 0.5
  },
  w: 0.9, h: 0.5, hp: 20, dmg: 4, speed: 0.24, hostile: true, fly: true, burnsInSun: true,
  anim: function (e, pose, t) { var f = Math.sin(t * 5 + e.seed) * 0.45; pose.wingL = { rz: -f }; pose.wingR = { rz: f }; pose.tail = { rx: f * 0.4 }; },
  drops: [{ item: 'phantom_membrane', min: 0, max: 1 }],
  spawn: null
});
defMob('guardian', {
  model: {
    parts: [
      P('body', [0, 8, 0], [-6, -6, -6, 12, 12, 12], '#5f9c92', { tex: 'face_guardian' }),
      P('s1', [0, 14, 0], [-1, 0, -1, 2, 6, 2], '#4f8a80'),
      P('s2', [0, 2, 0], [-1, -6, -1, 2, 6, 2], '#4f8a80'),
      P('s3', [6, 8, 0], [0, -1, -1, 6, 2, 2], '#4f8a80'),
      P('s4', [-6, 8, 0], [-6, -1, -1, 6, 2, 2], '#4f8a80'),
      P('tail', [0, 8, 6], [-1, -1.5, 0, 2, 3, 8], '#4f8a80')
    ], eye: 0.5
  },
  w: 0.85, h: 0.85, hp: 30, dmg: 6, speed: 0.12, hostile: true, water: true, ranged: 'beam', shootRange: 14,
  anim: function (e, pose, t) {
    var f = 0.2 + (e.attackTime > 0 ? 0.7 : 0);
    pose.s1 = { rx: -f }; pose.s2 = { rx: f }; pose.s3 = { rz: f }; pose.s4 = { rz: -f };
    pose.tail = { ry: Math.sin(t * 4 + e.seed) * 0.4 };
  },
  drops: [{ item: 'prismarine_shard', min: 0, max: 2 }, { item: 'prismarine_crystals', min: 0, max: 1 }],
  spawn: { biomes: ['ocean', 'deep_ocean'], light: 15, group: [1, 2], hostile: true, water: true, structure: 'monument' }
});
defMob('elder_guardian', {
  model: null, w: 2.0, h: 2.0, hp: 80, dmg: 8, speed: 0.1, hostile: true, water: true, boss: 'elder',
  ranged: 'beam', shootRange: 16, scale: 2.35,
  drops: [{ item: 'prismarine_shard', min: 2, max: 4 }, { item: 'sponge', min: 1, max: 1 }],
  spawn: null
});
MOBS.elder_guardian.model = MOBS.guardian.model;
MOBS.elder_guardian.anim = MOBS.guardian.anim;
defMob('shulker', {
  model: {
    parts: [
      P('base', [0, 0, 0], [-8, 0, -8, 16, 8, 16], '#986a98'),
      P('lid', [0, 8, 0], [-8, 0, -8, 16, 8, 16], '#7f567f'),
      P('head', [0, 6, 0], [-3, 0, -3, 6, 6, 6], '#986a98', { tex: 'face_shulker' })
    ], eye: 0.6
  },
  w: 1.0, h: 1.0, hp: 30, dmg: 4, speed: 0, hostile: true, static: true, ranged: 'shulker_bullet', shootRange: 14,
  anim: function (e, pose, t) { pose.lid = { ty: (e.open || 0) * 5, ry: (e.open || 0) * 0.4 }; },
  drops: [{ item: 'shulker_shell', min: 0, max: 1 }], spawn: null
});
defMob('blaze', {
  model: {
    parts: [
      P('head', [0, 12, 0], [-4, 0, -4, 8, 8, 8], '#f0a020', { tex: 'face_blaze' }),
      P('r1', [0, 6, 0], [1, 0, 1, 2, 8, 2], '#f0c040'),
      P('r2', [0, 6, 0], [-3, 0, 1, 2, 8, 2], '#f0c040'),
      P('r3', [0, 6, 0], [1, 0, -3, 2, 8, 2], '#f0c040'),
      P('r4', [0, 6, 0], [-3, 0, -3, 2, 8, 2], '#f0c040'),
      P('r5', [0, 4, 0], [3, 0, 0, 2, 8, 2], '#e8a020'),
      P('r6', [0, 4, 0], [-5, 0, 0, 2, 8, 2], '#e8a020')
    ], eye: 1.0
  },
  w: 0.6, h: 1.8, hp: 20, dmg: 6, speed: 0.12, hostile: true, fly: true, fireproof: true, ranged: 'fireball', shootRange: 16, glow: true,
  anim: function (e, pose, t) {
    for (var i = 1; i <= 6; i++) pose['r' + i] = { ry: t * 1.5 + i, ty: Math.sin(t * 3 + i) * 1.5 };
    pose.head = { rx: e.headPitch, ry: e.headYaw };
  },
  drops: [{ item: 'blaze_rod', min: 0, max: 1 }],
  spawn: { biomes: ['nether_wastes'], light: 15, group: [1, 3], hostile: true, dim: DIM_NETHER, structure: 'fortress' }
});
defMob('ghast', {
  model: {
    parts: [
      P('body', [0, 8, 0], [-8, -8, -8, 16, 16, 16], '#e8e8e8', { tex: 'face_ghast' }),
      P('t1', [4, 0, 4], [-1, -9, -1, 2, 9, 2], '#dcdcdc'),
      P('t2', [-4, 0, 4], [-1, -11, -1, 2, 11, 2], '#dcdcdc'),
      P('t3', [4, 0, -4], [-1, -11, -1, 2, 11, 2], '#dcdcdc'),
      P('t4', [-4, 0, -4], [-1, -9, -1, 2, 9, 2], '#dcdcdc'),
      P('t5', [0, 0, 0], [-1, -13, -1, 2, 13, 2], '#dcdcdc')
    ], eye: 2.0
  },
  w: 4.0, h: 4.0, hp: 10, dmg: 0, speed: 0.10, hostile: true, fly: true, fireproof: true, ranged: 'ghast_fireball', shootRange: 36, scale: 1.0,
  anim: function (e, pose, t) {
    for (var i = 1; i <= 5; i++) pose['t' + i] = { rx: Math.sin(t * 1.2 + i) * 0.2, rz: Math.cos(t * 1.1 + i) * 0.2 };
    pose.body = { ty: Math.sin(t * 0.8 + e.seed) * 1.5 };
  },
  drops: [{ item: 'ghast_tear', min: 0, max: 1 }, { item: 'gunpowder', min: 0, max: 2 }],
  spawn: { biomes: ['nether_wastes', 'soul_sand_valley', 'basalt_deltas'], light: 15, group: [1, 1], hostile: true, dim: DIM_NETHER }
});
defMob('zombified_piglin', {
  model: bipedModel({ skin: '#5a8a5a', shirt: '#c8956a', pants: '#4a6a4a', headTex: 'face_piglin' }),
  w: 0.6, h: 1.95, hp: 20, dmg: 5, speed: 0.11, hostile: true, neutral: true, fireproof: true,
  anim: function (e, pose, t) { e.armsUp = e.angry; animBiped(e, pose, t); },
  drops: [{ item: 'rotten_flesh', min: 0, max: 1 }, { item: 'gold_nugget', min: 0, max: 1 }],
  spawn: { biomes: ['nether_wastes', 'crimson_forest'], light: 15, group: [2, 4], hostile: true, dim: DIM_NETHER }
});
defMob('piglin', {
  model: bipedModel({ skin: '#e0a091', shirt: '#8a6a4a', pants: '#6f523a', headTex: 'face_piglin' }),
  w: 0.6, h: 1.95, hp: 16, dmg: 5, speed: 0.12, hostile: true, neutral: true, barters: true,
  anim: animBiped, drops: [], spawn: { biomes: ['nether_wastes', 'crimson_forest'], light: 15, group: [2, 4], hostile: true, dim: DIM_NETHER }
});
defMob('piglin_brute', {
  model: bipedModel({ skin: '#e0a091', shirt: '#4a3a2a', pants: '#3a2f22', headTex: 'face_piglin', armW: 5 }),
  w: 0.6, h: 1.95, hp: 50, dmg: 13, speed: 0.13, hostile: true, anim: animBiped, spawn: null
});
defMob('hoglin', {
  model: quadModel({ body: '#9c6a4a', head: '#9c6a4a', headTex: 'face_hoglin', bodyY: 12, bodyLen: 18, bodyW: 12, bodyH: 12, legH: 12, headSize: 9, headY: 8 }),
  w: 1.4, h: 1.4, hp: 40, dmg: 8, speed: 0.13, hostile: true, anim: animQuad, babyScale: 0.5,
  drops: [{ item: 'porkchop', min: 2, max: 4 }, { item: 'leather', min: 0, max: 1 }],
  spawn: { biomes: ['crimson_forest'], light: 15, group: [2, 4], hostile: true, dim: DIM_NETHER }
});
defMob('zoglin', {
  model: quadModel({ body: '#c07a6a', head: '#c07a6a', headTex: 'face_hoglin', bodyY: 12, bodyLen: 18, bodyW: 12, bodyH: 12, legH: 12, headSize: 9, headY: 8 }),
  w: 1.4, h: 1.4, hp: 40, dmg: 8, speed: 0.13, hostile: true, anim: animQuad, spawn: null
});
defMob('vex', {
  model: {
    parts: [
      P('body', [0, 8, 0], [-2, 0, -1.5, 4, 8, 3], '#8ea3b8'),
      P('head', [0, 16, 0], [-3, 0, -3, 6, 6, 6], '#8ea3b8', { tex: 'face_vex' }),
      P('armL', [2, 15, 0], [0, -6, -1, 1.5, 6, 2], '#7d92a6'),
      P('armR', [-2, 15, 0], [-1.5, -6, -1, 1.5, 6, 2], '#7d92a6'),
      P('wingL', [1, 14, 1], [0, -1, 0, 8, 8, 1], '#d8e8f4'),
      P('wingR', [-1, 14, 1], [-8, -1, 0, 8, 8, 1], '#d8e8f4')
    ], eye: 0.8
  },
  w: 0.4, h: 0.8, hp: 14, dmg: 6, speed: 0.22, hostile: true, fly: true,
  anim: function (e, pose, t) { var f = Math.sin(t * 24) * 0.8; pose.wingL = { ry: -f }; pose.wingR = { ry: f }; },
  spawn: null
});
function illagerModel(coat, cape) {
  return bipedModel({ skin: '#9a9a9a', shirt: coat, pants: '#3a3a3a', headTex: 'face_illager',
    extra: [P('nose', [0, 26, -4], [-1, 0, -2, 2, 2, 2], '#8a8a8a')].concat(cape ? [P('cape', [0, 24, 2.5], [-5, -12, 0, 10, 12, 1], cape)] : []) });
}
defMob('pillager', {
  model: illagerModel('#4a5a58'), w: 0.6, h: 1.95, hp: 24, dmg: 4, speed: 0.12, hostile: true, ranged: 'arrow', shootRange: 14,
  anim: function (e, pose, t) { animBiped(e, pose, t); if (e.aiming > 0) { pose.armR = { rx: -1.5, ry: -0.3 }; pose.armL = { rx: -1.5, ry: 0.3 }; } },
  drops: [{ item: 'arrow', min: 0, max: 2 }], spawn: { biomes: null, light: 7, group: [2, 4], hostile: true, structure: 'outpost' }
});
defMob('vindicator', {
  model: illagerModel('#3f4f5a'), w: 0.6, h: 1.95, hp: 24, dmg: 8, speed: 0.13, hostile: true,
  anim: function (e, pose, t) { animBiped(e, pose, t); if (!e.attackTime) { pose.armL = { rx: -0.15 }; pose.armR = { rx: -0.15 }; } },
  drops: [{ item: 'emerald', min: 0, max: 1 }], spawn: { biomes: null, light: 7, group: [1, 3], hostile: true, structure: 'mansion' }
});
defMob('evoker', {
  model: illagerModel('#2f3a44', '#c8b45a'), w: 0.6, h: 1.95, hp: 24, dmg: 0, speed: 0.10, hostile: true, ranged: 'fangs', shootRange: 14,
  anim: function (e, pose, t) { animBiped(e, pose, t); if (e.casting > 0) { pose.armL = { rx: -1.9, rz: 0.5 }; pose.armR = { rx: -1.9, rz: -0.5 }; } },
  drops: [{ item: 'emerald', min: 0, max: 1 }, { item: 'totem_of_undying', min: 1, max: 1 }],
  spawn: { biomes: null, light: 7, group: [1, 1], hostile: true, structure: 'mansion' }
});
defMob('illusioner', {
  model: illagerModel('#3a4a6a', '#5a6a8a'), w: 0.6, h: 1.95, hp: 32, dmg: 0, speed: 0.11, hostile: true, ranged: 'arrow', shootRange: 16,
  anim: animBiped, spawn: null
});
defMob('ravager', {
  model: quadModel({ body: '#4a3f34', head: '#6a5a4a', headTex: 'face_ravager', bodyY: 20, bodyLen: 22, bodyW: 14, bodyH: 14, legH: 20, headSize: 12, headY: 10, headZ: -2,
    extra: [P('saddle', [0, 34, 0], [-5, 0, -5, 10, 2, 10], '#8a5a3a')] }),
  w: 1.95, h: 2.2, hp: 100, dmg: 12, speed: 0.14, hostile: true, anim: animQuad,
  drops: [{ item: 'saddle', min: 1, max: 1 }], spawn: null
});
defMob('breeze', {
  model: {
    parts: [
      P('body', [0, 6, 0], [-4, 0, -4, 8, 10, 8], '#4a8fd8'),
      P('head', [0, 16, 0], [-3, 0, -3, 6, 6, 6], '#4a8fd8', { tex: 'face_breeze' }),
      P('ring', [0, 4, 0], [-6, 0, -6, 12, 2, 12], '#8fd0ff')
    ], eye: 1.2
  },
  w: 0.6, h: 1.77, hp: 30, dmg: 3, speed: 0.16, hostile: true, ranged: 'wind_charge', shootRange: 16, glow: true,
  anim: function (e, pose, t) { pose.ring = { ry: t * 3, ty: Math.sin(t * 4) * 2 }; pose.body = { ty: Math.abs(Math.sin(t * 3)) * 1.5 }; },
  spawn: null
});
defMob('creaking', {
  model: bipedModel({ skin: '#4a4a44', shirt: '#3f3f38', pants: '#35352f', headTex: 'face_creaking', armW: 3, armH: 16, legH: 16, bodyY: 16 }),
  w: 0.7, h: 2.7, hp: 1, dmg: 3, speed: 0.16, hostile: true, scale: 1.2, statue: true,
  anim: function (e, pose, t) { if (e.frozen) return; animBiped(e, pose, t); },
  spawn: { biomes: ['pale_garden'], light: 7, group: [1, 1], hostile: true }
});
defMob('warden', {
  model: bipedModel({ skin: '#0f2b30', shirt: '#123a40', bodyTex: 'warden_chest', pants: '#0d2429',
    headTex: 'face_warden', headW: 10, headH: 10, bodyY: 24, legH: 24, armH: 26, armW: 6, arm: '#0f3238' }),
  w: 0.9, h: 2.9, hp: 500, dmg: 30, speed: 0.13, hostile: true, boss: 'warden', scale: 1.2, blind: true, glow: true,
  anim: function (e, pose, t) {
    poseWalk(pose, e, e.walkPhase * 1.0, 0.75 * e.walkAmt, 0.8);
    pose.head = { rx: e.headPitch * 0.4, ry: e.headYaw * 0.5 };
    if (e.attackTime > 0) { var a = 1 - e.attackTime / 0.7, s = Math.sin(a * Math.PI); pose.armR = { rx: -s * 2.4, rz: -0.2 }; pose.armL = { rx: -s * 2.0, rz: 0.2 }; }
    if (e.roaring > 0) { pose.armL = { rx: -2.2, rz: 0.6 }; pose.armR = { rx: -2.2, rz: -0.6 }; pose.head = { rx: -0.5 }; }
  },
  drops: [{ item: 'sculk_catalyst', min: 1, max: 1 }], spawn: null
});

/* ================================ BOSSES ================================ */
defMob('ender_dragon', {
  model: {
    parts: [
      P('body', [0, 0, 0], [-12, -10, -16, 24, 24, 32], '#191019'),
      P('head', [0, 4, -30], [-6, -6, -12, 12, 12, 16], '#191019', { tex: 'face_dragon' }),
      P('neck', [0, 4, -18], [-5, -5, -14, 10, 10, 14], '#191019'),
      P('wingL', [12, 6, -2], [0, -1, -4, 40, 3, 16], '#241624'),
      P('wingR', [-12, 6, -2], [-40, -1, -4, 40, 3, 16], '#241624'),
      P('wingTipL', [52, 6, -2], [0, -1, -3, 32, 2, 12], '#1d121d'),
      P('wingTipR', [-52, 6, -2], [-32, -1, -3, 32, 2, 12], '#1d121d'),
      P('tail1', [0, 2, 16], [-4, -4, 0, 8, 8, 16], '#191019'),
      P('tail2', [0, 2, 32], [-3, -3, 0, 6, 6, 16], '#191019'),
      P('tail3', [0, 2, 48], [-2, -2, 0, 4, 4, 16], '#191019'),
      P('legL', [10, -8, 8], [-3, -16, -3, 6, 16, 6], '#191019'),
      P('legR', [-10, -8, 8], [-3, -16, -3, 6, 16, 6], '#191019')
    ], eye: 2.0
  },
  w: 8, h: 5, hp: 200, dmg: 12, speed: 0.5, hostile: true, fly: true, boss: 'dragon', scale: 1.0, xp: 500,
  anim: function (e, pose, t) {
    var f = Math.sin(t * 1.6 + e.seed) * 0.45;
    pose.wingL = { rz: -0.25 - f, ry: -0.1 }; pose.wingR = { rz: 0.25 + f, ry: 0.1 };
    pose.wingTipL = { rz: -f * 0.8 }; pose.wingTipR = { rz: f * 0.8 };
    pose.tail1 = { ry: Math.sin(t * 1.2) * 0.14 };
    pose.tail2 = { ry: Math.sin(t * 1.2 - 0.5) * 0.18 };
    pose.tail3 = { ry: Math.sin(t * 1.2 - 1.0) * 0.22 };
    pose.neck = { rx: Math.sin(t * 0.9) * 0.06 };
    pose.head = { rx: Math.sin(t * 0.9 + 0.4) * 0.08 };
  },
  spawn: null
});
defMob('wither', {
  model: {
    parts: [
      P('spine1', [0, 22, 0], [-2, 0, -2, 4, 10, 4], '#3a3a3a'),
      P('spine2', [0, 18, 0], [-4, 0, -2, 8, 4, 4], '#3a3a3a'),
      P('spine3', [0, 12, 0], [-2, 0, -2, 4, 8, 4], '#3a3a3a'),
      P('rib1', [0, 20, 0], [-9, 0, -1, 18, 2, 2], '#333333'),
      P('rib2', [0, 16, 0], [-7, 0, -1, 14, 2, 2], '#333333'),
      P('head', [0, 32, 0], [-5, 0, -5, 10, 10, 10], '#3a3a3a', { tex: 'face_wither' }),
      P('headL', [9, 30, 0], [-3, 0, -3, 6, 6, 6], '#333333', { tex: 'face_wither' }),
      P('headR', [-9, 30, 0], [-3, 0, -3, 6, 6, 6], '#333333', { tex: 'face_wither' })
    ], eye: 2.2
  },
  w: 0.9, h: 3.5, hp: 300, dmg: 8, speed: 0.22, hostile: true, fly: true, boss: 'wither', ranged: 'wither_skull', shootRange: 30, xp: 300,
  anim: function (e, pose, t) {
    pose.head = { ry: Math.sin(t * 0.8) * 0.2 };
    pose.headL = { ry: Math.sin(t * 1.1 + 1) * 0.5, rx: Math.sin(t * 0.7) * 0.2 };
    pose.headR = { ry: Math.sin(t * 1.0 + 2) * 0.5, rx: Math.sin(t * 0.9) * 0.2 };
    pose.spine1 = { ty: Math.sin(t * 2) * 0.5 };
  },
  drops: [{ item: 'nether_star', min: 1, max: 1 }], spawn: null
});

/* ------------------------------------------------------ item entities -- */
defMob('item', { model: { parts: [], eye: 0.2 }, w: 0.25, h: 0.25, hp: 1, isItem: true, spawn: null });
defMob('xp_orb', { model: { parts: [], eye: 0.2 }, w: 0.25, h: 0.25, hp: 1, isXP: true, spawn: null });
defMob('arrow', { model: { parts: [P('shaft', [0, 0, 0], [-0.5, -0.5, -8, 1, 1, 16], '#8a6a3a')], eye: 0 }, w: 0.25, h: 0.25, hp: 1, projectile: true, spawn: null });
defMob('fireball', { model: { parts: [P('core', [0, 0, 0], [-3, -3, -3, 6, 6, 6], '#f08020')], eye: 0 }, w: 0.4, h: 0.4, hp: 1, projectile: true, glow: true, spawn: null });
defMob('snowball', { model: { parts: [P('core', [0, 0, 0], [-2, -2, -2, 4, 4, 4], '#f0f8ff')], eye: 0 }, w: 0.25, h: 0.25, hp: 1, projectile: true, spawn: null });
defMob('ender_pearl_entity', { model: { parts: [P('core', [0, 0, 0], [-2, -2, -2, 4, 4, 4], '#1f9a7a')], eye: 0 }, w: 0.25, h: 0.25, hp: 1, projectile: true, spawn: null });
defMob('tnt', { model: { parts: [P('core', [0, 0, 0], [-8, 0, -8, 16, 16, 16], '#c8322a', { tex: 'tnt_side' })], eye: 0.5 }, w: 0.98, h: 0.98, hp: 1, primed: true, spawn: null });
defMob('boat', {
  model: { parts: [P('hull', [0, 0, 0], [-8, 0, -14, 16, 6, 28], '#b0904f'), P('rimL', [8, 3, 0], [-1, 0, -14, 1, 4, 28], '#98793f'), P('rimR', [-8, 3, 0], [0, 0, -14, 1, 4, 28], '#98793f')], eye: 0.3 },
  w: 1.4, h: 0.6, hp: 4, vehicle: true, spawn: null
});
defMob('minecart', {
  model: { parts: [P('body', [0, 2, 0], [-8, 0, -10, 16, 8, 20], '#8a8a8a')], eye: 0.4 },
  w: 0.98, h: 0.7, hp: 4, vehicle: true, spawn: null
});
defMob('falling_block', { model: { parts: [], eye: 0.5 }, w: 0.98, h: 0.98, hp: 1, falling: true, spawn: null });

/* light-emitting mobs shine a little on their own */
(function () {
  for (var k in MOBS) if (MOBS[k].glow) MOBS[k].emitLight = 8;
})();

/* -------------------------------------------------------- tile prebake -- */
/* Part tiles are created lazily the first time a model is drawn, but the
   texture array is uploaded once at boot — so every tile any entity could
   ever need has to exist before that upload. */
function prebakeEntityTiles() {
  function walk(parts) {
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (p.tex) customTile(p.tex, p.texParams);
      else if (p.col !== null && p.col !== undefined) partTile(p.col, p.v);
      if (p.kids) walk(p.kids);
    }
  }
  for (var k in MOBS) {
    var m = MOBS[k];
    if (m.model && m.model.parts) walk(m.model.parts);
  }
  /* first-person arms and the particle sprite */
  partTile(SKIN, 0.05); partTile(SKIN_D, 0.04);
  partTile(SLEEVE, 0.05); partTile(SLEEVE_D, 0.03);
  partTile('#ffffff', 0);
}

/* The end crystals that heal the dragon: a floating cube in a cage of fire. */
defMob('end_crystal', {
  model: { parts: [
    P('core', [0, 12, 0], [-4, -4, -4, 8, 8, 8], '#d8c8f0', { tex: 'face_dragon' }),
    P('frame', [0, 12, 0], [-6, -6, -6, 12, 12, 12], '#3a2a52', { inflate: 0 }),
    P('base', [0, 0, 0], [-6, 0, -6, 12, 3, 12], '#1b1420')
  ], eye: 0.9 },
  w: 1.0, h: 1.6, hp: 5, speed: 0, static: true, xp: 0, disp: 'End Crystal',
  anim: function (e, pose, t) {
    pose.core = { ry: t * 1.1, rx: Math.sin(t * 0.9) * 0.3, ty: Math.sin(t * 1.4) * 1.6 };
    pose.frame = { ry: -t * 0.6, s: 1.0 };
  },
  drops: [], explodes: false
});
