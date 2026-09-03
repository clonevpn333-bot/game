// ============================================================ LOCAL PLAYER
var P = {
  id: '', name: 'scout', slot: 0,
  pos: new THREE.Vector3(), vel: new THREE.Vector3(), yaw: 0,
  state: ST.AIR, grounded: false, groundNy: 1, surf: SF.ROCK,
  wall: { has: false, nx: 0, nz: 1, ny: 0.4, surf: SF.ROCK, cx: 0, cy: 0, cz: 0 },
  st: K.ST_MAX, extra: 0, hp: K.HP_MAX,
  status: {}, stMax: K.ST_MAX,
  fallFrom: 0, sprinting: false, climbing: false,
  slipT: 0, groundT: 0, outT: 0,
  inv: [null, null, null], sel: 0,
  carrying: null, carriedBy: null, reviveT: 0, reviveTgt: null,
  tether: null, onPiton: null, rope: null, torchOn: false,
  handL: new THREE.Vector3(), handR: new THREE.Vector3(), handOn: false,
  fig: null, summited: false, stats: null,
  noGrabT: 0, mantleT: 0, lolliT: 0, milkT: 0, handOutT: 0,
};
for (var _s = 0; _s < STATUS.length; _s++) P.status[STATUS[_s].k] = 0;

var _tmpA = new THREE.Vector3(), _tmpB = new THREE.Vector3(), _tmpC = new THREE.Vector3();

function groundH(x, z) {
  var h = T.hAt(x, z);
  if (h <= T.VOID) return T.VOID;
  return Props.capHeight(x, z, h);
}

function supportH(x, z, y) {
  var g = groundH(x, z);
  var list = Remote.list, i;
  for (i = 0; i < list.length; i++) {
    var a = list[i];
    if (a.state === ST.OUT) continue;
    var dx = a.pos.x - x, dz = a.pos.z - z;
    if (dx * dx + dz * dz > 0.36) continue;
    var top = a.pos.y + 1.28;
    if (top > g && top < y + 0.45) g = top;
  }
  return g;
}

P.init = function (slot, name) {
  P.slot = slot; P.name = name;
  P.fig = new Figure(slot, slot);
  P.stats = { climbed: 0, falls: 0, saves: 0 };
  return P.fig.root;
};

// Never trust a bare coordinate: resolve real ground, then stand on it.
P.spawnAt = function (x, z, hintY) {
  var g = T.findGround(x, z, 12, 0.8);
  if (!g) g = { x: x, y: Math.max(1, hintY || 1), z: z };
  P.pos.set(g.x, g.y + 0.06, g.z);
  P.vel.set(0, 0, 0);
  P.state = ST.GROUND; P.grounded = true; P.fallFrom = P.pos.y;
  P.noGrabT = 0.2; P.slipT = 0; P.groundT = 0;
  P.tether = null; P.wall.has = false; P.climbing = false; P.handOn = false;
  return g;
};

// ---------------------------------------------------------------- wall probe
var _wp = { found: false, d: 0, nx: 0, nz: 0, ny: 1, x: 0, z: 0, surf: 0 };
function probeWall(x, y, z, nx, nz, maxD) {
  var ix = -nx, iz = -nz, d, gh, lo, hi, m;
  var need = 0.30;
  for (d = -0.5; d <= maxD; d += 0.12) {
    gh = groundH(x + ix * d, z + iz * d);
    if (gh > T.VOID && gh >= y + need) {
      lo = Math.max(-0.5, d - 0.12); hi = d;
      for (var k = 0; k < 9; k++) {
        m = (lo + hi) * 0.5;
        gh = groundH(x + ix * m, z + iz * m);
        if (gh > T.VOID && gh >= y + need) hi = m; else lo = m;
      }
      var px = x + ix * hi, pz = z + iz * hi;
      var n = T.normSmooth(px, pz, 1.3);
      var hl = Math.sqrt(n.x * n.x + n.z * n.z);
      _wp.found = true; _wp.d = hi; _wp.x = px; _wp.z = pz; _wp.ny = n.y;
      if (hl > 1e-3) { _wp.nx = n.x / hl; _wp.nz = n.z / hl; }
      else { _wp.nx = nx; _wp.nz = nz; }
      _wp.surf = T.surfAt(px, pz);
      return _wp;
    }
  }
  _wp.found = false;
  return _wp;
}

// Grab whatever you are looking at.  Only ever called while the grab button
// is held - there is no assist and nothing snaps.
var GRAB_NY = 0.82;             // anything steeper than ~35 degrees takes a hand
function tryGrab() {
  if (P.noGrabT > 0 || P.st <= 0) return false;
  // a deployed rope is the easiest thing on the mountain to hold
  var rp = Coop.ropeNear(P.pos.x, P.pos.y, P.pos.z);
  if (rp) {
    P.rope = rp; P.wall.has = false;
    P.pos.x = rp.x; P.pos.z = rp.z;
    P.pos.y = clamp(P.pos.y, rp.bot, rp.top);
    P.state = ST.CLIMB; P.vel.set(0, 0, 0); P.slipT = 0;
    return true;
  }
  var f = CAM.flatForward(_tmpA);
  var w = probeWall(P.pos.x, P.pos.y, P.pos.z, -f.x, -f.z, K.GRAB_REACH);
  if (!w.found || w.ny > GRAB_NY) return false;
  P.wall.has = true; P.wall.nx = w.nx; P.wall.nz = w.nz;
  P.wall.ny = w.ny; P.wall.surf = w.surf;
  P.pos.x = w.x + w.nx * K.WALL_OFF;
  P.pos.z = w.z + w.nz * K.WALL_OFF;
  P.state = ST.CLIMB;
  P.vel.set(0, 0, 0);
  P.slipT = 0;
  FX.puff(P.pos.x, P.pos.y + 0.9, P.pos.z, 3, 0xbbbbbb);
  return true;
}

// Letting go drops you. Immediately.
function letGo(push) {
  if (P.state !== ST.CLIMB && P.state !== ST.SLIP) return;
  P.state = ST.AIR;
  P.wall.has = false; P.handOn = false; P.climbing = false; P.rope = null;
  P.fallFrom = Math.max(P.fallFrom, P.pos.y);
  P.noGrabT = 0.12;
  if (push) { P.vel.x += P.wall.nx * push; P.vel.z += P.wall.nz * push; }
}

function ropeContact() {
  var r = P.rope;
  if (P.pos.y > r.top) {
    var gh = groundH(r.x, r.z);
    if (gh > T.VOID && Math.abs(gh - r.top) < 1.6 && T.normSmooth(r.x, r.z).y > K.WALK_COS) {
      P.pos.y = gh + 0.04; P.state = ST.GROUND; P.grounded = true; P.rope = null;
      P.handOn = false; P.vel.set(0, 0, 0); P.noGrabT = 0.22; P.mantleT = 0.3; P.fallFrom = P.pos.y;
      return false;
    }
    P.pos.y = r.top;
  }
  if (P.pos.y < r.bot) {
    var gb = groundH(P.pos.x, P.pos.z);
    if (gb > T.VOID && P.pos.y - gb < 0.6) { P.pos.y = gb; P.state = ST.GROUND; P.rope = null; P.handOn = false; P.fallFrom = P.pos.y; return false; }
    letGo(0); return false;
  }
  P.pos.x = r.x; P.pos.z = r.z;
  P.wall.cx = r.x; P.wall.cz = r.z; P.wall.nx = Math.sin(P.yaw + Math.PI); P.wall.nz = Math.cos(P.yaw + Math.PI);
  return true;
}

function wallContact(dt) {
  if (P.rope) return ropeContact();
  var w = P.wall;
  var pw = probeWall(P.pos.x, P.pos.y, P.pos.z, w.nx, w.nz, K.GRAB_REACH + 0.5);
  if (!pw.found) {
    // topped out?
    var ix = -w.nx, iz = -w.nz;
    var mx2 = P.pos.x + ix * 1.0, mz2 = P.pos.z + iz * 1.0;
    var gh = groundH(mx2, mz2);
    if (gh > T.VOID && gh <= P.pos.y + 0.5 && gh >= P.pos.y - 1.8 && T.normSmooth(mx2, mz2).y > K.WALK_COS) {
      P.pos.x = mx2; P.pos.z = mz2; P.pos.y = gh + 0.04;
      P.state = ST.GROUND; P.grounded = true; P.wall.has = false; P.handOn = false;
      P.vel.set(0, 0, 0); P.noGrabT = 0.22; P.mantleT = 0.35; P.fallFrom = P.pos.y;
      FX.puff(P.pos.x, P.pos.y + 0.2, P.pos.z, 6, 0xd8d0c0);
      return false;
    }
    var below = groundH(P.pos.x, P.pos.z);
    if (below > T.VOID && P.pos.y - below < 0.45) {
      P.pos.y = below; P.state = ST.GROUND; P.wall.has = false; P.handOn = false;
      P.vel.set(0, 0, 0); P.fallFrom = P.pos.y; P.noGrabT = 0.15;
      return false;
    }
    letGo(0.9);
    return false;
  }
  w.nx = w.nx * 0.55 + pw.nx * 0.45; w.nz = w.nz * 0.55 + pw.nz * 0.45;
  var l = Math.hypot(w.nx, w.nz) || 1; w.nx /= l; w.nz /= l;
  w.ny = pw.ny; w.surf = pw.surf;
  w.cx = pw.x; w.cz = pw.z; w.cy = P.pos.y;
  P.pos.x = pw.x + w.nx * K.WALL_OFF;
  P.pos.z = pw.z + w.nz * K.WALL_OFF;
  P.yaw = Math.atan2(-w.nx, -w.nz);
  P.surf = w.surf;

  // step off onto anything shallow enough to stand on
  if (pw.ny > K.WALK_COS + 0.05) {
    var g3 = groundH(P.pos.x, P.pos.z);
    if (g3 > T.VOID && g3 <= P.pos.y + 0.4 && P.pos.y - g3 < 1.1) {
      P.pos.y = g3; P.state = ST.GROUND; P.wall.has = false; P.handOn = false;
      P.fallFrom = P.pos.y; return false;
    }
  }
  return true;
}

// where the mittens are planted this frame
function placeHands() {
  var w = P.wall;
  if (P.rope) {
    var ph0 = P.fig ? P.fig.phase : 0, sw0 = Math.sin(ph0) * 0.22;
    P.handL.set(w.cx, P.pos.y + 1.24 + sw0, w.cz);
    P.handR.set(w.cx, P.pos.y + 1.04 - sw0, w.cz);
    P.handOn = true;
    return;
  }
  var rx = -w.nz, rz = w.nx;
  var ph = P.fig ? P.fig.phase : 0;
  var sw = Math.sin(ph) * 0.26;
  var ox = w.cx + w.nx * 0.1, oz = w.cz + w.nz * 0.1;
  P.handL.set(ox + rx * 0.36, P.pos.y + 1.16 + sw, oz + rz * 0.36);
  P.handR.set(ox - rx * 0.36, P.pos.y + 1.16 - sw, oz - rz * 0.36);
  P.handOn = true;
}

function moveClimb(dt, mx, mz) {
  var w = P.wall;
  if (P.rope) {
    P.climbing = Math.abs(mz) > 0.05;
    var rs = mz >= 0 ? K.CLIMB_UP * 1.3 : K.CLIMB_DOWN * 1.3;
    P.pos.y += mz * rs * dt;
    if (mz > 0) P.stats.climbed += mz * rs * dt;
    return;
  }
  var rx = -w.nz, rz = w.nx;
  var moving = Math.abs(mz) > 0.05 || Math.abs(mx) > 0.05;
  P.climbing = moving;

  var spUp = K.CLIMB_UP, spSide = K.CLIMB_SIDE;
  if (P.status.injury > 0) { spUp *= 0.78; spSide *= 0.82; }
  if (P.carrying) { spUp *= 0.6; spSide *= 0.65; }

  var dy = mz >= 0 ? mz * spUp * dt : mz * K.CLIMB_DOWN * dt;
  P.pos.y += dy;
  P.pos.x += rx * mx * spSide * dt;
  P.pos.z += rz * mx * spSide * dt;
  if (dy > 0) P.stats.climbed += dy;

  var gust = Wind.at(P.pos.y, 1);
  P.pos.x += Wind.dx * gust * dt * 1.4;
  P.pos.z += Wind.dz * gust * dt * 1.4;
}

// Out of stamina on a wall: you slide, faster and faster, and it hurts when
// you stop.
function slipTick(dt) {
  P.slipT += dt;
  P.vel.y = Math.max(-K.SLIP_MAX, P.vel.y - K.SLIP_ACC * dt);
  P.pos.y += P.vel.y * dt;
  P.climbing = false;
  if (Math.random() < dt * 26) FX.puff(P.wall.cx, P.pos.y + 0.6, P.wall.cz, 1, 0xb9ad9a);
  CAM.kick(dt * 1.4);
}

function wallLunge() {
  if (Survive.spend(K.ST_LUNGE) <= 0) return;
  P.pos.y += 0.55;
  P.vel.y = 0;
  CAM.kick(0.16);
  FX.puff(P.wall.cx, P.pos.y + 0.4, P.wall.cz, 4, 0xcfc8bb);
}

var STEP_UP = 0.62;
function moveGround(dt, wishX, wishZ, wantSprint) {
  var sp = K.WALK;
  if (wantSprint && P.st > 1 && !P.carrying) sp = K.SPRINT;
  if (P.carrying) sp *= K.CARRY_MUL;
  if (P.status.injury > 0) sp *= 0.82;
  P.sprinting = sp === K.SPRINT && (wishX || wishZ);

  var slip = (P.surf === SF.ICE) ? 0.3 : (P.surf === SF.MUD || P.surf === SF.SNOW ? 0.82 : 1);
  var acc = K.ACC_G * slip, fri = K.FRIC * slip;
  var tvx = wishX * sp, tvz = wishZ * sp;

  if (P.groundNy < K.WALK_COS) {
    var g = 1 - invl(K.WALK_COS - 0.14, K.WALK_COS, P.groundNy);
    acc *= (1 - g) * 0.6; fri *= (1 - g) * 0.5;
    var n = T.normSmooth(P.pos.x, P.pos.z);
    var sl = Math.sqrt(n.x * n.x + n.z * n.z) || 1;
    P.vel.x += (n.x / sl) * g * 17 * dt;
    P.vel.z += (n.z / sl) * g * 17 * dt;
  }

  P.vel.x = damp(P.vel.x, tvx, (wishX || wishZ) ? acc / Math.max(1, sp) * 2.6 : fri, dt);
  P.vel.z = damp(P.vel.z, tvz, (wishX || wishZ) ? acc / Math.max(1, sp) * 2.6 : fri, dt);
  if (P.sprinting && (wishX || wishZ)) Survive.spend(K.ST_SPRINT * dt);
}

function resolveXZ(dt) {
  var nx = P.pos.x + P.vel.x * dt, nz = P.pos.z + P.vel.z * dt;
  var y = P.pos.y;
  var gh = supportH(nx, nz, y);
  if (gh <= T.VOID) { P.pos.x = nx; P.pos.z = nz; return; }
  if (gh - y <= STEP_UP) { P.pos.x = nx; P.pos.z = nz; if (P.grounded && gh > y) P.pos.y = gh; return; }
  var g1 = supportH(nx, P.pos.z, y);
  if (g1 > T.VOID && g1 - y <= STEP_UP) { P.pos.x = nx; if (P.grounded && g1 > y) P.pos.y = g1; }
  else P.vel.x *= 0.2;
  var g2 = supportH(P.pos.x, nz, y);
  if (g2 > T.VOID && g2 - y <= STEP_UP) { P.pos.z = nz; if (P.grounded && g2 > y) P.pos.y = g2; }
  else P.vel.z *= 0.2;
}

// ---------------------------------------------------------------- main step
P.update = function (dt) {
  if (P.summited) return;
  P.noGrabT = Math.max(0, P.noGrabT - dt);
  P.mantleT = Math.max(0, P.mantleT - dt);

  var free = !HUD.blocked && P.state !== ST.OUT && P.state !== ST.CARRIED;
  var mx = 0, mz = 0;
  if (free) { mx = IN.moveX(); mz = IN.moveZ(); }
  var ml = Math.hypot(mx, mz);
  if (ml > 1) { mx /= ml; mz /= ml; }

  var fwd = CAM.flatForward(_tmpA), rgt = CAM.flatRight(_tmpB);
  var wishX = fwd.x * mz + rgt.x * mx, wishZ = fwd.z * mz + rgt.z * mx;

  if (P.state === ST.CARRIED) { P.vel.set(0, 0, 0); return; }

  if (P.state === ST.OUT) {
    P.vel.y -= K.GRAV * dt;
    P.pos.y += P.vel.y * dt;
    var ghd = supportH(P.pos.x, P.pos.z, P.pos.y);
    if (ghd > T.VOID && P.pos.y <= ghd) { P.pos.y = ghd; P.vel.y = 0; }
    if (P.pos.y < -40) Survive.respawn();
    P.handOn = false;
    return;
  }

  // ---- on a wall
  if (P.state === ST.CLIMB || P.state === ST.SLIP) {
    if (!IN.grab() || HUD.blocked) { letGo(1.1); }
    else if (P.state === ST.CLIMB) {
      if (free && IN.jump()) { letGo(4.2); P.vel.y = 5.0; Survive.spend(K.ST_JUMP); }
      else {
        if (free && IN.shiftHit()) wallLunge();
        moveClimb(dt, mx, mz);
        if (wallContact(dt)) placeHands();
      }
    } else {
      slipTick(dt);
      if (wallContact(dt)) placeHands();
    }
  }

  // ---- on foot or in the air
  if (P.state === ST.GROUND || P.state === ST.AIR) {
    P.handOn = false;
    if (P.state === ST.GROUND) {
      moveGround(dt, wishX, wishZ, free && IN.shift());
      if (free && IN.jump() && P.st > 3 && P.mantleT <= 0) {
        P.vel.y = K.JUMP_V * (P.carrying ? 0.72 : 1);
        Survive.spend(K.ST_JUMP);
        P.state = ST.AIR; P.grounded = false; P.fallFrom = P.pos.y;
        FX.puff(P.pos.x, P.pos.y + 0.05, P.pos.z, 5, 0xcfc8bb);
      }
    } else {
      P.vel.x = damp(P.vel.x, wishX * K.WALK * 1.1, K.ACC_A * 0.5, dt);
      P.vel.z = damp(P.vel.z, wishZ * K.WALK * 1.1, K.ACC_A * 0.5, dt);
    }

    P.vel.y -= K.GRAV * dt;
    if (P.vel.y < -46) P.vel.y = -46;
    P.pos.y += P.vel.y * dt;
    resolveXZ(dt);

    var g2 = Wind.at(P.pos.y, 1);
    if (g2 > 0.05) { P.vel.x += Wind.dx * g2 * dt * 3.0; P.vel.z += Wind.dz * g2 * dt * 3.0; }

    var gh = supportH(P.pos.x, P.pos.z, P.pos.y);
    if (gh <= T.VOID) {
      if (P.pos.y < -40) { Survive.hurt(45, 'the sea'); Survive.respawn(); }
      P.state = ST.AIR; P.grounded = false;
    } else if (P.pos.y <= gh + 0.001) {
      var wasAir = !P.grounded, drop = P.fallFrom - gh;
      P.pos.y = gh;
      P.vel.y = 0;
      P.grounded = true;
      P.state = ST.GROUND;
      P.fallFrom = P.pos.y;
      if (wasAir) Survive.land(drop);
    } else {
      P.grounded = false;
      if (P.pos.y > P.fallFrom) P.fallFrom = P.pos.y;
      if (gh < P.pos.y - 0.14) P.state = ST.AIR;
    }

    var n = T.normSmooth(P.pos.x, P.pos.z, 0.8);
    P.groundNy = n.y;
    P.surf = T.surfAt(P.pos.x, P.pos.z);

    // Grabbing on: only ever because the button is held, and it works from
    // anywhere - standing flat at the foot of a wall is the commonest way to
    // start a climb.
    if (free && IN.grab()) tryGrab();
  }

  // The fog above will not let you past until its fire is lit.  It only ever
  // holds you down to the wall's own height - never below whatever you are
  // standing on, or it would bury you.
  var ceil = Walls.ceiling();
  if (ceil && P.pos.y > ceil.y) {
    var floor = groundH(P.pos.x, P.pos.z);
    var cap = floor > T.VOID ? Math.max(ceil.y, floor) : ceil.y;
    if (P.pos.y > cap) {
      P.pos.y = cap;
      if (P.vel.y > 0) P.vel.y = 0;
      if (P.state === ST.CLIMB) P.climbing = false;
      HUD.wallHint = ceil.i;
    }
  }

  if (P.state === ST.GROUND) { P.groundT += dt; if (ml > 0.02 || P.sprinting) P.groundT = Math.min(P.groundT, K.ST_REGEN_DELAY); }
  else P.groundT = 0;

  if (P.state === ST.GROUND || P.state === ST.AIR) {
    if (ml > 0.02) P.yaw = angLerp(P.yaw, Math.atan2(wishX, wishZ), 1 - Math.exp(-16 * dt));
  }
};
