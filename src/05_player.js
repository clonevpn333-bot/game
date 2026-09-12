/* =============================================================
 * BREACHPOINT — player state, movement and weapon handling
 *
 * Every function here is deterministic and shared by the host
 * simulation, client-side prediction and the bot controller, so
 * a predicted move and the authoritative move cannot disagree.
 * ============================================================= */
(function (root) {
  'use strict';
  var CS = (root.CS = root.CS || {});
  var M = CS.M, C = CS.C, W = CS.W;

  var P = {};

  var nextLocalId = 1;

  P.create = function (opts) {
    opts = opts || {};
    var p = {
      id: opts.id || ('p' + (nextLocalId++)),
      name: opts.name || 'Player',
      team: opts.team || C.TEAM.NONE,
      bot: !!opts.bot,
      botSkill: opts.botSkill || 'normal',
      local: !!opts.local,
      connected: true,
      ping: 0,
      afk: 0,

      pos: { x: 0, y: 0, z: 0 },
      vel: { x: 0, y: 0, z: 0 },
      yaw: 0, pitch: 0,
      onGround: false,
      ducking: false, duckAmount: 0,
      height: C.STAND_HEIGHT, eye: C.EYE_STAND,
      walking: false,
      jumpCooldown: 0,
      landTimer: 0,
      stepDist: 0,
      lastSurface: 'concrete',

      alive: false,
      health: 0, armor: 0, helmet: false, kit: false,
      money: 800,
      spawnProtect: 0,

      primary: null, secondary: null, knife: { id: 'knife' },
      grenades: [], bomb: false,
      cur: 'knife', lastSlot: 'knife',

      fireTimer: 0, reloadTimer: 0, reloadStage: 0, deployTimer: 0,
      recoilIndex: 0, recoilYaw: 0, recoilPitch: 0, recoilTime: 0,
      fireSpread: 0, shotSeed: (Math.random() * 0x7fffffff) | 0, shotCount: 0,
      triggerHeld: false, burstLeft: 0, burstTimer: 0, chargeTime: 0,
      scoped: false, scopeLevel: 0, inspectTimer: 0,

      planting: 0, defusing: 0, useHeld: false,
      flashAmount: 0, flashTime: 0,
      burnTime: 0, burnSource: null,

      kills: 0, deaths: 0, assists: 0, score: 0, mvps: 0,
      damage: 0, headshots: 0, roundKills: 0, roundDamage: 0,
      hurtBy: {},
      lastAttacker: null,
      killStreak: 0,

      viewPunchYaw: 0, viewPunchPitch: 0,   // cosmetic flinch, not aim-affecting
      lastCmdSeq: 0
    };
    return p;
  };

  /* ---------------------------------------------------------------
   * Inventory helpers
   * ------------------------------------------------------------- */
  P.slotFor = function (p, key) {
    if (key === 'primary') return p.primary;
    if (key === 'secondary') return p.secondary;
    if (key === 'knife') return p.knife;
    if (key === 'bomb') return p.bomb ? { id: 'bomb' } : null;
    if (key.indexOf('nade:') === 0) {
      var id = key.slice(5);
      for (var i = 0; i < p.grenades.length; i++) if (p.grenades[i].id === id) return p.grenades[i];
      return null;
    }
    return null;
  };
  P.curSlot = function (p) { return P.slotFor(p, p.cur); };
  P.curWeapon = function (p) {
    var s = P.curSlot(p);
    if (!s) return W.get('knife');
    if (s.id === 'bomb') return { id: 'bomb', name: 'Explosive', cls: 'bomb', speed: 6.35, deploy: 0.4 };
    return W.get(s.id) || W.get('knife');
  };

  P.grenadeCount = function (p) {
    var n = 0;
    for (var i = 0; i < p.grenades.length; i++) n += p.grenades[i].count;
    return n;
  };

  P.giveWeapon = function (p, id, mag, reserve) {
    var w = W.get(id);
    if (!w) return false;
    if (w.cls === 'grenade') {
      for (var i = 0; i < p.grenades.length; i++) {
        if (p.grenades[i].id === id) {
          if (p.grenades[i].count >= w.max) return false;
          p.grenades[i].count++; return true;
        }
      }
      if (P.grenadeCount(p) >= W.MAX_GRENADES) return false;
      p.grenades.push({ id: id, count: 1 });
      return true;
    }
    var item = { id: id, mag: mag === undefined ? w.mag : mag, reserve: reserve === undefined ? w.reserve : reserve };
    if (w.slot === 1) { p.primary = item; P.switchTo(p, 'primary'); }
    else if (w.slot === 2) { p.secondary = item; if (!p.primary) P.switchTo(p, 'secondary'); }
    else if (w.slot === 3) p.knife = item;
    return true;
  };

  P.clearInventory = function (p) {
    p.primary = null; p.secondary = null; p.grenades = [];
    p.knife = { id: 'knife' }; p.bomb = false; p.cur = 'knife';
    p.armor = 0; p.helmet = false; p.kit = false;
  };

  /* Ordered list of selectable slots — drives the weapon wheel and 1..5 keys. */
  P.slotList = function (p) {
    var list = [];
    if (p.primary) list.push('primary');
    if (p.secondary) list.push('secondary');
    list.push('knife');
    for (var i = 0; i < p.grenades.length; i++) if (p.grenades[i].count > 0) list.push('nade:' + p.grenades[i].id);
    if (p.bomb) list.push('bomb');
    return list;
  };

  P.switchTo = function (p, key) {
    if (p.cur === key) return false;
    var s = P.slotFor(p, key);
    if (!s) return false;
    if (s.count !== undefined && s.count <= 0) return false;
    p.lastSlot = p.cur;
    p.cur = key;
    var w = P.curWeapon(p);
    p.deployTimer = w.deploy || 0.4;
    p.reloadTimer = 0; p.reloadStage = 0;
    p.recoilIndex = 0; p.fireSpread = 0;
    p.scoped = false; p.scopeLevel = 0;
    p.burstLeft = 0; p.chargeTime = 0; p.inspectTimer = 0;
    return true;
  };

  P.switchSlotNumber = function (p, n) {
    if (n === 1) return P.switchTo(p, 'primary');
    if (n === 2) return P.switchTo(p, 'secondary');
    if (n === 3) return P.switchTo(p, 'knife');
    if (n === 4) {
      // cycle through grenades
      var list = [];
      for (var i = 0; i < p.grenades.length; i++) if (p.grenades[i].count > 0) list.push('nade:' + p.grenades[i].id);
      if (!list.length) return false;
      var idx = list.indexOf(p.cur);
      return P.switchTo(p, list[(idx + 1) % list.length]);
    }
    if (n === 5) return P.switchTo(p, 'bomb');
    return false;
  };

  P.nextWeapon = function (p, dir) {
    var list = P.slotList(p);
    if (!list.length) return false;
    var i = list.indexOf(p.cur);
    if (i < 0) i = 0;
    return P.switchTo(p, list[(i + dir + list.length * 2) % list.length]);
  };

  /* ---------------------------------------------------------------
   * Spawning
   * ------------------------------------------------------------- */
  P.spawn = function (p, spot, keepInventory) {
    p.pos.x = spot.x; p.pos.y = spot.y; p.pos.z = spot.z;
    p.vel.x = p.vel.y = p.vel.z = 0;
    if (spot.yaw !== undefined) p.yaw = spot.yaw;
    p.pitch = 0;
    p.alive = true;
    p.health = C.MAX_HEALTH;
    p.onGround = false;
    p.ducking = false; p.duckAmount = 0;
    p.height = C.STAND_HEIGHT; p.eye = C.EYE_STAND;
    p.recoilYaw = p.recoilPitch = 0; p.recoilIndex = 0; p.fireSpread = 0;
    p.viewPunchYaw = p.viewPunchPitch = 0;
    p.flashAmount = 0; p.flashTime = 0; p.burnTime = 0;
    p.planting = 0; p.defusing = 0;
    p.scoped = false; p.scopeLevel = 0;
    p.deployTimer = 0.3; p.reloadTimer = 0; p.fireTimer = 0;
    p.roundKills = 0; p.roundDamage = 0;
    p.hurtBy = {}; p.lastAttacker = null;
    if (!keepInventory) { p.armor = 0; p.helmet = false; }
    p.spawnProtect = 0;
    return p;
  };

  /* ---------------------------------------------------------------
   * Movement — Source-style accelerate / friction / air control
   * ------------------------------------------------------------- */
  function accelerate(vel, wx, wz, wishSpeed, accel, dt) {
    var current = vel.x * wx + vel.z * wz;
    var addSpeed = wishSpeed - current;
    if (addSpeed <= 0) return;
    var accelSpeed = accel * wishSpeed * dt;
    if (accelSpeed > addSpeed) accelSpeed = addSpeed;
    vel.x += wx * accelSpeed;
    vel.z += wz * accelSpeed;
  }

  function airAccelerate(vel, wx, wz, wishSpeed, dt) {
    var wish = Math.min(wishSpeed, C.AIR_WISH_CAP);
    var current = vel.x * wx + vel.z * wz;
    var addSpeed = wish - current;
    if (addSpeed <= 0) return;
    var accelSpeed = C.AIR_ACCELERATE * wishSpeed * dt;
    if (accelSpeed > addSpeed) accelSpeed = addSpeed;
    vel.x += wx * accelSpeed;
    vel.z += wz * accelSpeed;
  }

  function friction(vel, dt) {
    var speed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
    if (speed < 0.05) { vel.x = 0; vel.z = 0; return; }
    var control = speed < C.STOP_SPEED ? C.STOP_SPEED : speed;
    var drop = control * C.FRICTION * dt;
    var newSpeed = Math.max(0, speed - drop) / speed;
    vel.x *= newSpeed; vel.z *= newSpeed;
  }

  P.maxSpeed = function (p) {
    var w = P.curWeapon(p);
    var s = w.speed || C.MAX_SPEED;
    if (p.scoped && w.scopeSpeed) s *= w.scopeSpeed;
    if (p.walking) s *= C.WALK_SCALE;
    if (p.ducking) s *= C.CROUCH_SCALE;
    if (p.planting > 0 || p.defusing > 0) s = 0;
    return s;
  };

  P.speed2D = function (p) { return Math.sqrt(p.vel.x * p.vel.x + p.vel.z * p.vel.z); };

  /* cmd: { forward, side, jump, duck, walk, yaw, pitch, dt } */
  P.move = function (p, cmd, world, dt, frozen) {
    if (!p.alive) return;

    p.yaw = cmd.yaw; p.pitch = cmd.pitch;

    // --- duck state
    var wantDuck = !!cmd.duck;
    p.walking = !!cmd.walk;
    var duckTarget = wantDuck ? 1 : 0;
    if (!wantDuck && p.duckAmount > 0) {
      // block standing up under low ceilings
      if (!world.canUncrouch(p.pos.x, p.pos.y, p.pos.z)) duckTarget = 1;
    }
    var duckRate = dt / C.DUCK_TIME;
    if (p.duckAmount < duckTarget) p.duckAmount = Math.min(duckTarget, p.duckAmount + duckRate);
    else if (p.duckAmount > duckTarget) p.duckAmount = Math.max(duckTarget, p.duckAmount - duckRate);
    p.ducking = p.duckAmount > 0.5;
    p.height = M.lerp(C.STAND_HEIGHT, C.CROUCH_HEIGHT, p.duckAmount);
    p.eye = M.lerp(C.EYE_STAND, C.EYE_CROUCH, p.duckAmount);

    if (frozen) { p.vel.x = 0; p.vel.z = 0; cmd = { forward: 0, side: 0, jump: false, duck: cmd.duck, walk: cmd.walk, yaw: cmd.yaw, pitch: cmd.pitch }; }

    // --- wish direction in world space
    var f = cmd.forward || 0, s = cmd.side || 0;
    var len = Math.sqrt(f * f + s * s);
    var wx = 0, wz = 0;
    if (len > 0.001) {
      f /= Math.max(1, len); s /= Math.max(1, len);
      var cy = Math.cos(p.yaw), sy = Math.sin(p.yaw);
      // forward = (cos yaw, -sin yaw); right = (sin yaw, cos yaw)
      wx = cy * f + sy * s;
      wz = -sy * f + cy * s;
      var wl = Math.sqrt(wx * wx + wz * wz);
      if (wl > 0.0001) { wx /= wl; wz /= wl; }
    }
    var wishSpeed = (len > 0.001 ? 1 : 0) * P.maxSpeed(p);

    p.jumpCooldown = Math.max(0, p.jumpCooldown - dt);
    p.landTimer = Math.max(0, p.landTimer - dt);

    if (p.onGround) {
      friction(p.vel, dt);
      accelerate(p.vel, wx, wz, wishSpeed, C.ACCELERATE, dt);
      p.vel.y = 0;
      if (cmd.jump && p.jumpCooldown <= 0 && !frozen) {
        p.vel.y = C.JUMP_SPEED;
        p.onGround = false;
        p.jumpCooldown = C.JUMP_COOLDOWN;
        p.justJumped = true;
      }
    } else {
      airAccelerate(p.vel, wx, wz, wishSpeed, dt);
      p.vel.y -= C.GRAVITY * dt;
      var air = Math.sqrt(p.vel.x * p.vel.x + p.vel.z * p.vel.z);
      if (air > C.MAX_AIR_SPEED) { var k = C.MAX_AIR_SPEED / air; p.vel.x *= k; p.vel.z *= k; }
    }

    var preVelY = p.vel.y;
    var wasAir = !p.onGround;
    world.moveEntity(p, dt, C.PLAYER_RADIUS, p.height, C.STEP_HEIGHT);

    if (wasAir && p.onGround) {
      p.landTimer = 0.35;
      var impact = -preVelY;
      if (impact > C.FALL_DAMAGE_START) {
        p.pendingFallDamage = (impact - C.FALL_DAMAGE_START) * C.FALL_DAMAGE_SCALE;
      }
    }

    // footstep accumulator (audio is emitted by the caller)
    var sp = P.speed2D(p);
    if (p.onGround && sp > 0.4) p.stepDist += sp * dt;
    else if (!p.onGround) p.stepDist = 0;
  };

  /* Distance between footfalls — walking is silent, running is loud. */
  P.footstepInterval = function (p) {
    var sp = P.speed2D(p);
    if (sp < 0.6) return 1e9;
    return M.clamp(2.05 - sp * 0.06, 1.35, 2.0);
  };
  P.footstepVolume = function (p) {
    var sp = P.speed2D(p), mx = C.MAX_SPEED;
    if (p.walking || sp < mx * 0.42) return 0;            // shift-walk makes no sound
    return M.clamp((sp / mx - 0.4) * 1.7, 0, 1);
  };

  /* ---------------------------------------------------------------
   * Weapon state machine
   * ------------------------------------------------------------- */
  P.canAct = function (p) {
    return p.alive && p.deployTimer <= 0 && p.reloadTimer <= 0;
  };

  P.updateWeapon = function (p, dt) {
    p.fireTimer = Math.max(0, p.fireTimer - dt);
    p.deployTimer = Math.max(0, p.deployTimer - dt);
    p.burstTimer = Math.max(0, p.burstTimer - dt);
    p.inspectTimer = Math.max(0, p.inspectTimer - dt);
    p.spawnProtect = Math.max(0, p.spawnProtect - dt);

    var w = P.curWeapon(p);

    if (p.reloadTimer > 0) {
      p.reloadTimer -= dt;
      if (p.reloadTimer <= 0) P.finishReload(p);
    }

    // recoil recovery — the view walks back to where you were aiming
    var rec = w.recovery || 0.32;
    if (p.recoilTime > 0) p.recoilTime -= dt;
    if (p.recoilTime <= 0) {
      var k = Math.pow(0.0008, dt / Math.max(0.05, rec));
      p.recoilYaw *= k; p.recoilPitch *= k;
      if (Math.abs(p.recoilYaw) < 0.002) p.recoilYaw = 0;
      if (Math.abs(p.recoilPitch) < 0.002) p.recoilPitch = 0;
      if (p.recoilYaw === 0 && p.recoilPitch === 0) p.recoilIndex = 0;
    }

    // firing inaccuracy bleeds off
    if (w.inaccDecay !== undefined) {
      p.fireSpread *= Math.pow(w.inaccDecay, dt);
      if (Math.abs(p.fireSpread) < 0.004) p.fireSpread = 0;
    }

    // cosmetic flinch
    p.viewPunchYaw = M.damp(p.viewPunchYaw, 0, 0.0001, dt);
    p.viewPunchPitch = M.damp(p.viewPunchPitch, 0, 0.0001, dt);

    // flash blindness
    if (p.flashAmount > 0) {
      p.flashTime -= dt;
      if (p.flashTime <= 0) p.flashAmount = Math.max(0, p.flashAmount - dt * 1.35);
    }
  };

  P.needsReload = function (p) {
    var s = P.curSlot(p); var w = P.curWeapon(p);
    return s && s.mag !== undefined && w.mag > 0 && s.mag <= 0 && s.reserve > 0;
  };

  P.startReload = function (p) {
    if (!P.canAct(p)) return false;
    var s = P.curSlot(p), w = P.curWeapon(p);
    if (!s || s.mag === undefined || w.mag <= 0) return false;
    if (s.mag >= w.mag || s.reserve <= 0) return false;
    p.scoped = false; p.scopeLevel = 0;
    if (w.shellReload) { p.reloadStage = 1; p.reloadTimer = w.reload; }
    else { p.reloadStage = 0; p.reloadTimer = w.reload; }
    return true;
  };

  P.finishReload = function (p) {
    var s = P.curSlot(p), w = P.curWeapon(p);
    if (!s || s.mag === undefined) return;
    if (w.shellReload) {
      // one shell at a time: keep going until full or the trigger interrupts
      if (s.mag < w.mag && s.reserve > 0) { s.mag++; s.reserve--; }
      if (s.mag < w.mag && s.reserve > 0 && p.reloadStage === 1) { p.reloadTimer = w.reload; return; }
      p.reloadStage = 0;
    } else {
      var need = w.mag - s.mag;
      var take = Math.min(need, s.reserve);
      s.mag += take; s.reserve -= take;
    }
    p.reloadTimer = 0;
  };

  P.cancelReload = function (p) {
    if (p.reloadTimer > 0 && P.curWeapon(p).shellReload) { p.reloadStage = 0; p.reloadTimer = 0; return true; }
    return false;
  };

  /* Current cone half-angle in radians. */
  P.inaccuracy = function (p) {
    var w = P.curWeapon(p);
    return W.inaccuracy(w, {
      speed: P.speed2D(p),
      maxSpeed: C.MAX_SPEED,
      onGround: p.onGround,
      ducking: p.ducking,
      fireSpread: p.fireSpread,
      scoped: p.scoped,
      justLanded: p.landTimer > 0
    });
  };

  /* Aim direction including accumulated recoil. */
  P.aimAngles = function (p) {
    return { yaw: p.yaw + p.recoilYaw * M.DEG, pitch: M.clamp(p.pitch + p.recoilPitch * M.DEG, -Math.PI / 2 + 0.01, Math.PI / 2 - 0.01) };
  };
  P.eyePos = function (p, out) {
    out = out || { x: 0, y: 0, z: 0 };
    out.x = p.pos.x; out.y = p.pos.y + p.eye; out.z = p.pos.z;
    return out;
  };

  /* Attempt to fire. Returns a shot descriptor the caller resolves, or null. */
  P.tryFire = function (p, secondary) {
    if (!p.alive || p.deployTimer > 0) return null;
    var w = P.curWeapon(p);
    var s = P.curSlot(p);

    if (w.cls === 'grenade') return null;         // grenades are thrown, not fired
    if (w.id === 'bomb') return null;

    if (p.reloadTimer > 0) {
      if (!P.cancelReload(p)) return null;
    }
    if (p.fireTimer > 0) return null;

    if (w.cls === 'knife') {
      p.fireTimer = 60 / (secondary ? (w.secondaryRpm || 70) : w.rpm);
      return { melee: true, secondary: !!secondary, weapon: w };
    }

    if (s.mag !== undefined && s.mag <= 0) {
      p.fireTimer = 0.2;
      return { dryFire: true, weapon: w };
    }

    // semi-auto guns need the trigger released between shots; a burst is exempt
    if (!w.auto && p.triggerHeld && !(secondary && p.burstLeft > 0)) return null;

    if (s.mag !== undefined) s.mag--;
    p.fireTimer = (secondary && w.burst && p.burstLeft > 1) ? w.interval * 0.62 : w.interval;
    if (!secondary) p.triggerHeld = true;

    var aim = P.aimAngles(p);
    var cone = P.inaccuracy(p);
    var shot = {
      weapon: w,
      yaw: aim.yaw, pitch: aim.pitch,
      cone: cone,
      seed: (p.shotSeed + p.shotCount * 2654435761) | 0,
      index: p.shotCount,
      pellets: w.pellets || 1,
      recoilIndex: p.recoilIndex
    };
    p.shotCount = (p.shotCount + 1) | 0;

    // recoil + accumulated inaccuracy
    var step = W.recoilStep(w, p.recoilIndex);
    p.recoilIndex++;
    p.recoilYaw += step.x;
    p.recoilPitch += step.y;
    p.recoilTime = Math.max(0.12, w.interval * 1.8);
    p.fireSpread = M.clamp(p.fireSpread + (w.inaccFireAdd || 0.5),
      w.inaccFireMin !== undefined ? w.inaccFireMin : 0, w.inaccFireMax || 6);

    if (p.scoped && (w.cls === 'sniper') && w.bolt) {
      p.fireTimer = Math.max(p.fireTimer, w.bolt);
    }
    if (w.cls === 'sniper' && w.bolt) p.scopedRecover = w.bolt * 0.6;

    return shot;
  };

  P.releaseTrigger = function (p) { p.triggerHeld = false; };

  P.toggleScope = function (p) {
    var w = P.curWeapon(p);
    if (!w.scope || !w.scope.length) return false;
    if (!p.scoped) { p.scoped = true; p.scopeLevel = 0; }
    else if (p.scopeLevel + 1 < w.scope.length) p.scopeLevel++;
    else { p.scoped = false; p.scopeLevel = 0; }
    return true;
  };
  P.zoomFactor = function (p) {
    var w = P.curWeapon(p);
    if (!p.scoped || !w.scope) return 1;
    return w.scope[p.scopeLevel] || 1;
  };

  /* ---------------------------------------------------------------
   * Damage
   * ------------------------------------------------------------- */
  P.applyDamage = function (p, healthDmg, armorDmg, attackerId, hitgroup, now) {
    if (!p.alive) return 0;
    var before = p.health;
    p.armor = Math.max(0, p.armor - armorDmg);
    p.health -= healthDmg;
    if (attackerId && attackerId !== p.id) {
      p.hurtBy[attackerId] = (p.hurtBy[attackerId] || 0) + Math.min(before, healthDmg);
      p.lastAttacker = attackerId;
      p.lastHurtTime = now;
    }
    // aim flinch — enough to feel, not enough to be uncontrollable
    var flinch = Math.min(2.2, healthDmg * 0.045);
    p.viewPunchPitch -= flinch;
    p.viewPunchYaw += (M.hash01(p.shotCount, (now * 1000) | 0) - 0.5) * flinch * 1.4;
    if (p.health <= 0) { p.health = 0; p.alive = false; }
    return Math.min(before, healthDmg);
  };

  /* ---------------------------------------------------------------
   * Economy / buying
   * ------------------------------------------------------------- */
  P.canBuy = function (p, id, world, rules, inBuyTime) {
    var w = W.get(id);
    if (!w || !p.alive) return { ok: false, why: 'unavailable' };
    if (!inBuyTime) return { ok: false, why: 'Buy time is over' };
    if (!world.inBuyZone(p.team, p.pos.x, p.pos.y, p.pos.z)) return { ok: false, why: 'Not in the buy zone' };
    if (w.teams.indexOf(p.team) < 0) return { ok: false, why: 'Not available to your team' };
    var price = P.priceFor(p, w);
    if (!rules.infiniteMoney && p.money < price) return { ok: false, why: 'Not enough money' };

    if (w.cls === 'grenade') {
      if (P.grenadeCount(p) >= W.MAX_GRENADES) return { ok: false, why: 'Grenade limit reached' };
      for (var i = 0; i < p.grenades.length; i++) {
        if (p.grenades[i].id === id && p.grenades[i].count >= w.max) return { ok: false, why: 'Already carrying the maximum' };
      }
    }
    if (w.gear === 'kit' && p.kit) return { ok: false, why: 'Already have a kit' };
    if (w.gear === 'armor' && p.armor >= C.MAX_ARMOR && !p.helmet) return { ok: false, why: 'Armour already full' };
    if (w.gear === 'helmet' && p.armor >= C.MAX_ARMOR && p.helmet) return { ok: false, why: 'Already fully equipped' };
    return { ok: true, price: price };
  };

  /* Buying a vest you partly own only charges for the helmet. */
  P.priceFor = function (p, w) {
    if (w.gear === 'helmet' && p.armor > 0 && !p.helmet) return 350;
    return w.price;
  };

  P.buy = function (p, id, world, rules, inBuyTime) {
    var check = P.canBuy(p, id, world, rules, inBuyTime);
    if (!check.ok) return check;
    var w = W.get(id);
    if (!rules.infiniteMoney) p.money -= check.price;

    if (w.gear === 'armor') { p.armor = C.MAX_ARMOR; }
    else if (w.gear === 'helmet') { p.armor = C.MAX_ARMOR; p.helmet = true; }
    else if (w.gear === 'kit') { p.kit = true; }
    else {
      var dropped = null;
      if (w.slot === 1 && p.primary) dropped = p.primary;
      if (w.slot === 2 && p.secondary) dropped = p.secondary;
      P.giveWeapon(p, id);
      check.dropped = dropped;
    }
    check.bought = id;
    return check;
  };

  P.addMoney = function (p, amount, rules) {
    p.money = M.clamp(p.money + amount, 0, (rules && rules.maxMoney) || C.DEFAULT_RULES.maxMoney);
  };

  /* ---------------------------------------------------------------
   * Dropping / picking up
   * ------------------------------------------------------------- */
  P.dropCurrent = function (p) {
    var key = p.cur;
    if (key === 'knife') return null;
    if (key === 'bomb') { p.bomb = false; P.switchTo(p, P.slotList(p)[0] || 'knife'); return { id: 'bomb' }; }
    if (key.indexOf('nade:') === 0) return null;      // grenades are used, not dropped
    var item = P.slotFor(p, key);
    if (!item) return null;
    if (key === 'primary') p.primary = null; else p.secondary = null;
    var list = P.slotList(p);
    P.switchTo(p, list.length ? list[0] : 'knife');
    if (p.cur === key) p.cur = 'knife';
    return item;
  };

  P.pickup = function (p, item) {
    var w = W.get(item.id);
    if (!w) return false;
    if (w.slot === 1) {
      if (p.primary) return false;
      p.primary = { id: item.id, mag: item.mag, reserve: item.reserve };
      P.switchTo(p, 'primary');
      return true;
    }
    if (w.slot === 2) {
      if (p.secondary) return false;
      p.secondary = { id: item.id, mag: item.mag, reserve: item.reserve };
      return true;
    }
    return false;
  };

  /* ---------------------------------------------------------------
   * Serialisation for the network layer
   * ------------------------------------------------------------- */
  P.snapshot = function (p) {
    return [
      p.id, p.team, p.alive ? 1 : 0,
      Math.round(p.pos.x * 64), Math.round(p.pos.y * 64), Math.round(p.pos.z * 64),
      Math.round(p.yaw * 1000), Math.round(p.pitch * 1000),
      Math.round(p.health), Math.round(p.armor),
      (p.ducking ? 1 : 0) | (p.onGround ? 2 : 0) | (p.helmet ? 4 : 0) | (p.bomb ? 8 : 0) | (p.walking ? 16 : 0) | (p.scoped ? 32 : 0),
      P.curSlot(p) ? (P.curWeapon(p).id) : 'knife',
      Math.round(P.speed2D(p) * 16),
      Math.round(p.duckAmount * 100)
    ];
  };

  P.applySnapshot = function (p, s) {
    p.team = s[1]; p.alive = !!s[2];
    p.pos.x = s[3] / 64; p.pos.y = s[4] / 64; p.pos.z = s[5] / 64;
    p.yaw = s[6] / 1000; p.pitch = s[7] / 1000;
    p.health = s[8]; p.armor = s[9];
    var fl = s[10];
    p.ducking = !!(fl & 1); p.onGround = !!(fl & 2); p.helmet = !!(fl & 4);
    p.bomb = !!(fl & 8); p.walking = !!(fl & 16); p.scoped = !!(fl & 32);
    p.netWeapon = s[11];
    p.netSpeed = s[12] / 16;
    p.duckAmount = s[13] / 100;
    p.height = M.lerp(C.STAND_HEIGHT, C.CROUCH_HEIGHT, p.duckAmount);
    p.eye = M.lerp(C.EYE_STAND, C.EYE_CROUCH, p.duckAmount);
  };

  CS.P = P;
})(typeof window !== 'undefined' ? window : globalThis);
