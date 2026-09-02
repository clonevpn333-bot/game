// ============================================================ SURVIVAL
var Survive = { eHold: 0, eDown: false, camp: null, atFire: false, restPt: null };

Survive.maxStam = function () {
  var m = K.ST_MAX;
  if (P.hunger < K.HU_CHOKE) m *= lerp(0.45, 1, P.hunger / K.HU_CHOKE);
  return m;
};

Survive.restNear = function () {
  var i, r, dx, dy, dz;
  for (i = 0; i < T.rests.length; i++) {
    r = T.rests[i];
    dx = r.x - P.pos.x; dy = r.y - P.pos.y; dz = r.z - P.pos.z;
    if (dx * dx + dy * dy + dz * dz < 2.2) return r;
  }
  for (i = 0; i < Coop.pitons.length; i++) {
    r = Coop.pitons[i];
    dx = r.x - P.pos.x; dy = r.y - P.pos.y; dz = r.z - P.pos.z;
    if (dx * dx + dy * dy + dz * dz < 2.6) return r;
  }
  return null;
};

Survive.tick = function (dt) {
  P.stMax = Survive.maxStam();
  if (P.st > P.stMax) P.st = P.stMax;

  var fire = Camps.nearest(P.pos.x, P.pos.y, P.pos.z, 7.5);
  Survive.atFire = !!(fire && fire.lit);
  Survive.camp = fire;

  // light a checkpoint just by reaching it
  if (fire && !fire.lit && Math.abs(fire.y - P.pos.y) < 4) {
    Camps.setLit(fire.idx, true);
    Net.send({ t: 'camp', i: fire.idx });
    HUD.toast('camp ' + (fire.idx + 1) + ' lit — the group respawns here now', '#ffd646');
    P.lastCamp = Math.max(P.lastCamp, fire.idx);
  }
  if (Survive.atFire) P.lastCamp = Math.max(P.lastCamp, fire.idx);

  // ---- stamina
  Survive.restPt = null;
  if (P.state === ST.CLIMB) {
    var m = P.climbing ? 1 : 0.46;
    var s = P.wall.surf;
    var free = (s === SF.VINE);
    var rest = Survive.restNear();
    if (rest) { Survive.restPt = rest; free = true; }
    if (s === SF.ICE) m *= 1.85;
    if (s === SF.LOOSE) m *= 1.15;
    if (P.wall.ny < 0.17) m *= 2.0;          // overhanging
    if (P.inj.arm) m *= 1.35;
    if (P.carrying) m *= 1.9;
    m += Wind.at(P.pos.y, P.exposure) * 0.55;
    if (free) {
      if (rest) P.st = Math.min(P.stMax, P.st + K.ST_REGEN_LEDGE * dt);
    } else {
      P.st -= K.ST_CLIMB * m * dt;
    }
    if (P.st <= 0) {
      P.st = 0;
      HUD.toast('your fingers open', '#ff5b52');
      P.state = ST.AIR; P.wall.has = false; P.fallFrom = P.pos.y;
      P.noGrabT = 0.8; P.gripLost = 1.2;
      CAM.kick(0.35);
    }
  } else if (P.state === ST.GROUND && !P.sprinting) {
    var flatness = invl(K.WALK_COS, 0.90, P.groundNy);
    var r = K.ST_REGEN_FLAT * flatness;
    if (P.carrying) r *= 0.5;
    if (Survive.atFire) r *= 1.6;
    P.st = Math.min(P.stMax, P.st + r * dt);
  }
  P.gripLost = Math.max(0, P.gripLost - dt);

  // ---- hunger
  var hr = K.HU_RATE * (P.state === ST.CLIMB ? 1.5 : P.sprinting ? 1.35 : 1);
  P.hunger = Math.max(0, P.hunger - hr * dt);

  // ---- cold
  var coldLine = K.BAND_ALP - 34;
  if (P.pos.y > coldLine) {
    var rate = (P.pos.y - coldLine) / 190 * 4.6 + Wind.at(P.pos.y, P.exposure) * 2.4 + 0.4;
    if (P.parka) rate *= 0.40;
    if (P.torchOn) rate *= 0.74;
    if (Survive.atFire) rate = -34;
    P.temp = clamp(P.temp - rate * dt, 0, K.TP_MAX);
  } else {
    P.temp = clamp(P.temp + (Survive.atFire ? 34 : 9) * dt, 0, K.TP_MAX);
  }
  if (P.temp < K.TP_FREEZE) {
    Survive.hurt((1 - P.temp / K.TP_FREEZE) * 2.7 * dt, 'the cold');
  }

  // ---- warmth and food at a fire
  if (Survive.atFire && P.hp < K.HP_MAX) P.hp = Math.min(K.HP_MAX, P.hp + 2.6 * dt);
  if (P.hunger <= 0) Survive.hurt(0.9 * dt, 'hunger');

  if (P.summited) return;
  Survive.interact(dt);
  Survive.checkSummit();
};

Survive.checkSummit = function () {
  if (!Summit.pos) return;
  var dx = P.pos.x, dz = P.pos.z, dy = P.pos.y - Summit.pos.y;
  if (dx * dx + dz * dz < 90 && dy > -6) {
    P.summited = true;
    Net.send({ t: 'top', n: P.name });
    HUD.summit();
  }
};

// ---------------------------------------------------------------- damage
Survive.hurt = function (d, cause) {
  if (P.state === ST.DOWN || P.summited) return;
  P.hp -= d;
  if (d > 2) { HUD.flashHurt(clamp(d / 40, 0.2, 1)); CAM.kick(clamp(d / 55, 0.05, 0.8)); }
  if (P.hp <= 0) {
    P.hp = 0;
    P.state = ST.DOWN; P.wall.has = false; P.downT = K.DOWN_T;
    P.st = 0;
    if (P.carrying) Coop.dropCarried();
    HUD.toast('you are down — ' + (cause || 'broken') + ' · a mate can carry or revive you', '#ff5b52');
    Net.send({ t: 'down' });
  }
};

Survive.land = function (dist) {
  P.landT = 0.22;
  if (dist < 1.2) return;
  var vy = Math.abs(P.vel.y);
  FX.puff(P.pos.x, P.pos.y + 0.05, P.pos.z, Math.min(14, 3 + dist | 0), 0xd8d0c0);
  CAM.kick(clamp(dist / 26, 0.02, 0.55));
  if (dist <= K.FALL_SAFE) return;
  var dmg = (dist - K.FALL_SAFE) * K.FALL_DMG;
  if (P.surf === SF.SNOW) dmg *= 0.7;
  P.stats.falls++;
  Survive.hurt(dmg, 'a ' + Math.round(dist) + ' m fall');
  P.st = Math.max(0, P.st - dmg * 0.5);
  if (dmg >= K.INJ_DMG && P.hp > 0) {
    var arm = Math.random() < 0.5;
    if (arm && !P.inj.arm) { P.inj.arm = 1; HUD.toast('wrenched shoulder — climbing hurts now', '#ffb454'); }
    else if (!P.inj.leg) { P.inj.leg = 1; HUD.toast('twisted ankle — you are slower now', '#ffb454'); }
    else if (!P.inj.arm) { P.inj.arm = 1; HUD.toast('wrenched shoulder — climbing hurts now', '#ffb454'); }
  }
};

Survive.respawn = function () {
  var idx = 0, i;
  for (i = 0; i < Camps.list.length; i++) if (Camps.list[i].lit) idx = Math.max(idx, i);
  var c = Camps.list[idx];
  P.state = ST.AIR; P.hp = 58; P.st = P.stMax; P.temp = K.TP_MAX;
  P.inj.leg = 0; P.inj.arm = 0;
  P.downT = 0; P.carriedBy = null;
  P.spawnAt(c.x + 2.2, c.y + 1.0, c.z + 1.4);
  HUD.toast('you wake up at camp ' + (idx + 1), '#31c6c0');
  Net.send({ t: 'up', x: P.pos.x, y: P.pos.y, z: P.pos.z });
};

// ---------------------------------------------------------------- inventory
Survive.add = function (kind) {
  var i, def = ITEM[kind];
  for (i = 0; i < 4; i++) if (P.inv[i] && P.inv[i].k === kind && P.inv[i].n < def.max) { P.inv[i].n++; return true; }
  for (i = 0; i < 4; i++) if (!P.inv[i]) { P.inv[i] = { k: kind, n: 1 }; return true; }
  return false;
};
Survive.remove = function (slot) {
  var s = P.inv[slot];
  if (!s) return null;
  var k = s.k;
  s.n--;
  if (s.n <= 0) P.inv[slot] = null;
  return k;
};
Survive.count = function (kind) {
  var n = 0;
  for (var i = 0; i < 4; i++) if (P.inv[i] && P.inv[i].k === kind) n += P.inv[i].n;
  return n;
};
Survive.findSlot = function (kind) {
  for (var i = 0; i < 4; i++) if (P.inv[i] && P.inv[i].k === kind) return i;
  return -1;
};

Survive.use = function (slot) {
  var s = P.inv[slot];
  if (!s) return;
  var def = ITEM[s.k];
  switch (def.kind) {
    case 'food': {
      var mul = Survive.atFire ? 1.4 : 1;
      P.hunger = Math.min(K.HU_MAX, P.hunger + def.food * mul);
      if (def.stam) P.st = Math.min(P.stMax, P.st + def.stam);
      HUD.toast(Survive.atFire ? 'cooked ' + def.nm : 'ate ' + def.nm, '#ffb454');
      Survive.remove(slot);
      break;
    }
    case 'heal':
      P.hp = Math.min(K.HP_MAX, P.hp + def.hp);
      if (P.inj.leg || P.inj.arm) HUD.toast('strapped up — injuries treated', '#8fe04a');
      else HUD.toast('patched up', '#8fe04a');
      P.inj.leg = 0; P.inj.arm = 0;
      Survive.remove(slot);
      break;
    case 'wear':
      P.parka = !P.parka;
      P.fig.setParka(P.parka);
      HUD.toast(P.parka ? 'parka on — the cold bites less' : 'parka off', '#7fd4ff');
      break;
    case 'torch':
      P.torchOn = !P.torchOn;
      HUD.toast(P.torchOn ? 'torch lit' : 'torch out', '#ff8a3d');
      break;
    case 'piton':
      if (P.state !== ST.CLIMB) { HUD.toast('hammer a piton while on a wall', '#a8a39a'); break; }
      Coop.placePiton(P.pos.x - P.wall.nx * 0.3, P.pos.y + 0.3, P.pos.z - P.wall.nz * 0.3, P.wall.nx, P.wall.nz);
      Survive.remove(slot);
      HUD.toast('piton set — a place to breathe', '#8fe04a');
      break;
    case 'rope':
      HUD.toast('press R to anchor the rope', '#a8a39a');
      break;
  }
};

// ---------------------------------------------------------------- E button
Survive.interact = function (dt) {
  var held = IN.interactHeld() && !HUD.blocked;
  var downMate = Coop.nearestDown(2.6);

  if (held) {
    Survive.eHold += dt;
    if (downMate && !P.carrying && P.state !== ST.CLIMB) {
      P.reviveT += dt;
      P.reviveTgt = downMate.id;
      if (P.reviveT >= K.REVIVE_T) {
        Coop.revive(downMate);
        P.reviveT = 0; P.reviveTgt = null;
        Survive.eHold = -1;
      }
    } else { P.reviveT = 0; P.reviveTgt = null; }
  } else {
    if (Survive.eHold > 0 && Survive.eHold < 0.3) {
      // a tap: pick up gear, shoulder a mate, or set one down
      if (P.carrying) Coop.dropCarried();
      else if (downMate && P.state !== ST.CLIMB) Coop.pickUp(downMate);
      else {
        var it = WI.nearest(P.pos.x, P.pos.y + 0.6, P.pos.z, 2.7);
        if (it) {
          if (Survive.add(it.k)) {
            WI.take(it.id);
            Net.send({ t: 'pick', i: it.id });
            HUD.toast('picked up ' + ITEM[it.k].nm, '#8fe04a');
          } else HUD.toast('your pack is full', '#ffb454');
        }
      }
    }
    Survive.eHold = 0;
    P.reviveT = Math.max(0, P.reviveT - dt * 2.4);
    if (P.reviveT <= 0) P.reviveTgt = null;
  }

  // slot select, use, drop, pass
  for (var i = 0; i < 4; i++) if (IN.press('Digit' + (i + 1))) P.sel = i;
  if (IN.use() && !HUD.blocked) Survive.use(P.sel);
  if (IN.press('KeyX') && !HUD.blocked && P.inv[P.sel]) {
    var k = Survive.remove(P.sel);
    var id = WI.dropAt(k, P.pos.x + Math.sin(P.yaw) * 0.9, groundH(P.pos.x + Math.sin(P.yaw) * 0.9, P.pos.z + Math.cos(P.yaw) * 0.9), P.pos.z + Math.cos(P.yaw) * 0.9);
    Net.send({ t: 'drop', k: k, id: id, x: P.pos.x + Math.sin(P.yaw) * 0.9, y: P.pos.y, z: P.pos.z + Math.cos(P.yaw) * 0.9 });
  }
  if (IN.pass() && !HUD.blocked) Coop.passItem();
};
