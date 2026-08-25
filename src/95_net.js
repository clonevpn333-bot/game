/* =========================================================================
 * MULTIPLAYER — peer to peer, no server.
 *
 * Two browsers talk over a WebRTC data channel.  The only thing a signalling
 * server would normally do is carry the first two messages between them, so
 * instead the player carries them: the host copies an invite code, the guest
 * pastes it in and copies an answer code back.  After that the connection is
 * direct.  A public STUN server is used to discover the peers' addresses when
 * they are behind different routers; on a LAN it is not needed at all.
 *
 * The world is not sent over the wire.  Terrain generation is deterministic,
 * so both sides generate the same world from the same seed and only the
 * *changes* — blocks broken and placed, mobs, players, the clock — travel.
 * ========================================================================= */

var NET = {
  active: false,
  role: null,                 /* 'host' | 'guest' */
  id: 0,                      /* our own player id */
  name: 'Player',
  peers: [],                  /* host: one entry per guest */
  chan: null,                 /* guest: the single channel to the host */
  players: {},                /* id -> remote player entity */
  netEnts: {},                /* host entity id -> local entity (guest side) */
  editLog: [],                /* host: every block change since the world loaded */
  editKeys: {},               /* host: dedupe index into editLog */
  outBlocks: [],              /* changes waiting to be flushed */
  sendT: 0, entT: 0, timeT: 0,
  status: 'Not connected',
  pending: null,              /* an invite waiting for its answer */
  lastCode: '',
  suppress: false,            /* true while applying a remote edit */
  onStatus: null,
  chatOpen: false
};
var NET_STUN = [{ urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }];
var NET_MAGIC = 'MC1';

/* ------------------------------------------------------------- codec -- */
function netB64(bytes) {
  var s = '';
  for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function netUnB64(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  var s = atob(str), out = new Uint8Array(s.length);
  for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}
/* deflate is worth it here: an SDP blob is mostly repeated boilerplate and
   the code has to be short enough that somebody will actually paste it */
function netDeflate(bytes) {
  if (typeof CompressionStream !== 'function') return Promise.resolve(null);
  try {
    var cs = new CompressionStream('deflate-raw');
    var w = cs.writable.getWriter();
    w.write(bytes); w.close();
    return new Response(cs.readable).arrayBuffer().then(function (b) { return new Uint8Array(b); });
  } catch (e) { return Promise.resolve(null); }
}
function netInflate(bytes) {
  if (typeof DecompressionStream !== 'function') return Promise.resolve(null);
  try {
    var ds = new DecompressionStream('deflate-raw');
    var w = ds.writable.getWriter();
    w.write(bytes); w.close();
    return new Response(ds.readable).arrayBuffer().then(function (b) { return new Uint8Array(b); });
  } catch (e) { return Promise.resolve(null); }
}
function netEncode(obj, seed) {
  var raw = new TextEncoder().encode(JSON.stringify(obj));
  var head = NET_MAGIC + '.' + (seed >>> 0).toString(36) + '.';
  return netDeflate(raw).then(function (packed) {
    if (packed && packed.length < raw.length) return head + 'z' + netB64(packed);
    return head + 'r' + netB64(raw);
  });
}
function netDecode(code) {
  code = String(code || '').trim().replace(/\s+/g, '');
  var parts = code.split('.');
  if (parts.length < 3 || parts[0] !== NET_MAGIC) return Promise.reject(new Error('That is not a connection code.'));
  var body = parts.slice(2).join('.');
  var mode = body.charAt(0), data = netUnB64(body.slice(1));
  var seed = parseInt(parts[1], 36) >>> 0;
  var fin = function (bytes) {
    var obj = JSON.parse(new TextDecoder().decode(bytes));
    obj.seed = seed;
    return obj;
  };
  if (mode === 'z') return netInflate(data).then(function (b) {
    if (!b) throw new Error('This browser cannot read compressed codes.');
    return fin(b);
  });
  return Promise.resolve(fin(data));
}
function netSeedFromCode(code) {
  var m = /^MC1\.([0-9a-z]+)\./.exec(String(code || '').trim());
  return m ? (parseInt(m[1], 36) >>> 0) : null;
}

/* ---------------------------------------------------- connection setup -- */
function netSetStatus(s) {
  NET.status = s;
  if (NET.onStatus) NET.onStatus(s);
}
function netNewPC() {
  return new RTCPeerConnection({ iceServers: NET_STUN });
}
/* ICE candidates trickle in over a second or two; the code is only useful
   once they are all folded into the local description, so wait for that —
   but never longer than it takes to be annoying. */
function netGatherICE(pc, ms) {
  return new Promise(function (done) {
    if (pc.iceGatheringState === 'complete') return done();
    var timer = setTimeout(finish, ms || 3500);
    function finish() {
      clearTimeout(timer);
      pc.removeEventListener('icegatheringstatechange', check);
      done();
    }
    function check() { if (pc.iceGatheringState === 'complete') finish(); }
    pc.addEventListener('icegatheringstatechange', check);
  });
}

function netHostInvite(game) {
  NET.role = 'host'; NET.active = true; NET.id = 1;
  netInstallHooks(game);
  var pc = netNewPC();
  var ch = pc.createDataChannel('mc', { ordered: true });
  var slot = { pc: pc, ch: ch, id: 0, name: '', ready: false, lastSeen: 0 };
  netWireChannel(game, slot);
  pc.oniceconnectionstatechange = function () {
    if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') netDropPeer(game, slot);
  };
  NET.pending = slot;
  netSetStatus('Building invite…');
  return pc.createOffer()
    .then(function (o) { return pc.setLocalDescription(o); })
    .then(function () { return netGatherICE(pc); })
    .then(function () { return netEncode({ t: 'offer', sdp: pc.localDescription.sdp, name: NET.name }, game.seed); })
    .then(function (code) {
      NET.lastCode = code;
      netSetStatus('Invite ready — send it to your friend, then paste their reply below.');
      return code;
    });
}
function netHostAccept(game, code) {
  var slot = NET.pending;
  if (!slot) return Promise.reject(new Error('Create an invite first.'));
  return netDecode(code).then(function (msg) {
    if (msg.t !== 'answer') throw new Error('That code is an invite, not a reply.');
    return slot.pc.setRemoteDescription({ type: 'answer', sdp: msg.sdp });
  }).then(function () {
    slot.name = 'Player';
    NET.peers.push(slot);
    NET.pending = null;
    netSetStatus('Connecting…');
  });
}

/* The guest reloads into the host's seed before answering, because the whole
   point is that both sides generate the same world.  The invite rides along
   in the URL, which survives the reload. */
function netGuestJoin(code) {
  var seed = netSeedFromCode(code);
  if (seed === null) throw new Error('That is not a connection code.');
  var clean = String(code).trim().replace(/\s+/g, '');
  var base = location.href.split('#')[0].split('?')[0];
  location.href = base + '#seed=' + seed + '&join=' + encodeURIComponent(clean);
  location.reload();
}
function netJoinCodeFromURL() {
  var m = /[?&#]join=([^&#]+)/.exec(location.href);
  return m ? decodeURIComponent(m[1]) : null;
}
function netGuestAnswer(game, code) {
  NET.role = 'guest'; NET.active = true;
  netInstallHooks(game);
  var pc = netNewPC();
  var slot = { pc: pc, ch: null, id: 0, name: 'Host', ready: false, lastSeen: 0 };
  pc.ondatachannel = function (ev) { slot.ch = ev.channel; netWireChannel(game, slot); };
  pc.oniceconnectionstatechange = function () {
    if (pc.iceConnectionState === 'failed') netSetStatus('Could not reach the host.');
  };
  NET.chan = slot;
  netSetStatus('Answering…');
  return netDecode(code).then(function (msg) {
    if (msg.t !== 'offer') throw new Error('That code is a reply, not an invite.');
    return pc.setRemoteDescription({ type: 'offer', sdp: msg.sdp });
  }).then(function () { return pc.createAnswer(); })
    .then(function (a) { return pc.setLocalDescription(a); })
    .then(function () { return netGatherICE(pc); })
    .then(function () { return netEncode({ t: 'answer', sdp: pc.localDescription.sdp, name: NET.name }, game.seed); })
    .then(function (out) {
      NET.lastCode = out;
      netSetStatus('Reply ready — send it back to the host.');
      return out;
    });
}

function netWireChannel(game, slot) {
  var ch = slot.ch;
  if (!ch) return;
  ch.onopen = function () {
    slot.ready = true;
    slot.lastSeen = game.time;
    netSend(slot, { t: 'hi', name: NET.name, role: NET.role });
    if (NET.role === 'host') netSendWorldTo(game, slot);
    netSetStatus('Connected' + (NET.role === 'host' ? ' — ' + netPeerCount() + ' player(s)' : ' to host'));
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
    netSetStatus(netPeerCount() ? 'Connected — ' + netPeerCount() + ' player(s)' : 'Waiting for players');
  } else {
    netSetStatus('Disconnected from host.');
    NET.active = false;
  }
  logMessage(game, 'Multiplayer: a player left.', '#ffcc66');
}
function netSend(slot, obj) {
  if (!slot || !slot.ch || slot.ch.readyState !== 'open') return;
  try { slot.ch.send(JSON.stringify(obj)); } catch (e) { /* channel closing */ }
}
function netBroadcast(obj, except) {
  if (NET.role === 'host') {
    for (var i = 0; i < NET.peers.length; i++) if (NET.peers[i] !== except) netSend(NET.peers[i], obj);
  } else netSend(NET.chan, obj);
}

/* -------------------------------------------------------- world state -- */
function netEditKey(dim, x, y, z) { return dim + ':' + x + ',' + y + ',' + z; }
function netRecordEdit(dim, x, y, z, v) {
  var k = netEditKey(dim, x, y, z);
  var at = NET.editKeys[k];
  if (at === undefined) {
    if (NET.editLog.length >= 60000) return;
    NET.editKeys[k] = NET.editLog.length;
    NET.editLog.push([dim, x, y, z, v]);
  } else NET.editLog[at][4] = v;
}
function netSendWorldTo(game, slot) {
  netSend(slot, { t: 'welcome', id: slot.id || (slot.id = ++_netIds), seed: game.seed,
    dayTime: game.dayTime, rain: game.weather.rain, thunder: game.weather.thunder });
  /* the edit log can be big, so it goes out in slices rather than one
     message that would blow the channel's buffer */
  var log = NET.editLog;
  for (var i = 0; i < log.length; i += 800) netSend(slot, { t: 'blk', b: log.slice(i, i + 800) });
  netSend(slot, { t: 'synced', n: log.length });
}
var _netIds = 1;

function netHandle(game, slot, m) {
  switch (m.t) {
    case 'hi':
      slot.name = m.name || 'Player';
      if (NET.role === 'host' && !slot.id) slot.id = ++_netIds;
      break;
    case 'welcome':
      NET.id = m.id;
      game.dayTime = m.dayTime;
      game.weather.rain = m.rain; game.weather.thunder = m.thunder;
      /* the host owns the mobs from here on; anything this world spawned on
         its own would only stand around desynchronised */
      for (var q = game.entities.length - 1; q >= 0; q--) {
        var qe = game.entities[q];
        if (!qe.net && qe.type !== 'item' && qe.type !== 'xp_orb') qe.remove = true;
      }
      break;
    case 'synced':
      logMessage(game, 'Synced ' + m.n + ' block changes from the host.', '#88ff88');
      break;
    case 'blk':
      NET.suppress = true;
      for (var i = 0; i < m.b.length; i++) {
        var b = m.b[i];
        game.world.setBlock(b[0], b[1], b[2], b[3], b[4]);
        if (NET.role === 'host') netRecordEdit(b[0], b[1], b[2], b[3], b[4]);
      }
      NET.suppress = false;
      if (NET.role === 'host') netBroadcast(m, slot);
      break;
    case 'mv':
      netApplyMove(game, m);
      if (NET.role === 'host') { m.id = slot.id; netBroadcast(m, slot); }
      break;
    case 'bye':
      netRemovePlayer(game, m.id);
      break;
    case 'ent':
      if (NET.role === 'guest') netApplyEntities(game, m);
      break;
    case 'time':
      if (NET.role === 'guest') {
        game.dayTime = m.d; game.weather.rain = m.r; game.weather.thunder = m.th;
      }
      break;
    case 'hit':
      if (NET.role === 'host') netApplyRemoteHit(game, m);
      break;
    case 'chat':
      logMessage(game, '<' + (m.name || 'Player') + '> ' + m.text, '#ffffff');
      if (NET.role === 'host') netBroadcast(m, slot);
      break;
  }
}

/* ------------------------------------------------------ remote players -- */
defMob('remote_player', {
  model: bipedModel({ skin: '#b58762', shirt: '#3f74b8', pants: '#3a3a5a',
    head: '#b58762', headTex: 'face_player' }),
  w: 0.6, h: 1.8, hp: 20, speed: 0, anim: animBiped, spawn: null, persist: true
});
function netPlayerEntity(game, id) {
  var e = NET.players[id];
  if (e && !e.remove) return e;
  e = makeEntity('remote_player', game.player.dim, game.player.x, game.player.y, game.player.z,
    { persist: true, net: true, netId: id, nx: game.player.x, ny: game.player.y, nz: game.player.z });
  NET.players[id] = e;
  game.entities.push(e);
  return e;
}
function netRemovePlayer(game, id) {
  var e = NET.players[id];
  if (e) { e.remove = true; delete NET.players[id]; }
}
function netApplyMove(game, m) {
  if (!m.id || m.id === NET.id) return;
  var e = netPlayerEntity(game, m.id);
  e.nx = m.x; e.ny = m.y; e.nz = m.z;
  e.nyaw = m.yw; e.pitch = m.pt; e.headPitch = m.pt;
  e.dim = m.dm;
  e.sneaking = !!(m.f & 2);
  e.netName = m.n || e.netName;
  if (m.f & 8) e.attackTime = 0.25;
  e.netSpeed = m.sp || 0;
  e.lastNet = game.time;
}
/* Remote things move by interpolation, never by physics: their owner already
   decided where they are, and simulating them here would only fight that. */
function netInterp(game, e, dt) {
  var k = Math.min(1, dt * 12);
  var ox = e.x, oz = e.z;
  e.x += (e.nx - e.x) * k;
  e.y += (e.ny - e.y) * k;
  e.z += (e.nz - e.z) * k;
  if (e.nyaw !== undefined) {
    var d = angleDiff(e.nyaw, e.yaw);
    e.yaw += d * k;
  }
  var moved = Math.hypot(e.x - ox, e.z - oz) / Math.max(dt, 1e-4);
  e.walkAmt = approach(e.walkAmt, Math.min(1, moved / 4.3), dt * 8);
  e.walkPhase += moved * dt * 3.4;
  e.age += dt;
  if (e.hurtTime > 0) e.hurtTime -= dt;
  if (e.attackTime > 0) e.attackTime -= dt;
  if (e.lastNet !== undefined && game.time - e.lastNet > 6) e.remove = true;
}

/* --------------------------------------------------------- mob mirror -- */
function netApplyEntities(game, m) {
  var seen = {};
  for (var i = 0; i < m.e.length; i++) {
    var s = m.e[i];              /* [id, type, x, y, z, yaw, hp, flags] */
    var id = s[0];
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
    e.baby = !!(s[7] & 1);
    e.dead = !!(s[7] & 2);
    if (s[7] & 4) e.attackTime = 0.4;
    e.dim = m.dm;
    e.lastNet = game.time;
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

  /* block changes go out in one batch a frame */
  if (NET.outBlocks.length) {
    netBroadcast({ t: 'blk', b: NET.outBlocks });
    NET.outBlocks = [];
  }

  NET.sendT += dt;
  if (NET.sendT >= 1 / 15) {
    NET.sendT = 0;
    var f = (p.sprinting ? 1 : 0) | (p.sneaking ? 2 : 0) | (p.onGround ? 4 : 0) |
      (VM.swingActive && VM.swing < 0.25 ? 8 : 0);
    netBroadcast({ t: 'mv', id: NET.id, x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2),
      yw: +p.yaw.toFixed(2), pt: +p.pitch.toFixed(2), dm: p.dim, f: f, n: NET.name });
  }

  if (NET.role === 'host') {
    NET.entT += dt;
    if (NET.entT >= 0.1) {
      NET.entT = 0;
      netSendEntities(game);
    }
    NET.timeT += dt;
    if (NET.timeT >= 4) {
      NET.timeT = 0;
      netBroadcast({ t: 'time', d: game.dayTime, r: game.weather.rain, th: game.weather.thunder });
    }
  }
}
function netSendEntities(game) {
  if (!NET.peers.length) return;
  for (var pi = 0; pi < NET.peers.length; pi++) {
    var slot = NET.peers[pi];
    if (!slot.ready) continue;
    var ref = NET.players[slot.id] || game.player;
    var out = [], list = game.entities;
    for (var i = 0; i < list.length && out.length < 70; i++) {
      var e = list[i];
      if (e.net || e.type === 'remote_player') continue;
      var dx = e.x - ref.x, dz = e.z - ref.z;
      if (dx * dx + dz * dz > 96 * 96) continue;
      var fl = (e.baby ? 1 : 0) | (e.dead ? 2 : 0) | (e.attackTime > 0.2 ? 4 : 0);
      out.push([e.id, e.type, +e.x.toFixed(2), +e.y.toFixed(2), +e.z.toFixed(2),
        +e.yaw.toFixed(2), Math.round(e.hp), fl]);
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

  /* every block change made by anything other than a remote message is ours,
     and every one of them has to reach the other side */
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
    /* a guest cannot decide a mob's health — it asks the host to */
    if (netIsGuest() && target && target.net && target.netId) {
      netBroadcast({ t: 'hit', eid: target.netId, dmg: amount });
      target.hurtTime = 0.32;
      return;
    }
    return prevDamage(g, target, amount, source, noKnock);
  };
}

/* Remote entities are interpolated instead of simulated. */
var _origUpdateEntity = updateEntity;
updateEntity = function (game, e, dt) {
  if (e.net) { netInterp(game, e, dt); return; }
  return _origUpdateEntity(game, e, dt);
};
var _origGameTick = gameTick;
gameTick = function (g, dt) {
  _origGameTick(g, dt);
  netTick(g, dt);
};
/* Guests do not run the world's own clockwork — the host does, and its results
   arrive as block changes. Running both would make the two worlds fight. */
var _origTrySpawnMobs = trySpawnMobs;
trySpawnMobs = function (game, dt) {
  if (netIsGuest()) return;
  return _origTrySpawnMobs(game, dt);
};
var _origRandomTicks = randomTicks;
randomTicks = function (game, dt) {
  if (netIsGuest()) return;
  return _origRandomTicks(game, dt);
};
var _origTickFluids = tickFluids;
tickFluids = function (game, dt) {
  if (netIsGuest()) return;
  return _origTickFluids(game, dt);
};

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

/* -------------------------------------------------------------- screen -- */
SCREEN_BUILDERS.multiplayer = function (game, box) {
  box.classList.add('centered', 'optionsgui', 'netgui');
  el('div', 'bigtitle', box, 'Multiplayer');
  el('div', 'subtext', box,
    'No server: pass the codes to each other however you like — chat, text, email.');

  var status = el('div', 'netstatus', box, NET.status);
  NET.onStatus = function (s) { status.textContent = s; };

  var nameRow = el('div', 'optrow', box);
  el('label', 'optlabel', nameRow, 'Your name');
  var nameIn = el('input', 'netinput netname', nameRow);
  nameIn.type = 'text'; nameIn.maxLength = 16; nameIn.value = NET.name;
  nameIn.addEventListener('input', function () { NET.name = nameIn.value || 'Player'; });

  var out = el('textarea', 'netcode', box);
  out.readOnly = true; out.rows = 4; out.wrap = 'soft';
  out.placeholder = 'Your code appears here.';
  if (NET.lastCode) out.value = NET.lastCode;

  var outRow = el('div', 'netrow', box);
  var copyBtn = el('button', 'optbtn', outRow, 'Copy my code');
  copyBtn.addEventListener('click', function () {
    out.select();
    try { document.execCommand('copy'); } catch (e) { /* selection is enough */ }
    if (navigator.clipboard) navigator.clipboard.writeText(out.value)['catch'](function () {});
    copyBtn.textContent = 'Copied!';
    setTimeout(function () { copyBtn.textContent = 'Copy my code'; }, 1200);
  });

  var inp = el('textarea', 'netcode', box);
  inp.rows = 4; inp.wrap = 'soft';
  inp.placeholder = "Paste your friend's code here.";

  var row = el('div', 'netrow', box);
  function busy(b, text) { b.disabled = true; b.textContent = text; }
  function fail(b, label, err) {
    b.disabled = false; b.textContent = label;
    netSetStatus(err && err.message ? err.message : String(err));
  }

  var hostBtn = el('button', 'optbtn', row, NET.role === 'host' ? 'New invite' : 'Host a world');
  hostBtn.addEventListener('click', function () {
    busy(hostBtn, 'Working…');
    netHostInvite(game).then(function (code) {
      out.value = code;
      hostBtn.disabled = false; hostBtn.textContent = 'New invite';
    })['catch'](function (e) { fail(hostBtn, 'Host a world', e); });
  });

  var acceptBtn = el('button', 'optbtn', row, 'Accept reply');
  acceptBtn.addEventListener('click', function () {
    busy(acceptBtn, 'Working…');
    netHostAccept(game, inp.value).then(function () {
      inp.value = '';
      acceptBtn.disabled = false; acceptBtn.textContent = 'Accept reply';
    })['catch'](function (e) { fail(acceptBtn, 'Accept reply', e); });
  });

  var joinBtn = el('button', 'optbtn', row, 'Join a world');
  joinBtn.addEventListener('click', function () {
    try {
      netSetStatus('Reloading into the host’s world…');
      netGuestJoin(inp.value);
    } catch (e) { netSetStatus(e.message); }
  });

  el('div', 'subtext', box, NET.role === 'guest'
    ? 'Send the reply code above back to the host and wait a moment.'
    : 'Host: press Host a world, send the code, then paste the reply and press Accept reply.');

  var who = el('div', 'subtext', box, '');
  function refreshWho() {
    var names = [NET.name + ' (you)'];
    for (var k in NET.players) if (NET.players[k] && !NET.players[k].remove) {
      names.push(NET.players[k].netName || 'Player');
    }
    who.textContent = NET.active ? 'In this world: ' + names.join(', ') : '';
  }
  refreshWho();
  var whoTimer = setInterval(function () {
    if (!document.body.contains(who)) { clearInterval(whoTimer); return; }
    refreshWho();
  }, 1000);

  var back = el('button', 'bigbtn', box, 'Back');
  back.addEventListener('click', function () { showScreen(game, 'pause'); });
};

/* the guest arrives here after reloading into the host's seed */
function netBootJoin(game) {
  var code = netJoinCodeFromURL();
  if (!code) return;
  showScreen(game, 'multiplayer');
  netSetStatus('Preparing your reply…');
  netGuestAnswer(game, code).then(function (out) {
    var ta = document.querySelector('.netcode');
    if (ta) ta.value = out;
    NET.lastCode = out;
  })['catch'](function (e) { netSetStatus(e.message || String(e)); });
}
