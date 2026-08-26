/* =========================================================================
 * MULTIPLAYER — one link, no server of ours.
 *
 * The host makes an invite link and sends it.  Whoever opens the link lands
 * in the host's world.  That is the whole flow.
 *
 * WebRTC needs both sides to trade one message each before a direct
 * connection can exist, so something has to carry those two messages.  We
 * borrow a free public MQTT broker as a dead drop: the guest leaves an offer
 * on a topic named after the room, the host answers on the same topic, and
 * from then on the two browsers talk directly with nothing in between.  No
 * account, no key, nothing to run or pay for, and the broker never sees the
 * game — only the two-line handshake.
 * ========================================================================= */

var NET = {
  active: false,
  role: null,                 /* 'host' | 'guest' */
  room: '', gid: '',
  id: 0, name: 'Player', skin: 0,
  peers: [],                  /* host: one entry per guest */
  chan: null,                 /* guest: the single channel to the host */
  players: {},                /* id -> remote player entity */
  netEnts: {},                /* host entity id -> local entity (guest side) */
  editLog: [], editKeys: {},  /* host: every block change since the world began */
  outBlocks: [],
  sendT: 0, entT: 0, timeT: 0,
  status: 'Not connected',
  link: '',
  relay: null, relayTry: 0, offerTries: 0,
  suppress: false, onStatus: null, chatOpen: false
};
var NET_STUN = [{ urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' }];
/* Free, open, no-account brokers. Tried in order until one answers. */
var NET_RELAYS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt',
  'wss://test.mosquitto.org:8081/mqtt'
];

function netSetStatus(s) {
  NET.status = s;
  if (NET.onStatus) NET.onStatus(s);
}
function netRoomId() {
  var s = '', c = 'abcdefghjkmnpqrstuvwxyz23456789';
  for (var i = 0; i < 7; i++) s += c.charAt((Math.random() * c.length) | 0);
  return s;
}

/* ------------------------------------------------------- MQTT dead drop --
   Just enough of MQTT 3.1.1 to connect, subscribe to one topic and publish
   to it: CONNECT, SUBSCRIBE, PUBLISH at QoS 0 and a keepalive ping. */
function mqLen(n) {
  var out = [];
  do { var b = n % 128; n = Math.floor(n / 128); if (n > 0) b |= 0x80; out.push(b); } while (n > 0);
  return out;
}
function mqStr(s) {
  var b = new TextEncoder().encode(s);
  var out = [b.length >> 8, b.length & 255];
  for (var i = 0; i < b.length; i++) out.push(b[i]);
  return out;
}
function mqPacket(type, flags, body) {
  var head = [(type << 4) | flags];
  var l = mqLen(body.length);
  var out = new Uint8Array(head.length + l.length + body.length), o = 0, i;
  out[o++] = head[0];
  for (i = 0; i < l.length; i++) out[o++] = l[i];
  for (i = 0; i < body.length; i++) out[o++] = body[i];
  return out;
}
function mqttConnect(topic, onMessage, onReady, onFail) {
  var url = NET_RELAYS[NET.relayTry % NET_RELAYS.length];
  var ws, dead = false;
  try { ws = new WebSocket(url, 'mqtt'); } catch (e) { onFail(); return null; }
  ws.binaryType = 'arraybuffer';
  var conn = { ws: ws, ready: false, topic: topic,
    publish: function (obj) {
      if (!conn.ready) return;
      var body = mqStr(topic);
      var pay = new TextEncoder().encode(JSON.stringify(obj));
      for (var i = 0; i < pay.length; i++) body.push(pay[i]);
      try { ws.send(mqPacket(3, 0, body)); } catch (e) { /* socket closing */ }
    },
    close: function () { dead = true; try { ws.close(); } catch (e) { } }
  };
  var giveUp = setTimeout(function () { if (!conn.ready) { conn.close(); onFail(); } }, 9000);
  ws.onopen = function () {
    var cid = 'vxc' + Math.random().toString(36).slice(2, 12);
    var body = mqStr('MQTT');
    body.push(4, 0x02, 0, 45);                    /* level 4, clean session, 45s keepalive */
    body = body.concat(mqStr(cid));
    ws.send(mqPacket(1, 0, body));
  };
  ws.onerror = function () { if (!dead) { clearTimeout(giveUp); conn.close(); onFail(); } };
  ws.onclose = function () { if (!dead && !conn.ready) { clearTimeout(giveUp); onFail(); } };
  ws.onmessage = function (ev) {
    var buf = new Uint8Array(ev.data), i = 0;
    while (i < buf.length) {
      var type = buf[i] >> 4, mult = 1, len = 0, j = i + 1, b;
      do { b = buf[j++]; len += (b & 127) * mult; mult *= 128; } while (b & 0x80 && j < buf.length);
      var body = buf.subarray(j, j + len);
      if (type === 2) {                            /* CONNACK */
        var sub = [0, 1].concat(mqStr(topic));
        sub.push(0);
        ws.send(mqPacket(8, 2, sub));
      } else if (type === 9) {                     /* SUBACK — we are live */
        clearTimeout(giveUp);
        conn.ready = true;
        conn.pinger = setInterval(function () {
          try { ws.send(mqPacket(12, 0, [])); } catch (e) { }
        }, 30000);
        onReady(conn);
      } else if (type === 3) {                     /* PUBLISH */
        var tl = (body[0] << 8) | body[1];
        var payload = body.subarray(2 + tl);
        var msg = null;
        try { msg = JSON.parse(new TextDecoder().decode(payload)); } catch (e) { }
        if (msg) onMessage(msg);
      }
      i = j + len;
    }
  };
  return conn;
}
/* try each broker in turn, then give up and say so plainly */
function netOpenRelay(topic, onMessage, onReady) {
  NET.relayTry = 0;
  function attempt() {
    netSetStatus('Contacting relay (' + (NET.relayTry + 1) + '/' + NET_RELAYS.length + ')…');
    NET.relay = mqttConnect(topic, onMessage, function (c) { onReady(c); }, function () {
      NET.relayTry++;
      if (NET.relayTry < NET_RELAYS.length) attempt();
      else netSetStatus('No relay reachable — this network is blocking it. Open “Relay blocked?” below.');
    });
  }
  attempt();
}

/* ------------------------------------------------------------ handshake -- */
function netNewPC() { return new RTCPeerConnection({ iceServers: NET_STUN }); }
function netGatherICE(pc, ms) {
  return new Promise(function (done) {
    if (pc.iceGatheringState === 'complete') return done();
    var t = setTimeout(fin, ms || 3500);
    function fin() { clearTimeout(t); pc.removeEventListener('icegatheringstatechange', ck); done(); }
    function ck() { if (pc.iceGatheringState === 'complete') fin(); }
    pc.addEventListener('icegatheringstatechange', ck);
  });
}

/* The host sits on the room's topic answering whoever turns up. */
function netStartHosting(game, room) {
  NET.role = 'host'; NET.active = true; NET.room = room; NET.id = 1;
  netInstallHooks(game);
  NET.link = netInviteLink(room, game.seed);
  NET.answers = {};
  netOpenRelay('vxc/' + room, function (msg) {
    if (msg.t !== 'offer' || !msg.from) return;
    var prior = NET.answers[msg.from];
    if (prior) {
      /* they are still knocking, so our answer never landed — resend it */
      if (prior.sdp && NET.relay) NET.relay.publish({ t: 'answer', to: msg.from, sdp: prior.sdp });
      return;
    }
    NET.answers[msg.from] = { sdp: null };
    netAnswerGuest(game, msg);
  }, function () {
    netSetStatus('World open — send the invite link.');
  });
}
function netAnswerGuest(game, msg) {
  var pc = netNewPC();
  var slot = { pc: pc, ch: null, id: 0, name: 'Player', skin: 0, ready: false, lastSeen: 0 };
  pc.ondatachannel = function (ev) { slot.ch = ev.channel; netWireChannel(game, slot); };
  pc.oniceconnectionstatechange = function () {
    if (pc.iceConnectionState === 'failed') netDropPeer(game, slot);
  };
  NET.peers.push(slot);
  netSetStatus('A player is joining…');
  pc.setRemoteDescription({ type: 'offer', sdp: msg.sdp })
    .then(function () { return pc.createAnswer(); })
    .then(function (a) { return pc.setLocalDescription(a); })
    .then(function () { return netGatherICE(pc); })
    .then(function () {
      var sdp = pc.localDescription.sdp;
      if (NET.answers[msg.from]) NET.answers[msg.from].sdp = sdp;
      NET.relay.publish({ t: 'answer', to: msg.from, sdp: sdp });
    })['catch'](function (e) { netSetStatus('Join failed: ' + e.message); });
}

/* The guest leaves an offer on the room's topic and waits to be answered. */
function netStartJoining(game, room) {
  NET.role = 'guest'; NET.active = true; NET.room = room;
  NET.gid = Math.random().toString(36).slice(2, 10);
  netInstallHooks(game);
  var pc = netNewPC();
  var ch = pc.createDataChannel('mc', { ordered: true });
  var slot = { pc: pc, ch: ch, id: 0, name: 'Host', ready: false, lastSeen: 0 };
  netWireChannel(game, slot);
  NET.chan = slot;
  pc.oniceconnectionstatechange = function () {
    if (pc.iceConnectionState === 'failed') netSetStatus('Could not reach the host.');
  };
  netOpenRelay('vxc/' + room, function (msg) {
    if (msg.t === 'answer' && msg.to === NET.gid && !slot.answered) {
      slot.answered = true;
      pc.setRemoteDescription({ type: 'answer', sdp: msg.sdp })['catch'](function (e) {
        netSetStatus('Join failed: ' + e.message);
      });
    }
  }, function (relay) {
    netSetStatus('Knocking on the host’s door…');
    pc.createOffer()
      .then(function (o) { return pc.setLocalDescription(o); })
      .then(function () { return netGatherICE(pc); })
      .then(function () {
        var sdp = pc.localDescription.sdp;
        /* The host may not be listening the instant we arrive, so keep
           knocking for a while rather than failing on the first silence. */
        function knock() {
          if (slot.ready || slot.answered || NET.offerTries > 10) return;
          NET.offerTries++;
          relay.publish({ t: 'offer', from: NET.gid, sdp: sdp, name: NET.name });
          setTimeout(knock, 3000);
        }
        knock();
      })['catch'](function (e) { netSetStatus('Join failed: ' + e.message); });
  });
}

function netInviteLink(room, seed) {
  var base = location.href.split('#')[0].split('?')[0];
  return base + '#mp=' + room + '&seed=' + (seed >>> 0);
}
/* Hosting always starts a brand new world, so the page reloads into a fresh
   seed with the room already in the address. */
function netHostNewWorld() {
  var room = netRoomId();
  var seed = (Math.random() * 0xffffffff) >>> 0;
  location.href = netInviteLink(room, seed) + '&host=1';
  location.reload();
}
function netJoinLink(link) {
  var m = /[#&?]mp=([a-z0-9]+)/i.exec(link || '');
  var s = /[#&?]seed=(-?\d+)/.exec(link || '');
  if (!m || !s) throw new Error('That does not look like an invite link.');
  location.href = netInviteLink(m[1], parseInt(s[1], 10) >>> 0);
  location.reload();
}
/* Called once the world is up: if the address carries a room, act on it. */
function netBootJoin(game) {
  var m = /[#&?]mp=([a-z0-9]+)/i.exec(location.href);
  if (!m) return;
  var isHost = /[#&?]host=1/.test(location.href);
  if (isHost) netStartHosting(game, m[1]);
  else {
    netStartJoining(game, m[1]);
    logMessage(game, 'Joining world ' + m[1] + '…', '#88ccff');
  }
}

/* ------------------------------------------------------------- channel -- */
function netWireChannel(game, slot) {
  var ch = slot.ch;
  if (!ch) return;
  ch.onopen = function () {
    slot.ready = true; slot.lastSeen = game.time;
    netSend(slot, { t: 'hi', name: NET.name, skin: NET.skin, role: NET.role });
    if (NET.role === 'host') netSendWorldTo(game, slot);
    else if (NET.relay) { NET.relay.close(); NET.relay = null; }
    netSetStatus(NET.role === 'host'
      ? 'World open — ' + netPeerCount() + ' player(s) connected'
      : 'Connected to the host');
    logMessage(game, 'Multiplayer: connected.', '#88ff88');
  };
  ch.onclose = function () { netDropPeer(game, slot); };
  ch.onerror = function () { netDropPeer(game, slot); };
  ch.onmessage = function (ev) {
    slot.lastSeen = game.time;
    var msg;
    try { msg = JSON.parse(ev.data); } catch (e) { return; }
    netHandle(game, slot, msg);
  };
}
function netPeerCount() {
  var n = 0;
  for (var i = 0; i < NET.peers.length; i++) if (NET.peers[i].ready) n++;
  return n;
}
function netDropPeer(game, slot) {
  if (slot.gone) return;
  slot.gone = true; slot.ready = false;
  if (NET.role === 'host') {
    var i = NET.peers.indexOf(slot);
    if (i >= 0) NET.peers.splice(i, 1);
    if (slot.id) { netBroadcast({ t: 'bye', id: slot.id }); netRemovePlayer(game, slot.id); }
    netSetStatus('World open — ' + netPeerCount() + ' player(s) connected');
    logMessage(game, 'Multiplayer: a player left.', '#ffcc66');
  } else {
    netSetStatus('Disconnected from the host.');
    logMessage(game, 'Multiplayer: lost the host.', '#ffcc66');
    NET.active = false;
  }
}
function netSend(slot, obj) {
  if (!slot || !slot.ch || slot.ch.readyState !== 'open') return;
  try { slot.ch.send(JSON.stringify(obj)); } catch (e) { }
}
function netBroadcast(obj, except) {
  if (NET.role === 'host') {
    for (var i = 0; i < NET.peers.length; i++) if (NET.peers[i] !== except) netSend(NET.peers[i], obj);
  } else netSend(NET.chan, obj);
}

/* -------------------------------------------------------- world state -- */
function netEditKey(dim, x, y, z) { return dim + ':' + x + ',' + y + ',' + z; }
function netRecordEdit(dim, x, y, z, v) {
  var k = netEditKey(dim, x, y, z), at = NET.editKeys[k];
  if (at === undefined) {
    if (NET.editLog.length >= 60000) return;
    NET.editKeys[k] = NET.editLog.length;
    NET.editLog.push([dim, x, y, z, v]);
  } else NET.editLog[at][4] = v;
}
var _netIds = 1;
function netSendWorldTo(game, slot) {
  if (!slot.id) slot.id = ++_netIds;
  netSend(slot, { t: 'welcome', id: slot.id, seed: game.seed, dayTime: game.dayTime,
    rain: game.weather.rain, thunder: game.weather.thunder,
    sx: game.player.x, sy: game.player.y, sz: game.player.z });
  var log = NET.editLog;
  for (var i = 0; i < log.length; i += 800) netSend(slot, { t: 'blk', b: log.slice(i, i + 800) });
  netSend(slot, { t: 'synced', n: log.length });
}
function netHandle(game, slot, m) {
  var i, q;
  switch (m.t) {
    case 'hi':
      slot.name = m.name || 'Player'; slot.skin = m.skin || 0;
      if (NET.role === 'host' && !slot.id) slot.id = ++_netIds;
      break;
    case 'welcome':
      NET.id = m.id;
      game.dayTime = m.dayTime;
      game.weather.rain = m.rain; game.weather.thunder = m.thunder;
      /* land beside the host rather than wherever this world happened to
         drop us, so the two players actually meet */
      if (m.sx !== undefined) {
        var p = game.player;
        p.x = m.sx + 1.5; p.y = m.sy + 1; p.z = m.sz + 1.5;
        p.vx = p.vy = p.vz = 0; p.camY = p.y + 1.62;
      }
      for (q = game.entities.length - 1; q >= 0; q--) {
        var qe = game.entities[q];
        if (!qe.net && qe.type !== 'item' && qe.type !== 'xp_orb') qe.remove = true;
      }
      break;
    case 'synced':
      logMessage(game, 'Synced ' + m.n + ' block changes from the host.', '#88ff88');
      break;
    case 'blk':
      NET.suppress = true;
      for (i = 0; i < m.b.length; i++) {
        var b = m.b[i];
        game.world.setBlock(b[0], b[1], b[2], b[3], b[4]);
        if (NET.role === 'host') netRecordEdit(b[0], b[1], b[2], b[3], b[4]);
      }
      NET.suppress = false;
      if (NET.role === 'host') netBroadcast(m, slot);
      break;
    case 'mv':
      netApplyMove(game, m);
      if (NET.role === 'host') netBroadcast(m, slot);
      break;
    case 'bye': netRemovePlayer(game, m.id); break;
    case 'ent': if (NET.role === 'guest') netApplyEntities(game, m); break;
    case 'time':
      if (NET.role === 'guest') { game.dayTime = m.d; game.weather.rain = m.r; game.weather.thunder = m.th; }
      break;
    case 'hit': if (NET.role === 'host') netApplyRemoteHit(game, m); break;
    case 'chat':
      logMessage(game, '<' + (m.name || 'Player') + '> ' + m.text, '#ffffff');
      if (NET.role === 'host') netBroadcast(m, slot);
      break;
  }
}

/* ------------------------------------------------------ remote players -- */
function netPlayerEntity(game, id, skin) {
  var e = NET.players[id];
  if (e && !e.remove) return e;
  var p = game.player;
  e = makeEntity('player' + (skin % PLAYER_SKINS.length), p.dim, p.x, p.y, p.z,
    { persist: true, net: true, netId: id, nx: p.x, ny: p.y, nz: p.z });
  NET.players[id] = e;
  game.entities.push(e);
  return e;
}
function netRemovePlayer(game, id) {
  var e = NET.players[id];
  if (e) { e.remove = true; delete NET.players[id]; }
  netClearPlate(id);
}
function netApplyMove(game, m) {
  if (!m.id || m.id === NET.id) return;
  var e = NET.players[m.id];
  if (e && e.skinIdx !== undefined && m.sk !== undefined && e.skinIdx !== m.sk) {
    e.remove = true; delete NET.players[m.id]; e = null;
  }
  if (!e || e.remove) { e = netPlayerEntity(game, m.id, m.sk || 0); e.skinIdx = m.sk || 0; }
  e.nx = m.x; e.ny = m.y; e.nz = m.z;
  e.nyaw = m.yw; e.pitch = m.pt; e.headPitch = m.pt;
  e.dim = m.dm;
  e.sneaking = !!(m.f & 2);
  e.netName = m.n || e.netName || 'Player';
  if (m.f & 8) e.attackTime = 0.25;
  e.lastNet = game.time;
}
function netInterp(game, e, dt) {
  var k = Math.min(1, dt * 12), ox = e.x, oz = e.z;
  e.x += (e.nx - e.x) * k; e.y += (e.ny - e.y) * k; e.z += (e.nz - e.z) * k;
  if (e.nyaw !== undefined) e.yaw += angleDiff(e.nyaw, e.yaw) * k;
  var moved = Math.hypot(e.x - ox, e.z - oz) / Math.max(dt, 1e-4);
  e.walkAmt = approach(e.walkAmt, Math.min(1, moved / 4.3), dt * 8);
  e.walkPhase += moved * dt * 3.4;
  e.age += dt;
  if (e.hurtTime > 0) e.hurtTime -= dt;
  if (e.attackTime > 0) e.attackTime -= dt;
  if (e.lastNet !== undefined && game.time - e.lastNet > 6) e.remove = true;
}
function netApplyEntities(game, m) {
  var seen = {};
  for (var i = 0; i < m.e.length; i++) {
    var s = m.e[i], id = s[0];
    seen[id] = 1;
    var e = NET.netEnts[id];
    if (!e || e.remove) {
      if (!MOBS[s[1]]) continue;
      e = makeEntity(s[1], game.player.dim, s[2], s[3], s[4],
        { persist: true, net: true, netId: id, nx: s[2], ny: s[3], nz: s[4] });
      NET.netEnts[id] = e;
      game.entities.push(e);
    }
    e.nx = s[2]; e.ny = s[3]; e.nz = s[4]; e.nyaw = s[5];
    if (e.hp > s[6]) e.hurtTime = 0.32;
    e.hp = s[6];
    e.baby = !!(s[7] & 1); e.dead = !!(s[7] & 2);
    if (s[7] & 4) e.attackTime = 0.4;
    e.dim = m.dm; e.lastNet = game.time;
  }
  for (var k in NET.netEnts) {
    if (!seen[k] && game.time - (NET.netEnts[k].lastNet || 0) > 2.5) {
      NET.netEnts[k].remove = true;
      delete NET.netEnts[k];
    }
  }
}
function netApplyRemoteHit(game, m) {
  for (var i = 0; i < game.entities.length; i++) {
    var e = game.entities[i];
    if (e.id === m.eid && !e.net) { damageEntity(game, e, m.dmg, null); return; }
  }
}

/* --------------------------------------------------------------- tick -- */
function netTick(game, dt) {
  if (!NET.active) return;
  var p = game.player;
  if (NET.outBlocks.length) { netBroadcast({ t: 'blk', b: NET.outBlocks }); NET.outBlocks = []; }
  NET.sendT += dt;
  if (NET.sendT >= 1 / 15) {
    NET.sendT = 0;
    var f = (p.sprinting ? 1 : 0) | (p.sneaking ? 2 : 0) | (p.onGround ? 4 : 0) |
      (VM.swingActive && VM.swing < 0.25 ? 8 : 0);
    netBroadcast({ t: 'mv', id: NET.id, x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2),
      yw: +p.yaw.toFixed(2), pt: +p.pitch.toFixed(2), dm: p.dim, f: f, n: NET.name, sk: NET.skin });
  }
  if (NET.role === 'host') {
    NET.entT += dt;
    if (NET.entT >= 0.1) { NET.entT = 0; netSendEntities(game); }
    NET.timeT += dt;
    if (NET.timeT >= 4) {
      NET.timeT = 0;
      netBroadcast({ t: 'time', d: game.dayTime, r: game.weather.rain, th: game.weather.thunder });
    }
  }
}
function netSendEntities(game) {
  for (var pi = 0; pi < NET.peers.length; pi++) {
    var slot = NET.peers[pi];
    if (!slot.ready) continue;
    var ref = NET.players[slot.id] || game.player;
    var out = [], list = game.entities;
    for (var i = 0; i < list.length && out.length < 70; i++) {
      var e = list[i];
      if (e.net || (MOBS[e.type] && MOBS[e.type].player)) continue;
      var dx = e.x - ref.x, dz = e.z - ref.z;
      if (dx * dx + dz * dz > 96 * 96) continue;
      out.push([e.id, e.type, +e.x.toFixed(2), +e.y.toFixed(2), +e.z.toFixed(2),
        +e.yaw.toFixed(2), Math.round(e.hp),
        (e.baby ? 1 : 0) | (e.dead ? 2 : 0) | (e.attackTime > 0.2 ? 4 : 0)]);
    }
    netSend(slot, { t: 'ent', e: out, dm: ref.dim });
  }
}
function netIsGuest() { return NET.active && NET.role === 'guest'; }

/* ------------------------------------------------------------- hooks -- */
var _netHooked = false;
function netInstallHooks(game) {
  if (_netHooked) return;
  _netHooked = true;
  var origSet = game.world.setBlock.bind(game.world);
  game.world.setBlock = function (dim, x, y, z, v, noLight) {
    var before = NET.active && !NET.suppress ? this.getRaw(dim, x, y, z) : 0;
    var r = origSet(dim, x, y, z, v, noLight);
    if (NET.active && !NET.suppress && before !== v) {
      NET.outBlocks.push([dim, x, y, z, v]);
      if (NET.role === 'host') netRecordEdit(dim, x, y, z, v);
    }
    return r;
  };
  var prevDamage = damageEntity;
  damageEntity = function (g, target, amount, source, noKnock) {
    if (netIsGuest() && target && target.net && target.netId) {
      netBroadcast({ t: 'hit', eid: target.netId, dmg: amount });
      target.hurtTime = 0.32;
      return;
    }
    return prevDamage(g, target, amount, source, noKnock);
  };
}
var _origUpdateEntity = updateEntity;
updateEntity = function (game, e, dt) {
  if (e.net) { netInterp(game, e, dt); return; }
  return _origUpdateEntity(game, e, dt);
};
var _origGameTick = gameTick;
gameTick = function (g, dt) { _origGameTick(g, dt); netTick(g, dt); };
var _origTrySpawnMobs = trySpawnMobs;
trySpawnMobs = function (g, dt) { if (netIsGuest()) return; return _origTrySpawnMobs(g, dt); };
var _origRandomTicks = randomTicks;
randomTicks = function (g, dt) { if (netIsGuest()) return; return _origRandomTicks(g, dt); };
var _origTickFluids = tickFluids;
tickFluids = function (g, dt) { if (netIsGuest()) return; return _origTickFluids(g, dt); };

/* --------------------------------------------------------- name plates -- */
var _plates = {};
function netClearPlate(id) {
  var d = _plates[id];
  if (d && d.parentNode) d.parentNode.removeChild(d);
  delete _plates[id];
}
function netUpdateNameplates(game) {
  var any = false;
  for (var k in NET.players) { any = true; break; }
  if (!any) { for (var z in _plates) netClearPlate(z); return; }
  var m = R.vp, cv = gl.canvas;
  var W = cv.clientWidth || cv.width, H = cv.clientHeight || cv.height;
  var p = game.player;
  for (var id in NET.players) {
    var e = NET.players[id];
    if (!e || e.remove || e.dim !== p.dim) { netClearPlate(id); continue; }
    var x = e.x, y = e.y + e.h + 0.42, zc = e.z;
    var cw = m[3] * x + m[7] * y + m[11] * zc + m[15];
    var d2 = (e.x - p.x) * (e.x - p.x) + (e.z - p.z) * (e.z - p.z);
    if (cw <= 0.05 || d2 > 64 * 64) { netClearPlate(id); continue; }
    var cx = m[0] * x + m[4] * y + m[8] * zc + m[12];
    var cy = m[1] * x + m[5] * y + m[9] * zc + m[13];
    var el2 = _plates[id];
    if (!el2) {
      el2 = el('div', 'nameplate', document.body, e.netName || 'Player');
      _plates[id] = el2;
    }
    el2.textContent = e.netName || 'Player';
    el2.style.left = Math.round((cx / cw * 0.5 + 0.5) * W) + 'px';
    el2.style.top = Math.round((0.5 - cy / cw * 0.5) * H) + 'px';
    el2.style.opacity = d2 > 48 * 48 ? '0.45' : '1';
  }
}
var _origPaintHUD = paintHUD;
paintHUD = function (g) { _origPaintHUD(g); if (NET.active) netUpdateNameplates(g); };

/* ---------------------------------------------------------------- chat -- */
function netOpenChat(game) {
  if (NET.chatOpen) return;
  NET.chatOpen = true;
  if (document.exitPointerLock) document.exitPointerLock();
  var wrap = el('div', 'chatbar', document.body);
  var inp = el('input', 'chatinput', wrap);
  inp.type = 'text'; inp.maxLength = 180;
  inp.placeholder = NET.active ? 'Say something…' : 'Chat (not connected)';
  function close(send) {
    NET.chatOpen = false;
    var text = inp.value.trim();
    document.body.removeChild(wrap);
    if (send && text) {
      logMessage(game, '<' + NET.name + '> ' + text, '#ffffff');
      if (NET.active) netBroadcast({ t: 'chat', name: NET.name, text: text });
    }
    game.requestPointerLock();
  }
  inp.addEventListener('keydown', function (ev) {
    ev.stopPropagation();
    if (ev.key === 'Enter') { ev.preventDefault(); close(true); }
    else if (ev.key === 'Escape') { ev.preventDefault(); close(false); }
  });
  inp.focus();
}


/* -------------------------------------------------- manual code fallback --
   Some networks block outbound WebSockets, which kills the dead drop. When
   that happens the two messages can still be carried by hand: the guest makes
   a code, the host turns it into a reply code, the guest pastes that back.
   It is the same two messages, moved by copy and paste instead of a broker. */
function netB64(b) {
  var s = '';
  for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function netUnB64(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  var s = atob(str), o = new Uint8Array(s.length);
  for (var i = 0; i < s.length; i++) o[i] = s.charCodeAt(i);
  return o;
}
function netZip(bytes, on) {
  if (typeof CompressionStream !== 'function' || typeof DecompressionStream !== 'function') {
    return Promise.resolve(null);
  }
  try {
    var st = new (on ? CompressionStream : DecompressionStream)('deflate-raw');
    var w = st.writable.getWriter();
    w.write(bytes); w.close();
    return new Response(st.readable).arrayBuffer().then(function (b) { return new Uint8Array(b); });
  } catch (e) { return Promise.resolve(null); }
}
function netPack(obj, seed) {
  var raw = new TextEncoder().encode(JSON.stringify(obj));
  var head = 'MC1.' + (seed >>> 0).toString(36) + '.';
  return netZip(raw, true).then(function (z) {
    return (z && z.length < raw.length) ? head + 'z' + netB64(z) : head + 'r' + netB64(raw);
  });
}
function netUnpack(code) {
  code = String(code || '').trim().replace(/\s+/g, '');
  var parts = code.split('.');
  if (parts.length < 3 || parts[0] !== 'MC1') return Promise.reject(new Error('That is not a code.'));
  var body = parts.slice(2).join('.'), data = netUnB64(body.slice(1));
  var seed = parseInt(parts[1], 36) >>> 0;
  function fin(b) { var o = JSON.parse(new TextDecoder().decode(b)); o.seed = seed; return o; }
  if (body.charAt(0) === 'z') return netZip(data, false).then(function (b) {
    if (!b) throw new Error('This browser cannot read compressed codes.');
    return fin(b);
  });
  return Promise.resolve(fin(data));
}
/* guest: make the code that starts everything */
function netManualOffer(game) {
  NET.role = 'guest'; NET.active = true;
  NET.gid = Math.random().toString(36).slice(2, 10);
  netInstallHooks(game);
  var pc = netNewPC();
  var ch = pc.createDataChannel('mc', { ordered: true });
  var slot = { pc: pc, ch: ch, id: 0, name: 'Host', ready: false, lastSeen: 0 };
  netWireChannel(game, slot);
  NET.chan = slot;
  netSetStatus('Building your code…');
  return pc.createOffer()
    .then(function (o) { return pc.setLocalDescription(o); })
    .then(function () { return netGatherICE(pc); })
    .then(function () { return netPack({ t: 'offer', from: NET.gid, sdp: pc.localDescription.sdp }, game.seed); })
    .then(function (c) { netSetStatus('Send this code to the host, then paste their reply.'); return c; });
}
/* host: turn a guest's code into a reply code */
function netManualAnswer(game, code) {
  if (!NET.active) { NET.role = 'host'; NET.active = true; NET.id = 1; netInstallHooks(game); }
  return netUnpack(code).then(function (msg) {
    if (msg.t !== 'offer') throw new Error('That is a reply code, not a join code.');
    var pc = netNewPC();
    var slot = { pc: pc, ch: null, id: 0, name: 'Player', ready: false, lastSeen: 0 };
    pc.ondatachannel = function (ev) { slot.ch = ev.channel; netWireChannel(game, slot); };
    NET.peers.push(slot);
    return pc.setRemoteDescription({ type: 'offer', sdp: msg.sdp })
      .then(function () { return pc.createAnswer(); })
      .then(function (a) { return pc.setLocalDescription(a); })
      .then(function () { return netGatherICE(pc); })
      .then(function () { return netPack({ t: 'answer', to: msg.from, sdp: pc.localDescription.sdp }, game.seed); });
  });
}
/* guest: finish with the host's reply */
function netManualAccept(code) {
  var slot = NET.chan;
  if (!slot) return Promise.reject(new Error('Make your code first.'));
  return netUnpack(code).then(function (msg) {
    if (msg.t !== 'answer') throw new Error('That is a join code, not a reply.');
    slot.answered = true;
    return slot.pc.setRemoteDescription({ type: 'answer', sdp: msg.sdp });
  });
}

/* -------------------------------------------------------------- screen -- */
SCREEN_BUILDERS.multiplayer = function (game, box) {
  box.classList.add('centered', 'optionsgui', 'netgui');
  el('div', 'bigtitle', box, 'Multiplayer');

  var status = el('div', 'netstatus', box, NET.status);
  NET.onStatus = function (s) { status.textContent = s; };

  var nameRow = el('div', 'optrow', box);
  el('label', 'optlabel', nameRow, 'Your name');
  var nameIn = el('input', 'netinput netname', nameRow);
  nameIn.type = 'text'; nameIn.maxLength = 16; nameIn.value = NET.name;
  nameIn.addEventListener('input', function () {
    NET.name = nameIn.value.slice(0, 16) || 'Player';
    try { localStorage.setItem('vxc_name', NET.name); } catch (e) { }
  });

  var skinRow = el('div', 'optrow', box);
  el('label', 'optlabel', skinRow, 'Character');
  var skinBtn = el('button', 'optbtn', skinRow, PLAYER_SKINS[NET.skin].name);
  skinBtn.addEventListener('click', function () {
    NET.skin = (NET.skin + 1) % PLAYER_SKINS.length;
    skinBtn.textContent = PLAYER_SKINS[NET.skin].name;
    try { localStorage.setItem('vxc_skin', String(NET.skin)); } catch (e) { }
  });

  if (NET.role === 'host' && NET.link) {
    el('div', 'subtext', box, 'Send this link. Whoever opens it lands in your world.');
    var out = el('textarea', 'netcode', box);
    out.readOnly = true; out.rows = 3; out.value = NET.link;
    var copy = el('button', 'optbtn', box, 'Copy invite link');
    copy.addEventListener('click', function () {
      out.select();
      try { document.execCommand('copy'); } catch (e) { }
      if (navigator.clipboard) navigator.clipboard.writeText(NET.link)['catch'](function () { });
      copy.textContent = 'Copied!';
      setTimeout(function () { copy.textContent = 'Copy invite link'; }, 1200);
    });
  } else {
    var hostBtn = el('button', 'bigbtn', box, 'Host a new world');
    hostBtn.addEventListener('click', function () {
      hostBtn.disabled = true; hostBtn.textContent = 'Generating a fresh world…';
      netHostNewWorld();
    });
    el('div', 'subtext', box, 'Hosting starts a brand new world and gives you a link to send.');

    el('div', 'subtext', box, 'Got a link? Paste it here.');
    var inp2 = el('textarea', 'netcode', box);
    inp2.rows = 2; inp2.placeholder = 'Paste the invite link…';
    var joinBtn = el('button', 'bigbtn', box, 'Join with link');
    joinBtn.addEventListener('click', function () {
      try { netSetStatus('Loading the host’s world…'); netJoinLink(inp2.value); }
      catch (e) { netSetStatus(e.message); }
    });
  }

  var who = el('div', 'subtext', box, '');
  function refreshWho() {
    if (!NET.active) { who.textContent = ''; return; }
    var names = [NET.name + ' (you)'];
    for (var k in NET.players) if (NET.players[k] && !NET.players[k].remove) {
      names.push(NET.players[k].netName || 'Player');
    }
    who.textContent = 'In this world: ' + names.join(', ');
  }
  refreshWho();
  var t = setInterval(function () {
    if (!document.body.contains(who)) { clearInterval(t); return; }
    refreshWho();
  }, 1000);

  var moreBtn = el('button', 'optbtn', box, 'Relay blocked? Join with codes');
  var manual = el('div', 'netmanual hidden', box);
  moreBtn.addEventListener('click', function () {
    manual.classList.toggle('hidden');
    moreBtn.textContent = manual.classList.contains('hidden')
      ? 'Relay blocked? Join with codes' : 'Hide code method';
  });
  el('div', 'subtext', manual,
    'If your network blocks the relay, carry the two messages by hand instead. '
    + 'The joiner presses Make join code and sends it; the host pastes it, presses '
    + 'Make reply code and sends that back; the joiner pastes the reply.');
  var mOut = el('textarea', 'netcode', manual);
  mOut.readOnly = true; mOut.rows = 3; mOut.placeholder = 'Your code appears here.';
  var mIn = el('textarea', 'netcode', manual);
  mIn.rows = 3; mIn.placeholder = 'Paste the other side’s code here.';
  var mRow = el('div', 'netrow', manual);
  function run(btn, label, fn) {
    btn.disabled = true;
    var was = btn.textContent; btn.textContent = 'Working…';
    fn().then(function (c) {
      if (c) mOut.value = c;
      btn.disabled = false; btn.textContent = was;
    })['catch'](function (e) {
      btn.disabled = false; btn.textContent = was;
      netSetStatus(e.message || String(e));
    });
  }
  var b1 = el('button', 'optbtn', mRow, 'Make join code');
  b1.addEventListener('click', function () { run(b1, '', function () { return netManualOffer(game); }); });
  var b2 = el('button', 'optbtn', mRow, 'Make reply code');
  b2.addEventListener('click', function () { run(b2, '', function () { return netManualAnswer(game, mIn.value); }); });
  var b3 = el('button', 'optbtn', mRow, 'Use reply');
  b3.addEventListener('click', function () { run(b3, '', function () { return netManualAccept(mIn.value); }); });

  var back = el('button', 'bigbtn', box, 'Back');
  back.addEventListener('click', function () { showScreen(game, 'pause'); });
};
try {
  NET.name = localStorage.getItem('vxc_name') || 'Player';
  NET.skin = parseInt(localStorage.getItem('vxc_skin') || '0', 10) || 0;
} catch (e) { }
