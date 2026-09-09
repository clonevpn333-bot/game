/* ============================================================
   AMONG US 3D — BOT AI
   Crew bots run their task list, react to bodies and fix
   sabotages. Impostor bots stalk isolated targets, fake tasks,
   vent, sabotage and lie in meetings.
   ============================================================ */
(function (AU) {
'use strict';

function dist(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
function rnd(n) { return Math.floor(Math.random() * n); }
function pick(a) { return a[rnd(a.length)]; }

function initBot(p) {
  p.ai = {
    state: 'idle',
    target: null,
    path: null,
    pathIdx: 0,
    wait: 0,
    repathIn: 0,
    suspicion: {},          // playerId -> score
    sawVent: {},            // playerId -> true
    lastRoom: null,
    reportCooldown: 0,
    sabTargetRoom: null,
    fakeTaskIdx: 0,
    chatCooldown: 2 + Math.random() * 6,
    personality: {
      chatty: Math.random(),
      brave: Math.random(),
      aggressive: 0.35 + Math.random() * 0.55,
      sloppy: Math.random()
    }
  };
}

/* ---------------- movement ---------------- */
function setDestination(p, G, x, z, roomId, keep) {
  var here = G.layout.roomAt(p.x, p.z);
  p.ai.path = G.layout.path(p.x, p.z, x, z, here && here.id, roomId);
  p.ai.pathIdx = 0;
  if (keep && p.ai.dest) { p.ai.dest.x = x; p.ai.dest.z = z; }
  else p.ai.dest = { x: x, z: z };
  p.ai.repathIn = 6 + Math.random() * 4;
}

function followPath(p, dt, G, speed) {
  var ai = p.ai;
  if (!ai.path || ai.pathIdx >= ai.path.length) return true;
  var wp = ai.path[ai.pathIdx];
  var dx = wp.x - p.x, dz = wp.z - p.z;
  var d = Math.hypot(dx, dz);
  if (d < 0.6) { ai.pathIdx++; return ai.pathIdx >= ai.path.length; }
  var vx = dx / d * speed, vz = dz / d * speed;
  var nx = p.x + vx * dt, nz = p.z + vz * dt;
  if (G.layout.free(nx, nz) && !G.world.doorBlocks(nx, nz, AU.PLAYER_RADIUS)) {
    p.x = nx; p.z = nz;
  } else if (G.layout.free(nx, p.z) && !G.world.doorBlocks(nx, p.z, AU.PLAYER_RADIUS)) {
    p.x = nx;
  } else if (G.layout.free(p.x, nz) && !G.world.doorBlocks(p.x, nz, AU.PLAYER_RADIUS)) {
    p.z = nz;
  } else {
    ai.repathIn = 0;
  }
  p.facing = Math.atan2(vx, vz);
  p.moving = true;
  return false;
}

/* ---------------- perception ---------------- */
function visibleTargets(p, G) {
  var out = [];
  for (var i = 0; i < G.players.length; i++) {
    var o = G.players[i];
    if (o === p || !o.alive || o.venting || o.invisible) continue;
    var d = dist(p, o);
    if (d > 16) continue;
    if (!G.layout.lineClear(p.x, p.z, o.x, o.z)) continue;
    out.push({ p: o, d: d });
  }
  out.sort(function (a, b) { return a.d - b.d; });
  return out;
}
function visibleBody(p, G) {
  for (var i = 0; i < G.bodies.length; i++) {
    var b = G.bodies[i];
    if (b.reported || b.dissolved || b.skinOnly) continue;
    var d = Math.hypot(p.x - b.x, p.z - b.z);
    if (d < 11 && G.layout.lineClear(p.x, p.z, b.x, b.z)) {
      if (!p.ai.sawBody) p.ai.sawBody = {};
      if (!p.ai.sawBody[b.id]) {
        p.ai.sawBody[b.id] = 1;
        AU.Memory.witness(p, 'body', { who: b.killer, victim: b.playerId, x: b.x, z: b.z }, G);
        /* anyone standing over a fresh body is worth a second look */
        G.players.forEach(function (o) {
          if (o === p || !o.alive) return;
          if (Math.hypot(o.x - b.x, o.z - b.z) < 5 && G.time - b.time < 20) {
            AU.Memory.witness(p, 'body', { who: o.id, victim: b.playerId, x: b.x, z: b.z }, G);
          }
        });
      }
      return b;
    }
  }
  return null;
}

/* ---------------- crew behaviour ---------------- */
function crewUpdate(p, dt, G) {
  var ai = p.ai;
  var speed = G.playerSpeed();

  /* react to a body */
  if (ai.reportCooldown > 0) ai.reportCooldown -= dt;
  var body = visibleBody(p, G);
  if (body && ai.reportCooldown <= 0 && p.alive) {
    var d = Math.hypot(p.x - body.x, p.z - body.z);
    if (d < AU.REPORT_RANGE) {
      G.reportBody(p, body);
      ai.reportCooldown = 20;
      return;
    }
    ai.state = 'report';
    if (!ai.dest || Math.hypot(ai.dest.x - body.x, ai.dest.z - body.z) > 1)
      setDestination(p, G, body.x, body.z, body.room);
    followPath(p, dt, G, speed * 1.05);
    return;
  }

  /* deal with sabotages — critical ones are dropped-everything urgent,
     the rest get picked up by whoever happens to feel responsible */
  if (!G.sabotage) ai.fixing = false;
  if (G.sabotage) {
    if (G.sabotage.critical) ai.fixing = true;
    else if (!ai.fixing && Math.random() < dt * 0.55) ai.fixing = true;
    if (ai.fixing) {
      var room = nearestSabRoom(p, G);
      if (!room) { ai.fixing = false; }
      else {
        ai.state = 'fix';
        var R = AU.roomOf(G.map, room);
        if (!ai.dest || ai.dest.room !== room) { setDestination(p, G, R.x, R.z, room); ai.dest.room = room; }
        var arrived = followPath(p, dt, G, speed * 1.1);
        if (arrived || dist(p, R) < 4.0) {
          p.moving = false;
          ai.wait -= dt;
          if (ai.wait <= 0) { G.botFixSabotage(p); ai.wait = 1.2; }
        } else if (ai.wait <= 0) ai.wait = 1.0 + Math.random();
        return;
      }
    }
  }

  /* emergency meeting if very suspicious of someone and near the button */
  /* (bots only call meetings rarely, to avoid spam) */

  /* run the task list */
  var task = nextTask(p);
  if (!task) { wander(p, dt, G, speed); return; }
  var step = task.steps[task.progress];
  var cons = G.world.consoles[step.key];
  if (!cons) { task.progress++; return; }
  if (!ai.dest || ai.dest.key !== step.key) {
    setDestination(p, G, cons.x, cons.z, cons.room);
    ai.dest.key = step.key;
    ai.wait = 0;
  }
  var near = Math.hypot(cons.x - p.x, cons.z - p.z);
  if (near > 1.3) {
    ai.state = 'task';
    followPath(p, dt, G, speed);
    /* the path can run out short of the console; nudge the last stretch */
    if ((!ai.path || ai.pathIdx >= ai.path.length) && near > 1.3) {
      var dx = (cons.x - p.x) / near, dz = (cons.z - p.z) / near;
      var nx = p.x + dx * speed * dt, nz = p.z + dz * speed * dt;
      if (G.layout.free(nx, nz) && !G.world.doorBlocks(nx, nz, AU.PLAYER_RADIUS)) {
        p.x = nx; p.z = nz; p.facing = Math.atan2(dx, dz); p.moving = true;
      } else {
        setDestination(p, G, cons.x, cons.z, cons.room, true);
      }
    }
    return;
  }
  /* at the console: stand still and work */
  p.moving = false;
  p.doingTask = true;
  p.facing = Math.atan2(cons.x - p.x, cons.z - p.z);
  if (ai.wait <= 0) ai.wait = taskTime(task) * (0.7 + Math.random() * 0.6);
  ai.wait -= dt;
  if (ai.wait <= 0) {
    p.doingTask = false;
    G.completeBotStep(p, task);
    ai.dest = null;
    ai.wait = 0;
  }
}

function taskTime(task) {
  return task.kind === 'long' ? 6 : task.kind === 'common' ? 4.5 : 3.5;
}
function nextTask(p) {
  for (var i = 0; i < p.tasks.length; i++)
    if (p.tasks[i].progress < p.tasks[i].steps.length) return p.tasks[i];
  return null;
}
function nearestSabRoom(p, G) {
  if (!G.sabotage) return null;
  var rooms = G.sabotage.def.rooms || [];
  var best = null, bd = Infinity;
  for (var i = 0; i < rooms.length; i++) {
    if (G.sabotage.fixedRooms && G.sabotage.fixedRooms[rooms[i]]) continue;
    var R = AU.roomOf(G.map, rooms[i]);
    if (!R) continue;
    var d = dist(p, R);
    if (d < bd) { bd = d; best = rooms[i]; }
  }
  return best;
}
function wander(p, dt, G, speed) {
  var ai = p.ai;
  if (!ai.dest || followPath(p, dt, G, speed * 0.8)) {
    if (ai.wait > 0) { ai.wait -= dt; p.moving = false; return; }
    var room = pick(G.map.rooms);
    var pt = G.layout.randomPointIn(room.id);
    setDestination(p, G, pt.x, pt.z, room.id);
    ai.wait = 1 + Math.random() * 2;
  }
}

/* ---------------- impostor behaviour ---------------- */
function impostorUpdate(p, dt, G) {
  var ai = p.ai;
  var speed = G.playerSpeed();
  var killRange = AU.KILL_RANGES[G.settings.killDistance] || 1.6;

  if (p.killCd > 0) p.killCd -= dt;

  /* venting escape */
  if (p.venting) { p.moving = false; ai.wait -= dt;
    if (ai.wait <= 0) {
      var v = G.world.ventById(p.ventId);
      var links = v ? v.links : [];
      if (links.length && Math.random() < 0.75) G.moveThroughVent(p, pick(links));
      else G.exitVent(p);
      ai.wait = 1.2 + Math.random() * 2.2;
    }
    return;
  }

  /* opportunistic sabotage */
  if (!G.sabotage && G.sabotageCd <= 0 && Math.random() < dt * 0.09) {
    G.botSabotage(p);
  }

  /* hunt — a bot lines a kill up rather than snapping onto whoever appears */
  var seen = visibleTargets(p, G);
  var crewNearby = seen.filter(function (s) { return s.p.team !== 'impostor'; });

  /* pressure builds the longer the round drags on with nothing happening,
     so a lone surviving Impostor stops hiding forever */
  if (p.lastKillAt == null) p.lastKillAt = 0;
  /* meetings only partly reset the clock, so a stalling round still builds */
  var stale = G.time - Math.max(p.lastKillAt, (G.lastMeetingAt || 0) - 20);
  var pressure = Math.min(1, stale / 45);
  var impsLeft = G.players.filter(function (q) { return q.alive && q.team === 'impostor'; }).length;
  var crewLeft = G.players.filter(function (q) { return q.alive && q.team === 'crew'; }).length;
  if (impsLeft === 1 && crewLeft <= 4) pressure = Math.min(1, pressure + 0.45);
  var allowedWitnesses = pressure > 0.85 ? 2 : pressure > 0.5 ? 1 : 0;

  if (p.killCd <= 0 && crewNearby.length) {
    var t = crewNearby[0];
    var witnesses = 0;
    for (var i = 0; i < G.players.length; i++) {
      var o = G.players[i];
      if (o === p || o === t.p || !o.alive || o.team === 'impostor') continue;
      if (dist(o, t.p) < 13 && G.layout.lineClear(o.x, o.z, t.p.x, t.p.z)) witnesses++;
    }
    var safe = witnesses <= allowedWitnesses &&
      (witnesses === 0 || ai.personality.aggressive > 0.55);

    if (safe) {
      if (t.d <= killRange + 0.35) {
        /* hesitate: hold the target in range for a beat before striking */
        if (ai.stalkTarget !== t.p.id) { ai.stalkTarget = t.p.id; ai.stalk = 0; }
        ai.stalk += dt;
        var needed = (0.85 - ai.personality.aggressive * 0.4) * (1 - pressure * 0.55);
        p.moving = false;
        if (ai.stalk >= Math.max(0.18, needed)) {
          G.doKill(p, t.p);
          p.lastKillAt = G.time;
          ai.stalk = 0; ai.stalkTarget = null;
          var v = nearestVent(p, G);
          if (v && Math.hypot(v.x - p.x, v.z - p.z) < 7 && Math.random() < 0.75) {
            setDestination(p, G, v.x, v.z, v.room);
            ai.state = 'tovent'; ai.ventTarget = v;
          } else {
            var room = pick(G.map.rooms);
            var pt = G.layout.randomPointIn(room.id);
            setDestination(p, G, pt.x, pt.z, room.id);
            ai.state = 'flee';
          }
        }
        return;
      }
      ai.state = 'hunt';
      ai.stalkTarget = null; ai.stalk = 0;
      setDestination(p, G, t.p.x, t.p.z, null);
      followPath(p, dt, G, speed * 1.02);
      return;
    }
  }
  ai.stalkTarget = null; ai.stalk = 0;

  /* Nothing safe in view: stalk whoever is most isolated instead of milling
     about. This is what stops a lone Impostor from freezing the round. */
  if (p.killCd <= 0 && pressure > 0.18) {
    var mark = mostIsolated(p, G);
    if (mark) {
      ai.state = 'stalk';
      if (!ai.dest || ai.dest.markId !== mark.id || ai.repathIn <= 0) {
        setDestination(p, G, mark.x, mark.z, null);
        ai.dest.markId = mark.id;
      }
      followPath(p, dt, G, speed * (1 + pressure * 0.12));
      return;
    }
  }

  if (ai.state === 'tovent' && ai.ventTarget) {
    var arrived = followPath(p, dt, G, speed * 1.15);
    if (arrived || Math.hypot(ai.ventTarget.x - p.x, ai.ventTarget.z - p.z) < 1.2) {
      G.enterVent(p, ai.ventTarget);
      ai.wait = 1.5 + Math.random() * 2;
      ai.state = 'venting';
    }
    return;
  }

  /* shapeshift / vanish flavour */
  if (p.role === 'shapeshifter' && p.abilityCd <= 0 && !p.shifted && Math.random() < dt * 0.05) {
    var others = G.players.filter(function (o) { return o !== p && o.alive; });
    if (others.length) G.shapeshift(p, pick(others));
  }
  if (p.role === 'phantom' && p.abilityCd <= 0 && !p.invisible && crewNearby.length && Math.random() < dt * 0.5) {
    G.vanish(p);
  }

  /* report a body sometimes (self-report bluff) */
  var body = visibleBody(p, G);
  if (body && Math.hypot(p.x - body.x, p.z - body.z) < AU.REPORT_RANGE &&
      body.killer !== p.id && Math.random() < dt * 1.5) {
    G.reportBody(p, body); return;
  }
  if (body && body.killer === p.id && ai.personality.aggressive > 0.75 &&
      Math.hypot(p.x - body.x, p.z - body.z) < AU.REPORT_RANGE && Math.random() < dt * 0.3) {
    G.reportBody(p, body); return;
  }

  /* fake tasks */
  var task = nextTask(p);
  if (task) {
    var step = task.steps[task.progress];
    var cons = G.world.consoles[step.key];
    if (cons) {
      if (!ai.dest || ai.dest.key !== step.key) {
        setDestination(p, G, cons.x, cons.z, cons.room);
        ai.dest.key = step.key; ai.wait = 0;
      }
      var done2 = followPath(p, dt, G, speed);
      if (done2) {
        p.moving = false;
        if (ai.wait <= 0) ai.wait = taskTime(task);
        ai.wait -= dt;
        p.doingTask = true;
        if (ai.wait <= 0) { p.doingTask = false; task.progress++; ai.dest = null; }
      }
      return;
    }
  }
  wander(p, dt, G, speed);
}
/* The crewmate with the fewest friends nearby — the natural next victim. */
function mostIsolated(p, G) {
  var best = null, bestScore = -1e9;
  for (var i = 0; i < G.players.length; i++) {
    var t = G.players[i];
    if (t === p || !t.alive || t.team === 'impostor' || t.venting) continue;
    var friends = 0;
    for (var j = 0; j < G.players.length; j++) {
      var o = G.players[j];
      if (o === t || o === p || !o.alive || o.team === 'impostor') continue;
      var d = dist(o, t);
      if (d < 16) friends += (16 - d) / 16;
    }
    var travel = dist(p, t);
    var score = -friends * 30 - travel * 0.55;
    if (score > bestScore) { bestScore = score; best = t; }
  }
  return best;
}

function nearestVent(p, G) {
  var best = null, bd = Infinity;
  for (var i = 0; i < G.world.vents.length; i++) {
    var v = G.world.vents[i];
    var d = Math.hypot(v.x - p.x, v.z - p.z);
    if (d < bd) { bd = d; best = v; }
  }
  return best;
}

/* ---------------- ghost behaviour ---------------- */
function ghostUpdate(p, dt, G) {
  var speed = G.playerSpeed() * 0.9;
  var task = nextTask(p);
  if (task && p.team === 'crew') {
    var step = task.steps[task.progress];
    var cons = G.world.consoles[step.key];
    if (cons) {
      if (!p.ai.dest || p.ai.dest.key !== step.key) {
        p.ai.dest = { x: cons.x, z: cons.z, key: step.key };
        p.ai.wait = 0;
      }
      var dx = cons.x - p.x, dz = cons.z - p.z, d = Math.hypot(dx, dz);
      if (d > 0.8) { p.x += dx / d * speed * dt; p.z += dz / d * speed * dt; p.facing = Math.atan2(dx, dz); }
      else {
        if (p.ai.wait <= 0) p.ai.wait = taskTime(task);
        p.ai.wait -= dt;
        if (p.ai.wait <= 0) { G.completeBotStep(p, task); p.ai.dest = null; }
      }
      return;
    }
  }
  /* drift */
  if (!p.ai.dest || Math.hypot(p.ai.dest.x - p.x, p.ai.dest.z - p.z) < 1.5) {
    var room = pick(G.map.rooms);
    p.ai.dest = { x: room.x, z: room.z };
  }
  var ddx = p.ai.dest.x - p.x, ddz = p.ai.dest.z - p.z, dd = Math.hypot(ddx, ddz) || 1;
  p.x += ddx / dd * speed * dt; p.z += ddz / dd * speed * dt;
}

/* ---------------- main update ---------------- */
function update(p, dt, G) {
  if (!p.ai) initBot(p);
  p.moving = false;
  AU.Memory.look(p, G, dt);
  if (!p.alive) { ghostUpdate(p, dt, G); return; }
  if (p.ai.repathIn > 0) p.ai.repathIn -= dt;
  else if (p.ai.dest) setDestination(p, G, p.ai.dest.x, p.ai.dest.z, null, true);
  if (p.team === 'impostor') impostorUpdate(p, dt, G);
  else crewUpdate(p, dt, G);
}

/* ---------------- suspicion & meetings ---------------- */
function noteSighting(p, other, kind) {
  if (!p.ai) return;
  var s = p.ai.suspicion;
  var add = kind === 'vent' ? 60 : kind === 'nearbody' ? 35 : kind === 'kill' ? 100 : 5;
  s[other.id] = (s[other.id] || 0) + add;
}

function meetingVote(p, G, meeting) {
  var ai = p.ai || (initBot(p), p.ai);
  var alive = G.players.filter(function (o) { return o.alive; });
  var candidates = alive.filter(function (o) { return o !== p; });
  if (!candidates.length) return null;

  if (p.team === 'impostor') {
    var crew = candidates.filter(function (o) { return o.team !== 'impostor'; });
    if (!crew.length) return null;
    /* if somebody has hard proof on me, there is no point being subtle */
    var votes2 = (AU.Meeting && AU.Meeting.votes) || {};
    var lead = null, leadN = 0;
    for (var v2 in votes2) {
      var tgt = votes2[v2];
      if (!tgt || tgt === 'skip') continue;
      var tp2 = G.byId(tgt);
      if (!tp2 || tp2.team === 'impostor') continue;
      var n = 0;
      for (var v3 in votes2) if (votes2[v3] === tgt) n++;
      if (n > leadN) { leadN = n; lead = tgt; }
    }
    if (lead && Math.random() < 0.85) return lead;
    if (meeting.accusedId) {
      var acc = G.byId(meeting.accusedId);
      if (acc && acc.team !== 'impostor' && Math.random() < 0.8) return meeting.accusedId;
    }
    if (Math.random() < 0.2) return null;
    return crew[rnd(crew.length)].id;
  }

  /* crew: an assessment grounded in what this bot actually saw */
  var view = AU.Memory.assess(p, G, meeting);
  var tally = {};
  var votes = (AU.Meeting && AU.Meeting.votes) || {};
  for (var v in votes) if (votes[v] && votes[v] !== 'skip') tally[votes[v]] = (tally[votes[v]] || 0) + 1;

  var best = null, bestScore = -1e9, bestBasis = 'none';
  for (var i = 0; i < candidates.length; i++) {
    var o = candidates[i];
    var r = view[o.id] || { score: 0, basis: 'none' };
    var sc = r.score;
    /* a bot with its own proof ignores the crowd entirely */
    if (r.basis !== 'proof' || !r.certain) {
      sc += (tally[o.id] || 0) * 26;
      if (meeting.accusedId === o.id) sc += 40;
    }
    if (sc > bestScore) { bestScore = sc; best = o; bestBasis = r.basis; }
  }
  if (!best) return null;
  /* certain bots always vote; the rest need a real threshold, and the timid skip */
  if (bestBasis === 'proof' && bestScore > 500) return best.id;
  var threshold = 120 + (1 - ai.personality.brave) * 90;
  if (bestScore < threshold) return null;
  return best.id;
}

function meetingChat(p, G, meeting) {
  if (!p.ai) initBot(p);
  return AU.Chat.volunteer(p, G, meeting);
}

AU.AI = {
  init: initBot,
  update: update,
  noteSighting: noteSighting,
  meetingVote: meetingVote,
  meetingChat: meetingChat,
  setDestination: setDestination
};

})(window.AU);
