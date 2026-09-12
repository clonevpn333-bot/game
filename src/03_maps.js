/* =============================================================
 * BREACHPOINT — map definitions
 *
 * Geometry is axis-aligned boxes. That keeps collision exact and
 * cheap (important on low-end laptops) and gives the blocky,
 * readable sightlines a competitive shooter needs.
 *
 * Builder conventions:
 *   X = east(+) / west(-)      Z = south(+) / north(-)      Y = up
 *   Attackers spawn south, defenders spawn north.
 * ============================================================= */
(function (root) {
  'use strict';
  var CS = (root.CS = root.CS || {});
  var C = CS.C;

  var MAPS = {};

  /* ------------------------------------------------------------------
   * Builder
   * ---------------------------------------------------------------- */
  function Builder() {
    this.boxes = [];
    this.props = [];
    this.waypoints = [];
  }

  /* Raw box: explicit min/max on each axis. */
  Builder.prototype.box = function (x0, x1, y0, y1, z0, z1, mat, opts) {
    var b = {
      min: { x: Math.min(x0, x1), y: Math.min(y0, y1), z: Math.min(z0, z1) },
      max: { x: Math.max(x0, x1), y: Math.max(y0, y1), z: Math.max(z0, z1) },
      mat: mat || 'concrete'
    };
    if (opts) for (var k in opts) b[k] = opts[k];
    this.boxes.push(b);
    return b;
  };

  Builder.prototype.floor = function (x0, x1, z0, z1, y, mat, opts) {
    return this.box(x0, x1, y - 0.5, y, z0, z1, mat || 'concrete', opts);
  };

  /* Wall running along Z (a north-south wall) at x = X.
   * gaps: array of [z0, z1] (full height) or [z0, z1, headHeight] (doorway/arch). */
  Builder.prototype.wallZ = function (X, z0, z1, gaps, y0, y1, thick, mat, opts) {
    thick = thick || 0.5;
    var self = this;
    var xa = X - thick / 2, xb = X + thick / 2;
    emitSegments(z0, z1, gaps, function (a, b) {
      self.box(xa, xb, y0, y1, a, b, mat, opts);
    }, function (a, b, head) {
      if (head < y1) self.box(xa, xb, head, y1, a, b, mat, opts);   // header above the doorway
    });
    return this;
  };

  /* Wall running along X (an east-west wall) at z = Z. */
  Builder.prototype.wallX = function (Z, x0, x1, gaps, y0, y1, thick, mat, opts) {
    thick = thick || 0.5;
    var self = this;
    var za = Z - thick / 2, zb = Z + thick / 2;
    emitSegments(x0, x1, gaps, function (a, b) {
      self.box(a, b, y0, y1, za, zb, mat, opts);
    }, function (a, b, head) {
      if (head < y1) self.box(a, b, head, y1, za, zb, mat, opts);
    });
    return this;
  };

  function emitSegments(a0, a1, gaps, emitSolid, emitHeader) {
    gaps = (gaps || []).slice().sort(function (p, q) { return p[0] - q[0]; });
    var cur = a0;
    for (var i = 0; i < gaps.length; i++) {
      var g = gaps[i];
      var ga = Math.max(a0, g[0]), gb = Math.min(a1, g[1]);
      if (gb <= ga) continue;
      if (ga > cur) emitSolid(cur, ga);
      if (g.length > 2 && g[2] != null) emitHeader(ga, gb, g[2]);
      cur = gb;
    }
    if (cur < a1) emitSolid(cur, a1);
  }

  /* Box-shaped cover (crate, container, planter). */
  Builder.prototype.crate = function (cx, cz, sx, sz, y0, h, mat, opts) {
    return this.box(cx - sx / 2, cx + sx / 2, y0, y0 + h, cz - sz / 2, cz + sz / 2, mat || 'crate', opts);
  };

  /* Stair run. Rises from the (x0,z0) end toward the (x1,z1) end along `axis`.
   * Steps are emitted fine enough (<= 0.4 m rise each) that the step-up mover
   * and the navigation sampler both treat the run as continuously walkable. */
  Builder.prototype.stairs = function (x0, x1, z0, z1, y0, y1, steps, axis, mat) {
    var run = axis === 'z' ? Math.abs(z1 - z0) : Math.abs(x1 - x0);
    var rise = Math.abs(y1 - y0);
    var need = Math.max(2, Math.ceil(rise / 0.34), Math.ceil(run / 0.26));
    steps = Math.max(steps || 0, need);
    for (var i = 0; i < steps; i++) {
      var t0 = i / steps;
      var h = y0 + (y1 - y0) * ((i + 1) / steps);
      if (axis === 'z') {
        this.box(x0, x1, y0 - 0.6, h, z0 + (z1 - z0) * t0, z1, mat || 'concrete');
      } else {
        this.box(x0 + (x1 - x0) * t0, x1, y0 - 0.6, h, z0, z1, mat || 'concrete');
      }
    }
    return this;
  };

  /* Ramp — same thing, finer still, so it reads as a slope. */
  Builder.prototype.ramp = function (x0, x1, z0, z1, y0, y1, axis, mat) {
    var run = axis === 'z' ? Math.abs(z1 - z0) : Math.abs(x1 - x0);
    return this.stairs(x0, x1, z0, z1, y0, y1, Math.max(6, Math.ceil(run / 0.22)), axis, mat);
  };

  Builder.prototype.prop = function (type, x, y, z, ry, scale, color) {
    this.props.push({ type: type, x: x, y: y, z: z, ry: ry || 0, s: scale || 1, color: color });
    return this;
  };

  Builder.prototype.wp = function (x, y, z, tags) {
    this.waypoints.push({ x: x, y: y, z: z, tags: tags || [] });
    return this;
  };

  /* Perimeter wall + sky box floor. */
  Builder.prototype.arena = function (x0, x1, z0, z1, h, mat) {
    var t = 1.0;
    this.box(x0 - t, x0, -1, h, z0 - t, z1 + t, mat);
    this.box(x1, x1 + t, -1, h, z0 - t, z1 + t, mat);
    this.box(x0 - t, x1 + t, -1, h, z0 - t, z0, mat);
    this.box(x0 - t, x1 + t, -1, h, z1, z1 + t, mat);
    return this;
  };

  function makeMap(cfg, build) {
    var b = new Builder();
    build(b);
    return {
      id: cfg.id,
      name: cfg.name,
      author: cfg.author || 'Breachpoint',
      desc: cfg.desc,
      bounds: cfg.bounds,
      env: cfg.env,
      sites: cfg.sites,
      spawns: cfg.spawns,
      buyZones: cfg.buyZones,
      dmSpawns: cfg.dmSpawns || null,
      boxes: b.boxes,
      props: b.props,
      waypoints: b.waypoints,
      callouts: cfg.callouts || []
    };
  }

  /* ==================================================================
   * MAP 1 — BAZAAR
   * Sun-baked market town. Long east lane, tight west tunnels,
   * contested mid with a door choke. The classic three-lane shape.
   * ================================================================== */
  MAPS.bazaar = makeMap({
    id: 'bazaar',
    name: 'Bazaar',
    desc: 'Sandstone market. Long A lane, tunnel B, mid doors.',
    bounds: { x0: -40, x1: 40, z0: -40, z1: 40 },
    env: {
      sky: ['#8fc3e8', '#dfe7ec'], sun: { x: -0.45, y: 0.78, z: 0.44 },
      sunColor: '#fff3d6', sunIntensity: 1.05, ambient: '#8aa0bb', ambientIntensity: 0.62,
      fog: '#cfd8de', fogNear: 60, fogFar: 200, ground: '#c9b48d'
    },
    sites: [
      { name: 'A', min: { x: 15, y: 0, z: -9 }, max: { x: 31, y: 4, z: 5 }, center: { x: 23, y: 0, z: -2 } },
      { name: 'B', min: { x: -31, y: 0, z: -7 }, max: { x: -15, y: 4, z: 7 }, center: { x: -23, y: 0, z: 0 } }
    ],
    spawns: {
      1: [ // attackers, south
        { x: -6, y: 0.1, z: 31, yaw: Math.PI / 2 }, { x: -3, y: 0.1, z: 32.5, yaw: Math.PI / 2 },
        { x: 0, y: 0.1, z: 31, yaw: Math.PI / 2 }, { x: 3, y: 0.1, z: 32.5, yaw: Math.PI / 2 },
        { x: 6, y: 0.1, z: 31, yaw: Math.PI / 2 }, { x: -8, y: 0.1, z: 33.5, yaw: Math.PI / 2 },
        { x: 8, y: 0.1, z: 33.5, yaw: Math.PI / 2 }, { x: 0, y: 0.1, z: 34.5, yaw: Math.PI / 2 },
        { x: -4, y: 0.1, z: 35.5, yaw: Math.PI / 2 }, { x: 4, y: 0.1, z: 35.5, yaw: Math.PI / 2 }
      ],
      2: [ // defenders, north
        { x: -6, y: 0.1, z: -31, yaw: -Math.PI / 2 }, { x: -3, y: 0.1, z: -32.5, yaw: -Math.PI / 2 },
        { x: 0, y: 0.1, z: -31, yaw: -Math.PI / 2 }, { x: 3, y: 0.1, z: -32.5, yaw: -Math.PI / 2 },
        { x: 6, y: 0.1, z: -31, yaw: -Math.PI / 2 }, { x: -8, y: 0.1, z: -34, yaw: -Math.PI / 2 },
        { x: 8, y: 0.1, z: -34, yaw: -Math.PI / 2 }, { x: 0, y: 0.1, z: -35, yaw: -Math.PI / 2 },
        { x: -4, y: 0.1, z: -36, yaw: -Math.PI / 2 }, { x: 4, y: 0.1, z: -36, yaw: -Math.PI / 2 }
      ]
    },
    buyZones: [
      { team: 1, min: { x: -14, y: -2, z: 24 }, max: { x: 14, y: 8, z: 38 } },
      { team: 2, min: { x: -14, y: -2, z: -38 }, max: { x: 14, y: 8, z: -24 } }
    ],
    callouts: [
      { name: 'A Site', x: 23, z: -2 }, { name: 'Long', x: 22, z: 16 },
      { name: 'Palace', x: 15, z: -17 }, { name: 'Connector', x: 10, z: -4 },
      { name: 'Mid', x: 0, z: 2 }, { name: 'Doors', x: 0, z: -1 },
      { name: 'B Site', x: -23, z: 0 }, { name: 'Tunnels', x: -24, z: 16 },
      { name: 'Window', x: -10, z: -3 }, { name: 'Ramp', x: -20, z: -15 },
      { name: 'T Spawn', x: 0, z: 32 }, { name: 'CT Spawn', x: 0, z: -32 }
    ]
  }, function (b) {
    var H = 6.0;   // wall height
    var S = 'sand', ST = 'concrete', W = 'wood';

    /* ---- ground ---- */
    b.floor(-40, 40, -40, 40, 0, S);
    b.arena(-38, 38, -38, 38, H + 3, ST);

    /* ---- attacker spawn plaza (south) ---- */
    b.wallX(24, -40, 40, [[-9, 9, 3.2], [12, 26], [-26, -12]], 0, H, 0.6, ST);
    b.crate(-11, 29, 2, 2, 0, 1.2, 'crate');
    b.crate(11, 29, 2, 2, 0, 1.2, 'crate');
    b.prop('palm', -14, 0, 30, 0, 1.1);
    b.prop('palm', 14, 0, 30, 0, 1.0);

    /* ---- defender spawn plaza (north) ---- */
    b.wallX(-24, -40, 40, [[-9, 9, 3.2], [12, 24], [-24, -12]], 0, H, 0.6, ST);
    b.crate(-11, -29, 2, 2, 0, 1.2, 'crate');
    b.crate(11, -29, 2, 2, 0, 1.2, 'crate');
    b.prop('palm', -14, 0, -30, 0, 1.0);
    b.prop('palm', 14, 0, -30, 0, 1.1);

    /* ---- mid corridor: walls at x = ±6 ---- */
    b.wallZ(6, -24, 24, [[-6, -1, 3.0]], 0, H, 0.6, ST);       // connector to A
    b.wallZ(-6, -24, 24, [[-4, 1, 3.0]], 0, H, 0.6, ST);       // window to B
    // mid doors — a waist-height choke you can smoke off
    b.wallX(0, -6, 6, [[-1.8, 1.8, 2.6]], 0, H, 0.5, W, { pen: 'wood' });
    b.crate(-3.4, 8, 1.6, 1.6, 0, 1.1, 'crate');
    b.crate(3.4, 12, 1.6, 1.6, 0, 1.1, 'crate');
    b.crate(0, -8, 2.6, 2.6, 0, 2.3, 'crate');   // breaks the spawn-to-spawn sightline

    /* ---- LONG (east lane, attacker side) ---- */
    b.wallZ(14, 6, 24, [], 0, H, 0.6, ST);                      // separates long from mid area
    b.wallZ(30, 4, 24, [], 0, H, 0.6, ST);
    b.wallX(6, 14, 30, [[17, 25, 3.4]], 0, H, 0.6, ST);         // long doors into A
    b.crate(20, 20, 2.4, 2.4, 0, 1.5, 'crate');
    b.crate(26, 14, 2.4, 2.4, 0, 1.5, 'crate');
    b.crate(26, 16.6, 2.4, 2.4, 0, 1.5, 'crate');
    b.crate(17, 10, 2.0, 2.0, 0, 1.2, 'crate');

    /* ---- A SITE (east) ---- */
    b.wallZ(32, -22, 6, [], 0, H, 0.6, ST);                     // east boundary
    b.wallX(-9, 15, 32, [[16, 22]], 0, H, 0.6, ST);             // north wall, open palace exit
    b.wallZ(14, -9, -1, [], 0, H, 0.6, ST);                     // west wall (connector opening below)
    b.wallZ(14, 1, 6, [], 0, H, 0.6, ST);
    // site cover
    b.crate(20, -1, 2.6, 2.6, 0, 1.6, 'crate');
    b.crate(20, 1.8, 2.6, 2.6, 0, 1.6, 'crate');
    b.crate(20, -1, 2.6, 2.6, 1.6, 1.4, 'crate');               // stacked — a boost / off-angle
    b.crate(27, -5, 3.0, 3.0, 0, 1.3, 'crate');
    b.crate(24.5, 3.5, 2.0, 2.0, 0, 1.0, 'crate');
    b.box(29, 32, 0, 2.2, -9, -3, 'concrete');                  // ninja corner platform
    b.stairs(28.6, 32, 1.6, -3, 0, 2.2, 0, 'z', ST);

    /* ---- PALACE (elevated defender approach to A) ---- */
    b.box(14, 22, 0, 2.6, -22, -9.0, 'tile');                   // raised platform
    b.stairs(15, 21, -27.6, -22, 0, 2.6, 0, 'z', 'tile');
    b.wallZ(22, -24, -9.4, [], 2.6, H + 1, 0.6, ST);
    b.wallZ(14, -24, -9.4, [], 2.6, H + 1, 0.6, ST);
    b.prop('arch', 18, 2.6, -10, 0, 1.6);

    /* ---- CONNECTOR (mid -> A) ---- */
    b.wallX(-6, 6, 14, [], 0, H, 0.5, ST);
    b.wallX(-1, 6, 14, [], 0, H, 0.5, ST);
    b.crate(10.5, -3.5, 1.4, 1.4, 0, 1.0, 'crate');

    /* ---- TUNNELS (west lane, attacker side) ---- */
    b.wallZ(-14, 8, 24, [], 0, H, 0.6, ST);
    b.wallZ(-30, 8, 24, [], 0, H, 0.6, ST);
    b.wallX(8, -30, -14, [[-27, -19, 3.2]], 0, H, 0.6, ST);     // tunnel mouth into B
    b.box(-30, -14, 4.6, 5.4, 8, 24, 'concrete');               // tunnel ceiling — tight, dark
    b.crate(-18, 20, 2.2, 2.2, 0, 1.3, 'crate');
    b.crate(-26, 12, 2.2, 2.2, 0, 1.3, 'crate');

    /* ---- B SITE (west) ---- */
    b.wallZ(-32, -22, 8, [], 0, H, 0.6, ST);
    b.wallX(-7, -32, -14, [[-25, -17, 3.4]], 0, H, 0.6, ST);    // ramp entrance from CT
    b.wallZ(-14, -7, -4.5, [], 0, H, 0.6, ST);
    b.wallZ(-14, 1.5, 8, [], 0, H, 0.6, ST);
    // site cover
    b.crate(-21, -1, 2.6, 2.6, 0, 1.6, 'crate');
    b.crate(-21, 1.8, 2.6, 2.6, 0, 1.6, 'crate');
    b.crate(-27, 4, 3.0, 3.0, 0, 1.4, 'crate');
    b.crate(-17.5, 4.5, 2.0, 2.0, 0, 1.1, 'crate');
    b.box(-32, -28, 0, 2.4, -7, -1, 'wood');                    // elevated back-site platform
    b.stairs(-23, -28, -6, -3.4, 0, 2.4, 0, 'x', W);
    b.prop('awning', -22, 3.0, -5, 0, 2.0);

    /* ---- B RAMP (defender rotation) ---- */
    b.box(-26, -16, 0, 1.8, -22, -7.5, 'concrete');
    b.ramp(-23, -17, -25.8, -22, 0, 1.8, 'z', ST);
    b.wallZ(-26, -24, -7, [], 1.8, H, 0.6, ST);
    b.wallZ(-16, -24, -7, [], 1.8, H, 0.6, ST);

    /* ---- decorative market props ---- */
    b.prop('stall', -10, 0, 14, 0.3, 1);
    b.prop('stall', 9, 0, -14, -0.4, 1);
    b.prop('barrel', 4.6, 0, 5, 0, 1);
    b.prop('barrel', -4.6, 0, -6, 0, 1);
    b.prop('lamp', 0, 0, 18, 0, 1);
    b.prop('lamp', 0, 0, -18, 0, 1);

    /* ---- bot navigation waypoints ---- */
    // spawns
    b.wp(0, 0, 30, ['spawn_att']); b.wp(-8, 0, 28, ['spawn_att']); b.wp(8, 0, 28, ['spawn_att']);
    b.wp(0, 0, -30, ['spawn_def']); b.wp(-8, 0, -28, ['spawn_def']); b.wp(8, 0, -28, ['spawn_def']);
    // mid
    b.wp(0, 0, 20, ['mid']); b.wp(0, 0, 12, ['mid']); b.wp(0, 0, 5, ['mid', 'choke']);
    b.wp(0, 0, -5, ['mid', 'choke']); b.wp(0, 0, -12, ['mid']); b.wp(0, 0, -20, ['mid']);
    // long / A
    b.wp(18, 0, 22, ['long']); b.wp(22, 0, 17, ['long']); b.wp(22, 0, 9, ['long', 'choke']);
    b.wp(22, 0, 3, ['site_a']); b.wp(19, 0, -4, ['site_a', 'plant_a']); b.wp(26, 0, -1, ['site_a', 'plant_a']);
    b.wp(28, 0, -6, ['site_a', 'hold_a']); b.wp(24, 0, -7, ['site_a']);
    b.wp(18, 2.6, -12, ['palace', 'hold_a']); b.wp(18, 2.6, -18, ['palace']);
    b.wp(18, 0, -22, ['rot_a']); b.wp(12, 0, -26, ['rot_a']);
    b.wp(10, 0, -3.5, ['connector']); b.wp(10, 0, -8, ['connector']);
    // tunnels / B
    b.wp(-18, 0, 22, ['tunnel']); b.wp(-23, 0, 17, ['tunnel']); b.wp(-23, 0, 10, ['tunnel', 'choke']);
    b.wp(-23, 0, 5, ['site_b']); b.wp(-20, 0, -2, ['site_b', 'plant_b']); b.wp(-26, 0, 1, ['site_b', 'plant_b']);
    b.wp(-29, 0, -4, ['site_b', 'hold_b']); b.wp(-17, 0, 2, ['site_b']);
    b.wp(-21, 0, -10, ['bramp', 'hold_b']); b.wp(-21, 1.8, -16, ['bramp']);
    b.wp(-21, 0, -23, ['rot_b']); b.wp(-12, 0, -26, ['rot_b']);
    b.wp(-10, 0, -2, ['window']); b.wp(-10, 0, -8, ['window']);
  });

  /* ==================================================================
   * MAP 2 — FOUNDRY
   * Steel and concrete. Vertical: catwalks over B, a high ramp to A,
   * and thin sheet-metal walls you can shoot through.
   * ================================================================== */
  MAPS.foundry = makeMap({
    id: 'foundry',
    name: 'Foundry',
    desc: 'Industrial. Catwalks, vertical angles, wallbangable sheet metal.',
    bounds: { x0: -40, x1: 40, z0: -40, z1: 40 },
    env: {
      sky: ['#4a5a6e', '#96a4b4'], sun: { x: 0.35, y: 0.7, z: -0.6 },
      sunColor: '#dbe7f5', sunIntensity: 0.85, ambient: '#6c7d92', ambientIntensity: 0.7,
      fog: '#7d8b9b', fogNear: 45, fogFar: 165, ground: '#6e6f72'
    },
    sites: [
      { name: 'A', min: { x: 14, y: 2.3, z: -10 }, max: { x: 32, y: 7, z: 6 }, center: { x: 23, y: 2.6, z: -2 } },
      { name: 'B', min: { x: -32, y: 0, z: -8 }, max: { x: -14, y: 5, z: 8 }, center: { x: -23, y: 0, z: 0 } }
    ],
    spawns: {
      1: [
        { x: -5, y: 0.1, z: 31, yaw: Math.PI / 2 }, { x: -2, y: 0.1, z: 32.5, yaw: Math.PI / 2 },
        { x: 1, y: 0.1, z: 31, yaw: Math.PI / 2 }, { x: 4, y: 0.1, z: 32.5, yaw: Math.PI / 2 },
        { x: 7, y: 0.1, z: 31, yaw: Math.PI / 2 }, { x: -8, y: 0.1, z: 33.5, yaw: Math.PI / 2 },
        { x: 10, y: 0.1, z: 33.5, yaw: Math.PI / 2 }, { x: 1, y: 0.1, z: 34.5, yaw: Math.PI / 2 },
        { x: -4, y: 0.1, z: 35.5, yaw: Math.PI / 2 }, { x: 6, y: 0.1, z: 35.5, yaw: Math.PI / 2 }
      ],
      2: [
        { x: -5, y: 0.1, z: -31, yaw: -Math.PI / 2 }, { x: -2, y: 0.1, z: -32.5, yaw: -Math.PI / 2 },
        { x: 1, y: 0.1, z: -31, yaw: -Math.PI / 2 }, { x: 4, y: 0.1, z: -32.5, yaw: -Math.PI / 2 },
        { x: 7, y: 0.1, z: -31, yaw: -Math.PI / 2 }, { x: -8, y: 0.1, z: -34, yaw: -Math.PI / 2 },
        { x: 10, y: 0.1, z: -34, yaw: -Math.PI / 2 }, { x: 1, y: 0.1, z: -35, yaw: -Math.PI / 2 },
        { x: -4, y: 0.1, z: -36, yaw: -Math.PI / 2 }, { x: 6, y: 0.1, z: -36, yaw: -Math.PI / 2 }
      ]
    },
    buyZones: [
      { team: 1, min: { x: -14, y: -2, z: 25 }, max: { x: 14, y: 8, z: 38 } },
      { team: 2, min: { x: -14, y: -2, z: -38 }, max: { x: 14, y: 8, z: -25 } }
    ],
    callouts: [
      { name: 'A Platform', x: 23, z: -2 }, { name: 'Heaven', x: 27, z: -14 },
      { name: 'Ramp', x: 17, z: 12 }, { name: 'Silo', x: 0, z: 0 },
      { name: 'Catwalk', x: -18, z: -14 }, { name: 'B Floor', x: -23, z: 0 },
      { name: 'Vents', x: -10, z: 14 }, { name: 'Squeaky', x: 9, z: -8 }
    ]
  }, function (b) {
    var H = 7.0, MT = 'metal', CO = 'concrete', SH = 'wood';  // SH = thin sheeting, easy to wallbang

    b.floor(-40, 40, -40, 40, 0, CO);
    b.arena(-38, 38, -38, 38, H + 4, CO);

    /* spawn halls */
    b.wallX(25, -38, 38, [[-10, 10, 3.4], [14, 24], [-24, -14]], 0, H, 0.7, CO);
    b.wallX(-25, -38, 38, [[-10, 10, 3.4], [14, 31], [-31, -14]], 0, H, 0.7, CO);
    b.crate(-12, 30, 2.4, 2.4, 0, 1.4, 'steel');
    b.crate(12, -30, 2.4, 2.4, 0, 1.4, 'steel');

    /* ---- SILO MID: a circular-ish core of tanks you rotate around ---- */
    b.crate(0, 0, 7, 7, 0, 4.2, 'steel');
    b.crate(0, -7.5, 4, 4, 0, 3.0, 'steel');
    b.crate(0, 7.5, 4, 4, 0, 3.0, 'steel');
    b.crate(-6, 4, 2.2, 2.2, 0, 1.3, 'crate');
    b.crate(6, -4, 2.2, 2.2, 0, 1.3, 'crate');
    b.prop('pipe', 0, 4.2, 0, 0, 2.2);

    /* mid lanes either side of the silo */
    b.wallZ(11, -25, 25, [[-16, -9, 3.2], [9, 16, 3.2]], 0, H, 0.6, CO);
    b.wallZ(-11, -25, 25, [[-16, -9, 3.2], [9, 16, 3.2]], 0, H, 0.6, CO);
    // thin sheeting sections you can shoot through
    b.box(10.6, 11.4, 0, 2.6, -6, 0, SH, { pen: 'wood', thin: true });
    b.box(-11.4, -10.6, 0, 2.6, 0, 6, SH, { pen: 'wood', thin: true });

    /* ---- A SIDE: raised platform site, reached by a long ramp ---- */
    b.box(14, 32, 2.2, 2.6, -12, 8, MT);                       // the platform deck
    b.ramp(14, 20, 16, 8, 0, 2.6, 'z', MT);                    // attacker ramp up
    b.wallZ(32, -24, 16, [], 0, H + 2, 0.7, CO);
    b.wallX(8, 20, 32, [[24, 31, 3.4]], 0, H + 2, 0.6, CO);
    b.wallZ(14, -12, 6, [[-12, -7, 3.0]], 2.6, H + 2, 0.6, CO);
    b.wallX(-12, 14, 32, [[14.6, 19.4], [22, 30, 3.2]], 0, H + 2, 0.6, CO);
    b.stairs(15, 19, -19.2, -12.2, 0, 2.6, 0, 'z', MT);        // defender stairs onto the deck
    // site cover on the deck
    b.crate(20, -2, 2.6, 2.6, 2.6, 1.5, 'crate');
    b.crate(20, 0.8, 2.6, 2.6, 2.6, 1.5, 'crate');
    b.crate(27, 4, 3.0, 3.0, 2.6, 1.4, 'steel');
    b.crate(24, -8, 2.2, 2.2, 2.6, 1.2, 'crate');
    // HEAVEN: a defender balcony overlooking the A deck
    b.box(24, 32, 4.0, 4.4, -22, -12, MT);
    b.stairs(25.5, 30.5, -31.4, -22, 0, 4.4, 0, 'z', MT);
    b.wallZ(24, -22, -12, [], 4.4, H + 3, 0.4, MT);
    b.box(24, 32, 4.4, 5.4, -12.4, -12, MT, { railing: true });

    /* ---- B SIDE: open floor with an overhead catwalk ---- */
    b.wallZ(-32, -24, 16, [], 0, H, 0.7, CO);
    b.wallX(8, -32, -20, [[-30, -23, 3.4]], 0, H, 0.6, CO);
    b.wallX(-8, -32, -14, [[-28, -21, 3.2]], 0, H, 0.6, CO);
    b.wallZ(-14, -8, 8, [[-2, 5, 3.0]], 0, H, 0.6, CO);
    b.crate(-21, -2, 2.6, 2.6, 0, 1.6, 'crate');
    b.crate(-21, 0.8, 2.6, 2.6, 0, 1.6, 'crate');
    b.crate(-28, 4, 3.0, 3.0, 0, 1.5, 'steel');
    b.crate(-17, 5, 2.0, 2.0, 0, 1.1, 'crate');
    // catwalk above B — reachable from the defender side, deadly angle down
    b.box(-30, -14, 3.1, 3.4, -16, -12, MT);
    b.box(-18, -14, 3.1, 3.4, -12, 4, MT);
    b.stairs(-21, -16, -23.6, -16.2, 0, 3.4, 0, 'z', MT);
    b.box(-30, -14, 3.4, 4.4, -16.4, -16, MT, { railing: true });
    b.box(-14.4, -14, 3.4, 4.4, -12, 4, MT, { railing: true });

    /* ---- VENTS: a low, quiet flank from the attacker side into B ---- */
    b.box(-15, -9, 2.15, 2.5, 11, 21, MT);                     // low ceiling — you hear every step
    b.wallZ(-9, 11, 21, [[13, 18, 2.1]], 0, 2.5, 0.4, MT, { pen: 'metal' });
    b.wallZ(-15, 11, 21, [[12, 17, 2.1]], 0, 2.5, 0.4, MT, { pen: 'metal' });
    b.wallX(21, -15, -9, [[-14, -10, 2.1]], 0, 2.5, 0.4, MT);

    b.prop('crane', 0, 0, -20, 0, 1);
    b.prop('pipe', -26, 0, 12, 1.57, 1.5);
    b.prop('pipe', 26, 0, -26, 0.6, 1.5);

    /* waypoints */
    b.wp(0, 0, 31, ['spawn_att']); b.wp(-8, 0, 29, ['spawn_att']); b.wp(8, 0, 29, ['spawn_att']);
    b.wp(0, 0, -31, ['spawn_def']); b.wp(-8, 0, -29, ['spawn_def']); b.wp(8, 0, -29, ['spawn_def']);
    b.wp(0, 0, 20, ['mid']); b.wp(7, 0, 12, ['mid']); b.wp(-7, 0, 12, ['mid']);
    b.wp(8, 0, 0, ['mid', 'choke']); b.wp(-8, 0, 0, ['mid', 'choke']);
    b.wp(7, 0, -12, ['mid']); b.wp(-7, 0, -12, ['mid']); b.wp(0, 0, -20, ['mid']);
    b.wp(17, 0, 18, ['ramp_a']); b.wp(17, 1.4, 12, ['ramp_a']); b.wp(17, 2.6, 6, ['ramp_a', 'choke']);
    b.wp(20, 2.6, 0, ['site_a', 'plant_a']); b.wp(26, 2.6, 1, ['site_a', 'plant_a']);
    b.wp(29, 2.6, -6, ['site_a', 'hold_a']); b.wp(17, 2.6, -9, ['site_a']);
    b.wp(28, 4.4, -16, ['heaven', 'hold_a']); b.wp(25, 2.0, -22, ['rot_a']); b.wp(14, 0, -28, ['rot_a']);
    b.wp(-12, 0, 19, ['vents']); b.wp(-12, 0, 13, ['vents']);
    b.wp(-24, 0, 20, ['tunnel_b']); b.wp(-26, 0, 12, ['tunnel_b', 'choke']);
    b.wp(-24, 0, 4, ['site_b']); b.wp(-20, 0, -1, ['site_b', 'plant_b']); b.wp(-27, 0, 1, ['site_b', 'plant_b']);
    b.wp(-29, 0, -5, ['site_b', 'hold_b']); b.wp(-16, 0, 2, ['site_b']);
    b.wp(-16, 3.4, -6, ['catwalk', 'hold_b']); b.wp(-22, 3.4, -14, ['catwalk']);
    b.wp(-24, 0, -20, ['rot_b']); b.wp(-14, 0, -28, ['rot_b']);
  });

  /* ==================================================================
   * MAP 3 — VILLA
   * Mediterranean courtyard. Short rotations, brutal close angles,
   * a balcony over the A plaza and a wine-cellar route to B.
   * ================================================================== */
  MAPS.villa = makeMap({
    id: 'villa',
    name: 'Villa',
    desc: 'Close-quarters courtyards. Short rotations, balcony angles.',
    bounds: { x0: -34, x1: 34, z0: -34, z1: 34 },
    env: {
      sky: ['#79b4e0', '#f0e2c8'], sun: { x: 0.6, y: 0.72, z: 0.35 },
      sunColor: '#ffe9bf', sunIntensity: 1.1, ambient: '#9c8f78', ambientIntensity: 0.66,
      fog: '#e2d6bd', fogNear: 45, fogFar: 150, ground: '#a8865e'
    },
    sites: [
      { name: 'A', min: { x: 12, y: 0, z: -10 }, max: { x: 28, y: 5, z: 4 }, center: { x: 20, y: 0, z: -3 } },
      { name: 'B', min: { x: -28, y: 0, z: -6 }, max: { x: -12, y: 5, z: 8 }, center: { x: -20, y: 0, z: 1 } }
    ],
    spawns: {
      1: [
        { x: -5, y: 0.1, z: 27, yaw: Math.PI / 2 }, { x: -2, y: 0.1, z: 28.5, yaw: Math.PI / 2 },
        { x: 1, y: 0.1, z: 27, yaw: Math.PI / 2 }, { x: 4, y: 0.1, z: 28.5, yaw: Math.PI / 2 },
        { x: 7, y: 0.1, z: 27, yaw: Math.PI / 2 }, { x: -8, y: 0.1, z: 29.5, yaw: Math.PI / 2 },
        { x: 10, y: 0.1, z: 29.5, yaw: Math.PI / 2 }, { x: 1, y: 0.1, z: 30.5, yaw: Math.PI / 2 },
        { x: -4, y: 0.1, z: 31.5, yaw: Math.PI / 2 }, { x: 6, y: 0.1, z: 31.5, yaw: Math.PI / 2 }
      ],
      2: [
        { x: -5, y: 0.1, z: -27, yaw: -Math.PI / 2 }, { x: -2, y: 0.1, z: -28.5, yaw: -Math.PI / 2 },
        { x: 1, y: 0.1, z: -27, yaw: -Math.PI / 2 }, { x: 4, y: 0.1, z: -28.5, yaw: -Math.PI / 2 },
        { x: 7, y: 0.1, z: -27, yaw: -Math.PI / 2 }, { x: -8, y: 0.1, z: -29.5, yaw: -Math.PI / 2 },
        { x: 10, y: 0.1, z: -29.5, yaw: -Math.PI / 2 }, { x: 1, y: 0.1, z: -30.5, yaw: -Math.PI / 2 },
        { x: -4, y: 0.1, z: -31.5, yaw: -Math.PI / 2 }, { x: 6, y: 0.1, z: -31.5, yaw: -Math.PI / 2 }
      ]
    },
    buyZones: [
      { team: 1, min: { x: -13, y: -2, z: 22 }, max: { x: 13, y: 8, z: 33 } },
      { team: 2, min: { x: -13, y: -2, z: -33 }, max: { x: 13, y: 8, z: -22 } }
    ],
    callouts: [
      { name: 'A Plaza', x: 20, z: -3 }, { name: 'Balcony', x: 24, z: -13 },
      { name: 'Arch', x: 13, z: 9 }, { name: 'Courtyard', x: 0, z: 0 },
      { name: 'Cellar', x: -9, z: 12 }, { name: 'B Garden', x: -20, z: 1 },
      { name: 'Library', x: -20, z: -12 }
    ]
  }, function (b) {
    var H = 5.5, ST = 'concrete', TI = 'tile', WD = 'wood';

    b.floor(-34, 34, -34, 34, 0, TI);
    b.arena(-32, 32, -32, 32, H + 3, ST);

    b.wallX(22, -32, 32, [[-9, 9, 3.0], [12, 22], [-22, -11]], 0, H, 0.6, ST);
    b.wallX(-22, -32, 32, [[-9, 9, 3.0], [12, 22], [-22, -12]], 0, H, 0.6, ST);

    /* ---- COURTYARD (mid) — a fountain with four approaches ---- */
    b.crate(0, 0, 5, 5, 0, 1.1, 'concrete');
    b.crate(0, 0, 3, 3, 1.1, 0.5, 'concrete');
    b.prop('fountain', 0, 1.6, 0, 0, 1);
    b.wallZ(9, -22, 22, [[-6, -1, 2.9], [4, 10, 2.9]], 0, H, 0.6, ST);
    b.wallZ(-9, -22, 22, [[-3, 2, 2.9], [6, 12, 2.9]], 0, H, 0.6, ST);
    b.crate(-5, 8, 1.8, 1.8, 0, 1.1, 'crate');
    b.crate(5, -8, 1.8, 1.8, 0, 1.1, 'crate');
    b.prop('tree', -6, 0, -6, 0, 1.2);
    b.prop('tree', 6, 0, 6, 0, 1.1);

    /* ---- A PLAZA (east) ---- */
    b.wallZ(29, -20, 8, [], 0, H + 1, 0.6, ST);
    b.wallX(-10, 12, 29, [[20, 27, 3.2]], 0, H + 1, 0.6, ST);
    b.wallX(4, 12, 29, [[13, 19, 3.2]], 0, H, 0.6, ST);      // arch entrance from attacker side
    b.wallZ(12, -10, -0.5, [], 0, H, 0.6, ST);
    b.wallZ(12, 2.5, 4, [], 0, H, 0.6, ST);
    b.crate(18, -2, 2.4, 2.4, 0, 1.5, 'crate');
    b.crate(18, 0.4, 2.4, 2.4, 0, 1.5, 'crate');
    b.crate(25, -7, 2.6, 2.6, 0, 1.3, 'crate');
    b.crate(22, 2, 2.0, 2.0, 0, 1.0, 'crate');
    // BALCONY over A — defender power position, reached from their side
    b.box(20, 29, 2.8, 3.1, -20, -10, WD);
    b.stairs(23, 27, -26.4, -20.2, 0, 3.1, 0, 'z', WD);
    b.box(20, 29, 3.1, 4.1, -10.4, -10, WD, { railing: true });
    b.wallZ(20, -20, -10, [], 3.1, H + 1, 0.5, ST);
    b.prop('awning', 22, 3.3, -12, 0, 1.6);

    /* ---- B GARDEN (west) ---- */
    b.wallZ(-29, -18, 10, [], 0, H + 1, 0.6, ST);
    b.wallX(-8, -29, -12, [[-27, -20, 3.2]], 0, H + 1, 0.6, ST);
    b.wallX(8, -29, -12, [[-26, -19, 3.2]], 0, H, 0.6, ST);
    b.wallZ(-12, -6, 1, [], 0, H, 0.6, ST);
    b.wallZ(-12, 3.5, 8, [], 0, H, 0.6, ST);
    b.crate(-18, 0, 2.4, 2.4, 0, 1.5, 'crate');
    b.crate(-18, 2.4, 2.4, 2.4, 0, 1.5, 'crate');
    b.crate(-25, 5, 2.6, 2.6, 0, 1.4, 'crate');
    b.crate(-22, -4, 2.0, 2.0, 0, 1.0, 'crate');
    b.prop('tree', -27, 0, -3, 0, 1.3);
    // LIBRARY — raised defender room covering B
    b.box(-28, -16, 2.2, 2.6, -20, -9, WD);
    b.stairs(-10.6, -16, -19, -15.5, 0, 2.6, 0, 'x', WD);
    b.wallZ(-16, -20, -9, [[-16, -11, 2.0]], 2.6, H + 1, 0.5, ST);
    b.box(-28, -16, 2.6, 3.6, -9.4, -9, WD, { railing: true });

    /* ---- CELLAR — a low, dark flank from attacker side to B ---- */
    b.box(-16, -10, 2.15, 2.45, 8, 19, WD);                     // low cellar ceiling
    b.wallZ(-10, 8, 19, [[10, 15, 2.05]], 0, 2.45, 0.4, WD, { pen: 'wood' });
    b.wallZ(-16, 8, 19, [[9, 14, 2.05]], 0, 2.45, 0.4, WD, { pen: 'wood' });
    b.wallX(19, -16, -10, [[-15, -11, 2.05]], 0, 2.45, 0.4, WD);

    b.prop('planter', 11, 0, 14, 0, 1);
    b.prop('planter', -11, 0, -14, 0, 1);
    b.prop('lamp', 0, 0, 16, 0, 1);
    b.prop('lamp', 0, 0, -16, 0, 1);

    b.wp(0, 0, 27, ['spawn_att']); b.wp(-8, 0, 25, ['spawn_att']); b.wp(8, 0, 25, ['spawn_att']);
    b.wp(0, 0, -27, ['spawn_def']); b.wp(-8, 0, -25, ['spawn_def']); b.wp(8, 0, -25, ['spawn_def']);
    b.wp(0, 0, 16, ['mid']); b.wp(6, 0, 8, ['mid']); b.wp(-6, 0, 8, ['mid']);
    b.wp(6, 0, -8, ['mid']); b.wp(-6, 0, -8, ['mid']); b.wp(0, 0, -16, ['mid']);
    b.wp(15, 0, 16, ['arch_a']); b.wp(16, 0, 7, ['arch_a', 'choke']);
    b.wp(18, 0, 1, ['site_a', 'plant_a']); b.wp(24, 0, -3, ['site_a', 'plant_a']);
    b.wp(27, 0, -8, ['site_a', 'hold_a']); b.wp(14, 0, -6, ['site_a']);
    b.wp(24, 3.1, -14, ['balcony', 'hold_a']); b.wp(28, 0, -22, ['rot_a']); b.wp(12, 0, -25, ['rot_a']);
    b.wp(-15, 0, 16, ['arch_b']); b.wp(-16, 0, 9, ['arch_b', 'choke']);
    b.wp(-13, 0, 16, ['cellar']); b.wp(-13, 0, 9, ['cellar']);
    b.wp(-18, 0, 5, ['site_b', 'plant_b']); b.wp(-24, 0, 1, ['site_b', 'plant_b']);
    b.wp(-27, 0, -4, ['site_b', 'hold_b']); b.wp(-14, 0, -2, ['site_b']);
    b.wp(-22, 2.6, -13, ['library', 'hold_b']); b.wp(-26, 0, -21, ['rot_b']); b.wp(-12, 0, -25, ['rot_b']);
  });

  /* ==================================================================
   * MAP 4 — ARENA (aim training / deathmatch)
   * ================================================================== */
  MAPS.arena = makeMap({
    id: 'arena',
    name: 'Arena',
    desc: 'Training range. Pop-up targets, open duel floor.',
    bounds: { x0: -26, x1: 26, z0: -26, z1: 26 },
    env: {
      sky: ['#1d2733', '#3c4a5c'], sun: { x: 0.2, y: 0.9, z: 0.3 },
      sunColor: '#ffffff', sunIntensity: 0.8, ambient: '#5f6d80', ambientIntensity: 0.9,
      fog: '#2a3441', fogNear: 40, fogFar: 130, ground: '#3a4350'
    },
    sites: [],
    spawns: {
      1: [{ x: 0, y: 0.1, z: 18, yaw: Math.PI / 2 }, { x: -6, y: 0.1, z: 18, yaw: Math.PI / 2 },
          { x: 6, y: 0.1, z: 18, yaw: Math.PI / 2 }, { x: -12, y: 0.1, z: 16, yaw: Math.PI / 2 },
          { x: 12, y: 0.1, z: 16, yaw: Math.PI / 2 }],
      2: [{ x: 0, y: 0.1, z: -18, yaw: -Math.PI / 2 }, { x: -6, y: 0.1, z: -18, yaw: -Math.PI / 2 },
          { x: 6, y: 0.1, z: -18, yaw: -Math.PI / 2 }, { x: -12, y: 0.1, z: -16, yaw: -Math.PI / 2 },
          { x: 12, y: 0.1, z: -16, yaw: -Math.PI / 2 }]
    },
    buyZones: [
      { team: 1, min: { x: -24, y: -2, z: -24 }, max: { x: 24, y: 10, z: 24 } },
      { team: 2, min: { x: -24, y: -2, z: -24 }, max: { x: 24, y: 10, z: 24 } }
    ],
    dmSpawns: [
      { x: 0, y: 0.1, z: 18 }, { x: 0, y: 0.1, z: -18 }, { x: 18, y: 0.1, z: 0 }, { x: -18, y: 0.1, z: 0 },
      { x: 12, y: 0.1, z: 12 }, { x: -12, y: 0.1, z: -12 }, { x: 12, y: 0.1, z: -12 }, { x: -12, y: 0.1, z: 12 },
      { x: 0, y: 2.2, z: 0 }, { x: 20, y: 0.1, z: 20 }, { x: -20, y: 0.1, z: -20 }
    ],
    callouts: [{ name: 'Range', x: 0, z: -10 }, { name: 'Pit', x: 0, z: 0 }]
  }, function (b) {
    b.floor(-26, 26, -26, 26, 0, 'tile');
    b.arena(-24, 24, -24, 24, 9, 'concrete');
    // centre platform for duels + a boost
    b.box(-4, 4, 0, 2.2, -4, 4, 'metal');
    b.stairs(-8.6, -4, -2, 2, 0, 2.2, 0, 'x', 'metal');
    b.stairs(8.6, 4, -2, 2, 0, 2.2, 0, 'x', 'metal');
    // strafe cover
    var cov = [[-14, -8], [14, -8], [-14, 8], [14, 8], [0, -14], [0, 14], [-8, 0], [8, 0]];
    for (var i = 0; i < cov.length; i++) b.crate(cov[i][0], cov[i][1], 2.4, 2.4, 0, 1.5, 'crate');
    b.crate(-20, -20, 3, 3, 0, 2.4, 'crate');
    b.crate(20, 20, 3, 3, 0, 2.4, 'crate');
    for (var j = 0; j < 8; j++) {
      var a = j / 8 * Math.PI * 2;
      b.wp(Math.cos(a) * 16, 0, Math.sin(a) * 16, ['mid']);
      b.wp(Math.cos(a) * 8, 0, Math.sin(a) * 8, ['mid']);
    }
    b.wp(0, 2.2, 0, ['mid']);
  });

  /* ------------------------------------------------------------------ */
  var MAP_ORDER = ['bazaar', 'foundry', 'villa', 'arena'];

  CS.Maps = {
    all: MAPS,
    order: MAP_ORDER,
    competitive: ['bazaar', 'foundry', 'villa'],
    get: function (id) { return MAPS[id] || MAPS.bazaar; },
    list: function () { return MAP_ORDER.map(function (k) { return MAPS[k]; }); },
    Builder: Builder
  };
})(typeof window !== 'undefined' ? window : globalThis);
