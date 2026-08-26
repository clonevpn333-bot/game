/* =========================================================================
 * BOSS FIGHTS — the dragon's crystals and flight pattern, summoning the
 * Wither, the Warden's sculk senses, and sleeping through the night.
 * ========================================================================= */

/* -------------------------------------------------------- ender dragon -- */
function updateDragonFight(game, dt) {
  var list = game.entities;
  var dragon = null, crystals = [];
  for (var i = 0; i < list.length; i++) {
    var e = list[i];
    if (e.dead || e.remove) continue;
    if (e.type === 'ender_dragon') dragon = e;
    else if (e.type === 'end_crystal') crystals.push(e);
  }
  if (!dragon) return;
  var p = game.player;

  /* a living crystal feeds the dragon; the beam gives the player a target */
  dragon.healSource = null;
  if (crystals.length) {
    var best = null, bestD = 1e9;
    for (var c = 0; c < crystals.length; c++) {
      var d2 = (crystals[c].x - dragon.x) * (crystals[c].x - dragon.x) + (crystals[c].z - dragon.z) * (crystals[c].z - dragon.z);
      if (d2 < bestD) { bestD = d2; best = crystals[c]; }
    }
    dragon.healSource = best;
    dragon.healT = (dragon.healT || 0) + dt;
    if (dragon.healT > 0.5) {
      dragon.healT = 0;
      dragon.hp = Math.min(dragon.maxHp, dragon.hp + 1);
    }
    if (Math.random() < dt * 26) {
      var t = Math.random();
      spawnParticle(game, dragon.dim,
        best.x + (dragon.x - best.x) * t, best.y + 1.4 + (dragon.y + 1 - best.y - 1.4) * t,
        best.z + (dragon.z - best.z) * t, 0, 0.2, 0, 0.85, 0.35, 0.95, 0.10, 0.5);
    }
  }

  /* flight: wide circles over the pillars, diving at the player now and then */
  dragon.phaseT = (dragon.phaseT || 0) - dt;
  if (dragon.phaseT <= 0) {
    if (dragon.phase === 'dive') { dragon.phase = 'circle'; dragon.phaseT = 8 + Math.random() * 8; }
    else { dragon.phase = crystals.length ? 'circle' : 'dive'; dragon.phaseT = 6 + Math.random() * 6; }
  }
  if (dragon.phase === 'circle' || !dragon.phase) {
    dragon.orbit = (dragon.orbit || 0) + dt * 0.45;
    var r = 44;
    dragon.wx = Math.cos(dragon.orbit) * r;
    dragon.wz = Math.sin(dragon.orbit) * r;
    dragon.wy = 112 + Math.sin(dragon.orbit * 1.7) * 8;
    dragon.target = null;
  } else {
    dragon.target = p.dim === dragon.dim && !p.dead ? p : null;
  }

  /* the dragon breathes on you when it is close and not orbiting */
  dragon.breathCool = (dragon.breathCool || 0) - dt;
  if (dragon.phase === 'dive' && p.dim === dragon.dim && dragon.breathCool <= 0) {
    var pd = Math.hypot(p.x - dragon.x, p.z - dragon.z);
    if (pd < 26) {
      dragon.breathCool = 5;
      fireProjectile(game, dragon, 'ghast_fireball', p);
      playSound(game, 'bossroar', dragon.x, dragon.y, dragon.z);
    }
  }
}
/* the crystal explodes when hit and stops feeding the dragon */
function onCrystalDestroyed(game, e) {
  explode(game, e.x, e.y + 0.6, e.z, 3.2, e.dim);
}

/* ------------------------------------------------------------- wither -- */
/* three wither skulls on a T of soul sand, exactly as it has always been. */
function checkWitherSummon(game, dim, x, y, z) {
  var w = game.world;
  var SK = BID.wither_skeleton_skull, SS = BID.soul_sand, SO = BID.soul_soil;
  if (SK === undefined) return false;
  function soul(bx, by, bz) { var id = w.getId(dim, bx, by, bz); return id === SS || id === SO; }
  function skull(bx, by, bz) { return w.getId(dim, bx, by, bz) === SK; }
  /* the placed skull can be any of the three, so test both orientations from
     each possible centre */
  for (var ox = -1; ox <= 1; ox++) for (var axis = 0; axis < 2; axis++) {
    var cx = x - (axis === 0 ? ox : 0), cz = z - (axis === 1 ? ox : 0);
    var dx = axis === 0 ? 1 : 0, dz = axis === 1 ? 1 : 0;
    if (!skull(cx, y, cz) || !skull(cx - dx, y, cz - dz) || !skull(cx + dx, y, cz + dz)) continue;
    if (!soul(cx, y - 1, cz) || !soul(cx, y - 2, cz)) continue;
    if (!soul(cx - dx, y - 1, cz - dz) || !soul(cx + dx, y - 1, cz + dz)) continue;
    /* clear the frame and let it loose */
    for (var i = -1; i <= 1; i++) {
      w.setBlock(dim, cx + dx * i, y, cz + dz * i, 0);
      w.setBlock(dim, cx + dx * i, y - 1, cz + dz * i, 0);
    }
    w.setBlock(dim, cx, y - 2, cz, 0);
    var e = makeEntity('wither', dim, cx + 0.5, y - 2, cz + 0.5, { persist: true, spawnT: 0, invulnT: 8 });
    e.hp = 150;
    game.entities.push(e);
    game.shake = 1.0;
    playSound(game, 'bossroar', cx, y, cz, 0.7);
    logMessage(game, 'The Wither has been summoned!', '#ff6666');
    return true;
  }
  return false;
}
function updateWither(game, e, dt) {
  if (e.invulnT > 0) {
    e.invulnT -= dt;
    e.hp = Math.min(e.maxHp, e.hp + e.maxHp / 8 * dt);
    e.armsUp = true;
    if (Math.random() < dt * 30)
      spawnParticle(game, e.dim, e.x + (Math.random() - 0.5) * 3, e.y + 2 + Math.random() * 2, e.z + (Math.random() - 0.5) * 3,
        0, 1, 0, 0.25, 0.25, 0.25, 0.12, 0.9);
    if (e.invulnT <= 0) { explode(game, e.x, e.y + 2, e.z, 5, e.dim); playSound(game, 'bossroar', e.x, e.y, e.z); }
    return true;                 /* skip normal AI while charging up */
  }
  /* second phase: below half health it dives and gains armour */
  if (e.hp < e.maxHp * 0.5) e.phase2 = true;
  return false;
}

/* ------------------------------------------------------------- warden -- */
/* The warden is blind; it homes in on noise instead of sight. */
function wardenSense(game, e, dt) {
  var p = game.player;
  if (p.dim !== e.dim) return;
  var d = Math.hypot(p.x - e.x, p.z - e.z);
  var noisy = Math.hypot(p.vx, p.vz) > 2.0 || p.sprinting || (p.breaking && p.breakProgress > 0);
  e.anger = e.anger || 0;
  if (d < 24 && noisy) e.anger = Math.min(100, e.anger + dt * 32);
  else if (d < 6) e.anger = Math.min(100, e.anger + dt * 18);
  else e.anger = Math.max(0, e.anger - dt * 3);
  e.target = e.anger > 40 ? p : null;
  if (e.anger > 80 && !e.roaring) { e.roaring = 1.4; playSound(game, 'bossroar', e.x, e.y, e.z, 0.8); }
  if (e.roaring > 0) e.roaring -= dt;
  if (Math.random() < dt * (2 + e.anger * 0.06))
    spawnParticle(game, e.dim, e.x + (Math.random() - 0.5), e.y + 2.4, e.z + (Math.random() - 0.5), 0, 0.7, 0, 0.15, 0.75, 0.8, 0.06, 0.8);
}

/* -------------------------------------------------------------- sleep -- */
function trySleepInBed(game, hit) {
  var p = game.player;
  if (game.isDay && !(game.weather.rain > 0.6)) {
    logMessage(game, 'You can only sleep at night or during a storm.', '#ff9955');
    return false;
  }
  var hostileNear = false;
  for (var i = 0; i < game.entities.length; i++) {
    var e = game.entities[i];
    if (e.dim !== p.dim || e.dead) continue;
    if (!MOBS[e.type].hostile) continue;
    if (Math.hypot(e.x - p.x, e.y - p.y, e.z - p.z) < 8) { hostileNear = true; break; }
  }
  if (hostileNear) {
    logMessage(game, 'You may not rest now, there are monsters nearby.', '#ff9955');
    return false;
  }
  p.spawnX = hit.x; p.spawnY = hit.y + 1; p.spawnZ = hit.z; p.spawnDim = p.dim;
  game.sleepPos = { x: hit.x, y: hit.y, z: hit.z };
  game.sleepTotal = 3.2;
  game.sleeping = game.sleepTotal;
  game.sleepFrom = { pitch: p.pitch, yaw: p.yaw };
  logMessage(game, 'Respawn point set.', '#aaffaa');
  unlockAch(game, 'bed');
  return true;
}
function updateSleep(game, dt) {
  if (!game.sleeping) return;
  var p = game.player, sp = game.sleepPos;
  game.sleeping -= dt;
  var total = game.sleepTotal || 3.2;
  var k = Math.max(0, Math.min(1, 1 - game.sleeping / total));
  /* lie back on the pillow: the camera settles onto the bed and tips up to
     the ceiling while the screen fades out and back in */
  if (sp) {
    p.x = sp.x + 0.5; p.z = sp.z + 0.5;
    p.vx = p.vy = p.vz = 0;
    var ease = k < 0.30 ? k / 0.30 : 1;
    ease = ease * ease * (3 - 2 * ease);
    p.y = sp.y + 0.62;
    p.camY = p.y + 0.35 * (1 - ease);
    p.pitch = (game.sleepFrom ? game.sleepFrom.pitch : 0) * (1 - ease) - 0.95 * ease;
  }
  game.sleepFade = k < 0.30 ? k / 0.30 : (k > 0.78 ? Math.max(0, (1 - k) / 0.22) : 1);
  /* run the clock forward fast, and clear the weather on waking */
  game.dayTime = (game.dayTime + dt * 9000) % 24000;
  if (game.sleeping <= 0) {
    game.sleeping = 0;
    game.sleepFade = 0; game.sleepPos = null;
    game.dayTime = 100;
    game.weather.targetRain = 0;
    game.weather.rain = 0;
    game.player.hp = Math.min(game.player.maxHp, game.player.hp + 3);
    logMessage(game, 'Good morning.', '#ffffcc');
  }
}
