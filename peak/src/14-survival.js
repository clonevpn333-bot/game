// ============================================================ STAMINA & LIFE
// One bar. Statuses eat into it from the right, so the green you have left
// is the whole story of how far you can still climb.
var Survive = {
  drain: 0, why: [],      // current cost of holding the wall, and what is making it that
 atFire: false, camp: null, holdF: 0, deaths: 0 };

Survive.statusSum = function () {
  var s = 0;
  for (var i = 0; i < STATUS.length; i++) s += P.status[STATUS[i].k];
  return s;
};

Survive.recalcMax = function () {
  var wt = 0;
  for (var i = 0; i < 3; i++) if (P.inv[i]) wt += ITEM[P.inv[i].k].wt * P.inv[i].n;
  if (P.carrying) wt += 26;
  P.status.weight = clamp(wt, 0, 55);
  var sum = Survive.statusSum();
  P.stMax = Math.max(0, K.ST_MAX - clamp(sum, 0, K.ST_MAX));
  if (P.st > P.stMax) P.st = P.stMax;
};

// Hazards plateau instead of taking the whole bar: exposure should be a clock
// you plan around, not a wipe you cannot outrun.  Only the things you choose
// to carry - weight, injury, hunger - can fill it all the way.
Survive.seen = {};
Survive.addStatus = function (k, n, cap) {
  var was = P.status[k];
  if (n > 0 && cap !== undefined && was >= cap) return;
  var top = (n > 0 && cap !== undefined) ? Math.min(100, cap) : 100;
  P.status[k] = clamp(was + n, 0, Math.max(was, top));
  // and say what it is the first time it shows up, with the cure
  if (n > 0 && was < 7 && P.status[k] >= 7 && !Survive.seen[k]) {
    Survive.seen[k] = 1;
    for (var i = 0; i < STATUS.length; i++) {
      if (STATUS[i].k !== k) continue;
      HUD.toast(STATUS[i].ic + '  ' + STATUS[i].nm + ' — ' + STATUS[i].fix, STATUS[i].col);
      break;
    }
  }
};

// Take from the green first; on a wall, fall back to bonus stamina, which
// never comes back on its own.
Survive.spend = function (n) {
  if (P.lolliT > 0) return n;
  var got = 0;
  var take = Math.min(P.st, n);
  P.st -= take; got += take; n -= take;
  if (n > 0 && (P.state === ST.CLIMB)) {
    var t2 = Math.min(P.extra, n);
    P.extra -= t2; got += t2;
  }
  return got;
};

Survive.tick = function (dt) {
  Survive.recalcMax();

  var fire = Camps.nearest(P.pos.x, P.pos.y, P.pos.z, 8);
  Survive.atFire = !!(fire && fire.lit);
  Survive.camp = fire;

  if (fire && !fire.lit && Math.abs(fire.y - P.pos.y) < 4.5) {
    Camps.setLit(fire.idx, true);
    Net.send({ t: 'camp', i: fire.idx });
    HUD.toast('campfire lit', '#ffd646');
  }

  // ---- stamina
  P.lolliT = Math.max(0, P.lolliT - dt);
  P.milkT = Math.max(0, P.milkT - dt);
  if (P.lolliT > 0) {
    P.st = P.stMax;
    if (P.lolliT < dt * 2) { Survive.addStatus('drowsy', 34); HUD.toast('the sugar wears off', '#8a8fb0'); }
  }

  if (P.state === ST.CLIMB) {
    // Everything that makes the wall cost more is named here, so the HUD can
    // say WHY the bar is going down fast instead of leaving you to guess.
    var drain = (P.climbing ? K.ST_CLIMB : K.ST_HANG);
    Survive.why.length = 0;
    var gust = Math.min(Wind.at(P.pos.y, 1) * 0.9, 3.2);   // capped: a gust used to double the cost
    if (gust > 0.5) { drain += gust; Survive.why.push('wind'); }
    if (P.rope) { drain *= 0.3; Survive.why.push('rope'); }
    else if (P.wall.surf === SF.ICE) { drain *= 1.35; Survive.why.push('ice'); }
    else if (biomeIs(P.pos.y, 'kiln')) { drain *= 1.4; Survive.why.push('kiln'); }
    if (P.carrying) { drain *= 1.5; Survive.why.push('carrying'); }
    Survive.drain = drain;
    if (P.onPiton) {
      Survive.drain = -K.ST_REGEN_PITON;
      Survive.why.length = 0; Survive.why.push('piton');
      // the one place you can get your breath back off the ground
      P.st = Math.min(P.stMax, P.st + K.ST_REGEN_PITON * dt);
      P.gripT = 0;
    } else {
      var want = drain * dt;
      var paid = Survive.spend(want);
      if (paid < want - 1e-6 && P.st <= 0 && P.extra <= 0) {
        // You do not drop the instant the bar empties.  You scrabble first,
        // loudly, for about a second - that is the warning.  Reach a piton,
        // a rope or a ledge inside it and you keep the wall.
        P.gripT += dt;
        if (P.gripT >= K.GRIP_GRACE) {
          P.state = ST.SLIP;
          P.vel.y = -1.2;
          HUD.toast('your grip goes', '#ff5b52');
          CAM.kick(0.4);
        } else if (P.gripT < dt * 2) {
          HUD.toast('losing your grip!', '#ff5b52');
          CAM.kick(0.22);
        }
      } else P.gripT = 0;
    }
  } else if (P.state === ST.SLIP) {
    Survive.drain = 0; Survive.why.length = 0;
    if (P.st > 0.5) { P.state = ST.CLIMB; }
  } else {
    Survive.drain = 0; Survive.why.length = 0; P.gripT = 0;
  }
  if (P.state === ST.GROUND && P.groundT >= K.ST_REGEN_DELAY && !P.sprinting) {
    P.st = Math.min(P.stMax, P.st + K.ST_REGEN * dt * (Survive.atFire ? 1.5 : 1));
  }

  // ---- hunger creeps up the whole run
  Survive.addStatus('hunger', K.HUNGER_RATE * dt * (P.state === ST.CLIMB ? 1.5 : 1));

  // ---- what the biome you are standing in does to you
  var bi = biomeAt(P.pos.y), haz = bi.haz, surf = P.surf;
  if (Survive.atFire) {
    P.status.cold = Math.max(0, P.status.cold - 34 * dt);
    P.status.heat = Math.max(0, P.status.heat - 22 * dt);
    P.status.poison = Math.max(0, P.status.poison - 10 * dt);
    P.status.drowsy = Math.max(0, P.status.drowsy - 14 * dt);
    if (P.hp < K.HP_MAX) P.hp = Math.min(K.HP_MAX, P.hp + 5 * dt);
  } else {
    if (haz === 'cold') {
      Survive.addStatus('cold', (0.6 + Wind.gust * 1.1) * dt, 38);
    } else if (haz === 'heat') {
      Survive.addStatus('heat', 0.55 * dt, 34);
    } else if (haz === 'kiln') {
      // the kiln is the last push and it is pure attrition
      Survive.addStatus('heat', 0.8 * dt, 44);
      Survive.addStatus('curse', 0.16 * dt, 26);
    } else if (haz === 'poison') {
      if (Wind.rain > 0.4) Survive.addStatus('poison', 0.3 * dt, 32);
    } else if (haz === 'spore') {
      // spore mist: poison in the drifts, drowsy everywhere
      Survive.addStatus('drowsy', 0.2 * dt, 32);
      if (surf === SF.SPORE) Survive.addStatus('poison', 0.9 * dt, 40);
    } else if (haz === 'sun') {
      // the mesa sun only lets up in the shade
      if (surf === SF.SHADE) P.status.heat = Math.max(0, P.status.heat - 7 * dt);
      else Survive.addStatus('heat', 0.85 * dt, 40);
    } else if (haz === 'drowsy') {
      // the gloom's fog puts you to sleep, and the long dark chills you
      Survive.addStatus('drowsy', 0.25 * dt, 36);
      if (surf === SF.MURK) Survive.addStatus('drowsy', 0.45 * dt, 46);
      if (P.status.drowsy > 42) Survive.addStatus('cold', 0.5 * dt, 36);
    } else if (haz === 'wind') {
      Survive.addStatus('cold', 0.42 * dt, 34);
    } else {
      P.status.cold = Math.max(0, P.status.cold - 4 * dt);
      P.status.heat = Math.max(0, P.status.heat - 4 * dt);
    }
  }
  if (surf === SF.THORN && P.state !== ST.CLIMB) Survive.addStatus('thorns', 2.4 * dt, 30);
  if (surf === SF.EMBER) { Survive.addStatus('heat', 3.0 * dt, 62); Survive.hurt(0.85 * dt, 'the hot rock'); }
  if (P.status.cold > 76) Survive.hurt((P.status.cold - 76) / 24 * 2.4 * dt, 'the cold');
  if (P.status.heat > 76) Survive.hurt((P.status.heat - 76) / 24 * 2.4 * dt, 'the heat');
  if (P.status.poison > 52) Survive.hurt(0.9 * dt, 'poison');
  if (P.status.hunger > 88) Survive.hurt(1.2 * dt, 'hunger');

  // Away from a hazard, the scout gets their breath and their skin back very
  // slowly.  Without this a single bad landing follows you the whole run and
  // every mistake is permanent until you find a fire.
  if (!Survive.atFire && P.hp < K.HP_MAX && P.status.poison < 20 && P.status.heat < 45 && P.status.cold < 45) {
    P.hp = Math.min(K.HP_MAX, P.hp + 0.8 * dt);
  }

  // ---- the rising fog: it comes for everyone
  if (P.pos.y < Fog.level) Survive.hurt(16 * dt, 'the fog');

  // ---- no room left on the bar and you are out
  if (P.stMax <= 0.5 && P.state !== ST.OUT) Survive.knockOut('the mountain');
  if (P.state === ST.OUT) {
    P.outT -= dt;
    if (P.outT <= 0) { Survive.deaths++; Survive.respawn(); }
  }

  Survive.interact(dt);
  Survive.checkSummit();
};

Survive.checkSummit = function () {
  if (!Summit.pos || P.summited) return;
  var dx = P.pos.x, dz = P.pos.z, dy = P.pos.y - Summit.pos.y;
  if (dx * dx + dz * dz < 70 && dy > -5) {
    P.summited = true; Summit.fired = true;
    Net.send({ t: 'top', n: P.name });
    HUD.summit();
  }
};

// ---------------------------------------------------------------- damage
Survive.hurt = function (d, cause) {
  if (P.state === ST.OUT || P.summited || d <= 0) return;
  if (P.milkT > 0) return;
  P.hp -= d;
  if (d > 2) { HUD.flashHurt(clamp(d / 40, 0.2, 1)); CAM.kick(clamp(d / 55, 0.05, 0.8)); }
  if (P.hp <= 0) { P.hp = 0; Survive.knockOut(cause); }
};

Survive.knockOut = function (cause) {
  if (P.state === ST.OUT) return;
  P.state = ST.OUT;
  P.wall.has = false; P.handOn = false;
  P.st = 0; P.extra = 0;
  P.outT = Remote.list.length > 0 ? K.OUT_T_TEAM : K.OUT_T_SOLO;
  if (P.carrying) Coop.dropCarried();
  // go limp from exactly where the body was, carrying the fall into the tumble
  if (P.fig) P.fig.limp(P.pos.x, P.pos.y, P.pos.z, P.vel.x, P.vel.y, P.vel.z, P.yaw);
  HUD.toast('you go down — ' + (cause || 'spent') + '', '#ff5b52');
  Net.send({ t: 'down' });
};

Survive.land = function (drop) {
  if (P.fig) P.fig.land(clamp((drop - 0.8) / 7, 0, 1));
  if (drop < 1.2) return;
  FX.slam(P.pos.x, P.pos.y, P.pos.z, clamp((drop - 1.2) / 16, 0.1, 1));
  CAM.kick(clamp(drop / 26, 0.02, 0.55));
  if (drop <= K.FALL_SAFE) return;
  var dmg = (drop - K.FALL_SAFE) * K.FALL_DMG;
  if (P.surf === SF.SNOW || P.surf === SF.SAND) dmg *= 0.7;
  P.stats.falls++;
  Survive.hurt(dmg, 'a ' + Math.round(drop) + ' m fall');
  Survive.spend(dmg * 0.4);
  if (dmg >= K.INJ_DMG) Survive.addStatus('injury', clamp(dmg * 0.5, 8, 34));
};

Survive.respawn = function () {
  var idx = 0, i;
  for (i = 0; i < Camps.list.length; i++) if (Camps.list[i].lit) idx = Math.max(idx, i);
  var c = Camps.list[idx];
  P.state = ST.AIR; P.hp = K.HP_MAX; P.outT = 0; P.carriedBy = null;
  if (P.fig) P.fig.standUp();
  for (i = 0; i < STATUS.length; i++) P.status[STATUS[i].k] = 0;
  P.extra = 0;
  Survive.recalcMax();
  P.st = P.stMax;
  P.spawnAt(c.x + 2.4, c.z + 1.6, c.y);
  HUD.toast('you wake up at the fire', '#31c6c0');
  Net.send({ t: 'up', x: P.pos.x, y: P.pos.y, z: P.pos.z });
};

// ---------------------------------------------------------------- pack
Survive.add = function (kind) {
  var i;
  for (i = 0; i < 3; i++) if (!P.inv[i]) { P.inv[i] = { k: kind, n: 1 }; Survive.recalcMax(); return true; }
  return false;
};
Survive.remove = function (slot) {
  var s = P.inv[slot];
  if (!s) return null;
  var k = s.k;
  P.inv[slot] = null;
  Survive.recalcMax();
  return k;
};
Survive.findSlot = function (kind) {
  for (var i = 0; i < 3; i++) if (P.inv[i] && P.inv[i].k === kind) return i;
  return -1;
};

Survive.use = function (slot) {
  var s = P.inv[slot];
  if (!s) return;
  var d = ITEM[s.k];
  switch (d.kind) {
    case 'eat': {
      var cook = Survive.atFire ? 1.5 : 1;
      if (d.hunger) P.status.hunger = Math.max(0, P.status.hunger - d.hunger * cook);
      if (d.extra) P.extra = Math.min(K.EXTRA_MAX, P.extra + d.extra * cook);
      if (d.drowsy) Survive.addStatus('drowsy', d.drowsy);
      HUD.toast((Survive.atFire ? 'cooked ' : 'ate ') + d.nm, '#ffb454');
      Survive.remove(slot);
      break;
    }
    case 'lolly':
      P.lolliT = 12;
      HUD.toast('everything feels possible', '#f05a9a');
      Survive.remove(slot);
      break;
    case 'milk':
      P.milkT = 10;
      HUD.toast('nothing can touch you for a moment', '#dfe6f0');
      Survive.remove(slot);
      break;
    case 'cure':
      P.status[d.clears] = 0;
      if (d.hp) P.hp = Math.min(K.HP_MAX, P.hp + d.hp);
      HUD.toast('used ' + d.nm, '#8fe04a');
      Survive.remove(slot);
      break;
    case 'piton':
      if (P.state !== ST.CLIMB && P.state !== ST.SLIP) { HUD.toast('hammer a piton while on a wall', '#a8a39a'); break; }
      Coop.placePiton(P.wall.cx, P.pos.y + 0.3, P.wall.cz, P.wall.nx, P.wall.nz);
      Survive.remove(slot);
      break;
    case 'spool':
      if (Coop.dropSpool()) Survive.remove(slot);
      break;
    case 'cannon':
      if (Coop.fireCannon()) Survive.remove(slot);
      break;
    case 'torch':
      P.torchOn = !P.torchOn;
      HUD.toast(P.torchOn ? 'torch lit' : 'torch out', '#ff8a3d');
      break;
  }
};

// ---------------------------------------------------------------- F button
Survive.interact = function (dt) {
  var held = IN.interactHeld() && !HUD.blocked && P.state !== ST.OUT;
  var downMate = Coop.nearestDown(2.8);

  if (held) {
    Survive.holdF += dt;
    if (downMate && !P.carrying) {
      P.reviveT += dt; P.reviveTgt = downMate.id;
      if (P.reviveT >= K.REVIVE_T) {
        Coop.revive(downMate);
        P.reviveT = 0; P.reviveTgt = null; Survive.holdF = -1;
      }
    } else { P.reviveT = 0; P.reviveTgt = null; }
  } else {
    if (Survive.holdF > 0 && Survive.holdF < 0.32) {
      if (P.carrying) Coop.dropCarried();
      else if (downMate) Coop.pickUp(downMate);
      else {
        var box = WI.nearestCase(P.pos.x, P.pos.y + 0.4, P.pos.z, 2.6);
        var it = WI.nearest(P.pos.x, P.pos.y + 0.6, P.pos.z, 2.6);
        if (box && (!it || Math.abs(box.y - P.pos.y) < 3)) {
          WI.openCase(box.id);
          Net.send({ t: 'case', i: box.id });
          HUD.toast('suitcase open', '#ffd646');
        } else if (it) {
          if (Survive.add(it.k)) {
            WI.take(it.id);
            Net.send({ t: 'pick', i: it.id });
            HUD.toast('picked up ' + ITEM[it.k].nm, '#8fe04a');
          } else HUD.toast('your hands are full', '#ffb454');
        }
      }
    }
    Survive.holdF = 0;
    P.reviveT = Math.max(0, P.reviveT - dt * 2.4);
    if (P.reviveT <= 0) P.reviveTgt = null;
  }

  if (HUD.blocked || P.state === ST.OUT) return;
  for (var i = 0; i < 3; i++) if (IN.press('Digit' + (i + 1))) P.sel = i;
  if (IN.use()) Survive.use(P.sel);
  if (IN.drop() && P.inv[P.sel]) {
    var k = Survive.remove(P.sel);
    var f = CAM.flatForward(_tmpC);
    var id = WI.dropAt(k, P.pos.x + f.x * 1.1, P.pos.y, P.pos.z + f.z * 1.1);
    Net.send({ t: 'drop', k: k, id: id, x: P.pos.x + f.x * 1.1, z: P.pos.z + f.z * 1.1 });
  }
};
