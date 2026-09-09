/* ============================================================
   AMONG US 3D — BOT MEMORY & EVIDENCE
   A bot only knows what it actually saw. Everything it says or
   votes on traces back to one of:
     PROOF   — witnessed with its own eyes (a kill, a vent, a body)
     ALIBI   — it was demonstrably next to someone
     BIAS    — a hunch: who was alone, who was quiet, who it barely saw
     HEARSAY — something another player claimed, weighted by trust
   ============================================================ */
(function (AU) {
'use strict';

var SIGHT_TICK = 0.35;      // how often a bot looks around
var TOGETHER_WINDOW = 45;   // seconds of co-presence worth remembering

function newMemory() {
  return {
    seen: {},        // pid -> { t, room }            last confirmed sighting
    together: {},    // pid -> seconds spent in view recently
    trail: [],       // [{ room, t }]                 where I have been
    proof: [],       // [{ kind, who, victim, room, t }]
    hearsay: [],     // [{ from, about, kind, room, t, weight }]
    trust: {},       // pid -> -1..+1                 how much I believe them
    lastLook: 0,
    quiet: {}        // pid -> seconds unseen
  };
}

function mem(p) {
  if (!p.ai) return null;
  if (!p.ai.mem) p.ai.mem = newMemory();
  return p.ai.mem;
}

/* ---------------- perception ---------------- */
function look(p, G, dt) {
  var m = mem(p);
  if (!m) return;
  m.lastLook += dt;
  if (m.lastLook < SIGHT_TICK) return;
  var step = m.lastLook;
  m.lastLook = 0;

  var room = G.layout.roomAt(p.x, p.z);
  var roomName = room ? room.name : 'a hallway';
  var last = m.trail[m.trail.length - 1];
  if (!last || last.room !== roomName) m.trail.push({ room: roomName, t: G.time });
  if (m.trail.length > 40) m.trail.shift();

  var range = visionOf(p, G);
  for (var i = 0; i < G.players.length; i++) {
    var o = G.players[i];
    if (o === p || !o.alive) continue;
    m.quiet[o.id] = (m.quiet[o.id] || 0) + step;
    if (o.venting || o.invisible) continue;
    var d = Math.hypot(o.x - p.x, o.z - p.z);
    if (d > range) continue;
    if (!G.layout.lineClear(p.x, p.z, o.x, o.z)) continue;
    /* actually in view */
    m.seen[o.id] = { t: G.time, room: roomName };
    m.quiet[o.id] = 0;
    if (d < 9) m.together[o.id] = Math.min(TOGETHER_WINDOW, (m.together[o.id] || 0) + step);
  }
  /* co-presence decays, so an old alibi stops counting */
  for (var id in m.together) {
    if (!m.seen[id] || G.time - m.seen[id].t > 2) {
      m.together[id] = Math.max(0, m.together[id] - step * 0.6);
    }
  }
}

function visionOf(p, G) {
  var mult = p.team === 'impostor' ? G.settings.impVision : G.settings.crewVision;
  if (G.sabotage && G.sabotage.def.id === 'lights' && p.team !== 'impostor') mult *= 0.32;
  return AU.VISION_BASE * mult;
}

/* ---------------- hard evidence ---------------- */
/* Only called for bots that genuinely had the event in view. */
function witness(p, kind, data, G) {
  var m = mem(p);
  if (!m) return;
  var room = G.layout.roomAt(data.x != null ? data.x : p.x, data.z != null ? data.z : p.z);
  m.proof.push({
    kind: kind, who: data.who, victim: data.victim || null,
    room: room ? room.name : 'a hallway', t: G.time
  });
  if (m.proof.length > 12) m.proof.shift();
}

/* Broadcast an event to everyone who could actually see it happen. */
function broadcastSighting(G, kind, actor, opts) {
  opts = opts || {};
  var ax = opts.x != null ? opts.x : actor.x;
  var az = opts.z != null ? opts.z : actor.z;
  for (var i = 0; i < G.players.length; i++) {
    var o = G.players[i];
    if (o === actor || !o.ai) continue;
    if (!o.alive && !opts.ghostsSee) continue;
    var d = Math.hypot(o.x - ax, o.z - az);
    if (d > visionOf(o, G)) continue;
    if (!G.layout.lineClear(o.x, o.z, ax, az)) continue;
    witness(o, kind, { who: actor.id, victim: opts.victim, x: ax, z: az }, G);
  }
}

/* ---------------- what a bot believes ---------------- */
/* Returns { score, basis, detail } per player. basis is 'proof' |
   'alibi' | 'hearsay' | 'bias', which is what makes some bots certain
   and others merely opinionated. */
function assess(p, G, meeting) {
  var m = mem(p);
  var out = {};
  if (!m) return out;
  var killTime = meeting && meeting.killTime != null ? meeting.killTime : G.time;

  G.players.forEach(function (o) {
    if (o.id === p.id || !o.alive) return;
    out[o.id] = { score: 0, basis: 'none', detail: null, certain: false };
  });

  /* --- proof, the strongest thing a bot can have --- */
  m.proof.forEach(function (e) {
    var r = out[e.who];
    if (!r) return;
    var age = G.time - e.t;
    if (e.kind === 'kill') {
      r.score += 1000; r.basis = 'proof'; r.certain = true;
      r.detail = { kind: 'kill', room: e.room, victim: e.victim, t: e.t };
    } else if (e.kind === 'vent') {
      r.score += 700; r.basis = 'proof'; r.certain = true;
      r.detail = { kind: 'vent', room: e.room, t: e.t };
    } else if (e.kind === 'body' && age < 25) {
      r.score += 180;
      if (r.basis === 'none') { r.basis = 'proof'; r.detail = { kind: 'nearbody', room: e.room, t: e.t }; }
    }
  });

  /* --- alibi: I was standing next to them, so I will defend them --- */
  for (var id in m.together) {
    var r2 = out[id];
    if (!r2 || r2.certain) continue;
    if (m.together[id] > 6) {
      r2.score -= 260 + m.together[id] * 6;
      if (r2.basis === 'none') {
        r2.basis = 'alibi';
        r2.detail = { kind: 'alibi', room: (m.seen[id] || {}).room || 'somewhere',
                      secs: Math.round(m.together[id]) };
      }
    }
  }

  /* --- hearsay: what other people claimed, scaled by how much I trust them --- */
  m.hearsay.forEach(function (h) {
    var r3 = out[h.about];
    if (!r3 || r3.certain) return;
    var trust = 0.55 + (m.trust[h.from] || 0) * 0.45;
    var w = (h.kind === 'vent' ? 190 : h.kind === 'kill' ? 240 : h.kind === 'clear' ? -150 : 90) * trust;
    r3.score += w;
    if (r3.basis === 'none' || r3.basis === 'bias') {
      r3.basis = 'hearsay';
      r3.detail = { kind: h.kind, from: h.from, room: h.room };
    }
  });

  /* --- bias: soft, honest hunches, and never certain --- */
  G.players.forEach(function (o) {
    var r4 = out[o.id];
    if (!r4 || r4.certain) return;
    var unseen = m.quiet[o.id];
    if (unseen == null) unseen = 999;
    if (unseen > 45) {
      r4.score += 55 + Math.min(60, unseen * 0.5);
      if (r4.basis === 'none') { r4.basis = 'bias'; r4.detail = { kind: 'unseen', secs: Math.round(unseen) }; }
    }
    var seen = m.seen[o.id];
    if (seen && killTime && Math.abs(seen.t - killTime) < 14 &&
        meeting && meeting.bodyRoom && seen.room === meeting.bodyRoom) {
      r4.score += 200;
      if (r4.basis === 'none' || r4.basis === 'bias') {
        r4.basis = 'bias';
        r4.detail = { kind: 'nearscene', room: seen.room };
      }
    }
    /* a little personality-driven noise, so the crew does not vote as one mind */
    r4.score += (p.ai.personality.sloppy * 40) * (Math.random() - 0.4);
  });

  return out;
}

/* The single player this bot is most suspicious of, plus why. */
function topSuspect(p, G, meeting) {
  var a = assess(p, G, meeting);
  var bestId = null, best = null;
  for (var id in a) {
    if (!best || a[id].score > best.score) { best = a[id]; bestId = id; }
  }
  if (!bestId) return null;
  return { id: bestId, score: best.score, basis: best.basis,
           detail: best.detail, certain: best.certain };
}

/* Someone this bot would actively vouch for. */
function whoIClear(p, G) {
  var m = mem(p);
  if (!m) return null;
  var bestId = null, bestT = 6;
  for (var id in m.together) {
    if (m.together[id] > bestT) { bestT = m.together[id]; bestId = id; }
  }
  if (!bestId) return null;
  return { id: bestId, secs: Math.round(bestT), room: (m.seen[bestId] || {}).room || 'somewhere' };
}

/* Where this bot actually was, as a short honest sentence fragment. */
function trailText(p, G, count) {
  var m = mem(p);
  if (!m || !m.trail.length) return 'wandering about';
  var rooms = [];
  for (var i = m.trail.length - 1; i >= 0 && rooms.length < (count || 3); i--) {
    var r = m.trail[i].room;
    if (rooms.indexOf(r) < 0) rooms.push(r);
  }
  rooms.reverse();
  return rooms.join(', then ');
}

function addHearsay(p, from, about, kind, room, G) {
  var m = mem(p);
  if (!m) return;
  m.hearsay.push({ from: from, about: about, kind: kind, room: room, t: G.time });
  if (m.hearsay.length > 20) m.hearsay.shift();
}
function adjustTrust(p, who, delta) {
  var m = mem(p);
  if (!m) return;
  m.trust[who] = Math.max(-1, Math.min(1, (m.trust[who] || 0) + delta));
}
function resetRound(p) {
  if (p.ai) p.ai.mem = newMemory();
}

AU.Memory = {
  look: look,
  witness: witness,
  broadcastSighting: broadcastSighting,
  assess: assess,
  topSuspect: topSuspect,
  whoIClear: whoIClear,
  trailText: trailText,
  addHearsay: addHearsay,
  adjustTrust: adjustTrust,
  resetRound: resetRound,
  mem: mem,
  visionOf: visionOf
};

})(window.AU);
