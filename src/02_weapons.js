/* =============================================================
 * BREACHPOINT — weapon catalog, spray patterns, ballistics
 * Pure data + math. Original weapon names, tactical-FPS tuning.
 * ============================================================= */
(function (root) {
  'use strict';
  var CS = (root.CS = root.CS || {});
  var M = CS.M, C = CS.C;

  var W = {};

  /* ---------------------------------------------------------------
   * Spray pattern generation.
   * Patterns are deterministic: same every match, so they are learnable.
   * Values are in degrees of view-punch applied cumulatively per shot.
   * ------------------------------------------------------------- */
  function keyLerp(keys, i) {
    if (i <= keys[0][0]) return keys[0][1];
    var last = keys[keys.length - 1];
    if (i >= last[0]) return last[1];
    for (var k = 0; k < keys.length - 1; k++) {
      var a = keys[k], b = keys[k + 1];
      if (i >= a[0] && i <= b[0]) {
        var t = (i - a[0]) / (b[0] - a[0] || 1);
        return a[1] + (b[1] - a[1]) * t;
      }
    }
    return last[1];
  }

  /* spec: { len, seed, v:[[shot,cumulativeUp]], h:[[shot,horizontal]], jitter } */
  function makePattern(spec) {
    var out = [];
    var prevV = 0, prevH = 0;
    for (var i = 0; i < spec.len; i++) {
      var v = keyLerp(spec.v, i);
      var h = keyLerp(spec.h, i);
      var jx = (M.hash01(spec.seed, i * 2 + 1) - 0.5) * (spec.jitter || 0.18);
      var jy = (M.hash01(spec.seed, i * 2 + 2) - 0.5) * (spec.jitter || 0.18) * 0.6;
      // store per-shot delta so applying is a simple accumulation
      out.push([(h + jx) - prevH, (v + jy) - prevV]);
      prevH = h + jx; prevV = v + jy;
    }
    return out;
  }

  /* Named pattern archetypes */
  var PATTERNS = {};

  PATTERNS.kr47 = makePattern({          // long, aggressive T-shaped pattern
    len: 30, seed: 1337, jitter: 0.22,
    v: [[0, 0], [1, 1.15], [3, 3.3], [6, 6.2], [9, 8.4], [12, 9.5], [16, 10.4], [22, 11.2], [29, 11.9]],
    h: [[0, 0], [3, 0.1], [6, -1.35], [9, -2.45], [11, -1.2], [14, 1.9], [17, 3.05], [20, 2.1], [23, -0.7], [26, -2.0], [29, -0.4]]
  });
  PATTERNS.ar4 = makePattern({           // tighter, faster to control
    len: 30, seed: 4242, jitter: 0.16,
    v: [[0, 0], [1, 0.95], [3, 2.7], [6, 5.0], [9, 6.8], [12, 7.8], [16, 8.5], [22, 9.1], [29, 9.6]],
    h: [[0, 0], [3, 0.05], [6, -1.0], [9, -1.75], [12, 0.4], [15, 2.1], [18, 1.5], [22, -0.9], [26, -1.6], [29, 0.2]]
  });
  PATTERNS.ar4s = makePattern({          // 20-round, very tight
    len: 20, seed: 991, jitter: 0.12,
    v: [[0, 0], [1, 0.85], [3, 2.4], [6, 4.4], [9, 5.9], [13, 6.9], [19, 7.6]],
    h: [[0, 0], [3, 0.0], [6, -0.85], [9, -1.4], [12, 0.5], [15, 1.7], [19, 0.6]]
  });
  PATTERNS.nomad = makePattern({
    len: 35, seed: 777, jitter: 0.26,
    v: [[0, 0], [1, 1.1], [3, 3.1], [6, 5.8], [9, 7.9], [13, 9.2], [20, 10.5], [34, 11.8]],
    h: [[0, 0], [3, 0.2], [7, -1.9], [10, -2.9], [13, 0.2], [17, 2.7], [21, 3.4], [26, 0.9], [30, -1.8], [34, -0.5]]
  });
  PATTERNS.marshal = makePattern({
    len: 25, seed: 515, jitter: 0.2,
    v: [[0, 0], [1, 1.0], [3, 2.9], [6, 5.3], [9, 7.0], [13, 8.1], [24, 9.4]],
    h: [[0, 0], [3, -0.1], [6, -1.25], [9, -2.0], [12, 0.3], [16, 2.2], [20, 1.3], [24, -0.8]]
  });
  PATTERNS.sabre = makePattern({
    len: 30, seed: 2024, jitter: 0.14,
    v: [[0, 0], [1, 0.9], [3, 2.5], [6, 4.6], [9, 6.2], [13, 7.2], [29, 8.6]],
    h: [[0, 0], [4, -0.2], [7, -1.1], [10, -1.6], [14, 0.7], [18, 1.9], [23, 0.8], [29, -1.0]]
  });
  PATTERNS.sturm = makePattern({
    len: 30, seed: 553, jitter: 0.18,
    v: [[0, 0], [1, 1.05], [3, 2.95], [6, 5.4], [9, 7.2], [13, 8.4], [29, 10.0]],
    h: [[0, 0], [4, 0.15], [7, -1.4], [10, -2.2], [14, 0.6], [18, 2.4], [23, 1.2], [29, -1.3]]
  });
  PATTERNS.smg = makePattern({           // shared SMG archetype: low, wide
    len: 30, seed: 8080, jitter: 0.3,
    v: [[0, 0], [1, 0.7], [3, 2.0], [6, 3.6], [10, 5.0], [16, 6.0], [29, 7.0]],
    h: [[0, 0], [3, 0.3], [6, -1.5], [9, -2.4], [12, 0.8], [16, 2.9], [20, 2.0], [25, -1.4], [29, 0.3]]
  });
  PATTERNS.p90 = makePattern({
    len: 50, seed: 9090, jitter: 0.32,
    v: [[0, 0], [1, 0.6], [4, 2.1], [8, 3.7], [14, 5.0], [24, 6.2], [49, 7.4]],
    h: [[0, 0], [4, 0.4], [8, -1.7], [12, -2.6], [17, 1.0], [22, 3.1], [28, 1.8], [36, -1.9], [49, 0.4]]
  });
  PATTERNS.lmg = makePattern({
    len: 60, seed: 249, jitter: 0.4,
    v: [[0, 0], [2, 1.4], [6, 3.6], [12, 5.6], [20, 7.0], [35, 8.4], [59, 9.6]],
    h: [[0, 0], [5, 0.6], [10, -2.2], [15, -3.4], [21, 1.2], [28, 3.8], [36, 2.2], [46, -2.4], [59, 0.6]]
  });
  PATTERNS.pistolAuto = makePattern({
    len: 20, seed: 1212, jitter: 0.28,
    v: [[0, 0], [1, 0.8], [3, 2.2], [7, 3.8], [12, 4.9], [19, 5.6]],
    h: [[0, 0], [3, 0.2], [6, -1.2], [9, -1.8], [13, 1.1], [16, 2.0], [19, 0.5]]
  });
  PATTERNS.pistolSemi = makePattern({
    len: 12, seed: 606, jitter: 0.22,
    v: [[0, 0], [1, 0.9], [3, 2.1], [6, 3.2], [11, 4.0]],
    h: [[0, 0], [2, 0.15], [5, -0.9], [8, 0.8], [11, -0.3]]
  });
  PATTERNS.heavyPistol = makePattern({
    len: 8, seed: 50, jitter: 0.3,
    v: [[0, 0], [1, 2.6], [3, 4.8], [7, 6.4]],
    h: [[0, 0], [2, 0.4], [4, -1.1], [7, 1.0]]
  });
  PATTERNS.shotgun = makePattern({
    len: 10, seed: 12, jitter: 0.25,
    v: [[0, 0], [1, 2.2], [3, 4.2], [9, 6.8]],
    h: [[0, 0], [2, 0.3], [5, -0.8], [9, 0.9]]
  });
  PATTERNS.sniper = makePattern({
    len: 10, seed: 700, jitter: 0.1,
    v: [[0, 0], [1, 3.4], [3, 5.6], [9, 7.4]],
    h: [[0, 0], [2, 0.2], [5, -0.5], [9, 0.6]]
  });
  PATTERNS.autoSniper = makePattern({
    len: 20, seed: 20, jitter: 0.16,
    v: [[0, 0], [1, 2.1], [3, 4.0], [8, 5.8], [19, 7.2]],
    h: [[0, 0], [3, 0.2], [6, -1.0], [10, 1.2], [19, -0.4]]
  });
  W.PATTERNS = PATTERNS;

  /* ---------------------------------------------------------------
   * Weapon definitions
   *  dmg          base damage at point blank, chest
   *  rangeMod     damage multiplier applied every 12.7 m of travel
   *  armorPen     fraction of damage that passes through armor (0..1)
   *  pen          wall-penetration power (0..1)
   *  rpm          rounds per minute
   *  inacc*       inaccuracy in degrees (cone half-angle)
   *  recoil       pattern id + scale (degrees)
   *  speed        movement speed in m/s while held
   * ------------------------------------------------------------- */
  function def(o) { return o; }

  var WEAPONS = {

    /* ============================ KNIFE ============================ */
    knife: def({
      id: 'knife', name: 'Combat Knife', cls: 'knife', slot: 3, price: 0, killAward: 1500,
      dmg: 40, backstab: 180, rpm: 180, secondaryRpm: 70, secondaryDmg: 65, secondaryBackstab: 180,
      range: 1.35, speed: 6.50, deploy: 0.35, teams: [1, 2], auto: true,
      armorPen: 0.85, pen: 0, mag: -1, reserve: -1
    }),

    /* ============================ PISTOLS ========================== */
    gs18: def({
      id: 'gs18', name: 'GS-18', cls: 'pistol', slot: 2, price: 200, killAward: 300,
      dmg: 30, rangeMod: 0.77, armorPen: 0.47, pen: 0.30, rpm: 400, auto: false,
      mag: 20, reserve: 120, reload: 2.2, deploy: 0.35, speed: 6.10,
      inaccStand: 0.045, inaccCrouch: 0.75, inaccMove: 4.6, inaccJump: 12.0,
      inaccFireAdd: 0.62, inaccFireMax: 4.2, inaccDecay: 0.0006,
      recoil: 'pistolSemi', recoilScale: 0.60, recovery: 0.30,
      teams: [1], startFor: 1, burst: 3, desc: 'Attacker sidearm. Reliable, cheap, 20-round magazine.'
    }),
    sentinel: def({
      id: 'sentinel', name: 'Sentinel .45', cls: 'pistol', slot: 2, price: 200, killAward: 300,
      dmg: 35, rangeMod: 0.79, armorPen: 0.505, pen: 0.30, rpm: 352, auto: false,
      mag: 12, reserve: 24, reload: 2.2, deploy: 0.35, speed: 6.10, silenced: true,
      inaccStand: 0.035, inaccCrouch: 0.72, inaccMove: 4.4, inaccJump: 12.0,
      inaccFireAdd: 0.55, inaccFireMax: 4.0, inaccDecay: 0.00055,
      recoil: 'pistolSemi', recoilScale: 0.55, recovery: 0.30,
      teams: [2], startFor: 2, desc: 'Defender sidearm. Suppressed, accurate, rewards precision.'
    }),
    compact250: def({
      id: 'compact250', name: 'Compact 250', cls: 'pistol', slot: 2, price: 300, killAward: 300,
      dmg: 38, rangeMod: 0.71, armorPen: 0.645, pen: 0.40, rpm: 400, auto: false,
      mag: 13, reserve: 26, reload: 2.2, deploy: 0.35, speed: 6.10,
      inaccStand: 0.05, inaccCrouch: 0.75, inaccMove: 5.0, inaccJump: 13.0,
      inaccFireAdd: 0.7, inaccFireMax: 4.5, inaccDecay: 0.0006,
      recoil: 'pistolSemi', recoilScale: 0.72, recovery: 0.30,
      teams: [1, 2], desc: 'Armour-piercing eco pistol. Strong first-round trade tool.'
    }),
    cobra57: def({
      id: 'cobra57', name: 'Cobra 57', cls: 'pistol', slot: 2, price: 500, killAward: 300,
      dmg: 32, rangeMod: 0.885, armorPen: 0.77, pen: 0.50, rpm: 400, auto: false,
      mag: 20, reserve: 100, reload: 2.7, deploy: 0.4, speed: 6.05,
      inaccStand: 0.04, inaccCrouch: 0.73, inaccMove: 4.4, inaccJump: 12.0,
      inaccFireAdd: 0.6, inaccFireMax: 4.2, inaccDecay: 0.0006,
      recoil: 'pistolSemi', recoilScale: 0.58, recovery: 0.28,
      teams: [2], desc: 'High-penetration defender pistol with a deep magazine.'
    }),
    raider9: def({
      id: 'raider9', name: 'Raider T-9', cls: 'pistol', slot: 2, price: 500, killAward: 300,
      dmg: 33, rangeMod: 0.81, armorPen: 0.90, pen: 0.55, rpm: 500, auto: false,
      mag: 18, reserve: 90, reload: 2.7, deploy: 0.4, speed: 6.05,
      inaccStand: 0.11, inaccCrouch: 0.72, inaccMove: 5.4, inaccJump: 14.0,
      inaccFireAdd: 0.9, inaccFireMax: 5.0, inaccDecay: 0.0007,
      recoil: 'pistolAuto', recoilScale: 0.78, recovery: 0.26,
      teams: [1], desc: 'Fast-firing attacker pistol. Lethal up close, punishes armour.'
    }),
    twinElites: def({
      id: 'twinElites', name: 'Twin Elites', cls: 'pistol', slot: 2, price: 300, killAward: 300,
      dmg: 38, rangeMod: 0.81, armorPen: 0.468, pen: 0.35, rpm: 500, auto: false, akimbo: true,
      mag: 30, reserve: 120, reload: 4.6, deploy: 0.5, speed: 6.05,
      inaccStand: 0.12, inaccCrouch: 0.8, inaccMove: 5.6, inaccJump: 15.0,
      inaccFireAdd: 0.95, inaccFireMax: 5.4, inaccDecay: 0.0007,
      recoil: 'pistolAuto', recoilScale: 0.7, recovery: 0.26,
      teams: [1, 2], desc: 'Dual-wielded. Thirty rounds of close-quarters chaos.'
    }),
    talon50: def({
      id: 'talon50', name: 'Talon .50', cls: 'pistol', slot: 2, price: 700, killAward: 300,
      dmg: 63, rangeMod: 0.81, armorPen: 0.62, pen: 0.65, rpm: 267, auto: false,
      mag: 7, reserve: 35, reload: 2.2, deploy: 0.45, speed: 6.05,
      inaccStand: 0.075, inaccCrouch: 0.7, inaccMove: 7.2, inaccJump: 18.0,
      inaccFireAdd: 2.1, inaccFireMax: 7.0, inaccDecay: 0.0004,
      recoil: 'heavyPistol', recoilScale: 1.25, recovery: 0.42,
      teams: [1, 2], desc: 'One-tap hand cannon. Unforgiving recoil, devastating payoff.'
    }),
    judgeR8: def({
      id: 'judgeR8', name: 'Judge R8', cls: 'pistol', slot: 2, price: 600, killAward: 300,
      dmg: 86, rangeMod: 0.86, armorPen: 0.685, pen: 0.70, rpm: 150, auto: false, chargeShot: 0.24,
      mag: 8, reserve: 8, reload: 3.0, deploy: 0.5, speed: 6.05,
      inaccStand: 0.05, inaccCrouch: 0.6, inaccMove: 8.0, inaccJump: 20.0,
      inaccFireAdd: 2.6, inaccFireMax: 8.0, inaccDecay: 0.00035,
      recoil: 'heavyPistol', recoilScale: 1.4, recovery: 0.5,
      teams: [1, 2], desc: 'Heavy revolver with a deliberate trigger pull. Rewards patience.'
    }),

    /* ============================= SMGs ============================ */
    viper10: def({
      id: 'viper10', name: 'Viper-10', cls: 'smg', slot: 1, price: 1050, killAward: 600,
      dmg: 29, rangeMod: 0.82, armorPen: 0.475, pen: 0.50, rpm: 800, auto: true,
      mag: 30, reserve: 100, reload: 2.35, deploy: 0.45, speed: 6.25,
      inaccStand: 0.13, inaccCrouch: 0.78, inaccMove: 3.0, inaccJump: 13.0,
      inaccFireAdd: 0.44, inaccFireMax: 4.6, inaccDecay: 0.0004,
      recoil: 'smg', recoilScale: 0.62, recovery: 0.24,
      teams: [1], desc: 'Attacker rush SMG. Big kill reward, very fast fire rate.'
    }),
    waspMP: def({
      id: 'waspMP', name: 'Wasp MP', cls: 'smg', slot: 1, price: 1250, killAward: 600,
      dmg: 26, rangeMod: 0.84, armorPen: 0.505, pen: 0.55, rpm: 857, auto: true,
      mag: 30, reserve: 120, reload: 2.1, deploy: 0.4, speed: 6.35,
      inaccStand: 0.12, inaccCrouch: 0.76, inaccMove: 2.8, inaccJump: 12.5,
      inaccFireAdd: 0.4, inaccFireMax: 4.4, inaccDecay: 0.00038,
      recoil: 'smg', recoilScale: 0.56, recovery: 0.22,
      teams: [2], desc: 'Defender SMG. The fastest legs on the buy menu.'
    }),
    kestrel: def({
      id: 'kestrel', name: 'MP-Kestrel', cls: 'smg', slot: 1, price: 1500, killAward: 600,
      dmg: 27, rangeMod: 0.84, armorPen: 0.565, pen: 0.55, rpm: 750, auto: true,
      mag: 30, reserve: 120, reload: 2.6, deploy: 0.45, speed: 6.20, silenced: true,
      inaccStand: 0.10, inaccCrouch: 0.74, inaccMove: 2.6, inaccJump: 12.0,
      inaccFireAdd: 0.38, inaccFireMax: 4.2, inaccDecay: 0.00038,
      recoil: 'smg', recoilScale: 0.50, recovery: 0.22,
      teams: [1, 2], desc: 'Controllable suppressed SMG. Forgiving spray, quiet report.'
    }),
    hornetUMP: def({
      id: 'hornetUMP', name: 'Hornet UMP', cls: 'smg', slot: 1, price: 1200, killAward: 600,
      dmg: 35, rangeMod: 0.75, armorPen: 0.65, pen: 0.65, rpm: 666, auto: true,
      mag: 25, reserve: 100, reload: 3.5, deploy: 0.45, speed: 6.20,
      inaccStand: 0.11, inaccCrouch: 0.75, inaccMove: 2.9, inaccJump: 13.0,
      inaccFireAdd: 0.5, inaccFireMax: 4.6, inaccDecay: 0.00042,
      recoil: 'smg', recoilScale: 0.66, recovery: 0.26,
      teams: [1, 2], desc: 'Heavy-hitting SMG. Punches through armour at mid range.'
    }),
    torrent: def({
      id: 'torrent', name: 'Torrent-90', cls: 'smg', slot: 1, price: 2350, killAward: 300,
      dmg: 26, rangeMod: 0.84, armorPen: 0.69, pen: 0.60, rpm: 857, auto: true,
      mag: 50, reserve: 100, reload: 3.4, deploy: 0.5, speed: 6.15,
      inaccStand: 0.10, inaccCrouch: 0.74, inaccMove: 2.7, inaccJump: 12.0,
      inaccFireAdd: 0.36, inaccFireMax: 4.2, inaccDecay: 0.00036,
      recoil: 'p90', recoilScale: 0.52, recovery: 0.22,
      teams: [1, 2], desc: 'Fifty rounds, no reload anxiety. The anti-eco answer.'
    }),
    drumSMG: def({
      id: 'drumSMG', name: 'Drum-64', cls: 'smg', slot: 1, price: 1400, killAward: 600,
      dmg: 27, rangeMod: 0.75, armorPen: 0.60, pen: 0.55, rpm: 750, auto: true,
      mag: 64, reserve: 120, reload: 2.4, deploy: 0.5, speed: 6.20,
      inaccStand: 0.14, inaccCrouch: 0.78, inaccMove: 3.2, inaccJump: 13.5,
      inaccFireAdd: 0.42, inaccFireMax: 4.8, inaccDecay: 0.0004,
      recoil: 'smg', recoilScale: 0.58, recovery: 0.24,
      teams: [1, 2], desc: 'Sixty-four round drum. Hold an angle until it stops moving.'
    }),

    /* ============================ RIFLES =========================== */
    kr47: def({
      id: 'kr47', name: 'KR-47 Kalash', cls: 'rifle', slot: 1, price: 2700, killAward: 300,
      dmg: 36, rangeMod: 0.98, armorPen: 0.775, pen: 0.85, rpm: 600, auto: true,
      mag: 30, reserve: 90, reload: 2.5, deploy: 0.6, speed: 5.85,
      inaccStand: 0.042, inaccCrouch: 0.70, inaccMove: 6.2, inaccJump: 17.0,
      inaccFireAdd: 0.58, inaccFireMax: 5.4, inaccDecay: 0.00035,
      recoil: 'kr47', recoilScale: 1.0, recovery: 0.36,
      teams: [1], desc: 'One-shot headshot at any range. The attacker benchmark rifle.'
    }),
    ar4: def({
      id: 'ar4', name: 'AR-4 Centurion', cls: 'rifle', slot: 1, price: 3100, killAward: 300,
      dmg: 33, rangeMod: 0.97, armorPen: 0.70, pen: 0.80, rpm: 666, auto: true,
      mag: 30, reserve: 90, reload: 3.1, deploy: 0.6, speed: 5.85,
      inaccStand: 0.038, inaccCrouch: 0.70, inaccMove: 6.0, inaccJump: 16.5,
      inaccFireAdd: 0.52, inaccFireMax: 5.0, inaccDecay: 0.00034,
      recoil: 'ar4', recoilScale: 0.92, recovery: 0.34,
      teams: [2], desc: 'Defender workhorse. Flatter spray, thirty rounds, easy to tame.'
    }),
    ar4s: def({
      id: 'ar4s', name: 'AR-4S Whisper', cls: 'rifle', slot: 1, price: 2900, killAward: 300,
      dmg: 38, rangeMod: 0.99, armorPen: 0.70, pen: 0.80, rpm: 600, auto: true, silenced: true,
      mag: 20, reserve: 80, reload: 3.1, deploy: 0.6, speed: 5.85,
      inaccStand: 0.030, inaccCrouch: 0.68, inaccMove: 5.6, inaccJump: 16.0,
      inaccFireAdd: 0.46, inaccFireMax: 4.6, inaccDecay: 0.00032,
      recoil: 'ar4s', recoilScale: 0.84, recovery: 0.32,
      teams: [2], desc: 'Suppressed, pinpoint, twenty rounds. Every bullet has to count.'
    }),
    nomadAR: def({
      id: 'nomadAR', name: 'Nomad AR', cls: 'rifle', slot: 1, price: 1800, killAward: 300,
      dmg: 30, rangeMod: 0.98, armorPen: 0.775, pen: 0.80, rpm: 666, auto: true,
      mag: 35, reserve: 90, reload: 3.0, deploy: 0.6, speed: 5.90,
      inaccStand: 0.055, inaccCrouch: 0.72, inaccMove: 6.4, inaccJump: 17.5,
      inaccFireAdd: 0.62, inaccFireMax: 5.6, inaccDecay: 0.00036,
      recoil: 'nomad', recoilScale: 1.05, recovery: 0.38,
      teams: [1], desc: 'Budget attacker rifle. Thirty-five rounds for force-buy pressure.'
    }),
    marshal: def({
      id: 'marshal', name: 'Marshal Bullpup', cls: 'rifle', slot: 1, price: 2050, killAward: 300,
      dmg: 30, rangeMod: 0.97, armorPen: 0.70, pen: 0.78, rpm: 666, auto: true, burst: 3,
      mag: 25, reserve: 90, reload: 3.3, deploy: 0.6, speed: 5.90,
      inaccStand: 0.05, inaccCrouch: 0.72, inaccMove: 6.2, inaccJump: 17.0,
      inaccFireAdd: 0.58, inaccFireMax: 5.4, inaccDecay: 0.00035,
      recoil: 'marshal', recoilScale: 0.98, recovery: 0.36,
      teams: [2], desc: 'Cheap defender rifle with a three-round burst on secondary fire.'
    }),
    sabre: def({
      id: 'sabre', name: 'Sabre AUG', cls: 'rifle', slot: 1, price: 3300, killAward: 300,
      dmg: 28, rangeMod: 0.98, armorPen: 0.90, pen: 0.85, rpm: 666, auto: true,
      mag: 30, reserve: 90, reload: 3.8, deploy: 0.6, speed: 5.85,
      scope: [1.6], scopeInacc: 0.35, scopeSpeed: 0.55,
      inaccStand: 0.040, inaccCrouch: 0.70, inaccMove: 6.0, inaccJump: 16.5,
      inaccFireAdd: 0.5, inaccFireMax: 5.0, inaccDecay: 0.00034,
      recoil: 'sabre', recoilScale: 0.86, recovery: 0.34,
      teams: [2], desc: 'Scoped defender rifle. Holds long angles without an AWP budget.'
    }),
    sturm553: def({
      id: 'sturm553', name: 'Sturm 553', cls: 'rifle', slot: 1, price: 3000, killAward: 300,
      dmg: 30, rangeMod: 0.98, armorPen: 1.0, pen: 0.90, rpm: 600, auto: true,
      mag: 30, reserve: 90, reload: 3.0, deploy: 0.6, speed: 5.85,
      scope: [1.6], scopeInacc: 0.35, scopeSpeed: 0.55,
      inaccStand: 0.042, inaccCrouch: 0.70, inaccMove: 6.0, inaccJump: 16.5,
      inaccFireAdd: 0.54, inaccFireMax: 5.2, inaccDecay: 0.00034,
      recoil: 'sturm', recoilScale: 0.94, recovery: 0.35,
      teams: [1], desc: 'Scoped attacker rifle. Full armour penetration, brutal at range.'
    }),

    /* ============================ SNIPERS ========================== */
    apex700: def({
      id: 'apex700', name: 'Apex 700', cls: 'sniper', slot: 1, price: 4750, killAward: 100,
      dmg: 115, rangeMod: 0.99, armorPen: 0.975, pen: 0.95, rpm: 41, auto: false, bolt: 1.45,
      mag: 5, reserve: 30, reload: 3.7, deploy: 1.25, speed: 5.10,
      scope: [2.2, 4.4], scopeInacc: 0.02, scopeSpeed: 0.29,
      inaccStand: 0.60, inaccCrouch: 0.80, inaccMove: 18.0, inaccJump: 30.0,
      inaccFireAdd: 6.0, inaccFireMax: 14.0, inaccDecay: 0.00025,
      recoil: 'sniper', recoilScale: 1.5, recovery: 0.6,
      teams: [1, 2], oneShot: true, desc: 'One bullet ends the round. Slow, loud and decisive.'
    }),
    ranger: def({
      id: 'ranger', name: 'Ranger Scout', cls: 'sniper', slot: 1, price: 1700, killAward: 300,
      dmg: 88, rangeMod: 0.98, armorPen: 0.85, pen: 0.85, rpm: 48, auto: false, bolt: 1.25,
      mag: 10, reserve: 90, reload: 3.7, deploy: 0.8, speed: 6.30,
      scope: [2.0, 4.0], scopeInacc: 0.015, scopeSpeed: 0.5,
      inaccStand: 0.35, inaccCrouch: 0.75, inaccMove: 14.0, inaccJump: 26.0,
      inaccFireAdd: 4.0, inaccFireMax: 11.0, inaccDecay: 0.0003,
      recoil: 'sniper', recoilScale: 1.1, recovery: 0.5,
      teams: [1, 2], desc: 'Mobile bolt-action. Keeps its accuracy while you reposition.'
    }),
    autolance: def({
      id: 'autolance', name: 'Autolance-20', cls: 'sniper', slot: 1, price: 5000, killAward: 300,
      dmg: 80, rangeMod: 0.99, armorPen: 0.80, pen: 0.90, rpm: 240, auto: true,
      mag: 20, reserve: 90, reload: 4.2, deploy: 1.0, speed: 5.35,
      scope: [2.0, 4.0], scopeInacc: 0.06, scopeSpeed: 0.4,
      inaccStand: 0.30, inaccCrouch: 0.7, inaccMove: 12.0, inaccJump: 24.0,
      inaccFireAdd: 2.4, inaccFireMax: 9.0, inaccDecay: 0.0003,
      recoil: 'autoSniper', recoilScale: 1.0, recovery: 0.45,
      teams: [2], desc: 'Semi-automatic defender sniper. Two body shots, no bolt cycle.'
    }),
    marksmanG3: def({
      id: 'marksmanG3', name: 'Marksman G-3', cls: 'sniper', slot: 1, price: 5000, killAward: 300,
      dmg: 80, rangeMod: 0.99, armorPen: 0.82, pen: 0.90, rpm: 240, auto: true,
      mag: 20, reserve: 90, reload: 4.7, deploy: 1.0, speed: 5.35,
      scope: [2.0, 4.0], scopeInacc: 0.06, scopeSpeed: 0.4,
      inaccStand: 0.30, inaccCrouch: 0.7, inaccMove: 12.0, inaccJump: 24.0,
      inaccFireAdd: 2.4, inaccFireMax: 9.0, inaccDecay: 0.0003,
      recoil: 'autoSniper', recoilScale: 1.0, recovery: 0.45,
      teams: [1], desc: 'Attacker auto-sniper. Opens sites from distance if you can afford it.'
    }),

    /* =========================== SHOTGUNS ========================== */
    breaker12: def({
      id: 'breaker12', name: 'Breaker 12', cls: 'shotgun', slot: 1, price: 1050, killAward: 900,
      dmg: 26, pellets: 9, rangeMod: 0.70, armorPen: 0.50, pen: 0.35, rpm: 68, auto: false,
      mag: 8, reserve: 32, reload: 0.55, shellReload: true, deploy: 0.75, speed: 5.80,
      inaccStand: 2.6, inaccCrouch: 0.85, inaccMove: 4.5, inaccJump: 12.0,
      inaccFireAdd: 0.8, inaccFireMax: 5.0, inaccDecay: 0.0004,
      recoil: 'shotgun', recoilScale: 1.2, recovery: 0.5,
      teams: [1, 2], desc: 'Pump shotgun. Nine pellets of close-range finality.'
    }),
    storm12: def({
      id: 'storm12', name: 'Auto-12 Storm', cls: 'shotgun', slot: 1, price: 2000, killAward: 900,
      dmg: 20, pellets: 6, rangeMod: 0.70, armorPen: 0.80, pen: 0.40, rpm: 171, auto: true,
      mag: 7, reserve: 32, reload: 0.5, shellReload: true, deploy: 0.75, speed: 5.65,
      inaccStand: 2.4, inaccCrouch: 0.85, inaccMove: 4.4, inaccJump: 12.0,
      inaccFireAdd: 0.7, inaccFireMax: 5.2, inaccDecay: 0.00045,
      recoil: 'shotgun', recoilScale: 0.95, recovery: 0.45,
      teams: [1, 2], desc: 'Fully automatic shotgun. Clears a doorway in a heartbeat.'
    }),
    stubMag: def({
      id: 'stubMag', name: 'Stub Mag-7', cls: 'shotgun', slot: 1, price: 1300, killAward: 900,
      dmg: 30, pellets: 8, rangeMod: 0.68, armorPen: 0.60, pen: 0.35, rpm: 92, auto: false,
      mag: 5, reserve: 32, reload: 2.7, deploy: 0.7, speed: 5.90,
      inaccStand: 2.5, inaccCrouch: 0.85, inaccMove: 4.2, inaccJump: 11.5,
      inaccFireAdd: 0.8, inaccFireMax: 5.0, inaccDecay: 0.0004,
      recoil: 'shotgun', recoilScale: 1.1, recovery: 0.5,
      teams: [2], desc: 'Defender shotgun. Tight magazine, brutal anti-rush stopping power.'
    }),
    sawedStub: def({
      id: 'sawedStub', name: 'Sawed Stub', cls: 'shotgun', slot: 1, price: 1100, killAward: 900,
      dmg: 32, pellets: 8, rangeMod: 0.63, armorPen: 0.75, pen: 0.30, rpm: 85, auto: false,
      mag: 7, reserve: 32, reload: 0.5, shellReload: true, deploy: 0.7, speed: 6.10,
      inaccStand: 3.4, inaccCrouch: 0.85, inaccMove: 4.0, inaccJump: 11.0,
      inaccFireAdd: 0.85, inaccFireMax: 5.4, inaccDecay: 0.0004,
      recoil: 'shotgun', recoilScale: 1.15, recovery: 0.5,
      teams: [1], desc: 'Attacker sawn-off. Point-blank only — but nothing survives it.'
    }),

    /* ============================= HEAVY ============================ */
    hailstorm: def({
      id: 'hailstorm', name: 'Hailstorm LMG', cls: 'heavy', slot: 1, price: 5200, killAward: 300,
      dmg: 32, rangeMod: 0.97, armorPen: 0.80, pen: 0.90, rpm: 750, auto: true,
      mag: 100, reserve: 200, reload: 5.7, deploy: 1.2, speed: 4.85,
      inaccStand: 0.10, inaccCrouch: 0.65, inaccMove: 9.0, inaccJump: 24.0,
      inaccFireAdd: 0.5, inaccFireMax: 6.0, inaccDecay: 0.00035,
      recoil: 'lmg', recoilScale: 1.1, recovery: 0.45,
      teams: [1, 2], desc: 'Belt-fed suppression. One hundred rounds, nowhere to run.'
    }),
    nemesis: def({
      id: 'nemesis', name: 'Nemesis LMG', cls: 'heavy', slot: 1, price: 1700, killAward: 300,
      dmg: 35, rangeMod: 0.96, armorPen: 0.75, pen: 0.85, rpm: 800, auto: true,
      mag: 150, reserve: 200, reload: 5.7, deploy: 1.2, speed: 4.90,
      spinUp: 0.45,   // inaccuracy shrinks after this many seconds of sustained fire
      inaccStand: 3.2, inaccCrouch: 0.6, inaccMove: 10.0, inaccJump: 26.0,
      inaccFireAdd: -0.22, inaccFireMax: 6.0, inaccFireMin: -3.0, inaccDecay: 0.0005,
      recoil: 'lmg', recoilScale: 0.85, recovery: 0.40,
      teams: [1, 2], desc: 'Wild until it spins up, then a laser. Commit to the trigger.'
    }),

    /* =========================== GRENADES =========================== */
    he: def({
      id: 'he', name: 'Frag Grenade', cls: 'grenade', gtype: 'he', slot: 4, price: 300, killAward: 300,
      max: 1, dmg: 98, radius: 5.2, fuse: 1.65, throwSpeed: 20.5, deploy: 0.4, speed: 6.35,
      teams: [1, 2], desc: 'Up to 98 damage in a five-metre bubble. Softens a hold instantly.'
    }),
    flash: def({
      id: 'flash', name: 'Flashbang', cls: 'grenade', gtype: 'flash', slot: 4, price: 200, killAward: 0,
      max: 2, fuse: 1.55, throwSpeed: 20.5, deploy: 0.4, speed: 6.35, radius: 16,
      teams: [1, 2], desc: 'Blinds anyone facing it. Two per player — the execute opener.'
    }),
    smoke: def({
      id: 'smoke', name: 'Smoke Grenade', cls: 'grenade', gtype: 'smoke', slot: 4, price: 300, killAward: 0,
      max: 1, fuse: 1.5, throwSpeed: 20.0, deploy: 0.4, speed: 6.35,
      radius: 3.3, duration: 16, expand: 1.4,
      teams: [1, 2], desc: 'Full vision block for sixteen seconds. Cuts a map in half.'
    }),
    molotov: def({
      id: 'molotov', name: 'Molotov', cls: 'grenade', gtype: 'fire', slot: 4, price: 400, killAward: 0,
      max: 1, fuse: 0, throwSpeed: 19.0, deploy: 0.4, speed: 6.35,
      radius: 2.9, duration: 7.0, dps: 24, spread: 1.5,
      teams: [1], desc: 'Denies ground for seven seconds. Flushes campers out of cover.'
    }),
    incendiary: def({
      id: 'incendiary', name: 'Incendiary', cls: 'grenade', gtype: 'fire', slot: 4, price: 600, killAward: 0,
      max: 1, fuse: 0, throwSpeed: 19.0, deploy: 0.4, speed: 6.35,
      radius: 2.9, duration: 7.0, dps: 24, spread: 1.5,
      teams: [2], desc: 'Defender firebomb. Stops a rush cold in a choke.'
    }),

    /* ============================= GEAR ============================= */
    kevlar: def({
      id: 'kevlar', name: 'Kevlar Vest', cls: 'gear', slot: 5, price: 650, gear: 'armor',
      teams: [1, 2], desc: 'One hundred armour. Halves body damage and kills flinch.'
    }),
    kevlarHelmet: def({
      id: 'kevlarHelmet', name: 'Kevlar + Helmet', cls: 'gear', slot: 5, price: 1000, gear: 'helmet',
      teams: [1, 2], desc: 'Survives a rifle headshot from most guns. Always worth it.'
    }),
    defuseKit: def({
      id: 'defuseKit', name: 'Defuse Kit', cls: 'gear', slot: 5, price: 400, gear: 'kit',
      teams: [2], desc: 'Cuts defuse time from ten seconds to five. Buy it every round.'
    })
  };

  /* Derived fields */
  for (var id in WEAPONS) {
    var w = WEAPONS[id];
    w.interval = w.rpm ? 60 / w.rpm : 0;
    w.pattern = w.recoil ? PATTERNS[w.recoil] : null;
    if (w.rangeMod === undefined) w.rangeMod = 0.98;
    if (w.armorPen === undefined) w.armorPen = 0.5;
    if (w.speed === undefined) w.speed = 6.35;
    if (w.inaccCrouch === undefined) w.inaccCrouch = 0.75;
    if (w.teams === undefined) w.teams = [1, 2];
    if (w.pellets === undefined) w.pellets = 1;
  }

  W.ALL = WEAPONS;
  W.get = function (id) { return WEAPONS[id] || null; };
  W.list = function (filter) {
    var out = [];
    for (var k in WEAPONS) if (!filter || filter(WEAPONS[k])) out.push(WEAPONS[k]);
    return out;
  };

  /* Buy-menu structure */
  W.BUY_CATEGORIES = [
    { key: 'gear',    label: 'Equipment', items: ['kevlar', 'kevlarHelmet', 'defuseKit'] },
    { key: 'pistol',  label: 'Pistols',   items: ['gs18', 'sentinel', 'compact250', 'twinElites', 'cobra57', 'raider9', 'talon50', 'judgeR8'] },
    { key: 'smg',     label: 'SMGs',      items: ['viper10', 'waspMP', 'kestrel', 'hornetUMP', 'torrent', 'drumSMG'] },
    { key: 'rifle',   label: 'Rifles',    items: ['nomadAR', 'marshal', 'kr47', 'ar4', 'ar4s', 'sabre', 'sturm553', 'apex700', 'ranger', 'autolance', 'marksmanG3'] },
    { key: 'shotgun', label: 'Heavy',     items: ['breaker12', 'stubMag', 'sawedStub', 'storm12', 'nemesis', 'hailstorm'] },
    { key: 'grenade', label: 'Grenades',  items: ['he', 'flash', 'smoke', 'molotov', 'incendiary'] }
  ];

  W.MAX_GRENADES = 4;

  /* ---------------------------------------------------------------
   * Ballistics
   * ------------------------------------------------------------- */

  /* Damage after distance falloff (CS-style: rangeMod applied per 12.7 m). */
  W.falloff = function (w, distance) {
    return Math.pow(w.rangeMod, distance / 12.7);
  };

  /* Full damage resolution.
   * Returns {health, armor} — amounts to subtract. */
  W.resolveDamage = function (w, distance, hitgroup, armor, helmet, penLoss) {
    var dmg = w.dmg * W.falloff(w, distance) * (penLoss === undefined ? 1 : penLoss);
    dmg *= C.HITGROUP_MULT[hitgroup];

    // Helmet only matters for head shots; armor covers everything except legs.
    var protected_ = (hitgroup === C.HITGROUP.HEAD) ? (armor > 0 && helmet) : (armor > 0 && hitgroup !== C.HITGROUP.LEG);

    if (!protected_) return { health: dmg, armor: 0 };

    var toHealth = dmg * w.armorPen;
    var toArmor = (dmg - toHealth) * 0.5;
    if (toArmor > armor) {
      toArmor = armor;
      toHealth = dmg - armor / 0.5;
      if (toHealth < 0) toHealth = 0;
    }
    return { health: toHealth, armor: toArmor };
  };

  /* Current inaccuracy cone half-angle, in radians. */
  W.inaccuracy = function (w, st) {
    // st: {speed, maxSpeed, onGround, ducking, fireSpread, scoped, justLanded}
    var deg = w.inaccStand || 0.05;
    if (st.ducking) deg *= (w.inaccCrouch || 0.75);

    var moveFrac = st.maxSpeed > 0 ? M.clamp(st.speed / st.maxSpeed, 0, 1.2) : 0;
    // Movement penalty ramps quadratically: walking barely hurts, running is punishing.
    deg += (w.inaccMove || 4) * moveFrac * moveFrac;

    if (!st.onGround) deg += (w.inaccJump || 14) * (st.justLanded ? 0.25 : 1.0);

    deg += Math.max(w.inaccFireMin || 0, st.fireSpread || 0);

    if (st.scoped && w.scope) deg *= (w.scopeInacc !== undefined ? w.scopeInacc : 0.2);

    return Math.max(0, deg) * M.DEG;
  };

  /* Deterministic spread offset for shot `seed`/`index` inside cone `cone` (radians).
   * Uses a triangular-ish distribution so the centre is favoured, like real cones. */
  W.spreadDir = function (out, forward, cone, seed, index) {
    if (cone <= 1e-6) { out.x = forward.x; out.y = forward.y; out.z = forward.z; return out; }
    var r1 = M.hash01(seed, index * 3 + 11);
    var r2 = M.hash01(seed, index * 3 + 29);
    var r3 = M.hash01(seed ^ 0x5bf03635, index * 3 + 47);
    var radius = cone * Math.sqrt((r1 + r3) * 0.5);   // bias toward centre
    var theta = r2 * Math.PI * 2;
    var rx = Math.cos(theta) * radius, ry = Math.sin(theta) * radius;

    var right = { x: 0, y: 0, z: 0 }, up = { x: 0, y: 0, z: 0 };
    M.basisFromForward(forward, right, up);
    out.x = forward.x + right.x * rx + up.x * ry;
    out.y = forward.y + right.y * rx + up.y * ry;
    out.z = forward.z + right.z * rx + up.z * ry;
    return M.vnorm(out, out);
  };

  /* Recoil punch for shot #n (0-based). Returns {x: yawDeg, y: pitchDeg}. */
  W.recoilStep = function (w, n) {
    if (!w.pattern || !w.pattern.length) return { x: 0, y: 0 };
    var p = w.pattern[Math.min(n, w.pattern.length - 1)];
    // Past the end of the pattern the gun just wanders — sustained fire is punished.
    var beyond = n >= w.pattern.length;
    var sc = w.recoilScale || 1;
    if (beyond) {
      return { x: (M.hash01(n, 3) - 0.5) * 1.8 * sc, y: (M.hash01(n, 7) * 0.5) * sc };
    }
    return { x: p[0] * sc, y: p[1] * sc };
  };

  /* Total accumulated recoil after n shots — used by the bot spray-control AI
   * and by the spray-pattern trainer overlay. */
  W.patternCumulative = function (w, n) {
    var x = 0, y = 0;
    for (var i = 0; i < n; i++) { var s = W.recoilStep(w, i); x += s.x; y += s.y; }
    return { x: x, y: y };
  };

  W.priceOf = function (id) { var w = WEAPONS[id]; return w ? w.price : 0; };

  W.classLabel = {
    pistol: 'Pistol', smg: 'SMG', rifle: 'Rifle', shotgun: 'Shotgun',
    sniper: 'Sniper', heavy: 'Heavy', grenade: 'Grenade', knife: 'Knife', gear: 'Equipment'
  };

  CS.W = W;
})(typeof window !== 'undefined' ? window : globalThis);
