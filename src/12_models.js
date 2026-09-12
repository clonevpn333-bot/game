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
    { name: 'armLU',  parent: 1,  off: [0, 0.325, -0.248] },
    { name: 'armLL',  parent: 3,  off: [0, -0.27, 0] },
    { name: 'armRU',  parent: 1,  off: [0, 0.325, 0.248] },
    { name: 'armRL',  parent: 5,  off: [0, -0.27, 0] },
    { name: 'legLU',  parent: 0,  off: [0, -0.02, -0.098] },
    { name: 'legLL',  parent: 7,  off: [0, -0.44, 0] },
    { name: 'legRU',  parent: 0,  off: [0, -0.02, 0.098] },
    { name: 'legRL',  parent: 9,  off: [0, -0.44, 0] },
    { name: 'weapon', parent: 6,  off: [0.10, -0.24, 0.02] }
  ];

  /* ---------------------------------------------------------------
   * Cosmetics (all free — nothing here changes damage or handling)
   * ------------------------------------------------------------- */
  Geo.CHARACTERS = {
    syn_default: { team: 1, name: 'Syndicate Regular', shirt: [0.40, 0.35, 0.28], pants: [0.27, 0.25, 0.21], vest: [0.33, 0.28, 0.21], skin: [0.70, 0.53, 0.40], head: [0.24, 0.22, 0.19] },
    syn_desert:  { team: 1, name: 'Desert Raider',     shirt: [0.58, 0.50, 0.36], pants: [0.46, 0.40, 0.30], vest: [0.40, 0.34, 0.24], skin: [0.64, 0.47, 0.35], head: [0.50, 0.44, 0.32] },
    syn_urban:   { team: 1, name: 'Street Operator',   shirt: [0.28, 0.27, 0.26], pants: [0.21, 0.20, 0.20], vest: [0.33, 0.24, 0.17], skin: [0.76, 0.60, 0.46], head: [0.17, 0.16, 0.16] },
    syn_veteran: { team: 1, name: 'Old Hand',          shirt: [0.35, 0.33, 0.25], pants: [0.26, 0.25, 0.20], vest: [0.42, 0.36, 0.23], skin: [0.68, 0.50, 0.38], head: [0.38, 0.35, 0.27] },
    van_default: { team: 2, name: 'Vanguard Trooper',  shirt: [0.26, 0.28, 0.31], pants: [0.21, 0.22, 0.25], vest: [0.23, 0.25, 0.29], skin: [0.72, 0.56, 0.43], head: [0.17, 0.18, 0.21] },
    van_swat:    { team: 2, name: 'Breach Unit',       shirt: [0.17, 0.18, 0.20], pants: [0.15, 0.16, 0.18], vest: [0.13, 0.14, 0.16], skin: [0.68, 0.52, 0.40], head: [0.11, 0.12, 0.14] },
    van_arctic:  { team: 2, name: 'Arctic Team',       shirt: [0.66, 0.68, 0.71], pants: [0.55, 0.57, 0.60], vest: [0.46, 0.49, 0.54], skin: [0.78, 0.62, 0.48], head: [0.58, 0.61, 0.65] },
    van_marine:  { team: 2, name: 'Coastal Marine',    shirt: [0.28, 0.32, 0.29], pants: [0.23, 0.26, 0.24], vest: [0.29, 0.34, 0.31], skin: [0.64, 0.48, 0.36], head: [0.22, 0.26, 0.24] }
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
    function tone(c, k) { return [c[0] * k, c[1] * k, c[2] * k]; }
    var vest = ch.vest, shirt = ch.shirt, pants = ch.pants, skin = ch.skin;
    var strap = tone(vest, 0.60);
    var rubber = [0.13, 0.135, 0.145];
    var accent = mixCol(vest, teamCol, 0.80);
    var webbing = tone(pants, 0.80);
    var buckle = [0.38, 0.39, 0.42];

    /* ============ PELVIS ============ */
    B.taper(0, 0, 0, 0.118, 0.150, 0.108, 0.132, -0.10, 0.075, pants, BONE.PELVIS);
    B.bevel(-0.126, 0.126, 0.045, 0.088, -0.164, 0.164, 0.018, strap, BONE.PELVIS);      // belt
    B.bevel(-0.042, 0.042, 0.048, 0.086, -0.062, 0.062, 0.012, buckle, BONE.PELVIS);     // buckle
    B.bevel(-0.072, 0.072, -0.085, -0.005, 0.150, 0.198, 0.014, webbing, BONE.PELVIS);   // dump pouch
    B.bevel(-0.062, 0.062, -0.105, -0.015, -0.196, -0.150, 0.014, webbing, BONE.PELVIS); // holster
    B.blob(0, -0.06, -0.172, 0.05, 0.038, 0.022, tone(webbing, 0.85), BONE.PELVIS, 3, 7);

    /* ============ TORSO ============ */
    // ribcage tapers out to the chest, in at the waist
    B.taper(0, 0, 0, 0.104, 0.148, 0.124, 0.196, -0.02, 0.20, shirt, BONE.SPINE);
    B.taper(0, 0, 0, 0.124, 0.196, 0.112, 0.186, 0.20, 0.385, shirt, BONE.SPINE);
    // plate carrier, bevelled so the edge catches light
    B.bevel(-0.140, 0.140, 0.040, 0.330, -0.176, 0.176, 0.022, vest, BONE.SPINE);
    B.bevel(-0.162, -0.110, 0.086, 0.312, -0.150, 0.150, 0.018, tone(vest, 1.16), BONE.SPINE);
    B.bevel(0.110, 0.162, 0.086, 0.312, -0.150, 0.150, 0.018, tone(vest, 0.76), BONE.SPINE);
    // magazine pouches
    for (var mp = 0; mp < 3; mp++) {
      var mz = -0.098 + mp * 0.098;
      B.bevel(-0.196, -0.154, 0.100, 0.208, mz - 0.040, mz + 0.040, 0.012, webbing, BONE.SPINE);
      B.bevel(-0.200, -0.180, 0.192, 0.216, mz - 0.042, mz + 0.042, 0.008, tone(webbing, 0.70), BONE.SPINE);
    }
    // shoulder straps over the trapezius
    B.taper(0, 0, -0.104, 0.058, 0.044, 0.052, 0.040, 0.290, 0.358, strap, BONE.SPINE);
    B.taper(0, 0, 0.104, 0.058, 0.044, 0.052, 0.040, 0.290, 0.358, strap, BONE.SPINE);
    // rounded deltoid caps in the team colour — the silhouette read at range
    B.blob(0, 0.330, -0.214, 0.090, 0.070, 0.082, accent, BONE.SPINE, 4, 9);
    B.blob(0, 0.330, 0.214, 0.090, 0.070, 0.082, accent, BONE.SPINE, 4, 9);
    B.bevel(-0.146, -0.126, 0.150, 0.300, -0.040, 0.040, 0.008, accent, BONE.SPINE);   // chest stripe
    // radio and antenna
    B.bevel(-0.104, -0.052, 0.288, 0.352, -0.212, -0.166, 0.010, rubber, BONE.SPINE);
    B.lathe(-0.078, 0.352, -0.190, [[0.006, 0], [0.005, 0.085], [0.003, 0.095]], 5, rubber, BONE.SPINE, true);
    // rear pack
    B.taper(0.148, 0, 0, 0.040, 0.108, 0.032, 0.092, 0.040, 0.265, webbing, BONE.SPINE);
    // neck
    B.lathe(0, 0.365, 0, [[0.050, 0], [0.047, 0.055], [0.045, 0.092]], 8, tone(skin, 0.84), BONE.SPINE, true);

    /* ============ HEAD ============ */
    // skull as a squashed sphere, then brow, nose and jaw on top of it
    B.blob(0.004, 0.005, 0, 0.094, 0.104, 0.089, skin, BONE.HEAD, 6, 11);
    B.taper(0.024, 0, 0, 0.062, 0.070, 0.044, 0.052, -0.098, -0.030, tone(skin, 0.94), BONE.HEAD); // jaw
    B.blob(0.052, -0.052, 0, 0.046, 0.034, 0.052, tone(skin, 0.97), BONE.HEAD, 3, 8);              // chin
    B.blob(0.082, 0.008, 0, 0.020, 0.026, 0.016, tone(skin, 1.02), BONE.HEAD, 3, 7);               // nose
    // hood / balaclava covering the crown and nape
    B.blob(-0.006, 0.012, 0, 0.100, 0.106, 0.095, ch.head, BONE.HEAD, 6, 11);
    B.taper(-0.030, 0, 0, 0.070, 0.082, 0.056, 0.066, -0.090, 0.010, ch.head, BONE.HEAD);
    // eye band and lenses
    B.bevel(0.062, 0.100, -0.010, 0.048, -0.080, 0.080, 0.010, [0.11, 0.12, 0.15], BONE.HEAD);
    B.blob(0.094, 0.020, -0.044, 0.016, 0.019, 0.026, [0.26, 0.44, 0.52], BONE.HEAD, 3, 7);
    B.blob(0.094, 0.020, 0.044, 0.016, 0.019, 0.026, [0.26, 0.44, 0.52], BONE.HEAD, 3, 7);
    B.bevel(-0.098, 0.086, 0.044, 0.060, -0.086, 0.086, 0.008, tone(ch.head, 0.72), BONE.HEAD);
    if (hasHelmet) {
      var hel = mixCol(ch.head, [0.30, 0.31, 0.34], 0.58);
      // shell: a hemisphere flattened at the back, with a brim
      B.lathe(-0.004, 0.030, 0, [
        [0.104, 0], [0.112, 0.024], [0.108, 0.070], [0.092, 0.108], [0.058, 0.136], [0.016, 0.150]
      ], 12, hel, BONE.HEAD, true, 0.94);
      B.taper(0.062, 0, 0, 0.048, 0.090, 0.030, 0.076, 0.020, 0.068, tone(hel, 0.94), BONE.HEAD);  // brim
      B.bevel(-0.026, 0.030, 0.148, 0.180, -0.030, 0.030, 0.008, rubber, BONE.HEAD);               // NVG mount
      B.blob(-0.092, 0.030, -0.100, 0.030, 0.040, 0.020, rubber, BONE.HEAD, 3, 7);                 // ear cups
      B.blob(-0.092, 0.030, 0.100, 0.030, 0.040, 0.020, rubber, BONE.HEAD, 3, 7);
      B.bevel(-0.108, 0.068, 0.006, 0.026, -0.108, 0.108, 0.006, tone(hel, 0.70), BONE.HEAD);      // chin strap
    }

    /* ============ ARMS ============ */
    function arm(up, lo) {
      B.blob(0, 0.012, 0, 0.072, 0.066, 0.072, shirt, up, 4, 9);                        // shoulder ball
      B.limb(0, 0, 0, -0.020, -0.245, 0.068, 0.054, shirt, up, 9);                       // upper arm
      B.blob(0, -0.268, 0, 0.060, 0.054, 0.058, tone(shirt, 0.86), up, 4, 9);            // elbow pad
      B.limb(0, 0, 0, 0.010, -0.190, 0.055, 0.046, shirt, lo, 9);                        // forearm
      B.lathe(0, -0.208, 0, [[0.052, 0], [0.057, 0.014], [0.054, 0.034]], 9, tone(shirt, 0.92), lo, true); // cuff
      B.blob(0, -0.272, 0, 0.055, 0.052, 0.048, gl.col, lo, 4, 9);                       // fist
      B.bevel(-0.050, 0.050, -0.326, -0.280, -0.044, 0.044, 0.012, tone(gl.col, 0.90), lo); // fingers
      B.bevel(-0.034, 0.038, -0.270, -0.246, -0.054, 0.054, 0.008, tone(gl.col, 1.20), lo); // knuckle plate
    }
    arm(BONE.ARM_LU, BONE.ARM_LL);
    arm(BONE.ARM_RU, BONE.ARM_RL);
    B.bevel(-0.046, 0.046, -0.238, -0.214, -0.052, -0.040, 0.006, [0.14, 0.15, 0.17], BONE.ARM_LL);

    /* ============ LEGS ============ */
    function leg(up, lo) {
      B.limb(0, 0, 0, 0.025, -0.400, 0.100, 0.074, pants, up, 9);                        // thigh
      B.blob(-0.012, -0.434, 0, 0.086, 0.066, 0.082, tone(pants, 0.80), up, 4, 9);        // knee pad
      B.limb(0, 0, 0, -0.010, -0.355, 0.076, 0.056, pants, lo, 9);                        // calf
      B.lathe(0, -0.384, 0, [[0.066, 0], [0.072, 0.014], [0.068, 0.034]], 9, tone(pants, 0.90), lo, true);
      // boot: ankle, upper and a chunky sole
      B.blob(0.004, -0.422, 0, 0.068, 0.046, 0.066, rubber, lo, 4, 9);
      B.taper(0.016, 0, 0, 0.078, 0.078, 0.094, 0.082, -0.470, -0.422, rubber, lo, 0.022, 0);
      B.bevel(-0.086, 0.134, -0.500, -0.464, -0.088, 0.088, 0.012, tone(rubber, 0.72), lo);
      B.bevel(-0.078, 0.122, -0.508, -0.496, -0.080, 0.080, 0.006, tone(rubber, 1.35), lo);
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
    if (!w) { B.bevel(-0.1, 0.1, -0.03, 0.03, -0.02, 0.02, 0.01, GUNMETAL, 0); return B.result(); }
    var cols = skinColors(w, skinId);
    var m = cols.metal, body = cols.body;
    var dark = [0.20, 0.205, 0.225];
    var steel = [0.58, 0.60, 0.65];
    var bright = [0.76, 0.79, 0.84];
    var blued = [0.26, 0.27, 0.30];

    /* A barrel is a tube lying along X, so lathe it and rotate the profile in. */
    function tube(x0, x1, r0, r1, col, sides) {
      var len = x1 - x0, steps = 1;
      // build along Y then map: emit directly as a ring strip along X
      var seg = sides || 10;
      for (var i = 0; i < seg; i++) {
        var a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
        var c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
        var p0 = [x0, c0 * r0, s0 * r0], p1 = [x0, c1 * r0, s1 * r0];
        var p2 = [x1, c1 * r1, s1 * r1], p3 = [x1, c0 * r1, s0 * r1];
        var sh0 = Geo.faceShade(0, c0, s0), sh1 = Geo.faceShade(0, c1, s1);
        var base = B.nv;
        B.vert(p0[0], p0[1], p0[2], 0, c0, s0, col[0] * sh0, col[1] * sh0, col[2] * sh0, 0, 0);
        B.vert(p1[0], p1[1], p1[2], 0, c1, s1, col[0] * sh1, col[1] * sh1, col[2] * sh1, 0, 0);
        B.vert(p2[0], p2[1], p2[2], 0, c1, s1, col[0] * sh1, col[1] * sh1, col[2] * sh1, 0, 0);
        B.vert(p3[0], p3[1], p3[2], 0, c0, s0, col[0] * sh0, col[1] * sh0, col[2] * sh0, 0, 0);
        B.quad(base, base + 1, base + 2, base + 3);
      }
      void len; void steps;
    }
    function capX(x, r, col, dir, sides) {
      var seg = sides || 10;
      var sh = Geo.faceShade(dir, 0, 0);
      var c = [col[0] * sh, col[1] * sh, col[2] * sh];
      var centre = B.nv;
      B.vert(x, 0, 0, dir, 0, 0, c[0], c[1], c[2], 0, 0);
      for (var i = 0; i <= seg; i++) {
        var a = (i / seg) * Math.PI * 2 * dir;
        B.vert(x, Math.cos(a) * r, Math.sin(a) * r, dir, 0, 0, c[0], c[1], c[2], 0, 0);
      }
      for (var k = 0; k < seg; k++) B.i.push(centre, centre + 1 + k, centre + 2 + k);
    }
    /* Ribbed strip — serrations, vents, checkering. */
    function ribs(x0, x1, y0, y1, z0, z1, n, col, d) {
      var step = (x1 - x0) / n;
      for (var i = 0; i < n; i++) {
        var a = x0 + step * i;
        B.bevel(a, a + step * 0.56, y0, y1, z0 - (d || 0.002), z1 + (d || 0.002), 0.0025, col, 0);
      }
    }
    /* Magazine curved by stacking short tapered slabs along an arc. */
    function curvedMag(x, y, len, w0, w1, thick, curve, col) {
      var n = 5;
      for (var i = 0; i < n; i++) {
        var t0 = i / n, t1 = (i + 1) / n;
        var y0 = y - len * t0, y1 = y - len * t1;
        var x0 = x + curve * t0 * t0, x1b = x + curve * t1 * t1;
        var r0 = w0 + (w1 - w0) * t0, r1 = w0 + (w1 - w0) * t1;
        B.segXY(x0, y0, x1b, y1, 0, thick, thick * 0.96, r0, r1,
                i === n - 1 ? [col[0] * 0.7, col[1] * 0.7, col[2] * 0.7] : col, 0);
      }
    }
    function ironSights(xr, xf, y) {
      B.bevel(xr, xr + 0.030, y, y + 0.022, -0.015, 0.015, 0.005, dark, 0);
      B.bevel(xr + 0.007, xr + 0.013, y + 0.014, y + 0.034, -0.011, -0.005, 0.002, dark, 0);
      B.bevel(xr + 0.018, xr + 0.024, y + 0.014, y + 0.034, 0.005, 0.011, 0.002, dark, 0);
      B.bevel(xf - 0.006, xf + 0.020, y - 0.004, y + 0.010, -0.014, 0.014, 0.004, dark, 0);
      B.bevel(xf + 0.004, xf + 0.012, y + 0.008, y + 0.034, -0.005, 0.005, 0.002, dark, 0);
    }

    switch (w.cls) {
      case 'knife': {
        // handle
        B.bevel(-0.112, 0.008, -0.019, 0.019, -0.017, 0.017, 0.007, [0.16, 0.16, 0.17], 0);
        ribs(-0.104, -0.008, -0.022, 0.022, -0.019, 0.019, 6, [0.09, 0.09, 0.10], 0.0015);
        B.blob(-0.122, 0, 0, 0.016, 0.023, 0.019, m, 0, 4, 8);                            // pommel
        B.bevel(0.008, 0.036, -0.028, 0.028, -0.022, 0.022, 0.008, m, 0);                 // guard
        // blade: a flat wedge running along +X, ground to an edge on the underside
        var bl0 = 0.036, bl1 = 0.238, tip = 0.284;
        var spine = 0.016, belly = -0.022, th = 0.0055;
        var edge = [0.92, 0.94, 0.98], flat = [0.72, 0.75, 0.81];
        // two flats
        B.quadFace([bl0, belly, th], [bl1, belly + 0.004, th], [bl1, spine, th], [bl0, spine, th], flat, 0);
        B.quadFace([bl0, spine, -th], [bl1, spine, -th], [bl1, belly + 0.004, -th], [bl0, belly, -th], flat, 0);
        // spine
        B.quadFace([bl0, spine, -th], [bl0, spine, th], [bl1, spine, th], [bl1, spine, -th], flat, 0);
        // ground edge, two bevels meeting at a line just under the belly
        B.quadFace([bl0, belly, th], [bl0, belly - 0.005, 0], [bl1, belly - 0.001, 0], [bl1, belly + 0.004, th], edge, 0);
        B.quadFace([bl0, belly - 0.005, 0], [bl0, belly, -th], [bl1, belly + 0.004, -th], [bl1, belly - 0.001, 0], edge, 0);
        // clip point
        B.triFace([bl1, spine, th], [bl1, belly + 0.004, th], [tip, -0.004, 0], flat, 0);
        B.triFace([bl1, belly + 0.004, -th], [bl1, spine, -th], [tip, -0.004, 0], flat, 0);
        B.triFace([bl1, spine, -th], [bl1, spine, th], [tip, -0.004, 0], edge, 0);
        // serrations along the spine
        ribs(0.062, 0.150, 0.014, 0.024, -0.0055, 0.0055, 6, [0.58, 0.60, 0.66], 0.0006);
        break;
      }

      case 'pistol': {
        var sl = 0.168;
        // slide with a bevelled top and a rounded rear
        B.bevel(-0.062, sl, 0.004, 0.050, -0.019, 0.019, 0.006, cols.body === POLYMER ? blued : body, 0);
        ribs(-0.058, 0.000, 0.008, 0.046, -0.021, 0.021, 6, dark, 0.0015);
        B.blob(-0.062, 0.027, 0, 0.014, 0.023, 0.019, blued, 0, 4, 8);
        B.bevel(-0.050, sl - 0.022, -0.020, 0.006, -0.017, 0.017, 0.005, m, 0);          // frame
        tube(sl - 0.006, sl + 0.020, 0.012, 0.012, steel, 8);
        capX(sl + 0.020, 0.012, dark, 1, 8);
        B.boxRotZ(-0.030, -0.088, 0, 0.023, 0.070, 0.019, 0.26, body, 0);                // grip
        ribs(-0.052, -0.010, -0.148, -0.034, -0.021, 0.021, 5, dark, 0.0015);
        B.bevel(-0.042, -0.024, -0.162, -0.140, -0.019, 0.019, 0.005, m, 0);             // mag floorplate
        B.bevel(-0.006, 0.032, -0.058, -0.030, -0.009, 0.009, 0.004, m, 0);              // trigger guard
        B.bevel(0.024, 0.033, -0.052, -0.024, -0.011, 0.011, 0.004, m, 0);
        B.segXY(-0.010, -0.030, -0.004, -0.050, 0, 0.007, 0.007, 0.006, 0.005, steel, 0); // trigger
        B.bevel(-0.056, -0.040, 0.050, 0.062, -0.012, 0.012, 0.004, dark, 0);
        B.bevel(sl - 0.026, sl - 0.016, 0.050, 0.062, -0.005, 0.005, 0.003, dark, 0);
        if (w.silenced) {
          tube(sl + 0.005, sl + 0.150, 0.022, 0.022, [0.14, 0.145, 0.155], 12);
          capX(sl + 0.150, 0.022, [0.10, 0.10, 0.11], 1, 12);
          ribs(sl + 0.020, sl + 0.132, -0.024, 0.024, -0.024, 0.024, 8, [0.10, 0.10, 0.11], 0.0008);
        }
        if (w.akimbo) {
          B.bevel(-0.062, sl, 0.004, 0.050, 0.062, 0.100, 0.006, body, 0);
          B.boxRotZ(-0.030, -0.088, 0.081, 0.023, 0.070, 0.019, 0.26, body, 0);
          tube(sl - 0.006, sl + 0.020, 0.012, 0.012, steel, 8);
        }
        break;
      }

      case 'smg':
        B.bevel(-0.130, 0.215, -0.004, 0.056, -0.025, 0.025, 0.008, body, 0);
        B.bevel(-0.136, 0.150, 0.052, 0.066, -0.020, 0.020, 0.005, m, 0);                // rail
        ribs(-0.126, 0.140, 0.058, 0.070, -0.021, 0.021, 12, dark, 0.0012);
        tube(0.170, 0.302, 0.019, 0.018, m, 10);                                          // shroud
        ribs(0.182, 0.292, -0.021, 0.021, -0.021, 0.021, 6, dark, 0.0018);                // vent slots
        tube(0.300, 0.344, 0.011, 0.010, steel, 8); capX(0.344, 0.010, dark, 1, 8);
        B.boxRotZ(-0.014, -0.112, 0, 0.025, 0.068, 0.021, 0.18, body, 0);
        ribs(-0.036, 0.006, -0.172, -0.062, -0.023, 0.023, 5, dark, 0.0015);
        curvedMag(0.076, -0.048, 0.150, 0.022, 0.019, 0.017, -0.028, m);
        B.bevel(-0.262, -0.126, 0.006, 0.032, -0.013, 0.013, 0.005, m, 0);                // stock struts
        B.bevel(-0.290, -0.256, -0.024, 0.048, -0.020, 0.020, 0.008, body, 0);
        B.bevel(0.024, 0.062, -0.042, -0.016, -0.010, 0.010, 0.004, m, 0);
        ironSights(-0.112, 0.238, 0.064);
        break;

      case 'rifle': {
        var wood = /kr47|nomadAR/.test(w.id);
        var furn = wood ? WOODGRIP : body;
        B.bevel(-0.175, 0.255, -0.010, 0.062, -0.026, 0.026, 0.009, body, 0);             // receiver
        B.bevel(-0.180, 0.140, 0.058, 0.072, -0.021, 0.021, 0.005, m, 0);                 // dust cover
        ribs(-0.170, 0.132, 0.062, 0.076, -0.022, 0.022, 12, dark, 0.0012);
        B.bevel(0.098, 0.132, 0.058, 0.094, -0.013, 0.013, 0.006, m, 0);                  // gas block
        B.taper(0.355, 0, 0, 0.021, 0.021, 0.018, 0.018, -0.018, 0.048, furn, 0);         // handguard
        B.bevel(0.240, 0.470, 0.008, 0.048, -0.022, 0.022, 0.010, furn, 0);
        if (wood) ribs(0.256, 0.454, 0.010, 0.046, -0.024, 0.024, 5, [0.34, 0.20, 0.10], 0.0015);
        else ribs(0.250, 0.460, 0.010, 0.046, -0.024, 0.024, 9, dark, 0.0018);
        tube(0.300, 0.560, 0.011, 0.011, m, 8);                                           // gas tube
        tube(0.462, 0.600, 0.013, 0.012, steel, 10);                                      // barrel
        tube(0.598, 0.648, 0.019, 0.018, m, 10);                                          // muzzle brake
        ribs(0.604, 0.644, -0.020, 0.020, -0.020, 0.020, 3, dark, 0.001);
        capX(0.648, 0.018, dark, 1, 10);
        B.boxRotZ(-0.050, -0.132, 0, 0.029, 0.078, 0.023, 0.22, body, 0);                 // pistol grip
        ribs(-0.078, -0.026, -0.204, -0.072, -0.025, 0.025, 6, dark, 0.0015);
        curvedMag(0.098, -0.052, 0.196, 0.035, 0.029, 0.019, -0.048, m);                  // curved mag
        B.bevel(0.028, 0.072, -0.056, -0.020, -0.011, 0.011, 0.004, m, 0);                // trigger guard
        B.segXY(0.044, -0.024, 0.050, -0.046, 0, 0.007, 0.007, 0.006, 0.005, steel, 0);
        B.bevel(0.150, 0.192, 0.030, 0.056, 0.026, 0.036, 0.005, bright, 0);              // charging handle
        B.bevel(0.058, 0.122, 0.032, 0.056, 0.025, 0.030, 0.004, dark, 0);                // ejection port
        if (wood) {
          B.taper(-0.300, 0, 0, 0.024, 0.023, 0.030, 0.025, -0.130, 0.050, WOODGRIP, 0);
          B.bevel(-0.432, -0.168, -0.028, 0.052, -0.023, 0.023, 0.010, WOODGRIP, 0);
          B.bevel(-0.448, -0.418, -0.036, 0.058, -0.026, 0.026, 0.006, dark, 0);
        } else {
          tube(-0.400, -0.180, 0.017, 0.017, m, 8);
          B.bevel(-0.398, -0.248, -0.030, 0.054, -0.024, 0.024, 0.010, body, 0);
          B.bevel(-0.412, -0.386, -0.038, 0.058, -0.027, 0.027, 0.006, dark, 0);
          B.bevel(-0.334, -0.250, 0.048, 0.070, -0.019, 0.019, 0.008, body, 0);
        }
        if (w.scope) {
          tube(-0.055, 0.250, 0.028, 0.028, [0.20, 0.21, 0.23], 12);
          B.bevel(-0.060, 0.255, 0.046, 0.060, -0.017, 0.017, 0.005, [0.12, 0.13, 0.15], 0);
          tube(0.238, 0.268, 0.038, 0.040, [0.15, 0.16, 0.18], 12);
          capX(0.268, 0.040, [0.14, 0.22, 0.30], 1, 12);
          capX(-0.055, 0.028, [0.32, 0.58, 0.72], -1, 12);
          // lift the scope onto rings above the receiver
          B.bevel(-0.020, 0.020, 0.062, 0.080, -0.016, 0.016, 0.005, dark, 0);
          B.bevel(0.150, 0.190, 0.062, 0.080, -0.016, 0.016, 0.005, dark, 0);
        } else ironSights(-0.150, 0.428, 0.072);
        break;
      }

      case 'sniper':
        B.bevel(-0.215, 0.245, -0.006, 0.058, -0.024, 0.024, 0.009, body, 0);
        tube(0.232, 0.782, 0.016, 0.014, m, 12);                                          // heavy barrel
        ribs(0.420, 0.700, -0.018, 0.018, -0.018, 0.018, 8, dark, 0.0012);                // flutes
        tube(0.780, 0.848, 0.021, 0.020, steel, 12); capX(0.848, 0.020, dark, 1, 12);
        B.boxRotZ(-0.056, -0.128, 0, 0.029, 0.074, 0.022, 0.20, body, 0);
        ribs(-0.082, -0.030, -0.198, -0.068, -0.024, 0.024, 5, dark, 0.0015);
        curvedMag(0.072, -0.042, 0.130, 0.028, 0.026, 0.018, -0.022, m);
        B.taper(-0.330, 0, 0, 0.026, 0.024, 0.044, 0.024, -0.058, 0.052, body, 0);        // stock comb
        B.bevel(-0.472, -0.200, -0.052, 0.050, -0.024, 0.024, 0.012, body, 0);
        B.bevel(-0.336, -0.170, 0.046, 0.090, -0.023, 0.023, 0.010, body, 0);             // cheek riser
        B.bevel(-0.492, -0.462, -0.062, 0.056, -0.027, 0.027, 0.008, dark, 0);            // recoil pad
        B.bevel(-0.226, -0.118, -0.092, -0.048, -0.021, 0.021, 0.010, body, 0);           // thumbhole spine
        tube(-0.060, 0.300, 0.032, 0.032, [0.21, 0.22, 0.24], 14);                        // scope
        tube(0.296, 0.330, 0.044, 0.046, [0.16, 0.17, 0.19], 14);
        capX(0.330, 0.046, [0.14, 0.22, 0.30], 1, 14);
        capX(-0.060, 0.032, [0.32, 0.58, 0.72], -1, 14);
        B.bevel(-0.050, 0.006, 0.046, 0.066, -0.020, 0.020, 0.005, dark, 0);              // rings
        B.bevel(0.176, 0.232, 0.046, 0.066, -0.020, 0.020, 0.005, dark, 0);
        B.segXY(0.150, 0.034, 0.194, 0.048, 0.030, 0.009, 0.009, 0.009, 0.008, bright, 0);// bolt
        B.blob(0.198, 0.052, 0.046, 0.013, 0.013, 0.013, bright, 0, 3, 7);
        B.segXY(0.400, -0.024, 0.362, -0.112, -0.018, 0.007, 0.006, 0.007, 0.005, dark, 0); // bipod
        B.segXY(0.400, -0.024, 0.362, -0.112, 0.040, 0.007, 0.006, 0.007, 0.005, dark, 0);
        break;

      case 'shotgun':
        B.bevel(-0.200, 0.190, -0.002, 0.052, -0.026, 0.026, 0.009, body, 0);
        tube(0.182, 0.662, 0.018, 0.017, m, 12);                                          // barrel
        tube(0.198, 0.600, 0.014, 0.013, m, 10);                                          // mag tube (below)
        B.bevel(0.198, 0.600, -0.026, -0.004, -0.014, 0.014, 0.005, m, 0);
        B.taper(0.356, 0, 0, 0.028, 0.028, 0.026, 0.026, -0.042, -0.002, WOODGRIP, 0);    // pump
        ribs(0.292, 0.420, -0.044, -0.002, -0.030, 0.030, 7, [0.30, 0.18, 0.09], 0.0015);
        capX(0.662, 0.017, dark, 1, 12);
        B.blob(0.608, 0.058, 0, 0.006, 0.007, 0.006, bright, 0, 3, 6);                    // bead
        B.taper(-0.300, 0, 0, 0.024, 0.023, 0.030, 0.025, -0.120, 0.048, WOODGRIP, 0);
        B.bevel(-0.436, -0.186, -0.032, 0.050, -0.024, 0.024, 0.012, WOODGRIP, 0);
        B.bevel(-0.452, -0.422, -0.040, 0.054, -0.027, 0.027, 0.007, dark, 0);
        B.bevel(0.016, 0.070, -0.048, -0.014, -0.011, 0.011, 0.004, m, 0);
        break;

      case 'heavy':
        B.bevel(-0.235, 0.310, -0.014, 0.070, -0.032, 0.032, 0.011, body, 0);
        B.bevel(-0.152, 0.122, 0.066, 0.084, -0.024, 0.024, 0.006, m, 0);                 // carry handle
        B.bevel(-0.152, -0.122, 0.056, 0.070, -0.020, 0.020, 0.005, m, 0);
        B.bevel(0.092, 0.122, 0.056, 0.070, -0.020, 0.020, 0.005, m, 0);
        tube(0.302, 0.762, 0.019, 0.017, m, 12);
        ribs(0.340, 0.640, -0.021, 0.021, -0.021, 0.021, 10, dark, 0.0015);
        tube(0.758, 0.818, 0.025, 0.024, steel, 12); capX(0.818, 0.024, dark, 1, 12);
        B.bevel(0.018, 0.232, -0.206, -0.014, -0.058, 0.058, 0.014, m, 0);                // ammo box
        ribs(0.036, 0.214, -0.192, -0.030, -0.060, 0.060, 5, dark, 0.0018);
        B.bevel(0.224, 0.252, -0.122, -0.058, -0.030, 0.030, 0.008, bright, 0);           // belt
        B.boxRotZ(-0.060, -0.138, 0, 0.031, 0.080, 0.024, 0.20, body, 0);
        B.bevel(-0.472, -0.208, -0.032, 0.058, -0.026, 0.026, 0.012, body, 0);
        B.bevel(-0.488, -0.458, -0.040, 0.062, -0.029, 0.029, 0.008, dark, 0);
        B.segXY(0.560, -0.024, 0.382, -0.150, -0.020, 0.008, 0.007, 0.008, 0.006, dark, 0);
        B.segXY(0.560, -0.024, 0.382, -0.150, 0.046, 0.008, 0.007, 0.008, 0.006, dark, 0);
        ironSights(-0.190, 0.288, 0.084);
        break;

      case 'grenade': {
        var gc = w.gtype === 'smoke' ? [0.34, 0.42, 0.35] :
                 w.gtype === 'flash' ? [0.54, 0.55, 0.58] :
                 w.gtype === 'fire' ? [0.54, 0.32, 0.15] : [0.24, 0.31, 0.22];
        if (w.gtype === 'fire') {
          B.lathe(0, -0.080, 0, [[0.020, 0], [0.042, 0.018], [0.046, 0.100], [0.030, 0.135],
                                 [0.019, 0.150], [0.018, 0.185]], 12, [0.60, 0.42, 0.18], 0, true);
          B.lathe(0, 0.105, 0, [[0.019, 0], [0.022, 0.012], [0.020, 0.026]], 10, [0.50, 0.34, 0.14], 0, true);
          B.taper(0, 0.135, 0, 0.013, 0.013, 0.009, 0.009, 0, 0.048, [0.88, 0.86, 0.80], 0);
          B.lathe(0, -0.040, 0, [[0.047, 0], [0.048, 0.045], [0.047, 0.050]], 12, [0.74, 0.50, 0.18], 0, true);
        } else {
          // ovoid body with a ribbed waist and a proper spoon
          B.lathe(0, -0.058, 0, [[0.016, 0], [0.034, 0.014], [0.041, 0.048], [0.041, 0.072],
                                 [0.033, 0.104], [0.018, 0.116]], 12, gc, 0, true);
          B.lathe(0, -0.014, 0, [[0.042, 0], [0.043, 0.010], [0.042, 0.020]], 12, mixCol(gc, [0, 0, 0], 0.30), 0, true);
          B.lathe(0, 0.058, 0, [[0.019, 0], [0.021, 0.020], [0.017, 0.032]], 10, [0.30, 0.31, 0.33], 0, true);
          B.segXY(0.004, 0.076, 0.004, 0.044, -0.040, 0.009, 0.009, 0.011, 0.010, [0.60, 0.61, 0.64], 0);
          B.segXY(0.004, 0.044, 0.014, 0.020, -0.040, 0.009, 0.008, 0.010, 0.008, [0.60, 0.61, 0.64], 0);
          B.lathe(0.020, 0.086, -0.030, [[0.010, 0], [0.012, 0.004], [0.010, 0.008]], 8, [0.72, 0.73, 0.76], 0, true);
        }
        break;
      }

      default:
        B.bevel(-0.1, 0.2, -0.02, 0.04, -0.02, 0.02, 0.008, m, 0);
    }
    return B.result();
  };

  /* ---------------------------------------------------------------
   * Hands
   *
   * Built per weapon from that weapon's grip anchors, so the hands sit on
   * the gun instead of floating near it. Each hand is a palm, four curled
   * fingers, a thumb and a forearm running back toward the camera.
   * ------------------------------------------------------------- */

  /* Where each weapon is actually held, in model space (+X = muzzle). */
  var GRIPS = {
    rifle:   { right: [-0.055, -0.128, 0], left: [0.345, 0.012, 0], leftStyle: 'guard' },
    smg:     { right: [-0.020, -0.118, 0], left: [0.240, 0.018, 0], leftStyle: 'guard' },
    sniper:  { right: [-0.060, -0.126, 0], left: [0.300, 0.024, 0], leftStyle: 'guard' },
    shotgun: { right: [0.020, -0.108, 0],  left: [0.355, -0.028, 0], leftStyle: 'guard' },
    heavy:   { right: [-0.062, -0.136, 0], left: [0.150, -0.108, 0], leftStyle: 'guard' },
    pistol:  { right: [-0.030, -0.088, 0], left: [-0.030, -0.092, -0.052], leftStyle: 'support' },
    knife:   { right: [-0.055, -0.002, 0], left: null },
    grenade: { right: [0, -0.020, 0], left: null, wrap: true }
  };
  var GRIP_OVERRIDE = {
    talon50: { right: [-0.032, -0.086, 0], left: [-0.032, -0.090, -0.052], leftStyle: 'support' },
    judgeR8: { right: [-0.034, -0.090, 0], left: [-0.034, -0.094, -0.052], leftStyle: 'support' },
    twinElites: { right: [-0.030, -0.088, 0], left: [-0.030, -0.088, 0.081], leftStyle: 'mirror' },
    breaker12: { right: [0.020, -0.108, 0], left: [0.355, -0.030, 0], leftStyle: 'guard' },
    nemesis: { right: [-0.062, -0.136, 0], left: [0.330, -0.020, 0], leftStyle: 'guard' },
    hailstorm: { right: [-0.062, -0.136, 0], left: [0.150, -0.110, 0], leftStyle: 'guard' }
  };

  /* One finger: three curling joints. */
  function finger(B, x, y, z, hz, len, ang, curl, r, col, bone) {
    var frac = [0.42, 0.34, 0.24];
    for (var s = 0; s < 3; s++) {
      var l = len * frac[s];
      var nx = x + Math.cos(ang) * l, ny = y + Math.sin(ang) * l;
      var rr = r * (1 - s * 0.18);
      B.segXY(x, y, nx, ny, z, hz * (1 - s * 0.14), hz * (1 - (s + 1) * 0.14),
              rr, rr * 0.88, s === 2 ? [col[0] * 1.08, col[1] * 1.08, col[2] * 1.08] : col, bone);
      x = nx; y = ny; ang += curl;
    }
  }

  /* A hand. `style`: 'grip' wraps a vertical pistol grip, 'guard' clamps a
   * horizontal handguard, 'support' cups the base of a pistol grip.
   * `k` compensates for the weapon's viewmodel scale so hands stay the same
   * real-world size whichever gun is held. */
  function hand(B, o) {
    var gcol = o.glove, skin = o.skin, bone = o.bone || 0;
    var pal = [gcol[0] * 0.94, gcol[1] * 0.94, gcol[2] * 0.94];
    var cuff = [gcol[0] * 0.72, gcol[1] * 0.72, gcol[2] * 0.72];
    var x = o.x, y = o.y, z = o.z, side = o.side === undefined ? 1 : o.side;
    var k = o.k || 1;
    function X(d) { return x + d * k; }
    function Y(d) { return y + d * k; }
    function Z(d) { return z + d * k; }
    var hz = 0.030 * k;

    if (o.style === 'guard') {
      B.bevel(X(-0.062), X(0.062), Y(-0.068), Y(0.020),
              Z(-0.030 - 0.018 * side), Z(0.030 - 0.018 * side), 0.014 * k, pal, bone);
      for (var i = 0; i < 4; i++) {
        finger(B, X(-0.046 + i * 0.031), Y(-0.052), Z((0.024 - i * 0.004) * side), 0.013 * k,
               0.082 * k, 1.30, 0.52, 0.013 * k, gcol, bone);
      }
      finger(B, X(0.020), Y(-0.018), Z(-0.036 * side), 0.014 * k, 0.062 * k, 2.55, 0.34, 0.015 * k, gcol, bone);
      B.segXY(X(-0.050), Y(-0.060), X(-0.190), Y(-0.128), Z(-0.020 * side),
              0.034 * k, 0.036 * k, 0.040 * k, 0.044 * k, cuff, bone);
      B.segXY(X(-0.180), Y(-0.122), X(-0.330), Y(-0.196), Z(-0.020 * side),
              0.036 * k, 0.034 * k, 0.044 * k, 0.040 * k, skin, bone);
    } else if (o.style === 'support') {
      B.bevel(X(-0.050), X(0.046), Y(-0.060), Y(0.026), Z(-0.030), Z(0.030), 0.014 * k, pal, bone);
      for (var c2 = 0; c2 < 4; c2++) {
        finger(B, X(0.030), Y(-0.008 - c2 * 0.026), Z((0.006 - c2 * 0.002) * side), 0.012 * k,
               0.062 * k, 0.42, 0.60, 0.012 * k, gcol, bone);
      }
      finger(B, X(0.014), Y(0.016), Z(0.030 * side), 0.013 * k, 0.050 * k, 1.15, 0.30, 0.013 * k, gcol, bone);
      B.segXY(X(-0.040), Y(-0.044), X(-0.176), Y(-0.134), z, 0.034 * k, 0.036 * k, 0.040 * k, 0.044 * k, cuff, bone);
      B.segXY(X(-0.166), Y(-0.128), X(-0.316), Y(-0.206), z, 0.036 * k, 0.034 * k, 0.044 * k, 0.040 * k, skin, bone);
    } else {
      B.bevel(X(-0.052), X(0.022), Y(-0.086), Y(0.038), Z(-0.034), Z(0.034), 0.014 * k, pal, bone);
      for (var f = 0; f < 4; f++) {
        finger(B, X(0.012), Y(0.018 - f * 0.030), Z((0.020 - f * 0.013) * side), 0.013 * k,
               0.070 * k, 0.10, 0.62, 0.013 * k, gcol, bone);
      }
      finger(B, X(-0.006), Y(0.030), Z(-0.034 * side), 0.014 * k, 0.060 * k, -0.35, -0.40, 0.015 * k, gcol, bone);
      B.bevel(X(-0.048), X(0.020), Y(-0.008), Y(0.030), Z(-0.040), Z(0.040), 0.008 * k,
              [gcol[0] * 1.22, gcol[1] * 1.22, gcol[2] * 1.22], bone);
      B.segXY(X(-0.036), Y(-0.062), X(-0.180), Y(-0.128), z, 0.036 * k, 0.038 * k, 0.042 * k, 0.046 * k, cuff, bone);
      B.segXY(X(-0.170), Y(-0.122), X(-0.330), Y(-0.200), z, 0.038 * k, 0.036 * k, 0.046 * k, 0.042 * k, skin, bone);
    }
    void hz;
  }

  /* Hands posed for a specific weapon. */
  /* Viewmodel scale per class, mirrored from the game's viewmodel rig, so the
   * hand can be pre-scaled to cancel it out. */
  var VM_SCALE = { rifle: 0.50, pistol: 0.62, knife: 0.60, sniper: 0.45,
                   shotgun: 0.49, heavy: 0.46, smg: 0.50, grenade: 0.84 };

  Geo.buildHands = function (weaponId, gloveId, skinTone) {
    var gl = Geo.GLOVES[gloveId] || Geo.GLOVES.default;
    var skin = skinTone || [0.78, 0.62, 0.48];
    var B = new Geo.Builder('skin');
    var w = W.get(weaponId);
    var cls = w ? w.cls : 'rifle';
    var grip = GRIP_OVERRIDE[weaponId] || GRIPS[cls] || GRIPS.rifle;
    var k = 0.50 / (VM_SCALE[cls] || 0.50);

    if (grip.wrap) {
      hand(B, { x: -0.030, y: -0.055, z: 0, glove: gl.col, skin: skin, style: 'grip', side: 1, k: k });
      return B.result();
    }
    hand(B, { x: grip.right[0], y: grip.right[1], z: grip.right[2], glove: gl.col, skin: skin,
              style: 'grip', side: 1, k: k });
    if (grip.left) {
      hand(B, {
        x: grip.left[0], y: grip.left[1], z: grip.left[2], glove: gl.col, skin: skin,
        style: grip.leftStyle === 'mirror' ? 'grip' : grip.leftStyle, side: -1, k: k
      });
    }
    return B.result();
  };
  Geo.GRIPS = GRIPS;

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
