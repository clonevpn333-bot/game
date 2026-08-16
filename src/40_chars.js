/* 40_chars.js — procedural humanoids: skinned bodies, a real rig, and an animation
 * system with blending, one-shots and procedural layers. All generated in code.
 * OWNER: main.  See CONTRACT §7 for the state vocabulary.
 */
VH.Chars = (function () {
  const U = VH.util;
  const actors = [];
  let nid = 0;

  /* ------------------------------------------------------------------ rig spec
   * name: [parent, offset from parent (bind pose), radius at this joint]
   * Y-up, character faces -Z. Offsets are in metres for a 1.78m adult. */
  const RIG = [
    ['root', null, [0, 0.92, 0], 0.00],
    ['hips', 'root', [0, 0.00, 0], 0.145],
    ['spine', 'hips', [0, 0.14, 0], 0.150],
    ['chest', 'spine', [0, 0.19, 0], 0.170],
    ['neck', 'chest', [0, 0.20, 0], 0.062],
    ['head', 'neck', [0, 0.09, 0], 0.098],

    ['clavL', 'chest', [0.055, 0.14, 0], 0.055],
    ['armL', 'clavL', [0.135, 0.00, 0], 0.056],
    ['foreL', 'armL', [0.000, -0.275, 0], 0.046],
    ['handL', 'foreL', [0.000, -0.255, 0], 0.040],

    ['clavR', 'chest', [-0.055, 0.14, 0], 0.055],
    ['armR', 'clavR', [-0.135, 0.00, 0], 0.056],
    ['foreR', 'armR', [0.000, -0.275, 0], 0.046],
    ['handR', 'foreR', [0.000, -0.255, 0], 0.040],

    ['thighL', 'hips', [0.088, -0.06, 0], 0.088],
    ['shinL', 'thighL', [0, -0.415, 0], 0.062],
    ['footL', 'shinL', [0, -0.405, 0], 0.052],

    ['thighR', 'hips', [-0.088, -0.06, 0], 0.088],
    ['shinR', 'thighR', [0, -0.415, 0], 0.062],
    ['footR', 'shinR', [0, -0.405, 0], 0.052],
  ];

  /* Limb segments to skin: [boneA, boneB, radiusA, radiusB, sides, taperProfile] */
  const SEGMENTS = [
    ['hips', 'spine', 0.155, 0.145, 10, 'torso'],
    ['spine', 'chest', 0.145, 0.175, 10, 'torso'],
    ['chest', 'neck', 0.175, 0.070, 10, 'shoulders'],
    ['neck', 'head', 0.062, 0.085, 8, 'neck'],
    ['clavL', 'armL', 0.085, 0.058, 8, 'limb'],
    ['armL', 'foreL', 0.058, 0.044, 8, 'limb'],
    ['foreL', 'handL', 0.044, 0.035, 8, 'limb'],
    ['clavR', 'armR', 0.085, 0.058, 8, 'limb'],
    ['armR', 'foreR', 0.058, 0.044, 8, 'limb'],
    ['foreR', 'handR', 0.044, 0.035, 8, 'limb'],
    ['hips', 'thighL', 0.105, 0.090, 8, 'limb'],
    ['thighL', 'shinL', 0.090, 0.060, 8, 'limb'],
    ['shinL', 'footL', 0.060, 0.048, 8, 'limb'],
    ['hips', 'thighR', 0.105, 0.090, 8, 'limb'],
    ['thighR', 'shinR', 0.090, 0.060, 8, 'limb'],
    ['shinR', 'footR', 0.060, 0.048, 8, 'limb'],
  ];

  /* ------------------------------------------------------------- archetypes
   * Silhouette is the gameplay-critical property: the player must identify an
   * enemy at 25m in fog, from shape and accent colour alone. */
  const ARCH = {
    kas:       { scale: 1.00, build: 0.95, coat: 'long',  accent: 0x00e5ff, skin: 1, cloth: '#151a1f', hair: '#171412', chrome: 0.35, hp: 100 },
    grunt:     { scale: 0.99, build: 1.05, coat: 'vest',  accent: 0xff6a3d, skin: 0, cloth: '#26241f', hair: '#141210', chrome: 0.15, hp: 60 },
    shield:    { scale: 1.06, build: 1.45, coat: 'bulk',  accent: 0xffb340, skin: 2, cloth: '#2a2b2e', hair: '#101010', chrome: 0.5,  hp: 180 },
    sniper:    { scale: 1.02, build: 0.80, coat: 'long',  accent: 0x7cff5a, skin: 3, cloth: '#1c2226', hair: '#241c16', chrome: 0.25, hp: 55 },
    brute:     { scale: 1.14, build: 1.70, coat: 'bulk',  accent: 0xff2d6f, skin: 2, cloth: '#31231f', hair: '#0e0c0b', chrome: 0.8,  hp: 260 },
    netrunner: { scale: 0.97, build: 0.85, coat: 'robe',  accent: 0xc98bff, skin: 4, cloth: '#1b1726', hair: '#1a1a22', chrome: 0.2,  hp: 70 },
    civ:       { scale: 0.98, build: 1.00, coat: 'none',  accent: 0x8a97a0, skin: 0, cloth: '#2c2f33', hair: '#191614', chrome: 0.05, hp: 20 },
    sable:     { scale: 1.01, build: 0.92, coat: 'long',  accent: 0x00e5ff, skin: 4, cloth: '#0e1418', hair: '#c8ccd0', chrome: 0.45, hp: 400 },
    bishop:    { scale: 1.08, build: 1.30, coat: 'vest',  accent: 0xff2d6f, skin: 2, cloth: '#291d1a', hair: '#0d0c0b', chrome: 0.6,  hp: 350 },
    oye:       { scale: 1.00, build: 1.20, coat: 'none',  accent: 0xffb340, skin: 3, cloth: '#33302a', hair: '#15130f', chrome: 0.1,  hp: 100 },
    wick:      { scale: 1.00, build: 1.02, coat: 'vest',  accent: 0xbfe4ff, skin: 1, cloth: '#1a1f24', hair: '#2a2018', chrome: 0.4,  hp: 140 },
  };

  /* ------------------------------------------------------------------- clips
   * Poses are [boneName, rx, ry, rz] in radians. A clip is keyframes over time.
   * Authored so every one-shot has anticipation -> contact -> recovery. */
  function P() { const o = {}; for (let i = 0; i < arguments.length; i++) { const a = arguments[i]; o[a[0]] = [a[1] || 0, a[2] || 0, a[3] || 0]; } return o; }

  const CLIPS = {
    idle: {
      loop: true, dur: 4.0, keys: [
        { t: 0.0, p: P(['spine', 0.03, 0.02, 0], ['chest', 0.02, -0.02, 0], ['armL', 0.10, 0, 0.14], ['armR', 0.10, 0, -0.14], ['foreL', -0.30, 0, 0], ['foreR', -0.30, 0, 0], ['head', -0.02, 0.03, 0]) },
        { t: 2.0, p: P(['spine', 0.05, -0.03, 0], ['chest', 0.01, 0.03, 0], ['armL', 0.06, 0, 0.17], ['armR', 0.14, 0, -0.12], ['foreL', -0.36, 0, 0], ['foreR', -0.26, 0, 0], ['head', 0.01, -0.04, 0]) },
        { t: 4.0, p: P(['spine', 0.03, 0.02, 0], ['chest', 0.02, -0.02, 0], ['armL', 0.10, 0, 0.14], ['armR', 0.10, 0, -0.14], ['foreL', -0.30, 0, 0], ['foreR', -0.30, 0, 0], ['head', -0.02, 0.03, 0]) },
      ],
    },
    walk: {
      loop: true, dur: 1.08, keys: [
        { t: 0.00, p: P(['thighL', 0.52, 0, 0], ['shinL', -0.30, 0, 0], ['footL', 0.10, 0, 0], ['thighR', -0.38, 0, 0], ['shinR', -0.22, 0, 0], ['footR', 0.24, 0, 0], ['armL', -0.42, 0, 0.10], ['armR', 0.42, 0, -0.10], ['foreL', -0.34, 0, 0], ['foreR', -0.40, 0, 0], ['spine', 0.05, -0.09, 0], ['hips', 0, 0.09, 0]) },
        { t: 0.27, p: P(['thighL', 0.10, 0, 0], ['shinL', -0.06, 0, 0], ['footL', 0.02, 0, 0], ['thighR', -0.06, 0, 0], ['shinR', -0.44, 0, 0], ['footR', 0.16, 0, 0], ['armL', -0.10, 0, 0.12], ['armR', 0.10, 0, -0.12], ['foreL', -0.30, 0, 0], ['foreR', -0.32, 0, 0], ['spine', 0.06, 0, 0], ['hips', 0, 0, 0]) },
        { t: 0.54, p: P(['thighL', -0.38, 0, 0], ['shinL', -0.22, 0, 0], ['footL', 0.24, 0, 0], ['thighR', 0.52, 0, 0], ['shinR', -0.30, 0, 0], ['footR', 0.10, 0, 0], ['armL', 0.42, 0, 0.10], ['armR', -0.42, 0, -0.10], ['foreL', -0.40, 0, 0], ['foreR', -0.34, 0, 0], ['spine', 0.05, 0.09, 0], ['hips', 0, -0.09, 0]) },
        { t: 0.81, p: P(['thighL', -0.06, 0, 0], ['shinL', -0.44, 0, 0], ['footL', 0.16, 0, 0], ['thighR', 0.10, 0, 0], ['shinR', -0.06, 0, 0], ['footR', 0.02, 0, 0], ['armL', 0.10, 0, 0.12], ['armR', -0.10, 0, -0.12], ['foreL', -0.32, 0, 0], ['foreR', -0.30, 0, 0], ['spine', 0.06, 0, 0], ['hips', 0, 0, 0]) },
        { t: 1.08, p: P(['thighL', 0.52, 0, 0], ['shinL', -0.30, 0, 0], ['footL', 0.10, 0, 0], ['thighR', -0.38, 0, 0], ['shinR', -0.22, 0, 0], ['footR', 0.24, 0, 0], ['armL', -0.42, 0, 0.10], ['armR', 0.42, 0, -0.10], ['foreL', -0.34, 0, 0], ['foreR', -0.40, 0, 0], ['spine', 0.05, -0.09, 0], ['hips', 0, 0.09, 0]) },
      ],
    },
    run: {
      loop: true, dur: 0.72, keys: [
        { t: 0.00, p: P(['thighL', 0.92, 0, 0], ['shinL', -0.86, 0, 0], ['footL', 0.20, 0, 0], ['thighR', -0.62, 0, 0], ['shinR', -0.30, 0, 0], ['footR', 0.34, 0, 0], ['armL', -0.95, 0, 0.14], ['armR', 0.95, 0, -0.14], ['foreL', -1.15, 0, 0], ['foreR', -1.25, 0, 0], ['spine', 0.20, -0.14, 0], ['chest', 0.10, 0.10, 0], ['hips', 0, 0.14, 0]) },
        { t: 0.18, p: P(['thighL', 0.24, 0, 0], ['shinL', -0.20, 0, 0], ['footL', 0.06, 0, 0], ['thighR', 0.10, 0, 0], ['shinR', -1.05, 0, 0], ['footR', 0.30, 0, 0], ['armL', -0.24, 0, 0.14], ['armR', 0.24, 0, -0.14], ['foreL', -1.05, 0, 0], ['foreR', -1.10, 0, 0], ['spine', 0.24, 0, 0], ['hips', 0, 0, 0]) },
        { t: 0.36, p: P(['thighL', -0.62, 0, 0], ['shinL', -0.30, 0, 0], ['footL', 0.34, 0, 0], ['thighR', 0.92, 0, 0], ['shinR', -0.86, 0, 0], ['footR', 0.20, 0, 0], ['armL', 0.95, 0, 0.14], ['armR', -0.95, 0, -0.14], ['foreL', -1.25, 0, 0], ['foreR', -1.15, 0, 0], ['spine', 0.20, 0.14, 0], ['chest', 0.10, -0.10, 0], ['hips', 0, -0.14, 0]) },
        { t: 0.54, p: P(['thighL', 0.10, 0, 0], ['shinL', -1.05, 0, 0], ['footL', 0.30, 0, 0], ['thighR', 0.24, 0, 0], ['shinR', -0.20, 0, 0], ['footR', 0.06, 0, 0], ['armL', 0.24, 0, 0.14], ['armR', -0.24, 0, -0.14], ['foreL', -1.10, 0, 0], ['foreR', -1.05, 0, 0], ['spine', 0.24, 0, 0], ['hips', 0, 0, 0]) },
        { t: 0.72, p: P(['thighL', 0.92, 0, 0], ['shinL', -0.86, 0, 0], ['footL', 0.20, 0, 0], ['thighR', -0.62, 0, 0], ['shinR', -0.30, 0, 0], ['footR', 0.34, 0, 0], ['armL', -0.95, 0, 0.14], ['armR', 0.95, 0, -0.14], ['foreL', -1.15, 0, 0], ['foreR', -1.25, 0, 0], ['spine', 0.20, -0.14, 0], ['chest', 0.10, 0.10, 0], ['hips', 0, 0.14, 0]) },
      ],
    },
    /* Combat idle: weapon up, weight forward, ready to move. */
    aim: {
      loop: true, dur: 3.0, keys: [
        { t: 0.0, p: P(['spine', 0.09, -0.18, 0], ['chest', 0.04, -0.26, 0], ['armR', -1.24, 0.20, -0.30], ['foreR', -0.52, 0, 0], ['armL', -1.05, -0.34, 0.52], ['foreL', -0.86, 0, 0], ['head', 0, 0.16, 0], ['thighL', 0.06, 0, 0], ['thighR', -0.04, 0, 0]) },
        { t: 1.5, p: P(['spine', 0.10, -0.16, 0], ['chest', 0.05, -0.28, 0], ['armR', -1.20, 0.22, -0.28], ['foreR', -0.55, 0, 0], ['armL', -1.08, -0.32, 0.50], ['foreL', -0.84, 0, 0], ['head', 0, 0.15, 0], ['thighL', 0.05, 0, 0], ['thighR', -0.05, 0, 0]) },
        { t: 3.0, p: P(['spine', 0.09, -0.18, 0], ['chest', 0.04, -0.26, 0], ['armR', -1.24, 0.20, -0.30], ['foreR', -0.52, 0, 0], ['armL', -1.05, -0.34, 0.52], ['foreL', -0.86, 0, 0], ['head', 0, 0.16, 0], ['thighL', 0.06, 0, 0], ['thighR', -0.04, 0, 0]) },
      ],
    },
    /* Recoil travels: hand, forearm, shoulder, then a torso counter-rotation. */
    fire: {
      loop: false, dur: 0.30, mask: 'upper', keys: [
        { t: 0.00, p: P(['armR', -1.24, 0.20, -0.30], ['foreR', -0.52, 0, 0], ['handR', 0, 0, 0], ['chest', 0.04, -0.26, 0]) },
        { t: 0.04, p: P(['armR', -1.40, 0.24, -0.36], ['foreR', -0.40, 0, 0], ['handR', -0.34, 0, 0], ['chest', -0.03, -0.20, 0]) },
        { t: 0.11, p: P(['armR', -1.33, 0.22, -0.33], ['foreR', -0.47, 0, 0], ['handR', -0.16, 0, 0], ['chest', 0.00, -0.23, 0]) },
        { t: 0.30, p: P(['armR', -1.24, 0.20, -0.30], ['foreR', -0.52, 0, 0], ['handR', 0, 0, 0], ['chest', 0.04, -0.26, 0]) },
      ],
    },
    reload: {
      loop: false, dur: 1.15, mask: 'upper', keys: [
        { t: 0.00, p: P(['armR', -1.24, 0.20, -0.30], ['foreR', -0.52, 0, 0], ['armL', -1.05, -0.34, 0.52], ['foreL', -0.86, 0, 0]) },
        { t: 0.22, p: P(['armR', -0.80, 0.30, -0.20], ['foreR', -1.05, 0, 0], ['armL', -0.35, -0.20, 0.30], ['foreL', -1.80, 0, 0], ['head', 0.16, 0.10, 0]) },
        { t: 0.55, p: P(['armR', -0.86, 0.28, -0.22], ['foreR', -1.00, 0, 0], ['armL', -1.30, -0.30, 0.55], ['foreL', -1.35, 0, 0], ['head', 0.10, 0.12, 0]) },
        { t: 0.82, p: P(['armR', -1.05, 0.24, -0.26], ['foreR', -0.72, 0, 0], ['armL', -0.90, -0.36, 0.48], ['foreL', -1.00, 0, 0]) },
        { t: 1.15, p: P(['armR', -1.24, 0.20, -0.30], ['foreR', -0.52, 0, 0], ['armL', -1.05, -0.34, 0.52], ['foreL', -0.86, 0, 0]) },
      ],
    },
    melee1: {
      loop: false, dur: 0.52, mask: 'upper', keys: [
        { t: 0.00, p: P(['chest', 0.04, -0.26, 0], ['armR', -1.24, 0.20, -0.30], ['foreR', -0.52, 0, 0]) },
        { t: 0.14, p: P(['chest', 0.02, -0.62, 0], ['armR', -0.55, -0.30, -0.70], ['foreR', -1.50, 0, 0], ['spine', 0.02, -0.30, 0]) },  /* anticipation */
        { t: 0.24, p: P(['chest', 0.06, 0.42, 0], ['armR', -1.60, 0.60, 0.35], ['foreR', -0.18, 0, 0], ['spine', 0.10, 0.24, 0]) },      /* contact */
        { t: 0.36, p: P(['chest', 0.05, 0.20, 0], ['armR', -1.30, 0.40, 0.10], ['foreR', -0.45, 0, 0], ['spine', 0.08, 0.10, 0]) },
        { t: 0.52, p: P(['chest', 0.04, -0.26, 0], ['armR', -1.24, 0.20, -0.30], ['foreR', -0.52, 0, 0], ['spine', 0.09, -0.18, 0]) },
      ],
    },
    hitL: {
      loop: false, dur: 0.34, mask: 'upper', additive: true, keys: [
        { t: 0.00, p: P(['chest', 0, 0, 0], ['head', 0, 0, 0]) },
        { t: 0.07, p: P(['chest', -0.14, 0.22, 0.16], ['head', 0.10, 0.24, 0.12], ['spine', -0.08, 0.12, 0.08]) },
        { t: 0.34, p: P(['chest', 0, 0, 0], ['head', 0, 0, 0]) },
      ],
    },
    hitR: {
      loop: false, dur: 0.34, mask: 'upper', additive: true, keys: [
        { t: 0.00, p: P(['chest', 0, 0, 0], ['head', 0, 0, 0]) },
        { t: 0.07, p: P(['chest', -0.14, -0.22, -0.16], ['head', 0.10, -0.24, -0.12], ['spine', -0.08, -0.12, -0.08]) },
        { t: 0.34, p: P(['chest', 0, 0, 0], ['head', 0, 0, 0]) },
      ],
    },
    stagger: {
      loop: false, dur: 0.75, keys: [
        { t: 0.00, p: P(['spine', 0.05, 0, 0]) },
        { t: 0.10, p: P(['spine', -0.34, 0.10, 0], ['chest', -0.28, 0, 0], ['head', 0.30, 0, 0], ['thighL', 0.22, 0, 0], ['thighR', -0.14, 0, 0], ['armL', -0.50, 0, 0.5], ['armR', -0.50, 0, -0.5]) },
        { t: 0.34, p: P(['spine', 0.16, -0.06, 0], ['chest', 0.12, 0, 0], ['head', -0.12, 0, 0], ['thighL', -0.10, 0, 0], ['thighR', 0.18, 0, 0]) },
        { t: 0.75, p: P(['spine', 0.05, 0, 0]) },
      ],
    },
    death: {
      loop: false, dur: 1.5, hold: true, keys: [
        { t: 0.00, p: P(['spine', 0.05, 0, 0]) },
        { t: 0.16, p: P(['spine', -0.30, 0.14, 0], ['chest', -0.24, 0, 0], ['head', 0.34, 0.1, 0], ['armL', -0.70, 0, 0.7], ['armR', -0.70, 0, -0.7], ['thighL', 0.30, 0, 0]) },
        { t: 0.52, p: P(['spine', 0.55, 0.2, 0.1], ['chest', 0.40, 0, 0], ['head', 0.20, 0.2, 0], ['thighL', 0.95, 0, 0.1], ['thighR', 0.70, 0, -0.1], ['shinL', -1.30, 0, 0], ['shinR', -1.10, 0, 0], ['armL', 0.20, 0, 0.9], ['armR', 0.10, 0, -0.8]) },
        { t: 1.50, p: P(['spine', 0.70, 0.24, 0.14], ['chest', 0.46, 0, 0], ['head', 0.30, 0.26, 0], ['thighL', 1.05, 0, 0.14], ['thighR', 0.80, 0, -0.12], ['shinL', -1.45, 0, 0], ['shinR', -1.25, 0, 0], ['armL', 0.24, 0, 1.0], ['armR', 0.14, 0, -0.9]) },
      ],
    },
    dash: {
      loop: false, dur: 0.34, keys: [
        { t: 0.00, p: P(['spine', 0.05, 0, 0]) },
        { t: 0.09, p: P(['spine', 0.42, 0, 0], ['chest', 0.20, 0, 0], ['head', -0.30, 0, 0], ['thighL', 0.70, 0, 0], ['shinL', -1.10, 0, 0], ['thighR', -0.45, 0, 0], ['armL', -0.90, 0, 0.3], ['armR', -0.90, 0, -0.3]) },
        { t: 0.34, p: P(['spine', 0.05, 0, 0]) },
      ],
    },
    cover: {
      loop: true, dur: 3.0, keys: [
        { t: 0.0, p: P(['spine', 0.30, 0.10, 0], ['chest', 0.20, 0.14, 0], ['head', -0.24, -0.20, 0], ['thighL', 0.34, 0, 0], ['shinL', -0.50, 0, 0], ['thighR', 0.20, 0, 0], ['shinR', -0.34, 0, 0], ['armR', -1.10, 0.30, -0.30], ['foreR', -1.20, 0, 0], ['armL', -0.60, 0, 0.4]) },
        { t: 3.0, p: P(['spine', 0.32, 0.10, 0], ['chest', 0.21, 0.14, 0], ['head', -0.22, -0.20, 0], ['thighL', 0.34, 0, 0], ['shinL', -0.50, 0, 0], ['thighR', 0.20, 0, 0], ['shinR', -0.34, 0, 0], ['armR', -1.10, 0.30, -0.30], ['foreR', -1.20, 0, 0], ['armL', -0.60, 0, 0.4]) },
      ],
    },
    talk: {
      loop: true, dur: 5.0, keys: [
        { t: 0.0, p: P(['spine', 0.03, 0.03, 0], ['armL', 0.12, 0, 0.18], ['foreL', -0.55, 0, 0], ['armR', 0.08, 0, -0.14], ['foreR', -0.35, 0, 0], ['head', 0, 0.05, 0]) },
        { t: 1.7, p: P(['spine', 0.05, -0.05, 0], ['armL', 0.05, 0, 0.14], ['foreL', -0.95, 0.2, 0], ['armR', 0.12, 0, -0.18], ['foreR', -0.30, 0, 0], ['head', 0.05, -0.08, 0.03]) },
        { t: 3.3, p: P(['spine', 0.02, 0.05, 0], ['armL', 0.14, 0, 0.20], ['foreL', -0.45, 0, 0], ['armR', 0.05, 0, -0.10], ['foreR', -0.70, -0.15, 0], ['head', -0.04, 0.10, -0.02]) },
        { t: 5.0, p: P(['spine', 0.03, 0.03, 0], ['armL', 0.12, 0, 0.18], ['foreL', -0.55, 0, 0], ['armR', 0.08, 0, -0.14], ['foreR', -0.35, 0, 0], ['head', 0, 0.05, 0]) },
      ],
    },
  };
  CLIPS.sprint = CLIPS.run;
  CLIPS.strafeL = CLIPS.walk; CLIPS.strafeR = CLIPS.walk; CLIPS.back = CLIPS.walk;
  CLIPS.crouch = CLIPS.cover; CLIPS.coverPeek = CLIPS.cover;
  CLIPS.melee2 = CLIPS.melee1; CLIPS.hitHeavy = CLIPS.stagger;
  CLIPS.jump = CLIPS.dash; CLIPS.fall = CLIPS.dash; CLIPS.land = CLIPS.dash;
  CLIPS.vault = CLIPS.dash; CLIPS.interact = CLIPS.talk; CLIPS.sit = CLIPS.idle;
  CLIPS.dead = CLIPS.death;

  const UPPER = { spine: 1, chest: 1, neck: 1, head: 1, clavL: 1, armL: 1, foreL: 1, handL: 1, clavR: 1, armR: 1, foreR: 1, handR: 1 };

  /* ------------------------------------------------------------- rig building */
  function buildSkeleton(a) {
    const bones = {}, order = [];
    for (const [name, parent, off] of RIG) {
      const b = new THREE.Bone();
      b.name = name;
      b.position.set(off[0] * a.build2, off[1] * a.scale2, off[2]);
      b.userData.bind = b.position.clone();
      bones[name] = b; order.push(name);
      if (parent) bones[parent].add(b);
    }
    return { bones, order, root: bones.root };
  }

  /* Skin a tapered tube between two bones. Weights blend by position along the
   * segment, which is what stops elbows and knees from pinching. */
  function segmentGeometry(a, bones, seg, verts, idx, skinIdx, skinW, boneIndex) {
    const [n0, n1, r0, r1, sides, profile] = seg;
    const b0 = bones[n0], b1 = bones[n1];
    const p0 = new THREE.Vector3(), p1 = new THREE.Vector3();
    b0.updateWorldMatrix(true, false); b1.updateWorldMatrix(true, false);
    p0.setFromMatrixPosition(b0.matrixWorld);
    p1.setFromMatrixPosition(b1.matrixWorld);

    const dir = p1.clone().sub(p0);
    const len = dir.length();
    if (len < 1e-5) return;
    dir.normalize();
    const up = Math.abs(dir.y) > 0.94 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0);
    const tx = new THREE.Vector3().crossVectors(up, dir).normalize();
    const tz = new THREE.Vector3().crossVectors(dir, tx).normalize();

    const rings = 4;
    const i0 = boneIndex[n0], i1 = boneIndex[n1];
    const base = verts.length / 3;

    for (let r = 0; r <= rings; r++) {
      const t = r / rings;
      let rad = U.lerp(r0, r1, t);
      /* profile shaping: real anatomy has a waist and a chest, not a sausage */
      if (profile === 'torso') rad *= 1 + Math.sin(t * Math.PI) * -0.16 * a.build2;
      else if (profile === 'shoulders') rad *= 1 + (1 - t) * 0.22 * a.build2;
      else if (profile === 'limb') rad *= 1 + Math.sin(t * Math.PI) * 0.13;
      const c = p0.clone().addScaledVector(dir, len * t);
      /* squash the torso front-to-back so it is not circular */
      const sqz = (profile === 'torso' || profile === 'shoulders') ? 0.74 : 0.94;
      for (let s = 0; s < sides; s++) {
        const ang = (s / sides) * Math.PI * 2;
        const ox = Math.cos(ang) * rad, oz = Math.sin(ang) * rad * sqz;
        verts.push(c.x + tx.x * ox + tz.x * oz, c.y + tx.y * ox + tz.y * oz, c.z + tx.z * ox + tz.z * oz);
        /* weights: smoothstep along the segment, so the joint bends smoothly */
        const w = U.smoothstep(0.12, 0.88, t);
        skinIdx.push(i0, i1, 0, 0);
        skinW.push(1 - w, w, 0, 0);
      }
    }
    for (let r = 0; r < rings; r++) {
      for (let s = 0; s < sides; s++) {
        const s2 = (s + 1) % sides;
        const A = base + r * sides + s, B = base + r * sides + s2;
        const C = base + (r + 1) * sides + s, D = base + (r + 1) * sides + s2;
        idx.push(A, C, B, B, C, D);
      }
    }
  }

  function buildBody(a, bones, boneIndex, boneList) {
    const verts = [], idx = [], skinIdx = [], skinW = [];
    for (const seg of SEGMENTS) segmentGeometry(a, bones, seg, verts, idx, skinIdx, skinW, boneIndex);

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIdx, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinW, 4));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }

  /* Head: a shaped skull rather than a sphere. Brow, jaw, nose from a profile lathe. */
  function buildHead(a) {
    const pts = [];
    const prof = [
      [0.00, -0.10], [0.055, -0.095], [0.075, -0.062], [0.083, -0.020],
      [0.090, 0.020], [0.093, 0.055], [0.084, 0.085], [0.058, 0.105], [0.00, 0.112],
    ];
    for (const [r, y] of prof) pts.push(new THREE.Vector2(Math.max(0.001, r), y));
    const g = new THREE.LatheGeometry(pts, 12);
    g.scale(1.0, 1.0, 0.90);
    return g;
  }

  /* ------------------------------------------------------------------ clothing */
  function buildClothing(a, bones, boneIndex, group, mats) {
    const style = a.spec.coat;
    if (style === 'none') return;

    if (style === 'long' || style === 'robe') {
      /* Long coat: a skirt of panels hung off the hips that gets secondary motion. */
      const panels = 9, R = 0.24 * a.build2, H = style === 'robe' ? 0.86 : 0.72;
      const geos = [];
      for (let i = 0; i < panels; i++) {
        const ang = (i / panels) * Math.PI * 2;
        const nx = Math.cos(ang), nz = Math.sin(ang);
        const w = (Math.PI * 2 * R) / panels * 1.28;
        const p = new THREE.PlaneGeometry(w, H, 1, 3);
        p.translate(0, -H / 2, 0);
        const m = new THREE.Matrix4().makeRotationY(-ang + Math.PI / 2);
        p.applyMatrix4(m);
        p.translate(nx * R, 0, nz * R);
        geos.push(p);
      }
      const merged = U.mergeGeometries(geos);
      geos.forEach(x => x.dispose());
      const coat = new THREE.Mesh(merged, mats.coat);
      coat.position.y = 0.98 * a.scale2;
      coat.userData.sway = true;
      group.add(coat);
      a.anim.coat = coat;
      a.anim.coatBase = merged.attributes.position.array.slice();
    }
    if (style === 'bulk') {
      /* Armour plates: shoulders and chest, parented to bones so they follow. */
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.16, 0.26), mats.plate);
      plate.position.set(0.10, 0.02, 0);
      bones.clavL.add(plate);
      const plate2 = plate.clone(); plate2.position.x = -0.10; bones.clavR.add(plate2);
      const chestP = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.34, 0.30), mats.plate);
      chestP.position.set(0, 0.08, 0.02);
      bones.chest.add(chestP);
    }
    if (style === 'vest') {
      const vest = new THREE.Mesh(new THREE.BoxGeometry(0.40 * a.build2, 0.40, 0.29 * a.build2), mats.coat);
      vest.position.set(0, 0.06, 0);
      bones.chest.add(vest);
    }
  }

  /* ------------------------------------------------------------------- create */
  function create(archetype, opts) {
    opts = opts || {};
    const spec = ARCH[archetype] || ARCH.civ;
    const group = new THREE.Group();

    const a = {
      id: (spec === ARCH.kas ? 'p' : 'e') + (nid++),
      group: group, kind: opts.kind || (archetype === 'kas' ? 'player' : (spec.hp <= 20 ? 'npc' : 'enemy')),
      archetype: archetype, spec: spec,
      team: opts.team === undefined ? (archetype === 'kas' ? 0 : (archetype === 'civ' ? 2 : 1)) : opts.team,
      hp: opts.hp || spec.hp, maxHp: opts.hp || spec.hp, armor: opts.armor || 0, alive: true,
      radius: 0.40 * spec.build, height: 1.78 * spec.scale,
      vel: new THREE.Vector3(), yaw: 0, state: 'idle',
      stagger: 0, iframes: 0, aim: new THREE.Vector3(), weapon: null,
      anim: {}, ai: {},
      scale2: spec.scale, build2: spec.build,
      headPos() { return group.localToWorld(new THREE.Vector3(0, 1.62 * spec.scale, 0)); },
      chestPos() { return group.localToWorld(new THREE.Vector3(0, 1.28 * spec.scale, 0)); },
    };

    /* materials — accent colour is the legibility channel */
    const accent = new THREE.Color(spec.accent);
    const mats = {
      skin: new THREE.MeshStandardMaterial({ map: VH.Mat.tex('skin', { tone: spec.skin }), roughness: 0.66, metalness: 0.0, envMapIntensity: 0.7 }),
      coat: new THREE.MeshStandardMaterial({ color: new THREE.Color(spec.cloth), roughness: 0.88, metalness: 0.02, side: THREE.DoubleSide, envMapIntensity: 0.4 }),
      plate: new THREE.MeshStandardMaterial({ color: new THREE.Color(spec.cloth).multiplyScalar(1.2), roughness: 0.44, metalness: 0.7, envMapIntensity: 1.2 }),
      chrome: new THREE.MeshStandardMaterial({ color: 0xb9c4cc, roughness: 0.24, metalness: 1.0, envMapIntensity: 1.6 }),
      glow: new THREE.MeshStandardMaterial({ color: 0x080808, emissive: accent, emissiveIntensity: 4.5, roughness: 0.4 }),
      hair: new THREE.MeshStandardMaterial({ color: new THREE.Color(spec.hair), roughness: 0.92, metalness: 0.0 }),
    };
    if (VH.Core.env) for (const k in mats) mats[k].envMap = VH.Core.env;
    a.anim.mats = mats;

    const sk = buildSkeleton(a);
    const boneList = sk.order.map(n => sk.bones[n]);
    const boneIndex = {}; sk.order.forEach((n, i) => { boneIndex[n] = i; });
    a.anim.bones = sk.bones; a.anim.order = sk.order;

    const geo = buildBody(a, sk.bones, boneIndex, boneList);
    const skeleton = new THREE.Skeleton(boneList);
    const mesh = new THREE.SkinnedMesh(geo, mats.skin);
    mesh.add(sk.root);
    /* Bone inverses must be computed while the bones' world matrices are still
     * mesh-local, and with an explicit identity bind matrix — otherwise the group
     * transform is applied twice and the body lands nowhere near the actor. */
    mesh.updateMatrixWorld(true);
    mesh.bind(skeleton, new THREE.Matrix4());
    mesh.frustumCulled = false;
    group.add(mesh);
    a.anim.mesh = mesh; a.anim.skeleton = skeleton;

    /* Body wears clothing over the skinned torso: a second skinned copy tinted
     * as cloth, scaled slightly out, so limbs read as sleeved not bare. */
    const clothGeo = geo.clone();
    const pos = clothGeo.attributes.position;
    const nrm = geo.attributes.normal;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      /* leave the head and hands bare */
      const bare = y > 1.52 * spec.scale;
      const g = bare ? 0 : 0.016;
      pos.setXYZ(i, pos.getX(i) + nrm.getX(i) * g, y + nrm.getY(i) * g * 0.4, pos.getZ(i) + nrm.getZ(i) * g);
    }
    const clothMesh = new THREE.SkinnedMesh(clothGeo, mats.coat);
    clothMesh.updateMatrixWorld(true);
    clothMesh.bind(skeleton, new THREE.Matrix4());
    clothMesh.frustumCulled = false;
    group.add(clothMesh);

    /* head */
    const head = new THREE.Mesh(buildHead(a), mats.skin);
    sk.bones.head.add(head);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.098, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.62), mats.hair);
    hair.position.y = 0.015; hair.scale.set(1.06, 1.12, 1.02);
    sk.bones.head.add(hair);
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.0135, 6, 5), new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.16, metalness: 0.2 }));
      eye.position.set(s * 0.031, 0.021, -0.079);
      sk.bones.head.add(eye);
    }
    /* optic implant — the archetype's accent colour, visible at range */
    const optic = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.017, 0.012), mats.glow);
    optic.position.set(0.034, 0.024, -0.082);
    sk.bones.head.add(optic);

    /* cyberware on the arm, scaled by archetype */
    if (spec.chrome > 0.2) {
      const armPlate = new THREE.Mesh(new THREE.BoxGeometry(0.075 * spec.build, 0.20, 0.075 * spec.build), mats.chrome);
      armPlate.position.set(0, -0.13, 0);
      sk.bones.foreR.add(armPlate);
    }
    if (spec.chrome > 0.55) {
      const spine = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.05), mats.chrome);
      spine.position.set(0, 0.05, 0.10);
      sk.bones.chest.add(spine);
    }

    buildClothing(a, sk.bones, boneIndex, group, mats);

    /* animation state */
    a.anim.t = 0; a.anim.phase = 0; a.anim.speed = 0;
    a.anim.oneShot = null; a.anim.oneShotT = 0;
    a.anim.additive = []; a.anim.blend = {};
    a.anim.lookAt = new THREE.Vector3();
    a.anim.lookW = 0;
    a.anim.breath = Math.random() * 6.28;

    group.scale.setScalar(1);
    actors.push(a);
    return a;
  }

  /* --------------------------------------------------------------- evaluation */
  const _q = new THREE.Quaternion(), _e = new THREE.Euler();

  function samplePose(clip, t, out) {
    const keys = clip.keys;
    let k1 = 0;
    while (k1 < keys.length - 1 && keys[k1 + 1].t < t) k1++;
    const k2 = Math.min(keys.length - 1, k1 + 1);
    const a = keys[k1], b = keys[k2];
    const span = Math.max(1e-5, b.t - a.t);
    let f = U.clamp((t - a.t) / span, 0, 1);
    f = f * f * (3 - 2 * f);                     /* ease every segment */
    for (const name in b.p) {
      const pb = b.p[name], pa = a.p[name] || [0, 0, 0];
      let o = out[name];
      if (!o) o = out[name] = [0, 0, 0];
      o[0] = U.lerp(pa[0], pb[0], f);
      o[1] = U.lerp(pa[1], pb[1], f);
      o[2] = U.lerp(pa[2], pb[2], f);
    }
    for (const name in a.p) if (!(name in b.p)) {
      let o = out[name]; if (!o) o = out[name] = [0, 0, 0];
      const pa = a.p[name];
      o[0] = U.lerp(pa[0], 0, f); o[1] = U.lerp(pa[1], 0, f); o[2] = U.lerp(pa[2], 0, f);
    }
  }

  const poseA = {}, poseB = {}, poseOut = {};
  function clearPose(p) { for (const k in p) { p[k][0] = 0; p[k][1] = 0; p[k][2] = 0; } }

  function updateActor(a, dt) {
    const A = a.anim;
    if (!A.bones) return;

    const speed = Math.hypot(a.vel.x, a.vel.z);
    A.speed = U.damp(A.speed, speed, 10, dt);

    /* ---- locomotion blend: idle <-> walk <-> run, phase-continuous ---- */
    let baseClip, blendClip = null, blendF = 0, rate = 1;
    const s = A.speed;
    if (a.state === 'death' || a.state === 'dead') { baseClip = CLIPS.death; }
    else if (a.state === 'stagger') { baseClip = CLIPS.stagger; }
    else if (a.state === 'cover' || a.state === 'crouch') { baseClip = CLIPS.cover; }
    else if (a.state === 'talk') { baseClip = CLIPS.talk; }
    else if (s < 0.15) { baseClip = (a.state === 'aim' || a.weapon) ? CLIPS.aim : CLIPS.idle; }
    else if (s < 3.2) {
      baseClip = (a.state === 'aim' || a.weapon) ? CLIPS.aim : CLIPS.idle;
      blendClip = CLIPS.walk; blendF = U.smoothstep(0.15, 2.2, s);
      rate = U.clamp(s / 1.55, 0.55, 1.7);
    } else {
      baseClip = CLIPS.walk; blendClip = CLIPS.run;
      blendF = U.smoothstep(3.2, 6.0, s);
      rate = U.clamp(s / 5.2, 0.7, 1.5);
    }

    /* phase advances with distance travelled so feet do not skate */
    if (blendClip === CLIPS.walk || blendClip === CLIPS.run || baseClip === CLIPS.walk) {
      A.phase += dt * rate / (blendClip === CLIPS.run ? CLIPS.run.dur : CLIPS.walk.dur);
      A.phase %= 1;
    }
    A.t += dt;

    clearPose(poseOut);
    const bt = baseClip.loop ? (A.t % baseClip.dur) : Math.min(A.t, baseClip.dur);
    if (baseClip === CLIPS.walk || baseClip === CLIPS.run) samplePose(baseClip, A.phase * baseClip.dur, poseOut);
    else samplePose(baseClip, bt, poseOut);

    if (blendClip && blendF > 0.001) {
      clearPose(poseB);
      samplePose(blendClip, A.phase * blendClip.dur, poseB);
      for (const n in poseB) {
        let o = poseOut[n]; if (!o) o = poseOut[n] = [0, 0, 0];
        o[0] = U.lerp(o[0], poseB[n][0], blendF);
        o[1] = U.lerp(o[1], poseB[n][1], blendF);
        o[2] = U.lerp(o[2], poseB[n][2], blendF);
      }
    }

    /* ---- one-shot overlay (fire / reload / melee), upper-body masked ---- */
    if (A.oneShot) {
      const c = A.oneShot;
      A.oneShotT += dt;
      if (A.oneShotT >= c.dur && !c.hold) { A.oneShot = null; }
      else {
        clearPose(poseA);
        samplePose(c, Math.min(A.oneShotT, c.dur), poseA);
        /* ease in and out so the overlay never pops */
        const w = Math.min(1, U.smoothstep(0, 0.06, A.oneShotT) * U.smoothstep(0, 0.10, c.dur - A.oneShotT + 0.10));
        for (const n in poseA) {
          if (c.mask === 'upper' && !UPPER[n]) continue;
          let o = poseOut[n]; if (!o) o = poseOut[n] = [0, 0, 0];
          if (c.additive) { o[0] += poseA[n][0] * w; o[1] += poseA[n][1] * w; o[2] += poseA[n][2] * w; }
          else { o[0] = U.lerp(o[0], poseA[n][0], w); o[1] = U.lerp(o[1], poseA[n][1], w); o[2] = U.lerp(o[2], poseA[n][2], w); }
        }
      }
    }

    /* ---- procedural layers ---- */
    A.breath += dt * 1.15;
    const br = Math.sin(A.breath) * 0.014 * (1 + (1 - A.speed / 6) * 0.6);
    if (!poseOut.chest) poseOut.chest = [0, 0, 0];
    poseOut.chest[0] += br;
    if (!poseOut.spine) poseOut.spine = [0, 0, 0];
    poseOut.spine[0] += br * 0.5;

    /* lean into acceleration */
    if (a.alive && A.speed > 0.2) {
      poseOut.spine[0] += U.clamp(A.speed * 0.022, 0, 0.16);
    }

    /* head look-at toward aim target, with neck limits */
    if (a.alive && A.lookW > 0.01) {
      const bones = A.bones;
      bones.head.updateWorldMatrix(true, false);
      const hp = new THREE.Vector3().setFromMatrixPosition(bones.head.matrixWorld);
      const to = A.lookAt.clone().sub(hp);
      const local = a.group.worldToLocal(A.lookAt.clone()).sub(new THREE.Vector3(0, 1.6 * a.scale2, 0));
      const yaw = U.clamp(Math.atan2(-local.x, -local.z), -0.9, 0.9);
      const pitch = U.clamp(Math.atan2(local.y, Math.hypot(local.x, local.z)), -0.5, 0.5);
      if (!poseOut.head) poseOut.head = [0, 0, 0];
      if (!poseOut.neck) poseOut.neck = [0, 0, 0];
      poseOut.head[1] += yaw * 0.62 * A.lookW; poseOut.head[0] += -pitch * 0.6 * A.lookW;
      poseOut.neck[1] += yaw * 0.30 * A.lookW; poseOut.neck[0] += -pitch * 0.3 * A.lookW;
      poseOut.chest[1] += yaw * 0.18 * A.lookW;
    }

    /* ---- write the pose to bones ---- */
    const bones = A.bones;
    for (const name in bones) {
      const b = bones[name];
      const p = poseOut[name];
      if (p) {
        _e.set(p[0], p[1], p[2], 'XYZ');
        _q.setFromEuler(_e);
        b.quaternion.slerp(_q, 1 - Math.exp(-26 * dt));
      } else {
        b.quaternion.slerp(_q.identity(), 1 - Math.exp(-18 * dt));
      }
    }

    /* ---- foot plant: keep the body at ground height ---- */
    const g = VH.ctx.world ? VH.ctx.world.navSample(a.group.position.x, a.group.position.z) : { y: 0 };
    a.group.position.y = U.damp(a.group.position.y, g.y, 14, dt);

    /* ---- coat secondary motion ---- */
    if (A.coat) {
      const c = A.coat, base = A.coatBase;
      const pos = c.geometry.attributes.position;
      const t = VH.ctx.time;
      const vx = a.vel.x, vz = a.vel.z;
      for (let i = 0; i < pos.count; i++) {
        const by = base[i * 3 + 1];
        const hang = U.clamp(-by / 0.75, 0, 1);      /* hem moves most */
        const sway = Math.sin(t * 3.1 + base[i * 3] * 3.0) * 0.022 * hang;
        pos.setX(i, base[i * 3] - vx * 0.045 * hang + sway);
        pos.setZ(i, base[i * 3 + 2] - vz * 0.045 * hang + sway * 0.6);
        pos.setY(i, by + hang * Math.min(0.10, A.speed * 0.018));
      }
      pos.needsUpdate = true;
    }

    /* face travel direction */
    a.group.rotation.y = U.angLerp(a.group.rotation.y, a.yaw, 1 - Math.exp(-14 * dt));
  }

  /* ------------------------------------------------------------------- public */
  function play(actor, clipName, opts) {
    const c = CLIPS[clipName];
    if (!c || !actor || !actor.anim) return;
    actor.anim.oneShot = c;
    actor.anim.oneShotT = 0;
  }

  function lookAt(actor, worldPoint, weight) {
    if (!actor || !actor.anim) return;
    actor.anim.lookAt.copy(worldPoint);
    actor.anim.lookW = weight === undefined ? 1 : weight;
  }

  function update(dt) {
    for (let i = actors.length - 1; i >= 0; i--) {
      const a = actors[i];
      if (!a.group.parent) { actors.splice(i, 1); continue; }
      updateActor(a, dt);
    }
  }

  function remove(a) {
    const i = actors.indexOf(a); if (i > -1) actors.splice(i, 1);
    if (a.group.parent) a.group.parent.remove(a.group);
  }

  /* Procedural portrait for the dialogue UI — stylised, not a render of the head. */
  function portrait(id, size) {
    size = size || 128;
    const spec = ARCH[id] || ARCH.civ;
    const c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d');
    const r = U.rng((id || 'x').length * 137 + (spec.skin + 1) * 31);
    const accent = '#' + new THREE.Color(spec.accent).getHexString();

    g.fillStyle = '#0b1014'; g.fillRect(0, 0, size, size);
    const grd = g.createRadialGradient(size * 0.5, size * 0.34, 2, size * 0.5, size * 0.5, size * 0.72);
    grd.addColorStop(0, 'rgba(255,255,255,0.07)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.fillRect(0, 0, size, size);

    const tones = ['#d6a88a', '#b28062', '#7e563e', '#583a2a', '#e8c0a6'];
    const skin = tones[spec.skin % tones.length];
    /* shoulders */
    g.fillStyle = spec.cloth;
    g.beginPath(); g.ellipse(size * 0.5, size * 1.02, size * 0.44, size * 0.30, 0, 0, 6.2832); g.fill();
    /* neck + head */
    g.fillStyle = skin;
    g.fillRect(size * 0.44, size * 0.60, size * 0.12, size * 0.14);
    g.beginPath(); g.ellipse(size * 0.5, size * 0.46, size * 0.155, size * 0.195, 0, 0, 6.2832); g.fill();
    /* jaw shading */
    g.fillStyle = 'rgba(0,0,0,0.20)';
    g.beginPath(); g.ellipse(size * 0.5, size * 0.56, size * 0.135, size * 0.085, 0, 0, 6.2832); g.fill();
    /* hair */
    g.fillStyle = spec.hair;
    g.beginPath(); g.ellipse(size * 0.5, size * 0.375, size * 0.168, size * 0.135, 0, Math.PI, 0); g.fill();
    g.fillRect(size * 0.335, size * 0.36, size * 0.33, size * 0.055);
    /* eyes */
    g.fillStyle = '#0d0f12';
    g.fillRect(size * 0.425, size * 0.455, size * 0.045, size * 0.017);
    g.fillRect(size * 0.53, size * 0.455, size * 0.045, size * 0.017);
    /* optic implant in the accent colour */
    g.fillStyle = accent; g.shadowColor = accent; g.shadowBlur = size * 0.09;
    g.fillRect(size * 0.525, size * 0.448, size * 0.058, size * 0.011);
    g.shadowBlur = 0;
    /* rim light from the left, the accent from the right */
    g.globalCompositeOperation = 'lighter';
    const rim = g.createLinearGradient(0, 0, size, 0);
    rim.addColorStop(0, 'rgba(150,190,220,0.16)'); rim.addColorStop(0.5, 'rgba(0,0,0,0)');
    rim.addColorStop(1, accent.replace(')', ''));
    g.fillStyle = rim; g.fillRect(0, 0, size, size);
    g.globalCompositeOperation = 'source-over';
    /* scanline texture */
    g.fillStyle = 'rgba(0,0,0,0.12)';
    for (let y = 0; y < size; y += 3) g.fillRect(0, y, size, 1);
    return c;
  }

  function init() { /* nothing to preload; bodies are built on demand */ }

  /* ---------------------------------------------------------------- char test */
  let testActors = [];
  function testSetup() {
    const which = VH.q.chartest;
    /* three-point rig so the silhouette and the surface are both judgeable */
    const key = new THREE.DirectionalLight(0xbfd8e8, 2.2); key.position.set(-3, 4, 3);
    const rimA = new THREE.DirectionalLight(0x00e5ff, 3.0); rimA.position.set(4, 2.2, -3);
    const rimB = new THREE.DirectionalLight(0xff2d6f, 2.0); rimB.position.set(-4, 1.6, -3.5);
    const amb = new THREE.AmbientLight(0x2a3a46, 0.9);
    VH.ctx.scene.add(key, rimA, rimB, amb);
    if (VH.q.charline) {
      const list = ['kas', 'grunt', 'shield', 'sniper', 'brute', 'netrunner', 'civ'];
      list.forEach((n, i) => {
        const a = create(n, {});
        a.group.position.set((i - (list.length - 1) / 2) * 1.5, 0, 0);
        a.yaw = 0; a.group.rotation.y = 0;
        VH.ctx.scene.add(a.group);
        testActors.push(a);
      });
    } else {
      const a = create(which, {});
      a.group.position.set(0, 0, 0);
      VH.ctx.scene.add(a.group);
      testActors.push(a);
      if (VH.q.clip) { a.state = VH.q.clip; }
      if (VH.q.movespeed) a.vel.set(0, 0, -(+VH.q.movespeed));
    }
  }
  function testUpdate(dt) {
    const t = VH.Core.camTarget;
    if (VH.q.charline) { t.pos.set(0, 1.5, 7.4); t.look.set(0, 0.95, 0); t.fov = 42; }
    else {
      const a = testActors[0];
      if (VH.q.clip && CLIPS[VH.q.clip] && !CLIPS[VH.q.clip].loop) {
        if (!a.anim.oneShot) play(a, VH.q.clip);
      }
      const ang = VH.q.spin ? VH.ctx.time * 0.5 : 0.7;
      t.pos.set(Math.sin(ang) * 3.0, 1.35, Math.cos(ang) * 3.0);
      t.look.set(0, 1.0, 0); t.fov = 40;
    }
  }

  return {
    init: init, create: create, remove: remove,
    update: function (dt) {
      if (VH.q.chartest && !testActors.length) testSetup();
      update(dt);
      if (VH.q.chartest) testUpdate(dt);
    },
    play: play, lookAt: lookAt, portrait: portrait,
    CLIPS: CLIPS, ARCH: ARCH,
    get actors() { return actors; },
  };
})();
