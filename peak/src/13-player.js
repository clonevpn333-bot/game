// ============================================================ LOCAL PLAYER
var P = {
  id: '', name: 'climber', slot: 0,
  pos: new THREE.Vector3(), vel: new THREE.Vector3(), yaw: 0,
  state: ST.AIR, grounded: false, groundNy: 1, surf: SF.ROCK,
  wall: { has: false, nx: 0, nz: 1, d: 0, ny: 0.4, surf: SF.ROCK, cell: -1 },
  st: K.ST_MAX, stMax: K.ST_MAX, hp: K.HP_MAX, hunger: K.HU_MAX, temp: K.TP_MAX,
  fallFrom: 0, airT: 0, sprinting: false, crouch: false, brace: false,
  climbing: false, gripLost: 0, looseT: 0, looseCell: -1,
  inj: { leg: 0, arm: 0 }, parka: false,
  inv: [null, null, null, null], sel: 0,
  carrying: null, carriedBy: null, downT: 0, reviveT: 0, reviveTgt: null,
  tether: null, atRest: false, exposure: 0,
  fig: null, alive: true, summited: false, stats: null,
  lastCamp: 0, noGrabT: 0, mantleT: 0, landT: 0,
};

var _tmpA = new THREE.Vector3(), _tmpB = new THREE.Vector3(), _tmpC = new THREE.Vector3();

function groundH(x, z) {
  var h = T.hAt(x, z);
  if (h <= T.VOID) return T.VOID;
  return Props.capHeight(x, z, h);
}

// terrain plus anything a teammate is offering to stand on
function supportH(x, z, y) {
  var g = groundH(x, z);
  var list = Remote.list, i;
  for (i = 0; i < list.length; i++) {
    var a = list[i];
    if (!a.brace || a.state === ST.DOWN) continue;
    var dx = a.pos.x - x, dz = a.pos.z - z;
    if (dx * dx + dz * dz > 0.42) continue;
    var top = a.pos.y + 1.22;
    if (top > g && top < y + 0.45) { g = top; P.onMate = a; }
  }
  return g;
}

P.init = function (slot, name) {
  P.slot = slot; P.name = name;
  P.fig = new Figure(slot);
  P.stats = { start: now(), climbed: 0, falls: 0, revives: 0, best: 0 };
  return P.fig.root;
};

P.spawnAt = function (x, y, z) {
  P.pos.set(x, y + 0.2, z);
  P.vel.set(0, 0, 0);
  P.state = ST.AIR; P.fallFrom = P.pos.y;
  P.noGrabT = 0.25;
  P.tether = null; P.ropeCaught = false;
  P.wall.has = false; P.climbing = false; P.brace = false;
  P.looseCell = -1; P.looseT = 0;
};

// ---------------------------------------------------------------- wall probe
// Walk inward along -n looking for the point where the ground rises through
// the climber's chest.  That crossing is the face being held.
var _wp = { found: false, d: 0, nx: 0, nz: 0, ny: 1, x: 0, z: 0, cell: -1, surf: 0 };
function probeWall(x, y, z, nx, nz, maxD) {
  var ix = -nx, iz = -nz, d, prev = -1, gh, lo, hi, m;
  var need = 0.42;
  for (d = -0.55; d <= maxD; d += 0.13) {
    gh = groundH(x + ix * d, z + iz * d);
    if (gh > T.VOID && gh >= y + need) {
      lo = Math.max(-0.55, d - 0.13); hi = d;
      for (var k = 0; k < 9; k++) {
        m = (lo + hi) * 0.5;
        gh = groundH(x + ix * m, z + iz * m);
        if (gh > T.VOID && gh >= y + need) hi = m; else lo = m;
      }
      var px = x + ix * hi, pz = z + iz * hi;
      var n = T.normSmooth(px, pz, 1.5);
      var hl = Math.sqrt(n.x * n.x + n.z * n.z);
      _wp.found = true; _wp.d = hi; _wp.x = px; _wp.z = pz; _wp.ny = n.y;
      if (hl > 1e-3) { _wp.nx = n.x / hl; _wp.nz = n.z / hl; }
      else { _wp.nx = nx; _wp.nz = nz; }
      _wp.cell = T.cellOf(px, pz);
      _wp.surf = T.surfAt(px, pz);
      return _wp;
    }
    prev = d;
  }
  _wp.found = false;
  return _wp;
}

// ---------------------------------------------------------------- ground
function moveGround(dt, wishX, wishZ, wantSprint) {
  var sp = K.WALK;
  if (wantSprint && P.st > 1 && !P.carrying) sp = K.SPRINT;
  if (P.crouch || P.brace) sp = K.CROUCH;
  if (P.carrying) sp *= K.CARRY_MUL;
  if (P.inj.leg) sp *= 0.78;
  if (P.hunger < K.HU_CHOKE) sp *= lerp(0.84, 1, P.hunger / K.HU_CHOKE);
  P.sprinting = sp === K.SPRINT && (wishX || wishZ);

  var slip = (P.surf === SF.ICE) ? 0.28 : (P.surf === SF.SNOW ? 0.8 : 1);
  var acc = K.ACC_G * slip, fri = K.FRIC * slip;
  var tvx = wishX * sp, tvz = wishZ * sp;

  // no purchase on anything steeper than boots can hold
  if (P.groundNy < K.WALK_COS) {
    var g = 1 - invl(K.SLIDE_COS, K.WALK_COS, P.groundNy);
    acc *= (1 - g) * 0.6; fri *= (1 - g) * 0.5;
    var n = T.normSmooth(P.pos.x, P.pos.z);
    var sl = Math.sqrt(n.x * n.x + n.z * n.z) || 1;
    P.vel.x += (n.x / sl) * g * 17 * dt;
    P.vel.z += (n.z / sl) * g * 17 * dt;
  }

  P.vel.x = damp(P.vel.x, tvx, (wishX || wishZ) ? acc / Math.max(1, sp) * 2.6 : fri, dt);
  P.vel.z = damp(P.vel.z, tvz, (wishX || wishZ) ? acc / Math.max(1, sp) * 2.6 : fri, dt);
  if (P.sprinting && (wishX || wishZ)) P.st = Math.max(0, P.st - K.ST_SPRINT * dt);
}

var STEP_UP = 0.62;
function resolveXZ(dt) {
  var nx = P.pos.x + P.vel.x * dt, nz = P.pos.z + P.vel.z * dt;
  var y = P.pos.y;
  var gh = supportH(nx, nz, y);
  if (gh <= T.VOID) { P.pos.x = nx; P.pos.z = nz; return; }
  if (gh - y <= STEP_UP) { P.pos.x = nx; P.pos.z = nz; if (P.grounded && gh > y) P.pos.y = gh; return; }
  // blocked: try each axis so we slide along the face instead of sticking
  var g1 = supportH(nx, P.pos.z, y);
  if (g1 > T.VOID && g1 - y <= STEP_UP) { P.pos.x = nx; if (P.grounded && g1 > y) P.pos.y = g1; }
  else P.vel.x *= 0.2;
  var g2 = supportH(P.pos.x, nz, y);
  if (g2 > T.VOID && g2 - y <= STEP_UP) { P.pos.z = nz; if (P.grounded && g2 > y) P.pos.y = g2; }
  else P.vel.z *= 0.2;
}

// ---------------------------------------------------------------- climbing
function tryGrab(dirX, dirZ) {
  if (P.noGrabT > 0 || P.st < 3) return false;
  var l = Math.hypot(dirX, dirZ);
  if (l < 0.01) return false;
  dirX /= l; dirZ /= l;
  var w = probeWall(P.pos.x, P.pos.y, P.pos.z, -dirX, -dirZ, K.GRAB_DIST);
  if (!w.found || w.ny > K.WALK_COS) return false;
  P.wall.has = true; P.wall.nx = w.nx; P.wall.nz = w.nz;
  P.wall.ny = w.ny; P.wall.surf = w.surf; P.wall.cell = w.cell; P.wall.d = w.d;
  P.pos.x = w.x + w.nx * K.WALL_OFF;
  P.pos.z = w.z + w.nz * K.WALL_OFF;
  P.state = ST.CLIMB;
  P.vel.set(0, 0, 0);
  P.looseT = 0; P.looseCell = -1;
  P.mantleT = 0;
  FX.puff(P.pos.x, P.pos.y + 0.9, P.pos.z, 4, 0xbbbbbb);
  return true;
}

function releaseWall(kick) {
  P.state = ST.AIR;
  P.wall.has = false;
  P.fallFrom = Math.max(P.fallFrom, P.pos.y);
  P.noGrabT = kick ? 0.32 : 0.12;
  if (kick) {
    P.vel.x += P.wall.nx * 1.4; P.vel.z += P.wall.nz * 1.4;
  }
}

function moveClimb(dt, mx, mz) {
  var w = P.wall;
  var rx = -w.nz, rz = w.nx;             // right, along the face
  var up = mz, side = mx;
  var moving = Math.abs(up) > 0.05 || Math.abs(side) > 0.05;
  P.climbing = moving;

  var spUp = K.CLIMB_UP, spSide = K.CLIMB_SIDE;
  if (P.inj.arm) { spUp *= 0.72; spSide *= 0.78; }
  if (P.carrying) { spUp *= 0.6; spSide *= 0.65; }
  if (w.surf === SF.ICE) { spUp *= 0.85; spSide *= 0.9; }
  if (P.hunger < K.HU_CHOKE) spUp *= lerp(0.85, 1, P.hunger / K.HU_CHOKE);

  var dy = up >= 0 ? up * spUp * dt : up * K.CLIMB_DOWN * dt;
  P.pos.y += dy;
  P.pos.x += rx * side * spSide * dt;
  P.pos.z += rz * side * spSide * dt;
  if (dy > 0) P.stats.climbed += dy;

  // wind shoves you along the face on exposed ground
  var gust = Wind.at(P.pos.y, P.exposure);
  P.pos.x += Wind.dx * gust * dt * 1.5;
  P.pos.z += Wind.dz * gust * dt * 1.5;

  // re-seat on the rock
  var pw = probeWall(P.pos.x, P.pos.y, P.pos.z, w.nx, w.nz, K.GRAB_DIST + 0.5);
  if (!pw.found) {
    // the face ran out: top out if there is a lip, otherwise let go
    var ix = -w.nx, iz = -w.nz;
    var mx2 = P.pos.x + ix * 1.05, mz2 = P.pos.z + iz * 1.05;
    var gh = groundH(mx2, mz2);
    if (gh > T.VOID && gh <= P.pos.y + 0.55 && gh >= P.pos.y - 1.9 && T.normSmooth(mx2, mz2).y > K.WALK_COS && up >= -0.05) {
      P.pos.x = mx2; P.pos.z = mz2; P.pos.y = gh + 0.05;
      P.state = ST.GROUND; P.grounded = true; P.wall.has = false;
      P.vel.set(0, 0, 0); P.noGrabT = 0.28; P.mantleT = 0.4;
      P.fallFrom = P.pos.y;
      FX.puff(P.pos.x, P.pos.y + 0.2, P.pos.z, 7, 0xd8d0c0);
      return;
    }
    // reached the bottom of the face?
    var below = groundH(P.pos.x, P.pos.z);
    if (below > T.VOID && P.pos.y - below < 0.5) {
      P.pos.y = below; P.state = ST.GROUND; P.wall.has = false;
      P.vel.set(0, 0, 0); P.fallFrom = P.pos.y; P.noGrabT = 0.2;
      return;
    }
    releaseWall(false);
    return;
  }

  w.nx = w.nx * 0.6 + pw.nx * 0.4; w.nz = w.nz * 0.6 + pw.nz * 0.4;
  var l = Math.hypot(w.nx, w.nz) || 1; w.nx /= l; w.nz /= l;
  w.ny = pw.ny; w.surf = pw.surf; w.cell = pw.cell;
  P.pos.x = pw.x + w.nx * K.WALL_OFF;
  P.pos.z = pw.z + w.nz * K.WALL_OFF;

  // No purchase left on a slab that is barely steep - step off onto it.
  // The ground has to be within reach of the feet in both directions:
  // without the upper bound a climber gets flung up the whole face.
  if (pw.ny > K.WALK_COS + 0.06) {
    var g3 = groundH(P.pos.x, P.pos.z);
    if (g3 > T.VOID && g3 <= P.pos.y + 0.45 && P.pos.y - g3 < 1.2) {
      P.pos.y = g3; P.state = ST.GROUND; P.wall.has = false; P.fallFrom = P.pos.y; return;
    }
  }

  P.yaw = Math.atan2(-w.nx, -w.nz);
  P.surf = w.surf;

  // crumbling holds: you get about a second before the rock goes
  if (w.surf === SF.LOOSE) {
    if (w.cell !== P.looseCell) { P.looseCell = w.cell; P.looseT = 0; }
    P.looseT += dt;
    if (P.looseT > 1.05) {
      T.BROKEN[w.cell] = 1;
      T.paintBroken(w.cell);
      FX.debris(pw.x, P.pos.y + 0.5, pw.z, w.nx, w.nz);
      Net.send({ t: 'brk', c: w.cell });
      HUD.toast('the hold tears out', '#ff8a3d');
      releaseWall(true);
      return;
    }
  } else { P.looseCell = -1; P.looseT = 0; }
}

// leap off the wall - the only way across a gap, and it costs plenty
function wallLeap() {
  var w = P.wall, cost = K.ST_LEAP, mul = 1;
  if (P.st < cost) { mul = clamp(P.st / cost, 0.25, 1); }
  P.st = Math.max(0, P.st - cost);
  var f = _tmpA; CAM.flatForward(f);
  var away = (f.x * w.nx + f.z * w.nz);
  var outx = w.nx, outz = w.nz;
  if (away > 0.15) { outx = f.x; outz = f.z; }   // leap where you are looking
  P.vel.set(outx * 6.9 * mul, 7.7 * mul, outz * 6.9 * mul);
  P.state = ST.AIR; P.wall.has = false;
  P.noGrabT = 0.26;
  P.fallFrom = P.pos.y;
  CAM.kick(0.25);
  FX.puff(P.pos.x, P.pos.y + 0.8, P.pos.z, 6, 0xcfc8bb);
}

// ---------------------------------------------------------------- main step
P.update = function (dt) {
  if (P.summited) return;
  P.noGrabT = Math.max(0, P.noGrabT - dt);
  P.mantleT = Math.max(0, P.mantleT - dt);
  P.landT = Math.max(0, P.landT - dt);
  P.onMate = null;

  var mx = 0, mz = 0;
  if (P.state !== ST.DOWN && P.state !== ST.CARRIED && !HUD.blocked) { mx = IN.moveX(); mz = IN.moveZ(); }
  var ml = Math.hypot(mx, mz);
  if (ml > 1) { mx /= ml; mz /= ml; }

  var fwd = CAM.flatForward(_tmpA), rgt = CAM.flatRight(_tmpB);
  var wishX = fwd.x * mz + rgt.x * mx, wishZ = fwd.z * mz + rgt.z * mx;

  P.exposure = clamp((P.pos.y - 48) / 150, 0, 1);

  if (P.state === ST.CARRIED) { P.vel.set(0, 0, 0); return; }

  if (P.state === ST.DOWN) {
    P.vel.y -= K.GRAV * dt;
    P.pos.y += P.vel.y * dt;
    var ghd = supportH(P.pos.x, P.pos.z, P.pos.y);
    if (ghd > T.VOID && P.pos.y <= ghd) { P.pos.y = ghd; P.vel.y = 0; }
    if (P.pos.y < -50) Survive.respawn();
    P.downT -= dt;
    if (P.downT <= 0) Survive.respawn();
    return;
  }

  if (P.state === ST.CLIMB) {
    if (!IN.grip() && ml < 0.05 && P.gripLost <= 0) { /* still hanging: holds by default */ }
    if (IN.jump() && !HUD.blocked) { wallLeap(); }
    else {
      moveClimb(dt, mx, mz);
      if (IN.down('KeyS') && P.state === ST.CLIMB && P.pos.y - groundH(P.pos.x, P.pos.z) < 0.35) {
        P.state = ST.GROUND; P.wall.has = false; P.fallFrom = P.pos.y;
      }
    }
  }

  if (P.state === ST.GROUND || P.state === ST.AIR) {
    if (P.state === ST.GROUND) {
      moveGround(dt, wishX, wishZ, IN.sprint() && !HUD.blocked);
      if (IN.jump() && !HUD.blocked && P.st > 4 && !P.brace && P.mantleT <= 0) {
        P.vel.y = K.JUMP_V * (P.carrying ? 0.72 : 1) * (P.inj.leg ? 0.84 : 1);
        P.st = Math.max(0, P.st - K.ST_JUMP);
        P.state = ST.AIR; P.grounded = false;
        P.fallFrom = P.pos.y;
        if (P.onMate) { P.vel.y += 2.6; P.onMate.boosted = 1; Net.send({ t: 'bst', to: P.onMate.id }); }
        FX.puff(P.pos.x, P.pos.y + 0.05, P.pos.z, 5, 0xcfc8bb);
      }
    } else {
      // air control, deliberately weak - momentum should matter
      P.vel.x = damp(P.vel.x, wishX * K.WALK * 1.15, K.ACC_A * 0.5, dt);
      P.vel.z = damp(P.vel.z, wishZ * K.WALK * 1.15, K.ACC_A * 0.5, dt);
    }

    P.vel.y -= K.GRAV * dt;
    if (P.vel.y < -46) P.vel.y = -46;
    P.pos.y += P.vel.y * dt;
    resolveXZ(dt);

    // wind on exposed ground
    var g2 = Wind.at(P.pos.y, P.exposure);
    if (g2 > 0.05) { P.vel.x += Wind.dx * g2 * dt * 3.4; P.vel.z += Wind.dz * g2 * dt * 3.4; }

    var gh = supportH(P.pos.x, P.pos.z, P.pos.y);
    if (gh <= T.VOID) {
      if (P.pos.y < -60) { Survive.hurt(60, 'the void'); Survive.respawn(); }
      P.state = ST.AIR; P.grounded = false;
    } else if (P.pos.y <= gh + 0.001) {
      var wasAir = !P.grounded, drop = P.fallFrom - gh;
      P.pos.y = gh;
      P.vel.y = 0;
      P.grounded = true;
      P.state = ST.GROUND;
      P.fallFrom = P.pos.y;
      // land last: a hard enough landing puts you on the floor, and that
      // state must survive this block
      if (wasAir) Survive.land(drop);
    } else {
      P.grounded = false;
      if (P.pos.y > P.fallFrom) P.fallFrom = P.pos.y;
      if (gh < P.pos.y - 0.14) P.state = ST.AIR;
    }

    var n = T.normSmooth(P.pos.x, P.pos.z);
    P.groundNy = n.y;
    P.surf = T.surfAt(P.pos.x, P.pos.z);

    // grabbing on: push into a wall, or hold the grip button near one
    if (P.state === ST.AIR || (P.state === ST.GROUND && P.groundNy < K.WALK_COS)) {
      if (ml > 0.1 && tryGrab(wishX, wishZ)) { /* on the wall */ }
      else if (IN.grip()) {
        var f2 = CAM.flatForward(_tmpC);
        tryGrab(f2.x, f2.z);
      }
    } else if (P.state === ST.GROUND && ml > 0.1 && IN.grip()) {
      tryGrab(wishX, wishZ);
    }
  }

  if (P.state !== ST.CLIMB) P.climbing = false;
  if (P.state === ST.GROUND || P.state === ST.AIR) {
    if (ml > 0.02) P.yaw = angLerp(P.yaw, Math.atan2(wishX, wishZ), 1 - Math.exp(-16 * dt));
  }
};
