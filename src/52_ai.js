/* =========================================================================
 * ENTITIES — physics, AI, spawning, damage and drops.
 * ========================================================================= */

var _eid = 1;
function makeEntity(type, dim, x, y, z, opts) {
  var def = MOBS[type];
  var e = {
    id: _eid++, type: type, dim: dim, x: x, y: y, z: z,
    vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0, headYaw: 0, headPitch: 0,
    w: def.w, h: def.h, onGround: false, inWater: false, inLava: false,
    hp: def.hp, maxHp: def.hp, hurtTime: 0, deathTime: 0, dead: false,
    walkAmt: 0, walkPhase: 0, attackTime: 0, aiming: 0, casting: 0, fuseTime: 0,
    target: null, targetTime: 0, wanderT: 0, wx: 0, wz: 0, jumpCool: 0,
    seed: Math.random() * 100, age: 0, baby: false, angry: false,
    fireTime: 0, airTime: 300, tint: null, persist: false, sitting: false,
    tamed: false, item: null, count: 0, pickupDelay: 0, life: 0
  };
  if (opts) for (var k in opts) e[k] = opts[k];
  if (e.baby) { e.w *= 0.55; e.h *= 0.55; }
  return e;
}

/* ------------------------------------------------------- block shapes -- */
function blockBoxesFor(id, st) {
  var b = BLOCKS[id];
  if (!b || !b.collide) return null;
  if (b.render === 'cube' || b.render === 'liquid') return b.solid ? FULLBOX1 : null;
  var boxes = modelFor(id, st);
  if (boxes === null) {
    if (b.render === 'fence' || b.render === 'gate' || b.render === 'wall')
      return [[0.25, 0, 0.25, 0.75, 1.5, 0.75]];
    if (b.render === 'pane') return [[0.4375, 0, 0.4375, 0.5625, 1, 0.5625]];
    if (b.render === 'stairs') return FULLBOX1;
    return null;
  }
  var out = [];
  for (var i = 0; i < boxes.length; i++) {
    var q = boxes[i];
    out.push([q.x0 / 16, q.y0 / 16, q.z0 / 16, q.x1 / 16, q.y1 / 16, q.z1 / 16]);
  }
  return out.length ? out : null;
}
var FULLBOX1 = [[0, 0, 0, 1, 1, 1]];

/* Sweep an AABB through the world, one axis at a time. */
function collideAxis(world, dim, e, dx, dy, dz) {
  var hw = e.w / 2;
  var minX = Math.floor(e.x - hw + Math.min(0, dx)) - 1;
  var maxX = Math.floor(e.x + hw + Math.max(0, dx)) + 1;
  var minY = Math.floor(e.y + Math.min(0, dy)) - 1;
  var maxY = Math.floor(e.y + e.h + Math.max(0, dy)) + 1;
  var minZ = Math.floor(e.z - hw + Math.min(0, dz)) - 1;
  var maxZ = Math.floor(e.z + hw + Math.max(0, dz)) + 1;
  var boxes = [];
  for (var y = minY; y <= maxY; y++) for (var z = minZ; z <= maxZ; z++) for (var x = minX; x <= maxX; x++) {
    var raw = world.getRaw(dim, x, y, z);
    var id = raw & ID_MASK;
    if (id === 0) continue;
    var bb = blockBoxesFor(id, (raw >>> ST_SHIFT) & 15);
    if (!bb) continue;
    for (var i = 0; i < bb.length; i++) {
      boxes.push(x + bb[i][0], y + bb[i][1], z + bb[i][2], x + bb[i][3], y + bb[i][4], z + bb[i][5]);
    }
  }
  var n = boxes.length / 6;
  /* Y first, so walking off a ledge behaves */
  if (dy !== 0) {
    for (var k = 0; k < n; k++) {
      var o = k * 6;
      if (e.x + hw <= boxes[o] || e.x - hw >= boxes[o + 3]) continue;
      if (e.z + hw <= boxes[o + 2] || e.z - hw >= boxes[o + 5]) continue;
      if (dy < 0 && e.y >= boxes[o + 4] - 1e-6) dy = Math.max(dy, boxes[o + 4] - e.y);
      else if (dy > 0 && e.y + e.h <= boxes[o + 1] + 1e-6) dy = Math.min(dy, boxes[o + 1] - (e.y + e.h));
    }
  }
  e.y += dy;
  if (dx !== 0) {
    for (var k2 = 0; k2 < n; k2++) {
      var o2 = k2 * 6;
      if (e.y + e.h <= boxes[o2 + 1] || e.y >= boxes[o2 + 4]) continue;
      if (e.z + hw <= boxes[o2 + 2] || e.z - hw >= boxes[o2 + 5]) continue;
      if (dx < 0 && e.x - hw >= boxes[o2 + 3] - 1e-6) dx = Math.max(dx, boxes[o2 + 3] - (e.x - hw));
      else if (dx > 0 && e.x + hw <= boxes[o2] + 1e-6) dx = Math.min(dx, boxes[o2] - (e.x + hw));
    }
  }
  e.x += dx;
  if (dz !== 0) {
    for (var k3 = 0; k3 < n; k3++) {
      var o3 = k3 * 6;
      if (e.y + e.h <= boxes[o3 + 1] || e.y >= boxes[o3 + 4]) continue;
      if (e.x + hw <= boxes[o3] || e.x - hw >= boxes[o3 + 3]) continue;
      if (dz < 0 && e.z - hw >= boxes[o3 + 5] - 1e-6) dz = Math.max(dz, boxes[o3 + 5] - (e.z - hw));
      else if (dz > 0 && e.z + hw <= boxes[o3 + 2] + 1e-6) dz = Math.min(dz, boxes[o3 + 2] - (e.z + hw));
    }
  }
  e.z += dz;
  return { dx: dx, dy: dy, dz: dz };
}

function liquidAt(world, dim, x, y, z) {
  var id = world.getId(dim, Math.floor(x), Math.floor(y), Math.floor(z));
  var b = BLOCKS[id];
  return b && b.liquid ? b.liquid : null;
}

/* ================================= AI =================================== */
function updateEntity(game, e, dt) {
  var world = game.world, def = MOBS[e.type];
  e.age += dt;
  if (e.hurtTime > 0) e.hurtTime -= dt;
  if (e.attackTime > 0) e.attackTime -= dt;
  if (e.aiming > 0) e.aiming -= dt;
  if (e.casting > 0) e.casting -= dt;
  if (e.jumpCool > 0) e.jumpCool -= dt;
  if (e.pickupDelay > 0) e.pickupDelay -= dt;

  if (e.dead) {
    e.deathTime += dt;
    if (e.deathTime > 1.0) e.remove = true;
    applyPhysics(game, e, dt, def);
    return;
  }

  if (def.isItem || def.isXP) { updateItemEntity(game, e, dt, def); return; }
  if (def.projectile) { updateProjectile(game, e, dt, def); return; }
  if (def.primed) { updatePrimedTNT(game, e, dt); return; }
  if (def.falling) { updateFallingBlock(game, e, dt); return; }

  if (e.type === 'wither' && typeof updateWither === 'function' && updateWither(game, e, dt)) { applyPhysics(game, e, dt, def); return; }
  if (e.type === 'warden' && typeof wardenSense === 'function') wardenSense(game, e, dt);

  var p = game.player;
  var toP = null, distP = 1e9;
  if (p.dim === e.dim && !p.dead) {
    var dx = p.x - e.x, dy = (p.y + 0.9) - (e.y + e.h * 0.5), dz = p.z - e.z;
    distP = Math.sqrt(dx * dx + dy * dy + dz * dz);
    toP = [dx, dy, dz];
  }

  /* --- target acquisition --- */
  var aggro = def.aggro || (def.boss ? 42 : 16);
  var wantsTarget = def.hostile && !def.static && !(def.neutral && !e.angry) &&
    !(def.neutralInLight && game.world.getLight(e.dim, Math.floor(e.x), Math.floor(e.y), Math.floor(e.z)) >> 4 > 8 && !e.angry);
  if (def.defender && !e.angry) wantsTarget = false;
  if (def.blind) wantsTarget = false;   /* the warden hunts by sound, set above */
  if (wantsTarget && toP && distP < aggro) {
    if (def.type === 'enderman' && !e.angry) {
      /* the stare mechanic: only aggravated when the player looks at it */
      if (playerLookingAt(p, e) && distP < 24) { e.angry = true; e.screamT = 0.6; }
    } else e.target = p;
  } else if (!wantsTarget) e.target = null;
  if (e.angry && toP && distP < 40) e.target = p;
  if (e.target && (distP > aggro * 2.2 || p.dead)) { e.target = null; if (def.neutral) e.angry = false; }

  /* --- movement decision --- */
  var mvX = 0, mvZ = 0, speed = def.speed;
  if (e.target) {
    var tx = e.target.x - e.x, tz = e.target.z - e.z;
    var d = Math.hypot(tx, tz) || 1;
    var wantDist = def.ranged ? Math.min(def.shootRange * 0.55, 8) : 0.4;
    if (def.explodes) wantDist = 0.2;
    if (d > wantDist) { mvX = tx / d; mvZ = tz / d; }
    else if (def.ranged && d < wantDist * 0.6) { mvX = -tx / d * 0.6; mvZ = -tz / d * 0.6; }
    e.yaw = Math.atan2(tx, -tz);
    e.headYaw = 0;
    e.headPitch = clamp(-Math.atan2(e.target.y + 1 - (e.y + e.h), d), -0.9, 0.9);
    speed *= 1.25;

    /* attacks */
    if (def.explodes) {
      if (d < 3.2) { e.fuseTime += dt; if (e.fuseTime >= def.fuse) { explode(game, e.x, e.y + 0.5, e.z, def.blastRadius, e.dim); e.remove = true; return; } }
      else e.fuseTime = Math.max(0, e.fuseTime - dt * 1.5);
    } else if (def.ranged) {
      e.shootCool = (e.shootCool || 0) - dt;
      if (d < def.shootRange && e.shootCool <= 0 && hasLineOfSight(world, e, e.target)) {
        e.shootCool = def.ranged === 'beam' ? 2.6 : (def.boss ? 1.2 : 2.0);
        e.aiming = 0.6; e.casting = 0.6;
        fireProjectile(game, e, def.ranged, e.target);
      }
    } else if (d < (e.w + 0.9) && e.attackTime <= 0) {
      e.attackTime = 0.5;
      damageEntity(game, e.target, def.dmg, e);
    }
  } else if (!def.static) {
    /* wander */
    e.wanderT -= dt;
    if (e.wanderT <= 0) {
      e.wanderT = 3 + Math.random() * 6;
      if (Math.random() < (def.fly || def.water ? 0.85 : 0.55)) {
        var a = Math.random() * Math.PI * 2, r = 4 + Math.random() * 8;
        e.wx = e.x + Math.cos(a) * r; e.wz = e.z + Math.sin(a) * r;
        e.wy = e.y + (def.fly || def.water ? (Math.random() - 0.4) * 6 : 0);
      } else { e.wx = e.x; e.wz = e.z; }
    }
    var wdx = e.wx - e.x, wdz = e.wz - e.z;
    var wd = Math.hypot(wdx, wdz);
    if (wd > 0.7) {
      mvX = wdx / wd; mvZ = wdz / wd;
      e.yaw = angleLerp(e.yaw, Math.atan2(wdx, -wdz), 1 - Math.exp(-6 * dt));
    }
    e.headYaw = Math.sin(e.age * 0.5 + e.seed) * 0.4;
    e.headPitch = 0;
  }

  /* ------------------------------------------------------------------
     Steering: a mob that walks straight at a wall stays there forever, so
     the intended direction is tested before the velocity is integrated and,
     if it is blocked by something too tall to hop, swung along the wall.
     A detour target takes over for a couple of seconds when even that fails.
     ------------------------------------------------------------------ */
  if ((mvX || mvZ) && !def.fly && !def.static && !(def.water && e.inWater)) {
    if (e.detourT > 0) {
      e.detourT -= dt;
      var ddx = e.detourX - e.x, ddz = e.detourZ - e.z;
      var dd = Math.hypot(ddx, ddz);
      if (dd > 0.8) { mvX = ddx / dd; mvZ = ddz / dd; e.yaw = Math.atan2(mvX, -mvZ); }
      else e.detourT = 0;
    }
    var probe = e.w * 0.5 + 0.45;
    var fy0 = Math.floor(e.y);
    if (blockedAhead(world, e, mvX, mvZ, probe, fy0)) {
      var slx = -mvZ, slz = mvX;
      var openL = sideClearance(world, e, slx, slz, fy0);
      var openR = sideClearance(world, e, -slx, -slz, fy0);
      if (openL > 0 || openR > 0) {
        /* commit to one side long enough to actually round the obstacle */
        if (e.sideDir === undefined || !(e.sideT > 0)) {
          e.sideDir = openL === openR
            ? (rand2(Math.floor(e.x), Math.floor(e.z), 91) < 0.5 ? 1 : -1)
            : (openL > openR ? 1 : -1);
          e.sideT = 2.6;
        }
        e.sideT -= dt;
        if (e.sideDir > 0 && openL === 0) { e.sideDir = -1; e.sideT = 2.6; }
        else if (e.sideDir < 0 && openR === 0) { e.sideDir = 1; e.sideT = 2.6; }
        mvX = slx * e.sideDir; mvZ = slz * e.sideDir;
        e.yaw = Math.atan2(mvX, -mvZ);
      }
    } else if (e.sideT > 0) {
      /* the way is open again — carry on around the corner for a moment so
         the mob does not immediately turn back into the wall it just left */
      e.sideT -= dt;
    }
  }

  /* apply movement */
  /* def.speed is in the same units the real game uses for its movement
     attribute; ~18 blocks per second per unit reads right in practice */
  var accel = speed * (e.inWater ? 0.5 : 1) * 12;
  if (def.fly || (def.water && e.inWater)) {
    e.vx += mvX * accel * dt * 3;
    e.vz += mvZ * accel * dt * 3;
    var wantY = e.target ? (e.target.y + (def.fly ? 3 : 0.5) - e.y) : ((e.wy === undefined ? e.y : e.wy) - e.y);
    e.vy += clamp(wantY, -1, 1) * 2.2 * dt * 3;
    e.vx *= Math.pow(0.10, dt); e.vy *= Math.pow(0.10, dt); e.vz *= Math.pow(0.10, dt);
    e.vx = clamp(e.vx, -speed * 30, speed * 30);
    e.vy = clamp(e.vy, -speed * 22, speed * 22);
    e.vz = clamp(e.vz, -speed * 30, speed * 30);
  } else {
    e.vx += mvX * accel * dt * 8;
    e.vz += mvZ * accel * dt * 8;
    var mx = speed * 18;
    var hs = Math.hypot(e.vx, e.vz);
    if (hs > mx) { e.vx = e.vx / hs * mx; e.vz = e.vz / hs * mx; }
    /* jump over a one-block step */
    if ((mvX || mvZ) && e.onGround && e.jumpCool <= 0) {
      var fx = Math.floor(e.x + mvX * (e.w * 0.5 + 0.35));
      var fz = Math.floor(e.z + mvZ * (e.w * 0.5 + 0.35));
      var solidAhead = isSolidAt(world, e.dim, fx, Math.floor(e.y), fz);
      var openAbove = !isSolidAt(world, e.dim, fx, Math.floor(e.y) + 1, fz) &&
        !isSolidAt(world, e.dim, fx, Math.floor(e.y) + 2, fz);
      if (solidAhead && openAbove) { e.vy = 8.4; e.jumpCool = 0.3; }
    }
    if (def.climber && (mvX || mvZ)) {
      var cx = Math.floor(e.x + mvX * (e.w * 0.5 + 0.3)), cz = Math.floor(e.z + mvZ * (e.w * 0.5 + 0.3));
      if (isSolidAt(world, e.dim, cx, Math.floor(e.y + 1), cz)) e.vy = 4.5;
    }
  }
  applyPhysics(game, e, dt, def);

  /* If a mob wants to move but has not covered ground for a while, it is
     wedged on geometry — pick a new wander target and try again. */
  if ((mvX || mvZ) && !def.fly && !def.static) {
    var moved = Math.hypot(e.x - (e.lastPX === undefined ? e.x : e.lastPX), e.z - (e.lastPZ === undefined ? e.z : e.lastPZ));
    e.stuckT = moved < 0.02 * (dt * 20) ? (e.stuckT || 0) + dt : 0;
    e.lastPX = e.x; e.lastPZ = e.z;
    if (e.stuckT > 1.0) {
      e.stuckT = 0;
      e.wanderT = 0;
      if (e.onGround && e.jumpCool <= 0) { e.vy = 8.4; e.jumpCool = 0.4; }
      var a2 = Math.random() * Math.PI * 2;
      e.detourX = e.x + Math.cos(a2) * 8;
      e.detourZ = e.z + Math.sin(a2) * 8;
      e.detourT = 1.8;
      e.wx = e.detourX; e.wz = e.detourZ;
    }
  } else e.stuckT = 0;

  /* walk animation drive */
  var hspd = Math.hypot(e.vx, e.vz);
  e.walkAmt = clamp(hspd / Math.max(0.5, speed * 18), 0, 1) * (e.onGround || def.fly || def.water ? 1 : 0.35);
  e.walkPhase += hspd * dt * 1.4;

  /* environment damage */
  if (def.burnsInSun && e.dim === DIM_OVERWORLD && game.isDay && !e.inWater) {
    var sky = (world.getLight(e.dim, Math.floor(e.x), Math.floor(e.y + e.h), Math.floor(e.z)) >> 4) & 15;
    if (sky >= 15) e.fireTime = Math.max(e.fireTime, 1.0);
  }
  if (e.inLava && !def.fireproof) { e.fireTime = Math.max(e.fireTime, 3); damageEntity(game, e, 4 * dt, null, true); }
  if (e.fireTime > 0) {
    e.fireTime -= dt;
    if (e.inWater) e.fireTime = 0;
    else { e.burnTick = (e.burnTick || 0) + dt; if (e.burnTick > 0.5) { e.burnTick = 0; damageEntity(game, e, 1, null, true); } }
    if (Math.random() < dt * 12) spawnParticle(game, e.dim, e.x + (Math.random() - 0.5) * e.w, e.y + Math.random() * e.h, e.z + (Math.random() - 0.5) * e.w, 0, 1.2, 0, 1, 0.6, 0.15, 0.9, 0.14, 0.6);
  }
  if (def.hurtByWater && e.inWater) damageEntity(game, e, 3 * dt, null, true);
  if (e.y < -6) damageEntity(game, e, 100, null, true);

  /* despawn far away */
  if (!e.persist && distP > 108 && def.hostile !== undefined) {
    e.despawnT = (e.despawnT || 0) + dt;
    if (e.despawnT > 4) e.remove = true;
  } else e.despawnT = 0;
}

/* How many blocks of clear ground there are along a sideways direction. */
function sideClearance(world, e, mx, mz, fy) {
  var d = Math.hypot(mx, mz);
  if (d < 1e-6) return 0;
  var n = 0;
  for (var i = 1; i <= 4; i++) {
    var px = Math.floor(e.x + mx / d * (e.w * 0.5 + 0.4 * i));
    var pz = Math.floor(e.z + mz / d * (e.w * 0.5 + 0.4 * i));
    if (isSolidAt(world, e.dim, px, fy, pz) && isSolidAt(world, e.dim, px, fy + 1, pz)) break;
    n++;
  }
  return n;
}
/* Is the way ahead blocked by something the mob cannot simply step over? */
function blockedAhead(world, e, mx, mz, probe, fy) {
  var d = Math.hypot(mx, mz);
  if (d < 1e-6) return false;
  var px = Math.floor(e.x + mx / d * probe), pz = Math.floor(e.z + mz / d * probe);
  var atFeet = isSolidAt(world, e.dim, px, fy, pz);
  var atHead = isSolidAt(world, e.dim, px, fy + 1, pz);
  if (!atFeet && !atHead) return false;
  /* a single step with headroom is fine — the jump handles it */
  if (atFeet && !atHead && !isSolidAt(world, e.dim, px, fy + 2, pz)) return false;
  return true;
}
function isSolidAt(world, dim, x, y, z) {
  var id = world.getId(dim, x, y, z);
  return id !== 0 && BLOCKS[id].solid && BLOCKS[id].collide;
}
function playerLookingAt(p, e) {
  var dx = e.x - p.x, dy = (e.y + e.h * 0.8) - p.camY, dz = e.z - p.z;
  var l = Math.hypot(dx, dy, dz) || 1;
  var fx = Math.cos(p.pitch) * Math.sin(p.yaw), fy = Math.sin(p.pitch), fz = -Math.cos(p.pitch) * Math.cos(p.yaw);
  return (dx / l * fx + dy / l * fy + dz / l * fz) > 0.985;
}
function hasLineOfSight(world, a, b) {
  var ax = a.x, ay = a.y + a.h * 0.8, az = a.z;
  var bx = b.x, by = (b.camY !== undefined ? b.camY : b.y + b.h * 0.6), bz = b.z;
  var dx = bx - ax, dy = by - ay, dz = bz - az;
  var d = Math.hypot(dx, dy, dz);
  var steps = Math.min(48, Math.ceil(d * 2));
  for (var i = 1; i < steps; i++) {
    var t = i / steps;
    if (isSolidAt(world, a.dim, Math.floor(ax + dx * t), Math.floor(ay + dy * t), Math.floor(az + dz * t))) {
      var id = world.getId(a.dim, Math.floor(ax + dx * t), Math.floor(ay + dy * t), Math.floor(az + dz * t));
      if (BLOCKS[id].opaque) return false;
    }
  }
  return true;
}

function applyPhysics(game, e, dt, def) {
  var world = game.world;
  var hc = world.chunkAt(e.dim, Math.floor(e.x) >> 4, Math.floor(e.z) >> 4);
  if (!hc || !hc.loaded) { e.vy = 0; return; }
  var lq = liquidAt(world, e.dim, e.x, e.y + e.h * 0.4, e.z);
  e.inWater = lq === 'water';
  e.inLava = lq === 'lava';
  if (!def.fly && !(def.water && e.inWater)) {
    var g = e.inWater ? 9 : (e.inLava ? 6 : 26);
    e.vy -= g * dt;
    if (e.inWater) { e.vy *= Math.pow(0.35, dt); e.vx *= Math.pow(0.25, dt); e.vz *= Math.pow(0.25, dt); }
    if (e.vy < -34) e.vy = -34;
  }
  var before = e.vy;
  /* remember what we asked for, so "did we hit something" can be answered
     after friction has already changed the velocity */
  var wantX = e.vx * dt, wantZ = e.vz * dt;
  var wantY = e.vy * dt;
  var r = collideAxis(world, e.dim, e, wantX, wantY, wantZ);
  e.onGround = (before < 0 && Math.abs(r.dy - before * dt) > 1e-7);
  if (Math.abs(r.dx - wantX) > 1e-7) e.vx = 0;
  if (Math.abs(r.dz - wantZ) > 1e-7) e.vz = 0;
  if (e.onGround) {
    if (before < -18 && !def.fly && !e.inWater) damageEntity(game, e, Math.floor((-before - 18) * 0.7), null, true);
    e.vy = 0;
    var fr = Math.pow(0.06, dt);
    e.vx *= fr; e.vz *= fr;
  } else if (!def.fly && !(def.water && e.inWater)) {
    var af = Math.pow(0.45, dt);
    e.vx *= af; e.vz *= af;
  }
  if (e.vy > 0 && Math.abs(r.dy - wantY) > 1e-7) e.vy = 0;
}

/* ------------------------------------------------------------ damage -- */
function damageEntity(game, target, amount, source, noKnock) {
  if (!target || target.dead || amount <= 0) return;
  if (target.invuln > 0) return;
  if (target === game.player) { playerHurt(game, amount, source); return; }
  var def = MOBS[target.type];
  if (def.statue && target.frozen) return;
  target.hp -= amount;
  target.hurtTime = 0.35;
  target.invuln = 0.25;
  if (def.neutral) { target.angry = true; target.target = source; }
  if (source && source !== target) {
    target.target = source;
    if (!noKnock) {
      var dx = target.x - source.x, dz = target.z - source.z;
      var d = Math.hypot(dx, dz) || 1;
      target.vx += dx / d * 6; target.vz += dz / d * 6; target.vy = Math.max(target.vy, 5.5);
    }
  }
  playSound(game, 'hurt', target.x, target.y, target.z);
  spawnDamageParticles(game, target);
  if (target.hp <= 0) killEntity(game, target, source);
}
function killEntity(game, e, source) {
  if (e.dead) return;
  e.dead = true; e.deathTime = 0;
  var def = MOBS[e.type];
  if (e.type === 'end_crystal' && typeof onCrystalDestroyed === 'function') { onCrystalDestroyed(game, e); e.remove = true; }
  if (def.splits && (e.sizeMul || 1) > 0.6) {
    for (var i = 0; i < 3; i++) {
      var c = makeEntity(e.type, e.dim, e.x + (Math.random() - 0.5), e.y + 0.2, e.z + (Math.random() - 0.5), { sizeMul: (e.sizeMul || 1) * 0.5 });
      c.w = def.w * c.sizeMul; c.h = def.h * c.sizeMul; c.hp = c.maxHp = Math.max(1, def.hp * c.sizeMul);
      game.entities.push(c);
    }
  }
  for (var d = 0; d < def.drops.length; d++) {
    var dr = def.drops[d];
    if (dr.chance !== undefined && Math.random() > dr.chance) continue;
    var n = dr.min + Math.floor(Math.random() * (dr.max - dr.min + 1));
    if (n > 0) dropItem(game, e.dim, e.x, e.y + e.h * 0.4, e.z, dr.item, n);
  }
  if (def.xp) spawnXP(game, e.dim, e.x, e.y + 0.4, e.z, def.xp);
  if (def.boss) game.onBossKilled && game.onBossKilled(e);
  playSound(game, 'death', e.x, e.y, e.z);
}

/* ---------------------------------------------------------- spawning -- */
function trySpawnMobs(game, dt) {
  game.spawnTimer -= dt;
  if (game.spawnTimer > 0) return;
  game.spawnTimer = 1.2;
  var p = game.player, world = game.world;
  var cap = { hostile: 42, passive: 34, water: 12, ambient: 8 };
  var counts = { hostile: 0, passive: 0, water: 0, ambient: 0 };
  for (var i = 0; i < game.entities.length; i++) {
    var d = MOBS[game.entities[i].type];
    if (!d || d.isItem || d.isXP || d.projectile) continue;
    if (game.entities[i].dim !== p.dim) continue;
    counts[d.hostile ? 'hostile' : (d.water ? 'water' : 'passive')]++;
  }
  for (var attempt = 0; attempt < 12; attempt++) {
    var ang = Math.random() * Math.PI * 2;
    var rad = 26 + Math.random() * 42;
    var sx = Math.floor(p.x + Math.cos(ang) * rad);
    var sz = Math.floor(p.z + Math.sin(ang) * rad);
    var c = world.chunkAt(p.dim, sx >> 4, sz >> 4);
    if (!c || !c.lit) continue;
    var biome = world.getBiome(p.dim, sx, sz);
    var candidates = [];
    for (var k in MOBS) {
      var def = MOBS[k];
      var sp = def.spawn;
      if (!sp) continue;
      if ((sp.dim === undefined ? DIM_OVERWORLD : sp.dim) !== p.dim) continue;
      if (sp.biomes && sp.biomes.indexOf(biome.name) < 0) continue;
      if (sp.biomes === null && def.hostile !== true) continue;
      if (sp.structure) continue;
      var grp = def.hostile ? 'hostile' : (def.water ? 'water' : 'passive');
      if (counts[grp] >= cap[grp]) continue;
      /* weight lets the common animals outnumber the rare ones */
      var wgt = sp.weight || 1;
      for (var w2 = 0; w2 < wgt; w2++) candidates.push(def);
    }
    if (!candidates.length) continue;
    var pick = candidates[(Math.random() * candidates.length) | 0];
    var sp2 = pick.spawn;
    var sy;
    if (sp2.water) {
      sy = SEA - 1 - Math.floor(Math.random() * 12);
      if (world.getId(p.dim, sx, sy, sz) !== BID.water) continue;
    } else if (sp2.cave || (pick.hostile && Math.random() < 0.55)) {
      sy = 6 + Math.floor(Math.random() * (SEA + 20));
      if (!isSolidAt(world, p.dim, sx, sy - 1, sz)) continue;
      if (isSolidAt(world, p.dim, sx, sy, sz) || isSolidAt(world, p.dim, sx, sy + 1, sz)) continue;
    } else {
      sy = world.getHeight(p.dim, sx, sz) + 1;
      if (sy <= 1 || sy >= CH_H - 3) continue;
      if (isSolidAt(world, p.dim, sx, sy, sz)) continue;
      if (!isSolidAt(world, p.dim, sx, sy - 1, sz)) continue;
      var g = world.getId(p.dim, sx, sy - 1, sz);
      if (!pick.hostile && p.dim === DIM_OVERWORLD && g !== BID.grass_block && g !== BID.sand &&
        g !== BID.snow_block && g !== BID.podzol && g !== BID.mycelium && g !== BID.moss_block &&
        g !== BID.red_sand && g !== BID.coarse_dirt) continue;
    }
    var lightB = world.getLight(p.dim, sx, sy, sz);
    var lv = Math.max((lightB >> 4) & 15, lightB & 15);
    if (p.dim === DIM_OVERWORLD && pick.hostile) {
      var skyL = ((lightB >> 4) & 15) * (game.isDay ? 1 : 0.15);
      if (Math.max(skyL, lightB & 15) > (sp2.light || 7)) continue;
    }
    var d2 = (sx - p.x) * (sx - p.x) + (sz - p.z) * (sz - p.z);
    if (d2 < 24 * 24) continue;
    var n = sp2.group ? (sp2.group[0] + Math.floor(Math.random() * (sp2.group[1] - sp2.group[0] + 1))) : 1;
    for (var q = 0; q < n; q++) {
      var ex = sx + 0.5 + (Math.random() - 0.5) * 3;
      var ez = sz + 0.5 + (Math.random() - 0.5) * 3;
      var e = makeEntity(pick.type, p.dim, ex, sy, ez, { baby: !pick.hostile && Math.random() < 0.08 });
      game.entities.push(e);
    }
    return;
  }
}
