/* =============================================================
 * BREACHPOINT — characters, weapon models and cosmetics
 *
 * Models are built procedurally from boxes. Local axes:
 *   +X = forward (barrel / facing)   +Y = up   +Z = model's right
 * ============================================================= */
(function (root) {
  'use strict';
  var CS = (root.CS = root.CS || {});
  var Geo = CS.Geo, W = CS.W, C = CS.C;

  function mixCol(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }

  /* ---------------------------------------------------------------
   * Skeleton
   * ------------------------------------------------------------- */
  var BONE = {
    PELVIS: 0, SPINE: 1, HEAD: 2,
    ARM_LU: 3, ARM_LL: 4, ARM_RU: 5, ARM_RL: 6,
    LEG_LU: 7, LEG_LL: 8, LEG_RU: 9, LEG_RL: 10,
    WEAPON: 11
  };
  Geo.BONE = BONE;
  Geo.BONE_COUNT = 12;

  /* Rest offsets, each relative to its parent bone's origin. */
  Geo.SKELETON = [
    { name: 'pelvis', parent: -1, off: [0, 0.93, 0] },
    { name: 'spine',  parent: 0,  off: [0, 0.14, 0] },
    { name: 'head',   parent: 1,  off: [0, 0.44, 0] },
    { name: 'armLU',  parent: 1,  off: [0, 0.34, -0.23] },
    { name: 'armLL',  parent: 3,  off: [0, -0.27, 0] },
    { name: 'armRU',  parent: 1,  off: [0, 0.34, 0.23] },
    { name: 'armRL',  parent: 5,  off: [0, -0.27, 0] },
    { name: 'legLU',  parent: 0,  off: [0, -0.02, -0.11] },
    { name: 'legLL',  parent: 7,  off: [0, -0.44, 0] },
    { name: 'legRU',  parent: 0,  off: [0, -0.02, 0.11] },
    { name: 'legRL',  parent: 9,  off: [0, -0.44, 0] },
    { name: 'weapon', parent: 6,  off: [0.10, -0.24, 0.02] }
  ];

  /* ---------------------------------------------------------------
   * Cosmetics (all free — nothing here changes damage or handling)
   * ------------------------------------------------------------- */
  Geo.CHARACTERS = {
    syn_default: { team: 1, name: 'Syndicate Regular', shirt: [0.44, 0.36, 0.26], pants: [0.30, 0.27, 0.22], vest: [0.35, 0.29, 0.20], skin: [0.72, 0.55, 0.42], head: [0.30, 0.26, 0.20] },
    syn_desert:  { team: 1, name: 'Desert Raider',     shirt: [0.66, 0.56, 0.36], pants: [0.52, 0.45, 0.32], vest: [0.42, 0.36, 0.24], skin: [0.66, 0.48, 0.36], head: [0.58, 0.50, 0.34] },
    syn_urban:   { team: 1, name: 'Street Operator',   shirt: [0.30, 0.30, 0.32], pants: [0.22, 0.22, 0.24], vest: [0.40, 0.26, 0.16], skin: [0.78, 0.62, 0.48], head: [0.18, 0.18, 0.20] },
    syn_veteran: { team: 1, name: 'Old Hand',          shirt: [0.36, 0.32, 0.22], pants: [0.28, 0.26, 0.20], vest: [0.48, 0.40, 0.22], skin: [0.70, 0.52, 0.40], head: [0.44, 0.40, 0.30] },
    van_default: { team: 2, name: 'Vanguard Trooper',  shirt: [0.22, 0.28, 0.38], pants: [0.18, 0.22, 0.30], vest: [0.20, 0.26, 0.36], skin: [0.74, 0.58, 0.45], head: [0.16, 0.20, 0.28] },
    van_swat:    { team: 2, name: 'Breach Unit',       shirt: [0.16, 0.18, 0.22], pants: [0.14, 0.16, 0.20], vest: [0.12, 0.14, 0.18], skin: [0.70, 0.54, 0.42], head: [0.10, 0.12, 0.16] },
    van_arctic:  { team: 2, name: 'Arctic Team',       shirt: [0.72, 0.76, 0.82], pants: [0.60, 0.64, 0.70], vest: [0.50, 0.56, 0.64], skin: [0.80, 0.64, 0.50], head: [0.62, 0.68, 0.76] },
    van_marine:  { team: 2, name: 'Coastal Marine',    shirt: [0.28, 0.34, 0.30], pants: [0.24, 0.28, 0.26], vest: [0.30, 0.38, 0.34], skin: [0.66, 0.50, 0.38], head: [0.24, 0.30, 0.26] }
  };

  Geo.GLOVES = {
    default:  { name: 'Standard Issue', col: [0.26, 0.24, 0.22] },
    tan:      { name: 'Field Tan',      col: [0.62, 0.50, 0.34] },
    crimson:  { name: 'Crimson Web',    col: [0.46, 0.12, 0.14] },
    slate:    { name: 'Slate Grip',     col: [0.30, 0.34, 0.40] },
    bone:     { name: 'Bone White',     col: [0.80, 0.78, 0.72] },
    viper:    { name: 'Viper Green',    col: [0.20, 0.40, 0.24] }
  };

  /* Weapon finishes: body colour, accent colour, pattern style. */
  Geo.SKINS = {
    factory:  { name: 'Factory',        rarity: 'common',   body: null,               accent: null,             pattern: 'none' },
    ember:    { name: 'Ember Drift',    rarity: 'uncommon', body: [0.42, 0.14, 0.10], accent: [0.92, 0.52, 0.18], pattern: 'fade' },
    frost:    { name: 'Frostline',      rarity: 'uncommon', body: [0.24, 0.40, 0.52], accent: [0.80, 0.92, 0.98], pattern: 'stripe' },
    jungle:   { name: 'Jungle Bloom',   rarity: 'rare',     body: [0.16, 0.36, 0.18], accent: [0.86, 0.24, 0.42], pattern: 'floral' },
    circuit:  { name: 'Circuitry',      rarity: 'rare',     body: [0.10, 0.16, 0.20], accent: [0.20, 0.92, 0.70], pattern: 'grid' },
    sunset:   { name: 'Sunset Fade',    rarity: 'rare',     body: [0.52, 0.16, 0.42], accent: [0.98, 0.66, 0.22], pattern: 'fade' },
    marble:   { name: 'Marble Vein',    rarity: 'epic',     body: [0.86, 0.84, 0.80], accent: [0.72, 0.18, 0.22], pattern: 'marble' },
    hazard:   { name: 'Hazard Tape',    rarity: 'uncommon', body: [0.18, 0.18, 0.18], accent: [0.94, 0.78, 0.10], pattern: 'stripe' },
    abyss:    { name: 'Abyss',          rarity: 'epic',     body: [0.08, 0.10, 0.22], accent: [0.36, 0.30, 0.86], pattern: 'grid' },
    gilded:   { name: 'Gilded',         rarity: 'legendary', body: [0.52, 0.42, 0.12], accent: [1.00, 0.84, 0.32], pattern: 'marble' }
  };
  Geo.SKIN_ORDER = ['factory', 'ember', 'frost', 'jungle', 'circuit', 'sunset', 'hazard', 'marble', 'abyss', 'gilded'];

  /* ---------------------------------------------------------------
   * Character mesh (skinned)
   * ------------------------------------------------------------- */
  Geo.buildCharacter = function (charId, gloveId, hasHelmet) {
    var ch = Geo.CHARACTERS[charId] || Geo.CHARACTERS.syn_default;
    var gl = Geo.GLOVES[gloveId] || Geo.GLOVES.default;
    var B = new Geo.Builder('skin');
    var teamCol = C.TEAM_INFO[ch.team] ? Geo.hexToRgb(C.TEAM_INFO[ch.team].color) : [1, 1, 1];
    var dark = function (c, k) { return [c[0] * k, c[1] * k, c[2] * k]; };
    var strap = dark(ch.vest, 0.62);
    var rubber = [0.11, 0.11, 0.12];
    var accent = mixCol(ch.vest, teamCol, 0.75);
    var kit = dark(ch.pants, 0.78);

    /* ---- pelvis: hips, belt, thigh rig ---- */
    B.box(-0.105, 0.105, -0.10, 0.09, -0.165, 0.165, ch.pants, BONE.PELVIS);
    B.box(-0.115, 0.115, 0.055, 0.105, -0.175, 0.175, strap, BONE.PELVIS);          // belt
    B.box(-0.045, 0.045, 0.06, 0.10, -0.055, 0.055, dark(strap, 0.7), BONE.PELVIS); // buckle
    B.box(-0.075, 0.075, -0.09, -0.01, 0.155, 0.205, kit, BONE.PELVIS);             // hip pouch
    B.box(-0.07, 0.07, -0.10, -0.02, -0.205, -0.155, kit, BONE.PELVIS);             // holster

    /* ---- torso: chest, back, plate carrier, pouches ---- */
    B.box(-0.105, 0.105, -0.02, 0.40, -0.185, 0.185, ch.shirt, BONE.SPINE);
    B.box(-0.125, 0.125, 0.06, 0.34, -0.155, 0.155, ch.vest, BONE.SPINE);           // carrier body
    B.box(-0.145, -0.095, 0.10, 0.32, -0.135, 0.135, dark(ch.vest, 1.12), BONE.SPINE); // front plate
    B.box(0.095, 0.145, 0.10, 0.32, -0.135, 0.135, dark(ch.vest, 0.80), BONE.SPINE);   // back plate
    // magazine pouches across the chest
    for (var mp = 0; mp < 3; mp++) {
      var mz = -0.10 + mp * 0.10;
      B.box(-0.175, -0.142, 0.11, 0.21, mz - 0.038, mz + 0.038, kit, BONE.SPINE);
      B.box(-0.178, -0.168, 0.195, 0.215, mz - 0.040, mz + 0.040, dark(kit, 0.7), BONE.SPINE);
    }
    // shoulder straps and team-coloured pads
    B.box(-0.13, -0.06, 0.30, 0.365, -0.135, -0.055, strap, BONE.SPINE);
    B.box(-0.13, -0.06, 0.30, 0.365, 0.055, 0.135, strap, BONE.SPINE);
    B.box(-0.095, 0.095, 0.285, 0.355, -0.245, -0.145, accent, BONE.SPINE);
    B.box(-0.095, 0.095, 0.285, 0.355, 0.145, 0.245, accent, BONE.SPINE);
    // radio on the left shoulder
    B.box(-0.10, -0.045, 0.30, 0.355, -0.215, -0.165, rubber, BONE.SPINE);
    B.box(-0.075, -0.065, 0.355, 0.445, -0.20, -0.19, rubber, BONE.SPINE);
    // small of the back pack
    B.box(0.115, 0.185, 0.05, 0.26, -0.12, 0.12, kit, BONE.SPINE);
    // neck
    B.box(-0.048, 0.048, 0.385, 0.455, -0.055, 0.055, dark(ch.skin, 0.86), BONE.SPINE);

    /* ---- head ---- */
    B.box(-0.085, 0.088, -0.095, 0.085, -0.082, 0.082, ch.skin, BONE.HEAD);         // skull
    B.box(-0.055, 0.098, -0.105, -0.045, -0.062, 0.062, dark(ch.skin, 0.92), BONE.HEAD); // jaw
    B.box(-0.095, 0.030, -0.075, 0.095, -0.090, 0.090, ch.head, BONE.HEAD);         // hood / balaclava
    B.box(-0.098, 0.012, -0.100, -0.030, -0.072, 0.072, dark(ch.head, 0.85), BONE.HEAD);
    // eye band + goggles
    B.box(0.078, 0.108, -0.010, 0.050, -0.078, 0.078, [0.10, 0.11, 0.14], BONE.HEAD);
    B.box(0.084, 0.112, 0.000, 0.040, -0.070, -0.020, [0.20, 0.34, 0.42], BONE.HEAD);
    B.box(0.084, 0.112, 0.000, 0.040, 0.020, 0.070, [0.20, 0.34, 0.42], BONE.HEAD);
    B.box(-0.100, 0.090, 0.045, 0.062, -0.088, 0.088, dark(ch.head, 0.7), BONE.HEAD); // strap
    if (hasHelmet) {
      var hel = mixCol(ch.head, [0.30, 0.31, 0.33], 0.55);
      B.box(-0.108, 0.072, 0.045, 0.150, -0.105, 0.105, hel, BONE.HEAD);
      B.box(0.058, 0.130, 0.030, 0.105, -0.092, 0.092, dark(hel, 0.92), BONE.HEAD);   // brow
      B.box(-0.118, -0.070, 0.020, 0.130, -0.098, 0.098, dark(hel, 0.86), BONE.HEAD); // rear shell
      B.box(-0.020, 0.030, 0.150, 0.178, -0.030, 0.030, rubber, BONE.HEAD);           // mount
      B.box(-0.100, -0.082, 0.000, 0.070, -0.112, -0.088, rubber, BONE.HEAD);         // ear cup
      B.box(-0.100, -0.082, 0.000, 0.070, 0.088, 0.112, rubber, BONE.HEAD);
    }

    /* ---- arms: tapered upper, elbow pad, forearm, glove ---- */
    function arm(up, lo, side) {
      B.box(-0.058, 0.058, -0.10, 0.045, -0.062, 0.062, ch.shirt, up);               // deltoid
      B.box(-0.050, 0.050, -0.285, -0.09, -0.054, 0.054, ch.shirt, up);              // bicep
      B.box(-0.056, 0.056, -0.300, -0.245, -0.058, 0.058, dark(ch.shirt, 0.82), up); // elbow pad
      B.box(-0.046, 0.046, -0.215, 0.015, -0.050, 0.050, ch.shirt, lo);              // forearm
      B.box(-0.050, 0.050, -0.245, -0.200, -0.052, 0.052, dark(ch.shirt, 0.9), lo);  // cuff
      B.box(-0.050, 0.056, -0.310, -0.240, -0.055, 0.055, gl.col, lo);               // hand
      B.box(-0.052, 0.058, -0.330, -0.300, -0.050, 0.050, dark(gl.col, 0.85), lo);   // fingers
      B.box(-0.032, 0.038, -0.268, -0.248, -0.058, 0.058, dark(gl.col, 1.15), lo);   // knuckle guard
    }
    arm(BONE.ARM_LU, BONE.ARM_LL, -1);
    arm(BONE.ARM_RU, BONE.ARM_RL, 1);
    // watch on the left wrist
    B.box(-0.050, 0.050, -0.250, -0.225, -0.055, -0.045, [0.12, 0.13, 0.15], BONE.ARM_LL);

    /* ---- legs: thigh, knee pad, shin, boot ---- */
    function leg(up, lo) {
      B.box(-0.078, 0.078, -0.40, 0.035, -0.088, 0.088, ch.pants, up);
      B.box(-0.070, 0.070, -0.465, -0.395, -0.082, 0.082, dark(ch.pants, 0.88), up); // thigh taper
      B.box(-0.084, 0.070, -0.480, -0.410, -0.086, 0.086, dark(ch.pants, 0.72), up); // knee pad
      B.box(-0.064, 0.064, -0.385, 0.020, -0.076, 0.076, ch.pants, lo);              // shin
      B.box(-0.070, 0.070, -0.415, -0.375, -0.080, 0.080, dark(ch.pants, 0.9), lo);  // cuff
      B.box(-0.078, 0.112, -0.475, -0.410, -0.082, 0.082, rubber, lo);               // boot upper
      B.box(-0.086, 0.124, -0.500, -0.468, -0.086, 0.086, dark(rubber, 0.72), lo);   // sole
    }
    leg(BONE.LEG_LU, BONE.LEG_LL);
    leg(BONE.LEG_RU, BONE.LEG_RL);

    return B.result();
  };

  /* ---------------------------------------------------------------
   * Weapon meshes
   * ------------------------------------------------------------- */
  var GUNMETAL = [0.44, 0.46, 0.50];
  var POLYMER = [0.33, 0.335, 0.35];
  var WOODGRIP = [0.56, 0.36, 0.19];

  function skinColors(weapon, skinId) {
    var sk = Geo.SKINS[skinId] || Geo.SKINS.factory;
    var base = weapon.cls === 'rifle' && /kr47|nomadAR/.test(weapon.id) ? WOODGRIP : POLYMER;
    if (!sk.body) return { body: base, metal: GUNMETAL, accent: mixCol(base, [1, 1, 1], 0.18), pattern: 'none' };
    return { body: sk.body, metal: mixCol(GUNMETAL, sk.body, 0.35), accent: sk.accent, pattern: sk.pattern };
  }

  /* Pattern striping applied along the weapon body for visual identity. */
  function patternCol(cols, t) {
    switch (cols.pattern) {
      case 'fade':   return mixCol(cols.body, cols.accent, t);
      case 'stripe': return (Math.floor(t * 6) % 2 === 0) ? cols.body : cols.accent;
      case 'grid':   return (Math.floor(t * 10) % 3 === 0) ? cols.accent : cols.body;
      case 'marble': return mixCol(cols.body, cols.accent, 0.5 + 0.5 * Math.sin(t * 11));
      case 'floral': return (Math.floor(t * 5) % 2 === 0) ? cols.body : mixCol(cols.accent, cols.body, 0.25);
      default:       return cols.body;
    }
  }

  /* Segment the receiver so patterns show along its length. */
  function bodySegments(B, x0, x1, y0, y1, z0, z1, cols, bone, segs) {
    segs = segs || 6;
    for (var i = 0; i < segs; i++) {
      var a = x0 + (x1 - x0) * (i / segs), b = x0 + (x1 - x0) * ((i + 1) / segs);
      B.box(a, b, y0, y1, z0, z1, patternCol(cols, i / segs), bone);
    }
  }

  Geo.buildWeapon = function (weaponId, skinId) {
    var w = W.get(weaponId);
    var B = new Geo.Builder('skin');
    if (!w) { B.box(-0.1, 0.1, -0.03, 0.03, -0.02, 0.02, GUNMETAL, 0); return B.result(); }
    var cols = skinColors(w, skinId);
    var m = cols.metal, body = cols.body;
    var dark = [0.22, 0.225, 0.245];
    var steel = [0.56, 0.58, 0.63];
    var bright = [0.74, 0.77, 0.82];

    /* Ribbed surface — reads as serrations, vents or grip checkering. */
    function ribs(x0, x1, y0, y1, z0, z1, n, col, depth) {
      var step = (x1 - x0) / n;
      for (var i = 0; i < n; i++) {
        var a = x0 + step * i;
        B.box(a, a + step * 0.55, y0, y1, z0 - (depth || 0.002), z1 + (depth || 0.002), col, 0);
      }
    }
    function sights(xr, xf, y, z) {
      B.box(xr, xr + 0.030, y, y + 0.026, -0.014, 0.014, dark, 0);      // rear aperture
      B.box(xr + 0.008, xr + 0.022, y + 0.012, y + 0.030, -0.006, 0.006, dark, 0);
      B.box(xf, xf + 0.014, y, y + 0.034, -0.008, 0.008, dark, 0);      // front post
      B.box(xf - 0.004, xf + 0.018, y + 0.026, y + 0.032, -0.013, 0.013, dark, 0);
    }

    switch (w.cls) {
      case 'knife':
        B.box(-0.115, 0.010, -0.019, 0.019, -0.016, 0.016, [0.13, 0.13, 0.14], 0);     // handle
        ribs(-0.105, -0.005, -0.021, 0.021, -0.017, 0.017, 7, [0.08, 0.08, 0.09], 0.001);
        B.box(-0.130, -0.112, -0.024, 0.024, -0.018, 0.018, m, 0);                     // pommel
        B.box(0.010, 0.042, -0.026, 0.026, -0.020, 0.020, m, 0);                       // guard
        B.box(0.042, 0.230, -0.024, 0.010, -0.0055, 0.0055, [0.74, 0.77, 0.82], 0);    // blade
        B.box(0.042, 0.230, -0.026, -0.018, -0.0035, 0.0035, [0.88, 0.91, 0.95], 0);   // edge bevel
        ribs(0.060, 0.150, 0.004, 0.012, -0.006, 0.006, 6, [0.55, 0.57, 0.62], 0.0005); // serrations
        B.box(0.230, 0.272, -0.018, 0.006, -0.005, 0.005, [0.86, 0.89, 0.94], 0);      // point
        break;

      case 'pistol': {
        var sl = w.akimbo ? 0.150 : 0.165;
        bodySegments(B, -0.062, sl, 0.004, 0.050, -0.019, 0.019, cols, 0, 5);          // slide
        ribs(-0.058, 0.004, 0.006, 0.048, -0.021, 0.021, 6, dark, 0.001);              // serrations
        B.box(-0.052, sl - 0.020, -0.020, 0.006, -0.017, 0.017, m, 0);                 // frame
        B.box(sl - 0.010, sl + 0.022, 0.012, 0.040, -0.012, 0.012, steel, 0);          // muzzle
        B.box(sl - 0.012, sl + 0.020, 0.018, 0.034, -0.006, 0.006, dark, 0);           // bore
        B.boxRotZ(-0.030, -0.088, 0, 0.024, 0.072, 0.019, 0.26, body, 0);              // grip
        ribs(-0.052, -0.010, -0.150, -0.030, -0.021, 0.021, 5, dark, 0.001);
        B.box(-0.040, -0.028, -0.160, -0.140, -0.018, 0.018, m, 0);                    // mag base
        B.box(-0.006, 0.030, -0.058, -0.030, -0.009, 0.009, m, 0);                     // trigger guard
        B.box(0.024, 0.032, -0.050, -0.026, -0.011, 0.011, m, 0);
        B.box(-0.012, 0.004, -0.038, -0.018, -0.006, 0.006, steel, 0);                 // trigger
        B.box(-0.056, -0.040, 0.050, 0.062, -0.010, 0.010, dark, 0);                   // rear sight
        B.box(sl - 0.026, sl - 0.014, 0.050, 0.062, -0.005, 0.005, dark, 0);           // front sight
        if (w.silenced) {
          B.cylinder(sl + 0.005, 0.010, 0, 0.021, 0.145, 10, [0.11, 0.115, 0.125], 0);
          ribs(sl + 0.020, sl + 0.130, 0.008, 0.046, -0.023, 0.023, 7, [0.08, 0.08, 0.09], 0.001);
        }
        if (w.akimbo) {
          bodySegments(B, -0.062, sl, 0.004, 0.050, 0.062, 0.100, cols, 0, 5);
          B.boxRotZ(-0.030, -0.088, 0.081, 0.024, 0.072, 0.019, 0.26, body, 0);
          B.box(sl - 0.010, sl + 0.022, 0.012, 0.040, 0.069, 0.093, steel, 0);
        }
        break;
      }

      case 'smg':
        bodySegments(B, -0.130, 0.215, -0.004, 0.056, -0.025, 0.025, cols, 0, 6);      // receiver
        B.box(-0.135, 0.220, 0.052, 0.064, -0.020, 0.020, m, 0);                       // top rail
        ribs(-0.120, 0.200, 0.056, 0.068, -0.021, 0.021, 14, dark, 0.001);
        B.box(0.170, 0.300, 0.008, 0.042, -0.017, 0.017, m, 0);                        // shroud
        ribs(0.180, 0.290, 0.010, 0.040, -0.019, 0.019, 6, dark, 0.0015);              // vents
        B.box(0.296, 0.340, 0.016, 0.036, -0.011, 0.011, steel, 0);                    // barrel
        B.boxRotZ(-0.015, -0.115, 0, 0.026, 0.070, 0.021, 0.18, body, 0);              // grip
        ribs(-0.038, 0.004, -0.175, -0.060, -0.023, 0.023, 5, dark, 0.001);
        B.boxRotZ(0.075, -0.115, 0, 0.024, 0.078, 0.017, -0.10, m, 0);                 // magazine
        B.box(0.052, 0.100, -0.200, -0.180, -0.016, 0.016, dark, 0);
        B.box(-0.260, -0.126, 0.006, 0.034, -0.013, 0.013, m, 0);                      // folding stock
        B.box(-0.285, -0.255, -0.024, 0.048, -0.020, 0.020, body, 0);
        B.box(0.026, 0.060, -0.042, -0.016, -0.010, 0.010, m, 0);                      // trigger guard
        sights(-0.110, 0.240, 0.064, 0);
        break;

      case 'rifle': {
        var wood = /kr47|nomadAR/.test(w.id);
        bodySegments(B, -0.175, 0.255, -0.010, 0.062, -0.026, 0.026, cols, 0, 7);      // receiver
        B.box(-0.180, 0.150, 0.058, 0.072, -0.021, 0.021, m, 0);                       // dust cover / rail
        ribs(-0.170, 0.140, 0.062, 0.076, -0.022, 0.022, 13, dark, 0.001);
        B.box(0.100, 0.130, 0.060, 0.092, -0.012, 0.012, m, 0);                        // gas block
        B.box(0.240, 0.470, 0.010, 0.048, -0.020, 0.020, wood ? WOODGRIP : m, 0);      // handguard
        if (wood) { ribs(0.255, 0.455, 0.012, 0.046, -0.022, 0.022, 5, [0.30, 0.18, 0.09], 0.0012); }
        else { ribs(0.250, 0.460, 0.012, 0.046, -0.022, 0.022, 9, dark, 0.0015); }
        B.box(0.300, 0.560, 0.046, 0.062, -0.013, 0.013, m, 0);                        // gas tube
        B.box(0.460, 0.600, 0.020, 0.042, -0.012, 0.012, steel, 0);                    // barrel
        B.box(0.596, 0.646, 0.016, 0.046, -0.017, 0.017, m, 0);                        // muzzle brake
        ribs(0.600, 0.642, 0.018, 0.044, -0.019, 0.019, 3, dark, 0.001);
        B.box(0.600, 0.650, 0.026, 0.036, -0.007, 0.007, dark, 0);                     // bore
        B.boxRotZ(-0.050, -0.135, 0, 0.030, 0.080, 0.023, 0.22, body, 0);              // pistol grip
        ribs(-0.078, -0.026, -0.210, -0.070, -0.025, 0.025, 6, dark, 0.001);
        B.boxRotZ(0.090, -0.150, 0, 0.036, 0.105, 0.019, -0.16, m, 0);                 // magazine
        B.box(0.052, 0.128, -0.258, -0.236, -0.018, 0.018, dark, 0);
        B.box(0.030, 0.070, -0.056, -0.020, -0.011, 0.011, m, 0);                      // trigger guard
        B.box(0.040, 0.056, -0.042, -0.022, -0.007, 0.007, steel, 0);                  // trigger
        B.box(0.150, 0.190, 0.030, 0.058, 0.026, 0.034, bright, 0);                    // charging handle
        B.box(0.060, 0.120, 0.032, 0.056, 0.026, 0.030, dark, 0);                      // ejection port
        if (wood) {
          B.box(-0.430, -0.170, -0.026, 0.052, -0.022, 0.022, WOODGRIP, 0);            // wooden stock
          B.box(-0.445, -0.415, -0.034, 0.056, -0.024, 0.024, dark, 0);                // butt plate
        } else {
          B.box(-0.400, -0.180, 0.004, 0.042, -0.016, 0.016, m, 0);                    // buffer tube
          B.box(-0.395, -0.250, -0.028, 0.054, -0.024, 0.024, body, 0);                // stock body
          B.box(-0.410, -0.385, -0.036, 0.058, -0.026, 0.026, dark, 0);                // butt pad
          B.box(-0.330, -0.250, 0.050, 0.068, -0.018, 0.018, body, 0);                 // cheek riser
        }
        if (w.scope) {
          B.cylinder(0.020, 0.074, 0, 0.028, 0.215, 10, [0.19, 0.20, 0.22], 0);
          B.box(0.000, 0.250, 0.066, 0.080, -0.016, 0.016, [0.11, 0.12, 0.14], 0);     // mount
          B.box(0.226, 0.246, 0.078, 0.118, -0.024, 0.024, [0.12, 0.18, 0.24], 0);     // objective
          B.box(0.020, 0.036, 0.078, 0.116, -0.022, 0.022, [0.30, 0.56, 0.70], 0);     // eyepiece glass
        } else sights(-0.150, 0.430, 0.072, 0);
        break;
      }

      case 'sniper':
        bodySegments(B, -0.215, 0.245, -0.006, 0.058, -0.024, 0.024, cols, 0, 7);
        B.box(0.230, 0.780, 0.014, 0.046, -0.016, 0.016, m, 0);                        // heavy barrel
        ribs(0.420, 0.700, 0.016, 0.044, -0.018, 0.018, 8, dark, 0.0012);              // flutes
        B.box(0.778, 0.846, 0.012, 0.048, -0.020, 0.020, steel, 0);                    // brake
        B.box(0.780, 0.850, 0.024, 0.036, -0.008, 0.008, dark, 0);
        B.boxRotZ(-0.056, -0.130, 0, 0.030, 0.076, 0.022, 0.20, body, 0);              // grip
        B.boxRotZ(0.070, -0.120, 0, 0.030, 0.072, 0.018, -0.08, m, 0);                 // magazine
        B.box(-0.470, -0.200, -0.052, 0.052, -0.024, 0.024, body, 0);                  // stock
        B.box(-0.330, -0.170, 0.050, 0.090, -0.022, 0.022, body, 0);                   // cheek riser
        B.box(-0.490, -0.462, -0.062, 0.056, -0.026, 0.026, dark, 0);                  // recoil pad
        B.box(-0.220, -0.120, -0.090, -0.050, -0.020, 0.020, body, 0);                 // thumbhole spine
        B.cylinder(-0.020, 0.062, 0, 0.032, 0.330, 12, [0.20, 0.21, 0.23], 0);         // scope tube
        B.box(-0.050, 0.310, 0.056, 0.070, -0.018, 0.018, [0.10, 0.11, 0.13], 0);      // rings
        B.box(0.300, 0.322, 0.070, 0.120, -0.026, 0.026, [0.13, 0.19, 0.26], 0);       // objective bell
        B.box(-0.036, -0.020, 0.072, 0.114, -0.024, 0.024, [0.30, 0.56, 0.70], 0);     // eyepiece
        B.box(0.140, 0.186, 0.034, 0.054, 0.024, 0.040, bright, 0);                    // bolt handle
        B.box(0.176, 0.196, 0.030, 0.050, 0.036, 0.062, bright, 0);
        B.box(0.360, 0.420, -0.110, -0.016, -0.010, 0.010, dark, 0);                   // bipod legs
        B.box(0.360, 0.420, -0.110, -0.016, 0.030, 0.050, dark, 0);
        break;

      case 'shotgun':
        bodySegments(B, -0.200, 0.190, -0.002, 0.052, -0.026, 0.026, cols, 0, 6);
        B.box(0.180, 0.660, 0.016, 0.050, -0.019, 0.019, m, 0);                        // barrel
        B.box(0.200, 0.600, -0.022, 0.010, -0.017, 0.017, m, 0);                       // magazine tube
        B.box(0.280, 0.430, -0.038, -0.006, -0.027, 0.027, WOODGRIP, 0);               // pump
        ribs(0.290, 0.420, -0.040, -0.004, -0.029, 0.029, 7, [0.28, 0.17, 0.08], 0.0012);
        B.box(0.640, 0.664, 0.020, 0.046, -0.013, 0.013, steel, 0);
        B.box(0.600, 0.616, 0.050, 0.062, -0.005, 0.005, bright, 0);                   // bead sight
        B.box(-0.430, -0.190, -0.030, 0.050, -0.024, 0.024, WOODGRIP, 0);              // stock
        B.box(-0.448, -0.420, -0.038, 0.054, -0.026, 0.026, dark, 0);
        B.box(0.020, 0.068, -0.046, -0.014, -0.011, 0.011, m, 0);                      // trigger guard
        B.box(-0.010, 0.070, 0.048, 0.062, -0.020, 0.020, m, 0);                       // receiver top
        break;

      case 'heavy':
        bodySegments(B, -0.235, 0.310, -0.014, 0.070, -0.032, 0.032, cols, 0, 8);
        B.box(-0.150, 0.120, 0.066, 0.086, -0.024, 0.024, m, 0);                       // carry handle
        B.box(-0.150, -0.120, 0.058, 0.072, -0.020, 0.020, m, 0);
        B.box(0.090, 0.120, 0.058, 0.072, -0.020, 0.020, m, 0);
        B.box(0.300, 0.760, 0.018, 0.052, -0.020, 0.020, m, 0);                        // barrel
        ribs(0.340, 0.640, 0.020, 0.050, -0.022, 0.022, 10, dark, 0.0015);
        B.box(0.756, 0.816, 0.014, 0.056, -0.024, 0.024, steel, 0);                    // flash hider
        B.box(0.020, 0.230, -0.205, -0.014, -0.058, 0.058, m, 0);                      // ammo box
        ribs(0.035, 0.215, -0.190, -0.030, -0.060, 0.060, 5, dark, 0.0015);
        B.box(0.225, 0.250, -0.120, -0.060, -0.030, 0.030, bright, 0);                 // belt feed
        B.boxRotZ(-0.060, -0.140, 0, 0.032, 0.082, 0.024, 0.20, body, 0);
        B.box(-0.470, -0.210, -0.030, 0.058, -0.026, 0.026, body, 0);                  // stock
        B.box(-0.486, -0.458, -0.038, 0.062, -0.028, 0.028, dark, 0);
        B.box(0.380, 0.560, -0.150, -0.024, -0.012, 0.012, dark, 0);                   // bipod
        B.box(0.380, 0.560, -0.150, -0.024, 0.034, 0.058, dark, 0);
        sights(-0.190, 0.290, 0.086, 0);
        break;

      case 'grenade': {
        var gc = w.gtype === 'smoke' ? [0.32, 0.40, 0.33] :
                 w.gtype === 'flash' ? [0.52, 0.53, 0.56] :
                 w.gtype === 'fire' ? [0.52, 0.30, 0.14] : [0.22, 0.29, 0.20];
        if (w.gtype === 'fire') {
          B.cylinder(0, -0.075, 0, 0.044, 0.150, 10, [0.60, 0.40, 0.16], 0);          // bottle
          B.cylinder(0, 0.075, 0, 0.020, 0.035, 8, [0.50, 0.33, 0.13], 0);            // neck
          B.box(-0.013, 0.013, 0.105, 0.150, -0.013, 0.013, [0.86, 0.84, 0.78], 0);   // rag
          B.box(-0.030, 0.030, -0.040, 0.040, -0.030, 0.030, [0.72, 0.48, 0.16], 0);  // label band
        } else {
          B.cylinder(0, -0.055, 0, 0.040, 0.110, 10, gc, 0);                          // body
          B.box(-0.042, 0.042, -0.012, 0.012, -0.042, 0.042, mixCol(gc, [0, 0, 0], 0.25), 0);
          B.cylinder(0, 0.055, 0, 0.022, 0.030, 8, [0.28, 0.29, 0.31], 0);            // fuse
          B.box(-0.020, 0.020, 0.085, 0.098, -0.020, 0.020, [0.42, 0.43, 0.46], 0);   // pull ring seat
          B.box(-0.006, 0.034, 0.062, 0.074, -0.046, -0.030, [0.58, 0.59, 0.62], 0);  // spoon
          B.box(-0.006, 0.034, 0.048, 0.062, -0.048, -0.040, [0.58, 0.59, 0.62], 0);
          B.box(0.010, 0.030, 0.086, 0.094, -0.052, -0.026, [0.70, 0.71, 0.74], 0);   // pin ring
        }
        break;
      }

      default:
        B.box(-0.1, 0.2, -0.02, 0.04, -0.02, 0.02, m, 0);
    }
    return B.result();
  };

  /* First-person hands. Built around the origin so the viewmodel rig can
   * place them relative to the weapon grip. */
  Geo.buildHands = function (gloveId, skinTone) {
    var gl = Geo.GLOVES[gloveId] || Geo.GLOVES.default;
    var skin = skinTone || [0.78, 0.62, 0.48];
    var pad = [gl.col[0] * 0.72, gl.col[1] * 0.72, gl.col[2] * 0.72];
    var seam = [gl.col[0] * 1.25, gl.col[1] * 1.25, gl.col[2] * 1.25];
    var B = new Geo.Builder('skin');

    /* --- right hand: wrapped around the pistol grip --- */
    B.box(-0.090, 0.048, -0.180, -0.040, -0.072, 0.048, gl.col, 0);        // palm
    B.box(-0.092, 0.050, -0.190, -0.170, -0.074, 0.050, pad, 0);           // heel
    for (var f = 0; f < 4; f++) {                                          // fingers over the grip
      var fz = -0.066 + f * 0.030;
      B.box(-0.060 + f * 0.012, 0.052, -0.132 + f * 0.006, -0.104 + f * 0.006, fz, fz + 0.024, gl.col, 0);
      B.box(0.040, 0.066, -0.136 + f * 0.006, -0.106 + f * 0.006, fz + 0.002, fz + 0.022, seam, 0);
    }
    B.box(-0.048, 0.030, -0.120, -0.086, 0.046, 0.070, gl.col, 0);         // thumb
    B.box(-0.086, 0.046, -0.176, -0.150, -0.076, 0.052, seam, 0);          // knuckle guard
    B.box(-0.168, -0.082, -0.196, -0.146, -0.070, 0.046, gl.col, 0);       // wrist
    B.box(-0.186, -0.160, -0.202, -0.140, -0.074, 0.050, pad, 0);          // cuff
    B.box(-0.290, -0.182, -0.196, -0.146, -0.066, 0.042, skin, 0);         // forearm

    /* --- left hand: supporting the handguard --- */
    B.box(0.210, 0.350, -0.096, 0.014, -0.084, 0.036, gl.col, 0);          // palm
    for (var g2 = 0; g2 < 4; g2++) {
      var gz = -0.080 + g2 * 0.028;
      B.box(0.216 + g2 * 0.006, 0.344, -0.118, -0.088, gz, gz + 0.022, gl.col, 0);
      B.box(0.220 + g2 * 0.006, 0.340, -0.124, -0.112, gz + 0.002, gz + 0.020, seam, 0);
    }
    B.box(0.238, 0.318, -0.080, -0.046, 0.032, 0.058, gl.col, 0);          // thumb over the top
    B.box(0.206, 0.232, -0.106, 0.010, -0.088, 0.032, pad, 0);             // cuff
    B.box(0.140, 0.212, -0.100, -0.020, -0.080, 0.026, skin, 0);           // forearm
    return B.result();
  };

  Geo.buildBomb = function () {
    var B = new Geo.Builder('skin');
    B.box(-0.14, 0.14, 0, 0.09, -0.10, 0.10, [0.16, 0.16, 0.18], 0);
    B.box(-0.10, 0.10, 0.09, 0.13, -0.07, 0.07, [0.22, 0.22, 0.24], 0);
    B.box(-0.06, 0.06, 0.13, 0.155, -0.045, 0.045, [0.70, 0.16, 0.14], 0);
    B.box(-0.11, -0.03, 0.095, 0.125, -0.065, 0.065, [0.85, 0.72, 0.20], 0);
    return B.result();
  };

  Geo.buildDefuseKit = function () {
    var B = new Geo.Builder('skin');
    B.box(-0.13, 0.13, 0, 0.10, -0.09, 0.09, [0.20, 0.34, 0.48], 0);
    B.box(-0.09, 0.09, 0.10, 0.125, -0.06, 0.06, [0.70, 0.74, 0.78], 0);
    return B.result();
  };

  /* Dropped-weapon pickups and the aim-training targets. */
  Geo.buildTarget = function () {
    var B = new Geo.Builder('skin');
    B.box(-0.16, 0.16, 0, 1.83, -0.30, 0.30, [0.82, 0.32, 0.24], 0);
    B.box(-0.17, 0.17, 1.62, 1.83, -0.16, 0.16, [0.96, 0.84, 0.30], 0);
    return B.result();
  };

  /* Simple unit quad used for sprites, decals and the blob shadow. */
  Geo.buildQuad = function () {
    var B = new Geo.Builder('skin');
    var base = B.nv;
    B.vert(-0.5, 0, -0.5, 0, 1, 0, 1, 1, 1, 0, 0);
    B.vert(-0.5, 0, 0.5, 0, 1, 0, 1, 1, 1, 0, 0);
    B.vert(0.5, 0, 0.5, 0, 1, 0, 1, 1, 1, 0, 0);
    B.vert(0.5, 0, -0.5, 0, 1, 0, 1, 1, 1, 0, 0);
    B.quad(base, base + 1, base + 2, base + 3);
    return B.result();
  };

  CS.Models = {
    BONE: BONE,
    characterList: function (team) {
      var out = [];
      for (var k in Geo.CHARACTERS) if (Geo.CHARACTERS[k].team === team) out.push({ id: k, name: Geo.CHARACTERS[k].name });
      return out;
    },
    gloveList: function () {
      var out = [];
      for (var k in Geo.GLOVES) out.push({ id: k, name: Geo.GLOVES[k].name });
      return out;
    },
    skinList: function () {
      return Geo.SKIN_ORDER.map(function (k) { return { id: k, name: Geo.SKINS[k].name, rarity: Geo.SKINS[k].rarity }; });
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
