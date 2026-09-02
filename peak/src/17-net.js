// ============================================================ NETWORK
// Real peer-to-peer over the internet.  The host owns the room code and the
// world seed; everyone else dials that code and the host relays traffic
// between them, so four people on four continents share one mountain.
var Net = {
  peer: null, conns: [], byId: {}, isHost: false, solo: true,
  code: '', selfId: '', seed: 1, started: false,
  roster: {},            // id -> {name, slot, host}
  acc: 0, status: 'idle',
  onRoster: null, onState: null, onError: null, onStart: null,
};

var PEER_PREFIX = 'crux-mtn-v1-';
var PEER_OPTS = {
  debug: 0,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' },
    ],
  },
};

Net.reset = function () {
  try { if (Net.peer) Net.peer.destroy(); } catch (e) { }
  Net.peer = null; Net.conns = []; Net.byId = {};
  Net.isHost = false; Net.solo = true; Net.started = false;
  Net.roster = {}; Net.code = '';
};

Net.freeSlot = function () {
  var used = {}, id;
  for (id in Net.roster) used[Net.roster[id].slot] = 1;
  for (var i = 0; i < 8; i++) if (!used[i]) return i;
  return 0;
};

// ---------------------------------------------------------------- host
Net.host = function (name, cb) {
  Net.reset();
  Net.isHost = true; Net.solo = false;
  var attempts = 0;
  function tryOpen() {
    Net.code = makeCode();
    Net.seed = codeToSeed(Net.code);
    var p;
    try { p = new Peer(PEER_PREFIX + Net.code, PEER_OPTS); }
    catch (e) { Net.status = 'error'; cb('peer-to-peer is unavailable in this browser'); return; }
    Net.peer = p;
    p.on('open', function (id) {
      Net.selfId = id;
      Net.status = 'hosting';
      Net.roster[id] = { name: name, slot: 0, host: true };
      P.id = id; P.slot = 0;
      if (Net.onRoster) Net.onRoster();
      cb(null, Net.code);
    });
    p.on('connection', function (c) { Net.attach(c); });
    p.on('error', function (e) {
      if (e && e.type === 'unavailable-id' && attempts < 6) { attempts++; try { p.destroy(); } catch (x) { } tryOpen(); return; }
      Net.status = 'error';
      cb(Net.explain(e));
    });
    p.on('disconnected', function () { try { p.reconnect(); } catch (e) { } });
  }
  tryOpen();
};

// ---------------------------------------------------------------- join
Net.join = function (code, name, cb) {
  Net.reset();
  Net.isHost = false; Net.solo = false;
  Net.code = code.toUpperCase();
  var p;
  try { p = new Peer(PEER_OPTS); }
  catch (e) { Net.status = 'error'; cb('peer-to-peer is unavailable in this browser'); return; }
  Net.peer = p;
  var done = false;
  p.on('open', function (id) {
    Net.selfId = id; P.id = id;
    var c = p.connect(PEER_PREFIX + Net.code, { reliable: true, serialization: 'json' });
    var timer = setTimeout(function () {
      if (!done) { done = true; cb('no room answered on ' + Net.code + ' — check the code'); }
    }, 12000);
    c.on('open', function () {
      Net.attach(c);
      c.send({ t: 'join', n: name });
    });
    c.on('data', function (m) {
      if (m && m.t === 'welcome' && !done) { done = true; clearTimeout(timer); Net.welcome(m); cb(null, Net.code); }
    });
    c.on('error', function (e) { if (!done) { done = true; clearTimeout(timer); cb(Net.explain(e)); } });
    c.on('close', function () {
      if (!done) { done = true; clearTimeout(timer); cb('the host closed the door'); }
      else { HUD.toast('the host left — the mountain is yours alone', '#ffb454'); Net.solo = true; }
    });
  });
  p.on('error', function (e) {
    if (!done) { done = true; cb(Net.explain(e)); }
  });
  p.on('disconnected', function () { try { p.reconnect(); } catch (e) { } });
};

Net.explain = function (e) {
  var t = e && e.type ? e.type : '';
  if (t === 'peer-unavailable') return 'no room with that code is open';
  if (t === 'network' || t === 'server-error') return 'could not reach the matchmaking server';
  if (t === 'browser-incompatible') return 'this browser cannot do peer-to-peer';
  if (t === 'unavailable-id') return 'that room code is taken';
  return (e && e.message) ? e.message : 'connection failed';
};

Net.attach = function (c) {
  Net.conns.push(c);
  c.on('data', function (m) { Net.recv(c, m); });
  c.on('close', function () { Net.detach(c); });
  c.on('error', function () { Net.detach(c); });
};

Net.detach = function (c) {
  var i = Net.conns.indexOf(c);
  if (i >= 0) Net.conns.splice(i, 1);
  if (c.pid) {
    delete Net.roster[c.pid];
    delete Net.byId[c.pid];
    Remote.remove(c.pid);
    if (Net.isHost) Net.broadcast({ t: 'left', id: c.pid });
    if (Net.onRoster) Net.onRoster();
  }
};

// ---------------------------------------------------------------- traffic
Net.broadcast = function (m, except) {
  for (var i = 0; i < Net.conns.length; i++) {
    var c = Net.conns[i];
    if (c === except || !c.open) continue;
    try { c.send(m); } catch (e) { }
  }
};

Net.send = function (m) {
  if (Net.solo || !Net.started) return;
  m.f = Net.selfId;
  if (Net.isHost) Net.broadcast(m);
  else if (Net.conns[0] && Net.conns[0].open) { try { Net.conns[0].send(m); } catch (e) { } }
};

Net.recv = function (c, m) {
  if (!m || !m.t) return;

  if (m.t === 'join' && Net.isHost) {
    var pid = c.peer;
    c.pid = pid;
    var slot = Net.freeSlot();
    Net.roster[pid] = { name: (m.n || 'climber').slice(0, 12), slot: slot };
    Net.byId[pid] = c;
    c.send({ t: 'welcome', seed: Net.seed, id: pid, slot: slot, roster: Net.roster, snap: Net.snapshot(), started: Net.started });
    Net.broadcast({ t: 'peer', id: pid, n: Net.roster[pid].name, s: slot }, c);
    Remote.add(pid, Net.roster[pid].name, slot);
    if (Net.onRoster) Net.onRoster();
    HUD.toast(Net.roster[pid].name + ' joined the rope', '#31c6c0');
    return;
  }

  // the host is a switchboard: pass everything else along
  if (Net.isHost && m.f && m.f !== Net.selfId) Net.broadcast(m, c);
  Net.apply(m);
};

Net.welcome = function (m) {
  Net.seed = m.seed;
  P.id = m.id; P.slot = m.slot;
  Net.roster = m.roster || {};
  Net.roster[m.id] = { name: P.name, slot: m.slot };
  Net.pendingSnap = m.snap;
  Net.status = 'joined';
  if (Net.onRoster) Net.onRoster();
  if (Net.onStart) Net.onStart(m);
};

Net.snapshot = function () {
  var lit = [], i;
  for (i = 0; i < Camps.list.length; i++) lit.push(Camps.list[i].lit ? 1 : 0);
  var taken = [];
  for (i = 0; i < WI.list.length; i++) if (WI.list[i].taken) taken.push(WI.list[i].id);
  var broke = [];
  if (T.BROKEN) for (i = 0; i < T.BROKEN.length; i++) if (T.BROKEN[i]) broke.push(i);
  var anch = [];
  for (i = 0; i < Coop.anchors.length; i++) {
    var a = Coop.anchors[i];
    anch.push({ id: a.id, owner: a.owner, x: a.x, y: a.y, z: a.z, slot: a.slot });
  }
  var pit = [];
  for (i = 0; i < Coop.pitons.length; i++) pit.push({ x: Coop.pitons[i].x, y: Coop.pitons[i].y, z: Coop.pitons[i].z });
  return { lit: lit, taken: taken, broke: broke, anch: anch, pit: pit, t: Game.runT };
};

Net.applySnapshot = function (s) {
  if (!s) return;
  var i;
  for (i = 0; i < s.lit.length; i++) if (s.lit[i]) Camps.setLit(i, true);
  for (i = 0; i < s.taken.length; i++) WI.take(s.taken[i]);
  for (i = 0; i < s.broke.length; i++) { T.BROKEN[s.broke[i]] = 1; T.paintBroken(s.broke[i]); }
  for (i = 0; i < s.anch.length; i++) Coop.addAnchor(s.anch[i]);
  for (i = 0; i < s.pit.length; i++) Coop.placePiton(s.pit[i].x, s.pit[i].y, s.pit[i].z, 0, 1, true);
  if (s.t) Game.runT = s.t;
  // late joiners start the climb at the group's highest lit fire
  var idx = 0;
  for (i = 0; i < Camps.list.length; i++) if (Camps.list[i].lit) idx = Math.max(idx, i);
  Net.spawnCamp = idx;
};

// ---------------------------------------------------------------- events
Net.apply = function (m) {
  var a;
  switch (m.t) {
    case 'peer':
      Net.roster[m.id] = { name: m.n, slot: m.s };
      Remote.add(m.id, m.n, m.s);
      if (Net.onRoster) Net.onRoster();
      HUD.toast(m.n + ' joined the rope', '#31c6c0');
      break;
    case 'left':
      Remote.remove(m.id);
      delete Net.roster[m.id];
      if (Net.onRoster) Net.onRoster();
      break;
    case 'go':
      if (Net.onStart) Net.onStart(m);
      break;
    case 's':
      if (!Remote.map[m.f] && Net.roster[m.f]) Remote.add(m.f, Net.roster[m.f].name, Net.roster[m.f].slot);
      Remote.feed(m.f, m);
      break;
    case 'pick': WI.take(m.i); break;
    case 'drop': WI.add({ id: m.id, k: m.k, x: m.x, y: T.hAt(m.x, m.z), z: m.z }); break;
    case 'give':
      if (m.to === P.id) {
        WI.toss(m.k, new THREE.Vector3(m.fx, m.fy, m.fz), new THREE.Vector3(P.pos.x, P.pos.y + 1.2, P.pos.z), function () {
          if (Survive.add(m.k)) HUD.toast('caught ' + ITEM[m.k].nm, '#8fe04a');
          else {
            var id = WI.dropAt(m.k, P.pos.x, groundH(P.pos.x, P.pos.z), P.pos.z);
            Net.send({ t: 'drop', k: m.k, id: id, x: P.pos.x, y: P.pos.y, z: P.pos.z });
            HUD.toast('pack full — it lands at your feet', '#ffb454');
          }
        });
      } else {
        a = Remote.byId(m.to);
        if (a) WI.toss(m.k, new THREE.Vector3(m.fx, m.fy, m.fz), new THREE.Vector3(a.pos.x, a.pos.y + 1.2, a.pos.z), null);
      }
      break;
    case 'rope': Coop.addAnchor({ id: m.id, owner: m.owner, x: m.x, y: m.y, z: m.z, slot: m.slot }); break;
    case 'unrope': Coop.removeAnchor(m.id); break;
    case 'pit': Coop.placePiton(m.x, m.y, m.z, m.nx, m.nz, true); break;
    case 'ping':
      Coop.addPing(m.x, m.y, m.z, m.s, !!m.d, m.n);
      HUD.toast(m.n + (m.d ? ' marks danger' : ' marks a route'), m.d ? '#ff5b52' : SLOT_HEX[m.s % 4]);
      break;
    case 'camp':
      if (!Camps.list[m.i].lit) { Camps.setLit(m.i, true); HUD.toast('camp ' + (m.i + 1) + ' lit', '#ffd646'); }
      break;
    case 'brk':
      if (!T.BROKEN[m.c]) { T.BROKEN[m.c] = 1; T.paintBroken(m.c); }
      break;
    case 'down':
      a = Remote.byId(m.f);
      if (a) { a.state = ST.DOWN; HUD.toast(a.name + ' is down', '#ff5b52'); }
      break;
    case 'carry':
      a = Remote.byId(m.f);
      if (m.id === null) {
        for (var i = 0; i < Remote.list.length; i++) if (Remote.list[i].carriedBy === m.f) Remote.list[i].carriedBy = null;
        if (P.carriedBy === m.f) { P.carriedBy = null; P.state = ST.DOWN; }
      } else if (m.id === P.id) { P.carriedBy = m.f; P.state = ST.CARRIED; }
      else { var b = Remote.byId(m.id); if (b) b.carriedBy = m.f; }
      break;
    case 'rev':
      if (m.id === P.id) {
        P.state = ST.AIR; P.hp = 42; P.st = P.stMax * 0.6; P.downT = 0; P.carriedBy = null;
        HUD.toast('back on your feet', '#8fe04a');
      } else {
        a = Remote.byId(m.id);
        if (a) { a.state = ST.GROUND; a.carriedBy = null; }
      }
      break;
    case 'up':
      a = Remote.byId(m.f);
      if (a) a.state = ST.GROUND;
      break;
    case 'bst':
      if (m.to === P.id) { P.brace = false; HUD.toast('boosted!', '#ffd646'); }
      break;
    case 'top':
      HUD.toast(m.n + ' reached the summit', '#ffd646');
      a = Remote.byId(m.f);
      if (a) a.summited = true;
      break;
  }
};

// ---------------------------------------------------------------- outgoing
Net.tick = function (dt) {
  if (Net.solo || !Net.started) return;
  Net.acc += dt;
  var period = 1 / K.NET_HZ;
  if (Net.acc < period) return;
  Net.acc = 0;
  Net.send({
    t: 's',
    x: Math.round(P.pos.x * 100) / 100, y: Math.round(P.pos.y * 100) / 100, z: Math.round(P.pos.z * 100) / 100,
    yaw: Math.round(P.yaw * 100) / 100,
    st: P.state, hp: P.hp | 0, sm: P.st | 0, hu: P.hunger | 0, tp: P.temp | 0,
    br: P.brace ? 1 : 0, cl: P.climbing ? 1 : 0,
    ca: P.carrying, hd: P.inv[P.sel] ? P.inv[P.sel].k : null, pk: P.parka ? 1 : 0,
  });
};
