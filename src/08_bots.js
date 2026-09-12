/* =============================================================
 * BREACHPOINT — bot AI
 *
 * Bots drive the exact same command struct a human produces, so
 * they obey every movement, recoil and accuracy rule players do.
 * Difficulty changes perception and aim, never the physics.
 * ============================================================= */
(function (root) {
  'use strict';
  var CS = (root.CS = root.CS || {});
  var M = CS.M, C = CS.C, W = CS.W, P = CS.P, G = CS.G;

  var B = {};

  B.DIFFICULTY = {
    easy:   { label: 'Easy',   react: 0.62, aimSpeed: 4.5,  error: 4.2, spray: 0.10, fov: 1.55, hearing: 14, burst: 0.55, peek: 0.25, nade: 0.10, crouch: 0.15, preAim: 0.2, memory: 2.0 },
    normal: { label: 'Normal', react: 0.36, aimSpeed: 8.0,  error: 2.0, spray: 0.42, fov: 1.75, hearing: 20, burst: 0.72, peek: 0.45, nade: 0.30, crouch: 0.35, preAim: 0.5, memory: 4.0 },
    hard:   { label: 'Hard',   react: 0.22, aimSpeed: 13.0, error: 1.0, spray: 0.70, fov: 1.95, hearing: 26, burst: 0.85, peek: 0.7,  nade: 0.55, crouch: 0.5,  preAim: 0.75, memory: 6.0 },
    expert: { label: 'Expert', react: 0.14, aimSpeed: 19.0, error: 0.45, spray: 0.92, fov: 2.1, hearing: 30, burst: 0.95, peek: 0.9,  nade: 0.75, crouch: 0.6,  preAim: 0.9, memory: 9.0 }
  };

  var BOT_NAMES = [
    'Ash', 'Kestrel', 'Vulture', 'Mako', 'Pike', 'Rook', 'Slate', 'Tundra',
    'Vector', 'Wisp', 'Onyx', 'Quartz', 'Drift', 'Ember', 'Falk', 'Grit',
    'Halo', 'Iris', 'Jolt', 'Krait'
  ];
  var nameCursor = 0;
  B.nextName = function () { return 'BOT ' + BOT_NAMES[(nameCursor++) % BOT_NAMES.length]; };

  B.attach = function (p, difficulty) {
    var d = B.DIFFICULTY[difficulty] || B.DIFFICULTY.normal;
    p.bot = true;
    p.botSkill = difficulty || 'normal';
    p.ai = {
      d: d,
      state: 'idle',
      path: null, pathIndex: 0, pathGoal: null, repathAt: 0,
      target: null, targetSeenAt: -99, targetLostAt: -99, lastKnown: null,
      reactAt: 0, engageSince: 0,
      aimYaw: p.yaw, aimPitch: 0,
      aimErrX: 0, aimErrY: 0, aimErrT: 0,
      burstLeft: 0, burstRest: 0,
      strafeDir: Math.random() < 0.5 ? 1 : -1, strafeT: 0,
      holdSpot: null, roamSpot: null,
      wantDuck: false, wantWalk: false,
      nadeCooldown: 0, plan: null, planAt: 0,
      alertUntil: 0, alertPos: null,
      jumpCd: 0, stuckT: 0, lastPos: { x: 0, y: 0, z: 0 },
      buyDone: false, personality: Math.random()
    };
    return p;
  };

  /* ---------------------------------------------------------------
   * Buying
   * ------------------------------------------------------------- */
  var BUY_TIERS = {
    1: [ // attackers
      { min: 5000, gun: 'kr47', armor: 'kevlarHelmet', nades: ['smoke', 'flash', 'he'] },
      { min: 4400, gun: 'kr47', armor: 'kevlarHelmet', nades: ['flash', 'he'] },
      { min: 3700, gun: 'kr47', armor: 'kevlarHelmet', nades: [] },
      { min: 2800, gun: 'nomadAR', armor: 'kevlar', nades: ['flash'] },
      { min: 2200, gun: 'viper10', armor: 'kevlar', nades: [] },
      { min: 1300, gun: 'raider9', armor: 'kevlar', nades: [] },
      { min: 700,  gun: 'raider9', armor: null, nades: ['flash'] },
      { min: 0,    gun: null, armor: null, nades: [] }
    ],
    2: [ // defenders
      { min: 5400, gun: 'ar4', armor: 'kevlarHelmet', kit: true, nades: ['smoke', 'flash', 'he'] },
      { min: 4700, gun: 'ar4', armor: 'kevlarHelmet', kit: true, nades: ['flash'] },
      { min: 4100, gun: 'ar4', armor: 'kevlarHelmet', kit: true, nades: [] },
      { min: 3600, gun: 'ar4', armor: 'kevlarHelmet', nades: [] },
      { min: 2600, gun: 'marshal', armor: 'kevlar', nades: ['flash'] },
      { min: 2000, gun: 'waspMP', armor: 'kevlar', nades: [] },
      { min: 1300, gun: 'cobra57', armor: 'kevlar', nades: [] },
      { min: 700,  gun: 'cobra57', armor: null, nades: ['flash'] },
      { min: 0,    gun: null, armor: null, nades: [] }
    ]
  };

  B.buyPhase = function (p, match) {
    var ai = p.ai;
    if (ai.buyDone) return;
    var rules = match.rules;
    if (!match.isBuyTime(p)) return;
    if (!match.world.inBuyZone(p.team, p.pos.x, p.pos.y, p.pos.z)) return;

    var tiers = BUY_TIERS[p.team] || BUY_TIERS[1];
    var tier = tiers[tiers.length - 1];
    for (var i = 0; i < tiers.length; i++) {
      if (p.money >= tiers[i].min) { tier = tiers[i]; break; }
    }
    // AWP-loving personality occasionally splurges
    if (ai.personality > 0.86 && p.money >= 5300 && !p.primary) {
      match.buyFor(p, 'apex700'); match.buyFor(p, 'kevlarHelmet');
      ai.buyDone = true; return;
    }
    if (tier.gun && !p.primary) match.buyFor(p, tier.gun);
    else if (tier.gun && p.primary && W.get(p.primary.id).cls === 'pistol') match.buyFor(p, tier.gun);
    if (tier.armor) match.buyFor(p, tier.armor);
    if (tier.kit) match.buyFor(p, 'defuseKit');
    for (var n = 0; n < tier.nades.length; n++) match.buyFor(p, tier.nades[n]);
    ai.buyDone = true;
  };

  /* ---------------------------------------------------------------
   * Perception
   * ------------------------------------------------------------- */
  function visible(match, p, e) {
    var eye = { x: p.pos.x, y: p.pos.y + p.eye, z: p.pos.z };
    var tgt = { x: e.pos.x, y: e.pos.y + e.height * 0.72, z: e.pos.z };
    var dx = tgt.x - eye.x, dy = tgt.y - eye.y, dz = tgt.z - eye.z;
    var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist > 90) return 0;
    var f = M.angleVectors(p.ai.aimYaw, p.ai.aimPitch);
    var dot = (f.x * dx + f.y * dy + f.z * dz) / (dist || 1);
    var fovCos = Math.cos(p.ai.d.fov);
    if (dot < fovCos) return 0;
    if (!match.world.canSee(eye.x, eye.y, eye.z, tgt.x, tgt.y, tgt.z, match.nades.smokes)) {
      // try the feet and the head before deciding they are hidden
      if (!match.world.canSee(eye.x, eye.y, eye.z, e.pos.x, e.pos.y + 0.25, e.pos.z, match.nades.smokes)) return 0;
    }
    return dist;
  }

  function hears(match, p, e) {
    // running enemies within hearing range give away their position
    if (!e.alive) return false;
    var sp = P.speed2D(e);
    if (e.walking || sp < C.MAX_SPEED * 0.42) return false;
    return M.vdist(p.pos, e.pos) < p.ai.d.hearing;
  }

  B.perceive = function (p, match, now) {
    var ai = p.ai;
    var best = null, bestDist = 1e9;
    for (var i = 0; i < match.players.length; i++) {
      var e = match.players[i];
      if (!e.alive || e.team === p.team || e === p) continue;
      var dist = visible(match, p, e);
      if (dist > 0) {
        // prefer whoever is closest and most exposed
        var score = dist - (e.health < 50 ? 8 : 0);
        if (score < bestDist) { bestDist = score; best = e; }
      } else if (hears(match, p, e)) {
        if (now > ai.alertUntil - 1) {
          ai.alertUntil = now + 3.0;
          ai.alertPos = { x: e.pos.x, y: e.pos.y, z: e.pos.z };
        }
      }
    }

    if (best) {
      if (ai.target !== best) {
        ai.target = best;
        ai.reactAt = now + ai.d.react * (0.75 + Math.random() * 0.5);
        ai.engageSince = now;
      }
      ai.targetSeenAt = now;
      ai.lastKnown = { x: best.pos.x, y: best.pos.y, z: best.pos.z };
    } else if (ai.target && now - ai.targetSeenAt > ai.d.memory) {
      ai.target = null;
    }

    // getting shot spins you toward the attacker
    if (p.lastAttacker && match.byId[p.lastAttacker] && now - (p.lastHurtTime || -99) < 0.35) {
      var a = match.byId[p.lastAttacker];
      if (a.alive && a.team !== p.team) {
        ai.alertUntil = Math.max(ai.alertUntil, now + 3.5);
        ai.alertPos = { x: a.pos.x, y: a.pos.y, z: a.pos.z };
        if (!ai.target) { ai.target = a; ai.reactAt = now + ai.d.react * 0.6; ai.targetSeenAt = now - 0.2; }
      }
    }
  };

  /* ---------------------------------------------------------------
   * Objective selection
   * ------------------------------------------------------------- */
  function chooseGoal(p, match, now) {
    var ai = p.ai, world = match.world;
    var bomb = match.bomb;

    if (p.team === C.TEAM.ATT) {
      if (bomb && bomb.planted) {
        // defend the plant: hold near the bomb
        if (!ai.holdSpot || M.vdist(ai.holdSpot, { x: bomb.x, y: bomb.y, z: bomb.z }) > 14) {
          ai.holdSpot = pickNear(world, bomb.x, bomb.y, bomb.z, 6.5);
        }
        return ai.holdSpot;
      }
      if (bomb && bomb.dropped && !p.bomb) {
        var anyCarrier = match.bombCarrier;
        if (!anyCarrier) return { x: bomb.x, y: bomb.y, z: bomb.z };
      }
      if (!ai.plan || now > ai.planAt) {
        ai.plan = (ai.personality < 0.5) ? 'a' : 'b';
        // the whole team should commit to the same site
        if (match.attPlan) ai.plan = match.attPlan;
        ai.planAt = now + 999;
      }
      var tag = ai.plan === 'a' ? 'plant_a' : 'plant_b';
      var spots = world.nodesWithTag(tag);
      if (!spots.length) spots = world.nodesWithTag(ai.plan === 'a' ? 'site_a' : 'site_b');
      if (!spots.length) return null;
      if (!ai.roamSpot || ai.roamGoalTag !== tag) {
        ai.roamSpot = spots[(Math.random() * spots.length) | 0];
        ai.roamGoalTag = tag;
      }
      return ai.roamSpot;
    }

    // defenders
    if (bomb && bomb.planted) {
      return { x: bomb.x, y: bomb.y, z: bomb.z };
    }
    if (!ai.holdSpot) {
      var side = ai.personality < 0.5 ? 'hold_a' : 'hold_b';
      if (match.defAssign) side = match.defAssign(p);
      var hs = world.nodesWithTag(side);
      if (!hs.length) hs = world.nodesWithTag(side === 'hold_a' ? 'site_a' : 'site_b');
      ai.holdSpot = hs.length ? hs[(Math.random() * hs.length) | 0] : null;
    }
    if (ai.alertUntil > now && ai.alertPos) {
      return ai.alertPos;
    }
    return ai.holdSpot;
  }

  function pickNear(world, x, y, z, radius) {
    var id = world.nearestNode(x + (Math.random() - 0.5) * radius, y, z + (Math.random() - 0.5) * radius);
    if (id < 0) return { x: x, y: y, z: z };
    return { x: world.nav.x[id], y: world.nav.y[id], z: world.nav.z[id] };
  }

  /* ---------------------------------------------------------------
   * Steering
   * ------------------------------------------------------------- */
  function followPath(p, match, cmd, now, dt) {
    var ai = p.ai, world = match.world;
    var goal = ai.pathGoal;
    if (!goal) return false;

    if (!ai.path || now > ai.repathAt) {
      ai.path = world.findPath(p.pos.x, p.pos.y, p.pos.z, goal.x, goal.y, goal.z);
      ai.pathIndex = 1;
      ai.repathAt = now + 1.2 + Math.random() * 0.8;
      if (!ai.path) { ai.repathAt = now + 2.0; return false; }
    }
    if (!ai.path || ai.pathIndex >= ai.path.length) return false;

    var node = ai.path[ai.pathIndex];
    var d = M.vdistXZ(p.pos, node);
    if (d < 0.9) {
      ai.pathIndex++;
      if (ai.pathIndex >= ai.path.length) { ai.path = null; return false; }
      node = ai.path[ai.pathIndex];
    }

    var dx = node.x - p.pos.x, dz = node.z - p.pos.z;
    var len = Math.sqrt(dx * dx + dz * dz) || 1;
    setMove(p, cmd, dx / len, dz / len, 1);

    // jump up ledges the path wants us to climb
    if (node.y > p.pos.y + 0.5 && d < 1.6 && p.onGround && ai.jumpCd <= 0) {
      cmd.jump = true; ai.jumpCd = 0.6;
    }
    return true;
  }

  /* Convert a world-space direction into forward/side relative to aim yaw. */
  function setMove(p, cmd, wx, wz, scale) {
    var yaw = p.ai.aimYaw;
    var fx = Math.cos(yaw), fz = -Math.sin(yaw);
    var rx = Math.sin(yaw), rz = Math.cos(yaw);
    cmd.forward = (wx * fx + wz * fz) * scale;
    cmd.side = (wx * rx + wz * rz) * scale;
  }

  /* ---------------------------------------------------------------
   * Aiming
   * ------------------------------------------------------------- */
  function aimAt(p, match, target, dt, now, precise) {
    var ai = p.ai;
    var eye = { x: p.pos.x, y: p.pos.y + p.eye, z: p.pos.z };
    var aimHeight = target.height ? target.height * (precise ? 0.88 : 0.72) : 1.2;
    var tx = target.pos ? target.pos.x : target.x;
    var ty = (target.pos ? target.pos.y : target.y) + aimHeight;
    var tz = target.pos ? target.pos.z : target.z;

    // lead a moving target slightly
    if (target.vel) {
      var dist = M.vdist(eye, { x: tx, y: ty, z: tz });
      var lead = M.clamp(dist / 120, 0, 0.12) * (0.4 + ai.d.spray * 0.6);
      tx += target.vel.x * lead; tz += target.vel.z * lead;
    }

    var dx = tx - eye.x, dy = ty - eye.y, dz = tz - eye.z;
    var horiz = Math.sqrt(dx * dx + dz * dz);
    var wantYaw = Math.atan2(-dz, dx);
    var wantPitch = Math.atan2(dy, horiz);

    // aim error wobble, refreshed a few times a second
    ai.aimErrT -= dt;
    if (ai.aimErrT <= 0) {
      ai.aimErrT = 0.18 + Math.random() * 0.22;
      var err = ai.d.error * M.DEG * (1 + (p.flashAmount || 0) * 4);
      ai.aimErrX = (Math.random() - 0.5) * 2 * err;
      ai.aimErrY = (Math.random() - 0.5) * 2 * err * 0.6;
    }
    wantYaw += ai.aimErrX;
    wantPitch += ai.aimErrY;

    // compensate for accumulated recoil — this is what "spray control" is
    wantYaw -= p.recoilYaw * M.DEG * ai.d.spray;
    wantPitch -= p.recoilPitch * M.DEG * ai.d.spray;

    var speed = ai.d.aimSpeed * dt;
    // snap faster when the target is already near the crosshair
    var delta = Math.abs(M.angleDelta(ai.aimYaw, wantYaw));
    var k = M.clamp(speed * (1 + (delta < 0.12 ? 2.2 : 0)), 0, 1);
    ai.aimYaw = ai.aimYaw + M.angleDelta(ai.aimYaw, wantYaw) * k;
    ai.aimPitch = ai.aimPitch + (wantPitch - ai.aimPitch) * k;
    ai.aimPitch = M.clamp(ai.aimPitch, -1.45, 1.45);
    return delta;
  }

  function lookAlong(p, dir, dt, rate) {
    var ai = p.ai;
    var wantYaw = Math.atan2(-dir.z, dir.x);
    var k = M.clamp(rate * dt, 0, 1);
    ai.aimYaw += M.angleDelta(ai.aimYaw, wantYaw) * k;
    ai.aimPitch += (0 - ai.aimPitch) * k;
  }

  /* ---------------------------------------------------------------
   * Main think
   * ------------------------------------------------------------- */
  B.think = function (p, match, dt, now) {
    var ai = p.ai;
    if (!ai) return null;
    var cmd = {
      forward: 0, side: 0, jump: false, duck: false, walk: false,
      yaw: ai.aimYaw, pitch: ai.aimPitch,
      attack: false, attack2: false, reload: false, use: false, slot: 0
    };
    if (!p.alive) return cmd;

    ai.jumpCd = Math.max(0, ai.jumpCd - dt);
    ai.nadeCooldown = Math.max(0, ai.nadeCooldown - dt);

    if (match.phase === C.PHASE.FREEZE) {
      B.buyPhase(p, match);
      cmd.yaw = ai.aimYaw; cmd.pitch = ai.aimPitch;
      return cmd;
    }
    if (match.phase !== C.PHASE.LIVE) { cmd.yaw = ai.aimYaw; cmd.pitch = ai.aimPitch; return cmd; }
    ai.buyDone = false;

    B.perceive(p, match, now);

    // reload when safe
    if (P.needsReload(p) && !ai.target) cmd.reload = true;
    var slot = P.curSlot(p);
    if (slot && slot.mag !== undefined && slot.mag === 0) {
      if (slot.reserve > 0) cmd.reload = true;
      else if (p.secondary && p.cur === 'primary') cmd.slot = 2;
    }
    if (!p.primary && !p.secondary && p.cur !== 'knife') cmd.slot = 3;
    if (p.primary && p.cur !== 'primary' && !ai.throwing && p.cur.indexOf('nade:') !== 0) cmd.slot = 1;

    // burning: run away from fire
    var fire = G.fireDamage(match.nades, p, dt);
    if (fire) {
      var away = { x: p.pos.x, z: p.pos.z };
      var nearest = null, nd = 1e9;
      for (var f = 0; f < match.nades.fires.length; f++) {
        var ff = match.nades.fires[f];
        var d2 = M.vdistXZ(p.pos, ff.pos);
        if (d2 < nd) { nd = d2; nearest = ff; }
      }
      if (nearest) {
        var ax = p.pos.x - nearest.pos.x, az = p.pos.z - nearest.pos.z;
        var al = Math.sqrt(ax * ax + az * az) || 1;
        setMove(p, cmd, ax / al, az / al, 1);
        cmd.yaw = ai.aimYaw; cmd.pitch = ai.aimPitch;
        return cmd;
      }
    }

    if (ai.throwing) {
      if (B.stepThrow(p, match, cmd, dt, now)) { cmd.yaw = ai.aimYaw; cmd.pitch = ai.aimPitch; return cmd; }
    }

    var target = ai.target;
    var engaged = target && target.alive && now >= ai.reactAt && (now - ai.targetSeenAt) < 0.9;

    if (engaged) {
      B.combat(p, match, cmd, target, dt, now);
    } else {
      B.navigate(p, match, cmd, dt, now);
    }

    // anti-stuck
    var moved = M.vdistXZ(p.pos, ai.lastPos);
    if ((cmd.forward || cmd.side) && moved < 0.02 * 60 * dt) ai.stuckT += dt; else ai.stuckT = 0;
    ai.lastPos.x = p.pos.x; ai.lastPos.y = p.pos.y; ai.lastPos.z = p.pos.z;
    if (ai.stuckT > 0.6) {
      ai.path = null; ai.repathAt = 0;
      cmd.side = ai.strafeDir; cmd.forward = 0.4;
      if (ai.jumpCd <= 0) { cmd.jump = true; ai.jumpCd = 0.7; }
      if (ai.stuckT > 1.6) { ai.strafeDir *= -1; ai.stuckT = 0; ai.roamSpot = null; ai.holdSpot = null; }
    }

    cmd.yaw = ai.aimYaw;
    cmd.pitch = ai.aimPitch;
    return cmd;
  };

  B.combat = function (p, match, cmd, target, dt, now) {
    var ai = p.ai;
    var dist = M.vdist(p.pos, target.pos);
    var w = P.curWeapon(p);
    var precise = dist > 8 && w.cls !== 'shotgun';
    var delta = aimAt(p, match, target, dt, now, precise);

    // scope in with snipers at range
    if (w.scope && dist > 14 && !p.scoped && delta < 0.4) cmd.attack2 = true;
    if (w.scope && dist < 8 && p.scoped) cmd.attack2 = true;

    // movement: strafe to make yourself hard to hit, stop to shoot accurately
    ai.strafeT -= dt;
    if (ai.strafeT <= 0) { ai.strafeT = 0.35 + Math.random() * 0.5; ai.strafeDir *= -1; }

    var wantStop = delta < 0.09 && dist > 4;
    if (wantStop) {
      cmd.forward = 0; cmd.side = 0;
      if (ai.d.crouch > Math.random() * 1.2 && dist > 10) cmd.duck = true;
    } else {
      var tx = target.pos.x - p.pos.x, tz = target.pos.z - p.pos.z;
      var tl = Math.sqrt(tx * tx + tz * tz) || 1;
      tx /= tl; tz /= tl;
      var approach = dist > 16 ? 0.3 : (dist < 5 ? -0.5 : 0);
      // strafe perpendicular to the enemy
      var px = -tz * ai.strafeDir, pz = tx * ai.strafeDir;
      setMove(p, cmd, tx * approach + px * 0.9, tz * approach + pz * 0.9, 1);
    }

    // only shoot when the crosshair is actually on them and they are visible
    var canShoot = delta < (dist > 25 ? 0.035 : 0.09) && p.deployTimer <= 0 && p.reloadTimer <= 0;
    var slot = P.curSlot(p);
    if (slot && slot.mag !== undefined && slot.mag <= 0) canShoot = false;

    if (canShoot) {
      if (w.auto) {
        // burst discipline: better bots tap at range, hold at close range
        ai.burstRest -= dt;
        if (ai.burstLeft <= 0 && ai.burstRest <= 0) {
          var maxBurst = dist < 8 ? 30 : (dist < 18 ? 7 : 3);
          ai.burstLeft = Math.max(1, Math.round(maxBurst * (0.45 + ai.d.burst * 0.75)));
        }
        if (ai.burstLeft > 0) {
          cmd.attack = true;
          if (p.fireTimer <= 0) ai.burstLeft--;            // one decrement per round fired
          if (ai.burstLeft <= 0) ai.burstRest = 0.12 + (1 - ai.d.burst) * 0.45;
        }
      } else {
        cmd.attack = true;
      }
    }

    // pop a flash over cover instead of walking into a held angle
    if (ai.nadeCooldown <= 0 && dist > 11 && dist < 34 && Math.random() < ai.d.nade * dt * 0.9) {
      if (B.wantNade(p, match, 'flash', target.pos, 0.22)) ai.nadeCooldown = 9;
    }
  };

  /* Queue a grenade throw at `aimAt` with an upward arc. Returns true if started. */
  B.wantNade = function (p, match, gtype, at, loft) {
    var ai = p.ai;
    var id = null;
    for (var i = 0; i < p.grenades.length; i++) {
      var g = W.get(p.grenades[i].id);
      if (g && g.gtype === gtype && p.grenades[i].count > 0) { id = p.grenades[i].id; break; }
    }
    if (!id) return false;
    ai.throwing = { key: 'nade:' + id, at: { x: at.x, y: at.y, z: at.z }, loft: loft, t: 0, stage: 0 };
    return true;
  };

  /* Drive an in-progress throw: select, aim, release. */
  B.stepThrow = function (p, match, cmd, dt, now) {
    var ai = p.ai, th = ai.throwing;
    th.t += dt;
    if (p.cur !== th.key) {
      if (!P.switchTo(p, th.key)) { ai.throwing = null; return false; }
      th.t = 0;
      return true;
    }
    var eye = { x: p.pos.x, y: p.pos.y + p.eye, z: p.pos.z };
    var dx = th.at.x - eye.x, dz = th.at.z - eye.z;
    var horiz = Math.sqrt(dx * dx + dz * dz) || 1;
    var wantYaw = Math.atan2(-dz, dx);
    var wantPitch = th.loft;
    ai.aimYaw += M.angleDelta(ai.aimYaw, wantYaw) * M.clamp(9 * dt, 0, 1);
    ai.aimPitch += (wantPitch - ai.aimPitch) * M.clamp(9 * dt, 0, 1);
    cmd.forward = 0; cmd.side = 0;
    if (p.deployTimer > 0) return true;
    if (Math.abs(M.angleDelta(ai.aimYaw, wantYaw)) > 0.08 && th.t < 1.2) { cmd.attack = true; return true; }
    if (th.stage === 0) { cmd.attack = true; th.stage = 1; th.holdT = 0; return true; }
    th.holdT = (th.holdT || 0) + dt;
    if (th.holdT < 0.12) { cmd.attack = true; return true; }
    cmd.attack = false;             // release throws it
    ai.throwing = null;
    ai.nadeCooldown = Math.max(ai.nadeCooldown, 4);
    return true;
  };

  B.navigate = function (p, match, cmd, dt, now) {
    var ai = p.ai;
    var world = match.world;
    var bomb = match.bomb;

    // planting
    if (p.bomb && match.phase === C.PHASE.LIVE) {
      var site = world.siteAt(p.pos.x, p.pos.y + 0.1, p.pos.z);
      if (site) {
        cmd.use = true; cmd.forward = 0; cmd.side = 0;
        return;
      }
    }
    // defusing
    if (bomb && bomb.planted && p.team === C.TEAM.DEF) {
      var bd = M.vdistXZ(p.pos, { x: bomb.x, z: bomb.z });
      if (bd < 1.3) { cmd.use = true; cmd.forward = 0; cmd.side = 0; return; }
    }
    // picking the bomb back up
    if (bomb && bomb.dropped && p.team === C.TEAM.ATT && !match.bombCarrier) {
      if (M.vdist(p.pos, { x: bomb.x, y: bomb.y, z: bomb.z }) < 1.4) { cmd.use = true; return; }
    }

    var goal = chooseGoal(p, match, now);
    if (!goal) { lookScan(p, dt); return; }

    if (!ai.pathGoal || M.vdist(ai.pathGoal, goal) > 2.5) {
      ai.pathGoal = { x: goal.x, y: goal.y, z: goal.z };
      ai.path = null; ai.repathAt = 0;
    }

    var moving = followPath(p, match, cmd, now, dt);
    var atGoal = M.vdistXZ(p.pos, goal) < 2.2;

    if (!moving || atGoal) {
      cmd.forward = 0; cmd.side = 0;
      holdAngle(p, match, dt, now);
      if (p.team === C.TEAM.DEF && ai.d.crouch > 0.3 && Math.random() < 0.005) cmd.duck = true;
      if (atGoal && p.team === C.TEAM.ATT && !match.bomb) {
        // rotate to a different spot on the site occasionally
        if (Math.random() < 0.004) ai.roamSpot = null;
      }
    } else {
      // look where you are going, but check known danger angles
      if (ai.lastKnown && now - ai.targetSeenAt < ai.d.memory) {
        aimAt(p, match, { pos: ai.lastKnown, height: 1.6 }, dt, now, false);
      } else {
        var node = ai.path && ai.path[ai.pathIndex];
        if (node) {
          var dx = node.x - p.pos.x, dz = node.z - p.pos.z;
          var l = Math.sqrt(dx * dx + dz * dz) || 1;
          lookAlong(p, { x: dx / l, y: 0, z: dz / l }, dt, 5.5);
        }
      }
      // walk quietly when close to the objective
      var near = M.vdistXZ(p.pos, goal) < 9;
      cmd.walk = near && ai.d.peek > 0.4 && !ai.target;

      // attackers soften the site with utility just before committing
      var gd = M.vdistXZ(p.pos, goal);
      if (p.team === C.TEAM.ATT && ai.nadeCooldown <= 0 && gd > 9 && gd < 22 &&
          Math.random() < ai.d.nade * dt * 1.6) {
        var gtype = Math.random() < 0.45 ? 'smoke' : 'flash';
        if (B.wantNade(p, match, gtype, goal, gtype === 'smoke' ? 0.30 : 0.24)) ai.nadeCooldown = 12;
      }
    }
  };

  function holdAngle(p, match, dt, now) {
    var ai = p.ai;
    if (ai.alertPos && now < ai.alertUntil) {
      aimAt(p, match, { pos: ai.alertPos, height: 1.6 }, dt, now, false);
      return;
    }
    if (ai.lastKnown && now - ai.targetSeenAt < ai.d.memory) {
      aimAt(p, match, { pos: ai.lastKnown, height: 1.6 }, dt, now, false);
      return;
    }
    // sweep the most likely entry
    lookScan(p, dt);
  }

  function lookScan(p, dt) {
    var ai = p.ai;
    ai.scanT = (ai.scanT || 0) + dt;
    ai.aimYaw += Math.sin(ai.scanT * 0.55) * dt * 0.42;
    ai.aimPitch += (0 - ai.aimPitch) * dt * 2.4;
  }

  /* Called by the match when something noisy happens, so bots that did not
   * see it themselves still rotate toward it. */
  B.alert = function (p, x, y, z, now, weight) {
    var ai = p.ai;
    if (!ai || !p.alive) return;
    if (ai.target && now - ai.targetSeenAt < 1.0) return;   // busy in a fight
    if (now < ai.alertUntil && Math.random() > 0.35) return;
    ai.alertUntil = now + (weight || 4.5);
    ai.alertPos = { x: x, y: y, z: z };
    ai.path = null; ai.pathGoal = null;
  };

  CS.Bots = B;
})(typeof window !== 'undefined' ? window : globalThis);
