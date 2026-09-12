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

  function mixCol(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }

  /* ---------------------------------------------------------------
   * Character mesh (skinned)
   * ------------------------------------------------------------- */
  Geo.buildCharacter = function (charId, gloveId, hasHelmet) {
    var ch = Geo.CHARACTERS[charId] || Geo.CHARACTERS.syn_default;
    var gl = Geo.GLOVES[gloveId] || Geo.GLOVES.default;
    var B = new Geo.Builder('skin');
    var teamCol = C.TEAM_INFO[ch.team] ? Geo.hexToRgb(C.TEAM_INFO[ch.team].color) : [1, 1, 1];

    // pelvis
    B.box(-0.11, 0.11, -0.10, 0.10, -0.17, 0.17, ch.pants, BONE.PELVIS);
    // torso
    B.box(-0.12, 0.12, -0.02, 0.42, -0.20, 0.20, ch.shirt, BONE.SPINE);
    // chest rig — reads as armour and carries the team colour
    B.box(-0.135, 0.135, 0.08, 0.34, -0.175, 0.175, ch.vest, BONE.SPINE);
    B.box(-0.145, -0.10, 0.14, 0.30, -0.09, 0.09, mixCol(ch.vest, teamCol, 0.55), BONE.SPINE);
    // shoulder pads in team colour so silhouettes are readable at range
    B.box(-0.10, 0.10, 0.30, 0.38, -0.255, -0.16, mixCol(ch.vest, teamCol, 0.7), BONE.SPINE);
    B.box(-0.10, 0.10, 0.30, 0.38, 0.16, 0.255, mixCol(ch.vest, teamCol, 0.7), BONE.SPINE);
    // neck
    B.box(-0.05, 0.05, 0.40, 0.46, -0.06, 0.06, ch.skin, BONE.SPINE);

    // head
    B.box(-0.095, 0.10, -0.10, 0.105, -0.095, 0.095, ch.skin, BONE.HEAD);
    B.box(-0.105, 0.02, -0.085, 0.09, -0.10, 0.10, ch.head, BONE.HEAD);        // cap / balaclava
    if (hasHelmet) {
      B.box(-0.115, 0.075, 0.04, 0.145, -0.115, 0.115, mixCol(ch.head, [0.35, 0.35, 0.35], 0.5), BONE.HEAD);
      B.box(0.06, 0.135, 0.02, 0.10, -0.10, 0.10, mixCol(ch.head, [0.25, 0.25, 0.25], 0.6), BONE.HEAD);
    }
    B.box(0.095, 0.125, -0.03, 0.045, -0.075, 0.075, [0.12, 0.13, 0.16], BONE.HEAD);  // visor

    // arms — upper from shoulder down, lower from elbow down
    B.box(-0.055, 0.055, -0.29, 0.04, -0.06, 0.06, ch.shirt, BONE.ARM_LU);
    B.box(-0.05, 0.05, -0.22, 0.02, -0.055, 0.055, ch.shirt, BONE.ARM_LL);
    B.box(-0.055, 0.06, -0.30, -0.20, -0.06, 0.06, gl.col, BONE.ARM_LL);
    B.box(-0.055, 0.055, -0.29, 0.04, -0.06, 0.06, ch.shirt, BONE.ARM_RU);
    B.box(-0.05, 0.05, -0.22, 0.02, -0.055, 0.055, ch.shirt, BONE.ARM_RL);
    B.box(-0.055, 0.06, -0.30, -0.20, -0.06, 0.06, gl.col, BONE.ARM_RL);

    // legs
    B.box(-0.075, 0.075, -0.46, 0.03, -0.085, 0.085, ch.pants, BONE.LEG_LU);
    B.box(-0.07, 0.07, -0.45, 0.02, -0.08, 0.08, ch.pants, BONE.LEG_LL);
    B.box(-0.10, 0.11, -0.50, -0.43, -0.085, 0.085, [0.14, 0.13, 0.12], BONE.LEG_LL);   // boot
    B.box(-0.075, 0.075, -0.46, 0.03, -0.085, 0.085, ch.pants, BONE.LEG_RU);
    B.box(-0.07, 0.07, -0.45, 0.02, -0.08, 0.08, ch.pants, BONE.LEG_RL);
    B.box(-0.10, 0.11, -0.50, -0.43, -0.085, 0.085, [0.14, 0.13, 0.12], BONE.LEG_RL);

    return B.result();
  };

  /* ---------------------------------------------------------------
   * Weapon meshes
   * ------------------------------------------------------------- */
  var GUNMETAL = [0.20, 0.21, 0.23];
  var POLYMER = [0.15, 0.15, 0.16];
  var WOODGRIP = [0.40, 0.25, 0.13];

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

    switch (w.cls) {
      case 'knife':
        B.box(-0.10, 0.02, -0.016, 0.016, -0.014, 0.014, [0.14, 0.14, 0.15], 0);      // handle
        B.box(0.02, 0.05, -0.022, 0.022, -0.018, 0.018, m, 0);                        // guard
        B.box(0.05, 0.26, -0.020, 0.012, -0.006, 0.006, [0.76, 0.79, 0.84], 0);       // blade
        B.box(0.20, 0.28, -0.012, 0.008, -0.005, 0.005, [0.86, 0.89, 0.94], 0);       // point
        break;

      case 'pistol':
        bodySegments(B, -0.06, 0.16, 0.0, 0.052, -0.020, 0.020, cols, 0, 5);          // slide
        B.box(-0.05, 0.14, -0.02, 0.005, -0.017, 0.017, m, 0);                        // frame
        B.box(-0.045, 0.01, -0.155, -0.015, -0.019, 0.019, body, 0);                  // grip
        B.box(-0.005, 0.03, -0.075, -0.03, -0.010, 0.010, m, 0);                      // trigger guard
        B.box(0.14, 0.185, 0.008, 0.040, -0.011, 0.011, m, 0);                        // muzzle
        if (w.silenced) B.box(0.16, 0.31, 0.006, 0.046, -0.022, 0.022, [0.12, 0.12, 0.13], 0);
        if (w.akimbo) {
          B.box(-0.06, 0.16, 0.0, 0.052, 0.06, 0.10, body, 0);
          B.box(-0.045, 0.01, -0.155, -0.015, 0.061, 0.099, body, 0);
        }
        break;

      case 'smg':
        bodySegments(B, -0.12, 0.22, -0.01, 0.055, -0.026, 0.026, cols, 0, 6);
        B.box(0.16, 0.34, 0.004, 0.040, -0.018, 0.018, m, 0);                          // barrel shroud
        B.box(-0.03, 0.03, -0.19, -0.005, -0.020, 0.020, body, 0);                     // grip
        B.box(0.03, 0.10, -0.20, -0.01, -0.016, 0.016, m, 0);                          // magazine
        B.box(-0.30, -0.11, 0.0, 0.035, -0.014, 0.014, m, 0);                          // stock
        B.box(0.02, 0.08, 0.055, 0.082, -0.010, 0.010, [0.10, 0.11, 0.13], 0);         // sight
        break;

      case 'rifle':
        bodySegments(B, -0.16, 0.26, -0.012, 0.060, -0.028, 0.028, cols, 0, 7);
        B.box(0.24, 0.52, 0.010, 0.046, -0.017, 0.017, m, 0);                          // handguard
        B.box(0.50, 0.62, 0.020, 0.040, -0.012, 0.012, m, 0);                          // barrel
        if (w.silenced) B.box(0.56, 0.78, 0.012, 0.050, -0.024, 0.024, [0.11, 0.11, 0.12], 0);
        B.box(-0.06, 0.01, -0.22, -0.008, -0.022, 0.022, body, 0);                     // pistol grip
        B.box(0.04, 0.13, -0.24, -0.008, -0.018, 0.018, m, 0);                         // magazine
        B.box(-0.40, -0.15, -0.02, 0.048, -0.020, 0.020, body, 0);                     // stock
        B.box(0.03, 0.12, 0.060, 0.092, -0.012, 0.012, [0.09, 0.10, 0.12], 0);         // rear sight
        if (w.scope) {
          B.cylinder(0.10, 0.070, 0, 0.026, 0.20, 8, [0.09, 0.09, 0.10], 0);
          B.box(0.06, 0.28, 0.062, 0.076, -0.014, 0.014, [0.12, 0.12, 0.14], 0);
        }
        break;

      case 'sniper':
        bodySegments(B, -0.20, 0.24, -0.010, 0.056, -0.026, 0.026, cols, 0, 7);
        B.box(0.22, 0.78, 0.014, 0.044, -0.015, 0.015, m, 0);                          // long barrel
        B.box(0.74, 0.86, 0.018, 0.040, -0.011, 0.011, m, 0);
        B.box(-0.07, 0.00, -0.22, -0.006, -0.021, 0.021, body, 0);
        B.box(0.02, 0.10, -0.20, -0.006, -0.016, 0.016, m, 0);
        B.box(-0.46, -0.19, -0.05, 0.050, -0.022, 0.022, body, 0);                     // stock with cheek rest
        B.box(-0.30, -0.14, 0.050, 0.082, -0.020, 0.020, body, 0);
        B.cylinder(0.02, 0.062, 0, 0.030, 0.30, 10, [0.08, 0.08, 0.09], 0);            // scope tube
        B.box(0.30, 0.36, 0.056, 0.072, -0.016, 0.016, [0.10, 0.10, 0.11], 0);
        break;

      case 'shotgun':
        bodySegments(B, -0.18, 0.20, -0.006, 0.052, -0.028, 0.028, cols, 0, 6);
        B.box(0.18, 0.64, 0.012, 0.046, -0.020, 0.020, m, 0);                          // barrel
        B.box(0.22, 0.58, -0.020, 0.012, -0.018, 0.018, m, 0);                         // tube magazine
        B.box(0.28, 0.42, -0.034, -0.004, -0.026, 0.026, WOODGRIP, 0);                 // pump
        B.box(-0.42, -0.16, -0.03, 0.050, -0.024, 0.024, WOODGRIP, 0);                 // stock
        break;

      case 'heavy':
        bodySegments(B, -0.22, 0.30, -0.014, 0.068, -0.034, 0.034, cols, 0, 8);
        B.box(0.28, 0.72, 0.016, 0.052, -0.019, 0.019, m, 0);
        B.box(0.02, 0.22, -0.20, -0.012, -0.055, 0.055, m, 0);                         // ammo box
        B.box(-0.07, 0.00, -0.22, -0.010, -0.023, 0.023, body, 0);
        B.box(-0.46, -0.20, -0.02, 0.056, -0.024, 0.024, body, 0);
        B.box(0.34, 0.50, -0.09, -0.02, -0.012, 0.012, m, 0);                          // bipod
        break;

      case 'grenade':
        var gc = w.gtype === 'smoke' ? [0.35, 0.40, 0.35] :
                 w.gtype === 'flash' ? [0.55, 0.55, 0.58] :
                 w.gtype === 'fire' ? [0.55, 0.30, 0.14] : [0.24, 0.30, 0.22];
        if (w.gtype === 'fire') {
          B.cylinder(0, -0.06, 0, 0.045, 0.15, 8, [0.62, 0.42, 0.18], 0);
          B.box(-0.014, 0.014, 0.085, 0.12, -0.014, 0.014, [0.85, 0.85, 0.80], 0);
        } else {
          B.box(-0.042, 0.042, -0.055, 0.055, -0.042, 0.042, gc, 0);
          B.box(-0.026, 0.026, 0.055, 0.078, -0.026, 0.026, [0.30, 0.31, 0.33], 0);
          B.box(-0.010, 0.036, 0.060, 0.072, -0.040, -0.026, [0.55, 0.56, 0.58], 0);   // spoon
        }
        break;

      default:
        B.box(-0.1, 0.2, -0.02, 0.04, -0.02, 0.02, m, 0);
    }
    return B.result();
  };

  /* First-person hands. Built around the origin so the viewmodel rig
   * can place them relative to the weapon grip. */
  Geo.buildHands = function (gloveId, skinTone) {
    var gl = Geo.GLOVES[gloveId] || Geo.GLOVES.default;
    var skin = skinTone || [0.74, 0.58, 0.45];
    var B = new Geo.Builder('skin');
    // right hand wrapped around the grip, forearm trailing back toward the camera
    B.box(-0.085, 0.045, -0.175, -0.045, -0.075, 0.045, gl.col, 0);
    B.box(-0.150, -0.03, -0.245, -0.150 + 0.11, -0.070, 0.040, gl.col, 0);
    B.box(-0.280, -0.09, -0.285, -0.150, -0.065, 0.045, skin, 0);
    // left hand supporting the handguard
    B.box(0.215, 0.345, -0.095, 0.020, -0.085, 0.045, gl.col, 0);
    B.box(0.225, 0.330, -0.200, -0.085, -0.095, 0.015, gl.col, 0);
    B.box(0.235, 0.320, -0.300, -0.190, -0.095, 0.010, skin, 0);
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
